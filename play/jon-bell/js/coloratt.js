// coloratt.js — Menu coloring management.
// C ref: coloratt.c free_menu_coloring() (line 652).
// @ts-nocheck — js sibling imports.
import { game } from './gstate.js';
import { regcomp, regex_error_desc } from './posixregex.js';
import { config_error_add } from './cfgfiles.js';
import { fuzzymatch, mungspaces } from './hacklib.js';
import {
    ATR_NONE,
    CLR_BLACK, CLR_RED, CLR_GREEN, CLR_BROWN, CLR_BLUE, CLR_MAGENTA, CLR_CYAN, CLR_GRAY,
    CLR_ORANGE, CLR_BRIGHT_GREEN, CLR_YELLOW, CLR_BRIGHT_BLUE, CLR_BRIGHT_MAGENTA,
    CLR_BRIGHT_CYAN, CLR_WHITE, NO_COLOR
} from './terminal.js';
import { SIZE, PICK_ONE, PICK_ANY } from './const.js';
import { add_menu, select_menu } from './windows.js';
import { MENU_ITEMFLAGS_SELECTED } from './const.js';
import { TtyMenu } from './tty_menu.js'; // relocate-fns

// Data structures from coloratt.c
// static const struct color_names colornames[] = { ... } (lines 12-40)
export const colornames = [
    { name: "black", color: CLR_BLACK },
    { name: "red", color: CLR_RED },
    { name: "green", color: CLR_GREEN },
    { name: "brown", color: CLR_BROWN },
    { name: "blue", color: CLR_BLUE },
    { name: "magenta", color: CLR_MAGENTA },
    { name: "cyan", color: CLR_CYAN },
    { name: "gray", color: CLR_GRAY },
    { name: "orange", color: CLR_ORANGE },
    { name: "light green", color: CLR_BRIGHT_GREEN },
    { name: "yellow", color: CLR_YELLOW },
    { name: "light blue", color: CLR_BRIGHT_BLUE },
    { name: "light magenta", color: CLR_BRIGHT_MAGENTA },
    { name: "light cyan", color: CLR_BRIGHT_CYAN },
    { name: "white", color: CLR_WHITE },
    { name: "no color", color: NO_COLOR },
    { name: null, color: CLR_BLACK }, // everything after this is an alias
    { name: "transparent", color: NO_COLOR },
    { name: "purple", color: CLR_MAGENTA },
    { name: "light purple", color: CLR_BRIGHT_MAGENTA },
    { name: "bright purple", color: CLR_BRIGHT_MAGENTA },
    { name: "grey", color: CLR_GRAY },
    { name: "bright red", color: CLR_ORANGE },
    { name: "bright green", color: CLR_BRIGHT_GREEN },
    { name: "bright blue", color: CLR_BRIGHT_BLUE },
    { name: "bright magenta", color: CLR_BRIGHT_MAGENTA },
    { name: "bright cyan", color: CLR_BRIGHT_CYAN }
];

// static const struct attr_names attrnames[] = { ... } (lines 47-59)
// NOTE: hardcoded to sequential ATR_* values matching C (0,1,2,3,4,5,7)
export const attrnames = [
    { name: "none", attr: 0 },      // ATR_NONE
    { name: "bold", attr: 1 },      // ATR_BOLD
    { name: "dim", attr: 2 },       // ATR_DIM
    { name: "italic", attr: 3 },    // ATR_ITALIC
    { name: "underline", attr: 4 }, // ATR_ULINE
    { name: "blink", attr: 5 },     // ATR_BLINK
    { name: "inverse", attr: 7 },   // ATR_INVERSE
    { name: null, attr: 0 },        // ATR_NONE — everything after this is an alias
    { name: "normal", attr: 0 },    // ATR_NONE
    { name: "uline", attr: 4 },     // ATR_ULINE
    { name: "reverse", attr: 7 }    // ATR_INVERSE
];

const no_color = 0;
const nh_color = 1;
const rgb_color = 2;

export const colortable = [
    { colortyp: 1, tableindex: 0, rgbindex: 0, name: "black", r: 0x00, g: 0x00, b: 0x00 },
    { colortyp: 1, tableindex: 1, rgbindex: 0, name: "red", r: 0xFF, g: 0x00, b: 0x00 },
    { colortyp: 1, tableindex: 2, rgbindex: 0, name: "green", r: 0x22, g: 0x8B, b: 0x22 },
    { colortyp: 1, tableindex: 3, rgbindex: 0, name: "brown", r: 0xA5, g: 0x2A, b: 0x2A },
    { colortyp: 1, tableindex: 4, rgbindex: 0, name: "blue", r: 0x00, g: 0x00, b: 0xFF },
    { colortyp: 1, tableindex: 5, rgbindex: 0, name: "magenta", r: 0xFF, g: 0x00, b: 0xFF },
    { colortyp: 1, tableindex: 6, rgbindex: 0, name: "cyan", r: 0x00, g: 0xFF, b: 0xFF },
    { colortyp: 1, tableindex: 7, rgbindex: 0, name: "gray", r: 0x80, g: 0x80, b: 0x80 },
    { colortyp: 0, tableindex: 8, rgbindex: 0, name: "nocolor", r: 0x00, g: 0x00, b: 0x00 },
    { colortyp: 1, tableindex: 9, rgbindex: 0, name: "orange", r: 0xFF, g: 0xA5, b: 0x00 },
    { colortyp: 1, tableindex: 10, rgbindex: 0, name: "bright-green", r: 0x00, g: 0x80, b: 0x00 },
    { colortyp: 1, tableindex: 11, rgbindex: 0, name: "yellow", r: 0xFF, g: 0xFF, b: 0x00 },
    { colortyp: 1, tableindex: 12, rgbindex: 0, name: "bright-blue", r: 0xAD, g: 0xD8, b: 0xE6 },
    { colortyp: 1, tableindex: 13, rgbindex: 0, name: "bright-magenta", r: 0x93, g: 0x70, b: 0xDB },
    { colortyp: 1, tableindex: 14, rgbindex: 0, name: "light-cyan", r: 0xE0, g: 0xFF, b: 0xFF },
    { colortyp: 1, tableindex: 15, rgbindex: 0, name: "white", r: 0xFF, g: 0xFF, b: 0xFF },
    { colortyp: 2, tableindex: 16, rgbindex: 0, name: "maroon", r: 0x80, g: 0x00, b: 0x00 },
    { colortyp: 2, tableindex: 17, rgbindex: 1, name: "dark-red", r: 0x8B, g: 0x00, b: 0x00 },
    { colortyp: 2, tableindex: 18, rgbindex: 2, name: "brown", r: 0xA5, g: 0x2A, b: 0x2A },
    { colortyp: 2, tableindex: 19, rgbindex: 3, name: "firebrick", r: 0xB2, g: 0x22, b: 0x22 },
    { colortyp: 2, tableindex: 20, rgbindex: 4, name: "crimson", r: 0xDC, g: 0x14, b: 0x3C },
    { colortyp: 2, tableindex: 21, rgbindex: 5, name: "red", r: 0xFF, g: 0x00, b: 0x00 },
    { colortyp: 2, tableindex: 22, rgbindex: 6, name: "tomato", r: 0xFF, g: 0x63, b: 0x47 },
    { colortyp: 2, tableindex: 23, rgbindex: 7, name: "coral", r: 0xFF, g: 0x7F, b: 0x50 },
    { colortyp: 2, tableindex: 24, rgbindex: 8, name: "indian-red", r: 0xCD, g: 0x5C, b: 0x5C },
    { colortyp: 2, tableindex: 25, rgbindex: 9, name: "light-coral", r: 0xF0, g: 0x80, b: 0x80 },
    { colortyp: 2, tableindex: 26, rgbindex: 10, name: "dark-salmon", r: 0xE9, g: 0x96, b: 0x7A },
    { colortyp: 2, tableindex: 27, rgbindex: 11, name: "salmon", r: 0xFA, g: 0x80, b: 0x72 },
    { colortyp: 2, tableindex: 28, rgbindex: 12, name: "light-salmon", r: 0xFF, g: 0xA0, b: 0x7A },
    { colortyp: 2, tableindex: 29, rgbindex: 13, name: "orange-red", r: 0xFF, g: 0x45, b: 0x00 },
    { colortyp: 2, tableindex: 30, rgbindex: 14, name: "dark-orange", r: 0xFF, g: 0x8C, b: 0x00 },
    { colortyp: 2, tableindex: 31, rgbindex: 15, name: "orange", r: 0xFF, g: 0xA5, b: 0x00 },
    { colortyp: 2, tableindex: 32, rgbindex: 16, name: "gold", r: 0xFF, g: 0xD7, b: 0x00 },
    { colortyp: 2, tableindex: 33, rgbindex: 17, name: "dark-golden-rod", r: 0xB8, g: 0x86, b: 0x0B },
    { colortyp: 2, tableindex: 34, rgbindex: 18, name: "golden-rod", r: 0xDA, g: 0xA5, b: 0x20 },
    { colortyp: 2, tableindex: 35, rgbindex: 19, name: "pale-golden-rod", r: 0xEE, g: 0xE8, b: 0xAA },
    { colortyp: 2, tableindex: 36, rgbindex: 20, name: "dark-khaki", r: 0xBD, g: 0xB7, b: 0x6B },
    { colortyp: 2, tableindex: 37, rgbindex: 21, name: "khaki", r: 0xF0, g: 0xE6, b: 0x8C },
    { colortyp: 2, tableindex: 38, rgbindex: 22, name: "olive", r: 0x80, g: 0x80, b: 0x00 },
    { colortyp: 2, tableindex: 39, rgbindex: 23, name: "yellow", r: 0xFF, g: 0xFF, b: 0x00 },
    { colortyp: 2, tableindex: 40, rgbindex: 24, name: "yellow-green", r: 0x9A, g: 0xCD, b: 0x32 },
    { colortyp: 2, tableindex: 41, rgbindex: 25, name: "dark-olive-green", r: 0x55, g: 0x6B, b: 0x2F },
    { colortyp: 2, tableindex: 42, rgbindex: 26, name: "olive-drab", r: 0x6B, g: 0x8E, b: 0x23 },
    { colortyp: 2, tableindex: 43, rgbindex: 27, name: "lawn-green", r: 0x7C, g: 0xFC, b: 0x00 },
    { colortyp: 2, tableindex: 44, rgbindex: 28, name: "chart-reuse", r: 0x7F, g: 0xFF, b: 0x00 },
    { colortyp: 2, tableindex: 45, rgbindex: 29, name: "green-yellow", r: 0xAD, g: 0xFF, b: 0x2F },
    { colortyp: 2, tableindex: 46, rgbindex: 30, name: "dark-green", r: 0x00, g: 0x64, b: 0x00 },
    { colortyp: 2, tableindex: 47, rgbindex: 31, name: "green", r: 0x00, g: 0x80, b: 0x00 },
    { colortyp: 2, tableindex: 48, rgbindex: 32, name: "forest-green", r: 0x22, g: 0x8B, b: 0x22 },
    { colortyp: 2, tableindex: 49, rgbindex: 33, name: "lime", r: 0x00, g: 0xFF, b: 0x00 },
    { colortyp: 2, tableindex: 50, rgbindex: 34, name: "lime-green", r: 0x32, g: 0xCD, b: 0x32 },
    { colortyp: 2, tableindex: 51, rgbindex: 35, name: "light-green", r: 0x90, g: 0xEE, b: 0x90 },
    { colortyp: 2, tableindex: 52, rgbindex: 36, name: "pale-green", r: 0x98, g: 0xFB, b: 0x98 },
    { colortyp: 2, tableindex: 53, rgbindex: 37, name: "dark-sea-green", r: 0x8F, g: 0xBC, b: 0x8F },
    { colortyp: 2, tableindex: 54, rgbindex: 38, name: "medium-spring-green", r: 0x00, g: 0xFA, b: 0x9A },
    { colortyp: 2, tableindex: 55, rgbindex: 39, name: "spring-green", r: 0x00, g: 0xFF, b: 0x7F },
    { colortyp: 2, tableindex: 56, rgbindex: 40, name: "sea-green", r: 0x2E, g: 0x8B, b: 0x57 },
    { colortyp: 2, tableindex: 57, rgbindex: 41, name: "medium-aqua-marine", r: 0x66, g: 0xCD, b: 0xAA },
    { colortyp: 2, tableindex: 58, rgbindex: 42, name: "medium-sea-green", r: 0x3C, g: 0xB3, b: 0x71 },
    { colortyp: 2, tableindex: 59, rgbindex: 43, name: "light-sea-green", r: 0x20, g: 0xB2, b: 0xAA },
    { colortyp: 2, tableindex: 60, rgbindex: 44, name: "dark-slate-gray", r: 0x2F, g: 0x4F, b: 0x4F },
    { colortyp: 2, tableindex: 61, rgbindex: 45, name: "teal", r: 0x00, g: 0x80, b: 0x80 },
    { colortyp: 2, tableindex: 62, rgbindex: 46, name: "dark-cyan", r: 0x00, g: 0x8B, b: 0x8B },
    { colortyp: 2, tableindex: 63, rgbindex: 47, name: "aqua", r: 0x00, g: 0xFF, b: 0xFF },
    { colortyp: 2, tableindex: 64, rgbindex: 48, name: "cyan", r: 0x00, g: 0xFF, b: 0xFF },
    { colortyp: 2, tableindex: 65, rgbindex: 49, name: "light-cyan", r: 0xE0, g: 0xFF, b: 0xFF },
    { colortyp: 2, tableindex: 66, rgbindex: 50, name: "dark-turquoise", r: 0x00, g: 0xCE, b: 0xD1 },
    { colortyp: 2, tableindex: 67, rgbindex: 51, name: "turquoise", r: 0x40, g: 0xE0, b: 0xD0 },
    { colortyp: 2, tableindex: 68, rgbindex: 52, name: "medium-turquoise", r: 0x48, g: 0xD1, b: 0xCC },
    { colortyp: 2, tableindex: 69, rgbindex: 53, name: "pale-turquoise", r: 0xAF, g: 0xEE, b: 0xEE },
    { colortyp: 2, tableindex: 70, rgbindex: 54, name: "aqua-marine", r: 0x7F, g: 0xFF, b: 0xD4 },
    { colortyp: 2, tableindex: 71, rgbindex: 55, name: "powder-blue", r: 0xB0, g: 0xE0, b: 0xE6 },
    { colortyp: 2, tableindex: 72, rgbindex: 56, name: "cadet-blue", r: 0x5F, g: 0x9E, b: 0xA0 },
    { colortyp: 2, tableindex: 73, rgbindex: 57, name: "steel-blue", r: 0x46, g: 0x82, b: 0xB4 },
    { colortyp: 2, tableindex: 74, rgbindex: 58, name: "corn-flower-blue", r: 0x64, g: 0x95, b: 0xED },
    { colortyp: 2, tableindex: 75, rgbindex: 59, name: "deep-sky-blue", r: 0x00, g: 0xBF, b: 0xFF },
    { colortyp: 2, tableindex: 76, rgbindex: 60, name: "dodger-blue", r: 0x1E, g: 0x90, b: 0xFF },
    { colortyp: 2, tableindex: 77, rgbindex: 61, name: "light-blue", r: 0xAD, g: 0xD8, b: 0xE6 },
    { colortyp: 2, tableindex: 78, rgbindex: 62, name: "sky-blue", r: 0x87, g: 0xCE, b: 0xEB },
    { colortyp: 2, tableindex: 79, rgbindex: 63, name: "light-sky-blue", r: 0x87, g: 0xCE, b: 0xFA },
    { colortyp: 2, tableindex: 80, rgbindex: 64, name: "midnight-blue", r: 0x19, g: 0x19, b: 0x70 },
    { colortyp: 2, tableindex: 81, rgbindex: 65, name: "navy", r: 0x00, g: 0x00, b: 0x80 },
    { colortyp: 2, tableindex: 82, rgbindex: 66, name: "dark-blue", r: 0x00, g: 0x00, b: 0x8B },
    { colortyp: 2, tableindex: 83, rgbindex: 67, name: "medium-blue", r: 0x00, g: 0x00, b: 0xCD },
    { colortyp: 2, tableindex: 84, rgbindex: 68, name: "blue", r: 0x00, g: 0x00, b: 0xFF },
    { colortyp: 2, tableindex: 85, rgbindex: 69, name: "royal-blue", r: 0x41, g: 0x69, b: 0xE1 },
    { colortyp: 2, tableindex: 86, rgbindex: 70, name: "blue-violet", r: 0x8A, g: 0x2B, b: 0xE2 },
    { colortyp: 2, tableindex: 87, rgbindex: 71, name: "indigo", r: 0x4B, g: 0x00, b: 0x82 },
    { colortyp: 2, tableindex: 88, rgbindex: 72, name: "dark-slate-blue", r: 0x48, g: 0x3D, b: 0x8B },
    { colortyp: 2, tableindex: 89, rgbindex: 73, name: "slate-blue", r: 0x6A, g: 0x5A, b: 0xCD },
    { colortyp: 2, tableindex: 90, rgbindex: 74, name: "medium-slate-blue", r: 0x7B, g: 0x68, b: 0xEE },
    { colortyp: 2, tableindex: 91, rgbindex: 75, name: "medium-purple", r: 0x93, g: 0x70, b: 0xDB },
    { colortyp: 2, tableindex: 92, rgbindex: 76, name: "dark-magenta", r: 0x8B, g: 0x00, b: 0x8B },
    { colortyp: 2, tableindex: 93, rgbindex: 77, name: "dark-violet", r: 0x94, g: 0x00, b: 0xD3 },
    { colortyp: 2, tableindex: 94, rgbindex: 78, name: "dark-orchid", r: 0x99, g: 0x32, b: 0xCC },
    { colortyp: 2, tableindex: 95, rgbindex: 79, name: "medium-orchid", r: 0xBA, g: 0x55, b: 0xD3 },
    { colortyp: 2, tableindex: 96, rgbindex: 80, name: "purple", r: 0x80, g: 0x00, b: 0x80 },
    { colortyp: 2, tableindex: 97, rgbindex: 81, name: "thistle", r: 0xD8, g: 0xBF, b: 0xD8 },
    { colortyp: 2, tableindex: 98, rgbindex: 82, name: "plum", r: 0xDD, g: 0xA0, b: 0xDD },
    { colortyp: 2, tableindex: 99, rgbindex: 83, name: "violet", r: 0xEE, g: 0x82, b: 0xEE },
    { colortyp: 2, tableindex: 100, rgbindex: 84, name: "magenta", r: 0xFF, g: 0x00, b: 0xFF },
    { colortyp: 2, tableindex: 101, rgbindex: 85, name: "orchid", r: 0xDA, g: 0x70, b: 0xD6 },
    { colortyp: 2, tableindex: 102, rgbindex: 86, name: "medium-violet-red", r: 0xC7, g: 0x15, b: 0x85 },
    { colortyp: 2, tableindex: 103, rgbindex: 87, name: "pale-violet-red", r: 0xDB, g: 0x70, b: 0x93 },
    { colortyp: 2, tableindex: 104, rgbindex: 88, name: "deep-pink", r: 0xFF, g: 0x14, b: 0x93 },
    { colortyp: 2, tableindex: 105, rgbindex: 89, name: "hot-pink", r: 0xFF, g: 0x69, b: 0xB4 },
    { colortyp: 2, tableindex: 106, rgbindex: 90, name: "light-pink", r: 0xFF, g: 0xB6, b: 0xC1 },
    { colortyp: 2, tableindex: 107, rgbindex: 91, name: "pink", r: 0xFF, g: 0xC0, b: 0xCB },
    { colortyp: 2, tableindex: 108, rgbindex: 92, name: "antique-white", r: 0xFA, g: 0xEB, b: 0xD7 },
    { colortyp: 2, tableindex: 109, rgbindex: 93, name: "beige", r: 0xF5, g: 0xF5, b: 0xDC },
    { colortyp: 2, tableindex: 110, rgbindex: 94, name: "bisque", r: 0xFF, g: 0xE4, b: 0xC4 },
    { colortyp: 2, tableindex: 111, rgbindex: 95, name: "blanched-almond", r: 0xFF, g: 0xEB, b: 0xCD },
    { colortyp: 2, tableindex: 112, rgbindex: 96, name: "wheat", r: 0xF5, g: 0xDE, b: 0xB3 },
    { colortyp: 2, tableindex: 113, rgbindex: 97, name: "corn-silk", r: 0xFF, g: 0xF8, b: 0xDC },
    { colortyp: 2, tableindex: 114, rgbindex: 98, name: "lemon-chiffon", r: 0xFF, g: 0xFA, b: 0xCD },
    { colortyp: 2, tableindex: 115, rgbindex: 99, name: "light-golden-rod-yellow", r: 0xFA, g: 0xFA, b: 0xD2 },
    { colortyp: 2, tableindex: 116, rgbindex: 100, name: "light-yellow", r: 0xFF, g: 0xFF, b: 0xE0 },
    { colortyp: 2, tableindex: 117, rgbindex: 101, name: "saddle-brown", r: 0x8B, g: 0x45, b: 0x13 },
    { colortyp: 2, tableindex: 118, rgbindex: 102, name: "sienna", r: 0xA0, g: 0x52, b: 0x2D },
    { colortyp: 2, tableindex: 119, rgbindex: 103, name: "chocolate", r: 0xD2, g: 0x69, b: 0x1E },
    { colortyp: 2, tableindex: 120, rgbindex: 104, name: "peru", r: 0xCD, g: 0x85, b: 0x3F },
    { colortyp: 2, tableindex: 121, rgbindex: 105, name: "sandy-brown", r: 0xF4, g: 0xA4, b: 0x60 },
    { colortyp: 2, tableindex: 122, rgbindex: 106, name: "burly-wood", r: 0xDE, g: 0xB8, b: 0x87 },
    { colortyp: 2, tableindex: 123, rgbindex: 107, name: "tan", r: 0xD2, g: 0xB4, b: 0x8C },
    { colortyp: 2, tableindex: 124, rgbindex: 108, name: "rosy-brown", r: 0xBC, g: 0x8F, b: 0x8F },
    { colortyp: 2, tableindex: 125, rgbindex: 109, name: "moccasin", r: 0xFF, g: 0xE4, b: 0xB5 },
    { colortyp: 2, tableindex: 126, rgbindex: 110, name: "navajo-white", r: 0xFF, g: 0xDE, b: 0xAD },
    { colortyp: 2, tableindex: 127, rgbindex: 111, name: "peach-puff", r: 0xFF, g: 0xDA, b: 0xB9 },
    { colortyp: 2, tableindex: 128, rgbindex: 112, name: "misty-rose", r: 0xFF, g: 0xE4, b: 0xE1 },
    { colortyp: 2, tableindex: 129, rgbindex: 113, name: "lavender-blush", r: 0xFF, g: 0xF0, b: 0xF5 },
    { colortyp: 2, tableindex: 130, rgbindex: 114, name: "linen", r: 0xFA, g: 0xF0, b: 0xE6 },
    { colortyp: 2, tableindex: 131, rgbindex: 115, name: "old-lace", r: 0xFD, g: 0xF5, b: 0xE6 },
    { colortyp: 2, tableindex: 132, rgbindex: 116, name: "papaya-whip", r: 0xFF, g: 0xEF, b: 0xD5 },
    { colortyp: 2, tableindex: 133, rgbindex: 117, name: "sea-shell", r: 0xFF, g: 0xF5, b: 0xEE },
    { colortyp: 2, tableindex: 134, rgbindex: 118, name: "mint-cream", r: 0xF5, g: 0xFF, b: 0xFA },
    { colortyp: 2, tableindex: 135, rgbindex: 119, name: "slate-gray", r: 0x70, g: 0x80, b: 0x90 },
    { colortyp: 2, tableindex: 136, rgbindex: 120, name: "light-slate-gray", r: 0x77, g: 0x88, b: 0x99 },
    { colortyp: 2, tableindex: 137, rgbindex: 121, name: "light-steel-blue", r: 0xB0, g: 0xC4, b: 0xDE },
    { colortyp: 2, tableindex: 138, rgbindex: 122, name: "lavender", r: 0xE6, g: 0xE6, b: 0xFA },
    { colortyp: 2, tableindex: 139, rgbindex: 123, name: "floral-white", r: 0xFF, g: 0xFA, b: 0xF0 },
    { colortyp: 2, tableindex: 140, rgbindex: 124, name: "alice-blue", r: 0xF0, g: 0xF8, b: 0xFF },
    { colortyp: 2, tableindex: 141, rgbindex: 125, name: "ghost-white", r: 0xF8, g: 0xF8, b: 0xFF },
    { colortyp: 2, tableindex: 142, rgbindex: 126, name: "honeydew", r: 0xF0, g: 0xFF, b: 0xF0 },
    { colortyp: 2, tableindex: 143, rgbindex: 127, name: "ivory", r: 0xFF, g: 0xFF, b: 0xF0 },
    { colortyp: 2, tableindex: 144, rgbindex: 128, name: "azure", r: 0xF0, g: 0xFF, b: 0xFF },
    { colortyp: 2, tableindex: 145, rgbindex: 129, name: "snow", r: 0xFF, g: 0xFA, b: 0xFA },
    { colortyp: 2, tableindex: 146, rgbindex: 130, name: "black", r: 0x00, g: 0x00, b: 0x00 },
    { colortyp: 2, tableindex: 147, rgbindex: 131, name: "dim-gray", r: 0x69, g: 0x69, b: 0x69 },
    { colortyp: 2, tableindex: 148, rgbindex: 132, name: "gray", r: 0x80, g: 0x80, b: 0x80 },
    { colortyp: 2, tableindex: 149, rgbindex: 133, name: "dark-gray", r: 0xA9, g: 0xA9, b: 0xA9 },
    { colortyp: 2, tableindex: 150, rgbindex: 134, name: "silver", r: 0xC0, g: 0xC0, b: 0xC0 },
    { colortyp: 2, tableindex: 151, rgbindex: 135, name: "light-gray", r: 0xD3, g: 0xD3, b: 0xD3 },
    { colortyp: 2, tableindex: 152, rgbindex: 136, name: "gainsboro", r: 0xDC, g: 0xDC, b: 0xDC },
    { colortyp: 2, tableindex: 153, rgbindex: 137, name: "white-smoke", r: 0xF5, g: 0xF5, b: 0xF5 },
    { colortyp: 2, tableindex: 154, rgbindex: 138, name: "white", r: 0xFF, g: 0xFF, b: 0xFF },
];

// Port of colortable_to_int32() from coloratt.c:237-246
export function colortable_to_int32(cte) {
    let clr = NO_COLOR | NH_BASIC_COLOR;
    if (cte.colortyp === rgb_color)
        clr = ((cte.r << 16) | (cte.g << 8) | cte.b);
    else if (cte.colortyp === nh_color)
        clr = cte.tableindex | NH_BASIC_COLOR;
    return clr;
}

// Port of attr2attrname() from coloratt.c:309-317
// Returns the name for the given attribute, or null if not found.
export function attr2attrname(attr) {
    for (let i = 0; i < SIZE(attrnames); i++) {
        if (attrnames[i].attr === attr) {
            return attrnames[i].name;
        }
    }
    return null;
}

// Port of clr2colorname() from coloratt.c:327-335
// Returns the name for the given color, or null if not found.
// Note: checks colornames[i].name is non-null (differs from attr2attrname)
export function clr2colorname(clr) {
    for (let i = 0; i < SIZE(colornames); i++) {
        if (colornames[i].name && colornames[i].color === clr) {
            return colornames[i].name;
        }
    }
    return null;
}

// Port of free_menu_coloring() from coloratt.c:664-680
// Release all menu color patterns (user menu_colorings and cached color_colorings).
export function free_menu_coloring() {
    game.menu_colorings = null;
    game.color_colorings = null;
}

// Port of free_one_menu_coloring() from coloratt.c:684-706
export function free_one_menu_coloring(idx) {
    const list = game.menu_colorings;
    if (!Array.isArray(list) || idx < 0 || idx >= list.length) return;
    list.splice(idx, 1);
}

// Port of count_menucolors() from coloratt.c:709-717
export function count_menucolors() {
    return Array.isArray(game.menu_colorings) ? game.menu_colorings.length : 0;
}

// Port of color_attr_to_str() from coloratt.c:249-257
export function color_attr_to_str(ca) {
    return `${clr2colorname(ca.color)}&${attr2attrname(ca.attr)}`;
}

// Port of color_attr_parse_str() from coloratt.c:261-301
export function color_attr_parse_str(ca, str) {
    const buf = String(str ?? '').slice(0, 255);
    const amp = buf.indexOf('&');
    let c = NO_COLOR, a = 0; /* ATR_NONE */
    if (amp >= 0) {
        const left = buf.slice(0, amp);
        const right = buf.slice(amp + 1);
        c = match_str2clr(left, false);
        a = match_str2attr(right, true);
        if (c >= CLR_MAX && a === -1) {
            c = match_str2clr(right, false);
            a = match_str2attr(left, true);
        }
        if (c >= CLR_MAX || a === -1)
            return false;
    } else {
        const tmp = match_str2attr(buf, false);
        if (tmp === -1) {
            const ct = match_str2clr(buf, false);
            if (ct >= CLR_MAX)
                return false;
            c = ct;
        } else {
            a = tmp;
        }
    }
    ca.attr = a;
    ca.color = c;
    return true;
}

// Port of query_color_attr() from coloratt.c:304-317
export async function query_color_attr(ca, prompt, preserveStatus) {
    const c = await query_color(prompt, ca.color, preserveStatus);
    if (c === -1) return false;
    const a = await query_attr(prompt, ca.attr, true);
    if (a === -1) return false;
    ca.color = c;
    ca.attr = a;
    return true;
}

const HL_NONE = 0x01;
const HL_BOLD = 0x02;
const HL_DIM = 0x04;
const HL_ITALIC = 0x08;
const HL_ULINE = 0x10;
const HL_BLINK = 0x20;
const HL_INVERSE = 0x40;

// Port of query_attr() from coloratt.c:396-472; returns -1 on ESC or empty PICK_ANY.
export async function query_attr(prompt, dflt_attr, preserveStatus) {
    const allow_many = !!(prompt && prompt.slice(0, 6).toLowerCase() === 'choose');
    const m = new TtyMenu({ overlay: true, statusClipCol: preserveStatus ? undefined : 0 });
    for (let i = 0; i < attrnames.length; i++) {
        if (!attrnames[i].name) break;
        add_menu(m, null, { a_int: i + 1 }, 0, 0,
                 attrnames[i].attr, NO_COLOR, attrnames[i].name,
                 attrnames[i].attr === dflt_attr ? MENU_ITEMFLAGS_SELECTED : 0);
    }
    m.end_menu(prompt || 'Pick an attribute');
    const picksRef = { val: null };
    const count = await select_menu(m, allow_many ? PICK_ANY : PICK_ONE, picksRef);
    const picks = picksRef.val?.map(pick => pick.item.a_int);
    if (count > 0) {
        let j, k = 0;
        if (allow_many) {
            for (let i = 0; i < count; ++i) {
                j = picks[i] - 1;
                if (attrnames[j].attr !== 0 || count === 1) {
                    switch (attrnames[j].attr) {
                    case 0: k = HL_NONE; break;
                    case 1: k |= HL_BOLD; break;
                    case 2: k |= HL_DIM; break;
                    case 3: k |= HL_ITALIC; break;
                    case 4: k |= HL_ULINE; break;
                    case 5: k |= HL_BLINK; break;
                    case 7: k |= HL_INVERSE; break;
                    }
                }
            }
        } else {
            j = picks[0] - 1;
            if (count === 2 && attrnames[j].attr === dflt_attr)
                j = picks[1] - 1;
            k = attrnames[j].attr;
        }
        return k;
    } else if (count === 0 && !allow_many) {
        return dflt_attr;
    }
    return -1;
}

// Port of onlyhexdigits() from coloratt.c:789-798
// Returns true if every character in buf is a hex digit (0-9, a-f, A-F) or '-'.
function onlyhexdigits(buf) {
    for (let i = 0; i < buf.length; i++) {
        let ch = buf[i];
        if (!((ch >= '0' && ch <= '9')
              || (ch >= 'a' && ch <= 'f')
              || (ch >= 'A' && ch <= 'F')
              || ch === '-'))
            return false;
    }
    return true;
}

// Port of rgbstr_to_int32() from coloratt.c:813-865
export function rgbstr_to_int32(rgbstr) {
    let r, g, b, milestone = 0;
    let rgb = 0;
    let buf = rgbstr ? String(rgbstr).slice(0, 255) : "";
    let dash = false;

    if (buf.length > 0 && onlyhexdigits(buf)) {
        let c_g_start = -1, c_b_start = -1;
        let cp_idx = 0;
        let dash1_idx = -1, dash2_idx = -1;

        while (cp_idx < buf.length) {
            let ch = buf[cp_idx];
            if ((ch >= '0' && ch <= '9') || ch === '-') {
                if (ch === '-') {
                    milestone++;
                    if (milestone === 1)
                        dash1_idx = cp_idx;
                    else if (milestone === 2)
                        dash2_idx = cp_idx;
                    dash = true;
                }
                cp_idx++;
                if (dash) {
                    if (milestone < 2)
                        c_g_start = cp_idx;
                    else
                        c_b_start = cp_idx;
                    dash = false;
                }
            } else {
                return -1;
            }
        }
        /* sanity checks */
        let c_r = dash1_idx >= 0 ? buf.substring(0, dash1_idx) : buf;
        let c_g = c_g_start >= 0
            ? (dash2_idx >= 0 ? buf.substring(c_g_start, dash2_idx) : buf.substring(c_g_start))
            : "";
        let c_b = c_b_start >= 0 ? buf.substring(c_b_start) : "";

        if (c_r && c_g && c_b
            && c_r.length > 0 && c_r.length < 4
            && c_g.length > 0 && c_g.length < 4
            && c_b.length > 0 && c_b.length < 4) {
            r = parseInt(c_r, 10);
            g = parseInt(c_g, 10);
            b = parseInt(c_b, 10);
            rgb = (r << 16) | (g << 8) | (b << 0);
            return rgb;
        }
    } else if (buf.length > 0) {
        /* perhaps an enhanced color name was used instead of rgb value? */
        if ((rgb = check_enhanced_colors(buf)) !== -1) {
            return rgb;
        }
    }
    return -1;
}

// Port of match_str2clr() from coloratt.c:349-371
export function match_str2clr(str, suppress_msg) {
    const s = String(str ?? '');
    const CLR_MAX = 16;
    let i, c = CLR_MAX;
    for (i = 0; i < colornames.length; i++) {
        if (colornames[i].name
            && fuzzymatch(s, colornames[i].name, " -_", true)) {
            c = colornames[i].color;
            break;
        }
    }
    if (i === colornames.length && s.length > 0
        && s[0] >= '0' && s[0] <= '9') {
        c = parseInt(s, 10);
    }
    if (c < 0 || c >= CLR_MAX) {
        if (!suppress_msg)
            config_error_add("Unknown color '%s'", s.slice(0, 60));
        c = CLR_MAX;
    }
    return c;
}

// Port of match_str2attr() from coloratt.c:374-389
export function match_str2attr(str, complain) {
    const s = String(str ?? '');
    let i, a = -1;
    for (i = 0; i < attrnames.length; i++) {
        if (attrnames[i].name
            && fuzzymatch(s, attrnames[i].name, " -_", true)) {
            a = attrnames[i].attr;
            break;
        }
    }
    if (a === -1 && complain)
        config_error_add("Unknown text attribute '%s'", s.slice(0, 50));
    return a;
}

const NH_BASIC_COLOR = 0x1000000;
const CLR_MAX = 16;

// Port of check_enhanced_colors() from coloratt.c:723-760
export function check_enhanced_colors(buf) {
    const s = String(buf ?? '');
    let color;
    let retcolor = -1;
    let hm;

    if ((color = match_str2clr(s, true)) !== CLR_MAX) {
        retcolor = color | NH_BASIC_COLOR;
    } else if ((hm = /^#\s*([0-9a-fA-F]{1,2})\s*([0-9a-fA-F]{1,2})\s*([0-9a-fA-F]{1,2})([\s\S]*)$/.exec(s))) {
        if (!hm[4]) {
            const r = parseInt(hm[1], 16);
            const g = parseInt(hm[2], 16);
            const b = parseInt(hm[3], 16);
            retcolor = (r << 16) | (g << 8) | b;
        }
    } else {
        const lower = s.toLowerCase();
        const greyoffset = lower.indexOf('grey');
        const altbuf = greyoffset >= 0
            ? s.slice(0, greyoffset) + 'gray' + s.slice(greyoffset + 4)
            : null;
        for (color = 0; color < colortable.length; ++color) {
            if (fuzzymatch(s, colortable[color].name, " -_", true)
                || (altbuf && fuzzymatch(altbuf, colortable[color].name, " -_", true))) {
                retcolor = colortable_to_int32(colortable[color]);
                break;
            }
        }
    }
    return retcolor;
}

// Port of wc_color_name() from coloratt.c:764-797
export function wc_color_name(colorindx) {
    let result = "no-color";
    if (colorindx >= 0) {
        const basicindx = colorindx & ~NH_BASIC_COLOR;
        if (basicindx !== colorindx) {
            result = colortable[basicindx].name;
        } else {
            const r = (colorindx >> 16) & 0xff;
            const g = (colorindx >> 8) & 0xff;
            const b = colorindx & 0xff;
            result = '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
            for (let indx = 16; indx < colortable.length; ++indx) {
                if (colortable[indx].r === r && colortable[indx].g === g && colortable[indx].b === b) {
                    result = colortable[indx].name;
                    break;
                }
            }
        }
    }
    return result;
}

/* C ref: coloratt.c:585-613 add_menu_coloring_parsed() */
export function add_menu_coloring_parsed(str, c, a) {
    if (str == null) return false;
    let re;
    try { re = regcomp(str); } catch (e) {
        config_error_add('%s: %s', 'Menucolor regex error', regex_error_desc(e));
        return false;
    }
    (game.menu_colorings ||= []).unshift({ match: re, color: c, attr: a, origstr: str });
    if (game.iflags) game.iflags.use_menu_color = true;
    return true;
}

/* C ref: coloratt.c:617-660 add_menu_coloring()
 * — parse 'regex_string=color[&attr]' and add it to menu_colorings.
 * Entries are PREPENDED (gm.menu_colorings = tmp), so the last rc line
 * that matches wins in get_menu_coloring(). */
export function add_menu_coloring(tmpstr) {
    const str = String(tmpstr ?? '').slice(0, 255);
    const eq = str.indexOf('=');
    if (eq < 0) {
        config_error_add('Malformed MENUCOLOR');
        return false;
    }

    let c = NO_COLOR, a = 0; /* ATR_NONE */
    let tmps = mungspaces(str.slice(eq + 1));
    const amp = tmps.indexOf('&');
    const clrPart = amp >= 0 ? tmps.slice(0, amp) : tmps;
    c = match_str2clr(clrPart, false);
    if (c >= CLR_MAX) return false;

    if (amp >= 0) {
        a = match_str2attr(tmps.slice(amp + 1), true);
        if (a === -1) return false;
    }

    /* the regexp portion here has not been condensed by mungspaces() */
    let pat = str.slice(0, eq);
    if (pat.length > 0 && (pat[0] === '"' || pat[0] === '\'')) {
        let end = pat.length - 1;
        while (end > 0 && /\s/.test(pat[end])) end--;
        if (pat[end] === pat[0])
            pat = pat.slice(1, end);
    }
    return add_menu_coloring_parsed(pat, c, a);
}

/* C ref: src/windows.c:1803-1807 add_menu() + :1843 get_menu_coloring() — the
 * tty then paints the text after the "x - " selector in the matched colour
 * (term_start_color ... term_end_color).  Returns `body` wrapped in the SGR
 * pair, or unchanged when no MENUCOLOR pattern matches. */
export function menucolor_text(body, matchText = body) {
    if (!game.iflags.use_menu_color || !game.menu_colorings?.length) return body;
    for (const mc of game.menu_colorings) {
        // windows.c matches the original string before tty clips it for display.
        if (mc.match.test(matchText)) {
            const c = mc.color;
            /* inverse / underline paint blanks: the recorded terminal still
             * carries a run of more than four blanks as cursor-forward
             * (unpainted cells), as tty_menu.js does for reverse-video rows.
             * #enhance's " %s %-*s [%s]" padding under MENUCOLOR=...&inverse
             * records "  dagger\e[12C[Unskilled]" (weapon.c:1291). */
            if (SPACE_PAINTING_ATTRS.has(mc.attr))
                body = body.replace(/ {5,}/g, (m) => `\x1b[${m.length}C`);
            // termcap.c:1010 gray has no color escape. NOMUX also serializes
            // black as default when !use_darkgray: nomux_set_fg leaves zero,
            if (c === NO_COLOR || c === CLR_GRAY
                || (c === CLR_BLACK && game.iflags?.wc2_darkgray === false))
                return mc.attr ? `\x1b[${mc.attr}m${body}\x1b[0m` : body;
            const sgr = c === CLR_BLACK ? 90
                : c < 8 ? 30 + c : 90 + (c - 8);
            if (mc.attr) return `\x1b[${mc.attr};${sgr}m${body}\x1b[0m`;
            return `\x1b[${sgr}m${body}\x1b[39m`;
        }
    }
    return body;
}

/* ATR_ULINE (4) and ATR_INVERSE (7), attrnames[] above: the attributes that
 * paint a blank cell. */
const SPACE_PAINTING_ATTRS = new Set([4, 7]);

function menucolor_match(matchText) {
    if (!game.iflags.use_menu_color || !game.menu_colorings?.length) return null;
    for (const mc of game.menu_colorings)
        if (mc.match.test(matchText)) return mc;
    return null;
}

/* C ref: windows.c:1796-1809 add_menu() menucolors the entry's RAW str (the
 * BUC/unpaid/class rows of query_category arrive this way, pickup.c:1320-1445);
 * tty_add_menu bakes "%c - " on AFTER (wintty.c:2604-2611) and the tty colours
 * from char 4 (wintty.c:1449-1456).  An add_menu_str line (no selector) is
 * coloured whole; its pad spaces' colour is unobservable, so keep the pad
 * outside the SGR for the compositor's indent read (js/com_pager.js /^ +/). */
export function menucolor_row(text) {
    const t = String(text ?? '');
    if (t === '(end)') return t;
    const m = /^(.) (\x01?[-+#*]) (.*)$/.exec(t);
    if (m) return `${m[1]} ${m[2][0] === '\x01' ? menucolor_text(m[2].slice(1), m[3]) : m[2]} ${menucolor_text(m[3])}`;
    const pad = (/^ +/.exec(t) || [''])[0];
    /* wintty.c:1441-1456: with no "x - " selector attr_n is 0, so the pad
     * blanks are written under the attribute too -- visible in reverse video
     * or underline (#enhance's unselectable " %s %-*s [%s]" rows,
     * weapon.c:1291: " \e[7;35m  dagger..."). */
    const mc = menucolor_match(t);
    if (pad && mc && SPACE_PAINTING_ATTRS.has(mc.attr))
        return menucolor_text(t);
    return pad + menucolor_text(t.slice(pad.length));
}

/* C coloratt.c:530 basic_menu_colors(TRUE): temporary menucolor patterns that
 * match the colour names (built last-in/first-out; black, white and no color
 * are skipped), with 'menucolors' forced on.  Returns the restorer. */
function basic_menu_colors() {
    const save_use = game.iflags.use_menu_color;
    const save_colorings = game.menu_colorings;
    const cols = [];
    for (const { name, color } of colornames) {
        if (!name) break;
        if (color === 0 || color === 15 || color === 8) continue;
        cols.unshift({ match: regcomp(name), color, attr: 0 });
    }
    game.iflags.use_menu_color = true;
    game.menu_colorings = cols;
    return () => {
        game.iflags.use_menu_color = save_use;
        game.menu_colorings = save_colorings;
    };
}

/* C coloratt.c:475 query_color; returns -1 on ESC. */
export async function query_color(prompt, dflt_color, preserveStatus) {
    const restore = basic_menu_colors();
    const m = new TtyMenu({ overlay: true, statusClipCol: preserveStatus ? undefined : 0 });
    for (let i = 0; i < colornames.length; i++) {
        if (!colornames[i].name) break;
        m.add_menu(i + 1, 0, ATR_NONE, colornames[i].name, false,
                   colornames[i].color === dflt_color);
    }
    m.end_menu(prompt || 'Pick a color');
    const { count, picks } = await m.select_menu(PICK_ONE);
    restore();
    if (count > 0) {
        let i = colornames[picks[0] - 1].color;
        if (count === 2 && i === 8) i = colornames[picks[1] - 1].color;
        return i;
    } else if (count === 0) {
        return dflt_color;
    }
    return -1;
}

const color_256_definitions = [
    { index: 16, value: 0x000000 }, { index: 17, value: 0x00005f }, { index: 18, value: 0x000087 },
    { index: 19, value: 0x0000af }, { index: 20, value: 0x0000d7 }, { index: 21, value: 0x0000ff },
    { index: 22, value: 0x005f00 }, { index: 23, value: 0x005f5f }, { index: 24, value: 0x005f87 },
    { index: 25, value: 0x005faf }, { index: 26, value: 0x005fd7 }, { index: 27, value: 0x005fff },
    { index: 28, value: 0x008700 }, { index: 29, value: 0x00875f }, { index: 30, value: 0x008787 },
    { index: 31, value: 0x0087af }, { index: 32, value: 0x0087d7 }, { index: 33, value: 0x0087ff },
    { index: 34, value: 0x00af00 }, { index: 35, value: 0x00af5f }, { index: 36, value: 0x00af87 },
    { index: 37, value: 0x00afaf }, { index: 38, value: 0x00afd7 }, { index: 39, value: 0x00afff },
    { index: 40, value: 0x00d700 }, { index: 41, value: 0x00d75f }, { index: 42, value: 0x00d787 },
    { index: 43, value: 0x00d7af }, { index: 44, value: 0x00d7d7 }, { index: 45, value: 0x00d7ff },
    { index: 46, value: 0x00ff00 }, { index: 47, value: 0x00ff5f }, { index: 48, value: 0x00ff87 },
    { index: 49, value: 0x00ffaf }, { index: 50, value: 0x00ffd7 }, { index: 51, value: 0x00ffff },
    { index: 52, value: 0x5f0000 }, { index: 53, value: 0x5f005f }, { index: 54, value: 0x5f0087 },
    { index: 55, value: 0x5f00af }, { index: 56, value: 0x5f00d7 }, { index: 57, value: 0x5f00ff },
    { index: 58, value: 0x5f5f00 }, { index: 59, value: 0x5f5f5f }, { index: 60, value: 0x5f5f87 },
    { index: 61, value: 0x5f5faf }, { index: 62, value: 0x5f5fd7 }, { index: 63, value: 0x5f5fff },
    { index: 64, value: 0x5f8700 }, { index: 65, value: 0x5f875f }, { index: 66, value: 0x5f8787 },
    { index: 67, value: 0x5f87af }, { index: 68, value: 0x5f87d7 }, { index: 69, value: 0x5f87ff },
    { index: 70, value: 0x5faf00 }, { index: 71, value: 0x5faf5f }, { index: 72, value: 0x5faf87 },
    { index: 73, value: 0x5fafaf }, { index: 74, value: 0x5fafd7 }, { index: 75, value: 0x5fafff },
    { index: 76, value: 0x5fd700 }, { index: 77, value: 0x5fd75f }, { index: 78, value: 0x5fd787 },
    { index: 79, value: 0x5fd7af }, { index: 80, value: 0x5fd7d7 }, { index: 81, value: 0x5fd7ff },
    { index: 82, value: 0x5fff00 }, { index: 83, value: 0x5fff5f }, { index: 84, value: 0x5fff87 },
    { index: 85, value: 0x5fffaf }, { index: 86, value: 0x5fffd7 }, { index: 87, value: 0x5fffff },
    { index: 88, value: 0x870000 }, { index: 89, value: 0x87005f }, { index: 90, value: 0x870087 },
    { index: 91, value: 0x8700af }, { index: 92, value: 0x8700d7 }, { index: 93, value: 0x8700ff },
    { index: 94, value: 0x875f00 }, { index: 95, value: 0x875f5f }, { index: 96, value: 0x875f87 },
    { index: 97, value: 0x875faf }, { index: 98, value: 0x875fd7 }, { index: 99, value: 0x875fff },
    { index: 100, value: 0x878700 }, { index: 101, value: 0x87875f }, { index: 102, value: 0x878787 },
    { index: 103, value: 0x8787af }, { index: 104, value: 0x8787d7 }, { index: 105, value: 0x8787ff },
    { index: 106, value: 0x87af00 }, { index: 107, value: 0x87af5f }, { index: 108, value: 0x87af87 },
    { index: 109, value: 0x87afaf }, { index: 110, value: 0x87afd7 }, { index: 111, value: 0x87afff },
    { index: 112, value: 0x87d700 }, { index: 113, value: 0x87d75f }, { index: 114, value: 0x87d787 },
    { index: 115, value: 0x87d7af }, { index: 116, value: 0x87d7d7 }, { index: 117, value: 0x87d7ff },
    { index: 118, value: 0x87ff00 }, { index: 119, value: 0x87ff5f }, { index: 120, value: 0x87ff87 },
    { index: 121, value: 0x87ffaf }, { index: 122, value: 0x87ffd7 }, { index: 123, value: 0x87ffff },
    { index: 124, value: 0xaf0000 }, { index: 125, value: 0xaf005f }, { index: 126, value: 0xaf0087 },
    { index: 127, value: 0xaf00af }, { index: 128, value: 0xaf00d7 }, { index: 129, value: 0xaf00ff },
    { index: 130, value: 0xaf5f00 }, { index: 131, value: 0xaf5f5f }, { index: 132, value: 0xaf5f87 },
    { index: 133, value: 0xaf5faf }, { index: 134, value: 0xaf5fd7 }, { index: 135, value: 0xaf5fff },
    { index: 136, value: 0xaf8700 }, { index: 137, value: 0xaf875f }, { index: 138, value: 0xaf8787 },
    { index: 139, value: 0xaf87af }, { index: 140, value: 0xaf87d7 }, { index: 141, value: 0xaf87ff },
    { index: 142, value: 0xafaf00 }, { index: 143, value: 0xafaf5f }, { index: 144, value: 0xafaf87 },
    { index: 145, value: 0xafafaf }, { index: 146, value: 0xafafd7 }, { index: 147, value: 0xafafff },
    { index: 148, value: 0xafd700 }, { index: 149, value: 0xafd75f }, { index: 150, value: 0xafd787 },
    { index: 151, value: 0xafd7af }, { index: 152, value: 0xafd7d7 }, { index: 153, value: 0xafd7ff },
    { index: 154, value: 0xafff00 }, { index: 155, value: 0xafff5f }, { index: 156, value: 0xafff87 },
    { index: 157, value: 0xafffaf }, { index: 158, value: 0xafffd7 }, { index: 159, value: 0xafffff },
    { index: 160, value: 0xd70000 }, { index: 161, value: 0xd7005f }, { index: 162, value: 0xd70087 },
    { index: 163, value: 0xd700af }, { index: 164, value: 0xd700d7 }, { index: 165, value: 0xd700ff },
    { index: 166, value: 0xd75f00 }, { index: 167, value: 0xd75f5f }, { index: 168, value: 0xd75f87 },
    { index: 169, value: 0xd75faf }, { index: 170, value: 0xd75fd7 }, { index: 171, value: 0xd75fff },
    { index: 172, value: 0xd78700 }, { index: 173, value: 0xd7875f }, { index: 174, value: 0xd78787 },
    { index: 175, value: 0xd787af }, { index: 176, value: 0xd787d7 }, { index: 177, value: 0xd787ff },
    { index: 178, value: 0xd7af00 }, { index: 179, value: 0xd7af5f }, { index: 180, value: 0xd7af87 },
    { index: 181, value: 0xd7afaf }, { index: 182, value: 0xd7afd7 }, { index: 183, value: 0xd7afff },
    { index: 184, value: 0xd7d700 }, { index: 185, value: 0xd7d75f }, { index: 186, value: 0xd7d787 },
    { index: 187, value: 0xd7d7af }, { index: 188, value: 0xd7d7d7 }, { index: 189, value: 0xd7d7ff },
    { index: 190, value: 0xd7ff00 }, { index: 191, value: 0xd7ff5f }, { index: 192, value: 0xd7ff87 },
    { index: 193, value: 0xd7ffaf }, { index: 194, value: 0xd7ffd7 }, { index: 195, value: 0xd7ffff },
    { index: 196, value: 0xff0000 }, { index: 197, value: 0xff005f }, { index: 198, value: 0xff0087 },
    { index: 199, value: 0xff00af }, { index: 200, value: 0xff00d7 }, { index: 201, value: 0xff00ff },
    { index: 202, value: 0xff5f00 }, { index: 203, value: 0xff5f5f }, { index: 204, value: 0xff5f87 },
    { index: 205, value: 0xff5faf }, { index: 206, value: 0xff5fd7 }, { index: 207, value: 0xff5fff },
    { index: 208, value: 0xff8700 }, { index: 209, value: 0xff875f }, { index: 210, value: 0xff8787 },
    { index: 211, value: 0xff87af }, { index: 212, value: 0xff87d7 }, { index: 213, value: 0xff87ff },
    { index: 214, value: 0xffaf00 }, { index: 215, value: 0xffaf5f }, { index: 216, value: 0xffaf87 },
    { index: 217, value: 0xffafaf }, { index: 218, value: 0xffafd7 }, { index: 219, value: 0xffafff },
    { index: 220, value: 0xffd700 }, { index: 221, value: 0xffd75f }, { index: 222, value: 0xffd787 },
    { index: 223, value: 0xffd7af }, { index: 224, value: 0xffd7d7 }, { index: 225, value: 0xffd7ff },
    { index: 226, value: 0xffff00 }, { index: 227, value: 0xffff5f }, { index: 228, value: 0xffff87 },
    { index: 229, value: 0xffffaf }, { index: 230, value: 0xffffd7 }, { index: 231, value: 0xffffff },
    { index: 232, value: 0x080808 }, { index: 233, value: 0x121212 }, { index: 234, value: 0x1c1c1c },
    { index: 235, value: 0x262626 }, { index: 236, value: 0x303030 }, { index: 237, value: 0x3a3a3a },
    { index: 238, value: 0x444444 }, { index: 239, value: 0x4e4e4e }, { index: 240, value: 0x585858 },
    { index: 241, value: 0x626262 }, { index: 242, value: 0x6c6c6c }, { index: 243, value: 0x767676 },
    { index: 244, value: 0x808080 }, { index: 245, value: 0x8a8a8a }, { index: 246, value: 0x949494 },
    { index: 247, value: 0x9e9e9e }, { index: 248, value: 0xa8a8a8 }, { index: 249, value: 0xb2b2b2 },
    { index: 250, value: 0xbcbcbc }, { index: 251, value: 0xc6c6c6 }, { index: 252, value: 0xd0d0d0 },
    { index: 253, value: 0xdadada }, { index: 254, value: 0xe4e4e4 }, { index: 255, value: 0xeeeeee },
];

// Port of color_distance() from coloratt.c:979-994
export function color_distance(rgb1, rgb2) {
    const r1 = (rgb1 >> 16) & 0xFF;
    const g1 = (rgb1 >> 8) & 0xFF;
    const b1 = rgb1 & 0xFF;
    const r2 = (rgb2 >> 16) & 0xFF;
    const g2 = (rgb2 >> 8) & 0xFF;
    const b2 = rgb2 & 0xFF;

    const rmean = Math.trunc((r1 + r2) / 2);
    const r = r1 - r2;
    const g = g1 - g2;
    const b = b1 - b2;
    return (((512 + rmean) * r * r) >> 8) + 4 * g * g
        + (((767 - rmean) * b * b) >> 8);
}

// Port of closest_color() from coloratt.c:997-1021
export function closest_color(lcolor, closecolorRef, clridxRef) {
    let color_index = -1, similar = 0x7FFFFFFF;
    let retbool = false;
    const lc = lcolor >>> 0;

    for (let i = 0; i < color_256_definitions.length; i++) {
        if (lc === color_256_definitions[i].value) {
            color_index = i;
            break;
        }
        const current = color_distance(lc, color_256_definitions[i].value);
        if (current < similar) {
            color_index = i;
            similar = current;
        }
    }
    if (closecolorRef && clridxRef && color_index >= 0) {
        closecolorRef.value = color_256_definitions[color_index].value;
        clridxRef.value = color_256_definitions[color_index].index;
        retbool = true;
    }
    return retbool;
}

// Port of get_nhcolor_from_256_index() from coloratt.c:1024-1031
export function get_nhcolor_from_256_index(idx) {
    let retcolor = NO_COLOR | NH_BASIC_COLOR;
    if (idx >= 0 && idx < color_256_definitions.length)
        retcolor = color_256_definitions[idx].value;
    return retcolor;
}

/* C coloratt.c:868-883 set_map_customcolor — install the glyph's custom nhcolor. */
export function set_map_customcolor(gm, nhcolor) {
    if (!gm) return 0;
    const closecolor = { value: 0 };
    const clridx = { value: 0 };
    gm.customcolor = nhcolor | 0;
    if (closest_color(nhcolor, closecolor, clridx))
        gm.color256idx = clridx.value;
    else
        gm.color256idx = 0;
    return 1;
}
