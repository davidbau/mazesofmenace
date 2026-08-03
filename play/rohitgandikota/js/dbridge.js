// dbridge.js — drawbridges and the water/lava terrain tests that live with them.
// C ref: src/dbridge.c
//
// Only is_pool_or_lava() so far, which lookaround() and
// avoid_moving_on_liquid() both need. The drawbridge machinery itself is not
// ported.

import { is_pool, is_lava } from './mon.js';
import { game } from './gstate.js';
import { isok, MOAT, DRAWBRIDGE_UP, DB_UNDER, DB_MOAT, DB_ICE, ICE,
         Is_juiblex_level,
         DOOR, DBWALL, IS_DRAWBRIDGE, DB_DIR, DB_NORTH, DB_SOUTH, DB_EAST,
         DB_WEST } from './const.js';

// src/dbridge.c:77 is_pool_or_lava()
export function is_pool_or_lava(x, y) {
    return !!(is_pool(x, y) || is_lava(x, y));
}

// src/dbridge.c:47 is_drawbridge_wall() — which side of a drawbridge the
// DOOR/DBWALL portcullis square at (x,y) faces, or -1 if it is not one.
export function is_drawbridge_wall(x, y) {
    if (!isok(x, y))
        return -1;
    const lev = game.level.at(x, y);
    if (lev.typ !== DOOR && lev.typ !== DBWALL)
        return -1;

    const dbm = (xx, yy) => game.level.at(xx, yy).drawbridgemask ?? 0;
    if (isok(x + 1, y) && IS_DRAWBRIDGE(game.level.at(x + 1, y).typ)
        && (dbm(x + 1, y) & DB_DIR) === DB_WEST)
        return DB_WEST;
    if (isok(x - 1, y) && IS_DRAWBRIDGE(game.level.at(x - 1, y).typ)
        && (dbm(x - 1, y) & DB_DIR) === DB_EAST)
        return DB_EAST;
    if (isok(x, y - 1) && IS_DRAWBRIDGE(game.level.at(x, y - 1).typ)
        && (dbm(x, y - 1) & DB_DIR) === DB_SOUTH)
        return DB_SOUTH;
    if (isok(x, y + 1) && IS_DRAWBRIDGE(game.level.at(x, y + 1).typ)
        && (dbm(x, y + 1) & DB_DIR) === DB_NORTH)
        return DB_NORTH;

    return -1;
}

// src/dbridge.c:86 is_ice()
export function is_ice(x, y) {
    if (!isok(x, y))
        return false;
    const ltyp = game.level.at(x, y).typ;
    if (ltyp === ICE
        || (ltyp === DRAWBRIDGE_UP
            && ((game.level.at(x, y).drawbridgemask ?? 0) & DB_UNDER) === DB_ICE))
        return true;
    return false;
}

// src/dbridge.c:100 is_moat()
export function is_moat(x, y) {
    if (!isok(x, y))
        return false;
    const ltyp = game.level.at(x, y).typ;
    if (!Is_juiblex_level(game.u.uz)
        && (ltyp === MOAT
            || (ltyp === DRAWBRIDGE_UP
                && ((game.level.at(x, y).drawbridgemask ?? 0) & DB_UNDER) === DB_MOAT)))
        return true;
    return false;
}
