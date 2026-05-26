// monmove_search.js — `#search` movemon pass ids (cmd.js → movemon).
// C ref: monmove.c movemon order on first/second search after D:1 door niche.

import { findFirstSearchRogMidMklevHostileLikeC } from './mfndpos_mon.js';

/** C: first **`#search`** — **`_searchStep11Passes===1`** (session **`movemonStepNum`** may be 11 or 21+). */
export function isFirstSearchMovemonPassLikeC(g) {
    return (g.context?._searchStep11Passes | 0) === 1;
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
    return (
        isFirstSearchMovemonPassLikeC(g)
        && !!g.context?._searchPass1NearMonLikeC
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
        || (g.urole?.mnum | 0) === 8;
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
    const searchPass = g.context?._searchStep11Passes | 0;
    if (
        (searchPass === 1 || searchPass === 2)
        && !isRogueColonMovemonActiveLikeC(g)
    ) {
        return 11;
    }
    return stepNum | 0;
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
