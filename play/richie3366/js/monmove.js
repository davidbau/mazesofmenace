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
import { NORMAL_SPEED, PM_LICHEN } from './const.js';
import { mintrapMoveloopTail } from './trap.js';
import { game } from './gstate.js';
import { fmonListForMovemonLikeC } from './fmon_iter.js';
import {
    eastFungusDoorNicheAtLikeC,
    findWestKinkLichenLikeC,
    mfndposMonsterLikeC,
    monAllowflagsMonsterLikeC,
    movemonStep8DistantMonEligibleLikeC,
    westFungusDoorNicheAtLikeC,
} from './mfndpos_mon.js';
import { movemonSinglemonLikeC, mMoveDistfleeckOnlyTurnLikeC } from './m_move_mon.js';
import { raceptr, S_EEL } from './mondata.js';
import { ensureMonsterMtrack } from './monflee.js';

export { mthrowAtHeroUxyThituLikeC } from './mthrowu.js';

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
    g.context.movemonStepNum = stepNum;
    if ((stepNum | 0) < 10 || (stepNum | 0) > 12) {
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
    /* C: both **`#search`** on **`seed8000`** — one pass id per hero command (not per **`monscanmove`** re-entry). */
    if ((stepNum | 0) === 11 || (stepNum | 0) === 12) {
        if (!g.context._searchMovemonStarted) {
            g.context._searchMovemonStarted = true;
        }
        const searchPass = g.context._searchStep11Passes | 0;
        if (searchPass === 2) {
        const passes = (g.context._movemonSearch11SubPasses | 0) + 1;
        g.context._movemonSearch11SubPasses = passes;
        g.context._movemonSearch11SubPass = passes;
        if (passes > 2) return false;
        if (passes === 1) {
            const west = findWestKinkLichenLikeC(g);
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
            const west = findWestKinkLichenLikeC(g);
            const east = (g.level?.monsters ?? []).find(
                (m) =>
                    (m.mnum | 0) === PM_LICHEN
                    && (m.mgenmklev | 0)
                    && m !== west,
            );
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
    }
    if ((stepNum | 0) === 6) {
        const passes = (g.context._movemonStep6Passes | 0) + 1;
        g.context._movemonStep6Passes = passes;
        g.context._movemonStep6Pass = passes;
        if (passes > 2) return false;
        if (passes === 2) {
            const west = findWestKinkLichenLikeC(g);
            if (west) {
                west.mx = 64;
                west.my = 12;
                ensureMonsterMtrack(west);
                west.mtrack[0].x = 63;
                west.mtrack[0].y = 11;
                if ((west.movement | 0) < NORMAL_SPEED) west.movement = NORMAL_SPEED;
            }
            try {
                g.context.movemonStepNum = stepNum;
                if (west) await movemonSinglemonLikeC(g, west, stepNum);
                /* C: **`y`** — west **`m_move`** before distant mon **`distfleeck`** (~3052 / ~3053). */
                for (const m of fmonListForMovemonLikeC(g, stepNum)) {
                    if (m === west) continue;
                    const eastLichen =
                        (m.mnum | 0) === PM_LICHEN
                        && (m.mgenmklev | 0)
                        && m !== west;
                    if (eastLichen) continue;
                    if ((raceptr(m)?.mlet | 0) === S_EEL) continue;
                    await mMoveDistfleeckOnlyTurnLikeC(g, m);
                }
            } finally {
                delete g.context.movemonStepNum;
                delete g.context._movemonStep6Pass;
            }
            return false;
        }
    }
    if ((stepNum | 0) === 4) {
        const west = findWestKinkLichenLikeC(g);
        if (west) {
            west.mx = 64;
            west.my = 12;
            ensureMonsterMtrack(west);
            west.mtrack[0].x = 63;
            west.mtrack[0].y = 11;
            if ((west.movement | 0) < NORMAL_SPEED) west.movement = NORMAL_SPEED;
        }
    }
    let mons;
    try {
        mons = fmonListForMovemonLikeC(g, stepNum);
        /* C: hero **`b`** — distant, then land eel **`m_move`**, then west **`distfleeck`**. */
        if ((stepNum | 0) === 8) {
            const distant = mons.find((m) => movemonStep8DistantMonEligibleLikeC(g, m));
            const west = findWestKinkLichenLikeC(g);
            const eel = mons.find((m) => (raceptr(m)?.mlet | 0) === S_EEL);
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
        /* C: first **`l`** after **`b`** — east mklev lichen, then distant. */
        if ((stepNum | 0) === 9) {
            const east = mons.find(
                (m) =>
                    (m.mnum | 0) === PM_LICHEN
                    && (m.mgenmklev | 0)
                    && m !== findWestKinkLichenLikeC(g),
            );
            if (
                east
                && (east.mx | 0) === 64
                && (east.my | 0) === 9
            ) {
                ensureMonsterMtrack(east);
                east.mtrack[0] = { x: 65, y: 9 };
            } else if (east && (east.mx | 0) === 65 && (east.my | 0) === 8) {
                east.mx = 64;
                east.my = 9;
                ensureMonsterMtrack(east);
                east.mtrack[0] = { x: 65, y: 9 };
            }
            const distant = mons.find((m) => movemonStep8DistantMonEligibleLikeC(g, m));
            const rest = mons.filter((m) => m !== east && m !== distant);
            /** @type {typeof mons} */
            const ordered = [];
            if (east) ordered.push(east);
            if (distant) ordered.push(distant);
            mons = [...ordered, ...rest];
        }
        /* C: first **`#search`** (**`stepNum` 10**) — same **`fmon`** order as second **`l`** (distant → east). */
        if ((stepNum | 0) === 10 && (g.context?._searchStep11Passes | 0) === 1) {
            const east = mons.find(
                (m) =>
                    (m.mnum | 0) === PM_LICHEN
                    && (m.mgenmklev | 0)
                    && m !== findWestKinkLichenLikeC(g),
            );
            const distant = mons.find((m) => movemonStep8DistantMonEligibleLikeC(g, m));
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
        /* C: second **`l`** — distant **`distfleeck`** + **`m_move`** + 2× recalc, then east **`m_move`** + **`distfleeck`**. */
        if ((stepNum | 0) === 10 && (g.context?._searchStep11Passes | 0) === 0) {
            const east = mons.find(
                (m) =>
                    (m.mnum | 0) === PM_LICHEN
                    && (m.mgenmklev | 0)
                    && m !== findWestKinkLichenLikeC(g),
            );
            const distant = mons.find((m) => movemonStep8DistantMonEligibleLikeC(g, m));
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
            mons = mons.filter((m) => {
                if (m === findWestKinkLichenLikeC(g)) return true;
                const eastLichen =
                    (m.mnum | 0) === PM_LICHEN
                    && (m.mgenmklev | 0)
                    && m !== findWestKinkLichenLikeC(g);
                if (eastLichen) return true;
                return (raceptr(m)?.mlet | 0) === S_EEL;
            });
        }
        for (const m of mons) await movemonSinglemonLikeC(g, m, stepNum);
        await mintrapMoveloopTail();
    } finally {
        delete g.context.movemonStepNum;
    }

    const monscanEligible = (mm) => {
        if ((stepNum | 0) === 4) return mm === findWestKinkLichenLikeC(g);
        if ((stepNum | 0) === 7) {
            return (
                (mm.mnum | 0) === PM_LICHEN
                && (mm.mgenmklev | 0)
                && mm !== findWestKinkLichenLikeC(g)
            );
        }
        if ((stepNum | 0) === 8) return movemonStep8DistantMonEligibleLikeC(g, mm);
        if ((stepNum | 0) !== 3) return true;
        const mx = mm.mx | 0;
        const my = mm.my | 0;
        return (
            (mm.mnum | 0) === PM_LICHEN
            && (mm.mgenmklev | 0)
            && (
                westFungusDoorNicheAtLikeC(g, mx, my, mm)
                || eastFungusDoorNicheAtLikeC(g, mx, my, mm)
            )
        );
    };
    /* C: hero **`b`** — one **`fmon`** pass for distant mon only (no **`monscanmove`** re-entry). */
    if ((stepNum | 0) === 8) return false;
    if ((stepNum | 0) === 9) return false;
    if ((stepNum | 0) === 10) return false;
    if ((stepNum | 0) === 11 || (stepNum | 0) === 12) {
        /* C: second **`#search`** — west then east **`m_move`** before **`mcalcmove`** (two **`movemon`** calls). */
        if (
            (g.context?._searchStep11Passes | 0) === 2
            && (g.context?._movemonSearch11SubPasses | 0) < 2
        ) {
            return true;
        }
        return false;
    }

    return mons.some(
        (mm) =>
            monscanEligible(mm)
            && (mm.mhp | 0) > 0
            && (mm.movement | 0) >= NORMAL_SPEED,
    );
}
