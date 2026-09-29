// C invent.c look_here: NHW_MENU putstr window and blocking display_nhwindow.
import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { build_window_screen, tty_window_offx, build_text_window_screen } from './com_pager.js';
import { force_more, _topl_more_pages, _topl_joins_snapshot, docrt_flags, flush_screen } from './display.js';

export async function displayLookWindow(lines) {
    const g = game;
    // display_nhwindow(WIN_MESSAGE, FALSE) acknowledges existing messages first.
    if (g._pending_message) {
        const live = g._pending_message;
        const snapshot = g._toplResultSnapshot;
        for (const page of _topl_more_pages(live, _topl_joins_snapshot(live) || undefined))
            if (page) await force_more(page);
        if (g._resultMessage != null && snapshot != null
            && String(g._resultMessage) === String(snapshot)
            && String(snapshot) === String(live)) {
            g._resultMessage = null;
            g._resultMessageJoins = null;
        }
    } else if (g._resultMessage) {
        const joins = g._resultMessageJoins?.src === g._resultMessage
            ? g._resultMessageJoins.joins : undefined;
        for (const page of _topl_more_pages(g._resultMessage, joins))
            if (page) await force_more(page);
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
            screenRows[page.length] = '--More--';
            let key;
            do {
                g._screen_output = screenRows.join('\n');
                if (g.nhDisplay) {
                    g.nhDisplay.cursorCol = 8;
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
    const underWindow = g._pending_message || g._topl_sticky || '';
    const screen = build_window_screen(windowLines, col, g.u.uac);
    for (;;) {
        g._screen_output = screen;
        if (g.nhDisplay) {
            g.nhDisplay.cursorCol = col + '--More--'.length;
            g.nhDisplay.cursorRow = windowLines.length - 1;
        }
        const key = await nhgetch();
        if (key === 32 || key === 10 || key === 13 || key === 27) break;
    }
    g._pending_message = '';
    // tty_dismiss_nhwindow repaints the map; row zero left of the window stays.
    if (underWindow) g._topl_sticky = underWindow;
}
