// moveloop_turn_advance.js — Shared tail of allmain.c moveloop_core (movemon + turn advance).
// C ref: allmain.c moveloop_core — extracted so pray.c nomul(-3) helpless ticks can reuse the same
// RNG ordering as a normal moveloop iteration without importing cmd.js (rhack).
import { bot, flush_screen, pline, clearPendingMessageAndToplineLikeC } from './display.js';
import { vision_recalc } from './vision.js';
import { movemon } from './monmove.js';
import { fmonListForMcalcmoveLikeC } from './fmon_iter.js';
import { mcalcMoveLikeC } from './mcalc_move.js';
import { NORMAL_SPEED } from './const.js';
import { end_of_turn_rng, maybe_generate_rnd_mon } from './moveloop_aux.js';
import { encumberMsg } from './pickup.js';
import { nearCapacity, ENC } from './encumbr.js';
import { raceptr } from './mondata.js';
import { rn2 } from './rng.js';
import { collectNewuhsPlines } from './hunger.js';
import { settrack } from './track.js';
import { pullDueMeltIceAwayTimers } from './level_timers.js';
import { meltIceAt } from './melt_ice.js';
import { runDueNhObjTimers } from './obj_timeout_dispatch.js';
import { contextLeavingTutorialActiveLikeC } from './tutorial_branch.js';

/**
 * C: allmain.c **`u_calc_moveamt(wtcap)`** — hero speed budget after new-turn setup (subset).
 * @param {import('./gstate.js').game} g
 * @param {number} [wtcap]
 */
function uCalcMoveamtLikeC(g, wtcap = ENC.UNENCUMBERED) {
    const u = g.u;
    if (!u) return;
    let moveamt = raceptr(g.youmonst)?.mmove | 0;
    if (!moveamt) moveamt = NORMAL_SPEED;

    if ((u.Very_fast | 0) && rn2(3) !== 0) {
        moveamt += NORMAL_SPEED;
    } else if ((u.Fast | 0) && rn2(3) === 0) {
        moveamt += NORMAL_SPEED;
    }

    switch (wtcap | 0) {
        case ENC.SLT_ENCUMBER:
            moveamt -= Math.trunc(moveamt / 4);
            break;
        case ENC.MOD_ENCUMBER:
            moveamt -= Math.trunc(moveamt / 2);
            break;
        case ENC.HVY_ENCUMBER:
            moveamt -= Math.trunc((moveamt * 3) / 4);
            break;
        case ENC.EXT_ENCUMBER:
            moveamt -= Math.trunc((moveamt * 7) / 8);
            break;
        default:
            break;
    }

    u.umovement = (u.umovement | 0) + moveamt;
    if ((u.umovement | 0) < 0) u.umovement = 0;
}

/** C: allmain.c moveloop_core — vision + bot before rhack (monster/tail advance is in post). */
export async function runMoveloopPreambleBeforeRhackLikeC(g) {
    if (g.vision_full_recalc) {
        vision_recalc(0);
        g.vision_full_recalc = 0;
    }
    await bot();
    await flush_screen(1);
}

/**
 * C: allmain.c — new-turn block when both hero and monsters are out of movement
 * (`!monscanmove && u.umovement < NORMAL_SPEED`): mcalcmove, maybe_generate_rnd_mon, moves++,
 * once-per-turn tail.
 * @param {import('./gstate.js').game} g
 * @param {number} stepNum
 */
async function runNewTurnSetupAndTailLikeC(g, stepNum) {
    const mons = fmonListForMcalcmoveLikeC(g);
    for (const m of mons) {
        m.movement = (m.movement | 0) + mcalcMoveLikeC(m, true, g);
    }
    maybe_generate_rnd_mon();
    settrack();
    g.moves = (g.moves || 1) + 1;
    g.hero_seq = (g.moves | 0) << 3;
    const dueMeltIce = pullDueMeltIceAwayTimers(g);
    for (const { x, y } of dueMeltIce) {
        g.context = g.context || {};
        const saveMonMoving = g.context.monMoving;
        g.context.monMoving = true;
        try {
            await meltIceAt(g, x, y, 'Some ice melts away.');
        } finally {
            g.context.monMoving = saveMonMoving;
        }
    }
    runDueNhObjTimers(g);
    for (const line of collectNewuhsPlines(true)) await pline(line);

    await end_of_turn_rng(stepNum);
}

/**
 * C: allmain.c moveloop_core — after a time-costing hero command: `u.umovement -= NORMAL_SPEED`,
 * outer `do { movemon…; new-turn; u_calc_moveamt; } while (u.umovement < NORMAL_SPEED)`.
 * @param {import('./gstate.js').game} g
 */
export async function runPostCommandTurnAdvanceLikeC(g) {
    const u = g.u;
    if (!u) return;

    u.umovement = (u.umovement | 0) - NORMAL_SPEED;
    if ((u.umovement | 0) < 0) u.umovement = 0;

    const stepNum = (g.moves || 1) - 1;

    g.context = g.context || {};
    g.context.monMoving = true;
    try {
        do {
            let monscanmove = false;
            if (stepNum > 0) {
                g.context._movemonHarnessConsumed = false;
                await encumberMsg();
                do {
                    monscanmove = await movemon(stepNum);
                    if ((u.umovement | 0) >= NORMAL_SPEED) break;
                } while (monscanmove);
            }

            if (!monscanmove && (u.umovement | 0) < NORMAL_SPEED) {
                await runNewTurnSetupAndTailLikeC(g, stepNum);
                uCalcMoveamtLikeC(g, nearCapacity(g));
            }
        } while ((u.umovement | 0) < NORMAL_SPEED);
    } finally {
        g.context.monMoving = false;
        delete g.context._movemonHarnessConsumed;
        delete g.context._movemonStep5Passes;
        delete g.context._movemonStep6Passes;
        delete g.context._movemonStep6Pass;
        delete g.context._searchMovemonStarted;
        delete g.context._movemonSearch11SubPasses;
        delete g.context._movemonSearch11SubPass;
        delete g.context._movemonStep7Passes;
        delete g.context._movemonStep8Passes;
    }
}

/** C: allmain.c moveloop_core — tutorial exit flag clear in core tail. */
export function clearLeavingTutorialIfActiveLikeC(g) {
    if (contextLeavingTutorialActiveLikeC(g)) {
        if (g.context) g.context.leaving_tutorial = false;
        if (g.gd) delete g.gd.leaving_tutorial;
    }
}

/**
 * One helpless moveloop tick (no rhack): C allmain.c immobile **`gm.multi < 0`** slice
 * combined with the normal per-turn advance when time passes.
 * @param {import('./gstate.js').game} g
 */
export async function executeHelplessMoveloopTickLikeC(g) {
    await runMoveloopPreambleBeforeRhackLikeC(g);
    if (!g._retainMessageAfterCommand) clearPendingMessageAndToplineLikeC();
    g._retainMessageAfterCommand = false;
    g.context = g.context || {};
    g.context.move = 1;
    await runPostCommandTurnAdvanceLikeC(g);
    g._prevMoveTick = 1;
    clearLeavingTutorialIfActiveLikeC(g);
}
