// mondata.js — monster-type predicates.
// C ref: include/mondata.h (macros), src/mondata.c (functions).
//
// Only what the ported code needs so far. Each macro takes a permonst
// entry (an element of mons[]), like the C macros take a permonst pointer.

import * as M from './monsters.js';
import { game } from './gstate.js';
import { ROLL_FROM } from './rng.js';
import { M_SEEN_NOTHING, M_SEEN_MAGR, M_SEEN_FIRE, M_SEEN_COLD,
         M_SEEN_SLEEP, M_SEEN_DISINT, M_SEEN_ELEC, M_SEEN_POISON,
         M_SEEN_ACID } from './const.js';
import { strncmpi, strcmpi, strstri } from './hacklib.js';
import { NON_PM, MALE, FEMALE, NEUTRAL, NUM_MGENDERS,
         FIRE_RES, COLD_RES, SLEEP_RES, DISINT_RES, SHOCK_RES, POISON_RES,
         ACID_RES, STONE_RES, DRAIN_RES, ANTIMAGIC, BLND_RES, ALL_TRAPS,
         NO_TRAP, W_ARMOR, W_ACCESSORY, W_WEP, W_SWAPWEP, W_ARMC, W_ARM,
         W_ARMH, BLINDED, G_GENOD, INTRINSIC,
       } from './const.js';
import { objects, ALCHEMY_SMOCK, WEAPON_CLASS, GRAY_DRAGON_SCALES,
         YELLOW_DRAGON_SCALES, GRAY_DRAGON_SCALE_MAIL,
         YELLOW_DRAGON_SCALE_MAIL, LENSES, CREAM_PIE, BLINDING_VENOM,
         POT_BLINDNESS, ARMOR_CLASS } from "./objects.js";
import { objdescr_is } from './o_init.js';
import { defends } from './artifact.js';
import { Unaware } from './eat.js';
import { is_weptool } from './mkobj.js';
import { which_armor } from './worn.js';
import { title_to_mon } from './botl.js';
import { clear_path } from './vision.js';
import {
    mons, NATTK, AT_ANY, AD_ANY, AD_DRLI, M1_FLY, M1_SWIM, M1_WALLWALK, M1_NOEYES,
    M1_REGEN, M1_SEE_INVIS, M1_TPORT, M1_TPORT_CNTRL, M2_UNDEAD, M2_WERE,
    M2_ELF, M2_DWARF, M2_GNOME, M2_ORC, M2_HUMAN, M2_DEMON, M2_MALE,
    M2_FEMALE, M2_NEUTER, M3_INFRAVISION, S_EYE, S_LIGHT, S_VAMPIRE,
    PM_FLOATING_EYE, PM_MIND_FLAYER, PM_MASTER_MIND_FLAYER, PM_BAT,
    PM_GIANT_BAT, PM_VAMPIRE_BAT, PM_STALKER, PM_BLACK_LIGHT, PM_DEATH,
    PM_VAMPIRE, PM_VAMPIRE_LEADER, PM_VLAD_THE_IMPALER, PM_GRAY_DRAGON,
    PM_YELLOW_DRAGON, LOW_PM, AD_MAGM, AD_RBRE,
} from './monsters.js';

// C ref: mondata.h monsndx(ptr) -- ((ptr)->pmidx)
export function monsndx(ptr) { return ptr.pmidx; }

// C ref: mondata.h is_flyer()
export function is_flyer(ptr) { return (ptr.mflags1 & M1_FLY) !== 0; }
// C ref: mondata.h is_floater()
export function is_floater(ptr) { return ptr.mlet === S_EYE || ptr.mlet === S_LIGHT; }
// C ref: mondata.h is_swimmer()
export function is_swimmer(ptr) { return (ptr.mflags1 & M1_SWIM) !== 0; }
// C ref: mondata.h passes_walls()
export function passes_walls(ptr) { return (ptr.mflags1 & M1_WALLWALK) !== 0; }
// C ref: mondata.h haseyes()
export function haseyes(ptr) { return (ptr.mflags1 & M1_NOEYES) === 0; }

// C ref: mondata.c resists_blnd()
/* TRUE if monster is resistant to light-induced blindness */
export function resists_blnd(mon) {
    const g = game, u = g.u;
    const ptr = mon.data;
    const is_you = (mon === g.youmonst);

    if (is_you ? (uBlind() || Unaware())
               : (mon.mblinded || !mon.mcansee || !haseyes(ptr)
                  /* BUG: temporary sleep sets mfrozen, but since
                          paralysis does too, we can't check it */
                  || mon.msleeping))
        return true;
    /* yellow light, Archon; !dust vortex, !cobra, !raven */
    if (dmgtype_fromattack(ptr, M.AD_BLND, M.AT_EXPL)
        || dmgtype_fromattack(ptr, M.AD_BLND, M.AT_GAZE))
        return true;
    /* Sunsword */
    if (resists_blnd_by_arti(mon))
        return true;
    /* catchall */
    if (is_you && (u.uprops[BLND_RES].intrinsic || u.uprops[BLND_RES].extrinsic)) {
        /* impossible("'Blnd_resist' but not resists_blnd()?") */
        return true;
    }
    return false;
}
/* C ref: youprop.h Blind */
function uBlind() {
    const p = game.u.uprops[BLINDED];
    return !!((p.intrinsic || p.extrinsic) && !p.blocked);
}

// C ref: mondata.c resists_blnd_by_arti()
/* True iff monster is resistant to light-induced blindness due to worn
   or wielded magical equipment */
export function resists_blnd_by_arti(mon) {
    const g = game;
    const is_you = (mon === g.youmonst);

    let o = is_you ? g.uwep : mon.mw;
    if (o && o.oartifact)
        throw new Error('resists_blnd_by_arti(): defends() not ported yet');
    for (o of invent_chain(mon, is_you))
        if (o.oartifact) /* defends_when_carried(AD_BLND, o) */
            throw new Error('resists_blnd_by_arti(): defends_when_carried() not ported yet');
    return false;
}

// C ref: mondata.c can_blnd()
/* returns True if monster can be blinded by the given attack */
export function can_blnd(
    magr, /* NULL == no specific aggressor */
    mdef,
    aatyp,
    obj) { /* aatyp == AT_WEAP, AT_SPIT */
    const g = game, u = g.u;
    const is_you = (mdef === g.youmonst);
    let check_visor = false;
    const ublindf = g.ublindf || null;
    const Blindfolded = !!(ublindf && ublindf.otyp !== LENSES);

    /* no eyes protect against all attacks for now */
    if (!haseyes(mdef.data))
        return false;

    /* if monster has been permanently blinded, the deed is already done */
    if (!is_you && !mdef.mcansee && !mdef.mblinded) /* mon_perma_blind() */
        return false;

    /* /corvus oculum corvi non eruit/ */
    if (magr && magr.data === mons[M.PM_RAVEN] && mdef.data === mons[M.PM_RAVEN])
        return false;

    switch (aatyp) {
    case M.AT_EXPL:
    case M.AT_BOOM:
    case M.AT_GAZE:
    case M.AT_MAGC:
    case M.AT_BREA: /* assumed to be lightning */
        /* light-based attacks may be cancelled or resisted */
        if (magr && magr.mcan)
            return false;
        return !resists_blnd(mdef);

    case M.AT_WEAP:
    case M.AT_SPIT:
    case M.AT_NONE:
        /* an object is used (thrown/spit/other) */
        if (obj && (obj.otyp === CREAM_PIE)) {
            if (is_you && Blindfolded)
                return false;
        } else if (obj && (obj.otyp === BLINDING_VENOM)) {
            /* all ublindf, including LENSES, protect, cream-pies too */
            if (is_you && (ublindf || u.ucreamed))
                return false;
            check_visor = true;
        } else if (obj && (obj.otyp === POT_BLINDNESS)) {
            return true; /* no defense */
        } else
            return false; /* other objects cannot cause blindness yet */
        if ((magr === g.youmonst) && u.uswallow)
            return false; /* can't affect eyes while inside monster */
        break;

    case M.AT_ENGL:
        if (is_you && (Blindfolded || Unaware() || u.ucreamed))
            return false;
        if (!is_you && mdef.msleeping)
            return false;
        break;

    case M.AT_CLAW:
        /* e.g. raven: all ublindf, including LENSES, protect */
        if (is_you && ublindf)
            return false;
        if ((magr === g.youmonst) && u.uswallow)
            return false; /* can't affect eyes while inside monster */
        check_visor = true;
        break;

    case M.AT_TUCH:
    case M.AT_STNG:
        /* some physical, blind-inducing attacks can be cancelled */
        if (magr && magr.mcan)
            return false;
        break;

    default:
        break;
    }

    /* check if wearing a visor (only checked if visor might help) */
    if (check_visor) {
        const chain = is_you ? (() => {
            const out = [];
            for (let o = g.invent; o; o = o.nobj) out.push(o);
            return out;
        })() : (mdef.minvent || []).slice().reverse();
        for (const o of chain)
            if ((o.owornmask & W_ARMH) && objdescr_is(o, "visored helmet"))
                return false;
    }

    return true;
}
// C ref: mondata.h regenerates()
export function regenerates(ptr) { return (ptr.mflags1 & M1_REGEN) !== 0; }
// C ref: mondata.h perceives()
export function perceives(ptr) { return (ptr.mflags1 & M1_SEE_INVIS) !== 0; }
// C ref: mondata.h can_teleport()
export function can_teleport(ptr) { return (ptr.mflags1 & M1_TPORT) !== 0; }
// C ref: mondata.h control_teleport()
export function control_teleport(ptr) { return (ptr.mflags1 & M1_TPORT_CNTRL) !== 0; }
// C ref: mondata.h telepathic()
export function telepathic(ptr) {
    return ptr === mons[PM_FLOATING_EYE] || ptr === mons[PM_MIND_FLAYER]
        || ptr === mons[PM_MASTER_MIND_FLAYER];
}
// C ref: mondata.h is_undead()
export function is_undead(ptr) { return (ptr.mflags2 & M2_UNDEAD) !== 0; }
// C ref: mondata.h is_were()
export function is_were(ptr) { return (ptr.mflags2 & M2_WERE) !== 0; }
// C ref: mondata.h is_elf()
export function is_elf(ptr) { return (ptr.mflags2 & M2_ELF) !== 0; }
// C ref: mondata.h is_dwarf()
export function is_dwarf(ptr) { return (ptr.mflags2 & M2_DWARF) !== 0; }
// C ref: mondata.h is_gnome()
export function is_gnome(ptr) { return (ptr.mflags2 & M2_GNOME) !== 0; }
// C ref: mondata.h is_orc()
export function is_orc(ptr) { return (ptr.mflags2 & M2_ORC) !== 0; }
// C ref: mondata.h is_human()
export function is_human(ptr) { return (ptr.mflags2 & M2_HUMAN) !== 0; }
// C ref: mondata.h your_race()
export function your_race(ptr) { return (ptr.mflags2 & game.urace.selfmask) !== 0; }
// C ref: mondata.h is_bat()
export function is_bat(ptr) {
    return ptr === mons[PM_BAT] || ptr === mons[PM_GIANT_BAT]
        || ptr === mons[PM_VAMPIRE_BAT];
}
// C ref: mondata.h is_demon()
export function is_demon(ptr) { return (ptr.mflags2 & M2_DEMON) !== 0; }
// C ref: mondata.h is_male()
export function is_male(ptr) { return (ptr.mflags2 & M2_MALE) !== 0; }
// C ref: mondata.h is_female()
export function is_female(ptr) { return (ptr.mflags2 & M2_FEMALE) !== 0; }
// C ref: mondata.h is_neuter()
export function is_neuter(ptr) { return (ptr.mflags2 & M2_NEUTER) !== 0; }
// C ref: mondata.h infravision()
export function infravision(ptr) { return (ptr.mflags3 & M3_INFRAVISION); }
// C ref: mondata.h pm_invisible()
export function pm_invisible(ptr) {
    return ptr === mons[PM_STALKER] || ptr === mons[PM_BLACK_LIGHT];
}
// C ref: mondata.h is_vampire()
export function is_vampire(ptr) { return ptr.mlet === S_VAMPIRE; }

// C ref: monst.h is_vampshifter(mon)
export function is_vampshifter(mon) {
    return mon.cham === PM_VAMPIRE || mon.cham === PM_VAMPIRE_LEADER
        || mon.cham === PM_VLAD_THE_IMPALER;
}

// C ref: mondata.c mon_hates_silver()
/* True if specific monster is especially affected by silver weapons */
export function mon_hates_silver(mon) {
    return (is_vampshifter(mon) || hates_silver(mon.data));
}

// C ref: mondata.c hates_silver()
/* True if monster-type is especially affected by silver weapons */
export function hates_silver(ptr) {
    return (is_were(ptr) || ptr.mlet === M.S_VAMPIRE || is_demon(ptr)
            || ptr === M.mons[M.PM_SHADE]
            || (ptr.mlet === M.S_IMP && ptr !== M.mons[M.PM_TENGU]));
}

// C ref: mondata.c mon_hates_blessings()
/* True if specific monster is especially affected by blessed objects */
export function mon_hates_blessings(mon) {
    return (is_vampshifter(mon) || hates_blessings(mon.data));
}

// C ref: mondata.c hates_blessings()
/* True if monster-type is especially affected by blessed objects */
export function hates_blessings(ptr) {
    return (is_undead(ptr) || is_demon(ptr));
}

// C ref: mondata.c set_mon_data()
export function set_mon_data(mon, ptr) {
    const g = game;
    const old_speed = mon.data ? mon.data.mmove : 0;
    const is_you = (mon === g.youmonst);
    const movement = is_you ? (g.u.umovement || 0) : (mon.movement || 0);
    let newmove = movement;

    mon.data = ptr;
    mon.mnum = monsndx(ptr);

    if (movement) { /* used to adjust poly'd hero as well as monsters */
        const new_speed = ptr.mmove;
        /* prorate unused movement if new form is slower so that
           it doesn't get extra moves leftover from previous form;
           if new form is faster, leave unused movement as is */
        if (new_speed < old_speed) {
            newmove *= new_speed;
            if (old_speed > 0) /* old > new and new >= 0, so always True */
                newmove = Math.trunc(newmove / old_speed);
        }
        if (is_you) g.u.umovement = newmove;
        else mon.movement = newmove;
    }
    return;
}

/* C ref: obj.h Is_dragon_scales(), Is_dragon_mail(), Is_dragon_armor() */
function Is_dragon_armor(obj) {
    return (obj.otyp >= GRAY_DRAGON_SCALES && obj.otyp <= YELLOW_DRAGON_SCALES)
        || (obj.otyp >= GRAY_DRAGON_SCALE_MAIL
            && obj.otyp <= YELLOW_DRAGON_SCALE_MAIL);
}

// C ref: mondata.c defended()
/* is 'mon' (possibly youmonst) protected against damage type 'adtype' via
   wielded weapon or worn dragon scales? [or by virtue of being a dragon?] */
export function defended(mon, adtyp) {
    const g = game;
    const is_you = (mon === g.youmonst);

    /* is 'mon' wielding an artifact that protects against 'adtyp'? */
    let o = is_you ? g.uwep : mon.mw;
    if (o && o.oartifact && defends(adtyp, o))
        return true;

    /* if 'mon' is an adult dragon, treat it as if it was wearing scales
       so that it has the same benefit as a hero wearing dragon scales */
    const mndx = monsndx(mon.data);
    if (mndx >= PM_GRAY_DRAGON && mndx <= PM_YELLOW_DRAGON) {
        /* a dragon is its own suit...  if mon is poly'd hero, we don't
           care about embedded scales (uskin) because being a dragon with
           embedded scales is no better than just being a dragon */
        /* otemp = zeroobj; defends() and Is_dragon_armor() only care
           about otyp so ignore the rest of otemp's fields */
        o = { oclass: ARMOR_CLASS, otyp: GRAY_DRAGON_SCALES + (mndx - PM_GRAY_DRAGON),
              oartifact: 0 };
    } else {
        /* ordinary case: not an adult dragon */
        o = is_you ? g.uarm : which_armor(mon, W_ARM);
    }
    /* is 'mon' wearing dragon scales that protect against 'adtyp'? */
    if (o && Is_dragon_armor(o) && defends(adtyp, o))
        return true;

    return false;
}

// C ref: mondata.c poly_when_stoned()
export function poly_when_stoned(ptr) {
    /* non-stone golems turn into stone golems unless latter is genocided */
    return (ptr.mlet === M.S_GOLEM /* is_golem(ptr) */
            && ptr !== M.mons[M.PM_STONE_GOLEM]
            && !((game.mvitals?.[M.PM_STONE_GOLEM]?.mvflags || 0) & G_GENOD));
    /* allow G_EXTINCT */
}

// C ref: monst.h mon_resistancebits()
function mon_resistancebits(mon) {
    return (mon.data.mresists | (mon.mextrinsics ?? 0)
            | (mon.mintrinsics ?? 0));
}

// C ref: mondata.c Resists_Elem()
/* returns True if monster resists the given element (property index) */
export function Resists_Elem(mon, propindx) {
    const g = game, u = g.u;
    const is_you = (mon === g.youmonst);
    let u_resist = 0, damgtype = 0, rsstmask = 0;

    switch (propindx) {
    case FIRE_RES:   /* 1 */
    case COLD_RES:   /* 2 */
    case SLEEP_RES:  /* 3 */
    case DISINT_RES: /* 4 */
    case SHOCK_RES:  /* 5 */
    case POISON_RES: /* 6 */
    case ACID_RES:   /* 7 */
    case STONE_RES:  /* 8 */
        damgtype = propindx + 1; /* valid for propindx 1..8, damgtype 2..9 */
        rsstmask = 1 << (propindx - 1); /* valid for propindx 1..8 */
        u_resist = u.uprops[propindx].intrinsic
                   || u.uprops[propindx].extrinsic;
        break;

    /* accept these, but we expect callers to use their routines directly */
    case ANTIMAGIC:
        return resists_magm(mon);
    case DRAIN_RES:
        return resists_drli(mon);
    case BLND_RES:
        return resists_blnd(mon);

    default:
        /* impossible("Resists_Elem(%d), unexpected property type") */
        return false;
    }

    if (is_you ? u_resist : ((mon_resistancebits(mon) & rsstmask) !== 0))
        return true;
    /* check for resistance granted by wielded weapon */
    let o = is_you ? g.uwep : mon.mw;
    if (o && o.oartifact)
        throw new Error('Resists_Elem(): artifact defends() not ported yet');
    /* check for resistance granted by worn or carried items */
    let slotmask = W_ARMOR | W_ACCESSORY;
    if (!is_you /* assumes monsters don't wield non-weapons */
        || (g.uwep && (g.uwep.oclass === WEAPON_CLASS || is_weptool(g.uwep))))
        slotmask |= W_WEP;
    if (is_you && u.twoweap)
        slotmask |= W_SWAPWEP;
    for (o of invent_chain(mon, is_you))
        if (((o.owornmask & slotmask) !== 0
             && objects[o.otyp].oc_oprop === propindx)
            || ((o.owornmask & W_ARMC) === W_ARMC
                /* worn apron confers a pair of resistances but
                   objects[ALCHEMY_SMOCK].oc_oprop can only represent one;
                   we check both so won't need to know which one that is */
                && o.otyp === ALCHEMY_SMOCK
                && (propindx === POISON_RES || propindx === ACID_RES)))
            return true;
        else if (o.oartifact)
            throw new Error('Resists_Elem(): defends_when_carried() not ported yet');
    return false;
}
/* C ref: monst.h resists_fire()/resists_sleep() */
export function resists_fire(mon) { return Resists_Elem(mon, FIRE_RES); }
export function resists_sleep(mon) { return Resists_Elem(mon, SLEEP_RES); }
export function resists_poison(mon) { return Resists_Elem(mon, POISON_RES); }
export function resists_cold(mon) { return Resists_Elem(mon, COLD_RES); }
export function resists_elec(mon) { return Resists_Elem(mon, SHOCK_RES); }
export function resists_acid(mon) { return Resists_Elem(mon, ACID_RES); }
export function resists_disint(mon) { return Resists_Elem(mon, DISINT_RES); }

/* hero inventory is a nobj chain; monster minvent is an array in pickup
   order (C prepends, so walk it newest first) */
function invent_chain(mon, is_you) {
    if (is_you) {
        const out = [];
        for (let o = game.invent; o; o = o.nobj) out.push(o);
        return out;
    }
    return (mon.minvent || []).slice().reverse();
}

// C ref: mondata.c resists_magm()
/* TRUE if monster is magic-missile (actually, general magic) resistant */
export function resists_magm(mon) {
    const ptr = mon.data;
    const g = game, u = g.u;
    const is_you = (mon === g.youmonst);

    /* as of 3.2.0:  gray dragons, Angels, Oracle, Yeenoghu */
    if (dmgtype(ptr, AD_MAGM) || ptr === mons[M.PM_BABY_GRAY_DRAGON]
        || dmgtype(ptr, AD_RBRE)) /* Chromatic Dragon */
        return true;
    /* check for magic resistance granted by wielded weapon */
    let o = is_you ? g.uwep : mon.mw;
    if (o && o.oartifact)
        throw new Error('resists_magm(): artifact defends() not ported yet');
    /* check for magic resistance granted by worn or carried items */
    let slotmask = W_ARMOR | W_ACCESSORY;
    if (!is_you /* assumes monsters don't wield non-weapons */
        || (g.uwep && (g.uwep.oclass === WEAPON_CLASS || is_weptool(g.uwep))))
        slotmask |= W_WEP;
    if (is_you && u.twoweap)
        slotmask |= W_SWAPWEP;
    for (o of invent_chain(mon, is_you))
        if ((o.owornmask & slotmask) !== 0
            && objects[o.otyp].oc_oprop === ANTIMAGIC)
            return true;
        else if (o.oartifact)
            throw new Error('resists_magm(): defends_when_carried() not ported yet');
    return false;
}

// C ref: mondata.c mon_knows_traps()
/* does monster mtmp know traps of type ttyp */
export function mon_knows_traps(mtmp, ttyp) {
    if (ttyp === ALL_TRAPS)
        return !!mtmp.mtrapseen;
    else if (ttyp === NO_TRAP)
        return !mtmp.mtrapseen;
    else
        return ((mtmp.mtrapseen & (1 << (ttyp - 1))) !== 0);
}

// C ref: mondata.c mon_learns_traps()
/* monster mtmp learns all traps of type ttyp */
export function mon_learns_traps(mtmp, ttyp) {
    if (ttyp === ALL_TRAPS)
        mtmp.mtrapseen = ~0;
    else if (ttyp === NO_TRAP)
        mtmp.mtrapseen = 0;
    else
        mtmp.mtrapseen |= (1 << (ttyp - 1));
}

// C ref: mondata.c mons_see_trap()
/* monsters see a trap trigger, and remember it */
export function mons_see_trap(ttmp) {
    const tx = ttmp.tx, ty = ttmp.ty;
    const maxdist = game.level.at(tx, ty).lit ? 7 * 7 : 2;

    for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
        if ((mtmp.data.mflags1 & M.M1_ANIMAL) /* is_animal */
            || (mtmp.data.mflags1 & M.M1_MINDLESS) /* mindless */
            || !haseyes(mtmp.data) || !mtmp.mcansee)
            continue;
        const dx = mtmp.mx - tx, dy = mtmp.my - ty;
        if (dx * dx + dy * dy > maxdist)
            continue;
        if (!clear_path(mtmp.mx, mtmp.my, tx, ty)) /* m_cansee() */
            continue;
        mon_learns_traps(mtmp, ttmp.ttyp);
    }
}

// C ref: mondata.c resists_drli()
export function resists_drli(mon) {
    const ptr = mon.data;

    if (is_undead(ptr) || is_demon(ptr) || is_were(ptr)
        /* is_were() doesn't handle hero in human form */
        || (mon === game.youmonst && game.u.ulycn >= LOW_PM)
        || ptr === mons[PM_DEATH] || is_vampshifter(mon))
        return true;
    return defended(mon, AD_DRLI);
}

// C ref: mondata.c dmgtype_fromattack()
export function dmgtype_fromattack(ptr, dtyp, atyp) {
    for (let i = 0; i < NATTK; i++) {
        const a = ptr.mattk[i];
        if (a.adtyp === dtyp && (atyp === AT_ANY || a.aatyp === atyp))
            return a;
    }
    return null;
}

// C ref: mondata.c attacktype_fordmg()
export function attacktype_fordmg(ptr, atyp, dtyp) {
    for (let i = 0; i < NATTK; i++) {
        const a = ptr.mattk[i];
        if (a.aatyp === atyp && (dtyp === AD_ANY || a.adtyp === dtyp))
            return a;
    }
    return null;
}

// C ref: mondata.c dmgtype()
/* does monster-type deal out a particular type of damage from any attack */
export function dmgtype(ptr, dtyp) {
    return dmgtype_fromattack(ptr, dtyp, AT_ANY) ? true : false;
}

// C ref: mondata.c grownups[][2]
const grownups = [
    [M.PM_CHICKATRICE, M.PM_COCKATRICE],
    [M.PM_LITTLE_DOG, M.PM_DOG],
    [M.PM_DOG, M.PM_LARGE_DOG],
    [M.PM_HELL_HOUND_PUP, M.PM_HELL_HOUND],
    [M.PM_WINTER_WOLF_CUB, M.PM_WINTER_WOLF],
    [M.PM_KITTEN, M.PM_HOUSECAT],
    [M.PM_HOUSECAT, M.PM_LARGE_CAT],
    [M.PM_PONY, M.PM_HORSE],
    [M.PM_HORSE, M.PM_WARHORSE],
    [M.PM_KOBOLD, M.PM_LARGE_KOBOLD],
    [M.PM_LARGE_KOBOLD, M.PM_KOBOLD_LEADER],
    [M.PM_GNOME, M.PM_GNOME_LEADER],
    [M.PM_GNOME_LEADER, M.PM_GNOME_RULER],
    [M.PM_DWARF, M.PM_DWARF_LEADER],
    [M.PM_DWARF_LEADER, M.PM_DWARF_RULER],
    [M.PM_MIND_FLAYER, M.PM_MASTER_MIND_FLAYER],
    [M.PM_ORC, M.PM_ORC_CAPTAIN],
    [M.PM_HILL_ORC, M.PM_ORC_CAPTAIN],
    [M.PM_MORDOR_ORC, M.PM_ORC_CAPTAIN],
    [M.PM_URUK_HAI, M.PM_ORC_CAPTAIN],
    [M.PM_SEWER_RAT, M.PM_GIANT_RAT],
    [M.PM_CAVE_SPIDER, M.PM_GIANT_SPIDER],
    [M.PM_OGRE, M.PM_OGRE_LEADER],
    [M.PM_OGRE_LEADER, M.PM_OGRE_TYRANT],
    [M.PM_ELF, M.PM_ELF_NOBLE],
    [M.PM_WOODLAND_ELF, M.PM_ELF_NOBLE],
    [M.PM_GREEN_ELF, M.PM_ELF_NOBLE],
    [M.PM_GREY_ELF, M.PM_ELF_NOBLE],
    [M.PM_ELF_NOBLE, M.PM_ELVEN_MONARCH],
    [M.PM_LICH, M.PM_DEMILICH],
    [M.PM_DEMILICH, M.PM_MASTER_LICH],
    [M.PM_MASTER_LICH, M.PM_ARCH_LICH],
    [M.PM_VAMPIRE, M.PM_VAMPIRE_LEADER],
    [M.PM_BAT, M.PM_GIANT_BAT],
    [M.PM_BABY_GRAY_DRAGON, M.PM_GRAY_DRAGON],
    [M.PM_BABY_GOLD_DRAGON, M.PM_GOLD_DRAGON],
    [M.PM_BABY_SILVER_DRAGON, M.PM_SILVER_DRAGON],
    [M.PM_BABY_RED_DRAGON, M.PM_RED_DRAGON],
    [M.PM_BABY_WHITE_DRAGON, M.PM_WHITE_DRAGON],
    [M.PM_BABY_ORANGE_DRAGON, M.PM_ORANGE_DRAGON],
    [M.PM_BABY_BLACK_DRAGON, M.PM_BLACK_DRAGON],
    [M.PM_BABY_BLUE_DRAGON, M.PM_BLUE_DRAGON],
    [M.PM_BABY_GREEN_DRAGON, M.PM_GREEN_DRAGON],
    [M.PM_BABY_YELLOW_DRAGON, M.PM_YELLOW_DRAGON],
    [M.PM_RED_NAGA_HATCHLING, M.PM_RED_NAGA],
    [M.PM_BLACK_NAGA_HATCHLING, M.PM_BLACK_NAGA],
    [M.PM_GOLDEN_NAGA_HATCHLING, M.PM_GOLDEN_NAGA],
    [M.PM_GUARDIAN_NAGA_HATCHLING, M.PM_GUARDIAN_NAGA],
    [M.PM_SMALL_MIMIC, M.PM_LARGE_MIMIC],
    [M.PM_LARGE_MIMIC, M.PM_GIANT_MIMIC],
    [M.PM_BABY_LONG_WORM, M.PM_LONG_WORM],
    [M.PM_BABY_PURPLE_WORM, M.PM_PURPLE_WORM],
    [M.PM_BABY_CROCODILE, M.PM_CROCODILE],
    [M.PM_SOLDIER, M.PM_SERGEANT],
    [M.PM_SERGEANT, M.PM_LIEUTENANT],
    [M.PM_LIEUTENANT, M.PM_CAPTAIN],
    [M.PM_WATCHMAN, M.PM_WATCH_CAPTAIN],
    [M.PM_ALIGNED_CLERIC, M.PM_HIGH_CLERIC],
    [M.PM_STUDENT, M.PM_ARCHEOLOGIST],
    [M.PM_ATTENDANT, M.PM_HEALER],
    [M.PM_PAGE, M.PM_KNIGHT],
    [M.PM_ACOLYTE, M.PM_CLERIC],
    [M.PM_APPRENTICE, M.PM_WIZARD],
    [M.PM_MANES, M.PM_LEMURE],
    [M.PM_KEYSTONE_KOP, M.PM_KOP_SERGEANT],
    [M.PM_KOP_SERGEANT, M.PM_KOP_LIEUTENANT],
    [M.PM_KOP_LIEUTENANT, M.PM_KOP_KAPTAIN],
];

// C ref: mondata.c little_to_big()
export function little_to_big(montype) {
    for (let i = 0; i < grownups.length; i++)
        if (montype === grownups[i][0]) {
            montype = grownups[i][1];
            break;
        }
    return montype;
}

// C ref: mondata.c big_to_little()
export function big_to_little(montype) {
    for (let i = 0; i < grownups.length; i++)
        if (montype === grownups[i][1]) {
            montype = grownups[i][0];
            break;
        }
    return montype;
}

// C ref: mondata.c name_to_mon()
/* figure out what type of monster a user-supplied string is specifying;
   ignore anything past the monster name */
export function name_to_mon(in_str, gender_name_var) {
    return name_to_monplus(in_str, null, gender_name_var);
}

// C ref: mondata.c name_to_monplus() names[] (struct alt_spl)
const alt_spl_names = [
    /* Alternate spellings */
    ['grey dragon', M.PM_GRAY_DRAGON, NEUTRAL],
    ['baby grey dragon', M.PM_BABY_GRAY_DRAGON, NEUTRAL],
    ['grey unicorn', M.PM_GRAY_UNICORN, NEUTRAL],
    ['grey ooze', M.PM_GRAY_OOZE, NEUTRAL],
    ['gray-elf', M.PM_GREY_ELF, NEUTRAL],
    ['mindflayer', M.PM_MIND_FLAYER, NEUTRAL],
    ['master mindflayer', M.PM_MASTER_MIND_FLAYER, NEUTRAL],
    /* More alternates; priest and priestess are separate monster
       types but that isn't the case for {aligned,high} priests */
    ['aligned priest', M.PM_ALIGNED_CLERIC, MALE],
    ['aligned priestess', M.PM_ALIGNED_CLERIC, FEMALE],
    ['high priest', M.PM_HIGH_CLERIC, MALE],
    ['high priestess', M.PM_HIGH_CLERIC, FEMALE],
    /* Inappropriate singularization by -ves check above */
    ['master of thief', M.PM_MASTER_OF_THIEVES, NEUTRAL],
    /* Potential misspellings where we want to avoid falling back
       to the rank title prefix (input has been singularized) */
    ['master thief', M.PM_MASTER_OF_THIEVES, NEUTRAL],
    ['master of assassin', M.PM_MASTER_ASSASSIN, NEUTRAL],
    ['master-lich', M.PM_MASTER_LICH, NEUTRAL], /* cf arch-lich */
    ['masterlich', M.PM_MASTER_LICH, NEUTRAL], /* cf demilich */
    /* Outdated names */
    ['invisible stalker', M.PM_STALKER, NEUTRAL],
    ['high-elf', M.PM_ELVEN_MONARCH, NEUTRAL], /* PM_HIGH_ELF is obsolete */
    /* other misspellings or incorrect words */
    ['wood-elf', M.PM_WOODLAND_ELF, NEUTRAL],
    ['wood elf', M.PM_WOODLAND_ELF, NEUTRAL],
    ['woodland nymph', M.PM_WOOD_NYMPH, NEUTRAL],
    ['halfling', M.PM_HOBBIT, NEUTRAL], /* potential guess for polyself */
    ['genie', M.PM_DJINNI, NEUTRAL], /* potential guess for ^G/#wizgenesis */
    /* prefix used to workaround duplicate monster names for
       monsters with alternate forms */
    ['human wererat', M.PM_HUMAN_WERERAT, NEUTRAL],
    ['human werejackal', M.PM_HUMAN_WEREJACKAL, NEUTRAL],
    ['human werewolf', M.PM_HUMAN_WEREWOLF, NEUTRAL],
    /* for completeness */
    ['rat wererat', M.PM_WERERAT, NEUTRAL],
    ['jackal werejackal', M.PM_WEREJACKAL, NEUTRAL],
    ['wolf werewolf', M.PM_WEREWOLF, NEUTRAL],
    /* Hyphenated names -- it would be nice to handle these via
       fuzzymatch() but it isn't able to ignore trailing stuff */
    ['ki rin', M.PM_KI_RIN, NEUTRAL],
    ['kirin', M.PM_KI_RIN, NEUTRAL],
    ['uruk hai', M.PM_URUK_HAI, NEUTRAL],
    ['orc captain', M.PM_ORC_CAPTAIN, NEUTRAL],
    ['woodland elf', M.PM_WOODLAND_ELF, NEUTRAL],
    ['green elf', M.PM_GREEN_ELF, NEUTRAL],
    ['grey elf', M.PM_GREY_ELF, NEUTRAL],
    ['gray elf', M.PM_GREY_ELF, NEUTRAL],
    ['elf lady', M.PM_ELF_NOBLE, FEMALE],
    ['elf lord', M.PM_ELF_NOBLE, MALE],
    ['elf noble', M.PM_ELF_NOBLE, NEUTRAL],
    ['olog hai', M.PM_OLOG_HAI, NEUTRAL],
    ['arch lich', M.PM_ARCH_LICH, NEUTRAL],
    ['archlich', M.PM_ARCH_LICH, NEUTRAL],
    /* Some irregular plurals */
    ['incubi', M.PM_AMOROUS_DEMON, MALE],
    ['succubi', M.PM_AMOROUS_DEMON, FEMALE],
    ['violet fungi', M.PM_VIOLET_FUNGUS, NEUTRAL],
    ['homunculi', M.PM_HOMUNCULUS, NEUTRAL],
    ['baluchitheria', M.PM_BALUCHITHERIUM, NEUTRAL],
    ['lurkers above', M.PM_LURKER_ABOVE, NEUTRAL],
    ['cavemen', M.PM_CAVE_DWELLER, MALE],
    ['cavewomen', M.PM_CAVE_DWELLER, FEMALE],
    ['watchmen', M.PM_WATCHMAN, NEUTRAL],
    ['djinn', M.PM_DJINNI, NEUTRAL],
    ['mumakil', M.PM_MUMAK, NEUTRAL],
    ['erinyes', M.PM_ERINYS, NEUTRAL],
];

// C ref: mondata.c name_to_monplus()
/* figure out what type of monster a user-supplied string is specifying;
   remainder_p.p gets whatever is past the monster name (C: a pointer into
   in_str); gender_name_var.v gets the gender of the matched name */
export function name_to_monplus(in_str, remainder_p, gender_name_var) {
    let i;
    let mntmp = NON_PM;
    let str, off = 0; /* C: str == buf + off */
    let len, mgend, matchgend = -1;
    let slen;
    let exact_match = false;
    let s;

    if (remainder_p)
        remainder_p.p = null;

    if (in_str.startsWith('a '))
        off = 2;
    else if (in_str.startsWith('an '))
        off = 3;
    else if (in_str.startsWith('the '))
        off = 4;
    str = in_str.slice(off);

    slen = str.length;

    if ((s = strstri(str, 'vortices')) >= 0)
        str = str.slice(0, s + 4) + 'ex';
    /* be careful with "ies"; "priest", "zombies" */
    else if (slen > 3 && !strcmpi(str.slice(slen - 3), 'ies')
             && (slen < 7 || strcmpi(str.slice(slen - 7), 'zombies')))
        str = str.slice(0, slen - 3) + 'y';
    /* luckily no monster names end in fe or ve with ves plurals */
    else if (slen > 3 && !strcmpi(str.slice(slen - 3), 'ves'))
        str = str.slice(0, slen - 3) + 'f';

    slen = str.length; /* length possibly needs recomputing */

    for (const [name, pm_val, genderhint] of alt_spl_names) {
        len = name.length;
        if (!strncmpi(str, name, len)
            /* force full word (which could conceivably be possessive) */
            && (len >= str.length || str[len] === ' ' || str[len] === '\'')) {
            if (remainder_p)
                remainder_p.p = in_str.slice(off + len);
            if (gender_name_var)
                gender_name_var.v = genderhint;
            return pm_val;
        }
    }

    for (len = 0, i = LOW_PM; i < M.NUMMONS; i++) {
        for (mgend = MALE; mgend < NUM_MGENDERS; mgend++) {
            const pmname = mons[i].pmnames[mgend];

            if (!pmname)
                continue;

            const m_i_len = pmname.length;
            if (m_i_len > len && !strncmpi(pmname, str, m_i_len)) {
                const rest = str.slice(m_i_len);
                if (m_i_len === slen) {
                    mntmp = i;
                    len = m_i_len;
                    matchgend = mgend;
                    exact_match = true;
                    break; /* exact match */
                } else if (slen > m_i_len
                           && (str[m_i_len] === ' '
                               || !strcmpi(rest, 's')
                               || !strncmpi(rest, 's ', 2)
                               || !strcmpi(rest, '\'')
                               || !strncmpi(rest, '\' ', 2)
                               || !strcmpi(rest, '\'s')
                               || !strncmpi(rest, '\'s ', 3)
                               || !strcmpi(rest, 'es')
                               || !strncmpi(rest, 'es ', 3))) {
                    mntmp = i;
                    len = m_i_len;
                    matchgend = mgend;
                }
            }
        }
        if (exact_match)
            break;
    }
    /* FIXME: some titles have gender; title_to_mon() doesn't propagate it */
    if (mntmp === NON_PM) {
        const tout = {};
        mntmp = title_to_mon(str, tout);
        len = tout.title_length;
    }
    if (len && remainder_p)
        remainder_p.p = in_str.slice(off + len);
    if (gender_name_var && matchgend !== -1) {
        /* don't override with neuter if caller has already specified male
           or female and we've matched the neuter name */
        if (gender_name_var.v === -1 || matchgend !== NEUTRAL)
            gender_name_var.v = matchgend;
    }
    return mntmp;
}

// C ref: mondata.c cvt_adtyp_to_mseenres()
/* Convert attack damage type AD_foo to M_SEEN_bar */
export function cvt_adtyp_to_mseenres(adtyp) {
    switch (adtyp) {
    case M.AD_MAGM: return M_SEEN_MAGR;
    case M.AD_FIRE: return M_SEEN_FIRE;
    case M.AD_COLD: return M_SEEN_COLD;
    case M.AD_SLEE: return M_SEEN_SLEEP;
    case M.AD_DISN: return M_SEEN_DISINT;
    case M.AD_ELEC: return M_SEEN_ELEC;
    case M.AD_DRST: return M_SEEN_POISON;
    case M.AD_ACID: return M_SEEN_ACID;
    /* M_SEEN_REFL has no corresponding AD_foo type */
    default: return M_SEEN_NOTHING;
    }
}

// C ref: mondata.c get_atkdam_type()
/* Return the AD_ damage type for an attack; random breath picks one */
export function get_atkdam_type(adtyp) {
    if (adtyp === M.AD_RBRE) {
        const rnd_breath_typ = [
            M.AD_MAGM, M.AD_FIRE, M.AD_COLD, M.AD_SLEE,
            M.AD_DISN, M.AD_ELEC, M.AD_DRST, M.AD_ACID ];
        return ROLL_FROM(rnd_breath_typ);
    }
    return adtyp;
}

// C ref: mondata.c olfaction()
/*
 * Returns:
 *      True if monster is presumed to have a sense of smell.
 *      False if monster definitely does not have a sense of smell.
 *
 * Do not base this on presence of a head or nose, since many
 * creatures sense smells other ways (feelers, forked-tongues, etc).
 * We're assuming all insects can smell at a distance too.
 */
export function olfaction(mdat) {
    if (mdat.mlet === M.S_GOLEM /* is_golem(mdat) */
        || mdat.mlet === M.S_EYE /* spheres  */
        || mdat.mlet === M.S_JELLY || mdat.mlet === M.S_PUDDING
        || mdat.mlet === M.S_BLOB || mdat.mlet === M.S_VORTEX
        || mdat.mlet === M.S_ELEMENTAL
        || mdat.mlet === M.S_FUNGUS /* mushrooms and fungi */
        || mdat.mlet === M.S_LIGHT)
        return false;
    return true;
}

// C ref: mondata.c same_race()
/* returns True if monster can be considered the same race as another */
export function same_race(pm1, pm2) {
    const let1 = pm1.mlet, let2 = pm2.mlet;
    const is_giant = ptr => (ptr.mflags2 & M.M2_GIANT) !== 0;
    const is_golem = ptr => ptr.mlet === M.S_GOLEM;
    const is_mind_flayer = ptr => (ptr === M.mons[M.PM_MIND_FLAYER]
                                   || ptr === M.mons[M.PM_MASTER_MIND_FLAYER]);
    const is_unicorn = ptr => (ptr.mlet === M.S_UNICORN
                               && (ptr.mflags2 & M.M2_JEWELS) !== 0);
    const is_rider = ptr => (ptr === M.mons[M.PM_DEATH]
                             || ptr === M.mons[M.PM_FAMINE]
                             || ptr === M.mons[M.PM_PESTILENCE]);
    const is_minion = ptr => (ptr.mflags2 & M.M2_MINION) !== 0;
    const is_longworm = ptr => (ptr === M.mons[M.PM_BABY_LONG_WORM]
                                || ptr === M.mons[M.PM_LONG_WORM]
                                || ptr === M.mons[M.PM_LONG_WORM_TAIL]);

    if (pm1 === pm2)
        return true; /* exact match */
    /* player races have their own predicates */
    if (is_human(pm1))
        return is_human(pm2);
    if (is_elf(pm1))
        return is_elf(pm2);
    if (is_dwarf(pm1))
        return is_dwarf(pm2);
    if (is_gnome(pm1))
        return is_gnome(pm2);
    if (is_orc(pm1))
        return is_orc(pm2);
    /* other creatures are less precise */
    if (is_giant(pm1))
        return is_giant(pm2); /* open to quibbling here */
    if (is_golem(pm1))
        return is_golem(pm2); /* even moreso... */
    if (is_mind_flayer(pm1))
        return is_mind_flayer(pm2);
    if (let1 === M.S_KOBOLD || pm1 === M.mons[M.PM_KOBOLD_ZOMBIE]
        || pm1 === M.mons[M.PM_KOBOLD_MUMMY])
        return (let2 === M.S_KOBOLD || pm2 === M.mons[M.PM_KOBOLD_ZOMBIE]
                || pm2 === M.mons[M.PM_KOBOLD_MUMMY]);
    if (let1 === M.S_OGRE)
        return (let2 === M.S_OGRE);
    if (let1 === M.S_NYMPH)
        return (let2 === M.S_NYMPH);
    if (let1 === M.S_CENTAUR)
        return (let2 === M.S_CENTAUR);
    if (is_unicorn(pm1))
        return is_unicorn(pm2);
    if (let1 === M.S_DRAGON)
        return (let2 === M.S_DRAGON);
    if (let1 === M.S_NAGA)
        return (let2 === M.S_NAGA);
    /* other critters get steadily messier */
    if (is_rider(pm1))
        return is_rider(pm2); /* debatable */
    if (is_minion(pm1))
        return is_minion(pm2); /* [needs work?] */
    /* tengu don't match imps (first test handled case of both being tengu) */
    if (pm1 === M.mons[M.PM_TENGU] || pm2 === M.mons[M.PM_TENGU])
        return false;
    if (let1 === M.S_IMP)
        return (let2 === M.S_IMP);
    /* and minor demons (imps) don't match major demons */
    else if (let2 === M.S_IMP)
        return false;
    if (is_demon(pm1))
        return is_demon(pm2);
    if (is_undead(pm1)) {
        if (let1 === M.S_ZOMBIE)
            return (let2 === M.S_ZOMBIE);
        if (let1 === M.S_MUMMY)
            return (let2 === M.S_MUMMY);
        if (let1 === M.S_VAMPIRE)
            return (let2 === M.S_VAMPIRE);
        if (let1 === M.S_LICH)
            return (let2 === M.S_LICH);
        if (let1 === M.S_WRAITH)
            return (let2 === M.S_WRAITH);
        if (let1 === M.S_GHOST)
            return (let2 === M.S_GHOST);
    } else if (is_undead(pm2))
        return false;

    /* check for monsters which grow into more mature forms */
    if (let1 === let2) {
        const m1 = monsndx(pm1), m2 = monsndx(pm2);
        let prv, nxt;

        /* we know m1 != m2 (very first check above); test all smaller
           forms of m1 against m2, then all larger ones; don't need to
           make the corresponding tests for variants of m2 against m1 */
        for (prv = m1, nxt = big_to_little(m1); nxt !== prv;
             prv = nxt, nxt = big_to_little(nxt))
            if (nxt === m2)
                return true;
        for (prv = m1, nxt = little_to_big(m1); nxt !== prv;
             prv = nxt, nxt = little_to_big(nxt))
            if (nxt === m2)
                return true;
    }
    /* not caught by little/big handling */
    if (pm1 === M.mons[M.PM_GARGOYLE] || pm1 === M.mons[M.PM_WINGED_GARGOYLE])
        return (pm2 === M.mons[M.PM_GARGOYLE]
                || pm2 === M.mons[M.PM_WINGED_GARGOYLE]);
    if (pm1 === M.mons[M.PM_KILLER_BEE] || pm1 === M.mons[M.PM_QUEEN_BEE])
        return (pm2 === M.mons[M.PM_KILLER_BEE]
                || pm2 === M.mons[M.PM_QUEEN_BEE]);

    if (is_longworm(pm1))
        return is_longworm(pm2); /* handles tail */
    /* [currently there's no reason to bother matching up
        assorted bugs and blobs with their closest variants] */
    /* didn't match */
    return false;
}

// C ref: mondata.c give_u_to_m_resistances()
/* give monster mtmp the same intrinsics hero has */
export function give_u_to_m_resistances(mtmp) {
    /* convert the hero's current set of intrinsics to their monster
       equivalents -- FIRE_RES to MR_FIRE, COLD_RES to MR_COLD, etc -- and
       add each to the mintrinsics field for the given monster */
    for (let intr = FIRE_RES; intr <= STONE_RES; intr++) {
        if (((game.u.uprops[intr]?.intrinsic || 0) & INTRINSIC) !== 0) {
            /* res_to_mr(intr) */
            mtmp.mintrinsics = ((mtmp.mintrinsics ?? 0) | (1 << (intr - 1))) & 0xffff;
        }
    }
}
