// selection.js — C selvar.c selection subset (sp_lev ensure_way_out floodfill).
// C ref: selvar.c selection_new/free/getpoint/setpoint/clone/floodfill/rndcoord.

import { COLNO, ROWNO, isok } from './const.js';
import { rn2 } from './rng.js';

/** @typedef {{ wid: number, hei: number, map: Uint8Array, bounds: { lx: number, ly: number, hx: number, hy: number }, boundsDirty: boolean }} SelectionVar */

/** @type {((x: number, y: number) => number)|null} */
let selectionFloodCheckFn = null;

/** C: selvar.c selection_new */
export function selectionNewLikeC() {
    const map = new Uint8Array(COLNO * ROWNO);
    map.fill(1);
    return {
        wid: COLNO,
        hei: ROWNO,
        map,
        bounds: { lx: COLNO, ly: ROWNO, hx: 0, hy: 0 },
        boundsDirty: false,
    };
}

/** @param {SelectionVar|null|undefined} sel @param {boolean} freeSel */
export function selectionFreeLikeC(sel, freeSel) {
    void freeSel;
    void sel;
}

/** @param {SelectionVar} sel */
function selectionRecalcBoundsLikeC(sel) {
    if (!sel.boundsDirty) return;
    let lx = COLNO;
    let ly = ROWNO;
    let hx = 0;
    let hy = 0;
    for (let x = 0; x < sel.wid; x++) {
        for (let y = 0; y < sel.hei; y++) {
            if (selectionGetpointLikeC(x, y, sel)) {
                if (x < lx) lx = x;
                if (y < ly) ly = y;
                if (x > hx) hx = x;
                if (y > hy) hy = y;
            }
        }
    }
    sel.bounds = { lx, ly, hx, hy };
    sel.boundsDirty = false;
}

/** @param {SelectionVar} sel */
function selectionGetBoundsLikeC(sel) {
    selectionRecalcBoundsLikeC(sel);
    return sel.bounds;
}

/** C: selvar.c selection_getpoint */
export function selectionGetpointLikeC(x, y, sel) {
    if (!sel?.map || x < 0 || y < 0 || x >= sel.wid || y >= sel.hei) return 0;
    return (sel.map[sel.wid * y + x] | 0) - 1;
}

/** C: selvar.c selection_setpoint */
export function selectionSetpointLikeC(x, y, sel, c) {
    if (!sel?.map || x < 0 || y < 0 || x >= sel.wid || y >= sel.hei) return;
    const v = (c | 0) + 1;
    if (c && !sel.boundsDirty) {
        const b = sel.bounds;
        if (b.lx > x) b.lx = x;
        if (b.ly > y) b.ly = y;
        if (b.hx < x) b.hx = x;
        if (b.hy < y) b.hy = y;
    } else if (sel.map[sel.wid * y + x] !== 0) {
        sel.boundsDirty = true;
    }
    sel.map[sel.wid * y + x] = v;
}

/** C: selvar.c selection_clone */
export function selectionCloneLikeC(sel) {
    const c = selectionNewLikeC();
    c.map.set(sel.map);
    c.bounds = { ...sel.bounds };
    c.boundsDirty = sel.boundsDirty;
    return c;
}

/** C: sp_lev.c set_selection_floodfillchk */
export function setSelectionFloodfillchkLikeC(fn) {
    selectionFloodCheckFn = fn;
}

/** @param {number} x @param {number} y @param {number[]} dx @param {number[]} dy @param {number} n */
function selFloodHavepointLikeC(x, y, dx, dy, n) {
    for (let i = 0; i < n; i++) {
        if (dx[i] === x && dy[i] === y) return true;
    }
    return false;
}

/**
 * C: selvar.c selection_floodfill
 * @param {SelectionVar} ov
 * @param {number} x
 * @param {number} y
 * @param {boolean} diagonals
 */
export function selectionFloodfillLikeC(ov, x, y, diagonals) {
    const chk = selectionFloodCheckFn;
    if (!chk) return;
    const tmp = selectionNewLikeC();
    const dx = [];
    const dy = [];
    let idx = 0;
    const push = (nx, ny) => {
        if (idx < COLNO * ROWNO) {
            dx[idx] = nx;
            dy[idx] = ny;
            idx++;
        }
    };
    push(x | 0, y | 0);
    while (idx > 0) {
        idx--;
        const cx = dx[idx];
        const cy = dy[idx];
        if (isok(cx, cy)) {
            selectionSetpointLikeC(cx, cy, ov, 1);
            selectionSetpointLikeC(cx, cy, tmp, 1);
        }
        const tryDir = (mx, my) => {
            if (!isok(mx, my)) return;
            if (!chk(mx, my)) return;
            if (selectionGetpointLikeC(mx, my, tmp)) return;
            if (selFloodHavepointLikeC(mx, my, dx, dy, idx)) return;
            push(mx, my);
        };
        tryDir(cx + 1, cy);
        tryDir(cx - 1, cy);
        tryDir(cx, cy + 1);
        tryDir(cx, cy - 1);
        if (diagonals) {
            tryDir(cx + 1, cy + 1);
            tryDir(cx - 1, cy - 1);
            tryDir(cx - 1, cy + 1);
            tryDir(cx + 1, cy - 1);
        }
    }
    selectionFreeLikeC(tmp, true);
}

/** C: selvar.c `selection_do_grow` with **`W_ANY`** — one-step 8-neighbor dilation. */
export function selectionDilate8LikeC(ov) {
    if (!ov?.map) return;
    const rect = { lx: COLNO, ly: ROWNO, hx: 0, hy: 0 };
    for (let x = 0; x < ov.wid; x++) {
        for (let y = 0; y < ov.hei; y++) {
            if (selectionGetpointLikeC(x, y, ov)) {
                if (x < rect.lx) rect.lx = x;
                if (y < rect.ly) rect.ly = y;
                if (x > rect.hx) rect.hx = x;
                if (y > rect.hy) rect.hy = y;
            }
        }
    }
    if (rect.lx > rect.hx) return;
    const tmp = selectionCloneLikeC(ov);
    const x0 = Math.max(0, rect.lx - 1);
    const y0 = Math.max(0, rect.ly - 1);
    const x1 = Math.min(ov.wid - 1, rect.hx + 1);
    const y1 = Math.min(ov.hei - 1, rect.hy + 1);
    for (let x = x0; x <= x1; x++) {
        for (let y = y0; y <= y1; y++) {
            let hit = false;
            for (let dy = -1; dy <= 1 && !hit; dy++) {
                for (let dx = -1; dx <= 1 && !hit; dx++) {
                    if (!dx && !dy) continue;
                    const nx = x + dx;
                    const ny = y + dy;
                    if (nx >= 0 && ny >= 0 && nx < ov.wid && ny < ov.hei
                        && selectionGetpointLikeC(nx, ny, ov)) hit = true;
                }
            }
            if (hit) selectionSetpointLikeC(x, y, tmp, 1);
        }
    }
    for (let x = 0; x < ov.wid; x++) {
        for (let y = 0; y < ov.hei; y++) {
            if (selectionGetpointLikeC(x, y, tmp)) selectionSetpointLikeC(x, y, ov, 1);
        }
    }
}

export function selectionRndcoordLikeC(ov, removeit) {
    const rect = selectionGetBoundsLikeC(ov);
    let idx = 0;
    for (let dx = rect.lx; dx <= rect.hx; dx++) {
        for (let dy = rect.ly; dy <= rect.hy; dy++) {
            if (selectionGetpointLikeC(dx, dy, ov)) idx++;
        }
    }
    if (!idx) return null;
    let c = rn2(idx);
    for (let dx = rect.lx; dx <= rect.hx; dx++) {
        for (let dy = rect.ly; dy <= rect.hy; dy++) {
            if (selectionGetpointLikeC(dx, dy, ov)) {
                if (!c) {
                    if (removeit) selectionSetpointLikeC(dx, dy, ov, 0);
                    return { x: dx, y: dy };
                }
                c--;
            }
        }
    }
    return null;
}
