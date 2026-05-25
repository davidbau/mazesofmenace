// vision.js — C ref: vision.c Algorithm C shadow-casting
// Stripped-down port for the contest skeleton: no light sources, boulders,
// mimics, underwater, blindness, or pit handling.
// Contestants should port the full vision.c for complete parity.

import { game } from './gstate.js';
import {
    COLNO, ROWNO, DOOR, SDOOR, TREE,
    D_CLOSED, D_LOCKED, D_TRAPPED,
    SV0, SV1, SV2, SV3, SV4, SV5, SV6, SV7, SVALL,
    IS_WALL, IS_OBSTRUCTED, IS_DOOR, ROOMOFFSET,
    Is_rogue_level,
} from './const.js';
import { newsym } from './display.js';

const COULD_SEE = 0x1;
const IN_SIGHT = 0x2;

// C ref: vision.c seenv_matrix
const seenv_matrix = [
    [SV2, SV1, SV0],
    [SV3, 0,   SV7],
    [SV4, SV5, SV6],
];

// Circle data for range limits (C vision.c:27-70)
const circle_data = [
    /*  0*/ 0,
    /*  1*/ 1, 1,
    /*  3*/ 2, 2, 1,
    /*  6*/ 3, 3, 2, 1,
    /* 10*/ 4, 4, 4, 3, 2,
    /* 15*/ 5, 5, 5, 4, 3, 2,
    /* 21*/ 6, 6, 6, 5, 5, 4, 2,
    /* 28*/ 7, 7, 7, 6, 6, 5, 4, 2,
    /* 36*/ 8, 8, 8, 7, 7, 6, 6, 4, 2,
    /* 45*/ 9, 9, 9, 9, 8, 8, 7, 6, 5, 3,
    /* 55*/ 10, 10, 10, 10, 9, 9, 8, 7, 6, 5, 3,
    /* 66*/ 11, 11, 11, 11, 10, 10, 9, 9, 8, 7, 5, 3,
    /* 78*/ 12, 12, 12, 12, 11, 11, 10, 10, 9, 8, 7, 5, 3,
    /* 91*/ 13, 13, 13, 13, 12, 12, 12, 11, 10, 10, 9, 7, 6, 3,
    /*105*/ 14, 14, 14, 14, 13, 13, 13, 12, 12, 11, 10, 9, 8, 6, 3,
    /*120*/ 15, 15, 15, 15, 14, 14, 14, 13, 13, 12, 11, 10, 9, 8, 6, 3,
    /*136*/ 16,
];
const circle_start = [0, 1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 66, 78, 91, 105, 120];

// Vision state arrays
const viz_clear = Array.from({ length: ROWNO }, () => new Int8Array(COLNO));
const left_ptrs = Array.from({ length: ROWNO }, () => new Int16Array(COLNO));
const right_ptrs = Array.from({ length: ROWNO }, () => new Int16Array(COLNO));

// Double-buffered COULD_SEE bitmap
const cs_buf0 = Array.from({ length: ROWNO }, () => new Uint8Array(COLNO));
const cs_buf1 = Array.from({ length: ROWNO }, () => new Uint8Array(COLNO));
const cs_rmin0 = new Int16Array(ROWNO).fill(COLNO);
const cs_rmax0 = new Int16Array(ROWNO).fill(0);
const cs_rmin1 = new Int16Array(ROWNO).fill(COLNO);
const cs_rmax1 = new Int16Array(ROWNO).fill(0);

function mark_visible_range(row, left, right) {
    if (left > right) return;
    const rowp = game.cs_rows?.[row];
    if (!rowp) return;
    for (let i = left; i <= right; i++) rowp[i] = COULD_SEE;
    if (game.cs_left[row] > left) game.cs_left[row] = left;
    if (game.cs_right[row] < right) game.cs_right[row] = right;
}

/** C: vision.c does_block — walls, closed doors, tree (no boulders/mimics/clouds yet). */
export function doesBlockLikeC(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return true;
    const typ = loc.typ ?? 0;
    if (IS_OBSTRUCTED(typ) || typ === TREE) return true;
    if (IS_DOOR(typ)) {
        const mask = loc.doormask ?? 0;
        if (mask & (D_CLOSED | D_LOCKED | D_TRAPPED)) return true;
    }
    return false;
}

function _blocks(_level, x, y) {
    return doesBlockLikeC(x, y);
}

// C ref: vision_reset() — rebuild viz_clear and left/right ptrs
export function vision_reset() {
    const level = game.level;
    if (!level) return;

    for (let y = 0; y < ROWNO; y++) {
        viz_clear[y].fill(0);
        let dig_left = 0;
        let block = true;
        for (let x = 1; x < COLNO; x++) {
            const cur_block = _blocks(level, x, y);
            if (block !== cur_block) {
                if (block) {
                    for (let i = dig_left; i < x; i++) {
                        left_ptrs[y][i] = dig_left;
                        right_ptrs[y][i] = x - 1;
                    }
                } else {
                    let i = dig_left;
                    if (dig_left) dig_left--;
                    for (; i < x; i++) {
                        left_ptrs[y][i] = dig_left;
                        right_ptrs[y][i] = x;
                        viz_clear[y][i] = 1;
                    }
                }
                dig_left = x;
                block = !block;
            }
        }
        let i = dig_left;
        if (!block && dig_left) dig_left--;
        for (; i < COLNO; i++) {
            left_ptrs[y][i] = dig_left;
            right_ptrs[y][i] = COLNO - 1;
            viz_clear[y][i] = block ? 0 : 1;
        }
    }
    game._viz_rmin = null;
    game._viz_rmax = null;
}

/**
 * C: vision.c rogue_vision — room boundaries + adjacent squares on rogue levels.
 * @param {Uint8Array[]} next
 * @param {Int16Array} next_rmin
 * @param {Int16Array} next_rmax
 */
function rogueVisionLikeC(next, next_rmin, next_rmax) {
    const u = game.u;
    const level = game.level;
    if (!u || !level) return;

    const heroLoc = level.at(u.ux, u.uy);
    const rnum = (heroLoc?.roomno | 0) - ROOMOFFSET;
    if (rnum >= 0 && level.rooms?.[rnum]) {
        const room = level.rooms[rnum];
        const ly = (room.ly | 0) - 1;
        const hy = (room.hy | 0) + 1;
        const lx = (room.lx | 0) - 1;
        const hx = (room.hx | 0) + 1;
        for (let zy = ly; zy <= hy; zy++) {
            if (zy < 0 || zy >= ROWNO) continue;
            next_rmin[zy] = lx;
            next_rmax[zy] = hx;
            for (let zx = lx; zx <= hx; zx++) {
                if (zx < 1 || zx >= COLNO) continue;
                if (room.rlit) {
                    /* C sets IN_SIGHT + seenv; display still gates floor on viz_clear in update pass. */
                    next[zy][zx] = COULD_SEE | IN_SIGHT;
                    const loc = level.at(zx, zy);
                    if (loc) loc.seenv = SVALL;
                } else {
                    next[zy][zx] = COULD_SEE;
                }
            }
        }
    }

    const inDoor = (heroLoc?.typ | 0) === DOOR;
    const ylo = Math.max((u.uy | 0) - 1, 0);
    const yhi = Math.min((u.uy | 0) + 1, ROWNO - 1);
    const xlo = Math.max((u.ux | 0) - 1, 1);
    const xhi = Math.min((u.ux | 0) + 1, COLNO - 1);
    for (let zy = ylo; zy <= yhi; zy++) {
        if (xlo < next_rmin[zy]) next_rmin[zy] = xlo;
        if (xhi > next_rmax[zy]) next_rmax[zy] = xhi;
        for (let zx = xlo; zx <= xhi; zx++) {
            next[zy][zx] = COULD_SEE | IN_SIGHT;
            if (inDoor && (zx === (u.ux | 0) || zy === (u.uy | 0))) newsym(zx, zy);
        }
    }
}

// Bresenham quadrant path functions (C ref: vision.c q1-q4_path)
function q1_path(srow, scol, y2, x2) {
    let x = scol, y = srow;
    const dx = x2 - x, dy = y - y2;
    const dxs = dx << 1, dys = dy << 1;
    if (dy > dx) {
        let err = dxs - dy;
        for (let k = dy - 1; k; k--) {
            if (err >= 0) { x++; err -= dys; }
            y--;
            err += dxs;
            if (!viz_clear[y][x]) return 0;
        }
    } else {
        let err = dys - dx;
        for (let k = dx - 1; k; k--) {
            if (err >= 0) { y--; err -= dxs; }
            x++;
            err += dys;
            if (!viz_clear[y][x]) return 0;
        }
    }
    return 1;
}

function q2_path(srow, scol, y2, x2) {
    let x = scol, y = srow;
    const dx = x - x2, dy = y - y2;
    const dxs = dx << 1, dys = dy << 1;
    if (dy > dx) {
        let err = dxs - dy;
        for (let k = dy - 1; k; k--) {
            if (err >= 0) { x--; err -= dys; }
            y--;
            err += dxs;
            if (!viz_clear[y][x]) return 0;
        }
    } else {
        let err = dys - dx;
        for (let k = dx - 1; k; k--) {
            if (err >= 0) { y--; err -= dxs; }
            x--;
            err += dys;
            if (!viz_clear[y][x]) return 0;
        }
    }
    return 1;
}

function q3_path(srow, scol, y2, x2) {
    let x = scol, y = srow;
    const dx = x - x2, dy = y2 - y;
    const dxs = dx << 1, dys = dy << 1;
    if (dy > dx) {
        let err = dxs - dy;
        for (let k = dy - 1; k; k--) {
            if (err >= 0) { x--; err -= dys; }
            y++;
            err += dxs;
            if (!viz_clear[y][x]) return 0;
        }
    } else {
        let err = dys - dx;
        for (let k = dx - 1; k; k--) {
            if (err >= 0) { y++; err -= dxs; }
            x--;
            err += dys;
            if (!viz_clear[y][x]) return 0;
        }
    }
    return 1;
}

function q4_path(srow, scol, y2, x2) {
    let x = scol, y = srow;
    const dx = x2 - x, dy = y2 - y;
    const dxs = dx << 1, dys = dy << 1;
    if (dy > dx) {
        let err = dxs - dy;
        for (let k = dy - 1; k; k--) {
            if (err >= 0) { x++; err -= dys; }
            y++;
            err += dxs;
            if (!viz_clear[y][x]) return 0;
        }
    } else {
        let err = dys - dx;
        for (let k = dx - 1; k; k--) {
            if (err >= 0) { y++; err -= dxs; }
            x++;
            err += dys;
            if (!viz_clear[y][x]) return 0;
        }
    }
    return 1;
}

// C ref: vision.c right_side()
function right_side(row, left, right_mark, limitsIdx) {
    const nrow = row + game.vis_step;
    const deeper = nrow >= 0 && nrow < ROWNO
        && (limitsIdx < 0 || circle_data[limitsIdx] >= circle_data[limitsIdx + 1]);
    const lim_max = limitsIdx >= 0
        ? Math.min(COLNO - 1, game.vis_start_col + circle_data[limitsIdx])
        : COLNO - 1;
    if (right_mark > lim_max) right_mark = lim_max;
    const nextLimIdx = limitsIdx >= 0 ? limitsIdx + 1 : -1;

    while (left <= right_mark) {
        let right_edge = right_ptrs[row][left];
        if (right_edge > lim_max) right_edge = lim_max;

        if (!viz_clear[row][left]) {
            if (right_edge > right_mark) {
                right_edge = (row - game.vis_step >= 0 && row - game.vis_step < ROWNO && viz_clear[row - game.vis_step][right_mark])
                    ? right_mark + 1 : right_mark;
            }
            mark_visible_range(row, left, right_edge);
            left = right_edge + 1;
            continue;
        }

        if (left !== game.vis_start_col) {
            for (; left <= right_edge; left++) {
                const result = game.vis_step < 0
                    ? q1_path(game.vis_start_row, game.vis_start_col, row, left)
                    : q4_path(game.vis_start_row, game.vis_start_col, row, left);
                if (result) break;
            }
            if (left > lim_max) return;
            if (left === lim_max) {
                mark_visible_range(row, lim_max, lim_max);
                return;
            }
            if (left >= right_edge) { left = right_edge; continue; }
        }

        let right;
        if (right_mark < right_edge) {
            for (right = right_mark; right <= right_edge; right++) {
                const result = game.vis_step < 0
                    ? q1_path(game.vis_start_row, game.vis_start_col, row, right)
                    : q4_path(game.vis_start_row, game.vis_start_col, row, right);
                if (!result) break;
            }
            right--;
        } else {
            right = right_edge;
        }

        if (left <= right) {
            if (left === right && left === game.vis_start_col && game.vis_start_col < COLNO - 1
                && !viz_clear[row][game.vis_start_col + 1]) {
                right = game.vis_start_col + 1;
            }
            if (right > lim_max) right = lim_max;
            mark_visible_range(row, left, right);
            if (deeper) right_side(nrow, left, right, nextLimIdx);
            left = right + 1;
        }
    }
}

// C ref: vision.c left_side()
function left_side(row, left_mark, right, limitsIdx) {
    const nrow = row + game.vis_step;
    const deeper = nrow >= 0 && nrow < ROWNO
        && (limitsIdx < 0 || circle_data[limitsIdx] >= circle_data[limitsIdx + 1]);
    const lim_min = limitsIdx >= 0
        ? Math.max(0, game.vis_start_col - circle_data[limitsIdx])
        : 0;
    if (left_mark < lim_min) left_mark = lim_min;
    const nextLimIdx = limitsIdx >= 0 ? limitsIdx + 1 : -1;

    while (right >= left_mark) {
        let left_edge = left_ptrs[row][right];
        if (left_edge < lim_min) left_edge = lim_min;

        if (!viz_clear[row][right]) {
            if (left_edge < left_mark) {
                left_edge = (row - game.vis_step >= 0 && row - game.vis_step < ROWNO && viz_clear[row - game.vis_step][left_mark])
                    ? left_mark - 1 : left_mark;
            }
            mark_visible_range(row, left_edge, right);
            right = left_edge - 1;
            continue;
        }

        if (right !== game.vis_start_col) {
            for (; right >= left_edge; right--) {
                const result = game.vis_step < 0
                    ? q2_path(game.vis_start_row, game.vis_start_col, row, right)
                    : q3_path(game.vis_start_row, game.vis_start_col, row, right);
                if (result) break;
            }
            if (right < lim_min) return;
            if (right === lim_min) {
                mark_visible_range(row, lim_min, lim_min);
                return;
            }
            if (right <= left_edge) { right = left_edge; continue; }
        }

        let left;
        if (left_mark > left_edge) {
            for (left = left_mark; left >= left_edge; left--) {
                const result = game.vis_step < 0
                    ? q2_path(game.vis_start_row, game.vis_start_col, row, left)
                    : q3_path(game.vis_start_row, game.vis_start_col, row, left);
                if (!result) break;
            }
            left++;
        } else {
            left = left_edge;
        }

        if (left <= right) {
            if (left === right && right === game.vis_start_col && game.vis_start_col > 0
                && !viz_clear[row][game.vis_start_col - 1]) {
                left = game.vis_start_col - 1;
            }
            if (left < lim_min) left = lim_min;
            mark_visible_range(row, left, right);
            if (deeper) left_side(nrow, left, right, nextLimIdx);
            right = left - 1;
        }
    }
}

// C ref: vision.c view_from()
function view_from(srow, scol, cs_rows, cs_left, cs_right, range = 0) {
    game.vis_start_col = scol;
    game.vis_start_row = srow;
    game.cs_rows = cs_rows;
    game.cs_left = cs_left;
    game.cs_right = cs_right;

    let left, right;
    if (viz_clear[srow][scol]) {
        left = left_ptrs[srow][scol];
        right = right_ptrs[srow][scol];
    } else {
        left = !scol ? 0
            : (viz_clear[srow][scol - 1] ? left_ptrs[srow][scol - 1] : scol - 1);
        right = scol === COLNO - 1 ? COLNO - 1
            : (viz_clear[srow][scol + 1] ? right_ptrs[srow][scol + 1] : scol + 1);
    }

    let limitsIdx = -1;
    if (range) {
        if (left < scol - range) left = scol - range;
        if (right > scol + range) right = scol + range;
        limitsIdx = circle_start[range] + 1;
    }

    mark_visible_range(srow, left, right);

    const nrow_down = srow + 1;
    if (nrow_down < ROWNO) {
        game.vis_step = 1;
        if (scol < COLNO - 1) right_side(nrow_down, scol, right, limitsIdx);
        if (scol) left_side(nrow_down, left, scol, limitsIdx);
    }
    const nrow_up = srow - 1;
    if (nrow_up >= 0) {
        game.vis_step = -1;
        if (scol < COLNO - 1) right_side(nrow_up, scol, right, limitsIdx);
        if (scol) left_side(nrow_up, left, scol, limitsIdx);
    }
}

// C ref: vision_recalc(control)
export function vision_recalc(control = 0) {
    const u = game.u;
    if (!u || !game.level) return;
    game.vision_full_recalc = 0;
    if (game.in_mklev) return;

    // Swap to unused buffer
    const next = game.active_buf === 0 ? cs_buf1 : cs_buf0;
    const next_rmin = game.active_buf === 0 ? cs_rmin1 : cs_rmin0;
    const next_rmax = game.active_buf === 0 ? cs_rmax1 : cs_rmax0;

    for (let y = 0; y < ROWNO; y++) {
        next[y].fill(0);
        next_rmin[y] = COLNO;
        next_rmax[y] = 0;
    }

    if (control !== 2) {
        if (Is_rogue_level(u.uz)) {
            rogueVisionLikeC(next, next_rmin, next_rmax);
        } else {
            view_from(u.uy, u.ux, next, next_rmin, next_rmax);
        }
    }

    // Compute IN_SIGHT from COULD_SEE + lighting
    const level = game.level;
    const ux = u.ux, uy = u.uy;

    for (let row = 0; row < ROWNO; row++) {
        const dy = Math.sign(uy - row);
        for (let col = next_rmin[row]; col <= next_rmax[row]; col++) {
            if (!(next[row][col] & COULD_SEE)) continue;
            const loc = level?.at(col, row);
            if (!loc) continue;

            // Night vision: adjacent cells always IN_SIGHT
            if (Math.abs(col - ux) <= 1 && Math.abs(row - uy) <= 1) {
                next[row][col] |= IN_SIGHT;
                continue;
            }

            // Lit cells
            if (loc.lit) {
                if ((loc.typ === DOOR || loc.typ === SDOOR || IS_WALL(loc.typ))
                    && !viz_clear[row]?.[col]) {
                    // Walls/doors: only IN_SIGHT if adjacent cell toward hero is lit
                    const dx = Math.sign(ux - col);
                    const flev = level?.at(col + dx, row + dy);
                    if (flev?.lit) {
                        next[row][col] |= IN_SIGHT;
                    }
                } else {
                    next[row][col] |= IN_SIGHT;
                }
            }
        }
    }

    // Swap viz_array and run newsym updates
    const old_array = game.viz_array;
    game.viz_array = next;
    game.active_buf = game.active_buf === 0 ? 1 : 0;

    const old_rmin = game._viz_rmin;
    const old_rmax = game._viz_rmax;
    if (old_array && control !== 2 && game.level) {
        for (let row = 0; row < ROWNO; row++) {
            const old_row = old_array[row];
            const next_row = next[row];
            const start = old_rmin
                ? Math.min(old_rmin[row], next_rmin[row])
                : next_rmin[row];
            const stop = old_rmax
                ? Math.max(old_rmax[row], next_rmax[row])
                : next_rmax[row];
            if (start > stop) continue;
            const dy = Math.sign(uy - row);
            for (let col = start; col <= stop; col++) {
                const nv = next_row[col];
                const ov = old_row[col];
                const loc = game.level.at(col, row);
                if (!loc) continue;

                if (nv & IN_SIGHT) {
                    const oldseenv = loc.seenv || 0;
                    const sv = seenv_matrix[dy + 1][(col < ux) ? 0 : (col > ux ? 2 : 1)];
                    loc.seenv = (loc.seenv || 0) | sv;
                    if (!(ov & IN_SIGHT) || oldseenv !== loc.seenv) {
                        if (!rogueBlocksFloorDisplayLikeC(col, row, loc)) newsym(col, row);
                    }
                } else if ((nv & COULD_SEE) && loc.lit) {
                    if ((IS_WALL(loc.typ) || loc.typ === DOOR || loc.typ === SDOOR)
                        && !viz_clear[row][col]) {
                        const dx = Math.sign(ux - col);
                        const adjLoc = game.level.at(col + dx, row + dy);
                        if (adjLoc?.lit) {
                            next_row[col] |= IN_SIGHT;
                            const oldseenv = loc.seenv || 0;
                            const sv = seenv_matrix[dy + 1][(col < ux) ? 0 : (col > ux ? 2 : 1)];
                            loc.seenv = (loc.seenv || 0) | sv;
                            if (!(ov & IN_SIGHT) || oldseenv !== loc.seenv)
                                newsym(col, row);
                        }
                    } else if (!rogueBlocksFloorDisplayLikeC(col, row, loc)) {
                        next_row[col] |= IN_SIGHT;
                        const oldseenv = loc.seenv || 0;
                        const sv = seenv_matrix[dy + 1][(col < ux) ? 0 : (col > ux ? 2 : 1)];
                        loc.seenv = (loc.seenv || 0) | sv;
                        if (!(ov & IN_SIGHT) || oldseenv !== loc.seenv)
                            newsym(col, row);
                    }
                } else if ((nv & COULD_SEE) && loc.waslit) {
                    loc.waslit = 0;
                    if (!rogueBlocksFloorDisplayLikeC(col, row, loc)) newsym(col, row);
                } else {
                    if ((ov & IN_SIGHT)
                        || ((nv & COULD_SEE) ^ (ov & COULD_SEE))) {
                        if (!rogueBlocksFloorDisplayLikeC(col, row, loc)) newsym(col, row);
                    }
                }
            }
        }
        if (ux > 0) newsym(ux, uy);
    }

    game._viz_rmin = next_rmin;
    game._viz_rmax = next_rmax;
}

/** Rogue: room-fill IN_SIGHT does not paint floor behind blocking segments (viz_clear). */
function rogueBlocksFloorDisplayLikeC(col, row, loc) {
    if (!Is_rogue_level(game.u?.uz) || !loc) return false;
    if (viz_clear[row]?.[col]) return false;
    const typ = loc.typ | 0;
    return typ !== DOOR && typ !== SDOOR && !IS_WALL(typ);
}

/** C: rm.c set_seenv — hero-relative seenv bits (used by feel_location). */
export function setSeenvTowardHero(ux, uy, x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return;
    const dy = y - uy + 1;
    if (dy < 0 || dy > 2) return;
    const sv = seenv_matrix[dy][(x < ux) ? 0 : (x > ux ? 2 : 1)];
    loc.seenv = (loc.seenv || 0) | sv;
}

// C ref: cansee(x, y) — rogue room-fill IN_SIGHT still respects viz_clear for floor.
export function cansee(x, y) {
    if (y < 0 || y >= ROWNO || x < 0 || x >= COLNO) return false;
    if (!(game.viz_array?.[y]?.[x] & IN_SIGHT)) return false;
    if (Is_rogue_level(game.u?.uz) && !viz_clear[y]?.[x]) {
        const loc = game.level?.at(x, y);
        const typ = loc?.typ | 0;
        if (loc && typ !== DOOR && typ !== SDOOR && !IS_WALL(typ)) return false;
    }
    return true;
}

// C ref: couldsee(x, y)
export function couldsee(x, y) {
    if (y < 0 || y >= ROWNO || x < 0 || x >= COLNO) return false;
    return !!(game.viz_array?.[y]?.[x] & COULD_SEE);
}

/** C: vision.c dig_point(row, col) — make (col,row) transparent to light. */
function digPointLikeC(row, col) {
    if (viz_clear[row][col]) return;
    viz_clear[row][col] = 1;
    if (col === 0) {
        if (viz_clear[row][1]) {
            right_ptrs[row][0] = right_ptrs[row][1];
        } else {
            right_ptrs[row][0] = 1;
            for (let i = 1; i <= right_ptrs[row][1]; i++) left_ptrs[row][i] = 1;
        }
    } else if (col === COLNO - 1) {
        if (viz_clear[row][COLNO - 2]) {
            left_ptrs[row][COLNO - 1] = left_ptrs[row][COLNO - 2];
        } else {
            left_ptrs[row][COLNO - 1] = COLNO - 2;
            for (let i = left_ptrs[row][COLNO - 2]; i < COLNO - 1; i++) right_ptrs[row][i] = COLNO - 2;
        }
    } else if (viz_clear[row][col - 1] && viz_clear[row][col + 1]) {
        for (let i = left_ptrs[row][col - 1]; i <= col; i++) {
            if (!viz_clear[row][i]) continue;
            right_ptrs[row][i] = right_ptrs[row][col + 1];
        }
        for (let i = col; i <= right_ptrs[row][col + 1]; i++) {
            if (!viz_clear[row][i]) continue;
            left_ptrs[row][i] = left_ptrs[row][col - 1];
        }
    } else if (viz_clear[row][col - 1]) {
        for (let i = col + 1; i <= right_ptrs[row][col + 1]; i++) left_ptrs[row][i] = col + 1;
        for (let i = left_ptrs[row][col - 1]; i <= col; i++) {
            if (!viz_clear[row][i]) continue;
            right_ptrs[row][i] = col + 1;
        }
        left_ptrs[row][col] = left_ptrs[row][col - 1];
    } else if (viz_clear[row][col + 1]) {
        for (let i = left_ptrs[row][col - 1]; i < col; i++) right_ptrs[row][i] = col - 1;
        for (let i = col; i <= right_ptrs[row][col + 1]; i++) {
            if (!viz_clear[row][i]) continue;
            left_ptrs[row][i] = col - 1;
        }
        right_ptrs[row][col] = right_ptrs[row][col + 1];
    } else {
        for (let i = left_ptrs[row][col - 1]; i < col; i++) right_ptrs[row][i] = col - 1;
        for (let i = col + 1; i <= right_ptrs[row][col + 1]; i++) left_ptrs[row][i] = col + 1;
        left_ptrs[row][col] = col - 1;
        right_ptrs[row][col] = col + 1;
    }
}

/** C: vision.c fill_point(row, col) — make (col,row) opaque to light. */
function fillPointLikeC(row, col) {
    if (!viz_clear[row][col]) return;
    viz_clear[row][col] = 0;
    if (col === 0) {
        if (viz_clear[row][1]) {
            right_ptrs[row][0] = 0;
        } else {
            right_ptrs[row][0] = right_ptrs[row][1];
            for (let i = 1; i <= right_ptrs[row][1]; i++) left_ptrs[row][i] = 0;
        }
    } else if (col === COLNO - 1) {
        if (viz_clear[row][COLNO - 2]) {
            left_ptrs[row][COLNO - 1] = COLNO - 1;
        } else {
            left_ptrs[row][COLNO - 1] = left_ptrs[row][COLNO - 2];
            for (let i = left_ptrs[row][COLNO - 2]; i < COLNO - 1; i++) right_ptrs[row][i] = COLNO - 1;
        }
    } else if (viz_clear[row][col - 1] && viz_clear[row][col + 1]) {
        for (let i = left_ptrs[row][col - 1] + 1; i <= col; i++) right_ptrs[row][i] = col;
        if (!left_ptrs[row][col - 1]) right_ptrs[row][0] = col;
        for (let i = col; i < right_ptrs[row][col + 1]; i++) left_ptrs[row][i] = col;
        if (right_ptrs[row][col + 1] === COLNO - 1) left_ptrs[row][COLNO - 1] = col;
    } else if (viz_clear[row][col - 1]) {
        for (let i = col; i <= right_ptrs[row][col + 1]; i++) left_ptrs[row][i] = col;
        for (let i = left_ptrs[row][col - 1] + 1; i < col; i++) right_ptrs[row][i] = col;
        if (!left_ptrs[row][col - 1]) right_ptrs[row][0] = col;
        right_ptrs[row][col] = right_ptrs[row][col + 1];
    } else if (viz_clear[row][col + 1]) {
        for (let i = left_ptrs[row][col - 1]; i <= col; i++) right_ptrs[row][i] = col;
        for (let i = col + 1; i < right_ptrs[row][col + 1]; i++) left_ptrs[row][i] = col;
        if (right_ptrs[row][col + 1] === COLNO - 1) left_ptrs[row][COLNO - 1] = col;
        left_ptrs[row][col] = left_ptrs[row][col - 1];
    } else {
        for (let i = left_ptrs[row][col - 1]; i <= col; i++) right_ptrs[row][i] = right_ptrs[row][col + 1];
        for (let i = col; i <= right_ptrs[row][col + 1]; i++) left_ptrs[row][i] = left_ptrs[row][col - 1];
    }
}

/**
 * C: vision.c recalc_block_point — dig/fill viz_clear then defer vision_recalc.
 * @param {number} x
 * @param {number} y
 */
export function recalcBlockPointLikeC(x, y) {
    const xi = x | 0;
    const yi = y | 0;
    if (yi < 0 || yi >= ROWNO || xi < 0 || xi >= COLNO) return;
    if (doesBlockLikeC(xi, yi)) fillPointLikeC(yi, xi);
    else digPointLikeC(yi, xi);
    if (game.viz_array?.[yi]?.[xi]) game.vision_full_recalc = 1;
}

export function init_vision_globals() {
    game.viz_array = cs_buf0;
    game.active_buf = 0;
    game.vis_step = 0;
    game.vis_start_col = 0;
    game.vis_start_row = 0;
    game.cs_rows = null;
    game.cs_left = null;
    game.cs_right = null;
}

/** C: display.c see_monsters() — refresh monster visibility on the map. */
export function seeMonsters() {
    /* Port display.c / mon.c when fmon and glyph refresh exist */
}

/** C: hack.c dolookaround — allmain.c newgame when a11y.glyph_updates. */
export function dolookaroundLikeC() {
    /* Port hack.c / display.c when glyph refresh + look parity exist */
}

/**
 * C: include/flag.h **`struct accessibility_data`** — subset used by **`notice_mon_*`** /
 * **`hack.c`** **`notice_all_mons`** (defaults zeroed like NEARDATA **`a11y`**).
 * @returns {NonNullable<typeof game['a11y']>}
 */
function ensureA11yLikeC() {
    const g = game;
    if (!g.a11y) {
        g.a11y = {
            mon_notices: false,
            mon_notices_blocked: 0,
            glyph_updates: false,
        };
    }
    return g.a11y;
}

/** C: flag.h **`notice_mon_off`** — defer **`notice_mon`** / **`notice_all_mons`** plines. */
export function noticeMonOffLikeC() {
    const a = ensureA11yLikeC();
    a.mon_notices_blocked = (a.mon_notices_blocked | 0) + 1;
}

/** C: flag.h **`notice_mon_on`** — re-enable after **`welcome`** (pair with **`notice_mon_off`**). */
export function noticeMonOnLikeC() {
    const a = ensureA11yLikeC();
    let b = (a.mon_notices_blocked | 0) - 1;
    /* C: impossible("mon_notices_blocked<0"); — clamp for JS */
    if (b < 0) b = 0;
    a.mon_notices_blocked = b;
}

/**
 * C: hack.c notice_all_mons — a11y.mon_notices + not blocked.
 * allmain.c newgame calls dolookaround instead when a11y.glyph_updates.
 * @param {boolean} reset
 */
export function noticeAllMonsLikeC(reset) {
    const a = game.a11y;
    if (!a?.mon_notices || (a.mon_notices_blocked | 0) !== 0) return;
    seeMonsters();
    void reset;
}
