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
    findWestKinkLichenLikeC,
    findWestKinkMonsterLikeC,
    isLandEelForMovemonLikeC,
    movemonStep8DistantMonEligibleLikeC,
    westFungusDoorNicheAtLikeC,
    eastFungusDoorNicheAtLikeC,
    mfndposMonsterLikeC,
    monAllowflagsMonsterLikeC,
    firstSearchNearMklevHostileLikeC,
    findFirstSearchRogMidMklevHostileLikeC,
} from './mfndpos_mon.js';
import { ensureMonsterMtrack, monTrackAdd, monTrackClear } from './monflee.js';
import {
    dogMoveLikeC,
    dogMoveOntoApportTowelLikeC,
    dogMoveSearchPassNearHeroLikeC,
} from './dogmove_mon.js';
import { monnearMonsterXYLikeC } from './mon_geom.js';
import {
    isFirstSearchMovemonPassLikeC,
    isMovemonStepOnePeelLikeC,
    isRogFirstSearchStepOnePeelLikeC,
    isRogueColonMovemonActiveLikeC,
    isSecondSearchMovemonPassLikeC,
    rogueSecondSearchFullFmonLikeC,
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
import { rn2 } from './rng.js';
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

function evaluateDochugMmoveGateConditionLikeC(g, mtmp, nearby, scared) {
    const ptr = raceptr(mtmp);
    const mlet = ptr?.mlet | 0;
    const u = g.u;
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
    /* C: second **`#search`** — pass 1 west **`m_move`**; pass 2 east **`m_move`** (inverse of **`y`**). */
    if ((g.context?._searchStep11Passes | 0) === 2 && !rogueSecondSearchFullFmonLikeC(g)) {
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

function mMovePositionSelectRngLikeC(g, mtmp) {
    return mMovePositionSelectLikeC(g, mtmp, false);
}

/**
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 * @param {boolean} silent
 */
function mMovePositionSelectLikeC(g, mtmp, silent) {
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
    const cnt = mfp.cnt | 0;
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

    for (let i = 0; i < cnt; i++) {
        const nx = mfp.poss[i].x | 0;
        const ny = mfp.poss[i].y | 0;

        if (appr !== 0) {
            ensureMonsterMtrack(mtmp);
            const mtrk = mtmp.mtrack;
            let skipPos = false;
            for (let j = 0; j < jcnt; j++) {
                const tr = mtrk[j];
                if (nx === (tr.x | 0) && ny === (tr.y | 0)
                    && (silent || rn2(4 * (cnt - j)))) {
                    skipPos = true;
                    break;
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
                && (silent ? mmoved === MMOVE_NOTHING : !rn2(++chcnt))
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
async function mMoveMmoveOnlyTurnLikeC(g, mtmp, stepNum = 0) {
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
        return dogMoveLikeC(g, mtmp);
    }
    return mMovePositionSelectRngLikeC(g, mtmp);
}

export async function movemonSinglemonLikeC(g, mtmp, stepNum = 0) {
    if (!mtmp || (mtmp.mhp | 0) <= 0) return;
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
            await mMoveDistfleeckOnlyTurnLikeC(g, mtmp);
            return;
        }
        /* fall through — post-pet gate **`dochug`** (**`rn2(4)`** ~3230). */
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
        && mtmp === findWestKinkMonsterLikeC(g)
    ) {
        const u = g.u;
        if (u) {
            mtmp.mux = u.ux | 0;
            mtmp.muy = u.uy | 0;
        }
        await distfleeckMonsterApplyLikeC(g, mtmp);
        ensureMonsterMtrack(mtmp);
        const mfpWest = mfndposMonsterLikeC(g, mtmp, monAllowflagsMonsterLikeC(g, mtmp));
        if ((mfpWest.cnt | 0) > 0) {
            mtmp.mtrack[0] = { x: mfpWest.poss[0].x | 0, y: mfpWest.poss[0].y | 0 };
        }
        rn2(16);
        await distfleeckMonsterApplyLikeC(g, mtmp);
        await distfleeckMonsterApplyLikeC(g, mtmp);
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
        if (!peelMon && !midMklevHostile) return;
    }
    if (
        (g.context?._searchStep11Passes | 0) === 2
        && !rogueSecondSearchFullFmonLikeC(g)
        && (g.context?._movemonSearch11SubPass | 0) === 1
    ) {
        if (mtmp !== findWestKinkMonsterLikeC(g)) return;
    }
    let mov = mtmp.movement | 0;
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
        if (
            !eastMklevLowMovDochugLikeC
            && !((stepNum | 0) === 6 && mtmp === findEastMklevSecondHLikeC(g))
            && !firstSearchNearMklevHostileLikeC(g, mtmp)
            && !isRogPeelMklevDistfleeckCandidateLikeC(g, mtmp, stepNum)
        ) return;
    } else {
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

    await mMoveOneMonsterSubsetLikeC(g, mtmp, stepNum);
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
            && mtmp === findDistantMklevMonLikeC(g)) {
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

export async function mMoveOneMonsterSubsetLikeC(g, mtmp, stepNum = 0) {
    if (!mtmp) return;
    if ((mtmp.mhp | 0) <= 0) return;
    if (isMovemonStepOnePeelLikeC(g, stepNum)) {
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
            if (isLandEelForMovemonLikeC(g, mtmp)) {
                await mMoveDistfleeckPlusSilentMmoveNoExtraRngLikeC(g, mtmp, stepNum);
            } else {
                await mMoveDistfleeckOnlyTurnLikeC(g, mtmp);
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
        ((stepNum | 0) === 10 && (g.context?._searchStep11Passes | 0) === 0)
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
    if (isFirstSearchMovemonPassLikeC(g) && isRogFirstSearchMovemonNearPathLikeC(g)) {
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
    } else if (isFirstSearchMovemonPassLikeC(g)) {
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
    /* C: second **`#search`** pass 1 — west **(64,12)** only (handled in **`monmove.js`** pass 1). */
    if ((g.context?._searchStep11Passes | 0) === 2 && !rogueSecondSearchFullFmonLikeC(g)) {
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
    /* C: second gate **`dochug`** on first **`#search`** — no leading **`distfleeck`** (~3213). */
    const flee1 = gateMonPeek && gatePassN >= 1
        ? { inrange: 1, nearby: 1, scared: 0 }
        : await distfleeckMonsterApplyLikeC(g, mtmp);
    let nearby = flee1.nearby | 0;
    let scared = flee1.scared | 0;
    let gateMcanseeSave;
    let gateMfleeSave;
    if (gateMonPeek) {
        consumeRogFirstSearchDochugGateMonsterLikeC(g);
        const ctx = g.context || (g.context = {});
        ctx._searchRogGateDoneLikeC = true;
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
        forceRogFirstSearchGateLikeC: gateMonPeek,
    })) {
        enteredMmoveBlock = true;
        if (
            g.context?._searchSecondRogGateDochugLikeC
            && mtmp === findFirstSearchRogMidMklevHostileLikeC(g)
        ) {
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
        const skipRecalcDistfleeckFirstSearchRogLikeC = gateMonPeek;
        if (!skipRecalcDistfleeckFirstSearchRogLikeC) {
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
