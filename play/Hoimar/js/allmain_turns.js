import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { dosounds } from './sounds.js';

export function maybe_generate_rnd_mon() {
    // C ref: allmain.c:166
    rn2(70);
}

export function gethungry() {
    // C ref: eat.c:3191
    rn2(20);
}

export function maybe_wipe_engraving() {
    // C ref: allmain.c:360 — !rn2(40 + ACURR(A_DEX) * 3)
    const dex = game.u?.acurr?.a?.[1] ?? 10;
    rn2(40 + dex * 3);
}

export { dosounds };
