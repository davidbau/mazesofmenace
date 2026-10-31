import { delallobj, cmd_from_dir, flooreffects, revive_nasty, obj_to_any } from './cmd.js';
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
import { rn2, rn1, rnd, rnl } from './rng.js';
import { PM_DWARF as PM_DWARF_ } from './pm.generated.js';
import { game } from './gstate.js';
import { Can_dig_down as Can_dig_down_real } from './mklev.js';
import { dbon, dmgval } from './uhitm.js';
import { body_part, align_str, desecrate_altar, altarmask_at } from './cmd.js';
import { Amask2align, AM_MASK, AM_SANCTUM } from './const.js';
import { FOOT, FORCETRAP } from './const.js';
import { reset_utrap } from './trap.js';
import { yname } from './do_wear.js';
import { OC_NAME } from './oc_name_data.js';
import { end_burn, start_timer } from './timeout.js';
import { tmp_at, DISP_BEAM, DISP_END, pline, feel_newsym, canseemon, newsym, You_hear, You_see, Unaware as Unaware_real, Deaf as Deaf_real, mkcavearea } from './display.js';
import { unblock_point, does_block, Blind, vision_recalc } from './vision.js';
import { scatter } from './dokick.js';
import { MAY_HIT, Is_stronghold, MM_NOMSG } from './const.js';
import { b_trapped } from './lock.js';
import { NO_PART } from './const.js';
import { acurr, exercise, adjalign } from './attrib.js';
import { acurrstr } from './dokick.js';
import { TT_PIT, STONE, SCORR, CORR, DOOR, D_NODOOR, IS_WALL, IS_OBSTRUCTED, IS_DOOR, D_CLOSED, TREE, isok,
         OBJ_FREE, OBJ_FLOOR, OBJ_CONTAINED, OBJ_INVENT, OBJ_MINVENT, OBJ_MIGRATING,
         OBJ_BURIED, OBJ_ONBILL, OBJ_LUAFREE, OBJ_DELETED, W_BALL, W_CHAIN, TT_BURIEDBALL,
         TIMER_OBJECT, ROT_ORGANIC, SDOOR, D_BROKEN, D_TRAPPED, W_NONDIGGABLE, SHOPBASE, ROOM, IS_TREE,
         WM_MASK, D_LOCKED, Is_rogue_level, A_STR, A_INT, A_WIS, A_DEX, A_CON, A_CHA,
         HALLUC, HALLUC_RES, DEAF, TAINT_AGE, A_LAWFUL, TRAPPED_DOOR, DIR_180, DIR_ERR, IS_DRAWBRIDGE,
         DB_DIR, DB_NORTH, DB_SOUTH, DB_EAST, DB_WEST, xdir, ydir, N_DIRS } from './const.js';
/* mdig_tunnel leaf callees, imported from their C homes: wake_nearto (mklev.c
 * via js/mklev.js), mon_learns_traps (trap.c), mondied (mon.c via
 * js/makemon.js — still a throwing stub, reached only on a lethal door blast). */
import { wake_nearto } from './mklev.js';
import { mon_learns_traps } from './trap.js';
import { mondied } from './makemon.js';
import { place_object, obj_extract_self, sobj_at, add_to_buried, in_rooms, mksobj_at, mk_tt_object, minliquid, remove_object, del_engr_at, wipe_engr_at, makemon, obj_timer_checks as obj_timer_checks_real } from './mklev.js';
import { obj_resists } from './dogmove.js';
import { is_ice, cant_reach_floor } from './engrave.js';
import { uteetering_at_seen_pit, uescaped_shaft } from './pickup.js';
import { yobjnam, Yobjnam2, an, An, simpleonames } from './objnam.js';
import { IS_STWALL } from './const.js';
import { trapname } from './makemon.js';
import { is_pool, may_dig, closed_door as closed_door_real } from './look.js';
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
import { m_at, setmnotwielded, do_attack, abon as uhitm_abon } from './uhitm.js';
import { corpse_xname, otense } from './objnam.js';
import { remove_worn_item } from './steal.js';
import { stop_occupation } from './allmain.js';
import { update_inventory } from './mhitm.js';
import { hideunder } from './mklev.js';
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
import { d } from './rng.js';
import { IRONBARS, IS_WATERWALL, KILLED_BY, HALF_PHDAM, WEB } from './const.js';
import { nomul } from './allmain.js';
import { wake_nearby } from './mklev.js';
import { fire_damage, confdir, surface as surface_cmd, ceiling as ceiling_cmd, altar_wrath } from './cmd.js';
import { angry_priest } from './priest.js';
import { losehp } from './dokick.js';
import { t_at, deltrap, delfloortrap, unearth_objs, maketrap, mintrap, cnv_trap_obj,
         buried_ball_to_punishment } from './trap.js';
import { On_stairs, On_ladder, stairway_at, In_hell } from './mklev.js';
import { Monnam } from './mcastu.js';
import { is_pool_or_lava } from './look.js';
import { water_damage_chain, pooleffects, switch_terrain, boulder_hits_pool } from './cmd.js';
import { is_drawbridge_wall, find_drawbridge, delobj, impact_drop, is_db_wall } from './dokick.js';
import { hliquid } from './mhitm.js';
import { s_suffix } from './hacklib.js';
import { pickup } from './pickup.js';
import { spot_stop_timers, spot_time_left } from './timeout.js';
import { obj_ice_effects } from './mklev.js';
import { explode, fracture_rock, break_statue } from './zap.js';
/* get_iter_mons/angry_guards (mon.c, real bodies live in js/mklev.js) and
 * m_canseeu (vision.h, js/dochug.js) -- needed by watch_dig() below
 * (dig.c:1372-1409). PM_WATCHMAN/PM_WATCH_CAPTAIN for its is_watch(ptr) test
 * (mondata.h:159). */
import { get_iter_mons, angry_guards } from './mklev.js';
/* C dbridge.c destroy_drawbridge occupant handling (e_died / e_missed). */
import { xkilled, mon_nam } from './uhitm.js';
import { canspotmon } from './display.js';
import { mondied_dm } from './dogmove.js';
import { nonliving, mhe } from './makemon.js';
import { vtense } from './objnam.js';
import { helpless } from './mhitm.js';
import { done } from './end.js';
import { spoteffects } from './landing-effects.js';
import { XKILL_GIVEMSG, XKILL_NOMSG, XKILL_NOCORPSE, XKILL_NOCONDUCT, CRUSHING, KILLED_BY_AN, PASSES_WALLS } from './const.js';
/* C dbridge.c do_entity()/close_drawbridge() occupant handling. */
import { DROWNING, BURNING, NO_KILLER_PREFIX, WWALKING, SWIMMING, MAGICAL_BREATHING, CONFUSION, STUNNED, FUMBLING,
         OBJ_AT } from './const.js';
import { PM_FIRE_ELEMENTAL, PM_SALAMANDER } from './pm.generated.js';
import { pooleffects_drown, pooleffects_lava_effects } from './cmd.js';
import { enexto_out, next_to_u, teleds, teleport_pet } from './teleport.js';
import { get_level, pooleffects_grounded } from './cmd.js';
import { migrate_to_level } from './dog.js';
import { count_wsegs } from './worm.js';
import { depth } from './hacklib.js';
import { place_monster } from './steed.js';
import { update_monster_region } from './region.js';
import { block_point } from './vision.js';
import { m_canseeu } from './dochug.js';
import { seetrap, feeltrap } from './trap.js';
import { cansee } from './vision.js';
import { PM_WATCHMAN, PM_WATCH_CAPTAIN, PM_ARCHEOLOGIST, PM_SAMURAI } from './pm.generated.js';
import { mkclass } from './makemon.js';
/* C fountain.c furniture handlers: these bodies are shared with potion.js. */
import { dogushforth, dryup, breaksink } from './potion.js';
import { dropx, welded, set_wounded_legs } from './cmd.js';
import { RIGHT_SIDE } from './const.js';
import { the, xname } from './objnam.js';
import { PM_EARTH_ELEMENTAL, PM_XORN } from './pm.generated.js';

/* C dbridge.c:888-1019: bridge terrain, debris, vision, and the occupants. */
export async function destroy_drawbridge(x, y) {
    const ox = x | 0, oy = y | 0;
    const inputDir = is_drawbridge_wall(ox, oy);
    const bx = { value: x | 0 }, by = { value: y | 0 };
    if (!find_drawbridge(bx, by)) return;
    const bridge = game.level?.at(bx.value, by.value);
    if (!bridge || !IS_DRAWBRIDGE(bridge.typ | 0)) return;
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
        const raised = bridge.typ === DRAWBRIDGE_UP;
        const sx = raised ? wx : bx.value, sy = raised ? wy : by.value;
        if (cansee(sx, sy) || (game.u.ux === sx && game.u.uy === sy))
            await pline(raised ? 'The portcullis of the drawbridge falls into the %s!'
                : 'The drawbridge collapses into the %s!', lava ? hliquid('lava') : 'moat');
        else await You_hear('a loud *SPLASH*!');
        bridge.typ = lava ? LAVAPOOL : MOAT;
        // C dbridge.c:924-928: expose the liquid before dunking one boulder.
        bridge.drawbridgemask = 0;
        const boulder = sobj_at(BOULDER, bx.value, by.value);
        if (boulder) {
            obj_extract_self(boulder);
            await flooreffects(boulder, bx.value, by.value, 'fall');
        }
    } else {
        if (cansee(bx.value, by.value) || (game.u.ux === bx.value && game.u.uy === by.value))
            await pline('The drawbridge disintegrates!');
        else await You_hear('a loud *CRASH*!');
        bridge.typ = iced ? ICE : ROOM;
        // icedpool aliases drawbridgemask (rm.flags); retain ICED_MOAT on ice.
        bridge.icedpool = iced ? 16 : 0;
    }
    wake_nearto(bx.value, by.value, 500);
    const wall = game.level?.at(wx, wy);
    if (wall) { wall.typ = DOOR; wall.doormask = D_NODOOR; }
    const bt = t_at(bx.value, by.value), wt = t_at(wx, wy);
    if (bt) deltrap(bt);
    if (wt && wt !== bt) deltrap(wt);
    del_engr_at(bx.value, by.value); del_engr_at(wx, wy);
    // C dbridge.c:949-959: create and scatter each piece of iron-chain debris.
    for (let i = rn2(6); i > 0; --i) {
        const obj = await mksobj_at(478 /* IRON_CHAIN */, rn2(2) ? bx.value : wx, rn2(2) ? by.value : wy, true, false);
        await scatter(obj.ox, obj.oy, 1, MAY_HIT, obj);
    }
    newsym(bx.value, by.value); newsym(wx, wy);
    if (!does_block(wx, wy)) unblock_point(wx, wy);
    vision_recalc(0);
    if (Is_stronghold(game.u.uz))
        game.u.uevent.uopened_dbridge = true;

    /* C dbridge.c:978-1015: the occupants of the portcullis and span squares. */
    const etmp2 = db_occupants[1] = db_set_entity(wx, wy); /* currently only automissers can be here */
    if (etmp2.edata) {
        const e_inview = db_e_canseemon(etmp2);
        if (!db_automiss(etmp2)) {
            if (e_inview)
                await pline('%s blown apart by flying debris.', db_E_phrase(etmp2, 'are'));
            db_set_killer('exploding drawbridge');
            await db_e_died(etmp2, XKILL_NOCORPSE | (e_inview ? XKILL_GIVEMSG : XKILL_NOMSG),
                            CRUSHING); /* no corpse */
        } /* nothing which is vulnerable can survive this */
    }
    const etmp1 = db_occupants[0] = db_set_entity(bx.value, by.value);
    if (etmp1.edata) {
        const e_inview = db_e_canseemon(etmp1);
        if (db_e_missed(etmp1, true)) {
            /* if there is water or lava here, fall in now */
            if (db_is_u(etmp1)) await spoteffects(false);
            else await minliquid(etmp1.emon);
        } else {
            if (e_inview) {
                if (!db_is_u(etmp1) && _dig_hallucination())
                    await pline('%s into some heavy metal!', db_E_phrase(etmp1, 'get'));
                else
                    await pline('%s hit by a huge chunk of metal!', db_E_phrase(etmp1, 'are'));
            } else if (!Deaf_dg() && !db_is_u(etmp1) && !is_pool(bx.value, by.value)) {
                await You_hear('a crushing sound.');
            }
            db_set_killer('collapsing drawbridge');
            await db_e_died(etmp1, XKILL_NOCORPSE | (e_inview ? XKILL_GIVEMSG : XKILL_NOMSG),
                            CRUSHING); /* no corpse */
            /* C dbridge.c:1012-1013 */
            if ((game.level.at(etmp1.ex, etmp1.ey)?.typ | 0) === MOAT) await db_do_entity(etmp1);
        }
    }
    db_nokiller(); /* C dbridge.c:1016: clear the killer and both occupants. */
    if (Is_stronghold(game.u.uz))
        game.u.uevent.uheard_tune = 3; /* bridge is gone so tune is now useless */
}

/* C dbridge.c:303-337 struct entity / m_to_e / u_to_e / set_entity. */
function db_set_entity(x, y) {
    if (game.u.ux === x && game.u.uy === y)
        return { emon: game.youmonst, ex: game.u.ux, ey: game.u.uy, edata: game.youmonst?.data };
    const mtmp = m_at(x, y);
    /* long worm tail squares (m_to_e's PM_LONG_WORM_TAIL arm) are not modeled */
    return mtmp ? { emon: mtmp, ex: x, ey: y, edata: mtmp.data } : { emon: null, ex: 0, ey: 0, edata: null };
}
function db_is_u(etmp) { return etmp.emon === game.youmonst; }
function db_e_canseemon(etmp) { return db_is_u(etmp) || canseemon(etmp.emon); }
/* C dbridge.c:359-373 E_phrase() */
function db_E_phrase(etmp, verb) {
    const who = db_is_u(etmp) ? 'You' : Monnam(etmp.emon);
    return `${who} ${db_is_u(etmp) ? verb : vtense(null, verb)}`;
}
function db_set_killer(name, format = KILLED_BY_AN) {
    game.svk ||= {};
    game.svk.killer ||= {};
    game.svk.killer.format = format;
    game.svk.killer.name = name;
}
/* mondata.h:29,31 passes_walls / noncorporeal */
function db_passes_walls(ptr) { return ((ptr?.mflags1 | 0) & 0x00000008) !== 0; }
function db_noncorporeal(ptr) { return ptr?.mlet === 54; /* S_GHOST */ }
/* C dbridge.c:485-490 automiss() */
function db_automiss(etmp) {
    const pw = db_is_u(etmp)
        ? !!((u_prop_(game.u, PASSES_WALLS).intrinsic | 0) || (u_prop_(game.u, PASSES_WALLS).extrinsic | 0))
        : db_passes_walls(etmp.edata);
    return pw || db_noncorporeal(etmp.edata);
}
/* C dbridge.c:495-523 e_missed() */
function db_e_missed(etmp, chunks) {
    if (db_automiss(etmp)) return true;
    let misses;
    if (is_flyer_(etmp.edata) && (db_is_u(etmp) ? !Unaware_real() : !helpless(etmp.emon)))
        misses = 5; /* flying requires mobility */
    else if (is_floater_(etmp.edata) || (db_is_u(etmp) && Levitation_()))
        misses = 3; /* doesn't require mobility */
    else if (chunks && is_pool(etmp.ex, etmp.ey))
        misses = 2; /* sitting ducks */
    else
        misses = 0;
    if (is_db_wall(etmp.ex, etmp.ey)) misses -= 3; /* less airspace */
    return misses >= rnd(8);
}
/* C dbridge.c:410-480 e_died() */
async function db_e_died(etmp, xkill_flags, how) {
    if (db_is_u(etmp)) {
        if (how === DROWNING) {
            if (game.svk?.killer) game.svk.killer.name = ''; /* drown() sets its own killer */
            await pooleffects_drown();
        } else if (how === BURNING) {
            if (game.svk?.killer) game.svk.killer.name = ''; /* lava_effects() sets own killer */
            await pooleffects_lava_effects();
        } else {
            if (!game.svk?.killer?.name) db_set_killer('falling drawbridge');
            await done(how);
            /* So, you didn't die */
            if (!db_e_survives_at(etmp, etmp.ex, etmp.ey)) {
                const xy = enexto_out(etmp.ex, etmp.ey, etmp.edata);
                if (xy) {
                    await pline('A %s force teleports you away...', _dig_hallucination() ? 'normal' : 'strange');
                    await teleds(xy.x, xy.y, 0 /* TELEDS_NO_FLAGS */);
                }
            }
        }
        /* we might have crawled out of the moat to survive */
        etmp.ex = game.u.ux; etmp.ey = game.u.uy;
        return;
    }
    if (game.svk?.killer) game.svk.killer.name = '';
    const msg = (xkill_flags & XKILL_NOMSG) ? null : '';
    if (game.context?.mon_moving) await db_monkilled_dgst(etmp.emon, msg);
    else await xkilled(etmp.emon, xkill_flags);
    /* if etmp gets life-saved, kill it again */
    if ((etmp.emon.mhp | 0) >= 1) {
        const seeit = canspotmon(etmp.emon);
        xkill_flags |= XKILL_NOMSG | XKILL_NOCONDUCT;
        if (game.context?.mon_moving) await db_monkilled_dgst(etmp.emon, '');
        else await xkilled(etmp.emon, xkill_flags);
        if ((etmp.emon.mhp | 0) < 1 && seeit)
            await pline('Unfortunately for %s, %s is still crushed.', mon_nam(etmp.emon), mhe(etmp.emon));
    }
    etmp.edata = null;
    /* dead long worm handling */
    for (const e of db_occupants)
        if (e !== etmp && e.emon === etmp.emon) e.edata = null;
}
/* C dbridge.c go.occupants[ENTITIES] and e_at() (dbridge.c:276-290). */
const db_occupants = [{ emon: null, ex: 0, ey: 0, edata: null },
                      { emon: null, ex: 0, ey: 0, edata: null }];
function db_e_at(x, y) {
    for (const e of db_occupants)
        if (e.edata && e.ex === x && e.ey === y) return e;
    return null;
}
/* C dbridge.c:762-769 nokiller() */
function db_nokiller() {
    if (game.svk?.killer) { game.svk.killer.name = ''; game.svk.killer.format = 0; }
    db_occupants[0] = { emon: null, ex: 0, ey: 0, edata: null };
    db_occupants[1] = { emon: null, ex: 0, ey: 0, edata: null };
}
function db_uprop(key) {
    const p = u_prop_(game.u, key);
    return !!((p.intrinsic | 0) || (p.extrinsic | 0)) && !(p.blocked | 0);
}
/* C dbridge.c:378-405 e_survives_at() */
function db_e_survives_at(etmp, x, y) {
    const ptr = etmp.edata, f1 = ptr?.mflags1 | 0, isu = db_is_u(etmp);
    if (db_noncorporeal(ptr)) return true;
    if (is_pool(x, y))
        return (isu && (db_uprop(WWALKING) || db_uprop(MAGICAL_BREATHING) || (f1 & 0x600) !== 0
                        || db_uprop(SWIMMING) || Flying_() || Levitation_()))
            || (f1 & 0x2) !== 0 /* is_swimmer */ || is_flyer_(ptr) || is_floater_(ptr);
    /* must force call to lava_effects in e_died if is_u */
    if (is_lava_(x, y))
        return (isu && (Levitation_() || Flying_()))
            || ptr?.pmidx === PM_FIRE_ELEMENTAL || ptr?.pmidx === PM_SALAMANDER /* likes_lava */
            || is_flyer_(ptr);
    if (is_db_wall(x, y))
        return isu ? db_uprop(PASSES_WALLS) : db_passes_walls(ptr);
    return true;
}
/* C dbridge.c:532-556 e_jumps() */
function db_e_jumps(etmp) {
    let tmp = 4; /* out of 10 */
    const isu = db_is_u(etmp), m = etmp.emon;
    if (isu ? (Unaware_real() || db_uprop(FUMBLING))
            : (helpless(m) || !(etmp.edata?.mmove | 0) || (m.wormno | 0)))
        return false;
    if (isu ? db_uprop(CONFUSION) : m.mconf) tmp -= 2;
    if (isu ? db_uprop(STUNNED) : m.mstun) tmp -= 3;
    if (is_db_wall(etmp.ex, etmp.ey)) tmp -= 2; /* less room to maneuver */
    return tmp >= rnd(10);
}
/* C dbridge.c:558-756 do_entity() */
async function db_do_entity(etmp) {
    if (!etmp.edata) return;
    let e_inview = db_e_canseemon(etmp);
    const oldx = etmp.ex, oldy = etmp.ey;
    const at_portcullis = is_db_wall(oldx, oldy);
    const crm = game.level.at(oldx, oldy);
    let must_jump = false, relocates = false;
    if (db_automiss(etmp) && db_e_survives_at(etmp, oldx, oldy)) {
        if (e_inview && (at_portcullis || IS_DRAWBRIDGE(crm.typ | 0)))
            await pline('The %s passes through %s!', at_portcullis ? 'portcullis' : 'drawbridge', db_e_nam(etmp));
        if (db_is_u(etmp)) await spoteffects(false);
        return;
    }
    if (db_e_missed(etmp, false)) {
        if (at_portcullis) await pline('The portcullis misses %s!', db_e_nam(etmp));
        if (db_e_survives_at(etmp, oldx, oldy)) return;
        if (at_portcullis) must_jump = true;
        else relocates = true; /* just ride drawbridge in */
    } else {
        if ((crm.typ | 0) === DRAWBRIDGE_DOWN) {
            if (db_is_u(etmp)) db_set_killer('crushed to death underneath a drawbridge', NO_KILLER_PREFIX);
            await pline('%s crushed underneath the drawbridge.', db_E_phrase(etmp, 'are'));
            await db_e_died(etmp, XKILL_NOCORPSE | (e_inview ? XKILL_GIVEMSG : XKILL_NOMSG), CRUSHING);
            return;
        }
        must_jump = true;
    }
    if (must_jump) {
        if (at_portcullis) {
            if (db_e_jumps(etmp)) {
                relocates = true;
            } else {
                if (e_inview)
                    await pline('%s crushed by the falling portcullis!', db_E_phrase(etmp, 'are'));
                else if (!Deaf_dg())
                    await You_hear('a crushing sound.');
                await db_e_died(etmp, XKILL_NOCORPSE | (e_inview ? XKILL_GIVEMSG : XKILL_NOMSG), CRUSHING);
                return;
            }
        } else { /* tries to jump off bridge to original square */
            relocates = !db_e_jumps(etmp);
        }
    }
    /* C dbridge.c:644-648 ignores find_drawbridge's return value.  After
     * destruction it can fail, but get_wall_for_db still uses the square's
     * current mask (including a cleared mask, whose direction is NORTH). */
    const nx = { value: oldx }, ny = { value: oldy };
    find_drawbridge(nx, ny);
    let newx = nx.value, newy = ny.value;
    if (newx === oldx && newy === oldy) {
        switch ((game.level.at(newx, newy).drawbridgemask | 0) & DB_DIR) {
        case DB_NORTH: newy--; break;
        case DB_SOUTH: newy++; break;
        case DB_EAST: newx++; break;
        case DB_WEST: newx--; break;
        }
    }
    if (relocates && db_e_at(newx, newy)) {
        const other = db_e_at(newx, newy);
        if (db_e_survives_at(other, newx, newy) && db_automiss(other)) {
            relocates = false; /* "other" won't budge */
        } else {
            while (db_e_at(newx, newy) && db_e_at(newx, newy) !== etmp)
                await db_do_entity(other);
            if (db_e_at(oldx, oldy) !== etmp) return;
        }
    }
    if (relocates && !db_e_at(newx, newy)) {
        if (!db_is_u(etmp)) {
            place_monster(etmp.emon, newx, newy);
            update_monster_region(etmp.emon);
        } else {
            game.u.ux = newx; game.u.uy = newy;
        }
        etmp.ex = newx; etmp.ey = newy;
        e_inview = db_e_canseemon(etmp);
    }
    if (is_db_wall(etmp.ex, etmp.ey)) {
        if (e_inview) {
            if (db_is_u(etmp)) {
                await pline('You tumble towards the closed portcullis!');
                if (db_automiss(etmp)) await pline('You pass through it!');
                else await pline('The drawbridge closes in...');
            } else await pline('%s behind the drawbridge.', db_E_phrase(etmp, 'disappear'));
        }
        if (!db_e_survives_at(etmp, etmp.ex, etmp.ey)) {
            db_set_killer('closing drawbridge');
            await db_e_died(etmp, XKILL_NOMSG, CRUSHING);
        }
        return;
    }
    if (is_pool(etmp.ex, etmp.ey) && !e_inview && !Deaf_dg())
        await You_hear('a splash.');
    if (db_e_survives_at(etmp, etmp.ex, etmp.ey)) {
        if (e_inview && !is_flyer_(etmp.edata) && !is_floater_(etmp.edata))
            await pline('%s from the bridge.', db_E_phrase(etmp, 'fall'));
        return;
    }
    const pool = is_pool(etmp.ex, etmp.ey), lava = is_lava_(etmp.ex, etmp.ey);
    if ((pool || lava) && e_inview && !db_is_u(etmp)) {
        if (_dig_hallucination())
            await pline('%s the %s and disappears.', db_E_phrase(etmp, 'drink'), lava ? 'lava' : 'moat');
        else
            await pline('%s into the %s.', db_E_phrase(etmp, 'fall'), lava ? hliquid('lava') : 'moat');
    }
    db_set_killer('fell from a drawbridge', NO_KILLER_PREFIX);
    await db_e_died(etmp, XKILL_NOCORPSE | (e_inview ? XKILL_GIVEMSG : XKILL_NOMSG),
                    pool ? DROWNING : lava ? BURNING : CRUSHING);
}
function db_e_nam(etmp) { return db_is_u(etmp) ? 'you' : mon_nam(etmp.emon); }
/* C mon.c:3364-3417 monkilled(mdef, fltxt, AD_DGST): mk_corpse(XKILL_NOCORPSE)
 * is AD_DGST, so gd.disintegested is set and mondead() runs without a corpse. */
async function db_monkilled_dgst(mdef, fltxt) {
    if (fltxt !== null && cansee(mdef.mx | 0, mdef.my | 0))
        await pline('%s is %s!', Monnam(mdef), nonliving(mdef.data) ? 'destroyed' : 'killed');
    else
        (game.iflags ||= {}).sad_feeling = !!mdef.mtame;
    (game.gd ||= {}).disintegested = true;
    await mondied_dm(mdef, true);
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
    /* C dbridge.c:850-856 */
    if (cansee(p.bx, p.by) || cansee(p.wx, p.wy)) {
        const u = game.u, dw = (u.ux - p.wx) ** 2 + (u.uy - p.wy) ** 2,
            db = (u.ux - p.bx) ** 2 + (u.uy - p.by) ** 2;
        await You_see(`a drawbridge ${dw < db ? 'going' : 'coming'} down!`);
    } else {
        await You_hear('gears turning and chains rattling.');
    }
    p.bridge.typ = DRAWBRIDGE_DOWN;
    const wall = game.level?.at(p.wx, p.wy);
    if (wall) { wall.typ = DOOR; wall.doormask = D_NODOOR; }
    /* C dbridge.c:863-867: the occupants of the span and portcullis squares. */
    db_occupants[0] = db_set_entity(p.bx, p.by);
    db_occupants[1] = db_set_entity(p.wx, p.wy);
    await db_do_entity(db_occupants[0]);          /* Do set_entity after first */
    db_occupants[1] = db_set_entity(p.wx, p.wy); /* do_entity for worm tail */
    await db_do_entity(db_occupants[1]);
    await revive_nasty(p.bx, p.by, null); /* C dbridge.c:868 */
    await delallobj(p.bx, p.by); // C dbridge.c:869
    const bt = t_at(p.bx, p.by), wt = t_at(p.wx, p.wy);
    if (bt) deltrap(bt); if (wt && wt !== bt) deltrap(wt);
    del_engr_at(p.bx, p.by); del_engr_at(p.wx, p.wy);
    newsym(p.bx, p.by); newsym(p.wx, p.wy);
    unblock_point(p.wx, p.wy); /* C dbridge.c:875 vision */
    if (Is_stronghold(game.u.uz))
        (game.u.uevent ||= {}).uopened_dbridge = true;
    db_nokiller(); /* C dbridge.c:876 */
    return true;
}

export async function close_drawbridge(x, y) {
    const p = _drawbridge_pair(x, y);
    if (!p || (p.bridge.typ | 0) !== DRAWBRIDGE_DOWN) return false;
    /* C dbridge.c:787-796 */
    if (cansee(x, y) || cansee(p.wx, p.wy)) {
        const u = game.u, dw = (u.ux - p.wx) ** 2 + (u.uy - p.wy) ** 2,
            db = (u.ux - x) ** 2 + (u.uy - y) ** 2;
        await You_see(`a drawbridge ${(((u.ux === x || u.uy === y) && !u.uinwater) || dw < db) ? 'coming' : 'going'} up!`);
    } else {
        await You_hear('chains rattling and gears turning.');
    }
    p.bridge.typ = DRAWBRIDGE_UP;
    const wall = game.level?.at(p.wx, p.wy);
    if (wall) {
        wall.typ = DBWALL;
        const dir = (p.bridge.drawbridgemask | 0) & DB_DIR; /* C dbridge.c:800-809 */
        wall.horizontal = (dir === DB_NORTH || dir === DB_SOUTH);
        wall.wall_info = W_NONDIGGABLE;
    }
    /* C dbridge.c:811-815: the occupants of the span and portcullis squares. */
    db_occupants[0] = db_set_entity(p.bx, p.by);
    db_occupants[1] = db_set_entity(p.wx, p.wy);
    await db_do_entity(db_occupants[0]);          /* Do set_entity after first */
    db_occupants[1] = db_set_entity(p.wx, p.wy); /* do_entity for worm tail */
    await db_do_entity(db_occupants[1]);
    if (OBJ_AT(p.bx, p.by) && !Deaf_real())
        await You_hear('smashing and crushing.');
    await revive_nasty(p.bx, p.by, null); /* C dbridge.c:820-821 */
    await revive_nasty(p.wx, p.wy, null);
    await delallobj(p.bx, p.by); // C dbridge.c:822-823
    await delallobj(p.wx, p.wy);
    const bt = t_at(p.bx, p.by), wt = t_at(p.wx, p.wy);
    if (bt) deltrap(bt); if (wt && wt !== bt) deltrap(wt);
    del_engr_at(p.bx, p.by); del_engr_at(p.wx, p.wy);
    newsym(p.bx, p.by); newsym(p.wx, p.wy);
    block_point(p.wx, p.wy); /* C dbridge.c:832 vision */
    db_nokiller();
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

// C ref: weapon.c:950 abon(void) — strength & dexterity attack bonus.  The
// one port lives in js/uhitm.js; it carries the Upolyd arm (weapon.c:955-956,
// adj_lev(&mons[u.umonnum]) - 3) that this file's former private copy omitted,
// so a polymorphed hero's dig effort used the natural-form Str/Dex ladder.
export function abon() {
    return uhitm_abon();
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
    /* maketrap() on an occupied square (trap.c oldplace) re-types the existing
     * trap in place; digactualhole then sets madeby_u and seetrap() (dig.c:700-706). */
    const old = g.level.traps.find((t) => t.tx === x && t.ty === y);
    if (old) {
        old.ttyp = PIT; old.tseen = 1; old.madeby_u = true; old.once = 0;
    } else {
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
                /* C dig.c:1009-1010, trap.c:5341-5372: conversion also
                 * releases trapped occupants before the hole is created. */
                const trap_obj = (ttmp.ttyp === LANDMINE) ? 243 : 244;
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
    spot_checks_(dig_x, dig_y, old_typ);
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
            dc.level = g.u && g.u.uz ? { dnum: g.u.uz.dnum, dlevel: g.u.uz.dlevel } : { dnum: 0, dlevel: 0 };
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
    /* C cmd.c:4095 getdir -> movecmd(dirsym, MV_ANY): the run (shifted) and
     * rush (control) spellings of a direction key give the same u.dx/u.dy. */
    if (dirCh === null) {
        /* direction already resolved by getdir() in the caller (u.dx/dy/dz set,
         * confdir applied) */
    } else if (typeof dirCh === 'string' && dirCh.length === 1) {
        const cc = dirCh.charCodeAt(0);
        if ('HJKLYUBN'.includes(dirCh)) dirCh = dirCh.toLowerCase();
        else if (cc >= 1 && cc <= 26 && 'hjklyubn'.includes(String.fromCharCode(cc + 96)))
            dirCh = String.fromCharCode(cc + 96);
    }
    if (dirCh === null) { /* resolved by getdir */ }
    else if (dirCh === '>') { u.dx = 0; u.dy = 0; u.dz = 1; }
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
    /* C cmd.c:4117 getdir() tail — `if (!u.dz) confdir(FALSE);` (rn2(8) when
     * Stunned / Confused-and-!rn2(5)); dig.c:1193 draws it again below. */
    if (dirCh !== null && !u.dz) confdir(false);
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
    return closed_door_real(x, y);
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
    const DIRCH = ['h', 'y', 'k', 'u', 'l', 'n', 'j', 'b', '>', '<'];
    const XD = [-1, -1, 0, 1, 1, 1, 0, -1, 0, 0];
    const YD = [0, -1, -1, -1, 0, 1, 1, 1, 0, 0];
    const downok = !!can_reach_floor_dg(false);
    const PM_GRID_BUG = 116;
    let out = '';
    for (let dir = 0; dir < 10; dir++) {
        /* C dig.c:1124 cmd_from_dir(dir, MV_WALK): the key bound to the move,
         * so number_pad shows digits; fall back to the letter if unbound. */
        const bound = cmd_from_dir(dir, 0);
        const dirch = bound ? (typeof bound === 'number' ? String.fromCharCode(bound) : bound) : DIRCH[dir];
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
            const dz = dir === 8 ? 1 : -1;   /* DIRCH[8] is '>' (down), DIRCH[9] '<' (up) */
            if ((dz > 0) !== downok)
                continue;
        }
        out += dirch;
    }
    return out;
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
    // C read.c:3066-3077.  delobj(chain) runs delobj_core's obj_resists(0,0)
    // (invent.c:1446) — one rn2(100) — before the extract.
    const { uball, uchain } = findBallChain();
    if (!uball && !uchain)
        return false;
    const u = game.u;
    if (uchain) {
        uchain.owornmask = (uchain.owornmask | 0) & ~W_CHAIN;
        u.uchain = null;                       /* setworn(0, W_CHAIN) */
        await delobj(uchain);
    }
    if (uball) {
        uball.owornmask = (uball.owornmask | 0) & ~W_BALL;
        u.uball = null;                        /* setworn(0, W_BALL) */
    }
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
        await pline_The('iron ball gets buried!');
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
            await pline_mon(mtmp, "KABOOM!!  You see a door explode.");
        else if (!_dig_deaf())
            await You_hear(`a ${(mdistu_dig(mtmp) > 7 * 7) ? 'distant' : 'nearby'} explosion.`);
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
function _dig_deaf() { return !!Deaf_real(); } /* youprop.h Deaf: HDeaf timeout (faint sets it, eat.c:3421) */
/* C ref: pline.c:387-400 You_feel(line) — "You feel <line>", or "You dream
 * that you feel <line>" when Unaware (asleep/unconscious). */
import { pline_The, You_feel, pline_mon } from './display.js';

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
                if (!Unaware_real() && !rn2(3)) /* not too often.. */
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
