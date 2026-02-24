// mklev.c helper functions moved out of dungeon.js to mirror C file layout.

import {
    COLNO, ROWNO, MAXNROFROOMS,
    STONE, CORR, SCORR, ROOM, ICE, HWALL, VWALL, SDOOR, ROOMOFFSET,
    STAIRS, FOUNTAIN, SINK, ALTAR, GRAVE, OROOM, THEMEROOM, SHOPBASE,
    DOOR, IRONBARS,
    D_NODOOR, D_CLOSED, D_ISOPEN, D_LOCKED, D_TRAPPED,
    TREE,
    DIR_N, DIR_S, DIR_E, DIR_W, DIR_180,
    xdir, ydir,
    IS_DOOR, IS_OBSTRUCTED, IS_FURNITURE, IS_LAVA, IS_POOL, IS_WALL,
    NO_TRAP, TELEP_TRAP, LEVEL_TELEP, TRAPDOOR, ROCKTRAP, is_hole, isok,
} from './config.js';
import { rn1, rn2, rnd, getRngCallCount } from './rng.js';
import { mksobj, mkobj } from './mkobj.js';
import { GOLD_PIECE, BELL, CORPSE, SCR_TELEPORTATION } from './objects.js';
import { S_HUMAN, S_MIMIC } from './monsters.js';
import { mkclass, makemon } from './makemon.js';
import { make_engr_at, wipe_engr_at } from './engrave.js';
import { random_epitaph_text } from './rumors.js';
import { maketrap, somexy } from './dungeon.js';

const DOORINC = 20;

// C ref: mklev.c mkroom_cmp() — sort rooms by lx only
export function mkroom_cmp(a, b) {
    if (a.lx < b.lx) return -1;
    if (a.lx > b.lx) return 1;
    return 0;
}

// C ref: mklev.c sort_rooms()
export function sort_rooms(map) {
    const n = map.nroom;
    const mainRooms = map.rooms.slice(0, n);
    mainRooms.sort(mkroom_cmp);
    for (let i = 0; i < n; i++) map.rooms[i] = mainRooms[i];

    const ri = new Array(MAXNROFROOMS + 1).fill(0);
    for (let i = 0; i < n; i++) ri[map.rooms[i].roomnoidx] = i;

    for (let x = 1; x < COLNO; x++) {
        for (let y = 0; y < ROWNO; y++) {
            const loc = map.at(x, y);
            const rno = loc.roomno;
            if (rno >= ROOMOFFSET && rno < MAXNROFROOMS + 1) {
                loc.roomno = ri[rno - ROOMOFFSET] + ROOMOFFSET;
            }
        }
    }
    for (let i = 0; i < n; i++) map.rooms[i].roomnoidx = i;
}

// C ref: mklev.c bydoor()
export function bydoor(map, x, y) {
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [dx, dy] of dirs) {
        if (isok(x + dx, y + dy)) {
            const typ = map.at(x + dx, y + dy).typ;
            if (IS_DOOR(typ) || typ === SDOOR) return true;
        }
    }
    return false;
}

// C ref: mklev.c okdoor()
export function okdoor(map, x, y) {
    const loc = map.at(x, y);
    if (!loc) return false;
    if (loc.typ !== HWALL && loc.typ !== VWALL) return false;
    if (bydoor(map, x, y)) return false;
    return ((isok(x - 1, y) && !IS_OBSTRUCTED(map.at(x - 1, y).typ))
        || (isok(x + 1, y) && !IS_OBSTRUCTED(map.at(x + 1, y).typ))
        || (isok(x, y - 1) && !IS_OBSTRUCTED(map.at(x, y - 1).typ))
        || (isok(x, y + 1) && !IS_OBSTRUCTED(map.at(x, y + 1).typ)));
}

// C ref: mklev.c good_rm_wall_doorpos()
export function good_rm_wall_doorpos(map, x, y, dir, room) {
    if (!isok(x, y) || !room.needjoining) return false;
    const loc = map.at(x, y);
    if (!(loc.typ === HWALL || loc.typ === VWALL
        || IS_DOOR(loc.typ) || loc.typ === SDOOR)) {
        return false;
    }
    if (bydoor(map, x, y)) return false;

    const tx = x + xdir[dir];
    const ty = y + ydir[dir];
    if (!isok(tx, ty) || IS_OBSTRUCTED(map.at(tx, ty).typ)) return false;

    const rmno = map.rooms.indexOf(room) + ROOMOFFSET;
    return rmno === map.at(tx, ty).roomno;
}

// C ref: mklev.c finddpos_shift()
export function finddpos_shift(map, x, y, dir, aroom) {
    dir = DIR_180(dir);
    const dx = xdir[dir];
    const dy = ydir[dir];

    if (good_rm_wall_doorpos(map, x, y, dir, aroom)) return { x, y };

    if (aroom.irregular) {
        let rx = x;
        let ry = y;
        let fail = false;
        while (!fail && isok(rx, ry)
            && (map.at(rx, ry).typ === STONE || map.at(rx, ry).typ === CORR)) {
            rx += dx;
            ry += dy;
            if (good_rm_wall_doorpos(map, rx, ry, dir, aroom)) return { x: rx, y: ry };
            if (!(map.at(rx, ry).typ === STONE || map.at(rx, ry).typ === CORR)) fail = true;
            if (rx < aroom.lx || rx > aroom.hx || ry < aroom.ly || ry > aroom.hy) fail = true;
        }
    }
    return null;
}

// C ref: mklev.c finddpos()
export function finddpos(map, dir, aroom) {
    let x1; let y1; let x2; let y2;

    switch (dir) {
    case DIR_N:
        x1 = aroom.lx; x2 = aroom.hx; y1 = y2 = aroom.ly - 1;
        break;
    case DIR_S:
        x1 = aroom.lx; x2 = aroom.hx; y1 = y2 = aroom.hy + 1;
        break;
    case DIR_W:
        x1 = x2 = aroom.lx - 1; y1 = aroom.ly; y2 = aroom.hy;
        break;
    case DIR_E:
        x1 = x2 = aroom.hx + 1; y1 = aroom.ly; y2 = aroom.hy;
        break;
    default:
        return null;
    }

    if (typeof process !== 'undefined' && process.env.DEBUG_FINDDPOS === '1') {
        console.log(`[FDP] call=${getRngCallCount()} dir=${dir} room=(${aroom.lx},${aroom.ly})-(${aroom.hx},${aroom.hy}) rangeX=${x2 - x1 + 1} rangeY=${y2 - y1 + 1}`);
    }
    let tryct = 0;
    do {
        const x = (x2 - x1) ? rn1(x2 - x1 + 1, x1) : x1;
        const y = (y2 - y1) ? rn1(y2 - y1 + 1, y1) : y1;
        const result = finddpos_shift(map, x, y, dir, aroom);
        if (result) return result;
    } while (++tryct < 20);

    for (let x = x1; x <= x2; x++) {
        for (let y = y1; y <= y2; y++) {
            const result = finddpos_shift(map, x, y, dir, aroom);
            if (result) return result;
        }
    }
    return null;
}

// C ref: mklev.c maybe_sdoor()
export function maybe_sdoor(depth, chance) {
    return (depth > 2) && !rn2(Math.max(2, chance));
}

// C ref: mkroom.c mkstairs()
export function mkstairs(map, x, y, isUp, isBranch = false) {
    const loc = map.at(x, y);
    if (!loc) return;

    loc.typ = STAIRS;
    loc.stairdir = isUp ? 1 : 0;
    loc.flags = isUp ? 1 : 0;
    loc.branchStair = !!isBranch;
    if (isUp) map.upstair = { x, y };
    else map.dnstair = { x, y };
}

function somex(croom) { return rn1(croom.hx - croom.lx + 1, croom.lx); }
function somey(croom) { return rn1(croom.hy - croom.ly + 1, croom.ly); }

function inside_room(croom, x, y, map) {
    if (croom.irregular) {
        const loc = map?.at?.(x, y);
        const i = croom.roomnoidx + ROOMOFFSET;
        return !!loc && !loc.edge && loc.roomno === i;
    }
    return x >= croom.lx - 1 && x <= croom.hx + 1
        && y >= croom.ly - 1 && y <= croom.hy + 1;
}

function somexyspace(map, croom) {
    let trycnt = 0;
    let okay;
    do {
        const pos = somexy(croom, map);
        okay = pos && isok(pos.x, pos.y) && !occupied(map, pos.x, pos.y);
        if (okay) {
            const loc = map.at(pos.x, pos.y);
            okay = loc && (loc.typ === ROOM || loc.typ === CORR || loc.typ === ICE);
        }
        if (okay) return pos;
    } while (trycnt++ < 100);
    return null;
}

// C ref: mklev.c generate_stairs_room_good()
export function generate_stairs_room_good(map, croom, phase) {
    const has_upstairs = Number.isInteger(map.upstair?.x)
        && Number.isInteger(map.upstair?.y)
        && inside_room(croom, map.upstair.x, map.upstair.y, map);
    const has_dnstairs = Number.isInteger(map.dnstair?.x)
        && Number.isInteger(map.dnstair?.y)
        && inside_room(croom, map.dnstair.x, map.dnstair.y, map);
    return (croom.needjoining || phase < 0)
        && ((!has_dnstairs && !has_upstairs) || phase < 1)
        && (croom.rtype === OROOM
            || (phase < 2 && croom.rtype === THEMEROOM));
}

// C ref: mklev.c generate_stairs_find_room()
export function generate_stairs_find_room(map) {
    if (!map.nroom) return null;
    for (let phase = 2; phase > -1; phase--) {
        const candidates = [];
        for (let i = 0; i < map.nroom; i++) {
            if (generate_stairs_room_good(map, map.rooms[i], phase)) {
                candidates.push(i);
            }
        }
        if (candidates.length > 0) return map.rooms[candidates[rn2(candidates.length)]];
    }
    return map.rooms[rn2(map.nroom)];
}

// C ref: mklev.c generate_stairs()
export function generate_stairs(map, depth) {
    let croom = generate_stairs_find_room(map);
    if (croom) {
        const pos = somexyspace(map, croom);
        let x; let y;
        if (pos) { x = pos.x; y = pos.y; } else { x = somex(croom); y = somey(croom); }
        const loc = map.at(x, y);
        if (loc) {
            loc.typ = STAIRS;
            loc.flags = 0;
            map.dnstair = { x, y };
        }
    }
    if (depth > 1) {
        croom = generate_stairs_find_room(map);
        if (croom) {
            const pos = somexyspace(map, croom);
            let x; let y;
            if (pos) { x = pos.x; y = pos.y; } else { x = somex(croom); y = somey(croom); }
            const loc = map.at(x, y);
            if (loc) {
                loc.typ = STAIRS;
                loc.flags = 1;
                map.upstair = { x, y };
            }
        }
    }
}

// C ref: mklev.c cardinal_nextto_room()
export function cardinal_nextto_room(map, aroom, x, y) {
    const rmno = map.rooms.indexOf(aroom) + ROOMOFFSET;
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dx, dy] of dirs) {
        if (isok(x + dx, y + dy)) {
            const loc = map.at(x + dx, y + dy);
            if (!loc.edge && loc.roomno === rmno) return true;
        }
    }
    return false;
}

// C ref: mklev.c place_niche()
export function place_niche(map, aroom) {
    let dy;
    if (rn2(2)) {
        dy = 1;
        const dd = finddpos(map, DIR_S, aroom);
        if (!dd) return null;
        const xx = dd.x; const yy = dd.y;
        if (isok(xx, yy + dy) && map.at(xx, yy + dy).typ === STONE
            && isok(xx, yy - dy) && !IS_POOL(map.at(xx, yy - dy).typ)
            && !IS_FURNITURE(map.at(xx, yy - dy).typ)
            && cardinal_nextto_room(map, aroom, xx, yy)) {
            return { xx, yy, dy };
        }
    } else {
        dy = -1;
        const dd = finddpos(map, DIR_N, aroom);
        if (!dd) return null;
        const xx = dd.x; const yy = dd.y;
        if (isok(xx, yy + dy) && map.at(xx, yy + dy).typ === STONE
            && isok(xx, yy - dy) && !IS_POOL(map.at(xx, yy - dy).typ)
            && !IS_FURNITURE(map.at(xx, yy - dy).typ)
            && cardinal_nextto_room(map, aroom, xx, yy)) {
            return { xx, yy, dy };
        }
    }
    return null;
}

// C ref: mklev.c occupied()
export function occupied(map, x, y) {
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

// C ref: mkroom.c find_okay_roompos()
export function find_okay_roompos(map, croom) {
    let tryct = 0;
    do {
        if (++tryct > 200) return null;
        const pos = somexyspace(map, croom);
        if (!pos) return null;
        if (!bydoor(map, pos.x, pos.y)) return pos;
    } while (true);
}

// C ref: mkroom.c mkfount()
export function mkfount(map, croom) {
    const pos = find_okay_roompos(map, croom);
    if (!pos) return;
    const loc = map.at(pos.x, pos.y);
    if (!loc) return;
    loc.typ = FOUNTAIN;
    if (!rn2(7)) { /* blessed fountain parity roll */ }
    map.flags.nfountains++;
}

// C ref: mkroom.c mksink()
export function mksink(map, croom) {
    const pos = find_okay_roompos(map, croom);
    if (!pos) return;
    const loc = map.at(pos.x, pos.y);
    if (!loc) return;
    loc.typ = SINK;
    map.flags.nsinks++;
}

// C ref: mkroom.c mkaltar()
export function mkaltar(map, croom) {
    if (croom.rtype !== OROOM) return;
    const pos = find_okay_roompos(map, croom);
    if (!pos) return;
    const loc = map.at(pos.x, pos.y);
    if (!loc) return;
    loc.typ = ALTAR;
    loc.altarAlign = rn2(3) - 1;
}

// C ref: mkroom.c mkgrave()
export function mkgrave(map, croom, depth) {
    if (croom.rtype !== OROOM) return;
    const dobell = !rn2(10);
    const pos = find_okay_roompos(map, croom);
    if (!pos) return;
    const loc = map.at(pos.x, pos.y);
    if (!loc) return;
    loc.typ = GRAVE;
    if (!dobell) {
        void random_epitaph_text();
    }
    if (!rn2(3)) {
        mksobj(GOLD_PIECE, true, false);
        rnd(20);
        rnd(5);
    }
    let tryct = rn2(5);
    while (tryct--) mkobj(0, true);
    if (dobell) mksobj(BELL, true, false);
}

// C ref: mklev.c trap_engravings[].
const TRAP_ENGRAVINGS = [];
TRAP_ENGRAVINGS[TRAPDOOR] = "Vlad was here";
TRAP_ENGRAVINGS[TELEP_TRAP] = "ad aerarium";
TRAP_ENGRAVINGS[LEVEL_TELEP] = "ad aerarium";

// C ref: mklev.c makeniche().
export function makeniche(map, depth, trap_type) {
    let vct = 8;
    while (vct--) {
        const aroom = map.rooms[rn2(map.nroom)];
        if (aroom.rtype !== OROOM) continue;
        if (aroom.doorct === 1 && rn2(5)) continue;
        const niche = place_niche(map, aroom);
        if (!niche) continue;
        const { xx, yy, dy } = niche;
        const rm = map.at(xx, yy + dy);

        if (trap_type || !rn2(4)) {
            rm.typ = SCORR;
            if (trap_type) {
                let actual_trap = trap_type;
                if (is_hole(actual_trap) && depth <= 1) actual_trap = ROCKTRAP;
                maketrap(map, xx, yy + dy, actual_trap, depth);
                const engrText = TRAP_ENGRAVINGS[actual_trap];
                if (engrText) {
                    make_engr_at(map, xx, yy - dy, engrText, 'dust');
                    wipe_engr_at(map, xx, yy - dy, 5, false);
                }
            }
            dosdoor(map, xx, yy, aroom, SDOOR, depth);
        } else {
            rm.typ = CORR;
            if (rn2(7)) {
                dosdoor(map, xx, yy, aroom, rn2(5) ? SDOOR : DOOR, depth);
            } else {
                if (!rn2(5) && IS_WALL(map.at(xx, yy).typ)) {
                    map.at(xx, yy).typ = IRONBARS;
                    if (rn2(3)) {
                        const mndx = mkclass(S_HUMAN, 0, depth);
                        const corpse = mksobj(CORPSE, true, false);
                        if (corpse && mndx >= 0) corpse.corpsenm = mndx;
                    }
                }
                if (!map.flags.noteleport) mksobj(SCR_TELEPORTATION, true, false);
                if (!rn2(3)) mkobj(0, true);
            }
        }
        return;
    }
}

// C ref: mklev.c make_niches().
export function make_niches(map, depth) {
    let ct = rnd(Math.floor(map.nroom / 2) + 1);
    let ltptr = (!map.flags.noteleport && depth > 15);
    let vamp = (depth > 5 && depth < 25);

    while (ct--) {
        if (ltptr && !rn2(6)) {
            ltptr = false;
            makeniche(map, depth, LEVEL_TELEP);
        } else if (vamp && !rn2(6)) {
            vamp = false;
            makeniche(map, depth, TRAPDOOR);
        } else {
            makeniche(map, depth, NO_TRAP);
        }
    }
}

// C ref: mklev.c makevtele().
export function makevtele(map, depth) {
    makeniche(map, depth, TELEP_TRAP);
}

// C ref: mklev.c alloc_doors()
export function alloc_doors(map) {
    if (!Array.isArray(map.doors)) map.doors = [];
    if (!Number.isInteger(map.doors_alloc)) map.doors_alloc = map.doors.length;
    if (map.doorindex >= map.doors_alloc) {
        map.doors_alloc += DOORINC;
    }
}

// C ref: mklev.c add_door()
export function add_door(map, x, y, aroom) {
    alloc_doors(map);

    for (let i = 0; i < aroom.doorct; i++) {
        const tmp = aroom.fdoor + i;
        if (map.doors[tmp] && map.doors[tmp].x === x && map.doors[tmp].y === y) return;
    }
    if (aroom.doorct === 0) aroom.fdoor = map.doorindex;
    aroom.doorct++;
    for (let tmp = map.doorindex; tmp > aroom.fdoor; tmp--) {
        map.doors[tmp] = map.doors[tmp - 1];
    }
    for (const broom of map.rooms) {
        if (broom && broom !== aroom && broom.doorct && broom.fdoor >= aroom.fdoor) broom.fdoor++;
    }
    map.doorindex++;
    map.doors[aroom.fdoor] = { x, y };
}

function is_shop_door(map, x, y) {
    const roomnos = new Set();
    const pushRoomno = (tx, ty) => {
        if (!isok(tx, ty)) return;
        const rn = map.at(tx, ty)?.roomno;
        if (Number.isInteger(rn) && rn >= ROOMOFFSET) roomnos.add(rn - ROOMOFFSET);
    };

    pushRoomno(x, y);
    pushRoomno(x - 1, y);
    pushRoomno(x + 1, y);
    pushRoomno(x, y - 1);
    pushRoomno(x, y + 1);
    for (const idx of roomnos) {
        if (idx >= 0 && idx < map.nroom) {
            const room = map.rooms[idx];
            if (room && room.rtype >= SHOPBASE) return true;
        }
    }
    return false;
}

// C ref: mklev.c dosdoor()
export function dosdoor(map, x, y, aroom, type, depth) {
    const loc = map.at(x, y);
    const shdoor = is_shop_door(map, x, y);

    if (!IS_WALL(loc.typ)) type = DOOR;

    loc.typ = type;
    if (type === DOOR) {
        if (!rn2(3)) {
            if (!rn2(5)) loc.flags = D_ISOPEN;
            else if (!rn2(6)) loc.flags = D_LOCKED;
            else loc.flags = D_CLOSED;

            if (loc.flags !== D_ISOPEN && !shdoor && depth >= 5 && !rn2(25)) loc.flags |= D_TRAPPED;
        } else {
            loc.flags = shdoor ? D_ISOPEN : D_NODOOR;
        }
        if (loc.flags & D_TRAPPED) {
            if (depth >= 9 && !rn2(5)) {
                loc.flags = D_NODOOR;
                const mimicType = mkclass(S_MIMIC, 0, depth);
                if (mimicType) makemon(mimicType, x, y, 0, depth, map);
            }
        }
    } else {
        if (shdoor || !rn2(5)) loc.flags = D_LOCKED;
        else loc.flags = D_CLOSED;
        if (!shdoor && depth >= 4 && !rn2(20)) loc.flags |= D_TRAPPED;
    }
    add_door(map, x, y, aroom);
}

// C ref: mklev.c dodoor()
export function dodoor(map, x, y, aroom, depth) {
    dosdoor(map, x, y, aroom, maybe_sdoor(depth, 8) ? SDOOR : DOOR, depth);
}

// C ref: mklev.c chk_okdoor() — if x,y is door, does it open into solid terrain.
export function chk_okdoor(map, x, y) {
    const loc = map.at(x, y);
    if (!loc || !IS_DOOR(loc.typ)) return true;
    if (loc.horizontal) {
        if (isok(x, y - 1) && isok(x, y + 1)) {
            const up = map.at(x, y - 1).typ;
            const dn = map.at(x, y + 1).typ;
            if ((up > TREE && dn <= TREE) || (up <= TREE && dn > TREE)) return false;
        }
    } else if (isok(x - 1, y) && isok(x + 1, y)) {
        const lf = map.at(x - 1, y).typ;
        const rt = map.at(x + 1, y).typ;
        if ((lf > TREE && rt <= TREE) || (lf <= TREE && rt > TREE)) return false;
    }
    return true;
}

// C ref: mklev.c mklev_sanity_check().
export function mklev_sanity_check(map) {
    for (let y = 0; y < map.locations[0].length; y++) {
        for (let x = 1; x < map.locations.length; x++) {
            if (!chk_okdoor(map, x, y)) return false;
        }
    }
    let rmno = -1;
    for (let i = 0; i < map.nroom; i++) {
        const room = map.rooms[i];
        if (!room?.needjoining) continue;
        if (rmno === -1) rmno = map.smeq[i];
        if (rmno !== -1 && map.smeq[i] !== rmno) return false;
    }
    return true;
}
