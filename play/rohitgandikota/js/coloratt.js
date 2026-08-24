// coloratt.js — color/attribute names.
// C ref: src/coloratt.c. Only the name tables and to-string helpers that
// options.c's get_val arms reach are here so far; the palette machinery
// (customcolors, rgb parsing) is not ported yet.

import {
    CLR_BLACK, CLR_RED, CLR_GREEN, CLR_BROWN, CLR_BLUE, CLR_MAGENTA,
    CLR_CYAN, CLR_GRAY, CLR_ORANGE, CLR_BRIGHT_GREEN, CLR_YELLOW,
    CLR_BRIGHT_BLUE, CLR_BRIGHT_MAGENTA, CLR_BRIGHT_CYAN, CLR_WHITE,
    NO_COLOR,
} from './terminal.js';
import {
    ATR_NONE, ATR_BOLD, ATR_DIM, ATR_ITALIC, ATR_ULINE, ATR_BLINK,
    ATR_INVERSE,
} from './tty/wintty.js';

// src/coloratt.c:12 colornames[] — entries after the null marker are
// aliases, accepted on input but never produced by clr2colorname().
const colornames = [
    ['black', CLR_BLACK],
    ['red', CLR_RED],
    ['green', CLR_GREEN],
    ['brown', CLR_BROWN],
    ['blue', CLR_BLUE],
    ['magenta', CLR_MAGENTA],
    ['cyan', CLR_CYAN],
    ['gray', CLR_GRAY],
    ['orange', CLR_ORANGE],
    ['light green', CLR_BRIGHT_GREEN],
    ['yellow', CLR_YELLOW],
    ['light blue', CLR_BRIGHT_BLUE],
    ['light magenta', CLR_BRIGHT_MAGENTA],
    ['light cyan', CLR_BRIGHT_CYAN],
    ['white', CLR_WHITE],
    ['no color', NO_COLOR],
];

// src/coloratt.c:47 attrnames[] — same shape; aliases dropped.
const attrnames = [
    ['none', ATR_NONE],
    ['bold', ATR_BOLD],
    ['dim', ATR_DIM],
    ['italic', ATR_ITALIC],
    ['underline', ATR_ULINE],
    ['blink', ATR_BLINK],
    ['inverse', ATR_INVERSE],
];

// src/coloratt.c:338 clr2colorname()
export function clr2colorname(clr) {
    for (const [name, color] of colornames)
        if (color === clr)
            return name;
    return null;
}

// src/coloratt.c:320 attr2attrname()
export function attr2attrname(attr) {
    for (const [name, a] of attrnames)
        if (a === attr)
            return name;
    return null;
}

// src/coloratt.c:249 color_attr_to_str() — "color&attr".
export function color_attr_to_str(ca) {
    return `${clr2colorname(ca.color)}&${attr2attrname(ca.attr)}`;
}
