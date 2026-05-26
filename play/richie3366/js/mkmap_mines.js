// mkmap_mines.js — C mkmap.c `mkmap` + helpers for **`LVLINIT_MINES`** (des **`level_init`**).
// C ref: mkmap.c — init_map, init_fill, pass_one/two/three, join_map, finish_map, flood_fill_rm.

import {
    COLNO, ROWNO, NO_ROOM, ROOMOFFSET, OROOM, MAXNROFROOMS, IS_WALL, IS_DOOR, IS_OBSTRUCTED,
    IS_ROOM, TREE, LAVAPOOL, ICE, ICED_POOL, ICED_MOAT, isok,
} from './const.js';
import { rn1, rnd, rn2 } from './rng.js';

/** @typedef {{ init_style: number, fg: number, bg: number, smoothed: boolean, joined: boolean, lit: number, walled: boolean, icedpools?: boolean, filling?: number }} LevInitLikeC */

/** C: mkmap.c WIDTH / HEIGHT */
const WIDTH = COLNO - 2;
const HEIGHT = ROWNO - 1;

const DIRS = [-1, -1, -1, 0, -1, 1, 0, -1, 0, 1, 1, -1, 1, 0, 1, 1];

/**
 * @param {import('./gstate.js').game} g
 * @param {number} xmax
 * @param {number} ymax
 */
function mazeBoundsLikeC(g, xmax, ymax) {
    g.x_maze_max = xmax | 0;
    g.y_maze_max = ymax | 0;
}

/**
 * @param {import('./gstate.js').game} g
 * @param {LevInitLikeC} initLev
 * @param {{
 *   addRoom: (lx: number, ly: number, hx: number, hy: number, lit: boolean, rtype: number, special: boolean) => void,
 *   digCorridor: (org: {x:number,y:number}, dest: {x:number,y:number}, npoints: null, nxcor: boolean, ftyp: number, btyp: number) => boolean,
 *   somexy: (croom: object, c: {x:number,y:number}) => boolean,
 *   wallification: (x1: number, y1: number, x2: number, y2: number) => void,
 *   litstateRnd: (litstate: number) => boolean,
 * }} deps
 */
export function mkmapLikeC(g, initLev, deps) {
    const bgTyp = initLev.bg | 0;
    const fgTyp = initLev.fg | 0;
    const smooth = !!initLev.smoothed;
    const join = !!initLev.joined;
    let lit = initLev.lit | 0;
    const walled = !!initLev.walled;
    const icedpools = !!initLev.icedpools;

    mazeBoundsLikeC(g, COLNO - 1, ROWNO - 1);

    lit = deps.litstateRnd(lit) ? 1 : 0;

    const newLocations = new Int8Array((WIDTH + 1) * HEIGHT);

    initMapLikeC(g, bgTyp);
    initFillLikeC(g, bgTyp, fgTyp);

    for (let i = 0; i < 1; i++) passOneLikeC(g, bgTyp, fgTyp);
    for (let i = 0; i < 1; i++) passTwoLikeC(g, bgTyp, fgTyp, newLocations);
    if (smooth) {
        for (let i = 0; i < 2; i++) passThreeLikeC(g, bgTyp, fgTyp, newLocations);
    }
    if (join) joinMapLikeC(g, bgTyp, fgTyp, deps);
    finishMapLikeC(g, fgTyp, bgTyp, lit, walled, icedpools, deps);
    const lf = g.level?.flags;
    if (lf && walled && join) {
        lf.is_maze_lev = false;
        lf.is_cavernous_lev = true;
    }
}

/** C: mkmap.c init_map */
function initMapLikeC(g, bgTyp) {
    const map = g.level;
    if (!map) return;
    for (let x = 1; x < COLNO; x++) {
        for (let y = 0; y < ROWNO; y++) {
            const loc = map.at(x, y);
            if (!loc) continue;
            loc.roomno = NO_ROOM;
            loc.typ = bgTyp;
            loc.lit = false;
        }
    }
}

/** C: mkmap.c init_fill */
function initFillLikeC(g, bgTyp, fgTyp) {
    const map = g.level;
    if (!map) return;
    const limit = Math.trunc((WIDTH * HEIGHT * 2) / 5);
    let count = 0;
    while (count < limit) {
        const x = rn1(WIDTH - 1, 2);
        const y = rnd(HEIGHT - 1);
        const loc = map.at(x, y);
        if (loc && (loc.typ | 0) === bgTyp) {
            loc.typ = fgTyp;
            count++;
        }
    }
}

/** C: mkmap.c get_map */
function getMapLikeC(g, col, row, bgTyp) {
    if (col <= 0 || row < 0 || col > WIDTH || row >= HEIGHT) return bgTyp;
    return g.level?.at(col, row)?.typ ?? bgTyp;
}

/** C: mkmap.c pass_one */
function passOneLikeC(g, bgTyp, fgTyp) {
    const map = g.level;
    if (!map) return;
    for (let x = 2; x <= WIDTH; x++) {
        for (let y = 1; y < HEIGHT; y++) {
            let count = 0;
            for (let dr = 0; dr < 8; dr++) {
                const dx = DIRS[dr * 2];
                const dy = DIRS[dr * 2 + 1];
                if (getMapLikeC(g, x + dx, y + dy, bgTyp) === fgTyp) count++;
            }
            const loc = map.at(x, y);
            if (!loc) continue;
            if (count <= 2) loc.typ = bgTyp;
            else if (count >= 5 && count <= 8) loc.typ = fgTyp;
        }
    }
}

function newLocIdx(i, j) {
    return j * (WIDTH + 1) + i;
}

/** C: mkmap.c pass_two */
function passTwoLikeC(g, bgTyp, fgTyp, newLocations) {
    const map = g.level;
    if (!map) return;
    for (let x = 2; x <= WIDTH; x++) {
        for (let y = 1; y < HEIGHT; y++) {
            let count = 0;
            for (let dr = 0; dr < 8; dr++) {
                const dx = DIRS[dr * 2];
                const dy = DIRS[dr * 2 + 1];
                if (getMapLikeC(g, x + dx, y + dy, bgTyp) === fgTyp) count++;
            }
            newLocations[newLocIdx(x, y)] = count === 5 ? bgTyp : getMapLikeC(g, x, y, bgTyp);
        }
    }
    for (let x = 2; x <= WIDTH; x++) {
        for (let y = 1; y < HEIGHT; y++) {
            const loc = map.at(x, y);
            if (loc) loc.typ = newLocations[newLocIdx(x, y)] | 0;
        }
    }
}

/** C: mkmap.c pass_three */
function passThreeLikeC(g, bgTyp, fgTyp, newLocations) {
    const map = g.level;
    if (!map) return;
    for (let x = 2; x <= WIDTH; x++) {
        for (let y = 1; y < HEIGHT; y++) {
            let count = 0;
            for (let dr = 0; dr < 8; dr++) {
                const dx = DIRS[dr * 2];
                const dy = DIRS[dr * 2 + 1];
                if (getMapLikeC(g, x + dx, y + dy, bgTyp) === fgTyp) count++;
            }
            newLocations[newLocIdx(x, y)] = count < 3 ? bgTyp : getMapLikeC(g, x, y, bgTyp);
        }
    }
    for (let x = 2; x <= WIDTH; x++) {
        for (let y = 1; y < HEIGHT; y++) {
            const loc = map.at(x, y);
            if (loc) loc.typ = newLocations[newLocIdx(x, y)] | 0;
        }
    }
}

/** C: mkmap.c flood_fill_rm — anyroom FALSE */
function floodFillRmLikeC(g, sx, sy, rmno, lit, anyroom, fgTyp, gm) {
    const map = g.level;
    if (!map) return;
    while (sx > 0
        && ((anyroom ? IS_ROOM(map.at(sx, sy)?.typ | 0) : (map.at(sx, sy)?.typ | 0) === fgTyp))
        && ((map.at(sx, sy)?.roomno | 0) !== rmno)) {
        sx--;
    }
    sx++;
    if (sx < gm.min_rx) gm.min_rx = sx;
    if (sy < gm.min_ry) gm.min_ry = sy;

    let nx;
    let i = sx;
    for (; i <= WIDTH && (map.at(i, sy)?.typ | 0) === fgTyp; i++) {
        const loc = map.at(i, sy);
        if (loc) {
            loc.roomno = rmno;
            loc.lit = !!lit;
        }
        gm.n_loc_filled++;
    }
    nx = i;

    if (isok(sx, sy - 1)) {
        for (i = sx; i < nx; i++) {
            if ((map.at(i, sy - 1)?.typ | 0) === fgTyp) {
                if ((map.at(i, sy - 1)?.roomno | 0) !== rmno) {
                    floodFillRmLikeC(g, i, sy - 1, rmno, lit, anyroom, fgTyp, gm);
                }
            } else {
                if ((i > sx || isok(i - 1, sy - 1))
                    && (map.at(i - 1, sy - 1)?.typ | 0) === fgTyp) {
                    if ((map.at(i - 1, sy - 1)?.roomno | 0) !== rmno) {
                        floodFillRmLikeC(g, i - 1, sy - 1, rmno, lit, anyroom, fgTyp, gm);
                    }
                }
                if ((i < nx - 1 || isok(i + 1, sy - 1))
                    && (map.at(i + 1, sy - 1)?.typ | 0) === fgTyp) {
                    if ((map.at(i + 1, sy - 1)?.roomno | 0) !== rmno) {
                        floodFillRmLikeC(g, i + 1, sy - 1, rmno, lit, anyroom, fgTyp, gm);
                    }
                }
            }
        }
    }
    if (isok(sx, sy + 1)) {
        for (i = sx; i < nx; i++) {
            if ((map.at(i, sy + 1)?.typ | 0) === fgTyp) {
                if ((map.at(i, sy + 1)?.roomno | 0) !== rmno) {
                    floodFillRmLikeC(g, i, sy + 1, rmno, lit, anyroom, fgTyp, gm);
                }
            } else {
                if ((i > sx || isok(i - 1, sy + 1))
                    && (map.at(i - 1, sy + 1)?.typ | 0) === fgTyp) {
                    if ((map.at(i - 1, sy + 1)?.roomno | 0) !== rmno) {
                        floodFillRmLikeC(g, i - 1, sy + 1, rmno, lit, anyroom, fgTyp, gm);
                    }
                }
                if ((i < nx - 1 || isok(i + 1, sy + 1))
                    && (map.at(i + 1, sy + 1)?.typ | 0) === fgTyp) {
                    if ((map.at(i + 1, sy + 1)?.roomno | 0) !== rmno) {
                        floodFillRmLikeC(g, i + 1, sy + 1, rmno, lit, anyroom, fgTyp, gm);
                    }
                }
            }
        }
    }

    if (nx > gm.max_rx) gm.max_rx = nx - 1;
    if (sy > gm.max_ry) gm.max_ry = sy;
}

/** C: mkmap.c join_map_cleanup */
function joinMapCleanupLikeC(g) {
    const map = g.level;
    if (!map) return;
    for (let x = 1; x < COLNO; x++) {
        for (let y = 0; y < ROWNO; y++) {
            const loc = map.at(x, y);
            if (loc) loc.roomno = NO_ROOM;
        }
    }
    map.nroom = 0;
    if (!map.rooms) map.rooms = [];
    map.rooms[0] = { hx: -1 };
}

/** C: mkmap.c join_map */
function joinMapLikeC(g, bgTyp, fgTyp, deps) {
    const map = g.level;
    if (!map) return;
    const gm = { min_rx: 0, max_rx: 0, min_ry: 0, max_ry: 0 };
    const gn = { n_loc_filled: 0 };

    let abortJoin = false;
    outer: for (let x = 2; x <= WIDTH; x++) {
        for (let y = 1; y < HEIGHT; y++) {
            const loc = map.at(x, y);
            if (!loc) continue;
            if ((loc.typ | 0) === fgTyp && (loc.roomno | 0) === NO_ROOM) {
                gm.min_rx = gm.max_rx = x;
                gm.min_ry = gm.max_ry = y;
                gn.n_loc_filled = 0;
                const nroom = map.nroom | 0;
                floodFillRmLikeC(g, x, y, nroom + ROOMOFFSET, false, false, fgTyp, gm);
                if (gn.n_loc_filled > 3) {
                    deps.addRoom(gm.min_rx, gm.min_ry, gm.max_rx, gm.max_ry, false, OROOM, true);
                    const croom = map.rooms[(map.nroom | 0) - 1];
                    if (croom) croom.irregular = true;
                    if ((map.nroom | 0) >= MAXNROFROOMS * 2) {
                        abortJoin = true;
                        break outer;
                    }
                } else {
                    for (let sx = gm.min_rx; sx <= gm.max_rx; sx++) {
                        for (let sy = gm.min_ry; sy <= gm.max_ry; sy++) {
                            const l2 = map.at(sx, sy);
                            if (l2 && (l2.roomno | 0) === nroom + ROOMOFFSET) {
                                l2.typ = bgTyp;
                                l2.roomno = NO_ROOM;
                            }
                        }
                    }
                }
            }
        }
    }
    void abortJoin;

    const rooms = map.rooms || [];
    let cr1 = 0;
    for (let cr2 = 1; cr2 < (map.nroom | 0); ) {
        const croom = rooms[cr1];
        const croom2 = rooms[cr2];
        if (!croom || !croom2 || (croom.hx | 0) < 0) break;
        const sm = { x: 0, y: 0 };
        const em = { x: 0, y: 0 };
        if (!deps.somexy(croom, sm) || !deps.somexy(croom2, em)) {
            sm.x = croom.lx + Math.trunc((croom.hx - croom.lx) / 2);
            sm.y = croom.ly + Math.trunc((croom.hy - croom.ly) / 2);
            em.x = croom2.lx + Math.trunc((croom2.hx - croom2.lx) / 2);
            em.y = croom2.ly + Math.trunc((croom2.hy - croom2.ly) / 2);
        }
        deps.digCorridor(sm, em, null, false, fgTyp, bgTyp);
        if (croom2.lx > croom.hx
            || ((croom2.ly > croom.hy || croom2.hy < croom.ly) && rn2(3))) {
            cr1 = cr2;
        }
        cr2++;
    }
    joinMapCleanupLikeC(g);
}

/** C: mkmap.c finish_map */
function finishMapLikeC(g, fgTyp, bgTyp, lit, walled, icedpools, deps) {
    const map = g.level;
    if (!map) return;
    if (walled) deps.wallification(1, 0, COLNO - 1, ROWNO - 1);
    if (lit) {
        for (let x = 1; x < COLNO; x++) {
            for (let y = 0; y < ROWNO; y++) {
                const loc = map.at(x, y);
                if (!loc) continue;
                const t = loc.typ | 0;
                if ((!IS_OBSTRUCTED(fgTyp) && t === fgTyp)
                    || (!IS_OBSTRUCTED(bgTyp) && t === bgTyp)
                    || (bgTyp === TREE && t === bgTyp)
                    || (walled && IS_WALL(t))) {
                    loc.lit = true;
                }
            }
        }
        for (let x = 0; x < (map.nroom | 0); x++) {
            const r = map.rooms[x];
            if (r) r.rlit = 1;
        }
    }
    for (let x = 1; x < COLNO; x++) {
        for (let y = 0; y < ROWNO; y++) {
            const loc = map.at(x, y);
            if (!loc) continue;
            if ((loc.typ | 0) === LAVAPOOL) loc.lit = true;
            else if ((loc.typ | 0) === ICE) {
                loc.icedpool = icedpools ? ICED_POOL : ICED_MOAT;
            }
        }
    }
}

/**
 * C: sp_lev.c lvlfill_solid — used before **`mkmap`** for mines **`filling`**.
 * @param {import('./gstate.js').game} g
 */
export function lvlfillSolidLikeC(g, filling, lit) {
    const map = g.level;
    if (!map) return;
    const xmax = (g.x_maze_max | 0) || (COLNO - 1);
    const ymax = (g.y_maze_max | 0) || (ROWNO - 1);
    for (let x = 2; x <= xmax; x++) {
        for (let y = 0; y <= ymax; y++) {
            const loc = map.at(x, y);
            if (!loc) continue;
            loc.typ = filling | 0;
            loc.lit = !!lit;
            loc.flags = 0;
            loc.horizontal = 0;
            loc.roomno = 0;
            loc.edge = 0;
        }
    }
}
