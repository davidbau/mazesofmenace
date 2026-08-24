// selvar.js — selections: a set of map squares, manipulated as a value.
// C ref: src/selvar.c
//
// This is the subsystem every themeroom fill is written against, and the
// themerooms are the entire remaining reached-but-unported list (28% of random
// games). `src/nhlsel.c` is only the Lua binding layer over this file.
//
// Only selection_filter_percent() draws, one rn2(100) per SET point inside the
// bounding box, x outer and y inner. Everything else here is bookkeeping, but
// the bookkeeping decides which points that loop visits and in what order, so
// it has to be exact.
//
// The map encoding is worth stating because it is off by one on purpose:
// selection_new() memsets every byte to 1 and selection_getpoint() returns
// `map[i] - 1`, so an unset point stores 1 and a set point stores 2. Storing
// 0/1 instead would still read "correctly" through getpoint but would break
// selection_setpoint()'s bounds_dirty test, which distinguishes a byte that is
// 0 from one that is not.

import { game } from './gstate.js';
import { COLNO, ROWNO, ROOMOFFSET, MAX_TYPE, MATCH_WALL, IS_STWALL,
         W_RANDOM, W_NORTH, W_SOUTH, W_EAST, W_WEST } from './const.js';
import { rn2 } from './rng.js';
import { isok } from './hacklib.js';
import { cvt_to_relcoord, update_croom, random_wdir } from './sp_lev.js';

// src/selvar.c:15 selection_new()
export function selection_new() {
    return {
        wid: COLNO,
        hei: ROWNO,
        bounds_dirty: false,
        bounds: { lx: COLNO, ly: ROWNO, hx: 0, hy: 0 },
        map: new Uint8Array(COLNO * ROWNO).fill(1),
    };
}

// src/selvar.c:48 selection_clear() — set every square to `val` at once.
//
// This is what `selection.negate()` resolves to when Lua calls it with NO
// receiver (nhlsel.c:265): a fresh selection, then clear(sel, 1). It is not
// selection_not() on an empty selection, even though the result is the same
// set -- clear writes the bounds directly and leaves bounds_dirty false, where
// not() would walk every square through setpoint. Neither draws, so only the
// resulting bounds matter, and those agree.
export function selection_clear(sel, val) {
    sel.map.fill(1 + val);
    if (val) {
        sel.bounds = { lx: 0, ly: 0, hx: COLNO - 1, hy: ROWNO - 1 };
    } else {
        sel.bounds = { lx: COLNO, ly: ROWNO, hx: 0, hy: 0 };
    }
    sel.bounds_dirty = false;
}

// src/selvar.c:168 selection_getpoint()
export function selection_getpoint(x, y, sel) {
    if (!sel || !sel.map)
        return 0;
    if (x < 0 || y < 0 || x >= sel.wid || y >= sel.hei)
        return 0;

    return sel.map[sel.wid * y + x] - 1;
}

// src/selvar.c:181 selection_setpoint()
export function selection_setpoint(x, y, sel, c) {
    if (!sel || !sel.map)
        return;
    if (x < 0 || y < 0 || x >= sel.wid || y >= sel.hei)
        return;

    if (c && !sel.bounds_dirty) {
        if (sel.bounds.lx > x) sel.bounds.lx = x;
        if (sel.bounds.ly > y) sel.bounds.ly = y;
        if (sel.bounds.hx < x) sel.bounds.hx = x;
        if (sel.bounds.hy < y) sel.bounds.hy = y;

    /* only set bounds_dirty if changing a point from 1 to 0; if changing
       a point from 0 to 0, nothing has really changed with the bounds */
    } else if (sel.map[sel.wid * y + x] !== 0) {
        sel.bounds_dirty = true;
    }

    sel.map[sel.wid * y + x] = c + 1;
}

// src/selvar.c:99 selection_recalc_bounds() — four directional scans, each
// stopping at the first set point it meets.
export function selection_recalc_bounds(sel) {
    if (!sel.bounds_dirty)
        return;

    sel.bounds.lx = COLNO;
    sel.bounds.ly = ROWNO;
    sel.bounds.hx = sel.bounds.hy = 0;

    const r = { lx: -1, ly: -1, hx: -1, hy: -1 };

    /* left */
    for (let x = 0; x < sel.wid; x++) {
        for (let y = 0; y < sel.hei; y++)
            if (selection_getpoint(x, y, sel)) { r.lx = x; break; }
        if (r.lx > -1) break;
    }

    if (r.lx > -1) {
        /* right */
        for (let x = sel.wid - 1; x >= r.lx; x--) {
            for (let y = 0; y < sel.hei; y++)
                if (selection_getpoint(x, y, sel)) { r.hx = x; break; }
            if (r.hx > -1) break;
        }
        /* top */
        for (let y = 0; y < sel.hei; y++) {
            for (let x = r.lx; x <= r.hx; x++)
                if (selection_getpoint(x, y, sel)) { r.ly = y; break; }
            if (r.ly > -1) break;
        }
        /* bottom */
        for (let y = sel.hei - 1; y >= r.ly; y--) {
            for (let x = r.lx; x <= r.hx; x++)
                if (selection_getpoint(x, y, sel)) { r.hy = y; break; }
            if (r.hy > -1) break;
        }
        sel.bounds = r;
    }

    sel.bounds_dirty = false;
}

// src/selvar.c:77 selection_getbounds() — an EMPTY selection reports the whole
// map, not an empty rect, so an iterate over one walks every square.
export function selection_getbounds(sel, b) {
    if (!sel || !b)
        return;

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

// src/selvar.c:224 selection_filter_percent() — the only function here that
// draws. One rn2(100) per SET point, x outer and y inner over the bounds.
export function selection_filter_percent(ov, percent) {
    if (!ov)
        return null;

    const ret = selection_new();
    const rect = { lx: 0, ly: 0, hx: 0, hy: 0 };

    selection_getbounds(ov, rect);

    for (let x = rect.lx; x <= rect.hx; x++)
        for (let y = rect.ly; y <= rect.hy; y++)
            if (selection_getpoint(x, y, ov) && (rn2(100) < percent))
                selection_setpoint(x, y, ret, 1);

    return ret;
}

// src/selvar.c:726 selection_iterate() — same walk order as filter_percent,
// with an extra isok() guard. The callback receives ABSOLUTE map
// coordinates: this is the C-internal walk that lspo_terrain's sel_set_ter
// and its siblings run on. The map-relative variant the Lua sees is
// l_selection_iterate() below, and conflating the two painted every
// des.terrain selection shifted by the map origin.
export function selection_iterate(ov, func, arg) {
    if (!ov)
        return;

    const rect = { lx: 0, ly: 0, hx: 0, hy: 0 };
    selection_getbounds(ov, rect);

    for (let x = rect.lx; x <= rect.hx; x++)
        for (let y = rect.ly; y <= rect.hy; y++)
            if (isok(x, y) && selection_getpoint(x, y, ov))
                func(x, y, arg);
}

// src/nhlsel.c:924 l_selection_iterate() — `sel:iterate(func)`. The Lua
// callback is handed RELATIVE coordinates (cvt_to_relcoord), and the walk is
// Y OUTER with x clamped to 1, the OPPOSITE of selection_iterate() above.
// Both differences order the callback's own draws, so they are load-bearing.
export function l_selection_iterate(sel, func) {
    if (!sel)
        return;

    const rect = { lx: 0, ly: 0, hx: 0, hy: 0 };
    selection_getbounds(sel, rect);

    for (let y = rect.ly; y <= rect.hy; y++)
        for (let x = Math.max(1, rect.lx); x <= rect.hx; x++)
            if (selection_getpoint(x, y, sel)) {
                const c = { x, y };
                cvt_to_relcoord(c);
                func(c.x, c.y);
            }
}

// src/selvar.c:211 selection_not() — invert every square of the whole map.
export function selection_not(s) {
    for (let x = 0; x < s.wid; x++)
        for (let y = 0; y < s.hei; y++)
            selection_setpoint(x, y, s, selection_getpoint(x, y, s) ? 0 : 1);
    return s;
}

// src/nhlsel.c:203 l_selection_numpoints() — how many squares are set. It is
// in the binding layer rather than selvar.c, but the walk is the same shape.
export function selection_numpoints(sel) {
    let n = 0;
    const rect = { lx: 0, ly: 0, hx: 0, hy: 0 };

    selection_getbounds(sel, rect);
    for (let x = rect.lx; x <= rect.hx; x++)
        for (let y = rect.ly; y <= rect.hy; y++)
            if (selection_getpoint(x, y, sel))
                n++;
    return n;
}

// src/selvar.c:781 selection_from_mkroom() — the squares belonging to a room.
//
// This is what `selection.room()` in the themeroom Lua resolves to, and with no
// argument it uses the room currently being built (gc.coder->croom).
//
// Note the loop is y OUTER and x inner, the opposite of filter_percent() and
// iterate(). It does not matter here because setpoint order does not affect the
// resulting set, but copying the x-outer shape by habit and then reusing it
// somewhere that DOES draw would.
//
// The membership test is roomno, not the bounding box: an irregular room only
// claims the squares topologize() actually stamped.
export function selection_from_mkroom(croom) {
    const sel = selection_new();

    if (!croom)
        croom = game.coder?.croom;
    if (!croom)
        return sel;

    const rmno = (croom.roomnoidx ?? -1) + ROOMOFFSET;

    for (let y = croom.ly; y <= croom.hy; y++)
        for (let x = croom.lx; x <= croom.hx; x++) {
            const loc = game.level?.at(x, y);
            if (isok(x, y) && loc && !loc.edge && loc.roomno === rmno)
                selection_setpoint(x, y, sel, 1);
        }
    return sel;
}

// src/selvar.c:284 selection_rndcoord() — one uniformly-chosen set square.
//
// Counts the set points first, then spends ONE rn2(count) and walks the same
// x-outer/y-inner order again to reach it. The count pass draws nothing, so a
// selection with no set points spends nothing at all.
//
// `removeit` clears the chosen square, which is how a caller pulling several
// coordinates gets distinct ones.
export function selection_rndcoord(ov, removeit) {
    const rect = { lx: 0, ly: 0, hx: 0, hy: 0 };
    let idx = 0;

    selection_getbounds(ov, rect);

    for (let dx = rect.lx; dx <= rect.hx; dx++)
        for (let dy = rect.ly; dy <= rect.hy; dy++)
            if (selection_getpoint(dx, dy, ov))
                idx++;

    if (idx) {
        let c = rn2(idx);

        for (let dx = rect.lx; dx <= rect.hx; dx++)
            for (let dy = rect.ly; dy <= rect.hy; dy++)
                if (selection_getpoint(dx, dy, ov)) {
                    if (!c) {
                        if (removeit)
                            selection_setpoint(dx, dy, ov, 0);
                        /* handed to Lua, so RELATIVE — see selection_iterate.
                           src/nhlsel.c:414 refreshes croom off the room stack
                           first, so once the stack is empty the map origin is
                           what the coordinate is measured against. */
                        update_croom();
                        const rc = { x: dx, y: dy };
                        cvt_to_relcoord(rc);
                        return rc;
                    }
                    c--;
                }
    }
    return { x: -1, y: -1 };
}

// src/selvar.c:248 selection_filter_mapchar() — keep the squares whose terrain
// matches, optionally also filtering on lit state.
//
// The `lit` argument decides whether this DRAWS. nhlsel.c:663 defaults it to -2
// when the Lua passes only a char, and -2 sets every match unconditionally. The
// -1 arm spends rn2(2) PER MATCHING SQUARE, so a caller that passes it turns a
// silent filter into one of the heavier draw sites in level generation.
export function selection_filter_mapchar(ov, typ, lit) {
    if (!ov)
        return null;

    const ret = selection_new();
    const rect = { lx: 0, ly: 0, hx: 0, hy: 0 };

    selection_getbounds(ov, rect);

    for (let x = rect.lx; x <= rect.hx; x++)
        for (let y = rect.ly; y <= rect.hy; y++) {
            const loc = game.level?.at(x, y);
            if (selection_getpoint(x, y, ov) && loc && match_maptyps(typ, loc.typ)) {
                switch (lit) {
                default:
                case -2:
                    selection_setpoint(x, y, ret, 1);
                    break;
                case -1:
                    selection_setpoint(x, y, ret, rn2(2));
                    break;
                case 0:
                case 1:
                    if ((loc.lit ? 1 : 0) === lit)
                        selection_setpoint(x, y, ret, 1);
                    break;
                }
            }
        }
    return ret;
}

// src/sp_lev.c:217 match_maptyps() — exported for mapfrag_match() (the
// selection.match() pattern overlay in sp_lev.js).
export function match_maptyps(typ, levltyp) {
    if (typ === MATCH_WALL && !IS_STWALL(levltyp))
        return false;
    if (typ < MAX_TYPE && typ !== levltyp)
        return false;
    return true;
}

// src/selvar.c:65 selection_clone()
export function selection_clone(sel) {
    return {
        wid: sel.wid,
        hei: sel.hei,
        bounds_dirty: sel.bounds_dirty,
        bounds: { ...sel.bounds },
        map: sel.map.slice(),
    };
}

// src/selvar.c:321 selection_do_grow() — expand the selection by one square
// in the given directions, IN PLACE.
//
// Draws only when dir is W_RANDOM (one rn2(4) via random_wdir); every level
// script here grows with the default "all" = W_ANY. The scan covers the
// bounds inflated by one, and a square joins when a set neighbour lies in
// any requested direction; diagonals only when both flanking orthogonals
// are requested (W_ANY includes all four, so W_ANY grows diagonally too).
export function selection_do_grow(ov, dir) {
    const rect = { lx: 0, ly: 0, hx: 0, hy: 0 };

    if (!ov)
        return;

    const tmp = selection_new();

    if (dir === W_RANDOM)
        dir = random_wdir();

    selection_getbounds(ov, rect);

    for (let x = Math.max(0, rect.lx - 1);
         x <= Math.min(COLNO - 1, rect.hx + 1); x++)
        for (let y = Math.max(0, rect.ly - 1);
             y <= Math.min(ROWNO - 1, rect.hy + 1); y++) {
            /* note:  dir is a mask of multiple directions, but the only
               way to specify diagonals is by including the two adjacent
               orthogonal directions, which effectively specifies three-
               way growth [WEST|NORTH => WEST plus WEST|NORTH plus NORTH] */
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

    selection_getbounds(tmp, rect);

    for (let x = rect.lx; x <= rect.hx; x++)
        for (let y = rect.ly; y <= rect.hy; y++)
            if (selection_getpoint(x, y, tmp))
                selection_setpoint(x, y, ov, 1);
}

/* src/selvar.c:370 — the floodfill match callback, installed by
   set_floodfillchk_match_under() (sp_lev.c) before each fill. */
let selection_flood_check_func = null;

// src/selvar.c:372 set_selection_floodfillchk()
export function set_selection_floodfillchk(f) {
    selection_flood_check_func = f;
}

// src/selvar.c:379 sel_flood_havepoint() — is <x,y> already queued?
function sel_flood_havepoint(x, y, xs, ys, n) {
    while (n > 0) {
        --n;
        if (xs[n] === x && ys[n] === y)
            return true;
    }
    return false;
}

// src/selvar.c:395 selection_floodfill() — no draws; the check func decides
// membership and `tmp` keeps the fill from revisiting squares. The stack is
// LIFO (pop from the end), which fixes the visit order; the resulting SET is
// order-independent but the shape of the walk is kept as C has it.
export function selection_floodfill(ov, x, y, diagonals) {
    const tmp = selection_new();
    const dx = [], dy = [];
    const SEL_FLOOD = (nx, ny) => { dx.push(nx); dy.push(ny); };
    const SEL_FLOOD_CHKDIR = (mx, my, sel) => {
        if (isok(mx, my)
            && selection_flood_check_func(mx, my)
            && !selection_getpoint(mx, my, sel)
            && !sel_flood_havepoint(mx, my, dx, dy, dx.length))
            SEL_FLOOD(mx, my);
    };

    if (!selection_flood_check_func)
        return;
    SEL_FLOOD(x, y);
    do {
        x = dx.pop();
        y = dy.pop();
        if (isok(x, y)) {
            selection_setpoint(x, y, ov, 1);
            selection_setpoint(x, y, tmp, 1);
        }
        SEL_FLOOD_CHKDIR(x + 1, y, tmp);
        SEL_FLOOD_CHKDIR(x - 1, y, tmp);
        SEL_FLOOD_CHKDIR(x, y + 1, tmp);
        SEL_FLOOD_CHKDIR(x, y - 1, tmp);
        if (diagonals) {
            SEL_FLOOD_CHKDIR(x + 1, y + 1, tmp);
            SEL_FLOOD_CHKDIR(x - 1, y - 1, tmp);
            SEL_FLOOD_CHKDIR(x - 1, y + 1, tmp);
            SEL_FLOOD_CHKDIR(x + 1, y - 1, tmp);
        }
    } while (dx.length > 0);
}

// src/selvar.c:626 selection_do_line() — bresenham line. No draws; the
// walk order of the setpoints does not matter, but the endpoint handling
// does: (x1,y1) is set before the loop and the loop runs until it REACHES
// the far endpoint, so a single-point line sets exactly one square.
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
        } while (x1 !== x2);
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
        } while (y1 !== y2);
    }
}

// src/selvar.c:683 selection_do_randline() — recursive midpoint displacement.
//
// This DRAWS: each split spends an rn2(rough) PAIR per attempt of the
// do-while, retrying while the midpoint lands off the map. The rough
// shrinking (`rough * 2 / 3`) and the recursion depth cap of 12 both bound
// how many pairs one call can cost, and the C's exact retry condition is
// what keeps the count right.
export function selection_do_randline(x1, y1, x2, y2, rough, rec, ov) {
    let mx, my, dx, dy;

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
        } while ((mx > COLNO - 1 || mx < 0 || my < 0 || my > ROWNO - 1));
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
