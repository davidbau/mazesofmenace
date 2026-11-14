import { in_rooms } from './hack.js';
import { cmd_from_dir, movecmd, dxdy_moveok, revive_nasty } from './cmd.js';
import { obj_to_any } from './hack.js';
import { delallobj } from './invent.js';
import { flooreffects } from './do.js';
// C ref: nethack-c/src/dig.c — the apply-a-pick-axe / dig occupation subsystem.
//
//   use_pick_axe2()  — the down-dig (u.dz > 0) branch: "You start digging
//                       downward.", then set_occupation(dig).  (dig.c:1336-1357)
//   dig()            — the per-occupation-turn effort accumulator: one rn2(5) per
//                       turn (dig.c:366), make-the-pit when effort crosses 50.
//
// RNG faithfulness is the contract: each occupation turn draws exactly one
// rn2(5) (the effort roll), and the terminating turn additionally draws the
// rn1(4,2) == rn2(4)+2 pit timeout.  The number of turns falls out of the C
// effort formula (NOT hardcoded): for the level-1 archeologist (abon()==1,
// pick-axe spe 0) the cumulative effort crosses 50 on the 4th turn.
import { rn1 } from './rng.js';
import { rn2, rnd, rnl } from './rnd.js';
import { PM_DWARF as PM_DWARF_ } from './pm.generated.js';
import { game } from './gstate.js';
import { Can_dig_down as Can_dig_down_real, assign_level } from './dungeon.js';
import { dbon, dmgval, abon } from './weapon.js';
import { body_part } from './polyself.js';
import { align_str } from './insight.js';
import { desecrate_altar, altarmask_at } from './pray.js';
import { Amask2align, AM_MASK, AM_SANCTUM } from './const.js';
import { FOOT, FORCETRAP, ECMD_CANCEL } from './const.js';
import { reset_utrap } from './trap.js';
import { yname } from './objnam.js';
import { OC_NAME } from './oc_name_data.js';
import { end_burn, start_timer } from './timeout.js';
import { tmp_at, DISP_BEAM, DISP_END, feel_newsym, canseemon, newsym, Unaware as Unaware_real, Deaf as Deaf_real } from './display.js';
import { pline, You_hear, You_see } from './pline.js';
import { unblock_point, does_block, Blind, vision_recalc } from './vision.js';
import { scatter } from './explode.js';
import { MAY_HIT, Is_stronghold, MM_NOMSG } from './const.js';
import { b_trapped } from './trap.js';
import { NO_PART } from './const.js';
import { acurr, exercise, adjalign } from './attrib.js';
import { acurrstr } from './dokick.js';
import { TT_PIT, STONE, SCORR, CORR, DOOR, D_NODOOR, IS_WALL, IS_OBSTRUCTED, IS_DOOR, D_CLOSED, TREE, isok,
         OBJ_FREE, OBJ_FLOOR, OBJ_CONTAINED, OBJ_INVENT, OBJ_MINVENT, OBJ_MIGRATING,
         OBJ_BURIED, OBJ_ONBILL, OBJ_LUAFREE, OBJ_DELETED, W_BALL, W_CHAIN, TT_BURIEDBALL,
         TIMER_OBJECT, ROT_ORGANIC, SDOOR, D_BROKEN, D_TRAPPED, W_NONDIGGABLE, SHOPBASE, ROOM, IS_TREE,
         WM_MASK, D_LOCKED, Is_rogue_level, A_STR, A_INT, A_WIS, A_DEX, A_CON, A_CHA,
         HALLUC, HALLUC_RES, DEAF, TAINT_AGE, A_LAWFUL, TRAPPED_DOOR, DIR_180, DIR_ERR, IS_DRAWBRIDGE,
         DB_DIR, DB_NORTH, DB_SOUTH, DB_EAST, DB_WEST, ICED_MOAT, xdir, ydir, N_DIRS } from './const.js';
/* mdig_tunnel leaf callees, imported from their C homes: wake_nearto (mklev.c
 * via js/mklev.js), mon_learns_traps (trap.c), mondied (mon.c via
 * js/makemon.js — still a throwing stub, reached only on a lethal door blast). */
import { wake_nearto } from './mon.js';
import { mon_learns_traps } from './mondata.js';
import { mondied } from './mon.js';
import { place_object, obj_extract_self, add_to_buried, mksobj_at, mk_tt_object, remove_object, obj_timer_checks as obj_timer_checks_real } from './mkobj.js';
import { makemon } from './makemon.js';
import { del_engr_at, wipe_engr_at } from './engrave.js';
import { sobj_at } from './invent.js';
import { minliquid } from './mon.js';
import { obj_resists } from './dogmove.js';
import { is_ice, cant_reach_floor } from './engrave.js';
import { uteetering_at_seen_pit, uescaped_shaft } from './trap.js';
import { yobjnam, Yobjnam2, an, An, simpleonames } from './objnam.js';
import { IS_STWALL } from './const.js';
import { trapname } from './trap.js';
import { is_pool } from './dbridge.js';
import { closed_door } from './monmove.js';
import { may_dig } from './hack.js';
import { dotrap } from './trap.js';
import { FORCEBUNGLE } from './const.js';
/* in_town (hack.c:3562) — this file used to carry its own `return false` stub,
 * which shadowed the real ported body at js/cmd.js.  Same import that
 * js/mklev.js:1 already makes; the cmd.js <-> dig.js cycle resolves through the
 * hoisted function declaration, exactly as mklev.js's does. */
import { xytodir, _spoteffects_pickup } from './cmd.js';
import { in_town } from './hack.js';
import { useup } from './invent.js';
import { fire_damage_chain } from './trap.js';
import { goto_level } from './do.js';
/* bimanual — C obj.h:257.  Needed by pick_can_reach() below (dig.c:141). */
import { bimanual } from './do_wear.js';
import { can_reach_floor as can_reach_floor_dg } from './engrave.js';
import { MKOBJ_OC_MATERIAL, MKOBJ_OC_SKILL } from './mkobj_erosion_meta.js';
import { recalc_block_point } from './vision.js';
import { float_vs_flight } from './polyself.js';
import { LEVITATION, FLYING, STEALTH, CXN_NO_PFX, Has_contents } from './const.js';
/* rot_organic/rot_corpse leaf callees, imported from their C homes. */
import { obfree } from './dokick.js';
import { m_at, do_attack } from './uhitm.js';
import { setmnotwielded, abon as uhitm_abon } from './weapon.js';
import { corpse_xname, otense } from './objnam.js';
import { remove_worn_item } from './steal.js';
import { stop_occupation } from './allmain.js';
import { update_inventory } from './mhitm.js';
import { hideunder } from './mon.js';
import { add_damage, pay_for_damage, shopdig, make_angry_shk } from './shk.js';
import { weight } from './weight.js';
/* dighole()/digactualhole()/fillholetyp()/liquid_flow() — the zap_dig()
 * u.dz!=0 branch (dig.c:1584-1610) and the general-purpose dig-a-hole
 * subsystem it calls (dig.c:884-1023, 639-834, 606-637). */
import { is_pit, is_hole, is_magical_trap, Is_airlevel, Is_waterlevel, Is_botlevel, Is_juiblex_level,
         IS_THRONE, IS_ALTAR, IS_GRAVE, MOAT, POOL, WATER, LAVAPOOL, LAVAWALL,
         DRAWBRIDGE_UP, DRAWBRIDGE_DOWN, GRAVE, PIT, SPIKED_PIT, HOLE, TRAPDOOR,
         LANDMINE, BEAR_TRAP, DB_UNDER, DB_MOAT, DB_LAVA, DB_ICE, DB_FLOOR,
         DBWALL,
         TRAP_EXPLODE, EXPL_MAGICAL, IS_FOUNTAIN, IS_SINK,
         DIGCHECK_PASSED, DIGCHECK_PASSED_PITONLY, DIGCHECK_PASSED_DESTROY_TRAP,
         DIGCHECK_FAIL_ONLADDER, DIGCHECK_FAIL_ONSTAIRS, DIGCHECK_FAIL_THRONE,
         DIGCHECK_FAIL_ALTAR, DIGCHECK_FAIL_AIRLEVEL, DIGCHECK_FAIL_WATERLEVEL,
         DIGCHECK_FAIL_TOOHARD, DIGCHECK_FAIL_UNDESTROYABLETRAP,
         DIGCHECK_FAIL_CANTDIG, DIGCHECK_FAIL_BOULDER,
         DIGCHECK_FAIL_OBJ_POOL_OR_TRAP, DIGCHECK_FAILED, TT_INFLOOR, ICE, MELT_ICE_AWAY,
         NO_TRAP_FLAGS, IS_ROOM, IS_FURNITURE, Is_earthlevel } from './const.js';
import { d } from './rnd.js';
import { IRONBARS, IS_WATERWALL, KILLED_BY, HALF_PHDAM, WEB } from './const.js';
import { nomul } from './hack.js';
import { wake_nearby } from './mon.js';
import { confdir } from './cmd.js';
import { fire_damage } from './trap.js';
import { surface as surface_cmd, ceiling as ceiling_cmd } from './dungeon.js';
import { altar_wrath } from './pray.js';
import { angry_priest } from './priest.js';
import { losehp } from './hack.js';
import { t_at, deltrap, delfloortrap, maketrap, mintrap, cnv_trap_obj } from './trap.js';
import { In_hell } from './dungeon.js';
import { On_stairs, On_ladder, stairway_at } from './stairs.js';
import { Monnam } from './mcastu.js';
import { is_pool_or_lava } from './dbridge.js';
import { pooleffects, switch_terrain, spot_checks } from './hack.js';
import { water_damage_chain } from './trap.js';
import { boulder_hits_pool } from './do.js';
import { impact_drop } from './dokick.js';
import { delobj } from './invent.js';
import { is_drawbridge_wall, find_drawbridge, is_db_wall } from './dbridge.js';
import { hliquid } from './do_name.js';
import { s_suffix } from './hacklib.js';
import { pickup } from './pickup.js';
import { spot_stop_timers, spot_time_left } from './timeout.js';
import { obj_ice_effects } from './mkobj.js';
import { fracture_rock, break_statue } from './zap.js';
import { explode } from './explode.js';
/* get_iter_mons/angry_guards (mon.c, real bodies live in js/mklev.js) and
 * m_canseeu (vision.h, js/dochug.js) -- needed by watch_dig() below
 * (dig.c:1372-1409). PM_WATCHMAN/PM_WATCH_CAPTAIN for its is_watch(ptr) test
 * (mondata.h:159). */
import { get_iter_mons, angry_guards } from './mon.js';
/* C dbridge.c destroy_drawbridge occupant handling (e_died / e_missed). */
import { mon_nam } from './uhitm.js';
import { xkilled } from './mon.js';
import { canspotmon } from './display.js';
import { mondied_dm } from './dogmove.js';
import { nonliving, mhe } from './makemon.js';
import { vtense } from './objnam.js';
import { helpless } from './mhitm.js';
import { done } from './end.js';
import { spoteffects } from './hack.js';
import { XKILL_GIVEMSG, XKILL_NOMSG, XKILL_NOCORPSE, XKILL_NOCONDUCT, CRUSHING, KILLED_BY_AN, PASSES_WALLS } from './const.js';
/* C dbridge.c do_entity()/close_drawbridge() occupant handling. */
import { DROWNING, BURNING, NO_KILLER_PREFIX, WWALKING, SWIMMING, MAGICAL_BREATHING, CONFUSION, STUNNED, FUMBLING,
         OBJ_AT } from './const.js';
import { PM_FIRE_ELEMENTAL, PM_SALAMANDER } from './pm.generated.js';
import { pooleffects_drown, pooleffects_lava_effects } from './cmd.js';
import { enexto_out, teleds, teleport_pet } from './teleport.js';
import { next_to_u } from './apply.js';
import { pooleffects_grounded } from './cmd.js';
import { get_level } from './dungeon.js';
import { migrate_to_level } from './dog.js';
import { count_wsegs } from './worm.js';
import { depth } from './dungeon.js';
import { place_monster } from './steed.js';
import { update_monster_region } from './region.js';
import { block_point } from './vision.js';
import { m_canseeu } from './dochug.js';
import { seetrap, feeltrap } from './trap.js';
import { cansee } from './vision.js';
import { PM_WATCHMAN, PM_WATCH_CAPTAIN, PM_ARCHEOLOGIST, PM_SAMURAI } from './pm.generated.js';
import { mkclass } from './makemon.js';
/* C fountain.c furniture handlers: these bodies are shared with potion.js. */
import { dogushforth, dryup, breaksink } from './fountain.js';
import { welded } from './wield.js';
import { dropx, set_wounded_legs } from './do.js';
import { RIGHT_SIDE } from './const.js';
import { the, xname } from './objnam.js';
import { PM_EARTH_ELEMENTAL, PM_XORN } from './pm.generated.js';







// ── object-type predicates (otyp-based; C is_pick uses oc_skill == P_PICK_AXE) ──
// JS otyp space (u_init.js / m_initweap.js): PICK_AXE = 259, DWARVISH_MATTOCK = 71.
const PICK_AXE = 259;
const DWARVISH_MATTOCK = 71;
const OCLASS_WEAPON = 2;
const OCLASS_TOOL = 6;
const S_ZOMBIE_DIG = 52, S_MUMMY_DIG = 39;

/* C dig.c:1027-1081 dig_up_grave().  The grave arm is reachable from magical
 * and ordinary digging; use canonical corpse creation and monster generation
 * so their timers and placement RNG remain in their owning modules. */
async function dig_up_grave_(x, y) {
    const u = game.u || {};
    exercise(A_WIS, false);
    const role = (game.urole?.mnum ?? -1) | 0;
    const align = u.ualign || {};
    const sign = (align.type | 0) < 0 ? -1 : (align.type | 0) > 0 ? 1 : 0;
    if (role === PM_ARCHEOLOGIST) {
        adjalign(-sign * 3);
        await pline('You feel like a despicable grave-robber!');
    } else if (role === PM_SAMURAI) {
        adjalign(-sign);
        await pline('You disturb the honorable dead!');
    } else if ((align.type | 0) === A_LAWFUL) {
        if ((align.record | 0) > -10) adjalign(-1);
        await pline('You have violated the sanctity of this grave!');
    }
    const loc = game.level?.at(x, y);
    const outcome = loc?.emptygrave ? -1 : rn2(5);
    if (outcome <= 1) {
        await pline('You unearth a corpse.');
        const corpse = await mk_tt_object(CORPSE, x, y);
        if (corpse) corpse.age = (corpse.age | 0) - (TAINT_AGE + 1);
    } else if (outcome === 2) {
        if (!Blind()) await pline(`${_dig_hallucination() ? 'Dude!  The living dead' : "The grave's owner is very upset"}!`);
        await makemon(mkclass(S_ZOMBIE_DIG, 0), x, y, MM_NOMSG);
    } else if (outcome === 3) {
        if (!Blind()) await pline(`${_dig_hallucination() ? 'I want my mummy' : "You've disturbed a tomb"}!`);
        await makemon(mkclass(S_MUMMY_DIG, 0), x, y, MM_NOMSG);
    } else {
        await pline('The grave is unoccupied.  Strange...');
    }
    if (loc) {
        loc.typ = ROOM;
        loc.emptygrave = 0;
        loc.horizontal = false;
    }
    del_engr_at(x, y);
    newsym(x, y);
}

// C ref: include/obj.h:220 is_pick(otmp) — oclass WEAPON/TOOL && oc_skill==P_PICK_AXE.
export function is_pick(obj) {
    if (!obj) return false;
    const oc = obj.oclass | 0;
    if (oc !== OCLASS_WEAPON && oc !== OCLASS_TOOL) return false;
    const t = obj.otyp | 0;
    return t === PICK_AXE || t === DWARVISH_MATTOCK;
}


// C ref: invent.c greatest_erosion(obj) — max(oeroded, oeroded2).  A fresh
// starting pick-axe is un-eroded → 0.
function greatest_erosion(obj) {
    const e1 = obj && obj.oeroded ? (obj.oeroded | 0) : 0;
    const e2 = obj && obj.oeroded2 ? (obj.oeroded2 | 0) : 0;
    return Math.max(e1, e2);
}

// digging context lives on game.context.digging (C: svc.context.digging).
function diggingCtx() {
    const g = game;
    g.context = g.context || {};
    if (!g.context.digging) {
        g.context.digging = { pos: { x: 0, y: 0 }, level: { dnum: 0, dlevel: 0 },
                              down: false, chew: false, warned: false, effort: 0 };
    }
    /* C zeroes svc.context.digging (memset / reset); pos and level are embedded
     * structs there, so they are never absent. */
    const dg = g.context.digging;
    if (!dg.pos) dg.pos = { x: 0, y: 0 };
    if (!dg.level) dg.level = { dnum: 0, dlevel: 0 };
    return dg;
}



// General-purpose digging entry points.
const BY_YOU_ = 'BY_YOU';
const BY_OBJECT_ = null;

// C ref: trap.h undestroyable_trap(ttyp) — MAGIC_PORTAL / VIBRATING_SQUARE.
// js/trap.js:1888 carries the identical predicate but does not export it.
function undestroyable_trap_(ttyp) {
    return ttyp === 17 /* MAGIC_PORTAL */ || ttyp === 23 /* VIBRATING_SQUARE */;
}

function Can_dig_down_(lev) {
    return Can_dig_down_real(lev);
}

// C ref: include/youprop.h:239-240 — #define Levitation ((HLevitation ||
// ELevitation) && !BLevitation).  Local helper, same uprops[] shape set_utrap
// above already ensures exists (see its comment).
function u_prop_(u, key) {
    if (!u.uprops) u.uprops = {};
    if (!u.uprops[key]) u.uprops[key] = { intrinsic: 0, extrinsic: 0, blocked: 0 };
    return u.uprops[key];
}
function Levitation_() {
    const u = game.u || {};
    const p = u_prop_(u, LEVITATION);
    return !!((p.intrinsic | 0) || (p.extrinsic | 0)) && !(p.blocked | 0);
}
// C ref: include/youprop.h:247-254 — a flying steed also grants flight.
function Flying_() {
    const u = game.u || {};
    const p = u_prop_(u, FLYING);
    return !!((p.intrinsic | 0) || (p.extrinsic | 0)
              || (u.usteed && is_flyer_(u.usteed.data))) && !(p.blocked | 0);
}

/* is_flyer(ptr)/is_floater(ptr) — C mondata.h:19-20 macros, needed by
 * digactualhole_'s PIT non-hero-square monster arm below.  js/mhitm.js,
 * js/uhitm.js, js/dokick.js, js/makemon.js and others each already carry an
 * identical unexported copy of one or both (no canonical export reachable
 * from this file); duplicated here for the same reason as is_lava_/is_moat_
 * below — both predicates draw no RNG so duplication cannot desync. */
const DIG_M1_FLY_ = 0x00000001;      /* monflag.h:85 */
const DIG_S_EYE_ = 5, DIG_S_LIGHT_ = 25; /* defsym.h:299/325 */
function is_flyer_(data) { return (((data?.mflags1) | 0) & DIG_M1_FLY_) !== 0; }
function is_floater_(data) { return data?.mlet === DIG_S_EYE_ || data?.mlet === DIG_S_LIGHT_; }

// C ref: rm.h is_lava(x,y) — LAVAPOOL or LAVAWALL.  js/look.js:715 carries an
// identical unexported `_is_lava_local`; duplicated here for the same reason
// as the other small predicates above (look.js is out of this file's edit
// scope, and this predicate draws no RNG so duplication cannot desync).
function is_lava_(x, y) {
    if (!isok(x, y)) return false;
    const lev = game.level?.at(x, y);
    if (!lev) return false;
    const t = lev.typ | 0;
    return t === LAVAPOOL || t === LAVAWALL
        || (t === DRAWBRIDGE_UP && ((lev.drawbridgemask | 0) & DB_UNDER) === DB_LAVA);
}
function is_moat_(x, y) {
    if (!isok(x, y)) return false;
    const lev = game.level?.at(x, y);
    if (!lev) return false;
    if (Is_juiblex_level(game.u?.uz)) return false;
    const t = lev.typ | 0;
    return t === MOAT
        || (t === DRAWBRIDGE_UP && ((lev.drawbridgemask | 0) & DB_UNDER) === DB_MOAT);
}
function is_pool_(x, y) {
    if (!isok(x, y)) return false;
    const lev = game.level?.at(x, y);
    if (!lev) return false;
    const t = lev.typ | 0;
    if (t === POOL || t === MOAT || t === WATER) return true;
    return t === DRAWBRIDGE_UP
        && !Is_juiblex_level(game.u?.uz)
        && ((lev.drawbridgemask | 0) & DB_UNDER) === DB_MOAT;
}

// C ref: mon.c:4357 wake_nearby(petcall).  Digging uses FALSE, so the
// canonical wake_nearto helper supplies the exact ulevel-scaled radius and
// clears nearby monsters' sleeping/meditation state after a crash or splash.
function wake_nearby_(_flag) {
    const u = game.u || {};
    wake_nearto(u.ux | 0, u.uy | 0, (u.ulevel | 0) * 20);
}

// C ref: dungeon.c:1750 surface(x,y) — the full terrain noun (doorway, stairs,
function surface_(x, y) {
    return surface_cmd(x, y);
}

// C ref: dig.c:571-582 furniture_handled(x,y,madeby_u) — TRUE (and handled)
// for fountain/sink/drawbridge; FALSE (untouched) otherwise.  The TRUE arms
// are out of this file's verified scope (dogushforth/breaksink have no js/
// body anywhere in this tree) and throw rather than silently no-op, per Hard
// Rule 2 — they are draws C would make that this port cannot yet reproduce.
async function furniture_handled_(x, y, madeby_u) {
    const lev = game.level?.at(x, y);
    const typ = lev ? (lev.typ | 0) : 0;
    if (IS_FOUNTAIN(typ)) {
        /* C dig.c:573-576: gush first, then force the fountain into its
         * warned state so dryup() performs depletion in this same action. */
        await dogushforth(false);
        if (lev) lev.flags = (lev.flags | 0) | 2; /* FOUNTAIN_IS_WARNED */
        await dryup(x, y, !!madeby_u);
        return true;
    } else if (IS_SINK(typ)) {
        /* C dig.c:577-578: breaking a sink is the fountain.c breaksink path. */
        await breaksink(x, y);
        return true;
    } else if (typ === DRAWBRIDGE_DOWN || is_drawbridge_wall(x, y) >= 0) {
        const bx = { value: x }, by = { value: y };
        find_drawbridge(bx, by);
        await destroy_drawbridge(bx.value, by.value);
        return true;
    }
    return false;
}

// C ref: dig.c:589-599 dig_check(madeby, x, y) — mirrors the C enum via the
// DIGCHECK_* constants already staged in js/const.js (never previously wired
// to a body).  madeby is always BY_YOU_ from this file's only caller
// (zap_dig -> dighole), so the `madeby == BY_OBJECT` altar/pool-trap arms are
// dead by construction here; ported anyway for fidelity since they cost
// nothing extra.
//
// EXPORTED (was file-local): apply.c's do_break_wand WAN_DIGGING arm
// Exporting adds no new caller in THIS file, so this file's own behaviour
export function dig_check_(madeby, x, y) {
    const ttmp = t_at(x, y);
    const lev = game.level?.at(x, y);
    const typ = lev ? (lev.typ | 0) : 0;
    if (On_stairs(x, y)) {
        const stway = stairway_at(x, y);
        return (stway && stway.isladder) ? DIGCHECK_FAIL_ONLADDER : DIGCHECK_FAIL_ONSTAIRS;
    } else if (IS_THRONE(typ) && madeby !== BY_OBJECT_) {
        return DIGCHECK_FAIL_THRONE;
    } else if (IS_ALTAR(typ)
               && (madeby !== BY_OBJECT_
                   || (altarmask_at(x, y) & AM_SANCTUM) !== 0)) {
        return DIGCHECK_FAIL_ALTAR;
    } else if (Is_airlevel(game.u?.uz)) {
        return DIGCHECK_FAIL_AIRLEVEL;
    } else if (Is_waterlevel(game.u?.uz)) {
        return DIGCHECK_FAIL_WATERLEVEL;
    } else if (IS_OBSTRUCTED(typ) && typ !== SDOOR
               && lev && ((lev.wall_info | 0) & W_NONDIGGABLE) !== 0) {
        return DIGCHECK_FAIL_TOOHARD;
    } else if (ttmp && undestroyable_trap_(ttmp.ttyp)) {
        return DIGCHECK_FAIL_UNDESTROYABLETRAP;
    } else if (!Can_dig_down_(game.u?.uz) && !(lev && lev.candig)) {
        if (ttmp) {
            return (!is_hole(ttmp.ttyp) && !is_pit(ttmp.ttyp))
                   ? DIGCHECK_PASSED_DESTROY_TRAP : DIGCHECK_FAIL_CANTDIG;
        }
        return DIGCHECK_PASSED_PITONLY;
    } else if (sobj_at(BOULDER, x, y)) {
        return DIGCHECK_FAIL_BOULDER;
    } else if (madeby === BY_OBJECT_ && (ttmp || is_pool_or_lava(x, y))) {
        return DIGCHECK_FAIL_OBJ_POOL_OR_TRAP;
    }
    return DIGCHECK_PASSED;
}

// C ref: dig.c:1361-1364 watchman_canseeu(mtmp) — a peaceful watch/watch
// captain who can see and sees the hero.  RNG-FREE.  is_watch(ptr) duplicated
// locally (mondata.h:159) rather than imported: js/mklev.js's own copy
// (is_watch_sm) is file-local, and this file's edit scope is js/dig.js only
// (same rationale as conjoined_pits_dg/Levitation_/Flying_ above — the
// predicate draws no RNG so the duplication cannot desync).
function is_watch_dg(ptr) {
    const ix = (ptr?.pmidx ?? -1) | 0;
    return ix === PM_WATCHMAN || ix === PM_WATCH_CAPTAIN;
}
function watchman_canseeu_dg(mtmp) {
    return !!(is_watch_dg(mtmp.data) && (mtmp.mcansee | 0) && m_canseeu(mtmp)
              && (mtmp.mpeaceful | 0));
}

// C dig.c:1762-1837: check the surface above a proposed adjacent pit.
function adj_pit_checks(cc, msg) {
    if (!cc || !isok(cc.x, cc.y)) return false;
    msg.text = '';
    const room = game.level.at(cc.x, cc.y);
    const ltyp = room.typ;
    // Preserve C's order: flags aliases doormask/wall_info/drawbridgemask,
    // so this also clears those bits BEFORE the tests below.
    room.flags = 0;
    const foundation = 'The foundation is too hard to dig through from this angle.';
    if (is_pool(cc.x, cc.y) || is_lava_(cc.x, cc.y)) {
        return false;
    } else if (closed_door(cc.x, cc.y) || room.typ === SDOOR) {
        msg.text = foundation;
        return false;
    } else if (IS_WALL(ltyp)) {
        msg.text = foundation;
        return false;
    } else if (IS_TREE(ltyp)) {
        msg.text = "The tree's roots glow then fade.";
        return false;
    } else if (ltyp === STONE || ltyp === SCORR) {
        if (room.wall_info & W_NONDIGGABLE) {
            msg.text = 'The rock glows then fades.';
            return false;
        }
    } else if (ltyp === IRONBARS) {
        msg.text = 'The bars go much deeper than your pit.';
        return false;
    } else if (IS_SINK(ltyp)) {
        msg.text = 'A tangled mass of plumbing remains below the sink.';
        return false;
    } else if (On_ladder(cc.x, cc.y)) {
        msg.text = 'The ladder is unaffected.';
        return false;
    } else {
        let supporting = null;
        if (IS_FOUNTAIN(ltyp)) supporting = 'fountain';
        else if (IS_THRONE(ltyp)) supporting = 'throne';
        else if (IS_ALTAR(ltyp)) supporting = 'altar';
        else if (On_stairs(cc.x, cc.y)) supporting = 'stairs';
        else if (ltyp === DRAWBRIDGE_DOWN || ltyp === DBWALL)
            supporting = 'drawbridge';
        if (supporting) {
            msg.text = `The ${s_suffix(supporting)} supporting structures remain intact.`;
            return false;
        }
    }
    return true;
}

// C dig.c:1843-1882: save the links before liquid_flow deletes the trap
// and clears its neighbors' conjoined bits, then flood in direction order.
async function pit_flow(trap, filltyp) {
    if (trap && filltyp !== ROOM && is_pit(trap.ttyp)) {
        const t = { ...trap };
        const room = game.level.at(t.tx, t.ty);
        room.typ = filltyp;
        room.flags = 0;
        await liquid_flow_(t.tx, t.ty, filltyp, trap, u_at_(t.tx, t.ty)
            ? 'Suddenly %s flows in from the adjacent pit!' : null);
        for (let idx = 0; idx < N_DIRS; ++idx) {
            if (t.conjoined & (1 << idx))
                await pit_flow(t_at(t.tx + xdir[idx], t.ty + ydir[idx]), filltyp);
        }
    }
}

// C dig.c:1617-1668,1740-1749: the pit-only horizontal zap path. zap.js
// supplies the trap found before its unconditional rn1(18, 8) depth draw.
export async function zap_dig_pit(trap_with_u, digdepth) {
    const u = game.u;
    const diridx = xytodir(u.dx, u.dy);
    let zx = u.ux + u.dx, zy = u.uy + u.dy;
    let flow_x = -1, flow_y = -1, pitflow = false;
    tmp_at(DISP_BEAM, 4083 /* cmap_to_glyph(S_digbeam) */); /* C dig.c:1623 */
    while (--digdepth >= 0) {
        if (!isok(zx, zy)) break;
        tmp_at(zx, zy); /* C dig.c:1629 (nh_delay_output is pacing only) */
        let adjpit = t_at(zx, zy);
        if (diridx !== DIR_ERR && !conjoined_pits_dg(adjpit, trap_with_u, false)) {
            if (!(adjpit && is_pit(adjpit.ttyp))) {
                const cc = { x: zx, y: zy }, msg = { text: '' };
                if (!adj_pit_checks(cc, msg)) {
                    if (msg.text) await pline(msg.text);
                } else {
                    await dighole(true, true, cc);
                    adjpit = t_at(zx, zy);
                }
            }
            if (adjpit && is_pit(adjpit.ttyp)) {
                trap_with_u.conjoined |= 1 << diridx;
                adjpit.conjoined |= 1 << DIR_180(diridx);
                flow_x = zx;
                flow_y = zy;
                pitflow = true;
            }
            if (is_pool(zx, zy) || is_lava_(zx, zy)) {
                flow_x = zx - u.dx;
                flow_y = zy - u.dy;
                pitflow = true;
            }
            break;
        }
        zx += u.dx;
        zy += u.dy;
    }
    tmp_at(DISP_END, 0); /* C dig.c:1743 closing call: newsym()s the beam cells */
    if (pitflow && isok(flow_x, flow_y)) {
        const ttmp = t_at(flow_x, flow_y);
        if (ttmp && is_pit(ttmp.ttyp)) {
            const filltyp = fillholetyp_(ttmp.tx, ttmp.ty, true);
            if (filltyp !== ROOM) await pit_flow(ttmp, filltyp);
        }
    }
}

// C youprop.h:125 Deaf — flat u.HDeaf/u.EDeaf/u.uroleplay.deaf read, the same
// duplication rationale as is_watch_dg above (js/music.js's real Deaf() is
// file-local, not exported).
function Deaf_dg() {
    const u = game.u || {};
    return (u.HDeaf | 0) !== 0 || !!(u.uprops?.[DEAF]?.extrinsic | 0)
        || !!(u.uroleplay && u.uroleplay.deaf);
}

// C ref: dig.c:1372-1409 watch_dig(mtmp, x, y, zap) — Town Watchmen frown on
// damage to the town walls, trees or fountains (digging holes in the ground
// is fine).  mtmp is assumed a watchman if 0; zap is TRUE for wand/spell of
// digging, FALSE for chewing.  RNG-FREE.
//
// EXPORTED under C's own name: had no js/ body anywhere in this tree (the
// only two callers, mklev.js's mdig_tunnel and hack.c's dig-related move
// handling, already call it by this name in comments). apply.c's
// do_break_wand WAN_DIGGING arm (js/cmd.js, apply.c:4034-4056) is the
export async function watch_dig(mtmp, x, y, zap) {
    const lev = game.level?.at(x, y);
    const typ = lev ? (lev.typ | 0) : 0;
    if (in_town(x, y)
        && (closed_door(x, y) || typ === SDOOR || IS_WALL(typ)
            || IS_FOUNTAIN(typ) || IS_TREE(typ))) {
        if (!mtmp) mtmp = get_iter_mons(watchman_canseeu_dg);
        if (mtmp) {
            // C: SetVoice(mtmp, 0, 80, 0) -- sound/voice channel, a no-op
            // everywhere in this port (no sound driver).
            const d = diggingCtx();
            if (zap || d.warned) {
                await pline('"Halt, vandal!  You\'re under arrest!"');
                await angry_guards(!!Deaf_dg());
            } else {
                let str;
                if (IS_DOOR(typ)) str = 'door';
                else if (IS_TREE(typ)) str = 'tree';
                else if (IS_OBSTRUCTED(typ)) str = 'wall';
                else str = 'fountain';
                await pline(`"Hey, stop damaging that ${str}!"`);
                d.warned = true;
            }
            if (is_digging()) await stop_occupation();
        }
    }
}

// C ref: dig.c:606-637 fillholetyp(x,y,fill_if_any) — return the liquid typ
// (LAVAPOOL/MOAT/POOL) to fill a new hole with, or ROOM if none.
//
// EXPORTED (was file-local): apply.c's do_break_wand WAN_DIGGING arm
// Exporting adds no new caller in THIS file, so this file's own behaviour
export function fillholetyp_(x, y, fill_if_any) {
    const lo_x = Math.max(1, x - 1), hi_x = Math.min(x + 1, 79 /* COLNO-1 */);
    const lo_y = Math.max(0, y - 1), hi_y = Math.min(y + 1, 20 /* ROWNO-1 */);
    let pool_cnt = 0, moat_cnt = 0, lava_cnt = 0;
    for (let x1 = lo_x; x1 <= hi_x; x1++) {
        for (let y1 = lo_y; y1 <= hi_y; y1++) {
            if (is_moat_(x1, y1)) moat_cnt++;
            else if (is_pool_(x1, y1)) pool_cnt++;
            else if (is_lava_(x1, y1)) lava_cnt++;
        }
    }
    if (!fill_if_any) pool_cnt = (pool_cnt / 3) | 0;

    if (lava_cnt > moat_cnt + pool_cnt && rn2(lava_cnt + 1))
        return LAVAPOOL;
    else if (lava_cnt && fill_if_any)
        return LAVAPOOL;
    else if (moat_cnt > 0 && rn2(moat_cnt + 1))
        return MOAT;
    else if (moat_cnt && fill_if_any)
        return MOAT;
    else if (pool_cnt > 0 && rn2(pool_cnt + 1))
        return POOL;
    else if (pool_cnt && fill_if_any)
        return POOL;
    return ROOM;
}

// C ref: dig.c:838-879 liquid_flow(x,y,typ,ttmp,fillmsg) — called from
// dighole() (and, in C, do_break_wand()/do_earthquake()).  The LAVAPOOL arm
// throws: fire_damage_chain has no js/ body anywhere in this tree
// (js/potion.js:3873 already throws for the same missing subsystem), so this
// file cannot silently guess its RNG shape.  C's leading sanity guard
// (!is_pool_or_lava(x,y) -> impossible()+return) is diagnostic-only (no
// RNG/state) and skipped, same convention as digactualhole_'s impossible()
// skip above.
//
// EXPORTED (was file-local): apply.c's do_break_wand WAN_DIGGING arm
// The `else if (mon) minliquid(mon)` arm (dig.c:876-877) used to be dead code
// here because this file's only caller (dighole(), always at the hero's own
// square) made u_spot unconditionally true; do_break_wand's 9-direction loop
// can hit an adjacent square instead, so it is ported for real now rather
// than left as a comment.  Exporting/completing this adds no new caller in
// numbers are unchanged; wiring the cmd.js caller is a separate,
export async function liquid_flow_(x, y, typ, ttmp, fillmsg) {
    const u_spot = u_at_(x, y);
    if (ttmp) await delfloortrap(ttmp);
    obj_ice_effects(x, y, true);
    await unearth_objs(x, y);
    if (fillmsg) await pline(fillmsg, hliquid(typ === LAVAPOOL ? 'lava' : 'water'));
    const objchain = floorObjsAt_(x, y);
    if (objchain) {
        if (typ === LAVAPOOL) {
            await fire_damage_chain(objchain, true, true, x, y);
        } else {
            await water_damage_chain(objchain, true);
        }
    }
    if (u_spot) {
        await pooleffects(false);
    } else {
        const mon = m_at(x, y);
        if (mon) await minliquid(mon);
    }
}
function u_at_(x, y) { return game.u && (game.u.ux | 0) === x && (game.u.uy | 0) === y; }
// pointer.  js/mklev.js:4517-4524 sobj_at() documents the JS mirror as
// game.level.levelObjects[x][y]; this file has no existing standalone helper
// for "objects at (x,y)" so it is duplicated here rather than importing
// sobj_at's un-exported walk.
function floorObjsAt_(x, y) {
    return game.level?.levelObjects?.[x]?.[y] ?? null;
}

// C ref: dig.c:639-834 digactualhole(x,y,madeby,ttyp) — create the actual
// PIT/HOLE trap and its immediate consequences, including landing effects
// after the hero falls onto the destination level.
//
// EXPORTED (was file-local): apply.c's do_break_wand WAN_DIGGING arm
// Exporting adds no new caller in THIS file, so this file's own behaviour
export async function digactualhole_(x, y, madeby, ttyp) {
    const g = game;
    const u = g.u || {};
    const madeby_u = madeby === BY_YOU_;
    const madeby_obj = madeby === BY_OBJECT_;
    const heros_fault = madeby_u || madeby_obj;
    const at_u = u_at_(x, y);
    /* C: struct monst *mtmp = m_at(x, y); -- "may be madeby" -- computed once
     * at function entry, used only by the PIT non-hero-square arm below. */
    const mtmp = m_at(x, y);
    let wont_fall = Levitation_() || Flying_();

    if (at_u && (u.utrap | 0)) {
        if ((u.utraptype | 0) === TT_BURIEDBALL) {
            await buried_ball_to_punishment();
        } else if ((u.utraptype | 0) === TT_INFLOOR) {
            /* C: reset_utrap(FALSE) == set_utrap(0,0) with msg=FALSE (no
             * float_up()/"can fly" feedback on the newly-untrapped case,
             * dig.c:648-651 + trap.c:1044-1054); this file's own set_utrap()
             * already ports the set_utrap(0,0) half faithfully (SET_BOTL +
             * float_vs_flight), so reuse it rather than hand-rolling. */
            set_utrap(0, 0);
        }
    }

    if (await furniture_handled_(x, y, madeby_u))
        return;

    const lev = g.level?.at(x, y);
    if (ttyp !== PIT && !Can_dig_down_(u.uz) && !(lev && lev.candig)) {
        ttyp = PIT; /* C: impossible() + force PIT — this port skips the
                       impossible() message (diagnostic only, no RNG/state). */
    }

    const old_typ = lev ? (lev.typ | 0) : 0;
    const shopdoor = IS_DOOR(old_typ) && in_rooms(x, y, SHOPBASE)[0];
    const oldobjs = floorObjsAt_(x, y);

    let surface_type, furniture = '', old_aligntyp = 0;
    if (IS_FURNITURE(old_typ)) {
        surface_type = (IS_ROOM(old_typ) && !Is_earthlevel(u.uz)) ? 'floor' : 'ground';
        if (IS_ALTAR(old_typ)) {
            old_aligntyp = Amask2align(((lev.altarmask ?? lev.flags) | 0) & AM_MASK);
            furniture = align_str(old_aligntyp) + ' ';
        }
        furniture += surface_(x, y);
    } else {
        surface_type = surface_(x, y); /* computed before maketrap (dig.c:626-637) */
    }
    const ttmp = await maketrap(x, y, ttyp);
    if (!ttmp) return;
    const newobjs = floorObjsAt_(x, y);
    ttmp.madeby_u = heros_fault;
    ttmp.tseen = 0;
    /* dig.c:657-660 */
    if (cansee(x, y))
        seetrap(ttmp);
    else if (madeby_u)
        feeltrap(ttmp);

    /* dig.c:653-669 — the hero/monster dig message (furniture/altar
     * arms and cansee-only arms remain unported). */
    {
        const tname = trapname(ttyp, true);
        const in_thru = ttyp === HOLE ? 'through' : 'in';
        if (madeby_u) {
            if (x !== (u.ux | 0) || y !== (u.uy | 0))
                await pline('You dig an adjacent %s.', tname);
            else
                await pline('You dig %s %s the %s.', an(tname), in_thru, surface_type);
        } else if (!madeby_obj && canseemon(madeby)) {
            await pline('%s digs %s %s the %s.', Monnam(madeby), an(tname),
                in_thru, surface_type);
        } else if (cansee(x, y) && game.flags?.verbose) {
            /* C dig.c:660-666 */
            if (IS_STWALL(old_typ))
                await pline('The %s crumbles into %s.', surface_type, an(tname));
            else
                await pline('%s appears in the %s.', An(tname), surface_type);
        }
    }
    /* C dig.c:670-671 */
    if (IS_FURNITURE(old_typ) && cansee(x, y))
        await pline('The %s falls into the %s!', furniture, trapname(ttyp, true));
    /* C dig.c:673-674 — wrath follows altar destruction message */
    if (heros_fault && IS_ALTAR(old_typ))
        await desecrate_altar(false, old_aligntyp);

    if (ttyp === PIT) {
        if (shopdoor && heros_fault) await pay_for_damage('ruin', false);
        else add_damage(x, y, heros_fault ? 100 /* SHOP_PIT_COST, hack.h:81 */ : 0);
        if (madeby_u) wake_nearby_(false);
        await switch_terrain();
        if (Levitation_() || Flying_()) wont_fall = true;

        if (at_u) {
            if (!wont_fall) {
                set_utrap(rn1(4, 2), TT_PIT);
                g.vision_full_recalc = 1;
            } else {
                /* C dig.c:742 reset_utrap(TRUE) */
                await reset_utrap(true);
            }
            if (oldobjs !== newobjs) await pickup(1);
        } else if (mtmp) {
            /* C dig.c:745-751: a monster (not the hero) is standing on the
             * new pit's square. */
            if (is_flyer_(mtmp.data) || is_floater_(mtmp.data)) {
                if (canseemon(mtmp)) {
                    await pline('%s %s over the pit.', Monnam(mtmp),
                        is_flyer_(mtmp.data) ? 'flies' : 'floats');
                }
            } else if (mtmp !== madeby) {
                await mintrap(mtmp, NO_TRAP_FLAGS);
            }
        }
    } else { /* was TRAPDOOR now a HOLE */
        if (at_u) {
            await switch_terrain();
            if (Levitation_() || Flying_()) wont_fall = true;

            // C dig.c:762 / apply.c:888-926: first pull leashed pets next to us.
            if (!u.ustuck && !wont_fall && !(await next_to_u())) {
                await pline('You are jerked back by your pet!');
                wont_fall = true;
            }

            if (u.ustuck || wont_fall) {
                if (newobjs) await impact_drop(null, x, y, 0);
                if (oldobjs !== newobjs) await pickup(1);
                if (shopdoor && heros_fault) await pay_for_damage('ruin', false);
            } else {
                if (heros_fault && u.ushops && (Array.isArray(u.ushops) ? u.ushops[0] : u.ushops))
                    await shopdig(1);
                else
                    await pay_for_damage('dig into', true);
                await pline('You fall through...');
                const newlevel = {
                    dnum: u.uz.dnum | 0,
                    dlevel: (u.uz.dlevel | 0) + 1,
                };
                await goto_level(newlevel, false, true, false);
                /* C dig.c:792-793: process landing traps and terrain without
                 * repeating goto_level's arrival pickup. */
                await spoteffects(false);
            }
        } else {
            /* C dig.c:819-848: objects get a chance to fall, then a monster
             * on the new hole migrates SILENTLY to the level below.  This is
             * not trapeffect_hole_mon/mlevel_tele_trap: no "Suddenly, %s
             * falls into a hole." message, and the destination is
             * depth+1, not the hole's trap->dst. */
            if (shopdoor && heros_fault)
                await pay_for_damage('ruin', false);
            if (newobjs)
                await impact_drop(null, x, y, 0);
            if (mtmp) {
                /*[don't we need special sokoban handling here?]*/
                if (!pooleffects_grounded(mtmp.data)
                    || ((mtmp.wormno | 0) && count_wsegs(mtmp) > 5)
                    || (mtmp.data.msize | 0) >= 4 /* MZ_HUGE */)
                    return;
                if (mtmp === u.ustuck) /* probably a vortex */
                    return;           /* temporary? kludge */

                if (await teleport_pet(mtmp, false)) {
                    let tolevel;

                    if (Is_stronghold(u.uz)) {
                        const valley = game.valley_level;
                        tolevel = { dnum: valley.dnum | 0, dlevel: valley.dlevel | 0 };
                    } else if (Is_botlevel(u.uz)) {
                        if (canseemon(mtmp))
                            await pline('%s avoids the trap.', Monnam(mtmp));
                        return;
                    } else {
                        tolevel = get_level(depth(u.uz) + 1);
                    }
                    /* C dig.c:821-822: anger the shopkeeper before migration. */
                    if (mtmp.isshk)
                        await make_angry_shk(mtmp, 0, 0);
                    await migrate_to_level(mtmp,
                        (tolevel.dlevel | 0)
                            + (game.dungeons?.[tolevel.dnum | 0]?.ledger_start | 0),
                        0 /* MIGR_RANDOM */, null);
                }
            }
        }
    }
}


// C ref: dig.c:884-1023 dighole(pit_only, by_magic, cc) — the general-purpose
// dig-a-hole entry point.  Called from zap_dig() as dighole(FALSE,TRUE,NULL).
async function dighole(pit_only, by_magic, cc) {
    const g = game;
    const u = g.u || {};
    let dig_x, dig_y;
    if (!cc) {
        dig_x = u.ux | 0; dig_y = u.uy | 0;
    } else {
        dig_x = cc.x; dig_y = cc.y;
        if (!isok(dig_x, dig_y)) return false;
    }

    const ttmp = t_at(dig_x, dig_y);
    const lev = g.level?.at(dig_x, dig_y);
    const digCheckResult = dig_check_(BY_YOU_, dig_x, dig_y);
    const nohole = (digCheckResult === DIGCHECK_FAIL_CANTDIG || digCheckResult === DIGCHECK_FAIL_TOOHARD);
    const old_typ = lev ? (lev.typ | 0) : 0;
    let retval = false;

    if ((ttmp && (undestroyable_trap_(ttmp.ttyp) || nohole))
        || (IS_OBSTRUCTED(old_typ) && old_typ !== SDOOR
            && lev && ((lev.wall_info | 0) & W_NONDIGGABLE) !== 0)) {
        await pline('The %s %shere is too hard to dig in.', surface_(dig_x, dig_y),
                    (dig_x !== u.ux || dig_y !== u.uy) ? 't' : '');
    } else if (ttmp && is_magical_trap(ttmp.ttyp)) {
        await explode(dig_x, dig_y, 0, 20 + d(3, 6), TRAP_EXPLODE, EXPL_MAGICAL);
        deltrap(ttmp);
        newsym(dig_x, dig_y);
    } else if (is_pool_or_lava(dig_x, dig_y)) {
        await pline('The %s sloshes furiously for a moment, then subsides.',
                    hliquid(is_lava_(dig_x, dig_y) ? 'lava' : 'water'));
        wake_nearby(false);
    } else if (old_typ === DRAWBRIDGE_DOWN || is_drawbridge_wall(dig_x, dig_y) >= 0) {
        if (pit_only) {
            await pline('The drawbridge seems too hard to dig through.');
        } else {
            // C dig.c:937-940: the portcullis is adjacent to the bridge.
            const bx = { value: dig_x }, by = { value: dig_y };
            find_drawbridge(bx, by);
            await destroy_drawbridge(bx.value, by.value);
            retval = true;
        }
    } else if (sobj_at(BOULDER, dig_x, dig_y)) {
        const boulder_here = sobj_at(BOULDER, dig_x, dig_y);
        if (ttmp && is_pit(ttmp.ttyp) && rn2(2)) {
            await pline('The boulder settles into the %spit.',
                        (dig_x !== u.ux || dig_y !== u.uy) ? 'adjacent ' : '');
            ttmp.ttyp = PIT;
        } else {
            await pline('KADOOM!  The boulder falls in!');
            wake_nearby(false);
            await delfloortrap(ttmp);
        }
        await delobj(boulder_here);
    } else if (IS_GRAVE(old_typ)) {
        // C dig.c:959-962: digactualhole(PIT) first, then dig_up_grave(cc), retval = TRUE
        await digactualhole_(dig_x, dig_y, BY_YOU_, PIT);
        await dig_up_grave_(dig_x, dig_y);
        retval = true;
    } else if (old_typ === DRAWBRIDGE_UP) {
        const typ = fillholetyp_(dig_x, dig_y, false);
        if (typ === ROOM) {
            await pline('The %s %shere is too hard to dig in.', surface_(dig_x, dig_y),
                        (dig_x !== u.ux || dig_y !== u.uy) ? 't' : '');
        } else {
            if (lev) {
                lev.drawbridgemask = (lev.drawbridgemask | 0) & ~DB_UNDER;
                lev.drawbridgemask = (lev.drawbridgemask | 0) | (typ === LAVAPOOL ? DB_LAVA : DB_MOAT);
            }
            await liquid_flow_(dig_x, dig_y, typ, ttmp, 'As you dig, the hole fills with %s!');
            retval = true;
        }
    } else if (IS_THRONE(old_typ)) {
        await pline('The throne is too hard to break apart.');
    } else if (IS_ALTAR(old_typ)) {
        await pline('The altar is too hard to break apart.');
    } else {
        const typ = fillholetyp_(dig_x, dig_y, false);
        if (lev) lev.flags = 0;
        if (typ !== ROOM) {
            if (!(await furniture_handled_(dig_x, dig_y, true))) {
                if (lev) lev.typ = typ;
                await liquid_flow_(dig_x, dig_y, typ, ttmp, 'As you dig, the hole fills with %s!');
            }
            retval = true;
        } else {
            if (by_magic && ttmp && (ttmp.ttyp === LANDMINE || ttmp.ttyp === BEAR_TRAP)) {
                /* C dig.c:1006, 1009-1010, trap.c:5341-5372: conversion also
                 * releases trapped occupants before the hole is created. */
                const LAND_MINE = 243;
                const BEARTRAP = 244;
                const trap_obj = (ttmp.ttyp === LANDMINE) ? LAND_MINE : BEARTRAP;
                await cnv_trap_obj(trap_obj, 1, ttmp, true);
            }
            if (nohole || pit_only
                || digCheckResult === DIGCHECK_PASSED_DESTROY_TRAP
                || digCheckResult === DIGCHECK_PASSED_PITONLY) {
                await digactualhole_(dig_x, dig_y, BY_YOU_, PIT);
            } else {
                await digactualhole_(dig_x, dig_y, BY_YOU_, HOLE);
            }
            retval = true;
        }
    }
    spot_checks(dig_x, dig_y, old_typ);
    return retval;
}
export { dighole };

// C ref: dig.c:300 dig(void) — the occupation callback, run once per turn by the
// moveloop occupation driver.  Returns 1 while still digging, 0 when done.
// C ref: dig.c:253-296 digcheck_fail_message(digresult, madeby=BY_YOU, x, y)
async function digcheck_fail_message_(digresult, x, y, tool) {
    const uw = game.u?.uwep || tool;
    const verb = (uw && is_axe(uw)) ? 'chop' : 'dig in';
    switch (digresult) {
    case DIGCHECK_FAIL_AIRLEVEL: await pline('You cannot %s thin air.', verb); break;
    case DIGCHECK_FAIL_ALTAR: await pline('The altar is too hard to break apart.'); break;
    case DIGCHECK_FAIL_BOULDER: await pline("There isn't enough room to %s here.", verb); break;
    case DIGCHECK_FAIL_ONLADDER: await pline('The ladder resists your effort.'); break;
    case DIGCHECK_FAIL_ONSTAIRS: await pline('The stairs are too hard to %s.', verb); break;
    case DIGCHECK_FAIL_THRONE: await pline('The throne is too hard to break apart.'); break;
    case DIGCHECK_FAIL_CANTDIG:
    case DIGCHECK_FAIL_TOOHARD:
    case DIGCHECK_FAIL_UNDESTROYABLETRAP:
        await pline('The %s here is too hard to %s.', surface_(x, y), verb); break;
    case DIGCHECK_FAIL_WATERLEVEL: await pline('The %s splashes and subsides.', hliquid('water')); break;
    default: break;
    }
}

export async function dig() {
    const g = game;
    const u = g.u || {};
    const d = diggingCtx();
    // C dig.c:304,365: the current weapon supplies the digging bonuses.
    const tool = u.uwep;
    /* C dig.c:309-315 — "perhaps a nymph stole your pick-axe while you were
     * busy digging, or perhaps you teleported away": end the occupation
     * silently when swallowed, the pick is gone, the hero left the dig level,
     * or (digging down) the hero is no longer on the dig square / (sideways)
     * no longer adjacent to it. */
    {
        const uw = u.uwep;
        const dlv = d.level || {}, uz = u.uz || {};
        const onLevel = (dlv.dnum | 0) === (uz.dnum | 0)
                        && (dlv.dlevel | 0) === (uz.dlevel | 0);
        const dpx0 = d.pos.x | 0, dpy0 = d.pos.y | 0;
        const moved = d.down
            ? (dpx0 !== (u.ux | 0) || dpy0 !== (u.uy | 0))
            : (Math.abs(dpx0 - (u.ux | 0)) > 1 || Math.abs(dpy0 - (u.uy | 0)) > 1);
        if (u.uswallow || !uw || (!is_pick(uw) && !is_axe(uw))
            || !onLevel || moved)
            return 0;
    }

    /* C dig.c:317-322 — digging down: dig_check on the hero's square. */
    let dcresult = DIGCHECK_PASSED;
    if (d.down) {
        dcresult = dig_check_(BY_YOU_, u.ux | 0, u.uy | 0);
        if (dcresult >= DIGCHECK_FAILED) {
            await digcheck_fail_message_(dcresult, u.ux | 0, u.uy | 0, tool);
            return 0;
        }
    }

    /* C dig.c:326-334 — the horizontal-dig nondiggable checks, before the
     * Fumbling test and before any effort is added. */
    if (!d.down) {
        const dpx0 = d.pos.x | 0, dpy0 = d.pos.y | 0;
        const lev0 = g.level && g.level.at ? g.level.at(dpx0, dpy0) : null;
        const uw = u.uwep || tool;
        const verb = (!uw || is_pick(uw)) ? 'dig into' : 'chop through';
        if (lev0 && IS_TREE(lev0.typ) && !may_dig(dpx0, dpy0)
            && dig_typ(uw, dpx0, dpy0) === DIGTYP_TREE) {
            await pline('This tree seems to be petrified.');
            return 0;
        }
        if (lev0 && IS_OBSTRUCTED(lev0.typ) && !may_dig(dpx0, dpy0)
            && dig_typ(uw, dpx0, dpy0) === DIGTYP_ROCK) {
            await pline('This %s is too hard to %s.',
                        is_db_wall(dpx0, dpy0) ? 'drawbridge' : 'wall', verb);
            return 0;
        }
    }

    /* C dig.c:336-362: a fumble ends this attempt without adding effort. */
    const fumbling = u_prop_(u, FUMBLING);
    if ((fumbling.intrinsic || fumbling.extrinsic) && !rn2(3)) {
        switch (rn2(3)) {
        case 0:
            if (!welded(u.uwep)) {
                await pline('You fumble and drop %s.', yname(u.uwep));
                await dropx(u.uwep);
            } else {
                if (u.usteed)
                    await pline('%s and %s %s!', Yobjnam2(u.uwep, 'bounce'), otense(u.uwep, 'hit'), mon_nam(u.usteed));
                else
                    await pline('Ouch!  %s and %s you!', Yobjnam2(u.uwep, 'bounce'), otense(u.uwep, 'hit'));
                set_wounded_legs(RIGHT_SIDE, 5 + rnd(5));
            }
            break;
        case 1:
            await pline('Bang!  You hit with the broad side of %s!', the(xname(u.uwep)));
            wake_nearby(false);
            break;
        default:
            await pline('Your swing misses its mark.');
        }
        return 0;
    }

    /* C dig.c:365-366 — effort += 10 + rn2(5) + abon() + uwep->spe
     *                              - greatest_erosion(uwep) + u.udaminc. */
    d.effort += 10 + rn2(5) + abon() + (tool.spe | 0)
              - greatest_erosion(tool) + (u.udaminc | 0);
    /* C dig.c:367-368 — dwarves dig twice as fast (Race_if(PM_DWARF)). */
    if (g.urace && (g.urace.mnum | 0) === PM_DWARF_)
        d.effort *= 2;

    if (d.down) {
        /* C dig.c:372-378 — effort > 250 → full hole (not reached: pit first). */
        const ttmp = t_at(d.pos.x | 0, d.pos.y | 0);
        if (d.effort > 250 || (ttmp && ttmp.ttyp === HOLE)) {
            await dighole(false, false, null);
            d.effort = d.lastdigtime = 0; d.pos = { x: 0, y: 0 }; d.level = { dnum: 0, dlevel: 0 };
            d.down = false; d.chew = false; d.warned = false; d.quiet = false;
            return 0; /* done with digging */
        }
        /* C dig.c:380-382 — effort <= 50, or already in a pit/trapdoor → keep
         * digging (the pit is made once; further turns only add effort). */
        if (d.effort <= 50 || (ttmp && (ttmp.ttyp === TRAPDOOR || is_pit(ttmp.ttyp)))) {
            return 1;
        }
        // C dig.c:383-425: trigger set traps, or chop an occupied bear trap.
        if (ttmp && (ttmp.ttyp === LANDMINE || (ttmp.ttyp === BEAR_TRAP && !u.utrap))) {
            await dotrap(ttmp, FORCETRAP);
            d.effort = d.lastdigtime = 0; d.pos = { x: 0, y: 0 }; d.level = { dnum: 0, dlevel: 0 };
            d.down = false; d.chew = false; d.warned = false; d.quiet = false;
            return 0;
        } else if (ttmp && ttmp.ttyp === BEAR_TRAP && u.utrap) {
            if (rnl(7) > ((fumbling.intrinsic || fumbling.extrinsic) ? 1 : 4)) {
                let dmg = dmgval(u.uwep, g.youmonst) + dbon();
                if (dmg < 1) dmg = 1;
                else if (u.uarmf) dmg = Math.trunc((dmg + 1) / 2);
                await pline('You hit yourself in the %s.', body_part(FOOT));
                const hp = u_prop_(u, HALF_PHDAM);
                if (hp.intrinsic || hp.extrinsic) dmg = Math.trunc((dmg + 1) / 2);
                await losehp(dmg, `chopping off ${g.flags?.female ? 'her' : 'his'} own ${body_part(FOOT)}`, KILLED_BY);
            } else {
                await pline('You destroy the bear trap with %s.', yobjnam(u.uwep, null));
                deltrap(ttmp);
                await reset_utrap(true);
            }
            d.effort = 0;
            return 0;
        } else if (ttmp && dcresult === DIGCHECK_PASSED_DESTROY_TRAP) {
            const name = trapname(ttmp.ttyp, false);
            if (is_pick(u.uwep))
                await pline('You destroy %s with %s.', ttmp.tseen ? the(name) : an(name), yobjnam(u.uwep, null));
            deltrap(ttmp);
            d.effort = 0;
            return 0;
        }
        /* C dig.c:427-430: anger the god and priest before digging the pit. */
        const lev = g.level.at(d.pos.x, d.pos.y);
        if (IS_ALTAR(lev.typ)) {
            await altar_wrath(d.pos.x, d.pos.y);
            await angry_priest();
        }
        /* C dig.c:432-437 — make the pit at <u.ux,u.uy>, occupation ends. */
        if (await dighole(true, false, null)) {
            /* C dig.c:432-435 — the pit is made; forget the dig level so the
             * next apply starts a fresh dig (effort 0). */
            d.level = { dnum: 0, dlevel: -1 };
        }
        return 0;
    }
    const dpx = d.pos.x | 0, dpy = d.pos.y | 0;
    const lev = g.level && g.level.at ? g.level.at(dpx, dpy) : null;
    if (d.effort > 100) {
        /* C dig.c:443-540 — enough effort spent; break through.  For an ordinary
         * (non-maze, non-cavernous) wall this becomes a doorless doorway and
         * prints "You make an opening in the wall." (dig.c:488-500).  wake_nearby
         * / pay_for_damage are RNG-neutral; the Is_earthlevel rn2(3) elemental
         * spawn does not apply (Dlvl 1 is not the earth level). */
        let digtxt = null;
        const digtyp = dig_typ(u.uwep || tool, dpx, dpy);
        let bobj, sobj, dmgtxt = null;
        if (digtyp === DIGTYP_STATUE && (sobj = sobj_at(STATUE, dpx, dpy))) {
            /* C dig.c:451-458 */
            digtxt = (await break_statue(sobj)) ? 'The statue shatters.' : null;
        } else if (digtyp === DIGTYP_BOULDER && (sobj = sobj_at(BOULDER, dpx, dpy))) {
            /* C dig.c:459-467 */
            await fracture_rock(sobj);
            if ((bobj = sobj_at(BOULDER, dpx, dpy))) {
                obj_extract_self(bobj);
                place_object(bobj, dpx, dpy);
            }
            digtxt = 'The boulder falls apart.';
        } else if (lev && (lev.typ === STONE || lev.typ === SCORR || IS_TREE(lev.typ))) {
            // C dig.c:469-480: the cave effect skips debris and door handling.
            if (Is_earthlevel(u.uz)) {
                let cave = null;
                if (u.uwep.blessed && !rn2(3)) cave = false;
                else if ((u.uwep.cursed && !rn2(4)) || (!u.uwep.blessed && !rn2(6))) cave = true;
                if (cave !== null) {
                    await mkcavearea(cave);
                    d.lastdigtime = g.moves | 0;
                    d.quiet = false;
                    d.level = { dnum: 0, dlevel: -1 };
                    return 0;
                }
            }
            if (digtyp === DIGTYP_TREE) {
                digtxt = 'You cut down the tree.';
                lev.typ = ROOM; lev.flags = 0;
                if (!rn2(5))
                    await rnd_treefruit_at(dpx, dpy);
                if ((g.urace?.mnum | 0) === 264 /* PM_ELF */ || (g.urole?.mnum | 0) === 338 /* PM_RANGER */)
                    adjalign(-1);
            } else {
                /* C dig.c:486-487 — cut away rock → corridor. */
                lev.typ = CORR; lev.flags = 0;
                digtxt = 'You succeed in cutting away some rock.';
            }
        } else if (lev && IS_WALL(lev.typ)) {
            /* C dig.c:488-500 — ordinary wall → doorless doorway. */
            if (in_rooms(dpx, dpy, SHOPBASE).length > 0) {
                add_damage(dpx, dpy, 10 * acurrstr(game.u)); /* C dig.c:489-490 SHOP_WALL_DMG */
                dmgtxt = 'damage';
            }
            /* C dig.c:493-499 — maze wall → ROOM, cavernous → CORR, else doorless doorway. */
            if (game.level.flags.is_maze_lev) {
                lev.typ = ROOM; lev.flags = 0;
            } else if (game.level.flags.is_cavernous_lev && !in_town(dpx, dpy)) {
                lev.typ = CORR; lev.flags = 0;
            } else {
                lev.typ = DOOR; lev.doormask = D_NODOOR;
            }
            digtxt = 'You make an opening in the wall.';
        } else if (lev && lev.typ === SDOOR) {
            /* C dig.c:501-505 */
            cvt_sdoor_to_door(lev); /* ->typ = DOOR */
            digtxt = 'You break through a secret door!';
            if (!((lev.doormask | 0) & D_TRAPPED))
                lev.doormask = D_BROKEN;
        } else if (closed_door(dpx, dpy)) {
            /* C dig.c:506-516 */
            digtxt = `You break through the door with your ${simpleonames(u.uwep)}.`;
            if (in_rooms(dpx, dpy, SHOPBASE).length > 0) {
                add_damage(dpx, dpy, 400); /* SHOP_DOOR_COST */
                dmgtxt = 'break';
            }
            if (!((lev.doormask | 0) & D_TRAPPED))
                lev.doormask = D_BROKEN;
        } else {
            return 0; /* statue or boulder got taken (C dig.c:517-518) */
        }
        if (!does_block(dpx, dpy))
            unblock_point(dpx, dpy);
        feel_newsym(dpx, dpy);
        if (digtxt && !d.quiet)
            await pline(digtxt);
        if (dmgtxt)
            await pay_for_damage(dmgtxt, false); /* C dig.c:526-527 */
        /* C dig.c:529-532: digging debris can become an elemental or xorn. */
        if (Is_earthlevel(u.uz) && !rn2(3)) {
            const mndx = rn2(2) ? PM_EARTH_ELEMENTAL : PM_XORN;
            if (await makemon(mndx, dpx, dpy, MM_NOMSG))
                await pline('The debris from your digging comes to life!');
        }
        /* C dig.c:534-539 — destroying a trapped door sets off its blast. */
        if (IS_DOOR(lev.typ) && (lev.doormask & D_TRAPPED)) {
            lev.doormask = D_NODOOR;
            await b_trapped('door', NO_PART);
            recalc_block_point(dpx, dpy);
            newsym(dpx, dpy);
        }
        /* C dig.c:539-543 cleanup — lastdigtime = moves; clear the dig level. */
        d.lastdigtime = g.moves | 0;
        d.quiet = false;
        d.level = { dnum: 0, dlevel: -1 };
        // C dig.c:520-545: unblock_point() owns vision invalidation; pline()
        // may already have recalculated it before this cleanup.
        return 0;
    }
    {
        /* C dig.c:549-563 */
        const dig_target = dig_typ(u.uwep || tool, dpx, dpy);
        if ((lev && IS_WALL(lev.typ)) || dig_target === DIGTYP_DOOR) {
            if (in_rooms(dpx, dpy, SHOPBASE).length > 0) {
                const uw2 = u.uwep || tool;
                const verb2 = (!uw2 || is_pick(uw2)) ? 'dig into' : 'chop through';
                await pline('This %s seems too hard to %s.',
                            (lev && IS_DOOR(lev.typ)) ? 'door' : 'wall', verb2);
                return 0;
            }
        } else if (dig_target === DIGTYP_UNDIGGABLE
            || (dig_target === DIGTYP_ROCK && lev && !IS_OBSTRUCTED(lev.typ)))
            return 0; /* statue or boulder got taken */
    }
    if (!g.did_dig_msg) {
        const d_target = ['', 'rock', 'statue', 'boulder', 'door', 'tree'];
        await pline(`You hit the ${d_target[dig_typ(u.uwep || tool, dpx, dpy)]} with all your might.`);
        wake_nearby_(false); /* C dig.c:561 */
        g.did_dig_msg = true;
    }
    return 1;
}

// C ref: dig.c:194 is_digging(void) — check if the player's current occupation
// is digging (comparing the dig function pointer).
export function is_digging() {
    const g = game;
    if (g.occupation === dig) {
        return true;
    }
    return false;
}

// C ref: dig.c:596 holetime(void) — shopkeeper's estimate of when the hole will be
// finished. Returns -1 if not currently digging or not in a shop, otherwise
// returns ((250 - effort) / 20) as a rough time estimate.
export function holetime() {
    const g = game;
    const u = g.u || {};
    /* C dig.c:599 — if not currently digging OR not in a shop, return -1. */
    if (g.occupation !== dig || !u.ushops || (Array.isArray(u.ushops) && u.ushops[0] === 0)) {
        return -1;
    }
    /* C dig.c:601 — return the time estimate. */
    const d = g.context && g.context.digging ? g.context.digging : {};
    const effort = d.effort | 0;
    return Math.trunc((250 - effort) / 20);
}

// C ref: dig.c:1162 use_pick_axe2(obj) — uses the existing u.dx/u.dy/u.dz set by
// getdir.  Ported scope: the down-dig (u.dz > 0) branch.  Returns ECMD_TIME (1):
// the apply consumed a turn and set the dig occupation.
export async function use_pick_axe2(obj) {
    const g = game;
    const u = g.u || {};
    const ispick = is_pick(obj);
    const verbing = ispick ? 'digging' : 'chopping';
    const dz = u.dz | 0;

    if (u.uswallow && await do_attack(u.ustuck)) {
        /* C dig.c:1171-1172 — swallowed: attack the engulfer; return ECMD_TIME. */
        g.context = g.context || {};
        g.context.move = 1;
        return 1;
    }
    if (u.uinwater) {
        /* C dig.c:1173-1174 — Underwater is !!u.uinwater (hack.h). */
        await pline(`Turbulence torpedoes your ${verbing} attempts.`);
        g.context = g.context || {};
        g.context.move = 1;
        return 1;
    }
    if (dz < 0) {
        /* C dig.c:1175-1179 — can't reach the ceiling. */
        if (Levitation_())
            await pline("You don't have enough leverage.");
        else
            await pline(`You can't reach the ${ceiling_cmd(u.ux, u.uy)}.`);
        /* falls out of the if-chain to dig.c:1358 `return ECMD_TIME` */
        g.context = g.context || {};
        g.context.move = 1;
        return 1;
    }
    if (!(u.dx | 0) && !(u.dy | 0) && !dz) {
        /* C dig.c:1180-1191 — hit yourself with the pick. */
        let dam = rnd(2) + dbon() + (obj.spe | 0);
        if (dam <= 0)
            dam = 1;
        await pline(`You hit yourself with ${yname(u.uwep)}.`);
        const buf = `${g.flags?.female ? 'her' : 'his'} own ${OC_NAME[obj.otyp]}`;
        const hp = u.uprops && u.uprops[HALF_PHDAM];
        if (hp && ((hp.intrinsic | 0) || (hp.extrinsic | 0)))
            dam = Math.trunc((dam + 1) / 2);
        await losehp(dam, buf, KILLED_BY);
        if (g.disp) g.disp.botl = true;
        g.context = g.context || {};
        g.context.move = 1;
        return 1;
    }
    if (dz === 0) {
        confdir(false);
        const rx = (u.ux | 0) + (u.dx | 0);
        const ry = (u.uy | 0) + (u.dy | 0);
        if (!isok(rx, ry)) {
            /* C dig.c:1197-1201 — "Clash!" off the map edge.  No RNG. */
            await pline('Clash!');
            g.context = g.context || {};
            g.context.move = 1;
            return 1;
        }
        const loc = g.level && g.level.at ? g.level.at(rx, ry) : null;
        /* C dig.c:1202 — if (MON_AT(rx, ry) && do_attack(m_at(rx, ry)))
         * return ECMD_TIME.  A monster standing on the dig target square is
         * attacked instead of the square being dug (checked BEFORE
         * dig_typ()); do_attack() itself decides whether the attack actually
         * consumed the turn (it can return false, e.g. a cancelled swap). */
        const digTargetMon = m_at(rx, ry);
        if (digTargetMon && await do_attack(digTargetMon)) {
            g.context = g.context || {};
            g.context.move = 1;
            return 1;
        }
        /* C dig.c:1203 dig_target = dig_typ(obj, rx, ry) — the real STATUE /
         * BOULDER / DOOR / TREE / ROCK precedence, wired in here in place of
         * the old single isRockTarget boolean (which mistook every
         * IS_OBSTRUCTED tile, TREE included, for diggable rock and could
         * never reach the BOULDER/STATUE arms at all). */
        const dig_target = dig_typ(obj, rx, ry);
        if (dig_target === DIGTYP_UNDIGGABLE) {
            const trap = t_at(rx, ry);
            let boulder;
            let trap_with_u;
            if (trap && trap.ttyp === WEB) {
                if (!trap.tseen) {
                    seetrap(trap);
                    await pline('There is a spider web there!');
                }
                await pline(`${Yobjnam2(obj, 'become')} entangled in the web.`);
                nomul(-d(2, 2));
                g.multi_reason = 'stuck in a spider web';
                g.nomovemsg = 'You pull free.';
            } else if (loc && loc.typ === IRONBARS) {
                await pline('Clang!');
                wake_nearby(false);
            } else if (loc && IS_WATERWALL(loc.typ)) {
                await pline('Splash!');
            } else if (loc && loc.typ === LAVAWALL) {
                await pline('Splash!');
                await fire_damage(u.uwep, false, rx, ry);
            } else if (loc && IS_TREE(loc.typ)) {
                await pline('You need an axe to cut down a tree.');
            } else if (loc && IS_OBSTRUCTED(loc.typ)) {
                await pline('You need a pick to dig rock.');
            } else if ((boulder = sobj_at(BOULDER, rx, ry)) || sobj_at(STATUE, rx, ry)) {
                const what = boulder ? 'boulder' : 'statue';
                if (!ispick) {
                    const vibrate = !rn2(3);
                    await pline(`Sparks fly as you whack the ${what}.${vibrate ? '  The axe-handle vibrates violently!' : ''}`);
                    if (vibrate) {
                        const hp = u.uprops && u.uprops[HALF_PHDAM];
                        const dmg = hp && ((hp.intrinsic | 0) || (hp.extrinsic | 0)) ? Math.trunc(3 / 2) : 2;
                        await losehp(dmg, 'axing a hard object', KILLED_BY);
                    }
                    wake_nearby(false);
                } else {
                    await pline(`You can't reach the ${what}.`);
                }
            } else if (u.utrap && u.utraptype === TT_PIT && trap
                       && (trap_with_u = t_at(u.ux | 0, u.uy | 0))
                       && is_pit(trap.ttyp)
                       && !conjoined_pits_dg(trap, trap_with_u, false)) {
                const idx = xytodir(u.dx | 0, u.dy | 0);
                if (idx !== DIR_ERR) {
                    const adjidx = DIR_180(idx);
                    trap_with_u.conjoined = (trap_with_u.conjoined | 0) | (1 << idx);
                    trap.conjoined = (trap.conjoined | 0) | (1 << adjidx);
                    await pline('You clear some debris from between the pits.');
                }
            } else if (u.utrap && u.utraptype === TT_PIT && t_at(u.ux | 0, u.uy | 0)) {
                await pline(`You swing ${yobjnam(obj)}, but the rubble has no place to go.`);
            } else {
                await pline(`You swing ${yobjnam(obj)} through thin air.`);
            }
            g.context = g.context || {};
            g.context.move = 1;
            return 1;
        }
        /* C dig.c:1270-1276 d_action[] — the verb selected by dig_target. */
        const d_action = ['swinging', 'digging', 'chipping the statue',
                           'hitting the boulder', 'chopping at the door',
                           'cutting the tree'];
        /* C dig.c:1280-1309 — fresh dig vs continue. */
        const dc = diggingCtx();
        g.did_dig_msg = false;
        dc.quiet = false;
        /* C dig.c:1283-1284 — !on_level(&digging.level, &u.uz) also restarts. */
        const _uz = g.u && g.u.uz ? g.u.uz : { dnum: 0, dlevel: 0 };
        const _dl = dc.level;
        const _sameLevel = !!_dl && (_dl.dnum | 0) === (_uz.dnum | 0)
            && (_dl.dlevel | 0) === (_uz.dlevel | 0);
        if (dc.pos.x !== rx || dc.pos.y !== ry || !_sameLevel || dc.down) {
            /* C dig.c:1286-1296 — avoid messages if repeated autodigging. */
            if (g.flags && g.flags.autodig && dig_target === DIGTYP_ROCK
                && !dc.down && (u.ux | 0) === (dc.pos.x | 0)
                && (u.uy | 0) === (dc.pos.y | 0)
                && (g.moves | 0) <= ((dc.lastdigtime | 0) + 2)
                && (g.moves | 0) >= (dc.lastdigtime | 0)) {
                g.did_dig_msg = true;
                dc.quiet = true;
            }
            dc.down = false;
            dc.chew = false;
            dc.warned = false;
            dc.pos.x = rx;
            dc.pos.y = ry;
            /* C dig.c:1301 assign_level(&svc.context.digging.level, &u.uz) */
            assign_level(dc.level, g.u && g.u.uz ? g.u.uz : { dnum: 0, dlevel: 0 });
            dc.effort = 0;
            dc.tool = obj;
            if (!dc.quiet)
                await pline(`You start ${d_action[dig_target]}.`);
        } else {
            await pline(`You ${dc.chew ? 'begin' : 'continue'} ${d_action[dig_target]}.`);
            dc.chew = false;
        }
        /* C dig.c:1310 — set_occupation(dig, verbing, 0). */
        g.occupation = dig;
        g.occtxt = verbing;
        g.occtime = 0;
        g.context = g.context || {};
        g.context.move = 1;
        return 1;
    }
    /* dz > 0: dig downward.  C dig.c:1316-1357 guard chain, in C order. */
    if (Is_airlevel(u.uz) || Is_waterlevel(u.uz)) {
        /* C dig.c:1316-1318 */
        await pline(`You swing ${yobjnam(obj)} through thin air.`);
        g.context = g.context || {};
        g.context.move = 1;
        return 1;
    }
    if (!can_reach_floor_dg(false)) {
        /* C dig.c:1319-1320 */
        await cant_reach_floor(u.ux | 0, u.uy | 0, false, false, false);
        g.context = g.context || {};
        g.context.move = 1;
        return 1;
    }
    if (is_pool_or_lava(u.ux | 0, u.uy | 0)) {
        /* C dig.c:1321-1324 */
        await pline('You cannot stay under%s long enough.',
                    is_pool(u.ux | 0, u.uy | 0) ? 'water' : ' the lava');
        g.context = g.context || {};
        g.context.move = 1;
        return 1;
    }
    const trap = t_at(u.ux | 0, u.uy | 0);
    if (trap && (uteetering_at_seen_pit(trap) || uescaped_shaft(trap))) {
        /* C dig.c:1325-1330 — might escape the trap and still be teetering. */
        await dotrap(trap, FORCEBUNGLE);
        if (!u.utrap)
            await cant_reach_floor(u.ux | 0, u.uy | 0, false, true, false);
        g.context = g.context || {};
        g.context.move = 1;
        return 1;
    }
    if (!ispick && (!trap || (trap.ttyp !== LANDMINE && trap.ttyp !== BEAR_TRAP))) {
        /* C dig.c:1333-1335; engrave.c:264-268 u_wipe_engr(3). */
        await pline('%s merely scratches the %s.', Yobjnam2(obj), surface_(u.ux | 0, u.uy | 0));
        if (can_reach_floor_dg(true))
            wipe_engr_at(u.ux | 0, u.uy | 0, 3, false);
        g.context = g.context || {};
        g.context.move = 1;
        return 1;
    }
    const dc = diggingCtx();
    /* C dig.c:1337-1352 — fresh dig vs continue.  Start a new dig run. */
    const _dl = g.u && g.u.uz ? g.u.uz : { dnum: 0, dlevel: 0 };
    if (dc.pos.x !== (u.ux | 0) || dc.pos.y !== (u.uy | 0)
        || (dc.level.dnum | 0) !== (_dl.dnum | 0) || (dc.level.dlevel | 0) !== (_dl.dlevel | 0) || !dc.down) {
        dc.chew = false;
        dc.down = true;
        dc.warned = false;
        dc.pos.x = u.ux | 0;
        dc.pos.y = u.uy | 0;
        dc.level = g.u && g.u.uz ? { dnum: g.u.uz.dnum, dlevel: g.u.uz.dlevel } : { dnum: 0, dlevel: 0 };
        dc.effort = 0;
        dc.tool = obj; /* the applied pick-axe (the dig tool / C uwep). */
        await pline(`You start ${verbing} downward.`);
        if (u.ushops && (Array.isArray(u.ushops) ? u.ushops[0] : u.ushops)) {
            await shopdig(0);
            add_damage(u.ux | 0, u.uy | 0, 100 /* SHOP_PIT_COST, hack.h:81 */);
        }
    } else {
        await pline(`You continue ${verbing} downward.`);
    }
    g.did_dig_msg = false;
    /* C dig.c:1356 — set_occupation(dig, verbing, 0). */
    g.occupation = dig;
    g.occtxt = verbing;
    g.occtime = 0;
    /* C dig.c:1358 — return ECMD_TIME. */
    g.context = g.context || {};
    g.context.move = 1;
    return 1;
}

// C dig.c:1092-1158: apply.js handles wielding, the web guard, and getdir.
// It passes the resulting u.dx/u.dy/u.dz to this final dispatch step.
export async function use_pick_axe(obj) {
    // Preserve the apply occupation ordering in allmain's movement loop.
    game._digFromApply = true;
    const res = await use_pick_axe2(obj);
    if (!game.occupation) game._digFromApply = false;
    return res;
}

// ── dig_typ helpers ──

// C objects.h constants
const STATUE = 476;
const BOULDER = 475;

const P_AXE_DG = 3; /* skills.h P_AXE */
function is_axe(obj) {
    if (!obj) return false;
    const oc = obj.oclass | 0;
    if (oc !== OCLASS_WEAPON && oc !== OCLASS_TOOL) return false;
    return (MKOBJ_OC_SKILL[obj.otyp | 0] | 0) === P_AXE_DG;
}


// C dig.c enum dig_types: DIGTYP_UNDIGGABLE=0, DIGTYP_ROCK=1, DIGTYP_STATUE=2,
// DIGTYP_BOULDER=3, DIGTYP_DOOR=4, DIGTYP_TREE=5
const DIGTYP_UNDIGGABLE = 0;
const DIGTYP_ROCK = 1;
const DIGTYP_STATUE = 2;
const DIGTYP_BOULDER = 3;
const DIGTYP_DOOR = 4;
const DIGTYP_TREE = 5;

// C ref: trap.c:6552 conjoined_pits(trap2, trap1, u_entering_trap2).  Duplicated
// here rather than imported because js/trap.js's copy is an unexported local
// and this file's edit scope is js/dig.js only; the predicate draws no RNG,
// so the duplication cannot desync (same rationale as Flying_() above).
function conjoined_pits_dg(trap2, trap1, u_entering_trap2) {
    const u = game.u || {};
    if (!trap1 || !trap2)
        return false;
    if (!isok(trap2.tx | 0, trap2.ty | 0) || !isok(trap1.tx | 0, trap1.ty | 0)
        || !is_pit(trap2.ttyp | 0) || !is_pit(trap1.ttyp | 0)
        || (u_entering_trap2 && !((u.utrap | 0) && (u.utraptype | 0) === TT_PIT)))
        return false;
    /* C hacklib.c sgn_dig() */
    const dx = Math.sign((trap2.tx | 0) - (trap1.tx | 0));
    const dy = Math.sign((trap2.ty | 0) - (trap1.ty | 0));
    const diridx = xytodir(dx, dy);
    if (diridx !== DIR_ERR) {
        const adjidx = DIR_180(diridx);
        if (((trap1.conjoined | 0) & (1 << diridx))
            && ((trap2.conjoined | 0) & (1 << adjidx)))
            return true;
    }
    return false;
}

// C ref: dig.c:141-162 pick_can_reach(pick, x, y) — called when attempting to
// break a statue or boulder with a pick.  No RNG.
function pick_can_reach(pick, x, y) {
    const u = game.u || {};
    const t = t_at(x, y);
    /* tseen: pit only affects item positioning when it is known */
    const target_in_pit = !!(t && is_pit(t.ttyp | 0) && t.tseen);

    /* if hero is in a pit, pick can only reach if the statue is too and the
       two pits are conjoined or the statue isn't and pick is two-handed;
       this applies to hero in pit trying to reach an adjacent boulder too */
    if ((u.utrap | 0) && (u.utraptype | 0) === TT_PIT) {
        if (target_in_pit)
            return conjoined_pits_dg(t, t_at(u.ux | 0, u.uy | 0), false);
        return bimanual(pick);
    }

    /* when hero isn't in a pit, a mattock or flying hero w/ pick can reach
       whether or not the statue is in a pit */
    if (bimanual(pick) || Flying_())
        return true;
    /* one-handed pick-axe can reach if statue isn't in a pit */
    if (!target_in_pit)
        return true;

    return false;
}

export function dig_dirsyms(obj) {
    const u = game.u || {};
    const downok = !!can_reach_floor_dg(false);
    let out = '';
    for (let dir = 0; dir < 10; dir++) {
        const dirch = cmd_from_dir(dir, 0 /* MV_WALK */);
        if (u.uswallow) {
            /* all directions are viable when swallowed */
        } else if (movecmd(dirch, 0 /* MV_WALK */)) {
            if (!dxdy_moveok()) continue;
            const rx = u.ux + u.dx, ry = u.uy + u.dy;
            if (!isok(rx, ry) || dig_typ(obj, rx, ry) === DIGTYP_UNDIGGABLE)
                continue;
        } else {
            if ((u.dz > 0) !== downok)
                continue;
        }
        out += String.fromCharCode(dirch & 0xff);
    }
    // C dig.c:1150-1151: a missing binding may insert a NUL into dirsyms.
    return out.split('\0', 1)[0];
}

// C ref: dig.c:168-192 dig_typ(struct obj *otmp, coordxy x, coordxy y)
export function dig_typ(otmp, x, y) {
    let ltyp;

    if (!isok(x, y) || !otmp || (!is_pick(otmp) && !is_axe(otmp)))
        return DIGTYP_UNDIGGABLE;

    const loc = game.level && game.level.at ? game.level.at(x, y) : null;
    ltyp = loc ? loc.typ : 0;
    if (is_axe(otmp))
        return closed_door(x, y) ? DIGTYP_DOOR
               : IS_TREE(ltyp) ? DIGTYP_TREE /* axe vs tree */
                 : DIGTYP_UNDIGGABLE;
    /*assert(is_pick(otmp));*/
    return (sobj_at(STATUE, x, y) && pick_can_reach(otmp, x, y))
           ? DIGTYP_STATUE
           : (sobj_at(BOULDER, x, y) && pick_can_reach(otmp, x, y))
             ? DIGTYP_BOULDER
             : closed_door(x, y) ? DIGTYP_DOOR
               : IS_TREE(ltyp) ? DIGTYP_UNDIGGABLE /* pick vs tree */
                 : (IS_OBSTRUCTED(ltyp)
                    && (!game.level.flags.arboreal || IS_WALL(ltyp)))
                   ? DIGTYP_ROCK
                   : DIGTYP_UNDIGGABLE;
}

// ── bury_an_obj helpers ──

// C objects.h otyp constants used by bury_an_obj.
const ROCK = 474;
const LEASH = 236;
const POT_OIL = 321;
const CORPSE = 265;
const POTION_CLASS = 8;
const WOOD = 8; /* objclass.h oc_material */

// C ref: decl.h:97-98 uball/uchain are top-level C globals, not modeled as a
// JS state slot anywhere. Locate the single object carrying the W_BALL /
// W_CHAIN owornmask bit — mirrors js/ball.js's findBallChain(), reproduced
// locally per the established per-file convention (js/ball.js:74-91).
function findBallChain() {
    /* C's uball/uchain stay pointing at the objects while they are unlinked
     * (OBJ_FREE between move_bc halves, or buried); js/read.js setworn_bc
     * writes them as u.uball/u.uchain, so prefer those (as js/ball.js does)
     * and keep the scan as the fixture fallback. */
    const gu = game.u;
    if (gu && gu.uball && gu.uchain)
        return { uball: gu.uball, uchain: gu.uchain };
    let uball = null, uchain = null;
    for (let o = game.invent; o; o = o.nobj) {
        if ((o.owornmask | 0) & W_BALL) uball = o;
        if ((o.owornmask | 0) & W_CHAIN) uchain = o;
    }
    for (let o = game.fobj; o; o = o.nobj) {
        if ((o.owornmask | 0) & W_BALL) uball = o;
        if ((o.owornmask | 0) & W_CHAIN) uchain = o;
    }
    return { uball, uchain };
}

// C objclass.h:193 is_organic(otmp) := objects[otmp->otyp].oc_material <= WOOD.
function is_organic(otmp) {
    return (MKOBJ_OC_MATERIAL[otmp.otyp | 0] | 0) <= WOOD;
}


// end_burn (timeout.c:1801) is IMPORTED from js/timeout.js now — the throw-stub
// that stood here shadowed the real body for bury_an_obj's lamplit arm below.
/* obfree — the real body lives in js/dokick.js (C shk.c:1188).  It used to be
 * a throwing stub here, which was harmless only while nothing in this file
 * deleted an object; rot_organic() does. */

// C ref: timeout.c:2246 start_timer — the object-timer queue.  This used to be
// a LOCAL NO-OP on the stated grounds that "the object-timer subsystem itself
// is not modeled in the JS game schema"; it is modelled now (js/timeout.js),
// so the ROT_ORGANIC timer bury_an_obj starts below is a real one.

// C ref: dig.c:1983 bury_an_obj(struct obj *otmp, boolean *dealloced).
export async function bury_an_obj(otmp, dealloced) {
    if (dealloced)
        dealloced.value = 0;

    if (otmp === findBallChain().uball) {
        await unpunish();
        set_utrap(rn1(50, 20), TT_BURIEDBALL);
        await pline_The('iron ball gets buried!');
    }
    /* after unpunish(), or might get deallocated chain */
    const otmp2 = otmp.nexthere;
    /* C dig.c:2007 reads the uchain global AFTER unpunish() has set it to
     * null (setworn(0, W_CHAIN)); re-read it here rather than reusing a
     * pre-unpunish copy that would still name the deleted chain. */
    const { uchain } = findBallChain();
    /*
     * obj_resists(,0,0) prevents Rider corpses from being buried.
     * It also prevents The Amulet and invocation tools from being
     * buried.  Since they can't be confined to bags and statues,
     * it makes sense that they can't be buried either, even though
     * the real reason there (direct accessibility when carried) is
     * completely different.
     */
    if (otmp === uchain || obj_resists(otmp, 0, 0))
        return otmp2;

    if ((otmp.otyp | 0) === LEASH && otmp.leashmon)
        o_unleash(otmp);

    if (otmp.lamplit && (otmp.otyp | 0) !== POT_OIL)
        end_burn(otmp, true);

    obj_extract_self(otmp);

    const under_ice = is_ice(otmp.ox | 0, otmp.oy | 0);
    if (((otmp.otyp | 0) === ROCK && !under_ice) || (otmp.otyp | 0) === BOULDER) {
        /* merges into burying material; boulder removal is for #wizbury */
        if (dealloced)
            dealloced.value = 1;
        await obfree(otmp, null);
        return otmp2;
    }
    /*
     * Start a rot on organic material.  Not corpses -- they
     * are already handled.
     */
    if ((otmp.otyp | 0) === CORPSE) {
        ; /* should cancel timer if under_ice */
    } else if ((under_ice ? (otmp.oclass | 0) === POTION_CLASS : is_organic(otmp))
               && !obj_resists(otmp, 5, 95)) {
        const roll = rnd(250);
        start_timer((under_ice ? 0 : 250) + roll, TIMER_OBJECT, ROT_ORGANIC, obj_to_any(otmp));
    }
    /* C dig.c:2036-2043: the is_rustprone RUST_METAL timer arm sits inside
     * #if 0 ("rusting of buried metal not yet implemented"), so the compiled
     * C has no third arm here and neither does this body. */
    add_to_buried(otmp);
    return otmp2;
}

/* C ref: include/mondata.h:35 hides_under(ptr) — (((ptr)->mflags1 & M1_CONCEAL) != 0L).
 * include/monflag.h:92 M1_CONCEAL is 0x00000080L, NOT the 0x08000000L this
 * carried: that value is monflag.h:112 M1_ACID ("acidic to eat"), so this
 * predicate answered "is this monster acidic" at every call site.  Same
 * per-file convention js/restore.js:27, js/monmove.js:2769, js/polyself.js:828
 * and js/cmd.js:6121 already use, all of them with the right bit. */
const M1_CONCEAL_DG = 0x00000080;
function hides_under(ptr) {
    return !!ptr && ((ptr.mflags1 | 0) & M1_CONCEAL_DG) !== 0;
}

/* C ref: dig.c:2125-2140 rot_organic(anything *arg, long timeout)
 *
 * "The organic material has rotted away while buried."  Also the tail of
 * rot_corpse(), which is what makes it reachable in normal (unburied) play.
 * RNG-free.
 *
 * timeout_funcs[ROT_ORGANIC] in js/timeout.js dispatches here. */
export async function rot_organic(arg, timeout) {
    const obj = arg.a_obj;

    while (Has_contents(obj)) {
        obj.cobj.ox = obj.ox;
        obj.cobj.oy = obj.oy;
        /* Everything which can be held in a container can also be
           buried, so bury_an_obj's use of obj_extract_self insures
           that Has_contents(obj) will eventually become false. */
        await bury_an_obj(obj.cobj, null);
    }
    obj_extract_self(obj);
    await obfree(obj, null);
}

export async function rot_corpse(arg, timeout) {
    let x = 0, y = 0;
    const obj = arg.a_obj;
    const on_floor = (obj.where | 0) === OBJ_FLOOR,
          in_invent = (obj.where | 0) === OBJ_INVENT;

    if (on_floor) {
        x = obj.ox | 0;
        y = obj.oy | 0;
    } else if (in_invent) {
        if (game.flags?.verbose) {
            const cname = corpse_xname(obj, null, CXN_NO_PFX);

            /* C: Your("%s%s %s away%c", ...) */
            await pline('Your ' + (obj === game.u.uwep ? 'wielded ' : '') + cname + ' '
                        + otense(obj, 'rot') + ' away' + (obj === game.u.uwep ? '!' : '.'));
        }
        if (obj.owornmask) {
            await remove_worn_item(obj, true);
            await stop_occupation();
        }
    } else if ((obj.where | 0) === OBJ_MINVENT) {
        /* C monst.h:208 MON_WEP(mon) == mon->mw */
        if (obj.owornmask && obj.ocarry && obj === obj.ocarry.mw)
            setmnotwielded(obj.ocarry, obj); /* clears owornmask */
    } else if ((obj.where | 0) === OBJ_MIGRATING) {
        /* clear destination flag so that obfree()'s check for
           freeing a worn object doesn't get a false hit */
        obj.owornmask = 0;
    }
    await rot_organic(arg, timeout);
    if (on_floor) {
        const mtmp = m_at(x, y);

        /* a hiding monster may be exposed */
        if (mtmp && !((game.level?.levelObjects?.[x]?.[y]) ?? null)
            && mtmp.mundetected && hides_under(mtmp.data)) {
            mtmp.mundetected = 0;
        } else if ((game.u?.ux | 0) === x && (game.u?.uy | 0) === y
                   && game.u?.uundetected && hides_under(game.youmonst?.data)) {
            hideunder(game.youmonst);
        }
        newsym(x, y);
    } else if (in_invent) {
        update_inventory();
    }
}

// ── mdig_tunnel's leaf callees ──
// These five were throwing stubs, which is why mdig_tunnel was left unwired
// (see the KNOWN GAP note on mdig_tunnel below).  Ported here so the
// monmove.c:1644 call site can be added.


export function draft_message(unexpected) {
    if (unexpected) {
        if (!_dig_hallucination()) {
            return You_feel("an unexpected draft.");
        } else {
            /* U.S. classification system uses 1-A for eligible to serve
               and 4-F for ineligible due to physical or mental defect */
            /* acurr(u, i) takes the C A_* constant and does the display-order
             * remap itself (js/attrib.js:94-95) — pass the C constant, never a
             * display index. */
            const u = game.u;
            return You_feel(`like you are ${(acurr(u, A_STR) < 6 || acurr(u, A_DEX) < 6
                                      || acurr(u, A_CON) < 6 || acurr(u, A_CHA) < 6
                                      || acurr(u, A_INT) < 6 || acurr(u, A_WIS) < 6)
                                     ? '4-F' : '1-A'}.`);
        }
    } else {
        if (!_dig_hallucination()) {
            return You_feel("a draft.");
        } else {
            /* "marching" is deliberately ambiguous */
            const draft_reaction = ['enlisting', 'marching', 'protesting', 'fleeing'];
            const atype = (game.u?.ualign?.type | 0);
            /* Lawful: 0..1, Neutral: 1..2, Chaotic: 2..3 */
            let dridx = rn1(2, 1 - sgn_dig(atype));
            if ((game.u?.ualign?.record | 0) < STRIDENT)
                /* L: +(0..2), N: +(-1..1), C: +(-2..0); all: 0..3 */
                dridx += rn1(3, sgn_dig(atype) - 1);
            return You_feel(`like ${draft_reaction[dridx]}.`);
        }
    }
}
/* dig.c:1499 — `#define STRIDENT 4 /​* from pray.c *​/` */
const STRIDENT = 4;
/* C hacklib.c sgn_dig() */
function sgn_dig(n) { return (n < 0) ? -1 : (n > 0) ? 1 : 0; }
/* youprop.h:116-120 — Hallucination is HHallucination (INTRINSIC only) with no
 * Halluc_resistance; same shape js/potion.js:731 uses. */
function _dig_hallucination() {
    const u = game.u;
    const hh = (u?.uprops?.[HALLUC]?.intrinsic | 0);
    const hr = u?.uprops?.[HALLUC_RES];
    return !!hh && !((hr?.intrinsic | 0) || (hr?.extrinsic | 0));
}

/* C ref: pline.c:387-400 You_feel(line) — "You feel <line>", or "You dream
 * that you feel <line>" when Unaware (asleep/unconscious). */
import { pline_The, You_feel, pline_mon } from './pline.js';
import { COULD_SEE, IN_SIGHT, RLOC_NOMSG } from './const.js'; // relocate-fns
import { _m_at, flush_screen, force_more, nh_delay_output } from './display.js'; // relocate-fns
import { impossible as rumor_impossible } from './pline.js'; // relocate-fns
import { rloc } from './teleport.js'; // relocate-fns
import { o_unleash } from './apply.js'; // relocate-fns
import { obj_timer_checks, rnd_treefruit_at } from './mkobj.js'; // relocate-fns
import { set_utrap } from './trap.js'; // relocate-fns
import { unpunish } from './read.js'; // relocate-fns
import { cvt_sdoor_to_door } from './detect.js'; // relocate-fns
import { COLNO } from './const.js'; // relocate-fns
import './zap.js'; // relocate-fns
import { mb_trapped } from './monmove.js'; // relocate-fns
import { dist2 } from './hacklib.js'; // relocate-fns
import { punish } from './read.js'; // relocate-fns
import { stackobj } from './invent.js'; // relocate-fns
import { stop_timer } from './timeout.js'; // relocate-fns
import { destroy_drawbridge } from './dbridge.js'; // relocate-fns
import { HEAD, SHOP_DOOR_COST, SHOP_WALL_COST, STOMACH } from './const.js'; // relocate-fns
import { hard_helmet } from './do_wear.js'; // relocate-fns
import { shkname, stolen_value } from './dokick.js'; // relocate-fns
import { ceiling } from './dungeon.js'; // relocate-fns
import { expels_gu } from './mhitu.js'; // relocate-fns
import { maybe_unhide_at } from './mon.js'; // relocate-fns
import { mbodypart } from './polyself.js'; // relocate-fns
import { costly_spot, currency, shop_keeper } from './shk.js'; // relocate-fns
import { ZP_ROCK, _Blind, _bh_cmap_to_glyph, _expl_digests, _zap_Maybe_Half_Phys } from './zap.js'; // relocate-fns
export { Deaf_dg, Flying_, Levitation_, Soundeffect, _dig_hallucination, is_floater_, is_flyer_, is_lava_, u_prop_ }; // relocate-fns
export { unpunish } from './read.js'; // relocate-fns
export { findBallChain }; // relocate-fns
export { set_utrap } from './trap.js'; // relocate-fns
export { BOULDER }; // relocate-fns


function Soundeffect(se, vol) { /* no-op */ }
/* C ref: pline.c:435-452 You_hear — imported from js/display.js.  The note that
 * used to sit here said the guard was "not reproduced ... no canonical ported
 * Deaf/Unaware/Underwater predicate exists, and inventing one would be fallback
 * state".  That was right about not inventing one, and it is no longer true
 * that none exists: js/display.js owns _live_deaf() (the reading the status
 * line's Deaf condition is validated on) and _disp_Blind(), and both leaves of
 * Unaware are ported. */
/* C ref: nethack-c/src/pline.c:587-637 — impossible() logs and RETURNS; it
 * never aborts.  mdig_tunnel's undiggable arm relies on falling through to
 * `return FALSE`. */
function impossible_dig(_msg, ..._args) { }
const se_crashing_rock = 0;

export async function mdig_tunnel(mtmp) {
    const pile = rnd(12);
    const here = game.level.at(mtmp.mx, mtmp.my);
    if (here.typ === SDOOR)
        cvt_sdoor_to_door(here); /* ->typ = DOOR */

    /* Eats away door if present & closed or locked */
    if (closed_door(mtmp.mx, mtmp.my)) {
        if (in_rooms(mtmp.mx, mtmp.my, SHOPBASE).length > 0)
            add_damage(mtmp.mx, mtmp.my, 0);
        /* sawit: closed door location is more visible than an open one */
        const sawit = canseemon(mtmp); /* before door state change and unblock_pt */
        const trapped = (here.doormask & D_TRAPPED) ? true : false;
        here.doormask = trapped ? D_NODOOR : D_BROKEN;
        recalc_block_point(mtmp.mx, mtmp.my); /* vision */
        newsym(mtmp.mx, mtmp.my);
        if (trapped) {
            const seeit = canseemon(mtmp);
            if (await mb_trapped(mtmp, sawit || seeit)) { /* mtmp is killed */
                newsym(mtmp.mx, mtmp.my);
                return true;
            }
        } else {
            if (game.flags.verbose) {
                if (!Unaware_real() && !rn2(3)) /* not too often.. */
                    await draft_message(true); /* "You feel an unexpected draft." */
            }
        }
        return false;
    } else if (here.typ === SCORR) {
        here.typ = CORR;
        here.flags = 0;
        unblock_point(mtmp.mx, mtmp.my);
        newsym(mtmp.mx, mtmp.my);
        await draft_message(false); /* "You feel a draft." */
        return false;
    } else if (!IS_OBSTRUCTED(here.typ) && !IS_TREE(here.typ)) { /* no dig */
        return false;
    }

    /* Only rock, trees, and walls fall through to this point. */
    if ((here.wall_info & W_NONDIGGABLE) !== 0) {
        impossible_dig("mdig_tunnel:  %s at (%d,%d) is undiggable",
                   (IS_WALL(here.typ) ? "wall"
                    : IS_TREE(here.typ) ? "tree" : "stone"),
                   mtmp.mx, mtmp.my);
        return false; /* still alive */
    }

    if (IS_WALL(here.typ)) {
        /* KMH -- Okay on arboreal levels (room walls are still stone) */
        if (game.flags.verbose && !rn2(5)) {
            Soundeffect(se_crashing_rock, 75);
            await You_hear("crashing rock.");
        }
        if (in_rooms(mtmp.mx, mtmp.my, SHOPBASE).length > 0)
            add_damage(mtmp.mx, mtmp.my, 0);
        if (game.level.flags.is_maze_lev) {
            here.typ = ROOM;
            here.flags = 0;
        } else if (game.level.flags.is_cavernous_lev
                   && !in_town(mtmp.mx, mtmp.my)) {
            here.typ = CORR;
            here.flags = 0;
        } else {
            here.typ = DOOR;
            here.doormask = D_NODOOR;
        }
    } else if (IS_TREE(here.typ)) {
        here.typ = ROOM;
        here.flags = 0;
        if (pile && pile < 5)
            await rnd_treefruit_at(mtmp.mx, mtmp.my);
    } else {
        here.typ = CORR;
        here.flags = 0;
        if (pile && pile < 5)
            await mksobj_at((pile === 1) ? BOULDER : ROCK, mtmp.mx, mtmp.my,
                      true, false);
    }
    newsym(mtmp.mx, mtmp.my);
    if (!sobj_at(BOULDER, mtmp.mx, mtmp.my))
        unblock_point(mtmp.mx, mtmp.my); /* vision */

    return false;
}

// C dig.c:28-137: animate the Earth plane's expanding or collapsing cave.
function rm_waslit() {
    const { ux, uy } = game.u;
    const here = game.level.at(ux, uy);
    if (here.typ === ROOM && here.waslit)
        return true;
    for (let x = ux - 2; x < ux + 3; ++x)
        for (let y = uy - 1; y < uy + 2; ++y)
            if (isok(x, y) && game.level.at(x, y).waslit)
                return true;
    return false;
}

/* C mondata.h:29 passes_walls(ptr) = (((ptr)->mflags1 & M1_WALLWALK) != 0L) */
const M1_WALLWALK = 0x00000008;
function passes_walls(ptr) {
    return ((ptr?.mflags1 | 0) & M1_WALLWALK) !== 0;
}

async function mkcavepos(x, y, dist, waslit, rockit) {
    if (!isok(x, y))
        return;
    const lev = game.level.at(x, y);
    if (rockit) {
        if (IS_OBSTRUCTED(lev.typ) || t_at(x, y))
            return;
        const mon = _m_at(x, y);
        if (mon && !passes_walls(mon.data))
            await rloc(mon, RLOC_NOMSG);
    } else if (lev.typ === ROOM) {
        return;
    }
    unblock_point(x, y);
    lev.seenv = 0;
    lev.doormask = 0;
    if (dist < 3)
        lev.lit = !rockit;
    if (waslit)
        lev.waslit = !rockit;
    lev.horizontal = false;
    game.viz_array[y][x] = dist < 3 ? (IN_SIGHT | COULD_SEE) : COULD_SEE;
    lev.typ = rockit ? STONE : ROOM;
    if (dist >= 3)
        await rumor_impossible('mkcavepos called with dist %d', dist);
    feel_newsym(x, y);
}

export async function mkcavearea(rockit) {
    const { ux, uy } = game.u;
    let xmin = ux, xmax = ux, ymin = uy, ymax = uy;
    const waslit = rm_waslit();
    if (rockit) {
        Soundeffect(se_crashing_rock, 100);
        await pline('Crash!  The ceiling collapses around you!');
    } else {
        await pline('A mysterious force %s cave around you!',
            game.level.at(ux, uy).typ === CORR ? 'creates a' : 'extends the');
    }
    if (game._pending_message)
        await force_more(game._pending_message); // WIN_MESSAGE, TRUE
    /* wintty.c:1871-1873: ESC at that more() sets WIN_STOP, which stays live
       (tty_clear_nhwindow leaves it) and swallows later plines. */
    if (game._topl_win_stop_armed) {
        game._topl_win_stop_armed = false;
        game._topl_win_stop = true;
    }

    for (let dist = 1; dist <= 2; ++dist) {
        --xmin;
        ++xmax;
        if (dist < 2) {
            --ymin;
            ++ymax;
            for (let i = xmin + 1; i < xmax; ++i) {
                await mkcavepos(i, ymin, dist, waslit, rockit);
                await mkcavepos(i, ymax, dist, waslit, rockit);
            }
        }
        for (let i = ymin; i <= ymax; ++i) {
            await mkcavepos(xmin, i, dist, waslit, rockit);
            await mkcavepos(xmax, i, dist, waslit, rockit);
        }
        await flush_screen(1);
        nh_delay_output();
    }
    const here = game.level.at(ux, uy);
    if (!rockit && here.typ === CORR) {
        here.typ = ROOM;
        if (waslit)
            here.waslit = true;
        newsym(ux, uy);
    }
    game.vision_full_recalc = 1;
}

/* C ref: dig.c:2287-2318 wiz_debug_cmd_bury() — the #wizbury command: bury
 * everything at the hero's location and around. */
export async function wiz_debug_cmd_bury() {
    const u = game.u;
    const lo = game.level.levelObjects;
    const count = (x, y) => {
        let n = 0;
        for (let o = lo?.[x]?.[y] || null; o; o = o.nexthere) ++n;
        return n;
    };
    let before = 0, after = 0;
    for (let x = u.ux - 1; x <= u.ux + 1; x++)
        for (let y = u.uy - 1; y <= u.uy + 1; y++) {
            if (x < 1 || x > COLNO - 1 || y < 0 || y > 20) continue; /* isok */
            before += count(x, y);
            await bury_objs(x, y);
            after += count(x, y);
        }
    const diff = before - after;
    if (before === 0)
        await pline("No objects here or adjacent to bury.");
    else if (diff === 0)
        await pline("No objects buried.");
    else
        await pline("%d object%s buried.", diff, diff === 1 ? "" : "s");
    return 0; /* ECMD_OK */
}

export async function unearth_objs(x, y) {
    const u = game.u || {};
    let otmp, otmp2, bball;
    const cc = { x: 0, y: 0 };

    cc.x = x;
    cc.y = y;
    bball = buried_ball(cc);
    for (otmp = game.level && game.level.buriedobjlist; otmp; otmp = otmp2) {
        otmp2 = otmp.nobj;
        if (otmp.ox === x && otmp.oy === y) {
            if (bball && otmp === bball
                && u.utrap && u.utraptype === TT_BURIEDBALL) {
                await buried_ball_to_punishment();
            } else {
                obj_extract_self(otmp);
                if (otmp.timed)
                    stop_timer(ROT_ORGANIC, obj_to_any(otmp));
                place_object(otmp, x, y);
                await stackobj(otmp);
            }
        }
    }
    del_engr_at(x, y);
    newsym(x, y);
}

/* C dig.c:1935-1955.  The ball is extracted from the buried-object chain,
 * handed to punish() as the reuse flag (which creates a fresh chain and wears
 * the recovered ball), then the trap and engraving are cleared.  punish() is
 * async only for message delivery; its reused-ball branch has no suspension
 * before updating the ball/chain state, so callers that are synchronous in C
 * retain their ordering here. */
export async function buried_ball_to_punishment() {
    const u = game.u || {};
    const cc = { x: u.ux | 0, y: u.uy | 0 };
    const ball = buried_ball(cc);
    if (!ball) return false;

    obj_extract_self(ball);
    await punish(ball);
    await reset_utrap(false);
    del_engr_at(cc.x, cc.y);
    newsym(cc.x, cc.y);
    return true;
}

/* C dig.c:1958-1980.  Used by polymorph/prayer recovery paths; keeping it
 * here also removes the last trap-local assumption that buried balls can only
 * be converted into punishment. */
export async function buried_ball_to_freedom() {
    const u = game.u || {};
    const cc = { x: u.ux | 0, y: u.uy | 0 };
    const ball = buried_ball(cc);
    if (!ball) return;
    obj_extract_self(ball);
    place_object(ball, cc.x, cc.y);
    await stackobj(ball);
    // C dig.c:1975: restore levitation/flight suppressed by the buried ball.
    await reset_utrap(true);
    del_engr_at(cc.x, cc.y);
    newsym(cc.x, cc.y);
}

const HEAVY_IRON_BALL = 477; /* objects.h: boulder=475,statue=476,heavy iron ball=477,iron chain=478 */

export function buried_ball(cc) {
    const u = game.u || {};
    let odist, bdist = COLNO;
    let otmp, ball = null;

    /* u.utrap might have already been cleared, in which case the value of
       u.utraptype is no longer meaningful; if u.utrap is still set then
       u.utraptype needs to be for buried ball */
    if (!u.utrap || u.utraptype === TT_BURIEDBALL) {
        for (otmp = game.level && game.level.buriedobjlist; otmp; otmp = otmp.nobj) {
            if (otmp.otyp !== HEAVY_IRON_BALL)
                continue;
            /* if found at the target spot, we're done */
            if (otmp.ox === cc.x && otmp.oy === cc.y)
                return otmp;
            /* find nearest within allowable vicinity: +/-2 */
            odist = dist2(otmp.ox, otmp.oy, cc.x, cc.y);
            if (odist <= 8 && (!ball || odist < bdist)) {
                /* remember nearest buried ball but keep checking others */
                ball = otmp;
                bdist = odist;
            }
        }
    }
    if (ball) {
        /* found, but not at < cc->x, cc->y > */
        cc.x = ball.ox;
        cc.y = ball.oy;
    }
    return ball;
}

const COIN_CLASS_BURY = 12;

function debugpline2(_fmt, _x, _y) {}

export async function bury_objs(x, y) {
    const rooms = in_rooms(x, y, SHOPBASE);
    const shkp = shop_keeper(rooms.length ? rooms[0] : 0);
    const costly = !!(shkp && costly_spot(x, y));
    let loss = 0;

    let otmp = (game.level && game.level.levelObjects
                && game.level.levelObjects[x]) ? game.level.levelObjects[x][y] : null;
    if (otmp) {
        debugpline2('bury_objs: at <%d,%d>', x, y);
    }
    while (otmp) {
        let otmp2;
        if (costly && !(game.context && game.context.mon_moving)) {
            loss += (await stolen_value(otmp, x, y, !!shkp.mpeaceful, true));
            if ((otmp.oclass | 0) !== COIN_CLASS_BURY)
                otmp.no_charge = 1;
        }
        otmp2 = await bury_an_obj(otmp, null); /* C dig.c:2069 */
        otmp = otmp2;
    }

    del_engr_at(x, y);
    newsym(x, y);
    maybe_unhide_at(x, y);

    if (costly && loss)
        await pline(`You owe ${shkname(shkp)} ${loss} ${currency(loss)} for burying merchandise.`);
}

/* C mondata.h:174 unique_corpstat(ptr) — (((ptr)->geno & G_UNIQ) != 0L). */
const G_UNIQ_ZD = 0x1000;

function unique_corpstat(ptr) {
    return (((ptr?.geno) | 0) & G_UNIQ_ZD) !== 0;
}

const S_digbeam = 78;

function cmap_to_glyph(cmap_idx) {
    return _bh_cmap_to_glyph(cmap_idx);
}

export async function zap_dig() {
    const g = game;
    const u = g.u || {};

    if (u.uswallow) {
        const mtmp = u.ustuck;
        const mndx = (mtmp.mndx ?? mtmp.mnum) | 0;
        /* is_whirly(): mlet == S_VORTEX (22) || PM_AIR_ELEMENTAL (154) */
        const whirly = ((mtmp.data?.mlet | 0) === 22) || mndx === 154;
        if (!whirly) {
            const dig = _expl_digests(mtmp);
            if (dig)
                await pline(`You pierce ${s_suffix(mon_nam(mtmp))} ${mbodypart(mtmp, STOMACH)} wall!`);
            /* C dig.c:1575 unique_corpstat(mtmp->data) */
            if (unique_corpstat(mtmp.data))
                mtmp.mhp = ((mtmp.mhp | 0) + 1) >> 1;
            else
                mtmp.mhp = 1; /* almost dead */
            await expels_gu(mtmp, mndx, !dig);
        }
        return;
    }

    if (u.dz | 0) {
        if (!Is_airlevel(u.uz) && !Is_waterlevel(u.uz) && !u.uinwater) {
            if (u.dz < 0 || On_stairs(u.ux, u.uy)) {
                /* C dig.c:1587-1600 — loosen a rock from the ceiling.  The
                 * stairway lookup is state-only; damage is the first draw in
                 * this arm, followed by mksobj_at's normal object/identity
                 * draws. */
                if (On_stairs(u.ux, u.uy)) {
                    const stway = stairway_at(u.ux, u.uy);
                    await pline(`The beam bounces off the ${stway?.isladder ? 'ladder' : 'stairs'} and hits the ${ceiling(u.ux, u.uy)}.`);
                }
                await pline(`You loosen a rock from the ${ceiling(u.ux, u.uy)}.`);
                await pline(`It falls on your ${body_part(HEAD)}!`);
                const dmg = rnd(hard_helmet(u.uarmh) ? 2 : 6);
                await losehp(_zap_Maybe_Half_Phys(dmg), 'falling rock', KILLED_BY_AN);
                const rock = await mksobj_at(ZP_ROCK, u.ux, u.uy, false, false);
                if (rock) {
                    xname(rock);
                    await stackobj(rock);
                }
                newsym(u.ux, u.uy);
            } else {
                /* C dig.c:1605 watch_dig; then dighole(FALSE,TRUE,0). */
                await watch_dig(null, u.ux, u.uy, true);
                await dighole(false, true, null);
            }
        }
        return;
    }

    /* ── C dig.c:1612-1622 — normal case: digging across the level ── */
    let shopdoor = false, shopwall = false;
    const lf = g.level?.flags || {};
    /* C dig.c:1614 — maze_dig = is_maze_lev && !Is_earthlevel(&u.uz). */
    const maze_dig = !!lf.is_maze_lev && !Is_earthlevel(u.uz);
    const udx = u.dx | 0, udy = u.dy | 0;
    let zx = (u.ux | 0) + udx;
    let zy = (u.uy | 0) + udy;

    /* C dig.c:1617-1620: a horizontal zap from a pit digs adjacent pits. */
    const trap_with_u = u.utrap && u.utraptype === TT_PIT ? t_at(u.ux, u.uy) : null;

    let digdepth = rn1(18, 8);
    if (trap_with_u) {
        await zap_dig_pit(trap_with_u, digdepth);
        return;
    }
    /* C dig.c:1623 */
    tmp_at(DISP_BEAM, cmap_to_glyph(S_digbeam));

    /* C dig.c:1624-1737 — dig loop. */
    while (--digdepth >= 0) {
        if (!isok(zx, zy))
            break;                                  /* C dig.c:1625-1626 */
        const room = g.level?.at(zx, zy);
        if (!room)
            break;
        tmp_at(zx, zy); /* C dig.c:1628 (nh_delay_output is a no-op here) */

        if (closed_door(zx, zy) || room.typ === SDOOR) {
            /* C dig.c:1669-1683 — raze a (secret) door into a doorless doorway. */
            /* C dig.c:1670-1673 — shop-door damage. */
            if (in_rooms(zx, zy, SHOPBASE).length) {
                add_damage(zx, zy, SHOP_DOOR_COST);
                shopdoor = true;
            }
            if (room.typ === SDOOR)
                room.typ = DOOR;                    /* C dig.c:1674-1675 */
            else if (cansee(zx, zy))
                await pline('The door is razed!');  /* C dig.c:1676-1677 */
            await watch_dig(null, zx, zy, true);    /* C dig.c:1678 */
            room.doormask = D_NODOOR;               /* C dig.c:1679 */
            recalc_block_point(zx, zy);             /* C dig.c:1680 — vision */
            digdepth -= 2;                          /* C dig.c:1681 */
            if (maze_dig)
                break;                              /* C dig.c:1682-1683 */
        } else if (maze_dig) {
            if (IS_WALL(room.typ)) {
                if (!(room.wall_info & W_NONDIGGABLE)) {
                    if (in_rooms(zx, zy, SHOPBASE).length) { /* C dig.c:1687-1690 */
                        add_damage(zx, zy, SHOP_WALL_COST);
                        shopwall = true;
                    }
                    room.typ = ROOM; room.flags = 0;
                    unblock_point(zx, zy);
                } else if (!_Blind()) {
                    await pline('The wall glows then fades.'); /* C dig.c:1691-1692 */
                }
                break;
            } else if (IS_TREE(room.typ)) {
                if (!(room.wall_info & W_NONDIGGABLE)) {
                    room.typ = ROOM; room.flags = 0;
                    unblock_point(zx, zy);
                } else if (!_Blind()) {
                    await pline('The tree shudders but is unharmed.'); /* C dig.c:1699-1700 */
                }
                break;
            } else if (room.typ === STONE || room.typ === SCORR) {
                if (!(room.wall_info & W_NONDIGGABLE)) {
                    room.typ = CORR; room.flags = 0;
                    unblock_point(zx, zy);
                } else if (!_Blind()) {
                    await pline('The rock glows then fades.'); /* C dig.c:1707-1708 */
                }
                break;
            }
        } else if (IS_OBSTRUCTED(room.typ)) {
            if (!may_dig(zx, zy))
                break;                              /* C dig.c:1712-1713 */
            if (IS_WALL(room.typ) || room.typ === SDOOR) {
                /* C dig.c:1714-1725 — wall → doorless doorway (non-cavernous)
                 * or corridor (cavernous). */
                if (in_rooms(zx, zy, SHOPBASE).length) {
                    add_damage(zx, zy, SHOP_WALL_COST);
                    shopwall = true;
                }
                await watch_dig(null, zx, zy, true); /* C dig.c:1719 */
                if (lf.is_cavernous_lev && !in_town(zx, zy)) {
                    room.typ = CORR; room.flags = 0; /* C dig.c:1720-1721 */
                } else {
                    room.typ = DOOR; room.doormask = D_NODOOR; /* C dig.c:1722-1723 */
                }
                digdepth -= 2;                      /* C dig.c:1725 */
            } else if (IS_TREE(room.typ)) {
                room.typ = ROOM; room.flags = 0;    /* C dig.c:1726-1727 */
                digdepth -= 2;                      /* C dig.c:1728 */
            } else {
                room.typ = CORR; room.flags = 0;    /* C dig.c:1729-1731 */
                digdepth--;
            }
            unblock_point(zx, zy);                  /* C dig.c:1733 — vision */
        }
        zx += udx;                                  /* C dig.c:1735-1736 */
        zy += udy;
    } /* while */
    tmp_at(DISP_END, 0); /* C dig.c:1738 closing call: newsym()s each saved beam cell */

    /* C dig.c:1751-1752 */
    if (shopdoor || shopwall)
        await pay_for_damage(shopdoor ? 'destroy' : 'dig into', false);
}
