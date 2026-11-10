import { C } from "./c-runtime.js";

/* NetHack 5.0	nhlua.c	$NHDT-Date: 1769840272 2026/01/30 22:17:52 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.69 $ */

/*      Copyright (c) 2018 by Pasi Kallinen */

/* NetHack may be freely redistributed.  See license for details. */

/* lua_CFunction prototypes */

/* There doesn't seem to be a point in having a l_selection_add since it would
 * do the same thing as l_selection_or. The addition operator is mapped to
 * l_selection_or. */

/* the following do not appear to currently be
   used and because they are static, the OSX
   compiler is complaining about them. I've
   if ifdef'd out the prototype here and the
   function body below.
 */

export function l_selection_check(L, index)
{
    let sel;

    C.luaL_checktype(L, index, C.LUA_TUSERDATA);
    sel = C.luaL_checkudata(L, index, "selection");
    if (!sel)
        C.nhl_error(L, "Selection error");
    return sel;
}


export function l_selection_gc(L)
{
    let sel = l_selection_check(L, 1);

    if (sel)
        C.selection_free(sel, C.FALSE);
    return 0;
}


/* push a new selection into lua stack, return the selectionvar */

export function l_selection_push_new(L)
{
    let tmp = C.selection_new();
    let sel
   = C.lua_newuserdata(L, C.selectionSize);

    C.luaL_getmetatable(L, "selection");
    C.lua_setmetatable(L, -2);

    C.copySelection(sel, tmp);
    sel.map = C.dupstr(tmp.map);
    C.selection_free(tmp, C.TRUE);

    return sel;
}


/* push a copy of selectionvar tmp to lua stack */

export function l_selection_push_copy(L, tmp)
{
    let sel
   = C.lua_newuserdata(L, C.selectionSize);

    C.luaL_getmetatable(L, "selection");
    C.lua_setmetatable(L, -2);

    C.copySelection(sel, tmp);
    sel.map = C.dupstr(tmp.map);
}


/* local sel = selection.new(); */

export function l_selection_new(L)
{
    l_selection_push_new(L);
    return 1;
}


/* Replace the topmost selection in the stack with a clone of it. */

/* local sel = selection.clone(sel); */

export function l_selection_clone(L)
{
    let sel = l_selection_check(L, 1);
    let tmp;

    l_selection_new(L);
    tmp = l_selection_check(L, 2);
    if (tmp.map)
        C.free(tmp.map);
    C.copySelection(tmp, sel);
    tmp.map = C.dupstr(sel.map);
    return 1;
}


/* selection.set(sel, x, y); */

/* selection.set(sel, x, y, value); */

/* local sel = selection.set(); */

/* local sel = sel:set(); */

/* local sel = selection.set(sel); */

/* TODO: allow setting multiple coords at once: set({x1,y1},{x2,y2},...); */

export function l_selection_setpoint(L)
{
    let sel = 0;
    let x = -1, y = -1;
    let val = 1;
    let argc = C.lua_gettop(L);
    let crd = 0n;

    if (argc == 0) {
        l_selection_new(L);
    } else if (argc == 1) {
        sel = l_selection_check(L, 1);
    } else if (argc == 2) {
        x = C.coordxy(C.luaL_checkinteger(L, 1));
        y = C.coordxy(C.luaL_checkinteger(L, 2));
        C.lua_pop(L, 2);
        l_selection_new(L);
        sel = l_selection_check(L, 1);
    } else {
        sel = l_selection_check(L, 1);
        x = C.coordxy(C.luaL_checkinteger(L, 2));
        y = C.coordxy(C.luaL_checkinteger(L, 3));
        val = C.int(C.luaL_optinteger(L, 4, 1));
    }

    if (!sel || !sel.map) {
        C.nhl_error(L, "Selection setpoint error");
        /*NOTREACHED*/
        return 0;
    }

    if (x == -1 && y == -1)
        crd = C.SP_COORD_PACK_RANDOM(0);
    else
        crd = C.SP_COORD_PACK(x,y);
    C.get_location_coord(C.ref(() => x, value => { x = value; }), C.ref(() => y, value => { y = value; }), C.ANY_LOC,
                       C.gc.coder ? C.gc.coder.croom : 0, crd);
    C.selection_setpoint(x, y, sel, val);
    C.lua_settop(L, 1);
    return 1;
}


/* local numpoints = selection.numpoints(sel); */

export function l_selection_numpoints(L)
{
    let sel = l_selection_check(L, 1);
    let x, y;
    let ret = 0;
    const rect = C.rectLocal(C.cg.zeroNhRect);

    C.selection_getbounds(sel, rect);

    for (x = rect.lx; x <= rect.hx; x++)
        for (y = rect.ly; y <= rect.hy; y++)
            if (C.selection_getpoint(x, y, sel))
                ret++;

    C.lua_settop(L, 0);
    C.lua_pushinteger(L, ret);
    return 1;
}


/* local value = selection.get(sel, x, y); */

export function l_selection_getpoint(L)
{
    let sel = l_selection_check(L, 1);
    let x, y;
    let ix, iy;
    let val;
    let crd;

    C.lua_remove(L, 1); /* sel */
    if (!C.nhl_get_xy_params(L, C.ref(() => ix, value => { ix = value; }), C.ref(() => iy, value => { iy = value; }))) {
        C.nhl_error(L, "l_selection_getpoint: Incorrect params");
        /*NOTREACHED*/
        return 0;
    }
    x = C.coordxy(ix);
    y = C.coordxy(iy);

    if (x == -1 && y == -1)
        crd = C.SP_COORD_PACK_RANDOM(0);
    else
        crd = C.SP_COORD_PACK(x,y);
    C.get_location_coord(C.ref(() => x, value => { x = value; }), C.ref(() => y, value => { y = value; }), C.ANY_LOC,
                       C.gc.coder ? C.gc.coder.croom : 0, crd);

    val = C.selection_getpoint(x, y, sel);
    C.lua_settop(L, 0);
    C.lua_pushnumber(L, val);
    return 1;
}


/* local s = selection.negate(sel); */

/* local s = selection.negate(); */

/* local s = sel:negate(); */

export function l_selection_not(L)
{
    let argc = C.lua_gettop(L);
    let sel, sel2;

    if (argc == 0) {
        l_selection_new(L);
        sel = l_selection_check(L, 1);
        C.selection_clear(sel, 1);
    } else {
        l_selection_check(L, 1);
        l_selection_clone(L);
        sel2 = l_selection_check(L, 2);
        C.selection_not(sel2);
        C.lua_remove(L, 1);
    }
    return 1;
}


/* local sel = selection.area(4,5, 40,10) & selection.rect(7,8, 60,14); */

export function l_selection_and(L)
{
    let x, y;
    let sela = l_selection_check(L, 1);
    let selb = l_selection_check(L, 2);
    let selr = l_selection_push_new(L);
    const rect = C.rectLocal(C.cg.zeroNhRect);

    C.rect_bounds(sela.bounds, selb.bounds, rect);

    for (x = rect.lx; x <= rect.hx; x++)
        for (y = rect.ly; y <= rect.hy; y++) {
            let val = (C.selection_getpoint(x, y, sela)
                       & C.selection_getpoint(x, y, selb));

            C.selection_setpoint(x, y, selr, val);
        }

    C.lua_remove(L, 1);
    C.lua_remove(L, 1);
    return 1;
}


/* local sel = selection.area(4,5, 40,10) | selection.rect(7,8, 60,14); */

export function l_selection_or(L)
{
    let x,y;
    let sela = l_selection_check(L, 1);
    let selb = l_selection_check(L, 2);
    let selr = l_selection_push_new(L);
    const rect = C.rectLocal(C.cg.zeroNhRect);

    C.rect_bounds(sela.bounds, selb.bounds, rect);

    for (x = rect.lx; x <= rect.hx; x++)
        for (y = rect.ly; y <= rect.hy; y++) {
            let val = (C.selection_getpoint(x, y, sela)
                       | C.selection_getpoint(x, y, selb));

            C.selection_setpoint(x, y, selr, val);
        }
    C.copyRect(selr.bounds, rect);

    C.lua_remove(L, 1);
    C.lua_remove(L, 1);
    return 1;
}


/* local sel = selection.area(4,5, 40,10) ~ selection.rect(7,8, 60,14); */

export function l_selection_xor(L)
{
    let x,y;
    let sela = l_selection_check(L, 1);
    let selb = l_selection_check(L, 2);
    let selr = l_selection_push_new(L);
    const rect = C.rectLocal(C.cg.zeroNhRect);

    C.rect_bounds(sela.bounds, selb.bounds, rect);

    for (x = rect.lx; x <= rect.hx; x++)
        for (y = rect.ly; y <= rect.hy; y++) {
            let val = (C.selection_getpoint(x, y, sela)
                       ^ C.selection_getpoint(x, y, selb));

            C.selection_setpoint(x, y, selr, val);
        }
    /* this may have created a smaller or irregular selection with
     * bounds_dirty set to true - update its boundaries */
    C.selection_recalc_bounds(selr);

    C.lua_remove(L, 1);
    C.lua_remove(L, 1);
    return 1;
}


/* local sel = selection.area(10,10, 20,20) - selection.area(14,14, 17,17)
 *   - i.e. points that are in A but not in B */

export function l_selection_sub(L)
{
    let x,y;
    let sela = l_selection_check(L, 1);
    let selb = l_selection_check(L, 2);
    let selr = l_selection_push_new(L);
    const rect = C.rectLocal(C.cg.zeroNhRect);

    C.rect_bounds(sela.bounds, selb.bounds, rect);

    for (x = rect.lx; x <= rect.hx; x++)
        for (y = rect.ly; y <= rect.hy; y++) {
            let a_pt = C.selection_getpoint(x, y, sela);
            let b_pt = C.selection_getpoint(x, y, selb);
            let val = (a_pt ^ b_pt) & a_pt;
            C.selection_setpoint(x, y, selr, val);
        }
    /* this may have created a smaller or irregular selection with
     * bounds_dirty set to true - update its boundaries */
    C.selection_recalc_bounds(selr);

    C.lua_remove(L, 1);
    C.lua_remove(L, 1);
    return 1;
}


/* local s = selection.percentage(sel, 50); */

export function l_selection_filter_percent(L)
{
    let argc = C.lua_gettop(L);
    let sel = l_selection_check(L, 1);
    let p = C.int(C.luaL_checkinteger(L, 2));
    let tmp;

    tmp = C.selection_filter_percent(sel, p);
    C.lua_pop(L, argc);
    l_selection_push_copy(L, tmp);
    C.selection_free(tmp, C.TRUE);

    return 1;
}


/* local pt = selection.rndcoord(sel); */

/* local pt = selection.rndcoord(sel, 1); */

export function l_selection_rndcoord(L)
{
    let sel = l_selection_check(L, 1);
    let removeit = C.int(C.luaL_optinteger(L, 2, 0));
    let x = -1, y = -1;
    C.selection_rndcoord(sel, C.ref(() => x, value => { x = value; }), C.ref(() => y, value => { y = value; }), removeit);
    if (!(x == -1 && y == -1)) {
        C.update_croom();
        if (C.gc.coder && C.gc.coder.croom) {
            x = C.coordxy(x - C.gc.coder.croom.lx);
            y = C.coordxy(y - C.gc.coder.croom.ly);
        } else {
            x = C.coordxy(x - C.gx.xstart);
            y = C.coordxy(y - C.gy.ystart);
        }
    }
    C.lua_settop(L, 0);
    C.lua_newtable(L);
    C.nhl_add_table_entry_int(L, "x", x);
    C.nhl_add_table_entry_int(L, "y", y);
    return 1;
}


/* local s = selection.room(); */

export function l_selection_room(L)
{
    let sel;
    let argc = C.lua_gettop(L);
    let croom = 0;

    if (argc == 1) {
        let i = C.int(C.luaL_checkinteger(L, -1));

        croom = (i >= 0 && i < C.svn.nroom) ? C.svr.rooms[i] : 0;
    }

    sel = C.selection_from_mkroom(croom);

    l_selection_push_copy(L, sel);
    C.selection_free(sel, C.TRUE);

    return 1;
}


/* local rect = sel:bounds(); */

export function l_selection_getbounds(L)
{
    let sel = l_selection_check(L, 1);
    const rect = C.rectLocal(C.cg.zeroNhRect);

    C.selection_getbounds(sel, rect);
    C.lua_settop(L, 0);
    C.lua_newtable(L);
    C.nhl_add_table_entry_int(L, "lx", rect.lx);
    C.nhl_add_table_entry_int(L, "ly", rect.ly);
    C.nhl_add_table_entry_int(L, "hx", rect.hx);
    C.nhl_add_table_entry_int(L, "hy", rect.hy);
    return 1;
}


/* internal function to get a selection and 4 integer values from lua stack.
   removes the integers from the stack.
   returns TRUE if params are good.
*/

/* function(selection, x1,y1, x2,y2) */

/* selection:function(x1,y1, x2,y2) */

export function params_sel_2coords(L, sel, x1, y1, x2, y2)
{
    let argc = C.lua_gettop(L);

    if (argc == 4) {
        l_selection_new(L);
        x1.value = C.coordxy(C.luaL_checkinteger(L, 1));
        y1.value = C.coordxy(C.luaL_checkinteger(L, 2));
        x2.value = C.coordxy(C.luaL_checkinteger(L, 3));
        y2.value = C.coordxy(C.luaL_checkinteger(L, 4));
        sel.value = l_selection_check(L, 5);
        C.lua_remove(L, 1);
        C.lua_remove(L, 1);
        C.lua_remove(L, 1);
        C.lua_remove(L, 1);
        return C.TRUE;
    } else if (argc == 5) {
        sel.value = l_selection_check(L, 1);
        x1.value = C.coordxy(C.luaL_checkinteger(L, 2));
        y1.value = C.coordxy(C.luaL_checkinteger(L, 3));
        x2.value = C.coordxy(C.luaL_checkinteger(L, 4));
        y2.value = C.coordxy(C.luaL_checkinteger(L, 5));
        C.lua_pop(L, 4);
        return C.TRUE;
    }
    return C.FALSE;
}


/* local s = selection.line(sel, x1,y1, x2,y2); */

/* local s = selection.line(x1,y1, x2,y2); */

/* s:line(x1,y1, x2,y2); */

export function l_selection_line(L)
{
    let sel = 0;
    let x1, y1, x2, y2;

    if (!params_sel_2coords(L, C.ref(() => sel, value => { sel = value; }), C.ref(() => x1, value => { x1 = value; }), C.ref(() => y1, value => { y1 = value; }), C.ref(() => x2, value => { x2 = value; }), C.ref(() => y2, value => { y2 = value; }))) {
        C.nhl_error(L, "selection.line: illegal arguments");
    }

    C.get_location_coord(C.ref(() => x1, value => { x1 = value; }), C.ref(() => y1, value => { y1 = value; }), C.ANY_LOC, C.gc.coder ? C.gc.coder.croom : 0,
                       C.SP_COORD_PACK(x1, y1));
    C.get_location_coord(C.ref(() => x2, value => { x2 = value; }), C.ref(() => y2, value => { y2 = value; }), C.ANY_LOC, C.gc.coder ? C.gc.coder.croom : 0,
                       C.SP_COORD_PACK(x2, y2));

    l_selection_clone(L);
    sel = l_selection_check(L, 2);
    C.selection_do_line(x1,y1,x2,y2, sel);
    return 1;
}


/* local s = selection.rect(sel, x1,y1, x2,y2); */

export function l_selection_rect(L)
{
    let sel = 0;
    let x1, y1, x2, y2;

    if (!params_sel_2coords(L, C.ref(() => sel, value => { sel = value; }), C.ref(() => x1, value => { x1 = value; }), C.ref(() => y1, value => { y1 = value; }), C.ref(() => x2, value => { x2 = value; }), C.ref(() => y2, value => { y2 = value; }))) {
        C.nhl_error(L, "selection.rect: illegal arguments");
    }

    C.get_location_coord(C.ref(() => x1, value => { x1 = value; }), C.ref(() => y1, value => { y1 = value; }), C.ANY_LOC, C.gc.coder ? C.gc.coder.croom : 0,
                       C.SP_COORD_PACK(x1, y1));
    C.get_location_coord(C.ref(() => x2, value => { x2 = value; }), C.ref(() => y2, value => { y2 = value; }), C.ANY_LOC, C.gc.coder ? C.gc.coder.croom : 0,
                       C.SP_COORD_PACK(x2, y2));

    l_selection_clone(L);
    sel = l_selection_check(L, 2);
    C.selection_do_line(x1, y1, x2, y1, sel);
    C.selection_do_line(x1, y1, x1, y2, sel);
    C.selection_do_line(x2, y1, x2, y2, sel);
    C.selection_do_line(x1, y2, x2, y2, sel);
    return 1;
}


/* local s = selection.fillrect(sel, x1,y1, x2,y2); */

/* local s = selection.fillrect(x1,y1, x2,y2); */

/* s:fillrect(x1,y1, x2,y2); */

/* selection.area(x1,y1, x2,y2); */

export function l_selection_fillrect(L)
{
    let sel = 0;
    let y;
    let x1, y1, x2, y2;

    if (!params_sel_2coords(L, C.ref(() => sel, value => { sel = value; }), C.ref(() => x1, value => { x1 = value; }), C.ref(() => y1, value => { y1 = value; }), C.ref(() => x2, value => { x2 = value; }), C.ref(() => y2, value => { y2 = value; }))) {
        C.nhl_error(L, "selection.fillrect: illegal arguments");
    }

    C.get_location_coord(C.ref(() => x1, value => { x1 = value; }), C.ref(() => y1, value => { y1 = value; }), C.ANY_LOC, C.gc.coder ? C.gc.coder.croom : 0,
                       C.SP_COORD_PACK(x1, y1));
    C.get_location_coord(C.ref(() => x2, value => { x2 = value; }), C.ref(() => y2, value => { y2 = value; }), C.ANY_LOC, C.gc.coder ? C.gc.coder.croom : 0,
                       C.SP_COORD_PACK(x2, y2));

    l_selection_clone(L);
    sel = l_selection_check(L, 2);
    if (x1 == x2) {
        for (y = y1; y <= y2; y++)
            C.selection_setpoint(x1, y, sel, 1);
    } else {
        for (y = y1; y <= y2; y++)
            C.selection_do_line(x1, y, x2, y, sel);
    }
    return 1;
}


/* local s = selection.randline(sel, x1,y1, x2,y2, roughness); */

/* local s = selection.randline(x1,y1, x2,y2, roughness); */

/* TODO: selection.randline(x1,y1, x2,y2, roughness); */

/* TODO: selection.randline({x1,y1}, {x2,y2}, roughness); */

export function l_selection_randline(L)
{
    let argc = C.lua_gettop(L);
    let sel;
    let x1 = 0, y1 = 0, x2 = 0, y2 = 0;
    let roughness = 7;

    if (argc == 6) {
        l_selection_check(L, 1);
        x1 = C.coordxy(C.luaL_checkinteger(L, 2));
        y1 = C.coordxy(C.luaL_checkinteger(L, 3));
        x2 = C.coordxy(C.luaL_checkinteger(L, 4));
        y2 = C.coordxy(C.luaL_checkinteger(L, 5));
        roughness = C.int(C.luaL_checkinteger(L, 6));
        C.lua_pop(L, 5);
    } else if (argc == 5 && C.lua_type(L, 1) == C.LUA_TNUMBER) {
        x1 = C.coordxy(C.luaL_checkinteger(L, 1));
        y1 = C.coordxy(C.luaL_checkinteger(L, 2));
        x2 = C.coordxy(C.luaL_checkinteger(L, 3));
        y2 = C.coordxy(C.luaL_checkinteger(L, 4));
        roughness = C.int(C.luaL_checkinteger(L, 5));
        C.lua_pop(L, 5);
        l_selection_new(L);
        l_selection_check(L, 1);
    }

    C.get_location_coord(C.ref(() => x1, value => { x1 = value; }), C.ref(() => y1, value => { y1 = value; }), C.ANY_LOC, C.gc.coder ? C.gc.coder.croom : 0,
                       C.SP_COORD_PACK(x1, y1));
    C.get_location_coord(C.ref(() => x2, value => { x2 = value; }), C.ref(() => y2, value => { y2 = value; }), C.ANY_LOC, C.gc.coder ? C.gc.coder.croom : 0,
                       C.SP_COORD_PACK(x2, y2));

    l_selection_clone(L);
    sel = l_selection_check(L, 2);
    C.selection_do_randline(x1, y1, x2, y2, roughness, 12, sel);
    return 1;
}


/* local s = selection.grow(sel); */

/* local s = selection.grow(sel, "north"); */

export function l_selection_grow(L)
{
    const growdirs = [
        "all", "random", "north", "west", "east", "south", 0
    ];
    const growdirs2i = [
        C.W_ANY, C.W_RANDOM, C.W_NORTH, C.W_WEST, C.W_EAST, C.W_SOUTH, 0
    ];
    let sel;
    let dir, argc = C.lua_gettop(L);

    l_selection_check(L, 1);
    dir = growdirs2i[C.luaL_checkoption(L, 2, "all", growdirs)];

    if (argc == 2)
        C.lua_pop(L, 1); /* get rid of growdir */

    l_selection_clone(L);
    sel = l_selection_check(L, 2);
    C.selection_do_grow(sel, dir);
    return 1;
}


/* local s = selection.filter_mapchar(sel, mapchar, lit); */

export function l_selection_filter_mapchar(L)
{
    let argc = C.lua_gettop(L);
    let sel = l_selection_check(L, 1);
    let mapchr = C.dupstr(C.luaL_checkstring(L, 2));
    let typ = C.check_mapchr(mapchr);
    let lit = C.int(C.luaL_optinteger(L, 3, -2)); /* TODO: special lit values */
    let tmp;

    if (typ == C.INVALID_TYPE)
        C.nhl_error(L, "Erroneous map char");

    tmp = C.selection_filter_mapchar(sel, typ, lit);
    C.lua_pop(L, argc);
    l_selection_push_copy(L, tmp);
    C.selection_free(tmp, C.TRUE);

    if (mapchr)
        C.free(mapchr);

    return 1;
}


/* local s = selection.match([[...]]); */

export function l_selection_match(L)
{
    let argc = C.lua_gettop(L);
    let sel = 0;
    let mf = 0;
    let x, y;

    if (argc == 1) {
        let err;
        let mapstr = C.dupstr(C.luaL_checkstring(L, 1));
        C.lua_pop(L, 1);
        l_selection_new(L);
        sel = l_selection_check(L, 1);

        mf = C.mapfrag_fromstr(mapstr);
        C.free(mapstr);

        if ((err = C.mapfrag_error(mf)) != 0) {
            C.nhl_error(L, err);
            /*NOTREACHED*/
        }

    } else {
        C.nhl_error(L, "wrong parameters");
        /*NOTREACHED*/
    }

    for (y = 0; y <= sel.hei; y++)
        for (x = 1; x < sel.wid; x++)
            C.selection_setpoint(x, y, sel, C.mapfrag_match(mf, x,y) ? 1 : 0);

    /* unless the (0, 1) coordinate is a match, this would wind up with a
       selection with lx=COLNO, hx=0, etc, so fix the boundaries */
    C.selection_recalc_bounds(sel);

    C.mapfrag_free(C.ref(() => mf, value => { mf = value; }));

    return 1;
}


/* local s = selection.floodfill(x,y); */

/* local s = selection.floodfill(x,y, diagonals); */

export function l_selection_flood(L)
{
    let argc = C.lua_gettop(L);
    let sel = 0;
    let x = 0, y = 0;
    let diagonals = C.FALSE;

    if (argc == 2 || argc == 3) {
        x = C.coordxy(C.luaL_checkinteger(L, 1));
        y = C.coordxy(C.luaL_checkinteger(L, 2));
        if (argc == 3)
            diagonals = C.lua_toboolean(L, 3);
        C.lua_pop(L, argc);
        l_selection_new(L);
        sel = l_selection_check(L, 1);
    } else {
        C.nhl_error(L, "wrong parameters");
        /*NOTREACHED*/
    }

    C.get_location_coord(C.ref(() => x, value => { x = value; }), C.ref(() => y, value => { y = value; }), C.ANY_LOC, C.gc.coder ? C.gc.coder.croom : 0,
                       C.SP_COORD_PACK(x, y));

    if (C.isok(x, y)) {
        C.set_floodfillchk_match_under(C.levl[x][y].typ);
        C.selection_floodfill(sel, x, y, diagonals);
    }
    return 1;
}


/* local s = selection.circle(x,y, radius); */

/* local s = selection.circle(x, y, radius, filled); */

/* local s = selection.circle(sel, x, y, radius); */

/* local s = selection.circle(sel, x, y, radius, filled); */

export function l_selection_circle(L)
{
    let argc = C.lua_gettop(L);
    let sel = 0;
    let x = 0, y = 0;
    let r = 0, filled = 0;

    if (argc == 3) {
        x = C.coordxy(C.luaL_checkinteger(L, 1));
        y = C.coordxy(C.luaL_checkinteger(L, 2));
        r = C.int(C.luaL_checkinteger(L, 3));
        C.lua_pop(L, 3);
        l_selection_new(L);
        sel = l_selection_check(L, 1);
        filled = 0;
    } else if (argc == 4 && C.lua_type(L, 1) == C.LUA_TNUMBER) {
        x = C.coordxy(C.luaL_checkinteger(L, 1));
        y = C.coordxy(C.luaL_checkinteger(L, 2));
        r = C.int(C.luaL_checkinteger(L, 3));
        filled = C.int(C.luaL_checkinteger(L, 4)); /* TODO: boolean*/
        C.lua_pop(L, 4);
        l_selection_new(L);
        sel = l_selection_check(L, 1);
    } else if (argc == 4 || argc == 5) {
        sel = l_selection_check(L, 1);
        x = C.coordxy(C.luaL_checkinteger(L, 2));
        y = C.coordxy(C.luaL_checkinteger(L, 3));
        r = C.int(C.luaL_checkinteger(L, 4));
        filled = C.int(C.luaL_optinteger(L, 5, 0)); /* TODO: boolean */
    } else {
        C.nhl_error(L, "wrong parameters");
        /*NOTREACHED*/
    }

    C.get_location_coord(C.ref(() => x, value => { x = value; }), C.ref(() => y, value => { y = value; }), C.ANY_LOC, C.gc.coder ? C.gc.coder.croom : 0,
                       C.SP_COORD_PACK(x, y));

    C.selection_do_ellipse(sel, x, y, r, r, !filled);

    C.lua_settop(L, 1);
    return 1;
}


/* local s = selection.ellipse(x, y, radius1, radius2); */

/* local s = selection.ellipse(x, y, radius1, radius2, filled); */

/* local s = selection.ellipse(sel, x, y, radius1, radius2); */

/* local s = selection.ellipse(sel, x, y, radius1, radius2, filled); */

export function l_selection_ellipse(L)
{
    let argc = C.lua_gettop(L);
    let sel = 0;
    let x = 0, y = 0;
    let r1 = 0, r2 = 0, filled = 0;

    if (argc == 4) {
        x = C.coordxy(C.luaL_checkinteger(L, 1));
        y = C.coordxy(C.luaL_checkinteger(L, 2));
        r1 = C.int(C.luaL_checkinteger(L, 3));
        r2 = C.int(C.luaL_checkinteger(L, 4));
        C.lua_pop(L, 4);
        l_selection_new(L);
        sel = l_selection_check(L, 1);
        filled = 0;
    } else if (argc == 5 && C.lua_type(L, 1) == C.LUA_TNUMBER) {
        x = C.coordxy(C.luaL_checkinteger(L, 1));
        y = C.coordxy(C.luaL_checkinteger(L, 2));
        r1 = C.int(C.luaL_checkinteger(L, 3));
        r2 = C.int(C.luaL_checkinteger(L, 4));
        filled = C.int(C.luaL_optinteger(L, 5, 0)); /* TODO: boolean */
        C.lua_pop(L, 5);
        l_selection_new(L);
        sel = l_selection_check(L, 1);
    } else if (argc == 5 || argc == 6) {
        sel = l_selection_check(L, 1);
        x = C.coordxy(C.luaL_checkinteger(L, 2));
        y = C.coordxy(C.luaL_checkinteger(L, 3));
        r1 = C.int(C.luaL_checkinteger(L, 4));
        r2 = C.int(C.luaL_checkinteger(L, 5));
        filled = C.int(C.luaL_optinteger(L, 6, 0)); /* TODO: boolean */
    } else {
        C.nhl_error(L, "wrong parameters");
        /*NOTREACHED*/
    }

    C.get_location_coord(C.ref(() => x, value => { x = value; }), C.ref(() => y, value => { y = value; }), C.ANY_LOC, C.gc.coder ? C.gc.coder.croom : 0,
                       C.SP_COORD_PACK(x, y));

    C.selection_do_ellipse(sel, x, y, r1, r2, !filled);

    C.lua_settop(L, 1);
    return 1;
}


/* Gradients are versatile enough, with so many independently optional
 * arguments, that it doesn't seem helpful to provide a non-table form with
 * non-obvious argument order. */

/* selection.gradient({ type = "radial", x = 3, y = 5, x2 = 10, y2 = 12,
 *                      mindist = 4, maxdist = 10, limited = false });    */

export function l_selection_gradient(L)
{
    let argc = C.lua_gettop(L);
    let sel = 0;
    /* if x2 and y2 aren't set, the gradient has a single center point of x,y;
     * if they are set, the gradient is centered on a (x,y) to (x2,y2) line */
    let x = 0, y = 0, x2 = -1, y2 = -1;
    /* points are always added within mindist of the center; the chance for a
     * point between mindist and maxdist to be added to the selection starts
     * at 100% at mindist and decreases linearly to 0% at maxdist */
    let mindist = 0, maxdist = 0;
    let type = 0n;
    const gradtypes = [
        "radial", "square", 0
    ];
    const gradtypes2i = [
        C.SEL_GRADIENT_RADIAL, C.SEL_GRADIENT_SQUARE, -1
    ];

    if (argc == 1 && C.lua_type(L, 1) == C.LUA_TTABLE) {
        C.lcheck_param_table(L);
        type = BigInt(gradtypes2i[C.get_table_option(L, "type", "radial", gradtypes)]);
        x = C.coordxy(C.get_table_int(L, "x"));
        y = C.coordxy(C.get_table_int(L, "y"));
        x2 = C.coordxy(C.get_table_int_opt(L, "x2", -1));
        y2 = C.coordxy(C.get_table_int_opt(L, "y2", -1));
        C.cvt_to_abscoord(C.ref(() => x, value => { x = value; }), C.ref(() => y, value => { y = value; }));
        C.cvt_to_abscoord(C.ref(() => x2, value => { x2 = value; }), C.ref(() => y2, value => { y2 = value; }));
        /* maxdist is required because there's no obvious default value for
         * it, whereas mindist has an obvious default of 0 */
        maxdist = C.coordxy(C.get_table_int(L, "maxdist"));
        mindist = C.coordxy(C.get_table_int_opt(L, "mindist", 0));

        C.lua_pop(L, 1);
        l_selection_new(L);
        sel = l_selection_check(L, 1);
    } else {
        C.nhl_error(L, "selection.gradient requires table argument");
        /* NOTREACHED */
    }

    /* someone might conceivably want to draw a gradient somewhere off-map. So
     * the only coordinate that's "illegal" for that is (-1,-1).
     * If a level designer really needs to draw a gradient line using that
     * coordinate, they can do so by setting regular x and y to -1. */
    if (x2 == -1 && y2 == -1) {
        x2 = x;
        y2 = y;
    }

    C.selection_do_gradient(sel, x, y, x2, y2, type, mindist, maxdist);
    C.lua_settop(L, 1);
    return 1;
}


/* sel:iterate(function(x,y) ... end);
 * The x, y coordinates passed to the function are map- or room-relative
 * rather than absolute, unless there has been no previous map or room
 * defined.
 */

export function l_selection_iterate(L)
{
    let argc = C.lua_gettop(L);
    let sel = 0;
    let x, y;
    const rect = C.rectLocal(C.cg.zeroNhRect);

    out: if (argc == 2 && C.lua_type(L, 2) == C.LUA_TFUNCTION) {
        sel = l_selection_check(L, 1);
        C.selection_getbounds(sel, rect);
        for (y = rect.ly; y <= rect.hy; y++) {
            for (x = C.max(1,rect.lx); x <= rect.hx; x++)
                if (C.selection_getpoint(x, y, sel)) {
                    let tmpx = x, tmpy = y;
                    C.cvt_to_relcoord(C.ref(() => tmpx, value => { tmpx = value; }), C.ref(() => tmpy, value => { tmpy = value; }));
                    C.lua_pushvalue(L, 2);
                    C.lua_pushinteger(L, tmpx);
                    C.lua_pushinteger(L, tmpy);
                    if (C.nhl_pcall_handle(L, 2, 0, "l_selection_iterate",
                                         C.NHLpa_impossible)) {
                        /* abort loops to prevent possible error cascade */
                        break out;
                    }
                }
            C.lua_gc(L, C.LUA_GCCOLLECT, 0);
        }
    } else {
        C.nhl_error(L, "wrong parameters");
        /*NOTREACHED*/
    }
    return 0;
}


/* local txt = sel:describe_size(); */

/* gives a textual description of the selection size */

export function l_selection_size_description(L)
{
    let argc = C.lua_gettop(L);

    if (argc == 1) {
        let sel = l_selection_check(L, 1);
        const buf = C.charArrayLocal(C.BUFSZ);

        C.lua_pushstring(L, C.selection_size_description(sel, buf));
        return 1;
    } else {
        C.nhl_error(L, "wrong parameters");
        /*NOTREACHED*/
    }
    return 0;
}


/* this aliases + to be the same as | */

/* TODO: http://lua-users.org/wiki/MetatableEvents
       { "__ipairs", l_selection_ipairs },
    */

export function l_selection_register(L)
{
    /* Table of instance methods and static methods. */
    C.luaL_newlib(L, l_selection_methods);

    /* metatable = { __name = "selection", __gc = l_selection_gc } */
    C.luaL_newmetatable(L, "selection");
    C.luaL_setfuncs(L, l_selection_meta, 0);

    /* metatable.__index points at the selection method table. */
    C.lua_pushvalue(L, -2);
    C.lua_setfield(L, -2, "__index");

    /* Don't let lua code mess with the real metatable.
       Instead offer a fake one that only contains __gc. */
    C.luaL_newlib(L, l_selection_meta);
    C.lua_setfield(L, -2, "__metatable");

    /* We don't need the metatable anymore. It's safe in the
       Lua registry for use by luaL_setmetatable. */
    C.lua_pop(L, 1);

    /* global selection = the method table we created at the start */
    C.lua_setglobal(L, "selection");

    return 0;
}


export const l_selection_methods = [
    ["new", l_selection_new],
    ["clone", l_selection_clone],
    ["get", l_selection_getpoint],
    ["set", l_selection_setpoint],
    ["numpoints", l_selection_numpoints],
    ["negate", l_selection_not],
    ["percentage", l_selection_filter_percent],
    ["rndcoord", l_selection_rndcoord],
    ["line", l_selection_line],
    ["randline", l_selection_randline],
    ["rect", l_selection_rect],
    ["fillrect", l_selection_fillrect],
    ["area", l_selection_fillrect],
    ["grow", l_selection_grow],
    ["filter_mapchar", l_selection_filter_mapchar],
    ["match", l_selection_match],
    ["floodfill", l_selection_flood],
    ["circle", l_selection_circle],
    ["ellipse", l_selection_ellipse],
    ["gradient", l_selection_gradient],
    ["iterate", l_selection_iterate],
    ["bounds", l_selection_getbounds],
    ["room", l_selection_room],
    ["describe_size", l_selection_size_description],
    [0, 0]
];

export const l_selection_meta = [
    ["__gc", l_selection_gc],
    ["__unm", l_selection_not],
    ["__band", l_selection_and],
    ["__bor", l_selection_or],
    ["__bxor", l_selection_xor],
    ["__bnot", l_selection_not],
    ["__add", l_selection_or],
    ["__sub", l_selection_sub],
    [0, 0]
];

export const callbackNames = ["l_selection_gc", "l_selection_new", "l_selection_clone", "l_selection_setpoint", "l_selection_numpoints", "l_selection_getpoint", "l_selection_not", "l_selection_and", "l_selection_or", "l_selection_xor", "l_selection_sub", "l_selection_filter_percent", "l_selection_rndcoord", "l_selection_room", "l_selection_getbounds", "l_selection_line", "l_selection_rect", "l_selection_fillrect", "l_selection_randline", "l_selection_grow", "l_selection_filter_mapchar", "l_selection_match", "l_selection_flood", "l_selection_circle", "l_selection_ellipse", "l_selection_gradient", "l_selection_iterate", "l_selection_size_description"];
