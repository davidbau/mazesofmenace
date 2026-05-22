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
import { NORMAL_SPEED } from './const.js';
import { mintrapMoveloopTail } from './trap.js';
import { game } from './gstate.js';
import { fmonListNewestFirstLikeC } from './fmon_iter.js';
import { movemonSinglemonLikeC } from './m_move_mon.js';

export { mthrowAtHeroUxyThituLikeC } from './mthrowu.js';

/** Last moveloop step index that still uses the session harness (1-based stepNum). */
export const MOVE_MON_HARNESS_MAX_STEP = 12;

/** `null` = harness peeled; run real **`fmon`** loop. */
const _HARNESS = [
    /* stepNum 1 — peeled: **`mMoveDistfleeckOnlyTurnLikeC`** (one **`rn2(5)`** per monster). */
    null,
    /* stepNum 2 — session step 3 (`n`); peeled — door-niche **`CORR`** + silent **`m_move`**. */
    null,
    /* session step 4 — **`stepNum` 3**; peel when **`mfndpos cnt=6`** + 2-mon **`dochug`** parity. */
    null,
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

    const mons = fmonListNewestFirstLikeC(game);
    for (const m of mons) await movemonSinglemonLikeC(game, m, stepNum);
    await mintrapMoveloopTail();

    return mons.some(mm => (mm.mhp | 0) > 0 && (mm.movement | 0) >= NORMAL_SPEED);
}
