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

// src/hacklib.c highc() — force 'c' into uppercase.
export function highc(c) {
    return (c >= 'a' && c <= 'z')
        ? String.fromCharCode(c.charCodeAt(0) & ~0o40)
        : c;
}

// src/hacklib.c:83 lowc() — force 'c' into lowercase.
export function lowc(c) {
    return (c >= 'A' && c <= 'Z')
        ? String.fromCharCode(c.charCodeAt(0) | 0o40)
        : c;
}

// src/hacklib.c strncmpi() — aka strncasecmp. Compares at most n characters.
//
// C walks NUL-terminated buffers, so a short string ends the comparison early:
// it returns (*s1 != 0) when s2 runs out (s1 >= s2) and -1 when s1 runs out.
// JS strings have no terminator, so reading past the end gives undefined; the
// explicit length tests below reproduce the same three exits in the same order.
export function strncmpi(s1, s2, n) {
    let i = 0;
    while (n--) {
        if (i >= s2.length)
            return (i < s1.length) ? 1 : 0; /* s1 >= s2 */
        else if (i >= s1.length)
            return -1;                      /* s1  < s2 */
        const t1 = lowc(s1[i]), t2 = lowc(s2[i]);
        i++;
        if (t1 !== t2)
            return (t1 > t2) ? 1 : -1;
    }
    return 0; /* s1 == s2 */
}

// src/hacklib.c strstri() — case-insensitive substring search.
//
// C returns a pointer into str, or NULL. The only thing every caller does with
// it is test it against NULL, so this returns the matching index or -1; -1 is
// used rather than null so a caller that forgets the comparison gets a truthy
// 0 for "matched at the start", exactly as the C pointer would be non-NULL.
//
// The C prefilters with two 32-entry nibble-count tables before comparing, and
// bails when sub is longer than str or has more of some bucket than str does.
// That is pure optimisation with no observable effect, so it is not reproduced;
// the loop below is the C's final comparison pass, which is what decides the
// answer. Case folding is lowc() on both sides, matching the C exactly.
export function strstri(str, sub) {
    /* special case: empty substring */
    if (!sub)
        return 0;

    const k = str.length - sub.length;
    if (k < 0)
        return -1; /* sub longer than str, so can't match */

    for (let i = 0; i <= k; i++) {
        let j = 0;
        while (j < sub.length && lowc(str[i + j]) === lowc(sub[j]))
            j++;
        if (j === sub.length)
            return i; /* full match */
    }
    return -1; /* not found */
}

// include/global.h:113 strcmpi() — strncmpi(a, b, -1).
//
// The -1 is deliberate in the C: `while (n--)` with n negative never runs out,
// so the comparison ends only at a NUL. Our strncmpi() reproduces those exits
// with explicit length tests, so passing -1 through works unchanged rather than
// needing a separate implementation.
export function strcmpi(a, b) {
    return strncmpi(a, b, -1);
}

// src/hacklib.c fuzzymatch() — compare two strings for equality, ignoring the
// presence of specified characters (typically whitespace) and possibly
// ignoring case.
//
// C reads past the end of a JS string as undefined rather than NUL, so the walk
// uses explicit index bounds and a '\0' sentinel to reproduce the C's exits:
// the loop stops when EITHER string ends, and the match succeeds only when BOTH
// ended together.
export function fuzzymatch(s1, s2, ignore_chars, caseblind) {
    let i = 0, j = 0;
    let c1, c2;

    do {
        do { c1 = (i < s1.length) ? s1[i++] : '\0'; }
        while (c1 !== '\0' && ignore_chars.includes(c1));
        do { c2 = (j < s2.length) ? s2[j++] : '\0'; }
        while (c2 !== '\0' && ignore_chars.includes(c2));
        if (c1 === '\0' || c2 === '\0')
            break; /* stop when end of either string is reached */

        if (caseblind) {
            c1 = lowc(c1);
            c2 = lowc(c2);
        }
    } while (c1 === c2);

    /* match occurs only when the end of both strings has been reached */
    return c1 === '\0' && c2 === '\0';
}
