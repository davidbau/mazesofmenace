// engrave.js — engravings.
// C ref: src/engrave.c
//
// Only the level-generation entry points are ported so far: random_engraving()
// and wipeout_text(), which mklev.c calls when it decorates a room. Both are
// heavy PRNG consumers and were previously a single invented rn2(48).

import { rn2 } from './rng.js';
import { getrumor, get_rnd_text, MD_PAD_RUMORS } from './rumors.js';

// src/engrave.c:65 rubouts[] — how each character degrades. Order matters:
// wipeout_text() scans linearly and the index it stops at decides whether the
// character becomes a substitute or a '?'.
const rubouts = [
    ['A', '^'], ['B', 'Pb['], ['C', '('], ['D', '|)['], ['E', '|FL[_'],
    ['F', '|-'], ['G', 'C('], ['H', '|-'], ['I', '|'], ['K', '|<'],
    ['L', '|_'], ['M', '|'], ['N', '|\\'], ['O', 'C('], ['P', 'F'],
    ['Q', 'C('], ['R', 'PF'], ['T', '|'], ['U', 'J'], ['V', '/\\'],
    ['W', 'V/\\'], ['Z', '/'], ['b', '|'], ['d', 'c|'], ['e', 'c'],
    ['g', 'c'], ['h', 'n'], ['j', 'i'], ['k', '|'], ['l', '|'],
    ['m', 'nr'], ['n', 'r'], ['o', 'c'], ['q', 'c'], ['w', 'v'],
    ['y', 'v'], [':', '.'], [';', ',:'], [',', '.'], ['=', '-'],
    ['+', '-|'], ['*', '+'], ['@', '0'], ['0', 'C('], ['1', '|'],
    ['6', 'o'], ['7', '/'], ['8', '3o'],
];

// src/engrave.c:119 wipeout_text() — degrade `cnt` characters of `engr`.
//
// With seed == 0 (the level-generation case) each iteration draws rn2(lth) and
// rn2(4), and a character that has a rubout entry draws a third rn2(ln). A
// space or a small punctuation mark `continue`s *after* those first two draws,
// so the draw count is not simply 2 or 3 per character.
export function wipeout_text(engr, cnt, seed) {
    let s = engr.split('');
    let lth = s.length;

    if (lth && cnt > 0) {
        while (cnt--) {
            let nxt, use_rubout;
            if (!seed) {
                nxt = rn2(lth);
                use_rubout = rn2(4);
            } else {
                nxt = seed % lth;
                seed = (seed * 31) % (BUFSZ - 1);
                use_rubout = seed & 3;
            }
            if (s[nxt] === ' ')
                continue;

            /* rub out unreadable & small punctuation marks */
            if ('?.,\'`-|_'.includes(s[nxt])) {
                s[nxt] = ' ';
                continue;
            }

            let i;
            if (!use_rubout) {
                i = rubouts.length;
            } else {
                for (i = 0; i < rubouts.length; i++)
                    if (s[nxt] === rubouts[i][0]) {
                        const wipeto = rubouts[i][1];
                        let j;
                        if (!seed) {
                            j = rn2(wipeto.length);
                        } else {
                            seed = (seed * 31) % (BUFSZ - 1);
                            j = seed % wipeto.length;
                        }
                        s[nxt] = wipeto[j];
                        break;
                    }
            }

            /* didn't pick rubout; use '?' for unreadable character */
            if (i === rubouts.length)
                s[nxt] = '?';
        }
    }

    /* trim trailing spaces */
    let out = s.join('');
    while (out.length && out[out.length - 1] === ' ')
        out = out.slice(0, -1);
    return out;
}

const BUFSZ = 256;   /* include/global.h */

// src/engrave.c:50 random_engraving()
//
// The text comes from dat/rumors, or from dat/engrave when the rn2(4) says so
// or the rumor lookup comes back empty. Then a quarter of the characters are
// rubbed out. Returns { text, pristine } — C's two output buffers.
export function random_engraving() {
    let pristine = '';
    let rumor = null;

    if (!rn2(4)) {
        pristine = get_rnd_text('engrave', rn2, MD_PAD_RUMORS);
    } else {
        rumor = getrumor(0, true);
        pristine = rumor;
        if (!rumor || rumor.length === 0)
            pristine = get_rnd_text('engrave', rn2, MD_PAD_RUMORS);
    }

    const text = wipeout_text(pristine, Math.trunc(pristine.length / 4), 0);
    return { text, pristine };
}
