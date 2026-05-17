// moveloop_turn_advance.js — Shared tail of allmain.c moveloop_core (movemon + turn advance).
// C ref: allmain.c moveloop_core — extracted so pray.c nomul(-3) helpless ticks can reuse the same
// RNG ordering as a normal moveloop iteration without importing cmd.js (rhack).
import { bot, flush_screen, pline, clearPendingMessageAndToplineLikeC } from './display.js';
import { vision_recalc } from './vision.js';
import { movemon, MOVE_MON_HARNESS_MAX_STEP } from './monmove.js';
import { mcalcMoveLikeC } from './mcalc_move.js';
import { end_of_turn_rng, gethungry } from './moveloop_aux.js';
import { collectNewuhsPlines } from './hunger.js';
import { collectExerchkPlines } from './attrib.js';
import { settrack } from './track.js';
import { pullDueMeltIceAwayTimers } from './level_timers.js';
import { meltIceAt } from './melt_ice.js';
import { runDueNhObjTimers } from './obj_timeout_dispatch.js';
import { contextLeavingTutorialActiveLikeC } from './tutorial_branch.js';

/** C: allmain.c moveloop_core — movemon + end_of_turn_rng + vision + bot before rhack. */
export async function runMoveloopPreambleBeforeRhackLikeC(g) {
    if (g._prevMoveTick) {
        const stepNum = (g.moves || 1) - 1;
        if (stepNum > 0 && stepNum <= MOVE_MON_HARNESS_MAX_STEP) {
            await movemon(stepNum);
            end_of_turn_rng(stepNum);
        }
    }
    if (g.vision_full_recalc) {
        vision_recalc(0);
        g.vision_full_recalc = 0;
    }
    await bot();
    await flush_screen(1);
}

/**
 * C: allmain.c moveloop_core — svm.moves++ block after a time-consuming command.
 * @param {import('./gstate.js').game} g
 */
export async function runPostCommandTurnAdvanceLikeC(g) {
    for (const m of g.level?.monsters ?? []) {
        m.movement = (m.movement | 0) + mcalcMoveLikeC(m, true, g);
    }
    settrack();
    g.moves = (g.moves || 1) + 1;
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
    gethungry();
    for (const line of collectNewuhsPlines(true)) await pline(line);
    for (const line of collectExerchkPlines()) await pline(line);
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
