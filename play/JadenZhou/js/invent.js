// invent.js — inventory letters and inventory lines.
// C ref: invent.c assigninvlet(), reorder_invent(), obj_to_let(), prinv(),
//        xprname()

import { game } from './gstate.js';
import { pline, You, pline_The, newsym, There } from './display.js';
import { obj_resists } from './dogmove.js';
import { maybe_unhide_at } from './mon.js';
import { doname, doname_with_price, makeplural } from './objnam.js';
import { rn2, rn2_on_display_rng } from './rng.js';
import { ing_suffix, visctrl } from './hacklib.js';
import { def_oc_syms } from './drawing.js';
import { body_part, hidden_gold, currency, empty_handed } from './insight.js';
import { money_cnt } from './u_init.js';
import { welded } from './wield.js';
import { stairway_at, obj_to_glyph } from './display.js';
import { an, vtense } from './objnam.js';
import { t_at, trapname } from './trap.js';
import { visible_region_at, reg_damg } from './region.js';
import { is_pool, is_lava } from './makemon.js';
import { engr_at, read_engr_at } from './engrave.js';
import { IS_DOOR, IS_FOUNTAIN, IS_THRONE, IS_SINK, IS_ALTAR, IS_GRAVE,
         D_NODOOR, D_ISOPEN, D_BROKEN, ICE, DRAWBRIDGE_DOWN, DBWALL, TREE,
         IRONBARS, ECMD_OK } from './const.js';
import * as O from './objects.js';
import { NO_COLOR, ATR_NONE, ATR_INVERSE } from './terminal.js';
import {
    NHW_MENU, WIN_ERR, PICK_NONE, PICK_ONE, MENU_BEHAVE_STANDARD,
    MENU_ITEMFLAGS_NONE, MENU_ITEMFLAGS_SKIPMENUCOLORS, MENU_ITEMFLAGS_SKIPINVERT,
    LOST_NONE, LOST_THROWN, LOST_EXPLODING, BLINDED, HALLUC,
    ONAME, has_oname,
    GETOBJ_EXCLUDE, GETOBJ_DOWNPLAY, GETOBJ_SUGGEST, GETOBJ_EXCLUDE_INACCESS,
    GETOBJ_EXCLUDE_SELECTABLE, GETOBJ_EXCLUDE_NONINVENT, GETOBJ_ALLOWCNT,
    GETOBJ_PROMPT, Never_mind, FINGERTIP, HAND, W_ARMOR, W_ACCESSORY,
    W_SADDLE, W_WEAPONS, W_TOOL,
} from './const.js';
import { objects } from './objects.js';
import * as M from './monsters.js';
import { mons, PM_COCKATRICE, PM_CHICKATRICE } from './monsters.js';
import { STONE_RES, BUC_BLESSED, BUC_CURSED, BUC_UNCURSED,
         BUC_UNKNOWN } from './const.js';
import { weight, erosion_matters, Is_candle, obj_extract_self, splitobj,
         dead_species, curse, dealloc_obj } from './mkobj.js';
import { itemactions } from './iactions.js';
import { NON_PM, P_DAGGER, P_SHORT_SWORD, P_SABER, P_SPEAR, Is_knox_level,
         Is_earthlevel, Is_airlevel, Is_firelevel, Is_waterlevel } from './const.js';
import { dunlev, depth } from './dungeon.js';
import { is_quest_artifact } from './questpgr.js';
import { artitouch } from './quest.js';
import { set_artifact_intrinsic, set_artifact_intrinsic_sync } from './artifact.js';
import { record_achievement } from './insight.js';
import { ACH_AMUL, ACH_CNDL, ACH_BELL, ACH_BOOK, ACH_MINE_PRIZE, ACH_SOKO_PRIZE,
         W_ART } from './const.js';
import { ART_MJOLLNIR } from './artilist.js';
import { is_missile, is_ammo, setuqwep } from './wield.js';
import { confers_luck, stop_timer, obj_stop_timers, obj_to_any, attach_fig_transform_timeout } from './timeout.js';
import { FIG_TRANSFORM } from './const.js';
import { obj_merge_light_sources } from './light.js';
import { set_moreluck } from './attrib.js';
import { setnotworn, setworn } from './worn.js';
import { oname } from './do_name.js';
import { W_WEP, W_SWAPWEP, W_QUIVER, ONAME_SKIP_INVUPD } from './const.js';
import { food_disappears } from './eat.js';
import { maybe_reset_pick } from './lock.js';
import { costly_spot, shop_keeper, inside_shop, inhishop, next_shkp, onbill,
         same_price } from './shk.js';
import {
    tty_create_nhwindow, tty_start_menu, tty_add_menu, tty_end_menu,
    tty_select_menu, tty_message_menu, tty_yn_function, tty_display_nhwindow,
    tty_putstr, tty_destroy_nhwindow, add_menu_str,
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
// count as well as a letter (wizard identify only when everything is
// identified already; no perm_invent, no in-use-only listing)
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

    const wizid = !!(game.flags?.debug && game.iflags?.override_ID);

    /* partial inventory in perm_invent setting; don't operate on
       full inventory window, use an alternate one instead; create
       the first time needed and keep it for re-use as needed later */
    if (game.cached_pickinv_win == null || game.cached_pickinv_win === WIN_ERR)
        game.cached_pickinv_win = tty_create_nhwindow(NHW_MENU);
    const win = game.cached_pickinv_win;
    const inuse_only = (game.flags?.sortloot === 'i');

    n = lets ? lets.length
             : !game.invent ? 0 : !game.invent.nobj ? 1 : 2;
    /* for xtra_choice, there's another 'item' not included in initial 'n';
       for !lets (full invent) and for override_ID (wizard mode identify),
       skip message_menu handling of single item even if item count was 1 */
    if (usextra || (n === 1 && (!lets || wizid)))
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

    if (inuse_only || (game.flags?.sortloot && game.flags.sortloot !== 'n'
                       && game.flags.sortloot !== 'l'))
        throw new Error('display_pickinv(): in-use/sortloot menus are not ported yet');
    const sortedinvent = sortloot_invent(sortpack);
    tty_start_menu(win, MENU_BEHAVE_STANDARD);
    const wizid_fakeobj = { wizid_fakeobj: true }; /* struct obj wizid_fakeobj */
    if (wizid) {
        let prompt;
        const unid_cnt = count_unidentified(game.invent);

        prompt = "Debug Identify"; /* 'title' rather than 'prompt' */
        if (unid_cnt)
            prompt += ` -- unidentified or partially identified item${unid_cnt !== 1 ? "s" : ""}`;
        add_menu_str(win, prompt);
        if (!unid_cnt) {
            add_menu_str(win,
                         "(all items are permanently identified already)");
        } else {
            prompt = `select ${(unid_cnt === 1) ? "it" : "any or all of them"} to permanently identify`;
            /* wiz_identify stuffed the wiz_identify command character (^I)
               into iflags.override_ID for our use as an accelerator;
               it could be ambiguous if player has assigned a letter to
               the #wizidentify command, so include it as a group accelerator
               but use '_' as the primary selector */
            if (unid_cnt > 1)
                prompt += ` (${visctrl(game.iflags.override_ID)} for all)`;
            tty_add_menu(win, null, wizid_fakeobj, '_',
                         String.fromCharCode(game.iflags.override_ID), ATR_NONE, clr, prompt, MENU_ITEMFLAGS_SKIPINVERT);
        }
    } else if (usextra) {
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
                if (wizid && !not_fully_identified_iv(otmp))
                    continue;
                /* maybe insert a class header */
                if (sortpack && !classcount) {
                    const withsym = (want_reply && game.iflags?.menu_head_objsym);
                    add_menu_heading(win, let_to_name(def_inv_order[invlet],
                                                      false, withsym));
                    classcount++;
                }
                const ilet = otmp.invlet;
                /* any.a_obj = otmp (wizid) or any.a_char = ilet */
                /* normal inventory item */
                const tmpglyph = obj_to_glyph(otmp, rn2_on_display_rng);
                /* map_glyphinfo(): tty menus don't show the glyph */
                void tmpglyph;
                tty_add_menu(win, null, wizid ? otmp : ilet, ilet,
                             wizid ? def_oc_syms[otmp.oclass] : '',
                             ATR_NONE, clr, doname(otmp), MENU_ITEMFLAGS_NONE);
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
    const res = await tty_select_menu(win, wizid ? PICK_ANY
                                           : want_reply ? PICK_ONE : PICK_NONE);
    n = res.n;
    if (n > 0 && wizid) {
        let all_id = false;

        /* identifying items will update perm_invent, calling this
           routine recursively, and we don't want the nested call
           to filter on unID'd items */
        game.iflags.override_ID = 0;
        ret = '\0';
        for (let i = 0; i < n; ++i) {
            const otmp = res.selected[i].item;
            if (otmp === wizid_fakeobj) {
                await identify_pack(0, false);
                /* identify_pack() performs update_inventory() */
                all_id = true;
                break;
            } else {
                if (not_fully_identified_iv(otmp))
                    await identify(otmp);
                /* identify() does not perform update_inventory() */
            }
        }
        /* if (!all_id) update_inventory(): no perm_invent */
        void all_id;
    } else if (n > 0) {
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
    const u = game.u;

    if (obj.oclass === O.COIN_CLASS) {
        game.disp_botl = true;
        return;
    } else if (obj.otyp === O.AMULET_OF_YENDOR) {
        if (!u.uhave.amulet)
            console.error("impossible: don't have amulet?");
        u.uhave.amulet = 0;
    } else if (obj.otyp === O.CANDELABRUM_OF_INVOCATION) {
        if (!u.uhave.menorah)
            console.error("impossible: don't have candelabrum?");
        u.uhave.menorah = 0;
    } else if (obj.otyp === O.BELL_OF_OPENING) {
        if (!u.uhave.bell)
            console.error("impossible: don't have silver bell?");
        u.uhave.bell = 0;
    } else if (obj.otyp === O.SPE_BOOK_OF_THE_DEAD) {
        if (!u.uhave.book)
            console.error("impossible: don't have the book?");
        u.uhave.book = 0;
    } else if (obj.oartifact) {
        if (is_quest_artifact(obj)) {
            if (!u.uhave.questart)
                console.error("impossible: don't have quest artifact?");
            u.uhave.questart = 0;
        }
        set_artifact_intrinsic_sync(obj, 0, W_ART);
    }

    if (obj.otyp === O.LOADSTONE) {
        curse(obj);
    } else if (confers_luck(obj)) {
        set_moreluck();
        game.disp_botl = true;
    } else if (obj.otyp === O.FIGURINE && obj.timed) {
        stop_timer(FIG_TRANSFORM, obj_to_any(obj));
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

// C ref: invent.c addinv_core1()
/*
 * Adjust hero intrinsics as if this object was being added to the hero's
 * inventory.  Called _before_ the object has been added to the hero's
 * inventory.
 */
export async function addinv_core1(obj) {
    const u = game.u;

    if (obj.oclass === O.COIN_CLASS) {
        game.disp_botl = true;
    } else if (obj.otyp === O.AMULET_OF_YENDOR) {
        if (u.uhave.amulet)
            console.error('impossible: already have amulet?');
        u.uhave.amulet = 1;
        record_achievement(ACH_AMUL);
    } else if (obj.otyp === O.CANDELABRUM_OF_INVOCATION) {
        if (u.uhave.menorah)
            console.error('impossible: already have candelabrum?');
        u.uhave.menorah = 1;
        record_achievement(ACH_CNDL);
    } else if (obj.otyp === O.BELL_OF_OPENING) {
        if (u.uhave.bell)
            console.error('impossible: already have silver bell?');
        u.uhave.bell = 1;
        record_achievement(ACH_BELL);
    } else if (obj.otyp === O.SPE_BOOK_OF_THE_DEAD) {
        if (u.uhave.book)
            console.error('impossible: already have the book?');
        u.uhave.book = 1;
        record_achievement(ACH_BOOK);
    } else if (obj.oartifact) {
        if (is_quest_artifact(obj)) {
            if (u.uhave.questart)
                console.error('impossible: already have quest artifact?');
            u.uhave.questart = 1;
            await artitouch(obj);
        }
        await set_artifact_intrinsic(obj, 1, W_ART);
    }

    /* "special achievements"; revealed in end of game disclosure and
       dumplog, originally just recorded in XLOGFILE */
    const achieveo = game.context?.achieveo;
    if (achieveo && obj.o_id === achieveo.mines_prize_oid) { /* is_mines_prize() */
        record_achievement(ACH_MINE_PRIZE);
        achieveo.mines_prize_oid = 0; /* done w/ luckstone o_id */
        obj.nomerge = 0; /* was set in create_object(sp_lev.c) */
    } else if (achieveo && obj.o_id === achieveo.soko_prize_oid) { /* is_soko_prize() */
        record_achievement(ACH_SOKO_PRIZE);
        achieveo.soko_prize_oid = 0; /* done w/ bag/amulet o_id */
        obj.nomerge = 0; /* (got set in sp_lev.c) */
    }
}

// C ref: invent.c addinv_core2()
/*
 * Adjust hero intrinsics (and perform other side effects) as if this
 * object was being added to the hero's inventory.  Called _after_ the
 * object has been added to the hero's inventory.
 */
export function addinv_core2(obj) {
    if (confers_luck(obj)) {
        /* new luckstone must be in inventory by this point
           for correct calculation */
        set_moreluck();
    }

    /* Archeologists can decipher the writing on a scroll label to work out
       what they are (exception: unlabeled scrolls don't have a label to
       decipher) */
    if (inv_Role_if(M.PM_ARCHEOLOGIST) && obj.oclass === O.SCROLL_CLASS
        && obj.otyp !== O.SCR_BLANK_PAPER && !inv_Blind()
        && !objects[obj.otyp].oc_name_known) {
        throw new Error('addinv_core2(): Archeologist deciphering a scroll label not ported yet');
    }
}

// C ref: invent.c addinv_core0()
/*
 * Add obj to the hero's inventory.  Make sure the object is "free".
 * Adjust hero attributes as necessary.
 */
async function addinv_core0(obj, other_obj, update_perm_invent) {
    let otmp, prev;

    if (obj.where !== 'OBJ_FREE')
        throw new Error('addinv: obj not free');
    if (obj.how_lost === LOST_EXPLODING)
        return null;

    /* normally addtobill() clears no_charge when items in a shop are
       picked up, but won't do so if the shop has become untended */
    obj.no_charge = 0; /* should not be set in hero's invent */
    if (obj.cobj && obj.cobj.length) /* Has_contents(obj) */
        picked_container(obj); /* clear no_charge */
    const obj_was_thrown = (obj.how_lost === LOST_THROWN);
    obj.how_lost = LOST_NONE;

    if (game.loot_reset_justpicked) {
        game.loot_reset_justpicked = false;
        reset_justpicked(game.invent);
    }

    await addinv_core1(obj); /* handle most side effects of carrying obj */

    added: {
        /* for addinv_before(); if something has been removed and is now
           being reinserted, try to put it in the same place instead of
           merging or placing at end */
        if (other_obj) {
            for (otmp = game.invent; otmp; otmp = otmp.nobj) {
                if (otmp.nobj === other_obj) {
                    obj.nobj = other_obj;
                    otmp.nobj = obj;
                    obj.where = 'OBJ_INVENT';
                    break added;
                }
            }
        }

        /* merge with quiver in preference to any other inventory slot
           in case quiver and wielded weapon are both eligible; adding
           extra to quivered stack is more useful than to wielded one */
        if (game.uquiver) {
            const r = { otmp: game.uquiver, obj };
            if (merged(r)) {
                if (r.learned) /* merged()'s message */
                    await pline("You learn more about your items by comparing them.");
                game.uquiver = r.otmp;
                obj = game.uquiver;
                break added;
            }
        }
        /* merge if possible; find end of chain in the process */
        for (prev = null, otmp = game.invent; otmp; prev = otmp, otmp = otmp.nobj) {
            const r = { otmp, obj };
            if (merged(r)) {
                if (r.learned) /* merged()'s message */
                    await pline("You learn more about your items by comparing them.");
                obj = r.otmp;
                break added;
            }
        }
        /* didn't merge, so insert into chain */
        assigninvlet(obj);
        if (invlet_constant() || !prev) {
            obj.nobj = game.invent; /* insert at beginning */
            game.invent = obj;
            if (invlet_constant())
                reorder_invent();
        } else {
            prev.nobj = obj; /* insert at end */
            obj.nobj = null;
        }
        obj.where = 'OBJ_INVENT';

        /* fill empty quiver if obj was thrown */
        if (obj_was_thrown && game.flags?.pickup_thrown && !game.uquiver
            && obj.oartifact !== ART_MJOLLNIR && obj.otyp !== O.AKLYS
            && (throwing_weapon(obj) || is_ammo(obj)))
            setuqwep(obj);
    }
    /* added: */
    obj.pickup_prev = 1;
    addinv_core2(obj); /* handle extrinsics conferred by carrying obj */
    carry_obj_effects(obj); /* carrying affects the obj */
    if (update_perm_invent) {
        /* update_inventory(): no perm_invent window */
    }
    return obj;
}

// C ref: invent.c addinv() -- add obj to the hero's inventory in the
// default fashion
export async function addinv(obj) {
    return await addinv_core0(obj, null, true);
}

// C ref: invent.c addinv_nomerge()
/* add obj to the hero's inventory by inserting in alphabetical order */
export async function addinv_nomerge(obj) {
    const save_nomerge = obj.nomerge;

    obj.nomerge = 1;
    const result = await addinv(obj);
    obj.nomerge = save_nomerge;
    return result;
}

// C ref: invent.c useupall()
/* used up all of an inventory item */
export function useupall(obj) {
    setnotworn(obj);
    freeinv(obj);
    obfree(obj, null); /* deletes contents also */
}

// C ref: invent.c useup()
/* an item in inventory is going away after being used */
export function useup(obj) {
    /* Note:  This works correctly for containers because they (containers)
       don't merge. */
    if (obj.quan > 1) {
        obj.in_use = 0; /* no longer in use */
        obj.quan--;
        obj.owt = weight(obj);
        /* update_inventory(): no perm_invent */
    } else {
        useupall(obj);
    }
}

/* C ref: shk.c onbill() -- in shk.js */

// C ref: shk.c delete_contents()
export function delete_contents(obj) {
    let curr;

    while ((curr = (obj.cobj && obj.cobj.length) ? obj.cobj[0] : null) !== null) {
        obj_extract_self(curr);
        obfree(curr, null);
    }
}

// C ref: shk.c obfree()
/* delete obj from the game; 'merge' is the stack it merged into, if any */
export function obfree(obj, merge) {
    if (obj.otyp === O.LEASH && obj.leashmon)
        throw new Error('obfree(): o_unleash() not ported yet');
    if (obj.oclass === O.FOOD_CLASS)
        food_disappears(obj);
    if (obj.oclass === O.SPBOOK_CLASS) {
        /* book_disappears(obj) */
        const ctx = game.context;
        if (ctx.spbook && obj === ctx.spbook.book) {
            ctx.spbook.book = null;
            ctx.spbook.o_id = 0;
        }
    }
    if (obj.cobj && obj.cobj.length) /* Has_contents(obj) */
        delete_contents(obj);
    if (obj.otyp >= O.LARGE_BOX && obj.otyp <= O.BAG_OF_TRICKS) /* Is_container */
        maybe_reset_pick(obj);
    if (obj.otyp === O.BOULDER)
        obj.next_boulder = 0;

    let shkp = null;
    if (obj.unpaid) {
        /* look for a shopkeeper who owns this object */
        for (shkp = next_shkp(game.fmon, true); shkp;
             shkp = next_shkp(shkp.nmon, true))
            if (onbill(obj, shkp, true))
                break;
    }
    /* sanity check, in case obj is on bill but not marked 'unpaid' */
    if (!shkp)
        shkp = shop_keeper(game.u.ushops ? (game.u.ushops.charCodeAt(0) || 0) : 0);
    if (onbill(obj, shkp, false)) {
        throw new Error('obfree(): used-up or merged bill entry not ported yet');
    } else {
        /* not on bill; a merged-away stack with a higher price adjustment
           passes its o_id on (oid_price_adjustment()) */
        if (merge)
            throw new Error('obfree(): merge price adjustment not ported yet');
    }
    if (obj.owornmask) {
        /* impossible("obfree: deleting worn obj") */
        setnotworn(obj);
    }
    dealloc_obj(obj);
}

// C ref: shk.c picked_container()
export function picked_container(obj) {
    /* the "top" container is treated in the calling fn */
    for (const otmp of obj.cobj || []) {
        if (otmp.oclass === O.COIN_CLASS)
            continue;

        if (otmp.no_charge)
            otmp.no_charge = 0;

        if (otmp.cobj && otmp.cobj.length) /* Has_contents() */
            picked_container(otmp);
    }
}

// C ref: invent.c carry_obj_effects()
/*
 * Some objects are affected by being carried.
 * Make those adjustments here. Called _after_ the object
 * has been added to the hero's or monster's inventory,
 * and after hero's intrinsics have been updated.
 */
export function carry_obj_effects(obj) {
    /* Cursed figurines can spontaneously transform when carried. */
    if (obj.otyp === O.FIGURINE) {
        if (obj.cursed && obj.corpsenm !== NON_PM
            && !dead_species(obj.corpsenm, true)) {
            attach_fig_transform_timeout(obj);
        }
    }
}

// C ref: invent.c nxtobj()
/* return the next object of the given type after obj in its list
   (the floor's nexthere chain when by_nexthere) */
export function nxtobj(obj, type, by_nexthere) {
    let otmp = obj; /* start with the object after this one */
    do {
        otmp = !by_nexthere ? otmp.nobj : otmp.nexthere;
        if (!otmp)
            break;
    } while (otmp.otyp !== type);

    return otmp || null;
}

// C ref: invent.c carrying()
/* return the first object of the given type in the hero's inventory */
export function carrying(type) {
    for (let otmp = game.invent; otmp; otmp = otmp.nobj)
        if (otmp.otyp === type)
            return otmp;
    return null;
}

// C ref: invent.c merge_choice()
/* scan a list of objects to see whether another object will merge with
   one of them; used in pickup.c when all 52 inventory slots are in use,
   to figure out whether another object could still be picked up */
export function merge_choice(objlist, obj) {
    if (!objlist) /* might be checking 'obj' against empty inventory */
        return null;
    if (obj.otyp === O.SCR_SCARE_MONSTER) /* punt on these */
        return null;
    /* if this is an item on the shop floor, the attributes it will
       have when carried are different from what they are now; prevent
       that from eliciting an incorrect result from mergable() */
    const save_nocharge = obj.no_charge;
    let shkp;
    if (objlist === game.invent && obj.where === 'OBJ_FLOOR'
        && (shkp = shop_keeper(inside_shop(obj.ox, obj.oy))) != null) {
        if (obj.no_charge)
            obj.no_charge = 0;
        /* A billable object won't have its `unpaid' bit set, so would
           erroneously seem to be a candidate to merge with a similar
           ordinary object.  That's no good, because once it's really
           picked up, it won't merge after all.  It might merge with
           another unpaid object, but we can't check that here (depends
           too much upon shk's bill) and if it doesn't merge it would
           end up in the '#' overflow inventory slot, so reject it now. */
        else if (inhishop(shkp))
            return null;
    }
    do {
        if (mergable(objlist, obj))
            break;
        objlist = objlist.nobj;
    } while (objlist);
    obj.no_charge = save_nocharge;
    return objlist;
}

// C ref: dothrow.c throwing_weapon()
function throwing_weapon(obj) {
    const skill = objects[obj.otyp].oc_skill;
    const is_weapon = obj.oclass === O.WEAPON_CLASS;
    return (is_missile(obj)
            || (is_weapon && skill === P_SPEAR) /* is_spear() */
            /* daggers and knife (excludes scalpel) */
            || (is_weapon && skill >= P_DAGGER && skill <= P_SABER /* is_blade() */
                && !(skill >= P_SHORT_SWORD && skill <= P_SABER) /* is_sword() */
                && (objects[obj.otyp].oc_dir & O.PIERCE))
            /* special cases [might want to add AXE] */
            || obj.otyp === O.WAR_HAMMER || obj.otyp === O.AKLYS);
}

// C ref: pickup.c reset_justpicked() -- reset last-picked-up flags
export function reset_justpicked(olist) {
    for (let otmp = olist; otmp; otmp = otmp.nobj)
        otmp.pickup_prev = 0;
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

// C ref: invent.c count_unpaid()
/*
 * Returns the number of unpaid items within the given list.  This includes
 * contained objects.  The list is an invent-style nobj chain or a
 * container's cobj array.
 */
export function count_unpaid(list) {
    let count = 0;

    for (const o of objchain_items(list)) {
        if (o.unpaid)
            count++;
        if (o.cobj && o.cobj.length) /* Has_contents() */
            count += count_unpaid(o.cobj);
    }
    return count;
}

/* an object chain as an array: JS keeps invent as an nobj chain and
   floor piles, minvent and container contents as arrays */
export function objchain_items(list) {
    if (Array.isArray(list))
        return list;
    const res = [];
    for (let o = list; o; o = o.nobj)
        res.push(o);
    return res;
}

// C ref: invent.c count_buc()
/*
 * Returns the number of items with b/u/c/unknown within the given list.
 * This does NOT include contained objects.
 *
 * Assumes that the hero sees or touches or otherwise senses the objects
 * at some point:  bknown is forced for priest[ess], like in xname().
 */
export function count_buc(list, type, filterfunc) {
    let count = 0;

    for (const o of objchain_items(list)) {
        /* priests always know bless/curse state */
        if (game.urole.mnum === M.PM_CLERIC)
            o.bknown = (o.oclass !== O.COIN_CLASS) ? 1 : 0;
        /* some actions exclude some or most items */
        if (filterfunc && !filterfunc(o))
            continue;

        /* coins are either uncursed or unknown based upon option setting */
        if (o.oclass === O.COIN_CLASS) {
            if (type === (game.flags.goldX ? BUC_UNKNOWN : BUC_UNCURSED))
                ++count;
            continue;
        }
        /* check whether this object matches the requested type */
        if (!o.bknown
                ? (type === BUC_UNKNOWN)
                : o.blessed ? (type === BUC_BLESSED)
                            : o.cursed ? (type === BUC_CURSED)
                                       : (type === BUC_UNCURSED))
            ++count;
    }
    return count;
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
        if (sway.u_traversed) {
            const specialdepth = (tolev.dnum === game.dungeon_topology.d_quest_dnum
                                  || Is_knox_level(tolev)); /* single_level_branch(): knox */
            const to_dlev = specialdepth ? dunlev(tolev) : depth(tolev);

            outbuf += ` to level ${to_dlev}`;
        }
    } else if (game.u.uz.dnum === 0 && game.u.uz.dlevel === 1 && sway.up) {
        /* stairs up from level one are a special case */
        /* stairs up from level one are a special case; they are marked
           as having been traversed because the hero obviously started
           the game by coming down them, but the remote side varies
           depending on whether the Amulet is being carried */
        const amulet = game.u.uhave?.amulet;
        outbuf = `${!amulet ? "" : "branch "}${stairs} ${updown} ${
            !amulet ? "out of the dungeon"
            /* minimize our expectations about what comes next */
            : (Is_earthlevel(tolev) || Is_airlevel(tolev)
               || Is_firelevel(tolev) || Is_waterlevel(tolev))
              ? "to the Elemental Planes"
              : "to the end game"}`;
    } else {
        /* known branch stairs; tacking on destination level is too verbose */
        outbuf = `branch ${stairs} ${updown} to ${game.dungeons[tolev.dnum].dname}`;
        /* dungeons[].dname is capitalized; undo that for "The <Branch>" */
        outbuf = outbuf.replace("The ", "the "); /* strsubst() */
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
export function dfeature_at(x, y) {
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

/* C ref: mondata.h touch_petrifies() */
function touch_petrifies(ptr) {
    return ptr === mons[PM_COCKATRICE] || ptr === mons[PM_CHICKATRICE];
}

// C ref: invent.c will_feel_cockatrice()
export function will_feel_cockatrice(otmp, force_touch) {
    const bl = game.u.uprops?.[BLINDED];
    const Blind = !!((bl?.intrinsic || bl?.extrinsic) && !bl?.blocked);
    const sr = game.u.uprops?.[STONE_RES];
    const Stone_resistance = !!(sr?.intrinsic || sr?.extrinsic);

    if ((Blind || force_touch) && !game.uarmg && !Stone_resistance
        && (otmp.otyp === O.CORPSE
            && touch_petrifies(mons[otmp.corpsenm])))
        return true;
    return false;
}

// C ref: invent.c feel_cockatrice()
function feel_cockatrice(otmp, force_touch) {
    if (will_feel_cockatrice(otmp, force_touch))
        throw new Error('feel_cockatrice(): touching a cockatrice corpse not ported yet');
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
        let regbuf = '';
        const reg = visible_region_at(u.ux, u.uy);
        if (reg)
            regbuf = `a ${reg_damg(reg) ? "poison gas" : "vapor"} cloud`;
        let trap = t_at(u.ux, u.uy);
        if (trap && !trap.tseen)
            trap = null;
        if (reg || trap)
            await There(`is ${reg ? regbuf : ""}${(reg && trap) ? " and " : ""}${
                trap ? an(trapname(trap.ttyp, false)) : ""} here.`);
    }

    const here = (game.level.objects || []).filter(
        o => o.ox === u.ux && o.oy === u.uy && o.where === 'OBJ_FLOOR');
    dfeature = dfeature_at(u.ux, u.uy);
    if (dfeature && dfeature === "pool of water" && u.uinwater)
        dfeature = null;

    if (Blind) {
        const drift = Is_airlevel_iv(u.uz) || Is_waterlevel_iv(u.uz);

        if (dfeature && dfeature.startsWith("altar ")) {
            /* don't say "altar" twice, dfeature has more info */
            await You("try to feel what is here.");
        } else if (SURFACE_AT_iv(u.ux, u.uy) === ICE_IV) {
            throw new Error('look_here(): feeling for objects on ice (force_decor()) not ported yet');
        } else {
            const cant_reach = !can_reach_floor_iv(true);
            const surf = surface_iv(u.ux, u.uy),
                  where = cant_reach ? "lying beneath you"
                                     : "lying here on the ",
                  onwhat = cant_reach ? "" : surf;

            await You(`try to feel what is ${drift ? "floating here" : where}${
                drift ? "" : onwhat}.`);

            if (dfeature && !drift && dfeature === surf)
                skip_dfeature = true; /* terrain feature already identified */
        }
        const trap = t_at(u.ux, u.uy);
        if (!can_reach_floor_iv(trap && is_pit_iv(trap.ttyp))) {
            await pline("But you can't reach it!");
            return ECMD_OK;
        }
    }

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
        await read_engr_at(u.ux, u.uy); /* Eric Backus */
        if (!skip_objects && (Blind || !dfeature))
            await You(`${verb} no objects here.`);
        return (Blind ? ECMD_TIME_IV : ECMD_OK);
    }
    /* we know there is something here */

    if (skip_objects) {
        if (dfeature && !skip_dfeature)
            await pline(fbuf);
        await read_engr_at(u.ux, u.uy); /* Eric Backus */
        if (obj_cnt === 1 && here[0].quan === 1)
            await There(`is ${picked_some ? "another" : "an"} object here.`);
        else
            await There(`are ${(obj_cnt === 2) ? "two"
                               : (obj_cnt < 5) ? "a few"
                                 : (obj_cnt < 10) ? "several"
                                   : "many"}${picked_some ? " more" : ""} objects here.`);
        for (const otmp of here)
            if (otmp.otyp === O.CORPSE && will_feel_cockatrice(otmp, false))
                throw new Error('look_here(): "Including <cockatrice corpse>" (corpse_xname, feel_cockatrice) not ported yet');
    } else if (here.length === 1) {
        /* only one object */
        if (dfeature && !skip_dfeature)
            await pline(fbuf);
        await read_engr_at(u.ux, u.uy); /* Eric Backus */
        const otmp = here[0];
        await You(`${verb} here ${doname_with_price(otmp)}.`);
        game.iflags.last_msg = 'PLNMSG_ONE_ITEM_HERE';
        if (otmp.otyp === O.CORPSE)
            feel_cockatrice(otmp, false);
    } else {
        await tty_display_nhwindow(game.WIN_MESSAGE, false);
        const tmpwin = tty_create_nhwindow(NHW_MENU);
        if (dfeature && !skip_dfeature) {
            await tty_putstr(tmpwin, 0, fbuf);
            await tty_putstr(tmpwin, 0, "");
        }
        await tty_putstr(tmpwin, 0, `${picked_some ? "Other things" : "Things"} that ${Blind ? "you feel" : "are"} here:`);
        for (const otmp of here) {
            if (will_feel_cockatrice(otmp, false))
                throw new Error('look_here(): felt_cockatrice not ported yet');
            await tty_putstr(tmpwin, 0, doname_with_price(otmp));
        }
        await tty_display_nhwindow(tmpwin, true);
        await tty_destroy_nhwindow(tmpwin);
        await read_engr_at(u.ux, u.uy); /* Eric Backus */
    }
    return (Blind ? ECMD_TIME_IV : ECMD_OK);
}

// C ref: invent.c dolook() -- the ':' command; the MSGTYPE hiding has
// nothing to hide while message types aren't configurable
export async function dolook() {
    return await look_here(0, 0);
}


/* C ref: invent.c inuse_headers[4], the in-use "Accessories" heading that
   dispinv_with_action() can relabel */
let inuse_accessories = "Accessories";

// C ref: invent.c dispinv_with_action()
async function dispinv_with_action(lets, use_inuse_ordering, alt_label) {
    let save_accessories = null;
    let save_sortloot = null;
    const len = lets ? lets.length : 0;
    const menumode = (len !== 1 || game.iflags?.menu_requested) ? true : false;
    const save_force_invmenu = game.iflags.force_invmenu;

    if (use_inuse_ordering) {
        save_accessories = inuse_accessories;
        save_sortloot = game.flags.sortloot;

        game.flags.sortloot = 'i'; /* checked by display_pickinv() */
        if (alt_label)
            inuse_accessories = alt_label;
    }
    game.iflags.force_invmenu = false;

    let c;
    try {
        c = await display_inventory(lets, menumode);
    } finally {
        if (use_inuse_ordering) {
            game.flags.sortloot = save_sortloot;
            inuse_accessories = save_accessories;
        }
    }
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

// C ref: invent.c doprgold() -- the #showgold command
export async function doprgold() {
    /* Command takes containers into account. */
    const umoney = money_cnt(game.invent);

    /* Only list the money you know about.  Guards and shopkeepers
       can somehow tell if there is any gold anywhere on your
       person, but you have no such preternatural gold-sense. */
    const hmoney = hidden_gold(false);

    if (game.flags.verbose) {
        let buf;

        if (!umoney) {
            buf = "Your wallet is empty";
        } else {
            buf = `Your wallet contains ${umoney} ${currency(umoney)}`;
        }
        if (hmoney) {
            buf += `, ${umoney ? "and" : "but"} you have ${hmoney} `
                   + `${umoney ? "more" : currency(hmoney)} stashed away in your pack`;
        }
        await pline(`${buf}.`);
    } else {
        const total = umoney + hmoney;
        if (total)
            await You(`are carrying a total of ${total} ${currency(total)}.`);
        else
            await You("have no money.");
    }
    shopper_financial_report();

    if (umoney && game.iflags.menu_requested) {
        /* mustn't use TRUE or gold wouldn't show up unless it was quivered */
        await dispinv_with_action("$", false, null);
    }

    return ECMD_OK;
}

// C ref: shk.c shopper_financial_report() -- the report for the shop the
// hero is in (shop_keeper(inside_shop(u.ux, u.uy))) and the level's other
// shops (next_shkp()); without a shopkeeper there is nothing to report
function shopper_financial_report() {
    for (let shkp = game.fmon; shkp; shkp = shkp.nmon)
        if (shkp.isshk && !shkp.dead)
            throw new Error('shopper_financial_report(): shopkeepers not ported yet');
}

// C ref: invent.c doprwep() -- the #seeweapon command
export async function doprwep() {
    if (!game.uwep) {
        await You(`are ${empty_handed()}.`);
    } else if (!game.iflags.menu_requested) {
        await prinv(null, game.uwep, 0);
        if (game.u.twoweap)
            await prinv(null, game.uswapwep, 0);
    } else {
        /* 4: uwep, uswapwep, uquiver, terminator */
        let lets = '';

        /* obj_to_let() will assign letters to all of invent if necessary
           (for '!fixinv') so doesn't need to be repeated once called here */
        lets += obj_to_let(game.uwep);
        if (game.uswapwep)
            lets += game.uswapwep.invlet;
        if (game.uquiver)
            lets += game.uquiver.invlet;

        await dispinv_with_action(lets, true, null);
    }
    return ECMD_OK;
}

// C ref: invent.c wearing_armor()
export function wearing_armor() {
    const g = game;
    return !!(g.uarm || g.uarmc || g.uarmf || g.uarmg
              || g.uarmh || g.uarms || g.uarmu);
}

// C ref: invent.c noarmor()
/* caller is responsible for checking !wearing_armor() */
async function noarmor(report_uskin) {
    if (!game.uskin || !report_uskin) {
        await You("are not wearing any armor.");
    } else {
        throw new Error('noarmor(): dragon scales embedded in skin not ported yet');
    }
}

// C ref: invent.c doprarm() -- the #seearmor command
export async function doprarm() {
    const g = game;
    /*
     * Note:  players sometimes get here by pressing a function key which
     * transmits ''ESC [ <something>'' rather than by pressing '[';
     * there's nothing we can--or should-do about that here.
     */

    if (!wearing_armor()) {
        await noarmor(true);
    } else {
        /* 8: up to 7 pieces of armor plus terminator */
        let lets = '';

        /* obj_to_let() will assign letters to all of invent if necessary
           (for '!fixinv') so doesn't need to be repeated once called, but
           each armor slot doesn't know whether any that precede have made
           that call so just do it for each one; use SORTPACK_INUSE order */
        if (g.uarm)
            lets += obj_to_let(g.uarm);
        if (g.uarmc)
            lets += obj_to_let(g.uarmc);
        if (g.uarms)
            lets += obj_to_let(g.uarms);
        if (g.uarmh)
            lets += obj_to_let(g.uarmh);
        if (g.uarmg)
            lets += obj_to_let(g.uarmg);
        if (g.uarmf)
            lets += obj_to_let(g.uarmf);
        if (g.uarmu)
            lets += obj_to_let(g.uarmu);

        await dispinv_with_action(lets, true, null);
    }
    return ECMD_OK;
}

// C ref: invent.c doprring() -- the #seerings command
export async function doprring() {
    const g = game;
    if (!g.uleft && !g.uright) {
        await You("are not wearing any rings.");
    } else {
        /* 3: uright, uleft, terminator */
        let lets = '';
        let use_inuse_mode = false;

        /* if either ring is a meat ring, switch to use_inuse_mode in order
           to label it/them as "Rings" rather than "Comestibles" */
        if (g.uright) {
            lets += obj_to_let(g.uright);
            if (g.uright.oclass !== O.RING_CLASS)
                use_inuse_mode = true;
        }
        if (g.uleft) {
            lets += obj_to_let(g.uleft);
            if (g.uleft.oclass !== O.RING_CLASS)
                use_inuse_mode = true;
        }
        /* also switch to use_inuse_mode if there are two rings or player
           used the 'm' prefix */
        if (lets.length > 1 || g.iflags.menu_requested)
            use_inuse_mode = true;

        await dispinv_with_action(lets, use_inuse_mode,
                                  /* note; alternate label will be ignored
                                     if 'use_inuse_mode' is False */
                                  (lets.length === 1) ? "Ring" : "Rings");
    }
    return ECMD_OK;
}

// C ref: invent.c dopramulet() -- the #seeamulet command
export async function dopramulet() {
    if (!game.uamul) {
        await You("are not wearing an amulet.");
    } else {
        /* using display_inventory() instead of prinv() allows player
           to use 'm "' to force and menu and be able to choose amulet
           in order to perform a context-sensitive item action */
        const lets = obj_to_let(game.uamul);

        await dispinv_with_action(lets, true, "Amulet");
    }
    return ECMD_OK;
}

// C ref: invent.c tool_being_used()
/* is 'obj' a tool that's in use?  can't simply check obj->owornmask */
function tool_being_used(obj) {
    /*
     * [Should this also include lit potions of oil?  They're not tools
     *  but they are "in use" without being noticeable via obj->owornmask.]
     */
    if ((obj.owornmask & (W_TOOL | W_SADDLE)) !== 0)
        return true;
    if (obj.oclass !== O.TOOL_CLASS)
        return false;
    /* [don't actually need to check uwep here; caller catches it] */
    return !!(obj === game.uwep || obj.lamplit
              || (obj.otyp === O.LEASH && obj.leashmon));
}

// C ref: invent.c doprtool() -- the #seetools command
export async function doprtool() {
    let lets = '';

    for (let otmp = game.invent; otmp; otmp = otmp.nobj)
        if (tool_being_used(otmp)) {
            /* we could be carrying more than 52 items; theoretically they
               might all be lit candles so avoid potential lets[] overflow */
            if (lets.length >= 52)
                break;
            lets += obj_to_let(otmp);
        }
    if (!lets.length)
        await You("are not using any tools.");
    else
        await dispinv_with_action(lets, true, null);
    return ECMD_OK;
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
    if (obj.unpaid && !same_price(obj, otmp))
        return false;

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
    let otmp = r.otmp;
    const obj = r.obj;
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
            otmp = r.otmp = oname(otmp, obj.oextra.oname, ONAME_SKIP_INVUPD);
        obj_extract_self(obj);

        if (obj.pickup_prev && otmp.where === 'OBJ_INVENT')
            otmp.pickup_prev = 1;
        /* really should merge the timeouts */
        if (obj.lamplit)
            obj_merge_light_sources(obj, otmp);
        if (obj.timed)
            obj_stop_timers(obj); /* follows lights */

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
        if (obj.owornmask && otmp.where === 'OBJ_INVENT') {
            let wmask = otmp.owornmask | obj.owornmask;

            /* Both the items might be worn in competing slots;
               merger preference (regardless of which is which):
             primary weapon + alternate weapon -> primary weapon;
             primary weapon + quiver -> primary weapon;
             alternate weapon + quiver -> alternate weapon.
               (Prior to 3.3.0, it was not possible for the two
               stacks to be worn in different slots and `obj'
               didn't need to be unworn when merging.) */
            if (wmask & W_WEP) {
                wmask = W_WEP;
            } else if (wmask & W_SWAPWEP) {
                wmask = W_SWAPWEP;
            } else if (wmask & W_QUIVER) {
                wmask = W_QUIVER;
            } else {
                console.error(`impossible: merging strangely worn items (${wmask})`);
                wmask = otmp.owornmask;
            }
            if ((otmp.owornmask & ~wmask) !== 0)
                setnotworn(otmp);
            setworn(otmp, wmask);
            setnotworn(obj);
        }
        if (obj.bypass)
            otmp.bypass = 1;
        /* handle puddings a bit differently */
        if (obj.globby)
            throw new Error('merged(): obj_absorb() is not ported yet');
        /* Print a message if item comparison discovers more
           information about the items (with the exception of thrown
           items, where this would be too spammy as such items get
           unidentified by monsters very frequently).  pline() is async
           in JS, so the caller (addinv_core0(), the only one merging into
           the hero's inventory) prints it right after merged() returns;
           nothing else in merged() or obfree() gives a message */
        if (discovered && otmp.where === 'OBJ_INVENT'
            && (obj.how_lost || 0) !== LOST_THROWN
            && (otmp.how_lost || 0) !== LOST_THROWN)
            r.learned = true;
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
    obfree(obj, null); /* frees contents also */
}

// C ref: invent.c useupf()
/* use up an object that's on the floor, charging for it as needed */
export function useupf(obj, numused) {
    let otmp;
    const at_u = (obj.ox === game.u.ux && obj.oy === game.u.uy);

    /* burn_floor_objects() keeps an object pointer that it tries to
     * useupf() multiple times, so obj must survive if plural */
    if (obj.quan > numused)
        otmp = splitobj(obj, numused);
    else
        otmp = obj;
    if (!game.context.mon_moving && costly_spot(otmp.ox, otmp.oy))
        throw new Error('useupf(): addtobill()/stolen_value() not ported yet');
    delobj(otmp);
    if (at_u && game.u.uundetected
        && (game.youmonst.data.mflags1 & M.M1_CONCEAL) !== 0) /* hides_under() */
        throw new Error('useupf(): hideunder() not ported yet');
}

// C ref: invent.c set_cknown_lknown()
/* set obj->{cknown,lknown} if applicable */
export function set_cknown_lknown(obj) {
    if (Is_container_iv(obj) || obj.otyp === O.STATUE)
        obj.cknown = obj.lknown = 1;
    else if (obj.otyp === O.TIN)
        obj.cknown = 1;
    /* TODO? cknown might be extended to candy bar, where it would mean that
       wrapper's text was known which in turn indicates candy bar's content */
    return;
}

// C ref: invent.c fully_identify_obj()
/* make an object actually be identified; no display updating */
export function fully_identify_obj(otmp) {
    discover_object_iv(otmp.otyp, true, true, true); /* makeknown() */
    if (otmp.oartifact)
        discover_artifact(otmp.oartifact);
    observe_object_iv(otmp, Hallucination_iv());
    otmp.known = otmp.bknown = otmp.rknown = 1;
    set_cknown_lknown(otmp); /* set otmp->{cknown,lknown} if applicable */
    if (otmp.otyp === O.EGG && otmp.corpsenm !== NON_PM) {
        /* C ref: timeout.c learn_egg_type() */
        /* baby monsters hatch from grown-up eggs */
        const mnum = little_to_big(otmp.corpsenm);
        game.mvitals[mnum].mvflags |= MV_KNOWS_EGG;
        /* we might have just learned about other eggs being carried */
        /* update_inventory(): no perm_invent */
    }
}

// C ref: invent.c identify()
/* ggetobj callback routine; identify an object and give immediate feedback */
export async function identify(otmp) {
    fully_identify_obj(otmp);
    await prinv(null, otmp, 0);
    return 1;
}

// C ref: invent.c menu_identify()
/* menu of unidentified objects; select and identify up to id_limit of them */
async function menu_identify(id_limit) {
    let n, i, first = 1, tryct = 5;
    /* assumptions:  id_limit > 0 and at least one unID'd item is present */

    while (id_limit) {
        const buf = `What would you like to identify ${first ? "first" : "next"}?`;
        const olist = [];
        for (let o = game.invent; o; o = o.nobj)
            olist.push(o);
        const pick_list = [];
        n = await query_objlist_iv(buf, olist, (SIGNAL_NOMENU | SIGNAL_ESCAPE
                                                 | USE_INVLET | INVORDER_SORT),
                                   pick_list, PICK_ANY, not_fully_identified_iv);

        if (n > 0) {
            if (n > id_limit)
                n = id_limit;
            for (i = 0; i < n; i++, id_limit--)
                await identify(pick_list[i].obj);
            if (id_limit)
                wait_synch_iv(); /* Before we loop to pop open another menu */
            first = 0;
        } else if (n === -2) { /* player used ESC to quit menu */
            break;
        } else if (n === -1) { /* no eligible items found */
            await pline("That was all.");
            break;
        } else if (!--tryct) { /* stop re-prompting */
            await pline(thats_enough_tries);
            break;
        } else { /* try again */
            await pline("Choose an item; use ESC to decline.");
        }
    }
}

// C ref: invent.c count_unidentified()
/* count the unidentified items */
export function count_unidentified(objchn) {
    let unid_cnt = 0;

    for (let obj = objchn; obj; obj = obj.nobj)
        if (not_fully_identified_iv(obj))
            ++unid_cnt;
    return unid_cnt;
}

// C ref: invent.c identify_pack()
/* dialog with user to identify a given number of items; 0 means all */
export async function identify_pack(id_limit,
                                    learning_id) { /* T: just read unknown identify scroll */
    let obj;
    let n, unid_cnt = count_unidentified(game.invent);

    if (!unid_cnt) {
        await You(`have already identified ${!learning_id ? "all" : "the rest"} of your possessions.`);
    } else if (!id_limit || id_limit >= unid_cnt) {
        /* identify everything */
        /* TODO:  use fully_identify_obj and cornline/menu/whatever here */
        for (obj = game.invent; obj; obj = obj.nobj) {
            if (not_fully_identified_iv(obj)) {
                await identify(obj);
                if (--unid_cnt < 1)
                    break;
            }
        }
    } else {
        /* identify up to `id_limit' items */
        n = 0;
        if ((game.flags.menu_style ?? MENU_FULL_IV) === MENU_TRADITIONAL_IV)
            throw new Error('identify_pack(): ggetobj() (menustyle:traditional) not ported yet');
        if (n === 0 || n < -1)
            await menu_identify(id_limit);
    }
    /* update_inventory(): no perm_invent */
}

/* C ref: wintty.c tty_wait_synch() -- the map window is up and no raw
   output is pending, so this only flushes the (unbuffered) screen */
function wait_synch_iv() {
    if (game.ttyDisplay?.rawprint)
        throw new Error('wait_synch(): getret() not ported yet');
}
/* C ref: youprop.h Hallucination */
function Hallucination_iv() {
    const p = game.u.uprops;
    return !!(p[HALLUC_IV].intrinsic
              && !(p[HALLUC_RES_IV].intrinsic || p[HALLUC_RES_IV].extrinsic));
}
/* C ref: obj.h Is_container() */
function Is_container_iv(otmp) {
    return otmp.otyp >= O.LARGE_BOX && otmp.otyp <= O.BAG_OF_TRICKS;
}

import { discover_object as discover_object_iv,
         observe_object as observe_object_iv } from './o_init.js';
import { discover_artifact } from './artifact.js';
import { not_fully_identified as not_fully_identified_iv } from './objnam.js';
import { query_objlist as query_objlist_iv } from './pickup.js';
import { little_to_big } from './mondata.js';
import { MV_KNOWS_EGG, SIGNAL_NOMENU, SIGNAL_ESCAPE, USE_INVLET,
         INVORDER_SORT, PICK_ANY, thats_enough_tries,
         MENU_TRADITIONAL as MENU_TRADITIONAL_IV, MENU_FULL as MENU_FULL_IV,
         HALLUC as HALLUC_IV, HALLUC_RES as HALLUC_RES_IV } from './const.js';

import { inv_cnt as inv_cnt_iv } from './hack.js';
import { ECMD_CANCEL as ECMD_CANCEL_IV, ECMD_FAIL as ECMD_FAIL_IV } from './const.js';
import { ECMD_TIME as ECMD_TIME_IV, ICE as ICE_IV, is_pit as is_pit_iv,
         Is_airlevel as Is_airlevel_iv,
         Is_waterlevel as Is_waterlevel_iv } from './const.js';
import { can_reach_floor as can_reach_floor_iv } from './engrave.js';
import { surface as surface_iv } from './iactions.js';
/* C ref: rm.h SURFACE_AT() */
function SURFACE_AT_iv(x, y) {
    const lev = game.level.at(x, y);
    if (lev.typ === DRAWBRIDGE_UP_IV)
        throw new Error('SURFACE_AT(): drawbridge underside (db_under_typ()) not ported yet');
    return lev.typ;
}
import { DRAWBRIDGE_UP as DRAWBRIDGE_UP_IV } from './const.js';

// C ref: hacklib.c letter()
function letter_iv(c) {
    return ('@' <= c && c <= 'Z') || ('a' <= c && c <= 'z');
}

// C ref: mkobj.c extract_nobj() -- for the hero's inventory chain
function extract_nobj_invent(obj) {
    let curr, prev;

    for (prev = null, curr = game.invent; curr; prev = curr, curr = curr.nobj) {
        if (curr === obj) {
            if (prev)
                prev.nobj = curr.nobj;
            else
                game.invent = curr.nobj;
            break;
        }
    }
    if (!curr)
        throw new Error('extract_nobj: object lost'); /* panic() */
    obj.where = 'OBJ_FREE';
    obj.nobj = null;
}

// C ref: invent.c check_invent_gold()
export function check_invent_gold(why) { /* 'why' == caller in case of warning */
    let goldstacks = 0, wrongslot = 0;

    /* there should be at most one stack of gold in invent, in slot '$' */
    for (let otmp = game.invent; otmp; otmp = otmp.nobj)
        if (otmp.oclass === O.COIN_CLASS) {
            ++goldstacks;
            if (otmp.invlet !== GOLD_SYM)
                ++wrongslot;
        }

    if (goldstacks > 1 || wrongslot > 0) {
        console.error(`impossible: ${why}: ${(wrongslot > 1) ? "gold in wrong slots"
                      : (wrongslot > 0) ? "gold in wrong slot" : ""}${
                      (wrongslot > 0 && goldstacks > 1) ? " and " : ""}${
                      (goldstacks > 1) ? "multiple gold stacks" : ""}`);
        return true; /* gold can be #adjusted */
    }

    return false; /* gold can't be #adjusted */
}

// C ref: invent.c adjust_ok()
/* normal getobj callback for item to #adjust; excludes gold */
function adjust_ok(obj) {
    if (!obj || obj.oclass === O.COIN_CLASS)
        return GETOBJ_EXCLUDE;

    return GETOBJ_SUGGEST;
}

// C ref: invent.c adjust_gold_ok()
/* getobj callback for item to #adjust if gold is wonky; allows gold */
function adjust_gold_ok(obj) {
    if (!obj)
        return GETOBJ_EXCLUDE;

    return GETOBJ_SUGGEST;
}

// C ref: invent.c doorganize()
/* #adjust command: inventory organizer by Del Lamb */
export async function doorganize() {
    /* when no invent, or just gold in '$' slot, there's nothing to adjust */
    if (!game.invent || (game.invent.oclass === O.COIN_CLASS
                         && game.invent.invlet === GOLD_SYM
                         && !game.invent.nobj)) {
        await You(`aren't carrying anything ${
                  !game.invent ? "to adjust" : "adjustable"}.`);
        return ECMD_OK;
    }

    if (!invlet_constant())
        throw new Error('doorganize(): reassign() not ported yet');

    /* filter passed to getobj() depends upon gold sanity */
    const adjust_filter = check_invent_gold("adjust") ? adjust_gold_ok
                                                      : adjust_ok;

    /* get object the user wants to organize (the 'from' slot) */
    const obj = await getobj("adjust", adjust_filter,
                             GETOBJ_PROMPT | GETOBJ_ALLOWCNT);

    return doorganize_core(obj);
}

// C ref: invent.c adjust_split()
/* alternate version of #adjust used by itemactions() for splitting */
export async function adjust_split() {
    let obj;
    let splitamount = 0;

    /* invlet should be queued so no getobj prompting is expected */
    obj = await getobj("split", adjust_ok, 0 /* GETOBJ_NOFLAGS */);
    if (!obj || obj.quan < 2 || obj.otyp === O.GOLD_PIECE)
        return ECMD_FAIL_IV; /* caller has set things up to avoid this */

    if (obj.quan === 2) {
        splitamount = 1;
    } else {
        /* get first digit; doesn't wait for <return> */
        throw new Error('adjust_split(): "Split off how many?" get_count() not ported yet');
    }
    if (splitamount < 1 || splitamount >= obj.quan) {
        const Amount = "Amount to split from current stack must be";

        if (splitamount < 1)
            await pline(`${Amount} at least 1.`);
        else
            await pline(`${Amount} less than ${obj.quan}.`);
        return ECMD_CANCEL_IV;
    }

    /* normally a split would take place in getobj() if player supplies
       a count there, so doorganize_core() figures out 'splitamount'
       from the object; it will undo the split if player cancels while
       selecting the destination slot */
    obj = splitobj(obj, splitamount);
    return doorganize_core(obj);
}

// C ref: invent.c doorganize_core()
async function doorganize_core(obj) {
    let otmp, splitting, bumped;
    let ix, trycnt;
    let let_;
    const GOLD_INDX = 0, GOLD_OFFSET = 1;
    const OVRFLW_INDX = GOLD_OFFSET + invlet_basic; /* past gold+2*26 letters */
    let lets; /* room for '$a-zA-Z#' */
    let qbuf;
    let objname, otmpname;
    let adj_type;
    let ever_mind = false;

    if (!obj)
        return ECMD_CANCEL_IV;

    /* can only be gold if check_invent_gold() found a problem:  multiple '$'
       stacks and/or gold in some other slot, otherwise (*adjust_filter)()
       won't allow gold to be picked; if player has picked any stack of gold
       as #adjust 'from' slot, we'll force the 'to' slot to be '$' below */
    const isgold = (obj.oclass === O.COIN_CLASS);

    /* figure out whether user gave a split count to getobj() */
    splitting = bumped = null;
    for (otmp = game.invent; otmp; otmp = otmp.nobj)
        if (otmp.nobj === obj) { /* knowledge of splitobj() operation */
            if (otmp.invlet === obj.invlet)
                splitting = otmp;
            break;
        }

    /* merged(); C's merged() gives the "comparing" message itself */
    const do_merged = async (r) => {
        const res = merged(r);
        if (res && r.learned)
            await pline("You learn more about your items by comparing them.");
        return res;
    };

    /* initialize the list with all lower and upper case letters */
    lets = new Array(1 + invlet_basic + 1 + 1);
    lets[GOLD_INDX] = (obj.oclass === O.COIN_CLASS) ? GOLD_SYM : ' ';
    ix = GOLD_OFFSET;
    for (let c = 97; c <= 122; c++)
        lets[ix++] = String.fromCharCode(c); /* 'a'..'z' */
    for (let c = 65; c <= 90; c++)
        lets[ix++] = String.fromCharCode(c); /* 'A'..'Z' */
    lets[OVRFLW_INDX] = ' ';
    lets[lets.length - 1] = '\0';
    /* for floating inv letters, truncate list after the first open slot */
    if (!invlet_constant() && (ix = inv_cnt_iv(false)) < invlet_basic)
        lets[ix + (splitting ? 1 : 2)] = '\0';

    /* blank out all the letters currently in use in the inventory
       except those that will be merged with the selected object */
    for (otmp = game.invent; otmp; otmp = otmp.nobj)
        if (otmp !== obj && !mergable(otmp, obj)) {
            let_ = otmp.invlet;
            if (let_ >= 'a' && let_ <= 'z')
                lets[GOLD_OFFSET + let_.charCodeAt(0) - 97] = ' ';
            else if (let_ >= 'A' && let_ <= 'Z')
                lets[GOLD_OFFSET + let_.charCodeAt(0) - 65 + 26] = ' ';
            /* overflow defaults to off, but it we find a stack using that
               slot, switch to on -- the opposite of normal invlet handling */
            else if (let_ === NOINVSYM)
                lets[OVRFLW_INDX] = NOINVSYM;
        }

    /* compact the list by removing all the blanks */
    let compacted = '';
    for (ix = 0; lets[ix] !== '\0'; ix++)
        if (lets[ix] !== ' ')
            compacted += lets[ix];
    /* and by dashing runs of letters */
    if (compacted.length > 5)
        compacted = compactify(compacted);
    lets = compacted;

    /* get 'to' slot to use as destination */
    if (!splitting)
        qbuf = "Adjust letter";
    else /* note: splitting->quan is the amount being left in original slot */
        qbuf = `Split ${obj.quan}`;
    qbuf += ` to what [${lets}]${game.invent ? " (? see used letters)" : ""}?`;
    let noadjust = false;
    for (trycnt = 1; ; ++trycnt) {
        let_ = !isgold ? await tty_yn_function(qbuf, null, '\0') /* yn_function() */
                       : GOLD_SYM;
        if (let_ === '?' || let_ === '*')
            throw new Error('doorganize_core(): display_used_invlets() not ported yet');
        if (quitchars.includes(let_)
            /* adjusting to same slot is meaningful since all
               compatible stacks get collected along the way,
               but splitting to same slot is not */
            || (splitting && let_ === obj.invlet)) {
            noadjust = true;
            break;
        } else if (let_ === GOLD_SYM && obj.oclass !== O.COIN_CLASS) {
            await pline(`Only gold coins may be moved into the '${GOLD_SYM}' slot.`);
            ever_mind = true;
            noadjust = true;
            break;
        }
        /* letter() classifies '@' as one; compactify() can put '-' in lets;
           the only thing of interest that strchr() might find is '$' or '#'
           since letter() catches everything else that we put into lets[] */
        if ((letter_iv(let_) && let_ !== '@') || (lets.includes(let_) && let_ !== '-'))
            break; /* got one */
        if (trycnt === 5) {
            noadjust = true;
            break;
        }
        await pline("Select an inventory slot letter."); /* else try again */
    }
    if (noadjust) {
        /* noadjust: */
        if (splitting)
            await do_merged({ otmp: splitting, obj });
        if (!ever_mind)
            await pline(Never_mind);
        return ECMD_OK;
    }

    const collect = (let_ === obj.invlet);
    /* change the inventory and print the resulting item */
    adj_type = collect ? "Collecting:"
               : !splitting ? "Moving:"
                 : "Splitting:";

    /*
     * don't use freeinv/addinv to avoid double-touching artifacts,
     * dousing lamps, losing luck, cursing loadstone, etc.
     */
    extract_nobj_invent(obj);

    for (otmp = game.invent; otmp; ) {
        otmpname = has_oname(otmp) ? otmp.oextra.oname : null;
        /* it's tempting to pull this outside the loop, but merged() could
           free ONAME(obj) [via obfree()] and replace it with ONAME(otmp) */
        objname = has_oname(obj) ? obj.oextra.oname : null;

        if (collect) {
            /* Collecting: #adjust an inventory stack into its same slot;
               keep it there and merge other compatible stacks into it.
               Traditional inventory behavior is to merge unnamed stacks
               with compatible named ones; we only want that if it is
               the 'from' stack (obj) with a name and candidate (otmp)
               without one, not unnamed 'from' with named candidate. */
            const r = { otmp, obj };
            if ((!otmpname || (objname && objname === otmpname))
                && await do_merged(r)) {
                /*adj_type = "Collecting:"; //already set to this*/
                obj = otmp = r.otmp;
                otmp = otmp.nobj;
                extract_nobj_invent(obj);
                continue; /* otmp has already been updated */
            }
        } else if (otmp.invlet === let_) {
            /* Merging: when from and to are compatible */
            let r = { otmp, obj };
            if ((!otmpname || (objname && objname === otmpname))
                && await do_merged(r)) {
                adj_type = "Merging:";
                obj = otmp = r.otmp;
                otmp = otmp.nobj;
                extract_nobj_invent(obj);
                break; /* otmp has been updated and we're done merging */
            }
            /* Moving or splitting: don't merge extra compatible stacks.
               Found 'otmp' in destination slot; merge if compatible,
               otherwise bump whatever is there to an open slot. */
            if (!splitting) {
                adj_type = "Swapping:";
                otmp.invlet = obj.invlet;
            } else {
                /* strip 'from' name if it has one */
                if (objname && !obj.oartifact)
                    obj.oextra.oname = ''; /* ONAME(obj) = (char *) 0 */
                if (!mergable(otmp, obj)) {
                    /* won't merge; put 'from' name back */
                    if (objname)
                        obj.oextra.oname = objname;
                } else {
                    /* will merge; discard 'from' name */
                    if (objname)
                        objname = null;
                }

                r = { otmp, obj };
                if (await do_merged(r)) {
                    adj_type = "Splitting and merging:";
                    obj = otmp = r.otmp;
                    extract_nobj_invent(obj);
                } else if (inv_cnt_iv(false) >= invlet_basic) {
                    await do_merged({ otmp: splitting, obj }); /* undo split */
                    /* "knapsack cannot accommodate any more items" */
                    await pline("Your pack is too full."); /* Your() */
                    return ECMD_OK;
                } else {
                    bumped = otmp;
                    extract_nobj_invent(bumped);
                }
            } /* moving vs splitting */
            break; /* not collecting and found 'to' slot */
        } /* collect */
        otmp = otmp.nobj;
    }

    /* inline addinv; insert loose object at beginning of inventory */
    obj.invlet = let_;
    obj.nobj = game.invent;
    obj.where = 'OBJ_INVENT';
    game.invent = obj;
    reorder_invent();
    if (bumped) {
        /* splitting the 'from' stack is causing an incompatible
           stack in the 'to' slot to be moved into an open one;
           we need to do another inline insertion to inventory */
        assigninvlet(bumped);
        bumped.nobj = game.invent;
        bumped.where = 'OBJ_INVENT';
        game.invent = bumped;
        reorder_invent();
    }

    /* messages deferred until inventory has been fully reestablished */
    await prinv(adj_type, obj, 0);
    if (bumped)
        await prinv("Moving:", bumped, 0);
    if (splitting && game.context?.objsplit) { /* clear_splitobjs() */
        game.context.objsplit.parent_oid = 0;
        game.context.objsplit.child_oid = 0;
    }
    /* update_inventory(): no perm_invent */
    return ECMD_OK;
}
