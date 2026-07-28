// mondata.js — the "what kind of creature is this" predicates.
// C ref: include/mondata.h (they are macros there) and src/mondata.c
//
// Every one is a pure read of a permonst. They were module-local consts in
// mon.js, which meant any other file needing one either imported mon.js (and
// risked a cycle) or kept its own copy. Neither is what the C does: mondata.h
// is a header everybody includes.
//
// Almost nothing here draws: the predicates are pure reads of a permonst. The
// exception is pronoun_gender() at the bottom, which rolls rn2(4) when the
// hero is hallucinating.

import { PMNAMES, MONSYMS, MFLAGS, ATTKS } from './monst_data.js';
import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { Hallucination } from './youprop.js';
import { canspotmon } from './display.js';
import { G_UNIQ, PRONOUN_NO_IT, PRONOUN_HALLU } from './const.js';
import { OCLASSES, ONAMES } from './objects_data.js';
import { is_vampshifter } from './monst.js';
import { NATTK } from './const.js';
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
// include/mondata.h:114 is_neuter() — was defined in js/makemon.js, which is
// not its C home; js/role.js still carries a third private copy.
export const is_neuter  = (ptr) => (ptr.mflags2 & MFLAGS.M2_NEUTER) !== 0;
// include/mondata.h:135 type_is_pname() — was private to js/questpgr.js.
export const type_is_pname = (ptr) => (ptr.mflags2 & MFLAGS.M2_PNAME) !== 0;
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

// include/mondata.h:35 hides_under() — conceals itself UNDER an object, as
// distinct from a ceiling hider. domove_attackmon_at leans on that
// distinction: a hides_under monster you cannot see still routes into
// do_attack so the "Wait!" message prints, while a ceiling hider does not.
export const hides_under = (ptr) => (ptr.mflags1 & MFLAGS.M1_CONCEAL) !== 0;

// include/mondata.h:43 ceiling_hider() — hides on the ceiling rather than
// under something. A mimic is is_clinger but is explicitly excluded, because
// it clings to imitate furniture rather than to hang overhead.
export const ceiling_hider = (ptr) =>
    is_hider(ptr) && ((is_clinger(ptr) && ptr.mlet !== MONSYMS.S_MIMIC)
                      || is_flyer(ptr)); /* lurker above */

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
/* include/monst.h:270. This read mon.data.mresists, but our monsters carry
   mnum indexing game.mons rather than a data pointer, so every resists_*
   built on it was reading undefined. */
export const mon_resistancebits = (mon) =>
    ((game.mons[mon.mnum]?.mresists ?? 0)
     | (mon.mextrinsics ?? 0) | (mon.mintrinsics ?? 0));

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

/* needspick, mindless and is_animal already live above in this file. */

// include/mondata.h:95 is_undead()
export const is_undead   = (d) => (d.mflags2 & MFLAGS.M2_UNDEAD) !== 0;
// include/mondata.h:218 weirdnonliving() — golems and vortices
export const weirdnonliving = (d) =>
    d.mlet === MONSYMS.S_GOLEM || d.mlet === MONSYMS.S_VORTEX;
// include/mondata.h:219 nonliving()
export const nonliving = (d) =>
    is_undead(d) || d.pmidx === PMNAMES.PM_MANES || weirdnonliving(d);

// src/mondata.c:41 attacktype_fordmg() — the monster's attack of a given type,
// or null. AD_ANY matches any damage type.
export function attacktype_fordmg(ptr, atyp, dtyp) {
    for (let i = 0; i < NATTK; i++) {
        const a = ptr.mattk[i];
        if (!a)
            continue;
        if (a[0] === atyp && (dtyp === ATTKS.AD_ANY || a[1] === dtyp))
            return a;
    }
    return null;
}

// src/mondata.c:54 attacktype() — does this monster type have such an attack?
export function attacktype(ptr, atyp) {
    return attacktype_fordmg(ptr, atyp, ATTKS.AD_ANY) !== null;
}

// include/mondata.h:26 breathless()
export const breathless = (d) => (d.mflags1 & MFLAGS.M1_BREATHLESS) !== 0;
// include/mondata.h:55 has_head() — note the sense: NOHEAD CLEAR means it has one
export const has_head   = (d) => (d.mflags1 & MFLAGS.M1_NOHEAD) === 0;
// include/mondata.h:62 is_silent()
export const is_silent  = (d) => d.msound === MFLAGS.MS_SILENT;

// src/mondata.c:567 can_blow() — can this monster blow a horn?
//
// The hero's Strangled arm is not modelled; it only applies to youmonst and a
// monster is never that here.
export function can_blow(mtmp) {
    const d = game.mons[mtmp.mnum];

    if ((is_silent(d) || d.msound === MFLAGS.MS_BUZZ)
        && (breathless(d) || verysmall(d) || !has_head(d)
            || d.mlet === MONSYMS.S_EEL))
        return false;
    return true;
}

// include/mondata.h:59 flaming() — an identity test against four specific
// permonst entries, not a flag test.
export const flaming = (d) =>
    d.pmidx === PMNAMES.PM_FIRE_VORTEX || d.pmidx === PMNAMES.PM_FLAMING_SPHERE
    || d.pmidx === PMNAMES.PM_FIRE_ELEMENTAL || d.pmidx === PMNAMES.PM_SALAMANDER;

// include/mondata.h:38 is_hider(). C's own comment warns it is True for mimics
// even though a hiding mimic uses M_AP_* rather than mundetected, so callers
// pair it with a mundetected test.
export const is_hider = (d) => (d.mflags1 & MFLAGS.M1_HIDE) !== 0;

// include/mondata.h:100 is_orc()
export const is_orc = (d) => (d.mflags2 & MFLAGS.M2_ORC) !== 0;

// include/mondata.h is_demon()
export const is_demon = (d) => (d.mflags2 & MFLAGS.M2_DEMON) !== 0;

// include/mondata.h:69 thick_skinned()
export const thick_skinned = (d) => (d.mflags1 & MFLAGS.M1_THICK_HIDE) !== 0;

// src/mondata.c:540 hates_blessings()
export const hates_blessings = (d) => is_undead(d) || is_demon(d);

// src/mondata.c:533 mon_hates_blessings() — takes a MONSTER, not a permonst,
// because a vampshifter hates blessings in whatever shape it is wearing.
export function mon_hates_blessings(mon) {
    return is_vampshifter(mon) || hates_blessings(game.mons[mon.mnum]);
}

// include/mondata.h:90 carnivorous()
export const carnivorous = (ptr) => (ptr.mflags1 & MFLAGS.M1_CARNIVORE) !== 0;

// include/mondata.h:91 herbivorous()
export const herbivorous = (ptr) => (ptr.mflags1 & MFLAGS.M1_HERBIVORE) !== 0;

// src/mondata.c:1180 gender() — 0 male, 1 female, 2 none.
// Unlike pronoun_gender below, this one does not care whether the hero can
// see the monster, and it never draws.
export function gender(mtmp) {
    if (is_neuter(mtmp.data))
        return 2;
    return mtmp.female | 0;
}

// src/mondata.c:1191 pronoun_gender() — like gender(), but unseen humanoids
// are "it" rather than "he"/"she", lower animals are "it" even when seen, and
// hallucination can yield "they". This is the one messages use.
//
// The rn2(4) is the reason this is not a pure predicate. It fires ONLY under
// PRONOUN_HALLU and only while hallucinating, so it draws nothing today, but
// the order matters: the hallucination roll happens BEFORE the canspotmon
// test, so a hallucinating hero draws even for a monster they cannot see.
//
// Returns 0 male, 1 female, 2 neuter/unseen, 3 "they" (hallucination only).
export function pronoun_gender(mtmp, pg_flags) {
    const override_vis = (pg_flags & PRONOUN_NO_IT) !== 0;
    const hallu_rand = (pg_flags & PRONOUN_HALLU) !== 0;

    if (hallu_rand && Hallucination())
        return rn2(4); /* 0..3 */
    if (!override_vis && !canspotmon(mtmp))
        return 2;
    if (is_neuter(mtmp.data))
        return 2;
    return (humanoid(mtmp.data) || (mtmp.data.geno & G_UNIQ)
            || type_is_pname(mtmp.data)) ? (mtmp.female | 0) : 2;
}

// include/mondata.h:123 cantwield()
export const cantwield = (ptr) => nohands(ptr) || verysmall(ptr);

// include/mondata.h:223 — golems that leave nothing behind for the listed
// damage type.
export const completelyburns = (ptr) =>
    ptr === game.mons[PMNAMES.PM_PAPER_GOLEM]
    || ptr === game.mons[PMNAMES.PM_STRAW_GOLEM];
export const completelyrots = (ptr) =>
    ptr === game.mons[PMNAMES.PM_WOOD_GOLEM]
    || ptr === game.mons[PMNAMES.PM_LEATHER_GOLEM];
export const completelyrusts = (ptr) =>
    ptr === game.mons[PMNAMES.PM_IRON_GOLEM];

// src/mondata.c:720 max_passive_dmg() — the worst a defender's passive
// counterattack could do, times the attacker's number of striking attacks.
// dog_move reads it to decide whether attacking might be suicide. No draws.
export function max_passive_dmg(mdef, magr) {
    const A = ATTKS;
    let multi2 = 0;
    const magrAtk = game.mons[magr.mnum].mattk;
    const mdefData = game.mons[mdef.mnum];

    for (let i = 0; i < 6; i++) {
        switch (magrAtk[i][0]) {
        case A.AT_CLAW: case A.AT_BITE: case A.AT_KICK: case A.AT_BUTT:
        case A.AT_TUCH: case A.AT_STNG: case A.AT_HUGS: case A.AT_ENGL:
        case A.AT_TENT: case A.AT_WEAP:
            multi2++;
            break;
        default:
            break;
        }
    }

    let dmg = 0;
    for (let i = 0; i < 6; i++) {
        const [aatyp, adtyp, damn, damd] = mdefData.mattk[i];
        if (aatyp === A.AT_NONE || aatyp === A.AT_BOOM) {
            if ((adtyp === A.AD_FIRE && completelyburns(game.mons[magr.mnum]))
                || (adtyp === A.AD_DCAY && completelyrots(game.mons[magr.mnum]))
                || (adtyp === A.AD_RUST && completelyrusts(game.mons[magr.mnum]))) {
                dmg = magr.mhp;
            } else if ((adtyp === A.AD_ACID && !resists_acid(magr))
                       || (adtyp === A.AD_COLD && !resists_cold(magr))
                       || (adtyp === A.AD_FIRE && !resists_fire(magr))
                       || (adtyp === A.AD_ELEC && !resists_elec(magr))
                       || adtyp === A.AD_PHYS) {
                dmg = damn;
                if (!dmg)
                    dmg = mdefData.mlevel + 1;
                dmg *= damd;
            }
            dmg *= multi2;
            break;
        }
    }
    return dmg;
}

// src/mondata.c:654 sticks() — grabs and holds its victim.
export const sticks = (ptr) =>
    (dmgtype(ptr, ATTKS.AD_STCK)
     || (dmgtype(ptr, ATTKS.AD_WRAP) && !attacktype(ptr, ATTKS.AT_ENGL))
     || attacktype(ptr, ATTKS.AT_HUGS));

// include/mondata.h:232 vegan() / :239 vegetarian() — conduct tests used for
// corpses, tins and digestion.
export const vegan = (ptr) =>
    ptr.mlet === MONSYMS.S_BLOB || ptr.mlet === MONSYMS.S_JELLY
    || ptr.mlet === MONSYMS.S_FUNGUS || ptr.mlet === MONSYMS.S_VORTEX
    || ptr.mlet === MONSYMS.S_LIGHT
    || (ptr.mlet === MONSYMS.S_ELEMENTAL
        && ptr !== game.mons[PMNAMES.PM_STALKER])
    || (ptr.mlet === MONSYMS.S_GOLEM
        && ptr !== game.mons[PMNAMES.PM_FLESH_GOLEM]
        && ptr !== game.mons[PMNAMES.PM_LEATHER_GOLEM])
    || noncorporeal(ptr);

export const vegetarian = (ptr) =>
    vegan(ptr)
    || (ptr.mlet === MONSYMS.S_PUDDING
        && ptr !== game.mons[PMNAMES.PM_BLACK_PUDDING]);
