// invent.js — inventory and the look-here command.
// C ref: src/invent.c

import { MON_WEP } from './monst.js';
import { noit_Monnam, mon_nam, oname } from './do_name.js';
import { engulfing_u } from './const.js';
import { allow_all, add_valid_menu_class, menu_class_present, allow_category,
         collect_obj_classes, count_justpicked, container_gone } from './pickup.js';
import { query_objlist, query_category } from './pickup.js';
import { s_suffix, mungspaces } from './hacklib.js';
import { strsubst } from './hacklib.js';
import { safe_qbuf } from './objnam.js';
import { ansimpleoname } from './objnam.js';
import { docrt } from './display.js';
import { add_menu_heading } from './options.js';
import { QBUFSZ } from './const.js';
import { BUFSZ, CONTAINED_SYM } from './const.js';
import { def_oc_syms } from './drawing_data.js';
import { MINV_PICKMASK } from './const.js';
import { MINV_ALL } from './const.js';
import { INCLUDE_HERO } from './const.js';
import { INVORDER_SORT } from './const.js';
import { MENU_FULL, MENU_PARTIAL, UNPAID_TYPES, BILLED_TYPES,
         JUSTPICKED, INCLUDE_VENOM, PICK_ONE, COST_NOCONTENTS } from './const.js';
import { PICK_NONE } from './const.js';
import { PICK_ANY, SIGNAL_NOMENU, SIGNAL_ESCAPE, USE_INVLET,
         MENU_TRADITIONAL, thats_enough_tries, ALL_FINISHED,
         SORTLOOT_PACK, SORTLOOT_INVLET, SORTLOOT_LOOT, SORTLOOT_INUSE,
         SORTLOOT_PETRIFY, BUC_BLESSED, BUC_UNCURSED, BUC_CURSED,
         BUC_UNKNOWN } from './const.js';
import { MENU_BEHAVE_STANDARD } from './const.js';
import { tty_select_menu } from './tty/wintty.js';
import { tty_end_menu } from './tty/wintty.js';
import { tty_add_menu_str } from './tty/wintty.js';
import { tty_start_menu } from './tty/wintty.js';
import { Has_contents } from './obj.js';
import { get_obj_location } from './zap.js';
import { unpunish } from './read.js';
import { game } from './gstate.js';
import { visible_region_at, reg_damg } from './region.js';
import { read_engr_at } from './engrave.js';
import { stairway_at, stairs_description } from './stairs.js';
import { cmdq_pop, cmdq_clear, cmdq_add_key, cmdq_add_int, get_count, itemactions } from './cmd.js';
import { GC_SAVEHIST } from './const.js';
import { GC_ECHOFIRST, GC_CONDHIST, GETOBJ_NOFLAGS, ECMD_FAIL, ECMD_CANCEL } from './const.js';
import { delobj, t_at, is_pool, is_lava } from './mon.js';
import { addtobill, costly_spot, doname_with_price, obfree_bill, same_price,
         shop_keeper, inside_shop, inhishop, unpaid_cost, doinvbill } from './shk.js';
import { ONAME, has_oname, ONAME_SKIP_INVUPD } from './const.js';
import { u_at, CMDQ_KEY, CMDQ_INT, CQ_CANNED, CQ_REPEAT, FOUNTAIN, THRONE, SINK, GRAVE, ALTAR, TREE,
         ICE, DRAWBRIDGE_DOWN, IRONBARS, Never_mind, LOST_NONE, LOST_THROWN, LOST_EXPLODING, LOOKHERE_PICKED_SOME, LOOKHERE_SKIP_DFEATURE, IS_DOOR, D_NODOOR, D_ISOPEN, D_BROKEN,
         AM_SANCTUM, AM_SHRINE, Amask2align, A_NONE, A_LAWFUL,
         A_NEUTRAL, A_CHAOTIC, OBJ_DELETED } from './const.js';
import { hides_under, touch_petrifies, poly_when_stoned } from './mondata.js';
import { worn } from './do_wear.js';
import { empty_handed } from './wield.js';
import { W_ARM, W_ARMC, W_ARMH, W_ARMS, W_ARMG, W_ARMF, W_ARMU,
         W_ARMOR, W_WEP, W_QUIVER, W_SWAPWEP, W_WEAPONS,
         W_RINGL, W_RINGR, W_AMUL, W_ART, W_TOOL, W_ACCESSORY, W_SADDLE }
    from './const.js';
import { Blind as heroBlind, Hallucination,
         Stone_resistance } from './youprop.js';
import { doname, an, corpse_xname, makeplural, obj_typename, CXN_PFX_THE,
         CXN_ARTICLE, yname, xname, distant_name } from './objnam.js';
import { OCLASSES, ONAMES, MATERIALS, SKILLS } from './objects_data.js';
import { is_pole } from './u_init.js';
import { throwing_weapon } from './dothrow.js';
import { OBJ_DESCR, not_fully_identified } from './objnam.js';
export { not_fully_identified } from './objnam.js';
import { MONSYMS, NUMMONS, PMNAMES } from './monst_data.js';
import { erosion_matters, curse, splitobj, clear_splitobjs, extract_nobj,
         start_glob_timeout, dead_species, unsplitobj, unknwn_contnr_contents } from './mkobj.js';
import { carried, OBJ_FREE, OBJ_FLOOR, OBJ_CONTAINED, OBJ_INVENT, OBJ_MINVENT, OBJ_BURIED, Is_container, Is_candle, Is_pudding } from './obj.js';
import { setworn, setnotworn, recalc_telepat_range, bypass_objlist,
         nxt_unbypassed_loot, clear_bypasses } from './worn.js';
import { is_rider, hideunder } from './makemon.js';
import { Fumbling } from './youprop.js';
import { st_all, MOD_ENCUMBER, invlet_basic } from './const.js';
import { u_safe_from_fatal_corpse, can_reach_floor } from './pickup.js';
import { near_capacity, encumber_msg } from './attrib.js';
import { in_rooms, inv_cnt } from './hack.js';
import { place_object } from './mkobj.js';
import { touch_artifact } from './mon.js';
import { dropy, dropx } from './do.js';
import { is_ammo, is_missile, ammo_and_launcher, setuqwep } from './wield.js';
import { ATR_NONE, ATR_INVERSE, tty_create_nhwindow, tty_putstr,
         tty_display_nhwindow, tty_next_page, tty_destroy_nhwindow,
         tty_add_menu, NHW_MENU } from './tty/wintty.js';
import { nhgetch } from './input.js';
import { xwaitforspace } from './tty/getline.js';
import { pline, tty_clear_nhwindow_message, display_nhwindow_message, temporary_object_glyph,
         see_monsters } from './display.js';
import { makeknown, observe_object } from './o_init.js';
import { tty_yn_function } from './tty/topl.js';
import { You, You_hear, You_see, Your, impossible } from './pline.js';
import { cansee, recalc_block_point } from './vision.js';
import { surface } from './dungeon.js';
import { discover_artifact, set_artifact_intrinsic,
         artifact_confers_luck } from './artifact.js';
import { ART_MJOLLNIR } from './artilist_data.js';
import { body_part, mbodypart } from './polyself.js';
import { HAND, STOMACH } from './const.js';
import { obj_stop_timers, stop_timer, SHRINK_GLOB, learn_egg_type,
         FIG_TRANSFORM, attach_fig_transform_timeout } from './timeout.js';
import { NON_PM } from './const.js';
import { obj_merge_light_sources } from './light.js';
import { def_char_to_objclass } from './sp_lev.js';
import { cxname_singular } from './objnam.js';
import { greatest_erosion } from './do_wear.js';

// src/invent.c:70 inuse_classify()
function inuse_classify(sort_item, obj) {
    const w_mask = obj.owornmask & (W_ACCESSORY | W_WEAPONS | W_ARMOR);
    let rating = 0, altclass = 0;
    const urighty = (game.u.uhandedness ?? 0) === 0;

    assign_rating: {
        ++altclass;
        ++rating; if (!w_mask && obj.otyp === ONAMES.LEASH && obj.leashmon) break assign_rating;
        ++rating; if (!w_mask && obj.oclass === OCLASSES.TOOL_CLASS && obj.lamplit) break assign_rating;
        ++altclass;
        ++rating; if (w_mask & W_ARMU) break assign_rating;
        ++rating; if (w_mask & W_ARMF) break assign_rating;
        ++rating; if (w_mask & W_ARMG) break assign_rating;
        ++rating; if (w_mask & W_ARMH) break assign_rating;
        ++rating; if (w_mask & W_ARMS) break assign_rating;
        ++rating; if (w_mask & W_ARMC) break assign_rating;
        ++rating; if (w_mask & W_ARM) break assign_rating;
        ++altclass;
        ++rating; if (w_mask & W_QUIVER) break assign_rating;
        ++rating; if (w_mask & W_SWAPWEP) break assign_rating;
        ++rating; if (w_mask & W_WEP) break assign_rating;
        ++altclass;
        ++rating; if (w_mask & W_TOOL) break assign_rating;
        ++rating; if (w_mask & (urighty ? W_RINGL : W_RINGR)) break assign_rating;
        ++rating; if (w_mask & (urighty ? W_RINGR : W_RINGL)) break assign_rating;
        ++rating; if (w_mask & W_AMUL) break assign_rating;
        rating = 0;
        altclass = -1;
    }
    sort_item.inuse = rating;
    sort_item.orderclass = altclass;
    sort_item.subclass = sort_item.disco = 0;
}

// include/hack.h — command result flags. ECMD_TIME means the command consumed
// a move, which is what makes moveloop advance svm.moves.
export const ECMD_OK = 0;
export const ECMD_TIME = 1;

// src/invent.c:149 loot_classify(). Lower values sort before higher values.
export function loot_classify(sort_item, obj) {
    const O = OCLASSES, N = ONAMES, P = SKILLS;
    const def_srt_order = [O.COIN_CLASS, O.AMULET_CLASS, O.RING_CLASS,
        O.WAND_CLASS, O.POTION_CLASS, O.SCROLL_CLASS, O.SPBOOK_CLASS,
        O.GEM_CLASS, O.FOOD_CLASS, O.TOOL_CLASS, O.WEAPON_CLASS,
        O.ARMOR_CLASS, O.ROCK_CLASS, O.BALL_CLASS, O.CHAIN_CLASS];
    const otyp = obj.otyp, oclass = obj.oclass, oc = game.objects[otyp];
    const discovered = !!oc.oc_name_known;
    if (!heroBlind())
        observe_object(obj);
    const seen = !!obj.dknown;
    const classorder = game.flags.sortpack !== false ? inv_order() : def_srt_order;
    const p = classorder.indexOf(oclass);
    let k = p >= 0 ? 1 + p
        : 1 + classorder.length + Number(oclass !== O.VENOM_CLASS);
    sort_item.orderclass = k;
    switch (oclass) {
    case O.ARMOR_CLASS: {
        const armcat = [7, 4, 1, 2, 3, 5, 6, 8];
        k = oc.oc_armcat;
        if (k < 0 || k >= 7)
            k = 7;
        k = armcat[k];
        break;
    }
    case O.WEAPON_CLASS:
        k = oc.oc_skill;
        k = k < 0 ? (k >= -P.P_CROSSBOW && k <= -P.P_BOW ? 1 : 3)
            : (k >= P.P_BOW && k <= P.P_CROSSBOW ? 2
               : k === P.P_SPEAR || k === P.P_DAGGER || k === P.P_KNIFE ? 4
                 : !is_pole(obj) ? 5 : 6);
        break;
    case O.TOOL_CLASS:
        if (seen && discovered
            && (otyp === N.BAG_OF_TRICKS || otyp === N.HORN_OF_PLENTY))
            k = 2;
        else if (Is_container(obj))
            k = 1;
        else
            switch (otyp) {
            case N.WOODEN_FLUTE: case N.MAGIC_FLUTE:
            case N.TOOLED_HORN: case N.FROST_HORN: case N.FIRE_HORN:
            case N.WOODEN_HARP: case N.MAGIC_HARP: case N.BUGLE:
            case N.LEATHER_DRUM: case N.DRUM_OF_EARTHQUAKE:
            case N.HORN_OF_PLENTY:
                k = 3;
                break;
            default:
                k = 4;
                break;
            }
        break;
    case O.FOOD_CLASS:
        switch (otyp) {
        case N.SLIME_MOLD: k = 1; break;
        default: k = obj.globby ? 6 : 2; break;
        case N.TIN: k = 3; break;
        case N.EGG: k = 4; break;
        case N.CORPSE: k = 5; break;
        }
        break;
    case O.GEM_CLASS:
        switch (oc.oc_material) {
        case MATERIALS.GEMSTONE:
            k = !seen ? 1 : !discovered ? 2 : 3;
            break;
        case MATERIALS.GLASS:
            k = !seen ? 1 : !discovered ? 2 : 4;
            break;
        default:
            k = !seen ? 5 : otyp !== N.ROCK ? (!discovered ? 6 : 7) : 8;
            break;
        }
        break;
    default:
        k = 1;
        break;
    }
    sort_item.subclass = k;
    k = !seen ? 1 : discovered || !OBJ_DESCR(oc) ? 4 : oc.oc_uname ? 3 : 2;
    sort_item.disco = k;
    sort_item.inuse = 0;
}

// src/invent.c:309 loot_xname()
function loot_xname(obj) {
    const saveo = { odiluted: obj.odiluted, blessed: obj.blessed,
                    cursed: obj.cursed, spe: obj.spe, owt: obj.owt };
    const save_oname = has_oname(obj) ? ONAME(obj) : null;
    const save_debug = game.wizard;
    if (obj.oclass === OCLASSES.POTION_CLASS) {
        obj.odiluted = 0;
        if (obj.otyp === ONAMES.POT_WATER)
            obj.blessed = obj.cursed = 0;
    }
    if (obj.otyp === ONAMES.TOWEL)
        obj.spe = 0;
    if (obj.globby)
        obj.owt = 20;
    if (save_oname && !obj.oartifact)
        obj.oname = null;
    if (game.wizard) {
        (game.program_state ||= {}).something_worth_saving = 0;
        game.flags.debug = game.wizard = false;
    }
    let res = cxname_singular(obj);
    if (save_debug) {
        game.flags.debug = game.wizard = true;
        game.program_state.something_worth_saving = 1;
    }
    if (obj.oclass === OCLASSES.POTION_CLASS) {
        obj.odiluted = saveo.odiluted;
        if (obj.otyp === ONAMES.POT_WATER) {
            obj.blessed = saveo.blessed;
            obj.cursed = saveo.cursed;
        }
    }
    if (obj.otyp === ONAMES.TOWEL) {
        obj.spe = saveo.spe;
        res += obj.spe > 0 ? (obj.spe >= 3 ? 'x' : 'y') : 'z';
    }
    if (obj.globby) {
        obj.owt = saveo.owt;
        res += obj.owt <= 100 ? 'a' : obj.owt <= 300 ? 'b'
            : obj.owt <= 500 ? 'c' : 'd';
    }
    if (save_oname && !obj.oartifact)
        obj.oname = save_oname;
    return res;
}

// src/invent.c:391 invletter_value()
function invletter_value(c) {
    return c >= 'a' && c <= 'z' ? c.charCodeAt(0) - 97 + 2
        : c >= 'A' && c <= 'Z' ? c.charCodeAt(0) - 65 + 2 + 26
          : c === '$' ? 1 : c === '#' ? 1 + invlet_basic + 1
            : 1 + invlet_basic + 1 + 1;
}

// src/invent.c:403 sortloot_cmp()
function sortloot_cmp(sli1, sli2) {
    const obj1 = sli1.obj, obj2 = sli2.obj;
    let val1, val2;
    tiebreak: {
        if (game.sortlootmode & SORTLOOT_INUSE) {
            if (!sli1.orderclass) inuse_classify(sli1, obj1);
            if (!sli2.orderclass) inuse_classify(sli2, obj2);
            val1 = sli1.inuse;
            val2 = sli2.inuse;
            if (val1 !== val2) return val2 - val1;
            break tiebreak;
        }
        if ((game.sortlootmode & (SORTLOOT_PACK | SORTLOOT_INVLET)) !== SORTLOOT_INVLET) {
            if (!sli1.orderclass) loot_classify(sli1, obj1);
            if (!sli2.orderclass) loot_classify(sli2, obj2);
            val1 = sli1.orderclass;
            val2 = sli2.orderclass;
            if (val1 !== val2) return val1 - val2;
            if (!(game.sortlootmode & SORTLOOT_INVLET)) {
                val1 = sli1.subclass;
                val2 = sli2.subclass;
                if (val1 !== val2) return val1 - val2;
                val1 = sli1.disco;
                val2 = sli2.disco;
                if (val1 !== val2) return val1 - val2;
            }
        }
        if (game.sortlootmode & SORTLOOT_INVLET) {
            val1 = invletter_value(obj1.invlet);
            val2 = invletter_value(obj2.invlet);
            if (val1 !== val2) return val1 - val2;
        }
        if (!(game.sortlootmode & SORTLOOT_LOOT))
            break tiebreak;
        if (!sli1.str) sli1.str = loot_xname(obj1);
        if (!sli2.str) sli2.str = loot_xname(obj2);
        const nam1 = sli1.str.toLowerCase(), nam2 = sli2.str.toLowerCase();
        const namcmp = nam1 < nam2 ? -1 : nam1 > nam2 ? 1 : 0;
        if (namcmp) return namcmp;
        val1 = obj1.bknown ? (obj1.blessed ? 3 : !obj1.cursed ? 2 : 1) : 0;
        val2 = obj2.bknown ? (obj2.blessed ? 3 : !obj2.cursed ? 2 : 1) : 0;
        if (val1 !== val2) return val2 - val1;
        val1 = obj1.greased | 0;
        val2 = obj2.greased | 0;
        if (val1 !== val2) return val2 - val1;
        val1 = greatest_erosion(obj1);
        val2 = greatest_erosion(obj2);
        if (val1 !== val2) return val1 - val2;
        val1 = Number(!!(obj1.rknown && obj1.oerodeproof));
        val2 = Number(!!(obj2.rknown && obj2.oerodeproof));
        if (val1 !== val2) return val2 - val1;
        if (game.objects[obj1.otyp].oc_uses_known && obj1.oclass !== OCLASSES.FOOD_CLASS) {
            val1 = obj1.known ? obj1.spe : -1000;
            val2 = obj2.known ? obj2.spe : -1000;
            if (val1 !== val2) return val2 - val1;
        }
    }
    return sli1.indx - sli2.indx;
}

// src/invent.c:593 sortloot(); lists already carry nobj/nexthere order.
export function sortloot(olist, mode, by_nexthere, filterfunc) {
    const sliarray = [];
    const augment_filter = !!(mode & SORTLOOT_PETRIFY);
    mode &= ~SORTLOOT_PETRIFY;
    for (const o of olist || []) {
        if (filterfunc && !filterfunc(o)
            && (!augment_filter || o.otyp !== ONAMES.CORPSE
                || !touch_petrifies(game.mons[o.corpsenm])))
            continue;
        sliarray.push({ obj: o, indx: sliarray.length, orderclass: 0,
                        subclass: 0, disco: 0, inuse: 0, str: null });
    }
    if (mode && sliarray.length > 1) {
        game.sortlootmode = mode;
        sliarray.sort(sortloot_cmp);
        game.sortlootmode = 0;
        for (const sli of sliarray)
            sli.str = null;
    }
    sliarray.push({ obj: null, indx: -1 });
    return sliarray;
}

// src/invent.c:647 unsortloot(); release the temporary array reference.
export function unsortloot(loot_array_p) {
    loot_array_p.length = 0;
}

// src/invent.c:4334 will_feel_cockatrice()
export function will_feel_cockatrice(otmp, force_touch = false) {
    return !!((heroBlind() || force_touch) && !game.u.uarmg
              && !Stone_resistance() && otmp?.otyp === ONAMES.CORPSE
              && touch_petrifies(game.mons[otmp.corpsenm]));
}

// src/invent.c:4343 feel_cockatrice()
export async function feel_cockatrice(otmp, force_touch = false) {
    if (!will_feel_cockatrice(otmp, force_touch))
        return false;

    const corpse = corpse_xname(otmp, null, CXN_PFX_THE);
    if (poly_when_stoned(game.youmonst.data)) {
        await You(`touched ${corpse} with your bare ${
            makeplural(body_part(HAND))}.`);
    } else {
        await pline(`Touching ${corpse} is a fatal mistake...`);
    }
    const killer = `touching ${
        corpse_xname(otmp, null, CXN_ARTICLE)} bare-handed`;
    const { instapetrify } = await import('./trap.js');
    await instapetrify(killer);
    return true;
}

// src/invent.c:775 merge_choice(); predict merging after pickup billing.
export function merge_choice(objlist, obj) {
    if (!objlist?.length || obj.otyp === ONAMES.SCR_SCARE_MONSTER)
        return null;
    const save_nocharge = obj.no_charge;
    let shkp;
    if (objlist === game.invent && obj.where === OBJ_FLOOR
        && (shkp = shop_keeper(inside_shop(obj.ox, obj.oy))) !== null) {
        if (obj.no_charge)
            obj.no_charge = 0;
        else if (inhishop(shkp))
            return null;
    }
    let candidate = null;
    for (const item of objlist) {
        if (mergable(item, obj)) {
            candidate = item;
            break;
        }
    }
    obj.no_charge = save_nocharge;
    return candidate;
}

/* src/invent.c:735 inv_rank() — invlet ^ 040, which sorts '$' (gold) before
   'a'..'z' before 'A'..'Z'. */
const inv_rank = (o) => ((o.invlet ? o.invlet.charCodeAt(0) : 0) ^ 0o40);

// src/invent.c:739 reorder_invent() — with flags.invlet_constant (default
// On), addinv keeps the whole inventory chain in inv_rank order. Every walk
// of the hero's inventory — dogfood scans, getobj, display — sees gold
// first, then a..z, then A..Z, and a re-used low letter moves back to its
// rank position. Draws nothing.
export function reorder_invent() {
    (game.invent || []).sort((a, b) => inv_rank(a) - inv_rank(b));
}

// src/invent.c:230 assigninvlet() — sequential from lastinvnr, gold gets '$'.
// The rolling counter means a new item takes the letter AFTER the last one
// assigned, even when earlier letters have been freed in the meantime.
export function assigninvlet(otmp) {
    if (otmp.oclass === OCLASSES.COIN_CLASS) {
        otmp.invlet = '$';
        return;
    }
    const inuse = new Array(52).fill(false);
    for (const o of game.invent || []) {
        if (o === otmp) continue;
        const c = o.invlet;
        if (c >= 'a' && c <= 'z') inuse[c.charCodeAt(0) - 97] = true;
        else if (c >= 'A' && c <= 'Z') inuse[c.charCodeAt(0) - 65 + 26] = true;
        if (c === otmp.invlet)
            otmp.invlet = null;
    }
    if ((otmp.invlet >= 'a' && otmp.invlet <= 'z')
        || (otmp.invlet >= 'A' && otmp.invlet <= 'Z'))
        return;
    let i;
    const last = game.lastinvnr ?? -1;
    for (i = last + 1; i !== last; i++) {
        if (i === 52) { i = -1; continue; }
        if (!inuse[i]) break;
    }
    otmp.invlet = inuse[i] ? '#'
                : (i < 26) ? String.fromCharCode(97 + i)
                           : String.fromCharCode(65 + i - 26);
    game.lastinvnr = i;
}

// src/invent.c:960 addinv_core1(). Special invocation objects update u.uhave
// before entering inventory. Quest-artifact text is asynchronous in the tty
// port, so addinv() waits for it before assigning an inventory letter and
// printing the ordinary pickup message.
export function addinv_core1(obj) {
    if (obj.oclass === OCLASSES.COIN_CLASS) {
        (game.disp ||= {}).botl = true;
        return null;
    }

    const uhave = (game.u.uhave ||= {});
    if (obj.otyp === ONAMES.AMULET_OF_YENDOR) {
        uhave.amulet = 1;
        return null;
    }
    if (obj.otyp === ONAMES.CANDELABRUM_OF_INVOCATION) {
        uhave.menorah = 1;
        return null;
    }
    if (obj.otyp === ONAMES.BELL_OF_OPENING) {
        uhave.bell = 1;
        return null;
    }
    if (obj.otyp === ONAMES.SPE_BOOK_OF_THE_DEAD) {
        uhave.book = 1;
        return null;
    }

    if (!obj.oartifact)
        return null;

    return (async () => {
        const { is_quest_artifact } = await import('./questpgr.js');
        if (is_quest_artifact(obj)) {
            uhave.questart = 1;
            const { artitouch } = await import('./quest.js');
            await artitouch(obj);
        }
        set_artifact_intrinsic(obj, true, W_ART);
        recalc_telepat_range();
        see_monsters();
    })();
}

// src/invent.c:600 addinv() — merge into an existing stack if possible,
// otherwise take the next inventory letter.
export function addinv(obj) {
    return addinv_core0(obj, null);
}

// src/invent.c:1160 addinv_before() -- restore a returning weapon ahead of
// the inventory item which followed it before the throw.
export function addinv_before(obj, otherObj) {
    return addinv_core0(obj, otherObj);
}

function addinv_core0(obj, otherObj) {
    game.invent ||= [];
    if (obj.how_lost === LOST_EXPLODING)
        return null;

    /* src/invent.c:1069-1078. Floor-shop state and the reason an object left
       inventory do not survive pickup. In particular, a returning missile
       must lose LOST_THROWN before mergable() compares it with the quiver. */
    obj.no_charge = 0;
    const objWasThrown = obj.how_lost === LOST_THROWN;
    obj.how_lost = LOST_NONE;

    if (game.loot_reset_justpicked) {
        game.loot_reset_justpicked = false;
        for (const carried of game.invent)
            carried.pickup_prev = 0;
    }

    const pending = addinv_core1(obj);
    return pending ? pending.then(() => addinv_finish(obj, objWasThrown,
                                                       otherObj))
                   : addinv_finish(obj, objWasThrown, otherObj);
}

function addinv_finish(obj, objWasThrown, otherObj) {
    if (otherObj) {
        const index = game.invent.indexOf(otherObj);
        if (index > 0) {
            obj.where = OBJ_INVENT;
            obj.pickup_prev = 1;
            game.invent.splice(index, 0, obj);
            const side = addinv_core2(obj);
            if (side)
                return side.then(() => { carry_obj_effects(obj); return obj; });
            carry_obj_effects(obj);
            return obj;
        }
    }

    /* src/invent.c addinv_core0 — merging goes through merged(), which
       recomputes the stack's owt. The old inline quan += left every
       merged stack carrying a single item's weight, which under-read
       inv_weight() and hid encumbrance transitions. */
    const merge_into = (otmp) => {
        const r = merged({ o: otmp }, { o: obj });
        if (!r)
            return null;
        const finish = () => {
            otmp.pickup_prev = 1;
            const side = addinv_core2(otmp);
            if (side)
                return side.then(() => { carry_obj_effects(otmp); return otmp; });
            carry_obj_effects(otmp);
            return otmp;
        };
        return (r instanceof Promise) ? r.then(finish) : finish();
    };

    /* src/invent.c:1098. Prefer the readied stack even when another wielded
       or loose stack could also accept the object. */
    const quiver = game.u?.uquiver;
    if (quiver) {
        const result = merge_into(quiver);
        if (result)
            return result;
    }

    for (const otmp of game.invent) {
        if (otmp === quiver)
            continue;
        const result = merge_into(otmp);
        if (result)
            return result;
    }
    const result = addinv_nomerge(obj);
    if (objWasThrown && game.flags?.pickup_thrown !== false
        && !game.u.uquiver && obj.oartifact !== ART_MJOLLNIR
        && obj.otyp !== ONAMES.AKLYS
        && (throwing_weapon(obj) || is_ammo(obj)))
        setuqwep(obj);
    return result;
}

// src/invent.c addinv_nomerge() — the no-merge arm touchfood needs so a
// split-off portion keeps its own slot.
export function addinv_nomerge(obj) {
    game.invent ||= [];
    assigninvlet(obj);
    obj.where = 3;                      /* OBJ_INVENT */
    obj.pickup_prev = 1;
    game.invent.push(obj);
    /* src/invent.c:1117; floating letters preserve insertion order. */
    if (game.flags.fixinv !== false)
        reorder_invent();
    const side = addinv_core2(obj);
    if (side)
        return side.then(() => { carry_obj_effects(obj); return obj; });
    carry_obj_effects(obj);
    return obj;
}

// src/invent.c:1022 addinv_core2() — side effects of an object having
// just been added to inventory. Returns a promise only when it prints.
export function addinv_core2(obj) {
    if (confers_luck(obj))
        set_moreluck();
    /* Archeologists can decipher the writing on a scroll label to work out
       what they are (exception: unlabeled scrolls don't have a label to
       decipher) */
    if (Role_if('Archeologist') && obj.oclass === OCLASSES.SCROLL_CLASS
        && obj.otyp !== ONAMES.SCR_BLANK_PAPER && !heroBlind()
        && !game.objects[obj.otyp].oc_name_known) {
        observe_object(obj);
        return pline(`You decipher the label on ${yname(obj)}.`).then(() => {
            makeknown(obj.otyp);
            /* conduct: this is avoidable via not picking up / wishing for
               scrolls */
            game.u.uconduct ||= {};
            game.u.uconduct.literate = (game.u.uconduct.literate || 0) + 1;
        });
    }
    return null;
}

// src/invent.c:3526 count_unpaid()
export function count_unpaid(list) {
    let count = 0;

    for (const obj of list || []) {
        if (obj.unpaid)
            count++;
        if (Has_contents(obj))
            count += count_unpaid(obj.cobj);
    }
    return count;
}

// src/invent.c:3548 count_buc()
export function count_buc(list, type, filterfunc = null) {
    let count = 0;
    for (const obj of list || []) {
        if (Role_if(PM_CLERIC))
            obj.bknown = Number(obj.oclass !== OCLASSES.COIN_CLASS);
        if (filterfunc && !filterfunc(obj))
            continue;
        if (obj.oclass === OCLASSES.COIN_CLASS) {
            if (type === (game.flags.goldX ? BUC_UNKNOWN : BUC_UNCURSED))
                ++count;
            continue;
        }
        if (!obj.bknown ? type === BUC_UNKNOWN
            : obj.blessed ? type === BUC_BLESSED
              : obj.cursed ? type === BUC_CURSED : type === BUC_UNCURSED)
            ++count;
    }
    return count;
}

// src/invent.c:3580 tally_BUCX(); lists already carry the requested chain order.
export function tally_BUCX(list, by_nexthere, bcp, ucp, ccp, xcp, ocp, jcp) {
    bcp.v = ucp.v = ccp.v = xcp.v = ocp.v = jcp.v = 0;
    for (const obj of list || []) {
        if (Role_if(PM_CLERIC))
            obj.bknown = obj.oclass !== OCLASSES.COIN_CLASS ? 1 : 0;
        if (obj.pickup_prev)
            ++jcp.v;
        if (obj.oclass === OCLASSES.COIN_CLASS) {
            if (game.flags.goldX) ++xcp.v;
            else ++ucp.v;
            continue;
        }
        if (!obj.bknown) ++xcp.v;
        else if (obj.blessed) ++bcp.v;
        else if (obj.cursed) ++ccp.v;
        else ++ucp.v;
    }
}

// src/invent.c:3620 count_contents()
export function count_contents(container, nested, quantity, everything, newdrop) {
    let topc;
    let shoppy = false;
    let count = 0;

    if (!everything && !newdrop) {
        const cc = { x: 0, y: 0 };

        for (topc = container; topc.where === OBJ_CONTAINED;
             topc = topc.ocontainer)
            continue;
        if (topc.where === OBJ_FLOOR && get_obj_location(topc, cc, 0))
            shoppy = costly_spot(cc.x, cc.y);
    }
    for (const otmp of container.cobj || []) {
        if (nested && Has_contents(otmp))
            count += count_contents(otmp, nested, quantity, everything,
                                    newdrop);
        if (everything || otmp.unpaid || (shoppy && !otmp.no_charge))
            count += quantity ? otmp.quan : 1;
    }
    return count;
}

// src/invent.c:4037 dfeature_at(), in C's arm order: door, fountain,
// throne, lava, ice, pool, sink, altar, STAIRS (after altar), the
// drawbridges, grave, tree, iron bars.
export function dfeature_at(x, y) {
    let dfeature = null;
    const stway = stairway_at(x, y);
    const loc0 = game.level?.at(x, y);
    const ltyp = loc0?.typ;
    if (loc0 && IS_DOOR(ltyp)) {
        switch (loc0.doormask) {
        case D_NODOOR: dfeature = 'doorway'; break;
        case D_ISOPEN: dfeature = 'open door'; break;
        case D_BROKEN: dfeature = 'broken door'; break;
        default:       dfeature = 'closed door'; break;
        }
        /* open-drawbridge portcullis override needs drawbridge walls */
    } else if (ltyp === FOUNTAIN) {
        dfeature = 'fountain';
    } else if (ltyp === THRONE) {
        dfeature = 'opulent throne';
    } else if (is_lava(x, y)) {
        dfeature = 'molten lava';
    } else if (ltyp === ICE) {
        dfeature = 'solid ice';
    } else if (is_pool(x, y)) {
        dfeature = 'pool of water';
    } else if (ltyp === SINK) {
        dfeature = 'sink';
    } else if (ltyp === ALTAR) {
        const alignment = Amask2align(loc0.altarmask & ~AM_SHRINE);
        let god = alignment === A_NONE ? 'Moloch'
                : alignment === A_LAWFUL ? game.urole?.lgod
                  : alignment === A_NEUTRAL ? game.urole?.ngod
                    : alignment === A_CHAOTIC ? game.urole?.cgod : 'someone';
        if (god?.startsWith('_'))
            god = god.slice(1);
        const alignName = alignment === A_LAWFUL ? 'lawful'
                        : alignment === A_NEUTRAL ? 'neutral'
                          : alignment === A_CHAOTIC ? 'chaotic' : 'unaligned';
        dfeature = `${loc0.altarmask & AM_SANCTUM ? 'high ' : ''}altar to ${god || 'someone'} (${alignName})`;
    } else if (stway) {
        dfeature = stairs_description(stway, true);
    } else if (ltyp === DRAWBRIDGE_DOWN) {
        dfeature = 'lowered drawbridge';
    } else if (ltyp === GRAVE) {
        dfeature = 'grave';
    } else if (ltyp === TREE) {
        dfeature = 'tree';
    } else if (ltyp === IRONBARS) {
        dfeature = 'set of iron bars';
    }
    return dfeature;
}

function dfeature_with_article(dfeature) {
    if (dfeature === 'molten lava' || dfeature === 'ice'
        || dfeature.startsWith('frozen ') || / ice$/i.test(dfeature))
        return dfeature;
    return an(dfeature);
}

// src/invent.c:4104 look_here()
//
// Includes engulfer contents, visible regions, blind floor reach and
// floor-pile cockatrice contact.
export async function look_here(obj_cnt, lhflags) {
    const Blind = heroBlind();
    const verb = Blind ? 'feel' : 'see';
    const picked_some = (lhflags & LOOKHERE_PICKED_SOME) !== 0;
    let skip_dfeature = (lhflags & LOOKHERE_SKIP_DFEATURE) !== 0;

    /* default pile_limit is 5; a value of 0 means "never skip" */
    const pile_limit = game.flags?.pile_limit ?? 5;
    const skip_objects = (pile_limit > 0 && obj_cnt >= pile_limit);

    if (game.u?.uswallow) {
        const mtmp = game.u.ustuck;
        let fbuf = `Contents of ${s_suffix(mon_nam(mtmp))} ${mbodypart(mtmp, STOMACH)}`;
        await You(`${Blind ? 'try' : 'look around'} to ${verb} what is lying in ${fbuf.slice(12)}.`);
        if (mtmp.minvent?.length) {
            for (const otmp of mtmp.minvent) {
                if (otmp.otyp === ONAMES.CORPSE)
                    await feel_cockatrice(otmp, false);
            }
            if (Blind)
                fbuf = 'You feel';
            await display_minventory(mtmp, MINV_ALL | PICK_NONE, `${fbuf}:`);
        } else {
            await You(`${verb} no objects here.`);
        }
        return Blind ? ECMD_TIME : ECMD_OK;
    }

    if (!skip_objects) {
        const reg = visible_region_at(game.u.ux, game.u.uy);
        let trap = t_at(game.u.ux, game.u.uy);
        if (trap && !trap.tseen)
            trap = null;
        if (reg || trap) {
            const { trapname } = await import('./trap.js');
            const regbuf = reg ? `a ${reg_damg(reg) ? 'poison gas' : 'vapor'} cloud` : '';
            await pline(`There is ${regbuf}${reg && trap ? ' and ' : ''}${
                trap ? an(trapname(trap.ttyp, false)) : ''} here.`);
        }
    }

    const dfeature = dfeature_at(game.u.ux, game.u.uy);

    /* src/invent.c:4185-4217: a blind hero describes reaching toward the
       surface before inspecting the object pile.  A following menu flushes
       this message through its own --More-- boundary. */
    if (Blind) {
        const loc = game.level?.at(game.u.ux, game.u.uy);
        if (loc?.typ === ICE) {
            await You('try to feel what is on it.');
            skip_dfeature = true;
        } else {
            const can_reach = can_reach_floor(true);
            const floor = surface(game.u.ux, game.u.uy);
            await You(`try to feel what is ${can_reach
                ? `lying here on the ${floor}` : 'lying beneath you'}.`);
            if (dfeature === floor)
                skip_dfeature = true;
        }
        if (!can_reach_floor(true)) {
            await pline("But you can't reach it!");
            return ECMD_OK;
        }
    }

    /* src/mkobj.c place_object() puts the newest object at the chain head,
       and the js place_object unshifts, so the filtered array is already in
       C's newest-first pile order. */
    const pile = (game.level?.objects || [])
        .filter(o => o.ox === game.u.ux && o.oy === game.u.uy);

    if (!pile.length || is_lava(game.u.ux, game.u.uy)
        || (is_pool(game.u.ux, game.u.uy) && !game.u.uinwater)) {
        /* src/invent.c:4241 — with a feature and no objects: print
           "There is <an feature> here." and SUPPRESS the no-objects line
           unless blind */
        if (dfeature && !skip_dfeature)
            await pline(`There is ${dfeature_with_article(dfeature)} here.`);
        await read_engr_at(game.u.ux, game.u.uy); /* Eric Backus */
        if (!skip_objects && (Blind || !dfeature))
            await You(`${verb} no objects here.`);
        return Blind ? ECMD_TIME : ECMD_OK;
    }
    /* we know there is something here */

    if (skip_objects) {
        if (dfeature && !skip_dfeature)
            await pline(`There is ${dfeature_with_article(dfeature)} here.`);
        await read_engr_at(game.u.ux, game.u.uy); /* Eric Backus */
        if (obj_cnt === 1 && pile[0].quan === 1)
            await pline(`There is ${picked_some ? 'another' : 'an'} object here.`);
        else
            await pline(`There are ${
                (obj_cnt === 2) ? 'two'
                : (obj_cnt < 5) ? 'a few'
                  : (obj_cnt < 10) ? 'several'
                    : 'many'}${picked_some ? ' more' : ''} objects here.`);
        for (const otmp of pile) {
            if (!will_feel_cockatrice(otmp, false))
                continue;
            const lead = obj_cnt > 1 ? 'Including'
                       : otmp.quan > 1 ? "They're" : "It's";
            const suffix = poly_when_stoned(game.youmonst.data)
                ? '' : ', unfortunately';
            await pline(`${lead} ${
                corpse_xname(otmp, null, CXN_ARTICLE)}${suffix}.`);
            await feel_cockatrice(otmp, false);
            break;
        }
    } else if (pile.length === 1) {
        /* only one object */
        const otmp = pile[0];
        if (dfeature && !skip_dfeature)
            await pline(`There is ${dfeature_with_article(dfeature)} here.`);
        await read_engr_at(game.u.ux, game.u.uy); /* Eric Backus */
        await You(`${verb} here ${doname_with_price(otmp)}.`);
        if (otmp.otyp === ONAMES.CORPSE)
            await feel_cockatrice(otmp, false);
    } else {
        /* src/invent.c:4289 flushes WIN_MESSAGE before constructing the
           multi-object popup.  For an acknowledged no-history getpos
           description, the tty marks the message logically empty but leaves
           its pixels under the menu overlay. */
        let felt_cockatrice = null;
        await display_nhwindow_message();
        const tmpwin = tty_create_nhwindow(NHW_MENU);
        if (dfeature && !skip_dfeature) {
            tty_putstr(tmpwin, 0,
                       `There is ${dfeature_with_article(dfeature)} here.`);
            tty_putstr(tmpwin, 0, '');
        }
        tty_putstr(tmpwin, 0, `${picked_some ? 'Other things' : 'Things'} that ${
            Blind ? 'you feel' : 'are'} here:`);
        for (const otmp of pile) {
            if (will_feel_cockatrice(otmp, false)) {
                felt_cockatrice = otmp;
                tty_putstr(tmpwin, 0, `${doname(otmp)}...`);
                break;
            }
            tty_putstr(tmpwin, 0, doname_with_price(otmp));
        }
        await tty_display_nhwindow(tmpwin);
        /* win/tty dmore(): the window waits for quitchars (space, enter,
           ESC); any other key is ignored, which is why a ':' typed while
           the pile overlay shows does not dismiss it */
        await xwaitforspace(' \r\n\x1b');
        while (tty_next_page(tmpwin))
            await xwaitforspace(' \r\n\x1b');
        tty_destroy_nhwindow(tmpwin);
        if (felt_cockatrice)
            await feel_cockatrice(felt_cockatrice, false);
        await read_engr_at(game.u.ux, game.u.uy); /* Eric Backus */
    }

    return Blind ? ECMD_TIME : ECMD_OK;
}

// src/invent.c:4319 dolook()
export async function dolook() {
    return await look_here(0, 0);
}


// ---------------------------------------------------------------------------
// Inventory display
// ---------------------------------------------------------------------------

// src/decl.c flags.inv_order — the default packorder.
export function inv_order() {
    if (game.flags?.inv_order)
        return game.flags.inv_order;
    const O = OCLASSES;
    return [O.COIN_CLASS, O.AMULET_CLASS, O.WEAPON_CLASS, O.ARMOR_CLASS,
            O.FOOD_CLASS, O.SCROLL_CLASS, O.SPBOOK_CLASS, O.POTION_CLASS,
            O.RING_CLASS, O.WAND_CLASS, O.TOOL_CLASS, O.GEM_CLASS,
            O.ROCK_CLASS, O.BALL_CLASS, O.CHAIN_CLASS];
}

const CLASS_NAMES = {
    COIN_CLASS: 'Coins', AMULET_CLASS: 'Amulets', WEAPON_CLASS: 'Weapons',
    ARMOR_CLASS: 'Armor', FOOD_CLASS: 'Comestibles', SCROLL_CLASS: 'Scrolls',
    SPBOOK_CLASS: 'Spellbooks', POTION_CLASS: 'Potions', RING_CLASS: 'Rings',
    WAND_CLASS: 'Wands', TOOL_CLASS: 'Tools', GEM_CLASS: 'Gems/Stones',
    ROCK_CLASS: 'Boulders/Statues', BALL_CLASS: 'Iron balls',
    CHAIN_CLASS: 'Chains', VENOM_CLASS: 'Venoms',
};
// src/invent.c:4800 let_to_name(), including unpaid and class-symbol headings.
export function let_to_name(oclass, unpaid = false, showsym = false) {
    const key = Object.keys(OCLASSES).find(k => OCLASSES[k] === oclass);
    const class_name = CLASS_NAMES[key]
        || (oclass === CONTAINED_SYM ? 'Bagged/Boxed items' : 'Illegal objects');
    let result = (unpaid ? 'Unpaid ' : '') + class_name;
    if (typeof oclass === 'number' && oclass >= 1 && oclass < OCLASSES.MAXOCLASSES && showsym)
        result += ' '.repeat(Math.max(0, 7 - class_name.length)) + `  ('${def_oc_syms[oclass]}')`;
    return result;
}

// src/invent.c:5489 display_binventory() shows objects hidden below the
// current surface. Probing is the only caller. The buried-object arm uses the
// same class-grouped, display-only menu as C's query_objlist(PICK_NONE).
export async function display_binventory(x, y, as_if_seen = false) {
    const buried = (game.level?.buriedobjs || [])
        .filter(o => o.ox === x && o.oy === y);
    if (!buried.length)
        return 0;

    if (as_if_seen) {
        for (const obj of buried)
            observe_object(obj);
    }

    const { tty_create_nhwindow, tty_start_menu, tty_add_menu, tty_end_menu,
            tty_select_menu, tty_destroy_nhwindow } =
        await import('./tty/wintty.js');
    const { MENU_BEHAVE_STANDARD, MENU_ITEMFLAGS_NONE, PICK_NONE } =
        await import('./const.js');
    const { NO_COLOR } = await import('./terminal.js');
    const { sortloot_items } = await import('./pickup.js');
    const { docrt } = await import('./display.js');

    const win = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(win, MENU_BEHAVE_STANDARD);
    let id = 1, nextlet = 'a';
    for (const oclass of inv_order()) {
        const items = sortloot_items(buried.filter(o => o.oclass === oclass));
        if (!items.length)
            continue;
        tty_add_menu(win, null, 0, 0, 0, ATR_INVERSE, NO_COLOR,
                     let_to_name(oclass), MENU_ITEMFLAGS_NONE);
        let first = true;
        for (const obj of items) {
            const selector = first && oclass === OCLASSES.COIN_CLASS
                ? '$' : nextlet;
            tty_add_menu(win, temporary_object_glyph(obj), id++, selector, 0,
                         ATR_NONE, NO_COLOR, doname_with_price(obj),
                         MENU_ITEMFLAGS_NONE);
            if (selector !== '$')
                nextlet = String.fromCharCode(nextlet.charCodeAt(0) + 1);
            first = false;
        }
    }
    tty_end_menu(win, 'Things that are buried here:');
    await tty_select_menu(win, PICK_NONE);
    tty_destroy_nhwindow(win);
    await docrt();
    return buried.length;
}

// src/invent.c:3220 display_pickinv() — walk flags.inv_order, heading each
// non-empty class, then its items in inventory-letter order.
//
// Returns the menu entries the caller feeds to add_menu(): a heading has no
// selector and no identifier, an item carries its inventory letter. The "a - "
// prefix is NOT built here; tty_add_menu() builds it, exactly as in C, which is
// what makes the +2 in tty_end_menu()'s width the right rule for this window.
export function display_inventory(allowed_choices = null, want_reply = false) {
    if (game.flags.fixinv === false)
        reassign();
    const out = [];
    const wizid = game.wizard && game.iflags?.override_ID;
    const sortpack = game.flags.sortpack !== false;
    for (const oclass of sortpack ? [...inv_order(), OCLASSES.VENOM_CLASS] : [0]) {
        const items = (game.invent || []).filter(
            o => (!sortpack || o.oclass === oclass)
                 && (!allowed_choices || allowed_choices.includes(o.invlet))
                 && (!wizid || not_fully_identified(o)));
        if (!items.length) continue;
        /* add_menu_heading(win, class_header) — iflags.menu_headings */
        if (sortpack)
            out.push({ heading: true,
                       str: let_to_name(oclass, false,
                           want_reply && game.iflags.menu_head_objsym),
                       attr: ATR_INVERSE });
        for (const o of items) {
            /* src/invent.c:1039 — displaying the item observes its type */
            if (!Blind())
                observe_object(o);
            /* src/invent.c:3320. obj_to_glyph() precedes doname(), even when
               the tty window never renders the supplied glyph. */
            const glyphinfo = temporary_object_glyph(o);
            out.push({ heading: false, str: doname(o), attr: ATR_NONE,
                       invlet: o.invlet, glyphinfo });
        }
    }
    return out;
}

// src/invent.c:3021 find_unpaid(), a recursive cursor over unpaid objects.
export function find_unpaid(list, last_found) {
    for (const obj of list || []) {
        if (obj.unpaid) {
            if (last_found.v) {
                if (obj === last_found.v)
                    last_found.v = null;
            } else {
                last_found.v = obj;
                return obj;
            }
        }
        if (Has_contents(obj)) {
            const found = find_unpaid(obj.cobj, last_found);
            if (found)
                return found;
        }
    }
    return null;
}

// src/invent.c:3654 dounpaid(), including hidden contents and floor totals.
export async function dounpaid(count, floorcount, buriedcount) {
    let otmp = null, contnr = null;
    const marker = { v: null }, xtracount = floorcount + buriedcount;
    if (count === 1 && !xtracount) {
        otmp = find_unpaid(game.invent, marker);
        contnr = unknwn_contnr_contents(otmp);
    }
    if (otmp && !contnr) {
        const cost = await unpaid_cost(otmp, COST_NOCONTENTS);
        game.iflags.suppress_price = (game.iflags.suppress_price || 0) + 1;
        await pline(xprname(otmp, distant_name(otmp, doname),
            carried(otmp) ? otmp.invlet : CONTAINED_SYM, true, cost, 0));
        game.iflags.suppress_price--;
        return;
    }

    const win = tty_create_nhwindow(NHW_MENU);
    let totcost = 0, num_so_far = 0;
    if (game.flags.fixinv === false)
        reassign();
    const sortpack = game.flags.sortpack !== false;
    for (const oclass of sortpack ? inv_order() : [0]) {
        let classcount = 0;
        for (const obj of game.invent || []) {
            if (obj.unpaid && (!sortpack || obj.oclass === oclass)) {
                if (sortpack && !classcount++)
                    tty_putstr(win, 0, let_to_name(oclass, true, false));
                const cost = await unpaid_cost(obj, COST_NOCONTENTS);
                totcost += cost;
                game.iflags.suppress_price = (game.iflags.suppress_price || 0) + 1;
                tty_putstr(win, 0, xprname(obj, distant_name(obj, doname),
                    obj.invlet, true, cost, 0));
                game.iflags.suppress_price--;
                num_so_far++;
            }
        }
    }
    if (count > num_so_far) {
        if (sortpack)
            tty_putstr(win, 0, let_to_name(CONTAINED_SYM, true, false));
        for (const obj of game.invent || []) {
            if (Has_contents(obj)) {
                let contcost = 0;
                marker.v = null;
                while (find_unpaid(obj.cobj, marker)) {
                    const cost = await unpaid_cost(marker.v, COST_NOCONTENTS);
                    totcost += cost;
                    contcost += cost;
                    if (obj.cknown) {
                        game.iflags.suppress_price = (game.iflags.suppress_price || 0) + 1;
                        tty_putstr(win, 0, xprname(marker.v, distant_name(marker.v, doname),
                            CONTAINED_SYM, true, cost, 0));
                        game.iflags.suppress_price--;
                    }
                }
                if (!obj.cknown)
                    tty_putstr(win, 0, xprname(null, `${s_suffix(xname(obj))} contents`,
                        CONTAINED_SYM, true, contcost, 0));
            }
        }
    }
    if (count > 0) {
        tty_putstr(win, 0, '');
        tty_putstr(win, 0, xprname(null, 'Total:', '*', false, totcost, 0));
    }
    if (xtracount > 0) {
        const verb = xtracount > 1 ? 'are' : 'is';
        const where = !buriedcount ? 'on the floor'
            : !floorcount ? 'under the floor' : 'on or under the floor';
        if (!count) {
            await You(`aren't carrying any unpaid items but there ${verb} ${xtracount} ${where}.`);
        } else {
            tty_putstr(win, 0, '');
            tty_putstr(win, 0, `(There ${verb} ${xtracount} more unpaid object${
                xtracount === 1 ? '' : 's'} ${where}.)`);
        }
    }
    if (count > 0) {
        await tty_display_nhwindow(win);
        do {
            await xwaitforspace(' \r\n\x1b');
        } while (game.morc !== '\x1b' && tty_next_page(win));
    }
    tty_destroy_nhwindow(win);
}

// src/invent.c:3827 dotypeinv(), traditional prompts and category menus.
export async function dotypeinv() {
    const prompt = 'What type of object do you want an inventory of?';
    const invent = game.invent || [];
    const billx = !!((game.u.ushops || '').length && await doinvbill(0));
    game.this_type = 0;
    game.this_title = null;
 doI: {
        if (!invent.length && !billx) {
            await You("aren't carrying anything.");
            break doI;
        }
        const u_carried = count_unpaid(invent), u_floor = count_unpaid(game.level.objects),
            u_buried = count_unpaid(game.level.buriedobjs);
        const any_unpaid = u_carried + u_floor + u_buried;
        const b = {}, u = {}, c = {}, x = {}, o = {}, j = {};
        tally_BUCX(invent, false, b, u, c, x, o, j);
        let choice = '\0', types = '', traditional = true;
        if (game.flags.menu_style === MENU_FULL || game.flags.menu_style === MENU_PARTIAL) {
            traditional = false;
            const flags = UNPAID_TYPES | (billx ? BILLED_TYPES : 0)
                | (b.v ? BUC_BLESSED : 0) | (u.v ? BUC_UNCURSED : 0)
                | (c.v ? BUC_CURSED : 0) | (x.v ? BUC_UNKNOWN : 0)
                | (j.v ? JUSTPICKED : 0) | INCLUDE_VENOM;
            const picks = await query_category(prompt, invent, flags, PICK_ONE);
            if (!picks.length)
                break doI;
            game.this_type = picks[0];
            choice = String.fromCharCode(picks[0]);
        }
        if (traditional) {
            const classes = [], itemcount = {};
            let class_count = collect_obj_classes(classes, invent, false, null, itemcount);
            types = classes.join('');
            for (const [include,letter] of [[any_unpaid || billx || b.v+c.v+u.v+x.v || j.v,' '],
                [any_unpaid,'u'],[billx,'x'],[b.v,'B'],[u.v,'U'],[c.v,'C'],[x.v,'X'],[j.v,'P']]) {
                if (include) {
                    types += letter;
                    class_count++;
                }
            }
            types += '\x1b';
            for (const [present,letter] of [[any_unpaid,'u'],[billx,'x'],[b.v,'B'],
                [u.v,'U'],[c.v,'C'],[x.v,'X'],[j.v,'P']])
                if (!present)
                    types += letter;
            for (const symbol of def_oc_syms)
                if (!types.includes(symbol))
                    types += symbol;
            if (class_count > 1) {
                choice = await tty_yn_function(prompt, types, '\0', true);
                if (choice === '\0') {
                    tty_clear_nhwindow_message();
                    break doI;
                }
            } else {
                choice = any_unpaid ? 'u' : billx ? 'x' : types[0];
            }
        }
        if (choice === 'x' || (choice === 'X' && billx && !x.v)) {
            if (billx)
                await doinvbill(1);
            else
                await pline(`No used-up objects${any_unpaid ? ' on your shopping bill' : ''}.`);
            break doI;
        }
        if (choice === 'u' || (choice === 'U' && any_unpaid && !u.v)) {
            if (any_unpaid)
                await dounpaid(u_carried, u_floor, u_buried);
            else
                await You('are not carrying any unpaid objects.');
            break doI;
        }
        let before = '', after = '';
        switch (choice) {
        case 'B': before = 'known to be blessed '; break;
        case 'U': before = 'known to be uncursed '; break;
        case 'C': before = 'known to be cursed '; break;
        case 'X': after = ' whose blessed/uncursed/cursed status is unknown'; break;
        case 'P': after = ' that were just picked up'; break;
        default: before = 'such '; break;
        }
        if (traditional) {
            if (types.indexOf(choice) > types.indexOf('\x1b')) {
                await You(`have no ${before}objects${after}.`);
                break doI;
            }
            game.this_type = 'BUCXP'.includes(choice)
                ? choice.charCodeAt(0) : def_char_to_objclass(choice);
        }
        if ('BUCXP'.includes(choice))
            game.this_title = mungspaces(`Items ${before || after}`) + ':';
        const picks = await query_objlist(null, invent,
            (game.flags.fixinv !== false ? USE_INVLET : 0) | INVORDER_SORT | INCLUDE_VENOM,
            PICK_ONE, this_type_only);
        if (picks.length)
            await itemactions(picks[0]);
    }
    game.this_type = 0;
    game.this_title = null;
    return ECMD_OK;
}

// src/invent.c:3793 this_type_only(), including the goldX classification.
export function this_type_only(obj) {
    const type = game.this_type;
    if (type === 'P'.charCodeAt(0))
        return !!obj.pickup_prev;
    if (obj.oclass === OCLASSES.COIN_CLASS) {
        if (type && 'BUCX'.includes(String.fromCharCode(type)))
            return type === (game.flags.goldX ? 'X' : 'U').charCodeAt(0);
    } else {
        switch (String.fromCharCode(type)) {
        case 'B': return !!(obj.bknown && obj.blessed);
        case 'U': return !!(obj.bknown && !(obj.blessed || obj.cursed));
        case 'C': return !!(obj.bknown && obj.cursed);
        case 'X': return !obj.bknown;
        }
    }
    return obj.oclass === type;
}

// src/invent.c:3220 display_pickinv() — the menu getobj's '?' and '*' open.
//
// `allowed_choices` restricts the listing to those inventory letters ('?'
// passes the command's own filter, '*' passes null for everything). Returns
// the letter the player picked, ESC when cancelled, or 0 for no selection.
//
// The hands entry, force_invmenu's extra query line and the count field are
// recorded; nothing ported reaches them.
export async function display_pickinv(allowed_choices, handsbuf, menuquery,
                                      allownone) {
    const { tty_create_nhwindow, tty_start_menu, tty_add_menu, tty_end_menu,
            tty_select_menu, tty_destroy_nhwindow, tty_get_nhwindow,
            ATR_NONE: A_NONE, ATR_INVERSE: A_INV, NHW_MENU: W_MENU }
        = await import('./tty/wintty.js');
    const { MENU_ITEMFLAGS_NONE, MENU_BEHAVE_STANDARD, PICK_ONE }
        = await import('./const.js');
    const { NO_COLOR } = await import('./terminal.js');

    if (handsbuf || menuquery)
        note_unported_invent('display_pickinv:hands_or_forcemenu');
    const wizid = game.wizard && game.iflags?.override_ID;

    /* src/invent.c:3130 — count 0, 1, or more-than-1 candidates. With
       exactly one item of interest C uses a message-line "menu" instead of
       a window: the single xprname line gets a --More-- whose dismissal
       accepts the item's letter (tty_message_menu), which is why reading
       with one scroll shows "o - a scroll labeled X.--More--" rather than
       opening a menu. force_invmenu defaults off. */
    {
        const n = allowed_choices ? allowed_choices.length
                  : !game.invent?.length ? 0 : game.invent.length === 1 ? 1 : 2;
        if (n === 0) {
            await pline('Not carrying anything.');
            return 0;
        }
        if (game.flags.fixinv === false)
            reassign();
        if (n === 1 && allowed_choices && !wizid) {
            const otmp = (game.invent || [])
                .find(o => o.invlet === allowed_choices[0]);
            if (otmp) {
                const { tty_message_menu } = await import('./tty/wintty.js');
                /* xprname(otmp, NULL, lets[0], TRUE, 0, 0) */
                const line = `${otmp.invlet} - ${doname(otmp)}.`;
                const r = await tty_message_menu(otmp.invlet,
                                                 1 /* PICK_ONE */, line);
                return (r === '\0' || r === 0) ? 0 : r;
            }
        }
    }

    const win = tty_create_nhwindow(W_MENU);
    tty_start_menu(win, MENU_BEHAVE_STANDARD);
    const wizid_fakeobj = {};
    if (wizid) {
        const { MENU_ITEMFLAGS_SKIPINVERT } = await import('./const.js');
        const { visctrl } = await import('./hacklib.js');
        const unid_cnt = count_unidentified(game.invent);
        tty_add_menu_str(win, 'Debug Identify' + (unid_cnt
            ? ` -- unidentified or partially identified item${unid_cnt === 1 ? '' : 's'}` : ''));
        if (!unid_cnt)
            tty_add_menu_str(win, '(all items are permanently identified already)');
        else {
            const override = game.iflags.override_ID;
            let prompt = `select ${unid_cnt === 1 ? 'it' : 'any or all of them'} to permanently identify`;
            if (unid_cnt > 1)
                prompt += ` (${visctrl(override)} for all)`;
            tty_add_menu(win, null, wizid_fakeobj, '_', override, A_NONE, NO_COLOR,
                         prompt, MENU_ITEMFLAGS_SKIPINVERT);
        }
    }
    /* src/invent.c:3273 — C applies the `lets` filter FIRST and only then adds
       the class heading, gated on `!classcount`, so a heading appears just
       before the first item of its class that survived the filter. Emitting
       headings up front instead listed every empty class: quaffing showed
       Coins/Weapons/Armor/... around a lone Potions section. */
    let pending_heading = null;
    for (const e of display_inventory(allowed_choices, !wizid)) {
        if (e.heading) {
            pending_heading = e;
            continue;
        }
        /* for showing a set of specific letters, skip ones not in the set */
        if (allowed_choices && !allowed_choices.includes(e.invlet))
            continue;
        if (pending_heading) {
            tty_add_menu(win, null, 0, 0, 0, A_INV, NO_COLOR,
                         pending_heading.str, MENU_ITEMFLAGS_NONE);
            pending_heading = null;
        }
        const obj = (game.invent || []).find(o => o.invlet === e.invlet);
        const { def_oc_syms } = await import('./drawing_data.js');
        tty_add_menu(win, e.glyphinfo, wizid ? obj : e.invlet.charCodeAt(0),
                     e.invlet, wizid ? def_oc_syms[obj.oclass] : 0,
                     A_NONE, NO_COLOR, e.str, MENU_ITEMFLAGS_NONE);
    }
    /* src/invent.c:3378 — `end_menu(win, (query && *query) ? query : NULL)`.
       getobj passes its menuquery through, which is empty for '?' and '*', so
       this window has NO title; the hardcoded one added a phantom first row. */
    tty_end_menu(win, (menuquery && menuquery.length) ? menuquery : null);

    const picks = await tty_select_menu(win, wizid ? 2 /* PICK_ANY */ : PICK_ONE);
    const cancelled = !!tty_get_nhwindow(win)?.cancelled;
    tty_destroy_nhwindow(win);

    if (cancelled)
        return '\x1b';
    if (!picks.length)
        return 0;
    if (wizid) {
        game.iflags.override_ID = 0;
        let all_id = false;
        for (const otmp of picks) {
            if (otmp === wizid_fakeobj) {
                await identify_pack(0, false);
                all_id = true;
                break;
            }
            if (not_fully_identified(otmp))
                await identify(otmp);
        }
        if (!all_id)
            update_inventory();
        return 0;
    }
    return String.fromCharCode(picks[0]);
}

// src/decl.c:96 quitchars — the keys that abandon a prompt.
const quitchars = ' \r\n\x1b';

// src/invent.c:1752 getobj() — ask which carried object a command applies to.
//
// The whole point of porting this is key consumption. C reads ONE key here for
// the inventory letter, and a command that skips it leaves that letter to run
// as a command instead — the same failure that made 'f' walk the hero a square
// east before dofire was ported. 'e', 'a', 'r', 'd', 't' and 'w' together
// account for over a thousand keystrokes across the public corpus, every one of
// them currently mis-consumed.
//
// C loops until it gets something usable, so an invalid letter costs another
// key; that loop is ported. The count, menu and hands branches need input paths
// this port does not have and are recorded rather than guessed, because each
// consumes a DIFFERENT number of keys and inventing one is worse than none.
// include/hack.h:512 — the obj_ok callback's return values.
export const GETOBJ_EXCLUDE = -3, GETOBJ_EXCLUDE_NONINVENT = -2,
             GETOBJ_EXCLUDE_INACCESS = -1, GETOBJ_EXCLUDE_SELECTABLE = 0,
             GETOBJ_DOWNPLAY = 1, GETOBJ_SUGGEST = 2;
export const GETOBJ_ALLOWCNT = 0x01, GETOBJ_PROMPT = 0x02;
const HANDS_SYM = '-';
/* src/invent.c hands_obj — the sentinel getobj yields for the '-' choice. */
export const hands_obj = { otyp: 0, oclass: 0, hands: true };

// src/invent.c:1830 — the letter list C puts in the prompt.
//
// The '-' arm appends HANDS_SYM and then A SPACE (C's own comment: "put a
// space after the '-' in the prompt"), which is why the prompt reads
// "[- cd or ?*]" and not "[-cd or ?*]".
//
// Inventory is walked in INVLET order (sortloot with SORTLOOT_INVLET), and
// each letter is appended FIRST and then removed when the filter rejects it.
function getobj_letters(obj_ok, ctrlflags) {
    let buf = '';
    let altbuf = '';
    let forceprompt = (ctrlflags & GETOBJ_PROMPT) !== 0;

    let allownone = false;
    let inaccess = 0;
    /* src/invent.c:1838, classify hands and declined floor alternatives. */
    switch (obj_ok ? obj_ok(null) : GETOBJ_EXCLUDE) {
    case GETOBJ_SUGGEST:
        allownone = true;
        buf += HANDS_SYM + ' ';
        break;
    case GETOBJ_DOWNPLAY:
    case GETOBJ_EXCLUDE_INACCESS:
    case GETOBJ_EXCLUDE_SELECTABLE:
        allownone = true;
        altbuf += HANDS_SYM;
        break;
    case GETOBJ_EXCLUDE_NONINVENT:
        forceprompt = false;
        inaccess++;
        break;
    default:
        break;
    }

    /* The chain is kept in inv_rank order by reorder_invent(). */
    let suggested = 0;
    for (const otmp of (game.invent || [])) {
        const v = obj_ok ? obj_ok(otmp) : GETOBJ_SUGGEST;
        if (v === GETOBJ_SUGGEST) {
            buf += otmp.invlet;
            suggested++;
        } else if (v === GETOBJ_EXCLUDE_INACCESS) {
            inaccess++;
        } else if (v === GETOBJ_DOWNPLAY) {
            /* src/invent.c altlets: acceptable but omitted from the likely
               choices. Their presence still forces the [*] prompt. */
            altbuf += otmp.invlet;
            forceprompt = true;
        }
    }
    if (!suggested && buf.endsWith(' '))
        buf = buf.slice(0, -1);
    /* src/invent.c:1908 — "if (suggested > 5) compactify" — five letters
       stay verbatim, six or more compress */
    /* src/invent.c:1907 copies the complete letter list into `lets` before
       compactifying `buf` for the one-line prompt.  The menu must receive
       the complete list: treating a prompt range such as "d-g" as literal
       characters silently drops e and f from the inventory window. */
    return {
        choices: buf,
        altChoices: altbuf,
        prompt: suggested > 5 ? compactify(buf) : buf,
        forceprompt,
        inaccess,
        allownone,
    };
}

// src/invent.c:1627 compactify() — "a-e" for 3+ consecutive letters, and
// "#-#" for 3+ NOINVSYM. A faithful transliteration of the C in-place loop.
function compactify(str) {
    if (str.length < 3)
        return str;
    const NOINVSYM = '#';
    const buf = str.split('');
    let i1 = 1, i2 = 1;
    let ilet2 = buf[0];
    let ilet1 = buf[1];
    buf[++i2] = buf[++i1];
    let ilet = buf[i1];
    while (ilet !== undefined) {
        if (ilet.charCodeAt(0) === ilet1.charCodeAt(0) + 1) {
            if (ilet1.charCodeAt(0) === ilet2.charCodeAt(0) + 1) {
                buf[i2 - 1] = ilet1 = '-';
            } else if (ilet2 === '-') {
                ilet1 = String.fromCharCode(ilet1.charCodeAt(0) + 1);
                buf[i2 - 1] = ilet1;
                buf[i2] = buf[++i1];
                ilet = buf[i1];
                continue;
            }
        } else if (ilet === NOINVSYM) {
            if (i2 >= 2 && buf[i2 - 2] === NOINVSYM && buf[i2 - 1] === NOINVSYM)
                buf[i2 - 1] = '-';
            else if (i2 >= 3 && buf[i2 - 3] === NOINVSYM && buf[i2 - 2] === '-'
                     && buf[i2 - 1] === NOINVSYM)
                --i2;
        }
        ilet2 = ilet1;
        ilet1 = ilet;
        buf[++i2] = buf[++i1];
        ilet = buf[i1];
    }
    return buf.slice(0, i2).join('');
}

export async function getobj(word, obj_ok_func, ctrlflags) {
    /* src/invent.c:1779 — a queued CMDQ_KEY picks the object without
       prompting; a failed lookup discards the rest of the canned queue so a
       broken script cannot run its tail against the wrong object. Queued
       hands choices use the same suitability callback as object letters. */
    const allowcnt = !!(ctrlflags & GETOBJ_ALLOWCNT);
    let cnt = 0;
    let cntgiven = false;
    /* src/invent.c:2073 split_otmp: — a count smaller than the stack splits
       off that many (cursed loadstones excepted) */
    const split_otmp = (otmp) => {
        if (cntgiven) {
            if (cnt === 0)
                return null;
            if (cnt !== otmp.quan) {
                /* don't split a stack of cursed loadstones */
                if (splittable(otmp))
                    otmp = splitobj(otmp, cnt);
                else if (otmp.otyp === ONAMES.LOADSTONE && otmp.cursed)
                    /* kludge for canletgo()'s can't-drop-this message */
                    otmp.corpsenm = cnt;
            }
        }
        return otmp;
    };
    for (;;) {   /* need_more_cq: */
        const cmdq = cmdq_pop();
        if (!cmdq)
            break;
        let otmp = null;
        if (cmdq.typ === CMDQ_KEY) {
            if (cmdq.key === HANDS_SYM) {
                const v = await obj_ok_func(null);
                if (v === GETOBJ_SUGGEST || v === GETOBJ_DOWNPLAY)
                    otmp = hands_obj;
            } else {
                /* there could be more than one match if key is '#';
                   take first one which passes the obj_ok callback */
                for (const o of (game.invent || []))
                    if (o.invlet === cmdq.key) {
                        const v = await obj_ok_func(o);
                        if (v === GETOBJ_SUGGEST || v === GETOBJ_DOWNPLAY) {
                            otmp = o;
                            break;
                        }
                    }
            }
        } else if (cmdq.typ === CMDQ_INT) {
            /* getting a partial stack */
            if (!cntgiven && allowcnt) {
                cnt = cmdq.intval | 0;
                cntgiven = true;
                continue; /* now, get CMDQ_KEY */
            } else {
                cmdq_clear(CQ_CANNED);
                /* should maybe clear the CQ_REPEAT too? */
                return null;
            }
        }
        if (!otmp) {               /* didn't find what we were looking for, */
            cmdq_clear(CQ_CANNED); /* so discard any other queued cmnds */
        } else if (cntgiven) {
            /* if stack is smaller than count, drop the whole stack */
            if (cnt < 1 || otmp.quan <= cnt)
                cntgiven = false;
            return split_otmp(otmp);
        }
        return otmp;
    }

    /* src/invent.c:1919 — the prompt, then yn_function reads the key. Our
       loop already read a key here; routing it through tty_yn_function adds
       the paint without changing which keys are consumed. */
    if (game.flags.fixinv === false)
        reassign();
    let qbuf = `What do you want to ${word}?`;
    const { choices: lets, altChoices, prompt: promptLets, forceprompt,
            inaccess, allownone } = getobj_letters(obj_ok_func, ctrlflags | 0);

    /* src/invent.c:1911 — nothing suggested, no forced prompt, no '-'
       choice: refuse up front. */
    if (!lets && !forceprompt && !allownone) {
        await You(`don't have anything ${inaccess ? 'else ' : ''}to ${word}.`);
        return null;
    }
    qbuf += promptLets
        ? ` [${promptLets}${promptLets.endsWith(' ') ? '' : ' '}or ?*]`
        : ' [*]';

    for (;;) {
        cnt = 0;
        cntgiven = false;
        let ilet = await tty_yn_function(qbuf, null, '\0', false);

        if (ilet >= '0' && ilet <= '9') {
            const tmpcnt = { value: 0 };

            if (!allowcnt) {
                await pline('No count allowed with this command.');
                continue;
            }
            ilet = await get_count(null, ilet, LARGEST_INT, tmpcnt, GC_SAVEHIST);
            if (tmpcnt.value) {
                cnt = tmpcnt.value;
                cntgiven = true;
            }
        }
        if (quitchars.includes(ilet)) {
            /* src/invent.c:1950 */
            if (game.flags.verbose)
                await pline(Never_mind);
            /* The caller returns ECMD_CANCEL, then rhack's reset_cmd_vars
               erases the just-built do-again queue. Do it at the shared
               cancellation point so every getobj command gets that rule. */
            if (!game.in_doagain)
                cmdq_clear(CQ_REPEAT);
            return null;
        }
        if (ilet === '-') {
            /* HANDS_SYM — "your hands" as the object; C returns &hands_obj
               when the filter allows the no-object choice */
            const v = obj_ok_func ? await obj_ok_func(null) : GETOBJ_EXCLUDE;
            if (v === GETOBJ_SUGGEST || v === GETOBJ_DOWNPLAY
                || v === GETOBJ_EXCLUDE_INACCESS || v === GETOBJ_EXCLUDE_SELECTABLE)
                return hands_obj;
            note_unported_invent('getobj:hands');
            return null;
        }
        if (ilet === '?' || ilet === '*') {
            /* src/invent.c:1963 — '?' lists only the letters this command
               accepts, '*' lists everything. */
            const allowed_choices = (ilet === '?') ? (lets || altChoices) : null;
            /* C's `allownone` comes from the '-' choice being offered; our
               hands arm above is recorded, so it is always false here. */
            ilet = await display_pickinv(allowed_choices, null, null, false);
            if (!ilet)
                continue;
            if (ilet === '\x1b') {
                if (game.flags?.verbose)
                    await pline(Never_mind);
                return null;
            }
            /* '*'/'?' inside the menu would redo it; not reachable here */
        }

        let otmp = (game.invent || []).find(o => o.invlet === ilet) || null;
        if (cntgiven && word === 'throw') {
            const only_one = 'can only throw one at a time';
            /* permit counts for throwing gold, but don't accept counts
               for other things since the throw code will split off a
               single item anyway; if populating quiver, 'word' will be
               "ready" or "fire" and this restriction doesn't apply */
            if (cnt === 0 || !otmp)
                return null;
            const coins = (otmp.oclass === OCLASSES.COIN_CLASS);
            if (cnt > 1 && (!coins || cnt > otmp.quan)) {
                if (cnt > otmp.quan)
                    await You(`only have ${otmp.quan}${
                        (!coins && otmp.quan > 1) ? ' and ' : ''}${
                        (!coins && otmp.quan > 1) ? only_one : ''}.`);
                else
                    await You(`${only_one}.`);
                continue;
            }
        }
        (game.disp ||= {}).botl = true; /* May have changed the amount of money */
        /* src/invent.c:2050, remember a live inventory selection after
           the command entry and before validating its object filter.
           Ctrl-A then selects the same letter without painting a second
           prompt or consuming another input key. */
        if (otmp && !game.in_doagain) {
            if (cntgiven && cnt > 0)
                cmdq_add_int(CQ_REPEAT, cnt);
            cmdq_add_key(CQ_REPEAT, ilet);
        }
        /* verify the chosen object */
        if (!otmp) {
            /* src/invent.c:2059 — an unrecognised letter says so, then the
               re-issued prompt forces --More-- on the message. */
            await You("don't have that object.");
            if (game.in_doagain)
                return null;
            continue;
        } else if (cnt < 0 || otmp.quan < cnt) {
            await You(`don't have that many!  You have only ${otmp.quan}.`);
            if (game.in_doagain)
                return null;
            continue;
        }
        const allowed = obj_ok_func ? await obj_ok_func(otmp)
                                    : GETOBJ_SUGGEST;
        if (allowed === GETOBJ_EXCLUDE) {
            await pline(`That is a silly thing to ${word}.`);
            return null;
        }
        return split_otmp(otmp);
    }
}

// src/invent.c:1466 sobj_at() — try to find a particular type of object at
// designated map location.
//
// C walks svl.level.objects[x][y] through ->nexthere. This port keeps one flat
// list that place_object() PREPENDS to, so filtering it in order yields the
// same relative order the per-square chain would.
//
// It was stubbed to a bare `false` in two files. Everything that asks "is there
// a boulder here" (mfndpos' Sokoban arm, a pet's dig check) or "is there a
// scroll of scare monster here" (onscary) got NO from a function that had never
// src/invent.c:1495 carrying() — first inventory object of the given type.
export function carrying(type) {
    for (const otmp of game.invent || []) {
        if (otmp.otyp === type)
            return otmp;
    }
    return null;
}

// src/invent.c:1587 o_on(); search a chain and its nested container contents.
export function o_on(id, objchn) {
    for (const obj of objchn || []) {
        if (obj.o_id === id)
            return obj;
        if (obj.cobj?.length) {
            const contained = o_on(id, obj.cobj);
            if (contained)
                return contained;
        }
    }
    return null;
}

// looked, which is a wrong answer rather than a missing one.
export function sobj_at(otyp, x, y) {
    for (const otmp of (game.level.objects || []))
        if (otmp.ox === x && otmp.oy === y && otmp.otyp === otyp)
            return otmp;

    return null;
}

// src/invent.c:4763 useupf() — consume `numused` of a stack lying on the FLOOR.
//
// The floor twin of useup(). C's comment on the split is worth keeping:
// burn_floor_objects() holds an object pointer it tries to useupf() more than
// once, so obj has to survive when the stack is plural.
//
// The shop-billing arm is gated on costly_spot(), which answers false on any
// level without a shop, so the ordinary path is fully ported.
export async function useupf(obj, numused) {
    const at_u = u_at(obj.ox, obj.oy);
    let otmp;

    /* burn_floor_objects() keeps an object pointer that it tries to
     * useupf() multiple times, so obj must survive if plural */
    if (obj.quan > numused)
        otmp = splitobj(obj, numused);
    else
        otmp = obj;

    if (!game.context?.mon_moving && costly_spot(otmp.ox, otmp.oy)) {
        const rooms = in_rooms(otmp.ox, otmp.oy, 0);
        if (rooms && (game.u.urooms || '').includes(rooms[0]))
            await addtobill(otmp, false, false, false);
        else
            (game.unported ||= new Set()).add('useupf:stolen_value');
    }
    delobj(otmp);
    if (otmp.where === OBJ_FREE)
        obfree(otmp);
    if (at_u && game.u?.uundetected && hides_under(game.youmonst?.data))
        hideunder(game.youmonst);
}

// src/invent.c:4366 stackobj() — merge a just-dropped object into any
// compatible stack already on its square.
//
// C walks svl.level.objects[ox][oy] through the nexthere chain; the port keeps
// one flat array and filters on ox/oy, so the iteration order is the array's.
// merged() does the real work and is already ported.
//
// The break matters: C stops at the FIRST successful merge rather than
// continuing, because merged() has already freed the merged-away object.
export function stackobj(obj) {
    for (const otmp of (game.level?.objects || []))
        if (otmp.ox === obj.ox && otmp.oy === obj.oy
            && otmp !== obj && merged({ o: obj }, { o: otmp }))
            break;
    return;
}

// src/mkobj.c weight() — how heavy is this stack, right now.
//
// Needed by merged(), which is the most-reached unported path in the whole
// port: tools/generalize.mjs finds it in 58% of random games.
//
// **5.0 delta**: coins used to weigh 0 for quantities 1..49. They now always
// weigh at least 1 unit. Writing this from 3.6 memory gives every early gold
// pile the wrong weight.
export function weight(obj) {
    let wt = game.objects[obj.otyp].oc_weight; /* weight of 1 'otyp' */

    if (obj.quan < 1)
        return 0;                       /* impossible("Calculating weight...") */

    /* globs manage their own owt in mksobj/obj_absorb/shrink_glob */
    if (obj.globby)
        return obj.owt;

    if (Is_container(obj) || obj.otyp === ONAMES.STATUE) {
        if (obj.otyp === ONAMES.STATUE && ismnum(obj.corpsenm)) {
            const msize = game.mons[obj.corpsenm].msize;   /* 0..7 */
            const minwt = (msize + msize + 1) * 100;

            /* default statue weight is 1.5 times corpse weight */
            wt = Math.trunc(3 * game.mons[obj.corpsenm].cwt / 2);
            if (wt < minwt)
                wt = minwt;
            wt *= obj.quan;             /* no effect; statues don't stack */
        }

        let cwt = 0;
        for (const contents of (obj.cobj || []))
            cwt += weight(contents);

        if (obj.otyp === ONAMES.BAG_OF_HOLDING)
            cwt = obj.cursed ? (cwt * 2)
                : obj.blessed ? Math.trunc((cwt + 3) / 4)
                    : Math.trunc((cwt + 1) / 2); /* uncursed */

        return wt + cwt;
    }
    if (obj.otyp === ONAMES.CORPSE && ismnum(obj.corpsenm)) {
        const long_wt = obj.quan * game.mons[obj.corpsenm].cwt;

        wt = (long_wt > LARGEST_INT) ? LARGEST_INT : long_wt;
        if (obj.oeaten)
            wt = eaten_stat(wt, obj);
        return wt;
    } else if (obj.oclass === OCLASSES.FOOD_CLASS && obj.oeaten) {
        return eaten_stat(obj.quan * wt, obj);
    } else if (obj.oclass === OCLASSES.COIN_CLASS) {
        /* 5.0: always weigh at least 1 unit; used to yield 0 for 1..49 */
        wt = Math.trunc((obj.quan + 50) / 100);
        return Math.max(wt, 1);
    } else if (obj.otyp === ONAMES.HEAVY_IRON_BALL && obj.owt !== 0) {
        return obj.owt;                 /* kludge for "very" heavy iron ball */
    } else if (obj.otyp === ONAMES.CANDELABRUM_OF_INVOCATION && obj.spe) {
        return wt + obj.spe * game.objects[ONAMES.TALLOW_CANDLE].oc_weight;
    }
    return (wt ? wt * obj.quan : (obj.quan + 1) >> 1);
}


// include/monst.h:285 ismnum()
//
// Must bound on NUMMONS, not game.mons.length. tools/gen-monst.mjs appends the
// zeroed terminator back after counting (C indexes mons[NUMMONS] deliberately),
// so mons.length is NUMMONS + 1 and a length bound accepts corpsenm == NUMMONS,
// which C rejects. weight() would then read the terminator's cwt of 0 instead
// of falling through to the generic quan * oc_weight.
const ismnum = (x) => x >= LOW_PM && x < NUMMONS;

const LOW_PM = 0, LARGEST_INT = 32767;

// src/eat.c:3788 eaten_stat() — scale a stat by how much of the food is left.
//
// The zero case is 0, not "divide by 1". Guarding the denominator instead of
// the whole expression returns base * uneaten there, which is wrong and large.
export function eaten_stat(base, obj) {
    /* get full_amount first; obj_nutrition() might modify obj->oeaten */
    const full_amount = obj_nutrition(obj);
    let uneaten_amt = obj.oeaten;

    if (uneaten_amt > full_amount)
        uneaten_amt = full_amount;      /* impossible(...) in C */

    base = full_amount
        ? Math.trunc(base * uneaten_amt / full_amount)
        : 0;
    return (base < 1) ? 1 : base;
}

// src/eat.c obj_nutrition()
function obj_nutrition(otmp) {
    return (otmp.otyp === ONAMES.CORPSE) ? game.mons[otmp.corpsenm].cnutrit
         : otmp.globby ? otmp.owt
         : game.objects[otmp.otyp].oc_nutrition;
}

// src/invent.c mergable() — may `obj` be folded into the `otmp` stack?
//
// Pure predicate, no draws. The arms needing subsystems we lack (erosion_matters
// on unported eroded state, same_price for shops, safe_oname for named objects)
// are the LAST few; everything before them is decided here.
export function mergable(otmp, obj) {
    /* fail if already the same object, if different types, if either is
       explicitly marked to prevent merge, or if not mergable in general */
    if (obj === otmp || obj.otyp !== otmp.otyp
        || obj.nomerge || otmp.nomerge || !game.objects[obj.otyp].oc_merge)
        return false;

    /* coins of the same kind will always merge */
    if (obj.oclass === OCLASSES.COIN_CLASS)
        return true;

    if (!!obj.cursed !== !!otmp.cursed || !!obj.blessed !== !!otmp.blessed)
        return false;

    if (obj.how_lost === LOST_EXPLODING || otmp.how_lost === LOST_EXPLODING)
        return false;
    if (otmp.how_lost !== LOST_NONE && (obj.how_lost !== otmp.how_lost))
        return false;

    if (obj.globby)
        return true;

    if (!!obj.unpaid !== !!otmp.unpaid || (obj.spe | 0) !== (otmp.spe | 0)
        || !!obj.no_charge !== !!otmp.no_charge
        || !!obj.obroken !== !!otmp.obroken
        || !!obj.otrapped !== !!otmp.otrapped
        || !!obj.lamplit !== !!otmp.lamplit)
        return false;

    if (obj.oclass === OCLASSES.FOOD_CLASS
        && ((obj.oeaten | 0) !== (otmp.oeaten | 0)
            || !!obj.orotten !== !!otmp.orotten))
        return false;

    if (!!obj.dknown !== !!otmp.dknown
        || (!!obj.bknown !== !!otmp.bknown && !Role_if(PM_CLERIC)
            && (Blind() || Hallucination()))
        || (obj.oclass === OCLASSES.POTION_CLASS
            && !!obj.odiluted !== !!otmp.odiluted)
        || (obj.oeroded | 0) !== (otmp.oeroded | 0)
        || (obj.oeroded2 | 0) !== (otmp.oeroded2 | 0)
        || !!obj.greased !== !!otmp.greased)
        return false;

    if (erosion_matters(obj, game.objects)
        && (!!obj.oerodeproof !== !!otmp.oerodeproof
            || (!!obj.rknown !== !!otmp.rknown && (Blind() || Hallucination()))))
        return false;

    if (obj.otyp === ONAMES.CORPSE || obj.otyp === ONAMES.EGG
        || obj.otyp === ONAMES.TIN) {
        if (obj.corpsenm !== otmp.corpsenm)
            return false;
    }

    /* hatching eggs don't merge; ditto for revivable corpses */
    if ((obj.otyp === ONAMES.EGG && (obj.timed || otmp.timed))
        || (obj.otyp === ONAMES.CORPSE && otmp.corpsenm >= LOW_PM
            && is_reviver(game.mons[otmp.corpsenm])))
        return false;

    /* allow candle merging only if their ages are close; see begin_burn()
       for a reference for the magic "25" */
    if (Is_candle(obj)
        && Math.trunc((obj.age | 0) / 25) !== Math.trunc((otmp.age | 0) / 25))
        return false;

    /* burning potions of oil never merge */
    if (obj.otyp === ONAMES.POT_OIL && obj.lamplit)
        return false;

    if (obj.unpaid && !same_price(obj, otmp))
        return false;

    /* some additional information is always incompatible */
    if (obj.omonst || obj.omid || otmp.omonst || otmp.omid)
        return false;

    /* if they have names, make sure they're the same */
    const objname = obj.oname || '', otmpname = otmp.oname || '';
    if ((objname.length !== otmpname.length
         && ((objname.length && otmpname.length) || obj.otyp === ONAMES.CORPSE))
        || (objname.length && otmpname.length
            && objname.slice(0, objname.length)
               !== otmpname.slice(0, objname.length)))
        return false;

    /* if one has an attached mail command, other must have same command */
    if (!obj.omailcmd ? !!otmp.omailcmd
                      : (!otmp.omailcmd || obj.omailcmd !== otmp.omailcmd))
        return false;

    /* should be moot since matching artifacts wouldn't be unique */
    if ((obj.oartifact | 0) !== (otmp.oartifact | 0))
        return false;

    if (!!obj.known !== !!otmp.known && (Blind() || Hallucination()))
        return false;

    return true;
}

// src/mkobj.c pudding_merge_message(): report two globs coalescing.
async function pudding_merge_message(otmp, obj) {
    const visible = cansee(otmp.ox, otmp.oy) || cansee(obj.ox, obj.oy);
    const onfloor = otmp.where === OBJ_FLOOR || obj.where === OBJ_FLOOR;
    const inpack = carried(otmp) || carried(obj);

    if ((!Blind() && visible) || inpack) {
        if (Hallucination()) {
            if (onfloor)
                await You_see('parts of the floor melting!');
            else if (inpack)
                await Your('pack reaches out and grabs something!');
        } else if (onfloor || inpack) {
            const adjacent = ((otmp.ox !== game.u.ux
                               || otmp.oy !== game.u.uy)
                              && (obj.ox !== game.u.ux
                                  || obj.oy !== game.u.uy));
            await pline(`The ${onfloor && adjacent ? 'adjacent ' : ''}`
                        + `${makeplural(obj_typename(otmp.otyp))} coalesce`
                        + `${inpack ? ' inside your pack' : ''}.`);
        }
    } else {
        await You_hear('a faint sloshing sound.');
    }
}

// src/mkobj.c obj_absorb(): augment the surviving glob and discard the
// absorbed one. merged() has already unlinked obj and stopped its timers.
function absorb_globs(potmp, pobj) {
    const otmp = potmp.o, obj = pobj.o;
    if (!otmp || !obj || otmp === obj)
        return null;

    if (!!otmp.bknown !== !!obj.bknown)
        otmp.bknown = obj.bknown = 0;
    if (!!otmp.rknown !== !!obj.rknown)
        otmp.rknown = obj.rknown = 0;
    if (!!otmp.greased !== !!obj.greased)
        otmp.greased = obj.greased = 0;
    if (otmp.orotten || obj.orotten)
        otmp.orotten = obj.orotten = 1;

    const otmpWeight = otmp.oeaten ? otmp.oeaten : otmp.owt;
    const objWeight = obj.oeaten ? obj.oeaten : obj.owt;
    const totalWeight = otmpWeight + objWeight;
    if (totalWeight > 0) {
        const moves = game.moves ?? 0;
        const relativeAge = Math.trunc(
            ((moves - (otmp.age ?? 0)) * otmpWeight
             + (moves - (obj.age ?? 0)) * objWeight) / totalWeight);
        otmp.age = moves - relativeAge;
    }
    otmp.owt += objWeight;
    if (otmp.oeaten || obj.oeaten)
        otmp.oeaten = totalWeight;
    otmp.quan = 1;

    if (otmp.globby && obj.globby) {
        const otmpTimer = stop_timer(SHRINK_GLOB, otmp) || 25;
        const objTimer = stop_timer(SHRINK_GLOB, obj) || 25;
        start_glob_timeout(otmp,
                           Math.trunc((otmpTimer + objTimer + 1) / 2));
    }

    obj_extract_self(obj);
    obj.where = OBJ_DELETED;
    pobj.o = null;
    return otmp;
}

// src/invent.c merged() — fold *pobj into *potmp. Returns 1 on success.
//
// Both arguments are pointers-to-pointers in C because otmp can be REPLACED by
// oname(); the JS equivalent is a one-element holder so the caller sees it.
export function merged(potmp, pobj) {
    let otmp = potmp.o;
    const obj = pobj.o;

    if (mergable(otmp, obj)) {
        /* Approximate age. Not done when lit: the burn would have to be
           stopped on both, merged, then restarted. */
        if (!obj.lamplit && !obj.globby)
            otmp.age = Math.trunc(((otmp.age | 0) * otmp.quan
                                   + (obj.age | 0) * obj.quan)
                                  / (otmp.quan + obj.quan));

        if (!otmp.globby)
            otmp.quan += obj.quan;
        /* temporary special case for gold objects!!!! */
        if (otmp.oclass === OCLASSES.COIN_CLASS) {
            otmp.owt = weight(otmp);
            otmp.bknown = 0;
        } else if (!Is_pudding(otmp)) {
            otmp.owt = weight(otmp);
        }
        if (!has_oname(otmp) && has_oname(obj))
            otmp = potmp.o = oname(otmp, ONAME(obj), ONAME_SKIP_INVUPD);

        obj_extract_self(obj);

        if (obj.pickup_prev && otmp.where === OBJ_INVENT)
            otmp.pickup_prev = 1;

        if (obj.lamplit)
            obj_merge_light_sources(obj, otmp);
        if (obj.timed)
            obj_stop_timers(obj);

        /* objects can be identified by comparing them (unless Blind,
           but that is handled in mergable()); the object becomes
           identified in a particular dimension if either object was
           previously identified in that dimension, and if the
           identification states don't match, one of them must have
           previously been identified */
        let discovered = false;
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
            if (!(game.urole?.mnum === 'PM_CLERIC'   /* Role_if(PM_CLERIC) */
                  || game.urole?.mnum === PMNAMES.PM_CLERIC))
                discovered = true;
        }

        if (obj.owornmask && carried(otmp)) {
            let wmask = otmp.owornmask | obj.owornmask;
            /* src/invent.c:892; wielded, alternate, then quivered, in
               that order, even when both stacks already occupy slots. */
            if (wmask & W_WEP)
                wmask = W_WEP;
            else if (wmask & W_SWAPWEP)
                wmask = W_SWAPWEP;
            else if (wmask & W_QUIVER)
                wmask = W_QUIVER;
            else {
                return impossible(`merging strangely worn items (${wmask.toString(16)})`)
                    .then(() => {
                        setworn(otmp, otmp.owornmask);
                        setnotworn(obj);
                        return finish_merge();
                    });
            }
            if (otmp.owornmask & ~wmask)
                setnotworn(otmp);
            setworn(otmp, wmask);
            setnotworn(obj);
        }

        return finish_merge();

        /* The impossible() diagnostic can wait for input. Resume C's
           remaining merge steps after that message has finished. */
        function finish_merge() {

            if (obj.bypass)
                otmp.bypass = 1;

            if (obj.globby) {
                if (carried(otmp)) {
                    return (async () => {
                        await pudding_merge_message(otmp, obj);
                        absorb_globs(potmp, pobj);
                        return 1;
                    })();
                }
                void pudding_merge_message(otmp, obj);
                absorb_globs(potmp, pobj);
                return 1;
            }

            /* Print a message if item comparison discovers more
               information about the items (with the exception of thrown
               items, where this would be too spammy as such items get
               unidentified by monsters very frequently). */
            if (discovered && otmp.where === OBJ_INVENT
                && obj.how_lost !== LOST_THROWN
                && otmp.how_lost !== LOST_THROWN) {
                /* pline() must be awaited but merged() has sync callers on
                   floor/minvent stacks that can never reach this arm (the
                   OBJ_INVENT test); hand those callers a plain 1 and hand the
                   inventory-side callers (addinv) a promise to await. */
                return (async () => {
                    await pline(
                        'You learn more about your items by comparing them.');
                    obfree(obj, otmp);
                    return 1;
                })();
            }

            obfree(obj, otmp);
            return 1;
        }
    }
    return 0;
}

// src/invent.c money_cnt() — total gold carried.
export function money_cnt(invent) {
    for (const otmp of invent || [])
        if (otmp.oclass === OCLASSES.COIN_CLASS)
            return otmp.quan;
    return 0;
}

// src/shk.c:3046 contained_gold() and src/vault.c:1257 hidden_gold().
// Unknown nested containers only contribute when the caller requests all
// hidden gold, as end-of-game scoring does.
export function contained_gold(obj, even_if_unknown = false) {
    let value = 0;
    for (const otmp of obj?.cobj || []) {
        if (otmp.oclass === OCLASSES.COIN_CLASS)
            value += otmp.quan;
        else if ((otmp.cobj || []).length
                 && (otmp.cknown || even_if_unknown))
            value += contained_gold(otmp, even_if_unknown);
    }
    return value;
}

export function hidden_gold(invent, even_if_unknown = false) {
    let value = 0;
    for (const obj of invent || []) {
        if ((obj.cobj || []).length && (obj.cknown || even_if_unknown))
            value += contained_gold(obj, even_if_unknown);
    }
    return value;
}

// src/mkobj.c obj_extract_self() — unlink the object from wherever it lives.
export function obj_extract_self(obj) {
    switch (obj.where) {
    case OBJ_FREE:
        break;
    case OBJ_CONTAINED: {
        const c = obj.ocontainer;
        if (c && c.cobj) {
            const i = c.cobj.indexOf(obj);
            if (i >= 0) c.cobj.splice(i, 1);
            c.owt = weight(c);          /* container_weight() */
        }
        obj.ocontainer = null;
        break;
    }
    case OBJ_MINVENT: {
        const m = obj.ocarry;
        if (m && m.minvent) {
            const i = m.minvent.indexOf(obj);
            if (i >= 0) m.minvent.splice(i, 1);
        }
        obj.ocarry = null;
        break;
    }
    case OBJ_INVENT:
        freeinv(obj);       /* src/mkobj.c:2573 -- ported at invent.js:622 */
        break;
    case OBJ_BURIED: {
        const objs = game.level?.buriedobjs;
        if (objs) {
            const i = objs.indexOf(obj);
            if (i >= 0) objs.splice(i, 1);
        }
        break;
    }
    default: {   /* OBJ_FLOOR — remove_object() */
        const objs = game.level?.objects;
        if (objs) {
            const i = objs.indexOf(obj);
            if (i >= 0) objs.splice(i, 1);
        }
        /* src/mkobj.c:2517 remove_object() — a boulder leaving the floor may
           open the point up again (or not, if another boulder remains). */
        if (obj.otyp === ONAMES.BOULDER)
            recalc_block_point(obj.ox, obj.oy); /* vision */
        break;
    }
    }
    obj.where = OBJ_FREE;
}

// include/obj.h:481 — how_lost values. These live in js/const.js; the local
// copy that stood here had LOST_EXPLODING = 1, which is LOST_THROWN's value,
// so every thrown missile was treated as exploding and never merged.

// include/mondata.h:170 is_reviver()
const is_reviver = (ptr) => !!ptr && (is_rider(ptr) || ptr.mlet === MONSYMS.S_TROLL);

/* Blind() needs the blindness property plumbing; it only ever makes mergable
   STRICTER, so a false here can merge two stacks C would keep apart while the
   hero is blind. */
function Blind() { return heroBlind(); }

/* src/role.c Role_if() — this used to be hardcoded `return false`, which
   silently disabled every role test in this file. C switches on a PM number;
   our role table carries the display name, and PM_CLERIC's role is spelled
   "Priest". */
function Role_if(role) {
    return game.urole?.name?.m === role;
}
const PM_CLERIC = 'Priest';

function note_unported_invent(what) {
    (game.unported ||= new Set()).add(what);
}

// src/invent.c:2895 xprname()
export function xprname(obj, txt, let_, dot, cost, quan) {
    const use_invlet = game.flags.fixinv !== false && obj
        && let_ !== CONTAINED_SYM && let_ !== HANDS_SYM;
    let savequan = 0;
    if (quan && obj) {
        savequan = obj.quan;
        obj.quan = quan;
    }
    if (!txt)
        txt = doname(obj);
    let txtlen = txt.length, suffix, pad = false;
    if (cost !== 0 || let_ === '*') {
        if (dot && use_invlet)
            let_ = obj.invlet;
        suffix = `${game.iflags.menu_tab_sep ? '\t' : ' '}${String(cost).padStart(6)} ${currency(cost).slice(0, 50)}`;
        if (!game.iflags.menu_tab_sep) {
            pad = true;
            if (txtlen < 45)
                txtlen = 45;
        }
    } else {
        if (use_invlet)
            let_ = obj.invlet;
        suffix = dot ? '.' : '';
    }
    if (txtlen > BUFSZ - 1 - (4 + suffix.length))
        txtlen = BUFSZ - 1 - (4 + suffix.length);
    let text = txt.slice(0, txtlen);
    if (pad)
        text = text.padEnd(45);
    const result = `${let_} - ${text}${suffix}`;
    if (savequan)
        obj.quan = savequan;
    return result;
}

// src/invent.c:2861 obj_to_let(); assign floating letters before printing.
function obj_to_let(obj) {
    if (game.flags.fixinv === false) {
        obj.invlet = '#';
        reassign();
    }
    return obj.invlet;
}

// src/invent.c prinv() — print one inventory line, optionally prefixed.
// A partial-stack quantity (a merge added quan to a bigger stack) drops the
// period and, when flags.verbose, appends " (N in total).".
export async function prinv(prefix, obj, quan) {
    const total_of = !!(quan && (quan < obj.quan));

    if (!prefix) prefix = '';
    const totalbuf = total_of ? ` (${obj.quan} in total).` : '';
    await pline(`${prefix}${prefix ? ' ' : ''}`
                + xprname(obj, null, obj_to_let(obj), !total_of, 0, quan)
                + (game.flags?.verbose !== false ? totalbuf : ''));
}

// src/invent.c freeinv_core() — the bookkeeping an object needs on its way
// OUT of inventory, before it is freed or moved.
//
// Almost all of it is quest/invocation artifact tracking: the Amulet, the
// Candelabrum, the Bell, the Book and the quest artifact each clear their
// u.uhave flag, and C calls impossible() if the flag was not set. None of
// those can be carried this early, so every arm is recorded rather than
// guessed at.
//
// The three that are NOT artifact bookkeeping matter more often: a LOADSTONE
// is CURSED on the way out (that is how it resists being dropped), anything
// conferring luck triggers set_moreluck, and a timed FIGURINE has its
// transform timer stopped. The tin reference is cleared last.
// src/artifact.c:? confers_luck() — does carrying this raise Luck?
//
// The oartifact test short-circuits before spec_ability(), so for any ordinary
// object this answers FALSE without needing the artifact subsystem at all.
// Only an actual artifact reaches spec_ability(), which needs get_artifact()
// and the artilist; that arm records rather than guessing.
export function confers_luck(obj) {
    /* might as well check for this too */
    if (obj.otyp === ONAMES.LUCKSTONE)
        return true;

    if (!obj.oartifact)
        return false;

    return artifact_confers_luck(obj);
}

// src/attrib.c:423 stone_luck() and :441 set_moreluck().
export function stone_luck(include_uncursed) {
    let bonus = 0;
    for (const obj of game.invent || []) {
        if (!confers_luck(obj))
            continue;
        if (obj.cursed)
            bonus -= obj.quan || 1;
        else if (obj.blessed || include_uncursed)
            bonus += obj.quan || 1;
    }
    return Math.sign(bonus);
}

export function set_moreluck() {
    const bonus = stone_luck(true);
    if (!bonus && !carrying(ONAMES.LUCKSTONE))
        game.u.moreluck = 0;
    else
        game.u.moreluck = bonus >= 0 ? 3 : -3;
}

export function freeinv_core(obj) {
    if (obj.oclass === OCLASSES.COIN_CLASS) {
        /* src/invent.c freeinv_core() — this arm is exactly two statements in
           5.0. The 'money2mon' gap recorded here before did not correspond to
           anything in this function; money2mon appears nowhere in invent.c. */
        (game.disp ||= {}).botl = true;
        return;
    }
    else if (obj.otyp === ONAMES.AMULET_OF_YENDOR) {
        /* C: impossible("don't have amulet?") when the flag is unset */
        (game.u.uhave ||= {}).amulet = 0;
    } else if (obj.otyp === ONAMES.CANDELABRUM_OF_INVOCATION) {
        (game.u.uhave ||= {}).menorah = 0;
    } else if (obj.otyp === ONAMES.BELL_OF_OPENING) {
        (game.u.uhave ||= {}).bell = 0;
    } else if (obj.otyp === ONAMES.SPE_BOOK_OF_THE_DEAD) {
        (game.u.uhave ||= {}).book = 0;
    } else if (obj.oartifact) {
        if (obj.oartifact === game.urole?.questarti)
            (game.u.uhave ||= {}).questart = 0;
        set_artifact_intrinsic(obj, false, W_ART);
        recalc_telepat_range();
        see_monsters();
    }

    if (obj.otyp === ONAMES.LOADSTONE)
        curse(obj);
    else if (confers_luck(obj)) {
        set_moreluck();
        (game.disp ||= {}).botl = true;
    } else if (obj.otyp === ONAMES.FIGURINE && obj.timed)
        stop_timer(FIG_TRANSFORM, obj);

    if (obj === game.context?.tin?.tin) {
        game.context.tin.tin = null;
        game.context.tin.o_id = 0;
    }
}

// src/invent.c freeinv() — remove an object from the hero's inventory.
//
// extract_nobj unlinks it from the invent chain; C keeps a flat array here,
// so a splice by identity is the same operation. pickup_prev is cleared so a
// later pickup does not think it was already handled.
export function freeinv(obj) {
    const inv = (game.invent ||= []);
    const i = inv.indexOf(obj);
    if (i >= 0)
        inv.splice(i, 1);           /* extract_nobj(obj, &gi.invent) */
    obj.where = OBJ_FREE;
    obj.pickup_prev = 0;
    freeinv_core(obj);
    update_inventory();
}

// src/invent.c:1187 carry_obj_effects()
export function carry_obj_effects(obj) {
    if (obj.otyp === ONAMES.FIGURINE) {
        if (obj.cursed && obj.corpsenm !== NON_PM
            && !dead_species(obj.corpsenm, true))
            attach_fig_transform_timeout(obj);
    }
}

// src/invent.c:1208 hold_another_object() — add an item to the inventory
// unless we're fumbling or it refuses to be held (via touch_artifact), and
// give a message.  If there aren't any free inventory slots, drop it
// instead.  If both success and failure messages are NULL, then we're just
// doing the fumbling/slot-limit checking for a silent grab.
export async function hold_another_object(obj, drop_fmt, drop_arg, hold_msg) {
    let drop_it = false;

    if (!Blind())
        observe_object(obj); /* maximize mergeability */
    if (obj.oartifact) {
        /* place_object may change these */
        const crysknife = (obj.otyp === ONAMES.CRYSKNIFE);
        const oerode = obj.oerodeproof;
        /* wasUpolyd: hero polymorph is not modeled; touch_artifact
           (js/mon.js) records itself and allows every touch, so the
           lose-your-grip arm cannot trigger yet */

        /* in case touching this object turns out to be fatal */
        place_object(obj, game.u.ux, game.u.uy);

        if (!await touch_artifact(obj, game.youmonst)) {
            obj_extract_self(obj); /* remove it from the floor */
            await dropy(obj);      /* now put it back again :-) */
            return obj;
        }
        obj_extract_self(obj);
        if (crysknife) {
            obj.otyp = ONAMES.CRYSKNIFE;
            obj.oerodeproof = oerode;
        }
    }
    if (Fumbling()) {
        obj.nomerge = 1;
        /* addinv_core0(obj, NULL, FALSE) — perminv update suppressed */
        obj = await addinv(obj);
        drop_it = true;
    } else if (obj.otyp === ONAMES.CORPSE
               && !u_safe_from_fatal_corpse(obj, st_all)
               && obj.wishedfor) {
        obj.wishedfor = 0;
        obj = await addinv(obj);
        drop_it = true;
    } else {
        const oquan = obj.quan;
        const old_encumbr = near_capacity(); /* before addinv() */
        let prev_encumbr = old_encumbr;

        /* encumbrance limit is max( current_state, pickup_burden );
           this used to use hardcoded MOD_ENCUMBER (stressed) instead
           of the 'pickup_burden' option (which defaults to stressed) */
        if (prev_encumbr < (game.flags?.pickup_burden ?? MOD_ENCUMBER))
            prev_encumbr = (game.flags?.pickup_burden ?? MOD_ENCUMBER);

        obj = await addinv(obj); /* addinv_core0(obj, NULL, FALSE) */
        if (inv_cnt(false) > invlet_basic
            || ((obj.otyp !== ONAMES.LOADSTONE || !obj.cursed)
                && near_capacity() > prev_encumbr)) {
            /* undo any merge which took place */
            if (obj.quan > oquan)
                obj = splitobj(obj, oquan);
            drop_it = true;
        } else {
            if (near_capacity() !== old_encumbr
                && !game.disp?.botl && !game.disp?.botlx) {
                /* prinv() flushes dirty status, including newly added gold.
                   Otherwise the old condition lasts until encumber_msg(). */
                game._encumber_status_stale = true;
                game._deferred_status_capacity = old_encumbr;
            }
            if (game.flags?.autoquiver && !game.uquiver && !obj.owornmask
                && (is_missile(obj) || ammo_and_launcher(obj, game.uwep)
                    || ammo_and_launcher(obj, game.uswapwep)))
                setuqwep(obj);
            if (hold_msg || drop_fmt)
                await prinv(hold_msg, obj, oquan);
            /* obj made it into inventory and is staying there */
            update_inventory();
            await encumber_msg();
        }
    }
    if (!drop_it)
        return obj;

    /* drop_it: */
    if (drop_fmt)
        await pline(drop_fmt.replace('%s', drop_arg));
    obj.nomerge = 0;
    if (can_reach_floor(true) || game.u.uswallow) {
        await dropx(obj);
    } else {
        freeinv(obj);
        const { hitfloor } = await import('./do.js');
        await hitfloor(obj, false);
    }
    return null; /* might be gone */
}

// src/shk.c:1187 obfree(). This is synchronous in C and must remain so here:
// many useup() callers inspect the consumed object before the current command
// returns. Objects on a shop bill are retained there; every other object is
// marked deleted after its timers, light source, and transient references are
// cleared.
export function obfree(obj, merge = null) {
    if (obj.otyp === ONAMES.LEASH && obj.leashmon) {
        const mon = (game.level?.monsters || [])
            .find(candidate => candidate.m_id === obj.leashmon);
        if (mon)
            mon.mleashed = 0;
        obj.leashmon = 0;
        update_inventory();
    }

    if (obj.oclass === OCLASSES.FOOD_CLASS) {
        if (obj === game.context?.victual?.piece)
            game.context.victual = {};
        if (obj.timed)
            obj_stop_timers(obj);
    }
    if (obj.oclass === OCLASSES.SPBOOK_CLASS
        && obj === game.context?.spbook?.book) {
        game.context.spbook.book = null;
        game.context.spbook.o_id = 0;
    }

    while (obj.cobj?.length) {
        const contained = obj.cobj[0];
        obj_extract_self(contained);
        obfree(contained);
    }
    if (Is_container(obj) && obj === game.xlock?.box) {
        const xl = game.xlock;
        xl.usedtime = xl.chance = xl.picktyp = 0;
        xl.magic_key = false;
        xl.door = null;
        xl.box = null;
    }
    if (obj.otyp === ONAMES.BOULDER)
        obj.next_boulder = null;

    if (obfree_bill(obj, merge))
        return;

    if (obj.owornmask)
        setnotworn(obj);
    if (obj.timed)
        obj_stop_timers(obj);
    if (obj.lamplit) {
        const sources = (game.light_sources ||= []);
        const index = sources.findIndex(source => source.type === 1
                                      && source.id === obj.o_id);
        if (index >= 0)
            sources.splice(index, 1);
        obj.lamplit = 0;
    }
    if (obj === game.thrownobj)
        game.thrownobj = null;
    if (obj === game.kickedobj)
        game.kickedobj = null;
    if (obj === game.context?.tin?.tin) {
        game.context.tin.tin = null;
        game.context.tin.o_id = 0;
    }
    const split = game.context?.objsplit;
    if (split && (obj.o_id === split.parent_oid
                  || obj.o_id === split.child_oid)) {
        split.parent_oid = split.child_oid = 0;
    }
    obj.where = OBJ_DELETED;
}

// src/invent.c useupall(): the whole stack goes. A worn item stops being
// worn before it leaves inventory, then obfree() owns the remaining cleanup.
export function useupall(obj) {
    setnotworn(obj);
    freeinv(obj);
    obfree(obj);
}

// src/invent.c useup() — consume ONE of a stack, or all of it.
//
// C's comment notes this works correctly for containers because containers
// do not merge, so quan is always 1 for them and they take the useupall arm.
//
// in_use is cleared on the surviving stack: done_eating sets it before
// calling here, and leaving it set would make the remainder look mid-use.
export function useup(obj) {
    if (obj.quan > 1) {
        obj.in_use = false;         /* no longer in use */
        obj.quan--;
        obj.owt = weight(obj);
        update_inventory();
    } else {
        useupall(obj);
    }
}

/* src/invent.c:1710 any_obj_ok() — 'd' drop accepts anything in inventory. */
export function any_obj_ok(obj) {
    if (obj)
        return GETOBJ_SUGGEST;
    return GETOBJ_EXCLUDE;
}

// src/invent.c update_inventory() — refresh the persistent inventory window.
//
// Two early returns first: nothing happens before the move loop starts, and
// nothing happens while map output is suppressed. Both matter here, because
// freeinv and useup call this during level generation and restore, when the
// window does not exist yet.
//
// The body brackets the windowport call with iflags.suppress_price forced to
// 0, because a perm_invent refresh can fire from inside code that is
// deliberately hiding shop prices while formatting a message, and the window
// should still show normal names. That is recorded along with the windowport
// call itself -- the tty port only does real work when perm_invent is on, and
// no recorded session turns it on.
export function update_inventory() {
    if (!game.program_state?.in_moveloop)
        return;
    if (note_unported_invent('update_inventory:suppress_map_output'))
        return;

    note_unported_invent('update_inventory:win_update_inventory');
}


// src/invent.c:4550 doprwep() — the ')' command. No draws.
export async function doprwep() {
    if (!game.u.uwep) {
        await You(`are ${empty_handed()}.`);
    } else if (!game.iflags?.menu_requested) {
        await prinv(null, game.u.uwep, 0);
        if (game.u.twoweap)
            await prinv(null, game.u.uswapwep, 0);
    } else {
        return await dispinv_with_action(
            [game.u.uwep, game.u.uswapwep, game.u.uquiver].filter(Boolean),
            true);
    }
    return ECMD_OK;
}


/* src/invent.c:62 inuse_headers[]. The in-use sort uses these categories
   instead of object classes, and displays the highest-rated category first. */
const inuse_headers = [
    '', 'Miscellaneous', 'Worn Armor',
    'Wielded/Readied Weapons', 'Accessories',
];

/* src/invent.c:3060 display_pickinv(), SORTLOOT_INUSE arm. This is also the
   path that inserts bare or gloved hands into a full in-use listing when the
   hero has armor or another active item but no primary weapon. */
async function display_inuse_inventory(objs, altLabel) {
    const { MENU_ITEMFLAGS_NONE, PICK_ONE } = await import('./const.js');
    const { NO_COLOR } = await import('./terminal.js');
    const allowed = objs ? new Set(objs) : null;
    const entries = (game.invent || [])
        .filter(is_inuse)
        .filter(obj => !allowed || allowed.has(obj))
        .map((obj, index) => {
            const entry = { obj, index };
            inuse_classify(entry, obj);
            return entry;
        });

    if (!game.u.uwep && !allowed) {
        entries.push({
            obj: null,
            index: -1,
            inuse: 12,
            orderclass: 3,
        });
    }
    entries.sort((a, b) => b.inuse - a.inuse || a.index - b.index);

    const win = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(win, MENU_BEHAVE_STANDARD);
    add_menu_heading(win, 'Inventory in use');
    let previousClass = 0;
    for (const entry of entries) {
        if (entry.orderclass !== previousClass) {
            const heading = entry.orderclass === 4 && altLabel
                ? altLabel : inuse_headers[entry.orderclass];
            add_menu_heading(win, heading);
            previousClass = entry.orderclass;
        }

        if (!entry.obj) {
            const hands = makeplural(body_part(HAND));
            tty_add_menu(win, null, '-'.charCodeAt(0), '-', 0,
                         ATR_NONE, NO_COLOR,
                         `${game.u.uarmg ? 'gloved' : 'bare'} ${hands} (no weapon)`,
                         MENU_ITEMFLAGS_NONE);
            continue;
        }
        if (!Blind())
            observe_object(entry.obj);
        const glyphinfo = temporary_object_glyph(entry.obj);
        tty_add_menu(win, glyphinfo, entry.obj.invlet.charCodeAt(0),
                     entry.obj.invlet, 0, ATR_NONE, NO_COLOR,
                     doname(entry.obj), MENU_ITEMFLAGS_NONE);
    }
    tty_end_menu(win, null);
    const picks = await tty_select_menu(win, PICK_ONE);
    tty_destroy_nhwindow(win);

    if (picks.length) {
        const invlet = String.fromCharCode(picks[0]);
        const obj = (game.invent || []).find(o => o.invlet === invlet);
        if (obj) {
            const { itemactions } = await import('./cmd.js');
            await itemactions(obj);
        }
    }
}

// src/invent.c:2963 dispinv_with_action().
async function dispinv_with_action(objs, useInuseOrdering = false,
                                   altLabel = null) {
    const len = objs?.length ?? 0;
    const menumode = len !== 1 || !!game.iflags?.menu_requested;
    if (!menumode) {
        const o = objs[0];
        await pline(`${o.invlet} - ${doname(o)}.`);
    } else if (useInuseOrdering) {
        await display_inuse_inventory(objs, altLabel);
    } else {
        note_unported_invent('dispinv_with_action:menu');
    }
    return ECMD_OK;
}

// src/invent.c:4601 doprarm() — the '[' command.
export async function doprarm() {
    const lets = [W_ARM, W_ARMC, W_ARMH, W_ARMS, W_ARMG, W_ARMF, W_ARMU]
        .map(m => worn(m)).filter(Boolean);

    if (!lets.length) {
        await noarmor(true);
    } else {
        return await dispinv_with_action(lets, true);
    }
    return ECMD_OK;
}

// src/invent.c:4642 doprring() — the '=' command.
export async function doprring() {
    if (!worn(W_RINGL) && !worn(W_RINGR))
        await You('are not wearing any rings.');
    else {
        const rings = [worn(W_RINGR), worn(W_RINGL)].filter(Boolean);
        const useInuseOrdering = rings.length > 1
            || !!game.iflags?.menu_requested
            || rings.some(obj => obj.oclass !== OCLASSES.RING_CLASS);
        return await dispinv_with_action(rings, useInuseOrdering,
                                         rings.length === 1 ? 'Ring' : 'Rings');
    }
    return ECMD_OK;
}

// src/invent.c:4679 dopramulet() — the '"' command.
export async function dopramulet() {
    if (!worn(W_AMUL))
        await You('are not wearing an amulet.');
    else
        return await dispinv_with_action([worn(W_AMUL)], true, 'Amulet');
    return ECMD_OK;
}

// src/invent.c:4696 tool_being_used(), the wider predicate behind '('.
function tool_being_used(obj) {
    if (obj.owornmask & (W_TOOL | W_SADDLE))
        return true;
    if (obj.oclass !== OCLASSES.TOOL_CLASS)
        return false;
    return obj === game.u.uwep || !!obj.lamplit
        || (obj.otyp === ONAMES.LEASH && !!obj.leashmon);
}

// src/invent.c:4715 doprtool() — the '(' command.
export async function doprtool() {
    const tools = (game.invent || []).filter(tool_being_used);
    if (!tools.length)
        await You('are not using any tools.');
    else
        return await dispinv_with_action(tools, true);
    return ECMD_OK;
}

// src/invent.c:4740 doprinuse() — the '*' command: everything in use.
export async function doprinuse() {
    if (!(game.invent || []).some(is_inuse))
        await You('are not wearing or wielding anything.');
    else
        return await dispinv_with_action(null, true);
    return ECMD_OK;
}


// src/invent.c:1546 currency() — "zorkmid"/"zorkmids"; the hallucinatory
// currency roll is recorded because it DRAWS.
export function currency(amount) {
    if (game.u.uprops?.HALLUC)
        note_unported_invent('currency:hallucinatory');
    return amount !== 1 ? 'zorkmids' : 'zorkmid';
}

// src/invent.c doprgold() — the '$' command. No draws.
export async function doprgold() {
    const umoney = money_cnt(game.invent || []);
    /* hidden_gold(FALSE) — gold inside carried containers; containers are
       not carried on this tree, so it is zero */
    if (game.flags?.verbose !== false) {
        const buf = !umoney ? 'Your wallet is empty'
                            : `Your wallet contains ${umoney} ${currency(umoney)}`;
        await pline(`${buf}.`);
    } else {
        note_unported_invent('doprgold:terse');
    }
    return ECMD_OK;
}


// src/invent.c:2698 count_unidentified()
export function count_unidentified(objchn) {
    let unid_cnt = 0;
    for (const obj of objchn || [])
        if (not_fully_identified(obj))
            ++unid_cnt;
    return unid_cnt;
}

// src/invent.c:2135 ckvalidcat()
function ckvalidcat(otmp) {
    return Number(allow_category(otmp));
}

// src/invent.c:2142 ckunpaid()
function ckunpaid(otmp) {
    return Number(!!(otmp.unpaid || (Has_contents(otmp) && count_unpaid(otmp.cobj))));
}

// src/invent.c:2148 wearing_armor()
export function wearing_armor() {
    const u = game.u;
    return !!(u.uarm || u.uarmc || u.uarmf || u.uarmg
              || u.uarmh || u.uarms || u.uarmu);
}

// src/invent.c:2156 is_worn()
export function is_worn(otmp) {
    return !!(otmp.owornmask & (W_ARMOR | W_ACCESSORY | W_SADDLE | W_WEAPONS));
}

// src/invent.c:2167 is_inuse()
function is_inuse(obj) {
    return carried(obj) && (is_worn(obj) || tool_being_used(obj));
}

// src/invent.c:2182 safeq_xprname()
function safeq_xprname(obj) {
    const ctx = game.safeq_xprn_ctx;
    return xprname(obj, null, ctx.let, ctx.dot, 0, 0);
}

// src/invent.c:2190 safeq_shortxprname()
function safeq_shortxprname(obj) {
    const ctx = game.safeq_xprn_ctx;
    return xprname(obj, ansimpleoname(obj), ctx.let, ctx.dot, 0, 0);
}

const removeables = [OCLASSES.ARMOR_CLASS, OCLASSES.WEAPON_CLASS,
                     OCLASSES.RING_CLASS, OCLASSES.AMULET_CLASS,
                     OCLASSES.TOOL_CLASS];

// src/invent.c:2202 ggetobj()
export async function ggetobj(word, fn, mx, combo, resultflags) {
    let ckfn = null, ofilter = null;
    if (!game.invent?.length) {
        await You(`have nothing to ${word}.`);
        if (resultflags) resultflags.v = ALL_FINISHED;
        return 0;
    }
    if (resultflags) resultflags.v = 0;
    let takeoff = false, ident = false, allflag = false, m_seen = false;
    add_valid_menu_class(0);
    if (taking_off(word)) {
        takeoff = true;
        ofilter = is_worn;
    } else if (word === 'identify') {
        ident = true;
        ofilter = not_fully_identified;
    }
    const ilets = [], itemcount = { v: 0 };
    let iletct = collect_obj_classes(ilets, game.invent, false, ofilter, itemcount);
    const unpaid = count_unpaid(game.invent);
    if (ident && !iletct) {
        return -1;
    } else if (game.invent.length) {
        ilets[iletct++] = ' ';
        if (unpaid) ilets[iletct++] = 'u';
        if (count_buc(game.invent, BUC_BLESSED, ofilter)) ilets[iletct++] = 'B';
        if (count_buc(game.invent, BUC_UNCURSED, ofilter)) ilets[iletct++] = 'U';
        if (count_buc(game.invent, BUC_CURSED, ofilter)) ilets[iletct++] = 'C';
        if (count_buc(game.invent, BUC_UNKNOWN, ofilter)) ilets[iletct++] = 'X';
        if (count_justpicked(game.invent)) ilets[iletct++] = 'P';
        ilets[iletct++] = 'a';
    }
    ilets[iletct++] = 'i';
    if (!combo) ilets[iletct++] = 'm';

    const { getlin } = await import('./cmd.js');
    let buf;
    for (;;) {
        buf = await getlin(`What kinds of thing do you want to ${word}? [${ilets.join('')}]`);
        if (buf[0] === '\x1b') return 0;
        if (buf.includes('i')) {
            let ailets = '';
            if (ofilter)
                for (const otmp of [...game.invent])
                    if (ofilter(otmp) && !ailets.includes(otmp.invlet))
                        ailets += otmp.invlet;
            if (await display_pickinv(ailets || null, null, null, false) === '\x1b')
                return 0;
        } else {
            break;
        }
    }
    const extra_removeables = [];
    if (takeoff) {
        if (game.u.uwep) extra_removeables.push(game.u.uwep.oclass);
        if (game.u.uswapwep) extra_removeables.push(game.u.uswapwep.oclass);
        if (game.u.uquiver) extra_removeables.push(game.u.uquiver.oclass);
    }
    const olets = [];
    for (const sym of buf) {
        if (sym === ' ') continue;
        const oc_of_sym = def_char_to_objclass(sym);
        if (takeoff && oc_of_sym !== OCLASSES.MAXOCLASSES) {
            if (extra_removeables.includes(oc_of_sym)) {
                // Skip the rest of the takeoff checks.
            } else if (!removeables.includes(oc_of_sym)) {
                await pline('Not applicable.');
                return 0;
            } else if (oc_of_sym === OCLASSES.ARMOR_CLASS && !wearing_armor()) {
                await noarmor(false);
                return 0;
            } else if (oc_of_sym === OCLASSES.WEAPON_CLASS && !game.u.uwep
                       && !game.u.uswapwep && !game.u.uquiver) {
                await You('are not wielding anything.');
                return 0;
            } else if (oc_of_sym === OCLASSES.RING_CLASS && !game.u.uright && !game.u.uleft) {
                await You('are not wearing rings.');
                return 0;
            } else if (oc_of_sym === OCLASSES.AMULET_CLASS && !game.u.uamul) {
                await You('are not wearing an amulet.');
                return 0;
            } else if (oc_of_sym === OCLASSES.TOOL_CLASS && !game.u.ublindf) {
                await You('are not wearing a blindfold.');
                return 0;
            }
        }
        if (sym === 'a') {
            allflag = true;
        } else if (sym === 'A') {
            // Same as the default.
        } else if (sym === 'u') {
            add_valid_menu_class('u');
            ckfn = ckunpaid;
        } else if ('BUCXP'.includes(sym)) {
            add_valid_menu_class(sym);
            ckfn = ckvalidcat;
        } else if (sym === 'm') {
            m_seen = true;
        } else if (oc_of_sym === OCLASSES.MAXOCLASSES) {
            await You(`don't have any ${sym}'s.`);
        } else if (!olets.includes(oc_of_sym)) {
            add_valid_menu_class(oc_of_sym);
            olets.push(oc_of_sym);
        }
    }
    if (m_seen) {
        return allflag || (!olets.length && ckfn !== ckunpaid && ckfn !== ckvalidcat) ? -2 : -3;
    } else if (game.flags.menu_style !== MENU_TRADITIONAL && combo && !allflag) {
        return 0;
    } else {
        const cnt = await askchain(game.invent, olets, allflag, fn, ckfn, mx, word);
        if (combo && allflag && resultflags)
            resultflags.v |= ALL_FINISHED;
        return cnt;
    }
}

// src/invent.c:2377 askchain(); object chains are mutable arrays.
export async function askchain(objchn, olets, allflag, fn, ckfn, mx, word) {
    let cnt = 0, dud = 0;
    const takeoff = taking_off(word), ident = word === 'identify';
    const take_out = word === 'take out', put_in = word === 'put in';
    const nodot = word === 'nodot' || word === 'drop' || ident
        || takeoff || take_out || put_in;
    const ininv = objchn === game.invent;
    const bycat = menu_class_present('u') || menu_class_present('B')
        || menu_class_present('U') || menu_class_present('C')
        || menu_class_present('X') || menu_class_present('P');
    const sortedchn = sortloot(objchn, SORTLOOT_INVLET, false, null);
    let first = true, classIndex = 0;
    ret: {
        do {
            let ilet = 96;
            if (objchn?.[0]?.oclass === OCLASSES.COIN_CLASS) --ilet;
            bypass_objlist(objchn, false);
            let otmp;
            while ((otmp = nxt_unbypassed_loot(sortedchn, objchn)) !== null) {
                if (ilet === 122) ilet = 65;
                else if (ilet === 90) ilet = 35;
                else ++ilet;
                if (olets?.length && otmp.oclass !== olets[classIndex]) continue;
                if (takeoff && !is_worn(otmp)) continue;
                if (ident && !not_fully_identified(otmp)) continue;
                if (ckfn && !ckfn(otmp)) continue;
                if (bycat && !ckvalidcat(otmp)) continue;
                let sym;
                if (!allflag) {
                    game.safeq_xprn_ctx = { let: String.fromCharCode(ilet), dot: !nodot };
                    let qpfx = '';
                    if (first) {
                        if (take_out || put_in)
                            qpfx = word[0].toUpperCase() + word.slice(1) + ': ';
                        first = false;
                    }
                    const qbuf = safe_qbuf(qpfx, '?', otmp,
                        ininv ? safeq_xprname : doname,
                        ininv ? safeq_shortxprname : ansimpleoname, 'item');
                    sym = await tty_yn_function(qbuf,
                        takeoff || ident || otmp.quan < 2 ? 'ynaq' : 'yn#aq', 'n', false);
                } else {
                    sym = 'y';
                }
                const otmpo = otmp;
                if (sym === '#') {
                    if (!game.yn_number) {
                        sym = 'n';
                    } else {
                        sym = 'y';
                        if (game.yn_number < otmp.quan && splittable(otmp))
                            otmp = splitobj(otmp, game.yn_number);
                    }
                }
                switch (sym) {
                case 'a':
                    allflag = 1;
                    // FALLTHROUGH
                case 'y': {
                    const tmp = await fn(otmp);
                    if (tmp <= 0) {
                        if (container_gone(fn)) {
                            otmp = null;
                        } else if (otmp && otmp !== otmpo) {
                            await unsplitobj(otmp);
                        }
                        if (tmp < 0) break ret;
                    }
                    cnt += tmp;
                    if (--mx === 0) break ret;
                    // FALLTHROUGH
                }
                case 'n':
                    if (nodot) ++dud;
                    // FALLTHROUGH
                default:
                    break;
                case 'q':
                    if (ident) cnt = -1;
                    break ret;
                }
            }
        } while (olets?.length && ++classIndex < olets.length);
        if (!takeoff && (dud || cnt))
            await pline('That was all.');
        else if (!dud && !cnt)
            await pline('No applicable objects.');
    }
    unsortloot(sortedchn);
    clear_bypasses();
    return cnt;
}

// src/invent.c:2673 fully_identify_obj() and :2687 identify().
// identify() gives immediate feedback after updating every object-level flag.
export function fully_identify_obj(otmp) {
    makeknown(otmp.otyp);
    if (otmp.oartifact)
        discover_artifact(otmp.oartifact);
    observe_object(otmp);
    otmp.known = otmp.bknown = otmp.rknown = 1;
    set_cknown_lknown(otmp);
    if (otmp.otyp === ONAMES.EGG && (otmp.corpsenm ?? -1) >= 0)
        learn_egg_type(otmp.corpsenm);
}

export async function identify(otmp) {
    fully_identify_obj(otmp);
    await prinv(null, otmp, 0);
    return 1;
}

// src/invent.c:2660 menu_identify()
async function menu_identify(id_limit) {
    let first = 1, tryct = 5;

    while (id_limit) {
        const buf = `What would you like to identify ${first ? 'first' : 'next'}?`;
        const pick_list = await query_objlist(buf, game.invent,
            SIGNAL_NOMENU | SIGNAL_ESCAPE | USE_INVLET | INVORDER_SORT,
            PICK_ANY, not_fully_identified);
        let n = Array.isArray(pick_list) ? pick_list.length : pick_list;

        if (n > 0) {
            if (n > id_limit)
                n = id_limit;
            for (let i = 0; i < n; i++, id_limit--)
                await identify(pick_list[i]);
            if (id_limit) {
                // tty_wait_synch's active-map arm, before opening another menu.
                const { flush_screen } = await import('./display.js');
                await flush_screen(0);
            }
            first = 0;
        } else if (n === -2) {
            break;
        } else if (n === -1) {
            await pline('That was all.');
            break;
        } else if (!--tryct) {
            await pline(thats_enough_tries);
            break;
        } else {
            await pline('Choose an item; use ESC to decline.');
        }
    }
}

// src/invent.c:2711 identify_pack() — identify up to id_limit items.
//
// id_limit 0 means all. The "already identified" line is the one an
// identify scroll hits once the pack is clean; the selection paths
// (ggetobj and menu_identify) are recorded.
export async function identify_pack(id_limit, learning_id) {
    const unid_cnt = count_unidentified(game.invent);

    if (!unid_cnt) {
        await You(`have already identified ${
            !learning_id ? 'all' : 'the rest'} of your possessions.`);
    } else if (!id_limit || id_limit >= unid_cnt) {
        let remaining = unid_cnt;
        for (const obj of game.invent || []) {
            if (not_fully_identified(obj)) {
                await identify(obj);
                if (--remaining < 1)
                    break;
            }
        }
    } else {
        let n = 0;
        if (game.flags.menu_style === MENU_TRADITIONAL)
            do {
                n = await ggetobj('identify', identify, id_limit, false, null);
                if (n < 0) break;
            } while ((id_limit -= n) > 0);
        if (n === 0 || n < -1)
            await menu_identify(id_limit);
    }
    update_inventory();
}

// src/invent.c:1664 splittable() — can this stack be split off from?
import { welded } from './wield.js';



export function splittable(obj) {
    return !((obj.otyp === ONAMES.LOADSTONE && obj.cursed)
             || (obj === game.u.uwep && welded(game.u.uwep)));
}

// src/invent.c:1672 taking_off()
function taking_off(action) {
    return action === 'take off' || action === 'remove';
}

// src/invent.c:4578 noarmor()
async function noarmor(report_uskin) {
    if (!game.u.uskin || !report_uskin) {
        await You('are not wearing any armor.');
    } else {
        const { simpleonames } = await import('./objnam.js');
        let uskinname = simpleonames(game.u.uskin);
        if (uskinname.slice(0, 7).toLowerCase() === 'set of ')
            uskinname = uskinname.slice(7);
        const p = uskinname.toLowerCase().indexOf(' dragon ');
        if (p >= 0)
            uskinname = uskinname.slice(0, p + 1) + uskinname.slice(p + 8);
        await You(`are not wearing armor but have ${uskinname} embedded in your skin.`);
    }
}


// src/invent.c:3467 display_used_invlets(); omit the source slot when splitting.
async function display_used_invlets(avoidlet) {
    if (!game.invent?.length)
        return 0;
    const { tty_get_nhwindow } = await import('./tty/wintty.js');
    const { PICK_ONE, MENU_ITEMFLAGS_NONE } = await import('./const.js');
    const { NO_COLOR } = await import('./terminal.js');
    const win = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(win, MENU_BEHAVE_STANDARD);
    const sortpack = game.flags.sortpack !== false;
    for (const oclass of sortpack ? inv_order() : [0]) {
        let classcount = 0;
        for (const otmp of game.invent) {
            const ilet = otmp.invlet;
            if (ilet === avoidlet)
                continue;
            if (!sortpack || otmp.oclass === oclass) {
                if (sortpack && !classcount++)
                    add_menu_heading(win, let_to_name(oclass));
                const glyphinfo = temporary_object_glyph(otmp);
                tty_add_menu(win, glyphinfo, ilet.charCodeAt(0), ilet, 0,
                             ATR_NONE, NO_COLOR, doname(otmp),
                             MENU_ITEMFLAGS_NONE);
            }
        }
    }
    tty_end_menu(win, 'Inventory letters used:');
    const selected = await tty_select_menu(win, PICK_ONE);
    const cancelled = !!tty_get_nhwindow(win)?.cancelled;
    const ret = selected.length ? String.fromCharCode(selected[0])
              : cancelled ? '\x1b' : 0;
    tty_destroy_nhwindow(win);
    return ret;
}

// src/invent.c:4855 reassign(); floating letters, with gold first in '$'.
export function reassign() {
    const invent = game.invent || [];
    const goldidx = invent.findIndex(obj => obj.oclass === OCLASSES.COIN_CLASS);
    const goldobj = goldidx >= 0 ? invent.splice(goldidx, 1)[0] : null;
    let i = 0;
    for (const obj of invent) {
        obj.invlet = i < 26 ? String.fromCharCode(97 + i)
                   : i < 52 ? String.fromCharCode(65 + i - 26) : '#';
        i++;
    }
    if (goldobj) {
        goldobj.invlet = '$';
        invent.unshift(goldobj);
    }
    game.lastinvnr = Math.min(i, 51);
}

// src/invent.c:4886 check_invent_gold(); gold is adjustable only if misplaced.
export async function check_invent_gold(why) {
    let goldstacks = 0, wrongslot = 0;
    for (const otmp of game.invent || []) {
        if (otmp.oclass === OCLASSES.COIN_CLASS) {
            goldstacks++;
            if (otmp.invlet !== '$')
                wrongslot++;
        }
    }
    if (goldstacks > 1 || wrongslot > 0) {
        await impossible(`${why}: ${wrongslot > 1 ? 'gold in wrong slots'
            : wrongslot > 0 ? 'gold in wrong slot' : ''}${
            wrongslot > 0 && goldstacks > 1 ? ' and ' : ''}${
            goldstacks > 1 ? 'multiple gold stacks' : ''}`);
        return true;
    }
    return false;
}

// src/invent.c:4917 adjust_ok(); getobj callback for item to #adjust.
function adjust_ok(obj) {
    if (!obj || obj.oclass === OCLASSES.COIN_CLASS)
        return GETOBJ_EXCLUDE;
    return GETOBJ_SUGGEST;
}

// src/invent.c:4927 adjust_gold_ok(); allow misplaced gold to be repaired.
function adjust_gold_ok(obj) {
    return obj ? GETOBJ_SUGGEST : GETOBJ_EXCLUDE;
}

// src/invent.c:4981 doorganize().
export async function doorganize() {
    const invent = game.invent || [];
    if (!invent.length || (invent.length === 1
                           && invent[0].oclass === OCLASSES.COIN_CLASS
                           && invent[0].invlet === '$')) {
        await You(`aren't carrying anything ${
            !invent.length ? 'to adjust' : 'adjustable'}.`);
        return ECMD_OK;
    }
    if (game.flags.fixinv === false)
        reassign();
    const adjust_filter = await check_invent_gold('adjust')
                          ? adjust_gold_ok : adjust_ok;
    const obj = await getobj('adjust', adjust_filter,
                             GETOBJ_PROMPT | GETOBJ_ALLOWCNT);
    return await doorganize_core(obj);
}

// src/invent.c:5008 adjust_split() — #altadjust: split part of a stack off
// into its own inventory slot
export async function adjust_split() {
    const { tty_yn_function } = await import('./tty/topl.js');
    let splitamount = 0, let_, dig = '\0';

    /* invlet should be queued so no getobj prompting is expected */
    const obj = await getobj('split', adjust_ok, GETOBJ_NOFLAGS);
    if (!obj || obj.quan < 2 || obj.otyp === ONAMES.GOLD_PIECE)
        return ECMD_FAIL; /* caller has set things up to avoid this */

    if (obj.quan === 2) {
        splitamount = 1;
    } else {
        /* get first digit; doesn't wait for <return> */
        dig = await tty_yn_function('Split off how many?', null, '\0', true);
        if (!/^[0-9]$/.test(dig)) {
            await pline('Never mind.');
            return ECMD_CANCEL;
        }
        /* got first digit, get more until next non-digit (except for
           backspace/delete which will take away most recent digit and
           keep going; we expect one of ' ', '\n', or '\r') */
        const count = { value: 0 };
        let_ = await get_count(null, dig, 0, count,
                               /* yn_function() added the first digit to the
                                  prompt when recording message history; have
                                  get_count() display "Count: N" when waiting
                                  for additional digits (ordinarily that won't be
                                  shown until a second digit is entered) and also
                                  add "Count: N" to message history if more than
                                  one digit gets entered or the original N is
                                  deleted and replaced with different digit */
                               GC_ECHOFIRST | GC_CONDHIST);
        splitamount = count.value;
        /* \033 is in quitchars[] so we need to check for it separately
           in order to treat it as cancel rather than as accept */
        if (!let_ || let_ === '\x1b' || !' \r\n\x1b'.includes(let_)) {
            await pline('Never mind.');
            return ECMD_CANCEL;
        }
    }
    if (splitamount < 1 || splitamount >= obj.quan) {
        const Amount = 'Amount to split from current stack must be';
        if (splitamount < 1)
            await pline(`${Amount} at least 1.`);
        else
            await pline(`${Amount} less than ${obj.quan}.`);
        return ECMD_CANCEL;
    }

    /* normally a split would take place in getobj() if player supplies
       a count there, so doorganize_core() figures out 'splitamount'
       from the object; it will undo the split if player cancels while
       selecting the destination slot */
    const split = splitobj(obj, splitamount);
    return await doorganize_core(split);
}

// src/invent.c:5068 doorganize_core(); array splices represent the nobj chain.
async function doorganize_core(obj) {
    if (!obj)
        return ECMD_CANCEL;
    const isgold = obj.oclass === OCLASSES.COIN_CLASS;
    const invent = game.invent;
    const index = invent.indexOf(obj);
    const splitting = index > 0 && invent[index - 1].invlet === obj.invlet
                      ? invent[index - 1] : null;
    let bumped = null, let_;

    /* initialize with every letter, then blank the ones in use by
       other (non-mergable) stacks */
    const slots = [...`${isgold ? '$' : ' '}abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ `];
    const end = game.flags.fixinv === false && inv_cnt(false) < invlet_basic
                ? inv_cnt(false) + (splitting ? 1 : 2) : slots.length;
    for (const otmp of invent) {
        if (otmp !== obj && !mergable(otmp, obj)) {
            const ch = otmp.invlet;
            if (ch >= 'a' && ch <= 'z')
                slots[1 + ch.charCodeAt(0) - 97] = ' ';
            else if (ch >= 'A' && ch <= 'Z')
                slots[27 + ch.charCodeAt(0) - 65] = ' ';
            else if (ch === '#')
                slots[1 + invlet_basic] = '#';
        }
    }
    let lets = slots.slice(0, end).filter(ch => ch !== ' ').join('');
    if (lets.length > 5)
        lets = compactify(lets);

    const qbuf = `${splitting ? `Split ${obj.quan}` : 'Adjust letter'} to what [${lets}]${
        invent.length ? ' (? see used letters)' : ''}?`;
    let ever_mind = false;
    for (let trycnt = 1; ; ++trycnt) {
        let_ = isgold ? '$' : await tty_yn_function(qbuf, null, '\0', true);
        if (let_ === '?' || let_ === '*') {
            let_ = await display_used_invlets(splitting ? obj.invlet : 0);
            if (!let_)
                continue;
        }
        if (quitchars.includes(let_) || (splitting && let_ === obj.invlet))
            break;
        if (let_ === '$' && !isgold) {
            await pline("Only gold coins may be moved into the '$' slot.");
            ever_mind = true;
            break;
        }
        if (/^[a-zA-Z]$/.test(let_) || (lets.includes(let_) && let_ !== '-'))
            break;
        if (trycnt === 5)
            break;
        await pline('Select an inventory slot letter.');
    }
    /* C's noadjust label restores a pending split for every cancellation. */
    if (ever_mind || quitchars.includes(let_) || (splitting && let_ === obj.invlet)
        || !(/^[a-zA-Z]$/.test(let_) || (lets.includes(let_) && let_ !== '-'))) {
        if (splitting)
            await merged({ o: splitting }, { o: obj });
        if (!ever_mind)
            await pline(Never_mind);
        return ECMD_OK;
    }

    const collect = let_ === obj.invlet;
    let adj_type = collect ? 'Collecting:' : !splitting ? 'Moving:' : 'Splitting:';
    /* Directly unlink: freeinv/addinv would touch artifacts, lamps and luck. */
    extract_nobj(obj, invent);
    for (let i = 0; i < invent.length;) {
        const otmp = invent[i];
        const otmpname = otmp.oname || null;
        let objname = obj.oname || null;
        if (collect) {
            if ((!otmpname || (objname && objname === otmpname))
                && await merged({ o: otmp }, { o: obj })) {
                obj = otmp;
                extract_nobj(obj, invent);
                continue;
            }
        } else if (otmp.invlet === let_) {
            if ((!otmpname || (objname && objname === otmpname))
                && await merged({ o: otmp }, { o: obj })) {
                adj_type = 'Merging:';
                obj = otmp;
                extract_nobj(obj, invent);
                break;
            }
            if (!splitting) {
                adj_type = 'Swapping:';
                otmp.invlet = obj.invlet;
            } else {
                if (objname && !obj.oartifact)
                    obj.oname = null;
                if (!mergable(otmp, obj)) {
                    if (objname)
                        obj.oname = objname;
                } else {
                    objname = null;
                }
                if (await merged({ o: otmp }, { o: obj })) {
                    adj_type = 'Splitting and merging:';
                    obj = otmp;
                    extract_nobj(obj, invent);
                } else if (inv_cnt(false) >= invlet_basic) {
                    await merged({ o: splitting }, { o: obj });
                    await Your('pack is too full.');
                    return ECMD_OK;
                } else {
                    bumped = otmp;
                    extract_nobj(bumped, invent);
                }
            }
            break;
        }
        i++;
    }

    obj.invlet = let_;
    obj.where = OBJ_INVENT;
    invent.unshift(obj);
    reorder_invent();
    if (bumped) {
        assigninvlet(bumped);
        bumped.where = OBJ_INVENT;
        invent.unshift(bumped);
        reorder_invent();
    }
    await prinv(adj_type, obj, 0);
    if (bumped)
        await prinv('Moving:', bumped, 0);
    if (splitting)
        clear_splitobjs();
    update_inventory();
    return ECMD_OK;
}

// src/invent.c:1413 delallobj(); destroy every object at <x,y> except the
// hero's chain; the ball is unpunished first
export function delallobj(x, y) {
    for (const otmp of (game.level?.objects || []).filter(
             (o) => o.ox === x && o.oy === y)) {
        if (otmp === game.u.uball)
            unpunish();
        if (otmp === game.u.uchain)
            continue;
        delobj(otmp);
    }
}

// src/invent.c set_cknown_lknown(); probing a container or statue learns
// its contents and lock state; a tin learns its contents
export function set_cknown_lknown(obj) {
    if (Is_container(obj) || obj.otyp === ONAMES.STATUE)
        obj.cknown = obj.lknown = 1;
    else if (obj.otyp === ONAMES.TIN)
        obj.cknown = 1;
    /* TODO? cknown might be extended to candy bar, where it would mean that
       wrapper's text was known which in turn indicates candy bar's content */
    return;
}

// src/invent.c worn_wield_only(); query_objlist() filter for a monster's
// armament: things that *are* worn or wielded
export function worn_wield_only(obj) {
    return (obj.owornmask !== 0 && obj.owornmask != null);
}

// src/invent.c invdisp_nothing(); a header, a blank line and "(none)"
export async function invdisp_nothing(hdr, txt) {
    const win = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(win, MENU_BEHAVE_STANDARD);
    add_menu_heading(win, hdr);
    tty_add_menu_str(win, '');
    tty_add_menu_str(win, txt);
    tty_end_menu(win, null);
    await tty_display_nhwindow(win);
    await tty_select_menu(win, PICK_NONE);
    tty_destroy_nhwindow(win);
    await docrt();
    return;
}

// src/invent.c cinv_doname(); doname() with "trapped" inserted for a
// container whose trap probing has just revealed
export function cinv_doname(obj) {
    let result = doname(obj);

    /*
     * If obj->tknown ever gets implemented, doname() will handle this.
     * Assumes that probing reveals the trap prior to calling us.  Since
     * we lack that flag, hero forgets about it as soon as we're done....
     */
    if (obj.otrapped && result.length + 'trapped '.length + 1 <= QBUFSZ) {
        /* obj->lknown has been set before calling us so either "locked" or
           "unlocked" should always be present (for a trapped container) */
        const p = result.indexOf(' locked'),
              q = result.indexOf(' unlocked');

        if (p >= 0 && (q < 0 || p < q))
            result = strsubst(result, ' locked ', ' trapped locked ');
        else if (q >= 0)
            result = strsubst(result, ' unlocked ', ' trapped unlocked ');
        /* might need to change "an" to "a"; when no BUC is present,
           "an unlocked" yielded "an trapped unlocked" above */
        result = strsubst(result, 'an trapped ', 'a trapped ');
    }
    return result;
}

// src/invent.c cinv_ansimpleoname(); ansimpleoname() with "trapped"
export function cinv_ansimpleoname(obj) {
    let result = ansimpleoname(obj);

    if (obj.otrapped) {
        if (result.slice(0, 2) !== 'a ')
            result = strsubst(result, 'a ', 'a trapped ');
        else if (result.slice(0, 3) !== 'an ')
            result = strsubst(result, 'an ', 'an trapped ');
        /* unique container? nethack doesn't have any */
        else if (result.slice(0, 4) !== 'the ')
            result = strsubst(result, 'the ', 'the trapped ');
        /* no leading article at all? shouldn't happen with ansimpleoname() */
        else
            result = strsubst(result, '', 'trapped '); /* insert at beginning */
    }
    return result;
}

// src/invent.c display_cinventory(); show the contents of a container
// (probing); returns the selected object, if any
export async function display_cinventory(obj) {
    let ret;
    let n;
    let selected = [];

    const qbuf = safe_qbuf('Contents of ', ':', obj,
                           /* custom formatting routines to insert "trapped"
                              into the object's name when appropriate;
                              last resort "that" won't ever get used */
                           cinv_doname, cinv_ansimpleoname, 'that');

    if (obj.cobj && obj.cobj.length) {
        selected = await query_objlist(qbuf, obj.cobj, INVORDER_SORT,
                                       PICK_NONE, allow_all);
        n = selected.length;
    } else {
        await invdisp_nothing(qbuf, '(empty)');
        n = 0;
    }
    if (n > 0)
        ret = selected[0];
    else
        ret = null;
    obj.cknown = 1;
    return ret;
}

// src/invent.c display_minventory(); show a monster's inventory
export async function display_minventory(mon,    /* monster whose minvent we're showing */
                                         dflags, /* control over what to display */
                                         title)  /* menu title */
{
    let ret;
    let tmp;
    let n;
    let selected = [];
    const do_all = (dflags & MINV_ALL) !== 0,
          incl_hero = (do_all && engulfing_u(mon)),
          have_inv = !!(mon.minvent && mon.minvent.length),
          have_any = (have_inv || incl_hero),
          pickings = (dflags & MINV_PICKMASK);

    tmp = `${s_suffix(noit_Monnam(mon))} ${do_all ? 'possessions' : 'armament'}:`;

    if (do_all ? have_any : (mon.misc_worn_check || MON_WEP(mon))) {
        /* Fool the 'weapon in hand' routine into
         * displaying 'weapon in claw', etc. properly.
         */
        game.youmonst.data = mon.data;
        /* in case inside a shop, don't append "for sale" prices */
        (game.iflags ||= {}).suppress_price = (game.iflags.suppress_price || 0) + 1;

        selected = await query_objlist(title ? title : tmp, mon.minvent || [],
                                       (INVORDER_SORT | (incl_hero ? INCLUDE_HERO : 0)),
                                       pickings,
                                       do_all ? allow_all : worn_wield_only);
        n = selected.length;

        game.iflags.suppress_price--;
        /* was 'set_uasmon();' but that potentially has side-effects */
        game.youmonst.data = game.mons[game.u.umonnum]; /* basic part of set_uasmon() */
    } else {
        await invdisp_nothing(title ? title : tmp, '(none)');
        n = 0;
    }

    if (n > 0)
        ret = selected[0];
    else
        ret = null;
    return ret;
}

// src/invent.c:1602 obj_here()
export function obj_here(obj, x, y) {
    for (const otmp of game.level?.objects || [])
        if (otmp.ox === x && otmp.oy === y && obj === otmp)
            return true;
    return false;
}

// src/invent.c g_at(); the gold on the floor at <x,y>, if any
export function g_at(x, y) {
    for (const obj of game.level.objects) {
        if (obj.where !== OBJ_FLOOR || obj.ox !== x || obj.oy !== y)
            continue;
        if (obj.oclass === OCLASSES.COIN_CLASS)
            return obj;
    }
    return null;
}

// src/invent.c:1479 nxtobj(); the next object of the given type after obj in
// its chain (the floor pile when by_nexthere, otherwise the object's own
// list: inventory, a container's contents or a monster's inventory)
export function nxtobj(obj, type, by_nexthere) {
    let chain;

    if (by_nexthere)
        chain = (game.level?.objects || []).filter((o) => o.ox === obj.ox && o.oy === obj.oy
                                                      && (o.where === undefined || o.where === OBJ_FLOOR));
    else if (obj.where === OBJ_CONTAINED && obj.ocontainer)
        chain = obj.ocontainer.cobj || [];
    else if (obj.where === OBJ_MINVENT && obj.ocarry)
        chain = obj.ocarry.minvent || [];
    else if (obj.where === OBJ_FLOOR)
        chain = (game.level?.objects || []);
    else
        chain = game.invent || [];

    let i = chain.indexOf(obj);
    if (i < 0)
        return null;
    for (i = i + 1; i < chain.length; i++) /* start with the object after this one */
        if (chain[i].otyp === type)
            return chain[i];
    return null;
}
