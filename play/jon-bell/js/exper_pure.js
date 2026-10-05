// src/exper_pure.ts
// @ts-nocheck — sibling imports from hand-maintained js/*.js (no .d.ts yet).
// Literal port of pure-ish functions from nethack-c/src/exper.c, isolated
// from the rest of the engine so they can be exercised by the per-function
//
// Source of truth: nethack-c/src/exper.c
//
// "Pure-ish" because rndexp() consumes the RNG and reads two pieces of
// player state (u.ulevel, u.uexp). We expose those as explicit arguments
// rather than wiring through `game` so equiv-test stays self-contained.
//
// JavaScript Number can't represent the full range of C `long` exactly for
// some of the upper-bound values (mul by 10_000_000 against lev=...) so we
// use BigInt throughout for return values.
import { rn2 } from './rng.js';
import { clong } from './integer.js';
const MAXULEV = 30; // C: nethack-c/include/global.h
const LARGEST_INT = 32767; // C: nethack-c/include/global.h
/**
 * Experience-point threshold to reach `lev` from `lev-1`.
 *
 * C ref:
 *   long newuexp(int lev) {
 *       if (lev < 1) return 0L;
 *       if (lev < 10) return (10L * (1L << lev));
 *       if (lev < 20) return (10000L * (1L << (lev - 10)));
 *       return (10000000L * ((long)(lev - 19)));
 *   }
 *
 * Returns 0n for any lev < 1, matching the C early-return.
 */
export function newuexp(lev) {
    const L = lev | 0; // mimic C `int` truncation
    if (L < 1)
        return 0n;
    if (L < 10)
        return 10n * (1n << BigInt(L));
    if (L < 20)
        return 10000n * (1n << BigInt(L - 10));
    return 10000000n * BigInt(L - 19);
}
/**
 * Random experience-points value suitable for the hero's experience level.
 * Consumes exactly one rn2() call from the core RNG.
 *
 * C ref:
 *   long rndexp(boolean gaining) {
 *       long minexp, maxexp, diff, factor, result;
 *       minexp = (u.ulevel == 1) ? 0L : newuexp(u.ulevel - 1);
 *       maxexp = newuexp(u.ulevel);
 *       diff = maxexp - minexp, factor = 1L;
 *       while (diff >= (long) LARGEST_INT)
 *           diff /= 2L, factor *= 2L;
 *       result = minexp + factor * (long) rn2((int) diff);
 *       if (u.ulevel == MAXULEV && gaining) {
 *           result += (u.uexp - minexp);
 *           if (result < u.uexp)
 *               result = u.uexp;
 *       }
 *       return result;
 *   }
 *
 * `ulevel` is the hero's current experience level (1..30); `uexp` is the
 * hero's current XP. `gaining` is true for "gaining XP via potion" vs
 * setting XP for polyself. Returns BigInt to mirror C long.
 */
export function rndexp(gaining, ulevel, uexp) {
    uexp = clong(uexp);
    const minexp = ulevel === 1 ? 0n : newuexp(ulevel - 1);
    const maxexp = newuexp(ulevel);
    let diff = maxexp - minexp;
    let factor = 1n;
    // C: while (diff >= (long) LARGEST_INT) diff /= 2L, factor *= 2L;
    // BigInt division truncates toward zero, matching C signed division
    // for positive values (diff is non-negative here by construction).
    while (diff >= BigInt(LARGEST_INT)) {
        diff = diff / 2n;
        factor = factor * 2n;
    }
    // C casts diff to int before passing to rn2; for ulevel<=MAXULEV the
    // post-halving diff fits in 15 bits, well within int range.
    const r = BigInt(rn2(Number(diff)));
    let result = minexp + factor * r;
    if (ulevel === MAXULEV && gaining) {
        result = clong(result + clong(uexp - minexp));
        if (result < uexp)
            result = uexp;
    }
    return result;
}
