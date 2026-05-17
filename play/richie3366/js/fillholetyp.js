// fillholetyp.js — dig.c fillholetyp() + dbridge.c is_moat/is_pool/is_liquid predicates for that scan.
// C ref: dig.c fillholetyp(); dbridge.c is_moat(), is_pool(), is_lava().

import { rn2 } from './rng.js';
import {
    isok,
    COLNO,
    ROWNO,
    POOL,
    MOAT,
    WATER,
    DRAWBRIDGE_UP,
    LAVAPOOL,
    LAVAWALL,
    ROOM,
    DB_UNDER,
    DB_MOAT,
    DB_LAVA,
    Is_juiblex_level,
} from './const.js';

/**
 * C: dbridge.c **`is_moat(x,y)`** ( **`Is_juiblex_level`** gate).
 * @param {import('./gstate.js').game} g
 */
function isMoatAtLikeC(g, x, y) {
    if (!isok(x, y)) return false;
    if (Is_juiblex_level(g.u?.uz)) return false;
    const loc = g.level?.at(x | 0, y | 0);
    if (!loc) return false;
    const ltyp = loc.typ | 0;
    if (ltyp === MOAT) return true;
    if (ltyp === DRAWBRIDGE_UP && ((loc.drawbridgemask | 0) & DB_UNDER) === DB_MOAT) return true;
    return false;
}

/**
 * C: dbridge.c **`is_pool(x,y)`** — order matches C (**`is_moat`** not inlined twice; Juiblex **`MOAT`** counts as pool).
 * @param {import('./gstate.js').game} g
 */
export function isPoolCellLikeC(g, x, y) {
    if (!isok(x, y)) return false;
    const loc = g.level?.at(x | 0, y | 0);
    if (!loc) return false;
    const ltyp = loc.typ | 0;
    if (ltyp === POOL || ltyp === MOAT || ltyp === WATER) return true;
    return isMoatAtLikeC(g, x, y);
}

/**
 * C: dbridge.c **`is_lava(x,y)`**.
 * @param {import('./gstate.js').game} g
 */
export function isLavaCellLikeC(g, x, y) {
    if (!isok(x, y)) return false;
    const loc = g.level?.at(x | 0, y | 0);
    if (!loc) return false;
    const ltyp = loc.typ | 0;
    if (ltyp === LAVAPOOL || ltyp === LAVAWALL) return true;
    if (ltyp === DRAWBRIDGE_UP && ((loc.drawbridgemask | 0) & DB_UNDER) === DB_LAVA) return true;
    return false;
}

/** C: dbridge.c **`is_pool(x,y) || is_lava(x,y)`** — for **`dig.c`** **`liquid_flow`** / display, not **`rm.h`** **`IS_POOL`**. */
export function isPoolOrLavaCellLikeC(g, x, y) {
    return isPoolCellLikeC(g, x, y) || isLavaCellLikeC(g, x, y);
}

/**
 * C: dig.c **`fillholetyp(x, y, fill_if_any)`** — return schar liquid typ or **`ROOM`**.
 * Clang **`&&`/`||`** short-circuit preserves **`rn2`** call order vs C.
 * @param {import('./gstate.js').game} g
 * @param {number} x
 * @param {number} y
 * @param {boolean} fillIfAny
 * @returns {number}
 */
export function fillholetypLikeC(g, x, y, fillIfAny) {
    const xi = x | 0;
    const yi = y | 0;
    const loX = Math.max(1, xi - 1);
    const hiX = Math.min(xi + 1, COLNO - 1);
    const loY = Math.max(0, yi - 1);
    const hiY = Math.min(yi + 1, ROWNO - 1);

    let poolCnt = 0;
    let moatCnt = 0;
    let lavaCnt = 0;

    for (let x1 = loX; x1 <= hiX; x1++) {
        for (let y1 = loY; y1 <= hiY; y1++) {
            if (isMoatAtLikeC(g, x1, y1)) moatCnt++;
            else if (isPoolCellLikeC(g, x1, y1)) poolCnt++;
            else if (isLavaCellLikeC(g, x1, y1)) lavaCnt++;
        }
    }

    if (!fillIfAny) poolCnt = Math.trunc(poolCnt / 3);

    /* C: first **`||`** operand evaluated left-to-right; **`&&`** short-circuit skips **`rn2`**. */
    if (
        (lavaCnt > moatCnt + poolCnt && rn2(lavaCnt + 1) !== 0)
        || (lavaCnt !== 0 && fillIfAny)
    ) {
        return LAVAPOOL;
    }
    if (
        (moatCnt > 0 && rn2(moatCnt + 1) !== 0)
        || (moatCnt !== 0 && fillIfAny)
    ) {
        return MOAT;
    }
    if (
        (poolCnt > 0 && rn2(poolCnt + 1) !== 0)
        || (poolCnt !== 0 && fillIfAny)
    ) {
        return POOL;
    }
    return ROOM;
}
