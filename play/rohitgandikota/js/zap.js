// zap.js — wands, spells and the object-destruction rules they share.
// C ref: src/zap.c
//
// Only obj_resists() is here so far, and it arrives via the pet rather than via
// any wand: dogfood() consults it on every object the pet considers, so it is
// the first draw of the pet's turn and one of the most frequent calls in the
// whole move loop.

import { rn2 } from './rng.js';
import { ONAMES } from './objects_data.js';
import { is_rider } from './makemon.js';
import { mons } from './monst_data.js';

// src/zap.c:1457 obj_resists()
//
// The five invocation items return TRUE without drawing; everything else draws
// rn2(100) whatever the chance is, so a call with ochance 0 — which is what
// dogfood() makes — still costs one draw and then always returns false.
export function obj_resists(obj, ochance, achance) {
    if (obj.otyp === ONAMES.AMULET_OF_YENDOR
        || obj.otyp === ONAMES.SPE_BOOK_OF_THE_DEAD
        || obj.otyp === ONAMES.CANDELABRUM_OF_INVOCATION
        || obj.otyp === ONAMES.BELL_OF_OPENING
        || (obj.otyp === ONAMES.CORPSE
            && obj.corpsenm >= 0 && is_rider(mons[obj.corpsenm]))) {
        return true;
    } else {
        const chance = rn2(100);
        return chance < (obj.oartifact ? achance : ochance);
    }
}
