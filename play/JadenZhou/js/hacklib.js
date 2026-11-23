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

// C ref: hacklib.c visctrl()
/* make a displayable string from a character; c is the key code
   (0..255): a meta key (8th bit set) shows as "M-" plus the rest */
export function visctrl(c) {
    let ccc = '';
    if (c & 0o200)
        ccc += 'M-';
    c &= 0o177;
    if (c < 0o40)
        ccc += '^' + String.fromCharCode(c | 0o100); /* letter */
    else if (c === 0o177)
        ccc += '^' + String.fromCharCode(c & ~0o100); /* '?' */
    else
        ccc += String.fromCharCode(c); /* printable character */
    return ccc;
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

// C ref: hacklib.c ing_suffix() -- return the "ing" form of a verb
export function ing_suffix(s) {
    const vowel = "aeiouwy";
    let buf = s;
    let onoff = '';
    const endsi = (suf) => buf.length >= suf.length
        && strcmpi(buf.slice(buf.length - suf.length), suf) === 0;

    if (endsi(" on") || endsi(" off") || endsi(" with")) {
        const p = buf.lastIndexOf(' ');
        onoff = buf.slice(p);
        buf = buf.slice(0, p);
    }
    const n = buf.length;
    if (n >= 2 && endsi("er")) { /* slither + ing */
        /* nothing here */
    } else if (n >= 3 && !vowel.includes(buf[n - 1])
               && vowel.includes(buf[n - 2]) && !vowel.includes(buf[n - 3])) {
        /* tip -> tipp + ing */
        buf += buf[n - 1];
    } else if (n >= 2 && endsi("ie")) { /* vie -> vy + ing */
        buf = buf.slice(0, n - 2) + 'y';
    } else if (n >= 1 && buf[n - 1] === 'e') /* grease -> greas + ing */
        buf = buf.slice(0, n - 1);
    buf += "ing";
    if (onoff)
        buf += onoff;
    return buf;
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

// C ref: hacklib.c isqrt()
/* integer square root function without using floating point */
export function isqrt(val) {
    let rt = 0;
    let odd = 1;
    while (val >= odd) {
        val = val - odd;
        odd = odd + 2;
        rt = rt + 1;
    }
    return rt;
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

// C ref: hacklib.c str_end_is()
/* determine whether 'str' ends with 'chkstr' (case sensitive) */
export function str_end_is(str, chkstr) {
    const clen = chkstr.length;

    if (str.length >= clen)
        return str.slice(str.length - clen) === chkstr;
    return false;
}

// C ref: hacklib.c copynchars()
/* copies at most n characters, stopping sooner if terminator reached;
   treats newline as input terminator (C copies into 'dst'; JS returns
   the copy) */
export function copynchars(src, n) {
    let i = 0;

    while (n > 0 && i < src.length && src[i] !== '\n') {
        i++;
        --n;
    }
    return src.slice(0, i);
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

// C ref: hacklib.c tabexpand() -- expand tabs into proper number of spaces
// (8 column tab stops); the result is cut to BUFSZ - 1 characters
export function tabexpand(sbuf) {
    let buf = '', idx = 0;

    if (!sbuf)
        return sbuf;
    for (const c of sbuf) {
        if (c === '\t') {
            do
                buf += ' ';
            while (++idx % 8);
        } else {
            buf += c;
            ++idx;
        }
        if (idx >= 256 /* BUFSZ */) {
            buf = buf.slice(0, 256 - 1);
            break;
        }
    }
    return buf;
}
