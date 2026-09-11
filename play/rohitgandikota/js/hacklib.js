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

// src/hacklib.c:363 ing_suffix() -- form a present participle while keeping
// trailing "on", "off", or "with" after the inflected verb.
export function ing_suffix(str) {
    let stem = String(str);
    let tail = '';
    const trailing = / (on|off|with)$/i.exec(stem);
    if (trailing) {
        tail = trailing[0];
        stem = stem.slice(0, -tail.length);
    }

    const low = stem.toLowerCase();
    const vowels = 'aeiouwy';
    if (low.endsWith('er')) {
        /* slither -> slithering */
    } else if (stem.length >= 3
               && !vowels.includes(low.at(-1))
               && vowels.includes(low.at(-2))
               && !vowels.includes(low.at(-3))) {
        stem += stem.at(-1);
    } else if (low.endsWith('ie')) {
        stem = stem.slice(0, -2) + 'y';
    } else if (low.endsWith('e')) {
        stem = stem.slice(0, -1);
    }
    return stem + 'ing' + tail;
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
// src/hacklib.c:69 letter() — is 'c' a letter (or '@')?
export function letter(c) {
    return ('@' <= c && c <= 'Z') || ('a' <= c && c <= 'z');
}

// src/hacklib.c highc()
export function highc(c) {
    return ('a' <= c && c <= 'z') ? c.toUpperCase() : c;
}

// src/hacklib.c lowc()
export function lowc(c) {
    return ('A' <= c && c <= 'Z') ? c.toLowerCase() : c;
}

// src/hacklib.c:717 strncmpi() — case-insensitive compare of the first n
// characters; include/global.h:113 makes strcmpi(a, b) strncmpi(a, b, -1).
export function strncmpi(s1, s2, n) {
    let i = 0;

    while (n--) {
        if (i >= s2.length)
            return (i < s1.length) ? 1 : 0; /* s1 >= s2 */
        else if (i >= s1.length)
            return -1; /* s1  < s2 */
        const t1 = lowc(s1[i]), t2 = lowc(s2[i]);
        i++;
        if (t1 !== t2)
            return (t1 > t2) ? 1 : -1;
    }
    return 0; /* s1 == s2 */
}
export function strcmpi(s1, s2) { return strncmpi(s1, s2, -1); }

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

// src/hacklib.c:557 strNsubst() — replace the Nth occurrence of orig (0 =
// all) in inoutbuf; with an empty orig, insert in front of the Nth char.
// C edits the buffer in place and returns the substitution count; this port
// returns the edited string.
export function strNsubst(inoutbuf, orig, replacement, n) {
    const len = orig.length;
    let ocount = 0, /* number of times 'orig' has been matched */
        rcount = 0; /* number of substitutions made */
    let out = '', bp = 0;

    while (bp < inoutbuf.length) {
        if ((!len || inoutbuf.startsWith(orig, bp))
            && (++ocount === n || n === 0)) {
            /* Nth match found */
            out += replacement;
            ++rcount;
            if (len) {
                bp += len; /* skip 'orig' */
                continue;
            }
        }
        /* no match (or len==0) so retain current character */
        out += inoutbuf[bp++];
    }
    if (!len && n === ocount + 1) {
        /* special case: orig=="" (!len) and n==strlen(inoutbuf)+1,
           insert in front of terminator (in other words, append) */
        out += replacement;
        ++rcount;
    }
    return rcount ? out : inoutbuf;
}

// src/hacklib.c ordin() — ordinal suffix; n should be non-negative.
export function ordin(n) {
    const dd = n % 10;
    return (dd === 0 || dd > 3 || Math.trunc((n % 100) / 10) === 1) ? "th"
               : (dd === 1) ? "st" : (dd === 2) ? "nd" : "rd";
}

// src/hacklib.c pmatchi(), case-insensitive wildcard match.
export function pmatchi(patrn, strng) {
    return pmatch_internal(String(patrn), String(strng), true);
}

// src/hacklib.c:533 visctrl(), a key as printable text ("^X", "M-x").
export function visctrl(ch) {
    let c = typeof ch === 'number' ? ch : String(ch).charCodeAt(0);
    let ccc = '';

    if (c & 0o200) {
        ccc += 'M';
        ccc += '-';
    }
    c &= 0o177;
    if (c < 0o40) {
        ccc += '^';
        ccc += String.fromCharCode(c | 0o100); /* letter */
    } else if (c === 0o177) {
        ccc += '^';
        ccc += String.fromCharCode(c & ~0o100); /* '?' */
    } else {
        ccc += String.fromCharCode(c); /* printable character */
    }
    return ccc;
}

// src/hacklib.c:123 upwords() — capitalize the first letter of each word
export function upwords(s) {
    let out = '';
    let space = true;

    for (const ch of s) {
        if (ch === ' ') {
            space = true;
        } else if (space && /[A-Za-z]/.test(ch)) {
            out += ch.toUpperCase();
            space = false;
            continue;
        } else {
            space = false;
        }
        out += ch;
    }
    return out;
}

// src/hacklib.c:832 swapbits() — swap bit a with bit b in val
export function swapbits(val, bita, bitb) {
    const tmp = ((val >> bita) & 1) ^ ((val >> bitb) & 1);

    return (val ^ ((tmp << bita) | (tmp << bitb)));
}
