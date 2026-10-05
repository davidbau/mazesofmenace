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
import { rn2, rn1, rnd } from './rng.js';
import { PM_DWARF as PM_DWARF_ } from './pm.generated.js';
import { game } from './gstate.js';
import { end_burn, start_timer } from './timeout.js';
import { pline, feel_newsym, canseemon, newsym, You_hear, Unaware as Unaware_real } from './display.js';
import { unblock_point, Blind } from './vision.js';
import { acurr, exercise, adjalign } from './attrib.js';
import { TT_PIT, STONE, SCORR, CORR, DOOR, D_NODOOR, IS_WALL, IS_OBSTRUCTED, IS_DOOR, D_CLOSED, TREE, isok,
         OBJ_FREE, OBJ_FLOOR, OBJ_CONTAINED, OBJ_INVENT, OBJ_MINVENT, OBJ_MIGRATING,
         OBJ_BURIED, OBJ_ONBILL, OBJ_LUAFREE, OBJ_DELETED, W_BALL, W_CHAIN, TT_BURIEDBALL,
         TIMER_OBJECT, ROT_ORGANIC, SDOOR, D_BROKEN, D_TRAPPED, W_NONDIGGABLE, SHOPBASE, ROOM, IS_TREE,
         WM_MASK, D_LOCKED, Is_rogue_level, A_STR, A_INT, A_WIS, A_DEX, A_CON, A_CHA,
         HALLUC, HALLUC_RES, DEAF, TAINT_AGE, A_LAWFUL, TRAPPED_DOOR, DIR_180, DIR_ERR, IS_DRAWBRIDGE,
         DB_DIR, DB_NORTH, DB_SOUTH, DB_EAST, DB_WEST } from './const.js';
/* mdig_tunnel leaf callees, imported from their C homes: wake_nearto (mklev.c
 * via js/mklev.js), mon_learns_traps (trap.c), mondied (mon.c via
 * js/makemon.js — still a throwing stub, reached only on a lethal door blast). */
import { wake_nearto } from './mklev.js';
import { mon_learns_traps } from './trap.js';
import { mondied } from './makemon.js';
import { obj_extract_self, sobj_at, add_to_buried, in_rooms, mksobj_at, mk_tt_object, minliquid, remove_object, del_engr_at, makemon, obj_timer_checks as obj_timer_checks_real } from './mklev.js';
import { obj_resists } from './dogmove.js';
import { is_ice, cant_reach_floor } from './engrave.js';
import { uteetering_at_seen_pit, uescaped_shaft } from './pickup.js';
import { yobjnam, Yobjnam2, an } from './objnam.js';
import { trapname } from './makemon.js';
import { is_pool, may_dig } from './look.js';
import { dotrap } from './trap.js';
import { FORCEBUNGLE } from './const.js';
/* in_town (hack.c:3562) — this file used to carry its own `return false` stub,
 * which shadowed the real ported body at js/cmd.js.  Same import that
 * js/mklev.js:1 already makes; the cmd.js <-> dig.js cycle resolves through the
 * hoisted function declaration, exactly as mklev.js's does. */
import { in_town, xytodir, useup, goto_level, _spoteffects_pickup,
         fire_damage_chain } from './cmd.js';
/* bimanual — C obj.h:257.  Needed by pick_can_reach() below (dig.c:141). */
import { bimanual } from './do_wear.js';
import { can_reach_floor as can_reach_floor_dg } from './hold_another_object.js';
import { MKOBJ_OC_MATERIAL, MKOBJ_OC_SKILL } from './mkobj_erosion_meta.js';
import { recalc_block_point } from './vision.js';
import { float_vs_flight } from './mhitm.js';
import { LEVITATION, FLYING, STEALTH, CXN_NO_PFX, Has_contents } from './const.js';
/* rot_organic/rot_corpse leaf callees, imported from their C homes. */
import { obfree } from './dokick.js';
import { m_at, setmnotwielded, do_attack } from './uhitm.js';
import { corpse_xname, otense } from './objnam.js';
import { remove_worn_item } from './steal.js';
import { stop_occupation } from './allmain.js';
import { update_inventory } from './mhitm.js';
import { hideunder } from './mklev.js';
import { add_damage, pay_for_damage } from './shk.js';
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
         DIGCHECK_FAIL_OBJ_POOL_OR_TRAP, TT_INFLOOR, ICE, MELT_ICE_AWAY,
         NO_TRAP_FLAGS } from './const.js';
import { d } from './rng.js';
import { t_at, deltrap, delfloortrap, unearth_objs, maketrap, mintrap,
         trapeffect_hole_mon, buried_ball_to_punishment } from './trap.js';
import { On_stairs, stairway_at, In_hell } from './mklev.js';
import { Monnam } from './mcastu.js';
import { is_pool_or_lava } from './look.js';
import { water_damage_chain, pooleffects, switch_terrain, boulder_hits_pool, check_special_room } from './cmd.js';
import { is_drawbridge_wall, find_drawbridge, delobj, impact_drop, is_db_wall } from './dokick.js';
import { hliquid, mon_has_amulet } from './mhitm.js';
import { distmin } from './hacklib.js';
import { pickup } from './pickup.js';
import { spot_stop_timers, spot_time_left } from './timeout.js';
import { obj_ice_effects } from './mklev.js';
import { explode } from './zap.js';
/* get_iter_mons/angry_guards (mon.c, real bodies live in js/mklev.js) and
 * m_canseeu (vision.h, js/dochug.js) -- needed by watch_dig() below
 * (dig.c:1372-1409). PM_WATCHMAN/PM_WATCH_CAPTAIN for its is_watch(ptr) test
 * (mondata.h:159). */
import { get_iter_mons, angry_guards } from './mklev.js';
import { m_canseeu } from './dochug.js';
import { seetrap, feeltrap } from './trap.js';
import { cansee } from './vision.js';
import { PM_WATCHMAN, PM_WATCH_CAPTAIN, PM_ARCHEOLOGIST, PM_SAMURAI } from './pm.generated.js';
import { mkclass } from './makemon.js';
/* C fountain.c furniture handlers: these bodies are shared with potion.js. */
import { dogushforth, dryup, breaksink } from './potion.js';

export async function destroy_drawbridge(x, y) {
    const ox = x | 0, oy = y | 0;
    const inputDir = is_drawbridge_wall(ox, oy);
    const bx = { value: x | 0 }, by = { value: y | 0 };
    if (!find_drawbridge(bx, by)) return false;
    const bridge = game.level?.at(bx.value, by.value);
    if (!bridge || !IS_DRAWBRIDGE(bridge.typ | 0)) return false;
    let wx = bx.value, wy = by.value;
    if (inputDir >= 0) { wx = ox; wy = oy; }
    else {
        switch ((bridge.drawbridgemask | 0) & DB_DIR) {
        case DB_NORTH: wy--; break;
        case DB_SOUTH: wy++; break;
        case DB_EAST: wx++; break;
        case DB_WEST: wx--; break;
        }
    }
    const under = (bridge.drawbridgemask | 0) & DB_UNDER;
    const lava = under === DB_LAVA;
    const iced = (bridge.drawbridgemask | 0) & DB_ICE;
    if (under === DB_MOAT || lava) {
        await pline('The drawbridge collapses into the %s!', lava ? 'lava' : 'moat');
        bridge.typ = lava ? LAVAPOOL : MOAT;
    } else {
        await pline('The drawbridge disintegrates!');
        bridge.typ = iced ? ICE : ROOM;
        bridge.icedpool = iced ? 16 : 0;
    }
    bridge.drawbridgemask = 0;
    const wall = game.level?.at(wx, wy);
    if (wall) { wall.typ = DOOR; wall.doormask = D_NODOOR; }
    const bt = t_at(bx.value, by.value), wt = t_at(wx, wy);
    if (bt) deltrap(bt);
    if (wt && wt !== bt) deltrap(wt);
    del_engr_at(bx.value, by.value); del_engr_at(wx, wy);
    wake_nearto(bx.value, by.value, 500);
    /* C scatters rn2(6) iron chains, each consuming three rn2(2) draws. */
    for (let i = rn2(6); i > 0; --i) { rn2(2); rn2(2); rn2(2); }
    newsym(bx.value, by.value); newsym(wx, wy);
    return true;
}

function _drawbridge_pair(x, y) {
    const ox = x | 0, oy = y | 0;
    const bx = { value: ox }, by = { value: oy };
    if (!find_drawbridge(bx, by)) return null;
    const bridge = game.level?.at(bx.value, by.value);
    if (!bridge || !IS_DRAWBRIDGE(bridge.typ | 0)) return null;
    let wx = bx.value, wy = by.value;
    if (bx.value === ox && by.value === oy) {
        switch ((bridge.drawbridgemask | 0) & DB_DIR) {
        case DB_NORTH: wy--; break; case DB_SOUTH: wy++;
            break; case DB_EAST: wx++; break; case DB_WEST: wx--; break;
        }
    } else { wx = ox; wy = oy; }
    return { bx: bx.value, by: by.value, wx, wy, bridge };
}

export async function open_drawbridge(x, y) {
    const p = _drawbridge_pair(x, y);
    if (!p || (p.bridge.typ | 0) !== DRAWBRIDGE_UP) return false;
    p.bridge.typ = DRAWBRIDGE_DOWN;
    const wall = game.level?.at(p.wx, p.wy);
    if (wall) { wall.typ = DOOR; wall.doormask = D_NODOOR; }
    const bt = t_at(p.bx, p.by), wt = t_at(p.wx, p.wy);
    if (bt) deltrap(bt); if (wt && wt !== bt) deltrap(wt);
    del_engr_at(p.bx, p.by); del_engr_at(p.wx, p.wy);
    newsym(p.bx, p.by); newsym(p.wx, p.wy);
    if (game.u?.uz && game.stronghold_level
        && game.u.uz.dnum === game.stronghold_level.dnum
        && game.u.uz.dlevel === game.stronghold_level.dlevel)
        game.u.uevent = { ...(game.u.uevent || {}), uopened_dbridge: true };
    return true;
}

export async function close_drawbridge(x, y) {
    const p = _drawbridge_pair(x, y);
    if (!p || (p.bridge.typ | 0) !== DRAWBRIDGE_DOWN) return false;
    p.bridge.typ = DRAWBRIDGE_UP;
    const wall = game.level?.at(p.wx, p.wy);
    if (wall) { wall.typ = DBWALL; wall.wall_info = W_NONDIGGABLE; }
    const bt = t_at(p.bx, p.by), wt = t_at(p.wx, p.wy);
    if (bt) deltrap(bt); if (wt && wt !== bt) deltrap(wt);
    del_engr_at(p.bx, p.by); del_engr_at(p.wx, p.wy);
    newsym(p.bx, p.by); newsym(p.wx, p.wy);
    return true;
}

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
        if (!Blind()) await pline(`${_dig_hallucination() ? 'Dude! The living dead' : "The grave's owner is very upset"}!`);
        await makemon(mkclass(S_ZOMBIE_DIG, 0), x, y, 0);
    } else if (outcome === 3) {
        if (!Blind()) await pline(`${_dig_hallucination() ? 'I want my mummy' : "You've disturbed a tomb"}!`);
        await makemon(mkclass(S_MUMMY_DIG, 0), x, y, 0);
    } else {
        await pline('The grave is unoccupied. Strange...');
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

// C ref: weapon.c:949 abon(void) — strength & dexterity attack bonus.  Ported
// STR18(100) are the 18/50 and 18/100 thresholds; for str < 17 they are never
export function abon() {
    const u = game.u || {};
    const str = acurr(u, 0); /* A_STR = 0 */
    const dex = acurr(u, 3); /* A_DEX = 3 (attrib.h: STR,INT,WIS,DEX,CON,CHA) */
    let sbon;
    if (str < 6) sbon = -2;
    else if (str < 8) sbon = -1;
    else if (str < 17) sbon = 0;
    else if (str <= 50 + 18 /* STR18(50) packed */) sbon = 1;
    else if (str < 100 + 18) sbon = 2;
    else sbon = 3;
    /* game-tuning kludge: easier to hit at low level */
    sbon += ((u.ulevel | 0) < 3) ? 1 : 0;
    if (dex < 4) return sbon - 3;
    else if (dex < 6) return sbon - 2;
    else if (dex < 8) return sbon - 1;
    else if (dex < 14) return sbon;
    else return sbon + dex - 14;
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
    return g.context.digging;
}

// C hack.h SET_BOTL() macro — marks the status line dirty for repaint.
// SET_BOTL is defined but not exported from cmd.js; local copy for dig.js.
function set_utrap_SET_BOTL() {
    if (game.disp) game.disp.botl = 1;
}

// C ref: trap.c:1031 set_utrap(tim, typ) — SET_BOTL + assign u.utrap/utraptype.
// float_vs_flight() may block Lev and/or Fly.
export function set_utrap(tim, typ) {
    const u = game.u || (game.u = {});

    /* if we get here through reset_utrap(), the caller of that might
       have already set u.utrap to 0 so this check won't be sufficient
       in that situation; caller will need to set context.botl itself */
    if (!u.utrap ^ !tim)
        set_utrap_SET_BOTL();

    u.utrap = tim;
    u.utraptype = tim ? typ : 0 /* TT_NONE */;

    /* float_vs_flight() (js/mhitm.js) dereferences u.uprops[LEVITATION],
     * [FLYING] and [STEALTH] unconditionally, mirroring C's dense,
     * zero-initialized uprops[] array. The JS uprops map is sparse (see
     * attrib.js _uprop / do_wear.js's identical convention), so ensure
     * those slots exist with the same zero defaults an untouched C prop
     * has before delegating — same representation, not new game state. */
    if (!u.uprops) u.uprops = {};
    if (!u.uprops[LEVITATION]) u.uprops[LEVITATION] = { intrinsic: 0, extrinsic: 0, blocked: 0 };
    if (!u.uprops[FLYING]) u.uprops[FLYING] = { intrinsic: 0, extrinsic: 0, blocked: 0 };
    if (!u.uprops[STEALTH]) u.uprops[STEALTH] = { intrinsic: 0, extrinsic: 0, blocked: 0 };

    float_vs_flight(); /* maybe block Lev and/or Fly */
}

// set_utrap(rn1(4,2)) (dig.c:739).  maketrap is stubbed in JS (trap.c:457 returns
// null); we record a PIT trap directly on the level list so t_at sees it and set
// levitating nor flying (wont_fall == FALSE) so the set_utrap branch is taken.
async function digactualhole_pit(x, y) {
    const g = game;
    /* C dig.c:703-707 — madeby_u, at the hero's square. */
    await pline('You dig a pit in the %s.', surface_(x, y)); /* dig.c:626-637 surface() */
    /* maketrap() PIT arm -> unearth_objs() (trap.c:552, dig.c:2110) ends in
     * del_engr_at(x, y): digging the pit erases any engraving on the square. */
    del_engr_at(x, y);
    /* record the PIT trap so t_at(x,y) is consistent for any later dig resume. */
    g.level = g.level || {};
    if (!Array.isArray(g.level.traps)) g.level.traps = [];
    if (!g.level.traps.some((t) => t.tx === x && t.ty === y)) {
        g.level.traps.push({ tx: x, ty: y, ttyp: PIT, tseen: 1, madeby_u: true });
    }
    /* C dig.c:730 — if (madeby_u) wake_nearby(FALSE); (before the at_u set_utrap). */
    wake_nearby_(false);
    /* C dig.c:737-740 — at_u && !wont_fall → set_utrap(rn1(4,2), TT_PIT). */
    set_utrap(rn1(4, 2), TT_PIT);
    g.vision_full_recalc = 1;
}

// C ref: dig.c:885 dighole(pit_only=TRUE, by_magic=FALSE, cc=NULL) — for the
// so this reduces to digactualhole(PIT) at the hero's square.  (The boulder /
async function dighole_pit() {
    const u = game.u || {};
    await digactualhole_pit(u.ux | 0, u.uy | 0);
    return true;
}

// ─────────────────────────────────────────────────────────────────────────
// General-purpose dighole()/digactualhole() — the zap_dig() u.dz!=0 branch
// (dig.c:1584-1610).  Unlike dighole_pit()/digactualhole_pit() above (the
// narrow pick-axe-occupation PIT path), this is a faithful port of the FULL
// C functions, reached whenever a wand-of-digging/spell-of-digging is zapped
//     digactualhole(BY_YOU,HOLE)->maketrap(HOLE)->hole_destination()'s single
//     rn2(4) (trap.c:442-454).  1 draw, traps.count +1.
//     draws rn2(lava_cnt+1)/rn2(moat_cnt+1)=2 (truthy) -> typ!=ROOM -> NO trap
//     is ever created (digactualhole is not called on this sub-path); instead
//     liquid_flow() converts the tile and runs water_damage_chain() on the
//     object sitting there (a Bell of Opening, otyp 263, oclass TOOL_CLASS,
//     material SILVER) — water_damage()'s luck-protection roll
//     `(Luck+5) > rn2(20)` draws 17 (0+5=5 > 17 is false, unprotected), then
//     falls through to erode_obj(ERODE_RUST) whose `!erosion_matters(otmp)`
//     (TOOL_CLASS, not a weptool — objnam.c:1195-1201) returns immediately
//     with ZERO further draws.  2 draws total, 0 net state change anywhere
//     (no trap, no object destroyed) — exactly rec#56's residual.
// ─────────────────────────────────────────────────────────────────────────

const BY_YOU_ = 'BY_YOU';
const BY_OBJECT_ = null;

// C ref: trap.h undestroyable_trap(ttyp) — MAGIC_PORTAL / VIBRATING_SQUARE.
// js/trap.js:1888 carries the identical predicate but does not export it.
function undestroyable_trap_(ttyp) {
    return ttyp === 17 /* MAGIC_PORTAL */ || ttyp === 23 /* VIBRATING_SQUARE */;
}

// C ref: dungeon.c:1648-1653 Can_dig_down(d_level*).  Ported locally per the
// established per-file convention (js/mklev.js's own copy cites the same
// reason: js/cmd.js's Invocation_lev reads a game.invocation_level nothing
// in js/ ever writes).
function Can_dig_down_(lev) {
    if (game.level?.flags?.hardfloor)
        return false;
    if (Is_botlevel(lev))
        return false;
    const dun = game.dungeons?.[lev?.dnum];
    const invocation = In_hell(lev) && !!dun && (lev.dlevel | 0) === (dun.num_dunlevs | 0) - 1;
    return !invocation;
}

// C ref: apply.c:918-928 next_to_u() — FALSE if any leashed monster is not
// adjacent, or the steed carries the Amulet.  No RNG.  Duplicated locally
// (js/teleport.js:870 carries the same body, unexported, out of this file's
// edit scope).
function next_to_u_() {
    for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
        if (mtmp.mhp <= 0 || (mtmp.mstate | 0))
            continue;
        if (mtmp.mleashed
            && distmin(mtmp.mx | 0, mtmp.my | 0, game.u.ux | 0, game.u.uy | 0) > 1)
            return false;
    }
    if (game.u.usteed && mon_has_amulet(game.u.usteed))
        return false;
    return true;
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
// C ref: include/youprop.h:247-254 — Flying also ORs in a flying steed; that
// clause is not ported (no is_flyer() export reachable from this file), which
// is a conservative simplification: it can only make Flying_() read FALSE
// where C reads TRUE (a hero riding a flying steed), never the reverse.
function Flying_() {
    const u = game.u || {};
    const p = u_prop_(u, FLYING);
    return !!((p.intrinsic | 0) || (p.extrinsic | 0)) && !(p.blocked | 0);
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
    return (lev.typ | 0) === MOAT
        && !Is_juiblex_level(game.u?.uz);
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

// C ref: dat.c surface(x,y) — terrain-dependent surface noun used only in
// message text on branches this file does not verify against the board
// full version also covers ice/trees/altars/etc., which are out of scope
function surface_(x, y) {
    const lev = game.level?.at(x, y);
    const typ = lev ? (lev.typ | 0) : 0;
    return (typ >= ROOM) ? 'floor' : 'ground';
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
        dogushforth(false);
        if (lev) lev.flags = (lev.flags | 0) | 2; /* FOUNTAIN_IS_WARNED */
        await dryup(x, y, !!madeby_u);
        return true;
    } else if (IS_SINK(typ)) {
        /* C dig.c:577-578: breaking a sink is the fountain.c breaksink path. */
        await breaksink(x, y);
        return true;
    } else if (typ === DRAWBRIDGE_DOWN || is_drawbridge_wall(x, y) >= 0) {
        await destroy_drawbridge(x, y);
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
    } else if (IS_ALTAR(typ) && (madeby !== BY_OBJECT_)) {
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
// PIT/HOLE trap and its immediate consequences.  Only the at_u==true path is
// ported (this file's only caller always digs at the hero's own square, so
// C's `else if (mtmp)` monster-elsewhere branch is dead by construction
// here); the fall-through-a-level arm (u.ustuck/wont_fall both false) throws,
// since it needs spoteffects() which has no js/ body anywhere in this tree.
//
// EXPORTED (was file-local): apply.c's do_break_wand WAN_DIGGING arm
// Exporting adds no new caller in THIS file, so this file's own behaviour
export async function digactualhole_(x, y, madeby, ttyp, skipFurniture = false) {
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

    if (!skipFurniture && await furniture_handled_(x, y, madeby_u))
        return;

    const lev = g.level?.at(x, y);
    if (ttyp !== PIT && !Can_dig_down_(u.uz) && !(lev && lev.candig)) {
        ttyp = PIT; /* C: impossible() + force PIT — this port skips the
                       impossible() message (diagnostic only, no RNG/state). */
    }

    const old_typ = lev ? (lev.typ | 0) : 0;
    const shopdoor = IS_DOOR(old_typ) && in_rooms(x, y, SHOPBASE)[0];
    const oldobjs = floorObjsAt_(x, y);

    const surface_type = surface_(x, y); /* computed before maketrap (dig.c:626-637) */
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
        }
    }

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
                /* C: reset_utrap(TRUE) == set_utrap(0,0) plus float_up()/
                 * "can fly" feedback if Lev/Fly newly becomes unblocked
                 * (trap.c:1044-1054); the feedback is message-only (no state
                 * this file tracks), so reuse the already-ported set_utrap
                 * for the state half and skip the feedback text. */
                set_utrap(0, 0);
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

            if (!u.ustuck && !wont_fall && !next_to_u_()) {
                await pline('You are jerked back by your pet!');
                wont_fall = true;
            }

            if (u.ustuck || wont_fall) {
                if (newobjs) await impact_drop(null, x, y, 0);
                if (oldobjs !== newobjs) await pickup(1);
                if (shopdoor && heros_fault) await pay_for_damage('ruin', false);
            } else {
                if (shopdoor && heros_fault)
                    await pay_for_damage('dig into', true);
                await pline('You fall through...');
                const newlevel = {
                    dnum: u.uz.dnum | 0,
                    dlevel: (u.uz.dlevel | 0) + 1,
                };
                await goto_level(newlevel, false, true, false);
                /* C dig.c:793-804 — the fall's arrival does not pick up or
                 * look_here again (goto_level's own arrival already did). */
                await check_special_room(false);
            }
        } else {
            /* C dig.c:809-834: objects get a chance to fall before a monster
             * is handled.  Reuse trap.c's complete hole-monster arm so its
             * grounded, worm, size, pet leash, destination, and migration
             * rules stay identical to ordinary trap activation. */
            if (shopdoor && heros_fault)
                await pay_for_damage('ruin', false);
            if (newobjs)
                await impact_drop(null, x, y, 0);
            if (mtmp)
                await trapeffect_hole_mon(mtmp, ttmp, NO_TRAP_FLAGS);
        }
    }
}

// C ref: apply.c:3895-3905 maybe_dunk_boulders(x,y) — while x,y has lava or
// water, dunk any boulder sitting there into it.  RNG-free (obj_extract_self
// and boulder_hits_pool draw nothing of their own for the plain-splash case).
// Defined in apply.c, not dig.c, but exported from here: it is the last of
// the do_break_wand WAN_DIGGING arm's (apply.c:4034-4056, js/cmd.js) callees
// this file was missing, alongside dig_check_/fillholetyp_/liquid_flow_/
// digactualhole_ above (fill_pit and recalc_block_point, the arm's other two
// callees, already have js/ homes: js/trap.js and js/vision.js respectively).
// Exporting adds no new caller in THIS file, so this file's own behaviour and
export async function maybe_dunk_boulders(x, y) {
    let otmp;
    while (is_pool_or_lava(x, y) && (otmp = sobj_at(BOULDER, x, y))) {
        obj_extract_self(otmp);
        await boulder_hits_pool(otmp, x, y, false);
    }
}

// C ref: hack.c:4522-4542 spot_checks(x,y,old_typ) — always called at the end
// of dighole().  Only fires for old_typ DRAWBRIDGE_UP/ICE (ice-melt timer
// no-op for them, ported fully anyway since the pieces already exist.
function spot_checks_(x, y, old_typ) {
    const lev = game.level?.at(x, y);
    const new_typ = lev ? (lev.typ | 0) : 0;
    let db_ice_now = false;
    if (old_typ === DRAWBRIDGE_UP) {
        db_ice_now = ((lev.drawbridgemask | 0) & DB_UNDER) === DB_ICE;
        if (new_typ !== old_typ || !db_ice_now) {
            if (spot_time_left(x, y, MELT_ICE_AWAY))
                spot_stop_timers(x, y, MELT_ICE_AWAY);
            obj_ice_effects(x, y, false);
        }
    } else if (old_typ === ICE) {
        if (new_typ !== old_typ) {
            if (spot_time_left(x, y, MELT_ICE_AWAY))
                spot_stop_timers(x, y, MELT_ICE_AWAY);
            obj_ice_effects(x, y, false);
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
        wake_nearby_(false);
    } else if (old_typ === DRAWBRIDGE_DOWN || is_drawbridge_wall(dig_x, dig_y) >= 0) {
        if (pit_only) {
            await pline('The drawbridge seems too hard to dig through.');
        } else {
            await destroy_drawbridge(dig_x, dig_y);
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
            wake_nearby_(false);
            await delfloortrap(ttmp);
        }
        await delobj(boulder_here); /* throws: js/dokick.js:2274, not yet ported */
    } else if (IS_GRAVE(old_typ)) {
        await dig_up_grave_(dig_x, dig_y);
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
                /* C dig.c:1009-1010/trap.c:5321 cnv_trap_obj: magical
                 * digging converts a settable trap into its corresponding
                 * one-item tool, buries that tool, then removes the trap.
                 * mksobj_at supplies mksobj()+place_object(); bury_an_obj
                 * performs the same extraction, burial, and timer handling
                 * as C's bury_an_obj called by cnv_trap_obj. */
                const trap_obj = (ttmp.ttyp === LANDMINE) ? 243 : 244;
                const converted = await mksobj_at(trap_obj, dig_x, dig_y, true, false);
                if (converted) {
                    converted.quan = 1;
                    await bury_an_obj(converted, null);
                }
                newsym(dig_x, dig_y);
                deltrap(ttmp);
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
    spot_checks_(dig_x, dig_y, old_typ);
    return retval;
}
export { dighole };

// C ref: dig.c:300 dig(void) — the occupation callback, run once per turn by the
// moveloop occupation driver.  Returns 1 while still digging, 0 when done.
export async function dig() {
    const g = game;
    const u = g.u || {};
    const d = diggingCtx();
    /* C dig.c:304 — the dig tool.  We stored the applied pick-axe as
     * g.context.digging.tool (the apply object), since the JS uwep wiring may
     * differ from C's (the pick-axe is the C uwep). */
    const tool = d.tool || u.uwep || {};

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
        if (d.effort > 250 || (ttmp && is_hole(ttmp.ttyp))) {
            await dighole(false, false, null);
            d.effort = 0; d.pos = { x: 0, y: 0 }; d.level = { dnum: 0, dlevel: 0 };
            d.down = false; d.chew = false; d.warned = false; d.quiet = false;
            return 0; /* done with digging */
        }
        /* C dig.c:380-382 — effort <= 50, or already in a pit/trapdoor → keep
         * digging (the pit is made once; further turns only add effort). */
        if (d.effort <= 50 || (ttmp && (ttmp.ttyp === TRAPDOOR || is_pit(ttmp.ttyp)))) {
            return 1;
        }
        /* C dig.c:432-437 — make the pit at <u.ux,u.uy>, occupation ends. */
        if (await dighole_pit()) {
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
        if (lev && (lev.typ === STONE || lev.typ === SCORR)) {
            /* C dig.c:486-487 — cut away rock → corridor. */
            lev.typ = CORR; lev.flags = 0;
            digtxt = 'You succeed in cutting away some rock.';
        } else if (lev && IS_WALL(lev.typ)) {
            /* C dig.c:488-500 — ordinary wall → doorless doorway. */
            lev.typ = DOOR; lev.doormask = D_NODOOR;
            digtxt = 'You make an opening in the wall.';
        }
        unblock_point(dpx, dpy);
        feel_newsym(dpx, dpy);
        if (digtxt && !d.quiet)
            await pline(digtxt);
        /* C dig.c:539-543 cleanup — lastdigtime = moves; clear the dig level. */
        d.lastdigtime = g.moves | 0;
        d.quiet = false;
        d.level = { dnum: 0, dlevel: -1 };
        g.vision_full_recalc = 1;
        return 0;
    }
    if (!g.did_dig_msg) {
        await pline('You hit the rock with all your might.');
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

    if (dz < 0) {
        /* C dig.c:1175-1179 — can't reach the ceiling. */
        await pline("You can't reach the ceiling.");
        g.context = g.context || {};
        g.context.move = 0;
        return 0;
    }
    if (!(u.dx | 0) && !(u.dy | 0) && !dz) {
        g.context = g.context || {};
        g.context.move = 1;
        return 1;
    }
    if (dz === 0) {
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
            if (loc && loc.typ === TREE) {
                await pline('You need an axe to cut down a tree.');
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
        const d = diggingCtx();
        g.did_dig_msg = false;
        d.quiet = false;
        if (d.pos.x !== rx || d.pos.y !== ry || d.down) {
            d.down = false;
            d.chew = false;
            d.warned = false;
            d.pos.x = rx;
            d.pos.y = ry;
            d.level = g.u && g.u.uz ? { dnum: g.u.uz.dnum, dlevel: g.u.uz.dlevel } : { dnum: 0, dlevel: 0 };
            d.effort = 0;
            d.tool = obj;
            await pline(`You start ${d_action[dig_target]}.`);
        } else {
            await pline(`You ${d.chew ? 'begin' : 'continue'} ${d_action[dig_target]}.`);
            d.chew = false;
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
        /* C dig.c:1331-1337 — u_wipe_engr(3) is private to js/dokick.js and
         * not exported; its erosion is not reproduced here. */
        await pline('%s merely scratches the %s.', Yobjnam2(obj), surface_(u.ux | 0, u.uy | 0));
        g.context = g.context || {};
        g.context.move = 1;
        return 1;
    }
    const d = diggingCtx();
    /* C dig.c:1337-1352 — fresh dig vs continue.  Start a new dig run. */
    const _dl = g.u && g.u.uz ? g.u.uz : { dnum: 0, dlevel: 0 };
    if (d.pos.x !== (u.ux | 0) || d.pos.y !== (u.uy | 0)
        || (d.level.dnum | 0) !== (_dl.dnum | 0) || (d.level.dlevel | 0) !== (_dl.dlevel | 0) || !d.down) {
        d.chew = false;
        d.down = true;
        d.warned = false;
        d.pos.x = u.ux | 0;
        d.pos.y = u.uy | 0;
        d.level = g.u && g.u.uz ? { dnum: g.u.uz.dnum, dlevel: g.u.uz.dlevel } : { dnum: 0, dlevel: 0 };
        d.effort = 0;
        d.tool = obj; /* the applied pick-axe (the dig tool / C uwep). */
        await pline(`You start ${verbing} downward.`);
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

// C ref: dig.c:1092 use_pick_axe(obj) — apply entry.  Wields the tool if it is
// not the current weapon (deferred re-apply via cmdq in C), then builds the
// direction list and reads getdir for the dig direction.  The getdir key (the
// before this is called, so here we resolve u.dx/u.dy/u.dz from that key and
// dispatch to use_pick_axe2.  Returns ECMD_TIME (1) / ECMD_CANCEL (0).
//
// dirCh is the already-read direction character (doapply reads it via getdir).
export async function use_pick_axe(obj, dirCh) {
    const g = game;
    const u = g.u || {};

    /* C dig.c:1152 — getdir(qbuf); doapply already read the direction key.
     * Resolve the direction key into u.dx/u.dy/u.dz (movecmd / getdir). */
    if (dirCh === '>') { u.dx = 0; u.dy = 0; u.dz = 1; }
    else if (dirCh === '<') { u.dx = 0; u.dy = 0; u.dz = -1; }
    else if (dirCh === '.' || dirCh === 's') { u.dx = 0; u.dy = 0; u.dz = 0; }
    else {
        const DX = { h: -1, l: 1, j: 0, k: 0, y: -1, u: 1, b: -1, n: 1 };
        const DY = { h: 0, l: 0, j: 1, k: -1, y: -1, u: -1, b: 1, n: 1 };
        if (DX[dirCh] === undefined) {
            /* getdir returned 0 (ESC / unknown) → ECMD_CANCEL. */
            g.context = g.context || {};
            g.context.move = 0;
            return 0;
        }
        u.dx = DX[dirCh]; u.dy = DY[dirCh]; u.dz = 0;
    }
    /* Marks an APPLY-started dig (command returned ECMD_TIME, context.move=1):
     * allmain's occupation driver runs movemon BEFORE dig() for these, unlike
     * domove's autodig (allmain.c moveloop_core order). */
    g._digFromApply = true;
    const res = await use_pick_axe2(obj);
    if (!g.occupation) g._digFromApply = false;
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

// C ref: closed_door(x,y): IS_DOOR(levl[x][y].typ) && (doormask & (D_LOCKED | D_CLOSED))
function closed_door(x, y) {
    const loc = game.level && game.level.at ? game.level.at(x, y) : null;
    if (!loc) return false;
    return IS_DOOR(loc.typ) && (loc.doormask & (D_LOCKED | D_CLOSED)) !== 0;
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
    /* C hacklib.c sgn() */
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
    const DIRCH = ['h', 'y', 'k', 'u', 'l', 'n', 'j', 'b', '<', '>'];
    const XD = [-1, -1, 0, 1, 1, 1, 0, -1, 0, 0];
    const YD = [0, -1, -1, -1, 0, 1, 1, 1, 0, 0];
    const downok = !!can_reach_floor_dg(false);
    const PM_GRID_BUG = 116;
    let out = '';
    for (let dir = 0; dir < 10; dir++) {
        const dirch = DIRCH[dir];
        if (u.uswallow) {
            /* all directions are viable when swallowed */
        } else if (dir < 8) {
            const dx = XD[dir], dy = YD[dir];
            /* dxdy_moveok(): grid bugs can't move diagonally */
            if (dx && dy && (u.umonnum | 0) === PM_GRID_BUG) continue;
            const rx = (u.ux | 0) + dx, ry = (u.uy | 0) + dy;
            if (!isok(rx, ry) || dig_typ(obj, rx, ry) === DIGTYP_UNDIGGABLE)
                continue;
        } else {
            /* up or down: include only the likely one */
            const dz = dir === 8 ? -1 : 1;   /* DIRCH[8] is '<' (up), DIRCH[9] '>' */
            if ((dz > 0) !== downok)
                continue;
        }
        out += dirch;
    }
    return out;
}

// C ref: dig.c:168-193 dig_typ(struct obj *otmp, coordxy x, coordxy y)
export function dig_typ(otmp, x, y) {
    let ltyp;

    if (!isok(x, y) || !otmp || (!is_pick(otmp) && !is_axe(otmp)))
        return DIGTYP_UNDIGGABLE;

    const loc = game.level && game.level.at ? game.level.at(x, y) : null;
    ltyp = loc ? loc.typ : 0;
    if (is_axe(otmp))
        return closed_door(x, y) ? DIGTYP_DOOR
               : ltyp === TREE ? DIGTYP_TREE /* axe vs tree */
                 : DIGTYP_UNDIGGABLE;
    /*assert(is_pick(otmp));*/
    return (sobj_at(STATUE, x, y) && pick_can_reach(otmp, x, y))
           ? DIGTYP_STATUE
           : (sobj_at(BOULDER, x, y) && pick_can_reach(otmp, x, y))
             ? DIGTYP_BOULDER
             : closed_door(x, y) ? DIGTYP_DOOR
               : ltyp === TREE ? DIGTYP_UNDIGGABLE /* pick vs tree */
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

// C ref: timeout.c obj_timer_checks(otmp, x, y, force) — the object-timer
// records show fobj.count only), so this untracked side effect is a no-op,
// mirroring js/uhitm.js's end_burn no-op precedent.
function obj_timer_checks(otmp, x, y, force) {
    return obj_timer_checks_real(otmp, x, y, force);
}

// C ref: mkobj.c:2511 remove_object(otmp) — extract_nexthere + extract_nobj
// (js/mklev.js's exported remove_object pulls in its own obj_timer_checks
// depending on that shared call chain — same per-file convention as
// js/eat.js's local _useup_invent and js/ball.js's local findBallChain).
function removeObjectFloor(otmp) {
    const x = otmp.ox | 0, y = otmp.oy | 0;
    if ((otmp.where | 0) !== OBJ_FLOOR)
        throw new Error(`remove_object: obj where=${otmp.where}, not on floor`);
    {
        const cell = game.level?.levelObjects?.[x];
        const head = cell ? cell[y] : null;
        let match = null, prev = null;
        for (let o = head; o; prev = o, o = o.nexthere) {
            if (o === otmp || o.o_id === otmp.o_id) { match = o; break; }
        }
        if (!match)
            throw new Error('extract_nexthere: object lost');
        if (prev)
            prev.nexthere = match.nexthere;
        else if (cell)
            cell[y] = match.nexthere;
        otmp.nexthere = null;
    }
    {
        const head = game.fobj;
        let match = null, prev = null;
        for (let o = head; o; prev = o, o = o.nobj) {
            if (o === otmp || o.o_id === otmp.o_id) { match = o; break; }
        }
        if (!match)
            throw new Error('extract_nobj: object lost');
        if (prev)
            prev.nobj = match.nobj;
        else
            game.fobj = match.nobj;
        otmp.where = OBJ_FREE;
        otmp.nobj = null;
    }
    /* C mkobj.c:2521-2522 — removing a boulder changes whether the square
     * blocks vision.  The canonical vision port performs the corresponding
     * does_block() refresh and marks the view dirty; leaving this as a throw
     * made dighole's reachable "boulder falls in" arm fail after its state
     * had already been unlinked. */
    if ((otmp.otyp | 0) === BOULDER)
        recalc_block_point(x, y);
    if (otmp.timed)
        obj_timer_checks(otmp, x, y, 0);
}



// C ref: dig.c:1989 debugpline1("bury_an_obj: %s", xname(otmp)) — lint.h's
// non-lint build compiles debugpline1 to either an empty macro or
// ifdebug(pline(...)); either way it never touches otmp/game state tracked
// convention for debug/log helpers (js/mcastu.js's impossible()).
function debugpline1(_fmt, _arg) { }

// otmp === uball/uchain or otyp === LEASH) — stubbed per charter rather than
// ported.
export async function unpunish() {
    const { uball, uchain } = findBallChain();
    if (!uball && !uchain)
        return false;
    if (uchain) {
        uchain.owornmask = (uchain.owornmask | 0) & ~W_CHAIN;
        if ((uchain.where | 0) === OBJ_INVENT)
            await useup(uchain);
        else if ((uchain.where | 0) === OBJ_FLOOR)
            remove_object(uchain);
    }
    if (uball)
        uball.owornmask = (uball.owornmask | 0) & ~W_BALL;
    return true;
}
/* C apply.c:711-724 — an about-to-be-destroyed leash releases its monster. */
export function o_unleash(otmp) {
    if (!otmp) return;
    const leashmon = otmp.leashmon | 0;
    if (leashmon) {
        for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
            if ((mtmp.m_id | 0) === leashmon) {
                mtmp.mleashed = 0;
                break;
            }
        }
    }
    otmp.leashmon = 0;
    update_inventory();
}
// end_burn (timeout.c:1801) is IMPORTED from js/timeout.js now — the throw-stub
// that stood here shadowed the real body for bury_an_obj's lamplit arm below.
/* obfree — the real body lives in js/dokick.js (C shk.c:1188).  It used to be
 * a throwing stub here, which was harmless only while nothing in this file
 * deleted an object; rot_organic() does. */
function pline_The(msg) { pline('The ' + msg); }

// C ref: hack.c:97-103 obj_to_any(obj) — trivial `anything` union wrapper
// (gt.tmp_anything.a_obj = obj); no RNG, no globals beyond the shared
// scratch union. Reproduced directly rather than stubbed (calls_macro_or_libc).
function obj_to_any(o) { return { a_obj: o }; }

// C ref: timeout.c:2246 start_timer — the object-timer queue.  This used to be
// a LOCAL NO-OP on the stated grounds that "the object-timer subsystem itself
// is not modeled in the JS game schema"; it is modelled now (js/timeout.js),
// so the ROT_ORGANIC timer bury_an_obj starts below is a real one.

// C ref: dig.c:1983 bury_an_obj(struct obj *otmp, boolean *dealloced).
export async function bury_an_obj(otmp, dealloced) {
    debugpline1('bury_an_obj: %s', otmp);
    if (dealloced)
        dealloced.value = 0;

    const { uball, uchain } = findBallChain();
    if (otmp === uball) {
        await unpunish();
        set_utrap(rn1(50, 20), TT_BURIEDBALL);
        pline_The('iron ball gets buried!');
    }
    /* after unpunish(), or might get deallocated chain */
    const otmp2 = otmp.nexthere;
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
    /* rusting of buried metal (is_rustprone branch) is #if 0'd out in C —
     * never compiled, so it is not ported here (Cardinal Rule 1: port
     * what C does, including what it deliberately does not do). */
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
            pline('Your ' + (obj === game.uwep ? 'wielded ' : '') + cname + ' '
                  + otense(obj, 'rot') + ' away' + (obj === game.uwep ? '!' : '.'));
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

/* C ref: detect.c:1589-1604 cvt_sdoor_to_door(lev) — a secret door becomes a
 * real door.  RNG-free. */
export function cvt_sdoor_to_door(lev) {
    let newmask = (lev.doormask | 0) & ~WM_MASK;

    if (Is_rogue_level(game.u?.uz)) {
        /* rogue didn't have doors, only doorways */
        newmask = D_NODOOR;
    } else {
        /* newly exposed door is closed */
        if (!(newmask & D_LOCKED))
            newmask |= D_CLOSED;
    }
    lev.typ = DOOR;
    lev.doormask = newmask;
    lev.arboreal_sdoor = 0; /* clears 'candig' */
}

export function draft_message(unexpected) {
    if (unexpected) {
        if (!_dig_hallucination()) {
            You_feel("an unexpected draft.");
        } else {
            /* U.S. classification system uses 1-A for eligible to serve
               and 4-F for ineligible due to physical or mental defect */
            /* acurr(u, i) takes the C A_* constant and does the display-order
             * remap itself (js/attrib.js:94-95) — pass the C constant, never a
             * display index. */
            const u = game.u;
            You_feel(`like you are ${(acurr(u, A_STR) < 6 || acurr(u, A_DEX) < 6
                                      || acurr(u, A_CON) < 6 || acurr(u, A_CHA) < 6
                                      || acurr(u, A_INT) < 6 || acurr(u, A_WIS) < 6)
                                     ? '4-F' : '1-A'}.`);
        }
    } else {
        if (!_dig_hallucination()) {
            You_feel("a draft.");
        } else {
            /* "marching" is deliberately ambiguous */
            const draft_reaction = ['enlisting', 'marching', 'protesting', 'fleeing'];
            const atype = (game.u?.ualign?.type | 0);
            /* Lawful: 0..1, Neutral: 1..2, Chaotic: 2..3 */
            let dridx = rn1(2, 1 - sgn(atype));
            if ((game.u?.ualign?.record | 0) < STRIDENT)
                /* L: +(0..2), N: +(-1..1), C: +(-2..0); all: 0..3 */
                dridx += rn1(3, sgn(atype) - 1);
            You_feel(`like ${draft_reaction[dridx]}.`);
        }
    }
}
/* dig.c:1499 — `#define STRIDENT 4 /​* from pray.c *​/` */
const STRIDENT = 4;
/* C hacklib.c sgn() */
function sgn(n) { return (n < 0) ? -1 : (n > 0) ? 1 : 0; }
/* youprop.h:116-120 — Hallucination is HHallucination (INTRINSIC only) with no
 * Halluc_resistance; same shape js/potion.js:731 uses. */
function _dig_hallucination() {
    const u = game.u;
    const hh = (u?.uprops?.[HALLUC]?.intrinsic | 0);
    const hr = u?.uprops?.[HALLUC_RES];
    return !!hh && !((hr?.intrinsic | 0) || (hr?.extrinsic | 0));
}

export async function mb_trapped(mtmp, canseeit) {
    if (game.flags?.verbose) {
        if (canseeit && !_dig_unaware())
            pline_mon(mtmp, "KABOOM!!  You see a door explode.");
        else if (!_dig_deaf())
            You_hear(`a ${(mdistu_dig(mtmp) > 7 * 7) ? 'distant' : 'nearby'} explosion.`);
    }
    wake_nearto(mtmp.mx, mtmp.my, 7 * 7);
    mtmp.mstun = 1;
    mtmp.mhp -= rnd(15);
    if ((mtmp.mhp | 0) < 1) {
        await mondied(mtmp);
        if ((mtmp.mhp | 0) < 1)
            return true;
        /* will get here if lifesaved */
    }
    mon_learns_traps(mtmp, TRAPPED_DOOR);
    return false;
}
/* C ref: mondata.h mdistu(mon) == distu(mon->mx, mon->my) — squared distance
 * from the hero.  Same local shape js/monmove.js:2012 uses. */
function mdistu_dig(mon) {
    const dx = (mon.mx | 0) - (game.u?.ux | 0), dy = (mon.my | 0) - (game.u?.uy | 0);
    return dx * dx + dy * dy;
}
/* C youprop.h:399 / pline.c:435 — use display.js's canonical Unaware
 * predicate so trapped-door explosions say "You dream..." while the hero is
 * asleep or paralyzed, instead of silently forcing the conscious branch. */
function _dig_unaware() { return !!Unaware_real(); }
function _dig_deaf() { return !!(game.flags?.deaf); }
function You_feel(line) { pline("You feel " + line); }
/* C ref: pline.c:435-452 pline_mon(mtmp, ...) — a monster-attributed pline; the
 * SetVoice/Deaf routing is display-only, so this is plain pline as in
 * js/makemon.js:4296 and js/mcastu.js:237. */
function pline_mon(_mtmp, msg) { pline(msg); }

const _TREEFRUITS = [277 /* APPLE */, 278 /* ORANGE */, 279 /* PEAR */,
                     281 /* BANANA */, 276 /* EUCALYPTUS_LEAF */];
export async function rnd_treefruit_at(x, y) {
    return await mksobj_at(_TREEFRUITS[rn2(_TREEFRUITS.length)], x, y, true, false);
}

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
function impossible(_msg, ..._args) { }
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
                if (!game.flags.unaware && !rn2(3)) /* not too often.. */
                    draft_message(true); /* "You feel an unexpected draft." */
            }
        }
        return false;
    } else if (here.typ === SCORR) {
        here.typ = CORR;
        here.flags = 0;
        unblock_point(mtmp.mx, mtmp.my);
        newsym(mtmp.mx, mtmp.my);
        draft_message(false); /* "You feel a draft." */
        return false;
    } else if (!IS_OBSTRUCTED(here.typ) && !IS_TREE(here.typ)) { /* no dig */
        return false;
    }

    /* Only rock, trees, and walls fall through to this point. */
    if ((here.wall_info & W_NONDIGGABLE) !== 0) {
        impossible("mdig_tunnel:  %s at (%d,%d) is undiggable",
                   (IS_WALL(here.typ) ? "wall"
                    : IS_TREE(here.typ) ? "tree" : "stone"),
                   mtmp.mx, mtmp.my);
        return false; /* still alive */
    }

    if (IS_WALL(here.typ)) {
        /* KMH -- Okay on arboreal levels (room walls are still stone) */
        if (game.flags.verbose && !rn2(5)) {
            Soundeffect(se_crashing_rock, 75);
            You_hear("crashing rock.");
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
