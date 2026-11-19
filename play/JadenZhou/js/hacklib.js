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
