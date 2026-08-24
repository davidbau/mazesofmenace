// vision.js — C ref: vision.c Algorithm C shadow-casting
// does_block() and the incremental blocked-point updaters are real now;
// light sources and pit handling are still absent.

import { game } from './gstate.js';
import {
    COLNO, ROWNO, DOOR, SDOOR, POOL, TREE, CLOUD, LAVAWALL,
    D_CLOSED, D_LOCKED, D_TRAPPED, IS_OBSTRUCTED, IS_DOOR, IS_WATERWALL,
    SV0, SV1, SV2, SV3, SV4, SV5, SV6, SV7, SVALL,
    IS_WALL, MAX_RADIUS, CROSSWALL, TRWALL,
} from './const.js';
import { newsym } from './display.js';
import { ONAMES } from './objects_data.js';
import { m_at } from './mon.js';
import { is_lightblocker_mappear } from './monst.js';
import { See_invisible, Underwater } from './youprop.js';
import { is_moat } from './dbridge.js';
import { visible_region_at } from './region.js';
import { do_light_sources } from './light.js';

// include/vision.h:8-10 — viz_array bits. TEMP_LIT is stamped by
// do_light_sources() (js/light.js) during each recalc.
export const COULD_SEE = 0x1;
export const IN_SIGHT = 0x2;
export const TEMP_LIT = 0x4;

// C ref: vision.c seenv_matrix
const seenv_matrix = [
    [SV2, SV1,   SV0],
    [SV3, SVALL, SV7],
    [SV4, SV5,   SV6],
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

// src/vision.c:414 new_angle() — extra seen-angle bits for crosswalls and
// T walls viewed from an angle. `sv` is the base seenv_matrix entry.
function new_angle(lev, sv, row, col) {
    let res = sv;

    /*
     * Do extra checks for crosswalls and T walls if we see them from
     * an angle.
     */
    if (lev.typ >= CROSSWALL && lev.typ <= TRWALL) {
        switch (res) {
        case SV0:
            if (col > 0 && viz_clear[row][col - 1])
                res |= SV7;
            if (row > 0 && viz_clear[row - 1][col])
                res |= SV1;
            break;
        case SV2:
            if (row > 0 && viz_clear[row - 1][col])
                res |= SV1;
            if (col < COLNO - 1 && viz_clear[row][col + 1])
                res |= SV3;
            break;
        case SV4:
            if (col < COLNO - 1 && viz_clear[row][col + 1])
                res |= SV3;
            if (row < ROWNO - 1 && viz_clear[row + 1][col])
                res |= SV5;
            break;
        case SV6:
            if (row < ROWNO - 1 && viz_clear[row + 1][col])
                res |= SV5;
            if (col > 0 && viz_clear[row][col - 1])
                res |= SV7;
            break;
        }
    }
    return res;
}

/* src/vision.c:1143-1144 — set by view_from() for the quadrant scans.
   When vis_func is set the scans report positions to it instead of
   painting the could-see rows (do_clear_area's area walk). */
var vis_func = null, varg = null;

function mark_visible_range(row, left, right) {
    if (left > right) return;
    if (vis_func) {
        for (let i = left; i <= right; i++) vis_func(i, row, varg);
        return;
    }
    const rowp = game.cs_rows?.[row];
    if (!rowp) return;
    for (let i = left; i <= right; i++) rowp[i] = COULD_SEE;
    if (game.cs_left[row] > left) game.cs_left[row] = left;
    if (game.cs_right[row] < right) game.cs_right[row] = right;
}

// src/vision.c:153 does_block() — returns 0 if nothing at (x,y) blocks
// sight, 1 if anything other than an opaque region blocks it, 2 for an
// opaque region. Callers only distinguish 0 from non-0.
export function does_block(x, y, lev) {
    /* Features that block . . */
    if (IS_OBSTRUCTED(lev.typ) || lev.typ === TREE
        || (IS_DOOR(lev.typ)
            && ((lev.doormask ?? 0) & (D_CLOSED | D_LOCKED | D_TRAPPED))))
        return 1;

    if (lev.typ === CLOUD || IS_WATERWALL(lev.typ) || lev.typ === LAVAWALL
        || (Underwater() && is_moat(x, y)))
        return 1;

    /* Boulders block light. C walks the per-cell nexthere chain; the port
       keeps one flat floor list, so membership is the ox/oy filter. */
    for (const obj of game.level.objects || [])
        if (obj.ox === x && obj.oy === y && obj.otyp === ONAMES.BOULDER)
            return 1;

    /* Mimics mimicking a door or boulder or ... block light. */
    const mon = m_at(x, y);
    if (mon && (!mon.minvis || See_invisible()) && is_lightblocker_mappear(mon))
        return 1;

    /* Clouds (poisonous or not) block light. */
    if (visible_region_at(x, y))
        return 2;

    return 0;
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
            const loc = level.at(x, y);
            const cur_block = !loc
                || !!(IS_OBSTRUCTED(loc.typ) || does_block(x, y, loc));
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

/* Debug seam, no C counterpart: read-only view of the shadow arrays for
   probe scripts. Opt-in via globalThis, never touched during scoring. */
export function __debug_arrays() {
    return { viz_clear, left_ptrs, right_ptrs };
}

// src/vision.c:967 dig_point() — make (row,col) clear and repair the
// left/right run pointers around it. Note the (row,col) argument order:
// everything in C below the pointer-update banner uses (y,x).
function dig_point(row, col) {
    let i;

    if (viz_clear[row][col])
        return; /* already done */

    viz_clear[row][col] = 1;

    /*
     * Boundary cases first.
     */
    if (col === 0) { /* left edge */
        if (viz_clear[row][1]) {
            right_ptrs[row][0] = right_ptrs[row][1];
        } else {
            right_ptrs[row][0] = 1;
            for (i = 1; i <= right_ptrs[row][1]; i++)
                left_ptrs[row][i] = 1;
        }
    } else if (col === COLNO - 1) { /* right edge */
        if (viz_clear[row][COLNO - 2]) {
            left_ptrs[row][COLNO - 1] = left_ptrs[row][COLNO - 2];
        } else {
            left_ptrs[row][COLNO - 1] = COLNO - 2;
            for (i = left_ptrs[row][COLNO - 2]; i < COLNO - 1; i++)
                right_ptrs[row][i] = COLNO - 2;
        }

    /*
     * At this point, we know we aren't on the boundaries.
     */
    } else if (viz_clear[row][col - 1] && viz_clear[row][col + 1]) {
        /* Both sides clear */
        for (i = left_ptrs[row][col - 1]; i <= col; i++) {
            if (!viz_clear[row][i])
                continue; /* catch non-end case */
            right_ptrs[row][i] = right_ptrs[row][col + 1];
        }
        for (i = col; i <= right_ptrs[row][col + 1]; i++) {
            if (!viz_clear[row][i])
                continue; /* catch non-end case */
            left_ptrs[row][i] = left_ptrs[row][col - 1];
        }
    } else if (viz_clear[row][col - 1]) {
        /* Left side clear, right side blocked. */
        for (i = col + 1; i <= right_ptrs[row][col + 1]; i++)
            left_ptrs[row][i] = col + 1;

        for (i = left_ptrs[row][col - 1]; i <= col; i++) {
            if (!viz_clear[row][i])
                continue; /* catch non-end case */
            right_ptrs[row][i] = col + 1;
        }
        left_ptrs[row][col] = left_ptrs[row][col - 1];
    } else if (viz_clear[row][col + 1]) {
        /* Right side clear, left side blocked. */
        for (i = left_ptrs[row][col - 1]; i < col; i++)
            right_ptrs[row][i] = col - 1;

        for (i = col; i <= right_ptrs[row][col + 1]; i++) {
            if (!viz_clear[row][i])
                continue; /* catch non-end case */
            left_ptrs[row][i] = col - 1;
        }
        right_ptrs[row][col] = right_ptrs[row][col + 1];
    } else {
        /* Both sides blocked */
        for (i = left_ptrs[row][col - 1]; i < col; i++)
            right_ptrs[row][i] = col - 1;

        for (i = col + 1; i <= right_ptrs[row][col + 1]; i++)
            left_ptrs[row][i] = col + 1;

        left_ptrs[row][col] = col - 1;
        right_ptrs[row][col] = col + 1;
    }
}

// src/vision.c:1051 fill_point() — make (row,col) blocked and repair the
// run pointers. The two stray `[i]` stores after loop exit are C's own
// quirks, kept verbatim: `i` holds the loop's exit value there.
function fill_point(row, col) {
    let i;

    if (!viz_clear[row][col])
        return;

    viz_clear[row][col] = 0;

    if (col === 0) {
        if (viz_clear[row][1]) { /* adjacent is clear */
            right_ptrs[row][0] = 0;
        } else {
            right_ptrs[row][0] = right_ptrs[row][1];
            for (i = 1; i <= right_ptrs[row][1]; i++)
                left_ptrs[row][i] = 0;
        }
    } else if (col === COLNO - 1) {
        if (viz_clear[row][COLNO - 2]) { /* adjacent is clear */
            left_ptrs[row][COLNO - 1] = COLNO - 1;
        } else {
            left_ptrs[row][COLNO - 1] = left_ptrs[row][COLNO - 2];
            for (i = left_ptrs[row][COLNO - 2]; i < COLNO - 1; i++)
                right_ptrs[row][i] = COLNO - 1;
        }

    /*
     * Else we know that we are not on an edge.
     */
    } else if (viz_clear[row][col - 1] && viz_clear[row][col + 1]) {
        /* Both sides clear */
        for (i = left_ptrs[row][col - 1] + 1; i <= col; i++)
            right_ptrs[row][i] = col;

        if (!left_ptrs[row][col - 1]) /* catch the end case */
            right_ptrs[row][0] = col;

        for (i = col; i < right_ptrs[row][col + 1]; i++)
            left_ptrs[row][i] = col;

        if (right_ptrs[row][col + 1] === COLNO - 1) /* catch the end case */
            left_ptrs[row][COLNO - 1] = col;
    } else if (viz_clear[row][col - 1]) {
        /* Left side clear, right side blocked. */
        for (i = col; i <= right_ptrs[row][col + 1]; i++)
            left_ptrs[row][i] = col;

        for (i = left_ptrs[row][col - 1] + 1; i < col; i++)
            right_ptrs[row][i] = col;

        if (!left_ptrs[row][col - 1]) /* catch the end case */
            right_ptrs[row][i] = col;

        right_ptrs[row][col] = right_ptrs[row][col + 1];
    } else if (viz_clear[row][col + 1]) {
        /* Right side clear, left side blocked. */
        for (i = left_ptrs[row][col - 1]; i <= col; i++)
            right_ptrs[row][i] = col;

        for (i = col + 1; i < right_ptrs[row][col + 1]; i++)
            left_ptrs[row][i] = col;

        if (right_ptrs[row][col + 1] === COLNO - 1) /* catch the end case */
            left_ptrs[row][i] = col;

        left_ptrs[row][col] = left_ptrs[row][col - 1];
    } else {
        /* Both sides blocked */
        for (i = left_ptrs[row][col - 1]; i <= col; i++)
            right_ptrs[row][i] = right_ptrs[row][col + 1];

        for (i = col; i <= right_ptrs[row][col + 1]; i++)
            left_ptrs[row][i] = left_ptrs[row][col - 1];
    }
}

// src/vision.c:865 block_point() — (x,y) becomes opaque. A full recalc is
// forced if the hero could see the point: an opening out of night-vision
// range closing (or opening) still changes what is lit for the hero.
export function block_point(x, y) {
    fill_point(y, x);

    /* recalc light sources here? */

    if (game.viz_array?.[y]?.[x])
        game.vision_full_recalc = 1;
}

// src/vision.c:899 unblock_point() — (x,y) becomes see-through.
export function unblock_point(x, y) {
    dig_point(y, x);

    /* recalc light sources here? */

    if (game.viz_array?.[y]?.[x])
        game.vision_full_recalc = 1;
}

// src/vision.c:911 recalc_block_point() — recalc if point should be
// blocked or unblocked.
export function recalc_block_point(x, y) {
    if (does_block(x, y, game.level.at(x, y)))
        block_point(x, y);
    else
        unblock_point(x, y);
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
function view_from(srow, scol, cs_rows, cs_left, cs_right, range = 0, func = null, arg = null) {
    game.vis_start_col = scol;
    game.vis_start_row = srow;
    game.cs_rows = cs_rows;
    game.cs_left = cs_left;
    game.cs_right = cs_right;
    vis_func = func;
    varg = arg;

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
        view_from(u.uy, u.ux, next, next_rmin, next_rmax);
    }

    /* src/vision.c:703 — set the correct bits for all light sources */
    do_light_sources(next);

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

            // Lit cells (src/vision.c:756 — lev->lit || TEMP_LIT)
            if (loc.lit || (next[row][col] & TEMP_LIT)) {
                if ((loc.typ === DOOR || loc.typ === SDOOR || IS_WALL(loc.typ))
                    && !viz_clear[row]?.[col]) {
                    // Walls/doors: only IN_SIGHT if adjacent cell toward hero is lit
                    const dx = Math.sign(ux - col);
                    const flev = level?.at(col + dx, row + dy);
                    if (flev?.lit
                        || (next[row + dy]?.[col + dx] & TEMP_LIT)) {
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
                    loc.seenv = (loc.seenv || 0) | new_angle(loc, sv, row, col);
                    if (!(ov & IN_SIGHT) || oldseenv !== loc.seenv) {
                        newsym(col, row);
                    }
                } else if ((nv & COULD_SEE)
                           && (loc.lit || (nv & TEMP_LIT))) {
                    if ((IS_WALL(loc.typ) || loc.typ === DOOR || loc.typ === SDOOR)
                        && !viz_clear[row][col]) {
                        const dx = Math.sign(ux - col);
                        const adjLoc = game.level.at(col + dx, row + dy);
                        if (adjLoc?.lit
                            || (next[row + dy]?.[col + dx] & TEMP_LIT)) {
                            next_row[col] |= IN_SIGHT;
                            const oldseenv = loc.seenv || 0;
                            const sv = seenv_matrix[dy + 1][(col < ux) ? 0 : (col > ux ? 2 : 1)];
                            loc.seenv = (loc.seenv || 0) | new_angle(loc, sv, row, col);
                            if (!(ov & IN_SIGHT) || oldseenv !== loc.seenv)
                                newsym(col, row);
                        }
                    } else {
                        next_row[col] |= IN_SIGHT;
                        const oldseenv = loc.seenv || 0;
                        const sv = seenv_matrix[dy + 1][(col < ux) ? 0 : (col > ux ? 2 : 1)];
                        loc.seenv = (loc.seenv || 0) | new_angle(loc, sv, row, col);
                        if (!(ov & IN_SIGHT) || oldseenv !== loc.seenv)
                            newsym(col, row);
                    }
                } else if ((nv & COULD_SEE) && loc.waslit) {
                    loc.waslit = 0;
                    newsym(col, row);
                } else {
                    if ((ov & IN_SIGHT)
                        || ((nv & COULD_SEE) ^ (ov & COULD_SEE))) {
                        newsym(col, row);
                    }
                }
            }
        }
        if (ux > 0) newsym(ux, uy);
    }

    game._viz_rmin = next_rmin;
    game._viz_rmax = next_rmax;
}

// C ref: cansee(x, y)
export function cansee(x, y) {
    if (y < 0 || y >= ROWNO || x < 0 || x >= COLNO) return false;
    return !!(game.viz_array?.[y]?.[x] & IN_SIGHT);
}

// C ref: couldsee(x, y)
export function couldsee(x, y) {
    if (y < 0 || y >= ROWNO || x < 0 || x >= COLNO) return false;
    return !!(game.viz_array?.[y]?.[x] & COULD_SEE);
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

// src/vision.c:1612 clear_path() — is there an unobstructed straight line from
// <col1,row1> to <col2,row2>?
//
// C implements this as four quadrant macros (q1_path..q4_path), each a
// Bresenham walk that bails the moment it crosses a square that is not clear.
// They differ only in which way x and y step, and in whether dx/dy are measured
// forwards or backwards; the loops are otherwise identical, including the
// detail that they run for (major - 1) steps so the ENDPOINTS are never tested.
//
// Draws nothing. It is m_cansee() (include/vision.h:42) and it gates find_targ,
// which decides how many targets a pet scores — and score_targ DOES draw. So a
// clear_path that says "visible" where C says "blocked" spends extra rnd(5)s.
export function clear_path(col1, row1, col2, row2) {
    const is_clear = (row, col) => !!(viz_clear[row] && viz_clear[row][col]);

    /* Walk `major` steps, stepping the minor axis when the error term says so.
       sx/sy are the per-axis directions; dx/dy are already absolute. */
    const walk = (x, y, dx, dy, sx, sy) => {
        let err, k;
        const dxs = dx << 1, dys = dy << 1;

        if (dy > dx) {
            err = dxs - dy;
            for (k = dy - 1; k; k--) {
                if (err >= 0) { x += sx; err -= dys; }
                y += sy;
                err += dxs;
                if (!is_clear(y, x))
                    return 0; /* blocked */
            }
        } else {
            err = dys - dx;
            for (k = dx - 1; k; k--) {
                if (err >= 0) { y += sy; err -= dxs; }
                x += sx;
                err += dys;
                if (!is_clear(y, x))
                    return 0; /* blocked */
            }
        }
        return 1;
    };

    if (col1 < col2) {
        if (row1 > row2)                     /* quadrant I: right and up */
            return !!walk(col1, row1, col2 - col1, row1 - row2, 1, -1);
        return !!walk(col1, row1, col2 - col1, row2 - row1, 1, 1); /* IV */
    }
    if (row1 > row2)                         /* quadrant II: left and up */
        return !!walk(col1, row1, col1 - col2, row1 - row2, -1, -1);
    if (row1 === row2 && col1 === col2)
        return true;
    return !!walk(col1, row1, col1 - col2, row2 - row1, -1, 1); /* III */
}

/* circle_data[] and circle_start[] are already declared at the top of this
   file (src/vision.c:27 and :47), the full tables. js/detect.js carries a
   TRUNCATED copy (`circle_data_findit`, radii 0..8) for findit(). */

// src/vision.c circle_ptr() — the half-width row for radius z.
// (include/vision.h:62; do_light_sources in js/light.js imports it too.)
export function circle_ptr(z) {
    return circle_data.slice(circle_start[z]);
}

// src/vision.c:2107 do_clear_area() — apply `func` to every square within
// `range` of (scol,srow) that can be seen from there. An off-hero center
// runs the real view_from() scan with the callback (dog_goal's wantdoor
// walk); the hero-centred arm reads viz_array directly. The detecting()
// underwater override needs detection callbacks that do not exist yet.
export function do_clear_area(scol, srow, range, func, arg) {
    if (scol !== game.u.ux || srow !== game.u.uy) {
        view_from(srow, scol, null, null, null, range, func, arg);
        vis_func = null;
        varg = null;
        return;
    }
    if (range > MAX_RADIUS || range < 1)
        return;                         /* panic("illegal range") */
    if (game.vision_full_recalc)
        vision_recalc(0);               /* recalc vision if dirty */

    const limits = circle_ptr(range);
    let max_y = srow + range;
    if (max_y >= ROWNO)
        max_y = ROWNO - 1;
    let y = srow - range;
    if (y < 0)
        y = 0;
    for (; y <= max_y; y++) {
        const offset = limits[Math.abs(y - srow)];
        let min_x = scol - offset;
        if (min_x < 1)
            min_x = 1;
        let max_x = scol + offset;
        if (max_x >= COLNO)
            max_x = COLNO - 1;
        for (let x = min_x; x <= max_x; x++)
            if (couldsee(x, y))
                func(x, y, arg);
    }
}
