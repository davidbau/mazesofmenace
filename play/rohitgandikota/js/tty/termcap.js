// termcap.js — the terminal capability strings the tty windowport writes.
// C ref: win/tty/termcap.c
//
// Only the colour table matters for a port whose output is compared byte for
// byte, and only one entry of it is surprising:
//
//     src/../win/tty/termcap.c:1010   hilites[CLR_GRAY] = nilstring;
//     src/../win/tty/termcap.c:1011   hilites[NO_COLOR] = nilstring;
//
// CLR_GRAY has NO escape sequence. term_start_color(CLR_GRAY) writes the empty
// string, so a gray glyph comes out in the terminal's default foreground and is
// indistinguishable from an uncoloured one. The same collapse is written three
// separate ways in termcap.c (the ANSI branch above, the TOS branch at :1210,
// and the AMIGA branch at :1201), so it is deliberate rather than incidental.
//
// This is not cosmetic. Gray is the single most common colour in the game:
// every goblin, every iron and mineral object, every rock. Emitting SGR 37 for
// them where C emits nothing makes those cells differ on colour alone while the
// character matches, which is invisible in the RNG stream and shows up only as
// a screen mismatch.

import { CLR_GRAY, NO_COLOR } from '../terminal.js';

// win/tty/termcap.c term_start_color() — the effective colour once hilites[]
// is applied. Returns NO_COLOR for anything that maps to the empty string.
export function term_start_color(color) {
    return (color === CLR_GRAY || color === NO_COLOR) ? NO_COLOR : color;
}
