import { set_cursor } from './read.js';
import { body_part } from './polyself.js';
// pickup.c — container_at, reset_justpicked, doloot, the trap.c leaves
// (unconscious, uteetering_at_seen_pit, uescaped_shaft) that other modules
// plus its pickup.c-local helpers (autopick, autopick_testobj, pickup_object,
// lift_object, carry_count, pick_obj, pickup_prinv, query_objlist's
// fast-path).  See the landmark comment near the bottom of this file for the
// exact boundary of what is and isn't covered.
// C ref: pickup.c container_at() and reset_justpicked() (lines 2017-2032, 615-632),
//        doloot()/doloot_core()/do_loot_cont() (lines 2158-2340),
//        pickup() (671-911) and its helpers (see landmark comment below),
//        trap.c unconscious() (6756), uteetering_at_seen_pit() (6628),
//        uescaped_shaft() (6640).
// NOTE: js/cmd.js ALSO carries three separate fragments that reimplement
// slices of pickup()'s behaviour inline (_spoteffects_pickup, etc. — see the
// landmark comment below).  The `pickup` export added here is NOT wired into
// that call graph (nothing imports `pickup` from this file as of this
// exercise pickup.c's real body directly.  Unifying the two remains the
// @ts-nocheck — js sibling imports.
import { game } from './gstate.js';
import { regcomp } from './posixregex.js';
import { impossible } from './pline.js';
import { displayLookWindow } from './look-window.js';
import { fix_ghostly_obj } from './bones.js';
import { _topl_stash_result, newsym, newsym_force, flush_screen, obj_to_glyph, mon_to_glyph, map_glyphinfo, menu_item_marker, force_more, topl_park_cursor, topl_force_break_now, capture_flushed_cells, putmsghistory, _topline_more_pending, _more_never_dismissed, flush_pending_messages } from './display.js';
import { pline, Norep, You_see, You, Your, You_cant } from './pline.js';
import { pline_with_more, build_window_screen, tty_window_offx, menu_search_case } from './com_pager.js';
import { money_cnt } from './hack.js';
import { menu_heading_text } from './tty_menu.js';
import { menucolor_text } from './coloratt.js';
import { autokey, pick_lock, u_have_forceable_weapon } from './lock.js';
import { getdir } from './cmd.js';
import { boxlock } from './lock.js';
import { nomul } from './hack.js';
import { nhgetch } from './input.js';
import { touch_artifact_youmonst, touch_artifact_youmonst as touch_artifact, _pickup_burden_level } from './wizcmds.js';
import { unbless } from './mkobj.js';
import { poly_when_stoned } from './mondata.js';
import { polymon } from './polyself.js';
import { exercise } from './attrib.js';
import { PM_STONE_GOLEM } from './pm.generated.js';
import { corpse_xname, killer_xname, CXN_SINGULAR, CXN_ARTICLE } from './objnam.js';
import { Blind } from './vision.js';
import { get_obj_location } from './zap.js';
import { ARMOR_DATA } from './armor_data.js';
import { MKOBJ_OC_SKILL, MKOBJ_OC_MATERIAL } from './mkobj_erosion_meta.js';
import { MKOBJ_OC_CLASS } from './mkobj_data.js';
import { splitobj } from './makemon.js';
import { which_armor } from './worn.js';
import { rnd, rn2 } from './rnd.js';
import { losehp } from './hack.js';
import { yn_function } from './cmd.js';
import { read_engr_at } from './engrave.js';
import {
    ECMD_OK, ECMD_TIME, is_pit, is_hole, u_at, TT_PIT, isok, AUTOUNLOCK_FORCE, AUTOUNLOCK_UNTRAP, AUTOUNLOCK_APPLY_KEY, CQ_CANNED,
    OBJ_CONTAINED, OBJ_FREE, OBJ_FLOOR, OBJ_INVENT, OBJ_MINVENT, engulfing_u,
    LOST_NONE, LOST_THROWN, LOST_DROPPED, LOST_STOLEN, LOST_EXPLODING,
    STONE, MENU_TRADITIONAL, MENU_FULL,
    AUTOSELECT_SINGLE, INVORDER_SORT, FEEL_COCKATRICE, BY_NEXTHERE,
    PICK_ANY, PICK_ONE, PICK_NONE, USE_INVLET, SIGNAL_ESCAPE, SIGNAL_NOMENU,
    INCLUDE_HERO, INCLUDE_VENOM, NO_MM_FLAGS,
    W_SADDLE, ARTICLE_THE, SUPPRESS_SADDLE,
    ICE, MOAT, DRAWBRIDGE_UP, DRAWBRIDGE_DOWN, LAVAPOOL, DB_UNDER, DB_ICE, DB_LAVA, DB_MOAT,
    IS_POOL, IS_LAVA, IS_FURNITURE, PLNMSG_BACK_ON_GROUND, FUMBLING, TIMEOUT,
    LOOKHERE_NOFLAGS, LOOKHERE_PICKED_SOME, LOOKHERE_SKIP_DFEATURE,
    SLT_ENCUMBER, MOD_ENCUMBER, HVY_ENCUMBER, EXT_ENCUMBER,
    DUST, ENGRAVE, HEADSTONE, BURN, MARK, ENGR_BLOOD,
    IS_AIR, IS_ALTAR, IS_GRAVE, IS_FOUNTAIN, IS_WALL, IS_DOOR, IS_ROOM,
    SDOOR, CLOUD, Is_waterlevel, Is_earthlevel,
    In_sokoban, HAND, P_RIDING, P_BASIC,
    SHOPBASE, ESHK, STONE_RES, KILLED_BY_AN, PARANOID_AUTOALL, A_WIS,
    IS_THRONE, T_LOOTED,
} from './const.js';
/* C ref: pickup.c:2293 the `lootmon` branch — mon_beside() needs m_at(). */
import { m_at, mon_nam } from './uhitm.js';
/* C ref: dungeon.c:1770 surface()'s `hliquid("water"/"lava")` calls — real
 * body, no import cycle (js/mhitm.js does not import this file). */
import { hliquid, x_monnam } from './do_name.js';
/* pickup()'s own guard cascade (pickup.c:690-735) — real, already-ported
 * bodies from their owning files, imported read-only. */
import { is_pool } from './dbridge.js';
import { will_feel_cockatrice, look_here } from './invent.js';
import { t_at } from './trap.js';
import { extract_from_minvent } from './worn.js';
import { can_reach_floor } from './engrave.js';
import { addinv_core0, hold_another_object } from './invent.js';
import { freehand, cant_reach_floor, is_ice } from './engrave.js';
import { rider_cant_reach } from './steed.js';
import { P_SKILL } from './skills.js';
import { costly_spot, addtobill, shop_keeper, inhishop, remote_burglary, shk_your } from './shk.js';
import { safe_qbuf as safe_qbuf_shk } from './objnam.js';
import { in_rooms } from './hack.js';
import { is_rider_pm, GOLD_PIECE, OC_USES_KNOWN } from './mklev.js';
import { revive_corpse } from './do.js';
import { remove_object, obj_extract_self, set_bknown } from './mkobj.js';
import { engr_at } from './engrave.js';
import { On_stairs } from './stairs.js';
import { upstart } from './hacklib.js';
import { weight } from './weight.js';
import { max_capacity, calc_capacity, near_capacity } from './hack.js';
import { ansimpleoname, thesimpleoname, simpleonames, an, doname, doname_with_price, makesingular, getObjDescr, xname, the, The, otense } from './objnam.js';
import { observe_object, discover_object } from './o_init.js';
/* C ref: describe_decor()'s own callees (invent.c dfeature_at, dungeon.c
 * waterbody_name, trap.c back_on_ground) are all real, tested bodies that
 * already live in js/cmd.js (exported) — js/cmd.js already imports several
 * pickup.c functions FROM this file (doloot, unconscious, container_at, …),
 * so this is a genuine two-way module cycle.  Verified safe: these are
 * hoisted `function` exports referenced only from inside other functions
 * (never at module-evaluation time), and a standalone import test confirmed
 * both directions resolve with no TDZ error.  cmd.js imports describe_decor
 * from this file, so its callers share the HFumbling and ICE/Norep arms. */
import { pooleffects_back_on_ground as _cmd_back_on_ground, _digests, bhp_Maybe_Half_Phys, cmdq_add_ec } from './cmd.js';
import { dfeature_at as _cmd_dfeature_at, count_unpaid, loot_xname } from './invent.js';
import { ceiling } from './dungeon.js';
import { waterbody_name as _cmd_waterbody_name, self_lookat } from './pager.js';
import { getlin } from './windows.js';
import { def_oc_syms_chars, def_char_to_objclass } from './drawing.js';
import { symset_cell } from './symbols.js';
import { uescaped_shaft, unconscious, uteetering_at_seen_pit } from './trap.js'; // relocate-fns
import { CORPSE } from './makemon.js'; // relocate-fns
import { start_corpse_timeout, start_glob_timeout } from './mkobj.js'; // relocate-fns
import { get_mtraits } from './mkobj.js'; // relocate-fns
import { PM_ICE_TROLL } from './pm.generated.js'; // relocate-fns
import { age_is_relative } from './timeout.js'; // relocate-fns
import { get_adjacent_loc } from "./cmd.js";
import { invletter_value as invletter_value_cmd } from './invent.js'; // relocate-fns
import { tally_BUCX } from './invent.js'; // relocate-fns
import { bot } from './botl.js'; // relocate-fns
import { snuff_lit } from './apply.js';
import { freeinv, obj_here, useup, useupf } from './invent.js'; // relocate-fns
import { display_text_window } from './com_pager.js'; // relocate-fns
import { FOOT, GETOBJ_EXCLUDE, GETOBJ_EXCLUDE_SELECTABLE, GETOBJ_SUGGEST, HALLUC, HALLUC_RES, LL_ACHIEVE, MAY_DESTROY, MAY_HIT, MENU_ITEMFLAGS_NONE, MM_ADJACENTOK, MM_NOMSG, NO_MINVENT, ONAME_NO_FLAGS, REVIVE_MON, ROT_CORPSE, SELL_DELIBERATE, SELL_DONTSELL, SHRINK_GLOB, W_ACCESSORY, W_ARMOR } from './const.js'; // relocate-fns
import { is_pick } from './dig.js'; // relocate-fns
import { DEFAULT_MENU_CMDS, _threeStatusLines, canspotmon, docrt, status_r1_menu_docrt } from './display.js'; // relocate-fns
import { rndmonnam } from './do_name.js'; // relocate-fns
import { obfree } from './shk.js'; // relocate-fns
import { more_experienced } from './exper.js'; // relocate-fns
import { scatter } from './explode.js'; // relocate-fns
import { addinv } from './invent.js'; // relocate-fns
import { obj_is_burning } from './light.js'; // relocate-fns
import { permonstTemplate, set_malign } from './makemon.js'; // relocate-fns
import { christen_monst } from './mhitm.js'; // relocate-fns
import { add_to_container, obj_extract_self as obj_extract_self_general, set_corpsenm } from './mkobj.js';
import { makemon } from './makemon.js'; // relocate-fns
import { Tobjnam } from './objnam.js';
import { oname } from './do_name.js'; // relocate-fns
import { BAG_OF_HOLDING_OTYP, COIN_CLASS, Has_contents, Is_mbag, _Upstart, _carried_box } from './pickup_container.js'; // relocate-fns
import { livelog_printf, urgent_pline } from './pline.js'; // relocate-fns
import { PM_HOUSECAT } from './pm.generated.js'; // relocate-fns
import { d } from './rnd.js'; // relocate-fns
import { pick_pick, sellobj, sellobj_state, stolen_value } from './shk.js'; // relocate-fns
import { stop_timer } from './timeout.js'; // relocate-fns
import { ATR_NONE } from './tty_menu.js'; // relocate-fns
import { newexplevel } from './exper.js'; // relocate-fns
import { setuqwep, setuswapwep, setuwep, welded, weldmsg } from './wield.js'; // relocate-fns
import { encumber_msg_sync } from './weight.js'; // relocate-fns
import { GETOBJ_DOWNPLAY, INV_ORDER, Is_container, OCLASS_COIN, Shk_Your, _Doname2, _nohands, _ynq_cmd, check_capacity_sync, getObjFromGetobj, nothing_happens, pline1 } from './cmd.js'; // relocate-fns
import { ECMD_CANCEL, GETOBJ_PROMPT, PLNMSG_OBJNAM_ONLY, W_WEAPONS, nothing_seems_to_happen } from './const.js'; // relocate-fns
import { is_lava } from './dbridge.js'; // relocate-fns
import { docorner_blank_utf8_captures, docorner_status_rows, docrt_flags } from './display.js'; // relocate-fns
import { doaltarobj, dropy } from './do.js'; // relocate-fns
import { hitfloor } from './dothrow.js'; // relocate-fns
import { surface } from './dungeon.js'; // relocate-fns
import { consume_obj_charge, update_inventory } from './invent.js'; // relocate-fns
import { bagotricks } from './makemon.js'; // relocate-fns
import { obj_extract_self as _objExtractSelf_useupf, hornoplenty, add_to_container as mklev_add_to_container } from './mkobj.js'; // relocate-fns
import { xname as _fw_xname, the as _the_objnam, safe_qbuf as safe_qbuf_invent, vtense } from './objnam.js'; // relocate-fns
import { SchroedingersBox } from './pickup_container.js'; // relocate-fns
import { pline_The } from './pline.js'; // relocate-fns
import { check_unpaid_usage, addtobill as shk_addtobill, costly_spot as shk_costly_spot, currency as shk_currency, subfrombill as shk_subfrombill } from './shk.js'; // relocate-fns
import { tiphat } from './sounds.js'; // relocate-fns
import { Is_candle } from './timeout.js'; // relocate-fns
import { chest_trap as _fl_chest_trap } from './trap.js'; // relocate-fns
import { TtyMenu } from './tty_menu.js'; // relocate-fns
export { _COIN_CLASS, _is_cleric }; // relocate-fns

/* Container types: Is_container checks otyp >= LARGE_BOX && otyp <= BAG_OF_TRICKS.
 * From nethack-c/include/obj.h:
 * LARGE_BOX=214, CHEST=215, ICE_BOX=216, SACK=217, OILSKIN_SACK=218,
 * BAG_OF_HOLDING=219, BAG_OF_TRICKS=220.
 * C ref: pickup.c:2025 if (Is_container(cobj))
 */
const LARGE_BOX = 214;
const BAG_OF_HOLDING = 219;
const BAG_OF_TRICKS = 220;
function isContainer(obj) {
    if (!obj) return false;
    const otyp = (obj.otyp | 0);
    return otyp >= LARGE_BOX && otyp <= BAG_OF_TRICKS;
}

/* Is there a container at x,y. Optional: return count of containers at x,y.
 * C ref: pickup.c:2017-2032 container_at(coordxy x, coordxy y, boolean countem)
 * No RNG. Walks the nexthere chain and counts containers.
 */
export function container_at(x, y, countem) {
    const lobj = game.level?.levelObjects?.[x | 0]?.[y | 0];
    let containerCount = 0;

    for (let cobj = lobj; cobj; cobj = cobj.nexthere) {
        if (isContainer(cobj)) {
            containerCount++;
            if (!countem)
                break;
        }
    }
    return containerCount | 0;
}

function nolimbs(ptr) {
    return ((ptr?.mflags1 | 0) & 0x00006000) === 0x00006000;
}

export async function able_to_loot(x, y, looting) {
    const verb = looting ? 'loot' : 'tip';
    const t = t_at(x, y);

    if (!can_reach_floor(t && is_pit(t.ttyp))) {
        if (game.u.usteed && P_SKILL(P_RIDING) < P_BASIC)
            await rider_cant_reach();
        else
            await cant_reach_floor(x, y, false, true, false);
        return false;
    } else if ((is_pool(x, y) && (looting || !_Underwater())) || _is_lava(x, y)) {
        await pline('You cannot %s things that are deep in the %s.', verb,
                    hliquid(_is_lava(x, y) ? 'lava' : 'water'));
        return false;
    } else if (nolimbs(game.youmonst?.data || game.youmonst)) {
        await pline('Without limbs, you cannot %s anything.', verb);
        return false;
    } else if (looting && !freehand()) {
        await pline('Without a free %s, you cannot loot anything.', body_part(HAND));
        return false;
    }
    return true;
}

/* reset last-picked-up flags
 * C ref: pickup.c:615-632 reset_justpicked(struct obj *olist)
 * Simple loop through linked list, setting pickup_prev to 0.
 */
export function reset_justpicked(olist) {
    for (let otmp = olist; otmp; otmp = otmp.nobj) {
        otmp.pickup_prev = 0;
    }
}

/* Test if handling a fatal corpse is safe
 * C ref: pickup.c:272-281 u_safe_from_fatal_corpse(struct obj *obj, int tests)
 * Check if we're safe from petrification when touching a corpse.
 * test flags (from hack.h):
 *   st_gloves = 0x1     - wearing gloves?
 *   st_corpse = 0x2     - is it a corpse obj?
 *   st_petrifies = 0x4  - does the corpse petrify on touch?
 *   st_resists = 0x8    - do you have stoning resistance?
 *   st_all = 0x0f       - all tests
 */
export const st_gloves = 0x1;
export const st_corpse = 0x2;
export const st_petrifies = 0x4;
export const st_resists = 0x8;
export const st_all = st_gloves | st_corpse | st_petrifies | st_resists;
export function u_safe_from_fatal_corpse(obj, tests) {
    const CORPSE = 265;
    const PM_COCKATRICE = 10;
    const PM_CHICKATRICE = 9;

    // Helper: check if a monster petrifies on touch
    function touch_petrifies(mndx) {
        return mndx === PM_COCKATRICE || mndx === PM_CHICKATRICE;
    }

    // Check if we have stone resistance
    function hasStoneResistance() {
        const p = game.u?.uprops?.[STONE_RES];
        return !!((p?.intrinsic | 0) || (p?.extrinsic | 0));
    }

    // Test conditions (C pickup.c:275-280 single if with OR-ed conditions followed by return FALSE)
    if (((tests & st_gloves) && game.u.uarmg)
        || ((tests & st_corpse) && obj.otyp !== CORPSE)
        || ((tests & st_petrifies) && !touch_petrifies(obj.corpsenm))
        || ((tests & st_resists) && hasStoneResistance())) {
        return 1; // TRUE
    }
    return 0; // FALSE
}

/* C pickup.c fatal_corpse_mistake: a successful stone-golem transformation
 * permits the transfer; petrification stops it even after lifesaving. */
export async function fatal_corpse_mistake(obj, remotely) {
    if (u_safe_from_fatal_corpse(obj, st_all) || remotely) return false;
    const data = game.youmonst?.data;
    if (data && poly_when_stoned(data) && await polymon(PM_STONE_GOLEM)) {
        // C pickup.c:291: display_nhwindow(WIN_MESSAGE, FALSE) calls more()
        // without flushing the map/status changes made after polymon's pline.
        topl_force_break_now(false, capture_flushed_cells(), game._lastPaintedBotl);
        await flush_screen(1);
        return false;
    }
    await pline('Touching %s is a fatal mistake.',
        corpse_xname(obj, null, CXN_SINGULAR | CXN_ARTICLE));
    const { instapetrify } = await _cmdModule();
    await instapetrify(killer_xname(obj));
    return true;
}

/* C pickup.c:302-313: an attempted transfer revives a Rider, even remotely. */
export async function rider_corpse_revival(obj, remotely) {
    if (!obj || obj.otyp !== _CORPSE_OTYP || !is_rider_pm(obj.corpsenm))
        return false;
    await pline('At your %s, the corpse suddenly moves...',
        remotely ? 'attempted acquisition' : 'touch');
    await revive_corpse(obj);
    exercise(A_WIS, false);
    return true;
}

export function menu_class_present(c) {
    // C: return (c && strchr(gv.valid_menu_classes, c)) ? TRUE : FALSE;
    if (!c) return 0; // FALSE
    const validMenuClasses = game.gv?.valid_menu_classes || '';
    return validMenuClasses.includes(String.fromCharCode(c)) ? 1 : 0; // TRUE or FALSE
}

let add_valid_menu_class_vmc_count = 0;

export function add_valid_menu_class(c) {
    if (c === 0) { /* reset */
        add_valid_menu_class_vmc_count = 0;
        game.gc = game.gc || {};
        game.gb = game.gb || {};
        game.gs = game.gs || {};
        game.gp = game.gp || {};
        game.gc.class_filter = false;
        game.gb.bucx_filter = false;
        game.gs.shop_filter = false;
        game.gp.picked_filter = false;
    } else if (!menu_class_present(c)) {
        game.gv = game.gv || {};
        game.gv.valid_menu_classes = (game.gv.valid_menu_classes || '').slice(0, add_valid_menu_class_vmc_count) + String.fromCharCode(c);
        add_valid_menu_class_vmc_count++;
        /* categorize the new class */
        switch (c) {
        case 66: /* 'B' */
        case 85: /* 'U' */
        case 67: /* 'C' */
        case 88: /* 'X' */
            game.gb = game.gb || {};
            game.gb.bucx_filter = true;
            break;
        case 80: /* 'P' */
            game.gp = game.gp || {};
            game.gp.picked_filter = true;
            break;
        case 117: /* 'u' */
            game.gs = game.gs || {};
            game.gs.shop_filter = true;
            break;
        default:
            game.gc = game.gc || {};
            game.gc.class_filter = true;
            break;
        }
    }
    game.gv = game.gv || {};
    game.gv.valid_menu_classes = (game.gv.valid_menu_classes || '').slice(0, add_valid_menu_class_vmc_count);
}

/* C obj.h container otyps. */
const LARGE_BOX_OTYP = 214;
const CHEST_OTYP = 215;
export const ICE_BOX_OTYP = 216;
export const BAG_OF_TRICKS_OTYP = 220;
const SPE_WIZARD_LOCK = 381; /* objects.h SPE_WIZARD_LOCK */

/* C pickup.c:2107-2109: retain xname's called and individual names. */
function _box_xname(obj) {
    return xname(obj);
}
/* C ref: objnam.c the(str) / The(str) — definite article. */
function _the(str) { return the(str); }
function _The(str) { return The(str); }

async function do_loot_cont(cobjRef, cindex, ccount) {
    const g = game;
    const cobj = cobjRef.obj;
    if (!cobj) return ECMD_OK;

    if (cobj.olocked) {
        let res = ECMD_OK;
        /* C pickup.c:2110-2126 — resolve the autounlock tool; call pick_lock
         * when a tool is available or trap checking is enabled.  Its queries
         * handle paging the locked message, as tty_yn_function does in C. */
        const autounlock = g.flags?.autounlock ?? AUTOUNLOCK_APPLY_KEY;
        const ox = cobj.ox | 0, oy = cobj.oy | 0;
        if (autounlock) g.u.dz = 0; /* C pickup.c:2110 — pick_lock cares. */
        let unlocktool = null;
        if ((autounlock & AUTOUNLOCK_APPLY_KEY) !== 0)
            unlocktool = autokey(true);
        const willPrompt = unlocktool != null || ((autounlock & AUTOUNLOCK_UNTRAP) !== 0); /* pickup.c:2123 AUTOUNLOCK_UNTRAP */
        /* C pickup.c:2100-2103 — locked message; lknown picks "is locked" vs
         * "Hmmm, ... turns out to be locked."  The subsequent yn prompt owns
         * more(): a known trap skips the check prompt (lock.c:474), letting
         * untrap_box's message join this line before "Disarm it?" pages it. */
        const lockedMsg = cobj.lknown
            ? `${_The(_box_xname(cobj))} is locked.`
            : `Hmmm, ${_the(_box_xname(cobj))} turns out to be locked.`;
        await pline(lockedMsg);
        cobj.lknown = 1;

        if (autounlock && willPrompt) {
            /* C pickup.c:2119 — pass ox,oy to skip the direction prompt. */
            if (await pick_lock(unlocktool, ox, oy, cobj))
                res = ECMD_TIME;
            return res;
        }
        // C pickup.c:2137-2144: queue #force after looting one locked box.
        // doforce owns the confirmation prompt and whether time passes.
        if ((autounlock & AUTOUNLOCK_FORCE) !== 0 && res !== ECMD_TIME
            && ccount === 1 && u_have_forceable_weapon()) {
            cmdq_add_ec(CQ_CANNED, 'doforce');
            g.abort_looting = true;
        }
        return res;
    }

    cobj.lknown = 1;
    if (cobj.otyp === BAG_OF_TRICKS_OTYP) {
        /* C pickup.c:2144-2153 — opening the bag bites, then identifies it. */
        await pline('You carefully open %s...', the(xname(cobj)));
        await pline('It develops a huge set of teeth and bites you!');
        const tmp = rnd(10);
        await losehp(bhp_Maybe_Half_Phys(tmp), 'carnivorous bag', KILLED_BY_AN);
        discover_object(BAG_OF_TRICKS_OTYP, true, true, true);
        g.abort_looting = true;
        return ECMD_TIME;
    }
    /* C pickup.c:2155 — use_container for an unlocked container. */
    return await use_container(cobjRef, false, cindex < ccount);
}

/* C ref: pickup.c:2159 doloot() — the #loot extended command. */
export async function doloot() {
    const g = game;
    g.loot_reset_justpicked = true;
    const res = await doloot_core();
    g.loot_reset_justpicked = false;
    if ((res & ECMD_TIME) && g._pending_message) {
        _topl_stash_result();
    }
    return res;
}

/* C ref: pickup.c:2350 reverse_loot() — called when attempting to #loot while
 * confused.  The throne-room branch (pickup.c:2386-2423, coffers/court
 * monsters) follows C. */
async function reverse_loot() {
    const u = game.u;
    const x = u.ux, y = u.uy;
    if (!rn2(3)) {
        const cmd = await _cmdModule();
        let n = cmd.inv_cnt(true);
        for (let otmp = game.invent; otmp; --n, otmp = otmp.nobj)
            if (!rn2(n + 1)) {
                await cmd.prinv("You find old loot:", otmp, 0);
                return true;
            }
        return false;
    }
    let goldob = null;
    for (goldob = game.invent; goldob; goldob = goldob.nobj)
        if (goldob.oclass === _COIN_CLASS) {
            const contribution = Math.trunc((rnd(5) * goldob.quan + 4) / 5);
            if (contribution < goldob.quan)
                goldob = await splitobj(goldob, contribution);
            break;
        }
    if (!goldob)
        return false;
    const { remove_worn_item } = await import('./steal.js');
    await remove_worn_item(goldob, false);
    const cmd = await _cmdModule();
    const tile = game.level.at(x, y);
    if (IS_THRONE(tile.typ)) {
        const { add_to_container, add_to_minv, courtmon, makemon } = await import('./mklev.js');
        let coffers = null, mon;
        const dist = o => (o.ox - x) ** 2 + (o.oy - y) ** 2;
        for (let o = game.fobj; o; o = o.nobj) {
            if (o.otyp === CHEST_OTYP && (o.spe === 2 || !coffers || dist(o) < dist(coffers))) coffers = o;
            if (coffers?.spe === 2) break;
        }
        if (coffers) {
            cmd.SetVoice?.(null, 0, 80, 0); // C pickup.c:2403 SetVoice((struct monst *) 0, 0, 80, 0)
            await cmd.verbalize('Thank you for your contribution to reduce the debt.');
            cmd.freeinv(goldob);
            await add_to_container(coffers, goldob);
            coffers.owt = weight(coffers); coffers.cknown = 0;
            if (!coffers.olocked) await boxlock(coffers, { otyp: SPE_WIZARD_LOCK });
        } else if (tile.looted !== T_LOOTED && (mon = await makemon(courtmon(), x, y, NO_MM_FLAGS))) {
            cmd.freeinv(goldob);
            await add_to_minv(mon, goldob);
            await pline('The exchequer accepts your contribution.');
            if (!rn2(10)) tile.looted = T_LOOTED;
        } else {
            await pline('You drop %s.', await doname(goldob));
            await cmd.dropx(goldob);
        }
        return true;
    }
    await cmd.dropx(goldob);
    if (cmd.g_at(x, y))
        await pline("Ok, now there is loot here.");
    return true;
}

async function doloot_core() {
    const g = game;
    const u = g.u;
    let c = -1;
    let timepassed = 0;
    /* C pickup.c:2175-2180 — cc starts at the hero's own square; `underfoot`
     * tracks whether cc is still there (the lootmon branch can move it). */
    const cc = { x: u.ux | 0, y: u.uy | 0 };
    let underfoot = true;
    let prev_inquiry = 0, prev_loot = false;

    g.abort_looting = false;

    /* C pickup.c:2188 -> hack.c:4400-4407 check_capacity((char *) 0):
     * Overtaxed or worse prints "You can't do that while carrying so much
     * stuff." and the command costs no time. */
    if (near_capacity() >= 4 /* EXT_ENCUMBER */) {
        await pline("You can't do that while carrying so much stuff.");
        return ECMD_OK;
    }
    if (_loot_nohands()) {
        await pline("You have no hands!");
        return ECMD_OK;
    }
    /* C pickup.c:2198-2205 — confused #loot: usually reverse_loot(), else
     * a coin-flip "find nothing" (both cost a turn). */
    if (((u.uprops?.[14]?.intrinsic) | 0) !== 0) { /* Confusion; CONFUSION = 14 */
        if (rn2(6) && await reverse_loot())
            return ECMD_TIME;
        if (rn2(2)) {
            await pline("Being confused, you find nothing to loot.");
            return ECMD_TIME; /* costs a turn */
        }             /* else fallthrough to normal looting */
    }

    /* C's `lootcont:` label sits above the container block and the lootmon
     * branch jumps BACK to it when the player directs at their own square and
     * a container is there; a labelled loop is the transliteration. */
    /* C pickup.c:2213-2214 — an `m` prefix (iflags.menu_requested) jumps
     * straight to lootmon, skipping the container block on the first pass. */
    let skipConts = !!g.iflags?.menu_requested;
    lootcont:
    for (;;) {
        /* C pickup.c:2214 — container(s) at cc? */
        const jumped = skipConts;
        const numConts = jumped ? 0 : container_at(cc.x, cc.y, true);
        skipConts = false;
        if (numConts > 0) {
            if (!(await able_to_loot(cc.x, cc.y, true)))
                return ECMD_OK;
            let anyfound = false;
            if (Blind() && !game.u.uarmg) {
                /* C pickup.c:2223-2234 — blind and bare-handed, #loot at a
                 * cockatrice corpse's square is fatal before any menu. */
                const { will_feel_cockatrice } = await import('./cmd.js');
                const { feel_cockatrice } = await import('./eat.js');
                for (let nobj = g.level?.levelObjects?.[cc.x]?.[cc.y]; nobj;
                     nobj = nobj.nexthere) {
                    if ((nobj.otyp | 0) !== 265 /* CORPSE */) continue;
                    if (will_feel_cockatrice(nobj, false)) {
                        await feel_cockatrice(nobj, false);
                        return ECMD_TIME;
                    }
                }
            }
            if (numConts > 1) {
                /* C pickup.c:2227-2264 — present a PICK_ANY menu when more
                 * than one container occupies the square.  The menu window
                 * itself is not painted by this port's replay UI, but
                 * _select_menu implements the same tty selection semantics
                 * used by query_objlist: sequential selectors, toggle,
                 * select-all, cancel, and commit. */
                const containers = [];
                for (let cobj = g.level?.levelObjects?.[cc.x]?.[cc.y];
                     cobj; cobj = cobj.nexthere) {
                    if (_isContainerObj(cobj))
                        containers.push(cobj);
                }
                const menuItems = [];
                for (const obj of containers)
                    menuItems.push({ obj, sel: null, gsel: null, selected: false,
                                     text: await doname(obj) });
                /* wintty.c tty_end_menu assigns a, b, ... restarting at 'a' on
                 * each page (23 rows; the title and blank row take two). */
                let menuCh = 97;
                for (let ix = 0; ix < menuItems.length; ix++) {
                    if (ix > 0 && menuItems.length + 3 > 24 && (ix + 2) % 23 === 0)
                        menuCh = 97;
                    menuItems[ix].sel = String.fromCharCode(menuCh);
                    menuCh = (menuCh === 122) ? 65 : menuCh + 1;
                }
                const cancelled = await _select_menu(menuItems, PICK_ANY,
                                                      { title: 'Loot which containers?' });
                if (!cancelled) {
                    const selected = menuItems.filter((item) => item.selected);
                    for (let i = 0; i < selected.length; i++) {
                        const ref = { obj: selected[i].obj };
                        timepassed |= await do_loot_cont(ref, i + 1,
                                                         selected.length);
                        if (g.abort_looting)
                            return timepassed ? ECMD_TIME : ECMD_OK;
                    }
                    if (selected.length)
                        c = 'y';
                }
                /* C pickup.c:2273 — `if (n != 0) c = 'y'`: <esc> gives n == -1,
                 * so a cancelled menu also skips the directional prompt. */
                if (cancelled)
                    c = 'y';
            } else {
                /* C pickup.c:2268 — single container: walk the tile chain. */
                const lvlObjs = g.level?.levelObjects;
                let cobj = lvlObjs?.[cc.x]?.[cc.y] ?? null;
                while (cobj) {
                    const nobj = cobj.nexthere;
                    if (_isContainerObj(cobj)) {
                        anyfound = true;
                        const ref = { obj: cobj };
                        timepassed |= await do_loot_cont(ref, 1, 1);
                        if (g.abort_looting)
                            return timepassed ? ECMD_TIME : ECMD_OK;
                    }
                    cobj = nobj;
                }
                if (anyfound) c = 'y';
            }
        } else if (!jumped && IS_GRAVE(game.level?.at?.(cc.x, cc.y)?.typ)) {
            /* C pickup.c:2288 */
            await pline("You need to dig up the grave to effectively loot it...");
        }

        if (c !== 'y' && (mon_beside(u.ux | 0, u.uy | 0)
                          || g.iflags?.menu_requested)) {
            let looted_mon = false;
            if (!await get_adjacent_loc('Loot in what direction?',
                                        'Invalid loot location',
                                        u.ux | 0, u.uy | 0, cc))
                return ECMD_OK;
            underfoot = u_at(cc.x, cc.y);
            if (underfoot && container_at(cc.x, cc.y, false))
                continue lootcont; /* C: goto lootcont */
            if ((u.dz | 0) < 0) {
                /* C pickup.c:2301-2304: ceiling() also handles special rooms
                 * and planes, using the selected square. */
                await pline(`You don't find anything to loot on the ${ceiling(cc.x, cc.y)}.`);
                return ECMD_TIME;
            }
            const mtmp = m_at(cc.x, cc.y);
            if (mtmp) {
                const box = { passed_info: prev_inquiry, prev_loot };
                timepassed = await loot_mon(mtmp, box);
                prev_inquiry = box.passed_info;
                prev_loot = box.prev_loot;
                if (timepassed)
                    looted_mon = true;
            }
            /* C pickup.c:2314-2317 — "always use a turn when choosing a
             * direction is impaired" (Confusion || Stunned). */
            for (const p of [13, 14]) { /* STUNNED, CONFUSION */
                const pr = u.uprops?.[p];
                if (pr && (pr.intrinsic | 0) !== 0)
                    timepassed = 1;
            }

            /* C pickup.c:2324-2338 — preserve pre-3.3.1 behaviour for
             * containers: they can only be looted from underfoot. */
            if (!looted_mon) {
                if (!underfoot && container_at(cc.x, cc.y, false)) {
                    if (mtmp) {
                        await pline(`You can't loot anything ${prev_inquiry ? 'else ' : ''}there`
                                    + ` with ${mon_nam(mtmp)} in the way.`);
                        return timepassed ? ECMD_TIME : ECMD_OK;
                    }
                    await pline('You have to be at a container to loot it.');
                } else {
                    await pline(`You don't find anything `
                                + `${(prev_inquiry || prev_loot) ? 'else ' : ''}`
                                + `${!underfoot ? 't' : ''}here to loot.`);
                    return timepassed ? ECMD_TIME : ECMD_OK;
                }
            }
        } else if (c !== 'y' && c !== 'n') {
            /* C pickup.c:2340 — the "don't find anything" tail. */
            await pline(`You don't find anything ${underfoot ? 'here' : 'there'} to loot.`);
        }
        return timepassed ? ECMD_TIME : ECMD_OK;
    }
}

/* C ref: pickup.c:2115 mon_beside(x, y) — is there a monster on or next to
 * <x,y>?  (The i==0 && j==0 case is included in C too.) */
function mon_beside(x, y) {
    for (let i = -1; i <= 1; i++)
        for (let j = -1; j <= 1; j++) {
            const nx = x + i, ny = y + j;
            if (isok(nx, ny) && m_at(nx, ny))
                return true;
        }
    return false;
}


/* C ref: pickup.c:2431 loot_mon(mtmp, passed_info, prev_loot) — 3.3.1's
 * "remove the saddle from your steed" and 3.4.0's loot-the-swallower.  C's two
 * out-params are carried in one box (this tree's {value}-style convention). */
export async function loot_mon(mtmp, box) {
    let timepassed = 0;
    if (mtmp && mtmp !== game.u?.usteed && which_armor(mtmp, W_SADDLE)) {
        const saddle = which_armor(mtmp, W_SADDLE);
        if (box) box.passed_info = 1;
        const ans = await yn_function(`Do you want to remove the saddle from ${x_monnam(mtmp, ARTICLE_THE, null, SUPPRESS_SADDLE, false)}?`, 'ynq', 'n', true);
        if (ans === 'y') {
            if (nolimbs(game.youmonst?.data)) {
                await pline("You can't do that without limbs.");
                return 0;
            }
            if (saddle.cursed) {
                await pline(`You can't.  The saddle seems to be stuck to ${x_monnam(mtmp, ARTICLE_THE, null, SUPPRESS_SADDLE, false)}.`);
                return 1;
            }
            /* C pickup.c:2460 — also update extrinsics and schedule a gear check. */
            await extract_from_minvent(mtmp, saddle, true, false);
            /* C pickup.c:2461-2463: use the simple definite object name. */
            if (game.flags.verbose)
                await pline(`You take ${thesimpleoname(saddle)} off of ${mon_nam(mtmp)}.`);
            await hold_another_object(saddle, 'You drop %s!', (await doname(saddle)), null);
            timepassed = rnd(3);
            if (box) box.prev_loot = true;
        }
        if (ans === 'q') return 0;
    }
    if (game.u?.uswallow) {
        const count = box?.passed_info | 0;
        return await pickup(count);
    }
    return timepassed;
}
/* C ref: mondata.h:52 nohands(ptr) = ((ptr->mflags1 & M1_NOHANDS) != 0),
 * applied to gy.youmonst.data — the hero's CURRENT form (polyself.c set_uasmon
 * points youmonst.data at mons[u.umonnum] whether polymorphed or not).  RNG-free.
 * Reading game.youmonst.data directly is the same access js/cmd.js:9962
 * _hero_nohands makes; a hero whose youmonst has not been built yet reads as
 * "has hands", which is what the un-polymorphed @-class hero is. */
const _M1_NOHANDS_PU = 0x00002000; /* monflag.h:98 */
function _loot_nohands() {
    const d = game.youmonst && game.youmonst.data;
    return !!(d && ((d.mflags1 >>> 0) & _M1_NOHANDS_PU) !== 0);
}

function _isContainerObj(obj) {
    if (!obj) return false;
    const otyp = obj.otyp | 0;
    return otyp >= 214 && otyp <= 220;
}

/* C ref: pickup.c:2959 use_container() — the take-out / put-in menu.
 * Ported separately below (or stubbed); imported lazily to avoid a cycle. */
async function use_container(cobjRef, held, more_containers) {
    const { use_container_impl } = await import('./pickup_container.js');
    return await use_container_impl(cobjRef, held, more_containers);
}


/* ---- small pickup.c-local constants not already in const.js ---- */
const _CORPSE_OTYP = 265;
const _SCR_SCARE_MONSTER_OTYP = 326;
const _BOULDER_OTYP = 475;
const _LOADSTONE_OTYP = 471;
const _COIN_CLASS = 12;
const _LAVAPOOL_TYP = 20, _LAVAWALL_TYP = 21;
const _M1_NOTAKE = 0x00000800;   /* monflag.h */
const _M1_HIDE = 0x00000100;     /* monflag.h — hides_under() */
const _invlet_basic = 52;        /* hack.h invlet_basic */

function _OBJ_AT(x, y) {
    return !!(game.level?.levelObjects?.[x | 0]?.[y | 0]);
}

/* C dbridge.c:is_lava — include lava beneath a raised drawbridge. */
function _is_lava(x, y) {
    if (!isok(x, y)) return false;
    const lev = game.level?.at ? game.level.at(x, y) : null;
    if (!lev) return false;
    return lev.typ === _LAVAPOOL_TYP || lev.typ === _LAVAWALL_TYP
        || (lev.typ === DRAWBRIDGE_UP
            && ((lev.drawbridgemask | 0) & DB_UNDER) === DB_LAVA);
}

/* C ref: hack.h Underwater — !!u.uinwater.  js/cmd.js has an unexported local
 * copy of the same one-liner; mirrored here rather than imported (module-
 * private in that file). */
function _Underwater() {
    return !!(game.u && game.u.uinwater);
}

/* C ref: mondata.h:54 notake(ptr) = ((ptr->mflags1 & M1_NOTAKE) != 0).
 * RNG-free.  Mirrors this file's own _loot_nohands() convention for reading
 * the hero's CURRENT youmonst.data. */
function notake(data) {
    return !!(data && ((data.mflags1 | 0) & _M1_NOTAKE) !== 0);
}

/* C ref: mondata.h hides_under(ptr) = ((ptr->mflags1 & M1_HIDE) != 0). */
function _hides_under(data) {
    return !!(data && ((data.mflags1 | 0) & _M1_HIDE) !== 0);
}

/* C ref: rm.h:133-136 SURFACE_AT(x,y) and dbridge.c:115-128 db_under_typ().
 * Mirrors js/look.js's own file-local `_surface_at`/`_db_under_typ` pair
 * (established convention: each file mirrors this one-off macro rather than
 * importing another file's module-private copy). */
function _db_under_typ(mask) {
    switch ((mask & DB_UNDER) | 0) {
    case DB_ICE:  return ICE;
    case DB_LAVA: return LAVAPOOL;
    case DB_MOAT: return MOAT;
    default:      return STONE;
    }
}
function _surface_at(x, y) {
    const lev = game.level?.at ? game.level.at(x, y) : null;
    if (!lev) return STONE;
    return (lev.typ === DRAWBRIDGE_UP)
        ? _db_under_typ(lev.drawbridgemask | 0)
        : lev.typ;
}

/* C ref: dungeon.c:1749-1785 surface(x,y) — DELETED a file-local hand-rolled
 * copy (`_surface_word`) that had ZERO callers: read_engr_at()'s "on the
 * <eloc>" plines live in js/cmd.js's exported port, which calls the ONE
 * canonical surface() (js/cmd.js:16452) for its eloc.  The copy also omitted
 * the swallowed-hero maw/husk arm (dungeon.c:1754-1759) and invented a
 * null-tile "ground" arm.  Only this file's `_surface_at` (the rm.h:133
 * SURFACE_AT macro twin, used at :1018) remains, and it is a different
 * function from surface(). */

/* C ref: pickup.c:335-348 deferred_decor(boolean setup) — called ONLY from
 * describe_decor()'s own HFumbling guard below (setup=TRUE); the setup=FALSE
 * half (re-invoke describe_decor and clear the defer flag) exists for
 * fidelity but has no reachable caller in this file — timeout.c's
 * fumbling-timeout handler, the only setup=FALSE caller in the C tree, is
 * outside this file's ownership and does not call into js/pickup.js. */
async function deferred_decor(setup) {
    const g = game;
    g.iflags = g.iflags || {};
    if (!g.flags?.mention_decor) {
        g.iflags.defer_decor = false;
    } else if (setup) {
        g.iflags.defer_decor = true;
    } else {
        await describe_decor();
        g.iflags.defer_decor = false;
    }
}
export { deferred_decor };

export async function describe_decor() {
    const g = game;
    const u = g.u;
    g.iflags = g.iflags || {};
    g.gd = g.gd || {};
    let res = true;

    const hfumbling = (u.uprops?.[FUMBLING]?.intrinsic | 0);
    if ((hfumbling & TIMEOUT) === 1
        && !g.iflags.defer_decor
        && !g.gd.decor_fumble_override) {
        await deferred_decor(true);
        return false;
    }

    const ux = u.ux | 0, uy = u.uy | 0;
    const ltyp = _surface_at(ux, uy);
    let dfeature = _cmd_dfeature_at(ux, uy);

    const doorhere = !!dfeature
        && (dfeature === 'open door' || dfeature === 'doorway');
    const waterhere = dfeature === 'pool of water';
    const prevDecor = (g.iflags.prev_decor == null)
        ? STONE : (g.iflags.prev_decor | 0);
    if (doorhere || _Underwater()
        || (ltyp === ICE && IS_POOL(prevDecor)))
        dfeature = null;

    if (ltyp === prevDecor && !IS_FURNITURE(ltyp)) {
        res = false;
    } else if (dfeature) {
        if (waterhere)
            dfeature = _cmd_waterbody_name(ux, uy);
        if (dfeature !== 'swamp' && ltyp !== ICE)
            dfeature = an(dfeature);

        const outbuf = g.flags?.verbose
            ? `There is ${dfeature} here.`
            : `${upstart(dfeature)}.`;
        if (ltyp === ICE && g.flags?.mention_decor)
            await Norep(outbuf);
        else
            await pline(outbuf);
    } else if (!_Underwater()) {
        if (IS_POOL(prevDecor) || IS_LAVA(prevDecor) || prevDecor === ICE) {
            if ((g.iflags.last_msg | 0) !== PLNMSG_BACK_ON_GROUND)
                await _cmd_back_on_ground(false);
        }
    }
    g.iflags.prev_decor = g.flags?.mention_decor ? ltyp : STONE;
    return res;
}

/* C ref: engrave.c:318-406 read_engr_at(x, y).
 * Canonical definition is imported from js/cmd.js. */

/* C ref: pickup.c:430-455 check_here(picked_some).  describe_decor(),
 * look_here() and read_engr_at() are now all real (see above and
 * js/look.js). */
async function check_here(picked_some) {
    const g = game;
    const u = g.u;
    let lhflags = picked_some ? LOOKHERE_PICKED_SOME : LOOKHERE_NOFLAGS;

    if (g.flags?.mention_decor) {
        if (await describe_decor())
            lhflags |= LOOKHERE_SKIP_DFEATURE;
    }

    let ct = 0;
    for (let obj = g.level?.levelObjects?.[u.ux | 0]?.[u.uy | 0]; obj;
         obj = obj.nexthere) {
        if (obj !== g.u?.uchain)
            ct++;
    }

    if (ct) {
        if (g.context?.run)
            nomul(0);
        await flush_screen(1);
        await look_here(ct, lhflags);
    } else {
        await read_engr_at(u.ux | 0, u.uy | 0);
    }
}

/* FOLLOW macro (pickup.c:56-57): BY_NEXTHERE walks .nexthere, else .nobj. */
function _follow(curr, qflags) {
    return (qflags & BY_NEXTHERE) ? curr.nexthere : curr.nobj;
}

/* C ref: pickup.c:912-927 — first matching exception, newest rule first. */
async function check_autopickup_exceptions(obj) {
    if (game.apelist?.length) {
        const objdesc = makesingular(await doname(obj));
        return game.apelist.find(ape => regcomp(ape.pattern).test(objdesc)) || null;
    }
    return null;
}

/* C ref: pickup.c:925-947 autopick_testobj(otmp, calc_costly).
 * `static boolean costly` (C) becomes a module-level `let`, matching the
 * fact that it is recomputed on every autopick() call that has >=1 item
 * (calc_costly is TRUE exactly once, on the first item of each call). */
let _autopick_costly = false;
const DEF_OC_SYMS = [
    undefined,
    ']', ')', '[', '=', '"', '(', '%', '!',
    '?', '+', '/', '$', '*', '`', '0', '_', '.',
];
export async function autopick_testobj(otmp, calc_costly) {
    const g = game;
    const otypes = g.flags?.pickup_types || '';

    if (calc_costly)
        _autopick_costly = ((otmp.where | 0) === OBJ_FLOOR
            && costly_spot(otmp.ox | 0, otmp.oy | 0));

    if (_autopick_costly && !otmp.no_charge)
        return false;

    if ((g.flags?.pickup_thrown ?? true) /* default On, optlist.h:579 */ && (otmp.how_lost | 0) === LOST_THROWN)
        return true;
    if ((g.flags?.pickup_stolen ?? true) /* default On, optlist.h:576 */ && (otmp.how_lost | 0) === LOST_STOLEN)
        return true;
    if ((g.flags?.nopick_dropped ?? true) /* default On, optlist.h:291 */ && (otmp.how_lost | 0) === LOST_DROPPED)
        return false;
    if ((otmp.how_lost | 0) === LOST_EXPLODING)
        return false;

    let pickit = (!otypes || otypes.length === 0
                  || otypes.includes(DEF_OC_SYMS[otmp.oclass | 0]));
    const ape = await check_autopickup_exceptions(otmp);
    if (ape)
        pickit = ape.grab;
    return pickit;
}

/* C ref: pickup.c:988-1003 autopick(olist, follow, pick_list).  Returns an
 * array of {obj, count} (this port's pick_list shape), never a raw count +
 * out-param the way C's alloc()'d menu_item array works. */
async function autopick(olist, follow) {
    const items = [];
    let n = 0;
    let check_costly = true;
    for (let curr = olist; curr; curr = _follow(curr, follow)) {
        if (await autopick_testobj(curr, check_costly))
            ++n;
        check_costly = false;
    }
    if (n)
        for (let curr = olist; curr; curr = _follow(curr, follow))
            if (await autopick_testobj(curr, false))
                items.push({ obj: curr, count: curr.quan | 0 });
    return items;
}

/* C ref: pickup.c:509 all_but_uchain(obj) — query_objlist callback. */
function all_but_uchain(obj) {
    return obj !== game.u?.uchain;
}

/* C ref: pickup.c:1004-1009 n_or_more(obj) — query_objlist callback; gv.
 * val_for_n_or_more is threaded here as an explicit parameter instead of a
 * global, since this port's query_objlist takes the callback pre-bound. */
function n_or_more(obj, refCount) {
    if (obj === game.u?.uchain) return false;
    return (obj.quan | 0) >= refCount;
}

/* C wintty.c process_menu_window: selection and paging shared by the
 * pickup query and the multiple-container loot menu. */
const _QO_SELECT_ALL = 0x2e /* '.' */, _QO_UNSELECT_ALL = 0x2d /* '-' */,
      _QO_INVERT_ALL = 0x40 /* '@' */, _QO_SELECT_PAGE = 0x2c /* ',' */,
      _QO_UNSELECT_PAGE = 0x5c /* '\\' */, _QO_INVERT_PAGE = 0x7e /* '~' */;
/* C ref: wintty.c:1560-1614 case '\n'/'\r'/' ' commit; case '\033' cancel
 * (deselect-everything first — this is why an ESC after some letters were
 * pressed still yields an EMPTY pick list); default: an explicit selector
 * toggles that row (PICK_ONE finishes immediately on the first toggle,
 * pickup.c:1024's `how` parameter), a group accelerator toggles its whole
 * class, anything else rings the bell and the menu stays up. */
async function _select_menu(items, how, paint = null) {
    let page = 0;
    let pendingCount = 0n;
    /* wintty.c:1704-1730 MENU_SEARCH: the getlin blanks row 0, and the page is
     * not repainted afterwards, so the title stays erased (see
     * pickup_container.js titleErased). */
    let titleErased = false;
    for (;;) {
        /* wintty.c tty_end_menu: a menu taller than the terminal paginates at
         * rows-1 (23) content rows with a "(N of M)" footer; each page is a
         * full-screen window and bare selectors apply to the visible page. */
        let visibleItems = new Set(items), pageCount = 1;
        if (paint) {
            const all = paint.title != null ? [titleErased ? '' : menu_heading_text(paint.title), ''] : [];
            const rowItems = all.map(() => null);
            if (paint.header) { all.push(paint.header); rowItems.push(null); }
            let lastHeading = null;
            for (const it of items)
            {
                /* C pickup.c:1100-1130 query_objlist: a class heading precedes
                 * each run of same-class entries (invent.c:4790 names[]). */
                if (it.heading && it.heading !== lastHeading) {
                    all.push(menu_heading_text(it.heading));
                    rowItems.push(null);
                }
                lastHeading = it.heading;
                const showGlyph = it.glyph && game.iflags?.use_menu_glyphs
                    && !((game.iflags.menuobjsyms | 0) & 4);
                const styled = menucolor_text(it.text);
                all.push(`${it.sel} ${menu_item_marker(it, page, showGlyph, styled)} ${styled}`); /* windows.c:1803 add_menu() */
                rowItems.push(it);
            }
            all.push('(end)');
            const tall = all.length > 24;
            let lines = all;
            if (tall) {
                const body = all.slice(0, -1);
                pageCount = Math.ceil(body.length / 23);
                if (page >= pageCount) page = pageCount - 1;
                const rs = page * 23, re = Math.min(body.length, rs + 23);
                lines = [...body.slice(rs, re), `(${page + 1} of ${pageCount})`];
                visibleItems = new Set(rowItems.slice(rs, re).filter(Boolean));
                while (lines.length < 24) lines.push('');
            }
            const full = tall || lines.length === 24;
            const WIN_COL = full ? 1 : tty_window_offx(lines, 'end');
            /* C wintty.c:1918-1919 tty_display_nhwindow(NHW_MENU): a standing
             * topline is paged out with a --More-- before the menu is drawn. */
            if (game._pending_message)
                await force_more(game._pending_message);
            game._pending_message = '';
            game._topl_sticky = null;
            game._screen_output = build_window_screen(lines, WIN_COL, game.u?.uac ?? 0,
                                                      tall ? 0 : undefined, undefined, full);
            const disp = game.nhDisplay;
            if (disp) {
                if (tall) {
                    const foot = `(${page + 1} of ${pageCount})`;
                    disp.cursorCol = WIN_COL + foot.length;
                    disp.cursorRow = lines.findIndex((l) => l === foot);
                } else {
                    disp.cursorCol = WIN_COL + 6;
                    disp.cursorRow = lines.length - 1;
                }
            }
        }
        const raw = await nhgetch();
        const k = typeof raw === 'number' ? raw : (raw?.charCodeAt(0) ?? 0);
        const ch = String.fromCharCode(k);
        const hit = items.find((it) => it.sel === ch && visibleItems.has(it));
        // C wintty.c:1564-1615: digits accumulate a count; ESC cancels it.
        if (!hit && k >= 48 && k <= 57
            && (pendingCount || !items.some(it => it.gsel === ch))) {
            pendingCount = pendingCount * 10n + BigInt(k - 48);
            if (pendingCount > 0x7fffffffffffffffn) pendingCount = 0n;
            continue;
        }
        const count = Number(pendingCount);
        pendingCount = 0n;
        if (hit && how !== PICK_NONE) {
            // C toggle_menu_curr: a count replaces an existing selection.
            hit.selected = count > 0 || !hit.selected;
            hit.count = hit.selected ? (count || -1) : -1;
            if (how === PICK_ONE) return false;
            continue;
        }
        if (k === 27) {
            game._ttyDismissMore = 1; /* getline.c:245-247 */
            if (count) continue;
            for (const it of items) it.selected = false;
            return true; /* cancelled */
        }
        if (k === 32 || k === 62 /* > */) {
            if (page < pageCount - 1) { page++; continue; }
            if (k === 32) return false; /* space finishes on the last page */
            continue;
        }
        if (k === 0x3a /* ':' MENU_SEARCH */) {
            if (how === PICK_NONE) continue;
            /* C wintty.c:1700-1730 — getlin, "*%s*", pmatchi on "%c - %s". */
            const finished = await menu_search_case(
                how === PICK_ONE ? 'ONE' : 'ANY',
                items.map((it) => ({ str: `${it.sel} - ${it.text}`, it })),
                () => String(game._screen_output).split('\n'),
                (curr) => { curr.it.selected = !curr.it.selected; curr.it.count = -1; });
            titleErased = true;
            if (finished) return false;
            continue;
        }
        if (k === 60 /* < */) { if (page > 0) page--; continue; }
        if (k === 94 /* ^ */) { page = 0; continue; }
        if (k === 124 /* | */) { page = pageCount - 1; continue; }
        if (k === 10 || k === 13)
            return false; /* commit */
        if (how === PICK_ANY && (k === _QO_SELECT_ALL || k === _QO_SELECT_PAGE)) {
            for (const it of items)
                if ((k === _QO_SELECT_ALL || visibleItems.has(it)) && !it.selected) {
                    it.selected = true; it.count = -1;
                }
            continue;
        }
        if (k === _QO_UNSELECT_ALL || k === _QO_UNSELECT_PAGE) {
            for (const it of items)
                if (k === _QO_UNSELECT_ALL || visibleItems.has(it)) { it.selected = false; it.count = -1; }
            continue;
        }
        if (how === PICK_ANY && (k === _QO_INVERT_ALL || k === _QO_INVERT_PAGE)) {
            for (const it of items)
                if (k === _QO_INVERT_ALL || visibleItems.has(it)) {
                    it.selected = !it.selected;
                    it.count = -1;
                }
            continue;
        }
        if (how !== PICK_NONE && ch !== '\0' && items.some((it) => it.gsel === ch)) {
            if (how === PICK_ONE && items.filter((it) => it.gsel === ch).length !== 1) continue;
            for (const it of items) if (it.gsel === ch) {
                it.selected = !it.selected;
                it.count = it.selected ? (count || -1) : -1;
            }
            if (how === PICK_ONE) return false;
            continue;
        }
        /* wintty.c:1735-1739 — unacceptable input rings the bell; menu stays up.
         * The bell is inside xwaitforspace (getline.c:250-254), so a live
         * count survives it (wintty.c:1396 reset_count stays FALSE). */
        pendingCount = BigInt(count);
    }
}

/* C invent.c:592 sortloot(), with query_objlist's flag-dependent mode.
 * The array holds the filtered chain, including fatal corpses retained by
 * SORTLOOT_PETRIFY, before query_objlist applies its per-row allow check. */
const _PU_INV_ORDER = [12, 5, 2, 3, 7, 9, 10, 8, 4, 11, 6, 13, 14, 15, 16];
const _PU_SLIME_MOLD_OTYP = 285, _PU_TIN_OTYP = 296, _PU_EGG_OTYP = 266,
      _PU_CORPSE_OTYP = 265;
/* C invent.c:188-198 armcat[] indexed by oc_armcat (SUIT 0, SHIELD 1, HELM 2,
 * GLOVES 3, BOOTS 4, CLOAK 5, SHIRT 6); out-of-range -> 7 -> armcat[7] = 8. */
const _PU_LOOT_ARMCAT = [7, 4, 1, 2, 3, 5, 6, 8];
function _pu_loot_subclass(obj, discovered) {
    if ((obj.oclass | 0) === 3 /* ARMOR_CLASS */) {
        let k = ARMOR_DATA[obj.otyp | 0]?.armcat;
        if (k === undefined || k < 0 || k >= 7) k = 7;
        return _PU_LOOT_ARMCAT[k];
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
        /* C invent.c:215-240 */
        const t = obj.otyp | 0;
        if (obj.dknown && discovered
            && (t === 220 || t === 252))
            return 2;
        if (isContainer(obj)) return 1;
        return ((t >= 247 && t <= 251) || t === 253 || t === 254
                || (t >= 256 && t <= 258) || t === 252) ? 3 : 4;
    }
    if ((obj.oclass | 0) === 13 /* GEM_CLASS */) {
        const seen = !!obj.dknown;
        switch (MKOBJ_OC_MATERIAL[obj.otyp | 0]) {
        case 20: return !seen ? 1 : !discovered ? 2 : 3; // GEMSTONE
        case 19: return !seen ? 1 : !discovered ? 2 : 4; // GLASS
        default: return !seen ? 5 : obj.otyp !== 474 ? (!discovered ? 6 : 7) : 8;
        }
    }
    if ((obj.oclass | 0) !== 7 /* FOOD_CLASS */)
        return 1;
    switch (obj.otyp | 0) {
    case _PU_SLIME_MOLD_OTYP: return 1;
    case _PU_TIN_OTYP:        return 3;
    case _PU_EGG_OTYP:        return 4;
    case _PU_CORPSE_OTYP:     return 5;
    default:                  return obj.globby ? 6 : 2;
    }
}
function _pu_loot_disco(obj, discovered) {
    const otyp = obj.otyp | 0;
    if (!(obj.dknown | 0)) return 1;
    if (discovered || !getObjDescr(otyp)) return 4;
    return game._oc_uname?.[otyp] ? 3 : 2;
}
function _pu_loot_xname(obj) {
    // C invent.c:309-387: suppress name prefixes and rank towel/glob sizes.
    return loot_xname(obj);
}
function _pu_strcmpi(a, b) {
    const x = String(a).toLowerCase(), y = String(b).toLowerCase();
    if (x === y) return 0;
    const n = Math.min(x.length, y.length);
    for (let i = 0; i < n; i++) {
        const d = x.charCodeAt(i) - y.charCodeAt(i);
        if (d) return d;
    }
    return x.length - y.length;
}
function _pu_loot_classify(obj) {
    if (!Blind()) observe_object(obj); /* invent.c:170-171 */
    /* C invent.c:155-159,174-180: honor packorder under sortpack;
     * otherwise use loot_classify's pickup-oriented default class order. */
    const classorder = game.flags?.sortpack === false
        ? [12, 5, 4, 11, 8, 9, 10, 13, 7, 6, 2, 3, 14, 15, 16]
        : (game.flags?.inv_order || _PU_INV_ORDER);
    const k = classorder.indexOf(obj.oclass | 0);
    return (k >= 0) ? (1 + k) : (1 + classorder.length + ((obj.oclass | 0) !== 17 ? 1 : 0));
}
function _pu_sortloot(eligible, qflags) {
    const sl = game.flags?.sortloot ?? 'l';
    const lootMode = sl === 'f' || (sl === 'l' && !(qflags & USE_INVLET));
    const invletMode = !lootMode && !!(qflags & USE_INVLET);
    const packMode = !!game.flags?.sortpack;
    if (!lootMode && !invletMode && !packMode)
        return eligible.slice();
    const arr = eligible.map((obj, indx) => ({ obj, indx, orderclass: 0 }));
    const classify = (sli) => {
        if (!sli.orderclass) {
            const discovered = !!game._oc_name_known?.[sli.obj.otyp];
            sli.orderclass = _pu_loot_classify(sli.obj);
            sli.subclass = _pu_loot_subclass(sli.obj, discovered);
            sli.disco = _pu_loot_disco(sli.obj, discovered);
        }
    };
    const compare = (a, b) => {
        let cmp;
        if (!invletMode || packMode) {
            classify(a); classify(b);
            if ((cmp = a.orderclass - b.orderclass)) return cmp;
            if (!invletMode) {
                if ((cmp = a.subclass - b.subclass)) return cmp;
                if ((cmp = a.disco - b.disco)) return cmp;
            }
        }
        /* C invent.c:471-476 invletter_value() — the port in js/cmd.js */
        if (invletMode && (cmp = invletter_value_cmd(a.obj.invlet | 0)
                               - invletter_value_cmd(b.obj.invlet | 0))) return cmp;
        if (lootMode) {
            a.str ??= _pu_loot_xname(a.obj);
            b.str ??= _pu_loot_xname(b.obj);
            if ((cmp = _pu_strcmpi(a.str, b.str))) return cmp;
            const buc = (o) => o.bknown ? (o.blessed ? 3 : !o.cursed ? 2 : 1) : 0;
            if ((cmp = buc(b.obj) - buc(a.obj))) return cmp;
            if ((cmp = (b.obj.greased | 0) - (a.obj.greased | 0))) return cmp;
            if ((cmp = Math.max(a.obj.oeroded | 0, a.obj.oeroded2 | 0)
                       - Math.max(b.obj.oeroded | 0, b.obj.oeroded2 | 0))) return cmp;
            if ((cmp = Number(!!(b.obj.rknown && b.obj.oerodeproof))
                       - Number(!!(a.obj.rknown && a.obj.oerodeproof)))) return cmp;
            // C invent.c:533 tests obj1's type, including its asymmetry.
            if (OC_USES_KNOWN[a.obj.otyp] && a.obj.oclass !== 7) {
                cmp = (b.obj.known ? b.obj.spe | 0 : -1000)
                    - (a.obj.known ? a.obj.spe | 0 : -1000);
                if (cmp) return cmp;
            }
        }
        return a.indx - b.indx;
    };
    // libc's merge sort. Comparison order matters for observe_object and
    // loot_xname (which can consume RNG for tins), even across classes.
    const mergeSort = (v) => {
        if (v.length < 2) return v;
        const mid = Math.trunc(v.length / 2);
        const left = mergeSort(v.slice(0, mid)), right = mergeSort(v.slice(mid));
        const out = [];
        let i = 0, j = 0;
        while (i < left.length && j < right.length)
            out.push(compare(left[i], right[j]) <= 0 ? left[i++] : right[j++]);
        return out.concat(left.slice(i), right.slice(j));
    };
    return mergeSort(arr).map((sli) => sli.obj);
}

/* C pickup.c:1025-1214 query_objlist.  Arrays replace C's allocated pick
 * list: [] means zero choices, -1 SIGNAL_NOMENU, -2 SIGNAL_ESCAPE. */
const _QO_CLASS_NAME = {
    1: 'Illegal objects', 2: 'Weapons', 3: 'Armor', 4: 'Rings', 5: 'Amulets',
    6: 'Tools', 7: 'Comestibles', 8: 'Potions', 9: 'Scrolls', 10: 'Spellbooks',
    11: 'Wands', 12: 'Coins', 13: 'Gems/Stones', 14: 'Boulders/Statues',
    15: 'Iron balls', 16: 'Chains', 17: 'Venoms',
};
async function query_objlist(qstr, objchain, qflags, how, allow) {
    const engulfer = !!(qflags & INCLUDE_HERO);
    if (!objchain && !engulfer) return [];
    let n = 0, last = null;
    for (let curr = objchain; curr; curr = _follow(curr, qflags))
        if (allow(curr)) { last = curr; n++; }

    const engulfer_minvent = objchain?.where === OBJ_MINVENT
        && engulfing_u(objchain.ocarry);
    if (engulfer_minvent && n === 1 && objchain.owornmask)
        qflags &= ~AUTOSELECT_SINGLE;
    if (engulfer) {
        ++n;
        qflags &= ~AUTOSELECT_SINGLE;
    }
    if (n === 0)
        return (qflags & SIGNAL_NOMENU) ? -1 : [];
    if (n === 1 && (qflags & AUTOSELECT_SINGLE))
        return [{ obj: last, count: last.quan }];

    // C sortloot calls allow again, retaining petrifying corpses even when
    // the filter rejects them (invent.c:619-624 SORTLOOT_PETRIFY).
    const eligible = [];
    for (let curr = objchain; curr; curr = _follow(curr, qflags))
        if (allow(curr) || ((qflags & FEEL_COCKATRICE) && curr.otyp === CORPSE
                          && (curr.corpsenm === 9 || curr.corpsenm === 10)))
            eligible.push(curr);
    const sorted = _pu_sortloot(eligible, qflags);
    const pack = [...(game.flags?.inv_order || _PU_INV_ORDER)];
    if (qflags & INCLUDE_VENOM) pack.push(17);
    const items = [];
    let first = true;
    // INVORDER_SORT controls grouping independently of sortloot's mode.
    for (const oclass of (qflags & INVORDER_SORT) ? pack : [null]) {
        for (const obj of sorted) {
            if (oclass !== null && obj.oclass !== oclass) continue;
            if ((qflags & FEEL_COCKATRICE) && obj.otyp === CORPSE
                && will_feel_cockatrice(obj, false)) {
                await look_here(0, LOOKHERE_NOFLAGS);
                return [];
            }
            if (!allow(obj)) continue;
            let heading = oclass !== null ? _QO_CLASS_NAME[oclass] : null;
            if (heading && how !== PICK_NONE && game.iflags?.menu_head_objsym)
                heading += ' '.repeat(Math.max(0, 7 - heading.length))
                    + `  ('${def_oc_syms_chars[oclass]}')`;
            const glyph = obj_to_glyph(obj); // includes map_glyphinfo(0,0,...)
            items.push({ obj, glyph, heading, selected: false,
                sel: (qflags & USE_INVLET) ? obj.invlet
                    : first && obj.oclass === _COIN_CLASS ? '$' : null,
                gsel: def_oc_syms_chars[MKOBJ_OC_CLASS[obj.otyp]],
                text: await doname_with_price(obj) });
            first = false;
        }
    }
    const fakeHero = { quan: 1 };
    if (engulfer) {
        const glyph = mon_to_glyph(game.youmonst);
        const info = {};
        map_glyphinfo(0, 0, glyph.glyph, 0, info);
        const sym = typeof info.ttychar === 'string' ? info.ttychar.charCodeAt(0) : info.ttychar;
        const cell = symset_cell(sym);
        items.push({ obj: fakeHero, sel: '>', gsel: null, selected: false,
            heading: (qflags & INVORDER_SORT) && n > 1
                ? `${_digests(game.u.ustuck.data) ? 'Swallowed' : 'Engulfed'} Creatures` : null,
            glyph: { ...glyph, ch: cell.ch, decgfx: cell.dec, color: info.gm.sym.color },
            text: an(await self_lookat()) });
    }
    // C tty_end_menu assigns missing selectors after all rows are added.
    let menu_ch = 97, row = (qstr != null ? 2 : 0) + (game.gt?.this_title ? 1 : 0);
    let lastHeading = null, selectorPage = -1;
    for (const it of items) {
        if (it.heading && it.heading !== lastHeading) ++row;
        lastHeading = it.heading;
        const page = Math.trunc(row++ / 23);
        if (page !== selectorPage) { menu_ch = 97; selectorPage = page; }
        if (typeof it.sel === 'number') it.sel = it.sel ? String.fromCharCode(it.sel) : null;
        if (it.sel) continue;
        it.sel = String.fromCharCode(menu_ch);
        menu_ch = menu_ch === 122 ? 65 : menu_ch + 1;
    }
    const cancelled = await _select_menu(items, how,
        { title: qstr, header: game.gt?.this_title });
    if (cancelled) return (qflags & SIGNAL_ESCAPE) ? -2 : [];
    const picked = [];
    for (const it of items.filter((it) => it.selected)) {
        if (it.obj === fakeHero) {
            await You_cant('pick yourself up!');
            continue;
        }
        if (engulfer_minvent && it.obj.owornmask) {
            const cmd = await _cmdModule();
            await You_cant("pick %s up.", await cmd.ysimple_name(it.obj));
            continue;
        }
        picked.push({ obj: it.obj,
            count: it.count === -1 || it.count > it.obj.quan ? it.obj.quan : it.count });
    }
    return picked;
}

/* C pickup.c:1544 delta_cwt().  A carried bag of holding contributes its
 * compressed before/after weight difference rather than the object's raw
 * weight.  Temporarily unlinking the object is exactly C's calculation and
 * preserves the container chain on return. */
function delta_cwt(container, obj) {
    if ((container.otyp | 0) !== BAG_OF_HOLDING)
        return obj.owt | 0;
    const oldWeight = container.owt | 0;
    let newWeight = oldWeight;
    let prev = null, cur = container.cobj;
    while (cur && cur !== obj) { prev = cur; cur = cur.nobj; }
    if (!cur)
        throw new Error('delta_cwt: obj not inside container');
    if (prev) prev.nobj = obj.nobj;
    else container.cobj = obj.nobj;
    try {
        newWeight = weight(container) | 0;
    } finally {
        if (prev) prev.nobj = obj;
        else container.cobj = obj;
    }
    return oldWeight - newWeight;
}

const GOLD_WT = (n) => Math.trunc((Number(n) + 50) / 100);
const GOLD_CAPACITY = (w, n) => (Number(w) * -100) - (Number(n) + 50) - 1;

async function carry_count(obj, container, count, telekinesis) {
    const adjust_wt = !!container && (container.where | 0) === OBJ_INVENT;
    const is_gold = (obj.oclass | 0) === _COIN_CLASS;
    const savequan = obj.quan | 0;
    const saveowt = obj.owt | 0;
    const umoney = money_cnt(game.invent) | 0;
    let iw = max_capacity();

    if (count !== savequan) {
        obj.quan = count;
        obj.owt = weight(obj) | 0;
    }
    let wt = iw + (obj.owt | 0);
    if (adjust_wt)
        wt -= delta_cwt(container, obj);
    if (is_gold)
        wt -= GOLD_WT(umoney) + GOLD_WT(count) - GOLD_WT(umoney + count);
    if (count !== savequan) {
        obj.quan = savequan;
        obj.owt = saveowt;
    }
    const wt_before = iw;
    let wt_after = wt;

    if (wt < 0)
        return { count, wt_before, wt_after };

    /* C pickup.c:1631-1697 — find the largest prefix of a stack that fits.
     * The function emits the 'You can only ...' and 'There ... cannot ...'
     * messages itself, as C does at lines 1679 and 1696, and returns the count
     * and weights. */
    let qq = 0;
    if (is_gold) {
        iw -= GOLD_WT(umoney);
        if (!adjust_wt) {
            qq = GOLD_CAPACITY(iw, umoney);
        } else {
            let oldOw = 0;
            qq = 50 - (umoney % 100) - 1;
            if (qq < 0) qq += 100;
            for (; qq <= count; qq += 100) {
                obj.quan = qq;
                obj.owt = GOLD_WT(qq);
                let ow = GOLD_WT(umoney + qq);
                ow -= delta_cwt(container, obj);
                if (iw + ow >= 0) break;
                oldOw = ow;
            }
            iw -= oldOw;
            qq -= 100;
        }
        qq = Math.max(0, Math.min(qq, count));
        wt = iw + GOLD_WT(umoney + qq);
    } else if (count > 1 || count < savequan) {
        for (qq = 1; qq <= count; qq++) {
            obj.quan = qq;
            obj.owt = weight(obj) | 0;
            let ow = obj.owt | 0;
            if (adjust_wt) ow -= delta_cwt(container, obj);
            if (iw + ow >= 0) break;
            wt = iw + ow;
        }
        --qq;
    }
    obj.quan = savequan;
    obj.owt = saveowt;

    let objName = '', where = '', verb = '';
    if (qq < count) {
        objName = (await doname(obj));
        if (container) {
            where = `in ${the(xname(container))}`;
            verb = 'carry';
        } else {
            where = 'lying here';
            verb = telekinesis ? 'acquire' : 'lift';
        }
    }
    if (qq > 0) {
        if (qq < count)
            await pline(`You can only ${verb} ${qq === 1 ? 'one' : 'some'} of the ${objName} ${where}.`);
        return { count: qq, wt_before, wt_after: wt };
    }
    if (!container) where = 'here';
    const anyInventory = !!game.invent || umoney > 0;
    const prefix1 = anyInventory ? 'you cannot ' : ((obj.quan | 0) === 1 ? 'it ' : 'even one ');
    const prefix2 = anyInventory ? '' : 'is too heavy for you to ';
    const suffix = anyInventory ? ' any more' : '';
    await pline(`There ${otense(obj, 'are')} ${objName} ${where}, but ${prefix1}${prefix2}${verb}${suffix}.`);
    return { count: 0, wt_before, wt_after: wt_after };
}

/* C query.c ynq: use the shared tty prompt, including invalid-key retries
 * and TOPLINE_SPECIAL_PROMPT status painting. */
async function _lift_ynq(query) {
    return await yn_function(query, 'ynq', 'q');
}

const M2_ROCKTHROW = 0x08000000; /* monflag.h:149 */
const throws_rocks = (ptr) => ptr && ((ptr.mflags2 | 0) & M2_ROCKTHROW) !== 0;
const WIN_MESSAGE = 1;
function clear_nhwindow(win) {
    if (win === WIN_MESSAGE) {
        game._pending_message = '';
        game._topl_sticky = null;
    }
}

export async function lift_object(obj, container, cnt, telekinesis) {
    const g = game;
    await _cmdModule();
    if ((obj.otyp | 0) === _BOULDER_OTYP && In_sokoban(g.u?.uz)) {
        await You("cannot get your %s around this %s.", _cmd_mod.body_part(HAND), xname(obj));
        return -1;
    }
    const throwsRocks = throws_rocks(g.youmonst?.data);
    if ((obj.otyp | 0) === _LOADSTONE_OTYP
        || ((obj.otyp | 0) === _BOULDER_OTYP && throwsRocks)) {
        if (inv_cnt_local(false) < _invlet_basic
            || !_cmd_mod.carrying(obj.otyp | 0)
            || await merge_choice_local(g.invent, obj))
            return 1;
        await You("are carrying too much stuff to pick up %s %s.", (obj.quan | 0) === 1 ? 'another' : 'more', xname(obj));
        return -1;
    }

    const cc = await carry_count(obj, container, cnt.v, telekinesis);
    cnt.v = cc.count;

    let result;
    if (cnt.v < 1) {
        result = -1;
    } else if ((obj.oclass | 0) !== _COIN_CLASS
               && inv_cnt_local(false) >= _invlet_basic
               && !(await merge_choice_local(g.invent, obj))) {
        let goldLater = false;
        for (let it = ((obj.where | 0) === OBJ_FLOOR ? obj.nexthere : obj.nobj);
             it; it = ((obj.where | 0) === OBJ_FLOOR ? it.nexthere : it.nobj)) {
            if ((it.otyp | 0) === GOLD_PIECE) { goldLater = true; break; }
        }
        await Your("knapsack cannot accommodate any more items%s.", goldLater ? ' (except gold)' : '');
        result = -1;
    } else {
        result = 1;
        let prev_encumbr = near_capacity();
        // options.c initializes pickup_burden to MOD_ENCUMBER. The port's
        // sparse flags object may omit it; an explicit UNENCUMBERED (0)
        // must still retain its stricter prompting threshold.
        const burden = _pickup_burden_level(g.flags?.pickup_burden);
        if (prev_encumbr < burden)
            prev_encumbr = burden;
        const next_encumbr = calc_capacity(cc.wt_after - cc.wt_before);
        if (next_encumbr > prev_encumbr) {
            if (telekinesis) {
                result = 0; /* don't lift */
            } else {
                /* C ref: pickup.c:1766-1780.  prefix cascade matches
                 * exactly (highest severity first, unconditional
                 * slightloadpfx default — no separate SLT_ENCUMBER check,
                 * same as C's own ternary chain here, unlike
                 * pickup_prinv's post-hoc report below which does check
                 * it). */
                const prefix = (next_encumbr >= EXT_ENCUMBER)
                        ? 'You have extreme difficulty'
                    : (next_encumbr >= HVY_ENCUMBER)
                        ? 'You have much trouble'
                    : (next_encumbr >= MOD_ENCUMBER)
                        ? 'You have trouble'
                    : 'You have a little trouble';
                const savequan = obj.quan;
                obj.quan = cnt.v;
                const qprefix = `${prefix} ${container ? 'removing' : 'lifting'} `;
                const qbuf = await safe_qbuf_shk('', qprefix, '.  Continue?', obj, doname, ansimpleoname, 'something');
                obj.quan = savequan;
                const ans = await _lift_ynq(qbuf);
                if (ans === 'q') result = -1;
                else if (ans === 'n') result = 0;
                /* else 'y' (ynq's default fallthrough) => result stays 1 */
                clear_nhwindow(WIN_MESSAGE);
            }
        }
    }

    if ((obj.otyp | 0) === _SCR_SCARE_MONSTER_OTYP && result <= 0 && !container)
        obj.spe = 0;
    return result;
}

/* inv_cnt/merge_choice live in js/cmd.js (which itself imports FROM this
 * file — doloot, container_at, etc.), so these are resolved lazily to avoid
 * a load-order cycle, matching this file's existing use_container()
 * convention just above. */
let _cmd_mod = null;
async function _cmdModule() {
    if (!_cmd_mod)
        _cmd_mod = await import('./cmd.js');
    return _cmd_mod;
}
/* Synchronous wrappers: inv_cnt_local/merge_choice_local read cmd.js's
 * inv_cnt/merge_choice from inside lift_object (now async, for the
 * over-encumbrance ynq()) and pick_obj/pickup_prinv, all called from
 * pickup_object(), which is already async (pickup() awaits it), but the
 * cmd.js module needs to be resolved before these run.  pickup_object()
 * awaits `_cmdModule()` once up front so these reads are synchronous after
 * that point. */
function inv_cnt_local(inclGold) {
    if (!_cmd_mod)
        throw new Error('internal: _cmdModule() not awaited before'
            + ' inv_cnt_local()');
    return _cmd_mod.inv_cnt(inclGold);
}
function merge_choice_local(objlist, obj) {
    if (!_cmd_mod)
        throw new Error('internal: _cmdModule() not awaited before'
            + ' merge_choice_local()');
    return _cmd_mod.merge_choice(objlist, obj);
}

async function pick_obj(otmp) {
    const g = game;
    const u = g.u || {};
    const fromfloor = (otmp.where | 0) === OBJ_FLOOR;
    const x = { value: 0 }, y = { value: 0 };
    get_obj_location(otmp, x, y, 0); // C pickup.c:1904, including monster inventory.
    const ox = x.value, oy = y.value;

    let robshop = !u.uswallow && otmp !== u.uball && costly_spot(ox, oy);

    obj_extract_self(otmp); // C pickup.c:1907; dispatch through the owning chain.
    if (fromfloor)
        newsym(ox, oy);

    if (robshop) {
        /* C pickup.c:1921-1932 */
        const saveushops = u.ushops;
        const rooms = in_rooms(ox, oy, SHOPBASE);
        const fakeshopRoom = rooms.length ? (rooms[0] | 0) : 0;
        const fakeshop = String.fromCharCode(fakeshopRoom);
        u.ushops = fakeshop;
        await addtobill(otmp, true, false, false);
        u.ushops = saveushops;
        robshop = !!otmp.unpaid
            && !(saveushops && saveushops.indexOf(fakeshop) !== -1);
    }

    const picked = await addinv_core0(otmp, null, true); /* real: == C's addinv(otmp) */

    if (robshop) {
        await remote_burglary(ox, oy);
    }

    return picked;
}

/* C ref: pickup.c:1948-1970 pickup_prinv(obj, count, verb).  FULLY ported:
 * the encumbrance-prefix strings (pickup.c:67-70 overloadpfx/nearloadpfx/
 * moderateloadpfx/slightloadpfx) are plain string literals with no C table
 * behind them, so they are inlined here rather than generated.  Threshold
 * order matches pickup.c:1961-1964 exactly (highest severity checked
 * first); `verb` (unused before) is now consumed the same way C's
 * `Sprintf(pbuf, "%s %s", prefix, verb)` does. */
export async function pickup_prinv(obj, count, verb) {
    const g = game;
    const nearload = near_capacity();
    let prefix = null;
    if (nearload !== (g.pickup_encumbrance | 0)) {
        prefix = (nearload >= EXT_ENCUMBER) ? 'You have extreme difficulty'
            : (nearload >= HVY_ENCUMBER) ? 'You have much trouble'
            : (nearload >= MOD_ENCUMBER) ? 'You have trouble'
            : (nearload >= SLT_ENCUMBER) ? 'You have a little trouble'
            : null;
        g.pickup_encumbrance = nearload;
    }
    const pbuf = prefix ? `${prefix} ${verb}` : '';
    const { prinv } = await _cmdModule();
    await prinv(pbuf, obj, count);
}

/* C ref: pickup.c:1803-1882 pickup_object(obj, count, telekinesis). */
export async function pickup_object(obj, count, telekinesis) {
    const g = game;
    if ((obj.quan | 0) < count) {
        await impossible('pickup_object: count %ld > quan %ld?', count, obj.quan);
        return 0;
    }

    await _cmdModule(); /* resolve once; inv_cnt_local/merge_choice_local/
                            observe_object/prinv all need it below */
    /* C: `if (!Blind) observe_object(obj);` — pickup.c:1817-1818. */
    if (!Blind())
        _cmd_mod.observe_object(obj);

    if (obj === g.u?.uchain)
        return 0;
    if ((obj.where | 0) === OBJ_MINVENT && (obj.owornmask | 0) !== 0) {
        /* C pickup.c:1820-1822 — gear worn by the monster engulfing the
         * hero cannot be removed.  This refusal consumes no turn or RNG. */
        if (engulfing_u(obj.ocarry)) {
            await You_cant("pick %s up.", await _cmd_mod.ysimple_name(obj));
            return 0;
        }
    }
    if (obj.oartifact) {
        const touched = await touch_artifact(obj);
        // C artifact.c:951 leaves the blast on the topline before pickup's
        // later messages (pickup.c:1826,1883); publish the deferred You().
        const blast = g._touch_artifact_blast_msg;
        g._touch_artifact_blast_msg = null;
        if (blast) await pline(blast);
        if (!touched) return 0;
    }
    if ((obj.otyp | 0) === _CORPSE_OTYP) {
        /* C pickup.c:1828-1831.  Remote acquisition is safe from the
         * bare-handed petrification check; direct pickup of a cockatrice or
         * chickatrice corpse is fatal unless gloves/resistance apply. */
        if (await fatal_corpse_mistake(obj, telekinesis)
            || await rider_corpse_revival(obj, telekinesis)) {
            return -1;
        }
    }
    if ((obj.otyp | 0) === _SCR_SCARE_MONSTER_OTYP) {
        /* C pickup.c:1832-1862.  Capacity is computed before changing the
         * scroll's blessed/spe state; an unliftable stack remains untouched. */
        const fitted = await carry_count(obj, null, count || (obj.quan | 0), false);
        count = fitted.count | 0;
        if (count < 1)
            return -1;
        if (count > 0 && count < (obj.quan | 0))
            obj = (await splitobj(obj, count));
        if (obj.blessed) {
            await unbless(obj);
        } else if (!obj.spe && !obj.cursed) {
            obj.spe = 1;
        } else {
            const { trycall, useupf } = await _cmdModule();
            await pline(`The scroll${(obj.quan | 0) === 1 ? '' : 's'} turn${(obj.quan | 0) === 1 ? 's' : ''} to dust as you ${telekinesis ? 'raise' : 'pick'} ${obj.quan === 1 ? 'it' : 'them'} up.`);
            await trycall(obj);
            await useupf(obj, obj.quan | 0);
            return 1;
        }
    }
    const cnt = { v: count };
    const res = await lift_object(obj, null, cnt, telekinesis);
    if (res <= 0)
        return res;

    if ((obj.quan | 0) !== cnt.v && (obj.otyp | 0) !== _LOADSTONE_OTYP)
        obj = (await splitobj(obj, cnt.v));

    const picked = await pick_obj(obj);
    if (g.u?.uwep && g.u.uwep === picked)
        (g.gm || (g.gm = {})).mrg_to_wielded = true; // C pickup.c:1882
    await pickup_prinv(picked, cnt.v, 'lifting');
    if (picked.ghostly)
        await fix_ghostly_obj(picked); // C pickup.c:1884-1885
    if (g.gm) g.gm.mrg_to_wielded = false; // C pickup.c:1886
    return 1;
}

/* C ref: pickup.c:517 allow_all() — query_objlist callback. */
function allow_all(obj) { void obj; return true; }

const _PM_CLERIC_ROLEIDX = 6;
function _is_cleric() {
    return ((game.flags?.initrole ?? -1) | 0) === _PM_CLERIC_ROLEIDX;
}

/* C ref: pickup.c:523-590 allow_category() — query_objlist callback driven by
 * add_valid_menu_class()'s filters and ParanoidAutoAll. */
export function allow_category(obj) {
    const g = game;
    if (!g.gc?.class_filter && !g.gs?.shop_filter && !g.gb?.bucx_filter
        && !g.gp?.picked_filter && !((g.flags?.paranoia_bits | 0) & PARANOID_AUTOALL))
        return false;
    const vmc = g.gv?.valid_menu_classes || '';
    const oc = obj.oclass | 0;
    if (oc === _COIN_CLASS && g.gc?.class_filter)
        return vmc.includes(String.fromCharCode(_COIN_CLASS));
    if (_is_cleric() && !obj.bknown)
        set_bknown(obj, 1);
    if (g.gc?.class_filter && !vmc.includes(String.fromCharCode(oc)))
        return false;
    if (g.gs?.shop_filter && !obj.unpaid
        && !(obj.cobj && count_unpaid(obj.cobj) > 0))
        return false;
    if (g.gb?.bucx_filter) {
        let bucx;
        if (oc === _COIN_CLASS) {
            bucx = g.flags?.goldX ? 'X' : 'U';
        } else {
            bucx = !obj.bknown ? 'X' : obj.blessed ? 'B' : obj.cursed ? 'C' : 'U';
        }
        if (!vmc.includes(bucx))
            return false;
    }
    if (g.gp?.picked_filter && !obj.pickup_prev)
        return false;
    return true;
}


/* C ref: pickup.c:97-117 collect_obj_classes() */
function collect_obj_classes(otmp, here, filter = null) {
    let ilets = '', itemcount = 0;
    while (otmp) {
        const c = def_oc_syms_chars[otmp.oclass | 0];
        if (!ilets.includes(c) && (!filter || filter(otmp))) ilets += c;
        itemcount++;
        otmp = here ? otmp.nexthere : otmp.nobj;
    }
    return { ilets, itemcount };
}

/* C pickup.c:74-95 simple_look(): NHW_MENU putstr window for multiple objects. */
async function simple_look(otmp, here) {
    if (!otmp) await impossible('simple_look(null)');
    else if (!(here ? otmp.nexthere : otmp.nobj))
        await pline('%s', await doname(otmp));
    else {
        const lines = [''];
        for (; otmp; otmp = here ? otmp.nexthere : otmp.nobj)
            lines.push(await doname(otmp));
        await displayLookWindow(lines);
    }
}

/* C ref: win/tty/topl.c tty_yn_function's '#' arm (see js/cmd.js
 * yn_count_tail): returns the count (>0), 0 for "no", -1 for abort. */
async function _yn_count_tail(qbuf) {
    const g = game;
    let text = qbuf + ' #';
    let value = 0n, n_len = 1;
    if (g._yn_lead_digit !== undefined) { /* topl.c:486-489 */
        value = BigInt(g._yn_lead_digit);
        text += String(value); n_len++;
        g._yn_lead_digit = undefined;
    }
    for (;;) {
        g._pending_message = text;
        await flush_screen(1);
        if (g.nhDisplay) topl_park_cursor(g.nhDisplay, text);
        // topl.c:490-521: number edits do not enter message history.
        const savedHist = g._topl_suppress_history;
        g._topl_suppress_history = true;
        let raw;
        try { raw = await nhgetch(); }
        finally { g._topl_suppress_history = savedHist; }
        const key = typeof raw === 'number' ? raw : (raw?.charCodeAt(0) ?? 0);
        if (key >= 48 && key <= 57) {
            /* C integer.h AppendLongDigit: past LONG_MAX -> -1, which
             * topl.c:522 turns into "remove the number, ask again". */
            const nv = value * 10n + BigInt(key - 48);
            if (nv > 9223372036854775807n) { value = -1n; break; }
            value = nv;
            text += String.fromCharCode(key); n_len++;
        } else if (key === 121 || key === 32 || key === 13 || key === 10) {
            break;
        } else if (key === 27) {
            value = -1n;
            break;
        } else if (key === 8 || key === 127) {
            if (n_len <= 1) { value = -1n; break; }
            value = value / 10n;
            text = text.slice(0, -1); n_len--;
        } else {
            value = -1n;
            break;
        }
    }
    if (value >= 0n) { // topl.c:533-539 clean_up records the completed answer.
        putmsghistory(qbuf + ' ' + (value > 0n ? '#' + value : 'n'));
        g._toplEmptyAfterSuppress = false;
    }
    return Number(value);
}

/* C ref: pickup.c:141-262 query_classes().  Returns
 * { ok, oclasses, one_at_a_time, everything, via_menu }. */
export async function query_classes(action, objs, here, menu_on_demand) {
    const r = { ok: true, oclasses: [], one_at_a_time: false,
                everything: false, via_menu: 0 };
    let { ilets, itemcount } = collect_obj_classes(objs, here);
    if (ilets.length === 0) { r.ok = false; return r; }
    if (ilets.length === 1) {
        r.oclasses = [def_char_to_objclass(ilets.charCodeAt(0))];
    } else {
        ilets += ' aA' + (objs === game.invent ? 'i' : ':');
    }
    if (itemcount && menu_on_demand) ilets += 'm';
    if (count_unpaid(objs)) ilets += 'u';
    const t = tally_BUCX(objs, here);
    if (t.b) ilets += 'B';
    if (t.u) ilets += 'U';
    if (t.c) ilets += 'C';
    if (t.x) ilets += 'X';
    if (t.j) ilets += 'P';

    if (ilets.length > 1) {
        let where = null, m_seen = false;
        for (;;) { /* ask_again */
            r.oclasses = [];
            r.one_at_a_time = r.everything = false;
            let not_everything = false, filtered = false;
            let again = false;
            const inbuf = await getlin(`What kinds of thing do you want to ${action}? [${ilets}]`);
            if (inbuf && inbuf[0] === '\x1b' /* '\033' */) { r.ok = false; return r; }
            for (const sym of (inbuf || '')) {
                if (sym === ' ') continue;
                else if (sym === 'A') r.one_at_a_time = true;
                else if (sym === 'a') r.everything = true;
                else if (sym === ':') {
                    await simple_look(objs, here);
                    if (objs.where === OBJ_CONTAINED && objs.ocontainer)
                        objs.ocontainer.cknown = 1;
                    again = true;
                    break;
                } else if (sym === 'i') {
                    const { display_inventory } = await _cmdModule();
                    await display_inventory(null, true);
                    /* the next pline's flush_screen()->bot() repaints status (pline.c:274) */
                    game._status_blanked = false;
                    again = true;
                    break;
                } else if (sym === 'm') m_seen = true;
                else if ('uBUCXP'.includes(sym)) {
                    add_valid_menu_class(sym.charCodeAt(0));
                    filtered = true;
                } else {
                    const oc_of_sym = def_char_to_objclass(sym.charCodeAt(0));
                    if (ilets.includes(sym)) {
                        add_valid_menu_class(oc_of_sym);
                        r.oclasses.push(oc_of_sym);
                    } else {
                        if (where === null)
                            where = action === 'pick up' ? 'here'
                                  : action === 'take out' ? 'inside' : '';
                        if (where)
                            await pline('There are no %s\'s %s.', sym, where);
                        else
                            await pline('You have no %s\'s.', sym);
                        not_everything = true;
                    }
                }
            }
            if (again) continue;
            if (m_seen && menu_on_demand) {
                r.via_menu = ((r.everything || !r.oclasses.length) && !filtered)
                             ? -2 : -3;
                r.ok = false;
                return r;
            }
            if (!r.oclasses.length && (!r.everything || not_everything)) {
                r.one_at_a_time = true;
                r.everything = false;
            }
            break;
        }
    }
    return r;
}

/* C ref: pickup.c:787-902 — pickup()'s "old style interface" (menustyle
 * traditional/combination).  Returns { pickupdone } for C's `goto
 * pickupdone`, { pick_list } for `goto menu_pickup`, else the tallies. */
async function _pickup_old_style(objchain, traverse_how, count) {
    const g = game;
    let oclasses = [];
    let all_of_a_type = true, selective = false;
    let n_tried = 0, n_picked = 0;
    let ct = 0;
    for (let obj = objchain; obj; obj = _follow(obj, traverse_how)) ct++;

    if (ct === 1 && count) {
        const obj = objchain;
        const lcount = Math.min(obj.quan | 0, count);
        n_tried++;
        reset_justpicked(g.invent);
        if ((await pickup_object(obj, lcount, false)) > 0)
            n_picked++;
        return { n_tried, n_picked };
    } else if (ct >= 2) {
        await pline('There are %s objects here.', (ct <= 10) ? 'several' : 'many');
        const q = await query_classes('pick up', objchain,
                                      !!(traverse_how & BY_NEXTHERE), true);
        selective = q.one_at_a_time;
        all_of_a_type = q.everything;
        oclasses = q.oclasses;
        if (!q.ok) {
            if (!q.via_menu)
                return { pickupdone: true, n_tried: 0, n_picked: 0 };
            if (selective)
                traverse_how |= INVORDER_SORT;
            const pick_list = await query_objlist('Pick up what?', objchain,
                traverse_how, PICK_ANY,
                (q.via_menu === -2) ? allow_all : allow_category);
            return { pick_list };
        }
    }
    const bycat = menu_class_present(66) || menu_class_present(85)
                  || menu_class_present(67) || menu_class_present(88);
    let obj2;
    for (let obj = objchain; obj; obj = obj2) {
        obj2 = _follow(obj, traverse_how);
        if (bycat ? !allow_category(obj)
                  : (!selective && oclasses.length
                     && !oclasses.includes(obj.oclass | 0)))
            continue;
        let lcount = -1;
        if (!all_of_a_type) {
            const base = await safe_qbuf_shk('', 'Pick up ', '?', obj, doname,
                                             ansimpleoname, 'something');
            const rs = ((obj.quan | 0) < 2) ? 'ynaq' : 'yn#aq';
            /* C hack.h:1331,1334 ynaq()/ynNaq(): record the answer for repeat. */
            let sym, yn_number;
            /* topl.c:526-531: an aborted count removes the number and
             * tty_yn_function asks the same question again. */
            do {
                yn_number = 0;
                sym = await yn_function(base, rs, 'y', true);
                if (sym === '#')
                    yn_number = await _yn_count_tail(`${base} [${rs}] (y)`);
            } while (yn_number < 0);
            /* topl.c:533-550 clean_up leaves the prompt on row 0 even for
             * 'q', until parse()'s clear_nhwindow; nhgetch dropped it. */
            if (base.length + rs.length + 8 <= 79)
                g._topl_sticky = `${base} [${rs}] (y)`;
            if (sym === 'q' || sym === '\x1b') return { n_tried, n_picked };
            if (sym === 'n') continue;
            if (sym === 'a') {
                all_of_a_type = true;
                if (selective) {
                    selective = false;
                    oclasses = [obj.oclass | 0];
                }
            } else if (sym === '#') {
                if (!yn_number) continue;
                lcount = Math.min(yn_number, obj.quan | 0);
            }
        }
        if (lcount === -1) lcount = obj.quan | 0;
        if (!n_tried)
            reset_justpicked(g.invent);
        n_tried++;
        const res = await pickup_object(obj, lcount, false);
        if (res < 0) break;
        n_picked += res;
    }
    return { n_tried, n_picked };
}

/* ---------------------------------------------------------------------------
 * C ref: pickup.c:671-786 pickup(int what).
 * "Have the hero pick things from the ground or a monster's inventory if
 * swallowed."  what: >0 autopickup, =0 interactive, <0 pick N of something.
 * Returns 1 if tried to pick something up (whether or not it succeeded).
 * ------------------------------------------------------------------------ */
export async function pickup(what) {
    const g = game;
    const u = g.u;
    const autopickup = what > 0;

    if (autopickup && (g.multi | 0) < 0 && unconscious()) {
        g.iflags = g.iflags || {};
        g.iflags.prev_decor = STONE;
        return 0;
    }

    g.pickup_encumbrance = 0;

    const count = (what < 0) ? -what : 0;

    if (!u.uswallow) {
        const ux = u.ux | 0, uy = u.uy | 0;

        if (autopickup && (g.context?.nopick || !_OBJ_AT(ux, uy)
                           || (is_pool(ux, uy) && !_Underwater())
                           || _is_lava(ux, uy))) {
            if (g.flags?.mention_decor)
                await describe_decor();
            await read_engr_at(ux, uy);
            return 0;
        }

        const t = t_at(ux, uy);
        if (!can_reach_floor(!!(t && is_pit(t.ttyp | 0)))) {
            await describe_decor(); /* pickup.c:713 calls this
                                        unconditionally on this branch */
            if (((g.multi | 0) && !g.context?.run)
                || (autopickup && !g.flags?.pickup)
                || (t && (uteetering_at_seen_pit(t) || uescaped_shaft(t)))) {
                await read_engr_at(ux, uy);
            }
            return 0;
        }

        if (((g.multi | 0) && !g.context?.run)
            || (autopickup && !g.flags?.pickup)
            || notake(g.youmonst?.data)) {
            await check_here(false);
            if (notake(g.youmonst?.data) && _OBJ_AT(ux, uy)
                && (autopickup || g.flags?.pickup)) {
                await pline('You are physically incapable of picking'
                    + ' anything up.');
            }
            return 0;
        }

        if (_OBJ_AT(ux, uy) && g.context?.run && (g.context.run | 0) !== 8
            && !g.context?.nopick) {
            nomul(0);
        }
    }

    add_valid_menu_class(0);

    let objchain, traverse_how;
    if (!u.uswallow) {
        objchain = g.level?.levelObjects?.[u.ux | 0]?.[u.uy | 0] ?? null;
        traverse_how = BY_NEXTHERE;
    } else {
        objchain = u.ustuck?.minvent ?? null;
        traverse_how = 0;
    }

    let pick_list = [];
    let old_style = false, old_tried = 0, old_picked = 0;
    if (autopickup) {
        pick_list = await autopick(objchain, traverse_how);
    } else if ((g.flags?.menu_style ?? MENU_FULL) === MENU_TRADITIONAL
               && !g.iflags?.menu_requested) {
        /* C pickup.c:787-902 — old style interface. */
        const r = await _pickup_old_style(objchain, traverse_how, count);
        if (r.pickupdone) {
            g.pickup_encumbrance = 0;
            add_valid_menu_class(0);
            return (r.n_tried > 0) ? 1 : 0;
        }
        if (r.pick_list) {
            pick_list = r.pick_list;
        } else {
            old_tried = r.n_tried;
            old_picked = r.n_picked;
            old_style = true;
        }
    } else {
        traverse_how |= AUTOSELECT_SINGLE
                        | (g.flags?.sortpack ? INVORDER_SORT : 0);
        if (count) {
            pick_list = await query_objlist(`Pick ${count} of what?`, objchain,
                traverse_how, PICK_ONE, (o) => n_or_more(o, count));
            for (const p of pick_list) p.count = count;
        } else {
            pick_list = await query_objlist('Pick up what?', objchain,
                traverse_how | FEEL_COCKATRICE, PICK_ANY, all_but_uchain);
        }
    }

    let n_tried = pick_list.length;
    let n_picked = 0;
    if (old_style) {
        n_tried = old_tried;
        n_picked = old_picked;
    } else {
        if (n_tried > 0)
            reset_justpicked(g.invent);
        for (let i = 0; i < n_tried; i++) {
            const res = await pickup_object(pick_list[i].obj, pick_list[i].count,
                                            false);
            if (res < 0) break;
            n_picked += res;
        }
    }

    if (!u.uswallow) {
        if (_hides_under(g.youmonst?.data)) {
            const { hideunder } = await import('./mklev.js');
            hideunder(g.youmonst);
        }
        if (n_picked)
            newsym_force(u.ux | 0, u.uy | 0);
        if (autopickup)
            await check_here(n_picked > 0);
    }

    g.pickup_encumbrance = 0;
    add_valid_menu_class(0);
    return (n_tried > 0) ? 1 : 0;
}





/* C pickup.c:2781-2799 removed_from_icebox().  Frozen object ages are stored
 * relative to the turn at which they entered the ice box.  On removal they
 * become absolute again and their ordinary lifecycle timer resumes. */
export function removed_from_icebox(obj) {
    if (!age_is_relative(obj)) {
        obj.age = (game.moves | 0) - (obj.age | 0);
        if ((obj.otyp | 0) === CORPSE) {
            const traits = get_mtraits(obj, false);
            const iceTroll = traits ? traits.data.pmidx === PM_ICE_TROLL
                : (obj.corpsenm | 0) === PM_ICE_TROLL;
            obj.norevive = iceTroll ? 0 : 1;
            start_corpse_timeout(obj);
        } else if (obj.globby) {
            start_glob_timeout(obj, 0);
        }
    }
}

const LOADSTONE = 471; /* objects.h LOADSTONE (pickup.c:2751) */

/* C pickup.c:2826 observe_quantum_cat.  Keep observation separate from opening:
 * disclosure resolves the same draw with both creation and messages disabled. */
export async function observe_quantum_cat(box, makecat, givemsg) {
    const name = "Schroedinger's Cat";
    const alive = !rn2(2);
    const x = { value: 0 }, y = { value: 0 };
    if (get_obj_location(box, x, y, 0)) {
        box.ox = x.value;
        box.oy = y.value;
    }
    const deadcat = box.cobj;
    if (alive) {
        const livecat = makecat
            ? await makemon(permonstTemplate(PM_HOUSECAT), box.ox, box.oy,
                            NO_MINVENT | MM_ADJACENTOK | MM_NOMSG)
            : null;
        if (livecat) {
            livecat.mpeaceful = 1;
            set_malign(livecat);
            if (givemsg) {
                if (!canspotmon(livecat))
                    await pline(`You think something brushed your ${body_part(FOOT)}.`);
                else
                    await pline(`${_Upstart(mon_nam(livecat))} inside the box is still alive!`);
            }
            christen_monst(livecat, name);
            if (deadcat) {
                obj_extract_self_general(deadcat);
                await obfree(deadcat, null);
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
            const props = game.u?.uprops;
            const hallucinating = !!props?.[HALLUC]?.intrinsic
                && !(props?.[HALLUC_RES]?.intrinsic || props?.[HALLUC_RES]?.extrinsic);
            await pline(`The ${hallucinating ? rndmonnam() : 'housecat'} inside the box is dead!`);
        }
        if (deadcat) {
            deadcat.age = game.moves;
            set_corpsenm(deadcat, PM_HOUSECAT);
            await oname(deadcat, name, ONAME_NO_FLAGS);
            if (!game.context?.mon_moving) {
                more_experienced(20, 10);
                await newexplevel();
            }
        }
    }
}

/* C pickup.c:2720 ck_bag(struct obj *obj) */
export function ck_bag(obj) {
    return !!(game.current_container && obj !== game.current_container);
}

/* C pickup.c:2957 stash_ok(), the getobj classifier for use_container's
 * single-item stash action.  The active container remains selectable by an
 * explicitly typed inventory letter so in_container() can give its specific
 * "That would be an interesting topological exercise" refusal. */
export function stash_ok(obj) {
    if (!obj)
        return GETOBJ_EXCLUDE;
    /* C pickup.c:2963 downplay the container being stashed into */
    if (!ck_bag(obj))
        return GETOBJ_EXCLUDE_SELECTABLE;
    return GETOBJ_SUGGEST;
}

const WAN_CANCELLATION_OTYP = 423;

/* C pickup.c:2488 mbag_explodes(). */
export function mbag_explodes(obj, depthin) {
    const typ = obj?.otyp | 0;
    if ((typ === WAN_CANCELLATION_OTYP || typ === BAG_OF_TRICKS_OTYP)
        && (obj.spe | 0) <= 0)
        return false;
    if ((Is_mbag(obj) || typ === WAN_CANCELLATION_OTYP)
        && rn2(1 << Math.min(depthin | 0, 7)) <= (depthin | 0))
        return true;
    else if (Has_contents(obj)) {
        for (let it = obj.cobj; it; it = it.nobj)
            if (mbag_explodes(it, (depthin | 0) + 1))
                return true;
    }
    return false;
}

/* C pickup.c:2510 is_boh_item_gone() */
export function is_boh_item_gone() {
    return !rn2(13);
}

export async function mbag_item_gone(held, item, silent) {
    if (!silent) {
        if (item.dknown)
            await pline(`${_Upstart((await doname(item)))} ${otense(item, 'have')} vanished!`);
        else
            await pline(`You ${Blind() ? 'notice' : 'see'} ${(await doname(item))} disappear!`);
    }
    let loss = 0;
    const shop = game.u?.ushops;
    const shkp = shop ? shop_keeper(shop.charCodeAt?.(0) || shop[0]) : null;
    if (shkp && (held ? !!item.unpaid : costly_spot(game.u.ux, game.u.uy)))
        loss = await stolen_value(item, game.u.ux, game.u.uy,
                                  !!shkp.mpeaceful, true);
    await obfree(item, null);
    return loss | 0;
}

/* C pickup.c:2515-2533 do_boh_explosion() */
export async function do_boh_explosion(boh, onFloor) {
    boh.in_use = 1;
    for (let it = boh.cobj; it;) {
        const next = it.nobj;
        if (is_boh_item_gone()) {
            obj_extract_self(it);
            await mbag_item_gone(!onFloor, it, true);
        } else {
            it.ox = game.u.ux | 0;
            it.oy = game.u.uy | 0;
            await scatter(it.ox, it.oy, 4, MAY_HIT | MAY_DESTROY, it);
        }
        it = next;
    }
}

/* C pickup.c:2540-2552 boh_loss() */
export async function boh_loss(container, held) {
    if (Is_mbag(container) && container.cursed && Has_contents(container)) {
        let loss = 0;
        for (let it = container.cobj; it;) {
            const next = it.nobj;
            if (is_boh_item_gone()) {
                obj_extract_self(it);
                loss += await mbag_item_gone(held, it, false);
            }
            it = next;
        }
        return loss;
    }
    return 0;
}

/* ---------------------------------------------------------------------------
 * obj_extract_self — C ref: mkobj.c obj_extract_self / extract_nobj.
 * Remove obj from whichever chain it lives on.  For a contained item that is
 * box->cobj (linked by nobj); unlink it and clear obj->where to OBJ_FREE. */
function _extract_from_container(box, obj) {
    if (box.cobj === obj) {
        box.cobj = obj.nobj ?? null;
    } else {
        let p = box.cobj;
        while (p && p.nobj !== obj) p = p.nobj;
        if (p) p.nobj = obj.nobj ?? null;
    }
    obj.nobj = null;
    obj.ocontainer = null;
    obj.where = OBJ_FREE;
}

/* ---------------------------------------------------------------------------
 * out_container — C ref: pickup.c:2726.  Take obj out of current_container and
 * add to the hero's inventory after touch and capacity checks. Returns -1
 * to stop looting, 0 when declined, and 1 when an item was removed.
 */
export async function out_container(box, obj) {
    const isGold = (obj.oclass | 0) === COIN_CLASS;
    if (isGold) obj.owt = weight(obj);
    if (obj.oartifact) {
        const touched = await touch_artifact_youmonst(obj);
        const blast = game._touch_artifact_blast_msg;
        game._touch_artifact_blast_msg = null;
        if (blast) await pline(blast);
        /* touch_artifact (artifact.c:966) already printed the "evades your
         * grasp!" line; C's out_container (pickup.c:2726) adds nothing. */
        if (!touched) return 0;
    }
    if (await fatal_corpse_mistake(obj, false)) return -1;
    const cnt = { v: obj.quan };
    const result = await lift_object(obj, box, cnt, false);
    if (result <= 0) return result;
    const count = cnt.v;
    if (obj.quan !== count && obj.otyp !== LOADSTONE)
        obj = (await splitobj(obj, count));
    _extract_from_container(box, obj);
    box.owt = weight(box);
    if ((box.otyp | 0) === ICE_BOX_OTYP) removed_from_icebox(obj);
    if (!obj.unpaid && !_carried_box(box) && costly_spot(box.ox, box.oy)) {
        obj.ox = box.ox;
        obj.oy = box.oy;
        await addtobill(obj, false, false, false);
    }
    if (is_pick(obj))
        await pick_pick(obj);
    const otmp = await addinv(obj);
    await pickup_prinv(otmp, count, 'removing');
    if (isGold) await bot();
    return 1;
}

export async function in_or_out_menu(promptText, box, outokay, inokay, alreadyused, more_containers) {
    const g = game;
    /* tty display_nhwindow pages an occupied message window before painting a
     * menu over it.  This is observable after ':' reports an empty container. */
    if (g._pending_message)
        await force_more(g._pending_message);
    const boxname = thesimpleoname(box); /* C pickup.c:3420,3448 */
    /* Menu lines mirror C in_or_out_menu add_menu order: ':', then (outokay) 'o',
     * (inokay) 'i', (outokay) 'b', (inokay) 'r'+'s', blank, (more) 'n', 'q'. */
    const lines = [];
    /* tty_end_menu adds the prompt in iflags.menu_headings' style (wintty.c:2680-2689). */
    /* wintty.c:2722-2726 cuts any line longer than cols - 2 = 78 characters. */
    lines.push(menu_heading_text(promptText.slice(0, 78)));
    lines.push('');
    const LOOTCHARS = '_:oibrsnq';
    const ABC_CHARS = '_:abcdenq';
    const sel = (g.flags && g.flags.lootabc) ? ABC_CHARS : LOOTCHARS;
    /* {disp, canon} in display order — `disp` is the key C paints and accepts,
     * `canon` is what in_or_out_menu hands back to menu_loot. */
    const items = [];
    const additem = (idx, text, selected = false, attr = ATR_NONE, itemflags = MENU_ITEMFLAGS_NONE) => {
        lines.push(`${sel[idx]} ${selected ? '*' : '-'} ${menucolor_text(text)}`); /* windows.c:1803 add_menu */
        items.push({ disp: sel[idx], canon: LOOTCHARS[idx] });
    };
    additem(1, `Look inside ${boxname}`, false, ATR_NONE, MENU_ITEMFLAGS_NONE);
    /* C pickup.c:3423-3428: if (outokay) add_menu(..., ATR_NONE, clr, buf, MENU_ITEMFLAGS_NONE) */
    if (outokay) additem(2, 'take something out', false, ATR_NONE, MENU_ITEMFLAGS_NONE);
    if (inokay)  additem(3, 'put something in', false, ATR_NONE, MENU_ITEMFLAGS_NONE);
    if (outokay) additem(4, `${inokay ? 'both; ' : ''}take out, then put in`, false, ATR_NONE, MENU_ITEMFLAGS_NONE);
    if (inokay) {
        additem(5, `${outokay ? 'both reversed; ' : ''}put in, then take out`, false, ATR_NONE, MENU_ITEMFLAGS_NONE);
        additem(6, `stash one item into ${boxname}`, false, ATR_NONE, MENU_ITEMFLAGS_NONE);
    }
    lines.push('');
    /* C pickup.c:3453-3457 preselects 'n' when another container remains. */
    if (more_containers) additem(7, 'loot next container', true);
    /* 'q' default-selected when no next container: shown with '*'. */
    const qDefault = !more_containers;
    lines.push(`${sel[8]} ${qDefault ? '*' : '-'} ${menucolor_text(alreadyused ? 'done' : 'do nothing')}`);
    items.push({ disp: sel[8], canon: LOOTCHARS[8] });
    lines.push('(end)');

    const maxLen = lines.reduce((m, ln) => {
        const vis = ln.replace(/\x1b\[[0-9;]*m/g, '');
        return Math.max(m, vis.length);
    }, 0);
    /* tty window origin is capped at column 41 even for a narrow menu. */
    const WIN_COL = Math.min(41, 80 - maxLen - 2);
    const uac = g.u?.uac ?? 0;
    /* C tty_dismiss_nhwindow -> docorner(cw->offx, cw->maxrow + 1, 0)
     * (wintty.c:3684-3687): a getobj menu dismissed just before this one wiped
     * status rows from its offx-1 rightward when it was tall enough to reach
     * them, and nothing repaints them under this shorter window.  Same rule as
     * itemactions (js/cmd.js). */
    const prior = g._getobj_menu_win;
    g._getobj_menu_win = null;
    let statusClip;
    /* wintty.c:971-982: offx 0 uses docrt(), not docorner's status clip. */
    if (prior && prior.WIN_COL > 0 && prior.moves === g.moves
        && prior.winRows >= (_threeStatusLines() ? 21 : 22))
        statusClip = Math.max(0, prior.WIN_COL - 2);
    /* The wiped corner stays wiped under the menus that follow (nothing
     * repaints status until the next bot()), e.g. the category menu. */
    /* A ':' look-inside re-enters this menu after the contents window; that
     * window repainted no status, so the earlier wipe is still in place. */
    const prevCarry = g._carryStatusClip;
    if (statusClip === undefined && prevCarry && prevCarry.moves === g.moves)
        statusClip = prevCarry.clip;
    /* The carried wipe keeps the dismissed window's docorner() ymax: rows
     * below maxrow + 1 (the status row 23 under a 22-row window) survive. */
    g._carryStatusClip = statusClip !== undefined
        ? { clip: statusClip, moves: g.moves,
            maxRow: prior && statusClip === Math.max(0, prior.WIN_COL - 2)
                ? prior.winRows : (prevCarry?.maxRow ?? 23) } : null;
    /* C wintty.c:1925-1928 — `!iflags.menu_overlay` drops the menu to offx 0 and
     * term_clear_screen()s, so the map and status are gone and every row is
     * drawn from column 1. */
    /* wintty.c:1907-1918 (H2344_BROKEN, defined at wintty.c:13): offx =
     * min(40, cols - maxcol - 1), clamped at 0; an offx of 0 (a line of 77+
     * columns) clears the screen in process_menu_window (wintty.c:1407). */
    const fullScreen = g.iflags?.menu_overlay === false || g.iflags?.menu_overlay === 0
        || 77 - maxLen <= 0;
    /* C wintty.c:1939-1941 -> 1047-1058: an overlay clears a non-EMPTY
     * message window, including an answered yn prompt (topl.c:544).
     * EMPTY-window residue survives; a full-screen menu erases it too. */
    if (fullScreen || g._topl_sticky !== g._topl_empty_sticky)
        g._topl_sticky = null;
    if (fullScreen) g._topl_empty_sticky = null;
    const paint = () => (fullScreen
        ? lines.map((ln) => (ln === '' ? '' : ' ' + ln)).join('\n')
        /* wintty.c:3684-3687: use this getobj window's offx and ymax.
         * The -1 clip sentinel instead reads the unrelated pickinv window.
         * Only rows through maxrow were erased; lower status rows survive. */
        : build_window_screen(lines, WIN_COL, uac, statusClip,
                              undefined, false, 0, true, prior?.winRows ?? 23));
    let screenOutput = paint();
    let anySelected = qDefault || more_containers;
    const endRow = lines.length - 1;
    const endCursorCol = (fullScreen ? 1 : WIN_COL) + 5 + 1; /* col + len('(end)') + 1 */

    const BYKEY = new Map(items.map((it) => [it.disp.charCodeAt(0), it.canon]));
    const cancelDefault = qDefault ? 'q' : 'n';
    let chosen = cancelDefault;
    let pendingCount = 0n;
    while (true) {
        g._screen_output = screenOutput;
        set_cursor(endCursorCol, endRow);
        const k = await nhgetch();
        // C getline.c:230-257: rejected input preserves an unfinished count.
        if (!BYKEY.has(k)
            && !(' 0123456789\x00\x1b\n\r' + DEFAULT_MENU_CMDS).includes(String.fromCharCode(k)))
            continue;
        // C wintty.c:1566-1616: ESC first cancels a pending count.
        if (k >= 48 && k <= 57) {
            pendingCount = pendingCount * 10n + BigInt(k - 48);
            if (pendingCount > 0x7fffffffffffffffn) pendingCount = 0n;
            continue;
        }
        if (k === 27) g._ttyDismissMore = 1; /* getline.c:245-247 */
        if (k === 27 && pendingCount) { pendingCount = 0n; continue; }
        pendingCount = 0n;
        if (k === 27 /* ESC */) { chosen = 'q'; break; }
        /* C wintty.c:1654-1657, 1679-1692 MENU_UNSELECT_PAGE / _ALL ('\\', '-')
         * work in PICK_ONE too: the pre-marked entry is deselected and
         * repainted '-' (set_item_state), so a later RETURN/SPACE commits
         * nothing (n == 0). */
        if (k === 92 || k === 45) {
            if (anySelected) {
                for (let i = 0; i < lines.length; i++)
                    lines[i] = lines[i].replace(/^(\S) \* /, '$1 - ');
                screenOutput = paint();
                anySelected = false;
            }
            continue;
        }
        /* pickup.c:3476: n == 0 -> (more_containers ? 'n' : 'q'). */
        const commit = anySelected ? cancelDefault : (more_containers ? 'n' : 'q');
        if (k === 32 /* SPACE */) { chosen = commit; break; }
        /* NUL/RETURN/ENTER commits the default (the SELECTED entry: 'q' or 'n'). */
        if (k === 0 || k === 10 || k === 13) { chosen = commit; break; }
        if (BYKEY.has(k)) { chosen = BYKEY.get(k); break; }
        /* C tty: any other non-accelerator key is ignored; menu stays up. */
    }
    g._pending_message = '';
    /* No flush_screen() here: in_or_out_menu (pickup.c:3430-3476) returns straight
     * to the caller, and gbuf cells changed since the last flush (hallucinatory
     * see_monsters redraw) stay unprinted under the next window. */
    /* The status rows this menu's predecessor wiped stay wiped (nothing runs
     * bot() under select_menu's bot_disabled), so the getobj menu opened next
     * (stash) clips them from the same offx. */
    if (statusClip !== undefined) g._getobj_menu_win = prior;
    /* wintty.c:978-979: a full-screen (offx 0) dismiss is docrt(); its cls()
     * blanks the status rows until the next bot(). */
    if (fullScreen) {
        const savedBotDisabled = g._bot_disabled;
        g._bot_disabled = true; /* windows.c:1861 */
        await docrt();
        status_r1_menu_docrt();
        g._statusBlankAfterDocrt = true;
        await flush_screen(1);
        g._bot_disabled = savedBotDisabled;
    }
    return chosen;
}

// C pickup.c:2903: an exploding bag has already freed the selected object.
export function container_gone(fn) {
    return (fn === in_container || fn === out_container) && !game.current_container;
}

export async function in_container(obj) {
    const g = game;
    const box = g.current_container;
    if (!box) {
        await impossible('<in> no gc.current_container?');
        return 0;
    }
    const u = g.u;
    const floorContainer = !_carried_box(box);
    let wasUnpaid = false;
    /* C:2566-2569 uball/uchain, C:2570-2572 the container itself. */
    if (obj === u.uball || obj === u.uchain) {
        await pline('You must be kidding.');
        return 0;
    }
    if (obj === box) {
        await pline('That would be an interesting topological exercise.');
        return 0;
    }
    /* C:2573-2577 — W_ARMOR | W_ACCESSORY. */
    if ((obj.owornmask | 0) & (W_ARMOR | W_ACCESSORY)) {
        await Norep(`You cannot ${(box.otyp | 0) === ICE_BOX_OTYP ? 'refrigerate' : 'stash'} something you are wearing.`);
        return 0;
    }
    if ((obj.otyp | 0) === LOADSTONE && obj.cursed) {
        set_bknown(obj, 1);
        await pline(`The stone${obj.quan === 1 ? '' : 's'} won't leave your person.`);
        return 0;
    }
    // AMULET_OF_YENDOR, CANDELABRUM_OF_INVOCATION, BELL_OF_OPENING, BOOK_OF_THE_DEAD.
    if ([213, 262, 263, 409].includes(obj.otyp | 0)) {
        await pline('%s cannot be confined in such trappings.', The(xname(obj)));
        return 0;
    }
    if ((obj.otyp | 0) === 236 /* LEASH */ && obj.leashmon) {
        await pline('%s attached to your pet.', Tobjnam(obj, 'are'));
        return 0;
    }
    if (obj === u.uwep && welded(obj)) {
        await weldmsg(obj);
        return 0;
    }
    /* C pickup.c:2599-2610 clears weapon slots before freeinv(), so doname()
     * in the insertion message no longer describes the object as wielded. */
    if (obj === u.uwep) {
        await setuwep(null);
        if (u.uwep) return 0;
    }
    else if (obj === u.uswapwep) await setuswapwep(null);
    else if (obj === u.uquiver) await setuqwep(null);
    if (await fatal_corpse_mistake(obj, false)) return -1;
    /* C:2617-2622 — boxes, boulders and big statues do not fit. */
    const type = obj.otyp | 0;
    if (type === ICE_BOX_OTYP || type === 214 /* LARGE_BOX */
        || type === 215 /* CHEST */ || type === 475 /* BOULDER */
        || (type === 476 /* STATUE */
            && (permonstTemplate(obj.corpsenm)?.msize ?? 0) >= 3 /* MZ_LARGE */)) {
        await pline(`You cannot fit ${the(xname(obj))} into ${the(xname(box))}.`);
        return 0;
    }

    freeinv(obj);                                             /* C:2624 */
    if (obj_is_burning(obj)) await snuff_lit(obj);
    /* The '$:' shadow-chain deduction that used to be spelled out here now
     * lives in js/cmd.js freeinv_core()'s COIN_CLASS arm — C's own SET_BOTL
     * site, and the one door every object leaves gi.invent through.  freeinv()
     * on the line above already ran it; repeating it would deduct twice. */

    if (floorContainer && costly_spot(u.ux, u.uy)
        && (obj.oclass | 0) !== COIN_CLASS) {
        wasUnpaid = !!obj.unpaid;
        if (g.gs.sellobj_first) {
            sellobj_state(box.no_charge ? SELL_DONTSELL : SELL_DELIBERATE);
            g.gs.sellobj_first = false;
        }
        await sellobj(obj, u.ux, u.uy);
    }

    /* C pickup.c:2644-2657: freeze absolute ages and suspend corpse/glob
     * timers. Fuel-bearing objects already use relative age and skip this. */
    if ((box.otyp | 0) === ICE_BOX_OTYP && !age_is_relative(obj)) {
        obj.age = (g.moves | 0) - (obj.age | 0);
        if ((obj.otyp | 0) === 265 /* CORPSE */) {
            if (obj.timed) {
                stop_timer(ROT_CORPSE, { a_obj: obj, a_long: null });
                stop_timer(REVIVE_MON, { a_obj: obj, a_long: null });
            }
            if (obj.corpsenm === PM_ICE_TROLL && obj.oextra?.omonst)
                obj.oextra.omonst.mcan = 0;
        } else if (obj.globby && obj.timed) {
            stop_timer(SHRINK_GLOB, { a_obj: obj, a_long: null });
        }
    } else if (Is_mbag(box) && mbag_explodes(obj, 0)) {
        livelog_printf(LL_ACHIEVE, 'just blew up %s bag of holding', g.flags?.female ? 'her' : 'his');
        await urgent_pline(`As you put ${(await doname(obj))} inside, you are blasted by a magical explosion!`);
        if (wasUnpaid)
            await addtobill(obj, false, false, true);
        if ((obj.otyp | 0) === BAG_OF_HOLDING_OTYP)
            await do_boh_explosion(obj, (obj.where | 0) === OBJ_FLOOR);
        await obfree(obj, null);
        if (floorContainer && costly_spot(box.ox, box.oy)) {
            const noCharge = box.no_charge;
            await addtobill(box, false, false, false);
            box.no_charge = noCharge;
        }
        await do_boh_explosion(box, floorContainer);
        if (!floorContainer)
            await useup(box);
        else if (obj_here(box, u.ux, u.uy))
            await useupf(box, box.quan);
        else
            throw new Error('in_container: bag not found');
        await losehp(d(6, 6), 'magical explosion', KILLED_BY_AN);
        g.current_container = null;
    }

    if (g.current_container) {
    /* C:2696-2698 — You("put %s into %s.", doname(obj), the(xname(container))).
     * "the", not yname: C builds buf from the(xname()) even for a carried bag,
     * which is why the recorded line is "You put 1163 gold pieces into the
     * bag." while the menu above it said "your bag". */
    const containerName = the(xname(box));
    await pline(`You put ${(await doname(obj))} into ${containerName}.`);
    /* C:2702-2704: gold credit follows the put message, before linking the
     * object into the container. sellobj itself checks the shop at ox,oy. */
    if (floorContainer && (obj.oclass | 0) === COIN_CLASS)
        await sellobj(obj, box.ox, box.oy);
    await add_to_container(box, obj);                               /* C:2705 */
    box.owt = weight(box);                                    /* C:2706 */
    }
    /* C:2712 bot() — status refresh; gold left the purse. */
    await bot();
    return g.current_container ? 1 : -1;
}

/* C pickup.c:2910-2940 explain_container_prompt(): NHW_TEXT help window. */
export async function explain_container_prompt(more_containers) {
    const lines = [
        'Container actions:', '',
        ' : -- Look: examine contents',
        ' o -- Out: take things out',
        ' i -- In: put things in',
        ' b -- Both: first take things out, then put things in',
        ' r -- Reversed: put things in, then take things out',
        ' s -- Stash: put one item in', '',
        ' n -- Next: loot next selected container',
        ' q -- Quit: finished',
        ' ? -- Help: display this text.', ''
    ];
    await display_text_window(lines.filter(line => more_containers || !line.startsWith(' n ')));
}

export async function encumber_msg() {
    return encumber_msg_sync();
}

/* C ref: pickup.c:1511 count_categories(olist, qflags) — note it uses its OWN
 * worn test (W_ARMOR|W_ACCESSORY|W_WEAPONS), which OMITS W_SADDLE where
 * is_worn() includes it.  That asymmetry is C's, and it is ported as written. */
export function count_categories(list, do_worn) {
    let ccount = 0;
    for (const oc of INV_ORDER) {
        let counted = false;
        for (let o = list; o; o = o.nobj) {
            if ((o.oclass | 0) === oc) {
                if (do_worn && !((o.owornmask | 0) & (W_ARMOR | W_ACCESSORY | W_WEAPONS)))
                    continue;
                if (!counted) { ccount++; counted = true; }
            }
        }
    }
    return ccount;
}

export async function dotip() {
    const g = game;
    const u = g.u || {};
    const ccx = u.ux | 0, ccy = u.uy | 0;

    const boxes = container_at(ccx, ccy, true) | 0;
    const capacityMessage = `You can't tip ${!g.flags.verbose ? 'a container' : boxes > 1 ? 'one' : 'it'} while carrying so much.`;
    if (boxes > 0 && (!g.iflags?.menu_requested
        || (g.flags.menu_style === MENU_TRADITIONAL && boxes > 1))
        && !check_capacity_sync(capacityMessage)
        && await able_to_loot(ccx, ccy, false)) {
        if (boxes > 1) {
            /* C pickup.c:3505-3557 choose_tip_container_menu(). */
            const menu = new TtyMenu({ overlay: true }), carried = {};
            let nboxes = 0;
            for (let obj = g.level?.levelObjects?.[ccx]?.[ccy]; obj; obj = obj.nexthere) {
                if (!Is_container(obj)) continue;
                ++nboxes;
                menu.add_menu(obj, 0, 0, await doname(obj));
            }
            if (g.invent) {
                menu.add_menu_str('');
                menu.add_menu(carried, nboxes <= 8 && !g.flags.lootabc ? 'i' : 0,
                    0, 'tip something being carried', false, true);
            }
            menu.end_menu('Tip which container?');
            const { count, picks } = await menu.select_menu(PICK_ONE);
            const obj = count <= 0 ? null : count > 1 && picks[0] === carried ? picks[1] : picks[0];
            if (obj && obj !== carried) {
                await tipcontainer(obj);
                return ECMD_TIME;
            }
            if (count < 0) return ECMD_CANCEL;
        }
        for (let cobj = g.level?.levelObjects?.[ccx]?.[ccy], nobj = null; boxes === 1 && cobj; cobj = nobj) {
            nobj = cobj.nexthere ?? null;
            /* C pickup.c:3605 if (!Is_container(cobj)) */
            if (!Is_container(cobj))
                continue;
            const query = await safe_qbuf_invent('', 'There is ', ' here, tip it?',
                cobj, doname, ansimpleoname, 'container');
            const c = await _ynq_cmd(query);
            if (c === 'q')
                return ECMD_OK;
            if (c === 'n')
                continue;
            /* C pickup.c:3614-3616: tipcontainer() is void; the turn is spent
             * even when the box is locked or the destination menu is cancelled. */
            await tipcontainer(cobj);
            return ECMD_TIME;
        }
    }

    const tip_ok = (obj) => {
        if (!obj)
            return GETOBJ_EXCLUDE;
        const otyp = obj.otyp | 0;
        const COIN_CLASS = OCLASS_COIN;
        if ((obj.oclass | 0) === COIN_CLASS)
            return GETOBJ_EXCLUDE;
        if (Is_container(obj))
            return GETOBJ_SUGGEST;
        /* C pickup.c:3490-3493: horn of plenty if sufficiently discovered */
        if (otyp === 252 /* HORN_OF_PLENTY */ && obj.dknown
            && game._oc_name_known?.[otyp])
            return GETOBJ_SUGGEST;
        return GETOBJ_DOWNPLAY;
    };
    const obj = await getObjFromGetobj('tip', tip_ok, GETOBJ_PROMPT);
    if (!obj)
        return ECMD_CANCEL;
    /* C pickup.c:3628-3632: normal case; 3633-3676: other cases. */
    const otyp = obj.otyp | 0;
    if (Is_container(obj) || (otyp === 252 /* HORN_OF_PLENTY */)) {
        /* C pickup.c:3630-3631: tipcontainer() is void; always ECMD_TIME. */
        await tipcontainer(obj);
        return ECMD_TIME;
    }
    let spillage = null;
    if (Is_candle(obj) && obj.lamplit) {
        spillage = 'wax';
    } else if ((otyp === 321 /* POT_OIL */ && obj.lamplit)
               || (otyp === 227 /* OIL_LAMP */ && (obj.age | 0) !== 0)
               || (otyp === 228 /* MAGIC_LAMP */ && (obj.spe | 0) !== 0)) {
        spillage = 'oil';
    } else if (otyp === 240 /* CAN_OF_GREASE */ && (obj.spe | 0) > 0) {
        spillage = 'grease';
    } else if (otyp === 293 /* FOOD_RATION */ || otyp === 292 /* CRAM_RATION */
               || otyp === 291 /* LEMBAS_WAFER */) {
        spillage = 'crumbs';
    } else if ((obj.oclass | 0) === 17 /* VENOM_CLASS */) {
        spillage = 'venom';
    }
    if (spillage) {
        let buf = '';
        if (is_pool(u.ux | 0, u.uy | 0))
            buf = ` and gradually ${vtense(spillage, 'dissipate')}`;
        else if (is_lava(u.ux | 0, u.uy | 0))
            buf = ` and immediately ${vtense(spillage, 'burn')} away`;
        await pline(`Some ${spillage} ${vtense(spillage, 'spill')} onto the ${surface(u.ux | 0, u.uy | 0)}${buf}.`);
        if (otyp === 240 && (obj.spe | 0) > 0)
            consume_obj_charge(obj, true);
        return ECMD_TIME;
    }
    if ((obj.oclass | 0) === 8 /* POTION_CLASS */)
        await pline_The(`${_fw_xname(obj)} ${otense(obj, 'are')} securely sealed.`);
    else if (u.uarmh && obj === u.uarmh)
        return (await tiphat()) ? ECMD_TIME : ECMD_OK;
    else if (otyp === 476 /* STATUE */)
        await pline('Nothing interesting happens.');
    else
        await pline1(nothing_happens);
    return ECMD_OK;
}

const ICE_BOX = 216; /* objects.h ICE_BOX (pickup.c:3762) */

async function _tip_target_destination(box) {
    /* C tipcontainer_gettarget() builds the menu before tipcontainer_checks()
     * marks the source known.  That ordering is observable: a freshly wished
     * unlocked chest is titled "a chest" here, not "an unlocked chest". */
    let boxName = await doname(box);
    const titleText = `Where to tip the contents of ${boxName}`;
    const title = menu_heading_text(titleText.slice(0, 78)); // C tty_end_menu:2730
    const targets = [];
    const targetRows = [];
    const lines = [title, '', '- * on the floor', ''];
    let handsAvailable = null;
    for (let obj = game.invent; obj; obj = obj.nobj) {
        if (obj === box) continue;
        const typ = obj.otyp | 0;
        if (typ < 214 || typ > 220) continue;
        if (typ === 220 && obj.dknown && game._oc_name_known?.[typ]) continue;
        // C pickup.c:3918-3927: unavailable destinations remain visible,
        // but have no identifier or selector and are indented four spaces.
        if (handsAvailable === null) handsAvailable = await u_handsy();
        const excluded = !handsAvailable || (obj.olocked && obj.lknown);
        const letter = typeof obj.invlet === 'number' ? String.fromCharCode(obj.invlet) : obj.invlet;
        lines.push(`${excluded ? '    ' : `${letter} - `}${await doname(obj)}`.slice(0, 78));
        if (!excluded) { targets.push(obj); targetRows.push(lines[lines.length - 1]); }
    }
    lines.push('(end)');
    // C wintty.c:2728-2736,1908-1935: size from every menu row;
    // offx 0 (content column 1) clears the whole screen, retaining its margin.
    const cornerColumn = tty_window_offx(lines, 'end');
    const fullScreen = cornerColumn === 1 || lines.length >= 24
        || game.iflags?.menu_overlay === false || game.iflags?.menu_overlay === 0;
    const column = fullScreen ? 1 : cornerColumn;
    /* u_handsy()'s message (pickup.c:3919) is still on the topline when the
     * menu is displayed; tty pages it with --More-- first. */
    if (game._pending_message)
        await force_more(game._pending_message);
    game._pending_message = '';
    game._topl_sticky = '';
    const painted = build_window_screen(lines, column, game.u?.uac | 0,
        undefined, undefined, fullScreen);
    game._screen_output = `\x1b[${column}C${title}\n${painted.split('\n').slice(1).join('\n')}`;
    set_cursor(column + 6, lines.length - 1);
    const finish = async (cancelled, target) => {
        /* C pickup.c:3932-3933 -> wintty.c:982,3684-3687: dismissing the
         * menu clears its rectangle before row_refresh. Control-byte symbols
         * cannot repaint the old physical glyph left under the window. */
        if (fullScreen) {
            // C wintty.c:971-979 erase_menu_or_text: offx 0 dismisses via docrt.
            await docrt();
            /* wintty.c:978-979 `docrt(); flush_screen(1);`: docrt's seen-stone
             * row-20 blanks precede the botlx bot() that rewrites status row 1. */
            status_r1_menu_docrt();
            game._r1botAfterMap = game.level;
            game._r1textOver = true;
            await flush_screen(1);
            const savedBotDisabled = game._bot_disabled;
            game._bot_disabled = true;
            game._statusBlankAfterDocrt = true;
            try { await docrt_flags(0); await flush_screen(1); }
            finally { game._bot_disabled = savedBotDisabled; }
            /* windows.c:1859-1863 / wintty.c:978-979: the map is reprinted with bot()
             * disabled, so the botlx BL_RESET that follows rewrites row 1 whole
             * on top of it (same ordering as the wiz_intrinsic dismissal). */
            game._status1WholeNext = true;
            game._r1botAfterMap = game.level;
        } else {
            /* C wintty.c:982,3684-3716: a corner menu restores gbuf via
             * row_refresh, without docrt's vision/monster redraws (and
             * their hallucination RNG draws). select_menu holds bot_disabled. */
            docorner_blank_utf8_captures(column - 1, lines.length + 1);
            /* wintty.c:982,3684-3721: a corner menu uses docorner(),
             * preserving rows outside its rectangle. Only reaching the
             * status window requests botlx; select_menu keeps bot() disabled
             * during dismissal (windows.c:1859-1863). */
            docorner_status_rows(column - 1, lines.length + 1);
            if (lines.length + 1 >= (_threeStatusLines() ? 21 : 22))
            docorner_status_rows(column - 1, lines.length + 1);
            if (game.disp && lines.length + 1 >= (_threeStatusLines() ? 21 : 22))
                game.disp.botlx = 1;
            /* C wintty.c:981-982: an offx > 0 menu closes with docorner(),
             * which reprints gbuf without recomputing hallucinated glyphs. */
            docorner_status_rows(column - 1, lines.length + 1);
            if (lines.length + 1 >= (_threeStatusLines() ? 21 : 22)
                && game.disp) game.disp.botlx = 1;
            /* C wintty.c:979-980 erase_menu_or_text: a menu with offx != 0 is
             * dismissed by docorner(offx, maxrow + 1, 0), a row_refresh from
             * tty's own glyph buffer -- never docrt(), whose newsym of every
             * monster would draw random_monster on the DISPLAY rng while
             * hallucinating. */
            const oldBotDisabled = game._bot_disabled;
            game._bot_disabled = true;
            try {
                docorner_blank_utf8_captures(column - 1, lines.length + 1);
                docorner_status_rows(column - 1, lines.length + 1);
                /* wintty.c:3715-3719: BL_RESET stays pending under the
                 * disabled bot(). */
                if (lines.length + 1 >= (_threeStatusLines() ? 21 : 22))
                    game.disp.botlx = 1;
            } finally { game._bot_disabled = oldBotDisabled; }
            return { cancelled, target };
            // C wintty.c:971-979 erase_menu_or_text: offx 0 dismisses via docrt
            // + flush_screen(1) inside windows.c:1859-1863's bot_disabled span;
            // the botlx bot() then rewrites status row 1 over map y=20.
            return (async () => {
                const oldBotDisabled = game._bot_disabled;
                game._bot_disabled = true;
                try {
                    /* offx != 0 dismisses via docorner() -> row_refresh
                     * (wintty.c:982,3650), which never reaches docrt's
                     * swallowed(1) and its DISP-stream swallow_to_glyph
                     * draws (display.c:2439). */
                    if (!(game.u?.uswallow | 0))
                        await docrt();
                    await flush_screen(1);
                } finally { game._bot_disabled = oldBotDisabled; }
                status_r1_menu_docrt();
                game._r1botAfterMap = game.level;
                game._r1textOver = true;
                game._statusBlankAfterDocrt = true;
                if (game.disp) game.disp.botlx = 1;
                return { cancelled, target };
            })();
            /* C wintty.c:982,3684-3719: a corner menu restores only its
             * covered rows; it requests status reset only if it reached them. */
            docorner_status_rows(column - 1, lines.length + 1);
            if (lines.length + 1 >= (_threeStatusLines() ? 21 : 22) && game.disp)
                game.disp.botlx = 1;
        }
        /* C wintty.c:982,3684-3709: a corner menu restores gbuf with
         * docorner(), without docrt()'s vision and hallucination redraws. */
        docorner_blank_utf8_captures(column - 1, lines.length + 1);
        return { cancelled, target };
    };
    /* C wintty.c:1700-1730 MENU_SEARCH: the getlin's clear_nhwindow blanks
     * row 0 (the title) for the rest of this one-page select_menu(). */
    let titleErased = false;
    const frameRows = () => build_window_screen(
        titleErased ? ['', ...lines.slice(1)] : lines, column, game.u?.uac | 0,
        undefined, undefined, fullScreen).split('\n');
    for (;;) {
        const key = await nhgetch();
        if (key === 27) return await finish(true, null);
        if (key === 0x3a) {
            /* pmatchi() runs against tty_add_menu's stored "%c - %s" text;
             * unavailable rows have no identifier and are skipped. */
            let picked = null;
            const mlist = [{ str: '- - on the floor', obj: null },
                ...targets.map((obj, i) => ({ str: targetRows[i], obj }))];
            const finished = await menu_search_case('ONE', mlist, frameRows,
                (curr) => { picked = curr; });
            titleErased = true;
            game._screen_output = frameRows().join('\n');
            set_cursor(column + 6, lines.length - 1);
            if (finished && picked) return await finish(false, picked.obj);
            continue;
        }
        if (key === 10 || key === 13 || key === 32 || key === 45)
            return await finish(false, null);
        const target = targets.find((obj) => key === (typeof obj.invlet === 'number'
            ? obj.invlet : (obj.invlet || '').charCodeAt(0)));
        if (target) return await finish(false, target);
    }
}

async function _tip_carried_contents(box, target) {
    const srcheld = box.where === 3; /* OBJ_INVENT */
    const dstheld = target.where === 3;
    const maybeshopgoods = !srcheld && shk_costly_spot(box.ox, box.oy);
    let loss = 0;
    box.cknown = 1; /* C pickup.c:3742 */
    const items = [];
    for (let obj = box.cobj; obj; obj = obj.nobj) items.push(obj);
    const targetName = _the_objnam(_fw_xname(target));
    await pline(`${items.length > 1 ? 'Objects tumble' : 'An object tumbles'} into ${targetName}.`);
    const cursed_mbag = (box.otyp === 219 || box.otyp === 220) && !!box.cursed;
    for (const obj of items) {
        _objExtractSelf_useupf(obj);
        obj.ox = box.ox; obj.oy = box.oy;
        /* C pickup.c:3761-3768: an ice box's contents resume their lifecycle
         * as they come out (rnz(10) per corpse via start_corpse_timeout,
         * mkobj.c:1413); the magic-bag loss arm is C's else-if. */
        if ((box.otyp | 0) === ICE_BOX) {
            removed_from_icebox(obj);
        } else if (cursed_mbag && !rn2(13)) {
            loss += await mbag_item_gone(srcheld, obj, false);
            continue;
        }
        if (maybeshopgoods) {
            await shk_addtobill(obj, false, false, true);
            game.iflags.suppress_price = (game.iflags.suppress_price | 0) + 1;
        }
        /* C pickup.c:3776-3803: tipping can explode either magic bag. */
        if ((target.otyp === 219 /* BAG_OF_HOLDING */ || target.otyp === 220 /* BAG_OF_TRICKS */)
            && mbag_explodes(obj, 0)) {
            livelog_printf(LL_ACHIEVE, 'just blew up %s bag of holding via tipping', game.flags?.female ? 'her' : 'his');
            await urgent_pline(`As ${await doname(obj)} ${otense(obj, 'tumble')} inside, you are blasted by a magical explosion!`);
            if (obj.otyp === 219)
                await do_boh_explosion(obj, !srcheld);
            await obfree(obj, null);
            await do_boh_explosion(target, !dstheld);
            if (dstheld)
                await useup(target);
            else
                await useupf(target, target.quan);
            target = null;
            await losehp(d(6, 6), 'magical explosion', KILLED_BY_AN);
            if (maybeshopgoods) game.iflags.suppress_price--;
            break;
        }
        await mklev_add_to_container(target, obj);
        if (maybeshopgoods) game.iflags.suppress_price--;
    }
    if (loss) await pline('You owe %d %s for lost merchandise.', loss, shk_currency(loss));
    box.owt = weight(box);
    if (target) target.owt = weight(target);
    if (srcheld || dstheld) await encumber_msg();
    if (srcheld || dstheld) update_inventory();
    return true;
}

/* C pickup.c:3981-3990: a failed chest trap still consumes the turn. */
async function _tip_container_trap(box) {
    await _fl_chest_trap(box, HAND, false);
    if ((game.multi | 0) >= 0) {
        nomul(-1);
        game.multi_reason = 'tipping a container';
        game.nomovemsg = '';
    }
    return false;
}

/* C pickup.c:3954-4058: destination checks allow an empty ordinary container. */
async function _tip_check_target(box) {
    if (!box.lknown) {
        box.lknown = 1;
        if (box.where === 3) update_inventory();
    }
    if (box.olocked) {
        await pline(`${upstart(thesimpleoname(box))} is locked.`);
        return false;
    }
    if (box.otrapped) return await _tip_container_trap(box);
    if (SchroedingersBox(box)) {
        await observe_quantum_cat(box, true, true);
        if (!box.cobj) await pline(`${Shk_Your(box)}box is now empty.`);
        box.cknown = 1;
    }
    return true;
}

async function tipcontainer(box) {
    if (!box)
        return false;
    // C pickup.c:3699-3700: held containers use the hero's current location.
    const ox = { value: game.u.ux }, oy = { value: game.u.uy };
    if (get_obj_location(box, ox, oy, 0)) {
        box.ox = ox.value; box.oy = oy.value;
    }
    const destination = await _tip_target_destination(box);
    if (destination.cancelled)
        return false;
    const target = destination.target;
    if (target && target.otyp === 220 /* BAG_OF_TRICKS */) {
        await bagotricks(target, false, { count: 0 });
        return true;
    }
    if (!box.lknown) {
        box.lknown = 1;
        if (box.where === 3) update_inventory();
    }
    if (box.olocked) {
        await pline(`${upstart(thesimpleoname(box))} is locked.`);
        return false;
    }
    if (box.otrapped) {
        return await _tip_container_trap(box);
    }
    if (box.otyp === 219 + 1 /* BAG_OF_TRICKS */ || box.otyp === 252 /* HORN_OF_PLENTY */) {
        /* C pickup.c:3993-4030 tipcontainer_checks(): apply until empty */
        const bag = box.otyp === 220;
        const old_spe = box.spe | 0;
        const seen = { count: 0 };
        let totseen = 0;
        const maybeshopgoods = box.where !== 3 && shk_costly_spot(box.ox, box.oy);
        /* C pickup.c:4001-4012: validate the target before billing or creating. */
        if (target && !await _tip_check_target(target)) return false;
        if (maybeshopgoods && !box.no_charge) await shk_addtobill(box, false, false, true);
        do {
            if (!(bag ? await bagotricks(box, true, seen)
                      : await hornoplenty(box, true, target)))
                break;
            totseen += seen.count | 0;
        } while ((box.spe | 0) > 0);
        if ((box.spe | 0) < old_spe) {
            if (bag && !totseen)
                await pline1(nothing_seems_to_happen);
            box.spe = old_spe;
            await check_unpaid_usage(box, true);
            box.spe = 0;
            box.cknown = 1;
        }
        if (maybeshopgoods && !box.no_charge)
            await shk_subfrombill(box, shop_keeper(in_rooms(box.ox, box.oy, SHOPBASE)[0]));
        return true;
    }
    if (SchroedingersBox(box)) {
        await observe_quantum_cat(box, true, true);
        box.cknown = 1;
        if (!box.cobj) {
            /* C pickup.c:4041: container type of "large box" is inferred */
            await pline(`${Shk_Your(box)}box is now empty.`);
            /* C has already accepted the destination menu; even an
             * observation that leaves the source empty completes the command
             * and advances one turn. */
            return true;
        }
    }
    if (!box.cobj) {
        box.cknown = 1; /* C pickup.c:4048: tipping reveals an empty container. */
        await pline(`${upstart(thesimpleoname(box))} is empty.`);
        /* tipcontainer_gettarget() consumed the affirmative destination
         * selection, so C returns ECMD_TIME for this empty-source attempt. */
        return true;
    }

    /* C pickup.c:3727: the destination gets tipcontainer_checks(allowempty) */
    if (target) {
        if (!await _tip_check_target(target)) return false;
        return await _tip_carried_contents(box, target);
    }

    const items = [];
    for (let otmp = box.cobj; otmp; otmp = otmp.nobj)
        items.push(otmp);
    // C pickup.c:3732-3755: terrain/reach determines terse, not item count.
    const highdrop = !game.u.uswallow && !can_reach_floor(true);
    const altarizing = !game.u.uswallow && IS_ALTAR(game.level.at(box.ox, box.oy).typ);
    const maybeshopgoods = box.where !== 3 && shk_costly_spot(box.ox, box.oy);
    let terse = !(highdrop || altarizing || shk_costly_spot(box.ox, box.oy));
    const cursed_mbag = (box.otyp === 219 || box.otyp === 220) && !!box.cursed;
    let loss = 0;
    box.cknown = 1;
    await pline(`${items.length > 1 ? 'Objects spill' : 'An object spills'} out${terse ? ':' : '.'}`);
    for (let index = 0; index < items.length; index++) {
        const otmp = items[index];
        _objExtractSelf_useupf(otmp);
        otmp.ox = box.ox | 0;
        otmp.oy = box.oy | 0;
        /* C pickup.c:3761-3768: an ice box's contents resume rotting as they
         * are tipped out (rnz(10) per corpse via start_corpse_timeout,
         * mkobj.c:1413); the magic-bag loss arm is C's else-if and then terse
         * formatting is off. */
        if ((box.otyp | 0) === ICE_BOX) {
            removed_from_icebox(otmp);
        } else if (cursed_mbag && !rn2(13)) {
            loss += await mbag_item_gone(box.where === 3 /* OBJ_INVENT */, otmp, false);
            terse = false;
            continue;
        }
        // C pickup.c:3770-3773: bill each extracted item before formatting.
        if (maybeshopgoods) {
            await shk_addtobill(otmp, false, false, true);
            game.iflags.suppress_price = (game.iflags.suppress_price | 0) + 1;
        }
        if (highdrop) {
            otmp.how_lost = LOST_DROPPED;
            await hitfloor(otmp, true);
            if (maybeshopgoods) game.iflags.suppress_price--;
            continue;
        }
        if (altarizing) {
            await doaltarobj(otmp);
        } else if (!terse) {
            await pline('%s %s to the %s.', await _Doname2(otmp), otense(otmp, 'drop'), surface(box.ox, box.oy));
        } else {
            await pline(`${(await doname(otmp))}${index + 1 < items.length ? ',' : '.'}`);
            (game.iflags ||= {}).last_msg = PLNMSG_OBJNAM_ONLY;
        }
        otmp.how_lost = LOST_DROPPED;
        await dropy(otmp);
        if (game.iflags?.last_msg !== PLNMSG_OBJNAM_ONLY) terse = false;
        if (maybeshopgoods) game.iflags.suppress_price--;
    }
    if (loss) await pline('You owe %d %s for lost merchandise.', loss, shk_currency(loss));
    box.owt = weight(box);
    if (box.where === 3) await encumber_msg();
    if (box.where === 3) update_inventory();
    return true;
}

/* C pickup.c:317-337 force_decor(via_probing).  Force the current terrain to
 * differ from prev_decor, bypass the one-turn Fumbling deferral, and allow a
 * probing zap to reveal ice thickness while blind and levitating. */
export async function force_decor(via_probing) {
    const g = game, u = g.u || {};
    if (!g.gd) g.gd = {};
    if (!g.iflags) g.iflags = {};
    g.gd.decor_fumble_override = true;
    g.gd.decor_levitate_override = !!via_probing;
    g.iflags.prev_decor = STONE;
    await describe_decor();
    g.gd.decor_fumble_override = false;
    g.gd.decor_levitate_override = false;
    /* C pickup.c:333 stores the raw levl typ (a raised drawbridge stays
     * DRAWBRIDGE_UP), unlike update_lastseentyp's under-bridge terrain. */
    const _fl = g.level?.at(u.ux | 0, u.uy | 0);
    if (_fl)
        _fl.lastseentyp = _fl.typ | 0;
}

/* C pickup.c:2943 — preserve guard order, messages and curse identification. */
export async function u_handsy() {
    const ptr = game.youmonst?.data || game.youmonst || null;
    if (_nohands(ptr)) {
        await You('have no hands!');
        return false;
    } else if (!freehand()) {
        await You(`have no free ${body_part(HAND)}.`);
        return false;
    }
    return true;
}

/* C ref: pickup.c:634 count_justpicked(olist) and pickup.c:647 find_justpicked.
 * Neither applies query_category's ofilter — C passes the raw list. */
export function count_justpicked(list) {
    let cnt = 0;
    for (let o = list; o; o = o.nobj) if (o.pickup_prev) cnt++;
    return cnt;
}

export function find_justpicked(list) {
    for (let o = list; o; o = o.nobj) if (o.pickup_prev) return o;
    return null;
}
