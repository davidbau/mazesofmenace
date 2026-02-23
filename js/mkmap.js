// mkmap.c wrappers and compatibility helpers.
//
// The core implementations now live in sp_lev.js. This file exposes
// mkmap C-shape names used by the mapping index in CODEMATCH.md.

import {
    mkmapInitMap as mkmapInitMapImpl,
    mkmapInitFill as mkmapInitFillImpl,
    mkmapGet as mkmapGetImpl,
    mkmapPassOne as mkmapPassOneImpl,
    mkmapPassTwo as mkmapPassTwoImpl,
    mkmapPassThree as mkmapPassThreeImpl,
    mkmapFloodRegions as mkmapFloodRegionsImpl,
    mkmapJoin as mkmapJoinImpl,
    mkmapWallifyMap as mkmapWallifyMapImpl,
    mkmapFinish as mkmapFinishImpl,
    mkmap as mkmapImpl,
    litstate_rnd as dungeonLitstateRnd
} from './sp_lev.js';

function resolveMap(firstArg) {
    return firstArg && firstArg.at ? firstArg : null;
}

export function mkmapInitMap(map, bgTyp) {
    return mkmapInitMapImpl(map, bgTyp);
}

export function mkmapInitFill(map, bgTyp, fgTyp) {
    return mkmapInitFillImpl(map, bgTyp, fgTyp);
}

export function mkmapGet(map, x, y, bgTyp) {
    return mkmapGetImpl(map, x, y, bgTyp);
}

export function mkmapPassOne(map, bgTyp, fgTyp) {
    return mkmapPassOneImpl(map, bgTyp, fgTyp);
}

export function mkmapPassTwo(map, bgTyp, fgTyp) {
    return mkmapPassTwoImpl(map, bgTyp, fgTyp);
}

export function mkmapPassThree(map, bgTyp, fgTyp) {
    return mkmapPassThreeImpl(map, bgTyp, fgTyp);
}

export function mkmapFloodRegions(map, bgTyp, fgTyp) {
    return mkmapFloodRegionsImpl(map, bgTyp, fgTyp);
}

export function mkmapJoin(map, bgTyp, fgTyp, regions) {
    return mkmapJoinImpl(map, bgTyp, fgTyp, regions);
}

export function mkmapWallifyMap(map, x1, y1, x2, y2) {
    return mkmapWallifyMapImpl(map, x1, y1, x2, y2);
}

export function mkmapFinish(map, fgTyp, bgTyp, lit, walled) {
    return mkmapFinishImpl(map, fgTyp, bgTyp, lit, walled);
}

// C ref: mkmap.c:245
// Clear temporary room markers after map joining.
export function join_map_cleanup(map) {
    if (!resolveMap(map)) return;
    for (let x = 1; x < map.locations.length; x++) {
        for (let y = 0; y < map.locations[x].length; y++) {
            const loc = map.locations[x][y];
            if (loc) loc.roomno = 0;
        }
    }
    if (Number.isInteger(map.nroom)) map.nroom = 0;
}

// C ref: mkmap.c:378
// Remove rooms occupying any part of [lx,ly]-[hx,hy].
export function remove_rooms(map, lx, ly, hx, hy) {
    if (!resolveMap(map)) return;
    if (typeof lx !== 'number' || typeof ly !== 'number'
        || typeof hx !== 'number' || typeof hy !== 'number') return;

    const rooms = Array.isArray(map.rooms) ? map.rooms : [];
    for (let i = rooms.length - 1; i >= 0; i--) {
        const room = rooms[i];
        if (!room) continue;
        if (room.lx <= hx && room.hx >= lx && room.ly <= hy && room.hy >= ly) {
            remove_room_impl(map, room, i);
        }
    }
    map.nroom = map.rooms.length;
}

// C ref: mkmap.c:411
export function remove_room(map, roomNo) {
    if (!Number.isInteger(roomNo) || !resolveMap(map)) return false;
    return remove_room_impl(map, null, roomNo - 1);
}

function remove_room_impl(map, roomObjOrNull, roomIndex) {
    const rooms = Array.isArray(map.rooms) ? map.rooms : [];
    let idx = Number.isInteger(roomIndex) && roomIndex >= 0 ? roomIndex : -1;

    if (idx < 0 && roomObjOrNull) {
        idx = rooms.indexOf(roomObjOrNull);
    }
    if (idx < 0 || idx >= rooms.length) return false;

    const room = rooms[idx];
    const target = room?.roomno || idx + 1;

    rooms.splice(idx, 1);
    map.nroom = Math.max(0, rooms.length);

    for (let x = room.lx; x <= room.hx; x++) {
        for (let y = room.ly; y <= room.hy; y++) {
            const loc = map.at(x, y);
            if (loc && loc.roomno === target) loc.roomno = 0;
        }
    }

    for (let i = idx; i < rooms.length; i++) {
        if (typeof rooms[i].roomno === 'number') rooms[i].roomno -= 1;
    }
    return true;
}

// C ref: mkmap.c:442
export function litstate_rnd(litstate, depth) {
    return dungeonLitstateRnd(litstate, depth);
}

// C ref: mkmap.c:450
export function mkmap(initLev) {
    return mkmapImpl(initLev);
}
