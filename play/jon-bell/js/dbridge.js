// dbridge.js — C ref: dbridge.c.
import { DBWALL, DB_DIR, DB_EAST, DB_ICE, DB_LAVA, DB_MOAT, DB_NORTH, DB_SOUTH, DB_UNDER, DB_WEST, DOOR, DRAWBRIDGE_DOWN, DRAWBRIDGE_UP, D_NODOOR, ICE, IS_DRAWBRIDGE, IS_WALL, IS_WATERWALL, Is_juiblex_level as Is_juiblex_level_real, LAVAPOOL, LAVAWALL, MOAT, POOL, STONE, WATER, W_NONDIGGABLE, isok } from './const.js';
import { is_ice as is_ice_real } from './engrave.js';
import { game } from './gstate.js';
import { impossible } from './pline.js';

/* C ref: dbridge.c:84-95 is_pool(x,y) — POOL/MOAT/WATER or is_moat(). */
export function is_pool(x, y) {
    if (!isok(x, y))
        return false;
    const ltyp = game.level.at(x, y).typ | 0;
    /* The ltyp == MOAT is not redundant with is_moat, because the
     * Juiblex level does not have moats, although it has MOATs. */
    if (ltyp === POOL || ltyp === MOAT || ltyp === WATER || is_moat(x, y))
        return true;
    return false;
}

function Is_juiblex_level(uz) { return Is_juiblex_level_real(uz); }

/* C ref: dbridge.c:99-114 is_moat(x,y) — MOAT or DRAWBRIDGE_UP over DB_MOAT,
   except on Juiblex level (always false there). */
export function is_moat(x, y) {
    if (!isok(x, y))
        return false;
    const loc = game.level.at(x, y);
    const ltyp = loc.typ | 0;
    if (!Is_juiblex_level(game.u.uz)
        && (ltyp === MOAT
            || (ltyp === DRAWBRIDGE_UP
                && ((loc.drawbridgemask | 0) & DB_UNDER) === DB_MOAT)))
        return true;
    return false;
}

/* C ref: dbridge.c:84-95 is_ice(x,y) — ICE, or DRAWBRIDGE_UP over DB_ICE.
 * Same host module and shape as is_moat above; needed by really_kick_object's
 * slide check (dokick.c:588). */
export function is_ice(x, y) {
    return is_ice_real(x, y);
}

/* C ref: dbridge.c:169-173 is_db_wall(x, y) — verify drawbridge wall is UP.
 * RNG: none. Return boolean (drawbridge wall typ). */
export function is_db_wall(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    return (loc.typ | 0) === DBWALL;
}

/* C ref: dbridge.c:115-128 db_under_typ(mask) — get terrain under a drawbridge.
 * RNG: none. Return schar (terrain type: ICE, LAVAPOOL, MOAT, or STONE). */
export function db_under_typ(mask) {
    const m = (mask & DB_UNDER) | 0;
    switch (m) {
    case DB_ICE:
        return ICE;
    case DB_LAVA:
        return LAVAPOOL;
    case DB_MOAT:
        return MOAT;
    default:
        return STONE;
    }
}

/* C ref: dbridge.c:37-43 is_waterwall(x, y) — check if location is a waterwall.
 * RNG: none. Return boolean. */
export function is_waterwall(x, y) {
    if (isok(x, y)) {
        const loc = game.level?.at(x, y);
        if (loc && IS_WATERWALL(loc.typ)) {
            return true;
        }
    }
    return false;
}

/* C ref: dbridge.c:136-162 is_drawbridge_wall(x, y) — check if location is a drawbridge wall.
 * RNG: none. Return int (direction of drawbridge or -1 if not a valid wall). */
export function is_drawbridge_wall(x, y) {
    if (!isok(x, y)) {
        return -1;
    }
    const lev = game.level?.at(x, y);
    if (!lev || (lev.typ !== DOOR && lev.typ !== DBWALL)) {
        return -1;
    }
    /* Check all four cardinal directions for drawbridge walls */
    if (isok(x + 1, y)) {
        const adj = game.level?.at(x + 1, y);
        if (adj && IS_DRAWBRIDGE(adj.typ) && ((adj.drawbridgemask & DB_DIR) | 0) === DB_WEST) {
            return DB_WEST;
        }
    }
    if (isok(x - 1, y)) {
        const adj = game.level?.at(x - 1, y);
        if (adj && IS_DRAWBRIDGE(adj.typ) && ((adj.drawbridgemask & DB_DIR) | 0) === DB_EAST) {
            return DB_EAST;
        }
    }
    if (isok(x, y - 1)) {
        const adj = game.level?.at(x, y - 1);
        if (adj && IS_DRAWBRIDGE(adj.typ) && ((adj.drawbridgemask & DB_DIR) | 0) === DB_SOUTH) {
            return DB_SOUTH;
        }
    }
    if (isok(x, y + 1)) {
        const adj = game.level?.at(x, y + 1);
        if (adj && IS_DRAWBRIDGE(adj.typ) && ((adj.drawbridgemask & DB_DIR) | 0) === DB_NORTH) {
            return DB_NORTH;
        }
    }
    return -1;
}

/* C ref: dbridge.c:179-206 find_drawbridge(x, y) — locate drawbridge from wall or bridge.
 * RNG: none. Return boolean; mutates *x,*y to point to drawbridge if found. */
export function find_drawbridge(x, y) {
    if (IS_DRAWBRIDGE((game.level?.at(x.value, y.value)?.typ | 0)))
        return true;
    const dir = is_drawbridge_wall(x.value, y.value);
    if (dir >= 0) {
        switch (dir) {
        case DB_NORTH:
            y.value++;
            break;
        case DB_SOUTH:
            y.value--;
            break;
        case DB_EAST:
            x.value--;
            break;
        case DB_WEST:
            x.value++;
            break;
        }
        return true;
    }
    return false;
}

/* C ref: dbridge.c:234-284 create_drawbridge(x, y, dir, flag)
 * RNG: none. Return boolean. */
export function create_drawbridge(x, y, dir, flag) {
    let x2 = x;
    let y2 = y;
    let horiz;
    const lava = (game.level?.at(x, y)?.typ | 0) === LAVAPOOL;

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
        impossible("bad direction in create_drawbridge");
        /*FALLTHRU*/
    case DB_WEST:
        horiz = false;
        x2--;
        break;
    }
    if (!IS_WALL((game.level?.at(x2, y2)?.typ | 0)))
        return false;
    if (flag) {
        game.level.at(x, y).typ = DRAWBRIDGE_DOWN;
        game.level.at(x2, y2).typ = DOOR;
        game.level.at(x2, y2).doormask = D_NODOOR;
    } else {
        game.level.at(x, y).typ = DRAWBRIDGE_UP;
        game.level.at(x2, y2).typ = DBWALL;
        game.level.at(x2, y2).wall_info = W_NONDIGGABLE;
    }
    game.level.at(x, y).horizontal = !horiz;
    game.level.at(x2, y2).horizontal = horiz;
    game.level.at(x, y).drawbridgemask = dir;
    if (lava)
        game.level.at(x, y).drawbridgemask |= DB_LAVA;
    return true;
}

export function is_lava(x, y) {
    if (!isok(x, y))
        return false;
    const loc = game.level?.at?.(x, y);
    if (!loc)
        return false;
    const ltyp = loc.typ | 0;
    if (ltyp === LAVAPOOL || ltyp === LAVAWALL
        || (ltyp === DRAWBRIDGE_UP
            && ((loc.drawbridgemask | 0) & DB_UNDER) === DB_LAVA))
        return true;
    return false;
}
