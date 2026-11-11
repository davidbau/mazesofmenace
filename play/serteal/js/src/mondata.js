/* NetHack 5.0	mondata.c	$NHDT-Date: 1738638877 2025/02/03 19:14:37 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.140 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Robert Patrick Rankin, 2011. */
/* NetHack may be freely redistributed.  See license for details. */

// #include "hack.h"
/*
 *      These routines provide basic data for any type of monster.
 */

/* set up an individual monster's base type (initial creation, shapechange) */
export function /* void */
set_mon_data(mon, ptr)
{
    let new_speed, old_speed = mon.data ? mon.data.mmove : 0;
    let movement_p = (mon == gy.youmonst) ? ref_of(u, "umovement") : ref_of(mon, "movement");

    mon.data = ptr;
    mon.mnum = short(monsndx(ptr));

    if (movement_p[0]) { /* used to adjust poly'd hero as well as monsters */
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
            movement_p[0] *= new_speed;
            if (old_speed > 0) /* old > new and new >= 0, so always True */
                movement_p[0] = Math.trunc(movement_p[0] / old_speed);
        }
    }
    return;
}

/* does monster-type have any attack for a specific type of damage? */
export function /* struct attack * */
attacktype_fordmg(ptr, atyp, dtyp)
{
    let a;

    for (a = ptr_add(ptr.mattk[0], 0); a < ptr_add(ptr.mattk[0], NATTK); a = ptr_add(a, 1))
        if (a.aatyp == atyp && (dtyp == AD_ANY || a.adtyp == dtyp))
            return a;
    return null;
}

/* does monster-type have a particular type of attack */
export function /* boolean */
attacktype(ptr, atyp)
{
    return attacktype_fordmg(ptr, atyp, AD_ANY) ? TRUE : FALSE;
}

/* returns True if monster doesn't attack, False if it does */
export function /* boolean */
noattacks(ptr)
{
    let i;
    let mattk = ptr.mattk[0];

    for (i = 0; i < NATTK; i++) {
        /* AT_BOOM "passive attack" (gas spore's explosion upon death)
           isn't an attack as far as our callers are concerned */
        if (ptr_add(mattk, i).aatyp == AT_BOOM)
            continue;

        if (ptr_add(mattk, i).aatyp)
            return FALSE;
    }
    return TRUE;
}

/* does monster-type transform into something else when petrified? */
export function /* boolean */
poly_when_stoned(ptr)
{
    /* non-stone golems turn into stone golems unless latter is genocided */
    return (+(is_golem(ptr) && ptr != mons[PM_STONE_GOLEM]
                      && !(svm.mvitals[PM_STONE_GOLEM].mvflags & G_GENOD)));
    /* allow G_EXTINCT */
}

/* is 'mon' (possibly youmonst) protected against damage type 'adtype' via
   wielded weapon or worn dragon scales? [or by virtue of being a dragon?] */
export function /* boolean */
defended(mon, adtyp)
{ const $frame = stack_frame(); try {
    let o, otemp = stack_struct(struct_obj);
    let mndx;
    let is_you = (+(mon == gy.youmonst));

    /* is 'mon' wielding an artifact that protects against 'adtyp'? */
    o = is_you ? uwep : MON_WEP(mon);
    if (o && o.oartifact && defends(adtyp, o))
        return TRUE;

    /* if 'mon' is an adult dragon, treat it as if it was wearing scales
       so that it has the same benefit as a hero wearing dragon scales */
    mndx = monsndx(mon.data);
    if (mndx >= PM_GRAY_DRAGON && mndx <= PM_YELLOW_DRAGON) {
        /* a dragon is its own suit...  if mon is poly'd hero, we don't
           care about embedded scales (uskin) because being a dragon with
           embedded scales is no better than just being a dragon */
        struct_assign(otemp, cg.zeroobj);
        otemp.oclass = ARMOR_CLASS;
        otemp.otyp = GRAY_DRAGON_SCALES + (mndx - PM_GRAY_DRAGON);
        /* defends() and Is_dragon_armor() only care about otyp so ignore
           the rest of otemp's fields */
        o = otemp;
    } else {
        /* ordinary case: not an adult dragon */
        o = is_you ? uarm : which_armor(mon, W_ARM);
    }
    /* is 'mon' wearing dragon scales that protect against 'adtyp'? */
    if (o && Is_dragon_armor(o) && defends(adtyp, o))
        return TRUE;

    return FALSE;
} finally { stack_pop($frame); } }

/* returns True if monster resists particular elemental damage;
   handles 'carry' effects of artifacts as well as worn/wielded items */
export function /* boolean */
Resists_Elem(mon, propindx)
{
    let o;
    let slotmask;
    let is_you = (+(mon == gy.youmonst));
    let u_resist = 0, damgtype = 0, rsstmask = 0;

    /*
     * Main damage/resistance types, mostly matching dragon breath values.
     *  propindx = property index, fire (1), cold, (2) through stone (8);
     *  damgtype = damage type, 2 through 9 (0 and 1 aren't used here);
     *  rsstmask = resistance mask, 1, 2, 4, ..., 64, 128.
     */

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
        u_resist = ((u.uprops[propindx].intrinsic
                   || u.uprops[propindx].extrinsic) ? 1 : 0);
        break;

    /* accept these, but we expect callers to use their routines directly */
    case ANTIMAGIC:
        return resists_magm(mon);
    case DRAIN_RES:
        return resists_drli(mon);
    case BLND_RES:
        return resists_blnd(mon);

    default:
        impossible(_("Resists_Elem(%d), unexpected property type"), propindx);
        return FALSE;
    }

    if (is_you ? u_resist : ((mon_resistancebits(mon) & rsstmask) != 0))
        return TRUE;
    /* check for resistance granted by wielded weapon */
    o = is_you ? uwep : MON_WEP(mon);
    if (o && o.oartifact && defends(damgtype, o))
        return TRUE;
    /* check for resistance granted by worn or carried items */
    o = is_you ? gi.invent : mon.minvent;
    slotmask = W_ARMOR | W_ACCESSORY;
    if (!is_you /* assumes monsters don't wield non-weapons */
        || (uwep && (uwep.oclass == WEAPON_CLASS || is_weptool(uwep))))
        slotmask = or64(slotmask, W_WEP);
    if (is_you && u.twoweap)
        slotmask = or64(slotmask, W_SWAPWEP);
    for (; o; o = o.nobj)
        if (((o.owornmask & slotmask) != 0
             && objects[o.otyp].oc_oprop == propindx)
            || ((o.owornmask & W_ARMC) == W_ARMC
                /* worn apron confers a pair of resistances but
                   objects[ALCHEMY_SMOCK].oc_oprop can only represent one;
                   we check both so won't need to know which one that is */
                && o.otyp == ALCHEMY_SMOCK
                && (propindx == POISON_RES || propindx == ACID_RES))
            || (o.oartifact && defends_when_carried(damgtype, o)))
            return TRUE;
    return FALSE;
}

/* returns True if monster is drain-life resistant */
export function /* boolean */
resists_drli(mon)
{
    let ptr = mon.data;

    if (is_undead(ptr) || is_demon(ptr) || is_were(ptr)
        /* is_were() doesn't handle hero in human form */
        || (mon == gy.youmonst && u.ulycn >= LOW_PM)
        || ptr == mons[PM_DEATH] || is_vampshifter(mon))
        return TRUE;
    return defended(mon, AD_DRLI);
}

/* True if monster is magic-missile (actually, general magic) resistant */
export function /* boolean */
resists_magm(mon)
{
    let ptr = mon.data;
    let is_you = (+(mon == gy.youmonst));
    let slotmask;
    let o;

    /* as of 3.2.0:  gray dragons, Angels, Oracle, Yeenoghu */
    if (dmgtype(ptr, AD_MAGM) || ptr == mons[PM_BABY_GRAY_DRAGON]
        || dmgtype(ptr, AD_RBRE)) /* Chromatic Dragon */
        return TRUE;
    /* check for magic resistance granted by wielded weapon */
    o = is_you ? uwep : MON_WEP(mon);
    if (o && o.oartifact && defends(AD_MAGM, o))
        return TRUE;
    /* check for magic resistance granted by worn or carried items */
    o = is_you ? gi.invent : mon.minvent;
    slotmask = W_ARMOR | W_ACCESSORY;
    if (!is_you /* assumes monsters don't wield non-weapons */
        || (uwep && (uwep.oclass == WEAPON_CLASS || is_weptool(uwep))))
        slotmask = or64(slotmask, W_WEP);
    if (is_you && u.twoweap)
        slotmask = or64(slotmask, W_SWAPWEP);
    for (; o; o = o.nobj)
        if (((o.owornmask & slotmask) != 0
             && objects[o.otyp].oc_oprop == ANTIMAGIC)
            || (o.oartifact && defends_when_carried(AD_MAGM, o)))
            return TRUE;
    return FALSE;
}

/* True if monster is resistant to light-induced blindness */
export function /* boolean */
resists_blnd(mon)
{
    let ptr = mon.data;
    let is_you = (+(mon == gy.youmonst));

    if (is_you ? (Blind() || Unaware())
               : (mon.mblinded || !mon.mcansee || !haseyes(ptr)
                  /* BUG: temporary sleep sets mfrozen, but since
                          paralysis does too, we can't check it */
                  || mon.msleeping))
        return TRUE;
    /* yellow light, Archon; !dust vortex, !cobra, !raven */
    if (dmgtype_fromattack(ptr, AD_BLND, AT_EXPL)
        || dmgtype_fromattack(ptr, AD_BLND, AT_GAZE))
        return TRUE;
    /* Sunsword */
    if (resists_blnd_by_arti(mon))
        return TRUE;
    /* catchall */
    if (is_you && Blnd_resist()) {
        impossible(_("'Blnd_resist' but not resists_blnd()?"));
        return TRUE;
    }
    return FALSE;
}

/* True iff monster is resistant to light-induced blindness due to worn
   or wielded magical equipment (used to decide whether to show sparkle
   animation when resisting) */
export function /* boolean */
resists_blnd_by_arti(mon)
{
    let o;
    let is_you = (+(mon == gy.youmonst));

    o = is_you ? uwep : MON_WEP(mon);
    if (o && o.oartifact && defends(AD_BLND, o))
        return TRUE;
    o = is_you ? gi.invent : mon.minvent;
    for (; o; o = o.nobj)
        if (defends_when_carried(AD_BLND, o))
            return TRUE;







    return FALSE;
}

/* True iff monster can be blinded by the given attack;
   note: may return True when mdef is blind (e.g. new cream-pie attack)
   magr can be NULL.
*/
export function /* boolean */
can_blnd(
    magr,
    mdef,
    aatyp,
    obj) /* aatyp == AT_WEAP, AT_SPIT */
{
    let is_you = (+(mdef == gy.youmonst));
    let check_visor = FALSE;
    let o;

    /* no eyes protect against all attacks for now */
    if (!haseyes(mdef.data))
        return FALSE;

    /* if monster has been permanently blinded, the deed is already done */
    if (!is_you && mon_perma_blind(mdef))
        return FALSE;

    /* /corvus oculum corvi non eruit/
       a saying expressed in Latin rather than a zoological observation:
       "a crow will not pluck out the eye of another crow"
       so prevent ravens from blinding each other */
    if (magr && magr.data == mons[PM_RAVEN] && mdef.data == mons[PM_RAVEN])
        return FALSE;

    switch (aatyp) {
    case AT_EXPL:
    case AT_BOOM:
    case AT_GAZE:
    case AT_MAGC:
    case AT_BREA: /* assumed to be lightning */
        /* light-based attacks may be cancelled or resisted */
        if (magr && magr.mcan)
            return FALSE;
        return +!resists_blnd(mdef);

    case AT_WEAP:
    case AT_SPIT:
    case AT_NONE:
        /* an object is used (thrown/spit/other) */
        if (obj && (obj.otyp == CREAM_PIE)) {
            if (is_you && Blindfolded())
                return FALSE;
        } else if (obj && (obj.otyp == BLINDING_VENOM)) {
            /* all ublindf, including LENSES, protect, cream-pies too */
            if (is_you && (ublindf || u.ucreamed))
                return FALSE;
            check_visor = TRUE;
        } else if (obj && (obj.otyp == POT_BLINDNESS)) {
            return TRUE; /* no defense */
        } else
            return FALSE; /* other objects cannot cause blindness yet */
        if ((magr == gy.youmonst) && u.uswallow)
            return FALSE; /* can't affect eyes while inside monster */
        break;

    case AT_ENGL:
        if (is_you && (Blindfolded() || Unaware() || u.ucreamed))
            return FALSE;
        if (!is_you && mdef.msleeping)
            return FALSE;
        break;

    case AT_CLAW:
        /* e.g. raven: all ublindf, including LENSES, protect */
        if (is_you && ublindf)
            return FALSE;
        if ((magr == gy.youmonst) && u.uswallow)
            return FALSE; /* can't affect eyes while inside monster */
        check_visor = TRUE;
        break;

    case AT_TUCH:
    case AT_STNG:
        /* some physical, blind-inducing attacks can be cancelled */
        if (magr && magr.mcan)
            return FALSE;
        break;

    default:
        break;
    }

    /* check if wearing a visor (only checked if visor might help) */
    if (check_visor) {
        o = (mdef == gy.youmonst) ? gi.invent : mdef.minvent;
        for (; o; o = o.nobj)
            if ((o.owornmask & W_ARMH)
                && objdescr_is(o, _("visored helmet")))
                return FALSE;
    }

    return TRUE;
}

/* returns True if monster can attack at range */
export function /* boolean */
ranged_attk(ptr)
{
    let i;

    for (i = 0; i < NATTK; i++)
        if (DISTANCE_ATTK_TYPE(ptr.mattk[i].aatyp))
            return TRUE;
    return FALSE;
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
export function /* int */
mstrength(ptr)
{
    let i, tmp2, n, tmp = ptr.mlevel;

    if (tmp > 49) /* special fixed hp monster */
        tmp = Math.trunc(2 * (tmp - 6) / 4);

    /* for creation in groups */
    n = (+!!(ptr.geno & G_SGROUP));
    n += (+!!(ptr.geno & G_LGROUP)) << 1;

    /* for ranged attacks */
    if (mstrength_ranged_attk(ptr))
        n++;

    /* for higher ac values */
    n += (+(ptr.ac < 4));
    n += (+(ptr.ac < 0));

    /* for very fast monsters */
    n += (+(ptr.mmove >= 18));

    /* for each attack and "special" attack */
    for (i = 0; i < NATTK; i++) {
        tmp2 = ptr.mattk[i].aatyp;
        n += (+(tmp2 > 0));
        n += (+(tmp2 == AT_MAGC));
        n += (((tmp2 == AT_WEAP && (ptr.mflags2 & M2_STRONG)) ? 1 : 0));
        if (tmp2 == AT_EXPL) {
            let tmp3 = ptr.mattk[i].adtyp;
            /* {freezing,flaming,shocking} spheres are fairly weak but
               can destroy equipment; {yellow,black} lights can't */
            n += ((tmp3 == AD_COLD || tmp3 == AD_FIRE) ? 3
                  : (tmp3 == AD_ELEC) ? 5
                    : 0);
        }
    }

    /* for each "special" damage type */
    for (i = 0; i < NATTK; i++) {
        tmp2 = ptr.mattk[i].adtyp;
        if ((tmp2 == AD_DRLI) || (tmp2 == AD_STON) || (tmp2 == AD_DRST)
            || (tmp2 == AD_DRDX) || (tmp2 == AD_DRCO) || (tmp2 == AD_WERE))
            n += 2;
        else if (strcmp(ptr.pmnames[NEUTRAL], _("grid bug")))
            n += (+(tmp2 != AD_PHYS));
        n += (+((ptr.mattk[i].damd * ptr.mattk[i].damn) > 23));
    }

    /* Leprechauns are a special case.  They have many hit dice so they can
       hit and are hard to kill, but they don't really do much damage. */
    if (!strcmp(ptr.pmnames[NEUTRAL], _("leprechaun")))
        n -= 2;

    /* despite group and poison increments, soldier ants and killer bees are
       underestimated by the formula, so have an artificial +1 difficulty */
    if (!strcmp(ptr.pmnames[NEUTRAL], _("killer bee")) ||
        !strcmp(ptr.pmnames[NEUTRAL], _("soldier ant")))
        n += 2; /* +1 after 'tmp += n/2' below */

    /* finally, adjust the monster level  0 <= n <= 24 (approx.) */
    if (n == 0)
        tmp -= 1;
    else if (n < 6)
        tmp += (Math.trunc(n / 3) + 1);
    else
        tmp += (Math.trunc(n / 2));

    return (tmp >= 0) ? tmp : 0;
}

/* returns True if monster can attack at range */
function /* boolean */
mstrength_ranged_attk(ptr)
{
    let i, j;
    let atk_mask = (1 << AT_BREA) | (1 << AT_SPIT) | (1 << AT_GAZE);

    for (i = 0; i < NATTK; i++) {
        if ((j = ptr.mattk[i].aatyp) >= AT_WEAP
            || (j < 32 && (atk_mask & (1 << j)) != 0))
            return TRUE;
    }
    return FALSE;
}


/* True if specific monster is especially affected by silver weapons */
export function /* boolean */
mon_hates_silver(mon)
{
    return (((is_vampshifter(mon) || hates_silver(mon.data)) ? 1 : 0));
}

/* True if monster-type is especially affected by silver weapons */
export function /* boolean */
hates_silver(ptr)
{
    return (+(is_were(ptr) || ptr.mlet == S_VAMPIRE || is_demon(ptr)
                      || ptr == mons[PM_SHADE]
                      || (ptr.mlet == S_IMP && ptr != mons[PM_TENGU])));
}

/* True if specific monster is especially affected by blessed objects */
export function /* boolean */
mon_hates_blessings(mon)
{
    return (((is_vampshifter(mon) || hates_blessings(mon.data)) ? 1 : 0));
}

/* True if monster-type is especially affected by blessed objects */
export function /* boolean */
hates_blessings(ptr)
{
    return (+(is_undead(ptr) || is_demon(ptr)));
}

/* True if specific monster is especially affected by light-emitting weapons */
export function /* boolean */
mon_hates_light(mon)
{
    return hates_light(mon.data);
}

/* True iff the type of monster pass through iron bars */
export function /* boolean */
passes_bars(mptr)
{
    return (((passes_walls(mptr) || amorphous(mptr) || unsolid(mptr)
                      || is_whirly(mptr) || verysmall(mptr)
                      /* rust monsters and some puddings can destroy bars */
                      || dmgtype(mptr, AD_RUST) || dmgtype(mptr, AD_CORR)
                      /* rock moles can eat bars */
                      || metallivorous(mptr)
                      || (slithy(mptr) && !bigmonst(mptr))) ? 1 : 0));
}

/* returns True if monster can blow (whistle, etc) */
export function /* boolean */
can_blow(mtmp)
{
    if ((is_silent(mtmp.data) || mtmp.data.msound == MS_BUZZ)
        && (breathless(mtmp.data) || verysmall(mtmp.data)
            || !has_head(mtmp.data) || mtmp.data.mlet == S_EEL))
        return FALSE;
    if ((mtmp == gy.youmonst) && Strangled())
        return FALSE;
    return TRUE;
}

/* for casting spells and reading scrolls while blind */
export function /* boolean */
can_chant(mtmp)
{
    if ((mtmp == gy.youmonst && Strangled())
        || is_silent(mtmp.data) || !has_head(mtmp.data)
        || mtmp.data.msound == MS_BUZZ || mtmp.data.msound == MS_BURBLE)
        return FALSE;
    return TRUE;
}

/* True if mon is vulnerable to strangulation */
export function /* boolean */
can_be_strangled(mon)
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
    if (!has_head(mon.data))
        return FALSE;
    if (mon == gy.youmonst) {
        /* hero can't be mindless but poly'ing into mindless form can
           confer strangulation protection */
        nobrainer = mindless(gy.youmonst.data);
        nonbreathing = Breathless();
    } else {
        nobrainer = mindless(mon.data);
        /* monsters don't wear amulets of magical breathing,
           so second part doesn't achieve anything useful... */
        nonbreathing = (+(breathless(mon.data)
                        || ((mamul = which_armor(mon, W_AMUL)) != null
                            && (mamul.otyp == AMULET_OF_MAGICAL_BREATHING))));
    }
    return (+(!nobrainer || !nonbreathing));
}

/* returns True if monster can track well */
export function /* boolean */
can_track(ptr)
{
    if (u_wield_art(ART_EXCALIBUR))
        return TRUE;
    return haseyes(ptr);
}

/* creature will slide out of armor */
export function /* boolean */
sliparm(ptr)
{
    return (+(is_whirly(ptr) || ptr.msize <= MZ_SMALL
                      || noncorporeal(ptr)));
}

/* creature will break out of armor */
export function /* boolean */
breakarm(ptr)
{
    if (sliparm(ptr))
        return FALSE;

    return (+(bigmonst(ptr)
                      || (ptr.msize > MZ_SMALL && !humanoid(ptr))
                      /* special cases of humanoids that cannot wear suits */
                      || ptr == mons[PM_MARILITH]
                      || ptr == mons[PM_WINGED_GARGOYLE]));
}

/* creature sticks other creatures it hits */
export function /* boolean */
sticks(ptr)
{
    return (((dmgtype(ptr, AD_STCK)
                      || (dmgtype(ptr, AD_WRAP) && !attacktype(ptr, AT_ENGL))
                      || attacktype(ptr, AT_HUGS)) ? 1 : 0));
}

/* some monster-types can't vomit */
export function /* boolean */
cantvomit(ptr)
{
    /* rats and mice are incapable of vomiting; likewise with horses;
       which other creatures have the same limitation? */
    if (ptr.mlet == S_RODENT && ptr != mons[PM_ROCK_MOLE]
        && ptr != mons[PM_WOODCHUCK])
        return TRUE;
    if (ptr == mons[PM_WARHORSE] || ptr == mons[PM_HORSE]
        || ptr == mons[PM_PONY])
        return TRUE;
    return FALSE;
}

/* number of horns this type of monster has on its head */
export function /* int */
num_horns(ptr)
{
    switch (monsndx(ptr)) {
    case PM_HORNED_DEVIL: /* ? "more than one" */
    case PM_MINOTAUR:
    case PM_ASMODEUS:
    case PM_BALROG:
        return 2;
    case PM_WHITE_UNICORN:
    case PM_GRAY_UNICORN:
    case PM_BLACK_UNICORN:
    case PM_KI_RIN:
        return 1;
    default:
        break;
    }
    return 0;
}

/* does monster-type deal out a particular type of damage from a particular
   type of attack? */
export function /* struct attack * */
dmgtype_fromattack(ptr, dtyp, atyp)
{
    let a;

    for (a = ptr_add(ptr.mattk[0], 0); a < ptr_add(ptr.mattk[0], NATTK); a = ptr_add(a, 1))
        if (a.adtyp == dtyp && (atyp == AT_ANY || a.aatyp == atyp))
            return a;
    return null;
}

/* does monster-type deal out a particular type of damage from any attack */
export function /* boolean */
dmgtype(ptr, dtyp)
{
    return dmgtype_fromattack(ptr, dtyp, AT_ANY) ? TRUE : FALSE;
}

/* returns the maximum damage a defender can do to the attacker via
   a passive defense */
export function /* int */
max_passive_dmg(mdef, magr)
{
    let i, dmg, multi2 = 0;
    let adtyp;

    /* each attack by magr can result in passive damage */
    for (i = 0; i < NATTK; i++)
        switch (magr.data.mattk[i].aatyp) {
        case AT_CLAW:
        case AT_BITE:
        case AT_KICK:
        case AT_BUTT:
        case AT_TUCH:
        case AT_STNG:
        case AT_HUGS:
        case AT_ENGL:
        case AT_TENT:
        case AT_WEAP:
            multi2++;
            break;
        default:
            break;
        }

    dmg = 0;
    for (i = 0; i < NATTK; i++)
        if (mdef.data.mattk[i].aatyp == AT_NONE
            || mdef.data.mattk[i].aatyp == AT_BOOM) {
            adtyp = mdef.data.mattk[i].adtyp;
            if ((adtyp == AD_FIRE && completelyburns(magr.data))
                || (adtyp == AD_DCAY && completelyrots(magr.data))
                || (adtyp == AD_RUST && completelyrusts(magr.data))) {
                dmg = magr.mhp;
            } else if ((adtyp == AD_ACID && !resists_acid(magr))
                       || (adtyp == AD_COLD && !resists_cold(magr))
                       || (adtyp == AD_FIRE && !resists_fire(magr))
                       || (adtyp == AD_ELEC && !resists_elec(magr))
                       || adtyp == AD_PHYS) {
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
export function /* boolean */
same_race(pm1, pm2)
{
    let let1 = pm1.mlet, let2 = pm2.mlet;

    if (pm1 == pm2)
        return TRUE; /* exact match */
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
    if (let1 == S_KOBOLD || pm1 == mons[PM_KOBOLD_ZOMBIE]
        || pm1 == mons[PM_KOBOLD_MUMMY])
        return (+(let2 == S_KOBOLD || pm2 == mons[PM_KOBOLD_ZOMBIE]
                || pm2 == mons[PM_KOBOLD_MUMMY]));
    if (let1 == S_OGRE)
        return (+(let2 == S_OGRE));
    if (let1 == S_NYMPH)
        return (+(let2 == S_NYMPH));
    if (let1 == S_CENTAUR)
        return (+(let2 == S_CENTAUR));
    if (is_unicorn(pm1))
        return is_unicorn(pm2);
    if (let1 == S_DRAGON)
        return (+(let2 == S_DRAGON));
    if (let1 == S_NAGA)
        return (+(let2 == S_NAGA));
    /* other critters get steadily messier */
    if (is_rider(pm1))
        return is_rider(pm2); /* debatable */
    if (is_minion(pm1))
        return is_minion(pm2); /* [needs work?] */
    /* tengu don't match imps (first test handled case of both being tengu) */
    if (pm1 == mons[PM_TENGU] || pm2 == mons[PM_TENGU])
        return FALSE;
    if (let1 == S_IMP)
        return (+(let2 == S_IMP));
    /* and minor demons (imps) don't match major demons */
    else if (let2 == S_IMP)
        return FALSE;
    if (is_demon(pm1))
        return is_demon(pm2);
    if (is_undead(pm1)) {
        if (let1 == S_ZOMBIE)
            return (+(let2 == S_ZOMBIE));
        if (let1 == S_MUMMY)
            return (+(let2 == S_MUMMY));
        if (let1 == S_VAMPIRE)
            return (+(let2 == S_VAMPIRE));
        if (let1 == S_LICH)
            return (+(let2 == S_LICH));
        if (let1 == S_WRAITH)
            return (+(let2 == S_WRAITH));
        if (let1 == S_GHOST)
            return (+(let2 == S_GHOST));
    } else if (is_undead(pm2))
        return FALSE;

    /* check for monsters which grow into more mature forms */
    if (let1 == let2) {
        let m1 = monsndx(pm1), m2 = monsndx(pm2), prv, nxt;

        /* we know m1 != m2 (very first check above); test all smaller
           forms of m1 against m2, then all larger ones; don't need to
           make the corresponding tests for variants of m2 against m1 */
        for (prv = m1, nxt = big_to_little(m1); nxt != prv;
             prv = nxt, nxt = big_to_little(nxt))
            if (nxt == m2)
                return TRUE;
        for (prv = m1, nxt = little_to_big(m1); nxt != prv;
             prv = nxt, nxt = little_to_big(nxt))
            if (nxt == m2)
                return TRUE;
    }
    /* not caught by little/big handling */
    if (pm1 == mons[PM_GARGOYLE] || pm1 == mons[PM_WINGED_GARGOYLE])
        return (+(pm2 == mons[PM_GARGOYLE]
                || pm2 == mons[PM_WINGED_GARGOYLE]));
    if (pm1 == mons[PM_KILLER_BEE] || pm1 == mons[PM_QUEEN_BEE])
        return (+(pm2 == mons[PM_KILLER_BEE] || pm2 == mons[PM_QUEEN_BEE]));

    if (is_longworm(pm1))
        return is_longworm(pm2); /* handles tail */
    /* [currently there's no reason to bother matching up
        assorted bugs and blobs with their closest variants] */
    /* didn't match */
    return FALSE;
}

/* for handling alternate spellings */
const struct_alt_spl = struct("struct_alt_spl", {
    name: ptr_to(char),
    pm_val: short,
    genderhint: int,
});

/* figure out what type of monster a user-supplied string is specifying;
   ignore anything past the monster name */
export function /* int */
name_to_mon(in_str, gender_name_var)
{
    return name_to_monplus(in_str, null, gender_name_var);
}

/* figure out what type of monster a user-supplied string is specifying;
   return a pointer to whatever is past the monster name--necessary if
   caller wants to strip off the name and it matches one of the alternate
   names rather the canonical mons[].mname */
export function /* int */
name_to_monplus(
    in_str,
    remainder_p,
    gender_name_var)
{ const $frame = stack_frame(); try {
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
    let mntmp = NON_PM;
    let s, str, term;
    let buf = stack_array(char, BUFSZ);
    let len = stack_var(int), mgend, matchgend = -1;
    let slen;
    let exact_match = FALSE;

    if (remainder_p)
        remainder_p[0] = 0;

    str = strcpy(buf, in_str);

    if (!strncmp(str, _("a "), 2))
        str += 2;
    else if (!strncmp(str, _("an "), 3))
        str += 3;
    else if (!strncmp(str, _("the "), 4))
        str += 4;

    slen = strlen(str);
    term = str + slen;

    if ((s = strstri(str, _("vortices"))) != 0)
        void strcpy(s + 4, _("ex"));
    /* be careful with "ies"; "priest", "zombies" */
    else if (slen > 3 && !strcmpi(term - 3, _("ies"))
             && (slen < 7 || strcmpi(term - 7, _("zombies"))))
        void strcpy(term - 3, _("y"));
    /* luckily no monster names end in fe or ve with ves plurals */
    else if (slen > 3 && !strcmpi(term - 3, _("ves")))
        void strcpy(term - 3, _("f"));

    slen = strlen(str); /* length possibly needs recomputing */

    {
        let names = static_array("name_to_monplus.names", struct_alt_spl, null, [
            /* Alternate spellings */
            { name: _("grey dragon"), pm_val: PM_GRAY_DRAGON, genderhint: NEUTRAL },
            { name: _("baby grey dragon"), pm_val: PM_BABY_GRAY_DRAGON, genderhint: NEUTRAL },
            { name: _("grey unicorn"), pm_val: PM_GRAY_UNICORN, genderhint: NEUTRAL },
            { name: _("grey ooze"), pm_val: PM_GRAY_OOZE, genderhint: NEUTRAL },
            { name: _("gray-elf"), pm_val: PM_GREY_ELF, genderhint: NEUTRAL },
            { name: _("mindflayer"), pm_val: PM_MIND_FLAYER, genderhint: NEUTRAL },
            { name: _("master mindflayer"), pm_val: PM_MASTER_MIND_FLAYER, genderhint: NEUTRAL },
            /* More alternates; priest and priestess are separate monster
               types but that isn't the case for {aligned,high} priests */
            { name: _("aligned priest"), pm_val: PM_ALIGNED_CLERIC, genderhint: MALE },
            { name: _("aligned priestess"), pm_val: PM_ALIGNED_CLERIC, genderhint: FEMALE },
            { name: _("high priest"), pm_val: PM_HIGH_CLERIC, genderhint: MALE },
            { name: _("high priestess"), pm_val: PM_HIGH_CLERIC, genderhint: FEMALE },
            /* Inappropriate singularization by -ves check above */
            { name: _("master of thief"), pm_val: PM_MASTER_OF_THIEVES, genderhint: NEUTRAL },
            /* Potential misspellings where we want to avoid falling back
               to the rank title prefix (input has been singularized) */
            { name: _("master thief"), pm_val: PM_MASTER_OF_THIEVES, genderhint: NEUTRAL },
            { name: _("master of assassin"), pm_val: PM_MASTER_ASSASSIN, genderhint: NEUTRAL },
            { name: _("master-lich"), pm_val: PM_MASTER_LICH, genderhint: NEUTRAL }, /* cf arch-lich */
            { name: _("masterlich"), pm_val: PM_MASTER_LICH, genderhint: NEUTRAL }, /* cf demilich */
            /* Outdated names */
            { name: _("invisible stalker"), pm_val: PM_STALKER, genderhint: NEUTRAL },
            { name: _("high-elf"), pm_val: PM_ELVEN_MONARCH, genderhint: NEUTRAL }, /* PM_HIGH_ELF is
                                                        * obsolete */
            /* other misspellings or incorrect words */
            { name: _("wood-elf"), pm_val: PM_WOODLAND_ELF, genderhint: NEUTRAL },
            { name: _("wood elf"), pm_val: PM_WOODLAND_ELF, genderhint: NEUTRAL },
            { name: _("woodland nymph"), pm_val: PM_WOOD_NYMPH, genderhint: NEUTRAL },
            { name: _("halfling"), pm_val: PM_HOBBIT, genderhint: NEUTRAL },    /* potential guess for
                                                    * polyself */
            { name: _("genie"), pm_val: PM_DJINNI, genderhint: NEUTRAL }, /* potential guess for
                                              * ^G/#wizgenesis */
            /* prefix used to workaround duplicate monster names for
               monsters with alternate forms */
            { name: _("human wererat"), pm_val: PM_HUMAN_WERERAT, genderhint: NEUTRAL },
            { name: _("human werejackal"), pm_val: PM_HUMAN_WEREJACKAL, genderhint: NEUTRAL },
            { name: _("human werewolf"), pm_val: PM_HUMAN_WEREWOLF, genderhint: NEUTRAL },
            /* for completeness */
            { name: _("rat wererat"), pm_val: PM_WERERAT, genderhint: NEUTRAL },
            { name: _("jackal werejackal"), pm_val: PM_WEREJACKAL, genderhint: NEUTRAL },
            { name: _("wolf werewolf"), pm_val: PM_WEREWOLF, genderhint: NEUTRAL },
            /* Hyphenated names -- it would be nice to handle these via
               fuzzymatch() but it isn't able to ignore trailing stuff */
            { name: _("ki rin"), pm_val: PM_KI_RIN, genderhint: NEUTRAL },
            { name: _("kirin"), pm_val: PM_KI_RIN, genderhint: NEUTRAL },
            { name: _("uruk hai"), pm_val: PM_URUK_HAI, genderhint: NEUTRAL },
            { name: _("orc captain"), pm_val: PM_ORC_CAPTAIN, genderhint: NEUTRAL },
            { name: _("woodland elf"), pm_val: PM_WOODLAND_ELF, genderhint: NEUTRAL },
            { name: _("green elf"), pm_val: PM_GREEN_ELF, genderhint: NEUTRAL },
            { name: _("grey elf"), pm_val: PM_GREY_ELF, genderhint: NEUTRAL },
            { name: _("gray elf"), pm_val: PM_GREY_ELF, genderhint: NEUTRAL },
            { name: _("elf lady"), pm_val: PM_ELF_NOBLE, genderhint: FEMALE },
            { name: _("elf lord"), pm_val: PM_ELF_NOBLE, genderhint: MALE },
            { name: _("elf noble"), pm_val: PM_ELF_NOBLE, genderhint: NEUTRAL },
            { name: _("olog hai"), pm_val: PM_OLOG_HAI, genderhint: NEUTRAL },
            { name: _("arch lich"), pm_val: PM_ARCH_LICH, genderhint: NEUTRAL },
            { name: _("archlich"), pm_val: PM_ARCH_LICH, genderhint: NEUTRAL },
            /* Some irregular plurals */
            { name: _("incubi"), pm_val: PM_AMOROUS_DEMON, genderhint: MALE },
            { name: _("succubi"), pm_val: PM_AMOROUS_DEMON, genderhint: FEMALE },
            { name: _("violet fungi"), pm_val: PM_VIOLET_FUNGUS, genderhint: NEUTRAL },
            { name: _("homunculi"), pm_val: PM_HOMUNCULUS, genderhint: NEUTRAL },
            { name: _("baluchitheria"), pm_val: PM_BALUCHITHERIUM, genderhint: NEUTRAL },
            { name: _("lurkers above"), pm_val: PM_LURKER_ABOVE, genderhint: NEUTRAL },
            { name: _("cavemen"), pm_val: PM_CAVE_DWELLER, genderhint: MALE },
            { name: _("cavewomen"), pm_val: PM_CAVE_DWELLER, genderhint: FEMALE },
            { name: _("watchmen"), pm_val: PM_WATCHMAN, genderhint: NEUTRAL },
            { name: _("djinn"), pm_val: PM_DJINNI, genderhint: NEUTRAL },
            { name: _("mumakil"), pm_val: PM_MUMAK, genderhint: NEUTRAL },
            { name: _("erinyes"), pm_val: PM_ERINYS, genderhint: NEUTRAL },
            /* end of list */
            { name: 0, pm_val: NON_PM, genderhint: NEUTRAL }
        ]);
        let namep;

        for (namep = names[0]; namep.name; namep = ptr_add(namep, 1)) {
            len[0] = int(strlen(namep.name));
            if (!strncmpi(str, namep.name, len[0])
                /* force full word (which could conceivably be possessive) */
                && (!chars[str + (len[0])] || chars[str + (len[0])] == ord(' ') || chars[str + (len[0])] == ord('\''))) {
                if (remainder_p)
                    remainder_p[0] = in_str + (str + (len[0]) - buf);
                if (gender_name_var)
                    gender_name_var[0] = namep.genderhint;
                return namep.pm_val;
            }
        }
    }

    for (len[0] = 0, i = LOW_PM; i < NUMMONS; i++) {
      for (mgend = MALE; mgend < NUM_MGENDERS; mgend++) {
        let m_i_len;

        if (!mons[i].pmnames[mgend])
            continue;

        m_i_len = strlen(mons[i].pmnames[mgend]);
        if (m_i_len > unsigned((len[0]))
            && !strncmpi(mons[i].pmnames[mgend], str, int(m_i_len))) {
            if (m_i_len == slen) {
                mntmp = i;
                len[0] = int(m_i_len);
                matchgend = mgend;
                exact_match = TRUE;
                break; /* exact match */
            } else if (slen > m_i_len
                       && (chars[str + m_i_len] == ord(' ')
                           || !strcmpi(str + m_i_len, _("s"))
                           || !strncmpi(str + m_i_len, _("s "), 2)
                           || !strcmpi(str + m_i_len, _("'"))
                           || !strncmpi(str + m_i_len, _("' "), 2)
                           || !strcmpi(str + m_i_len, _("'s"))
                           || !strncmpi(str + m_i_len, _("'s "), 3)
                           || !strcmpi(str + m_i_len, _("es"))
                           || !strncmpi(str + m_i_len, _("es "), 3))) {
                mntmp = i;
                len[0] = int(m_i_len);
                matchgend = mgend;
            }
        }
      }
      if (exact_match)
        break;
    }
    /* FIXME: some titles have gender; title_to_mon() doesn't propagate it */
    if (mntmp == NON_PM)
        mntmp = title_to_mon(str, null, len);
    if (len[0] && remainder_p)
        remainder_p[0] = in_str + (str + (len[0]) - buf);
    if (gender_name_var && matchgend != -1) {
        /* don't override with neuter if caller has already specified male
           or female and we've matched the neuter name */
        if (gender_name_var[0] == -1 || matchgend != NEUTRAL)
            gender_name_var[0] = matchgend;
    }
    return mntmp;
} finally { stack_pop($frame); } }

/* monster class from user input; used for genocide and controlled polymorph;
   returns 0 rather than MAXMCLASSES if no match is found */
export function /* int */
name_to_monclass(in_str, mndx_p)
{
    /* Single letters are matched against def_monsyms[].sym; words
       or phrases are first matched against def_monsyms[].explain
       to check class description; if not found there, then against
       mons[].pmnames[] to test individual monster types.  Input can be a
       substring of the full description or pmname, but to be accepted,
       such partial matches must start at beginning of a word.  Some
       class descriptions include "foo or bar" and "foo or other foo"
       so we don't want to accept "or", "other", "or other" there. */
    let falsematch = static_array("name_to_monclass.falsematch", ptr_to(char), null, [
        /* multiple-letter input which matches any of these gets rejected */
        _("an"), _("the"), _("or"), _("other"), _("or other"), 0
    ]);
    /* positive pm_val => specific monster; negative => class */
    let truematch = static_array("name_to_monclass.truematch", struct_alt_spl, null, [
        /* "long worm" won't match "worm" class but would accidentally match
           "long worm tail" class before the comparison with monster types */
        { name: _("long worm"), pm_val: PM_LONG_WORM, genderhint: NEUTRAL },
        /* matches wrong--or at least suboptimal--class */
        { name: _("demon"), pm_val: -S_DEMON, genderhint: NEUTRAL }, /* hits "imp or minor demon" */
        /* matches specific monster (overly restrictive) */
        { name: _("devil"), pm_val: -S_DEMON, genderhint: NEUTRAL }, /* always "horned devil" */
        /* some plausible guesses which need help */
        { name: _("bug"), pm_val: -S_XAN, genderhint: NEUTRAL },  /* would match bugbear... */
        { name: _("fish"), pm_val: -S_EEL, genderhint: NEUTRAL }, /* wouldn't match anything */
        /* end of list */
        { name: 0, pm_val: NON_PM, genderhint: NEUTRAL}
    ]);
    let p, x;
    let i, len;

    if (mndx_p)
        mndx_p[0] = NON_PM; /* haven't [yet] matched a specific type */

    if (!in_str || !chars[in_str + 0]) {
        /* empty input */
        return 0;
    } else if (!chars[in_str + 1]) {
        /* single character */
        i = def_char_to_monclass(chars[in_str]);
        if (i == S_MIMIC_DEF) { /* ']' -> 'm' */
            i = S_MIMIC;
        } else if (i == S_WORM_TAIL) { /* '~' -> 'w' */
            i = S_WORM;
            if (mndx_p)
                mndx_p[0] = PM_LONG_WORM;
        } else if (i == MAXMCLASSES) /* maybe 'I' */
            i = (chars[in_str] == DEF_INVISIBLE) ? S_invisible : 0;
        return i;
    } else {
        /* multiple characters */
        if (!strcmpi(in_str, _("long"))) /* not enough to match "long worm" */
            return 0; /* avoid false whole-word match with "long worm tail" */
        in_str = makesingular(in_str);
        /* check for special cases */
        for (i = 0; falsematch[i]; i++)
            if (!strcmpi(in_str, falsematch[i]))
                return 0;
        for (i = 0; truematch[i].name; i++)
            if (!strcmpi(in_str, truematch[i].name)) {
                i = truematch[i].pm_val;
                if (i < 0)
                    return -i; /* class */
                if (mndx_p)
                    mndx_p[0] = i; /* monster */
                return mons[i].mlet;
            }
        /* check monster class descriptions */
        len = int(strlen(in_str));
        for (i = 1; i < MAXMCLASSES; i++) {
            x = def_monsyms[i].explain;
            if ((p = strstri(x, in_str)) != 0 && (p == x || chars[(p - 1)] == ord(' '))
                && (int(strlen(p)) >= len
                    && (chars[p + len] == ord('\0') || chars[p + len] == ord(' '))))
                return i;
        }
        /* check individual species names */
        i = name_to_mon(in_str, null);
        if (i != NON_PM) {
            if (mndx_p)
                mndx_p[0] = i;
            return mons[i].mlet;
        }
    }
    return 0;
}

/* returns 3 values (0=male, 1=female, 2=none) */
export function /* int */
gender(mtmp)
{
    if (is_neuter(mtmp.data))
        return 2;
    return mtmp.female;
}

/* Like gender(), but unseen humanoids are "it" rather than "he" or "she"
   and lower animals and such are "it" even when seen; hallucination might
   yield "they".  This is the one we want to use when printing messages. */
export function /* int */
pronoun_gender(
    mtmp,
    pg_flags) /* flags&1: 'no it' unless neuter,
                        * flags&2: random if hallucinating */
{
    let override_vis = (pg_flags & PRONOUN_NO_IT) ? TRUE : FALSE,
            hallu_rand = (pg_flags & PRONOUN_HALLU) ? TRUE : FALSE;

    if (hallu_rand && Hallucination())
        return rn2(4); /* 0..3 */
    if (!override_vis && !canspotmon(mtmp))
        return 2;
    if (is_neuter(mtmp.data))
        return 2;
    return (humanoid(mtmp.data) || (mtmp.data.geno & G_UNIQ)
            || type_is_pname(mtmp.data)) ? mtmp.female : 2;
}

/* used for nearby monsters when you go to another level */
export function /* boolean */
levl_follower(mtmp)
{
    if (mtmp == u.usteed)
        return TRUE;

    /* Wizard with Amulet won't bother trying to follow across levels */
    if (mtmp.iswiz && mon_has_amulet(mtmp))
        return FALSE;
    /* some monsters will follow even while intending to flee from you */
    if (mtmp.mtame || mtmp.iswiz || is_fshk(mtmp))
        return TRUE;
    /* stalking types follow, but won't when fleeing unless you hold
       the Amulet */
    return ((((mtmp.data.mflags2 & M2_STALK)
                      && (!mtmp.mflee || u.uhave.amulet)) ? 1 : 0));
}

const grownups = static_array("grownups", array_of(short, 2), null, [
    [ PM_CHICKATRICE, PM_COCKATRICE ],
    [ PM_LITTLE_DOG, PM_DOG ],
    [ PM_DOG, PM_LARGE_DOG ],
    [ PM_HELL_HOUND_PUP, PM_HELL_HOUND ],
    [ PM_WINTER_WOLF_CUB, PM_WINTER_WOLF ],
    [ PM_KITTEN, PM_HOUSECAT ],
    [ PM_HOUSECAT, PM_LARGE_CAT ],
    [ PM_PONY, PM_HORSE ],
    [ PM_HORSE, PM_WARHORSE ],
    [ PM_KOBOLD, PM_LARGE_KOBOLD ],
    [ PM_LARGE_KOBOLD, PM_KOBOLD_LEADER ],
    [ PM_GNOME, PM_GNOME_LEADER ],
    [ PM_GNOME_LEADER, PM_GNOME_RULER ],
    [ PM_DWARF, PM_DWARF_LEADER ],
    [ PM_DWARF_LEADER, PM_DWARF_RULER ],
    [ PM_MIND_FLAYER, PM_MASTER_MIND_FLAYER ],
    [ PM_ORC, PM_ORC_CAPTAIN ],
    [ PM_HILL_ORC, PM_ORC_CAPTAIN ],
    [ PM_MORDOR_ORC, PM_ORC_CAPTAIN ],
    [ PM_URUK_HAI, PM_ORC_CAPTAIN ],
    [ PM_SEWER_RAT, PM_GIANT_RAT ],
    [ PM_CAVE_SPIDER, PM_GIANT_SPIDER ],
    [ PM_OGRE, PM_OGRE_LEADER ],
    [ PM_OGRE_LEADER, PM_OGRE_TYRANT ],
    [ PM_ELF, PM_ELF_NOBLE ],
    [ PM_WOODLAND_ELF, PM_ELF_NOBLE ],
    [ PM_GREEN_ELF, PM_ELF_NOBLE ],
    [ PM_GREY_ELF, PM_ELF_NOBLE ],
    [ PM_ELF_NOBLE, PM_ELVEN_MONARCH ],
    [ PM_LICH, PM_DEMILICH ],
    [ PM_DEMILICH, PM_MASTER_LICH ],
    [ PM_MASTER_LICH, PM_ARCH_LICH ],
    [ PM_VAMPIRE, PM_VAMPIRE_LEADER ],
    [ PM_BAT, PM_GIANT_BAT ],
    [ PM_BABY_GRAY_DRAGON, PM_GRAY_DRAGON ],
    [ PM_BABY_GOLD_DRAGON, PM_GOLD_DRAGON ],
    [ PM_BABY_SILVER_DRAGON, PM_SILVER_DRAGON ],



    [ PM_BABY_RED_DRAGON, PM_RED_DRAGON ],
    [ PM_BABY_WHITE_DRAGON, PM_WHITE_DRAGON ],
    [ PM_BABY_ORANGE_DRAGON, PM_ORANGE_DRAGON ],
    [ PM_BABY_BLACK_DRAGON, PM_BLACK_DRAGON ],
    [ PM_BABY_BLUE_DRAGON, PM_BLUE_DRAGON ],
    [ PM_BABY_GREEN_DRAGON, PM_GREEN_DRAGON ],
    [ PM_BABY_YELLOW_DRAGON, PM_YELLOW_DRAGON ],
    [ PM_RED_NAGA_HATCHLING, PM_RED_NAGA ],
    [ PM_BLACK_NAGA_HATCHLING, PM_BLACK_NAGA ],
    [ PM_GOLDEN_NAGA_HATCHLING, PM_GOLDEN_NAGA ],
    [ PM_GUARDIAN_NAGA_HATCHLING, PM_GUARDIAN_NAGA ],
    [ PM_SMALL_MIMIC, PM_LARGE_MIMIC ],
    [ PM_LARGE_MIMIC, PM_GIANT_MIMIC ],
    [ PM_BABY_LONG_WORM, PM_LONG_WORM ],
    [ PM_BABY_PURPLE_WORM, PM_PURPLE_WORM ],
    [ PM_BABY_CROCODILE, PM_CROCODILE ],
    [ PM_SOLDIER, PM_SERGEANT ],
    [ PM_SERGEANT, PM_LIEUTENANT ],
    [ PM_LIEUTENANT, PM_CAPTAIN ],
    [ PM_WATCHMAN, PM_WATCH_CAPTAIN ],
    [ PM_ALIGNED_CLERIC, PM_HIGH_CLERIC ],
    [ PM_STUDENT, PM_ARCHEOLOGIST ],
    [ PM_ATTENDANT, PM_HEALER ],
    [ PM_PAGE, PM_KNIGHT ],
    [ PM_ACOLYTE, PM_CLERIC ],
    [ PM_APPRENTICE, PM_WIZARD ],
    [ PM_MANES, PM_LEMURE ],
    [ PM_KEYSTONE_KOP, PM_KOP_SERGEANT ],
    [ PM_KOP_SERGEANT, PM_KOP_LIEUTENANT ],
    [ PM_KOP_LIEUTENANT, PM_KOP_KAPTAIN ],
    [ NON_PM, NON_PM ]
]);

export function /* int */
little_to_big(montype)
{
    let i;

    for (i = 0; grownups[i][0] >= LOW_PM; i++)
        if (montype == grownups[i][0]) {
            montype = grownups[i][1];
            break;
        }
    return montype;
}

export function /* int */
big_to_little(montype)
{
    let i;

    for (i = 0; grownups[i][0] >= LOW_PM; i++)
        if (montype == grownups[i][1]) {
            montype = grownups[i][0];
            break;
        }
    return montype;
}

/* determine whether two permonst indices are part of the same progression;
   existence of progressions with more than one step makes it a bit tricky */
export function /* boolean */
big_little_match(montyp1, montyp2)
{
    let l, b;

    /* simplest case: both are same pm */
    if (montyp1 == montyp2)
        return TRUE;
    /* assume it isn't possible to grow from one class letter to another */
    if (mons[montyp1].mlet != mons[montyp2].mlet)
        return FALSE;
    /* check whether montyp1 can grow up into montyp2 */
    for (l = montyp1; (b = little_to_big(l)) != l; l = b)
        if (b == montyp2)
            return TRUE;
    /* check whether montyp2 can grow up into montyp1 */
    for (l = montyp2; (b = little_to_big(l)) != l; l = b)
        if (b == montyp1)
            return TRUE;
    /* neither grows up to become the other; no match */
    return FALSE;
}

/*
 * Return the permonst ptr for the race of the monster.
 * Returns correct pointer for non-polymorphed and polymorphed
 * player.  It does not return a pointer to player role character.
 */
export function /* const struct permonst * */
raceptr(mtmp)
{
    if (mtmp == gy.youmonst && !Upolyd())
        return mons[gu.urace.mnum];
    return mtmp.data;
}


const levitate = static_array("levitate", ptr_to(char), null, [ _("float"), _("Float"), _("wobble"), _("Wobble") ]);
const flys = static_array("flys", ptr_to(char), null, [ _("fly"), _("Fly"), _("flutter"), _("Flutter") ]);
const flyl = static_array("flyl", ptr_to(char), null, [ _("fly"), _("Fly"), _("stagger"), _("Stagger") ]);
const slither = static_array("slither", ptr_to(char), null, [ _("slither"), _("Slither"), _("falter"), _("Falter") ]);




const ooze = static_array("ooze", ptr_to(char), null, [ _("ooze"), _("Ooze"), _("tremble"), _("Tremble") ]);
const immobile = static_array("immobile", ptr_to(char), null, [ _("wiggle"), _("Wiggle"), _("pulsate"), _("Pulsate") ]);
const crawl = static_array("crawl", ptr_to(char), null, [ _("crawl"), _("Crawl"), _("falter"), _("Falter") ]);

export function /* const char * */
locomotion(ptr, def)
{
    let locoindx = (chars[def] != highc(chars[def])) ? 0 : 1;

    return (is_floater(ptr) ? levitate[locoindx]
            : (is_flyer(ptr) && ptr.msize <= MZ_SMALL) ? flys[locoindx]
              : (is_flyer(ptr) && ptr.msize > MZ_SMALL) ? flyl[locoindx]
                : slithy(ptr) ? slither[locoindx]
                  : amorphous(ptr) ? ooze[locoindx]
                    : !ptr.mmove ? immobile[locoindx]
                      : nolimbs(ptr) ? crawl[locoindx]
                        : def);
}

export function /* const char * */
stagger(ptr, def)
{
    let locoindx = (chars[def] != highc(chars[def])) ? 2 : 3;

    return (is_floater(ptr) ? levitate[locoindx]
            : (is_flyer(ptr) && ptr.msize <= MZ_SMALL) ? flys[locoindx]
              : (is_flyer(ptr) && ptr.msize > MZ_SMALL) ? flyl[locoindx]
                : slithy(ptr) ? slither[locoindx]
                  : amorphous(ptr) ? ooze[locoindx]
                    : !ptr.mmove ? immobile[locoindx]
                      : nolimbs(ptr) ? crawl[locoindx]
                        : def);
}

/* return phrase describing the effect of fire attack on a type of monster */
export function /* const char * */
on_fire(mptr, mattk)
{
    let what;

    switch (monsndx(mptr)) {
    case PM_FLAMING_SPHERE:
    case PM_FIRE_VORTEX:
    case PM_FIRE_ELEMENTAL:
    case PM_SALAMANDER:
        what = _("already on fire");
        break;
    case PM_WATER_ELEMENTAL:
    case PM_FOG_CLOUD:
    case PM_STEAM_VORTEX:
        what = _("boiling");
        break;
    case PM_ICE_VORTEX:
    case PM_GLASS_GOLEM:
        what = _("melting");
        break;
    case PM_STONE_GOLEM:
    case PM_CLAY_GOLEM:
    case PM_GOLD_GOLEM:
    case PM_AIR_ELEMENTAL:
    case PM_EARTH_ELEMENTAL:
    case PM_DUST_VORTEX:
    case PM_ENERGY_VORTEX:
        what = _("heating up");
        break;
    default:
        what = (mattk.aatyp == AT_HUGS) ? _("being roasted") : _("on fire");
        break;
    }
    return what;
}

/* similar to on_fire(); creature is summoned in a cloud of <something> */
export function /* const char * */
msummon_environ(mptr, cloud)
{
    let what;
    let mndx = ((mptr.mlet == S_ANGEL) ? PM_ANGEL
                : (mptr.mlet == S_LIGHT) ? PM_YELLOW_LIGHT
                  : monsndx(mptr));

    cloud[0] = _("cloud"); /* default is "cloud of <something>" */
    switch (mndx) {
    case PM_WATER_DEMON:
    case PM_AIR_ELEMENTAL:
    case PM_WATER_ELEMENTAL:
    case PM_FOG_CLOUD:
    case PM_ICE_VORTEX:
    case PM_FREEZING_SPHERE:
        what = _("vapor");
        break;
    case PM_STEAM_VORTEX:
        what = _("steam");
        break;
    case PM_ENERGY_VORTEX:
    case PM_SHOCKING_SPHERE:
        cloud[0] = _("shower"); /* "shower of sparks" instead of "cloud of..." */
        what = _("sparks");
        break;
    case PM_EARTH_ELEMENTAL:
    case PM_DUST_VORTEX:
        what = _("dust");
        break;
    case PM_FIRE_ELEMENTAL:
    case PM_FIRE_VORTEX:
    case PM_FLAMING_SPHERE:
    /*case PM_SALAMANDER:*/
        cloud[0] = _("ball"); /* "ball of flame" instead of "cloud of..." */
        what = _("flame");
        break;
    case PM_ANGEL: /* actually any 'A'-class */
    case PM_YELLOW_LIGHT: /* any 'y'-class */
        cloud[0] = _("flash"); /* "flash of light" instead of "cloud of..." */
        what = _("light");
        break;
    default:
        what = _("smoke");
        break;
    }
    return what;
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
export function /* boolean */
olfaction(mdat)
{
    if (is_golem(mdat)
        || mdat.mlet == S_EYE /* spheres  */
        || mdat.mlet == S_JELLY || mdat.mlet == S_PUDDING
        || mdat.mlet == S_BLOB || mdat.mlet == S_VORTEX
        || mdat.mlet == S_ELEMENTAL
        || mdat.mlet == S_FUNGUS /* mushrooms and fungi */
        || mdat.mlet == S_LIGHT)
        return FALSE;
    return TRUE;
}

/* Convert attack damage type AD_foo to M_SEEN_bar */
export function /* unsigned long long */
cvt_adtyp_to_mseenres(adtyp)
{
    switch (adtyp) {
    case AD_MAGM: return M_SEEN_MAGR;
    case AD_FIRE: return M_SEEN_FIRE;
    case AD_COLD: return M_SEEN_COLD;
    case AD_SLEE: return M_SEEN_SLEEP;
    case AD_DISN: return M_SEEN_DISINT;
    case AD_ELEC: return M_SEEN_ELEC;
    case AD_DRST: return M_SEEN_POISON;
    case AD_ACID: return M_SEEN_ACID;
    /* M_SEEN_REFL has no corresponding AD_foo type */
    default: return M_SEEN_NOTHING;
    }
}

/* Convert property resistance to M_SEEN_bar */
export function /* unsigned long long */
cvt_prop_to_mseenres(prop)
{
    switch (prop) {
    case ANTIMAGIC: return M_SEEN_MAGR;
    case FIRE_RES: return M_SEEN_FIRE;
    case COLD_RES: return M_SEEN_COLD;
    case SLEEP_RES: return M_SEEN_SLEEP;
    case DISINT_RES: return M_SEEN_DISINT;
    case POISON_RES: return M_SEEN_POISON;
    case SHOCK_RES: return M_SEEN_ELEC;
    case ACID_RES: return M_SEEN_ACID;
    case REFLECTING: return M_SEEN_REFL;
    default: return M_SEEN_NOTHING;
    }
}

/* Monsters in line of sight remember hero resisting effect M_SEEN_foo */
export function /* void */
monstseesu(seenres)
{
    let mtmp;

    if (seenres == M_SEEN_NOTHING || u.uswallow)
        return;

    for (mtmp = fmon(); mtmp; mtmp = mtmp.nmon)
        if (!DEADMONSTER(mtmp) && m_canseeu(mtmp))
            m_setseenres(mtmp, seenres);
}

/* Monsters in line of sight forget hero resistance to M_SEEN_foo */
export function /* void */
monstunseesu(seenres)
{
    let mtmp;

    if (seenres == M_SEEN_NOTHING || u.uswallow)
        return;

    for (mtmp = fmon(); mtmp; mtmp = mtmp.nmon)
        if (!DEADMONSTER(mtmp) && m_canseeu(mtmp))
            m_clearseenres(mtmp, seenres);
}

/* give monster mtmp the same intrinsics hero has */
export function /* void */
give_u_to_m_resistances(mtmp)
{
    let intr;

    /* convert the hero's current set of intrinsics to their monster
       equivalents -- FIRE_RES to MR_FIRE, COLD_RES to MR_COLD, etc -- and
       add each to the mintrinsics field for the given monster */
    for (intr = FIRE_RES; intr <= STONE_RES; intr++) {
        if ((u.uprops[intr].intrinsic & INTRINSIC) != 0) {
            mtmp.mintrinsics |= res_to_mr(intr);
        }
    }
}

/* Can monster resist conflict caused by hero?

   High-CHA heroes will be able to 'convince' monsters
   (through the magic of the ring, of course) to fight
   for them much more easily than low-CHA ones.
*/
export function /* boolean */
resist_conflict(mtmp)
{
    /* always a small chance at 19 */
    let resist_chance = ((((19) < ((ACURR(A_CHA) - mtmp.m_lev + u.ulevel))) ? (19) : ((ACURR(A_CHA) - mtmp.m_lev + u.ulevel))));

    return (+(rnd(20) > resist_chance));
}

/* does monster mtmp know traps of type ttyp */
export function /* boolean */
mon_knows_traps(mtmp, ttyp)
{
    if (ttyp == ALL_TRAPS)
        return boolean((mtmp.mtrapseen));
    else if (ttyp == NO_TRAP)
        return +!boolean((mtmp.mtrapseen));
    else
        return (+((mtmp.mtrapseen & (shl64(1, (ttyp - 1)))) != 0));
}

/* monster mtmp learns all traps of type ttyp */
export function /* void */
mon_learns_traps(mtmp, ttyp)
{
    if (ttyp == ALL_TRAPS)
        mtmp.mtrapseen = ~0;
    else if (ttyp == NO_TRAP)
        mtmp.mtrapseen = 0;
    else
        mtmp.mtrapseen = or64(mtmp.mtrapseen, (shl64(1, (ttyp - 1))));
}

/* monsters see a trap trigger, and remember it */
export function /* void */
mons_see_trap(ttmp)
{
    let mtmp;
    let tx = ttmp.tx, ty = ttmp.ty;
    let maxdist = levl()[tx][ty].lit ? 7*7 : 2;

    for (mtmp = fmon(); mtmp; mtmp = mtmp.nmon) {
        if (is_animal(mtmp.data) || mindless(mtmp.data)
            || !haseyes(mtmp.data) || !mtmp.mcansee)
            continue;
        if (dist2(mtmp.mx, mtmp.my, tx, ty) > maxdist)
            continue;
        if (!m_cansee(mtmp, tx, ty))
            continue;
        mon_learns_traps(mtmp, ttmp.ttyp);
    }
}

export function /* int */
get_atkdam_type(adtyp)
{
    if (adtyp == AD_RBRE) {
        let rnd_breath_typ = static_array("get_atkdam_type.rnd_breath_typ", int, null, [
            AD_MAGM, AD_FIRE, AD_COLD, AD_SLEE,
            AD_DISN, AD_ELEC, AD_DRST, AD_ACID ]);
        return ROLL_FROM(rnd_breath_typ);
    }
    return adtyp;
}

/*mondata.c*/
import { ART_EXCALIBUR } from "./artilist.h.js";
import { A_CHA } from "./attrib.h.js";
import { ACURR } from "./attrib.h.macros.js";
import { ARMOR_CLASS } from "./defsym.h.js";
import { DEF_INVISIBLE } from "./defsym.h.js";
import { MAXMCLASSES } from "./defsym.h.js";
import { S_ANGEL } from "./defsym.h.js";
import { S_BLOB } from "./defsym.h.js";
import { S_CENTAUR } from "./defsym.h.js";
import { S_DEMON } from "./defsym.h.js";
import { S_DRAGON } from "./defsym.h.js";
import { S_EEL } from "./defsym.h.js";
import { S_ELEMENTAL } from "./defsym.h.js";
import { S_EYE } from "./defsym.h.js";
import { S_FUNGUS } from "./defsym.h.js";
import { S_GHOST } from "./defsym.h.js";
import { S_IMP } from "./defsym.h.js";
import { S_JELLY } from "./defsym.h.js";
import { S_KOBOLD } from "./defsym.h.js";
import { S_LICH } from "./defsym.h.js";
import { S_LIGHT } from "./defsym.h.js";
import { S_MIMIC } from "./defsym.h.js";
import { S_MIMIC_DEF } from "./defsym.h.js";
import { S_MUMMY } from "./defsym.h.js";
import { S_NAGA } from "./defsym.h.js";
import { S_NYMPH } from "./defsym.h.js";
import { S_OGRE } from "./defsym.h.js";
import { S_PUDDING } from "./defsym.h.js";
import { S_RODENT } from "./defsym.h.js";
import { S_VAMPIRE } from "./defsym.h.js";
import { S_VORTEX } from "./defsym.h.js";
import { S_WORM } from "./defsym.h.js";
import { S_WORM_TAIL } from "./defsym.h.js";
import { S_WRAITH } from "./defsym.h.js";
import { S_XAN } from "./defsym.h.js";
import { S_ZOMBIE } from "./defsym.h.js";
import { S_invisible } from "./defsym.h.js";
import { WEAPON_CLASS } from "./defsym.h.js";
import { canspotmon } from "./display.h.macros.js";
import { BUFSZ } from "./global.h.js";
import { FALSE } from "./global.h.js";
import { TRUE } from "./global.h.js";
import { boolean } from "./global.h.js";
import { strcmpi } from "./global.h.macros.js";
import { ROLL_FROM } from "./hack.h.macros.js";
import { AD_ACID } from "./monattk.h.js";
import { AD_ANY } from "./monattk.h.js";
import { AD_BLND } from "./monattk.h.js";
import { AD_COLD } from "./monattk.h.js";
import { AD_CORR } from "./monattk.h.js";
import { AD_DCAY } from "./monattk.h.js";
import { AD_DISN } from "./monattk.h.js";
import { AD_DRCO } from "./monattk.h.js";
import { AD_DRDX } from "./monattk.h.js";
import { AD_DRLI } from "./monattk.h.js";
import { AD_DRST } from "./monattk.h.js";
import { AD_ELEC } from "./monattk.h.js";
import { AD_FIRE } from "./monattk.h.js";
import { AD_MAGM } from "./monattk.h.js";
import { AD_PHYS } from "./monattk.h.js";
import { AD_RBRE } from "./monattk.h.js";
import { AD_RUST } from "./monattk.h.js";
import { AD_SLEE } from "./monattk.h.js";
import { AD_STCK } from "./monattk.h.js";
import { AD_STON } from "./monattk.h.js";
import { AD_WERE } from "./monattk.h.js";
import { AD_WRAP } from "./monattk.h.js";
import { AT_ANY } from "./monattk.h.js";
import { AT_BITE } from "./monattk.h.js";
import { AT_BOOM } from "./monattk.h.js";
import { AT_BREA } from "./monattk.h.js";
import { AT_BUTT } from "./monattk.h.js";
import { AT_CLAW } from "./monattk.h.js";
import { AT_ENGL } from "./monattk.h.js";
import { AT_EXPL } from "./monattk.h.js";
import { AT_GAZE } from "./monattk.h.js";
import { AT_HUGS } from "./monattk.h.js";
import { AT_KICK } from "./monattk.h.js";
import { AT_MAGC } from "./monattk.h.js";
import { AT_NONE } from "./monattk.h.js";
import { AT_SPIT } from "./monattk.h.js";
import { AT_STNG } from "./monattk.h.js";
import { AT_TENT } from "./monattk.h.js";
import { AT_TUCH } from "./monattk.h.js";
import { AT_WEAP } from "./monattk.h.js";
import { DISTANCE_ATTK_TYPE } from "./monattk.h.macros.js";
import { amorphous } from "./mondata.h.macros.js";
import { bigmonst } from "./mondata.h.macros.js";
import { breathless } from "./mondata.h.macros.js";
import { completelyburns } from "./mondata.h.macros.js";
import { completelyrots } from "./mondata.h.macros.js";
import { completelyrusts } from "./mondata.h.macros.js";
import { has_head } from "./mondata.h.macros.js";
import { haseyes } from "./mondata.h.macros.js";
import { hates_light } from "./mondata.h.macros.js";
import { humanoid } from "./mondata.h.macros.js";
import { is_animal } from "./mondata.h.macros.js";
import { is_demon } from "./mondata.h.macros.js";
import { is_dwarf } from "./mondata.h.macros.js";
import { is_elf } from "./mondata.h.macros.js";
import { is_floater } from "./mondata.h.macros.js";
import { is_flyer } from "./mondata.h.macros.js";
import { is_giant } from "./mondata.h.macros.js";
import { is_gnome } from "./mondata.h.macros.js";
import { is_golem } from "./mondata.h.macros.js";
import { is_human } from "./mondata.h.macros.js";
import { is_longworm } from "./mondata.h.macros.js";
import { is_mind_flayer } from "./mondata.h.macros.js";
import { is_minion } from "./mondata.h.macros.js";
import { is_neuter } from "./mondata.h.macros.js";
import { is_orc } from "./mondata.h.macros.js";
import { is_rider } from "./mondata.h.macros.js";
import { is_silent } from "./mondata.h.macros.js";
import { is_undead } from "./mondata.h.macros.js";
import { is_unicorn } from "./mondata.h.macros.js";
import { is_were } from "./mondata.h.macros.js";
import { is_whirly } from "./mondata.h.macros.js";
import { metallivorous } from "./mondata.h.macros.js";
import { mindless } from "./mondata.h.macros.js";
import { monsndx } from "./mondata.h.macros.js";
import { nolimbs } from "./mondata.h.macros.js";
import { noncorporeal } from "./mondata.h.macros.js";
import { passes_walls } from "./mondata.h.macros.js";
import { slithy } from "./mondata.h.macros.js";
import { type_is_pname } from "./mondata.h.macros.js";
import { unsolid } from "./mondata.h.macros.js";
import { verysmall } from "./mondata.h.macros.js";
import { FEMALE } from "./monflag.h.js";
import { G_GENOD } from "./monflag.h.js";
import { G_LGROUP } from "./monflag.h.js";
import { G_SGROUP } from "./monflag.h.js";
import { G_UNIQ } from "./monflag.h.js";
import { M2_STALK } from "./monflag.h.js";
import { M2_STRONG } from "./monflag.h.js";
import { MALE } from "./monflag.h.js";
import { MS_BURBLE } from "./monflag.h.js";
import { MS_BUZZ } from "./monflag.h.js";
import { MZ_SMALL } from "./monflag.h.js";
import { NEUTRAL } from "./monflag.h.js";
import { NUM_MGENDERS } from "./monflag.h.js";
import { M_SEEN_ACID } from "./monst.h.js";
import { M_SEEN_COLD } from "./monst.h.js";
import { M_SEEN_DISINT } from "./monst.h.js";
import { M_SEEN_ELEC } from "./monst.h.js";
import { M_SEEN_FIRE } from "./monst.h.js";
import { M_SEEN_MAGR } from "./monst.h.js";
import { M_SEEN_NOTHING } from "./monst.h.js";
import { M_SEEN_POISON } from "./monst.h.js";
import { M_SEEN_REFL } from "./monst.h.js";
import { M_SEEN_SLEEP } from "./monst.h.js";
import { DEADMONSTER } from "./monst.h.macros.js";
import { MON_WEP } from "./monst.h.macros.js";
import { is_vampshifter } from "./monst.h.macros.js";
import { m_clearseenres } from "./monst.h.macros.js";
import { m_setseenres } from "./monst.h.macros.js";
import { mon_perma_blind } from "./monst.h.macros.js";
import { mon_resistancebits } from "./monst.h.macros.js";
import { resists_acid } from "./monst.h.macros.js";
import { resists_cold } from "./monst.h.macros.js";
import { resists_elec } from "./monst.h.macros.js";
import { resists_fire } from "./monst.h.macros.js";
import { LOW_PM } from "./monsters.h.js";
import { NON_PM } from "./monsters.h.js";
import { NUMMONS } from "./monsters.h.js";
import { PM_ACOLYTE } from "./monsters.h.js";
import { PM_AIR_ELEMENTAL } from "./monsters.h.js";
import { PM_ALIGNED_CLERIC } from "./monsters.h.js";
import { PM_AMOROUS_DEMON } from "./monsters.h.js";
import { PM_ANGEL } from "./monsters.h.js";
import { PM_APPRENTICE } from "./monsters.h.js";
import { PM_ARCHEOLOGIST } from "./monsters.h.js";
import { PM_ARCH_LICH } from "./monsters.h.js";
import { PM_ASMODEUS } from "./monsters.h.js";
import { PM_ATTENDANT } from "./monsters.h.js";
import { PM_BABY_BLACK_DRAGON } from "./monsters.h.js";
import { PM_BABY_BLUE_DRAGON } from "./monsters.h.js";
import { PM_BABY_CROCODILE } from "./monsters.h.js";
import { PM_BABY_GOLD_DRAGON } from "./monsters.h.js";
import { PM_BABY_GRAY_DRAGON } from "./monsters.h.js";
import { PM_BABY_GREEN_DRAGON } from "./monsters.h.js";
import { PM_BABY_LONG_WORM } from "./monsters.h.js";
import { PM_BABY_ORANGE_DRAGON } from "./monsters.h.js";
import { PM_BABY_PURPLE_WORM } from "./monsters.h.js";
import { PM_BABY_RED_DRAGON } from "./monsters.h.js";
import { PM_BABY_SILVER_DRAGON } from "./monsters.h.js";
import { PM_BABY_WHITE_DRAGON } from "./monsters.h.js";
import { PM_BABY_YELLOW_DRAGON } from "./monsters.h.js";
import { PM_BALROG } from "./monsters.h.js";
import { PM_BALUCHITHERIUM } from "./monsters.h.js";
import { PM_BAT } from "./monsters.h.js";
import { PM_BLACK_DRAGON } from "./monsters.h.js";
import { PM_BLACK_NAGA } from "./monsters.h.js";
import { PM_BLACK_NAGA_HATCHLING } from "./monsters.h.js";
import { PM_BLACK_UNICORN } from "./monsters.h.js";
import { PM_BLUE_DRAGON } from "./monsters.h.js";
import { PM_CAPTAIN } from "./monsters.h.js";
import { PM_CAVE_DWELLER } from "./monsters.h.js";
import { PM_CAVE_SPIDER } from "./monsters.h.js";
import { PM_CHICKATRICE } from "./monsters.h.js";
import { PM_CLAY_GOLEM } from "./monsters.h.js";
import { PM_CLERIC } from "./monsters.h.js";
import { PM_COCKATRICE } from "./monsters.h.js";
import { PM_CROCODILE } from "./monsters.h.js";
import { PM_DEATH } from "./monsters.h.js";
import { PM_DEMILICH } from "./monsters.h.js";
import { PM_DJINNI } from "./monsters.h.js";
import { PM_DOG } from "./monsters.h.js";
import { PM_DUST_VORTEX } from "./monsters.h.js";
import { PM_DWARF } from "./monsters.h.js";
import { PM_DWARF_LEADER } from "./monsters.h.js";
import { PM_DWARF_RULER } from "./monsters.h.js";
import { PM_EARTH_ELEMENTAL } from "./monsters.h.js";
import { PM_ELF } from "./monsters.h.js";
import { PM_ELF_NOBLE } from "./monsters.h.js";
import { PM_ELVEN_MONARCH } from "./monsters.h.js";
import { PM_ENERGY_VORTEX } from "./monsters.h.js";
import { PM_ERINYS } from "./monsters.h.js";
import { PM_FIRE_ELEMENTAL } from "./monsters.h.js";
import { PM_FIRE_VORTEX } from "./monsters.h.js";
import { PM_FLAMING_SPHERE } from "./monsters.h.js";
import { PM_FOG_CLOUD } from "./monsters.h.js";
import { PM_FREEZING_SPHERE } from "./monsters.h.js";
import { PM_GARGOYLE } from "./monsters.h.js";
import { PM_GIANT_BAT } from "./monsters.h.js";
import { PM_GIANT_MIMIC } from "./monsters.h.js";
import { PM_GIANT_RAT } from "./monsters.h.js";
import { PM_GIANT_SPIDER } from "./monsters.h.js";
import { PM_GLASS_GOLEM } from "./monsters.h.js";
import { PM_GNOME } from "./monsters.h.js";
import { PM_GNOME_LEADER } from "./monsters.h.js";
import { PM_GNOME_RULER } from "./monsters.h.js";
import { PM_GOLDEN_NAGA } from "./monsters.h.js";
import { PM_GOLDEN_NAGA_HATCHLING } from "./monsters.h.js";
import { PM_GOLD_DRAGON } from "./monsters.h.js";
import { PM_GOLD_GOLEM } from "./monsters.h.js";
import { PM_GRAY_DRAGON } from "./monsters.h.js";
import { PM_GRAY_OOZE } from "./monsters.h.js";
import { PM_GRAY_UNICORN } from "./monsters.h.js";
import { PM_GREEN_DRAGON } from "./monsters.h.js";
import { PM_GREEN_ELF } from "./monsters.h.js";
import { PM_GREY_ELF } from "./monsters.h.js";
import { PM_GUARDIAN_NAGA } from "./monsters.h.js";
import { PM_GUARDIAN_NAGA_HATCHLING } from "./monsters.h.js";
import { PM_HEALER } from "./monsters.h.js";
import { PM_HELL_HOUND } from "./monsters.h.js";
import { PM_HELL_HOUND_PUP } from "./monsters.h.js";
import { PM_HIGH_CLERIC } from "./monsters.h.js";
import { PM_HILL_ORC } from "./monsters.h.js";
import { PM_HOBBIT } from "./monsters.h.js";
import { PM_HOMUNCULUS } from "./monsters.h.js";
import { PM_HORNED_DEVIL } from "./monsters.h.js";
import { PM_HORSE } from "./monsters.h.js";
import { PM_HOUSECAT } from "./monsters.h.js";
import { PM_HUMAN_WEREJACKAL } from "./monsters.h.js";
import { PM_HUMAN_WERERAT } from "./monsters.h.js";
import { PM_HUMAN_WEREWOLF } from "./monsters.h.js";
import { PM_ICE_VORTEX } from "./monsters.h.js";
import { PM_KEYSTONE_KOP } from "./monsters.h.js";
import { PM_KILLER_BEE } from "./monsters.h.js";
import { PM_KITTEN } from "./monsters.h.js";
import { PM_KI_RIN } from "./monsters.h.js";
import { PM_KNIGHT } from "./monsters.h.js";
import { PM_KOBOLD } from "./monsters.h.js";
import { PM_KOBOLD_LEADER } from "./monsters.h.js";
import { PM_KOBOLD_MUMMY } from "./monsters.h.js";
import { PM_KOBOLD_ZOMBIE } from "./monsters.h.js";
import { PM_KOP_KAPTAIN } from "./monsters.h.js";
import { PM_KOP_LIEUTENANT } from "./monsters.h.js";
import { PM_KOP_SERGEANT } from "./monsters.h.js";
import { PM_LARGE_CAT } from "./monsters.h.js";
import { PM_LARGE_DOG } from "./monsters.h.js";
import { PM_LARGE_KOBOLD } from "./monsters.h.js";
import { PM_LARGE_MIMIC } from "./monsters.h.js";
import { PM_LEMURE } from "./monsters.h.js";
import { PM_LICH } from "./monsters.h.js";
import { PM_LIEUTENANT } from "./monsters.h.js";
import { PM_LITTLE_DOG } from "./monsters.h.js";
import { PM_LONG_WORM } from "./monsters.h.js";
import { PM_LURKER_ABOVE } from "./monsters.h.js";
import { PM_MANES } from "./monsters.h.js";
import { PM_MARILITH } from "./monsters.h.js";
import { PM_MASTER_ASSASSIN } from "./monsters.h.js";
import { PM_MASTER_LICH } from "./monsters.h.js";
import { PM_MASTER_MIND_FLAYER } from "./monsters.h.js";
import { PM_MASTER_OF_THIEVES } from "./monsters.h.js";
import { PM_MIND_FLAYER } from "./monsters.h.js";
import { PM_MINOTAUR } from "./monsters.h.js";
import { PM_MORDOR_ORC } from "./monsters.h.js";
import { PM_MUMAK } from "./monsters.h.js";
import { PM_OGRE } from "./monsters.h.js";
import { PM_OGRE_LEADER } from "./monsters.h.js";
import { PM_OGRE_TYRANT } from "./monsters.h.js";
import { PM_OLOG_HAI } from "./monsters.h.js";
import { PM_ORANGE_DRAGON } from "./monsters.h.js";
import { PM_ORC } from "./monsters.h.js";
import { PM_ORC_CAPTAIN } from "./monsters.h.js";
import { PM_PAGE } from "./monsters.h.js";
import { PM_PONY } from "./monsters.h.js";
import { PM_PURPLE_WORM } from "./monsters.h.js";
import { PM_QUEEN_BEE } from "./monsters.h.js";
import { PM_RAVEN } from "./monsters.h.js";
import { PM_RED_DRAGON } from "./monsters.h.js";
import { PM_RED_NAGA } from "./monsters.h.js";
import { PM_RED_NAGA_HATCHLING } from "./monsters.h.js";
import { PM_ROCK_MOLE } from "./monsters.h.js";
import { PM_SALAMANDER } from "./monsters.h.js";
import { PM_SERGEANT } from "./monsters.h.js";
import { PM_SEWER_RAT } from "./monsters.h.js";
import { PM_SHADE } from "./monsters.h.js";
import { PM_SHOCKING_SPHERE } from "./monsters.h.js";
import { PM_SILVER_DRAGON } from "./monsters.h.js";
import { PM_SMALL_MIMIC } from "./monsters.h.js";
import { PM_SOLDIER } from "./monsters.h.js";
import { PM_STALKER } from "./monsters.h.js";
import { PM_STEAM_VORTEX } from "./monsters.h.js";
import { PM_STONE_GOLEM } from "./monsters.h.js";
import { PM_STUDENT } from "./monsters.h.js";
import { PM_TENGU } from "./monsters.h.js";
import { PM_URUK_HAI } from "./monsters.h.js";
import { PM_VAMPIRE } from "./monsters.h.js";
import { PM_VAMPIRE_LEADER } from "./monsters.h.js";
import { PM_VIOLET_FUNGUS } from "./monsters.h.js";
import { PM_WARHORSE } from "./monsters.h.js";
import { PM_WATCHMAN } from "./monsters.h.js";
import { PM_WATCH_CAPTAIN } from "./monsters.h.js";
import { PM_WATER_DEMON } from "./monsters.h.js";
import { PM_WATER_ELEMENTAL } from "./monsters.h.js";
import { PM_WEREJACKAL } from "./monsters.h.js";
import { PM_WERERAT } from "./monsters.h.js";
import { PM_WEREWOLF } from "./monsters.h.js";
import { PM_WHITE_DRAGON } from "./monsters.h.js";
import { PM_WHITE_UNICORN } from "./monsters.h.js";
import { PM_WINGED_GARGOYLE } from "./monsters.h.js";
import { PM_WINTER_WOLF } from "./monsters.h.js";
import { PM_WINTER_WOLF_CUB } from "./monsters.h.js";
import { PM_WIZARD } from "./monsters.h.js";
import { PM_WOODCHUCK } from "./monsters.h.js";
import { PM_WOODLAND_ELF } from "./monsters.h.js";
import { PM_WOOD_NYMPH } from "./monsters.h.js";
import { PM_YELLOW_DRAGON } from "./monsters.h.js";
import { PM_YELLOW_LIGHT } from "./monsters.h.js";
import { struct_obj } from "./obj.h.js";
import { Is_dragon_armor } from "./obj.h.macros.js";
import { is_weptool } from "./obj.h.macros.js";
import { u_wield_art } from "./obj.h.macros.js";
import { ALCHEMY_SMOCK } from "./objects.h.js";
import { AMULET_OF_MAGICAL_BREATHING } from "./objects.h.js";
import { BLINDING_VENOM } from "./objects.h.js";
import { CREAM_PIE } from "./objects.h.js";
import { GRAY_DRAGON_SCALES } from "./objects.h.js";
import { POT_BLINDNESS } from "./objects.h.js";
import { NATTK } from "./permonst.h.js";
import { ACID_RES } from "./prop.h.js";
import { ANTIMAGIC } from "./prop.h.js";
import { BLND_RES } from "./prop.h.js";
import { COLD_RES } from "./prop.h.js";
import { DISINT_RES } from "./prop.h.js";
import { DRAIN_RES } from "./prop.h.js";
import { FIRE_RES } from "./prop.h.js";
import { INTRINSIC } from "./prop.h.js";
import { POISON_RES } from "./prop.h.js";
import { REFLECTING } from "./prop.h.js";
import { SHOCK_RES } from "./prop.h.js";
import { SLEEP_RES } from "./prop.h.js";
import { STONE_RES } from "./prop.h.js";
import { W_ACCESSORY } from "./prop.h.js";
import { W_AMUL } from "./prop.h.js";
import { W_ARM } from "./prop.h.js";
import { W_ARMC } from "./prop.h.js";
import { W_ARMH } from "./prop.h.js";
import { W_ARMOR } from "./prop.h.js";
import { W_SWAPWEP } from "./prop.h.js";
import { W_WEP } from "./prop.h.js";
import { res_to_mr } from "./prop.h.macros.js";
import { fmon } from "./rm.h.macros.js";
import { levl } from "./rm.h.macros.js";
import { ALL_TRAPS } from "./trap.h.js";
import { NO_TRAP } from "./trap.h.js";
import { m_cansee } from "./vision.h.macros.js";
import { m_canseeu } from "./vision.h.macros.js";
import { PRONOUN_HALLU } from "./you.h.js";
import { PRONOUN_NO_IT } from "./you.h.js";
import { Upolyd } from "./you.h.macros.js";
import { Blind } from "./youprop.h.macros.js";
import { Blindfolded } from "./youprop.h.macros.js";
import { Blnd_resist } from "./youprop.h.macros.js";
import { Breathless } from "./youprop.h.macros.js";
import { Hallucination } from "./youprop.h.macros.js";
import { Strangled } from "./youprop.h.macros.js";
import { Unaware } from "./youprop.h.macros.js";
import { char } from "../rt/ctypes.js";
import { int } from "../rt/ctypes.js";
import { ord } from "../rt/ctypes.js";
import { short } from "../rt/ctypes.js";
import { unsigned } from "../rt/ctypes.js";
import { chars } from "../rt/heap.js";
import { stack_frame } from "../rt/heap.js";
import { stack_pop } from "../rt/heap.js";
import { or64 } from "../rt/int64.js";
import { shl64 } from "../rt/int64.js";
import { strcmp } from "../rt/libc.js";
import { strcpy } from "../rt/libc.js";
import { strlen } from "../rt/libc.js";
import { strncmp } from "../rt/libc.js";
import { stack_array } from "../rt/locals.js";
import { stack_struct } from "../rt/locals.js";
import { stack_var } from "../rt/locals.js";
import { static_array } from "../rt/locals.js";
import { _ } from "../rt/strings.js";
import { array_of } from "../rt/struct.js";
import { ptr_add } from "../rt/struct.js";
import { ptr_to } from "../rt/struct.js";
import { ref_of } from "../rt/struct.js";
import { struct } from "../rt/struct.js";
import { struct_assign } from "../rt/struct.js";
import { defends } from "./artifact.js";
import { defends_when_carried } from "./artifact.js";
import { title_to_mon } from "./botl.js";
import { cg } from "./decl.js";
import { gi } from "./decl.js";
import { gu } from "./decl.js";
import { gy } from "./decl.js";
import { svm } from "./decl.js";
import { u } from "./decl.js";
import { def_char_to_monclass } from "./drawing.js";
import { def_monsyms } from "./drawing.js";
import { dist2 } from "./hacklib.js";
import { highc } from "./hacklib.js";
import { strncmpi } from "./hacklib.js";
import { strstri } from "./hacklib.js";
import { mons } from "./monst.js";
import { objdescr_is } from "./o_init.js";
import { objects } from "./objects.js";
import { makesingular } from "./objnam.js";
import { impossible } from "./pline.js";
import { rn2 } from "./rnd.js";
import { rnd } from "./rnd.js";
import { is_fshk } from "./shk.js";
import { mon_has_amulet } from "./wizard.js";
import { which_armor } from "./worn.js";
