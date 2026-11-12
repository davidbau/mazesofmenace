// Canonical paranoid confirmation reader.  C ref: cmd.c:5588-5658.
// Kept dependency-light so death, equipment, combat, and command callers can
// share it without routing input through cmd.js/end.js cycles.
import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { nhgetch } from './input.js';
import { flush_screen, pline_flush_point, force_more, force_more_lone_frame, topl_park_cursor, tty_getlin_recall, tty_getlin_history, _topline_more_pending, restore_occupation_topline, putmsghistory, restore_command_topline } from './display.js';
import { yn_function_menu, doprev_message } from './cmd.js';
import { bot } from './botl.js';
import { vision_recalc } from './vision.js';
import { PARANOID_CONFIRM, BUFSZ, QBUFSZ, COLNO, MAX_MSG_HISTORY } from './const.js';

function mungspaces(s) {
    return String(s).trim().replace(/\s+/g, ' ');
}

async function read_getlin(prompt) {
    const g = game;
    let buf = '';
    /* hooked_tty_getlin first drains width-driven pages, then acknowledges
     * the final pending message window before replacing it with its prompt. */
    if (g._pending_message) {
        await flush_screen(1);
        if (g._pending_message)
            await force_more(g._pending_message);
    }
    /* hooked_tty_getlin's prompt replaces the topline (getline.c:51-56): a
     * message already shown there that did not need a --More-- (the shade's
     * "touches you again!" after the page was dismissed) is gone, and must
     * not be re-joined in front of the text printed after the answer. */
    g._resultMessage = null;
    g._resultMessageJoins = null;
    const savedEcho = g._topl_prompt_echo;
    const savedWritten = g._topl_prompt_written;
    const savedSuppress = g._topl_suppress_history;
    g._topl_suppress_history = true; // getline.c:67,80: echoes are not remembered
    g._topl_prompt_echo = true;
    /* C getline.c:67 custompline -> vpline (pline.c:266-272): the prompt's pline
     * consumes a pending vision_full_recalc before its flush_screen, so the
     * prompt freezes the map as of now (a hero just polymorphed into an eyeless
     * green slime no longer shows infravision-only monsters at "Die?"). */
    if (g.vision_full_recalc) vision_recalc(0);
    /* pline.c:282: custompline files the "%s " prompt in gp.prevmsg, so a later
     * identical Norep() is not suppressed. */
    g._prevmsg = `${prompt} `;
    const paint = async () => {
        g._pending_message = buf ? `${prompt} ${buf}` : prompt;
        g._topl_prompt_written = `${prompt} ${buf}`;
        await flush_screen(1);
        if (g.nhDisplay) topl_park_cursor(g.nhDisplay, `${prompt} ${buf}`);
    };
    const finish = (answer) => {
        // getline.c:80,213-226 leaves only the final query+answer in gt.toplines.
        g._pending_message = '';
        if (!savedSuppress) tty_getlin_history(`${prompt} ${buf}`);
        return answer;
    };
    try {
        await paint();
        let doprev = false, prevIdx = 0;
        for (;;) {
            const key = await nhgetch();
            if (key === 27 || key === 3) {
                if (buf) {
                    buf = '';
                    await paint();
                    continue;
                }
                return finish('\x1b');
            }
            if (key === 16) {
                /* ^P — C getline.c:106-119: msg_window:single (or combination
                 * behaving like single) recalls history onto the topline and
                 * keeps reading.  "Need two initially": the first call
                 * re-shows the live "query buffer" line (getline.c:80-82
                 * rebuild gt.toplines before every read), the second the
                 * newest data[] entry — and redotoplin's more() fires when
                 * that line wraps and the topline is not SPECIAL_PROMPT
                 * (topl.c:123-139), so a wrapped query pages "--More--" right
                 * after the echoed buffer (df-x15c4d9378c step 75). */
                const pw = (g.iflags?.prevmsg_window || 's')[0];
                if (pw === 's' || (pw === 'c' && !doprev)) {
                    const h = g._msg_history || [];
                    const hist = h;
                    const ring = Math.min(Math.max((g.iflags?.msg_history ?? 20) | 0, 20),
                                          MAX_MSG_HISTORY);
                    const flr = Math.max(0, hist.length - ring + 1);
                    const step = (i) => (i < 0 ? hist.length - 1
                        : (i - 1 < flr ? -1 : i - 1));
                    const recall = (i) => tty_getlin_recall(
                        i < 0 ? `${prompt} ${buf}` : hist[i]);
                    const sh = g._topl_suppress_history;
                    g._topl_suppress_history = true;
                    try {
                        let morc = !doprev ? await recall(-1) : 0;
                        if (hist.length) {
                            prevIdx = doprev ? step(prevIdx) : hist.length - 1;
                            while (morc === 16) {
                                morc = await recall(prevIdx);
                                prevIdx = step(prevIdx);
                            }
                            doprev = true;
                            while (await recall(prevIdx) === 16)
                                prevIdx = step(prevIdx);
                            /* getline.c:108-111's two tty_doprev_message() calls
                             * also advance the combination walk (topl.c:62-64); h
                             * (not the filtered hist) is what the else-arm counts. */
                            if (pw === 'c') {
                                g._prevmsg_history_length = h.length;
                                g._prevmsg_next = 0;
                                g._prevmsg_combo = hist.length >= 2 ? 2 : 0;
                            }
                        } else {
                            doprev = true;
                        }
                    } finally {
                        g._topl_suppress_history = sh;
                    }
                    continue;
                }
                /* getline.c:121-137 — msg_window:full/reverse (or combination
                 * behaving full): ONE blocking history window, then the query
                 * and buffer are re-added and the key falls through to normal
                 * processing. */
                await doprev_message(`${prompt} ${buf}`);
                g._prevmsg_combo = 0; /* getline.c:126 cw->maxcol = cw->maxrow */
                doprev = false;
                await paint();
            } else if (doprev) {
                /* getline.c:134-142 — any other key after a recall re-issues
                 * the query (clear_nhwindow + addtopl(query) + " " + buffer)
                 * before the key itself is processed. */
                doprev = false;
                await paint();
            }
            if (key === 10 || key === 13)
                return finish(buf);
            if (key === 8 || key === 127) {
                if (buf) buf = buf.slice(0, -1);
                await paint();
                continue;
            }
            /* getline.c:169: bufp - obufp < COLNO */
            if (key >= 32 && key <= 126 && buf.length < BUFSZ - 1 && buf.length < COLNO) {
                buf += String.fromCharCode(key);
                await paint();
            }
        }
    } finally {
        g._topl_suppress_history = savedSuppress;
        g._topl_prompt_echo = savedEcho;
        g._topl_prompt_written = savedWritten;
    }
}

async function read_yn(prompt, acceptQ) {
    const g = game;
    restore_command_topline();
    const choices = acceptQ ? 'ynq' : 'yn';
    /* C cmd.c:5513-5516 yn_function: for the fuzzer, usually force a valid
     * response (rn2(20) then rn2(len)); the rare 1-in-20 falls to the
     * windowport.  ESC is not in ynchars/ynqchars so no re-pick applies. */
    if (g.iflags?.debug_fuzzer && rn2(20)) {
        const res = choices[rn2(choices.length)];
        (g.program_state ||= {}).input_state = 0; // otherInp
        return res;
    }
    // C cmd.c:5640-5645 calls yn_function, whose query_menu route precedes tty input.
    const menuAnswer = await yn_function_menu(prompt, choices, 'n');
    if (menuAnswer !== null) return menuAnswer;
    const shown = `${prompt} [${choices}] (n)`;
    /* tty_yn_function acknowledges a fresh TOPLINE_NEED_MORE message even
     * when it fits on one line.  Buffer presence alone is insufficient: the
     * port also stores already-read command snapshots in _pending_message. */
    // Width paging reads earlier pages (clearing the input flag), but leaves
    // its final remainder needing acknowledgement before the question.
    const unacknowledged = g._topl_unacknowledged;
    /* Same held-result arm as end.js _yn_prompt: a line a command stashed into
     * _resultMessage (float_down's "You float gently..." + look_here, drawn
     * inside drop_upon_death) is still gt.toplines at TOPLINE_NEED_MORE, and
     * tty_yn_function (topl.c:389-392) pages it before the question. */
    if (g._resultMessage && !g._pending_message
        && !g._topl_win_stop && !g._topl_win_stop_armed
        && (prompt.length + choices.length + 3 + g._resultMessage.length + 3) >= 72) {
        const held = g._resultMessage;
        g._resultMessage = '';
        await force_more(held);
    }
    // tty_yn_function's more() precedes the prompt's flush (topl.c:390-420).
    // Drain deferred width pages without repainting the live map/status over
    // the last pline's physical screen before acknowledging the remainder.
    if (_topline_more_pending())
        await flush_screen(1, false);
    if (unacknowledged && g._pending_message)
        await force_more_lone_frame(g._pending_message);
    else if (unacknowledged && g._resultMessage) {
        /* C has one topline: float_down()'s "You float gently..." and look_here's
         * pile text (stashed in the result channel by do_wear.js) are still
         * TOPLINE_NEED_MORE when really_done raises "Save bones?" (topl.c:397). */
        const held = g._resultMessage;
        g._resultMessage = null;
        await force_more_lone_frame(held);
    }
    /* C tty_yn_function's flush after the --More-- paints the status with
     * disp.botl still set by done()'s force-HP-to-zero (end.c:1075), so the
     * zeroed HP shows while "Die?" is up. eat.js _done arms this for that one
     * query; the pre-query hold it lifts only covered the --More-- frame. */
    if (g._botlReleaseAtDieQuery) {
        g._botlReleaseAtDieQuery = false;
        g._botlHeldEat = false;
        await bot();
        await flush_screen(1);
    }
    /* tty_yn_function sets TOPLINE_SPECIAL_PROMPT: custompline hard-wraps a
     * long prompt (topl.c:412-420, topl_putsym) with no --More--. */
    const savedEcho = g._topl_prompt_echo;
    /* Only a prompt wider than the row takes the hard-wrap layout; a short
     * one keeps the ordinary topline/status path. */
    const wraps = topl_park_cursor(null, `${shown} `)[1] > 0;
    /* Same order as end.js _yn_prompt's long-question arm: custompline's
     * vpline flush_screen(1) (pline.c:274) precedes the wrapped text paint,
     * and yn_function sets no gb.bot_disabled (windows.c:1898 is getlin's),
     * so a pending botl/botlx — e.g. one a pick menu's select_menu dismissal
     * left (wintty.c:979 erase_menu_or_text -> docrt()) — paints there. */
    if (wraps) { pline_flush_point(); g._topl_prompt_echo = true; }
    try {
    /* C topl.c:420-425 custompline -> vpline (pline.c:266-272): a pending
     * vision_full_recalc is consumed before the prompt's flush_screen. */
    if (g.vision_full_recalc) vision_recalc(0);
    g._prevmsg = `${shown} `;
    g._pending_message = shown;
    /* pline.c:270-271 `if (u.ux) flush_screen()`: before the hero is placed
     * (mklev's "Get bones?") C's prompt reaches the topline without a bot(). */
    const _noBot = !g.u?.ux && !g._bot_disabled;
    if (_noBot) g._bot_disabled = true;
    try { await flush_screen(1); } finally { if (_noBot) g._bot_disabled = false; }
    if (g.nhDisplay) topl_park_cursor(g.nhDisplay, `${shown} `);
    } finally { g._topl_prompt_echo = savedEcho; }
    /* topl.c:545-546 — a prompt that wrapped (wins[WIN_MESSAGE]->cury) is
     * cleared on cleanup rather than left on the terminal. */
    const stick = () => {
        g._topl_sticky = topl_park_cursor(null, `${shown} `)[1] ? null : shown;
    };
    /* C topl.c:537-539 rewrites gt.toplines as prompt + key2txt(q) and
     * remember_topl() files THAT: the answered prompt, never the bare one. */
    const answered = (a) => {
        putmsghistory(`${shown} ${a}`, false);
        /* the bare prompt still on the topline is already filed as prompt + answer */
        g._topl_prompt_filed = shown;
        stick(); return a;
    };
    let doprev = false;
    for (;;) {
        const sh = g._topl_suppress_history;
        g._topl_suppress_history = true;
        let key;
        try { key = await nhgetch(); }
        finally { g._topl_suppress_history = sh; }
        /* C topl.c:432-459 — ^P recalls history.  msg_window:single recalls
         * twice (first time "need two initially") and the NEXT key is then
         * swallowed by the reprompt; the menu modes show the history window
         * once and re-add the prompt with no swallow. */
        if (key === 16) {
            const { doprev_message } = await import('./cmd.js');
            if ((g.iflags?.prevmsg_window || 's')[0] !== 's') {
                /* topl.c:435-442: tty_doprev_message() (blocking window), then
                 * tty_clear_nhwindow(WIN_MESSAGE) + addtopl(prompt); doprev
                 * stays 0, so the next key answers the re-added prompt. */
                await doprev_message();
                g._prevmsg_next = null; /* topl.c:441 cw->maxcol = cw->maxrow */
                g._pending_message = shown;
                await flush_screen(1);
                if (g.nhDisplay) topl_park_cursor(g.nhDisplay, `${shown} `);
                continue;
            }
            if (!doprev) await doprev_message();
            await doprev_message();
            /* redotoplin leaves the cursor after the recalled text. */
            if (g.nhDisplay) topl_park_cursor(g.nhDisplay, g._topl_history_recall || '');
            doprev = true;
            continue;
        } else if (doprev) {
            g._prevmsg_next = null; /* topl.c:456 cw->maxcol = cw->maxrow */
            g._pending_message = shown;
            await flush_screen(1);
            if (g.nhDisplay) topl_park_cursor(g.nhDisplay, `${shown} `);
            doprev = false;
            continue;
        }
        const c = String.fromCharCode(key).toLowerCase();
        if (c === 'y' || c === 'n' || (acceptQ && c === 'q'))
            return answered(c);
        if (key === 27)
            return answered(acceptQ ? 'q' : 'n');
        if (key === 32 || key === 10 || key === 13)
            return answered('n');
        /* nhgetch clears the logical topline, but tty keeps the already-painted
         * special prompt on screen while ringing the bell and re-reading. */
    }
}

/** Return exactly "y", "n", or "q"; ESC is "q" before accept_q normalization. */
export async function paranoid_ynq(be_paranoid, prompt, accept_q) {
    restore_occupation_topline();
    let c = 'n';
    if (be_paranoid) {
        const strict = !!((game.flags?.paranoia_bits | 0) & PARANOID_CONFIRM);
        const responseType = strict
            ? (accept_q ? '[yes|no|quit]' : '[yes|no]')
            : (accept_q ? '[yes|n|q] (n)' : '[yes|n] (n)');
        let pbuf = String(prompt).slice(0, BUFSZ - 1);
        let prefix = '';
        let trylimit = 6;
        do {
            const k = prefix.length + 1 + responseType.length;
            if (pbuf.length + k > QBUFSZ - 1)
                pbuf = pbuf.slice(0, Math.max(0, (QBUFSZ - 1) - k - 4)) + '...?';
            const ans = mungspaces(await read_getlin(`${prefix}${pbuf} ${responseType}`));
            if (ans.toLowerCase() === 'yes') {
                c = 'y';
                break;
            }
            if (ans.toLowerCase() === 'quit' || ans.charCodeAt(0) === 27) {
                c = 'q';
                break;
            }
            prefix = '"Yes" or "No": ';
            if (!strict || ans.toLowerCase() === 'no' || !--trylimit)
                break;
        } while (true);
    } else {
        c = await read_yn(String(prompt), !!accept_q);
    }
    return c === 'y' || (c === 'q' && accept_q) ? c : 'n';
}

export async function paranoid_query(be_paranoid, prompt) {
    return (await paranoid_ynq(be_paranoid, prompt, false)) === 'y';
}
