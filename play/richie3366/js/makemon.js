// makemon.js — Create monsters (stub until makemon.c is ported).
// C ref: makemon.c makemon(); rndmonst() path for ptr === null.

import { game } from './gstate.js';
import { rnd, rn2 } from './rng.js';

/**
 * C: makemon.c rndmonst-style selection — weighted loop not ported; contest stub.
 * Used by mkcorpstat when pm is null.
 */
export function rndmonnum() {
    rn2(398);
    return 0;
}

/**
 * C: makemon(struct permonst *mdat, coordxy x, coordxy y, mmflags_nht mmflags)
 * **`[0,0]`** → C “anyplace” (**`makemon_rnd_goodpos`**); stub uses hero **`u.ux`/`u.uy`** until **`goodpos`** is ported.
 * Random **`mdat`** (**`rndmonst`**) — **`rndmonnum()`** stub (**`rn2(398)`**).
 * @returns {{ mx: number, my: number, mhp: number, mhpmax: number, msleeping: number, mpeaceful: number, mtame: number, mnum: number, mcanmove?: number, mfrozen?: number, mvflags?: number }|null}
 */
export function makemon(mdat, x, y, mmflags) {
    void mmflags;
    let px = x | 0;
    let py = y | 0;
    if (px === 0 && py === 0) {
        px = game.u?.ux | 0;
        py = game.u?.uy | 0;
    }
    let mnum = 0;
    if (mdat === null) {
        rndmonnum();
    } else if (mdat && typeof mdat === 'object' && typeof mdat.mnum === 'number') {
        mnum = mdat.mnum | 0;
    }
    const hp = rnd(8);
    return {
        mx: px,
        my: py,
        mhp: hp,
        mhpmax: hp,
        msleeping: 0,
        mpeaceful: 0,
        mtame: 0,
        mnum,
        mcanmove: 1,
        mfrozen: 0,
        mflee: 0,
        mfleetim: 0,
    };
}
