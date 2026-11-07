// @ts-nocheck
// hacklib.js — Utility functions.
// C ref: hacklib.c, dungeon.c helpers
import { game } from './gstate.js';
export { deepest_lev_reached, depth } from './dungeon.js'; // relocate-fns
export function isok(x, y) {
    const { COLNO, ROWNO } = await_const();
    /* mirror nethack-c/src/cmd.c:5004 — returns int, not boolean */
    return (x >= 1 && x <= COLNO - 1 && y >= 0 && y <= ROWNO - 1) ? 1 : 0;
}
// Lazy import to avoid circular deps
let _const = null;
function await_const() {
    if (!_const)
        _const = { COLNO: 80, ROWNO: 21 };
    return _const;
}
export function distmin(x1, y1, x2, y2) {
    return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2));
}
export function dist2(x1, y1, x2, y2) {
    return (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);
}
// C ref: rn2(x) already in rng.js — re-export not needed

export function s_suffix(s) {
    const buf = String(s ?? '');
    if (buf.toLowerCase() === 'it')
        return buf + 's';
    if (buf.toLowerCase() === 'you')
        return buf + 'r';
    if (buf.length && buf[buf.length - 1] === 's')
        return buf + "'";
    return buf + "'s";
}

/** C stripdigits(hacklib.c) */
export function stripdigits(s) {
    let out = '';
    for (let i = 0; i < s.length; i++) {
        const c = s[i];
        if (c < '0' || c > '9')
            out += c;
    }
    return out;
}

/** C str_lines_maxlen(hacklib.c) */
export function str_lines_maxlen(str) {
    let maxLen = 0;
    let s1 = 0;
    while (s1 < str.length) {
        const nl = str.indexOf('\n', s1);
        const len = nl === -1 ? str.length - s1 : nl - s1;
        if (len > maxLen)
            maxLen = len;
        if (nl === -1)
            break;
        s1 = nl + 1;
    }
    return maxLen;
}

/* C ref: hacklib.c:146 — lowc: force 'c' into lowercase.
 * Accepts a char code (number) or single-char string; returns same type. */
export function lowc(c) {
    if (typeof c === 'string') {
        const code = c.charCodeAt(0);
        return ('A'.charCodeAt(0) <= code && code <= 'Z'.charCodeAt(0)) ? String.fromCharCode(code | 0o40) : c;
    }
    return ('A'.charCodeAt(0) <= c && c <= 'Z'.charCodeAt(0)) ? (c | 0o40) : c;
}

/* C ref: hacklib.c:125 — digit: test if char is a digit */
export function digit(c) {
    return '0'.charCodeAt(0) <= c && c <= '9'.charCodeAt(0);
}

/* C ref: hacklib.c:139 — highc: force 'c' to uppercase.
 * Accepts a char code (number) or single-char string; returns same type. */
export function highc(c) {
    if (typeof c === 'string') {
        const code = c.charCodeAt(0);
        return ('a'.charCodeAt(0) <= code && code <= 'z'.charCodeAt(0)) ? String.fromCharCode(code & ~0o40) : c;
    }
    return ('a'.charCodeAt(0) <= c && c <= 'z'.charCodeAt(0)) ? (c & ~0o40) : c;
}

/* C ref: hacklib.c:132 — letter: is 'c' a letter (note: '@' classed as letter)
 * Accepts either a char code (number) or a single-char string. */
export function letter(c) {
    if (typeof c === 'string') c = c.charCodeAt(0);
    return (('@'.charCodeAt(0) <= c && c <= 'Z'.charCodeAt(0)) || ('a'.charCodeAt(0) <= c && c <= 'z'.charCodeAt(0)));
}

/* C ref: hacklib.c:257 — eos: return pointer to end of string (the NUL
 * terminator). In C this is `s + strlen(s)`; the only thing callers do with it
 * is index/pointer arithmetic relative to the string base (e.g. eos(s)-N to
 * address the last N chars). The faithful JS analogue of that pointer-as-offset
 * is the string length, so eos(s) === s.length and `eos(s) - N` is the start
 * index of the trailing N-char window — exactly what BSTRCMPI/singplur_lookup
 * consume. Append-style callers (Sprintf(eos(buf), ...)) are ported per-site as
 * `buf += ...`, so eos is never used for appending here. */
export function eos(s) {
    if (s === undefined || s === null) return s;
    return String(s.length);
}

/* version of eos() which takes a const* arg and returns that result */
export function c_eos(s) {
    if (s === undefined || s === null) return s;
    return String(s.length);
}

/* C ref: hacklib.c — str_end_is: check if str ends with chkstr */
export function str_end_is(str, chkstr) {
    let clen = chkstr.length;
    if (str.length >= clen)
        return !strncmp(str.slice(Number(eos(str)) - clen), chkstr, clen);
    return false;
}

// local strncmp (from js/topten.js, not exported)
function strncmp(a, b, n) {
    if (!a || !b) return a === b ? 0 : (a ? 1 : -1);
    for (let i = 0; i < n; i++) {
        if (i >= a.length && i >= b.length) return 0;
        if (i >= a.length) return -1;
        if (i >= b.length) return 1;
        if (a.charCodeAt(i) !== b.charCodeAt(i))
            return a.charCodeAt(i) - b.charCodeAt(i);
    }
    return 0;
}

/* C ref: hacklib.c:205 — mungspaces: condense whitespace runs to single spaces,
 * tabs→spaces, drop trailing space, stop at newline (in place). */
export function mungspaces(bp) {
    let c, p, p2;
    let was_space = true;

    const arr = bp.split('');
    p = 0;
    p2 = 0;

    while (p < arr.length && arr[p] !== '\0') {
        c = arr[p];
        if (c === '\n')
            break; /* treat newline the same as end-of-string */
        if (c === '\t')
            c = ' ';
        if (c !== ' ' || !was_space)
            arr[p2++] = c;
        was_space = (c === ' ');
        p++;
    }
    if (was_space && p2 > 0)
        p2--;
    arr[p2] = '\0';
    return arr.slice(0, p2).join('');
}

/* C ref: hacklib.c:227 — trimspaces: skip leading whitespace; remove trailing whitespace, in place */
export function trimspaces(txt) {
    /* leading whitespace will remain in the buffer */
    while (txt.length > 0 && (txt[0] === ' ' || txt[0] === '\t'))
        txt = txt.substring(1);
    const end = eos(txt);
    let endIdx = txt.length;
    while (endIdx > 0 && (txt[endIdx - 1] === ' ' || txt[endIdx - 1] === '\t')) {
        endIdx--;
    }
    return txt.substring(0, endIdx);
}

/* C ref: hacklib.c:463 — xcrypt: trivial XOR obfuscation of a string.
 * Writes into buf (which callers obtain via nextobuf()); returns buf.
 * In JS we build the result string directly and ignore buf. */
export function xcrypt(str, buf) {
    let result = "";
    let bitmask = 1;
    for (let i = 0; i < str.length; i++) {
        let ch = str.charCodeAt(i);
        if (ch & (32 | 64))
            ch ^= bitmask;
        result += String.fromCharCode(ch);
        if ((bitmask <<= 1) >= 32)
            bitmask = 1;
    }
    return result;
}

/* C ref: hacklib.c:599-615 — strsubst: substitute first occurrence of orig in bp */
export function strsubst(bp, orig, replacement) {
    let idx = bp.indexOf(orig);
    if (idx >= 0) {
        let tail = bp.substring(idx + orig.length);
        bp = bp.substring(0, idx) + replacement + tail;
    }
    return bp;
}

/* C ref: hacklib.c:621-655 — strNsubst: substitute nth occurrence of orig in inoutbuf;
   n==0 => all occurrences; orig=="" => insert replacement in front of Nth char;
   replacement=="" => delete old substring; returns number of substitutions made */
export function strNsubst(inoutbuf, orig, replacement, n) {
    // A { value } buffer carries C's in-place result as well as the count.
    const buffer = typeof inoutbuf === 'object' ? inoutbuf : null;
    if (buffer) inoutbuf = buffer.value;
    const BUFSZ = 256;
    let len = orig.length;
    let ocount = 0;
    let rcount = 0;
    let result = "";
    const maxout = BUFSZ - 1; /* op < &workbuf[BUFSZ-1] */
    let i = 0;

    while (i < inoutbuf.length && result.length < maxout) {
        if ((len === 0 || inoutbuf.substring(i, i + len) === orig) &&
            (++ocount === n || n === 0)) {
            /* Nth match found — copy replacement (up to buffer limit) */
            for (let ri = 0; ri < replacement.length && result.length < maxout; ri++) {
                result += replacement[ri];
            }
            rcount++;
            if (len) {
                i += len; /* skip 'orig' */
                continue;
            }
        }
        /* no match (or len==0) so retain current character */
        if (result.length < maxout) {
            result += inoutbuf[i];
        }
        i++;
    }
    if (len === 0 && n === ocount + 1) {
        /* special case: orig=="" and n==strlen(inoutbuf)+1, append */
        for (let ri = 0; ri < replacement.length && result.length < maxout; ri++) {
            result += replacement[ri];
        }
        rcount++;
    }
    if (buffer && rcount) buffer.value = result;
    return rcount;
}

/* C ref: hacklib.c:339-347 — strkitten: append a character to a string (in place)
 * C writes `*p++ = c; *p = '\0';` — a single SIGNED byte followed by the NUL
 * terminator. c==0 means C writes NUL then NUL: the string is unchanged.
 * c<0 stores one signed byte (e.g. -74 -> 0xB6), read back as Latin-1. */
export function strkitten(s, c) {
    return s + (c ? String.fromCharCode(c & 0xFF) : '');
}

/* C ref: hacklib.c:387-406 — strcasecpy: overwrite string, preserving old chars' case;
   for case-insensitive editions of makeplural() and makesingular();
   src might be shorter, same length, or longer than dst */
export function strcasecpy(dst, src) {
    let result = dst;
    let dst_exhausted = 0;
    let di = 0;
    let out = "";
    for (let si = 0; si < src.length; si++) {
        let ic = src.charCodeAt(si);
        if (ic === 0) break;
        if (!dst_exhausted && di >= dst.length) {
            dst_exhausted = 1;
        }
        let oc;
        if (dst_exhausted) {
            oc = di > 0 ? out.charCodeAt(di - 1) : 0;
        } else {
            oc = dst.charCodeAt(di);
        }
        /* chrcasecpy inline */
        let nc = ic;
        if (0x61 <= oc && oc <= 0x7a) {
            if (0x41 <= nc && nc <= 0x5a)
                nc += 0x20;
        } else if (0x41 <= oc && oc <= 0x5a) {
            if (0x61 <= nc && nc <= 0x7a)
                nc -= 0x20;
        }
        out += String.fromCharCode(nc);
        di++;
    }
    return out;
}

/* C ref: hacklib.c:688-695 — ordin: return ordinal suffix for a number */
export function ordin(n) {
    const dd = n % 10;
    if (dd === 0 || dd > 3 || Math.trunc((n % 100) / 10) === 1)
        return "th";
    else if (dd === 1)
        return "st";
    else if (dd === 2)
        return "nd";
    else
        return "rd";
}

/* C ref: hacklib.c:243 — strip_newline: remove \n from end of line; remove \r too if one is there */
export function strip_newline(str) {
    const p = str.lastIndexOf('\n');
    if (p >= 0) {
        if (p > 0 && str[p - 1] === '\r') {
            return str.substring(0, p - 1);
        }
        return str.substring(0, p);
    }
    if (str === '') return ' ';
    return str;
}

/* C ref: hacklib.c:532 — visctrl: return string representation of a non-printable
 * char. C rotates a static buffer pool so callers can hold several results; JS
 * strings are values so we return directly (matches strip_newline/eos idiom). */
export function visctrl(c) {
    let ccc = '';
    if ((c & 0x80) !== 0) {
        ccc += 'M';
        ccc += '-';
    }
    c = c & 0x7f;
    if (c < 0x20) {
        ccc += '^';
        ccc += String.fromCharCode(c | 0x40);
    } else if (c === 0x7f) {
        ccc += '^';
        ccc += String.fromCharCode(c & ~0x40);
    } else {
        ccc += String.fromCharCode(c);
    }
    return ccc;
}

/* C ref: hacklib.c:482-490 — onlyspace: is a string entirely whitespace? */
export function onlyspace(s) {
    for (let i = 0; i < s.length; i++)
        if (s[i] !== ' ' && s[i] !== '\t')
            return false;
    return true;
}

/* C ref: hacklib.c:153-162 — lcase: convert a string into all lowercase */
export function lcase(s) {
    const arr = s.split('');
    for (let i = 0; i < arr.length; i++) {
        const c = arr[i].charCodeAt(0);
        if ('A'.charCodeAt(0) <= c && c <= 'Z'.charCodeAt(0))
            arr[i] = String.fromCharCode(c | 0o40);
    }
    return arr.join('');
}

/* C ref: hacklib.c:177-183 — upstart: convert first character of a string to uppercase */
export function upstart(s) {
    if (s) {
        const arr = s.split('');
        arr[0] = String.fromCharCode(highc(arr[0].charCodeAt(0)));
        return arr.join('');
    }
    return s;
}

/* C ref: hacklib.c:186-202 — upwords: capitalize first letter of every word in a string (in place) */
export function upwords(s) {
    let space = true;
    const arr = s.split('');
    for (let i = 0; i < arr.length; i++) {
        const c = arr[i].charCodeAt(0);
        if (c === ' '.charCodeAt(0)) {
            space = true;
        } else if (space && letter(c)) {
            arr[i] = String.fromCharCode(highc(c));
            space = false;
        } else {
            space = false;
        }
    }
    return arr.join('');
}

export function datamodel(retidx) {
    const MAX_D = 5;
    /* Static dm array from hacklib.c:1035-1044 */
    const dm = [
        { sz: [2, 4, 8, 8, 8], datamodel: "", dmplatform: "" },
        { sz: [2, 4, 4, 8, 4], datamodel: "ILP32LL64", dmplatform: "x86 32-bit" },
        { sz: [2, 4, 4, 8, 8], datamodel: "IL32LLP64", dmplatform: "Windows x64 64-bit" },
        { sz: [2, 4, 8, 8, 8], datamodel: "I32LP64", dmplatform: "Unix 64-bit" },
        { sz: [2, 8, 8, 8, 8], datamodel: "ILP64", dmplatform: "Unix ILP64" },
    ];
    const unknown = "Unknown";

    /* SIZE(dm) macro: (int)(sizeof(dm) / sizeof(dm[0])) */
    const dm_size = dm.length;

    for (let i = 1; i < dm_size; ++i) {
        let matchcount = 0;
        for (let j = 0; j < MAX_D; ++j) {
            if (dm[0].sz[j] === dm[i].sz[j])
                ++matchcount;
        }
        if (matchcount === MAX_D) {
            return (retidx === 0) ? dm[i].datamodel : dm[i].dmplatform;
        }
    }
    return unknown;
}

/* C ref: hacklib.c:985-1001 — case_insensitive_comp
 * int case_insensitive_comp(const char *s1, const char *s2)
 *
 * Case-insensitive string comparison. Returns 0 if strings are equal
 * (ignoring case), or the difference between the first differing characters
 * when lowercased.
 */
export function case_insensitive_comp(s1, s2) {
    let u1, u2;
    let i = 0;
    for (;;) {
        // Get char code (0 if past string end — like C null terminator)
        u1 = (i < s1.length) ? s1.charCodeAt(i) : 0;
        u2 = (i < s2.length) ? s2.charCodeAt(i) : 0;

        // Ensure unsigned byte (0-255)
        u1 = u1 & 0xFF;
        u2 = u2 & 0xFF;

        // If u1 is uppercase (A-Z: 65-90), convert to lowercase (a-z: 97-122)
        if (u1 >= 65 && u1 <= 90) {
            u1 = u1 + 32;
        }

        // If u2 is uppercase (A-Z: 65-90), convert to lowercase (a-z: 97-122)
        if (u2 >= 65 && u2 <= 90) {
            u2 = u2 + 32;
        }

        // Check for null terminator or inequality
        if (u1 === 0 || u1 !== u2) {
            break;
        }

        i++;
    }

    return u1 - u2;
}

/* C ref: hacklib.c:276-302 — str_start_is: determine whether 'str' starts with 'chkstr',
 * possibly ignoring case; panics on huge strings */
export function str_start_is(str, chkstr, caseblind) {
    let t1, t2;
    let n = 2147483647; /* LARGEST_INT */
    let si = 0;

    while (--n) {
        if (si >= str.length)
            return (si >= chkstr.length); /* chkstr >= str */
        else if (si >= chkstr.length)
            return true; /* chkstr < str */
        t1 = caseblind ? lowc(str.charCodeAt(si)) : str.charCodeAt(si);
        t2 = caseblind ? lowc(chkstr.charCodeAt(si)) : chkstr.charCodeAt(si);
        si++;
        if (t1 !== t2)
            return false;
    }
    /* #if 0 ... panic("string too long") ... #endif */
    return true;
}

export function online2(x0, y0, x1, y1) {
    const dx = x0 - x1;
    const dy = y0 - y1;
    /*  If either delta is zero then they're on an orthogonal line,
     *  else if the deltas are equal (signs ignored) they're on a diagonal.
     */
    return (!dy || !dx || dy === dx || dy === -dx);
}

/* C ref: hacklib.c:426 — ing_suffix: construct a gerund (a verb formed by
 * appending "ing" to a noun). */
export function ing_suffix(s) {
    const vowel = "aeiouwy";
    let buf = s;
    let onoff = "";
    let p = eos(buf);          /* p = eos(buf) */

    /* onoff[0] = *p = *(p+1) = '\0' is satisfied by onoff = "" */
    if ((p >= 3 && buf.substring(p - 3).toLowerCase() === " on")
        || (p >= 4 && buf.substring(p - 4).toLowerCase() === " off")
        || (p >= 5 && buf.substring(p - 5).toLowerCase() === " with")) {
        p = buf.lastIndexOf(' ');      /* p = strrchr(buf, ' ') */
        onoff = buf.substring(p);      /* Strcpy(onoff, p) */
        buf = buf.substring(0, p);     /* *p = '\0' */
    }
    if (p >= 2 && buf.substring(p - 2).toLowerCase() === "er") {
        /* slither + ing — nothing here */
    } else if (p >= 3 && vowel.indexOf(buf[p - 1]) === -1
        && vowel.indexOf(buf[p - 2]) !== -1
        && vowel.indexOf(buf[p - 3]) === -1) {
        /* tip -> tipp + ing */
        buf = buf + buf[p - 1];        /* *p = *(p - 1); *(p + 1) = '\0' */
    } else if (p >= 2 && buf.substring(p - 2).toLowerCase() === "ie") {
        /* vie -> vy + ing */
        buf = buf.substring(0, p - 2) + 'y';  /* *(p - 2) = 'y'; *(p - 1) = '\0' */
    } else if (p >= 1 && buf[p - 1] === 'e') {
        /* grease -> greas + ing */
        buf = buf.substring(0, p - 1);        /* *(p - 1) = '\0' */
    }
    buf += "ing";                  /* Strcat(buf, "ing") */
    if (onoff)                     /* if (onoff[0]) */
        buf += onoff;              /* Strcat(buf, onoff) */
    return buf;
}

/* C hacklib.c:849 fuzzymatch — compare two strings for equality, ignoring the
 * presence of the specified characters (here " -") and case. */
export function fuzzymatch(s1, s2, ignore_chars, caseblind) {
    let i = 0, j = 0;
    let c1, c2;
    do {
        do { c1 = (i < s1.length) ? s1[i++] : ''; }
        while (c1 !== '' && ignore_chars.indexOf(c1) >= 0);
        do { c2 = (j < s2.length) ? s2[j++] : ''; }
        while (c2 !== '' && ignore_chars.indexOf(c2) >= 0);
        if (!c1 || !c2)
            break; /* end of either string reached */
        if (caseblind) {
            c1 = c1.toLowerCase();
            c2 = c2.toLowerCase();
        }
    } while (c1 === c2);
    /* match occurs only when the end of both strings has been reached */
    return (!c1 && !c2);
}

// ── Helper: case-insensitive n-char comparison (C strncmpi) ──────────────────
export function strncmpi(s1, s2, n) {
    for (let i = 0; i < n; i++) {
        if (!s2[i]) return (s1[i] !== undefined) ? 1 : 0;
        if (!s1[i]) return -1;
        const c1 = lowc(s1[i]);
        const c2 = lowc(s2[i]);
        if (c1 !== c2) return (c1 > c2) ? 1 : -1;
    }
    return 0;
}

// ── Helper: chrcasecpy / strcasecpy (C hacklib.c) ────────────────────────────
// chrcasecpy: return src char with the case of dst char (when both alphabetic).
export function chrcasecpy(oc, ic) {
    // C hacklib.c:300-317 uses ASCII case ranges.  letter() also accepts
    if (oc >= 'a' && oc <= 'z') return lowc(ic);
    if (oc >= 'A' && oc <= 'Z') return highc(ic);
    return ic;
}

/* C hacklib.c:714 — sgn(n): -1, 0, or 1 */
export function sgn(n) {
    return (n < 0) ? -1 : (n !== 0 ? 1 : 0);
}

// C ref: hacklib.c:491-520 tabexpand() — expand tabs to the next 8-column tab
// stop, in place.  The attributions at the end of data.base quotes are indented
// with a second tab, which is what makes this reachable from checkfile.
export function tabexpand(sbuf) {
    if (!sbuf) return sbuf;
    let out = '', idx = 0;
    for (const ch of sbuf) {
        if (ch === '\t') {
            do {
                out += ' ';
            } while (++idx % 8);
        } else {
            out += ch;
            ++idx;
        }
    }
    return out;
}

// ── isqrt ────────────────────────────────────────────────────────────────────
export function isqrt(val) {
    if (val <= 0) return 0;
    return Math.trunc(Math.sqrt(val));
}
