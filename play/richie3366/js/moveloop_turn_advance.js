// moveloop_turn_advance.js — Shared tail of allmain.c moveloop_core (movemon + turn advance).
// C ref: allmain.c moveloop_core — extracted so pray.c nomul(-3) helpless ticks can reuse the same
// RNG ordering as a normal moveloop iteration without importing cmd.js (rhack).
import {
    bot, flush_screen, pline,
    clearPendingMessageAndToplineLikeC, shouldClearMoveloopToplineLikeC, latchRetainedToplineLikeC,
} from './display.js';
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
import {
    consumeRogueColonMovemonPendingLikeC,
    effectiveMovemonStepNumLikeC,
    isRogueColonMovemonActiveLikeC,
} from './monmove_search.js';
import { peekReplayMoves } from './input.js';
import { setApparxyMonsterLikeC } from './set_apparxy_mon.js';
import { distfleeckMonsterApplyLikeC } from './distfleeck_mon.js';
import { dogMoveLPetInventAfterNewturnLikeC } from './dogmove_mon.js';

/**
 * C: rogue D:1 with only gate + pet — first **`movemon`** peel at **`stepNum` 1** waits for
 * first **`#search`** (**`seed0077`**); running it before **`s`** shifts gate **`rn2(4)`** late.
 *
 * @param {import('./gstate.js').game} g
 */
function skipStep1MovemonRogD1GatePetOnlyLikeC(g) {
    const mons = g.level?.monsters ?? [];
    if ((mons.length | 0) !== 2) return false;
    const rogueLike =
        g.urole?.abbr === 'Rog'
        || g.pl_character === 'Rogue'
        || (g.urole?.mnum | 0) === 8;
    if (!rogueLike) return false;
    const gate = mons.some((m) => (m.mnum | 0) === 120 && (m.mgenmklev | 0));
    const pet = mons.some((m) => (m.mtame | 0) !== 0);
    return gate && pet;
}

/** C: rogue D:1 gate+pet — defer new-turn until **`#search`** inline post (not tourist D:1). */
function deferNewTurnBeforeSearchLikeC(g) {
    if (!skipStep1MovemonRogD1GatePetOnlyLikeC(g)) return false;
    const pk = peekReplayMoves(0);
    if (pk == null) return false;
    if (pk === 's'.charCodeAt(0)) return true;
    if (pk === 'i'.charCodeAt(0)) return true;
    if (pk === 27) return true; /* ESC-prefixed commands */
    return false;
}

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
 * (`!monscanmove && u.umovement < NORMAL_SPEED`): mcalcmove, maybe_generate_rnd_mon,
 * **`u_calc_moveamt`**, **`settrack`**, **`moves++`**, once-per-turn tail.
 * @param {import('./gstate.js').game} g
 * @param {number} stepNum
 */
async function runNewTurnSetupAndTailLikeC(g, stepNum) {
    const mons = fmonListForMcalcmoveLikeC(g);
    for (const m of mons) {
        m.movement = (m.movement | 0) + mcalcMoveLikeC(m, true, g);
    }
    maybe_generate_rnd_mon();
    /* C: allmain.c — **`u_calc_moveamt`** before **`settrack`/`moves++`/tail RNG. */
    uCalcMoveamtLikeC(g, nearCapacity(g));
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
/** C: flush **`_deferredNewTurnLikeC`** after **`#search`** inline post. */
export async function runDeferredNewTurnIfAnyLikeC(g) {
    if (!g.context?._deferredNewTurnLikeC) return;
    delete g.context._deferredNewTurnLikeC;
    const tailStepNum = (g.moves | 0) - 1;
    await runNewTurnSetupAndTailLikeC(g, tailStepNum);
}

/** @param {import('./gstate.js').game} g */
function shouldDeferNewTurnAfterMovemonLikeC(g) {
    if (
        !g.context._searchInlinePostDoneLikeC
        && (
            g.context._deferredNewTurnLikeC
            || deferNewTurnBeforeSearchLikeC(g)
        )
    ) {
        return true;
    }
    return false;
}

export async function runPostCommandTurnAdvanceLikeC(g) {
    const u = g.u;
    if (!u) return;

    u.umovement = (u.umovement | 0) - NORMAL_SPEED;
    if ((u.umovement | 0) < 0) u.umovement = 0;

    g.context = g.context || {};
    delete g.context._wizD1MovemonRanThisPostLikeC;
    const wizD1MovemonOnceLikeC =
        g.urole?.abbr === 'Wiz'
        && (g.u?.uz?.dnum | 0) === 0
        && (g.u?.uz?.dlevel | 0) === 1;
    if (wizD1MovemonOnceLikeC && g.context?._wizD1Step1InventPostDoneLikeC) {
        delete g.context._wizD1Step1DistantFirstDfDoneLikeC;
        delete g.context._wizD1Step1DistantMmoveDoneLikeC;
        delete g.context._wizD1Step1DistantPeelMtmpLikeC;
        delete g.context._wizD1Step1LPetFirstPassDoneLikeC;
        delete g.context._wizD1Step1LPetTailDoneLikeC;
        delete g.context._wizD1Step1LPetInventAfterNewturnDoneLikeC;
        /* Keep **`_wizD1Step1PendingLPostPeelLikeC`** until **`L`** post consumes it (set on **`n`** invent). */
        delete g.context._wizD1Step1PetMfndposPickDoneLikeC;
    }
    g.context.monMoving = true;
    try {
        /* C: allmain.c outer loop may run new-turn → movemon → new-turn in one post
         * (wizard **`seed0006`** ~2502–2522 after **`n`**). Cap to one new-turn only for
         * inline **`#search`** post (same moveloop as **`cmd.js`**). */
        const capNewTurnsToOne = !!g.context?._searchInlinePostDoneLikeC;
        let newTurnDone = false;
        let outerSafety = 0;
        do {
            /* Pathological **`movemon`** / **`u.umovement`** coupling can spin the outer
             * C loop forever on some public sessions (**`seed0399`**); cap is far above
             * legitimate hero-speed surplus paths (e.g. **`seed0077`**). */
            if (++outerSafety > 500_000) break;
            let monscanmove = false;
            /* C: allmain.c — **`movemon`** uses current **`svm.moves`** each inner-loop pass
               (hero speed surplus can run monster pass + new-turn more than once per input). */
            const colonStep = consumeRogueColonMovemonPendingLikeC(g);
            if (colonStep != null) {
                g.context._rogueColonMovemonStepLikeC = colonStep;
            }
            const movemonStepNum =
                colonStep != null
                    ? colonStep
                    : (
                        isRogueColonMovemonActiveLikeC(g)
                        && g.context?._rogueColonMovemonStepLikeC != null
                    )
                        ? (g.context._rogueColonMovemonStepLikeC | 0)
                        : (g.moves | 0) - 1;
            /* C: allmain.c always `movemon()` when `context.move`; first `#search` post on D:1
               can be `moves===1` (`movemonStepNum===0`) — peel still maps to step 11. */
            const searchPass = g.context?._searchStep11Passes | 0;
            const runMovemon =
                movemonStepNum > 0
                || (
                    (searchPass === 1 || searchPass === 2)
                    && !!g.context?._searchPass1NearMonLikeC
                );
            if (
                runMovemon
                && !(wizD1MovemonOnceLikeC && g.context._wizD1MovemonRanThisPostLikeC)
            ) {
                let stepForMovemon = movemonStepNum > 0 ? movemonStepNum : 1;
                /* C: wizard D:1 — every hero turn uses step-1 **`distfleeck`** peel + pet **`dog_move`**
                 * (**`seed0006`** **`n`** ~2568–2597), not **`moves−1`** door-niche **`j`** paths. */
                if (
                    wizD1MovemonOnceLikeC
                    && colonStep == null
                    && !isRogueColonMovemonActiveLikeC(g)
                    && (searchPass | 0) === 0
                    && !g.context?._postBumpKillDochugGateLikeC
                    && g.context?._postBumpInlineDoneLikeC
                ) {
                    stepForMovemon = 1;
                }
                /* C: first **`#search`** on low **`moves`** — skip peel **`stepNum` 1**; use pass 11 path. */
                if (
                    (searchPass === 1 || searchPass === 2)
                    && colonStep == null
                    && !isRogueColonMovemonActiveLikeC(g)
                ) {
                    stepForMovemon = effectiveMovemonStepNumLikeC(
                        g,
                        movemonStepNum > 0 ? movemonStepNum : 11,
                    );
                }
                const skipStep1RogD1 =
                    (stepForMovemon | 0) === 1
                    && skipStep1MovemonRogD1GatePetOnlyLikeC(g);
                if (!skipStep1RogD1) {
                    g.context._movemonHarnessConsumed = false;
                    await encumberMsg();
                    let monscanSafety = 0;
                    do {
                        if (++monscanSafety > 50_000) {
                            monscanmove = false;
                            break;
                        }
                        monscanmove = await movemon(stepForMovemon);
                        if ((u.umovement | 0) >= NORMAL_SPEED) break;
                    } while (monscanmove);
                    if (wizD1MovemonOnceLikeC) {
                        g.context._wizD1MovemonRanThisPostLikeC = true;
                    }
                }
            }

            if (
                !monscanmove
                && (u.umovement | 0) < NORMAL_SPEED
                && (!capNewTurnsToOne || !newTurnDone)
            ) {
                const tailStepNum = (g.moves | 0) - 1;
                /* C: rogue D:1 — defer new-turn before first **`#search`** (`peek 's'`).
                 * Inline **`#search`** post always runs the tail here (no double defer+flush). */
                if (shouldDeferNewTurnAfterMovemonLikeC(g)) {
                    g.context._deferredNewTurnLikeC = true;
                } else {
                    await runNewTurnSetupAndTailLikeC(g, tailStepNum);
                    delete g.context._deferredNewTurnLikeC;
                    newTurnDone = true;
                    if (
                        wizD1MovemonOnceLikeC
                        && g.context?._wizD1Step1LPetTailDoneLikeC
                        && !g.context?._wizD1Step1LPetInventAfterNewturnDoneLikeC
                    ) {
                        const pet = (g.level?.monsters ?? []).find(
                            (m) => (m.mtame | 0) !== 0,
                        );
                        const distant = (g.level?.monsters ?? []).find(
                            (m) =>
                                (m.mgenmklev | 0)
                                && !(m.mtame | 0)
                                && m !== (g.context?._wizD1Step1DistantPeelMtmpLikeC),
                        );
                        const nearMklev = (g.level?.monsters ?? []).find(
                            (m) =>
                                m !== distant
                                && m !== pet
                                && (m.mgenmklev | 0)
                                && !(m.mtame | 0),
                        );
                        if (nearMklev) {
                            setApparxyMonsterLikeC(g, nearMklev);
                            await distfleeckMonsterApplyLikeC(g, nearMklev);
                        }
                        if (pet) {
                            dogMoveLPetInventAfterNewturnLikeC(g, pet);
                        }
                        g.context._wizD1Step1LPetInventAfterNewturnDoneLikeC = true;
                    }
                }
            }
        } while (
            (u.umovement | 0) < NORMAL_SPEED
            && !g.context?._deferredNewTurnLikeC
        );
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
    if (shouldClearMoveloopToplineLikeC(g)) clearPendingMessageAndToplineLikeC();
    latchRetainedToplineLikeC(g);
    g.context = g.context || {};
    g.context.move = 1;
    await runPostCommandTurnAdvanceLikeC(g);
    g._prevMoveTick = 1;
    clearLeavingTutorialIfActiveLikeC(g);
}
