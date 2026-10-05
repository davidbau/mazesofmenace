// @ts-nocheck
// vision.js — C ref: vision.c Algorithm C shadow-casting
// underwater, or rogue-level handling.  Blindness (vision.c:547-582) and the
// pit arm (vision.c:608-623) have since been ported below, and so has the
// light-source hook: vision.c:702 `do_light_sources(next_array)` plus the two
// TEMP_LIT tests it feeds (vision.c:756 and vision.c:772).
import { game } from './gstate.js';
import { Is_rogue_level, ROOMOFFSET, COLNO, ROWNO, DOOR, SDOOR, POOL, WATER, LAVAWALL, CLOUD, D_CLOSED, D_LOCKED, D_TRAPPED, SV0, SV1, SV2, SV3, SV4, SV5, SV6, SV7, SVALL, IS_WALL, isok, BLINDED, SEE_INVIS, DETECT_MONSTERS, MONSEEN_NORMAL, MONSEEN_SEEINVIS, MONSEEN_INFRAVIS, MONSEEN_TELEPAT, MONSEEN_XRAYVIS, MONSEEN_DETECT, MONSEEN_WARNMON } from './const.js';
import { newsym, canseemon, mon_visible, see_with_infrared, tp_sensemon, MATCH_WARN_OF_MON } from './display.js';
import { worm_known } from './worm.js';
import { do_light_sources } from './light.js';
import { pushRngLogEntry } from './rng.js';
/* C vision.c:195 does_block()'s last clause reads region.c's
 * visible_region_at().  Importing it closes a region.js <-> vision.js cycle
 * (region.js already imports cansee/block_point/unblock_point from here), but
 * neither module body calls the other at evaluation time, so the live ESM
 * binding is resolved by the time _blocks() first runs. */
import { visible_region_at } from './region.js';
import { ENV } from './hostenv.js';
const COULD_SEE = 0x1;
const IN_SIGHT = 0x2;
let _visionTraceSeq = 0;

function _visionTraceCells(array) {
    if (typeof process === 'undefined' || ENV?.FF_VISION_TRACE !== '1')
        return '';
    const raw = ENV.FF_VISION_TRACE_CELLS || '40,3;41,3;42,3;39,4;40,4;42,4;43,4';
    return raw.split(';').map((part) => {
        const [xs, ys] = part.split(',');
        const x = Number(xs), y = Number(ys);
        if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || x >= COLNO || y < 0 || y >= ROWNO)
            return null;
        const bits = array?.[y]?.[x] | 0;
        const loc = game.level?.at(x, y);
        return `${x},${y}:bits=${bits},couldSee=${bits & COULD_SEE ? 1 : 0}`
            + `,inSight=${bits & IN_SIGHT ? 1 : 0},typ=${loc?.typ | 0}`
            + `,lit=${loc?.lit ? 1 : 0},viz_clear=${viz_clear[y]?.[x] | 0}`;
    }).filter(Boolean).join('|');
}

function _visionTrace(phase, control, u, array) {
    if (typeof process === 'undefined' || ENV?.FF_VISION_TRACE !== '1')
        return;
    const marker = `^vision_recalc[seq=${++_visionTraceSeq} phase=${phase} control=${control | 0}`
        + ` hero=${u?.ux | 0},${u?.uy | 0} cells=${_visionTraceCells(array)}]`;
    pushRngLogEntry(marker);
    // Diagnostic consumers which must preserve the order of display-RNG calls
    // cannot reconstruct it from the core log: display calls themselves do not
    // add entries there.  This opt-in side channel is intentionally inert in
    globalThis.__REDRAW_ORDER_TRACE?.push({ kind: 'vision', core: null, marker });
}
// C ref: vision.h:10 — location is temporarily lit (by a mobile light
// source; see js/light.js do_light_sources).
const TEMP_LIT = 0x4;
// C ref: nethack-c/include/youprop.h:103
//   Blind = ((HBlinded || EBlinded) && !BBlinded)
// with HBlinded/EBlinded/BBlinded = u.uprops[BLINDED].{intrinsic,extrinsic,
// blocked} (youprop.h:87-103).  Read with the SAME expression the botl "Blind"
// condition (js/display.js:2406-2409) and see_with_infrared (js/display.js:3341)
// already use — including the `u.ublind` alias those two accept — so the status
// line, the infravision test and the vision recalc agree by construction rather
// than by coincidence.  No RNG.
export function Blind() {
    const u = game.u;
    if (!u)
        return false;
    const bp = u.uprops && u.uprops[BLINDED];
    return !!bp && !!((bp.intrinsic | 0) || (bp.extrinsic | 0))
            && !(bp.blocked | 0);
}
// C ref: vision.c seenv_matrix
const seenv_matrix = [
    [SV2, SV1, SV0],
    [SV3, SVALL, SV7],
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
/* C ref: vision.c:1596 `#define circle_ptr(x) (&circle_data[circle_start[x]])`
 * — the row of per-dy column offsets for a circle of the given radius.  C
 * hands back a pointer indexed from 0; the slice is that pointer.  Exported
 * for js/light.js#do_light_sources, the other C caller of this table. */
export function circle_ptr(range) { return circle_data.slice(circle_start[range]); }
// Vision state arrays
const viz_clear = Array.from({ length: ROWNO }, () => new Int8Array(COLNO));
const left_ptrs = Array.from({ length: ROWNO }, () => new Int16Array(COLNO));
const right_ptrs = Array.from({ length: ROWNO }, () => new Int16Array(COLNO));
// Double-buffered COULD_SEE bitmap
const cs_buf0 = Array.from({ length: ROWNO }, () => new Uint8Array(COLNO));
const cs_buf1 = Array.from({ length: ROWNO }, () => new Uint8Array(COLNO));
const cs_rmin0 = new Int16Array(ROWNO).fill(COLNO);

/* C ref: vision.c:104-111 get_viz_clear() — "expose viz_clear[][] for sanity
 * checking".  NOTE the C returns TRUE when the cell is NOT clear (the name
 * reads backwards); Cardinal Rule 1 — port the C, not the name. */
export function get_viz_clear(x, y) {
    if (isok(x, y) && !viz_clear[y][x])
        return true;
    return false;
}
const cs_rmax0 = new Int16Array(ROWNO).fill(0);
const cs_rmin1 = new Int16Array(ROWNO).fill(COLNO);
const cs_rmax1 = new Int16Array(ROWNO).fill(0);
function mark_visible_range(row, left, right) {
    if (left > right)
        return;
    // C ref: vision.c right_side/left_side/view_from — when vis_func is set
    // (do_clear_area off-center path), call func(i, row, varg) per square
    // INSTEAD of set_cs(rowp,i) + set_min/set_max.  Same column order (left..right).
    if (game.vis_func) {
        const fn = game.vis_func;
        const arg = game.vis_varg;
        for (let i = left; i <= right; i++)
            fn(i, row, arg);
        return;
    }
    const rowp = game.cs_rows?.[row];
    if (!rowp)
        return;
    for (let i = left; i <= right; i++)
        rowp[i] = COULD_SEE;
    if (game.cs_left[row] > left)
        game.cs_left[row] = left;
    if (game.cs_right[row] < right)
        game.cs_right[row] = right;
}
// Simplified blockage check: walls, closed doors, stone
function _blocks(level, x, y) {
    const loc = level.at(x, y);
    if (!loc)
        return true;
    const typ = loc.typ ?? 0;
    if (typ < POOL)
        return true; // STONE, walls, SDOOR, SCORR
    if (typ === DOOR) {
        const mask = loc.doormask ?? 0;
        if (mask & (D_CLOSED | D_LOCKED | D_TRAPPED))
            return true;
    }
    if (typ === CLOUD || typ === WATER || typ === LAVAWALL)
        return true;
    const _objs = game.level?.levelObjects?.[x]?.[y] ?? null;
    for (let o = _objs; o; o = o.nexthere)
        if ((o.otyp | 0) === BOULDER_OTYP_VIS)
            return true;
    const mon = _m_at_vis(x, y);
    if (mon && (!mon.minvis || _see_invisible()) && is_lightblocker_mappear(mon))
        return true;
    if (visible_region_at(x, y))
        return true;
    return false;
}

/* C vision.c:153 does_block(x, y, lev) — exported so js/region.js can run the
 * `if (!does_block(x, y, &levl[x][y])) unblock_point(x, y)` guard C uses at
 * region.c:375 and region.c:1071.  Those two sites had been calling
 * unblock_point() unconditionally on the argument that JS's unblock_point is a
 * whole-grid vision_reset() and so cannot change the resulting viz state.  That
 * was true only while the region arm above was missing: with it in place,
 * expire_gas_cloud() runs while its own region is still in gr.regions[] with
 * ttl 0 (remove_region is what sets ttl -2), so C's does_block() still returns
 * 2 there and C does NOT unblock and does NOT set vision_full_recalc.  Calling
 * unblock_point() anyway sets it, which schedules a vision_recalc C never
 * runs. */
export function does_block(x, y) {
    return _blocks(game.level, x, y);
}
/* C rm.h:534 m_at(x,y).  js/uhitm.js exports the canonical body, but importing
 * it here would close a vision.js -> uhitm.js -> ... -> vision.js cycle, so the
 * same statement is repeated: the fmon chain, live monsters only, and a mounted
 * steed (which C keeps off the monster grid) is not AT anywhere. */
function _m_at_vis(x, y) {
    const steed = game.u ? game.u.usteed : null;
    for (let m = game.fmon; m; m = m.nmon) {
        if (m === steed || m._mapRemoved)
            continue;
        if ((m.mhp | 0) > 0 && m.mx === x && m.my === y)
            return m;
    }
    return null;
}
/* C youprop.h See_invisible. */
function _see_invisible() {
    const p = game.u?.uprops?.[SEE_INVIS];
    return !!p && !!((p.intrinsic | 0) || (p.extrinsic | 0)) && !(p.blocked | 0);
}
/* C monst.h:233 is_lightblocker_mappear(mon) —
 *     is_obj_mappear(mon, BOULDER)
 *     || (M_AP_TYPE(mon) == M_AP_FURNITURE
 *         && (mappearance == S_hcdoor || mappearance == S_vcdoor
 *             || mappearance < S_ndoor  [= walls] || mappearance == S_tree))
 * S_* indices are defsym.h's PCHAR ordering: S_ndoor 12, S_vcdoor 15,
 * S_hcdoor 16, S_tree 18. */
const _S_NDOOR_VIS = 12, _S_VCDOOR_VIS = 15, _S_HCDOOR_VIS = 16, _S_TREE_VIS = 18;
export function is_lightblocker_mappear(mon) {
    const apType = (mon.m_ap_type | 0) & M_AP_TYPMASK_VIS;
    const app = mon.mappearance | 0;
    if (apType === M_AP_OBJECT_VIS && app === BOULDER_OTYP_VIS)
        return true;
    return apType === M_AP_FURNITURE_VIS
        && (app === _S_HCDOOR_VIS || app === _S_VCDOOR_VIS
            || app < _S_NDOOR_VIS || app === _S_TREE_VIS);
}
/* C monst.h:60-73 — M_AP_TYPMASK and the M_AP_* appearance kinds. */
const M_AP_TYPMASK_VIS = 0x7, M_AP_FURNITURE_VIS = 1, M_AP_OBJECT_VIS = 2;
/* C objects.h BOULDER (js/dig.js:426, js/monmove.js:670, js/dogmove.js:1807). */
const BOULDER_OTYP_VIS = 475;
// C ref: vision.c:860-925 vision_reset() — rebuild viz_clear and left/right ptrs
export function vision_reset() {
    const level = game.level;
    if (!level)
        return;
    game.viz_array = cs_buf0;
    game.active_buf = 0;
    for (let i = 0; i < ROWNO; i++) {
        cs_buf0[i].fill(0);
        cs_buf1[i].fill(0);
    }
    _vision_rebuild_grid();
    game._viz_rmin = cs_rmin0;
    game._viz_rmax = cs_rmax0;
    // C vision.c:263 — the rebuilt vision state is ready for recalculation.
    game.iflags.vision_inited = true;
}

/* C vision.c:876-921 — the viz_clear / left_ptrs / right_ptrs half of
 * vision_reset(): a pure function of the level grid via _blocks() (C's
 * does_block()).  Split out so the block-point wrappers can rebuild the grid
 * WITHOUT clearing the could_see buffers (see the note above). */
function _vision_rebuild_grid() {
    const level = game.level;
    if (!level)
        return;
    for (let y = 0; y < ROWNO; y++)
        _vision_rebuild_row(level, y);
}
/* One row of the rebuild above; rows are independent (each reads only
 * _blocks(level, x, y) for its own y), so block_point() & co. rebuild just the
 * row they touch instead of the whole 21x80 grid. */
function _vision_rebuild_row(level, y) {
    {
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
                }
                else {
                    let i = dig_left;
                    if (dig_left)
                        dig_left--;
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
        if (!block && dig_left)
            dig_left--;
        for (; i < COLNO; i++) {
            left_ptrs[y][i] = dig_left;
            right_ptrs[y][i] = COLNO - 1;
            viz_clear[y][i] = block ? 0 : 1;
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
            if (err >= 0) {
                x++;
                err -= dys;
            }
            y--;
            err += dxs;
            if (!viz_clear[y][x])
                return 0;
        }
    }
    else {
        let err = dys - dx;
        for (let k = dx - 1; k; k--) {
            if (err >= 0) {
                y--;
                err -= dxs;
            }
            x++;
            err += dys;
            if (!viz_clear[y][x])
                return 0;
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
            if (err >= 0) {
                x--;
                err -= dys;
            }
            y--;
            err += dxs;
            if (!viz_clear[y][x])
                return 0;
        }
    }
    else {
        let err = dys - dx;
        for (let k = dx - 1; k; k--) {
            if (err >= 0) {
                y--;
                err -= dxs;
            }
            x--;
            err += dys;
            if (!viz_clear[y][x])
                return 0;
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
            if (err >= 0) {
                x--;
                err -= dys;
            }
            y++;
            err += dxs;
            if (!viz_clear[y][x])
                return 0;
        }
    }
    else {
        let err = dys - dx;
        for (let k = dx - 1; k; k--) {
            if (err >= 0) {
                y++;
                err -= dxs;
            }
            x--;
            err += dys;
            if (!viz_clear[y][x])
                return 0;
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
            if (err >= 0) {
                x++;
                err -= dys;
            }
            y++;
            err += dxs;
            if (!viz_clear[y][x])
                return 0;
        }
    }
    else {
        let err = dys - dx;
        for (let k = dx - 1; k; k--) {
            if (err >= 0) {
                y++;
                err -= dxs;
            }
            x++;
            err += dys;
            if (!viz_clear[y][x])
                return 0;
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
    if (right_mark > lim_max)
        right_mark = lim_max;
    const nextLimIdx = limitsIdx >= 0 ? limitsIdx + 1 : -1;
    while (left <= right_mark) {
        let right_edge = right_ptrs[row][left];
        if (right_edge > lim_max)
            right_edge = lim_max;
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
                if (result)
                    break;
            }
            if (left > lim_max)
                return;
            if (left === lim_max) {
                mark_visible_range(row, lim_max, lim_max);
                return;
            }
            if (left >= right_edge) {
                left = right_edge;
                continue;
            }
        }
        let right;
        if (right_mark < right_edge) {
            for (right = right_mark; right <= right_edge; right++) {
                const result = game.vis_step < 0
                    ? q1_path(game.vis_start_row, game.vis_start_col, row, right)
                    : q4_path(game.vis_start_row, game.vis_start_col, row, right);
                if (!result)
                    break;
            }
            right--;
        }
        else {
            right = right_edge;
        }
        if (left <= right) {
            if (left === right && left === game.vis_start_col && game.vis_start_col < COLNO - 1
                && !viz_clear[row][game.vis_start_col + 1]) {
                right = game.vis_start_col + 1;
            }
            if (right > lim_max)
                right = lim_max;
            mark_visible_range(row, left, right);
            if (deeper)
                right_side(nrow, left, right, nextLimIdx);
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
    if (left_mark < lim_min)
        left_mark = lim_min;
    const nextLimIdx = limitsIdx >= 0 ? limitsIdx + 1 : -1;
    while (right >= left_mark) {
        let left_edge = left_ptrs[row][right];
        if (left_edge < lim_min)
            left_edge = lim_min;
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
                if (result)
                    break;
            }
            if (right < lim_min)
                return;
            if (right === lim_min) {
                mark_visible_range(row, lim_min, lim_min);
                return;
            }
            if (right <= left_edge) {
                right = left_edge;
                continue;
            }
        }
        let left;
        if (left_mark > left_edge) {
            for (left = left_mark; left >= left_edge; left--) {
                const result = game.vis_step < 0
                    ? q2_path(game.vis_start_row, game.vis_start_col, row, left)
                    : q3_path(game.vis_start_row, game.vis_start_col, row, left);
                if (!result)
                    break;
            }
            left++;
        }
        else {
            left = left_edge;
        }
        if (left <= right) {
            if (left === right && right === game.vis_start_col && game.vis_start_col > 0
                && !viz_clear[row][game.vis_start_col - 1]) {
                left = game.vis_start_col - 1;
            }
            if (left < lim_min)
                left = lim_min;
            mark_visible_range(row, left, right);
            if (deeper)
                left_side(nrow, left, right, nextLimIdx);
            right = left - 1;
        }
    }
}
// C ref: vision.c view_from()
// func/arg: when func is non-null (do_clear_area off-center path), each visible
// square is reported via func(col, row, arg) instead of being written into the
// cs_rows could-see bitmap.  Mirrors C's vis_func/varg globals.
function view_from(srow, scol, cs_rows, cs_left, cs_right, range = 0, func = null, arg = null) {
    game.vis_start_col = scol;
    game.vis_start_row = srow;
    game.cs_rows = cs_rows;
    game.cs_left = cs_left;
    game.cs_right = cs_right;
    game.vis_func = func;
    game.vis_varg = arg;
    let left, right;
    if (viz_clear[srow][scol]) {
        left = left_ptrs[srow][scol];
        right = right_ptrs[srow][scol];
    }
    else {
        left = !scol ? 0
            : (viz_clear[srow][scol - 1] ? left_ptrs[srow][scol - 1] : scol - 1);
        right = scol === COLNO - 1 ? COLNO - 1
            : (viz_clear[srow][scol + 1] ? right_ptrs[srow][scol + 1] : scol + 1);
    }
    let limitsIdx = -1;
    if (range) {
        if (left < scol - range)
            left = scol - range;
        if (right > scol + range)
            right = scol + range;
        limitsIdx = circle_start[range] + 1;
    }
    mark_visible_range(srow, left, right);
    const nrow_down = srow + 1;
    if (nrow_down < ROWNO) {
        game.vis_step = 1;
        if (scol < COLNO - 1)
            right_side(nrow_down, scol, right, limitsIdx);
        if (scol)
            left_side(nrow_down, left, scol, limitsIdx);
    }
    const nrow_up = srow - 1;
    if (nrow_up >= 0) {
        game.vis_step = -1;
        if (scol < COLNO - 1)
            right_side(nrow_up, scol, right, limitsIdx);
        if (scol)
            left_side(nrow_up, left, scol, limitsIdx);
    }
    // Don't leak the func callback into the next vision_recalc view_from call.
    game.vis_func = null;
    game.vis_varg = null;
}
// C ref: vision.c:2095 do_clear_area(scol, srow, range, func, arg)
// Off-center (pet's-eye-view) branch: forward to view_from with the func.
// Hero-centered branch: walk the circle and call func on each couldsee square.
// NOTE: dog_goal calls do_clear_area(omx, omy, 9, wantdoor) — the off-center
// branch is the one the FARAWAY goal computation depends on.
export function do_clear_area(scol, srow, range, func, arg) {
    const u = game.u;
    if (scol !== (u?.ux | 0) || srow !== (u?.uy | 0)) {
        // off-center: the hard work — full shadow-cast from (srow,scol)
        view_from(srow, scol, null, null, null, range, func, arg);
    } else {
        // hero-centered: use the existing vision matrix.
        // C ref: vision.c:2130-2131 — the matrix is only trustworthy if it is
        // clean; C refreshes it first:
        //     if (gv.vision_full_recalc) vision_recalc(0); /* recalc if dirty */
        // Without this the couldsee() test below reads a STALE viz_array, so
        // set_lit()/findone()/openone() get applied to the square set the hero
        // could see at the last recalc rather than the one they can see now.
        if (game.vision_full_recalc)
            vision_recalc(0);
        const limitsIdx = circle_start[range];
        let max_y = srow + range;
        if (max_y >= ROWNO)
            max_y = ROWNO - 1;
        let y = srow - range;
        if (y < 0)
            y = 0;
        for (; y <= max_y; y++) {
            const offset = circle_data[limitsIdx + Math.abs(y - srow)];
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
}

/* Async counterpart for callbacks whose C body performs a user-visible wait.
 * The existing do_clear_area() deliberately remains synchronous because most
 * callbacks are pure map mutations.  Bell of Opening's openone() is different:
 * its trapped-door and falling-trap arms can await pline()/trap effects.  Keep
 * the same hero-centered circle and vision refresh, but await each callback so
 * those effects cannot run after the command has already returned. */
export async function do_clear_area_async(scol, srow, range, func, arg) {
    const u = game.u;
    if (scol !== (u?.ux | 0) || srow !== (u?.uy | 0)) {
        throw new Error('do_clear_area_async requires a hero-centered origin');
    }
    if (game.vision_full_recalc)
        vision_recalc(0);
    const limitsIdx = circle_start[range];
    let max_y = srow + range;
    if (max_y >= ROWNO)
        max_y = ROWNO - 1;
    let y = srow - range;
    if (y < 0)
        y = 0;
    for (; y <= max_y; y++) {
        const offset = circle_data[limitsIdx + Math.abs(y - srow)];
        let min_x = scol - offset;
        if (min_x < 1)
            min_x = 1;
        let max_x = scol + offset;
        if (max_x >= COLNO)
            max_x = COLNO - 1;
        for (let x = min_x; x <= max_x; x++)
            if (couldsee(x, y))
                await func(x, y, arg);
    }
}
// C ref: vision_recalc(control)
/* C vision.c:314-375 rogue_vision(): the Rogue level sees to the room
 * boundaries (lit rooms IN_SIGHT, dark ones only COULD_SEE) and always sees
 * adjacent squares; no shadow-casting.  Without it a corridor hero "could
 * see" down the row into a room, so pets' in_masters_sight (dogmove.c:501)
 * read true where C's is false. */
function rogue_vision(next, rmin, rmax) {
    const u = game.u;
    const rnum = ((game.level.at(u.ux, u.uy)?.roomno | 0) - ROOMOFFSET);
    const room = rnum >= 0 ? game.level.rooms?.[rnum] : null;
    if (room) {
        for (let zy = room.ly - 1; zy <= room.hy + 1; zy++) {
            rmin[zy] = room.lx - 1;
            rmax[zy] = room.hx + 1;
            for (let zx = room.lx - 1; zx <= room.hx + 1; zx++) {
                if (room.rlit) {
                    next[zy][zx] = COULD_SEE | IN_SIGHT;
                    const l = game.level.at(zx, zy);
                    if (l) l.seenv = SVALL; /* see the walls */
                } else
                    next[zy][zx] = COULD_SEE;
            }
        }
    }
    const in_door = game.level.at(u.ux, u.uy)?.typ === DOOR;
    const ylo = Math.max(u.uy - 1, 0), yhi = Math.min(u.uy + 1, ROWNO - 1);
    const xlo = Math.max(u.ux - 1, 1), xhi = Math.min(u.ux + 1, COLNO - 1);
    for (let zy = ylo; zy <= yhi; zy++) {
        if (xlo < rmin[zy]) rmin[zy] = xlo;
        if (xhi > rmax[zy]) rmax[zy] = xhi;
        for (let zx = xlo; zx <= xhi; zx++) {
            next[zy][zx] = COULD_SEE | IN_SIGHT;
            if (in_door && (zx === u.ux || zy === u.uy))
                newsym(zx, zy);
        }
    }
}

export function vision_recalc(control = 0) {
    const u = game.u;
    if (!u || !game.level)
        return;
    _visionTrace('entry', control, u, game.viz_array);
    game.vision_full_recalc = 0;
    // C vision_recalc: level construction/restoration and end-game shutdown
    // must not touch the visibility buffers after clearing the pending request.
    if (game.in_mklev || game.program_state.in_getlev || !game.iflags.vision_inited)
        return;
    // Swap to unused buffer
    const next = game.active_buf === 0 ? cs_buf1 : cs_buf0;
    const next_rmin = game.active_buf === 0 ? cs_rmin1 : cs_rmin0;
    const next_rmax = game.active_buf === 0 ? cs_rmax1 : cs_rmax0;
    for (let y = 0; y < ROWNO; y++) {
        next[y].fill(0);
        next_rmin[y] = COLNO;
        next_rmax[y] = 0;
    }
    // ── C ref: vision.c:548-582, the `else if (Blind)` arm of vision_recalc ──
    // This file's header still says it is a "stripped-down port … no blindness
    // handling", and that gap was invisible for as long as nothing in js/ ever
    // wand-explosion flash), so the arm has to exist or the hero goes blind
    // with a fully-lit remembered map.
    //
    // C, verbatim in shape:
    //     view_from(u.uy, u.ux, next_array, next_rmin, next_rmax, 0, NULL, NULL);
    //     temp_array = gv.viz_array;  gv.viz_array = next_array;
    //     for (row …) { start = min(gv.viz_rmin[row], next_rmin[row]);
    //                   stop  = max(gv.viz_rmax[row], next_rmax[row]);
    //                   for (col = start; col <= stop; col++)
    //                       if (old_row[col] & IN_SIGHT) newsym(col, row); }
    //     goto skip;
    // The COULD_SEE raycast still runs — C's own comment says it is kept "even
    // when blind so that monsters can see you" — but NOTHING sets IN_SIGHT, so
    // cansee() is false everywhere from here on.  The update loop is C's own
    // reduced version: only cells that WERE in sight need repainting, and each
    // such newsym() falls into display.c:1116-1123's out-of-sight remembered
    // branch, which demotes S_room → S_darkroom (js/display.js
    // (CLR_BLACK) from step 842 on, the port painted ESC[0m.
    // `goto skip` skips the normal IN_SIGHT/update loops but NOT the shared
    // tail (newsym(u.ux,u.uy) + installing next_rmin/next_rmax), so both are
    // reproduced below.  No RNG on any of it.
    const see_nothing = (control === 2) || !!(u.uswallow | 0);
    if (!see_nothing && Blind()) {
        view_from(u.uy, u.ux, next, next_rmin, next_rmax);
        const old_array = game.viz_array;
        const old_rmin = game._viz_rmin;
        const old_rmax = game._viz_rmax;
        game.viz_array = next;
        game.active_buf = game.active_buf === 0 ? 1 : 0;
        if (old_array) {
            for (let row = 0; row < ROWNO; row++) {
                const old_row = old_array[row];
                if (!old_row)
                    continue;
                const start = old_rmin
                    ? Math.min(old_rmin[row], next_rmin[row]) : next_rmin[row];
                const stop = old_rmax
                    ? Math.max(old_rmax[row], next_rmax[row]) : next_rmax[row];
                for (let col = start; col <= stop; col++)
                    if (old_row[col] & IN_SIGHT)
                        newsym(col, row);
            }
        }
        /* C vision.c:838 `skip:` tail — "Make sure the hero shows up!" */
        if ((u.ux | 0) > 0)
            newsym(u.ux | 0, u.uy | 0);
        game._viz_rmin = next_rmin;
        game._viz_rmax = next_rmax;
        _visionTrace('exit', control, u, game.viz_array);
        return;
    }
    if (!see_nothing) {
        // C ref: vision.c:608-623 — if the hero is in a pit, vision is reduced to
        // the immediate 3x3 box (each square IN_SIGHT|COULD_SEE) instead of the
        // normal view_from raycast: a pit-trapped hero can only see adjacent
        // locations.  TT_PIT = 2 (const.js).  Out-of-sight room squares then fall
        // through to the remembered/dark-room glyph (display.c:243-248), so a dark
        // room that was fully visible before the dig shows only its 3x3 lit core
        // scope; keep the normal view_from for every non-pit hero.
        if (u.utrap && (u.utraptype | 0) === 2 /* TT_PIT */) {
            for (let row = (u.uy | 0) - 1; row <= (u.uy | 0) + 1; row++) {
                if (row < 0) continue;
                if (row >= ROWNO) break;
                next_rmin[row] = Math.max(1, (u.ux | 0) - 1);
                next_rmax[row] = Math.min(COLNO - 1, (u.ux | 0) + 1);
                for (let col = next_rmin[row]; col <= next_rmax[row]; col++)
                    next[row][col] = IN_SIGHT | COULD_SEE;
            }
        } else if (Is_rogue_level(u.uz)) {
            rogue_vision(next, next_rmin, next_rmax);
        } else {
            view_from(u.uy, u.ux, next, next_rmin, next_rmax);
        }
    }
    /* C ref: vision.c:701-702 — "Set the correct bits for all light sources."
     * Runs on the array still being BUILT, before it is installed as
     * gv.viz_array, and after the Blind arm's `goto skip` (which is why the
     * blind return above precedes it).  do_light_sources ORs TEMP_LIT into
     * every square a mobile light source reaches. */
    do_light_sources(next);

    // Compute IN_SIGHT from COULD_SEE + lighting
    const level = game.level;
    const ux = u.ux, uy = u.uy;
    for (let row = 0; row < ROWNO; row++) {
        const dy = Math.sign(uy - row);
        for (let col = next_rmin[row]; col <= next_rmax[row]; col++) {
            if (!(next[row][col] & COULD_SEE))
                continue;
            const loc = level?.at(col, row);
            if (!loc)
                continue;
            // Night vision: adjacent cells always IN_SIGHT
            /* C vision.c:648-669 night-vision loop: start = max(1, u.ux - range),
             * so column 0 (never isok) is never given IN_SIGHT here. */
            if (col >= 1 && Math.abs(col - ux) <= 1 && Math.abs(row - uy) <= 1) {
                next[row][col] |= IN_SIGHT;
                continue;
            }
            // Lit cells.  C ref: vision.c:755-756 — `lev->lit ||
            // (next_row[col] & TEMP_LIT)`: a square lit by a mobile light
            // source counts exactly as a permanently lit one.
            if (loc.lit || (next[row][col] & TEMP_LIT)) {
                if ((loc.typ === DOOR || loc.typ === SDOOR || IS_WALL(loc.typ))
                    && !viz_clear[row]?.[col]) {
                    // Walls/doors: only IN_SIGHT if adjacent cell toward hero is lit
                    const dx = Math.sign(ux - col);
                    const flev = level?.at(col + dx, row + dy);
                    /* C vision.c:771-772 `flev->lit
                     *     || next_array[row + dy][col + dx] & TEMP_LIT` */
                    if (flev?.lit || (next[row + dy]?.[col + dx] & TEMP_LIT)) {
                        next[row][col] |= IN_SIGHT;
                    }
                }
                else {
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
            if (start > stop)
                continue;
            const dy = Math.sign(uy - row);
            for (let col = start; col <= stop; col++) {
                const nv = next_row[col];
                const ov = old_row[col];
                const loc = game.level.at(col, row);
                if (!loc)
                    continue;
                if (nv & IN_SIGHT) {
                    const oldseenv = loc.seenv || 0;
                    const sv = seenv_matrix[dy + 1][(col < ux) ? 0 : (col > ux ? 2 : 1)];
                    loc.seenv = (loc.seenv || 0) | sv;
                    if (!(ov & IN_SIGHT) || oldseenv !== loc.seenv) {
                        newsym(col, row);
                    }
                }
                else if ((nv & COULD_SEE) && (loc.lit || (nv & TEMP_LIT))) {
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
                    }
                    else {
                        next_row[col] |= IN_SIGHT;
                        const oldseenv = loc.seenv || 0;
                        const sv = seenv_matrix[dy + 1][(col < ux) ? 0 : (col > ux ? 2 : 1)];
                        loc.seenv = (loc.seenv || 0) | sv;
                        if (!(ov & IN_SIGHT) || oldseenv !== loc.seenv)
                            newsym(col, row);
                    }
                }
                else if ((nv & COULD_SEE) && loc.waslit) {
                    loc.waslit = 0;
                    newsym(col, row);
                }
                else {
                    if ((ov & IN_SIGHT)
                        || ((nv & COULD_SEE) ^ (ov & COULD_SEE))) {
                        if (col !== 0)
                            newsym(col, row);
                    }
                }
            }
        }
        if (ux > 0)
            newsym(ux, uy);
    }
    game._viz_rmin = next_rmin;
    game._viz_rmax = next_rmax;
    _visionTrace('exit', control, u, game.viz_array);
}
// C ref: vision.c:1602 clear_path(col1, row1, col2, row2)
// m_cansee(mtmp, x2, y2) expands to clear_path(mtmp->mx, mtmp->my, x2, y2)
// Parameters: col1/row1 = source (column, row); col2/row2 = target (column, row)
export function clear_path(col1, row1, col2, row2) {
    if (col1 < col2) {
        if (row1 > row2) {
            return q1_path(row1, col1, row2, col2);
        } else {
            return q4_path(row1, col1, row2, col2);
        }
    } else {
        if (row1 > row2) {
            return q2_path(row1, col1, row2, col2);
        } else if (row1 === row2 && col1 === col2) {
            return 1;
        } else {
            return q3_path(row1, col1, row2, col2);
        }
    }
}
// C ref: cansee(x, y)
export function cansee(x, y) {
    if (y < 0 || y >= ROWNO || x < 0 || x >= COLNO)
        return false;
    return !!(game.viz_array?.[y]?.[x] & IN_SIGHT);
}
// Read-only snapshot for optional input-boundary diagnostics. Coordinates are
// map coordinates, including column zero; rows are indexed by map y.
export function vision_debug_snapshot() {
    const copy = (grid) => Array.from({ length: ROWNO }, (_, y) =>
        Array.from({ length: COLNO }, (_, x) => grid?.[y]?.[x] ?? 0));
    const cells = [];
    if (typeof process !== 'undefined' && ENV?.FF_VISION_TRACE === '1') {
        const spec = ENV.FF_VISION_TRACE_CELLS || '40,3;41,3;42,3;39,4;40,4;42,4;43,4';
        for (const token of spec.split(';')) {
            const m = token.match(/^(\d+),(\d+)$/);
            if (!m) continue;
            const x = Number(m[1]), y = Number(m[2]), loc = game.level?.at?.(x, y);
            const bits = game.viz_array?.[y]?.[x] | 0;
            cells.push({ x, y, bits, inSight: !!(bits & IN_SIGHT), couldSee: !!(bits & COULD_SEE),
                typ: loc?.typ ?? null, flags: loc?.flags ?? null, seenv: loc?.seenv ?? null,
                remembered: loc?.remembered_glyph?.ch ?? null,
                newsym: (game.__vision_trace_newsym || []).filter((p) => p[0] === x && p[1] === y).length });
        }
    }
    const nonzero = [];
    for (let y = 0; y < ROWNO; y++) for (let x = 0; x < COLNO; x++)
        if (game.viz_array?.[y]?.[x]) nonzero.push([x, y]);
    const out = {
        hero: [game.u?.ux ?? null, game.u?.uy ?? null],
        rows: copy(game.viz_array).map((row) => row.map((v) => v.toString(16)).join('')),
        clear: copy(viz_clear).map((row) => row.join('')),
        left: copy(left_ptrs), right: copy(right_ptrs),
        uinwater: !!game.u?.uinwater,
        vizExtent: nonzero.length ? { minX: Math.min(...nonzero.map((p) => p[0])), maxX: Math.max(...nonzero.map((p) => p[0])), minY: Math.min(...nonzero.map((p) => p[1])), maxY: Math.max(...nonzero.map((p) => p[1])) } : null,
        cells,
    };
    if (typeof process !== 'undefined' && ENV?.FF_VISION_TRACE === '1') game.__vision_trace_newsym = [];
    return out;
}
// C ref: couldsee(x, y)
export function couldsee(x, y) {
    if (y < 0 || y >= ROWNO || x < 0 || x >= COLNO)
        return false;
    return !!(game.viz_array?.[y]?.[x] & COULD_SEE);
}

/* C vision.c howmonseen: independent sensing channels, using the same
 * display predicates as map rendering. */
export function howmonseen(mon) {
    if (!mon) return 0;
    const u = game.u || {};
    const prop = (which) => u.uprops?.[which] || {};
    const dist = ((mon.mx | 0) - (u.ux | 0)) ** 2 + ((mon.my | 0) - (u.uy | 0)) ** 2;
    const canSeeMon = canseemon(mon);
    const infra = see_with_infrared(mon);
    let how = 0;
    /* Normal sight requires both geometric visibility predicates; canseemon
       alone also admits infravision and astral/xray visibility. */
    if ((mon.wormno ? worm_known(mon)
        : cansee(mon.mx | 0, mon.my | 0) && couldsee(mon.mx | 0, mon.my | 0))
        && mon_visible(mon) && !mon.minvis)
        how |= MONSEEN_NORMAL;
    if (canSeeMon && mon.minvis)
        how |= MONSEEN_SEEINVIS;
    const seeP = prop(SEE_INVIS);
    if ((!mon.minvis || seeP.intrinsic || seeP.extrinsic) && infra)
        how |= MONSEEN_INFRAVIS;
    if (tp_sensemon(mon))
        how |= MONSEEN_TELEPAT;
    const xr = u.xray_range == null ? -1 : (u.xray_range | 0);
    if (canSeeMon && xr > 0 && dist <= xr * xr)
        how |= MONSEEN_XRAYVIS;
    const detectP = prop(DETECT_MONSTERS);
    if ((detectP.intrinsic | 0) || (detectP.extrinsic | 0))
        how |= MONSEEN_DETECT;
    if (MATCH_WARN_OF_MON(mon))
        how |= MONSEEN_WARNMON;
    return how;
}
// C ref: vision.c:853 block_point(x, y) — make the location opaque to light.
// C ref: vision.c:887 unblock_point(x, y) — make the location transparent.
// In C these incrementally edit the viz_clear/left_ptrs/right_ptrs arrays via
// fill_point()/dig_point().  Our JS viz_clear is a pure function of the level
// grid (rebuilt wholesale by vision_reset from _blocks()), so a single
// vision_reset() reproduces the same final block state as the incremental
// C edit.  Both fns then set vision_full_recalc if the cell was could-see
// (C: "if (viz_array[y][x]) vision_full_recalc = 1") so the next vision_recalc
// re-derives visibility through the now-changed cell.
function _block_or_unblock(x, y) {
    if (game.level && y >= 0 && y < ROWNO)
        _vision_rebuild_row(game.level, y);
    if (game.viz_array?.[y]?.[x]) {
        game.vision_full_recalc = 1;
        if (typeof process !== 'undefined' && ENV?.FF_DISPLAY_TRACE === '1') {
            const frames = String(new Error().stack || '').split('\n').slice(2, 5)
                .map((s) => s.trim().replace(/^at\s+/, '').replace(/\s+\([^)]*\)$/, '')).join('|');
            pushRngLogEntry(`^vision_dirty[x=${x | 0} y=${y | 0} moves=${game.moves | 0} viz=1 stack=${frames}]`);
        }
    }
}
export function block_point(x, y) {
    _block_or_unblock(x, y);
}
export function unblock_point(x, y) {
    _block_or_unblock(x, y);
}
// C ref: vision.c:900 recalc_block_point — block or unblock per does_block().
// _blocks() is JS's does_block(): walls/stone/closed doors block, open doors
// don't branch here; we just rebuild and flag.
export function recalc_block_point(x, y) {
    _block_or_unblock(x, y);
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
    game.vis_func = null;
    game.vis_varg = null;
}

// C ref: vision_init() — one-time vision initialization
export function vision_init() {
    // Set up row pointers (C: cs_rows0[i] = could_see[0][i], etc.)
    // In JS, we use buffers directly so row-pointer arrays are not needed.
    // viz_clear_rows[i] = viz_clear[i] — also not needed in JS.

    // Start out with cs0 as our current array
    game.viz_array = cs_buf0;
    game._viz_rmin = cs_rmin0;
    game._viz_rmax = cs_rmax0;

    game.vision_full_recalc = 0;

    // memset could_see to 0
    for (let i = 0; i < ROWNO; i++) {
        cs_buf0[i].fill(0);
        cs_buf1[i].fill(0);
    }

    // view_init() — no-op in C
}
