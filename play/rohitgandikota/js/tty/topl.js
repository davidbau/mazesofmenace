// topl.js — the tty top line (the message window).
// C ref: win/tty/topl.c
//
// This is the state machine that decides whether a new message joins the one
// already on screen, or forces a --More-- first. Getting it wrong is not a
// cosmetic problem: --More-- BLOCKS for a keystroke, so a port that skips it
// reads the player's next key as a command instead, and every later key is
// off by one.
//
// pline() itself is in js/display.js with the rest of the top-line painting;
// more() is too, and both are really topl.c functions that should live here.

import { game } from '../gstate.js';
import { more, TOPLINE_EMPTY, TOPLINE_NEED_MORE, TOPLINE_NON_EMPTY, TOPLINE_SPECIAL_PROMPT,
         paint_topline, tty_clear_nhwindow_message } from '../display.js';
import { nhgetch } from '../input.js';

function wrap_topline(text, columns) {
    let out = text;
    let tl = 0, n = out.length;
    while (n >= columns) {
        const otl = tl;
        let k = tl + columns - 1;
        for (; k !== otl; --k)
            if (out[k] === ' ')
                break;
        if (k === otl) {
            k = out.indexOf(' ', otl);
            if (k < 0)
                break;
        }
        out = out.slice(0, k) + '\n' + out.slice(k + 1);
        tl = k + 1;
        n = out.length - tl;
    }
    return out;
}

// win/tty/topl.c:251 update_topl() — put `bp` on the top line.
//
// The first branch is the one that is easy to miss. When a message is already
// waiting to be acknowledged and BOTH messages fit inside CO - 8 columns
// (leaving room for the --More-- that may still be needed), C does not prompt
// at all: it glues them together with two spaces and returns. Only when they
// do not fit does it call more() and block.
//
// That is why seed4500's greeting gets a --More--: it is 76 columns, the moon
// message is 30, and 76 + 30 + 3 is nowhere near under 72.
//
// "You die" is exempted from the joining branch so the death message always
// gets its own line.
export async function update_topl(bp) {
    const CO = game?.nhDisplay?.cols ?? 80;
    const n0 = bp.length;
    const toplines = game._toplines || '';          /* gt.toplines */
    const cury = game._topl_cury || 0;

    /* C assigns notdied inside the final term of the joining condition.
       When an earlier term fails, especially because an ESC-suppressed line
       has grown too long, that comparison is never reached. */
    let notdied = true;

    /* win/tty/topl.c:257 — WIN_STOP means the player pressed ESC at a
       --More-- this turn: buffer the text but do not paint it and do not
       prompt again. "You die" lifts the suppression. */
    let skip = !!game._win_stop;

    if ((game._toplin === TOPLINE_NEED_MORE || skip)
        && cury === 0
        && n0 + toplines.length + 3 < CO - 8   /* room for --More-- */
        && (notdied = bp.slice(0, 7) !== 'You die')) {
        game._toplines = toplines + '  ' + bp;
        if (!skip) {
            game._pending_message = game._toplines;
            const painted = (game._topline_physical_prefix || '')
                + game._pending_message;
            game._topl_curx = painted.length;
            game._toplin = TOPLINE_NEED_MORE;
            paint_topline();    /* same physical append that addtopl paints */
        } else {
            /* C still advances cw->curx by the two separating spaces, but
               addtopl() is not called, so none of the buffered text becomes
               terminal output while WIN_STOP is set. */
            game._topl_curx = (game._topl_curx || 0) + 2;
        }
        return;
    }

    if (!skip) {
        if (game._toplin === TOPLINE_NEED_MORE) {
            await more();
        } else if (cury) {
            /* docorner(1, cury + 1, 0) restores map rows covered by a
               wrapped prompt before the replacement message is painted. */
            tty_clear_nhwindow_message(cury);
            game._topl_curx = game._topl_cury = 0;
        }
    }

    remember_topl();
    /* C wraps a message longer than CO by REPLACING a space with '\n', walking
       back from column CO - 1 to find one; a token longer than the whole line
       is split after instead. The newlines stay inside gt.toplines, which is
       how a long message ends up on two rows. */
    const out = wrap_topline(bp.slice(0, TBUFSZ - 1), CO);

    game._toplines = out;   /* gt.toplines after strncpy() and wrapping */
    /* "You die" is urgent and lifts an earlier ESC suppression. */
    if (!notdied) {
        game._win_stop = false;
        skip = false;
    }
    if (!skip) {
        game._pending_message = out;
        await redotoplin(out);
    } else {
        /* gt.toplines retains suppressed text for ^P history, but C does not
           call redotoplin(), so the physical message window stays empty. */
        game._pending_message = '';
        game._topline_physical_prefix = '';
    }
}

// win/tty/topl.c:194 addtopl(), physical text without changing history.
function addtopl(bp) {
    const columns = game?.nhDisplay?.cols ?? 80;
    const lines = ((game._topline_physical_prefix || '')
                   + (game._pending_message || '')).split('\n');
    let x = game._topl_curx || 0, y = game._topl_cury || 0;
    for (const c of bp) {
        if (c === '\b') {
            if (x === 0 && y > 0) {
                x = columns;
                y--;
            }
            x--;
            continue;
        }
        if (c === '\n' || x === columns - 1) {
            lines[y] = (lines[y] || '').slice(0, x);
            x = 0;
            y++;
        }
        if (c === '\n')
            continue;
        lines[y] = (lines[y] || '').slice(0, x).padEnd(x, ' ') + c;
        x++;
    }
    lines[y] = (lines[y] || '').slice(0, x); // C addtopl(): cl_end(), including after newline/backspace.
    game._pending_message = lines.join('\n');
    game._topline_physical_prefix = '';
    game._topl_curx = x;
    game._topl_cury = y;
    paint_topline();
    game.nhDisplay?.setCursor(x, y);
    game._toplin = TOPLINE_NEED_MORE;
}

// win/tty/topl.c:354 removetopl(), erase each character with "\b \b".
function removetopl(n) {
    const columns = game?.nhDisplay?.cols ?? 80;
    const lines = (game._pending_message || '').split('\n');
    let x = game._topl_curx || 0, y = game._topl_cury || 0;
    while (n-- > 0) {
        if (x === 0 && y > 0) {
            y--;
            x = columns - 1;
        }
        x--;
        lines[y] = lines[y].slice(0, x);
    }
    game._pending_message = lines.join('\n');
    game._topl_curx = x;
    game._topl_cury = y;
    paint_topline();
    game.nhDisplay?.setCursor(x, y);
}

// win/tty/topl.c:96 remember_topl() — push the current line into ^P history.
//
// gt.toplines is game._toplines. It is logical message text and survives a
// physical clear of row zero, which is what lets ^P recall the current line.
// update_topl() banks it immediately before installing a replacement.
//
// Draws nothing.
export function remember_topl() {
    const rows = game.iflags?.msg_history || 20;
    const idx = game._msg_maxrow || 0;
    const toplines = game._toplines || '';

    /* WIN_LOCKHISTORY, or nothing to remember */
    if (game._win_lockhistory || !toplines)
        return;

    (game._msg_history ||= [])[idx] = toplines;

    /* program_state.in_checkpoint is never set on this path */
    game._toplines = '';
    game._msg_maxcol = game._msg_maxrow = (idx + 1) % rows;
}

// win/tty/topl.c:129 redotoplin() — repaint the line and set the flag that
// decides whether the NEXT message has to prompt first.
//
// putsyms() advances cury past every '\n' it writes, so a message long
// enough to wrap leaves cury > 0 and the tail of the function prompts
// immediately: a wrapped message always carries its own --More--, without
// waiting for a second message to collide with it.
async function redotoplin(str) {
    const otoplin = game._toplin;

    game._topline_physical_prefix = '';
    game._pending_message = str;
    game._toplin = str ? TOPLINE_NEED_MORE : TOPLINE_EMPTY;
    game._topl_curx = 0;
    game._topl_cury = (str.match(/\n/g) || []).length;
    paint_topline();    /* home(); putsyms(str); cl_end(); — the tty paints
                           the message NOW, not at the next screen flush */
    if (game._topl_cury && otoplin !== TOPLINE_SPECIAL_PROMPT)
        await more();
}

// win/tty/topl.c tty_doprev_message(), default msg_window:single path. The
// current logical top line is recalled first, then consecutive Ctrl-P
// commands walk backward through the circular history and wrap to current.
export async function doprev_message() {
    const rows = game.iflags?.msg_history || 20;
    const maxrow = game._msg_maxrow || 0;
    let maxcol = game._msg_maxcol;
    if (maxcol === undefined || maxcol === null)
        maxcol = maxrow;

    const str = maxcol === maxrow
        ? (game._toplines || '')
        : (game._msg_history?.[maxcol] || '');
    if (str)
        await redotoplin(str);

    maxcol--;
    if (maxcol < 0)
        maxcol = rows - 1;
    if (!game._msg_history?.[maxcol])
        maxcol = maxrow;
    game._msg_maxcol = maxcol;
    return 0;
}

// tty_putstr(..., ATR_NOHISTORY) takes the show_topl() path.  The displayed
// text is deliberately absent from gt.toplines, so a later ordinary message
// can append logically while the no-history prefix remains painted.
export function show_topl_nohistory(str) {
    remember_topl();
    if (game._win_stop)
        return;

    if (game._topl_cury && game._toplin === TOPLINE_NON_EMPTY)
        tty_clear_nhwindow_message(game._topl_cury);
    game._pending_message = '';
    game._topline_physical_prefix = '';
    game._topl_curx = game._topl_cury = 0;
    addtopl(str);
    game._topline_physical_prefix = game._pending_message;
    game._pending_message = '';
    game._toplin = game._topl_cury
        ? TOPLINE_NON_EMPTY : TOPLINE_NEED_MORE;
}

// include/decl.h TBUFSZ
const TBUFSZ = 300;

// win/tty/topl.c:365 tty_yn_function() — the generic prompt-and-read-a-key.
//
// A pending message is
// flushed through more() FIRST, so the prompt never lands on top of an
// unacknowledged line, and toplin goes to TOPLINE_SPECIAL_PROMPT, which is
// what stops the next message from joining onto the prompt text.
// The response filter and numeric '#' input are ported. The Ctrl-P history
// interaction is not yet ported.
export async function tty_yn_function(query, resp, def, addcmdq = false) {
    /* src/cmd.c:5487 yn_function(), repeatable questions consume their
       saved answer before invoking the window port. There is deliberately
       no prompt frame during Ctrl-A replay. getdir(), getobj(), and a few
       parsing-only callers pass addcmdq=false and manage input themselves. */
    if (addcmdq) {
        const { cmdq_pop, cmdq_clear } = await import('../cmd.js');
        const { CMDQ_KEY, CQ_CANNED } = await import('../const.js');
        const queued = cmdq_pop();
        if (queued) {
            let ch = '\x1b';
            if (queued.typ === CMDQ_KEY)
                ch = queued.key;
            else
                cmdq_clear(CQ_CANNED);
            if (resp && !resp.includes(ch))
                ch = (def && def !== '\0') ? def : '\x1b';
            return ch;
        }
    }

    game.yn_number = 0;

    /* win/tty/topl.c:391-393 — the pending-message more() is SKIPPED while
       WIN_STOP is set (the player already ESCed this turn's messages), and
       the flag is lifted either way: a question needs an answer. */
    if (game._toplin === TOPLINE_NEED_MORE && !game._win_stop)
        await more();
    game._win_stop = false;

    /* custompline() prepares the map after any pending --More-- has been
       acknowledged. This ordering preserves temporary effects under the
       --More-- frame, then exposes terrain changes beneath the prompt. */
    if (game.vision_full_recalc) {
        const { vision_recalc } = await import('../vision.js');
        vision_recalc(0);
    }
    if (game.u?.ux) {
        const { flush_screen } = await import('../display.js');
        await flush_screen(1);
    }

    let prompt = query;
    if (resp) {
        /* win/tty/topl.c builds "<query> [<resp>] " and appends "(<def>) "
           when there is a default. The screen shows it as
           "... Ready it instead? [ynq] (q)". Choices after ESC remain
           acceptable but aren't displayed (win/tty/topl.c:410). */
        prompt += ` [${resp.split('\x1b')[0]}]`;
        if (def && def !== '\0')
            prompt += ` (${def})`;
    }

    /* C includes a trailing space for a possible reprompt. It is enough to
       advance a 79-column question's logical cursor onto an empty second
       row, even though the visible cells contain only the question text. */
    const columns = game?.nhDisplay?.cols ?? 80;
    /* SUPPRESS_HISTORY routes this through show_topl(), whose putsyms()
       hard-wraps before column CO rather than using update_topl()'s word
       wrapping. */
    const promptText = prompt + ' ';
    const promptWidth = columns - 1;
    const promptLines = [];
    for (let start = 0; start < promptText.length; start += promptWidth)
        promptLines.push(promptText.slice(start, start + promptWidth));
    const renderedPrompt = promptLines.join('\n');
    game._topline_physical_prefix = '';
    game._pending_message = renderedPrompt;
    game._toplin = TOPLINE_SPECIAL_PROMPT;
    paint_topline();

    const display = game?.nhDisplay;
    if (display) {
        const renderedLines = renderedPrompt.split('\n');
        const cursorRow = renderedLines.length - 1;
        const lastLineLength = renderedLines[cursorRow].length;
        game._topl_curx = lastLineLength;
        game._topl_cury = cursorRow;
        /* The tty's clear-to-EOL fallback parks column 1 on an empty wrapped
           row; the recorder captures that logical cursor position. */
        display.setCursor(lastLineLength || (cursorRow ? 1 : 0), cursorRow);
    }

    /* win/tty/topl.c:533 clean_up — the answered prompt (plus the visible
       form of the answer key) becomes the topline text, flagged NON_EMPTY so
       the NEXT key read erases it before its boundary frame. */
    const clean_up = (q) => {
        const vis = game.yn_number ? `#${game.yn_number}`
            : (q >= ' ' && q !== '\x7f') ? q : '';
        game._toplines = promptText + vis;   /* gt.toplines: ^P recall buffer */
        game._pending_message = '';
        game._toplin = TOPLINE_NON_EMPTY;
        /* win/tty/topl.c clears the message window here when the prompt
           wrapped onto a continuation row. */
        if (promptLines.length > 1) {
            tty_clear_nhwindow_message(promptLines.length - 1);
            game._topl_curx = game._topl_cury = 0;
        }
        return q;
    };

    /* src/botl.c — a status field dirtied this turn (Pw after a cast's
       energy deduction) repaints before the prompt blocks for input; C gets
       this from the pre-input flush's `if (disp.botl) bot()`. */
    {
        const { bot } = await import('../display.js');
        await bot();
    }

    /* win/tty/topl.c:430 — with a resp string the answer is lowercased
       unless the allowed responses contain an uppercase letter; ESC picks
       'q' or 'n' when allowed and the default otherwise; space, return and
       newline pick the default; a '#' or a digit (when '#' is allowed)
       reads a count; anything else rings the bell and reads again. */
    const allow_num = !!resp && resp.includes('#');
    const preserve_case = !resp || /[A-Z]/.test(resp);
    const quitchars = ' \r\n\x1b';
    for (;;) {
        const c = await nhgetch();
        let ch = (typeof c === 'string') ? c : String.fromCharCode(c);
        let answer = null;
        if (!resp) {
            answer = ch;
        } else {
            if (!preserve_case)
                ch = ch.toLowerCase();
            const digit_ok = allow_num && /^[0-9]$/.test(ch);
            if (ch === '\x1b') {
                answer = resp.includes('q') ? 'q'
                       : resp.includes('n') ? 'n'
                         : def;
            } else if (quitchars.includes(ch)) {
                answer = def;
            } else if (!resp.includes(ch) && !digit_ok) {
                /* tty_nhbell(); try again */
            } else if (ch === '#' || digit_ok) {
                let n_len = 0, value = 0;
                let z;
                addtopl('#'); n_len++;
                if (ch !== '#') {
                    addtopl(ch); n_len++;
                    value = ch.charCodeAt(0) - 48;
                    ch = '#';
                }
                do { /* loop until we get a non-digit */
                    const zc = await nhgetch();
                    z = (typeof zc === 'string') ? zc : String.fromCharCode(zc);
                    if (!preserve_case)
                        z = z.toLowerCase();
                    if (/^[0-9]$/.test(z)) {
                        value = value * 10 + (z.charCodeAt(0) - 48);
                        if (value > 2147483647) { /* AppendLongDigit overflow */
                            value = -1;
                            break; /* overflow: try again */
                        }
                        addtopl(z); n_len++;
                    } else if (z === 'y' || quitchars.includes(z)) {
                        if (z === '\x1b')
                            value = -1; /* abort */
                        z = '\n';       /* break */
                    } else if (z === '\x7f' || z === '\b') {
                        if (n_len <= 1) {
                            value = -1;
                            break;
                        } else {
                            value = Math.trunc(value / 10);
                            removetopl(1); n_len--;
                        }
                    } else {
                        value = -1; /* abort */
                        break;
                    }
                } while (z !== '\n');
                if (value > 0)
                    game.yn_number = value;
                else if (value === 0)
                    ch = 'n'; /* 0 => "no" */
                else {       /* remove number from top line, then try again */
                    removetopl(n_len); n_len = 0;
                    ch = '\0';
                }
                if (ch !== '\0')
                    answer = ch;
            } else {
                answer = ch;
            }
        }
        if (answer !== null) {
            if (addcmdq && !game.in_doagain) {
                const { cmdq_add_key } = await import('../cmd.js');
                const { CQ_REPEAT } = await import('../const.js');
                cmdq_add_key(CQ_REPEAT, answer);
            }
            return clean_up(answer);
        }
    }
}

// win/tty/topl.c:452 tty_putmsghistory(msg, FALSE) — remember a line without
// displaying it: the current top line moves to history and this becomes the
// most recent one.
export function putmsghistory(msg) {
    if (msg) {
        /* Caller is asking us to remember a top line that needed more.
           Should we call more?  This can happen when the player has set
           iflags.force_invmenu and they attempt to shoot with nothing in
           the quiver. */
        if (game._toplin === TOPLINE_NEED_MORE)
            game._toplin = TOPLINE_NON_EMPTY;
        /* move most recent message to history, make this become most recent */
        remember_topl();
        game._toplines = msg;
    }
}
