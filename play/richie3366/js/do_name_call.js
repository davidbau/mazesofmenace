// do_name_call.js — `#call` / `#name` (do_name.c docallcmd tty menu subset).
// C ref: do_name.c docallcmd — NHW_MENU + select_menu(PICK_ONE); ESC → ch 'q'.

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import {
    flush_screen, clearPendingMessageAndToplineLikeC, docrt_flags, docrtRefresh,
} from './display.js';
import { NO_COLOR, ATR_INVERSE } from './terminal.js';

/** C: tty_end_menu offx = max(10, cols - maxcol - 1); maxcol 48 → 31. Text at offx+1. */
export const DOCALL_MENU_OFFX = 31;
export const DOCALL_MENU_COL = 32;

export const DOCALL_PROMPT = 'What do you want to name?';

/** C: do_name.c docallcmd menu rows (gi.invent non-null). */
const DOCALL_MENU_ROWS = [
    { sel: 'm', line: 'm - a monster' },
    { sel: 'i', line: 'i - a particular object in inventory' },
    { sel: 'o', line: 'o - the type of an object in inventory' },
    { sel: 'f', line: 'f - the type of an object upon the floor' },
    { sel: 'd', line: 'd - the type of an object on discoveries list' },
    { sel: 'a', line: 'a - record an annotation for the current level' },
];

/**
 * C: wintty.c process_menu_window — prompt on WIN_MESSAGE row 0; items at offx rows 2+.
 * @param {import('./game_display.js').GameDisplay} disp
 */
export function paintDocallMenuOverlayLikeC(disp) {
    const col = DOCALL_MENU_COL;
    const offx = DOCALL_MENU_OFFX;
    game._pending_message = '';
    disp.putstr(col, 0, DOCALL_PROMPT, NO_COLOR, ATR_INVERSE);
    for (let i = 0; i < DOCALL_MENU_ROWS.length; i++) {
        const row = 2 + i;
        for (let c = offx; c < 80; c++) disp.setCell(c, row, ' ', NO_COLOR, 0);
        disp.setCell(offx, row, ' ', NO_COLOR, 0);
        disp.putstr(col, row, DOCALL_MENU_ROWS[i].line, NO_COLOR, 0);
    }
    for (let c = offx; c < 80; c++) disp.setCell(c, 8, ' ', NO_COLOR, 0);
    disp.setCell(offx, 8, ' ', NO_COLOR, 0);
    disp.putstr(col, 8, '(end)', NO_COLOR, 0);
}

/**
 * C: do_name.c docallcmd — show menu; ESC / cancel → ECMD_OK without naming.
 * @param {typeof game} g
 */
export async function runDocallcmdExtcmdFlowLikeC(g = game) {
    g._docallMenuActive = true;
    clearPendingMessageAndToplineLikeC();
    await flush_screen(1);

    const k = await nhgetch();
    g._docallMenuActive = false;
    clearPendingMessageAndToplineLikeC();

    if (k === 27) {
        await flush_screen(1);
        return;
    }

    const ch = String.fromCharCode(k).toLowerCase();
    if (ch === 'q') {
        await flush_screen(1);
        return;
    }

    /* Sub-commands (do_mgivenname, getobj, …) not ported — treat as cancel for now. */
    await flush_screen(1);
    await docrt_flags(docrtRefresh);
}
