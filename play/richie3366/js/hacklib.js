// hacklib.js — Utility functions.
// C ref: hacklib.c, dungeon.c helpers

import { game } from './gstate.js';
import { In_endgame } from './const.js';

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
 * C ref: dungeon.c level_difficulty — depth, with builds_up adjustment.
 * Ported: In_endgame → depth(sanctum)+ulevel/2. Named omissions:
 * amulet deepest_lev_reached; W_tower #if0 arm.
 */
export function level_difficulty(uz) {
    const lev = uz || game?.u?.uz;
    // C: if (In_endgame(&u.uz)) res = depth(&sanctum_level) + u.ulevel / 2;
    if (In_endgame(lev)) {
        const sanctum = game?.sanctum_level;
        const sdepth = sanctum ? (depth(sanctum) || 1) : (depth(lev) || 1);
        const ulev = (game?.u?.ulevel | 0) || 1;
        return sdepth + Math.trunc(ulev / 2);
    }
    let res = depth(lev) || 1;
    if (builds_up(lev)) {
        const dptr = game?.dungeons?.[lev.dnum | 0];
        res += 2 * ((dptr?.entry_lev | 0) - (lev.dlevel | 0) + 1);
    }
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
 * C ref: hacklib.c strstri `:739–779` — case-insensitive substring.
 * Empty sub returns `str` (C `return (char *) str`). Else the first
 * matching tail, or null. ASCII fold only (C `lowc`).
 * @param {string | null | undefined} str
 * @param {string | null | undefined} sub
 * @returns {string | null}
 */
export function strstri(str, sub) {
    if (sub == null || sub === '') return str == null ? '' : String(str);
    if (str == null || str === '') return null;
    const s = String(str);
    const n = String(sub);
    const i = s.toLowerCase().indexOf(n.toLowerCase());
    return i >= 0 ? s.slice(i) : null;
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

// C ref: rn2(x) already in rng.js — re-export not needed
