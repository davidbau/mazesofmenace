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
import { fmonListForMovemonLikeC, fmonListNewestFirstLikeC } from './fmon_iter.js';
import {
    eastFungusDoorNicheAtLikeC,
    findDistantMklevMonLikeC,
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
import { setApparxyMonsterLikeC } from './set_apparxy_mon.js';
import {
    movemonSinglemonLikeC,
    mMoveDistfleeckOnlyTurnLikeC,
    mMoveWizardD1Step1DistantAfterPeelLikeC,
    mMoveWizardD1EastTailCorridorRestLikeC,
    mMoveWizardD1LPostTailDistantLikeC,
    primeDistantMtrackRn20LikeC,
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
} from './dogmove_mon.js';
import { isWizardD1Step1PeelLikeC } from './monmove_search.js';
import { raceptr, S_EEL } from './mondata.js';
import { ensureMonsterMtrack } from './monflee.js';

export { mthrowAtHeroUxyThituLikeC } from './mthrowu.js';

export {
    effectiveMovemonStepNumLikeC,
    isFirstSearchMovemonPassLikeC,
    isSecondSearchMovemonPassLikeC,
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
    const clearWalkFmonAfterPass = !!g.context?._wizD1PostEastTailWalkFmonLikeC;
    if (clearWalkFmonAfterPass) {
        delete g.context._wizD1LPostEastTailAfterMcalcmoveLikeC;
        delete g.context._wizD1Step1GateDochugLikeC;
        delete g.context._postBumpKillDochugGateLikeC;
    }
    try {
    const rogueLike =
        g.urole?.abbr === 'Rog'
        || g.pl_character === 'Rogue'
        || (g.urole?.mnum | 0) === 8;
    /* C: rogue near mklev peel — only on **`#search`** passes (cmd sets flags; do not arm on every movemon). */
    if (isFirstSearchMovemonPassLikeC(g)) {
        const nearHostile = findFirstSearchRogMidMklevHostileLikeC(g);
        g.context._searchPass1NearMonLikeC =
            rogueLike || searchPass1NearMonLikeC(g) || !!nearHostile;
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
    /* C: second **`#search`** — west then east **`m_move`** (two **`movemon`** calls; rogue inline). */
    if (searchPass === 2 && !rogueSecondSearchFullFmonLikeC(g)) {
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
        mons = fmonListForMovemonLikeC(g, effStepNum);
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
            for (const m of mons) {
                /* C: post-east-tail walk — near + pet only in **`fmon`**; distant in tail (~2774+). */
                if (g.context?._wizD1PostEastTailWalkFmonLikeC) {
                    const walkDistant =
                        wizD1PeelDistantMklevMonLikeC(g)
                        ?? findDistantMklevMonLikeC(g);
                    if (m === walkDistant) continue;
                    const walkNear = wizD1EastDoorMklevMonLikeC(g)
                        ?? (g.level?.monsters ?? []).find(
                            (mm) =>
                                !(mm.mtame | 0)
                                && (mm.mgenmklev | 0)
                                && mm !== walkDistant,
                        );
                    const walkPet = (g.level?.monsters ?? []).find(
                        (mm) => (mm.mtame | 0) !== 0,
                    );
                    if (m !== walkNear && m !== walkPet) continue;
                }
                /* C: second **`L`** east-tail — pet **`dog_move`** only after corridor peel block. */
                if (
                    g.context?._wizD1EastTailMovemonPetMfndposPendingLikeC
                    && (m.mtame | 0)
                ) {
                    continue;
                }
                if (
                    (m.mtame | 0)
                    && g.context?._wizD1PostCorridorPetTailDoneLikeC
                    && !g.context?._wizD1EastTailPostCorridorMovemonAfterMcalcmoveDoneLikeC
                    && !g.context?._wizD1PostEastTailWalkFmonLikeC
                ) {
                    continue;
                }
                await movemonSinglemonLikeC(g, m, effStepNum);
            }
            /* C: post-east-tail walk — pet tail then distant **`distfleeck`** + **`m_move`** (~2774+). */
            if (g.context?._wizD1PostEastTailWalkFmonLikeC) {
                const peelDistant =
                    wizD1PeelDistantMklevMonLikeC(g)
                    ?? findDistantMklevMonLikeC(g);
                if (peelDistant) {
                    setApparxyMonsterLikeC(g, peelDistant);
                    await distfleeckMonsterApplyLikeC(g, peelDistant);
                    g.context._wizD1PostEastTailWalkDistantMmoveLikeC = true;
                    try {
                        await movemonSinglemonLikeC(g, peelDistant, effStepNum);
                    } finally {
                        delete g.context._wizD1PostEastTailWalkDistantMmoveLikeC;
                    }
                    /* C: post-walk distant **`m_move`** — new-turn tail (~2778+ **`rn2(70)`**). */
                    const { runWizEastTailPostCorridorNewTurnLikeC } = await import(
                        './moveloop_turn_advance.js',
                    );
                    await runWizEastTailPostCorridorNewTurnLikeC(g);
                    /* C: post-new-turn near **`distfleeck`** (~2781) before pet prescan (~2782+). */
                    const nearWalkPost =
                        wizD1EastDoorMklevMonLikeC(g)
                        ?? (g.level?.monsters ?? []).find(
                            (m) =>
                                !(m.mtame | 0)
                                && (m.mgenmklev | 0)
                                && m
                                !== (
                                    wizD1PeelDistantMklevMonLikeC(g)
                                    ?? findDistantMklevMonLikeC(g)
                                ),
                        );
                    if (nearWalkPost) {
                        setApparxyMonsterLikeC(g, nearWalkPost);
                        await distfleeckMonsterApplyLikeC(g, nearWalkPost);
                    }
                    g.context._wizD1PostEastTailWalkPetAfterMintrapLikeC = true;
                    g.context._wizD1PostEastTailWalkNewTurnDoneLikeC = true;
                }
            }
        }
        /* C: wizard D:1 second **`L`** — pet **`mfndpos`** after east-tail peel (~2726+). */
        if (g.context?._wizD1EastTailMovemonPetMfndposPendingLikeC) {
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
                await runNewTurnSetupAndTailLikeC(g, (g.moves | 0) - 1);
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
        /* C: wizard D:1 step-1 — post-peel distant **`m_move`** + pet **`dog_invent`** (~2572–2597). */
        if (
            isWizardD1Step1PeelLikeC(g, effStepNum)
            && !g.context?._postBumpKillDochugGateLikeC
            && !g.context?._wizD1LPostEastTailDistantPeelDoneLikeC
            && !g.context?._wizD1PostEastTailWalkFmonLikeC
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
                if (g.context?._wizD1Step1LPetTailDoneLikeC) {
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
                const { dogMoveEastTailPostMcalcmovePetLikeC } = await import(
                    './dogmove_mon.js',
                );
                dogMoveEastTailPostMcalcmovePetLikeC(g, petWalkPost);
            }
            delete g.context._wizD1PostEastTailWalkPetAfterMintrapLikeC;
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
    /* C: one **`fmon`** pass per **`#search`** (no **`monscanmove`** re-entry on low **`movemonStepNum`**). */
    if (isFirstSearchMovemonPassLikeC(g)) {
        return false;
    }
    if (isSecondSearchMovemonPassLikeC(g) && !rogueSecondSearchFullFmonLikeC(g)) {
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
    /* C: wizard D:1 — one **`movemon()`** pass per hero turn (any **`stepNum`**); no
     * **`monscanmove`** re-entry before new-turn **`gethungry`** (**`seed0006`** ~2523 / ~2558). */
    if (
        g.urole?.abbr === 'Wiz'
        && (g.u?.uz?.dnum | 0) === 0
        && (g.u?.uz?.dlevel | 0) === 1
    ) {
        return false;
    }

    /* C: return `gs.somebody_can_move` (not “any mon still has movement ≥ NORMAL_SPEED”). */
    return !!(g.context?._somebodyCanMoveLikeC);
    } finally {
        if (clearWalkFmonAfterPass) {
            delete g.context._wizD1PostEastTailWalkFmonLikeC;
        }
    }
}
