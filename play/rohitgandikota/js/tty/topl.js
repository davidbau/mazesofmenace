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
    const toplines = game._pending_message || '';   /* gt.toplines */
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
        game._pending_message = toplines + '  ' + bp;
        const painted = (game._topline_physical_prefix || '')
            + game._pending_message;
        game._topl_curx = painted.length;
        if (!skip) {
            addtopl(bp);
            paint_topline();    /* addtopl() -> topl_putsym: painted at once */
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
    game._toplines = bp;    /* gt.toplines: strncpy(gt.toplines, bp, TBUFSZ) */

    /* C wraps a message longer than CO by REPLACING a space with '\n', walking
       back from column CO - 1 to find one; a token longer than the whole line
       is split after instead. The newlines stay inside gt.toplines, which is
       how a long message ends up on two rows. */
    const out = wrap_topline(bp.slice(0, TBUFSZ - 1), CO);

    game._pending_message = out;
    /* "You die" is urgent and lifts an earlier ESC suppression. */
    if (!notdied) {
        game._win_stop = false;
        skip = false;
    }
    if (!skip)
        await redotoplin(out);
}

// win/tty/topl.c:229 addtopl() — append to the line already being shown.
// The paint is deferred to _buildScreenOutput(), which reads _pending_message,
// so there is nothing to do here beyond keeping the state flag C keeps.
function addtopl(bp) {
    game._toplin = TOPLINE_NEED_MORE;
}

// win/tty/topl.c:96 remember_topl() — push the current line into ^P history.
//
// gt.toplines is game._pending_message (see update_topl). The load-bearing
// part is not the history ring, which nothing reads yet, but the CLEAR: C
// empties toplines after banking it, and advances maxrow/maxcol around the
// ring. Leaving it set meant the previous message stayed live and could be
// appended to or re-painted after it should have been retired.
//
// Draws nothing.
function remember_topl() {
    const rows = game.iflags?.msg_history || 20;
    const idx = game._msg_maxrow || 0;
    const toplines = game._pending_message || '';

    /* WIN_LOCKHISTORY, or nothing to remember */
    if (game._win_lockhistory || !toplines)
        return;

    (game._msg_history ||= [])[idx] = toplines;

    /* program_state.in_checkpoint is never set on this path */
    game._pending_message = '';
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
    game._toplin = str ? TOPLINE_NEED_MORE : TOPLINE_EMPTY;
    game._topl_curx = 0;
    game._topl_cury = (str.match(/\n/g) || []).length;
    paint_topline();    /* home(); putsyms(str); cl_end(); — the tty paints
                           the message NOW, not at the next screen flush */
    if (game._topl_cury && otoplin !== TOPLINE_SPECIAL_PROMPT)
        await more();
}

// tty_putstr(..., ATR_NOHISTORY) takes the show_topl() path.  The displayed
// text is deliberately absent from gt.toplines, so a later ordinary message
// can append logically while the no-history prefix remains painted.
export function show_topl_nohistory(str) {
    remember_topl();
    if (game._win_stop)
        return;

    game._pending_message = '';
    game._topline_physical_prefix = str;
    game._topl_curx = str.split('\n').at(-1).length;
    game._topl_cury = (str.match(/\n/g) || []).length;
    game._toplin = game._topl_cury
        ? TOPLINE_NON_EMPTY : TOPLINE_NEED_MORE;
    paint_topline();
}

// include/decl.h TBUFSZ
const TBUFSZ = 300;

// win/tty/topl.c:365 tty_yn_function() — the generic prompt-and-read-a-key.
//
// Only the resp == NULL arm is ported, which is the one getspell() uses:
// "If resp is NULL, any single character is accepted and returned."
//
// The two pieces of state matter more than the read. A pending message is
// flushed through more() FIRST, so the prompt never lands on top of an
// unacknowledged line, and toplin goes to TOPLINE_SPECIAL_PROMPT, which is
// what stops the next message from joining onto the prompt text.
//
// Not ported: the resp filter (allowed characters, '#' for digits, an <esc>
// hiding the tail from the prompt), yn_number, and the doprev/^P history.
export async function tty_yn_function(query, resp, def) {
    /* win/tty/topl.c:391-393 — the pending-message more() is SKIPPED while
       WIN_STOP is set (the player already ESCed this turn's messages), and
       the flag is lifted either way: a question needs an answer. */
    if (game._toplin === TOPLINE_NEED_MORE && !game._win_stop)
        await more();
    game._win_stop = false;

    let prompt = query;
    if (resp) {
        /* win/tty/topl.c builds "<query> [<resp>] " and appends "(<def>) "
           when there is a default. The screen shows it as
           "... Ready it instead? [ynq] (q)". The '#' digits case and the
           <esc>-hides-the-tail case are not ported. */
        prompt += ` [${resp}]`;
        if (def && def !== '\0')
            prompt += ` (${def})`;
    }

    /* C includes a trailing space for a possible reprompt. It is enough to
       advance a 79-column question's logical cursor onto an empty second
       row, even though the visible cells contain only the question text. */
    const columns = game?.nhDisplay?.cols ?? 80;
    /* tty continuation rows retain the space that occupied the wrap column;
       update_topl replaces it logically, but the physical tty starts the
       continuation at column 1. */
    const renderedPrompt = wrap_topline(prompt + ' ', columns)
        .replace(/\n/g, '\n ');
    game._topline_physical_prefix = '';
    game._pending_message = renderedPrompt;
    game._toplin = TOPLINE_SPECIAL_PROMPT;
    paint_topline();

    const display = game?.nhDisplay;
    if (display) {
        const promptLines = renderedPrompt.split('\n');
        const cursorRow = promptLines.length - 1;
        const lastLineLength = promptLines[cursorRow].length;
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
        const vis = (q >= ' ' && q !== '\x7f') ? q : '';
        game._toplines = prompt + vis;   /* gt.toplines: ^P recall buffer */
        game._pending_message = '';
        game._toplin = TOPLINE_NON_EMPTY;
        return q;
    };

    /* src/botl.c — a status field dirtied this turn (Pw after a cast's
       energy deduction) repaints before the prompt blocks for input; C gets
       this from the pre-input flush's `if (disp.botl) bot()`. */
    {
        const { bot } = await import('../display.js');
        await bot();
    }

    /* with a resp string, only the listed characters (plus the quitchars) are
       accepted; anything else re-reads. */
    for (;;) {
        const c = await nhgetch();
        const ch = (typeof c === 'string') ? c : String.fromCharCode(c);
        if (!resp)
            return clean_up(ch);
        if (resp.includes(ch))
            return clean_up(ch);
        if (ch === '\x1b' || ch === '\r' || ch === '\n' || ch === ' ')
            return clean_up(def && def !== '\0' ? def : ch);
    }
}
