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
// src/strutil.c pmatch_internal() — the simple wildcard matcher: '*' matches
// zero or more characters, '?' any single character. checkfile() runs every
// index line of the data file through this.
function pmatch_internal(patrn, strng, ci) {
    let pi = 0, si = 0;
    for (;;) {
        const s = strng[si] ?? '';
        const p = patrn[pi] ?? '';
        si++; pi++;
        if (!p)
            return s === '';
        if (p === '*') {
            if (pi >= patrn.length
                || pmatch_internal(patrn.slice(pi), strng.slice(si - 1), ci))
                return true;
            return s ? pmatch_internal(patrn.slice(pi - 1), strng.slice(si), ci)
                     : false;
        }
        if ((ci ? p.toLowerCase() !== s.toLowerCase() : p !== s)
            && (p !== '?' || !s))
            return false;
    }
}

// src/strutil.c:145 pmatch() — case-sensitive wildcard match.
export function pmatch(patrn, strng) {
    return pmatch_internal(String(patrn), String(strng), false);
}

// src/topl.c/hacklib tabexpand() — expand tabs to 8-column stops; the data
// file's quote attributions carry embedded tabs.
export function tabexpand(s) {
    let out = '';
    for (const ch of String(s)) {
        if (ch === '\t') {
            do { out += ' '; } while (out.length % 8);
        } else {
            out += ch;
        }
    }
    return out;
}

// src/hacklib.c mungspaces() — expand tabs to spaces, squeeze runs of
// spaces to one, strip leading and trailing space, truncate at newline.
export function mungspaces(bp) {
    let out = '';
    let was_space = true;
    for (let c of String(bp)) {
        if (c === '\n') break;
        if (c === '\t') c = ' ';
        if (c !== ' ' || !was_space) out += c;
        was_space = (c === ' ');
    }
    if (was_space && out.length) out = out.slice(0, -1);
    return out;
}

// src/hacklib.c:740 strstri() — case-insensitive substring search.
// Returns the index of the match, or -1 (C returns a pointer or NULL).
export function strstri(str, sub) {
    /* special case: empty substring */
    if (!sub)
        return 0;
    const ls = str ? str.length : undefined;
    const k = ls - sub.length;
    /* C returns NULL when sub is longer than str; a null str makes k NaN
       and the loop below simply never runs (see NOTES on the C NULL deref) */
    if (k < 0)
        return -1;
    const lstr = String(str).toLowerCase(), lsub = String(sub).toLowerCase();
    for (let i = 0; i <= k; i++)
        if (lstr.startsWith(lsub, i))
            return i;
    return -1;
}

// src/hacklib.c:783 fuzzymatch() — compare two strings for equality,
// ignoring the presence of specified characters and possibly ignoring case.
export function fuzzymatch(s1, s2, ignore_chars, caseblind) {
    const strip = (s) => {
        let out = '';
        for (const ch of String(s))
            if (!ignore_chars.includes(ch)) out += ch;
        return caseblind ? out.toLowerCase() : out;
    };
    return strip(s1) === strip(s2);
}

// src/hacklib.c:536 strsubst() — substitute the first occurrence (only) of
// orig within bp; the C search is case-sensitive strstr().
export function strsubst(bp, orig, replacement) {
    const found = bp.indexOf(orig);
    if (found >= 0)
        bp = bp.slice(0, found) + replacement + bp.slice(found + orig.length);
    return bp;
}

// src/hacklib.c ordin() — ordinal suffix; n should be non-negative.
export function ordin(n) {
    const dd = n % 10;
    return (dd === 0 || dd > 3 || Math.trunc((n % 100) / 10) === 1) ? "th"
               : (dd === 1) ? "st" : (dd === 2) ? "nd" : "rd";
}
