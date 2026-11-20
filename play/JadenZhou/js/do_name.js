// do_name.js -- monster naming (C ref: do_name.c).
//
// Ported so far: christen_monst(), rndghostname().

import { game } from './gstate.js';
import { rn2, ROLL_FROM } from './rng.js';

const PL_PSIZ = 63; /* global.h */

// C ref: do_name.c christen_monst()
export function christen_monst(mtmp, name) {
    let lth;

    /* dogname & catname are PL_PSIZ arrays; object names have same limit */
    lth = (name && name.length) ? (name.length + 1) : 0;
    if (lth > PL_PSIZ) {
        lth = PL_PSIZ;
        name = name.slice(0, PL_PSIZ - 1);
    }
    /* new_mgivenname(mtmp, lth): removes old name if one is present */
    mtmp.mgivenname = lth ? name : '';
    /* if 'mtmp' is leashed, persistent inventory window needs updating:
       update_inventory() -- leashes aren't ported yet */
    return mtmp;
}

const ghostnames = [
    /* these names should have length < PL_NSIZ */
    /* Capitalize the names for aesthetics -dgk */
    "Adri",    "Andries",       "Andreas",     "Bert",    "David",  "Dirk",
    "Emile",   "Frans",         "Fred",        "Greg",    "Hether", "Jay",
    "John",    "Jon",           "Karnov",      "Kay",     "Kenny",  "Kevin",
    "Maud",    "Michiel",       "Mike",        "Peter",   "Robert", "Ron",
    "Tom",     "Wilmar",        "Nick Danger", "Phoenix", "Jiro",   "Mizue",
    "Stephan", "Lance Braccus", "Shadowhawk",  "Murphy",
];

// C ref: do_name.c rndghostname()
/* ghost names formerly set by x_monnam(), now by makemon() instead */
export function rndghostname() {
    return rn2(7) ? ROLL_FROM(ghostnames)
                  : game.plname;
}
