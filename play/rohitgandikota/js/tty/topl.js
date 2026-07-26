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
import { more, TOPLINE_EMPTY, TOPLINE_NEED_MORE } from '../display.js';

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

    /* strncmp(bp, "You die", 7) != 0 */
    const notdied = bp.slice(0, 7) !== 'You die';

    if (game._toplin === TOPLINE_NEED_MORE
        && cury === 0
        && n0 + toplines.length + 3 < CO - 8   /* room for --More-- */
        && notdied) {
        game._pending_message = toplines + '  ' + bp;
        game._topl_curx = (game._topl_curx || 0) + 2;
        addtopl(bp);
        return;
    }

    if (game._toplin === TOPLINE_NEED_MORE) {
        await more();
    } else if (cury) {
        /* docorner(1, cury + 1, 0) — reset cury to 0 if the screen is redrawn */
        game._topl_curx = game._topl_cury = 0;
    }

    remember_topl();

    /* C wraps a message longer than CO by REPLACING a space with '\n', walking
       back from column CO - 1 to find one; a token longer than the whole line
       is split after instead. The newlines stay inside gt.toplines, which is
       how a long message ends up on two rows. */
    let out = bp.slice(0, TBUFSZ - 1);
    {
        let tl = 0, n = n0;
        while (n >= CO) {
            const otl = tl;
            let k = tl + CO - 1;
            for (; k !== otl; --k)
                if (out[k] === ' ')
                    break;
            if (k === otl) {
                /* Eek!  A huge token.  Try splitting after it. */
                const sp = out.indexOf(' ', otl);
                if (sp < 0)
                    break;              /* No choice but to spit it out whole. */
                k = sp;
            }
            out = out.slice(0, k) + '\n' + out.slice(k + 1);
            tl = k + 1;
            n = out.length - tl;
        }
    }

    game._pending_message = out;
    redotoplin(out);
}

// win/tty/topl.c:229 addtopl() — append to the line already being shown.
// The paint is deferred to _buildScreenOutput(), which reads _pending_message,
// so there is nothing to do here beyond keeping the state flag C keeps.
function addtopl(bp) {
    game._toplin = TOPLINE_NEED_MORE;
}

// win/tty/topl.c:96 remember_topl() — push the current line into ^P history.
// The history buffer is not modelled yet; nothing reads it.
function remember_topl() {
    (game.unported ||= new Set()).add('topl:remember_topl');
}

// win/tty/topl.c:196 redotoplin() — repaint the line and set the flag that
// decides whether the NEXT message has to prompt first.
function redotoplin(str) {
    game._toplin = str ? TOPLINE_NEED_MORE : TOPLINE_EMPTY;
    game._topl_curx = 0;
    game._topl_cury = (str.match(/\n/g) || []).length;
}

// include/decl.h TBUFSZ
const TBUFSZ = 300;
