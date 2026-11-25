// selvar.js — selections: sets of map locations, and the Lua "selection"
// table.
// C ref: selvar.c — selection_new, selection_free, selection_clear,
// selection_clone, selection_getbounds, selection_recalc_bounds,
// selection_getpoint, selection_setpoint, selection_not,
// selection_filter_percent, selection_filter_mapchar, selection_rndcoord,
// selection_from_mkroom.
// C ref: nhlsel.c — l_selection_check, l_selection_push_new,
// l_selection_push_copy, l_selection_new, l_selection_clone,
// l_selection_numpoints, l_selection_not, l_selection_filter_percent,
// l_selection_rndcoord, l_selection_room, l_selection_getbounds,
// l_selection_filter_mapchar, l_selection_iterate, l_selection_register.
//
// A selection is Lua userdata whose metatable's __index is the selection
// method table, so Lua's sel:fn(a) is selection.fn(sel, a). In JS a
// selection is a Selvar object; its prototype methods call the method
// table with the selection prepended, so sel.fn(a) is selection.fn(sel, a)
// and selection.fn() (no selection) is the static call.
//
// Not ported yet: the remaining selection methods (get, randline,
// floodfill, circle, ellipse, gradient, describe_size) and the metatable
// operators other than |, &, ~, + and - (__bor, __band, __bxor, __add,
// __sub; see nhlua.js lua_bor());
// each method raises a Lua error until it is ported.

import { rect_bounds } from './rect.js';
import { game } from './gstate.js';
import { rn2 } from './rng.js';
import {
    lua_error, lua_type, LUA_TFUNCTION, LUA_TNUMBER, luaL_checkinteger, luaL_checkstring,
    luaL_checkoption, splev_chr2typ, nhl_pcall_handle, NHLpa_impossible,
    LuaUserdata,
} from './nhlua.js';
import {
    COLNO, ROWNO, isok, ROOMOFFSET, MAX_TYPE, MATCH_WALL, IS_STWALL,
    INVALID_TYPE, W_NORTH, W_SOUTH, W_EAST, W_WEST, W_ANY, W_RANDOM,
} from './const.js';
import {
    update_croom, cvt_to_relcoord, random_wdir, get_location_coord, ANY_LOC,
    SP_COORD_PACK, SP_COORD_PACK_RANDOM, mapfrag_fromstr, mapfrag_error,
    mapfrag_match,
} from './sp_lev.js';

// C ref: selvar.h struct selectionvar — a Lua "selection" userdata
// (nhlsel.c l_selection_push_new: luaL_setmetatable(L, "selection")).
// l_selection_register() makes Selvar a LuaUserdata subclass (a static
// 'extends' would be evaluated during the nhlua.js/selvar.js import cycle).
const selection_metatable = { __name: 'selection' };
class Selvar {
    constructor() {
        this.metatable = selection_metatable;
    }
}

// C ref: selvar.c selection_new()
export function selection_new() {
    const tmps = new Selvar();
    tmps.wid = COLNO;
    tmps.hei = ROWNO;
    tmps.bounds_dirty = false;
    tmps.bounds = { lx: COLNO, ly: ROWNO, hx: 0, hy: 0 };
    tmps.map = new Int8Array(COLNO * ROWNO).fill(1);
    return tmps;
}

// C ref: selvar.c selection_free()
export function selection_free(sel, freesel) {
    if (sel)
        sel.map = null;
}

// C ref: selvar.c selection_clear()
/* clear selection, setting all locations to value val */
export function selection_clear(sel, val) {
    sel.map.fill(1 + val);
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

// C ref: selvar.c selection_clone()
export function selection_clone(sel) {
    const tmps = new Selvar();
    tmps.wid = sel.wid;
    tmps.hei = sel.hei;
    tmps.bounds_dirty = sel.bounds_dirty;
    tmps.bounds = { ...sel.bounds };
    tmps.map = Int8Array.from(sel.map);
    return tmps;
}

// C ref: selvar.c selection_getbounds()
/* get boundary rect of selection sel into b */
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

// C ref: selvar.c selection_recalc_bounds()
/* recalc the boundary of selection, if necessary */
export function selection_recalc_bounds(sel) {
    let x, y;

    if (!sel.bounds_dirty)
        return;

    sel.bounds.lx = COLNO;
    sel.bounds.ly = ROWNO;
    sel.bounds.hx = sel.bounds.hy = 0;

    const r = { lx: -1, ly: -1, hx: -1, hy: -1 };

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

// C ref: selvar.c selection_getpoint()
export function selection_getpoint(x, y, sel) {
    if (!sel || !sel.map)
        return 0;
    if (x < 0 || y < 0 || x >= sel.wid || y >= sel.hei)
        return 0;

    return (sel.map[sel.wid * y + x] - 1);
}

// C ref: selvar.c selection_setpoint()
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

    /* only set bounds_dirty if changing a point from 1 to 0; if changing
       a point from 0 to 0, nothing has really changed with the bounds */
    } else if (sel.map[sel.wid * y + x] !== 0) {
        sel.bounds_dirty = true;
    }

    sel.map[sel.wid * y + x] = c + 1;
}

// C ref: selvar.c selection_not()
export function selection_not(s) {
    const tmprect = { lx: 0, ly: 0, hx: 0, hy: 0 };

    for (let x = 0; x < s.wid; x++)
        for (let y = 0; y < s.hei; y++)
            selection_setpoint(x, y, s, selection_getpoint(x, y, s) ? 0 : 1);
    selection_getbounds(s, tmprect);
    return s;
}

// C ref: selvar.c selection_filter_percent()
export function selection_filter_percent(ov, percent) {
    const rect = { lx: 0, ly: 0, hx: 0, hy: 0 };

    if (!ov)
        return null;

    const ret = selection_new();

    selection_getbounds(ov, rect);

    for (let x = rect.lx; x <= rect.hx; x++)
        for (let y = rect.ly; y <= rect.hy; y++)
            if (selection_getpoint(x, y, ov) && (rn2(100) < percent))
                selection_setpoint(x, y, ret, 1);

    return ret;
}

// C ref: sp_lev.c match_maptyps()
export function match_maptyps(typ, levltyp) {
    if ((typ === MATCH_WALL) && !IS_STWALL(levltyp))
        return false;
    if ((typ < MAX_TYPE) && (typ !== levltyp))
        return false;
    return true;
}

// C ref: selvar.c selection_filter_mapchar()
export function selection_filter_mapchar(ov, typ, lit) {
    const rect = { lx: 0, ly: 0, hx: 0, hy: 0 };

    if (!ov)
        return null;

    const ret = selection_new();

    selection_getbounds(ov, rect);

    for (let x = rect.lx; x <= rect.hx; x++)
        for (let y = rect.ly; y <= rect.hy; y++)
            if (selection_getpoint(x, y, ov)
                && match_maptyps(typ, game.level.at(x, y).typ)) {
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
                    if ((game.level.at(x, y).lit ? 1 : 0) === lit)
                        selection_setpoint(x, y, ret, 1);
                    break;
                }
            }
    return ret;
}

// C ref: selvar.c selection_rndcoord()
/* c is set to the chosen point, or to <-1,-1>; returns 1 if found */
export function selection_rndcoord(ov, c, removeit) {
    let idx = 0;
    let n;
    let dx, dy;
    const rect = { lx: 0, ly: 0, hx: 0, hy: 0 };

    selection_getbounds(ov, rect);

    for (dx = rect.lx; dx <= rect.hx; dx++)
        for (dy = rect.ly; dy <= rect.hy; dy++)
            if (selection_getpoint(dx, dy, ov))
                idx++;

    if (idx) {
        n = rn2(idx);
        for (dx = rect.lx; dx <= rect.hx; dx++)
            for (dy = rect.ly; dy <= rect.hy; dy++)
                if (selection_getpoint(dx, dy, ov)) {
                    if (!n) {
                        c.x = dx;
                        c.y = dy;
                        if (removeit)
                            selection_setpoint(dx, dy, ov, 0);
                        return 1;
                    }
                    n--;
                }
    }
    c.x = c.y = -1;
    return 0;
}

// C ref: selvar.c selection_do_grow()
export function selection_do_grow(ov, dir) {
    const rect = { lx: 0, ly: 0, hx: 0, hy: 0 };

    if (!ov)
        return;

    const tmp = selection_new();

    if (dir === W_RANDOM)
        dir = random_wdir();

    selection_getbounds(ov, rect);

    for (let x = Math.max(0, rect.lx - 1); x <= Math.min(COLNO - 1, rect.hx + 1); x++)
        for (let y = Math.max(0, rect.ly - 1); y <= Math.min(ROWNO - 1, rect.hy + 1); y++) {
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

    selection_free(tmp, true);
}

// C ref: selvar.c selection_do_line()
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

// C ref: selvar.c selection_do_randline()
export function selection_do_randline(x1, y1, x2, y2, rough, rec, ov) {
    let mx, my;
    let dx, dy;

    if (rec < 1 || (x2 === x1 && y2 === y1))
        return;

    if (rough > Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)))
        rough = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));

    if (rough < 2) {
        mx = Math.trunc((x1 + x2) / 2);
        my = Math.trunc((y1 + y2) / 2);
    } else {
        do {
            dx = rn2(rough) - Math.trunc(rough / 2);
            dy = rn2(rough) - Math.trunc(rough / 2);
            mx = Math.trunc((x1 + x2) / 2) + dx;
            my = Math.trunc((y1 + y2) / 2) + dy;
        } while ((mx > COLNO - 1 || mx < 0 || my < 0 || my > ROWNO - 1));
    }

    if (!selection_getpoint(mx, my, ov)) {
        selection_setpoint(mx, my, ov, 1);
    }

    rough = Math.trunc((rough * 2) / 3);

    rec--;

    selection_do_randline(x1, y1, mx, my, rough, rec, ov);
    selection_do_randline(mx, my, x2, y2, rough, rec, ov);

    selection_setpoint(x2, y2, ov, 1);
}

// C ref: selvar.c set_selection_floodfillchk()
let selection_flood_check_func = null;
export function set_selection_floodfillchk(f) {
    selection_flood_check_func = f;
}

// C ref: selvar.c sel_flood_havepoint()
/* check whethere <x,y> is already in xs[],ys[] */
function sel_flood_havepoint(x, y, xs, ys, n) {
    while (n > 0) {
        --n;
        if (xs[n] === x && ys[n] === y)
            return true;
    }
    return false;
}

// C ref: selvar.c selection_floodfill()
export function selection_floodfill(ov, x, y, diagonals) {
    const tmp = selection_new();
    const SEL_FLOOD_STACK = (COLNO * ROWNO);
    let idx = 0;
    const dx = new Array(SEL_FLOOD_STACK);
    const dy = new Array(SEL_FLOOD_STACK);
    const SEL_FLOOD = (nx, ny) => {
        if (idx < SEL_FLOOD_STACK) {
            dx[idx] = nx;
            dy[idx] = ny;
            idx++;
        } else
            throw new Error('panic: floodfill stack overrun');
    };
    const SEL_FLOOD_CHKDIR = (mx, my, sel) => {
        if (isok(mx, my)
            && selection_flood_check_func(mx, my)
            && !selection_getpoint(mx, my, sel)
            && !sel_flood_havepoint(mx, my, dx, dy, idx))
            SEL_FLOOD(mx, my);
    };

    if (!selection_flood_check_func) {
        selection_free(tmp, true);
        return;
    }
    SEL_FLOOD(x, y);
    do {
        idx--;
        x = dx[idx];
        y = dy[idx];
        if (isok(x, y)) {
            selection_setpoint(x, y, ov, 1);
            selection_setpoint(x, y, tmp, 1);
        }
        SEL_FLOOD_CHKDIR((x + 1), y, tmp);
        SEL_FLOOD_CHKDIR((x - 1), y, tmp);
        SEL_FLOOD_CHKDIR(x, (y + 1), tmp);
        SEL_FLOOD_CHKDIR(x, (y - 1), tmp);
        if (diagonals) {
            SEL_FLOOD_CHKDIR((x + 1), (y + 1), tmp);
            SEL_FLOOD_CHKDIR((x - 1), (y - 1), tmp);
            SEL_FLOOD_CHKDIR((x - 1), (y + 1), tmp);
            SEL_FLOOD_CHKDIR((x + 1), (y - 1), tmp);
        }
    } while (idx > 0);
    selection_free(tmp, true);
}

// C ref: sp_lev.c floodfillchk_match_under(), set_floodfillchk_match_under()
let floodfillchk_match_under_typ = 0;
function floodfillchk_match_under(x, y) {
    return (floodfillchk_match_under_typ === game.level.at(x, y).typ);
}
export function set_floodfillchk_match_under(typ) {
    floodfillchk_match_under_typ = typ;
    set_selection_floodfillchk(floodfillchk_match_under);
}

// C ref: selvar.c selection_iterate()
export function selection_iterate(ov, func, arg) {
    const rect = { lx: 0, ly: 0, hx: 0, hy: 0 };

    if (!ov)
        return;

    selection_getbounds(ov, rect);

    for (let x = rect.lx; x <= rect.hx; x++)
        for (let y = rect.ly; y <= rect.hy; y++)
            if (isok(x, y) && selection_getpoint(x, y, ov))
                func(x, y, arg);
}

// C ref: selvar.c selection_from_mkroom()
export function selection_from_mkroom(croom) {
    const sel = selection_new();

    if (!croom && game.coder && game.coder.croom)
        croom = game.coder.croom;
    if (!croom)
        return sel;

    const rmno = croom.roomnoidx + ROOMOFFSET;
    for (let y = croom.ly; y <= croom.hy; y++)
        for (let x = croom.lx; x <= croom.hx; x++)
            if (isok(x, y) && !game.level.at(x, y).edge
                && game.level.at(x, y).roomno === rmno)
                selection_setpoint(x, y, sel, 1);
    return sel;
}

// --- nhlsel.c: the Lua binding ---

// C ref: nhlsel.c l_selection_check()
export function l_selection_check(v) {
    /* luaL_checktype(L, index, LUA_TUSERDATA); luaL_checkudata() */
    if (!(v instanceof Selvar))
        lua_error('selection expected');
    return v;
}

// C ref: nhlsel.c l_selection_push_copy()
/* push a copy of selectionvar tmp to lua stack */
function l_selection_push_copy(tmp) {
    return selection_clone(tmp);
}

// C ref: nhlsel.c l_selection_new()
/* local sel = selection.new(); */
function l_selection_new() {
    /* l_selection_push_new() */
    return selection_new();
}

// C ref: nhlsel.c l_selection_clone()
/* local sel = selection.clone(sel); */
function l_selection_clone(...args) {
    const sel = l_selection_check(args[0]);
    return selection_clone(sel);
}

// C ref: nhlsel.c l_selection_numpoints()
/* local numpoints = selection.numpoints(sel); */
function l_selection_numpoints(...args) {
    const sel = l_selection_check(args[0]);
    let ret = 0;
    const rect = { lx: 0, ly: 0, hx: 0, hy: 0 };

    selection_getbounds(sel, rect);

    for (let x = rect.lx; x <= rect.hx; x++)
        for (let y = rect.ly; y <= rect.hy; y++)
            if (selection_getpoint(x, y, sel))
                ret++;

    return ret;
}

// C ref: nhlsel.c l_selection_setpoint()
/* selection.set(sel, x, y); */
/* selection.set(sel, x, y, value); */
/* local sel = selection.set(); */
/* local sel = sel:set(); */
/* local sel = selection.set(sel); */
function l_selection_setpoint(...args) {
    let sel = null;
    let x = -1, y = -1;
    let val = 1;
    const argc = args.length;
    let crd = 0;

    if (argc === 0) {
        sel = l_selection_new();
    } else if (argc === 1) {
        sel = l_selection_check(args[0]);
    } else if (argc === 2) {
        x = luaL_checkinteger(args[0]);
        y = luaL_checkinteger(args[1]);
        sel = l_selection_new();
    } else {
        sel = l_selection_check(args[0]);
        x = luaL_checkinteger(args[1]);
        y = luaL_checkinteger(args[2]);
        val = lua_type(args[3]) === 0 /* LUA_TNIL */ ? 1
            : luaL_checkinteger(args[3]); /* luaL_optinteger(L, 4, 1) */
    }

    if (!sel || !sel.map) {
        lua_error('Selection setpoint error'); /* nhl_error() */
        /*NOTREACHED*/
        return 0;
    }

    if (x === -1 && y === -1)
        crd = SP_COORD_PACK_RANDOM(0);
    else
        crd = SP_COORD_PACK(x, y);
    const c = { x, y };
    get_location_coord(c, ANY_LOC, game.coder ? game.coder.croom : null, crd);
    selection_setpoint(c.x, c.y, sel, val);
    return sel;
}

// C ref: nhlsel.c l_selection_and()
/* local sel = selection.area(4,5, 40,10) & selection.rect(7,8, 60,14); */
export function l_selection_and(...args) {
    const sela = l_selection_check(args[0]);
    const selb = l_selection_check(args[1]);
    const selr = selection_new(); /* l_selection_push_new() */
    const rect = { lx: 0, ly: 0, hx: 0, hy: 0 };

    rect_bounds(sela.bounds, selb.bounds, rect);

    for (let x = rect.lx; x <= rect.hx; x++)
        for (let y = rect.ly; y <= rect.hy; y++) {
            const val = (selection_getpoint(x, y, sela)
                         & selection_getpoint(x, y, selb));

            selection_setpoint(x, y, selr, val);
        }

    return selr;
}

// C ref: nhlsel.c l_selection_or()
/* local sel = selection.area(4,5, 40,10) | selection.rect(7,8, 60,14); */
export function l_selection_or(...args) {
    const sela = l_selection_check(args[0]);
    const selb = l_selection_check(args[1]);
    const selr = selection_new(); /* l_selection_push_new() */
    const rect = { lx: 0, ly: 0, hx: 0, hy: 0 };

    rect_bounds(sela.bounds, selb.bounds, rect);

    for (let x = rect.lx; x <= rect.hx; x++)
        for (let y = rect.ly; y <= rect.hy; y++) {
            const val = (selection_getpoint(x, y, sela)
                         | selection_getpoint(x, y, selb));

            selection_setpoint(x, y, selr, val);
        }
    selr.bounds = { ...rect };

    return selr;
}

// C ref: nhlsel.c l_selection_xor()
/* local sel = selection.area(4,5, 40,10) ~ selection.rect(7,8, 60,14); */
export function l_selection_xor(...args) {
    const sela = l_selection_check(args[0]);
    const selb = l_selection_check(args[1]);
    const selr = selection_new(); /* l_selection_push_new() */
    const rect = { lx: 0, ly: 0, hx: 0, hy: 0 };

    rect_bounds(sela.bounds, selb.bounds, rect);

    for (let x = rect.lx; x <= rect.hx; x++)
        for (let y = rect.ly; y <= rect.hy; y++) {
            const val = (selection_getpoint(x, y, sela)
                         ^ selection_getpoint(x, y, selb));

            selection_setpoint(x, y, selr, val);
        }
    /* this may have created a smaller or irregular selection with
     * bounds_dirty set to true - update its boundaries */
    selection_recalc_bounds(selr);

    return selr;
}

// C ref: nhlsel.c l_selection_sub()
/* local sel = selection.area(10,10, 20,20) - selection.area(14,14, 17,17)
 *   - i.e. points that are in A but not in B */
export function l_selection_sub(...args) {
    const sela = l_selection_check(args[0]);
    const selb = l_selection_check(args[1]);
    const selr = selection_new(); /* l_selection_push_new() */
    const rect = { lx: 0, ly: 0, hx: 0, hy: 0 };

    rect_bounds(sela.bounds, selb.bounds, rect);

    for (let x = rect.lx; x <= rect.hx; x++)
        for (let y = rect.ly; y <= rect.hy; y++) {
            const a_pt = selection_getpoint(x, y, sela);
            const b_pt = selection_getpoint(x, y, selb);
            const val = (a_pt ^ b_pt) & a_pt;
            selection_setpoint(x, y, selr, val);
        }
    /* this may have created a smaller or irregular selection with
     * bounds_dirty set to true - update its boundaries */
    selection_recalc_bounds(selr);

    return selr;
}

// C ref: nhlsel.c params_sel_2coords()
/* function(selection, x1,y1, x2,y2) */
/* selection:function(x1,y1, x2,y2) */
/* returns { sel, x1, y1, x2, y2 }, or null if the params are bad */
function params_sel_2coords(args) {
    const argc = args.length;

    if (argc === 4) {
        return { sel: l_selection_new(),
                 x1: luaL_checkinteger(args[0]), y1: luaL_checkinteger(args[1]),
                 x2: luaL_checkinteger(args[2]), y2: luaL_checkinteger(args[3]) };
    } else if (argc === 5) {
        return { sel: l_selection_check(args[0]),
                 x1: luaL_checkinteger(args[1]), y1: luaL_checkinteger(args[2]),
                 x2: luaL_checkinteger(args[3]), y2: luaL_checkinteger(args[4]) };
    }
    return null;
}

// the two get_location_coord() calls the line/rect/fillrect methods make
function sel_2coords_abs(p) {
    const croom = game.coder ? game.coder.croom : null;
    const c1 = { x: p.x1, y: p.y1 }, c2 = { x: p.x2, y: p.y2 };

    get_location_coord(c1, ANY_LOC, croom, SP_COORD_PACK(p.x1, p.y1));
    get_location_coord(c2, ANY_LOC, croom, SP_COORD_PACK(p.x2, p.y2));
    return { x1: c1.x, y1: c1.y, x2: c2.x, y2: c2.y };
}

// C ref: nhlsel.c l_selection_line()
/* local s = selection.line(sel, x1,y1, x2,y2); */
/* local s = selection.line(x1,y1, x2,y2); */
/* s:line(x1,y1, x2,y2); */
function l_selection_line(...args) {
    const p = params_sel_2coords(args);

    if (!p)
        lua_error('selection.line: illegal arguments'); /* nhl_error() */

    const { x1, y1, x2, y2 } = sel_2coords_abs(p);
    const sel = selection_clone(p.sel); /* l_selection_clone() */
    selection_do_line(x1, y1, x2, y2, sel);
    return sel;
}

// C ref: nhlsel.c l_selection_rect()
/* local s = selection.rect(sel, x1,y1, x2,y2); */
function l_selection_rect(...args) {
    const p = params_sel_2coords(args);

    if (!p)
        lua_error('selection.rect: illegal arguments'); /* nhl_error() */

    const { x1, y1, x2, y2 } = sel_2coords_abs(p);
    const sel = selection_clone(p.sel); /* l_selection_clone() */
    selection_do_line(x1, y1, x2, y1, sel);
    selection_do_line(x1, y1, x1, y2, sel);
    selection_do_line(x2, y1, x2, y2, sel);
    selection_do_line(x1, y2, x2, y2, sel);
    return sel;
}

// C ref: nhlsel.c l_selection_fillrect()
/* local s = selection.fillrect(sel, x1,y1, x2,y2); */
/* local s = selection.fillrect(x1,y1, x2,y2); */
/* s:fillrect(x1,y1, x2,y2); */
/* selection.area(x1,y1, x2,y2); */
function l_selection_fillrect(...args) {
    const p = params_sel_2coords(args);

    if (!p)
        lua_error('selection.fillrect: illegal arguments'); /* nhl_error() */

    const { x1, y1, x2, y2 } = sel_2coords_abs(p);
    const sel = selection_clone(p.sel); /* l_selection_clone() */
    if (x1 === x2) {
        for (let y = y1; y <= y2; y++)
            selection_setpoint(x1, y, sel, 1);
    } else {
        for (let y = y1; y <= y2; y++)
            selection_do_line(x1, y, x2, y, sel);
    }
    return sel;
}

// C ref: nhlsel.c l_selection_randline()
/* local s = selection.randline(sel, x1,y1, x2,y2, roughness); */
/* local s = selection.randline(x1,y1, x2,y2, roughness); */
function l_selection_randline(...args) {
    const argc = args.length;
    let sel = null;
    let x1 = 0, y1 = 0, x2 = 0, y2 = 0;
    let roughness = 7;

    if (argc === 6) {
        sel = l_selection_check(args[0]);
        x1 = luaL_checkinteger(args[1]);
        y1 = luaL_checkinteger(args[2]);
        x2 = luaL_checkinteger(args[3]);
        y2 = luaL_checkinteger(args[4]);
        roughness = luaL_checkinteger(args[5]);
    } else if (argc === 5 && lua_type(args[0]) === LUA_TNUMBER) {
        x1 = luaL_checkinteger(args[0]);
        y1 = luaL_checkinteger(args[1]);
        x2 = luaL_checkinteger(args[2]);
        y2 = luaL_checkinteger(args[3]);
        roughness = luaL_checkinteger(args[4]);
        sel = l_selection_new();
    }

    const c = sel_2coords_abs({ x1, y1, x2, y2 });
    sel = selection_clone(sel); /* l_selection_clone() */
    selection_do_randline(c.x1, c.y1, c.x2, c.y2, roughness, 12, sel);
    return sel;
}

// C ref: nhlsel.c l_selection_flood()
/* local s = selection.floodfill(x,y); */
/* local s = selection.floodfill(x,y, diagonals); */
function l_selection_flood(...args) {
    const argc = args.length;
    let sel = null;
    let x = 0, y = 0;
    let diagonals = false;

    if (argc === 2 || argc === 3) {
        x = luaL_checkinteger(args[0]);
        y = luaL_checkinteger(args[1]);
        if (argc === 3)
            diagonals = !!args[2] && args[2] !== undefined; /* lua_toboolean() */
        sel = l_selection_new();
    } else {
        lua_error('wrong parameters'); /* nhl_error() */
        /*NOTREACHED*/
    }

    const c = { x, y };
    get_location_coord(c, ANY_LOC, game.coder ? game.coder.croom : null,
                       SP_COORD_PACK(x, y));

    if (isok(c.x, c.y)) {
        set_floodfillchk_match_under(game.level.at(c.x, c.y).typ);
        selection_floodfill(sel, c.x, c.y, diagonals);
    }
    return sel;
}

// C ref: nhlsel.c l_selection_match()
/* local s = selection.match([[...]]); */
function l_selection_match(...args) {
    const argc = args.length;
    let sel = null;
    let mf = null;

    if (argc === 1) {
        let err;
        const mapstr = luaL_checkstring(args[0]);
        sel = l_selection_new();

        mf = mapfrag_fromstr(mapstr);

        if ((err = mapfrag_error(mf)) !== null) {
            lua_error(err); /* nhl_error() */
            /*NOTREACHED*/
        }
    } else {
        lua_error('wrong parameters'); /* nhl_error() */
        /*NOTREACHED*/
    }

    for (let y = 0; y <= sel.hei; y++)
        for (let x = 1; x < sel.wid; x++)
            selection_setpoint(x, y, sel, mapfrag_match(mf, x, y) ? 1 : 0);

    /* unless the (0, 1) coordinate is a match, this would wind up with a
       selection with lx=COLNO, hx=0, etc, so fix the boundaries */
    selection_recalc_bounds(sel);

    return sel;
}

// C ref: nhlsel.c l_selection_not()
/* local s = selection.negate(sel); */
/* local s = selection.negate(); */
/* local s = sel:negate(); */
function l_selection_not(...args) {
    const argc = args.length;
    let sel;

    if (argc === 0) {
        sel = l_selection_new();
        selection_clear(sel, 1);
        return sel;
    }
    l_selection_check(args[0]);
    const sel2 = l_selection_clone(args[0]);
    selection_not(sel2);
    return sel2;
}

// C ref: nhlsel.c l_selection_filter_percent()
/* local s = selection.percentage(sel, 50); */
function l_selection_filter_percent(...args) {
    const sel = l_selection_check(args[0]);
    const p = luaL_checkinteger(args[1]);

    const tmp = selection_filter_percent(sel, p);
    const ret = l_selection_push_copy(tmp);
    selection_free(tmp, true);

    return ret;
}

// C ref: nhlsel.c l_selection_rndcoord()
/* local pt = selection.rndcoord(sel); */
/* local pt = selection.rndcoord(sel, 1); */
function l_selection_rndcoord(...args) {
    const sel = l_selection_check(args[0]);
    const removeit = lua_type(args[1]) === 0 /* LUA_TNIL */ ? 0
        : luaL_checkinteger(args[1]); /* luaL_optinteger(L, 2, 0) */
    const c = { x: -1, y: -1 };
    selection_rndcoord(sel, c, removeit);
    if (!(c.x === -1 && c.y === -1)) {
        update_croom();
        if (game.coder && game.coder.croom) {
            c.x -= game.coder.croom.lx;
            c.y -= game.coder.croom.ly;
        } else {
            c.x -= game.xstart;
            c.y -= game.ystart;
        }
    }
    return { x: c.x, y: c.y };
}

// C ref: nhlsel.c l_selection_room()
/* local s = selection.room(); */
function l_selection_room(...args) {
    const argc = args.length;
    let croom = null;

    if (argc === 1) {
        const i = luaL_checkinteger(args[0]);

        croom = (i >= 0 && i < game.level.nroom) ? game.level.rooms[i] : null;
    }

    const sel = selection_from_mkroom(croom);

    const ret = l_selection_push_copy(sel);
    selection_free(sel, true);

    return ret;
}

// C ref: nhlsel.c l_selection_getbounds()
/* local rect = sel:bounds(); */
function l_selection_getbounds(...args) {
    const sel = l_selection_check(args[0]);
    const rect = { lx: 0, ly: 0, hx: 0, hy: 0 };

    selection_getbounds(sel, rect);
    return { lx: rect.lx, ly: rect.ly, hx: rect.hx, hy: rect.hy };
}

// C ref: nhlsel.c l_selection_grow()
/* local s = selection.grow(sel); */
/* local s = selection.grow(sel, "north"); */
function l_selection_grow(...args) {
    const growdirs = ['all', 'random', 'north', 'west', 'east', 'south'];
    const growdirs2i = [W_ANY, W_RANDOM, W_NORTH, W_WEST, W_EAST, W_SOUTH, 0];

    l_selection_check(args[0]);
    const dir = growdirs2i[luaL_checkoption(args[1], 'all', growdirs)];

    const sel = l_selection_clone(args[0]);
    selection_do_grow(sel, dir);
    return sel;
}

// C ref: nhlsel.c l_selection_filter_mapchar()
/* local s = selection.filter_mapchar(sel, mapchar, lit); */
function l_selection_filter_mapchar(...args) {
    const sel = l_selection_check(args[0]);
    const mapchr = luaL_checkstring(args[1]);
    /* check_mapchr() (nhlua.c) */
    const typ = mapchr.length === 1 ? splev_chr2typ(mapchr) : INVALID_TYPE;
    const lit = lua_type(args[2]) === 0 /* LUA_TNIL */ ? -2
        : luaL_checkinteger(args[2]); /* TODO: special lit values */

    if (typ === INVALID_TYPE)
        lua_error('Erroneous map char'); /* nhl_error() */

    const tmp = selection_filter_mapchar(sel, typ, lit);
    const ret = l_selection_push_copy(tmp);
    selection_free(tmp, true);

    return ret;
}

// C ref: nhlsel.c l_selection_iterate()
/*
 * Iterate over all selection points and call the Lua function for each.
 * The x, y coordinates passed to the function are map- or room-relative
 * rather than absolute, unless there has been no previous map or room
 * defined.
 */
function l_selection_iterate(L, args) {
    const argc = args.length;
    const rect = { lx: 0, ly: 0, hx: 0, hy: 0 };

    if (argc === 2 && lua_type(args[1]) === LUA_TFUNCTION) {
        const sel = l_selection_check(args[0]);
        const fn = args[1];
        selection_getbounds(sel, rect);
        for (let y = rect.ly; y <= rect.hy; y++) {
            for (let x = Math.max(1, rect.lx); x <= rect.hx; x++)
                if (selection_getpoint(x, y, sel)) {
                    const tmp = { x, y };
                    cvt_to_relcoord(tmp);
                    if (nhl_pcall_handle(L, fn, [tmp.x, tmp.y],
                                         'l_selection_iterate',
                                         NHLpa_impossible)) {
                        /* abort loops to prevent possible error cascade */
                        return 0;
                    }
                }
        }
    } else {
        lua_error('wrong parameters'); /* nhl_error() */
    }
    return 0;
}

// C ref: nhlsel.c l_selection_methods[] — the names, in C's order.
const l_selection_names = [
    'new', 'clone', 'get', 'set', 'numpoints', 'negate', 'percentage',
    'rndcoord', 'line', 'randline', 'rect', 'fillrect', 'area', 'grow',
    'filter_mapchar', 'match', 'floodfill', 'circle', 'ellipse', 'gradient',
    'iterate', 'bounds', 'room', 'describe_size',
];

function selection_not_ported(name) {
    return function selection_not_ported_yet() {
        lua_error(`selection.${name} is not ported yet`);
    };
}

// C ref: nhlsel.c l_selection_register()
export function l_selection_register(L) {
    /* Table of instance methods and static methods. */
    const selection = {};
    for (const name of l_selection_names)
        selection[name] = selection_not_ported(name);
    selection.new = l_selection_new;
    selection.clone = l_selection_clone;
    selection.set = l_selection_setpoint;
    selection.line = l_selection_line;
    selection.rect = l_selection_rect;
    selection.fillrect = l_selection_fillrect;
    selection.area = l_selection_fillrect;
    selection.match = l_selection_match;
    selection.randline = l_selection_randline;
    selection.floodfill = l_selection_flood;
    selection.numpoints = l_selection_numpoints;
    selection.negate = l_selection_not;
    selection.percentage = l_selection_filter_percent;
    selection.rndcoord = l_selection_rndcoord;
    selection.filter_mapchar = l_selection_filter_mapchar;
    selection.grow = l_selection_grow;
    selection.iterate = (...args) => l_selection_iterate(L, args);
    selection.bounds = l_selection_getbounds;
    selection.room = l_selection_room;

    /* luaL_newmetatable(L, "selection"): selections are userdata */
    Object.setPrototypeOf(Selvar.prototype, LuaUserdata.prototype);
    selection_metatable.__index = selection;
    selection_metatable.__band = l_selection_and;
    selection_metatable.__bor = l_selection_or;
    selection_metatable.__bxor = l_selection_xor;
    selection_metatable.__add = l_selection_or; /* this aliases + to be the same as | */
    selection_metatable.__sub = l_selection_sub;

    /* metatable.__index points at the selection method table:
       sel:fn(...) is selection.fn(sel, ...) */
    for (const name of l_selection_names) {
        Object.defineProperty(Selvar.prototype, name, {
            configurable: true,
            writable: true,
            value: function (...args) { return selection[name](this, ...args); },
        });
    }

    /* global selection = the method table we created at the start */
    L.globals.selection = selection;
}
