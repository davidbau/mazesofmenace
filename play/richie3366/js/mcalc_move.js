// mcalc_move.js — Monster movement speed budget (mon.c mcalcmove).
// C ref: mon.c mcalcmove(struct monst *mon, boolean m_moving).

import { MSLOW, MFAST, NORMAL_SPEED } from './const.js';
import { rn2 } from './rng.js';
import { raceptr } from './mondata.js';
import { MONS_MMOVE } from './mons_rndmonst_ini_inv_data.js';

/**
 * C: mon.c **`mcalcmove(mon, m_moving)`** — speed for **`mon->movement`** allocation (**subset**).
 * **`m_moving`**: when **true**, applies **`rn2(NORMAL_SPEED)`** rounding like C.
 *
 * @param {Record<string, unknown>} mon
 * @param {boolean} mMoving
 * @param {import('./gstate.js').game} [g]
 * @returns {number}
 */
export function mcalcMoveLikeC(mon, mMoving, g) {
    const mndx = mon.mnum | 0;
    /* **`mcalcmove`** runs before **`moves++`**; first allocation uses **`raceptr`** ( **`permonstHuman.mmove`** until **`MONS_MMOVE`** wired on permonst). */
    let mmove = ((g?.moves | 0) === 1)
        ? ((raceptr(mon)?.mmove) | 0)
        : ((MONS_MMOVE[mndx] ?? raceptr(mon)?.mmove) | 0);

    if ((mon.mspeed | 0) === MSLOW) {
        if (mmove < NORMAL_SPEED) mmove = Math.trunc((2 * mmove + 1) / 3);
        else mmove = 4 + Math.trunc(mmove / 3);
    } else if ((mon.mspeed | 0) === MFAST) {
        mmove = Math.trunc((4 * mmove + 2) / 3);
    }

    const u = g?.u;
    if (u && mon === u.usteed && (u.ugallop | 0) && g?.context?.move) {
        mmove = Math.trunc(((rn2(2) ? 4 : 5) * mmove) / 3);
    }

    if (mMoving) {
        const mmove_adj = mmove % NORMAL_SPEED;
        mmove -= mmove_adj;
        if (rn2(NORMAL_SPEED) < mmove_adj) mmove += NORMAL_SPEED;
    }
    return mmove;
}
