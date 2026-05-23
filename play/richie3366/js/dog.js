// dog.js — Starting pet edog / tame (dog.c newedog, initedog, makedog tail).
// C ref: dog.c newedog(), initedog(), makedog() after makemon(MM_EDOG).

import { A_CHA } from './const.js';

/**
 * C: dog.c newedog — allocate **`mextra.edog`**.
 * @param {Record<string, unknown>} mtmp
 */
export function newedogLikeC(mtmp) {
    if (!mtmp.mextra) mtmp.mextra = {};
    if (!mtmp.mextra.edog) {
        mtmp.mextra.edog = {
            apport: 0,
            hungrytime: 0,
            whistletime: 0,
            mhpmax_penalty: 0,
        };
    }
}

/**
 * C: dog.c initedog — tame/peaceful and apport from Cha.
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 * @param {boolean} [everything]
 */
export function initedogLikeC(g, mtmp, everything = true) {
    newedogLikeC(mtmp);
    const edog = mtmp.mextra.edog;
    const minimumtame = 10; /* domestic — C: is_domestic → 10 */
    mtmp.mtame = Math.max(minimumtame, mtmp.mtame | 0);
    mtmp.mpeaceful = 1;
    mtmp.mavenge = 0;
    if (everything) {
        mtmp.mleashed = 0;
        mtmp.meating = 0;
        edog.droptime = 0;
        edog.dropdist = 10000;
        const cha = g.u?.attrib?.[A_CHA]?.a_cur ?? g.u?.attrib?.[A_CHA]?.a_max ?? 10;
        edog.apport = cha | 0;
        edog.whistletime = 0;
        edog.abuse = 0;
        edog.mhpmax_penalty = 0;
    } else if ((edog.apport | 0) <= 0) {
        edog.apport = 1;
    }
    const minhungry = (g.moves | 0) + 1000;
    if ((edog.hungrytime | 0) < minhungry) edog.hungrytime = minhungry;
}
