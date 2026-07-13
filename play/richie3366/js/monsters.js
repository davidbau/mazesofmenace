// monsters.js — Monster table accessors.
// C ref: monst.c / permonst.h / monflag.h / mondata.h

import {
    NUMMONS,
    LOW_PM,
    SPECIAL_PM,
    NON_PM,
    mlevels,
    mmoves,
    macs,
    maligntyps,
    genos,
    difficulties,
    mflags1s,
    mflags2s,
    mflags3s,
    msizes,
    mlets,
    has_at_weaps,
    mattks,
    mcolors,
    monsterNames,
    PM_GIANT_SPIDER,
    PM_LICHEN,
    PM_HUMAN,
    PM_ELF,
    PM_DWARF,
    PM_ORC,
    PM_GNOME,
    PM_ARCHEOLOGIST,
    PM_WIZARD,
} from './generated/monsters_data.js';

export {
    NUMMONS,
    LOW_PM,
    SPECIAL_PM,
    NON_PM,
    PM_GIANT_SPIDER,
    PM_LICHEN,
    PM_HUMAN,
    PM_ELF,
    PM_DWARF,
    PM_ORC,
    PM_GNOME,
    PM_ARCHEOLOGIST,
    PM_WIZARD,
    monsterNames,
    mcolors,
};

export const G_UNIQ = 0x1000;
export const G_NOHELL = 0x0800;
export const G_HELL = 0x0400;
export const G_NOGEN = 0x0200;
export const G_NOCORPSE = 0x0100;
export const G_SGROUP = 0x0080; /* appear in small groups normally */
export const G_LGROUP = 0x0040; /* appear in large groups normally */
export const G_FREQ = 0x0007;
/* monflag.h — mkclass may ignore G_GENOD|G_EXTINCT via this non-geno bit */
export const G_IGNORE = 0x8000;

export const M2_MALE = 0x00010000;
export const M2_FEMALE = 0x00020000;
export const M2_NEUTER = 0x00040000;
export const M2_PNAME = 0x00080000; /* monflag.h — proper name */
export const M2_HOSTILE = 0x00100000;
export const M2_PEACEFUL = 0x00200000;
export const M2_DOMESTIC = 0x00400000;
export const M2_WANDER = 0x00800000;
export const M2_ROCKTHROW = 0x08000000;
export const M2_LORD = 0x00000400;
export const M2_PRINCE = 0x00000800;
export const M2_NASTY = 0x02000000;
export const M2_STRONG = 0x04000000;
export const M2_MERC = 0x00000200;

export const M1_FLY = 0x00000001; /* monflag.h — can fly or float */
export const M1_AMORPHOUS = 0x00000004; /* monflag.h — can flow under doors */
export const M1_WALLWALK = 0x00000008;
export const M1_CLING = 0x00000010; /* monflag.h — cling to ceiling */
export const M1_NOHANDS = 0x00002000;
export const M1_SEE_INVIS = 0x01000000; /* monflag.h — sees invisible */
export const M1_NOEYES = 0x00001000;
export const M1_MINDLESS = 0x00010000;
export const M1_ANIMAL = 0x00040000;
export const M1_OVIPAROUS = 0x00400000; /* monflag.h — can lay eggs */
export const M1_ACID = 0x08000000;
export const M1_POIS = 0x10000000;
export const M1_CARNIVORE = 0x20000000;
export const M1_HERBIVORE = 0x40000000;
export const M1_OMNIVORE = 0x60000000;

// C ref: monflag.h M3_*
export const M3_INFRAVISION = 0x0100;
export const M3_INFRAVISIBLE = 0x0200;

export const CORPSTAT_INIT = 8;

export function mons(mndx) {
    if (mndx == null || mndx < 0 || mndx >= NUMMONS) return null;
    return {
        mndx,
        mlevel: mlevels[mndx],
        mmove: mmoves[mndx],
        ac: macs[mndx],
        maligntyp: maligntyps[mndx],
        geno: genos[mndx],
        difficulty: difficulties[mndx],
        mflags1: mflags1s[mndx],
        mflags2: mflags2s[mndx],
        mflags3: mflags3s[mndx],
        msize: msizes[mndx],
        mlet: mlets[mndx],
        mcolor: mcolors[mndx],
        mattk: mattks[mndx],
        name: monsterNames[mndx],
    };
}

// C ref: mondata.h infravision / infravisible
export function infravision(ptr) {
    return !!((ptr?.mflags3 ?? 0) & M3_INFRAVISION);
}
export function infravisible(ptr) {
    return !!((ptr?.mflags3 ?? 0) & M3_INFRAVISIBLE);
}

// C ref: mondata.h / monflag.h — verysmall = msize < MZ_SMALL
export const MZ_TINY = 0;
export const MZ_SMALL = 1;
export function verysmall(ptr) {
    return (ptr?.msize ?? 2) < MZ_SMALL;
}

// C ref: mondata.h nohands()
export function nohands(ptr) {
    return !!((ptr?.mflags1 ?? 0) & M1_NOHANDS);
}

/** C ref: mondata.h lays_eggs() */
export function lays_eggs(ptr) {
    return !!((ptr?.mflags1 ?? 0) & M1_OVIPAROUS);
}

// C ref: mondata.h is_flyer / is_floater / is_clinger / grounded / passes_walls
export function is_flyer(ptr) {
    return !!((ptr?.mflags1 ?? 0) & M1_FLY);
}
export function is_floater(ptr) {
    const mlet = ptr?.mlet;
    return mlet === 'S_EYE' || mlet === 'S_LIGHT';
}
export function is_clinger(ptr) {
    return !!((ptr?.mflags1 ?? 0) & M1_CLING);
}
/** C: grounded — not flyer/floater; clingers need ceiling (always assume has). */
export function grounded(ptr) {
    if (!ptr) return true;
    if (is_flyer(ptr) || is_floater(ptr)) return false;
    if (is_clinger(ptr)) return false; /* has_ceiling stub: treat as cling-safe */
    return true;
}
export function passes_walls(ptr) {
    return !!((ptr?.mflags1 ?? 0) & M1_WALLWALK);
}

// C ref: mondata.c mon_knows_traps / mon_learns_traps — mtrapseen bitset
// (trap.h ALL_TRAPS=-1, NO_TRAP=0; bits are 1<<(ttyp-1)).
export function mon_knows_traps(mtmp, ttyp) {
    const seen = mtmp?.mtrapseen | 0;
    if (ttyp === -1 /* ALL_TRAPS */) return !!seen;
    if (ttyp === 0 /* NO_TRAP */) return !seen;
    return (seen & (1 << (ttyp - 1))) !== 0;
}

export function mon_learns_traps(mtmp, ttyp) {
    if (!mtmp) return;
    if (ttyp === -1 /* ALL_TRAPS */) {
        mtmp.mtrapseen = ~0;
    } else if (ttyp === 0 /* NO_TRAP */) {
        mtmp.mtrapseen = 0;
    } else {
        mtmp.mtrapseen = (mtmp.mtrapseen | 0) | (1 << (ttyp - 1));
    }
}

export function throws_rocks(ptr) {
    return !!((ptr?.mflags2 ?? 0) & M2_ROCKTHROW);
}

export function always_hostile(ptr) {
    return !!(ptr.mflags2 & M2_HOSTILE);
}
export function always_peaceful(ptr) {
    return !!(ptr.mflags2 & M2_PEACEFUL);
}
export function is_male(ptr) {
    return !!(ptr.mflags2 & M2_MALE);
}
export function is_female(ptr) {
    return !!(ptr.mflags2 & M2_FEMALE);
}
export function is_neuter(ptr) {
    return !!(ptr.mflags2 & M2_NEUTER);
}
export function is_domestic(ptr) {
    return !!(ptr.mflags2 & M2_DOMESTIC);
}
export function is_wanderer(ptr) {
    return !!(ptr?.mflags2 & M2_WANDER);
}
// C ref: mondata.h is_armed / attacktype(AT_WEAP)
export function is_armed(ptr) {
    if (!ptr || ptr.mndx == null) return false;
    return !!has_at_weaps[ptr.mndx];
}
export function is_lord(ptr) {
    return !!(ptr?.mflags2 & M2_LORD);
}
export function is_prince(ptr) {
    return !!(ptr?.mflags2 & M2_PRINCE);
}
export function extra_nasty(ptr) {
    return !!(ptr?.mflags2 & M2_NASTY);
}
export function strongmonst(ptr) {
    return !!(ptr?.mflags2 & M2_STRONG);
}
export function is_mercenary(ptr) {
    return !!(ptr?.mflags2 & M2_MERC);
}
export function mon_difficulty(mndx) {
    return difficulties[mndx] ?? 0;
}

// C ref: monst.h
export function monmax_difficulty(levdif, ulevel) {
    return Math.trunc((levdif + ulevel) / 2);
}
export function monmin_difficulty(levdif) {
    return Math.trunc(levdif / 6);
}
export function montoostrong(mndx, lev) {
    return difficulties[mndx] > lev;
}
export function montooweak(mndx, lev) {
    return difficulties[mndx] < lev;
}

// C ref: mondata.h is_placeholder — corpse stand-ins for races
const PM_GIANT = monsterNames.indexOf('PM_GIANT');
export function is_placeholder(ptr) {
    const mndx = ptr?.mndx;
    return mndx === PM_ORC || mndx === PM_GIANT
        || mndx === PM_ELF || mndx === PM_HUMAN;
}
