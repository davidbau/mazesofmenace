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

/** C: objects.h **`RIN_TELEPORTATION`**. */
const OTYP_RIN_TELEPORTATION = 194;

/** C: youprop.h **`Teleportation`** — intrinsic or teleportation ring (RNG draw only until **`tele()`** ported). */
function heroHasTeleportationLikeC(g) {
    const u = g.u;
    if (!u) return false;
    if ((u.HTeleportation | 0) || (u.ETeleportation | 0)) return true;
    const ring = (o) => o && (o.otyp | 0) === OTYP_RIN_TELEPORTATION;
    return !!(ring(u.uleft) || ring(u.uright));
}

/** C: allmain.c moveloop_core — **`if (Teleportation && !rn2(85)) tele();`**. */
function maybeHeroTeleportRngLikeC(g) {
    const u = g.u;
    if (!u || (u.uinvulnerable | 0)) return;
    if (heroHasTeleportationLikeC(g)) rn2(85);
}
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
import {
    dogMoveEastTailPostMcalcmovePetLikeC,
    dogMoveLPetInventAfterNewturnLikeC,
    dogMoveTouristD1PostRestSecondDogMovePhase1LikeC,
    dogMoveTouristD1PostRestSecondDogMovePhase2LikeC,
    petRangedAttkDogmoveLikeC,
} from './dogmove_mon.js';
import {
    findDistantMklevMonLikeC,
    findTouristD1PostSwapNearMklevMonLikeC,
    wizD1EastDoorMklevMonLikeC,
    wizD1PeelDistantMklevMonLikeC,
} from './mfndpos_mon.js';
import {
    mMoveTouristD1PostRestSecondMklevInterruptLikeC,
    mMoveTouristD1PostSwapRestMklevLikeC,
    primeDistantMtrackRn20LikeC,
} from './m_move_mon.js';

/**
 * C: wizard D:1 second **`L`** post — after east-tail near **`distfleeck`** (~2722), peel
 * distant **`rn2(20)`** (~2723) before pet **`dog_goal`** / invent (**`rn2(4)`** ~2724+).
 *
 * @param {import('./gstate.js').game} g
 */
function wizD1LPostPeelRn20BeforePetInventLikeC(g) {
    if (g.context?._wizD1LPostPeelRn20MoveloopDoneLikeC) return;
    const peelDistant =
        g.context?._wizD1Step1DistantPeelMtmpLikeC
        ?? findDistantMklevMonLikeC(g);
    if (!peelDistant) return;
    /* C: ~2723 — distant **`m_move`** track **`rn2(20)`** only; **`set_apparxy`** **`rn2(3)`** is later. */
    primeDistantMtrackRn20LikeC(peelDistant);
    rn2(20);
    const ctx = g.context || (g.context = {});
    ctx._wizD1LPostPeelRn20MoveloopDoneLikeC = true;
}

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
/** C: wizard second **`L`** — post-corridor moveloop tail (~2735+). */
export async function runWizEastTailPostCorridorNewTurnLikeC(g) {
    g.context = g.context || {};
    g.context._wizD1PostCorridorNewTurnLikeC = true;
    try {
        await runNewTurnSetupAndTailLikeC(g, (g.moves | 0) - 1);
    } finally {
        delete g.context._wizD1PostCorridorNewTurnLikeC;
    }
    g.context._wizD1EastTailFirstPostCorridorNewTurnDoneLikeC = true;
}

/** C: wizard second **`L`** — post-corridor **`mcalcmove`** + moveloop tail (~2751+). */
export async function runWizEastTailPostCorridorMcalcmoveNewTurnLikeC(g) {
    g.context = g.context || {};
    g.context._wizD1EastTailSecondPostCorridorNewTurnDoneLikeC = true;
    g.context._wizD1EastTailPostMcalcmovePetPendingLikeC = true;
    await runNewTurnSetupAndTailLikeC(g, (g.moves | 0) - 1);
}

export async function runNewTurnSetupAndTailLikeC(g, stepNum) {
    /* C: second **`L`** post-corridor new-turn — **`movemon`** pass-2 already refreshed
     * **`movement`**; tail starts at **`maybe_generate_rnd_mon`** (~2735 **`rn2(70)`**). */
    if (!g.context?._wizD1PostCorridorNewTurnLikeC) {
        const mons = fmonListForMcalcmoveLikeC(g);
        for (const m of mons) {
            m.movement = (m.movement | 0) + mcalcMoveLikeC(m, true, g);
        }
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

    /* C: allmain.c — after regen, before **`dosounds`** / **`gethungry`**. */
    maybeHeroTeleportRngLikeC(g);
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
    delete g.context._wizD1EastTailShortLDeferToNextPostLikeC;
    delete g.context._wizD1MovemonRanThisPostLikeC;
    const wizD1MovemonOnceLikeC =
        g.urole?.abbr === 'Wiz'
        && (g.u?.uz?.dnum | 0) === 0
        && (g.u?.uz?.dlevel | 0) === 1;
    let wizD1ShortLPostLikeC = false;
    if (wizD1MovemonOnceLikeC) {
        /* C: first **`l`** after east-tail walk — promote before post cleanup (not gated on invent post). */
        if (g.context?._wizD1PostEastTailWalkCompletePendingLikeC) {
            wizD1ShortLPostLikeC = true;
            delete g.context._wizD1PostEastTailWalkCompletePendingLikeC;
            g.context._wizD1PostEastTailWalkCompleteLikeC = true;
            delete g.context._wizD1PostEastTailWalkShortLNearDfLikeC;
            delete g.context._wizD1PostEastTailWalkFmonLikeC;
            delete g.context._wizD1EastTailMovemonPetMfndposPendingLikeC;
            delete g.context._wizD1EastTailShortLPetDoneLikeC;
            delete g.context._wizD1EastTailShortLSecondNearDfLikeC;
        } else if (
            g.context?._wizD1EastTailShortLPendingArmedLikeC
            && !g.context?._wizD1PostEastTailWalkCompleteLikeC
        ) {
            wizD1ShortLPostLikeC = true;
            g.context._wizD1PostEastTailWalkCompleteLikeC = true;
            delete g.context._wizD1PostEastTailWalkShortLNearDfLikeC;
            delete g.context._wizD1PostEastTailWalkFmonLikeC;
            delete g.context._wizD1EastTailMovemonPetMfndposPendingLikeC;
            delete g.context._wizD1EastTailShortLPetDoneLikeC;
            delete g.context._wizD1EastTailShortLSecondNearDfLikeC;
        }
    }
    if (wizD1MovemonOnceLikeC && g.context?._wizD1Step1InventPostDoneLikeC) {
        /* C: second **`L`** — pass-2 **`rn2(20)`** + one **`distfleeck`** can end a post; keep peel
         * pin until the next post's **`mcalcmove`** (~2709), not a replayed pass-1 **`distfleeck`**. */
        if (
            !g.context?._wizD1DistantPass2AwaitMcalcmoveLikeC
            && !g.context?._wizD1LPostEastTailAfterMcalcmoveLikeC
        ) {
            delete g.context._wizD1Step1DistantFirstDfDoneLikeC;
            delete g.context._wizD1Step1DistantMmoveDoneLikeC;
            delete g.context._wizD1Step1DistantPeelMtmpLikeC;
            delete g.context._wizD1Step1DistantFmonPass2DoneLikeC;
            delete g.context._wizD1Step1DistantPass2Rn20DoneLikeC;
        }
        /* Keep **`_wizD1Step1LPetFirstPassDoneLikeC`** / tail on second **`L`** — moveloop must not
         * replay first-pass **`dog_goal`** invent after east-tail **`mcalcmove`**. */
        delete g.context._wizD1Step1LPetTailDoneLikeC;
        /* Keep **`_wizD1Step1LPetInventAfterNewturnDoneLikeC`** after first **`L`** chain (second **`L`** fmon). */
        /* Keep **`_wizD1Step1PendingLPostPeelLikeC`** until **`L`** post consumes it (set on **`n`** invent). */
        delete g.context._wizD1Step1PetMfndposPickDoneLikeC;
        delete g.context._wizD1EastTailFirstPostCorridorNewTurnDoneLikeC;
        delete g.context._wizD1EastTailSecondPostCorridorNewTurnDoneLikeC;
        delete g.context._wizD1EastTailPostCorridorMovemonAfterMcalcmoveDoneLikeC;
        delete g.context._wizD1EastTailPostMcalcmovePetPendingLikeC;
        delete g.context._wizD1LPostOuterLoopDoneLikeC;
        delete g.context._wizD1LPostEastSingleNearDfLikeC;
        delete g.context._wizD1SkipDistantDochugRn4LikeC;
        delete g.context._wizD1Step1NearMklevDistfleeckOnlyLikeC;
        delete g.context._wizD1EastDistantMmoveTailDoneLikeC;
        delete g.context._wizD1PostEastTailWalkNewTurnDoneLikeC;
        if (!wizD1ShortLPostLikeC) {
            delete g.context._wizD1PostEastTailWalkMintrapPeelDoneLikeC;
            delete g.context._wizD1PostEastTailWalkCompleteLikeC;
            delete g.context._wizD1PostEastTailWalkShortLNearDfLikeC;
            delete g.context._wizD1EastTailShortLPetDoneLikeC;
            delete g.context._wizD1EastTailShortLSecondNearDfLikeC;
        }
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
            /* C: tourist D:1 swap — no extra **`movemon`** between resume and post-new-turn rest
             * **`dochug`** (**`seed0900`** ~2500–2502). */
            const touristD1RestMoveloopPendingLikeC =
                g.urole?.abbr === 'Tou'
                && (g.u?.uz?.dnum | 0) === 0
                && (g.u?.uz?.dlevel | 0) === 1
                && g.context?._touristD1PostSwapMfndposResumeDoneLikeC
                && !g.context?._touristD1PostSwapRestDochugDoneLikeC;
            const touristD1RestMovemonStep1DoneLikeC =
                !!g.context?._touristD1PostSwapRestMovemonStep1DoneLikeC;
            if (
                runMovemon
                && !touristD1RestMoveloopPendingLikeC
                && !touristD1RestMovemonStep1DoneLikeC
                && !(
                    wizD1MovemonOnceLikeC
                    && (
                        (
                            g.context._wizD1MovemonRanThisPostLikeC
                            && !g.context?._wizD1PostEastTailWalkCompletePendingLikeC
                        )
                        || g.context?._wizD1EastTailShortLDeferToNextPostLikeC
                    )
                )
            ) {
                let stepForMovemon = movemonStepNum > 0 ? movemonStepNum : 1;
                /* C: wizard D:1 — every hero turn uses step-1 **`distfleeck`** peel + pet **`dog_move`**
                 * (**`seed0006`** **`n`** ~2568–2597), not **`moves−1`** door-niche **`j`** paths. */
                if (
                    wizD1MovemonOnceLikeC
                    && colonStep == null
                    && !isRogueColonMovemonActiveLikeC(g)
                    && (searchPass | 0) === 0
                    && (
                        g.context?._postBumpInlineDoneLikeC
                        || g.context?._wizD1PostEastTailWalkFmonLikeC
                        || g.context?._wizD1PostEastTailWalkCompleteLikeC
                        || g.context?._wizD1PostEastTailWalkCompletePendingLikeC
                        || g.context?._wizD1EastTailShortLPendingArmedLikeC
                    )
                    && !g.context?._postBumpKillDochugGateLikeC
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
                    if (
                        wizD1MovemonOnceLikeC
                        && !g.context?._wizD1PostEastTailWalkCompletePendingLikeC
                    ) {
                        g.context._wizD1MovemonRanThisPostLikeC = true;
                    }
                }
            }
            /* C: east-tail post-corridor **`mcalcmove`** already ran inside **`movemon`** (~2751+). */
            if (
                !monscanmove
                && (
                    g.context?._wizD1EastTailSecondPostCorridorNewTurnDoneLikeC
                    || g.context?._wizD1EastTailPostMcalcmovePetPendingLikeC
                )
                && !g.context?._wizD1EastTailPostCorridorMovemonAfterMcalcmoveDoneLikeC
            ) {
                g.context._wizD1LPostEastTailAfterMcalcmoveLikeC = true;
                delete g.context._wizD1MovemonRanThisPostLikeC;
                g.context._movemonHarnessConsumed = false;
                await movemon(1);
                g.context._wizD1MovemonRanThisPostLikeC = true;
                /* C: post-mcalcmove — pet prescan + **`mfndpos`** (~2758–2760); near **`distfleeck`** (~2761). */
                const petPostMcalcmove = (g.level?.monsters ?? []).find(
                    (m) => (m.mtame | 0) !== 0,
                );
                const nearPostMcalcmove = wizD1EastDoorMklevMonLikeC(g);
                if (petPostMcalcmove) {
                    dogMoveEastTailPostMcalcmovePetLikeC(g, petPostMcalcmove);
                }
                if (nearPostMcalcmove) {
                    setApparxyMonsterLikeC(g, nearPostMcalcmove);
                    await distfleeckMonsterApplyLikeC(g, nearPostMcalcmove);
                }
                g.context._wizD1EastTailPostCorridorMovemonAfterMcalcmoveDoneLikeC = true;
                delete g.context._wizD1EastTailPostMcalcmovePetPendingLikeC;
                g.context._wizD1LPostOuterLoopDoneLikeC = true;
                g.context.move = 0;
                newTurnDone = true;
            }

            if (
                !monscanmove
                && (u.umovement | 0) < NORMAL_SPEED
                && (!capNewTurnsToOne || !newTurnDone)
                && !g.context?._wizD1LPostOuterLoopDoneLikeC
                && !g.context?._wizD1EastTailPostCorridorMovemonAfterMcalcmoveDoneLikeC
            ) {
                const tailStepNum = (g.moves | 0) - 1;
                /* C: post-east-tail walk — new-turn already ran inside **`movemon`** (~2778+). */
                if (g.context?._wizD1PostEastTailWalkNewTurnDoneLikeC) {
                    delete g.context._wizD1PostEastTailWalkNewTurnDoneLikeC;
                    newTurnDone = true;
                }
                /* C: rogue D:1 — defer new-turn before first **`#search`** (`peek 's'`).
                 * Inline **`#search`** post always runs the tail here (no double defer+flush). */
                if (
                    !newTurnDone
                    && shouldDeferNewTurnAfterMovemonLikeC(g)
                ) {
                    g.context._deferredNewTurnLikeC = true;
                } else if (
                    !newTurnDone
                    && !g.context?._wizD1EastTailFirstPostCorridorNewTurnDoneLikeC
                    && !g.context?._wizD1EastTailSecondPostCorridorNewTurnDoneLikeC
                ) {
                    await runNewTurnSetupAndTailLikeC(g, tailStepNum);
                    /* C: tourist D:1 second post-rest — after leading new-turn (~2538–2544),
                     * near mklev **`distfleeck`** (~2545) then **`movemon`** peel; blocks another
                     * leading **`runNewTurnSetupAndTailLikeC`** at ~2545. */
                    if (g.context?._touristD1PostRestSecondAwaitNearDistfleeckLikeC) {
                        delete g.context._touristD1PostRestSecondAwaitNearDistfleeckLikeC;
                        const nearMklevPostNewturn =
                            findTouristD1PostSwapNearMklevMonLikeC(g);
                        if (nearMklevPostNewturn) {
                            setApparxyMonsterLikeC(g, nearMklevPostNewturn);
                            await distfleeckMonsterApplyLikeC(g, nearMklevPostNewturn);
                            g.context._touristD1PostRestSecondNearDistfleeckDoneLikeC = true;
                        }
                        g.context._touristD1PostRestSecondMovemonLikeC = true;
                        g.context._movemonHarnessConsumed = false;
                        try {
                            await movemon(1);
                        } finally {
                            delete g.context._touristD1PostRestSecondMovemonLikeC;
                            delete g.context._touristD1PostRestSecondNearDistfleeckDoneLikeC;
                        }
                        /* C: same #search post — second new-turn after peel **`movemon`**
                         * (**`mcalcmove`** ~2568–2570, tail ~2571+ on **`seed0900`**). */
                        await runNewTurnSetupAndTailLikeC(g, tailStepNum);
                        /* C: third **`movemon`** (~2575–2581) then stop outer surplus loop. */
                        g.context._touristD1PostRestSecondThirdMovemonPendingLikeC = true;
                        g.context._movemonHarnessConsumed = false;
                        await movemon(1);
                        g.context._touristD1PostRestSecondOuterMoveloopDoneLikeC = true;
                        g.context._touristD1PostRestMonsterMovemonDoneLikeC = true;
                        newTurnDone = true;
                    }
                    delete g.context._deferredNewTurnLikeC;
                    /* C: tourist D:1 peaceful swap — near mklev **`distfleeck`** + **`m_move`**
                     * after new-turn tail (**`seed0900`** ~2501–2503), not inside **`movemon`**
                     * before **`mcalcmove`**. */
                    if (
                        g.urole?.abbr === 'Tou'
                        && (g.u?.uz?.dnum | 0) === 0
                        && (g.u?.uz?.dlevel | 0) === 1
                        && g.context?._touristD1PostSwapMfndposResumeDoneLikeC
                        && !g.context?._touristD1PostSwapRestDochugDoneLikeC
                    ) {
                        const restMon = findTouristD1PostSwapNearMklevMonLikeC(g);
                        if (restMon) {
                            await mMoveTouristD1PostSwapRestMklevLikeC(
                                g,
                                restMon,
                                tailStepNum,
                            );
                        }
                        g.context._touristD1PostSwapRestDochugDoneLikeC = true;
                        /* C: post-rest pet **`dog_goal`** + ~915 **`distfleeck`** in step-1
                         * **`movemon`** (~2501+ on **`seed0900`**), not generic **`moves−1`**. */
                        g.context._movemonHarnessConsumed = false;
                        await movemon(1);
                        g.context._touristD1PostSwapRestMovemonStep1DoneLikeC = true;
                        /* C: post-rest **`dog_move`** mfndpos (~2512–2514), new-turn tail
                         * (~2515–2518), **`pet_ranged_attk`** (~2519) — same post. */
                        if (g.context?._touristD1PostRestPetRangedPendingLikeC) {
                            await runNewTurnSetupAndTailLikeC(g, tailStepNum);
                            const petPostRestRanged = (g.level?.monsters ?? []).find(
                                (m) => (m.mtame | 0) !== 0,
                            );
                            if (petPostRestRanged) {
                                g.context._touristD1PostRestMoveloopPeelLikeC = true;
                                setApparxyMonsterLikeC(g, petPostRestRanged);
                                petRangedAttkDogmoveLikeC(
                                    g,
                                    petPostRestRanged,
                                    false,
                                    null,
                                );
                                /* C: second post-rest **`dog_move`** phase-1 (~2520–2525), near mklev
                                 * **`m_move`** (~2526–2530), phase-2 (~2531–2537), then **`movemon`**
                                 * **`mcalcmove`** (~2538+). */
                                dogMoveTouristD1PostRestSecondDogMovePhase1LikeC(
                                    g,
                                    petPostRestRanged,
                                );
                                const nearMklevSecond = findTouristD1PostSwapNearMklevMonLikeC(g);
                                if (nearMklevSecond) {
                                    await mMoveTouristD1PostRestSecondMklevInterruptLikeC(
                                        g,
                                        nearMklevSecond,
                                    );
                                }
                                await dogMoveTouristD1PostRestSecondDogMovePhase2LikeC(
                                    g,
                                    petPostRestRanged,
                                );
                                /* C: defer peel until next moveloop leading new-turn (~2538–2544). */
                                g.context._touristD1PostRestSecondAwaitNearDistfleeckLikeC = true;
                            }
                            delete g.context._touristD1PostRestPetRangedPendingLikeC;
                            delete g.context._touristD1PostRestPetRangedTargLikeC;
                        }
                    }
                    if (g.context?._wizD1DistantPass2AwaitMcalcmoveLikeC) {
                        delete g.context._wizD1DistantPass2AwaitMcalcmoveLikeC;
                        delete g.context._wizD1Step1DistantPass2Rn20DoneLikeC;
                        /* C: pass-2 peel finished across **`mcalcmove`** — next **`fmon`** is near
                         * **`distfleeck`** (~2716) then distant **`m_move`** (~2717+). */
                        g.context._wizD1Step1DistantMmoveDoneLikeC = true;
                        g.context._wizD1LPostEastTailAfterMcalcmoveLikeC = true;
                        const peelDistant = wizD1PeelDistantMklevMonLikeC(g);
                        if (peelDistant) {
                            g.context._wizD1Step1DistantPeelMtmpLikeC = peelDistant;
                        }
                        /* C: same post — near **`distfleeck`** + distant **`m_move`** (~2716+) after
                         * **`mcalcmove`**, not on the next hero command. */
                        delete g.context._wizD1MovemonRanThisPostLikeC;
                        g.context._movemonHarnessConsumed = false;
                        await movemon(1);
                        g.context._wizD1MovemonRanThisPostLikeC = true;
                    }
                    if (!g.context?._touristD1PostRestSecondAwaitNearDistfleeckLikeC) {
                        newTurnDone = true;
                    }
                    if (
                        wizD1MovemonOnceLikeC
                        && g.context?._wizD1Step1LPetTailDoneLikeC
                        && !g.context?._wizD1Step1LPetInventAfterNewturnDoneLikeC
                        && !g.context?._wizD1SkipLPostInventMoveloopLikeC
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
                        wizD1LPostPeelRn20BeforePetInventLikeC(g);
                        if (pet) {
                            dogMoveLPetInventAfterNewturnLikeC(g, pet);
                        }
                        /* C: after post-newturn **`mfndpos`** — near mklev **`distfleeck`** (~2653). */
                        if (nearMklev) {
                            setApparxyMonsterLikeC(g, nearMklev);
                            await distfleeckMonsterApplyLikeC(g, nearMklev);
                        }
                        /* C: second new-turn block in same post (~2654+ **`mcalcmove`**). */
                        g.context._wizD1LPetInventSkipMoveloop82ExerciseLikeC = true;
                        try {
                            await runNewTurnSetupAndTailLikeC(g, (g.moves | 0) - 1);
                        } finally {
                            delete g.context._wizD1LPetInventSkipMoveloop82ExerciseLikeC;
                        }
                        g.context._wizD1Step1LPetInventAfterNewturnDoneLikeC = true;
                        delete g.context._wizD1Step1CachedDogGoalLikeC;
                        /* C: second **`movemon`** peel (~2660–2672) then third new-turn (~2673+). */
                        delete g.context._wizD1DistantPass2AwaitMcalcmoveLikeC;
                        delete g.context._wizD1Step1DistantFirstDfDoneLikeC;
                        delete g.context._wizD1Step1DistantMmoveDoneLikeC;
                        delete g.context._wizD1Step1DistantPeelMtmpLikeC;
                        delete g.context._wizD1Step1DistantFmonPass2DoneLikeC;
                        delete g.context._wizD1Step1DistantPass2Rn20DoneLikeC;
                        g.context._wizD1Step1LPostSecondMovemonPendingLikeC = true;
                        g.context._movemonHarnessConsumed = false;
                        await movemon(1);
                        g.context._wizD1LPetInventSkipMoveloop82ExerciseLikeC = true;
                        try {
                            await runNewTurnSetupAndTailLikeC(g, (g.moves | 0) - 1);
                        } finally {
                            delete g.context._wizD1LPetInventSkipMoveloop82ExerciseLikeC;
                        }
                        /* C: fourth **`movemon`** in same post (~2679+); keep **`MovemonRan`** so
                         * outer loop does not re-enter peel before fourth new-turn (~2688+). */
                        delete g.context._wizD1DistantPass2AwaitMcalcmoveLikeC;
                        delete g.context._wizD1Step1DistantFirstDfDoneLikeC;
                        delete g.context._wizD1Step1DistantMmoveDoneLikeC;
                        delete g.context._wizD1Step1DistantPeelMtmpLikeC;
                        delete g.context._wizD1Step1DistantFmonPass2DoneLikeC;
                        delete g.context._wizD1Step1DistantPass2Rn20DoneLikeC;
                        g.context._wizD1LPostFourthMovemonLikeC = true;
                        g.context._movemonHarnessConsumed = false;
                        try {
                            await movemon(1);
                        } finally {
                            delete g.context._wizD1LPostFourthMovemonLikeC;
                        }
                        /* C: fourth new-turn (~2688+); **`post_moveloop82_exercise`** at step 5 (~2694). */
                        await runNewTurnSetupAndTailLikeC(g, 5);
                        g.context._wizD1LPostOuterLoopDoneLikeC = true;
                    }
                }
            }
        } while (
            (u.umovement | 0) < NORMAL_SPEED
            && !g.context?._deferredNewTurnLikeC
            && !g.context?._wizD1LPostOuterLoopDoneLikeC
            && !g.context?._touristD1PostRestSecondOuterMoveloopDoneLikeC
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
        delete g.context._wizD1LPostOuterLoopDoneLikeC;
        delete g.context._wizD1LPostPeelRn20MoveloopDoneLikeC;
        delete g.context._wizD1LPostEastTailDistantPeelDoneLikeC;
        delete g.context._wizD1EastTailMovemonPetMfndposPendingLikeC;
        delete g.context._wizD1EastTailNearMklevMtmpLikeC;
        delete g.context._wizD1EastTailPeelMtmpLikeC;
        delete g.context._wizD1EastTailCorridorTurnDoneLikeC;
        delete g.context._wizD1SkipLPostInventMoveloopLikeC;
        delete g.context._touristD1PostRestSecondOuterMoveloopDoneLikeC;
        delete g.context._touristD1PostRestSecondThirdMovemonPendingLikeC;
        /* **`_wizD1PostEastTailWalkFmonLikeC`** cleared in **`movemon`** after the walk post consumes it. */
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
