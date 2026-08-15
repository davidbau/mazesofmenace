// monsters.js — Monster table accessors.
// C ref: monst.c / permonst.h / monflag.h / mondata.h

import { game } from './gstate.js';
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
    cwts,
    cnutrits,
    mlets,
    has_at_weaps,
    mattks,
    mcolors,
    monsterNames,
    pmnames,
    mresists,
    mconveys,
    PM_GIANT_SPIDER,
    PM_LICHEN,
    PM_ACID_BLOB,
    PM_HUMAN,
    PM_ELF,
    PM_DWARF,
    PM_ORC,
    PM_GNOME,
    PM_ARCHEOLOGIST,
    PM_WIZARD,
    PM_MONK,
} from './generated/monsters_data.js';

export {
    NUMMONS,
    LOW_PM,
    SPECIAL_PM,
    NON_PM,
    PM_GIANT_SPIDER,
    PM_LICHEN,
    PM_ACID_BLOB,
    PM_HUMAN,
    PM_ELF,
    PM_DWARF,
    PM_ORC,
    PM_GNOME,
    PM_ARCHEOLOGIST,
    PM_WIZARD,
    PM_MONK,
    monsterNames,
    pmnames,
    mcolors,
    cwts,
    cnutrits,
};

/** C ref: monflag.h enum mgender */
export const MALE = 0;
export const FEMALE = 1;
export const NEUTRAL = 2;
export const NUM_MGENDERS = 3;

export const G_UNIQ = 0x1000;
export const G_NOHELL = 0x0800;
export const G_HELL = 0x0400;
export const G_NOGEN = 0x0200;
export const G_NOCORPSE = 0x0100;
export const G_SGROUP = 0x0080; /* appear in small groups normally */
export const G_LGROUP = 0x0040; /* appear in large groups normally */
export const G_GENO = 0x0020; /* can be genocided (monflag.h mons[].geno) */
export const G_FREQ = 0x0007;
/* monflag.h — mkclass may ignore G_GENOD|G_EXTINCT via this non-geno bit */
export const G_IGNORE = 0x8000;

/* C ref: monflag.h MR_* — permonst.mresists bits */
export const MR_FIRE = 0x01;
export const MR_COLD = 0x02;
export const MR_SLEEP = 0x04;
export const MR_DISINT = 0x08;
export const MR_ELEC = 0x10;
export const MR_POISON = 0x20;
export const MR_ACID = 0x40;
export const MR_STONE = 0x80;

export const M2_MALE = 0x00010000;
export const M2_FEMALE = 0x00020000;
export const M2_NEUTER = 0x00040000;
export const M2_PNAME = 0x00080000; /* monflag.h — proper name */
export const M2_HOSTILE = 0x00100000;
export const M2_PEACEFUL = 0x00200000;
export const M2_DOMESTIC = 0x00400000;
export const M2_WANDER = 0x00800000;
export const M2_STALK = 0x01000000; /* monflag.h — follows across levels */
export const M2_ROCKTHROW = 0x08000000;
export const M2_GREEDY = 0x10000000; /* monflag.h — likes gold */
export const M2_JEWELS = 0x20000000; /* monflag.h — likes gems */
export const M2_COLLECT = 0x40000000; /* monflag.h — picks up weapons/food */
export const M2_MAGIC = 0x80000000; /* monflag.h — picks up magic items */
export const M2_NOPOLY = 0x00000001; /* monflag.h — players mayn't poly into */
export const M2_UNDEAD = 0x00000002; /* monflag.h — walking dead */
export const M2_WERE = 0x00000004; /* monflag.h — is a lycanthrope */
export const M2_LORD = 0x00000400;
export const M2_PRINCE = 0x00000800;
export const M2_NASTY = 0x02000000;
export const M2_STRONG = 0x04000000;
export const M2_MERC = 0x00000200;
export const M2_DEMON = 0x00000100; /* monflag.h — is a demon */
export const M2_ORC = 0x00000080; /* monflag.h — is an orc (≡ MH_ORC) */
export const M2_HUMAN = 0x00000008; /* monflag.h — is a human */
export const M2_ELF = 0x00000010; /* monflag.h — is an elf */
export const M2_DWARF = 0x00000020; /* monflag.h — is a dwarf */
export const M2_GNOME = 0x00000040; /* monflag.h — is a gnome */
export const M2_GIANT = 0x00002000; /* monflag.h — is a giant */
export const M2_MINION = 0x00001000; /* monflag.h — is a minion of a deity */
export const M2_SHAPESHIFTER = 0x00004000; /* monflag.h — shapeshifting species */

export const M1_FLY = 0x00000001; /* monflag.h — can fly or float */
export const M1_SWIM = 0x00000002; /* monflag.h — can traverse water */
export const M1_AMORPHOUS = 0x00000004; /* monflag.h — can flow under doors */
export const M1_WALLWALK = 0x00000008;
export const M1_AMPHIBIOUS = 0x00000200; /* monflag.h — survive underwater */
export const M1_CLING = 0x00000010; /* monflag.h — cling to ceiling */
export const M1_TUNNEL = 0x00000020; /* monflag.h — can tunnel through rock */
export const M1_NEEDPICK = 0x00000040; /* monflag.h — needs pick to tunnel */
export const M1_CONCEAL = 0x00000080; /* monflag.h — hides under objects */
export const M1_HIDE = 0x00000100; /* monflag.h — mimics, blends with ceiling */
export const M1_BREATHLESS = 0x00000400; /* monflag.h — doesn't need to breathe */
export const M1_NOTAKE = 0x00000800; /* monflag.h — cannot pick up objects */
export const M1_NOHANDS = 0x00002000;
export const M1_NOFEET = 0x00004000; /* monflag.h — no feet/legs to kick/wear boots */
export const M1_NOLIMBS = 0x00006000; /* monflag.h — M1_NOHANDS|M1_NOFEET */
export const M1_NOHEAD = 0x00008000; /* monflag.h — no head to behead */
export const M1_HUMANOID = 0x00020000; /* monflag.h — humanoid head/arms/torso */
export const M1_SLITHY = 0x00080000; /* monflag.h — has serpent body */
export const M1_UNSOLID = 0x00100000; /* monflag.h — no solid/liquid body */
export const M1_THICK_HIDE = 0x00200000; /* monflag.h — thick hide or scales */
export const M1_SEE_INVIS = 0x01000000; /* monflag.h — sees invisible */
export const M1_TPORT = 0x02000000; /* monflag.h — can teleport */
export const M1_TPORT_CNTRL = 0x04000000; /* monflag.h — controls teleport */
export const M1_NOEYES = 0x00001000;
export const M1_MINDLESS = 0x00010000;
export const M1_ANIMAL = 0x00040000;
export const M1_OVIPAROUS = 0x00400000; /* monflag.h — can lay eggs */
export const M1_REGEN = 0x00800000; /* monflag.h — regenerates hit points */
export const M1_ACID = 0x08000000;
export const M1_POIS = 0x10000000;
export const M1_CARNIVORE = 0x20000000;
export const M1_HERBIVORE = 0x40000000;
export const M1_OMNIVORE = 0x60000000;
export const M1_METALLIVORE = 0x80000000; /* monflag.h — eats metal */

// C ref: monflag.h M3_*
export const M3_WANTSAMUL = 0x0001;
export const M3_WANTSBELL = 0x0002;
export const M3_WANTSBOOK = 0x0004;
export const M3_WANTSCAND = 0x0008;
export const M3_WANTSARTI = 0x0010;
export const M3_COVETOUS = 0x001f; /* M3_WANTSALL — wants something */
export const M3_WAITFORU = 0x0040;
export const M3_CLOSE = 0x0080;
export const M3_WAITMASK = 0x00c0; /* M3_WAITFORU | M3_CLOSE */
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
        mresists: mresists[mndx],
        mconveys: mconveys[mndx],
        mflags1: mflags1s[mndx],
        mflags2: mflags2s[mndx],
        mflags3: mflags3s[mndx],
        msize: msizes[mndx],
        cwt: cwts[mndx],
        cnutrit: cnutrits[mndx],
        mlet: mlets[mndx],
        mcolor: mcolors[mndx],
        mattk: mattks[mndx],
        name: monsterNames[mndx],
    };
}

// C ref: monattk.h — used by adj_erinys attack upgrades
const AT_WEAP = 254;
const AT_MAGC = 255;
const AD_DRST = 7;
const AD_SPEL = 241;

const PM_ERINYS = monsterNames.indexOf('PM_ERINYS');
/** monsters.h erinys baseline — JS reuses module across games */
const ERINYS_BASE = PM_ERINYS >= 0 ? {
    mlevel: mlevels[PM_ERINYS],
    difficulty: difficulties[PM_ERINYS],
    mflags1: mflags1s[PM_ERINYS],
    mattk: mattks[PM_ERINYS].map((a) => ({ ...a })),
} : null;

/** C ref: mon.c — reset mons[PM_ERINYS] before newgame (C process start). */
export function reset_erinys() {
    if (PM_ERINYS < 0 || !ERINYS_BASE) return;
    mlevels[PM_ERINYS] = ERINYS_BASE.mlevel;
    difficulties[PM_ERINYS] = ERINYS_BASE.difficulty;
    mflags1s[PM_ERINYS] = ERINYS_BASE.mflags1;
    const dst = mattks[PM_ERINYS];
    for (let i = 0; i < ERINYS_BASE.mattk.length; i++) {
        Object.assign(dst[i], ERINYS_BASE.mattk[i]);
    }
}

/**
 * C ref: mon.c adj_erinys — scale erinys with alignment abuse.
 * Mutates generated mons[] arrays (same as C mons[PM_ERINYS]).
 * Flags/attacks use the `abuse` arg; mlevel/difficulty use u.ualign.abuse.
 */
export function adj_erinys(abuse) {
    if (PM_ERINYS < 0) return;
    const ab = abuse >>> 0;
    if (ab > 5) mflags1s[PM_ERINYS] |= M1_SEE_INVIS;
    if (ab > 10) mflags1s[PM_ERINYS] |= M1_AMPHIBIOUS;
    if (ab > 15) mflags1s[PM_ERINYS] |= M1_FLY;
    if (ab > 20) mattks[PM_ERINYS][0].damn = 3;
    if (ab > 25) mflags1s[PM_ERINYS] |= M1_REGEN;
    if (ab > 30) mflags1s[PM_ERINYS] |= M1_TPORT_CNTRL;
    if (ab > 35) {
        const a1 = mattks[PM_ERINYS][1];
        a1.aatyp = AT_WEAP;
        a1.adtyp = AD_DRST;
        a1.damn = 3;
        a1.damd = 4;
    }
    if (ab > 40) mflags1s[PM_ERINYS] |= M1_TPORT;
    if (ab > 50) {
        const a2 = mattks[PM_ERINYS][2];
        a2.aatyp = AT_MAGC;
        a2.adtyp = AD_SPEL;
        a2.damn = 3;
        a2.damd = 4;
    }
    // C: min(7 + u.ualign.abuse, 50) / min(10 + abuse/3, 25)
    const uabuse = (game.u?.ualign?.abuse | 0);
    mlevels[PM_ERINYS] = Math.min(7 + uabuse, 50);
    difficulties[PM_ERINYS] = Math.min(10 + Math.trunc(uabuse / 3), 25);
}

// C ref: mondata.h infravision / infravisible / is_covetous
export function infravision(ptr) {
    return !!((ptr?.mflags3 ?? 0) & M3_INFRAVISION);
}
export function infravisible(ptr) {
    return !!((ptr?.mflags3 ?? 0) & M3_INFRAVISIBLE);
}
/** C ref: mondata.h is_covetous — any M3_WANTS* bit (M3_COVETOUS mask). */
export function is_covetous(ptr) {
    return !!((ptr?.mflags3 ?? 0) & M3_COVETOUS);
}

// C ref: mondata.h / monflag.h — verysmall = msize < MZ_SMALL
export const MZ_TINY = 0;
export const MZ_SMALL = 1;
export const MZ_MEDIUM = 2; /* monflag.h — 4-7' */
export const MZ_LARGE = 3; /* monflag.h — 7-12' */
export const MZ_HUGE = 4; /* monflag.h — 12-25' */
export function verysmall(ptr) {
    return (ptr?.msize ?? 2) < MZ_SMALL;
}

/** C ref: mondata.h bigmonst — msize >= MZ_LARGE */
export function bigmonst(ptr) {
    return (ptr?.msize ?? 0) >= MZ_LARGE;
}

/** C ref: mondata.h thick_skinned — M1_THICK_HIDE */
export function thick_skinned(ptr) {
    return !!((ptr?.mflags1 ?? 0) & M1_THICK_HIDE);
}

// C ref: mondata.h nohands()
export function nohands(ptr) {
    return !!((ptr?.mflags1 ?? 0) & M1_NOHANDS);
}

/** C ref: mondata.h nolimbs — (mflags1 & M1_NOLIMBS) == M1_NOLIMBS */
export function nolimbs(ptr) {
    return ((ptr?.mflags1 ?? 0) & M1_NOLIMBS) === M1_NOLIMBS;
}

/** C ref: mondata.h has_head — !(mflags1 & M1_NOHEAD). */
export function has_head(ptr) {
    return !((ptr?.mflags1 ?? 0) & M1_NOHEAD);
}

/** C ref: mondata.h is_hider — M1_HIDE (mimics appear as something else). */
export function is_hider(ptr) {
    return !!((ptr?.mflags1 ?? 0) & M1_HIDE);
}

/** C ref: mondata.h hides_under — M1_CONCEAL (needs an object to hide under). */
export function hides_under(ptr) {
    return !!((ptr?.mflags1 ?? 0) & M1_CONCEAL);
}

/** C ref: mondata.h humanoid — M1_HUMANOID */
export function humanoid(ptr) {
    return !!((ptr?.mflags1 ?? 0) & M1_HUMANOID);
}

/** C ref: mondata.h haseyes — !(M1_NOEYES) */
export function haseyes(ptr) {
    return !((ptr?.mflags1 ?? 0) & M1_NOEYES);
}

/**
 * C ref: mondata.c can_track — haseyes; ART_EXCALIBUR wield named omission.
 */
export function can_track(ptr) {
    return haseyes(ptr);
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
/** C ref: mondata.h is_swimmer / amphibious */
export function is_swimmer(ptr) {
    return !!((ptr?.mflags1 ?? 0) & M1_SWIM);
}
export function amphibious(ptr) {
    return !!((ptr?.mflags1 ?? 0) & M1_AMPHIBIOUS);
}
/** C ref: mondata.h likes_lava / likes_fire */
const PM_FIRE_ELEMENTAL = monsterNames.indexOf('PM_FIRE_ELEMENTAL');
const PM_SALAMANDER = monsterNames.indexOf('PM_SALAMANDER');
const PM_FIRE_VORTEX = monsterNames.indexOf('PM_FIRE_VORTEX');
const PM_FLAMING_SPHERE = monsterNames.indexOf('PM_FLAMING_SPHERE');
export function likes_lava(ptr) {
    const mndx = ptr?.mndx ?? -1;
    return mndx === PM_FIRE_ELEMENTAL || mndx === PM_SALAMANDER;
}
export function likes_fire(ptr) {
    const mndx = ptr?.mndx ?? -1;
    return mndx === PM_FIRE_VORTEX || mndx === PM_FLAMING_SPHERE || likes_lava(ptr);
}

/** C ref: mondata.h flaming — fire vortex / sphere / elemental / salamander. */
export function flaming(ptr) {
    const mndx = ptr?.mndx ?? -1;
    return mndx === PM_FIRE_VORTEX || mndx === PM_FLAMING_SPHERE
        || mndx === PM_FIRE_ELEMENTAL || mndx === PM_SALAMANDER;
}

const PM_COCKATRICE = monsterNames.indexOf('PM_COCKATRICE');
const PM_CHICKATRICE = monsterNames.indexOf('PM_CHICKATRICE');
const PM_MEDUSA = monsterNames.indexOf('PM_MEDUSA');
const PM_GREEN_SLIME = monsterNames.indexOf('PM_GREEN_SLIME');
const PM_BABY_LONG_WORM = monsterNames.indexOf('PM_BABY_LONG_WORM');
const PM_LONG_WORM = monsterNames.indexOf('PM_LONG_WORM');
const PM_LONG_WORM_TAIL = monsterNames.indexOf('PM_LONG_WORM_TAIL');

/** C ref: mondata.h touch_petrifies — cockatrice / chickatrice only. */
export function touch_petrifies(ptr) {
    const mndx = ptr?.mndx ?? -1;
    return mndx === PM_COCKATRICE || mndx === PM_CHICKATRICE;
}

/** C ref: mondata.h flesh_petrifies — touch_petrifies || Medusa. */
export function flesh_petrifies(ptr) {
    return touch_petrifies(ptr) || (ptr?.mndx ?? -1) === PM_MEDUSA;
}

/** C ref: mondata.h slimeproof — green slime / flaming / noncorporeal. */
export function slimeproof(ptr) {
    return (ptr?.mndx ?? -1) === PM_GREEN_SLIME || flaming(ptr) || noncorporeal(ptr);
}

/** C ref: mondata.h is_unicorn — S_UNICORN && likes_gems. */
export function is_unicorn(ptr) {
    return ptr?.mlet === 'S_UNICORN' && likes_gems(ptr);
}

/** C ref: mondata.h is_longworm — baby / adult / tail. */
export function is_longworm(ptr) {
    const mndx = ptr?.mndx ?? -1;
    return mndx === PM_BABY_LONG_WORM || mndx === PM_LONG_WORM
        || mndx === PM_LONG_WORM_TAIL;
}

/** C ref: mondata.h your_race — (ptr->mflags2 & urace.selfmask) != 0. */
export function your_race(ptr) {
    const mask = game.urace?.selfmask ?? 0;
    return !!((ptr?.mflags2 ?? 0) & mask);
}
export function is_clinger(ptr) {
    return !!((ptr?.mflags1 ?? 0) & M1_CLING);
}
/** C ref: mondata.h amorphous */
export function amorphous(ptr) {
    return !!((ptr?.mflags1 ?? 0) & M1_AMORPHOUS);
}
/** C ref: mondata.h unsolid */
export function unsolid(ptr) {
    return !!((ptr?.mflags1 ?? 0) & M1_UNSOLID);
}
/** C ref: mondata.h breathless — M1_BREATHLESS */
export function breathless(ptr) {
    return !!((ptr?.mflags1 ?? 0) & M1_BREATHLESS);
}
/** C ref: mondata.h is_whirly — vortex letter or air elemental */
const PM_AIR_ELEMENTAL = monsterNames.indexOf('PM_AIR_ELEMENTAL');
export function is_whirly(ptr) {
    if (!ptr) return false;
    if (ptr.mlet === 'S_VORTEX') return true;
    return (ptr.mndx ?? -1) === PM_AIR_ELEMENTAL;
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

/** C ref: mondata.h tunnels / needspick */
export function tunnels(ptr) {
    return !!((ptr?.mflags1 ?? 0) & M1_TUNNEL);
}
export function needspick(ptr) {
    return !!((ptr?.mflags1 ?? 0) & M1_NEEDPICK);
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

/** C ref: mondata.h is_orc */
export function is_orc(ptr) {
    return !!((ptr?.mflags2 ?? 0) & M2_ORC);
}

/** C ref: mondata.h is_human */
export function is_human(ptr) {
    return !!((ptr?.mflags2 ?? 0) & M2_HUMAN);
}

/** C ref: mondata.h is_elf */
export function is_elf(ptr) {
    return !!((ptr?.mflags2 ?? 0) & M2_ELF);
}

/** C ref: mondata.h is_dwarf */
export function is_dwarf(ptr) {
    return !!((ptr?.mflags2 ?? 0) & M2_DWARF);
}

/** C ref: mondata.h is_gnome */
export function is_gnome(ptr) {
    return !!((ptr?.mflags2 ?? 0) & M2_GNOME);
}

/** C ref: mondata.h is_giant */
export function is_giant(ptr) {
    return !!((ptr?.mflags2 ?? 0) & M2_GIANT);
}

/** C ref: mondata.h is_minion */
export function is_minion(ptr) {
    return !!((ptr?.mflags2 ?? 0) & M2_MINION);
}

/** C ref: mondata.h likes_gold */
export function likes_gold(ptr) {
    return !!((ptr?.mflags2 ?? 0) & M2_GREEDY);
}

/** C ref: mondata.h likes_gems */
export function likes_gems(ptr) {
    return !!((ptr?.mflags2 ?? 0) & M2_JEWELS);
}

/** C ref: mondata.h likes_objs — COLLECT or is_armed */
export function likes_objs(ptr) {
    return !!((ptr?.mflags2 ?? 0) & M2_COLLECT) || is_armed(ptr);
}

/** C ref: mondata.h likes_magic */
export function likes_magic(ptr) {
    return !!((ptr?.mflags2 ?? 0) & M2_MAGIC);
}

/** C ref: mondata.h mindless */
export function mindless(ptr) {
    return !!((ptr?.mflags1 ?? 0) & M1_MINDLESS);
}

/** C ref: mondata.h is_animal */
export function is_animal(ptr) {
    return !!((ptr?.mflags1 ?? 0) & M1_ANIMAL);
}

/** C ref: mondata.h is_undead */
export function is_undead(ptr) {
    return !!((ptr?.mflags2 ?? 0) & M2_UNDEAD);
}

/** C ref: mondata.h is_golem */
export function is_golem(ptr) {
    return ptr?.mlet === 'S_GOLEM';
}

/**
 * C ref: mondata.h pm_resistance — (ptr->mresists & typ) != 0.
 */
export function pm_resistance(ptr, typ) {
    return !!((ptr?.mresists ?? 0) & typ);
}

const PM_STONE_GOLEM = monsterNames.indexOf('PM_STONE_GOLEM');

/**
 * C ref: mondata.c poly_when_stoned — non-stone golem → stone golem unless
 * latter genocided (G_EXTINCT still allowed).
 * `mvitals` optional; omit → treat stone golem as not genocided.
 */
export function poly_when_stoned(ptr, mvitals = null) {
    if (!is_golem(ptr)) return false;
    if (PM_STONE_GOLEM < 0 || (ptr.mndx | 0) === PM_STONE_GOLEM) return false;
    // C: !(svm.mvitals[PM_STONE_GOLEM].mvflags & G_GENOD) — G_GENOD=0x02
    const genod = ((mvitals?.[PM_STONE_GOLEM]?.mvflags ?? 0) & 0x02) !== 0;
    return !genod;
}

/**
 * C ref: monst.h resists_ston → Resists_Elem(STONE_RES) subset:
 * mon_resistancebits = data->mresists | mextrinsics | mintrinsics.
 * Named omission: artifact weapon / worn-item STONE_RES grants.
 */
export function resists_ston(mon) {
    if (!mon) return false;
    const bits = (mon.data?.mresists | 0)
        | (mon.mextrinsics | 0)
        | (mon.mintrinsics | 0);
    return !!(bits & MR_STONE);
}

/**
 * C ref: mondata.c olfaction — false for golem / eye / jelly / pudding /
 * blob / vortex / elemental / fungus / light.
 */
export function olfaction(mdat) {
    if (!mdat) return false;
    if (is_golem(mdat)) return false;
    const mlet = mdat.mlet;
    return mlet !== 'S_EYE' && mlet !== 'S_JELLY' && mlet !== 'S_PUDDING'
        && mlet !== 'S_BLOB' && mlet !== 'S_VORTEX' && mlet !== 'S_ELEMENTAL'
        && mlet !== 'S_FUNGUS' && mlet !== 'S_LIGHT';
}

/** C ref: mondata.h weirdnonliving — golem or vortex */
export function weirdnonliving(ptr) {
    return is_golem(ptr) || ptr?.mlet === 'S_VORTEX';
}

// C: (ptr) == &mons[PM_MANES]
const PM_MANES = monsterNames.indexOf('PM_MANES');

/**
 * C ref: mondata.h nonliving —
 * is_undead || manes || weirdnonliving (golem/vortex).
 */
export function nonliving(ptr) {
    if (!ptr) return false;
    return is_undead(ptr)
        || (ptr.mndx ?? -1) === PM_MANES
        || weirdnonliving(ptr);
}

/** C ref: mondata.h strongmonst */
export function strongmonst(ptr) {
    return !!((ptr?.mflags2 ?? 0) & M2_STRONG);
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
/** C ref: mondata.h is_demon */
export function is_demon(ptr) {
    return !!((ptr?.mflags2 ?? 0) & M2_DEMON);
}
/** C ref: mondata.h is_were */
export function is_were(ptr) {
    return !!((ptr?.mflags2 ?? 0) & M2_WERE);
}
/** C ref: mondata.h polyok — !(mflags2 & M2_NOPOLY) */
export function polyok(ptr) {
    return ((ptr?.mflags2 ?? 0) & M2_NOPOLY) === 0;
}

/** C ref: mondata.h is_mplayer — role monsters Archeologist..Wizard */
export function is_mplayer(ptr) {
    const mndx = ptr?.mndx ?? NON_PM;
    return mndx >= PM_ARCHEOLOGIST && mndx <= PM_WIZARD;
}

/** C ref: mondata.h is_shapeshifter — M2_SHAPESHIFTER */
export function is_shapeshifter(ptr) {
    return !!((ptr?.mflags2 ?? 0) & M2_SHAPESHIFTER);
}
/** C ref: mondata.h is_vampire — mlet S_VAMPIRE */
export function is_vampire(ptr) {
    return ptr?.mlet === 'S_VAMPIRE';
}
/** C ref: mondata.h is_bat — bat / giant bat / vampire bat only (not raven) */
const PM_BAT = monsterNames.indexOf('PM_BAT');
const PM_GIANT_BAT = monsterNames.indexOf('PM_GIANT_BAT');
const PM_VAMPIRE_BAT = monsterNames.indexOf('PM_VAMPIRE_BAT');
export function is_bat(ptr) {
    const n = ptr?.mndx;
    return n === PM_BAT || n === PM_GIANT_BAT || n === PM_VAMPIRE_BAT;
}
/**
 * C ref: mondata.h is_vampshifter — cham is a vampire species.
 * Named omission: full mondata.h body beyond cham index check.
 */
export function is_vampshifter(mon) {
    const cham = mon?.cham ?? NON_PM;
    if (cham < LOW_PM) return false;
    return is_vampire(mons(cham));
}

/**
 * C ref: mondata.c hates_blessings — undead or demon type.
 */
export function hates_blessings(ptr) {
    return is_undead(ptr) || is_demon(ptr);
}

/**
 * C ref: mondata.c mon_hates_blessings — vampshifter or hates_blessings(data).
 */
export function mon_hates_blessings(mon) {
    return is_vampshifter(mon) || hates_blessings(mon?.data);
}

/** C ref: mondata.h vampshifted — vampshifter currently not in vampire form */
export function vampshifted(mon) {
    return is_vampshifter(mon) && mon?.data?.mlet !== 'S_VAMPIRE';
}
/** C ref: mondata.h is_ndemon — demon neither lord nor prince */
export function is_ndemon(ptr) {
    return is_demon(ptr)
        && ((ptr?.mflags2 ?? 0) & (M2_LORD | M2_PRINCE)) === 0;
}
/** C ref: mondata.h is_dlord / is_dprince */
export function is_dlord(ptr) {
    return is_demon(ptr) && is_lord(ptr);
}
export function is_dprince(ptr) {
    return is_demon(ptr) && is_prince(ptr);
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

const PM_DEATH = monsterNames.indexOf('PM_DEATH');
const PM_FAMINE = monsterNames.indexOf('PM_FAMINE');
const PM_PESTILENCE = monsterNames.indexOf('PM_PESTILENCE');
const PM_STALKER = monsterNames.indexOf('PM_STALKER');
const PM_FLESH_GOLEM = monsterNames.indexOf('PM_FLESH_GOLEM');
const PM_LEATHER_GOLEM = monsterNames.indexOf('PM_LEATHER_GOLEM');
const PM_BLACK_PUDDING = monsterNames.indexOf('PM_BLACK_PUDDING');

/** C ref: mondata.h is_rider */
export function is_rider(ptr) {
    const mndx = ptr?.mndx;
    return mndx === PM_DEATH || mndx === PM_FAMINE || mndx === PM_PESTILENCE;
}

const PM_WATCHMAN = monsterNames.indexOf('PM_WATCHMAN');
const PM_WATCH_CAPTAIN = monsterNames.indexOf('PM_WATCH_CAPTAIN');
const PM_MIND_FLAYER = monsterNames.indexOf('PM_MIND_FLAYER');
const PM_MASTER_MIND_FLAYER = monsterNames.indexOf('PM_MASTER_MIND_FLAYER');

/** C ref: mondata.h is_watch — watchman or watch captain. */
export function is_watch(ptr) {
    const mndx = ptr?.mndx;
    return mndx === PM_WATCHMAN || mndx === PM_WATCH_CAPTAIN;
}

/** C ref: mondata.h is_mind_flayer */
export function is_mind_flayer(ptr) {
    const mndx = ptr?.mndx;
    return mndx === PM_MIND_FLAYER || mndx === PM_MASTER_MIND_FLAYER;
}

/** C ref: mondata.h noncorporeal */
export function noncorporeal(ptr) {
    return ptr?.mlet === 'S_GHOST';
}

/** C ref: mondata.h acidic / poisonous / carnivorous / herbivorous */
export function acidic(ptr) {
    return !!((ptr?.mflags1 ?? 0) & M1_ACID);
}
export function poisonous(ptr) {
    return !!((ptr?.mflags1 ?? 0) & M1_POIS);
}
export function carnivorous(ptr) {
    return !!((ptr?.mflags1 ?? 0) & M1_CARNIVORE);
}
export function herbivorous(ptr) {
    return !!((ptr?.mflags1 ?? 0) & M1_HERBIVORE);
}
/** C ref: mondata.h metallivorous */
export function metallivorous(ptr) {
    return !!((ptr?.mflags1 ?? 0) & M1_METALLIVORE);
}

/** C ref: mondata.h regenerates — M1_REGEN */
export function regenerates(ptr) {
    return !!((ptr?.mflags1 ?? 0) & M1_REGEN);
}

/** C ref: mondata.h can_teleport — M1_TPORT */
export function can_teleport(ptr) {
    return !!((ptr?.mflags1 ?? 0) & M1_TPORT);
}

/** C ref: mondata.h control_teleport — M1_TPORT_CNTRL */
export function control_teleport(ptr) {
    return !!((ptr?.mflags1 ?? 0) & M1_TPORT_CNTRL);
}

/**
 * C ref: mondata.h telepathic — floating eye / mind flayer / master.
 */
const PM_FLOATING_EYE = monsterNames.indexOf('PM_FLOATING_EYE');
export function telepathic(ptr) {
    const mndx = ptr?.mndx;
    return mndx === PM_FLOATING_EYE
        || mndx === PM_MIND_FLAYER
        || mndx === PM_MASTER_MIND_FLAYER;
}

/** C ref: mondata.h webmaker — cave/giant spider only (keep in sync with mons). */
const PM_CAVE_SPIDER = monsterNames.indexOf('PM_CAVE_SPIDER');
export function webmaker(ptr) {
    const mndx = ptr?.mndx;
    return mndx === PM_CAVE_SPIDER || mndx === PM_GIANT_SPIDER;
}

/**
 * C ref: mondata.h vegan / vegetarian — corpse/tin conduct + eatcorpse.
 */
export function vegan(ptr) {
    if (!ptr) return false;
    const mlet = ptr.mlet;
    if (mlet === 'S_BLOB' || mlet === 'S_JELLY' || mlet === 'S_FUNGUS'
        || mlet === 'S_VORTEX' || mlet === 'S_LIGHT') {
        return true;
    }
    if (mlet === 'S_ELEMENTAL' && ptr.mndx !== PM_STALKER) return true;
    if (mlet === 'S_GOLEM' && ptr.mndx !== PM_FLESH_GOLEM
        && ptr.mndx !== PM_LEATHER_GOLEM) {
        return true;
    }
    return noncorporeal(ptr);
}

export function vegetarian(ptr) {
    if (vegan(ptr)) return true;
    return ptr?.mlet === 'S_PUDDING' && ptr.mndx !== PM_BLACK_PUDDING;
}
