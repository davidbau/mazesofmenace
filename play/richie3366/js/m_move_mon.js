// m_move_mon.js — **`mon.c`** **`m_move()`** subset invoked from **`monmove.c`** **`movemon`**.
// C ref: mon.c **`m_move(struct monst *mtmp, int after)`**; monmove.c **`movemon`** walks **`fmon`**.
//
// Ported: **`distfleeck`** on **`stepNum===2`**; **`m_throw`**; **`movement`** gate (**`mon.c` `movemon_singlemon`**).
// **`mcalcmove`**: **`allmain.js`** adds **`movement`** each **`context.move`**; this path subtracts **`NORMAL_SPEED`** before **`distfleeck`**/**`m_throw`** (C order: spend then **`dochugw`** subtree).
// Omits **`minliquid`**, misc_worn, hider/eel, **`fightm`**, grid **`domove`**, vault guard, worm tails.

import { NORMAL_SPEED } from './const.js';
import { mThrowAtHeroAfterMmoveIfLinedUpLikeC } from './mthrow_mon.js';
import { distfleeckMonsterApplyLikeC } from './distfleeck_mon.js';

/**
 * C: **`mon.c`** **`m_move(mtmp, 0)`** — one monster’s turn (**subset**).
 * @param {import('./gstate.js').game} g
 * @param {*} mtmp
 * @param {number} [stepNum] — 1-based moveloop step index (**`movemon`**); **`distfleeck`** when **2** only (harness pairing).
 */
export async function mMoveOneMonsterSubsetLikeC(g, mtmp, stepNum = 0) {
    if (!mtmp) return;
    if ((mtmp.mhp | 0) <= 0) return;
    /* C: mon.c movemon_singlemon — if (mtmp->movement < NORMAL_SPEED) return FALSE; mtmp->movement -= NORMAL_SPEED; */
    const mov = mtmp.movement | 0;
    if (mov < NORMAL_SPEED) return;
    mtmp.movement = mov - NORMAL_SPEED;
    if (stepNum === 2) await distfleeckMonsterApplyLikeC(g, mtmp);
    await mThrowAtHeroAfterMmoveIfLinedUpLikeC(g, mtmp);
}
