// drawing.js, symbol lookups.
// C ref: src/drawing.c
import { def_monsyms } from './drawing_data.js';
import { defsyms } from './drawing_data.js';

// src/drawing.c:108 def_char_to_monclass(), a monster class symbol to its
// class index (MAXMCLASSES when no class uses that symbol).
export function def_char_to_monclass(ch) {
    let i;

    for (i = 1; i < def_monsyms.length; i++)
        if (ch === def_monsyms[i])
            break;
    return i;
}

// src/drawing.c:120 def_char_is_furniture(), the S_ index of the furniture
// symbol ch, or -1; furniture is the contiguous block from the staircases
// through the fountain.
export function def_char_is_furniture(ch) {
    const first_furniture = 'stair', /* "staircase up" */
          last_furniture = 'fountain';
    let i;
    let furniture = false;

    for (i = 0; i < defsyms.length; ++i) {
        if (!furniture) {
            if ((defsyms[i].explain || '').startsWith(first_furniture))
                furniture = true;
        }
        if (furniture) {
            if (defsyms[i].sym === ch)
                return i;
            if (defsyms[i].explain === last_furniture)
                break; /* reached last furniture */
        }
    }
    return -1;
}
