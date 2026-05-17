// pray_align_gname_like_c.js — C pray.c **`align_gname`**, **`align_gtitle`**, **`u_gname`**; you.h **`uhis()`** via **`genders[]`**.
// C refs: pray.c **`align_gname`**, **`align_gtitle`**, **`u_gname`**; **`role.c`** **`roles[]`**.**`lgod`/`ngod`/`cgod`**;
//         you.h **`genders[]`** + **`uhis()`** macro.

import { A_LAWFUL, A_NEUTRAL, A_CHAOTIC, A_NONE } from './const.js';
import { roles, genders } from './roles.js';

/** C: pray.c **`align_gname(A_NONE)`** — **`Moloch`**. */
const GNAM_MOLOCH = 'Moloch';

/**
 * C: pray.c **`align_gname`** — strip leading **`_`** marking a goddess name (**`++gnam`**).
 * @param {string} s
 */
function stripLeadingGoddessUnderscoreLikeC(s) {
    if (!s) return '';
    return s.charCodeAt(0) === 95 /* '_' */ ? s.slice(1) : s;
}

/**
 * @param {import('./gstate.js').game} g
 * @returns {{ lgod: string, ngod: string, cgod: string } | null}
 */
function pantheonTripleForAlignGnameLikeC(g) {
    const ur = g?.urole;
    if (!ur) return null;
    const l = ur.lgod;
    const n = ur.ngod;
    const c = ur.cgod;
    if (typeof l === 'string' && l && typeof n === 'string' && n && typeof c === 'string' && c) {
        return { lgod: l, ngod: n, cgod: c };
    }
    const pantheonIdx = g?.flags?.pantheon;
    if (ur.abbr === 'Pri' && typeof pantheonIdx === 'number') {
        const src = roles[pantheonIdx | 0];
        if (src?.lgod && src.ngod && src.cgod) return { lgod: src.lgod, ngod: src.ngod, cgod: src.cgod };
    }
    if (ur.abbr) {
        const row = roles.find((r) => r.abbr === ur.abbr);
        if (row?.lgod && row.ngod && row.cgod) return { lgod: row.lgod, ngod: row.ngod, cgod: row.cgod };
    }
    return null;
}

/**
 * C: **`const char * align_gname(aligntyp alignment)`** — role pantheon slot by alignment; **`A_NONE`** → Moloch.
 * @param {import('./gstate.js').game} g
 * @param {number} alignment — **`u.ualign.type`**-style (**`A_LAWFUL`** / **`A_NEUTRAL`** / **`A_CHAOTIC`** / **`A_NONE`**)
 * @returns {string}
 */
export function alignGnameLikeC(g, alignment) {
    const al = alignment | 0;
    if (al === (A_NONE | 0)) return GNAM_MOLOCH;
    const trip = pantheonTripleForAlignGnameLikeC(g);
    let gnam = 'someone';
    if (trip) {
        if (al === (A_LAWFUL | 0)) gnam = trip.lgod;
        else if (al === (A_NEUTRAL | 0)) gnam = trip.ngod;
        else if (al === (A_CHAOTIC | 0)) gnam = trip.cgod;
    }
    return stripLeadingGoddessUnderscoreLikeC(gnam);
}

/**
 * C: pray.c **`align_gtitle(aligntyp alignment)`** — **`"goddess"`** if patron string starts with **`_`**, else **`"god"`**.
 * @param {import('./gstate.js').game} g
 * @param {number} alignment
 */
export function alignGtitleLikeC(g, alignment) {
    const al = alignment | 0;
    const trip = pantheonTripleForAlignGnameLikeC(g);
    if (!trip) return 'god';
    let gnam = '';
    if (al === (A_LAWFUL | 0)) gnam = trip.lgod;
    else if (al === (A_NEUTRAL | 0)) gnam = trip.ngod;
    else if (al === (A_CHAOTIC | 0)) gnam = trip.cgod;
    else return 'god';
    if (gnam && gnam.charCodeAt(0) === 95) return 'goddess';
    return 'god';
}

/**
 * C: **`const char * u_gname(void)`** — **`return align_gname(u.ualign.type)`**.
 * @param {import('./gstate.js').game} g
 */
export function uGnameHeroLikeC(g) {
    return alignGnameLikeC(g, g?.u?.ualign?.type ?? 0);
}

/**
 * C: you.h **`#define uhis()`** — **`genders[flags.female ? 1 : 0].his`**.
 * @param {import('./gstate.js').game} g
 */
export function uhisHeroLikeC(g) {
    const female = !!g?.flags?.female;
    const row = genders[female ? 1 : 0];
    return row?.his || 'its';
}

/**
 * C: you.h **`#define uhim()`** — **`genders[flags.female ? 1 : 0].him`**.
 * @param {import('./gstate.js').game} g
 */
export function uhimHeroLikeC(g) {
    const female = !!g?.flags?.female;
    const row = genders[female ? 1 : 0];
    return row?.him || 'it';
}
