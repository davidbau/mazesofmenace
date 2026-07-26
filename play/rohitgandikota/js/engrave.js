// engrave.js — engravings.
// C ref: src/engrave.c
//
// Only the level-generation entry points are ported so far: random_engraving()
// and wipeout_text(), which mklev.c calls when it decorates a room. Both are
// heavy PRNG consumers and were previously a single invented rn2(48).

import { game } from './gstate.js';
import { rn2, rnd } from './rng.js';
import { getrumor, get_rnd_text, MD_PAD_RUMORS } from './rumors.js';
import { DUST, BURN, HEADSTONE, ENGR_BLOOD, N_ENGRAVE } from './const.js';

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

// ---------------------------------------------------------------------------
// The level's engraving list. src/engrave.c keeps it as svl.level.lev_engr, a
// linked list; a plain array is the same thing for our purposes because the
// only ordering that matters is "the one at these coordinates".
// ---------------------------------------------------------------------------

// src/engrave.c engr_at()
export function engr_at(x, y) {
    return (game.level?.lev_engr || []).find(e => e.x === x && e.y === y) || null;
}

// src/engrave.c del_engr()
export function del_engr(ep) {
    const list = game.level?.lev_engr;
    if (!list) return;
    const i = list.indexOf(ep);
    if (i >= 0) list.splice(i, 1);
}

// src/engrave.c:408 make_engr_at() — replaces any engraving already there.
//
// It DOES draw, on one branch: engr_type <= 0 means "pick one", and that costs
// rnd(N_ENGRAVE - 1). Every caller in the tree passes a real type, so the draw
// is unreachable today, but the branch is the whole reason the parameter is an
// int rather than an enum and it is one line to keep honest.
//
// The signature carries pristine_s, C's fourth parameter: an engraving keeps
// three copies of its text (what is there, what the hero remembers reading, and
// what it said before erosion), and pristine_s seeds the third with something
// other than s. Only mklev.c:1153's MARK engraving passes it.
export function make_engr_at(x, y, s, pristine_s, e_time, e_type) {
    const old = engr_at(x, y);
    if (old) del_engr(old);

    const txt = String(s);
    const ep = {
        x, y,
        engr_txt: txt,                          /* actual_text */
        engr_txt_remembered: txt,               /* remembered_text */
        engr_txt_pristine: pristine_s != null ? String(pristine_s) : txt,
        engr_time: e_time,
        engr_type: (e_type > 0) ? e_type : rnd(N_ENGRAVE - 1),
        guardobjects: 0,
        nowipeout: false,
    };

    /* engraving "Elbereth" while the level is being made creates the old-style
       one that deters monsters whenever objects are present; the hero doing it
       exercises wisdom instead. */
    if (txt === 'Elbereth') {
        if (game.in_mklev)
            ep.guardobjects = 1;
        else
            note_unported_engrave('make_engr_at:exercise');
    }

    (game.level.lev_engr ||= []).push(ep);
}

// src/engrave.c wipe_engr_at() — age an engraving by rubbing out `cnt` of its
// characters.
//
// A DUST or ENGR_BLOOD engraving erodes by the full count; anything else first
// rolls `cnt = rn2(1 + 50 / (cnt + 1)) ? 0 : 1`, so it usually erodes nothing
// and that roll is itself a draw. makeniche() only ever writes DUST, so the
// level generator takes the first path.
export function wipe_engr_at(x, y, cnt, magical) {
    const ep = engr_at(x, y);
    if (!ep || ep.engr_type === HEADSTONE || ep.nowipeout) return;
    if (ep.engr_type === BURN && !(magical && !rn2(2))) return;

    if (ep.engr_type !== DUST && ep.engr_type !== ENGR_BLOOD)
        cnt = rn2(1 + Math.trunc(50 / (cnt + 1))) ? 0 : 1;

    ep.engr_txt = wipeout_text(ep.engr_txt, cnt, 0);
    ep.engr_txt = ep.engr_txt.replace(/^ +/, '');
    if (!ep.engr_txt) del_engr(ep);
}

function note_unported_engrave(what) {
    (game.unported ||= new Set()).add(what);
}
