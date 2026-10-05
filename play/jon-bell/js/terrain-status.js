// C hack.c:3087-3170 classify_terrain().  The status field is also the
// one-shot invalidation consumed by spoteffects() after a level arrival.
import { game } from './gstate.js';
import {
    MAX_TYPE, STONE, TREE, CORR, ROOM, DOOR, DRAWBRIDGE_UP, MOAT, WATER, ICE, LAVAPOOL,
    D_ISOPEN, D_CLOSED, D_LOCKED, D_TRAPPED, DB_UNDER, DB_ICE, DB_LAVA,
    DB_MOAT, Is_earthlevel, Is_waterlevel, Is_juiblex_level,
} from './const.js';

const X_FLOOR = 39, X_GROUND = 40, X_OPENDOOR = 41, X_SHUTDOOR = 42;
const X_SWAMP = 43, X_SUBMERGED = 44, X_SEA = 45, X_WATERWALL = 46;

function dbUnderTyp(mask) {
    switch ((mask | 0) & DB_UNDER) {
    case DB_ICE: return ICE;
    case DB_LAVA: return LAVAPOOL;
    case DB_MOAT: return MOAT;
    default: return STONE;
    }
}

function currentTerrain() {
    const u = game.u || {};
    const loc = game.level?.at?.(u.ux | 0, u.uy | 0);
    if (!loc)
        return STONE;
    // map_location() records the C lastseentyp equivalent on the cell.
    let typ = (loc.lastseentyp ?? loc.typ ?? STONE) | 0;
    if (u.uinwater) {
        typ = X_SUBMERGED;
    } else {
        switch (typ) {
        case STONE:
            if (game.level?.flags?.arboreal) typ = TREE;
            break;
        case CORR:
        case ROOM:
            typ = Is_earthlevel(u.uz) ? X_GROUND : X_FLOOR;
            break;
        case DOOR:
            if ((loc.doormask | 0) & D_ISOPEN) typ = X_OPENDOOR;
            else if ((loc.doormask | 0) & (D_CLOSED | D_LOCKED | D_TRAPPED)) typ = X_SHUTDOOR;
            break;
        case DRAWBRIDGE_UP:
            typ = dbUnderTyp(loc.drawbridgemask);
            if (typ === STONE || typ === ROOM) typ = X_GROUND;
            break;
        case MOAT:
            if (game.medusa_level && u.uz
                && game.medusa_level.dnum === u.uz.dnum
                && game.medusa_level.dlevel === u.uz.dlevel) typ = X_SEA;
            else if (Is_juiblex_level(u.uz)) typ = X_SWAMP;
            break;
        case WATER:
            if (!Is_waterlevel(u.uz)) typ = X_WATERWALL;
            break;
        }
    }
    return typ;
}

/** Classify the current terrain and consume a MAX_TYPE invalidation when the
 * caller is running C's switch_terrain/status lifecycle. */
export function classifyTerrain() {
    const g = game;
    g.iflags ||= {};
    const typ = currentTerrain();
    if ((g.iflags.terrain_typ | 0) !== typ) {
        g.iflags.terrain_typ = typ;
        if (g.flags?.terrainstatus && !(g.context?.run | 0) && g.disp)
            g.disp.botl = true;
    }
    return typ;
}

/** Mark the status terrain unknown until the next switch/classification pass. */
export function invalidateTerrainStatus() {
    game.iflags ||= {};
    game.iflags.terrain_typ = MAX_TYPE;
}
