// do_name.js — naming things.
// C ref: src/do_name.c
//
// Only rndghostname() so far. It DRAWS twice on the common path and makemon()
// calls it for every PM_GHOST, which the "Ghost of an Adventurer" themeroom
// creates, so skipping it left two calls unspent in the middle of level
// generation.

import { game } from './gstate.js';
import { rn2 } from './rng.js';

// src/do_name.c:759 ghostnames[] — 34 entries.
const ghostnames = [
    'Adri', 'Andries', 'Andreas', 'Bert', 'David', 'Dirk',
    'Emile', 'Frans', 'Fred', 'Greg', 'Hether', 'Jay',
    'John', 'Jon', 'Karnov', 'Kay', 'Kenny', 'Kevin',
    'Maud', 'Michiel', 'Mike', 'Peter', 'Robert', 'Ron',
    'Tom', 'Wilmar', 'Nick Danger', 'Phoenix', 'Jiro', 'Mizue',
    'Stephan', 'Lance Braccus', 'Shadowhawk', 'Murphy',
];

// src/do_name.c:772 rndghostname()
//
//     return rn2(7) ? ROLL_FROM(ghostnames) : (const char *) svp.plname;
//
// Six times in seven a name is rolled from the table, which is a SECOND draw,
// rn2(34); the seventh time the ghost wears the hero's own name and no second
// draw happens. ROLL_FROM is include/hack.h:1493, array[rn2(SIZE(array))].
export function rndghostname() {
    return rn2(7) ? ghostnames[rn2(ghostnames.length)] : game.plname;
}
