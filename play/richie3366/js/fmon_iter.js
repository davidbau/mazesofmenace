// fmon_iter.js — Walk monsters in C fmon chain order (newest first).
// C ref: makemon.c — `mtmp->nmon = fmon; fmon = mtmp` prepends each new monster.

/**
 * C: **`for (mtmp = fmon; mtmp; mtmp = mtmp->nmon)`** — newest **`makemon`** first.
 * **`makemon.js`** prepends with **`unshift`** so array order matches C.
 *
 * @param {import('./gstate.js').game} g
 * @returns {Record<string, unknown>[]}
 */
export function fmonListNewestFirstLikeC(g) {
    return g.level?.monsters ?? [];
}
