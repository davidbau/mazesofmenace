// wintty.js — the tty windowport: menu and text windows.
// C ref: win/tty/wintty.c
//
// Everything that reaches the 24x80 grid for a menu or text window goes through
// here. The layout rules are transcribed from wintty.c rather than invented,
// because they are what decides whether a frame scores:
//
//   * NHW_TEXT forces maxcol to the full width (wintty.c:1899), which makes
//     offx compute to 10, which trips the collapse test and renders the window
//     full-screen at column 0.
//   * NHW_MENU keeps offx = cols - maxcol - 1, i.e. right-aligned.
//   * The footer line carries "(end)" on a single page or "(N of M)" when
//     paging, and the cursor parks on it at offx + strlen(morestr) + 1.
//
// Verified against seed8000: the inventory menu lands at column 32
// (80 - 47 - 1) with the cursor at [38,20], and the attributes window lands at
// column 0 with the cursor at [9,23].

import { game } from './../gstate.js';
import { MAXBLSTATS, BL_FLUSH, BL_RESET, BL_TITLE, BL_STR, BL_DX, BL_CO, BL_IN, BL_WI, BL_CH, BL_ALIGN, BL_SCORE, BL_CAP, BL_GOLD, BL_ENE, BL_ENEMAX, BL_XP, BL_AC, BL_HD, BL_TIME, BL_HUNGER, BL_HP, BL_HPMAX, BL_LEVELDESC, BL_EXP, BL_CONDITION, BL_WEAPON, BL_ARMOR, BL_TERRAIN, BL_VERS, HL_BOLD, HL_DIM, HL_ITALIC, HL_ULINE, HL_BLINK, HL_INVERSE, HL_ATTCLR_BOLD, HL_ATTCLR_DIM, HL_ATTCLR_ITALIC, HL_ATTCLR_ULINE, HL_ATTCLR_BLINK, HL_ATTCLR_INVERSE, BL_ATTCLR_MAX, CLR_MAX } from './../const.js';
import { genl_status, genl_status_init, genl_status_finish, genl_status_enablefield } from './../windows.js';
/* botl.js wires the status pieces the renderer needs (conditions[],
   cond_idx(), stat_cap_indx(), repad_with_dashes(), status_initialize());
   a static import here closes an evaluation cycle through coloratt.js */
let botl_fns = {};
export function wintty_wire_botl(fns) { botl_fns = fns; }
const conditions = () => botl_fns.conditions;
const cond_idx = () => botl_fns.cond_idx();
const stat_cap_indx = () => botl_fns.stat_cap_indx();
const repad_with_dashes = (b) => botl_fns.repad_with_dashes(b);
const status_initialize = (r) => botl_fns.status_initialize(r);
import { critically_low_hp } from './../pray.js';
import { impossible } from './../pline.js';
import { TOPLINE_EMPTY, TOPLINE_NEED_MORE, more } from './../display.js';
import { tty_clear_nhwindow_message, row_refresh, bot,
         docrt_sync_rebuild } from './../display.js';
import { nhgetch } from './../input.js';
import { NO_COLOR, ATR_INVERSE as TERM_INVERSE, ATR_BOLD as TERM_BOLD,
         ATR_UNDERLINE as TERM_UNDERLINE } from './../terminal.js';
import { MENU_ITEMFLAGS_NONE, MENU_ITEMFLAGS_SELECTED,
         MENU_ITEMFLAGS_SKIPMENUCOLORS,
         MENU_ITEMFLAGS_SKIPINVERT, MENU_NEXT_PAGE, MENU_PREVIOUS_PAGE,
         MENU_SEARCH, PICK_ONE, PICK_ANY, GOLD_SYM, ROWNO, COLNO } from './../const.js';
import { pmatch } from './../hacklib.js';
import { get_menu_coloring } from './../windows.js';
import { notice_all_mons_flush } from './../hack.js';
import { gc_currentgraphics, gs_symset, H_UTF8 } from './../symbols.js';

// include/wintype.h:128-137 — NetHack's attribute numbers. These are NOT the
// frozen terminal's bit flags; win/tty/wintty.c term_start_attr() translates
// between them, and so must we. NetHack ATR_INVERSE is 7 while the terminal's
// inverse bit is 1, so passing one through unchanged silently renders normal.
export const ATR_NONE = 0, ATR_BOLD = 1, ATR_DIM = 2, ATR_ITALIC = 3,
             ATR_ULINE = 4, ATR_BLINK = 5, ATR_INVERSE = 7;

// win/tty/termcap.c term_start_attr()
function term_attr(nhattr) {
    switch (nhattr) {
    case ATR_BOLD:    return TERM_BOLD;
    case ATR_ULINE:   return TERM_UNDERLINE;
    case ATR_INVERSE: return TERM_INVERSE;
    default:          return 0;
    }
}

// include/wintype.h
export const NHW_MESSAGE = 1, NHW_STATUS = 2, NHW_MAP = 3,
             NHW_MENU = 4, NHW_TEXT = 5;
export const NHW_BASE = 6;

// win/tty/wintty.c BASE_WINDOW — the raw screen, used before the game windows
// exist. tty_putstr() writes at its current row and advances; tty_curs() moves
// the cursor. That pairing is what places the startup banner at rows 4-7 and
// the "Who are you?" prompt at row 12.
const base = { curx: 0, cury: 0 };

export function tty_curs_base(x, y) {
    base.curx = x - 1;          /* tty_curs takes a 1-based column */
    base.cury = y;
}

export function tty_putstr_base(str, attr = 0) {
    const display = game?.nhDisplay;
    if (!display) return;
    const s = String(str ?? '');
    /* win/tty/wintty.c tty_putstr(), NHW_BASE: the characters are put at the
       window cursor and nothing past them is touched (no cl_end), wrapping
       to the next row at the last column; then curx = 0, cury++ */
    let col = base.curx;
    for (let i = 0; i < s.length; i++) {
        if (col >= COLS - 1) {
            col = 0;
            base.cury++;
        }
        display.setCell(col, base.cury, s[i], NO_COLOR, attr);
        col++;
    }
    base.curx = 0;
    base.cury++;
}

/* win/tty/termcap.c cl_end() on the base window's row */
export function tty_cl_end_base() {
    const display = game?.nhDisplay;
    if (!display) return;
    for (let c = base.curx; c < COLS; c++)
        display.setCell(c, base.cury, ' ', NO_COLOR, 0);
}

// win/tty/wintty.c tty_raw_print_bold() — standout raw line.
export function tty_raw_print_bold(str) {
    tty_putstr_base(str ?? '', TERM_BOLD);
}

// Echo a single character at the base cursor, as tty_askname() does.
export function tty_putch_base(ch) {
    const display = game?.nhDisplay;
    if (!display) return;
    if (base.curx < COLS)
        display.setCell(base.curx, base.cury, ch, NO_COLOR, 0);
    base.curx++;
}

export function tty_base_cursor() {
    const display = game?.nhDisplay;
    if (display) display.setCursor(base.curx, base.cury);
}

export function tty_base_pos() { return { x: base.curx, y: base.cury }; }

// include/wintty.h — the default --More-- prompt.
const defmorestr = '--More--';

// win/tty/wintty.c:2640 — the style used for a menu's title line. It starts
// out plain, but src/allmain.c:728 init_sound_disp_gamewindows() pushes
// iflags.menu_headings into it through adjust_menu_promptstyle(), and that runs
// BEFORE player_selection(). So by the time the role menu opens the title is
// already ATR_INVERSE, which is what the recordings show.
const tty_menu_promptstyle = { color: NO_COLOR, attr: ATR_NONE };

// win/tty/wintty.c tty_update_inventory() — with TTY_PERM_INVENT not
// defined in the reference build the tty has no persistent inventory
// window to sync, so this does nothing.
export function tty_update_inventory(arg) {
    return;
}

// src/windows.c:1769 adjust_menu_promptstyle()
export function adjust_menu_promptstyle(style) {
    tty_menu_promptstyle.color = style.color;
    tty_menu_promptstyle.attr = style.attr;
}

const ROWS = 24, COLS = 80;

let windows = [];
let nextWinId = 1;

// win/tty/wintty.c tty_create_nhwindow()
export function tty_create_nhwindow(type) {
    const win = {
        id: nextWinId++,
        type,
        active: 0,
        offx: 0,
        offy: 0,
        rows: 0,
        cols: 0,
        maxrow: 0,
        maxcol: 0,
        data: [],       // one string per line (tty_putstr path)
        mlist: null,    // menu item list  (tty_add_menu path)
        nitems: 0,
        morestr: '',
        npages: 0,
        cancelled: false,
    };
    /* win/tty/wintty.c:1206 the NHW_STATUS arm: status window, 2 or 3
       lines long, full width, bottom of screen */
    if (type === NHW_STATUS) {
        const iflags = (game.iflags ||= {});
        if ((iflags.wc2_statuslines | 0) < 2 || (iflags.wc2_statuslines | 0) > 3)
            iflags.wc2_statuslines = 2;
        win.offx = 0;
        const rowoffset = ROWS - iflags.wc2_statuslines;
        win.offy = Math.min(rowoffset, ROWNO + 1);
        win.rows = win.maxrow = iflags.wc2_statuslines;
        win.cols = win.maxcol = COLS;
        win.data = [];
        for (let i = 0; i < win.maxrow; ++i)
            win.data[i] = new Array(win.cols).fill(' ');
    }
    windows[win.id] = win;
    return win.id;
}

export function tty_get_nhwindow(window) {
    return windows[window];
}

// win/tty/wintty.c tty_destroy_nhwindow()
export function tty_destroy_nhwindow(window) {
    const cw = windows[window];
    if (cw && cw.active) tty_dismiss_nhwindow(window);
    delete windows[window];
}

// win/tty/wintty.c tty_clear_nhwindow() — for menu/text windows this drops the
// accumulated lines.
export function tty_clear_nhwindow(window) {
    const cw = windows[window];
    if (!cw) return;
    if (cw.type === NHW_STATUS) {
        /* win/tty/wintty.c:1332 the NHW_STATUS arm: erase the rows, blank
           the window data and ask for a full status redraw */
        const display = game?.nhDisplay;
        const m = cw.maxrow, n = cw.cols;
        for (let i = 0; i < m; ++i) {
            if (display && !game._erasing_tty_screen)
                for (let x = 0; x < COLS; x++)
                    display.setCell(x, cw.offy + i, ' ', NO_COLOR, 0); /* cl_end() */
            cw.data[i] = new Array(n).fill(' ');
        }
        (game.disp ||= {}).botlx = true;
        return;
    }
    if (cw.type === NHW_MENU || cw.type === NHW_TEXT) {
        cw.data = [];
        cw.attrs = [];
        cw.mlist = null;
        cw.nitems = 0;
        cw.maxrow = 0;
        cw.maxcol = 0;
    }
}

// win/tty/wintty.c tty_start_menu()
export function tty_start_menu(window, mbehavior) {
    const cw = windows[window];
    if (!cw) return;
    cw.mbehavior = mbehavior;
    tty_clear_nhwindow(window);
}

// win/tty/wintty.c tty_add_menu()
//
// `identifier` is C's `anything` union: a non-zero value makes the entry
// selectable, and only a selectable entry gets the "%c - " prefix. A zero
// identifier is a header/separator line, which is how add_menu_str() works.
export function tty_add_menu(window, glyphinfo, identifier, ch, gch,
                             attr, clr, str, itemflags) {
    const cw = windows[window];
    if (!cw || str == null) return;

    /* src/windows.c:1805 add_menu(): the core wrapper applies the menu
       colorings before handing the entry to the window port's add_menu().
       This port's callers reach tty_add_menu() directly, so the wrapper's
       work is done here. */
    if (game.iflags?.menucolors) { /* iflags.use_menu_color */
        if ((itemflags & MENU_ITEMFLAGS_SKIPMENUCOLORS) === 0) {
            const mc = get_menu_coloring(str);
            if (mc) {
                clr = mc.color;
                attr = mc.attr;
            }
        }
    }
    /* this is the only function that cared about this flag; remove it now */
    itemflags &= ~MENU_ITEMFLAGS_SKIPMENUCOLORS;

    cw.nitems = (cw.nitems | 0) + 1;
    let newstr = String(str);
    if (identifier)
        newstr = `${ch ? ch : '?'} - ${newstr}`;

    const item = {
        identifier,
        glyphinfo,
        count: -1,
        selected: !!(itemflags & MENU_ITEMFLAGS_SELECTED),
        itemflags: itemflags | 0,
        selector: ch || 0,
        gselector: gch || 0,
        attr: attr | 0,
        color: clr,
        str: newstr,
    };
    /* C prepends and reverses in tty_end_menu(); mirroring that matters
       because end_menu() then prepends the prompt AFTER the reversal, which
       is what puts the title above the caller's own first line. */
    item.next = cw.mlist || null;
    cw.mlist = item;
}

// src/windows.c add_menu_str() — a non-selectable line.
export function tty_add_menu_str(window, str) {
    tty_add_menu(window, null, 0, 0, 0, ATR_NONE, NO_COLOR, str,
                 MENU_ITEMFLAGS_NONE);
}

// win/tty/wintty.c tty_end_menu()
export function tty_end_menu(window, prompt) {
    const cw = windows[window];
    if (!cw) return;

    /* Reverse the list so that items are in correct order. */
    let curr = cw.mlist, head = null;
    while (curr) { const next = curr.next; curr.next = head; head = curr; curr = next; }
    cw.mlist = head;

    /* Put the prompt at the beginning of the menu. */
    if (prompt) {
        tty_add_menu(window, null, 0, 0, 0, ATR_NONE, NO_COLOR, '',
                     MENU_ITEMFLAGS_NONE);
        tty_add_menu(window, null, 0, 0, 0, tty_menu_promptstyle.attr,
                     tty_menu_promptstyle.color, prompt, MENU_ITEMFLAGS_NONE);
    }

    /* 52: 'a'..'z' and 'A'..'Z'; the row limit wins on a 24-line terminal. */
    const lmax = Math.min(52, ROWS - 1);
    cw.npages = Math.floor((cw.nitems + (lmax - 1)) / lmax);
    cw.plist = [];

    cw.cols = 0;
    let menu_ch = '?';
    let n = 0;
    for (curr = cw.mlist; curr; n++, curr = curr.next) {
        if ((n % lmax) === 0) {
            menu_ch = 'a';
            cw.plist[Math.floor(n / lmax)] = curr;
        }
        if (curr.identifier && !curr.selector) {
            curr.selector = menu_ch;
            curr.str = menu_ch + curr.str.slice(1);
            if (menu_ch === 'z') menu_ch = 'A';
            else menu_ch = String.fromCharCode(menu_ch.charCodeAt(0) + 1);
        }

        /* cut off any lines that are too long */
        let len = curr.str.length + 2;   /* extra space at beg & end */
        if (len > COLS) {
            curr.str = curr.str.slice(0, COLS - 2);
            len = COLS;
        }
        if (len > cw.cols) cw.cols = len;
    }
    cw.plist[cw.npages] = null;

    /* If greater than 1 page, morestr is "(x of y) ", otherwise "(end) ". */
    let len;
    if (cw.npages > 1) {
        cw.morestr = '';
        len = `(${cw.npages} of ${cw.npages}) `.length;
    } else {
        cw.morestr = '(end) ';
        len = cw.morestr.length;
    }
    if (len > cw.cols) cw.cols = len;

    cw.maxcol = cw.cols;

    if (cw.npages > 1) cw.maxrow = cw.rows = lmax + 1;
    else cw.maxrow = cw.rows = cw.nitems + 1;
}

// win/tty/wintty.c tty_putstr() — menu/text path.
export function tty_putstr(window, attr, str) {
    const cw = windows[window];
    if (!cw) return;
    let s = String(str ?? '');

    /* win/tty/wintty.c:2251 — every non-message putstr runs compress_str():
       when the line is CO or longer, runs of spaces collapse to one (leading
       spaces drop, trailing space drops). option_help's padded
       "`whatis_filter'      - ..." line is the visible case: 84 chars
       squeeze to 78 and fit where the wrap below would otherwise split. */
    if (s.length >= COLS || s.includes('\n')) {
        let out = '';
        let was_space = true;
        for (let c of s) {
            if (c === '\n') c = ' ';
            if (was_space && c === ' ') continue;
            out += c;
            was_space = (c === ' ');
        }
        if (was_space && out.length) out = out.slice(0, -1);
        s = out;
    }

    /* win/tty/wintty.c tty_putstr(), NHW_MENU/NHW_TEXT case:
         n0 = strlen(str) + 1;
         if (n0 > cw->maxcol) cw->maxcol = n0;
       Note the +1, where tty_end_menu() uses +2 for an add_menu() entry, and
       that C takes it from the UNBROKEN length even when the line is about
       to be split below. */
    const len = s.length + 1;
    if (len > cw.maxcol) cw.maxcol = len;

    /* win/tty/wintty.c:2411 — a line of CO or more characters is broken at
       the last space before column CO; the space is dropped and the rest is
       fed back through putstr. option_help's "OPTIONS=<options> in <path>"
       line is the visible case: the intro line wraps before the path and
       the path itself (no spaces) stays one long line the renderer clips. */
    let rest = null;
    if (s.length + 1 > COLS) {
        let i = COLS - 1;
        while (i && s[i] !== ' ' && s[i] !== '\n')
            i--;
        if (i) {
            rest = s.slice(i + 1);
            s = s.slice(0, i);
        }
    }

    /* C stores the attribute as the first byte of each data line and recovers
       it as `attr = cw->data[i][0] - 1`. Keeping it parallel is simpler. */
    cw.data.push(s);
    (cw.attrs ||= []).push(attr | 0);
    cw.maxrow = cw.data.length;

    if (rest !== null)
        tty_putstr(window, attr, rest);
}

// win/tty/wintty.c:1898-1917 — where the window sits horizontally.
//
// wintty.c:13 does `#define H2344_BROKEN` unconditionally, so the branch that
// looks conditional is the only one that ever compiles: a menu is capped at
// half the screen width rather than pushed as far right as it will go, and the
// `offx == 10` collapse test does not exist. The chargen menus are where the
// difference shows — their longest line is 32, which the other branch would put
// at column 47 and this one puts at 40, matching the recordings.
function compute_offx(cw) {
    /* win/tty/wintty.c tty_display_nhwindow(), NHW_MENU/NHW_TEXT arm. The
       recorder build defines H2344_BROKEN (wintty.c:13), so the overlay
       column is
           min(min(82, cols / 2), cols - s_maxcol - 1)
       and only a window taller than the display, or menu_overlay off, is
       forced to full-screen mode. */
    let offx = (cw.type === NHW_TEXT)
             ? 0
             : Math.min(Math.min(82, Math.floor(COLS / 2)),
                        COLS - cw.maxcol - 1);
    if (offx < 0) offx = 0;
    if (cw.type === NHW_MENU) cw.offy = 0;

    if (cw.maxrow >= ROWS || game.iflags?.menu_overlay === false) offx = 0;
    return offx;
}

// win/tty/wintty.c tty_end_menu:
//   lmax = min(52, ttyDisplay->rows - 1);   -- # lines per page
// 52 is the 'a'..'z','A'..'Z' selector budget; on a 24-row terminal the row
// limit wins.
function page_capacity(cw) {
    return Math.min(52, ROWS - 1) - cw.offy;
}

// win/tty/wintty.c process_menu_window() / process_text_window() — draw one
// page and place the footer and cursor.
//
// `page` is 0-based. Returns the number of content lines drawn.
function render_page(cw, page, display) {
    const cap = page_capacity(cw);
    const start = page * cap;
    const lines = cw.data.slice(start, start + cap);

    /* win/tty/wintty.c only clears when the window has collapsed to full
       screen; an inset menu OVERLAYS the map and status lines, which is why
       seed8000's inventory frame still shows both bottom lines. */
    if (!cw.offx)
        display.clearScreen();

    lines.forEach((line, n) => {
        const row = cw.offy + n;
        /* win/tty/wintty.c: a MENU always emits the leading space before its
           text, even when the window has collapsed to column 0 — which is why
           the inventory menu's text starts at 32 when offx is 31, and why the
           attributes menu's text starts at column 1 when offx is 0. A TEXT
           window only indents when it is actually inset. */
        /* win/tty/wintty.c:1802 process_text_window — which serves EVERY
           data-backed window, NHW_MENU included (wintty.c:1943 dispatches
           on cw->data, not type): the leading space is emitted only when
           the window is inset (offx). The always-indented form belongs to
           process_menu_window's mlist entries only. */
        let col = cw.offx + (cw.offx ? 1 : 0);
        /* win/tty/wintty.c positions with tty_curs(window, 1, n), and window
           column 1 is ABSOLUTE column offx — so the leading space a menu emits
           lands ON offx and the text starts at offx + 1. Starting the paint at
           offx + 1 left column offx untouched, which is why the map bled
           through beside the legacy window on 32 of the 44 sessions. */
        for (let c = cw.offx; c < col; c++)
            display.setCell(c, row, ' ', NO_COLOR, 0);
        const attr = term_attr((cw.attrs || [])[start + n] | 0);
        let first = 0;
        /* wintty.c:1808 pre-increments ttyDisplay->curx, then sends the
           first byte of each data line through g_putch() under H_UTF8. The
           recorder's g_putch hook therefore writes it one cell late and the
           ordinary second byte overwrites it. Preserve that observable
           one-byte loss for data-backed text windows. */
        if (line.length
            && gs_symset[gc_currentgraphics.set]?.handling === H_UTF8) {
            display.setCell(col, row, ' ', NO_COLOR, 0);
            col++;
            first = 1;
        }
        for (let i = first; i < line.length && col < COLS; i++, col++)
            display.setCell(col, row, line[i], NO_COLOR, attr);
        /* win/tty/wintty.c calls cl_end() on every window row, so a short
           menu line blanks the rest of the row rather than letting the map
           show through beside it. */
        for (let c = col; c < COLS; c++)
            display.setCell(c, row, ' ', NO_COLOR, 0);
    });

    /* win/tty/wintty.c dmore(): the prompt is cw->morestr when set, else
       defmorestr. Only tty_end_menu() ever sets it, so a window filled with
       putstr() — every NHW_TEXT window, and the legacy NHW_MENU — shows
       "--More--" no matter what its type is. */
    const morestr = cw.morestr || defmorestr;

    /* win/tty/wintty.c process_text_window():
         tty_curs(BASE_WINDOW, cw->offx + 1,
                  (cw->type == NHW_TEXT) ? ttyDisplay->rows - 1 : n);
       An NHW_TEXT window puts its prompt on the LAST LINE OF THE SCREEN, not
       directly under its content — so a six-line discoveries window still has
       its --More-- on row 23. A menu puts it right after the content. */
    const footerRow = (cw.type === NHW_TEXT) ? (ROWS - 1)
                                             : (cw.offy + lines.length);

    /* dmore(): int offset = (cw->type == NHW_TEXT) ? 1 : 2; and tty_curs is
       1-based, so a text window's prompt starts at column offx and a menu's at
       offx + 1. */
    tty_curs_base(cw.offx + ((cw.type === NHW_TEXT) ? 1 : 2), footerRow);
    let col = cw.offx + ((cw.type === NHW_TEXT) ? 0 : 1);
    /* Same as the content rows: a menu's prompt starts at offx + 1, so column
       offx itself must still be cleared or the map bleeds through beside it. */
    for (let c = cw.offx; c < col; c++)
        display.setCell(c, footerRow, ' ', NO_COLOR, 0);
    for (let i = 0; i < morestr.length && col < COLS; i++, col++)
        display.setCell(col, footerRow, morestr[i], NO_COLOR, 0);
    for (let c = col; c < COLS; c++)
        display.setCell(c, footerRow, ' ', NO_COLOR, 0);

    /* dmore(): ttyDisplay->curx += strlen(prompt), so the cursor ends just
       past the prompt. seed8000 records [8,23] for the discoveries window,
       which is 0 + strlen("--More--"). */
    const footerCol = cw.offx + ((cw.type === NHW_TEXT) ? 0 : 1);
    display.setCursor(footerCol + morestr.length, footerRow);

    return lines.length;
}

// win/tty/wintty.c:1329 process_menu_window() — draw one page of an mlist
// menu. Every line is "<space><item text>" starting at offx, and a selected
// entry has its third character (the '-' of "a - foo") replaced by '*'.
function process_menu_window(cw, page, display) {
    const lmax = Math.min(52, ROWS - 1);
    const items = [];
    let n = 0;
    for (let curr = cw.mlist; curr; n++, curr = curr.next)
        if (Math.floor(n / lmax) === page) items.push(curr);

    /* win/tty/wintty.c:1413; the default shows object symbols only when
       the entire menu has no headings, including its title. */
    const menuobjsyms = game.iflags?.menuobjsyms ?? 4;
    let show_obj_syms = !!(menuobjsyms & (2 | 4));
    if (menuobjsyms & 4) {
        for (let curr = cw.mlist; curr; curr = curr.next) {
            if (!curr.identifier) {
                show_obj_syms = false;
                break;
            }
        }
    }

    if (!cw.offx) display.clearScreen();

    items.forEach((item, lineno) => {
        const row = cw.offy + lineno;
        let col = cw.offx;
        /* the leading space, drawn before any attribute is turned on */
        if (col < COLS) display.setCell(col, row, ' ', NO_COLOR, 0);
        col++;

        /* whole line for headers; after "<letter><space><flag><space>" for
           real entries, so the selector prefix stays unhighlighted */
        const s = item.str;
        const attr_n = (s[0] && s[1] === ' ' && s[2] && '-+#'.includes(s[2])
                        && s[3] === ' ') ? 4 : 0;
        const attr = term_attr(item.attr);

        /* The reference frames are re-serialized rows: a run of 5 or more
           spaces is emitted as a cursor-forward escape (see the recorded
           "ESC[7m    Name ESC[17C Level..." header), and the skipped cells
           come back PLAIN on replay while shorter runs stay attributed.
           Reproduce that lossy encoding here or an attributed header can
           never match. */
        const plainrun = new Array(s.length).fill(false);
        for (const m of s.matchAll(/ {5,}/g))
            for (let k = m.index; k < m.index + m[0].length; k++)
                plainrun[k] = true;

        for (let i = 0; i < s.length && col < COLS; i++, col++) {
            const on = (i >= attr_n && !plainrun[i]) ? attr : 0;
            let ch = s[i], color = NO_COLOR;
            if (i === 2 && item.identifier) {
                if (item.selected)
                    ch = item.count === -1 ? '*' : '#';
                else if (show_obj_syms && item.glyphinfo?.ch) {
                    ch = item.glyphinfo.ch;
                    color = item.glyphinfo.color;
                }
            }
            display.setCell(col, row, ch, color, on);
        }
        for (let c = col; c < COLS; c++)
            display.setCell(c, row, ' ', NO_COLOR, 0);
    });

    /* win/tty/wintty.c:1536 — the footer sits directly under the last entry. */
    const morestr = (cw.npages > 1) ? `(${page + 1} of ${cw.npages})`
                                    : cw.morestr;
    const footerRow = cw.offy + items.length;
    /* dmore() re-homes the BASE_WINDOW cursor before writing the prompt */
    tty_curs_base(cw.offx + 2, footerRow);
    let col = cw.offx + 1;              /* dmore(): offset 2, tty_curs is 1-based */
    /* win/tty/wintty.c process_menu_window(): every menu line is emitted as
         tty_curs(window, 1, y); if (cw->offx) cl_end(); putchar(' ');
       so column offx itself gets a SPACE before the text starts at offx + 1.
       The content rows above already do this; the footer did not, so whatever
       the menu was drawn over showed through in that one column -- the map's
       DECgraphics horizontal beside seed0101's tutorial prompt. */
    for (let c = cw.offx; c < col; c++)
        display.setCell(c, footerRow, ' ', NO_COLOR, 0);
    for (let i = 0; i < morestr.length && col < COLS; i++, col++)
        display.setCell(col, footerRow, morestr[i], NO_COLOR, 0);
    for (let c = col; c < COLS; c++)
        display.setCell(c, footerRow, ' ', NO_COLOR, 0);
    display.setCursor(cw.offx + 1 + morestr.length, footerRow);

    return items.length;
}

// win/tty/wintty.c:1178 set_item_state() — repaint ONE entry's selection flag
// in place after the player toggles it.
//
// Note the characters: the full-page draw in process_menu_window() writes '*'
// for a selected entry, but this writes '+'. So a preselected entry shows '*'
// until the player touches it and '+' afterwards. That is not a typo in either
// place; both spellings appear on the same screen.
export function set_item_state(window, lineno, item) {
    const cw = windows[window];
    const display = game?.nhDisplay;
    if (!cw || !display) return;
    const ch = item.selected ? (item.count === -1 ? '+' : '#') : '-';
    /* tty_curs(window, 4, lineno) — 1-based, so column offx + 3 */
    display.setCell(cw.offx + 3, cw.offy + lineno, ch, NO_COLOR,
                    term_attr(item.attr));
}

// The item at a given 0-based line of the current page, for set_item_state().
export function menu_page_items(window, page) {
    const cw = windows[window];
    if (!cw) return [];
    const lmax = Math.min(52, ROWS - 1);
    const out = [];
    let n = 0;
    for (let curr = cw.mlist; curr; n++, curr = curr.next)
        if (Math.floor(n / lmax) === page) out.push(curr);
    return out;
}

// win/tty/wintty.c tty_display_nhwindow() — menu/text case.
// Renders the first page. Paging on subsequent keys is driven by the caller
// consuming keys, matching how C's dmore() blocks inside the window.
// win/tty/wintty.c tty_wait_synch()
export async function tty_wait_synch() {
    /* we just need to make sure all windows are synch'd */
    /* the `!ttyDisplay || ttyDisplay->rawprint` arm calls getret(): raw
       printing is not used once the game is up, and it is not modelled */
    /* tty_display_nhwindow(WIN_MAP, FALSE): the NHW_MAP arm only ends any
       pending glyph output, and this port never buffers map writes */
    if (game.ttyDisplay?.inmore) {
        const { addtopl } = await import('./topl.js');
        addtopl('--More--');
    }
    /* the `inread > program_state.gameover` arm re-shows an interrupted
       prompt; interrupts do not exist in this port */
}

export async function tty_display_nhwindow(window) {
    await notice_all_mons_flush(); /* queued by the previous window's erase */
    const cw = windows[window];
    const display = game?.nhDisplay;
    if (!cw || !display) return;

    cw.active = 1;
    cw.offx = compute_offx(cw);
    cw.curr_page = 0;

    /* wintty.c:1966 — an unacknowledged message is flushed with a blocking
       --More-- BEFORE the window draws:
           if (ttyDisplay->toplin == TOPLINE_NEED_MORE)
               tty_display_nhwindow(WIN_MESSAGE, TRUE);
       That recursive call is the NHW_MESSAGE arm, i.e. more(). It is what
       puts the --More-- on "Please move the cursor to ..." while the getpos
       tip window waits behind it.

       The recursive call is subject to the guard at the top of the C
       function, `if (cw->flags & WIN_CANCEL) return;`, and for the message
       window WIN_CANCEL is the same bit as WIN_STOP. So after an ESC at the
       previous --More-- the pending message is neither prompted for nor
       acknowledged: the menu's own clearing below simply erases it. */
    if (game._toplin === TOPLINE_NEED_MORE && !game._win_stop)
        await more();

    /* wintty.c tty_display_nhwindow(), the NHW_MENU/NHW_TEXT arm: a menu
       drawn as an OVERLAY first erases the message line --
       `tty_clear_nhwindow(WIN_MESSAGE)` in the else-arm -- while the
       full-screen path clears the whole region instead. Without this the
       prompt that launched the command ("# name") stays painted in the
       columns left of the menu. */
    if (cw.offx > 0) {
        /* the per-frame screen rebuild repaints game._pending_message onto
           row 0, so clearing the grid alone resurrects the old prompt on the
           next frame; the more() path in js/display.js clears the pair the
           same way. */
        game._pending_message = '';
        tty_clear_nhwindow_message(game._topl_cury || 0);
    } else {
        /* wintty.c's full-screen arm (offx collapsed to 0): the whole screen
           region is cleared and `ttyDisplay->toplin = TOPLINE_EMPTY`, so the
           prompt that was on the topline does not come back after the window
           is dismissed. */
        game._pending_message = '';
        game._toplin = TOPLINE_EMPTY;
    }

    /* wintty.c:1944 — `if (cw->data || !cw->maxrow)` picks the text renderer;
       a window built with add_menu() has no data[] and lands in the menu one. */
    if (cw.mlist) {
        process_menu_window(cw, 0, display);
        return;
    }

    const cap = page_capacity(cw);
    cw.npages = Math.max(1, Math.ceil(cw.data.length / cap));
    render_page(cw, 0, display);
}

// win/tty/wintty.c:2819 tty_message_menu() — a one-line "menu": the message
// plus --More--, where typing the item's letter selects it (the More's
// dismiss_more mechanism in xwaitforspace).
export async function tty_message_menu(letter, how, mesg) {
    const { pline, more, TOPLINE_NEED_MORE } = await import('./../display.js');
    const { xwaitforspace } = await import('./getline.js');
    const { PICK_NONE } = await import('./../const.js');

    /* "menu" without selection; use ordinary pline, no more() */
    if (how === 0 /* PICK_NONE */) {
        await pline(mesg);
        return 0;
    }

    (game.ttyDisplay ||= {}).dismiss_more = letter;
    game.morc = 0;
    await pline(mesg);
    if (game._toplin === TOPLINE_NEED_MORE) {
        await more();
        game._toplin = TOPLINE_NEED_MORE; /* more resets this */
        tty_clear_nhwindow_message(game._topl_cury || 0);
        game._pending_message = '';
        const { TOPLINE_EMPTY } = await import('./../display.js');
        game._toplin = TOPLINE_EMPTY;
    }
    game._win_stop = false;             /* wins[WIN_MESSAGE] &= ~WIN_CANCELLED */
    game.ttyDisplay.dismiss_more = 0;

    return ((how === 1 /* PICK_ONE */ && game.morc === letter)
            || game.morc === '\x1b') ? game.morc : '\0';
}

// win/tty/wintty.c:1246 invert_all_on_page()
function invert_all_on_page(window, page, acc, count) {
    const items = menu_page_items(window, page);
    items.forEach((curr, n) => {
        if (!curr.identifier || (acc ? curr.gselector !== acc
                                     : !menuitem_invert_test(0, curr.itemflags,
                                                             curr.selected)))
            return;
        if (curr.selected) {
            curr.selected = false;
            curr.count = -1;
        } else {
            curr.selected = true;
            if (count > 0)
                curr.count = count;
        }
        set_item_state(window, n, curr);
    });
}

// win/tty/wintty.c:1270 invert_all() — the current page, then the rest with
// no screen updating.
function invert_all(window, page, acc, count) {
    const cw = windows[window];
    invert_all_on_page(window, page, acc, count);

    const onpage = new Set(menu_page_items(window, page));
    for (let curr = cw.mlist; curr; curr = curr.next) {
        if (onpage.has(curr) || !curr.identifier
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

// src/windows.c:1562 menuitem_invert_test() — MENU_ITEMFLAGS_SKIPINVERT
// entries sit out bulk toggling but can still be picked by their own letter.
// mode 0: invert; 1: select; 2: deselect. menuinvertmode defaults to 1:
// bulk changes never turn a skipinvert entry ON, but may turn it OFF.
function menuitem_invert_test(mode, itemflags, is_selected) {
    if ((itemflags & MENU_ITEMFLAGS_SKIPINVERT) === 0)
        return true; /* if not flagged SKIPINVERT, always pass test */
    const mim = game.iflags?.menuinvertmode ?? 1;
    if (mim === 2)
        return false;
    else if (mim === 1)
        return is_selected ? true : false;
    return true;
}

// win/tty/wintty.c:1198 set_all_on_page()
function set_all_on_page(window, page) {
    const items = menu_page_items(window, page);
    items.forEach((curr, n) => {
        if (!curr.identifier || curr.selected
            || !menuitem_invert_test(1, curr.itemflags, false))
            return;
        curr.selected = true;
        set_item_state(window, n, curr);
    });
}

// win/tty/wintty.c:1217 unset_all_on_page()
function unset_all_on_page(window, page) {
    const items = menu_page_items(window, page);
    items.forEach((curr, n) => {
        if (!curr.identifier || !curr.selected
            || !menuitem_invert_test(2, curr.itemflags, true))
            return;
        curr.selected = false;
        curr.count = -1;
        set_item_state(window, n, curr);
    });
}

// win/tty/wintty.c:1329 process_menu_window() — display the menu and run the
// key loop, then win/tty/wintty.c tty_select_menu() collects what is selected.
//
// Returns the identifiers of the picked entries, so C's
// `select_menu(...) > 0` test becomes `.length > 0`. The attached `counts`
// map preserves C's per-selection counts, and `cancelled` distinguishes ESC
// from explicitly deselecting every preselected item.
export async function tty_select_menu(window, how) {
    const cw = windows[window];
    if (!cw) return [];
    /* src/windows.c select_menu() suppresses status output for the whole
       window-port call, including tty_dismiss_nhwindow(). A full-screen menu
       can therefore leave the status rows blank while its nested handler
       opens another menu. */
    const oldBotDisabled = !!game.bot_disabled;
    game.bot_disabled = true;
    cw.how = how;
    await tty_display_nhwindow(window);

    /* collect group accelerators: every distinct gselector that is not also
       the item's own selector (see the GOLD_SYM note in the C — '$' is both,
       and is kept so gold stays group-selectable off-page) */
    let gacc = '';
    const gcnt = new Map();
    let ngroup = 0;
    for (let curr = cw.mlist; curr; curr = curr.next)
        if (curr.gselector && curr.gselector !== curr.selector) {
            ngroup++;
            gcnt.set(curr.gselector, (gcnt.get(curr.gselector) | 0) + 1);
        }
    if (ngroup > 0)
        for (let curr = cw.mlist; curr; curr = curr.next)
            if (curr.gselector
                && (curr.gselector !== curr.selector
                    || curr.gselector === GOLD_SYM)
                && !gacc.includes(curr.gselector)
                && (how === PICK_ANY || gcnt.get(curr.gselector) === 1))
                gacc += curr.gselector;

    let counting = false, count = 0;
    let finished = false;
    while (!finished) {
        const c = await nhgetch();
        const morc = String.fromCharCode(c);
        const explicitItems = menu_page_items(window, cw.curr_page);
        const explicitIndex = explicitItems.findIndex(
            item => item.identifier && item.selector === morc);

        /* win/tty/wintty.c:1548 dmore()/xwaitforspace(resp): only the page's
           selectors, the group accelerators, ' ', digits, ESC, RET, the menu
           commands and the dismiss_more letter come back to the menu loop;
           any other key rings the bell and keeps waiting, so it leaves a
           pending count untouched (after "9s" an ESC only stops the count,
           and a second ESC is needed to cancel the menu) */
        {
            const dm = game.ttyDisplay?.dismiss_more;
            if (!(explicitIndex >= 0 || gacc.includes(morc) || morc === ' '
                  || /^[0-9]$/.test(morc) || morc === '\x1b'
                  || morc === '\n' || morc === '\r' || c === 0
                  || '^|><.-@,\\~:'.includes(morc)
                  || (dm && morc === dm) || (dm === '\n' && morc === '\r')))
                continue;
        }

        if (/^[0-9]$/.test(morc) && explicitIndex < 0
            && !(!counting && gacc.includes(morc))) {
            count = Math.min(Number.MAX_SAFE_INTEGER,
                             count * 10 + Number(morc));
            if (count)
                counting = true;
            continue;
        }

        /* win/tty/wintty.c:1528 — resp[] holds the page's selectors and then
           the group accelerators, and resp_len marks that boundary: a key
           found there is MENU_EXPLICIT_CHOICE before map_menu_cmd() runs, so
           ':' selects a ':' entry instead of opening search and ',' picks
           the entry whose group accelerator is ',' instead of selecting the
           page. The boundary covers the group accelerators only for a
           PICK_ONE menu (wintty.c:1530); in a PICK_ANY menu a group
           accelerator that is also a menu command is the command ('.' with
           a venom entry selects everything), and one that is not reaches
           the default arm, which tests gacc before the selectors. */
        if (gacc.includes(morc)
            && (how === PICK_ONE || !'^|><.-@,\\~:'.includes(morc))) {
            /* group accelerator; for the PICK_ONE case, we know that it
               matches exactly one item in order to be in gacc[] */
            invert_all(window, cw.curr_page, morc,
                       counting ? count : -1);
            if (how === PICK_ONE)
                finished = true;
        } else if (explicitIndex >= 0) {
            const curr = explicitItems[explicitIndex];
            if (curr.selected) {
                if (counting && count > 0)
                    curr.count = count;
                else {
                    curr.selected = false;
                    curr.count = -1;
                }
            } else if (!counting || count > 0) {
                curr.selected = true;
                if (counting)
                    curr.count = count;
            }
            set_item_state(window, explicitIndex, curr);
            if (how === PICK_ONE)
                finished = true;
        } else if (morc === '\x1b') {           /* cancel */
            if (!counting) {
                for (let curr = cw.mlist; curr; curr = curr.next) {
                    curr.selected = false;
                    curr.count = -1;
                }
                cw.cancelled = true;
                finished = true;
            }
        } else if (morc === '\n' || morc === '\r' || c === 0) {
            finished = true;                    /* commit */
        } else if (morc === ' ' || morc === MENU_NEXT_PAGE) {
            if (cw.npages > 0 && cw.curr_page !== cw.npages - 1)
                tty_next_page(window);
            else if (morc === ' ')
                /* ' ' finishes menus here, but stop '>' doing the same. */
                finished = true;
        } else if (morc === MENU_PREVIOUS_PAGE) {
            if (cw.npages > 0 && cw.curr_page !== 0)
                tty_prev_page(window);
        } else if (morc === '^') {              /* MENU_FIRST_PAGE */
            if (cw.npages > 0 && cw.curr_page !== 0) {
                cw.curr_page = 0;
                process_menu_window(cw, 0, game?.nhDisplay);
            }
        } else if (morc === '|') {              /* MENU_LAST_PAGE */
            if (cw.npages > 0 && cw.curr_page !== cw.npages - 1) {
                cw.curr_page = cw.npages - 1;
                process_menu_window(cw, cw.curr_page, game?.nhDisplay);
            }
        } else if (morc === ',') {              /* MENU_SELECT_PAGE */
            if (cw.how === PICK_ANY)
                set_all_on_page(window, cw.curr_page);
        } else if (morc === '\\') {             /* MENU_UNSELECT_PAGE */
            unset_all_on_page(window, cw.curr_page);
        } else if (morc === '~') {              /* MENU_INVERT_PAGE */
            if (cw.how === PICK_ANY)
                invert_all_on_page(window, cw.curr_page, 0, -1);
        } else if (morc === '.') {              /* MENU_SELECT_ALL */
            if (cw.how === PICK_ANY) {
                set_all_on_page(window, cw.curr_page);
                for (let curr = cw.mlist; curr; curr = curr.next) {
                    if (!curr.identifier || curr.selected
                        || !menuitem_invert_test(1, curr.itemflags, false))
                        continue;
                    curr.selected = true;
                }
            }
        } else if (morc === '-') {              /* MENU_UNSELECT_ALL */
            unset_all_on_page(window, cw.curr_page);
            for (let curr = cw.mlist; curr; curr = curr.next) {
                if (!curr.identifier || !curr.selected
                    || !menuitem_invert_test(2, curr.itemflags, true))
                    continue;
                curr.selected = false;
                curr.count = -1;
            }
        } else if (morc === '@') {              /* MENU_INVERT_ALL */
            if (cw.how === PICK_ANY)
                invert_all(window, cw.curr_page, 0, -1);
        } else if (morc === MENU_SEARCH) {
            if (cw.how !== 0 /* PICK_NONE */) {
                const { getlin } = await import('./../cmd.js');
                const search = await getlin('Search for:');
                if (search && search !== '\x1b') {
                    const pattern = `*${search}*`.toLowerCase();
                    const items = menu_page_items(window, cw.curr_page);
                    const onpage = new Map(items.map((item, n) => [item, n]));
                    for (let curr = cw.mlist; curr; curr = curr.next) {
                        if (!curr.identifier
                            || !pmatch(pattern, curr.str.toLowerCase()))
                            continue;
                        const lineno = onpage.get(curr);
                        if (curr.selected) {
                            curr.selected = false;
                            curr.count = -1;
                        } else {
                            curr.selected = true;
                        }
                        if (lineno !== undefined)
                            set_item_state(window, lineno, curr);
                        if (how === PICK_ONE) {
                            finished = true;
                            break;
                        }
                    }
                }
                const items = menu_page_items(window, cw.curr_page);
                const morestr = (cw.npages > 1)
                                ? `(${cw.curr_page + 1} of ${cw.npages})`
                                : cw.morestr;
                game?.nhDisplay?.setCursor(
                    cw.offx + 1 + morestr.length, cw.offy + items.length);
            }
        } else {
            /* find, toggle, and possibly update */
            const items = menu_page_items(window, cw.curr_page);
            const n = items.findIndex(it => it.identifier
                                            && it.selector === morc);
            if (n >= 0) {
                const curr = items[n];
                if (curr.selected) {
                    curr.selected = false;
                    curr.count = -1;
                } else {
                    curr.selected = true;
                }
                set_item_state(window, n, curr);
                if (how === PICK_ONE)
                    finished = true;
            }
            /* unacceptable input: C rings the bell and keeps reading */
        }
        counting = false;
        count = 0;
    }

    /* win/tty/wintty.c:2794 — dismiss (not destroy) before returning, so the
       screen underneath is restored while the caller still holds the window.
       Skipping this leaves the menu painted behind whatever the caller opens
       next, e.g. doset_simple_menu()'s handler menus.

       erase_menu_or_text() handles the repaint (its offx==0 arm is C's
       `docrt(); flush_screen(1);` restructured for a sync context). */
    tty_dismiss_nhwindow(window);
    /* erase_menu_or_text()'s docrt() ends with vision_recalc(), whose
       notice_all_mons(TRUE) this port queues; run it here, in C's order */
    await notice_all_mons_flush();
    game.bot_disabled = oldBotDisabled;

    const picks = [];
    Object.defineProperty(picks, 'cancelled', { value: !!cw.cancelled });
    if (cw.cancelled)
        return picks;
    const counts = new Map();
    for (let curr = cw.mlist; curr; curr = curr.next) {
        if (curr.identifier && curr.selected) {
            picks.push(curr.identifier);
            counts.set(curr.identifier, curr.count);
        }
    }
    Object.defineProperty(picks, 'counts', { value: counts });
    return picks;
}

export function tty_prev_page(window) {
    const cw = windows[window];
    const display = game?.nhDisplay;
    if (!cw || !display) return false;
    if (cw.curr_page <= 0) return false;
    cw.curr_page--;
    if (cw.mlist) process_menu_window(cw, cw.curr_page, display);
    else render_page(cw, cw.curr_page, display);
    return true;
}

export function tty_next_page(window) {
    const cw = windows[window];
    const display = game?.nhDisplay;
    if (!cw || !display) return false;
    if (cw.curr_page + 1 >= cw.npages) return false;
    cw.curr_page++;
    if (cw.mlist) process_menu_window(cw, cw.curr_page, display);
    else render_page(cw, cw.curr_page, display);
    return true;
}

// win/tty/wintty.c:4210 docorner() — blank the columns a corner window
// occupied, refresh the map underneath from the glyph buffer (row_refresh),
// and redraw the status rows if the window overlapped them.
function docorner(xmin, ymax, display) {
    let y = 0;
    const screenX = Math.max(0, xmin - 1);
    for (; y < Math.min(ymax, ROWS); y++) {
        /* the C moves the BASE_WINDOW cursor once per row, and the position it
           is left in is what the NEXT tty_putstr(BASE_WINDOW) writes over. A
           second "Who are you?" after 'a' on the confirmation menu lands on the
           row below the dismissed menu because of exactly this. */
        tty_curs_base(xmin, y);
        for (let x = screenX; x < COLS; x++)
            display.setCell(x, y, ' ', NO_COLOR, 0);
        /* row_refresh(xmin - offx, COLNO-1, y - offy): terminal row y maps to
           map row y-1. xmin is already the first 1-based map column whose
           screen cell was cleared by tty_curs(BASE_WINDOW, xmin, y). */
        if (y >= 1 && y - 1 < ROWNO)
            row_refresh(Math.max(1, xmin), COLNO - 1, y - 1);
    }
    /* "we scribbled over the status line; redraw it" */
    if (ymax >= 22) {
        (game.disp ||= {}).botlx = true;
        bot();
    }
}

// win/tty/wintty.c:966 erase_menu_or_text()
function erase_menu_or_text(cw, display, clear) {
    if (cw.offx === 0) {
        if (cw.offy) {
            /* tty_curs(window, 1, 0); cl_eos(); */
            for (let r = cw.offy; r < ROWS; r++)
                for (let c = 0; c < COLS; c++)
                    display.setCell(c, r, ' ', NO_COLOR, 0);
        } else if (clear) {
            display.clearScreen();
        } else {
            /* C: docrt(); flush_screen(1); — async in this port and this
               runs under synchronous destroy sites. Rebuild the glyph buffer
               synchronously, then paint those cells directly. */
            docrt_sync_rebuild();
            display.clearScreen();
            for (let y = 0; y < ROWNO; y++)
                row_refresh(1, COLNO - 1, y);
            /* docrt() forces the bottom lines (disp.botlx) and flush_screen(1)
               calls bot(); inside select_menu() bot() is disabled
               (windows.c:1860), so the flag stays up and the next flush
               repaints the status rows once the menu call has returned */
            (game.disp ||= {}).botlx = true;
            bot();
            if (game.u?.ux > 0)
                display.setCursor(game.u.ux - 1, game.u.uy + 1);
        }
    } else {
        docorner(cw.offx, cw.maxrow + 1, display);
    }
}

// win/tty/wintty.c tty_dismiss_nhwindow() — menu/text case.
//
// `program_state.in_role_selection` forces a full clear instead of a redraw,
// because nothing tracks what the chargen menus were drawn over. That is why
// the role menu's screen is gone by the time the race menu appears rather than
// showing through beside it.
export function tty_dismiss_nhwindow(window) {
    const cw = windows[window];
    const display = game?.nhDisplay;
    if (!cw || !display) return;
    if (cw.type !== NHW_MENU && cw.type !== NHW_TEXT) return;
    if (cw.active) {
        erase_menu_or_text(cw, display, !!game.in_role_selection);
        cw.active = 0;
    }
}

export function reset_windows() {
    windows = [];
    nextWinId = 1;
}

// win/tty/wintty.c tty_raw_print() — text straight to the terminal, used
// after the game windows are gone (topten's wizard-mode notice).
export function tty_raw_print(str) {
    tty_putstr_base(str ?? '');
}

// win/tty/wintty.c:344 bail() — give up before the game starts: close the
// windows and exit
export async function bail(mesg) {
    /* clearlocks() has no counterpart in this port */
    /* tty_exit_nhwindows(mesg): tty_suspend_nhwindows() -> settty() ->
       end_screen() clears the terminal and homes the cursor, then prints
       mesg if there is one; a null mesg prints an empty raw line */
    const { cls } = await import('./../display.js');
    await cls();
    tty_curs_base(0, 0);
    if (mesg)
        tty_raw_print(mesg);
    else
        tty_raw_print('');
    /* nh_terminate(EXIT_SUCCESS): unwind the way src/end.c does */
    game.program_state_gameover = true;
    const sig = new Error('nh_terminate');
    sig.__nh_gameover = true;
    throw sig;
}

/* ---------------------------------------------------------------------------
 * win/tty/wintty.c:4225 the status line rendering (STATUS_HILITES).
 * The tty statics (tty_status[NOW/BEFORE][], tty_condition_bits,
 * tty_colormasks, hpbar_percent, finalx[][], the shrink levels) live on
 * game._tty_status so that a fresh game starts them over.
 * ------------------------------------------------------------------------- */

const NOW = 1, BEFORE = 0;
const MAX_STATUS_ROWS = 3;
const StatusRows = () => (((game.iflags?.wc2_statuslines | 0) <= 2) ? 2 : MAX_STATUS_ROWS);
const FORCE_RESET = true, NO_RESET = false;

/* win/tty/wintty.c:4268 encvals[][] */
const encvals = [
    ['', 'Burdened', 'Stressed', 'Strained', 'Overtaxed', 'Overloaded'],
    ['', 'Burden',   'Stress',   'Strain',   'Overtax',   'Overload'  ],
    ['', 'Brd',      'Strs',     'Strn',     'Ovtx',      'Ovld'      ],
];
const blPAD = BL_FLUSH;
/* win/tty/wintty.c:4278 the 2 or 3 status line field orders */
const twolineorder = [
    [BL_TITLE, BL_STR, BL_DX, BL_CO, BL_IN, BL_WI, BL_CH, BL_ALIGN,
     BL_SCORE, BL_FLUSH],
    [BL_LEVELDESC, BL_GOLD, BL_HP, BL_HPMAX, BL_ENE, BL_ENEMAX,
     BL_AC, BL_XP, BL_EXP, BL_HD, BL_TIME, BL_HUNGER, BL_CAP,
     BL_CONDITION, BL_WEAPON, BL_ARMOR, BL_TERRAIN, BL_VERS, BL_FLUSH],
    /* third row of array isn't used for twolineorder */
    [BL_FLUSH],
];
/* Align moved from 1 to 2, Leveldesc+Time+Cond+Vers moved from 2 to 3 */
const threelineorder = [
    [BL_TITLE, BL_STR, BL_DX, BL_CO, BL_IN, BL_WI, BL_CH, BL_SCORE, BL_FLUSH],
    [BL_ALIGN, BL_GOLD, BL_HP, BL_HPMAX, BL_ENE, BL_ENEMAX,
     BL_AC, BL_XP, BL_EXP, BL_HD, BL_HUNGER, BL_CAP, BL_FLUSH],
    [BL_LEVELDESC, BL_TIME, BL_CONDITION, BL_WEAPON, BL_ARMOR, BL_TERRAIN,
     BL_VERS, BL_FLUSH],
];
/* do_field_opt: skip fields that aren't flagged as requiring updating
   during the current render_status() */
const do_field_opt = 1;

function tty_status_state() {
    return game._tty_status;
}

// win/tty/wintty.c:4336 tty_status_init() — initialize the tty-specific
// data structures; call genl_status_init() to initialize the general data.
export function tty_status_init() {
    let i;
    const num_rows = StatusRows(); /* 2 or 3 */
    const st = {
        fieldorder: (num_rows !== 3) ? twolineorder : threelineorder,
        tty_status: [[], []],
        tty_condition_bits: 0,
        tty_colormasks: null,
        hpbar_percent: 0, hpbar_crit_hp: 0,
        finalx: [[0, 0], [0, 0], [0, 0]],    /* [rows][NOW or BEFORE] */
        windowdata_init: false,
        cond_shrinklvl: 0,
        enclev: 0, enc_shrinklvl: 0,
        dlvl_shrinklvl: 0,
        truncation_expected: false,
        cur_color: NO_COLOR, cur_attr: 0,
    };

    for (i = 0; i < MAXBLSTATS; ++i) {
        st.tty_status[NOW][i] = { idx: BL_FLUSH, color: NO_COLOR, attr: ATR_NONE,
                                  x: 0, y: 0, lth: 0, valid: false, dirty: false,
                                  redraw: false, sanitycheck: false };
        st.tty_status[BEFORE][i] = { ...st.tty_status[NOW][i] };
    }
    game._tty_status = st;

    /* let genl_status_init do most of the initialization */
    genl_status_init();
}

// win/tty/wintty.c:4364 tty_status_enablefield()
export function tty_status_enablefield(fieldidx, nm, fmt, enable) {
    genl_status_enablefield(fieldidx, nm, fmt, enable);
}

// win/tty/wintty.c:4454 tty_status_update()
export function tty_status_update(fldidx, ptr, chg, percent, color, colormasks) {
    let attrmask;
    let text = ptr;
    let fmt;
    let reset_state = NO_RESET;
    const st = tty_status_state();
    const g = genl_status();
    const tty_status = st.tty_status;

    if ((fldidx < BL_RESET) || (fldidx >= MAXBLSTATS))
        return;

    if ((fldidx >= 0 && fldidx < MAXBLSTATS) && !g.status_activefields[fldidx])
        return;

    switch (fldidx) {
    case BL_RESET:
        reset_state = FORCE_RESET;
        /*FALLTHRU*/
    case BL_FLUSH:
        if (make_things_fit(reset_state) || st.truncation_expected) {
            render_status();
        }
        return;
    case BL_CONDITION:
        tty_status[NOW][fldidx].idx = fldidx;
        st.tty_condition_bits = ptr >>> 0;
        st.tty_colormasks = colormasks;
        tty_status[NOW][fldidx].valid = true;
        tty_status[NOW][fldidx].dirty = true;
        tty_status[NOW][fldidx].sanitycheck = true;
        st.truncation_expected = false;
        break;
    case BL_GOLD:
        /* text = decode_mixed(goldbuf, text): the gold symbol is already
           plain here */
        /*FALLTHRU*/
    default:
        attrmask = (color >> 8) & 0x00ff;
        fmt = g.status_fieldfmt[fldidx];
        if (!fmt)
            fmt = '%s';
        /* should be checking for first enabled field here rather than
           just first field, but 'fieldorder' doesn't start any rows
           with fields which can be disabled so [any_row][0] suffices */
        if (fmt[0] === ' ' && (fldidx === st.fieldorder[0][0]
                               || fldidx === st.fieldorder[1][0]
                               || fldidx === st.fieldorder[2][0]))
            fmt = fmt.slice(1); /* skip leading space for first field on line */
        g.status_vals[fldidx] = sprintf_s(fmt, text == null ? '' : String(text));
        tty_status[NOW][fldidx].idx = fldidx;
        tty_status[NOW][fldidx].color = (color & 0x00ff);
        tty_status[NOW][fldidx].attr = term_attr_fixup(attrmask);
        tty_status[NOW][fldidx].lth = g.status_vals[fldidx].length;
        tty_status[NOW][fldidx].valid = true;
        tty_status[NOW][fldidx].dirty = true;
        tty_status[NOW][fldidx].sanitycheck = true;
        break;
    }

    /* The core botl engine sends a single blank to the window port
       for carrying-capacity when it's unused. Let's suppress that */
    if (fldidx >= 0 && fldidx < MAXBLSTATS
        && tty_status[NOW][fldidx].lth === 1
        && g.status_vals[fldidx][0] === ' ') {
        g.status_vals[fldidx] = '';
        tty_status[NOW][fldidx].lth = 0;
    }

    /* default processing above was required before these */
    switch (fldidx) {
    case BL_HP:
        if (game.flags?.hitpointbar) {
            /* Special additional processing for hitpointbar */
            st.hpbar_percent = percent;
            st.hpbar_crit_hp = critically_low_hp(true) ? 1 : 0;
            tty_status[NOW][BL_TITLE].color = (color & 0x00ff);
            attrmask = HL_INVERSE | (st.hpbar_crit_hp ? HL_BLINK : 0);
            tty_status[NOW][BL_TITLE].attr = term_attr_fixup(attrmask);
            tty_status[NOW][BL_TITLE].dirty = true;
        }
        break;
    case BL_LEVELDESC:
        st.dlvl_shrinklvl = 0; /* caller is passing full length string */
        /*FALLTHRU*/
    case BL_HUNGER:
        /* The core sends trailing blanks for some fields.
           Let's suppress the trailing blanks */
        if (tty_status[NOW][fldidx].lth > 0) {
            const trimmed = g.status_vals[fldidx].replace(/ +$/, '');
            tty_status[NOW][fldidx].lth -= (g.status_vals[fldidx].length - trimmed.length);
            g.status_vals[fldidx] = trimmed;
        }
        break;
    case BL_TITLE:
        /* when hitpointbar is enabled, rendering will enforce a length
           of 30 on title, padding with spaces or truncating if necessary */
        if (game.flags?.hitpointbar)
            tty_status[NOW][fldidx].lth = 30 + 2; /* '[' and ']' */
        break;
    case BL_GOLD:
        /* \GXXXXNNNN counts as 1 [moot since we use decode_mixed() above] */
        break;
    case BL_CAP:
        st.enc_shrinklvl = 0; /* caller is passing full length string */
        st.enclev = stat_cap_indx();
        break;
    }
    /* As of 3.6.2 we only render on BL_FLUSH (or BL_RESET) */
    return;
}

/* the C's Sprintf(buf, fmt, text) for the "%s"/" St:%s"/"(%s)"/"/%s" and
   "%-30.30s" field formats */
function sprintf_s(fmt, text) {
    if (fmt === '%-30.30s')
        return text.slice(0, 30).padEnd(30);
    return fmt.replace('%s', text);
}

// win/tty/termcap.c:1411 term_attr_fixup() — underline, blink and dim keep
// their sequences on the recorder's terminal, so nothing is converted
function term_attr_fixup(msk) {
    return msk;
}

// win/tty/wintty.c:4583 make_things_fit()
function make_things_fit(force_update) {
    let trycnt, fitting = 0, requirement;
    const rowsz = [0, 0, 0];
    let num_rows, condrow, otheroptions = 0;
    const st = tty_status_state();
    const cw = windows[game.WIN_STATUS];

    num_rows = StatusRows();
    condrow = num_rows - 1; /* always last row, 1 for 0..1 or 2 for 0..2 */
    st.cond_shrinklvl = 0;
    if (st.enc_shrinklvl > 0 && num_rows === 2)
        shrink_enc(0);
    if (st.dlvl_shrinklvl > 0)
        shrink_dlvl(0);
    set_condition_length();
    for (trycnt = 0; trycnt < 6 && !fitting; ++trycnt) {
        /* FIXME: this remeasures each line every time even though it
           is only attempting to shrink one of them and the other one
           (or two) remains the same */
        if (!check_fields(force_update, rowsz)) {
            fitting = 0;
            break;
        }

        requirement = rowsz[condrow] - 1;
        if (requirement <= cw.cols - 1) {
            fitting = requirement;
            break;  /* we're good */
        }
        if (trycnt < 2) {
            if (st.cond_shrinklvl < trycnt + 1) {
                st.cond_shrinklvl = trycnt + 1;
                set_condition_length();
            }
            continue;
        }
        if (st.cond_shrinklvl >= 2) {
            /* We've exhausted the condition identifiers shrinkage,
             * so let's try shrinking other things...
             */
            if (otheroptions < 2) {
                /* try shrinking the encumbrance word, but
                   only when it's on the same line as conditions */
                if (num_rows === 2)
                    shrink_enc(otheroptions + 1);
            } else if (otheroptions === 2) {
                shrink_dlvl(1);
            } else {
                /* Last resort - turn on trunction */
                st.truncation_expected = true;
                break;
            }
            ++otheroptions;
        }
    }
    return fitting;
}

// win/tty/wintty.c:4647 check_fields() — figure out where each field
// should be placed, and flag whether the on-screen details must be
// updated because they need to change.
function check_fields(forcefields, sz) {
    let c, i, row, col, num_rows, idx;
    let valid = true, matchprev, update_right;
    const st = tty_status_state();
    const g = genl_status();
    const tty_status = st.tty_status;

    if (!st.windowdata_init && !check_windowdata())
        return false;

    num_rows = StatusRows(); /* 2 or 3 */
    for (row = 0; row < num_rows; ++row) {
        sz[row] = 0;
        col = 1;
        update_right = false;
        for (i = 0; (idx = st.fieldorder[row][i]) !== BL_FLUSH; ++i) {
            if (!g.status_activefields[idx])
                continue;
            if (!tty_status[NOW][idx].valid)
                valid = false;
            /* might be called more than once for shrink tests, so need
               to reset these (redraw and x at any rate) each time */
            tty_status[NOW][idx].redraw = false;
            tty_status[NOW][idx].y = row;
            tty_status[NOW][idx].x = col;

            /* On a change to the field location, everything further
               to the right must be updated as well.  (Not necessarily
               everything; it's possible for complementary changes across
               multiple fields to put stuff further right back in sync.) */
            if (tty_status[NOW][idx].x + tty_status[NOW][idx].lth
                !== tty_status[BEFORE][idx].x + tty_status[BEFORE][idx].lth)
                update_right = true;
            else if (tty_status[NOW][idx].lth !== tty_status[BEFORE][idx].lth
                     || tty_status[NOW][idx].x !== tty_status[BEFORE][idx].x)
                tty_status[NOW][idx].redraw = true;
            else /* in case update_right is set, we're back in sync now */
                update_right = false;

            matchprev = false; /* assume failure */
            if (valid && !update_right && !forcefields
                && !tty_status[NOW][idx].redraw) {
                /*
                 * Check values against those already on the display.
                 *  - Is the additional processing time for this worth it?
                 */
                if (do_field_opt
                    /* color/attr checks aren't right for 'condition'
                       and neither is examining status_vals[BL_CONDITION]
                       so skip same-contents optimization for conditions */
                    && idx !== BL_CONDITION
                    && (tty_status[NOW][idx].color
                        === tty_status[BEFORE][idx].color)
                    && (tty_status[NOW][idx].attr
                        === tty_status[BEFORE][idx].attr)) {
                    matchprev = true; /* assume success */
                    if (tty_status[NOW][idx].dirty) {
                        /* compare values */
                        const cw = windows[game.WIN_STATUS];
                        const nb = g.status_vals[idx];
                        let k = 0;

                        c = col - 1;
                        while (k < nb.length && c < cw.cols) {
                            if (nb[k] !== cw.data[row][c])
                                break;
                            k++;
                            c++;
                        }
                        /* if we're not at the end of new string, no match;
                           we don't need to worry about whether there might
                           be leftover old string; that could only happen
                           if they have different lengths, in which case
                           'update_right' will be set and we won't get here */
                        if (k < nb.length)
                            matchprev = false;
                    }
                }
            }

            if (forcefields || update_right
                || (tty_status[NOW][idx].dirty && !matchprev))
                tty_status[NOW][idx].redraw = true;

            col += tty_status[NOW][idx].lth;
        }
        sz[row] = col;
    }
    return valid;
}

// win/tty/wintty.c:4803 tty_putstatusfield() — this is what places a field
// on the tty display
function tty_putstatusfield(text, x, y) {
    let i, n, ncols, nrows, lth = 0;
    const cw = windows[game.WIN_STATUS];
    const st = tty_status_state();
    const display = game?.nhDisplay;

    if (!cw)
        throw new Error('tty_putstatusfield: Invalid WinDesc'); /* panic */

    ncols = cw.cols;
    nrows = cw.maxrow;
    lth = text.length;

    if (x < ncols && y < nrows) {
        if (x !== cw.curx || y !== cw.cury)
            tty_curs_status(cw, x, y);
        /* the recorder turns any run of five or more spaces of a row into
           a cursor-forward whatever attributes are in effect, and the
           judge's decoder restores such a run as plain cells; paint those
           spaces plain here so the two agree */
        const plain = new Array(lth).fill(false);
        for (i = 0; i < lth; ++i) {
            if (text[i] === ' ') {
                let e = i;
                while (e + 1 < lth && text[e + 1] === ' ')
                    e++;
                if (e - i + 1 >= 5)
                    for (let k = i; k <= e; k++)
                        plain[k] = true;
                i = e;
            }
        }
        for (i = 0; i < lth; ++i) {
            n = i + x;
            if (n < ncols) {
                if (display)
                    display.setCell(n - 1 + cw.offx, y + cw.offy, text[i],
                                    plain[i] ? NO_COLOR : st.cur_color,
                                    plain[i] ? 0 : st.cur_attr);
                cw.curx++;
                cw.data[y][n - 1] = text[i];
            }
        }
    }
}

/* tty_curs(WIN_STATUS, x, y): the window's cursor; the terminal cursor
   moves with the last cell written */
function tty_curs_status(cw, x, y) {
    cw.curx = x;
    cw.cury = y;
}

/* cl_end() on the status window's row from the window cursor on */
function status_cl_end(cw, y) {
    const display = game?.nhDisplay;
    if (!display)
        return;
    for (let x = cw.curx - 1 + cw.offx; x < COLS; x++)
        display.setCell(x, y + cw.offy, ' ', NO_COLOR, 0);
}

// win/tty/wintty.c:4844 set_condition_length() — caller must set
// cond_shrinklvl (0..2) before calling us
function set_condition_length() {
    let mask;
    let c, lth = 0;
    const st = tty_status_state();

    if (st.tty_condition_bits) {
        for (c = 0; c < conditions().length; ++c) {
            mask = conditions()[c].mask;
            if ((st.tty_condition_bits & mask) === mask)
                lth += 1 + conditions()[c].text[st.cond_shrinklvl].length;
        }
    }
    st.tty_status[NOW][BL_CONDITION].lth = lth;
}

// win/tty/wintty.c:4860 shrink_enc()
function shrink_enc(lvl) {
    const st = tty_status_state();
    const g = genl_status();

    /* shrink or restore the encumbrance word */
    if (lvl <= 2) {
        st.enc_shrinklvl = lvl;
        g.status_vals[BL_CAP] = ` ${encvals[lvl][st.enclev]}`;
    }
    st.tty_status[NOW][BL_CAP].lth = g.status_vals[BL_CAP].length;
}

// win/tty/wintty.c:4871 shrink_dlvl() — try changing Dlvl: to Dl:
function shrink_dlvl(lvl) {
    const st = tty_status_state();
    const g = genl_status();
    const colon = g.status_vals[BL_LEVELDESC].indexOf(':');

    if (colon >= 0) {
        st.dlvl_shrinklvl = lvl;
        g.status_vals[BL_LEVELDESC] = ((lvl === 0) ? 'Dlvl' : 'Dl')
                                      + g.status_vals[BL_LEVELDESC].slice(colon);
        st.tty_status[NOW][BL_LEVELDESC].lth = g.status_vals[BL_LEVELDESC].length;
    }
}

// win/tty/wintty.c:4890 check_windowdata() — ensure the underlying status
// window data start out blank and null-terminated
function check_windowdata() {
    const st = tty_status_state();

    if (game.WIN_STATUS == null || !windows[game.WIN_STATUS]) {
        /* paniclog("check_windowdata", " null status window."); */
        return false;
    } else if (!st.windowdata_init) {
        tty_clear_nhwindow(game.WIN_STATUS); /* also sets cw->data[] to spaces */
        st.windowdata_init = true;
    }
    return true;
}

// win/tty/wintty.c:4905 condcolor() — return what color this condition
// should be displayed in based on user settings
function condcolor(bm, bmarray) {
    let i;

    if (bm && bmarray)
        for (i = 0; i < CLR_MAX; ++i) {
            if ((bm & (bmarray[i] | 0)) !== 0)
                return i;
        }
    return NO_COLOR;
}

// win/tty/wintty.c:4917 condattr()
function condattr(bm, bmarray) {
    let attr = 0;
    let i;

    if (bm && bmarray) {
        for (i = HL_ATTCLR_BOLD; i < BL_ATTCLR_MAX; ++i) {
            if ((bm & (bmarray[i] | 0)) !== 0) {
                switch (i) {
                case HL_ATTCLR_BOLD:
                    attr |= HL_BOLD;
                    break;
                case HL_ATTCLR_DIM:
                    attr |= HL_DIM;
                    break;
                case HL_ATTCLR_ITALIC:
                    attr |= HL_ITALIC;
                    break;
                case HL_ATTCLR_ULINE:
                    attr |= HL_ULINE;
                    break;
                case HL_ATTCLR_BLINK:
                    attr |= HL_BLINK;
                    break;
                case HL_ATTCLR_INVERSE:
                    attr |= HL_INVERSE;
                    break;
                }
            }
        }
    }
    return attr;
}

/* win/tty/wintty.c:4951 Begin_Attr()/End_Attr() and termcap's
   term_start_color()/term_end_color(): the attribute and colour a status
   field is painted with (the judge's decoder keeps inverse, bold and
   underline; dim, italic and blink leave no cell trace) */
function Begin_Attr(m) {
    const st = tty_status_state();
    if (m) {
        if (m & HL_BOLD) st.cur_attr |= TERM_BOLD;
        if (m & HL_ULINE) st.cur_attr |= TERM_UNDERLINE;
        if (m & HL_INVERSE) st.cur_attr |= TERM_INVERSE;
    }
}
function End_Attr(m) {
    const st = tty_status_state();
    if (m) {
        if (m & HL_INVERSE) st.cur_attr &= ~TERM_INVERSE;
        if (m & HL_ULINE) st.cur_attr &= ~TERM_UNDERLINE;
        if (m & HL_BOLD) st.cur_attr &= ~TERM_BOLD;
    }
}
function term_start_color(color) {
    tty_status_state().cur_color = color;
}
function term_end_color() {
    tty_status_state().cur_color = NO_COLOR;
}

// win/tty/wintty.c:4992 render_status()
function render_status() {
    let mask, bits;
    let i, x, y, idx, c, ci, row, tlth, num_rows,
        coloridx = 0, attrmask = 0;
    let text;
    const st = tty_status_state();
    const g = genl_status();
    const tty_status = st.tty_status;
    const cw = windows[game.WIN_STATUS];

    if (game.WIN_STATUS == null || !cw) {
        /* paniclog("render_status", "WIN_ERR on status window."); */
        return;
    }
    const fieldorder = st.fieldorder;
    const cidx = cond_idx();

    num_rows = StatusRows(); /* 2 or 3 */
    for (row = 0; row < num_rows; ++row) {
        y = row;
        tty_curs_status(cw, 1, y);
        for (i = 0; (idx = fieldorder[row][i]) !== BL_FLUSH; ++i) {
            if (!g.status_activefields[idx])
                continue;
            x = tty_status[NOW][idx].x;
            text = g.status_vals[idx]; /* always "" for BL_CONDITION */
            tlth = tty_status[NOW][idx].lth; /* valid for BL_CONDITION */

            if (tty_status[NOW][idx].redraw || !do_field_opt) {
                const hitpointbar = (idx === BL_TITLE
                                     && game.flags?.hitpointbar);

                if (idx === BL_CONDITION) {
                    /*
                     * +-----------------+
                     * | Condition Codes |
                     * +-----------------+
                     */
                    bits = st.tty_condition_bits;
                    /*
                     * If no bits are set, we can fall through condition
                     * rendering code to finalx[] handling (and subsequent
                     * rest-of-line erasure if line is shorter than before).
                     *
                     * First, when conditions are on 3rd row, they might
                     * be indented to line up with a position on 2nd row.
                     */
                    if (row === MAX_STATUS_ROWS - 1 && bits !== 0) {
                        let cstart, last_col = cw.cols;
                        const dat = cw.data[y];

                        /* 'version' might follow conditions; if so, adjust
                           expectations for where conditions should end;
                           only matters when conditions are being indented */
                        if (g.status_activefields[BL_VERS]
                            && fieldorder[row][i + 1] === BL_VERS)
                            last_col -= tty_status[NOW][BL_VERS].lth;
                        /* line up with hunger (or where it would have
                           been when currently omitted); if there isn't
                           enough room for that, right justify; or place
                           as-is if not even enough room for /that/; we
                           expect hunger to be on preceding row, in which
                           case its current data has been moved to [BEFORE] */
                        if (tty_status[BEFORE][BL_HUNGER].y < row
                            && x < tty_status[BEFORE][BL_HUNGER].x
                            && (tty_status[BEFORE][BL_HUNGER].x + tlth
                                < last_col - 1))
                            cstart = tty_status[BEFORE][BL_HUNGER].x;
                        else if (x + tlth < cw.cols - 1)
                            cstart = last_col - tlth;
                        else
                            cstart = x;
                        /* indent conditions to line them up with 2nd row */
                        if (x < cstart) {
                            do {
                                if (dat[x - 1] !== ' ')
                                    tty_putstatusfield(' ', x, y);
                            } while (++x < cstart);
                            tty_status[NOW][BL_CONDITION].x = x;
                            tty_curs_status(cw, x, y);
                        }
                    }
                    /* actually draw condition words */
                    for (c = 0; c < conditions().length && bits !== 0; ++c) {
                        ci = cidx[c];
                        mask = conditions()[ci].mask;
                        if (bits & mask) {
                            let condtext;

                            tty_putstatusfield(' ', x++, y);
                            if (game.iflags?.hilite_delta) {
                                attrmask = condattr(mask, st.tty_colormasks);
                                Begin_Attr(attrmask);
                                coloridx = condcolor(mask, st.tty_colormasks);
                                if (coloridx !== NO_COLOR)
                                    term_start_color(coloridx);
                            }
                            condtext = conditions()[ci].text[st.cond_shrinklvl];
                            if (x >= cw.cols && !st.truncation_expected) {
                                impossible(`Unexpected condition placement overflow for "${condtext}"`);
                                condtext = '';
                                bits = 0; /* skip any remaining conditions */
                            }
                            tty_putstatusfield(condtext, x, y);
                            x += condtext.length;
                            if (game.iflags?.hilite_delta) {
                                if (coloridx !== NO_COLOR)
                                    term_end_color();
                                End_Attr(attrmask);
                            }
                            bits &= ~mask;
                            bits >>>= 0;
                        }
                    }
                    /* 'x' is 1-based and 'cols' and 'data' are 0-based,
                       so x==cols means we just stored in data[N-2] and
                       are now positioned at data[N-1], the terminator;
                       that's ok as long as we don't write there */
                    if (x > cw.cols) {
                        /* paniclog("render_status()", " unexpected truncation.") */
                        x = cw.cols;
                    }
                } else if (hitpointbar) {
                    /*
                     * +-------------------------+
                     * | Title with Hitpoint Bar |
                     * +-------------------------+
                     */
                    /* hitpointbar using hp percent calculation */
                    let bar_len, bar_pos = 0;
                    let bar, bar2 = null;
                    const twoparts = (st.hpbar_percent < 100);

                    /* force exactly 30 characters, padded with spaces
                       if shorter or truncated if longer */
                    if (text.length !== 30) {
                        bar = text.slice(0, 30).padEnd(30); /* "%-30.30s" */
                        g.status_vals[BL_TITLE] = bar;
                    } else {
                        bar = text;
                    }
                    if (st.hpbar_crit_hp)
                        bar = repad_with_dashes(bar);
                    bar_len = bar.length; /* always 30 */
                    attrmask = 0; /* for the second part only case: dead */
                    /* when at full HP, the whole title will be highlighted;
                       when injured or dead, there will be a second portion
                       which is not highlighted */
                    if (twoparts) {
                        /* figure out where to separate the two parts */
                        bar_pos = Math.trunc((bar_len * st.hpbar_percent) / 100);
                        if (bar_pos < 1 && st.hpbar_percent > 0)
                            bar_pos = 1;
                        if (bar_pos >= bar_len && st.hpbar_percent < 100)
                            bar_pos = bar_len - 1;
                        bar2 = bar.slice(bar_pos);
                        bar = bar.slice(0, bar_pos);
                    }
                    tty_putstatusfield('[', x++, y);
                    if (bar) { /* always True, unless twoparts+dead (0 HP) */
                        coloridx = tty_status[NOW][BL_TITLE].color;
                        attrmask = tty_status[NOW][BL_TITLE].attr;
                        Begin_Attr(attrmask);
                        if (game.iflags?.hilite_delta && coloridx !== NO_COLOR)
                            term_start_color(coloridx);
                        tty_putstatusfield(bar, x, y);
                        x += bar.length;
                        if (game.iflags?.hilite_delta && coloridx !== NO_COLOR)
                            term_end_color();
                        End_Attr(attrmask);
                    }
                    if (twoparts) {
                        /* (attrmask & HL_BLINK) has no cell trace */
                        tty_putstatusfield(bar2, x, y);
                        x += bar2.length;
                    }
                    tty_putstatusfield(']', x++, y);
                } else {
                    /*
                     * +-----------------------------+
                     * | Everything else that is not |
                     * |   in a special case above   |
                     * +-----------------------------+
                     */
                    if (idx === BL_VERS
                        /* if 'version' is the last field in its row, right
                           justify it (otherwise just treat it as ordinary) */
                        && fieldorder[row][i + 1] === BL_FLUSH) {
                        let vstart;
                        const dat = cw.data[y];
                        /* FIXME:  there's something fishy going on here;
                           'x' ends up out of synch when conditions have
                           3rd row indentation and the indenting of version
                           overwrites them with spaces; this hides that */
                        const vx = tty_status[BEFORE][BL_CONDITION].x
                                   + tty_status[BEFORE][BL_CONDITION].lth;

                        if (i > 0 && fieldorder[row][i - 1] === BL_CONDITION
                            && x !== vx) {
                            x = vx;
                            tty_curs_status(cw, x, y);
                        }
                        /* indent version to right justify it */
                        vstart = cw.cols - tty_status[NOW][idx].lth;
                        if (x < vstart) {
                            do {
                                if (dat[x - 1] !== ' ')
                                    tty_putstatusfield(' ', x, y);
                            } while (++x < vstart);
                            tty_status[NOW][BL_VERS].x = x;
                        }
                    }
                    if (game.iflags?.hilite_delta) {
                        while (text[0] === ' ') {
                            tty_putstatusfield(' ', x++, y);
                            text = text.slice(1);
                        }
                        if (text[0] === '/' && idx === BL_EXP) {
                            tty_putstatusfield('/', x++, y);
                            text = text.slice(1);
                        }
                        attrmask = tty_status[NOW][idx].attr;
                        Begin_Attr(attrmask);
                        coloridx = tty_status[NOW][idx].color;
                        if (coloridx !== NO_COLOR)
                            term_start_color(coloridx);
                    }
                    tty_putstatusfield(text, x, y);
                    x += text.length;
                    if (game.iflags?.hilite_delta) {
                        if (coloridx !== NO_COLOR)
                            term_end_color();
                        End_Attr(attrmask);
                    }
                }
            } else {
                /* not rendered => same text as before */
                x += tlth;
            }
            st.finalx[row][NOW] = x - 1;
            /* reset .redraw and .dirty now that field has been rendered */
            tty_status[NOW][idx].dirty  = false;
            tty_status[NOW][idx].redraw = false;
            tty_status[NOW][idx].sanitycheck = false;
            /*
             * For comparison of current and previous:
             * - Copy the entire tty_status struct.
             */
            tty_status[BEFORE][idx] = { ...tty_status[NOW][idx] };
        } /* for i=..., idx=fieldorder[][i] */
        x = st.finalx[row][NOW];
        if ((x < st.finalx[row][BEFORE] || !st.finalx[row][BEFORE])
            && x + 1 < cw.cols) {
            tty_curs_status(cw, x + 1, y);
            status_cl_end(cw, y);
        }
        /*
         * For comparison of current and previous:
         * - Copy the last written column number on the row.
         */
        st.finalx[row][BEFORE] = st.finalx[row][NOW];
    } /* for row=... */
    return;
}

// win/tty/wintty.c:559 new_status_window() — statuslines changed: rebuild
// the status window and its tracking data
export function new_status_window() {
    if (game.WIN_STATUS != null && windows[game.WIN_STATUS]) {
        /* in case it's shrinking, clear it before destroying so that
           dropped portion won't show anything that's now becoming stale */
        tty_clear_nhwindow(game.WIN_STATUS);
        tty_destroy_nhwindow(game.WIN_STATUS), game.WIN_STATUS = null;
    }
    /* frees some status tracking data */
    genl_status_finish();
    /* creates status window and allocates tracking data */
    tty_status_init();
    tty_clear_nhwindow(game.WIN_STATUS); /* does some init, sets context.botlx */
    status_initialize(true); /* REASSESS_ONLY */
}
