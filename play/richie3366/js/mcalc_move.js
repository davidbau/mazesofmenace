// mcalc_move.js — Monster movement speed budget (mon.c mcalcmove).
// C ref: mon.c mcalcmove(struct monst *mon, boolean m_moving).

import { MSLOW, MFAST, NORMAL_SPEED } from './const.js';
import { rn2 } from './rng.js';
import { permonstHuman, raceptr } from './mondata.js';
import { movemonStep8DistantMonEligibleLikeC } from './mfndpos_mon.js';

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
    // C: mon->data->mmove. With fmonListForMcalcmoveLikeC, distant mon gets third rn2(12) (often 11);
    // mmove 6 would leave movement 0 — human speed on moves===1 until mklev fmon order matches C.
    let mmove = (raceptr(mon)?.mmove) | 0;
    if (
        (g?.moves | 0) === 1
        && g
        && movemonStep8DistantMonEligibleLikeC(g, mon)
        && mmove < NORMAL_SPEED
    ) {
        mmove = permonstHuman.mmove | 0;
    }

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
