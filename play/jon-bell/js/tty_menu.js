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
import { menu_search_getlin, build_window_screen, tty_window_offx,
         _overlay_status_line } from './com_pager.js';
import { pmatchi } from './strutil.js';
import { NO_COLOR } from './terminal.js';

/* C ref: include/wintty.h — the tty is 24x80 (LI x CO). */
const LI = 24;
const CO = 80;

/* C ref: include/hack.h ATR_* */
export const ATR_NONE = 0;
export const ATR_INVERSE = 3;

/* C ref: wintty.c toggle_menu_attr for iflags.menu_headings (default
 * {NO_COLOR, ATR_INVERSE}, options.c:2197; the option parser stores
 * {color, attr} in tty SGR numbering).  Returns the SGR parameter list. */
export function menu_heading_sgr() {
    const mh = game.iflags?.menu_headings;
    if (!mh) return [7];
    const codes = [];
    if (mh.attr) codes.push(mh.attr);
    /* termcap.c:1010 hilites[CLR_GRAY] = nilstring: gray emits no SGR. */
    /* termcap.c:1013-1033: black uses bright black with darkgray enabled,
     * otherwise blue; it never uses the invisible ANSI black foreground. */
    if (mh.color === 0) codes.push((game.iflags?.wc2_darkgray ?? true) ? 90 : 34);
    else if (mh.color > 0 && mh.color < 7) codes.push(30 + mh.color);
    else if (mh.color > 8 && mh.color < 16) codes.push(90 + mh.color - 8); /* 8 is NO_COLOR */
    return codes;
}
/* putstr(win, iflags.menu_headings.attr, str) — attribute only, no colour
 * (o_init.c:824-843 disco headers). */
export function menu_heading_attr_text(str) {
    const mh = game.iflags?.menu_headings;
    const codes = mh ? (mh.attr ? [mh.attr] : []) : [7];
    return codes.length ? `\x1b[${codes.join(';')}m${str}\x1b[0m` : str;
}
/* Wrap a heading string in menu_headings' SGR pair. */
export function menu_heading_text(str) {
    const sgr = menu_heading_sgr();
    return sgr.length ? `\x1b[${sgr.join(';')}m${str}\x1b[0m` : str;
}

/* C ref: include/wintty.h / include/winprocs.h */
export const PICK_NONE = 0;
export const PICK_ONE = 1;
export const PICK_ANY = 2;

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
    constructor({ overlay = false, statusClipCol, baseWindow = false } = {}) {
        this.overlay = overlay;
        this.baseWindow = baseWindow;
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
        this.add_menu(0, 0, ATR_NONE, str);
    }

    add_menu_heading(str) {
        const gameover = !!(game && game.program_state && game.program_state.gameover);
        this.mlist.push({ aInt: 0, selector: 0, attr: gameover ? ATR_NONE : ATR_INVERSE,
                          str: String(str), selected: false, count: -1, heading: true });
    }

    /* C ref: tty_add_menu.  `aInt` is anything.a_int; a non-zero identifier
     * makes the line selectable, and tty_add_menu prefixes it with "%c - "
     * using `ch` (or '?' when ch is 0 — end_menu overwrites str[0] with the
     * assigned accelerator later). */
    add_menu(aInt, ch, attr, str, skipinvert = false, preselected = false) {
        if (str === null || str === undefined) return;   /* C: str == 0 -> return */
        let s = String(str);
        // C windows.c:1803-1806: match before tty adds the selector prefix.
        const menuColor = game.iflags.use_menu_color
            ? game.menu_colorings?.find(mc => mc.match.test(s)) : null;
        if (aInt) s = `${ch ? ch : '?'} - ${s}`;
        this.mlist.push({ aInt, selector: ch || 0, attr: attr | 0, str: s, menuColor,
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
                                 str: String(prompt), selected: false, count: -1, heading: true });
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
            // C wintty.c:1441-1489: leave the margin and selector unstyled.
            const attr_n = /^. [-+#*] /.test(curr.str) ? 4 : 0;
            const mc = curr.menuColor;
            const sgr = mc ? [mc.attr || '', (mc.color === NO_COLOR || mc.color === 7) ? ''
                : mc.color < 8 ? 30 + mc.color : 90 + mc.color - 8].filter(Boolean)
                : curr.attr === ATR_INVERSE ? (curr.heading ? menu_heading_sgr() : [7])
                : curr.sgr || [];
            /* A run of more than four spaces inside reverse video reaches the
             * recorded terminal as cursor-forward (same rule as the status
             * bar's title bar, display.js ESC[<n>C), so those cells are
             * unpainted: #wizcustom's heading records "identifier\e[29Csym". */
            const gapped = (curr.attr === ATR_INVERSE || mc)
                ? text.slice(attr_n).replace(/ {5,}/g, m => `\x1b[${m.length}C`)
                : text.slice(attr_n);
            if (sgr.length) text = text.slice(0, attr_n)
                + `\x1b[${sgr.join(';')}m` + gapped + ESC_RESET;
            lines.push(' ' + text);
        }
        return lines;
    }

    /* C ref: set_item_state — tty_curs(window, 4, lineno) then putchar of
     * '+' / '#' / '-'.  Column 4 is 1-based within the window, i.e. index 3 of
     * the rendered line (1 margin + str[2]). */
    _setItemState(lineIdx, curr) {
        const ch = curr.selected ? (curr.count === -1 ? '+' : '#') : '-';
        const l = this._lines[lineIdx];
        /* a row the MENU_SEARCH getlin blanked is still painted at column 3
         * (tty_curs + putchar on an otherwise empty row) */
        /* C wintty.c:1186-1193: the indicator is drawn with the item's own
         * attr/color (a menucolor match applies to it too). */
        const mc = curr.menuColor;
        const sgr = mc ? [mc.attr || '', (mc.color === NO_COLOR || mc.color === 7) ? ''
            : mc.color < 8 ? 30 + mc.color : 90 + mc.color - 8].filter(Boolean)
            : curr.attr === ATR_INVERSE ? [7] : curr.sgr || [];
        const cell = sgr.length ? `\x1b[${sgr.join(';')}m${ch}${ESC_RESET}` : ch;
        /* C overwrites one terminal cell, not one byte. A previous update
         * may have wrapped this marker in SGR; replace that whole cell so
         * toggling a styled item again preserves the following text. */
        const tail = l.slice(3).replace(/^(?:\x1b\[[0-9;]*m)*.(?:\x1b\[0m)?/, '');
        this._lines[lineIdx] = l.padEnd(3).slice(0, 3) + cell + tail;
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
        if (this.baseWindow) return this._lines.map(line => this.overlay
            ? ' '.repeat(this.contentCol) + line.slice(1) : line);
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
        /* C wintty.c:1925-1937 tty_display_nhwindow: !menu_overlay forces
         * offx 0 for every menu, clearing the screen and using docrt on
         * dismissal even when the menu would otherwise fit in a corner. */
        if (game.iflags?.menu_overlay === false || game.iflags?.menu_overlay === 0)
            this.overlay = false;
        this.how = how;
        this.cancelled = false;
        /* C wintty.c:1923-1935 tty_display_nhwindow: `!iflags.menu_overlay`
         * forces cw->offx = 0 and clears the screen, so an overlay caller's
         * corner menu is drawn full-screen (and erase_menu_or_text then
         * docrt()s on dismissal). */
        if (this.overlay && (game.iflags?.menu_overlay === false
                             || game.iflags?.menu_overlay === 0))
            this.overlay = false;
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
            const group = how === PICK_ONE && !this.mlist.slice(from, to).some(c => c.aInt && c.selector === morc) && this.mlist.find(c => c.groupSelector === morc);
            if (group) {
                group.selected = !group.selected;
                finished = true; continue;
            }

            /* C ref: wintty.c:1519-1535,1553 + getline.c:230-257 xwaitforspace(resp)
             * -- a key outside resp (item selectors, ' ', digits, ESC, \n, \r,
             * default_menu_cmds) rings the bell and is re-read INSIDE the wait,
             * so the while loop never turns over and a live count survives it
             * ("n90s" then ESC only stops the count; the second ESC cancels).
             * Group accelerators are not modelled (no menu here builds any). */
            if (key !== 10 && key !== 13 && key !== 27 && key !== 0
                && morc !== ' ' && !(morc >= '0' && morc <= '9')
                && '<>^|,\\~.-@:'.indexOf(morc) < 0
                && !this.mlist.slice(from, to).some((c) => c.aInt && c.selector === morc)) {
                reset_count = false;
                continue;
            }

            /* C wintty.c:1556-1562: a current-page item selector is an EXPLICIT
             * choice even when it is a digit (menu_objsyms uses '0'..'5'). */
            if (morc >= '0' && morc <= '9'
                && !this.mlist.slice(from, to).some((c) => c.aInt && c.selector === morc)) {
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
                    /* docorner(1, cury + 1, 0): wrapped prompt rows revert to the map */
                    for (let r = 1; r <= (game._menu_search_wrapped | 0) && r < this._lines.length; r++)
                        this._lines[r] = '';
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
                    if (how !== PICK_NONE && curr.aInt && curr.selector === morc) {
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

        if (!this.overlay && !this.baseWindow) {
            const { docrt, flush_screen, status_r1_menu_docrt } = await import('./display.js');
            /* windows.c:1859-1863: select_menu() holds gb.bot_disabled over
             * the whole tty_select_menu, docrt() included, so a pline raised
             * by docrt's redraw pages over blank status rows. */
            const oldBotDisabled = game._bot_disabled;
            game._bot_disabled = true;
            /* docrt's cls() blanks the status rows; bot() is disabled. */
            game._statusBlankAfterDocrt = true;
            try {
                await docrt();
                /* wintty.c:978-979 flushes the map before select_menu() restores
                 * bot processing (windows.c:1861-1863). Consume its pending glyphs
                 * now, so the next bot() paints over the already printed map. */
                await flush_screen(1);
            } finally {
                game._bot_disabled = oldBotDisabled;
            }
            /* docrt's seen-stone row-20 blanks precede the botlx bot() that
             * rewrites status row 1, so they do not wipe it (cmd.js
             * _dismissMenu's same ordering). */
            status_r1_menu_docrt();
            /* same row-1 ordering as cmd.js _dismissMenu: the botlx bot()
             * rewrites status row 1 over docrt's map row 20 cells */
            game._r1botAfterMap = game.level;
            game._r1textOver = true;
            game._statusBlankAfterDocrt = true;
            if (game.disp) game.disp.botlx = 1;
        }
        /* wintty.c:3684 docorner(offx, ...) repaints map cells from offx on, in the
         * rows the dismissed window covered, with the live use_color. */
        if (this.overlay && !this.baseWindow) {
            /* wintty.c:982,3684-3688: docorner erases row 0 from offx-1,
             * leaving only the prefix of an EMPTY message window's residue.
             * Its logical EMPTY state survives dismissal and further input. */
            if (game._topl_empty_sticky
                && game._topl_sticky === game._topl_empty_sticky) {
                game._topl_sticky = game._topl_sticky.slice(0,
                    Math.max(0, this.contentCol - 2)).trimEnd();
                game._topl_empty_sticky = game._topl_sticky;
            }
            const prev = game._gm_corner;
            game._gm_corner = { col: Math.min(this.contentCol, prev?.col ?? Infinity),
                                rows: Math.max(this._lines.length, prev?.rows ?? 0) };
            const { docorner_blank_utf8_captures, docorner_status_rows } = await import('./display.js');
            docorner_blank_utf8_captures(this.contentCol - 1, this.maxrow + 1);
            docorner_status_rows(this.contentCol - 1, this.maxrow + 1);
            const { _threeStatusLines } = await import('./display.js');
            const statusOffy = LI - (_threeStatusLines() ? 3 : 2);
            if (this.maxrow + 1 >= statusOffy && game.disp) {
                game.disp.botlx = 1;
                /* With that bot() a no-op, the status rows docorner() cl_end()ed
                 * from offx (wintty.c:3685-3688) stay cut on the terminal until
                 * the next paint; a getlin raised before it (show_overview's
                 * query_annotation, dungeon.c:3336) shows them so. */
                const rows = String(game._screen_output ?? '').split('\n');
                for (let y = statusOffy; y < Math.min(this.maxrow + 1, LI, rows.length); y++)
                    rows[y] = _overlay_status_line(rows[y], Math.max(0, this.contentCol - 2), '')
                        .replace(/(?: |\x1b\[\d+C)+$/, '');
                if (rows.length >= LI) game._screen_output = rows.join('\n');
            }
        } else game._gm_corner = undefined;
        /* erase_menu_or_text repaints the rows the window covered (wintty.c:966-983)
         * with the symset handling live at dismissal. */
        if (game._decStaleFrom != null)
            game._decStaleFrom = Math.max(game._decStaleFrom, this._lines.length + 1);
        if (this.cancelled) return { count: -1, picks: [] };
        const picks = this.mlist.filter((c) => c.aInt && c.selected).map((c) => c.aInt);
        return { count: picks.length, picks };
    }
}
