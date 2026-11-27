// getpos.js -- picking a map location with the cursor.
// C ref: getpos.c
//
// Ported so far: getpos_sethilite(), mapxy_valid(), auto_describe(),
// truncate_to_map() and getpos() with the movement keys (walk, and the
// rush/run keys that move 8 squares), the pick keys [.,;:], ESC and the
// getpos tip. Not ported yet: the help ('?'), ^R, '$' (showing valid
// spots with tmp_at()), '#', '@', 'm'/'M' &c gathering, the menu and
// filter toggles, and the dungeon-feature symbol search.

import { is_cmap_drawbridge } from './pager.js';
import { game } from './gstate.js';
import { pline, newsym, newsym_force, flush_screen, glyph_at, glyph_kind,
         back_to_glyph } from './display.js';
import { invocation_pos } from './mklev.js';
import { t_at } from './trap.js';
import { VIBRATING_SQUARE } from './const.js';
import { tty_putstr, tty_clear_nhwindow, custompline } from './wintty.js';
import { visctrl, sgn } from './hacklib.js';
import { handle_tip, is_valid_travelpt } from './hack.js';
import { movecmd_mode, MV_WALK, MV_RUSH, MV_RUN, cmd_from_func,
         readchar_poskey as cmd_readchar_poskey } from './cmd.js';
import { do_screen_description, coord_desc } from './pager.js';
import { COLNO, ROWNO, TIP_GETPOS, TOPLINE_NEED_MORE, TOPLINE_NON_EMPTY } from './const.js';
import { tty_create_nhwindow, tty_display_nhwindow, tty_destroy_nhwindow } from './wintty.js';
import { NHW_MENU, TER_MON, TER_OBJ, TER_MAP, TER_DETECT, isok, u_at } from './const.js';
import { docrt_flags, docrtRefresh } from './display.js';
import { cansee } from './vision.js';
import { PM_LONG_WORM_TAIL } from './monsters.js';
import { BOULDER, ROCK } from './objects.js';
import { xytodir as xytodir_gp, directionname as directionname_gp } from './hack.js';

/* C ref: getpos.c getpos_hilitefunc, getpos_getvalid (static) */
/* C ref: getpos.c enum getposHiliteState */
const HiliteNormalMap = 0, HiliteGoodposSymbol = 1, HiliteBackground = 2;

/* C ref: lookat.h LOOK_TRADITIONAL &c */
const LOOK_TRADITIONAL = 0, LOOK_QUICK = 1, LOOK_ONCE = 2, LOOK_VERBOSE = 3;

/* C ref: defsym.h PCHAR()/PCHAR2() -- defsyms[].sym, S_stone .. S_expl_br */
const DEFSYM_CHARS = [
    ' ', '|', '-', '-', '-', '-', '-', '-', '-', '-', '|', '|', /* S_stone..S_trwall */
    '.', '-', '|', '+', '+', '#', '#', '.', '.', '`', '#', '#', '#', /* ..S_engrcorr */
    '<', '>', '<', '>', '<', '>', '<', '>',                       /* stairs, ladders */
    '_', '|', '\\', '{', '{', '}', '.', '}', '}', '.', '.', '#', '#', ' ', '#', '}',
    '^', '^', '^', '^', '^', '^', '^', '^', '^', '^', '^', '^', '^', '^', '^',
    '^', '^', '"', '^', '^', '^', '^', '~', '^', '^',             /* traps */
    '|', '-', '\\', '/', '*', '!', ')', '(', '0', '#', '@', '*', '#', '$',
    '/', '-', '\\', '|', '|', '\\', '-', '/',                      /* swallow */
    '/', '-', '\\', '|', ' ', '|', '\\', '-', '/',                 /* explosion */
];
const S_trwall = 11, S_ndoor = 12, S_vodoor = 13, S_hcdoor = 16,
    S_room = 19, S_darkroom = 20, S_engroom = 21, S_corr = 22, S_litcorr = 23,
    S_engrcorr = 24, S_arrow_trap = 49, S_trapped_chest = 73;

/* C ref: display.h glyph_is_cmap() + glyph_to_cmap() -- for a glyph_at(),
   remembered (lev->glyph) or back_to_glyph() glyph: its defsym.h S_* index,
   or null when it isn't a cmap glyph (or is the unexplored glyph) */
function glyph_cmapidx(glyph) {
    if (!glyph || glyph_kind_gp(glyph) !== 'cmap' || glyph.cmapidx === undefined)
        return null;
    return glyph.cmapidx;
}
function glyph_kind_gp(glyph) { return glyph.kind ?? glyph_kind(glyph); }

/* C ref: flag.h GLOC_*, GFILTER_* */
const GLOC_MONS = 0, GLOC_OBJS = 1, GLOC_DOOR = 2, GLOC_EXPLORE = 3,
    GLOC_INTERESTING = 4, GLOC_VALID = 5, NUM_GLOCS = 6;
const GFILTER_NONE = 0, GFILTER_VIEW = 1, GFILTER_AREA = 2;

/* C ref: sym.h is_cmap_*() */
const S_stone_gp = 0, S_tree = 18, S_bars = 17, S_ice = 39, S_air = 46,
    S_cloud = 47, S_pool = 38, S_water = 48, S_lava = 40, S_lavawall = 41,
    S_vodbridge = 42, S_hcdbridge = 45;
function is_cmap_door(i) { return i >= S_vodoor && i <= S_hcdoor; }
function is_cmap_wall(i) { return i >= S_stone_gp && i <= S_trwall; }
function is_cmap_room(i) { return i >= S_room && i <= S_darkroom; }
function is_cmap_corr(i) { return i >= S_corr && i <= S_litcorr; }
function is_cmap_water(i) { return i === S_pool || i === S_water; }
function is_cmap_lava(i) { return i === S_lava || i === S_lavawall; }

/* C ref: getpos.c gloc_descr[][], gloc_filtertxt[] */
const gloc_descr = [
    ["any monsters", "monster", "next/previous monster", "monsters"],
    ["any items", "item", "next/previous object", "objects"],
    ["any doors", "door", "next/previous door or doorway",
     "doors or doorways"],
    ["any unexplored areas", "unexplored area", "unexplored location",
     "locations next to unexplored locations"],
    ["anything interesting", "interesting thing", "anything interesting",
     "anything interesting"],
    ["any valid locations", "valid location", "valid location",
     "valid locations"],
];
const gloc_filtertxt = ["", " in view", " in this area"];

/* C ref: cmd.c spkeys_binds[] -- the getpos keys' default bindings */
const GETPOS_KEYS = {
    SELF: '@', PICK: '.', PICK_Q: ',', PICK_O: ';', PICK_V: ':',
    SHOWVALID: '$', AUTODESC: '#', MON_NEXT: 'm', MON_PREV: 'M',
    OBJ_NEXT: 'o', OBJ_PREV: 'O', DOOR_NEXT: 'd', DOOR_PREV: 'D',
    UNEX_NEXT: 'x', UNEX_PREV: 'X', VALID_NEXT: 'z', VALID_PREV: 'Z',
    INTERESTING_NEXT: 'a', INTERESTING_PREV: 'A', HELP: '?',
    LIMITVIEW: '"', MOVESKIP: '*', MENU: '!',
};
const vk = ch => visctrl(ch.charCodeAt(0));

// C ref: getpos.c getpos_help_keyxhelp()
async function getpos_help_keyxhelp(tmpwin, k1, k2, gloc) {
    const iflags = game.iflags;
    let move_cursor_to = "move the cursor to ";
    let filtertxt = gloc_filtertxt[iflags.getloc_filter || GFILTER_NONE];
    const usemenu = iflags.getloc_usemenu ? 1 : 0;

    if (gloc === GLOC_EXPLORE) {
        /* default of "move to unexplored location" is inaccurate
           because the position will be one spot short of that */
        move_cursor_to = "move the cursor next to an ";
        if (usemenu)
            /* default is too wide for basic 80-column tty so shorten it
               to avoid wrapping */
            filtertxt = filtertxt.replace("this area", "area");
    }
    const sbuf = `Use '${k1}'/'${k2}' to ${usemenu ? "get a menu of " : move_cursor_to}`
        + `${gloc_descr[gloc][2 + usemenu]}${filtertxt}.`;
    await tty_putstr(tmpwin, 0, sbuf);
}

// C ref: getpos.c getpos_help() -- the response for '?' help request in
// getpos()
async function getpos_help(force, goal) {
    const fastmovemode = ["8 units at a time", "skipping same glyphs"];
    const iflags = game.iflags;
    const terrainmode = iflags.terrainmode || 0;
    const moveskip = iflags.getloc_moveskip ? 1 : 0;
    const tmpwin = tty_create_nhwindow(NHW_MENU);
    const k = fn => visctrl(cmd_from_func(fn));

    /* hjkl */
    await tty_putstr(tmpwin, 0, `Use '${k("do_move_west")}', '${k("do_move_south")}', `
                     + `'${k("do_move_north")}', '${k("do_move_east")}' to move the cursor to ${goal}.`);
    await tty_putstr(tmpwin, 0, `Use '${k("do_run_west")}', '${k("do_run_south")}', `
                     + `'${k("do_run_north")}', '${k("do_run_east")}' to fast-move the cursor, `
                     + `${fastmovemode[moveskip]}.`);
    await tty_putstr(tmpwin, 0, `(or prefix normal move with '${k("do_run")}' or `
                     + `'${k("do_rush")}' to fast-move)`);
    await tty_putstr(tmpwin, 0, "Or enter a background symbol (ex. '<').");
    await tty_putstr(tmpwin, 0, `Use '${vk(GETPOS_KEYS.SELF)}' to move the cursor on yourself.`);
    if (!terrainmode || (terrainmode & TER_MON) !== 0)
        await getpos_help_keyxhelp(tmpwin, vk(GETPOS_KEYS.MON_NEXT),
                                   vk(GETPOS_KEYS.MON_PREV), GLOC_MONS);
    let skip_non_mons = (goal === "a monster");
    if (!skip_non_mons) {
        if (!terrainmode || (terrainmode & TER_OBJ) !== 0)
            await getpos_help_keyxhelp(tmpwin, vk(GETPOS_KEYS.OBJ_NEXT),
                                       vk(GETPOS_KEYS.OBJ_PREV), GLOC_OBJS);
        if (!terrainmode || (terrainmode & TER_MAP) !== 0) {
            /* these are primarily useful when choosing a travel
               destination for the '_' command */
            await getpos_help_keyxhelp(tmpwin, vk(GETPOS_KEYS.DOOR_NEXT),
                                       vk(GETPOS_KEYS.DOOR_PREV), GLOC_DOOR);
            await getpos_help_keyxhelp(tmpwin, vk(GETPOS_KEYS.UNEX_NEXT),
                                       vk(GETPOS_KEYS.UNEX_PREV), GLOC_EXPLORE);
            await getpos_help_keyxhelp(tmpwin, vk(GETPOS_KEYS.INTERESTING_NEXT),
                                       vk(GETPOS_KEYS.INTERESTING_PREV),
                                       GLOC_INTERESTING);
        }
        await tty_putstr(tmpwin, 0, `Use '${vk(GETPOS_KEYS.MOVESKIP)}' to change fast-move `
                         + `mode to ${fastmovemode[moveskip ? 0 : 1]}.`);
        if (!terrainmode || (terrainmode & TER_DETECT) === 0) {
            await tty_putstr(tmpwin, 0, `Use '${vk(GETPOS_KEYS.MENU)}' to toggle menu `
                             + "listing for possible targets.");
            await tty_putstr(tmpwin, 0, `Use '${vk(GETPOS_KEYS.LIMITVIEW)}' to change the `
                             + "mode of limiting possible targets.");
        }
    }
    if (!terrainmode) {
        if (!skip_non_mons) {
            if (gp().getvalid)
                await tty_putstr(tmpwin, 0, `Use '${vk(GETPOS_KEYS.VALID_NEXT)}' or `
                                 + `'${vk(GETPOS_KEYS.VALID_PREV)}' to move to valid locations.`);
            if (gp().hilitefunc)
                await tty_putstr(tmpwin, 0, `Use '${vk(GETPOS_KEYS.SHOWVALID)}' to toggle `
                                 + "marking of valid locations.");
            await tty_putstr(tmpwin, 0, `Use '${vk(GETPOS_KEYS.AUTODESC)}' to toggle `
                             + "automatic description.");
            /* iflags.cmdassist: the whatis_coord sentence is formatted
               into sbuf but not put into the window */
        }
        /* skip_non_mons: */
        /* disgusting hack; the alternate selection characters work for any
           getpos call, but only matter for dowhatis (and doquickwhatis,
           also for dotherecmdmenu's simulated mouse) */
        const doing_what_is = (goal === "a monster, object or location"); /* what_is_a_location */
        let kbuf;
        if (doing_what_is)
            kbuf = `'${vk(GETPOS_KEYS.PICK)}' or '${vk(GETPOS_KEYS.PICK_Q)}' or `
                   + `'${vk(GETPOS_KEYS.PICK_O)}' or '${vk(GETPOS_KEYS.PICK_V)}'`;
        else
            kbuf = `'${vk(GETPOS_KEYS.PICK)}'`;
        await tty_putstr(tmpwin, 0, `Type a ${kbuf} when you are at the right place.`);
        if (doing_what_is) {
            await tty_putstr(tmpwin, 0, `  '${vk(GETPOS_KEYS.PICK_V)}' describe current spot, `
                             + "show 'more info', move to another spot.");
            await tty_putstr(tmpwin, 0, `  '${vk(GETPOS_KEYS.PICK)}' describe current spot,`
                             + `${(game.flags.help !== false && !force) ? " prompt if 'more info'," : ""}`
                             + " move to another spot;");
            await tty_putstr(tmpwin, 0, `  '${vk(GETPOS_KEYS.PICK_Q)}' describe current spot, `
                             + "move to another spot;");
            await tty_putstr(tmpwin, 0, `  '${vk(GETPOS_KEYS.PICK_O)}' describe current spot, `
                             + "stop looking at things;");
        }
    }
    if (!force)
        await tty_putstr(tmpwin, 0, "Type Space or Escape when you're done.");
    await tty_putstr(tmpwin, 0, "");
    await tty_display_nhwindow(tmpwin, true);
    await tty_destroy_nhwindow(tmpwin);
}

// C ref: getpos.c cmp_coord_distu()
function cmp_coord_distu(c1, c2) {
    const u = game.u;
    let dx, dy;

    dx = u.ux - c1.x;
    dy = u.uy - c1.y;
    const dist_1 = Math.max(Math.abs(dx), Math.abs(dy));
    dx = u.ux - c2.x;
    dy = u.uy - c2.y;
    const dist_2 = Math.max(Math.abs(dx), Math.abs(dy));

    if (dist_1 === dist_2)
        return (c1.y !== c2.y) ? (c1.y - c2.y) : (c1.x - c2.x);

    return dist_1 - dist_2;
}

/* C ref: display.h glyph_is_cmap() + glyph_to_cmap() for gathering: the
   cmap index of a background or engraving glyph, -1 for another cmap glyph
   whose index the JS display doesn't keep, null if not a cmap glyph */
function gloc_cmap_sym(glyph) {
    if (!glyph)
        return null;
    const kind = glyph_kind_gp(glyph);
    if (kind === 'engr')
        return (glyph.ch === '#') ? S_engrcorr : S_engroom;
    if (kind !== 'cmap' || glyph_is_unexplored_gp(glyph))
        return null;
    return (glyph.cmapidx !== undefined) ? glyph.cmapidx : -1;
}
/* C ref: display.h glyph_is_unexplored() -- the JS display shows the
   unexplored (and nothing) glyph as a blank background with no cmap index */
function glyph_is_unexplored_gp(glyph) {
    return !glyph || (glyph_kind_gp(glyph) === 'cmap' && glyph.cmapidx === undefined
                      && (glyph.ch ?? ' ') === ' ');
}

/* C ref: getpos.c IS_UNEXPLORED_LOC() */
function IS_UNEXPLORED_LOC(x, y) {
    return isok(x, y)
           && glyph_is_unexplored_gp(game.level.at(x, y).remembered_glyph)
           && !game.level.at(x, y).seenv;
}

// C ref: getpos.c gather_locs_interesting()
async function gather_locs_interesting(x, y, gloc) {
    const filter = game.iflags.getloc_filter || GFILTER_NONE;

    if (filter === GFILTER_VIEW && !cansee(x, y))
        return false;
    if (filter === GFILTER_AREA)
        throw new Error('gather_locs_interesting(): GFILTER_AREA not ported yet');

    const glyph = glyph_at(x, y);
    const sym = gloc_cmap_sym(glyph);
    const is_cmap = (sym !== null);
    switch (gloc) {
    default:
    case GLOC_MONS:
        /* unlike '/M', this skips monsters revealed by
           warning glyphs and remembered unseen ones */
        return (glyph_kind_gp(glyph) === 'mon'
                && glyph.mndx !== PM_LONG_WORM_TAIL);
    case GLOC_OBJS:
        return (glyph_kind_gp(glyph) === 'obj'
                && glyph.otyp !== BOULDER
                && glyph.otyp !== ROCK);
    case GLOC_DOOR:
        return (is_cmap
                && (is_cmap_door(sym)
                    || is_cmap_drawbridge(sym)
                    || sym === S_ndoor));
    case GLOC_EXPLORE:
        return (is_cmap
                && (is_cmap_door(sym)
                    || is_cmap_drawbridge(sym)
                    || sym === S_ndoor
                    || is_cmap_room(sym)
                    || is_cmap_corr(sym))
                && (IS_UNEXPLORED_LOC(x + 1, y)
                    || IS_UNEXPLORED_LOC(x - 1, y)
                    || IS_UNEXPLORED_LOC(x, y + 1)
                    || IS_UNEXPLORED_LOC(x, y - 1)));
    case GLOC_VALID:
        if (gp().getvalid)
            return await gp().getvalid(x, y);
        /* FALLTHRU */
    case GLOC_INTERESTING:
        return (await gather_locs_interesting(x, y, GLOC_DOOR)
                || !((is_cmap
                      && (is_cmap_wall(sym)
                          || sym === S_tree
                          || sym === S_bars
                          || sym === S_ice
                          || sym === S_air
                          || sym === S_cloud
                          || is_cmap_lava(sym)
                          || is_cmap_water(sym)
                          || sym === S_ndoor
                          || is_cmap_room(sym)
                          || is_cmap_corr(sym)))
                     || glyph_is_unexplored_gp(glyph))
                || known_vibrating_square_at(x, y));
    }
}

// C ref: getpos.c gather_locs() -- gather locations for monsters or
// objects shown on the map; returns the sorted array
async function gather_locs(gloc) {
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
    const arr = [];

    /* gloc_filter_init(): only GFILTER_AREA needs setting up */
    for (let x = 1; x < COLNO; x++)
        for (let y = 0; y < ROWNO; y++)
            if (u_at(x, y) || await gather_locs_interesting(x, y, gloc))
                arr.push({ x, y });
    arr.sort(cmp_coord_distu); /* qsort() */
    /* gloc_filter_done() */
    return arr;
}

// C ref: getpos.c getpos_refresh()
async function getpos_refresh() {
    const st = gp();
    if (st.hilitefunc && st.hilite_state === HiliteGoodposSymbol)
        throw new Error('getpos_refresh(): ending the goodpos highlight not ported yet');

    await docrt_flags(docrtRefresh);

    if (st.hilitefunc && st.hilite_state === HiliteBackground)
        /* resetting to current values will draw valid-spots highlighting */
        await getpos_sethilite(st.hilitefunc, st.getvalid);
}

// C ref: getpos.c known_vibrating_square_at()
function known_vibrating_square_at(x, y) {
    /* note: this only acknowledges the genuine vibrating square, not
       fake ones produced by wizard mode wishing for traps which could
       possibly be transfered to normal play via bones file */
    if (invocation_pos(x, y)) {
        const ttmp = t_at(x, y);

        return !!(ttmp && ttmp.ttyp === VIBRATING_SQUARE && ttmp.tseen);
    }
    return false;
}


function gp() {
    if (!game.getpos_state)
        game.getpos_state = { hilitefunc: null, getvalid: null,
                              hilite_state: HiliteNormalMap,
                              defaultHiliteState: HiliteNormalMap,
                              map_frame_color: null };
    return game.getpos_state;
}

// C ref: tty curs(WIN_MAP, x, y) -- map column x is screen column x - 1,
// map row y is screen row y + 1
function curs_map(x, y) {
    const display = game.nhDisplay;
    if (display?.setCursor)
        display.setCursor(x - 1, y + 1);
    if (game.ttyDisplay) {
        game.ttyDisplay.curx = x - 1;
        game.ttyDisplay.cury = y + 1;
    }
}

// C ref: getpos.c getpos_getvalids_selection() -- the spots validf accepts
// (the callbacks are async functions here)
async function getpos_getvalids_selection(sel, validf) {
    if (!validf)
        return;
    for (let x = 1; x < COLNO; x++)
        for (let y = 0; y < ROWNO; y++)
            if (await validf(x, y))
                sel.add(x + y * COLNO);
}

// C ref: getpos.c getpos_sethilite()
export async function getpos_sethilite(gp_hilitef, gp_getvalidf) {
    const st = gp();
    const old_getvalid = st.getvalid;
    const old_map_frame_color = st.map_frame_color;
    const sel = new Set(); /* selection_new() */
    /* iflags.bgcolors: On by default */
    const bgcolors = game.iflags?.bgcolors !== false;

    st.defaultHiliteState = bgcolors ? HiliteBackground : HiliteNormalMap;
    if (gp_getvalidf !== old_getvalid)
        st.hilite_state = st.defaultHiliteState;

    await getpos_getvalids_selection(sel, st.getvalid);
    st.hilitefunc = gp_hilitef;
    st.getvalid = gp_getvalidf;
    await getpos_getvalids_selection(sel, st.getvalid);
    /* HI_ZAP framecolor: the tty background color of valid spots isn't
       drawn by the JS map renderer (nor captured in recorded screens) */
    st.map_frame_color = (st.hilite_state === HiliteBackground) ? 'HI_ZAP' : null;

    if (st.getvalid !== old_getvalid || st.map_frame_color !== old_map_frame_color) {
        /* selection_force_newsyms(sel) */
        for (const k of sel)
            newsym_force(k % COLNO, Math.trunc(k / COLNO));
    }
    /* selection_free(sel, TRUE) */
}

// C ref: getpos.c mapxy_valid()
export async function mapxy_valid(x, y) {
    const st = gp();
    if (st.getvalid)
        return await st.getvalid(x, y);
    return false;
}

// C ref: getpos.c dxdy_to_dist_descr()
/* decide whether to use 'up'/'down'/'here' or a numeric distance */
export function dxdy_to_dist_descr(dx, dy, fulldir) {
    let buf;
    let dst;

    if (!dx && !dy) {
        buf = "here";
    } else if ((dst = xytodir_gp(dx, dy)) !== -1) {
        /* explicit direction; 'one step' is implicit */
        buf = directionname_gp(dst);
    } else {
        const dirnames = [
            [ "n", "north" ],
            [ "s", "south" ],
            [ "w", "west" ],
            [ "e", "east" ] ];
        const fd = fulldir ? 1 : 0;
        buf = '';
        /* 9999: protect buf[] against overflow caused by invalid values */
        if (dy) {
            if (Math.abs(dy) > 9999)
                dy = sgn(dy) * 9999;
            buf += `${Math.abs(dy)}${dirnames[(dy > 0) ? 1 : 0][fd]}${dx ? "," : ""}`;
        }
        if (dx) {
            if (Math.abs(dx) > 9999)
                dx = sgn(dx) * 9999;
            buf += `${Math.abs(dx)}${dirnames[2 + ((dx > 0) ? 1 : 0)][fd]}`;
        }
    }
    return buf;
}

// C ref: getpos.c auto_describe()
export async function auto_describe(cx, cy) {
    const st = gp();
    const cc = { x: cx, y: cy };
    const { found, firstmatch } = do_screen_description(cc, true, 0);

    if (found) {
        const tmpbuf = coord_desc(cx, cy, game.iflags?.getpos_coords);
        const autodescribe = game.iflags?.autodescribe !== false;
        const msg = `${firstmatch}${tmpbuf ? " " : ""}${tmpbuf}`
            + `${(autodescribe && st.getvalid && !(await st.getvalid(cx, cy)))
                 ? " (invalid target)" : ""}`
            + `${(game.iflags?.getloc_travelmode && !(await is_valid_travelpt(cx, cy)))
                 ? " (no travel path)" : ""}`;
        await custompline(msg, true); /* (SUPPRESS_HISTORY | OVERRIDE_MSGTYPE | NO_CURS_ON_U) */
        curs_map(cx, cy);
        await flush_screen(0);
    }
}

// C ref: getpos.c truncate_to_map() -- add dx,dy to cx,cy, truncating at
// map edges; returns the new [cx, cy]
function truncate_to_map(cx, cy, dx, dy) {
    /* diagonal moves complicate this... */
    if (cx + dx < 1) {
        dy -= sgn(dy) * (1 - (cx + dx));
        dx = 1 - cx; /* so that (cx+dx == 1) */
    } else if (cx + dx > COLNO - 1) {
        dy += sgn(dy) * ((COLNO - 1) - (cx + dx));
        dx = (COLNO - 1) - cx;
    }
    if (cy + dy < 0) {
        dx -= sgn(dx) * (0 - (cy + dy));
        dy = 0 - cy; /* so that (cy+dy == 0) */
    } else if (cy + dy > ROWNO - 1) {
        dx += sgn(dx) * ((ROWNO - 1) - (cy + dy));
        dy = (ROWNO - 1) - cy;
    }
    return [cx + dx, cy + dy];
}

// C ref: cmd.c readchar_poskey() -> tty_nh_poskey()/tty_nhgetch(); the
// tty marks a --More--able top line as seen once a key is read
async function readchar_poskey() {
    const c = await cmd_readchar_poskey();
    const t = game.ttyDisplay;
    if (t && t.toplin === TOPLINE_NEED_MORE)
        t.toplin = TOPLINE_NON_EMPTY;
    return c;
}

// C ref: getpos.c getpos() -- have the player use movement keystrokes to
// position the cursor at a particular map location, then use one of
// [.,:;] to pick the spot
export async function getpos(ccp, force, goal) {
    /* gc.Cmd.spkeys[NHKF_GETPOS_PICK..PICK_V] with default bindings */
    const pick_chars = ".,;:";
    const pick_chars_ret = [LOOK_TRADITIONAL, LOOK_QUICK, LOOK_ONCE, LOOK_VERBOSE];
    const u = game.u;
    let result = 0;
    let c;
    let cx, cy;
    let msg_given = true; /* clear message window by default */
    let show_goal_msg = false;
    const udx = u.dx, udy = u.dy, udz = u.dz;
    let dx, dy;
    let rushrun = false;
    const autodescribe = () => game.iflags?.autodescribe !== false;
    /* 'm' 'M' 'o' 'O' 'd' 'D' 'x' 'X' 'a' 'A' 'z' 'Z' (mMoOdDxX_def[]) */
    const mMoOdDxX = "mMoOdDxXaAzZ";
    const garr = new Array(NUM_GLOCS).fill(null);
    const gcount = new Array(NUM_GLOCS).fill(0);
    const gidx = new Array(NUM_GLOCS).fill(0);
    let gcp;

    /* if we have a queued direction, return the adjacent spot in that
       direction: the command queue isn't ported */

    if (await handle_tip(TIP_GETPOS))
        show_goal_msg = true; /* tip has overwritten prompt in mesg window */

    if (!goal)
        goal = "desired location";
    if (game.flags.verbose !== false) {
        await pline("(For instructions type a '?')"); /* visctrl(NHKF_GETPOS_HELP) */
        msg_given = true;
    }
    cx = game.getposx = ccp.x;
    cy = game.getposy = ccp.y;
    curs_map(cx, cy);
    await flush_screen(0);
    for (;;) {
        if (show_goal_msg) {
            await pline(`Move cursor to ${goal}:`);
            curs_map(cx, cy);
            await flush_screen(0);
            show_goal_msg = false;
        } else if (autodescribe() && !msg_given) {
            await auto_describe(cx, cy);
        }

        rushrun = false;

        /* cmdq_pop(): the command queue isn't ported */
        c = await readchar_poskey();

        if (autodescribe())
            msg_given = false;

        if (c === 0x1b) { /* gc.Cmd.spkeys[NHKF_ESC] */
            cx = cy = -10;
            msg_given = true; /* force clear */
            result = -1;
            break;
        }
        if (c === cmd_from_func("do_run") || c === cmd_from_func("do_rush")) {
            c = await readchar_poskey();
            rushrun = true;
        }
        const ch = String.fromCharCode(c);
        let cp;
        if ((cp = pick_chars.indexOf(ch)) >= 0 && c !== 0) {
            /* '.' => 0, ',' => 1, ';' => 2, ':' => 3 */
            result = pick_chars_ret[cp];
            break;
        } else if (movecmd_mode(c, MV_WALK) && !rushrun) {
            dx = u.dx;
            dy = u.dy;
            [cx, cy] = truncate_to_map(cx, cy, dx, dy);
        } else if ((rushrun && movecmd_mode(c, MV_WALK)) /* goto do_rushrun */
                   || movecmd_mode(c, MV_RUSH) || movecmd_mode(c, MV_RUN)) {
            /* do_rushrun: */
            if (game.iflags?.getloc_moveskip) {
                /* skip same glyphs */
                const glyph = glyph_at(cx, cy);

                dx = u.dx;
                dy = u.dy;
                while (isok(cx + dx, cy + dy)
                       && glyph === glyph_at(cx + dx, cy + dy)
                       && isok(cx + dx + u.dx, cy + dy + u.dy)
                       && glyph === glyph_at(cx + dx + u.dx, cy + dy + u.dy)) {
                    dx += u.dx;
                    dy += u.dy;
                }
            } else {
                dx = 8 * u.dx;
                dy = 8 * u.dy;
            }
            [cx, cy] = truncate_to_map(cx, cy, dx, dy);
        } else if (" \r\n".includes(ch) && c !== 0) { /* quitchars */
            if (!force) {
                await pline("Done.");
                msg_given = false; /* suppress clear */
                cx = -1;
                cy = 0;
                result = 0; /* not -1 */
                break;
            }
            /* force: goto nxtc */
        } else if (c === 0x40) { /* gc.Cmd.spkeys[NHKF_GETPOS_SELF] '@' */
            /* reset 'm&M', 'o&O', &c; otherwise, there's no way for player
               to achieve that except by manually cycling through all spots */
            for (let i = 0; i < NUM_GLOCS; i++)
                gidx[i] = 0;
            cx = u.ux;
            cy = u.uy;
        } else if (c === 0x23) { /* gc.Cmd.spkeys[NHKF_GETPOS_AUTODESC] '#' */
            if (!game.iflags) game.iflags = {};
            game.iflags.autodescribe = !autodescribe();
            await pline(`Automatic description ${
                game.flags.verbose !== false ? "of features under cursor " : ""}is ${
                autodescribe() ? "on" : "off"}.`);
            if (!autodescribe())
                show_goal_msg = true;
            msg_given = true;
            /* goto nxtc */
        } else if (c === 0x3f /* gc.Cmd.spkeys[NHKF_GETPOS_HELP] '?' */
                   || c === 0x12) { /* redraw_cmd(c): ^R */
            /* '?' will redraw twice, first when removing popup text window
               after showing the help text, then to reset highlighting */
            if (c === 0x3f) /* gc.Cmd.spkeys[NHKF_GETPOS_HELP] */
                await getpos_help(force, goal);
            /* ^R: docrt(), hilite_state = default */
            await getpos_refresh();
            curs_map(cx, cy);
            /* update message window to reflect that we're still targeting */
            show_goal_msg = true;
        } else if (c === 0x22) { /* gc.Cmd.spkeys[NHKF_GETPOS_LIMITVIEW] '"' */
            const view_filters = [
                "Not limiting targets",
                "Limiting targets to those in sight",
                "Limiting targets to those in same area"
            ];

            game.iflags.getloc_filter = ((game.iflags.getloc_filter || 0) + 1) % 3; /* NUM_GFILTER */
            for (let i = 0; i < NUM_GLOCS; i++) {
                garr[i] = null;
                gidx[i] = gcount[i] = 0;
            }
            await pline(`${view_filters[game.iflags.getloc_filter]}.`);
            msg_given = true;
            /* goto nxtc */
        } else if (c === 0x21) { /* gc.Cmd.spkeys[NHKF_GETPOS_MENU] '!' */
            game.iflags.getloc_usemenu = !game.iflags.getloc_usemenu;
            await pline(`${game.iflags.getloc_usemenu ? "Using" : "Not using"} a menu to show possible targets${
                game.iflags.getloc_usemenu ? " for 'm|M', 'o|O', 'd|D', and 'x|X'" : ""}.`);
            msg_given = true;
            /* goto nxtc */
        } else if (c === 0x2a) { /* gc.Cmd.spkeys[NHKF_GETPOS_MOVESKIP] '*' */
            game.iflags.getloc_moveskip = !game.iflags.getloc_moveskip;
            await pline(`${game.iflags.getloc_moveskip ? "S" : "Not s"}kipping over similar terrain when fastmoving the cursor.`);
            msg_given = true;
            /* goto nxtc */
        } else if ((gcp = mMoOdDxX.indexOf(ch)) >= 0 && c !== 0) { /* 'm|M', 'o|O', &c */
            /* nearest or farthest monster or object or door or unexplored */
            const gtmp = gcp, /* 0..7 */
                gloc = gtmp >> 1; /* 0..3 */

            if (game.iflags.getloc_usemenu)
                throw new Error('getpos(): getpos_menu() not ported yet');

            if (!garr[gloc]) {
                garr[gloc] = await gather_locs(gloc);
                gcount[gloc] = garr[gloc].length;
                gidx[gloc] = 0; /* garr[][0] is hero's spot */
            }
            if (!(gtmp & 1)) { /* c=='m' || c=='o' || c=='d' || c=='x') */
                gidx[gloc] = (gidx[gloc] + 1) % gcount[gloc];
            } else { /* c=='M' || c=='O' || c=='D' || c=='X') */
                if (--gidx[gloc] < 0)
                    gidx[gloc] = gcount[gloc] - 1;
            }
            cx = garr[gloc][gidx[gloc]].x;
            cy = garr[gloc][gidx[gloc]].y;
            /* goto nxtc */
        } else if (c === 0x24) { /* gc.Cmd.spkeys[NHKF_GETPOS_SHOWVALID] '$' */
            if (gp().hilitefunc)
                throw new Error('getpos(): getpos_toggle_hilite_state() not ported yet');
            show_goal_msg = true; /* we're still targeting */
            /* goto nxtc */
        } else {
            /* !strchr(quitchars, c): the quitchars were handled above */
            let k = 0;
            const matching = new Array(DEFSYM_CHARS.length).fill(0);

            for (let sidx = 0; sidx < DEFSYM_CHARS.length; sidx++) {
                /* don't even try to match some terrain: walls, room... */
                if (sidx <= S_trwall /* is_cmap_wall() */
                    || (sidx >= S_room && sidx <= S_darkroom) /* is_cmap_room() */
                    || (sidx >= S_corr && sidx <= S_litcorr) /* is_cmap_corr() */
                    || (sidx >= S_vodoor && sidx <= S_hcdoor) /* is_cmap_door() */
                    || sidx === S_ndoor)
                    continue;
                /* c == gs.showsyms[sidx]: the DECgraphics symbols all have
                   the high bit set, so only the defaults can match a key */
                if (ch === DEFSYM_CHARS[sidx]
                    /* have '^' match webs and vibrating square or any
                       other trap that uses something other than '^' */
                    || (ch === '^' && sidx >= S_arrow_trap
                        && sidx <= S_trapped_chest) /* is_cmap_trap() */
                    /* have room engraving character (default '`')
                       match corridor engravings (default '#') too */
                    || (ch === DEFSYM_CHARS[S_engroom]
                        && (sidx === S_engroom || sidx === S_engrcorr)))
                    matching[sidx] = ++k;
            }
            if (k) {
                let foundc = false;
                for (let pass = 0; pass <= 1 && !foundc; pass++) {
                    /* pass 0: just past current pos to lower right;
                       pass 1: upper left corner to current pos */
                    const lo_y = (pass === 0) ? cy : 0;
                    const hi_y = (pass === 0) ? ROWNO - 1 : cy;
                    for (let ty = lo_y; ty <= hi_y && !foundc; ty++) {
                        const lo_x = (pass === 0 && ty === lo_y) ? cx + 1 : 1;
                        const hi_x = (pass === 1 && ty === hi_y) ? cx : COLNO - 1;
                        for (let tx = lo_x; tx <= hi_x; tx++) {
                            /* first, look at what is currently visible
                               (might be monster) */
                            let kg = glyph_at(tx, ty);
                            if (glyph_cmapidx(kg) !== null
                                && matching[glyph_cmapidx(kg)]) {
                                foundc = true;
                            /* next, try glyph that's remembered here
                               (might be trap or object) */
                            } else if (game.level.flags?.hero_memory
                                /* !terrainmode: don't move to remembered
                                   trap or object if not currently shown */
                                       && !game.iflags.terrainmode
                                       && glyph_cmapidx(kg = game.level.at(tx, ty).remembered_glyph) !== null
                                       && matching[glyph_cmapidx(kg)]) {
                                foundc = true;
                            /* FIXME: check player-specified vib.sq trap
                               symbol rather than or in addition to '~' */
                            } else if (ch === '~'
                                       && known_vibrating_square_at(tx, ty)) {
                                foundc = true;
                            /* last, try actual terrain here (shouldn't
                               we be using svl.lastseentyp[][] instead?) */
                            } else if (game.level.at(tx, ty).seenv
                                       && glyph_cmapidx(kg = back_to_glyph(tx, ty)) !== null
                                       && matching[glyph_cmapidx(kg)]) {
                                foundc = true;
                            }
                            if (foundc) {
                                /* foundc: */
                                cx = tx, cy = ty;
                                if (msg_given) {
                                    tty_clear_nhwindow(game.WIN_MESSAGE);
                                    msg_given = false;
                                }
                                break;
                            }
                        } /* column */
                    }     /* row */
                }         /* pass */
                if (foundc) {
                    /* goto nxtc */
                    game.getposx = cx;
                    game.getposy = cy;
                    curs_map(cx, cy);
                    await flush_screen(0);
                    continue;
                }
                await pline(`Can't find dungeon feature '${ch}'.`);
                msg_given = true;
                /* goto nxtc */
                game.getposx = cx;
                game.getposy = cy;
                curs_map(cx, cy);
                await flush_screen(0);
                continue;
            } else {
                let note;

                if (!force)
                    note = "aborted";
                else /* hjkl */
                    note = `use '${visctrl(cmd_from_func("do_move_west"))}', `
                           + `'${visctrl(cmd_from_func("do_move_south"))}', `
                           + `'${visctrl(cmd_from_func("do_move_north"))}', `
                           + `'${visctrl(cmd_from_func("do_move_east"))}' or `
                           + `'${pick_chars[0]}'`; /* NHKF_GETPOS_PICK */
                await pline(`Unknown direction: '${visctrl(c)}' (${note}).`);
                msg_given = true;
            } /* k => matching */
            if (!force) {
                await pline("Done.");
                msg_given = false; /* suppress clear */
                cx = -1;
                cy = 0;
                result = 0; /* not -1 */
                break;
            }
            /* force: goto nxtc */
        }
        /* nxtc: */
        game.getposx = cx;
        game.getposy = cy;
        curs_map(cx, cy);
        await flush_screen(0);
    }
    /* exitgetpos: */
    if (msg_given)
        tty_clear_nhwindow(game.WIN_MESSAGE);
    ccp.x = cx;
    ccp.y = cy;
    game.getposx = game.getposy = 0;
    await getpos_sethilite(null, null);
    u.dx = udx; u.dy = udy; u.dz = udz;
    return result;
}
