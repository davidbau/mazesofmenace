// nhlib_align_shuffle.js — C dat/nhlib.lua top-level align shuffle (loaded by each nhl_init).
// C ref: nhlib.lua lines 17–25 — shuffle({ "law", "neutral", "chaos" }) via math.random → nh.rn2.

import { rn2 } from './rng.js';

/**
 * C: nhlib.lua `shuffle(align)` when the file is loaded (init_dungeons, com_pager, mklev themes, …).
 * Fisher-Yates on 3 elements: `rn2(3)` then `rn2(2)`.
 *
 * **Harness note:** Until **`init_dungeons`** runs real **`nhl_init`** + **`nhlib.lua`**, this shim
 * stays on the **core** ISAAC stream so public session RNG logs stay aligned. **`load_lua`**
 * paths use **`nhlRn2LikeC`** / Fengari **`nh.rn2`** (see **`nhl_lua.js`**).
 */
export function nhlibAlignShuffleRn2LikeC() {
    rn2(3);
    rn2(2);
}
