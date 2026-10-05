// getline.js — tty line input and the --More-- key wait.
// C ref: win/tty/getline.c

import { game } from '../gstate.js';
import { nhgetch } from '../input.js';

// win/tty/getline.c:230 xwaitforspace() — block until one of the accepted keys.
//
// This is NOT "wait for any key", and the difference is visible on the very
// first frame of seed4500: at a --More-- the recorded session sends 'j', C
// rings the bell and keeps waiting, and only the following ' ' dismisses it. A
// port that takes any key eats the 'j', so that key never reaches the command
// loop and every later keystroke is interpreted one step early.
//
// Accepted: newline and carriage return always; under cbreak also ESC (which
// additionally latches dismiss_more so the REST of a multi-message sequence is
// skipped without further prompting), anything in `s`, and whatever
// dismiss_more currently holds. Everything else rings the bell and loops.
//
// morc records which key ended the wait; callers read it to tell ESC from a
// normal dismissal.
export async function xwaitforspace(s) {
    const x = game.ttyDisplay?.dismiss_more ?? 0;

    game.morc = 0;
    for (;;) {
        const c = await nhgetch();
        if (c === undefined || c === null)
            break;                              /* EOF */

        const ch = (typeof c === 'string') ? c : String.fromCharCode(c);

        if (ch === '\n' || ch === '\r')
            break;

        /* iflags.cbreak is on for every session we run */
        if (ch === '\x1b') {
            (game.ttyDisplay ||= {}).dismiss_more = 1;
            game.morc = '\x1b';
            break;
        }
        if ((s && s.includes(ch)) || (x !== 0 && ch === x)
            || (x === '\n' && ch === '\r')) {
            game.morc = ch;
            break;
        }
        tty_nhbell();
    }
}

// win/tty/wintty.c tty_nhbell() — the terminal bell. It writes \007, which
// changes no cell of the 24x80 grid, so it is a no-op for scoring; it exists
// so the ignore-and-loop path above reads the way C reads.
function tty_nhbell() {
}
