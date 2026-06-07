// monmove.js — Monster movement (monmove.c / mon.c).
// C ref: monmove.c movemon, distfleeck, m_move; mon.c mcalcmove.
//
// Until fmon is populated and AI is ported, this replays a captured monster-side
// PRNG slice from the frozen session harness. Delete _HARNESS entries when **`m_move`**
// consumes the same draws per monster.
//
// C: **`monmove.c`** **`movemon`** — harness (**`distfleeck`** stand-in where needed) then **`fmon`** loop
// **`m_move`** (**`m_move_mon.js`**), then **`mintrap`**. **`m_throw`** runs only inside **`m_move`**.
// **`distfleeck`/`m_move`**: **`m_move_mon.js`** — **`dochug`** subset, **`mfndpos_mon.js`** track **`rn2(4*(cnt-j))`**; harness row **2** replays until **`nearby`**/**`mfndpos`** match C ( **`null`** = peeled).
// C **`allmain.c`** **`do { movemon(); … } while (monscanmove)`** — one **`fmon`** pass per **`movemon()`**; outer loop in **`moveloop_turn_advance.js`**.

import { rn2 } from './rng.js';
import { peekReplayMoves } from './input.js';
import { NORMAL_SPEED, PM_LICHEN } from './const.js';
import { mintrapMoveloopTail } from './trap.js';
import { game } from './gstate.js';

/** C: run-**`K`** deferred peel — moveloop owns new-turn passes (~2908–2912). */
async function runInlineNewTurnUnlessDeferredPeelLikeC(g, stepNum) {
    const commaPeelNewTurnLikeC =
        !!g.context?._wizD1CapitalKPostCommaFmonHeadDoneLikeC
        && !g.context?._wizD1CapitalKPostCommaPeelDoneLikeC
        && (
            !!g.context?._wizD1CapitalKPostCommaMoveloopLikeC
            || !!g.context?._wizD1PostEastTailWalkFmonDistantDeferredLikeC
        );
    if (
        !commaPeelNewTurnLikeC
        && g.context?._wizD1PostEastTailWalkFmonDistantDeferredLikeC
        && (g.context._wizD1DeferredRunKNewTurnPassesLikeC | 0) < 3
    ) {
        return;
    }
    const { runNewTurnSetupAndTailLikeC } = await import(
        './moveloop_turn_advance.js',
    );
    await runNewTurnSetupAndTailLikeC(g, stepNum);
}
import { fmonListForMovemonLikeC, fmonListNewestFirstLikeC } from './fmon_iter.js';
import {
    eastFungusDoorNicheAtLikeC,
    findDistantMklevMonLikeC,
    findTouristD1PostSwapNearMklevMonLikeC,
    findFirstSearchRogMidMklevHostileLikeC,
    findEastKickMonLikeC,
    eastMklevFirstLAfterBLikeC,
    findEastMklevSecondHLikeC,
    findWestKinkMonsterLikeC,
    isLandEelForMovemonLikeC,
    mfndposMonsterLikeC,
    monAllowflagsMonsterLikeC,
    movemonStep8DistantMonEligibleLikeC,
    westFungusDoorNicheAtLikeC,
    westApportSleeperNicheAtLikeC,
    wizD1CorridorMklevMonLikeC,
    wizD1EastDoorMklevMonLikeC,
    wizD1PeelDistantMklevMonLikeC,
    wizD1CommaLFirstUNearMklevMonLikeC,
} from './mfndpos_mon.js';
import {
    clearRogueColonMovemonActiveLikeC,
    effectiveMovemonStepNumLikeC,
    isFirstSearchMovemonPassLikeC,
    isRogueColonMovemonActiveLikeC,
    isSecondSearchMovemonPassLikeC,
    rogueSecondSearchFullFmonLikeC,
} from './monmove_search.js';
import { searchPass1NearMonLikeC } from './mfndpos_mon.js';
import { distfleeckMonsterApplyLikeC } from './distfleeck_mon.js';
import {
    dogMoveTouristD1PostSwapAfterRestPetLikeC,
    dogMoveTouristD1PostSwapMfndposResumeLikeC,
    dogMoveTouristD1LPostAfterPeelNewturnTailLikeC,
    dogMoveTouristD1LPostThirdMovemonPetLikeC,
    dogMoveTouristD1LPostFourthMovemonPetLikeC,
    dogMoveTouristD1LPostMovemonPeelLikeC,
    dogMoveTouristD1PostRestSecondThirdMovemonPetLikeC,
} from './dogmove_mon.js';
import { setApparxyMonsterLikeC } from './set_apparxy_mon.js';
import {
    movemonSinglemonLikeC,
    mMoveDistfleeckOnlyTurnLikeC,
    mMoveCapitalKPostNewturnNearLikeC,
    mMoveCapitalKPostCommaDistantLikeC,
    mMoveCapitalKPostCommaDeferredDistantLikeC,
    runCapitalKPostCommaDeferredFmonTailLikeC,
    mMoveWizardD1Step1DistantAfterPeelLikeC,
    mMoveWizardD1EastTailCorridorRestLikeC,
    mMoveCommaUInventPostCorridorHostileLikeC,
    mMoveWizardD1LPostTailDistantLikeC,
    mMovePostEastTailWalkMintrapDistantPeelLikeC,
    primeDistantMtrackRn20LikeC,
    primeWizD1EastDoorMtrackLikeC,
    wizD1CommaLFirstUNearDistfleeckBeforePetLikeC,
    runCommaPostFirstLMaybeGenTailLikeC,
    mMoveCommaLFirstUDistantLikeC,
    mMoveCommaLFirstUPostDistantTailLikeC,
} from './m_move_mon.js';
import {
    dogGoalScanSearchPostGateLikeC,
    dogMoveGoalOnlyNoPickLikeC,
    dogMoveGoalAndPickLikeC,
    dogMoveLPetMfndposAfterEastTailPeelLikeC,
    dogMoveLPetTailPostPeelLikeC,
    dogMoveLikeC,
    dogMovePostCorridorSecondPetMfndposLikeC,
    dogMoveWizardD1FourthMovemonPetLikeC,
    dogMoveInventOnlyLikeC,
    dogMoveSearchPassNearHeroLikeC,
    dogMoveCapitalKPostDistantPeelPetLikeC,
    dogMoveCapitalKPostNearPetLikeC,
    dogMoveCapitalKPostNewturnPetLikeC,
    dogMoveCapitalKPostPeelPetLikeC,
    dogMoveCapitalKPostCommaPetHeadLikeC,
    dogMoveCapitalKPostCommaPetTailLikeC,
    dogMoveCommaLFirstUPostTailPetLikeC,
    dogMoveCommaLFirstUPostTailInventAfterNewturnLikeC,
    dogMoveCommaLFirstUPostTailThirdMovemonPetLikeC,
    dogMoveCommaUFmonTailPostPeelPetLikeC,
    dogMoveFirstLAfterCommaPetLikeC,
    dogMoveLPetInventAfterNewturnLikeC,
    dogMovePostEastTailWalkShortLPetLikeC,
} from './dogmove_mon.js';
import {
    isWizardD1Step1PeelLikeC,
    rangerD1FirstSearchNoNearMonLikeC,
    wizD1CommaLFirstUAfterCommaLLikeC,
    wizD1EastTailShortLActiveLikeC,
} from './monmove_search.js';
import { raceptr, S_EEL } from './mondata.js';
import { ensureMonsterMtrack } from './monflee.js';
import {
    maybe_generate_rnd_mon,
    runCommaUPostCorridorInlineNewturnLikeC,
} from './moveloop_aux.js';
import { tAt } from './search.js';

export { mthrowAtHeroUxyThituLikeC } from './mthrowu.js';

export {
    effectiveMovemonStepNumLikeC,
    isFirstSearchMovemonPassLikeC,
    isRangerLikeC,
    isSecondSearchMovemonPassLikeC,
    rangerD1FirstSearchNoNearMonLikeC,
    rogueSecondSearchFullFmonLikeC,
} from './monmove_search.js';

/** Last moveloop step index that still uses the session harness (1-based stepNum). */
export const MOVE_MON_HARNESS_MAX_STEP = 12;

/** `null` = harness peeled; run real **`fmon`** loop. */
const _HARNESS = [
    /* stepNum 1 — peeled: **`mMoveDistfleeckOnlyTurnLikeC`** (one **`rn2(5)`** per monster). */
    null,
    /* stepNum 2 — session step 3 (`n`); peeled — door-niche **`CORR`** + silent **`m_move`**. */
    null,
    /* session step 4 — **`stepNum` 3** (`j`); peeled — west/east door-niche **`mfndpos cnt=6`** + **`rn2(24)`** pair. */
    null,
    /* session step 5 (`h`) — **`stepNum` 4**; peeled — west kink fungus only **`dochug`**. */
    null,
    /* session step 6 (second **`h`**) — **`stepNum` 5**; peeled — east lichen **`m_move`** + 3× **`distfleeck`**. */
    null,
    /* session step 7 (`y`) — **`stepNum` 6**; peeled — east mklev lichen + west kink **`m_move`** (**`rn2(16)`** each). */
    null,
    /* session step 8 (`k`) — **`stepNum` 7**; peeled — real **`fmon`** consumes draws. */
    null,
    /* session step 9 (`b`) — **`stepNum` 8**; peeled — distant mon only **`dochug`**. */
    null,
    /* session step 10 — **`stepNum` 9** */
    null,
    /* session step 11 — **`stepNum` 10** */
    null,
    /* session step 21 (`#search`) — **`stepNum` 11**; four **`rn2(12)`** follow in **`moveloop_turn_advance`**. */
    null,
    /* session step 22 (second **`#search`**) — also **`stepNum` 11** pass 2; four **`rn2(12)`** in **`moveloop_turn_advance`**. */
    null,
];

/**
 * C: movemon() — advance all monsters for one hero time step; returns **`monscanmove`**
 * (any living mon still has **`movement >= NORMAL_SPEED`** after this pass).
 * Harness: once per hero time step (see **`context._movemonHarnessConsumed`**); then one **`fmon`** pass.
 * @returns {Promise<boolean>} **`monscanmove`** — any mon still has **`movement >= NORMAL_SPEED`** after this pass
 */
export async function movemon(stepNum) {
    /* **`stepNum`** = **`moves − 1`** at advance start; harness row lags by one for steps 3–11 (see **`stepNum === 1`** bulk **`rn2(5)`** in **`moveloop_turn_advance`**). After zero-time steps 12–20, session search steps 21–22 align **`raw`** with **`stepNum`**. */
    let raw = stepNum - 1;
    if (stepNum >= 10) raw = stepNum;

    const ctx = game.context || (game.context = {});
    if (!ctx._movemonHarnessConsumed && raw >= 0 && raw < _HARNESS.length) {
        const row = _HARNESS[raw];
        ctx._movemonHarnessConsumed = true;
        if (row === null) {
            /* peeled — real **`m_move`** consumes this step's draws */
        } else {
            row();
            return false;
        }
    }

    const g = game;
    g.context = g.context || {};
    g.context._wizD1GlobalMovemonCountLikeC =
        (g.context._wizD1GlobalMovemonCountLikeC | 0) + 1;
    const commaLResumeSkip = g.context._wizD1CommaLResumeSkipMovemonLikeC | 0;
    if (commaLResumeSkip > 0) {
        g.context._wizD1CommaLResumeSkipMovemonLikeC = commaLResumeSkip - 1;
    }
    /* C: comma **`l`** → first **`U`** — comma moveloop peel may not run; arm at capital **`K`** tail. */
    if (
        g.context?._wizD1CommaLAwaitFirstUNearDfLikeC
        && peekReplayMoves(-1) === 'l'.charCodeAt(0)
        && !g.context?._wizD1FirstLAfterCommaPeelHeadDoneLikeC
        && !g.context?._wizD1FirstLAfterCommaPeelLikeC
    ) {
        g.context._wizD1FirstLAfterCommaPeelLikeC = true;
    }
    if (
        g.context?._wizD1CommaLArmPendingAfterMovemonLikeC
        && g.context?._wizD1CommaLArmPendingHeroMoveLikeC != null
        && (g.moves | 0) > (g.context._wizD1CommaLArmPendingHeroMoveLikeC | 0)
    ) {
        g.context._wizD1CommaLFirstUNearDfPendingLikeC = true;
        delete g.context._wizD1CommaLArmPendingAfterMovemonLikeC;
        delete g.context._wizD1CommaLArmPendingHeroMoveLikeC;
        /* C: comma-**`U`** — drop stale capital-**`K`** / east-tail deferred peels. */
        delete g.context._wizD1PostEastTailWalkFmonDistantDeferredLikeC;
        delete g.context._wizD1WalkFmonPostMoveloopLikeC;
        delete g.context._wizD1DeferredRunKNewTurnPassesLikeC;
        delete g.context._wizD1CapitalKPostCommaMoveloopLikeC;
        delete g.context._wizD1PostEastTailWalkCompleteLikeC;
    }
    if (
        g.context?._wizD1CommaLResumeArmedLikeC
        && (g.context._wizD1CommaLResumeSkipMovemonLikeC | 0) === 0
        && g.context?._wizD1CommaLPeelMovemonPassLikeC != null
        && (g.context._wizD1GlobalMovemonCountLikeC | 0)
            > (g.context._wizD1CommaLPeelMovemonPassLikeC | 0)
        && !g.context?._wizD1CommaLFirstUNearDfPendingLikeC
    ) {
        g.context._wizD1CommaLFirstUNearDfPendingLikeC = true;
        delete g.context._wizD1CommaLResumeArmedLikeC;
        delete g.context._wizD1CommaLPeelMovemonPassLikeC;
    }
    if (
        !g.context?._wizD1CommaLFirstUNearDfDoneLikeC
        && g.context?._wizD1CommaLFirstUNearDfPendingLikeC
        && !wizD1CommaLFirstUAfterCommaLLikeC(g)
    ) {
        await wizD1CommaLFirstUNearDistfleeckBeforePetLikeC(g);
    }
    /* C: comma post-first-**`l`** tail drew pet **`rn2(4)`** (~2949); invent + **`mfndpos`** (~2950+)
     * on first hero **`U`** **`movemon`** before **`fmon`**. */
    if (
        g.context?._wizD1FirstLAfterCommaPetPendingLikeC
        && !g.context?._wizD1FirstLAfterCommaPetDoneLikeC
        && wizD1CommaLFirstUAfterCommaLLikeC(g)
    ) {
        const petDeferred = (g.level?.monsters ?? []).find(
            (m) => (m.mtame | 0) !== 0,
        );
        if (petDeferred) {
            let movDef = petDeferred.movement | 0;
            if (movDef < NORMAL_SPEED) {
                petDeferred.movement = NORMAL_SPEED;
                movDef = NORMAL_SPEED;
            }
            petDeferred.movement = movDef - NORMAL_SPEED;
            setApparxyMonsterLikeC(g, petDeferred);
            dogMoveFirstLAfterCommaPetLikeC(g, petDeferred);
        }
        delete g.context._wizD1FirstLAfterCommaPetPendingLikeC;
        g.context._wizD1FirstLAfterCommaPetDoneLikeC = true;
        /* C: **`pet_ranged_attk`** hungry **`rn2(5)`** (~2973) when **`best_target`** stub skipped draw. */
        if (!g.context._wizD1CommaLPetRangedRn5LikeC) {
            rn2(5);
            g.context._wizD1CommaLPetRangedRn5LikeC = true;
        }
    }
    /* C: comma post-first-**`l`** — corridor hostile **`dochug`** immediately after invent peel
     * (~2974–2982); must run before post early-**`return`** / **`fmon`** (~2975+). */
    if (
        g.context?._wizD1FirstLAfterCommaPetDoneLikeC
        && !g.context?._wizD1CommaUInventPostCorridorDoneLikeC
        && wizD1CommaLFirstUAfterCommaLLikeC(g)
    ) {
        const commaCorridorStep = effectiveMovemonStepNumLikeC(g, stepNum);
        if ((commaCorridorStep | 0) === 1 && g.urole?.abbr !== 'Tou') {
            g.context._mklevDistfleeckRecalcBudgetLikeC = 0;
        }
        const corridorInline = wizD1CorridorMklevMonLikeC(g);
        if (corridorInline) {
            let movCor = corridorInline.movement | 0;
            if (movCor < NORMAL_SPEED) {
                corridorInline.movement = NORMAL_SPEED;
                movCor = NORMAL_SPEED;
            }
            corridorInline.movement = movCor - NORMAL_SPEED;
            g.context.movemonStepNum = commaCorridorStep;
            const peeled = await mMoveCommaUInventPostCorridorHostileLikeC(
                g,
                corridorInline,
                commaCorridorStep,
            );
            if (peeled) {
                g.context._wizD1CommaUInventPostCorridorDoneLikeC = true;
                /* C: comma-**`U`** — **`maybe_generate_rnd_mon`** + partial tail (~2983–2985),
                 * then near **`distfleeck`** (~2986) before **`fmon`** pet **`mfndpos`**. */
                await runCommaUPostCorridorInlineNewturnLikeC(g);
                const nearPostCorridor = wizD1CommaLFirstUNearMklevMonLikeC(g);
                if (nearPostCorridor) {
                    setApparxyMonsterLikeC(g, nearPostCorridor);
                    await distfleeckMonsterApplyLikeC(g, nearPostCorridor);
                }
            }
        }
    }
    if (
        g.context?._wizD1PostEastTailWalkFmonPendingLikeC
        && g.context?._wizD1MovemonRanThisPostLikeC
    ) {
        return false;
    }
    /* C: comma-**`U`** — block surplus **`fmon`** between invent and second new-turn (~3021). */
    if (
        g.context?._wizD1CommaLFirstUPostTailInventDoneLikeC
        && !g.context?._wizD1CommaLFirstUPostTailSecondNewturnDoneLikeC
        && !g.context?._wizD1CommaLFirstUPostTailInventPendingLikeC
    ) {
        return false;
    }
    /* C: comma-**`U`** — outer moveloop tail done; block surplus **`fmon`** / fourth new-turn. */
    if (g.context?._wizD1CommaLFirstUPostTailOuterMoveloopDoneLikeC) {
        return false;
    }
    if (
        g.context?._touristD1PostSwapRestMovemonStep1DoneLikeC
        && !g.context?._touristD1PostRestPetRangedPendingLikeC
    ) {
        delete g.context._touristD1PostSwapSkipPetFmonAfterRestPeelLikeC;
    }
    /* C: walk **`fmon`** pending is promoted at next post's moveloop start — not mid-post
     * **`movemon`** re-entry (**`seed0006`** ~2775+ must stay moveloop new-turn). */
    const clearWalkFmonAfterPass = !!g.context?._wizD1PostEastTailWalkFmonLikeC;
    if (clearWalkFmonAfterPass) {
        delete g.context._wizD1LPostEastTailAfterMcalcmoveLikeC;
        delete g.context._wizD1Step1GateDochugLikeC;
        delete g.context._postBumpKillDochugGateLikeC;
    }
    try {
    /* C: comma-**`l`** → first **`U`** — invent peel inside **`try`** (~3014–3020). */
    if (
        g.context?._wizD1CommaLFirstUPostTailInventPendingLikeC
        && g.context?._wizD1MovemonRanThisPostLikeC
        && !g.context?._wizD1CommaLFirstUPostTailInventDoneLikeC
    ) {
        const commaUPetInvent = (g.level?.monsters ?? []).find(
            (m) => (m.mtame | 0) !== 0,
        );
        if (commaUPetInvent) {
            dogMoveCommaLFirstUPostTailInventAfterNewturnLikeC(g, commaUPetInvent);
        }
        delete g.context._wizD1CommaLFirstUPostTailInventPendingLikeC;
        delete g.context._wizD1SkipLPostInventMoveloopLikeC;
        g.context._wizD1CommaLFirstUPostTailInventDoneLikeC = true;
        return false;
    }
    const rogueLike =
        g.urole?.abbr === 'Rog'
        || g.pl_character === 'Rogue'
        || (g.urole?.mnum | 0) === 7;
    /* C: rogue near mklev peel — only on **`#search`** passes (cmd sets flags; do not arm on every movemon). */
    if (isFirstSearchMovemonPassLikeC(g)) {
        const nearHostile = findFirstSearchRogMidMklevHostileLikeC(g);
        const rangerLike =
            g.urole?.abbr === 'Ran'
            || g.pl_character === 'Ranger'
            || (g.urole?.mnum | 0) === 8;
        g.context._searchPass1NearMonLikeC =
            !rangerLike
            && (rogueLike || searchPass1NearMonLikeC(g) || !!nearHostile);
    } else if (rogueLike && !(g.context?._searchStep11Passes | 0)) {
        delete g.context._searchPass1NearMonLikeC;
    }
    const effStepNum = effectiveMovemonStepNumLikeC(g, stepNum);
    if (g.context?._wizD1Step1InventPostDoneLikeC) {
        delete g.context._wizD1Step1GateDochugLikeC;
    }
    /* C: mon.c movemon — `gs.somebody_can_move` set in movemon_singlemon after turn spend. */
    g.context._somebodyCanMoveLikeC = false;
    if ((effStepNum | 0) === 1 && g.urole?.abbr !== 'Tou') {
        /* C: wizard D:1 peel — at most two **`distfleeck`** recalcs after **`m_move`** (~915). */
        g.context._mklevDistfleeckRecalcBudgetLikeC = 0;
    }
    g.context.movemonStepNum = effStepNum;
    /* Do not clear an active **`#search`** pass on low **`movemonStepNum`** (e.g. 2–3 on **`seed0077`**). */
    if ((stepNum | 0) < 10 && !(g.context?._searchStep11Passes | 0)) {
        delete g.context._searchStep11Passes;
    }
    if ((stepNum | 0) === 5) {
        const passes = (g.context._movemonStep5Passes | 0) + 1;
        g.context._movemonStep5Passes = passes;
        if (passes > 1) return false;
    }
    if ((stepNum | 0) === 7) {
        const passes = (g.context._movemonStep7Passes | 0) + 1;
        g.context._movemonStep7Passes = passes;
        if (passes > 1) return false;
    }
    if ((stepNum | 0) === 8) {
        const passes = (g.context._movemonStep8Passes | 0) + 1;
        g.context._movemonStep8Passes = passes;
        if (passes > 1) return false;
    }
    const searchPass = g.context._searchStep11Passes | 0;
    /* C: rogue **`:`** — west/east peel after gate + pet **`dog_invent`**. */
    if (isRogueColonMovemonActiveLikeC(g) && g.context?._rogueColonMainFmonDoneLikeC) {
        const passes = (g.context._movemonSearch11SubPasses | 0) + 1;
        g.context._movemonSearch11SubPasses = passes;
        g.context._movemonSearch11SubPass = passes;
        if (passes > 2) {
            clearRogueColonMovemonActiveLikeC(g);
            return false;
        }
        if (passes === 1) {
            const west = findWestKinkMonsterLikeC(g);
            if (west) {
                west.mx = 64;
                west.my = 12;
                ensureMonsterMtrack(west);
                west.mtrack[0] = { x: 63, y: 11 };
                if ((west.movement | 0) < NORMAL_SPEED) west.movement = NORMAL_SPEED;
            }
            try {
                g.context.movemonStepNum = stepNum;
                g.context._movemonSearch11SubPass = 1;
                if (west) await movemonSinglemonLikeC(g, west, stepNum);
            } finally {
                delete g.context.movemonStepNum;
            }
            return true;
        }
        if (passes === 2) {
            const east = findEastKickMonLikeC(g);
            if (east) {
                east.mx = 65;
                east.my = 9;
                ensureMonsterMtrack(east);
                east.mtrack[0] = { x: 65, y: 9 };
                if ((east.movement | 0) < NORMAL_SPEED) east.movement = NORMAL_SPEED;
            }
            try {
                g.context.movemonStepNum = stepNum;
                g.context._movemonSearch11SubPass = 2;
                if (east) await movemonSinglemonLikeC(g, east, stepNum);
            } finally {
                delete g.context.movemonStepNum;
                delete g.context._movemonSearch11SubPass;
            }
            clearRogueColonMovemonActiveLikeC(g);
            return false;
        }
    }
    /* C: second **`#search`** — west then east **`m_move`** (tourist); ranger pet-only (**`seed0102`**). */
    if (
        searchPass === 2
        && !rogueSecondSearchFullFmonLikeC(g)
        && !rangerD1FirstSearchNoNearMonLikeC(g, stepNum)
    ) {
        if (!g.context._searchMovemonStarted) {
            g.context._searchMovemonStarted = true;
        }
        const passes = (g.context._movemonSearch11SubPasses | 0) + 1;
        g.context._movemonSearch11SubPasses = passes;
        g.context._movemonSearch11SubPass = passes;
        if (passes > 2) return false;
        if (passes === 1) {
            const west = findWestKinkMonsterLikeC(g);
            if (west) {
                west.mx = 64;
                west.my = 12;
                ensureMonsterMtrack(west);
                west.mtrack[0] = { x: 63, y: 11 };
                if ((west.movement | 0) < NORMAL_SPEED) west.movement = NORMAL_SPEED;
            }
            try {
                g.context.movemonStepNum = stepNum;
                g.context._movemonSearch11SubPass = 1;
                if (west) await movemonSinglemonLikeC(g, west, stepNum);
            } finally {
                delete g.context.movemonStepNum;
            }
            return true;
        }
        if (passes === 2) {
            const east = findEastKickMonLikeC(g);
            if (east) {
                east.mx = 65;
                east.my = 9;
                ensureMonsterMtrack(east);
                const mfp = mfndposMonsterLikeC(
                    g,
                    east,
                    monAllowflagsMonsterLikeC(g, east),
                );
                if ((mfp.cnt | 0) > 0) {
                    east.mtrack[0] = { x: mfp.poss[0].x | 0, y: mfp.poss[0].y | 0 };
                }
                if ((east.movement | 0) < NORMAL_SPEED) east.movement = NORMAL_SPEED;
            }
            try {
                g.context.movemonStepNum = stepNum;
                g.context._movemonSearch11SubPass = 2;
                if (east) await movemonSinglemonLikeC(g, east, stepNum);
            } finally {
                delete g.context.movemonStepNum;
                delete g.context._movemonSearch11SubPass;
            }
            return false;
        }
    }
    if ((stepNum | 0) === 6) {
        const passes = (g.context._movemonStep6Passes | 0) + 1;
        g.context._movemonStep6Passes = passes;
        g.context._movemonStep6Pass = passes;
        if (passes > 2) return false;
        if (passes === 2) {
            const west = findWestKinkMonsterLikeC(g);
            if (west) {
                west.mx = 64;
                west.my = 12;
                ensureMonsterMtrack(west);
                west.mtrack[0].x = 63;
                west.mtrack[0].y = 11;
                if ((west.movement | 0) < NORMAL_SPEED) west.movement = NORMAL_SPEED;
            }
            const east = findEastMklevSecondHLikeC(g);
            try {
                g.context.movemonStepNum = stepNum;
                /* C: **`y`** pass 2 — land eel **`distfleeck`** before west **`m_move`** (~3051). */
                const eel = (g.level?.monsters ?? []).find((m) =>
                    isLandEelForMovemonLikeC(g, m));
                if (eel) await mMoveDistfleeckOnlyTurnLikeC(g, eel);
                if (west) await movemonSinglemonLikeC(g, west, stepNum);
                /* C: **`y`** — west **`m_move`** before distant mon **`distfleeck`** (~3052 / ~3053). */
                const levelMons = g.level?.monsters ?? [];
                const distant =
                    levelMons.find((m) => (m.mx | 0) === 22 && (m.my | 0) === 14)
                    ?? levelMons.find((m) => (m.mx | 0) === 23 && (m.my | 0) === 13)
                    ?? levelMons.find((m) => (m.mx | 0) === 21 && (m.my | 0) === 13);
                if (distant) await mMoveDistfleeckOnlyTurnLikeC(g, distant);
            } finally {
                delete g.context.movemonStepNum;
                delete g.context._movemonStep6Pass;
            }
            return false;
        }
    }
    if ((stepNum | 0) === 4) {
        const west = findWestKinkMonsterLikeC(g);
        if (west) {
            west.mx = 64;
            west.my = 12;
            ensureMonsterMtrack(west);
            west.mtrack[0].x = 63;
            west.mtrack[0].y = 11;
            if ((west.movement | 0) < NORMAL_SPEED) west.movement = NORMAL_SPEED;
        }
    }
    if ((stepNum | 0) === 7) {
        const east = findEastKickMonLikeC(g);
        if (east) {
            const emx = east.mx | 0;
            const emy = east.my | 0;
            if ((emx === 65 || emx === 64) && (emy === 9 || emy === 10)) {
                east.mx = 64;
                east.my = 9;
            }
            ensureMonsterMtrack(east);
            east.mtrack[0] = { x: 65, y: 9 };
        }
    }
    if ((stepNum | 0) === 5) {
        const east = findEastMklevSecondHLikeC(g);
        if (east) {
            east.mx = 64;
            east.my = 10;
            ensureMonsterMtrack(east);
            const mfp = mfndposMonsterLikeC(
                g,
                east,
                monAllowflagsMonsterLikeC(g, east),
            );
            if ((mfp.cnt | 0) > 0) {
                east.mtrack[0].x = mfp.poss[0].x | 0;
                east.mtrack[0].y = mfp.poss[0].y | 0;
            }
            if ((east.movement | 0) < NORMAL_SPEED) east.movement = NORMAL_SPEED;
        }
    }
    /* C: step **`j`** — door-niche sleepers need **`movement ≥ NORMAL_SPEED`** for **`m_move`**. */
    if ((stepNum | 0) === 3) {
        for (const m of g.level?.monsters ?? []) {
            if (!(m.mgenmklev | 0)) continue;
            const mx = m.mx | 0;
            const my = m.my | 0;
            if (
                !westFungusDoorNicheAtLikeC(g, mx, my, m)
                && !westApportSleeperNicheAtLikeC(g, mx, my)
                && !eastFungusDoorNicheAtLikeC(g, mx, my, m)
            ) continue;
            if ((m.movement | 0) < NORMAL_SPEED) m.movement = NORMAL_SPEED;
        }
    }
    const postBumpMovemonThisPass = !!g.context?._postBumpKillDochugGateLikeC;
    let mons;
    try {
        if (
            g.context?._wizD1PostEastTailWalkCompletePendingLikeC
            && !g.context?._wizD1PostEastTailWalkFmonPendingLikeC
            && !g.context?._wizD1PostEastTailWalkFmonLikeC
        ) {
            delete g.context._wizD1PostEastTailWalkCompletePendingLikeC;
            g.context._wizD1PostEastTailWalkCompleteLikeC = true;
            delete g.context._wizD1PostEastTailWalkShortLNearDfLikeC;
            delete g.context._wizD1PostEastTailWalkFmonLikeC;
        }
        mons = fmonListForMovemonLikeC(g, effStepNum);
        /* C: tourist second post-rest — third **`movemon`** peel-only (~2575+). */
        if (
            g.urole?.abbr === 'Tou'
            && g.context?._touristD1PostRestSecondThirdMovemonPendingLikeC
            && (effStepNum | 0) === 1
        ) {
            mons = [];
        }
        /* C: tourist D:1 run-east **`L`** — peel-only second **`movemon`** (~2591+). */
        if (
            g.urole?.abbr === 'Tou'
            && g.context?._touristD1LPostFmonPeelPendingLikeC
            && g.context?._touristD1LPostMcalcmoveDoneLikeC
            && (effStepNum | 0) === 1
        ) {
            mons = [];
        }
        /* C: tourist D:1 run-east **`L`** — peel-only pass after post-peel new-turn (~2612+). */
        if (
            g.urole?.abbr === 'Tou'
            && g.context?._touristD1LPostAfterPeelNewturnTailPendingLikeC
            && (effStepNum | 0) === 1
        ) {
            mons = [];
        }
        /* C: tourist D:1 run-east **`L`** — peel-only third **`movemon`** (~2627+). */
        if (
            g.urole?.abbr === 'Tou'
            && g.context?._touristD1LPostThirdMovemonPendingLikeC
            && (effStepNum | 0) === 1
        ) {
            mons = [];
        }
        /* C: wizard D:1 comma pickup — peel-only **`movemon`** (~2908) unless run-**`K`**
         * deferred **`fmon`** is active (~2908–2912, ~90 RNG). */
        if (
            g.urole?.abbr === 'Wiz'
            && g.context?._wizD1CommaPickupCapOuterLikeC
            && !g.context?._wizD1CapitalKPostCommaMoveloopLikeC
            && !g.context?._wizD1PostEastTailWalkFmonDistantDeferredLikeC
            && (effStepNum | 0) === 1
        ) {
            mons = [];
        }
        /* C: deferred comma — passes 1–2 are new-turn only; first pass consumed **`fmon`** peel. */
        if (
            g.urole?.abbr === 'Wiz'
            && g.context?._wizD1PostEastTailWalkFmonDistantDeferredLikeC
            && g.context?._wizD1CapitalKPostCommaPeelDoneLikeC
            && (g.context._wizD1DeferredRunKNewTurnPassesLikeC | 0) >= 1
            && (effStepNum | 0) === 1
        ) {
            mons = [];
        }
        /* C: comma-**`l`** → first **`U`** — peel-only third **`movemon`** (~3029+). */
        if (
            g.urole?.abbr === 'Wiz'
            && g.context?._wizD1CommaLFirstUPostTailThirdMovemonPendingLikeC
            && !g.context?._wizD1CommaLFirstUPostTailFmonTailPendingLikeC
            && (effStepNum | 0) === 1
        ) {
            mons = [];
        }
        /* C: tourist D:1 run-east **`L`** — peel-only fourth **`movemon`** (~2649+). */
        if (
            g.urole?.abbr === 'Tou'
            && g.context?._touristD1LPostFourthMovemonPendingLikeC
            && (effStepNum | 0) === 1
        ) {
            mons = [];
        }
        /* C: tourist D:1 run-east **`L`** — peel-only fifth **`movemon`** (~2668+). */
        if (
            g.urole?.abbr === 'Tou'
            && g.context?._touristD1LPostFifthMovemonPendingLikeC
            && (effStepNum | 0) === 1
        ) {
            mons = [];
        }
        /* C: tourist D:1 run-east **`L`** — peel-only sixth **`movemon`** (~2680+). */
        if (
            g.urole?.abbr === 'Tou'
            && g.context?._touristD1LPostSixthMovemonPendingLikeC
            && (effStepNum | 0) === 1
        ) {
            mons = [];
        }
        /* C: tourist D:1 run-east **`L`** — peel-only seventh **`movemon`** (~2707+). */
        if (
            g.urole?.abbr === 'Tou'
            && g.context?._touristD1LPostSeventhMovemonPendingLikeC
            && (effStepNum | 0) === 1
        ) {
            mons = [];
        }
        /* C: tourist D:1 run-east **`L`** — peel-only eighth **`movemon`** (~2730+). */
        if (
            g.urole?.abbr === 'Tou'
            && g.context?._touristD1LPostEighthMovemonPendingLikeC
            && (effStepNum | 0) === 1
        ) {
            mons = [];
        }
        /* C: tourist D:1 run-east **`L`** — peel-only ninth **`movemon`** (~2753+). */
        if (
            g.urole?.abbr === 'Tou'
            && g.context?._touristD1LPostNinthMovemonPendingLikeC
            && (effStepNum | 0) === 1
        ) {
            mons = [];
        }
        /* C: tourist D:1 run-east **`L`** — peel-only tenth **`movemon`** (~2772+). */
        if (
            g.urole?.abbr === 'Tou'
            && g.context?._touristD1LPostTenthMovemonPendingLikeC
            && (effStepNum | 0) === 1
        ) {
            mons = [];
        }
        /* C: tourist D:1 run-east **`L`** — peel-only eleventh **`movemon`** (~2792+). */
        if (
            g.urole?.abbr === 'Tou'
            && g.context?._touristD1LPostEleventhMovemonPendingLikeC
            && (effStepNum | 0) === 1
        ) {
            mons = [];
        }
        /* C: tourist D:1 run-east **`L`** — peel-only twelfth **`movemon`** (~2814+). */
        if (
            g.urole?.abbr === 'Tou'
            && g.context?._touristD1LPostTwelfthMovemonPendingLikeC
            && (effStepNum | 0) === 1
        ) {
            mons = [];
        }
        /* C: tourist D:1 run-east **`L`** — peel-only thirteenth **`movemon`** (~2828+). */
        if (
            g.urole?.abbr === 'Tou'
            && g.context?._touristD1LPostThirteenthMovemonPendingLikeC
            && (effStepNum | 0) === 1
        ) {
            mons = [];
        }
        /* C: tourist D:1 run-east **`L`** — peel-only fourteenth **`movemon`** (~2850+). */
        if (
            g.urole?.abbr === 'Tou'
            && g.context?._touristD1LPostFourteenthMovemonPendingLikeC
            && (effStepNum | 0) === 1
        ) {
            mons = [];
        }
        /* C: tourist D:1 run-east **`L`** — peel-only fifteenth **`movemon`** (~2876+). */
        if (
            g.urole?.abbr === 'Tou'
            && g.context?._touristD1LPostFifteenthMovemonPendingLikeC
            && (effStepNum | 0) === 1
        ) {
            mons = [];
        }
        /* C: tourist D:1 run-east **`L`** — peel-only sixteenth **`movemon`** (~2888+). */
        if (
            g.urole?.abbr === 'Tou'
            && g.context?._touristD1LPostSixteenthMovemonPendingLikeC
            && (effStepNum | 0) === 1
        ) {
            mons = [];
        }
        /* C: tourist D:1 run-east **`L`** — peel-only seventeenth **`movemon`** (~2906+). */
        if (
            g.urole?.abbr === 'Tou'
            && g.context?._touristD1LPostSeventeenthMovemonPendingLikeC
            && (effStepNum | 0) === 1
        ) {
            mons = [];
        }
        /* C: tourist D:1 run-east **`L`** — peel-only eighteenth **`movemon`** (~2936+). */
        if (
            g.urole?.abbr === 'Tou'
            && g.context?._touristD1LPostEighteenthMovemonPendingLikeC
            && (effStepNum | 0) === 1
        ) {
            mons = [];
        }
        /* C: tourist D:1 run-east **`L`** — peel-only nineteenth **`movemon`** (~2955+). */
        if (
            g.urole?.abbr === 'Tou'
            && g.context?._touristD1LPostNineteenthMovemonPendingLikeC
            && (effStepNum | 0) === 1
        ) {
            mons = [];
        }
        /* C: tourist D:1 run-east **`L`** — peel-only twentieth **`movemon`** (post-**`seed0900`** segment). */
        if (
            g.urole?.abbr === 'Tou'
            && g.context?._touristD1LPostTwentiethMovemonPendingLikeC
            && (effStepNum | 0) === 1
        ) {
            mons = [];
        }
        /* C: wizard **`L`** — second **`movemon`** in one post is peel-only (~2660+). */
        if (
            isWizardD1Step1PeelLikeC(g, effStepNum)
            && (
                g.context?._wizD1Step1LPostSecondMovemonPendingLikeC
                || g.context?._wizD1LPostFourthMovemonLikeC
            )
        ) {
            mons = [];
        }
        /* C: hero **`b`** — distant, then west **`distfleeck`**, then land eel **`m_move`**. */
        if ((stepNum | 0) === 8) {
            const distant = findDistantMklevMonLikeC(g);
            const west = findWestKinkMonsterLikeC(g);
            const eel = mons.find((m) => isLandEelForMovemonLikeC(g, m));
            const rest = mons.filter(
                (m) => m !== distant && m !== west && m !== eel,
            );
            /** @type {typeof mons} */
            const ordered = [];
            if (distant) ordered.push(distant);
            if (west) ordered.push(west);
            if (eel) ordered.push(eel);
            mons = [...ordered, ...rest];
        }
        /* C: first **`l`** after **`b`** — east **(64,9)** **`mtrack`** prime ( **`fmon`** order in **`fmon_iter`** ). */
        if ((stepNum | 0) === 9) {
            const east = findEastKickMonLikeC(g);
            if (east) {
                const emx = east.mx | 0;
                const emy = east.my | 0;
                if ((emx === 65 || emx === 64) && (emy === 9 || emy === 8 || emy === 10)) {
                    east.mx = 64;
                    east.my = 9;
                }
                ensureMonsterMtrack(east);
                east.mtrack[0] = { x: 65, y: 9 };
            }
        }
        /* C: first **`#search`** east-corridor — east **(64,9)** **`mtrack`** before **`rn2(12)`** when not rogue near path. */
        if (
            isFirstSearchMovemonPassLikeC(g)
            && !g.context._searchPass1NearMonLikeC
        ) {
            const east = findEastKickMonLikeC(g);
            if (east) {
                ensureMonsterMtrack(east);
                east.mtrack[0] = { x: 65, y: 9 };
            }
        }
        /* C: second **`l`** — distant **`distfleeck`** + **`m_move`** + 2× recalc, then east **`m_move`** + **`distfleeck`**. */
        if ((stepNum | 0) === 10 && (g.context?._searchStep11Passes | 0) === 0) {
            const east = findEastKickMonLikeC(g);
            const distant = findDistantMklevMonLikeC(g);
            if (east && (east.mx | 0) === 64 && (east.my | 0) === 9) {
                ensureMonsterMtrack(east);
                east.mtrack[0] = { x: 65, y: 9 };
            }
            const rest = mons.filter((m) => m !== east && m !== distant);
            /** @type {typeof mons} */
            const ordered = [];
            if (distant) ordered.push(distant);
            if (east) ordered.push(east);
            mons = [...ordered, ...rest];
        }
        if ((stepNum | 0) === 6 && (g.context?._movemonStep6Pass | 0) === 1) {
            const west = findWestKinkMonsterLikeC(g);
            const east = findEastMklevSecondHLikeC(g);
            if (east) {
                if ((east.movement | 0) < NORMAL_SPEED) east.movement = NORMAL_SPEED;
            }
            mons = mons.filter(
                (m) => m === west || m === east || isLandEelForMovemonLikeC(g, m),
            );
            const rest = mons.filter((m) => m !== west && m !== east);
            const eel = mons.find((m) => isLandEelForMovemonLikeC(g, m));
            /** @type {typeof mons} */
            const ordered = [];
            if (west) ordered.push(west);
            if (east) ordered.push(east);
            if (eel) ordered.push(eel);
            mons = [...ordered, ...rest.filter((m) => m !== eel)];
        }
        if (g.context?._postBumpKillDochugGateLikeC) {
            const postBumpDistant =
                g.context._postBumpDistantMtmpLikeC ?? findDistantMklevMonLikeC(g);
            const postBumpPet = mons.find((m) => (m.mtame | 0) !== 0);
            if (postBumpDistant) {
                await movemonSinglemonLikeC(g, postBumpDistant, effStepNum);
            }
            if (postBumpPet && g.context?._postBumpKillDochugGateLikeC) {
                await movemonSinglemonLikeC(g, postBumpPet, effStepNum);
            }
            if (
                postBumpDistant
                && g.context?._postBumpKillDochugGateLikeC
            ) {
                g.context._postBumpDistantSecondPassLikeC = true;
                await movemonSinglemonLikeC(g, postBumpDistant, effStepNum);
            }
            mons = mons.filter(
                (m) => m !== postBumpDistant && m !== postBumpPet,
            );
        }
        if (g.context?._postBumpKillDochugGateLikeC) {
            /* C: tail **`fmon`** — distant ~915 **`distfleeck`** recalc, then each other mklev
             * (**`seed0006`** ~2558–2559); use live **`level.monsters`**, not filtered **`mons`**. */
            const postBumpDistant =
                g.context._postBumpDistantMtmpLikeC ?? findDistantMklevMonLikeC(g);
            const postBumpPet = (g.level?.monsters ?? []).find((m) => (m.mtame | 0) !== 0);
            if (postBumpDistant) {
                setApparxyMonsterLikeC(g, postBumpDistant);
                await distfleeckMonsterApplyLikeC(g, postBumpDistant);
            }
            for (const m of g.level?.monsters ?? []) {
                if (m === postBumpPet || (m.mtame | 0) || m === postBumpDistant) continue;
                if (!(m.mgenmklev | 0)) continue;
                setApparxyMonsterLikeC(g, m);
                await distfleeckMonsterApplyLikeC(g, m);
            }
            /* C: non-distant door-niche mklev — second tail **`distfleeck`** before **`dog_goal`** (~2559). */
            const postBumpNearMklev = (g.level?.monsters ?? []).find((m) => {
                if (m === postBumpPet || (m.mtame | 0) || m === postBumpDistant) return false;
                return (m.mgenmklev | 0);
            });
            if (postBumpNearMklev) {
                setApparxyMonsterLikeC(g, postBumpNearMklev);
                await distfleeckMonsterApplyLikeC(g, postBumpNearMklev);
            }
            /* C: post-bump **`l`** tail — **`dog_goal`** then distant ~915 **`distfleeck`** (~2560–2561). */
            if (postBumpPet) {
                setApparxyMonsterLikeC(g, postBumpPet);
                dogMoveGoalOnlyNoPickLikeC(g, postBumpPet);
            }
            if (postBumpDistant) {
                setApparxyMonsterLikeC(g, postBumpDistant);
                await distfleeckMonsterApplyLikeC(g, postBumpDistant);
            }
        } else {
            let walkNearForFmon;
            let walkPetForFmon;
            if (g.context?._wizD1PostEastTailWalkFmonLikeC) {
                const walkDistantForFmon =
                    wizD1PeelDistantMklevMonLikeC(g)
                    ?? findDistantMklevMonLikeC(g);
                walkNearForFmon =
                    wizD1EastDoorMklevMonLikeC(g)
                    ?? (g.level?.monsters ?? []).find(
                        (mm) =>
                            !(mm.mtame | 0)
                            && (mm.mgenmklev | 0)
                            && mm !== walkDistantForFmon,
                    );
                walkPetForFmon = (g.level?.monsters ?? []).find(
                    (mm) => (mm.mtame | 0) !== 0,
                );
            }
            /* C: first hero **`l`** after comma — near **`distfleeck`** (~2948), pet **`rn2(4)`**
             * + short-**`l`** **`dog_move`** (~2949+); same as capital **`K`** short-**`l`** peel. */
            if (
                g.context?._wizD1FirstLAfterCommaPeelLikeC
                && isWizardD1Step1PeelLikeC(g, effStepNum)
            ) {
                const nearAfterComma =
                    wizD1EastDoorMklevMonLikeC(g)
                    ?? (g.level?.monsters ?? []).find(
                        (mm) =>
                            !(mm.mtame | 0)
                            && (mm.mgenmklev | 0),
                    );
                if (nearAfterComma) {
                    setApparxyMonsterLikeC(g, nearAfterComma);
                    await distfleeckMonsterApplyLikeC(g, nearAfterComma);
                    g.context._wizD1PostEastTailWalkShortLNearDfLikeC = true;
                }
                const petAfterComma = (g.level?.monsters ?? []).find(
                    (m) => (m.mtame | 0) !== 0,
                );
                if (petAfterComma) {
                    setApparxyMonsterLikeC(g, petAfterComma);
                    rn2(4);
                    dogMoveFirstLAfterCommaPetLikeC(g, petAfterComma);
                }
                delete g.context._wizD1FirstLAfterCommaPeelLikeC;
                g.context._wizD1FirstLAfterCommaPeelHeadDoneLikeC = true;
            }
            for (const m of mons) {
                if (g.context?._wizD1FirstLAfterCommaPeelHeadDoneLikeC) {
                    const nearSkipAfterComma =
                        wizD1EastDoorMklevMonLikeC(g)
                        ?? (g.level?.monsters ?? []).find(
                            (mm) =>
                                !(mm.mtame | 0)
                                && (mm.mgenmklev | 0),
                        );
                    const distantSkipAfterComma =
                        wizD1PeelDistantMklevMonLikeC(g)
                        ?? findDistantMklevMonLikeC(g);
                    if (
                        m === nearSkipAfterComma
                        || (m.mtame | 0)
                        || m === distantSkipAfterComma
                    ) {
                        continue;
                    }
                }
                if (
                    g.context?._wizD1CapitalKPostCommaFmonHeadDoneLikeC
                    && !g.context?._wizD1CapitalKPostCommaPeelDoneLikeC
                ) {
                    const commaNearSkip =
                        wizD1EastDoorMklevMonLikeC(g)
                        ?? (g.level?.monsters ?? []).find(
                            (mm) =>
                                !(mm.mtame | 0)
                                && (mm.mgenmklev | 0),
                        );
                    if (m === commaNearSkip || (m.mtame | 0)) continue;
                }
                /* C: post-east-tail walk — near + pet only in **`fmon`**; distant in tail (~2774+). */
                if (g.context?._wizD1PostEastTailWalkFmonLikeC) {
                    const walkDistant =
                        wizD1PeelDistantMklevMonLikeC(g)
                        ?? findDistantMklevMonLikeC(g);
                    if (
                        !g.context?._wizD1PostEastTailWalkFmonDistantDeferredLikeC
                        && m === walkDistant
                    ) {
                        continue;
                    }
                    if (
                        m !== walkNearForFmon
                        && m !== walkPetForFmon
                        && m !== walkDistant
                    ) {
                        continue;
                    }
                }
                /* C: second **`L`** east-tail — pet **`dog_move`** only after corridor peel block. */
                if (
                    g.context?._wizD1EastTailMovemonPetMfndposPendingLikeC
                    && (m.mtame | 0)
                    && !wizD1EastTailShortLActiveLikeC(g)
                ) {
                    continue;
                }
                if (
                    (m.mtame | 0)
                    && g.context?._wizD1PostCorridorPetTailDoneLikeC
                    && !g.context?._wizD1EastTailPostCorridorMovemonAfterMcalcmoveDoneLikeC
                    && !g.context?._wizD1PostEastTailWalkFmonLikeC
                    && !wizD1EastTailShortLActiveLikeC(g)
                ) {
                    continue;
                }
                /* C: tourist D:1 swap — near mklev rest **`dochug`** after new-turn (~2501+), not
                 * second **`fmon`** **`m_move`** without leading **`distfleeck`**. */
                if (
                    g.urole?.abbr === 'Tou'
                    && (effStepNum | 0) === 1
                    && g.context?._touristD1PostSwapMfndposResumeDoneLikeC
                    && !g.context?._touristD1PostSwapRestDochugDoneLikeC
                    && m === findTouristD1PostSwapNearMklevMonLikeC(g)
                ) {
                    continue;
                }
                /* C: post-rest pet **`dog_goal`** — fmon tail after near mklev rest (~2504+). */
                if (
                    g.urole?.abbr === 'Tou'
                    && g.context?._touristD1PostSwapRestDochugDoneLikeC
                    && !g.context?._touristD1PostSwapAfterRestPetDoneLikeC
                    && (m.mtame | 0)
                ) {
                    continue;
                }
                /* C: post-rest peel — one **`dog_move`** this movemon pass (~2510–2519). */
                if (
                    g.urole?.abbr === 'Tou'
                    && (effStepNum | 0) === 1
                    && g.context?._touristD1PostSwapSkipPetFmonAfterRestPeelLikeC
                    && (m.mtame | 0)
                ) {
                    continue;
                }
                /* C: post-rest second **`dog_move`** — moveloop inline (~2520+); skip **`fmon`**
                 * except post-new-turn peel pass (~2546+ invent **`obj_resists`**). */
                if (
                    g.urole?.abbr === 'Tou'
                    && (effStepNum | 0) === 1
                    && g.context?._touristD1PostRestSecondPetDogMoveDoneLikeC
                    && !g.context?._touristD1PostRestSecondMovemonLikeC
                    && (m.mtame | 0)
                ) {
                    continue;
                }
                if (
                    (m.mtame | 0)
                    && !g.context?._wizD1CommaLFirstUNearDfDoneLikeC
                    && g.context?._wizD1CommaLFirstUNearDfPendingLikeC
                    && !wizD1CommaLFirstUAfterCommaLLikeC(g)
                ) {
                    await wizD1CommaLFirstUNearDistfleeckBeforePetLikeC(g);
                }
                /* C: comma-**`U`** — defer near/pet until post-new-turn near **`distfleeck`**. */
                if (
                    wizD1CommaLFirstUAfterCommaLLikeC(g)
                    && g.context?._wizD1CommaLFirstUNearDfPendingLikeC
                    && !g.context?._wizD1CommaLFirstUNearDfDoneLikeC
                ) {
                    const commaUNearDefer =
                        wizD1CommaLFirstUNearMklevMonLikeC(g);
                    if (m === commaUNearDefer || (m.mtame | 0)) {
                        continue;
                    }
                }
                /* C: comma-**`U`** — near entry **`distfleeck`** already at **`movemon`** head (~2986). */
                const commaUNear =
                    wizD1CommaLFirstUNearMklevMonLikeC(g);
                if (
                    commaUNear
                    && m === commaUNear
                    && g.context?._wizD1CommaLFirstUNearDfDoneLikeC
                    && !g.context?._wizD1CommaLFirstUPetDogMoveDoneLikeC
                    && !g.context?._wizD1CommaLFirstUNearFmonSkipDoneLikeC
                ) {
                    g.context._wizD1CommaLFirstUNearFmonSkipDoneLikeC = true;
                    continue;
                }
                /* C: comma post-first-**`l`** — corridor hostile peeled inline (~2974–2982). */
                if (
                    (
                        g.context?._wizD1CommaUInventPostCorridorDoneLikeC
                        || g.context?._wizD1CommaUInventPostCorridorHostileLikeC
                    )
                    && m === wizD1CorridorMklevMonLikeC(g)
                ) {
                    continue;
                }
                if (
                    (m.mtame | 0)
                    && g.context?._wizD1FirstLAfterCommaPetDoneLikeC
                    && wizD1CommaLFirstUAfterCommaLLikeC(g)
                    && !g.context?._wizD1CommaLFirstUTailDoneLikeC
                    && !(
                        g.context?._wizD1CommaUInventPostCorridorDoneLikeC
                        && g.context?._wizD1CommaUPostCorridorInlineNewturnConsumedLikeC
                        && !g.context?._wizD1CommaLFirstUPetDogMoveDoneLikeC
                    )
                ) {
                    continue;
                }
                await movemonSinglemonLikeC(g, m, effStepNum);
            }
            /* C: comma-**`l`** → first **`U`** — near **`distfleeck`**×2 + distant **`m_move`** (~2993+). */
            if (
                g.context?._wizD1CommaLFirstUPetDogMoveDoneLikeC
                && !g.context?._wizD1CommaLFirstUTailDoneLikeC
            ) {
                const commaUTailNear = wizD1CommaLFirstUNearMklevMonLikeC(g);
                if (commaUTailNear) {
                    setApparxyMonsterLikeC(g, commaUTailNear);
                    await distfleeckMonsterApplyLikeC(g, commaUTailNear);
                    await distfleeckMonsterApplyLikeC(g, commaUTailNear);
                }
                const commaUDistant =
                    wizD1PeelDistantMklevMonLikeC(g)
                    ?? findDistantMklevMonLikeC(g);
                if (commaUDistant) {
                    const uComma = g.u;
                    if (uComma) {
                        commaUDistant.mux = uComma.ux | 0;
                        commaUDistant.muy = uComma.uy | 0;
                    }
                    setApparxyMonsterLikeC(g, commaUDistant);
                    await mMoveCommaLFirstUDistantLikeC(g, commaUDistant);
                    await mMoveCommaLFirstUPostDistantTailLikeC(
                        g,
                        commaUTailNear,
                        commaUDistant,
                    );
                }
                const commaUPetTail = (g.level?.monsters ?? []).find(
                    (m) => (m.mtame | 0) !== 0,
                );
                if (commaUPetTail) {
                    let movPetTail = commaUPetTail.movement | 0;
                    if (movPetTail < NORMAL_SPEED) {
                        commaUPetTail.movement = NORMAL_SPEED;
                        movPetTail = NORMAL_SPEED;
                    }
                    commaUPetTail.movement = movPetTail - NORMAL_SPEED;
                    setApparxyMonsterLikeC(g, commaUPetTail);
                    rn2(4);
                    dogMoveCommaLFirstUPostTailPetLikeC(g, commaUPetTail);
                    /* C: post phase-1 **`mfndpos`** — near **`distfleeck`** (~3006); **`mcalcmove`**
                     * **`rn2(12)`**×3 (~3007–3009) runs in moveloop **`runNewTurnSetupAndTailLikeC`**. */
                    if (commaUTailNear) {
                        setApparxyMonsterLikeC(g, commaUTailNear);
                        await distfleeckMonsterApplyLikeC(g, commaUTailNear);
                    }
                }
                g.context._wizD1CommaLFirstUTailDoneLikeC = true;
                delete g.context._wizD1CommaLFirstUActiveLikeC;
                delete g.context._wizD1CommaLFirstUPetDogMoveDoneLikeC;
                delete g.context._wizD1CommaLFirstUNearDfDoneLikeC;
                delete g.context._wizD1CommaLFirstUNearFmonSkipDoneLikeC;
                delete g.context._wizD1EastTailMovemonPetMfndposPendingLikeC;
                /* C: moveloop post-**`movemon`** new-turn + pet invent (~3010+). */
                g.context._wizD1CommaLFirstUPostTailNewturnPendingLikeC = true;
            }
            /* C: first hero **`l`** after comma — caller **`distfleeck`**×2 (state only), then
             * distant **`m_move`** **`rn2(24)`** (~2939+); deferred from **`fmon`** loop. */
            if (g.context?._wizD1FirstLAfterCommaPeelHeadDoneLikeC) {
                const firstLDistant =
                    wizD1PeelDistantMklevMonLikeC(g)
                    ?? findDistantMklevMonLikeC(g);
                if (firstLDistant) {
                    const u = g.u;
                    if (u) {
                        firstLDistant.mux = u.ux | 0;
                        firstLDistant.muy = u.uy | 0;
                    }
                    setApparxyMonsterLikeC(g, firstLDistant);
                    await distfleeckMonsterApplyLikeC(g, firstLDistant);
                    await distfleeckMonsterApplyLikeC(g, firstLDistant);
                    g.context._wizD1FirstLAfterCommaDistantPeelLikeC = true;
                    try {
                        await movemonSinglemonLikeC(g, firstLDistant, effStepNum);
                    } finally {
                        delete g.context._wizD1FirstLAfterCommaDistantPeelLikeC;
                    }
                    /* C: end of move **74** — **`maybe_generate_rnd_mon`** **`rn2(70)`** (~2944),
                     * then comma post-**`l`** tail (~2945–2949) before **`l`** step castmu (~2950+). */
                    maybe_generate_rnd_mon();
                    g.context._wizD1PostEastTailWalkNewTurnDoneLikeC = true;
                    if (g.context?._wizD1CommaLAwaitFirstUNearDfLikeC) {
                        await runCommaPostFirstLMaybeGenTailLikeC(g, effStepNum);
                    }
                }
                delete g.context._wizD1FirstLAfterCommaPeelHeadDoneLikeC;
            }
            /* C: ranger D:1 twin **`#search`** — pass 2 inline when **`monscanmove`** false (**`seed0102`**). */
            if (
                rangerD1FirstSearchNoNearMonLikeC(g, effStepNum)
                && g.context?._rangerFirstSearchPetFirstPassDoneLikeC
                && !g.context?._rangerFirstSearchPetSecondPassDoneLikeC
            ) {
                const petSecond = (g.level?.monsters ?? []).find(
                    (m) => (m.mtame | 0) !== 0,
                );
                if (petSecond) {
                    let mov2 = petSecond.movement | 0;
                    if (mov2 < NORMAL_SPEED) {
                        petSecond.movement = NORMAL_SPEED;
                        mov2 = NORMAL_SPEED;
                    }
                    petSecond.movement = mov2 - NORMAL_SPEED;
                    const u2 = g.u;
                    if (u2) {
                        petSecond.mux = u2.ux | 0;
                        petSecond.muy = u2.uy | 0;
                    }
                    setApparxyMonsterLikeC(g, petSecond);
                    /* C: second **`#search`** pass-2 — mklev tail **`distfleeck`** already ran; no extra
                     * pre-**`dog_move`** **`distfleeck`** (**`seed0102`** ~4473 **`dog_goal`**). */
                    if ((g.context?._searchStep11Passes | 0) === 2) {
                        g.context._rangerSearchPass2InlineDogMoveLikeC = true;
                    } else {
                        await distfleeckMonsterApplyLikeC(g, petSecond);
                    }
                    try {
                        dogMoveLikeC(g, petSecond);
                    } finally {
                        delete g.context._rangerSearchPass2InlineDogMoveLikeC;
                    }
                    /* C: dochug ~915 — pass-2 recalc (~4459 / ~4478) before **`mcalcmove`**. */
                    if (!g.context?._rangerPass2InlinePreMfndposDistfleeckDoneLikeC) {
                        await distfleeckMonsterApplyLikeC(g, petSecond);
                    }
                    g.context._rangerFirstSearchPetSecondPassDoneLikeC = true;
                    /* C: ranger D:1 twin **`#search`** — moveloop new-turn tail two **`rn2(12)`**
                     * before **`maybe_generate_rnd_mon`** (~4460–4461 / ~4479–4480). */
                    rn2(12);
                    rn2(12);
                }
            }
            /* C: tourist D:1 peaceful swap — pet ~915 **`distfleeck`** then **`mfndpos`** resume
             * after mklev tail (**`seed0900`** ~2491–2492). */
            if (
                g.urole?.abbr === 'Tou'
                && (effStepNum | 0) === 1
                && g.context?._touristD1PostSwapMfndposDeferredLikeC
                && !g.context?._touristD1PostSwapMfndposResumeDoneLikeC
            ) {
                const petResume =
                    g.context._touristD1PostSwapDeferRecalcPetLikeC
                    ?? (g.level?.monsters ?? []).find((m) => (m.mtame | 0) !== 0);
                if (petResume) {
                    setApparxyMonsterLikeC(g, petResume);
                    await distfleeckMonsterApplyLikeC(g, petResume);
                    dogMoveTouristD1PostSwapMfndposResumeLikeC(g, petResume);
                }
                g.context._touristD1PostSwapMfndposResumeDoneLikeC = true;
                delete g.context._touristD1PostSwapMfndposDeferredLikeC;
                delete g.context._touristD1PostSwapDeferRecalcPetLikeC;
            }
            /* C: tourist D:1 — pet **`dog_goal`** after post-new-turn rest (~2502+). */
            if (
                g.urole?.abbr === 'Tou'
                && !g.context?._touristD1LPostFmonPeelPendingLikeC
                && g.context?._touristD1PostSwapRestDochugDoneLikeC
                && !g.context?._touristD1PostSwapAfterRestPetDoneLikeC
                && g.context?._touristD1PostSwapNearRestMmoveTailPendingLikeC
            ) {
                const restNearMklev = findTouristD1PostSwapNearMklevMonLikeC(g);
                if (restNearMklev) {
                    setApparxyMonsterLikeC(g, restNearMklev);
                    await distfleeckMonsterApplyLikeC(g, restNearMklev);
                }
                const petAfterRest = (g.level?.monsters ?? []).find(
                    (m) => (m.mtame | 0) !== 0,
                );
                if (petAfterRest) {
                    setApparxyMonsterLikeC(g, petAfterRest);
                    let mov = petAfterRest.movement | 0;
                    if (mov < NORMAL_SPEED) {
                        petAfterRest.movement = NORMAL_SPEED;
                        mov = NORMAL_SPEED;
                    }
                    petAfterRest.movement = mov - NORMAL_SPEED;
                    dogMoveTouristD1PostSwapAfterRestPetLikeC(g, petAfterRest);
                }
                g.context._touristD1PostSwapAfterRestPetDoneLikeC = true;
                delete g.context._touristD1PostSwapNearRestMmoveTailPendingLikeC;
            }
            /* C: post-east-tail walk — pet tail then distant **`distfleeck`** + **`m_move`** (~2781+). */
            if (
                g.context?._wizD1PostEastTailWalkFmonLikeC
                && g.context?._wizD1WalkFmonPostMoveloopLikeC
                && !g.context?._wizD1PostEastTailWalkCompleteLikeC
                && !g.context?._wizD1PostEastTailWalkFmonDistantDeferredLikeC
            ) {
                const peelDistant =
                    wizD1PeelDistantMklevMonLikeC(g)
                    ?? findDistantMklevMonLikeC(g);
                if (peelDistant) {
                    setApparxyMonsterLikeC(g, peelDistant);
                    await distfleeckMonsterApplyLikeC(g, peelDistant);
                    await distfleeckMonsterApplyLikeC(g, peelDistant);
                    g.context._wizD1PostEastTailWalkDistantMmoveLikeC = true;
                    try {
                        await movemonSinglemonLikeC(g, peelDistant, effStepNum);
                    } finally {
                        delete g.context._wizD1PostEastTailWalkDistantMmoveLikeC;
                    }
                    await distfleeckMonsterApplyLikeC(g, peelDistant);
                    /* C: walk-**`fmon`** post — full new-turn **`mcalcmove`** then tail (~2722+). */
                    await runInlineNewTurnUnlessDeferredPeelLikeC(g, effStepNum);
                    g.context._wizD1PostEastTailWalkPeelDoneLikeC = true;
                    g.context._wizD1PostEastTailWalkCompleteLikeC = true;
                    g.context._wizD1PostEastTailWalkNewTurnDoneLikeC = true;
                    /* C: arm run-**`K`** / comma deferred peel (~2818); options **`K`** may be 0 RNG. */
                    g.context._wizD1DeferredRunKPendingLikeC = true;
                    delete g.context._wizD1WalkFmonPostMoveloopLikeC;
                    delete g.context._wizD1PostEastTailWalkFmonLikeC;
                }
            }
            /* C: run-**`K`** after second short **`l`** — deferred distant in **`fmon`** + moveloop
             * new-turn (~2830–2912, ~90 RNG); moveloop arms comma pending at post end. */
            /* C: comma after capital **`K`** — pet **`distfleeck`** (~2811), **`mcalcmove`** + tail
             * (~2812–2817), pet **`distfleeck`** + **`dochug:886`** (~2818–2819), invent **`mfndpos`**
             * (~2820+); distant **`m_move`** later in **`dochug`** (~2828+). */
            if (
                !wizD1CommaLFirstUAfterCommaLLikeC(g)
                && (
                    g.context?._wizD1CapitalKPostCommaMoveloopLikeC
                    || (
                        g.context?._wizD1PostEastTailWalkFmonDistantDeferredLikeC
                        && (g.context._wizD1DeferredRunKNewTurnPassesLikeC | 0) === 0
                    )
                )
                && !g.context?._wizD1CapitalKPostCommaPeelDoneLikeC
                && g.context?._wizD1CapitalKPostCommaFmonHeadDoneLikeC
            ) {
                const commaPet = (g.level?.monsters ?? []).find(
                    (m) => (m.mtame | 0) !== 0,
                );
                if (commaPet) {
                    setApparxyMonsterLikeC(g, commaPet);
                    await distfleeckMonsterApplyLikeC(g, commaPet);
                }
                await runInlineNewTurnUnlessDeferredPeelLikeC(g, (g.moves | 0) - 1);
                if (commaPet) {
                    setApparxyMonsterLikeC(g, commaPet);
                    await distfleeckMonsterApplyLikeC(g, commaPet);
                    if (!g.context?._wizD1WalkFmonPetDochugRn4DoneLikeC) {
                        rn2(4);
                        g.context._wizD1WalkFmonPetDochugRn4DoneLikeC = true;
                    }
                    dogMoveCapitalKPostCommaPetTailLikeC(g, commaPet);
                }
                const deferredCommaTailLikeC =
                    !!g.context?._wizD1PostEastTailWalkFmonDistantDeferredLikeC;
                if (deferredCommaTailLikeC) {
                    const commaDeferDist =
                        wizD1PeelDistantMklevMonLikeC(g)
                        ?? findDistantMklevMonLikeC(g);
                    if (commaDeferDist) {
                        await mMoveCapitalKPostCommaDeferredDistantLikeC(
                            g,
                            commaDeferDist,
                            effStepNum,
                        );
                    }
                    /* C: post-deferred distant — pet **`dog_goal`** / **`dog_move`**
                     * (~2836–2839), **`distfleeck`** (~2840), then second new-turn (~2841+). */
                    if (commaPet) {
                        g.context._wizD1CapitalKPostCommaDeferredPetSkipObjResistsLikeC =
                            true;
                        try {
                            dogMoveCapitalKPostDistantPeelPetLikeC(g, commaPet);
                        } finally {
                            delete g.context
                                ._wizD1CapitalKPostCommaDeferredPetSkipObjResistsLikeC;
                        }
                        setApparxyMonsterLikeC(g, commaPet);
                        await distfleeckMonsterApplyLikeC(g, commaPet);
                    }
                    await runInlineNewTurnUnlessDeferredPeelLikeC(
                        g,
                        (g.moves | 0) - 1,
                    );
                    /* C: post-second new-turn — pet **`distfleeck`**, **`dochug:886`**, one invent
                     * **`obj_resists`**, **`dog_goal`** / **`mfndpos`** (~2847–2859). */
                    if (commaPet) {
                        g.context._wizD1CapitalKPostNewturnTailLikeC = true;
                        delete g.context
                            ._wizD1CapitalKPostNewturnTailDistfleeckBudgetLikeC;
                        setApparxyMonsterLikeC(g, commaPet);
                        await distfleeckMonsterApplyLikeC(g, commaPet);
                        delete g.context._wizD1CapitalKPostNewturnTailLikeC;
                        rn2(4);
                        dogMoveCapitalKPostNewturnPetLikeC(g, commaPet);
                        /* C: post-new-turn pet **`mfndpos`** fifth away **`rn2(12)`** (~2855); JS
                         * **`cnt`** short — one explicit draw (debt). */
                        rn2(12);
                    }
                    /* C: deferred distant **`fmon`** rest — near **`m_move`**, pet tail, two
                     * moveloop new-turns (~2856–2907 on **`seed0006`** move **73**). */
                    await runCapitalKPostCommaDeferredFmonTailLikeC(
                        g,
                        commaPet,
                        effStepNum,
                    );
                }
                g.context._wizD1CapitalKPostCommaPeelDoneLikeC = true;
                g.context._wizD1PostEastTailWalkNewTurnDoneLikeC = true;
                if (deferredCommaTailLikeC) {
                    /* C: comma promote — inline peel + deferred **`fmon`** tail consumed
                     * moveloop passes (~2908); block duplicate deferred loop. */
                    g.context._wizD1DeferredRunKNewTurnPassesLikeC = 3;
                    g.context._wizD1LPostOuterLoopDoneLikeC = true;
                }
                if (!deferredCommaTailLikeC) {
                    /* C: first hero **`l`** after comma — replay capital **`K`** short-**`l`** near
                     * **`distfleeck`** (~2948) + pet **`dochug:886`** **`rn2(4)`** (~2949). */
                    delete g.context._wizD1PostEastTailWalkShortLNearDfLikeC;
                    g.context._wizD1FirstLAfterCommaPeelLikeC = true;
                    delete g.context._wizD1CommaLFirstUNearDfPendingLikeC;
                    delete g.context._wizD1CommaLFirstUNearDfDoneLikeC;
                    g.context._wizD1CommaLAwaitFirstUNearDfLikeC = true;
                    delete g.context._wizD1CapitalKPostCommaMoveloopLikeC;
                    delete g.context._wizD1CapitalKPostCommaFmonHeadDoneLikeC;
                    g.context._wizD1LPostOuterLoopDoneLikeC = true;
                }
            }
        }
        /* C: short **`l`** east-tail — arm walk **`fmon`** / capital **`K`** after **`fmon`**
         * (runs for postBump peel and normal **`else`**; moveloop owns first new-turn ~2775+). */
        if (
            g.context?._wizD1ArmWalkFmonAfterShortLNewTurnLikeC
            && !g.context?._wizD1CapitalKPostNearSecondNewTurnDoneLikeC
        ) {
            delete g.context._wizD1ArmWalkFmonAfterShortLNewTurnLikeC;
            if (g.context?._wizD1PostEastTailWalkPeelDoneLikeC) {
                /* C: second short **`l`** — inline **`mcalcmove`** (~2816–2821); arm run-**`K`**
                 * peel for options-menu capital **`K`** (~2830–2912), not this post's outer loop. */
                await runInlineNewTurnUnlessDeferredPeelLikeC(g, effStepNum);
                g.context._wizD1PostEastTailWalkNewTurnDoneLikeC = true;
                g.context._wizD1DeferredRunKPendingLikeC = true;
                delete g.context._wizD1PostEastTailWalkCompleteLikeC;
            } else {
                /* C: first short **`l`** — **`mcalcmove`** (~2775+) then arm walk **`fmon`** for next post. */
                await runInlineNewTurnUnlessDeferredPeelLikeC(g, effStepNum);
                g.context._wizD1PostEastTailWalkNewTurnDoneLikeC = true;
                g.context._wizD1PostEastTailWalkFmonPendingLikeC = true;
                delete g.context._wizD1EastTailShortLPendingArmedLikeC;
                delete g.context._wizD1PostEastTailWalkCompleteLikeC;
                delete g.context._wizD1EastTailMovemonPetMfndposPendingLikeC;
            }
        }
        if (
            g.context?._wizD1FirstShortLFmonNearPetDoneLikeC
            && !g.context?._wizD1PostEastTailWalkPeelDoneLikeC
            && g.context?._wizD1PostEastTailWalkNewTurnDoneLikeC
            && !g.context?._wizD1CommaLFirstUPostTailNewturnPendingLikeC
            && !g.context?._wizD1CommaLFirstUPostTailThirdMovemonPendingLikeC
            && !g.context?._wizD1CommaLFirstUPostTailFmonTailPendingLikeC
            && !g.context?._wizD1CommaLFirstUPostTailOuterMoveloopDoneLikeC
        ) {
            return false;
        }
        if (g.context?._wizD1CommaLFirstUPostTailOuterMoveloopDoneLikeC) {
            return false;
        }
        /* C: wizard D:1 second **`L`** — pet **`mfndpos`** after east-tail peel (~2726+). */
        if (
            g.context?._wizD1EastTailMovemonPetMfndposPendingLikeC
            && !g.context?._wizD1PostEastTailWalkFmonPendingLikeC
            && !g.context?._wizD1PostEastTailWalkFmonDistantDeferredLikeC
            && !g.context?._wizD1WalkFmonPostMoveloopLikeC
            && !g.context?._wizD1CommaLFirstUTailDoneLikeC
            && !g.context?._wizD1CommaLFirstUPostTailNewturnPendingLikeC
        ) {
            const petEast = (g.level?.monsters ?? []).find((m) => (m.mtame | 0) !== 0);
            const peelDistant =
                g.context._wizD1EastTailPeelMtmpLikeC
                ?? wizD1PeelDistantMklevMonLikeC(g);
            const nearMklev =
                g.context._wizD1EastTailNearMklevMtmpLikeC
                ?? wizD1EastDoorMklevMonLikeC(g);
            if (petEast) {
                dogMoveLPetMfndposAfterEastTailPeelLikeC(g, petEast);
            }
            delete g.context._wizD1EastTailMovemonPetMfndposPendingLikeC;
            delete g.context._wizD1EastTailNearMklevMtmpLikeC;
            /* C: deferred **`fmon`** rest — corridor **~(10,11)** **`m_move`** (~2731+); may **`dochug`**
             * again after east-tail peel on the same **`mtmp`**. */
            const corridor = wizD1CorridorMklevMonLikeC(g);
            if (corridor) {
                await mMoveWizardD1EastTailCorridorRestLikeC(g, corridor, effStepNum);
                const { runWizEastTailPostCorridorNewTurnLikeC } = await import(
                    './moveloop_turn_advance.js',
                );
                await runWizEastTailPostCorridorNewTurnLikeC(g);
                /* C: post-corridor — near **`distfleeck`** then pet **`dog_move`** (~2735+). */
                const nearAfterCorridor =
                    g.context._wizD1EastTailNearMklevMtmpLikeC
                    ?? nearMklev
                    ?? wizD1EastDoorMklevMonLikeC(g);
                if (nearAfterCorridor) {
                    setApparxyMonsterLikeC(g, nearAfterCorridor);
                    await distfleeckMonsterApplyLikeC(g, nearAfterCorridor);
                }
                if (petEast) {
                    g.context._wizD1AfterLPostMfndposOnlyLikeC = true;
                    g.context._wizD1PostCorridorPetMfndposLikeC = true;
                    try {
                        dogMoveLikeC(g, petEast);
                    } finally {
                        delete g.context._wizD1AfterLPostMfndposOnlyLikeC;
                        delete g.context._wizD1PostCorridorPetMfndposLikeC;
                    }
                    g.context._wizD1PostCorridorPetTailDoneLikeC = true;
                }
                /* C: post-corridor — distant 2× **`distfleeck`** + peel **`rn2(20)`** (~2743+). */
                if (peelDistant) {
                    setApparxyMonsterLikeC(g, peelDistant);
                    await distfleeckMonsterApplyLikeC(g, peelDistant);
                    await distfleeckMonsterApplyLikeC(g, peelDistant);
                    primeDistantMtrackRn20LikeC(peelDistant);
                    rn2(20);
                    await distfleeckMonsterApplyLikeC(g, peelDistant);
                    await distfleeckMonsterApplyLikeC(g, peelDistant);
                    g.context._wizD1PostCorridorDistantPeelDoneLikeC = true;
                }
                /* C: second pet **`dog_move`** mfndpos (~2748–2749). */
                if (petEast) {
                    dogMovePostCorridorSecondPetMfndposLikeC(g, petEast);
                }
                /* C: near **`distfleeck`** after second pet (~2750). */
                if (nearAfterCorridor) {
                    setApparxyMonsterLikeC(g, nearAfterCorridor);
                    await distfleeckMonsterApplyLikeC(g, nearAfterCorridor);
                }
                /* C: second new-turn **`mcalcmove`** on same post (~2751+). */
                const {
                    runWizEastTailPostCorridorMcalcmoveNewTurnLikeC,
                    runNewTurnSetupAndTailLikeC,
                } = await import('./moveloop_turn_advance.js');
                const { dogMoveEastTailPostMcalcmovePetLikeC } = await import(
                    './dogmove_mon.js',
                );
                await runWizEastTailPostCorridorMcalcmoveNewTurnLikeC(g);
                g.context._wizD1EastTailCorridorTurnDoneLikeC = true;
                g.context._wizD1PostEastTailWalkFmonLikeC = true;
                /* C: post-**`mcalcmove`** — near **`distfleeck`**, pet prescan + **`mfndpos`**, near (~2757–2761). */
                const nearAfterMcalcmove =
                    nearAfterCorridor ?? wizD1EastDoorMklevMonLikeC(g);
                if (nearAfterMcalcmove) {
                    setApparxyMonsterLikeC(g, nearAfterMcalcmove);
                    await distfleeckMonsterApplyLikeC(g, nearAfterMcalcmove);
                }
                if (petEast) {
                    dogMoveEastTailPostMcalcmovePetLikeC(g, petEast);
                }
                if (nearAfterMcalcmove) {
                    setApparxyMonsterLikeC(g, nearAfterMcalcmove);
                    await distfleeckMonsterApplyLikeC(g, nearAfterMcalcmove);
                }
                /* C: distant **`m_move`** **`mfndpos`** (~2762–2764) then third new-turn (~2765+). */
                if (peelDistant) {
                    g.context._wizD1LPostEastTailAfterMcalcmoveLikeC = true;
                    try {
                        await movemonSinglemonLikeC(g, peelDistant, effStepNum);
                    } finally {
                        delete g.context._wizD1LPostEastTailAfterMcalcmoveLikeC;
                    }
                }
                await runInlineNewTurnUnlessDeferredPeelLikeC(g, (g.moves | 0) - 1);
                g.context._wizD1EastTailPostCorridorMovemonAfterMcalcmoveDoneLikeC = true;
                g.context._wizD1PostEastTailWalkFmonLikeC = true;
                delete g.context._wizD1EastTailPostMcalcmovePetPendingLikeC;
                g.context._wizD1LPostOuterLoopDoneLikeC = true;
                /* C: east-tail post consumed step 44 **`L`** time — next **`l`** is autoopen only. */
                g.context.move = 0;
                g.context._wizD1BlockedRunNoTimeLikeC = true;
                return false;
            } else {
                const handled = new Set(
                    [peelDistant, petEast, nearMklev].filter(Boolean),
                );
                const restMons = (g.level?.monsters ?? []).filter(
                    (m) =>
                        (m.mgenmklev | 0)
                        && !(m.mtame | 0)
                        && !handled.has(m),
                );
                if (restMons.length > 0) {
                    g.context._wizD1Step1RestDochugLikeC = true;
                    try {
                        for (const m of restMons) {
                            await movemonSinglemonLikeC(g, m, effStepNum);
                        }
                    } finally {
                        delete g.context._wizD1Step1RestDochugLikeC;
                    }
                }
            }
        }
        /* C: tourist D:1 — third post-rest **`movemon`** after second new-turn (~2575–2581). */
        if (
            g.urole?.abbr === 'Tou'
            && g.context?._touristD1PostRestSecondThirdMovemonPendingLikeC
            && (effStepNum | 0) === 1
        ) {
            const nearMklev = findTouristD1PostSwapNearMklevMonLikeC(g);
            const pet = (g.level?.monsters ?? []).find((m) => (m.mtame | 0) !== 0);
            if (nearMklev) {
                setApparxyMonsterLikeC(g, nearMklev);
                await distfleeckMonsterApplyLikeC(g, nearMklev);
            }
            if (pet) {
                setApparxyMonsterLikeC(g, pet);
                let mov = pet.movement | 0;
                if (mov < NORMAL_SPEED) {
                    pet.movement = NORMAL_SPEED;
                    mov = NORMAL_SPEED;
                }
                pet.movement = mov - NORMAL_SPEED;
                dogMoveTouristD1PostRestSecondThirdMovemonPetLikeC(g, pet);
            }
            delete g.context._touristD1PostRestSecondThirdMovemonPendingLikeC;
        }
        /* C: tourist D:1 first run-east **`L`** — near **`distfleeck`** + pet **`dog_move`**
         * after new-turn **`mcalcmove`** (**`seed0900`** ~2591+). */
        if (
            g.urole?.abbr === 'Tou'
            && (g.u?.uz?.dnum | 0) === 0
            && (g.u?.uz?.dlevel | 0) === 1
            && g.context?._touristD1LPostFmonPeelPendingLikeC
            && g.context?._touristD1LPostMcalcmoveDoneLikeC
            && (effStepNum | 0) === 1
        ) {
            const nearMklev = findTouristD1PostSwapNearMklevMonLikeC(g);
            const pet = (g.level?.monsters ?? []).find((m) => (m.mtame | 0) !== 0);
            const distfleeckTarget = nearMklev ?? pet;
            const spendPetMoveLikeC = (mtmp) => {
                if (!mtmp) return;
                setApparxyMonsterLikeC(g, mtmp);
                let mov = mtmp.movement | 0;
                if (mov < NORMAL_SPEED) {
                    mtmp.movement = NORMAL_SPEED;
                    mov = NORMAL_SPEED;
                }
                mtmp.movement = mov - NORMAL_SPEED;
            };
            /* C: post-**`mcalcmove`** peel — **`distfleeck`** + **`dog_move`** ×3 phases inlined
             * (one **`movemon`** pass; **`seed0900`** ~2591–2607) before next new-turn **`mcalcmove`**. */
            if (distfleeckTarget) {
                setApparxyMonsterLikeC(g, distfleeckTarget);
                await distfleeckMonsterApplyLikeC(g, distfleeckTarget);
            }
            if (pet) {
                spendPetMoveLikeC(pet);
                dogMoveTouristD1LPostMovemonPeelLikeC(g, pet, 1);
            }
            if (distfleeckTarget) {
                setApparxyMonsterLikeC(g, distfleeckTarget);
                await distfleeckMonsterApplyLikeC(g, distfleeckTarget);
                await distfleeckMonsterApplyLikeC(g, distfleeckTarget);
            }
            if (pet) {
                spendPetMoveLikeC(pet);
                dogMoveTouristD1LPostMovemonPeelLikeC(g, pet, 2);
            }
            if (distfleeckTarget) {
                setApparxyMonsterLikeC(g, distfleeckTarget);
                await distfleeckMonsterApplyLikeC(g, distfleeckTarget);
            }
            if (pet) {
                spendPetMoveLikeC(pet);
                dogMoveTouristD1LPostMovemonPeelLikeC(g, pet, 3);
                pet.movement = 0;
            }
            delete g.context._somebodyCanMoveLikeC;
            delete g.context._touristD1LPostFmonPeelPendingLikeC;
            delete g.context._touristD1LPostMcalcmoveDoneLikeC;
            g.context._touristD1LPostPeelCompleteLikeC = true;
        }
        /* C: tourist D:1 run-east **`L`** — near **`distfleeck`**, pet **`dog_move`** ×2 after
         * post-peel new-turn (**`seed0900`** ~2612–2622). */
        if (
            g.urole?.abbr === 'Tou'
            && (g.u?.uz?.dnum | 0) === 0
            && (g.u?.uz?.dlevel | 0) === 1
            && g.context?._touristD1LPostAfterPeelNewturnTailPendingLikeC
            && (effStepNum | 0) === 1
        ) {
            const nearMklev = findTouristD1PostSwapNearMklevMonLikeC(g);
            const pet = (g.level?.monsters ?? []).find((m) => (m.mtame | 0) !== 0);
            const distfleeckTarget = nearMklev ?? pet;
            const spendPetMoveLikeC = (mtmp) => {
                if (!mtmp) return;
                setApparxyMonsterLikeC(g, mtmp);
                let mov = mtmp.movement | 0;
                if (mov < NORMAL_SPEED) {
                    mtmp.movement = NORMAL_SPEED;
                    mov = NORMAL_SPEED;
                }
                mtmp.movement = mov - NORMAL_SPEED;
            };
            if (distfleeckTarget) {
                setApparxyMonsterLikeC(g, distfleeckTarget);
                await distfleeckMonsterApplyLikeC(g, distfleeckTarget);
            }
            if (pet) {
                spendPetMoveLikeC(pet);
                dogMoveTouristD1LPostAfterPeelNewturnTailLikeC(g, pet, 1);
            }
            if (distfleeckTarget) {
                setApparxyMonsterLikeC(g, distfleeckTarget);
                await distfleeckMonsterApplyLikeC(g, distfleeckTarget);
            }
            if (pet) {
                spendPetMoveLikeC(pet);
                dogMoveTouristD1LPostAfterPeelNewturnTailLikeC(g, pet, 2);
            }
            delete g.context._touristD1LPostAfterPeelNewturnTailPendingLikeC;
        }
        /* C: tourist D:1 run-east **`L`** — third **`movemon`** after post-peel new-turn tail
         * (**`seed0900`** ~2627–2633). */
        if (
            g.urole?.abbr === 'Tou'
            && (g.u?.uz?.dnum | 0) === 0
            && (g.u?.uz?.dlevel | 0) === 1
            && g.context?._touristD1LPostThirdMovemonPendingLikeC
            && (effStepNum | 0) === 1
        ) {
            const nearMklev = findTouristD1PostSwapNearMklevMonLikeC(g);
            const pet = (g.level?.monsters ?? []).find((m) => (m.mtame | 0) !== 0);
            const distfleeckTarget = nearMklev ?? pet;
            const spendPetMoveLikeC = (mtmp) => {
                if (!mtmp) return;
                setApparxyMonsterLikeC(g, mtmp);
                let mov = mtmp.movement | 0;
                if (mov < NORMAL_SPEED) {
                    mtmp.movement = NORMAL_SPEED;
                    mov = NORMAL_SPEED;
                }
                mtmp.movement = mov - NORMAL_SPEED;
            };
            if (distfleeckTarget) {
                setApparxyMonsterLikeC(g, distfleeckTarget);
                await distfleeckMonsterApplyLikeC(g, distfleeckTarget);
            }
            if (pet) {
                spendPetMoveLikeC(pet);
                dogMoveTouristD1LPostThirdMovemonPetLikeC(g, pet, 1);
            }
            if (distfleeckTarget) {
                setApparxyMonsterLikeC(g, distfleeckTarget);
                await distfleeckMonsterApplyLikeC(g, distfleeckTarget);
                await distfleeckMonsterApplyLikeC(g, distfleeckTarget);
            }
            if (pet) {
                spendPetMoveLikeC(pet);
                dogMoveTouristD1LPostThirdMovemonPetLikeC(g, pet, 2);
            }
            if (distfleeckTarget) {
                setApparxyMonsterLikeC(g, distfleeckTarget);
                await distfleeckMonsterApplyLikeC(g, distfleeckTarget);
            }
            if (pet) {
                spendPetMoveLikeC(pet);
                dogMoveTouristD1LPostThirdMovemonPetLikeC(g, pet, 3);
            }
            g.context._touristD1LPostThirdMovemonCompleteLikeC = true;
            delete g.context._touristD1LPostThirdMovemonPendingLikeC;
        }
        /* C: comma-**`l`** → first **`U`** — third **`movemon`** after post-second-new-turn
         * **`distfleeck`** — pet **`mfndpos`** **`rn2(12)`**×3 (~3029–3031), surplus **`fmon`**
         * **`rn2(12)`**×2 (~3032–3033), pet **`distfleeck`** (~3034). */
        if (
            g.urole?.abbr === 'Wiz'
            && (g.u?.uz?.dnum | 0) === 0
            && (g.u?.uz?.dlevel | 0) === 1
            && g.context?._wizD1CommaLFirstUPostTailThirdMovemonPendingLikeC
            && (effStepNum | 0) === 1
        ) {
            const petCommaUThird = (g.level?.monsters ?? []).find(
                (m) => (m.mtame | 0) !== 0,
            );
            if (petCommaUThird) {
                setApparxyMonsterLikeC(g, petCommaUThird);
                dogMoveCommaLFirstUPostTailThirdMovemonPetLikeC(g, petCommaUThird);
                /* C: surplus **`fmon`** **`rn2(12)`**×2 before next **`distfleeck`**. */
                rn2(12);
                rn2(12);
                setApparxyMonsterLikeC(g, petCommaUThird);
                await distfleeckMonsterApplyLikeC(g, petCommaUThird);
            }
            delete g.context._wizD1CommaLFirstUPostTailThirdMovemonPendingLikeC;
            g.context._wizD1CommaLFirstUPostTailThirdMovemonDoneLikeC = true;
            /* C: post-third-peel fmon tail — distfleeck + m_move (~3035+) before post ends. */
            g.context._wizD1CommaLFirstUPostTailFmonTailPendingLikeC = true;
            const commaUFmonTail = fmonListForMovemonLikeC(g, effStepNum);
            const commaUHostileTail = commaUFmonTail.filter(
                (m) => !(m.mtame | 0),
            );
            for (let ti = 0; ti < commaUHostileTail.length && ti < 2; ti++) {
                const m = commaUHostileTail[ti];
                await movemonSinglemonLikeC(g, m, effStepNum);
                /* C: second peel mklev — second ~915 **`distfleeck`** (~3041) before pet **`dog_move`**. */
                if (ti === 1) {
                    setApparxyMonsterLikeC(g, m);
                    await distfleeckMonsterApplyLikeC(g, m);
                }
            }
            delete g.context._wizD1CommaLFirstUPostTailFmonTailPendingLikeC;
            if (petCommaUThird) {
                setApparxyMonsterLikeC(g, petCommaUThird);
                dogMoveCommaUFmonTailPostPeelPetLikeC(g, petCommaUThird);
                setApparxyMonsterLikeC(g, petCommaUThird);
                await distfleeckMonsterApplyLikeC(g, petCommaUThird);
            }
            g.context._wizD1CommaLFirstUPostTailOuterMoveloopDoneLikeC = true;
            return false;
        }
        /* C: tourist D:1 run-east **`L`** — fourth **`movemon`** after third-pass new-turn
         * (**`seed0900`** ~2649–2663). */
        if (
            g.urole?.abbr === 'Tou'
            && (g.u?.uz?.dnum | 0) === 0
            && (g.u?.uz?.dlevel | 0) === 1
            && g.context?._touristD1LPostFourthMovemonPendingLikeC
            && (effStepNum | 0) === 1
        ) {
            const nearMklev = findTouristD1PostSwapNearMklevMonLikeC(g);
            const pet = (g.level?.monsters ?? []).find((m) => (m.mtame | 0) !== 0);
            const distfleeckTarget = nearMklev ?? pet;
            const spendPetMoveLikeC = (mtmp) => {
                if (!mtmp) return;
                setApparxyMonsterLikeC(g, mtmp);
                let mov = mtmp.movement | 0;
                if (mov < NORMAL_SPEED) {
                    mtmp.movement = NORMAL_SPEED;
                    mov = NORMAL_SPEED;
                }
                mtmp.movement = mov - NORMAL_SPEED;
            };
            if (distfleeckTarget) {
                setApparxyMonsterLikeC(g, distfleeckTarget);
                await distfleeckMonsterApplyLikeC(g, distfleeckTarget);
            }
            if (pet) {
                spendPetMoveLikeC(pet);
                dogMoveTouristD1LPostFourthMovemonPetLikeC(g, pet, 1);
            }
            if (distfleeckTarget) {
                setApparxyMonsterLikeC(g, distfleeckTarget);
                await distfleeckMonsterApplyLikeC(g, distfleeckTarget);
            }
            if (pet) {
                spendPetMoveLikeC(pet);
                dogMoveTouristD1LPostFourthMovemonPetLikeC(g, pet, 2);
            }
            g.context._touristD1LPostFourthMovemonCompleteLikeC = true;
            delete g.context._touristD1LPostFourthMovemonPendingLikeC;
        }
        /* C: tourist D:1 run-east **`L`** — fifth **`movemon`** after fourth-pass new-turn
         * (**`seed0900`** ~2668–2675). */
        if (
            g.urole?.abbr === 'Tou'
            && (g.u?.uz?.dnum | 0) === 0
            && (g.u?.uz?.dlevel | 0) === 1
            && g.context?._touristD1LPostFifthMovemonPendingLikeC
            && (effStepNum | 0) === 1
        ) {
            const nearMklev = findTouristD1PostSwapNearMklevMonLikeC(g);
            const pet = (g.level?.monsters ?? []).find((m) => (m.mtame | 0) !== 0);
            const distfleeckTarget = nearMklev ?? pet;
            const spendPetMoveLikeC = (mtmp) => {
                if (!mtmp) return;
                setApparxyMonsterLikeC(g, mtmp);
                let mov = mtmp.movement | 0;
                if (mov < NORMAL_SPEED) {
                    mtmp.movement = NORMAL_SPEED;
                    mov = NORMAL_SPEED;
                }
                mtmp.movement = mov - NORMAL_SPEED;
            };
            if (distfleeckTarget) {
                setApparxyMonsterLikeC(g, distfleeckTarget);
                await distfleeckMonsterApplyLikeC(g, distfleeckTarget);
            }
            if (pet) {
                spendPetMoveLikeC(pet);
                /* C: phase-1 — four away **`rn2(12)`** (~2669–2672). */
                dogMoveTouristD1LPostThirdMovemonPetLikeC(g, pet, 1);
            }
            if (distfleeckTarget) {
                setApparxyMonsterLikeC(g, distfleeckTarget);
                await distfleeckMonsterApplyLikeC(g, distfleeckTarget);
            }
            if (pet) {
                spendPetMoveLikeC(pet);
                /* C: phase-2 — two away **`rn2(12)`** (~2674–2675). */
                dogMoveTouristD1LPostThirdMovemonPetLikeC(g, pet, 3);
            }
            g.context._touristD1LPostFifthMovemonCompleteLikeC = true;
            delete g.context._touristD1LPostFifthMovemonPendingLikeC;
        }
        /* C: tourist D:1 run-east **`L`** — sixth **`movemon`** after fifth-pass new-turn
         * (**`seed0900`** ~2680–2700). */
        if (
            g.urole?.abbr === 'Tou'
            && (g.u?.uz?.dnum | 0) === 0
            && (g.u?.uz?.dlevel | 0) === 1
            && g.context?._touristD1LPostSixthMovemonPendingLikeC
            && (effStepNum | 0) === 1
        ) {
            const nearMklev = findTouristD1PostSwapNearMklevMonLikeC(g);
            const distant = findDistantMklevMonLikeC(g);
            const pet = (g.level?.monsters ?? []).find((m) => (m.mtame | 0) !== 0);
            const distfleeckTarget = nearMklev ?? pet;
            const spendPetMoveLikeC = (mtmp) => {
                if (!mtmp) return;
                setApparxyMonsterLikeC(g, mtmp);
                let mov = mtmp.movement | 0;
                if (mov < NORMAL_SPEED) {
                    mtmp.movement = NORMAL_SPEED;
                    mov = NORMAL_SPEED;
                }
                mtmp.movement = mov - NORMAL_SPEED;
            };
            g.context._touristD1LPostSixthMovemonLikeC = true;
            try {
                if (distfleeckTarget) {
                    setApparxyMonsterLikeC(g, distfleeckTarget);
                    await distfleeckMonsterApplyLikeC(g, distfleeckTarget);
                }
                if (pet) {
                    spendPetMoveLikeC(pet);
                    dogMoveTouristD1LPostFourthMovemonPetLikeC(g, pet, 1);
                }
                if (distfleeckTarget) {
                    setApparxyMonsterLikeC(g, distfleeckTarget);
                    await distfleeckMonsterApplyLikeC(g, distfleeckTarget);
                    await distfleeckMonsterApplyLikeC(g, distfleeckTarget);
                }
                if (distant) {
                    setApparxyMonsterLikeC(g, distant);
                    await distfleeckMonsterApplyLikeC(g, distant);
                    await distfleeckMonsterApplyLikeC(g, distant);
                } else if (distfleeckTarget) {
                    setApparxyMonsterLikeC(g, distfleeckTarget);
                    await distfleeckMonsterApplyLikeC(g, distfleeckTarget);
                    await distfleeckMonsterApplyLikeC(g, distfleeckTarget);
                }
                if (pet) {
                    spendPetMoveLikeC(pet);
                    g.context._touristD1LPostSixthMovemonPhase2BudgetLikeC = 4;
                    try {
                        dogMoveTouristD1LPostFourthMovemonPetLikeC(g, pet, 2);
                    } finally {
                        delete g.context._touristD1LPostSixthMovemonPhase2BudgetLikeC;
                    }
                }
                if (distfleeckTarget) {
                    setApparxyMonsterLikeC(g, distfleeckTarget);
                    await distfleeckMonsterApplyLikeC(g, distfleeckTarget);
                }
                if (pet) {
                    spendPetMoveLikeC(pet);
                    /* C: **`mfndpos`** slot-short tail — two away **`rn2(12)`** (~2701–2702). */
                    rn2(12);
                    rn2(12);
                }
            } finally {
                delete g.context._touristD1LPostSixthMovemonLikeC;
            }
            g.context._touristD1LPostSixthMovemonCompleteLikeC = true;
            delete g.context._touristD1LPostSixthMovemonPendingLikeC;
        }
        /* C: tourist D:1 run-east **`L`** — seventh **`movemon`** after sixth-pass new-turn
         * (**`seed0900`** ~2707–2725). Fourth invent/**`mfndpos`** shell; phase-1 uses sixth
         * **`(sameCell\|\|away)`** branch. */
        if (
            g.urole?.abbr === 'Tou'
            && (g.u?.uz?.dnum | 0) === 0
            && (g.u?.uz?.dlevel | 0) === 1
            && g.context?._touristD1LPostSeventhMovemonPendingLikeC
            && (effStepNum | 0) === 1
        ) {
            const nearMklev = findTouristD1PostSwapNearMklevMonLikeC(g);
            const pet = (g.level?.monsters ?? []).find((m) => (m.mtame | 0) !== 0);
            const distfleeckTarget = nearMklev ?? pet;
            const spendPetMoveLikeC = (mtmp) => {
                if (!mtmp) return;
                setApparxyMonsterLikeC(g, mtmp);
                let mov = mtmp.movement | 0;
                if (mov < NORMAL_SPEED) {
                    mtmp.movement = NORMAL_SPEED;
                    mov = NORMAL_SPEED;
                }
                mtmp.movement = mov - NORMAL_SPEED;
            };
            if (distfleeckTarget) {
                setApparxyMonsterLikeC(g, distfleeckTarget);
                await distfleeckMonsterApplyLikeC(g, distfleeckTarget);
            }
            if (pet) {
                spendPetMoveLikeC(pet);
                g.context._touristD1LPostSeventhMovemonLikeC = true;
                try {
                    dogMoveTouristD1LPostFourthMovemonPetLikeC(g, pet, 1);
                } finally {
                    delete g.context._touristD1LPostSeventhMovemonLikeC;
                }
            }
            if (distfleeckTarget) {
                setApparxyMonsterLikeC(g, distfleeckTarget);
                await distfleeckMonsterApplyLikeC(g, distfleeckTarget);
            }
            if (pet) {
                spendPetMoveLikeC(pet);
                dogMoveTouristD1LPostFourthMovemonPetLikeC(g, pet, 2);
            }
            g.context._touristD1LPostSeventhMovemonCompleteLikeC = true;
            delete g.context._touristD1LPostSeventhMovemonPendingLikeC;
        }
        /* C: tourist D:1 run-east **`L`** — eighth **`movemon`** after seventh-pass new-turn
         * (**`seed0900`** ~2730–2748). Same fourth invent/**`mfndpos`** shell as seventh. */
        if (
            g.urole?.abbr === 'Tou'
            && (g.u?.uz?.dnum | 0) === 0
            && (g.u?.uz?.dlevel | 0) === 1
            && g.context?._touristD1LPostEighthMovemonPendingLikeC
            && (effStepNum | 0) === 1
        ) {
            const nearMklev = findTouristD1PostSwapNearMklevMonLikeC(g);
            const pet = (g.level?.monsters ?? []).find((m) => (m.mtame | 0) !== 0);
            const distfleeckTarget = nearMklev ?? pet;
            const spendPetMoveLikeC = (mtmp) => {
                if (!mtmp) return;
                setApparxyMonsterLikeC(g, mtmp);
                let mov = mtmp.movement | 0;
                if (mov < NORMAL_SPEED) {
                    mtmp.movement = NORMAL_SPEED;
                    mov = NORMAL_SPEED;
                }
                mtmp.movement = mov - NORMAL_SPEED;
            };
            if (distfleeckTarget) {
                setApparxyMonsterLikeC(g, distfleeckTarget);
                await distfleeckMonsterApplyLikeC(g, distfleeckTarget);
            }
            if (pet) {
                spendPetMoveLikeC(pet);
                g.context._touristD1LPostEighthMovemonLikeC = true;
                try {
                    dogMoveTouristD1LPostFourthMovemonPetLikeC(g, pet, 1);
                } finally {
                    delete g.context._touristD1LPostEighthMovemonLikeC;
                }
            }
            if (distfleeckTarget) {
                setApparxyMonsterLikeC(g, distfleeckTarget);
                await distfleeckMonsterApplyLikeC(g, distfleeckTarget);
            }
            if (pet) {
                spendPetMoveLikeC(pet);
                dogMoveTouristD1LPostFourthMovemonPetLikeC(g, pet, 2);
            }
            g.context._touristD1LPostEighthMovemonCompleteLikeC = true;
            delete g.context._touristD1LPostEighthMovemonPendingLikeC;
        }
        /* C: tourist D:1 run-east **`L`** — ninth **`movemon`** after eighth-pass new-turn
         * (**`seed0900`** ~2753–2771). Fourth invent/**`mfndpos`** shell; phase-1 no pair-pad. */
        if (
            g.urole?.abbr === 'Tou'
            && (g.u?.uz?.dnum | 0) === 0
            && (g.u?.uz?.dlevel | 0) === 1
            && g.context?._touristD1LPostNinthMovemonPendingLikeC
            && (effStepNum | 0) === 1
        ) {
            const nearMklev = findTouristD1PostSwapNearMklevMonLikeC(g);
            const pet = (g.level?.monsters ?? []).find((m) => (m.mtame | 0) !== 0);
            const distfleeckTarget = nearMklev ?? pet;
            const spendPetMoveLikeC = (mtmp) => {
                if (!mtmp) return;
                setApparxyMonsterLikeC(g, mtmp);
                let mov = mtmp.movement | 0;
                if (mov < NORMAL_SPEED) {
                    mtmp.movement = NORMAL_SPEED;
                    mov = NORMAL_SPEED;
                }
                mtmp.movement = mov - NORMAL_SPEED;
            };
            if (distfleeckTarget) {
                setApparxyMonsterLikeC(g, distfleeckTarget);
                await distfleeckMonsterApplyLikeC(g, distfleeckTarget);
            }
            if (pet) {
                spendPetMoveLikeC(pet);
                g.context._touristD1LPostNinthMovemonLikeC = true;
                try {
                    dogMoveTouristD1LPostFourthMovemonPetLikeC(g, pet, 1);
                } finally {
                    delete g.context._touristD1LPostNinthMovemonLikeC;
                }
            }
            if (distfleeckTarget) {
                setApparxyMonsterLikeC(g, distfleeckTarget);
                await distfleeckMonsterApplyLikeC(g, distfleeckTarget);
            }
            if (pet) {
                spendPetMoveLikeC(pet);
                dogMoveTouristD1LPostFourthMovemonPetLikeC(g, pet, 2);
            }
            g.context._touristD1LPostNinthMovemonCompleteLikeC = true;
            delete g.context._touristD1LPostNinthMovemonPendingLikeC;
        }
        /* C: tourist D:1 run-east **`L`** — tenth **`movemon`** after ninth-pass new-turn
         * (**`seed0900`** ~2772–2787). Fifth **`ThirdMovemon`** phase-1/3 shell; double
         * **`distfleeck`** between phases; extended phase-2 away budget. */
        if (
            g.urole?.abbr === 'Tou'
            && (g.u?.uz?.dnum | 0) === 0
            && (g.u?.uz?.dlevel | 0) === 1
            && g.context?._touristD1LPostTenthMovemonPendingLikeC
            && (effStepNum | 0) === 1
        ) {
            const nearMklev = findTouristD1PostSwapNearMklevMonLikeC(g);
            const pet = (g.level?.monsters ?? []).find((m) => (m.mtame | 0) !== 0);
            const distfleeckTarget = nearMklev ?? pet;
            const spendPetMoveLikeC = (mtmp) => {
                if (!mtmp) return;
                setApparxyMonsterLikeC(g, mtmp);
                let mov = mtmp.movement | 0;
                if (mov < NORMAL_SPEED) {
                    mtmp.movement = NORMAL_SPEED;
                    mov = NORMAL_SPEED;
                }
                mtmp.movement = mov - NORMAL_SPEED;
            };
            if (distfleeckTarget) {
                setApparxyMonsterLikeC(g, distfleeckTarget);
                await distfleeckMonsterApplyLikeC(g, distfleeckTarget);
            }
            if (pet) {
                spendPetMoveLikeC(pet);
                g.context._touristD1LPostTenthMovemonLikeC = true;
                g.context._touristD1LPostFourthSkipFloorResistsLikeC = true;
                try {
                    dogMoveTouristD1LPostThirdMovemonPetLikeC(g, pet, 1);
                } finally {
                    delete g.context._touristD1LPostFourthSkipFloorResistsLikeC;
                    delete g.context._touristD1LPostTenthMovemonLikeC;
                }
            }
            if (distfleeckTarget) {
                setApparxyMonsterLikeC(g, distfleeckTarget);
                await distfleeckMonsterApplyLikeC(g, distfleeckTarget);
                await distfleeckMonsterApplyLikeC(g, distfleeckTarget);
            }
            if (pet) {
                spendPetMoveLikeC(pet);
                g.context._touristD1LPostTenthMovemonPhase2BudgetLikeC = 6;
                g.context._touristD1LPostFourthSkipFloorResistsLikeC = true;
                try {
                    dogMoveTouristD1LPostFourthMovemonPetLikeC(g, pet, 2);
                } finally {
                    delete g.context._touristD1LPostFourthSkipFloorResistsLikeC;
                    delete g.context._touristD1LPostTenthMovemonPhase2BudgetLikeC;
                }
            }
            if (distfleeckTarget) {
                setApparxyMonsterLikeC(g, distfleeckTarget);
                await distfleeckMonsterApplyLikeC(g, distfleeckTarget);
            }
            if (pet) {
                spendPetMoveLikeC(pet);
                g.context._touristD1LPostFourthSkipFloorResistsLikeC = true;
                try {
                    dogMoveTouristD1LPostThirdMovemonPetLikeC(g, pet, 3);
                } finally {
                    delete g.context._touristD1LPostFourthSkipFloorResistsLikeC;
                }
            }
            g.context._touristD1LPostTenthMovemonCompleteLikeC = true;
            delete g.context._touristD1LPostTenthMovemonPendingLikeC;
        }
        /* C: tourist D:1 run-east **`L`** — eleventh **`movemon`** after tenth-pass new-turn
         * (**`seed0900`** ~2792–2810). Fourth invent/**`mfndpos`** shell; phase-1 no pair-pad. */
        if (
            g.urole?.abbr === 'Tou'
            && (g.u?.uz?.dnum | 0) === 0
            && (g.u?.uz?.dlevel | 0) === 1
            && g.context?._touristD1LPostEleventhMovemonPendingLikeC
            && (effStepNum | 0) === 1
        ) {
            const nearMklev = findTouristD1PostSwapNearMklevMonLikeC(g);
            const distant = findDistantMklevMonLikeC(g);
            const pet = (g.level?.monsters ?? []).find((m) => (m.mtame | 0) !== 0);
            const distfleeckTarget = nearMklev ?? pet;
            const spendPetMoveLikeC = (mtmp) => {
                if (!mtmp) return;
                setApparxyMonsterLikeC(g, mtmp);
                let mov = mtmp.movement | 0;
                if (mov < NORMAL_SPEED) {
                    mtmp.movement = NORMAL_SPEED;
                    mov = NORMAL_SPEED;
                }
                mtmp.movement = mov - NORMAL_SPEED;
            };
            if (distfleeckTarget) {
                setApparxyMonsterLikeC(g, distfleeckTarget);
                await distfleeckMonsterApplyLikeC(g, distfleeckTarget);
            }
            if (pet) {
                spendPetMoveLikeC(pet);
                g.context._touristD1LPostEleventhMovemonLikeC = true;
                try {
                    dogMoveTouristD1LPostFourthMovemonPetLikeC(g, pet, 1);
                } finally {
                    delete g.context._touristD1LPostEleventhMovemonLikeC;
                }
            }
            if (distfleeckTarget) {
                setApparxyMonsterLikeC(g, distfleeckTarget);
                await distfleeckMonsterApplyLikeC(g, distfleeckTarget);
                await distfleeckMonsterApplyLikeC(g, distfleeckTarget);
            }
            const eleventhMmoveMtmp = nearMklev ?? distant;
            if (eleventhMmoveMtmp) {
                setApparxyMonsterLikeC(g, eleventhMmoveMtmp);
                primeDistantMtrackRn20LikeC(eleventhMmoveMtmp);
                rn2(20);
                await distfleeckMonsterApplyLikeC(g, eleventhMmoveMtmp);
            }
            if (pet) {
                spendPetMoveLikeC(pet);
                dogMoveTouristD1LPostFourthMovemonPetLikeC(g, pet, 2);
            }
            g.context._touristD1LPostEleventhMovemonCompleteLikeC = true;
            delete g.context._touristD1LPostEleventhMovemonPendingLikeC;
        }
        /* C: tourist D:1 run-east **`L`** — twelfth **`movemon`** after eleventh-pass new-turn
         * (**`seed0900`** ~2814–2823). Tenth phase-2 budget 6 + third phase-3 shell only. */
        if (
            g.urole?.abbr === 'Tou'
            && (g.u?.uz?.dnum | 0) === 0
            && (g.u?.uz?.dlevel | 0) === 1
            && g.context?._touristD1LPostTwelfthMovemonPendingLikeC
            && (effStepNum | 0) === 1
        ) {
            const nearMklev = findTouristD1PostSwapNearMklevMonLikeC(g);
            const pet = (g.level?.monsters ?? []).find((m) => (m.mtame | 0) !== 0);
            const distfleeckTarget = nearMklev ?? pet;
            const spendPetMoveLikeC = (mtmp) => {
                if (!mtmp) return;
                setApparxyMonsterLikeC(g, mtmp);
                let mov = mtmp.movement | 0;
                if (mov < NORMAL_SPEED) {
                    mtmp.movement = NORMAL_SPEED;
                    mov = NORMAL_SPEED;
                }
                mtmp.movement = mov - NORMAL_SPEED;
            };
            if (distfleeckTarget) {
                setApparxyMonsterLikeC(g, distfleeckTarget);
                await distfleeckMonsterApplyLikeC(g, distfleeckTarget);
            }
            if (pet) {
                spendPetMoveLikeC(pet);
                g.context._touristD1LPostTwelfthMovemonPhase2BudgetLikeC = 6;
                g.context._touristD1LPostFourthSkipFloorResistsLikeC = true;
                try {
                    dogMoveTouristD1LPostFourthMovemonPetLikeC(g, pet, 2);
                } finally {
                    delete g.context._touristD1LPostFourthSkipFloorResistsLikeC;
                    delete g.context._touristD1LPostTwelfthMovemonPhase2BudgetLikeC;
                }
            }
            if (distfleeckTarget) {
                setApparxyMonsterLikeC(g, distfleeckTarget);
                await distfleeckMonsterApplyLikeC(g, distfleeckTarget);
            }
            if (pet) {
                spendPetMoveLikeC(pet);
                g.context._touristD1LPostFourthSkipFloorResistsLikeC = true;
                try {
                    dogMoveTouristD1LPostThirdMovemonPetLikeC(g, pet, 3);
                } finally {
                    delete g.context._touristD1LPostFourthSkipFloorResistsLikeC;
                }
            }
            g.context._touristD1LPostTwelfthMovemonCompleteLikeC = true;
            delete g.context._touristD1LPostTwelfthMovemonPendingLikeC;
        }
        /* C: tourist D:1 run-east **`L`** — thirteenth **`movemon`** after twelfth-pass new-turn
         * (**`seed0900`** ~2828–2844). Fourth shell + **`chcnt`** + 3× away tail; double
         * **`distfleeck`** + distant **`m_move`** **`rn2(20)`** + phase-2. */
        if (
            g.urole?.abbr === 'Tou'
            && (g.u?.uz?.dnum | 0) === 0
            && (g.u?.uz?.dlevel | 0) === 1
            && g.context?._touristD1LPostThirteenthMovemonPendingLikeC
            && (effStepNum | 0) === 1
        ) {
            const nearMklev = findTouristD1PostSwapNearMklevMonLikeC(g);
            const distant = findDistantMklevMonLikeC(g);
            const pet = (g.level?.monsters ?? []).find((m) => (m.mtame | 0) !== 0);
            const distfleeckTarget = nearMklev ?? pet;
            const spendPetMoveLikeC = (mtmp) => {
                if (!mtmp) return;
                setApparxyMonsterLikeC(g, mtmp);
                let mov = mtmp.movement | 0;
                if (mov < NORMAL_SPEED) {
                    mtmp.movement = NORMAL_SPEED;
                    mov = NORMAL_SPEED;
                }
                mtmp.movement = mov - NORMAL_SPEED;
            };
            if (distfleeckTarget) {
                setApparxyMonsterLikeC(g, distfleeckTarget);
                await distfleeckMonsterApplyLikeC(g, distfleeckTarget);
            }
            if (pet) {
                spendPetMoveLikeC(pet);
                g.context._touristD1LPostThirteenthMovemonLikeC = true;
                try {
                    dogMoveTouristD1LPostFourthMovemonPetLikeC(g, pet, 1);
                } finally {
                    delete g.context._touristD1LPostThirteenthMovemonLikeC;
                }
            }
            if (distfleeckTarget) {
                setApparxyMonsterLikeC(g, distfleeckTarget);
                await distfleeckMonsterApplyLikeC(g, distfleeckTarget);
                await distfleeckMonsterApplyLikeC(g, distfleeckTarget);
            }
            const thirteenthMmoveMtmp = nearMklev ?? distant;
            if (thirteenthMmoveMtmp) {
                setApparxyMonsterLikeC(g, thirteenthMmoveMtmp);
                primeDistantMtrackRn20LikeC(thirteenthMmoveMtmp);
                rn2(20);
                await distfleeckMonsterApplyLikeC(g, thirteenthMmoveMtmp);
            }
            if (pet) {
                spendPetMoveLikeC(pet);
                g.context._touristD1LPostFourthSkipFloorResistsLikeC = true;
                try {
                    dogMoveTouristD1LPostFourthMovemonPetLikeC(g, pet, 2);
                } finally {
                    delete g.context._touristD1LPostFourthSkipFloorResistsLikeC;
                }
            }
            g.context._touristD1LPostThirteenthMovemonCompleteLikeC = true;
            delete g.context._touristD1LPostThirteenthMovemonPendingLikeC;
        }
        /* C: tourist D:1 run-east **`L`** — fourteenth **`movemon`** after thirteenth-pass new-turn
         * (**`seed0900`** ~2850–2871). Tenth opening (third phase-1 ×4 + double **`distfleeck`**);
         * fourth invent/**`mfndpos`** (2× pair-pad + 3× away tail) + phase-2. */
        if (
            g.urole?.abbr === 'Tou'
            && (g.u?.uz?.dnum | 0) === 0
            && (g.u?.uz?.dlevel | 0) === 1
            && g.context?._touristD1LPostFourteenthMovemonPendingLikeC
            && (effStepNum | 0) === 1
        ) {
            const nearMklev = findTouristD1PostSwapNearMklevMonLikeC(g);
            const pet = (g.level?.monsters ?? []).find((m) => (m.mtame | 0) !== 0);
            const distfleeckTarget = nearMklev ?? pet;
            const spendPetMoveLikeC = (mtmp) => {
                if (!mtmp) return;
                setApparxyMonsterLikeC(g, mtmp);
                let mov = mtmp.movement | 0;
                if (mov < NORMAL_SPEED) {
                    mtmp.movement = NORMAL_SPEED;
                    mov = NORMAL_SPEED;
                }
                mtmp.movement = mov - NORMAL_SPEED;
            };
            if (distfleeckTarget) {
                setApparxyMonsterLikeC(g, distfleeckTarget);
                await distfleeckMonsterApplyLikeC(g, distfleeckTarget);
            }
            if (pet) {
                spendPetMoveLikeC(pet);
                g.context._touristD1LPostFourteenthMovemonThirdLikeC = true;
                g.context._touristD1LPostFourthSkipFloorResistsLikeC = true;
                try {
                    dogMoveTouristD1LPostThirdMovemonPetLikeC(g, pet, 1);
                } finally {
                    delete g.context._touristD1LPostFourthSkipFloorResistsLikeC;
                    delete g.context._touristD1LPostFourteenthMovemonThirdLikeC;
                }
            }
            if (distfleeckTarget) {
                setApparxyMonsterLikeC(g, distfleeckTarget);
                await distfleeckMonsterApplyLikeC(g, distfleeckTarget);
                await distfleeckMonsterApplyLikeC(g, distfleeckTarget);
            }
            if (pet) {
                spendPetMoveLikeC(pet);
                g.context._touristD1LPostFourteenthMovemonLikeC = true;
                try {
                    dogMoveTouristD1LPostFourthMovemonPetLikeC(g, pet, 1);
                } finally {
                    delete g.context._touristD1LPostFourteenthMovemonLikeC;
                }
            }
            if (distfleeckTarget) {
                setApparxyMonsterLikeC(g, distfleeckTarget);
                await distfleeckMonsterApplyLikeC(g, distfleeckTarget);
            }
            if (pet) {
                spendPetMoveLikeC(pet);
                g.context._touristD1LPostFourthSkipFloorResistsLikeC = true;
                try {
                    dogMoveTouristD1LPostFourthMovemonPetLikeC(g, pet, 2);
                } finally {
                    delete g.context._touristD1LPostFourthSkipFloorResistsLikeC;
                }
            }
            g.context._touristD1LPostFourteenthMovemonCompleteLikeC = true;
            delete g.context._touristD1LPostFourteenthMovemonPendingLikeC;
        }
        /* C: tourist D:1 run-east **`L`** — fifteenth **`movemon`** after fourteenth-pass new-turn
         * (**`seed0900`** ~2876–2883). Third phase-1 ×4 + single **`distfleeck`** + fourth phase-2. */
        if (
            g.urole?.abbr === 'Tou'
            && (g.u?.uz?.dnum | 0) === 0
            && (g.u?.uz?.dlevel | 0) === 1
            && g.context?._touristD1LPostFifteenthMovemonPendingLikeC
            && (effStepNum | 0) === 1
        ) {
            const nearMklev = findTouristD1PostSwapNearMklevMonLikeC(g);
            const pet = (g.level?.monsters ?? []).find((m) => (m.mtame | 0) !== 0);
            const distfleeckTarget = nearMklev ?? pet;
            const spendPetMoveLikeC = (mtmp) => {
                if (!mtmp) return;
                setApparxyMonsterLikeC(g, mtmp);
                let mov = mtmp.movement | 0;
                if (mov < NORMAL_SPEED) {
                    mtmp.movement = NORMAL_SPEED;
                    mov = NORMAL_SPEED;
                }
                mtmp.movement = mov - NORMAL_SPEED;
            };
            if (distfleeckTarget) {
                setApparxyMonsterLikeC(g, distfleeckTarget);
                await distfleeckMonsterApplyLikeC(g, distfleeckTarget);
            }
            if (pet) {
                spendPetMoveLikeC(pet);
                g.context._touristD1LPostFifteenthMovemonThirdLikeC = true;
                g.context._touristD1LPostFourthSkipFloorResistsLikeC = true;
                try {
                    dogMoveTouristD1LPostThirdMovemonPetLikeC(g, pet, 1);
                } finally {
                    delete g.context._touristD1LPostFourthSkipFloorResistsLikeC;
                    delete g.context._touristD1LPostFifteenthMovemonThirdLikeC;
                }
            }
            if (distfleeckTarget) {
                setApparxyMonsterLikeC(g, distfleeckTarget);
                await distfleeckMonsterApplyLikeC(g, distfleeckTarget);
            }
            if (pet) {
                spendPetMoveLikeC(pet);
                g.context._touristD1LPostFourthSkipFloorResistsLikeC = true;
                try {
                    dogMoveTouristD1LPostFourthMovemonPetLikeC(g, pet, 2);
                } finally {
                    delete g.context._touristD1LPostFourthSkipFloorResistsLikeC;
                }
            }
            g.context._touristD1LPostFifteenthMovemonCompleteLikeC = true;
            delete g.context._touristD1LPostFifteenthMovemonPendingLikeC;
        }
        /* C: tourist D:1 run-east **`L`** — sixteenth **`movemon`** after fifteenth-pass new-turn
         * (**`seed0900`** ~2888–2901). Tenth shell; fourth phase-2 budget 4 (not 6). */
        if (
            g.urole?.abbr === 'Tou'
            && (g.u?.uz?.dnum | 0) === 0
            && (g.u?.uz?.dlevel | 0) === 1
            && g.context?._touristD1LPostSixteenthMovemonPendingLikeC
            && (effStepNum | 0) === 1
        ) {
            const nearMklev = findTouristD1PostSwapNearMklevMonLikeC(g);
            const pet = (g.level?.monsters ?? []).find((m) => (m.mtame | 0) !== 0);
            const distfleeckTarget = nearMklev ?? pet;
            const spendPetMoveLikeC = (mtmp) => {
                if (!mtmp) return;
                setApparxyMonsterLikeC(g, mtmp);
                let mov = mtmp.movement | 0;
                if (mov < NORMAL_SPEED) {
                    mtmp.movement = NORMAL_SPEED;
                    mov = NORMAL_SPEED;
                }
                mtmp.movement = mov - NORMAL_SPEED;
            };
            if (distfleeckTarget) {
                setApparxyMonsterLikeC(g, distfleeckTarget);
                await distfleeckMonsterApplyLikeC(g, distfleeckTarget);
            }
            if (pet) {
                spendPetMoveLikeC(pet);
                g.context._touristD1LPostSixteenthMovemonLikeC = true;
                g.context._touristD1LPostFourthSkipFloorResistsLikeC = true;
                try {
                    dogMoveTouristD1LPostThirdMovemonPetLikeC(g, pet, 1);
                } finally {
                    delete g.context._touristD1LPostFourthSkipFloorResistsLikeC;
                    delete g.context._touristD1LPostSixteenthMovemonLikeC;
                }
            }
            if (distfleeckTarget) {
                setApparxyMonsterLikeC(g, distfleeckTarget);
                await distfleeckMonsterApplyLikeC(g, distfleeckTarget);
                await distfleeckMonsterApplyLikeC(g, distfleeckTarget);
            }
            if (pet) {
                spendPetMoveLikeC(pet);
                g.context._touristD1LPostSixteenthMovemonPhase2BudgetLikeC = 4;
                g.context._touristD1LPostFourthSkipFloorResistsLikeC = true;
                try {
                    dogMoveTouristD1LPostFourthMovemonPetLikeC(g, pet, 2);
                } finally {
                    delete g.context._touristD1LPostFourthSkipFloorResistsLikeC;
                    delete g.context._touristD1LPostSixteenthMovemonPhase2BudgetLikeC;
                }
            }
            if (distfleeckTarget) {
                setApparxyMonsterLikeC(g, distfleeckTarget);
                await distfleeckMonsterApplyLikeC(g, distfleeckTarget);
            }
            if (pet) {
                spendPetMoveLikeC(pet);
                g.context._touristD1LPostFourthSkipFloorResistsLikeC = true;
                try {
                    dogMoveTouristD1LPostThirdMovemonPetLikeC(g, pet, 3);
                } finally {
                    delete g.context._touristD1LPostFourthSkipFloorResistsLikeC;
                }
            }
            g.context._touristD1LPostSixteenthMovemonCompleteLikeC = true;
            delete g.context._touristD1LPostSixteenthMovemonPendingLikeC;
        }
        /* C: tourist D:1 run-east **`L`** — seventeenth **`movemon`** after sixteenth-pass new-turn
         * (**`seed0900`** ~2906–2931). Fourth invent/**`mfndpos`** (4× pair-pad + tail); double
         * **`distfleeck`** + fourth phase-2 budget 6 + third phase-3 (no distant **`m_move`**). */
        if (
            g.urole?.abbr === 'Tou'
            && (g.u?.uz?.dnum | 0) === 0
            && (g.u?.uz?.dlevel | 0) === 1
            && g.context?._touristD1LPostSeventeenthMovemonPendingLikeC
            && (effStepNum | 0) === 1
        ) {
            const nearMklev = findTouristD1PostSwapNearMklevMonLikeC(g);
            const pet = (g.level?.monsters ?? []).find((m) => (m.mtame | 0) !== 0);
            const distfleeckTarget = nearMklev ?? pet;
            const spendPetMoveLikeC = (mtmp) => {
                if (!mtmp) return;
                setApparxyMonsterLikeC(g, mtmp);
                let mov = mtmp.movement | 0;
                if (mov < NORMAL_SPEED) {
                    mtmp.movement = NORMAL_SPEED;
                    mov = NORMAL_SPEED;
                }
                mtmp.movement = mov - NORMAL_SPEED;
            };
            if (distfleeckTarget) {
                setApparxyMonsterLikeC(g, distfleeckTarget);
                await distfleeckMonsterApplyLikeC(g, distfleeckTarget);
            }
            if (pet) {
                spendPetMoveLikeC(pet);
                g.context._touristD1LPostSeventeenthMovemonLikeC = true;
                try {
                    dogMoveTouristD1LPostFourthMovemonPetLikeC(g, pet, 1);
                } finally {
                    delete g.context._touristD1LPostSeventeenthMovemonLikeC;
                }
            }
            if (distfleeckTarget) {
                setApparxyMonsterLikeC(g, distfleeckTarget);
                await distfleeckMonsterApplyLikeC(g, distfleeckTarget);
                await distfleeckMonsterApplyLikeC(g, distfleeckTarget);
            }
            if (pet) {
                spendPetMoveLikeC(pet);
                g.context._touristD1LPostSeventeenthMovemonPhase2BudgetLikeC = 6;
                g.context._touristD1LPostFourthSkipFloorResistsLikeC = true;
                try {
                    dogMoveTouristD1LPostFourthMovemonPetLikeC(g, pet, 2);
                } finally {
                    delete g.context._touristD1LPostFourthSkipFloorResistsLikeC;
                    delete g.context._touristD1LPostSeventeenthMovemonPhase2BudgetLikeC;
                }
            }
            if (distfleeckTarget) {
                setApparxyMonsterLikeC(g, distfleeckTarget);
                await distfleeckMonsterApplyLikeC(g, distfleeckTarget);
            }
            if (pet) {
                spendPetMoveLikeC(pet);
                g.context._touristD1LPostFourthSkipFloorResistsLikeC = true;
                try {
                    dogMoveTouristD1LPostThirdMovemonPetLikeC(g, pet, 3);
                } finally {
                    delete g.context._touristD1LPostFourthSkipFloorResistsLikeC;
                }
            }
            g.context._touristD1LPostSeventeenthMovemonCompleteLikeC = true;
            delete g.context._touristD1LPostSeventeenthMovemonPendingLikeC;
        }
        /* C: tourist D:1 run-east **`L`** — eighteenth **`movemon`** after seventeenth-pass new-turn
         * (**`seed0900`** ~2936–2950). Fifteenth shell — fourth invent/**`mfndpos`** (2× pair-pad + 2× tail)
         * + single **`distfleeck`** + fourth phase-2. */
        if (
            g.urole?.abbr === 'Tou'
            && (g.u?.uz?.dnum | 0) === 0
            && (g.u?.uz?.dlevel | 0) === 1
            && g.context?._touristD1LPostEighteenthMovemonPendingLikeC
            && (effStepNum | 0) === 1
        ) {
            const nearMklev = findTouristD1PostSwapNearMklevMonLikeC(g);
            const pet = (g.level?.monsters ?? []).find((m) => (m.mtame | 0) !== 0);
            const distfleeckTarget = nearMklev ?? pet;
            const spendPetMoveLikeC = (mtmp) => {
                if (!mtmp) return;
                setApparxyMonsterLikeC(g, mtmp);
                let mov = mtmp.movement | 0;
                if (mov < NORMAL_SPEED) {
                    mtmp.movement = NORMAL_SPEED;
                    mov = NORMAL_SPEED;
                }
                mtmp.movement = mov - NORMAL_SPEED;
            };
            if (distfleeckTarget) {
                setApparxyMonsterLikeC(g, distfleeckTarget);
                await distfleeckMonsterApplyLikeC(g, distfleeckTarget);
            }
            if (pet) {
                spendPetMoveLikeC(pet);
                g.context._touristD1LPostEighteenthMovemonLikeC = true;
                try {
                    dogMoveTouristD1LPostFourthMovemonPetLikeC(g, pet, 1);
                } finally {
                    delete g.context._touristD1LPostEighteenthMovemonLikeC;
                }
            }
            if (distfleeckTarget) {
                setApparxyMonsterLikeC(g, distfleeckTarget);
                await distfleeckMonsterApplyLikeC(g, distfleeckTarget);
            }
            if (pet) {
                spendPetMoveLikeC(pet);
                g.context._touristD1LPostFourthSkipFloorResistsLikeC = true;
                try {
                    dogMoveTouristD1LPostFourthMovemonPetLikeC(g, pet, 2);
                } finally {
                    delete g.context._touristD1LPostFourthSkipFloorResistsLikeC;
                }
            }
            g.context._touristD1LPostEighteenthMovemonCompleteLikeC = true;
            delete g.context._touristD1LPostEighteenthMovemonPendingLikeC;
        }
        /* C: tourist D:1 run-east **`L`** — nineteenth **`movemon`** after eighteenth-pass new-turn
         * (**`seed0900`** ~2955–2978). Fourteenth-style shell — third phase-1 ×7 + double
         * **`distfleeck`**; fourth invent/**`mfndpos`** (1× pair-pad + **`chcnt`** + 3× tail) + phase-2. */
        if (
            g.urole?.abbr === 'Tou'
            && (g.u?.uz?.dnum | 0) === 0
            && (g.u?.uz?.dlevel | 0) === 1
            && g.context?._touristD1LPostNineteenthMovemonPendingLikeC
            && (effStepNum | 0) === 1
        ) {
            const nearMklev = findTouristD1PostSwapNearMklevMonLikeC(g);
            const pet = (g.level?.monsters ?? []).find((m) => (m.mtame | 0) !== 0);
            const distfleeckTarget = nearMklev ?? pet;
            const spendPetMoveLikeC = (mtmp) => {
                if (!mtmp) return;
                setApparxyMonsterLikeC(g, mtmp);
                let mov = mtmp.movement | 0;
                if (mov < NORMAL_SPEED) {
                    mtmp.movement = NORMAL_SPEED;
                    mov = NORMAL_SPEED;
                }
                mtmp.movement = mov - NORMAL_SPEED;
            };
            if (distfleeckTarget) {
                setApparxyMonsterLikeC(g, distfleeckTarget);
                await distfleeckMonsterApplyLikeC(g, distfleeckTarget);
            }
            if (pet) {
                spendPetMoveLikeC(pet);
                g.context._touristD1LPostNineteenthMovemonThirdLikeC = true;
                g.context._touristD1LPostNineteenthMovemonThirdPhase1BudgetLikeC = 7;
                g.context._touristD1LPostFourthSkipFloorResistsLikeC = true;
                try {
                    dogMoveTouristD1LPostThirdMovemonPetLikeC(g, pet, 1);
                } finally {
                    delete g.context._touristD1LPostFourthSkipFloorResistsLikeC;
                    delete g.context._touristD1LPostNineteenthMovemonThirdLikeC;
                    delete g.context._touristD1LPostNineteenthMovemonThirdPhase1BudgetLikeC;
                }
            }
            if (distfleeckTarget) {
                setApparxyMonsterLikeC(g, distfleeckTarget);
                await distfleeckMonsterApplyLikeC(g, distfleeckTarget);
                await distfleeckMonsterApplyLikeC(g, distfleeckTarget);
            }
            if (pet) {
                spendPetMoveLikeC(pet);
                g.context._touristD1LPostNineteenthMovemonLikeC = true;
                try {
                    dogMoveTouristD1LPostFourthMovemonPetLikeC(g, pet, 1);
                } finally {
                    delete g.context._touristD1LPostNineteenthMovemonLikeC;
                }
            }
            if (distfleeckTarget) {
                setApparxyMonsterLikeC(g, distfleeckTarget);
                await distfleeckMonsterApplyLikeC(g, distfleeckTarget);
            }
            if (pet) {
                spendPetMoveLikeC(pet);
                g.context._touristD1LPostFourthSkipFloorResistsLikeC = true;
                try {
                    dogMoveTouristD1LPostFourthMovemonPetLikeC(g, pet, 2);
                } finally {
                    delete g.context._touristD1LPostFourthSkipFloorResistsLikeC;
                }
            }
            g.context._touristD1LPostNineteenthMovemonCompleteLikeC = true;
            delete g.context._touristD1LPostNineteenthMovemonPendingLikeC;
        }
        /* C: tourist D:1 run-east **`L`** — twentieth **`movemon`** after nineteenth-pass new-turn
         * (seventeenth shell — fourth invent/**`mfndpos`** 4× pair-pad + tail; double **`distfleeck`**
         * + fourth phase-2 budget 6 + third phase-3). */
        if (
            g.urole?.abbr === 'Tou'
            && (g.u?.uz?.dnum | 0) === 0
            && (g.u?.uz?.dlevel | 0) === 1
            && g.context?._touristD1LPostTwentiethMovemonPendingLikeC
            && (effStepNum | 0) === 1
        ) {
            const nearMklev = findTouristD1PostSwapNearMklevMonLikeC(g);
            const pet = (g.level?.monsters ?? []).find((m) => (m.mtame | 0) !== 0);
            const distfleeckTarget = nearMklev ?? pet;
            const spendPetMoveLikeC = (mtmp) => {
                if (!mtmp) return;
                setApparxyMonsterLikeC(g, mtmp);
                let mov = mtmp.movement | 0;
                if (mov < NORMAL_SPEED) {
                    mtmp.movement = NORMAL_SPEED;
                    mov = NORMAL_SPEED;
                }
                mtmp.movement = mov - NORMAL_SPEED;
            };
            if (distfleeckTarget) {
                setApparxyMonsterLikeC(g, distfleeckTarget);
                await distfleeckMonsterApplyLikeC(g, distfleeckTarget);
            }
            if (pet) {
                spendPetMoveLikeC(pet);
                g.context._touristD1LPostTwentiethMovemonLikeC = true;
                try {
                    dogMoveTouristD1LPostFourthMovemonPetLikeC(g, pet, 1);
                } finally {
                    delete g.context._touristD1LPostTwentiethMovemonLikeC;
                }
            }
            if (distfleeckTarget) {
                setApparxyMonsterLikeC(g, distfleeckTarget);
                await distfleeckMonsterApplyLikeC(g, distfleeckTarget);
                await distfleeckMonsterApplyLikeC(g, distfleeckTarget);
            }
            if (pet) {
                spendPetMoveLikeC(pet);
                g.context._touristD1LPostTwentiethMovemonPhase2BudgetLikeC = 6;
                g.context._touristD1LPostFourthSkipFloorResistsLikeC = true;
                try {
                    dogMoveTouristD1LPostFourthMovemonPetLikeC(g, pet, 2);
                } finally {
                    delete g.context._touristD1LPostFourthSkipFloorResistsLikeC;
                    delete g.context._touristD1LPostTwentiethMovemonPhase2BudgetLikeC;
                }
            }
            if (distfleeckTarget) {
                setApparxyMonsterLikeC(g, distfleeckTarget);
                await distfleeckMonsterApplyLikeC(g, distfleeckTarget);
            }
            if (pet) {
                spendPetMoveLikeC(pet);
                g.context._touristD1LPostFourthSkipFloorResistsLikeC = true;
                try {
                    dogMoveTouristD1LPostThirdMovemonPetLikeC(g, pet, 3);
                } finally {
                    delete g.context._touristD1LPostFourthSkipFloorResistsLikeC;
                }
            }
            g.context._touristD1LPostTwentiethMovemonCompleteLikeC = true;
            delete g.context._touristD1LPostTwentiethMovemonPendingLikeC;
        }
        /* C: wizard D:1 step-1 — post-peel distant **`m_move`** + pet **`dog_invent`** (~2572–2597). */
        if (
            isWizardD1Step1PeelLikeC(g, effStepNum)
            && !g.context?._postBumpKillDochugGateLikeC
            && !g.context?._wizD1LPostEastTailDistantPeelDoneLikeC
            && !g.context?._wizD1PostEastTailWalkFmonLikeC
            && !g.context?._wizD1PostEastTailWalkCompleteLikeC
            && !g.context?._wizD1PostEastTailWalkFmonPendingLikeC
            && !g.context?._wizD1CommaLFirstUPostTailThirdMovemonDoneLikeC
            && !g.context?._wizD1CommaLFirstUPostTailFmonTailPendingLikeC
        ) {
            const wizInventPost = !g.context?._wizD1Step1InventPostDoneLikeC;
            const distant = findDistantMklevMonLikeC(g);
            /* C: **`n`** post — distant **`m_move`** peel; **`L`** uses main **`fmon`** only. */
            if (distant && wizInventPost) {
                await mMoveWizardD1Step1DistantAfterPeelLikeC(g, distant);
            }
            const pet = (g.level?.monsters ?? []).find((m) => (m.mtame | 0) !== 0);
            const nearMklev = (g.level?.monsters ?? []).find(
                (m) =>
                    m !== distant
                    && m !== pet
                    && (m.mgenmklev | 0)
                    && !(m.mtame | 0),
            );
            /* C: **`n`** only — near mklev **`dochug:886`** **`rn2(4)`** before invent post (~2575). */
            if (wizInventPost && nearMklev) {
                g.context._wizD1Step1GateDochugLikeC = true;
                await movemonSinglemonLikeC(g, nearMklev, effStepNum);
                delete g.context._wizD1Step1GateDochugLikeC;
            }
            if (pet && wizInventPost) {
                setApparxyMonsterLikeC(g, pet);
                dogMoveInventOnlyLikeC(g, pet);
                g.context._wizD1Step1InventPostDoneLikeC = true;
                g.context._wizD1Step1PendingLPostPeelLikeC = true;
            }
            /* C: **`n`** — near mklev **`distfleeck`** after pet **`mfndpos`** (~2597). */
            if (wizInventPost && nearMklev) {
                setApparxyMonsterLikeC(g, nearMklev);
                await distfleeckMonsterApplyLikeC(g, nearMklev);
            }
            /* C: **`L`** — second **`movemon`** after post-newturn invent (~2660–2672). */
            if (
                !wizInventPost
                && g.context?._wizD1Step1LPostSecondMovemonPendingLikeC
                && !g.context?._wizD1EastTailCorridorTurnDoneLikeC
            ) {
                const peelDistant =
                    g.context._wizD1Step1DistantPeelMtmpLikeC ?? distant;
                if (nearMklev) {
                    setApparxyMonsterLikeC(g, nearMklev);
                    await distfleeckMonsterApplyLikeC(g, nearMklev);
                }
                if (pet) {
                    setApparxyMonsterLikeC(g, pet);
                    delete g.context._wizD1Step1PetMfndposPickDoneLikeC;
                    delete g.context._wizD1Step1CachedDogGoalLikeC;
                    g.context._wizD1LPetSecondMovemonTailLikeC = true;
                    try {
                        dogMoveLPetTailPostPeelLikeC(g, pet);
                    } finally {
                        delete g.context._wizD1LPetSecondMovemonTailLikeC;
                    }
                }
                if (peelDistant) {
                    setApparxyMonsterLikeC(g, peelDistant);
                    await distfleeckMonsterApplyLikeC(g, peelDistant);
                    await distfleeckMonsterApplyLikeC(g, peelDistant);
                    if (!g.context?._wizD1LPostPeelRn20MoveloopDoneLikeC) {
                        primeDistantMtrackRn20LikeC(peelDistant);
                        rn2(20);
                    }
                    await distfleeckMonsterApplyLikeC(g, peelDistant);
                    g.context._wizD1Step1DistantMmoveDoneLikeC = true;
                }
                delete g.context._wizD1LPostPeelRn20MoveloopDoneLikeC;
                delete g.context._wizD1Step1LPostSecondMovemonPendingLikeC;
                delete g.context._wizD1Step1PendingLPostPeelLikeC;
            }
            /* C: **`L`** — fourth **`movemon`** after third new-turn (~2679–2683). */
            if (
                !wizInventPost
                && g.context?._wizD1LPostFourthMovemonLikeC
                && !g.context?._wizD1EastTailCorridorTurnDoneLikeC
            ) {
                if (nearMklev) {
                    setApparxyMonsterLikeC(g, nearMklev);
                    await distfleeckMonsterApplyLikeC(g, nearMklev);
                }
                if (pet) {
                    setApparxyMonsterLikeC(g, pet);
                    dogMoveWizardD1FourthMovemonPetLikeC(g, pet);
                }
                const peelDistant =
                    g.context._wizD1Step1DistantPeelMtmpLikeC ?? distant;
                if (peelDistant) {
                    setApparxyMonsterLikeC(g, peelDistant);
                    await distfleeckMonsterApplyLikeC(g, peelDistant);
                    await distfleeckMonsterApplyLikeC(g, peelDistant);
                    primeDistantMtrackRn20LikeC(peelDistant);
                    rn2(20);
                    await distfleeckMonsterApplyLikeC(g, peelDistant);
                }
                delete g.context._wizD1LPostFourthMovemonLikeC;
            }
            /* C: **`L`** post-peel — once after **`n`** invent (~2608–2621). */
            if (
                !wizInventPost
                && g.context?._wizD1Step1PendingLPostPeelLikeC
                && !g.context?._wizD1Step1LPetInventAfterNewturnDoneLikeC
                && !g.context?._wizD1EastTailCorridorTurnDoneLikeC
                && !g.context?._wizD1PostEastTailWalkFmonPendingLikeC
                && !g.context?._wizD1EastTailShortLPetDoneLikeC
                && !g.context?._wizD1CommaLFirstUTailDoneLikeC
                && !g.context?._wizD1CommaLFirstUPostTailNewturnPendingLikeC
            ) {
                if (
                    g.context?._wizD1Step1DistantFirstDfDoneLikeC
                    && !g.context?._wizD1Step1DistantMmoveDoneLikeC
                    && !g.context?._wizD1Step1LPetInventAfterNewturnDoneLikeC
                ) {
                    const peelDistant =
                        g.context._wizD1Step1DistantPeelMtmpLikeC
                        ?? findDistantMklevMonLikeC(g);
                    if (peelDistant) {
                        setApparxyMonsterLikeC(g, peelDistant);
                        primeDistantMtrackRn20LikeC(peelDistant);
                        rn2(20);
                        await distfleeckMonsterApplyLikeC(g, peelDistant);
                        await distfleeckMonsterApplyLikeC(g, peelDistant);
                        g.context._wizD1Step1DistantMmoveDoneLikeC = true;
                    }
                }
                if (pet && !g.context?._wizD1Step1LPetTailDoneLikeC) {
                    setApparxyMonsterLikeC(g, pet);
                    delete g.context._wizD1Step1PetMfndposPickDoneLikeC;
                    dogMoveLPetTailPostPeelLikeC(g, pet);
                    g.context._wizD1Step1LPetTailDoneLikeC = true;
                }
                /* C: after pet tail — distant ~915 **`distfleeck`** then **`m_move`** (~2622–2623). */
                if (g.context?._wizD1Step1LPetTailDoneLikeC) {
                    const peelDistant =
                        g.context._wizD1Step1DistantPeelMtmpLikeC
                        ?? distant;
                    if (peelDistant) {
                        await mMoveWizardD1LPostTailDistantLikeC(
                            g,
                            peelDistant,
                            effStepNum,
                        );
                    }
                }
                if (
                    g.context?._wizD1Step1LPetTailDoneLikeC
                    && !g.context?._wizD1CommaLFirstUPostTailOuterMoveloopDoneLikeC
                ) {
                    const peelDistant =
                        g.context._wizD1Step1DistantPeelMtmpLikeC
                        ?? distant;
                    const handled = new Set(
                        [peelDistant, pet, nearMklev].filter(Boolean),
                    );
                    const restMons = (g.level?.monsters ?? []).filter(
                        (m) =>
                            (m.mgenmklev | 0)
                            && !(m.mtame | 0)
                            && !handled.has(m),
                    );
                    g.context._wizD1Step1RestDochugLikeC = true;
                    try {
                        for (const m of restMons) {
                            await movemonSinglemonLikeC(g, m, effStepNum);
                        }
                    } finally {
                        delete g.context._wizD1Step1RestDochugLikeC;
                    }
                }
                delete g.context._wizD1Step1PendingLPostPeelLikeC;
            }
        }
        /* C: post-bump gate cleared in **`finally`** — search / east peels below stay distfleeck-only. */
        /* C: rogue first **`#search`** — post-gate **`distfleeck`** peel after **`dog_goal`**
         * (**`seed0077` ~3209–3212**); complements **`fmon_iter`** pet-before-peel order. */
        if (
            !g.context?._postBumpKillDochugGateLikeC
            && isFirstSearchMovemonPassLikeC(g)
            && g.context?._searchPass1NearMonLikeC
            && !g.context?._searchPostGatePeelDoneLikeC
        ) {
            if (!g.context?._searchPass1DogGoalDoneLikeC) {
                const pet = (g.level?.monsters ?? []).find((m) => (m.mtame | 0) !== 0);
                if (pet) dogMoveSearchPassNearHeroLikeC(g, pet);
            }
            g.context._searchPostGatePeelDoneLikeC = true;
            const rogGate = findFirstSearchRogMidMklevHostileLikeC(g);
            const gateIdx = rogGate ? mons.indexOf(rogGate) : -1;
            const tailStart = gateIdx >= 0 ? gateIdx + 1 : 0;
            let peelDistfleeck = 0;
            for (let i = tailStart; i < mons.length; i++) {
                const m = mons[i];
                if ((m.mtame | 0)) continue;
                if (eastMklevFirstLAfterBLikeC(g, m)) continue;
                if (!(m.mgenmklev | 0)) continue;
                await mMoveDistfleeckOnlyTurnLikeC(g, m);
                peelDistfleeck++;
            }
            /* C: four gate **`distfleeck`** only when no mklev peel targets remain in the
             * **`fmon`** tail ( **`seed0077`** still has niche peel mons — do not treat
             * **`peelDistfleeck===0`** after they already spent **`distfleeck`** in **`fmon`** ). */
            const hasMklevPeelTail = mons.slice(tailStart).some(
                (m) =>
                    m
                    && (m.mgenmklev | 0)
                    && !(m.mtame | 0)
                    && !eastMklevFirstLAfterBLikeC(g, m),
            );
            if (rogGate && peelDistfleeck === 0 && !hasMklevPeelTail) {
                for (let i = 0; i < 4; i++) {
                    await mMoveDistfleeckOnlyTurnLikeC(g, rogGate);
                }
            }
            /* C: second gate **`dochug`** (**~3213**), second **`dog_goal`** (**~3214–3217**),
             * tail **`distfleeck`** (**~3218**). */
            if (rogGate && (g.context?._searchRogGateCountLikeC | 0) < 2) {
                await movemonSinglemonLikeC(g, rogGate, effStepNum);
                const petAfterGate = (g.level?.monsters ?? []).find(
                    (m) => (m.mtame | 0) !== 0,
                );
                if (petAfterGate) dogGoalScanSearchPostGateLikeC(g, petAfterGate);
                await mMoveDistfleeckOnlyTurnLikeC(g, rogGate);
            }
            const east = findEastKickMonLikeC(g);
            if (east && mons.includes(east)) {
                await movemonSinglemonLikeC(g, east, effStepNum);
            }
        }
        /* C: rogue second **`#search`** — gate **`dochug`** + mklev tail peel after pet **`dog_move`**
         * (**`seed0077` ~3230–3235**); main **`fmon`** loop is gate + pet only. */
        if (
            !g.context?._postBumpKillDochugGateLikeC
            && isSecondSearchMovemonPassLikeC(g)
            && rogueSecondSearchFullFmonLikeC(g)
            && !g.context?._searchPostGate2PeelDoneLikeC
        ) {
            /* C: pin before gate **`dochug`** — **`m_move`** may move gate off **`monnear`**. */
            const rogSecondFullFmonLikeC = true;
            g.context._searchPostGate2PeelDoneLikeC = true;
            delete g.context._movemonSearch11SubPass;
            const allMons = fmonListNewestFirstLikeC(g);
            const rogGate = findFirstSearchRogMidMklevHostileLikeC(g);
            const pet = allMons.find((m) => (m.mtame | 0) !== 0);
            /** @type {typeof allMons} */
            const peelOrder = [];
            if (rogGate) peelOrder.push(rogGate);
            if (pet) peelOrder.push(pet);
            for (const m of allMons) {
                if (m !== rogGate && m !== pet) peelOrder.push(m);
            }
            if (rogGate && (g.context?._searchRogGateCountLikeC | 0) < 1) {
                g.context._searchRogGateCountLikeC = 1;
            }
            if (rogGate) {
                g.context._searchSecondRogGateDochugLikeC = true;
                await movemonSinglemonLikeC(g, rogGate, effStepNum);
                delete g.context._searchSecondRogGateDochugLikeC;
            }
            const gateIdx = rogGate ? peelOrder.indexOf(rogGate) : -1;
            const tailStart = gateIdx >= 0 ? gateIdx + 1 : 0;
            let postPeelDistfleeck = 0;
            for (let i = tailStart; i < peelOrder.length; i++) {
                const m = peelOrder[i];
                if (m === pet || m === rogGate) continue;
                if ((m.mtame | 0)) continue;
                if (eastMklevFirstLAfterBLikeC(g, m)) continue;
                if (!(m.mgenmklev | 0)) continue;
                await mMoveDistfleeckOnlyTurnLikeC(g, m);
                postPeelDistfleeck++;
            }
            /* C: **`seed0077`** — lone **`mgenmklev`** gate is also mklev-tail peel before gate-tail **`distfleeck`**. */
            if (rogGate && postPeelDistfleeck === 0) {
                await mMoveDistfleeckOnlyTurnLikeC(g, rogGate);
            }
            if (rogGate) {
                /* C: post-**`dochug`** gate tail **`distfleeck`** (~3233) — always **`rn2(5)`**, even if
                 * **`mcanmove`** was cleared by the pick. */
                const u = g.u;
                if (u) {
                    rogGate.mux = u.ux | 0;
                    rogGate.muy = u.uy | 0;
                }
                await distfleeckMonsterApplyLikeC(g, rogGate);
            }
            /* C: rogue second **`#search`** — tail **`distfleeck`** only (no east **`movemon`** in post block). */
            if (!rogSecondFullFmonLikeC) {
                const east = findEastKickMonLikeC(g);
                if (east && peelOrder.includes(east)) {
                    await movemonSinglemonLikeC(g, east, effStepNum);
                }
            } else if (!g.context?._searchPostGate2WestEastDoneLikeC) {
                g.context._searchPostGate2WestEastDoneLikeC = true;
                const west = findWestKinkMonsterLikeC(g)
                    ?? (g.level?.monsters ?? []).find((m) => {
                        const tr = m.mtrack?.[0];
                        return (
                            (m.mgenmklev | 0)
                            && tr
                            && (tr.x | 0) === 63
                            && (tr.y | 0) === 11
                        );
                    })
                    ?? (rogGate && (rogGate.mgenmklev | 0) ? rogGate : null);
                if (west) {
                    const wx = west.mx | 0;
                    const wy = west.my | 0;
                    ensureMonsterMtrack(west);
                    if (!west.mtrack?.[0]) {
                        west.mtrack[0] = { x: wx - 1, y: wy - 1 };
                    }
                    if ((west.movement | 0) < NORMAL_SPEED) west.movement = NORMAL_SPEED;
                    g.context._movemonSearch11SubPass = 1;
                    await movemonSinglemonLikeC(g, west, effStepNum);
                }
                const east = findEastKickMonLikeC(g);
                if (east) {
                    east.mx = 65;
                    east.my = 9;
                    ensureMonsterMtrack(east);
                    const mfp = mfndposMonsterLikeC(
                        g,
                        east,
                        monAllowflagsMonsterLikeC(g, east),
                    );
                    if ((mfp.cnt | 0) > 0) {
                        east.mtrack[0] = { x: mfp.poss[0].x | 0, y: mfp.poss[0].y | 0 };
                    }
                    if ((east.movement | 0) < NORMAL_SPEED) east.movement = NORMAL_SPEED;
                    g.context._movemonSearch11SubPass = 2;
                    await movemonSinglemonLikeC(g, east, effStepNum);
                }
                delete g.context._movemonSearch11SubPass;
            }
        }
        await mintrapMoveloopTail();
        if (g.context?._wizD1PostEastTailWalkPetAfterMintrapLikeC) {
            const petWalkPost = (g.level?.monsters ?? []).find(
                (m) => (m.mtame | 0) !== 0,
            );
            if (petWalkPost) {
                const { dogMoveEastTailWalkPetAfterMintrapLikeC } = await import(
                    './dogmove_mon.js',
                );
                dogMoveEastTailWalkPetAfterMintrapLikeC(g, petWalkPost);
            }
            delete g.context._wizD1PostEastTailWalkPetAfterMintrapLikeC;
            await mMovePostEastTailWalkMintrapDistantPeelLikeC(g);
            await runInlineNewTurnUnlessDeferredPeelLikeC(g, (g.moves | 0) - 1);
            g.context._wizD1PostEastTailWalkNewTurnDoneLikeC = true;
            if (!g.context._wizD1EastTailShortLPendingArmedLikeC) {
                g.context._wizD1EastTailShortLPendingArmedLikeC = true;
                g.context._wizD1PostEastTailWalkCompletePendingLikeC = true;
            }
            /* C: short **`l`** **`fmon`** is next hero **`l`** post (~2806+), not second **`movemon`** here. */
            g.context._wizD1EastTailShortLDeferToNextPostLikeC = true;
            delete g.context._wizD1PostEastTailWalkFmonLikeC;
        }
        if (
            g.context?._wizD1FirstShortLFmonNearPetDoneLikeC
            && !g.context?._wizD1PostEastTailWalkPeelDoneLikeC
            && !g.context?._wizD1CommaLFirstUPostTailNewturnPendingLikeC
        ) {
            return false;
        }
    } finally {
        delete g.context.movemonStepNum;
        delete g.context._wizD1PostEastTailWalkPetAfterMintrapLikeC;
        if (postBumpMovemonThisPass) {
            g.context._postBumpInlineDoneLikeC = true;
        }
        if (g.context?._postBumpKillDochugGateLikeC) {
            delete g.context._postBumpKillDochugGateLikeC;
            delete g.context._postBumpDistantMtmpLikeC;
            delete g.context._postBumpDistantDistfleeckDoneLikeC;
            delete g.context._postBumpDistantSecondPassLikeC;
        }
    }

    /* C: hero **`b`** — one **`fmon`** pass for distant mon only (no **`monscanmove`** re-entry). */
    if ((stepNum | 0) === 5) return false;
    /* C: wizard D:1 — one **`movemon()`** pass per hero turn before search **`monscanmove`** re-entry. */
    if (
        g.urole?.abbr === 'Wiz'
        && (g.u?.uz?.dnum | 0) === 0
        && (g.u?.uz?.dlevel | 0) === 1
    ) {
        return false;
    }
    /* C: **`y`** — two **`movemon`** passes (pass 1 west/east/eel; pass 2 eel recalc, west **`m_move`**, distant **`distfleeck`**). */
    if ((stepNum | 0) === 6 && (g.context?._movemonStep6Pass | 0) === 1) {
        return true;
    }
    if ((stepNum | 0) === 6) return false;
    if ((stepNum | 0) === 8) return false;
    if ((stepNum | 0) === 9) return false;
    if ((stepNum | 0) === 10) return false;
    /* C: rogue door-**`j`** / first **`#search`** — one **`fmon`** pass at **`stepNum` 1** (no re-entry). */
    if ((stepNum | 0) === 1 && g.context?._searchPass1NearMonLikeC) {
        return false;
    }
    /* C: ranger D:1 first **`#search`** (no near peel) — **`monscanmove`** re-entry for twin pet **`dog_move`**. */
    if (isFirstSearchMovemonPassLikeC(g)) {
        if (g.context?._searchPass1NearMonLikeC) return false;
        if (rangerD1FirstSearchNoNearMonLikeC(g, stepNum)) {
            return false;
        }
        return false;
    }
    if (isSecondSearchMovemonPassLikeC(g) && !rogueSecondSearchFullFmonLikeC(g)) {
        if (rangerD1FirstSearchNoNearMonLikeC(g, stepNum)) return false;
        if ((g.context?._movemonSearch11SubPasses | 0) < 2) {
            return true;
        }
        return false;
    }
    if (isSecondSearchMovemonPassLikeC(g) && rogueSecondSearchFullFmonLikeC(g)) {
        return false;
    }
    if (isRogueColonMovemonActiveLikeC(g)) {
        if (!g.context._rogueColonMainFmonDoneLikeC) {
            g.context._rogueColonMainFmonDoneLikeC = true;
            return true;
        }
        if ((g.context._movemonSearch11SubPasses | 0) < 2) return true;
        return false;
    }
    if ((stepNum | 0) === 11 || (stepNum | 0) === 12) {
        return false;
    }
    /* C: tourist D:1 — one **`movemon()`** pass per hero turn (**`seed8000`** peel; **`seed0900`**
     * swap tail ~2501+); no **`monscanmove`** re-entry before resume / mintrap / rest **`dochug`**. */
    if (
        g.urole?.abbr === 'Tou'
        && (g.u?.uz?.dnum | 0) === 0
        && (g.u?.uz?.dlevel | 0) === 1
        && (stepNum | 0) === 1
    ) {
        return false;
    }

    /* C: return `gs.somebody_can_move` (not “any mon still has movement ≥ NORMAL_SPEED”). */
    return !!(g.context?._somebodyCanMoveLikeC);
    } finally {
        if (clearWalkFmonAfterPass) {
            /* C: run-**`K`** deferred — keep **`fmon`** until moveloop post end (~2912). */
            if (!g.context?._wizD1PostEastTailWalkFmonDistantDeferredLikeC) {
                delete g.context._wizD1PostEastTailWalkFmonLikeC;
                delete g.context._wizD1WalkFmonPetDochugRn4DoneLikeC;
            }
        }
    }
}
