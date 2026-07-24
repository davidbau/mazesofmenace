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
import { NO_COLOR } from './../terminal.js';

// include/wintype.h
export const NHW_MESSAGE = 1, NHW_STATUS = 2, NHW_MAP = 3,
             NHW_MENU = 4, NHW_TEXT = 5;

// include/wintty.h — the default --More-- prompt.
const defmorestr = '--More--';

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
        data: [],       // one string per line
        morestr: '',
        npages: 0,
        cancelled: false,
    };
    windows[win.id] = win;
    return win.id;
}

export function tty_get_nhwindow(window) {
    return windows[window];
}

// win/tty/wintty.c tty_destroy_nhwindow()
export function tty_destroy_nhwindow(window) {
    delete windows[window];
}

// win/tty/wintty.c tty_clear_nhwindow() — for menu/text windows this drops the
// accumulated lines.
export function tty_clear_nhwindow(window) {
    const cw = windows[window];
    if (!cw) return;
    if (cw.type === NHW_MENU || cw.type === NHW_TEXT) {
        cw.data = [];
        cw.maxrow = 0;
        cw.maxcol = 0;
    }
}

// win/tty/wintty.c tty_putstr() — menu/text path.
export function tty_putstr(window, attr, str) {
    const cw = windows[window];
    if (!cw) return;
    const s = String(str ?? '');
    cw.data.push(s);
    cw.maxrow = cw.data.length;

    /* win/tty/wintty.c tty_end_menu:
         len = strlen(curr->str) + 2;   -- extra space at beg & end
         if (len > cw->cols) cw->cols = len;
       That +2 is what puts the inventory menu at column 32 rather than 33:
       offx = 80 - (46 + 2) - 1 = 31, then the leading space sits at 31 and the
       text starts at 32. */
    const len = Math.min(s.length + 2, COLS);
    if (len > cw.maxcol) cw.maxcol = len;
}

// win/tty/wintty.c:1898-1917 — where the window sits horizontally.
function compute_offx(cw) {
    /* NHW_TEXT forces full-screen mode */
    const maxcol = (cw.type === NHW_TEXT) ? COLS : cw.maxcol;

    let offx = Math.max(10, COLS - maxcol - 1);
    if (offx < 0) offx = 0;
    if (cw.type === NHW_MENU) cw.offy = 0;

    /* offx == 10 means the window is too wide to overlay, so it takes the
       whole screen; likewise anything taller than the display. */
    if (offx === 10 || cw.maxrow >= ROWS) offx = 0;
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

    display.clearScreen();

    lines.forEach((line, n) => {
        const row = cw.offy + n;
        /* C emits a leading space before the text when the window is inset */
        let col = cw.offx + (cw.offx ? 1 : 0);
        for (let i = 0; i < line.length && col < COLS; i++, col++)
            display.setCell(col, row, line[i], NO_COLOR, 0);
    });

    /* win/tty/wintty.c: "(end) " carries a trailing space, the paging form
       does not. That one space is the difference between the cursor landing on
       column 38 and column 37 for seed8000's inventory frame. */
    cw.morestr = (cw.npages > 1)
        ? `(${page + 1} of ${cw.npages})`
        : '(end) ';

    /* win/tty/wintty.c dmore():
         int offset = (cw->type == NHW_TEXT) ? 1 : 2;
         tty_curs(BASE_WINDOW, ttyDisplay->curx + offset, ...);
       curx is offx after the preceding tty_curs(window, 1, n), so the footer
       starts one column right of the window edge. */
    const footerRow = cw.offy + lines.length;
    let col = cw.offx + 1;
    for (let i = 0; i < cw.morestr.length && col < COLS; i++, col++)
        display.setCell(col, footerRow, cw.morestr[i], NO_COLOR, 0);

    /* win/tty/wintty.c:1548 — tty_curs(window, strlen(morestr) + 2, page_lines)
       and tty_curs offsets x by offx, so the cursor lands here. */
    display.setCursor(cw.offx + cw.morestr.length + 1, footerRow);

    return lines.length;
}

// win/tty/wintty.c tty_display_nhwindow() — menu/text case.
// Renders the first page. Paging on subsequent keys is driven by the caller
// consuming keys, matching how C's dmore() blocks inside the window.
export function tty_display_nhwindow(window) {
    const cw = windows[window];
    const display = game?.nhDisplay;
    if (!cw || !display) return;

    cw.active = 1;
    cw.offx = compute_offx(cw);

    const cap = page_capacity(cw);
    cw.npages = Math.max(1, Math.ceil(cw.data.length / cap));
    cw.curr_page = 0;

    render_page(cw, 0, display);
}

// Advance to the next page; returns false when the window is done.
export function tty_next_page(window) {
    const cw = windows[window];
    const display = game?.nhDisplay;
    if (!cw || !display) return false;
    if (cw.curr_page + 1 >= cw.npages) return false;
    cw.curr_page++;
    render_page(cw, cw.curr_page, display);
    return true;
}

export function reset_windows() {
    windows = [];
    nextWinId = 1;
}
