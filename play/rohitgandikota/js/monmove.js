// monmove.js — monster movement.
// C ref: src/monmove.c
//
// distfleeck() draws rn2(5) unconditionally at its head (the "brave gremlin"
// roll), once per monster that acts, so it is the first thing a turn with
// awake monsters spends after the movement allotment.

import { game } from './gstate.js';
import { rn2 } from './rng.js';

// src/monmove.c:532 distfleeck()
export function distfleeck(mtmp) {
    const bravegremlin = (rn2(5) === 0);

    /* The rest is positional: inrange/nearby/scared from the monster's idea of
       where the hero is, plus onscary(). None of it draws. */
    return { inrange: false, nearby: false, scared: false, bravegremlin };
}

// src/monmove.c:700 dochug() — one monster's turn.
export function dochug(mtmp) {
    if (mtmp.msleeping)
        return 0;                     /* asleep monsters do not act */

    distfleeck(mtmp);

    /* m_move() and the attack paths draw; neither is ported. m_move's
       rn2(4 * (cnt - j)) mtrack check and its rn2(++chcnt) tie-break both
       depend on the candidate squares around the monster. */
    note_unported('m_move');
    return 0;
}

function note_unported(what) {
    (game.unported ||= new Set()).add(what);
}
