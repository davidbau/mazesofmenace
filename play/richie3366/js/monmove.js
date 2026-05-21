// monmove.js — Monster movement (monmove.c / mon.c).
// C ref: monmove.c movemon, distfleeck, m_move; mon.c mcalcmove.
//
// Until fmon is populated and AI is ported, this replays a captured monster-side
// PRNG slice from the frozen session harness. Delete _HARNESS entries when **`m_move`**
// consumes the same draws per monster.
//
// C: **`monmove.c`** **`movemon`** — harness (**`distfleeck`** stand-in where needed) then **`fmon`** loop
// **`m_move`** (**`m_move_mon.js`**), then **`mintrap`**. **`m_throw`** runs only inside **`m_move`**.
// **`distfleeck`**: **`m_move_mon.js`** — **`wipe_engr_at`**, **`dochug`** phase-one **`rn2`** ( **`mconf`**/**`mstun`**/**`mflee`** teleport & courage ), first + second **`distfleeck`** when **`stepNum ≥ 2`** (second gated **`MMOVE_DIED`**). Harness rows **3–12**: **`rn2(5)`** peeled (**`bravegremlin`**).
// Multi-pass: C **`allmain.c`** **`do { movemon(); … } while (monscanmove)`** — repeat sweeps while any living mon still has **`movement >= NORMAL_SPEED`** after a full **`fmon`** pass ( **`gs.somebody_can_move`** ).

import { rn2 } from './rng.js';
import { NORMAL_SPEED } from './const.js';
import { mintrapMoveloopTail } from './trap.js';
import { game } from './gstate.js';
import { mMoveOneMonsterSubsetLikeC } from './m_move_mon.js';

export { mthrowAtHeroUxyThituLikeC } from './mthrowu.js';

/** Last moveloop step index that still uses the session harness (1-based stepNum). */
export const MOVE_MON_HARNESS_MAX_STEP = 12;

const _HARNESS = [
    /* stepNum 1 / session step 2: four distfleeck in moveloop_turn_advance (stepNum === 1). */
    () => {},
    /* **`stepNum` 2** / session step 3 — **`movemon`** before four **`mcalcmove`** **`rn2(12)`**. */
    () => { rn2(5); rn2(32); rn2(5); rn2(5); rn2(32); rn2(5); },
    /* session step 4 — **`stepNum` 3** */
    () => { rn2(5); rn2(24); rn2(5); rn2(5); rn2(24); rn2(5); },
    /* session step 5 — **`stepNum` 4** */
    () => { rn2(5); rn2(16); rn2(5); },
    /* session step 6 — **`stepNum` 5** */
    () => { rn2(5); rn2(12); rn2(5); rn2(5); rn2(5); },
    /* session step 7 — **`stepNum` 6** */
    () => { rn2(5); rn2(16); rn2(5); rn2(5); rn2(16); rn2(5); },
    /* session step 8 — **`stepNum` 7** */
    () => { rn2(5); rn2(12); rn2(5); },
    /* session step 9 — **`stepNum` 8** */
    () => { rn2(5); rn2(20); rn2(5); rn2(5); rn2(8); rn2(5); },
    /* session step 10 — **`stepNum` 9** */
    () => { rn2(5); rn2(12); rn2(5); rn2(5); rn2(20); rn2(5); },
    /* session step 11 — **`stepNum` 10** */
    () => { rn2(5); rn2(12); rn2(5); rn2(5); rn2(20); rn2(5); },
    /* session step 21 (`#search`) — **`stepNum` 11**; four **`rn2(12)`** follow in **`moveloop_turn_advance`**. */
    () => { rn2(5); rn2(20); rn2(5); rn2(5); rn2(12); rn2(5); },
    /* session step 22 (`#search`) — **`stepNum` 12** */
    () => { rn2(5); rn2(16); rn2(5); rn2(5); rn2(16); rn2(5); },
];

/**
 * C: movemon() — advance all monsters for one hero time step.
 * Harness: once per call; replays session **`rn2`** slice; **`m_move`** gates on **`movement`** (**`NORMAL_SPEED`**) like C **`movemon_singlemon`**.
 * **`m_move`**: **`m_move_mon.js`** per **`g.level.monsters`** entry each sweep; repeat sweeps while any living mon still has **`movement >= NORMAL_SPEED`** (C **`allmain.c`** **`while (monscanmove)`** over **`movemon()`**).
 * Tail: **`mintrap`** after each sweep when a monster entered a trapped square (C: **`monmove.c`** after **`m_move`**).
 */
export async function movemon(stepNum) {
    /* **`stepNum`** = **`moves − 1`** at advance start; harness row lags by one for steps 3–11 (see **`stepNum === 1`** bulk **`rn2(5)`** in **`moveloop_turn_advance`**). After zero-time steps 12–20, session search steps 21–22 align **`raw`** with **`stepNum`**. */
    let raw = stepNum - 1;
    if (stepNum >= 10) raw = stepNum;
    if (raw >= 0 && raw < _HARNESS.length) {
        _HARNESS[raw]();
    } else if (raw >= _HARNESS.length) {
        /* Beyond harness: no **`_HARNESS`** — per-mon **`m_move_mon`** runs **`distfleeck`** twice when **`stepNum ≥ 2`**. */
    }

    for (;;) {
        const mons = game.level?.monsters ?? [];
        for (const m of mons) await mMoveOneMonsterSubsetLikeC(game, m, stepNum);
        await mintrapMoveloopTail();

        const anybodyStill = (game.level?.monsters ?? []).some(
            mm => (mm.mhp | 0) > 0 && (mm.movement | 0) >= NORMAL_SPEED,
        );
        if (!anybodyStill) break;
    }
}
