// invent.js — inventory letters and inventory lines.
// C ref: invent.c assigninvlet(), reorder_invent(), obj_to_let(), prinv(),
//        xprname()

import { game } from './gstate.js';
import { pline } from './display.js';
import { doname } from './objnam.js';
import * as O from './objects.js';
import { NO_COLOR, ATR_NONE, ATR_INVERSE } from './terminal.js';
import {
    NHW_MENU, WIN_ERR, PICK_NONE, PICK_ONE, MENU_BEHAVE_STANDARD,
    MENU_ITEMFLAGS_NONE, MENU_ITEMFLAGS_SKIPMENUCOLORS,
    LOST_NONE, LOST_THROWN, LOST_EXPLODING, BLINDED, HALLUC,
    ONAME, has_oname,
} from './const.js';
import { objects } from './objects.js';
import * as M from './monsters.js';
import { mons } from './monsters.js';
import { weight, erosion_matters, Is_candle, obj_extract_self } from './mkobj.js';
import { itemactions } from './iactions.js';
import {
    tty_create_nhwindow, tty_start_menu, tty_add_menu, tty_end_menu,
    tty_select_menu,
} from './wintty.js';

const invlet_basic = 52;
const GOLD_SYM = '$';
const NOINVSYM = '#';
const CONTAINED_SYM = '>';
const HANDS_SYM = '-';

// C ref: flag.h flags.invlet_constant (default on; options are not
// parsed for it yet)
function invlet_constant() {
    return game.flags?.invlet_constant ?? true;
}

// C ref: invent.c assigninvlet()
export function assigninvlet(otmp) {
    const inuse = new Array(invlet_basic).fill(false);
    let i;

    /* there should be at most one of these in inventory... */
    if (otmp.oclass === O.COIN_CLASS) {
        otmp.invlet = GOLD_SYM;
        return;
    }

    for (let obj = game.invent; obj; obj = obj.nobj)
        if (obj !== otmp) {
            const c = obj.invlet || '';
            if (c >= 'a' && c <= 'z')
                inuse[c.charCodeAt(0) - 97] = true;
            else if (c >= 'A' && c <= 'Z')
                inuse[c.charCodeAt(0) - 65 + 26] = true;
            if (c && c === otmp.invlet)
                otmp.invlet = 0;
        }
    const c = otmp.invlet || '';
    if (c && ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z')))
        return;
    for (i = game.lastinvnr + 1; i !== game.lastinvnr; i++) {
        if (i === invlet_basic) {
            i = -1;
            continue;
        }
        if (!inuse[i])
            break;
    }
    otmp.invlet = inuse[i] ? NOINVSYM
        : (i < 26) ? String.fromCharCode(97 + i)
        : String.fromCharCode(65 + i - 26);
    game.lastinvnr = i;
}

/* note: assumes ASCII; toggling a bit puts lowercase in front of uppercase */
function inv_rank(o) {
    return (o.invlet ? String(o.invlet).charCodeAt(0) : 0) ^ 0o40;
}

// C ref: invent.c reorder_invent()
/* sort the inventory; used by addinv() and doorganize() */
export function reorder_invent() {
    let otmp, prev, next;
    let need_more_sorting;

    do {
        need_more_sorting = false;
        for (otmp = game.invent, prev = null; otmp; ) {
            next = otmp.nobj;
            if (next && inv_rank(next) < inv_rank(otmp)) {
                need_more_sorting = true;
                if (prev)
                    prev.nobj = next;
                else
                    game.invent = next;
                otmp.nobj = next.nobj;
                next.nobj = otmp;
                prev = next;
            } else {
                prev = otmp;
                otmp = next;
            }
        }
    } while (need_more_sorting);
}

// C ref: invent.c obj_to_let()
function obj_to_let(obj) {
    if (!invlet_constant())
        throw new Error('obj_to_let(): reassign() for !fixinv is not ported yet');
    return obj.invlet;
}

// C ref: invent.c prinv()
/*
 * Print the indicated quantity of the given object.  If quan == 0L then use
 * the current quantity.
 */
export async function prinv(prefix, obj, quan) {
    const total_of = (quan && (quan < obj.quan));
    let totalbuf = '';

    if (!prefix)
        prefix = "";

    if (total_of)
        totalbuf = ` (${obj.quan} in total).`;
    await pline(`${prefix}${prefix ? " " : ""}`
                + xprname(obj, null, obj_to_let(obj), !total_of, 0, quan)
                + (game.flags?.verbose ? totalbuf : ""));
}

// C ref: invent.c xprname()
export function xprname(obj, txt, let_, dot, cost, quan) {
    const use_invlet = (invlet_constant() && obj != null
                        && let_ !== CONTAINED_SYM && let_ !== HANDS_SYM);
    let savequan = 0;
    let suffix;

    if (quan && obj) {
        savequan = obj.quan;
        obj.quan = quan;
    }
    if (!txt)
        txt = doname(obj);

    if (cost !== 0 || let_ === '*') {
        throw new Error('xprname(): cost/total lines (currency()) are not ported yet');
    } else {
        /* ordinary inventory display or pickup message */
        if (use_invlet)
            let_ = obj.invlet;
        suffix = dot ? "." : "";
    }
    const li = `${let_} - ${txt}${suffix}`; /* "%c - %.*s%s" */

    if (savequan)
        obj.quan = savequan;

    return li;
}

// C ref: invent.c names[] -- conversion from a class to a string for
// printing; this must match the object class order
const names = [
    null, "Illegal objects", "Weapons", "Armor", "Rings", "Amulets", "Tools",
    "Comestibles", "Potions", "Scrolls", "Spellbooks", "Wands", "Coins",
    "Gems/Stones", "Boulders/Statues", "Iron balls", "Chains", "Venoms",
];
const oth_symbols = CONTAINED_SYM;
const oth_names = ["Bagged/Boxed items"];

// C ref: options.c def_inv_order[] (flags.inv_order defaults to it;
// the inv_order option is not parsed yet)
export const def_inv_order = [
    O.COIN_CLASS, O.AMULET_CLASS, O.WEAPON_CLASS, O.ARMOR_CLASS,
    O.FOOD_CLASS, O.SCROLL_CLASS, O.SPBOOK_CLASS, O.POTION_CLASS,
    O.RING_CLASS, O.WAND_CLASS, O.TOOL_CLASS, O.GEM_CLASS, O.ROCK_CLASS,
    O.BALL_CLASS, O.CHAIN_CLASS,
];

// C ref: invent.c let_to_name()
export function let_to_name(let_, unpaid, showsym) {
    const oclass = (typeof let_ === 'number' && let_ >= 1
                    && let_ < O.MAXOCLASSES) ? let_ : 0;
    let class_name, pos;

    if (oclass)
        class_name = names[oclass];
    else if ((pos = oth_symbols.indexOf(let_)) >= 0)
        class_name = oth_names[pos];
    else
        class_name = names[O.ILLOBJ_CLASS];

    const invbuf = unpaid ? `Unpaid ${class_name}` : class_name;
    if (oclass && showsym)
        throw new Error("let_to_name(): menu_head_objsym is not ported yet");
    return invbuf;
}

// C ref: windows.c add_menu_heading()
export function add_menu_heading(tmpwin, buf) {
    let attr = game.iflags?.menu_headings?.attr ?? ATR_INVERSE,
        color = game.iflags?.menu_headings?.color ?? NO_COLOR;

    /* suppress highlighting during end-of-game disclosure */
    if (game.program_state?.gameover) {
        attr = ATR_NONE;
        color = NO_COLOR;
    }

    tty_add_menu(tmpwin, null, 0, '', '', attr, color,
                 buf, MENU_ITEMFLAGS_SKIPMENUCOLORS);
}

// C ref: sortloot.c sortloot_cmp() -- the inventory letter key for
// SORTLOOT_INVLET
function sortloot_invlet_key(c) {
    if (c >= 'a' && c <= 'z')
        return c.charCodeAt(0) - 97 + 2;
    if (c >= 'A' && c <= 'Z')
        return c.charCodeAt(0) - 65 + 2 + 26;
    if (c === GOLD_SYM)
        return 1;
    return 1 + 52 + 1; /* '#' and anything else go last */
}

// C ref: sortloot.c sortloot() -- inventory with SORTLOOT_INVLET (plus
// SORTLOOT_PACK for flags.sortpack) and no filter
function sortloot_invent(sortpack) {
    const list = [];
    for (let o = game.invent; o; o = o.nobj)
        list.push({ obj: o, indx: list.length,
                    orderclass: sortpack ? def_inv_order.indexOf(o.oclass) + 1 : 0 });
    list.sort((a, b) => {
        if (sortpack && a.orderclass !== b.orderclass)
            return a.orderclass - b.orderclass;
        const k = sortloot_invlet_key(a.obj.invlet) - sortloot_invlet_key(b.obj.invlet);
        if (k)
            return k;
        return a.indx - b.indx; /* never equal */
    });
    return list;
}

// C ref: invent.c display_pickinv() -- the full-inventory listing (no
// lets, no xtra_choice, no wizard identify, no perm_invent)
async function display_pickinv(lets, xtra_choice, query, allowxtra,
                               want_reply, out_cnt) {
    let n, classcount;
    let ret;
    const clr = NO_COLOR;
    const sortpack = game.flags?.sortpack ?? true;

    if (lets || xtra_choice || game.iflags?.override_ID
        || (game.flags?.sortloot && game.flags.sortloot !== 'n'
            && game.flags.sortloot !== 'l'))
        throw new Error('display_pickinv(): lets/xtra_choice/wizid/sortloot are not ported yet');

    /* partial inventory in perm_invent setting; don't operate on
       full inventory window, use an alternate one instead; create
       the first time needed and keep it for re-use as needed later */
    if (game.cached_pickinv_win == null || game.cached_pickinv_win === WIN_ERR)
        game.cached_pickinv_win = tty_create_nhwindow(NHW_MENU);
    const win = game.cached_pickinv_win;

    n = !game.invent ? 0 : !game.invent.nobj ? 1 : 2;
    /* for !lets, skip message_menu handling of single item even if
       item count was 1 */
    if (n === 1)
        ++n;
    if (n === 0)
        throw new Error('display_pickinv(): empty inventory message is not ported yet');
    if (!invlet_constant())
        throw new Error('display_pickinv(): reassign() is not ported yet');

    const sortedinvent = sortloot_invent(sortpack);
    tty_start_menu(win, MENU_BEHAVE_STANDARD);

    let invlet = 0;
    for (;;) { /* nextclass: */
        classcount = 0;
        for (const srtinv of sortedinvent) {
            const otmp = srtinv.obj;
            if (!sortpack || otmp.oclass === def_inv_order[invlet]) {
                /* maybe insert a class header */
                if (sortpack && !classcount) {
                    const withsym = (want_reply && game.iflags?.menu_head_objsym);
                    add_menu_heading(win, let_to_name(def_inv_order[invlet],
                                                      false, withsym));
                    classcount++;
                }
                const ilet = otmp.invlet;
                /* obj_to_glyph()/map_glyphinfo(): tty menus don't show
                   the glyph */
                tty_add_menu(win, null, ilet, ilet, '', ATR_NONE, clr,
                             doname(otmp), MENU_ITEMFLAGS_NONE);
            }
        }
        if (!sortpack)
            break;
        if (++invlet < def_inv_order.length)
            continue;
        /* venom_inv (VENOM_CLASS) */
        if (sortedinvent.some(s => s.obj.oclass === O.VENOM_CLASS))
            throw new Error('display_pickinv(): venom in inventory is not ported yet');
        break;
    }
    if (game.iflags?.force_invmenu && want_reply)
        throw new Error('display_pickinv(): force_invmenu is not ported yet');

    tty_end_menu(win, (query && query[0]) ? query : null);
    const res = await tty_select_menu(win, want_reply ? PICK_ONE : PICK_NONE);
    n = res.n;
    if (n > 0) {
        ret = res.selected[0].item;
        if (out_cnt)
            out_cnt.v = res.selected[0].count;
    } else
        ret = !n ? '\0' : '\x1b'; /* cancelled */
    return ret;
}

// C ref: invent.c display_inventory() -- the command queue is not ported
export async function display_inventory(lets, want_reply) {
    return await display_pickinv(lets, null, null, false, want_reply, null);
}

// C ref: invent.c dispinv_with_action()
async function dispinv_with_action(lets, use_inuse_ordering, alt_label) {
    const len = lets ? lets.length : 0;
    const menumode = (len !== 1 || game.iflags?.menu_requested) ? true : false;
    const save_force_invmenu = game.iflags.force_invmenu;

    if (use_inuse_ordering || alt_label)
        throw new Error('dispinv_with_action(): in-use ordering is not ported yet');
    game.iflags.force_invmenu = false;

    const c = await display_inventory(lets, menumode);

    game.iflags.force_invmenu = save_force_invmenu;

    if (c && c !== '\x1b') {
        let nextobj;
        for (let otmp = game.invent; otmp; otmp = nextobj) {
            nextobj = otmp.nobj;
            if (otmp.invlet === c)
                return await itemactions(otmp);
        }
    }
    return 0; /* ECMD_OK */
}

// C ref: invent.c ddoinv() -- the #inventory command
export async function ddoinv() {
    return await dispinv_with_action(null, false, null);
}

/* C ref: you.h Blind, Hallucination */
function inv_Blind() {
    const p = game.u?.uprops?.[BLINDED];
    return !!(p?.intrinsic || p?.extrinsic);
}
function inv_Hallucination() {
    const p = game.u?.uprops?.[HALLUC];
    return !!(p?.intrinsic || p?.extrinsic);
}
/* C ref: role.h Role_if() */
function inv_Role_if(pm) { return game.urole?.mnum === pm; }
/* C ref: obj.h Is_pudding() */
function inv_Is_pudding(o) {
    return (o.otyp === O.GLOB_OF_GRAY_OOZE || o.otyp === O.GLOB_OF_BROWN_PUDDING
            || o.otyp === O.GLOB_OF_GREEN_SLIME || o.otyp === O.GLOB_OF_BLACK_PUDDING);
}
/* C ref: mondata.h is_rider(), is_reviver() */
function inv_is_reviver(ptr) {
    const n = mons.indexOf(ptr);
    return n === M.PM_DEATH || n === M.PM_FAMINE || n === M.PM_PESTILENCE
        || ptr.mlet === M.S_TROLL;
}

// C ref: invent.c mergable()
export function mergable(otmp, /* potential 'into' stack */
                         obj) { /* 'combine' stack */
    /* fail if already the same object, if different types, if either is
       explicitly marked to prevent merge, or if not mergable in general */
    if (obj === otmp || obj.otyp !== otmp.otyp
        || obj.nomerge || otmp.nomerge || !objects[obj.otyp].oc_merge)
        return false;

    /* coins of the same kind will always merge */
    if (obj.oclass === O.COIN_CLASS)
        return true;

    if (!!obj.cursed !== !!otmp.cursed || !!obj.blessed !== !!otmp.blessed)
        return false;

    if ((obj.how_lost || 0) === LOST_EXPLODING
        || (otmp.how_lost || 0) === LOST_EXPLODING)
        return false;
    if ((otmp.how_lost || 0) !== LOST_NONE
        && (obj.how_lost || 0) !== (otmp.how_lost || 0))
        return false;

    if (obj.globby)
        return true;
    /* Checks beyond this point either aren't applicable to globs
     * or don't inhibit their merger.
     */

    if (!!obj.unpaid !== !!otmp.unpaid || (obj.spe | 0) !== (otmp.spe | 0)
        || !!obj.no_charge !== !!otmp.no_charge
        || !!obj.obroken !== !!otmp.obroken
        || !!obj.otrapped !== !!otmp.otrapped
        || !!obj.lamplit !== !!otmp.lamplit)
        return false;

    if (obj.oclass === O.FOOD_CLASS
        && ((obj.oeaten | 0) !== (otmp.oeaten | 0)
            || !!obj.orotten !== !!otmp.orotten))
        return false;

    if (!!obj.dknown !== !!otmp.dknown
        || (!!obj.bknown !== !!otmp.bknown && !inv_Role_if(M.PM_CLERIC)
            && (inv_Blind() || inv_Hallucination()))
        || (obj.oeroded | 0) !== (otmp.oeroded | 0)
        || (obj.oeroded2 | 0) !== (otmp.oeroded2 | 0)
        || !!obj.greased !== !!otmp.greased)
        return false;

    if ((erosion_matters(obj))
        && (!!obj.oerodeproof !== !!otmp.oerodeproof
            || (!!obj.rknown !== !!otmp.rknown
                && (inv_Blind() || inv_Hallucination()))))
        return false;

    if (obj.otyp === O.CORPSE || obj.otyp === O.EGG || obj.otyp === O.TIN) {
        if (obj.corpsenm !== otmp.corpsenm)
            return false;
    }

    /* hatching eggs don't merge; ditto for revivable corpses */
    if ((obj.otyp === O.EGG && (obj.timed || otmp.timed))
        || (obj.otyp === O.CORPSE && otmp.corpsenm >= M.LOW_PM
            && inv_is_reviver(mons[otmp.corpsenm])))
        return false;

    /* allow candle merging only if their ages are close */
    /* see begin_burn() for a reference for the magic "25" */
    if (Is_candle(obj) && Math.trunc(obj.age / 25) !== Math.trunc(otmp.age / 25))
        return false;

    /* burning potions of oil never merge */
    if (obj.otyp === O.POT_OIL && obj.lamplit)
        return false;

    /* don't merge surcharged item with base-cost item */
    if (obj.unpaid)
        throw new Error('mergable(): same_price() is not ported yet');

    /* some additional information is always incompatible */
    if (obj.oextra?.omonst || obj.oextra?.omid
        || otmp.oextra?.omonst || otmp.oextra?.omid)
        return false;

    /* if they have names, make sure they're the same */
    const objnamelth = ONAME(obj).length;
    const otmpnamelth = ONAME(otmp).length;
    if ((objnamelth !== otmpnamelth
         && ((objnamelth && otmpnamelth) || obj.otyp === O.CORPSE))
        || (objnamelth && otmpnamelth
            && has_oname(obj) && has_oname(otmp)
            && ONAME(obj).slice(0, objnamelth) !== ONAME(otmp).slice(0, objnamelth)))
        return false;

    /* if one has an attached mail command, other must have same command */
    if (!obj.oextra?.omailcmd ? !!otmp.oextra?.omailcmd
        : (!otmp.oextra?.omailcmd || obj.oextra.omailcmd !== otmp.oextra.omailcmd))
        return false;

    /* MAIL_STRUCTURES */
    if (obj.otyp === O.SCR_MAIL
        && obj.spe > 0 && (obj.o_id % 2) !== (otmp.o_id % 2))
        return false;

    /* should be moot since matching artifacts wouldn't be unique */
    if ((obj.oartifact | 0) !== (otmp.oartifact | 0))
        return false;

    if (!!obj.known !== !!otmp.known && (inv_Blind() || inv_Hallucination()))
        return false;

    return true;
}

// C ref: invent.c stackobj()
/* try to merge obj with another object on the floor at its spot; the
   pile (level.objects[x][y] via nexthere) is read top first from the
   floor chain game.level.objects */
export function stackobj(obj) {
    for (const otmp of (game.level.objects || []).slice()) {
        if (otmp.ox !== obj.ox || otmp.oy !== obj.oy
            || otmp.where !== 'OBJ_FLOOR')
            continue;
        if (otmp !== obj && merged({ otmp: obj, obj: otmp }))
            break;
    }
}

// C ref: invent.c merged() -- 'r' is { otmp, obj } (C: potmp, pobj);
// returns 1 when obj was merged into otmp
export function merged(r) {
    const otmp = r.otmp, obj = r.obj;
    let discovered = false;

    if (mergable(otmp, obj)) {
        /* Approximate age */
        if (!obj.lamplit && !obj.globby)
            otmp.age = Math.trunc(((otmp.age * otmp.quan) + (obj.age * obj.quan))
                                  / (otmp.quan + obj.quan));

        if (!otmp.globby)
            otmp.quan += obj.quan;
        /* temporary special case for gold objects!!!! */
        if (otmp.oclass === O.COIN_CLASS) {
            otmp.owt = weight(otmp);
            otmp.bknown = 0;
        /* and puddings!!!1!!one! */
        } else if (!inv_Is_pudding(otmp))
            otmp.owt = weight(otmp);
        if (!has_oname(otmp) && has_oname(obj))
            throw new Error('merged(): oname() is not ported yet');
        obj_extract_self(obj);

        if (obj.pickup_prev && otmp.where === 'OBJ_INVENT')
            otmp.pickup_prev = 1;
        /* really should merge the timeouts */
        if (obj.lamplit || obj.timed)
            throw new Error('merged(): light sources/timers are not ported yet');

        /* objects can be identified by comparing them */
        if (!!obj.known !== !!otmp.known) {
            otmp.known = 1;
            discovered = true;
        }
        if (!!obj.rknown !== !!otmp.rknown) {
            otmp.rknown = 1;
            if (otmp.oerodeproof)
                discovered = true;
        }
        if (!!obj.bknown !== !!otmp.bknown) {
            otmp.bknown = 1;
            if (!inv_Role_if(M.PM_CLERIC))
                discovered = true;
        }
        /* fixup for `#adjust' merging wielded darts, daggers, &c */
        if (obj.owornmask && otmp.where === 'OBJ_INVENT')
            throw new Error('merged(): merging worn items is not ported yet');
        if (obj.bypass)
            otmp.bypass = 1;
        /* handle puddings a bit differently */
        if (obj.globby)
            throw new Error('merged(): obj_absorb() is not ported yet');
        if (discovered && otmp.where === 'OBJ_INVENT'
            && (obj.how_lost || 0) !== LOST_THROWN
            && (otmp.how_lost || 0) !== LOST_THROWN)
            throw new Error('merged(): "You learn more about your items" is not ported yet');
        obj.where = 'OBJ_DELETED'; /* obfree(obj, otmp): free(obj), bill->otmp */
        return 1;
    }
    return 0;
}
