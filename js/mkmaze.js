// mkmaze.c core helpers and maze generation paths.

import {
    COLNO, ROWNO, STONE, HWALL, DOOR, CROSSWALL, LAVAWALL, IRONBARS, WATER, SDOOR,
    CORR, ROOM, AIR, MAGIC_PORTAL, VIBRATING_SQUARE, MKTRAP_MAZEFLAG,
    IS_WALL, isok,
} from './config.js';
import { rn1, rn2, rnd } from './rng.js';
import {
    maketrap,
    mktrap,
    wallify_region,
    wallification,
    fix_wall_spines,
    deltrap,
    enexto,
    resolveBranchPlacementForLevel,
    bound_digging,
    repair_irregular_room_boundaries,
} from './dungeon.js';
import { placeFloorObject } from './floor_objects.js';
import { mkobj, mksobj, weight, RANDOM_CLASS } from './mkobj.js';
import { GEM_CLASS, BOULDER, GOLD_PIECE } from './objects.js';
import { makemon, NO_MM_FLAGS } from './makemon.js';
import { PM_MINOTAUR } from './monsters.js';
import {
    occupied,
    mkstairs,
    generate_stairs_find_room,
    place_branch,
} from './mklev.js';
import { somex, somey, somexyspace } from './mkroom.js';

function at(map, x, y) {
    return map && map.at ? map.at(x, y) : null;
}

// C ref: mkmaze.c iswall
export function iswall(map, x, y) {
    const loc = at(map, x, y);
    if (!loc) return 1;
    return IS_WALL(loc.typ)
        || loc.typ === LAVAWALL
        || loc.typ === WATER
        || loc.typ === SDOOR
        || loc.typ === IRONBARS
        || loc.typ === CROSSWALL ? 1 : 0;
}

// C ref: mkmaze.c iswall_or_stone
export function iswall_or_stone(map, x, y) {
    const loc = at(map, x, y);
    if (!loc) return 1;
    return loc.typ === STONE || iswall(map, x, y);
}

// C ref: mkmaze.c is_solid
export function is_solid(map, x, y) {
    return !isok(x, y) || IS_WALL(at(map, x, y)?.typ);
}

// C ref: mkmaze.c set_levltyp
export function set_levltyp(map, x, y, typ) {
    const loc = at(map, x, y);
    if (!loc || !Number.isInteger(typ)) return false;
    loc.typ = typ;
    return true;
}

// C ref: mkmaze.c set_levltyp_lit
export function set_levltyp_lit(map, x, y, typ, lit) {
    if (!set_levltyp(map, x, y, typ)) return false;
    const loc = at(map, x, y);
    loc.lit = lit ? 1 : 0;
    return true;
}

// C ref: mkmaze.c extend_spine
export function extend_spine(locale, wall_there, dx, dy) {
    const nx = 1 + dx;
    const ny = 1 + dy;
    if (wall_there) {
        if (dx) {
            if (locale[1][0] && locale[1][2] && locale[nx][0] && locale[nx][2]) return 0;
            return 1;
        }
        if (locale[0][1] && locale[2][1] && locale[0][ny] && locale[2][ny]) return 0;
        return 1;
    }
    return 0;
}

// C ref: mkmaze.c wall_cleanup
export function wall_cleanup(map, x1 = 1, y1 = 0, x2 = COLNO - 1, y2 = ROWNO - 1) {
    for (let x = x1; x <= x2; x++) {
        for (let y = y1; y <= y2; y++) {
            const loc = at(map, x, y);
            if (!loc || !IS_WALL(loc.typ)) continue;

            if (iswall_or_stone(map, x - 1, y)
                && iswall_or_stone(map, x + 1, y)
                && iswall_or_stone(map, x, y - 1)
                && iswall_or_stone(map, x, y + 1)) {
                loc.typ = STONE;
                loc.horizontal = false;
            }
        }
    }
}

// C ref: mkmaze.c okay
export function okay(x, y, dir, map = null) {
    if (!map || !map.at) return false;
    const [dx, dy] = dir === 0 ? [1, 0]
        : dir === 2 ? [0, 1]
        : dir === 4 ? [-1, 0]
        : [0, -1];
    const tx = x + 2 * dx;
    const ty = y + 2 * dy;
    if (!isok(tx, ty)) return false;
    return at(map, x + dx, y + dy)?.typ === STONE
        && at(map, tx, ty)?.typ === STONE;
}

// C ref: mkmaze.c maze0xy
export function maze0xy(map) {
    return mazexy(map);
}

// Region type constants (C ref: mkmaze.h)
const LR_TELE = 0;
const LR_DOWNTELE = 1;
const LR_UPTELE = 2;
const LR_PORTAL = 3;
const LR_BRANCH = 4;
const LR_UPSTAIR = 5;
const LR_DOWNSTAIR = 6;

// C ref: mkmaze.c within_bounded_area()
function within_bounded_area(x, y, lx, ly, hx, hy) {
    return x >= lx && x <= hx && y >= ly && y <= hy;
}

// C ref: mkmaze.c is_exclusion_zone
export function is_exclusion_zone(map, type, x, y) {
    const zones = Array.isArray(map?.exclusionZones) ? map.exclusionZones : null;
    if (!zones || zones.length === 0) return false;

    const normalizeZoneType = (zoneType) => {
        if (typeof zoneType === 'string') {
            switch (zoneType) {
            case 'teleport':
                return LR_TELE;
            case 'teleport-down':
                return LR_DOWNTELE;
            case 'teleport-up':
                return LR_UPTELE;
            case 'monster-generation':
                return 7;
            default:
                return undefined;
            }
        }
        if (typeof zoneType === 'number') {
            if (zoneType === LR_TELE || zoneType === 4) return LR_TELE;
            if (zoneType === LR_UPTELE || zoneType === 5) return LR_UPTELE;
            if (zoneType === LR_DOWNTELE || zoneType === 6) return LR_DOWNTELE;
            if (zoneType === 7) return 7;
        }
        return undefined;
    };

    for (const zone of zones) {
        const zoneType = normalizeZoneType(zone?.type ?? zone?.zonetype);
        if (zoneType === undefined) continue;

        const typeMatches = (
            (type === LR_DOWNTELE && (zoneType === LR_DOWNTELE || zoneType === LR_TELE))
            || (type === LR_UPTELE && (zoneType === LR_UPTELE || zoneType === LR_TELE))
            || (type === zoneType)
        );
        if (!typeMatches) continue;

        if (within_bounded_area(x, y, zone.lx, zone.ly, zone.hx, zone.hy)) return true;
    }
    return false;
}

// C ref: mkmaze.c bad_location
export function bad_location(map, x, y, nlx, nly, nhx, nhy) {
    if (occupied(map, x, y)) return true;
    if (within_bounded_area(x, y, nlx, nly, nhx, nhy)) return true;

    const loc = at(map, x, y);
    if (!loc) return true;

    const typ = loc.typ;
    const isMaze = !!map.flags?.is_maze_lev;
    const isValid = (typ === CORR && isMaze) || typ === ROOM || typ === AIR;
    return !isValid;
}

// C ref: mkmaze.c makemaz
export function makemaz(map, protofile, dnum, dlevel, depth) {
    // C ref: mkmaze.c:1127-1204
    // If protofile specified, try to load special level
    // For now, we only handle the procedural case (protofile === "")
    if (protofile && protofile !== "") {
        // TODO: Load special maze level file
        console.warn(`makemaz: special level "${protofile}" not implemented, using procedural maze`);
    }

    // C ref: Invocation_lev(&u.uz) in mkmaze.c.
    // In current branch topology, Sanctum is Gehennom level 10, so invocation
    // level is the level above it (9). Allow explicit override via makelevel opts.
    const isInvocationLevel = !!map._isInvocationLevel;

    // C ref: mkmaze.c:1189-1191
    // Set maze flags
    map.flags = map.flags || {};
    map.flags.is_maze_lev = true;
    map.flags.corrmaze = !rn2(3); // 2/3 chance of corridor maze

    // C ref: mkmaze.c:1193-1197
    // Determine maze creation parameters
    // create_maze has different params based on Invocation level check
    const useInvocationParams = !isInvocationLevel && !!rn2(2);
    if (useInvocationParams) {
        // create_maze(-1, -1, !rn2(5))
        create_maze(map, -1, -1, !rn2(5));
    } else {
        // create_maze(1, 1, FALSE)
        create_maze(map, 1, 1, false);
    }

    // C ref: mkmaze.c:1199-1200
    // Wallification for non-corridor mazes
    if (!map.flags.corrmaze) {
        // C ref: mkmaze.c wallification(2, 2, gx.x_maze_max, gy.y_maze_max)
        const maxX = Number.isInteger(map._mazeMaxX) ? map._mazeMaxX : (COLNO - 1);
        const maxY = Number.isInteger(map._mazeMaxY) ? map._mazeMaxY : (ROWNO - 1);
        wallify_region(map, 2, 2, maxX, maxY);
    }

    // C ref: mkmaze.c:1202-1208
    // Place stairs
    const upstair = mazexy(map);
    mkstairs(map, upstair.x, upstair.y, true); // up stairs

    if (!isInvocationLevel) {
        const downstair = mazexy(map);
        mkstairs(map, downstair.x, downstair.y, false); // down stairs
    } else {
        const invPos = pick_vibrasquare_location(map);
        if (invPos) {
            maketrap(map, invPos.x, invPos.y, VIBRATING_SQUARE);
        }
    }

    // C ref: mkmaze.c:1211 — place_branch(Is_branchlev(&u.uz), 0, 0)
    // Only invoke placement when this exact level is a branch endpoint.
    const branchPlacement = resolveBranchPlacementForLevel(dnum, dlevel).placement;
    if (branchPlacement && branchPlacement !== 'none') {
        const prev = map._branchPlacementHint;
        map._branchPlacementHint = branchPlacement;
        try {
            place_lregion(map, 0, 0, 0, 0, 0, 0, 0, 0, LR_BRANCH);
        } finally {
            if (prev === undefined) delete map._branchPlacementHint;
            else map._branchPlacementHint = prev;
        }
    }

    // C ref: mkmaze.c:1213 — populate_maze()
    populate_maze(map, depth);
}

// C ref: mkmaze.c create_maze
export function create_maze(map, corrwid, wallthick, rmdeadends) {
    const defaultMaxX = (COLNO - 1);
    const defaultMaxY = (ROWNO - 1);
    // C ref: save/restore gx.x_maze_max/gy.y_maze_max around temporary small-maze bounds.
    const tmpMaxX = Number.isInteger(map?._mazeMaxX) ? map._mazeMaxX : defaultMaxX;
    const tmpMaxY = Number.isInteger(map?._mazeMaxY) ? map._mazeMaxY : defaultMaxY;

    if (corrwid === -1) corrwid = rnd(4);
    if (wallthick === -1) wallthick = rnd(4) - corrwid;
    if (wallthick < 1) wallthick = 1;
    else if (wallthick > 5) wallthick = 5;
    if (corrwid < 1) corrwid = 1;
    else if (corrwid > 5) corrwid = 5;

    const scale = corrwid + wallthick;
    const rdx = Math.trunc(tmpMaxX / scale);
    const rdy = Math.trunc(tmpMaxY / scale);
    const smallMaxX = rdx * 2;
    const smallMaxY = rdy * 2;
    const carveType = map.flags?.corrmaze ? CORR : ROOM;

    if (map.flags?.corrmaze) {
        for (let x = 2; x < smallMaxX; x++) {
            for (let y = 2; y < smallMaxY; y++) {
                const loc = map.at(x, y);
                if (loc) loc.typ = STONE;
            }
        }
    } else {
        for (let x = 2; x <= smallMaxX; x++) {
            for (let y = 2; y <= smallMaxY; y++) {
                const loc = map.at(x, y);
                if (loc) loc.typ = ((x % 2) && (y % 2)) ? STONE : HWALL;
            }
        }
    }

    const startRangeX = Math.max(1, (smallMaxX >> 1) - 1);
    const startRangeY = Math.max(1, (smallMaxY >> 1) - 1);
    const startX = 3 + 2 * rn2(startRangeX);
    const startY = 3 + 2 * rn2(startRangeY);
    const stack = [{ x: Math.min(startX, smallMaxX - 1), y: Math.min(startY, smallMaxY - 1) }];
    const dirs = [{ dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }];
    const inSmall = (x, y) => x >= 3 && y >= 3 && x <= smallMaxX && y <= smallMaxY;
    const isSolid = (x, y) => {
        const loc = map.at(x, y);
        return !!loc && loc.typ === STONE;
    };
    while (stack.length) {
        const cur = stack[stack.length - 1];
        const here = map.at(cur.x, cur.y);
        if (here && here.typ !== DOOR && here.typ !== SDOOR) {
            here.typ = carveType;
            here.flags = 0;
        }
        const choices = [];
        for (const d of dirs) {
            const nx = cur.x + d.dx * 2;
            const ny = cur.y + d.dy * 2;
            if (!inSmall(nx, ny) || !isSolid(nx, ny)) continue;
            choices.push(d);
        }
        if (!choices.length) {
            stack.pop();
            continue;
        }
        const d = choices[rn2(choices.length)];
        const mx = cur.x + d.dx;
        const my = cur.y + d.dy;
        const nx = cur.x + d.dx * 2;
        const ny = cur.y + d.dy * 2;
        const mid = map.at(mx, my);
        const next = map.at(nx, ny);
        if (mid && mid.typ !== DOOR && mid.typ !== SDOOR) {
            mid.typ = carveType;
            mid.flags = 0;
        }
        if (next && next.typ !== DOOR && next.typ !== SDOOR) {
            next.typ = carveType;
            next.flags = 0;
        }
        stack.push({ x: nx, y: ny });
    }

    if (rmdeadends) {
        // C ref: mkmaze.c maze_remove_deadends()
        const mazeInbounds = (x, y) => (
            x >= 2 && y >= 2 && x < smallMaxX && y < smallMaxY && isok(x, y)
        );
        const accessible = (x, y) => {
            const loc = map.at(x, y);
            return !!loc && loc.typ >= DOOR; // C ACCESSIBLE(typ)
        };
        const mzMove = (x, y, dir) => {
            switch (dir) {
            case 0: return { x, y: y - 1 };
            case 1: return { x: x + 1, y };
            case 2: return { x, y: y + 1 };
            case 3: return { x: x - 1, y };
            default: return { x, y };
            }
        };
        for (let x = 2; x < smallMaxX; x++) {
            for (let y = 2; y < smallMaxY; y++) {
                if (!(x % 2) || !(y % 2)) continue;
                if (!accessible(x, y)) continue;
                const dirok = [];
                let idx2 = 0;
                for (let dir = 0; dir < 4; dir++) {
                    let p1 = mzMove(x, y, dir);
                    if (!mazeInbounds(p1.x, p1.y)) {
                        idx2++;
                        continue;
                    }
                    let p2 = mzMove(x, y, dir);
                    p2 = mzMove(p2.x, p2.y, dir);
                    if (!mazeInbounds(p2.x, p2.y)) {
                        idx2++;
                        continue;
                    }
                    if (!accessible(p1.x, p1.y) && accessible(p2.x, p2.y)) {
                        dirok.push(dir);
                        idx2++;
                    }
                }
                if (idx2 >= 3 && dirok.length > 0) {
                    const dir = dirok[rn2(dirok.length)];
                    // C ref: mkmaze.c maze_remove_deadends():
                    // carve the immediate neighboring wall, not the far room node.
                    const dest = mzMove(x, y, dir);
                    const loc = map.at(dest.x, dest.y);
                    if (loc) loc.typ = carveType;
                }
            }
        }
    }

    // C scales the reduced maze up when scale > 2.
    if (scale > 2) {
        // Copy only the C-backed source rectangle. Any source outside this
        // coverage must not influence writes during scaling.
        const tmp = Array.from({ length: COLNO }, () => Array(ROWNO));
        for (let x = 1; x < tmpMaxX; x++) {
            for (let y = 1; y < tmpMaxY; y++) {
                tmp[x][y] = map.at(x, y)?.typ ?? STONE;
            }
        }
        let rx = 2;
        let x = 2;
        while (rx < tmpMaxX) {
            const mx = (x % 2) ? corrwid : (x === 2 || x === rdx * 2) ? 1 : wallthick;
            let ry = 2;
            let y = 2;
            while (ry < tmpMaxY) {
                const my = (y % 2) ? corrwid : (y === 2 || y === rdy * 2) ? 1 : wallthick;
                for (let dx = 0; dx < mx; dx++) {
                    for (let dy = 0; dy < my; dy++) {
                        if (rx + dx >= tmpMaxX || ry + dy >= tmpMaxY) break;
                        if (!(x >= 1 && x < tmpMaxX && y >= 1 && y < tmpMaxY)) continue;
                        const srcTyp = tmp[x][y];
                        if (srcTyp === undefined) continue;
                        const loc = map.at(rx + dx, ry + dy);
                        if (loc) loc.typ = srcTyp;
                    }
                }
                ry += my;
                y++;
            }
            rx += mx;
            x++;
        }
    }

    // C restores gx/gy bounds after create_maze().
    map._mazeMaxX = tmpMaxX;
    map._mazeMaxY = tmpMaxY;
}

// C ref: mkmaze.c populate_maze
export function populate_maze(map, depth) {
    const placeObjAt = (obj, x, y) => {
        if (!obj) return;
        obj.ox = x;
        obj.oy = y;
        placeFloorObject(map, obj);
    };

    for (let i = rn1(8, 11); i > 0; i--) {
        const pos = mazexy(map);
        const oclass = rn2(2) ? GEM_CLASS : RANDOM_CLASS;
        placeObjAt(mkobj(oclass, true), pos.x, pos.y);
    }
    for (let i = rn1(10, 2); i > 0; i--) {
        const pos = mazexy(map);
        placeObjAt(mksobj(BOULDER, true, false), pos.x, pos.y);
    }
    for (let i = rn2(3); i > 0; i--) {
        const pos = mazexy(map);
        makemon(PM_MINOTAUR, pos.x, pos.y, NO_MM_FLAGS, depth, map);
    }
    for (let i = rn1(5, 7); i > 0; i--) {
        const pos = mazexy(map);
        makemon(null, pos.x, pos.y, NO_MM_FLAGS, depth, map);
    }
    for (let i = rn1(6, 7); i > 0; i--) {
        const pos = mazexy(map);
        const mul = rnd(Math.max(Math.floor(30 / Math.max(12 - depth, 2)), 1));
        const amount = 1 + rnd(depth + 2) * mul;
        const gold = mksobj(GOLD_PIECE, true, false);
        if (gold) {
            gold.quan = amount;
            gold.owt = weight(gold);
        }
        placeObjAt(gold, pos.x, pos.y);
    }
    for (let i = rn1(6, 7); i > 0; i--) {
        mktrap(map, 0, MKTRAP_MAZEFLAG, null, null, depth);
    }
}

// C ref: mkmaze.c maze_remove_deadends
export function maze_remove_deadends(map, typ) {
    return create_maze(map, 1, 1, !!typ);
}

// C ref: mkmaze.c mazexy
export function mazexy(map) {
    // C ref: mkmaze.c:1317-1348 mazexy()
    // Find a random CORR/ROOM location in the maze
    const xMax = Number.isInteger(map._mazeMaxX) ? map._mazeMaxX : (COLNO - 1);
    const yMax = Number.isInteger(map._mazeMaxY) ? map._mazeMaxY : (ROWNO - 1);
    const allowedtyp = map.flags.corrmaze ? CORR : ROOM;
    let cpt = 0;

    do {
        // C ref: rnd(x_maze_max) is 1+rn2(x_maze_max), i.e., range [1..x_maze_max]
        const x = rnd(xMax);
        const y = rnd(yMax);
        const loc = map.at(x, y);
        if (loc && loc.typ === allowedtyp) {
            return { x, y };
        }
    } while (++cpt < 100);
    // C ref: 100 random attempts failed; systematically try every possibility
    for (let x = 1; x <= xMax; x++) {
        for (let y = 1; y <= yMax; y++) {
            const loc = map.at(x, y);
            if (loc && loc.typ === allowedtyp) {
                return { x, y };
            }
        }
    }
    return null;
}

// C ref: mkmaze.c pick_vibrasquare_location
export function pick_vibrasquare_location(map) {
    const x_maze_min = 2;
    const y_maze_min = 2;
    const INVPOS_X_MARGIN = 4;
    const INVPOS_Y_MARGIN = 3;
    const INVPOS_DISTANCE = 11;

    const xMazeMax = Number.isInteger(map._mazeMaxX) ? map._mazeMaxX : (COLNO - 1);
    const yMazeMax = Number.isInteger(map._mazeMaxY) ? map._mazeMaxY : (ROWNO - 1);
    const xRange = xMazeMax - x_maze_min - 2 * INVPOS_X_MARGIN - 1;
    const yRange = yMazeMax - y_maze_min - 2 * INVPOS_Y_MARGIN - 1;
    if (xRange <= 0 || yRange <= 0) {
        const fallback = mazexy(map);
        map._invPos = fallback ? { x: fallback.x, y: fallback.y } : null;
        return fallback;
    }

    const up = map.upstair;
    const distmin = (x1, y1, x2, y2) => Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2));
    const SPACE_POS = (typ) => typ > SDOOR;
    let x = 0, y = 0;
    let tryct = 0;
    do {
        x = rn1(xRange, x_maze_min + INVPOS_X_MARGIN + 1);
        y = rn1(yRange, y_maze_min + INVPOS_Y_MARGIN + 1);
        if (++tryct > 1000) break;
        const loc = map.at(x, y);
        if (!up) break;
        const tooNearUp = (x === up.x || y === up.y
            || Math.abs(x - up.x) === Math.abs(y - up.y)
            || distmin(x, y, up.x, up.y) <= INVPOS_DISTANCE);
        if (tooNearUp) continue;
        if (!loc || !SPACE_POS(loc.typ) || occupied(map, x, y)) continue;
        break;
    } while (true);

    const pos = { x, y };
    map._invPos = pos;
    return pos;
}

// C ref: mkmaze.c put_lregion_here()
export function put_lregion_here(map, x, y, nlx, nly, nhx, nhy, rtype, oneshot) {
    let invalid = bad_location(map, x, y, nlx, nly, nhx, nhy)
        || is_exclusion_zone(map, rtype, x, y);
    if (invalid) {
        if (!oneshot) return false;

        const trap = map.trapAt(x, y);
        const undestroyable = (trap?.ttyp === MAGIC_PORTAL || trap?.ttyp === VIBRATING_SQUARE);
        if (trap && !undestroyable) {
            const mon = map.monsterAt(x, y);
            if (mon && mon.mtrapped) mon.mtrapped = 0;
            deltrap(map, trap);
        }
        invalid = bad_location(map, x, y, nlx, nly, nhx, nhy)
            || is_exclusion_zone(map, rtype, x, y);
        if (invalid) return false;
    }

    const loc = at(map, x, y);
    if (!loc) return false;

    switch (rtype) {
    case LR_TELE:
    case LR_UPTELE:
    case LR_DOWNTELE: {
        const mon = map.monsterAt(x, y);
        if (mon) {
            if (!oneshot) return false;
            const pos = enexto(x, y, map);
            if (pos) {
                mon.mx = pos.x;
                mon.my = pos.y;
            } else {
                map.removeMonster(mon);
            }
        }
        break;
    }
    case LR_PORTAL:
        {
            const trap = maketrap(map, x, y, MAGIC_PORTAL);
            if (trap && map?._portalDestOverride) {
                trap.dst = {
                    dnum: map._portalDestOverride.dnum,
                    dlevel: map._portalDestOverride.dlevel
                };
            }
        }
        break;
    case LR_DOWNSTAIR:
        mkstairs(map, x, y, false);
        break;
    case LR_UPSTAIR:
        mkstairs(map, x, y, true);
        break;
    case LR_BRANCH:
        place_branch(map, x, y);
        break;
    default:
        break;
    }
    return true;
}

// C ref: mkmaze.c place_lregion()
export function place_lregion(map, lx, ly, hx, hy, nlx, nly, nhx, nhy, rtype) {
    if (!lx) {
        if (rtype === LR_BRANCH) {
            if (map.nroom) {
                const croom = generate_stairs_find_room(map);
                if (!croom) {
                    console.warn(`Couldn't place lregion type ${rtype}!`);
                    return;
                }

                let pos = somexyspace(map, croom);
                if (!pos) pos = { x: somex(croom), y: somey(croom) };
                if (!at(map, pos.x, pos.y)) {
                    console.warn(`Couldn't place lregion type ${rtype}!`);
                    return;
                }
                place_branch(map, pos.x, pos.y);
                return;
            }
        }
        lx = 1;
        hx = COLNO - 1;
        ly = 0;
        hy = ROWNO - 1;
    }

    if (lx < 1) lx = 1;
    if (hx > COLNO - 1) hx = COLNO - 1;
    if (ly < 0) ly = 0;
    if (hy > ROWNO - 1) hy = ROWNO - 1;

    const oneshot = (lx === hx && ly === hy);
    for (let trycnt = 0; trycnt < 200; trycnt++) {
        const x = rn1((hx - lx) + 1, lx);
        const y = rn1((hy - ly) + 1, ly);
        if (put_lregion_here(map, x, y, nlx, nly, nhx, nhy, rtype, oneshot)) return;
    }

    for (let x = lx; x <= hx; x++) {
        for (let y = ly; y <= hy; y++) {
            if (put_lregion_here(map, x, y, nlx, nly, nhx, nhy, rtype, true)) return;
        }
    }
    console.warn(`Couldn't place lregion type ${rtype}!`);
}

export { wallification, fix_wall_spines };

// C ref: mkmaze.c baalz_fixup/fixup_special/check_ransacked/etc.
export function baalz_fixup() { return false; }
export function fixup_special() { return true; }
export function check_ransacked() { return false; }
export function migrate_orc() { return false; }
export function shiny_orc_stuff() { return null; }
export function migr_booty_item() { return null; }
export function stolen_booty() { return null; }

// C ref: mkmaze.c maze_inbounds
export function maze_inbounds(x, y) {
    return x >= 2 && x <= COLNO - 1 && y >= 1 && y <= ROWNO - 1;
}

// C ref: mkmaze.c mkportal
export function mkportal(map, x, y, _todnum, _todlevel) {
    if (!map || !map.at) return null;
    const trap = maketrap(map, x, y, MAGIC_PORTAL);
    if (!trap) return null;
    if (Number.isInteger(_todnum) || Number.isInteger(_todlevel)) {
        trap.dst = {
            dnum: Number.isInteger(_todnum) ? _todnum : 0,
            dlevel: Number.isInteger(_todlevel) ? _todlevel : 0,
        };
    }
    return trap;
}

export function fumaroles(map, list = []) {
    if (!map || !Array.isArray(list) || list.length === 0) return false;
    const valid = list.filter((p) => isok(p?.x, p?.y) && map.at(p.x, p.y));
    if (!valid.length) return false;
    map._water = map._water || { bubbles: [], active: true };
    map._water.fumaroles = valid.map((p) => ({ x: p.x, y: p.y }));
    return true;
}
export function movebubbles(map, dx = 0, dy = 0) {
    const water = map?._water;
    if (!water?.active || !Array.isArray(water.bubbles)) return false;
    if (!Number.isInteger(dx) || !Number.isInteger(dy)) return false;
    for (const b of water.bubbles) {
        if (!b || !Number.isInteger(b.x) || !Number.isInteger(b.y)) continue;
        b.x += dx;
        b.y += dy;
    }
    return true;
}
export function water_friction(map, pos = null) {
    if (!pos || !map?._water?.active) return 0;
    return maybe_adjust_hero_bubble(map, pos) ? 1 : 0;
}
export function save_waterlevel(map) {
    if (!map?._water) return null;
    return JSON.parse(JSON.stringify(map._water));
}
export function restore_waterlevel(map, saved = null) {
    if (!map || !saved || typeof saved !== 'object') return false;
    map._water = JSON.parse(JSON.stringify(saved));
    return true;
}
export function set_wportal(map, x = null, y = null, dst = null) {
    if (!map || !isok(x, y)) return false;
    map._water = map._water || { bubbles: [], active: true };
    map._water.portal = { x, y, dst: dst || null };
    return true;
}
export function setup_waterlevel(map, args = {}) {
    if (!map) return false;
    map._water = {
        bubbles: [],
        active: true,
        heroBubble: null,
        portal: null,
        ...args,
    };
    return true;
}
export function unsetup_waterlevel(map) {
    if (map && map._water) {
        map._water.active = false;
        map._water.bubbles = [];
        map._water.heroBubble = null;
    }
    return true;
}
export function mk_bubble(map, x, y, n) {
    if (!map) return null;
    const bubble = { x, y, n, active: true };
    map._water = map._water || { bubbles: [] };
    map._water.bubbles.push(bubble);
    return bubble;
}
// C ref: mkmaze.c maybe_adjust_hero_bubble
export function maybe_adjust_hero_bubble(map, heroPos = null) {
    if (!map?._water?.bubbles || !heroPos) return false;
    const bubble = map._water.bubbles.find((b) => (
        Number.isInteger(b?.x) && Number.isInteger(b?.y)
        && Number.isInteger(b?.n)
        && heroPos.x >= b.x && heroPos.x < (b.x + b.n)
        && heroPos.y >= b.y && heroPos.y < (b.y + b.n)
    ));
    if (!bubble) return false;
    map._water.heroBubble = bubble;
    return true;
}
export function mv_bubble(map, bubble, dx = 0, dy = 0) {
    if (!map || !bubble || !Number.isInteger(dx) || !Number.isInteger(dy)) return false;
    if (!Number.isInteger(bubble.x) || !Number.isInteger(bubble.y)) return false;
    bubble.x += dx;
    bubble.y += dy;
    return true;
}

// C ref: mkmaze.c walkfrom()
export function walkfrom(map, x, y, ftyp = CROSSWALL, btyp = STONE) {
    if (!map || !isok(x, y)) return;
    const dirs = [
        { dx: 0, dy: -1 },
        { dx: 1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: -1, dy: 0 },
    ];
    const maxX = COLNO - 2;
    const maxY = ROWNO - 2;
    const inBounds = (tx, ty) => tx >= 3 && ty >= 3 && tx <= maxX && ty <= maxY;
    const isBlocked = (tx, ty) => {
        const loc = at(map, tx, ty);
        return !loc || loc.typ !== btyp;
    };
    const carve = (tx, ty) => {
        const loc = at(map, tx, ty);
        if (loc) loc.typ = ftyp;
    };

    carve(x, y);
    while (true) {
        const avail = [];
        for (let i = 0; i < 4; i++) {
            const d = dirs[i];
            const nx = x + d.dx * 2;
            const ny = y + d.dy * 2;
            if (!inBounds(nx, ny)) continue;
            if (isBlocked(nx, ny)) continue;
            avail.push(i);
        }
        if (!avail.length) return;
        const dir = dirs[avail[rn2(avail.length)]];
        x += dir.dx;
        y += dir.dy;
        carve(x, y);
        x += dir.dx;
        y += dir.dy;
        walkfrom(map, x, y, ftyp, btyp);
    }
}

export { bound_digging, repair_irregular_room_boundaries };
