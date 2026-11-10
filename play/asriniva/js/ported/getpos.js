/* NetHack 5.0	getpos.c	$NHDT-Date: 1763708572 2025/11/20 23:02:52 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.6 $ */
/*-Copyright (c) Pasi Kallinen, 2023. */
/* NetHack may be freely redistributed.  See license for details. */

import { C } from './c-runtime.js';

 /* from pager.c */















/* Callback function for getpos() to highlight desired map locations.
 * Parameter TRUE: initialize and highlight, FALSE: done (remove highlights).
 */


export const HiliteNormalMap = 0, HiliteGoodposSymbol = 1, HiliteBackground = 2;

export const getpos_initial_state = { getpos_hilitefunc: 0n, getpos_getvalid: 0n, getpos_hilite_state: HiliteNormalMap, defaultHiliteState: HiliteNormalMap };

export function getpos_sethilite(gp_hilitef, gp_getvalidf)
{
    let old_getvalid = C.getpos_getvalid;
    let old_map_frame_color = C.gw.wsettings.map_frame_color;
    let sel = C.selection_new();

    C.defaultHiliteState = C.iflags.bgcolors ? HiliteBackground : HiliteNormalMap;
    if (!C.samePtr(gp_getvalidf, old_getvalid))
        C.getpos_hilite_state = C.defaultHiliteState;

    getpos_getvalids_selection(sel, C.getpos_getvalid);
    C.getpos_hilitefunc = gp_hilitef;
    C.getpos_getvalid = gp_getvalidf;
    getpos_getvalids_selection(sel, C.getpos_getvalid);
    C.gw.wsettings.map_frame_color = (C.getpos_hilite_state == HiliteBackground)
                                   ? C.HI_ZAP : C.NO_COLOR;

    if (!C.samePtr(C.getpos_getvalid, old_getvalid)
        || C.gw.wsettings.map_frame_color != old_map_frame_color)
        C.selection_force_newsyms(sel);
    C.selection_free(sel, C.TRUE);
}

/* cycle 'getpos_hilite_state' to its next state;
   when 'bgcolors' is Off, it will alternate between not showing valid
   positions and showing them via temporary S_goodpos symbol;
   when 'bgcolors' is On, there are three states and showing them via
   setting background color becomes the default */
export function getpos_toggle_hilite_state()
{
    /* getpos_hilitefunc isn't Null */
    if (C.getpos_hilite_state == HiliteGoodposSymbol) {
        /* currently on, finish */
        C.callHilite(C.getpos_hilitefunc, C.FALSE); /* tmp_at(DISP_END) */
    }

    C.getpos_hilite_state = (C.getpos_hilite_state + 1)
                          % (C.iflags.bgcolors ? 3 : 2);
    /* resetting the callback functions to their current values will draw
       valid-spots with background color if that is the new state and turn
       off that color if it was the previous state */
    getpos_sethilite(C.getpos_hilitefunc, C.getpos_getvalid);

    if (C.getpos_hilite_state == HiliteGoodposSymbol) {
        /* now on, begin */
        C.callHilite(C.getpos_hilitefunc, C.TRUE);
    }
}

export function mapxy_valid(x, y)
{
    if (C.getpos_getvalid)
        return C.callValid(C.getpos_getvalid, x, y);
    return C.FALSE;
}

export function getpos_getvalids_selection(sel, validf)
{
    let x, y;

    if (!sel || !validf)
        return;

    for (x = 1; x < sel.wid; x++)
        for (y = 0; y < sel.hei; y++)
            if (C.callValid(validf, x, y))
                C.selection_setpoint(x, y, sel, 1);
}

const gloc_descr = [
    [ "any monsters", "monster", "next/previous monster", "monsters" ],
    [ "any items", "item", "next/previous object", "objects" ],
    [ "any doors", "door", "next/previous door or doorway",
      "doors or doorways" ],
    [ "any unexplored areas", "unexplored area", "unexplored location",
      "locations next to unexplored locations" ],
    [ "anything interesting", "interesting thing", "anything interesting",
      "anything interesting" ],
    [ "any valid locations", "valid location", "valid location",
      "valid locations" ]
];

const gloc_filtertxt = [
    "",
    " in view",
    " in this area"
];

export function getpos_help_keyxhelp(tmpwin, k1, k2, gloc)
{
    let sbuf = C.charArrayLocal(C.BUFSZ), fbuf = C.charArrayLocal(C.QBUFSZ);
    let move_cursor_to = "move the cursor to ", filtertxt = gloc_filtertxt[C.iflags.getloc_filter];

    if (gloc == C.GLOC_EXPLORE) {
        /* default of "move to unexplored location" is inaccurate
           because the position will be one spot short of that */
        move_cursor_to = "move the cursor next to an ";
        if (C.iflags.getloc_usemenu)
            /* default is too wide for basic 80-column tty so shorten it
               to avoid wrapping */
            filtertxt = C.strsubst(C.strcpy(fbuf, filtertxt),
                                 "this area", "area");
    }
    C.Sprintf(sbuf, "Use '%s'/'%s' to %s%s%s.",
            k1, k2,
            C.iflags.getloc_usemenu ? "get a menu of " : move_cursor_to,
            gloc_descr[gloc][2 + Number(C.iflags.getloc_usemenu)], filtertxt);
    C.putstr(tmpwin, 0, sbuf);
}


/* the response for '?' help request in getpos() */
export function getpos_help(force, goal)
{
    const fastmovemode = [ "8 units at a time",
                                                 "skipping same glyphs" ];
    let sbuf = C.charArrayLocal(C.BUFSZ);
    let doing_what_is;
    let tmpwin = C.create_nhwindow(C.NHW_MENU);

    C.Sprintf(sbuf,
            "Use '%s', '%s', '%s', '%s' to move the cursor to %s.", /* hjkl */
            C.visctrl(C.cmd_from_func(C.do_move_west)),
            C.visctrl(C.cmd_from_func(C.do_move_south)),
            C.visctrl(C.cmd_from_func(C.do_move_north)),
            C.visctrl(C.cmd_from_func(C.do_move_east)), goal);
    C.putstr(tmpwin, 0, sbuf);
    C.Sprintf(sbuf,
            "Use '%s', '%s', '%s', '%s' to fast-move the cursor, %s.",
            C.visctrl(C.cmd_from_func(C.do_run_west)),
            C.visctrl(C.cmd_from_func(C.do_run_south)),
            C.visctrl(C.cmd_from_func(C.do_run_north)),
            C.visctrl(C.cmd_from_func(C.do_run_east)),
            fastmovemode[C.iflags.getloc_moveskip]);
    C.putstr(tmpwin, 0, sbuf);
    C.Sprintf(sbuf, "(or prefix normal move with '%s' or '%s' to fast-move)",
            C.visctrl(C.cmd_from_func(C.do_run)),
            C.visctrl(C.cmd_from_func(C.do_rush)));
    C.putstr(tmpwin, 0, sbuf);
    C.putstr(tmpwin, 0, "Or enter a background symbol (ex. '<').");
    C.Sprintf(sbuf, "Use '%s' to move the cursor on yourself.",
            C.visctrl(C.gc.Cmd.spkeys[C.NHKF_GETPOS_SELF]));
    C.putstr(tmpwin, 0, sbuf);
    if (!C.iflags.terrainmode || (C.iflags.terrainmode & C.TER_MON) != 0) {
        C.callLocal(getpos_help_keyxhelp, tmpwin,
                             C.visctrl(C.gc.Cmd.spkeys[C.NHKF_GETPOS_MON_NEXT]),
                             C.visctrl(C.gc.Cmd.spkeys[C.NHKF_GETPOS_MON_PREV]),
                             C.GLOC_MONS);
    }
    let skip_non_mons = C.FALSE;
    if (goal && !C.strcmp(goal, "a monster"))
        skip_non_mons = C.TRUE;
    else {
    if (!C.iflags.terrainmode || (C.iflags.terrainmode & C.TER_OBJ) != 0) {
        C.callLocal(getpos_help_keyxhelp, tmpwin,
                             C.visctrl(C.gc.Cmd.spkeys[C.NHKF_GETPOS_OBJ_NEXT]),
                             C.visctrl(C.gc.Cmd.spkeys[C.NHKF_GETPOS_OBJ_PREV]),
                             C.GLOC_OBJS);
    }
    if (!C.iflags.terrainmode || (C.iflags.terrainmode & C.TER_MAP) != 0) {
        /* these are primarily useful when choosing a travel
           destination for the '_' command */
        C.callLocal(getpos_help_keyxhelp, tmpwin,
                             C.visctrl(C.gc.Cmd.spkeys[C.NHKF_GETPOS_DOOR_NEXT]),
                             C.visctrl(C.gc.Cmd.spkeys[C.NHKF_GETPOS_DOOR_PREV]),
                             C.GLOC_DOOR);
        C.callLocal(getpos_help_keyxhelp, tmpwin,
                             C.visctrl(C.gc.Cmd.spkeys[C.NHKF_GETPOS_UNEX_NEXT]),
                             C.visctrl(C.gc.Cmd.spkeys[C.NHKF_GETPOS_UNEX_PREV]),
                             C.GLOC_EXPLORE);
        C.callLocal(getpos_help_keyxhelp, tmpwin,
                          C.visctrl(C.gc.Cmd.spkeys[C.NHKF_GETPOS_INTERESTING_NEXT]),
                          C.visctrl(C.gc.Cmd.spkeys[C.NHKF_GETPOS_INTERESTING_PREV]),
                             C.GLOC_INTERESTING);
    }
    C.Sprintf(sbuf, "Use '%s' to change fast-move mode to %s.",
            C.visctrl(C.gc.Cmd.spkeys[C.NHKF_GETPOS_MOVESKIP]),
            fastmovemode[Number(!C.iflags.getloc_moveskip)]);
    C.putstr(tmpwin, 0, sbuf);
    if (!C.iflags.terrainmode || (C.iflags.terrainmode & C.TER_DETECT) == 0) {
        C.Sprintf(sbuf, "Use '%s' to toggle menu listing for possible targets.",
                C.visctrl(C.gc.Cmd.spkeys[C.NHKF_GETPOS_MENU]));
        C.putstr(tmpwin, 0, sbuf);
        C.Sprintf(sbuf,
                "Use '%s' to change the mode of limiting possible targets.",
                C.visctrl(C.gc.Cmd.spkeys[C.NHKF_GETPOS_LIMITVIEW]));
        C.putstr(tmpwin, 0, sbuf);
    }
    }
    if (!C.iflags.terrainmode || skip_non_mons) {
        let kbuf = C.charArrayLocal(C.BUFSZ);
        if (!skip_non_mons) {

        if (C.getpos_getvalid) {
            C.Sprintf(sbuf, "Use '%s' or '%s' to move to valid locations.",
                    C.visctrl(C.gc.Cmd.spkeys[C.NHKF_GETPOS_VALID_NEXT]),
                    C.visctrl(C.gc.Cmd.spkeys[C.NHKF_GETPOS_VALID_PREV]));
            C.putstr(tmpwin, 0, sbuf);
        }
        if (C.getpos_hilitefunc) {
            C.Sprintf(sbuf, "Use '%s' to toggle marking of valid locations.",
                    C.visctrl(C.gc.Cmd.spkeys[C.NHKF_GETPOS_SHOWVALID]));
            C.putstr(tmpwin, 0, sbuf);
        }
        C.Sprintf(sbuf, "Use '%s' to toggle automatic description.",
                C.visctrl(C.gc.Cmd.spkeys[C.NHKF_GETPOS_AUTODESC]));
        C.putstr(tmpwin, 0, sbuf);
        if (C.iflags.cmdassist) { /* assisting the '/' command, I suppose... */
            C.Sprintf(sbuf,
                    (C.iflags.getpos_coords == C.GPCOORDS_NONE)
        ? "(Set 'whatis_coord' option to include coordinates with '%s' text.)"
        : "(Reset 'whatis_coord' option to omit coordinates from '%s' text.)",
                    C.visctrl(C.gc.Cmd.spkeys[C.NHKF_GETPOS_AUTODESC]));
        }
        }
        /* disgusting hack; the alternate selection characters work for any
           getpos call, but only matter for dowhatis (and doquickwhatis,
           also for dotherecmdmenu's simulated mouse) */
        doing_what_is = (C.samePtr(goal, C.what_is_a_location));
        if (doing_what_is) {
            C.Sprintf(kbuf, "'%s' or '%s' or '%s' or '%s'",
                    C.visctrl(C.gc.Cmd.spkeys[C.NHKF_GETPOS_PICK]),
                    C.visctrl(C.gc.Cmd.spkeys[C.NHKF_GETPOS_PICK_Q]),
                    C.visctrl(C.gc.Cmd.spkeys[C.NHKF_GETPOS_PICK_O]),
                    C.visctrl(C.gc.Cmd.spkeys[C.NHKF_GETPOS_PICK_V]));
        } else {
            C.Sprintf(kbuf, "'%s'", C.visctrl(C.gc.Cmd.spkeys[C.NHKF_GETPOS_PICK]));
        }
        C.Snprintf("getpos_help", 280, sbuf, C.BUFSZ,
                 "Type a %s when you are at the right place.", kbuf);
        C.putstr(tmpwin, 0, sbuf);
        if (doing_what_is) {
            C.Sprintf(sbuf,
      "  '%s' describe current spot, show 'more info', move to another spot.",
                    C.visctrl(C.gc.Cmd.spkeys[C.NHKF_GETPOS_PICK_V]));
            C.putstr(tmpwin, 0, sbuf);
            C.Sprintf(sbuf,
                    "  '%s' describe current spot,%s move to another spot;",
                    C.visctrl(C.gc.Cmd.spkeys[C.NHKF_GETPOS_PICK]),
                    C.flags.help && !force ? " prompt if 'more info'," : "");
            C.putstr(tmpwin, 0, sbuf);
            C.Sprintf(sbuf,
                    "  '%s' describe current spot, move to another spot;",
                    C.visctrl(C.gc.Cmd.spkeys[C.NHKF_GETPOS_PICK_Q]));
            C.putstr(tmpwin, 0, sbuf);
            C.Sprintf(sbuf,
                    "  '%s' describe current spot, stop looking at things;",
                    C.visctrl(C.gc.Cmd.spkeys[C.NHKF_GETPOS_PICK_O]));
            C.putstr(tmpwin, 0, sbuf);
        }
    }
    if (!force)
        C.putstr(tmpwin, 0, "Type Space or Escape when you're done.");
    C.putstr(tmpwin, 0, "");
    C.display_nhwindow(tmpwin, C.TRUE);
    C.destroy_nhwindow(tmpwin);
}


export function cmp_coord_distu(a, b)
{
    let c1 = C.coord(a);
    let c2 = C.coord(b);
    let dx, dy, dist_1, dist_2;

    dx = C.u.ux - c1.x;
    dy = C.u.uy - c1.y;
    dist_1 = C.max(C.abs(dx), C.abs(dy));
    dx = C.u.ux - c2.x;
    dy = C.u.uy - c2.y;
    dist_2 = C.max(C.abs(dx), C.abs(dy));

    if (dist_1 == dist_2)
        return (c1.y != c2.y) ? (c1.y - c2.y) : (c1.x - c2.x);

    return dist_1 - dist_2;
}

const IS_UNEXPLORED_LOC = (x,y) =>
    (C.isok(x,y) && C.glyph_is_unexplored(C.levl[x][y].glyph)
     && !C.levl[x][y].seenv);
const GLOC_SAME_AREA = (x,y) =>
    (C.isok(x,y) && C.selection_getpoint(x,y,C.gg.gloc_filter_map));

export function gloc_filter_classify_glyph(glyph)
{
    let c;

    if (!C.glyph_is_cmap(glyph))
        return 0;

    c = C.glyph_to_cmap(glyph);

    if (C.is_cmap_room(c) || C.is_cmap_furniture(c))
        return 1;
    else if (C.is_cmap_wall(c) || c == C.S_tree)
        return 2;
    else if (C.is_cmap_corr(c))
        return 3;
    else if (C.is_cmap_water(c))
        return 4;
    else if (C.is_cmap_lava(c))
        return 5;
    return 0;
}

export function gloc_filter_floodfill_matcharea(x, y)
{
    let glyph = C.back_to_glyph(x, y);

    if (!C.levl[x][y].seenv)
        return C.FALSE;

    if (glyph == C.gg.gloc_filter_floodfill_match_glyph)
        return C.TRUE;

    if (gloc_filter_classify_glyph(glyph)
        == gloc_filter_classify_glyph(C.gg.gloc_filter_floodfill_match_glyph))
        return C.TRUE;

    return C.FALSE;
}

export function gloc_filter_floodfill(x, y)
{
    C.gg.gloc_filter_floodfill_match_glyph = C.back_to_glyph(x, y);

    C.set_selection_floodfillchk(gloc_filter_floodfill_matcharea);
    C.selection_floodfill(C.gg.gloc_filter_map, x, y, C.FALSE);
}

export function gloc_filter_init()
{
    if (C.iflags.getloc_filter == C.GFILTER_AREA) {
        if (!C.gg.gloc_filter_map) {
            C.gg.gloc_filter_map = C.selection_new();
        }
        /* special case: if we're in a doorway, try to figure out which
           direction we're moving, and use that side of the doorway */
        if (C.IS_DOOR(C.levl[C.u.ux][C.u.uy].typ)) {
            if ((C.u.dx || C.u.dy) && C.isok(C.u.ux + C.u.dx, C.u.uy + C.u.dy)) {
                gloc_filter_floodfill(C.u.ux + C.u.dx, C.u.uy + C.u.dy);
            } else {
                /* TODO: maybe add both sides of the doorway? */
            }
        } else {
            gloc_filter_floodfill(C.u.ux, C.u.uy);
        }
    }
}

export function gloc_filter_done()
{
    if (C.gg.gloc_filter_map) {
        C.selection_free(C.gg.gloc_filter_map, C.TRUE);
        C.gg.gloc_filter_map = 0;

    }
}

export function known_vibrating_square_at(x, y)
{
    /* note: this only acknowledges the genuine vibrating square, not
       fake ones produced by wizard mode wishing for traps which could
       possibly be transfered to normal play via bones file */
    if (C.invocation_pos(x, y)) {
        let ttmp = C.t_at(x, y);

        return ttmp && ttmp.ttyp == C.VIBRATING_SQUARE && ttmp.tseen;
    }
    return C.FALSE;
}


export function gather_locs_interesting(x, y, gloc)
{
    let glyph, sym;

    if (C.iflags.getloc_filter == C.GFILTER_VIEW && !C.cansee(x, y))
        return C.FALSE;
    if (C.iflags.getloc_filter == C.GFILTER_AREA && !GLOC_SAME_AREA(x, y)
        && !GLOC_SAME_AREA(x - 1, y) && !GLOC_SAME_AREA(x, y - 1)
        && !GLOC_SAME_AREA(x + 1, y) && !GLOC_SAME_AREA(x, y + 1))
        return C.FALSE;

    glyph = C.glyph_at(x, y);
    sym = C.glyph_is_cmap(glyph) ? C.glyph_to_cmap(glyph) : -1;
    switch (gloc) {
    default:
    case C.GLOC_MONS:
        /* unlike '/M', this skips monsters revealed by
           warning glyphs and remembered unseen ones */
        return (C.glyph_is_monster(glyph)
                && glyph != C.monnum_to_glyph(C.PM_LONG_WORM_TAIL, C.MALE)
                && glyph != C.monnum_to_glyph(C.PM_LONG_WORM_TAIL, C.FEMALE));
    case C.GLOC_OBJS:
        return (C.glyph_is_object(glyph)
                && glyph != C.objnum_to_glyph(C.BOULDER)
                && glyph != C.objnum_to_glyph(C.ROCK));
    case C.GLOC_DOOR:
        return (C.glyph_is_cmap(glyph)
                && (C.is_cmap_door(sym)
                    || C.is_cmap_drawbridge(sym)
                    || sym == C.S_ndoor));
    case C.GLOC_EXPLORE:
        return (C.glyph_is_cmap(glyph)
                && !C.glyph_is_nothing(C.glyph_to_cmap(glyph))
                && (C.is_cmap_door(sym)
                    || C.is_cmap_drawbridge(sym)
                    || sym == C.S_ndoor
                    || C.is_cmap_room(sym)
                    || C.is_cmap_corr(sym))
                && (IS_UNEXPLORED_LOC(x + 1, y)
                    || IS_UNEXPLORED_LOC(x - 1, y)
                    || IS_UNEXPLORED_LOC(x, y + 1)
                    || IS_UNEXPLORED_LOC(x, y - 1)));
    case C.GLOC_VALID:
        if (C.getpos_getvalid)
            return C.callValid(C.getpos_getvalid, x, y);
        
        /*FALLTHRU*/
    case C.GLOC_INTERESTING:
        return (gather_locs_interesting(x, y, C.GLOC_DOOR)
                || !((C.glyph_is_cmap(glyph)
                      && (C.is_cmap_wall(sym)
                          || sym == C.S_tree
                          || sym == C.S_bars
                          || sym == C.S_ice
                          || sym == C.S_air
                          || sym == C.S_cloud
                          || C.is_cmap_lava(sym)
                          || C.is_cmap_water(sym)
                          || sym == C.S_ndoor
                          || C.is_cmap_room(sym)
                          || C.is_cmap_corr(sym)))
                     || C.glyph_is_nothing(glyph)
                     || C.glyph_is_unexplored(glyph))
                || known_vibrating_square_at(x, y));
    }
    /*NOTREACHED*/
    return C.FALSE;
}


/* gather locations for monsters or objects shown on the map */
export function gather_locs(arr_p, cnt_p, gloc)
{
    let pass, idx;
    let x, y;

    /*
     * We always include the hero's location even if there is no monster
     * (invisible hero without see invisible) or object (usual case)
     * displayed there.  That way, the count will always be at least 1,
     * and player has a visual indicator (cursor returns to hero's spot)
     * highlighting when successive 'm's or 'o's have cycled all the way
     * through all monsters or objects.
     *
     * Hero's spot will always sort to array[0] because it will always
     * be the shortest distance (namely, 0 units) away from <u.ux,u.uy>.
     */

    gloc_filter_init();

    cnt_p.value = idx = 0;
    for (pass = 0; pass < 2; pass++) {
        for (x = 1; x < C.COLNO; x++)
            for (y = 0; y < C.ROWNO; y++) {
                if (C.u_at(x, y) || gather_locs_interesting(x, y, gloc)) {
                    if (!pass) {
                        ++cnt_p.value;
                    } else {
                        (arr_p.value)[idx].x = x;
                        (arr_p.value)[idx].y = y;
                        ++idx;
                    }
                }
            }

        if (!pass) /* end of first pass */
            arr_p.value =  C.alloc(cnt_p.value * C.coordStructSize);
        else /* end of second pass */
            C.qsort(arr_p.value, cnt_p.value, C.coordStructSize, cmp_coord_distu);
    } /* pass */

    gloc_filter_done();
}

export function dxdy_to_dist_descr(dx, dy, fulldir)
{
    const buf = C.staticBuffer(0);
    let dst;

    if (!dx && !dy) {
        C.Sprintf(buf, "here");
    } else if ((dst = C.xytodir(dx, dy)) != -1) {
        /* explicit direction; 'one step' is implicit */
        C.Sprintf(buf, "%s", C.directionname(dst));
    } else {
        const dirnames = [
            [ "n", "north" ],
            [ "s", "south" ],
            [ "w", "west" ],
            [ "e", "east" ] ];
        C.storeChar(buf, 0);
        /* 9999: protect buf[] against overflow caused by invalid values */
        if (dy) {
            if (C.abs(dy) > 9999)
                dy = C.sgn(dy) * 9999;
            C.Sprintf(C.eos(buf), "%d%s%s", C.abs(dy), dirnames[Number(dy > 0)][Number(fulldir)],
                    dx ? "," : "");
        }
        if (dx) {
            if (C.abs(dx) > 9999)
                dx = C.sgn(dx) * 9999;
            C.Sprintf(C.eos(buf), "%d%s", C.abs(dx),
                    dirnames[2 + Number(dx > 0)][Number(fulldir)]);
        }
    }
    return buf;
}


/* coordinate formatting for 'whatis_coord' option */
export function coord_desc(x, y, outbuf, cmode)
{
    const screen_fmt = C.staticBuffer(1); /* [12] suffices: "[%02d,%02d]" */
    let dx, dy;

    C.storeChar(outbuf, 0);
    switch (cmode) {
    default:
        break;
    case C.GPCOORDS_COMFULL:
    case C.GPCOORDS_COMPASS:
        /* "east", "3s", "2n,4w" */
        dx = x - C.u.ux;
        dy = y - C.u.uy;
        C.Sprintf(outbuf, "(%s)",
                dxdy_to_dist_descr(C.coordxy(dx), C.coordxy(dy), cmode == C.GPCOORDS_COMFULL));
        break;
    case C.GPCOORDS_MAP: /* x,y */
        /* upper left corner of map is <1,0>;
           with default COLNO,ROWNO lower right corner is <79,20> */
        C.Sprintf(outbuf, "<%d,%d>", x, y);
        break;
    case C.GPCOORDS_SCREEN: /* y+2,x */
        /* for normal map sizes, force a fixed-width formatting so that
           /m, /M, /o, and /O output lines up cleanly; map sizes bigger
           than Nx999 or 999xM will still work, but not line up like normal
           when displayed in a column setting.

           The (100) is placed in brackets below to mark the [: "03"] as
           explicit compile-time dead code for clang */
        if (!C.loadChar(screen_fmt))
            C.Sprintf(screen_fmt, "[%%%sd,%%%sd]",
                    (C.ROWNO - 1 + 2 < (100)) ? "02" :  "03",
                    (C.COLNO - 1 < (100)) ? "02" : "03");
        /* map line 0 is screen row 2;
           map column 0 isn't used, map column 1 is screen column 1 */
        C.Sprintf(outbuf, screen_fmt, y + 2, x);
        break;
    }
    return outbuf;
}


export function auto_describe(cx, cy)
{
    let cc = C.coordLocal();
    let sym = 0;
    let tmpbuf = C.charArrayLocal(C.BUFSZ);
    let firstmatch = C.stringPointerLocal("unknown");

    cc.x = cx;
    cc.y = cy;
    if (C.do_screen_description(cc, C.TRUE, sym, tmpbuf, firstmatch,
                               0)) {
        coord_desc(cx, cy, tmpbuf, C.iflags.getpos_coords);
        C.custompline((C.SUPPRESS_HISTORY | C.OVERRIDE_MSGTYPE | C.NO_CURS_ON_U),
                    "%s%s%s%s%s", firstmatch.value, C.loadChar(tmpbuf) ? " " : "", tmpbuf,
                    (C.iflags.autodescribe
                     && C.getpos_getvalid && !C.callValid(C.getpos_getvalid, cx, cy))
                      ? " (invalid target)" : "",
                    (C.iflags.getloc_travelmode && !C.is_valid_travelpt(cx, cy))
                      ? " (no travel path)" : "");
        C.curs(C.WIN_MAP, cx, cy);
        C.flush_screen(0);
    }
}

export function getpos_menu(ccp, gloc)
{
    let garr = C.coordArrayPointerLocal();
    let gcount = C.intLocalPointer();
    let tmpwin;
    let any = C.anythingLocal();
    let i, pick_cnt;
    let picks = C.menuPointerLocal();
    let tmpbuf = C.charArrayLocal(C.BUFSZ);
    let clr = C.NO_COLOR;

    gather_locs(garr, gcount, gloc);

    if (gcount.value < 2) { /* gcount always includes the hero */
        C.free(garr.value);
        C.You("cannot %s %s.",
            (C.iflags.getloc_filter == C.GFILTER_VIEW) ? "see" : "detect",
            gloc_descr[gloc][0]);
        return C.FALSE;
    }

    tmpwin = C.create_nhwindow(C.NHW_MENU);
    C.start_menu(tmpwin, C.MENU_BEHAVE_STANDARD);
    C.copyAnything(any, C.cg.zeroany);

    /* gather_locs returns array[0] == you. skip it. */
    for (i = 1; i < gcount.value; i++) {
        const automatic_scope = C.stackSave();
        try {
        let fullbuf = C.charArrayLocal(C.BUFSZ);
        let tmpcc = C.coordLocal();
        let firstmatch = C.stringPointerLocal("unknown");
        let sym = 0;

        any.a_int = i + 1;
        tmpcc.x = garr.value[i].x;
        tmpcc.y = garr.value[i].y;
        if (C.do_screen_description(tmpcc, C.TRUE, sym, tmpbuf,
                              firstmatch, 0)) {
            coord_desc(garr.value[i].x, garr.value[i].y, tmpbuf,
                              C.iflags.getpos_coords);
            C.Snprintf("getpos_menu", 705, fullbuf, C.BUFSZ, "%s%s%s", firstmatch.value,
                    (C.loadChar(tmpbuf) ? " " : ""), tmpbuf);
            C.add_menu(tmpwin, C.nul_glyphinfo, any, 0, 0,
                     C.ATR_NONE, clr, fullbuf, C.MENU_ITEMFLAGS_NONE);
        }
        } finally { C.stackRestore(automatic_scope); }
    }

    C.Sprintf(tmpbuf, "Pick %s%s%s",
            C.an(gloc_descr[gloc][1]),
            gloc_filtertxt[C.iflags.getloc_filter],
            C.iflags.getloc_travelmode ? " for travel destination" : "");
    C.end_menu(tmpwin, tmpbuf);
    pick_cnt = C.select_menu(tmpwin, C.PICK_ONE, picks);
    C.destroy_nhwindow(tmpwin);
    if (pick_cnt > 0) {
        ccp.x = garr.value[picks.value.item.a_int - 1].x;
        ccp.y = garr.value[picks.value.item.a_int - 1].y;
        C.free(picks.value);
    }
    C.free(garr.value);
    return (pick_cnt > 0);
}

/* add dx,dy to cx,cy, truncating at map edges */
export function truncate_to_map(cx, cy, dx, dy)
{
    /* diagonal moves complicate this... */
    if (cx.value + dx < 1) {
        dy = C.schar(dy - (C.sgn(dy) * (1 - (cx.value + dx))));
        dx = C.schar(1 - cx.value); /* so that (cx+dx == 1) */
    } else if (cx.value + dx > C.COLNO - 1) {
        dy = C.schar(dy + (C.sgn(dy) * ((C.COLNO - 1) - (cx.value + dx))));
        dx = C.schar((C.COLNO - 1) - cx.value);
    }
    if (cy.value + dy < 0) {
        dx = C.schar(dx - (C.sgn(dx) * (0 - (cy.value + dy))));
        dy = C.schar(0 - cy.value); /* so that (cy+dy == 0) */
    } else if (cy.value + dy > C.ROWNO - 1) {
        dx = C.schar(dx + (C.sgn(dx) * ((C.ROWNO - 1) - (cy.value + dy))));
        dy = C.schar((C.ROWNO - 1) - cy.value);
    }
    cx.value += dx;
    cy.value += dy;
}

/* called when ^R typed; if '$' is being shown for valid spots, remove that;
   if alternate background color is being shown for that, redraw it */
export function getpos_refresh()
{
    if (C.getpos_hilitefunc && C.getpos_hilite_state == HiliteGoodposSymbol) {
        C.callHilite(C.getpos_hilitefunc, C.FALSE); /* tmp_at(DISP_END) */
        C.getpos_hilite_state = C.defaultHiliteState;
    }

    C.docrt_flags(C.docrtRefresh);

    if (C.getpos_hilitefunc && C.getpos_hilite_state == HiliteBackground) {
        /* resetting to current values will draw valid-spots highlighting */
        getpos_sethilite(C.getpos_hilitefunc, C.getpos_getvalid);
    }
}

/* have the player use movement keystrokes to position the cursor at a
   particular map location, then use one of [.,:;] to pick the spot */
export function getpos(ccp, force, goal)
{
    const pick_chars_def = [
        { nhkf: C.NHKF_GETPOS_PICK, ret: C.LOOK_TRADITIONAL },
        { nhkf: C.NHKF_GETPOS_PICK_Q, ret: C.LOOK_QUICK },
        { nhkf: C.NHKF_GETPOS_PICK_O, ret: C.LOOK_ONCE },
        { nhkf: C.NHKF_GETPOS_PICK_V, ret: C.LOOK_VERBOSE }
    ];
    const mMoOdDxX_def = [
        C.NHKF_GETPOS_MON_NEXT,
        C.NHKF_GETPOS_MON_PREV,
        C.NHKF_GETPOS_OBJ_NEXT,
        C.NHKF_GETPOS_OBJ_PREV,
        C.NHKF_GETPOS_DOOR_NEXT,
        C.NHKF_GETPOS_DOOR_PREV,
        C.NHKF_GETPOS_UNEX_NEXT,
        C.NHKF_GETPOS_UNEX_PREV,
        C.NHKF_GETPOS_INTERESTING_NEXT,
        C.NHKF_GETPOS_INTERESTING_PREV,
        C.NHKF_GETPOS_VALID_NEXT,
        C.NHKF_GETPOS_VALID_PREV
    ];
    let cq = C.commandLocal(), cmdq;
    let cp;
    let pick_chars = C.charArrayLocal(6);
    let mMoOdDxX = C.charArrayLocal(13);
    let result = 0;
    let i, c;
    let sidx = C.intLocalPointer();
    let cx = C.coordLocalPointer(), cy = C.coordLocalPointer();
    let tx = C.coordLocalPointer(), ty = C.coordLocalPointer();
    tx.value = C.u.ux; ty.value = C.u.uy;
    let msg_given = C.TRUE; /* clear message window by default */
    let show_goal_msg = C.FALSE;
    const garr = C.coordArrayCells(C.NUM_GLOCS);
    const gcount = C.intArrayLocal(C.NUM_GLOCS);
    const gidx = new Int32Array(C.NUM_GLOCS);
    let udx = C.u.dx, udy = C.u.dy, udz = C.u.dz;
    let dx, dy;
    let rushrun = C.FALSE;

    /* temporary? if we have a queued direction, return the adjacent spot
       in that direction */
    if (!C.gi.in_doagain) {
        if ((cmdq = C.cmdq_pop()) != 0) {
            C.copyCommand(cq, cmdq);
            C.free(cmdq);
            if (cq.typ == C.CMDQ_DIR && !cq.dirz) {
                ccp.x = C.u.ux + cq.dirx;
                ccp.y = C.u.uy + cq.diry;
            } else {
                C.cmdq_clear(C.CQ_CANNED);
                result = -1;
            }
            return result;
        }
    }

    for (i = 0; i < pick_chars_def.length; i++)
        pick_chars[i] = C.gc.Cmd.spkeys[pick_chars_def[i].nhkf];
    pick_chars[pick_chars_def.length] = 0;

    for (i = 0; i < mMoOdDxX_def.length; i++)
        mMoOdDxX[i] = C.gc.Cmd.spkeys[mMoOdDxX_def[i]];
    mMoOdDxX[mMoOdDxX_def.length] = 0;

    if (C.handle_tip(C.TIP_GETPOS))
        show_goal_msg = C.TRUE; /* tip has overwritten prompt in mesg window */

    if (!goal)
        goal = "desired location";
    if (C.flags.verbose) {
        C.pline("(For instructions type a '%s')",
              C.visctrl(C.gc.Cmd.spkeys[C.NHKF_GETPOS_HELP]));
        msg_given = C.TRUE;
    }
    cx.value = C.gg.getposx = ccp.x;
    cy.value = C.gg.getposy = ccp.y;
    C.cliparound(cx.value, cy.value);
    C.curs(C.WIN_MAP, cx.value, cy.value);
    C.flush_screen(0);
    C.lock_mouse_buttons(C.TRUE);
    getpos_input: for (;;) {
    const automatic_scope = C.stackSave();
    try {
    nxtc: {
        if (show_goal_msg) {
            C.pline("Move cursor to %s:", goal);
            C.curs(C.WIN_MAP, cx.value, cy.value);
            C.flush_screen(0);
            show_goal_msg = C.FALSE;
        } else if (C.iflags.autodescribe && !msg_given) {
            C.callLocal(auto_describe, cx.value, cy.value);
        }

        rushrun = C.FALSE;

        if ((cmdq = C.cmdq_pop()) != 0) {
            if (cmdq.typ == C.CMDQ_KEY) {
                c = cmdq.key;
            } else {
                C.cmdq_clear(C.CQ_CANNED);
                result = -1;
                break getpos_input;
            }
            C.free(cmdq);
        } else {
            c = C.readchar_poskey(tx, ty, sidx);
            /* remember_getpos is normally False because reusing the
               cursor positioning during ^A is almost never the right
               thing to do, but caller could set it if that was needed */
            if (C.iflags.remember_getpos && !C.gi.in_doagain)
                C.cmdq_add_key(C.CQ_REPEAT, c);
        }

        if (C.iflags.autodescribe)
            msg_given = C.FALSE;

        if (c == C.gc.Cmd.spkeys[C.NHKF_ESC]) {
            cx.value = cy.value = -10;
            msg_given = C.TRUE; /* force clear */
            result = -1;
            break;
        }
        if (c == C.cmd_from_func(C.do_run) || c == C.cmd_from_func(C.do_rush)) {
            c = C.readchar_poskey(tx, ty, sidx);
            rushrun = C.TRUE;
        }
        if (c == 0) {
            if (!C.isok(tx.value, ty.value))
                continue;
            /* a mouse click event, just assign and return */
            cx.value = tx.value;
            cy.value = ty.value;
            break;
        }
        let do_rushrun = C.FALSE;
        if ((cp = C.strchr(pick_chars, c)) != 0) {
            /* '.' => 0, ',' => 1, ';' => 2, ':' => 3 */
            result = pick_chars_def[(C.address(cp) - C.address(pick_chars))].ret;
            break;
        } else if (C.movecmd(c, C.MV_WALK)) {
            if (rushrun)
                do_rushrun = C.TRUE;
            else {
            dx = C.u.dx;
            dy = C.u.dy;
            truncate_to_map(cx, cy, C.schar(dx), C.schar(dy));
            break nxtc;
            }
        }
        if (do_rushrun || C.movecmd(c, C.MV_RUSH) || C.movecmd(c, C.MV_RUN)) {
            if (C.iflags.getloc_moveskip) {
                /* skip same glyphs */
                let glyph = C.glyph_at(cx.value, cy.value);

                dx = C.u.dx;
                dy = C.u.dy;
                while (C.isok(cx.value + dx, cy.value + dy)
                       && glyph == C.glyph_at(cx.value + dx, cy.value + dy)
                       && C.isok(cx.value + dx + C.u.dx, cy.value + dy + C.u.dy)
                       && glyph == C.glyph_at(cx.value + dx + C.u.dx, cy.value + dy + C.u.dy)) {
                    dx += C.u.dx;
                    dy += C.u.dy;

                }
            } else {
                dx = 8 * C.u.dx;
                dy = 8 * C.u.dy;
            }
            truncate_to_map(cx, cy, C.schar(dx), C.schar(dy));
            break nxtc;
        }

        if (c == C.gc.Cmd.spkeys[C.NHKF_GETPOS_HELP] || C.redraw_cmd(c)) {
            /* '?' will redraw twice, first when removing popup text window
               after showing the help text, then to reset highlighting */
            if (c == C.gc.Cmd.spkeys[C.NHKF_GETPOS_HELP])
                C.callLocal(getpos_help, force, goal);
            /* ^R: docrt(), hilite_state = default */
            getpos_refresh();
            C.curs(C.WIN_MAP, cx.value, cy.value);
            /* update message window to reflect that we're still targeting */
            show_goal_msg = C.TRUE;
        } else if (c == C.gc.Cmd.spkeys[C.NHKF_GETPOS_SHOWVALID]) {
            if (C.getpos_hilitefunc) {
                getpos_toggle_hilite_state();
                C.curs(C.WIN_MAP, cx.value, cy.value);
            }
            show_goal_msg = C.TRUE; /* we're still targeting */
            break nxtc;
        } else if (c == C.gc.Cmd.spkeys[C.NHKF_GETPOS_AUTODESC]) {
            C.iflags.autodescribe = !C.iflags.autodescribe;
            C.pline("Automatic description %sis %s.",
                  C.flags.verbose ? "of features under cursor " : "",
                  C.iflags.autodescribe ? "on" : "off");
            if (!C.iflags.autodescribe)
                show_goal_msg = C.TRUE;
            msg_given = C.TRUE;
            break nxtc;
        } else if (c == C.gc.Cmd.spkeys[C.NHKF_GETPOS_LIMITVIEW]) {
            const view_filters = [
                "Not limiting targets",
                "Limiting targets to those in sight",
                "Limiting targets to those in same area"
            ];

            C.iflags.getloc_filter = (C.iflags.getloc_filter + 1) % C.NUM_GFILTER;
            for (i = 0; i < C.NUM_GLOCS; i++) {
                if (garr[i]) {
                    C.free(garr[i]);
                    garr[i] = 0;
                }
                gidx[i] = gcount[i] = 0;
            }
            C.pline("%s.", view_filters[C.iflags.getloc_filter]);
            msg_given = C.TRUE;
            break nxtc;
        } else if (c == C.gc.Cmd.spkeys[C.NHKF_GETPOS_MENU]) {
            C.iflags.getloc_usemenu = !C.iflags.getloc_usemenu;
            C.pline("%s a menu to show possible targets%s.",
                  C.iflags.getloc_usemenu ? "Using" : "Not using",
                  C.iflags.getloc_usemenu
                      ? " for 'm|M', 'o|O', 'd|D', and 'x|X'" : "");
            msg_given = C.TRUE;
            break nxtc;
        } else if (c == C.gc.Cmd.spkeys[C.NHKF_GETPOS_SELF]) {
            /* reset 'm&M', 'o&O', &c; otherwise, there's no way for player
               to achieve that except by manually cycling through all spots */
            for (i = 0; i < C.NUM_GLOCS; i++)
                gidx[i] = 0;
            cx.value = C.u.ux;
            cy.value = C.u.uy;
            break nxtc;
        } else if (c == C.gc.Cmd.spkeys[C.NHKF_GETPOS_MOVESKIP]) {
            C.iflags.getloc_moveskip = !C.iflags.getloc_moveskip;
            C.pline("%skipping over similar terrain when fastmoving the cursor.",
                  C.iflags.getloc_moveskip ? "S" : "Not s");
            msg_given = C.TRUE;
            break nxtc;
        } else if ((cp = C.strchr(mMoOdDxX, c)) != 0) { /* 'm|M', 'o|O', &c */
            /* nearest or farthest monster or object or door or unexplored */
            let gtmp = (C.address(cp) - C.address(mMoOdDxX)), /* 0..7 */
                gloc = gtmp >> 1;             /* 0..3 */

            if (C.iflags.getloc_usemenu) {
                let tmpcrd = C.coordLocal();

                if (C.callLocal(getpos_menu, tmpcrd, gloc)) {
                    cx.value = tmpcrd.x;
                    cy.value = tmpcrd.y;
                }
                break nxtc;
            }

            if (!garr[gloc]) {
                gather_locs(C.coordArrayCell(garr, gloc), C.intArrayCell(gcount, gloc), gloc);
                gidx[gloc] = 0; /* garr[][0] is hero's spot */
            }
            if (!(gtmp & 1)) {  /* c=='m' || c=='o' || c=='d' || c=='x') */
                gidx[gloc] = (gidx[gloc] + 1) % gcount[gloc];
            } else {            /* c=='M' || c=='O' || c=='D' || c=='X') */
                if (--gidx[gloc] < 0)
                    gidx[gloc] = gcount[gloc] - 1;
            }
            cx.value = garr[gloc][gidx[gloc]].x;
            cy.value = garr[gloc][gidx[gloc]].y;
            break nxtc;
        } else {
            if (!C.strchr(C.quitchars, c)) {
                let matching = C.charArrayLocal(C.MAXPCHARS);
                let pass, k = 0;
                let lo_x, lo_y, hi_x, hi_y;

                C.memset(matching, 0, C.MAXPCHARS);
                for (sidx.value = 0; sidx.value < C.MAXPCHARS; sidx.value++) {
                    /* don't even try to match some terrain: walls, room... */
                    if (C.is_cmap_wall(sidx.value) || C.is_cmap_room(sidx.value)
                        || C.is_cmap_corr(sidx.value) || C.is_cmap_door(sidx.value)
                        || sidx.value == C.S_ndoor)
                        continue;
                    if (c == C.defsyms[sidx.value].sym
                        || c == C.gs.showsyms[sidx.value]
                        /* have '^' match webs and vibrating square or any
                           other trap that uses something other than '^' */
                        || (c == 94 && C.is_cmap_trap(sidx.value))
                        /* have room engraving character (default '`')
                           match corridor engravings (default '#') too */
                        || (c == C.gs.showsyms[C.S_engroom]
                            && C.is_cmap_engraving(sidx.value)))
                        matching[sidx.value] = C.schar(++k);
                }
                if (k) {
                    for (pass = 0; pass <= 1; pass++) {
                        /* pass 0: just past current pos to lower right;
                           pass 1: upper left corner to current pos */
                        lo_y = (pass == 0) ? cy.value : 0;
                        hi_y = (pass == 0) ? C.ROWNO - 1 : cy.value;
                        for (ty.value = lo_y; ty.value <= hi_y; ty.value++) {
                            lo_x = (pass == 0 && ty.value == lo_y) ? cx.value + 1 : 1;
                            hi_x = (pass == 1 && ty.value == hi_y) ? cx.value : C.COLNO - 1;
                            for (tx.value = lo_x; tx.value <= hi_x; tx.value++) {
                                foundc: {
                                /* first, look at what is currently visible
                                   (might be monster) */
                                k = C.glyph_at(tx.value, ty.value);
                                if (C.glyph_is_cmap(k)
                                    && matching[C.glyph_to_cmap(k)])
                                    break foundc;
                                /* next, try glyph that's remembered here
                                   (might be trap or object) */
                                if (C.svl.level.flags.hero_memory
                                    /* !terrainmode: don't move to remembered
                                       trap or object if not currently shown */
                                    && !C.iflags.terrainmode) {
                                    k = C.levl[tx.value][ty.value].glyph;
                                    if (C.glyph_is_cmap(k)
                                        && matching[C.glyph_to_cmap(k)])
                                        break foundc;
                                }
                                /* FIXME: check player-specified vib.sq trap
                                   symbol rather than or in addition to '~' */
                                if (c == 126
                                    && known_vibrating_square_at(tx.value, ty.value))
                                    break foundc;
                                /* last, try actual terrain here (shouldn't
                                   we be using svl.lastseentyp[][] instead?) */
                                if (C.levl[tx.value][ty.value].seenv) {
                                    k = C.back_to_glyph(tx.value, ty.value);
                                    if (C.glyph_is_cmap(k)
                                        && matching[C.glyph_to_cmap(k)])
                                        break foundc;
                                }
                                continue;
                                }
                                cx.value = tx.value, cy.value = ty.value;
                                if (msg_given) {
                                    C.clear_nhwindow(C.WIN_MESSAGE);
                                    msg_given = C.FALSE;
                                }
                                break nxtc;
                            } /* column */
                        }     /* row */
                    }         /* pass */
                    C.pline("Can't find dungeon feature '%c'.", c);
                    msg_given = C.TRUE;
                    break nxtc;
                } else {
                    let note = C.charArrayLocal(C.QBUFSZ);

                    if (!force)
                        C.Strcpy(note, "aborted");
                    else /* hjkl */
                        C.Sprintf(note, "use '%s', '%s', '%s', '%s' or '%s'",
                                C.visctrl(C.cmd_from_func(C.do_move_west)),
                                C.visctrl(C.cmd_from_func(C.do_move_south)),
                                C.visctrl(C.cmd_from_func(C.do_move_north)),
                                C.visctrl(C.cmd_from_func(C.do_move_east)),
                                C.visctrl(C.gc.Cmd.spkeys[C.NHKF_GETPOS_PICK]));
                    C.pline("Unknown direction: '%s' (%s).", C.visctrl(C.schar(c)),
                          note);
                    msg_given = C.TRUE;
                } /* k => matching */
            }     /* !quitchars */
            if (force)
                break nxtc;
            C.pline("Done.");
            msg_given = C.FALSE; /* suppress clear */
            cx.value = -1;
            cy.value = 0;
            result = 0; /* not -1 */
            break;
        }
    }
        C.gg.getposx = cx.value, C.gg.getposy = cy.value;
        C.cliparound(cx.value, cy.value);
        C.curs(C.WIN_MAP, cx.value, cy.value);
        C.flush_screen(0);
    } finally { C.stackRestore(automatic_scope); }
    }
    C.lock_mouse_buttons(C.FALSE);
    if (msg_given)
        C.clear_nhwindow(C.WIN_MESSAGE);
    ccp.x = cx.value;
    ccp.y = cy.value;
    C.gg.getposx = C.gg.getposy = 0;
    for (i = 0; i < C.NUM_GLOCS; i++)
        if (garr[i])
            C.free(garr[i]);
    getpos_sethilite(0, 0);
    C.u.dx = udx, C.u.dy = udy, C.u.dz = udz;
    return result;
}

/*getpos.c*/
