// o_init.js — Object initialization.
// C ref: o_init.c — shuffle gem colors, potion descriptions, etc.

import { rn2 } from './rng.js';

// C ref: o_init.c randomize_gem_colors() + shuffle() + init_objects()
// Exact shuffle sizes are constant across all seeds (compile-time object table).
// Total: 199 rn2 calls.
export function init_objects() {
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
