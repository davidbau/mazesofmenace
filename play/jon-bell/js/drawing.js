// drawing.c — symbol class conversions and furniture check.
// @ts-nocheck — js sibling imports.

import { DEFSYM_EXPLANATION } from './defsym_data.js';

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
 * C ref: nethack-c-v5/upstream/src/drawing.c:90-99.  'ch' is a char CODE.
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

/* defsyms[].sym — C drawing.c defsyms[MAXPCHARS + 1], built from
 * defsym.h PCHAR/PCHAR2 rows 0..104.  Explanations live in DEFSYM_EXPLANATION. */
const MAXPCHARS = DEFSYM_EXPLANATION.length; /* C sym.h enum cmap_symbols MAXPCHARS = 105 */
const defsyms_sym = ' |--------||.-|++##..`###<><><><>_|\\{{}.}}..## #}^^^^^^^^^^^^^^^^^"^^^^~^^|-\\/*!)(0#@*#$/-\\||\\-//-\\| |\\-/';

/*
 * Does 'ch' represent a furniture character?  Returns index into defsyms[].
 *
 * C ref: nethack-c-v5/upstream/src/drawing.c:119-142.  'ch' is a char CODE.
 */
export function def_char_is_furniture(ch) {
    const first_furniture = 'stair'; /* "staircase up" */
    const last_furniture = 'fountain';
    let i;
    let furniture = false;
    const uch = ch & 0xff;

    for (i = 0; i < MAXPCHARS; ++i) {
        if (!furniture) {
            if (DEFSYM_EXPLANATION[i].startsWith(first_furniture))
                furniture = true;
        }
        if (furniture) {
            if (defsyms_sym.charCodeAt(i) === uch)
                return i;
            if (DEFSYM_EXPLANATION[i] === last_furniture)
                break; /* reached last furniture */
        }
    }
    return -1;
}

