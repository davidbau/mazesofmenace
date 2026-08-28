// vision.js — C ref: vision.c Algorithm C shadow-casting
// Partial: pit / underwater view_from named; nv_range circle live (D-1583).
// mimic_light_blocking See_invisible block/unblock live (D-1587).
// BOULDER + is_lightblocker_mappear (mimic boulder/door/wall) in does_block.

import { game } from './gstate.js';
import {
    COLNO, ROWNO, DOOR, SDOOR, TREE, CLOUD, LAVAWALL,
    D_CLOSED, D_LOCKED, D_TRAPPED,
    SV0, SV1, SV2, SV3, SV4, SV5, SV6, SV7, SVALL,
    IS_WALL, IS_WATERWALL, IS_OBSTRUCTED, IS_DOOR,
    ROOMOFFSET, Is_rogue_level,
    TEMP_LIT, M_AP_OBJECT, M_AP_FURNITURE, M_AP_TYPE, SEE_INVIS,
    MONSEEN_NORMAL, MONSEEN_SEEINVIS, MONSEEN_INFRAVIS, MONSEEN_TELEPAT,
    MONSEEN_XRAYVIS, MONSEEN_DETECT, MONSEEN_WARNMON,
} from './const.js';
import {
    newsym, canseemon, mon_visible, see_with_infrared, tp_sensemon,
    MATCH_WARN_OF_MON,
} from './display.js';
import { worm_known } from './worm.js';
import { objectNames } from './objects.js';
import { do_light_sources } from './light.js';
import { visible_region_at } from './region.js';

const COULD_SEE = 0x1;
const IN_SIGHT = 0x2;
const BOULDER = objectNames.indexOf('BOULDER');
// C ref: defsym.h cmap indices used by is_lightblocker_mappear
const S_ndoor = 12;
const S_vcdoor = 15;
const S_hcdoor = 16;
const S_tree = 18;

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

/** C vision.h: circle_ptr(z) ≡ &circle_data[(int) circle_start[z]] */
function circle_ptr(z) {
    return circle_data.slice(circle_start[z] | 0);
}

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
    // C: vis_func path (do_clear_area off-hero) vs set_cs COULD_SEE
    if (game.vis_func) {
        for (let i = left; i <= right; i++) game.vis_func(i, row, game.vis_arg);
        return;
    }
    const rowp = game.cs_rows?.[row];
    if (!rowp) return;
    for (let i = left; i <= right; i++) rowp[i] = COULD_SEE;
    if (game.cs_left[row] > left) game.cs_left[row] = left;
    if (game.cs_right[row] < right) game.cs_right[row] = right;
}

/**
 * C ref: monst.h is_lightblocker_mappear — boulder / closed-door / wall / tree
 * disguise blocks light like the real feature.
 */
export function is_lightblocker_mappear(mon) {
    if (!mon) return false;
    const ap = M_AP_TYPE(mon);
    if (ap === M_AP_OBJECT) return (mon.mappearance | 0) === BOULDER;
    if (ap !== M_AP_FURNITURE) return false;
    const app = mon.mappearance | 0;
    return app === S_hcdoor || app === S_vcdoor || app < S_ndoor || app === S_tree;
}

/**
 * C ref: display.c mimic_light_blocking — See_invisible toggles light
 * block for invisible lightblocker mimics. Not does_block/recalc:
 * when See_invisible, block_point; else unblock_point (C `:1531–1540`).
 * C youprop.h See_invisible = H || E (uprops[SEE_INVIS]); JS also
 * reads H/E/sticky flats. Do not add a 7th named See_invisible clone.
 */
function mimic_light_blocking(mtmp) {
    if (!mtmp) return;
    if (mtmp.minvis && is_lightblocker_mappear(mtmp)) {
        const u = game.u || {};
        const p = u.uprops?.[SEE_INVIS];
        if ((p?.intrinsic | 0) || (p?.extrinsic | 0)
            || (u.HSee_invisible | 0) || (u.ESee_invisible | 0)
            || u.See_invisible)
            block_point(mtmp.mx | 0, mtmp.my | 0);
        else
            unblock_point(mtmp.mx | 0, mtmp.my | 0);
    }
}

/**
 * C ref: display.c set_mimic_blocking — iter_mons mimic_light_blocking.
 * Call when See_invisible state changes.
 */
export function set_mimic_blocking() {
    for (const mtmp of game.fmon || []) {
        if (!mtmp || (mtmp.mhp | 0) <= 0) continue;
        mimic_light_blocking(mtmp);
    }
}

/**
 * C ref: vision.c does_block — terrain/door + BOULDER + lightblocker mimic
 * + visible_region_at gas cloud (return 2). Occupancy via fmon (no
 * vision→mon.js `m_at`; cycle). Underwater moat deferred.
 */
export function does_block(x, y, lev) {
    const loc = lev ?? game.level?.at?.(x, y);
    if (!loc) return 1;
    const typ = loc.typ ?? 0;
    // C: IS_OBSTRUCTED || TREE || closed/locked/trapped door
    if (IS_OBSTRUCTED(typ) || typ === TREE
        || (IS_DOOR(typ)
            && ((loc.doormask ?? 0) & (D_CLOSED | D_LOCKED | D_TRAPPED)))) {
        return 1;
    }
    if (typ === CLOUD || IS_WATERWALL(typ) || typ === LAVAWALL) return 1;
    // Boulders block light (level.objects nexthere chain)
    const head = game._objects_at?.get?.(`${x},${y}`);
    for (let obj = head; obj; obj = obj.nexthere) {
        if (obj.otyp === BOULDER) return 1;
    }
    // C: m_at + (!minvis || See_invisible) && is_lightblocker_mappear
    const steed = game.u?.usteed;
    for (const mon of game.fmon || []) {
        if (!mon || mon === steed) continue;
        if (mon.mx !== x || mon.my !== y) continue;
        if (mon.minvis && !game.u?.See_invisible) continue;
        if (is_lightblocker_mappear(mon)) return 1;
    }
    // C: visible_region_at → return 2 (opaque gas cloud)
    if (visible_region_at(x, y)) return 2;
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
            const cur_block = !!does_block(x, y, level.at(x, y));
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
 * C ref: vision.c dig_point — incremental viz_clear / left_ptrs /
 * right_ptrs when a cell becomes transparent. Inverse of fill_point.
 * Caller is unblock_point(x,y) → dig_point(y,x). No leftover-`i`
 * end-case writes (those are fill_point only).
 */
function dig_point(row, col) {
    let i;

    if (!viz_clear[row] || viz_clear[row][col])
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

/**
 * C ref: vision.c fill_point — incremental viz_clear / left_ptrs /
 * right_ptrs when a cell becomes opaque. `i` is function-scoped like C
 * (post-loop leftover writes). Caller is block_point(x,y) → fill_point(y,x).
 */
function fill_point(row, col) {
    let i;

    if (!viz_clear[row]?.[col]) return;

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

/**
 * C ref: vision.c block_point — fill_point(y, x) then vision_full_recalc
 * if viz_array[y][x] (could-see). DEBUG seethru omitted.
 */
export function block_point(x, y) {
    fill_point(y, x);
    if (game.viz_array?.[y]?.[x])
        game.vision_full_recalc = 1;
}

/**
 * C ref: vision.c unblock_point — dig_point(y, x) then vision_full_recalc
 * if viz_array[y][x] (could-see). Light-source recalc still a C comment.
 */
export function unblock_point(x, y) {
    dig_point(y, x);
    if (game.viz_array?.[y]?.[x])
        game.vision_full_recalc = 1;
}

/**
 * C ref: vision.c recalc_block_point — does_block then block_point,
 * else unblock_point. Not a full vision_reset (D-0113 stub retired).
 */
export function recalc_block_point(x, y) {
    const loc = game.level?.at?.(x, y);
    if (does_block(x, y, loc))
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

// C ref: vision.c clear_path(col1,row1,col2,row2) — LOS for m_cansee
export function clear_path(col1, row1, col2, row2) {
    if (col1 < col2) {
        if (row1 > row2) return q1_path(row1, col1, row2, col2);
        return q4_path(row1, col1, row2, col2);
    }
    if (row1 > row2) return q2_path(row1, col1, row2, col2);
    if (row1 === row2 && col1 === col2) return 1;
    return q3_path(row1, col1, row2, col2);
}

// C ref: vision.h m_cansee — clear_path from monster to location
export function m_cansee(mtmp, x2, y2) {
    return !!clear_path(mtmp.mx, mtmp.my, x2, y2);
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

// C ref: vision.c view_from() — optional func/arg for do_clear_area
function view_from(srow, scol, cs_rows, cs_left, cs_right, range = 0,
    func = null, arg = null) {
    game.vis_start_col = scol;
    game.vis_start_row = srow;
    game.cs_rows = cs_rows;
    game.cs_left = cs_left;
    game.cs_right = cs_right;
    game.vis_func = func;
    game.vis_arg = arg;

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

    if (func) {
        for (let i = left; i <= right; i++) func(i, srow, arg);
    } else {
        mark_visible_range(srow, left, right);
    }

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
    game.vis_func = null;
    game.vis_arg = null;
}

/**
 * C ref: vision.c do_clear_area — hero-centered uses couldsee; off-hero
 * uses view_from(..., range, func, arg) for pet wantdoor / similar.
 */
export function do_clear_area(scol, srow, range, func, arg) {
    const u = game.u || {};
    if (scol !== u.ux || srow !== u.uy) {
        view_from(srow, scol, null, null, null, range, func, arg);
        return;
    }
    if (range < 1 || range >= circle_start.length) return;
    if (game.vision_full_recalc) vision_recalc(0);
    const limitsStart = circle_start[range];
    let max_y = srow + range;
    if (max_y >= ROWNO) max_y = ROWNO - 1;
    let y = srow - range;
    if (y < 0) y = 0;
    for (; y <= max_y; y++) {
        const offset = circle_data[limitsStart + Math.abs(y - srow)] | 0;
        let min_x = scol - offset;
        if (min_x < 1) min_x = 1;
        let max_x = scol + offset;
        if (max_x >= COLNO) max_x = COLNO - 1;
        for (let x = min_x; x <= max_x; x++) {
            if (couldsee(x, y)) func(x, y, arg);
        }
    }
}

/**
 * C ref: vision.c rogue_vision — Rogue-level could-see / in-sight.
 * Room (if any): bounds get COULD_SEE (+ IN_SIGHT when rlit); always
 * see the 3×3 adjacent to the hero. Replaces Algorithm-C view_from.
 * Named omissions (vision_recalc): Blind old-sight newsym path;
 * do_light_sources; pit/underwater COULD_SEE clamps.
 */
function rogue_vision(next, rmin, rmax) {
    const u = game.u;
    const level = game.level;
    if (!u || !level) return;

    const locHere = level.at(u.ux, u.uy);
    const rnum = ((locHere?.roomno | 0) - ROOMOFFSET) | 0;
    const rooms = level.rooms || [];

    if (rnum >= 0 && rooms[rnum]) {
        const rm = rooms[rnum];
        const start = (rm.lx | 0) - 1;
        const stop = (rm.hx | 0) + 1;
        const rlit = !!(rm.rlit);
        for (let zy = (rm.ly | 0) - 1; zy <= (rm.hy | 0) + 1; zy++) {
            if (zy < 0 || zy >= ROWNO) continue;
            rmin[zy] = start;
            rmax[zy] = stop;
            for (let zx = start; zx <= stop; zx++) {
                if (zx < 1 || zx >= COLNO) continue;
                if (rlit) {
                    next[zy][zx] = COULD_SEE | IN_SIGHT;
                    const loc = level.at(zx, zy);
                    if (loc) loc.seenv = SVALL;
                } else {
                    next[zy][zx] = COULD_SEE;
                }
            }
        }
    }

    const in_door = (locHere?.typ === DOOR);
    const ylo = Math.max(u.uy - 1, 0);
    const yhi = Math.min(u.uy + 1, ROWNO - 1);
    const xlo = Math.max(u.ux - 1, 1);
    const xhi = Math.min(u.ux + 1, COLNO - 1);
    for (let zy = ylo; zy <= yhi; zy++) {
        if (xlo < rmin[zy]) rmin[zy] = xlo;
        if (xhi > rmax[zy]) rmax[zy] = xhi;
        for (let zx = xlo; zx <= xhi; zx++) {
            next[zy][zx] = COULD_SEE | IN_SIGHT;
            // C: doorway ortho newsym so newly-seen room walls refresh
            if (in_door && (zx === u.ux || zy === u.uy)) {
                newsym(zx, zy);
            }
        }
    }
}

/**
 * C ref: vision.c vision_recalc :631–668 — OR IN_SIGHT in the xray
 * circle (or the hero cell when range is 0). seenv = SVALL; newsym
 * while viz_array is still the old buffer (C order, before lights).
 * Caller is the non-rogue else after view_from. Range < 0 is a no-op
 * (u_init_misc sets -1 until Eyes SPFX_XRAY).
 */
function apply_xray_in_sight(next, next_rmin, next_rmax, u) {
    if (!(u.xray_range >= 0)) return;
    const level = game.level;
    if (u.xray_range) {
        const ranges = circle_ptr(u.xray_range);
        for (let row = u.uy - u.xray_range; row <= u.uy + u.xray_range; row++) {
            if (row < 0) continue;
            if (row >= ROWNO) break;
            const dy = (u.uy - row) < 0 ? (row - u.uy) : (u.uy - row);
            const next_row = next[row];
            const start = Math.max(1, u.ux - ranges[dy]);
            const stop = Math.min(COLNO - 1, u.ux + ranges[dy]);
            for (let col = start; col <= stop; col++) {
                const old_row_val = next_row[col];
                next_row[col] |= IN_SIGHT;
                const loc = level?.at(col, row);
                const oldseenv = loc ? (loc.seenv | 0) : 0;
                if (loc) loc.seenv = SVALL;
                if (!(old_row_val & IN_SIGHT) || oldseenv !== SVALL) {
                    newsym(col, row);
                }
            }
            next_rmin[row] = Math.min(start, next_rmin[row]);
            next_rmax[row] = Math.max(stop, next_rmax[row]);
        }
    } else {
        next[u.uy][u.ux] |= IN_SIGHT;
        const loc = level?.at(u.ux, u.uy);
        if (loc) loc.seenv = SVALL;
        next_rmin[u.uy] = Math.min(u.ux, next_rmin[u.uy]);
        next_rmax[u.uy] = Math.max(u.ux, next_rmax[u.uy]);
    }
}

/**
 * C ref: vision.c vision_recalc :670–700 — OR IN_SIGHT in the night-vision
 * circle when has_night_vision && xray_range < nv_range (Eyes already
 * cover a larger-or-equal circle). Unlike xray, only cells that
 * view_from already marked (next_row[col] != 0) get IN_SIGHT; seenv
 * stays for the main update loop except range 0 (hero SVALL). No
 * newsym here. u_init_misc sets nv_range = 1 (3×3 ≡ circle_ptr(1)).
 */
function apply_nv_range_in_sight(next, next_rmin, next_rmax, u, has_night_vision) {
    if (!(has_night_vision && u.xray_range < u.nv_range)) return;
    const level = game.level;
    if (!u.nv_range) {
        next[u.uy][u.ux] |= IN_SIGHT;
        const loc = level?.at(u.ux, u.uy);
        if (loc) loc.seenv = SVALL;
        next_rmin[u.uy] = Math.min(u.ux, next_rmin[u.uy]);
        next_rmax[u.uy] = Math.max(u.ux, next_rmax[u.uy]);
    } else if (u.nv_range > 0) {
        const ranges = circle_ptr(u.nv_range);
        for (let row = u.uy - u.nv_range; row <= u.uy + u.nv_range; row++) {
            if (row < 0) continue;
            if (row >= ROWNO) break;
            const dy = (u.uy - row) < 0 ? (row - u.uy) : (u.uy - row);
            const next_row = next[row];
            const start = Math.max(1, u.ux - ranges[dy]);
            const stop = Math.min(COLNO - 1, u.ux + ranges[dy]);
            for (let col = start; col <= stop; col++) {
                if (next_row[col]) next_row[col] |= IN_SIGHT;
            }
            next_rmin[row] = Math.min(start, next_rmin[row]);
            next_rmax[row] = Math.max(stop, next_rmax[row]);
        }
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

    // C youprop.h Blind ≡ (HBlinded || EBlinded) && !BBlinded (D-0716: no sticky)
    const heroBlind = !!(u.uroleplay?.blind
        || ((((u.HBlinded | 0) || (u.EBlinded | 0)) && !(u.BBlinded | 0))));

    if (control === 2 || u.uswallow) {
        // C: swallow / refresh — leave next empty (hero sees nothing)
    } else if (heroBlind) {
        // C Blind: still compute COULD_SEE so monsters can see you, but
        // never OR IN_SIGHT; only newsym cells that were previously seen.
        view_from(u.uy, u.ux, next, next_rmin, next_rmax);

        const old_array = game.viz_array;
        game.viz_array = next;
        game.active_buf = game.active_buf === 0 ? 1 : 0;

        const old_rmin = game._viz_rmin;
        const old_rmax = game._viz_rmax;
        if (old_array) {
            for (let row = 0; row < ROWNO; row++) {
                const old_row = old_array[row];
                const start = old_rmin
                    ? Math.min(old_rmin[row], next_rmin[row])
                    : next_rmin[row];
                const stop = old_rmax
                    ? Math.max(old_rmax[row], next_rmax[row])
                    : next_rmax[row];
                if (start > stop) continue;
                for (let col = start; col <= stop; col++) {
                    if (old_row[col] & IN_SIGHT) newsym(col, row);
                }
            }
        }
        game._viz_rmin = next_rmin;
        game._viz_rmax = next_rmax;
        return;
    } else if (control !== 2) {
        // Is_rogue_level → rogue_vision; else Algorithm-C view_from.
        if (Is_rogue_level(u.uz)) {
            rogue_vision(next, next_rmin, next_rmax);
        } else {
            // C: has_night_vision = 1; Underwater && !Is_waterlevel → 0
            // and replaces view_from with pool 3×3 (named). Pit TT_PIT
            // 3×3 IN_SIGHT|COULD_SEE named.
            const has_night_vision = 1;
            view_from(u.uy, u.ux, next, next_rmin, next_rmax);
            // C vision.c vision_recalc :631–700 — IN_SIGHT for xray then
            // nv_range circle after view_from, before do_light_sources.
            apply_xray_in_sight(next, next_rmin, next_rmax, u);
            apply_nv_range_in_sight(next, next_rmin, next_rmax, u, has_night_vision);
        }
    }

    // C: do_light_sources(next_array) before IN_SIGHT from lit|TEMP_LIT
    do_light_sources(next);

    // Compute IN_SIGHT from COULD_SEE + lighting (non-rogue primary path;
    // rogue_vision already ORs IN_SIGHT for room/adjacent — loop is idempotent)
    const level = game.level;
    const ux = u.ux, uy = u.uy;

    for (let row = 0; row < ROWNO; row++) {
        const dy = Math.sign(uy - row);
        for (let col = next_rmin[row]; col <= next_rmax[row]; col++) {
            if (!(next[row][col] & COULD_SEE)) continue;
            const loc = level?.at(col, row);
            if (!loc) continue;

            // Lit cells (permanent or TEMP_LIT from light sources)
            // NV/xray already ORed IN_SIGHT before lights (C :631–700).
            if (loc.lit || (next[row][col] & TEMP_LIT)) {
                if ((loc.typ === DOOR || loc.typ === SDOOR || IS_WALL(loc.typ))
                    && !viz_clear[row]?.[col]) {
                    // Walls/doors: only IN_SIGHT if adjacent cell toward hero is lit
                    const dx = Math.sign(ux - col);
                    const flev = level?.at(col + dx, row + dy);
                    const ftmp = next[row + dy]?.[col + dx];
                    if (flev?.lit || (ftmp & TEMP_LIT)) {
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
    // C: control==2 falls through to the main update loop (clears live
    // mon glyphs in gbuf). JS gbuf is loc.disp_* and full flushes paint it
    // immediately — running that loop here regresses mid-goto / getpos
    // screens that C still shows from an unflushed tty (Scr 174 #992).
    // Hallu display_warning burns for docrt / goto_level leave are done via
    // vision_off_newsym_gbuf({ useLiveViz: true }) at those call sites (D-0852).
    // Leave-level gbuf flush for Get bones? is handled in bones.js (D-0583).
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

/**
 * C ref: vision.c howmonseen :2151–2186 — bitmask of ways the hero
 * sees `mon`. Callers apply.c use_mirror (SEENMON vs INFRAVIS-only)
 * and pager.c look_at_monster monbuf. NORMAL is cansee&&couldsee (or
 * worm_known), not canseemon: astral IN_SIGHT without COULD_SEE is
 * XRAYVIS. mdistu inlined (hack.h dist2; no mdistu clone).
 */
export function howmonseen(mon) {
    if (!mon) return 0;
    const u = game.u || {};
    const useemon = canseemon(mon);
    const xr = u.xray_range | 0;
    const xraydist = xr < 0 ? -1 : xr * xr;
    let how_seen = 0;
    const mx = mon.mx | 0;
    const my = mon.my | 0;
    /* C: cansee is true for normal and astral; couldsee is not for astral */
    if ((mon.wormno ? worm_known(mon) : (cansee(mx, my) && couldsee(mx, my)))
        && mon_visible(mon) && !mon.minvis) {
        how_seen |= MONSEEN_NORMAL;
    }
    if (useemon && mon.minvis) how_seen |= MONSEEN_SEEINVIS;
    const See_invisible = !!((u.HSee_invisible | 0) || (u.ESee_invisible | 0)
        || u.See_invisible);
    if ((!mon.minvis || See_invisible) && see_with_infrared(mon)) {
        how_seen |= MONSEEN_INFRAVIS;
    }
    if (tp_sensemon(mon)) how_seen |= MONSEEN_TELEPAT;
    /* C hack.h mdistu(mon) ≡ dist2(mx, my, ux, uy) */
    const dx = mx - (u.ux | 0);
    const dy = my - (u.uy | 0);
    if (useemon && xraydist > 0 && (dx * dx + dy * dy) <= xraydist) {
        how_seen |= MONSEEN_XRAYVIS;
    }
    if ((u.HDetect_monsters | 0) || (u.EDetect_monsters | 0)
        || u.Detect_monsters) {
        how_seen |= MONSEEN_DETECT;
    }
    if (MATCH_WARN_OF_MON(mon)) how_seen |= MONSEEN_WARNMON;
    return how_seen;
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

/**
 * C vision_recalc(2) main update loop only — newsym previously IN_SIGHT
 * / COULD_SEE cells while cansee is false (mon→memory in gbuf; Hallu
 * mon_warning → display_warning rn2(5)). Used by:
 *   - getbones yn flush with `_leave_viz_snapshot` (D-0583)
 *   - docrt / goto_level leave with `{ useLiveViz: true }` (D-0852)
 * because JS cannot run that loop inside ordinary vision_recalc(2)
 * without painting cleared gbuf on later full flushes.
 */
export function vision_off_newsym_gbuf(opts = {}) {
    const u = game.u;
    if (!u || !game.level) return;
    const snap = opts.useLiveViz ? null : game._leave_viz_snapshot;
    const old_array = snap?.array || game.viz_array;
    const old_rmin = snap?.rmin || game._viz_rmin;
    const old_rmax = snap?.rmax || game._viz_rmax;
    const next = game.active_buf === 0 ? cs_buf1 : cs_buf0;
    for (let y = 0; y < ROWNO; y++) next[y].fill(0);
    // cansee() reads viz_array — empty ⇒ !cansee ⇒ mon cells show memory
    const savedViz = game.viz_array;
    game.viz_array = next;
    if (old_array) {
        for (let row = 0; row < ROWNO; row++) {
            const old_row = old_array[row];
            const start = old_rmin ? old_rmin[row] : 1;
            const stop = old_rmax ? old_rmax[row] : COLNO - 1;
            if (start > stop) continue;
            for (let col = start; col <= stop; col++) {
                if (col === 0) continue;
                // C not_in_sight when next is empty:
                // old IN_SIGHT || (next COULD_SEE ^ old COULD_SEE)
                // ≡ old IN_SIGHT || old COULD_SEE
                const ov = old_row[col];
                if ((ov & IN_SIGHT) || (ov & COULD_SEE))
                    newsym(col, row);
            }
        }
    }
    if ((u.ux | 0) > 0) newsym(u.ux, u.uy);
    game.viz_array = savedViz;
}
