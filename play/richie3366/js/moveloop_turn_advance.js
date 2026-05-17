// moveloop_turn_advance.js — Shared tail of allmain.c moveloop_core (movemon + turn advance).
// C ref: allmain.c moveloop_core — extracted so pray.c nomul(-3) helpless ticks can reuse the same
// RNG ordering as a normal moveloop iteration without importing cmd.js (rhack).
import { bot, flush_screen, pline, clearPendingMessageAndToplineLikeC } from './display.js';
import { vision_recalc } from './vision.js';
import { movemon } from './monmove.js';
import { mcalcMoveLikeC } from './mcalc_move.js';
import { rn2 } from './rng.js';
import { end_of_turn_rng, maybe_generate_rnd_mon } from './moveloop_aux.js';
import { collectNewuhsPlines } from './hunger.js';
import { settrack } from './track.js';
import { pullDueMeltIceAwayTimers } from './level_timers.js';
import { meltIceAt } from './melt_ice.js';
import { runDueNhObjTimers } from './obj_timeout_dispatch.js';
import { contextLeavingTutorialActiveLikeC } from './tutorial_branch.js';

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
 * C: allmain.c moveloop_core — after a time-costing hero command: inner **`movemon`** sweeps,
 * then new-turn **`mcalcmove`** / **`maybe_generate_rnd_mon`** / **`moves++`** / per-turn tail.
 * Order matches C: **`movemon()`** before **`fmon`** **`mcalcmove`** allotment (see **`allmain.c`** ~211–244).
 * @param {import('./gstate.js').game} g
 */
export async function runPostCommandTurnAdvanceLikeC(g) {
    const stepNum = (g.moves || 1) - 1;
    if (g._prevMoveTick && stepNum > 0) {
        await movemon(stepNum);
    }

    const mons = g.level?.monsters ?? [];
    if (mons.length > 0) {
        for (const m of mons) {
            m.movement = (m.movement | 0) + mcalcMoveLikeC(m, true, g);
        }
    } else {
        /* C: **`mcalcmove`** over **`fmon`** — **`mklev`** stub may leave **`monsters`** empty while C had four mons on D:1. */
        for (let i = 0; i < 4; i++) rn2(12);
    }
    maybe_generate_rnd_mon();
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
    for (const line of collectNewuhsPlines(true)) await pline(line);

    if (g._prevMoveTick) {
        await end_of_turn_rng(stepNum);
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
