// wall_state.js — C display.c set_wall_state / xy_set_wall_state (wall_info / WM_*).
// Called from mklev.c level_finalize_topology after rooms and corridors exist.

import { game } from './gstate.js';
import {
    COLNO, ROWNO, isok,
    VWALL, HWALL, SDOOR, TLCORNER, TRCORNER, BLCORNER, BRCORNER,
    CROSSWALL, TUWALL, TDWALL, TLWALL, TRWALL,
    CORR, SCORR,
    IS_STWALL, IS_SDOOR,
    WM_MASK,
    WM_W_LEFT, WM_W_RIGHT, WM_W_TOP, WM_W_BOTTOM,
    WM_T_LONG, WM_T_BL, WM_T_BR,
    WM_X_TL, WM_X_TR, WM_X_BL, WM_X_BR, WM_X_TLBR, WM_X_BLTR,
    WM_C_OUTER, WM_C_INNER,
} from './const.js';

/** C: display.c check_pos — unfinished exterior (rock/corr/sdoor). */
function checkPos(x, y, which) {
    if (!isok(x, y)) return which;
    const loc = game.level?.at(x, y);
    if (!loc) return 0;
    const type = loc.typ | 0;
    if (IS_STWALL(type) || type === CORR || type === SCORR || IS_SDOOR(type)) return which;
    return 0;
}

function moreThanOne(a, b, c) {
    return ((a && (b | c)) || (b && (a | c)) || (c && (a | b))) !== 0;
}

/** C: display.c set_twall */
function setTwall(x0, y0, x1, y1, x2, y2, x3, y3) {
    const is1 = checkPos(x1, y1, WM_T_LONG);
    const is2 = checkPos(x2, y2, WM_T_BL);
    const is3 = checkPos(x3, y3, WM_T_BR);
    if (moreThanOne(is1, is2, is3)) return 0;
    return (is1 + is2 + is3) | 0;
}

/** C: display.c set_wall */
function setWall(x, y, horiz) {
    let is1;
    let is2;
    if (horiz) {
        is1 = checkPos(x, y - 1, WM_W_TOP);
        is2 = checkPos(x, y + 1, WM_W_BOTTOM);
    } else {
        is1 = checkPos(x - 1, y, WM_W_LEFT);
        is2 = checkPos(x + 1, y, WM_W_RIGHT);
    }
    if (moreThanOne(is1, is2, 0)) return 0;
    return (is1 + is2) | 0;
}

/** C: display.c set_corn */
function setCorn(x1, y1, x2, y2, x3, y3, x4, y4) {
    const is1 = checkPos(x1, y1, 1);
    const is2 = checkPos(x2, y2, 1);
    const is3 = checkPos(x3, y3, 1);
    const is4 = checkPos(x4, y4, 1);
    if (is4) return WM_C_INNER;
    if (is1 && is2 && is3) return WM_C_OUTER;
    return 0;
}

/** C: display.c set_crosswall */
function setCrosswall(x, y) {
    const is1 = checkPos(x - 1, y - 1, 1);
    const is2 = checkPos(x + 1, y - 1, 1);
    const is3 = checkPos(x + 1, y + 1, 1);
    const is4 = checkPos(x - 1, y + 1, 1);
    let wmode = (is1 + is2 + is3 + is4) | 0;
    if (wmode > 1) {
        if (is1 && is3 && (is2 + is4 === 0)) wmode = WM_X_TLBR;
        else if (is2 && is4 && (is1 + is3 === 0)) wmode = WM_X_BLTR;
        else wmode = 0;
    } else if (is1) wmode = WM_X_TL;
    else if (is2) wmode = WM_X_TR;
    else if (is3) wmode = WM_X_BR;
    else if (is4) wmode = WM_X_BL;
    return wmode;
}

/**
 * C: display.c xy_set_wall_state — set lev->wall_info WM_* for one cell.
 * @param {number} x
 * @param {number} y
 */
export function xySetWallStateLikeC(x, y) {
    const lvl = game.level;
    if (!lvl) return;
    const loc = lvl.at(x, y);
    if (!loc) return;
    let wmode = -1;
    switch (loc.typ | 0) {
    case SDOOR:
        wmode = setWall(x, y, loc.horizontal ? 1 : 0);
        break;
    case VWALL:
        wmode = setWall(x, y, 0);
        break;
    case HWALL:
        wmode = setWall(x, y, 1);
        break;
    case TDWALL:
        wmode = setTwall(x, y, x, y - 1, x - 1, y + 1, x + 1, y + 1);
        break;
    case TUWALL:
        wmode = setTwall(x, y, x, y + 1, x + 1, y - 1, x - 1, y - 1);
        break;
    case TLWALL:
        wmode = setTwall(x, y, x + 1, y, x - 1, y - 1, x - 1, y + 1);
        break;
    case TRWALL:
        wmode = setTwall(x, y, x - 1, y, x + 1, y + 1, x + 1, y - 1);
        break;
    case TLCORNER:
        wmode = setCorn(x - 1, y - 1, x, y - 1, x - 1, y, x + 1, y + 1);
        break;
    case TRCORNER:
        wmode = setCorn(x, y - 1, x + 1, y - 1, x + 1, y, x - 1, y + 1);
        break;
    case BLCORNER:
        wmode = setCorn(x, y + 1, x - 1, y + 1, x - 1, y, x + 1, y - 1);
        break;
    case BRCORNER:
        wmode = setCorn(x + 1, y, x + 1, y + 1, x, y + 1, x - 1, y - 1);
        break;
    case CROSSWALL:
        wmode = setCrosswall(x, y);
        break;
    default:
        break;
    }
    if (wmode >= 0) {
        loc.wall_info = ((loc.wall_info | 0) & ~WM_MASK) | wmode;
    }
}

/** C: display.c set_wall_state — scan level and set wall_info on all walls. */
export function setWallStateLikeC() {
    const lvl = game.level;
    if (!lvl) return;
    for (let x = 0; x < COLNO; x++) {
        for (let y = 0; y < ROWNO; y++) {
            xySetWallStateLikeC(x, y);
        }
    }
}
