// hacklib.js — Utility functions.
// C ref: hacklib.c, dungeon.c helpers

import { game } from './gstate.js';
import { BUFSZ, In_endgame } from './const.js';

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

/* C ref: hacklib.c:830-837 — swapbits(val, bita, bitb) swaps bit a with bit b in val. */
export function swapbits(val, bita, bitb) {
    val |= 0; bita |= 0; bitb |= 0;
    const tmp = (((val >> bita) & 1) ^ ((val >> bitb) & 1)) | 0;
    return (val ^ ((tmp << bita) | (tmp << bitb))) | 0;
}

/** C ref: hacklib.c online2 — orthogonal or diagonal line. */
export function online2(x0, y0, x1, y1) {
    const dx = x0 - x1;
    const dy = y0 - y1;
    return !dy || !dx || dy === dx || dy === -dx;
}

export function depth(uz) {
    const dnum = uz?.dnum ?? 0;
    const dlevel = uz?.dlevel ?? 1;
    const dungeon = game?.dungeons?.[dnum];
    if (!dungeon) return dlevel;
    return (dungeon.depth_start || 1) + dlevel - 1;
}

/**
 * C ref: dungeon.c builds_up — multi-level dungeon entered at bottom, or
 * single-level branch with end1_up parent connection.
 */
export function builds_up(uz) {
    const lev = uz || game?.u?.uz;
    if (!lev) return false;
    const dptr = game?.dungeons?.[lev.dnum | 0];
    if (!dptr) return false;
    if ((dptr.num_dunlevs | 0) > 1)
        return (dptr.entry_lev | 0) === (dptr.num_dunlevs | 0);
    for (const br of game.branches || []) {
        if (br?.end2
            && (br.end2.dnum | 0) === (lev.dnum | 0)
            && (br.end2.dlevel | 0) === (lev.dlevel | 0))
            return !!br.end1_up;
    }
    return false;
}

/**
 * C ref: dungeon.c deepest_lev_reached `:1338–1371` — max depth() over
 * dunlev_ureached; noquest skips the Quest branch (topten display).
 * C iterates svd.dungeons[0..svn.n_dgns); JS game.dungeons is dense.
 * Canonical home; end.js/topten.js clones retired.
 */
export function deepest_lev_reached(noquest) {
    let ret = 0;
    const dungeons = game.dungeons || [];
    for (let i = 0; i < dungeons.length; i++) {
        if (noquest && i === (game.quest_dnum | 0)) continue;
        const dlevel = dungeons[i]?.dunlev_ureached | 0;
        if (!dlevel) continue;
        const d = depth({ dnum: i, dlevel });
        if (d > ret) ret = d;
    }
    return ret;
}

/**
 * C ref: dungeon.c level_difficulty `:2026–2084` in C order — endgame
 * sanctum depth + ulevel/2; amulet → deepest_lev_reached(FALSE); else
 * depth + builds_up entry climb; EAggravate_monster (extrinsic only,
 * youprop.h:213) doubles res ≤ 25 else 50. The W_tower arm is #if 0
 * in C (compiled out) — intentionally absent, not an omission.
 * Canonical home; fountain/makemon/mklev/mkobj clones retired.
 */
export function level_difficulty(uz) {
    const lev = uz || game?.u?.uz;
    const u = game?.u || {};
    let res;
    if (In_endgame(lev)) { // C `:2032`
        const sanctum = game?.sanctum_level;
        const sdepth = sanctum ? (depth(sanctum) || 1) : (depth(lev) || 1);
        const ulev = (u.ulevel | 0) || 1;
        res = sdepth + Math.trunc(ulev / 2);
    } else if (u.uhave?.amulet || u.uhave_amulet) { // C `:2034`
        res = deepest_lev_reached(false);
    } else { // C `:2036`
        res = depth(lev) || 1;
        if (builds_up(lev)) { // C `:2042`
            const dptr = game?.dungeons?.[lev.dnum | 0];
            res += 2 * ((dptr?.entry_lev | 0) - (lev.dlevel | 0) + 1);
        }
    }
    if ((u.EAggravate_monster | 0)) // C `:2081` ring of aggravate monster
        res = res > 25 ? 50 : res * 2;
    return res;
}

/**
 * C ref: hacklib.c str_end_is `:241–248` — true when `str` ends with `chkstr`.
 */
export function str_end_is(str, chkstr) {
    const s = String(str ?? '');
    const c = String(chkstr ?? '');
    return s.length >= c.length && s.slice(s.length - c.length) === c;
}

/**
 * C ref: hacklib.c str_start_is `:212–237` — true when `str` starts with
 * `chkstr` (chkstr may be shorter). `caseblind` uses ASCII A-Z `lowc`.
 */
export function str_start_is(str, chkstr, caseblind) {
    const s = String(str ?? '');
    const c = String(chkstr ?? '');
    let n = 2147483647;
    let i = 0;
    let j = 0;
    while (--n) {
        if (i >= s.length) return j >= c.length;
        if (j >= c.length) return true;
        const t1 = caseblind ? ascii_lowc_ch(s.charCodeAt(i)) : s.charCodeAt(i);
        const t2 = caseblind ? ascii_lowc_ch(c.charCodeAt(j)) : c.charCodeAt(j);
        i++;
        j++;
        if (t1 !== t2) return false;
    }
    return true;
}

/** C hacklib.c lowc — ASCII A-Z |= 040. */
function ascii_lowc_ch(code) {
    return (code >= 65 && code <= 90) ? (code | 0x20) : code;
}

/** C hacklib.c lowc — ASCII A-Z |= 040. */
export function lowc(c) {
    if (c == null || c === '') return c;
    const ch = typeof c === 'string' ? c.charAt(0) : String.fromCharCode(c);
    const code = ch.charCodeAt(0);
    if (code >= 65 && code <= 90) return String.fromCharCode(code | 0x20);
    return ch;
}

/**
 * C hacklib.c strkitten `:275–283` — append one char at eos(s).
 * JS strings are immutable, so this returns the new string (eos is
 * `s.length`; the C `*p = '\\0'` is the string terminator).
 * @param {string} s
 * @param {string|number} c
 */
export function strkitten(s, c) {
    const str = String(s ?? '');
    const ch = typeof c === 'string' ? (c.charAt(0) || '') : String.fromCharCode(c & 0xff);
    return str + ch;
}

/**
 * C ref: hacklib.c copynchars `:286–297`.
 * At most `n` characters, stopping at NUL or newline. Unlike strncpy,
 * the result is always terminated (the returned string). A null `src`
 * yields "" (C would dereference).
 * @param {string} src
 * @param {number} n
 * @returns {string}
 */
export function copynchars(src, n) {
    const s = typeof src === 'string' ? src : '';
    let left = n | 0;
    let i = 0;
    let out = '';
    while (left > 0 && i < s.length && s.charCodeAt(i) !== 10) {
        out += s[i];
        i++;
        left--;
    }
    return out;
}

/** C hacklib.c highc — ASCII a-z → A-Z. */
export function highc(c) {
    if (c == null || c === '') return c;
    const ch = typeof c === 'string' ? c.charAt(0) : String.fromCharCode(c);
    const code = ch.charCodeAt(0);
    if (code >= 97 && code <= 122) return String.fromCharCode(code & ~0x20);
    return ch;
}

/**
 * C ref: hacklib.c lcase `:89–98` — ASCII A-Z `|= 040` in place.
 * JS strings are immutable; return a new string. Caller do_name.c
 * x_monnam is_mplayer rank_of.
 */
export function lcase(s) {
    const str = String(s ?? '');
    let out = '';
    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        out += (code >= 65 && code <= 90)
            ? String.fromCharCode(code | 0x20)
            : str.charAt(i);
    }
    return out;
}

/**
 * C ref: hacklib.c ucase `:101–110` — walk the string, highc a-z.
 * C mutates in place; JS returns a new string. Caller sounds.c
 * Death `pline1(ucase(...))` (D-1653).
 */
export function ucase(s) {
    const str = String(s ?? '');
    let out = '';
    for (let i = 0; i < str.length; i++) out += highc(str.charAt(i));
    return out;
}

/**
 * C ref: hacklib.c upstart `:113–119` — highc the first character.
 * Callers that already have a local clone (do_name/apply/…) keep theirs;
 * newcham uses this C-home export (do not add clone #9).
 */
export function upstart(s) {
    if (s == null || s === '') return s;
    const str = String(s);
    return highc(str.charAt(0)) + str.slice(1);
}

/**
 * C ref: hacklib.c ing_suffix `:362–396` — gerund. Split trailing
 * " on"/" off"/" with" (strcmpi), then er / CVC doubling / ie→y /
 * trailing e, then "ing" + saved tail. Case-insensitive suffix tests.
 * @param {string} s
 * @returns {string}
 */
export function ing_suffix(s) {
    const vowel = 'aeiouwy';
    let buf = String(s ?? '');
    let onoff = '';
    const n0 = buf.length;
    const low = buf.toLowerCase();
    if ((n0 >= 3 && low.slice(-3) === ' on')
        || (n0 >= 4 && low.slice(-4) === ' off')
        || (n0 >= 5 && low.slice(-5) === ' with')) {
        const sp = buf.lastIndexOf(' ');
        onoff = buf.slice(sp);
        buf = buf.slice(0, sp);
    }
    const n = buf.length;
    const lc = (i) => buf[i].toLowerCase();
    if (n >= 2 && buf.slice(-2).toLowerCase() === 'er') {
        // slither + ing
    } else if (n >= 3
        && !vowel.includes(lc(n - 1))
        && vowel.includes(lc(n - 2))
        && !vowel.includes(lc(n - 3))) {
        buf += buf[n - 1];
    } else if (n >= 2 && buf.slice(-2).toLowerCase() === 'ie') {
        buf = `${buf.slice(0, -2)}y`;
    } else if (n >= 1 && buf[n - 1].toLowerCase() === 'e') {
        buf = buf.slice(0, -1);
    }
    return `${buf}ing${onoff}`;
}

/**
 * C ref: hacklib.c fuzzymatch `:783–808` — skip ignore_chars independently
 * in each string, then compare remaining chars; match only if both end.
 * ASCII fold when caseblind (C `lowc`). C-home export; artifact/readobjnam
 * keep their local subsets (do not add clone #3 in callers).
 * @param {string} s1
 * @param {string} s2
 * @param {string} [ignore_chars=' -_']
 * @param {boolean} [caseblind=true]
 * @returns {boolean}
 */
export function fuzzymatch(s1, s2, ignore_chars = ' -_', caseblind = true) {
    const a = String(s1 ?? '');
    const b = String(s2 ?? '');
    const ign = String(ignore_chars ?? '');
    const lowc = (ch) => {
        const code = ch.charCodeAt(0);
        return (code >= 65 && code <= 90)
            ? String.fromCharCode(code + 32)
            : ch;
    };
    let i = 0;
    let j = 0;
    let c1 = '';
    let c2 = '';
    do {
        c1 = '';
        while (i < a.length) {
            c1 = a.charAt(i++);
            if (c1 === '' || !ign.includes(c1)) break;
            c1 = '';
        }
        c2 = '';
        while (j < b.length) {
            c2 = b.charAt(j++);
            if (c2 === '' || !ign.includes(c2)) break;
            c2 = '';
        }
        if (!c1 || !c2) break;
        if (caseblind) {
            c1 = lowc(c1);
            c2 = lowc(c2);
        }
    } while (c1 === c2);
    return !c1 && !c2;
}

/**
 * C ref: hacklib.c strstri `:739–779`.
 * `!*sub` returns `str`. Otherwise signed-char nibble histograms
 * (`TABSIZ` 0x20; `char` counters wrap like gcc) reject an impossible
 * match, then a `lowc` window returns the matching tail (`&str[i]`)
 * or null. The `#if 0` asserts are not compiled. A null argument is
 * `""` (C is NONNULL). Embedded NUL ends the C string.
 * @param {string | null | undefined} str
 * @param {string | null | undefined} sub
 * @returns {string | null}
 */
export function strstri(str, sub) {
    if (sub == null) sub = '';
    if (str == null) str = '';
    const s = String(str);
    const n = String(sub);
    const endAt = (text) => {
        const z = text.indexOf('\0');
        return z < 0 ? text.length : z;
    };
    const sEnd = endAt(s);
    const nEnd = endAt(n);
    /* :752–753 empty substring */
    if (nEnd === 0) return s;

    const TABSIZ = 0x20;
    const tstr = new Int8Array(TABSIZ);
    const tsub = new Int8Array(TABSIZ);
    let k = 0;
    /* :758–761 lengths and nibble counts; index is `*s & (TABSIZ-1)` */
    for (let s1 = 0; s1 < sEnd; s1++) {
        tstr[s.charCodeAt(s1) & (TABSIZ - 1)]++;
        k++;
    }
    for (let s2 = 0; s2 < nEnd; s2++) {
        tsub[n.charCodeAt(s2) & (TABSIZ - 1)]++;
        k--;
    }
    /* :764–768 sub longer, or some nibble is over-subscribed */
    if (k < 0) return null;
    for (let i = 0; i < TABSIZ; i++) {
        if (tsub[i] > tstr[i]) return null;
    }
    /* :771–777 lowc window; success is the tail at `&str[i]` */
    for (let i = 0; i <= k; i++) {
        let p1 = i;
        let p2 = 0;
        while (ascii_lowc_ch(s.charCodeAt(p1++)) === ascii_lowc_ch(n.charCodeAt(p2++))) {
            if (p2 >= nEnd) return s.slice(i, sEnd);
        }
    }
    return null;
}

/**
 * C ref: hacklib.c strsubst `:534–551` — replace the first `strstr`
 * (case-sensitive) occurrence of `orig` in `bp`.
 * @param {string} bp
 * @param {string} orig
 * @param {string} replacement
 * @returns {string}
 */
export function strsubst(bp, orig, replacement) {
    const s = String(bp ?? '');
    const o = String(orig ?? '');
    if (!o) return s;
    const i = s.indexOf(o);
    if (i < 0) return s;
    return s.slice(0, i) + String(replacement ?? '') + s.slice(i + o.length);
}

/**
 * C ref: hacklib.c trimspaces `:162–176` — leading ' '/'\t' are skipped
 * by returning the advanced pointer ("leading whitespace will remain in
 * the buffer"); trailing ' '/'\t' are stripped in place. Only space and
 * tab count. JS strings are immutable, so this returns the adjusted
 * string (C's return value).
 * @param {string} txt
 * @returns {string}
 */
export function trimspaces(txt) {
    const s = String(txt ?? '');
    let start = 0;
    while (start < s.length && (s[start] === ' ' || s[start] === '\t')) start++;
    let end = s.length;
    while (end > start && (s[end - 1] === ' ' || s[end - 1] === '\t')) end--;
    return s.slice(start, end);
}

// C ref: rn2(x) already in rng.js — re-export not needed

/**
 * C ref: hacklib.c strNsubst `:555–597` — substitute the Nth occurrence of
 * `orig` within the string (in place in C); `n == 0` substitutes all
 * occurrences. Returns the resulting string (C returns the substitution
 * count and only writes back when nonzero; the sole JS call site casts it
 * to void like C's `(void) strNsubst`, so the count is unobservable there).
 * Output is capped at BUFSZ-1 chars like C's `workbuf`.
 */
export function strNsubst(inoutbuf, orig, replacement, n) {
    const s = String(inoutbuf ?? '');
    const o = String(orig ?? '');
    const r = String(replacement ?? '');
    const len = o.length;
    let ocount = 0; // number of times 'orig' has been matched
    let rcount = 0; // number of substitutions made
    let out = '';
    let bp = 0;
    while (bp < s.length && out.length < BUFSZ - 1) {
        if ((!len || s.startsWith(o, bp)) && (++ocount === n || n === 0)) {
            // Nth match found
            for (const ch of r) {
                if (out.length >= BUFSZ - 1) break;
                out += ch;
            }
            ++rcount;
            if (len) {
                bp += len; // skip 'orig'
                continue;
            }
        }
        // no match (or len==0) so retain current character
        out += s[bp++];
    }
    if (!len && n === ocount + 1) {
        // C special case: orig=="" and n==strlen+1, insert before terminator
        for (const ch of r) {
            if (out.length >= BUFSZ - 1) break;
            out += ch;
        }
        ++rcount;
    }
    return rcount ? out : s;
}

/**
 * C ref: hacklib.c findword `:600–621` — search for a word in a
 * space-separated list. Returns the matched word, or null when absent
 * (C returns a pointer / NULL; only truthiness is observed).
 */
export function findword(list, word, wordlen, ignorecase) {
    const s = String(list ?? '');
    const w = String(word ?? '').slice(0, wordlen);
    let p = 0;
    for (;;) {
        while (s[p] === ' ') ++p;
        if (p >= s.length) break;
        const seg = s.slice(p, p + wordlen);
        const eq = ignorecase
            ? seg.toLowerCase() === w.toLowerCase()
            : seg === w;
        const term = s[p + wordlen];
        if (eq && (term === undefined || term === ' ')) {
            const end = s.indexOf(' ', p);
            return end < 0 ? s.slice(p) : s.slice(p, end);
        }
        const nx = s.indexOf(' ', p + 1); // C: strchr(p + 1, ' ')
        if (nx < 0) break;
        p = nx;
    }
    return null;
}

/**
 * C ref: hacklib.c stripchars `:499–517` — copy `orig` minus every char in
 * `stuff_to_strip`, capped at BUFSZ-1 chars (`:506–512` copy gate).
 * C writes into the caller buffer `bp` and returns it; JS strings are
 * immutable so the result is the return value (`bp` carries no input).
 */
export function stripchars(bp, stuff_to_strip, orig) {
    void bp;
    const strip = String(stuff_to_strip ?? '');
    const src = String(orig ?? '');
    let out = '';
    for (const ch of src) {
        if (out.length >= BUFSZ - 1) break; // C `:506` i < BUFSZ-1
        if (!strip.includes(ch)) out += ch; // C `:507` !strchr
    }
    return out;
}

/**
 * C ref: hacklib.c ordin — 1st/2nd/3rd/11th (teen exception).
 * Canonical home (C is one global function); dothrow.js keeps a matching
 * file-local clone used by endmultishot.
 */
export function ordin(n) {
    const nn = n | 0;
    const dd = nn % 10;
    return (dd === 0 || dd > 3 || Math.trunc((nn % 100) / 10) === 1)
        ? 'th' : (dd === 1) ? 'st' : (dd === 2) ? 'nd' : 'rd';
}
