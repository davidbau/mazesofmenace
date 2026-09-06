import { maybe_unhide_at } from './mon.js';
import { is_rider, locomotion } from './mondata.js';
import { goodpos } from './makemon.js';
import { rloc_to, enexto } from './teleport.js';
import { revive_corpse } from './do.js';
import { obj_ice_effects } from './mkobj.js';
import { spot_time_left, spot_stop_timers, MELT_ICE_AWAY } from './timeout.js';
import { float_vs_flight } from './polyself.js';
import { float_up } from './trap.js';
import { You_cant } from './pline.js';
import { FROMOUTSIDE, DRAWBRIDGE_UP, DB_UNDER, DB_ICE, MAX_TYPE } from './const.js';
import { obj_extract_self } from './invent.js';
import { place_object } from './mkobj.js';
import { exercise } from './attrib.js';
import { A_STR, LANDMINE, SPIKED_PIT, PIT, HOLE, TRAPDOOR,
         LEVEL_TELEP, TELEP_TRAP, ROLLING_BOULDER_TRAP } from './const.js';
import { the, xname, ansimpleoname } from './objnam.js';
import { costly_spot } from './shk.js';
import { You_hear, There } from './pline.js';
import { flush_screen, glyph_at, map_invisible, newsym, unmap_invisible,
         unmap_object, map_object, back_to_glyph } from './display.js';
import { YMonnam, m_monnam, mon_nam } from './do_name.js';
import { is_flimsy } from './obj.js';
import { You, You_feel, pline_xy, pline_The, set_msg_xy, Norep } from './pline.js';
import { feel_location } from './display.js';
import { can_ooze, accessible } from './monmove.js';
import { dig_typ, use_pick_axe2 } from './dig.js';
import { worm_cross } from './worm.js';
import { block_door, block_entry, u_entered_shop, u_left_shop } from './shk.js';
import { curr_mon_load } from './mon.js';
import { inv_weight, weight_cap } from './attrib.js';
import { carrying } from './invent.js';
import { a_monnam, upstart, pmname } from './do_name.js';
import { an } from './objnam.js';
import { is_door_mappear, helpless, DEADMONSTER } from './monst.js';
import { dist2, distmin } from './hacklib.js';
import { Levitation, Flying, Fire_resistance, Underwater,
         Hallucination, Deaf, Passes_walls, Stealth, Swimming,
         Amphibious, Breathless } from './youprop.js';
import { is_pool_or_lava } from './dbridge.js';
import { is_pool, is_lava, t_at, m_at, is_pick, seemimic,
         wake_msg } from './mon.js';
import { hliquid } from './do_name.js';
import { Is_waterlevel, WATER, LAVAPOOL, POOL, AIR } from './const.js';
import { waterbody_name } from './pager.js';
import { surface, recalc_mapseen } from './dungeon.js';
import { pickup, can_reach_floor, loot_mon } from './pickup.js';
import { dotrap, immune_to_trap, into_vs_onto } from './trap.js';
import { is_pit, EXT_ENCUMBER, HVY_ENCUMBER, IS_FURNITURE, STAIRS, ECMD_OK, ECMD_TIME, OBJ_AT, GOLD_SYM, TT_BEARTRAP, TT_PIT, TT_WEB, TT_LAVA, TT_INFLOOR, TT_BURIEDBALL } from './const.js';
import { near_capacity } from './attrib.js';
import { gethungry } from './eat.js';
import { cmdq_clear, closed_door, paranoid_query } from './cmd.js';
import { paranoia_bits, boolean_option } from './options.js';
import { PARANOID_TRAP, PARANOID_CONFIRM, TRAPNUM, TRAP_CLEARLY_IMMUNE } from './const.js';
import { Blind, Stunned, Confusion } from './youprop.js';
import { visible_region_at, reg_damg } from './region.js';
import { defsyms } from './drawing_data.js';
// hack.js — the hero's movement and the terrain predicates that go with it.
// C ref: src/hack.c
//
// These three predicates decide, for every monster and for the hero, whether a
// square can be entered. They had been living in mon.js and dog.js because
// those were their first callers; their C home is hack.c and this is it.
//
// None of them draws.

import { game } from './gstate.js';
import { do_attack, explum } from './uhitm.js';
import { rehumanize } from './polyself.js';
import { wake_nearto } from './mon.js';
import { attacktype, attacktype_fordmg } from './mondata.js';
import { sensemon, is_safemon, mon_visible, pline, urgent_pline, canspotmon } from './display.js';
import { hides_under, noattacks, is_hider } from './mondata.js';
import { onscary } from './monmove.js';
import { PMNAMES, MONSYMS, ATTKS } from './monst_data.js';
import { rn2, rnd } from './rng.js';
import {
    IS_STWALL, IS_TREE, IS_OBSTRUCTED,
    W_NONDIGGABLE, W_NONPASSWALL,

    ROOMOFFSET, MAXNROFROOMS, OROOM, COURT, SWAMP, BEEHIVE, MORGUE,
    BARRACKS, ZOO, DELPHI, TEMPLE, LEPREHALL, COCKNEST, ANTHOLE,
    SHOPBASE, NO_ROOM, SHARED, SHARED_PLUS, COLNO, ROWNO, CQ_CANNED,
    VIBRATING_SQUARE, LAVAWALL, IS_WATERWALL, STONE, CORR, SCORR, ICE, ROOM, IS_AIR,
    THRONE, SINK, GRAVE, FOUNTAIN, ALTAR, D_ISOPEN, ACCESSIBLE, IS_SDOOR,
    M_AP_OBJECT, M_AP_FURNITURE, M_AP_TYPE, isok, u_at,
    IRONBARS, IS_DOOR, D_NODOOR, D_BROKEN, WT_SQUEEZABLE_INV,
    WT_TOOMUCH_DIAGONAL, DO_MOVE, TEST_MOVE, TEST_TRAV, TEST_TRAP,
    RUN_TPORT, RUN_LEAP, RUN_STEP, RUN_CRAWL,
    DIR_W, DIR_N, DIR_E, DIR_S, DIR_NW, DIR_NE, DIR_SE, DIR_SW,
    xdir, ydir, N_DIRS, Upolyd } from './const.js';
import { sobj_at } from './invent.js';
import { couldsee } from './vision.js';
import { D_CLOSED, D_LOCKED } from './const.js';
import { done } from './end.js';
import { DIED } from './const.js';
import { ONAMES } from './objects_data.js';
import { In_sokoban } from './dungeon.js';
import { inside_room } from './sp_lev.js';
import { cmap_names } from './drawing_data.js';
import { tunnels, needspick, passes_walls, passes_bars, dmgtype,
         metallivorous, throws_rocks, verysmall, bigmonst, amorphous,
         is_whirly, noncorporeal, slithy } from './mondata.js';
import { INTRINSIC } from './const.js';
import { start_timer, stop_timer, peek_timer, TIMER_OBJECT, ZOMBIFY_MON }
    from './timeout.js';
import { Hello } from './role.js';
import { digests, is_floater, is_clinger, likes_lava } from './mondata.js';
import { Wwalking } from './youprop.js';
import { s_suffix } from './hacklib.js';
import { uteetering_at_seen_pit } from './trap.js';
import { P_SKILL } from './weapon.js';
import { P_RIDING, P_BASIC } from './const.js';
import { rider_cant_reach } from './steed.js';

// src/hack.c:2996 runmode_delay_output(). Multi-turn actions and running
// periodically expose their intermediate screen. The default "run" mode
// does so every seventh move; "walk" does so every move, "crawl" adds four
// more delays, and "teleport" suppresses all intermediate updates.
export async function runmode_delay_output() {
    const rawMode = game.flags?.runmode;
    let mode = RUN_LEAP;

    if (rawMode === false) {
        mode = RUN_TPORT;
    } else if (Number.isInteger(rawMode)
               && rawMode >= RUN_TPORT && rawMode <= RUN_CRAWL) {
        mode = rawMode;
    } else if (typeof rawMode === 'string') {
        const value = rawMode.toLowerCase();
        if ('teleport'.startsWith(value))
            mode = RUN_TPORT;
        else if ('run'.startsWith(value))
            mode = RUN_LEAP;
        else if ('walk'.startsWith(value))
            mode = RUN_STEP;
        else if ('crawl'.startsWith(value))
            mode = RUN_CRAWL;
    }

    if (!(game.context?.run || game.multi) || mode === RUN_TPORT)
        return;
    if (mode === RUN_LEAP && (game.moves % 7) !== 0)
        return;

    (game.disp ||= {}).time_botl = !!game.flags?.time;
    await flush_screen(1); /* curs_on_u() */
    if (!game.animationFrame)
        return;
    await game.animationFrame();
    if (mode === RUN_CRAWL) {
        await game.animationFrame();
        await game.animationFrame();
        await game.animationFrame();
        await game.animationFrame();
    }
}

// src/hack.c:982 invocation_pos(), the ritual square on the penultimate
// Gehennom level.
export function invocation_pos(x, y) {
    const uz = game.u?.uz;
    const dgn = uz && game.dungeons?.[uz.dnum];
    const pos = game.invocation_pos;
    return !!(uz && dgn?.flags?.hellish
              && uz.dlevel === dgn.num_dunlevs - 1 && pos
              && x === pos.x && y === pos.y);
}

// src/hack.c:3064 invocation_message(), the clue emitted after arriving on
// the ritual square. The mounted and polymorphed wording remains outside the
// current fixture, but the terrain and prepared-Candelabrum behavior is live.
export async function invocation_message() {
    const u = game.u;
    const onStairs = (() => {
        for (let stway = game.stairs; stway; stway = stway.next)
            if (stway.sx === u.ux && stway.sy === u.uy)
                return true;
        return false;
    })();
    if (!invocation_pos(u.ux, u.uy) || onStairs)
        return;

    nomul(0);
    await You_feel(`a strange vibration ${
        Levitation() || Flying() ? 'beneath you' : 'under your feet'}.`);
    (u.uevent ||= {}).uvibrated = 1;

    const candelabrum = carrying(ONAMES.CANDELABRUM_OF_INVOCATION);
    if (candelabrum?.spe === 7 && candelabrum.lamplit) {
        await pline(`${The(xname(candelabrum))} ${
            u.ublind ? 'throbs palpably' : 'glows with a strange light'}!`);
    }
}

// src/hack.c:825 movobj()
export function movobj(obj, ox, oy) {
    /* optimize by leaving on the fobj chain? */
    obj_extract_self(obj); /* remove_object(obj) */
    maybe_unhide_at(obj.ox, obj.oy);
    newsym(obj.ox, obj.oy);
    place_object(obj, ox, oy);
    newsym(ox, oy);
}

// src/hack.c:922 may_dig() — intended to be called only on ROCKs or TREEs. A
// non-diggable wall or tree cannot be tunnelled through, which is what stops
// can_reach_location() routing a pet's path through solid rock.
export function may_dig(x, y) {
    const lev = game.level.at(x, y);
    if (!lev)
        return false;

    return !((IS_STWALL(lev.typ) || IS_TREE(lev.typ))
             && (lev.wall_info & W_NONDIGGABLE));
}

// src/hack.c may_passwall() — a phasing monster still cannot cross a wall the
// level generator marked non-passable (vault walls, the Sanctum).
export function may_passwall(x, y) {
    const lev = game.level.at(x, y);
    if (!lev)
        return false;

    return !(IS_STWALL(lev.typ) && (lev.wall_info & W_NONPASSWALL));
}

// src/hack.c:939 bad_rock() — is this square one a monster cannot walk through?
//
// The port used to carry only three of the five terms. It was missing
// `|| !may_dig(x, y)`, so a tunneller with no pick was let through undiggable
// rock, and it was missing `&& may_passwall(x, y)`, so a phasing monster was
// let through a vault wall. Both errors open paths the C never opens, and a
// pet that believes it can reach a square walks a different route to it.
export function bad_rock(mdat, x, y) {
    const lev = game.level?.at(x, y);
    if (!lev)
        return true;

    return ((In_sokoban(game.u.uz) && sobj_at(ONAMES.BOULDER, x, y))
            || (IS_OBSTRUCTED(lev.typ)
                && (!tunnels(mdat) || needspick(mdat) || !may_dig(x, y))
                && !(passes_walls(mdat) && may_passwall(x, y))));
}

// src/hack.c:145 could_move_onto_boulder() — can hero move onto a spot
// containing one or more boulders? used for m<dir>, travel, and boulder-push
// failure.
export function could_move_onto_boulder(sx, sy) {
    /* can if able to phaze through rock (must be poly'd, so not riding) */
    if (Passes_walls())
        return true;
    /* can't when riding */
    if (game.u.usteed)
        return false;
    /* can if a giant, unless doing so allows hero to pass into a
       diagonal squeeze at the same time */
    if (throws_rocks(game.youmonst.data))
        return (!game.u.dx || !game.u.dy
                || !(IS_OBSTRUCTED(game.level.at(game.u.ux, sy).typ)
                     && IS_OBSTRUCTED(game.level.at(sx, game.u.uy).typ)));
    /* can if tiny (implies carrying very little else couldn't move at all) */
    if (verysmall(game.youmonst.data))
        return true;
    /* can squeeze to spot if carrying extremely little, otherwise can't */
    /* src/hack.c:139 squeezeablylightinvent() */
    return !game.invent.length || inv_weight() <= -WT_SQUEEZABLE_INV;
}

// src/hack.c:953 cant_squeeze_thru() — caller has already decided that it's a
// tight diagonal; 1: can't fit, 2: possessions won't fit, 3: sokoban,
// 0: can squeeze through. Handles the hero as well as monsters; js/mon.js has
// an older private copy for mfndpos which predates this one.
export function cant_squeeze_thru(mon) {
    const is_u = mon === game.youmonst;
    const ptr = is_u ? game.youmonst.data : mon.data;

    if (is_u ? Passes_walls() : passes_walls(ptr))
        return 0;

    /* too big? (can_fog needs polymorph-into-fog state, not modelled) */
    if (bigmonst(ptr)
        && !(amorphous(ptr) || is_whirly(ptr) || noncorporeal(ptr)
             || slithy(ptr)))
        return 1;

    /* lugging too much junk? */
    const amt = is_u ? inv_weight() + weight_cap() : curr_mon_load(mon);
    /* (monsters take js/mon.js's private copy via mfndpos; the hero is the
       only caller that reaches here) */
    if (amt > WT_TOOMUCH_DIAGONAL)
        return 2;

    /* Sokoban restriction applies to hero only */
    if (is_u && In_sokoban(game.u.uz))
        return 3;

    return 0;
}

// src/hack.c:4063 doorless_door() — a doorway which lacks its door (NODOOR or
// BROKEN). All rogue level doors are doorless but disallow diagonal access, so
// they are treated as if their non-existent doors were actually present; the
// rogue level itself is not modelled yet.
export function doorless_door(x, y) {
    const lev_p = game.level?.at(x, y);
    if (!lev_p || !IS_DOOR(lev_p.typ))
        return false;
    return !(lev_p.doormask & ~(D_NODOOR | D_BROKEN));
}

// src/hack.c:991 test_move() — is (ux+dx,uy+dy) an OK place to move? mode is
// DO_MOVE, TEST_MOVE, TEST_TRAV or TEST_TRAP. The DO_MOVE message/side-effect
// arms whose subsystems are not ported yet (still_chewing, autodig, moverock)
// record themselves; nothing reaches them today because domove_core in
// js/cmd.js still carries its own inline blocked-move test.
export async function test_move(ux, uy, dx, dy, mode) {
    const x = ux + dx;
    const y = uy + dy;

    game.context.door_opened = false;

    if (!isok(x, y))
        return false;

    const tmpr = game.level.at(x, y);
    const passesWalls = Passes_walls();

    /*
     *  Check for physical obstacles.  First, the place we are going.
     */
    if (IS_OBSTRUCTED(tmpr.typ) || tmpr.typ === IRONBARS) {
        if (game.u.ublind && mode === DO_MOVE)
            await feel_location(x, y);
        if (passesWalls && may_passwall(x, y)) {
            ; /* do nothing */
        } else if (Underwater()) {
            if (mode === DO_MOVE)
                await pline('There is an obstacle there.');
            return false;
        } else if (tmpr.typ === IRONBARS) {
            if (mode === DO_MOVE
                && (dmgtype(game.youmonst.data, ATTKS.AD_RUST)
                    || dmgtype(game.youmonst.data, ATTKS.AD_CORR)
                    || metallivorous(game.youmonst.data))) {
                note_unported_hack('test_move:chew_ironbars');
                return false;
            }
            if (!(passesWalls || passes_bars(game.youmonst.data))) {
                if (mode === DO_MOVE && game.flags?.mention_walls)
                    await You('cannot pass through the bars.');
                return false;
            }
        } else if (tunnels(game.youmonst.data)
                   && !needspick(game.youmonst.data)) {
            /* Eat the rock. */
            if (mode === DO_MOVE) {
                note_unported_hack('test_move:still_chewing');
                return false;
            }
        } else if (game.flags?.autodig && !game.context.run
                   && !game.context.nopick
                   && game.u.uwep && is_pick(game.u.uwep)) {
            /* MRKR: Automatic digging when wielding the appropriate tool */
            if (mode === DO_MOVE)
                note_unported_hack('test_move:autodig');
            return false;
        } else {
            if (mode === DO_MOVE) {
                /* is_db_wall/Sokoban-passwall/mention_walls flavor */
                note_unported_hack('test_move:do_move_wall_msg');
            }
            return false;
        }
    } else if (IS_DOOR(tmpr.typ)) {
        if (closed_door(x, y)) {
            if (game.u.ublind && mode === DO_MOVE)
                await feel_location(x, y);
            if (passesWalls) {
                ; /* do nothing */
            } else if (can_ooze(game.youmonst)) {
                if (mode === DO_MOVE)
                    await You('ooze under the door.');
            } else if (Underwater()) {
                if (mode === DO_MOVE)
                    await pline('There is an obstacle there.');
                return false;
            } else if (tunnels(game.youmonst.data)
                       && !needspick(game.youmonst.data)) {
                /* Eat the door. */
                if (mode === DO_MOVE) {
                    note_unported_hack('test_move:still_chewing');
                    return false;
                }
            } else {
                let through_testdiag = false;
                if (mode === DO_MOVE) {
                    note_unported_hack('test_move:do_move_closed_door');
                } else if (mode === TEST_TRAV || mode === TEST_TRAP) {
                    /* C: goto testdiag — on survival, control falls out of
                       the door branch into the squeeze tests below */
                    const r = await test_move_testdiag(x, y, dx, dy, mode,
                                                       passesWalls);
                    if (r !== 'fallthru')
                        return r;
                    through_testdiag = true;
                }
                if (!through_testdiag)
                    return false;
            }
        } else {
            const r = await test_move_testdiag(x, y, dx, dy, mode,
                                               passesWalls);
            if (r !== 'fallthru')
                return r;
        }
    }
    if (dx && dy && bad_rock(game.youmonst.data, ux, y)
        && bad_rock(game.youmonst.data, x, uy)) {
        /* Move at a diagonal. */
        switch (cant_squeeze_thru(game.youmonst)) {
        case 3:
            if (mode === DO_MOVE)
                await You('cannot pass that way.');
            return false;
        case 2:
            if (mode === DO_MOVE)
                await You('are carrying too much to get through.');
            return false;
        case 1:
            if (mode === DO_MOVE)
                await pline('Your body is too large to fit through.');
            return false;
        default:
            break; /* can squeeze through */
        }
    } else if (dx && dy && worm_cross(ux, uy, x, y)) {
        /* consecutive long worm segments are at <ux,y> and <x,uy> */
        if (mode === DO_MOVE)
            note_unported_hack('test_move:worm_in_way_msg');
        return false;
    }
    /* Pick travel path that does not require crossing a trap.
     * Avoid water and lava using the usual running rules.
     * (but not u.ux/u.uy because findtravelpath walks toward u.ux/u.uy) */
    if (game.context.run === 8 && mode !== DO_MOVE && !u_at(x, y)) {
        const t = t_at(x, y);

        if (t && t.tseen && t.ttyp !== VIBRATING_SQUARE)
            return (mode === TEST_TRAP);

        /* src/hack.c:59 Known_wwalking / :63 Known_lwalking */
        const uarmf = game.u.uarmf;
        const Known_wwalking =
            (uarmf && uarmf.otyp === ONAMES.WATER_WALKING_BOOTS
             && game.objects[ONAMES.WATER_WALKING_BOOTS].oc_name_known
             && !game.u.usteed);
        const Known_lwalking =
            (Known_wwalking && Fire_resistance()
             && uarmf.oerodeproof && uarmf.rknown);
        if ((tmpr.seenv && is_pool_or_lava(x, y))
            && ((IS_WATERWALL(tmpr.typ)
                 || tmpr.typ === LAVAWALL)
                || !(Levitation() || Flying()
                     || (is_pool(x, y) ? Known_wwalking
                         : (Known_lwalking
                            && is_lava(game.u.ux, game.u.uy))))))
            return (mode === TEST_TRAP);
    }

    if (mode === TEST_TRAP)
        return false; /* do not move through traps */

    const ust = game.level.at(ux, uy);

    /* Now see if other things block our way . . */
    if (dx && dy && !passesWalls && IS_DOOR(ust.typ)
        && (!doorless_door(ux, uy) || block_entry(x, y))) {
        /* Can't move at a diagonal out of a doorway with door. */
        if (mode === DO_MOVE && game.flags?.mention_walls)
            await pline("You can't move diagonally out of an intact doorway.");
        return false;
    }

    if (sobj_at(ONAMES.BOULDER, x, y)
        && (In_sokoban(game.u.uz) || !passesWalls)) {
        if (mode !== TEST_TRAV && game.context.run >= 2
            && !(game.u.ublind || Hallucination())
            && !could_move_onto_boulder(x, y)) {
            if (mode === DO_MOVE && game.flags?.mention_walls)
                await pline('A boulder blocks your path.');
            return false;
        }
        if (mode === DO_MOVE) {
            /* tunneling monsters will chew before pushing */
            if (tunnels(game.youmonst.data) && !needspick(game.youmonst.data)
                && !In_sokoban(game.u.uz)) {
                note_unported_hack('test_move:still_chewing');
                return false;
            } else {
                note_unported_hack('test_move:moverock');
                return false;
            }
        } else if (mode === TEST_TRAV) {
            /* never travel through boulders in Sokoban */
            if (In_sokoban(game.u.uz))
                return false;

            /* don't pick two boulders in a row, unless there's a way thru */
            if (sobj_at(ONAMES.BOULDER, ux, uy) && !In_sokoban(game.u.uz)) {
                if (!passesWalls
                    && !could_move_onto_boulder(ux, uy)
                    && !(tunnels(game.youmonst.data)
                         && !needspick(game.youmonst.data))
                    && !carrying(ONAMES.PICK_AXE)
                    && !carrying(ONAMES.DWARVISH_MATTOCK)
                    && !(carrying(ONAMES.WAN_DIGGING)
                         && !game.objects[ONAMES.WAN_DIGGING].oc_name_known))
                    return false;
            }
        }
        /* assume you'll be able to push it when you get there... */
    }

    /* OK, it is a legal place to move. */
    return true;
}

// The `testdiag` label inside src/hack.c:1138 test_move(): diagonal moves
// into an intact doorway are not allowed. Returns 'fallthru' when the C would
// fall out of the door branch and continue with the squeeze tests.
async function test_move_testdiag(x, y, dx, dy, mode, passesWalls) {
    if (dx && dy && !passesWalls
        && (!doorless_door(x, y) || await block_door(x, y))) {
        /* Diagonal moves into a door are not allowed. */
        if (mode === DO_MOVE)
            note_unported_hack('test_move:diag_door_msg');
        return false;
    }
    return 'fallthru';
}

// src/hack.c:4212 maybe_wail()
async function maybe_wail() {
    if ((game.moves || 0) <= (game.wailmsg || 0) + 50)
        return;

    game.wailmsg = game.moves || 0;
    const role = game.urole?.mnum;
    const race = game.urace?.mnum;
    const isWizard = role === 'PM_WIZARD' || role === PMNAMES.PM_WIZARD;
    const isValkyrie = role === 'PM_VALKYRIE' || role === PMNAMES.PM_VALKYRIE;
    const isElf = race === 'PM_ELF' || race === PMNAMES.PM_ELF;
    if (isWizard || isValkyrie || isElf) {
        const who = (isWizard || isValkyrie) ? game.urole.name.m : 'Elf';
        if (game.u.uhp === 1) {
            await pline(`${who} is about to die.`);
        } else {
            const powers = [
                'HTeleportation', 'HSee_invisible', 'HPoison_resistance',
                'HCold_resistance', 'HShock_resistance', 'HFire_resistance',
                'HSleep_resistance', 'HDisint_resistance',
                'HTeleport_control', 'HStealth', 'HFast', 'HInvis',
            ];
            const count = powers.filter(
                key => ((game.u.intrinsic?.[key] | 0) & INTRINSIC)).length;
            await pline(count >= 4
                ? `${who}, all your powers will be lost...`
                : `${who}, your life force is running out.`);
        }
    } else {
        await You_hear(game.u.uhp === 1
            ? 'the wailing of the Banshee...'
            : 'the howling of the CwnAnnwn...');
    }
}

// src/hack.c:4247 showdamage().
export async function showdamage(dmg) {
    if (!boolean_option('showdamage') || !dmg)
        return;
    await pline(`[HP ${-dmg}, ${Upolyd(game.u) ? game.u.mh : game.u.uhp} left]`);
}

// src/hack.c:4256 losehp().
export async function losehp(n, knam, k_format) {
    (game.disp ||= {}).botl = true;
    end_running(true);
    if (Upolyd(game.u)) {
        game.u.mh -= n;
        await showdamage(n);
        if (game.u.mh > game.u.mhmax)
            game.u.mhmax = game.u.mh;
        if (game.u.mh < 1) {
            const { rehumanize } = await import('./polyself.js');
            await rehumanize();
        } else if (n > 0 && game.u.mh * 10 < game.u.mhmax
                   && (game.u.intrinsic?.HUnchanging
                       || game.u.uprops?.UNCHANGING)) {
            await maybe_wail();
        }
        return;
    }

    game.u.uhp -= n;
    await showdamage(n);
    if (game.u.uhp > game.u.uhpmax)
        game.u.uhpmax = game.u.uhp;     /* perhaps n was negative */

    if (game.u.uhp < 1) {
        game.killer = { format: k_format, name: knam || '' };
        await urgent_pline('You die...');
        await done(DIED);
    } else if (n > 0 && game.u.uhp * 10 < game.u.uhpmax) {
        await maybe_wail();
    }
}

// src/hack.c:3498 in_rooms() — the room numbers touching (x,y), as a string.
//
// Returns a STRING of room numbers, not a boolean, and callers test it with
// `*in_rooms(...)` — i.e. "is it non-empty". The odd shape comes from a square
// on a shared wall belonging to more than one room: SHARED steps by 2 to skip
// the diagonals, SHARED_PLUS steps by 1 to include them, and a plain room
// number short-circuits to just itself.
//
// `typewanted` filters: 0 accepts any room, SHOPBASE accepts every shop type.
// No draws anywhere in it.
export function in_rooms(x, y, typewanted) {
    /* svr.rooms in the C. The live array is game.level.rooms, assigned by
       mklev; game.rooms is initialised once in js/game.js and never written,
       so reading it here made every TYPE-FILTERED lookup fail -- in_rooms(x,
       y, SHOPBASE) and in_rooms(x, y, TEMPLE) always returned empty. */
    const rooms = game.level?.rooms || [];
    const subrooms = game.level?.subrooms || [];
    const goodtype = (rno) => {
        if (!typewanted)
            return true;
        const roomidx = rno - ROOMOFFSET;
        const room = roomidx <= MAXNROFROOMS
            ? rooms[roomidx]
            : subrooms.find(r => r.roomnoidx === roomidx);
        const typefound = room?.rtype;
        return typefound === typewanted
            || (typewanted === SHOPBASE && typefound > SHOPBASE);
    };

    let out = '';
    const push = (rno) => { out = String.fromCharCode(rno) + out; };

    let rno = game.level?.at(x, y)?.roomno ?? NO_ROOM;
    let step;
    switch (rno) {
    case NO_ROOM:
        return out;
    case SHARED:
        step = 2;
        break;
    case SHARED_PLUS:
        step = 1;
        break;
    default:                            /* a regular room number */
        if (goodtype(rno))
            push(rno);
        return out;
    }

    let min_x = x - 1, max_x = x + 1;
    if (x < 1) min_x += step;
    else if (x >= COLNO) max_x -= step;

    let min_y = y - 1, max_y_offset = 2;
    if (min_y < 0) {
        min_y += step;
        max_y_offset -= step;
    } else if ((min_y + max_y_offset) >= ROWNO) {
        max_y_offset -= step;
    }

    for (let xx = min_x; xx <= max_x; xx += step)
        for (let yy = 0; yy <= max_y_offset; yy += step) {
            rno = game.level?.at(xx, min_y + yy)?.roomno ?? NO_ROOM;
            if (rno >= ROOMOFFSET && !out.includes(String.fromCharCode(rno))
                && goodtype(rno))
                push(rno);
        }
    return out;
}

// src/hack.c:3588 move_update() tracks the rooms and shops which touch the
// hero's current square.  Vault timing and ambient sounds read u.urooms.
export function move_update(newlev) {
    const u = game.u;
    u.urooms0 = u.urooms || '';
    u.ushops0 = u.ushops || '';
    if (newlev) {
        u.urooms = u.uentered = u.ushops = u.ushops_entered = '';
        u.ushops_left = u.ushops0;
        return;
    }

    u.urooms = in_rooms(u.ux, u.uy, 0);
    u.uentered = '';
    u.ushops = '';
    u.ushops_entered = '';
    for (const ch of u.urooms) {
        if (!u.urooms0.includes(ch))
            u.uentered += ch;
        const roomidx = ch.charCodeAt(0) - ROOMOFFSET;
        const room = game.level?.rooms?.[roomidx]
            || (game.level?.subrooms || [])
                .find(candidate => candidate.roomnoidx === roomidx);
        const rtype = room?.rtype;
        if (rtype >= SHOPBASE) {
            u.ushops += ch;
            if (!u.ushops0.includes(ch))
                u.ushops_entered += ch;
        }
    }
    u.ushops_left = [...u.ushops0]
        .filter(ch => !u.ushops.includes(ch)).join('');
}

// src/hack.c:3466 monstinroom() and 3482 furniture_present().
function monster_in_room(mnum, roomno) {
    const roomch = String.fromCharCode(roomno + ROOMOFFSET);
    for (const mtmp of game.level?.monsters || []) {
        if (!DEADMONSTER(mtmp) && mtmp.mnum === mnum
            && in_rooms(mtmp.mx, mtmp.my, 0).includes(roomch))
            return mtmp;
    }
    return null;
}

function furniture_present(furniture, room) {
    for (let y = room.ly; y <= room.hy; y++)
        for (let x = room.lx; x <= room.hx; x++)
            if (game.level.at(x, y)?.typ === furniture
                && inside_room(room, x, y))
                return true;
    return false;
}

export function room_discovered(roomno) {
    const seen = (game.level._mapseen_rooms ||= []);
    if (!seen.includes(roomno)) {
        seen.push(roomno);
        recalc_mapseen();
    }
}

// src/hack.c:3626 check_special_room(): update room membership, deliver each
// special room's one-time entry message, and retire consumed room types.
export async function check_special_room(newlev) {
    move_update(newlev);

    if (newlev) {
        if (game.u.ushops0)
            await u_left_shop(game.u.ushops_left, true);
        return;
    }

    if (game.u.ushops0)
        await u_left_shop(game.u.ushops_left, false);

    const achieveo = ((game.context ||= {}).achieveo ||= {});
    if (game.level?.flags?.has_town && !achieveo.minetn_reached
        && game.u.uz.dnum === game.mines_dnum
        && in_town(game.u.ux, game.u.uy)) {
        const { ACH_TOWN, record_achievement } = await import('./insight.js');
        record_achievement(ACH_TOWN);
        achieveo.minetn_reached = true;
    }
    if (!game.u.uentered && !game.u.ushops_entered)
        return;

    if (game.u.ushops_entered) {
        await u_entered_shop(game.u.ushops_entered);
        const seen = (game.level._mapseen_rooms ||= []);
        for (const ch of game.u.ushops_entered) {
            const roomno = ch.charCodeAt(0) - ROOMOFFSET;
            if (!seen.includes(roomno))
                seen.push(roomno);
        }
    }

    for (const ch of game.u.uentered) {
        const roomno = ch.charCodeAt(0) - ROOMOFFSET;
        const room = roomno <= MAXNROFROOMS
            ? game.level?.rooms?.[roomno]
            : game.level?.subrooms?.find(r => r.roomnoidx === roomno);
        if (!room || room.rtype >= SHOPBASE)
            continue;
        let rt = room.rtype;
        let msg_given = true;

        switch (rt) {
        case ZOO:
            await pline("Welcome to David's treasure zoo!");
            break;
        case SWAMP:
            await pline(`It ${game.u.ublind ? 'feels' : 'looks'} rather ${
                game.u.ublind ? 'humid' : 'muddy'} down here.`);
            break;
        case COURT:
            await You(`enter an opulent${
                furniture_present(THRONE, room) ? ' throne' : ''} room!`);
            break;
        case LEPREHALL:
            await You('enter a leprechaun hall!');
            break;
        case MORGUE: {
            const { midnight } = await import('./calendar.js');
            if (midnight()) {
                const run = u_locomotion('Run');
                await pline(`${run} away!  ${run} away!`);
            } else {
                await You('have an uncanny feeling...');
            }
            break;
        }
        case BEEHIVE:
            await You('enter a giant beehive!');
            break;
        case COCKNEST:
            await You('enter a disgusting nest!');
            break;
        case ANTHOLE:
            await You('enter an anthole!');
            break;
        case BARRACKS:
            if (monster_in_room(PMNAMES.PM_SOLDIER, roomno)
                || monster_in_room(PMNAMES.PM_SERGEANT, roomno)
                || monster_in_room(PMNAMES.PM_LIEUTENANT, roomno)
                || monster_in_room(PMNAMES.PM_CAPTAIN, roomno)) {
                await You('enter a military barracks!');
            } else {
                await You('enter an abandoned barracks.');
            }
            break;
        case DELPHI: {
            const oracle = monster_in_room(PMNAMES.PM_ORACLE, roomno);
            if (oracle) {
                const speech = oracle.mpeaceful
                    ? `${Hello(null)}, ${game.plname}, welcome to Delphi!`
                    : `You're in Delphi, ${game.plname}.`;
                await pline(`"${speech}"`);
            } else {
                msg_given = false;
            }
            break;
        }
        case TEMPLE: {
            const { intemple } = await import('./priest.js');
            await intemple(ch.charCodeAt(0));
            rt = 0;
            break;
        }
        default:
            msg_given = rt === TEMPLE || rt >= SHOPBASE;
            rt = 0;
            break;
        }

        if (msg_given)
            room_discovered(roomno);

        if (rt !== 0) {
            room.rtype = OROOM;
            const another = [...(game.level.rooms || []),
                             ...(game.level.subrooms || [])]
                .some(candidate => candidate?.rtype === rt);
            if (!another) {
                const flag = rt === COURT ? 'has_court'
                    : rt === SWAMP ? 'has_swamp'
                      : rt === MORGUE ? 'has_morgue'
                        : rt === ZOO ? 'has_zoo'
                          : rt === BARRACKS ? 'has_barracks'
                            : rt === TEMPLE ? 'has_temple'
                              : rt === BEEHIVE ? 'has_beehive' : null;
                if (flag)
                    game.level.flags[flag] = false;
            }

            if (rt === COURT || rt === SWAMP || rt === MORGUE || rt === ZOO) {
                for (const mtmp of game.level.monsters || []) {
                    if (DEADMONSTER(mtmp))
                        continue;
                    if (!isok(mtmp.mx, mtmp.my)
                        || roomno !== game.level.at(mtmp.mx, mtmp.my)?.roomno)
                        continue;
                    if (!Stealth() && !rn2(3)) {
                        await wake_msg(mtmp, false);
                        mtmp.msleeping = 0;
                    }
                }
            }
        }
    }
}

/* js/monmove.js needs in_rooms() but cannot import this file without closing
   a cycle, and adding the import to the entry point perturbs module init order
   (see STATUS). Publishing on the shared game object avoids both. */
game.in_rooms = in_rooms;

// src/hack.c:3564 in_town() — is (x,y) in a town? A room with subrooms is
// assumed to be the town; with no subrooms anywhere the whole level is.
export function in_town(x, y) {
    let has_subrooms = false;

    if (!game.level?.flags?.has_town)
        return false;

    for (const sroom of (game.level.rooms || [])) {
        if (sroom.hx <= 0)
            break;
        if ((sroom.nsubrooms ?? 0) > 0) {
            has_subrooms = true;
            if (inside_room(sroom, x, y))
                return true;
        }
    }

    return !has_subrooms;
}


// src/hack.c:2229 domove_fight_empty()
export async function domove_fight_empty(x, y) {
    const unknown_obstacle = 'an unknown obstacle';
    const off_edge = !isok(x, y);
    let glyph = !off_edge ? glyph_at(x, y) : { kind: 'unexplored' };
    if (off_edge) {
        x = 0; y = 1;
    }
    if (game.context.forcefight
        || (glyph.kind === 'invis' && !m_at(x, y) && !game.context.nopick)) {
        let boulder = null;
        const explo = Upolyd(game.u) && attacktype(game.youmonst.data, ATTKS.AT_EXPL);
        const solid = off_edge || !accessible(x, y)
            || IS_FURNITURE(game.level.at(x, y).typ);
        let buf;
        if (off_edge) {
            buf = unknown_obstacle;
        } else {
            const loc = game.level.at(x, y);
            if (!Underwater()) {
                boulder = sobj_at(ONAMES.BOULDER, x, y);
                if ((glyph.kind === 'obj' && glyph.statue)
                    || (Hallucination() && glyph.kind === 'mon'))
                    boulder = sobj_at(ONAMES.STATUE, x, y);
                if (game.context.forcefight && game.u.uwep
                    && dig_typ(game.u.uwep, x, y)
                    && glyph.kind !== 'invis' && glyph.kind !== 'mon') {
                    await use_pick_axe2(game.u.uwep);
                    return true;
                }
            }
            /* Clear remembered objects even while blind. */
            unmap_object(x, y);
            if (boulder)
                map_object(boulder, true);
            newsym(x, y);
            glyph = glyph_at(x, y);
            if (boulder) {
                buf = ansimpleoname(boulder);
            } else if (Underwater() && !is_pool(x, y)) {
                buf = Is_waterlevel(game.u.uz) && loc.typ === AIR
                    ? 'an air bubble' : 'nothing';
            } else if (solid) {
                if (loc.seenv || IS_STWALL(loc.typ) || IS_SDOOR(loc.typ)
                    || loc.typ === SCORR) {
                    glyph = back_to_glyph(loc, x, y);
                    buf = the(defsyms[glyph.cmap].explain);
                } else {
                    buf = unknown_obstacle;
                }
            } else {
                buf = 'thin air';
            }
        }
        await You(`${!(boulder || solid) ? '' : !explo ? 'harmlessly ' : 'futilely '}${
            explo ? 'explode at' : 'attack'} ${buf}.`);
        nomul(0);
        if (explo) {
            const attk = attacktype_fordmg(game.youmonst.data, ATTKS.AT_EXPL, ATTKS.AD_ANY);
            await wake_nearto(game.u.ux, game.u.uy, 7 * 7);
            if (attk)
                await explum(null, attk);
            game.u.mh = -1;
            await rehumanize();
        }
        return true;
    }
    return false;
}

// src/hack.c:2515 avoid_trap_andor_region()
export async function avoid_trap_andor_region(x, y) {
    const bits = paranoia_bits();
    let newreg, oldreg, trap;
    if ((bits & PARANOID_TRAP) && !Blind() && !Stunned() && !Confusion() && !Hallucination()
        && (!game.context.nopick || game.context.run)
        && (newreg = visible_region_at(x, y))
        && (!(oldreg = visible_region_at(game.u.ux, game.u.uy))
            || (reg_damg(newreg) > 0 && reg_damg(oldreg) === 0))
        && await test_move(game.u.ux, game.u.uy, game.u.dx, game.u.dy, TEST_MOVE)) {
        const qbuf = `${u_locomotion('step')} into that ${reg_damg(newreg) > 0
            ? 'poison gas' : 'vapor'} cloud?`;
        if (!(await paranoid_query(bits & PARANOID_CONFIRM, upstart(qbuf)))) {
            nomul(0);
            game.context.move = 0;
            return true;
        }
    }
    if ((bits & PARANOID_TRAP) && !Stunned() && !Confusion()
        && (!game.context.nopick || game.context.run)
        && (trap = t_at(x, y)) && trap.tseen
        && await test_move(game.u.ux, game.u.uy, game.u.dx, game.u.dy, TEST_MOVE)
        && ((await immune_to_trap(game.youmonst, trap.ttyp)) !== TRAP_CLEARLY_IMMUNE
            || Hallucination())) {
        const traptype = Hallucination() ? rnd(TRAPNUM - 1) : trap.ttyp;
        const into = into_vs_onto(traptype);
        const qbuf = `Really ${u_locomotion('step')} ${into ? 'into' : 'onto'} that ${
            defsyms[cmap_names.S_arrow_trap + traptype - 1].explain}?`;
        if (!(await paranoid_query(bits & PARANOID_CONFIRM, qbuf))) {
            nomul(0);
            game.context.move = 0;
            return true;
        }
    }
    return false;
}

// src/hack.c domove_attackmon_at() — the gate between walking into a square
// and attacking what is standing on it.
//
// The guard is four ways to be allowed to attack: forcefight, the monster is
// not hidden, you sense it, or it is a hider/eel that is NOT safe to bump
// into. A hider you cannot see still routes to do_attack, which prints the
// "Wait!" message -- that is why the hides_under clause exists at all.
//
// The displacer-beast check reads as a long list of draws but is not: the
// FIRST term is an identity test against PM_DISPLACER_BEAST, so for every
// other monster the rn2(2) is never reached. Reordering these terms to put
// the cheap boolean tests first -- which looks like an optimisation -- would
// change how often that rn2(2) fires and desynchronise the stream.
//
// do_attack is only called when the displacement did NOT happen.
export async function domove_attackmon_at(mtmp, x, y, displaceu) {
    if (game.context?.forcefight || !mtmp.mundetected || sensemon(mtmp)
        || ((hides_under(game.mons[mtmp.mnum])
             || game.mons[mtmp.mnum].mlet === MONSYMS.S_EEL)
            && !is_safemon(mtmp))) {
        /* target monster might decide to switch places with you... */
        displaceu.value =
            !!(mtmp.mnum === PMNAMES.PM_DISPLACER_BEAST && !rn2(2)
               && mtmp.mux === game.u.ux0 && mtmp.muy === game.u.uy0
               && note_unported_hack('domove_attackmon_at:displace_rest'));

        /* if not displacing, try to attack; note that it might evade; also,
           we don't attack tame or peaceful when safemon() */
        if (!displaceu.value) {
            if (await do_attack(mtmp))
                return true;
        }
    }
    return false;
}

const note_unported_hack = (w) => {
    (game.unported ||= new Set()).add('hack:' + w);
    return false;
};

// src/hack.c:1832 u_simple_floortyp() — floor solid/liquid state for the
// hero: walls of water/lava always count; pools only when grounded.
function u_simple_floortyp(x, y) {
    const u_in_air = Levitation() || Flying();
    const typ = game.level?.at(x, y)?.typ;
    if (typ === WATER)
        return WATER;
    if (typ === LAVAWALL)
        return LAVAWALL;
    if (!u_in_air) {
        if (is_pool(x, y))
            return POOL;
        if (is_lava(x, y))
            return LAVAPOOL;
    }
    return ROOM;
}

// src/hack.c:1885 swim_move_danger() — refuse to walk into known water or
// lava without the m prefix. paranoid_confirmation defaults include swim,
// so ParanoidSwim is on unless the rc turns it off.
export async function swim_move_danger(x, y) {
    const newtyp = u_simple_floortyp(x, y);
    const liquid_wall = (newtyp === WATER || newtyp === LAVAWALL);

    if (game.u.uprops?.UNDERWATER && (is_pool(x, y) || newtyp === WATER))
        return false;

    const loc = game.level?.at(x, y);
    if ((newtyp !== u_simple_floortyp(game.u.ux, game.u.uy))
        && !game.u.uprops?.STUNNED && !game.u.uprops?.CONFUSION
        && loc?.seenv
        && (is_pool(x, y) || is_lava(x, y) || liquid_wall)) {
        /* Known_wwalking / Known_lwalking need identified worn gear the
           sessions lack; both read false here */
        if ((is_pool(x, y))
            || (is_lava(x, y) && !is_lava(game.u.ux, game.u.uy))
            || liquid_wall) {
            if (game.context.nopick) {
                /* moving with m-prefix */
                game.context.tips = (game.context.tips | 0) | (1 << TIP_SWIM);
                return false;
            } else if (paranoid_swim() || liquid_wall) {
                await You(`avoid ${
                    Levitation() ? 'floating'
                    : Flying() ? 'flying' : 'stepping'} into the ${
                    waterbody_name(x, y)}.`);
                await handle_tip(TIP_SWIM);
                return true;
            }
        }
    }
    return false;
}

// src/hack.c:1925 domove_bump_mon(). Moving without pickup does not attack a
// monster the hero senses or already has marked on the map. It spends the
// move and reports the collision before domove_attackmon_at() can run.
export async function domove_bump_mon(mtmp, x, y) {
    const glyph = glyph_at(x, y);
    if (game.context?.nopick && !game.context?.travel
        && (canspotmon(mtmp) || glyph?.kind === 'invis'
            || glyph?.kind === 'warn')) {
        if (M_AP_TYPE(mtmp) && !sensemon(mtmp)) {
            seemimic(mtmp);
        } else if (mtmp.mpeaceful && !Hallucination()) {
            await pline(`Pardon me, ${m_monnam(mtmp)}.`);
        } else {
            await You(`move right into ${mon_nam(mtmp)}.`);
        }
        return true;
    }
    return false;
}

/* flag.h:580 ParanoidSwim — paranoid_confirmation's default list includes
   swim; an rc override would land in game.flags.paranoia_bits */
function paranoid_swim() {
    if (game.flags?.paranoia_bits !== undefined)
        return (game.flags.paranoia_bits & 0x0400) !== 0; /* PARANOID_SWIM */
    return true;
}

// src/hack.c:3230 pooleffects() — entering/leaving water or lava.
// Returns true when the hero changed location surviving the problem (the
// caller skips the rest of spoteffects then).
export async function pooleffects(newspot) {
    const u = game.u;

    /* check for leaving water */
    if (u.uinwater) {
        let still_inwater = false;
        if (!is_pool(u.ux, u.uy)) {
            if (Is_waterlevel(u.uz)) {
                await You('pop into an air bubble.');
            } else if (is_lava(u.ux, u.uy)) {
                await You(`leave the ${hliquid('water')}...`); /* oops! */
            } else {
                /* back_on_ground(FALSE) */
                let surf = surface(u.ux, u.uy);
                if (surf === 'floor' || surf === 'ground')
                    surf = 'solid ground';
                await pline(`You're back on ${surf}.`);
            }
        } else if (Is_waterlevel(u.uz)) {
            still_inwater = true;
        } else if (Levitation()) {
            await You(`pop out of the ${hliquid('water')} like a cork!`);
        } else if (Flying()) {
            await You(`fly out of the ${hliquid('water')}.`);
        } else if (u.uprops?.WWALKING) {
            await You('slowly rise above the surface.');
        } else {
            still_inwater = true;
        }
        if (!still_inwater) {
            /* was_underwater display restore is tied to the underwater
               constrained view, which is recorded rather than modelled */
            if (u.uinwater) {
                u.uinwater = 0;
                (game.unported ||= new Set()).add('hack:pooleffects:leave');
            }
        }
    }

    /* check for entering water or lava */
    if (!u.ustuck && !Levitation() && !Flying()
        && is_pool_or_lava(u.ux, u.uy)) {
        if (u.usteed) {
            note_unported_hack('pooleffects:steed');
            return false;
        }
        /* ceiling hider check needs polyself */
        if (is_lava(u.ux, u.uy)) {
            const { lava_effects } = await import('./trap.js');
            if (await lava_effects())
                return true;
        } else if ((!u.uprops?.WWALKING
                    || game.level?.at(u.ux, u.uy)?.typ === WATER)
                   && (newspot || !u.uinwater
                       || !(Swimming() || Amphibious() || Breathless()))) {
            const { drown } = await import('./trap.js');
            if (await drown())
                return true;
        }
    }
    return false;
}

// src/hack.c:3312 spoteffects() — what happens on the square just moved onto.
//
// Terrain changes and pool effects precede pickup and trap activation.
// Sink handling, recursion guards and levitation-timeout deferral remain partial.
export async function spoteffects(pick) {
    const trap = t_at(game.u.ux, game.u.uy);
    const trapflag = game.iflags.failing_untrap ? 0x40 /* FAILEDUNTRAP */ : 0;
    // src/hack.c:3342, moving out of rock restores blocked Lev/Fly.
    if (game.level.at(game.u.ux, game.u.uy).typ !== game.level.at(game.u.ux0, game.u.uy0).typ
        || game.iflags.terrain_typ === MAX_TYPE)
        await switch_terrain();

    /* src/hack.c:3349 — pooleffects first; when the hero is carried off by
       water or lava (drown/lava_effects moved them), the rest is skipped */
    if (await pooleffects(true))
        return;

    await check_special_room(false);

    /* src/hack.c:3355 — "if dismounting, check again later": the whole
       pickup/trap block is skipped so that only float_down()'s pickup runs;
       without the gate a dismount onto a pile shows the pile window TWICE
       and eats an extra dismissal key. */
    if (!game.in_steed_dismounting) {
        /*
         * If not a pit, pickup before triggering trap.
         * If pit, trigger trap before pickup.
         */
        const pit = !!(trap && is_pit(trap.ttyp));
        if (pick && !pit)
            await pickup(1);
        if (trap)
            await dotrap(trap, trapflag);
        if (pick && pit)
            await pickup(1);
    }

    /* hidden monster at the same spot (hides_under, piercers) */
    const mtmp = m_at(game.u.ux, game.u.uy);
    if (mtmp && !game.u.uswallow)
        note_unported_hack('spoteffects:mon_here');
}

// src/hack.c:4130 end_running() — stop a run/rush/travel.
//
// The time_botl line is the one with a visible consequence: moveloop()
// suppresses the time field while context.run is non-zero, so the turn counter
// has to be forced to repaint at the moment running stops, or it shows a stale
// value for one frame.
export function end_running(and_travel) {
    const ctx = (game.context ||= {});

    if (ctx.run) {
        ctx.run = 0;
        if (game.flags?.time)
            (game.disp ||= {}).time_botl = true;
        /* classify_terrain() suppresses setting disp.botl while running, so C
           recomputes here. The terrainstatus option defaults to Off
           (js/optlist.js:219) and classify_terrain is not ported, so this arm
           cannot fire yet; recorded rather than guessed. */
        if (game.flags?.terrainstatus) {
            (game.unported ||= new Set()).add('hack:end_running:classify_terrain');
        }
    }

    /* 'context.mv' isn't travel but callers who want to end travel
       all clear it too */
    if (and_travel)
        ctx.travel = ctx.travel1 = ctx.mv = 0;
    if (game.travelmap) {
        /* selection_free(gt.travelmap, TRUE) — the travel map is not ported */
        (game.unported ||= new Set()).add('hack:end_running:travelmap');
        game.travelmap = null;
    }
    /* cancel multi */
    if (game.multi > 0)
        game.multi = 0;
}

// src/hack.c:4161 nomul() — set the multi-turn counter.
//
// The early return carries C's own comment ("This is a bug fix by ab@unido"):
// a caller asking for a SHORTER helplessness than the one already in effect is
// ignored, so the longest wins rather than the latest.
export function nomul(nval) {
    if (globalThis.__dog_trace && game.context?.travel)
        console.error('NOMUL during travel:', (new Error().stack || '')
            .split('\n')[2]?.trim());
    if (game.multi < nval)
        return;              /* This is a bug fix by ab@unido */
    (game.disp ||= {}).botl ||= (game.multi >= 0);
    if (game.u) {
        game.u.uinvulnerable = false; /* Kludge to avoid ctrl-C bug -dlc */
        game.u.usleep = 0;
    }
    game.multi = nval;
    if (nval === 0)
        game.multi_reason = null, game.multireasonbuf = '';
    end_running(true);
    cmdq_clear(CQ_CANNED);
}

// src/hack.c:4177 unmul() — a non-movement multi-turn action has finished.
//
// THE CLEAR-BEFORE-CALL on afternmv IS LOAD-BEARING and C comments it: a
// callback that sets afternmv again must not be clobbered after it returns.
export async function unmul(msg_override) {
    (game.disp ||= {}).botl = true;
    game.multi = 0; /* caller will usually have done this already */
    if (msg_override !== undefined && msg_override !== null)
        game.nomovemsg = msg_override;
    /* C tests the POINTER here (`!gn.nomovemsg`), so only an unset message
       gets the default; an explicitly EMPTY string survives. */
    else if (game.nomovemsg == null)
        game.nomovemsg = "You can move again.";
    /* and dereferences it here (`if (*gn.nomovemsg)`), so "" prints nothing.
       Collapsing the two states made every nomovemsg="" caller -- jump is
       one -- announce "You can move again." where C stays silent. */
    if (game.nomovemsg) {
        await pline(game.nomovemsg);
        if (Upolyd(game.u) && /^You survived that /i.test(game.nomovemsg))
            await You(`are ${an(pmname(game.mons[game.u.umonnum], game.u.mfemale ? 1 : 0))}.`);
    }
    game.nomovemsg = null;
    if (game.u)
        game.u.usleep = 0;
    game.multi_reason = null;
    game.multireasonbuf = '';

    if (game.afternmv) {
        const f = game.afternmv;
        /* clear afternmv BEFORE calling it */
        game.afternmv = null;
        await f();
    }
}

// src/hack.c:59 Known_wwalking, :63 Known_lwalking — file-local macros, not
// youprop.h ones, which is why they live here rather than in js/youprop.js.
//
// "Known" is the operative word: these ask whether the HERO KNOWS they can
// walk on the liquid, not whether they actually can. Unidentified water
// walking boots still work, but the run stops at the water's edge anyway,
// because the player has no reason to believe it is safe. C's own comment
// notes this should use cause_known() if anything but boots ever grants it.
const Known_wwalking = () =>
    !!(game.u.uarmf && game.u.uarmf.otyp === ONAMES.WATER_WALKING_BOOTS
       && game.objects[ONAMES.WATER_WALKING_BOOTS]?.oc_name_known
       && !game.u?.usteed);

const Known_lwalking = () =>
    !!(Known_wwalking() && Fire_resistance()
       && game.u.uarmf.oerodeproof && game.u.uarmf.rknown);

/* include/context.h:15 — the one-shot gameplay tips, a bitfield in
   svc.context.tips */
export const TIP_ENHANCE = 0, TIP_SWIM = 1, TIP_UNTRAP_MON = 2,
             TIP_GETPOS = 3;

// src/hack.c:1852 handle_tip() — maybe show a helpful gameplay tip once per
// game. flags.tips defaults on. Only the getpos tip has a window; the others
// are plines.
export async function handle_tip(tip) {
    if (game.flags?.tips === false)
        return false;

    game.context.tips = game.context.tips || 0;
    if (!(game.context.tips & (1 << tip))) {
        game.context.tips |= (1 << tip);
        switch (tip) {
        case TIP_ENHANCE:
            await pline('(Tip: use the #enhance command to advance them.)');
            break;
        case TIP_SWIM:
            /* visctrl(cmd_from_func(do_reqmenu)) is the m prefix */
            await pline("(Tip: use 'm' prefix to step in if you really want to.)");
            break;
        case TIP_UNTRAP_MON:
            await pline('(Tip: perhaps #untrap would help?)');
            break;
        case TIP_GETPOS: {
            /* l_nhcore_call(NHCORE_GETPOS_TIP) -> nhcore.lua's
               show_getpos_tip() */
            const { show_getpos_tip } = await import('./nhlua.js');
            await show_getpos_tip();
            break;
        }
        default:
            break;
        }
        return true;
    }
    return false;
}

// src/hack.c:2444 avoid_moving_on_trap() — stop a run at a known trap.
//
// The vibrating square is a trap structurally but terrain in spirit, so it is
// excluded; running across it does not stop.
export function avoid_moving_on_trap(x, y, msg) {
    const trap = t_at(x, y);

    if (trap && trap.tseen
        /* the vibrating square is implemented as a trap but treated as if
           it were a type of terrain */
        && trap.ttyp !== VIBRATING_SQUARE) {
        if (msg && game.flags?.mention_walls) {
            /* You("stop in front of %s.", an(trapname(trap->ttyp, FALSE)))
               -- trapname() is not ported and mention_walls defaults Off
               (js/optlist.js), so this records rather than guessing a name. */
            (game.unported ||= new Set()).add('hack:avoid_moving_on_trap:msg');
        }
        return true;
    }
    return false;
}

// src/hack.c:2463 avoid_moving_on_liquid() — stop a run at water or lava.
//
// The first condition is a tangle worth reading carefully: it returns FALSE
// (safe, keep going) when you are NOT crossing a terrain boundary, OR you are
// shift-running and the transition is not lava, OR you are travelling -- AND
// you know you will not fall in -- AND it is not a waterwall or lavawall.
// Everything else falls through to the stop test.
export function avoid_moving_on_liquid(x, y, msg) {
    const in_air = (Levitation() || Flying());
    const here = game.level?.at?.(game.u.ux, game.u.uy);
    const there = game.level?.at?.(x, y);
    if (!there || !here)
        return false;

    /* don't stop if you're not on a transition between terrain types... */
    if ((there.typ === here.typ
         /* or you are using shift-dir running and the transition isn't
            dangerous... */
         || ((game.context?.run | 0) < 2 && (!is_lava(x, y) || in_air))
         || game.context?.travel)
        /* and you know you won't fall in */
        && (in_air || Known_lwalking()
            || (is_pool(x, y) && Known_wwalking()))
        && !(IS_WATERWALL(there.typ) || there.typ === LAVAWALL)) {
        return false; /* liquid is safe to traverse */
    } else if (is_pool_or_lava(x, y) && there.seenv) {
        if (msg && game.flags?.mention_walls) {
            /* You("stop at the edge of the %s.", hliquid(...)) -- hliquid()
               is not ported and mention_walls defaults Off. */
            (game.unported ||= new Set()).add('hack:avoid_moving_on_liquid:msg');
        }
        return true;
    }
    return false;
}

// include/hack.h:1414 NODIAG() — only grid bugs cannot move diagonally.
export const NODIAG = (monnum) => monnum === PMNAMES.PM_GRID_BUG;

// src/hack.c:3898 lookaround() — decide whether a run/rush should stop here,
// and if it is following a corridor, which way to turn next.
//
// This is what makes a rush cover several squares in one command. Without it
// the port zeroed context.run and took a single step, so every G/shift move
// diverged from C by however many squares C would have continued.
//
// C uses two gotos. `stop` is the ordinary "end the run" exit, translated as
// nomul(0) + return. `bcorr` is a FORWARD jump landing inside the corridor
// arm of the if-else chain, reached from the trap arm and the closed-door
// arm; it is translated as an explicit flag rather than by restructuring,
// because the fall-through order is load bearing and rewriting it as nested
// conditions is exactly the kind of "cleaner" shape that diverges later.
//
// The turn logic at the bottom is the part with no obvious intuition: i0
// tracks the closest corridor square seen, m0 whether a monster was on it,
// noturn whether two corridor squares were non-adjacent (a fork). A turn is
// only taken when exactly one corridor continues, and never more than a half
// turn per step, which is what u.last_str_turn accumulates.
export async function lookaround() {
    let x, y, i, x0 = 0, y0 = 0, m0 = 1, i0 = 9;
    let corrct = 0, noturn = 0;
    const u = game.u;
    const lev = game.level;

    /* Grid bugs stop if trying to move diagonal, even if blind.  Maybe */
    /* they polymorphed while in the middle of a long move. */
    if (NODIAG(u.umonnum) && u.dx && u.dy) {
        await You('cannot move diagonally.');
        nomul(0);
        return;
    }

    if (u.ublind || (game.context?.run | 0) === 0)
        return;

    for (x = u.ux - 1; x <= u.ux + 1; x++) {
        for (y = u.uy - 1; y <= u.uy + 1; y++) {
            const infront = (x === u.ux + u.dx && y === u.uy + u.dy);
            const run = game.context?.run | 0;

            /* ignore out of bounds, and our own location */
            if (!isok(x, y) || u_at(x, y))
                continue;
            /* (grid bugs) ignore diagonals */
            if (NODIAG(u.umonnum) && x !== u.ux && y !== u.uy)
                continue;

            const mtmp = m_at(x, y);
            let bcorr = false, stop = false, next = false;

            /* can we see a monster there? */
            if (mtmp
                && M_AP_TYPE(mtmp) !== M_AP_FURNITURE
                && M_AP_TYPE(mtmp) !== M_AP_OBJECT
                && mon_visible(mtmp)) {
                /* running movement and not a hostile monster */
                /* OR it blocks our move direction and we're not traveling */
                if ((run !== 1 && !is_safemon(mtmp))
                    || (infront && !game.context?.travel)) {
                    if (game.flags?.mention_walls)
                        await pline_xy(x, y, upstart(a_monnam(mtmp))
                                       + ' blocks your path.');
                    nomul(0);
                    return;
                }
            }

            const loc = lev?.at?.(x, y);
            if (!loc)
                continue;

            /* stone is never interesting */
            if (loc.typ === STONE)
                continue;
            /* ignore the square we're moving away from */
            if (x === u.ux - u.dx && y === u.uy - u.dy)
                continue;

            /* stop for traps, sometimes */
            if (avoid_moving_on_trap(x, y, (infront && run > 1))) {
                if (run === 1)
                    bcorr = true;       /* goto bcorr -- if you must */
                else if (infront)
                    stop = true;
            }

            if (!bcorr && !stop) {
                const here = lev?.at?.(u.ux, u.uy);
                /* more uninteresting terrain */
                if (IS_OBSTRUCTED(loc.typ) || loc.typ === ROOM
                    || IS_AIR(loc.typ) || loc.typ === ICE) {
                    continue;
                } else if (closed_door(x, y)
                           || (mtmp && is_door_mappear(mtmp))) {
                    /* a closed door? */
                    /* ignore if diagonal */
                    if (x !== u.ux && y !== u.uy)
                        continue;
                    if (run !== 1 && !game.context?.travel) {
                        if (game.flags?.mention_walls) {
                            set_msg_xy(x, y);
                            await You('stop in front of the door.');
                        }
                        stop = true;
                    } else {
                        /* orthogonal to a closed door, treat as a corridor */
                        bcorr = true;
                    }
                } else if (loc.typ === CORR) {
                    bcorr = true;
                } else if (is_pool_or_lava(x, y)) {
                    if (infront && avoid_moving_on_liquid(x, y, true))
                        stop = true;
                    else
                        next = true;
                } else { /* e.g. objects or trap or stairs */
                    if (run === 1)
                        bcorr = true;
                    else if (run === 8)
                        next = true;
                    else if (mtmp)
                        next = true;            /* d */
                    else if (((x === u.ux - u.dx) && (y !== u.uy + u.dy))
                             || ((y === u.uy - u.dy) && (x !== u.ux + u.dx)))
                        next = true;
                    /* otherwise falls through to stop */
                }
            }

            if (next)
                continue;

            if (bcorr) {
                /* bcorr: */
                const here = lev?.at?.(u.ux, u.uy);
                if (here && here.typ !== ROOM) {
                    /* running or traveling */
                    if (run === 1 || run === 3 || run === 8) {
                        /* distance from x,y to location we're moving to */
                        i = dist2(x, y, u.ux + u.dx, u.uy + u.dy);
                        /* ignore if not on or directly adjacent to it */
                        if (i > 2)
                            continue;
                        /* if we've seen one corridor, and x,y is not directly
                           orthogonally next to it, mark noturn */
                        if (corrct === 1 && dist2(x, y, x0, y0) !== 1)
                            noturn = 1;
                        /* if previous x,y was diagonal, now x,y is
                           orthogonal (or this is first time we're here) */
                        if (i < i0) {
                            i0 = i;
                            x0 = x;
                            y0 = y;
                            m0 = mtmp ? 1 : 0;
                        }
                    }
                    corrct++;
                }
                continue;
            }

            /* stop: */
            nomul(0);
            return;
        }
    } /* end for loops */

    if (corrct > 1 && (game.context?.run | 0) === 2) {
        if (game.flags?.mention_walls)
            await pline_The('corridor widens here.');
        nomul(0);
        return;
    }

    const run = game.context?.run | 0;
    if ((run === 1 || run === 3 || run === 8)
        && !noturn && !m0 && i0
        && (corrct === 1 || (corrct === 2 && i0 === 1))) {
        /* make sure that we do not turn too far */
        if (i0 === 2) {
            if (u.dx === y0 - u.uy && u.dy === u.ux - x0)
                i = 2; /* straight turn right */
            else
                i = -2; /* straight turn left */
        } else if (u.dx && u.dy) {
            if ((u.dx === u.dy && y0 === u.uy)
                || (u.dx !== u.dy && y0 !== u.uy))
                i = -1; /* half turn left */
            else
                i = 1; /* half turn right */
        } else {
            if ((x0 - u.ux === y0 - u.uy && !u.dy)
                || (x0 - u.ux !== y0 - u.uy && u.dy))
                i = 1; /* half turn right */
            else
                i = -1; /* half turn left */
        }

        i += (u.last_str_turn | 0);
        if (i <= 2 && i >= -2) {
            u.last_str_turn = i;
            u.dx = x0 - u.ux;
            u.dy = y0 - u.uy;
        }
    }
}

// src/hack.c:1787 impact_disturbs_zombies() — a heavy object hitting the floor
// wakes zombies buried nearby.
//
// Note the threshold flips with `violent`: 10 for a violent impact, 100 for an
// ordinary drop, so an ordinary drop has to be ten times heavier to matter.
export function impact_disturbs_zombies(obj, violent) {
    /* if object won't make a noticeable impact, let buried zombies rest */
    if (obj.owt < (violent ? 10 : 100) || is_flimsy(obj))
        return;

    disturb_buried_zombies(obj.ox, obj.oy);
}

// src/hack.c:1798 disturb_buried_zombies().
export function disturb_buried_zombies(x, y) {
    for (const obj of (game.level?.buriedobjs || [])) {
        if (obj.otyp === ONAMES.CORPSE && obj.timed
            && obj.ox >= x - 1 && obj.ox <= x + 1
            && obj.oy >= y - 1 && obj.oy <= y + 1
            && peek_timer(ZOMBIFY_MON, obj) > 0) {
            const remaining = stop_timer(ZOMBIFY_MON, obj);
            start_timer(Math.max(1, Math.trunc(remaining * 2 / 3)),
                        TIMER_OBJECT, ZOMBIFY_MON, obj);
        }
    }
}

// src/hack.c:4106 monster_nearby() — a spottable hostile adjacent to the hero.
export function monster_nearby() {
    const u = game.u;
    for (let x = u.ux - 1; x <= u.ux + 1; x++) {
        for (let y = u.uy - 1; y <= u.uy + 1; y++) {
            if (!isok(x, y) || (x === u.ux && y === u.uy))
                continue;
            const mtmp = m_at(x, y);
            if (mtmp
                && M_AP_TYPE(mtmp) !== M_AP_FURNITURE
                && M_AP_TYPE(mtmp) !== M_AP_OBJECT
                && (Hallucination()
                    || (!mtmp.mpeaceful && !noattacks(game.mons[mtmp.mnum])))
                && (!is_hider(game.mons[mtmp.mnum]) || !mtmp.mundetected)
                && !helpless(mtmp)
                && !onscary(u.ux, u.uy, mtmp) && canspotmon(mtmp))
                return true;
        }
    }
    return false;
}

// src/hack.c:1817 u_locomotion(), effective flight and form-specific movement.
export function u_locomotion(def) {
    const capitalize = def[0] === def[0].toUpperCase();
    return Levitation() ? (capitalize ? 'Float' : 'float')
        : Flying() ? (capitalize ? 'Fly' : 'fly')
        : locomotion(game.youmonst.data, def);
}

// src/hack.c:4399 check_capacity() — refuse an action when overloaded.
export async function check_capacity(str) {
    if (near_capacity() >= EXT_ENCUMBER) {
        if (str)
            await pline(str);
        else
            await You("can't do that while carrying so much stuff.");
        return 1;
    }
    return 0;
}

// src/hack.c:3051 overexertion() — the hunger tick an attack costs.
//
// gethungry() DRAWS, so this is the reason attacking a monster spends more
// from the stream than stepping onto an empty square does.
export async function overexertion() {
    await gethungry();
    if ((game.moves % 3) !== 0 && near_capacity() >= HVY_ENCUMBER)
        note_unported_hack('overexertion:overexert_hp');
    return game.multi < 0; /* might have fainted */
}


// src/hack.c:3788 pickup_checks() — everything that can stop a pickup before
// it starts. Returns 0 or 1 to mean "handled, that many moves", -2 to loot an
// engulfer's inventory, and -1 for "go ahead and pick up".
//
// Draws nothing; every arm is a message.
export async function pickup_checks() {
    if (game.u.uswallow) {
        if (!game.u.ustuck.minvent?.length) {
            if (digests(game.u.ustuck.data)) {
                await You(`pick up ${s_suffix(mon_nam(game.u.ustuck))} tongue.`);
                await pline("But it's kind of slimy, so you drop it.");
            } else {
                await You(`don't ${Blind() ? 'feel' : 'see'} anything in here to pick up.`);
            }
            return 1;
        }
        return -2;
    }
    if (is_pool(game.u.ux, game.u.uy)) {
        if (Wwalking() || is_floater(game.youmonst.data) || is_clinger(game.youmonst.data)
            || (Flying() && !Breathless())) {
            await You(`cannot dive into the ${hliquid('water')} to pick things up.`);
            return 0;
        } else if (!Underwater()) {
            await You_cant('even see the bottom, let alone pick up something.');
            return 0;
        }
    }
    if (is_lava(game.u.ux, game.u.uy)) {
        if (Wwalking() || is_floater(game.youmonst.data) || is_clinger(game.youmonst.data)
            || (Flying() && !Breathless())) {
            await You_cant('reach the bottom to pick things up.');
            return 0;
        } else if (!likes_lava(game.youmonst.data)) {
            await You('would burn to a crisp trying to pick things up.');
            return 0;
        }
    }
    if (!OBJ_AT(game.u.ux, game.u.uy)) {
        const lev = game.level?.at(game.u.ux, game.u.uy);
        /* src/hack.c:3830 — one line per furniture kind, else the plain
           "nothing here". These return a PROMISE the async caller awaits. */
        if (!lev)
            return 0;
        if (lev.typ === THRONE)
            await pline(`It must weigh${lev.looted ? ' almost' : ''} a ton!`);
        else if (lev.typ === SINK)
            await pline_The('plumbing connects it to the floor.');
        else if (lev.typ === GRAVE)
            await You("don't need a gravestone.  Yet.");
        else if (lev.typ === FOUNTAIN)
            await You(`could drink the ${hliquid('water')}...`);
        else if (IS_DOOR(lev.typ) && (lev.doormask & D_ISOPEN))
            await pline("It won't come off the hinges.");
        else if (lev.typ === ALTAR)
            await pline('Moving the altar would be a very bad idea.');
        else if (lev.typ === STAIRS)
            await pline_The('stairs are solidly affixed.');
        else
            await There('is nothing here to pick up.');
        return 0;
    }
    const traphere = t_at(game.u.ux, game.u.uy);
    if (!can_reach_floor(!!(traphere && is_pit(traphere.ttyp)))) {
        if (traphere && uteetering_at_seen_pit(traphere)) {
            await You('cannot reach the bottom of the pit.');
        } else if (game.u.usteed && P_SKILL(P_RIDING) < P_BASIC) {
            await rider_cant_reach();
        } else if (Blind()) {
            await You('cannot reach anything here.');
        } else {
            let surf = surface(game.u.ux, game.u.uy);
            if (traphere?.ttyp === HOLE)
                surf = 'edge of the hole';
            else if (traphere?.ttyp === TRAPDOOR)
                surf = 'trap door';
            await You(`cannot reach the ${surf}.`);
        }
        return 0;
    }
    return -1; /* can do normal pickup */
}

// src/hack.c:3876 dopickup() — the ',' command.
export async function dopickup() {
    const count = game.command_count | 0;
    game.multi = 0; /* always reset */

    const ret = await pickup_checks();
    if (ret >= 0)
        return ret ? ECMD_TIME : ECMD_OK;
    if (ret === -2) {
        return await loot_mon(game.u.ustuck, { v: -count }, null) ? ECMD_TIME : ECMD_OK;
    }
    /* else ret == -1 */
    return (await pickup(-count)) ? ECMD_TIME : ECMD_OK;
}

// src/hack.c:4496 inv_cnt() — number of carried items, gold optional.
export function inv_cnt(incl_gold) {
    let ct = 0;
    for (const otmp of game.invent || [])
        if (incl_gold || otmp.invlet !== GOLD_SYM)
            ct++;
    return ct;
}

// src/hack.c:4551 rounddiv() — divide and round to nearest, sign-aware.
export function rounddiv(x, y) {
    let divsgn = 1;

    /* C panics on y == 0 */
    if (y < 0) {
        divsgn = -divsgn;
        y = -y;
    }
    if (x < 0) {
        divsgn = -divsgn;
        x = -x;
    }
    let r = Math.trunc(x / y);
    const m = x % y;
    if (2 * m >= y)
        r++;

    return divsgn * r;
}


// src/hack.c:1550 trapmove() — the hero is stuck in a trap and tries to
// move: TRUE means the move may proceed, FALSE means the struggle consumed
// it. The bear-trap and pit arms are live; web's Sting shortcut, lava,
// in-floor and buried-ball need subsystems that are recorded at the exact
// C position.
export async function trapmove(x, y, desttrap) {
    if (!game.u.utrap)
        return true; /* sanity check */

    switch (game.u.utraptype) {
    case TT_BEARTRAP:
        if (game.flags?.verbose !== false) {
            await Norep('You are caught in a bear trap.');
        }
        /* [why does diagonal movement give quickest escape?] */
        if ((game.u.dx && game.u.dy) || !rn2(5))
            game.u.utrap--;
        if (!game.u.utrap) {
            await You('finally wriggle free.');
        }
        break;
    case TT_PIT: {
        const { is_pit_ttyp, climb_pit } = await import('./trap.js');
        if (desttrap && desttrap.tseen && is_pit_ttyp(desttrap.ttyp))
            return true; /* move into adjacent pit */
        /* try to escape; position stays same regardless of success */
        await climb_pit();
        break;
    }
    case TT_WEB:
        /* u_wield_art(ART_STING) cuts free; no artifact exists yet */
        if (--game.u.utrap) {
            if (game.flags?.verbose !== false)
                await Norep('You are stuck to the web.');
        } else {
            await You('disentangle yourself.');
        }
        break;
    case TT_LAVA:
        if (game.flags?.verbose !== false)
            await Norep('You are stuck in the lava.');
        if (!is_lava(x, y)) {
            game.u.utrap--;
            if ((game.u.utrap & 0xff) === 0) {
                game.u.utrap = 0;
                await You(`pull yourself to the edge of the ${
                    hliquid('lava')}.`);
            }
        }
        game.u.umoved = true;
        break;
    case TT_INFLOOR:
    case TT_BURIEDBALL:
        (game.unported ||= new Set()).add('trapmove:' + game.u.utraptype);
        break;
    default:
        break;
    }
    return false;
}

/* ---- boulder pushing: src/hack.c:166-645 ---- */

const The = (s) => upstart(the(s));

// src/hack.c:166 dopush() — the boulder actually moves.
async function dopush(sx, sy, rx, ry, otmp, costly) {
    /* give boulder pushing feedback if this is a different boulder than
       the last one pushed or if it's been at least 2 turns since we last
       pushed this boulder */
    if (otmp.o_id !== game.bldrpush_oid) {
        game.bldrpushtime = (game.moves | 0) + 1;
        game.bldrpush_oid = otmp.o_id;
    }
    const givemesg = (game.moves > game.bldrpushtime + 2
                      || game.moves < game.bldrpushtime);
    const what = givemesg ? the(xname(otmp)) : null;
    if (!game.u.usteed) {
        const easypush = throws_rocks(game.youmonst.data);
        if (givemesg)
            await pline(`With ${easypush ? 'little' : 'great'} effort you move ${what}.`);
        if (!easypush)
            exercise(A_STR, true);
    } else {
        if (givemesg)
            await pline(`${YMonnam(game.u.usteed)} moves ${what}.`);
    }
    game.bldrpushtime = game.moves | 0;

    /* Move the boulder *after* the message. */
    otmp.next_boulder = 0;
    /* movobj(): remove + place + newsym both squares. place_object() is
       what re-blocks vision at the boulder's new square; skipping it let
       the hero see straight into the room the boulder was pushed toward. */
    const osx = otmp.ox, osy = otmp.oy;
    obj_extract_self(otmp);
    newsym(osx, osy);
    /* A successful push proves that no invisible monster remains at the
       destination. Clear a stale marker before the boulder is mapped there. */
    unmap_invisible(rx, ry);
    place_object(otmp, rx, ry);
    newsym(rx, ry);
    /* the shop-bill adjustments need billing; costly is false until then */
    if (costly)
        note_unported_hack('dopush:shop_bill');
}

// src/hack.c:247 cannot_push_msg()
async function cannot_push_msg(otmp, sx, sy) {
    const what = the(xname(otmp));
    if (game.u.usteed)
        await pline(`${YMonnam(game.u.usteed)} tries to move ${what}, but cannot.`);
    else
        await You(`try to move ${what}, but in vain.`);
    if (game.u.ublind)
        await feel_location(sx, sy);
}

// src/hack.c:262 cannot_push() — climbing over is a polyd-giant option;
// an ordinary hero just fails.
async function cannot_push(otmp, sx, sy) {
    if (throws_rocks(game.youmonst.data)) {
        note_unported_hack('cannot_push:giant_climb');
        return 0;
    }
    return -1;
}

// src/hack.c:327 moverock_done()
function moverock_done(sx, sy) {
    for (const otmp of (game.level?.objects || []))
        if (otmp.ox === sx && otmp.oy === sy && otmp.otyp === ONAMES.BOULDER)
            otmp.next_boulder = 0; /* resume normal xname() */
}

// src/hack.c:336 moverock()
export async function moverock() {
    const sx = game.u.ux + game.u.dx, sy = game.u.uy + game.u.dy;
    const ret = await moverock_core(sx, sy);
    moverock_done(sx, sy);
    return ret;
}

// src/hack.c:348 moverock_core() — push every boulder on <sx,sy>.
async function moverock_core(sx, sy) {
    let firstboulder = true;
    let otmp;

    while ((otmp = sobj_at(ONAMES.BOULDER, sx, sy)) != null) {
        /* Blind "That feels like a boulder." arm needs remembered-glyph
           bookkeeping; recorded until a blind hero pushes one */
        if (game.u.ublind)
            note_unported_hack('moverock:blind_feel');

        otmp.next_boulder = firstboulder ? 0 : 1;
        firstboulder = false;

        /* make sure that this boulder is visible as the top object */
        if (game.level.objects[0] !== otmp) {
            const i = game.level.objects.indexOf(otmp);
            if (i > 0) {
                game.level.objects.splice(i, 1);
                game.level.objects.unshift(otmp);
            }
            newsym(sx, sy);
        }

        const rx = game.u.ux + 2 * game.u.dx; /* boulder destination */
        const ry = game.u.uy + 2 * game.u.dy;
        nomul(0);

        /* m<dir> toward an adjacent boulder: squeeze or refuse */
        if (game.context.nopick) {
            await feel_location(sx, sy);
            if (throws_rocks(game.youmonst.data)) {
                note_unported_hack('moverock:nopick_giant');
                return 0;
            } else if (could_move_onto_boulder(sx, sy)) {
                await You(`squeeze yourself ${
                    game.u.uprops?.FLYING ? 'over' : 'against'} the boulder.`);
                return 0;
            } else {
                await There('is a boulder in your way.');
                return -1;
            }
        }
        if (game.u.uprops?.LEVITATION) {
            await You(`don't have enough leverage to push ${the(xname(otmp))}.`);
            /* Give them a chance to climb over it? */
            return -1;
        }
        /* verysmall(youmonst.data) cannot fire un-polymorphed */

        const dest = isok(rx, ry) ? game.level.at(rx, ry) : null;
        if (dest && !IS_OBSTRUCTED(dest.typ)
            && dest.typ !== IRONBARS
            && (!IS_DOOR(dest.typ) || !(game.u.dx && game.u.dy)
                || doorless_door(rx, ry))
            && !sobj_at(ONAMES.BOULDER, rx, ry)) {
            const ttmp = t_at(rx, ry);
            const mtmp = m_at(rx, ry);
            const costly = costly_spot(sx, sy); /* shop_keeper gate inside */

            /* KMH -- Sokoban doesn't let you push boulders diagonally */
            if (In_sokoban(game.u.uz) && game.u.dx && game.u.dy) {
                await pline(`${The(xname(otmp))} won't roll diagonally on this floor.`);
                return cannot_push(otmp, sx, sy);
            }

            /* revive_nasty: buried Rider corpses only; nothing buries them */

            if (mtmp && !noncorporeal(game.mons[mtmp.mnum])
                && (!mtmp.mtrapped
                    || !(ttmp && is_pit(ttmp.ttyp)))) {
                let deliver_part1 = false;
                if (canspotmon(mtmp)) {
                    await pline(`There's ${a_monnam(mtmp)} on the other side.`);
                    deliver_part1 = true;
                } else {
                    await You_hear(`a monster behind ${the(xname(otmp))}.`);
                    if (!Deaf())
                        deliver_part1 = true;
                    map_invisible(rx, ry);
                }
                if (game.flags?.verbose !== false) {
                    const you_or_steed = game.u.usteed
                        ? 'it' /* y_monnam(usteed): no steed here yet */
                        : 'you';
                    await pline(`${deliver_part1 ? "Perhaps that's why " : ''}${
                        deliver_part1 ? you_or_steed
                                      : upstart(you_or_steed)} cannot move ${
                        deliver_part1 ? 'it' : the(xname(otmp))}.`);
                }
                return cannot_push(otmp, sx, sy);
            }

            if (closed_door(rx, ry)) {
                await cannot_push_msg(otmp, sx, sy);
                return cannot_push(otmp, sx, sy);
            }

            disturb_buried_zombies(sx, sy);

            if (ttmp) {
                switch (ttmp.ttyp) {
                case LANDMINE:
                case SPIKED_PIT:
                case PIT:
                case HOLE:
                case TRAPDOOR:
                case LEVEL_TELEP:
                case TELEP_TRAP:
                case ROLLING_BOULDER_TRAP:
                    /* the trap-operates-on-boulder arms (landmine rn2(10),
                       pit fill, hole plug, teleport) sit on machinery that
                       has its own draws; record which trap so the gap is
                       visible per type */
                    note_unported_hack(`moverock:trap=${ttmp.ttyp}`);
                    return -1;
                default:
                    break; /* boulder not affected by this trap */
                }
            }

            if (is_pool_or_lava(rx, ry)) {
                const { boulder_hits_pool } = await import('./do.js');
                if (await boulder_hits_pool(otmp, rx, ry, true))
                    continue;
            }

            await dopush(sx, sy, rx, ry, otmp, costly);
        } else {
            await cannot_push_msg(otmp, sx, sy);
            return cannot_push(otmp, sx, sy);
        }
    }
    return 0;
}

/* include/hack.h TRAVP_* — findtravelpath modes */
export const TRAVP_TRAVEL = 0, TRAVP_GUESS = 1, TRAVP_VALID = 2;

// src/hack.c:1526 is_valid_travelpt(): can travel's pathfinder reach this
// map square? Unseen stone is rejected before the path search.
export async function is_valid_travelpt(x, y) {
    const u = game.u;
    if (u_at(x, y))
        return true;

    const glyph = glyph_at(x, y);
    const loc = game.level?.at(x, y);
    if (isok(x, y)
        && (glyph?.kind === 'unexplored'
            || (glyph?.kind === 'cmap'
                && glyph.cmap === cmap_names.S_stone))
        && !loc?.seenv)
        return false;

    const tx = u.tx, ty = u.ty;
    u.tx = x;
    u.ty = y;
    const result = await findtravelpath(TRAVP_VALID);
    u.tx = tx;
    u.ty = ty;
    return result;
}

// src/hack.c:4079 crawl_destination() — is <x,y> a spot the hero could
// crawl to (used for the travel-to-adjacent shortcut)?
export async function crawl_destination(x, y) {
    const { goodpos } = await import('./makemon.js');
    if (!goodpos(x, y, game.youmonst, 0))
        return false;
    if (x === game.u.ux || y === game.u.uy)
        return true;
    /* NODIAG: poly'd into a grid bug — polyself absent */
    if (Passes_walls())
        return true;
    const loc = game.level.at(x, y);
    if (IS_DOOR(loc.typ) && (!doorless_door(x, y) || _shk_block_door(x, y)))
        return false;
    return !(bad_rock(game.youmonst.data, game.u.ux, y)
             && bad_rock(game.youmonst.data, x, game.u.uy)
             && cant_squeeze_thru(game.youmonst));
}

function _shk_block_door(x, y) {
    /* shk.js block_door needs shop state; false when no shops exist */
    return false;
}

// src/hack.c:1266 findtravelpath() — pick u.dx/u.dy for the next travel
// step: a breadth-first flood from the destination back to the hero over
// squares the hero has seen (TEST_TRAV), preferring paths without closed
// doors, boulders or seen traps. Draws nothing.
export async function findtravelpath(mode) {
    const u = game.u;
    (game.travelmap ||= new Set());

    /* if travel to adjacent, reachable location, use normal movement rules */
    if ((mode === TRAVP_TRAVEL || mode === TRAVP_VALID) && game.context.travel1
        && (Math.abs(u.tx - u.ux) <= 1 && Math.abs(u.ty - u.uy) <= 1
            && !(u.tx === u.ux && u.ty === u.uy)) /* next2u */
        && await crawl_destination(u.tx, u.ty)) {
        end_running_hack(false);
        if (await test_move(u.ux, u.uy, u.tx - u.ux, u.ty - u.uy, TEST_MOVE)) {
            if (mode === TRAVP_TRAVEL) {
                u.dx = u.tx - u.ux;
                u.dy = u.ty - u.uy;
                nomul(0);
                game.iflags.travelcc = { x: 0, y: 0 };
            }
            return true;
        }
        if (mode === TRAVP_TRAVEL)
            game.context.run = 8;
    }
    if (u.tx !== u.ux || u.ty !== u.uy) {
        const travel = Array.from({ length: COLNO },
                                  () => new Array(ROWNO).fill(0));
        let travelstep = [[], []];
        let n = 1, set = 0, radius = 1;
        let tx, ty, ux, uy;

        if (mode === TRAVP_GUESS || mode === TRAVP_VALID) {
            tx = u.ux; ty = u.uy; ux = u.tx; uy = u.ty;
        } else {
            tx = u.tx; ty = u.ty; ux = u.ux; uy = u.uy;
        }

        for (;;) { /* noguess: */
            for (const col of travel) col.fill(0);
            travelstep = [[{ x: tx, y: ty }], []];
            n = 1; set = 0; radius = 1;

            while (n !== 0) {
                let nn = 0;
                travelstep[1 - set] = [];
                for (let i = 0; i < n; i++) {
                    const x = travelstep[set][i].x, y = travelstep[set][i].y;
                    const dirmax = N_DIRS; /* NODIAG needs polyself */
                    let alreadyrepeated = false;

                    for (let dir = 0; dir < dirmax; ++dir) {
                        const nx = x + xdir[dirs_ord_hack[dir]];
                        const ny = y + ydir[dirs_ord_hack[dir]];

                        if (!isok(nx, ny)
                            || (mode === TRAVP_GUESS && !couldsee(nx, ny)))
                            continue;
                        if ((!Passes_walls()
                             && closed_door_hack(x, y))
                            || (sobj_at(ONAMES.BOULDER, x, y)
                                && !could_move_onto_boulder(x, y))
                            || await test_move(x, y, nx - x, ny - y,
                                               TEST_TRAP)) {
                            /* closed doors and boulders usually cause a
                               delay, so prefer another path */
                            if (travel[x][y] > radius - 3) {
                                if (!alreadyrepeated) {
                                    travelstep[1 - set].push({ x, y });
                                    nn++;
                                    alreadyrepeated = true;
                                }
                                continue;
                            }
                        }
                        const nloc = game.level.at(nx, ny);
                        if (await test_move(x, y, nx - x, ny - y, TEST_TRAV)
                            && (nloc.seenv
                                || (!game.u.ublind && couldsee(nx, ny)))) {
                            if (nx === ux && ny === uy) {
                                if (mode === TRAVP_TRAVEL
                                    || mode === TRAVP_VALID) {
                                    /* selvar.c:168 selection_getpoint
                                       returns 0 for a null selection: nomul
                                       (via mattacku etc.) can free the map
                                       mid-search, exactly as in C */
                                    const visited = game.travelmap
                                        ?.has(`${x},${y}`) ?? false;
                                    u.dx = x - ux;
                                    u.dy = y - uy;
                                    if (mode === TRAVP_TRAVEL
                                        && ((x === u.tx && y === u.ty)
                                            || visited)) {
                                        nomul(0);
                                        /* reset run so domove run checks
                                           work */
                                        game.context.run = 8;
                                        if (visited)
                                            await You('stop, unsure which way to go.');
                                        else
                                            game.iflags.travelcc = { x: 0, y: 0 };
                                    }
                                    /* selvar.c:181 selection_setpoint is
                                       a no-op for a null selection */
                                    game.travelmap?.add(`${u.ux},${u.uy}`);
                                    return true;
                                }
                            } else if (!travel[nx][ny]) {
                                travelstep[1 - set].push({ x: nx, y: ny });
                                travel[nx][ny] = radius;
                                nn++;
                            }
                        }
                    }
                }
                n = nn;
                set = 1 - set;
                radius++;
            }

            /* if guessing, find best location in travel matrix, go there */
            if (mode === TRAVP_GUESS) {
                let px = tx, py = ty;
                let dist = distmin(ux, uy, tx, ty);
                let d2 = dist2(ux, uy, tx, ty);
                let ptrav = COLNO * ROWNO;
                for (let sx = 1; sx < COLNO; ++sx)
                    for (let sy = 0; sy < ROWNO; ++sy) {
                        const ctrav = travel[sx][sy];
                        if (couldsee(sx, sy) && ctrav > 0) {
                            const nxtdist = distmin(ux, uy, sx, sy);
                            if (nxtdist === dist && ctrav < ptrav) {
                                const nd2 = dist2(ux, uy, sx, sy);
                                if (nd2 < d2) {
                                    px = sx; py = sy; d2 = nd2;
                                    ptrav = ctrav;
                                }
                            } else if (nxtdist < dist) {
                                px = sx; py = sy; dist = nxtdist;
                                d2 = dist2(ux, uy, sx, sy);
                                ptrav = ctrav;
                            }
                        }
                    }

                if (px === u.ux && py === u.uy) {
                    /* no guesses, just go in the general direction */
                    u.dx = Math.sign(u.tx - u.ux);
                    u.dy = Math.sign(u.ty - u.uy);
                    if (await test_move(u.ux, u.uy, u.dx, u.dy, TEST_MOVE)) {
                        /* selvar.c:181 — no-op when the map was freed */
                        game.travelmap?.add(`${u.ux},${u.uy}`);
                        return true;
                    }
                    break; /* goto found */
                }
                tx = px; ty = py; ux = u.ux; uy = u.uy;
                mode = TRAVP_TRAVEL;
                continue; /* goto noguess */
            }
            return false;
        }
    }

    /* found: */
    u.dx = 0;
    u.dy = 0;
    nomul(0);
    return false;
}

/* src/decl.c:81 dirs_ord[] — reordered directions, cardinals first */
const dirs_ord_hack = [DIR_W, DIR_N, DIR_E, DIR_S,
                       DIR_NW, DIR_NE, DIR_SE, DIR_SW];

/* include/rm.h closed_door() — local twin (cmd.js has one too) */
function closed_door_hack(x, y) {
    const loc = game.level?.at(x, y);
    return !!(loc && IS_DOOR(loc.typ)
              && (loc.doormask & (D_CLOSED | D_LOCKED)));
}

/* src/hack.c end_running(FALSE) — the flag-clearing half */
function end_running_hack(and_travel) {
    game.context.run = 0;
    if (and_travel) {
        game.context.travel = game.context.travel1 = 0;
        game.context.mv = 0;
    }
}

// src/hack.c:3178 switch_terrain(); when the hero's location changes to or
// from solid rock, levitation and flight are blocked or restored
export async function switch_terrain() {
    const u = game.u;
    const lev = game.level.at(u.ux, u.uy);
    const blocklev = (IS_OBSTRUCTED(lev.typ) || closed_door(u.ux, u.uy)
                      || IS_WATERWALL(lev.typ)
                      || lev.typ === LAVAWALL),
          was_levitating = !!Levitation(), was_flying = !!Flying();
    const blocked = (u.blocked ||= {});

    if (blocklev) {
        /* called from spoteffects(), stop levitating but skip float_down() */
        if (Levitation())
            await You_cant('levitate in here.');
        blocked.LEVITATION = (blocked.LEVITATION | 0) | FROMOUTSIDE;
    } else if (blocked.LEVITATION) {
        blocked.LEVITATION = (blocked.LEVITATION | 0) & ~FROMOUTSIDE;
        /* we're probably levitating now; if not, we're probably trapped
           to a buried iron ball so get float_up() feedback for that */
        if (Levitation() || blocked.LEVITATION)
            await float_up();
    }
    /* the same terrain that blocks levitation also blocks flight */
    if (blocklev) {
        if (Flying())
            await You_cant('fly in here.');
        blocked.FLYING = (blocked.FLYING | 0) | FROMOUTSIDE;
    } else if (blocked.FLYING) {
        blocked.FLYING = (blocked.FLYING | 0) & ~FROMOUTSIDE;
        float_vs_flight(); /* maybe toggle (BFlying & I_SPECIAL) */
        /* [minor bug: we don't know whether this is beginning flight or
           resuming it; that could be tracked so that this message could
           be adjusted to "resume flying", but isn't worth the effort...] */
        if (Flying())
            await You('start flying.');
    }
    if ((!!Levitation() ^ was_levitating) || (!!Flying() ^ was_flying))
        (game.disp ||= {}).botl = true; /* update Lev/Fly status condition */
    /* if (flags.terrainstatus) classify_terrain(): the terrain status
       condition is a windowport status-hilite feature */
}

// src/hack.c:4525 spot_checks(); a location's terrain changed; anything
// which depends on the old type needs to be cleaned up
export function spot_checks(x, y, old_typ) {
    const new_typ = game.level.at(x, y).typ;
    let db_ice_now = false;

    switch (old_typ) {
    case DRAWBRIDGE_UP:
        db_ice_now = ((game.level.at(x, y).drawbridgemask & DB_UNDER) === DB_ICE);
        /* FALLTHROUGH */
    case ICE:
        if ((new_typ !== old_typ)
            || (old_typ === DRAWBRIDGE_UP && !db_ice_now)) {
            /* make sure there's no MELT_ICE_AWAY timer */
            if (spot_time_left(x, y, MELT_ICE_AWAY)) {
                spot_stop_timers(x, y, MELT_ICE_AWAY);
            }
            /* adjust things affected by the ice */
            obj_ice_effects(x, y, false);
        }
        break;
    }
}

// src/hack.c:3221 set_uinwater(); besides the flag, entering or leaving
// water re-evaluates the terrain-derived properties
export async function set_uinwater(in_out) {
    if ((in_out ? 1 : 0) !== (game.u.uinwater ? 1 : 0)) {
        game.u.uinwater = in_out ? 1 : 0;
        await switch_terrain();
    }
}

// src/hack.c:105 revive_nasty(); a Rider's or the Wizard's corpse at <x,y>
// revives when something tries to cover it; returns true if one did
export async function revive_nasty(x, y, msg) {
    let mtmp;
    const cc = { x: 0, y: 0 };
    let revived = false;

    for (const otmp of (game.level?.objects || []).filter(
             (o) => o.ox === x && o.oy === y)) {
        if (otmp.otyp === ONAMES.CORPSE
            && (is_rider(game.mons[otmp.corpsenm])
                || otmp.corpsenm === PMNAMES.PM_WIZARD_OF_YENDOR)) {
            /* move any living monster already at that location */
            if ((mtmp = m_at(x, y)) && enexto(cc, x, y, mtmp.data))
                await rloc_to(mtmp, cc.x, cc.y);
            if (msg)
                await Norep(msg);
            revived = await revive_corpse(otmp);
        }
    }

    /* this location might not be safe, if not, move revived monster */
    if (revived) {
        mtmp = m_at(x, y);
        if (mtmp && !goodpos(x, y, mtmp, 0)
            && enexto(cc, x, y, mtmp.data)) {
            await rloc_to(mtmp, cc.x, cc.y);
        }
        /* else impossible? */
    }

    return revived;
}
