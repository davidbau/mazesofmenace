// mondata.js — the "what kind of creature is this" predicates.
// C ref: include/mondata.h (they are macros there) and src/mondata.c
//
// Every one is a pure read of a permonst. They were module-local consts in
// mon.js, which meant any other file needing one either imported mon.js (and
// risked a cycle) or kept its own copy. Neither is what the C does: mondata.h
// is a header everybody includes.
//
// Nothing here draws.

import { MFLAGS, MONSYMS, PMNAMES, ATTKS } from './monst_data.js';
import { game } from './gstate.js';
import { OCLASSES, ONAMES } from './objects_data.js';
import { MON_WEP } from './monst.js';
import { which_armor } from './worn.js';
import { W_ARM, FIRE_RES, COLD_RES, SLEEP_RES, DISINT_RES, SHOCK_RES,
         POISON_RES, ACID_RES, STONE_RES, ANTIMAGIC, DRAIN_RES,
         BLND_RES } from './const.js';

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

// include/mondata.h:63 unsolid()
export const unsolid = (ptr) => (ptr.mflags1 & MFLAGS.M1_UNSOLID) !== 0;

// include/mondata.h:147 webmaker() — only the two spiders.
export const webmaker = (ptr) => ptr.pmidx === PMNAMES.PM_CAVE_SPIDER
                              || ptr.pmidx === PMNAMES.PM_GIANT_SPIDER;

// include/mondata.h:109 is_domestic() — starts tame at 10 rather than 5.
export const is_domestic = (ptr) => (ptr.mflags2 & MFLAGS.M2_DOMESTIC) !== 0;

// include/mondata.h:81 perceives() — can this species see invisible?
export const perceives = (ptr) => (ptr.mflags1 & MFLAGS.M1_SEE_INVIS) !== 0;

// include/mondata.h is_animal()
export const is_animal = (ptr) => (ptr.mflags1 & MFLAGS.M1_ANIMAL) !== 0;

// include/mondata.h mindless()
export const mindless = (ptr) => (ptr.mflags1 & MFLAGS.M1_MINDLESS) !== 0;

// include/mondata.h:19,20,27 — placement predicates read by pm_to_humidity().
export const is_flyer   = (ptr) => (ptr.mflags1 & MFLAGS.M1_FLY) !== 0;
// include/mondata.h:22 is_clinger()
export const is_clinger = (ptr) => (ptr.mflags1 & MFLAGS.M1_CLING) !== 0;
export const is_floater = (ptr) => ptr.mlet === MONSYMS.S_EYE
                                || ptr.mlet === MONSYMS.S_LIGHT;
export const amphibious = (ptr) => (ptr.mflags1 & MFLAGS.M1_AMPHIBIOUS) !== 0;
export const is_swimmer = (ptr) => (ptr.mflags1 & MFLAGS.M1_SWIM) !== 0;

// include/mondata.h:196 likes_fire() — an explicit pair plus likes_lava, not a
// flag test; writing it from a flag would be the M1_FIRE_RES mistake again.
export const likes_fire = (ptr) => ptr.pmidx === PMNAMES.PM_FIRE_VORTEX
                                || ptr.pmidx === PMNAMES.PM_FLAMING_SPHERE
                                || likes_lava(ptr);

// include/mondata.h likes_lava()
export const likes_lava = (ptr) => ptr.pmidx === PMNAMES.PM_FIRE_ELEMENTAL
                                || ptr.pmidx === PMNAMES.PM_SALAMANDER;

// ---------------------------------------------------------------------------
// src/mondata.c — the resistance predicates.
//
// mfndpos()'s trap arm needs m_harmless_trap(), which needs these. None of
// them draws. What they all share is a walk over the monster's wielded weapon,
// worn armour and carried items; our monsters have no inventory yet, so those
// loops are empty rather than wrong, and the species-level tests -- which are
// the ones that actually fire during level generation and early play -- are
// exact.
// ---------------------------------------------------------------------------

// src/mondata.c:704 dmgtype_fromattack() — the monster's attack of this damage
// type, if it has one. atyp AT_ANY accepts any attack form.
export function dmgtype_fromattack(ptr, dtyp, atyp) {
    for (const a of (ptr.mattk || []))
        if (a[1] === dtyp && (atyp === ATTKS.AT_ANY || a[0] === atyp))
            return a;
    return null;
}

// src/mondata.c:712 dmgtype()
export function dmgtype(ptr, dtyp) {
    return dmgtype_fromattack(ptr, dtyp, ATTKS.AT_ANY) ? true : false;
}

// include/obj.h:348 Is_dragon_scales/Is_dragon_mail/Is_dragon_armor
const Is_dragon_scales = (obj) => obj.otyp >= ONAMES.GRAY_DRAGON_SCALES
                               && obj.otyp <= ONAMES.YELLOW_DRAGON_SCALES;
const Is_dragon_mail = (obj) => obj.otyp >= ONAMES.GRAY_DRAGON_SCALE_MAIL
                             && obj.otyp <= ONAMES.YELLOW_DRAGON_SCALE_MAIL;
const Is_dragon_armor = (obj) => Is_dragon_scales(obj) || Is_dragon_mail(obj);

// src/mondata.c:91 defended() — is `mon` protected against `adtyp` by an
// artifact it wields or by dragon scales it wears?
//
// The dragon case is the interesting one: an ADULT dragon is treated as if it
// were wearing its own scales, by building a throwaway armour object whose
// otyp is derived from the species. defends() and Is_dragon_armor() read only
// otyp, so the rest of the object is left unset exactly as C leaves it.
export function defended(mon, adtyp) {
    /* artifact weapons do not exist in this port yet, and C guards on
       o->oartifact before calling defends(), so that arm is unreachable
       rather than skipped. */
    let o = MON_WEP(mon);
    if (o && o.oartifact) {
        note_unported_mondata('defended:defends(artifact weapon)');
        return false;
    }

    const mndx = mon.data.pmidx;
    if (mndx >= PMNAMES.PM_GRAY_DRAGON && mndx <= PMNAMES.PM_YELLOW_DRAGON) {
        o = {
            oclass: OCLASSES.ARMOR_CLASS,
            otyp: ONAMES.GRAY_DRAGON_SCALES + (mndx - PMNAMES.PM_GRAY_DRAGON),
        };
    } else {
        o = which_armor(mon, W_ARM);
    }

    if (o && Is_dragon_armor(o)) {
        note_unported_mondata('defended:defends(dragon scales)');
        return false;
    }

    return false;
}

// src/mondata.c:129 Resists_Elem() — the shared body behind resists_fire(),
// resists_sleep() and the rest.
//
// propindx 1..8 map to a damage type (propindx + 1) and a resistance bit
// (1 << (propindx - 1)). The bit is tested against mon_resistancebits(), which
// ORs the species' innate resistances with the monster's acquired ones.
export function Resists_Elem(mon, propindx) {
    let rsstmask = 0;

    switch (propindx) {
    case FIRE_RES: case COLD_RES: case SLEEP_RES: case DISINT_RES:
    case SHOCK_RES: case POISON_RES: case ACID_RES: case STONE_RES:
        rsstmask = 1 << (propindx - 1);
        break;

    /* accepted, but callers are expected to use these directly */
    case ANTIMAGIC:
        return resists_magm(mon);
    case DRAIN_RES:
        note_unported_mondata('Resists_Elem:resists_drli');
        return false;
    case BLND_RES:
        note_unported_mondata('Resists_Elem:resists_blnd');
        return false;

    default:
        return false;                   /* impossible() */
    }

    if ((mon_resistancebits(mon) & rsstmask) !== 0)
        return true;

    /* the wielded-weapon and worn/carried loops need monster inventory */
    return false;
}

// include/monst.h:270 mon_resistancebits()
const mon_resistancebits = (mon) =>
    (mon.data.mresists | (mon.mextrinsics ?? 0) | (mon.mintrinsics ?? 0));

// src/mondata.c:215 resists_magm() — magic (missile) resistance.
export function resists_magm(mon) {
    const ptr = mon.data;

    /* gray dragons, Angels, Oracle, Yeenoghu; the Chromatic Dragon via AD_RBRE */
    if (dmgtype(ptr, ATTKS.AD_MAGM)
        || ptr.pmidx === PMNAMES.PM_BABY_GRAY_DRAGON
        || dmgtype(ptr, ATTKS.AD_RBRE))
        return true;

    /* the wielded-weapon and worn/carried loops need monster inventory */
    return false;
}

export const resists_fire   = (mon) => Resists_Elem(mon, FIRE_RES);
export const resists_cold   = (mon) => Resists_Elem(mon, COLD_RES);
export const resists_sleep  = (mon) => Resists_Elem(mon, SLEEP_RES);
export const resists_disint = (mon) => Resists_Elem(mon, DISINT_RES);
export const resists_elec   = (mon) => Resists_Elem(mon, SHOCK_RES);
export const resists_poison = (mon) => Resists_Elem(mon, POISON_RES);
export const resists_acid   = (mon) => Resists_Elem(mon, ACID_RES);
export const resists_ston   = (mon) => Resists_Elem(mon, STONE_RES);

function note_unported_mondata(what) {
    (game.unported ||= new Set()).add(what);
}
