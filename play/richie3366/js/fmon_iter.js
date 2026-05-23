// fmon_iter.js — Walk monsters in C fmon chain order (newest first).
// C ref: makemon.c — `mtmp->nmon = fmon; fmon = mtmp` prepends each new monster.

import { PM_LICHEN } from './const.js';
import { S_EEL, raceptr } from './mondata.js';
import {
    eastFungusDoorNicheAtLikeC,
    findWestKinkLichenLikeC,
    movemonStep8DistantMonEligibleLikeC,
    westFungusDoorNicheAtLikeC,
} from './mfndpos_mon.js';

/**
 * C: **`for (mtmp = fmon; mtmp; mtmp = mtmp->nmon)`** — newest **`makemon`** first.
 * **`makemon.js`** prepends with **`unshift`** so array order matches C.
 *
 * @param {import('./gstate.js').game} g
 * @returns {Record<string, unknown>[]}
 */
export function fmonListNewestFirstLikeC(g) {
    return g.level?.monsters ?? [];
}

/**
 * C: first **`moves===1`** **`mcalcmove`** — **`fmon`** newest-first; **`fill_ordinary_room`**
 * creates the distant sleeping mon before the land eel, but **`makemon`** prepends so the eel
 * is newer and would take the third **`rn2(12)`** (**`11`**) while C assigns it to the distant mon.
 * Swap only for this pass (**`movemon`** order unchanged). Pairs with distant-only human
 * **`mmove`** floor in **`mcalc_move.js`** on **`moves===1`** (eel uses real **`data->mmove`**).
 *
 * @param {import('./gstate.js').game} g
 * @returns {Record<string, unknown>[]}
 */
export function fmonListForMcalcmoveLikeC(g) {
    const mons = [...fmonListNewestFirstLikeC(g)];
    if ((g.moves | 0) !== 1 || mons.length < 2) return mons;
    const eelIdx = mons.findIndex((m) => (raceptr(m)?.mlet | 0) === S_EEL);
    const distIdx = mons.findIndex((m) => movemonStep8DistantMonEligibleLikeC(g, m));
    if (eelIdx < 0 || distIdx < 0 || eelIdx >= distIdx) return mons;
    const tmp = mons[eelIdx];
    mons[eelIdx] = mons[distIdx];
    mons[distIdx] = tmp;
    return mons;
}

/**
 * C: **`movemon`** walk order — step **`j`** runs west kink lichen before east (**`rn2(24)`** pair).
 * @param {import('./gstate.js').game} g
 * @param {number} [stepNum]
 */
export function fmonListForMovemonLikeC(g, stepNum = 0) {
    const mons = fmonListNewestFirstLikeC(g);
    if ((stepNum | 0) === 4) {
        const west = findWestKinkLichenLikeC(g);
        return west ? [west] : [];
    }
    if ((stepNum | 0) !== 3) return mons;
    const west = mons.find(
        (m) =>
            (m.mnum | 0) === PM_LICHEN
            && (m.mgenmklev | 0)
            && westFungusDoorNicheAtLikeC(g, m.mx | 0, m.my | 0, m)
    );
    const east = mons.find(
        (m) =>
            (m.mnum | 0) === PM_LICHEN
            && (m.mgenmklev | 0)
            && eastFungusDoorNicheAtLikeC(g, m.mx | 0, m.my | 0, m),
    );
    const rest = mons.filter((m) => m !== west && m !== east);
    return [west, east, ...rest].filter(Boolean);
}
