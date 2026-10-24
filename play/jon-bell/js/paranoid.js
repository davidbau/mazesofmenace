// Canonical paranoid confirmation reader.  C ref: cmd.c:5588-5658.
// Kept dependency-light so death, equipment, combat, and command callers can
// share it without routing input through cmd.js/end.js cycles.
import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { flush_screen, force_more, force_more_lone_frame, topl_park_cursor, bot,
         _topline_more_pending, restore_occupation_topline, putmsghistory } from './display.js';
import { vision_recalc } from './vision.js';
import { PARANOID_CONFIRM, BUFSZ, QBUFSZ, COLNO } from './const.js';

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
    g._topl_prompt_echo = true;
    const paint = async () => {
        g._pending_message = buf ? `${prompt} ${buf}` : prompt;
        await flush_screen(1);
        if (g.nhDisplay) topl_park_cursor(g.nhDisplay, `${prompt} ${buf}`);
    };
    try {
        await paint();
        for (;;) {
            const key = await nhgetch();
            if (key === 27 || key === 3) {
                if (buf) {
                    buf = '';
                    await paint();
                    continue;
                }
                return '\x1b';
            }
            if (key === 10 || key === 13)
                return buf;
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
        g._topl_prompt_echo = savedEcho;
    }
}

async function read_yn(prompt, acceptQ) {
    const g = game;
    const choices = acceptQ ? 'ynq' : 'yn';
    const shown = `${prompt} [${choices}] (n)`;
    /* tty_yn_function acknowledges a fresh TOPLINE_NEED_MORE message even
     * when it fits on one line.  Buffer presence alone is insufficient: the
     * port also stores already-read command snapshots in _pending_message. */
    // Width paging reads earlier pages (clearing the input flag), but leaves
    // its final remainder needing acknowledgement before the question.
    const unacknowledged = g._topl_unacknowledged;
    if (_topline_more_pending())
        await flush_screen(1);
    if (unacknowledged && g._pending_message)
        await force_more_lone_frame(g._pending_message);
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
    if (wraps) g._topl_prompt_echo = true;
    try {
    /* C topl.c:420-425 custompline -> vpline (pline.c:266-272): a pending
     * vision_full_recalc is consumed before the prompt's flush_screen. */
    if (g.vision_full_recalc) vision_recalc(0);
    g._prevmsg = `${shown} `;
    g._pending_message = shown;
    await flush_screen(1);
    if (g.nhDisplay) topl_park_cursor(g.nhDisplay, `${shown} `);
    } finally { g._topl_prompt_echo = savedEcho; }
    /* topl.c:545-546 — a prompt that wrapped (wins[WIN_MESSAGE]->cury) is
     * cleared on cleanup rather than left on the terminal. */
    const stick = () => {
        g._topl_sticky = topl_park_cursor(null, `${shown} `)[1] ? null : shown;
    };
    /* C topl.c:537-539 rewrites gt.toplines as prompt + key2txt(q) and
     * remember_topl() files THAT: the answered prompt, never the bare one. */
    const answered = (a) => { putmsghistory(`${shown} ${a}`, false); stick(); return a; };
    let doprev = false;
    for (;;) {
        const sh = g._topl_suppress_history;
        g._topl_suppress_history = true;
        let key;
        try { key = await nhgetch(); }
        finally { g._topl_suppress_history = sh; }
        /* C topl.c:432-459 — ^P recalls history (twice the first time); the next
         * key is swallowed by the reprompt. */
        if (key === 16) {
            const { doprev_message } = await import('./cmd.js');
            if (!doprev) await doprev_message();
            await doprev_message();
            /* redotoplin leaves the cursor after the recalled text. */
            if (g.nhDisplay) topl_park_cursor(g.nhDisplay, g._topl_history_recall || '');
            doprev = true;
            continue;
        } else if (doprev) {
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
