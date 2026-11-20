// invent.js — inventory letters and inventory lines.
// C ref: invent.c assigninvlet(), reorder_invent(), obj_to_let(), prinv(),
//        xprname()

import { game } from './gstate.js';
import { pline, You, pline_The, newsym } from './display.js';
import { obj_resists } from './dogmove.js';
import { maybe_unhide_at } from './mon.js';
import { doname, makeplural } from './objnam.js';
import { rn2 } from './rng.js';
import { ing_suffix } from './hacklib.js';
import { body_part } from './insight.js';
import { welded } from './wield.js';
import { stairway_at } from './display.js';
import { an, vtense } from './objnam.js';
import { t_at } from './trap.js';
import { visible_region_at } from './region.js';
import { is_pool, is_lava } from './makemon.js';
import { engr_at } from './engrave.js';
import { IS_DOOR, IS_FOUNTAIN, IS_THRONE, IS_SINK, IS_ALTAR, IS_GRAVE,
         D_NODOOR, D_ISOPEN, D_BROKEN, ICE, DRAWBRIDGE_DOWN, DBWALL, TREE,
         IRONBARS, ECMD_OK } from './const.js';
import * as O from './objects.js';
import { NO_COLOR, ATR_NONE, ATR_INVERSE } from './terminal.js';
import {
    NHW_MENU, WIN_ERR, PICK_NONE, PICK_ONE, MENU_BEHAVE_STANDARD,
    MENU_ITEMFLAGS_NONE, MENU_ITEMFLAGS_SKIPMENUCOLORS,
    LOST_NONE, LOST_THROWN, LOST_EXPLODING, BLINDED, HALLUC,
    ONAME, has_oname,
    GETOBJ_EXCLUDE, GETOBJ_DOWNPLAY, GETOBJ_SUGGEST, GETOBJ_EXCLUDE_INACCESS,
    GETOBJ_EXCLUDE_SELECTABLE, GETOBJ_EXCLUDE_NONINVENT, GETOBJ_ALLOWCNT,
    GETOBJ_PROMPT, Never_mind, FINGERTIP, HAND, W_ARMOR, W_ACCESSORY,
    W_SADDLE, W_WEAPONS,
} from './const.js';
import { objects } from './objects.js';
import * as M from './monsters.js';
import { mons } from './monsters.js';
import { weight, erosion_matters, Is_candle, obj_extract_self, splitobj } from './mkobj.js';
import { itemactions } from './iactions.js';
import {
    tty_create_nhwindow, tty_start_menu, tty_add_menu, tty_end_menu,
    tty_select_menu, tty_message_menu, tty_yn_function, tty_display_nhwindow,
    tty_putstr, tty_destroy_nhwindow,
} from './wintty.js';

const invlet_basic = 52;
const GOLD_SYM = '$';
const NOINVSYM = '#';
const CONTAINED_SYM = '>';
const HANDS_SYM = '-';
/* C ref: cmd.c quitchars[] */
const quitchars = " \r\n\x1b";

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

// C ref: invent.c display_pickinv() -- internal function used by
// display_inventory and getobj that can display inventory and return a
// count as well as a letter (no wizard identify, no perm_invent, no
// in-use-only listing)
async function display_pickinv(lets, /* non-compacted list of invlet values */
                               xtra_choice, /* non-object "bare hands" or "fingers" */
                               query, /* optional; prompt string for menu */
                               allowxtra, /* hands are allowed (maybe alternate) choice */
                               want_reply, /* True: select an item, False: just display */
                               out_cnt) /* optional; count player entered when selecting an item */ {
    let n, classcount;
    let ret;
    const clr = NO_COLOR;
    const sortpack = game.flags?.sortpack ?? true;
    const usextra = !!(xtra_choice && allowxtra);

    if (lets && !lets.length)
        lets = null; /* simplify tests: (lets) instead of (lets && *lets) */

    if (game.iflags?.override_ID
        || (game.flags?.sortloot && game.flags.sortloot !== 'n'
            && game.flags.sortloot !== 'l'))
        throw new Error('display_pickinv(): wizid/sortloot are not ported yet');

    /* partial inventory in perm_invent setting; don't operate on
       full inventory window, use an alternate one instead; create
       the first time needed and keep it for re-use as needed later */
    if (game.cached_pickinv_win == null || game.cached_pickinv_win === WIN_ERR)
        game.cached_pickinv_win = tty_create_nhwindow(NHW_MENU);
    const win = game.cached_pickinv_win;

    n = lets ? lets.length
             : !game.invent ? 0 : !game.invent.nobj ? 1 : 2;
    /* for xtra_choice, there's another 'item' not included in initial 'n';
       for !lets (full invent), skip message_menu handling of single item
       even if item count was 1 */
    if (usextra || (n === 1 && !lets))
        ++n;
    if (n === 0) {
        await pline("Not carrying anything.");
        return '\0';
    }
    if (!invlet_constant())
        throw new Error('display_pickinv(): reassign() is not ported yet');

    if (n === 1 && !game.iflags?.force_invmenu && !game.iflags?.menu_requested) {
        /* when only one item of interest, use pline instead of menus;
           we actually use a fake message-line menu in order to allow
           the user to perform selection at the --More-- prompt for tty */
        ret = '\0';
        if (usextra) {
            ret = await tty_message_menu(HANDS_SYM, PICK_ONE,
                                         xprname(null, xtra_choice,
                                                 HANDS_SYM, true, 0, 0));
        } else {
            let otmp;
            for (otmp = game.invent; otmp; otmp = otmp.nobj)
                if (!lets || otmp.invlet === lets[0])
                    break;
            if (otmp)
                ret = await tty_message_menu(otmp.invlet,
                                             want_reply ? PICK_ONE : PICK_NONE,
                                             xprname(otmp, null, lets[0],
                                                     true, 0, 0));
        }
        if (out_cnt)
            out_cnt.v = -1; /* select all */
        return ret;
    }

    const sortedinvent = sortloot_invent(sortpack);
    tty_start_menu(win, MENU_BEHAVE_STANDARD);
    if (usextra) {
        if (sortpack)
            add_menu_heading(win, "Miscellaneous");
        tty_add_menu(win, null, HANDS_SYM, HANDS_SYM, '', ATR_NONE, clr,
                     xtra_choice, MENU_ITEMFLAGS_NONE);
    }

    let invlet = 0;
    for (;;) { /* nextclass: */
        classcount = 0;
        for (const srtinv of sortedinvent) {
            const otmp = srtinv.obj;
            /* for showing a set of specific letters, skip ones not in the set */
            if (lets && !lets.includes(otmp.invlet))
                continue;
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

// C ref: invent.c freeinv_core()
function freeinv_core(obj) {
    if (obj.oclass === O.COIN_CLASS) {
        game.disp_botl = true;
        return;
    } else if (obj.otyp === O.AMULET_OF_YENDOR
               || obj.otyp === O.CANDELABRUM_OF_INVOCATION
               || obj.otyp === O.BELL_OF_OPENING
               || obj.otyp === O.SPE_BOOK_OF_THE_DEAD || obj.oartifact) {
        throw new Error('freeinv_core(): invocation items/artifacts not ported yet');
    }

    if (obj.otyp === O.LOADSTONE) {
        throw new Error('freeinv_core(): loadstone curse() not ported yet');
    } else if (obj.otyp === O.LUCKSTONE /* confers_luck() */) {
        throw new Error('freeinv_core(): set_moreluck() not ported yet');
    } else if (obj.otyp === O.FIGURINE && obj.timed) {
        throw new Error('freeinv_core(): figurine stop_timer() not ported yet');
    }

    if (game.context?.tin?.tin === obj) {
        game.context.tin.tin = null;
        game.context.tin.o_id = 0;
    }
}

// C ref: invent.c freeinv() -- remove an object from the hero's inventory
export function freeinv(obj) {
    /* extract_nobj(obj, &gi.invent) */
    let prev = null;
    for (let o = game.invent; o; prev = o, o = o.nobj) {
        if (o === obj) {
            if (prev) prev.nobj = o.nobj;
            else game.invent = o.nobj;
            break;
        }
    }
    obj.nobj = null;
    obj.where = 'OBJ_FREE';
    obj.pickup_prev = 0;
    freeinv_core(obj);
    /* update_inventory(): no perm_invent */
}

// C ref: invent.c compactify() -- compact a string of inventory letters
// by dashing runs of letters
function compactify(buf) {
    const b = buf.split('');
    b.push('\0', '\0');
    let i1 = 1, i2 = 1;
    let ilet, ilet1, ilet2;

    ilet2 = b[0];
    ilet1 = b[1];
    b[++i2] = b[++i1];
    ilet = b[i1];
    while (ilet && ilet !== '\0') {
        if (ilet.charCodeAt(0) === ilet1.charCodeAt(0) + 1) {
            if (ilet1.charCodeAt(0) === ilet2.charCodeAt(0) + 1)
                b[i2 - 1] = ilet1 = '-';
            else if (ilet2 === '-') {
                b[i2 - 1] = ilet1 = String.fromCharCode(ilet1.charCodeAt(0) + 1);
                b[i2] = b[++i1];
                ilet = b[i1];
                continue;
            }
        } else if (ilet === NOINVSYM) {
            /* compact three or more consecutive '#'
               characters into "#-#" */
            if (i2 >= 2 && b[i2 - 2] === NOINVSYM && b[i2 - 1] === NOINVSYM)
                b[i2 - 1] = '-';
            else if (i2 >= 3 && b[i2 - 3] === NOINVSYM && b[i2 - 2] === '-'
                     && b[i2 - 1] === NOINVSYM)
                --i2;
        }
        ilet2 = ilet1;
        ilet1 = ilet;
        b[++i2] = b[++i1];
        ilet = b[i1];
    }
    const end = b.indexOf('\0');
    return b.slice(0, end < 0 ? b.length : end).join('');
}

// C ref: invent.c splittable() -- some objects shouldn't be split when
// count given to getobj or askchain
export function splittable(obj) {
    return !((obj.otyp === O.LOADSTONE && obj.cursed)
             || (obj === game.uwep && welded(game.uwep)));
}

// C ref: invent.c mime_action()
async function mime_action(word) {
    let buf = word;
    let bp, pfx = null, sfx = null;

    if ((bp = buf.indexOf(" on the ")) >= 0) {
        /* rub on the stone[s] */
        sfx = buf.slice(bp + 1); /* "something <sfx>" */
        buf = buf.slice(0, bp);
    }
    if ((buf.startsWith("rub the ") && buf.slice(8).includes(" on"))
        || (buf.startsWith("dip ") && buf.slice(4).includes(" into"))) {
        /* "rub the royal jelly on" -> "rubbing the royal jelly on", or
           "dip <foo> into" => "dipping <foo> into" */
        pfx = buf.slice(3 + 1); /* "<pfx> something" */
        buf = buf.slice(0, 3);
    }
    if ((bp = buf.indexOf(" or ")) >= 0) {
        const first = buf.slice(0, bp);
        buf = (rn2(2) ? first : buf.slice(bp + 4));
    }

    await You(`mime ${ing_suffix(buf)}${pfx ? " " : ""}${pfx ? pfx : ""}`
              + ` something${sfx ? " " : ""}${sfx ? sfx : ""}.`);
}

// C ref: invent.c any_obj_ok() -- getobj callback that allows any object
// - but not hands
export function any_obj_ok(obj) {
    if (obj)
        return GETOBJ_SUGGEST;
    return GETOBJ_EXCLUDE;
}

// C ref: invent.c getobj_hands_txt() -- return string describing your
// hands based on action
function getobj_hands_txt(action) {
    if (action === "grease") {
        throw new Error('getobj_hands_txt(): fingers_or_gloves() not ported yet');
    } else if (action === "write with") {
        return `your ${body_part(FINGERTIP)}`;
    } else if (action === "wield") {
        return `your ${game.uarmg ? "gloved" : "bare"} ${makeplural(body_part(HAND))}`
            + `${!game.uwep ? " (wielded)" : ""}`;
    } else if (action === "ready") {
        return `empty quiver${!game.uquiver ? " (nothing readied)" : ""}`;
    } else {
        return `your ${makeplural(body_part(HAND))}`;
    }
}

/* C ref: invent.c hands_obj -- the explicit "no object" result */
export const hands_obj = { hands_obj: true, otyp: 0, oclass: 0, quan: 0 };

// C ref: invent.c getobj()
/*
 * getobj returns:
 *      struct obj *xxx:        object to do something with.
 *      (struct obj *) 0        error return: no object.
 *      &hands_obj              explicitly no object (as in w-).
 */
export async function getobj(word, /* usually a direct verb such as "drop" */
                             obj_ok, /* callback to classify an object's suitability */
                             ctrlflags) /* some control to fine-tune the behavior */ {
    let otmp;
    let ilet = '\0';
    let buf = '';
    let altlets = '';
    let lets;
    let suggested = 0;
    const allowcnt = !!(ctrlflags & GETOBJ_ALLOWCNT);
    let forceprompt = !!(ctrlflags & GETOBJ_PROMPT);
    let allownone = false;
    let inaccess = 0; /* counts GETOBJ_EXCLUDE_INACCESS items to decide
                       * between "you don't have anything to <foo>"
                       * versus "you don't have anything _else_ to <foo>"
                       * (also used for GETOBJ_EXCLUDE_NONINVENT) */
    let cnt = 0;
    let cntgiven = false;
    let msggiven = false;
    let oneloop = false;
    let qbuf;

    /* need_more_cq: */
    if (game.cmdq?.length) {
        const cq = game.cmdq.shift();
        /* user-input means pick something interactively now, with more
           in the command queue for after that; if not user-input, it
           has to be a key here */
        otmp = null; /* in case of non-key or lookup failure */
        if (cq.typ === 'key') {
            let v;

            if (cq.key === HANDS_SYM) {
                /* check whether the hands/self choice is suitable */
                v = obj_ok(null);
                if (v === GETOBJ_SUGGEST || v === GETOBJ_DOWNPLAY)
                    otmp = hands_obj;
            } else {
                /* there could be more than one match if key is '#';
                   take first one which passes the obj_ok callback */
                for (otmp = game.invent; otmp; otmp = otmp.nobj)
                    if (otmp.invlet === cq.key) {
                        v = obj_ok(otmp);
                        if (v === GETOBJ_SUGGEST || v === GETOBJ_DOWNPLAY)
                            break;
                    }
            }
        } else {
            throw new Error('getobj(): a queued count/user-input is not ported yet');
        }
        if (!otmp) /* didn't find what we were looking for, */
            game.cmdq = []; /* so discard any other queued cmnds */
        return otmp;
    }

    /* is "hands"/"self" a valid thing to do this action on? */
    switch (obj_ok(null)) {
    case GETOBJ_SUGGEST: /* treat as likely candidate */
        allownone = true;
        buf += HANDS_SYM;
        buf += ' '; /* put a space after the '-' in the prompt */
        break;
    case GETOBJ_DOWNPLAY: /* acceptable but not shown as likely choice */
    case GETOBJ_EXCLUDE_INACCESS:
    case GETOBJ_EXCLUDE_SELECTABLE:
        allownone = true;
        altlets += HANDS_SYM;
        break;
    case GETOBJ_EXCLUDE_NONINVENT: /* player skipped some alternative that's
                                    * not in inventory, now the hands/self
                                    * possibility is telling us so */
        forceprompt = false;
        inaccess++;
        break;
    default:
        break;
    }
    const bpstart = buf.length; /* bp = buf + bpstart */

    if (!invlet_constant())
        throw new Error('getobj(): reassign() is not ported yet');

    /* force invent to be in invlet order before collecting candidate
       inventory letters */
    const sortedinvent = sortloot_invent(false);
    let bp = '';
    for (const srtinv of sortedinvent) {
        otmp = srtinv.obj;
        switch (obj_ok(otmp)) {
        case GETOBJ_EXCLUDE_INACCESS:
            /* remove inaccessible things */
            inaccess++;
            break;
        case GETOBJ_EXCLUDE:
        case GETOBJ_EXCLUDE_SELECTABLE:
            /* remove more inappropriate things, but unlike the first it won't
               trigger an "else" in "you don't have anything else to ___" */
            break;
        case GETOBJ_DOWNPLAY:
            /* acceptable but not listed as likely candidates in the prompt
               or in the inventory subset if player responds with '?' - thus,
               don't add it to lets with bp, but add it to altlets with ap */
            forceprompt = true;
            altlets += otmp.invlet;
            break;
        case GETOBJ_SUGGEST:
            bp += otmp.invlet; /* adding otmp->invlet is all that's needed */
            suggested++;
            break;
        case GETOBJ_EXCLUDE_NONINVENT: /* not applicable for invent items */
        default:
            throw new Error('getobj(): bad return from getobj callback');
        }
    }

    /* If no objects were suggested but we added '- ' at the beginning for
     * hands, destroy the trailing space */
    if (suggested === 0 && bpstart > 0 && buf[bpstart - 1] === ' ')
        buf = buf.slice(0, bpstart - 1);
    lets = bp; /* necessary since we destroy buf */
    if (suggested > 5) /* compactify string */
        bp = compactify(bp);
    buf = buf.slice(0, suggested === 0 ? buf.length : bpstart) + bp;

    if (suggested === 0 && !forceprompt && !allownone) {
        await You(`don't have anything ${inaccess ? "else " : ""}to ${word}.`);
        return null;
    }
    for (;;) {
        cnt = 0;
        cntgiven = false;
        qbuf = `What do you want to ${word}?`;
        if (game.iflags?.force_invmenu) {
            throw new Error('getobj(): force_invmenu is not ported yet');
        } else {
            if (!buf.length)
                qbuf += " [*]";
            else
                qbuf += ` [${buf} or ?*]`;
            ilet = await tty_yn_function(qbuf, null, '\0');
        }
        if (ilet >= '0' && ilet <= '9') {
            if (!allowcnt) {
                await pline("No count allowed with this command.");
                continue;
            }
            throw new Error('getobj(): get_count() is not ported yet');
        }
        if (quitchars.includes(ilet)) {
            if (game.flags?.verbose ?? true)
                await pline(Never_mind);
            return null;
        }
        if (ilet === HANDS_SYM) { /* '-' */
            if (!allownone)
                await mime_action(word);
            return (allownone ? hands_obj : null);
        }
        let redo;
        do { /* redo_menu: */
            redo = false;
            /* since gold is now kept in inventory, we need to do processing
               for select-from-invent before checking whether gold has been
               picked */
            if (ilet === '?' || ilet === '*') {
                let allowed_choices = (ilet === '?') ? lets : null;
                const ctmp = { v: 0 };
                let handsbuf = null;

                if (ilet === '?' && !lets.length && altlets.length)
                    allowed_choices = altlets;

                if (!allowed_choices || allowed_choices[0] === HANDS_SYM
                    || buf[0] === HANDS_SYM)
                    handsbuf = getobj_hands_txt(word);
                ilet = await display_pickinv(allowed_choices, handsbuf,
                                             '', allownone, true,
                                             allowcnt ? ctmp : null);
                if (!ilet || ilet === '\0') {
                    if (oneloop)
                        return null;
                    ilet = null; /* continue */
                    break;
                }
                if (ilet === HANDS_SYM)
                    return hands_obj;
                if (ilet === '\x1b') {
                    if (game.flags?.verbose ?? true)
                        await pline(Never_mind);
                    return null;
                }
                if (ilet === '*' || ilet === '?') {
                    redo = true;
                    continue;
                }
                if (allowcnt && ctmp.v >= 0) {
                    cnt = ctmp.v;
                    cntgiven = true;
                }
                /* they typed a letter (not a space) at the prompt */
            }
        } while (redo);
        if (ilet === null)
            continue;
        /* find the item which was picked */
        for (otmp = game.invent; otmp; otmp = otmp.nobj)
            if (otmp.invlet === ilet)
                break;
        /* some items have restrictions */
        if (ilet === GOLD_SYM
            /* guard against the [hypothetical] chance of having more
               than one invent slot of gold and picking the non-'$' one */
            || (otmp && otmp.oclass === O.COIN_CLASS)) {
            if (otmp && obj_ok(otmp) <= GETOBJ_EXCLUDE) {
                await You(`cannot ${word} gold.`);
                return null;
            }
            if (cntgiven && cnt <= 0) {
                if (cnt < 0)
                    await pline_The("LRS would be very interested to know"
                                    + " you have that much.");
                return null;
            }
        }
        if (cntgiven && word === "throw") {
            const only_one = "can only throw one at a time";

            /* permit counts for throwing gold, but don't accept counts
               for other things since the throw code will split off a
               single item anyway */
            if (cnt === 0 || !otmp)
                return null;
            const coins = (otmp.oclass === O.COIN_CLASS);
            if (cnt > 1 && (!coins || cnt > otmp.quan)) {
                if (cnt > otmp.quan)
                    await You(`only have ${otmp.quan}${(!coins && otmp.quan > 1) ? " and " : ""}`
                              + `${(!coins && otmp.quan > 1) ? only_one : ""}.`);
                else
                    await You(`${only_one}.`);
                continue;
            }
        }
        game.disp_botl = true; /* May have changed the amount of money */
        /* cmdq_add_key(CQ_REPEAT, ilet): the ^A repeat queue isn't kept */
        /* verify the chosen object */
        if (!otmp) {
            await You("don't have that object.");
            continue;
        } else if (cnt < 0 || otmp.quan < cnt) {
            await You(`don't have that many!  You have only ${otmp.quan}.`);
            continue;
        }
        break;
    }
    if (obj_ok(otmp) === GETOBJ_EXCLUDE) {
        await silly_thing(word, otmp);
        return null;
    }
    /* split_otmp: */
    if (cntgiven) {
        if (cnt === 0)
            return null;
        if (cnt !== otmp.quan) {
            /* don't split a stack of cursed loadstones */
            if (splittable(otmp))
                otmp = splitobj(otmp, cnt);
            else if (otmp.otyp === O.LOADSTONE && otmp.cursed)
                /* kludge for canletgo()'s can't-drop-this message */
                otmp.corpsenm = cnt;
        }
    }
    return otmp;
}

// C ref: invent.c silly_thing()
export async function silly_thing(word, otmp) {
    /* see comment about Amulet of Yendor in objtyp_is_callable(do_name.c);
       known fakes yield the silly thing feedback */
    if (word === "call"
        && (otmp.otyp === O.AMULET_OF_YENDOR
            || (otmp.otyp === O.FAKE_AMULET_OF_YENDOR && !otmp.known)))
        await pline_The("Amulet doesn't like being called names.");
    else
        await pline(`That is a silly thing to ${word}.`);
}

// C ref: invent.c is_worn()
export function is_worn(otmp) {
    return (otmp.owornmask & (W_ARMOR | W_ACCESSORY | W_SADDLE | W_WEAPONS))
        ? true : false;
}

// C ref: stairs.c stairs_description()
function stairs_description(sway, stcase) {
    const tolev = sway.tolev;
    const stairs = sway.isladder ? "ladder" : stcase ? "staircase" : "stairs";
    const updown = sway.up ? "up" : "down";
    let outbuf;

    /* known_branch_stairs(): hero knows where the stairs go */
    if (!(tolev.dnum !== game.u.uz.dnum && sway.u_traversed)) {
        /* ordinary stairs or branch stairs to not-yet-visited branch */
        outbuf = `${stairs} ${updown}`;
        if (sway.u_traversed)
            throw new Error('stairs_description(): " to level %d" not ported yet');
    } else if (game.u.uz.dnum === 0 && game.u.uz.dlevel === 1 && sway.up) {
        /* stairs up from level one are a special case */
        if (game.u.uhave?.amulet)
            throw new Error('stairs_description(): stairs up with the Amulet not ported yet');
        outbuf = `${stairs} ${updown} out of the dungeon`;
    } else {
        throw new Error('stairs_description(): known branch stairs not ported yet');
    }
    return outbuf;
}

/* C ref: drawing.c defsyms[].explanation for the dungeon features that
   dfeature_at() names */
const dfeature_expl = {
    S_ndoor: "doorway", S_vodoor: "open door", S_vcdoor: "closed door",
    S_fountain: "fountain", S_throne: "opulent throne", S_lava: "molten lava",
    S_sink: "sink", S_vodbridge: "lowered drawbridge",
    S_vcdbridge: "raised drawbridge", S_grave: "grave", S_tree: "tree",
};

// C ref: invent.c dfeature_at()
function dfeature_at(x, y) {
    const lev = game.level.at(x, y);
    const ltyp = lev.typ;
    let cmap = null;
    let dfeature = null;
    const stway = stairway_at(x, y);

    if (IS_DOOR(ltyp)) {
        switch (lev.doormask) {
        case D_NODOOR:
            cmap = 'S_ndoor';
            break; /* "doorway" */
        case D_ISOPEN:
            cmap = 'S_vodoor';
            break; /* "open door" */
        case D_BROKEN:
            dfeature = "broken door";
            break;
        default:
            cmap = 'S_vcdoor';
            break; /* "closed door" */
        }
        /* is_drawbridge_wall(): drawbridges aren't ported */
    } else if (IS_FOUNTAIN(ltyp))
        cmap = 'S_fountain'; /* "fountain" */
    else if (IS_THRONE(ltyp))
        cmap = 'S_throne'; /* "opulent throne" */
    else if (is_lava(x, y))
        cmap = 'S_lava'; /* "molten lava" */
    else if (ltyp === ICE)
        throw new Error('dfeature_at(): ice_descr() not ported yet');
    else if (is_pool(x, y))
        dfeature = "pool of water";
    else if (IS_SINK(ltyp))
        cmap = 'S_sink'; /* "sink" */
    else if (IS_ALTAR(ltyp))
        throw new Error('dfeature_at(): altar description (a_gname()) not ported yet');
    else if (stway)
        dfeature = stairs_description(stway, true);
    else if (ltyp === DRAWBRIDGE_DOWN)
        cmap = 'S_vodbridge'; /* "lowered drawbridge" */
    else if (ltyp === DBWALL)
        cmap = 'S_vcdbridge'; /* "raised drawbridge" */
    else if (IS_GRAVE(ltyp))
        cmap = 'S_grave'; /* "grave" */
    else if (ltyp === TREE)
        cmap = 'S_tree'; /* "tree" */
    else if (ltyp === IRONBARS)
        dfeature = "set of iron bars";

    if (cmap)
        dfeature = dfeature_expl[cmap];
    return dfeature;
}

// C ref: invent.c look_here() -- the hero's own (unswallowed, sighted)
// look at what is here
export async function look_here(obj_cnt, /* obj_cnt > 0 implies that autopickup is in progress */
                                lookhere_flags) {
    const u = game.u;
    const bl = u.uprops?.[BLINDED];
    const Blind = !!((bl?.intrinsic || bl?.extrinsic) && !bl?.blocked);
    const verb = Blind ? "feel" : "see";
    let dfeature = null;
    let fbuf = '';
    const picked_some = (lookhere_flags & 1) !== 0; /* LOOKHERE_PICKED_SOME */
    let skip_dfeature = (lookhere_flags & 2) !== 0; /* LOOKHERE_SKIP_DFEATURE */

    /* default pile_limit is 5; a value of 0 means "never skip" */
    const pile_limit = game.flags?.pile_limit ?? 5;
    const skip_objects = (pile_limit > 0 && obj_cnt >= pile_limit);
    if (u.uswallow)
        throw new Error('look_here(): looking inside an engulfer not ported yet');
    if (!skip_objects) {
        const reg = visible_region_at(u.ux, u.uy);
        let trap = t_at(u.ux, u.uy);
        if (trap && !trap.tseen)
            trap = null;
        if (reg || trap)
            throw new Error('look_here(): "There is <region/trap> here." not ported yet');
    }

    const here = (game.level.objects || []).filter(
        o => o.ox === u.ux && o.oy === u.uy && o.where === 'OBJ_FLOOR');
    dfeature = dfeature_at(u.ux, u.uy);
    if (dfeature && dfeature === "pool of water" && u.uinwater)
        dfeature = null;

    if (Blind)
        throw new Error('look_here(): feeling what is here while blind not ported yet');

    if (dfeature && !skip_dfeature) {
        let article = 1; /* 0 => none, 1 => a/an */
        const sp = dfeature.indexOf(' ');
        if (dfeature === "molten lava" || dfeature === "iron bars"
            || dfeature === "ice" || dfeature.startsWith("frozen ")
            || (sp >= 0 && dfeature.slice(sp).toLowerCase() === " ice"))
            article = 0;
        if (article === 1)
            dfeature = an(dfeature);
        fbuf = `There ${vtense(dfeature, "are")} ${dfeature} here.`;
    }

    if (!here.length || is_lava(u.ux, u.uy)
        || (is_pool(u.ux, u.uy) && !u.uinwater)) {
        if (dfeature && !skip_dfeature)
            await pline(fbuf);
        read_engr_at(u.ux, u.uy); /* Eric Backus */
        if (!skip_objects && (Blind || !dfeature))
            await You(`${verb} no objects here.`);
        return ECMD_OK;
    }
    /* we know there is something here */

    if (skip_objects) {
        throw new Error('look_here(): pile_limit summary not ported yet');
    } else if (here.length === 1) {
        /* only one object */
        if (dfeature && !skip_dfeature)
            await pline(fbuf);
        read_engr_at(u.ux, u.uy); /* Eric Backus */
        const otmp = here[0];
        if (otmp.unpaid || game.level.flags?.has_shop)
            throw new Error('look_here(): doname_with_price() not ported yet');
        await You(`${verb} here ${doname(otmp)}.`);
        game.iflags.last_msg = 'PLNMSG_ONE_ITEM_HERE';
        if (otmp.otyp === O.CORPSE)
            throw new Error('look_here(): feel_cockatrice() not ported yet');
    } else {
        await tty_display_nhwindow(game.WIN_MESSAGE, false);
        const tmpwin = tty_create_nhwindow(NHW_MENU);
        if (dfeature && !skip_dfeature) {
            await tty_putstr(tmpwin, 0, fbuf);
            await tty_putstr(tmpwin, 0, "");
        }
        await tty_putstr(tmpwin, 0, `${picked_some ? "Other things" : "Things"} that ${Blind ? "you feel" : "are"} here:`);
        for (const otmp of here) {
            if (otmp.otyp === O.CORPSE)
                throw new Error('look_here(): will_feel_cockatrice() not ported yet');
            if (otmp.unpaid || game.level.flags?.has_shop)
                throw new Error('look_here(): doname_with_price() not ported yet');
            await tty_putstr(tmpwin, 0, doname(otmp));
        }
        await tty_display_nhwindow(tmpwin, true);
        await tty_destroy_nhwindow(tmpwin);
        read_engr_at(u.ux, u.uy); /* Eric Backus */
    }
    return ECMD_OK;
}

// C ref: invent.c dolook() -- the ':' command; the MSGTYPE hiding has
// nothing to hide while message types aren't configurable
export async function dolook() {
    return await look_here(0, 0);
}

/* C ref: engrave.c read_engr_at() -- only the nothing-to-read case is
   ported yet */
function read_engr_at(x, y) {
    const ep = engr_at(x, y);
    if (ep && ep.engr_txt?.actual_text?.[0])
        throw new Error('read_engr_at(): reading an engraving not ported yet');
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

// C ref: invent.c delobj()
/* destroy object in fobj chain (if unpaid, it remains on the bill) */
export function delobj(obj) {
    delobj_core(obj, false);
}

// C ref: invent.c delobj_core()
/* destroy object; caller has control over whether to destroy something
   that ordinarily shouldn't be destroyed */
export function delobj_core(obj, force) {
    /* obj_resists(obj,0,0) protects the Amulet, the invocation tools,
       and Rider corpses */
    if (!force && obj_resists(obj, 0, 0)) {
        /* player might be doing something stupid, but we
         * can't guarantee that.  assume special artifacts
         * are indestructible via drawbridges, and exploding
         * chests, and golem creation, and ...
         */
        obj.in_use = 0; /* in case caller has set this to 1 */
        return;
    }
    const update_map = (obj.where === 'OBJ_FLOOR');
    if (obj.where === 'OBJ_INVENT' || obj.unpaid || obj.cobj?.length)
        throw new Error('delobj_core(): obfree() of carried/unpaid/container objects not ported yet');
    obj_extract_self(obj);
    if (update_map) { /* floor object's coordinates are always up to date */
        maybe_unhide_at(obj.ox, obj.oy);
        newsym(obj.ox, obj.oy);
    }
    /* obfree(obj, (struct obj *) 0): garbage collected */
}
