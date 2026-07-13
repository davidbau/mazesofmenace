// getline.js — Line input and extended-command entry.
// C ref: win/tty/getline.c tty_getlin / tty_get_ext_cmd (partial).

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { flush_screen, flush_topl_more, pline } from './display.js';

/**
 * C ref: windows.c getlin → tty_getlin — prompt + echo until Enter/ESC.
 * Returns the buffer string ("" on empty Enter, "\033" on ESC with empty buf).
 */
export async function getlin(query) {
    await flush_topl_more();
    let buf = '';
    const paint = async () => {
        game._pending_message = `${query} ${buf}`;
        await flush_screen(1);
        const disp = game.nhDisplay;
        if (disp?.setCursor) {
            disp.setCursor((query.length + 1 + buf.length), 0);
        }
    };
    await paint();
    for (;;) {
        const c = await nhgetch();
        if (c === 27) { // ESC
            if (buf.length > 0) {
                buf = '';
                await paint();
                continue;
            }
            game._pending_message = '';
            return '\x1b';
        }
        if (c === 13 || c === 10) { // Enter
            game._pending_message = '';
            return buf;
        }
        if (c === 8 || c === 127) { // backspace / delete
            if (buf.length > 0) {
                buf = buf.slice(0, -1);
                await paint();
            }
            continue;
        }
        if (c >= 32 && c < 127 && buf.length < 78) {
            buf += String.fromCharCode(c);
            await paint();
        }
    }
}

/**
 * Minimal extended-command table (C extcmdlist subset).
 * Only AUTOCOMPLETE + available (wizard for WIZMODECMD) entries.
 */
const EXT_CMDS = [
    {
        name: 'levelchange',
        wiz: true,
        autocomplete: true,
        // lazy to avoid cycles
        run: async () => {
            const { wiz_level_change } = await import('./wizcmds.js');
            return wiz_level_change();
        },
    },
];

function wizardMode() {
    return !!(game.flags?.debug || game.flags?.wizard);
}

function availableExtCmds() {
    return EXT_CMDS.filter((ec) => !ec.wiz || wizardMode());
}

/** C ref: cmdline.c / getline.c ext_cmd_getlin_hook — unique prefix → expand */
function extCmdAutocomplete(base) {
    const matches = availableExtCmds().filter(
        (ec) => ec.autocomplete && ec.name.startsWith(base),
    );
    if (matches.length === 1) return matches[0].name;
    return null;
}

/**
 * C ref: getline.c tty_get_ext_cmd — '#' prompt with NEWAUTOCOMP hook.
 * Returns ext-cmd index or -1.
 *
 * Autocomplete expands the buffer but leaves the edit cursor after the
 * last typed character (C putsyms + backspace). The next key overwrites
 * from that point, truncating the prior expansion, then re-hooks.
 */
export async function get_ext_cmd() {
    await flush_topl_more();
    let buf = '';
    let cursor = 0; // index after last typed character
    const paint = async () => {
        // C hooked_tty_getlin("#", …) shows "# " + buffer (expanded name)
        game._pending_message = buf ? `# ${buf}` : '#';
        await flush_screen(1);
        const disp = game.nhDisplay;
        if (disp?.setCursor) {
            // Cursor after "# " + typed prefix (not end of expansion)
            disp.setCursor(2 + cursor, 0);
        }
    };
    await paint();
    for (;;) {
        const c = await nhgetch();
        if (c === 27) {
            if (buf.length > 0) {
                buf = '';
                cursor = 0;
                await paint();
                continue;
            }
            game._pending_message = '';
            return -1;
        }
        if (c === 13 || c === 10) break;
        if (c === 8 || c === 127) {
            if (cursor > 0) {
                buf = buf.slice(0, cursor - 1);
                cursor--;
                await paint();
            }
            continue;
        }
        if (c >= 32 && c < 127 && cursor < 78) {
            // C: *bufp = c; bufp[1] = 0; then hook may Strcpy full name
            buf = buf.slice(0, cursor) + String.fromCharCode(c);
            cursor++;
            const expanded = extCmdAutocomplete(buf);
            if (expanded) buf = expanded;
            await paint();
        }
    }
    game._pending_message = '';
    const name = buf.trim().toLowerCase();
    if (!name) return -1;
    const idx = availableExtCmds().findIndex((ec) => ec.name === name);
    if (idx < 0) {
        await pline(`#${buf}: unknown extended command.`);
        return -1;
    }
    return idx;
}

/** C ref: cmd.c doextcmd */
export async function doextcmd() {
    const idx = await get_ext_cmd();
    if (idx < 0) return;
    const ec = availableExtCmds()[idx];
    if (!ec) return;
    if (ec.wiz && !wizardMode()) {
        await pline(`That is a wizard-mode command.`);
        return;
    }
    await ec.run();
}
