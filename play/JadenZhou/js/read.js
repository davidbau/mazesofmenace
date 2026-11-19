// read.js — scroll/spellbook reading.
// C ref: read.c. Only the candy wrapper helpers are ported so far.

import { rn2 } from './rng.js';
import { CANDY_BAR } from './objects.js';

// C ref: read.c candy_wrappers[]
const candy_wrappers = [
    '',                         /* (none -- should never happen) */
    'Apollo',                   /* Lost */
    'Moon Crunchy',             /* South Park */
    'Snacky Cake',    'Chocolate Nuggie', 'The Small Bar',
    'Crispy Yum Yum', 'Nilla Crunchie',   'Berry Bar',
    'Choco Nummer',   'Om-nom', /* Cat Macro */
    'Fruity Oaty',              /* Serenity */
    'Wonka Bar',                /* Charlie and the Chocolate Factory */
];

// C ref: read.c candy_wrapper_text()
/* return the text of a candy bar's wrapper */
export function candy_wrapper_text(obj) {
    /* modulo operation is just bullet proofing; 'spe' is already in range */
    return candy_wrappers[obj.spe % candy_wrappers.length];
}

// C ref: read.c assign_candy_wrapper()
/* assign a wrapper to a candy bar stack */
export function assign_candy_wrapper(obj) {
    if (obj.otyp === CANDY_BAR) {
        /* skips candy_wrappers[0] */
        obj.spe = 1 + rn2(candy_wrappers.length - 1);
    }
    return;
}
