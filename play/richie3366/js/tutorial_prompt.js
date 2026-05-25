// tutorial_prompt.js — Tutorial yes/no when special level tut-1 exists.
// C ref: options.c ask_do_tutorial() (NHW_MENU + select_menu(PICK_ONE) loop).

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { flush_screen, clearPendingMessageAndToplineLikeC, docrt } from './display.js';
import { findAc } from './u_init_find_ac.js';
import { NO_COLOR } from './terminal.js';

const MENU_COL = 21;
const TTY_COLS = 80;

/**
 * C: wintty.c tty_end_menu — menu width drives cw->cols; offx = max(10, cols - maxcol - 1).
 * @returns {number}
 */
export function tutorialMenuOffxLikeC() {
    const hint = tutorialSkipQueryHintLineLikeC();
    const lines = [
        '',
        'y - Yes, do a tutorial',
        'n - No, just start play',
        '',
        hint,
        '(end)',
        "(Please choose 'y' or 'n'.)",
    ];
    let maxcol = 0;
    for (const s of lines) maxcol = Math.max(maxcol, s.length + 2);
    return Math.max(10, TTY_COLS - maxcol - 1);
}

/**
 * C: wintty.c process_menu_window — rows that get cl_end() when cw->offx > 0.
 * @param {number} pass
 * @returns {readonly number[]}
 */
export function tutorialMenuBlankRowsLikeC(pass) {
    /* C: process_menu_window page_lines — not row 0 (toplin prompt) or status rows. */
    const rows = [2, 3, 4, 5, 6];
    if ((pass | 0) > 0) rows.push(17);
    return rows;
}

/**
 * C: options.c config-file hint (tty **`seed0077`** records **`.nethackrc`** basename).
 * @returns {string}
 */
export function tutorialSkipQueryHintLineLikeC() {
    return 'Put "OPTIONS=!tutorial" in .nethackrc to skip this query.';
}

/**
 * C: options.c **`ask_do_tutorial`** — tty menu rows at column **21** (map stays visible).
 * @param {import('./game_display.js').GameDisplay} disp
 * @param {number} pass — re-prompt pass (invalid choice)
 */
export function paintTutorialMenuOverlayLikeC(disp, pass) {
    const hint = tutorialSkipQueryHintLineLikeC();
    game._pending_message = `\x1b[${MENU_COL}C\x1b[7mDo you want a tutorial?\x1b[0m`;
    disp.putstr(MENU_COL, 2, 'y - Yes, do a tutorial', NO_COLOR, 0);
    disp.putstr(MENU_COL, 3, 'n - No, just start play', NO_COLOR, 0);
    disp.putstr(MENU_COL, 5, hint, NO_COLOR, 0);
    if ((pass | 0) > 0) {
        disp.putstr(MENU_COL, 17, "(Please choose 'y' or 'n'.)", NO_COLOR, 0);
    }
    disp.putstr(MENU_COL, 6, '(end)', NO_COLOR, 0);
}

/**
 * C: options.c **`ask_do_tutorial`** — tty menu rows at column **21** (map stays visible).
 * @param {import('./game_display.js').GameDisplay} disp
 * @returns {Promise<boolean>} true → tutorial, false → skip or ESC
 */
export async function askDoTutorialMenuTTYLikeC(disp) {
    /* C: first key dismisses welcome `--More--` before tutorial menu paints. */
    if (game._toplineNeedMore) await nhgetch();
    const g = game;
    g._tutorialMenuActive = true;
    clearPendingMessageAndToplineLikeC();
    for (let pass = 0; ; pass++) {
        g._tutorialMenuPass = pass;
        paintTutorialMenuOverlayLikeC(disp, pass);
        await flush_screen(1);
        const k = await nhgetch();
        if (k === 27) break;
        if (k === 121 || k === 89) {
            g._tutorialMenuActive = false;
            delete g._tutorialMenuPass;
            clearPendingMessageAndToplineLikeC();
            /* C: find_ac then flush_screen → bot() when disp.botl. */
            findAc(g);
            await flush_screen(1);
            await docrt();
            return true;
        }
        if (k === 110 || k === 78) break;
    }
    g._tutorialMenuActive = false;
    delete g._tutorialMenuPass;
    clearPendingMessageAndToplineLikeC();
    findAc(g);
    await flush_screen(1);
    await docrt();
    return false;
}
