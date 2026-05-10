// o_init.js — Object initialization.
// C ref: o_init.c — shuffle gem colors, potion descriptions, etc.
//
import { rn2 } from './rng.js';

// C ref: o_init.c:init_objects().
// This preserves the general RNG shape for description shuffles. Runtime
// object identity state is still carried by object_data.js/static defaults;
// the actual descr/material swaps need to be wired into object lookup later.
export function init_objects() {
    randomize_gem_colors();
    shuffle_all();
    // C ref: objects[WAN_NOTHING].oc_dir = rn2(2) ? NODIR : IMMEDIATE.
    rn2(2);
}

function randomize_gem_colors() {
    rn2(2); // turquoise green/blue
    rn2(2); // aquamarine green/blue
    rn2(4); // fluorite color variant
}

function shuffle_range(length) {
    for (let remaining = length; remaining >= 1; remaining--) {
        rn2(remaining);
    }
}

function shuffle_all() {
    // Ranges from o_init.c:shuffle_all()/obj_shuffle_range() for NetHack 5.0
    // object data: amulets, potions excluding water, rings, scrolls,
    // spellbooks, wands, venoms, then helms/gloves/cloaks/boots.
    for (const length of [11, 25, 28, 41, 41, 28, 2, 4, 4, 4, 7]) {
        shuffle_range(length);
    }
}
