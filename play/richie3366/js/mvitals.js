// mvitals.js — Per-species game state (stub until full decl.c / geno port).
// C ref: decl.c `struct mvitals mvitals[NUMMONS]`; allmain.c newgame() seeds
// `svm.mvitals[i].mvflags = mons[i].geno & G_NOCORPSE`; mon.c make_corpse / dead_species.

import { G_NOCORPSE } from './mondata.js';
import { MONS_GENO_PLAN_B } from './mons_rndmonst_ini_inv_data.js';

/** Enough slots for monsndx indices until `NUMMONS` is ported from upstream. */
export const MVITALS_SLOTS = 512;

/**
 * C: **`allmain.c`** **`newgame`** — **`for (i = LOW_PM; i < NUMMONS; i++)`** **`mvitals[i].mvflags = mons[i].geno & G_NOCORPSE`**.
 * Slots beyond parsed **`mons[]`** slice stay **`0`**. No RNG.
 * @param {Record<string, unknown>} g
 */
export function initMvitalsStub(g, size = MVITALS_SLOTS) {
    if (!g) return;
    g.mvitals = Array.from({ length: size }, () => ({ mvflags: 0 }));
    const geno = MONS_GENO_PLAN_B;
    const n = Math.min(size | 0, geno.length);
    for (let i = 0; i < n; i++) {
        g.mvitals[i].mvflags = (geno[i] | 0) & G_NOCORPSE;
    }
}

/**
 * C: **`mon.c`** / **`mkobj.c`** — **`(svm.mvitals[mndx].mvflags & G_NOCORPSE) != 0`**.
 * @param {Record<string, unknown>} g
 * @param {number} mndx
 */
export function mvitalsNocorpseLikeC(g, mndx) {
    const arr = g?.mvitals;
    if (!Array.isArray(arr)) return false;
    const i = mndx | 0;
    if (i < 0 || i >= arr.length) return false;
    return ((arr[i].mvflags | 0) & G_NOCORPSE) !== 0;
}

/**
 * OR bits into `g.mvitals[mndx].mvflags` (e.g. `G_GENOD`, `G_NOCORPSE` from monflag).
 * No RNG. Out-of-range `mndx` is ignored.
 * @param {Record<string, unknown>} g
 * @param {number} mndx
 * @param {number} flags
 */
export function mergeMvitalsMvflags(g, mndx, flags) {
    const arr = g?.mvitals;
    if (!arr) return;
    const i = mndx | 0;
    if (i < 0 || i >= arr.length) return;
    const slot = arr[i];
    slot.mvflags = (slot.mvflags | 0) | (flags | 0);
}
