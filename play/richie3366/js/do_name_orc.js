// do_name_orc.js — C do_name.c rndorcname / christen_monst / christen_orc (orctown booty).
// C ref: do_name.c rndorcname(), christen_monst(), christen_orc().

import { rnd, rn1, rn2 } from './rng.js';
import { upstartLikeC } from './objnam.js';

const ORC_V = ['a', 'ai', 'og', 'u'];
const ORC_SND = [
    'gor', 'gris', 'un', 'bane', 'ruk', 'oth', 'ul', 'z', 'thos', 'akh', 'hai',
];

/**
 * C: do_name.c `rndorcname(char *s)` — syllable RNG via `rn1` / `rn2`.
 * @param {string[]} buf — mutable buffer (caller passes `[]` or pre-sized array joined later)
 * @returns {string}
 */
export function rndorcnameLikeC(buf) {
    let s = '';
    const iend = rn1(2, 3);
    let vstart = rn2(2);
    for (let i = 0; i < iend; ++i) {
        vstart = 1 - vstart;
        const sep = i > 0 && !rn2(30) ? '-' : '';
        const piece = vstart ? ORC_V[rnd(ORC_V.length)] : ORC_SND[rnd(ORC_SND.length)];
        s += sep + piece;
    }
    if (buf && typeof buf === 'object' && 'length' in buf) {
        buf.length = 0;
        buf.push(s);
    }
    return s;
}

/**
 * C: do_name.c `christen_monst` — `new_mgivenname` + copy (no RNG).
 * @param {object} mtmp
 * @param {string} name
 * @returns {object}
 */
export function christenMonstLikeC(mtmp, name) {
    if (name && name.length) {
        if (!mtmp.mextra) mtmp.mextra = {};
        mtmp.mextra.mgivenname = name;
        mtmp.mgivenname = name;
    }
    return mtmp;
}

/**
 * C: do_name.c `christen_orc` — `rndorcname` + optional " of gang" / suffix.
 * @param {object} mtmp
 * @param {string|null|undefined} gang
 * @param {string} other
 * @returns {object}
 */
export function christenOrcLikeC(mtmp, gang, other) {
    const orcname = rndorcnameLikeC(null);
    let sz = orcname.length;
    if (gang) sz += gang.length + 4;
    else if (other) sz += other.length;
    if (sz < 256) {
        let nameit = false;
        let buf = '';
        if (gang) {
            buf = `${upstartLikeC(orcname)} of ${upstartLikeC(gang)}`;
            nameit = true;
        } else if (other) {
            buf = `${upstartLikeC(orcname)}${other}`;
            nameit = true;
        }
        if (nameit) christenMonstLikeC(mtmp, buf);
    }
    return mtmp;
}
