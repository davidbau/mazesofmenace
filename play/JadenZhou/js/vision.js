// vision.js — C ref: vision.c Algorithm C shadow-casting
// Stripped-down port for the contest skeleton: no light sources, boulders,
// mimics, underwater, blindness, or pit handling.
// Contestants should port the full vision.c for complete parity.

import { game } from './gstate.js';
import { BLINDED, SEE_INVIS, TEMP_LIT, TT_PIT } from './const.js';
import { do_light_sources } from './light.js';
import {
    COLNO, ROWNO, DOOR, SDOOR,
    D_CLOSED, D_LOCKED, D_TRAPPED,
    SV0, SV1, SV2, SV3, SV4, SV5, SV6, SV7, SVALL,
    IS_WALL, IS_OBSTRUCTED, IS_WATERWALL, TREE, CLOUD, LAVAWALL, MOAT,
    DRAWBRIDGE_UP, DB_UNDER, DB_MOAT, M_AP_TYPMASK, M_AP_OBJECT,
    M_AP_FURNITURE, Is_juiblex_level, isok,
} from './const.js';
import { BOULDER } from './objects.js';
import { newsym } from './display.js';
import { m_at } from './makemon.js';
import { visible_region_at } from './region.js';
import { Is_rogue_level, ROOMOFFSET } from './const.js';

export const COULD_SEE = 0x1;
const IN_SIGHT = 0x2;

// C ref: vision.c seenv_matrix
const seenv_matrix = [
    [SV2, SV1, SV0],
    [SV3, SVALL, SV7],
    [SV4, SV5, SV6],
];

// Circle data for range limits (C vision.c:27-70)
export const circle_data = [
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
export const circle_start = [0, 1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 66, 78, 91, 105, 120];

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

// C ref: vision.c static vis_func/varg -- view_from()'s "func" callback
let vis_func = null;
let varg = null;

function mark_visible_range(row, left, right) {
    if (left > right) return;
    if (vis_func) {
        for (let i = left; i <= right; i++)
            vis_func(i, row, varg);
        return;
    }
    const rowp = game.cs_rows?.[row];
    if (!rowp) return;
    for (let i = left; i <= right; i++) rowp[i] = COULD_SEE;
    if (game.cs_left[row] > left) game.cs_left[row] = left;
    if (game.cs_right[row] < right) game.cs_right[row] = right;
}

// C ref: defsym.h cmap indices used by is_lightblocker_mappear()
const S_ndoor = 12, S_vcdoor = 15, S_hcdoor = 16, S_tree = 18;

// C ref: monst.h is_lightblocker_mappear() -- mimic appearances that
// block vision/light
export function is_lightblocker_mappear(mon) {
    const ap_type = (mon.m_ap_type || 0) & M_AP_TYPMASK; /* M_AP_TYPE() */
    return ((ap_type === M_AP_OBJECT && mon.mappearance === BOULDER)
            || (ap_type === M_AP_FURNITURE
                && (mon.mappearance === S_hcdoor
                    || mon.mappearance === S_vcdoor
                    || mon.mappearance < S_ndoor /* = walls */
                    || mon.mappearance === S_tree)));
}

// C ref: hack.c is_moat()
function is_moat(x, y) {
    if (!isok(x, y))
        return false;
    const lev = game.level.at(x, y);
    const ltyp = lev.typ;
    if (!Is_juiblex_level(game.u.uz)
        && (ltyp === MOAT
            || (ltyp === DRAWBRIDGE_UP
                && ((lev.drawbridgemask || 0) & DB_UNDER) === DB_MOAT)))
        return true;
    return false;
}

// C ref: vision.c does_block()
/*
 * Returns 0 if nothing at <x,y> blocks sight, 1 if something other than
 * a cloud does, 2 if the location is inside a visible gas cloud.
 */
export function does_block(x, y, lev) {
    /* Features that block . . */
    if (IS_OBSTRUCTED(lev.typ) || lev.typ === TREE
        || (lev.typ === DOOR /* IS_DOOR() */
            && ((lev.doormask || 0) & (D_CLOSED | D_LOCKED | D_TRAPPED))))
        return 1;

    if (lev.typ === CLOUD || IS_WATERWALL(lev.typ) || lev.typ === LAVAWALL
        || (game.u?.uinwater /* Underwater */ && is_moat(x, y)))
        return 1;

    /* Boulders block light. */
    for (const obj of game.level.objects || [])
        if (obj.ox === x && obj.oy === y && obj.where === 'OBJ_FLOOR'
            && obj.otyp === BOULDER)
            return 1;

    /* Mimics mimicking a door or boulder or ... block light. */
    const mon = m_at(x, y);
    const See_invisible = !!(game.u?.uprops?.[SEE_INVIS]?.intrinsic
                             || game.u?.uprops?.[SEE_INVIS]?.extrinsic);
    if (mon && (!mon.minvis || See_invisible)
        && is_lightblocker_mappear(mon))
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
            const lev = level.at(x, y);
            const cur_block = !!(IS_OBSTRUCTED(lev.typ) || does_block(x, y, lev));
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

/*
 * Vision row pointer maintenance (C ref: vision.c, the comment above
 * dig_point()):
 *
 * Left Pointers:
 * + If you are a clear spot, your left will point to the first
 *   stone to your left.  If there is none, then point the first
 *   legal position in the row (0).
 * + If you are a blocked spot, then your left will point to the
 *   left-most blocked spot to your left that is connected to you.
 *   This means that a left-edge (a blocked spot that has an open
 *   spot on its left) will point to itself.
 *
 * Right Pointers:
 * + If you are a clear spot, your right will point to the first
 *   stone to your right.  If there is none, then point the last
 *   legal position in the row (COLNO-1).
 * + If you are a blocked spot, then your right will point to the
 *   right-most blocked spot to your right that is connected to you.
 *   This means that a right-edge (a blocked spot that has an open
 *   spot on its right) will point to itself.
 */
// C ref: vision.c dig_point()
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
    } else if (col === (COLNO - 1)) { /* right edge */

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

// C ref: vision.c fill_point()
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

// C ref: vision.c block_point()
/*
 * Make the location opaque to light.
 */
export function block_point(x, y) {
    fill_point(y, x);

    /* recalc light sources here? */

    /*
     * We have to do a full vision recalculation if we "could see" the
     * location.  Why? Suppose some monster opened a way so that the
     * hero could see a lit room.  However, the position of the opening
     * was out of night-vision range of the hero.  Suddenly the hero should
     * see the lit room.
     */
    if (game.viz_array?.[y]?.[x])
        game.vision_full_recalc = 1;
}

// C ref: vision.c unblock_point()
/*
 * Make the location transparent to light.
 */
export function unblock_point(x, y) {
    dig_point(y, x);

    /* recalc light sources here? */

    if (game.viz_array?.[y]?.[x])
        game.vision_full_recalc = 1;
}

// C ref: vision.c recalc_block_point()
/* recalc if point should be blocked or unblocked */
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
function view_from(srow, scol, cs_rows, cs_left, cs_right, range = 0,
                   func = null, arg = null) {
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

// C ref: vision.c do_clear_area()
/*
 * Calculate all possible visible locations as viewed from the given location
 * (srow,scol) within the range specified. Perform "func" with (x, y) args and
 * additional argument "arg" for each square.
 *
 * If not centered on the hero, just forward arguments to view_from(); it
 * will call "func" when necessary.  If the hero is the center, use the
 * vision matrix and reduce extra work.
 */
export function do_clear_area(scol, srow, range, func, arg) {
    /* If not centered on hero, do the hard work of figuring the area */
    if (scol !== game.u.ux || srow !== game.u.uy) {
        view_from(srow, scol, null, null, null, range, func, arg);
        /* vis_func is only consulted by view_from()'s callees; clear it
           so a later vision_recalc() marks could_see rows again */
        vis_func = null;
        varg = null;
    } else {
        let x, y, min_x, max_x, max_y, offset;
        /* vision doesn't pass through water or clouds, detection should;
           detecting(func) is False for every caller ported so far */
        const override_vision = false;

        if (range > 15 /* MAX_RADIUS */ || range < 1)
            throw new Error(`do_clear_area:  illegal range ${range}`);
        if (game.vision_full_recalc)
            vision_recalc(0); /* recalc vision if dirty */
        const limits = circle_start[range]; /* circle_ptr(range) */
        if ((max_y = (srow + range)) >= ROWNO)
            max_y = ROWNO - 1;
        if ((y = (srow - range)) < 0)
            y = 0;
        for (; y <= max_y; y++) {
            offset = circle_data[limits + Math.abs(y - srow)];
            if ((min_x = (scol - offset)) < 1)
                min_x = 1;
            if ((max_x = (scol + offset)) >= COLNO)
                max_x = COLNO - 1;
            for (x = min_x; x <= max_x; x++)
                if (couldsee(x, y) || override_vision)
                    func(x, y, arg);
        }
    }
}

// C ref: vision.c do_clear_area() -- the same, for a client "func" that
// is async (prints messages or reaches other async code, e.g.
// fountain.c gush()); only the hero-centered case is ported
export async function do_clear_area_async(scol, srow, range, func, arg) {
    if (scol !== game.u.ux || srow !== game.u.uy)
        throw new Error('do_clear_area(): async client off the hero not ported yet');
    let x, y, min_x, max_x, max_y, offset;
    /* detecting(func) is False for every async caller */
    const override_vision = false;

    if (range > 15 /* MAX_RADIUS */ || range < 1)
        throw new Error(`do_clear_area:  illegal range ${range}`);
    if (game.vision_full_recalc)
        vision_recalc(0); /* recalc vision if dirty */
    const limits = circle_start[range]; /* circle_ptr(range) */
    if ((max_y = (srow + range)) >= ROWNO)
        max_y = ROWNO - 1;
    if ((y = (srow - range)) < 0)
        y = 0;
    for (; y <= max_y; y++) {
        offset = circle_data[limits + Math.abs(y - srow)];
        if ((min_x = (scol - offset)) < 1)
            min_x = 1;
        if ((max_x = (scol + offset)) >= COLNO)
            max_x = COLNO - 1;
        for (x = min_x; x <= max_x; x++)
            if (couldsee(x, y) || override_vision)
                await func(x, y, arg);
    }
}

// C ref: vision_recalc(control)
// C ref: vision.c rogue_vision()
/*
 * Set the "could see" and in sight bits so vision acts just like the old
 * rogue game:
 *
 *      + If in a room, the hero can see to the room boundaries.
 *      + The hero can always see adjacent squares.
 *
 * We set the in_sight bit here as well to escape a bug that shows up
 * due to the one-sided lit wall hack.
 */
function rogue_vision(next, rmin, rmax) {
    const u = game.u;
    const rnum = game.level.at(u.ux, u.uy).roomno - ROOMOFFSET; /* no SHARED... */
    let start, stop, zx, zy;

    /* If in a lit room, we are able to see to its boundaries. */
    /* If dark, set COULD_SEE so various spells work -dlc */
    if (rnum >= 0) {
        const room = game.level.rooms[rnum];
        for (zy = room.ly - 1; zy <= room.hy + 1; zy++) {
            rmin[zy] = start = room.lx - 1;
            rmax[zy] = stop = room.hx + 1;

            for (zx = start; zx <= stop; zx++) {
                if (room.rlit) {
                    next[zy][zx] = COULD_SEE | IN_SIGHT;
                    game.level.at(zx, zy).seenv = SVALL; /* see the walls */
                } else
                    next[zy][zx] = COULD_SEE;
            }
        }
    }

    const in_door = game.level.at(u.ux, u.uy).typ === DOOR;

    /* Can always see adjacent. */
    const ylo = Math.max(u.uy - 1, 0);
    const yhi = Math.min(u.uy + 1, ROWNO - 1);
    const xlo = Math.max(u.ux - 1, 1);
    const xhi = Math.min(u.ux + 1, COLNO - 1);
    for (zy = ylo; zy <= yhi; zy++) {
        if (xlo < rmin[zy])
            rmin[zy] = xlo;
        if (xhi > rmax[zy])
            rmax[zy] = xhi;

        for (zx = xlo; zx <= xhi; zx++) {
            next[zy][zx] = COULD_SEE | IN_SIGHT;
            /*
             * Yuck, update adjacent non-diagonal positions when in a doorway.
             * We need to do this to catch the case when we first step into
             * a room.  The room's walls were not seen from the outside, but
             * now are seen (the seen bits are set just above).  However, the
             * positions are not updated because they were already in sight.
             * So, we have to do it here.
             */
            if (in_door && (zx === u.ux || zy === u.uy))
                newsym(zx, zy);
        }
    }
}

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

    const bp = u.uprops?.[BLINDED];
    const Blind = !!(bp && (bp.intrinsic || bp.extrinsic) && !bp.blocked);
    if (control !== 2 && !u.uswallow) { /* you see nothing if swallowed */
        if (!Blind && Is_rogue_level(u.uz)) {
            rogue_vision(next, next_rmin, next_rmax);
        } else if (!Blind && u.utrap && u.utraptype === TT_PIT) {
            /* if in a pit, just update for immediate locations */
            for (let row = u.uy - 1; row <= u.uy + 1; row++) {
                if (row < 0)
                    continue;
                if (row >= ROWNO)
                    break;

                next_rmin[row] = Math.max(1, u.ux - 1);
                next_rmax[row] = Math.min(COLNO - 1, u.ux + 1);
                const next_row = next[row];

                for (let col = next_rmin[row]; col <= next_rmax[row]; col++)
                    next_row[col] = IN_SIGHT | COULD_SEE;
            }
        } else
            view_from(u.uy, u.ux, next, next_rmin, next_rmax);
    }

    /* C ref: vision.c vision_recalc() -- the Blind case: calculate the
       could_see array even when blind so that monsters can see you, even
       if you can't see them; only update positions we used to be able to
       see, then skip the normal update loop */
    if (control !== 2 && !u.uswallow && Blind) {
        const temp_array = game.viz_array; /* set viz_array so newsym() will work */
        game.viz_array = next;
        game.active_buf = game.active_buf === 0 ? 1 : 0;
        const old_rmin = game._viz_rmin, old_rmax = game._viz_rmax;
        if (temp_array) {
            for (let row = 0; row < ROWNO; row++) {
                const old_row = temp_array[row];
                const start = old_rmin ? Math.min(old_rmin[row], next_rmin[row]) : next_rmin[row];
                const stop = old_rmax ? Math.max(old_rmax[row], next_rmax[row]) : next_rmax[row];
                for (let col = start; col <= stop; col++)
                    if (old_row[col] & IN_SIGHT)
                        newsym(col, row);
            }
        }
        /* skip: */
        newsym(u.ux, u.uy); /* Make sure the hero shows up! */
        game._viz_rmin = next_rmin;
        game._viz_rmax = next_rmax;
        return;
    }

    /* Set the correct bits for all light sources. */
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

            // Lit cells
            if (loc.lit || (next[row][col] & TEMP_LIT)) {
                if ((loc.typ === DOOR || loc.typ === SDOOR || IS_WALL(loc.typ))
                    && !viz_clear[row]?.[col]) {
                    // Walls/doors: only IN_SIGHT if adjacent cell toward hero is lit
                    const dx = Math.sign(ux - col);
                    const flev = level?.at(col + dx, row + dy);
                    if (flev?.lit || (next[row + dy]?.[col + dx] & TEMP_LIT)) {
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
    /* C runs this loop for control == 2 and when swallowed too: the new
       array is empty, so every spot that was in sight (or could be seen)
       gets newsym()'d out of sight */
    if (old_array && game.level) {
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
                        newsym(col, row);
                    }
                } else if ((nv & COULD_SEE) && (loc.lit || (nv & TEMP_LIT))) {
                    if ((IS_WALL(loc.typ) || loc.typ === DOOR || loc.typ === SDOOR)
                        && !viz_clear[row][col]) {
                        const dx = Math.sign(ux - col);
                        const adjLoc = game.level.at(col + dx, row + dy);
                        if (adjLoc?.lit || (next[row + dy]?.[col + dx] & TEMP_LIT)) {
                            next_row[col] |= IN_SIGHT;
                            const oldseenv = loc.seenv || 0;
                            const sv = seenv_matrix[dy + 1][(col < ux) ? 0 : (col > ux ? 2 : 1)];
                            loc.seenv = (loc.seenv || 0) | sv;
                            if (!(ov & IN_SIGHT) || oldseenv !== loc.seenv)
                                newsym(col, row);
                        }
                    } else {
                        next_row[col] |= IN_SIGHT;
                        const oldseenv = loc.seenv || 0;
                        const sv = seenv_matrix[dy + 1][(col < ux) ? 0 : (col > ux ? 2 : 1)];
                        loc.seenv = (loc.seenv || 0) | sv;
                        if (!(ov & IN_SIGHT) || oldseenv !== loc.seenv)
                            newsym(col, row);
                    }
                } else if ((nv & COULD_SEE) && loc.waslit) {
                    loc.waslit = 0;
                    newsym(col, row);
                } else {
                    if ((ov & IN_SIGHT)
                        || ((nv & COULD_SEE) ^ (ov & COULD_SEE))) {
                        /* C: "TEMPORARY?" -- avoid newsym() for <0,y> */
                        if (col !== 0)
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

// C ref: vision.c clear_path() -- is the straight line between the two
// points clear of vision-blocking terrain (endpoints excluded)?
export function clear_path(col1, row1, col2, row2) {
    let result;

    if (col1 < col2) {
        if (row1 > row2) {
            result = q1_path(row1, col1, row2, col2);
        } else {
            result = q4_path(row1, col1, row2, col2);
        }
    } else {
        if (row1 > row2) {
            result = q2_path(row1, col1, row2, col2);
        } else if (row1 === row2 && col1 === col2) {
            result = 1;
        } else {
            result = q3_path(row1, col1, row2, col2);
        }
    }
    return !!result;
}

