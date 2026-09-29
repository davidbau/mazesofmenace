// Canonical paranoid confirmation reader.  C ref: cmd.c:5588-5658.
// Kept dependency-light so death, equipment, combat, and command callers can
// share it without routing input through cmd.js/end.js cycles.
import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { flush_screen, force_more, topl_park_cursor,
         _topline_more_pending } from './display.js';
import { PARANOID_CONFIRM, BUFSZ, QBUFSZ } from './const.js';

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
            if (key >= 32 && key <= 126 && buf.length < BUFSZ - 1) {
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
        await force_more(g._pending_message);
    g._pending_message = shown;
    await flush_screen(1);
    if (g.nhDisplay) topl_park_cursor(g.nhDisplay, `${shown} `);
    for (;;) {
        const key = await nhgetch();
        const c = String.fromCharCode(key).toLowerCase();
        if (c === 'y' || c === 'n' || (acceptQ && c === 'q')) {
            g._topl_sticky = shown;
            return c;
        }
        if (key === 27) {
            g._topl_sticky = shown;
            return acceptQ ? 'q' : 'n';
        }
        if (key === 32 || key === 10 || key === 13) {
            g._topl_sticky = shown;
            return 'n';
        }
        /* nhgetch clears the logical topline, but tty keeps the already-painted
         * special prompt on screen while ringing the bell and re-reading. */
    }
}

/** Return exactly "y", "n", or "q"; ESC is "q" before accept_q normalization. */
export async function paranoid_ynq(be_paranoid, prompt, accept_q) {
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
