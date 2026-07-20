// o_init.js — Object initialization.
// C ref: o_init.c — shuffle gem colors, potion descriptions, etc.

import { rn2 } from './rng.js';
import { objects, NUM_OBJECTS } from './objects.js';
import { MAXOCLASSES, ILLOBJ_CLASS } from './const.js';

export const bases = new Int32Array(MAXOCLASSES + 2);
export const oclass_prob_totals = new Int32Array(MAXOCLASSES);

// C ref: o_init.c randomize_gem_colors() + shuffle() + init_objects()
// Exact shuffle sizes are constant across all seeds (compile-time object table).
// Total: 199 rn2 calls.
export function init_objects() {
    let first = MAXOCLASSES;
    let prevoclass = -1;

    while (first < NUM_OBJECTS) {
        let oclass = objects[first].oc_class;
        if (oclass < prevoclass) throw new Error("objects class not in order!");
        let last = first + 1;
        while (last < NUM_OBJECTS && objects[last].oc_class === oclass) last++;
        bases[oclass] = first;
        first = last;
        prevoclass = oclass;
    }

    bases[MAXOCLASSES] = bases[MAXOCLASSES + 1] = NUM_OBJECTS;
    for (let last = MAXOCLASSES - 1; last >= 0; --last) {
        if (!bases[last]) bases[last] = bases[last + 1];
    }

    for (let oclass = 0; oclass < MAXOCLASSES; ++oclass) {
        let sum = 0;
        for (let i = bases[oclass]; i < bases[oclass + 1]; ++i) {
            sum += objects[i].oc_prob;
        }
        if (sum <= 0 && oclass !== ILLOBJ_CLASS && bases[oclass] !== bases[oclass + 1]) {
            for (let i = bases[oclass]; i < bases[oclass + 1]; ++i) {
                objects[i].oc_prob = 1;
                sum++;
            }
        }
        oclass_prob_totals[oclass] = sum;
    }

    // randomize_gem_colors: 3 calls
    rn2(2); rn2(2); rn2(4);

    // Fisher-Yates shuffle for each object class: rn2(n), rn2(n-1), ..., rn2(1)
    function shuffleClass(n) { for (let i = n; i >= 1; i--) rn2(i); }

    shuffleClass(11); // AMULET
    shuffleClass(25); // POTION
    shuffleClass(28); // RING
    shuffleClass(41); // SCROLL
    shuffleClass(41); // SPBOOK
    shuffleClass(28); // WAND
    shuffleClass(2);  // VENOM
    shuffleClass(4);  // HELMET sub-range
    shuffleClass(4);  // LEATHER_GLOVES sub-range
    shuffleClass(4);  // CLOAK sub-range
    shuffleClass(7);  // SPEED_BOOTS sub-range

    // WAN_NOTHING direction: 1 call
    rn2(2);
}
