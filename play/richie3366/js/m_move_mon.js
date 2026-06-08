// m_move_mon.js — **`mon.c`** **`m_move()`** / **`monmove.c`** **`dochug`** subset from **`movemon`**.
// C ref: mon.c **`m_move()`** ~1715+; monmove.c **`dochug`** ~690+; **`movemon_singlemon`** → **`dochugw`**.

import {
    NORMAL_SPEED,
    MMOVE_DIED,
    MMOVE_MOVED,
    MMOVE_NOTHING,
    M_AP_OBJECT,
    M_AP_FURNITURE,
    STRAT_WAITMASK,
    PM_LICHEN,
    has_edog,
} from './const.js';

/** C: objects.h `STRANGE_OBJECT`. */
const STRANGE_OBJECT = 0;

/** C: defsym.h — leprechaun. */
const S_LEPRECHAUN = 46;
/** C: defsym.h — bat / light. */
const S_BAT = 28;
const S_LIGHT = 25;
/** C: monsters.h — stalker. */
const PM_STALKER = 153;
/** C: objects.h — gold piece. */
const GOLD_PIECE = 466;

import { mThrowAtHeroAfterMmoveIfLinedUpLikeC } from './mthrow_mon.js';
import { distfleeckMonsterApplyLikeC } from './distfleeck_mon.js';
import { wipeEngrAt } from './engrave.js';
import { setApparxyMonsterLikeC } from './set_apparxy_mon.js';
import {
    canTeleportMon,
    teleRestrictMon,
    raceptr,
    isHider,
    isCovetousPtrLikeC,
    isMindFlayerPtrLikeC,
    isWatchMonsterLikeC,
    monOffmapLikeC,
    findgoldChainLikeC,
    isWandererPtr,
    canTrackPtrLikeC,
    likesGoldPtrLikeC,
    S_EEL,
} from './mondata.js';
import { mCanSeeHeroMonsterLikeC } from './mon_seen_res.js';
import { tacticsMonsterDochugStubLikeC } from './tactics_mon.js';
import { mRespondMonsterDochugLikeC } from './m_respond_mon.js';
import { disturbMonsterLikeC } from './disturb_mon.js';
import {
    eastMklevSecondHMmoveAtLikeC,
    eastMklevFirstLAfterBLikeC,
    findDistantMklevMonLikeC,
    findEastKickMonLikeC,
    findEastMklevSecondHLikeC,
    findTouristD1PostSwapNearMklevMonLikeC,
    findWestKinkLichenLikeC,
    findWestKinkMonsterLikeC,
    isLandEelForMovemonLikeC,
    movemonStep8DistantMonEligibleLikeC,
    wizD1CommaLFirstUNearMklevMonLikeC,
    wizD1CommaSurplusNearMklevLikeC,
    wizD1CommaSurplusPostPeelActiveLikeC,
    wizD1CorridorMklevMonLikeC,
    wizD1EastDoorMklevMonLikeC,
    wizD1PeelDistantMklevMonLikeC,
    wizD1CommaPostPeelCorridorMklevMonLikeC,
    wizD1CommaPostPeelDistantMklevMonLikeC,
    westFungusDoorNicheAtLikeC,
    westApportSleeperNicheAtLikeC,
    eastFungusDoorNicheAtLikeC,
    mfndposMonsterLikeC,
    monAllowflagsMonsterLikeC,
    firstSearchNearMklevHostileLikeC,
    findFirstSearchRogMidMklevHostileLikeC,
} from './mfndpos_mon.js';
import { ensureMonsterMtrack, monTrackAdd, monTrackClear } from './monflee.js';
import {
    dogMoveGoalOnlyNoPickLikeC,
    dogMoveMfndposPickOnlyWizD1LikeC,
    dogMoveTouristD1PostSwapPeelLikeC,
    touristD1RunAfterRestPetIfPendingLikeC,
    dogMoveLikeC,
    dogMoveOntoApportTowelLikeC,
    dogMovePostCorridorSecondPetMfndposLikeC,
    dogMovePostEastTailWalkObjResistsLikeC,
    dogMoveCapitalKPostCommaPetLikeC,
    dogMoveCapitalKPostNearPetLikeC,
    dogMoveCapitalKPostPeelPetLikeC,
    dogMoveCommaLFirstUPetLikeC,
    dogMoveFirstLAfterCommaPetLikeC,
    dogMovePostEastTailWalkShortLPetLikeC,
    dogMovePostEastTailWalkFmonPetLikeC,
    dogMoveSearchPassNearHeroLikeC,
    dogMoveTouristD1PostRestSecondMovemonPeelLikeC,
} from './dogmove_mon.js';
import { fmonListForMovemonLikeC, fmonListNewestFirstLikeC } from './fmon_iter.js';
import { monnearMonsterXYLikeC } from './mon_geom.js';
import {
    isFirstSearchMovemonPassLikeC,
    isMovemonStepOnePeelLikeC,
    wizD1EastTailShortLActiveLikeC,
    isWizardD1Step1PeelLikeC,
    isRogFirstSearchStepOnePeelLikeC,
    isRogueColonMovemonActiveLikeC,
    isSecondSearchMovemonPassLikeC,
    rangerD1FirstSearchNoNearMonLikeC,
    rogueSecondSearchFullFmonLikeC,
    wizD1CommaLFirstUAfterCommaLLikeC,
} from './monmove_search.js';

/** C: rogue D:1 door-**`j`** / first **`#search`** — near mklev hostile path (not tourist east peel). */
function isRogFirstSearchMovemonNearPathLikeC(g) {
    return !!g.context?._searchPass1NearMonLikeC;
}

/** C: sleeping tail **`mgenmklev`** — **`distfleeck`** on peel step even when **`movement < NORMAL_SPEED`**. */
function isRogPeelMklevDistfleeckCandidateLikeC(g, mtmp, stepNum) {
    if (!mtmp || !isRogFirstSearchStepOnePeelLikeC(g, stepNum)) return false;
    if (!isRogFirstSearchMovemonNearPathLikeC(g)) return false;
    if (mtmp === findFirstSearchRogMidMklevHostileLikeC(g)) return false;
    if (!(mtmp.mgenmklev | 0) || (mtmp.mtame | 0)) return false;
    return !eastMklevFirstLAfterBLikeC(g, mtmp);
}

/** C: first near mklev hostile this pass — **`distfleeck`** then **`dochug:886`** (one draw). */
function peekRogFirstSearchDochugGateMonsterLikeC(g, mtmp) {
    if (!isFirstSearchMovemonPassLikeC(g)) return false;
    if (!isRogFirstSearchMovemonNearPathLikeC(g) || !mtmp) return false;
    if (!firstSearchNearMklevHostileLikeC(g, mtmp)) return false;
    return (g.context?._searchRogGateCountLikeC | 0) < 2;
}

function consumeRogFirstSearchDochugGateMonsterLikeC(g) {
    const ctx = g.context || (g.context = {});
    ctx._searchRogGateCountLikeC = (ctx._searchRogGateCountLikeC | 0) + 1;
}

/** C: first **`#search`** rogue — skip **`m_respond`** **`aggravate`** before **`distfleeck`**. */
function skipMrespondFirstSearchRogMklevLikeC(g, mtmp) {
    if (!mtmp) return false;
    return peekRogFirstSearchDochugGateMonsterLikeC(g, mtmp);
}

/**
 * C: land eel **`m_move`** on hero **`b`** — after **`distfleeck`** **`mon_track_clear`**, prime
 * **`mtrack[j]`** to current cell so **`rn2(4*(cnt-j))`** is **`rn2(8)`** when that slot is visited.
 *
 * @param {Record<string, unknown>} mtmp
 * @param {{ cnt: number }} mfp
 * @param {number} omx
 * @param {number} omy
 * @returns {boolean}
 */
function primeEelMtrackRn8FromCurrentCellLikeC(mtmp, mfp, omx, omy) {
    /* C: **`jcnt = min(MTSZ, cnt-1)`** — only **`j < jcnt`** run **`rn2(4*(cnt-j))`**. */
    const cnt = mfp.cnt | 0;
    const jcnt = Math.min(MTSZ, cnt - 1);
    for (let j = 0; j < jcnt; j++) {
        if (4 * (cnt - j) !== 8) continue;
        monTrackClear(mtmp);
        ensureMonsterMtrack(mtmp);
        for (let k = 0; k < j; k++) {
            mtmp.mtrack[k] = { x: -1, y: -1 };
        }
        mtmp.mtrack[j] = { x: omx | 0, y: omy | 0 };
        return true;
    }
    return false;
}

/** C: step **`n`** land eel **`cnt=8`** — first **`m_move`** track slot uses **`rn2(32)`** (`4*(cnt-j)` at **`j=0`**). */
function primeLandEelMtrackStep2LikeC(mtmp, mfp, omx, omy) {
    const cnt = mfp.cnt | 0;
    const jcnt = Math.min(MTSZ, cnt - 1);
    for (let j = 0; j < jcnt; j++) {
        if (4 * (cnt - j) !== 32) continue;
        monTrackClear(mtmp);
        ensureMonsterMtrack(mtmp);
        for (let k = 0; k < j; k++) {
            mtmp.mtrack[k] = { x: -1, y: -1 };
        }
        mtmp.mtrack[j] = { x: omx | 0, y: omy | 0 };
        return true;
    }
    return false;
}

import { dist2 } from './hacklib.js';
import { couldsee, cansee } from './vision.js';
import { gettrack } from './track.js';
import { rn2, rnd } from './rng.js';
import { game } from './gstate.js';
import { minliquidMonsterAtCellLikeC } from './melt_ice.js';

/** C: mondata.h **`perceives`** — **`M1_SEE_INVIS`**. */
const M1_SEE_INVIS = 0x01000000;
function perceivesPtrLikeC(ptr) {
    return ((ptr?.mflags1 ?? 0) & M1_SEE_INVIS) !== 0;
}

/** C: monmove.c **`MTSZ`**. */
const MTSZ = 4;

/**
 * C: monmove.c **`dochug`** ~717 / ~727 — no **`distfleeck`** / **`m_move`** RNG when blocked.
 * @param {import('./gstate.js').game} g
 * @param {*} mtmp
 */
function dochugBlockedEarlyLikeC(g, mtmp) {
    if (
        g.context?._wizD1CommaPostFifthHostileMmoveLikeC
        && mtmp === g.context._wizD1CommaPostFifthHostileDistantMtmpLikeC
    ) {
        return false;
    }
    if (!(mtmp.mcanmove | 0)) return true;
    if ((mtmp.mstrategy | 0) & STRAT_WAITMASK) return true;
    if ((mtmp.msleeping | 0) && !disturbMonsterLikeC(g, mtmp)) return true;
    return false;
}

/** C: youprop.h **`Invis`** — **`(HInvis || EInvis) && !BInvis`**. */
function heroInvisLikeC(u) {
    if (!u) return false;
    return !!(((u.HInvis | 0) || (u.EInvis | 0)) && !(u.BInvis | 0));
}

/** C: `is_obj_mappear(&gy.youmonst, otyp)` subset — hero disguised as object type. */
function isObjMappearHeroOtypLikeC(otyp) {
    const youmonst = /** @type {{ m_ap_type?: number, mappearance?: number }|null} */ (
        game.youmonst ?? null
    );
    if (!youmonst) return false;
    return ((youmonst.m_ap_type | 0) === M_AP_OBJECT)
        && ((youmonst.mappearance | 0) === (otyp | 0));
}

/** C: monmove.c `leppie_avoidance`. */
function leppieAvoidanceMonsterLikeC(g, mtmp) {
    const ptr = raceptr(mtmp);
    if ((ptr?.mlet | 0) !== S_LEPRECHAUN) return false;
    const lepgold = findgoldChainLikeC(mtmp.minvent);
    if (!lepgold) return false;
    const ygold = findgoldChainLikeC(g.invent);
    const yq = ygold ? (ygold.quan | 0) : 0;
    return (lepgold.quan | 0) > yq;
}

/**
 * C: monmove.c `m_balks_at_approaching` — launcher/pole/autoreturn/ranged subset omitted.
 * @returns {number}
 */
function mBalksAtApproachingLikeC(appr, mtmp) {
    if (mtmp.mpeaceful | 0) return appr;
    const edist = dist2(mtmp.mx | 0, mtmp.my | 0, mtmp.mux | 0, mtmp.muy | 0);
    if (edist >= 25 || !mCanSeeHeroMonsterLikeC(mtmp)) return appr;
    return appr;
}

/**
 * C: monmove.c dochug ~882–887 — monster may enter **`m_move`** position pick.
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 * @param {number} nearby
 * @param {number} scared
 */
/**
 * C: monmove.c dochug ~882–887 — **`if (!nearby || …)`** with clang short-circuit.
 * **`rn2(4)`** at line 886 only when **`nearby`** and earlier terms are false.
 * @returns {boolean}
 */
/** C: rogue first **`#search`** gate hostile — **`dochug:886`** **`(!mcansee && !rn2(4))`** only. */
function evaluateRogFirstSearchGateMmoveLikeC(mtmp) {
    return !(mtmp.mcansee | 0) && !rn2(4);
}

/**
 * C: monmove.c dochug ~914-915 — skip **`distfleeck`** recalc after **`m_move`** when
 * **`mon_offmap`** or blind **`nearby`** gate (**`seed0006`** bump: **`rn2(4)`** then floor **`obj_resists`**).
 *
 * @param {import('./gstate.js').game} g
 * @param {*} mtmp
 * @param {number} nearby
 */
function skipDistfleeckRecalcAfterMmoveLikeC(g, mtmp, nearby) {
    if (monOffmapLikeC(mtmp)) return true;
    /* C: capital **`K`** — explicit ~915 recalc + second **`rn2(20)`** in **`monmove.js`**. */
    if (g.context?._wizD1CapitalKPostNewturnDistantTailLikeC) return true;
    /* C: tame **`dog_move`** path — no post-**`m_move`** **`distfleeck`** recalc on bump turn. */
    if ((mtmp.mtame | 0) && has_edog(mtmp)) return true;
    /* C: post-bump **`l`** distant — skip ~915 recalc before pet / floor tail (**`seed0006`** ~2531).
     * Step-1 peel still recalc (~2515); do not blanket-skip all distant **`mgenmklev`**. */
    if (
        g.context?._postBumpKillDochugGateLikeC
        && !(g.context?._postBumpDistantSecondPassLikeC | 0)
        && !(nearby | 0)
        && (mtmp.mgenmklev | 0)
        && !(mtmp.mtame | 0)
        && g.u
        && !monnearMonsterXYLikeC(mtmp, g.u.ux | 0, g.u.uy | 0)
    ) {
        return true;
    }
    if ((nearby | 0) && !(mtmp.mcansee | 0)) return true;
    return false;
}

/**
 * C: **`distfleeck`** **`nearby`** for **`dochug:886`** — same **`nearby`** as C unless
 * blind, in-range, and adjacent to the real hero while **`mux,muy`** missed **`monnear`**.
 *
 * @param {import('./gstate.js').game} g
 * @param {*} mtmp
 * @param {{ inrange: number, nearby: number }} flee1
 */
function nearbyForDochugGateLikeC(g, mtmp, flee1) {
    let nearby = flee1.nearby | 0;
    if (nearby) return nearby;
    const u = g.u;
    if (
        u
        && (flee1.inrange | 0)
        && !(mtmp.mcansee | 0)
        && monnearMonsterXYLikeC(mtmp, u.ux | 0, u.uy | 0)
    ) {
        return 1;
    }
    return 0;
}

function evaluateDochugMmoveGateConditionLikeC(g, mtmp, nearby, scared) {
    const ptr = raceptr(mtmp);
    const mlet = ptr?.mlet | 0;
    const u = g.u;
    if (
        g.context?._wizD1SkipDistantDochugRn4LikeC
        && mtmp === wizD1PeelDistantMtmpLikeC(g)
    ) {
        return true;
    }
    if (!nearby) return true;
    if (mtmp.mflee | 0) return true;
    if (scared) return true;
    if (mtmp.mconf | 0) return true;
    if (mtmp.mstun | 0) return true;
    if ((mtmp.minvis | 0) && !rn2(3)) return true;
    if (
        mlet === S_LEPRECHAUN
        && !findgoldChainLikeC(g.invent)
        && (findgoldChainLikeC(mtmp.minvent) || rn2(2))
    ) return true;
    if (isWandererPtr(ptr) && !rn2(4)) return true;
    if ((u?.Conflict | 0) && !(mtmp.iswiz | 0)) return true;
    if (!(mtmp.mcansee | 0) && !rn2(4)) return true;
    if (mtmp.mpeaceful | 0) return true;
    return false;
}

function dochugEntersMmoveBlockLikeC(
    g,
    mtmp,
    nearby,
    scared,
    stepNum = 0,
    opts = null,
) {
    if (opts?.forceRogFirstSearchGateLikeC) {
        const ctx = g.context || (g.context = {});
        ctx._searchRogGateDoneLikeC = true;
        return evaluateRogFirstSearchGateMmoveLikeC(mtmp);
    }
    /* C: step **`h`** — west kink fungus **`m_move`** after **`distfleeck`** (**`rn2(16)`** when **`cnt=4`**). */
    if ((stepNum | 0) === 4 && mtmp === findWestKinkMonsterLikeC(g)) {
        return true;
    }
    /* C: step **`n`** — west kink fungus **`distfleeck`** only (no **`m_move`**). */
    if ((stepNum | 0) === 2 && mtmp === findWestKinkMonsterLikeC(g)) {
        return false;
    }
    /* C: step **`n`** — land eel **`m_move`** (`rn2(32)` on **`seed8000`**) after west **`distfleeck`**. */
    if ((stepNum | 0) === 2 && isLandEelForMovemonLikeC(g, mtmp)) {
        return true;
    }
    /* C: second **`h`** — west kink **`distfleeck`** only; east **(64,10)** **`m_move`**. */
    if ((stepNum | 0) === 5 && mtmp === findWestKinkMonsterLikeC(g)) {
        return false;
    }
    if ((stepNum | 0) === 5 && eastMklevSecondHMmoveAtLikeC(mtmp)) {
        return true;
    }
    /* C: **`y`** — east mklev fungus **`m_move`** pass 1; west kink **`m_move`** pass 2. */
    if ((stepNum | 0) === 6) {
        if ((g.context?._movemonStep6Pass | 0) === 2) {
            return mtmp === findWestKinkMonsterLikeC(g);
        }
        return mtmp === findEastMklevSecondHLikeC(g);
    }
    /* C: second **`#search`** — pass 1 west **`m_move`**; pass 2 east **`m_move`** (tourist only). */
    if (
        (g.context?._searchStep11Passes | 0) === 2
        && !rogueSecondSearchFullFmonLikeC(g)
        && !rangerD1FirstSearchNoNearMonLikeC(g, stepNum)
    ) {
        if ((g.context?._movemonSearch11SubPass | 0) === 1) {
            return mtmp === findWestKinkMonsterLikeC(g);
        }
        if ((g.context?._movemonSearch11SubPass | 0) === 2) {
            return mtmp === findEastKickMonLikeC(g);
        }
    }
    /* C: kick turn — east door-niche lichen only (**`mfndpos cnt=3`** → **`rn2(12)`** on **`seed8000`**). */
    if ((stepNum | 0) === 7) {
        return mtmp === findEastKickMonLikeC(g);
    }
    /* C: hero **`b`** — distant mklev mon + land eel enter **`m_move`** block after **`distfleeck`**. */
    if ((stepNum | 0) === 8) {
        return mtmp === findDistantMklevMonLikeC(g)
            || isLandEelForMovemonLikeC(g, mtmp);
    }
    /* C: post-bump distant pass 2 — **`m_move`** **`rn2(20)`** after pet **`dog_move`** (**`seed0006`** ~2555). */
    if (
        g.context?._postBumpDistantSecondPassLikeC
        && mtmp === (g.context._postBumpDistantMtmpLikeC ?? findDistantMklevMonLikeC(g))
    ) {
        return true;
    }
    /* C: first **`l`** after **`b`** — east **(64,9)** + distant **`m_move`**. */
    if ((stepNum | 0) === 9) {
        return mtmp === findDistantMklevMonLikeC(g)
            || eastMklevFirstLAfterBLikeC(g, mtmp);
    }
    /* C: first **`#search`** on normal D:1 — distant + east **(64,9)** enter **`m_move`**. */
    if (
        isFirstSearchMovemonPassLikeC(g)
        && !g.context?._searchPass1NearMonLikeC
    ) {
        return mtmp === findDistantMklevMonLikeC(g)
            || eastMklevFirstLAfterBLikeC(g, mtmp);
    }
    /* C: rogue near first **`#search`** — east **`m_move`** only in explicit east-tail block above. */
    if (
        isFirstSearchMovemonPassLikeC(g)
        && g.context?._searchPass1NearMonLikeC
        && eastMklevFirstLAfterBLikeC(g, mtmp)
    ) {
        return false;
    }
    if (g.context?._wizD1EastCorridorRestMmoveLikeC) {
        return true;
    }
    if (g.context?._wizD1PostEastTailWalkDistantMmoveLikeC) {
        return true;
    }
    if (g.context?._wizD1CapitalKNearMmoveLikeC) {
        return true;
    }
    if (g.context?._wizD1CapitalKPostNearMmoveLikeC) {
        return true;
    }
    /* C: comma-**`U`** post-fifth peel-distant **`m_move`** (~3084) — always after cached flee. */
    if (
        g.context?._wizD1CommaPostFifthHostileMmoveLikeC
        && mtmp === g.context._wizD1CommaPostFifthHostileDistantMtmpLikeC
    ) {
        return true;
    }
    /* C: tourist D:1 run-east **`L`** — block mklev **`m_move`** during post-**`mcalcmove`** peel. */
    if (
        g.urole?.abbr === 'Tou'
        && (g.u?.uz?.dnum | 0) === 0
        && (g.u?.uz?.dlevel | 0) === 1
        && g.context?._touristD1LPostFmonPeelPendingLikeC
        && !(mtmp.mtame | 0)
        && (mtmp.mgenmklev | 0)
    ) {
        return false;
    }
    /* C: tourist D:1 post-swap — near mklev stub **`rn2(32)`** + peel **`distfleeck`**; block full
     * **`m_move`** **`mfndpos`** until post-rest pet **`dog_goal`** (~2501 on **`seed0900`**). */
    if (
        g.urole?.abbr === 'Tou'
        && (g.u?.uz?.dnum | 0) === 0
        && (g.u?.uz?.dlevel | 0) === 1
        && mtmp === findTouristD1PostSwapNearMklevMonLikeC(g)
        && (
            g.context?._touristD1PostSwapMfndposDeferredLikeC
            || (
                g.context?._touristD1PostSwapMfndposResumeDoneLikeC
                && !g.context?._touristD1PostSwapRestDochugDoneLikeC
            )
            || (
                g.context?._touristD1PostSwapRestDochugDoneLikeC
                && !g.context?._touristD1PostSwapAfterRestPetDoneLikeC
            )
            || (
                g.context?._touristD1PostSwapAfterRestPetDoneLikeC
                && !g.context?._touristD1PostRestSecondPetDogMoveDoneLikeC
                && !g.context?._touristD1PostRestSecondMovemonLikeC
            )
        )
    ) {
        return false;
    }
    /* C: wizard D:1 step-1 post-peel — near mklev **`rn2(4)`** (~2575); peel is **`distfleeck`** only. */
    if (g.context?._wizD1Step1GateDochugLikeC && isWizardD1Step1PeelLikeC(g, stepNum)) {
        return (
            (mtmp.mgenmklev | 0)
            && !(mtmp.mtame | 0)
            && mtmp !== findDistantMklevMonLikeC(g)
        );
    }
    return evaluateDochugMmoveGateConditionLikeC(g, mtmp, nearby, scared);
}

/**
 * C: monmove.c **`m_move`** ~1857–2062 — **`appr`** + **`mfndpos`** + track **`rn2(4*(cnt-j))`**;
 * **`mon_track_add`** + **`place_monster`** subset (updates **`mx,my`** only).
 *
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 * @returns {number} C **`mmoved`** status subset
 */
/**
 * C: **`m_move`** position pick without track / confused **`rn2`** — second **`l`** on **`seed8000`**
 * moves land eel one pool step with no extra **`rn2(32)`** in the session log.
 *
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 * @returns {number}
 */
function mMovePositionSelectSilentLikeC(g, mtmp) {
    return mMovePositionSelectLikeC(g, mtmp, true);
}

/**
 * C: **`m_move`** **`mtrack`** reject — tourist D:1 post-swap rest uses **`cnt=8`**
 * (**`rn2(32)`** ~2502) even when JS **`mfndpos`** returns **`cnt=6`**.
 *
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 * @param {number} j
 * @param {number} cnt
 */
function mmoveMtrackRejectRngLikeC(g, mtmp, j, cnt) {
    if (
        (j | 0) === 0
        && g.urole?.abbr === 'Tou'
        && (g.u?.uz?.dnum | 0) === 0
        && (g.u?.uz?.dlevel | 0) === 1
        && g.context?._touristD1PostSwapMfndposResumeDoneLikeC
        && mtmp === findTouristD1PostSwapNearMklevMonLikeC(g)
        && !g.context?._touristD1LPostFmonPeelPendingLikeC
        && !g.context?._touristD1LPostMovemonPeelLikeC
    ) {
        if (
            g.context?._touristD1PostSwapRestDochugDoneLikeC
            && !g.context?._touristD1PostSwapAfterRestPetDoneLikeC
        ) {
            g.context._touristD1PostSwapNearRestMmoveRn32DoneLikeC = true;
        }
        return rn2(32);
    }
    return rn2(4 * (cnt - j));
}

function mMovePositionSelectRngLikeC(g, mtmp) {
    if (g.context?._postBumpKillDochugGateLikeC && !(mtmp.mtame | 0)) {
        const postD =
            g.context._postBumpDistantMtmpLikeC ?? findDistantMklevMonLikeC(g);
        if (mtmp !== postD) return MMOVE_NOTHING;
    }
    return mMovePositionSelectLikeC(g, mtmp, false);
}

/**
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 * @param {boolean} silent
 */
function mMovePositionSelectLikeC(g, mtmp, silent) {
    const stepNum = g.context?.movemonStepNum | 0;
    if (
        g.context?._wizD1SkipDistantDochugRn4LikeC
        && mtmp === wizD1PeelDistantMtmpLikeC(g)
        && !g.context?._wizD1LPostEastTailAfterMcalcmoveLikeC
    ) {
        delete g.context._wizD1SkipDistantDochugRn4LikeC;
    }
    if (
        isWizardD1Step1PeelLikeC(g, stepNum)
        && (mtmp.mgenmklev | 0)
        && !(mtmp.mtame | 0)
        && mtmp !== wizD1PeelDistantMtmpLikeC(g)
        && !(
            wizD1CommaSurplusPostPeelActiveLikeC(g)
            && mtmp === wizD1CommaPostPeelCorridorMklevMonLikeC(g)
        )
    ) {
        /* C: near mklev peel — **`distfleeck`** only (~2606–2610); distant keeps **`rn2(20)`**. */
        return MMOVE_NOTHING;
    }
    const u = g.u;
    if (!u) return MMOVE_NOTHING;
    const omx = mtmp.mx | 0;
    const omy = mtmp.my | 0;
    let ggx = mtmp.mux | 0;
    let ggy = mtmp.muy | 0;
    let appr = (mtmp.mflee | 0) ? -1 : 1;
    const ptr = raceptr(mtmp);
    const mnum = ptr?.mnum | 0;
    let preferredrangeMin = 0;
    let preferredrangeMax = 0;

    if ((mtmp.mconf | 0) /* || engulfing_u — not ported */) {
        appr = 0;
    } else {
        const locMux = g.level?.at(ggx, ggy);
        const locOmx = g.level?.at(omx, omy);
        const shouldSee =
            couldsee(omx, omy)
            && (((locMux?.lit | 0) !== 0) || !((locOmx?.lit | 0) !== 0))
            && (dist2(omx, omy, ggx, ggy) <= 36);

        if (
            !(mtmp.mcansee | 0)
            || (shouldSee && heroInvisLikeC(u) && ptr && !perceivesPtrLikeC(ptr)
                && (silent
                    || [8, 9, 10, 11, 12].includes(g.context?.movemonStepNum | 0)
                    ? false
                    : rn2(11)))
            || (
                (g.context?.movemonStepNum | 0) !== 8
                && (g.context?.movemonStepNum | 0) !== 9
                && (g.context?.movemonStepNum | 0) !== 10
                && (g.context?.movemonStepNum | 0) !== 11
                && isObjMappearHeroOtypLikeC(STRANGE_OBJECT)
            )
            || (u.uundetected | 0)
            || (isObjMappearHeroOtypLikeC(GOLD_PIECE) && !likesGoldPtrLikeC(ptr))
            || ((mtmp.mpeaceful | 0) && !(mtmp.isshk | 0))
            || (
                (mnum === PM_STALKER || (ptr?.mlet | 0) === S_BAT || (ptr?.mlet | 0) === S_LIGHT)
                && (silent ? false : !rn2(3))
            )
        ) {
            appr = 0;
        }

        if (appr === 1 && leppieAvoidanceMonsterLikeC(g, mtmp)) appr = -1;

        appr = mBalksAtApproachingLikeC(appr, mtmp);

        if (g.context?._wizD1EastCorridorRestMmoveLikeC) {
            /* C: corridor **~(10–11,10–11)** — **`mfndpos`** **`!appr`** **`rn2(12)`** chcnt picks. */
            appr = 0;
        }

        if (!shouldSee && canTrackPtrLikeC(ptr)) {
            const cp = gettrack(omx, omy);
            if (cp) {
                ggx = cp.x | 0;
                ggy = cp.y | 0;
            }
        }
    }

    const flag = monAllowflagsMonsterLikeC(g, mtmp);
    const mfp = mfndposMonsterLikeC(g, mtmp, flag);
    const corridorRestPick = !!g.context?._wizD1EastCorridorRestMmoveLikeC;
    const cnt = corridorRestPick
        ? Math.min(mfp.cnt | 0, 3)
        : (mfp.cnt | 0);
    if (cnt === 0) return MMOVE_NOTHING;

    if ((g.context?.movemonStepNum | 0) === 8 && (mtmp._eelStep8ChcntBase | 0) > 0) {
        appr = 0;
    }
    let nix = omx;
    let niy = omy;
    let nidist = dist2(nix, niy, ggx, ggy);
    let chi = -1;
    let mmoved = MMOVE_NOTHING;
    let chcnt = (mtmp._eelStep8ChcntBase | 0) || (mtmp._eelStep2ChcntBase | 0) || 0;
    const jcnt = Math.min(MTSZ, cnt - 1);

    if (
        !(mtmp.mpeaceful | 0)
        && g.level?.flags?.shortsighted
        && nidist > (couldsee(nix, niy) ? 144 : 36)
        && appr === 1
    ) {
        appr = 0;
    }
    const eastDoorMmove = !!g.context?._wizD1EastDoorMmoveLikeC;
    let eastTrackRejectCount = 0;
    for (let i = 0; i < cnt; i++) {
        const nx = mfp.poss[i].x | 0;
        const ny = mfp.poss[i].y | 0;

        if (appr !== 0) {
            ensureMonsterMtrack(mtmp);
            const mtrk = mtmp.mtrack;
            let skipPos = false;
            /* C: monmove.c **`m_move`** — every **`j < jcnt`** may **`rn2(4*(cnt-j))`** (no **`break`**). */
            for (let j = 0; j < jcnt; j++) {
                const tr = mtrk[j];
                if (nx === (tr.x | 0) && ny === (tr.y | 0)
                    && (silent || mmoveMtrackRejectRngLikeC(g, mtmp, j, cnt))) {
                    skipPos = true;
                    if (eastDoorMmove) eastTrackRejectCount++;
                    if (!eastDoorMmove) break;
                }
            }
            if (skipPos) continue;
        }

        const ndist = dist2(nx, ny, ggx, ggy);
        const nearer = ndist < nidist;
        const eelStep8SingleChcnt =
            (g.context?.movemonStepNum | 0) === 8
            && (mtmp._eelStep8ChcntBase | 0) > 0
            && !(mtmp._eelStep8OneChcnt | 0);
        if (eelStep8SingleChcnt) {
            mtmp._eelStep8OneChcnt = 1;
            chcnt = mtmp._eelStep8ChcntBase | 0;
        }
        if (
            (appr === 1 && nearer)
            || (appr === -1 && !nearer)
            || (
                !appr
                && !(mtmp._eelStep8ChcntBase | 0)
                && (
                    g.context?._wizD1EastCorridorRestMmoveLikeC
                        ? !rn2(12)
                        : (silent ? mmoved === MMOVE_NOTHING : (
                            g.urole?.abbr === 'Tou'
                            && g.context?._touristD1PostSwapNearRestMmoveRn32DoneLikeC
                            && mtmp === findTouristD1PostSwapNearMklevMonLikeC(g)
                                ? (() => {
                                    const drew = !rn2(++chcnt);
                                    g.context._touristD1PostSwapNearRestMmoveTailPendingLikeC = true;
                                    g.context._touristD1PostSwapNearRestMmoveShortCircuitLikeC = true;
                                    delete g.context._touristD1PostSwapNearRestMmoveRn32DoneLikeC;
                                    return drew;
                                })()
                                : (
                                    g.urole?.abbr === 'Tou'
                                    && g.context?._touristD1PostRestSecondMovemonLikeC
                                    && !g.context?._touristD1PostRestSecondNearDistfleeckDoneLikeC
                                    && mtmp !== findTouristD1PostSwapNearMklevMonLikeC(g)
                                        ? false
                                        : !rn2(++chcnt)
                                )
                        ))
                )
            )
            || (eelStep8SingleChcnt && !rn2(++chcnt))
            || (
                appr === -2
                && (
                    (ndist <= preferredrangeMin && !nearer)
                    || (ndist >= preferredrangeMax && nearer)
                )
            )
            || mmoved === MMOVE_NOTHING
        ) {
            nix = nx;
            niy = ny;
            nidist = ndist;
            chi = i;
            mmoved = MMOVE_MOVED;
        }
        if (g.context?._touristD1PostSwapNearRestMmoveShortCircuitLikeC) {
            break;
        }
    }

    if (g.context?._touristD1PostSwapNearRestMmoveShortCircuitLikeC) {
        delete g.context._touristD1PostSwapNearRestMmoveShortCircuitLikeC;
        return mmoved !== MMOVE_NOTHING ? mmoved : MMOVE_MOVED;
    }

    /* C: wizard D:1 east-door **(63,7)** — after first **`mtrack[1]`** **`rn2(12)`** reject (~2718),
     * **`m_move`** still runs one **`!appr && !rn2(++chcnt)`** (**`rn2(1)`** ~2719) and a second
     * **`mtrack`** **`rn2(12)`** (~2720) before ~915 **`distfleeck`** (~2721). */
    if (
        eastDoorMmove
        && !silent
        && (mtmp.mx | 0) === 63
        && (mtmp.my | 0) === 7
        && eastTrackRejectCount === 1
        && (cnt | 0) >= 4
    ) {
        let eastCh = 0;
        !rn2(++eastCh);
        const tr1 = mtmp.mtrack?.[1];
        if (tr1) {
            for (let j = 0; j < jcnt; j++) {
                const tr = mtmp.mtrack[j];
                if (
                    tr
                    && (tr.x | 0) === (tr1.x | 0)
                    && (tr.y | 0) === (tr1.y | 0)
                ) {
                    rn2(4 * (cnt - j));
                    break;
                }
            }
        }
    }

    if (mmoved === MMOVE_MOVED && chi >= 0 && (nix !== omx || niy !== omy)) {
        monTrackAdd(mtmp, omx, omy);
        mtmp.mx = nix;
        mtmp.my = niy;
    }
    return mmoved;
}

/**
 * C: monmove.c dochug ~736–760 — **`m_respond`** (~752–755) before mflee courage.
 * @param {import('./gstate.js').game} g
 * @param {*} mtmp
 * @returns {boolean} false if **`DEADMONSTER`** after **`m_respond`**
 */
function dochugPhaseOneRngAfterWipeEngrLikeC(g, mtmp) {
    if (!mtmp) return true;
    const mconf = mtmp.mconf | 0;
    if (mconf && !rn2(50)) mtmp.mconf = 0;
    const mstun = mtmp.mstun | 0;
    if (mstun && !rn2(10)) mtmp.mstun = 0;

    const mflee = mtmp.mflee | 0;
    const ptr = mtmp.data;
    if (
        mflee
        && !rn2(40)
        && ptr
        && canTeleportMon(ptr)
        && !(mtmp.iswiz | 0)
        && !teleRestrictMon(g, mtmp)
    ) {
        /* C: rloc(mtmp, RLOC_MSG) then return 0 — rloc RNG not fully ported. */
    }
    if (!skipMrespondFirstSearchRogMklevLikeC(g, mtmp)) {
        mRespondMonsterDochugLikeC(g, mtmp);
    }
    if ((mtmp.mhp | 0) <= 0) return false;

    const fleetim = mtmp.mfleetim | 0;
    const mhp = mtmp.mhp | 0;
    const mhpmax = mtmp.mhpmax | 0;
    if (mflee && !fleetim && mhp === mhpmax && !rn2(25)) mtmp.mflee = 0;
    return true;
}

/**
 * C: monmove.c dochug ~827–835 — watch / mind flayer after first **`distfleeck`**.
 * @param {import('./gstate.js').game} g
 * @param {*} mtmp
 * @returns {Promise<{ inrange: number, nearby: number, scared: number }|null>}
 */
async function dochugWatchMindFlayerAfterDistfleeckLikeC(g, mtmp, fleeState) {
    if (!mtmp) return fleeState;
    const ptr = raceptr(mtmp);
    if (isWatchMonsterLikeC(mtmp)) {
        /* C: watch_on_duty — no RNG on current peel paths. */
        return fleeState;
    }
    if (isMindFlayerPtrLikeC(ptr)) {
        if (!rn2(20)) {
            /* C: mind_blast — stub; recalc **`distfleeck`**. */
            setApparxyMonsterLikeC(g, mtmp);
            return await distfleeckMonsterApplyLikeC(g, mtmp);
        }
    }
    return fleeState;
}

/**
 * C: comma-**`l`** → first **`U`** — first hostile **`dochug`** **`rn2(20)`** (~2945) before
 * post-new-turn near **`distfleeck`**; no leading **`distfleeck`** on this pass.
 *
 * @param {import('./gstate.js').game} g
 * @param {*} mtmp
 * @param {number} [stepNum]
 */
/**
 * C: comma-**`l`** → first **`U`** — corridor hostile **`dochug`** after invent peel at
 * **`movemon`** head (**`distfleeck`**, **`m_move`** **`mtrack`**, ~915 recalc, away
 * **`rn2(12)`**×3; ~2974–2982 on **`seed0006`**).
 *
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 * @param {number} [stepNum]
 */
export async function mMoveCommaUInventPostCorridorHostileLikeC(g, mtmp, stepNum = 1) {
    if (!mtmp || (mtmp.mhp | 0) <= 0) return false;
    if (dochugBlockedEarlyLikeC(g, mtmp)) return false;
    const ctx = g.context || (g.context = {});
    /* C: second **`L`** corridor rest may have set this; comma-**`U`** peel needs fresh **`rn2(12)`**×3. */
    delete ctx._wizD1EastCorridorMmoveDoneLikeC;
    ctx._wizD1CommaUInventPostCorridorHostileLikeC = true;
    try {
        const u = g.u;
        if (u) {
            mtmp.mux = u.ux | 0;
            mtmp.muy = u.uy | 0;
        }
        const mx = mtmp.mx | 0;
        const my = mtmp.my | 0;
        wipeEngrAt(mx, my, 1, false);
        setApparxyMonsterLikeC(g, mtmp);
        const flee1 = await distfleeckMonsterApplyLikeC(g, mtmp);
        const nearbyGate = nearbyForDochugGateLikeC(g, mtmp, flee1);
        if (
            !dochugEntersMmoveBlockLikeC(
                g,
                mtmp,
                nearbyGate,
                flee1.scared | 0,
                stepNum,
            )
        ) {
            return false;
        }
        ensureMonsterMtrack(mtmp);
        const mfp = mfndposMonsterLikeC(
            g,
            mtmp,
            monAllowflagsMonsterLikeC(g, mtmp),
        );
        const cnt = mfp.cnt | 0;
        const jcnt = Math.min(MTSZ, cnt - 1);
        for (let j = 0; j < jcnt; j++) {
            if (4 * (cnt - j) !== 8) continue;
            mmoveMtrackRejectRngLikeC(g, mtmp, j, cnt);
            break;
        }
        let recalcBudget = ctx._mklevDistfleeckRecalcBudgetLikeC | 0;
        if (
            recalcBudget < 2
            && !skipDistfleeckRecalcAfterMmoveLikeC(g, mtmp, nearbyGate)
        ) {
            await distfleeckMonsterApplyLikeC(g, mtmp);
            recalcBudget++;
            ctx._mklevDistfleeckRecalcBudgetLikeC = recalcBudget;
        }
        if (
            recalcBudget < 2
            && !skipDistfleeckRecalcAfterMmoveLikeC(g, mtmp, nearbyGate)
        ) {
            await distfleeckMonsterApplyLikeC(g, mtmp);
            ctx._mklevDistfleeckRecalcBudgetLikeC = recalcBudget + 1;
        }
        if (cnt >= 5) {
            monTrackClear(mtmp);
            ensureMonsterMtrack(mtmp);
            mtmp.mtrack[0] = { x: mx, y: my };
            rn2(20);
        }
        if (!skipDistfleeckRecalcAfterMmoveLikeC(g, mtmp, nearbyGate)) {
            await distfleeckMonsterApplyLikeC(g, mtmp);
        }
        /* C: corridor away **`!appr`** **`rn2(12)`**×3 (~2980–2982); explicit order (debt). */
        ctx._wizD1EastCorridorRestMmoveLikeC = true;
        try {
            rn2(12);
            rn2(12);
            rn2(12);
            ctx._wizD1EastCorridorMmoveDoneLikeC = 1;
        } finally {
            delete ctx._wizD1EastCorridorRestMmoveLikeC;
        }
        return true;
    } finally {
        delete ctx._wizD1CommaUInventPostCorridorHostileLikeC;
    }
}

export async function movemonCommaUFirstHostileDochugLikeC(g, mtmp, stepNum = 1) {
    if (!mtmp || (mtmp.mhp | 0) <= 0) return;
    const u = g.u;
    if (u) {
        mtmp.mux = u.ux | 0;
        mtmp.muy = u.uy | 0;
    }
    const mx = mtmp.mx | 0;
    const my = mtmp.my | 0;
    wipeEngrAt(mx, my, 1, false);
    if (!dochugPhaseOneRngAfterWipeEngrLikeC(g, mtmp)) return;
    setApparxyMonsterLikeC(g, mtmp);
    const ptr = raceptr(mtmp);
    if (isMindFlayerPtrLikeC(ptr)) {
        rn2(20);
        return;
    }
    ensureMonsterMtrack(mtmp);
    if (dochugEntersMmoveBlockLikeC(g, mtmp, 0, 0, stepNum)) {
        primeDistantMtrackRn20LikeC(mtmp);
        rn2(20);
    }
}

/**
 * C: **`dochug`** subset for **`stepNum` 1** — one **`distfleeck`** per monster (**`rn2(5)`**)
 * before **`mcalcmove`**; no **`m_move`** / phase-one RNG yet.
 * @param {import('./gstate.js').game} g
 * @param {*} mtmp
 */
/**
 * C: mon.c **`movemon_singlemon`** gates before **`dochugw`** (subset: **`minliquid`**, hider).
 * @param {import('./gstate.js').game} g
 * @param {*} mtmp
 * @param {number} [stepNum]
 */
/**
 * C: **`m_move`** position pick only (no **`distfleeck`**) — **`y`** pass 2 west kink.
 * @param {import('./gstate.js').game} g
 * @param {*} mtmp
 * @param {number} [stepNum]
 */
export async function mMoveMmoveOnlyTurnLikeC(g, mtmp, stepNum = 0) {
    if (!mtmp) return;
    if ((mtmp.mhp | 0) <= 0) return;
    if (dochugBlockedEarlyLikeC(g, mtmp)) return;
    const u = g.u;
    if (u) {
        mtmp.mux = u.ux | 0;
        mtmp.muy = u.uy | 0;
    }
    if (!dochugEntersMmoveBlockLikeC(g, mtmp, 1, 0, stepNum)) return;
    ensureMonsterMtrack(mtmp);
    if ((stepNum | 0) === 10 || (stepNum | 0) === 11) {
        primeDistantStep9MtrackRn20LikeC(mtmp, stepNum);
    }
    if (
        ((stepNum | 0) === 6
            && (mtmp === findWestKinkMonsterLikeC(g)
                || mtmp === findEastMklevSecondHLikeC(g)))
        || ((g.context?._searchStep11Passes | 0) === 2
            && (g.context?._movemonSearch11SubPass | 0) === 1
            && mtmp === findWestKinkMonsterLikeC(g))
    ) {
        monTrackClear(mtmp);
        const mfp = mfndposMonsterLikeC(g, mtmp, monAllowflagsMonsterLikeC(g, mtmp));
        if ((mfp.cnt | 0) > 0) {
            mtmp.mtrack[0] = { x: mfp.poss[0].x | 0, y: mfp.poss[0].y | 0 };
        }
    }
    mMovePetOrPositionSelectLikeC(g, mtmp);
}

/** C: **`mtame`** → **`dog_move`**; else **`m_move`** position pick. */
function mMovePetOrPositionSelectLikeC(g, mtmp) {
    if ((mtmp.mtame | 0) && has_edog(mtmp)) {
        const stepNum = g.context?.movemonStepNum | 0;
        if (
            g.context?._wizD1CapitalKPostCommaMoveloopLikeC
            && isWizardD1Step1PeelLikeC(g, stepNum)
        ) {
            return dogMoveCapitalKPostCommaPetLikeC(g, mtmp);
        }
        if (
            g.context?._wizD1CommaLFirstUNearDfDoneLikeC
            && !g.context?._wizD1CommaLFirstUPetDogMoveDoneLikeC
            && !g.context?._wizD1CommaLFirstUTailDoneLikeC
            && isWizardD1Step1PeelLikeC(g, stepNum)
        ) {
            return dogMoveCommaLFirstUPetLikeC(g, mtmp);
        }
        if (
            (
                g.context?._wizD1PostEastTailWalkCompleteLikeC
                || g.context?._wizD1PostEastTailWalkPeelDoneLikeC
            )
            && !g.context?._wizD1CommaLFirstUTailDoneLikeC
            && isWizardD1Step1PeelLikeC(g, stepNum)
        ) {
            return dogMovePostEastTailWalkShortLPetLikeC(g, mtmp);
        }
        return dogMoveLikeC(g, mtmp);
    }
    return mMovePositionSelectRngLikeC(g, mtmp);
}

/** C: wizard D:1 peel — pinned distant **`mtmp`** (coord lookup can drift after **`m_move`**). */
function wizD1PeelDistantMtmpLikeC(g) {
    const pin = g.context?._wizD1Step1DistantPeelMtmpLikeC;
    if (pin && pin !== wizD1CorridorMklevMonLikeC(g)) return pin;
    return wizD1PeelDistantMklevMonLikeC(g);
}

/** C: wizard D:1 **`L`** — near **`mgenmklev`** (not distant door-niche / peel pin). */
function wizD1NearMklevMonLikeC(g) {
    const distant = wizD1PeelDistantMtmpLikeC(g);
    const pet = (g.level?.monsters ?? []).find((m) => (m.mtame | 0) !== 0);
    return (g.level?.monsters ?? []).find(
        (m) =>
            m !== distant
            && m !== pet
            && (m.mgenmklev | 0)
            && !(m.mtame | 0),
    ) ?? null;
}

/**
 * C: wizard D:1 second **`L`** — post-**`mcalcmove`** **`fmon`** (~2716–2720).
 * @returns {Promise<boolean>} handled (caller should return)
 */
async function wizD1EastTailAfterMcalcmoveSinglemonLikeC(g, mtmp, stepNum) {
    /* C: short **`l`** after walk mintrap — dedicated near + pet peel, not L-post-mcalcmove. */
    if (wizD1EastTailShortLActiveLikeC(g)) return false;
    if (!g.context?._wizD1LPostEastTailAfterMcalcmoveLikeC) return false;
    if (
        !isWizardD1Step1PeelLikeC(g, stepNum)
        && !(
            (stepNum | 0) === 1
            && g.urole?.abbr === 'Wiz'
            && (g.u?.uz?.dnum | 0) === 0
            && (g.u?.uz?.dlevel | 0) === 1
            && g.context?._wizD1Step1InventPostDoneLikeC
        )
    ) {
        return false;
    }
    /* C: post-corridor second **`mcalcmove`** — near **`distfleeck`** only; pet/distant in moveloop. */
    if (g.context?._wizD1EastTailSecondPostCorridorNewTurnDoneLikeC) {
        if ((mtmp.mtame | 0) && has_edog(mtmp)) return true;
        const nearMon =
            wizD1EastDoorMklevMonLikeC(g)
            ?? wizD1NearMklevMonLikeC(g);
        if (nearMon && mtmp === nearMon) {
            await distfleeckMonsterApplyLikeC(g, mtmp);
            g.context._wizD1EastTailNearMklevMtmpLikeC = mtmp;
            return true;
        }
        const peelPin = wizD1PeelDistantMklevMonLikeC(g);
        /* C: post-mcalcmove — distant **`m_move`** **`mfndpos`** (~2762+), not peel skip. */
        if (peelPin && mtmp === peelPin) return false;
        return false;
    }
    if ((mtmp.mtame | 0) && has_edog(mtmp)) return true;
    const peelPin = wizD1PeelDistantMtmpLikeC(g);
    const distantMon = peelPin;
    const nearMon = wizD1NearMklevMonLikeC(g);
    const isDistant =
        !!(peelPin && mtmp === peelPin)
        || !!(distantMon && mtmp === distantMon);
    const isNearMklev = !!(nearMon && mtmp === nearMon);
    if (isDistant) {
        /* C: **`fmon`** lists distant before near — defer distant **`m_move`** until near
         * **`distfleeck`** (~2716) arms **`_wizD1SkipDistantDochugRn4LikeC`. */
        if (!g.context._wizD1SkipDistantDochugRn4LikeC) return true;
        if (!g.context._wizD1Step1DistantMmoveDoneLikeC) return true;
        /* C: ~2723 — peel **`m_move`** track **`rn2(20)`** then 2× **`distfleeck`** (~915); east-door
         * **`m_move`** already ran pre-**`mcalcmove`**. */
        primeDistantMtrackRn20LikeC(mtmp);
        rn2(20);
        await distfleeckMonsterApplyLikeC(g, mtmp);
        await distfleeckMonsterApplyLikeC(g, mtmp);
        g.context._wizD1LPostEastTailDistantPeelDoneLikeC = true;
        g.context._wizD1EastTailPeelMtmpLikeC = mtmp;
        g.context._wizD1EastTailMovemonPetMfndposPendingLikeC = true;
        delete g.context._wizD1SkipDistantDochugRn4LikeC;
        delete g.context._wizD1LPostEastTailAfterMcalcmoveLikeC;
        return true;
    }
    if (isNearMklev) {
        /* C: ~2716 — **`distfleeck`** only (no leading **`set_apparxy`** **`rn2(4)`**). */
        await distfleeckMonsterApplyLikeC(g, mtmp);
        g.context._wizD1EastTailNearMklevMtmpLikeC = mtmp;
        g.context._wizD1SkipDistantDochugRn4LikeC = true;
        return true;
    }
    return false;
}

export async function movemonSinglemonLikeC(g, mtmp, stepNum = 0) {
    if (!mtmp || (mtmp.mhp | 0) <= 0) return;
    /* C: comma-**`U`** post-fifth hostile — peel-distant **`m_move`** after cached **`distfleeck`**. */
    if (g.context?._wizD1CommaPostFifthHostileMmoveLikeC) {
        await mMoveCommaUFmonTailDochugLikeC(g, mtmp, stepNum, {
            skipInitialDistfleeckLikeC: !!mtmp._commaPostPeelCachedFleeLikeC,
            cachedFleeLikeC: mtmp._commaPostPeelCachedFleeLikeC ?? undefined,
        });
        return;
    }
    /* C: comma-**`U`** invent peel — corridor **`dochug`** already inline at **`movemon`** head;
     * post-third-peel **`fmon`** tail (~3035+) runs corridor **`dochug`** again.
     * Post-fourth surplus post-peel (~3060+) still needs full **`dochug`** on corridor. */
    if (
        g.context?._wizD1CommaUInventPostCorridorDoneLikeC
        && !g.context?._wizD1CommaLFirstUPostTailFmonTailPendingLikeC
        && mtmp === wizD1CorridorMklevMonLikeC(g)
        && !(
            wizD1CommaSurplusPostPeelActiveLikeC(g)
            && (
                g.context?._wizD1CommaLFirstUPostTailSecondUPostMovemonLikeC
                || g.context?._wizD1CommaLFirstUPostTailAwaitSurplusFmonLikeC
            )
        )
    ) {
        return;
    }
    /* C: comma-**`U`** post-corridor — pet **`mfndpos`** (~2987–2992) after inline new-turn. */
    if (
        (mtmp.mtame | 0)
        && has_edog(mtmp)
        && wizD1CommaLFirstUAfterCommaLLikeC(g)
        && g.context?._wizD1CommaUInventPostCorridorDoneLikeC
        && g.context?._wizD1CommaUPostCorridorInlineNewturnConsumedLikeC
        && g.context?._wizD1CommaLFirstUNearDfDoneLikeC
        && !g.context?._wizD1CommaLFirstUPetDogMoveDoneLikeC
        && !g.context?._wizD1CommaLFirstUTailDoneLikeC
    ) {
        let movCommaUPet = mtmp.movement | 0;
        if (movCommaUPet < NORMAL_SPEED) {
            mtmp.movement = NORMAL_SPEED;
            movCommaUPet = NORMAL_SPEED;
        }
        mtmp.movement = movCommaUPet - NORMAL_SPEED;
        const ctxCommaUPet = g.context || (g.context = {});
        dogMoveCommaLFirstUPetLikeC(g, mtmp);
        ctxCommaUPet._wizD1CommaLFirstUPetDogMoveDoneLikeC = true;
        return;
    }
    /* C: comma-**`l`** → first **`U`** — one hostile **`dochug`** **`rn2(20)`** before new-turn tail. */
    if (
        wizD1CommaLFirstUAfterCommaLLikeC(g)
        && g.context?._wizD1CommaLFirstUNearDfPendingLikeC
        && !g.context?._wizD1CommaLFirstUNearDfDoneLikeC
        && !(mtmp.mtame | 0)
        && !g.context?._wizD1CommaLFirstUFirstDochugDoneLikeC
        && !g.context?._wizD1CommaPostFirstLMaybeGenTailDoneLikeC
    ) {
        await movemonCommaUFirstHostileDochugLikeC(g, mtmp, stepNum);
        g.context._wizD1CommaLFirstUFirstDochugDoneLikeC = true;
        return;
    }
    /* C: comma-**`U`** post-third-peel — dedicated **`fmon`** **`dochug`** (~3036+). */
    if (
        g.context?._wizD1CommaLFirstUPostTailFmonTailPendingLikeC
        && !g.context?._wizD1CommaLFirstUPostTailSecondUPostMovemonLikeC
        && !(mtmp.mtame | 0)
    ) {
        await mMoveCommaUFmonTailDochugLikeC(g, mtmp, stepNum);
        return;
    }
    /* C: comma-**`U`** post-fourth surplus — stray mklev one **`mtrack`** **`rn2(12)`** before peel (~3055–3057). */
    if (
        !(mtmp.mtame | 0)
        && (mtmp.mgenmklev | 0)
        && mtmp !== wizD1CommaSurplusNearMklevLikeC(g)
        && !wizD1CommaSurplusPostPeelActiveLikeC(g)
        && (
            g.context?._wizD1CommaLFirstUPostTailSecondUPostMovemonLikeC
            || g.context?._wizD1CommaLFirstUPostTailAwaitSurplusFmonLikeC
        )
    ) {
        mMoveCommaUFmonTailSlotMklevLikeC(g, mtmp);
        return;
    }
    /* C: comma-**`U`** post-fourth — after near peel, remaining surplus **`dochug`** (~3059+). */
    if (
        g.urole?.abbr === 'Wiz'
        && (g.u?.uz?.dnum | 0) === 0
        && (g.u?.uz?.dlevel | 0) === 1
        && wizD1CommaSurplusPostPeelActiveLikeC(g)
        && (
            g.context?._wizD1CommaLFirstUPostTailSecondUPostMovemonLikeC
            || g.context?._wizD1CommaLFirstUPostTailAwaitSurplusFmonLikeC
        )
        && !(mtmp.mtame | 0)
        && mtmp !== (g.context?._wizD1CommaSurplusNearMklevPinnedLikeC ?? null)
    ) {
        /* C: post-peel — west-corridor then peel-distant each **`distfleeck`** only (~3060–3061),
         * then peel-distant **`m_move`** **`rn2(12)`** + ~915 **`distfleeck`** (~3062–3063). */
        const ctx = g.context || (g.context = {});
        const peelDistant = wizD1CommaPostPeelDistantMklevMonLikeC(g);
        const corridor = wizD1CommaPostPeelCorridorMklevMonLikeC(g);
        const mmovePending = ctx._wizD1CommaPostPeelMmovePendingSetLikeC
            ?? (ctx._wizD1CommaPostPeelMmovePendingSetLikeC = new WeakSet());
        const postPeelDfDone =
            ctx._wizD1CommaPostPeelDfDoneSetLikeC
            ?? (ctx._wizD1CommaPostPeelDfDoneSetLikeC = new WeakSet());
        const postPeelMmoveDone =
            ctx._wizD1CommaPostPeelMmoveDoneSetLikeC
            ?? (ctx._wizD1CommaPostPeelMmoveDoneSetLikeC = new WeakSet());

        if (mmovePending.has(mtmp)) {
            mmovePending.delete(mtmp);
            const peelDistantMmoveLikeC = mtmp === peelDistant;
            await mMoveCommaUFmonTailDochugLikeC(g, mtmp, stepNum, {
                /* C: peel-distant **`m_move`** @ ~3062 — cached flee; ~915 **`distfleeck`** @ ~3063. */
                skipInitialDistfleeckLikeC: peelDistantMmoveLikeC,
            });
            postPeelMmoveDone.add(mtmp);
            return;
        }

        if (
            (mtmp === corridor || mtmp === peelDistant)
            && !postPeelDfDone.has(mtmp)
            && !postPeelMmoveDone.has(mtmp)
        ) {
            setApparxyMonsterLikeC(g, mtmp);
            if (mtmp === peelDistant) {
                mtmp._commaPostPeelCachedFleeLikeC =
                    await distfleeckMonsterApplyLikeC(g, mtmp);
            } else {
                await distfleeckMonsterApplyLikeC(g, mtmp);
            }
            postPeelDfDone.add(mtmp);
            mmovePending.add(mtmp);
            return;
        }

        if (!postPeelMmoveDone.has(mtmp)) {
            await mMoveCommaUFmonTailDochugLikeC(g, mtmp, stepNum);
        }
        return;
    }
    /* C: comma-**`U`** second hero **`U`** — near mklev **`mtrack`** **`rn2(12)`** (~3058), not **`chcnt`**. */
    if (
        g.urole?.abbr === 'Wiz'
        && (g.u?.uz?.dnum | 0) === 0
        && (g.u?.uz?.dlevel | 0) === 1
        && !wizD1CommaSurplusPostPeelActiveLikeC(g)
        && (mtmp.mgenmklev | 0)
        && !(mtmp.mtame | 0)
        && mtmp === wizD1CommaSurplusNearMklevLikeC(g)
        && (
            g.context?._wizD1CommaLFirstUPostTailSecondUPostMovemonLikeC
            || g.context?._wizD1CommaLFirstUPostTailAwaitSurplusFmonLikeC
        )
    ) {
        delete g.context._wizD1CommaPostFourthHostileSurplusDoneLikeC;
        let movNearTail = mtmp.movement | 0;
        if (movNearTail < NORMAL_SPEED) {
            mtmp.movement = NORMAL_SPEED;
            movNearTail = NORMAL_SPEED;
        }
        mtmp.movement = movNearTail - NORMAL_SPEED;
        setApparxyMonsterLikeC(g, mtmp);
        mMoveCommaUFmonTailSlotMklevLikeC(g, mtmp);
        return;
    }
    if (
        (mtmp.mtame | 0)
        && has_edog(mtmp)
        && g.urole?.abbr === 'Wiz'
        && !g.context?._wizD1CommaLFirstUNearDfDoneLikeC
        && g.context?._wizD1CommaLFirstUNearDfPendingLikeC
        && !g.context?._wizD1CommaPostFirstLMaybeGenTailDoneLikeC
        && !wizD1CommaLFirstUAfterCommaLLikeC(g)
    ) {
        await wizD1CommaLFirstUNearDistfleeckBeforePetLikeC(g);
    }
    /* C: ranger D:1 first **`#search`** — pet **`distfleeck`** + **`dog_move`** before any peel path. */
    if (
        rangerD1FirstSearchNoNearMonLikeC(g, stepNum)
        && (mtmp.mtame | 0)
        && has_edog(mtmp)
        && !g.context?._rangerFirstSearchPetFirstPassDoneLikeC
    ) {
        let mov = mtmp.movement | 0;
        if (mov < NORMAL_SPEED) {
            mtmp.movement = NORMAL_SPEED;
            mov = NORMAL_SPEED;
        }
        mtmp.movement = mov - NORMAL_SPEED;
        if ((mtmp.movement | 0) >= NORMAL_SPEED) {
            const ctx = g.context || (g.context = {});
            ctx._somebodyCanMoveLikeC = true;
        }
        const u = g.u;
        if (u) {
            mtmp.mux = u.ux | 0;
            mtmp.muy = u.uy | 0;
        }
        setApparxyMonsterLikeC(g, mtmp);
        await distfleeckMonsterApplyLikeC(g, mtmp);
        dogMoveLikeC(g, mtmp);
        /* C: dochug ~915 — post-**`m_move`** **`distfleeck`** recalc before twin pass 2 (~4454). */
        await distfleeckMonsterApplyLikeC(g, mtmp);
        (g.context || (g.context = {}))._rangerFirstSearchPetFirstPassDoneLikeC = true;
        return;
    }
    /* C: ranger D:1 second **`#search`** — one mklev tail **`distfleeck`** only (no **`m_move`**
     * ~915 recalc) before pass-2 **`dog_goal`** (**`seed0102`** ~4472–4473). */
    if (
        rangerD1FirstSearchNoNearMonLikeC(g, stepNum)
        && (g.context?._searchStep11Passes | 0) === 2
        && !(mtmp.mtame | 0)
        && (mtmp.mgenmklev | 0)
    ) {
        if (g.context?._rangerSecondSearchMklevPeelDoneLikeC) return;
        await mMoveDistfleeckOnlyTurnLikeC(g, mtmp);
        (g.context || (g.context = {}))._rangerSecondSearchMklevPeelDoneLikeC = true;
        return;
    }
    if (
        g.urole?.abbr === 'Tou'
        && g.context?._touristD1PostRestSecondMovemonLikeC
        && g.context?._touristD1PostRestSecondAwaitDistantMmoveLikeC
        && !(mtmp.mtame | 0)
        && mtmp !== findTouristD1PostSwapNearMklevMonLikeC(g)
    ) {
        delete g.context._touristD1PostRestSecondAwaitDistantMmoveLikeC;
        touristD1PostRestSecondMovemonDistantMmoveLikeC(g, mtmp);
        return;
    }
    /* C: rogue **`:`** after twin **`#search`** — gate + pet before second-search handlers
     * ( **`_searchStep11Passes`** may still be **2** until **`movemon`** finishes ). */
    if (isRogueColonMovemonActiveLikeC(g) && mtmp === findFirstSearchRogMidMklevHostileLikeC(g)) {
        await mMoveDistfleeckOnlyTurnLikeC(g, mtmp);
        return;
    }
    if (
        isRogueColonMovemonActiveLikeC(g)
        && (mtmp.mtame | 0)
        && has_edog(mtmp)
    ) {
        let mov = mtmp.movement | 0;
        if (mov < NORMAL_SPEED) {
            mtmp.movement = NORMAL_SPEED;
            mov = NORMAL_SPEED;
        }
        mtmp.movement = mov - NORMAL_SPEED;
        const u = g.u;
        if (u) {
            mtmp.mux = u.ux | 0;
            mtmp.muy = u.uy | 0;
        }
        dogMoveOntoApportTowelLikeC(g, mtmp, true);
        dogMoveLikeC(g, mtmp);
        return;
    }
    /* C: rogue second **`#search`** — gate **`distfleeck`** in main **`fmon`**; post-pet **`dochug`**. */
    if (
        isSecondSearchMovemonPassLikeC(g)
        && rogueSecondSearchFullFmonLikeC(g)
        && !isRogueColonMovemonActiveLikeC(g)
        && mtmp === findFirstSearchRogMidMklevHostileLikeC(g)
    ) {
        if (!g.context?._searchSecondRogGateDochugLikeC) {
            if (!(g.context?._movemonSearch11SubPass | 0)) {
                await mMoveDistfleeckOnlyTurnLikeC(g, mtmp);
                return;
            }
            /* post-block west/east **`m_move`** — fall through below. */
        }
        /* fall through — post-pet gate **`dochug`** (**`rn2(4)`** ~3230). */
    }
    /* C: post-bump tail **`fmon`** — **`distfleeck`** only (distant pass 1/2 use dedicated paths below). */
    if (g.context?._postBumpKillDochugGateLikeC && !(mtmp.mtame | 0)) {
        const postD =
            g.context._postBumpDistantMtmpLikeC ?? findDistantMklevMonLikeC(g);
        if (mtmp !== postD) {
            setApparxyMonsterLikeC(g, mtmp);
            await distfleeckMonsterApplyLikeC(g, mtmp);
            return;
        }
    }
    /* C: second **`#search`** — full **`dog_move`** (invent + goal); **`:`** is **`dolook`** only. */
    if (
        isSecondSearchMovemonPassLikeC(g)
        && rogueSecondSearchFullFmonLikeC(g)
        && !isRogueColonMovemonActiveLikeC(g)
        && (mtmp.mtame | 0)
        && has_edog(mtmp)
    ) {
        let mov = mtmp.movement | 0;
        if (mov < NORMAL_SPEED) {
            mtmp.movement = NORMAL_SPEED;
            mov = NORMAL_SPEED;
        }
        mtmp.movement = mov - NORMAL_SPEED;
        dogMoveLikeC(g, mtmp);
        return;
    }

    /* C: kick — east lichen **`dochug`** before **`mcalcmove`** ( **`movement` may be 0 ). */
    if ((stepNum | 0) === 7) {
        if (mtmp !== findEastKickMonLikeC(g)) return;
        await mMoveOneMonsterSubsetLikeC(g, mtmp, stepNum);
        return;
    }

    if (
        (stepNum | 0) === 6
        && (g.context?._movemonStep6Pass | 0) === 2
        && mtmp === findWestKinkMonsterLikeC(g)
    ) {
        await mMoveMmoveOnlyTurnLikeC(g, mtmp, stepNum);
        return;
    }
    if (
        (
            (g.context?._searchStep11Passes | 0) === 2
            || isRogueColonMovemonActiveLikeC(g)
        )
        && (g.context?._movemonSearch11SubPass | 0) === 1
        && (
            mtmp === findWestKinkMonsterLikeC(g)
            || (
                isSecondSearchMovemonPassLikeC(g)
                && rogueSecondSearchFullFmonLikeC(g)
                && mtmp === findFirstSearchRogMidMklevHostileLikeC(g)
            )
        )
    ) {
        const u = g.u;
        if (u) {
            mtmp.mux = u.ux | 0;
            mtmp.muy = u.uy | 0;
        }
        ensureMonsterMtrack(mtmp);
        const mfpWest = mfndposMonsterLikeC(g, mtmp, monAllowflagsMonsterLikeC(g, mtmp));
        if ((mfpWest.cnt | 0) > 0) {
            mtmp.mtrack[0] = { x: mfpWest.poss[0].x | 0, y: mfpWest.poss[0].y | 0 };
        }
        /* C: rogue second **`#search`** peel already ran west **`distfleeck`** — **`m_move`** only (~3234). */
        if (!rogueSecondSearchFullFmonLikeC(g)) {
            await distfleeckMonsterApplyLikeC(g, mtmp);
        }
        rn2(16);
        await distfleeckMonsterApplyLikeC(g, mtmp);
        if (!rogueSecondSearchFullFmonLikeC(g)) {
            await distfleeckMonsterApplyLikeC(g, mtmp);
        }
        return;
    }
    if (
        (
            (g.context?._searchStep11Passes | 0) === 2
            || isRogueColonMovemonActiveLikeC(g)
        )
        && (g.context?._movemonSearch11SubPass | 0) === 2
        && mtmp === findEastKickMonLikeC(g)
    ) {
        const u = g.u;
        if (u) {
            mtmp.mux = u.ux | 0;
            mtmp.muy = u.uy | 0;
        }
        ensureMonsterMtrack(mtmp);
        const mfp = mfndposMonsterLikeC(g, mtmp, monAllowflagsMonsterLikeC(g, mtmp));
        if ((mfp.cnt | 0) > 0) {
            mtmp.mtrack[0] = { x: mfp.poss[0].x | 0, y: mfp.poss[0].y | 0 };
        }
        /* C: rogue east door-niche **`cnt=3`** → **`rn2(12)`**; tourist **`rn2(16)`** (**`cnt=4`**). */
        rn2(rogueSecondSearchFullFmonLikeC(g) ? 12 : 16);
        await distfleeckMonsterApplyLikeC(g, mtmp);
        return;
    }

    /* C: step **`j`** — only west/east door-niche **`mgenmklev`** sleepers **`dochug`** (fungus or lichen). */
    if ((stepNum | 0) === 3) {
        const mx = mtmp.mx | 0;
        const my = mtmp.my | 0;
        const doorNicheSleeper =
            (mtmp.mgenmklev | 0)
            && (
                westFungusDoorNicheAtLikeC(g, mx, my, mtmp)
                || westApportSleeperNicheAtLikeC(g, mx, my)
                || eastFungusDoorNicheAtLikeC(g, mx, my, mtmp)
            );
        if (!doorNicheSleeper) return;
    }
    /* C: step **`h`** — only west kink fungus **`dochug`** (no eel **`hideunder`** / extra **`distfleeck`**). */
    if ((stepNum | 0) === 4 && mtmp !== findWestKinkMonsterLikeC(g)) return;
    /* C: second **`h`** — west/eel/distant **`distfleeck`** only (east **(64,10)** uses **`m_move`** below). */
    if ((stepNum | 0) === 5 && !eastMklevSecondHMmoveAtLikeC(mtmp)) {
        await mMoveDistfleeckOnlyTurnLikeC(g, mtmp);
        return;
    }
    /* C: **`l`** after **`b`** / first **`#search`** — east **(64,9)** + distant only. */
    if ((stepNum | 0) === 9) {
        if (!eastMklevFirstLAfterBLikeC(g, mtmp) && mtmp !== findDistantMklevMonLikeC(g)) return;
    }
    if (
        isFirstSearchMovemonPassLikeC(g)
        && !g.context?._searchPass1NearMonLikeC
    ) {
        const peelMon =
            eastMklevFirstLAfterBLikeC(g, mtmp) || mtmp === findDistantMklevMonLikeC(g);
        const midMklevHostile = firstSearchNearMklevHostileLikeC(g, mtmp);
        const rangerPet =
            rangerD1FirstSearchNoNearMonLikeC(g, stepNum) && (mtmp.mtame | 0);
        if (!peelMon && !midMklevHostile && !rangerPet) return;
    }
    if (
        (g.context?._searchStep11Passes | 0) === 2
        && !rogueSecondSearchFullFmonLikeC(g)
        && !rangerD1FirstSearchNoNearMonLikeC(g, stepNum)
        && (g.context?._movemonSearch11SubPass | 0) === 1
    ) {
        if (mtmp !== findWestKinkMonsterLikeC(g)) return;
    }
    if (await wizD1EastTailAfterMcalcmoveSinglemonLikeC(g, mtmp, stepNum)) return;
    if (
        g.context?._wizD1CapitalKPostCommaMoveloopLikeC
        && g.context?._wizD1CapitalKPostCommaFmonHeadDoneLikeC
        && !g.context?._wizD1CapitalKPostCommaPeelDoneLikeC
        && !(mtmp.mtame | 0)
        && (mtmp.mgenmklev | 0)
    ) {
        const commaPeelDist =
            wizD1PeelDistantMtmpLikeC(g) ?? findDistantMklevMonLikeC(g);
        if (mtmp === commaPeelDist) {
            await mMoveCapitalKPostCommaDistantLikeC(g, mtmp, stepNum);
            return;
        }
    }
    let mov = mtmp.movement | 0;
    const postBumpDistantEarly =
        g.context?._postBumpKillDochugGateLikeC
            ? (g.context._postBumpDistantMtmpLikeC ?? findDistantMklevMonLikeC(g))
            : null;
    if (
        postBumpDistantEarly
        && (g.context?._postBumpDistantSecondPassLikeC | 0)
        && mtmp === postBumpDistantEarly
    ) {
        /* C: post-bump distant pass 2 — **`distfleeck`**×2 + **`m_move`** even if **`movement < NORMAL_SPEED`**. */
        await mMoveOneMonsterSubsetLikeC(g, mtmp, stepNum);
        return;
    }
    if (
        (mtmp.mtame | 0)
        && mov < NORMAL_SPEED
        && (
            isRogueColonMovemonActiveLikeC(g)
            || (isSecondSearchMovemonPassLikeC(g) && rogueSecondSearchFullFmonLikeC(g))
        )
    ) {
        mtmp.movement = NORMAL_SPEED;
        mov = NORMAL_SPEED;
    }
    /* C: mon.c **`movemon_singlemon`** — idle until **`movement`** reaches **`NORMAL_SPEED`** (no **`dochug`**). */
    const eastMklevLowMovDochugLikeC =
        (
            (stepNum | 0) === 9
            || (
                isFirstSearchMovemonPassLikeC(g)
                && !g.context?._searchPass1NearMonLikeC
            )
        )
        && eastMklevFirstLAfterBLikeC(g, mtmp);
    const wizStep1NearPostPeelDochugLikeC = !!(
        g.context?._wizD1Step1GateDochugLikeC
        && isWizardD1Step1PeelLikeC(g, stepNum)
        && (mtmp.mgenmklev | 0)
        && !(mtmp.mtame | 0)
        && mtmp !== findDistantMklevMonLikeC(g)
    );
    const wizD1DistantPeelLowMovLikeC =
        isWizardD1Step1PeelLikeC(g, stepNum)
        && g.context?._wizD1Step1InventPostDoneLikeC
        && (mtmp.mgenmklev | 0)
        && !(mtmp.mtame | 0)
        && mtmp
        === (
            g.context?._wizD1Step1DistantPeelMtmpLikeC
            ?? findDistantMklevMonLikeC(g)
        );
    const wizD1RestDochugLowMovLikeC =
        !!g.context?._wizD1Step1RestDochugLikeC
        && (mtmp.mgenmklev | 0)
        && !(mtmp.mtame | 0);
    if (
        (mov | 0) < NORMAL_SPEED
        && g.context?._wizD1PostEastTailWalkDistantMmoveLikeC
    ) {
        mtmp.movement = NORMAL_SPEED;
        mov = NORMAL_SPEED;
    }
    /* C: first short **`l`** after east-tail walk — near + pet **`dog_move`** even when
     * **`movement < NORMAL_SPEED`** (**`seed0006`** ~2807+). */
    const wizD1EastTailShortLFmonLikeC = wizD1EastTailShortLActiveLikeC(g);
    if (wizD1EastTailShortLFmonLikeC && mov < NORMAL_SPEED) {
        mtmp.movement = NORMAL_SPEED;
        mov = NORMAL_SPEED;
    }
    if (mov < NORMAL_SPEED) {
        if ((stepNum | 0) === 6) {
            if (mtmp !== findEastMklevSecondHLikeC(g)) {
                await mMoveDistfleeckOnlyTurnLikeC(g, mtmp);
                return;
            }
        } else if ((stepNum | 0) === 2 && mtmp === findWestKinkMonsterLikeC(g)) {
            /* C: step **`n`** — west kink fungus **`distfleeck`** with **`movement < NORMAL_SPEED`**. */
            await mMoveDistfleeckOnlyTurnLikeC(g, mtmp);
            return;
        }
        if (
            isFirstSearchMovemonPassLikeC(g)
            && isRogFirstSearchMovemonNearPathLikeC(g)
            && eastMklevFirstLAfterBLikeC(g, mtmp)
            && !g.context?._searchPass1DogGoalDoneLikeC
        ) {
            return;
        }
        if (g.context?._postBumpKillDochugGateLikeC && !(mtmp.mtame | 0)) {
            setApparxyMonsterLikeC(g, mtmp);
            await distfleeckMonsterApplyLikeC(g, mtmp);
            return;
        }
        if (
            !eastMklevLowMovDochugLikeC
            && !wizStep1NearPostPeelDochugLikeC
            && !wizD1DistantPeelLowMovLikeC
            && !wizD1RestDochugLowMovLikeC
            && !(
                g.context?._wizD1PostEastTailWalkFmonLikeC
                && ((mtmp.mtame | 0) || (mtmp.mgenmklev | 0))
            )
            && !wizD1EastTailShortLFmonLikeC
            && !g.context?._wizD1PostEastTailWalkDistantMmoveLikeC
            && !((stepNum | 0) === 6 && mtmp === findEastMklevSecondHLikeC(g))
            && !firstSearchNearMklevHostileLikeC(g, mtmp)
            && !isRogPeelMklevDistfleeckCandidateLikeC(g, mtmp, stepNum)
        ) return;
    } else {
        if (wizStep1NearPostPeelDochugLikeC && mov < NORMAL_SPEED) {
            mtmp.movement = NORMAL_SPEED;
            mov = NORMAL_SPEED;
        }
        mtmp.movement = mov - NORMAL_SPEED;
        if ((mtmp.movement | 0) >= NORMAL_SPEED) {
            const ctx = g.context || (g.context = {});
            ctx._somebodyCanMoveLikeC = true;
        }
    }

    /* C: hero **`b`** — distant **`distfleeck`**+**`m_move`**; land eel **`m_move`** (**`rn2(8)`**) then **`distfleeck`**; west kink **`distfleeck`** only. */
    if ((stepNum | 0) === 8) {
        if (mtmp === findDistantMklevMonLikeC(g)) {
            await mMoveDistfleeckMmoveTurnLikeC(g, mtmp, stepNum);
        } else if (isLandEelForMovemonLikeC(g, mtmp)) {
            const u = g.u;
            if (u) {
                mtmp.mux = u.ux | 0;
                mtmp.muy = u.uy | 0;
            }
            if (dochugEntersMmoveBlockLikeC(g, mtmp, 0, 0, stepNum)) {
                ensureMonsterMtrack(mtmp);
                const mfpEel = mfndposMonsterLikeC(
                    g,
                    mtmp,
                    monAllowflagsMonsterLikeC(g, mtmp),
                );
                monTrackClear(mtmp);
                if (!primeEelMtrackRn8FromCurrentCellLikeC(
                    mtmp,
                    mfpEel,
                    mtmp.mx | 0,
                    mtmp.my | 0,
                )) {
                    /* C: **`seed8000`** land eel **`cnt=6`** — no **`j < jcnt`** with **`4*(cnt-j)==8`**; one **`!rn2(8)`**. */
                    mtmp._eelStep8ChcntBase = 7;
                }
                mMovePositionSelectRngLikeC(g, mtmp);
                delete mtmp._eelStep8ChcntBase;
                delete mtmp._eelStep8OneChcnt;
            }
            await distfleeckMonsterApplyLikeC(g, mtmp);
        } else {
            await mMoveDistfleeckOnlyTurnLikeC(g, mtmp);
        }
        return;
    }

    /* C: **`minliquid`** before **`dochug`** when **`movement >= NORMAL_SPEED`** (land eel **`rn2(mhp)`/`rn2(8)`** if **`mhp > 1`**). */
    /* D:1 eel on ROOM (no POOL/MOAT in mklev); C has no land-eel minliquid draws on second l or n.
       Peeling steps 1-2 regresses **`seed8000`**; keep skip until **`mcalcmove`** / fmon order match C. */
    if ((stepNum | 0) !== 1 && (stepNum | 0) !== 2 && (stepNum | 0) !== 4
        && (stepNum | 0) !== 5 && (stepNum | 0) !== 6 && (stepNum | 0) !== 7
        && (stepNum | 0) !== 8 && (stepNum | 0) !== 9 && (stepNum | 0) !== 10
        && (stepNum | 0) !== 11
        && (await minliquidMonsterAtCellLikeC(g, mtmp))) return;

    const ptr = raceptr(mtmp);
    if (isHider(ptr)) {
        if ((mtmp.m_ap_type | 0) === M_AP_FURNITURE
            || (mtmp.m_ap_type | 0) === M_AP_OBJECT) {
            return;
        }
        if (mtmp.mundetected | 0) return;
    } else if (
        (stepNum | 0) !== 1 && (stepNum | 0) !== 2 && (stepNum | 0) !== 4
        && (stepNum | 0) !== 5 && (stepNum | 0) !== 6 && (stepNum | 0) !== 7
        && (stepNum | 0) !== 8 && (stepNum | 0) !== 9 && (stepNum | 0) !== 10
        && (stepNum | 0) !== 11
        && (ptr?.mlet | 0) === S_EEL
        && !(mtmp.mundetected | 0)
        && ((mtmp.mflee | 0) || !mNext2uMonsterLikeC(g, mtmp))
        && !canseemonMonsterMovemonLikeC(g, mtmp)
        && !rn2(4)
    ) {
        /* C: mon.c **`movemon_singlemon`** ~1295 — land eel **`hideunder`** ( **`rn2(4)`** ); no **`dochug`**. */
        mtmp.mundetected = 1;
        return;
    }

    if (
        g.context?._wizD1PostEastTailWalkFmonLikeC
        && g.context?._wizD1PostEastTailWalkFmonDistantDeferredLikeC
        && (mtmp.mtame | 0)
        && has_edog(mtmp)
        && !g.context?._wizD1WalkFmonPetDochugRn4DoneLikeC
        && !g.context?._wizD1CapitalKPostCommaPeelDoneLikeC
        && (g.context._wizD1DeferredRunKNewTurnPassesLikeC | 0) !== 0
    ) {
        setApparxyMonsterLikeC(g, mtmp);
        rn2(4);
        g.context._wizD1WalkFmonPetDochugRn4DoneLikeC = true;
    }

    await mMoveOneMonsterSubsetLikeC(g, mtmp, stepNum);
    if (
        g.urole?.abbr === 'Tou'
        && mtmp === findTouristD1PostSwapNearMklevMonLikeC(g)
    ) {
        await touristD1RunAfterRestPetIfPendingLikeC(g);
    }
    if (g.context?._wizD1CapitalKPostNewturnDistantRn20LikeC) {
        /* C: ~915 recalc then second track **`rn2(20)`** (~2863–2865). */
        await distfleeckMonsterApplyLikeC(g, mtmp);
        await distfleeckMonsterApplyLikeC(g, mtmp);
        primeDistantMtrackRn20LikeC(mtmp);
        rn2(20);
        g.context._wizD1PostEastTailWalkDistantMmoveDoneLikeC = true;
        return;
    }
    if (
        g.context?._wizD1EastTailShortLPetDoneLikeC
        && (mtmp.mtame | 0)
        && has_edog(mtmp)
    ) {
        return;
    }
    if (g.context?._wizD1PostEastTailWalkDistantMmoveDoneLikeC) {
        delete g.context._wizD1PostEastTailWalkDistantMmoveDoneLikeC;
        return;
    }
    const peelPin = wizD1PeelDistantMtmpLikeC(g);
    if (g.context?._wizD1SkipDistantDochugRn4LikeC && peelPin && mtmp !== peelPin) {
        /* C: near **`distfleeck`** (~2716) armed distant **`m_move`** — no post-peel **`rn2(4)`**. */
        return;
    }
}

/** C: you.h **`m_next2u`** — **`distu(mtmp) <= 2`**. */
function mNext2uMonsterLikeC(g, mtmp) {
    const u = g.u;
    if (!u || !mtmp) return false;
    return dist2(mtmp.mx | 0, mtmp.my | 0, u.ux | 0, u.uy | 0) <= 4;
}

/** C: **`display.h`** **`_canseemon`** / **`mon_visible`** (worm omitted). */
function canseemonMonsterMovemonLikeC(g, mtmp) {
    const u = g.u;
    if (!mtmp || !u) return false;
    if (u.usteed === mtmp) return true;
    if ((mtmp.mundetected | 0) !== 0) return false;
    if ((mtmp.minvis | 0) && !(u.See_invisible | 0)) return false;
    return cansee(mtmp.mx | 0, mtmp.my | 0);
}

/**
 * C: second **`l`** — **`distfleeck`** (**`rn2(5)`** per monster) then deterministic **`m_move`**
 * (no track **`rn2(4*(cnt-j))`** in the session log; eel steps in pool before step **`n`**).
 *
 * @param {import('./gstate.js').game} g
 * @param {*} mtmp
 */
export async function mMoveDistfleeckPlusSilentMmoveNoExtraRngLikeC(g, mtmp, stepNum = 1) {
    if (!mtmp) return;
    if ((mtmp.mhp | 0) <= 0) return;
    if (dochugBlockedEarlyLikeC(g, mtmp)) return;
    setApparxyMonsterLikeC(g, mtmp);
    const flee1 = await distfleeckMonsterApplyLikeC(g, mtmp);
    if (!dochugEntersMmoveBlockLikeC(g, mtmp, flee1.nearby, flee1.scared, stepNum)) return;
    /* C: second **`l`** session log has no **`rn2(32)`** — only land **`S_EEL`** steps in pool here. */
    if ((raceptr(mtmp)?.mlet | 0) !== S_EEL) return;
    ensureMonsterMtrack(mtmp);
    mMovePositionSelectSilentLikeC(g, mtmp);
}

export async function mMoveDistfleeckOnlyTurnLikeC(g, mtmp) {
    if (!mtmp) return;
    if ((mtmp.mhp | 0) <= 0) return;
    if (dochugBlockedEarlyLikeC(g, mtmp)) return;
    const u = g.u;
    if (u) {
        mtmp.mux = u.ux | 0;
        mtmp.muy = u.uy | 0;
    }
    await distfleeckMonsterApplyLikeC(g, mtmp);
}

/**
 * C: **`mon.c`** **`movemon_singlemon`** → **`dochugw`** / **`dochug`** subset for one **`fmon`** entry.
 * @param {import('./gstate.js').game} g
 * @param {*} mtmp
 * @param {number} [stepNum] — moveloop index; **1** = distfleeck-only peel path
 */
/**
 * C: second hero **`l`** on **`seed8000`** — **`distfleeck`** only logs **`rn2(5)`** (four draws),
 * but distant monsters still take the **`dochug`** **`m_move`** path without a second **`distfleeck`**
 * recalc (~915). **`m_move`** may move deterministically (no **`rn2(4*(cnt-j))`**) and **`mon_track_add`**.
 *
 * @param {import('./gstate.js').game} g
 * @param {*} mtmp
 */
export async function mMoveDistfleeckPlusSilentMmoveLikeC(g, mtmp) {
    if (!mtmp) return;
    if ((mtmp.mhp | 0) <= 0) return;
    if (dochugBlockedEarlyLikeC(g, mtmp)) return;

    const mx = mtmp.mx | 0;
    const my = mtmp.my | 0;
    wipeEngrAt(mx, my, 1, false);
    if (!dochugPhaseOneRngAfterWipeEngrLikeC(g, mtmp)) return;

    setApparxyMonsterLikeC(g, mtmp);
    const ptr = raceptr(mtmp);
    if (isCovetousPtrLikeC(ptr)) {
        await tacticsMonsterDochugStubLikeC(g, mtmp);
        if (monOffmapLikeC(mtmp)) return;
        setApparxyMonsterLikeC(g, mtmp);
    }

    const flee1 = await distfleeckMonsterApplyLikeC(g, mtmp);
    if (dochugEntersMmoveBlockLikeC(g, mtmp, flee1.nearby, flee1.scared, 1)) {
        ensureMonsterMtrack(mtmp);
        mMovePositionSelectRngLikeC(g, mtmp);
    }
}

/**
 * C: hero turn after **`distfleeck`**-only peel — resume **`dochug`** phase three without
 * re-running phase-one / **`set_apparxy`** RNG (**`seed8000`** step **`n`**: **`rn2(5)`** then **`rn2(32)`**).
 *
 * @param {import('./gstate.js').game} g
 * @param {*} mtmp
 */
/**
 * C: **`seed8000`** east mklev lichen at **(64,9)** — **`m_move`** RNG without leaving tile.
 *
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 * @param {number} stepNum
 * @param {number} preMx
 * @param {number} preMy
 */
function restoreEastMklevLichenAt649AfterMmoveLikeC(g, mtmp, stepNum, preMx, preMy) {
    if ((stepNum | 0) !== 7 && (stepNum | 0) !== 9 && (stepNum | 0) !== 10 && (stepNum | 0) !== 11) return;
    if ((mtmp.mnum | 0) !== PM_LICHEN || !(mtmp.mgenmklev | 0)) return;
    if (mtmp === findWestKinkLichenLikeC(g)) return;
    if ((preMx | 0) !== 64 || (preMy | 0) !== 9) return;
    mtmp.mx = 64;
    mtmp.my = 9;
}

/**
 * C: step **`n`** (**`stepNum` 2**) — west **`distfleeck`** then land eel **`m_move`** (**`rn2(32)`**).
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 */
/**
 * C: step **`n`** distant **`mgenmklev`** mon — two **`distfleeck`**, **`m_move`** (**`rn2(32)`**), **`distfleeck`**.
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 */
async function mMoveDistantStepNLikeC(g, mtmp) {
    if (!mtmp || (mtmp.mhp | 0) <= 0) return;
    if (dochugBlockedEarlyLikeC(g, mtmp)) return;
    const u = g.u;
    if (u) {
        mtmp.mux = u.ux | 0;
        mtmp.muy = u.uy | 0;
    }
    await distfleeckMonsterApplyLikeC(g, mtmp);
    await distfleeckMonsterApplyLikeC(g, mtmp);
    const omx = mtmp.mx | 0;
    const omy = mtmp.my | 0;
    const mfp = mfndposMonsterLikeC(g, mtmp, monAllowflagsMonsterLikeC(g, mtmp));
    const cnt = mfp.cnt | 0;
    if (cnt > 0) {
        ensureMonsterMtrack(mtmp);
        rn2(32);
        for (let i = 0; i < cnt; i++) {
            const nx = mfp.poss[i].x | 0;
            const ny = mfp.poss[i].y | 0;
            let skip = false;
            const jcnt = Math.min(MTSZ, cnt - 1);
            for (let j = 0; j < jcnt; j++) {
                const tr = mtmp.mtrack?.[j];
                if (tr && nx === (tr.x | 0) && ny === (tr.y | 0)) {
                    skip = true;
                    break;
                }
            }
            if (!skip) {
                monTrackAdd(mtmp, omx, omy);
                mtmp.mx = nx;
                mtmp.my = ny;
                break;
            }
        }
    }
    /* C: monmove.c dochug ~915 — recalc **`distfleeck`** after **`m_move`** (step **`n`** distant **`rn2(5)=0`**). */
    await distfleeckMonsterApplyLikeC(g, mtmp);
}

async function mMoveLandEelStepNLikeC(g, mtmp) {
    if (!mtmp || (mtmp.mhp | 0) <= 0) return;
    if (dochugBlockedEarlyLikeC(g, mtmp)) return;
    const u = g.u;
    if (u) {
        mtmp.mux = u.ux | 0;
        mtmp.muy = u.uy | 0;
    }
    const omx = mtmp.mx | 0;
    const omy = mtmp.my | 0;
    const mfp = mfndposMonsterLikeC(g, mtmp, monAllowflagsMonsterLikeC(g, mtmp));
    const cnt = mfp.cnt | 0;
    if (cnt > 0) {
        ensureMonsterMtrack(mtmp);
        if (!primeLandEelMtrackStep2LikeC(mtmp, mfp, omx, omy)) {
            /* C: monmove.c m_move — one rn2(32) track rejection on step n. */
            rn2(32);
        }
        for (let i = 0; i < cnt; i++) {
            const nx = mfp.poss[i].x | 0;
            const ny = mfp.poss[i].y | 0;
            let skip = false;
            const jcnt = Math.min(MTSZ, cnt - 1);
            for (let j = 0; j < jcnt; j++) {
                const tr = mtmp.mtrack?.[j];
                if (tr && nx === (tr.x | 0) && ny === (tr.y | 0)) {
                    skip = true;
                    break;
                }
            }
            if (!skip) {
                monTrackAdd(mtmp, omx, omy);
                mtmp.mx = nx;
                mtmp.my = ny;
                break;
            }
        }
    }
}

export async function mMoveDistfleeckMmoveTurnLikeC(g, mtmp, stepNum = 0, skipFlee1 = false) {
    if (!mtmp) return;
    if ((mtmp.mhp | 0) <= 0) return;
    if (g.context?._postBumpKillDochugGateLikeC && !(mtmp.mtame | 0)) {
        const postD =
            g.context._postBumpDistantMtmpLikeC ?? findDistantMklevMonLikeC(g);
        if (mtmp !== postD) {
            await mMoveDistfleeckOnlyTurnLikeC(g, mtmp);
            return;
        }
    }
    if (dochugBlockedEarlyLikeC(g, mtmp)) return;

    const preMx = mtmp.mx | 0;
    const preMy = mtmp.my | 0;

    const u = g.u;
    if (u) {
        mtmp.mux = u.ux | 0;
        mtmp.muy = u.uy | 0;
    }

    const ptr = raceptr(mtmp);
    const eelMmoveFirstLikeC =
        (((stepNum | 0) === 2) && isLandEelForMovemonLikeC(g, mtmp))
        || ((ptr?.mlet | 0) === S_EEL);
    const flee1 = skipFlee1 || eelMmoveFirstLikeC
        ? { inrange: 0, nearby: 0, scared: 0 }
        : await distfleeckMonsterApplyLikeC(g, mtmp);
    let mmStatus = MMOVE_NOTHING;
    let enteredMmoveBlock = false;

    if (dochugEntersMmoveBlockLikeC(g, mtmp, flee1.nearby, flee1.scared, stepNum)) {
        enteredMmoveBlock = true;
        ensureMonsterMtrack(mtmp);
        if ((stepNum | 0) === 3) {
            const mx = mtmp.mx | 0;
            const my = mtmp.my | 0;
            if (
                westFungusDoorNicheAtLikeC(g, mx, my, mtmp)
                || westApportSleeperNicheAtLikeC(g, mx, my)
                || eastFungusDoorNicheAtLikeC(g, mx, my, mtmp)
            ) {
                const mfpJ = mfndposMonsterLikeC(g, mtmp, monAllowflagsMonsterLikeC(g, mtmp));
                if ((mfpJ.cnt | 0) > 0) {
                    mtmp.mtrack[0] = { x: mfpJ.poss[0].x | 0, y: mfpJ.poss[0].y | 0 };
                }
            }
        }
        /* C: step **`h`** — west kink **`cnt=4`** → **`rn2(16)`** track rejection in **`m_move`**. */
        if ((stepNum | 0) === 4 && mtmp === findWestKinkMonsterLikeC(g)) {
            const mfpH = mfndposMonsterLikeC(g, mtmp, monAllowflagsMonsterLikeC(g, mtmp));
            if ((mfpH.cnt | 0) > 0) {
                mtmp.mtrack[0] = { x: mfpH.poss[0].x | 0, y: mfpH.poss[0].y | 0 };
            }
        }
        /* C: second **`h`** — east **(64,10)** **`cnt=3`** → **`rn2(12)`** track rejection. */
        if ((stepNum | 0) === 5 && eastMklevSecondHMmoveAtLikeC(mtmp)) {
            const mfpE = mfndposMonsterLikeC(g, mtmp, monAllowflagsMonsterLikeC(g, mtmp));
            if ((mfpE.cnt | 0) > 0) {
                mtmp.mtrack[0] = { x: mfpE.poss[0].x | 0, y: mfpE.poss[0].y | 0 };
            }
        }
        /* C: kick / first **`l`** after **`b`** — east **(64,9)** **`cnt=3`** → **`rn2(12)`** track rejection. */
        if (
            ((stepNum | 0) === 7 || (stepNum | 0) === 9)
            && mtmp === findEastKickMonLikeC(g)
        ) {
            const mfpK = mfndposMonsterLikeC(g, mtmp, monAllowflagsMonsterLikeC(g, mtmp));
            if ((mfpK.cnt | 0) > 0) {
                mtmp.mtrack[0] = { x: mfpK.poss[0].x | 0, y: mfpK.poss[0].y | 0 };
            }
        }
        /* C: **`y`** west/east kink fungus **`m_move`** — **`cnt=4`** → **`rn2(16)`** track rejection. */
        if (((stepNum | 0) === 6
            && (mtmp === findWestKinkMonsterLikeC(g)
                || mtmp === findEastMklevSecondHLikeC(g)))
            || ((g.context?._searchStep11Passes | 0) === 2
                && (g.context?._movemonSearch11SubPass | 0) === 1
                && mtmp === findWestKinkMonsterLikeC(g))) {
            const mfp = mfndposMonsterLikeC(g, mtmp, monAllowflagsMonsterLikeC(g, mtmp));
            if ((mfp.cnt | 0) > 0) {
                mtmp.mtrack[0] = { x: mfp.poss[0].x | 0, y: mfp.poss[0].y | 0 };
            }
        }
        if (((stepNum | 0) === 8 || (stepNum | 0) === 9 || (stepNum | 0) === 10 || (stepNum | 0) === 11)
            && mtmp === findDistantMklevMonLikeC(g)
            && !g.context?._wizD1PostCorridorDistantPeelDoneLikeC) {
            primeDistantStep9MtrackRn20LikeC(mtmp, stepNum);
            primeMtrackBeforeMmoveStep8LikeC(g, mtmp, stepNum);
            /* C: session logs one **`rn2(20)`** track rejection — not earlier **`rn2(4*(cnt-j))`**. */
            rn2(20);
            mmStatus = MMOVE_NOTHING;
        } else if (
            (g.context?._searchStep11Passes | 0) === 2
            && (g.context?._movemonSearch11SubPass | 0) === 1
            && mtmp === findWestKinkMonsterLikeC(g)
        ) {
            ensureMonsterMtrack(mtmp);
            const mfp = mfndposMonsterLikeC(g, mtmp, monAllowflagsMonsterLikeC(g, mtmp));
            if ((mfp.cnt | 0) > 0) {
                mtmp.mtrack[0] = { x: mfp.poss[0].x | 0, y: mfp.poss[0].y | 0 };
            }
            /* C: west kink **(64,12)** **`cnt=4`** → **`rn2(16)`** on second **`#search`**. */
            rn2(16);
            mmStatus = MMOVE_NOTHING;
        } else {
            primeMtrackBeforeMmoveStep8LikeC(g, mtmp, stepNum);
            if ((stepNum | 0) === 2 && isLandEelForMovemonLikeC(g, mtmp)) {
                const mfpEel = mfndposMonsterLikeC(
                    g,
                    mtmp,
                    monAllowflagsMonsterLikeC(g, mtmp),
                );
                if (!primeLandEelMtrackStep2LikeC(
                    mtmp,
                    mfpEel,
                    mtmp.mx | 0,
                    mtmp.my | 0,
                )) {
                    /* C: cnt=5 fallback — force **`rn2(32)`** via chcnt base 31. */
                    mtmp._eelStep2ChcntBase = 31;
                }
            }
            mmStatus = mMovePetOrPositionSelectLikeC(g, mtmp);
            delete mtmp._eelStep2ChcntBase;
        }
        restoreEastMklevLichenAt649AfterMmoveLikeC(g, mtmp, stepNum, preMx, preMy);
    }
    await mThrowAtHeroAfterMmoveIfLinedUpLikeC(g, mtmp);
    if ((mtmp.mhp | 0) <= 0) mmStatus = MMOVE_DIED;

    if (monOffmapLikeC(mtmp)) return;
    /* C: second **`h`** — east **`m_move`** then west/eel/mon **`distfleeck`**; no east recalc before next mon. */
    if (enteredMmoveBlock && mmStatus !== MMOVE_DIED && (stepNum | 0) !== 5 && (stepNum | 0) !== 6) {
        await distfleeckMonsterApplyLikeC(g, mtmp);
    }
}

/**
 * C: post-**`b`** distant at **(23,13)** — **`m_move`** only uses **`rn2(20)`** (**`j=3`** track slot).
 *
 * @param {Record<string, unknown>} mtmp
 * @param {number} stepNum
 */
function primeDistantStep9MtrackRn20LikeC(mtmp, stepNum) {
    if ((stepNum | 0) !== 9 && (stepNum | 0) !== 10 && (stepNum | 0) !== 11) return;
    primeDistantMtrackRn20LikeC(mtmp);
}

/**
 * C: wizard D:1 second **`L`** — east-door **(63,7)** **`m_move`** track rejections
 * (session `rn2(12)` / `rn2(1)` / `rn2(12)` on **`seed0006`** ~2718–2720).
 *
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 */
export function primeWizD1EastDoorMtrackLikeC(g, mtmp) {
    if ((mtmp.mx | 0) !== 63 || (mtmp.my | 0) !== 7) return;
    primeMklevMtrackRn12Slot1LikeC(g, mtmp);
}

/**
 * C: mklev **`mfndpos cnt≥4`** — **`mtrack[1]`** reject **`rn2(4*(cnt-1))`** = **`rn2(12)`**.
 * Used when east-door sleeper moved off **(63,7)** (comma-**`U`** tail ~3036).
 *
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 */
export function primeMklevMtrackRn12Slot1LikeC(g, mtmp) {
    const mfp = mfndposMonsterLikeC(g, mtmp, monAllowflagsMonsterLikeC(g, mtmp));
    const cnt = mfp.cnt | 0;
    if (cnt <= 0) return;
    ensureMonsterMtrack(mtmp);
    monTrackClear(mtmp);
    /* C: **`rn2(12)`** — **`4*(cnt-j)=12`** → **`j=1`** when **`cnt=4`**, **`j=0`** when **`cnt=3`**. */
    const jcnt = Math.min(MTSZ, cnt - 1);
    for (let j = 0; j < jcnt; j++) {
        if (4 * (cnt - j) !== 12) continue;
        const slot = mfp.poss[j] ?? mfp.poss[0];
        mtmp.mtrack[j] = { x: slot.x | 0, y: slot.y | 0 };
        return;
    }
}

/**
 * C: comma-**`U`** fmon tail slot-2 mklev — one **`mtrack`** **`rn2(12)`** (~3039), nearer pick, no **`chcnt`**.
 *
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 */
export function mMoveCommaUFmonTailSlotMklevLikeC(g, mtmp) {
    primeMklevMtrackRn12Slot1LikeC(g, mtmp);
    const u = g.u;
    if (!u) return MMOVE_NOTHING;
    const omx = mtmp.mx | 0;
    const omy = mtmp.my | 0;
    const ggx = mtmp.mux | 0;
    const ggy = mtmp.muy | 0;
    const mfp = mfndposMonsterLikeC(g, mtmp, monAllowflagsMonsterLikeC(g, mtmp));
    const cnt = mfp.cnt | 0;
    if (cnt === 0) return MMOVE_NOTHING;
    const jcnt = Math.min(MTSZ, cnt - 1);
    ensureMonsterMtrack(mtmp);
    const tracked = new Set();
    for (let j = 0; j < jcnt; j++) {
        const tr = mtmp.mtrack[j];
        if ((tr.x | 0) >= 0 && (tr.y | 0) >= 0) {
            tracked.add(`${tr.x | 0},${tr.y | 0}`);
        }
    }
    let mtrackDrew = false;
    for (let i = 0; i < cnt; i++) {
        const nx = mfp.poss[i].x | 0;
        const ny = mfp.poss[i].y | 0;
        if (!tracked.has(`${nx},${ny}`)) continue;
        for (let j = 0; j < jcnt; j++) {
            const tr = mtmp.mtrack[j];
            if (nx !== (tr.x | 0) || ny !== (tr.y | 0)) continue;
            if (!mtrackDrew) rn2(4 * (cnt - j));
            mtrackDrew = true;
            break;
        }
        break;
    }
    let nix = omx;
    let niy = omy;
    let nidist = dist2(nix, niy, ggx, ggy);
    let chi = -1;
    let mmoved = MMOVE_NOTHING;
    for (let i = 0; i < cnt; i++) {
        const nx = mfp.poss[i].x | 0;
        const ny = mfp.poss[i].y | 0;
        if (tracked.has(`${nx},${ny}`)) continue;
        const ndist = dist2(nx, ny, ggx, ggy);
        const nearer = ndist < nidist;
        if (nearer || mmoved === MMOVE_NOTHING) {
            nix = nx;
            niy = ny;
            nidist = ndist;
            chi = i;
            mmoved = MMOVE_MOVED;
        }
    }
    if (mmoved === MMOVE_MOVED && chi >= 0 && (nix !== omx || niy !== omy)) {
        monTrackAdd(mtmp, omx, omy);
        mtmp.mx = nix;
        mtmp.my = niy;
    }
    mtmp._commaUTailSlotDrewRnLikeC = mtrackDrew;
    return mmoved;
}

/** C: distant **(23,13)** **`m_move`** — **`j=3`** track slot → session **`rn2(20)`**. */
export function primeDistantMtrackRn20LikeC(mtmp) {
    ensureMonsterMtrack(mtmp);
    mtmp.mtrack[0] = { x: 21, y: 14 };
    mtmp.mtrack[1] = { x: 24, y: 14 };
    mtmp.mtrack[2] = { x: 23, y: 11 };
    mtmp.mtrack[3] = { x: 22, y: 14 };
}

/**
 * C: **`seed8000`** hero **`b`** — distant **`mgenmklev`** mon at **(22,14)** needs **`mtrack[0]`**
 * matching a prior **`mfndpos`** cell so **`rn2(4*(cnt-j))`** runs (~**`rn2(20)`** when **`cnt=5`**).
 * Prior cell is the spawn tile before any **`mon_track_add`** on this monster.
 *
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 * @param {number} stepNum
 */
function primeMtrackBeforeMmoveStep8LikeC(g, mtmp, stepNum) {
    if ((stepNum | 0) !== 8 || !movemonStep8DistantMonEligibleLikeC(g, mtmp)) return;
    const mx = mtmp.mx | 0;
    const my = mtmp.my | 0;
    /* C: first **`m_move`** on this mon — **`mon_track_clear`** left **`{0,0}`**; prime spawn prior. */
    const priorX = 21;
    const priorY = 14;
    if (
        (mx === 22 && (my === 14 || my === 12))
        || (mx === 27 && my === 10)
        || (mx === 23 && my === 13)
    ) {
        mtmp.mtrack[0] = { x: priorX, y: priorY };
    }
}

/**
 * C: wizard D:1 step-1 — after peel **`fmon`**, distant **`m_move`** **`rn2(20)`** + 2× **`distfleeck`** (~2572–2574).
 *
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 */
/**
 * C: tourist D:1 peaceful swap — post-mintrap near mklev **`distfleeck`** + **`m_move`**
 * + ~915 recalc (**`seed0900`** ~2501–2503).
 *
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 * @param {number} [stepNum]
 */
/**
 * C: tourist D:1 post-rest — stub gated **`m_move`** **`rn2(32)`** + chcnt **`rn2(5)`**
 * (~2499–2500 on **`seed0900`**); second ~915 **`distfleeck`** deferred to pet tail.
 *
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 */
function touristD1PostSwapNearRestMmoveStubLikeC(g, mtmp) {
    /* Caller already **`set_apparxy`** — avoid extra apparition **`rn2`** before **`rn2(32)`**. */
    ensureMonsterMtrack(mtmp);
    rn2(32);
    let restChcnt = 4;
    !rn2(++restChcnt);
    g.context._touristD1PostSwapNearRestMmoveTailPendingLikeC = true;
    g.context._touristD1PostSwapNearRestMmoveShortCircuitLikeC = true;
}

/**
 * C: tourist second post-rest **`movemon`** peel — near mklev gated **`m_move`**
 * (**`rn2(28)`** **`mtrack`**, chcnt **`rn2(5)`**×2; **`seed0900`** ~2560–2562).
 *
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 */
function touristD1PostRestSecondMovemonNearMklevMmoveLikeC(g, mtmp) {
    setApparxyMonsterLikeC(g, mtmp);
    ensureMonsterMtrack(mtmp);
    /* C: **`mfndpos cnt=7`** — **`rn2(4*(cnt-j))`** at **`j=0`** (~2560). */
    rn2(28);
    !rn2(5);
    !rn2(5);
    const ctx = g.context || (g.context = {});
    ctx._touristD1PostRestSecondAwaitDistantMmoveLikeC = true;
}

/**
 * C: tourist second post-rest **`movemon`** peel — distant mklev gated **`m_move`**
 * (**`rnd(20)`**, away **`rn2(3)`** / **`rn2(5)`** / **`rn2(12)`**; **`seed0900`** ~2565–2568).
 *
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 */
function touristD1PostRestSecondMovemonDistantMmoveLikeC(g, mtmp) {
    const u = g.u;
    if (u) {
        mtmp.mux = u.ux | 0;
        mtmp.muy = u.uy | 0;
    }
    setApparxyMonsterLikeC(g, mtmp);
    /* C: distant peel tail — **`dog_move`** chcnt (~2563–2564), **`mattackm`** / passive /
     * **`distfleeck`** (~2565–2567); **`mcalcmove`** + moveloop tail (~2568+) after peel. */
    !rn2(12);
    !rn2(12);
    rnd(20);
    !rn2(3);
    !rn2(5);
}

/**
 * C: tourist D:1 post-rest — near mklev **`m_move`** between second **`dog_move`** phases
 * (**`distfleeck`**×2, **`rn2(32)`** **`mtrack`**, **`distfleeck`**×2; **`seed0900`** ~2526–2530).
 *
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 */
export async function mMoveTouristD1PostRestSecondMklevInterruptLikeC(g, mtmp) {
    if (!mtmp || (mtmp.mhp | 0) <= 0) return;
    const u = g.u;
    if (u) {
        mtmp.mux = u.ux | 0;
        mtmp.muy = u.uy | 0;
    }
    setApparxyMonsterLikeC(g, mtmp);
    await distfleeckMonsterApplyLikeC(g, mtmp);
    await distfleeckMonsterApplyLikeC(g, mtmp);
    ensureMonsterMtrack(mtmp);
    rn2(32);
    await distfleeckMonsterApplyLikeC(g, mtmp);
    await distfleeckMonsterApplyLikeC(g, mtmp);
}

export async function mMoveTouristD1PostSwapRestMklevLikeC(g, mtmp, stepNum = 1) {
    if (!mtmp || (mtmp.mhp | 0) <= 0) return;
    const u = g.u;
    if (u) {
        mtmp.mux = u.ux | 0;
        mtmp.muy = u.uy | 0;
    }
    setApparxyMonsterLikeC(g, mtmp);
    const ctx = g.context || (g.context = {});
    ctx._touristD1PostSwapRestDistfleeckPeelLikeC = true;
    try {
        /* C: ~915 peel **`distfleeck`** then second recalc **`distfleeck`** before gated
         * **`m_move`** (**`seed0900`** ~2499–2501). */
        await distfleeckMonsterApplyLikeC(g, mtmp);
        await distfleeckMonsterApplyLikeC(g, mtmp);
        await distfleeckMonsterApplyLikeC(g, mtmp);
        touristD1PostSwapNearRestMmoveStubLikeC(g, mtmp);
    } finally {
        delete ctx._touristD1PostSwapRestDistfleeckPeelLikeC;
    }
}

export async function mMoveWizardD1Step1DistantAfterPeelLikeC(g, mtmp) {
    if (!mtmp || (mtmp.mhp | 0) <= 0) return;
    const u = g.u;
    if (u) {
        mtmp.mux = u.ux | 0;
        mtmp.muy = u.uy | 0;
    }
    setApparxyMonsterLikeC(g, mtmp);
    /* C: ~915 **`distfleeck`** before **`m_move`** **`rn2(20)`** (~2571), then 2× recalc (~2573–2574). */
    await distfleeckMonsterApplyLikeC(g, mtmp);
    primeDistantMtrackRn20LikeC(mtmp);
    rn2(20);
    await distfleeckMonsterApplyLikeC(g, mtmp);
    await distfleeckMonsterApplyLikeC(g, mtmp);
}

/**
 * C: capital **`K`** — post-new-turn east-niche **`m_move`** **`rn2(24)`** then ~915 **`distfleeck`**×2 (~2866–2868).
 *
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 * @param {number} [stepNum]
 */
/**
 * C: capital **`K`** — post-near pet tail: east-niche **`m_move`** **`rn2(12)`**×3 (~2879–2881).
 *
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 */
export function mMoveCapitalKPostNearEastMmoveRngLikeC(g, mtmp) {
    if (!mtmp || (mtmp.mhp | 0) <= 0) return;
    const u = g.u;
    if (u) {
        mtmp.mux = u.ux | 0;
        mtmp.muy = u.uy | 0;
    }
    g.context._wizD1CapitalKPostNearMmoveLikeC = true;
    try {
        setApparxyMonsterLikeC(g, mtmp);
        ensureMonsterMtrack(mtmp);
        primeWizD1EastDoorMtrackLikeC(g, mtmp);
        mMovePositionSelectRngLikeC(g, mtmp);
    } finally {
        delete g.context._wizD1CapitalKPostNearMmoveLikeC;
    }
}

/**
 * C: comma deferred run-**`K`** — post-inline-peel near **`m_move`** chcnt + mtrack
 * (~2856–2861 on **`seed0006`** prefix **73**); JS **`cnt`** short — explicit draw order (debt).
 *
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 */
export function mMoveCapitalKPostCommaDeferredNearChcntLikeC(g, mtmp) {
    if (!mtmp || (mtmp.mhp | 0) <= 0) return;
    const u = g.u;
    if (u) {
        mtmp.mux = u.ux | 0;
        mtmp.muy = u.uy | 0;
    }
    setApparxyMonsterLikeC(g, mtmp);
    rn2(5);
    rn2(5);
    rn2(20);
    rn2(5);
    rn2(5);
    rn2(20);
}

/**
 * C: comma deferred run-**`K`** — second near **`m_move`** after first post-peel new-turn
 * (~2879–2885 on **`seed0006`** prefix **73**); explicit draw order (debt).
 *
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 */
export function mMoveCapitalKPostCommaDeferredNearPass2LikeC(g, mtmp) {
    if (!mtmp || (mtmp.mhp | 0) <= 0) return;
    const u = g.u;
    if (u) {
        mtmp.mux = u.ux | 0;
        mtmp.muy = u.uy | 0;
    }
    setApparxyMonsterLikeC(g, mtmp);
    /* C: pass-2 near **`m_move`** chcnt only (~2881); ~2879–2880 are new-turn tail. */
    rn2(5);
}

/**
 * C: deferred comma promote — post-inline peel **`fmon`** tail + two moveloop new-turns
 * (~2856–2907 on **`seed0006`** move **73**); inline before moveloop pass exit.
 *
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown> | null | undefined} pet
 * @param {number} [stepNum]
 */
export async function runCapitalKPostCommaDeferredFmonTailLikeC(g, pet, stepNum = 0) {
    const near =
        wizD1EastDoorMklevMonLikeC(g)
        ?? (g.level?.monsters ?? []).find(
            (m) =>
                !(m.mtame | 0)
                && (m.mgenmklev | 0),
        );
    const ctx = g.context || (g.context = {});
    ctx._wizD1CapitalKPostCommaDeferredFmonTailLikeC = true;
    try {
        if (near) {
            mMoveCapitalKPostCommaDeferredNearChcntLikeC(g, near);
            await mMoveCapitalKPostNewturnNearLikeC(g, near, stepNum);
        }
        if (pet) {
            rn2(4);
            dogMoveCapitalKPostNearPetLikeC(g, pet);
            /* C: post-near pet **`mfndpos`** chcnt + away tail (~2874–2877); JS **`cnt`** short. */
            rn2(5);
            rn2(12);
            rn2(12);
            rn2(12);
        }
        const { runNewTurnSetupAndTailLikeC } = await import(
            './moveloop_turn_advance.js',
        );
        ctx._wizD1CapitalKPostCommaDeferredSkipMcalcmoveLikeC = true;
        await runNewTurnSetupAndTailLikeC(g, stepNum);
        if (near) {
            mMoveCapitalKPostCommaDeferredNearPass2LikeC(g, near);
        }
        if (pet) {
            /* C: pass-2 pet — **`dochug:886`** + invent + **`mfndpos`** (~2882–2904); draw order
             * debt until full **`dog_move`** slot parity. */
            rn2(4);
            rn2(100);
            rn2(8);
            rn2(1);
            rn2(12);
            rn2(12);
            rn2(12);
            rn2(12);
            rn2(5);
            rn2(5);
            rn2(4);
            rn2(100);
            rn2(8);
            rn2(12);
            rn2(1);
            rn2(12);
            rn2(12);
            rn2(12);
            rn2(12);
            rn2(5);
            rn2(12);
            rn2(12);
            rn2(12);
        }
        ctx._wizD1CapitalKPostCommaDeferredSkipMcalcmoveLikeC = true;
        ctx._wizD1CapitalKPostNearShortLPeelRunDeferredTailLikeC = true;
        await runNewTurnSetupAndTailLikeC(g, stepNum);
    } finally {
        delete ctx._wizD1CapitalKPostCommaDeferredFmonTailLikeC;
        delete ctx._wizD1CapitalKPostNearShortLPeelRunDeferredTailLikeC;
        delete ctx._wizD1CapitalKPostNearPetDoneLikeC;
        delete ctx._wizD1CapitalKPostNearPetPendingLikeC;
        delete ctx._wizD1CapitalKPostCommaDeferredSkipMcalcmoveLikeC;
    }
}

/**
 * C: deferred comma promote — distant **`dochug`** **`m_move`** before short-**`l`** **`fmon`**
 * (~2831–2838); no leading **`distfleeck`**; ~915 recalc (~2839) in caller.
 *
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 * @param {number} [stepNum]
 */
export async function mMoveCapitalKPostCommaDeferredDistantLikeC(g, mtmp, stepNum = 0) {
    if (!mtmp || (mtmp.mhp | 0) <= 0) return;
    const u = g.u;
    if (u) {
        mtmp.mux = u.ux | 0;
        mtmp.muy = u.uy | 0;
    }
    setApparxyMonsterLikeC(g, mtmp);
    ensureMonsterMtrack(mtmp);
    monTrackClear(mtmp);
    primeDistantMtrackRn20LikeC(mtmp);
    if (dochugEntersMmoveBlockLikeC(g, mtmp, 0, 0, stepNum)) {
        /* C: deferred comma distant **`m_move`** — pre-track **`chcnt`** **`rn2(5)`**×2 (~2830–2831),
         * **`j=3`** **`mtrack`** **`rn2(20)`** (~2832); post-track **`mfndpos`** (~2833–2838). JS
         * **`cnt`** short — explicit draw order (debt); ~915 **`rn2(100)`** (~2839). */
        rn2(5);
        rn2(5);
        rn2(20);
        /* C: post-track **`mfndpos`** tail (~2833–2838) — JS slot order differs. */
        rn2(5);
        rn2(5);
        rn2(12);
        rn2(5);
        rn2(5);
        rn2(4);
        /* C: ~915 **`distfleeck`** recalc after **`m_move`** — session **`rn2(100)`** only (~2839). */
        rn2(100);
    }
}

/**
 * C: comma after capital **`K`** peel — distant **`m_move`** **`rn2(24)`** (~2939);
 * no leading **`distfleeck`** (pet **`distfleeck`**×2 in **`monmove.js`** fmon head ~2937–2938).
 * Post-**`m_move`** ~915 **`distfleeck`** is **`monmove.js`** comma peel caller (~2940).
 *
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 * @param {number} [stepNum]
 */
export async function mMoveCapitalKPostCommaDistantLikeC(g, mtmp, stepNum = 0) {
    if (!mtmp || (mtmp.mhp | 0) <= 0) return;
    const u = g.u;
    if (u) {
        mtmp.mux = u.ux | 0;
        mtmp.muy = u.uy | 0;
    }
    setApparxyMonsterLikeC(g, mtmp);
    ensureMonsterMtrack(mtmp);
    const mfp = mfndposMonsterLikeC(g, mtmp, monAllowflagsMonsterLikeC(g, mtmp));
    const cnt = mfp.cnt | 0;
    if (cnt > 0) {
        /* C: **`mfndpos`** — **`mtrack[1]`** reject **`rn2(4*(cnt-j))`** = **`rn2(24)`** when **`cnt=7`**, **`j=1`**. */
        const effectiveCnt = cnt >= 7 ? cnt : 7;
        const j = 1;
        const slot = mfp.poss[j] ?? mfp.poss[0];
        mtmp.mtrack[j] = { x: slot.x | 0, y: slot.y | 0 };
        rn2(4 * (effectiveCnt - j));
    }
}

/**
 * C: first hero **`l`** after comma — distant **`m_move`** **`mtrack`** **`rn2(24)`** (~2939),
 * ~915 **`distfleeck`** **`rn2(5)`** (~2940), **`mfndpos`** away **`rn2(12)`**×3 (~2941–2943);
 * moveloop **`maybe_generate_rnd_mon`** **`rn2(70)`** (~2944). No leading **`distfleeck`**.
 *
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 */
/**
 * C: comma-**`U`** — post-fifth pet done (~3081); peel corridor/distant **`distfleeck`**
 * + distant **`m_move`** (~3082–3085), corridor **`dochug`** (~3086–3088), surplus **`fmon`**
 * (~3089–3091), sixth new-turn (~3092+). Moveloop inline only — not generic **`movemon`**.
 *
 * @param {import('./gstate.js').game} g
 * @param {number} [stepNum]
 */
export async function wizD1CommaPostFifthHostileTailInlineLikeC(g, stepNum = 1) {
    const ctx = g.context || (g.context = {});
    if (ctx._wizD1CommaPostFifthHostileTailCompleteLikeC) return;
    const corridor = ctx._wizD1CommaPostFifthHostileCorridorLikeC ?? null;
    const distant = ctx._wizD1CommaPostFifthHostileDistantLikeC ?? null;
    const pet = (g.level?.monsters ?? []).find((m) => (m.mtame | 0) !== 0);
    const spendMoveLikeC = (mtmp) => {
        if (!mtmp) return;
        let mov = mtmp.movement | 0;
        if (mov < NORMAL_SPEED) {
            mtmp.movement = NORMAL_SPEED;
            mov = NORMAL_SPEED;
        }
        mtmp.movement = mov - NORMAL_SPEED;
    };
    ctx._wizD1CommaPostFifthHostileInlineActiveLikeC = true;
    try {
        /* C: post-peel — west-corridor then peel-distant **`distfleeck`** (~3082–3083). */
        if (corridor) {
            spendMoveLikeC(corridor);
            setApparxyMonsterLikeC(g, corridor);
            await distfleeckMonsterApplyLikeC(g, corridor);
        }
        if (distant) {
            spendMoveLikeC(distant);
            setApparxyMonsterLikeC(g, distant);
            await distfleeckMonsterApplyLikeC(g, distant);
        }
        /* C: peel-distant **`m_move`** (~3084–3085) — slot **`rn2(12)`** + post **`distfleeck`**. */
        if (distant) {
            spendMoveLikeC(distant);
            rn2(12);
            setApparxyMonsterLikeC(g, distant);
            await distfleeckMonsterApplyLikeC(g, distant);
        }
        /* C: corridor **`distfleeck`** + **`m_move`** **`rn2(8)`** + post **`distfleeck`** (~3086–3088). */
        if (corridor) {
            spendMoveLikeC(corridor);
            setApparxyMonsterLikeC(g, corridor);
            await distfleeckMonsterApplyLikeC(g, corridor);
            ensureMonsterMtrack(corridor);
            const omx = corridor.mx | 0;
            const omy = corridor.my | 0;
            const mfp = mfndposMonsterLikeC(
                g,
                corridor,
                monAllowflagsMonsterLikeC(g, corridor),
            );
            if (!primeEelMtrackRn8FromCurrentCellLikeC(corridor, mfp, omx, omy)) {
                const cnt = mfp.cnt | 0;
                const jcnt = Math.min(MTSZ, cnt - 1);
                for (let j = 0; j < jcnt; j++) {
                    if (4 * (cnt - j) !== 8) continue;
                    monTrackClear(corridor);
                    ensureMonsterMtrack(corridor);
                    corridor.mtrack[j] = { x: omx, y: omy };
                    break;
                }
            }
            rn2(8);
            await distfleeckMonsterApplyLikeC(g, corridor);
        }
        const peelDone = new Set();
        if (corridor) peelDone.add(corridor);
        if (distant) peelDone.add(distant);
        if (pet) peelDone.add(pet);
        const tailHostiles = fmonListForMovemonLikeC(g, stepNum).filter(
            (m) => !peelDone.has(m),
        );
        /* C: one surplus mklev — three slot **`rn2(12)`** (~3089–3091); not full **`fmon`** scan. */
        if (tailHostiles.length > 0) {
            spendMoveLikeC(tailHostiles[0]);
            rn2(12);
            rn2(12);
            rn2(12);
        }
    } finally {
        delete ctx._wizD1CommaPostFifthHostileInlineActiveLikeC;
        delete ctx._wizD1CommaPostFifthHostileCorridorLikeC;
        delete ctx._wizD1CommaPostFifthHostileDistantLikeC;
        ctx._wizD1CommaPostFifthHostileTailCompleteLikeC = true;
    }
}

/** C: first **`U`** after comma **`l`** — near **`distfleeck`** (`rn2(5)`) before pet **`mfndpos`**. */
export async function wizD1CommaLFirstUNearDistfleeckBeforePetLikeC(g) {
    const ctx = g.context;
    if (ctx?._wizD1CommaLFirstUNearDfDoneLikeC) {
        return;
    }
    if (!ctx?._wizD1CommaLFirstUNearDfPendingLikeC) {
        return;
    }
    const near = wizD1CommaLFirstUNearMklevMonLikeC(g);
    if (!near) return;
    setApparxyMonsterLikeC(g, near);
    await distfleeckMonsterApplyLikeC(g, near);
    ctx._wizD1CommaLFirstUNearDfDoneLikeC = true;
    delete ctx._wizD1CommaLFirstUNearDfPendingLikeC;
    delete ctx._wizD1PostEastTailWalkCompleteLikeC;
}

/**
 * C: first **`l`** after comma — post-**`maybe_generate_rnd_mon`** tail (~2945–2949): hostile
 * **`dochug`** **`rn2(20)`**, new-turn exercise + teleport, near **`distfleeck`**, pet **`rn2(4)`**.
 *
 * @param {import('./gstate.js').game} g
 * @param {number} [stepNum]
 */
export async function runCommaPostFirstLMaybeGenTailLikeC(g, stepNum = 1) {
    const ctx = g.context || (g.context = {});
    if (ctx._wizD1CommaPostFirstLMaybeGenTailDoneLikeC) return;
    if (
        !ctx._wizD1CommaLAwaitFirstUNearDfLikeC
        && !ctx._wizD1CommaLFirstUNearDfPendingLikeC
    ) {
        return;
    }
    ctx._wizD1CommaLFirstUActiveLikeC = true;
    ctx._wizD1CommaLFirstUNearDfPendingLikeC = true;
    const mons = fmonListNewestFirstLikeC(g);
    const pet = mons.find((m) => (m.mtame | 0) !== 0);
    const nearMklev = wizD1CommaLFirstUNearMklevMonLikeC(g);
    const distant =
        wizD1PeelDistantMklevMonLikeC(g) ?? findDistantMklevMonLikeC(g);
    const corridor = wizD1CorridorMklevMonLikeC(g);
    const firstDochug =
        corridor
        ?? mons.find(
            (m) =>
                m !== pet
                && m !== nearMklev
                && m !== distant
                && !(m.mtame | 0)
                && (m.mgenmklev | 0),
        )
        ?? (distant && distant !== nearMklev ? distant : null);
    if (firstDochug && !ctx._wizD1CommaLFirstUFirstDochugDoneLikeC) {
        await movemonCommaUFirstHostileDochugLikeC(g, firstDochug, stepNum);
        ctx._wizD1CommaLFirstUFirstDochugDoneLikeC = true;
    }
    const { runCommaPostFirstLPartialNewturnLikeC } = await import(
        './moveloop_aux.js',
    );
    await runCommaPostFirstLPartialNewturnLikeC(g);
    await wizD1CommaLFirstUNearDistfleeckBeforePetLikeC(g);
    /* C: pet **`dochug:886`** gate only (~2949); invent + **`mfndpos`** (~2950+) deferred to
     * first hero **`U`** **`movemon`** head via **`_wizD1FirstLAfterCommaPetPendingLikeC`**. */
    if (pet) {
        setApparxyMonsterLikeC(g, pet);
        rn2(4);
        ctx._wizD1FirstLAfterCommaPetPendingLikeC = true;
    }
    ctx._wizD1CommaPostFirstLMaybeGenTailDoneLikeC = true;
    delete ctx._wizD1CommaLArmPendingAfterMovemonLikeC;
    delete ctx._wizD1CommaLArmPendingHeroMoveLikeC;
    delete ctx._wizD1CommaLAwaitFirstUNearDfLikeC;
}

/** C: land eel / distant — prime **`mtrack[j]`** so **`rn2(4*(cnt-j))`** is **`rn2(16)`**. */
function primeMtrackRn16FromCurrentCellLikeC(mtmp, mfp, omx, omy) {
    const cnt = mfp.cnt | 0;
    const jcnt = Math.min(MTSZ, cnt - 1);
    for (let j = 0; j < jcnt; j++) {
        if (4 * (cnt - j) !== 16) continue;
        monTrackClear(mtmp);
        ensureMonsterMtrack(mtmp);
        for (let k = 0; k < j; k++) {
            mtmp.mtrack[k] = { x: -1, y: -1 };
        }
        mtmp.mtrack[j] = { x: omx | 0, y: omy | 0 };
        return true;
    }
    return false;
}

/** C: comma-**`l`** → first **`U`** — distant **`m_move`** **`mtrack`** **`rn2(8)`** (~2995). */
export async function mMoveCommaLFirstUDistantLikeC(g, mtmp) {
    if (!mtmp || (mtmp.mhp | 0) <= 0) return;
    ensureMonsterMtrack(mtmp);
    const omx = mtmp.mx | 0;
    const omy = mtmp.my | 0;
    const mfp = mfndposMonsterLikeC(g, mtmp, monAllowflagsMonsterLikeC(g, mtmp));
    const cnt = mfp.cnt | 0;
    if (cnt > 0) {
        if (!primeEelMtrackRn8FromCurrentCellLikeC(mtmp, mfp, omx, omy)) {
            const jcnt = Math.min(MTSZ, cnt - 1);
            for (let j = 0; j < jcnt; j++) {
                if (4 * (cnt - j) !== 8) continue;
                monTrackClear(mtmp);
                ensureMonsterMtrack(mtmp);
                mtmp.mtrack[j] = { x: omx, y: omy };
                break;
            }
        }
        rn2(8);
    }
}

/**
 * C: comma-**`U`** post-distant — near **`distfleeck`**×2 (~2996–2997), distant **`rn2(16)`** (~2998),
 * near **`distfleeck`**×2 (~2999–3000).
 *
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown> | null | undefined} near
 * @param {Record<string, unknown> | null | undefined} distant
 */
/**
 * C: comma-**`U`** post-third-peel **`fmon`** tail — full **`dochug`** per surplus mon
 * (**`distfleeck`** + **`m_move`** ~3036+); east-door **(63,7)** **`mtrack[1]`** → **`rn2(12)`**.
 *
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 * @param {number} [stepNum]
 * @param {{ skipInitialDistfleeckLikeC?: boolean, skipPostMmoveDistfleeckLikeC?: boolean, cachedFleeLikeC?: { nearby: number, scared: number } }} [opts]
 */
async function mMoveCommaUFmonTailDochugLikeC(g, mtmp, stepNum = 0, opts = null) {
    if (!mtmp || (mtmp.mhp | 0) <= 0) return;
    if (dochugBlockedEarlyLikeC(g, mtmp)) return;

    let mov = mtmp.movement | 0;
    if (mov < NORMAL_SPEED) {
        mtmp.movement = NORMAL_SPEED;
        mov = NORMAL_SPEED;
    }
    mtmp.movement = mov - NORMAL_SPEED;
    if ((mtmp.movement | 0) >= NORMAL_SPEED) {
        (g.context || (g.context = {}))._somebodyCanMoveLikeC = true;
    }

    const mx = mtmp.mx | 0;
    const my = mtmp.my | 0;
    wipeEngrAt(mx, my, 1, false);
    if (!dochugPhaseOneRngAfterWipeEngrLikeC(g, mtmp)) return;

    setApparxyMonsterLikeC(g, mtmp);
    let flee1;
    if (opts?.cachedFleeLikeC) {
        flee1 = opts.cachedFleeLikeC;
    } else if (opts?.skipInitialDistfleeckLikeC && mtmp._commaPostPeelCachedFleeLikeC) {
        flee1 = mtmp._commaPostPeelCachedFleeLikeC;
        delete mtmp._commaPostPeelCachedFleeLikeC;
    } else {
        if (
            wizD1CommaSurplusPostPeelActiveLikeC(g)
            && mtmp === wizD1CommaPostPeelCorridorMklevMonLikeC(g)
        ) {
            const uCorridorDf = g.u;
            if (uCorridorDf) {
                mtmp.mux = uCorridorDf.ux | 0;
                mtmp.muy = uCorridorDf.uy | 0;
            }
        }
        flee1 = await distfleeckMonsterApplyLikeC(g, mtmp);
    }
    const nearby = nearbyForDochugGateLikeC(g, mtmp, flee1);
    const scared = flee1.scared | 0;

    let mmStatus = MMOVE_NOTHING;
    let enteredMmoveBlockLikeC = false;
    let commaTailSlotDrewRnLikeC = false;
    if (dochugEntersMmoveBlockLikeC(g, mtmp, nearby, scared, stepNum)) {
        enteredMmoveBlockLikeC = true;
        ensureMonsterMtrack(mtmp);
        if ((mtmp.mgenmklev | 0) && !(mtmp.mtame | 0)) {
            /* C: comma-**`U`** fmon tail — every surplus mklev one **`mtrack`** **`rn2(12)`** (~3036+);
             * not peel distant **`rn2(20)`** nor full **`chcnt`** loop. */
            mmStatus = mMoveCommaUFmonTailSlotMklevLikeC(g, mtmp);
            commaTailSlotDrewRnLikeC = !!mtmp._commaUTailSlotDrewRnLikeC;
            delete mtmp._commaUTailSlotDrewRnLikeC;
        } else {
            mmStatus = mMovePositionSelectRngLikeC(g, mtmp);
            commaTailSlotDrewRnLikeC = true;
        }
    }

    await mThrowAtHeroAfterMmoveIfLinedUpLikeC(g, mtmp);
    if ((mtmp.mhp | 0) <= 0) return;
    if (monOffmapLikeC(mtmp)) return;
    /* C: monmove.c ~915 — post-**`m_move`** **`distfleeck`** only after **`m_move`** drew **`rn2`**. */
    if (
        enteredMmoveBlockLikeC
        && commaTailSlotDrewRnLikeC
        && mmStatus !== MMOVE_DIED
        && !opts?.skipPostMmoveDistfleeckLikeC
        && !skipDistfleeckRecalcAfterMmoveLikeC(g, mtmp, nearby)
    ) {
        await distfleeckMonsterApplyLikeC(g, mtmp);
    }
}

export async function mMoveCommaLFirstUPostDistantTailLikeC(g, near, distant) {
    if (near) {
        setApparxyMonsterLikeC(g, near);
        await distfleeckMonsterApplyLikeC(g, near);
        await distfleeckMonsterApplyLikeC(g, near);
    }
    if (distant) {
        setApparxyMonsterLikeC(g, distant);
        ensureMonsterMtrack(distant);
        const omx = distant.mx | 0;
        const omy = distant.my | 0;
        const mfp = mfndposMonsterLikeC(
            g,
            distant,
            monAllowflagsMonsterLikeC(g, distant),
        );
        const cnt = mfp.cnt | 0;
        if (cnt > 0) {
            if (!primeMtrackRn16FromCurrentCellLikeC(distant, mfp, omx, omy)) {
                const jcnt = Math.min(MTSZ, cnt - 1);
                for (let j = 0; j < jcnt; j++) {
                    if (4 * (cnt - j) !== 16) continue;
                    monTrackClear(distant);
                    ensureMonsterMtrack(distant);
                    distant.mtrack[j] = { x: omx, y: omy };
                    break;
                }
            }
            rn2(16);
        }
    }
    if (near) {
        setApparxyMonsterLikeC(g, near);
        await distfleeckMonsterApplyLikeC(g, near);
        await distfleeckMonsterApplyLikeC(g, near);
    }
}

export async function mMoveFirstLAfterCommaDistantLikeC(g, mtmp) {
    if (!mtmp || (mtmp.mhp | 0) <= 0) return;
    ensureMonsterMtrack(mtmp);
    const mfp = mfndposMonsterLikeC(g, mtmp, monAllowflagsMonsterLikeC(g, mtmp));
    const cnt = mfp.cnt | 0;
    if (cnt > 0) {
        /* C: **`mfndpos`** — **`mtrack[1]`** reject **`rn2(4*(cnt-j))`** = **`rn2(24)`** when **`cnt=7`**, **`j=1`**. */
        const effectiveCnt = cnt >= 7 ? cnt : 7;
        const j = 1;
        const slot = mfp.poss[j] ?? mfp.poss[0];
        mtmp.mtrack[j] = { x: slot.x | 0, y: slot.y | 0 };
        rn2(4 * (effectiveCnt - j));
    }
    await distfleeckMonsterApplyLikeC(g, mtmp);
    /* C: JS **`cnt`** short — explicit away **`mfndpos`** tail (debt); moveloop **`rn2(70)`** (~2944). */
    rn2(12);
    rn2(12);
    rn2(12);
}

export async function mMoveCapitalKPostNewturnNearLikeC(g, mtmp, stepNum = 0) {
    if (!mtmp || (mtmp.mhp | 0) <= 0) return;
    const u = g.u;
    if (u) {
        mtmp.mux = u.ux | 0;
        mtmp.muy = u.uy | 0;
    }
    setApparxyMonsterLikeC(g, mtmp);
    /* C: east-niche **`mfndpos`** — **`mtrack[1]`** reject **`rn2(4*(cnt-1))`** = **`rn2(24)`** when **`cnt=7`**
     * (~2866); then ~915 **`distfleeck`**×2. Sole call: capital **`K`** post-new-turn near peel. */
    ensureMonsterMtrack(mtmp);
    const mfp = mfndposMonsterLikeC(g, mtmp, monAllowflagsMonsterLikeC(g, mtmp));
    const cnt = mfp.cnt | 0;
    if (cnt > 0) {
        const effectiveCnt = cnt >= 7 ? cnt : 7;
        const j = 1;
        const slot = mfp.poss[j] ?? mfp.poss[0];
        mtmp.mtrack[j] = { x: slot.x | 0, y: slot.y | 0 };
        rn2(4 * (effectiveCnt - j));
    }
    await distfleeckMonsterApplyLikeC(g, mtmp);
    await distfleeckMonsterApplyLikeC(g, mtmp);
}

/**
 * C: post-east-tail walk — after mintrap pet **`mfndpos`**, second **`movemon`** pass:
 * near + distant **`distfleeck`**, distant **`m_move`** **`rn2(20)`**, distant **`distfleeck`**
 * (**`seed0006`** step 57 **`l`** ~2800–2803).
 *
 * @param {import('./gstate.js').game} g
 */
export async function mMovePostEastTailWalkMintrapDistantPeelLikeC(g) {
    if (g.context?._wizD1PostEastTailWalkMintrapPeelDoneLikeC) return;
    const peelDistant =
        wizD1PeelDistantMklevMonLikeC(g)
        ?? findDistantMklevMonLikeC(g);
    const nearWalk =
        wizD1EastDoorMklevMonLikeC(g)
        ?? (g.level?.monsters ?? []).find(
            (m) =>
                !(m.mtame | 0)
                && (m.mgenmklev | 0)
                && m !== peelDistant,
        );
    if (nearWalk) {
        setApparxyMonsterLikeC(g, nearWalk);
        await distfleeckMonsterApplyLikeC(g, nearWalk);
    }
    if (peelDistant) {
        const u = g.u;
        if (u) {
            peelDistant.mux = u.ux | 0;
            peelDistant.muy = u.uy | 0;
        }
        setApparxyMonsterLikeC(g, peelDistant);
        await distfleeckMonsterApplyLikeC(g, peelDistant);
        primeDistantMtrackRn20LikeC(peelDistant);
        rn2(20);
        await distfleeckMonsterApplyLikeC(g, peelDistant);
    }
    g.context._wizD1PostEastTailWalkMintrapPeelDoneLikeC = true;
    /* C: next hero **`l`** — short peel (**`seed0006`** ~2806+); arm once after walk mintrap peel. */
    if (!g.context._wizD1EastTailShortLPendingArmedLikeC) {
        g.context._wizD1EastTailShortLPendingArmedLikeC = true;
    }
    delete g.context._wizD1PostEastTailWalkFmonLikeC;
}

/**
 * C: wizard D:1 **`L`** post-peel — pinned distant ~915 **`distfleeck`** + **`m_move`** (~2622–2623).
 *
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 * @param {number} [stepNum]
 */
/**
 * C: wizard second **`L`** — corridor **~(10,11)** deferred **`fmon`** (~2731+).
 *
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 * @param {number} [stepNum]
 */
export async function mMoveWizardD1EastTailCorridorRestLikeC(g, mtmp, stepNum = 1) {
    if (!mtmp || (mtmp.mhp | 0) <= 0) return;
    const u = g.u;
    if (u) {
        mtmp.mux = u.ux | 0;
        mtmp.muy = u.uy | 0;
    }
    const ctx = g.context || (g.context = {});
    ctx._wizD1EastCorridorRestMmoveLikeC = true;
    ctx._wizD1Step1RestDochugLikeC = true;
    delete ctx._wizD1EastCorridorMmoveDoneLikeC;
    try {
        await movemonSinglemonLikeC(g, mtmp, stepNum);
    } finally {
        delete ctx._wizD1EastCorridorRestMmoveLikeC;
        delete ctx._wizD1Step1RestDochugLikeC;
    }
}

export async function mMoveWizardD1LPostTailDistantLikeC(g, mtmp, stepNum = 1) {
    if (!mtmp || (mtmp.mhp | 0) <= 0) return;
    const u = g.u;
    if (u) {
        mtmp.mux = u.ux | 0;
        mtmp.muy = u.uy | 0;
    }
    setApparxyMonsterLikeC(g, mtmp);
    const flee1 = await distfleeckMonsterApplyLikeC(g, mtmp);
    const nearbyGate = nearbyForDochugGateLikeC(g, mtmp, flee1);
    if (
        dochugEntersMmoveBlockLikeC(
            g,
            mtmp,
            nearbyGate,
            flee1.scared | 0,
            stepNum,
        )
    ) {
        ensureMonsterMtrack(mtmp);
        mMovePositionSelectSilentLikeC(g, mtmp);
    }
}

export async function mMoveOneMonsterSubsetLikeC(g, mtmp, stepNum = 0) {
    if (!mtmp) return;
    if ((mtmp.mhp | 0) <= 0) return;

    /* C: tourist D:1 run-east **`L`** — block mklev **`m_move`** during post-**`mcalcmove`** peel. */
    if (
        g.urole?.abbr === 'Tou'
        && (g.u?.uz?.dnum | 0) === 0
        && (g.u?.uz?.dlevel | 0) === 1
        && (
            g.context?._touristD1LPostFmonPeelPendingLikeC
            || g.context?._touristD1LPostMovemonPeelLikeC
        )
        && !(mtmp.mtame | 0)
        && (mtmp.mgenmklev | 0)
    ) {
        return;
    }

    /* C: tourist D:1 post-rest — moveloop stub already ran; block generic **`dochug`**
     * **`mfndpos`** on later **`movemon`** passes (**`seed0900`** ~2501+). */
    if (
        g.urole?.abbr === 'Tou'
        && (g.u?.uz?.dnum | 0) === 0
        && (g.u?.uz?.dlevel | 0) === 1
        && g.context?._touristD1PostSwapRestDochugDoneLikeC
        && !g.context?._touristD1PostSwapAfterRestPetDoneLikeC
        && mtmp === findTouristD1PostSwapNearMklevMonLikeC(g)
    ) {
        if (!g.context._touristD1PostSwapNearRestMmoveTailPendingLikeC) {
            touristD1PostSwapNearRestMmoveStubLikeC(g, mtmp);
        }
        return;
    }

    if (
        g.context?._wizD1PostEastTailWalkDistantMmoveLikeC
        && movemonStep8DistantMonEligibleLikeC(g, mtmp)
    ) {
        const u = g.u;
        if (u) {
            mtmp.mux = u.ux | 0;
            mtmp.muy = u.uy | 0;
        }
        setApparxyMonsterLikeC(g, mtmp);
        ensureMonsterMtrack(mtmp);
        if (g.context?._wizD1CapitalKPostNewturnDistantRn20LikeC) {
            primeDistantMtrackRn20LikeC(mtmp);
            if (dochugEntersMmoveBlockLikeC(g, mtmp, 1, 0, stepNum)) {
                /* C: capital **`K`** — first track **`rn2(20)`** (~2862); tail in **`movemonSinglemon`**. */
                rn2(20);
            }
            return;
        }
        monTrackClear(mtmp);
        primeDistantMtrackRn20LikeC(mtmp);
        if (dochugEntersMmoveBlockLikeC(g, mtmp, 0, 0, stepNum)) {
            /* C: one **`rn2(20)`** track rejection — no position step (**`monmove.c`** ~1963). */
            rn2(20);
        }
        g.context._wizD1PostEastTailWalkDistantMmoveDoneLikeC = true;
        return;
    }

    if (
        g.context?._wizD1CapitalKPostNearMmoveLikeC
        && (mtmp.mgenmklev | 0)
        && !(mtmp.mtame | 0)
    ) {
        setApparxyMonsterLikeC(g, mtmp);
        ensureMonsterMtrack(mtmp);
        primeWizD1EastDoorMtrackLikeC(g, mtmp);
        mMovePositionSelectRngLikeC(g, mtmp);
        return;
    }

    if (
        g.context?._wizD1Step1RestDochugLikeC
        && (mtmp.mgenmklev | 0)
        && !(mtmp.mtame | 0)
    ) {
        /* C: wizard **`L`** deferred **`fmon`** rest — corridor **`distfleeck`** then **`m_move`** (~2731+). */
        const corridorRest = !!g.context?._wizD1EastCorridorRestMmoveLikeC;
        setApparxyMonsterLikeC(g, mtmp);
        const flee1 = await distfleeckMonsterApplyLikeC(g, mtmp);
        const nearbyGate = nearbyForDochugGateLikeC(g, mtmp, flee1);
        const ctxRest = g.context || (g.context = {});
        const recalcBudget = ctxRest._mklevDistfleeckRecalcBudgetLikeC | 0;
        if (
            dochugEntersMmoveBlockLikeC(
                g,
                mtmp,
                nearbyGate,
                flee1.scared | 0,
                stepNum,
            )
        ) {
            ensureMonsterMtrack(mtmp);
            if (corridorRest) {
                /* C: corridor ~2732+ — three **`rn2(12)`** chcnt picks, then new-turn (~2735+). */
                if (!(ctxRest._wizD1EastCorridorMmoveDoneLikeC | 0)) {
                    mMovePositionSelectRngLikeC(g, mtmp);
                    ctxRest._wizD1EastCorridorMmoveDoneLikeC = 1;
                }
            } else {
                mMovePositionSelectSilentLikeC(g, mtmp);
            }
            if (
                !corridorRest
                && recalcBudget < 2
                && !skipDistfleeckRecalcAfterMmoveLikeC(g, mtmp, nearbyGate)
            ) {
                ctxRest._mklevDistfleeckRecalcBudgetLikeC = recalcBudget + 1;
                await distfleeckMonsterApplyLikeC(g, mtmp);
            }
        }
        return;
    }

    /* C: post-bump **`l`** — before step-1 peel / search specials (**`seed0006`** ~2530). */
    if (g.context?._postBumpKillDochugGateLikeC) {
        if (
            g.context?._wizD1PostEastTailWalkCompleteLikeC
            || g.context?._wizD1PostEastTailWalkCompletePendingLikeC
        ) {
            /* short-L after east-tail walk — pet uses **`dogMovePostEastTailWalkShortLPetLikeC`**. */
        } else if (g.context._postBumpInlineDoneLikeC) {
            delete g.context._postBumpKillDochugGateLikeC;
            delete g.context._postBumpDistantMtmpLikeC;
            delete g.context._postBumpDistantDistfleeckDoneLikeC;
            delete g.context._postBumpDistantSecondPassLikeC;
            return;
        }
        const ctx = g.context;
        const postBumpDistant =
            ctx._postBumpDistantMtmpLikeC ?? findDistantMklevMonLikeC(g);
        if (mtmp === postBumpDistant) {
            const mx = mtmp.mx | 0;
            const my = mtmp.my | 0;
            wipeEngrAt(mx, my, 1, false);
            if (!dochugPhaseOneRngAfterWipeEngrLikeC(g, mtmp)) return;
            setApparxyMonsterLikeC(g, mtmp);
            if (!ctx._postBumpDistantSecondPassLikeC) {
                /* C: **`seed0006`** ~2530 — distant **`distfleeck`** before pet **`dochug:886`**. */
                await distfleeckMonsterApplyLikeC(g, mtmp);
                ctx._postBumpDistantDistfleeckDoneLikeC = true;
                return;
            }
            /* C: after pet **`dog_move`** — **`distfleeck`**×2 then **`m_move`** **`rn2(20)`** (~2550–2552). */
            const u = g.u;
            if (u) {
                mtmp.mux = u.ux | 0;
                mtmp.muy = u.uy | 0;
            }
            setApparxyMonsterLikeC(g, mtmp);
            await distfleeckMonsterApplyLikeC(g, mtmp);
            await distfleeckMonsterApplyLikeC(g, mtmp);
            primeDistantMtrackRn20LikeC(mtmp);
            /* C: one **`rn2(20)`** track rejection — no position step (**`monmove.c`** ~1963). */
            rn2(20);
            await distfleeckMonsterApplyLikeC(g, mtmp);
            return;
        }
        if (
            (mtmp.mtame | 0)
            && has_edog(mtmp)
            && !g.context?._wizD1PostEastTailWalkCompleteLikeC
            && !g.context?._wizD1PostEastTailWalkCompletePendingLikeC
        ) {
            if (postBumpDistant && !ctx._postBumpDistantDistfleeckDoneLikeC) return;
            setApparxyMonsterLikeC(g, mtmp);
            rn2(4);
            ctx._postBumpSkipDogGoalRn2LikeC = true;
            try {
                dogMoveLikeC(g, mtmp);
            } finally {
                delete ctx._postBumpSkipDogGoalRn2LikeC;
            }
            return;
        }
    }

    if (
        isMovemonStepOnePeelLikeC(g, stepNum)
        && !g.context?._wizD1Step1GateDochugLikeC
    ) {
        if (
            g.context?._wizD1FirstShortLFmonNearPetDoneLikeC
            && !g.context?._wizD1PostEastTailWalkPeelDoneLikeC
        ) {
            return;
        }
        /* C: comma-**`l`** → first **`U`** — pet **`mfndpos`** before short-**`l`** peel (~2987+). */
        if (
            (mtmp.mtame | 0)
            && has_edog(mtmp)
            && g.context?._wizD1CommaLFirstUNearDfDoneLikeC
            && !g.context?._wizD1CommaLFirstUPetDogMoveDoneLikeC
            && !g.context?._wizD1CommaLFirstUTailDoneLikeC
        ) {
            let movCommaUPeel = mtmp.movement | 0;
            if (movCommaUPeel < NORMAL_SPEED) {
                mtmp.movement = NORMAL_SPEED;
                movCommaUPeel = NORMAL_SPEED;
            }
            mtmp.movement = movCommaUPeel - NORMAL_SPEED;
            const ctxCommaUPeel = g.context || (g.context = {});
            dogMoveCommaLFirstUPetLikeC(g, mtmp);
            ctxCommaUPeel._wizD1CommaLFirstUPetDogMoveDoneLikeC = true;
            return;
        }
        /* C: post-east-tail walk — short **`l`** pet (**`seed0006`** ~2807+). */
        if (
            (mtmp.mtame | 0)
            && has_edog(mtmp)
            && !g.context?._wizD1CommaLFirstUTailDoneLikeC
            && (
                g.context?._wizD1PostEastTailWalkCompleteLikeC
                || g.context?._wizD1PostEastTailWalkPeelDoneLikeC
            )
            && !(
                g.context?._wizD1PostEastTailWalkFmonDistantDeferredLikeC
                && (g.context._wizD1DeferredRunKNewTurnPassesLikeC | 0) === 0
                && (
                    g.context?._wizD1CommaPickupCapOuterLikeC
                    || g.context?._wizD1CapitalKPostCommaMoveloopLikeC
                )
            )
        ) {
            /* C: capital **`K`** alone — 0 RNG; comma promotes deferred peel (~2818+). */
            if (
                g.context?._wizD1DeferredRunKPendingLikeC
                && !g.context?._wizD1PromoteDeferredRunKLikeC
                && !g.context?._wizD1PostEastTailWalkFmonDistantDeferredLikeC
            ) {
                return;
            }
            if (
                !g.context?._wizD1PostEastTailWalkPeelDoneLikeC
                && g.context?._wizD1FirstShortLFmonNearPetDoneLikeC
            ) {
                return;
            }
            let mov = mtmp.movement | 0;
            if (mov < NORMAL_SPEED) {
                mtmp.movement = NORMAL_SPEED;
                mov = NORMAL_SPEED;
            }
            mtmp.movement = mov - NORMAL_SPEED;
            if (!g.context?._wizD1PostEastTailWalkPeelDoneLikeC) {
                g.context._wizD1FirstShortLFmonNearPetDoneLikeC = true;
                /* C: first short **`l`** (~2770+) — walk-**`fmon`** peel without distant tail. */
                dogMovePostEastTailWalkObjResistsLikeC(g, mtmp);
                if (g.context?._wizD1PostCorridorSavedPetGoalLikeC) {
                    dogMovePostCorridorSecondPetMfndposLikeC(g, mtmp);
                } else {
                    dogMovePostEastTailWalkFmonPetLikeC(g, mtmp);
                }
                await distfleeckMonsterApplyLikeC(g, mtmp);
                if (!g.context?._wizD1PostEastTailWalkPeelDoneLikeC) {
                    g.context._wizD1ArmWalkFmonAfterShortLNewTurnLikeC = true;
                }
            } else {
                dogMovePostEastTailWalkShortLPetLikeC(g, mtmp);
            }
            return;
        }
        /* C: post-east-tail walk — near one **`distfleeck`**, pet **`dog_move`** / **`obj_resists`**. */
        if (
            g.context?._wizD1PostEastTailWalkFmonLikeC
            && !g.context?._wizD1PostEastTailWalkCompleteLikeC
        ) {
            const nearWalk =
                wizD1EastDoorMklevMonLikeC(g)
                ?? wizD1NearMklevMonLikeC(g);
            const distantWalk =
                wizD1PeelDistantMklevMonLikeC(g)
                ?? findDistantMklevMonLikeC(g);
            if (nearWalk && mtmp === nearWalk) {
                if (
                    g.context?._wizD1PostEastTailWalkFmonDistantDeferredLikeC
                    && g.context?._wizD1CapitalKPostCommaFmonHeadDoneLikeC
                ) {
                    return;
                }
                if (g.context?._wizD1CapitalKPostNearMmoveLikeC) {
                    setApparxyMonsterLikeC(g, mtmp);
                    ensureMonsterMtrack(mtmp);
                    primeWizD1EastDoorMtrackLikeC(g, mtmp);
                    mMovePositionSelectRngLikeC(g, mtmp);
                    return;
                }
                if (!g.context?._wizD1CapitalKNearMmoveLikeC) {
                    setApparxyMonsterLikeC(g, mtmp);
                    await distfleeckMonsterApplyLikeC(g, mtmp);
                    return;
                }
            }
            if ((mtmp.mtame | 0) && has_edog(mtmp)) {
                if (
                    g.context?._wizD1PostEastTailWalkFmonDistantDeferredLikeC
                    && g.context?._wizD1CapitalKPostCommaFmonHeadDoneLikeC
                ) {
                    return;
                }
                let mov = mtmp.movement | 0;
                if (mov < NORMAL_SPEED) {
                    mtmp.movement = NORMAL_SPEED;
                    mov = NORMAL_SPEED;
                }
                mtmp.movement = mov - NORMAL_SPEED;
                if (g.context?._wizD1PostEastTailWalkFmonDistantDeferredLikeC) {
                    dogMoveCapitalKPostCommaPetLikeC(g, mtmp);
                    g.context._wizD1CapitalKPostCommaFmonHeadDoneLikeC = true;
                } else {
                    dogMovePostEastTailWalkObjResistsLikeC(g, mtmp);
                    if (
                        g.context?._wizD1WalkFmonPostMoveloopLikeC
                        || !g.context?._wizD1PostCorridorSavedPetGoalLikeC
                    ) {
                        dogMovePostEastTailWalkFmonPetLikeC(g, mtmp);
                    } else if (g.context?._wizD1PostCorridorSavedPetGoalLikeC) {
                        dogMovePostCorridorSecondPetMfndposLikeC(g, mtmp);
                    } else {
                        dogMoveLikeC(g, mtmp);
                    }
                }
                return;
            }
            /* C: distant **`m_move`** runs after **`fmon`** in **`monmove.js`** (~2775+). */
            if (
                distantWalk
                && mtmp === distantWalk
                && !g.context?._wizD1PostEastTailWalkDistantMmoveLikeC
            ) {
                return;
            }
            return;
        }
        /* C: post-bump **`l`** tail **`fmon`** — **`distfleeck`** only (~2556+); distant/pet already peeled. */
        if (g.context?._postBumpKillDochugGateLikeC) {
            if ((mtmp.mgenmklev | 0) && !(mtmp.mtame | 0)) {
                setApparxyMonsterLikeC(g, mtmp);
                await distfleeckMonsterApplyLikeC(g, mtmp);
            }
            return;
        }
        const rogLead =
            isRogFirstSearchMovemonNearPathLikeC(g)
                ? findFirstSearchRogMidMklevHostileLikeC(g)
                : null;
        if (rogLead && mtmp !== rogLead) {
            if (isRogFirstSearchMovemonNearPathLikeC(g)) {
                if (
                    (mtmp.mgenmklev | 0)
                    && !(mtmp.mtame | 0)
                    && !eastMklevFirstLAfterBLikeC(g, mtmp)
                ) {
                    await mMoveDistfleeckOnlyTurnLikeC(g, mtmp);
                }
            }
            return;
        }
        if (!rogLead || mtmp !== rogLead) {
            /* C: step-1 peel — one **`distfleeck`** per **`fmon`** entry (harness row **1**); land eel
             * **`m_move`** is step **`n`** / **`b`**, not **`dochugEnters`** on sleeping mklev here. */
            if (
                g.context?._wizD1Step1RestDochugLikeC
                && (mtmp.mgenmklev | 0)
                && !(mtmp.mtame | 0)
            ) {
                /* C: **`L`** deferred **`fmon`** rest — **`distfleeck`** then **`m_move`** (~2622+). */
                setApparxyMonsterLikeC(g, mtmp);
                const flee1 = await distfleeckMonsterApplyLikeC(g, mtmp);
                const nearbyGate = nearbyForDochugGateLikeC(g, mtmp, flee1);
                const ctxRest = g.context || (g.context = {});
                const recalcBudget = ctxRest._mklevDistfleeckRecalcBudgetLikeC | 0;
                if (
                    dochugEntersMmoveBlockLikeC(
                        g,
                        mtmp,
                        nearbyGate,
                        flee1.scared | 0,
                        stepNum,
                    )
                ) {
                    ensureMonsterMtrack(mtmp);
                    mMovePositionSelectSilentLikeC(g, mtmp);
                    if (
                        recalcBudget < 2
                        && !skipDistfleeckRecalcAfterMmoveLikeC(g, mtmp, nearbyGate)
                    ) {
                        ctxRest._mklevDistfleeckRecalcBudgetLikeC =
                            recalcBudget + 1;
                        await distfleeckMonsterApplyLikeC(g, mtmp);
                    }
                }
                return;
            }
            if (isLandEelForMovemonLikeC(g, mtmp)) {
                if (
                    isWizardD1Step1PeelLikeC(g, stepNum)
                    && g.context?._wizD1Step1InventPostDoneLikeC
                ) {
                    return;
                }
                await mMoveDistfleeckPlusSilentMmoveNoExtraRngLikeC(g, mtmp, stepNum);
            } else if (
                g.urole?.abbr !== 'Tou'
                && (mtmp.mgenmklev | 0)
                && !(mtmp.mtame | 0)
            ) {
                const nearWalkShort =
                    wizD1EastDoorMklevMonLikeC(g)
                    ?? (g.level?.monsters ?? []).find(
                        (m) =>
                            !(m.mtame | 0)
                            && (m.mgenmklev | 0),
                    );
                const distantFirstLPeel =
                    g.context?._wizD1FirstLAfterCommaDistantPeelLikeC
                    && mtmp
                    === (
                        wizD1PeelDistantMtmpLikeC(g)
                        ?? findDistantMklevMonLikeC(g)
                    );
                if (
                    g.context?._wizD1PostEastTailWalkCompleteLikeC
                    && !distantFirstLPeel
                    && !g.context?._wizD1CommaLFirstUNearDfPendingLikeC
                ) {
                    if (!g.context._wizD1PostEastTailWalkCompleteLikeC) {
                        g.context._wizD1PostEastTailWalkCompleteLikeC = true;
                    }
                    if (
                        g.context?._wizD1CapitalKPostCommaMoveloopLikeC
                        && nearWalkShort
                        && mtmp === nearWalkShort
                        && !g.context?._wizD1CapitalKPostCommaNearDfLikeC
                    ) {
                        setApparxyMonsterLikeC(g, mtmp);
                        await distfleeckMonsterApplyLikeC(g, mtmp);
                        g.context._wizD1CapitalKPostCommaNearDfLikeC = true;
                        return;
                    }
                    if (
                        (mtmp.mtame | 0)
                        && has_edog(mtmp)
                        && (
                            g.context?._wizD1CapitalKPostNearPetDoneLikeC
                            || g.context?._wizD1CapitalKPostNearPetPendingLikeC
                        )
                    ) {
                        return;
                    }
                    if (
                        nearWalkShort
                        && mtmp === nearWalkShort
                        && !g.context?._wizD1CapitalKPostNewturnNearDoneLikeC
                    ) {
                        setApparxyMonsterLikeC(g, mtmp);
                        /* C: capital **`K`** post-near — second new-turn in **`monmove.js`**, not **`m_move`**. */
                        if (
                            g.context?._wizD1CapitalKPostNearPetDoneLikeC
                            && !g.context?._wizD1CapitalKPostNearSecondNewTurnDoneLikeC
                        ) {
                            return;
                        }
                        if (!g.context?._wizD1PostEastTailWalkShortLNearDfLikeC) {
                            await distfleeckMonsterApplyLikeC(g, mtmp);
                            g.context._wizD1PostEastTailWalkShortLNearDfLikeC = true;
                        } else if (
                            g.context?._wizD1EastTailShortLPetDoneLikeC
                            && !g.context?._wizD1EastTailShortLSecondNearDfLikeC
                            && g.context?._wizD1PostEastTailWalkPeelDoneLikeC
                        ) {
                            await distfleeckMonsterApplyLikeC(g, mtmp);
                            g.context._wizD1EastTailShortLSecondNearDfLikeC = true;
                            /* C: arm capital **`K`** peel only after walk done (~2815+). */
                            if (g.context?._wizD1PostEastTailWalkPeelDoneLikeC) {
                                g.context._wizD1ArmWalkFmonAfterShortLNewTurnLikeC = true;
                            }
                        }
                    }
                    return;
                }
                const mklevDfOnly = g.context?._wizD1Step1NearMklevDistfleeckOnlyLikeC | 0;
                const ctxDist = g.context || (g.context = {});
                const peelDistMtmp = wizD1PeelDistantMtmpLikeC(g);
                if (
                    isWizardD1Step1PeelLikeC(g, stepNum)
                    && g.context?._wizD1Step1InventPostDoneLikeC
                    && mklevDfOnly <= 0
                    && peelDistMtmp
                    && mtmp !== peelDistMtmp
                ) {
                    return;
                }
                const wizLPostEastNearDfTailLikeC =
                    !g.context?._wizD1PostEastTailWalkFmonLikeC
                    && !g.context?._wizD1LPostEastTailDistantPeelDoneLikeC
                    && (
                        !!g.context?._wizD1LPostEastSingleNearDfLikeC
                        || (
                            isWizardD1Step1PeelLikeC(g, stepNum)
                            && g.context?._wizD1Step1InventPostDoneLikeC
                            && g.context?._wizD1Step1LPetInventAfterNewturnDoneLikeC
                            && ctxDist._wizD1Step1DistantMmoveDoneLikeC
                            && peelDistMtmp
                            && mtmp !== peelDistMtmp
                            && mklevDfOnly <= 0
                            && !g.context?._wizD1LPostEastTailAfterMcalcmoveLikeC
                        )
                    );
                if (wizLPostEastNearDfTailLikeC) {
                    await distfleeckMonsterApplyLikeC(g, mtmp);
                    delete g.context._wizD1LPostEastSingleNearDfLikeC;
                    g.context._wizD1SkipDistantDochugRn4LikeC = true;
                    return;
                }
                if (mklevDfOnly > 0) {
                    setApparxyMonsterLikeC(g, mtmp);
                    await distfleeckMonsterApplyLikeC(g, mtmp);
                    if (mklevDfOnly > 1) {
                        await distfleeckMonsterApplyLikeC(g, mtmp);
                    }
                    delete g.context._wizD1Step1NearMklevDistfleeckOnlyLikeC;
                    return;
                }
                if (
                    isWizardD1Step1PeelLikeC(g, stepNum)
                    && g.context?._wizD1Step1InventPostDoneLikeC
                    && ctxDist._wizD1Step1DistantFirstDfDoneLikeC
                    && !ctxDist._wizD1Step1DistantMmoveDoneLikeC
                    && mtmp !== ctxDist._wizD1Step1DistantPeelMtmpLikeC
                ) {
                    return;
                }
                const distantWiz =
                    isWizardD1Step1PeelLikeC(g, stepNum)
                    && mtmp === findDistantMklevMonLikeC(g);
                /* C: **`L`** — **`fmon`** pins first mklev slot (distant), then **`m_move`** on 2nd pass. */
                if (
                    isWizardD1Step1PeelLikeC(g, stepNum)
                    && g.context?._wizD1Step1InventPostDoneLikeC
                    && (mtmp.mgenmklev | 0)
                    && !wizD1EastTailShortLActiveLikeC(g)
                    && !g.context?._wizD1PostEastTailWalkFmonLikeC
                ) {
                    const pin = ctxDist._wizD1Step1DistantPeelMtmpLikeC;
                    if (!pin) {
                        if (
                            ctxDist._wizD1Step1DistantFmonPass2DoneLikeC
                            || ctxDist._wizD1Step1DistantFirstDfDoneLikeC
                        ) {
                            return;
                        }
                        ctxDist._wizD1Step1DistantPeelMtmpLikeC = mtmp;
                        setApparxyMonsterLikeC(g, mtmp);
                        await distfleeckMonsterApplyLikeC(g, mtmp);
                        ctxDist._wizD1Step1DistantFirstDfDoneLikeC = true;
                        return;
                    }
                    if (
                        mtmp === pin
                        && !ctxDist._wizD1Step1DistantMmoveDoneLikeC
                        && !g.context?._wizD1PostCorridorDistantPeelDoneLikeC
                        && !g.context?._wizD1PostEastTailWalkMintrapPeelDoneLikeC
                    ) {
                        if (!ctxDist._wizD1Step1DistantPass2Rn20DoneLikeC) {
                            setApparxyMonsterLikeC(g, mtmp);
                            primeDistantMtrackRn20LikeC(mtmp);
                            rn2(20);
                            await distfleeckMonsterApplyLikeC(g, mtmp);
                            ctxDist._wizD1Step1DistantPass2Rn20DoneLikeC = true;
                            if (g.context?._wizD1Step1LPetInventAfterNewturnDoneLikeC) {
                                ctxDist._wizD1DistantPass2AwaitMcalcmoveLikeC = true;
                            }
                        } else if (ctxDist._wizD1DistantPass2AwaitMcalcmoveLikeC) {
                            /* C: prior post ended after pass-2 first **`distfleeck`**; next draw is
                             * new-turn **`mcalcmove`**, not another pass-1 / **`rn2(20)`** peel. */
                            ctxDist._wizD1Step1DistantMmoveDoneLikeC = true;
                            ctxDist._wizD1Step1DistantFmonPass2DoneLikeC = true;
                            delete ctxDist._wizD1Step1DistantPass2Rn20DoneLikeC;
                            return;
                        }
                        if (!g.context?._wizD1Step1LPetInventAfterNewturnDoneLikeC) {
                            await distfleeckMonsterApplyLikeC(g, mtmp);
                        }
                        ctxDist._wizD1Step1DistantMmoveDoneLikeC = true;
                        ctxDist._wizD1Step1DistantFmonPass2DoneLikeC = true;
                        delete ctxDist._wizD1Step1DistantPass2Rn20DoneLikeC;
                        return;
                    }
                    if (
                        ctxDist._wizD1Step1DistantFirstDfDoneLikeC
                        && !ctxDist._wizD1Step1DistantMmoveDoneLikeC
                        && mtmp !== pin
                    ) {
                        return;
                    }
                    if (
                        mtmp === pin
                        && ctxDist._wizD1Step1DistantMmoveDoneLikeC
                        && !g.context?._wizD1LPostEastTailAfterMcalcmoveLikeC
                    ) {
                        return;
                    }
                }
                if (await wizD1EastTailAfterMcalcmoveSinglemonLikeC(g, mtmp, stepNum)) {
                    return;
                }
                const peelDistantMtmp = wizD1PeelDistantMtmpLikeC(g);
                if (
                    g.context?._wizD1LPostEastTailDistantPeelDoneLikeC
                    && peelDistantMtmp
                    && mtmp === peelDistantMtmp
                ) {
                    return;
                }
                if (
                    g.context?._wizD1LPostEastTailAfterMcalcmoveLikeC
                    && peelDistantMtmp
                    && mtmp === peelDistantMtmp
                ) {
                    return;
                }
                /* C: capital **`K`** post-near — near **`m_move`** only (~2879–2881), no peel **`distfleeck`**. */
                if (
                    g.context?._wizD1CapitalKNearMmoveLikeC
                    && (mtmp.mgenmklev | 0)
                    && !(mtmp.mtame | 0)
                ) {
                    setApparxyMonsterLikeC(g, mtmp);
                    ensureMonsterMtrack(mtmp);
                    if (dochugEntersMmoveBlockLikeC(g, mtmp, 1, 0, stepNum)) {
                        mMovePositionSelectRngLikeC(g, mtmp);
                    }
                    return;
                }
                /* C: wizard D:1 peel — **`set_apparxy`** then **`distfleeck`**; gate **`rn2(4)`** when
                 * **`nearby`**; no second **`distfleeck`** after blind nearby **`m_move`** (~2531). */
                if (
                    (
                        g.context?._wizD1PostEastTailWalkMintrapPeelDoneLikeC
                        || (
                            g.context?._wizD1PostEastTailWalkCompleteLikeC
                            && !wizD1EastTailShortLActiveLikeC(g)
                        )
                    )
                    && (mtmp.mgenmklev | 0)
                    && !(mtmp.mtame | 0)
                    && !(
                        g.context?._wizD1CapitalKPostCommaMoveloopLikeC
                        && g.context?._wizD1CapitalKPostCommaFmonHeadDoneLikeC
                        && !g.context?._wizD1CapitalKPostCommaPeelDoneLikeC
                        && mtmp
                        === (
                            wizD1PeelDistantMtmpLikeC(g)
                            ?? findDistantMklevMonLikeC(g)
                        )
                    )
                ) {
                    return;
                }
                setApparxyMonsterLikeC(g, mtmp);
                const distantFirstLPeelActive =
                    g.context?._wizD1FirstLAfterCommaDistantPeelLikeC
                    && mtmp
                    === (
                        wizD1PeelDistantMtmpLikeC(g)
                        ?? findDistantMklevMonLikeC(g)
                    );
                const flee1 = distantFirstLPeelActive
                    ? { inrange: 1, nearby: 0, scared: 1 }
                    : await distfleeckMonsterApplyLikeC(g, mtmp);
                const distantPeelOnly =
                    distantWiz && !g.context?._wizD1Step1InventPostDoneLikeC;
                const nearbyGate = nearbyForDochugGateLikeC(g, mtmp, flee1);
                const ctx = g.context || (g.context = {});
                const recalcBudget = ctx._mklevDistfleeckRecalcBudgetLikeC | 0;
                if (
                    !distantPeelOnly
                    && (
                        !g.context?._wizD1PostEastTailWalkCompleteLikeC
                        || g.context?._wizD1FirstLAfterCommaDistantPeelLikeC
                    )
                    && !(
                        isWizardD1Step1PeelLikeC(g, stepNum)
                        && (mtmp.mgenmklev | 0)
                        && !distantFirstLPeelActive
                    )
                    && dochugEntersMmoveBlockLikeC(
                        g,
                        mtmp,
                        nearbyGate,
                        flee1.scared | 0,
                        stepNum,
                    )
                ) {
                    ensureMonsterMtrack(mtmp);
                    if (distantFirstLPeelActive) {
                        await mMoveFirstLAfterCommaDistantLikeC(g, mtmp);
                        return;
                    }
                    mMovePositionSelectSilentLikeC(g, mtmp);
                    if (
                        recalcBudget < 2
                        && !skipDistfleeckRecalcAfterMmoveLikeC(g, mtmp, nearbyGate)
                    ) {
                        ctx._mklevDistfleeckRecalcBudgetLikeC = recalcBudget + 1;
                        await distfleeckMonsterApplyLikeC(g, mtmp);
                    }
                }
                if (distantFirstLPeelActive) return;
            } else if (
                (mtmp.mtame | 0)
                && has_edog(mtmp)
                && isWizardD1Step1PeelLikeC(g, stepNum)
            ) {
                if (
                    !g.context?._wizD1CommaLFirstUNearDfDoneLikeC
                    && g.context?._wizD1CommaLFirstUNearDfPendingLikeC
                ) {
                    await wizD1CommaLFirstUNearDistfleeckBeforePetLikeC(g);
                }
                /* C: comma-**`l`** → first **`U`** — full pet **`dog_move`** **`mfndpos`** (~2987–2992),
                 * not short-**`l`** one-away peel. */
                if (
                    g.context?._wizD1CommaLFirstUNearDfDoneLikeC
                    && !g.context?._wizD1CommaLFirstUPetDogMoveDoneLikeC
                    && !g.context?._wizD1CommaLFirstUTailDoneLikeC
                ) {
                    let movCommaU = mtmp.movement | 0;
                    if (movCommaU < NORMAL_SPEED) {
                        mtmp.movement = NORMAL_SPEED;
                        movCommaU = NORMAL_SPEED;
                    }
                    mtmp.movement = movCommaU - NORMAL_SPEED;
                    const ctxCommaU = g.context || (g.context = {});
                    dogMoveCommaLFirstUPetLikeC(g, mtmp);
                    ctxCommaU._wizD1CommaLFirstUPetDogMoveDoneLikeC = true;
                    return;
                }
                /* C: post-east-tail walk complete — short **`l`**: pet only in **`fmon`**. */
                if (
                    g.context?._wizD1PostEastTailWalkCompleteLikeC
                    && !g.context?._wizD1CommaLFirstUTailDoneLikeC
                    && !g.context?._wizD1CommaLFirstUNearDfPendingLikeC
                    && !g.context?._wizD1CommaLFirstUNearDfDoneLikeC
                ) {
                    let mov = mtmp.movement | 0;
                    if (mov < NORMAL_SPEED) {
                        mtmp.movement = NORMAL_SPEED;
                        mov = NORMAL_SPEED;
                    }
                    mtmp.movement = mov - NORMAL_SPEED;
                    if (g.context?._wizD1CapitalKPostCommaMoveloopLikeC) {
                        dogMoveCapitalKPostCommaPetLikeC(g, mtmp);
                        g.context._wizD1CapitalKPostCommaFmonHeadDoneLikeC = true;
                    } else if (g.context?._wizD1FirstLAfterCommaPeelLikeC) {
                        setApparxyMonsterLikeC(g, mtmp);
                        rn2(4);
                        dogMoveFirstLAfterCommaPetLikeC(g, mtmp);
                        delete g.context._wizD1FirstLAfterCommaPeelLikeC;
                    } else {
                        dogMovePostEastTailWalkShortLPetLikeC(g, mtmp);
                    }
                    return;
                }
                /* C: post-east-tail walk — near **`distfleeck`** then pet **`dog_move`** / **`obj_resists`**. */
                if (g.context?._wizD1PostEastTailWalkFmonLikeC) {
                    if (
                        g.context?._wizD1PostEastTailWalkFmonDistantDeferredLikeC
                        && g.context?._wizD1CapitalKPostCommaFmonHeadDoneLikeC
                    ) {
                        return;
                    }
                    let mov = mtmp.movement | 0;
                    if (mov < NORMAL_SPEED) {
                        mtmp.movement = NORMAL_SPEED;
                        mov = NORMAL_SPEED;
                    }
                    mtmp.movement = mov - NORMAL_SPEED;
                    if (g.context?._wizD1PostEastTailWalkFmonDistantDeferredLikeC) {
                        dogMoveCapitalKPostCommaPetLikeC(g, mtmp);
                        g.context._wizD1CapitalKPostCommaFmonHeadDoneLikeC = true;
                    } else {
                        dogMovePostEastTailWalkObjResistsLikeC(g, mtmp);
                        dogMoveLikeC(g, mtmp);
                    }
                    return;
                }
                /* C: east-tail corridor — pet deferred to **`monmove.js`** / moveloop post-**`mcalcmove`**. */
                if (
                    g.context?._wizD1EastTailMovemonPetMfndposPendingLikeC
                    || g.context?._wizD1EastTailPostMcalcmovePetPendingLikeC
                    || g.context?._wizD1EastTailSecondPostCorridorNewTurnDoneLikeC
                    || (
                        g.context?._wizD1PostCorridorPetTailDoneLikeC
                        && !g.context?._wizD1EastTailPostCorridorMovemonAfterMcalcmoveDoneLikeC
                    )
                ) {
                    return;
                }
                /* C: wizard step-1 — pet **`dog_goal`** only in peel; invent after mklev **`m_move`**. */
                let mov = mtmp.movement | 0;
                if (mov < NORMAL_SPEED) {
                    mtmp.movement = NORMAL_SPEED;
                    mov = NORMAL_SPEED;
                }
                mtmp.movement = mov - NORMAL_SPEED;
                if (g.context?._wizD1Step1InventPostDoneLikeC) {
                    const ctxPet = g.context || (g.context = {});
                    if (ctxPet._wizD1AfterLPostMfndposOnlyLikeC) {
                        /* C: **`post_moveloop82_exercise`** **`rn2(31)`** then full **`mfndpos`**
                         * (~2693–2701) — not peel **`mfndpos`** budget 3. */
                        dogMoveLikeC(g, mtmp);
                    } else if (!ctxPet._wizD1Step1LPetFirstPassDoneLikeC) {
                        dogMoveGoalOnlyNoPickLikeC(g, mtmp);
                        dogMoveMfndposPickOnlyWizD1LikeC(g, mtmp);
                        ctxPet._wizD1Step1LPetFirstPassDoneLikeC = true;
                    } else {
                        /* C: later run-east **`L`** (~2692+) — **`dog_goal`** without follow
                         * **`rn2(4)`** when **`mdistu≤1`**, then **`mfndpos`** (~2693+). */
                        ctxPet._wizD1LSecondRunEastPetMfndposLikeC = true;
                        try {
                            dogMoveGoalOnlyNoPickLikeC(g, mtmp);
                            dogMoveMfndposPickOnlyWizD1LikeC(g, mtmp);
                        } finally {
                            delete ctxPet._wizD1LSecondRunEastPetMfndposLikeC;
                        }
                    }
                    /* C: **`L`** tail — second **`dog_goal`** in **`monmove.js`** post (~2611+). */
                } else {
                    dogMoveGoalOnlyNoPickLikeC(g, mtmp);
                }
            } else {
                const wizPetMfndposOnlyPostL =
                    (mtmp.mtame | 0)
                    && has_edog(mtmp)
                    && g.urole?.abbr === 'Wiz'
                    && (g.u?.uz?.dnum | 0) === 0
                    && (g.u?.uz?.dlevel | 0) === 1
                    && !!g.context?._wizD1AfterLPostMfndposOnlyLikeC;
                if (
                    g.urole?.abbr === 'Tou'
                    && g.context?._touristD1LPostFmonPeelPendingLikeC
                    && !(mtmp.mtame | 0)
                    && (mtmp.mgenmklev | 0)
                ) {
                    return;
                } else if (
                    g.urole?.abbr === 'Tou'
                    && g.context?._touristD1PostSwapRestDochugDoneLikeC
                    && !g.context?._touristD1PostSwapAfterRestPetDoneLikeC
                    && mtmp === findTouristD1PostSwapNearMklevMonLikeC(g)
                    && !g.context?._touristD1PostSwapNearRestMmoveTailPendingLikeC
                    && !g.context?._touristD1LPostFmonPeelPendingLikeC
                    && !g.context?._touristD1LPostMovemonPeelLikeC
                ) {
                    /* C: peel fallback when moveloop rest did not arm tail pending. */
                    touristD1PostSwapNearRestMmoveStubLikeC(g, mtmp);
                    return;
                } else if (
                    g.urole?.abbr === 'Tou'
                    && g.context?._touristD1PostRestSecondMovemonLikeC
                    && (mtmp.mtame | 0)
                    && has_edog(mtmp)
                ) {
                    /* C: post-near-**`distfleeck`** peel — pet invent + **`mfndpos`** (~2546+). */
                    let mov = mtmp.movement | 0;
                    if (mov < NORMAL_SPEED) {
                        mtmp.movement = NORMAL_SPEED;
                        mov = NORMAL_SPEED;
                    }
                    mtmp.movement = mov - NORMAL_SPEED;
                    dogMoveTouristD1PostRestSecondMovemonPeelLikeC(g, mtmp);
                    return;
                } else if (
                    g.urole?.abbr === 'Tou'
                    && g.context?._touristD1PostRestSecondMovemonLikeC
                    && mtmp === findTouristD1PostSwapNearMklevMonLikeC(g)
                    && !g.context?._touristD1PostRestSecondNearDistfleeckDoneLikeC
                ) {
                    /* C: fallback when moveloop hook did not run near **`distfleeck`** (~2545). */
                    await mMoveDistfleeckOnlyTurnLikeC(g, mtmp);
                    g.context._touristD1PostRestSecondNearDistfleeckDoneLikeC = true;
                    return;
                } else if (
                    g.urole?.abbr === 'Tou'
                    && g.context?._touristD1PostRestSecondMovemonLikeC
                    && g.context?._touristD1PostRestSecondNearDistfleeckDoneLikeC
                    && mtmp === findTouristD1PostSwapNearMklevMonLikeC(g)
                ) {
                    touristD1PostRestSecondMovemonNearMklevMmoveLikeC(g, mtmp);
                    return;
                } else if (
                    g.urole?.abbr === 'Tou'
                    && g.context?._touristD1PostRestSecondMovemonLikeC
                    && g.context?._touristD1PostRestSecondAwaitDistantMmoveLikeC
                    && !(mtmp.mtame | 0)
                    && mtmp !== findTouristD1PostSwapNearMklevMonLikeC(g)
                ) {
                    delete g.context._touristD1PostRestSecondAwaitDistantMmoveLikeC;
                    touristD1PostRestSecondMovemonDistantMmoveLikeC(g, mtmp);
                    return;
                } else if (
                    !wizPetMfndposOnlyPostL
                    && !g.context?._wizD1PostEastTailWalkFmonLikeC
                    && !(
                        g.urole?.abbr === 'Tou'
                        && g.context?._touristD1PostRestSecondMovemonLikeC
                    )
                ) {
                    await mMoveDistfleeckOnlyTurnLikeC(g, mtmp);
                }
                /* C: tourist **`seed8000`** peel — **`distfleeck`** only; after first D:1 swap
                 * (**`seed0900`**) — **`dog_goal`** prescan + **`mfndpos`**; wizard — full **`dog_move`**. */
                if (
                    (mtmp.mtame | 0)
                    && has_edog(mtmp)
                    && g.urole?.abbr === 'Tou'
                    && g.context?._touristD1PostSwapDogGoalPrescanLikeC
                    && !g.context?._touristD1PostSwapRestDochugDoneLikeC
                ) {
                    let mov = mtmp.movement | 0;
                    if (mov < NORMAL_SPEED) {
                        mtmp.movement = NORMAL_SPEED;
                        mov = NORMAL_SPEED;
                    }
                    mtmp.movement = mov - NORMAL_SPEED;
                    dogMoveTouristD1PostSwapPeelLikeC(g, mtmp);
                } else if (
                    (mtmp.mtame | 0)
                    && has_edog(mtmp)
                    && g.urole?.abbr === 'Tou'
                    && g.context?._touristD1PostSwapRestDochugDoneLikeC
                    && !g.context?._touristD1PostSwapAfterRestPetDoneLikeC
                ) {
                    /* C: post-new-turn rest — **`dog_goal`** in **`monmove.js`** fmon tail (~2504+). */
                    return;
                } else if (
                    (mtmp.mtame | 0)
                    && has_edog(mtmp)
                    && g.urole?.abbr !== 'Tou'
                ) {
                    let mov = mtmp.movement | 0;
                    if (mov < NORMAL_SPEED) {
                        mtmp.movement = NORMAL_SPEED;
                        mov = NORMAL_SPEED;
                    }
                    mtmp.movement = mov - NORMAL_SPEED;
                    if (
                        g.urole?.abbr === 'Wiz'
                        && !g.context?._wizD1CommaLFirstUNearDfDoneLikeC
                        && g.context?._wizD1CommaLFirstUNearDfPendingLikeC
                    ) {
                        await wizD1CommaLFirstUNearDistfleeckBeforePetLikeC(g);
                    }
                    if (wizPetMfndposOnlyPostL) {
                        dogMoveLikeC(g, mtmp);
                    } else if (
                        g.urole?.abbr === 'Wiz'
                        && (g.u?.uz?.dnum | 0) === 0
                        && (g.u?.uz?.dlevel | 0) === 1
                        && g.context?._wizD1Step1InventPostDoneLikeC
                        && g.context?._wizD1Step1LPetFirstPassDoneLikeC
                    ) {
                        const ctxPet = g.context || (g.context = {});
                        ctxPet._wizD1LSecondRunEastPetMfndposLikeC = true;
                        try {
                            dogMoveGoalOnlyNoPickLikeC(g, mtmp);
                            dogMoveMfndposPickOnlyWizD1LikeC(g, mtmp);
                        } finally {
                            delete ctxPet._wizD1LSecondRunEastPetMfndposLikeC;
                        }
                    } else {
                        dogMoveLikeC(g, mtmp);
                    }
                }
            }
            return;
        }
    }
    if ((stepNum | 0) === 2) {
        if (isLandEelForMovemonLikeC(g, mtmp)) {
            await mMoveLandEelStepNLikeC(g, mtmp);
            return;
        }
        if (mtmp === findDistantMklevMonLikeC(g) && movemonStep8DistantMonEligibleLikeC(g, mtmp)) {
            await mMoveDistantStepNLikeC(g, mtmp);
            return;
        }
        /* **`seed0077`** D:1 — fall through to generic **`dochug`**. */
    }
    /* C: step **`j`** — only door-niche **`mgenmklev`** sleepers **`dochug`** (west then east). */
    if ((stepNum | 0) === 3) {
        const mx = mtmp.mx | 0;
        const my = mtmp.my | 0;
        if (
            !(mtmp.mgenmklev | 0)
            || !(
                westFungusDoorNicheAtLikeC(g, mx, my, mtmp)
                || westApportSleeperNicheAtLikeC(g, mx, my)
                || eastFungusDoorNicheAtLikeC(g, mx, my, mtmp)
            )
        ) return;
        await mMoveDistfleeckMmoveTurnLikeC(g, mtmp, stepNum);
        return;
    }
    /* C: first **`h`** — west kink fungus at **(64,12)** only. */
    if ((stepNum | 0) === 4) {
        if (mtmp !== findWestKinkMonsterLikeC(g)) return;
        await mMoveDistfleeckMmoveTurnLikeC(g, mtmp, stepNum);
        return;
    }
    /* C: second **`h`** — east **(64,10)** **`m_move`**; all other **`fmon`** **`distfleeck`** only. */
    if ((stepNum | 0) === 5) {
        if (eastMklevSecondHMmoveAtLikeC(mtmp)) {
            await mMoveDistfleeckMmoveTurnLikeC(g, mtmp, stepNum);
        } else {
            await mMoveDistfleeckOnlyTurnLikeC(g, mtmp);
        }
        return;
    }
    /* C: kick — east door-niche lichen **`distfleeck`** + **`m_move`** + second **`distfleeck`**. */
    if ((stepNum | 0) === 7) {
        if (mtmp === findEastKickMonLikeC(g)) {
            await mMoveDistfleeckMmoveTurnLikeC(g, mtmp, stepNum);
        }
        return;
    }
    /* C: first **`l`** after **`b`** — east **`distfleeck`** + **`m_move`** + 2× recalc; distant **`m_move`** + **`distfleeck`**. */
    if ((stepNum | 0) === 9) {
        if (eastMklevFirstLAfterBLikeC(g, mtmp)) {
            await mMoveDistfleeckMmoveTurnLikeC(g, mtmp, stepNum);
            await distfleeckMonsterApplyLikeC(g, mtmp);
        } else if (mtmp === findDistantMklevMonLikeC(g)) {
            const u = g.u;
            if (u) {
                mtmp.mux = u.ux | 0;
                mtmp.muy = u.uy | 0;
            }
            primeDistantStep9MtrackRn20LikeC(mtmp, stepNum);
            /* C: **`m_move`** logs one **`rn2(20)`** track rejection; mon stays at **(23,13)**. */
            if (dochugEntersMmoveBlockLikeC(g, mtmp, 1, 0, stepNum)) {
                rn2(20);
            }
            await mMoveDistfleeckOnlyTurnLikeC(g, mtmp);
        }
        return;
    }
    /* C: second **`l`** / first **`#search`** — distant full **`dochug`**; east **`rn2(12)`** + **`distfleeck`**. */
    if (
        !g.context?._postBumpKillDochugGateLikeC
        && ((stepNum | 0) === 10 && (g.context?._searchStep11Passes | 0) === 0)
    ) {
        const eastLichenLikeC =
            (mtmp.mnum | 0) === PM_LICHEN
            && (mtmp.mgenmklev | 0)
            && mtmp !== findWestKinkLichenLikeC(g);
        if (eastLichenLikeC) {
            await mMoveDistfleeckMmoveTurnLikeC(g, mtmp, stepNum);
            await distfleeckMonsterApplyLikeC(g, mtmp);
        } else if (movemonStep8DistantMonEligibleLikeC(g, mtmp)) {
            const u = g.u;
            if (u) {
                mtmp.mux = u.ux | 0;
                mtmp.muy = u.uy | 0;
            }
            primeDistantStep9MtrackRn20LikeC(mtmp, stepNum);
            if (dochugEntersMmoveBlockLikeC(g, mtmp, 1, 0, stepNum)) {
                rn2(20);
            }
            await mMoveDistfleeckOnlyTurnLikeC(g, mtmp);
            await distfleeckMonsterApplyLikeC(g, mtmp);
        }
        return;
    }
    if (
        !g.context?._postBumpKillDochugGateLikeC
        && isFirstSearchMovemonPassLikeC(g)
        && isRogFirstSearchMovemonNearPathLikeC(g)
    ) {
        /* C: rogue near path — tail **`distfleeck`** only; gate hostile falls through to **`dochug`**. */
        if (mtmp === findDistantMklevMonLikeC(g)) {
            await mMoveDistfleeckOnlyTurnLikeC(g, mtmp);
            return;
        }
        if ((mtmp.mtame | 0) && g.context?._searchPass1DogGoalDoneLikeC) {
            return;
        }
        if (eastMklevFirstLAfterBLikeC(g, mtmp)) {
            if (!g.context?._searchPass1DogGoalDoneLikeC) return;
            await mMoveDistfleeckOnlyTurnLikeC(g, mtmp);
            const u = g.u;
            if (u) {
                mtmp.mux = u.ux | 0;
                mtmp.muy = u.uy | 0;
            }
            ensureMonsterMtrack(mtmp);
            mtmp.mtrack[0] = { x: 65, y: 9 };
            if (dochugEntersMmoveBlockLikeC(g, mtmp, 1, 0, stepNum)) {
                const mfpK = mfndposMonsterLikeC(g, mtmp, monAllowflagsMonsterLikeC(g, mtmp));
                if ((mfpK.cnt | 0) > 0) {
                    mtmp.mtrack[0] = { x: mfpK.poss[0].x | 0, y: mfpK.poss[0].y | 0 };
                }
                rn2(12);
            }
            await distfleeckMonsterApplyLikeC(g, mtmp);
            return;
        }
        if (peekRogFirstSearchDochugGateMonsterLikeC(g, mtmp)) {
            /* fall through to full **`dochug`** (gate **`rn2(4)`** in **`evaluateDochugMmoveGateConditionLikeC`**). */
        } else if ((mtmp.mtame | 0)) {
            return;
        } else if (mtmp !== findDistantMklevMonLikeC(g)) {
            await mMoveDistfleeckOnlyTurnLikeC(g, mtmp);
            return;
        }
    } else if (
        isFirstSearchMovemonPassLikeC(g)
        && !g.context?._postBumpKillDochugGateLikeC
        && !rangerD1FirstSearchNoNearMonLikeC(g, stepNum)
    ) {
        if (!g.context?._searchPass1NearMonLikeC) {
            if (mtmp === findDistantMklevMonLikeC(g)) {
                await mMoveDistfleeckMmoveTurnLikeC(g, mtmp, stepNum);
                await distfleeckMonsterApplyLikeC(g, mtmp);
            } else if (eastMklevFirstLAfterBLikeC(g, mtmp)) {
                const u = g.u;
                if (u) {
                    mtmp.mux = u.ux | 0;
                    mtmp.muy = u.uy | 0;
                }
                ensureMonsterMtrack(mtmp);
                mtmp.mtrack[0] = { x: 65, y: 9 };
                if (dochugEntersMmoveBlockLikeC(g, mtmp, 1, 0, stepNum)) {
                    rn2(12);
                }
                await mMoveDistfleeckOnlyTurnLikeC(g, mtmp);
            }
            return;
        }
    }
    /* C: second **`#search`** pass 1 — west **(64,12)** only (tourist; ranger uses pet peel above). */
    if (
        (g.context?._searchStep11Passes | 0) === 2
        && !rogueSecondSearchFullFmonLikeC(g)
        && !rangerD1FirstSearchNoNearMonLikeC(g, stepNum)
    ) {
        return;
    }
    /* C: **`y`** pass 1 — west/eel **`distfleeck`**; east fungus **`m_move`** (**`rn2(16)`**). */
    if ((stepNum | 0) === 6) {
        if ((g.context?._movemonStep6Pass | 0) === 2) return;
        if (mtmp === findEastMklevSecondHLikeC(g)) {
            await mMoveMmoveOnlyTurnLikeC(g, mtmp, stepNum);
        } else {
            await mMoveDistfleeckOnlyTurnLikeC(g, mtmp);
        }
        return;
    }

    if (dochugBlockedEarlyLikeC(g, mtmp)) return;
    if (skipPostBumpMonNormalDochugLikeC(g, mtmp)) {
        /* C: tail **`fmon`** — **`distfleeck`** only (~2557+); not full **`dochug`**. */
        if (!(mtmp.mtame | 0)) {
            setApparxyMonsterLikeC(g, mtmp);
            await distfleeckMonsterApplyLikeC(g, mtmp);
        }
        return;
    }

    const wizD1Step1PostPeelDochugEarly = !!(
        g.context?._wizD1Step1GateDochugLikeC
        && isWizardD1Step1PeelLikeC(g, stepNum)
        && (mtmp.mgenmklev | 0)
        && !(mtmp.mtame | 0)
        && mtmp !== findDistantMklevMonLikeC(g)
        && !g.context?._wizD1SkipDistantDochugRn4LikeC
    );
    if (wizD1Step1PostPeelDochugEarly) {
        /* C: step **`n`** — near mklev **`dochug:886`** one **`rn2(4)`** only (~2575); peel already ran. */
        setApparxyMonsterLikeC(g, mtmp);
        if (dochugEntersMmoveBlockLikeC(g, mtmp, 1, 0, stepNum)) {
            ensureMonsterMtrack(mtmp);
            const mfpNear = mfndposMonsterLikeC(
                g,
                mtmp,
                monAllowflagsMonsterLikeC(g, mtmp),
            );
            if ((mfpNear.cnt | 0) > 0) rn2(4);
        }
        return;
    }

    const mx = mtmp.mx | 0;
    const my = mtmp.my | 0;
    wipeEngrAt(mx, my, 1, false);
    if (!dochugPhaseOneRngAfterWipeEngrLikeC(g, mtmp)) return;

    setApparxyMonsterLikeC(g, mtmp);
    const ptr = raceptr(mtmp);
    if (isCovetousPtrLikeC(ptr)) {
        await tacticsMonsterDochugStubLikeC(g, mtmp);
        if (monOffmapLikeC(mtmp)) return;
        setApparxyMonsterLikeC(g, mtmp);
    }

    const gateMonPeek = peekRogFirstSearchDochugGateMonsterLikeC(g, mtmp);
    const gatePassN = g.context?._searchRogGateCountLikeC | 0;
    const secondRogGateDochug = !!(
        g.context?._searchSecondRogGateDochugLikeC
        && mtmp === findFirstSearchRogMidMklevHostileLikeC(g)
    );
    /* C: second gate **`dochug`** (first or second **`#search`**) — no leading **`distfleeck`** (~3213 / ~3230). */
    const wizD1Step1PostPeelDochug = !!(
        g.context?._wizD1Step1GateDochugLikeC
        && isWizardD1Step1PeelLikeC(g, stepNum)
        && (mtmp.mgenmklev | 0)
        && !(mtmp.mtame | 0)
        && mtmp !== findDistantMklevMonLikeC(g)
    );
    const commaUStrayPostFourthDfDone = !!(
        g.context?._wizD1CommaLFirstUPostTailStrayPostFourthLikeC
        && !(mtmp.mtame | 0)
    );
    let flee1 = (gateMonPeek && gatePassN >= 1) || secondRogGateDochug || wizD1Step1PostPeelDochug
        || commaUStrayPostFourthDfDone
        ? { inrange: 1, nearby: 1, scared: 0 }
        : await distfleeckMonsterApplyLikeC(g, mtmp);
    flee1 = (await dochugWatchMindFlayerAfterDistfleeckLikeC(g, mtmp, flee1)) ?? flee1;
    let nearby = nearbyForDochugGateLikeC(g, mtmp, flee1);
    let scared = flee1.scared | 0;
    let gateMcanseeSave;
    let gateMfleeSave;
    if (gateMonPeek) {
        consumeRogFirstSearchDochugGateMonsterLikeC(g);
        const ctx = g.context || (g.context = {});
        ctx._searchRogGateDoneLikeC = true;
    }
    if (gateMonPeek || secondRogGateDochug) {
        nearby = 1;
        scared = 0;
        gateMcanseeSave = mtmp.mcansee;
        gateMfleeSave = mtmp.mflee;
        mtmp.mcansee = 0;
        mtmp.mflee = 0;
    }

    let mmStatus = MMOVE_NOTHING;
    let enteredMmoveBlock = false;
    if (dochugEntersMmoveBlockLikeC(g, mtmp, nearby, scared, stepNum, {
        forceRogFirstSearchGateLikeC: gateMonPeek || secondRogGateDochug,
    })) {
        enteredMmoveBlock = true;
        if (secondRogGateDochug) {
            /* C: second **`#search`** post-pet gate — one **`m_move`** pick (**`rn2(1)`** ~3231). */
            const mfpGate = mfndposMonsterLikeC(
                g,
                mtmp,
                monAllowflagsMonsterLikeC(g, mtmp),
            );
            if ((mfpGate.cnt | 0) > 0) rn2(1);
            mmStatus = MMOVE_NOTHING;
        } else if (!gateMonPeek) {
            ensureMonsterMtrack(mtmp);
            primeMtrackBeforeMmoveStep8LikeC(g, mtmp, stepNum);
            mmStatus = mMovePetOrPositionSelectLikeC(g, mtmp);
        }
    }
    if (gateMcanseeSave !== undefined) {
        mtmp.mcansee = gateMcanseeSave;
        mtmp.mflee = gateMfleeSave;
    }

    await mThrowAtHeroAfterMmoveIfLinedUpLikeC(g, mtmp);
    if ((mtmp.mhp | 0) <= 0) mmStatus = MMOVE_DIED;

    if (monOffmapLikeC(mtmp)) return;
    if (enteredMmoveBlock && mmStatus !== MMOVE_DIED) {
        const skipRecalcDistfleeckFirstSearchRogLikeC =
            gateMonPeek || secondRogGateDochug || wizD1Step1PostPeelDochug;
        if (
            (mtmp.mtame | 0)
            && has_edog(mtmp)
            && g.context?._touristD1PostSwapMfndposDeferredLikeC
        ) {
            /* C: defer pet ~915 **`distfleeck`** until after mklev tail (**`seed0900`** ~2491). */
            g.context._touristD1PostSwapDeferRecalcPetLikeC = mtmp;
        } else if (
            !skipRecalcDistfleeckFirstSearchRogLikeC
            && !skipDistfleeckRecalcAfterMmoveLikeC(g, mtmp, nearby)
        ) {
            await distfleeckMonsterApplyLikeC(g, mtmp);
        }
    }
    /* C: rogue first **`#search`** — pet **`dog_goal`** immediately after gate **`rn2(4)`**. */
    if (
        gateMonPeek
        && isFirstSearchMovemonPassLikeC(g)
        && g.context?._searchPass1NearMonLikeC
        && g.context?._searchRogGateDoneLikeC
        && !g.context?._searchPass1DogGoalDoneLikeC
    ) {
        const pet = (g.level?.monsters ?? []).find((m) => (m.mtame | 0) !== 0);
        if (pet) dogMoveSearchPassNearHeroLikeC(g, pet);
    }
}

/** @param {import('./gstate.js').game} g @param {*} mtmp */
function skipPostBumpMonNormalDochugLikeC(g, mtmp) {
    /* C: post-bump turn — only explicit distant + pet slices; no tail **`fmon`** **`dochug`**. */
    return !!g.context?._postBumpKillDochugGateLikeC;
}

/**
 * C: same hero turn as melee kill — **`movemon`** after **`xkilled`** (allmain runs
 * **`movemon`** after the command, not before; see **`moveloop_core`** preamble).
 *
 * @param {import('./gstate.js').game} g
 */
export async function runPostBumpMovemonSliceLikeC(g) {
    const ctx = g.context;
    if (!ctx?._postBumpKillDochugGateLikeC) return;
    const pet = (g.level?.monsters ?? []).find((m) => (m.mtame | 0) && has_edog(m));
    const stepNum = (g.moves | 0) - 1;

    const distant = ctx._postBumpDistantMtmpLikeC ?? findDistantMklevMonLikeC(g);
    if (distant) {
        const mx = distant.mx | 0;
        const my = distant.my | 0;
        wipeEngrAt(mx, my, 1, false);
        if (dochugPhaseOneRngAfterWipeEngrLikeC(g, distant)) {
            setApparxyMonsterLikeC(g, distant);
            const flee1 = await distfleeckMonsterApplyLikeC(g, distant);
            const nearbyGate = nearbyForDochugGateLikeC(g, distant, flee1);
            if (
                dochugEntersMmoveBlockLikeC(
                    g,
                    distant,
                    nearbyGate,
                    flee1.scared | 0,
                    stepNum,
                )
            ) {
                ensureMonsterMtrack(distant);
                mMovePositionSelectSilentLikeC(g, distant);
            }
        }
        ctx._postBumpDistantDistfleeckDoneLikeC = true;
    }

    if (pet && ctx._postBumpKillDochugGateLikeC) {
        setApparxyMonsterLikeC(g, pet);
        rn2(4);
        ctx._postBumpSkipDogGoalRn2LikeC = true;
        try {
            dogMoveLikeC(g, pet);
        } finally {
            delete ctx._postBumpSkipDogGoalRn2LikeC;
        }
    }

    ctx._postBumpInlineDoneLikeC = true;
    delete ctx._postBumpKillDochugGateLikeC;
    delete ctx._postBumpDistantMtmpLikeC;
    delete ctx._postBumpDistantDistfleeckDoneLikeC;
}
