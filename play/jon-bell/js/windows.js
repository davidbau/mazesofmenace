// windows.js — C ref: windows.c.
import { putstr } from './cmd.js'; // relocate-fns
import { cmdq_pop, doprev_message, pgetchar } from './cmd.js'; // relocate-fns
import { CMDQ_KEY, COLNO } from './const.js'; // relocate-fns
import { _topl_joins_snapshot, _topl_more_pages, flush_screen, force_more, restore_command_topline, restore_occupation_topline, topl_park_cursor, use_last_flush_snapshot } from './display.js'; // relocate-fns
import { game } from './gstate.js'; // relocate-fns
import { nhgetch } from './input.js'; // relocate-fns
import { pline } from './pline.js'; // relocate-fns
import { vision_recalc } from './vision.js'; // relocate-fns

export function add_menu(win, glyph, any, a, b, c, d, e, f) {}

export function select_menu(win, how, picksRef) {
    // Return values that simulate the user picking "blink" (ATR_BLINK=5)
    // with preselected "none" (ATR_NONE=0)
    if (picksRef && picksRef.val !== undefined) {
        picksRef.val = [{ item: { a_int: 1 } }, { item: { a_int: 6 } }];
    }
    return 2;
}

export function add_menu_str(win, buf) { putstr(win, 0, buf); }

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
    /* C has one gt.toplines: an eat occupation's committed flavor line is still
     * on it when cpostfx's polyself asks for a form (eat.c:1244-1263). */
    restore_occupation_topline();
    const renderPrompt = () => {
        g._pending_message = buf ? (prompt + ' ' + buf) : prompt;
        g._topl_prompt_written = prompt + ' ' + buf;
    };
    const placeCursor = () => {
        const d = g.nhDisplay;
        if (d) topl_park_cursor(d, prompt + ' ' + buf);
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
    g._prevmsg = prompt;
    const _saved_prompt_echo = g._topl_prompt_echo;
    const savedWritten = g._topl_prompt_written;
    g._topl_prompt_echo = true;
    /* C getline.c:67 custompline(OVERRIDE_MSGTYPE | SUPPRESS_HISTORY) and the
     * echo loop (getline.c:97 gt.toplines rebuild) never reach message
     * history; only the final "query answer" line is stored (see below). */
    const _saved_suppress = g._topl_suppress_history;
    g._topl_suppress_history = true;
    /* C windows.c:1898-1900 getlin() holds gb.bot_disabled over the window
     * port's getlin, so bot() paints nothing while the query is up. */
    const _saved_bot_disabled = g._bot_disabled;
    g._bot_disabled = true;
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
            if (pw === 's' || (pw === 'c' && !doprev)) {
                const hist = Array.isArray(g._msg_history) ? g._msg_history : [];
                if (hist.length) {
                    prevIdx = doprev ? (prevIdx - 1 + hist.length) % hist.length : hist.length - 1;
                    doprev = true;
                    const text = hist[prevIdx];
                    g._pending_message = text;
                    g._topl_prompt_written = text;
                    g._topl_history_recall = text;
                    await flush_screen(1);
                    const d = g.nhDisplay;
                    if (d) topl_park_cursor(d, text);
                    continue;
                }
            } else {
                // getline.c:121-137: full/reversed history includes the live
                // query, then restores the query and the existing input buffer.
                await doprev_message(prompt + ' ' + buf);
                renderPrompt();
                await flush_screen(1);
                placeCursor();
            }
        }
        doprev = false;
        /* ^C is not special here: it falls to the tty_nhbell() arm (getline.c:185). */
        if (keyCode === 27 /* ESC */) {
            if (buf.length > 0) {
                buf = '';
                renderPrompt();
                await flush_screen(1);
                placeCursor();
                continue;
            }
            g._pending_message = '';
            /* getline.c:80 rebuilt gt.toplines as "query " before this ESC read and
             * the cancel break leaves it there, so the ring gets the bare prompt. */
            if (!_saved_suppress) {
                const line = prompt + ' ';
                if (!g._msg_history) g._msg_history = [];
                const h = g._msg_history;
                h.push(line);
                g._toplEmptyAfterSuppress = false; /* gt.toplines = "query " */
            }
            return '\x1b'; /* ESC sentinel — C sets buf[0]='\033' */
        }
        if (keyCode === 13 /* CR */ || keyCode === 10 /* LF */) {
            break;
        }
        if (keyCode === 8 /* BS */ || keyCode === 127 /* DEL */) {
            if (buf.length > 0) buf = buf.slice(0, -1);
        } else if (keyCode >= 32 && keyCode < 127 && buf.length < COLNO) {
            /* getline.c:165-167 — bufp - obufp < BUFSZ - 1 && bufp - obufp < COLNO;
             * a longer line is refused (tty_nhbell) and the frame is unchanged. */
            buf += String.fromCharCode(keyCode);
        } else if (keyCode === 21 /* kill_char = VKILL = ^U */) {
            /* C getline.c:196-202 `else if (c == kill_char || c == '\177')`:
             * putsyms("\b \b") back to the start of the input, emptying the
             * line and leaving the bare prompt (the backspaces cross a wrapped
             * row).  0177 never gets here: it is the pty's erase_char and takes
             * the erase arm above first. */
            buf = '';
        }
        renderPrompt();
        await flush_screen(1);
        placeCursor();
    }
    g._pending_message = '';
    /* C getline.c:97 leaves "query answer" in gt.toplines; the history ring
     * receives that single line (tty_getlin is not suppress_history here). */
    if (!_saved_suppress) {
        const line = prompt + ' ' + buf;
        if (!g._msg_history) g._msg_history = [];
        const h = g._msg_history;
        h.push(line);
        /* getline.c:223-226 empties gt.toplines only when suppress_history;
         * otherwise ^P's first recall (topl.c:46,106) shows "query answer". */
        g._toplEmptyAfterSuppress = false;
    }
    return buf;
    } finally {
        g._topl_suppress_history = _saved_suppress;
        g._bot_disabled = _saved_bot_disabled;
        /* C getline.c:319 — the read loop is over; the topline stops being a
         * TOPLINE_SPECIAL_PROMPT.  Restored rather than cleared, because
         * js/cmd.js's '#' prompt calls getlin-shaped code with the flag
         * already set and owns its own clear. */
        g._topl_prompt_echo = _saved_prompt_echo;
        g._topl_prompt_written = savedWritten;
    }
}
