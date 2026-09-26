// pickup.js — Floor look / autopickup / manual `,` pickup.
// C ref: pickup.c — check_here(), pickup(), pickup_object(), pick_obj(),
//        describe_decor(), observe_quantum_cat, use_container, tipcontainer,
//        query_category, query_objlist, is_worn_by_type;
//        hack.c — spoteffects(), dopickup(), pickup_checks().

import { game } from './gstate.js';
import { rn2, rnd, d } from './rng.js';
import {
    objects_at, obj_extract_self, splitobj, weight, add_to_container,
    place_object, hornoplenty, unbless, mergable, delobj, set_corpsenm,
    unsplitobj, spot_time_left, nxtobj, stop_timer, set_bknown,
    g_at, add_to_minv,
} from './mkobj.js';
import {
    look_here, observe_object, dfeature_at, paint_corner_nhw_menu,
    dismiss_nhw_menu, sortloot, update_inventory, encumber_msg,
    let_to_name, DEF_INV_ORDER, prinv, near_capacity, calc_capacity,
    max_capacity, compactify_invlets, getobj_take_count, getobj_apply_count,
    getobj_from_cmdq, getobj_display_pickinv, freeinv, display_inventory,
    splittable, will_feel_cockatrice, feel_cockatrice, is_worn,
    not_fully_identified,
    taking_off, count_unpaid, tally_BUCX, getobj, Blind, hold_another_object, currency,
    makeknown, useup, useupf,
} from './invent.js';
import {
    nomul, check_special_room, set_uinwater, is_pool, is_lava, in_rooms, dosinkfall,
    SURFACE_AT, switch_terrain, maybe_half_phys, waterbody_name, losehp, carrying,
} from './hack.js';
import {
    flush_screen, pline, newsym, newsym_force, docrt, bot, flush_topl_more, canseemon,
    canspotmon, Hallucination, clear_nhwindow_message, Norep, impossible,
    sensemon, You, There, urgent_pline, pline_The, verbalize,
} from './display.js';
import { addinv } from './u_init.js';
import {
    an, doname, Doname2, makesingular, xname, cxname, cxname_singular, xprname,
    the as theArt, The, body_part_latebound,
    safe_qbuf, ansimpleoname, otense, Tobjnam,
    yname as yname_objnam, Yname2,
    thesimpleoname as thesimpleoname_objnam,
    ysimple_name as ysimple_name_objnam,
    Ysimple_name2 as Ysimple_name2_objnam,
} from './objnam.js';
import { can_reach_floor } from './engrave.js';
import {
    ECMD_OK, ECMD_TIME, ECMD_CANCEL, OBJ_FLOOR, OBJ_INVENT, OBJ_MINVENT,
    OBJ_FREE, OBJ_CONTAINED,
    is_pit, LOST_DROPPED, LOST_THROWN, LOST_STOLEN, LOST_EXPLODING,
    STONE, ICE, MAX_TYPE, STAIRS, HOLE, TRAPDOOR,
    IS_POOL, IS_LAVA, IS_FURNITURE, IS_SINK,
    IS_THRONE, IS_FOUNTAIN, IS_DOOR, IS_ALTAR, D_ISOPEN,
    LOOKHERE_PICKED_SOME, LOOKHERE_SKIP_DFEATURE, LOOKHERE_NOFLAGS,
    Has_contents, Is_container, Is_box,
    Never_mind,
    GETOBJ_EXCLUDE, GETOBJ_SUGGEST, GETOBJ_EXCLUDE_SELECTABLE,
    GETOBJ_DOWNPLAY, GETOBJ_PROMPT,
    W_ARMOR, W_ACCESSORY, W_WEAPONS,
    SORTLOOT_PACK, SORTLOOT_LOOT, SORTLOOT_INVLET, SORTLOOT_PETRIFY,
    ALL_TYPES_SELECTED, BUC_BLESSED, BUC_CURSED, BUC_UNCURSED, BUC_UNKNOWN,
    BUCX_TYPES,
    UNPAID_TYPES, WORN_TYPES, ALL_TYPES, BILLED_TYPES, CHOOSE_ALL, JUSTPICKED,
    BY_NEXTHERE, USE_INVLET, INVORDER_SORT, SIGNAL_NOMENU, SIGNAL_ESCAPE,
    AUTOSELECT_SINGLE, FEEL_COCKATRICE, INCLUDE_VENOM,
    MENU_INVERT_ALL, MENU_SELECT_ALL, MENU_UNSELECT_ALL,
    MENU_ITEMFLAGS_NONE, MENU_ITEMFLAGS_SKIPINVERT, PICK_NONE, PICK_ONE,
    PICK_ANY, PARANOID_CONFIRM, PARANOID_AUTOALL,
    MENU_TRADITIONAL, MENU_COMBINATION, MENU_FULL,
    SHOPBASE,
    SLT_ENCUMBER, MOD_ENCUMBER, HVY_ENCUMBER, EXT_ENCUMBER,
    AUTOUNLOCK_APPLY_KEY, AUTOUNLOCK_UNTRAP, AUTOUNLOCK_FORCE,
    CQ_CANNED, KILLED_BY_AN,
    nothing_seems_to_happen, nothing_happens, something, engulfing_u,
    HAND, FOOT, NO_MINVENT, MM_ADJACENTOK, MM_NOMSG, ONAME_NO_FLAGS,
    ARTICLE_A, ARTICLE_THE, RLOC_NOMSG, TIMEOUT, I_SPECIAL, FAILEDUNTRAP,
    NO_TRAP,
    MELT_ICE_AWAY, LEVITATION, WARNING, u_at, FUMBLING, PLNMSG_BACK_ON_GROUND,
    PLNMSG_OBJNAM_ONLY,
    IS_GRAVE, W_SADDLE, SUPPRESS_SADDLE, ynqchars,
    P_RIDING, P_BASIC, Is_waterlevel, Is_airlevel, Upolyd, WWALKING, FLYING, SWIMMING,
    MAGICAL_BREATHING, DISMOUNT_FELL, DISMOUNT_GENERIC,
    MAY_HIT, MAY_DESTROY, T_LOOTED, NO_MM_FLAGS,
} from './const.js';
import {
    t_at, dotrap, drown, lava_effects, instapetrify, float_down, ceiling,
    back_on_ground, uteetering_at_seen_pit, uescaped_shaft, chest_trap,
} from './trap.js';
import { carried } from './eat.js';
import { obj_is_burning } from './light.js';
import { snuff_lit } from './apply.js';
import { age_is_relative, get_obj_location } from './timeout.js';
import { livelog_printf } from './pline.js';
import { uhis } from './roles.js';
import {
    SELL_NORMAL, SELL_DELIBERATE, SELL_DONTSELL,
    ROT_CORPSE, REVIVE_MON, SHRINK_GLOB, LL_ACHIEVE,
    OMONST, has_omonst,
} from './const.js';
import { nhgetch } from './input.js';
import { m_at, mnexto, hideunder, ceiling_hider } from './mon.js';
import { oclass_to_sym, regex_match, select_menu_pick_any, select_menu_pick_one } from './options.js';
import {
    objectNames, COIN_CLASS, VENOM_CLASS, POTION_CLASS,
    def_oc_syms, def_char_to_objclass, is_pick,
} from './objects.js';
import { ATR_INVERSE } from './terminal.js';
import {
    addtobill, costly_spot, check_unpaid_usage, doname_with_price,
    remote_burglary, shop_keeper, stolen_value, obfree, sellobj, sellobj_state,
    money_cnt, pick_pick,
} from './shk.js';
import {
    nohands, nolimbs, M1_NOTAKE, touch_petrifies, poly_when_stoned, is_rider,
    mons, throws_rocks,
    monsterNames,
    is_floater, is_swimmer, is_clinger, likes_lava, amphibious, grounded, is_flyer, breathless, hides_under,
} from './monsters.js';
import { welded, weldmsg, setuwep, setuswapwep, setuqwep } from './wield.js';
import { yn_function, getlin, paranoid_ynq } from './getline.js';
import { highc, dist2 } from './hacklib.js';
import { show_nhw_menu_text } from './pager.js';
import { cansee } from './vision.js';
import { touch_artifact, youmonst } from './artifact.js';
import { exercise, A_WIS } from './attrib.js';
import { inv_cnt, remove_worn_item } from './steal.js';
import { trycall, Monnam, christen_monst, oname, rndmonnam, Amonnam, a_monnam, x_monnam, mon_nam, s_suffix, hliquid } from './do_name.js';
import { makemon, set_malign } from './makemon.js';
import { courtmon } from './mklev.js';
import { more_experienced, newexplevel } from './exper.js';
import { hard_helmet } from './do_wear.js';
import { tiphat } from './sounds.js';
import { SetVoice } from './sndprocs.js';
import { mdamageu, digests } from './mhitu.js';
import { P_SKILL } from './weapon.js';
import { rider_cant_reach, dismount_steed } from './steed.js';
import { is_waterwall } from './dbridge.js';
import { is_ice } from './zap.js';
import { incr_itimeout_HLevitation } from './potion.js';
import { which_armor, extract_from_minvent } from './worn.js';
import { unconscious } from './teleport.js';
import {
    get_adjacent_loc, pick_lock, autokey, doforce, u_have_forceable_weapon,
    boxlock,
} from './lock.js';
import { cmdq_add_ec } from './cmd.js';
import { scatter } from './explode.js';
import { doaltarobj, dropy, dropx } from './do.js';
import { surface } from './sit.js';
import { removed_from_icebox } from './muse.js';

/** C ref: mondata.h notake — M1_NOTAKE. */
function notake(ptr) {
    return !!((ptr?.mflags1 ?? 0) & M1_NOTAKE);
}

/* C ref: pickup.c static load-prefix strings for pickup_prinv / lift_object */
const slightloadpfx = 'You have a little trouble';
const moderateloadpfx = 'You have trouble';
const nearloadpfx = 'You have much trouble';
const overloadpfx = 'You have extreme difficulty';

/** C-ish simpleonames — sack family → "bag". */
function simpleonames(obj) {
    const n = objectNames[obj?.otyp];
    if (n === 'SACK' || n === 'OILSKIN_SACK' || n === 'BAG_OF_HOLDING'
        || n === 'BAG_OF_TRICKS') {
        return 'bag';
    }
    return cxname(obj);
}

const BAG_OF_HOLDING = objectNames.indexOf('BAG_OF_HOLDING');
const BAG_OF_TRICKS = objectNames.indexOf('BAG_OF_TRICKS');
const HORN_OF_PLENTY = objectNames.indexOf('HORN_OF_PLENTY');
const LARGE_BOX = objectNames.indexOf('LARGE_BOX');
const CHEST = objectNames.indexOf('CHEST');
const CORPSE = objectNames.indexOf('CORPSE');
const SCR_SCARE_MONSTER = objectNames.indexOf('SCR_SCARE_MONSTER');
const LOADSTONE = objectNames.indexOf('LOADSTONE');
const BOULDER = objectNames.indexOf('BOULDER');
const GOLD_PIECE = objectNames.indexOf('GOLD_PIECE');
const ICE_BOX = objectNames.indexOf('ICE_BOX');
const STATUE = objectNames.indexOf('STATUE');
const AMULET_OF_YENDOR = objectNames.indexOf('AMULET_OF_YENDOR');
const CANDELABRUM_OF_INVOCATION = objectNames.indexOf('CANDELABRUM_OF_INVOCATION');
const BELL_OF_OPENING = objectNames.indexOf('BELL_OF_OPENING');
const SPE_BOOK_OF_THE_DEAD = objectNames.indexOf('SPE_BOOK_OF_THE_DEAD');
const LEASH = objectNames.indexOf('LEASH');
const WAN_CANCELLATION = objectNames.indexOf('WAN_CANCELLATION');
const SPE_WIZARD_LOCK = objectNames.indexOf('SPE_WIZARD_LOCK');
const PM_ICE_TROLL = monsterNames.indexOf('PM_ICE_TROLL');
const GOLD_SYM = '$';
const PM_STONE_GOLEM = monsterNames.indexOf('PM_STONE_GOLEM');
const PM_HOUSECAT = monsterNames.indexOf('PM_HOUSECAT');
/* C hack.h invlet_basic — a-zA-Z invent slots. */
const INVLET_BASIC = 52;
/* C hack.h stoning_checks — u_safe_from_fatal_corpse tests. */
const st_gloves = 0x1;
export const st_corpse = 0x2;
export const st_petrifies = 0x4;
const st_resists = 0x8;
export const st_all = st_gloves | st_corpse | st_petrifies | st_resists;

/** C ref: objnam.c thesimpleoname — "the" + simpleonames. */
function thesimpleoname(obj) {
    return `the ${simpleonames(obj)}`;
}

/**
 * C ref: objnam.c yname + shk.c shk_your — carried → "your ", else "the ".
 * Named omissions: shk/mon ownership prefixes; artifact pname skip.
 */
function yname(obj) {
    const carried = obj?.where === OBJ_INVENT
        || (game.invent || []).includes(obj);
    return `${carried ? 'your' : 'the'} ${cxname(obj)}`;
}

/**
 * C ref: objnam.c ysimple_name — shk_your + minimal_xname.
 * Named omissions: full minimal_xname / shopkeeper ownership.
 */
function ysimple_name(obj) {
    const carried = obj?.where === OBJ_INVENT
        || (game.invent || []).includes(obj);
    return `${carried ? 'your' : 'the'} ${simpleonames(obj)}`;
}

/** C ref: objnam.c Ysimple_name2 — capitalized ysimple_name. */
function Ysimple_name2(obj) {
    return upstart(ysimple_name(obj));
}

/** C obj.h SchroedingersBox — LARGE_BOX with spe==1. */
export function SchroedingersBox(obj) {
    return !!obj && (obj.otyp | 0) === LARGE_BOX && (obj.spe | 0) === 1;
}

/**
 * C ref: zap.c get_obj_location flags=0 — invent/floor/minvent only.
 * timeout.js export is behind pickup→trap→timeout→do→pickup; local clone.
 */
function get_obj_location_quantum(obj) {
    if (!obj) return null;
    switch (obj.where | 0) {
    case OBJ_INVENT:
        return { x: game.u?.ux | 0, y: game.u?.uy | 0 };
    case OBJ_FLOOR:
        return { x: obj.ox | 0, y: obj.oy | 0 };
    case OBJ_MINVENT:
        if (obj.ocarry && (obj.ocarry.mx | 0)) {
            return { x: obj.ocarry.mx | 0, y: obj.ocarry.my | 0 };
        }
        break;
    default:
        break;
    }
    return null;
}

/** C ref: pickup.c reset_justpicked — clear pickup_prev on invent chain. */
export function reset_justpicked(olist) {
    const list = olist || game.invent || [];
    for (const otmp of list) {
        if (otmp) otmp.pickup_prev = 0;
    }
}

/** C ref: hacklib.c upstart — capitalize first letter. */
function upstart(str) {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/** C ref: pickup.c count_justpicked / find_justpicked. */
export function count_justpicked(olist) {
    let cnt = 0;
    walk_obj_list(olist, false, (otmp) => {
        if (otmp?.pickup_prev) cnt++;
    });
    return cnt;
}
export function find_justpicked(olist) {
    let found = null;
    walk_obj_list(olist, false, (otmp) => {
        if (!found && otmp?.pickup_prev) found = otmp;
    });
    return found;
}

/** C pickup.c allow_all `:516–520`. */
export function allow_all(_obj) {
    return true;
}

/* C pickup.c `:767` — gv.val_for_n_or_more feeds the n_or_more callback. */
let val_for_n_or_more = 0;

/**
 * C pickup.c n_or_more `:458–465` — query_objlist callback for "pick N of
 * something": never the punished chain; the pile quantity must cover the
 * reference value.
 */
function n_or_more(obj) {
    if (!obj || obj === game.u?.uchain) return false;
    return (obj.quan || 1) >= val_for_n_or_more;
}

/**
 * C pickup.c all_but_uchain `:507–512` — manual `,` PICK_ANY allow: every
 * floor (or engulfer-minvent) object but the punished chain.
 */
function all_but_uchain(obj) {
    return obj !== game.u?.uchain;
}

/**
 * C invent.c count_buc `:3547–3575`. Priest sets bknown (coins false).
 * Optional filterfunc matches ggetobj ofilter.
 * Coins: flags.goldX → UNKNOWN else UNCURSED.
 */
export function count_buc(olist, buc, filterfunc) {
    let cnt = 0;
    const clericPm = monsterNames.indexOf('PM_CLERIC');
    const cleric = clericPm >= 0 && game.urole?.mnum === clericPm;
    walk_obj_list(olist, false, (otmp) => {
        if (!otmp) return;
        if (cleric) otmp.bknown = otmp.oclass !== COIN_CLASS ? 1 : 0;
        if (filterfunc && !filterfunc(otmp)) return;
        if (otmp.oclass === COIN_CLASS) {
            const coinBuc = game.flags?.goldX ? BUC_UNKNOWN : BUC_UNCURSED;
            if (buc === coinBuc) cnt++;
            return;
        }
        if (!otmp.bknown) {
            if (buc === BUC_UNKNOWN) cnt++;
        } else if (buc === BUC_BLESSED && otmp.blessed) cnt++;
        else if (buc === BUC_CURSED && otmp.cursed) cnt++;
        else if (buc === BUC_UNCURSED && !otmp.blessed && !otmp.cursed) cnt++;
    });
    return cnt;
}

/** Walk invent Array or nobj/nexthere chain. */
function walk_obj_list(head, here, fn) {
    if (!head) return;
    if (Array.isArray(head)) {
        for (const o of head) if (o) fn(o);
        return;
    }
    for (let o = head; o; o = here ? o.nexthere : o.nobj) fn(o);
}

/** C pickup.c collect_obj_classes — unique def_oc_syms in list order. */
export function collect_obj_classes(objs, here, filter, itemcount) {
    let ilets = '';
    itemcount.n = 0;
    walk_obj_list(objs, here, (otmp) => {
        const c = def_oc_syms[otmp.oclass | 0]?.sym || '';
        if (c && !ilets.includes(c) && (!filter || filter(otmp))) ilets += c;
        itemcount.n += 1;
    });
    return ilets;
}

/** C pickup.c add_valid_menu_class / menu_class_present. */
export function add_valid_menu_class(c) {
    if (c === 0) {
        game.valid_menu_classes = [];
        game.class_filter = false;
        game.bucx_filter = false;
        game.shop_filter = false;
        game.picked_filter = false;
        return;
    }
    if (menu_class_present(c)) return;
    if (!game.valid_menu_classes) game.valid_menu_classes = [];
    game.valid_menu_classes.push(c);
    if (c === 'B' || c === 'U' || c === 'C' || c === 'X') {
        game.bucx_filter = true;
    } else if (c === 'P') {
        game.picked_filter = true;
    } else if (c === 'u') {
        game.shop_filter = true;
    } else {
        game.class_filter = true;
    }
}

export function menu_class_present(c) {
    return !!(c && (game.valid_menu_classes || []).includes(c));
}

/**
 * C pickup.c allow_category `:523–592`.
 * No active filter rejects, unless ParanoidAutoAll (`:526–529`).
 * Coins plus a class filter return before the priest bknown force
 * (`:535–536`). Cleric `set_bknown` (`:538–539`) then class, unpaid
 * (container contents count), BUC (`flags.goldX` on coins), and
 * just-picked. A miss on any active filter rejects; otherwise accept.
 * JS null guard: C is NONNULLARG1.
 */
export function allow_category(obj) {
    if (!obj) return false;
    /* C `:526–529` — strchr filters are empty and paranoid_confirm:A is off. */
    const paranoidAutoAll = ((game.flags?.paranoia_bits | 0) & PARANOID_AUTOALL) !== 0;
    if (!game.class_filter && !game.shop_filter && !game.bucx_filter
        && !game.picked_filter && !paranoidAutoAll) {
        return false;
    }
    const vmc = game.valid_menu_classes || [];
    /* C `:535–536` — explicit coin request, before priest bknown. */
    if (obj.oclass === COIN_CLASS && game.class_filter) {
        return vmc.includes(COIN_CLASS);
    }
    /* C `:538–539` — Role_if(PM_CLERIC) && !bknown → set_bknown(obj, 1). */
    const clericPm = monsterNames.indexOf('PM_CLERIC');
    if (clericPm >= 0 && (game.urole?.mnum | 0) === clericPm && !obj.bknown) {
        set_bknown(obj, 1);
    }
    /* C `:561–562` */
    if (game.class_filter && !vmc.includes(obj.oclass)) return false;
    /* C `:565–567` — unpaid, or a container holding any unpaid object. */
    if (game.shop_filter && !obj.unpaid
        && !(Has_contents(obj) && count_unpaid(obj.cobj) > 0)) {
        return false;
    }
    /* C `:569–587` */
    if (game.bucx_filter) {
        let bucx;
        if (obj.oclass === COIN_CLASS) {
            bucx = game.flags?.goldX ? 'X' : 'U';
        } else {
            bucx = !obj.bknown ? 'X'
                : obj.blessed ? 'B'
                    : obj.cursed ? 'C'
                        : 'U';
        }
        if (!vmc.includes(bucx)) return false;
    }
    /* C `:588–589` */
    if (game.picked_filter && !obj.pickup_prev) return false;
    /* C `:591` */
    return true;
}

/**
 * C pickup.c is_worn_by_type `:608–612`.
 * Worn/wielded and matching the current valid_menu_classes filter.
 */
export function is_worn_by_type(otmp) {
    return !!(is_worn(otmp) && allow_category(otmp));
}

/** C pickup.c flags.inv_order walk; JS invent is an Array of oclass ints. */
function inv_order_pack(qflags = 0) {
    const raw = game.flags?.inv_order;
    const pack = (Array.isArray(raw) && raw.length) ? raw : DEF_INV_ORDER;
    if ((qflags & INCLUDE_VENOM) && !pack.includes(VENOM_CLASS)) {
        return [...pack, VENOM_CLASS];
    }
    return pack;
}

/** C pickup.c FOLLOW — BY_NEXTHERE uses nexthere, else nobj / invent Array. */
function walk_query_list(olist, qflags, fn) {
    walk_obj_list(olist, (qflags & BY_NEXTHERE) !== 0, fn);
}

/**
 * C pickup.c count_categories `:1510–1536`.
 * WORN_TYPES skips objects whose owornmask is not armor/accessory/weapon.
 */
function count_categories(olist, qflags) {
    const do_worn = (qflags & WORN_TYPES) !== 0;
    const wornmask = W_ARMOR | W_ACCESSORY | W_WEAPONS;
    let ccount = 0;
    for (const pack of inv_order_pack()) {
        let counted = false;
        walk_query_list(olist, qflags, (curr) => {
            if (curr.oclass !== pack) return;
            if (do_worn && !((curr.owornmask | 0) & wornmask)) return;
            if (!counted) {
                ccount++;
                counted = true;
            }
        });
    }
    return ccount;
}

/**
 * C pickup.c query_category `:1225–1508`.
 * Branch envelope for menu_remarm: WORN_TYPES | ALL_TYPES | UNPAID_TYPES
 * | BUCX_TYPES, PICK_ANY. Single-class skip via count_categories.
 * CHOOSE_ALL rows when the flag is set (`:1316–1337`), with the
 * ParanoidAutoAll verify_All flip (`:1326`) + A_first/A_second_hint
 * once-only counters (`decl.h:167–168`, init `decl.c:193`) and the
 * post-menu paranoid_ynq confirm (`:1455–1493`) + 'A'-alone rejection
 * (`:1495–1501`). INCLUDE_VENOM via inv_order_pack; menu_head_objsym
 * live. PICK_ONE (dotypeinv D-1687) uses select_menu_pick_one.
 * Menu arch: add_menu/add_menu_str ⇒ menu_pick line objects (D-2633);
 * alloc/free pick_list ⇒ GC (no live alloc export); debugpline0 is
 * compiled out. menu_loot's MENU_FULL call (`:3286`) uses this function.
 *
 * @returns {Promise<{ a_int: number|string }[]>} empty if cancelled
 */
export async function query_category(qstr, olist, qflags, how) {
    if (!olist || (Array.isArray(olist) && !olist.length)) return [];

    let ofilter = null;
    let do_worn = false;
    if ((qflags & WORN_TYPES) !== 0) {
        do_worn = true;
        ofilter = is_worn;
    }
    const do_unpaid = ((qflags & UNPAID_TYPES) !== 0 && count_unpaid(olist));
    const do_usedup = (qflags & BILLED_TYPES) !== 0;
    let do_blessed = false;
    let do_cursed = false;
    let do_uncursed = false;
    let do_buc_unknown = false;
    let num_buc_types = 0;
    if ((qflags & BUC_BLESSED) !== 0 && count_buc(olist, BUC_BLESSED, ofilter)) {
        do_blessed = true;
        num_buc_types++;
    }
    if ((qflags & BUC_CURSED) !== 0 && count_buc(olist, BUC_CURSED, ofilter)) {
        do_cursed = true;
        num_buc_types++;
    }
    if ((qflags & BUC_UNCURSED) !== 0
        && count_buc(olist, BUC_UNCURSED, ofilter)) {
        do_uncursed = true;
        num_buc_types++;
    }
    if ((qflags & BUC_UNKNOWN) !== 0
        && count_buc(olist, BUC_UNKNOWN, ofilter)) {
        do_buc_unknown = true;
        num_buc_types++;
    }
    const num_justpicked = ((qflags & JUSTPICKED) !== 0)
        ? count_justpicked(olist) : 0;

    const packOrder = inv_order_pack(qflags);
    const ccount = count_categories(olist, qflags);
    if (ccount === 1 && !do_unpaid && !do_usedup && num_buc_types <= 1) {
        let curr = null;
        walk_query_list(olist, qflags, (otmp) => {
            if (curr) return;
            if (ofilter && !ofilter(otmp)) return;
            curr = otmp;
        });
        if (curr) return [{ a_int: curr.oclass }];
        return [];
    }

    const items = [];
    const pack = packOrder;
    const show_a = ((qflags & ALL_TYPES) !== 0 && ccount > 1);
    const skip = MENU_ITEMFLAGS_SKIPINVERT;
    const none = MENU_ITEMFLAGS_NONE;

    /* C `:1246` — verify_All inits FALSE; set in the CHOOSE_ALL arm. */
    let verify_All = false;
    if ((qflags & CHOOSE_ALL) !== 0) {
        items.push({
            selectable: true,
            selector: 'A',
            gselector: '',
            a_int: 'A',
            text: do_worn
                ? 'Auto-select every item being worn or wielded'
                : 'Auto-select every relevant item',
            itemflags: skip,
        });
        /* C `:1326–1337` — PICK_ANY + ParanoidAutoAll flips the hint:
           without it 'A' alone is rejected ("ignored unless..."); with
           it (+ show_a) 'A' alone implies 'a' ("if no other...").
           ga counters (decl.h:167–168) show each hint once; cmdassist
           forces it every time. add_menu_str ⇒ non-selectable row. */
        verify_All = how === PICK_ANY
            && (((game.flags?.paranoia_bits | 0) & PARANOID_AUTOALL) !== 0);
        if (!verify_All) {
            if (!(game.A_first_hint | 0) || game.iflags?.cmdassist !== false) {
                items.push({
                    selectable: false,
                    text: '    (ignored unless some other choices are also picked)',
                });
            }
            game.A_first_hint = (game.A_first_hint | 0) + 1;
        } else if (show_a) {
            if (!(game.A_second_hint | 0) || game.iflags?.cmdassist !== false) {
                items.push({
                    selectable: false,
                    text: "    (if no other choices are picked, 'a' is implied)",
                });
            }
            game.A_second_hint = (game.A_second_hint | 0) + 1;
        }
        items.push({ selectable: false, text: '' });
    }

    let invlet = 'a'.charCodeAt(0);
    if (show_a) {
        items.push({
            selectable: true,
            selector: String.fromCharCode(invlet++),
            gselector: '',
            a_int: ALL_TYPES_SELECTED,
            text: do_worn ? 'All worn and wielded types' : 'All types',
            itemflags: skip,
        });
    }

    for (const oc of pack) {
        let collected = false;
        walk_query_list(olist, qflags, (curr) => {
            if (curr.oclass !== oc) return;
            if (ofilter && !ofilter(curr)) return;
            if (collected) return;
            collected = true;
            if (invlet >= 'u'.charCodeAt(0)) return;
            const ocsym = def_oc_syms[oc]?.sym || '';
            items.push({
                selectable: true,
                selector: String.fromCharCode(invlet++),
                gselector: ocsym,
                a_int: oc,
                text: let_to_name(oc, false, how !== PICK_NONE
                    && !!game.iflags?.menu_head_objsym),
                itemflags: none,
            });
        });
        if (invlet >= 'u'.charCodeAt(0)) {
            await impossible('query_category: too many categories');
            return [];
        }
    }

    if (do_unpaid || do_usedup || do_blessed || do_cursed || do_uncursed
        || do_buc_unknown || num_justpicked) {
        items.push({ selectable: false, text: '' });
    }
    if (do_unpaid) {
        items.push({
            selectable: true, selector: 'u', gselector: '', a_int: 'u',
            text: 'Unpaid items', itemflags: skip,
        });
    }
    if (do_usedup) {
        items.push({
            selectable: true, selector: 'x', gselector: '', a_int: 'x',
            text: 'Unpaid items already used up', itemflags: skip,
        });
    }
    if (do_blessed) {
        items.push({
            selectable: true, selector: 'B', gselector: '', a_int: 'B',
            text: 'Items known to be Blessed', itemflags: skip,
        });
    }
    if (do_cursed) {
        items.push({
            selectable: true, selector: 'C', gselector: '', a_int: 'C',
            text: 'Items known to be Cursed', itemflags: skip,
        });
    }
    if (do_uncursed) {
        items.push({
            selectable: true, selector: 'U', gselector: '', a_int: 'U',
            text: 'Items known to be Uncursed', itemflags: skip,
        });
    }
    if (do_buc_unknown) {
        items.push({
            selectable: true, selector: 'X', gselector: '', a_int: 'X',
            text: 'Items of unknown Bless/Curse status', itemflags: skip,
        });
    }
    if (num_justpicked) {
        let tmpbuf;
        if (num_justpicked === 1) {
            let jp = null;
            walk_query_list(olist, qflags, (otmp) => {
                if (!jp && otmp?.pickup_prev) jp = otmp;
            });
            tmpbuf = `Just picked up: ${doname(jp)}`;
        } else {
            tmpbuf = 'Items you just picked up';
        }
        items.push({
            selectable: true, selector: 'P', gselector: '', a_int: 'P',
            text: tmpbuf, itemflags: skip,
        });
    }

    const raw = [
        { selectable: false, text: qstr, attr: ATR_INVERSE },
        { selectable: false, text: '' },
        ...items,
    ];
    const pickedAny = how === PICK_ONE
        ? null
        : await select_menu_pick_any(raw);
    if (how === PICK_ONE) {
        const one = await select_menu_pick_one(raw);
        if (one.kind !== 'pick' || !one.item) return [];
        if (one.item.a_int === 'A') {
            await pline('No relevant items selected.');
            return [];
        }
        return [{ a_int: one.item.a_int, count: one.item.count ?? 0 }];
    }
    const picked = pickedAny;
    if (!picked.length) return [];

    /* C `:1455–1493` — ParanoidAutoAll confirm when 'A' was picked: yes
       honors it; no drops it from the list (or converts a lone 'A' to
       'a' when ALL_TYPES is offered, so the next menu offers all);
       quit/ESC — and no-with-nothing-to-fall-back-to — cancels the
       whole pick (free ⇒ GC). Only the first 'A' is examined, like C. */
    if (verify_All) {
        const ai = picked.findIndex((it) => it.a_int === 'A');
        if (ai >= 0) {
            /* C `:1460–1465` — ParanoidConfirm wants "yes"/"no" (quit
               and ESC pass through); otherwise a plain y/n. */
            const ParanoidConfirm = (((game.flags?.paranoia_bits | 0)
                & PARANOID_CONFIRM) !== 0);
            const c = await paranoid_ynq(
                ParanoidConfirm, 'Really autoselect All?', true);
            if (c === 'y') {
                /* yes ⇒ honor Auto-select All */
            } else if (c === 'n' && picked.length > 1) {
                /* no ⇒ remove 'A' from the list */
                picked.splice(ai, 1);
            } else if (c === 'n' && (qflags & ALL_TYPES) !== 0) {
                /* lone 'A' ⇒ convert to 'a' (ALL_TYPES_SELECTED) */
                picked[0].a_int = ALL_TYPES_SELECTED;
            } else {
                /* quit | ESC ⇒ cancel, no Auto-select and no 2nd menu */
                return [];
            }
        }
    } else if (picked.length === 1 && picked[0].a_int === 'A') {
        /* C `:1495–1501` — without paranoid_confirm:A a lone 'A' is
           rejected (the menu text already warned it is ignored). */
        await pline('No relevant items selected.');
        return [];
    }
    /* C menu_item.count: 0 when no digit prefix (select_menu count named). */
    return picked.map((it) => ({ a_int: it.a_int, count: it.count ?? 0 }));
}

/**
 * C pickup.c query_objlist `:1024–1216`.
 * menu_remarm live flags: SIGNAL_NOMENU | USE_INVLET | INVORDER_SORT,
 * PICK_ANY, allow is_worn / is_worn_by_type, invent Array.
 * this_title / PICK_ONE / INCLUDE_VENOM pack (dotypeinv D-1687).
 * Named omit: INCLUDE_HERO fake-you; obj_to_glyph display RNG;
 * count-prefix. Floor pickup keeps the
 * existing query_objlist_pickup clone (D-0365/D-0405/D-1599).
 *
 * @returns {Promise<{ n: number, pick_list: { obj: object, count: number }[] }>}
 */
export async function query_objlist(qstr, olist, qflags, how, allow) {
    if (!olist || (Array.isArray(olist) && !olist.length)) {
        return { n: 0, pick_list: [] };
    }

    let n = 0;
    let last = null;
    walk_query_list(olist, qflags, (curr) => {
        if (allow(curr)) {
            last = curr;
            n++;
        }
    });

    if (n === 0) {
        return {
            n: (qflags & SIGNAL_NOMENU) ? -1 : 0,
            pick_list: [],
        };
    }

    if (n === 1 && (qflags & AUTOSELECT_SINGLE) && last) {
        return { n: 1, pick_list: [{ obj: last, count: last.quan || 1 }] };
    }

    const flags = game.flags || {};
    const sortlootOpt = flags.sortloot ?? 'l';
    let sortflags = 0;
    if (sortlootOpt === 'f'
        || (sortlootOpt === 'l' && !(qflags & USE_INVLET))) {
        sortflags |= SORTLOOT_LOOT;
    } else if (qflags & USE_INVLET) {
        sortflags |= SORTLOOT_INVLET;
    }
    if (flags.sortpack !== false) sortflags |= SORTLOOT_PACK;
    if (qflags & FEEL_COCKATRICE) sortflags |= SORTLOOT_PETRIFY;

    const byHere = (qflags & BY_NEXTHERE) !== 0;
    const ranked = sortloot(olist, sortflags, byHere, allow);
    const sorted = (qflags & INVORDER_SORT) !== 0;
    const items = [];
    let first = true;

    if (sorted) {
        for (const pack of inv_order_pack(qflags)) {
            let printed = false;
            for (const srt of ranked) {
                const curr = srt.obj;
                if (!curr || curr.oclass !== pack) continue;
                if ((qflags & FEEL_COCKATRICE) && (curr.otyp | 0) === CORPSE
                    && will_feel_cockatrice(curr, false)) {
                    await look_here(0, LOOKHERE_NOFLAGS);
                    return { n: 0, pick_list: [] };
                }
                if (!allow(curr)) continue;
                if (!printed) {
                    items.push({
                        selectable: false,
                        text: let_to_name(pack, false,
                            how !== PICK_NONE
                            && !!game.iflags?.menu_head_objsym),
                        attr: ATR_INVERSE,
                    });
                    printed = true;
                }
                let selector = '';
                if (qflags & USE_INVLET) {
                    selector = (typeof curr.invlet === 'string')
                        ? curr.invlet
                        : (curr.invlet
                            ? String.fromCharCode(curr.invlet) : '');
                } else if (first && curr.oclass === COIN_CLASS) {
                    selector = '$';
                }
                first = false;
                const ocsym = def_oc_syms[curr.oclass | 0]?.sym || '';
                items.push({
                    selectable: true,
                    selector,
                    gselector: ocsym,
                    obj: curr,
                    text: doname_with_price(curr),
                    itemflags: MENU_ITEMFLAGS_NONE,
                });
            }
        }
    } else {
        for (const srt of ranked) {
            const curr = srt.obj;
            if (!curr) continue;
            if ((qflags & FEEL_COCKATRICE) && (curr.otyp | 0) === CORPSE
                && will_feel_cockatrice(curr, false)) {
                await look_here(0, LOOKHERE_NOFLAGS);
                return { n: 0, pick_list: [] };
            }
            if (!allow(curr)) continue;
            let selector = '';
            if (qflags & USE_INVLET) {
                selector = (typeof curr.invlet === 'string')
                    ? curr.invlet
                    : (curr.invlet
                        ? String.fromCharCode(curr.invlet) : '');
            } else if (first && curr.oclass === COIN_CLASS) {
                selector = '$';
            }
            first = false;
            const ocsym = def_oc_syms[curr.oclass | 0]?.sym || '';
            items.push({
                selectable: true,
                selector,
                gselector: ocsym,
                obj: curr,
                text: doname_with_price(curr),
                itemflags: MENU_ITEMFLAGS_NONE,
            });
        }
    }

    const raw = [];
    /* C query_objlist: add_menu_str(gt.this_title) without heading attr. */
    if (game.this_title) {
        raw.push({ selectable: false, text: game.this_title });
    }
    if (qstr) {
        raw.push({ selectable: false, text: qstr, attr: ATR_INVERSE });
        raw.push({ selectable: false, text: '' });
    }
    raw.push(...items);

    const finish_picks = (pickedItems) => {
        const pick_list = [];
        for (const it of pickedItems) {
            const curr = it.obj;
            if (!curr) continue;
            let count = it.count;
            if (count == null || count === -1 || count > (curr.quan || 1)) {
                count = curr.quan || 1;
            }
            pick_list.push({ obj: curr, count });
        }
        return { n: pick_list.length, pick_list };
    };

    if (how === PICK_ONE) {
        const one = await select_menu_pick_one(raw);
        if (one.kind !== 'pick' || !one.item) {
            return {
                n: (qflags & SIGNAL_ESCAPE) ? -2 : 0,
                pick_list: [],
            };
        }
        return finish_picks([one.item]);
    }

    const picked = await select_menu_pick_any(raw);
    if (!picked.length) {
        /* C: ESC n<0 → SIGNAL_ESCAPE ? -2 : 0. Empty confirm is 0. */
        return {
            n: (qflags & SIGNAL_ESCAPE) ? -2 : 0,
            pick_list: [],
        };
    }
    return finish_picks(picked);
}

/* C invent.c tally_BUCX is canonical here (D-2388): the local clone
 * dropped C's Role_if(PM_CLERIC) bknown force (`:3593–3595`), so a
 * priest's TRADITIONAL prompt lost the B/U/C ilets and the pile kept
 * bknown clear. No local clone — import from invent.js (same SCC). */

/**
 * C ref: pickup.c force_decor — wand-of-probing / Blind-ice look_here.
 * Sets decor_fumble_override + optional levitate override, pretends the
 * previous terrain was STONE, then describe_decor. Named: ice_descr thaw
 * details behind gd.decor_levitate_override.
 */
export async function force_decor(via_probing) {
    const u = game.u;
    game.decor_fumble_override = true;
    game.decor_levitate_override = !!via_probing;
    if (!game.iflags) game.iflags = {};
    game.iflags.prev_decor = STONE;
    await describe_decor();
    game.decor_fumble_override = false;
    game.decor_levitate_override = false;
    const loc = u && game.level?.at(u.ux, u.uy);
    if (loc && game.lastseentyp?.[u.ux]) {
        game.lastseentyp[u.ux][u.uy] = loc.typ;
    }
}

/**
 * C ref: pickup.c deferred_decor — mention_decor ice/fumble sequencing.
 * setup True: remember to catch up; False: describe_decor then clear.
 */
export async function deferred_decor(setup) {
    if (!game.iflags) game.iflags = {};
    if (!game.flags?.mention_decor) {
        game.iflags.defer_decor = false;
    } else if (setup) {
        game.iflags.defer_decor = true;
    } else {
        await describe_decor();
        game.iflags.defer_decor = false;
    }
}

/**
 * C ref: pickup.c describe_decor `:350–426`.
 * Branch envelope: Fumbling TIMEOUT==1 defer; dfeature_at skip open
 * door/doorway; pool/ice from previous; furniture/typ change gate;
 * waterbody_name when "pool of water"; verbose "There is %s here.";
 * ICE+mention_decor Norep; back_on_ground after pool/lava/ice.
 * Named: ice_descr thicker/thinner ice; dfeature_at ice/pool/lava/
 * throne/drawbridge still partial (so waterhere is rare until those
 * arms land).
 */
export async function describe_decor() {
    const u = game.u;
    if (!u) return false;

    if (!game.iflags) game.iflags = {};
    const iflags = game.iflags;
    if (iflags.prev_decor == null) iflags.prev_decor = STONE;

    // C: (HFumbling & TIMEOUT) == 1L && !defer_decor && !fumble_override
    const hf = (u.HFumbling | 0) | (u.uprops?.[FUMBLING]?.intrinsic | 0);
    if ((hf & TIMEOUT) === 1 && !iflags.defer_decor
        && !game.decor_fumble_override) {
        await deferred_decor(true);
        return false;
    }

    // C: SURFACE_AT (rm.h) via db_under_typ for DRAWBRIDGE_UP (D-1103)
    const ltyp = SURFACE_AT(u.ux, u.uy);
    let dfeature = dfeature_at(u.ux, u.uy);

    // C: skip ordinary open door / doorway (broken/closed still mentioned)
    const doorhere = !!(dfeature && (dfeature === 'open door'
        || dfeature === 'doorway'));
    const waterhere = !!(dfeature && dfeature === 'pool of water');
    if (doorhere || u.Underwater
        || (ltyp === ICE && IS_POOL(iflags.prev_decor))) {
        dfeature = null;
    }

    let res = true;
    if (ltyp === iflags.prev_decor && !IS_FURNITURE(ltyp)) {
        res = false;
    } else if (dfeature) {
        if (waterhere) dfeature = waterbody_name(u.ux, u.uy);
        if (dfeature !== 'swamp' && ltyp !== ICE) {
            dfeature = an(dfeature);
        }
        let outbuf;
        if (game.flags?.verbose !== false) {
            outbuf = `There is ${dfeature} here.`;
        } else {
            outbuf = `${upstart(dfeature)}.`;
        }
        if (ltyp === ICE && game.flags?.mention_decor) {
            await Norep(outbuf);
        } else {
            await pline(outbuf);
        }
    } else if (!u.Underwater) {
        if (IS_POOL(iflags.prev_decor)
            || IS_LAVA(iflags.prev_decor)
            || iflags.prev_decor === ICE) {
            if (iflags.last_msg !== PLNMSG_BACK_ON_GROUND) {
                await back_on_ground(false);
            }
        }
    }

    // C: only persist prev_decor when mention_decor is On
    iflags.prev_decor = game.flags?.mention_decor ? ltyp : STONE;
    return res;
}

/**
 * C ref: pickup.c check_here — count floor objects and look_here / engr.
 * Named omissions: none for count (uchain skipped ≡C).
 */
export async function check_here(picked_some) {
    const u = game.u;
    if (!u) return;

    let lhflags = picked_some ? LOOKHERE_PICKED_SOME : 0;
    // C: flags.mention_decor → describe_decor; may set LOOKHERE_SKIP_DFEATURE
    if (game.flags?.mention_decor) {
        if (await describe_decor()) {
            lhflags |= LOOKHERE_SKIP_DFEATURE;
        }
    }

    let ct = 0;
    for (let obj = objects_at(u.ux, u.uy); obj; obj = obj.nexthere) {
        // C: if (obj != uchain) ct++; — attached chain is not "here" for look
        if (obj !== u.uchain) ct++;
    }

    if (ct) {
        if (game.context?.run) nomul(0);
        await flush_screen(1);
        await look_here(ct, lhflags);
    } else {
        // C: read_engr_at(u.ux, u.uy) when no floor objects
        const { read_engr_at } = await import('./engrave.js');
        await read_engr_at(u.ux, u.uy);
    }
}

/**
 * C ref: pickup.c pick_obj :1897–1942 — lift a floor/engulfer object into
 * inventory with shop billing. Whole body in C order.
 * :1900 fromfloor sampled before extract mutates where; :1901–1905 ox,oy
 * via live get_obj_location (engulfer MINVENT → carrier mx,my; migrating
 * carrier → 0,0; return ignored like C's (void) cast); :1907 robshop gate;
 * :1908–1910 extract + newsym when fromfloor; :1921–1935 shop arm (fake
 * ushops → addtobill sets unpaid → restore → recompute off restored
 * ushops); :1937 addinv; :1938–1940 remote_burglary when robbed from
 * outside the shop.
 * JS engine: u.uball is the C global uball (module precedent :3102);
 * addtobill/addinv/remote_burglary awaited (async engine, sync in C).
 */
export async function pick_obj(otmp) {
    const u = game.u;
    // C :1900 — sampled before obj_extract_self mutates where.
    const fromfloor = (otmp.where | 0) === OBJ_FLOOR;
    // C :1901–1905 — (void) get_obj_location(otmp, &ox, &oy, 0).
    const loc = get_obj_location(otmp, 0);
    const ox = loc ? loc.x | 0 : 0;
    const oy = loc ? loc.y | 0 : 0;
    // C :1907 — robshop = (!u.uswallow && otmp != uball && costly_spot(ox, oy)).
    let robshop = !u.uswallow && otmp !== u.uball && costly_spot(ox, oy);

    // C :1908–1910
    obj_extract_self(otmp);
    if (fromfloor) newsym(ox, oy);

    /* C :1912–1920 — for shop items, addinv() needs to be after
       addtobill() (so that object merger can take otmp->unpaid into
       account) but before remote_robbery() (which calls rob_shop() which
       calls setpaid() after moving costs of unpaid items to shop debt). */
    if (robshop) {
        // C :1924–1929 — addtobill cares about your location, not the
        // object's (telekinesis/grappling hook); fake ushops for the call.
        const saveushops = u.ushops || '';
        const fakeshop = (in_rooms(ox, oy, SHOPBASE) || '').charAt(0) || '';
        u.ushops = fakeshop;
        /* C :1931 — sets obj->unpaid if necessary */
        await addtobill(otmp, true, false, false);
        u.ushops = saveushops;
        // C :1934 — robshop = otmp->unpaid && !strchr(u.ushops, *fakeshop)
        // ('\0' shop char strchrs the terminator → false; '' models '\0').
        robshop = !!(otmp.unpaid && fakeshop && !saveushops.includes(fakeshop));
    }

    // C :1937
    const result = await addinv(otmp);
    /* C :1938–1940 — taking a shop item from outside the shop: shk notices. */
    if (robshop) await remote_burglary(ox, oy);

    return result;
}

/**
 * C ref: pickup.c pickup_prinv — encumbrance-prefix prinv.
 * Limits load-verb feedback to the first item that changes
 * gp.pickup_encumbrance within one pickup/loot operation.
 * Passes lifted `count` so invent.c prinv can show partial + "(N in total)".
 * lift_object yn Continue? reuses the same pfx strings (D-1050).
 */
async function pickup_prinv(obj, count, verb) {
    // C: nearload = near_capacity(); limit feedback via gp.pickup_encumbrance
    const nearload = near_capacity();
    let prefix = null;
    if (nearload !== (game.pickup_encumbrance | 0)) {
        prefix = nearload >= EXT_ENCUMBER ? overloadpfx
            : nearload >= HVY_ENCUMBER ? nearloadpfx
            : nearload >= MOD_ENCUMBER ? moderateloadpfx
            : nearload >= SLT_ENCUMBER ? slightloadpfx
            : null;
        game.pickup_encumbrance = nearload;
    }
    // C: if (prefix) Sprintf(pbuf, "%s %s", prefix, verb); else pbuf=""
    const pbuf = prefix ? `${prefix} ${verb}` : '';
    await prinv(pbuf, obj, count | 0);
}

/* C pickup.c GOLD_WT / GOLD_CAPACITY — coin weight in carry_count. */
function GOLD_WT(n) {
    return Math.trunc((Number(n) + 50) / 100);
}
function GOLD_CAPACITY(w, n) {
    return (Number(w) * -100) - (Number(n) + 50) - 1;
}

function otense_pickup(obj, verb) {
    const singular = (obj?.quan || 1) === 1;
    if (verb === 'are') return singular ? 'is' : 'are';
    if (verb === 'turn') return singular ? 'turns' : 'turn';
    return singular ? `${verb}s` : verb;
}

/**
 * C ref: options.c initoptions_init flags.pickup_burden = MOD_ENCUMBER
 * ("stressed"). JS flags may omit the numeric field.
 */
function flags_pickup_burden() {
    const v = game.flags?.pickup_burden;
    if (typeof v === 'number' && v >= 0) return v | 0;
    return MOD_ENCUMBER;
}

function Stone_resistance_hero() {
    const u = game.u || {};
    return !!(u.Stone_resistance || u.HStone_resistance || u.EStone_resistance);
}

/**
 * C ref: invent.c merge_choice — first mergable invent slot.
 * Named omit: shop no_charge / inhishop unpaid reject.
 */
export function merge_choice_invent(obj) {
    if (!obj || (obj.otyp | 0) === SCR_SCARE_MONSTER) return null;
    for (const otmp of game.invent || []) {
        if (mergable(otmp, obj)) return otmp;
    }
    return null;
}

/**
 * C ref: pickup.c u_safe_from_fatal_corpse — any listed test is enough.
 */
export function u_safe_from_fatal_corpse(obj, tests) {
    if ((tests & st_gloves) && game.u?.uarmg) return true;
    if ((tests & st_corpse) && (obj?.otyp | 0) !== CORPSE) return true;
    if ((tests & st_petrifies) && !touch_petrifies(mons(obj?.corpsenm))) {
        return true;
    }
    if ((tests & st_resists) && Stone_resistance_hero()) return true;
    return false;
}

/**
 * C ref: pickup.c fatal_corpse_mistake — telekinesis/remotely skips touch.
 */
async function fatal_corpse_mistake(obj, remotely) {
    if (u_safe_from_fatal_corpse(obj, st_all) || remotely) return false;
    if (poly_when_stoned(game.youmonst?.data, game.mvitals)) {
        const { polymon } = await import('./polyself.js');
        if (await polymon(PM_STONE_GOLEM)) {
            await flush_topl_more();
            return false;
        }
    }
    await pline(
        `Touching ${an(cxname_singular(obj))} is a fatal mistake.`,
    );
    await instapetrify(cxname_singular(obj));
    return true;
}

/**
 * C ref: pickup.c rider_corpse_revival — still revives when remotely;
 * message is "attempted acquisition" vs "touch".
 * Caller: pray.c offer_corpse (touch, remotely FALSE).
 */
export async function rider_corpse_revival(obj, remotely) {
    if (!obj || (obj.otyp | 0) !== CORPSE
        || !is_rider(mons(obj.corpsenm))) {
        return false;
    }
    await pline(
        `At your ${remotely ? 'attempted acquisition' : 'touch'}, the corpse suddenly moves...`,
    );
    const where = obj.where | 0;
    const corpsex = obj.ox | 0;
    const corpsey = obj.oy | 0;
    const cname = cxname_singular(obj);
    const { revive } = await import('./zap.js');
    const mtmp = await revive(obj, false);
    if (mtmp && where === OBJ_FLOOR
        && (cansee(corpsex, corpsey) || canseemon(mtmp))) {
        if (canseemon(mtmp)) {
            await pline(`${Monnam(mtmp)} rises from the dead!`);
        } else {
            await pline(`${The(cname)} disappears!`);
        }
    }
    exercise(A_WIS, false);
    return true;
}

/**
 * C ref: pickup.c delta_cwt `:1544–1568` (staticfn) — how much the given
 * container's carried weight drops when obj is removed from it. Non-BoH
 * containers weigh contents at face value (`:1549–1550`); a Bag of Holding
 * unlinks obj, re-weighs, and links it back (`:1560–1564`). C `panic` on a
 * missing link aborts the game — JS throws with the C message (the
 * botl.js compare_blstats convention: loud, never silent).
 */
function delta_cwt(container, obj) {
    // C `:1549–1550` — ordinary containers: face-value contents weight
    if ((container.otyp | 0) !== BAG_OF_HOLDING) return (obj.owt | 0);
    const owt = (container.owt | 0);
    let nwt = owt;
    // C `:1552–1554` — find the object so that we can remove it
    let prev = null;
    let found = false;
    for (let cur = container.cobj; cur; cur = cur.nobj) {
        if (cur === obj) { found = true; break; }
        prev = cur;
    }
    if (!found) {
        throw new Error('delta_cwt: obj not inside container?'); // C `:1557–1558`
    } else {
        // C `:1560–1563` — temporarily remove, weigh, put back
        if (prev) prev.nobj = obj.nobj;
        else container.cobj = obj.nobj;
        nwt = weight(container);
        if (prev) prev.nobj = obj;
        else container.cobj = obj; // C: obj->nobj is still valid
    }
    return owt - nwt; // C `:1565`
}

/**
 * C ref: pickup.c carry_count `:1570–1701` (staticfn) — could we carry
 * obj? if not, how many of them? Whole body in C order: provisional weigh
 * with the carried-container delta and the merged-gold correction
 * (`:1589–1601`); full-lift early return (`:1606–1607`); gold arms —
 * plain GOLD_CAPACITY vs the carried-container 100-coin re-weigh loop
 * (`:1610–1635`); stack lift loop (`:1636–1654`); single unliftable
 * (`:1655–1656`); partial `You can only…` (`:1661–1682`); zero-lift
 * `There…` (`:1685–1697`). Out-params ride the shared `wts` object
 * (`before`/`after`); JS has no `int *` out-params.
 */
async function carry_count(obj, container, count, telekinesis, wts) {
    const adjust_wt = !!(container && carried(container)); // C `:1576`
    const is_gold = obj.oclass === COIN_CLASS; // C `:1577`
    let wt, iw, ow, oow;
    let qq;
    let verb, prefx1, prefx2, suffx, obj_nambuf, where;

    const savequan = obj.quan || 1; // C `:1584`
    const saveowt = obj.owt | 0; // C `:1585`
    const umoney = money_cnt(game.invent); // C `:1586`
    iw = max_capacity(); // C `:1587`

    // C `:1589–1591`
    if (count !== savequan) {
        obj.quan = count;
        obj.owt = weight(obj);
    }
    wt = iw + (obj.owt | 0); // C `:1593`
    if (adjust_wt) wt -= delta_cwt(container, obj); // C `:1594–1595`
    /* This will go with silver+copper & new gold weight */
    if (is_gold) /* merged gold might affect cumulative weight */ // C `:1596–1598`
        wt -= (GOLD_WT(umoney) + GOLD_WT(count) - GOLD_WT(umoney + count));
    if (count !== savequan) { // C `:1599–1601`
        obj.quan = savequan;
        obj.owt = saveowt;
    }
    wts.before = iw; // C `:1603`
    wts.after = wt; // C `:1604`
    if (wt < 0) return count; // C `:1606–1607`

    /* see how many we can lift */
    if (is_gold) { // C `:1610`
        iw -= GOLD_WT(umoney) | 0; // C `:1611`
        if (!adjust_wt) {
            qq = GOLD_CAPACITY(iw, umoney); // C `:1613`
        } else {
            // C `:1615–1628` — re-weigh each 100-coin boundary
            oow = 0;
            qq = 50 - (umoney % 100) - 1; // C `:1616`
            if (qq < 0) qq += 100; // C `:1617–1618`
            for (; qq <= count; qq += 100) { // C `:1619`
                obj.quan = qq; // C `:1620`
                obj.owt = GOLD_WT(qq); // C `:1621`
                ow = GOLD_WT(umoney + qq); // C `:1622`
                ow -= delta_cwt(container, obj); // C `:1623`
                if (iw + ow >= 0) break; // C `:1624–1625`
                oow = ow; // C `:1626`
            }
            iw -= oow; // C `:1628`
            qq -= 100; // C `:1629`
        }
        if (qq < 0) qq = 0; // C `:1631–1632`
        else if (qq > count) qq = count; // C `:1633–1634`
        wt = iw + GOLD_WT(umoney + qq); // C `:1635`
    } else if (count > 1 || count < (obj.quan || 1)) { // C `:1636`
        /*
         * Ugh. Calc num to lift by changing the quan of the
         * object and calling weight.
         *
         * This works for containers only because containers
         * don't merge.  -dean
         */
        for (qq = 1; qq <= count; qq++) { // C `:1644`
            obj.quan = qq; // C `:1645`
            obj.owt = ow = weight(obj); // C `:1646`
            if (adjust_wt) ow -= delta_cwt(container, obj); // C `:1647–1648`
            if (iw + ow >= 0) break; // C `:1649–1650`
            wt = iw + ow; // C `:1651`
        }
        --qq; // C `:1653`
    } else {
        /* there's only one, and we can't lift it */
        qq = 0; // C `:1656`
    }
    obj.quan = savequan; // C `:1658`
    obj.owt = saveowt; // C `:1659`

    if (qq < count) { // C `:1661`
        /* some message will be given */
        obj_nambuf = doname(obj); // C `:1663`
        if (container) { // C `:1664–1666`
            where = `in ${theArt(xname(container))}`;
            verb = 'carry';
        } else {
            where = 'lying here'; // C `:1668`
            verb = telekinesis ? 'acquire' : 'lift'; // C `:1669`
        }
    } else {
        /* lint suppression */
        obj_nambuf = where = ''; // C `:1672`
        verb = ''; // C `:1674`
    }
    /* we can carry qq of them */
    if (qq > 0) { // C `:1677`
        if (qq < count) // C `:1678`
            await You('can only %s %s of the %s %s.', verb, // C `:1679–1680`
                (qq === 1) ? 'one' : 'some', obj_nambuf, where);
        wts.after = wt; // C `:1681`
        return qq;
    }

    if (!container) where = 'here'; /* slightly shorter form */ // C `:1685–1686`
    if (game.invent || umoney) { // C `:1687`
        prefx1 = 'you cannot '; // C `:1688`
        prefx2 = ''; // C `:1689`
        suffx = ' any more'; // C `:1690`
    } else {
        prefx1 = ((obj.quan || 1) === 1) ? 'it ' : 'even one '; // C `:1692`
        prefx2 = 'is too heavy for you to '; // C `:1693`
        suffx = ''; // C `:1694`
    }
    await There('%s %s %s, but %s%s%s%s.', otense(obj, 'are'), obj_nambuf, // C `:1696–1697`
        where, prefx1, prefx2, verb, suffx);

    /* *wt_after = iw; */
    return 0; // C `:1700`
}

/**
 * C ref: pickup.c lift_object `:1705–1795` — able and willing to carry obj.
 * Branch envelope (C order): Sokoban boulder refuse; LOADSTONE /
 * giant-boulder weight override (lift regardless while a slot is free);
 * carry_count; 52-slot refuse with gold exception; encumbrance rise →
 * telekinesis silent refuse else ynq Continue? (`lifting`/`removing`);
 * scare-scroll spe clear on floor refuse.
 * Sokoban boulder uses body_part(HAND) (latebound; polyself→do→pickup cycle).
 * Named omit: shop no_charge merge_choice (merge_choice_invent doc).
 * carry_count + delta_cwt whole body live (D-2617).
 * Callers: pickup_object `:1869` (container NULL); out_container `:2748`.
 */
async function lift_object(obj, container, cntRef, telekinesis) {
    let result;
    // C `:1714–1718`: #define Sokoban svl.level.flags.sokoban_rules.
    const Sokoban = !!(game.level?.flags?.sokoban_rules || game.Sokoban);
    if ((obj.otyp | 0) === BOULDER && Sokoban) {
        await pline(
            `You cannot get your ${body_part_latebound(HAND)} around this ${xname(obj)}.`,
        );
        return -1;
    }
    // C `:1719–1737`: override weight consideration for loadstone picked up
    // by anybody and for boulder picked up by a hero poly'd into a giant;
    // override slot availability iff not already carrying one.
    if ((obj.otyp | 0) === LOADSTONE
        || ((obj.otyp | 0) === BOULDER && throws_rocks(game.youmonst?.data))) {
        if (inv_cnt(false) < INVLET_BASIC || !carrying(obj.otyp | 0)
            || merge_choice_invent(obj)) {
            return 1; // C `:1726` — lift regardless of current situation
        }
        await pline(
            `You are carrying too much stuff to pick up ${(obj.quan || 1) === 1 ? 'another' : 'more'} ${xname(obj)}.`,
        );
        return -1;
    }
    // C `:1736–1737` — container rides through for the delta_cwt arms
    cntRef.count = await carry_count(obj, container, cntRef.count, telekinesis, cntRef);
    if (cntRef.count < 1) {
        result = -1; // C `:1741–1742` — nothing lifted (falls to scare arm)
    } else if (obj.oclass !== COIN_CLASS
               && inv_cnt(false) >= INVLET_BASIC
               && !merge_choice_invent(obj)) {
        // C `:1743–1756`: gold here varies the message; caller and
        // grandcaller can't skip-then-gold, so refuse with a hint instead.
        const exceptGold = nxtobj(obj, GOLD_PIECE, (obj.where | 0) === OBJ_FLOOR)
            ? ' (except gold)'
            : '';
        await pline(`Your knapsack cannot accommodate any more items${exceptGold}.`);
        result = -1; // C `:1755` — nothing lifted
    } else {
        result = 1;
        // C `:1757–1760`
        let prev_encumbr = near_capacity();
        const burden = flags_pickup_burden();
        if (prev_encumbr < burden) prev_encumbr = burden;
        const next_encumbr = calc_capacity(cntRef.after - cntRef.before);
        if (next_encumbr > prev_encumbr) {
            if (telekinesis) {
                result = 0; // C `:1762–1763` — don't lift
            } else {
                // C `:1765–1786`: Sprintf prefix then safe_qbuf(qbuf, qbuf,
                // ".  Continue?", doname, ansimpleoname, something).
                const pfx = next_encumbr >= EXT_ENCUMBER ? overloadpfx
                    : next_encumbr >= HVY_ENCUMBER ? nearloadpfx
                        : next_encumbr >= MOD_ENCUMBER ? moderateloadpfx
                            : slightloadpfx;
                const savequan = obj.quan;
                obj.quan = cntRef.count;
                let qbuf = `${pfx} ${!container ? 'lifting' : 'removing'} `;
                qbuf = safe_qbuf(qbuf, qbuf, '.  Continue?', obj, doname,
                    ansimpleoname, something);
                obj.quan = savequan;
                // C `:1775–1783` ynq: 'q' quit, 'n' don't lift, 'y' lifts.
                const ans = await yn_function(qbuf, 'ynq', 'q');
                if (ans === 'q') result = -1;
                else if (ans === 'n') result = 0;
                clear_nhwindow_message(); // C `:1784` WIN_MESSAGE
            }
        }
    }
    // C `:1791–1792`
    if ((obj.otyp | 0) === SCR_SCARE_MONSTER && result <= 0 && !container) {
        obj.spe = 0;
    }
    return result;
}

/**
 * C ref: pickup.c pickup_object — lift one floor/minvent object into invent.
 * Branch envelope: observe_object; telekinesis through corpse/scare/
 * lift_object (D-1050); gold disp.botl; splitobj; pick_obj + prinv.
 * Named omissions: LOADSTONE no-split already honored; ghostly
 * fix_ghostly_obj; LOADSTONE/giant-boulder weight override (live in
 * lift_object); carry_count + delta_cwt whole body live (D-2617);
 * Death/Pestilence revive suffixes.
 */
export async function pickup_object(obj, count, telekinesis) {
    if (!obj) return 0;
    const remotely = !!telekinesis;

    if ((obj.quan || 1) < count) return 0;
    // JS callers pass 0 for "all"; C menu/autopick fill quan
    // (pickup.c query_objlist: -1 / oversize → curr->quan).
    if (!count) count = obj.quan || 1;

    if (!game.u?.Blind) observe_object(obj);

    if (obj === game.u?.uchain) return 0;
    if ((obj.where | 0) === OBJ_MINVENT && (obj.owornmask | 0)
        && engulfing_u(obj.ocarry)) {
        await pline(`You can't pick ${ysimple_name(obj)} up.`);
        return 0;
    }
    if (obj.oartifact && !(await touch_artifact(obj, youmonst))) return 0;

    if ((obj.otyp | 0) === CORPSE) {
        if (await fatal_corpse_mistake(obj, remotely)
            || await rider_corpse_revival(obj, remotely)) {
            return -1;
        }
    } else if ((obj.otyp | 0) === SCR_SCARE_MONSTER) {
        const scareWts = { before: 0, after: 0 };
        // C scare carry_count always FALSE even on telekinesis pickup.
        // C `:1839–1841` — NULL container; count already quan-filled above.
        count = await carry_count(obj, null, count, false, scareWts);
        if (count < 1) return -1;
        if (count > 0 && count < (obj.quan || 1)) obj = splitobj(obj, count);
        if (obj.blessed) {
            unbless(obj);
        } else if (!(obj.spe | 0) && !obj.cursed) {
            obj.spe = 1;
        } else {
            const q = obj.quan || 1;
            await pline(
                `The scroll${q === 1 ? '' : 's'} ${otense_pickup(obj, 'turn')} to dust as you ${remotely ? 'raise' : 'pick'} ${q === 1 ? 'it' : 'them'} up.`,
            );
            await trycall(obj);
            delobj(obj);
            return 1;
        }
    }

    // C `:1869` lift_object(obj, NULL, &count, telekinesis).
    const lifted = { count, before: 0, after: 0 };
    const res = await lift_object(obj, null, lifted, remotely);
    if (res <= 0) return res;
    count = lifted.count;

    if (obj.oclass === COIN_CLASS) {
        if (!game.flags) game.flags = {};
        game.flags.botl = true;
        if (game.disp) game.disp.botl = true;
    }
    if ((obj.quan || 1) !== count && (obj.otyp | 0) !== LOADSTONE) {
        obj = splitobj(obj, count);
    }

    obj = await pick_obj(obj);
    if (game.u?.uwep && game.u.uwep === obj) game.mrg_to_wielded = true;
    await pickup_prinv(obj, count, 'lifting');
    game.mrg_to_wielded = false;
    return 1;
}

/**
 * C ref: pickup.c query_objlist + select_menu(PICK_ANY) — floor pickup menu.
 * Letter toggles selection; Return/Enter confirms; ESC cancels.
 * `@` MENU_INVERT_ALL / `.` SELECT_ALL / `-` UNSELECT_ALL (tty wintty).
 * INVORDER_SORT (sortpack): pack-order class headings via let_to_name;
 * menu letters assigned in that display order (no USE_INVLET on floor).
 * Sort: sortloot(SORTLOOT_LOOT|PACK + PETRIFY on PICK_ANY only) + nexthere
 * (D-0405, D-1599).
 * FEEL_COCKATRICE (PICK_ANY only per pickup.c:774-776; count-N PICK_ONE
 * at :761-772 omits it): will_feel during walk → look_here(0) abort.
 * PICK_ONE (count-N "Pick %d of what?"): AUTOSELECT_SINGLE still applies
 * (C `:761` sets it before the count branch); a menu letter returns the
 * single pick at once (tty PICK_ONE ends on first selection), prompt is
 * the title. count fix-up (C `:1189–1190`) and the force-to-N correction
 * (C `:772`) live with the caller.
 * Named omissions: INCLUDE_VENOM;
 * loot_classify subclass/disco/BUCX; SKIPINVERT;
 * page invert/search; doloot Blind !uarmg feel before containers.
 * Floor TRADITIONAL query_classes is D-1620 (`pickup_traditional_floor`).
 *
 * @param {object[]} objList pile in chain order (head first)
 * @param {((o: object) => boolean)|null} [extraAllow] C allow_category
 *        for traditional 'm' via_menu==-3; omit/null is C allow_all;
 *        manual `,` passes C all_but_uchain / count-N n_or_more
 * @param {{ how?: number, prompt?: string, autoselect?: boolean }|null} [opts]
 *        how C PICK_ANY/PICK_ONE; autoselect is C AUTOSELECT_SINGLE
 */
async function query_objlist_pickup(objList, extraAllow = null, opts = null) {
    const how = opts?.how ?? PICK_ANY;
    const prompt = opts?.prompt ?? 'Pick up what?';
    const autoselect = !!opts?.autoselect;
    const flags = game.flags || {};
    const doSort = flags.sortpack !== false;
    // C: sortflags — sortloot 'l'/'f' + !USE_INVLET → SORTLOOT_LOOT;
    // sortpack → SORTLOOT_PACK; FEEL_COCKATRICE → SORTLOOT_PETRIFY.
    // C query_objlist gates PETRIFY on qflags & FEEL_COCKATRICE, and C
    // pickup.c:774-776 sets FEEL_COCKATRICE only on the PICK_ANY arm
    // (the count-N PICK_ONE arm at :761-772 omits it) → gate on PICK_ANY.
    // Floor pile is a nexthere chain.
    const sortlootOpt = flags.sortloot ?? 'l';
    let sortflags = (how === PICK_ANY) ? SORTLOOT_PETRIFY : 0;
    if (sortlootOpt === 'l' || sortlootOpt === 'f') sortflags |= SORTLOOT_LOOT;
    if (doSort) sortflags |= SORTLOOT_PACK;

    const allowSet = new Set(objList);
    const allow = (o) => allowSet.has(o) && (!extraAllow || extraAllow(o));
    /* C query_objlist `:1051–1077` — count allowed before any menu; n == 0
     * shows no menu (floor never sets SIGNAL_NOMENU); AUTOSELECT_SINGLE
     * with one allowed item picks it unseen (petrify check is menu-build
     * only, like C). sortloot takes the pile Array so floor (nexthere)
     * and engulfer-minvent (nobj) piles both resolve. */
    let n = 0;
    let last = null;
    for (const o of objList) {
        if (o && allow(o)) {
            last = o;
            n++;
        }
    }
    if (n === 0) return [];
    if (n === 1 && autoselect && last) return [last];
    const ranked = sortloot(objList, sortflags, true, allow);

    const items = [];
    let nextLet = 'a'.charCodeAt(0);
    let first = true;
    for (const { obj } of ranked) {
        // C query_objlist `:1111–1116` — FEEL_COCKATRICE CORPSE will_feel
        // destroys the menu and reverts to look_here(0, LOOKHERE_NOFLAGS).
        // Gated on qflags & FEEL_COCKATRICE, which C pickup.c:774-776 sets
        // only on the PICK_ANY arm (count-N PICK_ONE at :761-772 omits it).
        if (how === PICK_ANY && (obj.otyp | 0) === CORPSE && will_feel_cockatrice(obj, false)) {
            await look_here(0, LOOKHERE_NOFLAGS);
            return [];
        }
        if (!allow(obj)) continue;
        let letch;
        // C: !USE_INVLET → '$' only when the first menu item is a coin
        if (first && obj.oclass === COIN_CLASS) {
            letch = '$';
        } else {
            letch = String.fromCharCode(nextLet++);
            if (nextLet > 'z'.charCodeAt(0)) nextLet = 'A'.charCodeAt(0);
        }
        first = false;
        items.push({ obj, letch, selected: false, oclass: obj.oclass });
    }

    for (;;) {
        const entries = [
            { text: prompt, attr: ATR_INVERSE },
            { text: '', attr: 0 },
        ];
        if (doSort) {
            let lastClass = null;
            for (const it of items) {
                if (it.oclass !== lastClass) {
                    entries.push({
                        text: let_to_name(it.oclass, false,
                            how !== PICK_NONE
                            && !!game.iflags?.menu_head_objsym),
                        attr: ATR_INVERSE,
                    });
                    lastClass = it.oclass;
                }
                const mark = it.selected ? '+' : '-';
                entries.push({
                    text: `${it.letch} ${mark} ${doname(it.obj)}`,
                    attr: 0,
                });
            }
        } else {
            for (const it of items) {
                const mark = it.selected ? '+' : '-';
                entries.push({
                    text: `${it.letch} ${mark} ${doname(it.obj)}`,
                    attr: 0,
                });
            }
        }
        await paint_corner_nhw_menu(entries, '(end) ');
        await flush_screen(1);
        const key = await nhgetch();
        game._menu_overlay = false;
        await docrt();
        await flush_screen(1);

        if (key === 27) return [];
        if (key === 13 || key === 10 || key === 32) {
            return items.filter((it) => it.selected).map((it) => it.obj);
        }
        const ch = String.fromCharCode(key);
        const hit = items.find((it) => it.letch === ch);
        /* C select_menu PICK_ONE ends on the first selection; group
         * invert/select keys are PICK_ANY-only. */
        if (how === PICK_ONE) {
            if (hit) return [hit.obj];
            if (key === 27) return [];
            // Return with no letter, or any other key → re-prompt
            continue;
        }
        // C: wintty.c MENU_INVERT_ALL / SELECT_ALL / UNSELECT_ALL
        if (ch === MENU_INVERT_ALL) {
            for (const it of items) it.selected = !it.selected;
            continue;
        }
        if (ch === MENU_SELECT_ALL) {
            for (const it of items) it.selected = true;
            continue;
        }
        if (ch === MENU_UNSELECT_ALL) {
            for (const it of items) it.selected = false;
            continue;
        }
        if (hit) hit.selected = !hit.selected;
        // invalid → re-prompt
    }
}

/**
 * C ref: pickup.c check_autopickup_exceptions `:912–927` — first apelist
 * entry whose regex matches makesingular(doname(obj)) wins (its grab
 * overrides the pickup_types verdict); empty list ⇒ null.
 * JS apelist entries are `{ regex, pattern, grab }` (newest first).
 * Producers: add_autopickup_exception (doset and AUTOPICKUP_EXCEPTION).
 */
export function check_autopickup_exceptions(obj) {
    const apelist = game.apelist ?? [];
    if (!apelist.length) return null;
    const objdesc = makesingular(doname(obj));
    for (const ape of apelist) {
        if (ape && regex_match(objdesc, ape.regex)) return ape;
    }
    return null;
}

/* C ref: pickup.c autopick_testobj — `static boolean costly`, recomputed
 * once per autopickup operation (first item with calc_costly TRUE;
 * hack.c cannot_push also passes TRUE for its single test). */
let autopick_costly = false;

/**
 * C ref: pickup.c autopick_testobj `:929–965`, extern (hack.c cannot_push
 * calls it with TRUE). C order: costly shop reject → thrown/stolen
 * override → dropped/exploding reject → pickup_types → exceptions.
 * C compares the raw oclass against flags.pickup_types, which options.c
 * stores as (char) class indices; JS stores the display-symbol string
 * (options.js/invent.js convention), so the types test maps through
 * oclass_to_sym — same verdict. C defaults (optlist.h): pickup_thrown,
 * pickup_stolen, dropped_nopick all On.
 */
export function autopick_testobj(otmp, calc_costly) {
    const flags = game.flags || {};
    /* calculate 'costly' just once for a given autopickup operation */
    if (calc_costly) {
        autopick_costly = ((otmp?.where | 0) === OBJ_FLOOR
            && costly_spot(otmp.ox | 0, otmp.oy | 0));
    }

    /* first check: reject if an unpaid item in a shop */
    if (autopick_costly && !otmp?.no_charge) return false;

    /* pickup_thrown/pickup_stolen override pickup_types and exceptions */
    const howLost = (otmp?.how_lost | 0);
    if (((flags.pickup_thrown !== false) && howLost === LOST_THROWN)
        || ((flags.pickup_stolen !== false) && howLost === LOST_STOLEN)) {
        return true;
    }
    if ((flags.nopick_dropped !== false) && howLost === LOST_DROPPED) {
        return false;
    }
    if (howLost === LOST_EXPLODING) return false;

    /* check for pickup_types */
    const otypes = String(flags.pickup_types || '');
    const sym = oclass_to_sym(otmp?.oclass);
    let pickit = !otypes || !!(sym && otypes.includes(sym));

    /* check for autopickup exceptions */
    const ape = check_autopickup_exceptions(otmp);
    if (ape) pickit = !!ape.grab;

    return pickit;
}

/**
 * C ref: pickup.c autopick `:974–1003` — count eligible items (first item
 * tested with check_costly TRUE), then fill pick_list with {item,
 * count = quan}. followNobj selects the engulfer-minvent linkage (C
 * traverse_how 0 ⇒ nobj); floor piles pass FALSE (BY_NEXTHERE).
 */
function autopick(olist, followNobj) {
    const next = (o) => (followNobj ? o.nobj : o.nexthere);
    /* first count the number of eligible items */
    let n = 0;
    let check_costly = true;
    for (let curr = olist; curr; curr = next(curr)) {
        if (autopick_testobj(curr, check_costly)) ++n;
        check_costly = false; /* only need to check once per autopickup */
    }

    const pick_list = [];
    if (n) {
        for (let curr = olist; curr; curr = next(curr)) {
            if (autopick_testobj(curr, false)) {
                pick_list.push({ item: curr, count: curr.quan || 1 });
            }
        }
    }
    return { n, pick_list };
}

/**
 * C ref: pickup.c pickup(what) `:672–910`.
 * Ported envelope: fainted/sleeping autopickup arrival skips everything
 * (prev_decor); autopickup && (nopick / !OBJ_AT / pool / lava) →
 * describe_decor + read_engr_at; **can_reach_floor(pit)** describe_decor
 * even when !mention_decor + read_engr on multi/!pickup/teetering;
 * **multi/!pickup/notake** share one
 * gate (C pickup.c) so notake still plines under autopickup when
 * `flags.pickup` is off (D-0928 #1127); `autopick()` (costly once-per-op,
 * thrown/stolen override, dropped/exploding reject, pickup_types,
 * exceptions; D-0368) then the menu_pickup loop with count = quan;
 * floor pile vs engulfer minvent via C FOLLOW (BY_NEXTHERE vs nobj);
 * manual `,` AUTOSELECT_SINGLE / multi query_objlist PICK_ANY with
 * all_but_uchain (D-0365); count-N "Pick %d of what?" PICK_ONE with
 * n_or_more + force-to-N (val_for_n_or_more);
 * shared tail hides_under → hideunder, n_picked → newsym_force,
 * autopickup → check_here(n_picked>0) (D-0387).
 * MENU_TRADITIONAL && !menu_requested && ct>=2: There + query_classes
 * then yn/pickup_object (D-1620). 'm' → query_objlist_pickup.
 * Deferred: none in this body — safe_qbuf truncation shipped D-1654.
 */
export async function pickup(what) {
    const autopickup = what > 0;
    const count = what < 0 ? -what : 0;
    const u = game.u;
    if (!u) return 0;

    /* C pickup.c:684-688 — arrived here while fainted or sleeping (random
     * teleport or levitation timeout): skip check_here and read_engr_at
     * in addition to bypassing autopickup itself. */
    if (autopickup && (game.multi | 0) < 0 && unconscious()) {
        if (!game.iflags) game.iflags = {};
        game.iflags.prev_decor = STONE;
        return 0;
    }

    // C: gp.pickup_encumbrance = 0 — used by pickup_object for load feedback
    game.pickup_encumbrance = 0;

    // C pickup.c:698–719 — floor arms only when !uswallow
    if (!u.uswallow) {
        // C: autopickup && (nopick || !OBJ_AT || pool || lava)
        if (autopickup) {
            /* C pickup.c:700-706 — dbridge.c predicates (live is_pool /
             * is_lava, D-1077/D-1090), not the IS_POOL/IS_LAVA macro range:
             * MOAT/WATER/is_moat count as pool, DRAWBRIDGE_UP only over
             * moat (pool) or lava. */
            const poolish = is_pool(u.ux, u.uy) && !u.Underwater;
            const lavaish = is_lava(u.ux, u.uy);
            if (game.context?.nopick || !objects_at(u.ux, u.uy)
                || poolish || lavaish) {
                if (game.flags?.mention_decor) await describe_decor();
                const { read_engr_at } = await import('./engrave.js');
                await read_engr_at(u.ux, u.uy);
                return 0;
            }
        }

        // C: can_reach_floor(t && is_pit(t->ttyp)); describe_decor even
        // when !mention_decor; read_engr if multi/!pickup/teetering/shaft
        const t = t_at(u.ux, u.uy);
        if (!can_reach_floor(!!(t && is_pit(t.ttyp)))) {
            await describe_decor();
            if (((game.multi | 0) && !game.context?.run)
                || (autopickup && !game.flags?.pickup)
                || (t && (uteetering_at_seen_pit(t) || uescaped_shaft(t)))) {
                const { read_engr_at } = await import('./engrave.js');
                await read_engr_at(u.ux, u.uy);
            }
            return 0;
        }
    }

    // C ref: pickup.c pickup — multi/!pickup/notake share one gate so
    // notake still plines under autopickup when flags.pickup is off
    // (poly brown mold onto loot; D-0928 #1127).
    if (!u.uswallow) {
        const youdata = game.youmonst?.data;
        const nt = notake(youdata);
        if (((game.multi | 0) && !game.context?.run)
            || (autopickup && !game.flags?.pickup)
            || nt) {
            if (objects_at(u.ux, u.uy)
                && game.context?.run && game.context.run !== 8
                && !game.context?.nopick) {
                nomul(0);
            }
            await check_here(false);
            if (nt && objects_at(u.ux, u.uy)
                && (autopickup || game.flags?.pickup)) {
                await pline(
                    'You are physically incapable of picking anything up.',
                );
            }
            return 0;
        }
    }

    // C: OBJ_AT && run && run != 8 && !nopick → nomul(0) before pick
    if (!u.uswallow && objects_at(u.ux, u.uy)
        && game.context?.run && game.context.run !== 8
        && !game.context?.nopick) {
        nomul(0);
    }

    // C pickup.c:740 add_valid_menu_class(0) before menu vs traditional.
    add_valid_menu_class(0);
    /* C: n_tried counts attempts (menu items), n_picked accumulates
     * pickup_object results; every arm falls through to the shared tail. */
    let n_tried = 0;
    let n_picked = 0;
    try {
        /* C pickup.c:741-747 — floor pile via nexthere (BY_NEXTHERE) or
         * engulfer minvent via nobj (traverse_how 0, C FOLLOW). Manual `,`
         * while swallowed never reaches here (dopickup → loot_mon), but
         * autopickup pickup(1) can arrive swallowed. */
        const followNobj = !!u.uswallow;
        const next = (o) => (followNobj ? o.nobj : o.nexthere);
        const chainHead = followNobj
            ? (u.ustuck?.minvent ?? null)
            : objects_at(u.ux, u.uy);
        const objList = [];
        for (let obj = chainHead; obj; obj = next(obj)) objList.push(obj);
        const ct = objList.length;

        if (autopickup) {
            /* C pickup.c:750-755 + menu_pickup :779-791 — autopick fills
             * pick_list with count = quan; the loop breaks on res < 0. */
            const ap = autopick(objList[0] || null, followNobj);
            if (ap.n > 0) reset_justpicked(game.invent);
            n_tried = ap.n;
            for (const pi of ap.pick_list) {
                const res = await pickup_object(pi.item, pi.count, false);
                if (res < 0) break;
                n_picked += res;
            }
        } else {
            // C: flags.menu_style != MENU_TRADITIONAL || iflags.menu_requested
            const style = game.flags?.menu_style ?? MENU_FULL;
            if (style === MENU_TRADITIONAL && !game.iflags?.menu_requested) {
                const tr = await pickup_traditional_floor(
                    objList[0] || null, count, followNobj);
                n_tried = tr.tried;
                n_picked = tr.picked;
            } else if (count > 0) {
                /* C pickup.c:761-772 — "Pick N of what?" PICK_ONE with
                 * n_or_more (AUTOSELECT_SINGLE still applies, so one
                 * qualifying pile picks unseen); every pick_list count is
                 * forced to N for the menu_pickup loop. A short pile
                 * (quan < N filtered) picks nothing at all. */
                val_for_n_or_more = count;
                let one = [];
                try {
                    one = await query_objlist_pickup(objList, n_or_more, {
                        how: PICK_ONE,
                        prompt: `Pick ${count} of what?`,
                        autoselect: true,
                    });
                } finally {
                    val_for_n_or_more = 0;
                }
                if (one.length) {
                    reset_justpicked(game.invent);
                    n_tried = one.length;
                    const res = await pickup_object(one[0], count, false);
                    if (res >= 0) n_picked += res;
                }
            } else if (ct >= 1) {
                /* C pickup.c:761 + 774-776 — query_objlist PICK_ANY with
                 * all_but_uchain; AUTOSELECT_SINGLE picks a lone allowed
                 * pile (or the iron ball beside its chain) unseen, and a
                 * uchain-only pile selects nothing (n == 0, no menu, no
                 * reset). Then the menu_pickup loop, n_tried = selected. */
                const pickList = await query_objlist_pickup(
                    objList, all_but_uchain, { autoselect: true });
                if (pickList.length) {
                    reset_justpicked(game.invent);
                    n_tried = pickList.length;
                    for (const obj of pickList) {
                        if (!obj) continue;
                        if (followNobj
                            ? obj.where !== OBJ_MINVENT
                            : obj.where !== OBJ_FLOOR) continue;
                        const res = await pickup_object(obj, 0, false);
                        if (res < 0) break;
                        n_picked += res;
                    }
                }
            }
        }
    } finally {
        /* C pickup.c:893-903 — hideunder / newsym_force for every path,
         * check_here only after autopickup; then the pickupdone reset. */
        if (!u.uswallow) {
            if (hides_under(game.youmonst?.data)) {
                hideunder(game.youmonst);
            }
            if (n_picked) newsym_force(u.ux, u.uy);
            if (autopickup) await check_here(n_picked > 0);
        }
        // C pickupdone: gp.pickup_encumbrance = 0; add_valid_menu_class(0)
        game.pickup_encumbrance = 0;
        add_valid_menu_class(0);
    }
    return n_tried > 0 ? 1 : 0;
}

/**
 * C ref: hack.c pickup_checks `:3788–3872` — preflight for #pickup / `,`.
 * 1 = cannot pickup, time taken; 0 = cannot, no time; -1 = normal pickup;
 * -2 = loot the engulfer.
 * Named: dungeon.c `surface` (reach-fail default "floor"; HOLE/TRAPDOOR
 * override live).
 */
async function pickup_checks() {
    const u = game.u;
    if (!u) return 0;

    /* C `:3792–3813` uswallow: empty minvent tongue/feel, else loot_mon. */
    if (u.uswallow) {
        const stuck = u.ustuck;
        if (!stuck?.minvent) {
            if (digests(stuck?.data)) {
                await pline(
                    `You pick up ${s_suffix(mon_nam(stuck))} tongue.`,
                );
                await pline("But it's kind of slimy, so you drop it.");
            } else {
                await pline(
                    `You don't ${Blind() ? 'feel' : 'see'} anything in here to pick up.`,
                );
            }
            return 1;
        }
        return -2;
    }

    const youdata = game.youmonst?.data;
    const propW = u.uprops?.[WWALKING];
    const wwalking = !!(((propW?.intrinsic | 0) || (propW?.extrinsic | 0)
        || (u.HWwalking | 0) || (u.EWwalking | 0)) && !Is_waterlevel(u.uz));
    const propF = u.uprops?.[FLYING];
    const blockedF = (u.BFlying | 0) || (propF?.blocked | 0);
    const flying = !!(((u.HFlying | 0) || (u.EFlying | 0)
        || (propF?.intrinsic | 0) || (propF?.extrinsic | 0)
        || (u.usteed && is_flyer(u.usteed.data))) && !blockedF);
    const propB = u.uprops?.[MAGICAL_BREATHING];
    const heroBreathless = !!((propB?.intrinsic | 0) || (propB?.extrinsic | 0)
        || (u.HMagical_breathing | 0) || (u.EMagical_breathing | 0)
        || breathless(youdata));
    /* C: Wwalking || is_floater || is_clinger || (Flying && !Breathless) */
    const reachAbove = wwalking || is_floater(youdata)
        || is_clinger(youdata) || (flying && !heroBreathless);
    const underwater = !!(u.uinwater);

    if (is_pool(u.ux, u.uy)) {
        if (reachAbove) {
            await pline(
                `You cannot dive into the ${hliquid('water')} to pick things up.`,
            );
            return 0;
        } else if (!underwater) {
            await pline(
                `You can't even see the bottom, let alone pick up ${something}.`,
            );
            return 0;
        }
    }
    if (is_lava(u.ux, u.uy)) {
        if (reachAbove) {
            await pline("You can't reach the bottom to pick things up.");
            return 0;
        } else if (!likes_lava(youdata)) {
            await pline('You would burn to a crisp trying to pick things up.');
            return 0;
        }
    }
    if (!objects_at(u.ux, u.uy)) {
        const lev = game.level?.at(u.ux, u.uy);
        const typ = lev?.typ | 0;
        if (IS_THRONE(typ)) {
            await pline(`It must weigh${lev?.looted ? ' almost' : ''} a ton!`);
        } else if (IS_SINK(typ)) {
            await pline('The plumbing connects it to the floor.');
        } else if (IS_GRAVE(typ)) {
            await pline("You don't need a gravestone.  Yet.");
        } else if (IS_FOUNTAIN(typ)) {
            await pline(`You could drink the ${hliquid('water')}...`);
        } else if (IS_DOOR(typ) && ((lev?.doormask | 0) & D_ISOPEN)) {
            await pline("It won't come off the hinges.");
        } else if (IS_ALTAR(typ)) {
            await pline('Moving the altar would be a very bad idea.');
        } else if (typ === STAIRS) {
            await pline('The stairs are solidly affixed.');
        } else {
            await pline('There is nothing here to pick up.');
        }
        return 0;
    }
    const traphere = t_at(u.ux, u.uy);
    if (!can_reach_floor(!!(traphere && is_pit(traphere.ttyp)))) {
        if (traphere && uteetering_at_seen_pit(traphere)) {
            await pline('You cannot reach the bottom of the pit.');
        } else if (u.usteed && P_SKILL(P_RIDING) < P_BASIC) {
            await rider_cant_reach();
        } else if (Blind()) {
            await pline('You cannot reach anything here.');
        } else {
            let surf = 'floor';
            if (traphere) {
                if ((traphere.ttyp | 0) === HOLE) surf = 'edge of the hole';
                else if ((traphere.ttyp | 0) === TRAPDOOR) surf = 'trap door';
            }
            await pline(`You cannot reach the ${surf}.`);
        }
        return 0;
    }
    return -1;
}

/**
 * C ref: hack.c dopickup `:3876–3892` — `#pickup` / `,`.
 * Clears multi; pickup_checks then loot_mon (-2) or pickup(-count).
 */
export async function dopickup() {
    const count = (game.context?.command_count | 0);
    if (game.context) game.context.command_count = 0;
    game.multi = 0;

    const ret = await pickup_checks();
    if (ret >= 0) {
        return ret ? ECMD_TIME : ECMD_OK;
    } else if (ret === -2) {
        const tmpcount = { value: -count };
        const timepassed = await loot_mon(game.u?.ustuck, tmpcount, null);
        return timepassed ? ECMD_TIME : ECMD_OK;
    }
    const tried = await pickup(-count);
    return tried ? ECMD_TIME : ECMD_OK;
}

/**
 * C ref: hack.c pooleffects `:3233–3309` (newspot TRUE from spoteffects).
 * Leave-water arms (air-bubble pop / lava-leave / back_on_ground; waterlevel /
 * Levitation / Flying / Wwalking pop-out; set_uinwater(0) + docrt /
 * vision_full_recalc when surfacing) then enter pool/lava (floating-steed
 * safe; dismount_steed FELL-vs-GENERIC + air/water-level early FALSE +
 * check_special_room(newspot) TRUE; ceiling-hider stay-out; lava_effects /
 * Wwalking-waterwall-gated drown with the Swimming/Amphibious/Breathless
 * stay-wet gate).
 * C dbridge.c is_pool_or_lava `:76–83` ≡ is_pool||is_lava (inline here; no
 * 4th clone — dig/eat/trap hold the other three); ceiling_hider is the
 * canonical mondata.h macro export from mon.js; C Underwater ≡ u.uinwater.
 * @returns {Promise<boolean>} true → skip rest of spoteffects
 */
export async function pooleffects(newspot) {
    const u = game.u;
    if (!u) return false;

    /* C youprop.h Wwalking `:260` ≡ (HWwalking||EWwalking) &&
       !Is_waterlevel (same-file pickup_checks idiom + uprops flats). */
    const propW = u.uprops?.[WWALKING];
    const wwalking = !!(((propW?.intrinsic | 0) || (propW?.extrinsic | 0)
        || (u.HWwalking | 0) || (u.EWwalking | 0)) && !Is_waterlevel(u.uz));
    const youdata = game.youmonst?.data;
    /* C youprop.h Swimming `:266` (H||E||swimmer steed); Amphibious `:272`
       and Breathless `:276` (H||E Magical_breathing || data fn). */
    const propS = u.uprops?.[SWIMMING];
    const swimming = !!((propS?.intrinsic | 0) || (propS?.extrinsic | 0)
        || (u.HSwimming | 0) || (u.ESwimming | 0)
        || (u.usteed && is_swimmer(u.usteed.data)));
    const propB = u.uprops?.[MAGICAL_BREATHING];
    const heroAmphibious = !!((propB?.intrinsic | 0) || (propB?.extrinsic | 0)
        || (u.HMagical_breathing | 0) || (u.EMagical_breathing | 0)
        || amphibious(youdata));
    const heroBreathless = !!((propB?.intrinsic | 0) || (propB?.extrinsic | 0)
        || (u.HMagical_breathing | 0) || (u.EMagical_breathing | 0)
        || breathless(youdata));

    /* C `:3236–3265` — leaving water. */
    if (u.uinwater) {
        let stillInwater = false; /* C: still_inwater */
        if (!is_pool(u.ux, u.uy)) {
            if (Is_waterlevel(u.uz)) {
                await pline('You pop into an air bubble.');
                if (!game.iflags) game.iflags = {};
                game.iflags.last_msg = PLNMSG_BACK_ON_GROUND;
            } else if (is_lava(u.ux, u.uy)) {
                await pline(`You leave the ${hliquid('water')}...`);
            } else {
                await back_on_ground(false);
            }
        } else if (Is_waterlevel(u.uz)) {
            stillInwater = true;
        } else if (u.Levitation) {
            await pline(`You pop out of the ${hliquid('water')} like a cork!`);
        } else if (u.Flying) {
            await pline(`You fly out of the ${hliquid('water')}.`);
        } else if (wwalking) {
            await pline('You slowly rise above the surface.');
        } else {
            stillInwater = true;
        }
        if (!stillInwater) {
            /* C: was_underwater ≡ Underwater(u.uinwater) && !Is_waterlevel */
            const wasUnderwater = !!u.uinwater && !Is_waterlevel(u.uz);
            await set_uinwater(0); /* u.uinwater = 0; leave the water */
            if (wasUnderwater) { /* restore vision */
                await docrt();
                game.vision_full_recalc = 1;
            }
        }
    }

    /* C `:3267–3307` — entering water or lava. */
    if (!u.ustuck && !u.Levitation && !u.Flying
        && (is_pool(u.ux, u.uy) || is_lava(u.ux, u.uy))) {
        if (u.usteed && !grounded(u.usteed.data)) {
            /* floating or clinging steed keeps hero safe */
            return false;
        } else if (u.usteed) {
            /* steed enters pool */
            await dismount_steed(
                u.uinwater ? DISMOUNT_FELL : DISMOUNT_GENERIC,
            ); /* C: Underwater ≡ u.uinwater */
            /* dismount_steed() -> float_down() did spoteffects trap+pickup
               work already (float_down skips autopickup on Air/Water) */
            if (Is_airlevel(u.uz) || Is_waterlevel(u.uz)) return false;
            if (newspot) await check_special_room(false); /* spoteffects */
            return true;
        }
        /* not mounted */

        /* hiding on ceiling: don't automatically enter pool */
        if (Upolyd(u) && ceiling_hider(mons(u.umonnum)) && u.uundetected) {
            return false;
        }

        /* drown()/lava_effects() TRUE when hero relocates surviving */
        if (is_lava(u.ux, u.uy)) {
            if (await lava_effects()) return true;
        } else if ((!wwalking || is_waterwall(u.ux, u.uy))
            && (newspot || !u.uinwater
                || !(swimming || heroAmphibious || heroBreathless))) {
            if (await drown()) return true;
        }
    }
    return false;
}

/* C hack.c spoteffects statics — recursion / fire-trap melt / trap morph. */
let inspoteffects = 0;
let spotloc = { x: 0, y: 0 };
let spotterrain = 0;
let spottrap = null;
let spottraptyp = NO_TRAP;

/** C hack.c spoteffects icewarnings — Warning + melting ice. */
const icewarnings = [
    'The ice seems very soft and slushy.',
    'You feel the ice shift beneath you!',
    'The ice, is gonna BREAK!',
];

/**
 * C ref: hack.c spoteffects(pick) `:3311–3462` (D-1799).
 * Recursion / in_lava_effects guards; dest-typ switch_terrain (D-1268);
 * pooleffects; check_special_room; IS_SINK+Levitation dosinkfall
 * (D-0976); levitation-timeout rn2(2) adjust; when
 * !in_steed_dismounting — non-pit pickup then dotrap then pit pickup
 * (D-0220/D-0239) behind spottrap typ guard; Warning ice; hidden
 * monster / piercer surprise then mnexto.
 * Named: pooleffects leave-water / Wwalking / steed / ceiling_hider;
 * dotrap plunge/conj_pit/adj_pit (D-1188); digactualhole PIT/HOLE
 * D-1269; maketrap PIT/HOLE set_levltyp D-1280; iflags.failing_untrap
 * writer (trap.c move_into_trap); helm_simple_name clones in
 * dothrow/mhitu/trap/uhitm (inlined hard_helmet ? helm : hat here);
 * ceiling in_rooms vault/temple/shop. set_uinwater is D-1267.
 */
export async function spoteffects(pick) {
    const u = game.u;
    if (!u) return;

    let trap = t_at(u.ux, u.uy);
    const trapflag = game.iflags?.failing_untrap ? FAILEDUNTRAP : 0;
    const dest = game.level?.at(u.ux | 0, u.uy | 0);
    const destTyp = dest?.typ | 0;

    /* C `:3324–3332` — skip re-entry at the same spot unless terrain
     * or trap type transformed (ice→water, landmine→pit). */
    if (inspoteffects && u_at(spotloc.x, spotloc.y)
        && spotterrain === destTyp
        && (!spottrap || !trap || trap.ttyp === spottraptyp)) {
        return;
    }
    /* C `:3336–3338` — lava_effects defers until back on solid. */
    if (game.iflags?.in_lava_effects) return;

    inspoteffects++;
    spotterrain = destTyp;
    spotloc.x = u.ux | 0;
    spotloc.y = u.uy | 0;

    try {
        /* C `:3342–3347` — moving onto different terrain may toggle
         * Lev/Fly. Level change sets <ux0,uy0> to <ux,uy> so dest==origin
         * then, but also sets iflags.terrain_typ = MAX_TYPE. */
        const orig = game.level?.at(u.ux0 | 0, u.uy0 | 0);
        if (destTyp !== (orig?.typ | 0)
            || (game.iflags?.terrain_typ | 0) === MAX_TYPE) {
            await switch_terrain();
        }

        if (await pooleffects(true)) return;

        await check_special_room(false);

        const sinkTyp = game.level?.at(u.ux | 0, u.uy | 0)?.typ;
        if (IS_SINK(sinkTyp) && Levitation_pe()) {
            await dosinkfall();
            if (game.program_state?.gameover) return;
        }

        /* C `:3356–3402` — pickup/dotrap skipped while dismounting;
         * Warning ice and monster surprise still run. */
        if (!game.in_steed_dismounting) {
            const hlev = (u.HLevitation | 0)
                | (u.uprops?.[LEVITATION]?.intrinsic | 0);
            const elev = (u.ELevitation | 0)
                | (u.uprops?.[LEVITATION]?.extrinsic | 0);
            if (trap && (hlev & TIMEOUT) === 1
                && !(elev || (hlev & ~(I_SPECIAL | TIMEOUT)))) {
                if (rn2(2)) {
                    incr_itimeout_HLevitation(1);
                } else if (await float_down(I_SPECIAL | TIMEOUT, 0)) {
                    trap = null;
                    pick = false;
                }
            }
            const pit = !!(trap && is_pit(trap.ttyp));
            if (pick && !pit) await pickup(1);
            if (trap) {
                if (!spottrap || spottraptyp !== trap.ttyp) {
                    spottrap = trap;
                    spottraptyp = trap.ttyp;
                    await dotrap(trap, trapflag);
                    spottrap = null;
                    spottraptyp = NO_TRAP;
                }
            }
            if (pick && pit) await pickup(1);
        }

        const warn = u.uprops?.[WARNING];
        const hasWarning = !!((u.HWarning | 0) || (u.EWarning | 0)
            || u.Warning
            || (warn?.intrinsic | 0) || (warn?.extrinsic | 0));
        if (hasWarning && is_ice(u.ux, u.uy)) {
            const time_left = spot_time_left(u.ux, u.uy, MELT_ICE_AWAY) | 0;
            if (time_left && time_left < 15) {
                const idx = (time_left < 5) ? 2 : (time_left < 10) ? 1 : 0;
                await pline(icewarnings[idx]);
            }
        }

        const mtmp = m_at(u.ux, u.uy);
        if (mtmp && !u.uswallow) {
            mtmp.mundetected = 0;
            mtmp.msleeping = 0;
            switch (mtmp.data?.mlet) {
            case 'S_PIERCER':
                await pline(
                    `${Amonnam(mtmp)} suddenly drops from the ${ceiling(u.ux, u.uy)}!`,
                );
                if (mtmp.mtame) {
                    /* jumps to greet you, not attack */
                } else if (hard_helmet(u.uarmh)) {
                    /* C helm_simple_name ≡ !hard_helmet ? "hat" : "helm" */
                    await pline(
                        `Its blow glances off your ${hard_helmet(u.uarmh) ? 'helm' : 'hat'}.`,
                    );
                } else if (((u.uac | 0) + 3) <= rnd(20)) {
                    await pline(`You are almost hit by ${x_monnam(mtmp, ARTICLE_A, 'falling', 0, true)}!`);
                } else {
                    await pline(`You are hit by ${x_monnam(mtmp, ARTICLE_A, 'falling', 0, true)}!`);
                    let dmg = d(4, 6);
                    dmg = maybe_half_phys(dmg);
                    await mdamageu(mtmp, dmg);
                }
                break;
            default:
                if (mtmp.mtame) {
                    await pline(
                        `${Amonnam(mtmp)} jumps near you from the ${ceiling(u.ux, u.uy)}.`,
                    );
                } else if (mtmp.mpeaceful) {
                    const whom = Blind() && !sensemon(mtmp)
                        ? something : a_monnam(mtmp);
                    await pline(`You surprise ${whom}!`);
                    mtmp.mpeaceful = 0;
                } else {
                    await pline(`${Amonnam(mtmp)} attacks you by surprise!`);
                }
                break;
            }
            await mnexto(mtmp, RLOC_NOMSG);
        }
    } finally {
        if (!--inspoteffects) {
            spotterrain = STONE;
            spotloc.x = 0;
            spotloc.y = 0;
        }
    }
}

/** C youprop.h Levitation — (H||E) && !B. */
function Levitation_pe() {
    const u = game.u || {};
    if (u.Levitation) return true;
    return !!(((u.HLevitation | 0) || (u.ELevitation | 0))
        && !(u.BLevitation | 0));
}

/**
 * C ref: end.c container_contents — NHW_MENU "Contents of %s:" + doname lines
 * via invent.c sortloot(SORTLOOT_LOOT|SORTLOOT_PACK). display_nhwindow(TRUE).
 * Named omissions: identified discover path; unpaid doname (D-0461);
 * nested containers / empty pline beyond reportempty=false;
 * sortloot subclass/disco/BUCX. Disclose live-cat line is end.c.
 */
async function container_contents(box) {
    if (!box) return;
    box.cknown = 1;
    const lines = [`Contents of ${theArt(xname(box))}:`, ''];
    if (box.cobj) {
        if (SchroedingersBox(box)) {
            // C end.c: spe still 1 → live cat; pretend the corpse is not there
            lines.push("  Schroedinger's cat!");
        } else {
            // C: flags.sortloot 'l'/'f' → SORTLOOT_LOOT; sortpack → SORTLOOT_PACK
            const flags = game.flags || {};
            const sortlootOpt = flags.sortloot ?? 'l';
            let sortflags = 0;
            if (sortlootOpt === 'l' || sortlootOpt === 'f') sortflags |= SORTLOOT_LOOT;
            if (flags.sortpack !== false) sortflags |= SORTLOOT_PACK;
            const sorted = sortloot(box.cobj, sortflags, false);
            for (const srtc of sorted) {
                lines.push(`  ${doname(srtc.obj)}`);
            }
        }
    }
    await show_nhw_menu_text(lines);
}

/**
 * C ref: pickup.c explain_container_prompt — NHW_TEXT help for ':'/'o'/'i'/
 * 'b'/'r'/'s'/'n'/'q'/'?'. Skip the Next row unless more_containers.
 * @param {boolean} more_containers
 */
async function explain_container_prompt(more_containers) {
    const explaintext = [
        'Container actions:',
        '',
        ' : -- Look: examine contents',
        ' o -- Out: take things out',
        ' i -- In: put things in',
        ' b -- Both: first take things out, then put things in',
        ' r -- Reversed: put things in, then take things out',
        ' s -- Stash: put one item in',
        '',
        ' n -- Next: loot next selected container',
        ' q -- Quit: finished',
        ' ? -- Help: display this text.',
        '',
    ];
    const lines = [];
    for (const txt of explaintext) {
        if (!more_containers && txt.startsWith(' n ')) continue;
        lines.push(txt);
    }
    await show_nhw_menu_text(lines);
}

/**
 * C ref: pickup.c use_container TRADITIONAL/COMBINATION yn_function.
 * Listed vs extra (after ESC) responses match C pbuf/xbuf. '?' is shown
 * when iflags.cmdassist (default On), else hidden extra. addcmdq TRUE.
 * @returns {Promise<string>}
 */
async function use_container_traditional_prompt(
    qbuf, outmaybe, inokay, more_containers,
) {
    let pbuf = ':';
    let xbuf = '';
    const add = (ok, chars) => {
        if (ok) pbuf += chars;
        else xbuf += chars;
    };
    add(outmaybe, 'o');
    add(inokay, 'i');
    add(outmaybe, 'b');
    add(inokay, 'rs');
    pbuf += ' ';
    add(more_containers, 'n');
    pbuf += 'q';
    const cmdassist = game.iflags?.cmdassist !== false;
    if (cmdassist) pbuf += ' or ?';
    else xbuf += '?';
    if (xbuf) pbuf += `\x1b${xbuf}`;
    return yn_function(qbuf, pbuf, more_containers ? 'n' : 'q');
}

/**
 * C ref: pickup.c out_container `:2727–2777` — remove one object from
 * current_container into invent. C order: container gate (+impossible);
 * gold weigh; artifact touch; fatal corpse; lift_object `:2748`; split
 * (never LOADSTONE); extract + re-weigh; icebox rot resume; shop bill;
 * pick_pick; addinv + prinv "removing"; gold bot.
 * Callee pick_pick ported js/shk.js (C shk.c `:919–947`).
 * @returns {number} -1 stop, 1 removed, lift res (0) otherwise
 */
async function out_container(obj) {
    const is_gold = obj.oclass === COIN_CLASS;
    // C `:2732–2737` — no current container; gold weighed up front.
    if (!game._current_container) {
        await impossible('<out> no gc.current_container?');
        return -1;
    } else if (is_gold) {
        obj.owt = weight(obj);
    }
    const container = game._current_container;

    // C `:2739–2740` — artifact willing check.
    if (obj.oartifact && !(await touch_artifact(obj, youmonst))) return 0;

    // C `:2742–2743` — deadly-corpse touch check.
    if (await fatal_corpse_mistake(obj, false)) return -1;

    // C `:2745–2749` lift_object(obj, current_container, &count, FALSE);
    // split unless the lifted count covers the stack (never for LOADSTONE).
    // C: count before addinv merge (gold may grow; prinv total_of needs it)
    const lifted = { count: obj.quan || 1, before: 0, after: 0 };
    const res = await lift_object(obj, container, lifted, false);
    if (res <= 0) return res;
    const count = lifted.count;
    if ((obj.quan || 1) !== count && (obj.otyp | 0) !== LOADSTONE) {
        obj = splitobj(obj, count);
    }

    /* Remove the object from the list. */
    obj_extract_self(obj);
    container.owt = weight(container);

    // C `:2758` — Icebox is pickup.c `:64` (container otyp == ICE_BOX).
    if ((container.otyp | 0) === ICE_BOX) removed_from_icebox(obj);

    // C `:2761–2766` — unpaid goods lifted from a shop floor container bill.
    if (!obj.unpaid && !carried(container)
        && costly_spot(container.ox | 0, container.oy | 0)) {
        obj.ox = container.ox | 0;
        obj.oy = container.oy | 0;
        await addtobill(obj, false, false, false);
    }

    // C `:2767–2768` — shopkeeper feedback for picks.
    if (is_pick(obj)) await pick_pick(obj);

    const otmp = await addinv(obj);
    // C: pickup_prinv(otmp, count, "removing")
    await pickup_prinv(otmp, count, 'removing');
    if (is_gold) {
        // C: bot() — update gold piece count immediately (before later More)
        await bot();
    }
    return 1;
}

/**
 * C ref: pickup.c in_or_out_menu `:3397–3477` — NHW_MENU PICK_ONE.
 * Branch envelope: look/take-out/put-in/both/reversed/stash/done;
 * flags.lootabc → display a/b/c/d/e else o/i/b/r/s; returns :oibrsnq.
 * 'r'/'d' → lootchars 'r'; use_container loot_in_first (D-1567).
 * more_containers: 'n' loot-next row + MENU_ITEMFLAGS_SELECTED default
 * (Space/Return); 'q' is default when this is the last/only container.
 * ESC → 'q' (C n<0). Named omissions: n==0 toggle-off default quirk;
 * n>1 pick_list[1] (letter-immediate already returns the typed char).
 */
async function in_or_out_menu(
    prompt, obj, outokay, inokay, alreadyused, more_containers,
) {
    // C: lootchars[] = "_:oibrsnq", abc_chars[] = "_:abcdenq"
    // menuselector = flags.lootabc ? abc_chars : lootchars
    const lootabc = !!(game.flags && game.flags.lootabc);
    const accel = lootabc
        ? {
            look: ':', out: 'a', in: 'b', both: 'c', rev: 'd', stash: 'e',
            next: 'n', quit: 'q',
        }
        : {
            look: ':', out: 'o', in: 'i', both: 'b', rev: 'r', stash: 's',
            next: 'n', quit: 'q',
        };
    // C maps menu index → :oibrsnq regardless of displayed selectors.
    const ret = {
        look: ':', out: 'o', in: 'i', both: 'b', rev: 'r', stash: 's',
        next: 'n', quit: 'q',
    };

    // C tty_end_menu: prompt uses tty_menu_promptstyle (= menu_headings,
    // default ATR_INVERSE); blank separator; then add_menu items.
    const entries = [{ text: prompt, attr: ATR_INVERSE }, { text: '', attr: 0 }];
    // C pickup.c:3420 — "Look inside %s" via thesimpleoname, which is
    // discovery-aware (known sack → "the sack", never the local "bag").
    const simple = thesimpleoname_objnam(obj);
    entries.push({
        text: `${accel.look} - Look inside ${simple}`,
        attr: 0, sel: accel.look, ret: ret.look,
    });
    if (outokay) {
        entries.push({
            text: `${accel.out} - take something out`,
            attr: 0, sel: accel.out, ret: ret.out,
        });
    }
    if (inokay) {
        entries.push({
            text: `${accel.in} - put something in`,
            attr: 0, sel: accel.in, ret: ret.in,
        });
    }
    if (outokay) {
        entries.push({
            text: inokay
                ? `${accel.both} - both; take out, then put in`
                : `${accel.both} - take out, then put in`,
            attr: 0, sel: accel.both, ret: ret.both,
        });
    }
    if (inokay) {
        entries.push({
            text: outokay
                ? `${accel.rev} - both reversed; put in, then take out`
                : `${accel.rev} - put in, then take out`,
            attr: 0, sel: accel.rev, ret: ret.rev,
        });
        entries.push({
            text: `${accel.stash} - stash one item into ${simple}`,
            attr: 0, sel: accel.stash, ret: ret.stash,
        });
    }
    entries.push({ text: '', attr: 0 });
    // C: MENU_ITEMFLAGS_SELECTED on default → process_menu_window paints
    // '*' at the '-' slot (wintty.c n==2 && selected). more_containers
    // selects 'n'; otherwise 'q'.
    if (more_containers) {
        entries.push({
            text: `${accel.next} * loot next container`,
            attr: 0, sel: accel.next, ret: ret.next,
        });
    }
    entries.push({
        text: `${accel.quit} ${more_containers ? '-' : '*'} ${alreadyused ? 'done' : 'do nothing'}`,
        attr: 0, sel: accel.quit, ret: ret.quit,
    });

    const bySel = new Map();
    for (const e of entries) {
        if (e.sel) bySel.set(e.sel, e.ret || e.sel);
    }

    for (;;) {
        await paint_corner_nhw_menu(
            entries.map((e) => ({ text: e.text, attr: e.attr || 0 })),
            '(end) ',
        );
        await flush_screen(1);
        const key = await nhgetch();
        game._menu_overlay = false;
        await docrt();
        await flush_screen(1);

        if (key === 27) return 'q';
        // C select_menu PICK_ONE: Space/Return accepts the preselected default.
        if (key === 13 || key === 10 || key === 32) {
            return more_containers ? 'n' : 'q';
        }
        const ch = String.fromCharCode(key);
        if (bySel.has(ch)) return bySel.get(ch);
    }
}

/**
 * Invent is already an array. A container's `cobj` is an nobj chain.
 * JS `BUC_BLESSED` is 1, the same bit as `BY_NEXTHERE`, so a chain passed
 * to query_category with `BUCX_TYPES` is walked by nexthere and only the
 * head is visible. Snapshot nobj order into an array first.
 * @param {boolean} put_in
 * @returns {object[]}
 */
function loot_menu_olist(put_in) {
    if (put_in) return game.invent || [];
    const out = [];
    for (let o = game._current_container?.cobj || null; o; o = o.nobj) {
        out.push(o);
    }
    return out;
}

/**
 * C pickup.c menu_loot `:3264–3394`.
 * Non-zero retry skips query_category (`:3279`; all_categories iff -2).
 * MENU_FULL classifies 'A' (autopick), put-in 'P', ALL_TYPES, or
 * add_valid_menu_class. autopick (`:3333–3340`) calls allow_category.
 * One just-picked stack splits then in_container (`:3342–3351`).
 * Else query_objlist (`:3360–3365`) with allow_all or allow_category.
 * @param {number} retry
 * @param {boolean} put_in
 * @returns {Promise<number>}
 */
async function menu_loot(retry, put_in) {
    let n_looted = 0;
    let all_categories = true;
    let loot_everything = false;
    let autopick = false;
    let loot_justpicked = false;
    const action = put_in ? 'Put in' : 'Take out';
    let count = 0;

    /* C `:3276` — out_container load verbosity; no harm before in_container. */
    game.pickup_encumbrance = 0;

    if (retry) {
        all_categories = (retry === -2);
    } else if ((game.flags?.menu_style ?? MENU_FULL) === MENU_FULL) {
        all_categories = false;
        const buf = `${action} what type of objects?`;
        const mflags = (ALL_TYPES | UNPAID_TYPES | BUCX_TYPES | CHOOSE_ALL
            | JUSTPICKED);
        const olist = loot_menu_olist(put_in);
        const pickList = await query_category(buf, olist, mflags, PICK_ANY);
        /* C `:3293–3294` — no non-autopick category filters. */
        if (!pickList.length) return ECMD_OK;
        for (const pick of pickList) {
            if (pick.a_int === 'A') {
                loot_everything = true;
                autopick = true;
            } else if (put_in && pick.a_int === 'P') {
                loot_justpicked = true;
                count = Math.max(0, pick.count | 0);
                add_valid_menu_class(pick.a_int);
                loot_everything = false;
            } else if (pick.a_int === ALL_TYPES_SELECTED) {
                all_categories = true;
            } else {
                add_valid_menu_class(pick.a_int);
                loot_everything = false;
            }
        }
    }

    if (autopick) {
        const cont = game._current_container;
        if (!put_in) {
            if (cont) cont.cknown = 1;
            let otmp = cont?.cobj || null;
            while (otmp && game._current_container) {
                const otmp2 = otmp.nobj;
                /* C `:3335` */
                if (loot_everything || all_categories || allow_category(otmp)) {
                    const res = await out_container(otmp);
                    if (res < 0) break;
                    n_looted += res;
                }
                otmp = otmp2;
            }
        } else {
            /* Pack order is the invent array (reorder does not rebuild nobj).
               Snapshot so an extract still reaches later objects. */
            const pending = (game.invent || []).slice();
            for (const otmp of pending) {
                if (!otmp || !game._current_container) break;
                if (loot_everything || all_categories || allow_category(otmp)) {
                    const res = await in_container(otmp);
                    if (res < 0) break;
                    n_looted += res;
                }
            }
        }
    } else if (put_in && loot_justpicked
        && count_justpicked(game.invent) === 1) {
        let otmp = find_justpicked(game.invent);
        if (otmp) {
            n_looted = 1;
            if (count > 0 && count < (otmp.quan || 1)) {
                const piece = splitobj(otmp, count);
                if (piece) otmp = piece;
            }
            await in_container(otmp);
        }
    } else {
        let mflags = INVORDER_SORT | INCLUDE_VENOM;
        if (put_in && game.flags?.invlet_constant !== false) {
            mflags |= USE_INVLET;
        }
        if (put_in && loot_justpicked) mflags |= JUSTPICKED;
        if (!put_in && game._current_container) {
            game._current_container.cknown = 1;
        }
        const buf = `${action} what?`;
        const olist = loot_menu_olist(put_in);
        /* C `:3365` — allow_all when every class was chosen. */
        const allow = all_categories ? allow_all : allow_category;
        const queried = await query_objlist(
            buf, olist, mflags, PICK_ANY, allow,
        );
        const n = queried.n | 0;
        const pick_list = queried.pick_list || [];
        if (n > 0) {
            n_looted = n;
            const lim = Math.min(n, pick_list.length);
            for (let i = 0; i < lim; i++) {
                let otmp = pick_list[i].obj;
                const orig = otmp;
                count = pick_list[i].count | 0;
                if (otmp && count > 0 && count < (otmp.quan || 1)) {
                    const piece = splitobj(otmp, count);
                    if (piece) otmp = piece;
                }
                const res = put_in
                    ? await in_container(otmp)
                    : await out_container(otmp);
                if (res <= 0) {
                    if (!game._current_container) {
                        otmp = null;
                    } else if (otmp && otmp !== orig) {
                        unsplitobj(otmp);
                    }
                    if (res < 0) break;
                }
            }
        }
    }
    return n_looted ? ECMD_TIME : ECMD_OK;
}

/** C pickup.c menu_loot(0, FALSE) — take out. */
async function menu_loot_takeout(container) {
    if (container) game._current_container = container;
    return menu_loot(0, false);
}

/**
 * C ref: pickup.c ck_bag — askchain filter and stash_ok.
 * True if current_container is intact and obj isn't it.
 * @param {object} obj
 * @returns {number} 1 or 0 (C boolean)
 */
export function ck_bag(obj) {
    return (game._current_container && obj !== game._current_container) ? 1 : 0;
}

/**
 * C ref: pickup.c stash_ok — getobj callback for stash_one.
 * Hands EXCLUDE; the container being filled is EXCLUDE_SELECTABLE
 * (typed letter still returns it; in_container refuses).
 */
function stash_ok(obj) {
    if (!obj) return GETOBJ_EXCLUDE;
    if (!ck_bag(obj)) return GETOBJ_EXCLUDE_SELECTABLE;
    return GETOBJ_SUGGEST;
}

/** SUGGEST invlets for stash getobj (C bp / lets[]; bag is not listed). */
function stash_raw_lets() {
    const lets = [];
    for (const o of game.invent || []) {
        if (!o?.invlet) continue;
        if (stash_ok(o) === GETOBJ_SUGGEST) lets.push(o.invlet);
    }
    lets.sort((a, b) => a.charCodeAt(0) - b.charCodeAt(0));
    return lets.join('');
}

function stash_prompt_lets(raw) {
    if (!raw || raw.length <= 5) return raw;
    return compactify_invlets(raw);
}

function stash_find_invlet(ch) {
    if (ch === GOLD_SYM) {
        return (game.invent || []).find((o) => o && o.oclass === COIN_CLASS)
            || null;
    }
    return (game.invent || []).find((o) => o && o.invlet === ch) || null;
}

/**
 * C ref: invent.c getobj("stash", stash_ok, GETOBJ_PROMPT|GETOBJ_ALLOWCNT)
 * via pickup.c use_container stash_one. Count prefix + split_otmp live.
 * Canned CMDQ_INT/KEY live. `?`/`*` → display_pickinv `&ctmp` (D-1559).
 * GETOBJ_PROMPT: empty SUGGEST (only the bag) still prompts `[*]`.
 */
async function getobj_stash() {
    const cq = getobj_from_cmdq(stash_ok, true);
    if (!cq.skip) return cq.otmp;
    for (;;) {
        const rawLets = stash_raw_lets();
        const lets = stash_prompt_lets(rawLets);
        const query = lets
            ? `What do you want to stash? [${lets} or ?*]`
            : 'What do you want to stash? [*]';
        let ch = await yn_function(query, null, '\0', false);
        const counted = await getobj_take_count(ch, true);
        if (counted.retry) continue;
        ch = counted.ch;
        if (ch === '\x1b' || ch === ' ' || ch === '\n' || ch === '\r') {
            if (game.flags?.verbose !== false) await pline(Never_mind);
            return null;
        }
        if (ch === '?' || ch === '*') {
            const ilet = await getobj_display_pickinv(
                ch, rawLets, true, counted,
            );
            if (ilet === '\x1b') {
                if (game.flags?.verbose !== false) await pline(Never_mind);
                return null;
            }
            if (!ilet) continue;
            const picked = stash_find_invlet(ilet);
            if (!picked) {
                await pline("You don't have that object.");
                continue;
            }
            if (stash_ok(picked) === GETOBJ_EXCLUDE) {
                await pline('That is a silly thing to stash.');
                return null;
            }
            const got = await getobj_apply_count(
                picked, 'stash', counted.cntgiven, counted.cnt,
            );
            if (!got) return null;
            if (got.retry) continue;
            return got;
        }
        const otmp = stash_find_invlet(ch);
        if (!otmp) {
            await pline("You don't have that object.");
            continue;
        }
        if (stash_ok(otmp) === GETOBJ_EXCLUDE) {
            await pline('That is a silly thing to stash.');
            return null;
        }
        const got = await getobj_apply_count(
            otmp, 'stash', counted.cntgiven, counted.cnt,
        );
        if (!got) return null;
        if (got.retry) continue;
        return got;
    }
}

/**
 * C ref: pickup.c is_boh_item_gone `:2510–2514` — `!rn2(13)` per-item loss
 * roll shared by the cursed-bag loot/tip/explosion arms below.
 * @returns {boolean} true when this item is gone
 */
export function is_boh_item_gone() {
    return !rn2(13);
}

/**
 * C ref: pickup.c mbag_item_gone `:2803–2822` — vanish pline (dknown-gated
 * `Doname2 … vanished!` vs `You notice/see … disappear!`), shop bill via
 * `stolen_value` when hero stands in (or holds) unpaid goods, then obfree.
 * C order kept: silent gate → ushops/shop_keeper short-circuit →
 * held?unpaid:costly_spot → stolen_value → obfree → loss.
 * @returns {Promise<number>} billed loss, 0 when no shop goods lost
 */
export async function mbag_item_gone(held, item, silent) {
    const u = game.u || {};
    let loss = 0;
    if (!silent) {
        if (item?.dknown) {
            await pline(`${Doname2(item)} ${otense(item, 'have')} vanished!`);
        } else {
            await pline(`You ${Blind() ? 'notice' : 'see'} ${doname(item)} disappear!`);
        }
    }
    const shopch = u.ushops ? u.ushops.charCodeAt(0) : 0;
    const shkp = shopch ? shop_keeper(shopch) : null;
    if (shopch && shkp) {
        if (held ? !!item?.unpaid : costly_spot(u.ux, u.uy)) {
            loss = await stolen_value(item, u.ux, u.uy, !!shkp.mpeaceful, true);
        }
    }
    obfree(item, null);
    return loss | 0;
}

/**
 * C ref: pickup.c do_boh_explosion `:2518–2534` — scatter most of a bag of
 * holding's contents around; some items destroyed with the same
 * `is_boh_item_gone` chance as looting a cursed bag. C order kept:
 * in_use guard first (scatter may create bones), prefetch nobj before
 * each arm, `!on_floor` held flag into the silent `mbag_item_gone`,
 * else stamp hero square and scatter with MAY_HIT|MAY_DESTROY.
 */
export async function do_boh_explosion(boh, on_floor) {
    const u = game.u || {};
    boh.in_use = 1; /* in case scatter() leads to bones creation */
    for (let otmp = boh?.cobj; otmp;) {
        const nobj = otmp.nobj;
        if (is_boh_item_gone()) {
            obj_extract_self(otmp);
            await mbag_item_gone(!on_floor, otmp, true);
        } else {
            otmp.ox = u.ux; otmp.oy = u.uy;
            await scatter(u.ux, u.uy, 4, MAY_HIT | MAY_DESTROY, otmp);
        }
        otmp = nobj;
    }
    /* boh is about to be deleted so no need to reset its in_use flag here */
}

/**
 * C ref: pickup.c boh_loss `:2537–2554` — sometimes toss objects from a
 * cursed magic bag on loot. C order kept: Is_mbag (obj.h:339 bag-of-holding
 * or bag-of-tricks) + cursed + Has_contents gate, prefetch nobj before
 * each loss arm, loss accumulates the billed `mbag_item_gone` returns.
 * @returns {Promise<number>} billed loss, 0 when gate closed or nothing lost
 */
export async function boh_loss(container, held) {
    /* sometimes toss objects if a cursed magic bag */
    const t = container?.otyp | 0;
    if ((t === BAG_OF_HOLDING || t === BAG_OF_TRICKS)
        && container.cursed && Has_contents(container)) {
        let loss = 0;
        for (let curr = container.cobj; curr;) {
            const otmp = curr.nobj;
            if (is_boh_item_gone()) {
                obj_extract_self(curr);
                loss += await mbag_item_gone(held, curr, false);
            }
            curr = otmp;
        }
        return loss | 0;
    }
    return 0;
}

/**
 * C ref: pickup.c Is_mbag — obj.h:339 BAG_OF_HOLDING || BAG_OF_TRICKS.
 */
function Is_mbag(obj) {
    const t = obj?.otyp | 0;
    return t === BAG_OF_HOLDING || t === BAG_OF_TRICKS;
}

/**
 * C ref: pickup.c mbag_explodes `:2488–2509` (staticfn) — explosion odds
 * 1/1, 2/2, 3/4, 4/8 … over nesting depth, recursing into contents.
 */
function mbag_explodes(obj, depthin) {
    if (!obj) return false;
    const t = obj.otyp | 0;
    /* these won't cause an explosion when they're empty — C `:2491–2493` */
    if ((t === WAN_CANCELLATION || t === BAG_OF_TRICKS) && (obj.spe | 0) <= 0)
        return false;
    /* odds: 1/1, 2/2, 3/4 … capped at 1<<7 — C `:2496–2497` */
    if ((Is_mbag(obj) || t === WAN_CANCELLATION)
        && rn2(1 << (depthin > 7 ? 7 : depthin)) <= depthin)
        return true;
    if (Has_contents(obj)) { // C `:2498–2504`
        for (let otmp = obj.cobj; otmp; otmp = otmp.nobj)
            if (mbag_explodes(otmp, depthin + 1)) return true;
    }
    return false; // C `:2505–2508`
}

/**
 * C ref: pickup.c in_container `:2558–2712` — move invent obj into
 * gc.current_container (JS: game._current_container). Every arm in C order.
 * Named omissions: none — every arm and callee live (C `panic` on a lost
 * floor bag surfaces as `impossible`: no live panic export, display.js:7747;
 * C `obj_to_any` timer cookie is the JS obj itself: mkobj.js stop_timer
 * takes obj; C `something` is const.js).
 * @returns {Promise<number>} 1 stashed, 0 refused, -1 stop
 */
async function in_container(obj) {
    // C `:2560` — floor_container is read before freeinv() mutates invent.
    const floor_container = !carried(game._current_container);
    let was_unpaid = false;
    if (!game._current_container) { // C `:2564–2567`
        await impossible('<in> no gc.current_container?');
        return 0;
    }
    if (!obj) return 0;
    const cont = game._current_container;
    const u = game.u || {};
    if (obj === u.uball || obj === u.uchain) { // C `:2568`
        await You('must be kidding.');
        return 0;
    }
    if (obj === cont) { // C `:2571`
        await pline('That would be an interesting topological exercise.');
        return 0;
    }
    if ((obj.owornmask | 0) & (W_ARMOR | W_ACCESSORY)) { // C `:2574–2576`
        await Norep(
            'You cannot %s %s you are wearing.',
            (cont.otyp | 0) === ICE_BOX ? 'refrigerate' : 'stash', something,
        );
        return 0;
    }
    if ((obj.otyp | 0) === LOADSTONE && obj.cursed) { // C `:2577–2580`
        set_bknown(obj, 1);
        await pline_The(
            "stone%s won't leave your person.",
            (obj.quan | 0) !== 1 ? 's' : '',
        );
        return 0;
    }
    if ((obj.otyp | 0) === AMULET_OF_YENDOR // C `:2582–2590`
        || (obj.otyp | 0) === CANDELABRUM_OF_INVOCATION
        || (obj.otyp | 0) === BELL_OF_OPENING
        || (obj.otyp | 0) === SPE_BOOK_OF_THE_DEAD) {
        await pline('%s cannot be confined in such trappings.', The(xname(obj)));
        return 0;
    }
    if ((obj.otyp | 0) === LEASH && (obj.leashmon | 0) !== 0) { // C `:2591–2593`
        await pline('%s attached to your pet.', Tobjnam(obj, 'are'));
        return 0;
    }
    if (obj === u.uwep) { // C `:2595–2605`
        if (welded(obj)) {
            await weldmsg(obj);
            return 0;
        }
        {
            const shine = setuwep(null);
            if (shine) await shine;
        }
        /* C: this uwep check is obsolete (3.0 Firebrand) — unwielded, died,
           rewielded by life-saving. */
        if (game.u?.uwep) return 0;
    } else if (obj === u.uswapwep) { // C `:2606–2608`
        setuswapwep(null);
    } else if (obj === u.uquiver) { // C `:2609–2611`
        setuqwep(null);
    }

    if (await fatal_corpse_mistake(obj, false)) return -1;

    if ((obj.otyp | 0) === ICE_BOX || Is_box(obj) || (obj.otyp | 0) === BOULDER
        || ((obj.otyp | 0) === STATUE && bigmonst(mons(obj.corpsenm)))) {
        await pline(
            `You cannot fit ${theArt(xname(obj))} into ${theArt(xname(cont))}.`,
        );
        return 0;
    }

    freeinv(obj); // C `:2624`
    /* JS display cache only (no C counterpart): C invent.c freeinv_core sets
       disp.botl for gold and C bot() recounts invent; JS botl `$:` reads
       game._goldCount (do.js freeinv_drop precedent), so writers decrement
       it when gold leaves invent. */
    if ((obj.oclass | 0) === COIN_CLASS) {
        game._goldCount = Math.max(0, (game._goldCount || 0) - (obj.quan || 0));
        if (!game.flags) game.flags = {};
        game.flags.botl = true;
    }

    if (obj_is_burning(obj)) // C `:2626–2627` (this used to be part of freeinv)
        await snuff_lit(obj);

    if (floor_container && costly_spot(u.ux, u.uy)) { // C `:2629–2643`
        /* defer gold until after put-in message */
        if ((obj.oclass | 0) !== COIN_CLASS) {
            /* sellobj() will take an unpaid item off the shop bill */
            was_unpaid = !!obj.unpaid; // C `:2633`
            if (game.sellobj_first) { // C `:2634–2640`
                /* don't sell when putting the item into your own container,
                   but handle billing correctly */
                sellobj_state(cont.no_charge ? SELL_DONTSELL : SELL_DELIBERATE);
                game.sellobj_first = false;
            }
            await sellobj(obj, u.ux, u.uy); // C `:2641`
        }
    }
    if ((cont.otyp | 0) === ICE_BOX && !age_is_relative(obj)) { // C `:2644–2657`
        obj.age = (game.moves | 0) - (obj.age | 0); /* actual age */
        /* stop any corpse timeouts when frozen */
        if ((obj.otyp | 0) === CORPSE) {
            if (obj.timed) { // C `:2649–2651`
                stop_timer(ROT_CORPSE, obj);
                stop_timer(REVIVE_MON, obj);
            }
            /* a cancelled ice troll corpse unfreezes uncancelled */
            if ((obj.corpsenm | 0) === PM_ICE_TROLL && has_omonst(obj)) // C `:2653–2654`
                OMONST(obj).mcan = 0;
        } else if (obj.globby && obj.timed) { // C `:2655–2656`
            stop_timer(SHRINK_GLOB, obj);
        }
    } else if (Is_mbag(cont) && mbag_explodes(obj, 0)) { // C `:2658–2693`
        livelog_printf(LL_ACHIEVE, 'just blew up %s bag of holding', uhis()); // C `:2659`
        /* explicitly mention what item is triggering the explosion */
        await urgent_pline( // C `:2661–2663`
            'As you put %s inside, you are blasted by a magical explosion!',
            doname(obj),
        );
        /* did not actually insert obj yet */
        if (was_unpaid) // C `:2665–2666`
            await addtobill(obj, false, false, true);
        if ((obj.otyp | 0) === BAG_OF_HOLDING) // C `:2667–2668`
            await do_boh_explosion(obj, (obj.where | 0) === OBJ_FLOOR);
        obfree(obj, null); // C `:2669` ((struct obj *)0)
        /* carried shop goods are flagged unpaid and obfree() handles the
           bill; floor goods need billing before deletion (non-shop items
           are flagged no_charge) — C `:2670–2678` */
        if (floor_container && costly_spot(cont.ox, cont.oy)) { // C `:2673–2674`
            const save_no_charge = cont.no_charge;
            await addtobill(cont, false, false, false); // C `:2678`
            /* addtobill() clears no_charge; set it back so useupf()
               doesn't double bill — C `:2679–2681` */
            cont.no_charge = save_no_charge;
        }
        await do_boh_explosion(cont, floor_container); // C `:2683`

        if (!floor_container) { // C `:2685–2686`
            useup(cont);
        } else if (obj_here_bag(cont, u.ux, u.uy)) { // C `:2687–2688`
            useupf(cont, cont.quan);
        } else { // C `:2690` (no live panic export — impossible)
            await impossible('in_container:  bag not found.');
        }

        await losehp(d(6, 6), 'magical explosion', KILLED_BY_AN); // C `:2692`
        game._current_container = null; /* baggone = TRUE; */ // C `:2693`
    }

    if (game._current_container) { // C `:2695–2704`
        /* Strcpy(buf, the(...)): JS strings need no obuf guard. */
        await You('put %s into %s.', doname(obj), theArt(xname(cont))); // C `:2696–2698`

        /* gold in container always needs to be added to credit */
        if (floor_container && (obj.oclass | 0) === COIN_CLASS) // C `:2701–2702`
            await sellobj(obj, cont.ox, cont.oy);
        add_to_container(cont, obj); // C `:2703`
        cont.owt = weight(cont); // C `:2704`
    }
    /* C `:2706–2709` — gold needs this, and freeinv() many lines above may
     * hide encumbrance from the status, so always update status now. */
    await bot(); // C `:2710`
    return game._current_container ? 1 : -1; // C `:2711`
}

/**
 * C ref: mkobj.c obj_here — object present at the (x,y) floor pile, as used
 * by in_container `:2687`. The eat.js:2513 local clone is not exported, so
 * the 5-line scan is inlined here rather than adding clone #2.
 */
function obj_here_bag(bag, x, y) {
    if (!bag) return false;
    for (let o = objects_at(x, y); o; o = o.nexthere) {
        if (o === bag) return true;
    }
    return false;
}

/** C pickup.c menu_loot(0, TRUE) — put in. */
async function menu_loot_putin(container) {
    if (container) game._current_container = container;
    return menu_loot(0, true);
}

/**
 * C ref: engrave.c freehand — free hand for loot/tip gates.
 */
function freehand() {
    const u = game.u || {};
    const uwep = u.uwep;
    // C: (!uwep || !welded(uwep) || (!bimanual(uwep) && (!uarms || !uarms->cursed)))
    if (!uwep || !welded(uwep)) return true;
    const bimanual = !!(game.objects?.[uwep.otyp]?.oc_big);
    if (!bimanual && (!u.uarms || !u.uarms.cursed)) return true;
    return false;
}

/**
 * C ref: pickup.c u_handsy — nohands / freehand gate for containers.
 * body_part(HAND) via objnam latebound (polyself→do→pickup cycle).
 * @returns {Promise<boolean>}
 */
async function u_handsy() {
    if (nohands(game.youmonst?.data)) {
        // C: You("have no hands!"); /* not body_part(HAND) */
        await pline('You have no hands!');
        return false;
    }
    if (!freehand()) {
        await pline(`You have no free ${body_part_latebound(HAND)}.`);
        return false;
    }
    return true;
}

/**
 * C ref: pickup.c observe_quantum_cat — collapse SchroedingersBox.
 * body_part(FOOT) via objnam latebound (polyself→do→pickup cycle).
 * Callers: use_container / tipcontainer_checks (makecat+givemsg TRUE);
 * end.c disclose walk (FALSE, FALSE — live leaves spe set).
 * Named omissions: muse.c monster-loot; shop Shk_Your ownership prefixes.
 * Escape/ascend companion HP is D-1754 (`game.Schroedingers_cat`).
 *
 * @param {object} box
 * @param {boolean} makecat
 * @param {boolean} givemsg
 */
export async function observe_quantum_cat(box, makecat, givemsg) {
    if (!box) return;
    const sc = "Schroedinger's Cat";
    let deadcat = box.cobj;
    let livecat = null;
    const itsalive = !rn2(2);

    const loc = get_obj_location_quantum(box);
    if (loc) {
        box.ox = loc.x;
        box.oy = loc.y;
    }

    if (itsalive) {
        if (makecat) {
            livecat = makemon(
                mons(PM_HOUSECAT), box.ox | 0, box.oy | 0,
                NO_MINVENT | MM_ADJACENTOK | MM_NOMSG,
            );
        }
        if (livecat) {
            livecat.mpeaceful = 1;
            set_malign(livecat);
            if (givemsg) {
                if (!canspotmon(livecat)) {
                    // C You("think %s brushed your %s.", something, body_part(FOOT))
                    await pline(
                        `You think something brushed your ${body_part_latebound(FOOT)}.`,
                    );
                } else {
                    await pline(
                        `${Monnam(livecat)} inside the box is still alive!`,
                    );
                }
            }
            christen_monst(livecat, sc);
            if (deadcat) {
                obj_extract_self(deadcat);
                deadcat.quan = 0;
                deadcat.where = OBJ_FREE;
                deadcat = null;
            }
            box.owt = weight(box);
            box.spe = 0;
            if (!game.context?.mon_moving) {
                more_experienced(10, 20);
                await newexplevel();
            }
        }
    } else {
        box.spe = 0;
        if (givemsg) {
            await pline(
                `The ${Hallucination() ? rndmonnam(null) : 'housecat'} inside the box is dead!`,
            );
        }
        if (deadcat) {
            deadcat.age = game.moves | 0;
            set_corpsenm(deadcat, PM_HOUSECAT);
            deadcat = oname(deadcat, sc, ONAME_NO_FLAGS);
            if (!game.context?.mon_moving) {
                more_experienced(20, 10);
                await newexplevel();
            }
        }
    }
}

const ynaqchars = 'ynaq';
const ynNaqchars = 'yn#aq';
const NOINVSYM = '#';

/** C pickup.c simple_look `:75–98` — NHW_MENU of doname for query_classes ':'. */
async function simple_look(otmp, here) {
    if (!otmp) {
        await impossible('simple_look(null)');
        return;
    }
    if (Array.isArray(otmp)) {
        if (otmp.length <= 1) {
            if (otmp[0]) await pline(doname(otmp[0]));
            return;
        }
        const lines = [''];
        for (const o of otmp) if (o) lines.push(doname(o));
        await show_nhw_menu_text(lines);
        return;
    }
    if (!(here ? otmp.nexthere : otmp.nobj)) {
        await pline(doname(otmp));
        return;
    }
    const lines = [''];
    walk_obj_list(otmp, here, (o) => { lines.push(doname(o)); });
    await show_nhw_menu_text(lines);
}

/**
 * C pickup.c query_classes `:140–262` — Traditional class getlin.
 * Callers: traditional_loot (D-1581); floor pickup (D-1620).
 * C `count_unpaid` walks nobj (fobj remainder from a floor head —
 * JS `place_object` threads the same fobj chain, so this is exact).
 * C `:158` sets m_seen once; ask_again `:198–201` does NOT reset it,
 * so an 'm' survives ':'/'i' look-agains. ESC: JS getlin only ever
 * returns exactly '\x1b' (nonempty ESC clears), so `===` ≡ C `*inbuf`.
 */
async function query_classes(action, objs, here, menu_on_demand) {
    const itemcount = { n: 0 };
    let ilets = collect_obj_classes(objs, here, null, itemcount);
    if (!ilets) return { ok: false, oclasses: [], one_at_a_time: false, everything: false };
    let oclasses = [];
    let one_at_a_time = false;
    let everything = false;
    let m_seen = false;
    if (menu_on_demand) menu_on_demand.n = 0;
    if (ilets.length === 1) {
        oclasses = [def_char_to_objclass(ilets.charAt(0))];
    } else {
        ilets += ' ';
        ilets += 'a';
        ilets += 'A';
        ilets += (objs === game.invent ? 'i' : ':');
    }
    if (itemcount.n && menu_on_demand) ilets += 'm';
    if (count_unpaid(objs)) ilets += 'u';
    /* C `:181` — canonical tally_BUCX (invent.c `:3580–3616`), incl. the
     * Role_if(PM_CLERIC) bknown force. ocnt unused both sides. */
    const buc = tally_BUCX(objs, here);
    if (buc.b) ilets += 'B';
    if (buc.u) ilets += 'U';
    if (buc.c) ilets += 'C';
    if (buc.x) ilets += 'X';
    if (buc.j) ilets += 'P';

    if (ilets.length > 1) {
        for (;;) {
            oclasses = [];
            one_at_a_time = false;
            everything = false;
            let not_everything = false;
            let filtered = false;
            /* C ask_again `:198–201` resets everything above but NOT
             * m_seen (set once at `:158`): an 'm' survives look-agains. */
            const qbuf = `What kinds of thing do you want to ${action}? [${ilets}]`;
            const inbuf = await getlin(qbuf);
            if (inbuf === '\x1b') {
                return { ok: false, oclasses: [], one_at_a_time: false, everything: false };
            }
            let where = null;
            let look_again = false;
            for (const sym of inbuf) {
                if (sym === ' ') continue;
                if (sym === 'A') {
                    one_at_a_time = true;
                } else if (sym === 'a') {
                    everything = true;
                } else if (sym === ':') {
                    await simple_look(objs, here);
                    const first = Array.isArray(objs) ? objs[0] : objs;
                    if (first?.where === OBJ_CONTAINED && first.ocontainer) {
                        first.ocontainer.cknown = 1;
                    }
                    look_again = true;
                    break;
                } else if (sym === 'i') {
                    await display_inventory(null, true);
                    look_again = true;
                    break;
                } else if (sym === 'm') {
                    m_seen = true;
                } else if ('uBUCXP'.includes(sym)) {
                    add_valid_menu_class(sym);
                    filtered = true;
                } else {
                    const oc = def_char_to_objclass(sym);
                    if (ilets.includes(sym)) {
                        add_valid_menu_class(oc);
                        if (!oclasses.includes(oc)) oclasses.push(oc);
                    } else {
                        if (where == null) {
                            where = action === 'pick up' ? 'here'
                                : action === 'take out' ? 'inside' : '';
                        }
                        if (where) {
                            await pline(`There are no ${sym}'s ${where}.`);
                        } else {
                            await pline(`You have no ${sym}'s.`);
                        }
                        not_everything = true;
                    }
                }
            }
            if (look_again) continue;
            if (m_seen && menu_on_demand) {
                menu_on_demand.n = ((everything || !oclasses.length) && !filtered)
                    ? -2 : -3;
                return { ok: false, oclasses, one_at_a_time, everything };
            }
            if (!oclasses.length && (!everything || not_everything)) {
                one_at_a_time = true;
                everything = false;
            }
            break;
        }
    }
    return { ok: true, oclasses, one_at_a_time, everything };
}

/**
 * C pickup.c pickup traditional `:793–891`.
 * MENU_TRADITIONAL && !menu_requested && ct>=2: There + query_classes
 * then live nexthere yn/pickup_object. ESC → pickupdone. 'm' →
 * query_objlist_pickup (allow_all if via_menu==-2 else allow_category).
 * ynaq/ynNaq default 'y'. Named: safe_qbuf (doname); via_menu
 * FEEL_COCKATRICE from query_objlist_pickup; INVORDER_SORT uses
 * existing sortpack. Returns {tried, picked} for the pickup() shared tail
 * (C n_tried / n_picked: ct==1&&count only counts picked when res > 0).
 */
async function pickup_traditional_floor(head, count, followNobj = false) {
    let n_tried = 0;
    let n_picked = 0;
    let all_of_a_type = true;
    let selective = false;
    let oclasses = [];
    /* C FOLLOW: floor piles walk nexthere, engulfer minvent walks nobj. */
    const next = (o) => (followNobj ? o.nobj : o.nexthere);

    let ct = 0;
    for (let o = head; o; o = next(o)) ct++;

    if (ct === 1 && count) {
        const obj = head;
        const lcount = Math.min(obj.quan || 1, count);
        n_tried++;
        reset_justpicked(game.invent);
        if (await pickup_object(obj, lcount, false) > 0) n_picked++;
        return { tried: n_tried, picked: n_picked };
    }

    if (ct >= 2) {
        await pline(
            `There are ${ct <= 10 ? 'several' : 'many'} objects here.`,
        );
        const via_menu = { n: 0 };
        const q = await query_classes('pick up', head, !followNobj, via_menu);
        if (!q.ok) {
            if (!via_menu.n) return { tried: 0, picked: 0 };
            const pile = [];
            for (let o = head; o; o = next(o)) pile.push(o);
            const extraAllow = via_menu.n === -2 ? null : allow_category;
            const pickList = await query_objlist_pickup(pile, extraAllow);
            if (!pickList.length) return { tried: 0, picked: 0 };
            reset_justpicked(game.invent);
            n_tried = pickList.length;
            for (const obj of pickList) {
                if (!obj) continue;
                if (followNobj
                    ? obj.where !== OBJ_MINVENT
                    : obj.where !== OBJ_FLOOR) continue;
                const res = await pickup_object(obj, 0, false);
                if (res < 0) break;
                n_picked += res;
            }
            return { tried: n_tried, picked: n_picked };
        }
        oclasses = q.oclasses || [];
        selective = q.one_at_a_time;
        all_of_a_type = q.everything;
    }

    const bycat = menu_class_present('B') || menu_class_present('U')
        || menu_class_present('C') || menu_class_present('X');

    for (let obj = head; obj; ) {
        const obj2 = next(obj);
        if (bycat ? !allow_category(obj)
            : (!selective && oclasses.length
                && !oclasses.includes(obj.oclass))) {
            obj = obj2;
            continue;
        }
        let lcount = -1;
        if (!all_of_a_type) {
            const qbuf = safe_qbuf(null, 'Pick up ', '?', obj, doname,
                ansimpleoname, something);
            const resp = (obj.quan || 1) < 2 ? ynaqchars : ynNaqchars;
            const sym = await yn_function(qbuf, resp, 'y');
            if (sym === 'q') break;
            if (sym === 'n') {
                obj = obj2;
                continue;
            }
            if (sym === 'a') {
                all_of_a_type = true;
                if (selective) {
                    selective = false;
                    oclasses = [obj.oclass];
                }
            } else if (sym === '#') {
                const yn_number = game.yn_number | 0;
                if (!yn_number) {
                    obj = obj2;
                    continue;
                }
                lcount = yn_number;
                if (lcount > (obj.quan || 1)) lcount = obj.quan || 1;
            }
        }
        if (lcount === -1) lcount = obj.quan || 1;
        if (!n_tried) reset_justpicked(game.invent);
        n_tried++;
        const res = await pickup_object(obj, lcount, false);
        if (res < 0) break;
        n_picked += res;
        obj = obj2;
    }
    return { tried: n_tried, picked: n_picked };
}

function obj_still_on_list(obj, listhead) {
    if (!obj || listhead == null) return false;
    if (Array.isArray(listhead)) return listhead.includes(obj);
    for (let o = listhead; o; o = o.nobj) {
        if (o === obj) return true;
    }
    return false;
}

function bypass_objlist_ask(head, on) {
    walk_obj_list(head, false, (o) => { o.bypass = on ? 1 : 0; });
}

function nxt_unbypassed_loot(sorted, listhead, cursor) {
    while (cursor.i < sorted.length) {
        const obj = sorted[cursor.i].obj;
        cursor.i++;
        if (obj_still_on_list(obj, listhead) && !obj.bypass) {
            obj.bypass = 1;
            return obj;
        }
    }
    return null;
}

function container_gone_ask(fn) {
    return (fn === in_container || fn === out_container)
        && !game._current_container;
}

/**
 * C invent.c askchain `:2376–2541`. Live: put-in/take-out, take off,
 * identify (D-1602), drop (D-1635). Named: worn.c clear_bypasses.
 */
export async function askchain(getHead, ininv, olets, allflag, fn, ckfn, mx, word) {
    const take_out = word === 'take out';
    const put_in = word === 'put in';
    const takeoff = taking_off(word);
    const ident = word === 'identify';
    const nodot = word === 'nodot' || word === 'drop' || ident
        || takeoff || take_out || put_in;
    const bycat = menu_class_present('u') || menu_class_present('B')
        || menu_class_present('U') || menu_class_present('C')
        || menu_class_present('X') || menu_class_present('P');

    let oletList = olets && olets.length ? olets.slice() : null;
    const head0 = getHead();
    const sorted = sortloot(head0, SORTLOOT_INVLET, false);
    bypass_objlist_ask(head0, false);

    let cnt = 0;
    let dud = 0;
    let first = true;
    let oletsIdx = 0;

    nextclass: for (;;) {
        let ilet = 'a'.charCodeAt(0) - 1;
        const live0 = getHead();
        bypass_objlist_ask(live0, false);
        const firstObj = Array.isArray(live0) ? live0[0] : live0;
        if (firstObj && firstObj.oclass === COIN_CLASS) ilet--;
        const cursor = { i: 0 };
        let otmp;
        while ((otmp = nxt_unbypassed_loot(sorted, getHead(), cursor))) {
            if (ilet === 'z'.charCodeAt(0)) ilet = 'A'.charCodeAt(0);
            else if (ilet === 'Z'.charCodeAt(0)) ilet = NOINVSYM.charCodeAt(0);
            else ilet++;
            const iletCh = String.fromCharCode(ilet);
            if (oletList && oletList.length
                && otmp.oclass !== oletList[oletsIdx]) {
                continue;
            }
            if (takeoff && !is_worn(otmp)) continue;
            if (ident && !not_fully_identified(otmp)) continue;
            if (ckfn && !ckfn(otmp)) continue;
            if (bycat && !allow_category(otmp)) continue;

            let sym;
            if (!allflag) {
                let qpfx = '';
                if (first) {
                    if (take_out || put_in) {
                        qpfx = `${highc(word.charAt(0))}${word.slice(1)}: `;
                    }
                    first = false;
                }
                const letch = (ininv && game.flags?.invlet_constant !== false
                    && otmp.invlet)
                    ? otmp.invlet : iletCh;
                const shown = ininv
                    ? xprname(otmp, letch, !nodot)
                    : doname(otmp);
                const qbuf = `${qpfx}${shown}?`;
                const resp = (takeoff || ident || otmp.quan < 2)
                    ? ynaqchars : ynNaqchars;
                /* C invent.c askchain `:2466–2470` FALSE — not ^A canned. */
                sym = await yn_function(qbuf, resp, 'n', false);
            } else {
                sym = 'y';
            }

            const otmpo = otmp;
            if (sym === '#') {
                const yn_number = game.yn_number | 0;
                if (!yn_number) {
                    sym = 'n';
                } else {
                    sym = 'y';
                    if (yn_number < (otmp.quan || 1) && splittable(otmp)) {
                        otmp = splitobj(otmp, yn_number);
                    }
                }
            }
            switch (sym) {
            case 'a':
                allflag = true;
                // FALLTHROUGH
            case 'y': {
                const tmp = await fn(otmp);
                if (tmp <= 0) {
                    if (container_gone_ask(fn)) {
                        otmp = null;
                    } else if (otmp && otmp !== otmpo) {
                        unsplitobj(otmp);
                    }
                    if (tmp < 0) {
                        bypass_objlist_ask(getHead(), false);
                        return cnt;
                    }
                }
                cnt += tmp;
                if (--mx === 0) {
                    bypass_objlist_ask(getHead(), false);
                    return cnt;
                }
                // FALLTHROUGH
            }
            case 'n':
                if (nodot) dud++;
                break;
            case 'q':
                if (ident) cnt = -1;
                bypass_objlist_ask(getHead(), false);
                return cnt;
            default:
                break;
            }
        }
        if (oletList && oletList.length && ++oletsIdx < oletList.length) {
            continue nextclass;
        }
        break;
    }

    if (!takeoff && (dud || cnt)) {
        await pline('That was all.');
    } else if (!dud && !cnt) {
        await pline('No applicable objects.');
    }
    bypass_objlist_ask(getHead(), false);
    return cnt;
}

/** C pickup.c traditional_loot `:3229–3261`. menu 'm' → menu_loot(retry). */
async function traditional_loot(put_in) {
    let used = ECMD_OK;
    const action = put_in ? 'put in' : 'take out';
    const getHead = put_in
        ? () => game.invent || []
        : () => game._current_container?.cobj || null;
    const actionfunc = put_in ? in_container : out_container;
    const checkfunc = put_in ? ck_bag : null;
    if (!put_in) game.pickup_encumbrance = 0;

    const menu_on_request = { n: 0 };
    const q = await query_classes(action, getHead(), false, menu_on_request);
    if (q.ok) {
        const olets = q.one_at_a_time ? null : q.oclasses;
        const n = await askchain(
            getHead, put_in, olets, q.everything,
            actionfunc, checkfunc, 0, action,
        );
        if (n) used = ECMD_TIME;
    } else if (menu_on_request.n < 0) {
        /* C `:3258` — 'm' passes the -2/-3 retry; do not re-prompt classes. */
        const n = await menu_loot(menu_on_request.n, put_in);
        used = n > 0 ? ECMD_TIME : ECMD_OK;
    }
    return used;
}

/**
 * C ref: pickup.c use_container — held/floor container loot.
 * Branch envelope: u_handsy; unlocked; MENU_FULL/PARTIAL in_or_out_menu
 * (lootabc); TRADITIONAL/COMBINATION yn_function (D-1567); ':' look;
 * '?' explain_container_prompt; 'o' take-out; 'i' put-in; 'b' out then
 * in; 'r' in then out (loot_in_first); 's' stash ALLOWCNT (D-1561);
 * 'q' abort_looting; 'n' next container (more_containers, D-1592);
 * MENU_TRADITIONAL traditional_loot + askchain (D-1581).
 * Floor TRADITIONAL query_classes is D-1620.
 * ggetobj takeoff/identify askchain is D-1602.
 * ggetobj drop / doddrop is D-1635.
 * Named omissions: chest trap; BoT; mbag explosion body.
 *
 * @param {object} obj container
 * @param {boolean} [held=false] applied from invent
 * @param {boolean} [more_containers=false] multiple #loot (Next)
 */
export async function use_container(obj, held = false, more_containers = false) {
    if (!obj) return ECMD_OK;

    // C: ga.abort_looting = FALSE at entry.
    game.abort_looting = false;
    // C pickup.c:2985 — gs.sellobj_first = TRUE; in_container() consumes it
    // on the first shop-floor put-in (one sellobj_state call).
    game.sellobj_first = true;

    // C: if (!u_handsy()) return ECMD_OK;
    if (!(await u_handsy())) return ECMD_OK;

    // C pickup.c:2992–2999 — discover lock in advance (`:2992–2996`); held
    // refreshes the inventory display. Then Tobjnam "are" locked; held asks
    // to put it down. (The Hmmm/"turns out to be locked" variant is the
    // floor-only do_loot_cont `:2106–2111` copy; use_container always uses
    // Tobjnam.)
    if (!obj.lknown) {
        obj.lknown = 1;
        if (held) update_inventory();
    }
    if (obj.olocked) {
        await pline(`${Tobjnam(obj, 'are')} locked.`);
        if (held) await pline('You must put it down to unlock.');
        return ECMD_OK;
    }

    game._current_container = obj;
    let used = ECMD_OK;
    // C pickup.c:3020–3025 — SchroedingersBox before inokay/outokay.
    const quantum_cat = SchroedingersBox(obj);
    if (quantum_cat) {
        await observe_quantum_cat(obj, true, true);
        used = ECMD_TIME;
    }
    let inokay = (game.invent || []).some((o) => o && o !== obj);
    // C: outokay = Has_contents; outmaybe = outokay || !cknown
    const outokay = Has_contents(obj);
    // C: preformat emptymsg when !outokay — Ysimple_name2 + "now " after
    // quantum_cat (cursed_mbag "now " still named).
    let emptymsg = '';
    if (!outokay) {
        // C pickup.c:3043–3046 — Ysimple_name2 (known sack → "Your sack").
        emptymsg = `${Ysimple_name2_objnam(obj)} is ${quantum_cat ? 'now ' : ''}empty.`;
    }
    // C default MENU_FULL (options.c). Unset JS flags must not fall
    // through to TRADITIONAL (0) yn_function — that would break FULL
    // sessions. Combination/traditional still take the yn path.
    const style = game.flags?.menu_style ?? MENU_FULL;
    const use_menu = !(style === MENU_TRADITIONAL || style === MENU_COMBINATION);
    let c = 'q';
    for (;;) {
        // C: prompt uses outmaybe, not bare outokay (empty+!cknown →
        // "Do what with your bag?" still offers take-out).
        const outmaybe = outokay || !obj.cknown;
        // C pickup.c:3076–3082 — null prefix + Yname2/Ysimple_name2/"This"
        // when empty; else "Do what with " + yname/ysimple_name/"it".
        const qbuf = outmaybe
            ? safe_qbuf(null, 'Do what with ', '?', obj, yname_objnam,
                ysimple_name_objnam, 'it')
            : safe_qbuf(null, null, ' is empty.  Do what with it?', obj,
                Yname2, Ysimple_name2_objnam, 'This');
        if (use_menu) {
            if (!inokay && !outmaybe) {
                // C: nothing to take out or put in → try both (feedback)
                c = 'b';
            } else {
                c = await in_or_out_menu(
                    qbuf, obj, outmaybe, inokay, used !== ECMD_OK,
                    more_containers,
                );
            }
        } else {
            c = await use_container_traditional_prompt(
                qbuf, outmaybe, inokay, more_containers,
            );
        }
        if (c === '?') {
            await explain_container_prompt(more_containers);
            continue;
        }
        if (c === ':') {
            if (!obj.cknown) used = ECMD_TIME;
            await container_contents(obj);
            continue;
        }
        break;
    }

    // C: 'q' sets ga.abort_looting; 'n' falls through to containerdone
    // without abort so doloot_core continues to the next selected box.
    if (c === 'q') game.abort_looting = true;
    if (c !== 'n' && c !== 'q') {
        // C pickup.c:3132–3135 — 'r' is both, reversed (put in, then take out).
        let loot_out = (c === 'o' || c === 'b' || c === 'r');
        let loot_in = (c === 'i' || c === 'b' || c === 'r');
        const loot_in_first = (c === 'r');
        let stash_one = (c === 's');

        // out-only or out before in
        if (loot_out && !loot_in_first) {
            if (!Has_contents(obj)) {
                // C: pline1(emptymsg) — Ysimple_name2 ("The sack is empty.")
                await pline(emptymsg || `${Ysimple_name2_objnam(obj)} is empty.`);
                if (!obj.cknown) used = ECMD_TIME;
                obj.cknown = 1;
            } else {
                add_valid_menu_class(0);
                used |= style === MENU_TRADITIONAL
                    ? await traditional_loot(false)
                    : await menu_loot_takeout(obj);
                add_valid_menu_class(0);
            }
            inokay = (game.invent || []).some((o) => o && o !== obj);
        }

        if ((loot_in || stash_one) && !inokay) {
            const elsebit = game.invent?.length ? ' else' : '';
            await pline(
                `You don't have anything${elsebit} to ${stash_one ? 'stash' : 'put in'}.`,
            );
            loot_in = false;
            stash_one = false;
        }

        if (loot_in) {
            add_valid_menu_class(0);
            used |= style === MENU_TRADITIONAL
                ? await traditional_loot(true)
                : await menu_loot_putin(obj);
            add_valid_menu_class(0);
        } else if (stash_one) {
            // C: getobj("stash", stash_ok, GETOBJ_PROMPT|GETOBJ_ALLOWCNT)
            const otmp = await getobj_stash();
            if (otmp) {
                if (await in_container(otmp)) {
                    used = 1;
                } else {
                    unsplitobj(otmp);
                }
            }
        }
        // C: putting something in might have triggered magic bag explosion
        if (!game._current_container) loot_out = false;

        // out after in
        if (loot_out && loot_in_first) {
            const cont = game._current_container;
            if (!Has_contents(cont)) {
                await pline(emptymsg || `${Ysimple_name2_objnam(cont)} is empty.`);
                // C: used = 1 (ECMD_TIME) when !cknown, unlike first-out ECMD_TIME
                if (!cont.cknown) used = 1;
                cont.cknown = 1;
            } else {
                add_valid_menu_class(0);
                used |= style === MENU_TRADITIONAL
                    ? await traditional_loot(false)
                    : await menu_loot_takeout(cont);
                add_valid_menu_class(0);
            }
        }
    }

    // C: use_container containerdone — if used, mark contents known
    // (put-in alone does not set cknown in menu_loot; this does).
    // Skip when mbag explosion cleared current_container.
    if (used && game._current_container) game._current_container.cknown = 1;

    // C pickup.c:3219 — sellobj_state(SELL_NORMAL) in case in_container()
    // set DELIBERATE/DONTSELL on a shop-floor put-in.
    sellobj_state(SELL_NORMAL);
    game._current_container = null;
    void held;
    return used;
}

/**
 * C ref: pickup.c do_loot_cont `:2088–2162` — one floor container for #loot.
 * cindex/ccount (1..N) → use_container more_containers (cindex < ccount).
 * @param {object} cobj
 * @param {number} [cindex=1]
 * @param {number} [ccount=1]
 * @returns {Promise<number>} ECMD_*
 */
async function do_loot_cont(cobj, cindex = 1, ccount = 1) {
    // C `:2095` — cobj = *cobjp.
    if (!cobj) return ECMD_OK; // C `:2095–2096`
    if (cobj.olocked) { // C `:2097`
        let res = ECMD_OK; // C `:2098`
        // C `:2100–2105` — the #if 0 floor-pile "It is/Hmmm locked" copy is
        // compiled out upstream; only the live pair below runs.
        if (cobj.lknown) // C `:2106`
            await pline(`${upstart(theArt(xname(cobj)))} is locked.`); // C `:2107` The(xname)
        else // C `:2108`
            await pline(`Hmmm, ${theArt(xname(cobj))} turns out to be locked.`); // C `:2109` the(xname)
        cobj.lknown = 1; // C `:2110`

        if (!game.flags) game.flags = {};
        const au = game.flags.autounlock ?? AUTOUNLOCK_APPLY_KEY; // C `:2112`
        if (au) {
            const ox = cobj.ox | 0; // C `:2114`
            const oy = cobj.oy | 0; // C `:2114`

            // C `:2116–2117` — u.dz = 0 (#loot isn't a move command).
            if (game.u) game.u.dz = 0;
            // C `:2118–2123` — APPLY_KEY arm sets up unlocktool (kept even
            // when untrap runs first); UNTRAP arm passes a null tool.
            let unlocktool = 0;
            if ((au & AUTOUNLOCK_APPLY_KEY) !== 0) unlocktool = autokey(true);
            if (unlocktool || (au & AUTOUNLOCK_UNTRAP) !== 0) {
                // C `:2124` — ox/oy passed to avoid a direction prompt.
                if (await pick_lock(unlocktool, ox, oy, cobj)) res = ECMD_TIME; // C `:2125–2126`
                // C `:2127–2134` — untrap/unlock may trigger a trap that
                // destroys cobj; rescan the floor pile to find out.
                let stillthere = false;
                for (let otmp = objects_at(ox, oy); otmp; otmp = otmp.nexthere) {
                    if (otmp === cobj) { stillthere = true; break; }
                }
                if (!stillthere) cobj = null; // C `:2133–2134` — *cobjp = 0
                return res; // C `:2135`
            }
            // C `:2137–2139` — single box + forceable weapon queues #force
            // (res is still ECMD_OK here; the check mirrors C order).
            if ((au & AUTOUNLOCK_FORCE) !== 0
                && res !== ECMD_TIME
                && ccount === 1 && u_have_forceable_weapon()) {
                // C `:2140–2141` — doforce asks for confirmation.
                cmdq_add_ec(CQ_CANNED, doforce); // C `:2142`
                game.abort_looting = true; // C `:2143`
            }
        }
        return res; // C `:2146`
    }
    cobj.lknown = 1; // C `:2148` — floor container needs no update_inventory()

    if ((cobj.otyp | 0) === BAG_OF_TRICKS) { // C `:2150`
        await You(`carefully open ${theArt(xname(cobj))}...`); // C `:2153`
        await pline('It develops a huge set of teeth and bites you!'); // C `:2154`
        const tmp = rnd(10); // C `:2155`
        losehp(maybe_half_phys(tmp), 'carnivorous bag', KILLED_BY_AN); // C `:2156`
        if (game._losehp_needs_done || game.program_state?.gameover) {
            // C done() is noreturn; ECMD_TIME is this arm's value.
            const { finish_losehp_done } = await import('./end.js');
            await finish_losehp_done();
            return ECMD_TIME;
        }
        makeknown(BAG_OF_TRICKS); // C `:2157`
        game.abort_looting = true; // C `:2158`
        return ECMD_TIME; // C `:2159`
    }
    // C `:2161` — use_container(cobjp, FALSE, (cindex < ccount)).
    return use_container(cobj, false, cindex < ccount);
}

/**
 * C ref: pickup.c container_at `:2023–2038`.
 * @param {number} x
 * @param {number} y
 * @param {boolean} countem false → stop at first
 * @returns {number}
 */
export function container_at(x, y, countem) {
    let container_count = 0;
    for (let cobj = objects_at(x, y); cobj; cobj = cobj.nexthere) {
        if (Is_container(cobj)) {
            container_count++;
            if (!countem) break;
        }
    }
    return container_count;
}

/**
 * C ref: pickup.c doloot_core num_conts>1 — NHW_MENU PICK_ANY
 * "Loot which containers?" + doname rows (auto a/b/c).
 * @returns {Promise<{n:number, list:object[]}>} n==-1 ESC, 0 none, >0 picked
 */
async function loot_which_containers_menu(x, y) {
    const conts = [];
    for (let o = objects_at(x, y); o; o = o.nexthere) {
        if (Is_container(o)) conts.push(o);
    }
    const rows = conts.map((obj, i) => ({
        obj,
        sel: i < 26 ? String.fromCharCode('a'.charCodeAt(0) + i) : '',
        selected: false,
    }));
    for (;;) {
        const entries = [
            { text: 'Loot which containers?', attr: ATR_INVERSE },
            { text: '', attr: 0 },
        ];
        for (const row of rows) {
            const mark = row.selected ? '+' : '-';
            const accel = row.sel ? `${row.sel} ` : '  ';
            entries.push({
                text: `${accel}${mark} ${doname(row.obj)}`,
                attr: 0,
            });
        }
        await paint_corner_nhw_menu(entries, '(end) ');
        await flush_screen(1);
        const key = await nhgetch();
        game._menu_overlay = false;
        await docrt();
        await flush_screen(1);
        if (key === 27) return { n: -1, list: [] };
        if (key === 13 || key === 10 || key === 32) {
            const list = rows.filter((r) => r.selected).map((r) => r.obj);
            return { n: list.length, list };
        }
        const ch = String.fromCharCode(key);
        const hit = rows.find((r) => r.sel && r.sel === ch);
        if (hit) hit.selected = !hit.selected;
    }
}

/**
 * C ref: pickup.c doloot_core lootcont — count, able_to_loot, then
 * either PICK_ANY multi or the single-container walk.
 * @returns {Promise<{timepassed:number, c:string|number, blocked?:boolean, aborted?:boolean}>}
 */
async function loot_floor_containers(x, y) {
    const num_conts = container_at(x, y, true);
    if (num_conts <= 0) return { timepassed: 0, c: -1 };
    if (!(await able_to_loot(x, y, true))) {
        return { timepassed: 0, c: -1, blocked: true };
    }
    // C doloot_core `:2228–2240` Blind && !uarmg feel_cockatrice before
    // asking about containers
    if (Blind() && !game.u?.uarmg) {
        let nobj = objects_at(x, y);
        while (nobj && (nobj.otyp | 0) !== CORPSE) nobj = nobj.nexthere;
        for (; nobj; nobj = nxtobj(nobj, CORPSE, true)) {
            if (will_feel_cockatrice(nobj, false)) {
                await feel_cockatrice(nobj, false);
                return { timepassed: 1, c: -1, felt: true };
            }
        }
    }
    let timepassed = 0;
    if (num_conts > 1) {
        const pick = await loot_which_containers_menu(x, y);
        if (pick.n > 0) {
            for (let i = 1; i <= pick.n; i++) {
                timepassed |= await do_loot_cont(pick.list[i - 1], i, pick.n);
                if (game.abort_looting) {
                    return { timepassed, c: 'y', aborted: true };
                }
            }
        }
        return { timepassed, c: pick.n !== 0 ? 'y' : -1 };
    }
    let anyfound = false;
    for (let o = objects_at(x, y); o; o = o.nexthere) {
        if (!Is_container(o)) continue;
        anyfound = true;
        timepassed |= await do_loot_cont(o, 1, 1);
        if (game.abort_looting) {
            return { timepassed, c: 'y', aborted: true };
        }
    }
    return { timepassed, c: anyfound ? 'y' : -1 };
}

/** C youprop.h Confusion / Stunned for doloot_core lootmon. */
function doloot_Confusion() {
    const u = game.u || {};
    return !!((u.HConfusion | 0) || u.Confusion);
}
function doloot_Stunned() {
    const u = game.u || {};
    return !!((u.HStun | 0) || u.Stunned);
}

/**
 * C ref: pickup.c loot_mon `:2430–2481` — saddle off adjacent mon, then
 * swallowed `pickup(count)`.
 * @param {object|null} mtmp
 * @param {{value:number}|null} [passed_info]
 * @param {{value:boolean}|null} [prev_loot]
 * @returns {Promise<number>} timepassed
 */
export async function loot_mon(mtmp, passed_info, prev_loot) {
    let c = -1;
    let timepassed = 0;
    const u = game.u || {};

    if (mtmp && mtmp !== u.usteed) {
        const otmp = which_armor(mtmp, W_SADDLE);
        if (otmp) {
            if (passed_info) passed_info.value = 1;
            const qbuf = `Do you want to remove the saddle from ${
                x_monnam(mtmp, ARTICLE_THE, null, SUPPRESS_SADDLE, false)
            }?`;
            c = await yn_function(qbuf, ynqchars, 'n', true);
            if (c === 'y') {
                if (nolimbs(game.youmonst?.data)) {
                    await pline("You can't do that without limbs.");
                    return 0;
                }
                if (otmp.cursed) {
                    await pline(
                        `You can't.  The saddle seems to be stuck to ${
                            x_monnam(mtmp, ARTICLE_THE, null, SUPPRESS_SADDLE, false)
                        }.`,
                    );
                    return 1;
                }
                extract_from_minvent(mtmp, otmp, true, false);
                if (game.flags?.verbose !== false) {
                    await pline(
                        `You take ${thesimpleoname(otmp)} off of ${mon_nam(mtmp)}.`,
                    );
                }
                await hold_another_object(
                    otmp, 'You drop %s!', doname(otmp), null,
                );
                timepassed = rnd(3);
                if (prev_loot) prev_loot.value = true;
            } else if (c === 'q') {
                return 0;
            }
        }
    }
    if (u.uswallow) {
        const count = passed_info ? (passed_info.value | 0) : 0;
        timepassed = await pickup(count);
    }
    return timepassed;
}

/**
 * C ref: pickup.c doloot `:2166–2174` — set loot_reset_justpicked around
 * doloot_core (addinv_core0 resets pickup_prev once).
 */
export async function doloot() {
    game.loot_reset_justpicked = true;
    const res = await doloot_core();
    game.loot_reset_justpicked = false;
    return res;
}

/**
 * C ref: pickup.c doloot_core `:2178–2346` — lootcont then lootmon.
 * Confusion `:2202–2209` wired (rn2(6) && reverse_loot / rn2(2)).
 * Named omissions: PICK_ANY @ invert / pages / >26 containers.
 * (AUTOUNLOCK_FORCE lives in do_loot_cont `:2137–2144`, wired.)
 */
async function doloot_core() {
    const u = game.u;
    if (!u) return ECMD_OK;

    let c = -1;
    let timepassed = 0;
    let cc = { x: u.ux, y: u.uy };
    let underfoot = true;
    const dont_find_anything = "don't find anything";
    const prev_inquiry = { value: 0 };
    const prev_loot = { value: false };

    // C: ga.abort_looting = FALSE;
    game.abort_looting = false;

    // C: check_capacity(NULL) then nohands → "You have no hands!"
    if (check_capacity(null)) {
        await pline(
            game._check_capacity_msg
            || "You can't do that while carrying so much stuff.",
        );
        game._check_capacity_msg = null;
        return ECMD_OK;
    }
    if (nohands(game.youmonst?.data)) {
        await pline('You have no hands!');
        return ECMD_OK;
    }
    // C `:2202–2209` — Confusion: rn2(6) && reverse_loot() costs the turn;
    // else rn2(2) finds nothing; else fall through to normal looting.
    if (doloot_Confusion()) {
        if (rn2(6) && (await reverse_loot()))
            return ECMD_TIME;
        if (rn2(2)) {
            await pline('Being confused, you find nothing to loot.');
            return ECMD_TIME; /* costs a turn */
        }             /* else fallthrough to normal looting */
    }

    cc = { x: u.ux, y: u.uy };
    // C: if (iflags.menu_requested) goto lootmon
    let at_lootmon = !!(game.iflags?.menu_requested);

    for (;;) {
        if (!at_lootmon) {
            const floor = await loot_floor_containers(cc.x, cc.y);
            if (floor.felt) return ECMD_TIME;
            if (floor.blocked) return ECMD_OK;
            if (floor.aborted) return floor.timepassed ? ECMD_TIME : ECMD_OK;
            timepassed |= floor.timepassed | 0;
            c = floor.c;
            if (c === -1 && !container_at(cc.x, cc.y, false)) {
                const loc = game.level?.at(cc.x, cc.y);
                if (IS_GRAVE(loc?.typ)) {
                    await pline(
                        'You need to dig up the grave to effectively loot it...',
                    );
                }
            }
        }
        at_lootmon = false;

        // C lootmon `:2296–2344`
        if (c !== 'y' && (mon_beside(u.ux, u.uy) || game.iflags?.menu_requested)) {
            let looted_mon = false;
            const adj = await get_adjacent_loc(
                'Loot in what direction?',
                'Invalid loot location',
            );
            if (!adj) return ECMD_OK;
            cc = adj;
            underfoot = u_at(cc.x, cc.y);
            if (underfoot && container_at(cc.x, cc.y, false)) {
                continue; // C: goto lootcont
            }
            if ((u.dz | 0) < 0) {
                await pline(
                    `You ${dont_find_anything} to loot on the ${ceiling(cc.x, cc.y)}.`,
                );
                return ECMD_TIME;
            }
            const mtmp = m_at(cc.x, cc.y);
            if (mtmp) {
                timepassed = await loot_mon(mtmp, prev_inquiry, prev_loot);
                if (timepassed) looted_mon = true;
            }
            if (doloot_Confusion() || doloot_Stunned()) timepassed = 1;

            if (!looted_mon) {
                if (!underfoot && container_at(cc.x, cc.y, false)) {
                    if (mtmp) {
                        await pline(
                            `You can't loot anything ${
                                prev_inquiry.value ? 'else ' : ''
                            }there with ${mon_nam(mtmp)} in the way.`,
                        );
                        return timepassed ? ECMD_TIME : ECMD_OK;
                    }
                    await pline('You have to be at a container to loot it.');
                } else {
                    await pline(
                        `You ${dont_find_anything} ${
                            prev_inquiry.value || prev_loot.value ? 'else ' : ''
                        }${!underfoot ? 't' : ''}here to loot.`,
                    );
                    return timepassed ? ECMD_TIME : ECMD_OK;
                }
            }
        } else if (c !== 'y' && c !== 'n') {
            await pline(
                `You ${dont_find_anything} ${underfoot ? 'here' : 'there'} to loot.`,
            );
        }
        break;
    }
    return timepassed ? ECMD_TIME : ECMD_OK;
}

/**
 * C ref: pickup.c reverse_loot `:2350–2426` (staticfn) — confused #loot
 * misfire. Sole C caller: doloot_core `:2203` (`rn2(6) && reverse_loot()`).
 * `:2359` !rn2(3) finds "old loot" in invent (1/(n+1) per object, FALSE
 * off the end); `:2371–2380` splits a (rnd(5)*quan+4)/5 share off the
 * first COIN_CLASS; `:2386` unwears quivered gold for freeinv; off-throne
 * `:2389–2393` dropx + "Ok, now there is loot here." when it stays;
 * throne `:2396–2407` prefers the spe == 2 coffers chest else the nearest
 * CHEST on fobj; `:2409–2420` thanks + wizard-locks the chest;
 * `:2421–2428` no chest → exchequer makemon (the looted gate
 * short-circuits before courtmon RNG); `:2429–2431` else "You drop …" +
 * dropx. Async: prinv/pline/verbalize/You/dropx/boxlock/remove_worn_item
 * await. JS invent is the invlet-sorted array (C nobj order, both sides
 * reorder_invent); distu is the dist2 macro (hack.h:1531); boxdummy is
 * cg.zeroobj + otyp (boxlock reads otyp only).
 * @returns {Promise<boolean>}
 */
async function reverse_loot() {
    const u = game.u || {};
    const x = u.ux | 0, y = u.uy | 0;

    // C `:2359–2369` — !rn2(3): find old loot in invent or FALSE
    if (!rn2(3)) {
        /* n objects: 1/(n+1) chance per object, 1/(n+1) to fall off end */
        let n = inv_cnt(true);
        for (const otmp of (game.invent || [])) {
            if (!rn2(n + 1)) {
                await prinv('You find old loot:', otmp, 0);
                return true;
            }
            --n;
        }
        return false;
    }

    /* find a money object to mess with */
    let goldob = null;
    for (const otmp of (game.invent || [])) {
        if (otmp.oclass === COIN_CLASS) {
            // C `:2374` — ((long) rnd(5) * quan + 4L) / 5L
            const quan = Number(otmp.quan) || 0;
            const contribution = Math.floor((rnd(5) * quan + 4) / 5);
            goldob = contribution < quan ? splitobj(otmp, contribution) : otmp;
            break;
        }
    }
    if (!goldob)
        return false;

    /* gold might be quivered; dropping would un-wear it, but freeinv()
       expects caller to do that; do so now */
    await remove_worn_item(goldob, false);

    const lev = game.level?.at?.(x, y);
    if (!IS_THRONE(lev?.typ)) {
        // C `:2389–2393`
        await dropx(goldob);
        /* the dropped gold might have fallen to lower level */
        if (g_at(x, y))
            await pline('Ok, now there is loot here.');
    } else {
        /* find original coffers chest if present, otherwise use nearest */
        let otmp = null;
        let coffers = null;
        for (let c = game.fobj; c; c = c.nobj) {
            if ((c.otyp | 0) !== CHEST)
                continue;
            if ((c.spe | 0) === 2) {
                coffers = c;
                break; /* a throne room chest */
            }
            // C distu(xx,yy) ≡ dist2(xx,yy,u.ux,u.uy); x/y are u.ux/u.uy
            if (!otmp
                || dist2(c.ox | 0, c.oy | 0, x, y)
                    < dist2(otmp.ox | 0, otmp.oy | 0, x, y))
                otmp = c; /* remember closest ordinary chest */
        }
        if (!coffers)
            coffers = otmp;

        let mon = null;
        if (coffers) {
            // C `:2409–2420` — thank, stash, wizard-lock
            SetVoice(null, 0, 80, 0);
            await verbalize(
                'Thank you for your contribution to reduce the debt.',
            );
            freeinv(goldob);
            add_to_container(coffers, goldob);
            coffers.owt = weight(coffers);
            coffers.cknown = 0;
            if (!coffers.olocked) {
                // C `:2417` — boxdummy = cg.zeroobj, otyp = SPE_WIZARD_LOCK
                const boxdummy = { otyp: SPE_WIZARD_LOCK };
                await boxlock(coffers, boxdummy);
            }
        } else if ((lev?.looted | 0) !== T_LOOTED
            && (mon = makemon(courtmon(), x, y, NO_MM_FLAGS))) {
            // C `:2421–2428` — exchequer accepts the contribution
            freeinv(goldob);
            add_to_minv(mon, goldob);
            await pline('The exchequer accepts your contribution.');
            if (!rn2(10))
                lev.looted = T_LOOTED;
        } else {
            // C `:2429–2431`
            await You('drop %s.', doname(goldob));
            await dropx(goldob);
        }
    }
    return true;
}

/** C ref: pickup.c mon_beside */
function mon_beside(x, y) {
    for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
            if (m_at(x + i, y + j)) return true;
        }
    }
    return false;
}

/**
 * C ref: hack.c check_capacity — near_capacity >= EXT_ENCUMBER blocks.
 * @param {string|null} [str]
 * @returns {boolean} true when overloaded (C returns 1)
 */
function check_capacity(str) {
    if (near_capacity() >= EXT_ENCUMBER) {
        // caller may await pline; sync path uses fire-and-forget via game
        game._check_capacity_msg = str
            || "You can't do that while carrying so much stuff.";
        return true;
    }
    return false;
}

/**
 * C ref: pickup.c able_to_loot — tip/loot reachability gates.
 * Named omissions: usteed rider_cant_reach; Underwater tip carve-out;
 * hliquid wording.
 * @param {number} x
 * @param {number} y
 * @param {boolean} looting true=loot, false=tip
 */
async function able_to_loot(x, y, looting) {
    const verb = looting ? 'loot' : 'tip';
    const t = t_at(x, y);
    if (!can_reach_floor(!!(t && is_pit(t.ttyp)))) {
        await pline(`You can't reach the floor.`);
        return false;
    }
    if ((is_pool(x, y) && looting) || is_lava(x, y)) {
        await pline(
            `You cannot ${verb} things that are deep in the ${
                is_lava(x, y) ? 'lava' : 'water'
            }.`,
        );
        return false;
    }
    try {
        const md = await import('./mondata.js');
        if (md.nolimbs?.(game.youmonst?.data)) {
            await pline(`Without limbs, you cannot ${verb} anything.`);
            return false;
        }
    } catch {
        /* mondata optional */
    }
    if (looting && !freehand()) {
        await pline(
            `Without a free ${body_part_latebound(HAND)}, you cannot loot anything.`,
        );
        return false;
    }
    return true;
}

/**
 * C ref: pickup.c tipcontainer_gettarget `:3871–3948` — NHW_MENU PICK_ONE
 * `Where to tip the contents of <doname(box)>`: '-' "on the floor"
 * preselected dummy + blank + invent containers in invent order (skip box,
 * non-containers, known bag of tricks); first other container triggers
 * u_handsy() (may print); locked-known or no-hands rows excluded
 * (a_obj 0, 4-space indent, no invlet). n>1 dummy-first quirk;
 * n==-1 (ESC) sets cancelled.
 * @param {object} box
 * @returns {Promise<{target:object|null, cancelled:boolean}>}
 */
async function tipcontainer_gettarget(box) {
    const dummyobj = {};
    const rows = [];
    // C: tip-to-floor row first, MENU_ITEMFLAGS_SELECTED; blank separator.
    rows.push({
        obj: dummyobj, isDummy: true, selected: true, selector: '-', text: 'on the floor',
    });
    rows.push({ kind: 'blank' });
    let n_conts = 0;
    let hands_available = true;
    const ocKnown = (otyp) => !!(game.objects?.[otyp]?.oc_name_known);
    for (const otmp of (game.invent || [])) {
        if (!otmp || otmp === box) continue;
        // C: skip non-containers; known bag of tricks fails Is_container use.
        if (!Is_container(otmp)) continue;
        if ((otmp.otyp | 0) === BAG_OF_TRICKS && otmp.dknown && ocKnown(otmp.otyp)) continue;
        if (!n_conts++) hands_available = await u_handsy();
        // C: container-to-container needs free hands; locked-known excluded.
        const exclude = !hands_available || !!(otmp.olocked && otmp.lknown);
        let sel = '';
        if (!exclude) {
            sel = (typeof otmp.invlet === 'string') ? otmp.invlet
                : (otmp.invlet ? String.fromCharCode(otmp.invlet) : '');
        }
        rows.push({
            obj: exclude ? null : otmp,
            selected: false,
            selector: sel,
            text: `${exclude ? '    ' : ''}${doname(otmp)}`,
        });
    }
    // C: Sprintf(buf, "Where to tip the contents of %s", doname(box)).
    const title = `Where to tip the contents of ${doname(box)}`;
    let cancelled = false;
    for (;;) {
        const entries = [{ text: title, attr: ATR_INVERSE }, { text: '', attr: 0 }];
        for (const row of rows) {
            if (row.kind === 'blank') {
                entries.push({ text: '', attr: 0 });
                continue;
            }
            if (!row.obj) {
                entries.push({ text: row.text, attr: 0 });
                continue;
            }
            const mark = row.selected ? '*' : '-';
            entries.push({ text: `${row.selector} ${mark} ${row.text}`, attr: 0 });
        }
        await paint_corner_nhw_menu(entries, '(end) ');
        await flush_screen(1);
        const key = await nhgetch();
        await dismiss_nhw_menu();
        if (key === 27) {
            cancelled = true;
            break;
        }
        // C: \n \r space finish without toggling (tty select_menu PICK_ONE).
        if (key === 13 || key === 10 || key === 32) break;
        const ch = String.fromCharCode(key);
        const hit = rows.find((r) => r.obj && r.selector === ch);
        if (!hit) continue; // C nhbell; stay open
        hit.selected = !hit.selected;
        // C PICK_ONE: letter toggles then menu finishes.
        break;
    }
    if (cancelled) return { target: null, cancelled: true };
    const pick_list = rows.filter((r) => r.obj && r.selected);
    const n = pick_list.length;
    let otmp = n <= 0 ? null : pick_list[0].obj;
    // C: PICK_ONE with preselected item might return 2; take non-dummy.
    if (n > 1 && otmp === dummyobj) otmp = pick_list[1].obj;
    if (otmp === dummyobj) otmp = null; // floor
    return { target: otmp, cancelled: false };
}

// C ref: pickup.c tipcontainer_checks `:3680-3684` — TIPCHECK_foo enum,
// file-local in C, so module-local here.
const TIPCHECK_OK = 0;
const TIPCHECK_LOCKED = 1;
const TIPCHECK_TRAPPED = 2;
const TIPCHECK_CANNOT = 3;
const TIPCHECK_EMPTY = 4;

/**
 * C ref: pickup.c tipcontainer_checks `:3954-4055` — whole body in C order.
 * Pre-tip validation for #tip: BoT-target apply, lknown discovery, locked,
 * trapped, bag-or-horn emptying, quantum-cat, empty arms.
 * Callers (both wired in tipcontainer below): `:3724` source box with
 * allowempty FALSE, `:3726-3728` destination with allowempty TRUE.
 * Returns TIPCHECK_OK (tip it), LOCKED, TRAPPED, CANNOT (already done:
 * BoT-target applied or bag/horn emptied) or EMPTY.
 * chest_trap joins the existing trap.js edge (no new edge); carried is the
 * live eat.js export (imports.mjs IN-SCC verdict SAFE — hoisted function,
 * call-time read only); get_obj_location_quantum is the file-local flags=0
 * equivalent (identical arms: invent/floor/minvent, else null), so no new
 * timeout.js edge. bagotricks stays a dynamic apply.js import (static edge
 * would join the apply cycle). The quantum-cat message inlines Shk_Your's
 * carried rule (no second Shk_Your function).
 * Named omit: subfrombill after floor shop bag/horn (`:4029-4030`).
 * @param {object} box container the player wants to tip
 * @param {object|null} targetbox destination (horn of plenty)
 * @param {boolean} allowempty TIPCHECK_OK instead of TIPCHECK_EMPTY when empty
 * @returns {Promise<number>} TIPCHECK_* value
 */
async function tipcontainer_checks(box, targetbox, allowempty) {
    // C `:3962-3966` — undiscovered bag of tricks as the destination: apply
    // it once before even trying to tip the source box (D-2354: this arm
    // runs before the lknown/lock/trap checks; review 1320 ACCEPT).
    // Known BoT never reaches here (excluded from the target menu).
    if (targetbox && (targetbox.otyp | 0) === BAG_OF_TRICKS) {
        const seencount = { n: 0 };
        const { bagotricks } = await import('./apply.js');
        await bagotricks(targetbox, false, seencount);
        return TIPCHECK_CANNOT;
    }
    // C `:3972-3976` — discovering the lock jumps the gun on the
    // inventory display when carried.
    if (!box.lknown) {
        box.lknown = 1;
        if (carried(box)) update_inventory();
    }
    // C `:3978-3980`.
    if (box.olocked) {
        await pline(`${upstart(thesimpleoname(box))} is locked.`);
        return TIPCHECK_LOCKED;
    }
    // C `:3982-3992` — not reaching inside but still handling it: the trap
    // fires, and the turn is used even when it fails (multi >= 0 means
    // the blast did not paralyze the hero).
    if (box.otrapped) {
        await chest_trap(box, HAND, false);
        if ((game.multi | 0) >= 0) {
            nomul(-1);
            game.multi_reason = 'tipping a container';
            game.nomovemsg = '';
        }
        return TIPCHECK_TRAPPED;
    }
    // C `:3993-4032` — bag of tricks / horn of plenty: apply until empty.
    if ((box.otyp | 0) === BAG_OF_TRICKS || (box.otyp | 0) === HORN_OF_PLENTY) {
        let res = TIPCHECK_OK;
        const bag = (box.otyp | 0) === BAG_OF_TRICKS;
        const oldSpe = box.spe | 0;
        let seen = 0;
        let totseen = 0;
        // C: maybeshopgoods reads box->ox,oy before the location update below.
        const maybeshopgoods = !carried(box)
            && costly_spot(box.ox | 0, box.oy | 0);
        // C `:4001-4003` — the horn's destination must itself tip clean.
        if (targetbox
            && (res = await tipcontainer_checks(targetbox, null, true)) !== TIPCHECK_OK) {
            return res;
        }
        // C `:4005-4006` — a held box moves with the hero; floor is redundant.
        const bloc = get_obj_location_quantum(box);
        if (bloc) {
            box.ox = bloc.x | 0;
            box.oy = bloc.y | 0;
        }
        if (maybeshopgoods && !box.no_charge) {
            await addtobill(box, false, false, true);
        }
        do {
            if (bag) {
                const seencount = { n: seen };
                const { bagotricks } = await import('./apply.js');
                const n = await bagotricks(box, true, seencount);
                seen = seencount.n | 0;
                if (!n) break;
            } else if (!(await hornoplenty(box, true, targetbox))) {
                break;
            }
            // C re-adds stale seen on horn iterations (0 here — defined).
            totseen += seen;
        } while ((box.spe | 0) > 0);
        // C `:4023-4028` — check_unpaid wants a non-zero charge count.
        if ((box.spe | 0) < oldSpe) {
            if (bag && !totseen) await pline(nothing_seems_to_happen);
            box.spe = oldSpe;
            await check_unpaid_usage(box, true);
            box.spe = 0; // empty
            box.cknown = 1;
        }
        return TIPCHECK_CANNOT; // C: actually means 'already done'
    }
    // C `:4034-4045` — Schroedinger's box: observe before empty/spill. A live
    // cat leaves no contents (TIPCHECK_EMPTY); a corpse stays (TIPCHECK_OK).
    if (SchroedingersBox(box)) {
        let empty_it = false;
        await observe_quantum_cat(box, true, true);
        if (!Has_contents(box)) {
            // C: Shk_Your — 'Your ' when carried, 'The ' otherwise.
            await pline(`${carried(box) ? 'Your' : 'The'} box is now empty.`);
        } else {
            empty_it = true; // holds cat corpse
        }
        box.cknown = 1;
        return (empty_it || allowempty) ? TIPCHECK_OK : TIPCHECK_EMPTY;
    }
    // C `:4047-4051`.
    if (!allowempty && !Has_contents(box)) {
        box.cknown = 1;
        await pline(`${upstart(thesimpleoname(box))} is empty.`);
        return TIPCHECK_EMPTY;
    }
    return TIPCHECK_OK;
}

/**
 * C ref: pickup.c tipcontainer `:3688–3841` — whole body in C order.
 * `:3691` hero-start ox/oy + get_obj_location stamp; `:3706` gettarget menu
 * (cancelled returns); `:3722` maybeshopgoods snapshot; `:3724` source
 * checks; `:3726–3728` destination checks (allowempty); `:3732–3735`
 * highdrop/altarizing/cursed_mbag/loss; `:3736–3737` srcheld/dstheld;
 * `:3739–3741` swallow clears + terse; `:3742` cknown; `:3748–3756` header;
 * `:3758–3825` per-item loop (prefetch nobj; icebox thaw; cursed-mbag loss;
 * per-item shop bill; targetbox transfer incl. BoH explosion; highdrop
 * hitfloor; altar/doaltarobj else drop pline comma-list + dropy);
 * `:3827–3828` loss bill; `:3829–3834` owt/encumber; `:3837–3838` inventory.
 * C callers (all wired): `:3552` choose_tip_container_menu invent row,
 * `:3614` dotip floor-container ynq arm, `:3630` dotip getobj container arm.
 * get_obj_location_quantum is the file-local flags=0 equivalent (identical
 * arms; timeout.js edge would join the pickup→trap→timeout→do→pickup
 * cycle); hitfloor stays a dynamic dothrow.js import for the same reason;
 * doaltarobj/dropy (do.js), surface (sit.js), removed_from_icebox (muse.js)
 * are static (imports.mjs IN-SCC SAFE — hoisted, call-time read only).
 * Named omissions: none — every arm and callee is live or file-local.
 * Display sync (not in C): one newsym(ox, oy) after the loop; C leaves the
 * redraw to dropy→dropz per item and the transfer arm moves no floor glyph.
 * @param {object} box
 */
export async function tipcontainer(box) {
    if (!box) return;
    const u = game.u || {};
    // C `:3691` — ox/oy start at the hero; a locatable box overwrites them
    // and stamps box->ox,oy (held moves with hero; floor is redundant).
    let ox = u.ux | 0, oy = u.uy | 0;
    const bloc0 = get_obj_location_quantum(box);
    if (bloc0) {
        ox = bloc0.x | 0;
        oy = bloc0.y | 0;
        box.ox = ox;
        box.oy = oy;
    }
    // C `:3706` — target menu before any checks, even when empty.
    let targetbox = null;
    {
        const picked = await tipcontainer_gettarget(box);
        if (picked.cancelled) return;
        targetbox = picked.target;
    }
    // C `:3722` — shop-goods snapshot before the checks run.
    const maybeshopgoods = !carried(box)
        && costly_spot(box.ox | 0, box.oy | 0);
    // C `:3724` — the source box must tip clean.
    if ((await tipcontainer_checks(box, targetbox, false)) !== TIPCHECK_OK) return;
    // C `:3726–3728` — the destination must tip clean too (allowempty:
    // an empty target is fine).
    if (targetbox
        && (await tipcontainer_checks(targetbox, null, true)) !== TIPCHECK_OK) return;
    // C `:3732–3735`.
    let highdrop = !can_reach_floor(true);
    const levtyp = game.level?.at?.(ox, oy)?.typ | 0;
    let altarizing = IS_ALTAR(levtyp);
    const cursed_mbag = !!(Is_mbag(box) && box.cursed);
    let loss = 0;
    // C `:3736–3737`.
    const srcheld = carried(box);
    const dstheld = !!(targetbox && carried(targetbox));
    // C `:3739–3740` — swallowed clears both.
    if (u.uswallow) {
        highdrop = false;
        altarizing = false;
    }
    // C `:3741`.
    let terse = !(highdrop || altarizing || costly_spot(box.ox | 0, box.oy | 0));
    // C `:3742`.
    box.cknown = 1;
    // C `:3748–3756` — targetbox header vs floor spill header.
    if (targetbox) {
        await pline(
            '%s into %s.',
            box.cobj?.nobj ? 'Objects tumble' : 'An object tumbles',
            theArt(xname(targetbox)),
        );
    } else {
        await pline(
            '%s out%c',
            box.cobj?.nobj ? 'Objects spill' : 'An object spills',
            terse ? ':' : '.',
        );
    }
    // C iflags is always present; mirror it with one guarded handle.
    const iflags = game.iflags ?? (game.iflags = {});
    // C `:3758–3825` — nobj prefetched per item; the BoH arm stops the loop
    // by clearing nobj so it exits 'normally'.
    let nobj = null;
    for (let otmp = box.cobj; otmp; otmp = nobj) {
        nobj = otmp.nobj || null;
        obj_extract_self(otmp);
        otmp.ox = box.ox | 0;
        otmp.oy = box.oy | 0;
        if ((box.otyp | 0) === ICE_BOX) {
            // C `:3764–3766` — resume rotting for corpses.
            removed_from_icebox(otmp);
        } else if (cursed_mbag && is_boh_item_gone()) {
            // C `:3767–3772` — item vanishes; terse no longer appropriate.
            loss += await mbag_item_gone(srcheld, otmp, false);
            terse = false;
            continue;
        }
        if (maybeshopgoods) {
            // C `:3774–3777` — bill each item; doname runs price-suppressed.
            await addtobill(otmp, false, false, true);
            iflags.suppress_price = (iflags.suppress_price | 0) + 1;
        }
        if (targetbox) {
            // C `:3780–3805` — container-to-container transfer.
            if (Is_mbag(targetbox) && mbag_explodes(otmp, 0)) {
                livelog_printf(
                    LL_ACHIEVE,
                    'just blew up %s bag of holding via tipping',
                    uhis(),
                );
                await urgent_pline(
                    'As %s %s inside, you are blasted by a magical explosion!',
                    doname(otmp),
                    otense(otmp, 'tumble'),
                );
                // C: a bag of holding going in blows up first, then the
                // one it went into (targetbox is assumed carried, else
                // shop-bill handling would be needed here).
                if ((otmp.otyp | 0) === BAG_OF_HOLDING) {
                    await do_boh_explosion(otmp, !srcheld);
                }
                obfree(otmp, null);
                await do_boh_explosion(targetbox, !dstheld);
                if (dstheld) {
                    useup(targetbox);
                } else {
                    useupf(targetbox, targetbox.quan);
                }
                targetbox = null;
                nobj = null;
                losehp(d(6, 6), 'magical explosion', KILLED_BY_AN);
            } else {
                add_to_container(targetbox, otmp);
            }
        } else if (highdrop) {
            // C `:3807–3810` — might break or fall down stairs; hitfloor
            // handles altars itself.
            otmp.how_lost = LOST_DROPPED;
            const { hitfloor } = await import('./dothrow.js');
            await hitfloor(otmp, true);
        } else {
            // C `:3812–3823` — altar offering, verbose drop, or terse
            // comma-list (doname; last_msg marks the uninterrupted run).
            if (altarizing) {
                await doaltarobj(otmp);
            } else if (!terse) {
                await pline(
                    '%s %s to the %s.',
                    Doname2(otmp),
                    otense(otmp, 'drop'),
                    surface(ox, oy),
                );
            } else {
                await pline('%s%c', doname(otmp), nobj ? ',' : '.');
                iflags.last_msg = PLNMSG_OBJNAM_ONLY;
            }
            otmp.how_lost = LOST_DROPPED;
            await dropy(otmp);
            if (iflags.last_msg !== PLNMSG_OBJNAM_ONLY) {
                terse = false;
            }
        }
        if (maybeshopgoods) {
            iflags.suppress_price = (iflags.suppress_price | 0) - 1;
        }
    }
    // C `:3827–3828` — magic bag lost some shop goods.
    if (loss) {
        await You('owe %ld %s for lost merchandise.', loss, currency(loss));
    }
    // C `:3829–3832` — mbag_item_gone() doesn't update these.
    box.owt = weight(box);
    if (targetbox) {
        targetbox.owt = weight(targetbox);
    }
    // C `:3833–3834`.
    if (srcheld || dstheld) {
        await encumber_msg();
    }
    // Display sync (not in C): the spill site glyph changed.
    newsym(ox, oy);
    // C `:3837–3838`.
    if (srcheld || dstheld) {
        update_inventory();
    }
}

/**
 * C ref: pickup.c choose_tip_container_menu `:3500–3558` — NHW_MENU
 * PICK_ONE of floor containers plus a preselected dummy invent row.
 * tty_select_menu n: 0 toggle-off preselected; 1 Space/Return accept;
 * 2 picked something else (if pick_list[0] is dummy, use [1]);
 * -1 ESC. Named omissions: MENU_SEARCH, map_menu_cmd remaps,
 * multi-page, tty_nhbell.
 * @returns {Promise<number>} ECMD_*
 */
async function choose_tip_container_menu() {
    const dummyobj = {};
    const u = game.u;
    const rows = [];
    let i = 0;
    for (let otmp = objects_at(u.ux | 0, u.uy | 0); otmp;
        otmp = otmp.nexthere) {
        if (!Is_container(otmp)) continue;
        ++i;
        rows.push({
            obj: otmp,
            selected: false,
            selector: '',
            text: doname(otmp),
        });
    }
    // C: gi.invent — empty chain is NULL, not a zero-length array.
    const hasInvent = !!(game.invent && game.invent.length);
    if (hasInvent) {
        rows.push({ kind: 'blank' });
        // C: 'i' unless so many containers that 'i' is already used
        // (i > 'i'-'a') or flags.lootabc.
        const ch = (i <= ('i'.charCodeAt(0) - 'a'.charCodeAt(0))
            && !game.flags?.lootabc) ? 'i' : '';
        rows.push({
            obj: dummyobj,
            selected: true, // MENU_ITEMFLAGS_SELECTED
            selector: ch,
            text: 'tip something being carried',
        });
    }
    // C tty_end_menu: auto a..z/A.. for identifier && !selector.
    let menuCh = 'a';
    for (const row of rows) {
        if (row.kind === 'blank' || row.selector) continue;
        row.selector = menuCh;
        menuCh = menuCh === 'z' ? 'A'
            : String.fromCharCode(menuCh.charCodeAt(0) + 1);
    }

    let cancelled = false;
    for (;;) {
        const entries = [
            { text: 'Tip which container?', attr: ATR_INVERSE },
            { text: '', attr: 0 },
        ];
        for (const row of rows) {
            if (row.kind === 'blank') {
                entries.push({ text: '', attr: 0 });
                continue;
            }
            // C process_menu_window: str[2] '-' becomes '*' when selected.
            const mark = row.selected ? '*' : '-';
            entries.push({
                text: `${row.selector} ${mark} ${row.text}`,
                attr: 0,
            });
        }
        await paint_corner_nhw_menu(entries, '(end) ');
        await flush_screen(1);
        const key = await nhgetch();
        await dismiss_nhw_menu();

        if (key === 27) {
            cancelled = true;
            break;
        }
        // C: \n \r space on last page finish without toggling.
        if (key === 13 || key === 10 || key === 32) break;
        const ch = String.fromCharCode(key);
        const hit = rows.find((r) => r.obj && r.selector === ch);
        if (!hit) continue; // C nhbell; stay
        hit.selected = !hit.selected;
        // C PICK_ONE: letter toggles then finished (other selected stay).
        break;
    }

    if (cancelled) return ECMD_CANCEL;

    const pick_list = rows.filter((r) => r.obj && r.selected);
    const n = pick_list.length;
    let otmp = n <= 0 ? null : pick_list[0].obj;
    if (n > 1 && otmp === dummyobj) otmp = pick_list[1].obj;
    if (otmp && otmp !== dummyobj) {
        await tipcontainer(otmp);
        return ECMD_TIME;
    }
    return ECMD_OK;
}

/**
 * C ref: pickup.c tip_ok `:3480–3497` — COIN EXCLUDE; container / known
 * horn of plenty SUGGEST; else DOWNPLAY.
 */
function tip_ok(obj) {
    if (!obj || obj.oclass === COIN_CLASS) return GETOBJ_EXCLUDE;
    if (Is_container(obj)) return GETOBJ_SUGGEST;
    if ((obj.otyp | 0) === HORN_OF_PLENTY && obj.dknown
        && (game.objects?.[obj.otyp]?.oc_name_known)) {
        return GETOBJ_SUGGEST;
    }
    return GETOBJ_DOWNPLAY;
}

/**
 * C ref: pickup.c dotip — #tip empty container onto floor.
 * Ported: floor ynq (D-1654); m-prefix skip / TRADITIONAL boxes>1 gate;
 * getobj("tip", tip_ok, GETOBJ_PROMPT) + container/horn tipcontainer
 * (D-1665); choose_tip_container_menu when boxes>1 (D-1679).
 * Named omissions: candle/oil/grease/food/venom spill; statue.
 * Wires tiphat (sounds.js) when the tipped item is the worn helm.
 * @returns {Promise<number>} ECMD_*
 */
export async function dotip() {
    const u = game.u;
    if (!u) return ECMD_OK;

    const ccx = u.ux | 0;
    const ccy = u.uy | 0;
    const boxes = container_at(ccx, ccy, true);
    const style = game.flags?.menu_style ?? MENU_FULL;

    // C: floor first unless menu_requested (m-prefix) skips to invent,
    // except TRADITIONAL + boxes>1 still offers the floor menu.
    if (boxes > 0
        && (!game.iflags?.menu_requested
            || (style === MENU_TRADITIONAL && boxes > 1))) {
        const overloaded = check_capacity(
            `You can't tip ${boxes > 1 ? 'one' : 'it'} while carrying so much.`,
        );
        if (overloaded) {
            await pline(game._check_capacity_msg);
            game._check_capacity_msg = null;
        } else if (await able_to_loot(ccx, ccy, false)) {
            if (boxes > 1) {
                const res = await choose_tip_container_menu();
                if (res !== ECMD_OK) return res;
                /* else pick-from-gi.invent below */
            } else {
                for (let cobj = objects_at(ccx, ccy); cobj; cobj = cobj.nexthere) {
                    if (!Is_container(cobj)) continue;
                    const c = await yn_function(
                        safe_qbuf(null, 'There is ', ' here, tip it?',
                            cobj, doname, ansimpleoname, 'container'),
                        'ynq',
                        'q',
                    );
                    if (c === 'q') return ECMD_OK;
                    if (c === 'n') continue;
                    await tipcontainer(cobj);
                    return ECMD_TIME;
                }
            }
        }
    }

    const cobj = await getobj('tip', tip_ok, GETOBJ_PROMPT);
    if (!cobj) return ECMD_CANCEL;

    if (Is_container(cobj) || (cobj.otyp | 0) === HORN_OF_PLENTY) {
        await tipcontainer(cobj);
        return ECMD_TIME;
    }
    if (cobj.oclass === POTION_CLASS) {
        await pline(`The ${xname(cobj)} ${otense(cobj, 'are')} securely sealed.`);
        return ECMD_OK;
    }
    // C pickup.c `:3670–3671`: tipping the worn helm tips it at a monster
    if (u.uarmh && cobj === u.uarmh)
        return (await tiphat()) ? ECMD_TIME : ECMD_OK;
    /* spill / statue named */
    await pline(nothing_happens);
    return ECMD_OK;
}
