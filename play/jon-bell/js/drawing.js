// drawing.c — def_char_to_monclass (convert character to monster class).
// @ts-nocheck — js sibling imports.

/* def_monsyms[].sym — C drawing.c def_monsyms[MAXMCLASSES], built from
 * defsym.h MONSYM(idx, ch, ...) rows 1..60.  Row 0 is C's own
 * { '\0', "", "" } entry (no class 0); def_char_to_monclass never tests it. */
export const MAXMCLASSES = 61; /* C sym.h enum mon_syms MAXMCLASSES (defsym.h MONSYM rows 1..60) */
const def_monsyms_sym = '\0abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ@ \'&;:~]';

/*
 * Convert a character into a monster class.  This returns the _first_
 * match made.  If there are no matches, return MAXMCLASSES.
 * Used in detect.c, drawing.c, mondata.c, options.c, pickup.c,
 * sp_lev.c, and windows.c.
 *
 * C ref: nethack-c-v5/upstream/src/drawing.c:107-116.  'ch' is a char CODE.
 */
export function def_char_to_monclass(ch) {
    let i;

    for (i = 1; i < MAXMCLASSES; i++)
        if (ch === def_monsyms_sym.charCodeAt(i))
            break;
    return i;
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
export const MAXOCLASSES = 18;
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

