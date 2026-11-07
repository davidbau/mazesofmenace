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
import { impossible } from './pline.js';
import { displayLookWindow } from './look-window.js';
import { fix_ghostly_obj } from './bones.js';
import { _topl_stash_result, newsym, newsym_force, flush_screen, obj_to_glyph, mon_to_glyph, map_glyphinfo, menu_item_marker, force_more, topl_park_cursor, topl_force_break_after, capture_flushed_cells, _topline_more_pending, _more_never_dismissed, flush_pending_messages } from './display.js';
import { pline, Norep, You_see, You, Your, You_cant } from './pline.js';
import { pline_with_more, build_window_screen, tty_window_offx, menu_search_case } from './com_pager.js';
import { money_cnt } from './hack.js';
import { menu_heading_text } from './tty_menu.js';
import { autokey, pick_lock, getdir, u_have_forceable_weapon } from './lock.js';
import { boxlock } from './lock.js';
import { nomul } from './allmain.js';
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
import { rnd, rn2 } from './rng.js';
import { losehp } from './hack.js';
import { yn_function, read_engr_at } from './cmd.js';
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
import { hliquid, x_monnam } from './mhitm.js';
/* pickup()'s own guard cascade (pickup.c:690-735) — real, already-ported
 * bodies from their owning files, imported read-only. */
import { is_pool } from './look.js';
import { will_feel_cockatrice, look_here } from './invent.js';
import { t_at } from './trap.js';
import { extract_from_minvent } from './worn.js';
import { can_reach_floor } from './hold_another_object.js';
import { addinv_core0, hold_another_object } from './invent.js';
import { freehand, cant_reach_floor, is_ice } from './engrave.js';
import { rider_cant_reach } from './steed.js';
import { P_SKILL } from './skills.js';
import { safe_qbuf as safe_qbuf_shk, costly_spot, addtobill, shop_keeper, inhishop, remote_burglary, shk_your } from './shk.js';
import { in_rooms } from './hack.js';
import { remove_object, obj_extract_self, engr_at, set_bknown, is_rider_pm, revive_corpse, GOLD_PIECE, OC_USES_KNOWN } from './mklev.js';
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
import {
    dfeature_at as _cmd_dfeature_at,
    waterbody_name as _cmd_waterbody_name,
    pooleffects_back_on_ground as _cmd_back_on_ground,
    body_part, ceiling, self_lookat, _digests,
    count_unpaid, loot_xname,
    bhp_Maybe_Half_Phys,
    cmdq_add_ec,
} from './cmd.js';
import { getlin } from './windows.js';
import { def_oc_syms_chars, def_char_to_objclass } from './drawing.js';
import { symset_cell } from './symbols.js';
import { uescaped_shaft, unconscious, uteetering_at_seen_pit } from './trap.js'; // relocate-fns
import { CORPSE } from './makemon.js'; // relocate-fns
import { start_corpse_timeout, start_glob_timeout } from './mklev.js'; // relocate-fns
import { get_mtraits } from './mkobj.js'; // relocate-fns
import { PM_ICE_TROLL } from './pm.generated.js'; // relocate-fns
import { age_is_relative } from './timeout.js'; // relocate-fns
import { get_adjacent_loc, invletter_value as invletter_value_cmd } from "./cmd.js"; // relocate-fns
import { tally_BUCX } from './invent.js'; // relocate-fns
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
        topl_force_break_after(game._pending_message, false, null,
            capture_flushed_cells(), game._lastPaintedBotl);
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
const ICE_BOX_OTYP = 216;
const BAG_OF_TRICKS_OTYP = 220;
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
        return game.apelist.find(ape => new RegExp(ape.pattern).test(objdesc)) || null;
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
                all.push(`${it.sel} ${menu_item_marker(it, page, showGlyph)} ${it.text}`);
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
/* C invent.c:391 invletter_value — the one port is js/cmd.js; this adapts the
 * string invlet the pickup sorter may carry. */
function _pu_invletter_value(c) {
    return invletter_value_cmd(typeof c === 'string' ? c.charCodeAt(0) : c);
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
        if (invletMode && (cmp = _pu_invletter_value(a.obj.invlet)
                               - _pu_invletter_value(b.obj.invlet))) return cmp;
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
    let value = 0, n_len = 1;
    if (g._yn_lead_digit !== undefined) { /* topl.c:486-489 */
        value = g._yn_lead_digit;
        text += String(value); n_len++;
        g._yn_lead_digit = undefined;
    }
    for (;;) {
        g._pending_message = text;
        await flush_screen(1);
        if (g.nhDisplay) topl_park_cursor(g.nhDisplay, text);
        const raw = await nhgetch();
        const key = typeof raw === 'number' ? raw : (raw?.charCodeAt(0) ?? 0);
        if (key >= 48 && key <= 57) {
            value = value * 10 + (key - 48);
            text += String.fromCharCode(key); n_len++;
        } else if (key === 121 || key === 32 || key === 13 || key === 10) {
            break;
        } else if (key === 27) {
            value = -1;
            break;
        } else if (key === 8 || key === 127) {
            if (n_len <= 1) { value = -1; break; }
            value = Math.trunc(value / 10);
            text = text.slice(0, -1); n_len--;
        } else {
            value = -1;
            break;
        }
    }
    return value;
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




/* near_capacity() — C hack.c:4349; real STR/CON+inventory-weight impl now
 * imported from weight.js (shared faithful impl). */
/* encumber_msg() — C pickup.c:1972 / hack.c:4382.
 * Shared faithful implementation re-exported directly from weight.js. */
export { encumber_msg } from './weight.js';

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
