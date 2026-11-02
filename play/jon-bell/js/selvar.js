// selvar.js — C ref: selvar.c.
import { COLNO, ROWNO, STONE, W_EAST, W_NORTH, W_RANDOM, W_SOUTH, W_WEST, isok } from './const.js';
import { newsym_force as newsym_force_real } from './display.js';
import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { match_maptyps, random_wdir } from './sp_lev.js';

/** C ref: selvar.c set_selection_floodfillchk — module-global setter
 *  (mirrors set_ok_location_func in sp_lev_loc.js). */
let _selection_floodfillchk = null;

export function set_selection_floodfillchk(fn) {
    _selection_floodfillchk = fn;
}

export function selection_new() {
    // C: struct selectionvar *tmps = (struct selectionvar *) alloc(sizeof *tmps);
    const tmps = {
        wid: COLNO,      // C: tmps->wid = COLNO;
        hei: ROWNO,      // C: tmps->hei = ROWNO;
        bounds_dirty: false,  // C: tmps->bounds_dirty = FALSE;
        bounds: {
            lx: COLNO,   // C: tmps->bounds.lx = COLNO;
            ly: ROWNO,   // C: tmps->bounds.ly = ROWNO;
            hx: 0,       // C: tmps->bounds.hx = tmps->bounds.hy = 0;
            hy: 0,
        },
        // C: tmps->map = (char *) alloc((COLNO * ROWNO) + 1);
        // (void) memset(tmps->map, 1, (COLNO * ROWNO));
        // tmps->map[(COLNO * ROWNO)] = '\0';
        map: new Array(COLNO * ROWNO + 1).fill(1),
    };
    // Null-terminate like C (though in JS this is not strictly necessary)
    tmps.map[COLNO * ROWNO] = 0;
    return tmps;
}

export function selection_free(sel, freesel) {
    if (sel) {
        if (sel.map)
            sel.map = null;
        sel.map = null;
        if (freesel) {
            // free((genericptr_t) sel) — in JS, object will be GC'd; just leave it
        } else {
            // (void) memset((genericptr_t) sel, 0, sizeof *sel);
            sel.wid = 0;
            sel.hei = 0;
            sel.bounds_dirty = false;
            sel.bounds = { lx: 0, ly: 0, hx: 0, hy: 0 };
            sel.map = null;
        }
    }
}

/* clear selection, setting all locations to value val */
export function selection_clear(sel, val) {
    /* (void) memset(sel->map, 1 + val, (COLNO * ROWNO)); */
    for (let i = 0; i < COLNO * ROWNO; i++) {
        sel.map[i] = 1 + val;
    }
    if (val) {
        sel.bounds.lx = 0;
        sel.bounds.ly = 0;
        sel.bounds.hx = COLNO - 1;
        sel.bounds.hy = ROWNO - 1;
    } else {
        sel.bounds.lx = COLNO;
        sel.bounds.ly = ROWNO;
        sel.bounds.hx = sel.bounds.hy = 0;
    }
    sel.bounds_dirty = false;
}

/** C ref: selvar.c:65-85 — selection_clone: deep-copy a selectionvar */
export function selection_clone(sel) {
    const tmps = {
        wid: sel.wid,
        hei: sel.hei,
        bounds_dirty: sel.bounds_dirty,
        bounds: {
            lx: sel.bounds.lx,
            ly: sel.bounds.ly,
            hx: sel.bounds.hx,
            hy: sel.bounds.hy,
        },
        map: sel.map.slice(),
    };
    return tmps;
}

/* set a point in a selection */
export function selection_setpoint(x, y, sel, c) {
    if (!sel || !sel.map)
        return;
    if (x < 0 || y < 0 || x >= sel.wid || y >= sel.hei)
        return;

    if (c && !sel.bounds_dirty) {
        if (sel.bounds.lx > x)
            sel.bounds.lx = x;
        if (sel.bounds.ly > y)
            sel.bounds.ly = y;
        if (sel.bounds.hx < x)
            sel.bounds.hx = x;
        if (sel.bounds.hy < y)
            sel.bounds.hy = y;
    } else if (sel.map[sel.wid * y + x] != 0) {
        sel.bounds_dirty = true;
    }

    sel.map[sel.wid * y + x] = c + 1;
}

export function selection_do_line(x1, y1, x2, y2, ov) {
    let d0, dx, dy, ai, bi, xi, yi;

    if (x1 < x2) {
        xi = 1;
        dx = x2 - x1;
    } else {
        xi = -1;
        dx = x1 - x2;
    }
    if (y1 < y2) {
        yi = 1;
        dy = y2 - y1;
    } else {
        yi = -1;
        dy = y1 - y2;
    }

    selection_setpoint(x1, y1, ov, 1);

    if (!dx && !dy) {
        /* single point - already all done */
        ;
    } else if (dx > dy) {
        ai = (dy - dx) * 2;
        bi = dy * 2;
        d0 = bi - dx;
        do {
            if (d0 >= 0) {
                y1 += yi;
                d0 += ai;
            } else
                d0 += bi;
            x1 += xi;
            selection_setpoint(x1, y1, ov, 1);
        } while (x1 != x2);
    } else {
        ai = (dx - dy) * 2;
        bi = dx * 2;
        d0 = bi - dy;
        do {
            if (d0 >= 0) {
                x1 += xi;
                d0 += ai;
            } else
                d0 += bi;
            y1 += yi;
            selection_setpoint(x1, y1, ov, 1);
        } while (y1 != y2);
    }
}

/** C ref: selvar.c:211-230 — selection_not: invert the selection */
export function selection_not(s) {
    for (let x = 0; x < s.wid; x++)
        for (let y = 0; y < s.hei; y++)
            selection_setpoint(x, y, s, selection_getpoint(x, y, s) ? 0 : 1);
    /* C: selection_getbounds(s, &tmprect) — updates bounds via recalc */
    selection_recalc_bounds(s);
    return s;
}

/* C ref: selvar.c:801-811 — selection_force_newsyms: force newsym on selected points */
export function selection_force_newsyms(sel) {
    for (let x = 1; x < sel.wid; x++)
        for (let y = 0; y < sel.hei; y++)
            if (selection_getpoint(x, y, sel))
                newsym_force(x, y);
}

/* C ref: selvar.c:168-185 — selection_getpoint: return point value (0/1) */
export function selection_getpoint(x, y, sel) {
    if (!sel || !sel.map)
        return 0;
    if (x < 0 || y < 0 || x >= sel.wid || y >= sel.hei)
        return 0;
    return sel.map[sel.wid * y + x] - 1;
}

export function selection_recalc_bounds(sel) {
    let x, y;
    let r = { lx: -1, ly: -1, hx: -1, hy: -1 };

    if (!sel.bounds_dirty)
        return;

    sel.bounds.lx = COLNO;
    sel.bounds.ly = ROWNO;
    sel.bounds.hx = sel.bounds.hy = 0;

    r.lx = r.ly = r.hx = r.hy = -1;

    /* left */
    for (x = 0; x < sel.wid; x++) {
        for (y = 0; y < sel.hei; y++) {
            if (selection_getpoint(x, y, sel)) {
                r.lx = x;
                break;
            }
        }
        if (r.lx > -1)
            break;
    }

    if (r.lx > -1) {
        /* right */
        for (x = sel.wid - 1; x >= r.lx; x--) {
            for (y = 0; y < sel.hei; y++) {
                if (selection_getpoint(x, y, sel)) {
                    r.hx = x;
                    break;
                }
            }
            if (r.hx > -1)
                break;
        }

        /* top */
        for (y = 0; y < sel.hei; y++) {
            for (x = r.lx; x <= r.hx; x++) {
                if (selection_getpoint(x, y, sel)) {
                    r.ly = y;
                    break;
                }
            }
            if (r.ly > -1)
                break;
        }

        /* bottom */
        for (y = sel.hei - 1; y >= r.ly; y--) {
            for (x = r.lx; x <= r.hx; x++) {
                if (selection_getpoint(x, y, sel)) {
                    r.hy = y;
                    break;
                }
            }
            if (r.hy > -1)
                break;
        }
        sel.bounds = r;
    }

    sel.bounds_dirty = false;
}

/* check whether <x,y> is already in xs[],ys[] — C ref: selvar.c sel_flood_havepoint */
function sel_flood_havepoint(x, y, xs, ys, n) {
    let xx = x, yy = y;
    while (n > 0) {
        --n;
        if (xs[n] === xx && ys[n] === yy)
            return true;
    }
    return false;
}

/** C ref: selvar.c selection_floodfill — flood-fill selection.
 *  Does NOT call any RNG (no rn2/rnd).
 *  Stubbed helpers: none needed beyond what's already defined. */
export function selection_floodfill(ov, x, y, diagonals) {
    const tmp = selection_new();
    const SEL_FLOOD_STACK = COLNO * ROWNO;
    const dx = new Array(SEL_FLOOD_STACK);
    const dy = new Array(SEL_FLOOD_STACK);
    const floodfill_stack_overrun = 'floodfill stack overrun';
    let idx = 0;

    if (_selection_floodfillchk === null) {
        selection_free(tmp, true);
        return;
    }

    // SEL_FLOOD(x, y)
    if (idx < SEL_FLOOD_STACK) {
        dx[idx] = x;
        dy[idx] = y;
        idx++;
    } else {
        throw new Error(floodfill_stack_overrun);
    }

    do {
        idx--;
        x = dx[idx];
        y = dy[idx];
        if (isok(x, y)) {
            selection_setpoint(x, y, ov, 1);
            selection_setpoint(x, y, tmp, 1);
        }

        // SEL_FLOOD_CHKDIR(x+1, y, tmp)
        if (isok((x + 1), y)
            && _selection_floodfillchk((x + 1), y)
            && !selection_getpoint((x + 1), y, tmp)
            && !sel_flood_havepoint((x + 1), y, dx, dy, idx)) {
            if (idx < SEL_FLOOD_STACK) {
                dx[idx] = (x + 1);
                dy[idx] = y;
                idx++;
            } else {
                throw new Error(floodfill_stack_overrun);
            }
        }
        // SEL_FLOOD_CHKDIR(x-1, y, tmp)
        if (isok((x - 1), y)
            && _selection_floodfillchk((x - 1), y)
            && !selection_getpoint((x - 1), y, tmp)
            && !sel_flood_havepoint((x - 1), y, dx, dy, idx)) {
            if (idx < SEL_FLOOD_STACK) {
                dx[idx] = (x - 1);
                dy[idx] = y;
                idx++;
            } else {
                throw new Error(floodfill_stack_overrun);
            }
        }
        // SEL_FLOOD_CHKDIR(x, y+1, tmp)
        if (isok(x, (y + 1))
            && _selection_floodfillchk(x, (y + 1))
            && !selection_getpoint(x, (y + 1), tmp)
            && !sel_flood_havepoint(x, (y + 1), dx, dy, idx)) {
            if (idx < SEL_FLOOD_STACK) {
                dx[idx] = x;
                dy[idx] = (y + 1);
                idx++;
            } else {
                throw new Error(floodfill_stack_overrun);
            }
        }
        // SEL_FLOOD_CHKDIR(x, y-1, tmp)
        if (isok(x, (y - 1))
            && _selection_floodfillchk(x, (y - 1))
            && !selection_getpoint(x, (y - 1), tmp)
            && !sel_flood_havepoint(x, (y - 1), dx, dy, idx)) {
            if (idx < SEL_FLOOD_STACK) {
                dx[idx] = x;
                dy[idx] = (y - 1);
                idx++;
            } else {
                throw new Error(floodfill_stack_overrun);
            }
        }
        if (diagonals) {
            // SEL_FLOOD_CHKDIR(x+1, y+1, tmp)
            if (isok((x + 1), (y + 1))
                && _selection_floodfillchk((x + 1), (y + 1))
                && !selection_getpoint((x + 1), (y + 1), tmp)
                && !sel_flood_havepoint((x + 1), (y + 1), dx, dy, idx)) {
                if (idx < SEL_FLOOD_STACK) {
                    dx[idx] = (x + 1);
                    dy[idx] = (y + 1);
                    idx++;
                } else {
                    throw new Error(floodfill_stack_overrun);
                }
            }
            // SEL_FLOOD_CHKDIR(x-1, y-1, tmp)
            if (isok((x - 1), (y - 1))
                && _selection_floodfillchk((x - 1), (y - 1))
                && !selection_getpoint((x - 1), (y - 1), tmp)
                && !sel_flood_havepoint((x - 1), (y - 1), dx, dy, idx)) {
                if (idx < SEL_FLOOD_STACK) {
                    dx[idx] = (x - 1);
                    dy[idx] = (y - 1);
                    idx++;
                } else {
                    throw new Error(floodfill_stack_overrun);
                }
            }
            // SEL_FLOOD_CHKDIR(x-1, y+1, tmp)
            if (isok((x - 1), (y + 1))
                && _selection_floodfillchk((x - 1), (y + 1))
                && !selection_getpoint((x - 1), (y + 1), tmp)
                && !sel_flood_havepoint((x - 1), (y + 1), dx, dy, idx)) {
                if (idx < SEL_FLOOD_STACK) {
                    dx[idx] = (x - 1);
                    dy[idx] = (y + 1);
                    idx++;
                } else {
                    throw new Error(floodfill_stack_overrun);
                }
            }
            // SEL_FLOOD_CHKDIR(x+1, y-1, tmp)
            if (isok((x + 1), (y - 1))
                && _selection_floodfillchk((x + 1), (y - 1))
                && !selection_getpoint((x + 1), (y - 1), tmp)
                && !sel_flood_havepoint((x + 1), (y - 1), dx, dy, idx)) {
                if (idx < SEL_FLOOD_STACK) {
                    dx[idx] = (x + 1);
                    dy[idx] = (y - 1);
                    idx++;
                } else {
                    throw new Error(floodfill_stack_overrun);
                }
            }
        }
    } while (idx > 0);

    selection_free(tmp, true);
}

/* ─── selection_getbounds — C ref: selvar.c:76-95 ────────────────────────
 * void
 * selection_getbounds(struct selectionvar *sel, NhRect *b)
 * {
 *     if (!sel || !b)
 *         return;
 *     selection_recalc_bounds(sel);
 *     if (sel->bounds.lx >= sel->wid) {
 *         b->lx = 0; b->ly = 0; b->hx = COLNO - 1; b->hy = ROWNO - 1;
 *     } else {
 *         b->lx = sel->bounds.lx; b->ly = sel->bounds.ly;
 *         b->hx = sel->bounds.hx; b->hy = sel->bounds.hy;
 *     }
 * }
 * C writes THROUGH the out-parameter `b` and returns nothing. Ported
 * exactly: every caller (all in this file) now declares its own local rect
 * and passes it by out-param, matching C's call idiom at each C call site. */
export function selection_getbounds(sel, b) {
    if (!sel || !b) return;
    selection_recalc_bounds(sel);
    if (sel.bounds.lx >= sel.wid) {
        b.lx = 0;
        b.ly = 0;
        b.hx = COLNO - 1;
        b.hy = ROWNO - 1;
    } else {
        b.lx = sel.bounds.lx;
        b.ly = sel.bounds.ly;
        b.hx = sel.bounds.hx;
        b.hy = sel.bounds.hy;
    }
}

/* ─── selection_filter_percent — C ref: selvar.c:223-245
 * struct selectionvar *
 * selection_filter_percent(struct selectionvar *ov, int percent)
 * {
 *     int x, y;
 *     struct selectionvar *ret;
 *     NhRect rect = cg.zeroNhRect;
 *
 *     if (!ov)
 *         return NULL;
 *     ret = selection_new();
 *     selection_getbounds(ov, &rect);
 *     for (x = rect.lx; x <= rect.hx; x++)
 *         for (y = rect.ly; y <= rect.hy; y++)
 *             if (selection_getpoint(x, y, ov) && (rn2(100) < percent))
 *                 selection_setpoint(x, y, ret, 1);
 *     return ret;
 * }
 * Updated for selection_getbounds' out-parameter shape: declare `rect`
 * (C's `cg.zeroNhRect`-initialized local) and pass it through. ──────── */
export function selection_filter_percent(ov, percent) {
    if (!ov) return null;
    const ret = selection_new();
    const rect = { lx: 0, ly: 0, hx: 0, hy: 0 };
    selection_getbounds(ov, rect);
    for (let x = rect.lx; x <= rect.hx; x++) {
        for (let y = rect.ly; y <= rect.hy; y++) {
            if (selection_getpoint(x, y, ov) && (rn2(100) < percent)) {
                selection_setpoint(x, y, ret, 1);
            }
        }
    }
    return ret;
}

export function selection_filter_mapchar(ov, typ, lit) {
    if (!ov) return null;
    const ret = selection_new();
    const rect = { lx: 0, ly: 0, hx: 0, hy: 0 };
    selection_getbounds(ov, rect);
    for (let x = rect.lx; x <= rect.hx; x++) {
        for (let y = rect.ly; y <= rect.hy; y++) {
            const levc = isok(x, y) ? ((game.level.at(x, y)?.typ) | 0) : STONE;
            if (selection_getpoint(x, y, ov) && match_maptyps(typ, levc)) {
                switch (lit) {
                case -1:
                    selection_setpoint(x, y, ret, rn2(2));
                    break;
                case 0:
                case 1:
                    if (((game.level.at(x, y)?.lit) | 0) === lit)
                        selection_setpoint(x, y, ret, 1);
                    break;
                default: /* -2 and anything else */
                    selection_setpoint(x, y, ret, 1);
                    break;
                }
            }
        }
    }
    return ret;
}

export function selection_rndcoord(ov, x, y, removeit) {
    let idx = 0;
    let c;
    let rect = { lx: 0, ly: 0, hx: 0, hy: 0 };
    selection_getbounds(ov, rect);

    for (let dx = rect.lx; dx <= rect.hx; dx++)
        for (let dy = rect.ly; dy <= rect.hy; dy++)
            if (selection_getpoint(dx, dy, ov))
                idx++;

    if (idx) {
        c = rn2(idx);
        for (let dx = rect.lx; dx <= rect.hx; dx++)
            for (let dy = rect.ly; dy <= rect.hy; dy++)
                if (selection_getpoint(dx, dy, ov)) {
                    if (!c) {
                        x.value = dx;
                        y.value = dy;
                        if (removeit)
                            selection_setpoint(dx, dy, ov, 0);
                        return 1;
                    }
                    c--;
                }
    }
    x.value = y.value = -1;
    return 0;
}

/* ─── selection_do_grow — C ref: selvar.c:321-369 ───────────────────────── */
export function selection_do_grow(ov, dir) {
    if (!ov) return;
    const tmp = selection_new();
    if (dir === W_RANDOM) dir = random_wdir();
    const rect = { lx: 0, ly: 0, hx: 0, hy: 0 };
    selection_getbounds(ov, rect);
    for (let x = Math.max(0, rect.lx - 1); x <= Math.min(COLNO - 1, rect.hx + 1); x++) {
        for (let y = Math.max(0, rect.ly - 1); y <= Math.min(ROWNO - 1, rect.hy + 1); y++) {
            if (((dir & W_WEST) && selection_getpoint(x + 1, y, ov))
                || (((dir & (W_WEST | W_NORTH)) === (W_WEST | W_NORTH))
                    && selection_getpoint(x + 1, y + 1, ov))
                || ((dir & W_NORTH) && selection_getpoint(x, y + 1, ov))
                || (((dir & (W_NORTH | W_EAST)) === (W_NORTH | W_EAST))
                    && selection_getpoint(x - 1, y + 1, ov))
                || ((dir & W_EAST) && selection_getpoint(x - 1, y, ov))
                || (((dir & (W_EAST | W_SOUTH)) === (W_EAST | W_SOUTH))
                    && selection_getpoint(x - 1, y - 1, ov))
                || ((dir & W_SOUTH) && selection_getpoint(x, y - 1, ov))
                || (((dir & (W_SOUTH | W_WEST)) === (W_SOUTH | W_WEST))
                    && selection_getpoint(x + 1, y - 1, ov))) {
                selection_setpoint(x, y, tmp, 1);
            }
        }
    }
    const rect2 = { lx: 0, ly: 0, hx: 0, hy: 0 };
    selection_getbounds(tmp, rect2);
    for (let x = rect2.lx; x <= rect2.hx; x++) {
        for (let y = rect2.ly; y <= rect2.hy; y++) {
            if (selection_getpoint(x, y, tmp)) {
                selection_setpoint(x, y, ov, 1);
            }
        }
    }
    selection_free(tmp, true);
}

/* ─── selection_do_randline — C ref: selvar.c:682-723 ───────────────────── */
export function selection_do_randline(x1, y1, x2, y2, rough, rec, ov) {
    let mx, my;
    let dx, dy;

    if (rec < 1 || (x2 === x1 && y2 === y1))
        return;

    if (rough > Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)))
        rough = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));

    if (rough < 2) {
        mx = ((x1 + x2) / 2) | 0;
        my = ((y1 + y2) / 2) | 0;
    } else {
        do {
            dx = rn2(rough) - ((rough / 2) | 0);
            dy = rn2(rough) - ((rough / 2) | 0);
            mx = (((x1 + x2) / 2) | 0) + dx;
            my = (((y1 + y2) / 2) | 0) + dy;
        } while (mx > COLNO - 1 || mx < 0 || my < 0 || my > ROWNO - 1);
    }

    if (!selection_getpoint(mx, my, ov)) {
        selection_setpoint(mx, my, ov, 1);
    }

    rough = ((rough * 2) / 3) | 0;

    rec--;

    selection_do_randline(x1, y1, mx, my, rough, rec, ov);
    selection_do_randline(mx, my, x2, y2, rough, rec, ov);

    selection_setpoint(x2, y2, ov, 1);
}

/* C display.c: newsym_force — share the canonical forced repaint state. */
function newsym_force(x, y) { return newsym_force_real(x, y); }
