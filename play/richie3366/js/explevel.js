// explevel.js — Experience thresholds (exper.c newuexp).
// C ref: exper.c newuexp()

/** @param {number} lev Current experience level (1-based). */
export function newuexp(lev) {
    if (lev < 1) return 0;
    if (lev < 10) return 10 * (1 << lev);
    if (lev < 20) return 10000 * (1 << (lev - 10));
    return 10000000 * (lev - 19);
}

export const MAXULEV = 30;
