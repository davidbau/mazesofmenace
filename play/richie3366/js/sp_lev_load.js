// sp_lev_load.js — sp_lev.c load_special post-load_lua helpers.
// C ref: sp_lev.c link_doors_rooms, remove_boundary_syms, map_cleanup,
//        flip_level_rnd, solidify_map (load_special / sp_level_compilation tail).

import { insideRoomLikeC } from './hacklib.js';
import { rn2 } from './rng.js';
import { delEngrAt, engrAt } from './engrave.js';
import { tAt, delTrap } from './search.js';
import { floorObjKey, obliterateObjectInLevel } from './floorobj.js';
import {
    COLNO, ROWNO, STONE, ROOM, CROSSWALL, DOOR, SDOOR, IRONBARS,
    IS_WALL, IS_STWALL, IS_DOOR, IS_OBSTRUCTED, IS_POOL, IS_LAVA, IS_TREE,
    IS_DRAWBRIDGE,
    W_NONDIGGABLE, W_NONPASSWALL, ROOMOFFSET, OTYP_BOULDER, isok,
    MAGIC_PORTAL, VIBRATING_SQUARE,
    DB_DIR, DB_NORTH, DB_SOUTH, DB_WEST, DB_EAST,
    ROLLING_BOULDER_TRAP, is_pit,
    MELT_ICE_AWAY, OBJ_FREE, EGD, ESHK, EPRI, SVALL,
} from './const.js';
import { onLevelLikeC } from './hacklib.js';
import { vision_reset } from './vision.js';
import { fixWallSpinesRect } from './wall_spine.js';
import { setWallStateLikeC } from './wall_state.js';
import { heroPunishedLikeC } from './punish_hero.js';
import { unplacebcHeroLikeC, placebcHeroSyncForFlipLikeC } from './ball_bc_hero.js';

/** C: rm.h IS_DOORJOIN */
function isDoorjoinTyp(typ) {
    return IS_OBSTRUCTED(typ) || typ === IRONBARS;
}

/**
 * C: sp_lev.c set_door_orientation — levl[][].horizontal for DOOR/SDOOR.
 * @param {import('./gstate.js').game} g
 */
export function setDoorOrientationLikeC(g, x, y) {
    const lev = g.level;
    const loc = lev?.at(x, y);
    if (!loc) return;
    let wleft = isok(x - 1, y) && (IS_WALL(lev.at(x - 1, y)?.typ)
        || IS_DOOR(lev.at(x - 1, y)?.typ) || lev.at(x - 1, y)?.typ === SDOOR);
    let wright = isok(x + 1, y) && (IS_WALL(lev.at(x + 1, y)?.typ)
        || IS_DOOR(lev.at(x + 1, y)?.typ) || lev.at(x + 1, y)?.typ === SDOOR);
    let wup = isok(x, y - 1) && (IS_WALL(lev.at(x, y - 1)?.typ)
        || IS_DOOR(lev.at(x, y - 1)?.typ) || lev.at(x, y - 1)?.typ === SDOOR);
    let wdown = isok(x, y + 1) && (IS_WALL(lev.at(x, y + 1)?.typ)
        || IS_DOOR(lev.at(x, y + 1)?.typ) || lev.at(x, y + 1)?.typ === SDOOR);
    if (!wleft && !wright && !wup && !wdown) {
        wleft = !isok(x - 1, y) || isDoorjoinTyp(lev.at(x - 1, y)?.typ);
        wright = !isok(x + 1, y) || isDoorjoinTyp(lev.at(x + 1, y)?.typ);
        wup = !isok(x, y - 1) || isDoorjoinTyp(lev.at(x, y - 1)?.typ);
        wdown = !isok(x, y + 1) || isDoorjoinTyp(lev.at(x, y + 1)?.typ);
    }
    loc.horizontal = ((wleft || wright) && !(wup && wdown)) ? 1 : 0;
}

/**
 * C: sp_lev.c shared_with_room
 * @param {import('./gstate.js').game} g
 * @param {object} droom
 */
function sharedWithRoomLikeC(g, x, y, droom) {
    const lev = g.level;
    const loc = lev?.at(x, y);
    if (!loc || !droom) return false;
    const rmno = (g.level.rooms.indexOf(droom) + ROOMOFFSET) | 0;
    if ((loc.roomno | 0) === rmno && !loc.edge) return false;
    if (isok(x - 1, y) && (lev.at(x - 1, y)?.roomno | 0) === rmno && (x - 1) <= (droom.hx | 0)) return true;
    if (isok(x + 1, y) && (lev.at(x + 1, y)?.roomno | 0) === rmno && (x + 1) >= (droom.lx | 0)) return true;
    if (isok(x, y - 1) && (lev.at(x, y - 1)?.roomno | 0) === rmno && (y - 1) <= (droom.hy | 0)) return true;
    if (isok(x, y + 1) && (lev.at(x, y + 1)?.roomno | 0) === rmno && (y + 1) >= (droom.ly | 0)) return true;
    return false;
}

/**
 * C: sp_lev.c maybe_add_door — calls mklev add_door when import available.
 * @param {import('./gstate.js').game} g
 * @param {(x: number, y: number, room: object) => void} addDoorFn
 */
function maybeAddDoorLikeC(g, x, y, droom, addDoorFn) {
    if ((droom.hx | 0) < 0) return;
    const lev = g.level;
    const loc = lev?.at(x, y);
    const rmno = (g.level.rooms.indexOf(droom) + ROOMOFFSET) | 0;
    if ((!droom.irregular && insideRoomLikeC(g, droom, x, y))
        || (loc && (loc.roomno | 0) === rmno)
        || sharedWithRoomLikeC(g, x, y, droom)) {
        addDoorFn(x, y, droom);
    }
}

/**
 * C: sp_lev.c link_doors_rooms
 * @param {import('./gstate.js').game} g
 * @param {(x: number, y: number, room: object) => void} addDoorFn — mklev add_door
 */
export function linkDoorsRoomsLikeC(g, addDoorFn) {
    const lev = g.level;
    if (!lev?.rooms?.length) return;
    for (let y = 0; y < ROWNO; y++) {
        for (let x = 0; x < COLNO; x++) {
            const typ = lev.at(x, y)?.typ;
            if (!IS_DOOR(typ) && typ !== SDOOR) continue;
            setDoorOrientationLikeC(g, x, y);
            for (const room of lev.rooms) {
                if (!room || (room.hx | 0) <= 0) continue;
                maybeAddDoorLikeC(g, x, y, room, addDoorFn);
                const subs = room.sbrooms;
                if (subs) {
                    for (const sub of subs) {
                        if (sub) maybeAddDoorLikeC(g, x, y, sub, addDoorFn);
                    }
                }
            }
        }
    }
}

/**
 * C: sp_lev.c remove_boundary_syms — CROSSWALL + SpLev_Map → ROOM.
 * @param {import('./gstate.js').game} g
 */
export function removeBoundarySymsLikeC(g) {
    const lev = g.level;
    if (!lev) return;
    const spMap = g.desCoder?.spLevMap;
    let hasBounds = false;
    for (let x = 0; x < COLNO - 1; x++) {
        for (let y = 0; y < ROWNO - 1; y++) {
            if (lev.at(x, y)?.typ === CROSSWALL) {
                hasBounds = true;
                break;
            }
        }
        if (hasBounds) break;
    }
    if (!hasBounds || !spMap) return;
    const xMax = g.x_maze_max | 0;
    const yMax = g.y_maze_max | 0;
    for (let x = 0; x < xMax; x++) {
        for (let y = 0; y < yMax; y++) {
            const loc = lev.at(x, y);
            if (loc?.typ === CROSSWALL && spMap[x]?.[y]) loc.typ = ROOM;
        }
    }
}

/**
 * C: trap.c undestroyable_trap subset for map_cleanup.
 * @param {number} ttyp
 */
/** C: trap.c undestroyable_trap */
function undestroyableTrapLikeC(ttyp) {
    return ttyp === MAGIC_PORTAL || ttyp === VIBRATING_SQUARE;
}

/**
 * C: sp_lev.c map_cleanup — remove objs/traps/engr on lava/pool.
 * @param {import('./gstate.js').game} g
 */
export function mapCleanupLikeC(g) {
    const lev = g.level;
    if (!lev) return;
    for (let x = 0; x < COLNO; x++) {
        for (let y = 0; y < ROWNO; y++) {
            const typ = lev.at(x, y)?.typ;
            if (!IS_LAVA(typ) && !IS_POOL(typ)) continue;
            const k = floorObjKey(x, y);
            let o = lev.floorObjHeads?.get(k) ?? null;
            while (o) {
                const next = o.nexthere ?? null;
                if ((o.otyp | 0) === OTYP_BOULDER) obliterateObjectInLevel(g, o);
                o = next;
            }
            const ttmp = tAt(x, y);
            if (ttmp && !undestroyableTrapLikeC(ttmp.ttyp | 0)) delTrap(ttmp);
            if (engrAt(x, y)) delEngrAt(x, y);
        }
    }
}

/**
 * C: sp_lev.c solidify_map — nondiggable walls outside des compiler map.
 * @param {import('./gstate.js').game} g
 */
export function solidifyMapLikeC(g) {
    const lev = g.level;
    const spMap = g.desCoder?.spLevMap;
    if (!lev || !spMap) return;
    for (let x = 0; x < COLNO; x++) {
        for (let y = 0; y < ROWNO; y++) {
            const loc = lev.at(x, y);
            if (!loc) continue;
            const typ = loc.typ | 0;
            if ((IS_STWALL(typ) || IS_TREE(typ)) && !spMap[x]?.[y]) {
                loc.wall_info = (loc.wall_info | 0) | W_NONDIGGABLE | W_NONPASSWALL;
            }
        }
    }
}

/**
 * C: mklev.c get_level_extends — bounds for flip_level (subset of mklev finalize).
 * @param {import('./gstate.js').game} g
 */
function getLevelExtendsFlipLikeC(g) {
    const map = g.level;
    if (!map) return { minx: 1, maxx: COLNO - 1, miny: 0, maxy: ROWNO - 1 };
    let xmin = 0;
    let xmax = COLNO - 1;
    let ymin = 0;
    let ymax = ROWNO - 1;
    let found = false;
    let nonwall = false;
    for (xmin = 0; !found && xmin <= COLNO - 1; xmin++) {
        for (let y = 0; y <= ROWNO - 1; y++) {
            const typ = map.at(xmin, y)?.typ ?? STONE;
            if (typ !== STONE) {
                found = true;
                if (!IS_WALL(typ)) nonwall = true;
            }
        }
    }
    xmin -= (nonwall || !map.flags?.is_maze_lev) ? 2 : 1;
    found = false;
    nonwall = false;
    for (xmax = COLNO - 1; !found && xmax >= 0; xmax--) {
        for (let y = 0; y <= ROWNO - 1; y++) {
            const typ = map.at(xmax, y)?.typ ?? STONE;
            if (typ !== STONE) {
                found = true;
                if (!IS_WALL(typ)) nonwall = true;
            }
        }
    }
    xmax += (nonwall || !map.flags?.is_maze_lev) ? 2 : 1;
    found = false;
    nonwall = false;
    for (ymin = 0; !found && ymin <= ROWNO - 1; ymin++) {
        for (let x = xmin; x <= xmax; x++) {
            const typ = map.at(x, ymin)?.typ ?? STONE;
            if (typ !== STONE) {
                found = true;
                if (!IS_WALL(typ)) nonwall = true;
            }
        }
    }
    ymin -= (nonwall || !map.flags?.is_maze_lev) ? 2 : 1;
    found = false;
    nonwall = false;
    for (ymax = ROWNO - 1; !found && ymax >= 0; ymax--) {
        for (let x = xmin; x <= xmax; x++) {
            const typ = map.at(x, ymax)?.typ ?? STONE;
            if (typ !== STONE) {
                found = true;
                if (!IS_WALL(typ)) nonwall = true;
            }
        }
    }
    ymax += (nonwall || !map.flags?.is_maze_lev) ? 2 : 1;
    let minx = xmin | 0;
    let maxx = xmax | 0;
    let miny = ymin | 0;
    let maxy = ymax | 0;
    if (miny < 0) miny = 0;
    if (minx < 1) minx = 1;
    if (maxx >= COLNO) maxx = COLNO - 1;
    if (maxy >= ROWNO) maxy = ROWNO - 1;
    return { minx, maxx, miny, maxy };
}

/** @param {object} otmp @param {number} x @param {number} y */
function relinkFloorChainCoords(otmp, x, y) {
    for (let o = otmp; o; o = o.nexthere) {
        o.ox = x | 0;
        o.oy = y | 0;
    }
}

/**
 * @param {import('./gstate.js').game} g
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 */
function swapFloorHeadsFlipLikeC(g, x1, y1, x2, y2) {
    const heads = g.level?.floorObjHeads;
    if (!heads) return;
    const k1 = floorObjKey(x1, y1);
    const k2 = floorObjKey(x2, y2);
    const h1 = heads.get(k1);
    const h2 = heads.get(k2);
    if (h1) relinkFloorChainCoords(h1, x2, y2);
    if (h2) relinkFloorChainCoords(h2, x1, y1);
    if (h1) heads.set(k2, h1);
    else heads.delete(k2);
    if (h2) heads.set(k1, h2);
    else heads.delete(k1);
}

/**
 * @param {import('./game.js').GameMap} map
 */
function swapLocCellsFlipLikeC(map, x1, y1, x2, y2) {
    const a = map.at(x1, y1);
    const b = map.at(x2, y2);
    if (!a || !b) return;
    flipDbridgeVerticalLikeC(a);
    flipDbridgeVerticalLikeC(b);
    const tmp = { ...a };
    Object.assign(a, b);
    Object.assign(b, tmp);
}

/** C: sp_lev.c inFlipArea */
function inFlipAreaLikeC(x, y, minx, maxx, miny, maxy) {
    return (x | 0) >= minx && (x | 0) <= maxx && (y | 0) >= miny && (y | 0) <= maxy;
}

/** C: sp_lev.c flip_vault_guard — #wizfliplevel; egd + fakecorr */
function flipVaultGuardLikeC(g, m, bits, minx, maxx, miny, maxy, flipX, flipY) {
    void g;
    void m;
    const egd = EGD(m);
    if (!egd) return;
    const flipPair = (ox, oy) => {
        const o = { x: ox | 0, y: oy | 0 };
        const x = o.x;
        const y = o.y;
        if (!inFlipAreaLikeC(x, y, minx, maxx, miny, maxy)) return o;
        if (bits & 1) o.y = flipY(y);
        if (bits & 2) o.x = flipX(x);
        return o;
    };
    if (egd.gdx !== undefined) {
        const p = flipPair(egd.gdx | 0, egd.gdy | 0);
        egd.gdx = p.x;
        egd.gdy = p.y;
    }
    if (egd.ogx !== undefined) {
        const p = flipPair(egd.ogx | 0, egd.ogy | 0);
        egd.ogx = p.x;
        egd.ogy = p.y;
    }
    const fc = egd.fakecorr;
    const fcbeg = egd.fcbeg | 0;
    const fcend = egd.fcend | 0;
    if (fc && fcend > fcbeg) {
        for (let i = fcbeg; i < fcend; i++) {
            const seg = fc[i];
            if (!seg) continue;
            const p = flipPair(seg.fx | 0, seg.fy | 0);
            seg.fx = p.x;
            seg.fy = p.y;
        }
    }
}

/** C: sp_lev.c flip_level — poison cloud region rects (gn.n_regions) — not ported in JS yet (no gr.regions). */

/** C: sp_lev.c flip_level — MELT_ICE_AWAY timer arg packing */
function flipMeltIceTimersLikeC(g, bits, minx, maxx, miny, maxy, flipY, flipX) {
    const arr = g.level?.timers;
    if (!arr?.length) return;
    for (const timer of arr) {
        if (timer.func !== MELT_ICE_AWAY) continue;
        let ty = timer.y | 0;
        let tx = timer.x | 0;
        if (bits & 1) ty = flipY(ty);
        if (bits & 2) tx = flipX(tx);
        timer.x = tx;
        timer.y = ty;
    }
}

/** C: sp_lev.c flip_visuals — seenv octants in flip area (#wizfliplevel). */
function flipVisualsExtrasLikeC(g, bits, minx, maxx, miny, maxy, flipY, flipX) {
    const map = g.level;
    if (!map) return;
    for (let y = miny; y <= maxy; y++) {
        for (let x = minx; x <= maxx; x++) {
            const lev = map.at(x, y);
            if (!lev) continue;
            let seenv = (lev.seenv | 0) & 0xff;
            if (seenv === 0) continue;
            if (seenv !== SVALL) {
                if (bits & 1) {
                    seenv = swapbitsLikeC(seenv, 2, 4);
                    seenv = swapbitsLikeC(seenv, 1, 5);
                    seenv = swapbitsLikeC(seenv, 0, 6);
                }
                if (bits & 2) {
                    seenv = swapbitsLikeC(seenv, 2, 0);
                    seenv = swapbitsLikeC(seenv, 3, 7);
                    seenv = swapbitsLikeC(seenv, 4, 6);
                }
                lev.seenv = seenv;
            }
        }
    }
}

function uballCarriedForFlipLikeC(g) {
    for (let o = g.invent; o; o = o.nobj) {
        if (o === g.uball) return true;
        if (o.cobj) {
            for (let c = o.cobj; c; c = c.nobj) {
                if (c === g.uball) return true;
            }
        }
    }
    return false;
}

/** C: sp_lev.c Flip_coord */
function flipCoordLikeC(cc, bits, minx, maxx, miny, maxy, flipX, flipY) {
    const x = cc?.x | 0;
    const y = cc?.y | 0;
    if (!x || !inFlipAreaLikeC(x, y, minx, maxx, miny, maxy)) return;
    if (bits & 1) cc.y = flipY(y);
    if (bits & 2) cc.x = flipX(x);
}

/** C: hacklib.c swapbits */
function swapbitsLikeC(val, indx1, indx2) {
    let v = val | 0;
    const b1 = (v >> indx1) & 1;
    const b2 = (v >> indx2) & 1;
    if (b1 !== b2) v ^= (1 << indx1) | (1 << indx2);
    return v;
}

/** C: sp_lev.c flip_encoded_dir_bits — pit conjoined direction bitmask */
function flipEncodedDirBitsLikeC(flp, val) {
    let v = val | 0;
    if (flp & 1) {
        v = swapbitsLikeC(v, 1, 7);
        v = swapbitsLikeC(v, 2, 6);
        v = swapbitsLikeC(v, 3, 5);
    }
    if (flp & 2) {
        v = swapbitsLikeC(v, 1, 3);
        v = swapbitsLikeC(v, 0, 4);
        v = swapbitsLikeC(v, 7, 5);
    }
    return v;
}

/** C: sp_lev.c flip_level trap block — rolling boulder launch + pit conjoined */
function flipTrapLevelCreationLikeC(t, bits, flipX, flipY) {
    const tt = t.ttyp | 0;
    if (bits & 1) {
        t.ty = flipY(t.ty | 0);
        if (tt === ROLLING_BOULDER_TRAP) {
            if (t.launch) t.launch.y = flipY(t.launch.y | 0);
            if (t.launch2) t.launch2.y = flipY(t.launch2.y | 0);
        } else if (is_pit(tt) && t.conjoined) {
            t.conjoined = flipEncodedDirBitsLikeC(bits, t.conjoined | 0);
        }
    }
    if (bits & 2) {
        t.tx = flipX(t.tx | 0);
        if (tt === ROLLING_BOULDER_TRAP) {
            if (t.launch) t.launch.x = flipX(t.launch.x | 0);
            if (t.launch2) t.launch2.x = flipX(t.launch2.x | 0);
        } else if (is_pit(tt) && t.conjoined) {
            t.conjoined = flipEncodedDirBitsLikeC(bits, t.conjoined | 0);
        }
    }
}

/** C: worm.c flip_worm_segs_vertical */
function flipWormSegsVerticalLikeC(g, wormno, miny, maxy) {
    let curr = g.level?.wormTails?.[wormno | 0];
    while (curr) {
        curr.wy = maxy - (curr.wy | 0) + miny;
        curr = curr.nseg;
    }
}

/** C: worm.c flip_worm_segs_horizontal */
function flipWormSegsHorizontalLikeC(g, wormno, minx, maxx) {
    let curr = g.level?.wormTails?.[wormno | 0];
    while (curr) {
        curr.wx = maxx - (curr.wx | 0) + minx;
        curr = curr.nseg;
    }
}

/** C: sp_lev.c flip_dbridge_horizontal */
function flipDbridgeHorizontalLikeC(loc) {
    if (!loc || !IS_DRAWBRIDGE(loc.typ)) return;
    const m = loc.drawbridgemask | 0;
    const dir = m & DB_DIR;
    if (dir === DB_WEST) loc.drawbridgemask = (m & ~DB_DIR) | DB_EAST;
    else if (dir === DB_EAST) loc.drawbridgemask = (m & ~DB_DIR) | DB_WEST;
}

/** C: sp_lev.c flip_dbridge_vertical */
function flipDbridgeVerticalLikeC(loc) {
    if (!loc || !IS_DRAWBRIDGE(loc.typ)) return;
    const m = loc.drawbridgemask | 0;
    const dir = m & DB_DIR;
    if (dir === DB_NORTH) loc.drawbridgemask = (m & ~DB_DIR) | DB_SOUTH;
    else if (dir === DB_SOUTH) loc.drawbridgemask = (m & ~DB_DIR) | DB_NORTH;
}

/** C: sp_lev.c flip_level — swap drawbridge dir before horizontal terrain swap */
function swapLocCellsFlipHorizontalLikeC(map, x1, y1, x2, y2) {
    const a = map.at(x1, y1);
    const b = map.at(x2, y2);
    if (!a || !b) return;
    flipDbridgeHorizontalLikeC(a);
    flipDbridgeHorizontalLikeC(b);
    const tmp = { ...a };
    Object.assign(a, b);
    Object.assign(b, tmp);
}

/**
 * C: sp_lev.c flip_level — room / subroom bounds.
 * @param {object} room
 */
function flipRoomBoundsLikeC(room, bits, flipX, flipY) {
    if (!room || (room.hx | 0) < 0) return;
    if (bits & 1) {
        let ly = flipY(room.ly | 0);
        let hy = flipY(room.hy | 0);
        if (ly > hy) { const t = ly; ly = hy; hy = t; }
        room.ly = ly;
        room.hy = hy;
    }
    if (bits & 2) {
        let lx = flipX(room.lx | 0);
        let hx = flipX(room.hx | 0);
        if (lx > hx) { const t = lx; lx = hx; hx = t; }
        room.lx = lx;
        room.hx = hx;
    }
    const nsub = room.nsubrooms | 0;
    for (let i = 0; i < nsub; i++) {
        flipRoomBoundsLikeC(room.sbrooms?.[i], bits, flipX, flipY);
    }
}

/** C: sp_lev.c lregions[] box flip */
function flipLregionBoxLikeC(box, bits, flipX, flipY) {
    if (!box) return;
    if (bits & 1) {
        let y1 = flipY(box.y1 | 0);
        let y2 = flipY(box.y2 | 0);
        if (y1 > y2) { const t = y1; y1 = y2; y2 = t; }
        box.y1 = y1;
        box.y2 = y2;
    }
    if (bits & 2) {
        let x1 = flipX(box.x1 | 0);
        let x2 = flipX(box.x2 | 0);
        if (x1 > x2) { const t = x1; x1 = x2; x2 = t; }
        box.x1 = x1;
        box.x2 = x2;
    }
}

/** @param {import('./gstate.js').game} g */
function flipFloorObjListCoordsLikeC(g, bits, minx, maxx, miny, maxy, flipX, flipY) {
    const lvl = g.level;
    if (!lvl) return;
    for (let o = lvl.fobj; o; o = o.nobj) {
        const ox = o.ox | 0;
        const oy = o.oy | 0;
        if (!inFlipAreaLikeC(ox, oy, minx, maxx, miny, maxy)) continue;
        if (bits & 1) o.oy = flipY(oy);
        if (bits & 2) o.ox = flipX(ox);
    }
    const buried = lvl.buriedObjHeads;
    if (buried) {
        for (const head of buried.values()) {
            for (let o = head; o; o = o.nexthere) {
                const ox = o.ox | 0;
                const oy = o.oy | 0;
                if (!inFlipAreaLikeC(ox, oy, minx, maxx, miny, maxy)) continue;
                if (bits & 1) o.oy = flipY(oy);
                if (bits & 2) o.ox = flipX(ox);
            }
        }
    }
}

/**
 * C: sp_lev.c flip_level — level creation (`extras` false) and **`#wizfliplevel`** (`extras` true).
 * @param {import('./gstate.js').game} g
 * @param {number} flp — bit 1 vertical, bit 2 horizontal
 * @param {boolean} extras
 */
export function flipLevelLikeC(g, flp, extras) {
    const bits = flp | 0;
    if ((bits & 3) === 0) return;
    const map = g.level;
    if (!map) return;
    const { minx, maxx, miny, maxy } = getLevelExtendsFlipLikeC(g);
    const flipY = (y) => (maxy - (y | 0)) + miny;
    const flipX = (x) => (maxx - (x | 0)) + minx;

    let ballActive = false;
    let ballFliparea = false;
    if (extras && heroPunishedLikeC(g)) {
        const ball = g.uball;
        const chain = g.uchain;
        const wh = ball?.where;
        const ballPlaced = wh === undefined || (wh | 0) !== OBJ_FREE;
        if (ball && chain && ballPlaced) {
            ballActive = true;
            if (uballCarriedForFlipLikeC(g)) {
                ball.ox = g.u.ux | 0;
                ball.oy = g.u.uy | 0;
            }
            const bIn = inFlipAreaLikeC(ball.ox | 0, ball.oy | 0, minx, maxx, miny, maxy);
            const cIn = inFlipAreaLikeC(chain.ox | 0, chain.oy | 0, minx, maxx, miny, maxy);
            const uIn = inFlipAreaLikeC(g.u.ux | 0, g.u.uy | 0, minx, maxx, miny, maxy);
            ballFliparea = (bIn === cIn) && (bIn === uIn);
            if (!ballFliparea) unplacebcHeroLikeC(g);
        }
    }

    for (let st = g.stairs; st; st = st.next) {
        if (bits & 1) st.sy = flipY(st.sy | 0);
        if (bits & 2) st.sx = flipX(st.sx | 0);
    }

    for (const t of map.traps || []) {
        const tx = t.tx | 0;
        const ty = t.ty | 0;
        if (!inFlipAreaLikeC(tx, ty, minx, maxx, miny, maxy)) continue;
        flipTrapLevelCreationLikeC(t, bits, flipX, flipY);
    }

    flipFloorObjListCoordsLikeC(g, bits, minx, maxx, miny, maxy, flipX, flipY);

    for (const m of map.monsters || []) {
        if (extras && (m.isgd | 0)) flipVaultGuardLikeC(g, m, bits, minx, maxx, miny, maxy, flipX, flipY);
        if ((m.isgd | 0) && !(m.mx | 0)) continue;
        const mx = m.mx | 0;
        const my = m.my | 0;
        if (!mx && !my) continue;
        if (!inFlipAreaLikeC(mx, my, minx, maxx, miny, maxy)) continue;
        if (bits & 1) m.my = flipY(my);
        if (bits & 2) m.mx = flipX(mx);
        if (m.mgoal) flipCoordLikeC(m.mgoal, bits, minx, maxx, miny, maxy, flipX, flipY);
        const wn = m.wormno | 0;
        if (wn) {
            if (bits & 1) flipWormSegsVerticalLikeC(g, wn, miny, maxy);
            if (bits & 2) flipWormSegsHorizontalLikeC(g, wn, minx, maxx);
        }
    }

    if (extras) {
        const uz = g.u?.uz;
        for (const entry of g.migratingMons || []) {
            const mtmp = entry.mtmp;
            if (!mtmp) continue;
            if ((mtmp.isgd | 0) && uz && EGD(mtmp) && onLevelLikeC(uz, EGD(mtmp).gdlevel)) {
                flipVaultGuardLikeC(g, mtmp, bits, minx, maxx, miny, maxy, flipX, flipY);
            } else if ((mtmp.ispriest | 0) && uz && EPRI(mtmp) && onLevelLikeC(uz, EPRI(mtmp).shrlevel)) {
                const ep = EPRI(mtmp);
                if (ep?.shrpos) flipCoordLikeC(ep.shrpos, bits, minx, maxx, miny, maxy, flipX, flipY);
            } else if ((mtmp.isshk | 0) && uz && ESHK(mtmp) && onLevelLikeC(uz, ESHK(mtmp).shoplevel)) {
                const es = ESHK(mtmp);
                if (es?.shk) flipCoordLikeC(es.shk, bits, minx, maxx, miny, maxy, flipX, flipY);
                if (es?.shd) flipCoordLikeC(es.shd, bits, minx, maxx, miny, maxy, flipX, flipY);
            }
        }
    }

    for (const e of map.engravings || []) {
        const ex = e.engr_x | 0;
        const ey = e.engr_y | 0;
        if (bits & 1) e.engr_y = flipY(ey);
        if (bits & 2) e.engr_x = flipX(ex);
    }

    for (const r of g.lregions || []) {
        if (!r) continue;
        flipLregionBoxLikeC(r.inarea, bits, flipX, flipY);
        flipLregionBoxLikeC(r.delarea, bits, flipX, flipY);
    }

    for (const room of map.rooms || []) {
        flipRoomBoundsLikeC(room, bits, flipX, flipY);
    }

    const nDoors = map.doorindex | 0;
    for (let i = 0; i < nDoors; i++) {
        flipCoordLikeC(map.doors[i], bits, minx, maxx, miny, maxy, flipX, flipY);
    }

    if (bits & 1) {
        const half = miny + Math.trunc((maxy - miny + 1) / 2);
        for (let x = minx; x <= maxx; x++) {
            for (let y = miny; y < half; y++) {
                const ny = flipY(y);
                swapLocCellsFlipLikeC(map, x, y, x, ny);
                swapFloorHeadsFlipLikeC(g, x, y, x, ny);
            }
        }
    }
    if (bits & 2) {
        const half = minx + Math.trunc((maxx - minx + 1) / 2);
        for (let x = minx; x < half; x++) {
            const nx = flipX(x);
            for (let y = miny; y <= maxy; y++) {
                swapLocCellsFlipHorizontalLikeC(map, x, y, nx, y);
                swapFloorHeadsFlipLikeC(g, x, y, nx, y);
            }
        }
    }

    flipMeltIceTimersLikeC(g, bits, minx, maxx, miny, maxy, flipY, flipX);

    if (extras) {
        const u = g.u;
        if (u && inFlipAreaLikeC(u.ux | 0, u.uy | 0, minx, maxx, miny, maxy)) {
            if (bits & 1) u.uy = flipY(u.uy | 0);
            if (bits & 2) u.ux = flipX(u.ux | 0);
            u.ux0 = u.ux | 0;
            u.uy0 = u.uy | 0;
        }
        if (ballActive && !ballFliparea) placebcHeroSyncForFlipLikeC(g);
        if (g.iflags?.travelcc) flipCoordLikeC(g.iflags.travelcc, bits, minx, maxx, miny, maxy, flipX, flipY);
        const digp = g.context?.digging?.pos;
        if (digp) flipCoordLikeC(digp, bits, minx, maxx, miny, maxy, flipX, flipY);
    }

    fixWallSpinesRect(g, 1, 0, COLNO - 1, ROWNO - 1);
    if (extras && bits) {
        setWallStateLikeC();
        flipVisualsExtrasLikeC(g, bits, minx, maxx, miny, maxy, flipY, flipX);
    }
    vision_reset();
}

/**
 * C: sp_lev.c flip_level_rnd
 * @param {import('./gstate.js').game} g
 * @param {number} allowFlips — bitmask passed from des coder allow_flips
 * @param {boolean} extras — FALSE during load_special
 */
export function flipLevelRndLikeC(g, allowFlips, extras) {
    let c = 0;
    const flp = allowFlips | 0;
    if ((flp & 1) && rn2(2)) c |= 1;
    if ((flp & 2) && rn2(2)) c |= 2;
    if (c) flipLevelLikeC(g, c, extras);
}
