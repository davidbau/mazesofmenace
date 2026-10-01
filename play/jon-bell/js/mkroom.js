// mkroom.js — stub module; fill_zoo implementation lives in mklev.js
// (all helper functions require mklev.js internals; co-located there to avoid
//  circular ES-module dependency).
// C ref: nethack-c/src/mkroom.c
import { game } from './gstate.js';
import { ANY_TYPE, ANY_SHOP, OROOM, SHOPBASE } from './const.js';
import { IS_DOOR, SDOOR, isok } from './const.js';

/* C ref: mkroom.c:765-781 search_special(schar type)
 *
 *   for (croom = &svr.rooms[0]; croom->hx >= 0; croom++)
 *       if ((type == ANY_TYPE && croom->rtype != OROOM)
 *           || (type == ANY_SHOP && croom->rtype >= SHOPBASE)
 *           || croom->rtype == type)
 *           return croom;
 *   for (croom = &gs.subrooms[0]; croom->hx >= 0; croom++)
 *       ... same test ...
 *   return (struct mkroom *) 0;
 *
 * Both C loops terminate on the `hx < 0` sentinel room, which the port already
 * writes: add_room() (js/mklev.js:6027-6029) and rest_rooms() above both plant
 * `{ hx: -1 }` one past the last live room.  Mirror that termination exactly
 * rather than iterating to array length, so a stale slot past the sentinel can
 * never be returned (C would never see it).
 *
 * Returns the room OBJECT (C returns the struct pointer); null for C's NULL. */
export function search_special(type) {
    const t = type | 0;
    const matches = (croom) => (
        (t === ANY_TYPE && (croom.rtype | 0) !== OROOM)
        || (t === ANY_SHOP && (croom.rtype | 0) >= SHOPBASE)
        || (croom.rtype | 0) === t
    );
    const rooms = game.level?.rooms ?? [];
    for (let i = 0; i < rooms.length; i++) {
        const croom = rooms[i];
        if (!croom || (croom.hx | 0) < 0)
            break;
        if (matches(croom))
            return croom;
    }
    const subrooms = game.level?._subrooms ?? [];
    for (let i = 0; i < subrooms.length; i++) {
        const croom = subrooms[i];
        if (!croom || (croom.hx | 0) < 0)
            break;
        if (matches(croom))
            return croom;
    }
    return null;
}

// Sfi_int (savefile.h) — libc-level save-file field reader; no JS save-file
// byte model exists, so this is a faithful no-op stub (calls_macro_or_libc),
// same pattern as js/dungeon.js's / js/region.js's Sfi_int.
function Sfi_int(nhfp, val, name) { return val; }

// rest_room (mkroom.c staticfn).  Save-file room records are not represented
// subroom recursion and resident reset so restore callers still receive the
// same room graph when records were materialized by the bridge.
function rest_room(nhfp, r) {
    if (!r) return;
    const n = r.nsubrooms | 0;
    for (let i = 0; i < n; i++) {
        const child = r.sbrooms?.[i] || game.level?._subrooms?.[game.level._nsubroom];
        if (child) {
            rest_room(nhfp, child);
            child.resident = null;
            if (game.level?._subrooms)
                game.level._subrooms[game.level._nsubroom++] = child;
        }
    }
}

// C ref: mkroom.c:893 rest_rooms() — restore the rooms structure from disk.
export function rest_rooms(nhfp) {
    game.level.nroom = Sfi_int(nhfp, game.level.nroom, "room-nroom");

    game.level._nsubroom = 0;
    for (let i = 0; i < game.level.nroom; i++) {
        rest_room(nhfp, game.level.rooms[i]);
        game.level.rooms[i].resident = null;
    }
    game.level.rooms[game.level.nroom] = { hx: -1 }; // restore ending flags
    if (!game.level._subrooms)
        game.level._subrooms = [];
    game.level._subrooms[game.level._nsubroom] = { hx: -1 };
}

/* C mkroom.c:622-636 — boolean nexttodoor(int sx, int sy)
 *
 *   for (dx = -1; dx <= 1; dx++)
 *       for (dy = -1; dy <= 1; dy++) {
 *           if (!isok(sx + dx, sy + dy)) continue;
 *           lev = &levl[sx + dx][sy + dy];
 *           if (IS_DOOR(lev->typ) || lev->typ == SDOOR) return TRUE;
 *       }
 *   return FALSE;
 *
 * Note the loop includes dx == dy == 0, so a square that IS a door counts as
 * next to one.  Used by mkroom.c:553 (throne/zoo placement) and by fountain.c
 * gush(), which is the caller that put this on the board: a fountain overflow
 * refuses to flood any square adjacent to a doorway. */
export function nexttodoor(sx, sy) {
    for (let dx = -1; dx <= 1; dx++)
        for (let dy = -1; dy <= 1; dy++) {
            if (!isok(sx + dx, sy + dy))
                continue;
            const lev = game.level?.at(sx + dx, sy + dy);
            if (!lev)
                continue;
            if (IS_DOOR(lev.typ) || lev.typ === SDOOR)
                return true;
        }
    return false;
}
