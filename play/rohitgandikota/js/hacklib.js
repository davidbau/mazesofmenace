// hacklib.js — Utility functions.
// C ref: hacklib.c, dungeon.c helpers

import { game } from './gstate.js';

export function isok(x, y) {
    const { COLNO, ROWNO } = await_const();
    return x >= 1 && x <= COLNO - 1 && y >= 0 && y <= ROWNO - 1;
}

// Lazy import to avoid circular deps
let _const = null;
function await_const() {
    if (!_const) _const = { COLNO: 80, ROWNO: 21 };
    return _const;
}

// src/hacklib.c:650 sgn() — return the sign of a number: -1, 0, or 1
export function sgn(n) {
    return (n < 0) ? -1 : (n !== 0 ? 1 : 0);
}

export function distmin(x1, y1, x2, y2) {
    return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2));
}

// include/hack.h:1531 distu() — squared distance from the hero.
export const distu = (xx, yy) => dist2(xx, yy, game.u.ux, game.u.uy);

export function dist2(x1, y1, x2, y2) {
    return (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);
}

/* depth() is src/dungeon.c and lives in js/dungeon.js. The copy that was
   here differed only in being defensive about a missing dungeon entry. */

// C ref: rn2(x) already in rng.js — re-export not needed

// src/hacklib.c s_suffix() — the possessive form.
export function s_suffix(s) {
    if (s.toLowerCase() === 'it') return s + 's';
    if (s.toLowerCase() === 'you') return s + 'r';
    if (s.endsWith('s')) return s + "'";
    return s + "'s";
}

// src/hacklib.c:704 online2() — are the two points on a straight line?
//
// Orthogonal when either delta is zero, diagonal when the deltas match in
// magnitude. Both signs of the diagonal are tested separately because C is
// comparing ints, not absolute values.
export function online2(x0, y0, x1, y1) {
    const dx = x0 - x1, dy = y0 - y1;
    return (!dy || !dx || dy === dx || dy === -dx);
}

// src/hacklib.c:682 isqrt() — integer square root by subtracting successive
// odd numbers. percent_success() uses it for the too-low-level penalty.
export function isqrt(val) {
    let rt = 0, odd = 1;
    while (val >= odd) {
        val = val - odd;
        odd = odd + 2;
        rt = rt + 1;
    }
    return rt;
}