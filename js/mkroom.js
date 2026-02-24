// mkroom.c helper functions moved out of dungeon.js to mirror C file layout.

import {
    SDOOR, IS_DOOR, ROOMOFFSET, ROOM, CORR, ICE,
    IS_WALL, IS_FURNITURE, IS_LAVA, IS_POOL, isok,
} from './config.js';
import { rn1, rn2 } from './rng.js';

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

// C ref: mkroom.c somex()/somey()
export function somex(croom) { return rn1(croom.hx - croom.lx + 1, croom.lx); }
export function somey(croom) { return rn1(croom.hy - croom.ly + 1, croom.ly); }

// C ref: mkroom.c inside_room() -- check if (x,y) is inside room bounds (including walls)
export function inside_room(croom, x, y, map) {
    if (croom.irregular) {
        const loc = map?.at?.(x, y);
        const i = croom.roomnoidx + ROOMOFFSET;
        return !!loc && !loc.edge && loc.roomno === i;
    }
    return x >= croom.lx - 1 && x <= croom.hx + 1
        && y >= croom.ly - 1 && y <= croom.hy + 1;
}

// C ref: mkroom.c somexy() -- pick random position in room, avoiding subrooms
export function somexy(croom, map) {
    let try_cnt = 0;

    // C ref: mkroom.c somexy() irregular path — !edge && roomno == i
    if (croom.irregular) {
        const i = croom.roomnoidx + ROOMOFFSET;
        while (try_cnt++ < 100) {
            const x = somex(croom);
            const y = somey(croom);
            const loc = map.at(x, y);
            if (loc && !loc.edge && loc.roomno === i)
                return { x, y };
        }
        // Exhaustive search fallback
        for (let x = croom.lx; x <= croom.hx; x++) {
            for (let y = croom.ly; y <= croom.hy; y++) {
                const loc = map.at(x, y);
                if (loc && !loc.edge && loc.roomno === i)
                    return { x, y };
            }
        }
        return null;
    }

    if (!croom.nsubrooms) {
        return { x: somex(croom), y: somey(croom) };
    }

    // Check that coords don't fall into a subroom or into a wall
    while (try_cnt++ < 100) {
        const x = somex(croom);
        const y = somey(croom);
        const loc = map.at(x, y);
        if (loc && IS_WALL(loc.typ))
            continue;
        let inSubroom = false;
        for (let i = 0; i < croom.nsubrooms; i++) {
            if (inside_room(croom.sbrooms[i], x, y, map)) {
                inSubroom = true;
                break;
            }
        }
        if (!inSubroom)
            return { x, y };
    }
    return null;
}

// C ref: mklev.c occupied() subset used by mkroom.c somexyspace()
function occupied_for_roompos(map, x, y) {
    if (map.trapAt(x, y)) return true;
    const loc = map.at(x, y);
    if (!loc) return true;
    if (IS_FURNITURE(loc.typ)) return true;
    if (IS_LAVA(loc.typ) || IS_POOL(loc.typ)) return true;
    if (map._isInvocationLevel && map._invPos
        && x === map._invPos.x && y === map._invPos.y) {
        return true;
    }
    return false;
}

// C ref: mkroom.c somexyspace() -- find accessible space in room
export function somexyspace(map, croom) {
    let trycnt = 0;
    let okay;
    do {
        const pos = somexy(croom, map);
        okay = pos && isok(pos.x, pos.y) && !occupied_for_roompos(map, pos.x, pos.y);
        if (okay) {
            const loc = map.at(pos.x, pos.y);
            okay = loc && (loc.typ === ROOM || loc.typ === CORR || loc.typ === ICE);
        }
        if (okay) return pos;
    } while (trycnt++ < 100);
    return null;
}
