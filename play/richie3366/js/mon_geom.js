// mon_geom.js — Small monster / grid geometry (mon.c monnear).
// C ref: mon.c monnear(struct monst *mon, coordxy x, coordxy y); hack.h NODIAG.

import { dist2 } from './hacklib.js';
import { raceptr } from './mondata.js';
import { PM_GRID_BUG } from './const.js';

/**
 * C: mon.c **`monnear(mon, x, y)`** — **`dist2 < 3`**, except distance **2** and **`NODIAG`**.
 * @param {Record<string, unknown>} mon
 * @param {number} x
 * @param {number} y
 */
export function monnearMonsterXYLikeC(mon, x, y) {
    if (!mon) return false;
    const distance = dist2(mon.mx | 0, mon.my | 0, x | 0, y | 0);
    if (distance === 2 && (raceptr(mon)?.mnum | 0) === PM_GRID_BUG) return false;
    return distance < 3;
}
