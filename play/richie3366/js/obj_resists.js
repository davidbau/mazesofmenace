// obj_resists.js — Object resists destruction / erosion rolls (zap.c subset).
// C ref: zap.c obj_resists()

import { rn2 } from './rng.js';
import { OTYP_AMULET_OF_YENDOR } from './const.js';
import { CORPSE_OTYP } from './mkobj_corpse.js';
import { isRiderMnum } from './mondata.js';

const OTYP_SPE_BOOK_OF_THE_DEAD = 408;
/* C: objects.h — NH 5.0.0 `objects_nums` `SPE_BOOK_OF_THE_DEAD` (408). */
const OTYP_CANDELABRUM_OF_INVOCATION = 265;
const OTYP_BELL_OF_OPENING = 266;

/**
 * C: zap.c obj_resists(obj, ochance, achance)
 * @param {{ otyp?: number, oartifact?: number, corpsenm?: number }} obj
 * @param {number} ochance — percent for non-artifacts (`rn2(100) < ochance`)
 * @param {number} achance — percent for artifacts (C: always `< 100` for floor burn `2,100` → artifacts always resist)
 * @returns {boolean}
 */
export function objResists(obj, ochance, achance) {
    if (!obj) return false;
    const t = obj.otyp | 0;
    if (
        t === OTYP_AMULET_OF_YENDOR
        || t === OTYP_SPE_BOOK_OF_THE_DEAD
        || t === OTYP_CANDELABRUM_OF_INVOCATION
        || t === OTYP_BELL_OF_OPENING
        || (t === CORPSE_OTYP && isRiderMnum(obj.corpsenm | 0))
    )
        return true;
    const chance = rn2(100);
    return chance < ((obj.oartifact | 0) ? achance : ochance);
}
