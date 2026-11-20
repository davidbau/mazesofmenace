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

export function distmin(x1, y1, x2, y2) {
    return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2));
}

export function dist2(x1, y1, x2, y2) {
    return (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);
}

// C ref: hacklib.c lowc()
/* force 'c' into lowercase */
export function lowc(c) {
    return ('A' <= c && c <= 'Z') ? String.fromCharCode(c.charCodeAt(0) | 0o40) : c;
}

// C ref: hacklib.c strncmpi()
/* case-insensitive counted string comparison */
export function strncmpi(s1, s2, n) {
    let i = 0;
    while (n--) {
        if (i >= s2.length)
            return (i < s1.length) ? 1 : 0; /* s1 >= s2 */
        else if (i >= s1.length)
            return -1; /* s1  < s2 */
        const t1 = lowc(s1[i]);
        const t2 = lowc(s2[i]);
        i++;
        if (t1 !== t2)
            return (t1 > t2) ? 1 : -1;
    }
    return 0; /* s1 == s2 */
}

// C ref: global.h strcmpi() macro — strncmpi((a), (b), -1)
export function strcmpi(a, b) {
    return strncmpi(a, b, -1);
}

export function depth(uz) {
    const dnum = uz?.dnum ?? 0;
    const dlevel = uz?.dlevel ?? 1;
    const dungeon = game?.dungeons?.[dnum];
    if (!dungeon) return dlevel;
    return (dungeon.depth_start || 1) + dlevel - 1;
}

// C ref: rn2(x) already in rng.js — re-export not needed

// C ref: hacklib.c highc()
/* force 'c' into uppercase */
export function highc(c) {
    return ('a' <= c && c <= 'z') ? String.fromCharCode(c.charCodeAt(0) & ~0o40) : c;
}

// C ref: hacklib.c trimspaces()
/* remove leading and trailing whitespace */
export function trimspaces(txt) {
    return txt.replace(/^[ \t]+/, '').replace(/[ \t]+$/, '');
}

// C ref: hacklib.c s_suffix()
/* return a name converted to possessive */
export function s_suffix(s) {
    let buf = s;

    if (!strcmpi(buf, "it")) /* it -> its */
        buf += "s";
    else if (!strcmpi(buf, "you")) /* you -> your */
        buf += "r";
    else if (buf[buf.length - 1] === 's') /* Xs -> Xs' */
        buf += "'";
    else /* X -> X's */
        buf += "'s";
    return buf;
}

// C ref: hacklib.c mungspaces()
/* remove excess whitespace from a string buffer (in place in C; JS strings
   are immutable, so the munged string is returned) */
export function mungspaces(bp) {
    let out = '';
    let was_space = true;

    for (let c of bp) {
        if (c === '\n')
            break; /* treat newline the same as end-of-string */
        if (c === '\t')
            c = ' ';
        if (c !== ' ' || !was_space)
            out += c;
        was_space = (c === ' ');
    }
    if (was_space && out.length > 0)
        out = out.slice(0, -1);
    return out;
}

// C ref: hacklib.c str_start_is()
/* determine whether 'str' starts with 'chkstr', possibly ignoring case */
export function str_start_is(str, chkstr, caseblind) {
    for (let i = 0; ; i++) {
        if (i >= str.length)
            return (i >= chkstr.length); /* chkstr >= str */
        else if (i >= chkstr.length)
            return true; /* chkstr < str */
        const t1 = caseblind ? lowc(str[i]) : str[i];
        const t2 = caseblind ? lowc(chkstr[i]) : chkstr[i];
        if (t1 !== t2)
            return false;
    }
}

// C ref: hacklib.c strstri()
/* case insensitive substring search; returns the index of the match in
   'str' (C returns a pointer) or -1 (C: NULL) */
export function strstri(str, sub) {
    return str.toLowerCase().indexOf(sub.toLowerCase());
}

// C ref: hacklib.c fuzzymatch()
/* compare two strings for equality, ignoring the presence of specified
   characters (typically whitespace) and possibly ignoring case */
export function fuzzymatch(s1, s2, ignore_chars, caseblind) {
    let i1 = 0, i2 = 0;
    let c1, c2;

    do {
        while ((c1 = (i1 < s1.length ? s1[i1++] : '')) !== ''
               && ignore_chars.includes(c1))
            continue;
        while ((c2 = (i2 < s2.length ? s2[i2++] : '')) !== ''
               && ignore_chars.includes(c2))
            continue;
        if (!c1 || !c2)
            break; /* stop when end of either string is reached */

        if (caseblind) {
            c1 = lowc(c1);
            c2 = lowc(c2);
        }
    } while (c1 === c2);

    /* match occurs only when the end of both strings has been reached */
    return (!c1 && !c2);
}
