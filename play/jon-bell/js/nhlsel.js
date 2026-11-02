// nhlsel.js — C ref: nhlsel.c.
import { INVALID_TYPE, isok } from './const.js';
import { game } from './gstate.js';
import { check_mapchr } from './nhlua.js';
import { selection_clone, selection_do_line, selection_do_randline, selection_filter_mapchar, selection_floodfill, selection_new, selection_recalc_bounds, selection_rndcoord, selection_setpoint } from './selvar.js';
import { SP_COORD_PACK, SP_COORD_PACK_RANDOM, cvt_to_relcoord, get_location_coord, mapfrag_error, mapfrag_free, mapfrag_fromstr, mapfrag_match, set_floodfillchk_match_under, update_croom } from './sp_lev.js';
import { ANY_LOC } from './sp_lev_loc.js';

/* C ref: nhlsel.c:655-678 l_selection_filter_mapchar — the Lua wrapper.
 * `lit` defaults to -2 (luaL_optinteger), and an unrecognised map char is a
 * hard nhl_error, not a silent empty selection. */
export function l_selection_filter_mapchar(sel, mapchr, lit) {
    const typ = check_mapchr(mapchr == null ? '' : String(mapchr));
    if (typ === INVALID_TYPE)
        throw new Error('Erroneous map char');
    return selection_filter_mapchar(sel, typ, (lit == null) ? -2 : (Number(lit) | 0));
}

export function l_selection_flood(x, y, diagonals) {
    const sel = selection_new();
    const coord = { x: x | 0, y: y | 0 };
    get_location_coord(coord, ANY_LOC, game.gc?.coder?.croom ?? null,
                       SP_COORD_PACK(coord.x, coord.y));
    if (isok(coord.x, coord.y)) {
        set_floodfillchk_match_under(game.level?.at(coord.x, coord.y)?.typ ?? 0);
        selection_floodfill(sel, coord.x, coord.y, !!diagonals);
    }
    return sel;
}

/* ─── params_sel_2coords — C ref: nhlsel.c:474-504 ────────────────────────────
 * The shared argument decoder for selection.line / selection.rect /
 * selection.fillrect (== selection.area).  C dispatches on lua_gettop, and the
 * two accepted arities differ in WHICH selection the result is built on:
 *   argc==4  (x1,y1, x2,y2)      -> a BRAND NEW selection (l_selection_new)
 *   argc==5  (sel, x1,y1, x2,y2) -> the caller's `sel`
 * anything else returns FALSE, which every caller turns into nhl_error.
 * Lua method desugaring makes `s:line(x1,y1,x2,y2)` argc==5, so both shapes
 * arrive here through the same binding.
 * Returns null for the error case; { sel, x1, y1, x2, y2 } otherwise. */
function params_sel_2coords(args) {
    if (args.length === 4) {
        return {
            sel: selection_new(),
            x1: Number(args[0]) | 0, y1: Number(args[1]) | 0,
            x2: Number(args[2]) | 0, y2: Number(args[3]) | 0,
        };
    } else if (args.length === 5) {
        return {
            sel: args[0],
            x1: Number(args[1]) | 0, y1: Number(args[2]) | 0,
            x2: Number(args[3]) | 0, y2: Number(args[4]) | 0,
        };
    }
    return null;
}

/* The get_location_coord + l_selection_clone preamble those same three C
 * bodies share verbatim (e.g. nhlsel.c:569-576).  Note the CLONE: C works on a
 * copy and returns the copy, so `s:fillrect(...)` as a bare Lua statement
 * leaves `s` UNCHANGED — a quirk of the C API, ported as-is (Cardinal Rule 1).
 * Returns { sel, c1, c2 } where sel is the clone to draw into. */
function sel_2coords_prep(p) {
    const c1 = { x: p.x1, y: p.y1 };
    get_location_coord(c1, ANY_LOC, game.gc?.coder?.croom ?? null,
                       SP_COORD_PACK(p.x1, p.y1));
    const c2 = { x: p.x2, y: p.y2 };
    get_location_coord(c2, ANY_LOC, game.gc?.coder?.croom ?? null,
                       SP_COORD_PACK(p.x2, p.y2));
    return { sel: selection_clone(p.sel), c1, c2 };
}

export function l_selection_fillrect(...args) {
    const p = params_sel_2coords(args);
    if (!p)
        throw new Error('selection.fillrect: illegal arguments');
    const { sel, c1, c2 } = sel_2coords_prep(p);
    if (c1.x === c2.x) {
        for (let y = c1.y; y <= c2.y; y++)
            selection_setpoint(c1.x, y, sel, 1);
    } else {
        for (let y = c1.y; y <= c2.y; y++)
            selection_do_line(c1.x, y, c2.x, y, sel);
    }
    return sel;
}

/* ─── l_selection_line — C ref: nhlsel.c:504-527 (registered as
 * selection.line) ────────────────────────────────────────────────────────────
 * Was a record-only stub, so every `selection.line(...)` returned undefined and
 * the des.terrain / `|` union it feeds got nothing: bigrm-1.lua:37-49,
 * valley.lua:38-48 and minetn-5.lua:38-58 drew none of their terrain lines.
 * RNG: none. */
export function l_selection_line(...args) {
    const p = params_sel_2coords(args);
    if (!p)
        throw new Error('selection.line: illegal arguments');
    const { sel, c1, c2 } = sel_2coords_prep(p);
    selection_do_line(c1.x, c1.y, c2.x, c2.y, sel);
    return sel;
}

/* ─── l_selection_rect — C ref: nhlsel.c:528-553 (registered as
 * selection.rect) ────────────────────────────────────────────────────────────
 * The four edges of the rectangle, in C's order. Note C's THIRD call is
 * selection_do_line(x1,y1, x1,y2) and its second is (x1,y1, x2,y1) — the
 * top edge, left edge, right edge, bottom edge, with y1/y2 as written (C does
 * not sort the corners). Was a record-only stub. RNG: none. */
export function l_selection_rect(...args) {
    const p = params_sel_2coords(args);
    if (!p)
        throw new Error('selection.rect: illegal arguments');
    const { sel, c1, c2 } = sel_2coords_prep(p);
    selection_do_line(c1.x, c1.y, c2.x, c1.y, sel);
    selection_do_line(c1.x, c1.y, c1.x, c2.y, sel);
    selection_do_line(c2.x, c1.y, c2.x, c2.y, sel);
    selection_do_line(c1.x, c2.y, c2.x, c2.y, sel);
    return sel;
}

/* ─── l_selection_match — C ref: nhlsel.c:680-717 (registered as
 * selection.match) ───────────────────────────────────────────────────────────
 * Build a fresh selection holding every map position whose surroundings match
 * the mapfragment string. Was a record-only stub returning undefined, and
 * tut-1.lua:122-123 does
 *     des.region(selection.match("#"), "unlit");
 *     des.region(selection.match(" "), "unlit");
 * so lspo_region was handed `undefined` and the tutorial's corridors and solid
 * rock were never unlit — while C darkens both.
 *
 * The loop bounds are C's, quirks included: y runs 0..sel->hei INCLUSIVE (the
 * last iteration is dropped by selection_setpoint's own guard) and x starts at
 * 1, so column 0 is never tested. selection_recalc_bounds afterwards is C's own
 * fix-up for the "nothing matched at (0,1)" case. RNG: none. */
export function l_selection_match(mapstr) {
    const sel = selection_new();
    const mf = mapfrag_fromstr(String(mapstr));
    const err = mapfrag_error(mf);
    if (err != null)
        throw new Error(err);
    for (let y = 0; y <= sel.hei; y++)
        for (let x = 1; x < sel.wid; x++)
            selection_setpoint(x, y, sel, mapfrag_match(mf, x, y) ? 1 : 0);
    selection_recalc_bounds(sel);
    mapfrag_free(mf);
    return sel;
}

export function l_selection_randline(sel, x1, y1, x2, y2, rough) {
    const c1 = { x: x1, y: y1 };
    get_location_coord(c1, ANY_LOC, game.gc?.coder?.croom ?? null,
                       SP_COORD_PACK(x1, y1));
    const c2 = { x: x2, y: y2 };
    get_location_coord(c2, ANY_LOC, game.gc?.coder?.croom ?? null,
                       SP_COORD_PACK(x2, y2));
    const clone = selection_clone(sel);
    selection_do_randline(c1.x, c1.y, c2.x, c2.y, rough, 12, clone);
    return clone;
}

export function l_selection_rndcoord(sel, removeit) {
    const xRef = { value: -1 }, yRef = { value: -1 };
    selection_rndcoord(sel, xRef, yRef, removeit ? 1 : 0);
    const coord = { x: xRef.value, y: yRef.value };
    if (!(coord.x === -1 && coord.y === -1)) {
        update_croom();
        cvt_to_relcoord(coord);
    }
    return { x: coord.x, y: coord.y };
}

export function l_selection_setpoint(...args) {
    const argc = args.length;
    let sel = null;
    let x = -1, y = -1;
    let val = 1;

    if (argc === 0) {
        selection_new(); /* C: (void) l_selection_new(L) — sel stays NULL */
    } else if (argc === 1) {
        sel = args[0];
    } else if (argc === 2) {
        x = Number(args[0]) | 0;
        y = Number(args[1]) | 0;
        /* C pops the two integers and pushes a fresh selection, which then
         * becomes slot 1 — i.e. the point lands in a NEW selection, and that
         * new selection is what gets returned. */
        sel = selection_new();
    } else {
        sel = args[0];
        x = Number(args[1]) | 0;
        y = Number(args[2]) | 0;
        val = (args[3] == null) ? 1 : (Number(args[3]) | 0);
    }

    if (!sel || !sel.map)
        throw new Error('Selection setpoint error');

    const crd = (x === -1 && y === -1) ? SP_COORD_PACK_RANDOM(0)
                                       : SP_COORD_PACK(x, y);
    const coord = { x, y };
    get_location_coord(coord, ANY_LOC, game.gc?.coder?.croom ?? null, crd);
    selection_setpoint(coord.x, coord.y, sel, val);
    return sel; /* C: lua_settop(L, 1); return 1 */
}
