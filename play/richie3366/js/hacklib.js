// hacklib.js — Utility functions.
// C ref: hacklib.c, dungeon.c helpers

import { game } from './gstate.js';

export function isok(x, y) {
    const { COLNO, ROWNO } = await_const();
    return x >= 1 && x <= COLNO - 1 && y >= 0 && y <= ROWNO - 1;
}

// Lazy import to avoid circular deps
let _const = null;
function await_const() {
    if (!_const) _const = { COLNO: 80, ROWNO: 21 };
    return _const;
}

export function distmin(x1, y1, x2, y2) {
    return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2));
}

export function dist2(x1, y1, x2, y2) {
    return (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);
}

/** C ref: hacklib.c online2 — orthogonal or diagonal line. */
export function online2(x0, y0, x1, y1) {
    const dx = x0 - x1;
    const dy = y0 - y1;
    return !dy || !dx || dy === dx || dy === -dx;
}

export function depth(uz) {
    const dnum = uz?.dnum ?? 0;
    const dlevel = uz?.dlevel ?? 1;
    const dungeon = game?.dungeons?.[dnum];
    if (!dungeon) return dlevel;
    return (dungeon.depth_start || 1) + dlevel - 1;
}

/**
 * C ref: dungeon.c builds_up — multi-level dungeon entered at bottom, or
 * single-level branch with end1_up parent connection.
 */
export function builds_up(uz) {
    const lev = uz || game?.u?.uz;
    if (!lev) return false;
    const dptr = game?.dungeons?.[lev.dnum | 0];
    if (!dptr) return false;
    if ((dptr.num_dunlevs | 0) > 1)
        return (dptr.entry_lev | 0) === (dptr.num_dunlevs | 0);
    for (const br of game.branches || []) {
        if (br?.end2
            && (br.end2.dnum | 0) === (lev.dnum | 0)
            && (br.end2.dlevel | 0) === (lev.dlevel | 0))
            return !!br.end1_up;
    }
    return false;
}

/**
 * C ref: dungeon.c level_difficulty — depth, with builds_up adjustment.
 * Named omissions: In_endgame sanctum+ulevel/2; amulet deepest_lev_reached;
 * W_tower #if0 arm.
 */
export function level_difficulty(uz) {
    const lev = uz || game?.u?.uz;
    let res = depth(lev) || 1;
    if (builds_up(lev)) {
        const dptr = game?.dungeons?.[lev.dnum | 0];
        res += 2 * ((dptr?.entry_lev | 0) - (lev.dlevel | 0) + 1);
    }
    return res;
}

// C ref: rn2(x) already in rng.js — re-export not needed
