// C ref: nethack-c/upstream/src/drawing.c — default symbol tables and
// char classifiers (1:1 with the C file). defsyms[] itself is generated
// (js/generated/defsyms_data.js via scripts/extract-defsyms.py);
// def_char_to_objclass lives canonically at js/objects.js (sibling),
// def_char_to_monclass is by-design unported (seed ledger row).
import { DEFSYMS } from './generated/defsyms_data.js';

/**
 * C drawing.c def_char_is_furniture `:119–142` — does `ch` represent a
 * furniture character? Returns the defsyms[] index, or -1.
 *
 * C order: scan `i < MAXPCHARS` (DEFSYMS.length === MAXPCHARS === 105;
 * the C { 0, NULL } fencepost at [MAXPCHARS] is omitted from the table
 * and never read — the scan breaks at S_fountain = 37). `furniture`
 * flips at the first explanation with a 5-char "stair" prefix
 * (S_upstair = 25, "staircase up"; nothing earlier matches); from there
 * the first `sym == (uchar) ch` wins, stopping past S_fountain ("fountain").
 * Furniture chars: `<` `>` (stairs/ladders ×2) `_` `|` `\` `{` `{`.
 */
export function def_char_is_furniture(ch) {
    // C `char ch` vs `(uchar) ch`: sibling def_char_to_objclass
    // (js/objects.js) normalization — first char for strings, code point
    // for numbers. The table syms are ASCII, so the comparison matches C
    // for every input (non-ASCII can never equal a table sym, as in C).
    const c = typeof ch === 'string' ? ch.charAt(0) : String.fromCharCode(ch);
    let furniture = false;
    for (let i = 0; i < DEFSYMS.length; i++) {
        const sym = DEFSYMS[i][0];
        const explanation = DEFSYMS[i][2];
        if (!furniture) {
            // C `:133` strncmp(explanation, "stair", 5)
            if (explanation.slice(0, 5) === 'stair') furniture = true;
        }
        if (furniture) {
            // C `:137` defsyms[i].sym == (uchar) ch
            if (sym === c) return i;
            // C `:139` strcmp(explanation, "fountain")
            if (explanation === 'fountain') break;
        }
    }
    return -1;
}
