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
import { TOPLINE_EMPTY, TOPLINE_NEED_MORE, more } from './../display.js';
import { tty_clear_nhwindow_message } from './../display.js';
import { nhgetch } from './../input.js';
import { NO_COLOR, ATR_INVERSE as TERM_INVERSE, ATR_BOLD as TERM_BOLD,
         ATR_UNDERLINE as TERM_UNDERLINE } from './../terminal.js';
import { MENU_ITEMFLAGS_NONE, MENU_ITEMFLAGS_SELECTED } from './../const.js';

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

export function tty_putstr_base(str) {
    const display = game?.nhDisplay;
    if (!display) return;
    const s = String(str ?? '');
    for (let i = 0, col = 0; col < COLS; i++, col++)
        display.setCell(col, base.cury, i < s.length ? s[i] : ' ', NO_COLOR, 0);
    base.curx = 0;
    base.cury++;
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

    cw.nitems = (cw.nitems | 0) + 1;
    let newstr = String(str);
    if (identifier)
        newstr = `${ch ? ch : '?'} - ${newstr}`;

    const item = {
        identifier,
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
    let offx = (cw.type === NHW_TEXT)
             ? 0
             : Math.min(Math.min(82, Math.floor(COLS / 2)),
                        COLS - cw.maxcol - 1);
    if (offx < 0) offx = 0;
    if (cw.type === NHW_MENU) cw.offy = 0;

    /* a window taller than the display cannot overlay; it takes the screen */
    if (cw.maxrow >= ROWS) offx = 0;
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
        let col = cw.offx + ((cw.type === NHW_MENU) ? 1 : (cw.offx ? 1 : 0));
        /* win/tty/wintty.c positions with tty_curs(window, 1, n), and window
           column 1 is ABSOLUTE column offx — so the leading space a menu emits
           lands ON offx and the text starts at offx + 1. Starting the paint at
           offx + 1 left column offx untouched, which is why the map bled
           through beside the legacy window on 32 of the 44 sessions. */
        for (let c = cw.offx; c < col; c++)
            display.setCell(c, row, ' ', NO_COLOR, 0);
        const attr = term_attr((cw.attrs || [])[start + n] | 0);
        for (let i = 0; i < line.length && col < COLS; i++, col++)
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
            const ch = (i === 2 && item.identifier && item.selected)
                       ? (item.count === -1 ? '*' : '#') : s[i];
            display.setCell(col, row, ch, NO_COLOR, on);
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
export async function tty_display_nhwindow(window) {
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
       tip window waits behind it. */
    if (game._toplin === TOPLINE_NEED_MORE)
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

// Advance to the next page; returns false when the window is done.
// win/tty/wintty.c tty_select_menu() — display the menu and run the key loop.
//
// PICK_ONE subset: an accelerator (or group accelerator) picks its entry and
// returns immediately; ESC cancels with no picks; space and return finish
// (advancing the page first on a multi-page menu). Counts, PICK_ANY
// toggling and menu search are not reached by any ported caller yet.
// Returns the identifiers of the picked entries, so the C's
// `select_menu(...) > 0` test becomes `.length > 0`.
export async function tty_select_menu(window, how) {
    const cw = windows[window];
    if (!cw) return [];
    await tty_display_nhwindow(window);
    const picks = [];
    for (;;) {
        const c = await nhgetch();
        if (c === 27) {                      /* ESC — cancel */
            cw.cancelled = true;
            return [];
        }
        if (c === 32 || c === 13 || c === 10) {  /* space / return */
            if (tty_next_page(window))
                continue;
            return picks;
        }
        const ch = String.fromCharCode(c);
        let hit = false;
        for (let it = cw.mlist; it; it = it.next) {
            if (it.identifier && (it.selector === ch || it.gselector === ch)) {
                picks.push(it.identifier);
                hit = true;
                break;
            }
        }
        if (hit)
            return picks;                    /* PICK_ONE: first hit wins */
        /* unrecognised key: C beeps and keeps reading */
    }
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
// occupied. The C also refreshes the map underneath; during role selection the
// glyph buffer is empty, so blanking is all of it.
function docorner(xmin, ymax, display) {
    let y = 0;
    for (; y < Math.min(ymax, ROWS); y++) {
        /* the C moves the BASE_WINDOW cursor once per row, and the position it
           is left in is what the NEXT tty_putstr(BASE_WINDOW) writes over. A
           second "Who are you?" after 'a' on the confirmation menu lands on the
           row below the dismissed menu because of exactly this. */
        tty_curs_base(xmin, y);
        for (let x = xmin; x < COLS; x++)
            display.setCell(x, y, ' ', NO_COLOR, 0);
    }
}

// win/tty/wintty.c erase_menu_or_text()
function erase_menu_or_text(cw, display, clear) {
    if (cw.offx === 0) {
        if (clear) display.clearScreen();
        /* else docrt(), which is the caller's business */
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
