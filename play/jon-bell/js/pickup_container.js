import { body_part } from './polyself.js';
// @ts-nocheck
// pickup_container.js — use_container() take-out / put-in menu.
// C ref: pickup.c:2959 use_container(), :2721 out_container(), :2552 in_container(),
//        :3252 menu_loot(), :3383 in_or_out_menu(), :1226 query_category(),
//        invent.c addinv/prinv, invent.c:1979 encumber_msg.
//
// use_container for an unlocked, untrapped box).  The interactive flow:
//   1. in_or_out_menu  — "Do what with the <box>?" PICK_ONE menu (':oibrs q').
//   2. on 'o' (take out): menu_loot(0, FALSE).  With flags.menu_style==MENU_FULL,
//      menu_loot calls query_category; a SINGLE object category short-circuits
//      (pickup.c:1288 "no point in actually showing a menu for a single
//      category") and returns that class WITHOUT a menu, so we go straight to
//      query_objlist("Take out what?", box->cobj, ...) — the PICK_ANY item menu.
//   3. out_container on each selected item: obj_extract_self from the box,
//      recompute box weight, addinv to the hero, prinv "<let> - <name>.".
//
// Ordinary non-shop transfers consume no RNG (lift_object for a non-coin,
// non-over-weight item fires no rn2; weight() is RNG-free). Shop payments can
// split gold and allocate an object ID. Another observable effect is
// structural: the taken-out item leaves the box's
// cobj chain and is appended to gi.invent, so the next dog_goal hero-inventory
// food scan (dogmove.c:618) fires obj_resists()->rn2(100) once per inventory

import { ARMOR_DATA } from './armor_data.js';
import { MKOBJ_OC_MATERIAL, MKOBJ_OC_SKILL } from './mkobj_erosion_meta.js';
import { ECMD_OK, ECMD_TIME, OBJ_FREE, OBJ_INVENT,
         PARANOID_AUTOALL, PARANOID_CONFIRM,
         SELL_NORMAL, SELL_DELIBERATE, SELL_DONTSELL, OBJ_FLOOR,
         MAY_HIT, MAY_DESTROY, KILLED_BY_AN,
         GETOBJ_EXCLUDE, GETOBJ_EXCLUDE_SELECTABLE,
         GETOBJ_SUGGEST, GETOBJ_PROMPT, GETOBJ_ALLOWCNT,
         NO_MINVENT, MM_ADJACENTOK, MM_NOMSG, FOOT, ONAME_NO_FLAGS,
         HAND, HALLUC, HALLUC_RES, LL_ACHIEVE,
         MENU_ITEMFLAGS_NONE } from './const.js';
import { paranoid_ynq } from './cmd.js';
import { Ysimple_name2 } from './objnam.js';

const COIN_CLASS = 12; /* objclass.h COIN_CLASS — gold */
import { game } from './gstate.js';
import { update_inventory } from './invent.js';
import { chest_trap } from './trap.js';
import { nomul } from './hack.js';
import { obj_to_glyph, flush_screen, force_more, canspotmon, docorner_blank_utf8_captures, docrt, status_r1_menu_docrt, DEFAULT_MENU_CMDS, _threeStatusLines, menu_item_marker } from './display.js';
import { bot } from './botl.js';
import { pline, urgent_pline, Norep, livelog_printf } from './pline.js';
import { impossible } from './pline.js';
import { topl_force_break_now, flush_pending_messages } from './display.js';
import { build_window_screen, tty_window_offx, menu_search_getlin, display_text_window } from './com_pager.js';
import { pmatchi } from './strutil.js';
import { menu_heading_text, ATR_NONE } from './tty_menu.js';
import { menucolor_row, menucolor_text } from './coloratt.js';
import { nhgetch } from './input.js';
import { map_menu_cmd } from './options.js';
import { weight } from './weight.js';
import { doname, doname_with_price, simpleonames, thesimpleoname, minimal_xname, cxname, getObjDescr, Tobjnam, xname, the, The, otense } from './objnam.js';
import { oname } from './do_name.js';
/* C ref: pickup.c in_container's freeinv/add_to_container/weight trio. */
import { getObjFromGetobj, yname } from './cmd.js';
import { u_handsy } from './pickup.js';
import { snuff_lit } from './apply.js';
import { freeinv, loot_xname as _loot_xname, useup, useupf, obj_here, count_unpaid } from './invent.js';
import { welded, weldmsg, setuwep, setuswapwep, setuqwep } from './wield.js';
import { OC_USES_KNOWN } from './mklev.js';
import { add_to_container, set_bknown, set_corpsenm, obj_extract_self, obj_extract_self as obj_extract_self_general } from './mkobj.js';
import { makemon } from './makemon.js';
import { obj_is_burning } from './light.js';
import { get_obj_location } from './zap.js';
import { addinv } from './invent.js';
import { pickup_prinv, fatal_corpse_mistake, lift_object } from './pickup.js';
import { splitobj, permonstTemplate, set_malign } from './makemon.js';
import { unsplitobj } from './mkobj.js';
import { removed_from_icebox } from './pickup.js';
import { age_is_relative, stop_timer } from './timeout.js';
import { ROT_CORPSE, REVIVE_MON, SHRINK_GLOB, MENU_PARTIAL, MENU_FULL } from './const.js';
import { yn_function } from './cmd.js';
import { PM_ICE_TROLL, PM_HOUSECAT, PM_COCKATRICE, PM_CHICKATRICE } from './pm.generated.js';
import { christen_monst } from './mhitm.js';
import { mon_nam } from './uhitm.js';
import { newexplevel } from './exper.js';
import { rndmonnam } from './do_name.js';
import { more_experienced } from './exper.js';
import { touch_artifact_youmonst } from './wizcmds.js';
import { Blind } from './vision.js';
/* C ref: mkobj.h Is_box / obj.h welded(); W_ARMOR|W_ACCESSORY owornmask bits. */
import { W_ARMOR, W_ACCESSORY } from './const.js';
import { is_pick } from './dig.js';
import { ICE_BOX_OTYP } from './pickup.js'; /* objects.h ICE_BOX */
import { observe_object, discover_object } from './o_init.js';
import { sellobj_state, sellobj, costly_spot, shk_your, addtobill, pick_pick, currency, shop_keeper, stolen_value } from './shk.js';
import { safe_qbuf } from './objnam.js';
import { obfree } from './dokick.js';
import { scatter } from './explode.js';
import { losehp } from './hack.js';
import { rn2, d } from './rnd.js';
import { MENU_TRADITIONAL } from './const.js';
import { query_classes, add_valid_menu_class, allow_category } from './pickup.js';
import { askchain, invletter_value } from './invent.js';
import { container_contents } from './end.js'; // relocate-fns
export { Is_container, _Upstart, _sortloot, set_cursor }; // relocate-fns


import { set_cursor } from './cmd.js';

/* C ref: pickup.c:2025 Is_container — LARGE_BOX(214)..BAG_OF_TRICKS(220). */
function Is_container(obj) {
    const otyp = obj ? (obj.otyp | 0) : 0;
    return otyp >= 214 && otyp <= 220;
}

/* C ref: include/obj.h Has_contents — box has a cobj chain. */
function Has_contents(obj) {
    return !!(obj && obj.cobj);
}

/* C obj.h SchroedingersBox: the special flag survives a live observation
 * when no monster can be created, including final disclosure. */
export function SchroedingersBox(obj) {
    return !!obj && obj.otyp === 214 && obj.spe === 1;
}




const BAG_OF_HOLDING_OTYP = 219;
import { BAG_OF_TRICKS_OTYP } from './pickup.js';
import { boh_loss, explain_container_prompt, in_container, in_or_out_menu, observe_quantum_cat, out_container, stash_ok } from './pickup.js'; // relocate-fns
export { container_gone, do_boh_explosion, is_boh_item_gone, mbag_explodes, mbag_item_gone, observe_quantum_cat, stash_ok } from './pickup.js'; // relocate-fns
export { BAG_OF_HOLDING_OTYP, COIN_CLASS, Has_contents, Is_mbag, _carried_box }; // relocate-fns

function Is_mbag(obj) {
    const typ = obj?.otyp | 0;
    return typ === BAG_OF_HOLDING_OTYP || typ === BAG_OF_TRICKS_OTYP;
}






/* C ref: obj.h:332 carried(o) := ((o)->where == OBJ_INVENT).  Same resolution
 * js/do_wear.js:4023 yname() settled on: this port does not maintain obj.where
 * on every inventory path, so walk the gi.invent chain, which it does maintain. */
function _carried_box(o) {
    if (!o) return false;
    if ((o.where | 0) === 3 /* OBJ_INVENT */) return true;
    for (let p = game.invent; p; p = p.nobj)
        if (p === o) return true;
    return false;
}
function _yname_box(o, simple = false) {
    // C objnam.c:2361: yname uses cxname; ysimple_name uses minimal_xname.
    const name = simple ? null : cxname(o);
    let prefix = shk_your('', o);
    // Preserve the existing carried-chain fallback until every acquisition
    // path maintains where; shop ownership takes precedence over "your".
    if (prefix === 'the ' && _carried_box(o)) prefix = 'your ';
    return prefix + (simple ? minimal_xname(o) : name); /* C objnam.c:2396 */
}
function _Yname_box(o, simple = false) {
    if (simple) return Ysimple_name2(o);
    return _Upstart(_yname_box(o, simple));
}




/* C ref: options.c:136 def_inv_order and invent.c:4789 let_to_name's names[] —
 * the class ORDER query_category walks (`pack = flags.inv_order`) and the class
 * HEADING each entry shows.  Same two tables js/cmd.js's display_pickinv uses. */
const _QC_INV_ORDER = [12, 5, 2, 3, 7, 9, 10, 8, 4, 11, 6, 13, 14, 15, 16];
const _QC_CLASS_NAME = {
    1: 'Illegal objects', 2: 'Weapons', 3: 'Armor', 4: 'Rings', 5: 'Amulets',
    6: 'Tools', 7: 'Comestibles', 8: 'Potions', 9: 'Scrolls', 10: 'Spellbooks',
    11: 'Wands', 12: 'Coins', 13: 'Gems/Stones', 14: 'Boulders/Statues',
    15: 'Iron balls', 16: 'Chains',
};
/* C ref: include/defsym.h OBJCLASS() column 2 — def_oc_syms[oclass].sym, the
 * class symbol add_menu() is handed as each class/object row's GROUP
 * accelerator (pickup.c:1378, :1136). */
const _QC_CLASS_SYM = {
    1: ']', 2: ')', 3: '[', 4: '=', 5: '"', 6: '(', 7: '%', 8: '!', 9: '?',
    10: '+', 11: '/', 12: '$', 13: '*', 14: '`', 15: '0', 16: '_',
};

/* ---------------------------------------------------------------------------
 * sortloot — C ref: invent.c:592 sortloot() / :403 sortloot_cmp() / :150
 * loot_classify().  Both container-loot displays run their list through it:
 * container_contents() (end.c:1636) and query_objlist() (pickup.c:1086).
 *
 * WHY IT MATTERS BEYOND ORDER: loot_classify() opens with
 *     if (!Blind) observe_object(obj);
 * so merely sorting a container's contents sets dknown on every item in it.
 * That is the ONLY reason C can print "a scroll labeled FOOBIE BLETCH" in a
 * ':' contents window whose `identified` argument is FALSE -- xname() prints a
 * bare "scroll" without dknown.  Miss this and the window renders four rows of
 * the wrong text while looking structurally right.
 *
 * C runs the qsort only when n > 1, so a one-item container is NOT classified
 * and its single item keeps dknown == 0.  That asymmetry is C's, and it is
 * reproduced here rather than smoothed over.
 *
 * Classification precedes the name, BUCX, wear and original-index tiers below.
 * In particular, gem subclasses take precedence over alphabetical order. */
/* C invent.c:196-297 loot_classify's subclass switches.  The WEAPON oc_skill
 * subclasses still fall through to the default below. */
/* otyps resolved from js/oc_name_data.js OC_NAME (the generated objects.h
 * name table), not guessed: slime mold 285, tin 296, egg 266, corpse 265. */
const _SLIME_MOLD_OTYP = 285, _TIN_OTYP = 296, _EGG_OTYP = 266, _CORPSE_OTYP = 265;
/* C invent.c:188-198 armcat[] indexed by oc_armcat (SUIT 0, SHIELD 1, HELM 2,
 * GLOVES 3, BOOTS 4, CLOAK 5, SHIRT 6); out-of-range -> 7 -> armcat[7] = 8. */
const _LOOT_ARMCAT = [7, 4, 1, 2, 3, 5, 6, 8];
function _loot_subclass(obj) {
    if ((obj.oclass | 0) === 13 /* GEM_CLASS */) {
        /* C invent.c:260-288: gems/glass precede gray stones and rocks;
         * unseen and undiscovered gems/glass must share a subclass. */
        const t = obj.otyp | 0, seen = !!obj.dknown;
        const discovered = !!game._oc_name_known?.[t];
        switch (MKOBJ_OC_MATERIAL[t] | 0) {
        case 20 /* GEMSTONE */: return !seen ? 1 : !discovered ? 2 : 3;
        case 19 /* GLASS */:    return !seen ? 1 : !discovered ? 2 : 4;
        default: /* MINERAL */
            return !seen ? 5 : t !== 474 /* ROCK */ ? (!discovered ? 6 : 7) : 8;
        }
    }
    if ((obj.oclass | 0) === 3 /* ARMOR_CLASS */) {
        let k = ARMOR_DATA[obj.otyp | 0]?.armcat;
        if (k === undefined || k < 0 || k >= 7) k = 7;
        return _LOOT_ARMCAT[k];
    }
    if ((obj.oclass | 0) === 2 /* WEAPON_CLASS */) {
        /* C invent.c:199-211: ammo 1, launcher 2, missile 3, stackable 4,
         * other 5, polearm 6 (is_pole: P_POLEARMS 16 / P_LANCE 19 / Snickersnee 19) */
        const k = MKOBJ_OC_SKILL[obj.otyp | 0] | 0;
        return (k < 0) ? ((k >= -22 && k <= -20) ? 1 : 3)
            : ((k >= 20 && k <= 22) ? 2
               : (k === 17 || k === 1 || k === 2) ? 4
                  : !(k === 16 || k === 19 || (obj.oartifact | 0) === 19) ? 5 : 6);
    }
    if ((obj.oclass | 0) === 6 /* TOOL_CLASS */) {
        /* C invent.c:215-240: known bag of tricks / horn of plenty 2, other
         * container 1, instruments (and horn of plenty) 3, other tools 4. */
        const t = obj.otyp | 0;
        if (obj.dknown && game._oc_name_known && game._oc_name_known[t]
            && (t === 220 || t === 252))
            return 2;
        if (Is_container(obj)) return 1;
        return ((t >= 247 && t <= 251) || t === 253 || t === 254
                || (t >= 256 && t <= 258) || t === 252) ? 3 : 4;
    }
    if ((obj.oclass | 0) !== 7 /* FOOD_CLASS */)
        return 1;
    switch (obj.otyp | 0) {
    case _SLIME_MOLD_OTYP: return 1;
    case _TIN_OTYP:        return 3;
    case _EGG_OTYP:        return 4;
    case _CORPSE_OTYP:     return 5;
    default:               return obj.globby ? 6 : 2;
    }
}
/* C ref: invent.c:295-300 — discovery status:
 *     !seen ? 1 : (discovered || !OBJ_DESCR(objects[otyp])) ? 4
 *       : objects[otyp].oc_uname ? 3 : 2
 * "first unseen, then seen but not named or discovered, then named, lastly
 * discovered".  oc_uname (a player-assigned type name) has no JS storage, so
 * the 3 tier cannot fire; stated. */
function _loot_disco(obj) {
    const otyp = obj.otyp | 0;
    if (!(obj.dknown | 0)) return 1;
    const discovered = !!(game._oc_name_known && game._oc_name_known[otyp]);
    if (discovered || !getObjDescr(otyp)) return 4;
    return 2;
}
/* C invent.c:155-159 def_srt_order: COIN AMULET RING WAND POTION SCROLL
 * SPBOOK GEM FOOD TOOL WEAPON ARMOR ROCK BALL CHAIN. */
const _LOOT_DEF_SRT_ORDER = [12, 5, 4, 11, 8, 9, 10, 13, 7, 6, 2, 3, 14, 15, 16];
function _loot_classify(obj) {
    /* C invent.c:170-171 — the dknown side effect; Blind is not tracked on
     * this path (a blind hero cannot read a container menu's item names
     * either, so the gap is self-cancelling here). */
    if (!Blind()) observe_object(obj);   /* C invent.c:170-171 */
    /* C invent.c:174-181 — class order: flags.inv_order under sortpack (On
     * by default, optlist.h opt_out/On), else def_srt_order (invent.c:155-159),
     * which moves the classes most likely to be picked up to the front. */
    const classorder = (game.flags?.sortpack === false) ? _LOOT_DEF_SRT_ORDER
                                                        : (game.flags?.inv_order || _QC_INV_ORDER);
    const k = classorder.indexOf(obj.oclass | 0);
    return (k >= 0) ? (1 + k) : (1 + classorder.length + 1);
}
/* C invent.c:391 invletter_value() — the one port is js/cmd.js. */
function _invletter_value(letter) {
    return invletter_value(letter | 0);
}
/* C ref: invent.c:488-523 sortloot_cmp — greasing, erosion, erodeproofing and
 * enchantment tiers between BUCX and the stable tiebreak. */
function _sortloot_wear_tiers(o1, o2) {
    let d = (o2.greased | 0) - (o1.greased | 0);
    if (d) return d;
    const er = (o) => Math.max(o.oeroded | 0, o.oeroded2 | 0);
    d = er(o1) - er(o2);                       /* bigger is WORSE */
    if (d) return d;
    d = ((o2.rknown && o2.oerodeproof) ? 1 : 0) - ((o1.rknown && o1.oerodeproof) ? 1 : 0);
    if (d) return d;
    if ((OC_USES_KNOWN[o1.otyp | 0] | 0) && (o1.oclass | 0) !== 7 /* FOOD_CLASS */) {
        const v1 = o1.known ? (o1.spe | 0) : -1000;
        const v2 = o2.known ? (o2.spe | 0) : -1000;
        if (v1 !== v2) return v2 - v1;         /* bigger is better */
    }
    return 0;
}
const SORTLOOT_PETRIFY = 0x20; /* C hack.h:1364 */
function _touch_petrifies_mndx(mndx) {
    const i = mndx | 0;
    return i === PM_COCKATRICE || i === PM_CHICKATRICE;
}
function _sortloot(list, byInvlet = false, filterfunc = null, mode = 0) {
    const arr = [];
    /* C pickup.c:1079-1086, end.c:1632-1637: SORTLOOT_LOOT is optional;
     * sortloot:none still uses PACK's class/subclass/discovery tiers. */
    const loot = game.flags?.sortloot === 'f'
        || (game.flags?.sortloot === 'l' && !byInvlet);
    const pack = game.flags?.sortpack !== false;
    const augment_filter = !!(mode & SORTLOOT_PETRIFY);
    /* C invent.c:610-621 — filterfunc rejects an object BEFORE it is populated
     * into sliarray, unless augment_filter preserves a petrifying corpse. */
    for (let o = list; o; o = o.nobj) {
        if (filterfunc && !filterfunc(o)
            && (!augment_filter || (o.otyp | 0) !== _CORPSE_OTYP
                || !_touch_petrifies_mndx(o.corpsenm)))
            continue;
        arr.push({ obj: o, indx: arr.length, orderclass: 0 });
    }
    /* C invent.c:632 — `if (mode && n > 1)`; no comparisons, no classify. */
    if (arr.length > 1 && (loot || byInvlet || pack)) {
        for (const sli of arr) {
            /* C invent.c:430-432: INVLET without PACK skips classification. */
            if (!byInvlet || pack) {
                sli.orderclass = _loot_classify(sli.obj);
                sli.subclass = _loot_subclass(sli.obj);
                sli.disco = _loot_disco(sli.obj);
            }
            sli.str = loot ? _loot_xname(sli.obj) : '';
            /* C invent.c:404-405 — the BUCX tier, "bigger is better". */
            sli.bucx = (sli.obj.bknown
                        ? (sli.obj.blessed ? 3 : !sli.obj.cursed ? 2 : 1) : 0);
        }
        arr.sort((a, b) => {
            const classOrder = a.orderclass - b.orderclass;
            if (classOrder) return classOrder;
            /* C SORTLOOT_PACK|SORTLOOT_INVLET skips subclass, discovery,
             * and name tiers. Inventory selection retains letter order. */
            if (byInvlet)
                return _invletter_value(a.obj.invlet) - _invletter_value(b.obj.invlet)
                    || (a.indx - b.indx);
            const groupOrder = (a.subclass - b.subclass) || (a.disco - b.disco);
            if (groupOrder) return groupOrder;
            /* C invent.c:479-480: no LOOT means the original-index tiebreak. */
            if (!loot) return a.indx - b.indx;
            return _strcmpi(a.str, b.str)
                || (b.bucx - a.bucx)
                || _sortloot_wear_tiers(a.obj, b.obj)
                || (a.indx - b.indx);
        });
    }
    return arr.map((sli) => sli.obj);
}
/* C ref: hacklib.c strcmpi() — case-insensitive strcmp; returns the sign of the
 * first differing BYTE, so it must NOT be localeCompare (which collates). */
function _strcmpi(a, b) {
    const x = String(a).toLowerCase(), y = String(b).toLowerCase();
    if (x === y) return 0;
    const n = Math.min(x.length, y.length);
    for (let i = 0; i < n; i++) {
        const d = x.charCodeAt(i) - y.charCodeAt(i);
        if (d) return d;
    }
    return x.length - y.length;
}


/* C ref: objnam.c upstart() over thesimpleoname() — "The large box is empty."
 * thesimpleoname prefixes "the"; upstart capitalises the first letter. */
function _Upstart(str) {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
}

const _MENU_SELECT_ALL = 0x2e /* '.' */, _MENU_UNSELECT_ALL = 0x2d /* '-' */,
      _MENU_INVERT_ALL = 0x40 /* '@' */, _MENU_SELECT_PAGE = 0x2c /* ',' */,
      _MENU_UNSELECT_PAGE = 0x5c /* '\\' */, _MENU_INVERT_PAGE = 0x7e /* '~' */;
function _invert_test(mode, skipinvert, is_selected) {
    if (!skipinvert)
        return true;
    return is_selected ? true : false;
}
/* Geometry of the pick-any menu most recently dismissed by query_category, so
 * the take-out/put-in menu opened right after it can reproduce the
 * tty_dismiss_nhwindow docorner() erase of status line 1 (wintty.c:3684).
 * A subsequent bot() paint supersedes that erase, even within the same turn
 * (botl.c:259-268,1670-1672); retain the paint sequence with the geometry. */
let _priorPickMenu = null;
let _lastPickGeom = null;
/* tty_dismiss_nhwindow -> erase_menu_or_text -> docorner(cw->offx, cw->maxrow + 1)
 * (wintty.c:982): the dismissed overlay's cl_end() blanks the terminal cells it
 * covered, so a UTF8 cell never re-painted since a pet stood there loses the pet. */
async function _tty_pick_any_menu(renderLines, items, winColFooter, prior = null) {
    // C windows.c:1861-1863: status is disabled through menu dismissal.
    const savedBotDisabled = game._bot_disabled;
    game._bot_disabled = true;
    try {
        const cancelled = await _tty_pick_any_menu_run(renderLines, items, winColFooter, prior);
        if (_lastPickGeom.col === 1) {
            // C wintty.c:978-979: erase_menu_or_text uses docrt + flush_screen.
            await docrt();
            status_r1_menu_docrt();
            game._statusBlankAfterDocrt = true;
            game._pending_message = '';
            await flush_screen(1);
        } else if (_lastPickGeom.col > 0) {
            docorner_blank_utf8_captures(_lastPickGeom.col - 1, _lastPickGeom.rows + 1);
            /* wintty.c:3715-3719 docorner(): a corner reaching the status rows
             * "wrecked the bottom line" and sets disp.botlx; bot() is a no-op
             * under select_menu()'s bot_disabled, so botlx stays pending. */
            if (_lastPickGeom.rows + 1 >= (_threeStatusLines() ? 21 : 22) && game.disp)
                game.disp.botlx = 1;
        }
        game._pending_message = '';
        /* No flush_screen() after a corner menu: docorner() (wintty.c:982)
         * repaints only rows 0..maxrow, and menu_loot (pickup.c:3286-3340)
         * opens the next menu with the rest of gbuf still unflushed. */
        return cancelled;
    } finally {
        game._bot_disabled = savedBotDisabled;
    }
}
async function _tty_pick_any_menu_run(renderLines, items, winColFooter, prior = null) {
    const g = game;
    _lastPickGeom = null;
    /* Same tty window boundary as in_or_out_menu: an insertion message must be
     * acknowledged before reversed looting opens its take-out menu. */
    if (g._pending_message)
        await force_more(g._pending_message);
    let count = 0, counting = false;
    let page = 0;
    /* C wintty.c:1704-1730 MENU_SEARCH — the "Search for:" getlin blanks
     * screen row 0 (getline.c:213 clear_nhwindow(WIN_MESSAGE)) and
     * process_menu_window repaints a page only when page_start is reset
     * (:1401 `if (!page_start)`), so once a search has run the window's own
     * title stays erased until the player changes page. */
    let titleErased = false;
    const bulk = (mode, apply) => {
        for (const it of items) {
            if (!_invert_test(mode, it.skipinvert,
                              mode === 0 ? it.selected : (mode === 2)))
                continue;
            apply(it);
        }
    };
    for (;;) {
        const allLines = renderLines(page);
        /* tty_end_menu fits 23 menu rows above the page indicator on a
         * 24-row terminal.  Short menus retain their ordinary `(end)` row;
         * tall ones replace that synthetic row with `(N of M)`. */
        const tall = allLines.length > 24;
        /* wintty.c:1907-1918 (H2344_BROKEN): offx = min(40, cols - maxcol - 1),
         * clamped at 0; offx 0 (a line of 77+ columns) clears the map in
         * process_menu_window (wintty.c:1407).
         * wintty.c:1927 `!iflags.menu_overlay` forces the same offx-0 layout. */
        const wide = g.iflags?.menu_overlay === false || g.iflags?.menu_overlay === 0
            || allLines.some((ln) => ln && 77 - ln.replace(/\x1b\[[0-9;]*[A-Za-z]/g, "").length <= 0);
        const body = tall && allLines[allLines.length - 1] === '(end)'
            ? allLines.slice(0, -1) : allLines;
        const pageSize = 23;
        const pageCount = tall ? Math.ceil(body.length / pageSize) : 1;
        if (page >= pageCount) page = pageCount - 1;
        const start = page * pageSize, end = Math.min(body.length, start + pageSize);
        let lines = tall
            ? [...body.slice(start, end), `(${page + 1} of ${pageCount})`]
            : allLines;
        const footerRow = wide && !tall ? allLines.length - 1 : lines.length - 1;
        const lineItems = allLines._itemsByLine || [];
        const visibleItems = new Set(lineItems.slice(start, end).filter(Boolean));
        if (tall || wide) {
            /* tty menus remain full-screen even when the last page is short;
             * blank every physical row below its immediate page footer. */
            /* A single blank is truthy to the overlay composer, so rows 22/23
             * are erased as window rows rather than repainted as status. */
            while (lines.length < 24) lines.push('');
        }
        /* tty_end_menu promotes a menu which fills rows-1 to the full-screen
         * layout at column 1; shorter menus are right-aligned overlays.
         * The geometry comes from the UNERASED lines: cw->offx was fixed when
         * the window was built, so the post-search blank title must not
         * re-right-align the overlay. */
        const WIN_COL = tall || wide ? 1 : lines.length >= 24 ? 1
            : tty_window_offx(lines, winColFooter);
        if (titleErased)
            lines = ['', ...lines.slice(1)];
        const uac = g.u?.uac ?? 0;
        g._pending_message = '';
        g._topl_sticky = null;
        const carry = g._carryStatusClip;
        g._screen_output = build_window_screen(lines, WIN_COL, uac,
                                               tall || wide ? 0
                                               : (carry && carry.moves === g.moves ? carry.clip : undefined));
        /* docorner() clears through maxrow, including the row below the footer
         * (wintty.c:982,3684-3687). With three status lines that can be row 21;
         * lower status rows survive. An offx==0
         * menu instead took erase_menu_or_text's docrt() arm (wintty.c:971-979):
         * cls() blanked both rows and bot() is disabled (windows.c:1861). */
        const clipPrior = !tall && prior && prior.col > 1
            && prior.rows >= (_threeStatusLines() ? 21 : 22);
        g._screen_output = build_window_screen(lines, WIN_COL, uac,
                                               tall || wide ? 0 : clipPrior ? prior.col - 2
                                               : (carry && carry.moves === g.moves ? carry.clip : undefined),
                                               undefined, false, 0, true,
                                               clipPrior ? prior.rows
                                               : (carry && carry.moves === g.moves ? carry.maxRow ?? 23 : 23));
        _lastPickGeom = { rows: tall ? 24 : lines.length, col: WIN_COL };
        set_cursor(tall
            ? WIN_COL + String(lines[footerRow] || '').length
            : WIN_COL + 6,
            tall ? footerRow : (wide ? footerRow : lines.length - 1));
        const raw = await nhgetch();
        const rawk = typeof raw === 'number' ? raw : (raw?.charCodeAt(0) ?? 0);
        const rawch = String.fromCharCode(rawk);
        /* C wintty.c:1552-1558 — explicit menu selection outranks a mapped
         * menu command with the same spelling. */
        const hit = items.find((it) => it.sel === rawch
            && (!tall || visibleItems.has(it)));
        /* C wintty.c:1560 — non-explicit keys drive the switch through
         * map_menu_cmd() (BINDINGS alias -> its command's key). */
        const k = hit || items.some((it) => it.gsel === rawch)
            ? rawk : map_menu_cmd(rawk);
        const ch = String.fromCharCode(k);
        /* C wintty.c:1529-1537, getline.c:230-257: xwaitforspace(resp)
         * re-reads unaccepted keys without returning to process_menu_window.
         * In particular, invalid input must preserve an unfinished count. */
        if (!hit && k !== 27 && k !== 10 && k !== 13
            && !(k >= 48 && k <= 57)
            && !' <>^|,\\~.-@:'.includes(ch)
            && !items.some((it) => it.gsel === ch))
        /* C getline.c:236-254 xwaitforspace: an unaccepted key is consumed
         * inside the read, preserving process_menu_window's pending count.
         * Only a selector, group accelerator, or menu command ends that read. */
        if (!hit && !items.some((it) => it.gsel === ch)
            && !(' 0123456789\x1b\n\r' + DEFAULT_MENU_CMDS).includes(ch))
            continue;
        if (hit) {
            if (counting && count > 0) {
                hit.selected = true;
                hit.count = count;
            } else {
                hit.selected = !hit.selected;
                hit.count = -1;
            }
            count = 0;
            counting = false;
            continue;
        }
        if (k >= 48 && k <= 57) {
            const digit = k - 48;
            const next = count * 10 + digit;
            if (Number.isSafeInteger(next)) count = next;
            if (count !== 0) counting = true; /* ignore leading zeroes */
            continue;
        }
        if (k === 27) { /* ESC cancels a count first, then the whole menu */
            g._ttyDismissMore = 1; /* getline.c:245-247 */
            if (counting) {
                count = 0;
                counting = false;
                continue;
            }
            for (const it of items) it.selected = false;
            return true; /* cancelled */
        }
        if (k === 10 || k === 13) /* Return commits from any page */
            return false;
        if (k === 32 || k === 62 /* > */) {
            count = 0; counting = false;
            if (page < pageCount - 1) { page++; titleErased = false; continue; }
            if (k === 32) return false; /* space finishes on the last page */
            continue;                  /* > is inert there */
        }
        if (k === 60 /* < */) {
            count = 0; counting = false;
            if (page > 0) { page--; titleErased = false; }
            continue;
        }
        if (k === 94 /* ^ */) {
            count = 0; counting = false;
            if (page !== 0) { page = 0; titleErased = false; }
            continue;
        }
        if (k === 124 /* | */) {
            count = 0; counting = false;
            if (page !== pageCount - 1) { page = pageCount - 1; titleErased = false; }
            continue;
        }
        if (k === _MENU_SELECT_ALL || k === _MENU_SELECT_PAGE) {
            count = 0; counting = false;
            const targets = k === _MENU_SELECT_PAGE ? visibleItems : null;
            bulk(1, (it) => { if (!targets || targets.has(it)) {
                it.selected = true; it.count = -1;
            }});
            continue;
        }
        if (k === _MENU_UNSELECT_ALL || k === _MENU_UNSELECT_PAGE) {
            count = 0; counting = false;
            const targets = k === _MENU_UNSELECT_PAGE ? visibleItems : null;
            bulk(2, (it) => { if (!targets || targets.has(it)) {
                it.selected = false; it.count = -1;
            }});
            continue;
        }
        if (k === _MENU_INVERT_ALL || k === _MENU_INVERT_PAGE) {
            count = 0; counting = false;
            const targets = k === _MENU_INVERT_PAGE ? visibleItems : null;
            bulk(0, (it) => { if (!targets || targets.has(it)) {
                it.selected = !it.selected; it.count = -1;
            }});
            continue;
        }
        if (k === 0x3a /* ':' — C wintty.c:1704-1730 MENU_SEARCH.  This loop is
                         * process_menu_window's PICK_ANY arm (query_category
                         * and query_objlist), so the cw->how == PICK_NONE bell
                         * and the PICK_ONE `finished` never apply here.  The
                         * ':' at in_or_out_menu is an explicit selector, which
                         * outranks the command (wintty.c:1552-1558) and never
                         * reaches this case. */) {
            /* tty_getlin drawn over row 0 of the live frame; on return row 0
             * is blank and the page is not repainted (process_menu_window
             * only redraws when page_start is reset), hence titleErased. */
            const answer = await menu_search_getlin(
                async () => String(g._screen_output).split('\n'));
            titleErased = true;
            if (answer && answer !== '\x1b') {
                /* C: Sprintf(searchbuf, "*%s*", tmpbuf) — pmatchi matches the
                 * str tty_add_menu stored ("%c - %s", wintty.c:2596-2604,
                 * fixed up to the final selector at :2718-2722), never the
                 * painted '*'/'+'/'#' form of the dash column. */
                const searchbuf = `*${answer}*`;
                for (const it of items) {
                    if (!it.str || !pmatchi(searchbuf, it.str)) continue;
                    /* C toggle_menu_curr (wintty.c:1114-1151).  The
                     * set_item_state() repaint an on-page match gets in C is
                     * produced by the loop-top re-render; an off-page match
                     * changes no pixels at all, exactly as in C. */
                    if (it.selected) {
                        if (counting && count > 0) it.count = count;
                        else { it.selected = false; it.count = -1; }
                    } else if (counting && count > 0) {
                        it.count = count;
                        it.selected = true;
                    } else if (!counting) {
                        it.selected = true;
                    }
                }
            }
            count = 0;
            counting = false;
            continue;
        }
        /* C:1740-1748 group accelerator — invert every row in that group. */
        if (!counting && ch !== '\0' && items.some((it) => it.gsel === ch)) {
            for (const it of items)
                if (it.gsel === ch) { it.selected = !it.selected; it.count = -1; }
            continue;
        }
        /* C tty/getline.c:230-255 xwaitforspace(resp) rejects unknown keys
         * without returning to process_menu_window, so an unfinished count
         * survives them.  ESC then cancels that count, not the menu. */
    }
}

async function query_category_takeout(box) {
    const contents = [];
    for (let o = box.cobj; o; o = o.nobj) contents.push(o);
    return await _query_category(contents, 'Take out', false);
}
/* C menu_loot (pickup.c:3276-3279): only MENU_FULL asks the "<action> what
 * type of objects?" category query.  Any other style leaves all_categories
 * TRUE and goes straight to query_objlist with allow_all. */
function _menu_style_is_full() {
    return (game.flags?.menu_style ?? MENU_FULL) === MENU_FULL;
}
function _no_category_sel() {
    return { menuShown: false, autopick: false, lootEverything: false,
             allCategories: true, classes: new Set(), justPickedCount: 0 };
}
/* C ref: pickup.c:1226 query_category(), reached from menu_loot() at :3287
 * with olist = put_in ? gi.invent : current_container->cobj and the SAME
 * mflags (ALL_TYPES | UNPAID_TYPES | BUCX_TYPES | CHOOSE_ALL | JUSTPICKED).
 * The only difference between the take-out and put-in menus is the list it
 * walks and the "%s what type of objects?" action word — plus the 'P' row,
 * which C emits from JUSTPICKED for either direction but which only a put-in
 * list can populate (pickup_prev is set on things the hero just picked up). */
async function _query_category(contents, action, withJustPicked) {
    const keptPrior = _priorPickMenu && _priorPickMenu.moves === game.moves
        && _priorPickMenu.paintSeq === (game._botlPaintSeq | 0) ? _priorPickMenu : null;
    _priorPickMenu = null;

    const _ir = (game.flags && game.flags.initrole != null) ? (game.flags.initrole | 0) : -1;
    /* PM_CLERIC is role index 6 in this port (same shape as js/dogmove.js). */
    const _isCleric = _ir >= 0 ? _ir === 6
        : ((game.urole && game.urole.mnum != null) ? (game.urole.mnum | 0) : -1) === 6;
    const _buc = (o) => {
        /* C invent.c:3554-3555 count_buc: priests always know BUC */
        if (_isCleric) o.bknown = ((o.oclass | 0) !== COIN_CLASS);
        if ((o.oclass | 0) === COIN_CLASS)
            return (game.flags && game.flags.goldX) ? 'X' : 'U';
        if (!o.bknown) return 'X';
        return o.blessed ? 'B' : (o.cursed ? 'C' : 'U');
    };
    /* C's cluster order is alphabetical: B, C, U, X (pickup.c:1404-1433). */
    const _BUC_ROWS = [
        ['B', 'Items known to be Blessed'],
        ['C', 'Items known to be Cursed'],
        ['U', 'Items known to be Uncursed'],
        ['X', 'Items of unknown Bless/Curse status'],
    ];
    const bucPresent = _BUC_ROWS.filter(([c]) => contents.some((o) => _buc(o) === c));
    const num_buc_types = bucPresent.length;
    /* C pickup.c:1252-1253; invent.c:3526 counts contained unpaid objects too. */
    const doUnpaid = count_unpaid(contents[0]) > 0;

    /* C:1283-1285 — JUSTPICKED is in menu_loot's mflags for BOTH directions. */
    const justPicked = withJustPicked ? contents.filter((o) => o.pickup_prev) : [];

    /* C count_categories(olist, qflags) — distinct oclasses in the list, in
     * flags.inv_order order (the `pack` walk at pickup.c:1348-1372). */
    const present = [];
    for (const oc of (game.flags?.inv_order || _QC_INV_ORDER))
        if (contents.some(o => (o.oclass | 0) === oc)) present.push(oc);
    for (const o of contents) {
        const oc = o.oclass | 0;
        if (!present.includes(oc)) present.push(oc);
    }
    const ccount = present.length;

    /* C pickup.c:1288 — a single category with at most one BUCX entry and no
     * unpaid/usedup rows needs no menu; the class is returned directly. */
    if (ccount === 1 && !doUnpaid && num_buc_types <= 1) {
        _priorPickMenu = keptPrior; /* no window dismissed: the put-in menu is still the last */
        return { menuShown: false, autopick: false, lootEverything: false,
                 allCategories: false, classes: new Set(present) };
    }

    const show_a = ccount > 1;   /* ALL_TYPES is always in the take-out flags */
    const bits = game.flags?.paranoia_bits | 0;
    const verifyAll = !!(bits & PARANOID_AUTOALL);
    game.ga ||= {};
    let hintLine = null;
    if (!verifyAll) {
        if (!(game.ga.A_first_hint | 0) || (game.iflags?.cmdassist ?? true))
            hintLine = '    (ignored unless some other choices are also picked)';
        game.ga.A_first_hint = (game.ga.A_first_hint | 0) + 1;
    } else if (show_a) {
        if (!(game.ga.A_second_hint | 0) || (game.iflags?.cmdassist ?? true))
            hintLine = "    (if no other choices are picked, 'a' is implied)";
        game.ga.A_second_hint = (game.ga.A_second_hint | 0) + 1;
    }

    /* Build the menu.  `items` is the SELECTABLE rows in display order, as
     * process_menu_window sees them; `entries` carries the rendering. */
    const entries = [];  /* { key, txt, kind, oclass?, item } */
    const items = [];
    const addrow = (key, txt, kind, oclass, skipinvert, gsel) => {
        /* `str` is what tty_add_menu stores ("%c - %s", wintty.c:2596-2604),
         * the MENU_SEARCH pmatchi target. */
        const item = { sel: key, gsel: gsel || 0, skipinvert, selected: false,
                       str: `${key} - ${txt}` };
        entries.push({ key, txt, kind, oclass, item });
        items.push(item);
    };
    /* C:1316-1330 CHOOSE_ALL.  MENU_ITEMFLAGS_SKIPINVERT. */
    addrow('A', 'Auto-select every relevant item', 'A', undefined, true, 0);
    /* C:1349-1359 ALL_TYPES.  Also SKIPINVERT. */
    let invlet = 'a';
    if (show_a) {
        addrow('a', 'All types', 'ALL', undefined, true, 0);
        invlet = 'b';
    }
    for (const oc of present) {
        addrow(invlet, _QC_CLASS_NAME[oc] ?? 'Items', 'CLASS', oc, false,
               _QC_CLASS_SYM[oc] || 0);
        invlet = String.fromCharCode(invlet.charCodeAt(0) + 1);
    }
    /* C:1387-1391 unpaid precedes BUCX; every row SKIPINVERT. */
    if (doUnpaid) addrow('u', 'Unpaid items', 'UNPAID', undefined, true, 0);
    for (const [c, txt] of bucPresent)
        addrow(c, txt, 'BUCX', undefined, true, 0);
    /* C:1435-1449 the JUSTPICKED row.  count_justpicked/find_justpicked
     * (pickup.c:635-657) walk the list for obj->pickup_prev; one such item
     * names itself, several become "Items you just picked up".  SKIPINVERT.
     * C:1438 names it with plain doname(), not doname_with_price(). */
    if (justPicked.length) {
        addrow('P', justPicked.length === 1
                    ? `Just picked up: ${(await doname(justPicked[0]))}`
                    : 'Items you just picked up',
               'P', undefined, true, 0);
    }

    const render = () => {
        const out = [menu_heading_text(`${action} what type of objects?`), ''];
        const itemByLine = [null, null];
        /* C:1387-1391 — ONE blank separator before the whole BUCX cluster,
         * not one per row. */
        let clusterOpened = false;
        for (const e of entries) {
            /* C:1379-1382 — ONE blank line opens the whole
             * unpaid/usedup/BUCX/justpicked block. */
            if ((e.kind === 'UNPAID' || e.kind === 'BUCX' || e.kind === 'P') && !clusterOpened) {
                out.push('');
                itemByLine.push(null);
                clusterOpened = true;
            }
            out.push(menucolor_row(
                `${e.key} ${e.item.selected ? (e.item.count > 0 ? '#' : '+') : '-'} ${e.txt}`));
            itemByLine.push(e.item);
            if (e.kind === 'A') {
                if (hintLine) { out.push(menucolor_row(hintLine)); itemByLine.push(null); }
                out.push('');
                itemByLine.push(null);
            }
        }
        /* C wintty.c:2728-2734 tty_end_menu cuts each entry to cols - 2 = 78
         * cells (SGR is JS rendering metadata, not part of C's curr->str). */
        for (let i = 0; i < out.length; i++) {
            let col = 0;
            out[i] = out[i].replace(/\x1b\[[0-9;]*m|[\s\S]/g,
                ch => ch.startsWith('\x1b') || col++ < 78 ? ch : '');
        }
        out.push('(end)');
        itemByLine.push(null);
        out._itemsByLine = itemByLine;
        return out;
    };

    const cancelled = await _tty_pick_any_menu(render, items, 'end');
    _priorPickMenu = cancelled ? null : { ..._lastPickGeom, moves: game.moves,
                                         paintSeq: game._botlPaintSeq | 0 };
    if (cancelled)
        return { menuShown: true, autopick: false, lootEverything: false,
                 allCategories: false, classes: new Set() };

    let selected = entries.filter((e) => e.item.selected);
    const aIndex = selected.findIndex((e) => e.kind === 'A');
    if (aIndex >= 0 && verifyAll) {
        const answer = await paranoid_ynq(!!(bits & PARANOID_CONFIRM),
                                           'Really autoselect All?', true);
        if (answer === 'n') {
            if (selected.length > 1) {
                selected.splice(aIndex, 1);
            } else {
                /* C query_category: lone A declined under ParanoidAutoAll
                 * becomes the lowercase-a ALL_TYPES_SELECTED choice. */
                selected = [{ kind: 'ALL', item: { selected: true } }];
            }
        } else if (answer !== 'y') {
            return { menuShown: true, autopick: false, lootEverything: false,
                     allCategories: false, classes: new Set() };
        }
    } else if (aIndex >= 0 && selected.length === 1) {
        /* Without paranoid_confirm:A, A is only a modifier for another
         * category choice; by itself query_category rejects it. */
        await pline('No relevant items selected.');
        return { menuShown: true, autopick: false, lootEverything: false,
                 allCategories: false, classes: new Set() };
    }

    /* C pickup.c:3297-3310 keeps AutoAll separate from lowercase-a.  AutoAll
     * bypasses query_objlist and traverses the raw object chain; later class,
     * BUC, or P choices narrow that traversal by clearing loot_everything. */
    let autopick = false;
    let lootEverything = false;
    let allCategories = false;
    let justPickedCount = 0;
    const classes = new Set();
    for (const e of selected) {
        if (e.kind === 'A') {
            autopick = lootEverything = true;
        } else if (e.kind === 'ALL') {
            allCategories = true;
        } else if (e.kind === 'CLASS') {
            classes.add(e.oclass);
            lootEverything = false;
        } else if (e.kind === 'BUCX' || e.kind === 'UNPAID') {
            classes.add(e.key);
            lootEverything = false;
        }
        /* C:3300-3304 — 'P' sets loot_justpicked and adds 'P' as a valid menu
         * class; loot_everything is cleared.  allow_category's gp.picked_filter
         * arm then accepts only pickup_prev items. */
        else if (e.kind === 'P') {
            classes.add('P');
            justPickedCount = Math.max(0, e.item.count || 0);
            lootEverything = false;
        }
    }
    return { menuShown: true, autopick, lootEverything,
             allCategories, classes, justPickedCount };
}

const _BUCX_KEYS = new Set(['B', 'C', 'U', 'X']);
function _qc_allow(obj, sel) {
    /* C pickup.c:3362-3365: All types selects allow_all instead of
     * allow_category, bypassing every filter, including just-picked. */
    if (sel.allCategories) return true;
    /* C pickup.c:588-589: otherwise 'P' requires a just-picked object. */
    if (sel.classes.has('P') && !obj.pickup_prev) return false;
    const classFilter = [...sel.classes].some((c) => typeof c === 'number');
    const bucxFilter = [...sel.classes].some((c) => _BUCX_KEYS.has(c));
    const shopFilter = sel.classes.has('u');
    /* C:938-942 — no filter of any kind matches nothing.  'P' IS a filter
     * type, so a lone 'P' pick must not fall into this "nothing selected" arm. */
    if (!classFilter && !bucxFilter && !shopFilter) return sel.classes.has('P');
    const oclass = obj.oclass | 0;
    /* C:948-950 — an explicit request for coins overrides everything else. */
    if (oclass === COIN_CLASS && classFilter)
        return sel.classes.has(COIN_CLASS);
    /* C:993-995 */
    if (classFilter && !sel.classes.has(oclass)) return false;
    if (shopFilter && !obj.unpaid && !count_unpaid(obj.cobj)) return false;
    /* C:1002-1017 */
    if (bucxFilter) {
        const bucx = (oclass === COIN_CLASS)
            ? ((game.flags && game.flags.goldX) ? 'X' : 'U')
            : (!obj.bknown ? 'X' : (obj.blessed ? 'B' : (obj.cursed ? 'C' : 'U')));
        if (!sel.classes.has(bucx)) return false;
    }
    return true;
}

async function menu_loot_takeout(box, eligible) {
    /* C query_objlist lists only the objects the caller's filter accepts;
     * `eligible` IS that filtered list, in cobj order. */
    const contents = eligible || (() => {
        const a = []; for (let o = box.cobj; o; o = o.nobj) a.push(o); return a;
    })();
    /* C pickup.c:3359-3360 `if (!put_in) gc.current_container->cknown = 1;` runs in
     * menu_loot before query_objlist, not here; kept for the eligible-empty
     * path's sake at the call site. */
    box.cknown = 1;
    return await _menu_loot_items(box.cobj, contents, 'Take out', false);
}
/* C ref: pickup.c:3358-3366 menu_loot's put_in call to query_objlist —
 *     mflags = INVORDER_SORT | INCLUDE_VENOM;
 *     if (put_in && flags.invlet_constant) mflags |= USE_INVLET;
 *     ...
 *     query_objlist("Put in what?", &gi.invent, mflags, ..., allow)
 * flags.invlet_constant is the 'fixinv' option, initval On (optlist.h), so the
 * rows are keyed by each object's OWN invlet, not by a fresh a/b/c run. */
async function menu_loot_putin(eligible) {
    return await _menu_loot_items(game.invent, eligible, 'Put in', !!(game.flags?.invlet_constant ?? true));
    return await _menu_loot_items(game.invent, eligible, 'Put in',
                                  (game.flags?.invlet_constant ?? true) !== false);
}
/* The body shared by both directions.  `chainHead` is the nobj chain
 * query_objlist walks (container contents or gi.invent) and `contents` is the
 * subset the caller's allow() accepted. */
async function _menu_loot_items(chainHead, contents, action, useInvlet) {

    /* C pickup.c:1079-1087: default sortloot='l' sorts container contents by
     * description, but USE_INVLET selects letter order for the hero's pack.
     * sortloot='f' requests description order for both directions. */
    const byInvlet = useInvlet && game.flags?.sortloot !== 'f';
    const sorted = _sortloot(chainHead, byInvlet, (o) => contents.includes(o));

    /* C:1103-1141 the pack walk: one heading per contributing class, rows in
     * sortloot order within the class. */
    const entries = [];  /* { text, item? } in display order */
    const items = [];
    let first = true;
    for (const oc of (game.flags?.inv_order || _QC_INV_ORDER)) {
        let printed_type_name = false;
        for (const o of sorted) {
            if ((o.oclass | 0) !== oc) continue;
            if (!printed_type_name) {
                /* C add_menu_heading(let_to_name(...)) — reverse video. */
                entries.push({ heading: _QC_CLASS_NAME[oc] ?? 'Items' });
                printed_type_name = true;
            }
            /* C:1133-1135 add_menu's `ch` argument:
             *   (qflags & USE_INVLET) ? curr->invlet
             *     : (first && curr->oclass == COIN_CLASS) ? '$' : 0 */
            /* C:1131 tmpglyph = obj_to_glyph(curr, rn2_on_display_rng): under
             * Hallucination each listed row draws on the DISPLAY rng. */
            const glyph = obj_to_glyph(o);
            const explicitSel = useInvlet
                ? (o.invlet ? String.fromCharCode(o.invlet | 0) : 0)
                : ((first && oc === COIN_CLASS) ? '$' : 0);
            const item = { sel: explicitSel, gsel: _QC_CLASS_SYM[oc] || 0,
                           skipinvert: false, selected: false, count: -1, obj: o, glyph };
            entries.push({ item });
            items.push(item);
            first = false;
        }
    }
    /* C wintty.c:2715-2726 tty_end_menu — assign 'a'..'z' then 'A'..'Z' to
     * every selectable row that did NOT come with a selector of its own. */
    /* menu_ch restarts at 'a' on every page ((n % lmax) == 0, lmax = rows - 1
     * = 23), n counting the prepended prompt and blank rows and the class
     * headings. */
    let menu_ch = 97 /* 'a' */;
    let n = 2;
    for (const e of entries) {
        if (n % 23 === 0)
            menu_ch = 97;
        n++;
        const it = e.item;
        if (!it || it.sel) continue;
        it.sel = String.fromCharCode(menu_ch);
        menu_ch = (menu_ch === 122 /* 'z' */) ? 65 /* 'A' */ : menu_ch + 1;
    }
    /* C:1140 doname_with_price(curr) — evaluated once, AFTER sortloot has set
     * dknown, and cached so the row text cannot change mid-menu. */
    for (const e of entries)
        if (e.item) {
            e.text = (await doname_with_price(e.item.obj));
            /* What tty_add_menu stores as the entry's str: "%c - %s" of the
             * FINAL selector (wintty.c:2596-2604, str[0] fixed up to the
             * assigned accelerator at :2718-2722).  MENU_SEARCH's pmatchi
             * matches against this dash form. */
            e.item.str = `${e.item.sel} - ${e.text}`;
        }

    const renderLines = (page) => {
        const out = [menu_heading_text(`${action} what?`), ''];
        const itemByLine = [null, null];
        for (const e of entries) {
            if (e.heading !== undefined) {
                out.push(menu_heading_text(e.heading));
                itemByLine.push(null);
            } else {
                /* C windows.c:1796-1809 add_menu() menucolors the entry's RAW
                 * doname str (query_objlist's doname_with_price, pickup.c:1140)
                 * before tty_add_menu prefixes "%c - " (wintty.c:2604-2611),
                 * so the funnel matches the pre-clip text — same as the
                 * query_category twin above. */
                const showGlyph = game.iflags?.use_menu_glyphs && !((game.iflags.menuobjsyms | 0) & 4);
                out.push(`${e.item.sel} ${menu_item_marker(e.item, page, showGlyph, menucolor_text(e.text))} ${menucolor_text(e.text)}`);
                itemByLine.push(e.item);
            }
        }
        /* wintty.c:2728-2734 tty_end_menu cuts each entry to cols - 2 = 78
         * cells (SGR is JS rendering metadata, not part of C's curr->str). */
        for (let i = 0; i < out.length; i++) {
            let col = 0;
            out[i] = out[i].replace(/\x1b\[[0-9;]*m|[\s\S]/g,
                ch => ch.startsWith('\x1b') || col++ < 78 ? ch : '');
        }
        out.push('(end)');
        itemByLine.push(null);
        out._itemsByLine = itemByLine;
        return out;
    };

    const prior = _priorPickMenu && _priorPickMenu.moves === game.moves
        && _priorPickMenu.paintSeq === (game._botlPaintSeq | 0) ? _priorPickMenu : null;
    _priorPickMenu = null;
    const cancelled = await _tty_pick_any_menu(renderLines, items, 'end', prior);
    _priorPickMenu = cancelled ? null : { ..._lastPickGeom, moves: game.moves,
                                         paintSeq: game._botlPaintSeq | 0 };
    if (cancelled) return [];
    return items.filter((it) => it.selected)
        .map((it) => ({ obj: it.obj, count: it.count }));
}




/* ---------------------------------------------------------------------------
 * use_container — C ref: pickup.c:2959.
 */
export async function use_container_impl(cobjRef, held, more_containers) {
    const g = game;
    const obj = cobjRef.obj;
    if (!obj) return ECMD_OK;

    g.abort_looting = false;
    g.gs ||= {};
    g.gs.sellobj_first = true;
    let used = ECMD_OK;

    if (!(await u_handsy()))
        return ECMD_OK;

    if (!obj.lknown) {
        obj.lknown = 1;
        if (held) update_inventory();
    }
    if (obj.olocked) {
        // C pickup.c:2997-2999: keep the object's name and message boundary.
        await pline('%s locked.', Tobjnam(obj, 'are'));
        if (held) await pline('You must put it down to unlock.');
        return ECMD_OK;
    }
    if (obj.otrapped) {
        if (held)
            await pline('You open %s...', the(xname(obj)));
        await chest_trap(obj, HAND, false);
        /* C pickup.c:2994-3000 — every trap attempt consumes a turn; the
         * freeze branch already installed a longer negative multi count. */
        if ((game.multi | 0) >= 0) {
            nomul(-1);
            game.multi_reason = 'opening a container';
            game.nomovemsg = '';
        }
        g.abort_looting = true;
        return ECMD_TIME;
    }

    g.current_container = obj; /* for in/out_container */

    const quantumCat = SchroedingersBox(obj);
    if (quantumCat) {
        await observe_quantum_cat(obj, true, true);
        used = ECMD_TIME;
    }

    /* C pickup.c:3016-3027 cursed magic-bag attrition occurs before the
     * action prompt.  A zero-value loss can still remove ordinary contents,
     * but only lost shop value consumes the turn and prints the debt total. */
    const cursedMbag = Is_mbag(obj) && obj.cursed && Has_contents(obj);
    if (cursedMbag) {
        const loss = await boh_loss(obj, held);
        if (loss) {
            used = ECMD_TIME;
            await pline(`You owe ${loss} ${currency(loss)} for lost merchandise.`);
            obj.owt = weight(obj);
        }
    }

    const inokay = (g.invent != null
                    && (g.invent !== obj || obj.nobj != null));
    /* outokay: box has contents. */
    const outokay = Has_contents(obj);
    /* pickup.c:3044-3047 preformats this before any transfer; the same text is
     * reused by out-first and reversed out-after-in. */
    const emptymsg = `${_Yname_box(obj, true)} is ${quantumCat || cursedMbag ? 'now ' : ''}empty.`;

    /* C: the in_or_out_menu / yn_function prompt loop (repeats on '?'/':'). */
    let c;
    for (;;) {
        const outmaybe = (outokay || !obj.cknown);
        // C pickup.c:3076-3082: retain the object's name unless it needs shortening.
        const promptText = outmaybe
            ? await safe_qbuf('', 'Do what with ', '?', obj,
                              yname, _yname_box, 'it')
            : await safe_qbuf('', null, ' is empty.  Do what with it?', obj,
                              o => _Upstart(yname(o)), _Yname_box, 'This');
        /* C pickup.c:3079-3080: MENU_PARTIAL|MENU_FULL → in_or_out_menu;
         * otherwise (MENU_TRADITIONAL|MENU_COMBINATION) a yn_function prompt.
         * options.c:7258 sets MENU_FULL as the default, so unset means FULL. */
        const menuStyle = game.flags?.menu_style ?? MENU_FULL;
        if (menuStyle === MENU_PARTIAL || menuStyle === MENU_FULL) {
            if (!inokay && !outmaybe) {
                c = 'b';
            } else {
                c = await in_or_out_menu(promptText, obj, outmaybe, inokay,
                                         (used !== ECMD_OK), more_containers);
            }
        } else {
            /* C pickup.c:3095-3115: the accepted keys are displayed in pbuf
             * and the rest are accepted silently after an ESC in xbuf. */
            let pbuf = ':';
            let xbuf = '';
            pbuf += outmaybe ? 'o' : ''; xbuf += outmaybe ? '' : 'o';
            pbuf += inokay ? 'i' : ''; xbuf += inokay ? '' : 'i';
            pbuf += outmaybe ? 'b' : ''; xbuf += outmaybe ? '' : 'b';
            pbuf += inokay ? 'rs' : ''; xbuf += inokay ? '' : 'rs';
            pbuf += ' ';
            pbuf += more_containers ? 'n' : ''; xbuf += more_containers ? '' : 'n';
            pbuf += 'q';
            if (game.iflags?.cmdassist ?? true) pbuf += ' or ?';
            else xbuf += '?';
            if (xbuf) pbuf += '\x1b' + xbuf;
            const ynDef = more_containers ? 'n' : 'q';
            c = await yn_function(promptText, pbuf, ynDef, true);
            if (c !== '?' && c !== ':')
                g._topl_sticky = `${promptText} [${pbuf.split('\x1b')[0]}] (${ynDef})`;
        }
        if (c === '?') {
            await explain_container_prompt(more_containers);
            continue;
        } else if (c === ':') { /* note: will set obj->cknown */
            /* C pickup.c:3119-3123 — gaining info costs a turn, then the
             * contents window (which is what sets cknown). */
            if (!obj.cknown) used = ECMD_TIME;
            /* The in_or_out_menu just dismissed left its docorner() wipe in
             * place; process_text_window repaints no status (see the
             * _carryStatusClip note in the menu builder above). */
            const carry = g._carryStatusClip;
            await container_contents(obj, false, false, true,
                                     carry && carry.moves === g.moves ? carry.clip : undefined);
            continue;
        }
        break;
    }

    if (c === 'q') g.abort_looting = true;
    if (c === 'n' || c === 'q') {
        return _containerdone(obj, used, cobjRef);
    }
    const loot_out = (c === 'o' || c === 'b' || c === 'r');
    const loot_in = (c === 'i' || c === 'b' || c === 'r');
    const loot_in_first = (c === 'r');
    const stash_one = (c === 's');

    /* out-only or out before in */
    if (loot_out && !loot_in_first) {
        if (!Has_contents(obj)) {
            await pline(emptymsg);
            if (!obj.cknown) used = ECMD_TIME;
            obj.cknown = 1;
        } else {
            /* C pickup.c:3282-3311 menu_loot — with flags.menu_style ==
             * MENU_FULL (the default) the TYPE filter menu comes first. */
            g.pickup_encumbrance = 0;
            /* C pickup.c:3200-3201,3230-3260 traditional_loot(FALSE). */
            let tradRetry = 0, tradDone = false;
            if (g.flags?.menu_style === MENU_TRADITIONAL) {
                const q = await query_classes('take out', obj.cobj, false, true);
                if (q.ok) {
                    if (await askchain(() => obj.cobj, q.one_at_a_time ? [] : q.oclasses,
                        q.everything, (o) => out_container(obj, o), null, 0, 'take out'))
                        used |= ECMD_TIME;
                } else tradRetry = q.via_menu;
                tradDone = !tradRetry;
            }
            const sel = tradRetry ? { ..._no_category_sel(), allCategories: tradRetry === -2 }
                : tradDone ? { ..._no_category_sel(), allCategories: false }
                : _menu_style_is_full()
                ? await query_category_takeout(obj)
                : _no_category_sel();
            if (!sel.autopick && !sel.allCategories && sel.classes.size === 0) {
                /* C: return ECMD_OK from menu_loot — no menu, no cknown. */
            } else if (sel.autopick) {
                /* C menu_loot autopick walks the container's internal nobj
                 * chain, not sortloot/query_objlist display order.  Cache next
                 * before extraction mutates the chain. */
                obj.cknown = 1;
                let nlooted = 0;
                for (let it = obj.cobj; it && g.current_container;) {
                    const next = it.nobj;
                    if (sel.lootEverything || sel.allCategories
                        || _qc_allow(it, sel)) {
                        const res = await out_container(obj, it);
                        if (res < 0) break;
                        nlooted += res;
                    }
                    it = next;
                }
                if (nlooted) used |= ECMD_TIME;
            } else {
                const eligible = [];
                for (let o = obj.cobj; o; o = o.nobj)
                    if (_qc_allow(o, sel)) eligible.push(o);
                /* C pickup.c:3360 — `if (!put_in) current_container->cknown = 1`
                 * runs before query_objlist, i.e. whether or not the filter
                 * matches anything. */
                obj.cknown = 1;
                if (eligible.length) {
                    const picked = await menu_loot_takeout(obj, eligible);
                    // C menu_loot counts selected rows even when transfer is refused.
                    if (picked.length) used |= ECMD_TIME;
                    for (const pick of picked) {
                        const original = pick.obj;
                        let it = original;
                        if (pick.count > 0 && pick.count < (original.quan | 0))
                            it = (await splitobj(original, pick.count));
                        const res = await out_container(obj, it);
                        if (res <= 0 && it !== original && g.current_container)
                            await unsplitobj(it);
                        if (res < 0) break;
                    }
                }
            }
        }
    }

    /* C pickup.c:3160-3166 — recalculate 'inokay' after a take-out, then the
     * "don't have anything to put in" refusal. */
    let inokay2 = (g.invent && (g.invent !== obj || g.invent.nobj));
    let do_in = loot_in, do_stash = stash_one;
    if ((do_in || do_stash) && !inokay2) {
        await pline(`You don't have anything${g.invent ? ' else' : ''} to ${do_stash ? 'stash' : 'put in'}.`);
        do_in = do_stash = false;
    }

    /* C pickup.c:3175-3181 — menu_loot(0, TRUE): the put-in type menu, then
     * the put-in item menu, then in_container() on each pick. */
    // C pickup.c:3168-3173,3230-3260: traditional_loot(TRUE).
    let retry = 0;
    if (do_in && g.flags?.menu_style === MENU_TRADITIONAL) {
        add_valid_menu_class(0);
        const q = await query_classes('put in', g.invent, false, true);
        if (q.ok) {
            if (await askchain(() => g.invent, q.one_at_a_time ? [] : q.oclasses,
                q.everything, in_container,
                (o) => g.current_container && o !== g.current_container, 0, 'put in'))
                used |= ECMD_TIME;
        } else retry = q.via_menu;
        if (!retry) do_in = false;
    }
    if (do_in) {
        g.pickup_encumbrance = 0; // C menu_loot resets report suppression.
        const invlist = [];
        for (let o = g.invent; o; o = o.nobj) invlist.push(o);
        const sel = retry ? { ..._no_category_sel(), allCategories: retry === -2 }
            : _menu_style_is_full()
            ? await _query_category(invlist, 'Put in', true)
            : _no_category_sel();
        if (sel.menuShown && !sel.autopick
            && !sel.allCategories && sel.classes.size === 0) {
            /* C:3293-3294 `if (!n) return ECMD_OK;` — nothing picked. */
        } else if (sel.autopick) {
            let nlooted = 0;
            for (let it = g.invent; it && g.current_container;) {
                const next = it.nobj;
                if (sel.lootEverything || sel.allCategories
                    || _qc_allow(it, sel)) {
                    const res = await in_container(it);
                    if (res < 0) break;
                    nlooted += res;
                }
                it = next;
            }
            if (nlooted) used |= ECMD_TIME;
        } else {
            /* C menu_loot: a single just-picked stack bypasses query_objlist,
             * including when P was combined with other category choices.
             * The attempt costs a turn even if in_container refuses it. */
            const justPicked = sel.classes.has('P')
                ? invlist.filter((o) => o.pickup_prev) : [];
            if (justPicked.length === 1) {
                let it = justPicked[0];
                if (sel.justPickedCount > 0 && sel.justPickedCount < it.quan)
                    it = (await splitobj(it, sel.justPickedCount));
                used |= ECMD_TIME;
                await in_container(it);
            } else {
                const eligible = invlist.filter((o) => retry === -3
                    ? allow_category(o) : _qc_allow(o, sel));
                if (eligible.length) {
                    const picked = await menu_loot_putin(eligible);
                    if (picked.length) used |= ECMD_TIME;
                    for (const pick of picked) {
                        const original = pick.obj;
                        let it = original;
                        if (pick.count > 0 && pick.count < (original.quan | 0))
                            it = (await splitobj(original, pick.count));
                        const res = await in_container(it);
                        if (res <= 0 && it !== original && g.current_container)
                            await unsplitobj(it);
                        if (res < 0) break;
                        if (!g.current_container) break;
                    }
                }
            }
        }
    }
    if (loot_in && inokay2) add_valid_menu_class(0);
    /* C pickup.c:3182-3193 — single-item stash uses the shared getobj reader,
     * whose ALLOWCNT path returns a split child.  A simple refusal recombines
     * that child; -1 means the container vanished and deliberately counts as a
     * used action without attempting to unsplit into the destroyed container. */
    if (!do_in && do_stash) {
        const picked = await getObjFromGetobj(
            'stash', stash_ok, GETOBJ_PROMPT | GETOBJ_ALLOWCNT);
        if (picked) {
            const res = await in_container(picked);
            if (res)
                used = ECMD_TIME;
            else
                await unsplitobj(picked);
        }
    }

    /* C pickup.c:3195 — an insertion can destroy a magic bag, in which case
     * the reversed take-out half is suppressed and containerdone marks the
     * whole multi-container loot operation aborted. */
    let do_out_after = loot_out && loot_in_first && !!g.current_container;
    if (do_out_after) {
        if (!Has_contents(g.current_container)) {
            await pline(emptymsg);
            if (!g.current_container.cknown) used = ECMD_TIME;
            g.current_container.cknown = 1;
        } else {
            g.pickup_encumbrance = 0;
            /* C pickup.c:3200-3201 traditional_loot(FALSE), as in the
             * out-only path above. */
            let tradRetry = 0, tradDone = false;
            if (g.flags?.menu_style === MENU_TRADITIONAL) {
                const cc = g.current_container;
                const q = await query_classes('take out', cc.cobj, false, true);
                if (q.ok) {
                    if (await askchain(() => cc.cobj, q.one_at_a_time ? [] : q.oclasses,
                        q.everything, (o) => out_container(cc, o), null, 0, 'take out'))
                        used |= ECMD_TIME;
                } else tradRetry = q.via_menu;
                tradDone = !tradRetry;
            }
            // C pickup.c:3281: reversed looting uses the same menu-style guard.
            const sel = tradRetry ? { ..._no_category_sel(), allCategories: tradRetry === -2 }
                : tradDone ? { ..._no_category_sel(), allCategories: false }
                : _menu_style_is_full()
                ? await query_category_takeout(g.current_container)
                : _no_category_sel();
            if (!sel.autopick && !sel.allCategories && sel.classes.size === 0) {
                /* menu_loot cancelled before learning the contents */
            } else if (sel.autopick) {
                g.current_container.cknown = 1;
                let nlooted = 0;
                for (let it = g.current_container.cobj;
                     it && g.current_container;) {
                    const next = it.nobj;
                    if (sel.lootEverything || sel.allCategories
                        || _qc_allow(it, sel)) {
                        const res = await out_container(g.current_container, it);
                        if (res < 0) break;
                        nlooted += res;
                    }
                    it = next;
                }
                if (nlooted) used |= ECMD_TIME;
            } else {
                const box = g.current_container;
                const eligible = [];
                for (let o = box.cobj; o; o = o.nobj)
                    if (_qc_allow(o, sel)) eligible.push(o);
                box.cknown = 1;
                if (eligible.length) {
                    const selected = await menu_loot_takeout(box, eligible);
                    if (selected.length) used |= ECMD_TIME;
                    for (const pick of selected) {
                        const original = pick.obj;
                        let it = original;
                        if (pick.count > 0 && pick.count < (original.quan | 0))
                            it = (await splitobj(original, pick.count));
                        const res = await out_container(box, it);
                        if (res <= 0 && it !== original && g.current_container)
                            await unsplitobj(it);
                        if (res < 0) break;
                    }
                }
            }
        }
    }

    return _containerdone(obj, used, cobjRef);
}

/* C ref: pickup.c:3195 containerdone label. */
function _containerdone(box, used, cobjRef) {
    const g = game;
    if (used) {
        if (g.current_container) g.current_container.cknown = 1;
        update_inventory();
    }
    /* C restores accidental-sale handling even when an in_container attempt
     * failed, and writes the possibly-destroyed container back through objp. */
    sellobj_state(SELL_NORMAL);
    if (cobjRef) cobjRef.obj = g.current_container || null;
    if (g.current_container) {
        g.current_container = 0;
    } else {
        g.abort_looting = true;
    }
    return used;
}
