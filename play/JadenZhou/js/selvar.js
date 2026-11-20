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
// Not ported yet: the remaining selection methods (get, set, line, randline,
// rect, fillrect/area, grow, match, floodfill, circle, ellipse, gradient,
// describe_size) and the metatable operators; each method raises a Lua
// error until it is ported.

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import {
    lua_error, lua_type, LUA_TFUNCTION, luaL_checkinteger, luaL_checkstring,
    splev_chr2typ, nhl_pcall_handle, NHLpa_impossible,
} from './nhlua.js';
import {
    COLNO, ROWNO, isok, ROOMOFFSET, MAX_TYPE, MATCH_WALL, IS_STWALL,
    INVALID_TYPE,
} from './const.js';
import { update_croom, cvt_to_relcoord } from './sp_lev.js';

// C ref: selvar.h struct selectionvar — a Lua "selection" userdata.
class Selvar {}

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
function l_selection_check(v) {
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
    selection.numpoints = l_selection_numpoints;
    selection.negate = l_selection_not;
    selection.percentage = l_selection_filter_percent;
    selection.rndcoord = l_selection_rndcoord;
    selection.filter_mapchar = l_selection_filter_mapchar;
    selection.iterate = (...args) => l_selection_iterate(L, args);
    selection.bounds = l_selection_getbounds;
    selection.room = l_selection_room;

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
