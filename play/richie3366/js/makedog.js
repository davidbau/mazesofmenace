// makedog.js — C dog.c makedog() / pet_type() for allmain.c newgame (starting pet only).
// C ref: allmain.c newgame — mklev, u_on_upstairs, vision_reset, check_special_room(FALSE), makedog,
//        then u_init_inventory_attrs().

import { rn2 } from './rng.js';
import { NON_PM } from './const.js';

/** C: permonst.h — kitten / little dog (makemon deferred until mon.c port). */
const PM_LITTLE_DOG = 70;
const PM_KITTEN = 71;

/**
 * C: dog.c pet_type() — role petnum, preferred_pet, else rn2(2) kitten vs dog.
 * @param {import('./gstate.js').game} g
 * @returns {number}
 */
export function petTypeLikeC(g) {
    const petnum = g.urole?.petnum;
    if (petnum != null && (petnum | 0) !== (NON_PM | 0)) return petnum | 0;
    const pp = g.preferred_pet;
    if (pp === 'c') return PM_KITTEN;
    if (pp === 'd') return PM_LITTLE_DOG;
    if (pp === 'n') return NON_PM;
    return rn2(2) ? PM_KITTEN : PM_LITTLE_DOG;
}

/**
 * C: dog.c makedog() — record startingpet_typ; full makemon/initedog when mon.c is ported.
 * @param {import('./gstate.js').game} g
 * @returns {null}
 */
export function makedogLikeC(g) {
    g.context = g.context || {};
    if (g.preferred_pet === 'n') {
        g.context.startingpet_typ = NON_PM;
        return null;
    }
    const pettype = petTypeLikeC(g);
    g.context.startingpet_typ = pettype;
    return null;
}
