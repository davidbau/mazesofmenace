// askname.js — Copyright splash + character-name prompt.
// C ref: win/tty/wintty.c tty_init_nhwindows (banner) + tty_askname;
//        src/role.c plnamesuffix() → askname() when plname[] empty.

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { NO_COLOR } from './terminal.js';
import {
    COPYRIGHT_BANNER_A,
    COPYRIGHT_BANNER_B,
    COPYRIGHT_BANNER_C,
    COPYRIGHT_BANNER_D,
    PL_NSIZ,
} from './const.js';

const WHO_ARE_YOU = 'Who are you? ';
const PROMPT_ROW = 12; // C: after splash cursor @11 + blank putstr → row 12

function put_line(disp, row, text) {
    for (let i = 0; i < (disp.cols || 80); i++) {
        const ch = i < text.length ? text[i] : ' ';
        disp.setCell(i, row, ch, NO_COLOR, 0);
    }
}

/**
 * Paint BASE_WINDOW cells only — do not call display.flush_screen().
 * C askname runs before map/botl exist; flush_screen would clearScreen and
 * rebuild from empty level + stub status, wiping the copyright banner.
 */
function paint_base() {
    const disp = game.nhDisplay;
    disp?.flush?.();
}

/**
 * C ref: wintty.c tty_init_nhwindows — copyright_banner_line(1..4) at row 4,
 *        then leave room above the askname / player-selection prompts.
 */
export async function show_copyright_splash() {
    const disp = game.nhDisplay;
    if (!disp) return;
    disp.clearScreen();
    const lines = [
        COPYRIGHT_BANNER_A,
        COPYRIGHT_BANNER_B,
        COPYRIGHT_BANNER_C,
        COPYRIGHT_BANNER_D,
    ];
    for (let i = 0; i < lines.length; i++) {
        put_line(disp, 4 + i, lines[i]);
    }
    paint_base();
}

function unix_name_char(c, ct) {
    // C ref: wintty.c tty_askname UNIX/VMS filter — non [-@A-Za-z0-9] → '_',
    //        digits rejected when ct==0.
    if (c === 45 || c === 64) return c; // '-' '@'
    if ((c >= 97 && c <= 122) || (c >= 65 && c <= 90)) return c;
    if (c >= 48 && c <= 57 && ct > 0) return c;
    return 95; // '_'
}

async function paint_who_prompt(buf, extraRowText = null) {
    const disp = game.nhDisplay;
    if (!disp) return;
    if (extraRowText != null) {
        put_line(disp, PROMPT_ROW - 1, extraRowText);
    }
    const line = WHO_ARE_YOU + buf;
    put_line(disp, PROMPT_ROW, line);
    // C: tty_curs(BASE, sizeof who_are_you, cury-1) then echo advances;
    //    sizeof includes NUL → 1-based col == WHO_ARE_YOU.length + 1 → 0-based
    //    index WHO_ARE_YOU.length for first typed char.
    disp.setCursor(WHO_ARE_YOU.length + buf.length, PROMPT_ROW);
    paint_base();
}

/**
 * C ref: wintty.c tty_askname — prompt on BASE_WINDOW until non-empty name.
 * Sets game.plname; marks iflags.renameallowed like C.
 */
export async function tty_askname() {
    const disp = game.nhDisplay;
    if (!disp) {
        game.plname = game.plname || 'Hero';
        return;
    }

    let tryct = 0;
    let plname = '';

    do {
        if (++tryct > 1) {
            if (tryct > 10) {
                throw new Error('Giving up after 10 tries.');
            }
            await paint_who_prompt('', 'Enter a name for your character...');
            // C erases previous prompt line before rewriting Who are you?
            put_line(disp, PROMPT_ROW, '');
        }

        plname = '';
        await paint_who_prompt(plname);

        for (;;) {
            const c = await nhgetch();
            if (c === 10 || c === 13) break;
            if (c === 27) { // ESC — clear and re-prompt
                plname = '';
                break;
            }
            if (c === 8 || c === 127) {
                if (plname.length > 0) {
                    plname = plname.slice(0, -1);
                    await paint_who_prompt(plname);
                }
                continue;
            }
            if (c < 32 || c >= 127) continue;
            const mapped = unix_name_char(c, plname.length);
            if (plname.length < PL_NSIZ - 1) {
                plname += String.fromCharCode(mapped);
                await paint_who_prompt(plname);
            }
        }
    } while (plname.length === 0);

    game.plname = plname;
    game.iflags = game.iflags || {};
    game.iflags.renameallowed = true;
}

/**
 * C ref: role.c plnamesuffix — askname when plname empty (no OPTIONS=name).
 * Splash is only needed when the prompt is shown (first captures are copyright).
 */
export async function askname_if_needed() {
    if (game.plname) return;
    await show_copyright_splash();
    await tty_askname();
}
