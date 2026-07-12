// dog.js — Starting pet.
// C ref: dog.c — pet_type, makedog.

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { makemon } from './makemon.js';
import { mons, NON_PM } from './monsters.js';
import { MM_EDOG, NO_MINVENT } from './const.js';
import { monsterNames } from './generated/monsters_data.js';
import { acurr, A_CHA } from './attrib.js';

const PM_LITTLE_DOG = monsterNames.indexOf('PM_LITTLE_DOG');
const PM_KITTEN = monsterNames.indexOf('PM_KITTEN');
const PM_PONY = monsterNames.indexOf('PM_PONY');

// C ref: dog.c pet_type()
function pet_type() {
    const rolePet = game.urole?.petnum;
    if (rolePet != null && rolePet !== NON_PM && rolePet >= 0) return rolePet;
    const pref = game.preferred_pet;
    if (pref === 'c') return PM_KITTEN;
    if (pref === 'd') return PM_LITTLE_DOG;
    return rn2(2) ? PM_KITTEN : PM_LITTLE_DOG;
}

// C ref: dog.c initedog()
function initedog(mtmp, everything) {
    if (!mtmp.edog) mtmp.edog = {};
    const edogp = mtmp.edog;
    const minhungry = (game.moves ?? 1) + 1000;
    mtmp.mtame = Math.max(10, mtmp.mtame || 0);
    mtmp.mpeaceful = 1;
    if (everything) {
        mtmp.mleashed = 0;
        mtmp.meating = 0;
        edogp.droptime = 0;
        edogp.dropdist = 10000;
        // C: ACURR(A_CHA) at makedog — before init_attr, clamps to 3
        edogp.apport = acurr(A_CHA);
        edogp.whistletime = 0;
        edogp.ogoal = { x: -1, y: -1 };
        edogp.abuse = 0;
        edogp.revivals = 0;
        edogp.mhpmax_penalty = 0;
        edogp.killed_by_u = 0;
    } else if ((edogp.apport || 0) <= 0) {
        edogp.apport = 1;
    }
    if ((edogp.hungrytime || 0) < minhungry) edogp.hungrytime = minhungry;
}

// C ref: dog.c makedog()
export function makedog() {
    if (game.preferred_pet === 'n') {
        if (!game.context) game.context = {};
        game.context.startingpet_typ = NON_PM;
        return null;
    }

    const pettype = pet_type();
    if (!game.context) game.context = {};
    game.context.startingpet_typ = pettype;

    const ptr = mons(pettype);
    if (!ptr) return null;

    const mtmp = makemon(ptr, game.u?.ux ?? 0, game.u?.uy ?? 0, MM_EDOG | NO_MINVENT);
    if (!mtmp) return null;

    if (!game.context.startingpet_mid) {
        game.context.startingpet_mid = mtmp.m_id ?? 1;
        void PM_PONY;
    }
    initedog(mtmp, true);
    return mtmp;
}
