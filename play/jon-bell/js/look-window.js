// C invent.c look_here: NHW_MENU putstr window and blocking display_nhwindow.
import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { build_window_screen, tty_window_offx, build_text_window_screen, tty_text_window_utf8_line } from './com_pager.js';
import { force_more, _topl_more_pages, _topl_joins_snapshot, docrt_flags, flush_screen, docorner_blank_utf8_captures } from './display.js';

export async function displayLookWindow(lines) {
    const g = game;
    // display_nhwindow(WIN_MESSAGE, FALSE) acknowledges existing messages first.
    if (g._pending_message && g._topl_win_stop) {
        /* topl.c more():232-246 — WIN_STOP live: no key is read and the closing
         * tty_clear_nhwindow(WIN_MESSAGE) wipes the line an ESC's owner drew. */
        g._pending_message = '';
        g._topl_joins = [];
    } else if (g._pending_message) {
        const live = g._pending_message;
        let _start = 0;
        for (const page of _topl_more_pages(live, _topl_joins_snapshot(live) || undefined)) {
            g._moreFullCtx = { full: String(live), start: _start };
            _start += page.length + 2;
            try {
                if (page) await force_more(page);
            } finally {
                g._moreFullCtx = null;
            }
        }
        if (g._resultMessage != null) {
            g._resultMessage = null;
            g._resultMessageJoins = null;
        } else if (g._resultMessage && snapshot == null) {
            /* display_nhwindow(WIN_MESSAGE) acknowledged the whole topline and
             * the window's tty_clear_nhwindow(WIN_MESSAGE) wiped it: an earlier
             * command-result line (e.g. "You swap places with Hachi.", already
             * paged on its own --More--) must not rejoin the next message. */
            g._resultMessage = null;
            g._resultMessageJoins = null;
        }
    } else if (g._resultMessage) {
        const joins = g._resultMessageJoins?.src === g._resultMessage
            ? g._resultMessageJoins.joins : undefined;
        const full = String(g._resultMessage);
        let _start = 0;
        for (const page of _topl_more_pages(g._resultMessage, joins)) {
            g._moreFullCtx = { full, start: _start };
            _start += page.length + 2;
            try {
                if (page) await force_more(page);
            } finally {
                g._moreFullCtx = null;
            }
        }
        g._resultMessage = '';
        g._resultMessageJoins = null;
    }
    const fullscreen = lines.length >= 24 || g.iflags?.menu_overlay === false
        || g.iflags?.menu_overlay === 0;
    if (fullscreen) {
        // C process_text_window: MENU's final More follows the last item,
        // unlike TEXT's fixed bottom-row footer. Intermediate pages hold 23.
        for (let offset = 0; offset < Math.max(1, lines.length); offset += 23) {
            const page = lines.slice(offset, offset + 23);
            const screenRows = build_text_window_screen(page).split('\n');
            screenRows[23] = '';
            screenRows[page.length] = ' --More--'; /* tty_curs(window, 1, n) -> offx+1 */
            let key;
            do {
                g._screen_output = screenRows.join('\n');
                if (g.nhDisplay) {
                    g.nhDisplay.cursorCol = 9;
                    g.nhDisplay.cursorRow = page.length;
                }
                key = await nhgetch();
            } while (![32, 10, 13, 27].includes(key));
            if (key === 27) break;
        }
        docrt_flags(0);
        await flush_screen(1);
        return;
    }
    const windowLines = [...lines, '--More--'];
    const col = tty_window_offx(windowLines, 'more');
    /* C topl.c:257-301 buffers WIN_STOP messages without painting them.
     * Preserve the same physical topline build_window_screen uses; suppressed
     * text must not reappear when tty_dismiss_nhwindow restores the corner
     * (wintty.c:1983-2020). */
    const underWindow = (g._topl_win_stop ? '' : g._pending_message) || g._topl_sticky || '';
    /* C wintty.c:1943-1944 — a putstr NHW_MENU is painted by
     * process_text_window; the trailing "--More--" is dmore's, not a line. */
    const paintLines = windowLines.map((ln, i) =>
        (i === windowLines.length - 1 ? ln : tty_text_window_utf8_line(ln)));
    const screen = build_window_screen(paintLines, col, g.u.uac);
    for (;;) {
        g._screen_output = screen;
        if (g.nhDisplay) {
            g.nhDisplay.cursorCol = col + '--More--'.length;
            g.nhDisplay.cursorRow = windowLines.length - 1;
        }
        const key = await nhgetch();
        if (key === 32 || key === 10 || key === 13 || key === 27) break;
    }
    /* C wintty.c:982,3684-3687: dismissing the corner window clears
     * offx..79 through maxrow before row_refresh redraws the glyph buffer.
     * maxrow counts the putstr'd lines (wintty.c:2408-2409), and dmore's
     * --More-- sits on row maxrow itself, so docorner(offx, maxrow + 1)
     * stops at the --More-- row: `lines`, not windowLines, is maxrow. */
    docorner_blank_utf8_captures(col - 1, lines.length + 1);
    g._pending_message = '';
    // tty_dismiss_nhwindow repaints the map; row zero left of the window stays.
    if (underWindow) g._topl_sticky = underWindow;
}
