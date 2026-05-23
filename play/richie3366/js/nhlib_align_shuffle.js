// nhlib_align_shuffle.js — C dat/nhlib.lua top-level align shuffle (loaded by each nhl_init).
// C ref: nhlib.lua lines 17–25 — shuffle({ "law", "neutral", "chaos" }) via math.random → nh.rn2.

import { rn2 } from './rng.js';

/**
 * C: nhlib.lua `shuffle(align)` when the file is loaded (init_dungeons, com_pager, mklev themes, …).
 * Fisher-Yates on 3 elements: `rn2(3)` then `rn2(2)`.
 */
export function nhlibAlignShuffleRn2LikeC() {
    rn2(3);
    rn2(2);
}
