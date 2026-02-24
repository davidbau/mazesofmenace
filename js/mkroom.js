// mkroom.c helper functions moved out of dungeon.js to mirror C file layout.

import {
    SDOOR, IS_DOOR, ROOMOFFSET, ROOM, CORR, ICE,
    IS_WALL, IS_FURNITURE, IS_LAVA, IS_POOL, IS_ROOM,
    OROOM, SWAMP, POOL, SHOPBASE,
    COURT, ZOO, BEEHIVE, MORGUE, BARRACKS, LEPREHALL, COCKNEST, ANTHOLE, TEMPLE,
    isok,
} from './config.js';
import { rn1, rn2, rnd } from './rng.js';
import { FILL_NORMAL } from './map.js';
import { mkclass, makemon, NO_MM_FLAGS } from './makemon.js';
import { mons, S_FUNGUS, PM_GIANT_EEL, PM_PIRANHA, PM_ELECTRIC_EEL } from './monsters.js';
import { WAND_CLASS, SPBOOK_CLASS } from './objects.js';
import { shtypes } from './shknam.js';

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

let _mkroomWizardMode = true;
export function set_mkroom_wizard_mode(enabled) {
    _mkroomWizardMode = !!enabled;
}

// C ref: mkroom.c:219-241 pick_room()
export function pick_room(map, strict) {
    if (!map.nroom) return null;
    let idx = rn2(map.nroom);
    for (let i = map.nroom; i > 0; i--, idx++) {
        if (idx >= map.nroom) idx = 0;
        const sroom = map.rooms[idx];
        if (!sroom || sroom.hx < 0) return null;
        if (sroom.rtype !== OROOM) continue;
        if (!strict) {
            if (has_upstairs(sroom, map)
                || (has_dnstairs(sroom, map) && rn2(3))) {
                continue;
            }
        } else if (has_upstairs(sroom, map) || has_dnstairs(sroom, map)) {
            continue;
        }
        if (sroom.doorct === 1 || !rn2(5) || _mkroomWizardMode) return sroom;
    }
    return null;
}

// C ref: mkroom.c:244-253 mkzoo()
export function mkzoo(map, type) {
    const sroom = pick_room(map, false);
    if (!sroom) return;
    sroom.rtype = type;
    sroom.needfill = FILL_NORMAL;
}

// C ref: mkroom.c:530-575 mkswamp() — turn up to 5 rooms into swamps.
export function mkswamp(map, depth) {
    let eelct = 0;
    for (let i = 0; i < 5; i++) {
        const sroom = map.rooms[rn2(map.nroom)];
        if (!sroom || sroom.hx < 0 || sroom.rtype !== OROOM
            || has_upstairs(sroom, map) || has_dnstairs(sroom, map))
            continue;

        const rmno = (map.rooms.indexOf(sroom)) + ROOMOFFSET;

        sroom.rtype = SWAMP;
        for (let sx = sroom.lx; sx <= sroom.hx; sx++) {
            for (let sy = sroom.ly; sy <= sroom.hy; sy++) {
                const loc = map.at(sx, sy);
                if (!loc || !IS_ROOM(loc.typ)) continue;
                if (loc.roomno !== rmno) continue;
                if (map.objectsAt(sx, sy).length > 0) continue;
                if (map.monsterAt(sx, sy)) continue;
                if (map.trapAt(sx, sy)) continue;
                if (nexttodoor(sx, sy, map)) continue;

                if ((sx + sy) % 2) {
                    loc.typ = POOL;
                    if (!eelct || !rn2(4)) {
                        const eelmon = rn2(5)
                            ? mons[PM_GIANT_EEL]
                            : rn2(2)
                                ? mons[PM_PIRANHA]
                                : mons[PM_ELECTRIC_EEL];
                        makemon(eelmon, sx, sy, NO_MM_FLAGS, depth, map);
                        eelct++;
                    }
                } else if (!rn2(4)) {
                    const fungusMndx = mkclass(S_FUNGUS, 0, depth);
                    makemon(fungusMndx >= 0 ? mons[fungusMndx] : null, sx, sy, NO_MM_FLAGS, depth, map);
                }
            }
        }
        map.flags.has_swamp = true;
    }
}

// C ref: mkroom.c:1049-1096 — check if room shape traps shopkeeper
export function invalid_shop_shape(sroom, map) {
    const doorx = map.doors[sroom.fdoor].x;
    const doory = map.doors[sroom.fdoor].y;
    let insidex = 0, insidey = 0, insidect = 0;

    for (let x = Math.max(doorx - 1, sroom.lx); x <= Math.min(doorx + 1, sroom.hx); x++) {
        for (let y = Math.max(doory - 1, sroom.ly); y <= Math.min(doory + 1, sroom.hy); y++) {
            const loc = map.at(x, y);
            if (loc && loc.typ === ROOM) {
                insidex = x;
                insidey = y;
                insidect++;
            }
        }
    }
    if (insidect < 1) return true;
    if (insidect === 1) {
        insidect = 0;
        for (let x = Math.max(insidex - 1, sroom.lx); x <= Math.min(insidex + 1, sroom.hx); x++) {
            for (let y = Math.max(insidey - 1, sroom.ly); y <= Math.min(insidey + 1, sroom.hy); y++) {
                if (x === insidex && y === insidey) continue;
                const loc = map.at(x, y);
                if (loc && loc.typ === ROOM) insidect++;
            }
        }
        if (insidect === 1) return true;
    }
    return false;
}

export function mkshop(map) {
    for (const sroom of map.rooms) {
        if (sroom.hx < 0) return;
        if (sroom.rtype !== OROOM) continue;
        if (has_dnstairs(sroom, map) || has_upstairs(sroom, map)) continue;
        if (sroom.doorct !== 1) continue;
        if (invalid_shop_shape(sroom, map)) continue;

        if (!sroom.rlit) {
            for (let x = sroom.lx - 1; x <= sroom.hx + 1; x++) {
                for (let y = sroom.ly - 1; y <= sroom.hy + 1; y++) {
                    const loc = map.at(x, y);
                    if (loc) loc.lit = true;
                }
            }
            sroom.rlit = true;
        }

        let j = rnd(100);
        let i = 0;
        while ((j -= shtypes[i].prob) > 0) i++;

        if (isbig(sroom) && (shtypes[i].symb === WAND_CLASS || shtypes[i].symb === SPBOOK_CLASS))
            i = 0;

        sroom.rtype = SHOPBASE + i;
        sroom.needfill = FILL_NORMAL;
        return;
    }
}

// C ref: mkroom.c:52-92 do_mkroom()
export function do_mkroom(map, roomtype, depth, mktemple_fn = null) {
    if (roomtype >= SHOPBASE) {
        mkshop(map);
        return;
    }
    switch (roomtype) {
    case COURT:
    case ZOO:
    case BEEHIVE:
    case MORGUE:
    case BARRACKS:
    case LEPREHALL:
    case COCKNEST:
    case ANTHOLE:
        mkzoo(map, roomtype);
        return;
    case TEMPLE:
        if (typeof mktemple_fn === 'function') mktemple_fn(map, depth);
        return;
    case SWAMP:
        mkswamp(map, depth);
        return;
    default:
        return;
    }
}
