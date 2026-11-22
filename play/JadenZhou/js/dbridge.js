// dbridge.js — drawbridges.
// C ref: dbridge.c — create_drawbridge.
//
// Not ported yet: opening, closing and destroying drawbridges (the
// entity code: e_at, e_died, do_entity, open_drawbridge,
// close_drawbridge, destroy_drawbridge). zap.js has find_drawbridge(),
// dig.js is_ice(), hack.js is_pool_or_lava().

import { game } from './gstate.js';
import {
    IS_WALL, DRAWBRIDGE_UP, DRAWBRIDGE_DOWN, DBWALL, DOOR, LAVAPOOL,
    D_NODOOR, W_NONDIGGABLE, DB_NORTH, DB_SOUTH, DB_EAST, DB_WEST, DB_LAVA,
    DB_DIR, IS_DRAWBRIDGE,
} from './const.js';
import { isok } from './hacklib.js';

// C's impossible() (pline.c) is not ported yet.
function impossible(msg) { console.error(`impossible: ${msg}`); }

// C ref: dbridge.c create_drawbridge()
/*
 * Creation of a drawbridge at pos x,y.
 *     dir is the direction.
 *     flag must be put to TRUE if we want the drawbridge to be opened.
 */
export function create_drawbridge(x, y, dir, flag) {
    let x2, y2;
    let horiz;
    const levl = (xx, yy) => game.level.at(xx, yy);
    const lava = levl(x, y).typ === LAVAPOOL; /* assume initialized map */

    x2 = x;
    y2 = y;
    switch (dir) {
    case DB_NORTH:
        horiz = true;
        y2--;
        break;
    case DB_SOUTH:
        horiz = true;
        y2++;
        break;
    case DB_EAST:
        horiz = false;
        x2++;
        break;
    default:
        impossible('bad direction in create_drawbridge');
        /*FALLTHRU*/
    case DB_WEST:
        horiz = false;
        x2--;
        break;
    }
    if (!IS_WALL(levl(x2, y2).typ))
        return false;
    if (flag) { /* We want the bridge open */
        levl(x, y).typ = DRAWBRIDGE_DOWN;
        levl(x2, y2).typ = DOOR;
        levl(x2, y2).doormask = D_NODOOR;
    } else {
        levl(x, y).typ = DRAWBRIDGE_UP;
        levl(x2, y2).typ = DBWALL;
        /* Drawbridges are non-diggable. */
        levl(x2, y2).wall_info = W_NONDIGGABLE;
    }
    levl(x, y).horizontal = !horiz;
    levl(x2, y2).horizontal = horiz;
    levl(x, y).drawbridgemask = dir;
    if (lava)
        levl(x, y).drawbridgemask |= DB_LAVA;
    return true;
}

// C ref: dbridge.c is_drawbridge_wall()
/*
 * We want to know whether a wall (or a door) is the portcullis (passageway)
 * of an eventual drawbridge.
 *
 * Return value:  the direction of the drawbridge.
 */
export function is_drawbridge_wall(x, y) {
    if (!isok(x, y))
        return -1;

    const levl = (xx, yy) => game.level.at(xx, yy);
    const lev = levl(x, y);
    if (lev.typ !== DOOR && lev.typ !== DBWALL)
        return -1;

    if (isok(x + 1, y) && IS_DRAWBRIDGE(levl(x + 1, y).typ)
        && ((levl(x + 1, y).drawbridgemask || 0) & DB_DIR) === DB_WEST)
        return DB_WEST;
    if (isok(x - 1, y) && IS_DRAWBRIDGE(levl(x - 1, y).typ)
        && ((levl(x - 1, y).drawbridgemask || 0) & DB_DIR) === DB_EAST)
        return DB_EAST;
    if (isok(x, y - 1) && IS_DRAWBRIDGE(levl(x, y - 1).typ)
        && ((levl(x, y - 1).drawbridgemask || 0) & DB_DIR) === DB_SOUTH)
        return DB_SOUTH;
    if (isok(x, y + 1) && IS_DRAWBRIDGE(levl(x, y + 1).typ)
        && ((levl(x, y + 1).drawbridgemask || 0) & DB_DIR) === DB_NORTH)
        return DB_NORTH;

    return -1;
}
