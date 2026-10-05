// @ts-nocheck
// tty_menu.js — the SHARED tty menu machinery.
//
// C ref: win/tty/wintty.c tty_start_menu (2519) / tty_add_menu (2559) /
// tty_end_menu (2649) / process_menu_window (1329), plus src/windows.c
// add_menu_str / add_menu_heading (1816).
//
// its own bespoke renderer and its own key loop: js/optmenu.js, js/skills.js,
// js/spell.js, js/coloratt.js, js/com_pager.js, js/cmd.js and
// js/pickup_container.js each re-derived pagination, accelerator assignment,
// the "(n of m)" footer and the footer cursor column by hand.  That is seven
// independent chances to get the same C function wrong, and the divergences
// place those rules live; new menus should be built on it, and the existing
// bespoke ones migrated onto it one at a time behind the score.
//
// Full-screen menus remain the default for existing callers. An overlay
// caller shares com_pager's C-derived geometry/map compositor; menustyle uses
// it with the status clipping left by the dismissed full options window.
// General multi-page overlay dismissal remains separate work.
import { game } from './gstate.js';
import { nhgetch } from './input.js';
/* C ref: wintty.c:1704 MENU_SEARCH → tty_getlin("Search for:", tmpbuf), and
 * :1714 pmatchi(searchbuf, curr->str) (strutil.c:151). */
import { menu_search_getlin, build_window_screen, tty_window_offx } from './com_pager.js';
import { pmatchi } from './strutil.js';

/* C ref: include/wintty.h — the tty is 24x80 (LI x CO). */
const LI = 24;
const CO = 80;

/* C ref: include/hack.h ATR_* */
export const ATR_NONE = 0;
export const ATR_INVERSE = 3;

/* C ref: include/wintty.h / include/winprocs.h */
export const PICK_NONE = 0;
export const PICK_ONE = 1;
export const PICK_ANY = 2;

const ESC_INVERSE = '\x1b[7m';
const ESC_RESET = '\x1b[0m';

// C ref: cmd.c set_cursor — record the tty cursor position after a window draw.
function set_cursor(col, row) {
    const disp = game?.nhDisplay;
    if (disp) { disp.cursorCol = col; disp.cursorRow = row; }
}

/**
 * One tty menu window.  Build it with the add_menu family and end_menu, run
 * select_menu() to display it and read the player's picks.
 *
 * C ref: struct WinDesc's menu fields (mlist / nitems / npages / plist /
 * morestr / maxrow), which this class stands in for.
 */
export class TtyMenu {
    constructor({ overlay = false, statusClipCol } = {}) {
        this.overlay = overlay;
        this.statusClipCol = statusClipCol;
        /* C: cw->mlist, but kept in correct order rather than reversed. */
        this.mlist = [];
        this.npages = 0;
        this.plist = [];      /* index of the first item of each page */
        this.morestr = '';
        this.maxrow = 0;
        this.how = PICK_NONE;
        this.cancelled = false;
    }

    /* C ref: src/windows.c add_menu_str — a non-selectable text line. */
    add_menu_str(str) {
        this.mlist.push({ aInt: 0, selector: 0, attr: ATR_NONE, str: String(str),
                          selected: false, count: -1 });
    }

    /* C ref: src/windows.c:1816 add_menu_heading — a non-selectable line drawn
     * with iflags.menu_headings, whose default is {NO_COLOR, ATR_INVERSE}
     * (options.c:2197 optfn_menu_headings). */
    add_menu_heading(str) {
        this.mlist.push({ aInt: 0, selector: 0, attr: ATR_INVERSE, str: String(str),
                          selected: false, count: -1 });
    }

    /* C ref: tty_add_menu.  `aInt` is anything.a_int; a non-zero identifier
     * makes the line selectable, and tty_add_menu prefixes it with "%c - "
     * using `ch` (or '?' when ch is 0 — end_menu overwrites str[0] with the
     * assigned accelerator later). */
    add_menu(aInt, ch, attr, str, skipinvert = false, preselected = false) {
        if (str === null || str === undefined) return;   /* C: str == 0 -> return */
        let s = String(str);
        if (aInt) s = `${ch ? ch : '?'} - ${s}`;
        this.mlist.push({ aInt, selector: ch || 0, attr: attr | 0, str: s,
                          selected: preselected, count: -1, skipinvert });
    }

    /**
     * C ref: tty_end_menu.  Prepends the prompt, computes the page boundaries
     * and assigns the per-page accelerators.
     */
    end_menu(prompt) {
        /* C: "Put the prompt at the beginning of the menu." — tty_add_menu
         * PREPENDS, so adding "" then the prompt yields [prompt, "", ...]. */
        if (prompt !== null && prompt !== undefined) {
            this.mlist.unshift({ aInt: 0, selector: 0, attr: ATR_INVERSE,
                                 str: String(prompt), selected: false, count: -1 });
            this.mlist.splice(1, 0, { aInt: 0, selector: 0, attr: ATR_NONE,
                                      str: '', selected: false, count: -1 });
        }
        /* C: lmax = min(52, ttyDisplay->rows - 1) — 52 is 'a'..'z','A'..'Z'. */
        const lmax = Math.min(52, LI - 1);
        this.lmax = lmax;
        const nitems = this.mlist.length;
        this.npages = Math.floor((nitems + (lmax - 1)) / lmax);
        this.plist = [];
        let menu_ch = 'a'.charCodeAt(0);
        for (let n = 0; n < nitems; n++) {
            const curr = this.mlist[n];
            if ((n % lmax) === 0) {
                menu_ch = 'a'.charCodeAt(0);
                this.plist[Math.floor(n / lmax)] = n;
            }
            if (curr.aInt && !curr.selector) {
                curr.selector = String.fromCharCode(menu_ch);
                curr.str = curr.selector + curr.str.slice(1);
                if (menu_ch === 'z'.charCodeAt(0)) menu_ch = 'A'.charCodeAt(0);
                else menu_ch++;
            }
            /* C: cut off any line that is too long (len = strlen + 2). */
            if (curr.str.length + 2 > CO) curr.str = curr.str.slice(0, CO - 2);
        }
        this.plist[this.npages] = nitems;
        /* C: npages > 1 -> morestr is rebuilt per page; else "(end) ". */
        this.msave = this.npages > 1 ? '' : '(end) ';
        this.maxrow = this.npages > 1 ? lmax + 1 : nitems + 1;
    }

    /* ── rendering ───────────────────────────────────────────────────────── */

    /* C ref: process_menu_window's page-draw loop.  Returns the array of
     * rendered lines for `page`, WITHOUT the footer. */
    _drawPage(page) {
        const from = this.plist[page], to = this.plist[page + 1];
        const lines = [];
        for (let i = from; i < to; i++) {
            const curr = this.mlist[i];
            /* C: putchar(' ') — the one-space left margin, drawn before any
             * attribute toggle, so the margin is never in reverse video. */
            let text = curr.str;
            /* C: at n == 2 a selected selectable line shows '*' (count == -1)
             * or '#'.  Note this is the REDRAW marker; set_item_state (used
             * when the selection happens on the displayed page) writes '+'
             * instead — see _setItemState. */
            if (curr.aInt && curr.selected)
                text = text.slice(0, 2) + (curr.count === -1 ? '*' : '#') + text.slice(3);
            /* C's menu loop advances curx once per byte; nomux_putch ignores
             * tabs (ch < 32). Encode that unpainted cell in the screen wire
             * format, leaving mlist.str intact for geometry and MENU_SEARCH. */
            text = text.replace(/\t/g, '\x1b[1C');
            if (curr.attr === ATR_INVERSE) lines.push(' ' + ESC_INVERSE + text + ESC_RESET);
            else lines.push(' ' + text);
        }
        return lines;
    }

    /* C ref: set_item_state — tty_curs(window, 4, lineno) then putchar of
     * '+' / '#' / '-'.  Column 4 is 1-based within the window, i.e. index 3 of
     * the rendered line (1 margin + str[2]). */
    _setItemState(lineIdx, curr) {
        const ch = curr.selected ? (curr.count === -1 ? '+' : '#') : '-';
        const l = this._lines[lineIdx];
        /* keep any leading escape untouched: selectable lines never carry one */
        /* a row the MENU_SEARCH getlin blanked is still painted at column 3
         * (tty_curs + putchar on an otherwise empty row) */
        this._lines[lineIdx] = l.padEnd(3).slice(0, 3) + ch + l.slice(4);
    }

    /* Publish the current frame and park the cursor where dmore() leaves it. */
    _publish() {
        game._screen_output = this._screenRows().join('\n');
        /* C: dmore -> tty_curs(BASE_WINDOW, curx + offset, cury) then
         * xputs(prompt); curx += strlen(prompt).  The footer text starts at
         * column 1 and the cursor ends one past it.  The redisplay-only branch
         * agrees: tty_curs(window, strlen(morestr) + 2, page_lines). */
        set_cursor((this.overlay ? this.contentCol : 1) + this.morestr.length, this._pageLines);
        game._pending_message = '';
    }

    _screenRows() {
        if (!this.overlay) return this._lines.slice(0, LI);
        return build_window_screen(this._lines.map(line => line.slice(1)), this.contentCol,
            undefined, this.statusClipCol).split('\n');
    }

    _renderPage(page) {
        this._lines = this._drawPage(page);
        this._pageLines = this._lines.length;
        this.morestr = this.npages > 1 ? `(${page + 1} of ${this.npages})` : this.msave;
        this._lines.push(' ' + this.morestr);
        if (this.overlay)
            this.contentCol = Math.max(1, tty_window_offx(this.mlist.map(c => c.str), 'end'));
        this._publish();
    }

    /* ── the key loop ────────────────────────────────────────────────────── */

    /**
     * C ref: tty_select_menu -> tty_display_nhwindow -> process_menu_window.
     * Returns { count, picks } where picks is the list of a_int values in menu
     * order, or { count: -1, picks: [] } when cancelled with ESC.
     */
    async select_menu(how) {
        this.how = how;
        this.cancelled = false;
        let curr_page = 0;
        let fresh = true;
        let finished = false;
        /* C wintty.c:1334-1399 counting/count/reset_count */
        let counting = false, count = 0, reset_count = true;

        while (!finished) {
            if (reset_count) { counting = false; count = 0; }
            else reset_count = true;
            if (fresh) { this._renderPage(curr_page); fresh = false; }
            else this._publish();

            const key = await nhgetch();
            const morc = String.fromCharCode(key);
            const from = this.plist[curr_page], to = this.plist[curr_page + 1];

            if (morc >= '0' && morc <= '9') {
                /* C wintty.c:1570-1602: digits build a count; leading zeros
                 * are ignored. */
                count = count * 10 + (key - 48);
                if (count !== 0) { counting = true; reset_count = false; }
            } else if (key === 27 && counting) {
                /* C: ESC only stops the count. */
            } else if (key === 27 /* '\033' */) {
                /* C: deselect everything, WIN_CANCELLED, finished. */
                for (const c of this.mlist) { c.selected = false; c.count = -1; }
                this.cancelled = true;
                finished = true;
            } else if (key === 0 || key === 10 || key === 13) {
                finished = true;                       /* commit */
            } else if (morc === ' ' || morc === '>') {
                /* C: MENU_NEXT_PAGE; ' ' also finishes on the last page,
                 * '>' deliberately does not. */
                if (this.npages > 0 && curr_page !== this.npages - 1) {
                    curr_page++; fresh = true;
                } else if (morc === ' ') finished = true;
            } else if (morc === '<') {
                if (this.npages > 0 && curr_page !== 0) { curr_page--; fresh = true; }
            } else if (morc === '^') {
                if (this.npages > 0 && curr_page !== 0) { curr_page = 0; fresh = true; }
            } else if (morc === '|') {
                if (this.npages > 0 && curr_page !== this.npages - 1) {
                    curr_page = this.npages - 1; fresh = true;
                }
            } else if (morc === ',' || morc === '\\' || morc === '~'
                       || morc === '.' || morc === '-' || morc === '@') {
                /* C wintty.c:1646-1695 — page/all select, unselect, invert.
                 * The *_PAGE forms repaint each changed in-view line through
                 * set_item_state; the *_ALL forms update the rest silently.
                 * PICK_ONE/PICK_NONE: select and invert are PICK_ANY-only. */
                const sel = (c) => { c.selected = true; };
                const uns = (c) => { c.selected = false; c.count = -1; };
                const inv = (c) => { if (c.selected) uns(c); else sel(c); };
                const op = (morc === ',' || morc === '.') ? sel
                    : (morc === '\\' || morc === '-') ? uns : inv;
                if (op !== uns && how !== PICK_ANY) continue;
                const all = morc === '.' || morc === '-' || morc === '@';
                for (let i = from; i < to; i++) {
                    const c = this.mlist[i];
                    if (!c.aInt) continue;
                    if (op === sel ? c.selected : (op === uns && !c.selected)) continue;
                    if (op !== uns && c.skipinvert && !c.selected) continue; /* menuitem_invert_test, menuinvertmode 1 */
                    op(c);
                    this._setItemState(i - from, c);
                }
                if (all)
                    for (let i = 0; i < this.mlist.length; i++) {
                        const c = this.mlist[i];
                        if (i >= from && i < to) continue;
                        if (!c.aInt) continue;
                        if (op === sel ? c.selected : (op === uns && !c.selected)) continue;
                        if (op !== uns && c.skipinvert && !c.selected) continue;
                        op(c);
                    }
            } else if (morc === ':') {
                /* C ref: wintty.c:1700-1730 MENU_SEARCH.  PICK_NONE bells and
                 * never opens the getlin; otherwise tty_getlin("Search for:")
                 * runs OVER this page (only screen row 0 is touched), the
                 * answer is wrapped "*%s*" and pmatchi'd against every
                 * SELECTABLE entry's stored str in mlist order — not just this
                 * page's — toggling each hit, and a PICK_ONE menu finishes at
                 * the first one.
                 *
                 * `lineno` walks exactly as C does (:1717-1722): it is
                 * incremented BEFORE the page_start test, so the first item of
                 * the current page has lineno 0, and only an in-view toggle
                 * repaints its state column via set_item_state. */
                if (how !== PICK_NONE) {
                    const answer = await menu_search_getlin(
                        () => this._screenRows());
                    /* C ref: getline.c:213 clear_nhwindow(WIN_MESSAGE) — row 0
                     * goes blank and the page is NOT repainted, so it stays
                     * blank until page_start is reset (a page change). */
                    if (this._lines.length) this._lines[0] = '';
                    if (answer && answer !== '\x1b') {
                        const searchbuf = `*${answer}*`;
                        const page_start = this.plist[curr_page];
                        const page_end = this.plist[curr_page + 1];
                        let on_curr_page = false, lineno = 0;
                        for (let i = 0; i < this.mlist.length; i++) {
                            if (on_curr_page) lineno++;
                            if (i === page_start) on_curr_page = true;
                            else if (i === page_end) on_curr_page = false;
                            const curr = this.mlist[i];
                            if (!curr.aInt || !pmatchi(searchbuf, curr.str)) continue;
                            /* C toggle_menu_curr with counting FALSE. */
                            if (curr.selected) { curr.selected = false; curr.count = -1; }
                            else curr.selected = true;
                            if (on_curr_page) this._setItemState(lineno, curr);
                            if (how === PICK_ONE) { finished = true; break; }
                        }
                    }
                }
            } else {
                /* C: find, toggle, and possibly update.  Only accelerators on
                 * the CURRENT page are accepted (page_start..page_end). */
                for (let i = from; i < to; i++) {
                    const curr = this.mlist[i];
                    if (curr.aInt && curr.selector === morc) {
                        // C toggle_menu_curr toggles this entry even in
                        // PICK_ONE; a preselected entry can remain alongside
                        // the new pick. The option handler resolves that pair.
                        /* C toggle_menu_curr(.., counting, count) */
                        if (curr.selected) {
                            if (counting && count > 0) curr.count = count;
                            else { curr.selected = false; curr.count = -1; }
                        } else if (counting && count > 0) {
                            curr.count = count; curr.selected = true;
                        } else if (!counting) curr.selected = true;
                        this._setItemState(i - from, curr);
                        if (how === PICK_ONE) finished = true;
                        break;
                    }
                }
            }
        }

        if (this.cancelled) return { count: -1, picks: [] };
        const picks = this.mlist.filter((c) => c.aInt && c.selected).map((c) => c.aInt);
        return { count: picks.length, picks };
    }
}
