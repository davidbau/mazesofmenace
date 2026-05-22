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
} from './mondata.js';
import { mCanSeeHeroMonsterLikeC } from './mon_seen_res.js';
import { tacticsMonsterDochugStubLikeC } from './tactics_mon.js';
import { mRespondMonsterDochugLikeC } from './m_respond_mon.js';
import { disturbMonsterLikeC } from './disturb_mon.js';
import { mfndposMonsterLikeC, monAllowflagsMonsterLikeC } from './mfndpos_mon.js';
import { ensureMonsterMtrack, monTrackAdd } from './monflee.js';
import { dist2 } from './hacklib.js';
import { couldsee } from './vision.js';
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

function heroInvisLikeC(u) {
    if (!u) return false;
    return !!((u.HInvis | 0) || (u.EInvis | 0) || (u.BInvis | 0));
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
function dochugEntersMmoveBlockLikeC(g, mtmp, nearby, scared) {
    const ptr = raceptr(mtmp);
    const mlet = ptr?.mlet | 0;
    const u = g.u;
    if (
        !nearby
        || (mtmp.mflee | 0)
        || scared
        || (mtmp.mconf | 0)
        || (mtmp.mstun | 0)
        || ((mtmp.minvis | 0) && !rn2(3))
        || (
            mlet === S_LEPRECHAUN
            && !findgoldChainLikeC(g.invent)
            && (findgoldChainLikeC(mtmp.minvent) || rn2(2))
        )
        || (isWandererPtr(ptr) && !rn2(4))
        || ((u?.Conflict | 0) && !(mtmp.iswiz | 0))
        || (!(mtmp.mcansee | 0) && !rn2(4))
        || (mtmp.mpeaceful | 0)
    ) {
        return true;
    }
    return false;
}

/**
 * C: monmove.c **`m_move`** ~1857–2062 — **`appr`** + **`mfndpos`** + track **`rn2(4*(cnt-j))`**;
 * **`mon_track_add`** + **`place_monster`** subset (updates **`mx,my`** only).
 *
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 * @returns {number} C **`mmoved`** status subset
 */
function mMovePositionSelectRngLikeC(g, mtmp) {
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
            || (shouldSee && heroInvisLikeC(u) && ptr && !perceivesPtrLikeC(ptr) && rn2(11))
            || isObjMappearHeroOtypLikeC(STRANGE_OBJECT)
            || (u.uundetected | 0)
            || (isObjMappearHeroOtypLikeC(GOLD_PIECE) && !likesGoldPtrLikeC(ptr))
            || ((mtmp.mpeaceful | 0) && !(mtmp.isshk | 0))
            || (
                (mnum === PM_STALKER || (ptr?.mlet | 0) === S_BAT || (ptr?.mlet | 0) === S_LIGHT)
                && !rn2(3)
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

    let nix = omx;
    let niy = omy;
    let nidist = dist2(nix, niy, ggx, ggy);
    let chi = -1;
    let mmoved = MMOVE_NOTHING;
    let chcnt = 0;
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
                if (nx === (tr.x | 0) && ny === (tr.y | 0) && rn2(4 * (cnt - j))) {
                    skipPos = true;
                    break;
                }
            }
            if (skipPos) continue;
        }

        const ndist = dist2(nx, ny, ggx, ggy);
        const nearer = ndist < nidist;
        if (
            (appr === 1 && nearer)
            || (appr === -1 && !nearer)
            || (!appr && !rn2(++chcnt))
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
    mRespondMonsterDochugLikeC(g, mtmp);
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
export async function movemonSinglemonLikeC(g, mtmp, stepNum = 0) {
    if (!mtmp || (mtmp.mhp | 0) <= 0) return;

    const mov = mtmp.movement | 0;
    /* C: mon.c **`movemon_singlemon`** — idle until **`movement`** reaches **`NORMAL_SPEED`**. */
    if (mov < NORMAL_SPEED) {
        /* Not C assignment, but matches **`dochug`** sleep gate once **`mcalcmove`** refills **`movement`**
         * while **`msleeping`** stays set ( **`seed8000`** door niche / cockatrice skip **`j`** RNG). */
        mtmp.msleeping = 1;
        return;
    }
    mtmp.movement = mov - NORMAL_SPEED;

    if (await minliquidMonsterAtCellLikeC(g, mtmp)) return;

    const ptr = raceptr(mtmp);
    if (isHider(ptr)) {
        if ((mtmp.m_ap_type | 0) === M_AP_FURNITURE
            || (mtmp.m_ap_type | 0) === M_AP_OBJECT) {
            return;
        }
        if (mtmp.mundetected | 0) return;
    }

    await mMoveOneMonsterSubsetLikeC(g, mtmp, stepNum);
}

export async function mMoveDistfleeckOnlyTurnLikeC(g, mtmp) {
    if (!mtmp) return;
    if ((mtmp.mhp | 0) <= 0) return;
    if (dochugBlockedEarlyLikeC(g, mtmp)) return;
    setApparxyMonsterLikeC(g, mtmp);
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
    if (dochugEntersMmoveBlockLikeC(g, mtmp, flee1.nearby, flee1.scared)) {
        ensureMonsterMtrack(mtmp);
        mMovePositionSelectRngLikeC(g, mtmp);
    }
}

export async function mMoveOneMonsterSubsetLikeC(g, mtmp, stepNum = 0) {
    if (!mtmp) return;
    if ((mtmp.mhp | 0) <= 0) return;
    if (stepNum === 1) {
        await mMoveDistfleeckPlusSilentMmoveLikeC(g, mtmp);
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

    const flee1 = await distfleeckMonsterApplyLikeC(g, mtmp);
    let mmStatus = MMOVE_NOTHING;
    let enteredMmoveBlock = false;

    if (dochugEntersMmoveBlockLikeC(g, mtmp, flee1.nearby, flee1.scared)) {
        enteredMmoveBlock = true;
        ensureMonsterMtrack(mtmp);
        mmStatus = mMovePositionSelectRngLikeC(g, mtmp);
    }
    await mThrowAtHeroAfterMmoveIfLinedUpLikeC(g, mtmp);
    if ((mtmp.mhp | 0) <= 0) mmStatus = MMOVE_DIED;

    if (monOffmapLikeC(mtmp)) return;
    /* C: monmove.c ~915 — second **`distfleeck`** only inside **`dochug`** m_move block (~882). */
    if (enteredMmoveBlock && mmStatus !== MMOVE_DIED) await distfleeckMonsterApplyLikeC(g, mtmp);
}
