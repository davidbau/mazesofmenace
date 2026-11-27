// windows.js — C ref: windows.c.
import { cmdq_pop, doprev_message, pgetchar } from './cmd.js'; // relocate-fns
import { CMDQ_KEY, COLNO, MAX_MSG_HISTORY, MENU_ITEMFLAGS_SKIPINVERT } from './const.js'; // relocate-fns
import { _topl_joins_snapshot, _topl_more_pages, flush_screen, force_more, restore_command_topline, restore_occupation_topline, topl_park_cursor, tty_getlin_echo, tty_getlin_history, tty_getlin_recall, use_last_flush_snapshot } from './display.js'; // relocate-fns
import { game } from './gstate.js'; // relocate-fns
import { nhgetch } from './input.js'; // relocate-fns
import { pline } from './pline.js'; // relocate-fns
import { vision_recalc } from './vision.js'; // relocate-fns
import { docorner_blank_utf8_captures, map_glyphinfo, render_map_row } from './display.js';
import { NO_COLOR } from './terminal.js';
import { MENU_ITEMFLAGS_SELECTED, MENU_ITEMFLAGS_SKIPMENUCOLORS } from './const.js';
import { config_error_add } from './cfgfiles.js';

// windows.c:267-337. The scored binary's only compiled window choice is tty;
// its callbacks are the JS tty/display adapters. Invalid rc choices keep the
// already selected interface and report through the normal configuration path.
export function choose_windows(name) {
    if (name.toLowerCase() === 'tty') return;
    const shown = name.length >= 50 ? name.slice(0, 49) : name;
    config_error_add('Window type %s not recognized.  The only choice is: %s', shown, 'tty');
}

// windows.c:199-202: the compiled tty port advertises suspend capability.
// Platform permission is checked separately by sys/share/ioctl.c:dosuspend.
export function genl_can_suspend_yes() {
    return true;
}

// C windows.c:1428-1435. The encoder's cookie is refreshed by moveloop_preamble.
export function encglyph(glyph) {
    const hex = n => (n >>> 0).toString(16).toUpperCase().padStart(4, '0');
    return '\\G' + hex(game.context.rndencode) + hex(glyph);
}

// C windows.c:1439-1461. Even a partial hex field can succeed; in particular,
// do not require eight hex digits when the accumulated cookie already matches.
export function decode_glyph(str, glyphRef) {
    let i = 0, cookie = 0, count = 0;
    const hex = ch => ch !== undefined && /^[0-9a-f]$/i.test(ch);
    for (; i < 4 && hex(str[i]); i++, count++)
        cookie = cookie * 16 + parseInt(str[i], 16);
    if (cookie !== (game.context.rndencode || 0)) return 0;
    glyphRef.val = 0;
    for (let n = 0; n < 4 && hex(str[i]); n++, i++, count++)
        glyphRef.val = glyphRef.val * 16 + parseInt(str[i], 16);
    return count;
}

// C windows.c:1466-1513. A failed glyph authentication leaves the whole escape
// intact; other escaped characters lose their backslash, except at end of text.
export function decode_mixed(str) {
    if (str == null) return '';
    let out = '';
    for (let i = 0; i < str.length;) {
        if (str[i] === '\\') {
            if (str[i + 1] === 'G') {
                const glyph = { val: 0 };
                const count = decode_glyph(str.slice(i + 2), glyph);
                if (count) {
                    const info = {};
                    map_glyphinfo(0, 0, glyph.val, 0, info);
                    // map_glyphinfo's ttychar is showsyms[gm.sym.symidx]
                    // (display.c:2653); the JS symbol table is composed there.
                    const ch = info.ttychar;
                    out += typeof ch === 'number' ? String.fromCharCode(ch) : ch;
                    i += count + 2;
                    continue;
                }
            } else if (i + 1 < str.length) {
                i++;
            }
        }
        out += str[i++];
    }
    return out;
}

// C windows.c:1562-1589. The caller supplies the current selection state;
// mode does not affect C's decision, including for bulk select/deselect.
export function menuitem_invert_test(mode, itemflags, is_selected) {
    if (!(itemflags & MENU_ITEMFLAGS_SKIPINVERT)) return true;
    if (game.iflags.menuinvertmode === 2) return false;
    if (game.iflags.menuinvertmode === 1) return !!is_selected;
    return true;
}

// TtyMenu objects are the JS window handles for these core menu wrappers.
// C windows.c:1785-1811: color the original text before tty_add_menu adds
// its accelerator, then consume the core-only SKIPMENUCOLORS flag.
export function add_menu(win, glyph, identifier, ch, gch, attr, color, str, itemflags) {
    if (str == null) return;
    const colorRef = { val: color }, attrRef = { val: attr };
    if (game.iflags.use_menu_color && !(itemflags & MENU_ITEMFLAGS_SKIPMENUCOLORS))
        get_menu_coloring(str, colorRef, attrRef);
    itemflags &= ~MENU_ITEMFLAGS_SKIPMENUCOLORS;
    attr = attrRef.val;
    win.add_menu(identifier?.a_int || 0, ch, attr === 7 ? 3 : attr === 3 ? 0 : attr,
                 str, !!(itemflags & MENU_ITEMFLAGS_SKIPINVERT),
                 !!(itemflags & MENU_ITEMFLAGS_SELECTED), gch, true);
    const row = win.mlist[win.mlist.length - 1];
    // tty's recorded terminal supplies bold, underline and reverse sequences.
    const sgr = { 1: 1, 4: 4, 7: 7 }[attr];
    if (sgr) row.sgr = [sgr];
    if (colorRef.val !== NO_COLOR)
        row.menuColor = { color: colorRef.val, attr: sgr || 0 };
}

export function get_menu_coloring(str, colorRef, attrRef) {
    // C windows.c:1841-1852: first matching rule in list order wins.
    if (game.iflags.use_menu_color)
        for (const rule of game.menu_colorings || [])
            if (rule.match.test(str)) {
                colorRef.val = rule.color;
                attrRef.val = rule.attr;
                return true;
            }
    return false;
}

export async function select_menu(win, how, picksRef) {
    // windows.c:1856-1864 holds bot_disabled across the whole window call.
    const old = game._bot_disabled;
    game._bot_disabled = true;
    try {
        const { count, picks } = await win.select_menu(how);
        picksRef.val = count > 0 ? picks.map(id => ({ item: { a_int: id },
            count: win.mlist.find(row => row.aInt === id).count })) : null;
        return count;
    } finally {
        game._bot_disabled = old;
    }
}

export function add_menu_str(win, buf) {
    add_menu(win, null, { a_int: 0 }, 0, 0, 0, NO_COLOR, buf, 0);
}

/* C win/tty/getline.c:210-212 — hooked_tty_getlin ends with
 *     clear_nhwindow(WIN_MESSAGE);   -- "clean up after ourselves"
 * which homes and cl_end()s the physical topline (wintty.c:1048-1056).  The
 * next flush rebuilds row 0 from the (now empty) message channels anyway, but
 * the terminal is blank from this instant: a delay_output frame taken before
 * that flush (a monster's m_throw right after a docall prompt was cancelled)
 * must not still show the prompt. */
function _getlin_clear_message_window(g) {
    const s = g._screen_output;
    // Both calls follow the prompt flush. Like C's WIN_MESSAGE, the screen
    // and display exist throughout getlin; there is no uninitialized arm.
    const rows = s.split('\n');
    /* wintty.c:1048-1056 tty_clear_nhwindow(WIN_MESSAGE): a prompt hard-wrapped
     * onto row 1 (cury > 0) also runs docorner(1, cury + 1, 0).  That docorner
     * cl_end()s rows 0..cury and then row_refresh(1, COLNO - 1, y - offy)
     * (display.c:2147) REPAINTS the gbuf map row under each spilled row — WIN_MAP's
     * offy is 1 (wintty.c:918), so screen row 1 shows map row 0 again.  It does
     * NOT stay blank: df-x1dfa16e4b9 step 85 shows the '#' of map row 0 back on
     * screen row 1 under the data.base window's left margin. */
    const wrapped = rows[0].replace(/\x1b\[[0-9;]*[A-Za-z]/g, '').length >= 78
        && String(g._topl_prompt_written ?? '').length >= 80
        && rows.length > 1 && g._topl_prompt_echo === true;
    rows[0] = '';
    /* row_refresh skips GLYPH_UNEXPLORED cells (display.c:2163-2185: `force`
     * compares gbuf[0][0], never shown and still nul_gbuf, so it is false),
     * so a custom S_unexplored stays erased on the spilled row. */
    /* row_refresh skips GLYPH_UNEXPLORED unless S_unexplored differs from
     * nul_gbuf (display.c:2163-2182): the cl_end()ed cells stay blank. */
    if (wrapped) {
        docorner_blank_utf8_captures(1, 2);
        rows[1] = render_map_row(0);
    }
    g._screen_output = rows.join('\n');
}

export async function getlin(prompt) {
    const g = game;
    let buf = '';
    // C windows.c:1868-1896: queued keys bypass the tty line editor.  A
    // repeat may supply answers saved by yn_function to this getlin instead;
    // preserve that behavior, including an unterminated sequence of keys.
    let got_cmdq = false, cmdq;
    while ((cmdq = cmdq_pop()) !== null) {
        if (cmdq.typ !== CMDQ_KEY) break;
        got_cmdq = true;
        if (cmdq.key === 10) break;
        buf += String.fromCharCode(cmdq.key);
    }
    if (got_cmdq) {
        await pline('%s %s', prompt, buf);
        return buf;
    }
    // windows.c:1897-1901 wraps the ENTIRE window-port call, including
    // getline.c:52-54's initial more(), not just the key-reading loop.
    const oldBotDisabled = g._bot_disabled;
    g.program_state.in_getlin = 1;
    g._bot_disabled = true;
    try {
    /* C has one gt.toplines: an eat occupation's committed flavor line is still
     * on it when cpostfx's polyself asks for a form (eat.c:1244-1263). */
    restore_occupation_topline();
    const renderPrompt = () => {
        // getline.c:80 rebuilds "query answer" even when the answer is empty.
        g._pending_message = prompt + ' ' + buf;
        g._topl_prompt_written = prompt + ' ' + buf;
    };
    const placeCursor = () => {
        tty_getlin_echo(g.nhDisplay, prompt, buf);
    };
    if (g._topl_unacknowledged && g._resultMessage && !g._pending_message
        && !g._topl_win_stop && !g._topl_win_stop_armed) {
        const held = String(g._resultMessage);
        g._resultMessage = '';
        const release = use_last_flush_snapshot();
        try { await force_more(held); } finally { release(); }
        g._topl_unacknowledged = false; /* more() leaves TOPLINE_EMPTY */
    }
    /* A command's result parked in the result channel (look_here's two
     * plines, joined past the more() width) is still the one shown topline
     * when a world-turn getlin (monpolycontrol's newcham prompt) opens; C
     * already paged it inside the command, so restore it to be more()d. */
    if (g._resultMessage && !g._pending_message && !g._topl_unacknowledged
        && !g._topl_win_stop && !g._topl_win_stop_armed)
        restore_command_topline();
    if (g._pending_message && !g._topl_win_stop && !g._topl_win_stop_armed) {
        /* Two different more()s, in C's order.  flush_screen() raises the
         * WIDTH-driven ones update_topl() would have raised as each message
         * arrived (the accumulated _pending_message is paged through
         * _topl_split_for_more and left holding the final remainder); the
         * force_more() after it is hooked_tty_getlin's own unconditional page
         * of that remainder.  Paging the whole accumulation in one force_more
         * instead renders it as a two-ROW topline, which is not a shape C's
         * tty ever produces. */
        const _live = String(g._pending_message);
        const _snap = g._toplResultSnapshot;
        /* hooked_tty_getlin's more() is tty_display_nhwindow-free: it does no
         * flush_screen, so a single-page topline pages over the map as of the
         * LAST flush (makemon's "A ryoshu appears" pline), not the live gbuf
         * (the newcham to Famine that follows in create_particular_creation). */
        if (_topl_more_pages(_live, _topl_joins_snapshot(_live)).length > 1) {
            // getline.c:53-54 pages before the query's custompline flush.
            // Drain deferred update_topl pages without flushing newer glyphs.
            await flush_screen(1, false);
            if (g._pending_message) {
                const release = use_last_flush_snapshot();
                try { await force_more(g._pending_message); } finally { release(); }
            }
        } else {
            const release = use_last_flush_snapshot();
            try { await force_more(g._pending_message); } finally { release(); }
        }
        if (_snap && g._resultMessage === _snap && _live.startsWith(_snap)) {
            g._resultMessage = null;
            g._resultMessageJoins = null;
            g._toplResultSnapshot = null;
        }
    }
    /* C getline.c:55 `cw->flags &= ~WIN_STOP;` — the ESC-at---More-- suppression
     * ends with the getlin, so a later tty_yn_function (fountain.c:204
     * "Dry up fountain?") pages the message the wish left on the topline. */
    g._topl_win_stop = false;
    g._topl_win_stop_armed = false;
    g._topl_win_stop_buf = null;
    /* C getline.c:66-67 custompline() overwrites the single gt.toplines buffer
     * with the query; a result message left on the topline (here one whose
     * update_topl was suppressed by WIN_STOP after ESC at a --More--) does not
     * survive the prompt to prefix the next pline. */
    if (g._resultMessage && !g._pending_message) {
        g._resultMessage = null;
        g._resultMessageJoins = null;
        g._toplResultSnapshot = null;
    }
    /* C hooked_tty_getlin displays the query through custompline(), whose
     * vpline() tail updates gp.prevmsg even though SUPPRESS_HISTORY keeps the
     * query out of message history.  Keep Norep's comparison state in sync. */
    /* C getline.c:66-67 -> pline.c putmesg() -> wintty.c:2290-2299
     * tty_putstr(WIN_MESSAGE, ATR_NOHISTORY): before show_topl() paints the
     * query, `remember_topl()` files whatever still stands on the topline
     * into the ^P ring (topl.c:170-191: one entry, exact repeats kept, an
     * empty gt.toplines returns early) and clears gt.toplines — so the
     * standing line's ring entry exists even though the prompt is never
     * remembered itself.  Skipping the filing lost the line C leaves in
     * gt.toplines after an ESC-dismissed page (df-xa5b54ebb2e: hooked_tty_
     * getlin skips its own more() under WIN_STOP — getline.c:53 — so the
     * "'autounlock' is still 'apply-key'." that update_topl:300 redotoplin'd
     * after the ESC was overwritten by the prompt unfiled, and a ^P inside
     * "Set crash_email to what?" recalled one entry too far back).
     * topl.c:189's maxcol=maxrow reset is the ^P walk anchor reset
     * (js/input.js): the walk restarts at the live query line. */
    if (g._pending_message && g._pending_message !== g._topl_history_recall) {
        (g._msg_history ||= []).push(String(g._pending_message));
        g._prevmsg_next = null;
    }
    g._prevmsg = prompt;
    const _saved_prompt_echo = g._topl_prompt_echo;
    const savedWritten = g._topl_prompt_written;
    g._topl_prompt_echo = true;
    /* C getline.c:67 custompline(OVERRIDE_MSGTYPE | SUPPRESS_HISTORY) and the
     * echo loop (getline.c:97 gt.toplines rebuild) never reach message
     * history; only the final "query answer" line is stored (see below). */
    const _saved_suppress = g._topl_suppress_history;
    g._topl_suppress_history = true;
    try {
    /* C getline.c:67 -> pline.c:266-272: the initial custompline refreshes
     * dirty vision before flushing the prompt; subsequent echoes do not. */
    if (g.vision_full_recalc)
        vision_recalc(0);
    renderPrompt();
    await flush_screen(1);
    placeCursor();
    let doprev = false, prevIdx = 0;
    while (true) {
        const keyCode = await pgetchar();
        /* C getline.c:106-119 ctrl-P with msg_window:single (or combination
         * behaving like single): recall earlier messages onto the topline and
         * keep reading; the first recall re-shows the query (the "need two
         * initially" call), later ones walk the history ring backwards. */
        if (keyCode === 16) {
            const pw = (g.iflags?.prevmsg_window || 's')[0];
            if (pw === 'c') {
                // combination walk can enter the history window INSIDE either
                // initial call when ^P acknowledges a wrapped recalled line
                // (topl.c:42-77). A single-mode index walk cannot model that.
                const live = prompt + ' ' + buf;
                const echo = g._topl_prompt_echo, written = g._topl_prompt_written;
                g._getlin_echo_state = null;
                g._topl_prompt_echo = false; // getline.c:107 inread = 0
                g._topl_prompt_written = undefined;
                g._getlin_toplines = live;
                try {
                    if (!doprev) {
                        g._prevmsg_window_shown = false;
                        await doprev_message(live);
                        await doprev_message(live);
                        /* getline.c:108-111 moves no cursor after the calls: a
                         * recalled line leaves it after the text (redotoplin),
                         * but when the combination walk reached the history
                         * window its dismissal's docrt() + flush_screen(1)
                         * (wintty.c:1975-1985) left it on the hero. */
                        if (g.nhDisplay && !g._prevmsg_window_shown)
                            topl_park_cursor(g.nhDisplay, g._topl_history_recall || '');
                        doprev = true;
                        continue;
                    }
                    await doprev_message(live);
                } finally {
                    g._getlin_toplines = null;
                    g._topl_prompt_echo = echo;
                    g._topl_prompt_written = written;
                }
                g._prevmsg_combo = 0; // getline.c:126 maxcol = maxrow
                g._getlin_echo_state = null;
                renderPrompt();
                await flush_screen(1);
                placeCursor();
            } else if (pw === 's') {
                const hist = Array.isArray(g._msg_history) ? g._msg_history : [];
                const _ring = Math.min(Math.max((g.iflags?.msg_history ?? 20) | 0, 20), MAX_MSG_HISTORY);
                const _floor = Math.max(0, hist.length - _ring + 1);
                const _step = (i) => (i < 0 ? hist.length - 1
                    : (i - 1 < _floor ? -1 : i - 1));
                const _recall = (i) => tty_getlin_recall(i < 0 ? prompt + ' ' + buf : hist[i]);
                /* topl.c:176 leaves maxcol alone when gt.toplines is empty.
                 * A canceled extended prompt can leave a walk in progress;
                 * getline.c:114-116 continues it, including both initial calls. */
                const start = g._prevmsg_history_length === hist.length
                    && g._prevmsg_next != null ? g._prevmsg_next : -1;
                let morc = !doprev ? await _recall(start) : 0;
                // getline.c:108-117 makes both initial calls even when the
                // ring is empty. topl.c:110-114 then resets to the live query;
                // a wrapped query therefore needs two --More-- dismissals.
                prevIdx = doprev ? _step(prevIdx) : _step(start);
                while (morc === 16) {
                    morc = await _recall(prevIdx);
                    prevIdx = _step(prevIdx);
                }
                doprev = true;
                while (await _recall(prevIdx) === 16)
                    prevIdx = _step(prevIdx);
                g._prevmsg_history_length = hist.length;
                g._prevmsg_next = _step(prevIdx);
                g._prevmsg_cycleEmpty = true; /* live query is outside hist */
                /* topl.c:103,116: each single-mode tty_doprev_message call ends
                 * with dismiss_more = 0, undoing an earlier ESC's 1
                 * (getline.c:245-247), so ^A no longer pages a --More--. */
                g._ttyDismissMore = 0;
                continue;
            } else {
                // getline.c:121-137: full/reversed history includes the live
                // query, then restores the query and the existing input buffer.
                await doprev_message(prompt + ' ' + buf);
                g._prevmsg_combo = 0; /* getline.c:126 cw->maxcol = cw->maxrow */
                g._getlin_echo_state = null; /* getline.c:126 clear_nhwindow */
                renderPrompt();
                await flush_screen(1);
                placeCursor();
            }
        }
        /* getline.c:85-95 breaks on ESC with empty input BEFORE the
         * doprev redraw/reset at :132-140. Other keys restart at the query. */
        if (doprev && keyCode !== -1 && !(keyCode === 27 && buf.length === 0)) g._prevmsg_next = null;
        doprev = false;
        /* ^C is not special here: it falls to the tty_nhbell() arm (getline.c:185). */
        if (keyCode === 27 /* ESC */ || keyCode === -1 /* signed char EOF */) {
            // getline.c:85-95: EOF cancels even with text already entered.
            // pgetchar returns char, so the byte 0xff reaches this same arm.
            if (keyCode === -1) g.iflags.term_gone = 1;
            if (keyCode === 27 && buf.length > 0) {
                buf = '';
                g._prevmsg_next = null; /* getline.c:92 cw->maxcol = cw->maxrow */
                g._getlin_echo_state = null; /* getline.c:88 clear_nhwindow */
                renderPrompt();
                await flush_screen(1);
                placeCursor();
                continue;
            }
            g._pending_message = '';
            _getlin_clear_message_window(g);
            /* getline.c:80 rebuilt gt.toplines as "query " + obufp before this
             * read and the cancel break leaves it there: the bare prompt for an
             * ESC (the buffer is empty here), but the typed text for an EOF —
             * the byte 0xff, which cancels with text entered (getline.c:84-95).
             * Mac macx intel w23g-025: "Call a ring of polymorph: q\xfc" then
             * \xff; ^P recalls "Call a ring of polymorph: q". */
            const line = prompt + ' ' + buf;
            tty_getlin_history(line);
            /* getline.c:81 gt.toplines ("query ") enters the ring verbatim,
             * never update_topl-wrapped: recall hard-wraps it (topl.c:121-142). */
            (g._getlin_hist ||= new Set()).add(line);
            return '\x1b'; /* ESC sentinel — C sets buf[0]='\033' */
        }
        if (keyCode === 13 /* CR */ || keyCode === 10 /* LF */) {
            break;
        }
        if (keyCode === 8 /* BS */ || keyCode === 127 /* DEL */) {
            if (buf.length > 0) buf = buf.slice(0, -1);
        } else if ((keyCode & 0xff) >= 32 && keyCode !== 127 && buf.length < COLNO) {
            /* getline.c:165-167 — bufp - obufp < BUFSZ - 1 && bufp - obufp < COLNO;
             * a longer line is refused (tty_nhbell) and the frame is unchanged. */
            buf += String.fromCharCode(keyCode & 0xff);
        } else if (keyCode === 21 /* kill_char = VKILL = ^U */) {
            /* C getline.c:196-202 `else if (c == kill_char || c == '\177')`:
             * putsyms("\b \b") back to the start of the input, emptying the
             * line and leaving the bare prompt (the backspaces cross a wrapped
             * row).  0177 never gets here: it is the pty's erase_char and takes
             * the erase arm above first. */
            buf = '';
        }
        renderPrompt();
        // getline.c:143-207 echoes edits with putsyms; it does not flush
        // map/status windows between input bytes. The incremental painter
        // also retains the rows erased while backing up across a wrap.
        placeCursor();
    }
    g._pending_message = '';
    _getlin_clear_message_window(g);
    /* C getline.c:97 leaves "query answer" in gt.toplines; the history ring
     * receives that single line (tty_getlin is not suppress_history here). */
    // tty_getlin sets its own suppress_history FALSE (getline.c:36), so
    // unlike the extended-command reader it always remembers this line.
    const line = prompt + ' ' + buf;
    tty_getlin_history(line);
    (g._getlin_hist ||= new Set()).add(line); /* unwrapped gt.toplines: ^P hard-wraps it */
    return buf;
    } finally {
        g._getlin_echo_state = null;
        g._topl_suppress_history = _saved_suppress;
        /* C getline.c:319 — the read loop is over; the topline stops being a
         * TOPLINE_SPECIAL_PROMPT.  Restored rather than cleared, because
         * js/cmd.js's '#' prompt calls getlin-shaped code with the flag
         * already set and owns its own clear. */
        g._topl_prompt_echo = _saved_prompt_echo;
        g._topl_prompt_written = savedWritten;
    }
    } finally {
        g._bot_disabled = oldBotDisabled;
        g.program_state.in_getlin = 0;
    }
}
