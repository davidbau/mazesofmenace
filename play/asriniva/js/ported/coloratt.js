/* NetHack 5.0	coloratt.c	$NHDT-Date: 1737286550 2025/01/19 03:35:50 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.14 $ */
/* Copyright (c) Pasi Kallinen, 2024 */
/* NetHack may be freely redistributed.  See license for details. */

import { C } from '../c-runtime/context.js';




export const colornames = [
    { name: "black", color: "CLR_BLACK" },
    { name: "red", color: "CLR_RED" },
    { name: "green", color: "CLR_GREEN" },
    { name: "brown", color: "CLR_BROWN" },
    { name: "blue", color: "CLR_BLUE" },
    { name: "magenta", color: "CLR_MAGENTA" },
    { name: "cyan", color: "CLR_CYAN" },
    { name: "gray", color: "CLR_GRAY" },
    { name: "orange", color: "CLR_ORANGE" },
    { name: "light green", color: "CLR_BRIGHT_GREEN" },
    { name: "yellow", color: "CLR_YELLOW" },
    { name: "light blue", color: "CLR_BRIGHT_BLUE" },
    { name: "light magenta", color: "CLR_BRIGHT_MAGENTA" },
    { name: "light cyan", color: "CLR_BRIGHT_CYAN" },
    { name: "white", color: "CLR_WHITE" },
    { name: "no color", color: "NO_COLOR" },
    { name: 0, color: "CLR_BLACK" }, /* everything after this is an alias */
    { name: "transparent", color: "NO_COLOR" },
    { name: "purple", color: "CLR_MAGENTA" },
    { name: "light purple", color: "CLR_BRIGHT_MAGENTA" },
    { name: "bright purple", color: "CLR_BRIGHT_MAGENTA" },
    { name: "grey", color: "CLR_GRAY" },
    { name: "bright red", color: "CLR_ORANGE" },
    { name: "bright green", color: "CLR_BRIGHT_GREEN" },
    { name: "bright blue", color: "CLR_BRIGHT_BLUE" },
    { name: "bright magenta", color: "CLR_BRIGHT_MAGENTA" },
    { name: "bright cyan", color: "CLR_BRIGHT_CYAN" }
];



export const attrnames = [
    { name: "none", attr: "ATR_NONE" },
    { name: "bold", attr: "ATR_BOLD" },
    { name: "dim", attr: "ATR_DIM" },
    { name: "italic", attr: "ATR_ITALIC" },
    { name: "underline", attr: "ATR_ULINE" },
    { name: "blink", attr: "ATR_BLINK" },
    { name: "inverse", attr: "ATR_INVERSE" },
    { name: 0, attr: "ATR_NONE" }, /* everything after this is an alias */
    { name: "normal", attr: "ATR_NONE" },
    { name: "uline", attr: "ATR_ULINE" },
    { name: "reverse", attr: "ATR_INVERSE" },
];

/* { colortyp, tableindex, rgbindx, name, r, g, b }, */


export const colortable = [
    { colortyp: "nh_color", tableindex: 0, rgbindex: 0, name: "black", r: 0x00, g: 0x00, b: 0x00 },      /*        CLR_BLACK */
    { colortyp: "nh_color", tableindex: 1, rgbindex: 0, name: "red", r: 0xFF, g: 0x00, b: 0x00 },        /*          CLR_RED */
    { colortyp: "nh_color", tableindex: 2, rgbindex: 0, name: "green", r: 0x22, g: 0x8B, b: 0x22 },      /*        CLR_GREEN */
    { colortyp: "nh_color", tableindex: 3, rgbindex: 0, name: "brown", r: 0xA5, g: 0x2A, b: 0x2A },      /*        CLR_BROWN */
    { colortyp: "nh_color", tableindex: 4, rgbindex: 0, name: "blue", r: 0x00, g: 0x00, b: 0xFF },       /*         CLR_BLUE */
    { colortyp: "nh_color", tableindex: 5, rgbindex: 0, name: "magenta", r: 0xFF, g: 0x00, b: 0xFF },    /*      CLR_MAGENTA */
    { colortyp: "nh_color", tableindex: 6, rgbindex: 0, name: "cyan", r: 0x00, g: 0xFF, b: 0xFF },       /*         CLR_CYAN */
    { colortyp: "nh_color", tableindex: 7, rgbindex: 0, name: "gray", r: 0x80, g: 0x80, b: 0x80 },       /*         CLR_GRAY */
    { colortyp: "no_color", tableindex: 8, rgbindex: 0, name: "nocolor", r: 0x00, g: 0x00, b: 0x00 },    /*         NO_COLOR */
    { colortyp: "nh_color", tableindex: 9, rgbindex: 0, name: "orange", r: 0xFF, g: 0xA5, b: 0x00 },     /*       CLR_ORANGE */
    { colortyp: "nh_color", tableindex: 10, rgbindex: 0, name: "bright-green", r: 0x00, g: 0x80, b: 0x00 },               /* CLR_BRIGHT_GREEN */
    { colortyp: "nh_color", tableindex: 11, rgbindex: 0, name: "yellow", r: 0xFF, g: 0xFF, b: 0x00 },     /*       CLR_YELLOW */
    { colortyp: "nh_color", tableindex: 12, rgbindex: 0, name: "bright-blue", r: 0xAD, g: 0xD8, b: 0xE6 }, /* CLR_BRIGHT_BLUE */
    { colortyp: "nh_color", tableindex: 13, rgbindex: 0, name: "bright-magenta", r: 0x93, g: 0x70, b: 0xDB },             /* CLR_BRIGHT_MAGENTA */
    { colortyp: "nh_color", tableindex: 14, rgbindex: 0, name: "light-cyan", r: 0xE0, g: 0xFF, b: 0xFF }, /*  CLR_BRIGHT_CYAN */
    { colortyp: "nh_color", tableindex: 15, rgbindex: 0, name: "white", r: 0xFF, g: 0xFF, b: 0xFF },      /*        CLR_WHITE */
    { colortyp: "rgb_color", tableindex: 16, rgbindex: 0, name: "maroon", r: 0x80, g: 0x00, b: 0x00 },              /* #800000 */
    { colortyp: "rgb_color", tableindex: 17, rgbindex: 1, name: "dark-red", r: 0x8B, g: 0x00, b: 0x00 },            /* #8B0000 */
    { colortyp: "rgb_color", tableindex: 18, rgbindex: 2, name: "brown", r: 0xA5, g: 0x2A, b: 0x2A },               /* #A52A2A */
    { colortyp: "rgb_color", tableindex: 19, rgbindex: 3, name: "firebrick", r: 0xB2, g: 0x22, b: 0x22 },           /* #B22222 */
    { colortyp: "rgb_color", tableindex: 20, rgbindex: 4, name: "crimson", r: 0xDC, g: 0x14, b: 0x3C },             /* #DC143C */
    { colortyp: "rgb_color", tableindex: 21, rgbindex: 5, name: "red", r: 0xFF, g: 0x00, b: 0x00 },                 /* #FF0000 */
    { colortyp: "rgb_color", tableindex: 22, rgbindex: 6, name: "tomato", r: 0xFF, g: 0x63, b: 0x47 },              /* #FF6347 */
    { colortyp: "rgb_color", tableindex: 23, rgbindex: 7, name: "coral", r: 0xFF, g: 0x7F, b: 0x50 },               /* #FF7F50 */
    { colortyp: "rgb_color", tableindex: 24, rgbindex: 8, name: "indian-red", r: 0xCD, g: 0x5C, b: 0x5C },          /* #CD5C5C */
    { colortyp: "rgb_color", tableindex: 25, rgbindex: 9, name: "light-coral", r: 0xF0, g: 0x80, b: 0x80 },         /* #F08080 */
    { colortyp: "rgb_color", tableindex: 26, rgbindex: 10, name: "dark-salmon", r: 0xE9, g: 0x96, b: 0x7A },         /* #E9967A */
    { colortyp: "rgb_color", tableindex: 27, rgbindex: 11, name: "salmon", r: 0xFA, g: 0x80, b: 0x72 },              /* #FA8072 */
    { colortyp: "rgb_color", tableindex: 28, rgbindex: 12, name: "light-salmon", r: 0xFF, g: 0xA0, b: 0x7A },        /* #FFA07A */
    { colortyp: "rgb_color", tableindex: 29, rgbindex: 13, name: "orange-red", r: 0xFF, g: 0x45, b: 0x00 },          /* #FF4500 */
    { colortyp: "rgb_color", tableindex: 30, rgbindex: 14, name: "dark-orange", r: 0xFF, g: 0x8C, b: 0x00 },         /* #FF8C00 */
    { colortyp: "rgb_color", tableindex: 31, rgbindex: 15, name: "orange", r: 0xFF, g: 0xA5, b: 0x00 },              /* #FFA500 */
    { colortyp: "rgb_color", tableindex: 32, rgbindex: 16, name: "gold", r: 0xFF, g: 0xD7, b: 0x00 },                /* #FFD700 */
    { colortyp: "rgb_color", tableindex: 33, rgbindex: 17, name: "dark-golden-rod", r: 0xB8, g: 0x86, b: 0x0B },     /* #B8860B */
    { colortyp: "rgb_color", tableindex: 34, rgbindex: 18, name: "golden-rod", r: 0xDA, g: 0xA5, b: 0x20 },          /* #DAA520 */
    { colortyp: "rgb_color", tableindex: 35, rgbindex: 19, name: "pale-golden-rod", r: 0xEE, g: 0xE8, b: 0xAA },     /* #EEE8AA */
    { colortyp: "rgb_color", tableindex: 36, rgbindex: 20, name: "dark-khaki", r: 0xBD, g: 0xB7, b: 0x6B },          /* #BDB76B */
    { colortyp: "rgb_color", tableindex: 37, rgbindex: 21, name: "khaki", r: 0xF0, g: 0xE6, b: 0x8C },               /* #F0E68C */
    { colortyp: "rgb_color", tableindex: 38, rgbindex: 22, name: "olive", r: 0x80, g: 0x80, b: 0x00 },               /* #808000 */
    { colortyp: "rgb_color", tableindex: 39, rgbindex: 23, name: "yellow", r: 0xFF, g: 0xFF, b: 0x00 },              /* #FFFF00 */
    { colortyp: "rgb_color", tableindex: 40, rgbindex: 24, name: "yellow-green", r: 0x9A, g: 0xCD, b: 0x32 },        /* #9ACD32 */
    { colortyp: "rgb_color", tableindex: 41, rgbindex: 25, name: "dark-olive-green", r: 0x55, g: 0x6B, b: 0x2F },    /* #556B2F */
    { colortyp: "rgb_color", tableindex: 42, rgbindex: 26, name: "olive-drab", r: 0x6B, g: 0x8E, b: 0x23 },          /* #6B8E23 */
    { colortyp: "rgb_color", tableindex: 43, rgbindex: 27, name: "lawn-green", r: 0x7C, g: 0xFC, b: 0x00 },          /* #7CFC00 */
    { colortyp: "rgb_color", tableindex: 44, rgbindex: 28, name: "chart-reuse", r: 0x7F, g: 0xFF, b: 0x00 },         /* #7FFF00 */
    { colortyp: "rgb_color", tableindex: 45, rgbindex: 29, name: "green-yellow", r: 0xAD, g: 0xFF, b: 0x2F },        /* #ADFF2F */
    { colortyp: "rgb_color", tableindex: 46, rgbindex: 30, name: "dark-green", r: 0x00, g: 0x64, b: 0x00 },          /* #006400 */
    { colortyp: "rgb_color", tableindex: 47, rgbindex: 31, name: "green", r: 0x00, g: 0x80, b: 0x00 },               /* #008000 */
    { colortyp: "rgb_color", tableindex: 48, rgbindex: 32, name: "forest-green", r: 0x22, g: 0x8B, b: 0x22 },        /* #228B22 */
    { colortyp: "rgb_color", tableindex: 49, rgbindex: 33, name: "lime", r: 0x00, g: 0xFF, b: 0x00 },                /* #00FF00 */
    { colortyp: "rgb_color", tableindex: 50, rgbindex: 34, name: "lime-green", r: 0x32, g: 0xCD, b: 0x32 },          /* #32CD32 */
    { colortyp: "rgb_color", tableindex: 51, rgbindex: 35, name: "light-green", r: 0x90, g: 0xEE, b: 0x90 },         /* #90EE90 */
    { colortyp: "rgb_color", tableindex: 52, rgbindex: 36, name: "pale-green", r: 0x98, g: 0xFB, b: 0x98 },          /* #98FB98 */
    { colortyp: "rgb_color", tableindex: 53, rgbindex: 37, name: "dark-sea-green", r: 0x8F, g: 0xBC, b: 0x8F },      /* #8FBC8F */
    { colortyp: "rgb_color", tableindex: 54, rgbindex: 38, name: "medium-spring-green", r: 0x00, g: 0xFA, b: 0x9A }, /* #00FA9A */
    { colortyp: "rgb_color", tableindex: 55, rgbindex: 39, name: "spring-green", r: 0x00, g: 0xFF, b: 0x7F },        /* #00FF7F */
    { colortyp: "rgb_color", tableindex: 56, rgbindex: 40, name: "sea-green", r: 0x2E, g: 0x8B, b: 0x57 },           /* #2E8B57 */
    { colortyp: "rgb_color", tableindex: 57, rgbindex: 41, name: "medium-aqua-marine", r: 0x66, g: 0xCD, b: 0xAA },  /* #66CDAA */
    { colortyp: "rgb_color", tableindex: 58, rgbindex: 42, name: "medium-sea-green", r: 0x3C, g: 0xB3, b: 0x71 },    /* #3CB371 */
    { colortyp: "rgb_color", tableindex: 59, rgbindex: 43, name: "light-sea-green", r: 0x20, g: 0xB2, b: 0xAA },     /* #20B2AA */
    { colortyp: "rgb_color", tableindex: 60, rgbindex: 44, name: "dark-slate-gray", r: 0x2F, g: 0x4F, b: 0x4F },     /* #2F4F4F */
    { colortyp: "rgb_color", tableindex: 61, rgbindex: 45, name: "teal", r: 0x00, g: 0x80, b: 0x80 },                /* #008080 */
    { colortyp: "rgb_color", tableindex: 62, rgbindex: 46, name: "dark-cyan", r: 0x00, g: 0x8B, b: 0x8B },           /* #008B8B */
    { colortyp: "rgb_color", tableindex: 63, rgbindex: 47, name: "aqua", r: 0x00, g: 0xFF, b: 0xFF },                /* #00FFFF */
    { colortyp: "rgb_color", tableindex: 64, rgbindex: 48, name: "cyan", r: 0x00, g: 0xFF, b: 0xFF },                /* #00FFFF */
    { colortyp: "rgb_color", tableindex: 65, rgbindex: 49, name: "light-cyan", r: 0xE0, g: 0xFF, b: 0xFF },          /* #E0FFFF */
    { colortyp: "rgb_color", tableindex: 66, rgbindex: 50, name: "dark-turquoise", r: 0x00, g: 0xCE, b: 0xD1 },      /* #00CED1 */
    { colortyp: "rgb_color", tableindex: 67, rgbindex: 51, name: "turquoise", r: 0x40, g: 0xE0, b: 0xD0 },           /* #40E0D0 */
    { colortyp: "rgb_color", tableindex: 68, rgbindex: 52, name: "medium-turquoise", r: 0x48, g: 0xD1, b: 0xCC },    /* #48D1CC */
    { colortyp: "rgb_color", tableindex: 69, rgbindex: 53, name: "pale-turquoise", r: 0xAF, g: 0xEE, b: 0xEE },      /* #AFEEEE */
    { colortyp: "rgb_color", tableindex: 70, rgbindex: 54, name: "aqua-marine", r: 0x7F, g: 0xFF, b: 0xD4 },         /* #7FFFD4 */
    { colortyp: "rgb_color", tableindex: 71, rgbindex: 55, name: "powder-blue", r: 0xB0, g: 0xE0, b: 0xE6 },         /* #B0E0E6 */
    { colortyp: "rgb_color", tableindex: 72, rgbindex: 56, name: "cadet-blue", r: 0x5F, g: 0x9E, b: 0xA0 },          /* #5F9EA0 */
    { colortyp: "rgb_color", tableindex: 73, rgbindex: 57, name: "steel-blue", r: 0x46, g: 0x82, b: 0xB4 },          /* #4682B4 */
    { colortyp: "rgb_color", tableindex: 74, rgbindex: 58, name: "corn-flower-blue", r: 0x64, g: 0x95, b: 0xED },    /* #6495ED */
    { colortyp: "rgb_color", tableindex: 75, rgbindex: 59, name: "deep-sky-blue", r: 0x00, g: 0xBF, b: 0xFF },       /* #00BFFF */
    { colortyp: "rgb_color", tableindex: 76, rgbindex: 60, name: "dodger-blue", r: 0x1E, g: 0x90, b: 0xFF },         /* #1E90FF */
    { colortyp: "rgb_color", tableindex: 77, rgbindex: 61, name: "light-blue", r: 0xAD, g: 0xD8, b: 0xE6 },          /* #ADD8E6 */
    { colortyp: "rgb_color", tableindex: 78, rgbindex: 62, name: "sky-blue", r: 0x87, g: 0xCE, b: 0xEB },            /* #87CEEB */
    { colortyp: "rgb_color", tableindex: 79, rgbindex: 63, name: "light-sky-blue", r: 0x87, g: 0xCE, b: 0xFA },      /* #87CEFA */
    { colortyp: "rgb_color", tableindex: 80, rgbindex: 64, name: "midnight-blue", r: 0x19, g: 0x19, b: 0x70 },       /* #191970 */
    { colortyp: "rgb_color", tableindex: 81, rgbindex: 65, name: "navy", r: 0x00, g: 0x00, b: 0x80 },                /* #000080 */
    { colortyp: "rgb_color", tableindex: 82, rgbindex: 66, name: "dark-blue", r: 0x00, g: 0x00, b: 0x8B },           /* #00008B */
    { colortyp: "rgb_color", tableindex: 83, rgbindex: 67, name: "medium-blue", r: 0x00, g: 0x00, b: 0xCD },         /* #0000CD */
    { colortyp: "rgb_color", tableindex: 84, rgbindex: 68, name: "blue", r: 0x00, g: 0x00, b: 0xFF },                /* #0000FF */
    { colortyp: "rgb_color", tableindex: 85, rgbindex: 69, name: "royal-blue", r: 0x41, g: 0x69, b: 0xE1 },          /* #4169E1 */
    { colortyp: "rgb_color", tableindex: 86, rgbindex: 70, name: "blue-violet", r: 0x8A, g: 0x2B, b: 0xE2 },         /* #8A2BE2 */
    { colortyp: "rgb_color", tableindex: 87, rgbindex: 71, name: "indigo", r: 0x4B, g: 0x00, b: 0x82 },              /* #4B0082 */
    { colortyp: "rgb_color", tableindex: 88, rgbindex: 72, name: "dark-slate-blue", r: 0x48, g: 0x3D, b: 0x8B },     /* #483D8B */
    { colortyp: "rgb_color", tableindex: 89, rgbindex: 73, name: "slate-blue", r: 0x6A, g: 0x5A, b: 0xCD },          /* #6A5ACD */
    { colortyp: "rgb_color", tableindex: 90, rgbindex: 74, name: "medium-slate-blue", r: 0x7B, g: 0x68, b: 0xEE },   /* #7B68EE */
    { colortyp: "rgb_color", tableindex: 91, rgbindex: 75, name: "medium-purple", r: 0x93, g: 0x70, b: 0xDB },       /* #9370DB */
    { colortyp: "rgb_color", tableindex: 92, rgbindex: 76, name: "dark-magenta", r: 0x8B, g: 0x00, b: 0x8B },        /* #8B008B */
    { colortyp: "rgb_color", tableindex: 93, rgbindex: 77, name: "dark-violet", r: 0x94, g: 0x00, b: 0xD3 },         /* #9400D3 */
    { colortyp: "rgb_color", tableindex: 94, rgbindex: 78, name: "dark-orchid", r: 0x99, g: 0x32, b: 0xCC },         /* #9932CC */
    { colortyp: "rgb_color", tableindex: 95, rgbindex: 79, name: "medium-orchid", r: 0xBA, g: 0x55, b: 0xD3 },       /* #BA55D3 */
    { colortyp: "rgb_color", tableindex: 96, rgbindex: 80, name: "purple", r: 0x80, g: 0x00, b: 0x80 },              /* #800080 */
    { colortyp: "rgb_color", tableindex: 97, rgbindex: 81, name: "thistle", r: 0xD8, g: 0xBF, b: 0xD8 },             /* #D8BFD8 */
    { colortyp: "rgb_color", tableindex: 98, rgbindex: 82, name: "plum", r: 0xDD, g: 0xA0, b: 0xDD },                /* #DDA0DD */
    { colortyp: "rgb_color", tableindex: 99, rgbindex: 83, name: "violet", r: 0xEE, g: 0x82, b: 0xEE },              /* #EE82EE */
    { colortyp: "rgb_color", tableindex: 100, rgbindex: 84, name: "magenta", r: 0xFF, g: 0x00, b: 0xFF },             /* #FF00FF */
    { colortyp: "rgb_color", tableindex: 101, rgbindex: 85, name: "orchid", r: 0xDA, g: 0x70, b: 0xD6 },              /* #DA70D6 */
    { colortyp: "rgb_color", tableindex: 102, rgbindex: 86, name: "medium-violet-red", r: 0xC7, g: 0x15, b: 0x85 },   /* #C71585 */
    { colortyp: "rgb_color", tableindex: 103, rgbindex: 87, name: "pale-violet-red", r: 0xDB, g: 0x70, b: 0x93 },     /* #DB7093 */
    { colortyp: "rgb_color", tableindex: 104, rgbindex: 88, name: "deep-pink", r: 0xFF, g: 0x14, b: 0x93 },           /* #FF1493 */
    { colortyp: "rgb_color", tableindex: 105, rgbindex: 89, name: "hot-pink", r: 0xFF, g: 0x69, b: 0xB4 },            /* #FF69B4 */
    { colortyp: "rgb_color", tableindex: 106, rgbindex: 90, name: "light-pink", r: 0xFF, g: 0xB6, b: 0xC1 },          /* #FFB6C1 */
    { colortyp: "rgb_color", tableindex: 107, rgbindex: 91, name: "pink", r: 0xFF, g: 0xC0, b: 0xCB },                /* #FFC0CB */
    { colortyp: "rgb_color", tableindex: 108, rgbindex: 92, name: "antique-white", r: 0xFA, g: 0xEB, b: 0xD7 },       /* #FAEBD7 */
    { colortyp: "rgb_color", tableindex: 109, rgbindex: 93, name: "beige", r: 0xF5, g: 0xF5, b: 0xDC },               /* #F5F5DC */
    { colortyp: "rgb_color", tableindex: 110, rgbindex: 94, name: "bisque", r: 0xFF, g: 0xE4, b: 0xC4 },              /* #FFE4C4 */
    { colortyp: "rgb_color", tableindex: 111, rgbindex: 95, name: "blanched-almond", r: 0xFF, g: 0xEB, b: 0xCD },     /* #FFEBCD */
    { colortyp: "rgb_color", tableindex: 112, rgbindex: 96, name: "wheat", r: 0xF5, g: 0xDE, b: 0xB3 },               /* #F5DEB3 */
    { colortyp: "rgb_color", tableindex: 113, rgbindex: 97, name: "corn-silk", r: 0xFF, g: 0xF8, b: 0xDC },           /* #FFF8DC */
    { colortyp: "rgb_color", tableindex: 114, rgbindex: 98, name: "lemon-chiffon", r: 0xFF, g: 0xFA, b: 0xCD },       /* #FFFACD */
    { colortyp: "rgb_color", tableindex: 115, rgbindex: 99, name: "light-golden-rod-yellow", r: 0xFA, g: 0xFA, b: 0xD2 },                        /* #FAFAD2 */
    { colortyp: "rgb_color", tableindex: 116, rgbindex: 100, name: "light-yellow", r: 0xFF, g: 0xFF, b: 0xE0 },        /* #FFFFE0 */
    { colortyp: "rgb_color", tableindex: 117, rgbindex: 101, name: "saddle-brown", r: 0x8B, g: 0x45, b: 0x13 },        /* #8B4513 */
    { colortyp: "rgb_color", tableindex: 118, rgbindex: 102, name: "sienna", r: 0xA0, g: 0x52, b: 0x2D },              /* #A0522D */
    { colortyp: "rgb_color", tableindex: 119, rgbindex: 103, name: "chocolate", r: 0xD2, g: 0x69, b: 0x1E },           /* #D2691E */
    { colortyp: "rgb_color", tableindex: 120, rgbindex: 104, name: "peru", r: 0xCD, g: 0x85, b: 0x3F },                /* #CD853F */
    { colortyp: "rgb_color", tableindex: 121, rgbindex: 105, name: "sandy-brown", r: 0xF4, g: 0xA4, b: 0x60 },         /* #F4A460 */
    { colortyp: "rgb_color", tableindex: 122, rgbindex: 106, name: "burly-wood", r: 0xDE, g: 0xB8, b: 0x87 },          /* #DEB887 */
    { colortyp: "rgb_color", tableindex: 123, rgbindex: 107, name: "tan", r: 0xD2, g: 0xB4, b: 0x8C },                 /* #D2B48C */
    { colortyp: "rgb_color", tableindex: 124, rgbindex: 108, name: "rosy-brown", r: 0xBC, g: 0x8F, b: 0x8F },          /* #BC8F8F */
    { colortyp: "rgb_color", tableindex: 125, rgbindex: 109, name: "moccasin", r: 0xFF, g: 0xE4, b: 0xB5 },            /* #FFE4B5 */
    { colortyp: "rgb_color", tableindex: 126, rgbindex: 110, name: "navajo-white", r: 0xFF, g: 0xDE, b: 0xAD },        /* #FFDEAD */
    { colortyp: "rgb_color", tableindex: 127, rgbindex: 111, name: "peach-puff", r: 0xFF, g: 0xDA, b: 0xB9 },          /* #FFDAB9 */
    { colortyp: "rgb_color", tableindex: 128, rgbindex: 112, name: "misty-rose", r: 0xFF, g: 0xE4, b: 0xE1 },          /* #FFE4E1 */
    { colortyp: "rgb_color", tableindex: 129, rgbindex: 113, name: "lavender-blush", r: 0xFF, g: 0xF0, b: 0xF5 },      /* #FFF0F5 */
    { colortyp: "rgb_color", tableindex: 130, rgbindex: 114, name: "linen", r: 0xFA, g: 0xF0, b: 0xE6 },               /* #FAF0E6 */
    { colortyp: "rgb_color", tableindex: 131, rgbindex: 115, name: "old-lace", r: 0xFD, g: 0xF5, b: 0xE6 },            /* #FDF5E6 */
    { colortyp: "rgb_color", tableindex: 132, rgbindex: 116, name: "papaya-whip", r: 0xFF, g: 0xEF, b: 0xD5 },         /* #FFEFD5 */
    { colortyp: "rgb_color", tableindex: 133, rgbindex: 117, name: "sea-shell", r: 0xFF, g: 0xF5, b: 0xEE },           /* #FFF5EE */
    { colortyp: "rgb_color", tableindex: 134, rgbindex: 118, name: "mint-cream", r: 0xF5, g: 0xFF, b: 0xFA },          /* #F5FFFA */
    { colortyp: "rgb_color", tableindex: 135, rgbindex: 119, name: "slate-gray", r: 0x70, g: 0x80, b: 0x90 },          /* #708090 */
    { colortyp: "rgb_color", tableindex: 136, rgbindex: 120, name: "light-slate-gray", r: 0x77, g: 0x88, b: 0x99 },    /* #778899 */
    { colortyp: "rgb_color", tableindex: 137, rgbindex: 121, name: "light-steel-blue", r: 0xB0, g: 0xC4, b: 0xDE },    /* #B0C4DE */
    { colortyp: "rgb_color", tableindex: 138, rgbindex: 122, name: "lavender", r: 0xE6, g: 0xE6, b: 0xFA },            /* #E6E6FA */
    { colortyp: "rgb_color", tableindex: 139, rgbindex: 123, name: "floral-white", r: 0xFF, g: 0xFA, b: 0xF0 },        /* #FFFAF0 */
    { colortyp: "rgb_color", tableindex: 140, rgbindex: 124, name: "alice-blue", r: 0xF0, g: 0xF8, b: 0xFF },          /* #F0F8FF */
    { colortyp: "rgb_color", tableindex: 141, rgbindex: 125, name: "ghost-white", r: 0xF8, g: 0xF8, b: 0xFF },         /* #F8F8FF */
    { colortyp: "rgb_color", tableindex: 142, rgbindex: 126, name: "honeydew", r: 0xF0, g: 0xFF, b: 0xF0 },            /* #F0FFF0 */
    { colortyp: "rgb_color", tableindex: 143, rgbindex: 127, name: "ivory", r: 0xFF, g: 0xFF, b: 0xF0 },               /* #FFFFF0 */
    { colortyp: "rgb_color", tableindex: 144, rgbindex: 128, name: "azure", r: 0xF0, g: 0xFF, b: 0xFF },               /* #F0FFFF */
    { colortyp: "rgb_color", tableindex: 145, rgbindex: 129, name: "snow", r: 0xFF, g: 0xFA, b: 0xFA },                /* #FFFAFA */
    { colortyp: "rgb_color", tableindex: 146, rgbindex: 130, name: "black", r: 0x00, g: 0x00, b: 0x00 },               /* #000000 */
    { colortyp: "rgb_color", tableindex: 147, rgbindex: 131, name: "dim-gray", r: 0x69, g: 0x69, b: 0x69 },            /* #696969 */
    { colortyp: "rgb_color", tableindex: 148, rgbindex: 132, name: "gray", r: 0x80, g: 0x80, b: 0x80 },                /* #808080 */
    { colortyp: "rgb_color", tableindex: 149, rgbindex: 133, name: "dark-gray", r: 0xA9, g: 0xA9, b: 0xA9 },           /* #A9A9A9 */
    { colortyp: "rgb_color", tableindex: 150, rgbindex: 134, name: "silver", r: 0xC0, g: 0xC0, b: 0xC0 },              /* #C0C0C0 */
    { colortyp: "rgb_color", tableindex: 151, rgbindex: 135, name: "light-gray", r: 0xD3, g: 0xD3, b: 0xD3 },          /* #D3D3D3 */
    { colortyp: "rgb_color", tableindex: 152, rgbindex: 136, name: "gainsboro", r: 0xDC, g: 0xDC, b: 0xDC },           /* #DCDCDC */
    { colortyp: "rgb_color", tableindex: 153, rgbindex: 137, name: "white-smoke", r: 0xF5, g: 0xF5, b: 0xF5 },         /* #F5F5F5 */
    { colortyp: "rgb_color", tableindex: 154, rgbindex: 138, name: "white", r: 0xFF, g: 0xFF, b: 0xFF },               /* #FFFFFF */
];



export function colortable_to_int32(cte) 
{
    let clr = C.NO_COLOR | C.NH_BASIC_COLOR;

    if (cte.colortyp == C.rgb_color)
        clr = C.int((cte.r << 16n) | (cte.g << 8n) | cte.b);
    else if (cte.colortyp == C.nh_color)
        clr = cte.tableindex | C.NH_BASIC_COLOR;
    return clr;
}

export function color_attr_to_str(ca) 
{
    let buf = C.colorattState.buf;

    C.Sprintf(buf, "%s&%s",
            clr2colorname(ca.color),
            attr2attrname(ca.attr));
    return buf;
}

/* parse string like "color&attr" into color_attr */
export function color_attr_parse_str(ca, str) 
{
    let buf = C.stackAlloc(C.BUFSZ);
    let amp = 0;
    let tmp, c = C.NO_COLOR, a = C.ATR_NONE;

    C.strncpy(buf, str, C.BUFSZ - 1);
    C.storeChar(buf + C.BUFSZ - 1, 0);

    if ((amp = C.strchr(buf, '&'.charCodeAt(0))) != 0)
        C.storeChar(amp, 0);

    if (amp) {
        amp++;
        c = match_str2clr(buf, 0);
        a = match_str2attr(amp, 1);
        /* FIXME: match_str2clr & match_str2attr give config_error_add(),
           so this is useless */
        if (c >= C.CLR_MAX && a == -1) {
            /* try other way around */
            c = match_str2clr(amp, 0);
            a = match_str2attr(buf, 1);
        }
        if (c >= C.CLR_MAX || a == -1)
            return 0;
    } else {
        /* one param only */
        tmp = match_str2attr(buf, 0);
        if (tmp == -1) {
            tmp = match_str2clr(buf, 0);
            if (tmp >= C.CLR_MAX)
                return 0;
            c = tmp;
        } else {
            a = tmp;
        }
    }
    ca.attr = a;
    ca.color = c;
    return 1;
}

export function query_color_attr(ca, prompt) 
{
    let c, a;

    c = C.callLocal(query_color, prompt, ca.color);
    if (c == -1)
        return 0;
    a = C.callLocal(query_attr, prompt, ca.attr);
    if (a == -1)
        return 0;
    ca.color = c;
    ca.attr = a;
    return 1;
}

export function attr2attrname(attr) 
{
    attr = C.int(attr);
    let i;

    for (i = 0; i < C.attrnames.length; i++)
        if (C.attrnames[i].attr == attr)
            return C.attrnames[i].name;
    return 0;
}

/*
 * Color support functions and data for "color"
 *
 * Used by: optfn_()
 *
 */

export function clr2colorname(clr) 
{
    clr = C.int(clr);
    let i;

    for (i = 0; i < C.colornames.length; i++)
        if (C.colornames[i].name && C.colornames[i].color == clr)
            return C.colornames[i].name;
    return 0;
}

export function match_str2clr(str, suppress_msg) 
{
    suppress_msg = C.boolean(suppress_msg);
    let i, c = C.CLR_MAX;

    /* allow "lightblue", "light blue", and "light-blue" to match "light blue"
       (also junk like "_l i-gh_t---b l u e" but we won't worry about that);
       also copes with trailing space; caller has removed any leading space */
    for (i = 0; i < C.colornames.length; i++)
        if (C.colornames[i].name
            && C.fuzzymatch(str, C.colornames[i].name, " -_", 1)) {
            c = C.colornames[i].color;
            break;
        }
    if (i == C.colornames.length && C.digit(C.loadChar(str)))
        c = C.atoi(str);

    if (c < 0 || c >= C.CLR_MAX) {
        if (!suppress_msg)
            C.config_error_add("Unknown color '%.60s'", str);
        c = C.CLR_MAX; /* "none of the above" */
    }
    return c;
}

export function match_str2attr(str, complain) 
{
    complain = C.boolean(complain);
    let i, a = -1;

    for (i = 0; i < C.attrnames.length; i++)
        if (C.attrnames[i].name
            && C.fuzzymatch(str, C.attrnames[i].name, " -_", 1)) {
            a = C.attrnames[i].attr;
            break;
        }

    if (a == -1 && complain)
        C.config_error_add("Unknown text attribute '%.50s'", str);

    return a;
}

/* ask about highlighting attribute; for menu headers and menu
   coloring patterns, only one attribute at a time is allowed;
   for status highlighting, multiple attributes are allowed [overkill;
   life would be much simpler if that were restricted to one also...] */
export function query_attr(prompt, dflt_attr) 
{
    dflt_attr = C.int(dflt_attr);
    let tmpwin;
    let any = C.anyLocal();
    let i, pick_cnt;
    let picks = C.menuPointerLocal();
    picks.value = 0;
    let allow_many = (prompt && !C.strncmpi(prompt, "Choose", 6));
    let clr = C.NO_COLOR;

    tmpwin = C.create_nhwindow(C.NHW_MENU);
    C.start_menu(tmpwin, C.MENU_BEHAVE_STANDARD);
    C.copyAny(any, C.cg.zeroany);
    for (i = 0; i < C.attrnames.length; i++) {
        if (!C.attrnames[i].name)
            break;
        any.a_int = i + 1;
        C.add_menu(tmpwin, C.nul_glyphinfo, any, 0, 0,
                 C.attrnames[i].attr, clr, C.attrnames[i].name,
                 (C.attrnames[i].attr == dflt_attr) ? C.MENU_ITEMFLAGS_SELECTED
                                                  : C.MENU_ITEMFLAGS_NONE);
    }
    C.end_menu(tmpwin, (prompt && C.loadChar(prompt)) ? prompt : "Pick an attribute");
    pick_cnt = C.select_menu(tmpwin, allow_many ? C.PICK_ANY : C.PICK_ONE, picks);
    C.destroy_nhwindow(tmpwin);
    if (pick_cnt > 0) {
        let j, k = 0;

        if (allow_many) {
            /* PICK_ANY, with one preselected entry (ATR_NONE) which
               should be excluded if any other choices were picked */
            for (i = 0; i < pick_cnt; ++i) {
                j = picks.value[i].item.a_int - 1;
                if (C.attrnames[j].attr != C.ATR_NONE || pick_cnt == 1) {
                    switch (C.attrnames[j].attr) {
                    case C.ATR_NONE:
                        k = C.HL_NONE;
                        break;
                    case C.ATR_BOLD:
                        k |= C.HL_BOLD;
                        break;
                    case C.ATR_DIM:
                        k |= C.HL_DIM;
                        break;
                    case C.ATR_ITALIC:
                        k |= C.HL_ITALIC;
                        break;
                    case C.ATR_ULINE:
                        k |= C.HL_ULINE;
                        break;
                    case C.ATR_BLINK:
                        k |= C.HL_BLINK;
                        break;
                    case C.ATR_INVERSE:
                        k |= C.HL_INVERSE;
                        break;
                    }
                }
            }
        } else {
            /* PICK_ONE, but might get 0 or 2 due to preselected entry */
            j = picks.value[0].item.a_int - 1;
            /* pick_cnt==2: explicitly picked something other than the
               preselected entry */
            if (pick_cnt == 2 && C.attrnames[j].attr == dflt_attr)
                j = picks.value[1].item.a_int - 1;
            k = C.attrnames[j].attr;
        }
        C.free(picks.value);
        return k;
    } else if (pick_cnt == 0 && !allow_many) {
        /* PICK_ONE, preselected entry explicitly chosen */
        return dflt_attr;
    }
    /* either ESC to explicitly cancel (pick_cnt==-1) or
       PICK_ANY with preselected entry toggled off and nothing chosen */
    return -1;
}

export function query_color(prompt, dflt_color) 
{
    dflt_color = C.int(dflt_color);
    let tmpwin;
    let any = C.anyLocal();
    let i, pick_cnt;
    let picks = C.menuPointerLocal();
    picks.value = 0;

    /* replace user patterns with color name ones and force 'menucolors' On */
    C.callLocal(basic_menu_colors, 1);

    tmpwin = C.create_nhwindow(C.NHW_MENU);
    C.start_menu(tmpwin, C.MENU_BEHAVE_STANDARD);
    C.copyAny(any, C.cg.zeroany);
    for (i = 0; i < C.colornames.length; i++) {
        if (!C.colornames[i].name)
            break;
        any.a_int = i + 1;
        C.add_menu(tmpwin, C.nul_glyphinfo, any, 0, 0,
                 C.ATR_NONE, C.NO_COLOR, C.colornames[i].name,
                 (C.colornames[i].color == dflt_color) ? C.MENU_ITEMFLAGS_SELECTED
                                                     : C.MENU_ITEMFLAGS_NONE);
    }
    C.end_menu(tmpwin, (prompt && C.loadChar(prompt)) ? prompt : "Pick a color");
    pick_cnt = C.select_menu(tmpwin, C.PICK_ONE, picks);
    C.destroy_nhwindow(tmpwin);

    /* remove temporary color name patterns and restore user-specified ones;
       reset 'menucolors' option to its previous value */
    C.callLocal(basic_menu_colors, 0);

    if (pick_cnt > 0) {
        i = C.colornames[picks.value[0].item.a_int - 1].color;
        /* pick_cnt==2: explicitly picked something other than the
           preselected entry */
        if (pick_cnt == 2 && i == C.NO_COLOR)
            i = C.colornames[picks.value[1].item.a_int - 1].color;
        C.free(picks.value);
        return i;
    } else if (pick_cnt == 0) {
        /* pick_cnt==0: explicitly picking preselected entry toggled it off */
        return dflt_color;
    }
    return -1;
}



 /* from sys/share/<various>regex.{c,cpp} */

/* set up a menu for picking a color, one that shows each name in its color;
   overrides player's MENUCOLORS with a set of "blue"=blue, "red"=red, and
   so forth; suppresses color for black and white because one of those will
   likely be invisible due to matching the background; the alternate set of
   MENUCOLORS is kept around for potential re-use */
export function basic_menu_colors(load_colors) /* True: temporarily replace menu color entries with
                          * a fake set of menu colors which match their names;
                          * False: restore user-specified colorings */

{
    load_colors = C.boolean(load_colors);
    if (load_colors) {
        /* replace normal menu colors with a set specifically for colors */
        C.gs.save_menucolors = C.iflags.use_menu_color;
        C.gs.save_colorings = C.gm.menu_colorings;

        C.iflags.use_menu_color = 1;
        if (C.gc.color_colorings) {
            /* use the alternate colorings which were set up previously */
            C.gm.menu_colorings = C.gc.color_colorings;
        } else {
            /* create the alternate colorings once */
            let cnm = C.stackAlloc(C.QBUFSZ);
            let i, c;
            let pmatchregex = !C.strcmpi(C.regex_id, "pmatchregex");
            let patternfmt = pmatchregex ? "*%s" : "%s";

            /* menu_colorings pointer has been saved; clear it in order
               to add the alternate entries as if from scratch */
            C.gm.menu_colorings = 0;

            /* this orders the patterns last-in/first-out; that means
               that the "light <foo>" variations come before the basic
               "<foo>" ones, which is exactly what we want (so that the
               shorter basic names won't get false matches as substrings
               of the longer ones) */
            for (i = 0; i < C.colornames.length; ++i) {
                if (!C.colornames[i].name) /* first alias entry has no name */
                    break;
                c = C.colornames[i].color;
                if (c == C.CLR_BLACK || c == C.CLR_WHITE || c == C.NO_COLOR)
                    continue; /* skip these */
                C.Sprintf(cnm, patternfmt, C.colornames[i].name);
                C.callLocal(add_menu_coloring_parsed, cnm, c, C.ATR_NONE);
            }

            /* right now, menu_colorings contains the alternate color list;
               remember that list for future pick-a-color instances and
               also keep it as is for this instance */
            C.gc.color_colorings = C.gm.menu_colorings;
        }
    } else {
        /* restore normal user-specified menu colors */
        C.iflags.use_menu_color = C.gs.save_menucolors;
        C.gm.menu_colorings = C.gs.save_colorings;
    }
}



export function add_menu_coloring_parsed(str, c, a) 
{
    a = C.int(a);
    c = C.int(c);
    const re_error = "Menucolor regex error";
    let tmp;

    if (!str)
        return 0;
    tmp = C.menuColoring(C.alloc(C.menuColoringSize));
    tmp.match = C.regex_init();
    /* test_regex_pattern() has already validated this regexp but parsing
       it again could conceivably run out of memory */
    if (!C.regex_compile(str, tmp.match)) {
        let errbuf = C.stackAlloc(C.BUFSZ);
        let re_error_desc = C.regex_error_desc(tmp.match, errbuf);

        /* free first in case reason for regcomp failure was out-of-memory */
        C.regex_free(tmp.match);
        C.free(tmp);
        C.config_error_add("%s: %s", re_error, re_error_desc);
        return 0;
    }
    tmp.next = C.gm.menu_colorings;
    tmp.origstr = C.dupstr(str);
    tmp.color = c;
    tmp.attr = a;
    C.gm.menu_colorings = tmp;
    C.iflags.use_menu_color = 1;
    return 1;
}

/* parse '"regex_string"=color&attr' and add it to menucoloring */
export function add_menu_coloring(tmpstr) /* never Null but could be empty */

{
    let c = C.NO_COLOR, a = C.ATR_NONE;
    let tmps, cs, amp;
    let str = C.stackAlloc(C.BUFSZ);

    C.strncpy(str, tmpstr, C.BUFSZ - 1);
    C.storeChar(str + C.BUFSZ - 1, 0);

    if ((cs = C.strchr(str, '='.charCodeAt(0))) == 0) {
        C.config_error_add("Malformed MENUCOLOR");
        return 0;
    }

    tmps = cs + 1; /* advance past '=' */
    C.mungspaces(tmps);
    if ((amp = C.strchr(tmps, '&'.charCodeAt(0))) != 0)
        C.storeChar(amp, 0);

    c = match_str2clr(tmps, 0);
    if (c >= C.CLR_MAX)
        return 0;

    if (amp) {
        tmps = amp + 1; /* advance past '&' */
        a = match_str2attr(tmps, 1);
        if (a == -1)
            return 0;
    }

    /* the regexp portion here has not been condensed by mungspaces() */
    C.storeChar(cs, 0);
    tmps = str;
    if (C.loadChar(tmps) == '"'.charCodeAt(0) || C.loadChar(tmps) == '\''.charCodeAt(0)) {
        cs--;
        while (C.isspace(C.uint8(C.loadChar(cs))))
            cs--;
        if (C.loadChar(cs) == C.loadChar(tmps)) {
            C.storeChar(cs, 0);
            tmps++;
        }
    }
    return C.callLocal(add_menu_coloring_parsed, tmps, c, a);
}

/* release all menu color patterns */
export function free_menu_coloring() 
{
    /* either menu_colorings or color_colorings or both might need to
       be freed or already be Null; do-loop will iterate at most twice */
    do {
        let tmp, tmp2;

        for (tmp = C.gm.menu_colorings; tmp; tmp = tmp2) {
            tmp2 = tmp.next;
            C.regex_free(tmp.match);
            C.free(tmp.origstr);
            C.free(tmp);
        }
        C.gm.menu_colorings = C.gc.color_colorings;
        C.gc.color_colorings = 0;
    } while (C.gm.menu_colorings);
}

/* release a specific menu color pattern; not used for color_colorings */
export function free_one_menu_coloring(idx) /* 0 .. */

{
    idx = C.int(idx);
    let tmp = C.gm.menu_colorings;
    let prev = 0;

    while (tmp) {
        if (idx == 0) {
            let next = tmp.next;

            C.regex_free(tmp.match);
            C.free(tmp.origstr);
            C.free(tmp);
            if (prev)
                prev.next = next;
            else
                C.gm.menu_colorings = next;
            return;
        }
        idx--;
        prev = tmp;
        tmp = tmp.next;
    }
}

export function count_menucolors() 
{
    let tmp;
    let count = 0;

    for (tmp = C.gm.menu_colorings; tmp; tmp = tmp.next)
        count++;
    return count;
}

/* returns -1 on no-match.
 * buf is NONNULLARG1
 */
export function check_enhanced_colors(buf) 
{
    let xtra = C.charLocal();
    xtra.value = 0; /* used to catch trailing junk after "#rrggbb" */
    let r = C.uint32Local(), g = C.uint32Local(), b = C.uint32Local();
    let retcolor = -1, color;

    if ((color = match_str2clr(buf, 1)) != C.CLR_MAX)  {
        retcolor = color | C.NH_BASIC_COLOR;
    } else if (C.sscanf(buf, "#%02x%02x%02x%c", r, g, b, xtra) >= 3) {
        retcolor = !xtra.value ? ((r.value << 16) | (g.value << 8) | b.value) : -1;
    } else {
        /* altbuf: allow user's "grey" to match colortable[]'s "gray";
         * fuzzymatch(): ignore spaces, hyphens, and underscores so that
         * space or underscore in user-supplied name will match hyphen
         * [note: caller splits text at spaces so we won't see any here]
         */
        let altbuf = 0, grey = C.strstri(buf, "grey");
        let greyoffset = grey ? (grey - buf) : -1;

        if (greyoffset >= 0) {
            altbuf = C.dupstr(buf);
            /* use direct copy because strsubst() is case-sensitive */
            /*(void) strncpy(&altbuf[greyoffset], "gray", 4);*/
            C.memcpy(altbuf + greyoffset, "gray", 4);
        }
        for (color = 0; color < C.colortable.length; ++color) {
            if (C.fuzzymatch(buf, C.colortable[color].name, " -_", 1)
                || (altbuf && C.fuzzymatch(altbuf, C.colortable[color].name,
                                         " -_", 1))) {
                retcolor = colortable_to_int32(C.colortable[color]);
                break;
            }
        }
        if (altbuf)
            C.free(altbuf);
    }
    return retcolor;
}

/* return the canonical name of a particular color */
export function wc_color_name(colorindx) 
{
    colorindx = C.int(colorindx);
    let hexcolor = C.colorattState.hexcolor; /* includes room for '\0' */
    let result = "no-color";

    if (colorindx >= 0) {
        let basicindx = colorindx & ~C.NH_BASIC_COLOR;

        /* if colorindx has NH_BASIC_COLOR bit set, basicindx won't,
           so differing implies a basic color */
        if (basicindx != colorindx) {
            C.assert(basicindx < 16);
            result = C.colortable[basicindx].name;
        } else {
            let indx;
            let r = C.long((colorindx >> 16) & 0x0000ff), /* shift rrXXXX to rr */
                 g = C.long((colorindx >> 8) & 0x0000ff),  /* shift XXggXX to gg */
                 b = C.long(colorindx & 0x0000ff);         /* mask  XXXXbb to bb */

            C.Snprintf(hexcolor, 8, "#%02x%02x%02x",
                     C.uint8(r), C.uint8(g), C.uint8(b), 0);
            result = hexcolor;
            /* override hex value if this is a named color */
            for (indx = 16; indx < C.colortable.length; ++indx)
                if (C.colortable[indx].r == r
                    && C.colortable[indx].g == g
                    && C.colortable[indx].b == b) {
                    result = C.colortable[indx].name;
                    break;
                }
        }
    }
    return C.cString(result);
}

/* hexdd[] is defined in decl.c */
export function onlyhexdigits(buf) 
{
    let dp = buf;

    for (dp = buf; C.loadChar(dp); ++dp) {
        if (!(C.strchr(C.hexdd, C.loadChar(dp)) || C.loadChar(dp) == '-'.charCodeAt(0)))
            return 0;
    }
    return 1;
}

export function rgbstr_to_int32(rgbstr) 
{
    let r, g, b, milestone = 0;
    let cp, c_r, c_g, c_b;
    let rgb = 0;
    let buf = C.stackAlloc(C.BUFSZ);
    let dash = 0;


    C.Snprintf(buf, C.BUFSZ, "%s",
             rgbstr ? rgbstr : "", 1);

    if (C.loadChar(buf) && onlyhexdigits(buf)) {
        c_g = c_b = 0;
        c_r = cp = buf;
        while (C.loadChar(cp)) {
            if (C.digit(C.loadChar(cp)) || C.loadChar(cp) == '-'.charCodeAt(0)) {
                if (C.loadChar(cp) == '-'.charCodeAt(0)) {
                    C.storeChar(cp, 0);
                    milestone++;
                    dash = 1;
                }
                cp++;
                if (dash) {
                    if (milestone < 2)
                        c_g = cp;
                    else
                        c_b = cp;
                    dash = 0;
                }
            } else {
                return -1;
            }
        }
        /* sanity checks */
        if (c_r && c_g && c_b
            && (C.strlen(c_r) > 0 && C.strlen(c_r) < 4)
            && (C.strlen(c_g) > 0 && C.strlen(c_g) < 4)
            && (C.strlen(c_b) > 0 && C.strlen(c_b) < 4)) {
            r = C.atoi(c_r);
            g = C.atoi(c_g);
            b = C.atoi(c_b);
            rgb = (r << 16) | (g << 8) | (b << 0);
            return rgb;
        }
    } else if (C.loadChar(buf)) {
        /* perhaps an enhanced color name was used instead of rgb value? */
        if ((rgb = C.callLocal(check_enhanced_colors, buf)) != -1) {
            return rgb;
        }
    }
    return -1;
}

export function set_map_customcolor(gmap, nhcolor) 
{
    nhcolor = C.uint(nhcolor);
    let tmpgm = gmap;
    let closecolor = C.uint32Local();
    closecolor.value = 0;
    let clridx = C.uint16Local();
    clridx.value = 0;

    if (!tmpgm)
        return 0;

    gmap.customcolor = nhcolor;
    if (closest_color(nhcolor, closecolor, clridx))
        gmap.color256idx = clridx.value;
    else
        gmap.color256idx = 0;
    return 1;
}

export const color_256_definitions = [
    /* color values are from unnethack */
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

/** Calculate the color distance between two colors.
 *
 * Algorithm taken from UnNetHack which took it from
 * https://www.compuphase.com/cmetric.htm
 **/

export function color_distance(rgb1, rgb2) 
{
    rgb2 = C.uint(rgb2);
    rgb1 = C.uint(rgb1);
    let r1 = (rgb1 >>> 16) & 0xFF;
    let g1 = (rgb1 >>> 8) & 0xFF;
    let b1 = (rgb1) & 0xFF;
    let r2 = (rgb2 >>> 16) & 0xFF;
    let g2 = (rgb2 >>> 8) & 0xFF;
    let b2 = (rgb2) & 0xFF;

    let rmean = Math.trunc((r1 + r2) / 2);
    let r = r1 - r2;
    let g = g1 - g2;
    let b = b1 - b2;
    return ((((512 + rmean) * r * r) >> 8) + 4 * g * g
            + (((767 - rmean) * b * b) >> 8));
}

export function closest_color(lcolor, closecolor, clridx) 
{
    lcolor = C.uint(lcolor);
    let i, color_index = -1, similar = C.INT_MAX, current;
    let retbool = 0;

    for (i = 0; i < C.color_256_definitions.length; i++) {
        /* look for an exact match */
        if (lcolor == C.color_256_definitions[i].value) {
            color_index = i;
            break;
        }
        /* find a close color match */
        current = color_distance(lcolor, C.color_256_definitions[i].value);
        if (current < similar) {
            color_index = i;
            similar = current;
        }
    }
    if (closecolor && clridx && color_index >= 0) {
        closecolor.value = C.color_256_definitions[color_index].value;
        clridx.value = C.color_256_definitions[color_index].index;
        retbool = 1;
    }
    return retbool;
}

export function get_nhcolor_from_256_index(idx) 
{
    idx = C.int(idx);
    let retcolor = C.NO_COLOR | C.NH_BASIC_COLOR;

    if ((idx >= 0 && idx < C.color_256_definitions.length))
        retcolor = C.color_256_definitions[idx].value;
    return retcolor;
}

/* some sanity checks */
/* use COLORVAL(ga.altpalette[coloridx]) to get
               the actual rgb value out of ga.altpalette[] */
/* hexdd[] is defined in decl.c */
/* for decimal, octal, hexadecimal cases */
/* simple val, or nothing left for \ to escape */
/* CHANGE_COLOR */

/*coloratt.c*/
