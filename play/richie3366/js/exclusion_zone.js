// exclusion_zone.js — C mkmaze.c is_exclusion_zone() for teleport.c goodpos().
// C ref: mkmaze.c is_exclusion_zone(); dungeon.c load_exclusions().

import { LR_DOWNTELE, LR_TELE, LR_UPTELE } from './const.js';

/**
 * C: within_bounded_area(x, y, lx, ly, hx, hy)
 * @param {number} x
 * @param {number} y
 * @param {number} lx
 * @param {number} ly
 * @param {number} hx
 * @param {number} hy
 */
function withinBoundedAreaLikeC(x, y, lx, ly, hx, hy) {
    return x >= (lx | 0) && x <= (hx | 0) && y >= (ly | 0) && y <= (hy | 0);
}

/**
 * C: mkmaze.c is_exclusion_zone(type, x, y)
 * @param {import('./gstate.js').game} g
 * @param {number} type
 * @param {number} x
 * @param {number} y
 */
export function isExclusionZoneLikeC(g, type, x, y) {
    const xi = x | 0;
    const yi = y | 0;
    const t = type | 0;
    for (let ez = g.exclusion_zones; ez; ez = ez.next) {
        const zt = ez.zonetype | 0;
        const matches =
            (t === LR_DOWNTELE && (zt === LR_DOWNTELE || zt === LR_TELE))
            || (t === LR_UPTELE && (zt === LR_UPTELE || zt === LR_TELE))
            || t === zt;
        if (
            matches
            && withinBoundedAreaLikeC(xi, yi, ez.lx | 0, ez.ly | 0, ez.hx | 0, ez.hy | 0)
        ) {
            return true;
        }
    }
    return false;
}
