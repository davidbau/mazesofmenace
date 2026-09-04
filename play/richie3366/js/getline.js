// getline.js — Line input and extended-command entry.
// C ref: win/tty/getline.c tty_getlin / hooked_tty_getlin / tty_get_ext_cmd
// plus win/tty/topl.c tty_yn_function (yn ^P is D-1612; post-answer
// prompt+key is D-1623; tty_nhbell / cw->cury / intr is D-1631)
// and cmd.c yn_function addcmdq (D-1706) / yn_function_menu (D-1728)
// / remaining body + debug_fuzzer RNG (D-1805).
// EDIT_GETLIN is D-1624 (`config.h` commented out — live `#else`).
// kill_char / empty-erase bell / invalid-key bell / getline `intr--`
// are D-1632. ESC-nonempty fallthrough (else tty_nhbell / doprev) is
// D-1639.

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import {
    flush_screen, flush_topl_more, pline, mark_topline_prompt, clear_win_stop,
    clear_nhwindow_message, tty_doprev_message,
    get_tty_inread, set_tty_inread, get_tty_intr, set_tty_intr,
    prevmsg_reset_maxcol,
    mark_topline_special_prompt, hooked_getlin_release_prompt,
    hooked_getlin_epilogue, tty_yn_rewrite_toplines, tty_nhbell,
    tty_yn_note_msg_cursor, tty_yn_clean_up_tty,
    impossible,
} from './display.js';
import { key2txt, visctrl } from './dokeylist.js';
import { rn2 } from './rng.js';
import {
    BUFSZ, COLNO, QBUFSZ, PARANOID_CONFIRM,
    ECM_IGNOREAC, ECM_EXACTMATCH, ECM_NO1CHARCMD,
    INTERNALCMD, AUTOCOMPLETE, WIZMODECMD, CMD_NOT_AVAILABLE,
    CMD_M_PREFIX,
    CMDQ_KEY, CMDQ_USER_INPUT, CQ_CANNED, CQ_REPEAT, PLNMSG_UNKNOWN,
    ynchars, ynqchars, ynaqchars, rightleftchars, hidespinchars,
    MENU_ITEMFLAGS_NONE, MENU_ITEMFLAGS_SELECTED,
    otherInp, fuzzer_impossible_continue,
} from './const.js';
import { select_menu_pick_one } from './options.js';
import { EXTCMDLIST } from './generated/extcmdlist_data.js';
import { cmdq_pop, cmdq_clear } from './cmd.js';
import { cmdq_add_key } from './invent.js';

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

// C global.h C('p') — getline.c hooked_tty_getlin and topl.c tty_yn_function
// do not honor #prevmsg rebind (cmd.c doprev_message is D-1601).
const GETLIN_CTRL_P = 0x10;

/**
 * C getline.c hooked_tty_getlin C('p') `:105–141`. Zeros inread around
 * tty_doprev_message so f/c/r arms run (D-1601 skips them when inread).
 * `'s'` or (`'c'` && !doprev): two calls the first time, then one; continue.
 * else: one call, restore prompt, fall through. After a single-mode walk,
 * the next non-^P restores the prompt then processes that key.
 * yn ^P (`topl.c` `:434–463`) is D-1612 — do not glue.
 * @param {number} c
 * @param {boolean} doprev
 * @param {() => Promise<void>} restorePrompt
 * @returns {Promise<{ skip: boolean, doprev: boolean }>}
 */
async function hooked_getlin_ctrl_p(c, doprev, restorePrompt) {
    if (c === GETLIN_CTRL_P) {
        const sav = get_tty_inread();
        set_tty_inread(0);
        const pm = String(game.iflags?.prevmsg_window || 's').charAt(0).toLowerCase();
        if (pm === 's' || (pm === 'c' && !doprev)) {
            if (!doprev) await tty_doprev_message(); /* need two initially */
            await tty_doprev_message();
            set_tty_inread(sav);
            return { skip: true, doprev: true };
        }
        await tty_doprev_message();
        set_tty_inread(sav);
        await restorePrompt();
        return { skip: false, doprev: false };
    }
    if (doprev) {
        await restorePrompt();
        return { skip: false, doprev: false };
    }
    return { skip: false, doprev };
}

/**
 * C getline.c hooked_tty_getlin `:128–133` / `:135–140`.
 * tty_clear_nhwindow then maxcol=maxrow then addtopl(query+" "+buf).
 * *bufp=0 is the existing NUL at the write pointer — buffer kept.
 * @param {() => Promise<void>} paint
 */
async function hooked_getlin_restore_prompt(paint) {
    clear_nhwindow_message();
    prevmsg_reset_maxcol();
    await paint();
}

/**
 * C getline.c hooked_tty_getlin `:52–58` + `:175`: more if NEED_MORE,
 * clear WIN_STOP, SPECIAL_PROMPT, inread++. Exit: inread--, drop SPECIAL.
 */
function hooked_getlin_begin() {
    set_tty_inread(get_tty_inread() + 1);
}

function hooked_getlin_end() {
    set_tty_inread(get_tty_inread() - 1);
    hooked_getlin_release_prompt();
}

/**
 * C sys/share/unixtty.c gettty `:218–219` copies termios VERASE/VKILL.
 * JS has no tty (Rule #2); POSIX defaults are VERASE=DEL, VKILL=C('U').
 * pctty.c uses `'\b'`+21; DEL erase keeps `c == erase_char || c == '\b'`
 * covering both BS and DEL (typical Unix recorder). kill's `|| '\177'`
 * is then unreachable for DEL because erase is tested first.
 * getline.c `:26` extern.
 */
const erase_char = 0x7f;
const kill_char = 0x15; /* C('U') */

/**
 * C getline.c hooked_tty_getlin `:102–105`.
 * `if (ttyDisplay->intr) { ttyDisplay->intr--; *bufp = 0; }`
 * Truncates at the write pointer (NEWAUTOCOMP suffix), does not
 * rewind to obufp. Increment is wintty.c tty_wait_synch (D-1646).
 * @param {{ buf: string, cursor: number }} st
 */
function hooked_getlin_apply_intr(st) {
    if (!get_tty_intr()) return;
    set_tty_intr(get_tty_intr() - 1);
    st.buf = st.buf.slice(0, st.cursor);
}

/**
 * C getline.c hooked_tty_getlin `:85–91` then fall through `:102–211`.
 * Nonempty ESC clears `obufp`, redraws the prompt, and does **not**
 * `continue` — C then runs `intr`, `doprev` restore, and else
 * `tty_nhbell()` because `'\033'` is not erase/enter/printable/kill.
 * Empty ESC (`:92–99`) is cancel (`obufp[0]='\033'; break`).
 * @param {number} c
 * @param {{ buf: string, cursor: number }} st
 * @param {() => Promise<void>} paint
 * @returns {Promise<'cancel'|'fallthrough'>}
 */
async function hooked_getlin_handle_esc(c, st, paint) {
    if (c !== 27) return 'fallthrough';
    if (st.buf.length > 0) {
        st.buf = '';
        st.cursor = 0;
        await paint();
        return 'fallthrough';
    }
    return 'cancel';
}

/**
 * C getline.c hooked_tty_getlin `:142–211` after ESC and C('p').
 * NEWAUTOCOMP (`:11`) is on except MACOS9 — erase NULs at the new
 * cursor (drops autocomplete suffix); kill spaces the suffix then
 * `\b \b` back to obufp and NULs. Empty erase bells; empty kill does
 * not. Printable that fails the length test falls through to kill,
 * then else tty_nhbell. `@` as kill_char is last so it can still
 * insert when the buffer accepts it. ESC after a nonempty clear
 * lands here (not erase/enter/insert/kill) → else `tty_nhbell`.
 * @param {number} c
 * @param {{ buf: string, cursor: number }} st
 * @returns {'enter'|'insert'|'loop'}
 */
function hooked_getlin_edit_key(c, st) {
    if (c === erase_char || c === 0x08) {
        if (st.cursor !== 0) {
            st.cursor -= 1;
            st.buf = st.buf.slice(0, st.cursor);
        } else {
            tty_nhbell();
        }
        return 'loop';
    }
    if (c === 0x0a || c === 0x0d) return 'enter';
    const used = st.cursor;
    const uc = c & 0xff;
    /* C: ' ' <= (unsigned char)c && c != '\177' && used < BUFSZ-1 && used < COLNO */
    if (uc >= 0x20 && c !== 0x7f && used < BUFSZ - 1 && used < COLNO) {
        return 'insert';
    }
    if (c === kill_char || c === 0x7f) {
        st.buf = '';
        st.cursor = 0;
        return 'loop';
    }
    tty_nhbell();
    return 'loop';
}

/**
 * C include/config.h:655 EDIT_GETLIN is commented out — contest C does
 * not compile the preload arm. hooked_tty_getlin :70-78 live path is
 * `*bufp = '\0'` (the #else). The #ifdef would addtopl(obufp) then
 * bufp = eos(obufp) so a caller-supplied default is editable.
 * do_name.c name_from_player and dungeon.c query_annotation have
 * matching #ifdefs (D-1624).
 */
const EDIT_GETLIN = false;

/**
 * C ref: windows.c getlin → tty_getlin → hooked_tty_getlin.
 * Prompt + echo until Enter/ESC. ^P walks tty_doprev_message (D-1611).
 * kill_char / `\177` wipe the buffer (D-1632); empty erase and other
 * rejected keys tty_nhbell. Nonempty ESC clears then falls through
 * (D-1639) so else `tty_nhbell` / `doprev` still run. `bufp` is C's
 * in/out buffer; ignored unless EDIT_GETLIN (off here).
 * Returns the buffer string ("" on empty Enter, "\033" on ESC with empty buf).
 * @param {string} query
 * @param {string} [bufp]
 */
export async function getlin(query, bufp) {
    await flush_topl_more();
    clear_win_stop();
    hooked_getlin_begin();
    /* C hooked_tty_getlin `:70–78` — `#else *bufp='\0'` when
     * EDIT_GETLIN is commented out (`config.h:655`). */
    const preload = String(bufp ?? '');
    const st = {
        buf: EDIT_GETLIN ? preload : '',
        cursor: EDIT_GETLIN ? preload.length : 0,
    };
    let doprev = false;
    const paint = async () => {
        const raw = `${query} ${st.buf}`;
        const { text, col, row } = topl_wrap_echo(
            raw,
            query.length + 1 + st.buf.length,
        );
        mark_topline_special_prompt(raw);
        game._pending_message = text;
        await flush_screen(1);
        const disp = game.nhDisplay;
        if (disp?.setCursor) disp.setCursor(col, row);
    };
    const restorePrompt = () => hooked_getlin_restore_prompt(paint);
    try {
        await paint();
        for (;;) {
            const c = await nhgetch();
            /* C hooked_tty_getlin `:85–91` nonempty ESC: clear+redraw,
             * then fall through (no continue). Empty ESC cancels. */
            if (await hooked_getlin_handle_esc(c, st, paint) === 'cancel') {
                return '\x1b';
            }
            hooked_getlin_apply_intr(st);
            const handled = await hooked_getlin_ctrl_p(c, doprev, restorePrompt);
            doprev = handled.doprev;
            if (handled.skip) continue;
            const act = hooked_getlin_edit_key(c, st);
            if (act === 'enter') return st.buf;
            if (act === 'insert') {
                st.buf = st.buf.slice(0, st.cursor) + String.fromCharCode(c);
                st.cursor += 1;
            }
            await paint();
        }
    } finally {
        /* C tty_getlin: suppress_history = FALSE → dumplogmsg */
        hooked_getlin_epilogue(false);
        hooked_getlin_end();
        game._pending_message = '';
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
        // C: cmd.c "?" IFBURIED|AUTOCOMPLETE|GENERALCMD|CMD_M_PREFIX →
        // doextlist. Key M('?') (D-1643 rhack cmdbind_get). Body D-1625.
        name: '?',
        wiz: false,
        autocomplete: true,
        run: async () => {
            const { doextlist } = await import('./cmd.js');
            return doextlist();
        },
    },
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
        // C: cmd.c "prevmsg" IFBURIED|GENERALCMD (no AUTOCOMPLETE) →
        // doprev_message → tty_doprev_message (D-1601). Key C('p').
        name: 'prevmsg',
        wiz: false,
        autocomplete: false,
        run: async () => {
            const { doprev_message } = await import('./cmd.js');
            return doprev_message();
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
        // C: cmd.c "droptype" → doddrop. Key 'D'. No AUTOCOMPLETE.
        name: 'droptype',
        wiz: false,
        autocomplete: false,
        run: async () => {
            const { doddrop } = await import('./do.js');
            return doddrop();
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
        // C: cmd.c "repeat" IFBURIED|GENERALCMD (no AUTOCOMPLETE) → do_repeat.
        // Typed #repeat exact-match; Ctrl-A is rhack key 1.
        name: 'repeat',
        wiz: false,
        autocomplete: false,
        run: async () => {
            const { do_repeat } = await import('./cmd.js');
            return do_repeat();
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
    {
        // C: cmd.c "seeall" IFBURIED|GENERALCMD|CMD_M_PREFIX (no AUTOCOMPLETE)
        // → doprinuse. Key '*'. Body D-0340/D-1589; this is the typed # runner.
        name: 'seeall',
        wiz: false,
        autocomplete: false,
        run: async () => {
            const { doprinuse } = await import('./invent.js');
            return doprinuse();
        },
    },
    {
        // C: cmd.c "seeweapon" same flags → doprwep. Key ')'.
        name: 'seeweapon',
        wiz: false,
        autocomplete: false,
        run: async () => {
            const { doprwep } = await import('./invent.js');
            return doprwep();
        },
    },
    {
        // C: cmd.c "seearmor" same flags → doprarm. Key '['.
        name: 'seearmor',
        wiz: false,
        autocomplete: false,
        run: async () => {
            const { doprarm } = await import('./invent.js');
            return doprarm();
        },
    },
    {
        // C: cmd.c "seerings" same flags → doprring. Key '='.
        name: 'seerings',
        wiz: false,
        autocomplete: false,
        run: async () => {
            const { doprring } = await import('./invent.js');
            return doprring();
        },
    },
    {
        // C: cmd.c "seeamulet" same flags → dopramulet. Key '"'.
        name: 'seeamulet',
        wiz: false,
        autocomplete: false,
        run: async () => {
            const { dopramulet } = await import('./invent.js');
            return dopramulet();
        },
    },
    {
        // C: cmd.c "seetools" same flags → doprtool. Key '('.
        name: 'seetools',
        wiz: false,
        autocomplete: false,
        run: async () => {
            const { doprtool } = await import('./invent.js');
            return doprtool();
        },
    },
    {
        // C: cmd.c "perminv" IFBURIED|GENERALCMD|NOFUZZERCMD (no AUTOCOMPLETE)
        // → doperminv. Key '|'. tty_update_inventory(1) arg unused.
        name: 'perminv',
        wiz: false,
        autocomplete: false,
        run: async () => {
            const { doperminv } = await import('./invent.js');
            return doperminv();
        },
    },
    // C cmd.c extcmdlist names for rhack if/else keys so BIND= overlay
    // uses the same tlist path as C cmdbind_get (D-1657). Same bodies as
    // the if/else; not a second dispatch table. AUTOCOMPLETE is off
    // (none of these rows have that flag). PREFIXCMD fight/reqmenu/
    // rush/run overlay targets named. Walk keys still the movement arm.
    {
        name: 'apply', wiz: false, autocomplete: false,
        run: async () => (await import('./apply.js')).doapply(),
    },
    {
        name: 'attributes', wiz: false, autocomplete: false,
        run: async () => (await import('./invent.js')).doattributes(),
    },
    {
        name: 'autopickup', wiz: false, autocomplete: false,
        run: async () => (await import('./options.js')).dotogglepickup(),
    },
    {
        name: 'cast', wiz: false, autocomplete: false,
        run: async () => (await import('./spell.js')).docast(),
    },
    {
        name: 'close', wiz: false, autocomplete: false,
        run: async () => (await import('./lock.js')).doclose(),
    },
    {
        name: 'down', wiz: false, autocomplete: false,
        run: async () => (await import('./do.js')).dodown(),
    },
    {
        name: 'drop', wiz: false, autocomplete: false,
        run: async () => (await import('./do.js')).dodrop(),
    },
    {
        name: 'eat', wiz: false, autocomplete: false,
        run: async () => (await import('./eat.js')).doeat(),
    },
    {
        name: 'engrave', wiz: false, autocomplete: false,
        run: async () => (await import('./engrave.js')).doengrave(),
    },
    {
        name: 'fire', wiz: false, autocomplete: false,
        run: async () => (await import('./dothrow.js')).dofire(),
    },
    {
        name: 'glance', wiz: false, autocomplete: false,
        run: async () => (await import('./pager.js')).doquickwhatis(),
    },
    {
        name: 'help', wiz: false, autocomplete: false,
        run: async () => (await import('./pager.js')).dohelp(),
    },
    {
        name: 'inventory', wiz: false, autocomplete: false,
        run: async () => (await import('./invent.js')).ddoinv(),
    },
    {
        // C: cmd.c "inventtype" IFBURIED|GENERALCMD → dotypeinv. Key 'I'.
        name: 'inventtype', wiz: false, autocomplete: false,
        run: async () => (await import('./invent.js')).dotypeinv(),
    },
    {
        name: 'kick', wiz: false, autocomplete: false,
        run: async () => (await import('./dokick.js')).dokick(),
    },
    {
        name: 'known', wiz: false, autocomplete: false,
        run: async () => (await import('./invent.js')).dodiscovered(),
    },
    {
        name: 'look', wiz: false, autocomplete: false,
        run: async () => (await import('./invent.js')).dolook(),
    },
    {
        name: 'open', wiz: false, autocomplete: false,
        run: async () => (await import('./lock.js')).doopen(),
    },
    {
        name: 'options', wiz: false, autocomplete: false,
        run: async () => (await import('./options.js')).doset_simple(),
    },
    {
        name: 'pickup', wiz: false, autocomplete: false,
        run: async () => (await import('./pickup.js')).dopickup(),
    },
    {
        name: 'puton', wiz: false, autocomplete: false,
        run: async () => (await import('./do_wear.js')).doputon(),
    },
    {
        name: 'quaff', wiz: false, autocomplete: false,
        run: async () => (await import('./potion.js')).dodrink(),
    },
    {
        name: 'quiver', wiz: false, autocomplete: false,
        run: async () => (await import('./wield.js')).dowieldquiver(),
    },
    {
        name: 'read', wiz: false, autocomplete: false,
        run: async () => (await import('./read.js')).doread(),
    },
    {
        name: 'save', wiz: false, autocomplete: false,
        run: async () => (await import('./save.js')).dosave(),
    },
    {
        name: 'search', wiz: false, autocomplete: false,
        run: async () => (await import('./detect.js')).dosearch(),
    },
    {
        name: 'showgold', wiz: false, autocomplete: false,
        run: async () => (await import('./invent.js')).doprgold(),
    },
    {
        name: 'showspells', wiz: false, autocomplete: false,
        run: async () => (await import('./spell.js')).dovspell(),
    },
    {
        name: 'swap', wiz: false, autocomplete: false,
        run: async () => (await import('./wield.js')).doswapweapon(),
    },
    {
        name: 'takeoff', wiz: false, autocomplete: false,
        run: async () => (await import('./do_wear.js')).dotakeoff(),
    },
    {
        name: 'takeoffall', wiz: false, autocomplete: false,
        run: async () => (await import('./do_wear.js')).doddoremarm(),
    },
    {
        name: 'throw', wiz: false, autocomplete: false,
        run: async () => (await import('./dothrow.js')).dothrow(),
    },
    {
        name: 'up', wiz: false, autocomplete: false,
        run: async () => (await import('./do.js')).doup(),
    },
    {
        name: 'wait', wiz: false, autocomplete: false,
        run: async () => (await import('./do.js')).donull(),
    },
    {
        name: 'wear', wiz: false, autocomplete: false,
        run: async () => (await import('./do_wear.js')).dowear(),
    },
    {
        name: 'whatis', wiz: false, autocomplete: false,
        run: async () => (await import('./pager.js')).dowhatis(),
    },
    {
        name: 'wield', wiz: false, autocomplete: false,
        run: async () => (await import('./wield.js')).dowield(),
    },
    {
        name: 'wizlevelport', wiz: true, autocomplete: false,
        run: async () => (await import('./wizcmds.js')).wiz_level_tele(),
    },
    {
        name: 'zap', wiz: false, autocomplete: false,
        run: async () => (await import('./zap.js')).dozap(),
    },
];

function wizardMode() {
    return !!(game.flags?.debug || game.flags?.wizard);
}

function availableExtCmds() {
    return EXT_CMDS.filter((ec) => !ec.internal && (!ec.wiz || wizardMode()));
}

/**
 * C extcmdlist ef_funct by ef_txt for rhack cmdbind_get (D-1643 / D-1657).
 * Same EXT_CMDS bodies as typed # — not a second table. INTERNALCMD
 * skipped (bind_key does too). Wizard rows returned; can_do_extcmd
 * refuses WIZMODECMD when !wizard.
 * @param {string | null | undefined} txt
 * @returns {(() => Promise<number>) | null}
 */
export function extcmd_run_by_txt(txt) {
    if (txt == null || txt === '') return null;
    const want = String(txt).toLowerCase();
    for (const ec of EXT_CMDS) {
        if (ec.internal) continue;
        if (ec.name === want) return ec.run;
    }
    return null;
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
 * C ref: cmd.c accept_menu_prefix `:3507–3512` — CMD_M_PREFIX on the
 * resolved extcmdlist row (not a name set). cmd_from_func(do_reqmenu)
 * visctrl named (this port's m-prefix key is always 'm').
 * @param {{ flags?: number } | null | undefined} extcmd
 * @returns {boolean}
 */
function accept_menu_prefix(extcmd) {
    return !!(extcmd && ((extcmd.flags | 0) & CMD_M_PREFIX));
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
    clear_win_stop();
    hooked_getlin_begin();
    const st = { buf: '', cursor: 0 };
    let doprev = false;
    const paint = async () => {
        // C hooked_tty_getlin("#", …) shows "# " + buffer (expanded name);
        // empty prompt is still "# " (custompline "%s ") with cursor at col 2.
        const raw = `# ${st.buf}`;
        const { text, col, row } = topl_wrap_echo(raw, 2 + st.cursor);
        mark_topline_special_prompt(raw);
        game._pending_message = text;
        await flush_screen(1);
        const disp = game.nhDisplay;
        if (disp?.setCursor) disp.setCursor(col, row);
    };
    const restorePrompt = () => hooked_getlin_restore_prompt(paint);
    try {
        await paint();
        for (;;) {
            const c = await nhgetch();
            /* Same C hooked_tty_getlin as getlin — nonempty ESC falls
             * through to intr / doprev / else tty_nhbell (D-1639). */
            if (await hooked_getlin_handle_esc(c, st, paint) === 'cancel') {
                return -1;
            }
            hooked_getlin_apply_intr(st);
            const handled = await hooked_getlin_ctrl_p(c, doprev, restorePrompt);
            doprev = handled.doprev;
            if (handled.skip) continue;
            const act = hooked_getlin_edit_key(c, st);
            if (act === 'enter') break;
            if (act === 'insert') {
                /* C: *bufp = c; bufp[1] = 0; then hook may Strcpy full name */
                st.buf = st.buf.slice(0, st.cursor) + String.fromCharCode(c);
                st.cursor += 1;
                const expanded = extCmdAutocomplete(st.buf.slice(0, st.cursor));
                if (expanded) st.buf = expanded;
            }
            await paint();
        }
    } finally {
        /* C tty_get_ext_cmd: suppress_history = TRUE → *gt.toplines = 0 */
        hooked_getlin_epilogue(true);
        hooked_getlin_end();
        game._pending_message = '';
    }
    const name = st.buf.trim().toLowerCase();
    if (!name) return -1;
    /* C tty_get_ext_cmd: extcmds_match(buf, ECM_IGNOREAC|ECM_EXACTMATCH).
       INTERNALCMD (#altdip) is skipped — unknown even with a runner. */
    const matches = extcmds_match(name, ECM_IGNOREAC | ECM_EXACTMATCH);
    if (matches.length !== 1) {
        await pline(`#${st.buf}: unknown extended command.`);
        return -1;
    }
    const txt = EXTCMDLIST[matches[0]].txt.toLowerCase();
    const idx = availableExtCmds().findIndex((ec) => ec.name === txt);
    if (idx < 0) {
        await pline(`#${st.buf}: unknown extended command.`);
        return -1;
    }
    return idx;
}

/**
 * C ref: cmd.c doextcmd `:492–520` — keep repeating until the callee
 * is not doextlist (`#?` help then another extended command).
 * Returns callee ECMD_* (pray → ECMD_TIME).
 */
export async function doextcmd() {
    let funcIsDoextlist = false;
    let retval = 0;
    do {
        const idx = await get_ext_cmd();
        if (idx < 0) return 0; // ECMD_OK
        const ec = availableExtCmds()[idx];
        if (!ec) return 0;
        /* C cmd.c:505–515 — extcmdlist row, can_do_extcmd, then m-prefix. */
        const row = EXTCMDLIST.find((e) => e.txt.toLowerCase() === ec.name);
        const { can_do_extcmd } = await import('./cmd.js');
        if (!(await can_do_extcmd(row))) return 0;
        if (game.iflags?.menu_requested && !accept_menu_prefix(row)) {
            await pline(`'m' prefix has no effect for the ${ec.name} command.`);
            game.iflags.menu_requested = false;
        }
        /* C cmd.c:513 — tell rhack() what command is actually executing */
        game.ext_tlist = {
            txt: ec.name,
            run: ec.run,
            flags: row ? (row.flags | 0) : 0,
        };
        /* C: while (func == doextlist) — table txt "?" is doextlist. */
        funcIsDoextlist = ec.name === '?';
        retval = (await ec.run()) | 0;
    } while (funcIsDoextlist);
    return retval;
}

/** C ref: hacklib.c mungspaces — collapse runs of whitespace to one space. */
export function mungspaces(s) {
    return String(s ?? '').replace(/\s+/g, ' ').trim();
}

/**
 * C ref: cmd.c paranoid_ynq — when be_paranoid, getlin must answer "yes"
 * (case-insensitive); else yn_function(..., FALSE). ParanoidConfirm loops until
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
        c = await yn_function(prompt, ynqchars, 'n', false);
    } else {
        c = await yn_function(prompt, ynchars, 'n', false);
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
 * C topl.c tty_yn_function `:394–396` / `:544–545`: SPECIAL_PROMPT,
 * inread++, then inread-- and NON_EMPTY. Getlin uses the same inread
 * pair (D-1611) but a different ^P dispatcher. Post-answer gt.toplines
 * rewrite is D-1623 (not this pair). tty_nhbell / cw->cury / intr is
 * D-1631 (not post-answer toplines).
 */
function hooked_yn_begin() {
    set_tty_inread(get_tty_inread() + 1);
}

function hooked_yn_end() {
    set_tty_inread(get_tty_inread() - 1);
    hooked_getlin_release_prompt();
}

/**
 * C topl.c tty_yn_function C('p') `:434–463`. Not getline.c
 * hooked_tty_getlin (`:105–141`, D-1611) and not command ^P (D-1601).
 *
 * non-'s' (full/combo/reversed): zero inread around one
 * tty_doprev_message, then clear + maxcol=maxrow + addtopl(prompt).
 * 's': do not zero inread; two calls the first time, then one; leave
 * the walk on screen. The next non-^P restores the prompt and is
 * discarded (C BUG comment — do not consume it as the yn answer).
 *
 * @param {number} c
 * @param {boolean} doprev
 * @param {() => Promise<void>} restorePrompt
 * @returns {Promise<{ skip: boolean, doprev: boolean }>}
 */
async function tty_yn_ctrl_p(c, doprev, restorePrompt) {
    if (c === GETLIN_CTRL_P) {
        const pm = String(game.iflags?.prevmsg_window || 's').charAt(0).toLowerCase();
        if (pm !== 's') {
            const sav = get_tty_inread();
            set_tty_inread(0);
            await tty_doprev_message();
            set_tty_inread(sav);
            await restorePrompt();
            return { skip: true, doprev: false };
        }
        if (!doprev) await tty_doprev_message(); /* need two initially */
        await tty_doprev_message();
        return { skip: true, doprev: true };
    }
    if (doprev) {
        await restorePrompt();
        return { skip: true, doprev: false };
    }
    return { skip: false, doprev };
}

/**
 * C topl.c tty_yn_function clean_up `:532–542`.
 * `if (yn_number) Sprintf(rtmp, "#%ld")` else `key2txt(q, rtmp)`;
 * rewrite `gt.toplines` to prompt+rtmp (not `addtopl`). DUMPLOG_CORE
 * `dumplogmsg` lives in `tty_yn_rewrite_toplines`. Leftover stays the
 * painted prompt. `cw->cury` clear / `ttyDisplay->intr` is D-1631
 * (`tty_yn_clean_up_tty`).
 * @param {string} prompt
 * @param {string} q
 * @returns {string}
 */
function tty_yn_clean_up(prompt, q) {
    let rtmp;
    if (game.yn_number) {
        rtmp = `#${game.yn_number}`;
    } else {
        const code = q == null || q === '' ? 0 : q.charCodeAt(0);
        rtmp = key2txt(code);
    }
    tty_yn_rewrite_toplines(`${prompt}${rtmp}`);
    tty_yn_clean_up_tty();
    return q;
}

/**
 * C cmd.c yn_function `:5496` CMDQ_KEY node — JS stores a string or
 * a char code; apply/dig/iactions clones still use typ `'key'`.
 * @param {{ typ?: number|string, key?: string|number } | null} cq
 * @returns {string}
 */
function yn_cmdq_key(cq) {
    const k = cq?.key;
    if (typeof k === 'string' && k.length) return k.charAt(0);
    if (typeof k === 'number') return String.fromCharCode(k & 0xff);
    return '\0';
}

/**
 * C cmd.c yn_menuable_resp `:5393–5399` — iflags.query_menu &&
 * window_inited && resp is one of the named decl.c tables (pointer
 * identity, not strcmp). JS interned `'yn'` is not ynchars.
 * @param {string|String|null|undefined} resp
 * @returns {boolean}
 */
function yn_menuable_resp(resp) {
    return !!(game.iflags?.query_menu && game.iflags?.window_inited
        && (resp === ynchars || resp === ynqchars || resp === ynaqchars
            || resp === rightleftchars || resp === hidespinchars));
}

/**
 * C cmd.c yn_func_menu_opt `:5401–5413` — add_menu a_char=key,
 * MENU_ITEMFLAGS_SELECTED when def==key. JS select_menu_pick_one
 * keeps a pre-assigned selector.
 * @param {object[]} items
 * @param {string} key
 * @param {string} text
 * @param {string} def
 */
function yn_func_menu_opt(items, key, text, def) {
    items.push({
        selectable: true,
        selector: key,
        a_char: key,
        text,
        itemflags: def === key
            ? MENU_ITEMFLAGS_SELECTED
            : MENU_ITEMFLAGS_NONE,
        selected: def === key,
    });
}

/**
 * C cmd.c yn_function_menu `:5416–5463` — NHW_MENU PICK_ONE then
 * pline(query, key2txt) + clear WIN_MESSAGE. Returns the chosen char
 * when the menu was shown; null when not menuable (caller uses
 * tty_yn_function). Cancel/space → def. PICK_ONE letter is that
 * a_char (C n>1 non-default when the preselected default stayed
 * selected is the same char).
 * @param {string} query
 * @param {string|String|null|undefined} resp
 * @param {string} def
 * @returns {Promise<string|null>}
 */
async function yn_function_menu(query, resp, def) {
    if (!yn_menuable_resp(resp)) return null;
    const items = [];
    if (resp === rightleftchars) {
        yn_func_menu_opt(items, 'r', 'Right', def);
        yn_func_menu_opt(items, 'l', 'Left', def);
    } else if (resp === hidespinchars) {
        yn_func_menu_opt(items, 'h', 'Hide', def);
        yn_func_menu_opt(items, 's', 'Spin a web', def);
    } else {
        yn_func_menu_opt(items, 'y', 'Yes', def);
        yn_func_menu_opt(items, 'n', 'No', def);
    }
    if (resp === ynaqchars) yn_func_menu_opt(items, 'a', 'All', def);
    if (resp === ynqchars || resp === ynaqchars || resp === hidespinchars) {
        yn_func_menu_opt(items, 'q', 'Quit', def);
    }
    const pick = await select_menu_pick_one(items);
    // C tty_select_menu clones the list; match a_char not object
    // identity. PICK_ONE letter → that a_char (n>1 non-default when
    // the preselected default stayed selected is the same char).
    // Cancel/space → def. Picking the preselected default toggles it
    // off (n==0) then *res=def — same as that letter.
    let res = def;
    if (pick.kind === 'pick' && pick.item?.a_char != null) {
        res = pick.item.a_char;
    }
    const code = !res || res === '\0' ? 0 : res.charCodeAt(0);
    await pline(`${query} ${key2txt(code)}`);
    await clear_nhwindow_message();
    return res;
}

/**
 * C hack.h y_n / ynq / ynaq / nyaq / YN — pass the named tables so
 * yn_menuable_resp identity holds. Remaining `'yn'` literals named.
 * @param {string} query
 * @returns {Promise<string>}
 */
export function y_n(query) {
    return yn_function(query, ynchars, 'n', true);
}
/** C hack.h ynq */
export function ynq(query) {
    return yn_function(query, ynqchars, 'q', true);
}
/** C hack.h ynaq */
export function ynaq(query) {
    return yn_function(query, ynaqchars, 'y', true);
}
/** C hack.h nyaq */
export function nyaq(query) {
    return yn_function(query, ynaqchars, 'n', true);
}
/** C hack.h YN — y_n without CQ_REPEAT */
export function YN(query) {
    return yn_function(query, ynchars, 'n', false);
}

/**
 * C ref: cmd.c yn_function `:5470–5583` — addcmdq pops canned/repeat
 * then records CQ_REPEAT. Default TRUE matches y_n / ynq / ynaq.
 * YN / getobj / getdir / paranoid_ynq / askchain pass FALSE.
 * getdir (lock.js + getdir_cmdassist / getdir_zap / dig_getdir) calls
 * this with NULL resp / '\0' def / FALSE (D-1721).
 * Windowport is tty_yn_function after yn_function_menu (D-1728).
 * debug_fuzzer USER_INPUT arm (`:5513–5530`) `rn2(20)` then `rn2(ln)`
 * and ESC retry; resp-mismatch `impossible` unless in_doagain &&
 * !wizard; `program_state.input_state = otherInp` (D-1805).
 * Named: SND_SPEECH (no soundlib — compiled out); DUMPLOG_CORE
 * (D-1776); paniclog file (Rule #2); remaining interned `'yn'`/`'ynq'`
 * callers (not the decl.c tables); hide+web hidespinchars in
 * domonability; getdir fuzzer (named omit after D-1806 help_dir).
 *
 * @param {string} query
 * @param {string|String|null} [resp]
 * @param {string} [def='n']
 * @param {boolean} [addcmdq=true]
 * @returns {Promise<string>}
 */
export async function yn_function(query, resp = ynchars, def = 'n', addcmdq = true) {
    if (!game.iflags) game.iflags = {};
    game.iflags.last_msg = PLNMSG_UNKNOWN;

    if (typeof query === 'string' && query.length >= QBUFSZ) {
        // C `:5488–5493` paniclog("Query truncated") then strncpy — file
        // omit (Rule #2); truncate matches.
        query = `${query.slice(0, QBUFSZ - 1 - 3)}...`;
    }

    let cq = addcmdq ? cmdq_pop() : null;
    if (!cq) {
        cq = { typ: CMDQ_USER_INPUT, key: '\0' };
    }

    let res = '\x1b';
    if (cq.typ !== CMDQ_USER_INPUT) {
        if (cq.typ === CMDQ_KEY || cq.typ === 'key') {
            res = yn_cmdq_key(cq);
        } else {
            cmdq_clear(CQ_CANNED);
        }
        addcmdq = false;
    /* C `:5513` — short-circuit before rn2 when fuzzer is off. */
    } else if (game.iflags.debug_fuzzer && resp && String(resp).length && rn2(20)) {
        const respStr = String(resp);
        const ln = respStr.length;
        let ridx = rn2(ln);
        res = respStr.charAt(ridx);
        if (res === '\x1b') {
            if (ln > 1) {
                ridx = (ridx === 0) ? (1 + rn2(ln - 1)) : rn2(ridx);
                res = respStr.charAt(ridx);
            } else {
                res = def;
            }
        }
    } else {
        const menuRes = await yn_function_menu(query, resp, def);
        if (menuRes !== null) {
            res = menuRes;
        } else {
            const ttyResp = (resp == null) ? resp : String(resp);
            res = await tty_yn_function(query, ttyResp, def);
        }
    }
    if (addcmdq) cmdq_add_key(CQ_REPEAT, res);

    // C `:5559–5579` — remap after REPEAT record; ESC when !def
    const hasResp = !!(resp && String(resp).length);
    const hasRes = !!(res && res !== '\0');
    if (hasResp && hasRes && !String(resp).includes(res)) {
        const altres = (def && def !== '\0') ? def : '\x1b';
        const wizard = !!(game.flags?.debug || game.flags?.wizard || game.wizard);
        if (!game.in_doagain || wizard) {
            const fuzzing = game.iflags.debug_fuzzer;
            game.iflags.debug_fuzzer = fuzzer_impossible_continue;
            await impossible(
                "yn_function() returned '%s'; using '%s' instead",
                visctrl(res.charCodeAt(0)),
                visctrl(altres.charCodeAt(0)),
            );
            game.iflags.debug_fuzzer = fuzzing;
        }
        res = altres;
    }
    if (!game.program_state) game.program_state = {};
    game.program_state.input_state = otherInp;
    return res;
}

/**
 * C ref: win/tty/topl.c tty_yn_function — query + [resp] + (def) + space.
 * Esc → 'q' if in resp else 'n' if in resp else def.
 * Quitchars (space/return) → def. Invalid keys bell and retry.
 * Ctrl-P walks tty_doprev_message (D-1612); do not glue onto getline ^P.
 *
 * Prompt paint uses show_topl/putsyms hard-wrap (SUPPRESS_HISTORY), not
 * update_topl word-wrap — see topl_wrap_echo.
 *
 * After a valid answer, C rewrites gt.toplines to prompt+key2txt (or
 * #yn_number) without addtopl (D-1623). Unwrapped leftover stays
 * painted (`cw->cury==0` skips clear). Wrapped prompts (`cury!=0`)
 * run tty_clear_nhwindow and drop leftover (D-1631). Silent
 * follow-ups keep the unwrapped leftover until rhack's parse clear.
 * When resp contains '#', digits collect C yn_number and return '#'.
 */
async function tty_yn_function(query, resp = 'yn', def = 'n') {
    await flush_topl_more();
    // C tty_yn_function: after optional more(), clear WIN_STOP|WIN_NOSTOP
    // before painting the prompt (topl.c).
    clear_win_stop();
    game.yn_number = 0;
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
    const allow_num = !!(resp && resp.includes('#'));
    const preserve = !!(resp && /[A-Z]/.test(resp));
    let doprev = false;
    const paint = async () => {
        // C: custompline(SUPPRESS_HISTORY) → tty_putstr → show_topl →
        // addtopl/putsyms — hard-wrap at CO-1 via topl_putsym (not
        // update_topl's word-wrap). An 80-char prompt ends with the
        // trailing space on row 1 and cursor at (1,1).
        const { text, col, row } = topl_wrap_echo(prompt, prompt.length);
        mark_topline_special_prompt(prompt);
        game._pending_message = text;
        await flush_screen(1);
        const disp = game.nhDisplay;
        if (disp?.setCursor) disp.setCursor(col, row);
        tty_yn_note_msg_cursor(col, row);
        // Capture leftover is the unwrapped prompt (D-0512); keep SPECIAL
        // so redotoplin more() is skipped during ^P (C otoplin).
        game._pending_message = prompt;
    };
    const restorePrompt = () => hooked_getlin_restore_prompt(paint);
    hooked_yn_begin();
    try {
        await paint();
        if (!resp) {
            const c = await nhgetch();
            return tty_yn_clean_up(prompt, String.fromCharCode(c));
        }
        for (;;) {
            const c = await nhgetch();
            let ch = String.fromCharCode(c);
            // Do not clear _pending_message here — C leaves the yn prompt.
            if (!preserve) ch = ch.toLowerCase();
            const handled = await tty_yn_ctrl_p(c, doprev, restorePrompt);
            doprev = handled.doprev;
            if (handled.skip) continue;
            if (c === 27) {
                if (resp.includes('q')) return tty_yn_clean_up(prompt, 'q');
                if (resp.includes('n')) return tty_yn_clean_up(prompt, 'n');
                // C: else q = def (may be '\0', e.g. rightleftchars)
                return tty_yn_clean_up(prompt, def);
            }
            if (ch === ' ' || c === 13 || c === 10) {
                return tty_yn_clean_up(prompt, def);
            }
            const digit_ok = allow_num && ch >= '0' && ch <= '9';
            if (!resp.includes(ch) && !digit_ok) {
                // C topl.c tty_yn_function `:475–478` tty_nhbell + q=0 retry
                tty_nhbell();
                continue;
            }
            if (ch === '#' || digit_ok) {
                const num = await yn_collect_number(prompt, ch, preserve);
                if (num == null) {
                    await paint();
                    continue;
                }
                if (num === 0) return tty_yn_clean_up(prompt, 'n');
                game.yn_number = num;
                return tty_yn_clean_up(prompt, '#');
            }
            if (resp.includes(ch)) {
                return tty_yn_clean_up(prompt, ch);
            }
            tty_nhbell();
        }
    } finally {
        hooked_yn_end();
    }
}

/**
 * C include/integer.h AppendLongDigit `:120–124`.
 * Contest hosts are LP64; JS Number is exact through 2^53. yn_number
 * gameplay stays below that; overflow still yields -1 and retries
 * without a bell (C `value < 0` break).
 * @param {number} L
 * @param {number} D
 * @returns {number}
 */
function AppendLongDigit(L, D) {
    const longMax = Number.MAX_SAFE_INTEGER;
    const q = Math.trunc(longMax / 10);
    const r = longMax % 10;
    if (L < q || (L === q && D <= r)) return L * 10 + D;
    return -1;
}

/** C topl.c tty_yn_function '#' / digit arm — yn_number. */
async function yn_collect_number(prompt, firstCh, preserve) {
    let echo = '#';
    let value = 0;
    if (firstCh !== '#') {
        echo += firstCh;
        value = firstCh.charCodeAt(0) - 48;
    }
    const paint = async () => {
        const raw = prompt + echo;
        const { text, col, row } = topl_wrap_echo(raw, raw.length);
        mark_topline_prompt(text);
        await flush_screen(1);
        const disp = game.nhDisplay;
        if (disp?.setCursor) disp.setCursor(col, row);
        tty_yn_note_msg_cursor(col, row);
    };
    await paint();
    for (;;) {
        const zc = await nhgetch();
        let z = String.fromCharCode(zc);
        if (!preserve) z = z.toLowerCase();
        if (z >= '0' && z <= '9') {
            const next = AppendLongDigit(value, z.charCodeAt(0) - 48);
            if (next < 0) return null;
            value = next;
            echo += z;
            await paint();
            continue;
        }
        if (z === 'y' || z === ' ' || zc === 13 || zc === 10) {
            return value;
        }
        if (zc === 27) return null;
        if (zc === 8 || zc === 127) {
            if (echo.length <= 1) return null;
            echo = echo.slice(0, -1);
            value = Math.trunc(value / 10);
            await paint();
            continue;
        }
        // C `:515–518` abort + tty_nhbell then removetopl retry
        tty_nhbell();
        return null;
    }
}
