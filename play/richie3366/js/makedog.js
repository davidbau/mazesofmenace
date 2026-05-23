// makedog.js — C dog.c makedog() / pet_type() for allmain.c newgame (starting pet only).
// C ref: allmain.c newgame — mklev, u_on_upstairs, vision_reset, check_special_room(FALSE), makedog,
//        then u_init_inventory_attrs().

import { rn2 } from './rng.js';
import { MM_EDOG, NO_MINVENT, NON_PM } from './const.js';
import { makemon } from './makemon.js';
import { permonstFromMndxLikeC } from './mondata.js';

/** C: monsters.h — `PM_LITTLE_DOG` / `PM_KITTEN` (MON block order). */
const PM_LITTLE_DOG = 16;
const PM_KITTEN = 34;

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
 * C: dog.c makedog() — pet_type + makemon at hero (enexto placement when !in_mklev).
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
    const ux = g.u?.ux | 0;
    const uy = g.u?.uy | 0;
    makemon(
        { mnum: pettype, data: permonstFromMndxLikeC(pettype) },
        ux,
        uy,
        MM_EDOG | NO_MINVENT,
    );
    return null;
}
