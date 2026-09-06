// getpos.js — the map position picker.
// C ref: src/getpos.c
//
// Every command that targets a location routes through getpos(): jump,
// teleport, polearm, the travel command, and farlook's cursor loop. It runs
// its OWN key loop, so the keys a session feeds it are cursor movements and a
// pick, not commands.
//
// Nothing here draws RNG. What it does drive is the message window: the goal
// prompt, the autodescribe line repainted on every cursor move, and the tip
// window the first time the picker is entered.

import { game } from './gstate.js';
import { COLNO, ROWNO } from './const.js';
import { sgn, isok } from './hacklib.js';
import { nhgetch } from './input.js';
import { pline, pline_nohistory_no_cursor, flush_screen, glyph_at,
         tty_clear_nhwindow_message, TOPLINE_EMPTY, docrt,
         newsym } from './display.js';
import { defsyms, cmap_names } from './drawing_data.js';
import { do_screen_description, is_cmap_wall, is_cmap_room, is_cmap_corr,
         is_cmap_door, is_cmap_engraving } from './pager.js';
import { handle_tip, is_valid_travelpt, TIP_GETPOS } from './hack.js';
import { tty_create_nhwindow, tty_putstr, tty_display_nhwindow,
         tty_next_page, tty_destroy_nhwindow, NHW_MENU } from './tty/wintty.js';

import { NUM_GLOCS, GLOC_MONS, GLOC_OBJS, GLOC_DOOR, GLOC_EXPLORE,
         GLOC_INTERESTING, GLOC_VALID, GFILTER_VIEW, GFILTER_AREA,
         NUM_GFILTER, GPCOORDS_COMPASS, GPCOORDS_COMFULL, GPCOORDS_MAP,
         GPCOORDS_SCREEN, VIBRATING_SQUARE, MENU_BEHAVE_STANDARD,
         MENU_ITEMFLAGS_NONE, IS_DOOR } from './const.js';
import { is_cmap_drawbridge, is_cmap_water, is_cmap_lava,
         is_cmap_furniture } from './pager.js';
import { back_to_glyph } from './display.js';
import { cansee } from './vision.js';
import { selection_new, selection_getpoint, selection_floodfill,
         set_selection_floodfillchk } from './selvar.js';
import { PMNAMES } from './monst_data.js';
import { ONAMES } from './objects_data.js';
import { t_at } from './mon.js';
import { invocation_pos } from './hack.js';
import { xytodir, directionname } from './cmd.js';
import { You } from './pline.js';
import { an } from './objnam.js';
import { tty_start_menu, tty_add_menu, tty_end_menu, tty_select_menu,
         ATR_NONE } from './tty/wintty.js';
import { NO_COLOR } from './terminal.js';
import { xwaitforspace } from './tty/getline.js';

const CM = cmap_names;

// include/hack.h:543-546 — which pick key was used.
export const LOOK_TRADITIONAL = 0; /* '.' -- ask about "more info?" */
export const LOOK_QUICK = 1;       /* ',' -- skip "more info?" */
export const LOOK_ONCE = 2;        /* ';' -- skip and stop looping */
export const LOOK_VERBOSE = 3;     /* ':' -- show more info w/o asking */

// src/cmd.c:3169-3172 — the pick keys, in the order their return values run.
const pick_chars = '.,;:';
const pick_chars_ret = [LOOK_TRADITIONAL, LOOK_QUICK, LOOK_ONCE, LOOK_VERBOSE];

// src/cmd.c dirchars — the same eight keys rhack() uses to move the hero move
// the cursor here; their shifted forms are the run variants (8 squares).
const DIR_DX = { h: -1, l: 1, j: 0, k: 0, y: -1, u: 1, b: -1, n: 1 };
const DIR_DY = { h: 0, l: 0, j: 1, k: -1, y: -1, u: -1, b: 1, n: 1 };
/* reset_commands() binds Ctrl plus every vi direction to MV_RUSH. The pty
   turns Return into Ctrl-J before NetHack reads it, so Return is one of these
   fast cursor movements too. */
const CTRL_DIR = {
    '\x08': 'h', '\x19': 'y', '\x0b': 'k', '\x15': 'u',
    '\x0c': 'l', '\x0e': 'n', '\x0a': 'j', '\x02': 'b',
};

function note_unported_getpos(what) {
    (game.unported ||= new Set()).add('getpos:' + what);
}

/* src/hacklib.c visctrl(), used for keys embedded in getpos feedback. */
function visctrl(ch) {
    let c = typeof ch === 'number' ? ch : ch.charCodeAt(0);
    let out = '';
    if (c & 0x80) {
        out = 'M-';
        c &= 0x7f;
    }
    if (c < 0x20)
        return out + '^' + String.fromCharCode(c | 0x40);
    if (c === 0x7f)
        return out + '^?';
    return out + String.fromCharCode(c);
}

// src/getpos.c:167 getpos_help(), the '?' window inside the position picker.
async function getpos_help(force, goal) {
    const win = tty_create_nhwindow(NHW_MENU);
    const put = (line) => tty_putstr(win, 0, line);
    const fastmode = game.iflags?.getloc_moveskip
        ? 'skipping same glyphs' : '8 units at a time';
    const nextmode = game.iflags?.getloc_moveskip
        ? '8 units at a time' : 'skipping same glyphs';
    const usemenu = !!game.iflags?.getloc_usemenu;
    const filter = ['', ' in view', ' in this area'][
        game.iflags?.getloc_filter | 0] || '';
    const pair = (lo, hi, description, menuDescription = description) => {
        put(`Use '${lo}'/'${hi}' to ${usemenu ? 'get a menu of '
            : 'move the cursor to '}${usemenu ? menuDescription
            : description}${filter}.`);
    };

    put(`Use 'h', 'j', 'k', 'l' to move the cursor to ${goal}.`);
    put(`Use 'H', 'J', 'K', 'L' to fast-move the cursor, ${fastmode}.`);
    put("(or prefix normal move with 'G' or 'g' to fast-move)");
    put("Or enter a background symbol (ex. '<').");
    put("Use '@' to move the cursor on yourself.");
    pair('m', 'M', 'next/previous monster', 'monsters');
    if (goal !== 'a monster') {
        pair('o', 'O', 'next/previous object', 'objects');
        pair('d', 'D', 'next/previous door or doorway', 'doors or doorways');
        if (usemenu) {
            let shortFilter = filter.replace('this area', 'area');
            put(`Use 'x'/'X' to get a menu of locations next to unexplored locations${shortFilter}.`);
        } else {
            put(`Use 'x'/'X' to move the cursor next to an unexplored location${filter}.`);
        }
        pair('a', 'A', 'anything interesting', 'anything interesting');
    }
    put(`Use '*' to change fast-move mode to ${nextmode}.`);
    put("Use '!' to toggle menu listing for possible targets.");
    put("Use '\"' to change the mode of limiting possible targets.");
    if (getpos_getvalid)
        put("Use 'z' or 'Z' to move to valid locations.");
    put("Use '#' to toggle automatic description.");
    put("Type a '.' when you are at the right place.");
    if (!force)
        put("Type Space or Escape when you're done.");
    put('');

    /* src/getpos.c:231 display_nhwindow(tmpwin, TRUE): the tty text window
       pages with dmore(), which only space, return or ESC dismiss; any
       other key rings the bell and keeps waiting */
    await tty_display_nhwindow(win);
    await xwaitforspace(quitchars);
    while (game.morc !== '\x1b' && tty_next_page(win))
        await xwaitforspace(quitchars);
    tty_destroy_nhwindow(win);
}

/* include/hack.h — quitchars */
const quitchars = ' \r\n\x1b';

// C curs(WIN_MAP, cx, cy) — park the terminal cursor on the map square.
// _buildScreenOutput() honors game._map_cursor over the hero's position.
function curs_map(x, y) {
    game._map_cursor = { col: x - 1, row: y + 1 };
    const display = game?.nhDisplay;
    if (display) display.setCursor(x - 1, y + 1);
}

// src/getpos.c:640 auto_describe() — describe what the cursor sits on, on
// the top line, with no --More-- (the key that moved the cursor has already
// acknowledged the previous line).
async function auto_describe(cx, cy) {
    const cc = { x: cx, y: cy };
    const res = do_screen_description(cc, true, 0);
    if (res.found) {
        /* coord_desc() with the default whatis_coord ('none') is empty */
        /* src/getpos.c:655 — a command that set a validator through
           getpos_sethilite() marks squares it cannot use. */
        const invalid = (game.iflags?.autodescribe !== false
                         && getpos_getvalid && !(await getpos_getvalid(cx, cy)))
                        ? ' (invalid target)' : '';
        const noTravelPath = (game.iflags?.getloc_travelmode
                              && !(await is_valid_travelpt(cx, cy)))
                             ? ' (no travel path)' : '';
        await pline_nohistory_no_cursor(
            `${res.firstmatch}${invalid}${noTravelPath}`);
        curs_map(cx, cy);
        flush_screen(0);
    }
}

/* src/getpos.c gp_getvalid — the validator the current command installed. */
let getpos_getvalid = null;

// src/getpos.c:1560 getpos_sethilite()
export async function getpos_sethilite(gp_hilitefunc, gp_getvalidfunc) {
    const old_getvalid = getpos_getvalid;
    const new_getvalid = gp_getvalidfunc || null;
    getpos_getvalid = new_getvalid;

    /* C redraws the union of locations accepted by the old and new
       validators. flush_screen() paints those forced glyphs by row, so the
       tty cursor ends at the last location in row-major order. This is
       observable if a tip asks for input before getpos parks the cursor on
       the hero. */
    if (new_getvalid !== old_getvalid) {
        let last = null;
        for (let x = 1; x < COLNO; x++) {
            for (let y = 0; y < ROWNO; y++) {
                if ((old_getvalid && await old_getvalid(x, y))
                    || (new_getvalid && await new_getvalid(x, y))) {
                    newsym(x, y);
                    if (!last || y > last.y || (y === last.y && x > last.x))
                        last = { x, y };
                }
            }
        }
        if (last && new_getvalid)
            game._flush_cursor_override = { col: last.x, row: last.y + 1 };
    }
}

// src/getpos.c:729 truncate_to_map() — clamp a step to the map, adjusting the
// other axis so a diagonal that hits an edge slides along it rather than
// stopping.
function truncate_to_map(c, dx, dy) {
    if (c.x + dx < 1) {
        dy -= sgn(dy) * (1 - (c.x + dx));
        dx = 1 - c.x;                       /* so that (cx+dx == 1) */
    } else if (c.x + dx > COLNO - 1) {
        dy += sgn(dy) * ((COLNO - 1) - (c.x + dx));
        dx = (COLNO - 1) - c.x;
    }
    if (c.y + dy < 0) {
        dx -= sgn(dx) * (0 - (c.y + dy));
        dy = 0 - c.y;                       /* so that (cy+dy == 0) */
    } else if (c.y + dy > ROWNO - 1) {
        dx += sgn(dx) * ((ROWNO - 1) - (c.y + dy));
        dy = (ROWNO - 1) - c.y;
    }
    c.x += dx;
    c.y += dy;
}

// src/getpos.c:771 getpos() — move a cursor around the map and pick a square.
//
// Returns the LOOK_* value of the pick key, or -1 for ESC. ccp is updated in
// place, as C updates *ccp at exitgetpos.
//
// Not ported (each consumes its key and re-loops, so a session stays in
// step): the m/M/o/O/d/D/x/X/a/A/z/Z gather_locs cycling, the '!' menu, '$'
// hilite, '"' view filter, and the '?' help window (which in C also consumes
// its own dismiss keys — a session that presses it will desync until it is
// ported; recorded so the gap is visible).
export async function getpos(ccp, force, goal) {
    let result = 0;
    const c = { x: ccp.x, y: ccp.y };
    /* src/getpos.c:806 — one gathered array per gloc, filled on first use */
    const garr = new Array(NUM_GLOCS).fill(null);
    const gcount = new Array(NUM_GLOCS).fill(0);
    const gidx = new Array(NUM_GLOCS).fill(0);
    /* boolean msg_given = TRUE: clear message window by default */
    let msg_given = true;
    let show_goal_msg = false;
    let rushrun = false;

    if (await handle_tip(TIP_GETPOS))
        show_goal_msg = true; /* tip has overwritten prompt in mesg window */

    if (!goal)
        goal = 'desired location';
    if (game.flags?.verbose !== false) {
        await pline("(For instructions type a '?')");
        msg_given = true;
    }
    c.x = ccp.x;
    c.y = ccp.y;
    game.getposx = c.x;
    game.getposy = c.y;
    curs_map(c.x, c.y);
    flush_screen(0);

    for (;;) {
        if (show_goal_msg) {
            await pline(`Move cursor to ${goal}:`);
            curs_map(c.x, c.y);
            flush_screen(0);
            show_goal_msg = false;
        } else if (game.iflags?.autodescribe !== false && !msg_given) {
            await auto_describe(c.x, c.y);
        }

        rushrun = false;

        let ch = String.fromCharCode(await nhgetch());

        if (game.iflags?.autodescribe !== false)
            msg_given = false;

        if (ch === '\x1b') {
            c.x = c.y = -10;
            msg_given = true; /* force clear */
            result = -1;
            break;
        }
        /* c == cmd_from_func(do_run) 'G' or do_rush 'g' */
        if (ch === 'G' || ch === 'g') {
            ch = String.fromCharCode(await nhgetch());
            rushrun = true;
        }

        const pick = pick_chars.indexOf(ch);
        if (pick >= 0) {
            result = pick_chars_ret[pick];
            break;
        } else if (DIR_DX[ch] !== undefined && !rushrun) {
            /* movecmd(c, MV_WALK) */
            truncate_to_map(c, DIR_DX[ch], DIR_DY[ch]);
        } else if (DIR_DX[CTRL_DIR[ch] ?? ch.toLowerCase()] !== undefined) {
            /* movecmd(c, MV_RUSH | MV_RUN): shifted letter, or a walk
               letter behind the 'g'/'G' prefix, or Ctrl plus a direction.
               iflags.getloc_moveskip defaults off, so the cursor jumps 8
               squares. */
            const dir = CTRL_DIR[ch] ?? ch.toLowerCase();
            truncate_to_map(c, 8 * DIR_DX[dir], 8 * DIR_DY[dir]);
        } else if (ch === '?' || ch === '\x12') {
            if (ch === '\x12')
                await docrt();
            else
                await getpos_help(force, goal);
            show_goal_msg = true;
        } else if (ch === '#') {
            /* NHKF_GETPOS_AUTODESC — toggle */
            game.iflags = game.iflags || {};
            game.iflags.autodescribe = !(game.iflags.autodescribe !== false);
            await pline(`Automatic description ${
                game.flags?.verbose !== false
                    ? 'of features under cursor ' : ''}is ${
                game.iflags.autodescribe ? 'on' : 'off'}.`);
            if (!game.iflags.autodescribe)
                show_goal_msg = true;
            msg_given = true;
        } else if (ch === '@') {
            /* NHKF_GETPOS_SELF: reset 'm&M', 'o&O', &c; otherwise, there's
               no way for player to achieve that except by manually cycling
               through all spots */
            for (let i = 0; i < NUM_GLOCS; i++)
                gidx[i] = 0;
            c.x = game.u.ux;
            c.y = game.u.uy;
        } else if (ch === '*') {
            /* NHKF_GETPOS_MOVESKIP — toggle */
            game.iflags = game.iflags || {};
            game.iflags.getloc_moveskip = !game.iflags.getloc_moveskip;
            await pline(`${game.iflags.getloc_moveskip ? 'S' : 'Not s'}`
                + 'kipping over similar terrain when fastmoving the cursor.');
            msg_given = true;
        } else if (ch === '$') {
            note_unported_getpos(`key:${ch}`);
            show_goal_msg = true;
        } else if ('mMoOdDxXaAzZ'.includes(ch)) {
            /* src/getpos.c:1011 — 'm|M', 'o|O', &c: nearest or farthest
               monster, object, door, unexplored spot, interesting thing or
               valid location */
            const gtmp = 'mMoOdDxXaAzZ'.indexOf(ch), /* 0..11 */
                  gloc = gtmp >> 1;                  /* 0..5 */
            if (game.iflags?.getloc_usemenu) {
                const tmpcrd = { x: 0, y: 0 };
                if (await getpos_menu(tmpcrd, gloc)) {
                    c.x = tmpcrd.x;
                    c.y = tmpcrd.y;
                }
            } else {
                if (!garr[gloc]) {
                    garr[gloc] = gather_locs(gloc);
                    gcount[gloc] = garr[gloc].length;
                    gidx[gloc] = 0; /* garr[][0] is hero's spot */
                }
                if (!(gtmp & 1)) {  /* c=='m' || c=='o' || c=='d' || c=='x') */
                    gidx[gloc] = (gidx[gloc] + 1) % gcount[gloc];
                } else {            /* c=='M' || c=='O' || c=='D' || c=='X') */
                    if (--gidx[gloc] < 0)
                        gidx[gloc] = gcount[gloc] - 1;
                }
                c.x = garr[gloc][gidx[gloc]].x;
                c.y = garr[gloc][gidx[gloc]].y;
            }
        } else if (ch === '"') {
            /* NHKF_GETPOS_LIMITVIEW */
            const view_filters = [
                'Not limiting targets',
                'Limiting targets to those in sight',
                'Limiting targets to those in same area',
            ];
            game.iflags = game.iflags || {};
            game.iflags.getloc_filter
                = ((game.iflags.getloc_filter | 0) + 1) % NUM_GFILTER;
            for (let i = 0; i < NUM_GLOCS; i++) {
                garr[i] = null;
                gidx[i] = gcount[i] = 0;
            }
            await pline(`${view_filters[game.iflags.getloc_filter]}.`);
            msg_given = true;
        } else if (ch === '!') {
            /* NHKF_GETPOS_MENU */
            game.iflags = game.iflags || {};
            game.iflags.getloc_usemenu = !game.iflags.getloc_usemenu;
            await pline(`${game.iflags.getloc_usemenu ? 'Using' : 'Not using'
                } a menu to show possible targets${
                game.iflags.getloc_usemenu
                    ? " for 'm|M', 'o|O', 'd|D', and 'x|X'" : ''}.`);
            msg_given = true;
        } else {
            if (!' \r\n\x1b'.includes(ch)) {
                /* look for a dungeon feature the typed symbol matches, and
                   jump the cursor to the next one (getpos.c:1046) */
                const matching = new Array(defsyms.length).fill(0);
                let k = 0;
                for (let sidx = 0; sidx < defsyms.length; sidx++) {
                    if (is_cmap_wall(sidx) || is_cmap_room(sidx)
                        || is_cmap_corr(sidx) || is_cmap_door(sidx)
                        || sidx === CM.S_ndoor)
                        continue;
                    const ds = defsyms[sidx];
                    if (ch === ds.sym
                        || (ch === ds.ch && !ds.dec)
                        || (ch === '^' && sidx >= CM.S_arrow_trap
                            && sidx <= CM.S_trapped_chest)
                        || (ch === defsyms[CM.S_engroom].ch
                            && is_cmap_engraving(sidx)))
                        matching[sidx] = ++k;
                }
                if (k) {
                    let foundc = false;
                    for (let pass = 0; pass <= 1 && !foundc; pass++) {
                        const lo_y = (pass === 0) ? c.y : 0;
                        const hi_y = (pass === 0) ? ROWNO - 1 : c.y;
                        for (let ty = lo_y; ty <= hi_y && !foundc; ty++) {
                            const lo_x = (pass === 0 && ty === lo_y) ? c.x + 1 : 1;
                            const hi_x = (pass === 1 && ty === hi_y) ? c.x
                                                                     : COLNO - 1;
                            for (let tx = lo_x; tx <= hi_x; tx++) {
                                /* first, what is currently displayed */
                                const g = glyph_at(tx, ty);
                                if (g.kind === 'cmap' && matching[g.cmap]) {
                                    foundc = true;
                                } else if (game.level?.flags?.hero_memory) {
                                    /* then the remembered glyph */
                                    const rg = game.level.at(tx, ty)
                                        ?.remembered_glyph?.glyph;
                                    if (rg && rg.kind === 'cmap'
                                        && matching[rg.cmap])
                                        foundc = true;
                                }
                                /* last, actual terrain when seen — the
                                   back_to_glyph probe only matters for
                                   memory the display doesn't carry */
                                if (foundc) {
                                    c.x = tx;
                                    c.y = ty;
                                    if (msg_given) {
                                        tty_clear_nhwindow_message(
                                            game._topl_cury || 0);
                                        game._pending_message = '';
                                        game._toplin = TOPLINE_EMPTY;
                                        msg_given = false;
                                    }
                                    break;
                                }
                            }
                        }
                    }
                    if (!foundc) {
                        await pline(`Can't find dungeon feature '${ch}'.`);
                        msg_given = true;
                    }
                } else {
                    const note = !force
                        ? 'aborted'
                        : "use 'h', 'j', 'k', 'l' or '.'";
                    await pline(`Unknown direction: '${visctrl(ch)}' (${note}).`);
                    msg_given = true;
                }
                curs_map(c.x, c.y);
                flush_screen(0);
                continue;
            }
            /* quitchars: space/enter dismiss the picker */
            if (force) {
                curs_map(c.x, c.y);
                flush_screen(0);
                continue;
            }
            await pline('Done.');
            msg_given = false; /* suppress clear */
            c.x = -1;
            c.y = 0;
            result = 0; /* not -1 */
            break;
        }
        /* nxtc: */
        game.getposx = c.x;
        game.getposy = c.y;
        curs_map(c.x, c.y);
        flush_screen(0);
    }

    if (msg_given) {
        tty_clear_nhwindow_message(game._topl_cury || 0);
        game._pending_message = '';
        game._toplin = TOPLINE_EMPTY;
    }
    ccp.x = c.x;
    ccp.y = c.y;
    game.getposx = game.getposy = 0;
    game._map_cursor = null;
    await getpos_sethilite(null, null);
    return result;
}

/* ---- src/getpos.c:341-437 target gathering and the view filters ---- */

// src/getpos.c:341 gloc_filter_classify_glyph()
function gloc_filter_classify_glyph(glyph) {
    if (!glyph || (glyph.kind && glyph.kind !== 'cmap') || glyph.cmap === undefined)
        return 0;
    const c = glyph.cmap;
    if (is_cmap_room(c) || is_cmap_furniture(c))
        return 1;
    else if (is_cmap_wall(c) || c === CM.S_tree)
        return 2;
    else if (is_cmap_corr(c))
        return 3;
    else if (is_cmap_water(c))
        return 4;
    else if (is_cmap_lava(c))
        return 5;
    return 0;
}

// src/getpos.c:363 gloc_filter_floodfill_matcharea()
function gloc_filter_floodfill_matcharea(x, y) {
    const loc = game.level.at(x, y);
    const glyph = back_to_glyph(loc, x, y);
    if (!loc.seenv)
        return false;
    const match = game.gloc_filter_floodfill_match_glyph;
    if (glyph.cmap === match.cmap)
        return true;
    if (gloc_filter_classify_glyph(glyph) === gloc_filter_classify_glyph(match))
        return true;
    return false;
}

// src/getpos.c:380 gloc_filter_floodfill()
function gloc_filter_floodfill(x, y) {
    game.gloc_filter_floodfill_match_glyph = back_to_glyph(game.level.at(x, y), x, y);
    set_selection_floodfillchk(gloc_filter_floodfill_matcharea);
    selection_floodfill(game.gloc_filter_map, x, y, false);
}

// src/getpos.c:391 gloc_filter_init()
function gloc_filter_init() {
    if ((game.iflags?.getloc_filter | 0) === GFILTER_AREA) {
        if (!game.gloc_filter_map)
            game.gloc_filter_map = selection_new();
        /* special case: if we're in a doorway, try to figure out which
           direction we're moving, and use that side of the doorway */
        const u = game.u;
        if (IS_DOOR(game.level.at(u.ux, u.uy)?.typ)) {
            if ((u.dx || u.dy) && isok(u.ux + u.dx, u.uy + u.dy)) {
                gloc_filter_floodfill(u.ux + u.dx, u.uy + u.dy);
            } else {
                /* TODO: maybe add both sides of the doorway? */
            }
        } else {
            gloc_filter_floodfill(u.ux, u.uy);
        }
    }
}

// src/getpos.c:412 gloc_filter_done()
function gloc_filter_done() {
    if (game.gloc_filter_map)
        game.gloc_filter_map = null;
}

// src/getpos.c:336 GLOC_SAME_AREA()
function GLOC_SAME_AREA(x, y) {
    return isok(x, y) && !!selection_getpoint(x, y, game.gloc_filter_map);
}

// src/getpos.c:421 known_vibrating_square_at()
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

// include/display.h IS_UNEXPLORED_LOC(): remembered as unexplored and never
// seen from any angle
function IS_UNEXPLORED_LOC(x, y) {
    return isok(x, y) && glyph_at(x, y).kind === 'unexplored'
           && !game.level.at(x, y)?.seenv;
}

// src/getpos.c:438 gather_locs_interesting()
function gather_locs_interesting(x, y, gloc) {
    const filter = game.iflags?.getloc_filter | 0;
    if (filter === GFILTER_VIEW && !cansee(x, y))
        return false;
    if (filter === GFILTER_AREA && !GLOC_SAME_AREA(x, y)
        && !GLOC_SAME_AREA(x - 1, y) && !GLOC_SAME_AREA(x, y - 1)
        && !GLOC_SAME_AREA(x + 1, y) && !GLOC_SAME_AREA(x, y + 1))
        return false;

    const glyph = glyph_at(x, y);
    const sym = glyph.kind === 'cmap' ? glyph.cmap : -1;

    switch (gloc) {
    default:
    case GLOC_MONS:
        /* unlike '/M', this skips monsters revealed by
           warning glyphs and remembered unseen ones */
        return (glyph.kind === 'mon'
                && glyph.mon?.mnum !== PMNAMES.PM_LONG_WORM_TAIL);
    case GLOC_OBJS:
        return (glyph.kind === 'obj'
                && glyph.otyp !== ONAMES.BOULDER
                && glyph.otyp !== ONAMES.ROCK);
    case GLOC_DOOR:
        return (sym !== -1
                && (is_cmap_door(sym)
                    || is_cmap_drawbridge(sym)
                    || sym === CM.S_ndoor));
    case GLOC_EXPLORE:
        /* C also tests !glyph_is_nothing(glyph_to_cmap(glyph)), which
           compares a cmap index with the GLYPH_NOTHING glyph number and so
           never fails for a cmap glyph */
        return (sym !== -1
                && (is_cmap_door(sym)
                    || is_cmap_drawbridge(sym)
                    || sym === CM.S_ndoor
                    || is_cmap_room(sym)
                    || is_cmap_corr(sym))
                && (IS_UNEXPLORED_LOC(x + 1, y)
                    || IS_UNEXPLORED_LOC(x - 1, y)
                    || IS_UNEXPLORED_LOC(x, y + 1)
                    || IS_UNEXPLORED_LOC(x, y - 1)));
    case GLOC_VALID:
        if (getpos_getvalid)
            return !!getpos_getvalid(x, y);
        /*FALLTHRU*/
    case GLOC_INTERESTING:
        return (gather_locs_interesting(x, y, GLOC_DOOR)
                || !((sym !== -1
                      && (is_cmap_wall(sym)
                          || sym === CM.S_tree
                          || sym === CM.S_bars
                          || sym === CM.S_ice
                          || sym === CM.S_air
                          || sym === CM.S_cloud
                          || is_cmap_lava(sym)
                          || is_cmap_water(sym)
                          || sym === CM.S_ndoor
                          || is_cmap_room(sym)
                          || is_cmap_corr(sym)))
                     || glyph.kind === 'nothing'
                     || glyph.kind === 'unexplored')
                || known_vibrating_square_at(x, y));
    }
}

// src/getpos.c:513 gather_locs() — every interesting spot of the requested
// kind plus the hero's own, sorted by distance from the hero. The hero's
// spot always sorts to [0] (distance 0).
function gather_locs(gloc) {
    gloc_filter_init();
    const arr = [];
    for (let x = 1; x < COLNO; x++)
        for (let y = 0; y < ROWNO; y++)
            if ((x === game.u.ux && y === game.u.uy)
                || gather_locs_interesting(x, y, gloc))
                arr.push({ x, y });
    arr.sort(cmp_coord_distu);
    gloc_filter_done();
    return arr;
}

// src/getpos.c:319 cmp_coord_distu() — Chebyshev distance from the hero,
// then row, then column
function cmp_coord_distu(c1, c2) {
    let dx = game.u.ux - c1.x, dy = game.u.uy - c1.y;
    const dist_1 = Math.max(Math.abs(dx), Math.abs(dy));
    dx = game.u.ux - c2.x, dy = game.u.uy - c2.y;
    const dist_2 = Math.max(Math.abs(dx), Math.abs(dy));
    if (dist_1 === dist_2)
        return (c1.y !== c2.y) ? (c1.y - c2.y) : (c1.x - c2.x);
    return dist_1 - dist_2;
}

// src/getpos.c:561 dxdy_to_dist_descr()
function dxdy_to_dist_descr(dx, dy, fulldir) {
    let dst;
    if (!dx && !dy)
        return 'here';
    if ((dst = xytodir(dx, dy)) !== -1)
        /* explicit direction; 'one step' is implicit */
        return directionname(dst);
    const dirnames = [['n', 'north'], ['s', 'south'], ['w', 'west'], ['e', 'east']];
    let buf = '';
    /* 9999: protect buf[] against overflow caused by invalid values */
    if (dy) {
        if (Math.abs(dy) > 9999)
            dy = sgn(dy) * 9999;
        buf += `${Math.abs(dy)}${dirnames[(dy > 0) ? 1 : 0][fulldir ? 1 : 0]}${dx ? ',' : ''}`;
    }
    if (dx) {
        if (Math.abs(dx) > 9999)
            dx = sgn(dx) * 9999;
        buf += `${Math.abs(dx)}${dirnames[2 + ((dx > 0) ? 1 : 0)][fulldir ? 1 : 0]}`;
    }
    return buf;
}

// src/getpos.c:595 coord_desc() — coordinate formatting for 'whatis_coord'
export function coord_desc(x, y, cmode) {
    switch (cmode) {
    default:
        return '';
    case GPCOORDS_COMFULL:
    case GPCOORDS_COMPASS:
        /* "east", "3s", "2n,4w" */
        return `(${dxdy_to_dist_descr(x - game.u.ux, y - game.u.uy,
                                      cmode === GPCOORDS_COMFULL)})`;
    case GPCOORDS_MAP: /* x,y */
        /* upper left corner of map is <1,0>;
           with default COLNO,ROWNO lower right corner is <79,20> */
        return `<${x},${y}>`;
    case GPCOORDS_SCREEN: /* y+2,x */
        /* map line 0 is screen row 2;
           map column 0 isn't used, map column 1 is screen column 1 */
        return `[${String(y + 2).padStart(ROWNO - 1 + 2 < 100 ? 2 : 3, '0')},${
            String(x).padStart(COLNO - 1 < 100 ? 2 : 3, '0')}]`;
    }
}

// src/getpos.c:117 gloc_descr[] and gloc_filtertxt[]
const gloc_descr = [
    ['any monsters', 'monster', 'next/previous monster', 'monsters'],
    ['any items', 'item', 'next/previous object', 'objects'],
    ['any doors', 'door', 'next/previous door or doorway',
     'doors or doorways'],
    ['any unexplored areas', 'unexplored area', 'unexplored location',
     'locations next to unexplored locations'],
    ['anything interesting', 'interesting thing', 'anything interesting',
     'anything interesting'],
    ['any valid locations', 'valid location', 'valid location',
     'valid locations'],
];
const gloc_filtertxt = ['', ' in view', ' in this area'];

// src/getpos.c:665 getpos_menu() — pick a gathered target from a menu
async function getpos_menu(ccp, gloc) {
    const garr = gather_locs(gloc);
    const gcount = garr.length;
    const filter = game.iflags?.getloc_filter | 0;

    if (gcount < 2) { /* gcount always includes the hero */
        await You(`cannot ${(filter === GFILTER_VIEW) ? 'see' : 'detect'} ${
            gloc_descr[gloc][0]}.`);
        return false;
    }

    const tmpwin = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(tmpwin, MENU_BEHAVE_STANDARD);
    /* gather_locs returns array[0] == you. skip it. */
    for (let i = 1; i < gcount; i++) {
        const tmpcc = { x: garr[i].x, y: garr[i].y };
        const res = do_screen_description(tmpcc, true, 0);
        if (res.found) {
            const tmpbuf = coord_desc(garr[i].x, garr[i].y,
                                      game.iflags?.getpos_coords ?? 'n');
            tty_add_menu(tmpwin, null, i + 1, 0, 0, ATR_NONE, NO_COLOR,
                         `${res.firstmatch}${tmpbuf ? ' ' : ''}${tmpbuf}`,
                         MENU_ITEMFLAGS_NONE);
        }
    }
    tty_end_menu(tmpwin, `Pick ${an(gloc_descr[gloc][1])}${gloc_filtertxt[filter]}${
        game.iflags?.getloc_travelmode ? ' for travel destination' : ''}`);
    const picks = await tty_select_menu(tmpwin, 1 /* PICK_ONE */);
    tty_destroy_nhwindow(tmpwin);
    if (picks.length > 0) {
        ccp.x = garr[picks[0] - 1].x;
        ccp.y = garr[picks[0] - 1].y;
    }
    return picks.length > 0;
}
