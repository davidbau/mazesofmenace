/* NetHack 5.0	selvar.c	$NHDT-Date: 1769840272 2026/01/30 22:17:52 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.4 $ */
/* Copyright (c) 2024 by Pasi Kallinen */
/* NetHack may be freely redistributed.  See license for details. */

import { C } from '../c-runtime/context.js';



/* selection */
export function selection_new()
{
    let tmps = C.selection(C.alloc(C.selectionSize));

    tmps.wid = C.COLNO;
    tmps.hei = C.ROWNO;
    tmps.bounds_dirty = 0;
    tmps.bounds.lx = C.COLNO;
    tmps.bounds.ly = C.ROWNO;
    tmps.bounds.hx = tmps.bounds.hy = 0;
    tmps.map = C.alloc((C.COLNO * C.ROWNO) + 1);
    C.memset(tmps.map, 1, (C.COLNO * C.ROWNO));
    C.HEAPU8[tmps.map + (C.COLNO * C.ROWNO)] = '\0'.charCodeAt(0);

    return tmps;
}

export function selection_free(sel, freesel)
{
    if (sel) {
        if (sel.map)
            C.free(sel.map);
        sel.map = 0;
        if (freesel)
            C.free(sel);
        else
            C.memset(sel, 0, C.selectionSize);
    }
}

/* clear selection, setting all locations to value val */
export function selection_clear(sel, val)
{
    C.memset(sel.map, 1 + val, (C.COLNO * C.ROWNO));
    if (val) {
        sel.bounds.lx = 0;
        sel.bounds.ly = 0;
        sel.bounds.hx = C.COLNO - 1;
        sel.bounds.hy = C.ROWNO - 1;
    } else {
        sel.bounds.lx = C.COLNO;
        sel.bounds.ly = C.ROWNO;
        sel.bounds.hx = sel.bounds.hy = 0;
    }
    sel.bounds_dirty = 0;
}

export function selection_clone(sel)
{
    let tmps = C.selection(C.alloc(C.selectionSize));

    C.copySelection(tmps, sel);
    tmps.map = C.dupstr(sel.map);

    return tmps;
}

/* get boundary rect of selection sel into b */
export function selection_getbounds(sel, b)
{
    if (!sel || !b)
        return;

    selection_recalc_bounds(sel);

    if (sel.bounds.lx >= sel.wid) {
        b.lx = 0;
        b.ly = 0;
        b.hx = C.COLNO - 1;
        b.hy = C.ROWNO - 1;
    } else {
        b.lx = sel.bounds.lx;
        b.ly = sel.bounds.ly;
        b.hx = sel.bounds.hx;
        b.hy = sel.bounds.hy;
    }
}

/* recalc the boundary of selection, if necessary */
export function selection_recalc_bounds(sel)
{
    let x, y;
    let r = C.rectLocal();

    if (!sel.bounds_dirty)
        return;

    sel.bounds.lx = C.COLNO;
    sel.bounds.ly = C.ROWNO;
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
        for (x = sel.wid-1; x >= r.lx; x--) {
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
        for (y = sel.hei-1; y >= r.ly; y--) {
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

    sel.bounds_dirty = 0;
}

export function selection_getpoint(x, y, sel)
{
    x = C.coordxy(x); y = C.coordxy(y);
    if (!sel || !sel.map)
        return 0;
    if (x < 0 || y < 0 || x >= sel.wid || y >= sel.hei)
        return 0;

    return C.coordxy(C.HEAP8[sel.map + sel.wid * y + x] - 1);
}

export function selection_setpoint(x, y, sel, c)
{
    x = C.coordxy(x); y = C.coordxy(y); c = C.int(c);
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

    /* only set bounds_dirty if changing a point from 1 to 0; if changing
       a point from 0 to 0, nothing has really changed with the bounds */
    } else if (C.HEAP8[sel.map + sel.wid * y + x] != 0) {
        sel.bounds_dirty = 1;
    }

    C.HEAPU8[sel.map + sel.wid * y + x] = C.char(c + 1);
}

export function selection_not(s)
{
    let x, y;
    let tmprect = C.rectLocalCopy(C.cg.zeroNhRect);

    for (x = 0; x < s.wid; x++)
        for (y = 0; y < s.hei; y++)
            selection_setpoint(x, y, s, selection_getpoint(x, y, s) ? 0 : 1);
    selection_getbounds(s, tmprect);
    return s;
}

export function selection_filter_percent(ov, percent)
{
    let x, y;
    let ret;
    let rect = C.rectLocalCopy(C.cg.zeroNhRect);

    if (!ov)
        return 0;

    ret = selection_new();

    selection_getbounds(ov, rect);

    for (x = rect.lx; x <= rect.hx; x++)
        for (y = rect.ly; y <= rect.hy; y++)
            if (selection_getpoint(x, y, ov) && (C.rn2(100, 241, 0) < percent))
                selection_setpoint(x, y, ret, 1);

    return ret;
}

export function selection_filter_mapchar(ov, typ, lit)
{
    typ = C.coordxy(typ);
    let x, y;
    let ret;
    let rect = C.rectLocalCopy(C.cg.zeroNhRect);

    if (!ov)
        return 0;

    ret = selection_new();

    selection_getbounds(ov, rect);

    for (x = rect.lx; x <= rect.hx; x++)
        for (y = rect.ly; y <= rect.hy; y++)
            if (selection_getpoint(x, y, ov)
                && C.match_maptyps(typ, C.levl[x][y].typ)) {
                switch (lit) {
                default:
                case -2:
                    selection_setpoint(x, y, ret, 1);
                    break;
                case -1:
                    selection_setpoint(x, y, ret, C.rn2(2, 271, 1));
                    break;
                case 0:
                case 1:
                    if (C.levl[x][y].lit == (lit >>> 0))
                        selection_setpoint(x, y, ret, 1);
                    break;
                }
            }
    return ret;
}

export function selection_rndcoord(ov, x, y, removeit)
{
    let idx = 0;
    let c;
    let dx, dy;
    let rect = C.rectLocalCopy(C.cg.zeroNhRect);

    selection_getbounds(ov, rect);

    for (dx = rect.lx; dx <= rect.hx; dx++)
        for (dy = rect.ly; dy <= rect.hy; dy++)
            if (selection_getpoint(dx, dy, ov))
                idx++;

    if (idx) {
        c = C.rn2(idx, 302, 2);
        for (dx = rect.lx; dx <= rect.hx; dx++)
            for (dy = rect.ly; dy <= rect.hy; dy++)
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

export function selection_do_grow(ov, dir)
{
    let x, y;
    let tmp;
    let rect = C.rectLocalCopy(C.cg.zeroNhRect);

    if (!ov)
        return;

    tmp = selection_new();

    if (dir == C.W_RANDOM)
        dir = C.random_wdir();

    selection_getbounds(ov, rect);

    for (x = C.max(0, rect.lx-1); x <= C.min(C.COLNO-1, rect.hx+1); x++)
        for (y = C.max(0, rect.ly-1); y <= C.min(C.ROWNO-1, rect.hy+1); y++) {
            /* note:  dir is a mask of multiple directions, but the only
               way to specify diagonals is by including the two adjacent
               orthogonal directions, which effectively specifies three-
               way growth [WEST|NORTH => WEST plus WEST|NORTH plus NORTH] */
            if (((dir & C.W_WEST) && selection_getpoint(x + 1, y, ov))
                || (((dir & (C.W_WEST | C.W_NORTH)) == (C.W_WEST | C.W_NORTH))
                    && selection_getpoint(x + 1, y + 1, ov))
                || ((dir & C.W_NORTH) && selection_getpoint(x, y + 1, ov))
                || (((dir & (C.W_NORTH | C.W_EAST)) == (C.W_NORTH | C.W_EAST))
                    && selection_getpoint(x - 1, y + 1, ov))
                || ((dir & C.W_EAST) && selection_getpoint(x - 1, y, ov))
                || (((dir & (C.W_EAST | C.W_SOUTH)) == (C.W_EAST | C.W_SOUTH))
                    && selection_getpoint(x - 1, y - 1, ov))
                || ((dir & C.W_SOUTH) && selection_getpoint(x, y - 1, ov))
                ||  (((dir & (C.W_SOUTH | C.W_WEST)) == (C.W_SOUTH | C.W_WEST))
                     && selection_getpoint(x + 1, y - 1, ov))) {
                selection_setpoint(x, y, tmp, 1);
            }
        }

    selection_getbounds(tmp, rect);

    for (x = rect.lx; x <= rect.hx; x++)
        for (y = rect.ly; y <= rect.hy; y++)
            if (selection_getpoint(x, y, tmp))
                selection_setpoint(x, y, ov, 1);

    selection_free(tmp, 1);
}


export function set_selection_floodfillchk(f)
{
    C.selvarState.selection_flood_check_func = f;
}

/* check whethere <x,y> is already in xs[],ys[] */
export function sel_flood_havepoint(x, y, xs, ys, n)
{
    x = C.coordxy(x); y = C.coordxy(y);
    let xx = x, yy = y;

    while (n > 0) {
        --n;
        if (xs[n] == xx && ys[n] == yy)
            return 1;
    }
    return 0;
}

export function selection_floodfill(ov, x, y, diagonals)
{
    x = C.coordxy(x); y = C.coordxy(y);
    let tmp = selection_new();
// SEL_FLOOD_STACK is COLNO * ROWNO; local flood macros expand below.
    const floodfill_stack_overrun = "floodfill stack overrun";
    let idx = 0;
    let dx = C.coordArrayLocal(C.COLNO * C.ROWNO);
    let dy = C.coordArrayLocal(C.COLNO * C.ROWNO);

    if (C.selvarState.selection_flood_check_func == 0n) {
        selection_free(tmp, 1);
        return;
    }
    do {
        if (idx < C.COLNO * C.ROWNO) {
            dx[idx] = x;
            dy[idx] = y;
            idx++;
        } else
            C.panic(floodfill_stack_overrun);
    } while (0);
    do {
        idx--;
        x = dx[idx];
        y = dy[idx];
        if (C.isok(x, y)) {
            selection_setpoint(x, y, ov, 1);
            selection_setpoint(x, y, tmp, 1);
        }
        do {
            if (C.isok((x + 1), y)
                && C.floodCheck(C.selvarState.selection_flood_check_func, (x + 1), y)
                && !selection_getpoint((x + 1), y, tmp)
                && !sel_flood_havepoint((x + 1), y, dx, dy, idx)) {
                if (idx < C.COLNO * C.ROWNO) {
                    dx[idx] = (x + 1);
                    dy[idx] = y;
                    idx++;
                } else
                    C.panic(floodfill_stack_overrun);
            }
        } while (0);
        do {
            if (C.isok((x - 1), y)
                && C.floodCheck(C.selvarState.selection_flood_check_func, (x - 1), y)
                && !selection_getpoint((x - 1), y, tmp)
                && !sel_flood_havepoint((x - 1), y, dx, dy, idx)) {
                if (idx < C.COLNO * C.ROWNO) {
                    dx[idx] = (x - 1);
                    dy[idx] = y;
                    idx++;
                } else
                    C.panic(floodfill_stack_overrun);
            }
        } while (0);
        do {
            if (C.isok(x, (y + 1))
                && C.floodCheck(C.selvarState.selection_flood_check_func, x, (y + 1))
                && !selection_getpoint(x, (y + 1), tmp)
                && !sel_flood_havepoint(x, (y + 1), dx, dy, idx)) {
                if (idx < C.COLNO * C.ROWNO) {
                    dx[idx] = x;
                    dy[idx] = (y + 1);
                    idx++;
                } else
                    C.panic(floodfill_stack_overrun);
            }
        } while (0);
        do {
            if (C.isok(x, (y - 1))
                && C.floodCheck(C.selvarState.selection_flood_check_func, x, (y - 1))
                && !selection_getpoint(x, (y - 1), tmp)
                && !sel_flood_havepoint(x, (y - 1), dx, dy, idx)) {
                if (idx < C.COLNO * C.ROWNO) {
                    dx[idx] = x;
                    dy[idx] = (y - 1);
                    idx++;
                } else
                    C.panic(floodfill_stack_overrun);
            }
        } while (0);
        if (diagonals) {
            do {
            if (C.isok((x + 1), (y + 1))
                && C.floodCheck(C.selvarState.selection_flood_check_func, (x + 1), (y + 1))
                && !selection_getpoint((x + 1), (y + 1), tmp)
                && !sel_flood_havepoint((x + 1), (y + 1), dx, dy, idx)) {
                if (idx < C.COLNO * C.ROWNO) {
                    dx[idx] = (x + 1);
                    dy[idx] = (y + 1);
                    idx++;
                } else
                    C.panic(floodfill_stack_overrun);
            }
        } while (0);
            do {
            if (C.isok((x - 1), (y - 1))
                && C.floodCheck(C.selvarState.selection_flood_check_func, (x - 1), (y - 1))
                && !selection_getpoint((x - 1), (y - 1), tmp)
                && !sel_flood_havepoint((x - 1), (y - 1), dx, dy, idx)) {
                if (idx < C.COLNO * C.ROWNO) {
                    dx[idx] = (x - 1);
                    dy[idx] = (y - 1);
                    idx++;
                } else
                    C.panic(floodfill_stack_overrun);
            }
        } while (0);
            do {
            if (C.isok((x - 1), (y + 1))
                && C.floodCheck(C.selvarState.selection_flood_check_func, (x - 1), (y + 1))
                && !selection_getpoint((x - 1), (y + 1), tmp)
                && !sel_flood_havepoint((x - 1), (y + 1), dx, dy, idx)) {
                if (idx < C.COLNO * C.ROWNO) {
                    dx[idx] = (x - 1);
                    dy[idx] = (y + 1);
                    idx++;
                } else
                    C.panic(floodfill_stack_overrun);
            }
        } while (0);
            do {
            if (C.isok((x + 1), (y - 1))
                && C.floodCheck(C.selvarState.selection_flood_check_func, (x + 1), (y - 1))
                && !selection_getpoint((x + 1), (y - 1), tmp)
                && !sel_flood_havepoint((x + 1), (y - 1), dx, dy, idx)) {
                if (idx < C.COLNO * C.ROWNO) {
                    dx[idx] = (x + 1);
                    dy[idx] = (y - 1);
                    idx++;
                } else
                    C.panic(floodfill_stack_overrun);
            }
        } while (0);
        }
    } while (idx > 0);
// #undef SEL_FLOOD
// #undef SEL_FLOOD_STACK
// #undef SEL_FLOOD_CHKDIR
    selection_free(tmp, 1);
}

/* McIlroy's Ellipse Algorithm */
export function selection_do_ellipse(ov, xc, yc, a, b, filled)
{ /* e(x,y) = b^2*x^2 + a^2*y^2 - a^2*b^2 */
    let x = 0, y = b;
    let a2 = C.long(C.long(a) * C.long(a)), b2 = C.long(C.long(b) * C.long(b));
    let crit1 = C.long(-(a2 / 4n + C.long(a % 2) + b2));
    let crit2 = C.long(-(b2 / 4n + C.long(b % 2) + a2));
    let crit3 = C.long(-(b2 / 4n + C.long(b % 2)));
    let t = C.long(-a2 * C.long(y)); /* e(x+1/2,y-1/2) - (a^2+b^2)/4 */
    let dxt = C.long(2n * b2 * C.long(x)), dyt = C.long(-2n * a2 * C.long(y));
    let d2xt = C.long(2n * b2), d2yt = C.long(2n * a2);
    let width = 1n;
    let i;

    if (!ov)
        return;

    filled = !filled;

    if (!filled) {
        while (y >= 0 && x <= a) {
            selection_setpoint(xc + x, yc + y, ov, 1);
            if (x != 0 || y != 0)
                selection_setpoint(xc - x, yc - y, ov, 1);
            if (x != 0 && y != 0) {
                selection_setpoint(xc + x, yc - y, ov, 1);
                selection_setpoint(xc - x, yc + y, ov, 1);
            }
            if (C.long(t + b2 * C.long(x)) <= crit1       /* e(x+1,y-1/2) <= 0 */
                || C.long(t + a2 * C.long(y)) <= crit3) { /* e(x+1/2,y) <= 0 */
                x++;
                dxt = C.long(dxt + d2xt);
                t = C.long(t + dxt);
            } else if (C.long(t - a2 * C.long(y)) > crit2) { /* e(x+1/2,y-1) > 0 */
                y--;
                dyt = C.long(dyt + d2yt);
                t = C.long(t + dyt);
            } else {
                x++;
                dxt = C.long(dxt + d2xt);
                t = C.long(t + dxt);
                y--;
                dyt = C.long(dyt + d2yt);
                t = C.long(t + dyt);
            }
        }
    } else {
        while (y >= 0 && x <= a) {
            if (C.long(t + b2 * C.long(x)) <= crit1       /* e(x+1,y-1/2) <= 0 */
                || C.long(t + a2 * C.long(y)) <= crit3) { /* e(x+1/2,y) <= 0 */
                x++;
                dxt = C.long(dxt + d2xt);
                t = C.long(t + dxt);
                width = C.long(width + 2n);
            } else if (C.long(t - a2 * C.long(y)) > crit2) { /* e(x+1/2,y-1) > 0 */
                for (i = 0n; i < width; i++)
                    selection_setpoint(C.long(C.int(xc - x)) + i, yc - y, ov, 1);
                if (y != 0)
                    for (i = 0n; i < width; i++)
                        selection_setpoint(C.long(C.int(xc - x)) + i, yc + y, ov, 1);
                y--;
                dyt = C.long(dyt + d2yt);
                t = C.long(t + dyt);
            } else {
                for (i = 0n; i < width; i++)
                    selection_setpoint(C.long(C.int(xc - x)) + i, yc - y, ov, 1);
                if (y != 0)
                    for (i = 0n; i < width; i++)
                        selection_setpoint(C.long(C.int(xc - x)) + i, yc + y, ov, 1);
                x++;
                dxt = C.long(dxt + d2xt);
                t = C.long(t + dxt);
                y--;
                dyt = C.long(dyt + d2yt);
                t = C.long(t + dyt);
                width = C.long(width + 2n);
            }
        }
    }
}

/* square of distance from line segment (x1,y1, x2,y2) to point (x3,y3) */
export function line_dist_coord(x1, y1, x2, y2, x3, y3)
{
    x1 = C.long(x1); y1 = C.long(y1); x2 = C.long(x2); y2 = C.long(y2); x3 = C.long(x3); y3 = C.long(y3);
    let px = C.long(x2 - x1);
    let py = C.long(y2 - y1);
    let s = C.long(px * px + py * py);
    let x, y, dx, dy, distsq = 0n;
    let lu = 0;

    if (x1 == x2 && y1 == y2)
        return C.long(C.dist2(C.coordxy(x1), C.coordxy(y1), C.coordxy(x3), C.coordxy(y3)));

    lu = Math.fround(C.longToFloat(C.long((x3 - x1) * px + (y3 - y1) * py)) / C.longToFloat(s));
    if (lu > 1)
        lu = 1;
    else if (lu < 0)
        lu = 0;

    x = C.floatToLong(Math.fround(C.longToFloat(x1) + Math.fround(lu * C.longToFloat(px))));
    y = C.floatToLong(Math.fround(C.longToFloat(y1) + Math.fround(lu * C.longToFloat(py))));
    dx = C.long(x - x3);
    dy = C.long(y - y3);
    distsq = C.long(dx * dx + dy * dy);

    return distsq;
}

/* guts of l_selection_gradient */
export function selection_do_gradient(ov, x, y, x2, y2, gtyp, mind, maxd)
{
    x = C.long(x); y = C.long(y); x2 = C.long(x2); y2 = C.long(y2);
    gtyp = C.long(gtyp); mind = C.long(mind); maxd = C.long(maxd);
    let dx, dy, dofs;

    if (mind > maxd) {
        let tmp = mind;
        mind = maxd;
        maxd = tmp;
    }

    dofs = C.long(C.long(maxd * maxd) - C.long(mind * mind));
    if (dofs < 1)
        dofs = 1n;

    switch (gtyp) {
    default:
        C.impossible("Unrecognized gradient type! Defaulting to radial...");
        // FALLTHROUGH;
        /* FALLTHRU */
    case C.long(C.SEL_GRADIENT_RADIAL): {
        for (dx = 0n; dx < C.COLNO; dx++)
            for (dy = 0n; dy < C.ROWNO; dy++) {
                let d0 = line_dist_coord(x, y, x2, y2, dx, dy);

                if (d0 <= C.long(mind * mind)
                    || (d0 <= C.long(maxd * maxd) && C.long(d0 - C.long(mind * mind)) < C.rn2(dofs, 600, 3)))
                    selection_setpoint(dx, dy, ov, 1);
            }
        break;
    }
    case C.long(C.SEL_GRADIENT_SQUARE): {
        for (dx = 0n; dx < C.COLNO; dx++)
            for (dy = 0n; dy < C.ROWNO; dy++) {
                let d1 = line_dist_coord(x, y, x2, y2, x, dy);
                let d2 = line_dist_coord(x, y, x2, y2, dx, y);
                let d3 = line_dist_coord(x, y, x2, y2, x2, dy);
                let d4 = line_dist_coord(x, y, x2, y2, dx, y2);
                let d5 = line_dist_coord(x, y, x2, y2, dx, dy);
                let d0 = C.min(d5, C.min(C.max(d1, d2), C.max(d3, d4)));

                if (d0 <= C.long(mind * mind)
                    || (d0 <= C.long(maxd * maxd) && C.long(d0 - C.long(mind * mind)) < C.rn2(dofs, 616, 3)))
                    selection_setpoint(dx, dy, ov, 1);
            }
        break;
    } /*case*/
    } /*switch*/
}

/* bresenham line algo */
export function selection_do_line(x1, y1, x2, y2, ov)
{
    x1 = C.coordxy(x1); y1 = C.coordxy(y1); x2 = C.coordxy(x2); y2 = C.coordxy(y2);
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
                y1 = C.coordxy(y1 + yi);
                d0 += ai;
            } else
                d0 += bi;
            x1 = C.coordxy(x1 + xi);
            selection_setpoint(x1, y1, ov, 1);
        } while (x1 != x2);
    } else {
        ai = (dx - dy) * 2;
        bi = dx * 2;
        d0 = bi - dy;
        do {
            if (d0 >= 0) {
                x1 = C.coordxy(x1 + xi);
                d0 += ai;
            } else
                d0 += bi;
            y1 = C.coordxy(y1 + yi);
            selection_setpoint(x1, y1, ov, 1);
        } while (y1 != y2);
    }
}

export function selection_do_randline(x1, y1, x2, y2, rough, rec, ov)
{
    x1 = C.coordxy(x1); y1 = C.coordxy(y1); x2 = C.coordxy(x2); y2 = C.coordxy(y2);
    rough = C.char(rough); rec = C.char(rec);
    let mx, my;
    let dx, dy;

    if (rec < 1 || (x2 == x1 && y2 == y1))
        return;

    if (rough > C.max(C.abs(x2 - x1), C.abs(y2 - y1)))
        rough = C.char(C.max(C.abs(x2 - x1), C.abs(y2 - y1)));

    if (rough < 2) {
        mx = Math.trunc((x1 + x2) / 2);
        my = Math.trunc((y1 + y2) / 2);
    } else {
        do {
            dx = C.rn2(rough, 704, 4) - Math.trunc(rough / 2);
            dy = C.rn2(rough, 705, 4) - Math.trunc(rough / 2);
            mx = Math.trunc((x1 + x2) / 2) + dx;
            my = Math.trunc((y1 + y2) / 2) + dy;
        } while ((mx > C.COLNO - 1 || mx < 0 || my < 0 || my > C.ROWNO - 1));
    }

    if (!selection_getpoint(mx, my, ov)) {
        selection_setpoint(mx, my, ov, 1);
    }

    rough = C.char(Math.trunc((rough * 2) / 3));

    rec = C.char(rec - 1);

    selection_do_randline(x1, y1, mx, my, rough, rec, ov);
    selection_do_randline(mx, my, x2, y2, rough, rec, ov);

    selection_setpoint(x2, y2, ov, 1);
}

export function selection_iterate(ov, func, arg)
{
    let x, y;
    let rect = C.rectLocalCopy(C.cg.zeroNhRect);

    if (!ov)
        return;

    selection_getbounds(ov, rect);

    for (x = rect.lx; x <= rect.hx; x++)
        for (y = rect.ly; y <= rect.hy; y++)
            if (C.isok(x,y) && selection_getpoint(x, y, ov))
                C.iterate(func, x, y, arg);
}

/* selection is not rectangular, or has holes in it */
export function selection_is_irregular(sel)
{
    let x, y;
    let rect = C.rectLocalCopy(C.cg.zeroNhRect);

    selection_getbounds(sel, rect);

    for (x = rect.lx; x <= rect.hx; x++)
        for (y = rect.ly; y <= rect.hy; y++)
            if (C.isok(x,y) && !selection_getpoint(x, y, sel))
                return 1;

    return 0;
}

/* return a description of the selection size */
export function selection_size_description(sel, buf)
{
    let rect = C.rectLocalCopy(C.cg.zeroNhRect);
    let dx, dy;

    selection_getbounds(sel, rect);
    dx = C.coordxy(rect.hx - rect.lx + 1);
    dy = C.coordxy(rect.hy - rect.ly + 1);
    C.Sprintf(buf, "%s %i by %i",
            selection_is_irregular(sel) ? "irregularly shaped"
            : (dx == dy) ? "square"
              : "rectangular",
            dx, dy);
    return buf;
}

export function selection_from_mkroom(croom)
{
    let sel = selection_new();
    let x, y;
    let rmno;

    if (!croom && C.gc.coder && C.gc.coder.croom)
        croom = C.gc.coder.croom;
    if (!croom)
        return sel;

    rmno = C.int(C.roomIndex(croom) + C.ROOMOFFSET) >>> 0;
    for (y = croom.ly; y <= croom.hy; y++)
        for (x = croom.lx; x <= croom.hx; x++)
            if (C.isok(x, y) && !C.levl[x][y].edge
                && C.levl[x][y].roomno == rmno)
                selection_setpoint(x, y, sel, 1);
    return sel;
}

export function selection_force_newsyms(sel)
{
    let x, y;

    for (x = 1; x < sel.wid; x++)
        for (y = 0; y < sel.hei; y++)
            if (selection_getpoint(x, y, sel))
                C.newsym_force(x, y);
}

/*selvar.c*/
