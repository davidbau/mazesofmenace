/* NetHack 5.0	mondata.c	$NHDT-Date: 1738638877 2025/02/03 19:14:37 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.140 $ */
import { C } from './c-runtime.js';

/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Robert Patrick Rankin, 2011. */
/* NetHack may be freely redistributed.  See license for details. */

/*
 *      These routines provide basic data for any type of monster.
 */

/* set up an individual monster's base type (initial creation, shapechange) */
export function set_mon_data(mon, ptr)
{
    let new_speed, old_speed = mon.data ? mon.data.mmove : 0;
    let movement_p = C.samePtr(mon, C.gy.youmonst) ? C.shortRef(C.u, 'umovement') : C.shortRef(mon, 'movement');

    mon.data = ptr;
    mon.mnum = C.short(C.monsndx(ptr));

    if (movement_p.value) { /* used to adjust poly'd hero as well as monsters */
        new_speed = ptr.mmove;
        /* prorate unused movement if new form is slower so that
           it doesn't get extra moves leftover from previous form;
           if new form is faster, leave unused movement as is */
        if (new_speed < old_speed) {
            /*
             * Some static analysis warns that this might divide by 0
               mon->movement = new_speed * mon->movement / old_speed;
             * so add a redundant test to suppress that.
             */
            movement_p.value *= new_speed;
            if (old_speed > 0) /* old > new and new >= 0, so always True */
                movement_p.value = Math.trunc(movement_p.value / old_speed);
        }
    }
    return;
}

/* does monster-type have any attack for a specific type of damage? */
export function attacktype_fordmg(ptr, atyp, dtyp)
{
    atyp = C.int(atyp);
    dtyp = C.int(dtyp);
    let a;

    for (a = ptr.mattk[0]; C.attackBefore(a, ptr.mattk[C.NATTK]); a = C.attackNext(a))
        if (a.aatyp == atyp && (dtyp == C.AD_ANY || a.adtyp == dtyp))
            return a;
    return 0;
}

/* does monster-type have a particular type of attack */
export function attacktype(ptr, atyp)
{
    atyp = C.int(atyp);
    return attacktype_fordmg(ptr, atyp, C.AD_ANY) ? 1 : 0;
}

/* returns True if monster doesn't attack, False if it does */
export function noattacks(ptr)
{
    let i;
    let mattk = ptr.mattk;

    for (i = 0; i < C.NATTK; i++) {
        /* AT_BOOM "passive attack" (gas spore's explosion upon death)
           isn't an attack as far as our callers are concerned */
        if (mattk[i].aatyp == C.AT_BOOM)
            continue;

        if (mattk[i].aatyp)
            return 0;
    }
    return 1;
}

/* does monster-type transform into something else when petrified? */
export function poly_when_stoned(ptr)
{
    /* non-stone golems turn into stone golems unless latter is genocided */
    return C.boolean(C.is_golem(ptr) && !C.samePtr(ptr, C.mons[C.PM_STONE_GOLEM])
                      && !(C.svm.mvitals[C.PM_STONE_GOLEM].mvflags & C.G_GENOD));
    /* allow G_EXTINCT */
}

/* is 'mon' (possibly youmonst) protected against damage type 'adtype' via
   wielded weapon or worn dragon scales? [or by virtue of being a dragon?] */
export function defended(mon, adtyp)
{
    adtyp = C.int(adtyp);
    let o, otemp = C.objectLocal();
    let mndx;
    let is_you = (C.samePtr(mon, C.gy.youmonst));

    /* is 'mon' wielding an artifact that protects against 'adtyp'? */
    o = is_you ? C.uwep : C.MON_WEP(mon);
    if (o && o.oartifact && C.defends(adtyp, o))
        return 1;

    /* if 'mon' is an adult dragon, treat it as if it was wearing scales
       so that it has the same benefit as a hero wearing dragon scales */
    mndx = C.monsndx(mon.data);
    if (mndx >= C.PM_GRAY_DRAGON && mndx <= C.PM_YELLOW_DRAGON) {
        /* a dragon is its own suit...  if mon is poly'd hero, we don't
           care about embedded scales (uskin) because being a dragon with
           embedded scales is no better than just being a dragon */
        C.copyObject(otemp, C.cg.zeroobj);
        otemp.oclass = C.ARMOR_CLASS;
        otemp.otyp = C.GRAY_DRAGON_SCALES + (mndx - C.PM_GRAY_DRAGON);
        /* defends() and Is_dragon_armor() only care about otyp so ignore
           the rest of otemp's fields */
        o = otemp;
    } else {
        /* ordinary case: not an adult dragon */
        o = is_you ? C.uarm : C.which_armor(mon, C.W_ARM);
    }
    /* is 'mon' wearing dragon scales that protect against 'adtyp'? */
    if (o && C.Is_dragon_armor(o) && C.defends(adtyp, o))
        return 1;

    return 0;
}

/* returns True if monster resists particular elemental damage;
   handles 'carry' effects of artifacts as well as worn/wielded items */
export function Resists_Elem(mon, propindx)
{
    propindx = C.int(propindx);
    let o;
    let slotmask;
    let is_you = (C.samePtr(mon, C.gy.youmonst));
    let u_resist = 0, damgtype = 0, rsstmask = 0;

    /*
     * Main damage/resistance types, mostly matching dragon breath values.
     *  propindx = property index, fire (1), cold, (2) through stone (8);
     *  damgtype = damage type, 2 through 9 (0 and 1 aren't used here);
     *  rsstmask = resistance mask, 1, 2, 4, ..., 64, 128.
     */

    switch (propindx) {
    case C.FIRE_RES:   /* 1 */
    case C.COLD_RES:   /* 2 */
    case C.SLEEP_RES:  /* 3 */
    case C.DISINT_RES: /* 4 */
    case C.SHOCK_RES:  /* 5 */
    case C.POISON_RES: /* 6 */
    case C.ACID_RES:   /* 7 */
    case C.STONE_RES:  /* 8 */
        damgtype = propindx + 1; /* valid for propindx 1..8, damgtype 2..9 */
        rsstmask = 1 << (propindx - 1); /* valid for propindx 1..8 */
        u_resist = C.u.uprops[propindx].intrinsic
                   || C.u.uprops[propindx].extrinsic;
        break;

    /* accept these, but we expect callers to use their routines directly */
    case C.ANTIMAGIC:
        return resists_magm(mon);
    case C.DRAIN_RES:
        return resists_drli(mon);
    case C.BLND_RES:
        return resists_blnd(mon);

    default:
        C.impossible("Resists_Elem(%d), unexpected property type", propindx);
        return 0;
    }

    if (is_you ? u_resist : ((C.mon_resistancebits(mon) & rsstmask) != 0))
        return 1;
    /* check for resistance granted by wielded weapon */
    o = is_you ? C.uwep : C.MON_WEP(mon);
    if (o && o.oartifact && C.defends(damgtype, o))
        return 1;
    /* check for resistance granted by worn or carried items */
    o = is_you ? C.gi.invent : mon.minvent;
    slotmask = C.W_ARMOR | C.W_ACCESSORY;
    if (!is_you /* assumes monsters don't wield non-weapons */
        || (C.uwep && (C.uwep.oclass == C.WEAPON_CLASS || C.is_weptool(C.uwep))))
        slotmask |= C.W_WEP;
    if (is_you && C.u.twoweap)
        slotmask |= C.W_SWAPWEP;
    for (; o; o = o.nobj)
        if (((o.owornmask & slotmask) != 0n
             && C.objects[o.otyp].oc_oprop == propindx)
            || ((o.owornmask & C.W_ARMC) == C.W_ARMC
                /* worn apron confers a pair of resistances but
                   objects[ALCHEMY_SMOCK].oc_oprop can only represent one;
                   we check both so won't need to know which one that is */
                && o.otyp == C.ALCHEMY_SMOCK
                && (propindx == C.POISON_RES || propindx == C.ACID_RES))
            || (o.oartifact && C.defends_when_carried(damgtype, o)))
            return 1;
    return 0;
}

/* returns True if monster is drain-life resistant */
export function resists_drli(mon)
{
    let ptr = mon.data;

    if (C.is_undead(ptr) || C.is_demon(ptr) || C.is_were(ptr)
        /* is_were() doesn't handle hero in human form */
        || (C.samePtr(mon, C.gy.youmonst) && C.u.ulycn >= C.LOW_PM)
        || C.samePtr(ptr, C.mons[C.PM_DEATH]) || C.is_vampshifter(mon))
        return 1;
    return C.callLocal(defended, mon, C.AD_DRLI);
}

/* True if monster is magic-missile (actually, general magic) resistant */
export function resists_magm(mon)
{
    let ptr = mon.data;
    let is_you = (C.samePtr(mon, C.gy.youmonst));
    let slotmask;
    let o;

    /* as of 3.2.0:  gray dragons, Angels, Oracle, Yeenoghu */
    if (dmgtype(ptr, C.AD_MAGM) || C.samePtr(ptr, C.mons[C.PM_BABY_GRAY_DRAGON])
        || dmgtype(ptr, C.AD_RBRE)) /* Chromatic Dragon */
        return 1;
    /* check for magic resistance granted by wielded weapon */
    o = is_you ? C.uwep : C.MON_WEP(mon);
    if (o && o.oartifact && C.defends(C.AD_MAGM, o))
        return 1;
    /* check for magic resistance granted by worn or carried items */
    o = is_you ? C.gi.invent : mon.minvent;
    slotmask = C.W_ARMOR | C.W_ACCESSORY;
    if (!is_you /* assumes monsters don't wield non-weapons */
        || (C.uwep && (C.uwep.oclass == C.WEAPON_CLASS || C.is_weptool(C.uwep))))
        slotmask |= C.W_WEP;
    if (is_you && C.u.twoweap)
        slotmask |= C.W_SWAPWEP;
    for (; o; o = o.nobj)
        if (((o.owornmask & slotmask) != 0n
             && C.objects[o.otyp].oc_oprop == C.ANTIMAGIC)
            || (o.oartifact && C.defends_when_carried(C.AD_MAGM, o)))
            return 1;
    return 0;
}

/* True if monster is resistant to light-induced blindness */
export function resists_blnd(mon)
{
    let ptr = mon.data;
    let is_you = (C.samePtr(mon, C.gy.youmonst));

    if (is_you ? (C.Blind || C.Unaware)
               : (mon.mblinded || !mon.mcansee || !C.haseyes(ptr)
                  /* BUG: temporary sleep sets mfrozen, but since
                          paralysis does too, we can't check it */
                  || mon.msleeping))
        return 1;
    /* yellow light, Archon; !dust vortex, !cobra, !raven */
    if (dmgtype_fromattack(ptr, C.AD_BLND, C.AT_EXPL)
        || dmgtype_fromattack(ptr, C.AD_BLND, C.AT_GAZE))
        return 1;
    /* Sunsword */
    if (resists_blnd_by_arti(mon))
        return 1;
    /* catchall */
    if (is_you && C.Blnd_resist) {
        C.impossible("'Blnd_resist' but not resists_blnd()?");
        return 1;
    }
    return 0;
}

/* True iff monster is resistant to light-induced blindness due to worn
   or wielded magical equipment (used to decide whether to show sparkle
   animation when resisting) */
export function resists_blnd_by_arti(mon)
{
    let o;
    let is_you = (C.samePtr(mon, C.gy.youmonst));

    o = is_you ? C.uwep : C.MON_WEP(mon);
    if (o && o.oartifact && C.defends(C.AD_BLND, o))
        return 1;
    o = is_you ? C.gi.invent : mon.minvent;
    for (; o; o = o.nobj)
        if (C.defends_when_carried(C.AD_BLND, o))
            return 1;
/* omit this; the Eyes of the Overworld have no carry property and
         * their worn property is magic resistance rather than blindness
         * resistance; wearing them blocks blindness without actually
         * preventing it, so don't classify them as providing resistance */ /* 0 */
    return 0;
}

/* True iff monster can be blinded by the given attack;
   note: may return True when mdef is blind (e.g. new cream-pie attack)
   magr can be NULL.
*/
export function can_blnd(magr, mdef, aatyp, obj)
/* NULL == no specific aggressor */
/* aatyp == AT_WEAP, AT_SPIT */
{
    aatyp = C.uchar(aatyp);
    let is_you = (C.samePtr(mdef, C.gy.youmonst));
    let check_visor = 0;
    let o;

    /* no eyes protect against all attacks for now */
    if (!C.haseyes(mdef.data))
        return 0;

    /* if monster has been permanently blinded, the deed is already done */
    if (!is_you && C.mon_perma_blind(mdef))
        return 0;

    /* /corvus oculum corvi non eruit/
       a saying expressed in Latin rather than a zoological observation:
       "a crow will not pluck out the eye of another crow"
       so prevent ravens from blinding each other */
    if (magr && C.samePtr(magr.data, C.mons[C.PM_RAVEN]) && C.samePtr(mdef.data, C.mons[C.PM_RAVEN]))
        return 0;

    switch (aatyp) {
    case C.AT_EXPL:
    case C.AT_BOOM:
    case C.AT_GAZE:
    case C.AT_MAGC:
    case C.AT_BREA: /* assumed to be lightning */
        /* light-based attacks may be cancelled or resisted */
        if (magr && magr.mcan)
            return 0;
        return !resists_blnd(mdef);

    case C.AT_WEAP:
    case C.AT_SPIT:
    case C.AT_NONE:
        /* an object is used (thrown/spit/other) */
        if (obj && (obj.otyp == C.CREAM_PIE)) {
            if (is_you && C.Blindfolded)
                return 0;
        } else if (obj && (obj.otyp == C.BLINDING_VENOM)) {
            /* all ublindf, including LENSES, protect, cream-pies too */
            if (is_you && (C.ublindf || C.u.ucreamed))
                return 0;
            check_visor = 1;
        } else if (obj && (obj.otyp == C.POT_BLINDNESS)) {
            return 1; /* no defense */
        } else
            return 0; /* other objects cannot cause blindness yet */
        if ((C.samePtr(magr, C.gy.youmonst)) && C.u.uswallow)
            return 0; /* can't affect eyes while inside monster */
        break;

    case C.AT_ENGL:
        if (is_you && (C.Blindfolded || C.Unaware || C.u.ucreamed))
            return 0;
        if (!is_you && mdef.msleeping)
            return 0;
        break;

    case C.AT_CLAW:
        /* e.g. raven: all ublindf, including LENSES, protect */
        if (is_you && C.ublindf)
            return 0;
        if ((C.samePtr(magr, C.gy.youmonst)) && C.u.uswallow)
            return 0; /* can't affect eyes while inside monster */
        check_visor = 1;
        break;

    case C.AT_TUCH:
    case C.AT_STNG:
        /* some physical, blind-inducing attacks can be cancelled */
        if (magr && magr.mcan)
            return 0;
        break;

    default:
        break;
    }

    /* check if wearing a visor (only checked if visor might help) */
    if (check_visor) {
        o = (C.samePtr(mdef, C.gy.youmonst)) ? C.gi.invent : mdef.minvent;
        for (; o; o = o.nobj)
            if ((o.owornmask & C.W_ARMH)
                && C.objdescr_is(o, "visored helmet"))
                return 0;
    }

    return 1;
}

/* returns True if monster can attack at range */
export function ranged_attk(ptr)
{
    let i;

    for (i = 0; i < C.NATTK; i++)
        if (C.DISTANCE_ATTK_TYPE(ptr.mattk[i].aatyp))
            return 1;
    return 0;
}

/*
 * If adding a new monster, include a guestimate for difficulty,
 * build the program, then run it in wizard mode and use the
 * #mondifficulty command.  If it reports a discrepancy, update
 * the monsters array with the more accurate value (or possibly
 * modify the 'mstrength()' algorithm to generate the guessed one).
 */



/* This routine is designed to return an integer value which represents
   an approximation of monster strength.  It uses a similar method of
   determination as "experience()" to arrive at the strength. */
export function mstrength(ptr)
{
    let i, tmp2, n, tmp = ptr.mlevel;

    if (tmp > 49) /* special fixed hp monster */
        tmp = Math.trunc(2 * (tmp - 6) / 4);

    /* for creation in groups */
    n = (!!(ptr.geno & C.G_SGROUP));
    n += (!!(ptr.geno & C.G_LGROUP)) << 1;

    /* for ranged attacks */
    if (mstrength_ranged_attk(ptr))
        n++;

    /* for higher ac values */
    n += (ptr.ac < 4);
    n += (ptr.ac < 0);

    /* for very fast monsters */
    n += (ptr.mmove >= 18);

    /* for each attack and "special" attack */
    for (i = 0; i < C.NATTK; i++) {
        tmp2 = ptr.mattk[i].aatyp;
        n += (tmp2 > 0);
        n += (tmp2 == C.AT_MAGC);
        n += C.bool(tmp2 == C.AT_WEAP && (ptr.mflags2 & C.M2_STRONG));
        if (tmp2 == C.AT_EXPL) {
            let tmp3 = ptr.mattk[i].adtyp;
            /* {freezing,flaming,shocking} spheres are fairly weak but
               can destroy equipment; {yellow,black} lights can't */
            n += ((tmp3 == C.AD_COLD || tmp3 == C.AD_FIRE) ? 3
                  : (tmp3 == C.AD_ELEC) ? 5
                    : 0);
        }
    }

    /* for each "special" damage type */
    for (i = 0; i < C.NATTK; i++) {
        tmp2 = ptr.mattk[i].adtyp;
        if ((tmp2 == C.AD_DRLI) || (tmp2 == C.AD_STON) || (tmp2 == C.AD_DRST)
            || (tmp2 == C.AD_DRDX) || (tmp2 == C.AD_DRCO) || (tmp2 == C.AD_WERE))
            n += 2;
        else if (C.strcmp(ptr.pmnames[C.NEUTRAL], "grid bug"))
            n += (tmp2 != C.AD_PHYS);
        n += (C.int(ptr.mattk[i].damd * ptr.mattk[i].damn) > 23);
    }

    /* Leprechauns are a special case.  They have many hit dice so they can
       hit and are hard to kill, but they don't really do much damage. */
    if (!C.strcmp(ptr.pmnames[C.NEUTRAL], "leprechaun"))
        n -= 2;

    /* despite group and poison increments, soldier ants and killer bees are
       underestimated by the formula, so have an artificial +1 difficulty */
    if (!C.strcmp(ptr.pmnames[C.NEUTRAL], "killer bee") ||
        !C.strcmp(ptr.pmnames[C.NEUTRAL], "soldier ant"))
        n += 2; /* +1 after 'tmp += n/2' below */

    /* finally, adjust the monster level  0 <= n <= 24 (approx.) */
    if (n == 0)
        tmp -= 1;
    else if (n < 6)
        tmp += (Math.trunc(n / 3) + 1);
    else
        tmp += Math.trunc(n / 2);

    return (tmp >= 0) ? tmp : 0;
}

/* returns True if monster can attack at range */
export function mstrength_ranged_attk(ptr)
{
    let i, j;
    let atk_mask = (1 << C.AT_BREA) | (1 << C.AT_SPIT) | (1 << C.AT_GAZE);

    for (i = 0; i < C.NATTK; i++) {
        if ((j = ptr.mattk[i].aatyp) >= C.AT_WEAP
            || (j < 32 && (atk_mask & (1 << j)) != 0))
            return 1;
    }
    return 0;
}
/* (NH_DEVEL_STATUS != NH_STATUS_RELEASED) || DEBUG || MAKEDEFS_C */

/* True if specific monster is especially affected by silver weapons */
export function mon_hates_silver(mon)
{
    return C.boolean(C.is_vampshifter(mon) || hates_silver(mon.data));
}

/* True if monster-type is especially affected by silver weapons */
export function hates_silver(ptr)
{
    return C.boolean(C.is_were(ptr) || ptr.mlet == C.S_VAMPIRE || C.is_demon(ptr)
                      || C.samePtr(ptr, C.mons[C.PM_SHADE])
                      || (ptr.mlet == C.S_IMP && !C.samePtr(ptr, C.mons[C.PM_TENGU])));
}

/* True if specific monster is especially affected by blessed objects */
export function mon_hates_blessings(mon)
{
    return C.boolean(C.is_vampshifter(mon) || hates_blessings(mon.data));
}

/* True if monster-type is especially affected by blessed objects */
export function hates_blessings(ptr)
{
    return C.boolean(C.is_undead(ptr) || C.is_demon(ptr));
}

/* True if specific monster is especially affected by light-emitting weapons */
export function mon_hates_light(mon)
{
    return C.boolean(C.hates_light(mon.data));
}

/* True iff the type of monster pass through iron bars */
export function passes_bars(mptr)
{
    return C.boolean(C.passes_walls(mptr) || C.amorphous(mptr) || C.unsolid(mptr)
                      || C.is_whirly(mptr) || C.verysmall(mptr)
                      /* rust monsters and some puddings can destroy bars */
                      || dmgtype(mptr, C.AD_RUST) || dmgtype(mptr, C.AD_CORR)
                      /* rock moles can eat bars */
                      || C.metallivorous(mptr)
                      || (C.slithy(mptr) && !C.bigmonst(mptr)));
}

/* returns True if monster can blow (whistle, etc) */
export function can_blow(mtmp)
{
    if ((C.is_silent(mtmp.data) || mtmp.data.msound == C.MS_BUZZ)
        && (C.breathless(mtmp.data) || C.verysmall(mtmp.data)
            || !C.has_head(mtmp.data) || mtmp.data.mlet == C.S_EEL))
        return 0;
    if ((C.samePtr(mtmp, C.gy.youmonst)) && C.Strangled)
        return 0;
    return 1;
}

/* for casting spells and reading scrolls while blind */
export function can_chant(mtmp)
{
    if ((C.samePtr(mtmp, C.gy.youmonst) && C.Strangled)
        || C.is_silent(mtmp.data) || !C.has_head(mtmp.data)
        || mtmp.data.msound == C.MS_BUZZ || mtmp.data.msound == C.MS_BURBLE)
        return 0;
    return 1;
}

/* True if mon is vulnerable to strangulation */
export function can_be_strangled(mon)
{
    let mamul;
    let nonbreathing, nobrainer;

    /* For amulet of strangulation support:  here we're considering
       strangulation to be loss of blood flow to the brain due to
       constriction of the arteries in the neck, so all headless
       creatures are immune (no neck) as are mindless creatures
       who don't need to breathe (brain, if any, doesn't care).
       Mindless creatures who do need to breath are vulnerable, as
       are non-breathing creatures which have higher brain function. */
    if (!C.has_head(mon.data))
        return 0;
    if (C.samePtr(mon, C.gy.youmonst)) {
        /* hero can't be mindless but poly'ing into mindless form can
           confer strangulation protection */
        nobrainer = C.mindless(C.gy.youmonst.data);
        nonbreathing = C.Breathless;
    } else {
        nobrainer = C.mindless(mon.data);
        /* monsters don't wear amulets of magical breathing,
           so second part doesn't achieve anything useful... */
        nonbreathing = (C.breathless(mon.data)
                        || ((mamul = C.which_armor(mon, C.W_AMUL)) != 0
                            && (mamul.otyp == C.AMULET_OF_MAGICAL_BREATHING)));
    }
    return C.boolean(!nobrainer || !nonbreathing);
}

/* returns True if monster can track well */
export function can_track(ptr)
{
    if (C.u_wield_art(C.ART_EXCALIBUR))
        return 1;
    return C.boolean(C.haseyes(ptr));
}

/* creature will slide out of armor */
export function sliparm(ptr)
{
    return C.boolean(C.is_whirly(ptr) || ptr.msize <= C.MZ_SMALL
                      || C.noncorporeal(ptr));
}

/* creature will break out of armor */
export function breakarm(ptr)
{
    if (sliparm(ptr))
        return 0;

    return C.boolean(C.bigmonst(ptr)
                      || (ptr.msize > C.MZ_SMALL && !C.humanoid(ptr))
                      /* special cases of humanoids that cannot wear suits */
                      || C.samePtr(ptr, C.mons[C.PM_MARILITH])
                      || C.samePtr(ptr, C.mons[C.PM_WINGED_GARGOYLE]));
}

/* creature sticks other creatures it hits */
export function sticks(ptr)
{
    return C.boolean(dmgtype(ptr, C.AD_STCK)
                      || (dmgtype(ptr, C.AD_WRAP) && !attacktype(ptr, C.AT_ENGL))
                      || attacktype(ptr, C.AT_HUGS));
}

/* some monster-types can't vomit */
export function cantvomit(ptr)
{
    /* rats and mice are incapable of vomiting; likewise with horses;
       which other creatures have the same limitation? */
    if (ptr.mlet == C.S_RODENT && !C.samePtr(ptr, C.mons[C.PM_ROCK_MOLE])
        && !C.samePtr(ptr, C.mons[C.PM_WOODCHUCK]))
        return 1;
    if (C.samePtr(ptr, C.mons[C.PM_WARHORSE]) || C.samePtr(ptr, C.mons[C.PM_HORSE])
        || C.samePtr(ptr, C.mons[C.PM_PONY]))
        return 1;
    return 0;
}

/* number of horns this type of monster has on its head */
export function num_horns(ptr)
{
    switch (C.monsndx(ptr)) {
    case C.PM_HORNED_DEVIL: /* ? "more than one" */
    case C.PM_MINOTAUR:
    case C.PM_ASMODEUS:
    case C.PM_BALROG:
        return 2;
    case C.PM_WHITE_UNICORN:
    case C.PM_GRAY_UNICORN:
    case C.PM_BLACK_UNICORN:
    case C.PM_KI_RIN:
        return 1;
    default:
        break;
    }
    return 0;
}

/* does monster-type deal out a particular type of damage from a particular
   type of attack? */
export function dmgtype_fromattack(ptr, dtyp, atyp)
{
    dtyp = C.int(dtyp);
    atyp = C.int(atyp);
    let a;

    for (a = ptr.mattk[0]; C.attackBefore(a, ptr.mattk[C.NATTK]); a = C.attackNext(a))
        if (a.adtyp == dtyp && (atyp == C.AT_ANY || a.aatyp == atyp))
            return a;
    return 0;
}

/* does monster-type deal out a particular type of damage from any attack */
export function dmgtype(ptr, dtyp)
{
    dtyp = C.int(dtyp);
    return dmgtype_fromattack(ptr, dtyp, C.AT_ANY) ? 1 : 0;
}

/* returns the maximum damage a defender can do to the attacker via
   a passive defense */
export function max_passive_dmg(mdef, magr)
{
    let i, dmg, multi2 = 0;
    let adtyp;

    /* each attack by magr can result in passive damage */
    for (i = 0; i < C.NATTK; i++)
        switch (magr.data.mattk[i].aatyp) {
        case C.AT_CLAW:
        case C.AT_BITE:
        case C.AT_KICK:
        case C.AT_BUTT:
        case C.AT_TUCH:
        case C.AT_STNG:
        case C.AT_HUGS:
        case C.AT_ENGL:
        case C.AT_TENT:
        case C.AT_WEAP:
            multi2++;
            break;
        default:
            break;
        }

    dmg = 0;
    for (i = 0; i < C.NATTK; i++)
        if (mdef.data.mattk[i].aatyp == C.AT_NONE
            || mdef.data.mattk[i].aatyp == C.AT_BOOM) {
            adtyp = mdef.data.mattk[i].adtyp;
            if ((adtyp == C.AD_FIRE && C.completelyburns(magr.data))
                || (adtyp == C.AD_DCAY && C.completelyrots(magr.data))
                || (adtyp == C.AD_RUST && C.completelyrusts(magr.data))) {
                dmg = magr.mhp;
            } else if ((adtyp == C.AD_ACID && !Resists_Elem(magr, C.ACID_RES))
                       || (adtyp == C.AD_COLD && !Resists_Elem(magr, C.COLD_RES))
                       || (adtyp == C.AD_FIRE && !Resists_Elem(magr, C.FIRE_RES))
                       || (adtyp == C.AD_ELEC && !Resists_Elem(magr, C.SHOCK_RES))
                       || adtyp == C.AD_PHYS) {
                dmg = mdef.data.mattk[i].damn;
                if (!dmg)
                    dmg = mdef.data.mlevel + 1;
                dmg *= mdef.data.mattk[i].damd;
            }
            dmg *= multi2;
            break;
        }
    return dmg;
}

/* determine whether two monster types are from the same species */
export function same_race(pm1, pm2)
{
    let let1 = pm1.mlet, let2 = pm2.mlet;

    if (C.samePtr(pm1, pm2))
        return 1; /* exact match */
    /* player races have their own predicates */
    if (C.is_human(pm1))
        return C.is_human(pm2);
    if (C.is_elf(pm1))
        return C.is_elf(pm2);
    if (C.is_dwarf(pm1))
        return C.is_dwarf(pm2);
    if (C.is_gnome(pm1))
        return C.is_gnome(pm2);
    if (C.is_orc(pm1))
        return C.is_orc(pm2);
    /* other creatures are less precise */
    if (C.is_giant(pm1))
        return C.is_giant(pm2); /* open to quibbling here */
    if (C.is_golem(pm1))
        return C.is_golem(pm2); /* even moreso... */
    if (C.is_mind_flayer(pm1))
        return C.is_mind_flayer(pm2);
    if (let1 == C.S_KOBOLD || C.samePtr(pm1, C.mons[C.PM_KOBOLD_ZOMBIE])
        || C.samePtr(pm1, C.mons[C.PM_KOBOLD_MUMMY]))
        return (let2 == C.S_KOBOLD || C.samePtr(pm2, C.mons[C.PM_KOBOLD_ZOMBIE])
                || C.samePtr(pm2, C.mons[C.PM_KOBOLD_MUMMY]));
    if (let1 == C.S_OGRE)
        return (let2 == C.S_OGRE);
    if (let1 == C.S_NYMPH)
        return (let2 == C.S_NYMPH);
    if (let1 == C.S_CENTAUR)
        return (let2 == C.S_CENTAUR);
    if (C.is_unicorn(pm1))
        return C.is_unicorn(pm2);
    if (let1 == C.S_DRAGON)
        return (let2 == C.S_DRAGON);
    if (let1 == C.S_NAGA)
        return (let2 == C.S_NAGA);
    /* other critters get steadily messier */
    if (C.is_rider(pm1))
        return C.is_rider(pm2); /* debatable */
    if (C.is_minion(pm1))
        return C.is_minion(pm2); /* [needs work?] */
    /* tengu don't match imps (first test handled case of both being tengu) */
    if (C.samePtr(pm1, C.mons[C.PM_TENGU]) || C.samePtr(pm2, C.mons[C.PM_TENGU]))
        return 0;
    if (let1 == C.S_IMP)
        return (let2 == C.S_IMP);
    /* and minor demons (imps) don't match major demons */
    else if (let2 == C.S_IMP)
        return 0;
    if (C.is_demon(pm1))
        return C.is_demon(pm2);
    if (C.is_undead(pm1)) {
        if (let1 == C.S_ZOMBIE)
            return (let2 == C.S_ZOMBIE);
        if (let1 == C.S_MUMMY)
            return (let2 == C.S_MUMMY);
        if (let1 == C.S_VAMPIRE)
            return (let2 == C.S_VAMPIRE);
        if (let1 == C.S_LICH)
            return (let2 == C.S_LICH);
        if (let1 == C.S_WRAITH)
            return (let2 == C.S_WRAITH);
        if (let1 == C.S_GHOST)
            return (let2 == C.S_GHOST);
    } else if (C.is_undead(pm2))
        return 0;

    /* check for monsters which grow into more mature forms */
    if (let1 == let2) {
        let m1 = C.monsndx(pm1), m2 = C.monsndx(pm2), prv, nxt;

        /* we know m1 != m2 (very first check above); test all smaller
           forms of m1 against m2, then all larger ones; don't need to
           make the corresponding tests for variants of m2 against m1 */
        for (prv = m1, nxt = big_to_little(m1); nxt != prv;
             prv = nxt, nxt = big_to_little(nxt))
            if (nxt == m2)
                return 1;
        for (prv = m1, nxt = little_to_big(m1); nxt != prv;
             prv = nxt, nxt = little_to_big(nxt))
            if (nxt == m2)
                return 1;
    }
    /* not caught by little/big handling */
    if (C.samePtr(pm1, C.mons[C.PM_GARGOYLE]) || C.samePtr(pm1, C.mons[C.PM_WINGED_GARGOYLE]))
        return (C.samePtr(pm2, C.mons[C.PM_GARGOYLE])
                || C.samePtr(pm2, C.mons[C.PM_WINGED_GARGOYLE]));
    if (C.samePtr(pm1, C.mons[C.PM_KILLER_BEE]) || C.samePtr(pm1, C.mons[C.PM_QUEEN_BEE]))
        return (C.samePtr(pm2, C.mons[C.PM_KILLER_BEE]) || C.samePtr(pm2, C.mons[C.PM_QUEEN_BEE]));

    if (C.is_longworm(pm1))
        return C.is_longworm(pm2); /* handles tail */
    /* [currently there's no reason to bother matching up
        assorted bugs and blobs with their closest variants] */
    /* didn't match */
    return 0;
}

/* for handling alternate spellings */


/* figure out what type of monster a user-supplied string is specifying;
   ignore anything past the monster name */
export function name_to_mon(in_str, gender_name_var)
{
    in_str = C.charPointer(in_str);
    return C.callLocal(name_to_monplus, in_str, 0, gender_name_var);
}

/* figure out what type of monster a user-supplied string is specifying;
   return a pointer to whatever is past the monster name--necessary if
   caller wants to strip off the name and it matches one of the alternate
   names rather the canonical mons[].mname */
export function name_to_monplus(in_str, remainder_p, gender_name_var)
{
    in_str = C.charPointer(in_str);
    /* Be careful.  We must check the entire string in case it was
     * something such as "ettin zombie corpse".  The calling routine
     * doesn't know about the "corpse" until the monster name has
     * already been taken off the front, so we have to be able to
     * read the name with extraneous stuff such as "corpse" stuck on
     * the end.
     * This causes a problem for names which prefix other names such
     * as "ettin" on "ettin zombie".  In this case we want the _longest_
     * name which exists.
     * This also permits plurals created by adding suffixes such as 's'
     * or 'es'.  Other plurals must still be handled explicitly.
     */
    let i;
    let mntmp = C.NON_PM;
    let s, str, term;
    let buf = C.stackAlloc(C.BUFSZ);
    let len = C.intLocal(), mgend, matchgend = -1;
    let slen;
    let exact_match = 0;

    if (remainder_p)
        remainder_p.value = 0;

    str = C.strcpy(buf, in_str);

    if (!C.strncmp(str, "a ", 2))
        str += 2;
    else if (!C.strncmp(str, "an ", 3))
        str += 3;
    else if (!C.strncmp(str, "the ", 4))
        str += 4;

    slen = C.strlen(str);
    term = C.ptrAdd(str, slen);

    if ((s = C.strstri(str, "vortices")) != 0)
        C.Strcpy(s + 4, "ex");
    /* be careful with "ies"; "priest", "zombies" */
    else if (slen > 3 && !C.strcmpi(term - 3, "ies")
             && (slen < 7 || C.strcmpi(term - 7, "zombies")))
        C.Strcpy(term - 3, "y");
    /* luckily no monster names end in fe or ve with ves plurals */
    else if (slen > 3 && !C.strcmpi(term - 3, "ves"))
        C.Strcpy(term - 3, "f");

    slen = C.strlen(str); /* length possibly needs recomputing */

    {
        const names = [
            /* Alternate spellings */
            { name: "grey dragon", pm_val: C.PM_GRAY_DRAGON, genderhint: C.NEUTRAL  },
            { name: "baby grey dragon", pm_val: C.PM_BABY_GRAY_DRAGON, genderhint: C.NEUTRAL  },
            { name: "grey unicorn", pm_val: C.PM_GRAY_UNICORN, genderhint: C.NEUTRAL  },
            { name: "grey ooze", pm_val: C.PM_GRAY_OOZE, genderhint: C.NEUTRAL  },
            { name: "gray-elf", pm_val: C.PM_GREY_ELF, genderhint: C.NEUTRAL  },
            { name: "mindflayer", pm_val: C.PM_MIND_FLAYER, genderhint: C.NEUTRAL  },
            { name: "master mindflayer", pm_val: C.PM_MASTER_MIND_FLAYER, genderhint: C.NEUTRAL  },
            /* More alternates; priest and priestess are separate monster
               types but that isn't the case for {aligned,high} priests */
            { name: "aligned priest", pm_val: C.PM_ALIGNED_CLERIC, genderhint: C.MALE  },
            { name: "aligned priestess", pm_val: C.PM_ALIGNED_CLERIC, genderhint: C.FEMALE  },
            { name: "high priest", pm_val: C.PM_HIGH_CLERIC, genderhint: C.MALE  },
            { name: "high priestess", pm_val: C.PM_HIGH_CLERIC, genderhint: C.FEMALE  },
            /* Inappropriate singularization by -ves check above */
            { name: "master of thief", pm_val: C.PM_MASTER_OF_THIEVES, genderhint: C.NEUTRAL  },
            /* Potential misspellings where we want to avoid falling back
               to the rank title prefix (input has been singularized) */
            { name: "master thief", pm_val: C.PM_MASTER_OF_THIEVES, genderhint: C.NEUTRAL  },
            { name: "master of assassin", pm_val: C.PM_MASTER_ASSASSIN, genderhint: C.NEUTRAL  },
            { name: "master-lich", pm_val: C.PM_MASTER_LICH, genderhint: C.NEUTRAL  }, /* cf arch-lich */
            { name: "masterlich", pm_val: C.PM_MASTER_LICH, genderhint: C.NEUTRAL  }, /* cf demilich */
            /* Outdated names */
            { name: "invisible stalker", pm_val: C.PM_STALKER, genderhint: C.NEUTRAL  },
            { name: "high-elf", pm_val: C.PM_ELVEN_MONARCH, genderhint: C.NEUTRAL  }, /* PM_HIGH_ELF is
                                                        * obsolete */
            /* other misspellings or incorrect words */
            { name: "wood-elf", pm_val: C.PM_WOODLAND_ELF, genderhint: C.NEUTRAL  },
            { name: "wood elf", pm_val: C.PM_WOODLAND_ELF, genderhint: C.NEUTRAL  },
            { name: "woodland nymph", pm_val: C.PM_WOOD_NYMPH, genderhint: C.NEUTRAL  },
            { name: "halfling", pm_val: C.PM_HOBBIT, genderhint: C.NEUTRAL  },    /* potential guess for
                                                    * polyself */
            { name: "genie", pm_val: C.PM_DJINNI, genderhint: C.NEUTRAL  }, /* potential guess for
                                              * ^G/#wizgenesis */
            /* prefix used to workaround duplicate monster names for
               monsters with alternate forms */
            { name: "human wererat", pm_val: C.PM_HUMAN_WERERAT, genderhint: C.NEUTRAL  },
            { name: "human werejackal", pm_val: C.PM_HUMAN_WEREJACKAL, genderhint: C.NEUTRAL  },
            { name: "human werewolf", pm_val: C.PM_HUMAN_WEREWOLF, genderhint: C.NEUTRAL  },
            /* for completeness */
            { name: "rat wererat", pm_val: C.PM_WERERAT, genderhint: C.NEUTRAL  },
            { name: "jackal werejackal", pm_val: C.PM_WEREJACKAL, genderhint: C.NEUTRAL  },
            { name: "wolf werewolf", pm_val: C.PM_WEREWOLF, genderhint: C.NEUTRAL  },
            /* Hyphenated names -- it would be nice to handle these via
               fuzzymatch() but it isn't able to ignore trailing stuff */
            { name: "ki rin", pm_val: C.PM_KI_RIN, genderhint: C.NEUTRAL  },
            { name: "kirin", pm_val: C.PM_KI_RIN, genderhint: C.NEUTRAL  },
            { name: "uruk hai", pm_val: C.PM_URUK_HAI, genderhint: C.NEUTRAL  },
            { name: "orc captain", pm_val: C.PM_ORC_CAPTAIN, genderhint: C.NEUTRAL  },
            { name: "woodland elf", pm_val: C.PM_WOODLAND_ELF, genderhint: C.NEUTRAL  },
            { name: "green elf", pm_val: C.PM_GREEN_ELF, genderhint: C.NEUTRAL  },
            { name: "grey elf", pm_val: C.PM_GREY_ELF, genderhint: C.NEUTRAL  },
            { name: "gray elf", pm_val: C.PM_GREY_ELF, genderhint: C.NEUTRAL  },
            { name: "elf lady", pm_val: C.PM_ELF_NOBLE, genderhint: C.FEMALE  },
            { name: "elf lord", pm_val: C.PM_ELF_NOBLE, genderhint: C.MALE  },
            { name: "elf noble", pm_val: C.PM_ELF_NOBLE, genderhint: C.NEUTRAL  },
            { name: "olog hai", pm_val: C.PM_OLOG_HAI, genderhint: C.NEUTRAL  },
            { name: "arch lich", pm_val: C.PM_ARCH_LICH, genderhint: C.NEUTRAL  },
            { name: "archlich", pm_val: C.PM_ARCH_LICH, genderhint: C.NEUTRAL  },
            /* Some irregular plurals */
            { name: "incubi", pm_val: C.PM_AMOROUS_DEMON, genderhint: C.MALE  },
            { name: "succubi", pm_val: C.PM_AMOROUS_DEMON, genderhint: C.FEMALE  },
            { name: "violet fungi", pm_val: C.PM_VIOLET_FUNGUS, genderhint: C.NEUTRAL  },
            { name: "homunculi", pm_val: C.PM_HOMUNCULUS, genderhint: C.NEUTRAL  },
            { name: "baluchitheria", pm_val: C.PM_BALUCHITHERIUM, genderhint: C.NEUTRAL  },
            { name: "lurkers above", pm_val: C.PM_LURKER_ABOVE, genderhint: C.NEUTRAL  },
            { name: "cavemen", pm_val: C.PM_CAVE_DWELLER, genderhint: C.MALE  },
            { name: "cavewomen", pm_val: C.PM_CAVE_DWELLER, genderhint: C.FEMALE  },
            { name: "watchmen", pm_val: C.PM_WATCHMAN, genderhint: C.NEUTRAL  },
            { name: "djinn", pm_val: C.PM_DJINNI, genderhint: C.NEUTRAL  },
            { name: "mumakil", pm_val: C.PM_MUMAK, genderhint: C.NEUTRAL  },
            { name: "erinyes", pm_val: C.PM_ERINYS, genderhint: C.NEUTRAL  },
            /* end of list */
            { name: 0, pm_val: C.NON_PM, genderhint: C.NEUTRAL  }
        ];
        let namep;

        for (namep = 0; names[namep].name; namep++) {
            len.value = C.int(C.strlen(names[namep].name));
            if (!C.strncmpi(str, names[namep].name, len.value)
                /* force full word (which could conceivably be possessive) */
                && (!C.loadChar(C.ptrAdd(str, len.value)) || C.loadChar(C.ptrAdd(str, len.value)) == ' '.charCodeAt(0) || C.loadChar(C.ptrAdd(str, len.value)) == '\''.charCodeAt(0))) {
                if (remainder_p)
                    remainder_p.value = C.ptrAdd(in_str, C.ptrDiff(C.ptrAdd(str, len.value), buf));
                if (gender_name_var)
                    gender_name_var.value = names[namep].genderhint;
                return names[namep].pm_val;
            }
        }
    }

    for (len.value = 0, i = C.LOW_PM; i < C.NUMMONS; i++) {
      for (mgend = C.MALE; mgend < C.NUM_MGENDERS; mgend++) {
        let m_i_len;

        if (!C.mons[i].pmnames[mgend])
            continue;

        m_i_len = C.strlen(C.mons[i].pmnames[mgend]);
        if (m_i_len > C.size_t(len.value)
            && !C.strncmpi(C.mons[i].pmnames[mgend], str, C.int(m_i_len))) {
            if (m_i_len == slen) {
                mntmp = i;
                len.value = C.int(m_i_len);
                matchgend = mgend;
                exact_match = 1;
                break; /* exact match */
            } else if (slen > m_i_len
                       && (C.loadChar(C.ptrAdd(str, m_i_len)) == ' '.charCodeAt(0)
                           || !C.strcmpi(C.ptrAdd(str, m_i_len), "s")
                           || !C.strncmpi(C.ptrAdd(str, m_i_len), "s ", 2)
                           || !C.strcmpi(C.ptrAdd(str, m_i_len), "'")
                           || !C.strncmpi(C.ptrAdd(str, m_i_len), "' ", 2)
                           || !C.strcmpi(C.ptrAdd(str, m_i_len), "'s")
                           || !C.strncmpi(C.ptrAdd(str, m_i_len), "'s ", 3)
                           || !C.strcmpi(C.ptrAdd(str, m_i_len), "es")
                           || !C.strncmpi(C.ptrAdd(str, m_i_len), "es ", 3))) {
                mntmp = i;
                len.value = C.int(m_i_len);
                matchgend = mgend;
            }
        }
      }
      if (exact_match)
        break;
    }
    /* FIXME: some titles have gender; title_to_mon() doesn't propagate it */
    if (mntmp == C.NON_PM)
        mntmp = C.title_to_mon(str, 0, len);
    if (len.value && remainder_p)
        remainder_p.value = C.ptrAdd(in_str, C.ptrDiff(C.ptrAdd(str, len.value), buf));
    if (gender_name_var && matchgend != -1) {
        /* don't override with neuter if caller has already specified male
           or female and we've matched the neuter name */
        if (gender_name_var.value == -1 || matchgend != C.NEUTRAL)
            gender_name_var.value = matchgend;
    }
    return mntmp;
}

/* monster class from user input; used for genocide and controlled polymorph;
   returns 0 rather than MAXMCLASSES if no match is found */
export function name_to_monclass(in_str, mndx_p)
{
    in_str = C.charPointer(in_str);
    /* Single letters are matched against def_monsyms[].sym; words
       or phrases are first matched against def_monsyms[].explain
       to check class description; if not found there, then against
       mons[].pmnames[] to test individual monster types.  Input can be a
       substring of the full description or pmname, but to be accepted,
       such partial matches must start at beginning of a word.  Some
       class descriptions include "foo or bar" and "foo or other foo"
       so we don't want to accept "or", "other", "or other" there. */
    const falsematch = [
        /* multiple-letter input which matches any of these gets rejected */
        "an", "the", "or", "other", "or other", 0
    ];
    /* positive pm_val => specific monster; negative => class */
    const truematch = [
        /* "long worm" won't match "worm" class but would accidentally match
           "long worm tail" class before the comparison with monster types */
        { name: "long worm", pm_val: C.PM_LONG_WORM, genderhint: C.NEUTRAL  },
        /* matches wrong--or at least suboptimal--class */
        { name: "demon", pm_val: -C.S_DEMON, genderhint: C.NEUTRAL  }, /* hits "imp or minor demon" */
        /* matches specific monster (overly restrictive) */
        { name: "devil", pm_val: -C.S_DEMON, genderhint: C.NEUTRAL  }, /* always "horned devil" */
        /* some plausible guesses which need help */
        { name: "bug", pm_val: -C.S_XAN, genderhint: C.NEUTRAL  },  /* would match bugbear... */
        { name: "fish", pm_val: -C.S_EEL, genderhint: C.NEUTRAL  }, /* wouldn't match anything */
        /* end of list */
        { name: 0, pm_val: C.NON_PM, genderhint: C.NEUTRAL }
    ];
    let p, x;
    let i, len;

    if (mndx_p)
        mndx_p.value = C.NON_PM; /* haven't [yet] matched a specific type */

    if (!in_str || !C.loadChar(in_str)) {
        /* empty input */
        return 0;
    } else if (!C.loadChar(C.ptrAdd(in_str, 1))) {
        /* single character */
        i = C.def_char_to_monclass(C.loadChar(in_str));
        if (i == C.S_MIMIC_DEF) { /* ']' -> 'm' */
            i = C.S_MIMIC;
        } else if (i == C.S_WORM_TAIL) { /* '~' -> 'w' */
            i = C.S_WORM;
            if (mndx_p)
                mndx_p.value = C.PM_LONG_WORM;
        } else if (i == C.MAXMCLASSES) /* maybe 'I' */
            i = (C.loadChar(in_str) == C.DEF_INVISIBLE) ? C.S_invisible : 0;
        return i;
    } else {
        /* multiple characters */
        if (!C.strcmpi(in_str, "long")) /* not enough to match "long worm" */
            return 0; /* avoid false whole-word match with "long worm tail" */
        in_str = C.makesingular(in_str);
        /* check for special cases */
        for (i = 0; falsematch[i]; i++)
            if (!C.strcmpi(in_str, falsematch[i]))
                return 0;
        for (i = 0; truematch[i].name; i++)
            if (!C.strcmpi(in_str, truematch[i].name)) {
                i = truematch[i].pm_val;
                if (i < 0)
                    return -i; /* class */
                if (mndx_p)
                    mndx_p.value = i; /* monster */
                return C.mons[i].mlet;
            }
        /* check monster class descriptions */
        len = C.int(C.strlen(in_str));
        for (i = 1; i < C.MAXMCLASSES; i++) {
            x = C.def_monsyms[i].explain;
            if ((p = C.strstri(x, in_str)) != 0 && (p == x || C.loadChar(C.ptrAdd(p, -1)) == ' '.charCodeAt(0))
                && (C.int(C.strlen(p)) >= len
                    && (C.loadChar(C.ptrAdd(p, len)) == '\0'.charCodeAt(0) || C.loadChar(C.ptrAdd(p, len)) == ' '.charCodeAt(0))))
                return i;
        }
        /* check individual species names */
        i = name_to_mon(in_str, 0);
        if (i != C.NON_PM) {
            if (mndx_p)
                mndx_p.value = i;
            return C.mons[i].mlet;
        }
    }
    return 0;
}

/* returns 3 values (0=male, 1=female, 2=none) */
export function gender(mtmp)
{
    if (C.is_neuter(mtmp.data))
        return 2;
    return mtmp.female;
}

/* Like gender(), but unseen humanoids are "it" rather than "he" or "she"
   and lower animals and such are "it" even when seen; hallucination might
   yield "they".  This is the one we want to use when printing messages. */
export function pronoun_gender(mtmp, pg_flags)
/* flags&1: 'no it' unless neuter,
                        * flags&2: random if hallucinating */
{
    pg_flags = C.uint(pg_flags);
    let override_vis = (pg_flags & C.PRONOUN_NO_IT) ? 1 : 0,
            hallu_rand = (pg_flags & C.PRONOUN_HALLU) ? 1 : 0;

    if (hallu_rand && C.Hallucination)
        return C.rn2(4, 1200, 'pronoun_gender'); /* 0..3 */
    if (!override_vis && !C.canspotmon(mtmp))
        return 2;
    if (C.is_neuter(mtmp.data))
        return 2;
    return (C.humanoid(mtmp.data) || (mtmp.data.geno & C.G_UNIQ)
            || C.type_is_pname(mtmp.data)) ? C.int(mtmp.female) : 2;
}

/* used for nearby monsters when you go to another level */
export function levl_follower(mtmp)
{
    if (C.samePtr(mtmp, C.u.usteed))
        return 1;

    /* Wizard with Amulet won't bother trying to follow across levels */
    if (mtmp.iswiz && C.mon_has_amulet(mtmp))
        return 0;
    /* some monsters will follow even while intending to flee from you */
    if (mtmp.mtame || mtmp.iswiz || C.is_fshk(mtmp))
        return 1;
    /* stalking types follow, but won't when fleeing unless you hold
       the Amulet */
    return C.boolean((mtmp.data.mflags2 & C.M2_STALK)
                      && (!mtmp.mflee || C.u.uhave.amulet));
}

export const grownups = [
    ['PM_CHICKATRICE', 'PM_COCKATRICE'],
    ['PM_LITTLE_DOG', 'PM_DOG'],
    ['PM_DOG', 'PM_LARGE_DOG'],
    ['PM_HELL_HOUND_PUP', 'PM_HELL_HOUND'],
    ['PM_WINTER_WOLF_CUB', 'PM_WINTER_WOLF'],
    ['PM_KITTEN', 'PM_HOUSECAT'],
    ['PM_HOUSECAT', 'PM_LARGE_CAT'],
    ['PM_PONY', 'PM_HORSE'],
    ['PM_HORSE', 'PM_WARHORSE'],
    ['PM_KOBOLD', 'PM_LARGE_KOBOLD'],
    ['PM_LARGE_KOBOLD', 'PM_KOBOLD_LEADER'],
    ['PM_GNOME', 'PM_GNOME_LEADER'],
    ['PM_GNOME_LEADER', 'PM_GNOME_RULER'],
    ['PM_DWARF', 'PM_DWARF_LEADER'],
    ['PM_DWARF_LEADER', 'PM_DWARF_RULER'],
    ['PM_MIND_FLAYER', 'PM_MASTER_MIND_FLAYER'],
    ['PM_ORC', 'PM_ORC_CAPTAIN'],
    ['PM_HILL_ORC', 'PM_ORC_CAPTAIN'],
    ['PM_MORDOR_ORC', 'PM_ORC_CAPTAIN'],
    ['PM_URUK_HAI', 'PM_ORC_CAPTAIN'],
    ['PM_SEWER_RAT', 'PM_GIANT_RAT'],
    ['PM_CAVE_SPIDER', 'PM_GIANT_SPIDER'],
    ['PM_OGRE', 'PM_OGRE_LEADER'],
    ['PM_OGRE_LEADER', 'PM_OGRE_TYRANT'],
    ['PM_ELF', 'PM_ELF_NOBLE'],
    ['PM_WOODLAND_ELF', 'PM_ELF_NOBLE'],
    ['PM_GREEN_ELF', 'PM_ELF_NOBLE'],
    ['PM_GREY_ELF', 'PM_ELF_NOBLE'],
    ['PM_ELF_NOBLE', 'PM_ELVEN_MONARCH'],
    ['PM_LICH', 'PM_DEMILICH'],
    ['PM_DEMILICH', 'PM_MASTER_LICH'],
    ['PM_MASTER_LICH', 'PM_ARCH_LICH'],
    ['PM_VAMPIRE', 'PM_VAMPIRE_LEADER'],
    ['PM_BAT', 'PM_GIANT_BAT'],
    ['PM_BABY_GRAY_DRAGON', 'PM_GRAY_DRAGON'],
    ['PM_BABY_GOLD_DRAGON', 'PM_GOLD_DRAGON'],
    ['PM_BABY_SILVER_DRAGON', 'PM_SILVER_DRAGON'],
/* DEFERRED */
    ['PM_BABY_RED_DRAGON', 'PM_RED_DRAGON'],
    ['PM_BABY_WHITE_DRAGON', 'PM_WHITE_DRAGON'],
    ['PM_BABY_ORANGE_DRAGON', 'PM_ORANGE_DRAGON'],
    ['PM_BABY_BLACK_DRAGON', 'PM_BLACK_DRAGON'],
    ['PM_BABY_BLUE_DRAGON', 'PM_BLUE_DRAGON'],
    ['PM_BABY_GREEN_DRAGON', 'PM_GREEN_DRAGON'],
    ['PM_BABY_YELLOW_DRAGON', 'PM_YELLOW_DRAGON'],
    ['PM_RED_NAGA_HATCHLING', 'PM_RED_NAGA'],
    ['PM_BLACK_NAGA_HATCHLING', 'PM_BLACK_NAGA'],
    ['PM_GOLDEN_NAGA_HATCHLING', 'PM_GOLDEN_NAGA'],
    ['PM_GUARDIAN_NAGA_HATCHLING', 'PM_GUARDIAN_NAGA'],
    ['PM_SMALL_MIMIC', 'PM_LARGE_MIMIC'],
    ['PM_LARGE_MIMIC', 'PM_GIANT_MIMIC'],
    ['PM_BABY_LONG_WORM', 'PM_LONG_WORM'],
    ['PM_BABY_PURPLE_WORM', 'PM_PURPLE_WORM'],
    ['PM_BABY_CROCODILE', 'PM_CROCODILE'],
    ['PM_SOLDIER', 'PM_SERGEANT'],
    ['PM_SERGEANT', 'PM_LIEUTENANT'],
    ['PM_LIEUTENANT', 'PM_CAPTAIN'],
    ['PM_WATCHMAN', 'PM_WATCH_CAPTAIN'],
    ['PM_ALIGNED_CLERIC', 'PM_HIGH_CLERIC'],
    ['PM_STUDENT', 'PM_ARCHEOLOGIST'],
    ['PM_ATTENDANT', 'PM_HEALER'],
    ['PM_PAGE', 'PM_KNIGHT'],
    ['PM_ACOLYTE', 'PM_CLERIC'],
    ['PM_APPRENTICE', 'PM_WIZARD'],
    ['PM_MANES', 'PM_LEMURE'],
    ['PM_KEYSTONE_KOP', 'PM_KOP_SERGEANT'],
    ['PM_KOP_SERGEANT', 'PM_KOP_LIEUTENANT'],
    ['PM_KOP_LIEUTENANT', 'PM_KOP_KAPTAIN'],
    ['NON_PM', 'NON_PM']
];

export function little_to_big(montype)
{
    montype = C.int(montype);
    let i;

    for (i = 0; C.grownups[i][0] >= C.LOW_PM; i++)
        if (montype == C.grownups[i][0]) {
            montype = C.grownups[i][1];
            break;
        }
    return montype;
}

export function big_to_little(montype)
{
    montype = C.int(montype);
    let i;

    for (i = 0; C.grownups[i][0] >= C.LOW_PM; i++)
        if (montype == C.grownups[i][1]) {
            montype = C.grownups[i][0];
            break;
        }
    return montype;
}

/* determine whether two permonst indices are part of the same progression;
   existence of progressions with more than one step makes it a bit tricky */
export function big_little_match(montyp1, montyp2)
{
    montyp1 = C.int(montyp1);
    montyp2 = C.int(montyp2);
    let l, b;

    /* simplest case: both are same pm */
    if (montyp1 == montyp2)
        return 1;
    /* assume it isn't possible to grow from one class letter to another */
    if (C.mons[montyp1].mlet != C.mons[montyp2].mlet)
        return 0;
    /* check whether montyp1 can grow up into montyp2 */
    for (l = montyp1; (b = little_to_big(l)) != l; l = b)
        if (b == montyp2)
            return 1;
    /* check whether montyp2 can grow up into montyp1 */
    for (l = montyp2; (b = little_to_big(l)) != l; l = b)
        if (b == montyp1)
            return 1;
    /* neither grows up to become the other; no match */
    return 0;
}

/*
 * Return the permonst ptr for the race of the monster.
 * Returns correct pointer for non-polymorphed and polymorphed
 * player.  It does not return a pointer to player role character.
 */
export function raceptr(mtmp)
{
    if (C.samePtr(mtmp, C.gy.youmonst) && !C.Upolyd)
        return C.mons[C.gu.urace.mnum];
    return mtmp.data;
}


export const levitate = [ "float", "Float", "wobble", "Wobble" ],
                 flys = [ "fly", "Fly", "flutter", "Flutter" ],
                 flyl = [ "fly", "Fly", "stagger", "Stagger" ],
                 slither = [ "slither", "Slither", "falter", "Falter" ],
                 /* it would be useful to incorporate "swim" but we lack
                  * sufficient information to know whether water is involved
                 swim = { "swim", "Swim", "flop", "Flop" },
                  */
                 ooze = [ "ooze", "Ooze", "tremble", "Tremble" ],
                 immobile = [ "wiggle", "Wiggle", "pulsate", "Pulsate" ],
                 crawl = [ "crawl", "Crawl", "falter", "Falter" ];

export function locomotion(ptr, def)
{
    def = C.charPointer(def);
    let locoindx = (C.loadChar(def) != C.highc(C.loadChar(def))) ? 0 : 1;

    return (C.is_floater(ptr) ? C.levitate[locoindx]
            : (C.is_flyer(ptr) && ptr.msize <= C.MZ_SMALL) ? C.flys[locoindx]
              : (C.is_flyer(ptr) && ptr.msize > C.MZ_SMALL) ? C.flyl[locoindx]
                : C.slithy(ptr) ? C.slither[locoindx]
                  : C.amorphous(ptr) ? C.ooze[locoindx]
                    : !ptr.mmove ? C.immobile[locoindx]
                      : C.nolimbs(ptr) ? C.crawl[locoindx]
                        : def);
}

export function stagger(ptr, def)
{
    def = C.charPointer(def);
    let locoindx = (C.loadChar(def) != C.highc(C.loadChar(def))) ? 2 : 3;

    return (C.is_floater(ptr) ? C.levitate[locoindx]
            : (C.is_flyer(ptr) && ptr.msize <= C.MZ_SMALL) ? C.flys[locoindx]
              : (C.is_flyer(ptr) && ptr.msize > C.MZ_SMALL) ? C.flyl[locoindx]
                : C.slithy(ptr) ? C.slither[locoindx]
                  : C.amorphous(ptr) ? C.ooze[locoindx]
                    : !ptr.mmove ? C.immobile[locoindx]
                      : C.nolimbs(ptr) ? C.crawl[locoindx]
                        : def);
}

/* return phrase describing the effect of fire attack on a type of monster */
export function on_fire(mptr, mattk)
{
    let what;

    switch (C.monsndx(mptr)) {
    case C.PM_FLAMING_SPHERE:
    case C.PM_FIRE_VORTEX:
    case C.PM_FIRE_ELEMENTAL:
    case C.PM_SALAMANDER:
        what = "already on fire";
        break;
    case C.PM_WATER_ELEMENTAL:
    case C.PM_FOG_CLOUD:
    case C.PM_STEAM_VORTEX:
        what = "boiling";
        break;
    case C.PM_ICE_VORTEX:
    case C.PM_GLASS_GOLEM:
        what = "melting";
        break;
    case C.PM_STONE_GOLEM:
    case C.PM_CLAY_GOLEM:
    case C.PM_GOLD_GOLEM:
    case C.PM_AIR_ELEMENTAL:
    case C.PM_EARTH_ELEMENTAL:
    case C.PM_DUST_VORTEX:
    case C.PM_ENERGY_VORTEX:
        what = "heating up";
        break;
    default:
        what = (mattk.aatyp == C.AT_HUGS) ? "being roasted" : "on fire";
        break;
    }
    return C.charPointer(what);
}

/* similar to on_fire(); creature is summoned in a cloud of <something> */
export function msummon_environ(mptr, cloud)
{
    let what;
    let mndx = ((mptr.mlet == C.S_ANGEL) ? C.PM_ANGEL
                : (mptr.mlet == C.S_LIGHT) ? C.PM_YELLOW_LIGHT
                  : C.monsndx(mptr));

    cloud.value = "cloud"; /* default is "cloud of <something>" */
    switch (mndx) {
    case C.PM_WATER_DEMON:
    case C.PM_AIR_ELEMENTAL:
    case C.PM_WATER_ELEMENTAL:
    case C.PM_FOG_CLOUD:
    case C.PM_ICE_VORTEX:
    case C.PM_FREEZING_SPHERE:
        what = "vapor";
        break;
    case C.PM_STEAM_VORTEX:
        what = "steam";
        break;
    case C.PM_ENERGY_VORTEX:
    case C.PM_SHOCKING_SPHERE:
        cloud.value = "shower"; /* "shower of sparks" instead of "cloud of..." */
        what = "sparks";
        break;
    case C.PM_EARTH_ELEMENTAL:
    case C.PM_DUST_VORTEX:
        what = "dust";
        break;
    case C.PM_FIRE_ELEMENTAL:
    case C.PM_FIRE_VORTEX:
    case C.PM_FLAMING_SPHERE:
    /*case PM_SALAMANDER:*/
        cloud.value = "ball"; /* "ball of flame" instead of "cloud of..." */
        what = "flame";
        break;
    case C.PM_ANGEL: /* actually any 'A'-class */
    case C.PM_YELLOW_LIGHT: /* any 'y'-class */
        cloud.value = "flash"; /* "flash of light" instead of "cloud of..." */
        what = "light";
        break;
    default:
        what = "smoke";
        break;
    }
    return C.charPointer(what);
}

/*
 * Returns:
 *      True if monster is presumed to have a sense of smell.
 *      False if monster definitely does not have a sense of smell.
 *
 * Do not base this on presence of a head or nose, since many
 * creatures sense smells other ways (feelers, forked-tongues, etc).
 * We're assuming all insects can smell at a distance too.
 */
export function olfaction(mdat)
{
    if (C.is_golem(mdat)
        || mdat.mlet == C.S_EYE /* spheres  */
        || mdat.mlet == C.S_JELLY || mdat.mlet == C.S_PUDDING
        || mdat.mlet == C.S_BLOB || mdat.mlet == C.S_VORTEX
        || mdat.mlet == C.S_ELEMENTAL
        || mdat.mlet == C.S_FUNGUS /* mushrooms and fungi */
        || mdat.mlet == C.S_LIGHT)
        return 0;
    return 1;
}

/* Convert attack damage type AD_foo to M_SEEN_bar */
export function cvt_adtyp_to_mseenres(adtyp)
{
    adtyp = C.uchar(adtyp);
    switch (adtyp) {
    case C.AD_MAGM: return C.M_SEEN_MAGR;
    case C.AD_FIRE: return C.M_SEEN_FIRE;
    case C.AD_COLD: return C.M_SEEN_COLD;
    case C.AD_SLEE: return C.M_SEEN_SLEEP;
    case C.AD_DISN: return C.M_SEEN_DISINT;
    case C.AD_ELEC: return C.M_SEEN_ELEC;
    case C.AD_DRST: return C.M_SEEN_POISON;
    case C.AD_ACID: return C.M_SEEN_ACID;
    /* M_SEEN_REFL has no corresponding AD_foo type */
    default: return C.M_SEEN_NOTHING;
    }
}

/* Convert property resistance to M_SEEN_bar */
export function cvt_prop_to_mseenres(prop)
{
    prop = C.uchar(prop);
    switch (prop) {
    case C.ANTIMAGIC: return C.M_SEEN_MAGR;
    case C.FIRE_RES: return C.M_SEEN_FIRE;
    case C.COLD_RES: return C.M_SEEN_COLD;
    case C.SLEEP_RES: return C.M_SEEN_SLEEP;
    case C.DISINT_RES: return C.M_SEEN_DISINT;
    case C.POISON_RES: return C.M_SEEN_POISON;
    case C.SHOCK_RES: return C.M_SEEN_ELEC;
    case C.ACID_RES: return C.M_SEEN_ACID;
    case C.REFLECTING: return C.M_SEEN_REFL;
    default: return C.M_SEEN_NOTHING;
    }
}

/* Monsters in line of sight remember hero resisting effect M_SEEN_foo */
export function monstseesu(seenres)
{
    seenres = C.ulong(seenres);
    let mtmp;

    if (seenres == C.M_SEEN_NOTHING || C.u.uswallow)
        return;

    for (mtmp = C.fmon; mtmp; mtmp = mtmp.nmon)
        if (!C.DEADMONSTER(mtmp) && C.m_canseeu(mtmp))
            C.m_setseenres(mtmp, seenres);
}

/* Monsters in line of sight forget hero resistance to M_SEEN_foo */
export function monstunseesu(seenres)
{
    seenres = C.ulong(seenres);
    let mtmp;

    if (seenres == C.M_SEEN_NOTHING || C.u.uswallow)
        return;

    for (mtmp = C.fmon; mtmp; mtmp = mtmp.nmon)
        if (!C.DEADMONSTER(mtmp) && C.m_canseeu(mtmp))
            C.m_clearseenres(mtmp, seenres);
}

/* give monster mtmp the same intrinsics hero has */
export function give_u_to_m_resistances(mtmp)
{
    let intr;

    /* convert the hero's current set of intrinsics to their monster
       equivalents -- FIRE_RES to MR_FIRE, COLD_RES to MR_COLD, etc -- and
       add each to the mintrinsics field for the given monster */
    for (intr = C.FIRE_RES; intr <= C.STONE_RES; intr++) {
        if ((C.u.uprops[intr].intrinsic & C.INTRINSIC) != 0n) {
            mtmp.mintrinsics |= C.ushort(C.res_to_mr(intr));
        }
    }
}

/* Can monster resist conflict caused by hero?

   High-CHA heroes will be able to 'convince' monsters
   (through the magic of the ring, of course) to fight
   for them much more easily than low-CHA ones.
*/
export function resist_conflict(mtmp)
{
    /* always a small chance at 19 */
    let resist_chance = (19 < (C.ACURR(C.A_CHA) - mtmp.m_lev + C.u.ulevel))
                       ? 19 : (C.ACURR(C.A_CHA) - mtmp.m_lev + C.u.ulevel);

    return (C.rnd(20, 1612, 'resist_conflict') > resist_chance);
}

/* does monster mtmp know traps of type ttyp */
export function mon_knows_traps(mtmp, ttyp)
{
    ttyp = C.int(ttyp);
    if (ttyp == C.ALL_TRAPS)
        return C.boolean(mtmp.mtrapseen);
    else if (ttyp == C.NO_TRAP)
        return !C.boolean(mtmp.mtrapseen);
    else
        return ((mtmp.mtrapseen & (C.long(1n << BigInt(ttyp - 1)))) != 0);
}

/* monster mtmp learns all traps of type ttyp */
export function mon_learns_traps(mtmp, ttyp)
{
    ttyp = C.int(ttyp);
    if (ttyp == C.ALL_TRAPS)
        mtmp.mtrapseen = ~0n;
    else if (ttyp == C.NO_TRAP)
        mtmp.mtrapseen = 0n;
    else
        mtmp.mtrapseen |= (C.long(1n << BigInt(ttyp - 1)));
}

/* monsters see a trap trigger, and remember it */
export function mons_see_trap(ttmp)
{
    let mtmp;
    let tx = ttmp.tx, ty = ttmp.ty;
    let maxdist = C.levl[tx][ty].lit ? 7*7 : 2;

    for (mtmp = C.fmon; mtmp; mtmp = mtmp.nmon) {
        if (C.is_animal(mtmp.data) || C.mindless(mtmp.data)
            || !C.haseyes(mtmp.data) || !mtmp.mcansee)
            continue;
        if (C.dist2(mtmp.mx, mtmp.my, tx, ty) > maxdist)
            continue;
        if (!C.m_cansee(mtmp, tx, ty))
            continue;
        mon_learns_traps(mtmp, ttmp.ttyp);
    }
}

export function get_atkdam_type(adtyp)
{
    adtyp = C.int(adtyp);
    if (adtyp == C.AD_RBRE) {
        const rnd_breath_typ = [
            C.AD_MAGM, C.AD_FIRE, C.AD_COLD, C.AD_SLEE,
            C.AD_DISN, C.AD_ELEC, C.AD_DRST, C.AD_ACID ];
        return rnd_breath_typ[C.rn2(rnd_breath_typ.length, 1666, 'get_atkdam_type')];
    }
    return adtyp;
}

/*mondata.c*/

