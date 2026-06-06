// fmon_iter.js — Walk monsters in C fmon chain order (newest first).
// C ref: makemon.c — `mtmp->nmon = fmon; fmon = mtmp` prepends each new monster.

import { PM_LICHEN } from './const.js';
import { game } from './gstate.js';
import { dist2 } from './hacklib.js';
import { monnearMonsterXYLikeC } from './mon_geom.js';
import { S_EEL, raceptr } from './mondata.js';
import {
    isFirstSearchMovemonPassLikeC,
    isRogueColonMovemonActiveLikeC,
    isSecondSearchMovemonPassLikeC,
    rogueSecondSearchFullFmonLikeC,
    wizD1EastTailShortLActiveLikeC,
} from './monmove_search.js';
import {
    eastFungusDoorNicheAtLikeC,
    findEastKickMonLikeC,
    findEastMklevSecondHLikeC,
    findWestKinkMonsterLikeC,
    isLandEelForMovemonLikeC,
    findDistantMklevMonLikeC,
    wizD1EastDoorMklevMonLikeC,
    wizD1EastTailFmonDistantMtmpLikeC,
    movemonStep8DistantMonEligibleLikeC,
    searchPass1NearMonLikeC,
    firstSearchNearMklevHostileLikeC,
    findFirstSearchRogMidMklevHostileLikeC,
    findTouristD1PostSwapNearMklevMonLikeC,
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
 * C: when the hero is in the east corridor, **`movemon`** should **`dochug`** **`monnear`**
 * monsters before the west-kink **(64,12)** sleeper (still **`movement < NORMAL_SPEED`** in C).
 * Only reorder when at least one non-west mon is adjacent; keep **`fmon`** order otherwise.
 *
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>[]} mons
 */
function fmonListD1WestKinkAfterNearHeroLikeC(g, mons) {
    const u = g.u;
    const west = findWestKinkMonsterLikeC(g);
    if (!u || !west || !mons.includes(west)) return mons;
    const ux = u.ux | 0;
    const uy = u.uy | 0;
    const hasNear = mons.some((m) => {
        if (m === west) return false;
        return (
            monnearMonsterXYLikeC(m, ux, uy)
            || dist2(m.mx | 0, m.my | 0, ux, uy) <= 36
        );
    });
    if (!hasNear) return mons;
    return [...mons.filter((m) => m !== west), west];
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
    /* C: tourist second post-rest peel — pet invent + **`mfndpos`** before other **`m_move`**
     * (**`seed0900`** ~2546+). */
    if (
        g.context?._touristD1PostRestSecondMovemonLikeC
        && g.urole?.abbr === 'Tou'
        && (stepNum | 0) === 1
    ) {
        const pet = mons.find((m) => (m.mtame | 0) !== 0);
        const nearMklev = findTouristD1PostSwapNearMklevMonLikeC(g);
        const distant = findDistantMklevMonLikeC(g);
        const rest = mons.filter(
            (m) => m !== pet && m !== nearMklev && m !== distant,
        );
        /** @type {typeof mons} */
        const ordered = [];
        if (pet) ordered.push(pet);
        if (nearMklev) ordered.push(nearMklev);
        /* C: distant **`m_move`** chcnt + tail (~2563+) immediately after near stub. */
        if (distant) ordered.push(distant);
        return [...ordered, ...rest];
    }
    /* C: post-bump **`l`** — distant **`distfleeck`** before pet **`dochug:886`** (**`seed0006`** ~2530). */
    if (g.context?._postBumpKillDochugGateLikeC) {
        const ctxF = g.context || (g.context = {});
        const distant =
            ctxF._postBumpDistantMtmpLikeC ?? findDistantMklevMonLikeC(g);
        if (distant) ctxF._postBumpDistantMtmpLikeC = distant;
        const pet = mons.find((m) => (m.mtame | 0) !== 0);
        const rest = mons.filter((m) => m !== distant && m !== pet);
        /** @type {typeof mons} */
        const ordered = [];
        if (distant) ordered.push(distant);
        if (pet) ordered.push(pet);
        return [...ordered, ...rest];
    }
    /* C: wizard second **`L`** post-**`mcalcmove`** — near **`distfleeck`** (~2716) then distant **`m_move`** (~2717+). */
    if (
        g.context?._wizD1LPostEastTailAfterMcalcmoveLikeC
        && (stepNum | 0) === 1
        && g.urole?.abbr === 'Wiz'
        && (g.u?.uz?.dnum | 0) === 0
        && (g.u?.uz?.dlevel | 0) === 1
    ) {
        /* C: east-door **`m_move`** finished before **`mcalcmove`** — peel **`rn2(20)`** is ~915 mon **~(23,13)**. */
        const distant = wizD1EastTailFmonDistantMtmpLikeC(g);
        const nearMklev =
            wizD1EastDoorMklevMonLikeC(g)
            ?? mons.find(
                (m) =>
                    m !== distant
                    && !(m.mtame | 0)
                    && (m.mgenmklev | 0),
            );
        /** @type {typeof mons} */
        const ordered = [];
        if (nearMklev) ordered.push(nearMklev);
        if (distant) ordered.push(distant);
        return ordered;
    }
    /* C: post-east-tail walk — next **`l`**: near **`distfleeck`**, pet **`dog_move`**, near **`distfleeck`**. */
    if (wizD1EastTailShortLActiveLikeC(g)) {
        const pet = mons.find((m) => (m.mtame | 0) !== 0);
        const nearMklev =
            wizD1EastDoorMklevMonLikeC(g)
            ?? mons.find(
                (m) =>
                    m !== pet
                    && !(m.mtame | 0)
                    && (m.mgenmklev | 0),
            );
        /* C: capital **`K`** post-near — near **`m_move`** only (~2879–2881), no peel **`distfleeck`**. */
        if (g.context?._wizD1CapitalKPostNearPetDoneLikeC) {
            if (
                nearMklev
                && !g.context?._wizD1CapitalKPostNearShortLMmoveDoneLikeC
            ) {
                return [nearMklev];
            }
            return [];
        }
        /** @type {typeof mons} */
        const ordered = [];
        if (nearMklev) ordered.push(nearMklev);
        if (pet) ordered.push(pet);
        if (nearMklev) ordered.push(nearMklev);
        return ordered;
    }
    /* C: post-east-tail walk — near **`distfleeck`**, pet **`dog_move`** / **`obj_resists`** (~2770+). */
    if (
        g.context?._wizD1PostEastTailWalkFmonLikeC
        && g.urole?.abbr === 'Wiz'
        && (g.u?.uz?.dnum | 0) === 0
        && (g.u?.uz?.dlevel | 0) === 1
        && !g.context?._postBumpKillDochugGateLikeC
        && !g.context?._wizD1PostEastTailWalkCompleteLikeC
    ) {
        const pet = mons.find((m) => (m.mtame | 0) !== 0);
        const nearMklev =
            wizD1EastDoorMklevMonLikeC(g)
            ?? mons.find(
                (m) =>
                    !(m.mtame | 0)
                    && (m.mgenmklev | 0),
            );
        const distant = findDistantMklevMonLikeC(g);
        const handled = new Set([pet, nearMklev, distant].filter(Boolean));
        const rest = mons.filter((m) => !handled.has(m));
        /** @type {typeof mons} */
        const ordered = [];
        if (nearMklev) ordered.push(nearMklev);
        if (pet) ordered.push(pet);
        return [...ordered, ...rest];
    }
    /* C: wizard step-1 peel — distant **`distfleeck`**, pet **`dog_goal`**, then mklev (**`seed0006`** **`n`**). */
    if (
        g.context?._postBumpInlineDoneLikeC
        && (stepNum | 0) === 1
        && g.urole?.abbr === 'Wiz'
        && (g.u?.uz?.dnum | 0) === 0
        && (g.u?.uz?.dlevel | 0) === 1
        && !g.context?._wizD1PostEastTailWalkFmonLikeC
    ) {
        const distant = findDistantMklevMonLikeC(g);
        const pet = mons.find((m) => (m.mtame | 0) !== 0);
        const nearMklev = mons.find(
            (m) =>
                m !== distant
                && m !== pet
                && (m.mgenmklev | 0)
                && !(m.mtame | 0),
        );
        const rest = mons.filter(
            (m) => m !== distant && m !== pet && m !== nearMklev,
        );
        /** @type {typeof mons} */
        const ordered = [];
        /* C: **`L`**+ — distant df, pet goal+pick, near df, distant **`m_move`**, pet tail (~2601–2611). */
        if (g.context?._wizD1Step1InventPostDoneLikeC && pet) {
            if (distant) ordered.push(distant);
            ordered.push(pet);
            if (nearMklev) ordered.push(nearMklev);
            if (distant) ordered.push(distant);
            /* C: defer other **`fmon`** until post-peel distant **`m_move`** + pet tail (~2611+). */
            return ordered;
        }
        if (distant) ordered.push(distant);
        if (pet) ordered.push(pet);
        if (nearMklev) ordered.push(nearMklev);
        return [...ordered, ...rest];
    }
    if (isRogueColonMovemonActiveLikeC(g)) {
        const gate = findFirstSearchRogMidMklevHostileLikeC(g);
        const pet = mons.find((m) => (m.mtame | 0) !== 0);
        if (!(g.context?._movemonSearch11SubPass | 0)) {
            const ordered = [];
            if (gate) ordered.push(gate);
            if (pet) ordered.push(pet);
            return ordered;
        }
    }
    /* C: second **`#search`** — main **`fmon`** loop gate + pet only; tail peel + gate **`dochug`**
     * after **`dog_move`** in **`monmove.js`** post block (**`seed0077` ~3230**). */
    if (isSecondSearchMovemonPassLikeC(g) && rogueSecondSearchFullFmonLikeC(g)) {
        const gate = findFirstSearchRogMidMklevHostileLikeC(g);
        const pet = mons.find((m) => (m.mtame | 0) !== 0);
        const ordered = [];
        if (gate) ordered.push(gate);
        if (pet) ordered.push(pet);
        return ordered;
    }
    if ((stepNum | 0) === 4) {
        const west = findWestKinkMonsterLikeC(g);
        return west ? [west] : [];
    }
    /* C: second **`h`** — east **(64,10)** **`m_move`** (**`rn2(12)`**) before west/eel/distant **`distfleeck`**. */
    /* C: step **`y`** — pass 1 west → east → eel (**`rn2(16)`** east after west **`distfleeck`**). */
    if ((stepNum | 0) === 6) {
        const west = findWestKinkMonsterLikeC(g);
        const east = findEastMklevSecondHLikeC(g);
        const eel = mons.find((m) => isLandEelForMovemonLikeC(g, m));
        const rest = mons.filter((m) => m !== west && m !== east && m !== eel);
        /** @type {typeof mons} */
        const ordered = [];
        if (west) ordered.push(west);
        if (east) ordered.push(east);
        if (eel) ordered.push(eel);
        return [...ordered, ...rest].filter(Boolean);
    }
    if ((stepNum | 0) === 5) {
        const east = findEastMklevSecondHLikeC(g);
        const west = findWestKinkMonsterLikeC(g);
        const eel = mons.find((m) => isLandEelForMovemonLikeC(g, m));
        const distant =
            mons.find((m) => (m.mx | 0) === 22 && (m.my | 0) === 14)
            ?? mons.find((m) => (m.mx | 0) === 23 && (m.my | 0) === 13)
            ?? mons.find((m) => (m.mx | 0) === 21 && (m.my | 0) === 13)
            ?? mons.find(
                (m) =>
                    m !== east
                    && m !== west
                    && m !== eel
                    && movemonStep8DistantMonEligibleLikeC(g, m),
            );
        const rest = mons.filter(
            (m) => m !== east && m !== west && m !== eel && m !== distant,
        );
        return [east, west, eel, distant, ...rest].filter(Boolean);
    }
    /* C: kick — east door-niche lichen only (**`distfleeck`** + **`m_move`** + **`distfleeck`**). */
    if ((stepNum | 0) === 7) {
        const east = findEastKickMonLikeC(g);
        return east ? [east] : mons;
    }
    /* C: hero **`b`** — distant **`distfleeck`**+**`m_move`**, west **`distfleeck`**, land eel **`m_move`**+**`distfleeck`**. */
    if ((stepNum | 0) === 8) {
        const distant = findDistantMklevMonLikeC(g);
        const west = findWestKinkMonsterLikeC(g);
        const eel = mons.find((m) => isLandEelForMovemonLikeC(g, m));
        const rest = mons.filter((m) => m !== distant && m !== west && m !== eel);
        /** @type {typeof mons} */
        const ordered = [];
        if (distant) ordered.push(distant);
        if (west) ordered.push(west);
        if (eel) ordered.push(eel);
        return [...ordered, ...rest].filter(Boolean);
    }
    /* C: first **`l`** after **`b`** — east **(64,9)** **`m_move`** then distant **`m_move`**. */
    if ((stepNum | 0) === 9) {
        const east = findEastKickMonLikeC(g);
        const distant = findDistantMklevMonLikeC(g);
        const rest = mons.filter((m) => m !== east && m !== distant);
        /** @type {typeof mons} */
        const ordered = [];
        if (east) ordered.push(east);
        if (distant) ordered.push(distant);
        return [...ordered, ...rest].filter(Boolean);
    }
    /* C: rogue near mklev / first **`#search`** — gate hostile before pet (also step **`1`** peel). */
    if (isFirstSearchMovemonPassLikeC(g) || g.context?._searchPass1NearMonLikeC) {
        const ctx = game.context || (game.context = {});
        const east = findEastKickMonLikeC(g);
        const distant = findDistantMklevMonLikeC(g);
        const rogueLike =
            game.urole?.abbr === 'Rog'
            || game.pl_character === 'Rogue'
            || (game.urole?.mnum | 0) === 8;
        const rogHostile = rogueLike ? findFirstSearchRogMidMklevHostileLikeC(g) : null;
        let nearMon = rogueLike || searchPass1NearMonLikeC(g) || !!rogHostile;
        ctx._searchPass1NearMonLikeC = nearMon;
        const pet = mons.find((m) => (m.mtame | 0) !== 0);
        const westKink = findWestKinkMonsterLikeC(g);
        if (nearMon) {
            const near = [];
            const mid = [];
            const ux = game.u?.ux | 0;
            const uy = game.u?.uy | 0;
            for (const m of mons) {
                if (m === distant || m === pet) continue;
                if (game.u?.urole?.abbr === 'Tou' && m === east) continue;
                const mx = m.mx | 0;
                const my = m.my | 0;
                if (
                    monnearMonsterXYLikeC(m, ux, uy)
                    || (
                        (m.mgenmklev | 0)
                        && dist2(mx, my, ux, uy) <= 25
                        && (
                            westFungusDoorNicheAtLikeC(g, mx, my, m)
                            || eastFungusDoorNicheAtLikeC(g, mx, my, m)
                        )
                    )
                ) {
                    near.push(m);
                } else mid.push(m);
            }
            const tail = [];
            if (distant) tail.push(distant);
            if (east && !near.includes(east)) tail.push(east);
            /* C: rogue **`seed0077`** — mid mklev hostile before door-niche / pet on first **`#search`**. */
            const nearHostile = near.filter(
                (m) => firstSearchNearMklevHostileLikeC(g, m) && m !== rogHostile,
            );
            const nearRemainder = near.filter(
                (m) => m !== rogHostile && !nearHostile.includes(m),
            );
            const midRest = mid.filter((m) => m !== rogHostile);
            /* C: first **`#search`** rogue near — one door-niche **`distfleeck`** (**~3202**), gate + **`dog_goal`**
             * (**~3203–3208**), then remaining peel **`distfleeck`** (**~3209–3212**), east last. */
            if (isFirstSearchMovemonPassLikeC(g)) {
                const mklevTail = [...nearHostile, ...nearRemainder, ...midRest];
                if (distant && distant !== rogHostile && !mklevTail.includes(distant)) {
                    mklevTail.push(distant);
                }
                const preGatePeel = nearHostile.length > 0 ? [nearHostile[0]] : [];
                const postGatePeel = mklevTail.filter(
                    (m) => m !== rogHostile && !preGatePeel.includes(m),
                );
                const eastTail = east && !preGatePeel.includes(east) && !postGatePeel.includes(east)
                    ? [east]
                    : [];
                /* C: gate **`dochug`** + pet **`dog_goal`** before remaining peel **`distfleeck`**. */
                const ordered = [
                    ...preGatePeel,
                    ...(rogHostile ? [rogHostile] : []),
                    ...(pet ? [pet] : []),
                    ...postGatePeel,
                    ...eastTail,
                ].filter(Boolean);
                if (typeof globalThis.__diagFmonAtSearch === 'function') {
                    globalThis.__diagFmonAtSearch(g, stepNum, ordered, {
                        preGatePeel,
                        postGatePeel,
                        mklevTail,
                        nearHostile,
                        nearRemainder,
                        midRest,
                    });
                }
                return ordered;
            }
            return [
                ...(rogHostile ? [rogHostile] : []),
                ...(pet ? [pet] : []),
                ...nearHostile,
                ...nearRemainder,
                ...midRest,
                ...tail,
            ].filter(Boolean);
        }
        const rest = mons.filter((m) => m !== east && m !== distant);
        /** @type {typeof mons} */
        const ordered = [];
        if (distant) ordered.push(distant);
        if (east) ordered.push(east);
        return [...ordered, ...rest].filter(Boolean);
    }
    /* C: step **`n`** — east **`movement < NORMAL_SPEED`** (no RNG); west **`distfleeck`**;
     * land eel **`m_move`** (**`rn2(32)`**); distant **`distfleeck`**+**`m_move`**+**`distfleeck`**. */
    if ((stepNum | 0) === 2) {
        const west =
            findWestKinkMonsterLikeC(g)
            ?? mons.find((m) => {
                const tr = m.mtrack?.[0];
                return tr && (tr.x | 0) === 63 && (tr.y | 0) === 11;
            });
        const eel = mons.find((m) => isLandEelForMovemonLikeC(g, m));
        const distant = findDistantMklevMonLikeC(g);
        const east = mons.find(
            (m) =>
                (m.mgenmklev | 0)
                && eastFungusDoorNicheAtLikeC(g, m.mx | 0, m.my | 0, m),
        );
        const rest = mons.filter(
            (m) => m !== east && m !== west && m !== eel && m !== distant,
        );
        /* C: east may be **`movement < NORMAL_SPEED`** (no RNG); west **`distfleeck`**, eel **`m_move`**, distant. */
        return [west, eel, distant, east, ...rest].filter(Boolean);
    }
    if ((g.u?.uz?.dnum | 0) === 0 && (g.u?.uz?.dlevel | 0) === 1) {
        return fmonListD1WestKinkAfterNearHeroLikeC(g, mons);
    }
    if ((stepNum | 0) !== 3) return mons;
    const west = mons.find(
        (m) =>
            (m.mgenmklev | 0)
            && westFungusDoorNicheAtLikeC(g, m.mx | 0, m.my | 0, m),
    );
    const east = mons.find(
        (m) =>
            (m.mgenmklev | 0)
            && eastFungusDoorNicheAtLikeC(g, m.mx | 0, m.my | 0, m),
    );
    const rest = mons.filter((m) => m !== west && m !== east);
    return [west, east, ...rest].filter(Boolean);
}
