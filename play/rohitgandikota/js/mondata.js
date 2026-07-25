// mondata.js — the "what kind of creature is this" predicates.
// C ref: include/mondata.h (they are macros there) and src/mondata.c
//
// Every one is a pure read of a permonst. They were module-local consts in
// mon.js, which meant any other file needing one either imported mon.js (and
// risked a cycle) or kept its own copy. Neither is what the C does: mondata.h
// is a header everybody includes.
//
// Nothing here draws.

import { MFLAGS, MONSYMS, PMNAMES } from './monst_data.js';

export const bigmonst     = (d) => d.msize >= MFLAGS.MZ_LARGE;
export const amorphous    = (d) => (d.mflags1 & MFLAGS.M1_AMORPHOUS) !== 0;
export const is_whirly    = (d) => d.mlet === MONSYMS.S_VORTEX
                         || d.pmidx === PMNAMES.PM_AIR_ELEMENTAL;
export const noncorporeal = (d) => d.mlet === MONSYMS.S_GHOST;
export const slithy       = (d) => (d.mflags1 & MFLAGS.M1_SLITHY) !== 0;
export const needspick    = (d) => (d.mflags1 & MFLAGS.M1_NEEDPICK) !== 0;

export const nohands    = (d) => (d.mflags1 & MFLAGS.M1_NOHANDS) !== 0;
export const verysmall  = (d) => d.msize < MFLAGS.MZ_SMALL;
export const is_giant   = (d) => (d.mflags2 & MFLAGS.M2_GIANT) !== 0;
export const tunnels    = (d) => (d.mflags1 & MFLAGS.M1_TUNNEL) !== 0;
export const passes_walls = (d) => (d.mflags1 & MFLAGS.M1_WALLWALK) !== 0;
export const throws_rocks = (d) => (d.mflags2 & MFLAGS.M2_ROCKTHROW) !== 0;
export const passes_bars  = (d) => (d.mflags1 & MFLAGS.M1_UNSOLID) !== 0
                         || (d.mflags1 & MFLAGS.M1_AMORPHOUS) !== 0
                         || (d.mflags1 & MFLAGS.M1_WALLWALK) !== 0
                         || d.msize <= MFLAGS.MZ_SMALL;

export const is_displacer = (d) => (d.mflags3 & MFLAGS.M3_DISPLACES) !== 0;
export const notake = (ptr) => (ptr.mflags1 & MFLAGS.M1_NOTAKE) !== 0;
export const strongmonst = (ptr) => (ptr.mflags2 & MFLAGS.M2_STRONG) !== 0;

export const is_covetous = (ptr) => (ptr.mflags3 & MFLAGS.M3_COVETOUS) !== 0;


// include/mondata.h:92 metallivorous()
export const metallivorous = (ptr) => (ptr.mflags1 & MFLAGS.M1_METALLIVORE) !== 0;

// include/mondata.h:243 corpse_eater() — an explicit species list, not a flag.
export const corpse_eater = (ptr) =>
    ptr.pmidx === PMNAMES.PM_PURPLE_WORM
    || ptr.pmidx === PMNAMES.PM_BABY_PURPLE_WORM
    || ptr.pmidx === PMNAMES.PM_GHOUL
    || ptr.pmidx === PMNAMES.PM_PIRANHA;

// include/mondata.h humanoid()
export const humanoid = (ptr) => (ptr.mflags1 & MFLAGS.M1_HUMANOID) !== 0;

// include/mondata.h:57 is_whirly()

// src/mondata.c:632 sliparm() — armour slides off these entirely.
export const sliparm = (ptr) => is_whirly(ptr) || ptr.msize <= MFLAGS.MZ_SMALL
                             || noncorporeal(ptr);

// src/mondata.c:640 breakarm() — armour bursts on these.
export function breakarm(ptr) {
    if (sliparm(ptr))
        return false;

    return bigmonst(ptr)
        || (ptr.msize > MFLAGS.MZ_SMALL && !humanoid(ptr))
        /* special cases of humanoids that cannot wear suits */
        || ptr.pmidx === PMNAMES.PM_MARILITH
        || ptr.pmidx === PMNAMES.PM_WINGED_GARGOYLE;
}

// include/mondata.h:133 cantweararm()
export const cantweararm = (ptr) => breakarm(ptr) || sliparm(ptr);

// src/mondata.c:678 num_horns(), include/mondata.h:56 has_horns()
export function num_horns(ptr) {
    switch (ptr.pmidx) {
    case PMNAMES.PM_HORNED_DEVIL: /* ? "more than one" */
    case PMNAMES.PM_MINOTAUR:
    case PMNAMES.PM_ASMODEUS:
    case PMNAMES.PM_BALROG:
        return 2;
    case PMNAMES.PM_WHITE_UNICORN:
    case PMNAMES.PM_GRAY_UNICORN:
    case PMNAMES.PM_BLACK_UNICORN:
    case PMNAMES.PM_KI_RIN:
        return 1;
    default:
        break;
    }
    return 0;
}

export const has_horns = (ptr) => num_horns(ptr) > 0;

// include/mondata.h is_animal()
export const is_animal = (ptr) => (ptr.mflags1 & MFLAGS.M1_ANIMAL) !== 0;

// include/mondata.h mindless()
export const mindless = (ptr) => (ptr.mflags1 & MFLAGS.M1_MINDLESS) !== 0;
