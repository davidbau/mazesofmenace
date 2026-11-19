// engrave.js — engravings.
// C ref: engrave.c — rubouts[], wipeout_text, engr_at, wipe_engr_at,
// make_engr_at, del_engr.
//
// The level's engraving list (C's head_engr) is game.level.head_engr.
// Engraving text is kept as JS strings; C's in-place char edits are done
// on a character array.
//
// Also random_engraving, make_grave, del_engr_at (text files: js/rumors.js).
// Not ported yet: the player-side engrave commands, reading and sensing
// engravings.

import { game } from './gstate.js';
import { rn2, rnd, rn2_fnptr } from './rng.js';
import { DUST, BURN, ENGR_BLOOD, HEADSTONE, N_ENGRAVE, ICE, ROOM, GRAVE } from './const.js';
import { getrumor, get_rnd_text, ENGRAVEFILE, EPITAPHFILE, MD_PAD_RUMORS } from './rumors.js';
import { t_at } from './trap.js';
import { set_levltyp } from './mkmaze.js';

const BUFSZ = 256;

// C ref: engrave.c rubouts[]
/* Partial rubouts for engraving characters. -3. */
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

// C ref: engrave.c wipeout_text()
/* degrade some of the characters in a string; returns the new string */
export function wipeout_text(engr, cnt, seed) {
    const s = engr.split('');
    let i, j, nxt, use_rubout;
    let lth = s.length;

    if (lth && cnt > 0) {
        while (cnt--) {
            /* pick next character */
            if (!seed) {
                /* random */
                nxt = rn2(lth);
                use_rubout = rn2(4);
            } else {
                /* predictable; caller can reproduce the same sequence by
                   supplying the same arguments later, or a pseudo-random
                   sequence by varying any of them */
                nxt = seed % lth;
                seed *= 31, seed %= (BUFSZ - 1);
                use_rubout = seed & 3;
            }
            if (s[nxt] === ' ')
                continue;

            /* rub out unreadable & small punctuation marks */
            if ("?.,'`-|_".includes(s[nxt])) {
                s[nxt] = ' ';
                continue;
            }

            if (!use_rubout) {
                i = rubouts.length;
            } else {
                for (i = 0; i < rubouts.length; i++)
                    if (s[nxt] === rubouts[i][0]) {
                        const ln = rubouts[i][1].length;
                        /*
                         * Pick one of the substitutes at random.
                         */
                        if (!seed) {
                            j = rn2(ln);
                        } else {
                            seed *= 31, seed %= (BUFSZ - 1);
                            j = seed % ln;
                        }
                        s[nxt] = rubouts[i][1][j];
                        break;
                    }
            }

            /* didn't pick rubout; use '?' for unreadable character */
            if (i === rubouts.length)
                s[nxt] = '?';
        }
    }

    /* trim trailing spaces */
    while (lth && s[lth - 1] === ' ')
        s.length = --lth;
    return s.join('');
}

// C ref: engrave.c engr_at()
export function engr_at(x, y) {
    let ep = game.level.head_engr || null;

    while (ep) {
        if (x === ep.engr_x && y === ep.engr_y)
            return ep;
        ep = ep.nxt_engr;
    }
    return null;
}

// C ref: engrave.c wipe_engr_at()
export function wipe_engr_at(x, y, cnt, magical) {
    const ep = engr_at(x, y);

    /* Headstones and some specially marked engravings are indelible */
    if (ep && ep.engr_type !== HEADSTONE && !ep.nowipeout) {
        /* debugpline1("asked to erode %d characters", cnt); */
        const loc = game.level.at(x, y);
        if (ep.engr_type !== BURN || loc.typ === ICE /* is_ice() */
            || (magical && !rn2(2))) {
            if (ep.engr_type !== DUST && ep.engr_type !== ENGR_BLOOD) {
                cnt = rn2(1 + Math.trunc(50 / (cnt + 1))) ? 0 : 1;
                /* debugpline1("actually eroding %d characters", cnt); */
            }
            ep.engr_txt.actual_text = wipeout_text(ep.engr_txt.actual_text, cnt, 0);
            while (ep.engr_txt.actual_text[0] === ' ')
                ep.engr_txt.actual_text = ep.engr_txt.actual_text.slice(1);
            if (!ep.engr_txt.actual_text.length)
                del_engr(ep);
        }
    }
}

// C ref: engrave.c make_engr_at()
export function make_engr_at(x, y, s, pristine_s, e_time, e_type) {
    let ep;

    if ((ep = engr_at(x, y)) !== null)
        del_engr(ep);

    ep = {
        nxt_engr: game.level.head_engr || null,
        engr_x: x,
        engr_y: y,
        engr_txt: { actual_text: s, remembered_text: s, pristine_text: s },
    };
    game.level.head_engr = ep;
    if (pristine_s !== null && pristine_s !== undefined)
        ep.engr_txt.pristine_text = pristine_s;
    if (s === 'Elbereth') {
        /* engraving "Elbereth":  if done when making a level, it creates
           an old-style Elbereth that deters monsters when any objects are
           present; otherwise (done by the player), exercises wisdom */
        if (game.in_mklev)
            ep.guardobjects = 1;
        /* else exercise(A_WIS, TRUE): not reached during level creation */
    }
    ep.engr_time = e_time;
    ep.engr_type = (e_type > 0) ? e_type : rnd(N_ENGRAVE - 1);
    /* we do not set ep->eread or ep->erevealed;
     * the caller will need to if required */
    return ep;
}

// C ref: engrave.c del_engr()
/* delete any engraving at location <x,y> */
export function del_engr(ep) {
    if (ep === game.level.head_engr) {
        game.level.head_engr = ep.nxt_engr;
    } else {
        let ept;

        for (ept = game.level.head_engr; ept; ept = ept.nxt_engr)
            if (ept.nxt_engr === ep) {
                ept.nxt_engr = ep.nxt_engr;
                break;
            }
        if (!ept) {
            console.error('impossible: Error in del_engr?');
            return;
        }
    }
    /* dealloc_engr(ep) */
}

// C ref: engrave.c del_engr_at()
export function del_engr_at(x, y) {
    const ep = engr_at(x, y);

    if (ep)
        del_engr(ep);
}

// C ref: engrave.c random_engraving()
/* pick a random engraving; pristine_copy.s receives the undegraded text */
export function random_engraving(pristine_copy) {
    let rumor;

    /* a random engraving may come from the "rumors" file,
       or from the "engrave" file (formerly in an array here) */
    if (!rn2(4) || !(rumor = getrumor(0, pristine_copy, true)) || !rumor)
        get_rnd_text(ENGRAVEFILE, pristine_copy, rn2_fnptr, MD_PAD_RUMORS);

    let outbuf = pristine_copy.s;
    outbuf = wipeout_text(outbuf, Math.trunc(outbuf.length / 4), 0);
    return outbuf;
}

// C ref: engrave.c make_grave()
export function make_grave(x, y, str) {
    const buf = { s: '' };
    const lev = game.level.at(x, y);

    /* Can we put a grave here? */
    if ((lev.typ !== ROOM && lev.typ !== GRAVE) || t_at(x, y))
        return;
    /* Make the grave */
    if (!set_levltyp(x, y, GRAVE))
        return;
    /* Engrave the headstone */
    del_engr_at(x, y);
    if (!str)
        str = get_rnd_text(EPITAPHFILE, buf, rn2_fnptr, MD_PAD_RUMORS);
    make_engr_at(x, y, str, null, 0, HEADSTONE);
    return;
}
