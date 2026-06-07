// monmove_search.js — `#search` movemon pass ids (cmd.js → movemon).
// C ref: monmove.c movemon order on first/second search after D:1 door niche.

import { peekReplayMoves } from './input.js';
import { findFirstSearchRogMidMklevHostileLikeC } from './mfndpos_mon.js';

/** C: first **`#search`** — **`_searchStep11Passes===1`** (session **`movemonStepNum`** may be 11 or 21+). */
export function isFirstSearchMovemonPassLikeC(g) {
    return (g.context?._searchStep11Passes | 0) === 1;
}

/** @param {import('./gstate.js').game} g @returns {boolean} */
export function isRangerLikeC(g) {
    return (
        g.urole?.abbr === 'Ran'
        || g.pl_character === 'Ranger'
        || (g.urole?.mnum | 0) === 8
    );
}

/**
 * C: ranger D:1 twin **`#search`** without rogue/tourist near-mklev peel — pet **`dog_move`**
 * before **`mcalcmove`** (**`seed0102`** ~4448+ / ~4466+; not tourist west/east subpasses).
 *
 * @param {import('./gstate.js').game} g
 * @param {number} [stepNum]
 */
export function rangerD1FirstSearchNoNearMonLikeC(g, stepNum = 0) {
    if (!isRangerLikeC(g)) return false;
    if ((g.u?.uz?.dnum | 0) !== 0 || (g.u?.uz?.dlevel | 0) !== 1) return false;
    const searchPass = g.context?._searchStep11Passes | 0;
    /* C: ranger D:1 — pet-only peel on first and second **`#search`** (**`seed0102`**). */
    if (searchPass === 1 || searchPass === 2) return true;
    /* Inline **`#search`** post may clear pass id before peel **`movemon`**. */
    if (g.context?._searchInlinePostDoneLikeC && (stepNum | 0) === 11) return true;
    return false;
}

/** C: capital **`K`**, comma, **`l`**, first **`U`** — near **`distfleeck`** before pet **`mfndpos`** (~2986). */
export function wizD1CommaLFirstUAfterCommaLLikeC(g) {
    if (g.urole?.abbr !== 'Wiz') return false;
    if ((g.u?.uz?.dnum | 0) !== 0 || (g.u?.uz?.dlevel | 0) !== 1) return false;
    return (
        peekReplayMoves(-1) === 'U'.charCodeAt(0)
        && peekReplayMoves(-2) === 'l'.charCodeAt(0)
        && peekReplayMoves(-3) === ','.charCodeAt(0)
    );
}

/** C: wizard D:1 — short **`l`** **`fmon`** after east-tail walk mintrap (~2806+). */
export function wizD1EastTailShortLActiveLikeC(g) {
    return (
        g.urole?.abbr === 'Wiz'
        && (g.u?.uz?.dnum | 0) === 0
        && (g.u?.uz?.dlevel | 0) === 1
        && (
            !!g.context?._wizD1PostEastTailWalkCompleteLikeC
            || !!g.context?._wizD1PostEastTailWalkPeelDoneLikeC
        )
    );
}

/**
 * C: **`movemon`** step-1 peel — bulk **`distfleeck`** per **`fmon`** at **`stepNum===1`**
 * (tourist **`seed8000`**); tame pets still need **`dog_move`** and **`dog_goal`** in that pass
 * (**`seed0006`**). Rogue near mklev also on first **`#search`** (**`seed0077`**).
 *
 * @param {import('./gstate.js').game} g
 * @param {number} stepNum
 */
export function isMovemonStepOnePeelLikeC(g, stepNum) {
    if ((stepNum | 0) === 1) return true;
    if (wizD1EastTailShortLActiveLikeC(g)) return true;
    /* C: post-east-tail walk **`fmon`** peel — not session step 1 (**`seed0006`** ~2781+). */
    if (
        g.urole?.abbr === 'Wiz'
        && (g.u?.uz?.dnum | 0) === 0
        && (g.u?.uz?.dlevel | 0) === 1
        && g.context?._wizD1PostEastTailWalkFmonLikeC
        && !g.context?._wizD1PostEastTailWalkCompleteLikeC
    ) {
        return true;
    }
    return (
        isFirstSearchMovemonPassLikeC(g)
        && !!g.context?._searchPass1NearMonLikeC
    );
}

/** C: wizard D:1 — **`movemon(stepNum 1)`** peel + post-peel distant **`m_move`** (**`seed0006`** **`n`**). */
export function isWizardD1Step1PeelLikeC(g, stepNum) {
    const wizD1 =
        g.urole?.abbr === 'Wiz'
        && (g.u?.uz?.dnum | 0) === 0
        && (g.u?.uz?.dlevel | 0) === 1;
    if (!wizD1) return false;
    if (wizD1EastTailShortLActiveLikeC(g)) return true;
    return (
        (
            !!g.context?._postBumpInlineDoneLikeC
            || !!g.context?._wizD1PostEastTailWalkFmonLikeC
            || !!g.context?._wizD1EastTailShortLInlinedLikeC
        )
        && (stepNum | 0) === 1
    );
}

/** Rogue near peel only (sleeping **`mgenmklev`** / gate); not tourist step-1 bulk peel. */
export function isRogFirstSearchStepOnePeelLikeC(g, stepNum) {
    if (!g.context?._searchPass1NearMonLikeC) return false;
    if ((stepNum | 0) === 1) return true;
    return isFirstSearchMovemonPassLikeC(g);
}

/** C: second **`#search`** — **`_searchStep11Passes===2`**. */
export function isSecondSearchMovemonPassLikeC(g) {
    return (g.context?._searchStep11Passes | 0) === 2;
}

/**
 * C: rogue **`seed0077`** second **`#search`** — gate **`distfleeck`** + pet **`dog_move`**
 * (not tourist west/east **`movemon`** subpasses).
 *
 * @param {import('./gstate.js').game} g
 */
export function rogueSecondSearchFullFmonLikeC(g) {
    const rogueLike =
        g.urole?.abbr === 'Rog'
        || g.pl_character === 'Rogue'
        || (g.urole?.mnum | 0) === 7;
    if (!rogueLike) return false;
    if ((g.u?.uz?.dnum | 0) !== 0 || (g.u?.uz?.dlevel | 0) !== 1) return false;
    return !!findFirstSearchRogMidMklevHostileLikeC(g);
}

/**
 * C: **`#search`** on early D:1 (**`seed0077`**) — **`movemon`** still uses session step **11**
 * peel paths while **`g.moves − 1`** is low (e.g. **4**). Without this, step-**`h`** gates skip all
 * **`fmon`** entries and RNG diverges before pet **`dog_goal`**.
 *
 * @param {import('./gstate.js').game} g
 * @param {number} stepNum — raw **`(moves − 1)`** from moveloop
 * @returns {number}
 */
export function effectiveMovemonStepNumLikeC(g, stepNum) {
    const raw = stepNum | 0;
    /* C: `#search` peel uses step-11 handlers only on the low-`moves` moveloop pass that
     * follows **`s`** — not on later D:1 commands (**`seed0006`** post-bump **`l`** ~2558). */
    if (g.context?._postBumpKillDochugGateLikeC) return raw;
    const searchPass = g.context?._searchStep11Passes | 0;
    if ((searchPass === 1 || searchPass === 2) && !isRogueColonMovemonActiveLikeC(g)) {
        /* C: ranger **`#search`** — peel at step 11 even when **`moves−1`** is high (**`seed0102`**). */
        if (isRangerLikeC(g) && (searchPass === 1 || searchPass === 2)) return 11;
        /* C: first **`#search`** — peel at step 11 even when **`moves−1`** is high (**`seed0102`** ~21). */
        if (searchPass === 1) return 11;
        if (raw <= 12) return 11;
    }
    return raw;
}

/** C: between consecutive **`#search`** keys — reset peel counters, keep pass id. */
export function clearSearchMovemonSubHarnessLikeC(g) {
    if (!g.context) return;
    delete g.context._searchRogGateCountLikeC;
    delete g.context._searchPass1DogGoalDoneLikeC;
    delete g.context._searchRogGateDoneLikeC;
    delete g.context._searchPostGatePeelDoneLikeC;
    delete g.context._searchPostGate2PeelDoneLikeC;
    delete g.context._searchPostGate2WestEastDoneLikeC;
    delete g.context._searchSecondRogGateDochugLikeC;
    delete g.context._searchMovemonStarted;
    delete g.context._movemonSearch11SubPasses;
    delete g.context._movemonSearch11SubPass;
    delete g.context._rangerFirstSearchPetFirstPassDoneLikeC;
    delete g.context._rangerFirstSearchPetSecondPassDoneLikeC;
    delete g.context._rangerSecondSearchMklevPeelDoneLikeC;
    delete g.context._rangerPass2InlineApportRn8DeferLikeC;
    delete g.context._rangerPass2InlineInventPrescanDoneLikeC;
    delete g.context._rangerPass2InlineSecondInventPrescanDoneLikeC;
    delete g.context._rangerPass2InlineDeferredApportRn8DoneLikeC;
    delete g.context._rangerPass2InlineDeferredApportObjLikeC;
    delete g.context._rangerPass2InlineFloorRankCacheLikeC;
    delete g.context._rangerPass2InlinePreMfndposDistfleeckDoneLikeC;
    delete g.context._rangerPass2InlineMfndposAwayRn12CountLikeC;
}

/** Drop all `#search` harness state before a non-search command (C **`:`** after **`s`**). */
export function clearSearchMovemonHarnessLikeC(g) {
    if (!g.context) return;
    clearSearchMovemonSubHarnessLikeC(g);
    delete g.context._searchStep11Passes;
    delete g.context._searchPass1NearMonLikeC;
}

/** C: rogue **`:`** after **`#search`** — next moveloop post uses full **`fmon`** (not door-**`j`** peel). */
export function armRogueColonMovemonPendingLikeC(g) {
    if (!g.context) return;
    g.context._rogueColonMovemonPendingLikeC = true;
    delete g.context._searchStep11Passes;
}

/** @returns {boolean} */
export function isRogueColonMovemonActiveLikeC(g) {
    return !!g.context?._rogueColonMovemonActiveLikeC;
}

/**
 * C: low **`g.moves`** maps **`movemonStepNum`** to door-**`j`** peel — colon **`:`** needs generic **`dochug`**.
 * @param {import('./gstate.js').game} g
 * @returns {number|null}
 */
export function consumeRogueColonMovemonPendingLikeC(g) {
    if (!g.context?._rogueColonMovemonPendingLikeC) return null;
    delete g.context._rogueColonMovemonPendingLikeC;
    g.context._rogueColonMovemonActiveLikeC = true;
    delete g.context._rogueColonMainFmonDoneLikeC;
    delete g.context._movemonSearch11SubPasses;
    delete g.context._movemonSearch11SubPass;
    delete g.context._searchInlinePostDoneLikeC;
    return Math.max((g.moves | 0), 31);
}

/** @param {import('./gstate.js').game} g */
export function clearRogueColonMovemonActiveLikeC(g) {
    if (!g.context) return;
    delete g.context._rogueColonMovemonActiveLikeC;
    delete g.context._rogueColonMovemonStepLikeC;
    delete g.context._rogueColonMainFmonDoneLikeC;
    delete g.context._movemonSearch11SubPasses;
    delete g.context._movemonSearch11SubPass;
}
