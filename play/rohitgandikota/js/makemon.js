// makemon.js — monster selection and creation.
// C ref: src/makemon.c
//
// rndmonst_adj() is the highest-volume function in the recorded corpus:
// 204,394 PRNG calls across the 44 public sessions. It is weighted reservoir
// sampling — one rn2(totalweight) per *eligible* monster — so the draw count
// depends on exactly which monsters pass the filters. Getting a filter wrong
// changes the number of draws, not just their values.

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { mons as MONS_INIT, PMNAMES, NUMMONS } from './monst_data.js';
import { depth } from './dungeon.js';

// include/permonst.h:15,23
const NON_PM = -1;
const LOW_PM = NON_PM + 1;                 /* first monster in mons[] */
const SPECIAL_PM = PMNAMES.PM_LONG_WORM_TAIL;  /* [normal] < ~ < [special] */

// include/monflag.h
const G_FREQ = 0x0007, G_NOGEN = 0x0200, G_HELL = 0x0400,
      G_NOHELL = 0x0800, G_UNIQ = 0x1000;
const G_GENOD = 0x0100, G_EXTINCT = 0x0080;   /* G_GONE = both */
const G_GONE = G_GENOD | G_EXTINCT;

// include/global.h:411, include/align.h:22
const ALIGNWEIGHT = 4;
const A_NEUTRAL = 0;
const AM_NONE = 0, AM_LAWFUL = 4, AM_NEUTRAL = 2, AM_CHAOTIC = 1;

// include/monst.h:259-265
const monmax_difficulty = (levdif) => Math.trunc((levdif + (game.u?.ulevel ?? 0)) / 2);
const monmin_difficulty = (levdif) => Math.trunc(levdif / 6);
const montoostrong = (mndx, lev) => game.mons[mndx].difficulty > lev;
const montooweak = (mndx, lev) => game.mons[mndx].difficulty < lev;

// src/dungeon.c level_difficulty() — the ordinary-dungeon case.
export function level_difficulty() {
    return depth(game.u.uz);
}

function Inhell() {
    return game.dungeons?.[game.u?.uz?.dnum]?.flags?.hellish === true;
}

// src/makemon.c:1593 uncommon()
function uncommon(mndx) {
    const m = game.mons[mndx];
    if (m.geno & (G_NOGEN | G_UNIQ))
        return true;
    if ((game.mvitals?.[mndx]?.mvflags ?? 0) & G_GONE)
        return true;
    if (Inhell())
        return m.maligntyp > A_NEUTRAL;
    else
        return (m.geno & G_HELL) !== 0;
}

// src/makemon.c:1611 align_shift()
function align_shift(ptr) {
    /* the C caches Is_special() per move; with no special levels reached the
       dungeon's own alignment is what applies */
    const dgnAlign = game.dungeons?.[game.u?.uz?.dnum]?.flags?.align ?? AM_NONE;
    let alshift;

    switch (dgnAlign) {
    default:
    case AM_NONE:
        alshift = 0;
        break;
    case AM_LAWFUL:
        alshift = Math.trunc((ptr.maligntyp + 20) / (2 * ALIGNWEIGHT));
        break;
    case AM_NEUTRAL:
        alshift = Math.trunc((20 - Math.abs(ptr.maligntyp)) / ALIGNWEIGHT);
        break;
    case AM_CHAOTIC:
        alshift = Math.trunc((-(ptr.maligntyp - 20)) / (2 * ALIGNWEIGHT));
        break;
    }
    return alshift;
}

// src/makemon.c:1640 temperature_shift()
function temperature_shift(ptr) {
    /* level.flags.temperature is 0 on ordinary levels, so this contributes
       nothing there; the branch is kept so hot/cold levels behave as C does
       once pm_resistance lands. */
    if (!game.level?.flags?.temperature)
        return 0;
    return 0;
}

// src/makemon.c:1659 rndmonst_adj()
//
// Weighted reservoir sampling: each eligible monster with weight > 0 adds to
// totalweight and then draws rn2(totalweight). Monsters filtered out draw
// nothing, which is why the filters decide the call count.
export function rndmonst_adj(minadj, maxadj) {
    let ptr;
    let weight, totalweight, selected_mndx, zlevel, minmlev, maxmlev;

    zlevel = level_difficulty();
    minmlev = monmin_difficulty(zlevel) + minadj;
    maxmlev = monmax_difficulty(zlevel) + maxadj;
    const upper = false;      /* Is_rogue_level */
    const elemlevel = false;  /* In_endgame && !Is_astralevel */

    totalweight = 0;
    selected_mndx = NON_PM;

    for (let mndx = LOW_PM; mndx < SPECIAL_PM; ++mndx) {
        ptr = game.mons[mndx];

        if (montooweak(mndx, minmlev) || montoostrong(mndx, maxmlev))
            continue;
        if (upper)      /* !isupper(monsym(ptr)) */
            continue;
        if (elemlevel)  /* wrong_elem_type(ptr) */
            continue;
        if (uncommon(mndx))
            continue;
        if (Inhell() && (ptr.geno & G_NOHELL))
            continue;

        weight = (ptr.geno & G_FREQ) + align_shift(ptr);
        weight += temperature_shift(ptr);
        if (weight < 0 || weight > 127)
            weight = 0;

        /* was unconditional, but if weight==0, rn2() < 0 always fails; also
           avoids rn2(0) while totalweight is still 0 */
        if (weight > 0) {
            totalweight += weight;
            if (rn2(totalweight) < weight)
                selected_mndx = mndx;
        }
    }

    if (selected_mndx === NON_PM || uncommon(selected_mndx))
        return null;
    return game.mons[selected_mndx];
}

// src/makemon.c:1651 rndmonst()
export function rndmonst() {
    return rndmonst_adj(0, 0);
}

// src/mkobj.c:395 rndmonnum_adj() — Plan A is a level-appropriate common
// monster; the fallback paths are not ported yet.
export function rndmonnum_adj(minadj, maxadj) {
    const ptr = rndmonst_adj(minadj, maxadj);
    if (ptr)
        return monsndx(ptr);
    return NON_PM;
}

// src/mkobj.c:387 rndmonnum()
export function rndmonnum() {
    return rndmonnum_adj(0, 0);
}

// src/mon.c monsndx() — index of a permonst within mons[].
export function monsndx(ptr) {
    return ptr.pmidx !== undefined && typeof ptr.pmidx === 'number'
        ? ptr.pmidx
        : game.mons.indexOf(ptr);
}

export function reset_mvitals() {
    game.mvitals = Array.from({ length: NUMMONS + 1 }, () => ({ mvflags: 0, born: 0, died: 0 }));
}
