// getline.js — Line input and extended-command entry.
// C ref: win/tty/getline.c tty_getlin / tty_get_ext_cmd (partial).

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { flush_screen, flush_topl_more, pline } from './display.js';
import { COLNO } from './const.js';

/**
 * C ref: topl.c topl_putsym — before writing when curx == CO-1, emit `\n`
 * (curx=0, cury++). Paint getlin/extcmd echo the same way so long prompts
 * wrap onto message row 1 instead of stopping at column 80.
 * @returns {{ text: string, col: number, row: number }}
 */
function topl_wrap_echo(str, nChars) {
    const CO = game?.nhDisplay?.cols || COLNO;
    let text = '';
    let curx = 0;
    let cury = 0;
    for (let i = 0; i < str.length; i++) {
        if (curx === CO - 1) {
            text += '\n';
            curx = 0;
            cury++;
        }
        text += str[i];
        curx++;
    }
    let col = 0;
    let row = 0;
    for (let i = 0; i < nChars; i++) {
        if (col === CO - 1) {
            col = 0;
            row++;
        }
        col++;
    }
    return { text, col, row };
}

/**
 * C ref: windows.c getlin → tty_getlin — prompt + echo until Enter/ESC.
 * Returns the buffer string ("" on empty Enter, "\033" on ESC with empty buf).
 */
export async function getlin(query) {
    await flush_topl_more();
    let buf = '';
    const paint = async () => {
        const raw = `${query} ${buf}`;
        const { text, col, row } = topl_wrap_echo(
            raw,
            query.length + 1 + buf.length,
        );
        game._pending_message = text;
        await flush_screen(1);
        const disp = game.nhDisplay;
        if (disp?.setCursor) disp.setCursor(col, row);
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
        // C: bufp - obufp < BUFSZ-1 && bufp - obufp < COLNO
        if (c >= 32 && c < 127 && buf.length < COLNO) {
            buf += String.fromCharCode(c);
            await paint();
        }
    }
}

/**
 * C ref: cmd.c extcmdlist — every AUTOCOMPLETE entry (excl. CMD_NOT_AVAILABLE /
 * INTERNALCMD). Used only for NEWAUTOCOMP uniqueness in ext_cmd_getlin_hook;
 * runnable bodies stay in EXT_CMDS below. Incomplete runners must not shrink
 * this set or prefixes like "c" falsely unique-match "chat".
 */
const EXT_CMD_AC = [
    { name: '?', wiz: false },
    { name: 'adjust', wiz: false },
    { name: 'annotate', wiz: false },
    { name: 'chat', wiz: false },
    { name: 'chronicle', wiz: false },
    { name: 'conduct', wiz: false },
    { name: 'dip', wiz: false },
    { name: 'enhance', wiz: false },
    { name: 'force', wiz: false },
    { name: 'genocided', wiz: false },
    { name: 'herecmdmenu', wiz: false },
    { name: 'history', wiz: false },
    { name: 'invoke', wiz: false },
    { name: 'jump', wiz: false },
    { name: 'levelchange', wiz: true },
    { name: 'lightsources', wiz: true },
    { name: 'loot', wiz: false },
    { name: 'migratemons', wiz: true },
    { name: 'monster', wiz: false },
    { name: 'name', wiz: false },
    { name: 'offer', wiz: false },
    { name: 'overview', wiz: false },
    { name: 'panic', wiz: true },
    { name: 'polyself', wiz: true },
    { name: 'pray', wiz: false },
    { name: 'quit', wiz: false },
    { name: 'ride', wiz: false },
    { name: 'rub', wiz: false },
    { name: 'sit', wiz: false },
    { name: 'stats', wiz: true },
    { name: 'terrain', wiz: false },
    { name: 'therecmdmenu', wiz: false },
    { name: 'timeout', wiz: true },
    { name: 'tip', wiz: false },
    { name: 'travel', wiz: false },
    { name: 'turn', wiz: false },
    { name: 'untrap', wiz: false },
    { name: 'vanquished', wiz: false },
    { name: 'version', wiz: false },
    { name: 'vision', wiz: true },
    { name: 'wipe', wiz: false },
    { name: 'wizbury', wiz: true },
    { name: 'wizdispmacros', wiz: true },
    { name: 'wizintrinsic', wiz: true },
    { name: 'wizkill', wiz: true },
    { name: 'wizmondiff', wiz: true },
    { name: 'wizrumorcheck', wiz: true },
    { name: 'wizseenv', wiz: true },
    { name: 'wizshownhuuid', wiz: true },
    { name: 'wizsmell', wiz: true },
    { name: 'wiztelekinesis', wiz: true },
    { name: 'wizwhere', wiz: true },
    { name: 'wmode', wiz: true },
];

/**
 * Runnable extended-command table (C extcmdlist subset with JS bodies).
 * Enter resolution uses this list; progressive paint uses EXT_CMD_AC.
 */
const EXT_CMDS = [
    {
        name: 'name',
        wiz: false,
        autocomplete: true,
        run: async () => {
            const { docallcmd } = await import('./do_name.js');
            return docallcmd();
        },
    },
    {
        name: 'pray',
        wiz: false,
        autocomplete: true,
        run: async () => {
            const { dopray } = await import('./pray.js');
            return dopray();
        },
    },
    {
        name: 'chat',
        wiz: false,
        autocomplete: true,
        run: async () => {
            const { dotalk } = await import('./sounds.js');
            return dotalk();
        },
    },
    {
        name: 'chronicle',
        wiz: false,
        autocomplete: true,
        run: async () => {
            const { do_gamelog } = await import('./insight.js');
            return do_gamelog();
        },
    },
    {
        name: 'conduct',
        wiz: false,
        autocomplete: true,
        run: async () => {
            const { doconduct } = await import('./insight.js');
            return doconduct();
        },
    },
    {
        name: 'vanquished',
        wiz: false,
        autocomplete: true,
        run: async () => {
            const { dovanquished } = await import('./insight.js');
            return dovanquished();
        },
    },
    {
        name: 'adjust',
        wiz: false,
        autocomplete: true,
        run: async () => {
            const { doorganize } = await import('./invent.js');
            return doorganize();
        },
    },
    {
        name: 'genocided',
        wiz: false,
        autocomplete: true,
        run: async () => {
            const { dogenocided } = await import('./insight.js');
            return dogenocided();
        },
    },
    {
        name: 'dip',
        wiz: false,
        autocomplete: true,
        run: async () => {
            const { dodip } = await import('./potion.js');
            return dodip();
        },
    },
    {
        name: 'sit',
        wiz: false,
        autocomplete: true,
        run: async () => {
            const { dosit } = await import('./sit.js');
            return dosit();
        },
    },
    {
        name: 'offer',
        wiz: false,
        autocomplete: true,
        run: async () => {
            const { dosacrifice } = await import('./pray.js');
            return dosacrifice();
        },
    },
    {
        name: 'enhance',
        wiz: false,
        autocomplete: true,
        run: async () => {
            const { enhance_weapon_skill } = await import('./weapon.js');
            return enhance_weapon_skill();
        },
    },
    {
        name: 'twoweapon',
        wiz: false,
        autocomplete: true,
        // C ref: wield.c dotwoweapon / cmd.c extcmdlist "twoweapon"
        run: async () => {
            const { dotwoweapon } = await import('./wield.js');
            return dotwoweapon();
        },
    },
    {
        name: 'annotate',
        wiz: false,
        autocomplete: true,
        run: async () => {
            const { donamelevel } = await import('./dungeon.js');
            return donamelevel();
        },
    },
    {
        name: 'overview',
        wiz: false,
        autocomplete: true,
        run: async () => {
            const { dooverview } = await import('./dungeon.js');
            return dooverview();
        },
    },
    {
        name: 'version',
        wiz: false,
        autocomplete: true,
        run: async () => {
            const { doextversion } = await import('./pager.js');
            return doextversion();
        },
    },
    {
        name: 'terrain',
        wiz: false,
        autocomplete: true,
        run: async () => {
            const { doterrain } = await import('./detect.js');
            return doterrain();
        },
    },
    {
        name: 'travel',
        wiz: false,
        autocomplete: true,
        run: async () => {
            const { dotravel } = await import('./cmd.js');
            return dotravel();
        },
    },
    {
        name: 'ride',
        wiz: false,
        autocomplete: true,
        run: async () => {
            const { doride } = await import('./steed.js');
            return doride();
        },
    },
    {
        name: 'quit',
        wiz: false,
        autocomplete: true,
        // C ref: end.c done2 — GENERALCMD / ECMD_OK (lazy: end↔getline)
        run: async () => {
            const { done2 } = await import('./end.js');
            return done2();
        },
    },
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

/** C ref: cmd.c extcmds_match(ECM_NOFLAGS) — AUTOCOMPLETE + !WIZ unless wizard */
function availableAcNames() {
    return EXT_CMD_AC.filter((ec) => !ec.wiz || wizardMode());
}

/**
 * C ref: getline.c ext_cmd_getlin_hook → extcmds_match(base, ECM_NOFLAGS)
 * Unique AUTOCOMPLETE prefix → expand to full ef_txt.
 */
function extCmdAutocomplete(base) {
    if (!base) return null;
    const lower = base.toLowerCase();
    const matches = availableAcNames().filter((ec) =>
        ec.name.toLowerCase().startsWith(lower),
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
        // C hooked_tty_getlin("#", …) shows "# " + buffer (expanded name);
        // empty prompt is still "# " (custompline "%s ") with cursor at col 2.
        const raw = `# ${buf}`;
        const { text, col, row } = topl_wrap_echo(raw, 2 + cursor);
        game._pending_message = text;
        await flush_screen(1);
        const disp = game.nhDisplay;
        if (disp?.setCursor) disp.setCursor(col, row);
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
        // C: bufp - obufp < BUFSZ-1 && bufp - obufp < COLNO
        if (c >= 32 && c < 127 && cursor < COLNO) {
            // C: *bufp = c; bufp[1] = 0; then hook may Strcpy full name
            buf = buf.slice(0, cursor) + String.fromCharCode(c);
            cursor++;
            const expanded = extCmdAutocomplete(buf.slice(0, cursor));
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

/** C ref: cmd.c doextcmd — returns callee ECMD_* (pray → ECMD_TIME). */
export async function doextcmd() {
    const idx = await get_ext_cmd();
    if (idx < 0) return 0; // ECMD_OK
    const ec = availableExtCmds()[idx];
    if (!ec) return 0;
    if (ec.wiz && !wizardMode()) {
        await pline(`That is a wizard-mode command.`);
        return 0;
    }
    const res = await ec.run();
    return res | 0;
}

/**
 * C ref: win/tty/topl.c tty_yn_function — query + [resp] + (def) + space.
 * Esc → 'q' if in resp else 'n' if in resp else def.
 * Quitchars (space/return) → def. Invalid keys bell and retry.
 *
 * After a valid answer, leave the prompt on the message line
 * (C: TOPLINE_NON_EMPTY / gt.toplines). Silent follow-ups (e.g.
 * dipfountain case 16 curse with no pline) keep the yn text until
 * rhack clears after the next-command nhgetch capture.
 * @returns {string} single-character response
 */
export async function yn_function(query, resp = 'yn', def = 'n') {
    await flush_topl_more();
    let prompt;
    if (resp) {
        const shown = resp.replace(/\x1b[\s\S]*$/, ''); // hide after ESC
        prompt = `${query} [${shown}]`;
        if (def) prompt += ` (${def})`;
        prompt += ' ';
    } else {
        prompt = `${query} `;
    }
    for (;;) {
        game._pending_message = prompt;
        await flush_screen(1);
        const disp = game.nhDisplay;
        if (disp?.setCursor) disp.setCursor(prompt.length, 0);
        const c = await nhgetch();
        let ch = String.fromCharCode(c);
        // Do not clear _pending_message here — C leaves the yn prompt.
        if (!resp) return ch;
        const preserve = /[A-Z]/.test(resp);
        if (!preserve) ch = ch.toLowerCase();
        if (c === 27) {
            if (resp.includes('q')) return 'q';
            if (resp.includes('n')) return 'n';
            return def || 'n';
        }
        if (ch === ' ' || c === 13 || c === 10) return def || 'n';
        if (resp.includes(ch)) return ch;
        // invalid — C tty_nhbell + retry
    }
}
