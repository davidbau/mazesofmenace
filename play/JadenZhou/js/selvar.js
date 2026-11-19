// selvar.js — selections: sets of map locations, and the Lua "selection"
// table.
// C ref: selvar.c — l_selection_register.
//
// Not ported yet: the selection functions themselves. l_selection_register()
// registers the selection table so ported Lua can reference it; each
// function raises a Lua error until it is ported.

import { lua_error } from './nhlua.js';
import { COLNO, ROWNO } from './const.js';

// C ref: selvar.c selection_new()
export function selection_new() {
    const tmps = {
        wid: COLNO,
        hei: ROWNO,
        bounds_dirty: false,
        bounds: { lx: COLNO, ly: ROWNO, hx: 0, hy: 0 },
        map: new Int8Array(COLNO * ROWNO).fill(1),
    };
    return tmps;
}

// C ref: selvar.c selection_free()
export function selection_free(sel, freesel) {
    if (sel)
        sel.map = null;
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

// C ref: selvar.c l_selection_methods[] — the names only.
const l_selection_names = [
    'new', 'clone', 'get', 'set', 'numpoints', 'negate', 'percentage',
    'rndcoord', 'room', 'line', 'randline', 'rect', 'fillrect', 'area',
    'grow', 'filter_mapchar', 'match', 'floodfill', 'circle', 'ellipse',
    'gradient', 'iterate', 'bounds',
];

function selection_not_ported(name) {
    return function selection_not_ported_yet() {
        lua_error(`selection.${name} is not ported yet`);
    };
}

// C ref: selvar.c l_selection_register()
export function l_selection_register(L) {
    const selection = {};
    for (const name of l_selection_names)
        selection[name] = selection_not_ported(name);
    L.globals.selection = selection;
}
