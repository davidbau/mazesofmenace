// monmove.js — Monster movement (monmove.c / mon.c).
// C ref: monmove.c movemon, distfleeck, m_move; mon.c mcalcmove.
//
// Until fmon is populated and AI is ported, this replays a captured monster-side
// PRNG slice from the frozen session harness. Delete _HARNESS entries when **`m_move`**
// consumes the same draws per monster.
//
// C: **`monmove.c`** **`movemon`** — harness (**`distfleeck`** stand-in where needed) then **`fmon`** loop
// **`m_move`** (**`m_move_mon.js`**), then **`mintrap`**. **`m_throw`** runs only inside **`m_move`**.
// **`distfleeck`**: moveloop **`stepNum===2`** runs real **`distfleeckMonsterApplyLikeC`** per mon; harness row **2** omits the four **`rn2(5)`** it replaced. **`stepNum > 12`**: no **`_HARNESS`** replay — same **`distfleeck`** per mon as C **`dochug`** (~791) before **`m_throw`**. Trailing **`rn2(12)×4`** were removed from rows **2–12**: **`mcalcmove`** for all **`fmon`** is replayed in **`runPostCommandTurnAdvanceLikeC`** after **`movemon`** (C **`allmain.c`** order).
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
    /* **`mcalcmove`** draws replayed in **`runPostCommandTurnAdvanceLikeC`** after **`movemon`** when **`monsters`** is empty. */
    () => {},
    () => {},
    () => { rn2(5); rn2(32); rn2(5); rn2(5); rn2(32); rn2(5); },
    () => { rn2(5); rn2(24); rn2(5); rn2(5); rn2(24); rn2(5); },
    () => { rn2(5); rn2(16); rn2(5); },
    () => { rn2(5); rn2(12); rn2(5); rn2(5); rn2(5); },
    () => { rn2(5); rn2(16); rn2(5); rn2(5); rn2(16); rn2(5); },
    () => { rn2(5); rn2(12); rn2(5); },
    () => { rn2(5); rn2(20); rn2(5); rn2(5); rn2(8); rn2(5); },
    () => { rn2(5); rn2(12); rn2(5); rn2(5); rn2(20); rn2(5); },
    // moveloop steps 11–12: #search (harness tail)
    () => { rn2(5); rn2(20); rn2(5); rn2(5); rn2(12); rn2(5); },
    () => { rn2(5); rn2(16); rn2(5); rn2(5); rn2(16); rn2(5); },
];

/**
 * C: movemon() — advance all monsters for one hero time step.
 * Harness: once per call; replays session **`rn2`** slice; **`m_move`** gates on **`movement`** (**`NORMAL_SPEED`**) like C **`movemon_singlemon`**.
 * **`m_move`**: **`m_move_mon.js`** per **`g.level.monsters`** entry each sweep; repeat sweeps while any living mon still has **`movement >= NORMAL_SPEED`** (C **`allmain.c`** **`while (monscanmove)`** over **`movemon()`**).
 * Tail: **`mintrap`** after each sweep when a monster entered a trapped square (C: **`monmove.c`** after **`m_move`**).
 */
export async function movemon(stepNum) {
    const raw = stepNum - 1;
    if (raw >= 0 && raw < _HARNESS.length) {
        _HARNESS[raw]();
    } else if (raw >= _HARNESS.length) {
        /* Beyond harness: C **`dochug`** RNG is per-**`fmon`** (**`distfleeck`**, **`m_move`**, …), not a fixed row.
           Do not replay **`_HARNESS`** — **`mMoveOneMonsterSubsetLikeC`** runs **`distfleeck`** when **`stepNum > 12`**. */
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
