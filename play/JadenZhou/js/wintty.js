// wintty.js — the tty window port: the base window, the message line,
// menus, yes/no prompts and the "Who are you?" prompt.
// C ref: win/tty/wintty.c, win/tty/topl.c, win/tty/getline.c
//
// Ported so far: what startup needs before the map exists (the copyright
// banner from tty_init_nhwindows(), tty_askname(), tty_player_selection(),
// tty_yn_function() and single- or multi-page menus). The recorder build
// defines NOMUX_CAPTURE (wintty.h) and evidently H2344_BROKEN as well: its
// corner menus always sit at column cols/2, i.e. min(cols/2, cols-maxcol-1).
// So menus are placed and echoed the way those variants do it. Output goes to
// the contest Terminal (game.nhDisplay) cell by cell; termcap
// (term_start_attr() &c) is reduced to the inverse-video attribute.

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { NO_COLOR, ATR_NONE, ATR_INVERSE } from './terminal.js';
import {
    NHW_MESSAGE, NHW_STATUS, NHW_MAP, NHW_MENU, NHW_TEXT, NHW_BASE, WIN_ERR,
    PICK_NONE, PICK_ONE, PICK_ANY, MENU_ITEMFLAGS_SELECTED,
    MENU_ITEMFLAGS_SKIPINVERT, MENU_FIRST_PAGE, MENU_LAST_PAGE,
    MENU_NEXT_PAGE, MENU_PREVIOUS_PAGE, MENU_SELECT_ALL, MENU_UNSELECT_ALL,
    MENU_INVERT_ALL, MENU_SELECT_PAGE, MENU_UNSELECT_PAGE, MENU_INVERT_PAGE,
    MENU_SEARCH, COPYRIGHT_BANNER_A, COPYRIGHT_BANNER_B, COPYRIGHT_BANNER_D,
    TELEPORT_BANNER_C, PL_NSIZ, ROWNO, COLNO,
} from './const.js';
import { genl_player_setup } from './role.js';
import { lowc } from './hacklib.js';
import { row_refresh, bot, flush_screen, pline, docrt } from './display.js';
import { extcmds_match } from './cmd.js';
import { extcmdlist, ECM_NOFLAGS, ECM_IGNOREAC, ECM_EXACTMATCH } from './func_tab.js';

// C ref: wintty.h TOPLINE_* states
const TOPLINE_EMPTY = 0;          /* empty */
const TOPLINE_NEED_MORE = 1;      /* non-empty, need --More-- */
const TOPLINE_NON_EMPTY = 2;      /* non-empty, no --More-- required */
const TOPLINE_SPECIAL_PROMPT = 3; /* special prompt state */

// C ref: wintty.h WIN_CANCELLED
const WIN_CANCELLED = 1;

// C ref: wintty.c defmorestr
const defmorestr = "--More--";

// C ref: wintty.c default_menu_cmds[]
const default_menu_cmds = [
    MENU_FIRST_PAGE, MENU_LAST_PAGE, MENU_NEXT_PAGE,
    MENU_PREVIOUS_PAGE, MENU_SELECT_ALL, MENU_UNSELECT_ALL,
    MENU_INVERT_ALL, MENU_SELECT_PAGE, MENU_UNSELECT_PAGE,
    MENU_INVERT_PAGE, MENU_SEARCH,
].join('');

/* window ids: wins[] is indexed by winid, like C */
function tty() { return game.ttyDisplay; }
function wins() { return game.tty_wins; }
function term() { return game.nhDisplay; }

// ---------------------------------------------------------------------------
// termcap.c: cursor motion and clearing on the Terminal grid

// C ref: termcap.c cmov()
function cmov(x, y) {
    const t = tty();
    t.curx = x;
    t.cury = y;
    term()?.setCursor(x, y);
}

// output one character at the cursor; NOMUX_CAPTURE keeps the screen
// shadow (here: the Terminal grid) in step with what putchar() shows
function xputc(ch) {
    const t = tty();
    term()?.setCell(t.curx, t.cury, ch, NO_COLOR, t.attrs);
}

// C ref: termcap.c term_start_attr(), term_end_attr()
function term_start_attr(attr) { tty().attrs = (attr === ATR_INVERSE) ? ATR_INVERSE : ATR_NONE; }
function term_end_attr(/*attr*/) { tty().attrs = ATR_NONE; }

// C ref: termcap.c cl_end() -- clear to end of line
function cl_end() {
    const t = tty();
    const d = term();
    if (!d) return;
    for (let c = t.curx; c < t.cols; c++) d.setCell(c, t.cury, ' ', NO_COLOR, 0);
    d.setCursor(t.curx, t.cury);
}

// C ref: termcap.c cl_eos() -- clear to end of screen
function cl_eos() {
    const t = tty();
    const d = term();
    if (!d) return;
    const cx = t.curx, cy = t.cury;
    cl_end();
    for (let r = cy + 1; r < t.rows; r++)
        for (let c = 0; c < t.cols; c++) d.setCell(c, r, ' ', NO_COLOR, 0);
    cmov(cx, cy);
    /* the status lines (rows - 2 on) are gone from the screen until the
       next bot() redraws them */
    if (cy <= t.rows - 2)
        game.status_shown = false;
}

// C ref: termcap.c term_clear_screen() -- and wintty.c erase_tty_screen(),
// which blanks the status window (tty_clear_nhwindow(WIN_STATUS) sets
// disp.botlx) once it is in use
function term_clear_screen() {
    term()?.clearScreen();
    cmov(0, 0);
    if (game.status_shown !== undefined) {
        game.status_shown = false;
        game.disp_botlx = true;
    }
}

// C ref: termcap.c home()
function home() { cmov(0, 0); }

// C ref: wintty.c tty_curs()
export function tty_curs(window, x, y) {
    const cw = wins()[window];
    cw.curx = --x; /* column 0 is never used */
    cw.cury = y;
    x += cw.offx;
    y += cw.offy;
    cmov(x, y);
}

// ---------------------------------------------------------------------------
// windows

function new_window(type) {
    return {
        type, flags: 0, active: 0, offx: 0, offy: 0, rows: 0, cols: 0,
        maxrow: 0, maxcol: 0, curx: 0, cury: 0, mlist: [], plist: [],
        npages: 0, nitems: 0, how: PICK_NONE, morestr: null, mbehavior: 0,
        data: null,
    };
}

// C ref: wintty.c tty_init_nhwindows() (the parts after the terminal setup)
export function tty_init_nhwindows() {
    const g = game;
    g.ttyDisplay = { rows: 24, cols: 80, curx: 0, cury: 0, toplin: TOPLINE_EMPTY,
                     inread: 0, inmore: 0, dismiss_more: 0, attrs: ATR_NONE, lastwin: WIN_ERR };
    g.tty_wins = [];

    /* set up the default windows */
    g.BASE_WINDOW = tty_create_nhwindow(NHW_BASE);
    wins()[g.BASE_WINDOW].active = 1;

    tty_clear_nhwindow(g.BASE_WINDOW);

    /* Move the copyright information a little further down to
     * row 3, out of the way. */
    tty_curs(g.BASE_WINDOW, 1, 4);
    tty_putstr(g.BASE_WINDOW, 0, COPYRIGHT_BANNER_A);
    tty_putstr(g.BASE_WINDOW, 0, COPYRIGHT_BANNER_B);
    tty_putstr(g.BASE_WINDOW, 0, TELEPORT_BANNER_C); /* nomakedefs.copyright_banner_c */
    tty_putstr(g.BASE_WINDOW, 0, COPYRIGHT_BANNER_D);
    tty_putstr(g.BASE_WINDOW, 0, "");

    /* Move to a default location for the "Shall I pick .." player
     * selection prompts, which also use the BASE_WINDOW. */
    tty_curs(g.BASE_WINDOW, 1, 11);

    /* C creates WIN_MESSAGE, WIN_STATUS and WIN_MAP later, in
       init_sound_disp_gamewindows(); the message window is needed for
       yn_function() during player selection, so create it here */
    g.WIN_MESSAGE = tty_create_nhwindow(NHW_MESSAGE);
}

// C ref: wintty.c tty_create_nhwindow()
export function tty_create_nhwindow(type) {
    const w = wins();
    const cw = new_window(type);
    let newid;

    switch (type) {
    case NHW_BASE:
        cw.offx = cw.offy = 0;
        cw.rows = tty().rows;
        cw.cols = tty().cols;
        cw.maxrow = cw.maxcol = 0;
        break;
    case NHW_MESSAGE:
        cw.offx = cw.offy = 0;
        cw.rows = cw.maxrow = 1;
        cw.cols = tty().cols;
        cw.maxcol = 0;
        break;
    case NHW_MENU:
    case NHW_TEXT:
        /* inventory/menu window, variable length, full width, top of screen;
           help window, the same, different semantics for display, etc */
        cw.offx = cw.offy = 0;
        cw.rows = 0;
        cw.cols = tty().cols;
        cw.maxrow = cw.maxcol = 0;
        break;
    default:
        throw new Error(`tty_create_nhwindow: window type ${type} not ported yet`);
    }

    for (newid = 0; newid < w.length; newid++)
        if (!w[newid])
            break;
    w[newid] = cw;
    return newid;
}

// C ref: wintty.c tty_clear_nhwindow()
export function tty_clear_nhwindow(window) {
    const cw = wins()[window];
    const t = tty();

    t.lastwin = window;
    switch (cw.type) {
    case NHW_MESSAGE:
        if (t.toplin !== TOPLINE_EMPTY) {
            home();
            cl_end();
            if (cw.cury)
                docorner(1, cw.cury + 1, 0);
            cw.curx = cw.cury = 0;
            t.toplin = TOPLINE_EMPTY;
        }
        break;
    case NHW_BASE:
        term_clear_screen();
        break;
    case NHW_MENU:
    case NHW_TEXT:
        if (cw.active)
            erase_menu_or_text(window, cw, true);
        cw.mlist = [];
        cw.nitems = 0;
        break;
    default:
        throw new Error(`tty_clear_nhwindow: window type ${cw.type} not ported yet`);
    }
    cw.curx = cw.cury = 0;
}

// C ref: wintty.c erase_menu_or_text()
async function erase_menu_or_text(window, cw, clear) {
    if (cw.offx === 0) {
        if (cw.offy) {
            tty_curs(window, 1, 0);
            cl_eos();
        } else if (clear) {
            term_clear_screen();
        } else {
            await docrt();
            await flush_screen(1);
        }
    } else {
        docorner(cw.offx, cw.maxrow + 1, 0);
    }
}

// C ref: wintty.c docorner()
// During role selection there is no map window yet, so the corner is
// just cleared. Afterwards the map rows underneath are refreshed
// (WIN_MAP has offx 0, offy 1) and the status lines redrawn if the
// corner reached them.
function docorner(xmin, ymax, ystart_offset) {
    const t = tty();
    const have_map = !!game.level && !game.program_state?.in_role_selection;

    if (!have_map) {
        for (let y = ystart_offset; y < ymax; y++) {
            tty_curs(game.BASE_WINDOW, xmin + 1, y);
            cl_end();
        }
        return;
    }
    const map_offy = 1;
    const ystart = ystart_offset ? ystart_offset : 0;

    for (let y = ystart; y < ymax; y++) {
        tty_curs(game.BASE_WINDOW, xmin, y); /* move cursor */
        if (!ystart_offset)
            cl_end();                         /* clear to end of line */
        if (y < map_offy || y > ROWNO)
            continue; /* only refresh board */
        row_refresh(xmin, COLNO - 1, y - map_offy);
    }

    if (ymax >= t.rows - 2 /* wins[WIN_STATUS]->offy */ && !ystart_offset) {
        /* we have wrecked the bottom line */
        game.disp_botlx = true;
        bot();
    }
}

// C ref: wintty.c tty_dismiss_nhwindow()
async function tty_dismiss_nhwindow(window) {
    const cw = wins()[window];

    switch (cw.type) {
    case NHW_MESSAGE:
        if (tty().toplin !== TOPLINE_EMPTY)
            tty().toplin = TOPLINE_EMPTY;
        cw.active = 0;
        break;
    case NHW_BASE:
        tty_curs(game.BASE_WINDOW, 1, tty().rows - 1);
        cw.active = 0;
        break;
    case NHW_MENU:
    case NHW_TEXT:
        if (cw.active) {
            let clearscreen = false; /* just erase the menu */

            /* during role/race/&c selection, menus are put up on top
               of the base window; we don't track what was there so
               can't refresh--force the screen to be cleared instead */
            if (game.program_state?.in_role_selection)
                clearscreen = true;

            await erase_menu_or_text(window, cw, clearscreen);
            cw.active = 0;
        }
        break;
    }
    cw.flags = 0;
}

// C ref: wintty.c tty_destroy_nhwindow()
export async function tty_destroy_nhwindow(window) {
    const cw = wins()[window];

    if (cw.active)
        await tty_dismiss_nhwindow(window);
    wins()[window] = null;
}

// C ref: wintty.c tty_putstr() (NHW_BASE, NHW_MESSAGE, NHW_MENU, NHW_TEXT);
// the message window and a full NHW_TEXT page may wait for a key, so
// callers await this
export function tty_putstr(window, attr, str) {
    const cw = wins()[window];
    const t = tty();

    if (str == null
        || ((cw.flags & WIN_CANCELLED) && (cw.type !== NHW_MESSAGE)))
        return;
    switch (cw.type) {
    case NHW_MESSAGE:
        /* update_topl() may wait at --More--, so callers await this */
        return update_topl(str);
    case NHW_BASE:
        tty_curs(window, cw.curx + 1, cw.cury);
        term_start_attr(attr);
        for (const ch of str) {
            if (t.curx >= t.cols - 1) {
                cw.curx = 0;
                cw.cury++;
                tty_curs(window, cw.curx + 1, cw.cury);
            }
            xputc(ch);
            t.curx++;
        }
        cw.curx = 0;
        cw.cury++;
        term_end_attr(attr);
        break;
    case NHW_MENU:
    case NHW_TEXT:
        return tty_putstr_menu_text(window, cw, attr, str);
    default:
        throw new Error(`tty_putstr: window type ${cw.type} not ported yet`);
    }
}

// C ref: wintty.c tty_putstr() -- the NHW_MENU and NHW_TEXT case
async function tty_putstr_menu_text(window, cw, attr, str) {
    const t = tty();
    let i;

    /* H2344_BROKEN */
    if (cw.type === NHW_TEXT && (cw.cury + cw.offy) === t.rows - 1) {
        /* not a menu, so save memory and output 1 page at a time */
        cw.maxcol = t.cols; /* force full-screen mode */
        await tty_display_nhwindow(window, true);
        for (i = 0; i < cw.maxrow; i++)
            if (cw.data[i])
                cw.data[i] = null;
        cw.maxrow = cw.cury = 0;
    }
    /* always grows one at a time, but alloc 12 at a time */
    if (!cw.data)
        cw.data = [];
    if (cw.cury >= cw.rows) {
        cw.rows += 12;
        for (i = cw.maxrow; i < cw.rows; i++)
            cw.data[i] = null;
    }
    const n0 = str.length + 1;
    /* data[i] = { attr, str }: C keeps attr + 1 in the first byte */
    cw.data[cw.cury] = { attr, str };

    if (n0 > cw.maxcol)
        cw.maxcol = n0;
    if (++cw.cury > cw.maxrow)
        cw.maxrow = cw.cury;
    if (n0 > t.cols) { /* CO */
        /* attempt to break the line */
        for (i = t.cols - 1; i && str[i] !== ' ' && str[i] !== '\n';)
            i--;
        if (i) {
            /* cw->data[cw->cury - 1][++i] = '\0': the stored copy is
               offset by the attribute byte, so it ends before str[i-1] */
            ++i;
            cw.data[cw.cury - 1].str = str.slice(0, i - 1);
            await tty_putstr(window, attr, str.slice(i));
        }
    }
}

// ---------------------------------------------------------------------------
// topl.c: the message window (top line)

// C ref: wintty.h WIN_STOP, WIN_NOSTOP, WIN_LOCKHISTORY
export const WIN_STOP = 1;
const WIN_NOSTOP = 0x10;
const WIN_LOCKHISTORY = 4;

// C ref: topl.c redotoplin()
async function redotoplin(str) {
    const t = tty();
    const otoplin = t.toplin;

    home();
    /* end_glyphout(): in case message printed during graphics output */
    putsyms(str);
    cl_end();
    t.toplin = TOPLINE_NEED_MORE;
    if (t.cury && otoplin !== TOPLINE_SPECIAL_PROMPT)
        await more();
}

// C ref: topl.c remember_topl() -- used by update_topl(); the message
// history (cw->data[]) is kept for ^P, which is not ported yet
function remember_topl() {
    const cw = wins()[game.WIN_MESSAGE];

    if ((cw.flags & WIN_LOCKHISTORY) || !game.toplines)
        return;
    if (!cw.data)
        cw.data = [];
    cw.data.push(game.toplines);
    game.toplines = '';
}

// C ref: topl.c addtopl()
function addtopl(s) {
    const cw = wins()[game.WIN_MESSAGE];

    tty_curs(game.BASE_WINDOW, cw.curx + 1, cw.cury);
    putsyms(s);
    cl_end();
    tty().toplin = TOPLINE_NEED_MORE;
}

// C ref: topl.c more()
export async function more() {
    const cw = wins()[game.WIN_MESSAGE];
    const t = tty();

    /* avoid recursion -- only happens from interrupts */
    if (t.inmore)
        return;

    t.inmore++;

    if (t.toplin) {
        tty_curs(game.BASE_WINDOW, cw.curx + 1, cw.cury);
        if (cw.curx >= t.cols - 8)
            topl_putsym('\n');
    }

    /* flags.standout is off by default */
    putsyms(defmorestr);

    await xwaitforspace("\x1b ");

    if (game.morc === '\x1b') {
        if (!(cw.flags & WIN_NOSTOP))
            cw.flags |= WIN_STOP;
    }

    if (t.toplin && cw.cury) {
        docorner(1, cw.cury + 1, 0);
        cw.curx = cw.cury = 0;
        home();
    } else if (game.morc === '\x1b') {
        cw.curx = cw.cury = 0;
        home();
        cl_end();
    }
    t.toplin = TOPLINE_EMPTY;
    t.inmore = 0;
}

// C ref: topl.c update_topl()
async function update_topl(bp) {
    const t = tty();
    const cw = wins()[game.WIN_MESSAGE];
    const CO = t.cols;
    let skip = (cw.flags & (WIN_STOP | WIN_NOSTOP)) === WIN_STOP;
    let notdied = true;
    let n0;

    if (game.toplines === undefined)
        game.toplines = '';

    /* If there is room on the line, print message on same line */
    /* But messages like "You die..." deserve their own line */
    n0 = bp.length;
    if ((t.toplin === TOPLINE_NEED_MORE || skip)
        && cw.cury === 0
        && n0 + game.toplines.length + 3 < CO - 8 /* room for --More-- */
        && (notdied = !bp.startsWith("You die"))) {
        game.toplines += "  " + bp;
        cw.curx += 2;
        if (!skip)
            addtopl(bp);
        return;
    } else if (!skip) {
        if (t.toplin === TOPLINE_NEED_MORE) {
            await more();
        } else if (cw.cury) { /* for toplin==TOPLINE_NON_EMPTY && cury > 1 */
            docorner(1, cw.cury + 1, 0); /* reset cury = 0 if redraw screen */
            cw.curx = cw.cury = 0;   /* from home--cls() & docorner(1,n,0) */
        }
    }
    remember_topl();
    let tl = bp.slice(0, 256 - 1); /* TBUFSZ */

    /* break the message into lines of fewer than CO characters */
    let pos = 0;
    for (; n0 >= CO; ) {
        const otl = pos;
        let i;
        for (i = pos + CO - 1; i !== otl; --i)
            if (tl[i] === ' ')
                break;
        if (i === otl) {
            /* Eek!  A huge token.  Try splitting after it. */
            i = tl.indexOf(' ', otl);
            if (i < 0)
                break; /* No choice but to spit it out whole. */
        }
        tl = tl.slice(0, i) + '\n' + tl.slice(i + 1);
        pos = i + 1;
        n0 = tl.length - pos;
    }
    game.toplines = tl;
    if (!notdied) { /* double negative => "You die"; avoid suppressing mesg */
        cw.flags &= ~WIN_STOP;
        skip = false;
    }
    if (!skip)
        await redotoplin(game.toplines);
}

// C ref: topl.c topl_putsym()
function topl_putsym(c) {
    const cw = wins()[game.WIN_MESSAGE];
    const t = tty();

    switch (c) {
    case '\b':
        if (t.curx === 0 && t.cury > 0)
            tty_curs(game.BASE_WINDOW, t.cols, t.cury - 1);
        /* backsp() */
        t.curx--;
        cw.curx = t.curx;
        cmov(t.curx, t.cury);
        return;
    case '\n':
        cl_end();
        t.curx = 0;
        t.cury++;
        cw.cury = t.cury;
        cmov(t.curx, t.cury);
        break;
    default:
        if (t.curx === t.cols - 1)
            topl_putsym('\n'); /* 1 <= curx < CO; avoid CO */
        xputc(c);
        t.curx++;
    }
    cw.curx = t.curx;
    if (cw.curx === 0)
        cl_end();
    cmov(t.curx, t.cury);
}

// C ref: topl.c putsyms()
function putsyms(str) {
    for (const c of str)
        topl_putsym(c);
}

// ---------------------------------------------------------------------------
// prompts

// C ref: wintty.c tty_askname()
/*
 * plname is filled either by an option (-u Player  or  -uPlayer) or
 * explicitly (by being the wizard) or by askname.
 */
export async function tty_askname() {
    const g = game;
    const BASE_WINDOW = g.BASE_WINDOW;
    const who_are_you = "Who are you? ";
    let c, ct, tryct = 0;
    let name;

    tty_putstr(BASE_WINDOW, 0, "");
    do {
        if (++tryct > 1) {
            if (tryct > 10)
                throw new Error('tty_askname: bail("Giving up after 10 tries.")');
            tty_curs(BASE_WINDOW, 1, wins()[BASE_WINDOW].cury - 1);
            tty_putstr(BASE_WINDOW, 0, "Enter a name for your character...");
            /* erase previous prompt (in case of ESC after partial response) */
            tty_curs(BASE_WINDOW, 1, wins()[BASE_WINDOW].cury);
            cl_end();
        }
        tty_putstr(BASE_WINDOW, 0, who_are_you);
        tty_curs(BASE_WINDOW, who_are_you.length + 1,
                 wins()[BASE_WINDOW].cury - 1);
        ct = 0;
        name = [];
        while ((c = String.fromCharCode(await nhgetch())) !== '\n') {
            if (c === '\r')
                break;
            if (c === '\x1b') {
                ct = 0;
                break;
            } /* continue outer loop */
            /* some people get confused when their erase char is not ^H */
            if (c === '\b' || c === '\x7f') {
                if (ct) {
                    ct--;
                    name.pop();
                    /* NOMUX_CAPTURE: mirror the visible erase */
                    if (tty().curx > 0)
                        tty().curx--;
                    xputc(' ');
                    cmov(tty().curx, tty().cury);
                }
                continue;
            }
            /* UNIX */
            if (c !== '-' && c !== '@')
                if (!(c >= 'a' && c <= 'z') && !(c >= 'A' && c <= 'Z')
                    /* reject leading digit but allow digits elsewhere */
                    && !(c >= '0' && c <= '9' && ct > 0))
                    c = '_';
            if (ct < PL_NSIZ - 1) {
                xputc(c);
                tty().curx++;
                cmov(tty().curx, tty().cury);
                name[ct++] = c;
            }
        }
        g.plname = name.slice(0, ct).join('');
    } while (ct === 0);

    /* move to next line to simulate echo of user's <return> */
    tty_curs(BASE_WINDOW, 1, wins()[BASE_WINDOW].cury + 1);

    /* since we let user pick an arbitrary name now, he/she can pick
       another one during role selection */
    g.iflags.renameallowed = true;
}

// C ref: wintty.c tty_player_selection()
export async function tty_player_selection() {
    if (await genl_player_setup(tty().rows))
        return;

    /* bail((char *) 0); */
    throw new Error('tty_player_selection: player quit during role selection');
}

// C ref: cmd.c readchar() -- the plain-key case
async function readchar() {
    return String.fromCharCode(await nhgetch());
}

// C ref: topl.c tty_yn_function()
/*
 * Generic yes/no function.  'def' is the default (returned by space
 * or return; 'esc' returns 'q', or 'n', or the default, depending on
 * what's in the expected-response string.  The 'query' string is
 * printed before the user is asked about the string.
 *
 * If resp is NULL, any single character is accepted and returned.
 */
export async function tty_yn_function(query, resp, def) {
    const t = tty();
    let q;
    let prompt;

    const cw = wins()[game.WIN_MESSAGE];
    if (t.toplin === TOPLINE_NEED_MORE && !(cw.flags & WIN_STOP))
        await more();
    cw.flags &= ~WIN_STOP;
    t.toplin = TOPLINE_SPECIAL_PROMPT;
    t.inread++;
    if (resp) {
        let preserve_case = false;
        const allow_num = resp.includes('#');
        let respbuf = resp;
        /* normally we force lowercase, but if any uppercase letters
           are present in the allowed response, preserve case;
           check this before stripping the hidden choices */
        if (/[A-Z]/.test(respbuf))
            preserve_case = true;
        /* any acceptable responses that follow <esc> aren't displayed */
        const rb = respbuf.indexOf('\x1b');
        if (rb >= 0)
            respbuf = respbuf.slice(0, rb);
        prompt = `${query.slice(0, 255)} [${respbuf}]`;
        if (def && def !== '\0')
            prompt += ` (${def})`;
        /* not pline("%s ", prompt);
           trailing space is wanted here in case of reprompt */
        prompt += ' ';
        await update_topl(prompt); /* custompline(OVERRIDE_MSGTYPE | SUPPRESS_HISTORY) */

        do { /* loop until we get valid input */
            q = await readchar();
            if (!preserve_case)
                q = lowc(q);
            if (q === '\x10') /* ctrl-P */
                throw new Error('tty_yn_function: ^P message history not ported yet');
            const digit_ok = allow_num && q >= '0' && q <= '9';
            if (q === '\x1b') {
                if (resp.includes('q'))
                    q = 'q';
                else if (resp.includes('n'))
                    q = 'n';
                else
                    q = def;
                break;
            } else if (quitchars.includes(q)) {
                q = def;
                break;
            }
            if (!resp.includes(q) && !digit_ok) {
                /* tty_nhbell(); */
                q = '\0';
            } else if (q === '#' || digit_ok) {
                throw new Error('tty_yn_function: # count responses not ported yet');
            }
        } while (q === '\0');
        /* clean_up: gt.toplines is rewritten to prompt + key2txt(q) */
        game.toplines = prompt + q;
    } else {
        /* no restriction on allowed response, so always preserve case */
        prompt = `${query} `;
        await update_topl(prompt); /* custompline(OVERRIDE_MSGTYPE | SUPPRESS_HISTORY) */
        q = await readchar();
    }
    /* clean_up: */
    t.inread--;
    t.toplin = TOPLINE_NON_EMPTY;
    if (wins()[game.WIN_MESSAGE].cury)
        tty_clear_nhwindow(game.WIN_MESSAGE);
    return q;
}

// ---------------------------------------------------------------------------
// getline.c: line input on the message line

// erase and kill characters of the terminal (xxxtty.c erase_char,
// kill_char): the usual stty settings
const erase_char = '\x7f', kill_char = '\x15';
const BUFSZ = 256;

// C ref: getline.c tty_getlin()
// (callers reach it directly, so it also does what the core's wrapper,
// windows.c getlin(), does: no status line updates while it's up; the
// command queue isn't ported)
export async function tty_getlin(query) {
    const old_bot_disabled = game.bot_disabled; /* getlin() */

    if (!game.program_state) game.program_state = {};
    game.program_state.in_getlin = 1;
    game.bot_disabled = true;
    game.suppress_history = false;
    const buf = await hooked_tty_getlin(query, null);
    game.bot_disabled = old_bot_disabled;
    game.program_state.in_getlin = 0;
    return buf;
}

// C ref: getline.c hooked_tty_getlin() (NEWAUTOCOMP, !EDIT_GETLIN);
// the line read is returned instead of filled into bufp
async function hooked_tty_getlin(query, hook) {
    const cw = wins()[game.WIN_MESSAGE];
    const t = tty();
    let obufp = '';  /* the text */
    let bufp = 0;    /* the cursor position in it */
    let c;

    if (t.toplin === TOPLINE_NEED_MORE && !(cw.flags & WIN_STOP))
        await more();
    cw.flags &= ~WIN_STOP;
    t.toplin = TOPLINE_SPECIAL_PROMPT;
    t.inread++;

    /*
     * Issue the prompt.
     * custompline(OVERRIDE_MSGTYPE | SUPPRESS_HISTORY, "%s ", query)
     */
    await custompline(`${query} `);

    for (;;) {
        game.toplines = `${query} ${obufp}`;
        c = String.fromCharCode(await nhgetch());
        if (c === '\x1b') {
            if (obufp !== '') {
                obufp = '';
                bufp = 0;
                tty_clear_nhwindow(game.WIN_MESSAGE);
                cw.maxcol = cw.maxrow;
                addtopl(query);
                addtopl(" ");
                addtopl(obufp);
            } else {
                obufp = '\x1b';
                break;
            }
        }
        if (c === '\x10') /* ctrl-P */
            throw new Error('hooked_tty_getlin(): ^P message history not ported yet');
        if (c === erase_char || c === '\b') {
            if (bufp !== 0) {
                bufp--;
                putsyms("\b");
                let i;
                for (i = bufp; i < obufp.length; ++i)
                    putsyms(" ");
                for (; i > bufp; --i)
                    putsyms("\b");
                obufp = obufp.slice(0, bufp);
            } else {
                /* tty_nhbell(); */
            }
        } else if (c === '\n' || c === '\r') {
            break;
        } else if (' ' <= c && c !== '\x7f'
                   && (bufp < BUFSZ - 1 && bufp < COLNO)) {
            let i = obufp.length; /* eos(bufp) */

            obufp = obufp.slice(0, bufp) + c;
            putsyms(c);
            bufp++;
            let completed;
            if (hook && (completed = hook(obufp)) !== null) {
                obufp = completed;
                putsyms(obufp.slice(bufp));
                /* pointer and cursor left where they were */
                for (i = bufp; i < obufp.length; ++i)
                    putsyms("\b");
            } else if (i > bufp) {
                let s = i;

                /* erase rest of prior guess */
                for (; i > bufp; --i)
                    putsyms(" ");
                for (; s > bufp; --s)
                    putsyms("\b");
            }
        } else if (c === kill_char || c === '\x7f') { /* Robert Viduya */
            /* this test last - @ might be the kill_char */
            for (; bufp < obufp.length; ++bufp)
                putsyms(" ");
            for (; bufp !== 0; --bufp)
                putsyms("\b \b");
            obufp = '';
        } else {
            /* tty_nhbell(); */
        }
    }
    t.toplin = TOPLINE_NON_EMPTY;
    t.inread--;
    tty_clear_nhwindow(game.WIN_MESSAGE); /* clean up after ourselves */

    if (game.suppress_history) {
        /* prevent next message from pushing current query+answer into
           tty message history */
        game.toplines = '';
    }
    return obufp;
}

// C ref: pline.c custompline() -- vpline() of a prompt: bring the map up
// to date, then put the text in the message window
async function custompline(line) {
    if (game.u?.ux)
        await flush_screen(1);
    await tty_putstr(game.WIN_MESSAGE, 0, line);
}

// C ref: getline.c ext_cmd_getlin_hook()
/*
 * Implement extended command completion by using this hook into
 * tty_getlin.  Check the characters already typed, if they uniquely
 * identify an extended command, expand the string to the whole
 * command.
 *
 * Returns the extended string, or null if base was not extended.
 */
function ext_cmd_getlin_hook(base) {
    const ecmatches = extcmds_match(base, ECM_NOFLAGS);

    if (ecmatches.length === 1)
        return extcmdlist[ecmatches[0]].ef_txt;

    return null; /* didn't match anything */
}

// C ref: getline.c tty_get_ext_cmd()
/*
 * Read in an extended command, doing command line completion.  We
 * stop when we have found enough characters to make a unique command.
 */
export async function tty_get_ext_cmd() {
    /* iflags.extmenu is off by default */
    game.suppress_history = true;
    const extcmd_char = '#'; /* extcmd_initiator() */
    let buf = await hooked_tty_getlin(extcmd_char,
                                      !game.in_doagain ? ext_cmd_getlin_hook : null);
    buf = buf.replace(/[ \t]+/g, ' ').trim(); /* mungspaces() */

    const ecmatches = (buf === '' || buf[0] === '\x1b') ? null
                    : extcmds_match(buf, ECM_IGNOREAC | ECM_EXACTMATCH);
    const nmatches = ecmatches ? ecmatches.length : -1;
    if (nmatches !== 1) {
        if (nmatches !== -1)
            await pline(`${extcmd_char}${buf.slice(0, 60)}: unknown extended command.`);
        return -1;
    }

    return ecmatches[0];
}

// ---------------------------------------------------------------------------
// menus

// C ref: wintty.c tty_start_menu()
export function tty_start_menu(window, mbehavior) {
    tty_clear_nhwindow(window);
    wins()[window].mbehavior = mbehavior;
}

// C ref: wintty.c tty_add_menu()
export function tty_add_menu(window, glyphinfo, identifier, ch, gch, attr, clr,
                             str, itemflags) {
    const cw = wins()[window];
    const preselected = ((itemflags & MENU_ITEMFLAGS_SELECTED) !== 0);
    let newstr;

    if (str == null)
        return;

    cw.nitems++;
    if (identifier) {
        newstr = `${ch || '?'} - ${str}`;
    } else
        newstr = str;

    cw.mlist.push({
        identifier, count: -1, selected: preselected, itemflags,
        selector: ch || '', gselector: gch || '', attr, color: clr,
        str: newstr,
    });
}

// C ref: windows.c add_menu_str()
export function add_menu_str(window, buf) {
    tty_add_menu(window, null, 0, '', '', ATR_NONE, NO_COLOR, buf, 0);
}

// C ref: wintty.c tty_end_menu()
export function tty_end_menu(window, prompt) {
    const cw = wins()[window];
    const t = tty();
    let len, lmax, n;
    let menu_ch;

    /* Put the prompt at the beginning of the menu. */
    if (prompt) {
        /* tty_menu_promptstyle: menu headings are shown in inverse video */
        cw.mlist.unshift({ identifier: 0, count: -1, selected: false, itemflags: 0,
                           selector: '', gselector: '', attr: ATR_INVERSE,
                           color: NO_COLOR, str: prompt },
                         { identifier: 0, count: -1, selected: false, itemflags: 0,
                           selector: '', gselector: '', attr: ATR_NONE,
                           color: NO_COLOR, str: "" });
        cw.nitems += 2;
    }

    /* 52: 'a'..'z' and 'A'..'Z'; avoids selector duplication within a page */
    lmax = Math.min(52, t.rows - 1);                     /* # lines per page */
    cw.npages = Math.trunc((cw.nitems + (lmax - 1)) / lmax); /* # of pages */
    cw.plist = [];

    cw.cols = 0;
    menu_ch = '?';
    for (n = 0; n < cw.mlist.length; n++) {
        const curr = cw.mlist[n];
        /* set page boundaries and character accelerators */
        if ((n % lmax) === 0) {
            menu_ch = 'a';
            cw.plist[Math.trunc(n / lmax)] = n;
        }
        if (curr.identifier && !curr.selector) {
            curr.str = menu_ch + curr.str.slice(1);
            curr.selector = menu_ch;
            if (menu_ch === 'z') menu_ch = 'A';
            else menu_ch = String.fromCharCode(menu_ch.charCodeAt(0) + 1);
        }

        /* cut off any lines that are too long */
        len = curr.str.length + 2; /* extra space at beg & end */
        if (len > t.cols) {
            curr.str = curr.str.slice(0, t.cols - 2);
            len = t.cols;
        }
        if (len > cw.cols)
            cw.cols = len;
    }
    cw.plist[cw.npages] = cw.mlist.length; /* plist terminator */

    /*
     * If greater than 1 page, morestr is "(x of y) " otherwise, "(end) "
     */
    if (cw.npages > 1) {
        len = `(${cw.npages} of ${cw.npages}) `.length;
        cw.morestr = "";
    } else {
        cw.morestr = "(end) ";
        len = cw.morestr.length;
    }
    if (len > cw.cols)
        cw.cols = len;

    cw.maxcol = cw.cols;

    /*
     * The number of lines in the first page plus the morestr will be the
     * maximum size of the window.
     */
    if (cw.npages > 1)
        cw.maxrow = cw.rows = lmax + 1;
    else
        cw.maxrow = cw.rows = cw.nitems + 1;
}

// C ref: wintty.c tty_select_menu()
// (callers reach it directly, so it also does what the core's wrapper,
// windows.c select_menu(), does: no status line updates while it's up)
export async function tty_select_menu(window, how) {
    const cw = wins()[window];
    let n, cancelled;
    const old_bot_disabled = game.bot_disabled; /* select_menu() */

    game.bot_disabled = true;
    cw.how = how;
    await tty_display_nhwindow(window, true);
    cancelled = !!(cw.flags & WIN_CANCELLED);
    await tty_dismiss_nhwindow(window); /* does not destroy window data */
    game.bot_disabled = old_bot_disabled;

    const selected = [];
    if (cancelled) {
        n = -1;
    } else {
        for (const curr of cw.mlist)
            if (curr.selected)
                selected.push({ item: curr.identifier, count: curr.count });
        n = selected.length;
    }
    return { n, selected };
}

// C ref: wintty.c tty_message_menu()
export async function tty_message_menu(let_, how, mesg) {
    const t = tty();
    /* "menu" without selection; use ordinary pline, no more() */
    if (how === PICK_NONE) {
        await pline(mesg);
        return '\0';
    }

    t.dismiss_more = let_;
    game.morc = '\0';
    /* barebones pline(); since we're only supposed to be called after
       response to a prompt, we'll assume that the display is up to date */
    await tty_putstr(game.WIN_MESSAGE, 0, mesg);
    /* if `mesg' didn't wrap (triggering --More--), force --More-- now */
    if (t.toplin === TOPLINE_NEED_MORE) {
        await more();
        t.toplin = TOPLINE_NEED_MORE; /* more resets this */
        tty_clear_nhwindow(game.WIN_MESSAGE);
    }
    /* normally <ESC> means skip further messages, but in this case
       it means cancel the current prompt; any other messages should
       continue to be output normally */
    wins()[game.WIN_MESSAGE].flags &= ~WIN_CANCELLED;
    t.dismiss_more = 0;

    return ((how === PICK_ONE && game.morc === let_) || game.morc === '\x1b')
        ? game.morc : '\0';
}

// C ref: wintty.c tty_display_nhwindow() (NHW_TEXT and NHW_MENU)
export async function tty_display_nhwindow(window, blocking) {
    const cw = wins()[window];
    const t = tty();

    if (cw.flags & WIN_CANCELLED)
        return;
    t.lastwin = window;

    switch (cw.type) {
    case NHW_MESSAGE:
        if (t.toplin === TOPLINE_NEED_MORE) {
            await more();
            t.toplin = TOPLINE_NEED_MORE; /* more resets this */
            tty_clear_nhwindow(window);
        } else
            t.toplin = TOPLINE_EMPTY;
        cw.curx = cw.cury = 0;
        return;
    case NHW_TEXT:
        cw.maxcol = t.cols; /* force full-screen mode */
        /*FALLTHRU*/
    case NHW_MENU: {
        cw.active = 1;
        const s_maxcol = cw.maxcol;
        /* H2344_BROKEN */
        cw.offx = (cw.type === NHW_TEXT)
                       ? 0
                       : Math.min(Math.min(82, Math.trunc(t.cols / 2)),
                                  t.cols - s_maxcol - 1);
        if (cw.offx < 0)
            cw.offx = 0;
        if (cw.type === NHW_MENU)
            cw.offy = 0;
        if (t.toplin === TOPLINE_NEED_MORE)
            await tty_display_nhwindow(game.WIN_MESSAGE, true);
        /* H2344_BROKEN; iflags.menu_overlay is on by default */
        if (cw.maxrow >= t.rows || game.iflags?.menu_overlay === false) {
            cw.offx = 0;
            if (cw.offy || game.iflags?.menu_overlay !== false) {
                tty_curs(window, 1, 0);
                cl_eos();
            } else
                term_clear_screen();
            t.toplin = TOPLINE_EMPTY;
        } else {
            if (game.WIN_MESSAGE !== WIN_ERR)
                tty_clear_nhwindow(game.WIN_MESSAGE);
        }

        if (cw.data || !cw.maxrow)
            await process_text_window(window, cw);
        else
            await process_menu_window(window, cw);
        break;
    }
    default:
        throw new Error(`tty_display_nhwindow: window type ${cw.type} not ported yet`);
    }
    cw.active = 1;
}

// C ref: wintty.c set_item_state()
function set_item_state(window, lineno, item) {
    const ch = item.selected ? (item.count === -1 ? '+' : '#') : '-';

    tty_curs(window, 4, lineno);
    term_start_attr(item.attr);
    xputc(ch);
    tty().curx++;
    term_end_attr(item.attr);
}

// C ref: wintty.c toggle_menu_curr()
function toggle_menu_curr(window, curr, lineno, in_view, counting, count) {
    if (curr.selected) {
        if (counting && count > 0) {
            curr.count = count;
            if (in_view)
                set_item_state(window, lineno, curr);
            return true;
        } else { /* change state */
            curr.selected = false;
            curr.count = -1;
            if (in_view)
                set_item_state(window, lineno, curr);
            return true;
        }
    } else { /* !selected */
        if (counting && count > 0) {
            curr.count = count;
            curr.selected = true;
            if (in_view)
                set_item_state(window, lineno, curr);
            return true;
        } else if (!counting) {
            curr.selected = true;
            if (in_view)
                set_item_state(window, lineno, curr);
            return true;
        }
        /* do nothing counting&&count==0 */
    }
    return false;
}

// C ref: wintty.c menuitem_invert_test()
function menuitem_invert_test(mode, itemflags, is_selected) {
    const skipinvert = (itemflags & MENU_ITEMFLAGS_SKIPINVERT) !== 0;

    if ((game.iflags?.menuinvertmode === 1 || game.iflags?.menuinvertmode === 2)
        && !mode && skipinvert && !is_selected)
        return false;
    else if (game.iflags?.menuinvertmode === 2
             && !mode && skipinvert && is_selected)
        return true;
    else if (game.iflags?.menuinvertmode === 2
             && mode === 1 && skipinvert && !is_selected)
        return false;
    return true;
}

// C ref: wintty.c invert_all_on_page()
function invert_all_on_page(window, page_start, page_end, acc, count) {
    const cw = wins()[window];
    let n;

    for (n = 0; page_start + n < page_end; n++) {
        const curr = cw.mlist[page_start + n];
        if (curr.identifier && (acc === 0 || curr.gselector === acc)
            && menuitem_invert_test(0, curr.itemflags, curr.selected)) {
            if (curr.selected) {
                curr.selected = false;
                curr.count = -1;
            } else {
                curr.selected = true;
                if (count > 0)
                    curr.count = count;
            }
            set_item_state(window, n, curr);
        }
    }
}

// C ref: wintty.c invert_all()
function invert_all(window, page_start, page_end, acc, count) {
    const cw = wins()[window];

    /* handle current page separately (it will need screen updating) */
    invert_all_on_page(window, page_start, page_end, acc, count);

    /* invert the rest (no screen updating for them) */
    for (let i = 0; i < cw.mlist.length; i++) {
        const curr = cw.mlist[i];
        const on_curr_page = (i >= page_start && i < page_end);

        if (on_curr_page || !curr.identifier
            || (acc ? curr.gselector !== acc
                : !menuitem_invert_test(0, curr.itemflags, curr.selected)))
            continue;

        if (curr.selected) {
            curr.selected = false;
            curr.count = -1;
        } else {
            curr.selected = true;
            if (count > 0)
                curr.count = count;
        }
    }
}

// C ref: getline.c xwaitforspace()
/* chars allowed besides return */
async function xwaitforspace(s) {
    const t = tty();
    const x = t.dismiss_more ? t.dismiss_more : '\n';
    let c;

    game.morc = '';
    for (;;) {
        c = String.fromCharCode(await nhgetch());
        if (c === '\n' || c === '\r')
            break;
        /* iflags.cbreak */
        if (c === '\x1b') {
            t.dismiss_more = 1;
            game.morc = '\x1b';
            break;
        }
        if ((s && s.includes(c)) || c === x || (x === '\n' && c === '\r')) {
            game.morc = c;
            break;
        }
        /* tty_nhbell(); */
    }
}

// C ref: wintty.c dmore()
async function dmore(cw, s) {
    const prompt = cw.morestr ? cw.morestr : defmorestr;
    const offset = (cw.type === NHW_TEXT) ? 1 : 2;
    const t = tty();

    tty_curs(game.BASE_WINDOW, t.curx + offset, t.cury);
    for (const ch of prompt) {
        xputc(ch);
        t.curx++;
    }
    cmov(t.curx, t.cury);

    await xwaitforspace(s);
}

// C ref: wintty.c quitchars
const quitchars = " \r\n\x1b";

// C ref: wintty.c process_text_window()
async function process_text_window(window, cw) {
    const t = tty();
    let i, n, attr;

    for (n = 0, i = 0; i < cw.maxrow; i++) {
        if (!cw.offx && (n + cw.offy === t.rows - 1)) {
            tty_curs(window, 1, n);
            cl_end();
            await dmore(cw, quitchars);
            if (game.morc === '\x1b') {
                cw.flags |= WIN_CANCELLED;
                break;
            }
            if (cw.offy) {
                tty_curs(window, 1, 0);
                cl_eos();
            } else
                term_clear_screen();
            n = 0;
        }
        tty_curs(window, 1, n++);
        /* H2344_BROKEN */
        cl_end();
        if (cw.data[i]) {
            attr = cw.data[i].attr;
            if (cw.offx) {
                xputc(' ');
                ++t.curx;
            }
            term_start_attr(attr);
            const str = cw.data[i].str;
            for (let cp = 0; cp < str.length && ++t.curx < t.cols; cp++) {
                t.curx--; /* xputc() writes at curx; NOMUX bookkeeping */
                xputc(str[cp]);
                t.curx++;
            }
            term_end_attr(attr);
        }
    }
    if (i === cw.maxrow) {
        /* H2344_BROKEN */
        if (cw.type === NHW_TEXT) {
            tty_curs(game.BASE_WINDOW, 1, t.cury + 1);
            cl_eos();
        }
        tty_curs(game.BASE_WINDOW, cw.offx + 1,
                 (cw.type === NHW_TEXT) ? t.rows - 1 : n);
        cl_end();
        await dmore(cw, quitchars);
        if (game.morc === '\x1b')
            cw.flags |= WIN_CANCELLED;
    }
}

// C ref: wintty.c process_menu_window()
async function process_menu_window(window, cw) {
    const t = tty();
    let page_start = -1, page_end = -1;
    let count;
    let n, attr_n, curr_page, page_lines;
    let finished, counting, reset_count;
    let resp = '', resp_len = 0;
    const msave = cw.morestr; /* save the morestr */
    let gacc = '';

    curr_page = page_lines = 0;
    counting = false;
    count = 0;
    reset_count = true;
    finished = false;

    /* collect group accelerators; for PICK_NONE, they're ignored;
       for PICK_ONE, only those which match exactly one entry will be
       accepted; for PICK_ANY, those which match any entry are okay */
    if (cw.how !== PICK_NONE) {
        const gcnt = {};
        n = 0;
        for (const curr of cw.mlist)
            if (curr.gselector && curr.gselector !== curr.selector) {
                ++n;
                gcnt[curr.gselector] = (gcnt[curr.gselector] || 0) + 1;
            }

        if (n > 0) /* at least one group accelerator found */
            for (const curr of cw.mlist)
                if (curr.gselector
                    && (curr.gselector !== curr.selector
                        || curr.gselector === '$')
                    && !gacc.includes(curr.gselector)
                    && (cw.how === PICK_ANY
                        || gcnt[curr.gselector] === 1)) {
                    gacc += curr.gselector;
                }
    }

    /* loop until finished */
    while (!finished) {
        if (reset_count) {
            counting = false;
            count = 0;
        } else
            reset_count = true;

        if (page_start < 0) {
            /* new page to be displayed */
            /* clear screen */
            if (!cw.offx) { /* if not corner, do clearscreen */
                if (cw.offy) {
                    tty_curs(window, 1, 0);
                    cl_eos();
                } else
                    term_clear_screen();
            }

            resp = '';
            if (cw.npages > 0) {
                /* collect accelerators */
                page_start = cw.plist[curr_page];
                page_end = cw.plist[curr_page + 1];
                for (page_lines = 0; page_start + page_lines < page_end; page_lines++) {
                    const curr = cw.mlist[page_start + page_lines];
                    let attr;

                    if (curr.selector)
                        resp += curr.selector;

                    tty_curs(window, 1, page_lines);
                    if (cw.offx)
                        cl_end();

                    xputc(' ');
                    ++t.curx;

                    attr = curr.attr;

                    /* which character to start attribute highlighting;
                       whole line for headers and such, after the selector
                       character and space and selection indicator for menu
                       lines */
                    attr_n = 0; /* whole line */
                    if (curr.str[0] && curr.str[1] === ' '
                        && curr.str[2] && "-+#".includes(curr.str[2])
                        && curr.str[3] === ' ')
                        attr_n = 4; /* [4:N]=entry description */

                    for (n = 0; n < curr.str.length && ++t.curx < t.cols; n++) {
                        if (n === attr_n && attr !== ATR_NONE)
                            term_start_attr(attr);
                        t.curx--; /* xputc() writes at curx; NOMUX bookkeeping */
                        if (n === 2 && curr.identifier && curr.selected) {
                            /* all selected: '*' vs count selected: '#' */
                            xputc((curr.count === -1) ? '*' : '#');
                        } else {
                            xputc(curr.str[n]);
                        }
                        t.curx++;
                    } /* for *cp */
                    if (n > attr_n && attr !== ATR_NONE)
                        term_end_attr(attr);
                }
            } else {
                page_start = 0;
                page_end = 0;
                page_lines = 0;
            }
            /* remember how many explicit menu choices there are */
            resp_len = resp.length;

            /* corner window - clear extra lines from last page */
            if (cw.offx) {
                for (n = page_lines + 1; n < cw.maxrow; n++) {
                    tty_curs(window, 1, n);
                    cl_end();
                }
            }

            /* set extra chars.. */
            if (gacc) {
                resp += gacc;                   /* group accelerators */
                if (cw.how === PICK_ONE)
                    resp_len = resp.length;
            }
            resp += " ";                        /* next page or end */
            resp += "0123456789\x1b\n\r";       /* counts, quit */
            resp += default_menu_cmds;
            if (cw.npages > 1)
                cw.morestr = `(${curr_page + 1} of ${cw.npages})`;
            else if (msave)
                cw.morestr = msave;
            else
                cw.morestr = defmorestr;
            tty_curs(window, 1, page_lines);
            cl_end();
            await dmore(cw, resp);
        } else {
            /* just put the cursor back... */
            tty_curs(window, cw.morestr.length + 2, page_lines);
            await xwaitforspace(resp);
        }

        let morc = game.morc;
        const really_morc = morc;
        let explicit = false;
        let rp;
        if (morc && (rp = resp.indexOf(morc)) >= 0 && rp < resp_len)
            /* explicit menu selection; don't override it if it also
               happens to match a mapped menu command */
            explicit = true;
        /* map_menu_cmd(): no menu command remapping is configured */

        if (explicit) {
            morc = really_morc;
        }
        if (!explicit && morc >= '0' && morc <= '9' && morc.length === 1) {
            /* special case: '0' is also the default ball class;
               some menus use digits as potential group accelerators
               but their entries don't rely on counts */
            if (!counting && gacc.includes(morc)) {
                /* goto group_accel */
                invert_all(window, page_start, page_end, morc,
                           counting ? count : -1);
                if (cw.how === PICK_ONE)
                    finished = true;
                continue;
            }
            count = (10 * count) + (morc.charCodeAt(0) - 48);
            if (count !== 0) { /* ignore leading zeros */
                counting = true;
                reset_count = false;
            }
            continue;
        }
        if (!explicit) {
            if (morc === '\x1b') { /* cancel - from counting or loop */
                if (!counting) {
                    /* deselect everything */
                    for (const curr of cw.mlist) {
                        curr.selected = false;
                        curr.count = -1;
                    }
                    cw.flags |= WIN_CANCELLED;
                    finished = true;
                }
                /* else only stop count */
                continue;
            }
            if (morc === '' || morc === '\n' || morc === '\r') { /* finished (commit) */
                finished = true;
                continue;
            }
            if (morc === ' ' || morc === MENU_NEXT_PAGE) {
                if (cw.npages > 0 && curr_page !== cw.npages - 1) {
                    curr_page++;
                    page_start = -1;
                } else if (morc === ' ') {
                    /* ' ' finishes menus here, but stop '>' doing the same. */
                    finished = true;
                }
                continue;
            }
            if (morc === MENU_PREVIOUS_PAGE) {
                if (cw.npages > 0 && curr_page !== 0) {
                    --curr_page;
                    page_start = -1;
                }
                continue;
            }
            if (morc === MENU_FIRST_PAGE) {
                if (cw.npages > 0 && curr_page !== 0) {
                    page_start = -1;
                    curr_page = 0;
                }
                continue;
            }
            if (morc === MENU_LAST_PAGE) {
                if (cw.npages > 0 && curr_page !== cw.npages - 1) {
                    page_start = -1;
                    curr_page = cw.npages - 1;
                }
                continue;
            }
            /* MENU_SELECT_PAGE, MENU_INVERT_PAGE, MENU_SELECT_ALL,
               MENU_INVERT_ALL only act on a PICK_ANY menu; MENU_SEARCH
               just beeps for PICK_NONE */
            if (cw.how !== PICK_ANY
                && (morc === MENU_SELECT_PAGE || morc === MENU_INVERT_PAGE
                    || morc === MENU_SELECT_ALL || morc === MENU_INVERT_ALL))
                continue;
            if (cw.how === PICK_NONE && morc === MENU_SEARCH)
                continue; /* tty_nhbell() */
            if (default_menu_cmds.includes(morc))
                throw new Error(`process_menu_window: menu command '${morc}' not ported yet`);
        }
        /* MENU_EXPLICIT_CHOICE / default: */
        if (cw.how === PICK_NONE || !resp.includes(morc)) {
            /* unacceptable input received */
            /* tty_nhbell(); */
            continue;
        } else if (gacc.includes(morc)) {
            /* group accelerator; for the PICK_ONE case, we know that
               it matches exactly one item in order to be in gacc[] */
            invert_all(window, page_start, page_end, morc,
                       counting ? count : -1);
            if (cw.how === PICK_ONE)
                finished = true;
            continue;
        }
        /* find, toggle, and possibly update */
        for (n = 0; page_start + n < page_end; n++) {
            const curr = cw.mlist[page_start + n];
            if (morc === curr.selector) {
                toggle_menu_curr(window, curr, n, true, counting, count);
                if (cw.how === PICK_ONE)
                    finished = true;
                break; /* from `for' loop */
            }
        }
    } /* while */
    cw.morestr = msave;
}
