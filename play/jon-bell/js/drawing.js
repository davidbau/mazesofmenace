// drawing.c — def_char_to_monclass (convert character to monster class).
// @ts-nocheck — js sibling imports.

/**
 * Convert a character into a monster class. This returns the _first_
 * match made. If there are no matches, return MAXMCLASSES.
 * Used in detect.c, drawing.c, mondata.c, options.c, pickup.c,
 * sp_lev.c, and windows.c.
 *
 * C ref: nethack-c/src/drawing.c:107
 */
export function def_char_to_monclass(ch) {
    // def_monsyms indexed by monster symbol enum (from defsym.h MONSYMS_DRAWING)
    // Index: Character (from defsym.h MONSYM lines)
    // [0]: placeholder (not used, indexed from 1)
    // [1-26]: a-z (ANT through ZRUTY)
    // [27-52]: A-Z (ANGEL through ZOMBIE)
    // [53-60]: @, space, ', &, ;, :, ~, ]
    // MAXMCLASSES = 61
    const MAXMCLASSES = 61;
    const def_monsyms_chars = [
        undefined,  // 0: placeholder
        'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j',  // 1-10
        'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't',  // 11-20
        'u', 'v', 'w', 'x', 'y', 'z', 'A', 'B', 'C', 'D',  // 21-30
        'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N',  // 31-40
        'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X',  // 41-50
        'Y', 'Z', '@', ' ', "'", '&', ';', ':', '~', ']'   // 51-60
    ];

    // Convert ch (ASCII code) to character for comparison
    const chChar = String.fromCharCode(ch);

    // Iterate and compare character at each position
    for (let i = 1; i < MAXMCLASSES; i++) {
        if (chChar === def_monsyms_chars[i]) {
            return i;
        }
    }
    return MAXMCLASSES;
}

/**
 * Convert the given character to an object class. If the character is not
 * recognized, then MAXOCLASSES is returned. Used in detect.c, drawing.c,
 * invent.c, o_init.c, objnam.c, options.c, pickup.c, sp_lev.c, and
 * windows.c.
 *
 * C ref: nethack-c/src/drawing.c:90
 */
// def_oc_syms indexed by object class enum (from defsym.h OBJCLASS_DRAWING)
// Index: Character (from defsym.h OBJCLASS lines)
// [0]: placeholder (not used, indexed from 1)
// [1-17]: ], ), [, =, ", (, %, !, ?, +, /, $, *, `, 0, _, .
// MAXOCLASSES = 18
const MAXOCLASSES = 18;
export const def_oc_syms_chars = [
    undefined,  // 0: placeholder
    ']', ')', '[', '=', '"', '(', '%', '!',  // 1-8
    '?', '+', '/', '$', '*', '`', '0', '_', '.'  // 9-17
];

export function def_char_to_objclass(ch) {
    // Convert ch (ASCII code) to character for comparison
    const chChar = String.fromCharCode(ch);

    // Iterate and compare character at each position
    for (let i = 1; i < MAXOCLASSES; i++) {
        if (chChar === def_oc_syms_chars[i]) {
            return i;
        }
    }
    return MAXOCLASSES;
}

export function oc_to_str(src) {
    let dest = '';
    for (const ch of (Array.isArray(src) ? src : String(src ?? '')))
        if (def_oc_syms_chars.includes(ch))
            dest += ch;
    return dest;
}
