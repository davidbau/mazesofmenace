// pline.js — the message-composing wrappers around pline().
// C ref: src/pline.c
//
// pline() itself lives in js/display.js, where the tty topline state it drives
// already is. What belongs here is the family of prefixing helpers C keeps in
// pline.c: each one glues a literal onto the caller's text and hands the result
// to vpline. They are trivial, and that is exactly why they are worth having
// rather than open-coding the prefix at each call site -- "You " and "Your "
// carry a trailing space that is easy to lose.

import { pline } from './display.js';
import { game } from './gstate.js';
import { Deaf, Unaware, Underwater } from './youprop.js';

// src/pline.c:366 You()
export async function You(line) {
    await pline('You ' + line);
}

// src/pline.c:376 Your()
export async function Your(line) {
    await pline('Your ' + line);
}

// src/pline.c:388 You_feel() — "You feel " (or "You dream that you feel "
// when Unaware, which needs the sleep/unconsciousness state).
export async function You_feel(line) {
    await pline('You feel ' + line);
}

// src/pline.c:403 You_cant()
export async function You_cant(line) {
    await pline("You can't " + line);
}

// src/pline.c:436 You_hear() — the sound-message wrapper.
//
// Unlike the others above this one can print NOTHING. The early return is the
// whole point of the function: a deaf hero, or one who has turned the
// `acoustics` option off, gets no message at all, so a port that always
// printed would put a line on the top line that C never puts there. Since a
// top-line message can force a --More-- and eat a keystroke, that is not a
// cosmetic difference.
//
// The Deaf guard is `Deaf && !Unaware`, so an unconscious hero still "hears"
// (they dream it) -- which is why the Unaware arm exists below.
//
// js/sounds.c's dosounds() already draws the RNG for fountain and sink noises
// with the message commented out; those call sites can use this now.
export async function You_hear(line) {
    if ((Deaf() && !Unaware()) || game.flags?.acoustics === false)
        return;

    if (Underwater())
        await pline('You barely hear ' + line);
    else if (Unaware())
        await pline('You dream that you hear ' + line);
    else
        await pline('You hear ' + line);
}

// include/hack.h You_see() — "You see <line>".
export async function You_see(line) {
    await pline('You see ' + line);
}

// src/pline.c:93 set_msg_xy() — where the NEXT message is considered to happen.
//
// This feeds a11y.msg_loc, which only the accessibility message-location
// feature reads. It touches no cell of the 24x80 grid, so it is invisible to
// scoring; it exists so pline_xy below reads the way C reads.
export function set_msg_xy(x, y) {
    (game.a11y ||= {}).msg_loc = { x, y };
}

// src/pline.c:126 pline_xy() — pline() with a message location attached.
export async function pline_xy(x, y, line) {
    set_msg_xy(x, y);
    await pline(line);
}

// src/pline.c:414 pline_The()
export async function pline_The(line) {
    await pline('The ' + line);
}

// src/pline.c:425 There() — YouMessage with a "There " prefix.
export async function There(line) {
    await pline('There ' + line);
}


// src/pline.c Norep(): pline unless the text matches the preceding
// individual message. gp.prevmsg is separate from the tty's combined top
// line, which can contain several messages joined with two spaces.
export async function Norep(line) {
    if ((game._prevmsg || '') !== line)
        await pline(line);
}


// src/pline.c:531 gamelog_add() / :509 livelog_printf() — the #chronicle
// event list. Turn stamps come from svm.moves.
export function livelog_add(text) {
    (game.gamelog ||= []).push({ turn: game.moves | 0, text });
}
