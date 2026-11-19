// insight.js — enlightenment, conduct and attribute descriptions.
// C ref: insight.c
//
// Ported so far: align_str().

import { A_CHAOTIC, A_NEUTRAL, A_LAWFUL, A_NONE } from './const.js';

// C ref: insight.c align_str()
export function align_str(alignment) {
    switch (alignment) {
    case A_CHAOTIC:
        return "chaotic";
    case A_NEUTRAL:
        return "neutral";
    case A_LAWFUL:
        return "lawful";
    case A_NONE:
        return "unaligned";
    }
    return "unknown";
}
