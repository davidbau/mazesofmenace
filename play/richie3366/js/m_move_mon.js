// m_move_mon.js — **`mon.c`** **`m_move()`** subset invoked from **`monmove.c`** **`movemon`**.
// C ref: mon.c **`m_move(struct monst *mtmp, int after)`**; monmove.c **`movemon`** walks **`fmon`**.
//
// Ported: C **`monmove.c`** **`dochug`** — **`wipe_engr_at`** (~734); phase-one **`rn2`** (~737–760), **`m_respond`** (~752–755);
// **`set_apparxy`** (~778); covetous **`tactics`** + **`mstate`** early out + second **`set_apparxy`** (~782–787);
// first **`distfleeck`** (~791); **`m_move`**/**`m_throw`**; **`mon_offmap`** early **`return`** (~912–913) before second **`distfleeck`** (~915) when
// **`status != MMOVE_DIED`** (**`MMOVE_DIED`** vs hero **`thitu`** / future **`m_move`** death).
// **`stepNum===0`**: **`movemon`** not called (**`moveloop_turn_advance`** **`stepNum > 0`**). **`stepNum ≥ 2`**:
// both **`distfleeck`** calls; **`monmove.js`** harness rows **3–12** omit aggregate **`rn2(5)`** from **`distfleeck`**.
// **`mcalcmove`**: **`allmain.js`** adds **`movement`** each **`context.move`**; this path subtracts **`NORMAL_SPEED`** before **`distfleeck`**/**`m_throw`** (C order: spend then **`dochugw`** subtree).
// Omits **`minliquid`**, misc_worn, hider/eel, **`fightm`**, grid **`domove`**, vault guard, worm tails.

import { NORMAL_SPEED, MMOVE_DIED, MMOVE_NOTHING } from './const.js';
import { mThrowAtHeroAfterMmoveIfLinedUpLikeC } from './mthrow_mon.js';
import { distfleeckMonsterApplyLikeC } from './distfleeck_mon.js';
import { wipeEngrAt } from './engrave.js';
import { setApparxyMonsterLikeC } from './set_apparxy_mon.js';
import { canTeleportMon, teleRestrictMon, raceptr, isCovetousPtrLikeC, monOffmapLikeC } from './mondata.js';
import { tacticsMonsterDochugStubLikeC } from './tactics_mon.js';
import { mRespondMonsterDochugLikeC } from './m_respond_mon.js';
import { rn2 } from './rng.js';

/**
 * C: monmove.c dochug ~736–760 — **`m_respond`** (~752–755) before mflee courage.
 * Teleport branch: !rn2(40) only when mflee.
 * @param {import('./gstate.js').game} g
 * @param {*} mtmp
 * @returns {boolean} false if **`DEADMONSTER`** after **`m_respond`** (C returns 1 from dochug)
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
        mflee &&
        !rn2(40) &&
        ptr &&
        canTeleportMon(ptr) &&
        !(mtmp.iswiz | 0) &&
        !teleRestrictMon(g, mtmp)
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
 * C: **`mon.c`** **`m_move(mtmp, 0)`** — one monster’s turn (**subset**).
 * @param {import('./gstate.js').game} g
 * @param {*} mtmp
 * @param {number} [stepNum] — 1-based moveloop step index (**`movemon`**).
 */
export async function mMoveOneMonsterSubsetLikeC(g, mtmp, stepNum = 0) {
    if (!mtmp) return;
    if ((mtmp.mhp | 0) <= 0) return;
    /* C: mon.c movemon_singlemon — if (mtmp->movement < NORMAL_SPEED) return FALSE; mtmp->movement -= NORMAL_SPEED; */
    const mov = mtmp.movement | 0;
    if (mov < NORMAL_SPEED) return;
    mtmp.movement = mov - NORMAL_SPEED;

    if (stepNum >= 2) {
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
        await distfleeckMonsterApplyLikeC(g, mtmp);
    }

    /** @type {number} */
    let mmStatus = MMOVE_NOTHING; /* C m_move status; MMOVE_DIED if mhp<=0 after m_throw */
    await mThrowAtHeroAfterMmoveIfLinedUpLikeC(g, mtmp);
    if ((mtmp.mhp | 0) <= 0) mmStatus = MMOVE_DIED;

    /* C: monmove.c dochug ~912 — after m_move; skip second distfleeck (return 1 from dochug). */
    if (monOffmapLikeC(mtmp)) return;

    if (stepNum >= 2 && mmStatus !== MMOVE_DIED) await distfleeckMonsterApplyLikeC(g, mtmp);
}
