// getline.js — Line input and extended-command entry.
// C ref: win/tty/getline.c tty_getlin / tty_get_ext_cmd (partial).

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { flush_screen, flush_topl_more, pline, mark_topline_prompt, clear_win_stop } from './display.js';
import {
    COLNO, QBUFSZ, PARANOID_CONFIRM,
    ECM_IGNOREAC, ECM_EXACTMATCH, ECM_NO1CHARCMD,
    INTERNALCMD, AUTOCOMPLETE, WIZMODECMD, CMD_NOT_AVAILABLE,
} from './const.js';
import { EXTCMDLIST } from './generated/extcmdlist_data.js';

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
        // C: cmd.c "altdip" INTERNALCMD → dip_into. Not AUTOCOMPLETE;
        // extcmds_match skips INTERNALCMD so typed #altdip is unknown.
        // Canned IA_DIP_OBJ uses cmdq CMDQ_EXTCMD (D-1537).
        name: 'altdip',
        wiz: false,
        autocomplete: false,
        internal: true,
        run: async () => {
            const { dip_into } = await import('./potion.js');
            return dip_into();
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
        name: 'pay',
        wiz: false,
        autocomplete: true,
        run: async () => {
            const { dopay } = await import('./shk.js');
            return dopay();
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
        // C: cmd.c "teleport" IFBURIED|CMD_M_PREFIX (no AUTOCOMPLETE) → dotelecmd
        name: 'teleport',
        wiz: false,
        autocomplete: false,
        run: async () => {
            const { dotelecmd } = await import('./teleport.js');
            return dotelecmd();
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
        // C: cmd.c "lookaround" IFBURIED|GENERALCMD (no AUTOCOMPLETE)
        name: 'lookaround',
        wiz: false,
        autocomplete: false,
        run: async () => {
            const { dolookaround } = await import('./cmd.js');
            return dolookaround();
        },
    },
    {
        name: 'loot',
        wiz: false,
        autocomplete: true,
        // C ref: pickup.c doloot — #loot floor container
        run: async () => {
            const { doloot } = await import('./pickup.js');
            return doloot();
        },
    },
    {
        name: 'force',
        wiz: false,
        autocomplete: true,
        // C ref: lock.c doforce — #force chest/weapon
        run: async () => {
            const { doforce } = await import('./lock.js');
            return doforce();
        },
    },
    {
        name: 'untrap',
        wiz: false,
        autocomplete: true,
        // C ref: trap.c dountrap — #untrap disarm
        run: async () => {
            const { dountrap } = await import('./trap.js');
            return dountrap();
        },
    },
    {
        name: 'tip',
        wiz: false,
        autocomplete: true,
        // C ref: pickup.c dotip — #tip floor/invent container
        run: async () => {
            const { dotip } = await import('./pickup.js');
            return dotip();
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
    {
        // C: cmd.c "wizintrinsic" IFBURIED|AUTOCOMPLETE|WIZMODECMD
        name: 'wizintrinsic',
        wiz: true,
        autocomplete: true,
        run: async () => {
            const { wiz_intrinsic } = await import('./wizcmds.js');
            return wiz_intrinsic();
        },
    },
    {
        // C: cmd.c "timeout" IFBURIED|AUTOCOMPLETE|WIZMODECMD
        // → timeout.c wiz_timeout_queue (D-1527)
        name: 'timeout',
        wiz: true,
        autocomplete: true,
        run: async () => {
            const { wiz_timeout_queue } = await import('./timeout.js');
            return wiz_timeout_queue();
        },
    },
    {
        // C: flags IFBURIED|WIZMODECMD (no AUTOCOMPLETE) — full name required
        name: 'wizgenesis',
        wiz: true,
        autocomplete: false,
        run: async () => {
            const { wiz_genesis } = await import('./wizcmds.js');
            return wiz_genesis();
        },
    },
    {
        // C: cmd.c "wizmap" IFBURIED|WIZMODECMD (no AUTOCOMPLETE) — ^F / #wizmap
        name: 'wizmap',
        wiz: true,
        autocomplete: false,
        run: async () => {
            const { wiz_map } = await import('./wizcmds.js');
            return wiz_map();
        },
    },
    {
        // C: cmd.c "wizwish" IFBURIED|CMD_M_PREFIX|WIZMODECMD (no AUTOCOMPLETE)
        name: 'wizwish',
        wiz: true,
        autocomplete: false,
        run: async () => {
            const { wiz_wish } = await import('./wizcmds.js');
            return wiz_wish();
        },
    },
    {
        // C: cmd.c "invoke" IFBURIED|AUTOCOMPLETE → doinvoke (D-0715)
        name: 'invoke',
        wiz: false,
        autocomplete: true,
        run: async () => {
            const { doinvoke } = await import('./artifact.js');
            return doinvoke();
        },
    },
    {
        // C: cmd.c "rub" AUTOCOMPLETE → dorub
        name: 'rub',
        wiz: false,
        autocomplete: true,
        run: async () => {
            const { dorub } = await import('./apply.js');
            return dorub();
        },
    },

    {
        // C: cmd.c "jump" AUTOCOMPLETE → dojump (D-0899)
        name: 'jump',
        wiz: false,
        autocomplete: true,
        run: async () => {
            const { dojump } = await import('./apply.js');
            return dojump();
        },
    },
    {
        // C: cmd.c "wipe" AUTOCOMPLETE → dowipe (D-0712)
        name: 'wipe',
        wiz: false,
        autocomplete: true,
        run: async () => {
            const { dowipe } = await import('./do.js');
            return dowipe();
        },
    },
    {
        // C: cmd.c "turn" AUTOCOMPLETE → doturn (D-0912)
        name: 'turn',
        wiz: false,
        autocomplete: true,
        run: async () => {
            const { doturn } = await import('./pray.js');
            return doturn();
        },
    },
    {
        // C: cmd.c "polyself" IFBURIED|AUTOCOMPLETE|WIZMODECMD → wiz_polyself
        name: 'polyself',
        wiz: true,
        autocomplete: true,
        run: async () => {
            const { wiz_polyself } = await import('./polyself.js');
            return wiz_polyself();
        },
    },
    {
        // C: cmd.c "wizwhere" IFBURIED|AUTOCOMPLETE|WIZMODECMD → wiz_where
        name: 'wizwhere',
        wiz: true,
        autocomplete: true,
        run: async () => {
            const { wiz_where } = await import('./wizcmds.js');
            return wiz_where();
        },
    },
    {
        // C: cmd.c "wizidentify" IFBURIED|WIZMODECMD (no AUTOCOMPLETE) → wiz_identify
        name: 'wizidentify',
        wiz: true,
        autocomplete: false,
        run: async () => {
            const { wiz_identify } = await import('./wizcmds.js');
            return wiz_identify();
        },
    },
    {
        // C: cmd.c "wizmakemap" IFBURIED|WIZMODECMD (no AUTOCOMPLETE)
        name: 'wizmakemap',
        wiz: true,
        autocomplete: false,
        run: async () => {
            const { wiz_makemap } = await import('./wizcmds.js');
            return wiz_makemap();
        },
    },
    {
        name: 'monster',
        wiz: false,
        autocomplete: true,
        // C: cmd.c "monster" IFBURIED|AUTOCOMPLETE → domonability (D-0722)
        run: async () => {
            const { domonability } = await import('./polyself.js');
            return domonability();
        },
    },
    {
        // C: cmd.c "herecmdmenu" IFBURIED|AUTOCOMPLETE|GENERALCMD → doherecmdmenu
        name: 'herecmdmenu',
        wiz: false,
        autocomplete: true,
        run: async () => {
            const { doherecmdmenu } = await import('./cmd.js');
            return doherecmdmenu();
        },
    },
];

function wizardMode() {
    return !!(game.flags?.debug || game.flags?.wizard);
}

function availableExtCmds() {
    return EXT_CMDS.filter((ec) => !ec.internal && (!ec.wiz || wizardMode()));
}

/**
 * C ref: cmd.c extcmds_match. Skips CMD_NOT_AVAILABLE|INTERNALCMD.
 * ECM_IGNOREAC includes !AUTOCOMPLETE (typed # exact match).
 * @param {string | null} findstr
 * @param {number} ecmflags
 * @returns {number[]} indices into EXTCMDLIST
 */
export function extcmds_match(findstr, ecmflags) {
    const ignoreac = (ecmflags & ECM_IGNOREAC) !== 0;
    const exactmatch = (ecmflags & ECM_EXACTMATCH) !== 0;
    const no1charcmd = (ecmflags & ECM_NO1CHARCMD) !== 0;
    const wizard = wizardMode();
    const needle = findstr == null ? null : String(findstr).toLowerCase();
    const out = [];
    for (let i = 0; i < EXTCMDLIST.length; i++) {
        const e = EXTCMDLIST[i];
        if (e.flags & (CMD_NOT_AVAILABLE | INTERNALCMD)) continue;
        if (!wizard && (e.flags & WIZMODECMD)) continue;
        if (!ignoreac && !(e.flags & AUTOCOMPLETE)) continue;
        if (no1charcmd && e.txt.length === 1) continue;
        if (!needle) {
            out.push(i);
        } else if (exactmatch) {
            if (e.txt.toLowerCase() === needle) out.push(i);
        } else if (e.txt.toLowerCase().startsWith(needle)) {
            out.push(i);
        }
    }
    return out;
}

/**
 * C ref: cmd.c accept_menu_prefix — CMD_M_PREFIX on the resolved extcmd.
 * Names currently in EXT_CMDS that C marks CMD_M_PREFIX. Expand when a
 * new runner is added with that flag. cmd_from_func(do_reqmenu) named
 * (this port's m-prefix key is always 'm').
 */
const EXTCMD_M_PREFIX = new Set([
    'annotate', 'dip', 'genocided', 'loot', 'offer', 'overview',
    'pay', 'teleport', 'tip', 'travel', 'vanquished', 'wizwish',
]);

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
    /* C tty_get_ext_cmd: extcmds_match(buf, ECM_IGNOREAC|ECM_EXACTMATCH).
       INTERNALCMD (#altdip) is skipped — unknown even with a runner. */
    const matches = extcmds_match(name, ECM_IGNOREAC | ECM_EXACTMATCH);
    if (matches.length !== 1) {
        await pline(`#${buf}: unknown extended command.`);
        return -1;
    }
    const txt = EXTCMDLIST[matches[0]].txt.toLowerCase();
    const idx = availableExtCmds().findIndex((ec) => ec.name === txt);
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
    /* C cmd.c:507–511 — keep m only if the resolved command accepts it. */
    if (game.iflags?.menu_requested && !EXTCMD_M_PREFIX.has(ec.name)) {
        await pline(`'m' prefix has no effect for the ${ec.name} command.`);
        game.iflags.menu_requested = false;
    }
    const res = await ec.run();
    return res | 0;
}

/** C ref: hacklib.c mungspaces — collapse runs of whitespace to one space. */
function mungspaces(s) {
    return String(s ?? '').replace(/\s+/g, ' ').trim();
}

/**
 * C ref: cmd.c paranoid_ynq — when be_paranoid, getlin must answer "yes"
 * (case-insensitive); else yn_function. ParanoidConfirm loops until
 * yes/no/quit/ESC (accept_q gates quit). Result 'y'|'n'|'q'.
 * @param {boolean} be_paranoid
 * @param {string} prompt
 * @param {boolean} [accept_q=false]
 * @returns {Promise<string>}
 */
export async function paranoid_ynq(be_paranoid, prompt, accept_q = false) {
    let c = 'n';
    if (be_paranoid) {
        const bits = game.flags?.paranoia_bits | 0;
        const ParanoidConfirm = (bits & PARANOID_CONFIRM) !== 0;
        let pbuf = String(prompt ?? '');
        const responsetype = ParanoidConfirm
            ? (accept_q ? '[yes|no|quit]' : '[yes|no]')
            : (accept_q ? '[yes|n|q] (n)' : '[yes|n] (n)');
        let promptprefix = '';
        let trylimit = 6;
        let ans = '';
        do {
            const k = promptprefix.length + 1 + responsetype.length;
            if (pbuf.length + k > QBUFSZ - 1) {
                const keep = (QBUFSZ - 1) - k - 4;
                pbuf = `${pbuf.slice(0, Math.max(0, keep))}...?`;
            }
            const qbuf = `${promptprefix}${pbuf} ${responsetype}`;
            ans = await getlin(qbuf);
            if (ans === '\x1b') {
                c = 'q';
                break;
            }
            ans = mungspaces(ans);
            if (ans.toLowerCase() === 'yes') {
                c = 'y';
                break;
            }
            if (ans.toLowerCase() === 'quit') {
                c = 'q';
                break;
            }
            promptprefix = '"Yes" or "No": ';
        } while (ParanoidConfirm && ans.toLowerCase() !== 'no' && --trylimit);
    } else if (accept_q) {
        c = await yn_function(prompt, 'ynq', 'n');
    } else {
        c = await yn_function(prompt, 'yn', 'n');
    }
    if (c !== 'y' && (c !== 'q' || !accept_q)) c = 'n';
    return c;
}

/**
 * C ref: cmd.c paranoid_query — True iff paranoid_ynq returns 'y'.
 * @param {boolean} be_paranoid
 * @param {string} prompt
 * @returns {Promise<boolean>}
 */
export async function paranoid_query(be_paranoid, prompt) {
    return (await paranoid_ynq(be_paranoid, prompt, false)) === 'y';
}

/**
 * C ref: win/tty/topl.c tty_yn_function — query + [resp] + (def) + space.
 * Esc → 'q' if in resp else 'n' if in resp else def.
 * Quitchars (space/return) → def. Invalid keys bell and retry.
 *
 * Prompt paint uses show_topl/putsyms hard-wrap (SUPPRESS_HISTORY), not
 * update_topl word-wrap — see topl_wrap_echo.
 *
 * After a valid answer, leave the prompt on the message line
 * (C: TOPLINE_NON_EMPTY / gt.toplines). Silent follow-ups (e.g.
 * dipfountain case 16 curse with no pline) keep the yn text until
 * rhack clears after the next-command nhgetch capture.
 * @returns {string} single-character response
 */
export async function yn_function(query, resp = 'yn', def = 'n') {
    await flush_topl_more();
    // C tty_yn_function: after optional more(), clear WIN_STOP|WIN_NOSTOP
    // before painting the prompt (topl.c).
    clear_win_stop();
    // C: char def — '\0' is falsy (no " (c)" suffix). JS '\0' is truthy.
    const hasDef = !!(def && def !== '\0');
    let prompt;
    if (resp) {
        const shown = resp.replace(/\x1b[\s\S]*$/, ''); // hide after ESC
        prompt = `${query} [${shown}]`;
        if (hasDef) prompt += ` (${def})`;
        prompt += ' ';
    } else {
        prompt = `${query} `;
    }
    for (;;) {
        // C: custompline(SUPPRESS_HISTORY) → tty_putstr → show_topl →
        // addtopl/putsyms — hard-wrap at CO-1 via topl_putsym (not
        // update_topl's word-wrap). An 80-char prompt ends with the
        // trailing space on row 1 and cursor at (1,1).
        const { text, col, row } = topl_wrap_echo(prompt, prompt.length);
        mark_topline_prompt(text);
        await flush_screen(1);
        // Leftover gt.toplines after answer is the unwrapped prompt
        // (tty_yn_function clean_up Sprintf); keep that for parse clear.
        mark_topline_prompt(prompt);
        const disp = game.nhDisplay;
        if (disp?.setCursor) disp.setCursor(col, row);
        const c = await nhgetch();
        let ch = String.fromCharCode(c);
        // Do not clear _pending_message here — C leaves the yn prompt.
        if (!resp) return ch;
        const preserve = /[A-Z]/.test(resp);
        if (!preserve) ch = ch.toLowerCase();
        if (c === 27) {
            if (resp.includes('q')) return 'q';
            if (resp.includes('n')) return 'n';
            // C: else q = def (may be '\0', e.g. rightleftchars)
            return def;
        }
        if (ch === ' ' || c === 13 || c === 10) return def;
        if (resp.includes(ch)) return ch;
        // invalid — C tty_nhbell + retry
    }
}
