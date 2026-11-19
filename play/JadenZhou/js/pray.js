// pray.js — prayer and god-name helpers.
// C ref: pray.c
//
// Only the god-name helpers needed so far (role_init(), welcome()).

import { game } from './gstate.js';
import { A_NONE, A_LAWFUL, A_NEUTRAL, A_CHAOTIC } from './const.js';

// C ref: pray.c Moloch
const Moloch = "Moloch";

// C ref: pray.c align_gname()
export function align_gname(alignment) {
    let gnam;

    switch (alignment) {
    case A_NONE:
        gnam = Moloch;
        break;
    case A_LAWFUL:
        gnam = game.urole.lgod;
        break;
    case A_NEUTRAL:
        gnam = game.urole.ngod;
        break;
    case A_CHAOTIC:
        gnam = game.urole.cgod;
        break;
    default:
        // impossible("unknown alignment.");
        gnam = "someone";
        break;
    }
    if (gnam[0] === '_')
        gnam = gnam.slice(1);
    return gnam;
}

// C ref: pray.c align_gtitle()
/* return "god" or "goddess" */
export function align_gtitle(alignment) {
    let gnam;
    let result = "god";

    switch (alignment) {
    case A_LAWFUL:
        gnam = game.urole.lgod;
        break;
    case A_NEUTRAL:
        gnam = game.urole.ngod;
        break;
    case A_CHAOTIC:
        gnam = game.urole.cgod;
        break;
    default:
        gnam = null;
        break;
    }
    if (gnam && gnam[0] === '_')
        result = "goddess";
    return result;
}
