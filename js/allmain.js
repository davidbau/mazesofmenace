// allmain.js -- Main game loop: early_init, moveloop, newgame, welcome
// cf. allmain.c — early_init, moveloop_preamble, u_calc_moveamt, moveloop_core,
//                 maybe_do_tutorial, moveloop, regen_pw, regen_hp,
//                 stop_occupation, init_sound_disp_gamewindows, newgame,
//                 welcome, do_positionbar, interrupt_multi, argcheck,
//                 debug_fields, timet_to_seconds, timet_delta,
//                 dump_enums, dump_glyphids, harness_dump_checkpoint,
//                 json_write_escaped
//
// allmain.c is the main game orchestration module:
//   early_init(): startup before anything else (crash handlers, globals).
//   moveloop(): outer loop calling moveloop_core() repeatedly.
//   moveloop_core(): one full game turn — monster moves, hero regeneration,
//     occupation, autopickup, timeout processing.
//   newgame(): full new-game setup (role selection, dungeon gen, startup).
//   welcome(): display character description at game start or restore.

import { movemon, settrack } from './monmove.js';
import { savebones } from './bones.js';
import { setCurrentTurn, nh_timeout } from './timeout.js';
import { setOutputContext } from './pline.js';
import { setObjectMoves } from './mkobj.js';
import { runtimeDecideToShapeshift, makemon, setMakemonPlayerContext } from './makemon.js';
import { M2_WERE } from './monsters.js';
import { were_change } from './were.js';
import { allocateMonsterMovement } from './mon.js';
import { rn2, rnd, rn1 } from './rng.js';
import { NORMAL_SPEED, A_STR, A_DEX, A_CON, ROOMOFFSET, SHOPBASE } from './config.js';
import { ageSpells } from './spell.js';
import { wipe_engr_at } from './engrave.js';
import { dosearch0 } from './detect.js';
import { exercise, exerchk } from './attrib_exercise.js';

// cf. allmain.c:169 — moveloop_core() monster movement + turn-end processing.
// Called after the hero's action took time.  Runs movemon() for monster turns,
// then moveloop_turnend() for once-per-turn effects.
// opts.skipMonsterMove: skip movemon (used by some test harnesses)
// opts.computeFov: recompute FOV before movemon (C ref: vision_recalc runs in domove)
export function moveloop_core(game, opts = {}) {
    if (opts.computeFov) {
        game.fov.compute(game.map, game.player.x, game.player.y);
    }
    if (!opts.skipMonsterMove) {
        movemon(game.map, game.player, game.display, game.fov, game);
    }
    moveloop_turnend(game);
    // C ref: allmain.c end of moveloop_core — check for player death
    if (game.player.isDead || game.player.hp <= 0) {
        if (!game.player.deathCause) {
            game.player.deathCause = 'died';
        }
        game.gameOver = true;
        game.gameOverReason = 'killed';
        if (typeof savebones === 'function') {
            savebones(game);
        }
    }
}

// cf. allmain.c:169 — moveloop_core() turn-end block
// Unified from processTurnEnd (nethack.js) and simulateTurnEnd (headless_runtime.js).
// Called once per real turn, after hero and monsters have moved.
// game must provide: player, map, display, fov, multi, turnCount, seerTurn,
//                    _bonusMovement, flags, travelPath, runMode
export function moveloop_turnend(game) {
    // C ref: allmain.c moveloop_core() — the turn-end block only runs when both
    // hero and monsters are out of movement.  When Fast/Very Fast grants
    // extra movement, the hero acts again WITHOUT a new turn-end.
    if (game._bonusMovement > 0) {
        game._bonusMovement--;
        return;
    }

    // C ref: allmain.c:239 — settrack() called after movemon, before moves++
    settrack(game.player);
    game.turnCount++;
    game.player.turns = game.turnCount;
    setCurrentTurn(game.turnCount);
    setOutputContext(game.display);
    nh_timeout({
        player: game.player,
        map: game.map,
        display: game.display,
    });
    // C ref: allmain.c -- random spawn happens before svm.moves++.
    // During this turn-end frame, mkobj-side erosion checks should
    // still observe the pre-increment move count.
    setObjectMoves(game.turnCount);

    // Minimal C-faithful wounded-legs timer (set_wounded_legs): while active,
    // DEX stays penalized; recover when timeout expires.
    if ((game.player.woundedLegsTimeout || 0) > 0) {
        game.player.woundedLegsTimeout--;
        if (game.player.woundedLegsTimeout <= 0 && game.player.attributes) {
            game.player.woundedLegsTimeout = 0;
            game.player.attributes[A_DEX] = Math.min(25, game.player.attributes[A_DEX] + 1);
            game.player.justHealedLegs = true;
        }
    }

    // C ref: mon.c m_calcdistress() — temporary flee timeout handling.
    for (const mon of game.map.monsters) {
        if (mon.dead) continue;
        if (mon.fleetim && mon.fleetim > 0) {
            mon.fleetim--;
            if (mon.fleetim <= 0) {
                mon.fleetim = 0;
                mon.flee = false;
            }
        }
    }

    // C ref: mon.c m_calcdistress() shapechange + lycanthropy pass.
    for (const mon of game.map.monsters) {
        if (mon.dead) continue;
        runtimeDecideToShapeshift(mon, game.player.dungeonLevel);
        if (mon.type && (mon.type.flags2 & M2_WERE)) {
            were_change(mon, {
                player: game.player,
                map: game.map,
                fov: game.fov,
                display: game.display,
            });
        }
    }

    // C ref: allmain.c:226-227 — reallocate movement to monsters via mcalcmove
    allocateMonsterMovement(game.map);

    // C ref: allmain.c:232-236 — occasionally spawn a new monster.
    // New monster spawns after movement allocation and therefore loses its first turn.
    if (!rn2(70) && !(game.map?.flags?.nomongen) && !(game.map?.flags?.is_tutorial)) {
        setMakemonPlayerContext(game.player);
        makemon(null, 0, 0, 0, game.player.dungeonLevel, game.map);
    }

    // C ref: allmain.c:238 u_calc_moveamt(wtcap) — player movement allocation.
    // Fast intrinsic (monks, samurai): gain extra turn 1/3 of the time via rn2(3).
    // Very Fast (speed boots + intrinsic): gain extra turn 2/3 of the time.
    if (game.player.veryFast) {
        if (rn2(3) !== 0) {
            game._bonusMovement = (game._bonusMovement || 0) + 1;
        }
    } else if (game.player.fast) {
        if (rn2(3) === 0) {
            game._bonusMovement = (game._bonusMovement || 0) + 1;
        }
    }

    // C ref: allmain.c:289-295 regen_hp()
    let reachedFullHealth = false;
    if (game.player.hp < game.player.hpmax) {
        const con = game.player.attributes ? game.player.attributes[A_CON] : 10;
        const heal = (game.player.level + con) > rn2(100) ? 1 : 0;
        if (heal) {
            game.player.hp = Math.min(game.player.hp + heal, game.player.hpmax);
            reachedFullHealth = (game.player.hp === game.player.hpmax);
        }
    }
    // C ref: allmain.c regen_hp() -> interrupt_multi("You are in full health.")
    if (reachedFullHealth
        && game.multi > 0
        && !game.travelPath?.length
        && !game.runMode) {
        game.multi = 0;
        if (game.flags?.verbose !== false) {
            game.display.putstr_message('You are in full health.');
        }
    }

    // C ref: allmain.c:341-343 — autosearch for players with Searching
    // intrinsic (Archeologists/Rangers at level 1, Rogues at 10, etc.)
    if (game.player.searching && game.multi >= 0) {
        dosearch0(game.player, game.map, game.display, game);
    }

    // C ref: allmain.c:351 dosounds() — ambient sounds
    moveloop_dosounds(game);

    // C ref: allmain.c:353 gethungry()
    // eat.c:3186 — rn2(20) for accessory hunger timing
    rn2(20);
    game.player.hunger--;
    if (game.player.hunger <= 0) {
        game.display.putstr_message('You faint from lack of food.');
        game.player.hunger = 1;
        game.player.hp -= rnd(3);
        if (game.player.hp <= 0) {
            game.player.deathCause = 'starvation';
        }
    }
    if (game.player.hunger === 150) {
        game.display.putstr_message('You are beginning to feel weak.');
    }
    if (game.player.hunger === 300) {
        game.display.putstr_message('You are beginning to feel hungry.');
    }

    // C ref: allmain.c:354 age_spells() — decrement spell retention each turn
    ageSpells(game.player);

    // C ref: attrib.c exerper() — periodic exercise updates.
    // C's svm.moves starts at 1 and increments before exerper/exerchk.
    const moves = game.turnCount + 1;
    if (moves % 10 === 0) {
        // C ref: attrib.c exerper() hunger switch
        if (game.player.hunger > 1000) {
            exercise(game.player, A_DEX, false);
        } else if (game.player.hunger > 150) {
            exercise(game.player, A_CON, true);
        } else if (game.player.hunger > 50) { // HUNGRY
            // no exercise
        } else if (game.player.hunger > 0) {
            exercise(game.player, A_STR, false);
        } else {
            exercise(game.player, A_CON, false);
        }
        // C ref: attrib.c exerper() role/behavioral hooks.
        if (game.player.restingTurn) {
            exercise(game.player, A_STR, true);
        }
    }
    if (moves % 5 === 0 && (game.player.woundedLegsTimeout || 0) > 0) {
        exercise(game.player, A_DEX, false);
    }

    // C ref: attrib.c exerchk()
    exerchk(game.player, moves);

    // C ref: allmain.c:359 — engrave wipe check
    const dex = game.player.attributes ? game.player.attributes[A_DEX] : 14;
    if (!rn2(40 + dex * 3)) {
        // C ref: allmain.c:359-360 u_wipe_engr(rnd(3))
        wipe_engr_at(game.map, game.player.x, game.player.y, rnd(3), false);
    }

    // C ref: allmain.c:414 seer_turn check
    // C's svm.moves is +1 ahead of turnCount (same offset as exerchk)
    if (moves >= game.seerTurn) {
        game.seerTurn = moves + rn1(31, 15);
    }
    // After turn-end completes, subsequent command processing observes
    // the incremented move counter.
    setObjectMoves(game.turnCount + 1);
}

// C ref: sounds.c:202-339 dosounds() — ambient level sounds
// Each feature check uses short-circuit && so rn2() is only called
// when the feature exists. Fountains/sinks don't return early;
// all others return on a triggered sound.
export function moveloop_dosounds(game) {
    if (game.flags && game.flags.acoustics === false) return;
    const hallu = game.player?.hallucinating ? 1 : 0;
    const playerInShop = (() => {
        const loc = game.map?.at?.(game.player.x, game.player.y);
        if (!loc || !Number.isFinite(loc.roomno)) return false;
        const ridx = loc.roomno - ROOMOFFSET;
        const room = game.map?.rooms?.[ridx];
        return !!(room && Number.isFinite(room.rtype) && room.rtype >= SHOPBASE);
    })();
    const tendedShop = (game.map?.monsters || []).some((m) => m && !m.dead && m.isshk);
    const f = game.map.flags || {};
    if (f.nfountains && !rn2(400)) {
        const fountainMsg = [
            'You hear bubbling water.',
            'You hear water falling on coins.',
            'You hear the splashing of a naiad.',
            'You hear a soda fountain!',
        ];
        game.display.putstr_message(fountainMsg[rn2(3) + hallu]);
    }
    if (f.nsinks && !rn2(300)) {
        const sinkMsg = [
            'You hear a slow drip.',
            'You hear a gurgling noise.',
            'You hear dishes being washed!',
        ];
        game.display.putstr_message(sinkMsg[rn2(2) + hallu]);
    }
    if (f.has_court && !rn2(200)) { return; }
    if (f.has_swamp && !rn2(200)) {
        const swampMsg = [
            'You hear mosquitoes!',
            'You smell marsh gas!',
            'You hear Donald Duck!',
        ];
        game.display.putstr_message(swampMsg[rn2(2) + hallu]);
        return;
    }
    if (f.has_vault && !rn2(200)) {
        const vaultMsg = [
            'You hear the footsteps of a guard on patrol.',
            'You hear someone counting gold coins.',
            'You hear Ebenezer Scrooge!',
        ];
        game.display.putstr_message(vaultMsg[rn2(2) + hallu]);
        return;
    }
    if (f.has_beehive && !rn2(200)) { return; }
    if (f.has_morgue && !rn2(200)) { return; }
    if (f.has_barracks && !rn2(200)) {
        const barracksMsg = [
            'You hear blades being honed.',
            'You hear loud snoring.',
            'You hear dice being thrown.',
            'You hear General MacArthur!',
        ];
        game.display.putstr_message(barracksMsg[rn2(3) + hallu]);
        return;
    }
    if (f.has_zoo && !rn2(200)) { return; }
    if (f.has_shop && !rn2(200)) {
        if (tendedShop && !playerInShop) {
            const shopMsg = [
                'You hear someone cursing shoplifters.',
                'You hear the chime of a cash register.',
                'You hear Neiman and Marcus arguing!',
            ];
            game.display.putstr_message(shopMsg[rn2(2) + hallu]);
        }
        return;
    }
    if (f.has_temple && !rn2(200)) { return; }
}

// --- Remaining allmain.c stubs ---

// cf. allmain.c:155 [static] — json_write_escaped(fp, s): JSON-escape a string
// N/A: allmain.c:155 — json_write_escaped() (no file I/O in JS)

// cf. allmain.c:175 — harness_dump_checkpoint(phase): dump game state snapshot
// N/A: allmain.c:175 — harness_dump_checkpoint() (file I/O; JS harness uses oracle/)

// cf. allmain.c:36 — early_init(argc, argv): pre-game initialization
// TODO: allmain.c:36 — early_init(): pre-game initialization

// cf. allmain.c:50 [static] — moveloop_preamble(resuming): pre-loop setup
// TODO: allmain.c:50 — moveloop_preamble(): pre-loop setup

// cf. allmain.c:116 [static] — u_calc_moveamt(wtcap): hero movement amount
// TODO: allmain.c:116 — u_calc_moveamt(): movement speed calculation

// cf. allmain.c:566 [static] — maybe_do_tutorial(void): tutorial prompt
// TODO: allmain.c:566 — maybe_do_tutorial(): tutorial entry prompt

// cf. allmain.c:586 — moveloop(resuming): main game loop
// TODO: allmain.c:586 — moveloop(): main game loop

// cf. allmain.c:599 [static] — regen_pw(wtcap): power point regeneration
// TODO: allmain.c:599 — regen_pw(): power regeneration

// cf. allmain.c:621 [static] — regen_hp(wtcap): hit point regeneration
// TODO: allmain.c:621 — regen_hp(): hit point regeneration

// cf. allmain.c:680 — stop_occupation(void): halt multi-turn action
// TODO: allmain.c:680 — stop_occupation(): occupation halt

// cf. allmain.c:697 — init_sound_disp_gamewindows(void): init display/sound
// TODO: allmain.c:697 — init_sound_disp_gamewindows(): display initialization

// cf. allmain.c:764 — newgame(void): new game initialization
// TODO: allmain.c:764 — newgame(): new game setup

// cf. allmain.c:851 — welcome(new_game): display welcome message
// TODO: allmain.c:851 — welcome(): welcome message display

// cf. allmain.c:907 [static] — do_positionbar(void): update position bar
// TODO: allmain.c:907 — do_positionbar(): position bar update

// cf. allmain.c:950 [static] — interrupt_multi(msg): interrupt multi-turn action
// TODO: allmain.c:950 — interrupt_multi(): multi-turn interrupt

// cf. allmain.c:1001 — argcheck(argc, argv, e_arg): process early CLI args
// N/A: allmain.c:1001 — argcheck() (no command-line args in browser)

// cf. allmain.c:1124 [static] — debug_fields(opts): parse debug options
// N/A: allmain.c:1124 — debug_fields() (no CLI args in browser)

// cf. allmain.c:1173 — timet_to_seconds(ttim): time_t to seconds
// N/A: allmain.c:1173 — timet_to_seconds() (JS uses Date.now())

// cf. allmain.c:1182 — timet_delta(etim, stim): time difference
// N/A: allmain.c:1182 — timet_delta() (JS uses Date arithmetic)

// cf. allmain.c:1259 [static] — dump_enums(void): dump enumeration constants
// N/A: allmain.c:1259 — dump_enums() (build-time tool)

// cf. allmain.c:1356 — dump_glyphids(void): dump glyph identifier constants
// N/A: allmain.c:1356 — dump_glyphids() (build-time tool)
