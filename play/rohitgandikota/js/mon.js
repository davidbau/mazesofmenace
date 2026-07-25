// mon.js — monster bookkeeping.
// C ref: src/mon.c
//
// Only the once-per-turn allotment is here so far. mcalcmove() is the first
// thing every game turn draws: one rn2(NORMAL_SPEED) per monster on the level,
// unconditionally, so the count is the monster census and a level generated
// with the wrong number of monsters desynchronises on its very first turn.

import { game } from './gstate.js';
import { rn2 } from './rng.js';

// include/permonst.h:80
export const NORMAL_SPEED = 12;

// include/monst.h — mspeed values
const MSLOW = 1, MFAST = 2;

// src/mon.c:1130 mcalcmove()
export function mcalcmove(mon, m_moving) {
    let mmove = mon.data.mmove;

    if (mon.mspeed === MSLOW) {
        if (mmove < NORMAL_SPEED)
            mmove = Math.trunc((2 * mmove + 1) / 3);
        else
            mmove = 4 + Math.trunc(mmove / 3);
    } else if (mon.mspeed === MFAST) {
        mmove = Math.trunc((4 * mmove + 2) / 3);
    }

    /* the u.usteed gallop branch needs a steed; nothing rides yet */

    if (m_moving) {
        /* Randomly round the speed to a multiple of NORMAL_SPEED. The rn2 is
           evaluated before the comparison, so it fires even when mmove is
           already a multiple and mmove_adj is 0. */
        const mmove_adj = mmove % NORMAL_SPEED;
        mmove -= mmove_adj;
        if (rn2(NORMAL_SPEED) < mmove_adj)
            mmove += NORMAL_SPEED;
    }
    return mmove;
}

// src/mon.c mcalcdistress() — per-turn status effects. Everything it touches
// (stoning, sliming, timed invisibility, ...) needs subsystems that are not
// ported, and none of them draw for a monster with no such state.
export function mcalcdistress() {
    /* nothing to do while no monster carries a timed affliction */
}

// src/mon.c:298 movemon() — let every monster take its turn.
export function movemon() {
    let somebody_can_move = false;
    for (const mtmp of game.level?.monsters || []) {
        if (mtmp.mhp <= 0) continue;
        if (movemon_singlemon(mtmp)) somebody_can_move = true;
    }
    return somebody_can_move;
}

function movemon_singlemon(mtmp) {
    /* A monster only acts once it has banked NORMAL_SPEED of movement. */
    if (!(mtmp.movement >= NORMAL_SPEED))
        return mtmp.movement > 0;
    mtmp.movement -= NORMAL_SPEED;
    dochug(mtmp);
    return mtmp.movement >= NORMAL_SPEED;
}

import { dochug } from './monmove.js';
