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
import { rn2, rnd, rn1, initRng, getRngState, setRngState, getRngCallCount, setRngCallCount,
         enableRngLog, getRngLog as readRngLog, pushRngLogEntry } from './rng.js';
import { NORMAL_SPEED, A_DEX, A_CON, ROOMOFFSET, SHOPBASE,
         COLNO, ROWNO, A_NONE, A_LAWFUL, A_NEUTRAL, A_CHAOTIC,
         FEMALE, MALE, TERMINAL_COLS,
         RACE_HUMAN, RACE_ELF, RACE_DWARF, RACE_GNOME, RACE_ORC } from './config.js';
import { ageSpells } from './spell.js';
import { wipe_engr_at } from './engrave.js';
import { dosearch0 } from './detect.js';
import { maybe_finished_meal } from './eat.js';
import { exerper, exerchk } from './attrib_exercise.js';
import { rhack } from './cmd.js';
import { FOV } from './vision.js';
import { monsterNearby } from './monutil.js';
import { nomul, unmul } from './hack.js';
import { Player, roles, races } from './player.js';
import { makelevel, setGameSeed, isBranchLevelToDnum } from './dungeon.js';
import { getArrivalPosition, changeLevel as changeLevelCore, deferred_goto } from './do.js';
import { loadSave, deleteSave, loadFlags, saveFlags, deserializeRng,
         restGameState, restLev, listSavedData, clearAllData } from './storage.js';
import { buildEntry, saveScore, loadScores, formatTopTenEntry, formatTopTenHeader } from './topten.js';
import { startRecording } from './keylog.js';
import { nhgetch, getCount, setInputRuntime, cmdq_clear, cmdq_add_int, cmdq_add_key,
         cmdq_copy, cmdq_peek, cmdq_restore, setCmdqInputMode,
         setCmdqRepeatRecordMode,
         CQ_CANNED, CQ_REPEAT, CMDQ_INT, CMDQ_KEY } from './input.js';
import { init_nhwindows, NHW_MENU, MENU_BEHAVE_STANDARD, PICK_ONE, ATR_NONE,
         create_nhwindow, destroy_nhwindow, start_menu, add_menu, end_menu, select_menu } from './windows.js';
import { CLR_GRAY } from './display.js';
import { initFirstLevel } from './u_init.js';
import { movebubbles } from './mkmaze.js';
import { initAnimation, configureAnimation, setAnimationMode } from './animation.js';

// cf. allmain.c:169 — moveloop_core() monster movement + turn-end processing.
// Called after the hero's action took time.  Runs movemon() for monster turns,
// then moveloop_turnend() for once-per-turn effects.
// opts.skipMonsterMove: skip movemon (used by some test harnesses)
// opts.computeFov: recompute FOV before movemon (C ref: vision_recalc runs in domove)
// TRANSLATOR: AUTO
export async function moveloop_core(game, opts = {}) {
    const player = game.player;
    if (opts.computeFov) {
        game.fov.compute(game.map, player.x, player.y);
    }
    if (!Number.isFinite(player.umovement)) {
        player.umovement = NORMAL_SPEED;
    }
    // C ref: allmain.c:197 — actual time passed.
    player.umovement -= NORMAL_SPEED;

    do {
        let monscanmove = false;
        if (!opts.skipMonsterMove) {
            do {
                monscanmove = await movemon(game.map, player, game.display, game.fov, game);
                if (player.umovement >= NORMAL_SPEED)
                    break; /* it's now your turn */
            } while (monscanmove);
        }
        // C ref: mon.c movemon() does deferred_goto() on u.utotype.
        // JS keeps it here until mon.c-level transition plumbing is fully ported.
        if (player.utotype) {
            deferred_goto(player, game);
            monscanmove = false;
        }
        if (!monscanmove && player.umovement < NORMAL_SPEED) {
            moveloop_turnend(game);
        }
    } while (player.umovement < NORMAL_SPEED);

    // C ref: allmain.c end of moveloop_core — check for player death
    if (player.isDead || player.hp <= 0) {
        if (!player.deathCause) {
            player.deathCause = 'died';
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
//                    flags, travelPath, runMode
export function moveloop_turnend(game) {
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
    // C ref: allmain.c repeat loop behavior for repeated searching.
    // When wounded legs heal during repeated search, interrupt the repeat.
    if (game.player.justHealedLegs
        && game.multi > 0
        && game.cmdKey === 's'.charCodeAt(0)) {
        game.player.justHealedLegs = false;
        game.multi = 0;
        game.display.putstr_message('Your leg feels better.');
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

    // C ref: allmain.c:238 u_calc_moveamt(wtcap)
    u_calc_moveamt(game.player);

    // C ref: allmain.c:295-301 — regen_hp(mvl_wtcap)
    regen_hp(game);

    // C ref: allmain.c:341-343 — autosearch for players with Searching
    // intrinsic (Archeologists/Rangers at level 1, Rogues at 10, etc.)
    if (game.player.searching && game.multi >= 0) {
        dosearch0(game.player, game.map, game.display, game);
    }

    // C ref: allmain.c:351 dosounds() — ambient sounds
    moveloop_dosounds(game);

    // C ref: allmain.c:374 — water/air planes update moving bubbles/clouds each turn.
    if (game.map?.flags?.is_waterlevel || game.map?.flags?.is_airlevel) {
        if (game.map?._water && game.player) {
            game.map._water.heroPos = {
                x: game.player.x,
                y: game.player.y,
                dx: game.player.dx || 0,
                dy: game.player.dy || 0,
            };
            game.map._water.onHeroMoved = (x, y) => {
                game.player.x = x;
                game.player.y = y;
                if (game.fov?.compute) {
                    game.fov.compute(game.map, game.player.x, game.player.y);
                }
            };
            game.map._water.onVisionRecalc = () => {
                if (game.fov?.compute) {
                    game.fov.compute(game.map, game.player.x, game.player.y);
                }
            };
        }
        movebubbles(game.map);
    }

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
    exerper(game.player, moves);

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
    // C ref: allmain.c:385-393 — immobile turn countdown and unmul().
    if (game.multi < 0) {
        if (++game.multi === 0) {
            unmul(null, game.player, game.display, game);
            if (game.player?.utotype) {
                deferred_goto(game.player, game);
            }
        }
    }
    // After turn-end completes, subsequent command processing observes
    // the incremented move counter.
    setObjectMoves(game.turnCount + 1);
}

// C ref: allmain.c:680 stop_occupation()
export function stop_occupation(game) {
    if (!game) return;
    const occ = game.occupation;
    if (occ && typeof occ.fn === 'function') {
        const finishedMeal = !!maybe_finished_meal(game, true);
        if (!finishedMeal) {
            const occtxt = occ.occtxt || occ.txt;
            if (typeof occtxt === 'string' && occtxt.length > 0) {
                game.display?.putstr_message?.(`You stop ${occtxt}.`);
            }
        }
        game.occupation = null;
        game.pendingPrompt = null;
        nomul(0, game);
    } else if (Number.isInteger(game.multi) && game.multi >= 0) {
        nomul(0, game);
    }
    // C ref: cmdq_clear(CQ_CANNED) — clear queued synthetic/user-ahead
    // keystrokes in the active input runtime, then reset count prefix.
    cmdq_clear(CQ_CANNED);
    game.commandCount = 0;
}

// C ref: allmain.c:116 [static] — u_calc_moveamt(wtcap): hero movement amount.
// JS approximation: no steed movement or encumbrance penalties yet.
function u_calc_moveamt(player) {
    let moveamt = player.speed || NORMAL_SPEED;
    if (player.veryFast) {
        if (rn2(3) !== 0) moveamt += NORMAL_SPEED;
    } else if (player.fast) {
        if (rn2(3) === 0) moveamt += NORMAL_SPEED;
    }
    player.umovement = Math.max(0, (player.umovement || 0) + moveamt);
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

// cf. allmain.c moveloop() — shared post-input command orchestration.
// Executes a single command (rhack), then drains any occupation it creates,
// then handles multi-repeat (counted commands like "20s").
// Used by nethack.js (browser), headless_runtime.js (tests/selfplay), and
// replay_core.js (session comparison) so that all three drive the same
// orchestration logic.
//
// opts.countPrefix:      digit count (e.g. 20 for "20s")
// opts.onTimedTurn:      hook called after each moveloop_core
// opts.onBeforeRepeat:   hook called before each multi-repeat iteration
// opts.skipMonsterMove:  passed through to moveloop_core
// opts.computeFov:       passed through to moveloop_core
// opts.skipTurnEnd:      skip all post-rhack processing (moveloop, occ, multi)
export async function run_command(game, ch, opts = {}) {
    const {
        countPrefix = 0,
        onTimedTurn,
        onBeforeRepeat,
        skipMonsterMove,
        computeFov = false,
        skipTurnEnd = false,
        skipRepeatRecord = false,
    } = opts;

    const chCode = typeof ch === 'number' ? ch
        : (typeof ch === 'string' && ch.length > 0) ? ch.charCodeAt(0) : 0;
    const isPrefixKey = chCode === 'm'.charCodeAt(0)
        || chCode === 'F'.charCodeAt(0)
        || chCode === 'G'.charCodeAt(0)
        || chCode === 'g'.charCodeAt(0);

    // Prompt handlers (e.g., eat.c "Continue eating? [yn]") consume input
    // without advancing time until a terminating answer is provided.
    if (game.pendingPrompt && typeof game.pendingPrompt.onKey === 'function') {
        const promptResult = game.pendingPrompt.onKey(chCode, game);
        if (promptResult && promptResult.handled) {
            return {
                tookTime: false,
                moved: false,
                prompt: true,
            };
        }
    }

    if (!skipRepeatRecord && !game.inDoAgain
        && chCode !== 0
        && chCode !== 1
        && chCode !== '#'.charCodeAt(0)) {
        if (!game._repeatPrefixChainActive) {
            cmdq_clear(CQ_REPEAT);
        }
        if (countPrefix > 0) {
            cmdq_add_int(CQ_REPEAT, countPrefix);
        }
        cmdq_add_key(CQ_REPEAT, chCode);
    }

    // Set multi from countPrefix, set cmdKey
    game.commandCount = countPrefix;
    if (countPrefix > 0) {
        game.multi = countPrefix - 1; // first execution is now
    } else {
        game.multi = 0;
    }
    game.cmdKey = chCode;

    const coreOpts = {};
    if (computeFov) coreOpts.computeFov = true;
    if (skipMonsterMove) coreOpts.skipMonsterMove = true;

    // Process one timed turn of world updates after a command consumed time.
    const advanceTimedTurn = async () => {
        await moveloop_core(game, coreOpts);
        if (onTimedTurn) {
            await onTimedTurn();
        }
    };

    // Set advanceRunTurn for running mode (G/g commands process monster
    // turns between each movement step rather than batching all movement).
    game.advanceRunTurn = async () => {
        await advanceTimedTurn();
    };

    // Execute command
    const enableRepeatCapture = !skipRepeatRecord && !game.inDoAgain && chCode !== '#'.charCodeAt(0);
    setCmdqInputMode(!!game.inDoAgain);
    setCmdqRepeatRecordMode(enableRepeatCapture);
    let result;
    try {
        result = await rhack(chCode, game);
    } finally {
        setCmdqInputMode(false);
        setCmdqRepeatRecordMode(false);
    }

    if (result && result.repeatRequest) {
        game.advanceRunTurn = null;
        return await execute_repeat_command(game, opts);
    }
    if (!skipRepeatRecord && !game.inDoAgain) {
        game._repeatPrefixChainActive = !!(result && !result.tookTime && isPrefixKey);
    }
    maybe_deferred_goto_after_rhack(game, result, { skipTurnEnd });

    // Clear advanceRunTurn
    game.advanceRunTurn = null;

    // Post-rhack processing: moveloop_core, occupation, multi-repeat
    if (result && result.tookTime && !skipTurnEnd) {
        await advanceTimedTurn();

        // Drain any occupation created by the command
        await _drainOccupation(game, coreOpts, onTimedTurn);

        // Multi-repeat loop
        while (game.multi > 0) {
            if (onBeforeRepeat) {
                await onBeforeRepeat();
            }
            if (game.multi <= 0) break; // hook may have cleared multi

            game.multi--;
            game.advanceRunTurn = async () => {
                await advanceTimedTurn();
            };
            const repeated = await rhack(game.cmdKey, game);
            game.advanceRunTurn = null;

            if (!repeated || !repeated.tookTime) break;
            await advanceTimedTurn();

            // Drain occupation from repeated command
            await _drainOccupation(game, coreOpts, onTimedTurn);
        }
    }

    return result;
}

// C ref: cmd.c do_repeat() queue payload decode.
// Returns last repeatable command snapshot from CQ_REPEAT, or null.
export function get_repeat_command_snapshot() {
    const copy = cmdq_copy(CQ_REPEAT);
    if (!copy) return null;
    let cursor = copy;
    let countPrefix = 0;

    if (cursor.typ === CMDQ_INT) {
        countPrefix = Number.isFinite(cursor.intval) ? Math.max(0, cursor.intval | 0) : 0;
        cursor = cursor.next;
    }
    if (!cursor || cursor.typ !== CMDQ_KEY || !Number.isFinite(cursor.key)) {
        return null;
    }
    return { key: cursor.key | 0, countPrefix };
}

// C ref: cmd.c do_repeat() -- replay CQ_REPEAT command stream.
export async function execute_repeat_command(game, opts = {}) {
    if (game?.inDoAgain) return { moved: false, tookTime: false };
    if (!cmdq_peek(CQ_REPEAT)) {
        game?.display?.putstr_message?.('There is no command available to repeat.');
        return { moved: false, tookTime: false };
    }

    const repeatCopy = cmdq_copy(CQ_REPEAT);
    game.inDoAgain = true;
    try {
        return await run_command(game, 0, { ...opts, skipRepeatRecord: true });
    } finally {
        game.inDoAgain = false;
        cmdq_restore(CQ_REPEAT, repeatCopy);
    }
}

// C ref: allmain.c deferred_goto() immediately follows rhack() whenever
// u.utotype is set. In JS, timed commands defer this until after moveloop_core()
// so ordering stays after monster movement.
export function maybe_deferred_goto_after_rhack(game, result, opts = {}) {
    const { skipTurnEnd = false } = opts;
    if (!game?.player?.utotype) return;
    if (!(result && result.tookTime) || skipTurnEnd) {
        deferred_goto(game.player, game);
    }
}

// Internal helper: drain a multi-turn occupation until it completes or is
// interrupted by an adjacent hostile monster.
async function _drainOccupation(game, coreOpts, onTimedTurn) {
    while (game.occupation) {
        const occ = game.occupation;
        const cont = occ.fn(game);
        const finishedOcc = !cont ? occ : null;

        if (cont === 'prompt') {
            // Occupation has paused on an in-band prompt and will resume or
            // abort when that prompt consumes subsequent input.
        } else if (!cont) {
            // C ref: natural occupation completion clears silently.
            game.occupation = null;
            game.pendingPrompt = null;
        }

        // Occupation step took time — process monster moves + turn-end
        await moveloop_core(game, coreOpts);
        if (onTimedTurn) await onTimedTurn();

        if (finishedOcc && typeof finishedOcc.onFinishAfterTurn === 'function') {
            finishedOcc.onFinishAfterTurn(game);
        }
        if (cont === 'prompt') break;
    }
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

// cf. allmain.c:566 [static] — maybe_do_tutorial(void): tutorial prompt
// TODO: allmain.c:566 — maybe_do_tutorial(): tutorial entry prompt

// cf. allmain.c:586 — moveloop(resuming): main game loop
// TODO: allmain.c:586 — moveloop(): main game loop

// cf. allmain.c:599 [static] — regen_pw(wtcap): power point regeneration
// TODO: allmain.c:599 — regen_pw(): power regeneration

// cf. allmain.c:621 [static] — regen_hp(wtcap): hit point regeneration
// Ported from C's regen_hp() (allmain.c:623-681).
// Simplified: no polymorph HP (u.mh), no eel-out-of-water.
// U_CAN_REGEN: Regeneration intrinsic or Sleepy+asleep.
// GAP: Missing encumbrance gate. C checks:
//   encumbrance_ok = (wtcap < MOD_ENCUMBER || !u.umoved);
//   if (u.uhp < u.uhpmax && (encumbrance_ok || U_CAN_REGEN())) ...
// JS doesn't track wtcap or umoved, so we skip the gate.
// This causes rn2(100) to be consumed when C would skip it in overencumbered+moved cases.
function regen_hp(game) {
    const player = game.player;
    // C ref: allmain.c:656-660 — non-polymorph branch, encumbrance-gated
    if (player.hp < player.hpmax) {
        const con = player.attributes ? player.attributes[A_CON] : 10;
        // C ref: allmain.c:661 — heal = (ulevel + ACURR(A_CON)) > rn2(100)
        let heal = (player.level + con) > rn2(100) ? 1 : 0;
        // C ref: allmain.c:663 — U_CAN_REGEN bonus: +1 heal
        if (player.regeneration) {
            heal += 1;
        }
        // C ref: allmain.c:665 — Sleepy+asleep bonus: +1 heal
        // (not tracked in JS yet)
        if (heal) {
            player.hp += heal;
            if (player.hp > player.hpmax)
                player.hp = player.hpmax;
            // C ref: allmain.c:670 — stop voluntary multi-turn activity if fully healed
            if (player.hp === player.hpmax) {
                // interrupt_multi("You are in full health.")
                if (game.multi > 0
                    && !game.travelPath?.length
                    && !game.runMode) {
                    game.multi = 0;
                    if (game.flags?.verbose !== false) {
                        game.display.putstr_message('You are in full health.');
                    }
                }
            }
        }
    }
}

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

// ============================================================================
// DEFAULT_GAME_FLAGS — minimal defaults for the headless path
// ============================================================================
const DEFAULT_GAME_FLAGS = {
    pickup: false,
    verbose: false,
    safe_wait: true,
};

// ============================================================================
// NetHackGame — unified browser + headless game class
// cf. allmain.c early_init(), moveloop(), newgame()
// ============================================================================
export class NetHackGame {
    constructor(deps = {}) {
        this.deps = deps;
        this.lifecycle = deps.lifecycle || {};
        this.hooks = deps.hooks || {};
        this.fov = new FOV();
        this.levels = {};
        this.gameOver = false;
        this.gameOverReason = '';
        this.turnCount = 0;
        setObjectMoves(1); // C ref: svm.moves starts at 1
        this.wizard = false;
        this.seerTurn = 0;
        this.occupation = null;
        this.pendingPrompt = null;
        this.pendingDeferredTimedTurn = false;
        this.seed = 0;
        this.multi = 0;
        this.inDoAgain = false;
        this.commandCount = 0;
        this.cmdKey = 0;
        this.lastCommand = null;
        this._repeatPrefixChainActive = false;
        this._namePromptEcho = '';
        this.menuRequested = false;
        this.forceFight = false;
        this.runMode = 0;
        this._rngAccessors = { getRngState, setRngState, getRngCallCount, setRngCallCount };
        this.rfilter = {
            roles: new Array(roles.length).fill(false),
            races: new Array(races.length).fill(false),
            genders: new Array(2).fill(false),
            aligns: new Array(3).fill(false),
        };
        this.lastHP = undefined;
        this.dnum = undefined;
        this.dungeonAlignOverride = undefined;

        // Browser/headless path: player/map set up later in async init()
        this.player = new Player();
        this.map = null;
        this.display = deps.display || null;
        setOutputContext(this.display);
        this.flags = null; // set in init()
        this.input = deps.input || null;
        if (this.display) {
            initAnimation(this.display, { mode: 'headless', skipDelays: true });
        }
    }

    // Emit lifecycle event
    _runLifecycle(name, ...args) {
        const fn = this.lifecycle[name];
        if (typeof fn === 'function') {
            return fn(...args);
        }
        return undefined;
    }

    // Emit hook events
    _emitRuntimeBindings() {
        if (typeof this.hooks.onRuntimeBindings === 'function') {
            this.hooks.onRuntimeBindings({
                game: this,
                flags: this.flags,
                display: this.display,
            });
        }
    }

    _emitGameplayStart() {
        if (typeof this.hooks.onGameplayStart === 'function') {
            this.hooks.onGameplayStart({ game: this });
        }
    }

    _emitGameOver() {
        if (typeof this.hooks.onGameOver === 'function') {
            this.hooks.onGameOver({ game: this, reason: this.gameOverReason });
        }
    }

    // Re-render game view (map + status). Called after a modal window closes.
    _rerenderGame() {
        if (!this.fov || !this.map || !this.display) return;
        this.fov.compute(this.map, this.player.x, this.player.y);
        this.display.renderMessageWindow();
        this.display.renderMap(this.map, this.player, this.fov, this.flags);
        this.display.renderStatus(this.player);
    }

    // Initialize a new game — browser chargen path
    // C ref: allmain.c early_init() + moveloop_preamble()
    async init(initOptions = {}) {
        const urlOpts = {
            wizard: false,
            reset: false,
            seed: null,
            ...initOptions,
        };
        this.wizard = urlOpts.wizard;

        if (!this.display) {
            throw new Error('NetHackGame requires deps.display');
        }

        const interactiveMode = typeof window !== 'undefined' && typeof document !== 'undefined';
        setAnimationMode(interactiveMode ? 'interactive' : 'headless');
        configureAnimation({
            skipDelays: !interactiveMode,
            canSee: (x, y) => {
                if (!this.fov || typeof this.fov.canSee !== 'function') return true;
                return !!this.fov.canSee(x, y);
            },
            onDelayBoundary: (payload) => {
                // Keep replay boundary semantics aligned with existing session logs.
                pushRngLogEntry('>runmode_delay_output @ animation(tmp_at)');
                pushRngLogEntry('<runmode_delay_output #0-0 @ animation(tmp_at)');
                if (typeof this.hooks.onAnimationDelayBoundary === 'function') {
                    this.hooks.onAnimationDelayBoundary({ game: this, ...payload });
                }
            },
            onTrace: (trace) => {
                if (!trace || typeof trace.type !== 'string') return;
                const p = trace;
                if (trace.type === 'tmp_at_start') {
                    pushRngLogEntry(`^tmp_at_start[mode=${p.mode},glyph=${String(p.glyph)}]`);
                } else if (trace.type === 'tmp_at_step') {
                    pushRngLogEntry(`^tmp_at_step[${p.x},${p.y},${String(p.glyph)}]`);
                } else if (trace.type === 'tmp_at_end') {
                    pushRngLogEntry(`^tmp_at_end[flags=${String(p.flags)}]`);
                } else if (trace.type === 'delay_output') {
                    pushRngLogEntry(`^delay_output[ms=${String(p.ms || 0)}]`);
                }
                if (typeof this.hooks.onAnimationTrace === 'function') {
                    this.hooks.onAnimationTrace({ game: this, trace });
                }
            },
        });
        initAnimation(this.display, {});

        if (this.deps.input) {
            setInputRuntime(this.deps.input);
            this.input = this.deps.input;
        } else if (typeof this.deps.initInput === 'function') {
            const maybeRuntime = this.deps.initInput();
            if (maybeRuntime && typeof maybeRuntime.nhgetch === 'function') {
                setInputRuntime(maybeRuntime);
                this.input = maybeRuntime;
            }
        }

        // Wire up nhwindow infrastructure
        init_nhwindows(this.display, nhgetch, () => this._rerenderGame());

        // Dynamically import chargen functions from nethack.js to avoid circular deps
        const nethackChargen = await import('./chargen.js');
        const {
            handleReset: _handleReset, restoreFromSave: _restoreFromSave,
            playerSelection: _playerSelection, maybeDoTutorial: _maybeDoTutorial,
            enterTutorial: _enterTutorial,
        } = nethackChargen;

        // Handle ?reset=1 — prompt to delete all saved data
        if (urlOpts.reset) {
            await _handleReset(this);
        }

        // Load user flags (C ref: flags struct from flag.h)
        this.flags = loadFlags(urlOpts.flags || null);
        this._emitRuntimeBindings();

        // Check for saved game before RNG init
        const saveData = loadSave();
        if (saveData) {
            const restored = await _restoreFromSave(this, saveData, urlOpts);
            if (restored) return;
            deleteSave();
        }

        // Initialize RNG with seed from URL or random
        const seed = urlOpts.seed !== null
            ? urlOpts.seed
            : Math.floor(Math.random() * 0xFFFFFFFF);
        this.seed = seed;
        initRng(seed);
        setGameSeed(seed);

        // Start keystroke recording for reproducibility
        startRecording(seed, this.flags);
        this._emitRuntimeBindings();

        // Show welcome message
        const wizStr = this.wizard ? ' [WIZARD MODE]' : '';
        const seedStr = urlOpts.seed !== null ? ` (seed:${seed})` : '';
        this.display.putstr_message(`NetHack Royal Jelly -- Welcome to the Mazes of Menace!${wizStr}${seedStr}`);

        // Player selection
        if (urlOpts.character) {
            // Headless/replay path: set player fields directly (no chargen RNG)
            const char = urlOpts.character;
            let roleIndex = 11; // default Valkyrie
            if (Number.isInteger(char.roleIndex)) {
                roleIndex = char.roleIndex;
            } else if (typeof char.role === 'string') {
                const idx = roles.findIndex(r => r.name === char.role);
                if (idx >= 0) roleIndex = idx;
            }
            this.player.initRole(roleIndex);
            this.player.name = char.name || 'Agent';
            if (Number.isInteger(char.gender)) {
                this.player.gender = char.gender;
            } else if (typeof char.gender === 'string' && char.gender.toLowerCase() === 'female') {
                this.player.gender = FEMALE;
            }
            const raceMap = { human: RACE_HUMAN, elf: RACE_ELF, dwarf: RACE_DWARF, gnome: RACE_GNOME, orc: RACE_ORC };
            if (Number.isInteger(char.race)) {
                this.player.race = char.race;
            } else if (typeof char.race === 'string') {
                const r = raceMap[char.race.toLowerCase()];
                if (r !== undefined) this.player.race = r;
            }
            const alignMap = { lawful: A_LAWFUL, neutral: A_NEUTRAL, chaotic: A_CHAOTIC };
            if (Number.isInteger(char.alignment)) {
                this.player.alignment = char.alignment;
            } else if (typeof char.align === 'string') {
                const a = alignMap[char.align.toLowerCase()];
                if (a !== undefined) this.player.alignment = a;
            }
        } else if (this.wizard) {
            // Wizard mode: auto-select Valkyrie (index 11)
            this.player.initRole(11); // PM_VALKYRIE
            this.player.name = 'Wizard';
            this.player.race = RACE_HUMAN;
            this.player.gender = FEMALE;
            this.player.alignment = A_NEUTRAL;
        } else {
            await _playerSelection(this);
        }

        // First-level init
        this.dnum = Number.isInteger(urlOpts.startDnum) ? urlOpts.startDnum : undefined;
        this.dungeonAlignOverride = Number.isInteger(urlOpts.dungeonAlignOverride)
            ? urlOpts.dungeonAlignOverride : undefined;
        const startDlevel = Number.isInteger(urlOpts.startDlevel) ? urlOpts.startDlevel : 1;
        const { map, initResult } = initFirstLevel(this.player, this.player.roleIndex, this.wizard, {
            startDlevel,
            startDnum: this.dnum,
            dungeonAlignOverride: this.dungeonAlignOverride,
        });
        this.map = map;
        this.levels[startDlevel] = map;
        this.player.wizard = this.wizard;
        this.seerTurn = initResult.seerTurn;

        // Apply flags
        this.player.showExp = this.flags.showexp;
        this.player.showScore = this.flags.showscore;
        this.player.showTime = this.flags.time;

        // Initial display
        this.fov.compute(this.map, this.player.x, this.player.y);
        this.display.renderMap(this.map, this.player, this.fov, this.flags);
        this.display.renderStatus(this.player);

        if (this.flags.tutorial && urlOpts.character) {
            // Option-driven direct tutorial startup for deterministic replay/headless.
            await _enterTutorial(this, { direct: true });
        } else if (this.flags.tutorial) {
            await _maybeDoTutorial(this);
        }

        this._emitGameplayStart();
    }

    // Generate or retrieve a level
    // C ref: dungeon.c -- level management
    changeLevel(depth, transitionDir = null, opts = {}) {
        setMakemonPlayerContext(this.player);
        const heroHasAmulet = !!(this.player?.uhave?.amulet);
        const makeLevel = Number.isInteger(this.dnum)
            ? (d) => makelevel(d, this.dnum, d, {
                dungeonAlignOverride: this.dungeonAlignOverride,
                heroHasAmulet,
            })
            : undefined;
        changeLevelCore(this, depth, transitionDir, { ...opts, makeLevel });

        // Bones level message
        if (this.map.isBones) {
            this.display.putstr_message('You get an eerie feeling...');
        }

        // Update display
        this.renderCurrentScreen();
        this.maybeShowQuestLocateHint(depth);
        if (typeof this.hooks.onLevelChange === 'function') {
            this.hooks.onLevelChange({ game: this, depth });
        }
    }

    maybeShowQuestLocateHint(depth) {
        if (!this.display || !this.player || this.player.questLocateHintShown) return;
        if (!Number.isInteger(depth)) return;
        const currentDnum = Number.isInteger(this.dnum) ? this.dnum : 0;
        const questLocateDepth = (currentDnum === 0 && depth === 14);
        if (!questLocateDepth && !isBranchLevelToDnum(currentDnum, depth, 3)) return;
        rn2(3);
        rn2(2);
        this.display.putstr_message("You couldn't quite make out that last message.");
        this.player.questLocateHintShown = true;
    }

    placePlayerOnLevel(transitionDir = null) {
        const pos = getArrivalPosition(this.map, this.player.dungeonLevel, transitionDir);
        this.player.x = pos.x;
        this.player.y = pos.y;
    }

    // C ref: allmain.c interrupt_multi() — check if multi-command should be interrupted
    shouldInterruptMulti() {
        if ((this.runMode || 0) > 0) return false;
        if (this.occupation) return this.shouldInterruptOccupation();
        if (monsterNearby(this.map, this.player, this.fov)) return true;
        if (this.lastHP !== undefined && this.player.hp !== this.lastHP) {
            this.lastHP = this.player.hp;
            return true;
        }
        this.lastHP = this.player.hp;
        return false;
    }

    // C ref: do.c cmd_safety_prevention()
    shouldInterruptOccupation() {
        if ((this.runMode || 0) > 0) return false;
        return monsterNearby(this.map, this.player, this.fov);
    }

    // Run the deferred timed turn postponed from a stop_occupation frame.
    async runPendingDeferredTimedTurn() {
        if (!this.pendingDeferredTimedTurn) return;
        this.pendingDeferredTimedTurn = false;
        await moveloop_core(this, { computeFov: true });
    }

    // C-parity naming for internal callers.
    stop_occupation() {
        stop_occupation(this);
    }

    // Compatibility alias for existing JS call sites.
    stopOccupation() {
        this.stop_occupation();
    }

    // Render current screen state
    renderCurrentScreen() {
        this.fov.compute(this.map, this.player.x, this.player.y);
        this.display.renderMap(this.map, this.player, this.fov, this.flags);
        this.display.renderStatus(this.player);
    }

    _renderAll() {
        this.renderCurrentScreen();
    }

    // Return the COLNO×ROWNO terrain type grid
    getTypGrid() {
        const grid = [];
        for (let y = 0; y < ROWNO; y++) {
            const row = [];
            for (let x = 0; x < COLNO; x++) {
                const loc = this.map?.at?.(x, y);
                row.push(loc ? loc.typ : 0);
            }
            grid.push(row);
        }
        return grid;
    }

    getScreen() {
        return this.display.getScreenLines();
    }

    getAnsiScreen() {
        return this.getScreen().join('\n');
    }

    enableRngLogging(withTags = true) {
        enableRngLog(withTags);
    }

    getRngLog() {
        return [...(readRngLog() || [])];
    }

    clearRngLog() {
        const log = readRngLog();
        if (!log) return;
        log.length = 0;
        setRngCallCount(0);
    }

    checkpoint(phase = 'checkpoint') {
        return {
            phase,
            level: this.player?.dungeonLevel || 0,
            turn: this.turnCount,
            player: {
                x: this.player?.x ?? 0,
                y: this.player?.y ?? 0,
                hp: this.player?.hp ?? 0,
                hpmax: this.player?.hpmax ?? 0,
            },
            rng: this.getRngLog(),
            typGrid: this.getTypGrid(),
            screen: this.getScreen(),
        };
    }

    static isCountPrefixDigit(key) {
        const ch = typeof key === 'string' ? key.charCodeAt(0) : key;
        return ch >= 48 && ch <= 57;
    }

    static parseCountPrefixDigit(key) {
        const ch = typeof key === 'string' ? key.charCodeAt(0) : key;
        if (ch >= 48 && ch <= 57) return ch - 48;
        return null;
    }

    static accumulateCountPrefix(currentCount, key) {
        const digit = NetHackGame.parseCountPrefixDigit(key);
        if (digit !== null) {
            return {
                isDigit: true,
                newCount: Math.min(32767, (currentCount * 10) + digit),
            };
        }
        return { isDigit: false, newCount: currentCount };
    }

    async executeCommand(ch) {
        const code = typeof ch === 'string' ? ch.charCodeAt(0) : ch;
        const result = await run_command(this, code, { computeFov: true });

        if (typeof this.hooks.onCommandResult === 'function') {
            this.hooks.onCommandResult({ game: this, keyCode: code, result });
        }
        if (result && result.tookTime && typeof this.hooks.onTurnAdvanced === 'function') {
            this.hooks.onTurnAdvanced({ game: this, keyCode: code, result });
        }

        this.fov.compute(this.map, this.player.x, this.player.y);
        this.display.renderMap(this.map, this.player, this.fov, this.flags);
        this.display.renderStatus(this.player);
        if (typeof this.hooks.onScreenRendered === 'function') {
            this.hooks.onScreenRendered({ game: this, keyCode: code });
        }

        if (this.player.hp <= 0) {
            this.gameOver = true;
            this.gameOverReason = 'died';
        }

        return result;
    }

    async sendKey(key, replayContext = {}) {
        const raw = typeof key === 'string' ? key : String.fromCharCode(key);
        if (!raw) throw new Error('sendKey requires a non-empty key');
        for (let i = 1; i < raw.length; i++) {
            this.input.pushInput(raw.charCodeAt(i));
        }
        return this.executeReplayStep(raw[0], replayContext);
    }

    async sendKeys(keys, replayContext = {}) {
        const out = [];
        const seq = Array.isArray(keys) ? keys : String(keys || '').split('');
        for (const key of seq) {
            out.push(await this.sendKey(key, replayContext));
        }
        return out;
    }

    async replayStep(key, options = {}) {
        const result = await run_command(this, key, {
            countPrefix: (options.countPrefix && options.countPrefix > 0) ? options.countPrefix : 0,
            skipMonsterMove: options.skipMonsterMove,
            computeFov: true,
            skipTurnEnd: !!options.skipTurnEnd,
            onBeforeRepeat: () => {
                if (typeof this.shouldInterruptMulti === 'function'
                    && this.shouldInterruptMulti()) {
                    this.multi = 0;
                }
            },
        });

        this.renderCurrentScreen();

        return {
            tookTime: result?.tookTime || false,
            moved: result?.moved || false,
            result,
            screen: this.getScreen(),
            typGrid: this.getTypGrid(),
        };
    }

    async executeReplayStep(key, replayContext = {}) {
        const raw = typeof key === 'string' ? key : String.fromCharCode(key);
        if (!raw) throw new Error('executeReplayStep requires a key');
        const beforeCount = readRngLog()?.length || 0;
        if (typeof this.hooks.onStepStart === 'function') {
            this.hooks.onStepStart({ game: this, key: raw, context: replayContext });
        }
        const result = await this.replayStep(raw, replayContext);
        if (typeof this.hooks.onCommandResult === 'function') {
            this.hooks.onCommandResult({ game: this, keyCode: raw.charCodeAt(0), result: result.result });
        }
        if (result.tookTime && typeof this.hooks.onTurnAdvanced === 'function') {
            this.hooks.onTurnAdvanced({ game: this, keyCode: raw.charCodeAt(0), result: result.result });
        }
        if (typeof this.hooks.onScreenRendered === 'function') {
            this.hooks.onScreenRendered({ game: this, keyCode: raw.charCodeAt(0) });
        }
        const fullLog = readRngLog() || [];
        const stepRng = fullLog.slice(beforeCount);
        if (typeof this.hooks.onReplayPrompt === 'function' && this.occupation) {
            this.hooks.onReplayPrompt({ game: this, key: raw, context: replayContext });
        }
        return {
            key: raw,
            result,
            rng: stepRng,
            typGrid: this.getTypGrid(),
            screen: this.getScreen(),
            level: this.player?.dungeonLevel || 0,
            turn: this.turnCount,
        };
    }

    teleportToLevel(depth) {
        if (!this.player?.wizard) {
            return { ok: false, reason: 'wizard-disabled' };
        }
        if (!Number.isInteger(depth) || depth <= 0) {
            return { ok: false, reason: 'invalid-depth' };
        }
        this.changeLevel(depth, 'teleport');
        this.renderCurrentScreen();
        if (typeof this.hooks.onLevelChange === 'function') {
            this.hooks.onLevelChange({ game: this, depth });
        }
        return { ok: true, depth };
    }

    revealMap() {
        if (!this.map) return;
        for (let y = 0; y < ROWNO; y++) {
            for (let x = 0; x < COLNO; x++) {
                const loc = this.map.at(x, y);
                if (loc) {
                    loc.seenv = 0xFF;
                    loc.lit = true;
                }
            }
        }
        this.renderCurrentScreen();
    }

    // Show game-over screen (tombstone + score). Delegates to nethack.js showGameOver.
    // Also available as a standalone instance method for tests and external callers.
    async showGameOver() {
        const { showGameOver } = await import('./chargen.js');
        await showGameOver(this);
        this._emitGameOver();
    }

    // Main game loop — browser path
    // C ref: allmain.c moveloop() -> moveloop_core()
    async gameLoop() {
        while (!this.gameOver) {
            // Travel continuation
            if (this.travelPath && this.travelStep < this.travelPath.length) {
                const { executeTravelStep } = await import('./hack.js');
                const result = await executeTravelStep(this);
                if (result.tookTime) {
                    await moveloop_core(this);
                }
                this.fov.compute(this.map, this.player.x, this.player.y);
                this.display.renderMap(this.map, this.player, this.fov, this.flags);
                this.display.renderStatus(this.player);
                continue;
            }

            // Get player input with optional count prefix
            const firstCh = await nhgetch();
            let ch;
            let countPrefix = 0;

            // C ref: cmd.c:1687 do_repeat() — Ctrl+A repeats last command
            if (firstCh === 1) { // Ctrl+A
                await execute_repeat_command(this, {
                    computeFov: true,
                    onTimedTurn: async () => {
                        this.fov.compute(this.map, this.player.x, this.player.y);
                        this.display.renderMap(this.map, this.player, this.fov, this.flags);
                        this.display.renderStatus(this.player);
                        await new Promise(r => setTimeout(r, 0));
                    },
                    onBeforeRepeat: async () => {
                        if (this.shouldInterruptMulti()) {
                            this.multi = 0;
                            this.display.putstr_message('--More--');
                            await nhgetch();
                        }
                    },
                });
                this.fov.compute(this.map, this.player.x, this.player.y);
                this.display.renderMap(this.map, this.player, this.fov, this.flags);
                this.display.renderStatus(this.player);
                continue;
            } else if (firstCh >= 48 && firstCh <= 57) { // '0'-'9'
                const result = await getCount(firstCh, 32767, this.display);
                countPrefix = result.count;
                ch = result.key;
                if (ch === 27) { // ESC
                    this.display.clearRow(0);
                    continue;
                }
            } else {
                ch = firstCh;
            }

            if (!ch) continue;

            if (firstCh !== 1) {
                this.lastCommand = { key: ch, count: countPrefix };
            }

            await this.runPendingDeferredTimedTurn();

            await run_command(this, ch, {
                countPrefix,
                onTimedTurn: async () => {
                    this.fov.compute(this.map, this.player.x, this.player.y);
                    this.display.renderMap(this.map, this.player, this.fov, this.flags);
                    this.display.renderStatus(this.player);
                    await new Promise(r => setTimeout(r, 0));
                },
                onBeforeRepeat: async () => {
                    if (this.shouldInterruptMulti()) {
                        this.multi = 0;
                        this.display.putstr_message('--More--');
                        await nhgetch();
                    }
                },
            });

            this.fov.compute(this.map, this.player.x, this.player.y);
            this.display.renderMap(this.map, this.player, this.fov, this.flags);
            this.display.renderStatus(this.player);
        }

        // Game over
        await this.showGameOver();
    }
}
