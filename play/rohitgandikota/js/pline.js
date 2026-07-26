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
