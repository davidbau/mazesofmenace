import { C } from './c-runtime.js';
/* NetHack 5.0	worn.c	$NHDT-Date: 1770949988 2026/02/12 18:33:08 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.119 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Robert Patrick Rankin, 2013. */
/* NetHack may be freely redistributed.  See license for details. */







/* for failing sanity check's feedback */
export const worn = [
    {w_mask:"W_ARM",w_obj:"uarm",w_what:"suit"},
    {w_mask:"W_ARMC",w_obj:"uarmc",w_what:"cloak"},
    {w_mask:"W_ARMH",w_obj:"uarmh",w_what:"helmet"},
    {w_mask:"W_ARMS",w_obj:"uarms",w_what:"shield"},
    {w_mask:"W_ARMG",w_obj:"uarmg",w_what:"gloves"},
    {w_mask:"W_ARMF",w_obj:"uarmf",w_what:"boots"},
    {w_mask:"W_ARMU",w_obj:"uarmu",w_what:"shirt"},
    {w_mask:"W_RINGL",w_obj:"uleft",w_what:"left ring"},
    {w_mask:"W_RINGR",w_obj:"uright",w_what:"right ring"},
    {w_mask:"W_WEP",w_obj:"uwep",w_what:"weapon"},
    {w_mask:"W_SWAPWEP",w_obj:"uswapwep",w_what:"alternate weapon"},
    {w_mask:"W_QUIVER",w_obj:"uquiver",w_what:"quiver"},
    {w_mask:"W_AMUL",w_obj:"uamul",w_what:"amulet"},
    {w_mask:"W_TOOL",w_obj:"ublindf",w_what:"facewear"}, /* blindfold|towel|lenses */
    {w_mask:"W_BALL",w_obj:"uball",w_what:"chained ball"},
    {w_mask:"W_CHAIN",w_obj:"uchain",w_what:"attached chain"},
    {w_mask:0,w_obj:0,w_what:0}
];

/* This only allows for one blocking item per property */
/*
#define w_blocks(o, m) \
    ((o->otyp == MUMMY_WRAPPING && ((m) & W_ARMC) != 0L) ? INVIS        \
     : (o->otyp == CORNUTHAUM && ((m) & W_ARMH) != 0L                   \
        && !Role_if(PM_WIZARD)) ? CLAIRVOYANT                           \
       : (is_art(o, ART_EYES_OF_THE_OVERWORLD)                          \
          && ((m) & W_TOOL) != 0L) ? BLINDED                            \
         : 0)
*/
/* note: monsters don't have clairvoyance, so dependency on hero's role here
   has no significant effect on their use of w_blocks() */

/* calc the range of hero's unblind telepathy */
export function recalc_telepat_range()
{
    let wp;
    let nobjs = 0;

    for (wp = 0; C.worn[wp].w_mask; wp++) {
        let oobj = C.worn[wp].w_obj.value;

        if (oobj && C.objects[oobj.otyp].oc_oprop == C.TELEPAT)
            nobjs++;
    }
    /* count all artifacts with SPFX_ESP as one */
    if (C.ETelepat & C.W_ART)
        nobjs++;

    if (nobjs)
        C.u.unblind_telepat_range = (C.BOLT_LIM * C.BOLT_LIM) * nobjs;
    else
        C.u.unblind_telepat_range = -1;
}

/* Updated to use the extrinsic and blocked fields. */
export function setworn(obj, mask)
{
    mask = C.long(mask);
    let wp;
    let oobj;
    let p;

    if ((mask & (C.W_ARM | C.I_SPECIAL)) == (C.W_ARM | C.I_SPECIAL)) {
        /* restoring saved game; no properties are conferred via skin */
        C.uskin = obj;
        /* assert( !uarm ); */
    } else {
        for (wp = 0; C.worn[wp].w_mask; wp++) {
            if (C.worn[wp].w_mask & mask) {
                oobj = C.worn[wp].w_obj.value;
                if (oobj && !(oobj.owornmask & C.worn[wp].w_mask))
                    C.impossible("Setworn: mask=0x%08lx.", C.worn[wp].w_mask);
                if (oobj) {
                    if (C.u.twoweap && (oobj.owornmask & (C.W_WEP | C.W_SWAPWEP)))
                        C.set_twoweap(0); /* u.twoweap = FALSE */
                    oobj.owornmask &= ~C.worn[wp].w_mask;
                    if (C.worn[wp].w_mask & ~(C.W_SWAPWEP | C.W_QUIVER)) {
                        /* leave as "x = x <op> y", here and below, for broken
                         * compilers */
                        p = C.objects[oobj.otyp].oc_oprop;
                        C.u.uprops[p].extrinsic =
                            C.u.uprops[p].extrinsic & ~C.worn[wp].w_mask;
                        /* if the hero removed an extrinsic-granting item,
                           nearby monsters will notice and attempt attacks of
                           that type again */
                        C.monstunseesu_prop(p);
                        if ((p = ((oobj.otyp == C.MUMMY_WRAPPING && ((mask) & C.W_ARMC) != 0n) ? C.INVIS
     : (oobj.otyp == C.CORNUTHAUM && ((mask) & C.W_ARMH) != 0n && !C.Role_if(C.PM_WIZARD)) ? C.CLAIRVOYANT
       : (C.is_art(oobj, C.ART_EYES_OF_THE_OVERWORLD) && ((mask) & C.W_TOOL) != 0n) ? C.BLINDED : 0)) != 0)
                            C.u.uprops[p].blocked &= ~C.worn[wp].w_mask;
                        if (oobj.oartifact)
                            C.set_artifact_intrinsic(oobj, 0, mask);
                    }
                    /* in case wearing or removal is in progress or removal
                       is pending (via 'A' command for multiple items) */
                    C.cancel_doff(oobj, C.worn[wp].w_mask);
                }
                C.worn[wp].w_obj.value = obj;
                if (obj) {
                    obj.owornmask |= C.worn[wp].w_mask;
                    /* Prevent getting/blocking intrinsics from wielding
                     * potions, through the quiver, etc.
                     * Allow weapon-tools, too.
                     * wp_mask should be same as mask at this point.
                     */
                    if (C.worn[wp].w_mask & ~(C.W_SWAPWEP | C.W_QUIVER)) {
                        if (obj.oclass == C.WEAPON_CLASS || C.is_weptool(obj)
                            || mask != C.W_WEP) {
                            p = C.objects[obj.otyp].oc_oprop;
                            C.u.uprops[p].extrinsic =
                                C.u.uprops[p].extrinsic | C.worn[wp].w_mask;
                            if ((p = ((obj.otyp == C.MUMMY_WRAPPING && ((mask) & C.W_ARMC) != 0n) ? C.INVIS
     : (obj.otyp == C.CORNUTHAUM && ((mask) & C.W_ARMH) != 0n && !C.Role_if(C.PM_WIZARD)) ? C.CLAIRVOYANT
       : (C.is_art(obj, C.ART_EYES_OF_THE_OVERWORLD) && ((mask) & C.W_TOOL) != 0n) ? C.BLINDED : 0)) != 0)
                                C.u.uprops[p].blocked |= C.worn[wp].w_mask;
                        }
                        if (obj.oartifact)
                            C.set_artifact_intrinsic(obj, 1, mask);
                    }
                }
            }
        }
        if (obj && (obj.owornmask & C.W_ARMOR) != 0n)
            C.u.uroleplay.nudist = 0;
        /* tux -> tuxedo -> "monkey suit" -> monk's suit */
        C.iflags.tux_penalty = (C.uarm && C.Role_if(C.PM_MONK) && C.gu.urole.spelarmr) ? 1 : 0;
    }
    if ((C.flags.weaponstatus && (mask & C.W_WEP) != 0n)
        || (C.flags.armorstatus && (mask & C.W_ARMOR) != 0n))
        C.disp.botl = 1;
    C.update_inventory();
    recalc_telepat_range();
}

/* called e.g. when obj is destroyed */
/* Updated to use the extrinsic and blocked fields. */
export function setnotworn(obj)
{
    let wp;
    let p;
    let unworn = 0n;

    if (!obj)
        return;
    if (C.u.twoweap && (C.samePtr(obj, C.uwep) || C.samePtr(obj, C.uswapwep)))
        C.set_twoweap(0); /* u.twoweap = FALSE */
    for (wp = 0; C.worn[wp].w_mask; wp++)
        if (C.samePtr(obj, C.worn[wp].w_obj.value)) {
            /* in case wearing or removal is in progress or removal
               is pending (via 'A' command for multiple items) */
            C.cancel_doff(obj, C.worn[wp].w_mask);

            C.worn[wp].w_obj.value = 0;
            unworn |= C.worn[wp].w_mask;
            p = C.objects[obj.otyp].oc_oprop;
            C.u.uprops[p].extrinsic = C.u.uprops[p].extrinsic & ~C.worn[wp].w_mask;
            C.monstunseesu_prop(p); /* remove this extrinsic from seenres */
            obj.owornmask &= ~C.worn[wp].w_mask;
            if (obj.oartifact)
                C.set_artifact_intrinsic(obj, 0, C.worn[wp].w_mask);
            if ((p = ((obj.otyp == C.MUMMY_WRAPPING && ((C.worn[wp].w_mask) & C.W_ARMC) != 0n) ? C.INVIS
     : (obj.otyp == C.CORNUTHAUM && ((C.worn[wp].w_mask) & C.W_ARMH) != 0n && !C.Role_if(C.PM_WIZARD)) ? C.CLAIRVOYANT
       : (C.is_art(obj, C.ART_EYES_OF_THE_OVERWORLD) && ((C.worn[wp].w_mask) & C.W_TOOL) != 0n) ? C.BLINDED : 0)) != 0)
                C.u.uprops[p].blocked &= ~C.worn[wp].w_mask;
        }
    if (!C.uarm)
        C.iflags.tux_penalty = 0;
    if ((C.flags.weaponstatus && (unworn & C.W_WEP) != 0n)
        || (C.flags.armorstatus && (unworn & C.W_ARMOR) != 0n))
        C.disp.botl = 1;
    C.update_inventory();
    recalc_telepat_range();
}

/* called when saving with FREEING flag set has just discarded inventory */
export function allunworn()
{
    let wp;

    C.u.twoweap = 0; /* uwep and uswapwep are going away */
    /* remove stale pointers; called after the objects have been freed
       (without first being unworn) while saving invent during game save;
       note: uball and uchain might not be freed yet but we clear them
       here anyway (savegamestate() and its callers deal with them) */
    for (wp = 0; C.worn[wp].w_mask; wp++) {
        /* object is already gone so we don't/can't update is owornmask */
        C.worn[wp].w_obj.value = 0;
    }
}


/* return item worn in slot indicated by wornmask; needed by poly_obj() */
export function wearmask_to_obj(wornmask)
{
    wornmask = C.long(wornmask);
    let wp;

    for (wp = 0; C.worn[wp].w_mask; wp++)
        if (C.worn[wp].w_mask & wornmask)
            return C.worn[wp].w_obj.value;
    return 0;
}

/* convert an armor wornmask to corresponding category */
export function wornmask_to_armcat(mask)
{
    mask = C.long(mask);
    let cat = 0;

    switch (mask & C.W_ARMOR) {
    case C.W_ARM:
        cat = C.ARM_SUIT;
        break;
    case C.W_ARMC:
        cat = C.ARM_CLOAK;
        break;
    case C.W_ARMH:
        cat = C.ARM_HELM;
        break;
    case C.W_ARMS:
        cat = C.ARM_SHIELD;
        break;
    case C.W_ARMG:
        cat = C.ARM_GLOVES;
        break;
    case C.W_ARMF:
        cat = C.ARM_BOOTS;
        break;
    case C.W_ARMU:
        cat = C.ARM_SHIRT;
        break;
    }
    return cat;
}

/* convert an armor category to corresponding wornmask */
export function armcat_to_wornmask(cat)
{
    cat = C.int(cat);
    let mask = 0n;

    switch (cat) {
    case C.ARM_SUIT:
        mask = C.W_ARM;
        break;
    case C.ARM_CLOAK:
        mask = C.W_ARMC;
        break;
    case C.ARM_HELM:
        mask = C.W_ARMH;
        break;
    case C.ARM_SHIELD:
        mask = C.W_ARMS;
        break;
    case C.ARM_GLOVES:
        mask = C.W_ARMG;
        break;
    case C.ARM_BOOTS:
        mask = C.W_ARMF;
        break;
    case C.ARM_SHIRT:
        mask = C.W_ARMU;
        break;
    }
    return mask;
}

/* return a bitmask of the equipment slot(s) a given item might be worn in */
export function wearslot(obj)
{
    let otyp = obj.otyp;
    /* practically any item can be wielded or quivered; it's up to
       our caller to handle such things--we assume "normal" usage */
    let res = 0n; /* default: can't be worn anywhere */

    switch (obj.oclass) {
    case C.AMULET_CLASS:
        res = C.W_AMUL; /* WORN_AMUL */
        break;
    case C.RING_CLASS:
        res = C.W_RINGL | C.W_RINGR; /* W_RING, BOTH_SIDES */
        break;
    case C.ARMOR_CLASS:
        switch (C.objects[otyp].oc_armcat) {
        case C.ARM_SUIT:
            res = C.W_ARM;
            break; /* WORN_ARMOR */
        case C.ARM_SHIELD:
            res = C.W_ARMS;
            break; /* WORN_SHIELD */
        case C.ARM_HELM:
            res = C.W_ARMH;
            break; /* WORN_HELMET */
        case C.ARM_GLOVES:
            res = C.W_ARMG;
            break; /* WORN_GLOVES */
        case C.ARM_BOOTS:
            res = C.W_ARMF;
            break; /* WORN_BOOTS */
        case C.ARM_CLOAK:
            res = C.W_ARMC;
            break; /* WORN_CLOAK */
        case C.ARM_SHIRT:
            res = C.W_ARMU;
            break; /* WORN_SHIRT */
        }
        break;
    case C.WEAPON_CLASS:
        res = C.W_WEP | C.W_SWAPWEP;
        if (C.objects[otyp].oc_merge)
            res |= C.W_QUIVER;
        break;
    case C.TOOL_CLASS:
        if (otyp == C.BLINDFOLD || otyp == C.TOWEL || otyp == C.LENSES)
            res = C.W_TOOL; /* WORN_BLINDF */
        else if (C.is_weptool(obj) || otyp == C.TIN_OPENER)
            res = C.W_WEP | C.W_SWAPWEP;
        else if (otyp == C.SADDLE)
            res = C.W_SADDLE;
        break;
    case C.FOOD_CLASS:
        if (obj.otyp == C.MEAT_RING)
            res = C.W_RINGL | C.W_RINGR;
        break;
    case C.GEM_CLASS:
        res = C.W_QUIVER;
        break;
    case C.BALL_CLASS:
        res = C.W_BALL;
        break;
    case C.CHAIN_CLASS:
        res = C.W_CHAIN;
        break;
    default:
        break;
    }
    return res;
}

/* for 'sanity_check' option, called by you_sanity_check() */
export function check_wornmask_slots()
{
    /* we'll skip ball and chain here--they warrant separate sanity check */
    const IGNORE_SLOTS = (C.W_ART | C.W_ARTI | C.W_SADDLE | C.W_BALL | C.W_CHAIN);
    const whybuf = C.stackAlloc(C.BUFSZ);
    let wp;
    let o, otmp;
    let m;

    for (wp = 0; C.worn[wp].w_mask; wp++) {
        m = C.worn[wp].w_mask;
        if ((m & IGNORE_SLOTS) != 0n && (m & ~IGNORE_SLOTS) == 0n)
            continue;
        if ((o = C.worn[wp].w_obj.value) != 0) {
            C.storeChar(whybuf + (0), '\0'.charCodeAt(0));
            /* slot pointer (uarm, uwep, &c) is populated; check that object
               is in inventory and has the relevant owornmask bit set */
            for (otmp = C.gi.invent; otmp; otmp = otmp.nobj)
                if (C.samePtr(otmp, o))
                    break;
            if (!otmp)
                C.Sprintf(whybuf, "%s (%s) not found in invent",
                        C.worn[wp].w_what, C.fmt_ptr(o));
            else if ((o.owornmask & m) == 0n)
                C.Sprintf(whybuf, "%s bit not set in owornmask [0x%08lx]",
                        C.worn[wp].w_what, o.owornmask);
            else if ((o.owornmask & ~(m | IGNORE_SLOTS)) != 0n)
                C.Sprintf(whybuf, "%s wrong bit set in owornmask [0x%08lx]",
                        C.worn[wp].w_what, o.owornmask);
            if (C.loadChar(whybuf))
                C.impossible("Worn-slot insanity: %s.", whybuf);
        } /* o != NULL */

        /* check whether any item other than the one in the slot pointer
           claims to be worn/wielded in this slot; make this test whether
           'o' is Null or not; [sanity_check_worn(mkobj.c) for object by
           object checking will most likely have already caught this] */
        for (otmp = C.gi.invent; otmp; otmp = otmp.nobj) {
            if (!C.samePtr(otmp, o) && (otmp.owornmask & m) != 0n
                /* embedded scales owornmask is W_ARM|I_SPECIAL so would
                   give a false complaint about item other than uarm having
                   W_ARM bit set if we didn't screen it out here */
                && (m != C.W_ARM || !C.samePtr(otmp, C.uskin)
                    || (otmp.owornmask & C.I_SPECIAL) == 0n)) {
                C.Sprintf(whybuf, "%s [0x%08lx] has %s mask 0x%08lx bit set",
                        C.simpleonames(otmp), otmp.owornmask, C.worn[wp].w_what, m);
                C.impossible("Worn-slot insanity: %s.", whybuf);
            }
        }
    } /* for wp in worn[] */

/* uskin */
/* EXTRA_SANITY_CHECKS */

/* dual wielding: not a slot but lots of things to verify */
/* EXTRA_SANITY_CHECKS */
    return;
} /* check_wornmask_slots() */

export function mon_set_minvis(mon, cursed_potion)
{
    cursed_potion = C.boolean(cursed_potion);
    mon.perminvis = !cursed_potion ? 1 : 0;
    if (!mon.invis_blkd) {
        mon.minvis = mon.perminvis;
        C.newsym(mon.mx, mon.my); /* make it disappear */
        if (mon.wormno)
            C.see_wsegs(mon); /* and any tail too */
    }
}

export function mon_adjust_speed(mon, adjust, obj)
/* positive => increase speed, negative => decrease */ /* item to make known if effect can be seen */
{
    adjust = C.int(adjust);
    let otmp;
    let give_msg = !C.gi.in_mklev, petrify = 0;
    let oldspeed = mon.mspeed;

    switch (adjust) {
    case 2:
        mon.permspeed = C.MFAST;
        give_msg = 0; /* special-case monster creation */
        break;
    case 1:
        if (mon.permspeed == C.MSLOW)
            mon.permspeed = 0;
        else
            mon.permspeed = C.MFAST;
        break;
    case 0: /* just check for worn speed boots */
        break;
    case -1:
        if (mon.permspeed == C.MFAST)
            mon.permspeed = 0;
        else
            mon.permspeed = C.MSLOW;
        break;
    case -2:
        mon.permspeed = C.MSLOW;
        give_msg = 0; /* (not currently used) */
        break;
    case -3: /* petrification */
        /* take away intrinsic speed but don't reduce normal speed */
        if (mon.permspeed == C.MFAST)
            mon.permspeed = 0;
        petrify = 1;
        break;
    case -4: /* green slime */
        if (mon.permspeed == C.MFAST)
            mon.permspeed = 0;
        give_msg = 0;
        break;
    }

    for (otmp = mon.minvent; otmp; otmp = otmp.nobj)
        if (otmp.owornmask && C.objects[otmp.otyp].oc_oprop == C.FAST)
            break;
    if (otmp) /* speed boots */
        mon.mspeed = C.MFAST;
    else
        mon.mspeed = mon.permspeed;

    /* no message if monster is immobile (temp or perm) or unseen */
    if (give_msg && (mon.mspeed != oldspeed || petrify) && mon.data.mmove
        && !(mon.mfrozen || mon.msleeping) && C.canseemon(mon)) {
        /* fast to slow (skipping intermediate state) or vice versa */
        const howmuch =
            (mon.mspeed + oldspeed == C.MFAST + C.MSLOW) ? "much " : "";

        if (petrify) {
            /* mimic the player's petrification countdown; "slowing down"
               even if fast movement rate retained via worn speed boots */
            if (C.flags.verbose)
                C.pline_mon(mon, "%s is slowing down.", C.Monnam(mon));
        } else if (adjust > 0 || mon.mspeed == C.MFAST)
            C.pline_mon(mon, "%s is suddenly moving %sfaster.",
                      C.Monnam(mon), howmuch);
        else
            C.pline_mon(mon, "%s seems to be moving %sslower.",
                      C.Monnam(mon), howmuch);

        /* might discover an object if we see the speed change happen */
        if (obj != 0)
            C.learnwand(obj);
    }
}

/* alchemy smock confers two properties, poison and acid resistance
   but objects[ALCHEMY_SMOCK].oc_oprop can only describe one of them;
   if it is poison resistance, alternate property is acid resistance;
   if someone changes it to acid resistance, alt becomes poison resist;
   if someone changes it to hallucination resistance, all bets are off
   [TODO: handle alternate properties conferred by dragon scales/mail] */
/*
#define altprop(o) \
    (((o)->otyp == ALCHEMY_SMOCK)                               \
     ? (POISON_RES + ACID_RES - objects[(o)->otyp].oc_oprop)    \
     : 0)
*/

/* armor put on or taken off; might be magical variety */
export function update_mon_extrinsics(mon, obj, on, silently)
/* armor being worn or taken off */
{
    on = C.boolean(on); silently = C.boolean(silently);
    let unseen;
    let mask;
    let otmp;
    let which = C.objects[obj.otyp].oc_oprop,
        altwhich = ((obj.otyp == C.ALCHEMY_SMOCK) ? (C.POISON_RES + C.ACID_RES - C.objects[obj.otyp].oc_oprop) : 0);

    unseen = !C.canseemon(mon);
    maybe_blocks: {
    if (!which && !altwhich)
        break maybe_blocks;

    again: for (;;) {
    if (on) {
        switch (which) {
        case C.INVIS:
            mon.minvis = !mon.invis_blkd;
            break;
        case C.FAST: {
            let save_in_mklev = C.gi.in_mklev;
            if (silently)
                C.gi.in_mklev = 1;
            mon_adjust_speed(mon, 0, obj);
            C.gi.in_mklev = save_in_mklev;
            break;
        }
        /* properties handled elsewhere */
        case C.ANTIMAGIC:
        case C.REFLECTING:
        case C.PROTECTION:
            break;
        /* properties which have no effect for monsters */
        case C.CLAIRVOYANT:
        case C.STEALTH:
        case C.TELEPAT:
            break;
        /* properties which should have an effect but aren't implemented */
        case C.LEVITATION:
        case C.FLYING:
        case C.WWALKING:
            break;
        /* properties which maybe should have an effect but don't */
        case C.DISPLACED:
        case C.FUMBLING:
        case C.JUMPING:
            break;
        default:
            mon.mextrinsics |= C.res_to_mr(which);
            break;
        }
    } else { /* off */
        switch (which) {
        case C.INVIS:
            mon.minvis = mon.perminvis;
            break;
        case C.FAST: {
            let save_in_mklev = C.gi.in_mklev;
            if (silently)
                C.gi.in_mklev = 1;
            mon_adjust_speed(mon, 0, obj);
            C.gi.in_mklev = save_in_mklev;
            break;
        }
        case C.FIRE_RES:
        case C.COLD_RES:
        case C.SLEEP_RES:
        case C.DISINT_RES:
        case C.SHOCK_RES:
        case C.POISON_RES:
        case C.ACID_RES:
        case C.STONE_RES:
            /*
             * Update monster's extrinsics (for worn objects only;
             * 'obj' itself might still be worn or already unworn).
             *
             * If an alchemy smock is being taken off, this code will
             * be run twice (via 'goto again') and other worn gear
             * gets tested for conferring poison resistance on the
             * first pass and acid resistance on the second.
             *
             * If some other item is being taken off, there will be
             * only one pass but a worn alchemy smock will be an
             * alternate source for either of those two resistances.
             */
            mask = C.res_to_mr(which);
            for (otmp = mon.minvent; otmp; otmp = otmp.nobj) {
                if (C.samePtr(otmp, obj) || !otmp.owornmask)
                    continue;
                if (C.objects[otmp.otyp].oc_oprop == which)
                    break;
                /* check whether 'otmp' confers target property as an extra
                   one rather than as the one specified for it in objects[] */
                if (((otmp.otyp == C.ALCHEMY_SMOCK) ? (C.POISON_RES + C.ACID_RES - C.objects[otmp.otyp].oc_oprop) : 0) == which)
                    break;
            }
            if (!otmp)
                mon.mextrinsics &= ~(mask);
            break;
        default:
            break;
        }
    }

    /* worn alchemy smock/apron confers both poison resistance and acid
       resistance to the hero so do likewise for monster who wears one */
    if (altwhich && which != altwhich) {
        which = altwhich;
        continue again;
    }

    break;
    }
    }
    /* obj->owornmask has been cleared by this point, so we can't use it.
       However, since monsters don't wield armor, we don't have to guard
       against that and can get away with a blanket worn-mask value. */
    switch (((obj.otyp == C.MUMMY_WRAPPING && ((~0n) & C.W_ARMC) != 0n) ? C.INVIS
     : (obj.otyp == C.CORNUTHAUM && ((~0n) & C.W_ARMH) != 0n && !C.Role_if(C.PM_WIZARD)) ? C.CLAIRVOYANT
       : (C.is_art(obj, C.ART_EYES_OF_THE_OVERWORLD) && ((~0n) & C.W_TOOL) != 0n) ? C.BLINDED : 0)) {
    case C.INVIS:
        mon.invis_blkd = on ? 1 : 0;
        mon.minvis = on ? 0 : mon.perminvis;
        break;
    default:
        break;
    }

    if (!on && C.samePtr(mon, C.u.usteed) && obj.otyp == C.SADDLE)
        C.dismount_steed(C.DISMOUNT_FELL);

    /* if couldn't see it but now can, or vice versa, update display */
    if (!silently && (unseen ^ !C.canseemon(mon)))
        C.newsym(mon.mx, mon.my);
}


export function find_mac(mon)
{
    let obj;
    let base = mon.data.ac;
    let mwflags = mon.misc_worn_check;

    for (obj = mon.minvent; obj; obj = obj.nobj) {
        if (obj.owornmask & mwflags) {
            if (obj.otyp == C.AMULET_OF_GUARDING)
                base -= 2; /* fixed amount, not impacted by erosion */
            else
                base -= C.ARM_BONUS(obj);
            /* since ARM_BONUS is positive, subtracting it increases AC */
        }
    }
    /* same cap as for hero [find_ac(do_wear.c)] */
    if (C.abs(base) > C.AC_MAX)
        base = C.sgn(base) * C.AC_MAX;
    return base;
}

/*
 * weapons are handled separately;
 * rings and eyewear aren't used by monsters
 */

/* Wear the best object of each type that the monster has.  During creation,
 * the monster can put everything on at once; otherwise, wearing takes time.
 * This doesn't affect monster searching for objects--a monster may very well
 * search for objects it would not want to wear, because we don't want to
 * check which_armor() each round.
 *
 * We'll let monsters put on shirts and/or suits under worn cloaks, but
 * not shirts under worn suits.  This is somewhat arbitrary, but it's
 * too tedious to have them remove and later replace outer garments,
 * and preventing suits under cloaks makes it a little bit too easy for
 * players to influence what gets worn.  Putting on a shirt underneath
 * already worn body armor is too obviously buggy...
 */
export function m_dowear(mon, creation)
{
    creation = C.boolean(creation);
    let can_wear_armor;

    const RACE_EXCEPTION = 1;
    /* Note the restrictions here are the same as in dowear in do_wear.c
     * except for the additional restriction on intelligence.  (Players
     * are always intelligent, even if polymorphed).
     */
    if (C.verysmall(mon.data) || C.nohands(mon.data) || C.is_animal(mon.data))
        return;
    /* give mummies a chance to wear their wrappings
     * and let skeletons wear their initial armor */
    if (C.mindless(mon.data)
        && (!creation || (mon.data.mlet != C.S_MUMMY
                          && !C.samePtr(mon.data, C.mons[C.PM_SKELETON]))))
        return;

    C.callLocal(m_dowear_type, mon, C.W_AMUL, creation, 0);
    can_wear_armor = !C.cantweararm(mon.data); /* for suit, cloak, shirt */
    /* can't put on shirt if already wearing suit */
    if (can_wear_armor && !(mon.misc_worn_check & C.W_ARM))
        C.callLocal(m_dowear_type, mon, C.W_ARMU, creation, 0);
    /* WrappingAllowed() makes any size between small and huge eligible;
       treating small as a special case allows hobbits, gnomes, and
       kobolds to wear all cloaks; large and huge allows giants and such
       to wear mummy wrappings but not other cloaks */
    if (can_wear_armor || C.WrappingAllowed(mon.data))
        C.callLocal(m_dowear_type, mon, C.W_ARMC, creation, 0);
    C.callLocal(m_dowear_type, mon, C.W_ARMH, creation, 0);
    if (!C.MON_WEP(mon) || !C.bimanual(C.MON_WEP(mon)))
        C.callLocal(m_dowear_type, mon, C.W_ARMS, creation, 0);
    C.callLocal(m_dowear_type, mon, C.W_ARMG, creation, 0);
    if (!C.slithy(mon.data) && mon.data.mlet != C.S_CENTAUR)
        C.callLocal(m_dowear_type, mon, C.W_ARMF, creation, 0);
    if (can_wear_armor)
        C.callLocal(m_dowear_type, mon, C.W_ARM, creation, 0);
    else
        C.callLocal(m_dowear_type, mon, C.W_ARM, creation, RACE_EXCEPTION);
}

export function m_dowear_type(mon, flag, creation, racialexception)
/* wornmask value */ /* no wear messages when mon is being created */ /* small monsters that are allowed for player
                              * races (gnomes) can wear suits */
{
    flag = C.long(flag); creation = C.boolean(creation); racialexception = C.boolean(racialexception);
    let old, best, obj;
    let oldmask = 0n;
    let m_delay = 0;
    let sawmon = C.canseemon(mon), sawloc = C.cansee(mon.mx, mon.my);
    let autocurse;
    const nambuf = C.stackAlloc(C.BUFSZ);

    if (mon.mfrozen)
        return; /* probably putting previous item on */

    /* Get a copy of monster's name before altering its visibility */
    C.Strcpy(nambuf, C.See_invisible ? C.Monnam(mon) : C.mon_nam(mon));

    old = which_armor(mon, flag);
    if (old && old.cursed)
        return;
    if (old && flag == C.W_AMUL && old.otyp != C.AMULET_OF_GUARDING)
        return; /* no amulet better than life-saving or reflection */
    best = old;

    outer_break: for (obj = mon.minvent; obj; obj = obj.nobj) {
        switch (flag) {
        case C.W_AMUL:
            if (obj.oclass != C.AMULET_CLASS
                || (obj.otyp != C.AMULET_OF_LIFE_SAVING
                    && obj.otyp != C.AMULET_OF_REFLECTION
                    && obj.otyp != C.AMULET_OF_GUARDING))
                continue;
            /* for 'best' to be non-Null, it must be an amulet of guarding;
               life-saving and reflection don't get here due to early return
               and other amulets of guarding can't be any better */
            if (!best || obj.otyp != C.AMULET_OF_GUARDING) {
                best = obj;
                if (best.otyp != C.AMULET_OF_GUARDING)
                    break outer_break; /* life-saving or reflection; use it */
            }
            continue; /* skip post-switch armor handling */
        case C.W_ARMU:
            if (!C.is_shirt(obj))
                continue;
            break;
        case C.W_ARMC:
            if (!C.is_cloak(obj))
                continue;
            /* mummy wrapping is only cloak allowed when bigger than human */
            if (mon.data.msize > C.MZ_HUMAN && obj.otyp != C.MUMMY_WRAPPING)
                continue;
            /* avoid mummy wrapping if it will allow hero to see mon (unless
               this is a new mummy; an invisible one is feasible via ^G) */
            if (mon.minvis && ((obj.otyp == C.MUMMY_WRAPPING && ((C.W_ARMC) & C.W_ARMC) != 0n) ? C.INVIS
     : (obj.otyp == C.CORNUTHAUM && ((C.W_ARMC) & C.W_ARMH) != 0n && !C.Role_if(C.PM_WIZARD)) ? C.CLAIRVOYANT
       : (C.is_art(obj, C.ART_EYES_OF_THE_OVERWORLD) && ((C.W_ARMC) & C.W_TOOL) != 0n) ? C.BLINDED : 0) == C.INVIS
                && !C.See_invisible && !creation)
                continue;
            break;
        case C.W_ARMH:
            if (!C.is_helmet(obj))
                continue;
            /* changing alignment is not implemented for monsters;
               priests and minions could change alignment but wouldn't
               want to, so they reject helms of opposite alignment */
            if (obj.otyp == C.HELM_OF_OPPOSITE_ALIGNMENT
                && (mon.ispriest || mon.isminion))
                continue;
            /* (flimsy exception matches polyself handling) */
            if (C.has_horns(mon.data) && !C.is_flimsy(obj))
                continue;
            break;
        case C.W_ARMS:
            if (!C.is_shield(obj))
                continue;
            break;
        case C.W_ARMG:
            if (!C.is_gloves(obj))
                continue;
            break;
        case C.W_ARMF:
            if (!C.is_boots(obj))
                continue;
            break;
        case C.W_ARM:
            if (!C.is_suit(obj))
                continue;
            if (racialexception && (racial_exception(mon, obj) < 1))
                continue;
            break;
        }
        if (obj.owornmask)
            continue;
        /* I'd like to define a VISIBLE_ARM_BONUS which doesn't assume the
         * monster knows obj->spe, but if I did that, a monster would keep
         * switching forever between two -2 caps since when it took off one
         * it would forget spe and once again think the object is better
         * than what it already has.
         */
        if (best && (C.ARM_BONUS(best) + extra_pref(mon, best)
                     >= C.ARM_BONUS(obj) + extra_pref(mon, obj)))
            continue;
        best = obj;
    }
    if (!best || C.samePtr(best, old))
        return;

    /* same auto-cursing behavior as for hero */
    autocurse = ((best.otyp == C.HELM_OF_OPPOSITE_ALIGNMENT
                  || best.otyp == C.DUNCE_CAP) && !best.cursed);
    /* if wearing a cloak, account for the time spent removing
       and re-wearing it when putting on a suit or shirt */
    if ((flag == C.W_ARM || flag == C.W_ARMU) && (mon.misc_worn_check & C.W_ARMC))
        m_delay += 2;
    /* when upgrading a piece of armor, account for time spent
       taking off current one */
    if (old) {
        m_delay += C.objects[old.otyp].oc_delay;

        oldmask = old.owornmask; /* needed later by artifact_light() */
        old.owornmask = 0n; /* avoid doname() showing "(being worn)" */
    }

    if (!creation) {
        if (sawmon) {
            const buf = C.stackAlloc(C.BUFSZ), oldarm = C.stackAlloc(C.BUFSZ), newarm = C.stackAlloc(C.BUFSZ + C.anotherSize);

            /* "<Mon> [removes <oldarm> and ]puts on <newarm>."
               uses accessory verbs for armor but we can live with that */
            if (old) {
                C.Strcpy(oldarm, C.distant_name(old, C.doname));
                C.Snprintf(buf, C.BUFSZ, " removes %s and", oldarm);
            } else {
                C.storeChar(buf, C.storeChar(oldarm, '\0'.charCodeAt(0)));
            }
            C.Strcpy(newarm, C.distant_name(best, C.doname));
            /* a monster will swap an item of the same type as the one it
               is replacing when the enchantment is better;
               if newarm and oldarm have identical descriptions, substitute
               "another <newarm>" for "a|an <newarm>" */
            if (!C.strcmpi(newarm, oldarm)) {
                /* size of newarm[] has been overallocated to guarantee
                   enough room to insert "another " */
                if (!C.strncmpi(newarm, "a ", 2))
                    C.strsubst(newarm, "a ", "another ");
                else if (!C.strncmpi(newarm, "an ", 3))
                    C.strsubst(newarm, "an ", "another ");
                C.storeChar(newarm + (C.BUFSZ - 1), '\0'.charCodeAt(0));
            }
            C.pline_mon(mon, "%s%s puts on %s.", C.Monnam(mon), buf, newarm);
            if (autocurse)
                C.pline("%s %s %s %s for a moment.", C.s_suffix(C.Monnam(mon)),
                      C.simpleonames(best), C.otense(best, "glow"),
                      C.hcolor(C.NH_BLACK));
        } /* can see it */
        m_delay += C.objects[best.otyp].oc_delay;
        mon.mfrozen = m_delay;
        if (mon.mfrozen)
            mon.mcanmove = 0;
    }
    if (old) {
        update_mon_extrinsics(mon, old, 0, creation);

        /* owornmask was cleared above but artifact_light() expects it */
        old.owornmask = oldmask;
        if (old.lamplit && C.artifact_light(old))
            C.end_burn(old, 0);
        old.owornmask = 0n;
    }
    mon.misc_worn_check |= flag;
    best.owornmask |= flag;
    if (autocurse)
        C.curse(best);
    if (C.artifact_light(best) && !best.lamplit) {
        C.begin_burn(best, 0);
        C.vision_recalc(1);
        if (!creation && best.lamplit && C.cansee(mon.mx, mon.my)) {
            const adesc = C.arti_light_description(best);

            if (sawmon) /* could already see monster */
                C.pline("%s %s to shine %s.", C.Yname2(best),
                      C.otense(best, "begin"), adesc);
            else if (C.canseemon(mon)) /* didn't see it until new light */
                C.pline("%s %s shining %s.", C.Yname2(best),
                      C.otense(best, "are"), adesc);
            else if (sawloc) /* saw location but not invisible monster */
                C.pline("%s begins to shine %s.", C.Something, adesc);
            else /* didn't see location until new light */
                C.pline("%s is shining %s.", C.Something, adesc);
        }
    }
    update_mon_extrinsics(mon, best, 1, creation);
    /* if couldn't see it but now can, or vice versa */
    if (!creation && (sawmon ^ C.canseemon(mon))) {
        if (mon.minvis && !C.See_invisible) {
            C.pline("Suddenly you cannot see %s.", nambuf);
            C.makeknown(best.otyp);
        /* } else if (!mon->minvis) {
         *     pline("%s suddenly appears!", Amonnam(mon)); */
        }
    }
}

export function which_armor(mon, flag)
{
    flag = C.long(flag);
    if (C.samePtr(mon, C.gy.youmonst)) {
        switch (flag) {
        case C.W_ARM:
            return C.uarm;
        case C.W_ARMC:
            return C.uarmc;
        case C.W_ARMH:
            return C.uarmh;
        case C.W_ARMS:
            return C.uarms;
        case C.W_ARMG:
            return C.uarmg;
        case C.W_ARMF:
            return C.uarmf;
        case C.W_ARMU:
            return C.uarmu;
        default:
            C.impossible("bad flag in which_armor");
            return 0;
        }
    } else {
        let obj;

        for (obj = mon.minvent; obj; obj = obj.nobj)
            if (obj.owornmask & flag)
                return obj;
        return 0;
    }
}

/* remove an item of armor and then drop it */
export function m_lose_armor(mon, obj, polyspot)
{
    polyspot = C.boolean(polyspot);
    extract_from_minvent(mon, obj, 1, 0);
    C.place_object(obj, mon.mx, mon.my);
    if (polyspot)
        bypass_obj(obj);
    /* call stackobj() if we ever drop anything that can merge */
    C.newsym(mon.mx, mon.my);
}

/* clear bypass bits for an object chain, plus contents if applicable */
export function clear_bypass(objchn)
{
    let o;

    for (o = objchn; o; o = o.nobj) {
        o.bypass = 0;
        if (C.Has_contents(o))
            clear_bypass(o.cobj);
    }
}

/* all objects with their bypass bit set should now be reset to normal;
   this can be a relatively expensive operation so is only called if
   svc.context.bypasses is set */
export function clear_bypasses()
{
    let mtmp;

    /*
     * 'Object' bypass is also used for one monster function:
     * polymorph control of long worms.  Activated via setting
     * svc.context.bypasses even if no specific object has been
     * bypassed.
     */

    clear_bypass(C.fobj);
    clear_bypass(C.gi.invent);
    clear_bypass(C.gm.migrating_objs);
    clear_bypass(C.svl.level.buriedobjlist);
    clear_bypass(C.gb.billobjs);
    clear_bypass(C.go.objs_deleted);
    for (mtmp = C.fmon; mtmp; mtmp = mtmp.nmon) {
        if (C.DEADMONSTER(mtmp))
            continue;
        clear_bypass(mtmp.minvent);
        /* long worm created by polymorph has mon->mextra->mcorpsenm set
           to PM_LONG_WORM to flag it as not being subject to further
           polymorph (so polymorph zap won't hit monster to transform it
           into a long worm, then hit that worm's tail and transform it
           again on same zap); clearing mcorpsenm reverts worm to normal */
        if (C.samePtr(mtmp.data, C.mons[C.PM_LONG_WORM]) && C.has_mcorpsenm(mtmp))
            mtmp.mextra.mcorpsenm = C.NON_PM;
    }
    for (mtmp = C.gm.migrating_mons; mtmp; mtmp = mtmp.nmon) {
        clear_bypass(mtmp.minvent);
        /* no MCORPSENM(mtmp)==PM_LONG_WORM check here; long worms can't
           be just created by polymorph and migrating at the same time */
    }
    /* this is a no-op since mydogs is only non-Null during level change or
       final ascension and we aren't called at those times, but be thorough */
    for (mtmp = C.gm.mydogs; mtmp; mtmp = mtmp.nmon)
        clear_bypass(mtmp.minvent);
    /* ball and chain can be "floating", not on any object chain (when
       hero is swallowed by an engulfing monster, for instance) */
    if (C.uball)
        C.uball.bypass = 0;
    if (C.uchain)
        C.uchain.bypass = 0;

    C.svc.context.bypasses = 0;
}

export function bypass_obj(obj)
{
    obj.bypass = 1;
    C.svc.context.bypasses = 1;
}

/* set or clear the bypass bit in a list of objects */
export function bypass_objlist(objchain, on)
/* TRUE => set, FALSE => clear */
{
    on = C.boolean(on);
    if (on && objchain)
        C.svc.context.bypasses = 1;
    while (objchain) {
        objchain.bypass = on ? 1 : 0;
        objchain = objchain.nobj;
    }
}

/* return the first object without its bypass bit set; set that bit
   before returning so that successive calls will find further objects */
export function nxt_unbypassed_obj(objchain)
{
    while (objchain) {
        if (!objchain.bypass) {
            bypass_obj(objchain);
            break;
        }
        objchain = objchain.nobj;
    }
    return objchain;
}

/* like nxt_unbypassed_obj() but operates on sortloot_item array rather
   than an object linked list; the array contains obj==Null terminator;
   there's an added complication that the array may have stale pointers
   for deleted objects (see Multiple-Drop case in askchain(invent.c)) */
export function nxt_unbypassed_loot(lootarray, listhead)
{
    let o, obj;

    while ((obj = lootarray.obj) != 0) {
        for (o = listhead; o; o = o.nobj)
            if (C.samePtr(o, obj))
                break;
        if (o && !obj.bypass) {
            bypass_obj(obj);
            break;
        }
        lootarray = C.lootNext(lootarray);
    }
    return obj;
}

export function mon_break_armor(mon, polyspot)
{
    polyspot = C.boolean(polyspot);
    let otmp;
    let mdat = mon.data;
    let vis = C.cansee(mon.mx, mon.my),
            handless_or_tiny = (C.nohands(mdat) || C.verysmall(mdat)),
            noride = 0;
    const pronoun = C.mhim(mon), ppronoun = C.mhis(mon);

    if (C.breakarm(mdat)) {
        if ((otmp = which_armor(mon, C.W_ARM)) != 0) {
            if ((C.Is_dragon_scales(otmp) && C.samePtr(mdat, C.Dragon_scales_to_pm(otmp)))
                || (C.Is_dragon_mail(otmp) && C.samePtr(mdat, C.Dragon_mail_to_pm(otmp)))) {
                ; /* no message here;
                     "the dragon merges with his scaly armor" is odd
                     and the monster's previous form is already gone */
            } else {
                // C.Soundeffect(se_cracking_sound, 100);
                if (vis)
                    C.pline_mon(mon, "%s breaks out of %s armor!",
                              C.Monnam(mon), ppronoun);
                else
                    C.You_hear("a cracking sound.");
            }
            C.m_useup(mon, otmp);
        }
        if ((otmp = which_armor(mon, C.W_ARMC)) != 0
            /* mummy wrapping adapts to small and very big sizes */
            && (otmp.otyp != C.MUMMY_WRAPPING || !C.WrappingAllowed(mdat))) {
            if (otmp.oartifact) {
                if (vis)
                    C.pline_mon(mon, "%s %s falls off!", C.s_suffix(C.Monnam(mon)),
                          C.cloak_simple_name(otmp));
                m_lose_armor(mon, otmp, polyspot);
            } else {
                // C.Soundeffect(se_ripping_sound, 100);
                if (vis)
                    C.pline_mon(mon, "%s %s tears apart!", C.s_suffix(C.Monnam(mon)),
                          C.cloak_simple_name(otmp));
                else
                    C.You_hear("a ripping sound.");
                C.m_useup(mon, otmp);
            }
        }
        if ((otmp = which_armor(mon, C.W_ARMU)) != 0) {
            if (vis)
                C.pline_mon(mon, "%s shirt rips to shreds!",
                          C.s_suffix(C.Monnam(mon)));
            else
                C.You_hear("a ripping sound.");
            C.m_useup(mon, otmp);
        }
    } else if (C.sliparm(mdat)) {
        /* sliparm checks whirly, noncorporeal, and small or under */
        let passes_thru_clothes = !(mdat.msize <= C.MZ_SMALL);

        if ((otmp = which_armor(mon, C.W_ARM)) != 0) {
            // C.Soundeffect(se_thud, 50);
            if (vis)
                C.pline_mon(mon, "%s armor falls around %s!",
                          C.s_suffix(C.Monnam(mon)), pronoun);
            else
                C.You_hear("a thud.");
            m_lose_armor(mon, otmp, polyspot);
        }
        if ((otmp = which_armor(mon, C.W_ARMC)) != 0
            /* mummy wrapping adapts to small and very big sizes */
            && (otmp.otyp != C.MUMMY_WRAPPING || !C.WrappingAllowed(mdat))) {
            if (vis) {
                if (C.is_whirly(mon.data))
                    C.pline_mon(mon, "%s %s falls, unsupported!",
                              C.s_suffix(C.Monnam(mon)), C.cloak_simple_name(otmp));
                else
                    C.pline_mon(mon, "%s shrinks out of %s %s!",
                              C.Monnam(mon), ppronoun,
                              C.cloak_simple_name(otmp));
            }
            m_lose_armor(mon, otmp, polyspot);
        }
        if ((otmp = which_armor(mon, C.W_ARMU)) != 0) {
            if (vis) {
                if (passes_thru_clothes)
                    C.pline_mon(mon, "%s seeps right through %s shirt!",
                              C.Monnam(mon), ppronoun);
                else
                    C.pline_mon(mon, "%s becomes much too small for %s shirt!",
                          C.Monnam(mon), ppronoun);
            }
            m_lose_armor(mon, otmp, polyspot);
        }
    }
    if (handless_or_tiny) {
        /* [caller needs to handle weapon checks] */
        if ((otmp = which_armor(mon, C.W_ARMG)) != 0) {
            if (vis)
                C.pline_mon(mon, "%s drops %s gloves%s!",
                          C.Monnam(mon), ppronoun,
                          C.MON_WEP(mon) ? " and weapon" : "");
            m_lose_armor(mon, otmp, polyspot);
        }
        if ((otmp = which_armor(mon, C.W_ARMS)) != 0) {
            // C.Soundeffect(se_clank, 50);
            if (vis)
                C.pline_mon(mon, "%s can no longer hold %s shield!",
                          C.Monnam(mon), ppronoun);
            else
                C.You_hear("a clank.");
            m_lose_armor(mon, otmp, polyspot);
        }
    }
    if (handless_or_tiny || C.has_horns(mdat)) {
        if ((otmp = which_armor(mon, C.W_ARMH)) != 0
            /* flimsy test for horns matches polyself handling */
            && (handless_or_tiny || !C.is_flimsy(otmp))) {
            if (vis)
                C.pline_mon(mon, "%s helmet falls to the %s!",
                          C.s_suffix(C.Monnam(mon)), C.surface(mon.mx, mon.my));
            else
                C.You_hear("a clank.");
            m_lose_armor(mon, otmp, polyspot);
        }
    }
    if (handless_or_tiny || C.slithy(mdat) || mdat.mlet == C.S_CENTAUR) {
        if ((otmp = which_armor(mon, C.W_ARMF)) != 0) {
            if (vis) {
                if (C.is_whirly(mon.data))
                    C.pline_mon(mon, "%s boots fall away!",
                              C.s_suffix(C.Monnam(mon)));
                else
                    C.pline_mon(mon, "%s boots %s off %s feet!",
                              C.s_suffix(C.Monnam(mon)),
                          C.verysmall(mdat) ? "slide" : "are pushed", ppronoun);
            }
            m_lose_armor(mon, otmp, polyspot);
        }
    }
    if (!C.can_saddle(mon)) {
        if ((otmp = which_armor(mon, C.W_SADDLE)) != 0) {
            m_lose_armor(mon, otmp, polyspot);
            if (vis)
                C.pline_mon(mon, "%s saddle falls off.", C.s_suffix(C.Monnam(mon)));
        }
        if (C.samePtr(mon, C.u.usteed))
            noride = 1;
    }
    if (noride || (C.samePtr(mon, C.u.usteed) && !C.can_ride(mon))) {
        C.You("can no longer ride %s.", C.mon_nam(mon));
        if (C.touch_petrifies(C.u.usteed.data) && !C.Stone_resistance && C.rnl(3, 1324, 'mon_break_armor')) {
            const buf = C.stackAlloc(C.BUFSZ);

            C.You("touch %s.", C.mon_nam(C.u.usteed));
            C.Sprintf(buf, "falling off %s",
                    C.an(C.pmname(C.u.usteed.data, C.Mgender(C.u.usteed))));
            C.instapetrify(buf);
        }
        C.dismount_steed(C.DISMOUNT_FELL);
    }
    return;
}

/* bias a monster's preferences towards armor that has special benefits. */
export function extra_pref(mon, obj)
{
    /* currently only does speed boots, but might be expanded if monsters
     * get to use more armor abilities
     */
    if (obj) {
        if (obj.otyp == C.SPEED_BOOTS && mon.permspeed != C.MFAST)
            return 20;
    }
    return 0;
}

/*
 * Exceptions to things based on race.
 * Correctly checks polymorphed player race.
 * Returns:
 *       0 No exception, normal rules apply.
 *       1 If the race/object combination is acceptable.
 *      -1 If the race/object combination is unacceptable.
 */
export function racial_exception(mon, obj)
{
    let ptr = C.raceptr(mon);

    /* Acceptable Exceptions: */
    /* Allow hobbits to wear elven armor - LoTR */
    if (C.samePtr(ptr, C.mons[C.PM_HOBBIT]) && C.is_elven_armor(obj))
        return 1;
    /* Unacceptable Exceptions: */
    /* Checks for object that certain races should never use go here */
    /*  return -1; */

    return 0;
}

/* Remove an object from a monster's inventory. */
export function extract_from_minvent(mon, obj, do_extrinsics, silently)
/* whether to call update_mon_extrinsics */ /* doesn't affect all possible messages,
                             * just update_mon_extrinsics's */
{
    do_extrinsics = C.boolean(do_extrinsics); silently = C.boolean(silently);
    let unwornmask = obj.owornmask;

    /*
     * At its core this is just obj_extract_self(), but it also handles
     * any updates that need to happen if the gear is equipped or in
     * some other sort of state that needs handling.
     * Note that like obj_extract_self(), this leaves obj free.
     */

    if (obj.where != C.OBJ_MINVENT) {
        C.impossible("extract_from_minvent called on object not in minvent");
        return;
    }
    /* handle gold dragon scales/scale-mail (lit when worn) before clearing
       obj->owornmask because artifact_light() expects that to be W_ARM */
    if ((unwornmask & C.W_ARM) != 0 && obj.lamplit && C.artifact_light(obj))
        C.end_burn(obj, 0);

    C.obj_extract_self(obj);
    obj.owornmask = 0n;
    if (unwornmask) {
        if (!C.DEADMONSTER(mon) && do_extrinsics) {
            update_mon_extrinsics(mon, obj, 0, silently);
        }
        mon.misc_worn_check &= ~unwornmask;
        /* give monster a chance to wear other equipment on its next
           move instead of waiting until it picks something up */
        C.check_gear_next_turn(mon);
    }
    C.obj_no_longer_held(obj);
    if (unwornmask & C.W_WEP) {
        C.mwepgone(mon); /* unwields and sets weapon_check to NEED_WEAPON */
    }
}


/*worn.c*/
