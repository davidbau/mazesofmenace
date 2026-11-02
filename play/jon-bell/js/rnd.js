// rnd.js — C ref: rnd.c.
import { rn2 } from './rng.js';

/* C ref: rnd.c:298-309 shuffle_int_array(indices, count) — Fisher-Yates over
 * an int[], used once here (apply.c:2333) to randomise which properties an
 * uncursed/blessed unicorn horn fixes first. */
export function shuffle_int_array(indices, count) {
    for (let i = count - 1; i > 0; i--) {
        const iswap = rn2(i + 1);
        if (iswap === i) continue;
        const tmp = indices[i];
        indices[i] = indices[iswap];
        indices[iswap] = tmp;
    }
}
