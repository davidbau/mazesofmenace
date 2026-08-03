// selvar.js — the special-level "selection" (set-of-map-cells) engine.
// C ref: src/selvar.c plus the Lua-binding argument handling in src/nhlsel.c.
//
// A selection is a COLNO x ROWNO bitmap with a cached bounding rectangle.  The
// bounds cache is NOT just an optimisation: several operations
// (selection_filter_percent, selection_rndcoord, selection_iterate,
// selection_numpoints) only scan inside the cached bounds, so the cache's exact
// staleness rules decide how many rn2() calls a filter draws.  They are
// reproduced here verbatim.

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { COLNO, ROWNO, MAX_TYPE, MATCH_WALL, IS_STWALL, isok } from './const.js';

// C ref: sp_lev.h — direction bitmask used by selection_do_grow / mazewalk.
export const W_RANDOM = -1;
export const W_NORTH = 1;
export const W_SOUTH = 2;
export const W_EAST = 4;
export const W_WEST = 8;
export const W_ANY = W_NORTH | W_SOUTH | W_EAST | W_WEST;

// C ref: sp_lev.c random_wdir() — one rn2(4) over {N,S,E,W} in that order.
export function random_wdir() {
    const wdirs = [W_NORTH, W_SOUTH, W_EAST, W_WEST];
    return wdirs[rn2(4)];
}

// C ref: sp_lev.c match_maptyps() — 'w' (MATCH_WALL) matches any IS_STWALL
// cell; MAX_TYPE ('x', "see-through") matches anything; otherwise exact typ.
export function match_maptyps(typ, levltyp) {
    if (typ === MATCH_WALL && !IS_STWALL(levltyp)) return false;
    if (typ < MAX_TYPE && typ !== levltyp) return false;
    return true;
}

// C ref: struct selectionvar.  map[] stores (value + 1), so a freshly
// allocated (memset 1) selection reads back as all-zero/empty.
export class Selection {
    constructor() {
        this.wid = COLNO;
        this.hei = ROWNO;
        this.map = new Uint8Array(COLNO * ROWNO).fill(1);
        this.bounds = { lx: COLNO, ly: ROWNO, hx: 0, hy: 0 };
        this.bounds_dirty = false;
    }
}

export function selection_new() {
    return new Selection();
}

export function selection_clone(sel) {
    const t = new Selection();
    t.wid = sel.wid;
    t.hei = sel.hei;
    t.bounds = { ...sel.bounds };
    t.bounds_dirty = sel.bounds_dirty;
    t.map = Uint8Array.from(sel.map);
    return t;
}

// C ref: selvar.c selection_clear() — memset(1 + val); bounds go full-map for
// val != 0 and "empty" for val == 0.
export function selection_clear(sel, val) {
    sel.map.fill(1 + (val ? 1 : 0));
    if (val) {
        sel.bounds = { lx: 0, ly: 0, hx: COLNO - 1, hy: ROWNO - 1 };
    } else {
        sel.bounds = { lx: COLNO, ly: ROWNO, hx: 0, hy: 0 };
    }
    sel.bounds_dirty = false;
    return sel;
}

export function selection_getpoint(x, y, sel) {
    if (!sel || !sel.map) return 0;
    if (x < 0 || y < 0 || x >= sel.wid || y >= sel.hei) return 0;
    return sel.map[sel.wid * y + x] - 1;
}

// C ref: selvar.c selection_setpoint().  Setting a point grows the cached
// bounds only while the cache is still clean; ANY other write dirties it
// (map[] never holds 0, so C's `map[i] != 0` test is always true there).
export function selection_setpoint(x, y, sel, c) {
    if (!sel || !sel.map) return;
    if (x < 0 || y < 0 || x >= sel.wid || y >= sel.hei) return;
    const v = c ? 1 : 0;
    if (v && !sel.bounds_dirty) {
        if (sel.bounds.lx > x) sel.bounds.lx = x;
        if (sel.bounds.ly > y) sel.bounds.ly = y;
        if (sel.bounds.hx < x) sel.bounds.hx = x;
        if (sel.bounds.hy < y) sel.bounds.hy = y;
    } else {
        sel.bounds_dirty = true;
    }
    sel.map[sel.wid * y + x] = v + 1;
}

// C ref: selvar.c selection_recalc_bounds().  Note the C quirk faithfully kept
// here: for a selection that turned out to be EMPTY, `sel->bounds = r` is
// inside the `if (r.lx > -1)` guard, so bounds are left at the sentinel
// {COLNO, ROWNO, 0, 0} — which selection_getbounds() then reports as the WHOLE
// map, not as an empty rect.
export function selection_recalc_bounds(sel) {
    if (!sel.bounds_dirty) return;

    sel.bounds = { lx: COLNO, ly: ROWNO, hx: 0, hy: 0 };
    const r = { lx: -1, ly: -1, hx: -1, hy: -1 };

    for (let x = 0; x < sel.wid; x++) {
        for (let y = 0; y < sel.hei; y++)
            if (selection_getpoint(x, y, sel)) { r.lx = x; break; }
        if (r.lx > -1) break;
    }

    if (r.lx > -1) {
        for (let x = sel.wid - 1; x >= r.lx; x--) {
            for (let y = 0; y < sel.hei; y++)
                if (selection_getpoint(x, y, sel)) { r.hx = x; break; }
            if (r.hx > -1) break;
        }
        for (let y = 0; y < sel.hei; y++) {
            for (let x = r.lx; x <= r.hx; x++)
                if (selection_getpoint(x, y, sel)) { r.ly = y; break; }
            if (r.ly > -1) break;
        }
        for (let y = sel.hei - 1; y >= r.ly; y--) {
            for (let x = r.lx; x <= r.hx; x++)
                if (selection_getpoint(x, y, sel)) { r.hy = y; break; }
            if (r.hy > -1) break;
        }
        sel.bounds = r;
    }

    sel.bounds_dirty = false;
}

// C ref: selvar.c selection_getbounds() — the "no bounds recorded" sentinel
// (lx >= wid) means "whole map".
export function selection_getbounds(sel) {
    if (!sel) return { lx: 0, ly: 0, hx: COLNO - 1, hy: ROWNO - 1 };
    selection_recalc_bounds(sel);
    if (sel.bounds.lx >= sel.wid)
        return { lx: 0, ly: 0, hx: COLNO - 1, hy: ROWNO - 1 };
    return { ...sel.bounds };
}

// C ref: rect.c rect_bounds() — used by the &/|/~/- operators, which read the
// RAW ->bounds field (no recalc) and take their union.
function rect_bounds(r1, r2) {
    return {
        lx: Math.min(r1.lx, r2.lx),
        ly: Math.min(r1.ly, r2.ly),
        hx: Math.max(r1.hx, r2.hx),
        hy: Math.max(r1.hy, r2.hy),
    };
}

// C ref: selvar.c selection_not() — in-place negate.
export function selection_not(s) {
    for (let x = 0; x < s.wid; x++)
        for (let y = 0; y < s.hei; y++)
            selection_setpoint(x, y, s, selection_getpoint(x, y, s) ? 0 : 1);
    selection_getbounds(s);
    return s;
}

// C ref: nhlsel.c l_selection_not() — `selection.negate()` with no argument is
// a brand-new all-set selection; `sel:negate()` clones then negates.
export function l_selection_negate(sel) {
    if (!sel) return selection_clear(selection_new(), 1);
    return selection_not(selection_clone(sel));
}

// C ref: nhlsel.c l_selection_and().
export function l_selection_and(sela, selb) {
    const selr = selection_new();
    const rect = rect_bounds(sela.bounds, selb.bounds);
    for (let x = rect.lx; x <= rect.hx; x++)
        for (let y = rect.ly; y <= rect.hy; y++)
            selection_setpoint(x, y, selr,
                selection_getpoint(x, y, sela) & selection_getpoint(x, y, selb));
    return selr;
}

// C ref: nhlsel.c l_selection_or() — note it force-assigns the union rect as
// the result's bounds afterwards (no recalc).
export function l_selection_or(sela, selb) {
    const selr = selection_new();
    const rect = rect_bounds(sela.bounds, selb.bounds);
    for (let x = rect.lx; x <= rect.hx; x++)
        for (let y = rect.ly; y <= rect.hy; y++)
            selection_setpoint(x, y, selr,
                selection_getpoint(x, y, sela) | selection_getpoint(x, y, selb));
    selr.bounds = { ...rect };
    selr.bounds_dirty = false;
    return selr;
}

// C ref: selvar.c selection_filter_percent() — ONE rn2(100) per set point
// inside the current bounds.
export function selection_filter_percent(ov, percent) {
    if (!ov) return null;
    const ret = selection_new();
    const rect = selection_getbounds(ov);
    for (let x = rect.lx; x <= rect.hx; x++)
        for (let y = rect.ly; y <= rect.hy; y++)
            if (selection_getpoint(x, y, ov) && rn2(100) < percent)
                selection_setpoint(x, y, ret, 1);
    return ret;
}

// C ref: selvar.c selection_filter_mapchar().  lit == -2 (the Lua default)
// accepts unconditionally; lit == -1 draws rn2(2) per matching cell.
export function selection_filter_mapchar(ov, typ, lit = -2) {
    if (!ov) return null;
    const ret = selection_new();
    const rect = selection_getbounds(ov);
    for (let x = rect.lx; x <= rect.hx; x++)
        for (let y = rect.ly; y <= rect.hy; y++) {
            if (!selection_getpoint(x, y, ov)) continue;
            const loc = game.level?.at(x, y);
            if (!loc || !match_maptyps(typ, loc.typ)) continue;
            if (lit === -1) selection_setpoint(x, y, ret, rn2(2));
            else if (lit === 0 || lit === 1) {
                if ((loc.lit ? 1 : 0) === lit) selection_setpoint(x, y, ret, 1);
            } else selection_setpoint(x, y, ret, 1);
        }
    return ret;
}

// C ref: selvar.c selection_rndcoord() — count set points in bounds, rn2(idx),
// then walk to the idx'th one in the same column-major order.
export function selection_rndcoord(ov, removeit = false) {
    const rect = selection_getbounds(ov);
    let idx = 0;
    for (let dx = rect.lx; dx <= rect.hx; dx++)
        for (let dy = rect.ly; dy <= rect.hy; dy++)
            if (selection_getpoint(dx, dy, ov)) idx++;
    if (idx) {
        let c = rn2(idx);
        for (let dx = rect.lx; dx <= rect.hx; dx++)
            for (let dy = rect.ly; dy <= rect.hy; dy++)
                if (selection_getpoint(dx, dy, ov)) {
                    if (!c) {
                        if (removeit) selection_setpoint(dx, dy, ov, 0);
                        return { x: dx, y: dy };
                    }
                    c--;
                }
    }
    return { x: -1, y: -1 };
}

// C ref: selvar.c selection_do_grow() — dilation.  W_RANDOM draws one rn2(4);
// every other direction mask is deterministic.  Diagonal growth only happens
// when both adjacent orthogonals are in the mask.
export function selection_do_grow(ov, dir = W_ANY) {
    if (!ov) return ov;
    const tmp = selection_new();
    if (dir === W_RANDOM) dir = random_wdir();

    let rect = selection_getbounds(ov);
    const x0 = Math.max(0, rect.lx - 1), x1 = Math.min(COLNO - 1, rect.hx + 1);
    const y0 = Math.max(0, rect.ly - 1), y1 = Math.min(ROWNO - 1, rect.hy + 1);
    const NW = W_WEST | W_NORTH, NE = W_NORTH | W_EAST;
    const ES = W_EAST | W_SOUTH, SW = W_SOUTH | W_WEST;
    for (let x = x0; x <= x1; x++)
        for (let y = y0; y <= y1; y++) {
            if (((dir & W_WEST) && selection_getpoint(x + 1, y, ov))
                || ((dir & NW) === NW && selection_getpoint(x + 1, y + 1, ov))
                || ((dir & W_NORTH) && selection_getpoint(x, y + 1, ov))
                || ((dir & NE) === NE && selection_getpoint(x - 1, y + 1, ov))
                || ((dir & W_EAST) && selection_getpoint(x - 1, y, ov))
                || ((dir & ES) === ES && selection_getpoint(x - 1, y - 1, ov))
                || ((dir & W_SOUTH) && selection_getpoint(x, y - 1, ov))
                || ((dir & SW) === SW && selection_getpoint(x + 1, y - 1, ov)))
                selection_setpoint(x, y, tmp, 1);
        }

    rect = selection_getbounds(tmp);
    for (let x = rect.lx; x <= rect.hx; x++)
        for (let y = rect.ly; y <= rect.hy; y++)
            if (selection_getpoint(x, y, tmp)) selection_setpoint(x, y, ov, 1);
    return ov;
}

// C ref: nhlsel.c l_selection_grow() — clones first, so the source is untouched.
export function l_selection_grow(sel, dir = W_ANY) {
    return selection_do_grow(selection_clone(sel), dir);
}

// C ref: selvar.c selection_do_line() — Bresenham; no RNG.
export function selection_do_line(x1, y1, x2, y2, ov) {
    let xi, yi, dx, dy;
    if (x1 < x2) { xi = 1; dx = x2 - x1; } else { xi = -1; dx = x1 - x2; }
    if (y1 < y2) { yi = 1; dy = y2 - y1; } else { yi = -1; dy = y1 - y2; }

    selection_setpoint(x1, y1, ov, 1);

    if (!dx && !dy) return;
    if (dx > dy) {
        const ai = (dy - dx) * 2, bi = dy * 2;
        let d0 = bi - dx;
        do {
            if (d0 >= 0) { y1 += yi; d0 += ai; } else d0 += bi;
            x1 += xi;
            selection_setpoint(x1, y1, ov, 1);
        } while (x1 !== x2);
    } else {
        const ai = (dx - dy) * 2, bi = dx * 2;
        let d0 = bi - dy;
        do {
            if (d0 >= 0) { x1 += xi; d0 += ai; } else d0 += bi;
            y1 += yi;
            selection_setpoint(x1, y1, ov, 1);
        } while (y1 !== y2);
    }
}

// C ref: selvar.c selection_do_randline() — midpoint displacement.  Draws a
// rejection-looped rn2(rough) pair per recursion level while rough >= 2.
export function selection_do_randline(x1, y1, x2, y2, rough, rec, ov) {
    if (rec < 1 || (x2 === x1 && y2 === y1)) return;

    const span = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
    if (rough > span) rough = span;

    let mx, my;
    if (rough < 2) {
        mx = Math.trunc((x1 + x2) / 2);
        my = Math.trunc((y1 + y2) / 2);
    } else {
        do {
            const dx = rn2(rough) - Math.trunc(rough / 2);
            const dy = rn2(rough) - Math.trunc(rough / 2);
            mx = Math.trunc((x1 + x2) / 2) + dx;
            my = Math.trunc((y1 + y2) / 2) + dy;
        } while (mx > COLNO - 1 || mx < 0 || my < 0 || my > ROWNO - 1);
    }

    if (!selection_getpoint(mx, my, ov)) selection_setpoint(mx, my, ov, 1);

    rough = Math.trunc((rough * 2) / 3);
    rec--;

    selection_do_randline(x1, y1, mx, my, rough, rec, ov);
    selection_do_randline(mx, my, x2, y2, rough, rec, ov);

    selection_setpoint(x2, y2, ov, 1);
}

// C ref: nhlsel.c l_selection_randline() — clones, then rec = 12.
export function l_selection_randline(sel, x1, y1, x2, y2, roughness) {
    const out = selection_clone(sel);
    selection_do_randline(x1, y1, x2, y2, roughness, 12, out);
    return out;
}

// C ref: selvar.c selection_iterate() — column-major over the bounds.
export function selection_iterate(ov, fn) {
    if (!ov) return;
    const rect = selection_getbounds(ov);
    for (let x = rect.lx; x <= rect.hx; x++)
        for (let y = rect.ly; y <= rect.hy; y++)
            if (isok(x, y) && selection_getpoint(x, y, ov)) fn(x, y);
}

// C ref: nhlsel.c l_selection_iterate() — the LUA-facing iterate, which differs
// from selvar.c's internal selection_iterate() above in two ways that matter:
// it walks y-outer / x-inner (starting at max(1, lx)), and it runs each point
// through cvt_to_relcoord() before handing it to the callback, so a des.* call
// inside the callback re-adds the map origin and lands on the original square.
// `origin` is {xstart, ystart}; the callback receives MAP-RELATIVE coords.
export function l_selection_iterate(ov, origin, fn) {
    if (!ov) return;
    const rect = selection_getbounds(ov);
    for (let y = rect.ly; y <= rect.hy; y++)
        for (let x = Math.max(1, rect.lx); x <= rect.hx; x++)
            if (selection_getpoint(x, y, ov))
                fn(x - origin.xstart, y - origin.ystart);
}

// C ref: nhlsel.c l_selection_numpoints().
export function selection_numpoints(sel) {
    let ret = 0;
    const rect = selection_getbounds(sel);
    for (let x = rect.lx; x <= rect.hx; x++)
        for (let y = rect.ly; y <= rect.hy; y++)
            if (selection_getpoint(x, y, sel)) ret++;
    return ret;
}

// C ref: nhlsel.c l_selection_fillrect() / selection.area().
export function l_selection_fillrect(sel, x1, y1, x2, y2) {
    const out = sel ? selection_clone(sel) : selection_new();
    if (x1 === x2) {
        for (let y = y1; y <= y2; y++) selection_setpoint(x1, y, out, 1);
    } else {
        for (let y = y1; y <= y2; y++) selection_do_line(x1, y, x2, y, out);
    }
    return out;
}

// C ref: nhlsel.c l_selection_rect() — the four edges only, not a filled area.
export function l_selection_rect(sel, x1, y1, x2, y2) {
    const out = sel ? selection_clone(sel) : selection_new();
    selection_do_line(x1, y1, x2, y1, out);
    selection_do_line(x1, y1, x1, y2, out);
    selection_do_line(x2, y1, x2, y2, out);
    selection_do_line(x1, y2, x2, y2, out);
    return out;
}
