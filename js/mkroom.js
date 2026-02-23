// mkroom.c helper functions moved out of dungeon.js to mirror C file layout.

import { SDOOR, IS_DOOR, ROOMOFFSET, isok } from './config.js';
import { rn2 } from './rng.js';

// C ref: mkroom.c:41-48
export function isbig(sroom) {
    return (sroom.hx - sroom.lx + 1) * (sroom.hy - sroom.ly + 1) > 20;
}

// C ref: mkroom.c:640-663
export function has_dnstairs(croom, map) {
    if (!Number.isInteger(map?.dnstair?.x) || !Number.isInteger(map?.dnstair?.y)) {
        return false;
    }
    return map.dnstair.x >= croom.lx && map.dnstair.x <= croom.hx
        && map.dnstair.y >= croom.ly && map.dnstair.y <= croom.hy;
}

// C ref: mkroom.c:653-663
export function has_upstairs(croom, map) {
    if (!Number.isInteger(map?.upstair?.x) || !Number.isInteger(map?.upstair?.y)) {
        return false;
    }
    return map.upstair.x >= croom.lx && map.upstair.x <= croom.hx
        && map.upstair.y >= croom.ly && map.upstair.y <= croom.hy;
}

// C ref: mkroom.c:623-638 nexttodoor()
export function nexttodoor(sx, sy, map) {
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            if (!isok(sx + dx, sy + dy)) continue;
            const loc = map.at(sx + dx, sy + dy);
            if (loc && (IS_DOOR(loc.typ) || loc.typ === SDOOR)) return true;
        }
    }
    return false;
}

// C ref: mkroom.c:577-596 shrine_pos()
export function shrine_pos(roomno, map) {
    const troom = map.rooms[roomno - ROOMOFFSET];
    let delta = troom.hx - troom.lx;
    let x = troom.lx + Math.trunc(delta / 2);
    if ((delta % 2) && rn2(2)) x++;
    delta = troom.hy - troom.ly;
    let y = troom.ly + Math.trunc(delta / 2);
    if ((delta % 2) && rn2(2)) y++;
    return { x, y };
}
