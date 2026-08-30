// pickup.js — Floor look / autopickup / manual `,` pickup.
// C ref: pickup.c — check_here(), pickup(), pickup_object(), pick_obj(),
//        describe_decor(), observe_quantum_cat, use_container, tipcontainer,
//        query_category, query_objlist, is_worn_by_type;
//        hack.c — spoteffects(), dopickup(), pickup_checks().

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import {
    objects_at, obj_extract_self, splitobj, weight, add_to_container,
    place_object, hornoplenty, unbless, mergable, delobj, set_corpsenm,
    unsplitobj,
} from './mkobj.js';
import {
    look_here, observe_object, dfeature_at, paint_corner_nhw_menu,
    dismiss_nhw_menu, sortloot,
    let_to_name, DEF_INV_ORDER, prinv, near_capacity, calc_capacity,
    max_capacity, compactify_invlets, getobj_take_count, getobj_apply_count,
    getobj_from_cmdq, getobj_display_pickinv, freeinv, display_inventory,
    splittable, will_feel_cockatrice, is_worn, not_fully_identified,
    taking_off, count_unpaid, getobj,
} from './invent.js';
import { nomul, check_special_room, is_pool, is_lava, in_rooms, dosinkfall, SURFACE_AT, switch_terrain } from './hack.js';
import {
    flush_screen, pline, newsym, docrt, bot, flush_topl_more, canseemon,
    canspotmon, Hallucination, clear_nhwindow_message, Norep, impossible,
} from './display.js';
import { addinv } from './u_init.js';
import {
    an, doname, xname, cxname, cxname_singular, xprname,
    the as theArt, The, body_part_latebound, vtense,
    safe_qbuf, ansimpleoname, otense,
    yname as yname_objnam, Yname2,
    ysimple_name as ysimple_name_objnam,
    Ysimple_name2 as Ysimple_name2_objnam,
} from './objnam.js';
import { can_reach_floor } from './engrave.js';
import {
    ECMD_OK, ECMD_TIME, ECMD_CANCEL, OBJ_FLOOR, OBJ_INVENT, OBJ_MINVENT,
    OBJ_FREE, OBJ_CONTAINED,
    is_pit, LOST_DROPPED,
    STONE, ICE, MAX_TYPE,
    IS_POOL, IS_LAVA, IS_FURNITURE, IS_WATERWALL, IS_SINK,
    LOOKHERE_PICKED_SOME, LOOKHERE_SKIP_DFEATURE, LOOKHERE_NOFLAGS,
    Has_contents, Is_container, Is_box,
    Never_mind,
    GETOBJ_EXCLUDE, GETOBJ_SUGGEST, GETOBJ_EXCLUDE_SELECTABLE,
    GETOBJ_DOWNPLAY, GETOBJ_PROMPT,
    W_ARMOR, W_ACCESSORY, W_WEAPONS,
    SORTLOOT_PACK, SORTLOOT_LOOT, SORTLOOT_INVLET, SORTLOOT_PETRIFY,
    ALL_TYPES_SELECTED, BUC_BLESSED, BUC_CURSED, BUC_UNCURSED, BUC_UNKNOWN,
    UNPAID_TYPES, WORN_TYPES, ALL_TYPES, BILLED_TYPES, CHOOSE_ALL, JUSTPICKED,
    BY_NEXTHERE, USE_INVLET, INVORDER_SORT, SIGNAL_NOMENU, SIGNAL_ESCAPE,
    AUTOSELECT_SINGLE, FEEL_COCKATRICE, INCLUDE_VENOM,
    MENU_INVERT_ALL, MENU_SELECT_ALL, MENU_UNSELECT_ALL,
    MENU_ITEMFLAGS_NONE, MENU_ITEMFLAGS_SKIPINVERT, PICK_NONE, PICK_ONE,
    MENU_TRADITIONAL, MENU_COMBINATION, MENU_FULL,
    SHOPBASE,
    SLT_ENCUMBER, MOD_ENCUMBER, HVY_ENCUMBER, EXT_ENCUMBER,
    AUTOUNLOCK_APPLY_KEY,
    nothing_seems_to_happen, nothing_happens, something, engulfing_u,
    HAND, FOOT, NO_MINVENT, MM_ADJACENTOK, MM_NOMSG, ONAME_NO_FLAGS,
} from './const.js';
import { t_at, dotrap, NO_TRAP_FLAGS, drown, lava_effects, instapetrify } from './trap.js';
import { nhgetch } from './input.js';
import { m_at } from './mon.js';
import { oclass_to_sym, select_menu_pick_any, select_menu_pick_one } from './options.js';
import {
    objectNames, COIN_CLASS, VENOM_CLASS, POTION_CLASS,
    def_oc_syms, def_char_to_objclass,
} from './objects.js';
import { ATR_INVERSE } from './terminal.js';
import {
    addtobill, costly_spot, check_unpaid_usage, is_unpaid, doname_with_price,
    remote_burglary,
} from './shk.js';
import {
    nohands, M1_NOTAKE, touch_petrifies, poly_when_stoned, is_rider, mons,
    monsterNames,
} from './monsters.js';
import { welded, weldmsg, setuwep, setuswapwep, setuqwep } from './wield.js';
import { yn_function, getlin } from './getline.js';
import { highc } from './hacklib.js';
import { show_nhw_menu_text } from './pager.js';
import { cansee } from './vision.js';
import { touch_artifact, youmonst } from './artifact.js';
import { exercise, A_WIS } from './attrib.js';
import { inv_cnt } from './steal.js';
import { trycall, Monnam, christen_monst, oname, rndmonnam } from './do_name.js';
import { makemon, set_malign } from './makemon.js';
import { more_experienced, newexplevel } from './exper.js';

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

const BAG_OF_TRICKS = objectNames.indexOf('BAG_OF_TRICKS');
const HORN_OF_PLENTY = objectNames.indexOf('HORN_OF_PLENTY');
const LARGE_BOX = objectNames.indexOf('LARGE_BOX');
const CORPSE = objectNames.indexOf('CORPSE');
const SCR_SCARE_MONSTER = objectNames.indexOf('SCR_SCARE_MONSTER');
const LOADSTONE = objectNames.indexOf('LOADSTONE');
const BOULDER = objectNames.indexOf('BOULDER');
const ICE_BOX = objectNames.indexOf('ICE_BOX');
const STATUE = objectNames.indexOf('STATUE');
const AMULET_OF_YENDOR = objectNames.indexOf('AMULET_OF_YENDOR');
const CANDELABRUM_OF_INVOCATION = objectNames.indexOf('CANDELABRUM_OF_INVOCATION');
const BELL_OF_OPENING = objectNames.indexOf('BELL_OF_OPENING');
const SPE_BOOK_OF_THE_DEAD = objectNames.indexOf('SPE_BOOK_OF_THE_DEAD');
const LEASH = objectNames.indexOf('LEASH');
const GOLD_SYM = '$';
const PM_STONE_GOLEM = monsterNames.indexOf('PM_STONE_GOLEM');
const PM_HOUSECAT = monsterNames.indexOf('PM_HOUSECAT');
/* C hack.h invlet_basic — a-zA-Z invent slots. */
const INVLET_BASIC = 52;
/* C hack.h stoning_checks — u_safe_from_fatal_corpse tests. */
const st_gloves = 0x1;
const st_corpse = 0x2;
const st_petrifies = 0x4;
const st_resists = 0x8;
const st_all = st_gloves | st_corpse | st_petrifies | st_resists;

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

/** C pickup.c allow_category. Priest bknown / ParanoidAutoAll named. */
export function allow_category(obj) {
    if (!obj) return false;
    if (!game.class_filter && !game.shop_filter && !game.bucx_filter
        && !game.picked_filter) {
        return false;
    }
    const vmc = game.valid_menu_classes || [];
    if (obj.oclass === COIN_CLASS && game.class_filter) {
        return vmc.includes(COIN_CLASS);
    }
    if (game.class_filter && !vmc.includes(obj.oclass)) return false;
    if (game.shop_filter && !is_unpaid(obj)) return false;
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
    if (game.picked_filter && !obj.pickup_prev) return false;
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
 * CHOOSE_ALL rows when the flag is set; ParanoidAutoAll yn named omit
 * (verify_All stays false). INCLUDE_VENOM via inv_order_pack; menu_head_objsym
 * live. PICK_ONE (dotypeinv D-1687) uses select_menu_pick_one.
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
        if (game.iflags?.cmdassist !== false) {
            items.push({
                selectable: false,
                text: '    (ignored unless some other choices are also picked)',
            });
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

    /* C: 'A' by itself without ParanoidAutoAll is rejected. */
    if (picked.length === 1 && picked[0].a_int === 'A') {
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

function tally_BUCX_list(objs, here) {
    const t = { b: 0, u: 0, c: 0, x: 0, o: 0, j: 0 };
    walk_obj_list(objs, here, (list) => {
        if (list.pickup_prev) t.j++;
        if (list.oclass === COIN_CLASS) {
            if (game.flags?.goldX) t.x++;
            else t.u++;
            return;
        }
        if (!list.bknown) t.x++;
        else if (list.blessed) t.b++;
        else if (list.cursed) t.c++;
        else t.u++;
    });
    return t;
}

/**
 * C ref: pickup.c describe_decor — mention_decor feedback for features.
 * Branch envelope: dfeature_at + skip open door/doorway; furniture/typ
 * change gate; verbose "There is %s here." Named omissions: Fumbling
 * deferred_decor, waterbody_name swamp/pool rename, ice Norep,
 * back_on_ground after pool/lava/ice, decor_fumble/levitate overrides.
 */
export async function describe_decor() {
    const u = game.u;
    if (!u) return false;

    if (!game.iflags) game.iflags = {};
    const iflags = game.iflags;
    if (iflags.prev_decor == null) iflags.prev_decor = STONE;

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
        // waterbody_name deferred — keep "pool of water"
        void waterhere;
        if (dfeature !== 'swamp' && ltyp !== ICE) {
            dfeature = an(dfeature);
        }
        let outbuf;
        if (game.flags?.verbose !== false) {
            outbuf = `There is ${dfeature} here.`;
        } else {
            outbuf = `${upstart(dfeature)}.`;
        }
        // C: ICE + mention_decor → Norep; use pline for all (Norep deferred)
        await pline(outbuf);
    } else if (!u.Underwater) {
        // C: back_on_ground when leaving pool/lava/ice — deferred
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
 * C ref: pickup.c pick_obj — extract from floor/minvent, addinv.
 * Shop robshop: temporary ushops → addtobill → restore; remote_burglary
 * when unpaid from outside the shop (D-1717).
 * Named omissions: engulfer minvent path (get_obj_location swallow).
 */
export async function pick_obj(otmp) {
    if (!otmp) return otmp;
    const u = game.u;
    const ox = otmp.ox | 0;
    const oy = otmp.oy | 0;
    const fromfloor = otmp.where === OBJ_FLOOR;
    let robshop = !!(u && !u.uswallow && otmp !== u.uball && costly_spot(ox, oy));

    obj_extract_self(otmp);
    if (fromfloor) newsym(ox, oy);

    if (robshop) {
        const saveushops = u.ushops || '';
        const fakeshop = in_rooms(ox, oy, SHOPBASE).charAt(0) || '';
        u.ushops = fakeshop;
        await addtobill(otmp, true, false, false);
        u.ushops = saveushops;
        robshop = !!(otmp.unpaid && fakeshop && !saveushops.includes(fakeshop));
    }

    const result = await addinv(otmp);
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

function money_cnt_invent() {
    let n = 0;
    for (const otmp of game.invent || []) {
        if (otmp.oclass === COIN_CLASS) n += otmp.quan || 0;
    }
    return n;
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
function merge_choice_invent(obj) {
    if (!obj || (obj.otyp | 0) === SCR_SCARE_MONSTER) return null;
    for (const otmp of game.invent || []) {
        if (mergable(otmp, obj)) return otmp;
    }
    return null;
}

/**
 * C ref: pickup.c u_safe_from_fatal_corpse — any listed test is enough.
 */
function u_safe_from_fatal_corpse(obj, tests) {
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
 * C ref: pickup.c carry_count — how many of obj can we lift.
 * Floor path only (container/delta_cwt named omit — pickup_object
 * always passes container NULL).
 */
async function carry_count(obj, count, telekinesis, wts) {
    const is_gold = obj.oclass === COIN_CLASS;
    const savequan = obj.quan || 1;
    const saveowt = obj.owt | 0;
    const umoney = money_cnt_invent();
    let iw = max_capacity();
    let wt;

    if (count !== savequan) {
        obj.quan = count;
        obj.owt = weight(obj);
    }
    wt = iw + (obj.owt | 0);
    if (is_gold) {
        wt -= (GOLD_WT(umoney) + GOLD_WT(count) - GOLD_WT(umoney + count));
    }
    if (count !== savequan) {
        obj.quan = savequan;
        obj.owt = saveowt;
    }
    wts.before = iw;
    wts.after = wt;
    if (wt < 0) return count;

    let qq;
    if (is_gold) {
        iw -= GOLD_WT(umoney) | 0;
        qq = GOLD_CAPACITY(iw, umoney);
        if (qq < 0) qq = 0;
        else if (qq > count) qq = count;
        wt = iw + GOLD_WT(umoney + qq);
    } else if (count > 1 || count < (obj.quan || 1)) {
        qq = 1;
        for (; qq <= count; qq++) {
            obj.quan = qq;
            const ow = weight(obj);
            obj.owt = ow;
            if (iw + ow >= 0) break;
            wt = iw + ow;
        }
        qq -= 1;
    } else {
        qq = 0;
    }
    obj.quan = savequan;
    obj.owt = saveowt;

    if (qq < count) {
        const obj_nambuf = doname(obj);
        const where = 'lying here';
        const verb = telekinesis ? 'acquire' : 'lift';
        if (qq > 0) {
            await pline(
                `You can only ${verb} ${qq === 1 ? 'one' : 'some'} of the ${obj_nambuf} ${where}.`,
            );
            wts.after = wt;
            return qq;
        }
        const inventOrGold = (game.invent && game.invent.length) || umoney;
        const prefx1 = inventOrGold ? 'you cannot ' : ((obj.quan || 1) === 1 ? 'it ' : 'even one ');
        const prefx2 = inventOrGold ? '' : 'is too heavy for you to ';
        const suffx = inventOrGold ? ' any more' : '';
        await pline(
            `There ${otense_pickup(obj, 'are')} ${obj_nambuf} here, but ${prefx1}${prefx2}${verb}${suffx}.`,
        );
        return 0;
    }
    return qq;
}

/**
 * C ref: pickup.c lift_object — willing/able to carry. telekinesis
 * skips the ynq Continue? and refuses when encumbrance would rise.
 * Sokoban boulder uses body_part(HAND) (latebound; polyself→do→pickup cycle).
 * Named omit: LOADSTONE/giant-boulder weight override; container path;
 * shop no_charge merge_choice.
 */
async function lift_object(obj, cntRef, telekinesis) {
    // C: #define Sokoban svl.level.flags.sokoban_rules — not In_sokoban.
    const Sokoban = !!(game.level?.flags?.sokoban_rules || game.Sokoban);
    if ((obj.otyp | 0) === BOULDER && Sokoban) {
        await pline(
            `You cannot get your ${body_part_latebound(HAND)} around this ${xname(obj)}.`,
        );
        return -1;
    }
    cntRef.count = await carry_count(obj, cntRef.count, telekinesis, cntRef);
    if (cntRef.count < 1) return -1;
    if (obj.oclass !== COIN_CLASS
        && inv_cnt(false) >= INVLET_BASIC
        && !merge_choice_invent(obj)) {
        await pline('Your knapsack cannot accommodate any more items.');
        return -1;
    }
    let result = 1;
    let prev_encumbr = near_capacity();
    const burden = flags_pickup_burden();
    if (prev_encumbr < burden) prev_encumbr = burden;
    const next_encumbr = calc_capacity(cntRef.after - cntRef.before);
    if (next_encumbr > prev_encumbr) {
        if (telekinesis) {
            result = 0;
        } else {
            const pfx = next_encumbr >= EXT_ENCUMBER ? overloadpfx
                : next_encumbr >= HVY_ENCUMBER ? nearloadpfx
                    : next_encumbr >= MOD_ENCUMBER ? moderateloadpfx
                        : slightloadpfx;
            const savequan = obj.quan;
            obj.quan = cntRef.count;
            // C: Sprintf prefix then safe_qbuf(qbuf, qbuf, ".  Continue?",
            // doname, ansimpleoname, something). Container "removing" named.
            let qbuf = `${pfx} lifting `;
            qbuf = safe_qbuf(qbuf, qbuf, '.  Continue?', obj, doname,
                ansimpleoname, something);
            obj.quan = savequan;
            const ans = await yn_function(qbuf, 'ynq', 'q');
            if (ans === 'q') result = -1;
            else if (ans === 'n') result = 0;
            clear_nhwindow_message();
        }
    }
    if ((obj.otyp | 0) === SCR_SCARE_MONSTER && result <= 0) obj.spe = 0;
    return result;
}

/**
 * C ref: pickup.c pickup_object — lift one floor/minvent object into invent.
 * Branch envelope: observe_object; telekinesis through corpse/scare/
 * lift_object (D-1050); gold disp.botl; splitobj; pick_obj + prinv.
 * Named omissions: LOADSTONE no-split already honored; ghostly
 * fix_ghostly_obj; LOADSTONE/giant-boulder weight override;
 * container carry_count; Death/Pestilence revive suffixes.
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
    if (obj.oartifact && !touch_artifact(obj, youmonst)) return 0;

    if ((obj.otyp | 0) === CORPSE) {
        if (await fatal_corpse_mistake(obj, remotely)
            || await rider_corpse_revival(obj, remotely)) {
            return -1;
        }
    } else if ((obj.otyp | 0) === SCR_SCARE_MONSTER) {
        const scareWts = { before: 0, after: 0 };
        // C scare carry_count always FALSE even on telekinesis pickup.
        count = await carry_count(obj, count, false, scareWts);
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

    const lifted = { count, before: 0, after: 0 };
    const res = await lift_object(obj, lifted, remotely);
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
 * Sort: sortloot(SORTLOOT_LOOT|PACK|PETRIFY) + nexthere (D-0405, D-1599).
 * FEEL_COCKATRICE: will_feel during walk → look_here(0) abort (no menu).
 * Named omissions: count-N; menu_head_objsym; INCLUDE_VENOM;
 * engulfer; loot_classify subclass/disco/BUCX; SKIPINVERT;
 * page invert/search; doloot Blind !uarmg feel before containers.
 * Floor TRADITIONAL query_classes is D-1620 (`pickup_traditional_floor`).
 *
 * @param {object[]} objList pile in nexthere order (head first)
 * @param {((o: object) => boolean)|null} [extraAllow] C allow_category
 *        for traditional 'm' via_menu==-3; omit/null is C allow_all
 */
async function query_objlist_pickup(objList, extraAllow = null) {
    const flags = game.flags || {};
    const doSort = flags.sortpack !== false;
    // C: sortflags — sortloot 'l'/'f' + !USE_INVLET → SORTLOOT_LOOT;
    // sortpack → SORTLOOT_PACK; FEEL_COCKATRICE → SORTLOOT_PETRIFY.
    // Floor pile is a nexthere chain.
    const sortlootOpt = flags.sortloot ?? 'l';
    let sortflags = SORTLOOT_PETRIFY;
    if (sortlootOpt === 'l' || sortlootOpt === 'f') sortflags |= SORTLOOT_LOOT;
    if (doSort) sortflags |= SORTLOOT_PACK;

    const allowSet = new Set(objList);
    const allow = (o) => allowSet.has(o) && (!extraAllow || extraAllow(o));
    const head = objList[0] || null;
    const ranked = head ? sortloot(head, sortflags, true, allow) : [];

    const items = [];
    let nextLet = 'a'.charCodeAt(0);
    let first = true;
    for (const { obj } of ranked) {
        // C query_objlist `:1111–1116` — FEEL_COCKATRICE CORPSE will_feel
        // destroys the menu and reverts to look_here(0, LOOKHERE_NOFLAGS).
        if ((obj.otyp | 0) === CORPSE && will_feel_cockatrice(obj, false)) {
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
            { text: 'Pick up what?', attr: ATR_INVERSE },
            { text: '', attr: 0 },
        ];
        if (doSort) {
            let lastClass = null;
            for (const it of items) {
                if (it.oclass !== lastClass) {
                    entries.push({
                        text: let_to_name(it.oclass, false, false),
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
        const hit = items.find((it) => it.letch === ch);
        if (hit) hit.selected = !hit.selected;
        // invalid → re-prompt
    }
}

/**
 * C ref: pickup.c autopick_testobj — pickup_types symbol filter.
 * JS pickup_types is the display-symbol string; empty ⇒ all classes.
 * Deferred: costly_spot shop reject, pickup_thrown/stolen/nopick_dropped,
 * how_lost, autopickup exceptions.
 */
function autopick_testobj(otmp) {
    const otypes = String(game.flags?.pickup_types || '');
    if (!otypes) return true;
    const sym = oclass_to_sym(otmp.oclass);
    return !!(sym && otypes.includes(sym));
}

/**
 * C ref: pickup.c pickup(what).
 * Ported envelope: autopickup && (nopick / !OBJ_AT / pool / lava) →
 * describe_decor + read_engr_at; **multi/!pickup/notake** share one
 * gate (C pickup.c) so notake still plines under autopickup when
 * `flags.pickup` is off (D-0928 #1127); autopick filter (D-0368) then
 * **always** check_here(n_picked>0) (D-0387); manual `,`
 * AUTOSELECT_SINGLE / multi query_objlist PICK_ANY (D-0365).
 * MENU_TRADITIONAL && !menu_requested && ct>=2: There + query_classes
 * then yn/pickup_object (D-1620). 'm' → query_objlist_pickup.
 * Deferred: unconscious skip, hideunder, newsym_force, full is_pool,
 * engulfer minvent traditional, safe_qbuf truncation.
 */
export async function pickup(what) {
    const autopickup = what > 0;
    const count = what < 0 ? -what : 0;
    const u = game.u;
    if (!u) return 0;

    // C: gp.pickup_encumbrance = 0 — used by pickup_object for load feedback
    game.pickup_encumbrance = 0;

    // C: autopickup && (nopick || !OBJ_AT || pool || lava)
    if (autopickup) {
        const loc = game.level?.at(u.ux, u.uy);
        const typ = loc?.typ;
        const poolish = IS_POOL(typ) && !u.Underwater;
        const lavaish = IS_LAVA(typ);
        if (game.context?.nopick || !objects_at(u.ux, u.uy)
            || poolish || lavaish) {
            if (game.flags?.mention_decor) await describe_decor();
            const { read_engr_at } = await import('./engrave.js');
            await read_engr_at(u.ux, u.uy);
            return 0;
        }
    }

    if (!can_reach_floor(true)) {
        // C: describe_decor even when !mention_decor; read_engr arms partial
        await describe_decor();
        return 0;
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
    try {
        const objList = [];
        for (let obj = objects_at(u.ux, u.uy); obj; obj = obj.nexthere) {
            objList.push(obj);
        }
        // C: autopick → filter by pickup_types before picking
        const eligible = autopickup
            ? objList.filter((o) => autopick_testobj(o))
            : objList;
        const ct = eligible.length;

        if (autopickup) {
            // C: autopick → menu_pickup loop → check_here(n_picked > 0)
            // even when n==0 (ineligible / filtered objects still shown).
            const nTried = eligible.length; // C: n_tried = n before loop
            let nPicked = 0;
            // C: if (n > 0) reset_justpicked(invent) before pickup_object loop
            if (nTried > 0) reset_justpicked(game.invent);
            for (const otmp of eligible) {
                const res = await pickup_object(otmp, 0, false);
                if (res < 0) break;
                nPicked += res;
            }
            if (!u.uswallow) {
                // hideunder / newsym_force deferred
                await check_here(nPicked > 0);
            }
            return nTried > 0 ? 1 : 0;
        }

        if (ct === 0) return 0;

        // C: menu AUTOSELECT_SINGLE / traditional ct==1 && !count for-loop
        // both pick the lone object without a prompt.
        if (ct === 1) {
            const first = eligible[0];
            const lcount = count > 0
                ? Math.min(first.quan || 1, count)
                : 0;
            reset_justpicked(game.invent);
            const res = await pickup_object(first, lcount, false);
            return res > 0 ? 1 : 0;
        }

        // C: flags.menu_style != MENU_TRADITIONAL || iflags.menu_requested
        const style = game.flags?.menu_style ?? MENU_FULL;
        if (style === MENU_TRADITIONAL && !game.iflags?.menu_requested) {
            return await pickup_traditional_floor(objList[0] || null, count);
        }

        // C: query_objlist("Pick up what?", …, PICK_ANY) then pickup_object
        const pickList = await query_objlist_pickup(eligible);
        if (!pickList.length) return 0;
        reset_justpicked(game.invent);
        let nTried = 0;
        for (const obj of pickList) {
            if (!obj || obj.where !== OBJ_FLOOR) continue;
            const lcount = count > 0
                ? Math.min(obj.quan || 1, count)
                : 0;
            const res = await pickup_object(obj, lcount, false);
            if (res < 0) break;
            nTried += res;
        }
        return nTried > 0 ? 1 : 0;
    } finally {
        // C pickupdone: gp.pickup_encumbrance = 0; add_valid_menu_class(0)
        game.pickup_encumbrance = 0;
        add_valid_menu_class(0);
    }
}

/**
 * C ref: hack.c pickup_checks — preflight for #pickup / `,`.
 * Returns >=0 → dopickup done (1=TIME, 0=OK); -1 → normal pickup;
 * -2 engulfer loot deferred as 0.
 * Named omissions: pool/lava dive plines; furniture-specific nothing msgs
 * (generic "nothing here" used); engulfer tongue/loot_mon.
 */
function pickup_checks() {
    const u = game.u;
    if (!u) return 0;

    if (u.uswallow) {
        // loot_mon / tongue paths deferred
        return 0;
    }
    if (!objects_at(u.ux, u.uy)) return 0; // nothing / furniture → ECMD_OK
    if (!can_reach_floor(true)) return 0;
    return -1;
}

/**
 * C ref: hack.c dopickup — `#pickup` / `,` command.
 * Clears multi + command_count; pickup_checks then pickup(-count).
 */
export async function dopickup() {
    const count = (game.context?.command_count | 0);
    if (game.context) game.context.command_count = 0;
    game.multi = 0;

    const ret = pickup_checks();
    if (ret >= 0) {
        if (ret === 0 && !objects_at(game.u?.ux, game.u?.uy)) {
            await pline('There is nothing here to pick up.');
        }
        return ret ? ECMD_TIME : ECMD_OK;
    }
    // ret == -1: normal floor pickup
    const tried = await pickup(-count);
    return tried ? ECMD_TIME : ECMD_OK;
}

/**
 * C ref: hack.c pooleffects(newspot).
 * Branch envelope: enter pool/lava → drown/lava_effects; leave-water /
 * set_uinwater / steed / ceiling_hider / Wwalking arms deferred.
 * @returns {Promise<boolean>} true → skip rest of spoteffects
 */
export async function pooleffects(newspot) {
    const u = game.u;
    if (!u) return false;

    // leaving-water arm deferred

    if (!u.ustuck && !u.Levitation && !u.Flying
        && (is_pool(u.ux, u.uy) || is_lava(u.ux, u.uy))) {
        // steed / ceiling_hider deferred
        if (is_lava(u.ux, u.uy)) {
            if (await lava_effects()) return true;
        } else {
            // C: (!Wwalking || waterwall) && (newspot || !uinwater || !(Swim|…))
            const typ = game.level?.at(u.ux, u.uy)?.typ;
            const waterwall = IS_WATERWALL(typ);
            if (waterwall || newspot || !u.uinwater) {
                if (await drown()) return true;
            }
        }
    }
    return false;
}

/**
 * C ref: hack.c spoteffects(pick).
 * Ported envelope: dest-typ / MAX_TYPE switch_terrain (D-1268) before
 * pooleffects; check_special_room; IS_SINK+Levitation dosinkfall
 * (D-0976); when !in_steed_dismounting — non-pit pickup then dotrap
 * then pit pickup.
 * Deferred: recursion guards, levitation timeout adjust, Warning ice,
 * hidden monster surprise. digactualhole PIT/HOLE is D-1269.
 * **maketrap PIT/HOLE set_levltyp D-1280**.
 * dothrow hurtle / u_on_rndspot / objnam wish still call
 * switch_terrain themselves. set_uinwater is D-1267.
 */
export async function spoteffects(pick) {
    const u = game.u;
    if (u) {
        /* C hack.c:3342–3347 — moving onto different terrain may toggle
         * Lev/Fly. Level change sets <ux0,uy0> to <ux,uy> so dest==origin
         * then, but also sets iflags.terrain_typ = MAX_TYPE. */
        const dest = game.level?.at(u.ux | 0, u.uy | 0);
        const orig = game.level?.at(u.ux0 | 0, u.uy0 | 0);
        if ((dest?.typ | 0) !== (orig?.typ | 0)
            || (game.iflags?.terrain_typ | 0) === MAX_TYPE) {
            await switch_terrain();
        }
    }

    if (await pooleffects(true)) return;

    await check_special_room(false);

    if (u) {
        const typ = game.level?.at(u.ux | 0, u.uy | 0)?.typ;
        if (IS_SINK(typ) && Levitation_pe()) {
            await dosinkfall();
            if (game.program_state?.gameover) return;
        }
    }

    // C: entire pickup/dotrap block gated on !gi.in_steed_dismounting
    if (game.in_steed_dismounting) return;
    if (!u) return;

    const trap = t_at(u.ux, u.uy);
    const pit = !!(trap && is_pit(trap.ttyp));
    if (pick && !pit) await pickup(1);
    if (trap) await dotrap(trap, NO_TRAP_FLAGS);
    if (pick && pit) await pickup(1);
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
 * C ref: pickup.c out_container — remove one object from current_container
 * into invent. Branch envelope: gold / ordinary; lift always ok. Named
 * omissions: container `lift_object`/`delta_cwt` (floor path is D-1050);
 * artifact touch; fatal corpse; split count; icebox; shop bill; pick_pick.
 * @returns {number} -1 stop, 1 removed, 0 not removed
 */
async function out_container(obj) {
    if (!obj || !game._current_container) return -1;
    const is_gold = obj.oclass === COIN_CLASS;
    if (is_gold) obj.owt = weight(obj);

    // lift_object deferred — always allow
    // C: count before addinv merge (gold may grow; prinv total_of needs it)
    const count = obj.quan || 1;
    obj_extract_self(obj);
    game._current_container.owt = weight(game._current_container);

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
    const simple = thesimpleoname(obj); // "the bag"
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
 * C ref: pickup.c query_category for MENU_FULL menu_loot.
 * Shared put-in / take-out category filter. `@` = MENU_INVERT_ALL
 * (skipInvert rows untouched). Named omissions: unpaid/billed;
 * ParanoidAutoAll; WORN_TYPES; venom.
 */
async function query_loot_category(olist, prompt) {
    const classes = [];
    for (const oc of DEF_INV_ORDER) {
        if (olist.some((o) => o.oclass === oc)) classes.push(oc);
    }
    const showAll = classes.length > 1;

    const doBlessed = count_buc(olist, BUC_BLESSED) > 0;
    const doCursed = count_buc(olist, BUC_CURSED) > 0;
    const doUncursed = count_buc(olist, BUC_UNCURSED) > 0;
    const doUnknown = count_buc(olist, BUC_UNKNOWN) > 0;

    const rows = [];
    rows.push({
        sel: 'A', accel: null, value: 'A', skipInvert: true,
        label: 'Auto-select every relevant item',
    });
    rows.push({ kind: 'hint', label: '    (ignored unless some other choices are also picked)' });
    rows.push({ kind: 'blank' });
    let invlet = 'a'.charCodeAt(0);
    if (showAll) {
        rows.push({
            sel: String.fromCharCode(invlet++), accel: null,
            value: ALL_TYPES_SELECTED, skipInvert: true,
            label: 'All types',
        });
    }
    for (const oc of classes) {
        const sel = String.fromCharCode(invlet++);
        rows.push({
            sel, accel: oclass_to_sym(oc) || null, value: oc, skipInvert: false,
            label: let_to_name(oc, false, false),
        });
    }
    if (doBlessed || doCursed || doUncursed || doUnknown) {
        rows.push({ kind: 'blank' });
    }
    if (doBlessed) {
        rows.push({
            sel: 'B', accel: null, value: 'B', skipInvert: true,
            label: 'Items known to be Blessed',
        });
    }
    if (doCursed) {
        rows.push({
            sel: 'C', accel: null, value: 'C', skipInvert: true,
            label: 'Items known to be Cursed',
        });
    }
    if (doUncursed) {
        rows.push({
            sel: 'U', accel: null, value: 'U', skipInvert: true,
            label: 'Items known to be Uncursed',
        });
    }
    if (doUnknown) {
        rows.push({
            sel: 'X', accel: null, value: 'X', skipInvert: true,
            label: 'Items of unknown Bless/Curse status',
        });
    }

    const selected = new Set();
    for (;;) {
        const entries = [
            { text: prompt, attr: ATR_INVERSE },
            { text: '', attr: 0 },
        ];
        for (const row of rows) {
            if (row.kind === 'blank') {
                entries.push({ text: '', attr: 0 });
                continue;
            }
            if (row.kind === 'hint') {
                entries.push({ text: row.label, attr: 0 });
                continue;
            }
            const mark = selected.has(row.value) ? '+' : '-';
            entries.push({ text: `${row.sel} ${mark} ${row.label}`, attr: 0 });
        }
        await paint_corner_nhw_menu(entries, '(end) ');
        await flush_screen(1);
        const key = await nhgetch();
        game._menu_overlay = false;
        await docrt();
        await flush_screen(1);

        if (key === 27) return null;
        if (key === 13 || key === 10 || key === 32) {
            return selected.size ? selected : null;
        }
        const ch = String.fromCharCode(key);
        if (ch === MENU_INVERT_ALL) {
            for (const row of rows) {
                if (row.value == null || row.skipInvert) continue;
                if (selected.has(row.value)) selected.delete(row.value);
                else selected.add(row.value);
            }
            continue;
        }
        const hit = rows.find((r) => r.sel === ch
            || (r.accel && r.accel === ch));
        if (hit && hit.value != null) {
            if (selected.has(hit.value)) selected.delete(hit.value);
            else selected.add(hit.value);
        }
    }
}

/**
 * C ref: pickup.c menu_loot(0, FALSE) — take out via MENU_FULL category
 * then query_objlist(INVORDER_SORT, !USE_INVLET) PICK_ANY.
 * `@` invert-all; Return → out_container.
 * Named omissions: autopick 'A'; MENU_PARTIAL; menu_loot -2/-3;
 * menu_head_objsym; INCLUDE_VENOM; FEEL_COCKATRICE.
 */
async function menu_loot_takeout(container) {
    // C: gp.pickup_encumbrance = 0 — limit out_container load verbosity
    game.pickup_encumbrance = 0;
    if (!container?.cobj) return ECMD_OK;

    const olist = [];
    for (let o = container.cobj; o; o = o.nobj) olist.push(o);

    // C query_category: single category → skip menu, auto-pick that class
    const classes = [];
    for (const oc of DEF_INV_ORDER) {
        if (olist.some((o) => o.oclass === oc)) classes.push(oc);
    }
    let cats;
    if (classes.length === 1) {
        cats = new Set([classes[0]]);
    } else {
        cats = await query_loot_category(olist, 'Take out what type of objects?');
        if (!cats) return ECMD_OK;
    }

    const allTypes = cats.has(ALL_TYPES_SELECTED);
    const allow = new Set(
        olist.filter((o) => allTypes || cats.has(o.oclass)),
    );
    if (!allow.size) return ECMD_OK;

    // C query_objlist: INVORDER_SORT | INCLUDE_VENOM; !USE_INVLET for take-out.
    // sortflags: sortloot 'l'/'f' + !USE_INVLET → SORTLOOT_LOOT; sortpack → PACK.
    const flags = game.flags || {};
    const doSort = flags.sortpack !== false;
    const sortlootOpt = flags.sortloot ?? 'l';
    let sortflags = 0;
    if (sortlootOpt === 'l' || sortlootOpt === 'f') sortflags |= SORTLOOT_LOOT;
    if (doSort) sortflags |= SORTLOOT_PACK;

    const ranked = sortloot(container.cobj, sortflags, false)
        .filter((s) => allow.has(s.obj));

    const items = [];
    let nextLet = 'a'.charCodeAt(0);
    let first = true;
    for (const { obj } of ranked) {
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
    if (!items.length) return ECMD_OK;

    container.cknown = 1;
    let n_looted = 0;
    for (;;) {
        const entries = [
            { text: 'Take out what?', attr: ATR_INVERSE },
            { text: '', attr: 0 },
        ];
        // C INVORDER_SORT: let_to_name heading once per class in pack order
        if (doSort) {
            let lastClass = null;
            for (const it of items) {
                if (it.obj.where === OBJ_INVENT) continue;
                if (it.oclass !== lastClass) {
                    entries.push({
                        text: let_to_name(it.oclass, false, false),
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
                if (it.obj.where === OBJ_INVENT) continue;
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

        if (key === 27) break;
        if (key === 13 || key === 10 || key === 32) {
            const chosen = items.filter((it) => it.selected
                && it.obj.where !== OBJ_INVENT);
            for (const it of chosen) {
                const res = await out_container(it.obj);
                if (res < 0) break;
                n_looted += res;
            }
            break;
        }
        const ch = String.fromCharCode(key);
        if (ch === MENU_INVERT_ALL) {
            for (const it of items) {
                if (it.obj.where === OBJ_INVENT) continue;
                it.selected = !it.selected;
            }
            continue;
        }
        if (ch === MENU_SELECT_ALL) {
            for (const it of items) {
                if (it.obj.where === OBJ_INVENT) continue;
                it.selected = true;
            }
            continue;
        }
        if (ch === MENU_UNSELECT_ALL) {
            for (const it of items) it.selected = false;
            continue;
        }
        const hit = items.find((it) => it.letch === ch
            && it.obj.where !== OBJ_INVENT);
        if (hit) hit.selected = !hit.selected;
    }
    return n_looted ? ECMD_TIME : ECMD_OK;
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
 * C ref: pickup.c in_container — move invent obj into current_container.
 * Envelope: early refusals + uwep/uswapwep/uquiver; freeinv; put pline.
 * Named omissions: snuff_lit; shop sellobj; icebox age/timers;
 * mbag explosion; botl gold-only polish beyond _goldCount.
 * @returns {Promise<number>} 1 stashed, 0 refused, -1 stop
 */
async function in_container(obj) {
    const cont = game._current_container;
    if (!cont) return 0;
    if (!obj) return 0;
    const u = game.u || {};
    if (obj === u.uball || obj === u.uchain) {
        await pline('You must be kidding.');
        return 0;
    }
    if (obj === cont) {
        await pline('That would be an interesting topological exercise.');
        return 0;
    }
    if ((obj.owornmask || 0) & (W_ARMOR | W_ACCESSORY)) {
        const ice = (cont.otyp | 0) === ICE_BOX;
        await Norep(
            `You cannot ${ice ? 'refrigerate' : 'stash'} something you are wearing.`,
        );
        return 0;
    }
    if ((obj.otyp | 0) === LOADSTONE && obj.cursed) {
        obj.bknown = 1;
        const s = (obj.quan || 1) !== 1 ? 's' : '';
        await pline(`The stone${s} won't leave your person.`);
        return 0;
    }
    if ((obj.otyp | 0) === AMULET_OF_YENDOR
        || (obj.otyp | 0) === CANDELABRUM_OF_INVOCATION
        || (obj.otyp | 0) === BELL_OF_OPENING
        || (obj.otyp | 0) === SPE_BOOK_OF_THE_DEAD) {
        await pline(
            `${The(xname(obj))} cannot be confined in such trappings.`,
        );
        return 0;
    }
    if ((obj.otyp | 0) === LEASH && obj.leashmon) {
        const nam = xname(obj);
        await pline(
            `${The(nam)} ${vtense(nam, 'are')} attached to your pet.`,
        );
        return 0;
    }
    if (obj === u.uwep) {
        if (welded(obj)) {
            await weldmsg(obj);
            return 0;
        }
        setuwep(null);
        if (u.uwep) return 0;
    } else if (obj === u.uswapwep) {
        setuswapwep(null);
    } else if (obj === u.uquiver) {
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

    const is_gold = obj.oclass === COIN_CLASS;
    if (is_gold) {
        game._goldCount = Math.max(0, (game._goldCount || 0) - (obj.quan || 0));
        if (game.botl != null) game.botl = 1;
        if (game.flags) game.flags.botl = true;
    }

    freeinv(obj);
    // C: snuff_lit / sellobj / icebox age / mbag_explodes named.

    if (game._current_container) {
        await pline(
            `You put ${doname(obj)} into ${theArt(xname(cont))}.`,
        );
        add_to_container(cont, obj);
        cont.owt = weight(cont);
    }
    await bot();
    return game._current_container ? 1 : -1;
}

/**
 * C ref: pickup.c query_category for MENU_FULL put-in (menu_loot).
 * Branch envelope: CHOOSE_ALL 'A' + hint; ALL_TYPES 'a'; inv_order classes
 * with def_oc_syms group accel; BUCX B/U/X; JUSTPICKED 'P'; PICK_ANY
 * letter/`$` toggle; Return confirms. Named omissions: unpaid/billed;
 * ParanoidAutoAll confirm; WORN_TYPES; venom.
 * @returns {Set<number|string>|null} selected filters, or null if canceled
 */
async function query_putin_category() {
    const cont = game._current_container;
    // C: walk full invent (includes current container) for categories
    const invent = (game.invent || []).filter((o) => o);
    if (!invent.length) return null;

    // Present oclasses in inv_order (skip empty).
    const classes = [];
    for (const oc of DEF_INV_ORDER) {
        if (invent.some((o) => o.oclass === oc)) classes.push(oc);
    }
    
    const showAll = classes.length > 1;

    const doBlessed = count_buc(invent, BUC_BLESSED) > 0;
    const doCursed = count_buc(invent, BUC_CURSED) > 0;
    const doUncursed = count_buc(invent, BUC_UNCURSED) > 0;
    const doUnknown = count_buc(invent, BUC_UNKNOWN) > 0;
    const nJust = count_justpicked(invent);
    const justObj = nJust === 1 ? find_justpicked(invent) : null;

    // Menu rows: { sel, accel, value, label, skipInvert }
    const rows = [];
    rows.push({
        sel: 'A', accel: null, value: 'A', skipInvert: true,
        label: 'Auto-select every relevant item',
    });
    rows.push({ kind: 'hint', label: '    (ignored unless some other choices are also picked)' });
    rows.push({ kind: 'blank' });
    let invlet = 'a'.charCodeAt(0);
    if (showAll) {
        rows.push({
            sel: String.fromCharCode(invlet++), accel: null,
            value: ALL_TYPES_SELECTED, skipInvert: true,
            label: 'All types',
        });
    }
    for (const oc of classes) {
        const sel = String.fromCharCode(invlet++);
        rows.push({
            sel, accel: oclass_to_sym(oc) || null, value: oc, skipInvert: false,
            label: let_to_name(oc, false, false),
        });
    }
    if (doBlessed || doCursed || doUncursed || doUnknown || nJust) {
        rows.push({ kind: 'blank' });
    }
    if (doBlessed) {
        rows.push({
            sel: 'B', accel: null, value: 'B', skipInvert: true,
            label: 'Items known to be Blessed',
        });
    }
    if (doCursed) {
        rows.push({
            sel: 'C', accel: null, value: 'C', skipInvert: true,
            label: 'Items known to be Cursed',
        });
    }
    if (doUncursed) {
        rows.push({
            sel: 'U', accel: null, value: 'U', skipInvert: true,
            label: 'Items known to be Uncursed',
        });
    }
    if (doUnknown) {
        rows.push({
            sel: 'X', accel: null, value: 'X', skipInvert: true,
            label: 'Items of unknown Bless/Curse status',
        });
    }
    if (nJust) {
        const lab = nJust === 1 && justObj
            ? `Just picked up: ${doname(justObj)}`
            : 'Items you just picked up';
        rows.push({
            sel: 'P', accel: null, value: 'P', skipInvert: true,
            label: lab,
        });
    }

    const selected = new Set();
    for (;;) {
        const entries = [
            { text: 'Put in what type of objects?', attr: ATR_INVERSE },
            { text: '', attr: 0 },
        ];
        for (const row of rows) {
            if (row.kind === 'blank') {
                entries.push({ text: '', attr: 0 });
                continue;
            }
            if (row.kind === 'hint') {
                entries.push({ text: row.label, attr: 0 });
                continue;
            }
            const mark = selected.has(row.value) ? '+' : '-';
            entries.push({ text: `${row.sel} ${mark} ${row.label}`, attr: 0 });
        }
        await paint_corner_nhw_menu(entries, '(end) ');
        await flush_screen(1);
        const key = await nhgetch();
        game._menu_overlay = false;
        await docrt();
        await flush_screen(1);

        if (key === 27) return null;
        if (key === 13 || key === 10 || key === 32) {
            return selected.size ? selected : null;
        }
        const ch = String.fromCharCode(key);
        if (ch === MENU_INVERT_ALL) {
            for (const row of rows) {
                if (row.value == null || row.skipInvert) continue;
                if (selected.has(row.value)) selected.delete(row.value);
                else selected.add(row.value);
            }
            continue;
        }
        const hit = rows.find((r) => r.sel === ch
            || (r.accel && r.accel === ch));
        if (hit && hit.value != null) {
            if (selected.has(hit.value)) selected.delete(hit.value);
            else selected.add(hit.value);
        }
    }
}

/**
 * C ref: pickup.c menu_loot(0, TRUE) — put in via category + PICK_ANY.
 * Branch envelope: MENU_FULL category filters; invent letter toggle; Return
 * → in_container. Named omissions: unpaid/billed; ParanoidAutoAll; autopick
 * 'A' mass put; justpicked shortcut; BUC filter apply; mbag explosion.
 */
async function menu_loot_putin(container) {
    if (!container) return ECMD_OK;
    // C: gp.pickup_encumbrance = 0 (menu_loot; no harm before in_container)
    game.pickup_encumbrance = 0;
    const cats = await query_putin_category();
    if (!cats) return ECMD_OK;

    const allTypes = cats.has(ALL_TYPES_SELECTED);
    const items = [];
    for (const obj of game.invent || []) {
        if (!obj || obj === container) continue;
        if (!allTypes && !cats.has(obj.oclass)) continue;
        let letch = obj.invlet;
        if (obj.oclass === COIN_CLASS) letch = '$';
        if (typeof letch !== 'string' || letch.length !== 1) {
            letch = obj.oclass === COIN_CLASS ? '$' : '?';
        }
        items.push({ obj, letch, selected: false });
    }
    if (!items.length) return ECMD_OK;

    let n_looted = 0;
    for (;;) {
        const entries = [
            { text: 'Put in what?', attr: ATR_INVERSE },
            { text: '', attr: 0 },
        ];
        let coinHdr = false;
        for (const it of items) {
            if (it.obj.oclass === COIN_CLASS && !coinHdr) {
                entries.push({ text: 'Coins', attr: ATR_INVERSE });
                coinHdr = true;
            }
            const mark = it.selected ? '+' : '-';
            entries.push({
                text: `${it.letch} ${mark} ${doname(it.obj)}`,
                attr: 0,
            });
        }
        await paint_corner_nhw_menu(entries, '(end) ');
        await flush_screen(1);
        const key = await nhgetch();
        game._menu_overlay = false;
        await docrt();
        await flush_screen(1);

        if (key === 27) break;
        if (key === 13 || key === 10 || key === 32) {
            const chosen = items.filter((it) => it.selected);
            for (const it of chosen) {
                // re-check still in invent (prior put may have merged)
                if (!(game.invent || []).includes(it.obj)) continue;
                const res = await in_container(it.obj);
                if (res < 0) break;
                n_looted += res;
            }
            break;
        }
        const ch = String.fromCharCode(key);
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
        const hit = items.find((it) => it.letch === ch);
        if (hit) hit.selected = !hit.selected;
    }
    return n_looted ? ECMD_TIME : ECMD_OK;
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
 * Named omissions: muse.c monster-loot; escape/ascend Schroedingers_cat
 * companion HP; shop Shk_Your ownership prefixes.
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

/** C pickup.c simple_look — NHW_MENU of doname for query_classes ':'. */
async function simple_look(otmp, here) {
    if (!otmp) return;
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
 * C `count_unpaid` walks nobj (fobj remainder from a floor head).
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
    const buc = tally_BUCX_list(objs, here);
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
            m_seen = false;
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
                    await display_inventory();
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
 * existing sortpack.
 */
async function pickup_traditional_floor(head, count) {
    let n_tried = 0;
    let all_of_a_type = true;
    let selective = false;
    let oclasses = [];

    let ct = 0;
    for (let o = head; o; o = o.nexthere) ct++;

    if (ct === 1 && count) {
        const obj = head;
        const lcount = Math.min(obj.quan || 1, count);
        n_tried++;
        reset_justpicked(game.invent);
        await pickup_object(obj, lcount, false);
        return n_tried > 0 ? 1 : 0;
    }

    if (ct >= 2) {
        await pline(
            `There are ${ct <= 10 ? 'several' : 'many'} objects here.`,
        );
        const via_menu = { n: 0 };
        const q = await query_classes('pick up', head, true, via_menu);
        if (!q.ok) {
            if (!via_menu.n) return 0;
            const pile = [];
            for (let o = head; o; o = o.nexthere) pile.push(o);
            const extraAllow = via_menu.n === -2 ? null : allow_category;
            const pickList = await query_objlist_pickup(pile, extraAllow);
            if (!pickList.length) return 0;
            reset_justpicked(game.invent);
            n_tried = pickList.length;
            for (const obj of pickList) {
                if (!obj || obj.where !== OBJ_FLOOR) continue;
                const res = await pickup_object(obj, 0, false);
                if (res < 0) break;
            }
            return n_tried > 0 ? 1 : 0;
        }
        oclasses = q.oclasses || [];
        selective = q.one_at_a_time;
        all_of_a_type = q.everything;
    }

    const bycat = menu_class_present('B') || menu_class_present('U')
        || menu_class_present('C') || menu_class_present('X');

    for (let obj = head; obj; ) {
        const obj2 = obj.nexthere;
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
        obj = obj2;
    }
    return n_tried > 0 ? 1 : 0;
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

/** C pickup.c traditional_loot `:3229–3261`. menu 'm' → existing FULL menu_loot. */
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
        const n = put_in
            ? await menu_loot_putin(game._current_container)
            : await menu_loot_takeout(game._current_container);
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

    // C: if (!u_handsy()) return ECMD_OK;
    if (!(await u_handsy())) return ECMD_OK;

    if (obj.olocked) {
        // C ref: pickup.c use_container — held locked; floor #loot uses
        // do_loot_cont autounlock instead.
        if (obj.lknown)
            await pline(`${upstart(theArt(xname(obj)))} is locked.`);
        else
            await pline(`Hmmm, ${theArt(xname(obj))} turns out to be locked.`);
        obj.lknown = 1;
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
        emptymsg = `${Ysimple_name2(obj)} is ${quantum_cat ? 'now ' : ''}empty.`;
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
                // C: pline1(emptymsg) — Ysimple_name2 ("The bag is empty.")
                await pline(emptymsg || `${Ysimple_name2(obj)} is empty.`);
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
                await pline(emptymsg || `${Ysimple_name2(cont)} is empty.`);
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

    game._current_container = null;
    void held;
    return used;
}

/**
 * C ref: pickup.c do_loot_cont — floor container; locked → autounlock.
 * cindex/ccount (1..N) → use_container more_containers (cindex < ccount).
 * @param {object} cobj
 * @param {number} [cindex=1]
 * @param {number} [ccount=1]
 * @returns {Promise<number>} ECMD_*
 */
async function do_loot_cont(cobj, cindex = 1, ccount = 1) {
    if (!cobj) return ECMD_OK;
    if (cobj.olocked) {
        let res = ECMD_OK;
        if (cobj.lknown)
            await pline(`${upstart(theArt(xname(cobj)))} is locked.`);
        else
            await pline(`Hmmm, ${theArt(xname(cobj))} turns out to be locked.`);
        cobj.lknown = 1;

        if (!game.flags) game.flags = {};
        const au = game.flags.autounlock ?? AUTOUNLOCK_APPLY_KEY;
        if (au) {
            const ox = cobj.ox | 0;
            const oy = cobj.oy | 0;
            if (game.u) game.u.dz = 0;
            // C: APPLY_KEY | UNTRAP arm; UNTRAP / FORCE deferred
            if ((au & AUTOUNLOCK_APPLY_KEY) !== 0) {
                const { pick_lock, autokey } = await import('./lock.js');
                const unlocktool = autokey(true);
                if (unlocktool) {
                    const pl = await pick_lock(unlocktool, ox, oy, cobj);
                    if (pl) res = ECMD_TIME;
                    return res;
                }
            }
        }
        return res;
    }
    // C: use_container(cobjp, FALSE, (boolean) (cindex < ccount))
    return use_container(cobj, false, cindex < ccount);
}

/**
 * C ref: pickup.c container_at `:2023–2038`.
 * @param {number} x
 * @param {number} y
 * @param {boolean} countem false → stop at first
 * @returns {number}
 */
function container_at(x, y, countem) {
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

/**
 * C ref: pickup.c doloot / doloot_core — loot container underfoot.
 * Branch envelope: capacity; nohands; lootcont (able_to_loot +
 * num_conts>1 PICK_ANY + do_loot_cont cindex/ccount more_containers);
 * directional lootmon underfoot → lootcont.
 * Named omissions: capacity pline path; Confusion reverse_loot;
 * iflags.menu_requested skip-to-lootmon; grave; saddle; cockatrice;
 * AUTOUNLOCK_FORCE; lootcont→lootmon fallthrough after empty multi-pick;
 * PICK_ANY @ invert / pages / >26 containers.
 */
export async function doloot() {
    const u = game.u;
    if (!u) return ECMD_OK;

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

    const floor = await loot_floor_containers(u.ux, u.uy);
    if (floor.blocked) return ECMD_OK;
    if (floor.aborted) return floor.timepassed ? ECMD_TIME : ECMD_OK;
    let timepassed = floor.timepassed | 0;
    const c = floor.c;

    // C: doloot_core lootmon — get_adjacent_loc when mon_beside
    if (c !== 'y' && (mon_beside(u.ux, u.uy) || game.flags?.menu_requested)) {
        const { getdir_cmdassist } = await import('./dothrow.js');
        const dir = await getdir_cmdassist('Loot in what direction?');
        if (!dir) {
            await pline('Never mind.');
            return timepassed ? ECMD_TIME : ECMD_OK;
        }
        const cc = { x: u.ux + dir.dx, y: u.uy + dir.dy };
        const underfoot = cc.x === u.ux && cc.y === u.uy;
        if (underfoot && container_at(cc.x, cc.y, false)) {
            // C: goto lootcont
            const again = await loot_floor_containers(cc.x, cc.y);
            if (again.blocked) return ECMD_OK;
            timepassed |= again.timepassed;
            return timepassed ? ECMD_TIME : ECMD_OK;
        }
        for (let o = objects_at(cc.x, cc.y); o; o = o.nexthere) {
            if (Is_container(o)) {
                await pline('You have to be at a container to loot it.');
                return timepassed ? ECMD_TIME : ECMD_OK;
            }
        }
        await pline(
            `You don't find anything ${underfoot ? 'here' : 'there'} to loot.`,
        );
        return timepassed ? ECMD_TIME : ECMD_OK;
    }

    if (c !== 'y' && c !== 'n') {
        await pline("You don't find anything here to loot.");
    }
    return timepassed ? ECMD_TIME : ECMD_OK;
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
 * C ref: pickup.c tipcontainer — empty box onto floor (no target bag).
 * highdrop = !can_reach_floor(TRUE); swallowed clears it; then
 * how_lost LOST_DROPPED + hitfloor(TRUE) (D-1273).
 * Named omissions: tipcontainer_gettarget menu; bag-of-holding explode;
 * ice-box thaw; shop billing; altarizing doaltarobj; cursed mbag
 * item-gone; otrapped chest_trap; invent getobj tip; dropy terse
 * comma-list; toss_up; subfrombill after floor shop BoT/horn.
 * SchroedingersBox is observe_quantum_cat before spill.
 * @param {object} box
 */
export async function tipcontainer(box) {
    if (!box) return;
    const ox = (box.ox | 0) || (game.u?.ux | 0);
    const oy = (box.oy | 0) || (game.u?.uy | 0);
    // C tipcontainer_checks: discover lock, refuse locked/empty
    if (!box.lknown) box.lknown = 1;
    if (box.olocked) {
        await pline(`${upstart(thesimpleoname(box))} is locked.`);
        return;
    }
    // C tipcontainer_checks: BAG_OF_TRICKS / HORN_OF_PLENTY empty via apply
    if ((BAG_OF_TRICKS >= 0 && box.otyp === BAG_OF_TRICKS)
        || (HORN_OF_PLENTY >= 0 && box.otyp === HORN_OF_PLENTY)) {
        const bag = box.otyp === BAG_OF_TRICKS;
        const oldSpe = box.spe | 0;
        const maybeshopgoods = box.where !== OBJ_INVENT
            && costly_spot(box.ox | 0, box.oy | 0);
        const u = game.u || {};
        let bx = u.ux | 0;
        let by = u.uy | 0;
        if (box.where === OBJ_FLOOR) {
            bx = box.ox | 0;
            by = box.oy | 0;
        }
        box.ox = bx;
        box.oy = by;
        if (maybeshopgoods && !box.no_charge) {
            await addtobill(box, false, false, true);
        }
        let seen = 0;
        let totseen = 0;
        do {
            if (bag) {
                const seencount = { n: seen };
                const { bagotricks } = await import('./apply.js');
                const n = await bagotricks(box, true, seencount);
                seen = seencount.n | 0;
                if (!n) break;
            } else if (!(await hornoplenty(box, true, null))) {
                break;
            }
            totseen += seen;
        } while ((box.spe | 0) > 0);
        if ((box.spe | 0) < oldSpe) {
            if (bag && !totseen) await pline(nothing_seems_to_happen);
            // C pickup.c: check_unpaid wants a non-zero charge count
            box.spe = oldSpe;
            await check_unpaid_usage(box, true);
            box.spe = 0;
            box.cknown = 1;
        }
        return; // C TIPCHECK_CANNOT — already emptied
    }
    if (SchroedingersBox(box)) {
        // C pickup.c:4034–4045 — observe before empty/spill; live cat
        // leaves no cobj → "Your/The box is now empty." (TIPCHECK_EMPTY).
        await observe_quantum_cat(box, true, true);
        if (!Has_contents(box)) {
            const carried = box.where === OBJ_INVENT
                || (game.invent || []).includes(box);
            await pline(`${carried ? 'Your' : 'The'} box is now empty.`);
            box.cknown = 1;
            return;
        }
        box.cknown = 1;
        // dead cat: corpse remains; fall through to spill
    }
    if (!Has_contents(box)) {
        box.cknown = 1;
        await pline(`${upstart(thesimpleoname(box))} is empty.`);
        return;
    }
    box.cknown = 1;
    const u = game.u || {};
    // C pickup.c:3732–3741 — highdrop = !can_reach_floor(TRUE);
    // swallowed clears highdrop (and altarizing, still named).
    let highdrop = !can_reach_floor(true);
    if (u.uswallow) highdrop = false;
    const multi = !!(box.cobj?.nobj);
    // C: terse = !(highdrop || altarizing || costly_spot). Altar/shop
    // named, so highdrop is the live terse-breaker. Non-highdrop keeps
    // fortress colon + per-item doname (C comma-list still named).
    await pline(
        `${multi ? 'Objects spill' : 'An object spills'} out${
            highdrop ? '.' : ':'
        }`,
    );
    let next = box.cobj;
    while (next) {
        const otmp = next;
        next = otmp.nobj;
        obj_extract_self(otmp);
        if (highdrop) {
            // C pickup.c:3807–3810 — might break or fall down stairs;
            // hitfloor handles altars itself.
            otmp.ox = (box.ox | 0) || (u.ux | 0);
            otmp.oy = (box.oy | 0) || (u.uy | 0);
            otmp.how_lost = LOST_DROPPED;
            const { hitfloor } = await import('./dothrow.js');
            await hitfloor(otmp, true);
        } else {
            place_object(otmp, ox, oy);
            await pline(`${doname(otmp)}.`);
        }
    }
    box.cobj = null;
    if (typeof box.owt === 'number') box.owt = weight(box);
    newsym(ox, oy);
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
 * Named omissions: candle/oil/grease/food/venom spill; tiphat; statue;
 * tipcontainer_gettarget.
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
    /* spill / tiphat / statue named */
    await pline(nothing_happens);
    return ECMD_OK;
}
