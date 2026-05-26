// makemon_peace_minded.js — C makemon.c peace_minded() alignment vs hero attitude.
// C ref: makemon.c peace_minded(); mondata.h always_peaceful / race_peaceful macros.

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { A_NEUTRAL, PM_ERINYS } from './const.js';

/** C: monflag.h */
const M2_HOSTILE = 0x08000000;
const M2_PEACEFUL = 0x00200000;
const M2_MINION = 0x00001000;

/** C: monflag.h MS_* */
const MS_LEADER = 36;
const MS_NEMESIS = 37;
const MS_GUARDIAN = 38;

/** @param {number} x */
function sgnLikeC(x) {
    const n = x | 0;
    return n > 0 ? 1 : n < 0 ? -1 : 0;
}

/** C: mondata.h always_peaceful(ptr) */
function alwaysPeacefulPtrLikeC(ptr) {
    return ((ptr?.mflags2 ?? 0) & M2_PEACEFUL) !== 0;
}

/** C: mondata.h always_hostile(ptr) */
function alwaysHostilePtrLikeC(ptr) {
    return ((ptr?.mflags2 ?? 0) & M2_HOSTILE) !== 0;
}

/** C: mondata.h race_peaceful(ptr) */
function racePeacefulPtrLikeC(g, ptr) {
    const mask = g.urace?.lovemask ?? 0;
    return ((ptr?.mflags2 ?? 0) & mask) !== 0;
}

/** C: mondata.h race_hostile(ptr) */
function raceHostilePtrLikeC(g, ptr) {
    const mask = g.urace?.hatemask ?? 0;
    return ((ptr?.mflags2 ?? 0) & mask) !== 0;
}

/** C: mondata.h is_minion(ptr) */
function isMinionPtrLikeC(ptr) {
    return ((ptr?.mflags2 ?? 0) & M2_MINION) !== 0;
}

/**
 * C: makemon.c peace_minded(struct permonst *ptr)
 * @param {import('./gstate.js').game} [g]
 * @param {import('./mondata.js').Permonst} ptr
 * @returns {boolean}
 */
export function peaceMindedLikeC(g = game, ptr) {
    const mal = ptr?.maligntyp ?? 0;
    const u = g.u;
    const ual = u?.ualign?.type ?? 0;
    const ualign = u?.ualign ?? {};

    if (alwaysPeacefulPtrLikeC(ptr)) return true;
    if (alwaysHostilePtrLikeC(ptr)) return false;
    if ((ptr?.msound | 0) === MS_LEADER || (ptr?.msound | 0) === MS_GUARDIAN) return true;
    if ((ptr?.msound | 0) === MS_NEMESIS) return false;
    if ((ptr?.mnum | 0) === (PM_ERINYS | 0)) return !(ualign.abuse | 0);

    if (racePeacefulPtrLikeC(g, ptr)) return true;
    if (raceHostilePtrLikeC(g, ptr)) return false;

    if (sgnLikeC(mal) !== sgnLikeC(ual)) return false;
    if (mal < A_NEUTRAL && u?.uhave?.amulet) return false;

    if (isMinionPtrLikeC(ptr)) return (ualign.record | 0) >= 0;

    const rec = ualign.record | 0;
    const recClamp = rec < -15 ? -15 : rec;
    /* C: `!!rn2(...) && !!rn2(...)` — short-circuit on first zero draw. */
    return !!(rn2(16 + recClamp)) && !!(rn2(2 + Math.abs(mal | 0)));
}
