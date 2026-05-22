// m_move_mon.js — **`mon.c`** **`m_move()`** / **`monmove.c`** **`dochug`** subset from **`movemon`**.
// C ref: mon.c **`m_move()`** ~1715+; monmove.c **`dochug`** ~690+; **`movemon_singlemon`** → **`dochugw`**.

import { NORMAL_SPEED, MMOVE_DIED, MMOVE_MOVED, MMOVE_NOTHING } from './const.js';

/** C: defsym.h — leprechaun. */
const S_LEPRECHAUN = 46;
import { mThrowAtHeroAfterMmoveIfLinedUpLikeC } from './mthrow_mon.js';
import { distfleeckMonsterApplyLikeC } from './distfleeck_mon.js';
import { wipeEngrAt } from './engrave.js';
import { setApparxyMonsterLikeC } from './set_apparxy_mon.js';
import {
    canTeleportMon,
    teleRestrictMon,
    raceptr,
    isCovetousPtrLikeC,
    monOffmapLikeC,
} from './mondata.js';

/** C: mondata.h **`perceives`** — **`M1_SEE_INVIS`**. */
const M1_SEE_INVIS = 0x01000000;
function perceivesPtrLikeC(ptr) {
    return ((ptr?.mflags1 ?? 0) & M1_SEE_INVIS) !== 0;
}
import { tacticsMonsterDochugStubLikeC } from './tactics_mon.js';
import { mRespondMonsterDochugLikeC } from './m_respond_mon.js';
import { disturbMonsterLikeC } from './disturb_mon.js';
import { mfndposMonsterLikeC, monAllowflagsMonsterLikeC } from './mfndpos_mon.js';
import { ensureMonsterMtrack } from './monflee.js';
import { dist2 } from './hacklib.js';
import { couldsee } from './vision.js';
import { rn2 } from './rng.js';

/** C: monmove.c **`MTSZ`**. */
const MTSZ = 4;

function heroInvisLikeC(u) {
    if (!u) return false;
    return !!((u.HInvis | 0) || (u.EInvis | 0) || (u.BInvis | 0));
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
        || (mlet === S_LEPRECHAUN && !rn2(2))
        || ((u?.Conflict | 0) && !(mtmp.iswiz | 0))
        || (!(mtmp.mcansee | 0) && !rn2(4))
        || (mtmp.mpeaceful | 0)
    ) {
        return true;
    }
    return false;
}

/**
 * C: monmove.c **`m_move`** ~1857–1983 — **`appr`** + **`mfndpos`** + track **`rn2(4*(cnt-j))`** loop.
 * Does not **`postmov`** / change **`mx,my`** yet.
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

    if ((mtmp.mconf | 0) /* || engulfing_u — not ported */) {
        appr = 0;
    } else {
        const shouldSee =
            couldsee(omx, omy)
            && (dist2(omx, omy, ggx, ggy) <= 36);
        if (
            !(mtmp.mcansee | 0)
            || (shouldSee && heroInvisLikeC(u) && ptr && !perceivesPtrLikeC(ptr) && !rn2(11))
        ) {
            appr = 0;
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

    for (let i = 0; i < cnt; i++) {
        const nx = mfp.poss[i].x | 0;
        const ny = mfp.poss[i].y | 0;

        if (appr !== 0) {
            const mtrk = mtmp.mtrack;
            let skipPos = false;
            for (let j = 0; j < jcnt; j++) {
                const tr = mtrk?.[j];
                if (tr && nx === (tr.x | 0) && ny === (tr.y | 0) && rn2(4 * (cnt - j))) {
                    skipPos = true;
                    break;
                }
            }
            if (skipPos) continue;
        }

        const nearer = dist2(nx, ny, ggx, ggy) < nidist;
        if (
            (appr === 1 && nearer)
            || (appr === -1 && !nearer)
            || (!appr && !rn2(++chcnt))
            || mmoved === MMOVE_NOTHING
        ) {
            nix = nx;
            niy = ny;
            nidist = dist2(nix, niy, ggx, ggy);
            chi = i;
            mmoved = MMOVE_MOVED;
        }
    }
    void chi;
    void nix;
    void niy;
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
 * C: **`mon.c`** **`movemon_singlemon`** → **`dochugw`** / **`dochug`** subset for one **`fmon`** entry.
 * @param {import('./gstate.js').game} g
 * @param {*} mtmp
 * @param {number} [_stepNum] — moveloop index (unused; C has no step gate)
 */
export async function mMoveOneMonsterSubsetLikeC(g, mtmp, _stepNum = 0) {
    if (!mtmp) return;
    if ((mtmp.mhp | 0) <= 0) return;
    const mov = mtmp.movement | 0;
    if (mov < NORMAL_SPEED) return;
    mtmp.movement = mov - NORMAL_SPEED;

    if ((mtmp.msleeping | 0) && !disturbMonsterLikeC(g, mtmp)) return;

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
