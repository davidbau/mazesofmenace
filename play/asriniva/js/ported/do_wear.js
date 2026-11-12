import {C} from '../c-runtime/context.js';
/* NetHack 5.0	do_wear.c	$NHDT-Date: 1737343372 2025/01/19 19:22:52 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.201 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Robert Patrick Rankin, 2012. */
/* NetHack may be freely redistributed.  See license for details. */


const see_yourself = "see yourself";
const unknown_type = "Unknown type of %s (%d)";
const c_armor = "armor", c_suit = "suit",
                           c_shirt = "shirt", c_cloak = "cloak",
                           c_gloves = "gloves", c_boots = "boots",
                           c_helmet = "helmet", c_shield = "shield",
                           c_weapon = "weapon", c_sword = "sword",
                           c_axe = "axe", c_that_ = "that";

export const takeoff_order = [
    "WORN_BLINDF", "W_WEP",      "WORN_SHIELD", "WORN_GLOVES", "LEFT_RING",
    "RIGHT_RING",  "WORN_CLOAK", "WORN_HELMET", "WORN_AMUL",   "WORN_ARMOR",
    "WORN_SHIRT",  "WORN_BOOTS", "W_SWAPWEP",   "W_QUIVER",    0
];




/* int Boots_on(void); -- moved to extern.h */

























/* maybe_destroy_armor() may return NULL */




/* plural "fingers" or optionally "gloves" */

export function fingers_or_gloves(check_gloves)
{
    return ((check_gloves && C.uarmg)
            ? C.gloves_simple_name(C.uarmg) /* "gloves" or "gauntlets" */
            : C.makeplural(C.body_part(C.FINGER))); /* "fingers" */
}


export function off_msg(otmp)
{
    if (C.flags.verbose)
        C.You("were wearing %s.", C.doname(otmp), C.varargs(0));
}

/* for items that involve no delay */

export function on_msg(otmp)
{
    /* on_msg() for rings and amulets just shows add-to-invent feedback
       [after caller calls setworn(), for suffix: "(on {left|right} hand)"
       or "(being worn)"]; eyewear too unless giving verbose message below */
    if ((otmp.owornmask & (C.W_RING | C.W_AMUL)) != 0n
        || ((otmp.owornmask & C.W_TOOL) != 0n && !C.flags.verbose)) {
        C.prinv(0, otmp, 0n);
        return;
    }

    if (C.flags.verbose) {
        const how = C.charArray(C.BUFSZ);
        /* call xname() before obj_is_pname(); formatting obj's name
           might set obj->dknown and that affects the pname test */
        let otmp_name = C.xname(otmp);

        how[0] = 0;
        if (otmp.otyp == C.TOWEL)
            C.Sprintf(how, " around your %s", C.body_part(C.HEAD), C.varargs(1));
        C.You("are now wearing %s%s.",
            C.obj_is_pname(otmp) ? C.the(otmp_name) : C.an(otmp_name), how, C.varargs(2));
    }
}

/* putting on or taking off an item which confers stealth;
   give feedback and discover it iff stealth state is changing;
   stealth is blocked by riding unless hero+steed fly (handled with
   BStealth by mount and dismount routines) */
/* prop[].extrinsic, with obj->owornmask pre-stripped */
export function toggle_stealth(obj, oldprop, on)
{
    if (on ? C.gi.initial_don : C.svc.context.takeoff.cancelled_don)
        return;

    if (!oldprop /* extrinsic stealth from something else */
        && !C.HStealth /* intrinsic stealth */
        && !C.BStealth) { /* stealth blocked by something */
        if (obj.otyp == C.RIN_STEALTH)
            C.callLocal(learnring, obj, 1);
        else /* discover elven cloak or elven boots */
            C.makeknown(obj.otyp);

        if (on) {
            if (!C.is_boots(obj))
                C.You("move very quietly.", C.varargs(3));
            else if (C.Levitation || C.Flying)
                C.You("float imperceptibly.", C.varargs(4));
            else
                C.You("walk very quietly.", C.varargs(5));
        } else {
            let riding = (C.u.usteed != 0);

            C.You("%s%s are noisy.", riding ? "and " : "sure",
                riding ? C.x_monnam(C.u.usteed, C.ARTICLE_YOUR, 0,
                                  (C.SUPPRESS_SADDLE | C.SUPPRESS_HALLUCINATION),
                                  0)
                       : "", C.varargs(6));
        }
    }
}

/* putting on or taking off an item which confers displacement, or gaining
   or losing timed displacement after eating a displacer beast corpse or tin;
   give feedback and discover it iff displacement state is changing *and*
   hero is able to see self (or sense monsters); for timed, 'obj' is Null
   and this is only called for the message */
/* prop[].extrinsic, with obj->owornmask
                     stripped by caller */
export function toggle_displacement(obj, oldprop, on)
{
    if (on ? C.gi.initial_don : C.svc.context.takeoff.cancelled_don)
        return;

    if (!oldprop /* extrinsic displacement from something else */
        && !(C.u.uprops[C.DISPLACED].intrinsic) /* timed, from eating */
        && !(C.u.uprops[C.DISPLACED].blocked) /* (theoretical) */
        /* we don't use canseeself() here because it augments vision
           with touch, which isn't appropriate for deciding whether
           we'll notice that monsters have trouble spotting the hero */
        && ((!C.Blind         /* see anything */
             && !C.u.uswallow /* see surroundings */
             && !C.Invisible) /* see self */
            /* actively sensing nearby monsters via telepathy or extended
               monster detection overrides vision considerations because
               hero also senses self in this situation */
            || (C.Unblind_telepat
                || (C.Blind_telepat && C.Blind)
                || C.Detect_monsters))) {
        if (obj)
            C.makeknown(obj.otyp);

        C.You_feel("that monsters%s have difficulty pinpointing your location.",
                 on ? "" : " no longer", C.varargs(7));
    }
}

/*
 * The Type_on() functions should be called *after* setworn().
 * The Type_off() functions call setworn() themselves.
 * [Blindf_on() is an exception and calls setworn() itself.]
 */


export function Boots_on()
{
    let oldprop =
        C.u.uprops[C.objects[C.uarmf.otyp].oc_oprop].extrinsic & ~C.WORN_BOOTS;

    switch (C.uarmf.otyp) {
    case C.LOW_BOOTS:
    case C.IRON_SHOES:
    case C.HIGH_BOOTS:
    case C.JUMPING_BOOTS:
    case C.KICKING_BOOTS:
        break;
    case C.WATER_WALKING_BOOTS:
        /*
         * Sequencing issue?  If underwater (perhaps via magical breathing),
         * putting on water walking boots produces "you slowly rise above
         * the surface" then "you finish your dressing maneuver".
         */

        /* spoteffects() doesn't get called here; pooleffects() is called
           during movement and u.uinwater is already False after setworn() */
        if (C.u.uinwater)
            C.spoteffects(1);
        /* init'd in accessory_or_armor_on() and only used here */
        if (C.gw.wasinwater) {
            if (!C.u.uinwater)
                C.makeknown(C.WATER_WALKING_BOOTS);
            C.gw.wasinwater = 0;
        }
        /* (we don't need a lava check here since boots can't be
           put on while feet are stuck) */
        break;
    case C.SPEED_BOOTS:
        /* Speed boots are still better than intrinsic speed, */
        /* though not better than potion speed */
        if (!oldprop && !(C.HFast & C.TIMEOUT)) {
            C.makeknown(C.uarmf.otyp);
            C.You_feel("yourself speed up%s.",
                     (oldprop || C.HFast) ? " a bit more" : "", C.varargs(8));
        }
        break;
    case C.ELVEN_BOOTS:
        C.callLocal(toggle_stealth, C.uarmf, oldprop, 1);
        break;
    case C.FUMBLE_BOOTS:
        if (!oldprop && !(C.HFumbling & ~C.TIMEOUT))
            C.incr_itimeout(C.propertyAddress("HFumbling"), C.rnd(20, "Boots_on", 233));
        break;
    case C.LEVITATION_BOOTS:
        if (!oldprop && !C.HLevitation && !(C.BLevitation & C.FROMOUTSIDE)) {
            C.uarmf.known = 1; /* might come off if putting on over a sink,
                               * so uarmf could be Null below; status line
                               * gets updated during brief interval they're
                               * worn so hero and player learn enchantment */
            C.disp.botl = 1; /* status hilites might mark AC changed */
            C.makeknown(C.uarmf.otyp);
            C.float_up();
            if (C.Levitation)
                C.spoteffects(0); /* for sink effect */
        } else {
            C.float_vs_flight(); /* maybe toggle BFlying's I_SPECIAL */
        }
        break;
    default:
        C.impossible(unknown_type, c_boots, C.uarmf.otyp, C.varargs(9));
    }
    /* uarmf could be Null here (levitation boots put on over a sink) */
    if (C.uarmf && !C.uarmf.known) {
        C.uarmf.known = 1; /* boots' +/- evident because of status line AC */
        C.update_inventory();
    }
    return 0;
}


export function Boots_off()
{
    let otmp = C.uarmf;
    let otyp = otmp.otyp;
    let oldprop = C.u.uprops[C.objects[otyp].oc_oprop].extrinsic & ~C.WORN_BOOTS;

    C.svc.context.takeoff.mask &= ~C.W_ARMF;
    /* For levitation, float_down() returns if Levitation, so we
     * must do a setworn() _before_ the levitation case.
     */
    C.setworn(0, C.W_ARMF);
    switch (otyp) {
    case C.SPEED_BOOTS:
        if (!C.Very_fast && !C.svc.context.takeoff.cancelled_don) {
            C.makeknown(otyp);
            C.You_feel("yourself slow down%s.", C.Fast ? " a bit" : "", C.varargs(10));
        }
        break;
    case C.WATER_WALKING_BOOTS:
        /* check for lava since fireproofed boots make it viable */
        if ((C.is_pool(C.u.ux, C.u.uy) || C.is_lava(C.u.ux, C.u.uy))
            && !C.Levitation && !C.Flying
            && !(C.is_clinger(C.gy.youmonst.data) && C.has_ceiling(C.addressOf(C.u, "uz")))
            && !C.svc.context.takeoff.cancelled_don
            /* avoid recursive call to lava_effects() */
            && !C.iflags.in_lava_effects) {
            /* make boots known in case you survive the drowning */
            C.makeknown(otyp);
            C.spoteffects(1);
        }
        break;
    case C.ELVEN_BOOTS:
        C.callLocal(toggle_stealth, otmp, oldprop, 0);
        break;
    case C.FUMBLE_BOOTS:
        if (!oldprop && !(C.HFumbling & ~C.TIMEOUT))
            C.HFumbling = C.EFumbling = 0;
        break;
    case C.LEVITATION_BOOTS:
        if (!oldprop && !C.HLevitation && !(C.BLevitation & C.FROMOUTSIDE)
            && !C.svc.context.takeoff.cancelled_don) {
            /* lava_effects() sets in_lava_effects and calls Boots_off()
               so hero is already in midst of floating down */
            if (!C.iflags.in_lava_effects)
                C.float_down(0n, 0n);
            C.makeknown(otyp);
        } else {
            C.float_vs_flight(); /* maybe toggle (BFlying & I_SPECIAL) */
        }
        break;
    case C.LOW_BOOTS:
    case C.IRON_SHOES:
    case C.HIGH_BOOTS:
    case C.JUMPING_BOOTS:
    case C.KICKING_BOOTS:
        break;
    default:
        C.impossible(unknown_type, c_boots, otyp, C.varargs(11));
    }
    C.svc.context.takeoff.cancelled_don = 0;
    return 0;
}


export function Cloak_on()
{
    let oldprop =
        C.u.uprops[C.objects[C.uarmc.otyp].oc_oprop].extrinsic & ~C.WORN_CLOAK;

    switch (C.uarmc.otyp) {
    case C.ORCISH_CLOAK:
    case C.DWARVISH_CLOAK:
    case C.CLOAK_OF_MAGIC_RESISTANCE:
    case C.ROBE:
    case C.LEATHER_CLOAK:
        break;
    case C.CLOAK_OF_PROTECTION:
        C.makeknown(C.uarmc.otyp);
        break;
    case C.ELVEN_CLOAK:
        C.callLocal(toggle_stealth, C.uarmc, oldprop, 1);
        break;
    case C.CLOAK_OF_DISPLACEMENT:
        C.callLocal(toggle_displacement, C.uarmc, oldprop, 1);
        break;
    case C.MUMMY_WRAPPING:
        /* Note: it's already being worn, so we have to cheat here. */
        if ((C.HInvis || C.EInvis) && !C.Blind) {
            C.newsym(C.u.ux, C.u.uy);
            C.You("can %s!", C.See_invisible ? "no longer see through yourself"
                                         : see_yourself, C.varargs(12));
        }
        break;
    case C.CLOAK_OF_INVISIBILITY:
        /* since cloak of invisibility was worn, we know mummy wrapping
           wasn't, so no need to check `oldprop' against blocked */
        if (!oldprop && !C.HInvis && !C.Blind) {
            C.makeknown(C.uarmc.otyp);
            C.newsym(C.u.ux, C.u.uy);
            C.pline("Suddenly you can%s yourself.",
                  C.See_invisible ? " see through" : "not see", C.varargs(13));
        }
        break;
    case C.OILSKIN_CLOAK:
        C.pline("%s very tightly.", C.Tobjnam(C.uarmc, "fit"), C.varargs(14));
        break;
    /* Alchemy smock gives poison _and_ acid resistance */
    case C.ALCHEMY_SMOCK:
        C.EAcid_resistance |= C.WORN_CLOAK;
        break;
    default:
        C.impossible(unknown_type, c_cloak, C.uarmc.otyp, C.varargs(15));
    }
    if (C.uarmc && !C.uarmc.known) { /* no known instance of !uarmc here */
        C.uarmc.known = 1; /* cloak's +/- evident because of status line AC */
        C.update_inventory();
    }
    return 0;
}


export function Cloak_off()
{
    let otmp = C.uarmc;
    let otyp = otmp.otyp;
    let oldprop = C.u.uprops[C.objects[otyp].oc_oprop].extrinsic & ~C.WORN_CLOAK;

    C.svc.context.takeoff.mask &= ~C.W_ARMC;
    /* For mummy wrapping, taking it off first resets `Invisible'. */
    C.setworn(0, C.W_ARMC);
    switch (otyp) {
    case C.ORCISH_CLOAK:
    case C.DWARVISH_CLOAK:
    case C.CLOAK_OF_PROTECTION:
    case C.CLOAK_OF_MAGIC_RESISTANCE:
    case C.OILSKIN_CLOAK:
    case C.ROBE:
    case C.LEATHER_CLOAK:
        break;
    case C.ELVEN_CLOAK:
        C.callLocal(toggle_stealth, otmp, oldprop, 0);
        break;
    case C.CLOAK_OF_DISPLACEMENT:
        C.callLocal(toggle_displacement, otmp, oldprop, 0);
        break;
    case C.MUMMY_WRAPPING:
        if (C.Invis && !C.Blind) {
            C.newsym(C.u.ux, C.u.uy);
            C.You("can %s.", C.See_invisible ? "see through yourself"
                                         : "no longer see yourself", C.varargs(16));
        }
        break;
    case C.CLOAK_OF_INVISIBILITY:
        if (!oldprop && !C.HInvis && !C.Blind) {
            C.makeknown(C.CLOAK_OF_INVISIBILITY);
            C.newsym(C.u.ux, C.u.uy);
            C.pline("Suddenly you can %s.",
                  C.See_invisible ? "no longer see through yourself"
                                : see_yourself, C.varargs(17));
        }
        break;
    /* Alchemy smock gives poison _and_ acid resistance */
    case C.ALCHEMY_SMOCK:
        C.EAcid_resistance &= ~C.WORN_CLOAK;
        break;
    default:
        C.impossible(unknown_type, c_cloak, otyp, C.varargs(18));
    }
    return 0;
}


export function Helmet_on()
{
    switch (C.uarmh.otyp) {
    case C.FEDORA:
        if (C.Role_if(C.PM_ARCHEOLOGIST))
            C.change_luck(1);
        break;
    case C.HELMET:
    case C.DENTED_POT:
    case C.ELVEN_LEATHER_HELM:
    case C.DWARVISH_IRON_HELM:
    case C.ORCISH_HELM:
    case C.HELM_OF_TELEPATHY:
        break;
    case C.HELM_OF_CAUTION:
        C.see_monsters();
        break;
    case C.HELM_OF_BRILLIANCE:
        C.callLocal(adj_abon, C.uarmh, C.uarmh.spe);
        break;
    case C.CORNUTHAUM:
        /* people think marked wizards know what they're talking about,
           but it takes trained arrogance to pull it off, and the actual
           enchantment of the hat is irrelevant */
        C.u.abon.a[C.A_CHA] += (C.Role_if(C.PM_WIZARD) ? 1 : -1);
        C.disp.botl = 1;
        C.makeknown(C.uarmh.otyp);
        break;
    case C.HELM_OF_OPPOSITE_ALIGNMENT:
        C.uarmh.known = 1; /* do this here because uarmh could get cleared */
        /* changing alignment can toggle off active artifact properties,
           including levitation; uarmh could get dropped or destroyed here
           by hero falling onto a polymorph trap or into water (emergency
           disrobe) or maybe lava (probably not, helm isn't 'organic') */
        C.uchangealign((C.u.ualign.type != C.A_NEUTRAL)
                         ? -C.u.ualign.type
                         : (C.uarmh.o_id % 2) ? C.A_CHAOTIC : C.A_LAWFUL,
                     C.A_CG_HELM_ON);
        /* makeknown(HELM_OF_OPPOSITE_ALIGNMENT); -- below, after Tobjnam() */
        void 0;
    /*FALLTHRU*/
    case C.DUNCE_CAP:
        if (C.uarmh && !C.uarmh.cursed) {
            if (C.Blind)
                C.pline("%s for a moment.", C.Tobjnam(C.uarmh, "vibrate"), C.varargs(19));
            else
                C.pline("%s %s for a moment.", C.Tobjnam(C.uarmh, "glow"),
                      C.hcolor(C.NH_BLACK), C.varargs(20));
            C.curse(C.uarmh);
            /* curse() doesn't touch bknown so doesn't update persistent
               inventory; do so now [set_bknown() calls update_inventory()] */
            if (C.Blind)
                C.set_bknown(C.uarmh, 0); /* lose bknown if previously set */
            else if (C.Role_if(C.PM_CLERIC))
                C.set_bknown(C.uarmh, 1); /* (bknown should already be set) */
            else if (C.uarmh.bknown)
                C.update_inventory(); /* keep bknown as-is; display the curse */
        }
        C.disp.botl = 1; /* reveal new alignment or INT & WIS */
        if (C.Hallucination) {
            C.pline("My brain hurts!", C.varargs(21)); /* Monty Python's Flying Circus */
        } else if (C.uarmh && C.uarmh.otyp == C.DUNCE_CAP) {
            C.You_feel("%s.", /* track INT change; ignore WIS */
                     C.ACURR(C.A_INT)
                             <= (C.u.acurr.a[C.A_INT] + C.u.abon.a[C.A_INT] + C.u.atemp.a[C.A_INT])
                         ? "like sitting in a corner"
                         : "giddy", C.varargs(22));
        } else {
            /* [message formerly given here moved to uchangealign()] */
            C.makeknown(C.HELM_OF_OPPOSITE_ALIGNMENT);
        }
        break;
    default:
        C.impossible(unknown_type, c_helmet, C.uarmh.otyp, C.varargs(23));
    }
    /* uarmh could be Null due to uchangealign() */
    if (C.uarmh && !C.uarmh.known) {
        C.uarmh.known = 1; /* helmet's +/- evident because of status line AC */
        C.update_inventory();
    }
    return 0;
}


export function Helmet_off()
{
    C.svc.context.takeoff.mask &= ~C.W_ARMH;

    switch (C.uarmh.otyp) {
    case C.FEDORA:
        if (C.Role_if(C.PM_ARCHEOLOGIST))
            C.change_luck(-1);
        break;
    case C.HELMET:
    case C.DENTED_POT:
    case C.ELVEN_LEATHER_HELM:
    case C.DWARVISH_IRON_HELM:
    case C.ORCISH_HELM:
        break;
    case C.DUNCE_CAP:
        C.disp.botl = 1;
        break;
    case C.CORNUTHAUM:
        if (!C.svc.context.takeoff.cancelled_don) {
            C.u.abon.a[C.A_CHA] += (C.Role_if(C.PM_WIZARD) ? -1 : 1);
            C.disp.botl = 1;
        }
        break;
    case C.HELM_OF_TELEPATHY:
    case C.HELM_OF_CAUTION:
        /* need to update ability before calling see_monsters() */
        C.setworn(0, C.W_ARMH);
        C.see_monsters();
        return 0;
    case C.HELM_OF_BRILLIANCE:
        if (!C.svc.context.takeoff.cancelled_don)
            C.callLocal(adj_abon, C.uarmh, -C.uarmh.spe);
        break;
    case C.HELM_OF_OPPOSITE_ALIGNMENT:
        /* changing alignment can toggle off active artifact
           properties, including levitation; uarmh could get
           dropped or destroyed here */
        C.uchangealign(C.u.ualignbase[C.A_CURRENT], C.A_CG_HELM_OFF);
        break;
    default:
        C.impossible(unknown_type, c_helmet, C.uarmh.otyp, C.varargs(24));
    }
    C.setworn(0, C.W_ARMH);
    C.svc.context.takeoff.cancelled_don = 0;
    return 0;
}

/* hard helms provide better protection against falling rocks */

export function hard_helmet(obj)
{
    if (!obj || !C.is_helmet(obj))
        return 0;
    return (C.is_metallic(obj) || C.is_crackable(obj)) ? 1 : 0;
}


export function Gloves_on()
{
    let oldprop =
        C.u.uprops[C.objects[C.uarmg.otyp].oc_oprop].extrinsic & ~C.WORN_GLOVES;

    switch (C.uarmg.otyp) {
    case C.LEATHER_GLOVES:
        break;
    case C.GAUNTLETS_OF_FUMBLING:
        if (!oldprop && !(C.HFumbling & ~C.TIMEOUT))
            C.incr_itimeout(C.propertyAddress("HFumbling"), C.rnd(20, "Gloves_on", 586));
        break;
    case C.GAUNTLETS_OF_POWER:
        C.makeknown(C.uarmg.otyp);
        C.disp.botl = 1; /* taken care of in attrib.c */
        break;
    case C.GAUNTLETS_OF_DEXTERITY:
        C.callLocal(adj_abon, C.uarmg, C.uarmg.spe);
        break;
    default:
        C.impossible(unknown_type, c_gloves, C.uarmg.otyp, C.varargs(25));
    }
    if (!C.uarmg.known) {
        C.uarmg.known = 1; /* gloves' +/- evident because of status line AC */
        C.update_inventory();
    }
    return 0;
}

/* check for wielding cockatrice corpse after taking off gloves or yellow
   dragon scales/mail or having temporary stoning resistance time out */
/* uwep, potentially a wielded cockatrice corpse *//* gloves or dragon armor or Null (resist timeout) *//* True: taking protective armor off on purpose */
export function wielding_corpse(obj, how, voluntary)
{
    if (!obj || obj.otyp != C.CORPSE || C.uarmg)
        return;
    /* note: can't dual-wield with non-weapons/weapon-tools so u.twoweap
       will always be false if uswapwep happens to be a corpse */
    if (obj != C.uwep && (obj != C.uswapwep || !C.u.twoweap))
        return;

    if (C.touch_petrifies(C.mons[obj.corpsenm]) && !C.Stone_resistance) {
        const kbuf = C.charArray(C.BUFSZ);
        const hbuf = C.charArray(C.BUFSZ);

        C.You("%s %s in your bare %s.",
            (how && C.is_gloves(how)) ? "now wield" : "are wielding",
            C.corpse_xname(obj,  0, C.CXN_ARTICLE),
            C.makeplural(C.body_part(C.HAND)), C.varargs(26));
        /* "removing" ought to be "taking off" but that makes the
           tombstone text more likely to be truncated */
        if (how)
            C.Sprintf(hbuf, "%s %s", voluntary ? "removing" : "losing",
                    C.is_gloves(how) ? C.gloves_simple_name(how)
                    : C.strsubst(C.simpleonames(how), "set of ", ""), C.varargs(27));
        else
            C.Strcpy(hbuf, "resistance timing out");
        C.Snprintf(kbuf, C.sizeof(kbuf), "%s while wielding %s",
                 hbuf, C.killer_xname(obj), C.varargs(28));
        C.instapetrify(kbuf);
        /* life-saved or got poly'd into a stone golem; can't continue
           wielding cockatrice corpse unless have now become resistant */
        if (!C.Stone_resistance)
            C.remove_worn_item(obj, 0);
    }
}


export function Gloves_off()
{
    let gloves = C.uarmg; /* needed after uarmg has been set to Null */
    let oldprop =
        C.u.uprops[C.objects[C.uarmg.otyp].oc_oprop].extrinsic & ~C.WORN_GLOVES;
    let on_purpose = !C.svc.context.mon_moving && !C.uarmg.in_use;

    C.svc.context.takeoff.mask &= ~C.W_ARMG;

    switch (C.uarmg.otyp) {
    case C.LEATHER_GLOVES:
        break;
    case C.GAUNTLETS_OF_FUMBLING:
        if (!oldprop && !(C.HFumbling & ~C.TIMEOUT))
            C.HFumbling = C.EFumbling = 0;
        break;
    case C.GAUNTLETS_OF_POWER:
        C.makeknown(C.uarmg.otyp);
        C.disp.botl = 1; /* taken care of in attrib.c */
        break;
    case C.GAUNTLETS_OF_DEXTERITY:
        if (!C.svc.context.takeoff.cancelled_don)
            C.callLocal(adj_abon, C.uarmg, -C.uarmg.spe);
        break;
    default:
        C.impossible(unknown_type, c_gloves, C.uarmg.otyp, C.varargs(29));
    }
    C.setworn(0, C.W_ARMG);
    C.svc.context.takeoff.cancelled_don = 0;
    C.encumber_msg(); /* immediate feedback for GoP */

    /* usually can't remove gloves when they're slippery but it can
       be done by having them fall off (polymorph), stolen, or
       destroyed (scroll, overenchantment, monster spell); if that
       happens, 'cure' slippery fingers so that it doesn't transfer
       from gloves to bare hands */
    if (C.Glib)
        C.make_glib(0); /* for update_inventory() */

    /* prevent wielding cockatrice when not wearing gloves */
    if (C.uwep && C.uwep.otyp == C.CORPSE)
        C.callLocal(wielding_corpse, C.uwep, gloves, on_purpose);
    /* KMH -- ...or your secondary weapon when you're wielding it
       [This case can't actually happen; twoweapon mode won't engage
       if a corpse has been set up as either the primary or alternate
       weapon.  If it could happen and /both/ uwep and uswapwep could
       be cockatrice corpses, life-saving for the first would need to
       prevent the second from being fatal since conceptually they'd
       be being touched simultaneously.] */
    if (C.u.twoweap && C.uswapwep && C.uswapwep.otyp == C.CORPSE)
        C.callLocal(wielding_corpse, C.uswapwep, gloves, on_purpose);

    if (C.condtests[C.bl_bareh].enabled)
        C.disp.botl = 1;

    return 0;
}


export function Shield_on()
{
    /* no shield currently requires special handling when put on, but we
       keep this uncommented in case somebody adds a new one which does
       [the magical shields are handled by setting u.uprops[*].extrinsic
       in setworn() called by armor_or_accessory_on() before Shield_on()] */
    switch (C.uarms.otyp) {
    case C.SMALL_SHIELD:
    case C.SHIELD_OF_DRAIN_RESISTANCE:
    case C.SHIELD_OF_SHOCK_RESISTANCE:
    case C.ELVEN_SHIELD:
    case C.URUK_HAI_SHIELD:
    case C.ORCISH_SHIELD:
    case C.DWARVISH_ROUNDSHIELD:
    case C.LARGE_SHIELD:
    case C.SHIELD_OF_REFLECTION:
        break;
    default:
        C.impossible(unknown_type, c_shield, C.uarms.otyp, C.varargs(30));
    }
    if (!C.uarms.known) {
        C.uarms.known = 1; /* shield's +/- evident because of status line AC */
        C.update_inventory();
    }
    return 0;
}


export function Shield_off()
{
    C.svc.context.takeoff.mask &= ~C.W_ARMS;

    /* no shield currently requires special handling when taken off, but we
       keep this uncommented in case somebody adds a new one which does */
    switch (C.uarms.otyp) {
    case C.SMALL_SHIELD:
    case C.SHIELD_OF_DRAIN_RESISTANCE:
    case C.SHIELD_OF_SHOCK_RESISTANCE:
    case C.ELVEN_SHIELD:
    case C.URUK_HAI_SHIELD:
    case C.ORCISH_SHIELD:
    case C.DWARVISH_ROUNDSHIELD:
    case C.LARGE_SHIELD:
    case C.SHIELD_OF_REFLECTION:
        break;
    default:
        C.impossible(unknown_type, c_shield, C.uarms.otyp, C.varargs(31));
    }

    C.setworn(0, C.W_ARMS);
    return 0;
}


export function Shirt_on()
{
    /* no shirt currently requires special handling when put on, but we
       keep this uncommented in case somebody adds a new one which does */
    switch (C.uarmu.otyp) {
    case C.HAWAIIAN_SHIRT:
    case C.T_SHIRT:
        break;
    default:
        C.impossible(unknown_type, c_shirt, C.uarmu.otyp, C.varargs(32));
    }
    if (!C.uarmu.known) {
        C.uarmu.known = 1; /* shirt's +/- evident because of status line AC */
        C.update_inventory();
    }
    return 0;
}


export function Shirt_off()
{
    C.svc.context.takeoff.mask &= ~C.W_ARMU;

    /* no shirt currently requires special handling when taken off, but we
       keep this uncommented in case somebody adds a new one which does */
    switch (C.uarmu.otyp) {
    case C.HAWAIIAN_SHIRT:
    case C.T_SHIRT:
        break;
    default:
        C.impossible(unknown_type, c_shirt, C.uarmu.otyp, C.varargs(33));
    }

    C.setworn(0, C.W_ARMU);
    return 0;
}

/* handle extra abilities for hero wearing dragon scale armor */
/* armor being put on or taken off *//* True: on, False: off *//* voluntary removal; not applicable for putting on */
export function dragon_armor_handling(otmp, puton, on_purpose)
{
    if (!otmp)
        return;

    switch (otmp.otyp) {
        /* grey: no extra effect */
        /* silver: no extra effect */
    case C.BLACK_DRAGON_SCALES:
    case C.BLACK_DRAGON_SCALE_MAIL:
        if (puton) {
            C.EDrain_resistance |= C.W_ARM;
        } else {
            C.EDrain_resistance &= ~C.W_ARM;
        }
        break;
    case C.BLUE_DRAGON_SCALES:
    case C.BLUE_DRAGON_SCALE_MAIL:
        if (puton) {
            if (!C.Very_fast)
                C.You("speed up%s.", C.Fast ? " a bit more" : "", C.varargs(34));
            C.EFast |= C.W_ARM;
        } else {
            C.EFast &= ~C.W_ARM;
            if (!C.Very_fast && !C.svc.context.takeoff.cancelled_don)
                C.You("slow down.", C.varargs(35));
        }
        break;
    case C.GREEN_DRAGON_SCALES:
    case C.GREEN_DRAGON_SCALE_MAIL:
        if (puton) {
            C.ESick_resistance |= C.W_ARM;
        } else {
            C.ESick_resistance &= ~C.W_ARM;
        }
        break;
    case C.RED_DRAGON_SCALES:
    case C.RED_DRAGON_SCALE_MAIL:
        if (puton) {
            C.EInfravision |= C.W_ARM;
        } else {
            C.EInfravision &= ~C.W_ARM;
        }
        C.see_monsters();
        break;
    case C.GOLD_DRAGON_SCALES:
    case C.GOLD_DRAGON_SCALE_MAIL:
        C.make_hallucinated(C.long(!puton),
                                 C.program_state.restoring ? 0 : 1,
                                 C.W_ARM);
        break;
    case C.ORANGE_DRAGON_SCALES:
    case C.ORANGE_DRAGON_SCALE_MAIL:
        if (puton) {
            C.Free_action |= C.W_ARM;
        } else {
            C.Free_action &= ~C.W_ARM;
        }
        break;
    case C.YELLOW_DRAGON_SCALES:
    case C.YELLOW_DRAGON_SCALE_MAIL:
        if (puton) {
            C.EStone_resistance |= C.W_ARM;
        } else {
            C.EStone_resistance &= ~C.W_ARM;

            /* prevent wielding cockatrice after losing stoning resistance
               when not wearing gloves; the uswapwep case is always a no-op */
            C.callLocal(wielding_corpse, C.uwep, otmp, on_purpose);
            C.callLocal(wielding_corpse, C.uswapwep, otmp, on_purpose);
        }
        break;
    case C.WHITE_DRAGON_SCALES:
    case C.WHITE_DRAGON_SCALE_MAIL:
        if (puton) {
            C.ESlow_digestion |= C.W_ARM;
        } else {
            C.ESlow_digestion &= ~C.W_ARM;
        }
        break;
    default:
        break;
    }
}


export function Armor_on()
{
    if (!C.uarm) /* no known instances of !uarm here but play it safe */
        return 0;
    if (!C.uarm.known) {
        C.uarm.known = 1; /* suit's +/- evident because of status line AC */
        C.update_inventory();
    }
    C.callLocal(dragon_armor_handling, C.uarm, 1, 1);
    /* gold DSM requires extra handling since it emits light when worn;
       do that after the special armor handling */
    if (C.artifact_light(C.uarm) && !C.uarm.lamplit) {
        C.begin_burn(C.uarm, 0);
        if (!C.Blind)
            C.pline("%s %s to shine %s!",
                  C.Yname2(C.uarm), C.otense(C.uarm, "begin"),
                  C.arti_light_description(C.uarm), C.varargs(36));
    }
    return 0;
}


export function Armor_off()
{
    let otmp = C.uarm;
    let was_arti_light = otmp && otmp.lamplit && C.artifact_light(otmp);

    C.svc.context.takeoff.mask &= ~C.W_ARM;
    C.setworn(0, C.W_ARM);
    C.svc.context.takeoff.cancelled_don = 0;

    /* taking off yellow dragon scales/mail might be fatal; arti_light
       comes from gold dragon scales/mail so they don't overlap, but
       conceptually the non-fatal change should be done before the
       potentially fatal change in case the latter results in bones */
    if (was_arti_light && !C.artifact_light(otmp)) {
        C.end_burn(otmp, 0);
        if (!C.Blind)
            C.pline("%s shining.", C.Tobjnam(otmp, "stop"), C.varargs(37));
    }
    C.callLocal(dragon_armor_handling, otmp, 0, 1);

    return 0;
}

/* The gone functions differ from the off functions in that if you die from
 * taking it off and have life saving, you still die.  [Obsolete reference
 * to lack of fire resistance being fatal in hell (nethack 3.0) and life
 * saving putting a removed item back on to prevent that from immediately
 * repeating.]
 */

export function Armor_gone()
{
    let otmp = C.uarm;
    let was_arti_light = otmp && otmp.lamplit && C.artifact_light(otmp);

    C.svc.context.takeoff.mask &= ~C.W_ARM;
    C.setnotworn(C.uarm);
    C.svc.context.takeoff.cancelled_don = 0;

    /* losing yellow dragon scales/mail might be fatal; arti_light
       comes from gold dragon scales/mail so they don't overlap, but
       conceptually the non-fatal change should be done before the
       potentially fatal change in case the latter results in bones */
    if (was_arti_light && !C.artifact_light(otmp)) {
        C.end_burn(otmp, 0);
        if (!C.Blind)
            C.pline("%s shining.", C.Tobjnam(otmp, "stop"), C.varargs(38));
    }
    C.callLocal(dragon_armor_handling, otmp, 0, 0);

    return 0;
}


export function Amulet_on(amul)
{
    let on_msg_done = 0;

    /* make sure amulet isn't wielded/alt-wielded/quivered, before wearing */
    C.remove_worn_item(amul, 0);
    C.setworn(amul, C.W_AMUL);

    switch (C.uamul.otyp) {
    case C.AMULET_OF_ESP:
    case C.AMULET_OF_LIFE_SAVING:
    case C.AMULET_VERSUS_POISON:
    case C.AMULET_OF_REFLECTION:
    case C.FAKE_AMULET_OF_YENDOR:
        break;
    case C.AMULET_OF_MAGICAL_BREATHING: {
        let was_in_poison_gas;

        /* amulet is already on; we need to check hero's gas-cloud status
           when it was off */
        C.EMagical_breathing &= ~C.W_AMUL;
        was_in_poison_gas = C.region_danger();
        C.EMagical_breathing |= C.W_AMUL;
        if (was_in_poison_gas) {
            C.makeknown(C.AMULET_OF_MAGICAL_BREATHING);
            C.callLocal(on_msg, C.uamul);
            on_msg_done = 1;
            C.You("are no longer bothered by the poison gas.", C.varargs(39));
        }
        /* no need to check for becoming able to breathe underwater;
           if we are underwater, we already can or we would have drowned */
        break;
    }
    case C.AMULET_OF_UNCHANGING:
        if (C.Slimed)
            C.make_slimed(0n, 0);
        break;
    case C.AMULET_OF_CHANGE: {
        let call_it = 0;
        let new_sex, orig_sex = C.poly_gender();

        /* in normal play it's not possible to put on an amulet of change
           while already wearing an amulet of unchanging, but in wizard
           mode the Unchanging attribute can be set via #wizintrinsic */
        if (!C.Unchanging)
            C.change_sex();

        new_sex = C.poly_gender();
        if (new_sex != orig_sex)
            C.makeknown(C.AMULET_OF_CHANGE);
        C.callLocal(on_msg, C.uamul); /* show 'z - amulet of change (being worn)' */
        on_msg_done = 1;

        /* Don't use same message as polymorph */
        if (new_sex != orig_sex) {
            C.newsym(C.u.ux, C.u.uy); /* glyphmon flag and tile have changed */
            C.disp.botl = 1; /* role name or rank title might have changed */
            C.You("are suddenly very %s!",
                C.flags.female ? "feminine" : "masculine", C.varargs(40));
        } else {
            /* already polymorphed into single-gender monster; only
               changed the character's base sex */
            C.You("don't feel like yourself.", C.varargs(41));
            /* checking dknown is redundant--amulets always have dknown set */
            call_it = (C.uamul.dknown != 0);
        }
        C.livelog_newform(0, orig_sex, new_sex);
        C.pline_The("amulet disintegrates!", C.varargs(42));
        if (call_it)
            C.trycall(C.uamul);
        C.useup(C.uamul);
        break;
    }
    case C.AMULET_OF_STRANGULATION:
        /* note: might already be Strangled (via #wizintrinsic) */
        if (C.can_be_strangled(C.addressOf(C.gy, "youmonst")) && !C.Strangled) {
            C.makeknown(C.AMULET_OF_STRANGULATION);
            C.Strangled = 6n;
            C.disp.botl = 1;
            C.callLocal(on_msg, C.uamul);
            on_msg_done = 1;
            C.pline("It constricts your throat!", C.varargs(43));
        }
        break;
    case C.AMULET_OF_RESTFUL_SLEEP: {
        let newnap = C.long(C.rnd(98, "Amulet_on", 1048)) + 2n, oldnap = (C.HSleepy & C.TIMEOUT);

        if (newnap < oldnap || oldnap == 0n)
            /* avoid clobbering FROMOUTSIDE bit, which might have
               gotten set by previously eating one of these amulets */
            C.HSleepy = (C.HSleepy & ~C.TIMEOUT) | newnap;
        break;
    }
    case C.AMULET_OF_FLYING:
        /* setworn() has already set extrinsic flying */
        C.float_vs_flight(); /* block flying if levitating */
        if (C.Flying) {
            let already_flying;

            /* to determine whether this flight is new we have to muck
               about in the Flying intrinsic (actually extrinsic) */
            C.EFlying &= ~C.W_AMUL;
            already_flying = !!C.Flying;
            C.EFlying |= C.W_AMUL;

            if (!already_flying) {
                C.makeknown(C.AMULET_OF_FLYING);
                C.callLocal(on_msg, C.uamul);
                on_msg_done = 1;
                C.disp.botl = 1; /* status: 'Fly' On */
                C.You("are now in flight.", C.varargs(44));
            }
        }
        break;
    case C.AMULET_OF_GUARDING:
        C.makeknown(C.AMULET_OF_GUARDING);
        C.callLocal(find_ac);
        break;
    case C.AMULET_OF_YENDOR:
        break;
    }

    if (!on_msg_done)
        C.callLocal(on_msg, C.uamul);
}


export function Amulet_off()
{
    let amul = C.uamul; /* for off_msg() after setworn(NULL,W_AMUL) */
    let mkn = 0, early_off_msg = 0;

    C.svc.context.takeoff.mask &= ~C.W_AMUL;

    switch (C.uamul.otyp) {
    case C.AMULET_OF_ESP:
        /* need to update ability before calling see_monsters() */
        C.setworn(0, C.W_AMUL);
        C.callLocal(off_msg, amul);
        early_off_msg = 1;

        C.see_monsters();
        break;
    case C.AMULET_OF_LIFE_SAVING:
    case C.AMULET_VERSUS_POISON:
    case C.AMULET_OF_REFLECTION:
    case C.AMULET_OF_CHANGE:
    case C.AMULET_OF_UNCHANGING:
    case C.FAKE_AMULET_OF_YENDOR:
        break;
    case C.AMULET_OF_MAGICAL_BREATHING:
        /* amulet is currently still on; take it off before calling drown()
           and region_danger(); call off_msg() before specific messages */
        C.setworn(0, C.W_AMUL);
        C.callLocal(off_msg, amul); /* 'uamul' has been set to Null */
        early_off_msg = 1;

        if (C.Underwater) {
            if (!C.cant_drown(C.gy.youmonst.data) && !C.Swimming) {
                C.You("suddenly inhale an unhealthy amount of %s!",
                    C.hliquid("water"), C.varargs(45));
                mkn = 1; /* in case of life-saving */
                C.drown();
            }
        }
        if (C.region_danger()) {
            /* "breathing": wouldn't get here otherwise */
            C.You("are breathing poison gas!", C.varargs(46));
            mkn = 1;
        }
        break;
    case C.AMULET_OF_STRANGULATION:
        C.setworn(0, C.W_AMUL);
        C.callLocal(off_msg, amul);
        early_off_msg = 1;

        if (C.Strangled) {
            C.Strangled = 0n;
            C.disp.botl = 1;
            if (C.Breathless)
                C.Your("%s is no longer constricted!", C.body_part(C.NECK), C.varargs(47));
            else
                C.You("can breathe more easily!", C.varargs(48));
            mkn = 1;
        }
        break;
    case C.AMULET_OF_RESTFUL_SLEEP:
        C.setworn(0, C.W_AMUL);
        /* HSleepy = 0L; -- avoid clobbering FROMOUTSIDE bit */
        if (!C.ESleepy && !(C.HSleepy & ~C.TIMEOUT))
            C.HSleepy &= ~C.TIMEOUT; /* clear timeout bits */
        break;
    case C.AMULET_OF_FLYING: {
        let was_flying = !!C.Flying;

        /* remove amulet 'early' to determine whether Flying changes;
           also in case spoteffects() does something with the amulet */
        C.setworn(0, C.W_AMUL);
        C.callLocal(off_msg, amul);
        early_off_msg = 1;

        C.float_vs_flight(); /* probably not needed here */
        if (was_flying && !C.Flying) {
            C.disp.botl = 1; /* status: 'Fly' Off */
            C.You("%s.", (C.is_pool_or_lava(C.u.ux, C.u.uy)
                        || C.Is_waterlevel(C.addressOf(C.u, "uz")) || C.Is_airlevel(C.addressOf(C.u, "uz")))
                          ? "stop flying"
                          : "land", C.varargs(49));
            mkn = 1; /* makeknown(AMULET_OF_FLYING) */
            C.spoteffects(1);
        }
        break;
    }
    case C.AMULET_OF_GUARDING:
        C.callLocal(find_ac);
        break;
    case C.AMULET_OF_YENDOR:
        break;
    }

    C.setworn(0, C.W_AMUL);
    if (!early_off_msg)
        C.callLocal(off_msg, amul); /* (not 'uamul'; it's Null now) */
    if (mkn)
        C.makeknown(amul.otyp);
    return;
}

/* handle ring discovery; comparable to learnwand() */

export function learnring(ring, observed)
{
    let ringtype = ring.otyp;

    /* if effect was observable then we usually discover the type */
    if (observed) {
        /* if we already know the ring type which accomplishes this
           effect (assumes there is at most one type for each effect),
           mark this ring as having been seen (no need for makeknown);
           otherwise if we have seen this ring, discover its type */
        if (C.objects[ringtype].oc_name_known)
            C.observe_object(ring);
        else if (ring.dknown)
            C.makeknown(ringtype);
/* see learnwand() */
    }

    /* make enchantment of charged ring known (might be +0) and update
       perm invent window if we've seen this ring and know its type */
    if (ring.dknown && C.objects[ringtype].oc_name_known) {
        if (C.objects[ringtype].oc_charged)
            ring.known = 1;
        C.update_inventory();
    }
}


export function adjust_attrib(obj, which, val)
{
    let old_attrib;
    let observable;

    old_attrib = C.ACURR(which);
    C.u.abon.a[which] += val;
    observable = (old_attrib != C.ACURR(which));
    /* if didn't change, usually means ring is +0 but might
        be because nonzero couldn't go below min or above max;
        learn +0 enchantment if attribute value is not stuck
        at a limit [and ring has been seen and its type is
        already discovered, both handled by learnring()] */
    if (observable || !C.extremeattr(which))
        C.callLocal(learnring, obj, observable);
    C.disp.botl = 1;
}


export function Ring_on(obj)
{
    let oldprop = C.u.uprops[C.objects[obj.otyp].oc_oprop].extrinsic;
    let observable;

    /* make sure ring isn't wielded; can't use remove_worn_item()
       here because it has already been set worn in a ring slot */
    if (obj == C.uwep)
        C.setuwep(0);
    else if (obj == C.uswapwep)
        C.setuswapwep(0);
    else if (obj == C.uquiver)
        C.setuqwep(0);

    /* only mask out W_RING when we don't have both
       left and right rings of the same type */
    if ((oldprop & C.W_RING) != C.W_RING)
        oldprop &= ~C.W_RING;

    switch (obj.otyp) {
    case C.RIN_TELEPORTATION:
    case C.RIN_REGENERATION:
    case C.RIN_SEARCHING:
    case C.RIN_HUNGER:
    case C.RIN_AGGRAVATE_MONSTER:
    case C.RIN_POISON_RESISTANCE:
    case C.RIN_FIRE_RESISTANCE:
    case C.RIN_COLD_RESISTANCE:
    case C.RIN_SHOCK_RESISTANCE:
    case C.RIN_CONFLICT:
    case C.RIN_TELEPORT_CONTROL:
    case C.RIN_POLYMORPH:
    case C.RIN_POLYMORPH_CONTROL:
    case C.RIN_FREE_ACTION:
    case C.RIN_SLOW_DIGESTION:
    case C.RIN_SUSTAIN_ABILITY:
        break;
    case C.MEAT_RING:
        /* wearing a meat ring does not affect vegan conduct */
        break;
    case C.RIN_STEALTH:
        C.callLocal(toggle_stealth, obj, oldprop, 1);
        break;
    case C.RIN_WARNING:
        C.see_monsters();
        break;
    case C.RIN_SEE_INVISIBLE:
        /* can now see invisible monsters */
        C.set_mimic_blocking(); /* do special mimic handling */
        C.see_monsters();

        if (C.Invis && !oldprop && !C.HSee_invisible && !C.Blind) {
            C.newsym(C.u.ux, C.u.uy);
            C.pline("Suddenly you are transparent, but there!", C.varargs(50));
            C.callLocal(learnring, obj, 1);
        }
        break;
    case C.RIN_INVISIBILITY:
        if (!oldprop && !C.HInvis && !C.BInvis && !C.Blind) {
            C.callLocal(learnring, obj, 1);
            C.newsym(C.u.ux, C.u.uy);
            C.self_invis_message();
        }
        break;
    case C.RIN_LEVITATION:
        if (!oldprop && !C.HLevitation && !(C.BLevitation & C.FROMOUTSIDE)) {
            C.float_up();
            C.callLocal(learnring, obj, 1);
            if (C.Levitation)
                C.spoteffects(0); /* for sinks */
        } else {
            C.float_vs_flight(); /* maybe toggle (BFlying & I_SPECIAL) */
        }
        break;
    case C.RIN_GAIN_STRENGTH:
        C.callLocal(adjust_attrib, obj, C.A_STR, obj.spe);
        break;
    case C.RIN_GAIN_CONSTITUTION:
        C.callLocal(adjust_attrib, obj, C.A_CON, obj.spe);
        break;
    case C.RIN_ADORNMENT:
        C.callLocal(adjust_attrib, obj, C.A_CHA, obj.spe);
        break;
    case C.RIN_INCREASE_ACCURACY: /* KMH */
        C.u.uhitinc += obj.spe;
        break;
    case C.RIN_INCREASE_DAMAGE:
        C.u.udaminc += obj.spe;
        break;
    case C.RIN_PROTECTION_FROM_SHAPE_CHAN:
        C.rescham();
        break;
    case C.RIN_PROTECTION:
        /* usually learn enchantment and discover type;
           won't happen if ring is unseen or if it's +0
           and the type hasn't been discovered yet */
        observable = (obj.spe != 0);
        C.callLocal(learnring, obj, observable);
        if (obj.spe)
            C.callLocal(find_ac); /* updates botl */
        break;
    }
}


export function Ring_off_or_gone(obj, gone)
{
    let mask = (obj.owornmask & C.W_RING);
    let observable;

    C.svc.context.takeoff.mask &= ~mask;
    if (!(C.u.uprops[C.objects[obj.otyp].oc_oprop].extrinsic & mask))
        C.impossible("Strange... I didn't know you had that ring.", C.varargs(51));
    if (gone)
        C.setnotworn(obj);
    else
        C.setworn(0, obj.owornmask);

    switch (obj.otyp) {
    case C.RIN_TELEPORTATION:
    case C.RIN_REGENERATION:
    case C.RIN_SEARCHING:
    case C.RIN_HUNGER:
    case C.RIN_AGGRAVATE_MONSTER:
    case C.RIN_POISON_RESISTANCE:
    case C.RIN_FIRE_RESISTANCE:
    case C.RIN_COLD_RESISTANCE:
    case C.RIN_SHOCK_RESISTANCE:
    case C.RIN_CONFLICT:
    case C.RIN_TELEPORT_CONTROL:
    case C.RIN_POLYMORPH:
    case C.RIN_POLYMORPH_CONTROL:
    case C.RIN_FREE_ACTION:
    case C.RIN_SLOW_DIGESTION:
    case C.RIN_SUSTAIN_ABILITY:
    case C.MEAT_RING:
        break;
    case C.RIN_STEALTH:
        C.callLocal(toggle_stealth, obj, (C.EStealth & ~mask), 0);
        break;
    case C.RIN_WARNING:
        C.see_monsters();
        break;
    case C.RIN_SEE_INVISIBLE:
        /* Make invisible monsters go away */
        if (!C.See_invisible) {
            C.set_mimic_blocking(); /* do special mimic handling */
            C.see_monsters();
        }

        if (C.Invisible && !C.Blind) {
            C.newsym(C.u.ux, C.u.uy);
            C.pline("Suddenly you cannot see yourself.", C.varargs(52));
            C.callLocal(learnring, obj, 1);
        }
        break;
    case C.RIN_INVISIBILITY:
        if (!C.Invis && !C.BInvis && !C.Blind) {
            C.newsym(C.u.ux, C.u.uy);
            C.Your("body seems to unfade%s.",
                 C.See_invisible ? " completely" : "..", C.varargs(53));
            C.callLocal(learnring, obj, 1);
        }
        break;
    case C.RIN_LEVITATION:
        if (!(C.BLevitation & C.FROMOUTSIDE)) {
            C.float_down(0n, 0n);
            if (!C.Levitation)
                C.callLocal(learnring, obj, 1);
        } else {
            C.float_vs_flight(); /* maybe toggle (BFlying & I_SPECIAL) */
        }
        break;
    case C.RIN_GAIN_STRENGTH:
        C.callLocal(adjust_attrib, obj, C.A_STR, -obj.spe);
        break;
    case C.RIN_GAIN_CONSTITUTION:
        C.callLocal(adjust_attrib, obj, C.A_CON, -obj.spe);
        break;
    case C.RIN_ADORNMENT:
        C.callLocal(adjust_attrib, obj, C.A_CHA, -obj.spe);
        break;
    case C.RIN_INCREASE_ACCURACY: /* KMH */
        C.u.uhitinc -= obj.spe;
        break;
    case C.RIN_INCREASE_DAMAGE:
        C.u.udaminc -= obj.spe;
        break;
    case C.RIN_PROTECTION:
        /* might have been put on while blind and we can now see
           or perhaps been forgotten due to amnesia */
        observable = (obj.spe != 0);
        C.callLocal(learnring, obj, observable);
        if (obj.spe)
            C.callLocal(find_ac); /* updates botl */
        break;
    case C.RIN_PROTECTION_FROM_SHAPE_CHAN:
        /* if you're no longer protected, let the chameleons change
           shape again; however, might still be protected if wearing
           2nd ring of this type (or via #wizintrinsic) */
        if (!C.Protection_from_shape_changers)
            C.restartcham();
        break;
    }
}


export function Ring_off(obj)
{
    C.callLocal(Ring_off_or_gone, obj, 0);
}


export function Ring_gone(obj)
{
    C.callLocal(Ring_off_or_gone, obj, 1);
}


export function Blindf_on(otmp)
{
    let already_blind = C.Blind, changed = 0;

    /* blindfold might be wielded; release it for wearing */
    C.remove_worn_item(otmp, 0);
    C.setworn(otmp, C.W_TOOL);
    C.callLocal(on_msg, otmp);

    if (C.Blind && !already_blind) {
        changed = 1;
        if (C.flags.verbose)
            C.You_cant("see any more.", C.varargs(54));
        /* set ball&chain variables before the hero goes blind */
        if (C.Punished)
            C.set_bc(0);
    } else if (already_blind && !C.Blind) {
        changed = 1;
        /* "You are now wearing the Eyes of the Overworld." */
        if (C.u.uroleplay.blind) {
            /* this can only happen by putting on the Eyes of the Overworld;
               that shouldn't actually produce a permanent cure, but we
               can't let the "blind from birth" conduct remain intact */
            C.pline("For the first time in your life, you can see!", C.varargs(55));
            C.u.uroleplay.blind = 0;
        } else
            C.You("can see!", C.varargs(56));
    }
    if (changed) {
        C.toggle_blindness(); /* potion.c */
    }
}


export function Blindf_off(otmp)
{
    let was_blind = C.Blind, changed = 0,
            nooffmsg = !otmp;

    if (!otmp)
        otmp = C.ublindf;
    if (!otmp) {
        C.impossible("Blindf_off without eyewear?", C.varargs(57));
        return;
    }
    C.svc.context.takeoff.mask &= ~C.W_TOOL;
    C.setworn(0, otmp.owornmask);
    if (!nooffmsg)
        C.callLocal(off_msg, otmp);

    if (C.Blind) {
        if (was_blind) {
            /* "still cannot see" makes no sense when removing lenses
               since they can't have been the cause of your blindness */
            if (otmp.otyp != C.LENSES)
                C.You("still cannot see.", C.varargs(58));
        } else {
            changed = 1; /* !was_blind */
            /* "You were wearing the Eyes of the Overworld." */
            C.You_cant("see anything now!", C.varargs(59));
            /* set ball&chain variables before the hero goes blind */
            if (C.Punished)
                C.set_bc(0);
        }
    } else if (was_blind) {
        if (!C.gulp_blnd_check()) {
            changed = 1; /* !Blind */
            C.You("can see again.", C.varargs(60));
        }
    }
    if (changed) {
        C.toggle_blindness(); /* potion.c */
    }
}

/* called in moveloop()'s prologue to set side-effects of worn start-up items;
   also used by poly_obj() when a worn item gets transformed */
/* if Null, do all worn items; otherwise just obj */
export function set_wear(obj)
{
    C.gi.initial_don = !obj;

    if (!obj ? C.ublindf != 0 : (obj == C.ublindf))
        C.callLocal(Blindf_on, C.ublindf);
    if (!obj ? C.uright != 0 : (obj == C.uright))
        C.callLocal(Ring_on, C.uright);
    if (!obj ? C.uleft != 0 : (obj == C.uleft))
        C.callLocal(Ring_on, C.uleft);
    if (!obj ? C.uamul != 0 : (obj == C.uamul))
        C.callLocal(Amulet_on, C.uamul);

    if (!obj ? C.uarmu != 0 : (obj == C.uarmu))
        C.callLocal(Shirt_on);
    if (!obj ? C.uarm != 0 : (obj == C.uarm))
        C.callLocal(Armor_on);
    if (!obj ? C.uarmc != 0 : (obj == C.uarmc))
        C.callLocal(Cloak_on);
    if (!obj ? C.uarmf != 0 : (obj == C.uarmf))
        C.callLocal(Boots_on);
    if (!obj ? C.uarmg != 0 : (obj == C.uarmg))
        C.callLocal(Gloves_on);
    if (!obj ? C.uarmh != 0 : (obj == C.uarmh))
        C.callLocal(Helmet_on);
    if (!obj ? C.uarms != 0 : (obj == C.uarms))
        C.callLocal(Shield_on);

    C.gi.initial_don = 0;
}

/* check whether the target object is currently being put on (or taken off--
   also checks for doffing--[why?]) */

export function donning(otmp)
{
    let result = 0;

    /* 'W' (or 'P' used for armor) sets ga.afternmv */
    if (C.callLocal(doffing, otmp))
        result = 1;
    else if (otmp == C.uarm)
        result = (C.ga.afternmv == Armor_on);
    else if (otmp == C.uarmu)
        result = (C.ga.afternmv == Shirt_on);
    else if (otmp == C.uarmc)
        result = (C.ga.afternmv == Cloak_on);
    else if (otmp == C.uarmf)
        result = (C.ga.afternmv == Boots_on);
    else if (otmp == C.uarmh)
        result = (C.ga.afternmv == Helmet_on);
    else if (otmp == C.uarmg)
        result = (C.ga.afternmv == Gloves_on);
    else if (otmp == C.uarms)
        result = (C.ga.afternmv == Shield_on);

    return result;
}

/* check whether the target object is currently being taken off,
   so that stop_donning() and steal() can vary messages and doname()
   can vary "(being worn)" suffix */

export function doffing(otmp)
{
    let what = C.svc.context.takeoff.what;
    let result = 0;

    /* 'T' (or 'R' used for armor) sets ga.afternmv, 'A' sets takeoff.what */
    if (otmp == C.uarm)
        result = (C.ga.afternmv == Armor_off || what == C.WORN_ARMOR);
    else if (otmp == C.uarmu)
        result = (C.ga.afternmv == Shirt_off || what == C.WORN_SHIRT);
    else if (otmp == C.uarmc)
        result = (C.ga.afternmv == Cloak_off || what == C.WORN_CLOAK);
    else if (otmp == C.uarmf)
        result = (C.ga.afternmv == Boots_off || what == C.WORN_BOOTS);
    else if (otmp == C.uarmh)
        result = (C.ga.afternmv == Helmet_off || what == C.WORN_HELMET);
    else if (otmp == C.uarmg)
        result = (C.ga.afternmv == Gloves_off || what == C.WORN_GLOVES);
    else if (otmp == C.uarms)
        result = (C.ga.afternmv == Shield_off || what == C.WORN_SHIELD);
    /* these 1-turn items don't need 'ga.afternmv' checks */
    else if (otmp == C.uamul)
        result = (what == C.WORN_AMUL);
    else if (otmp == C.uleft)
        result = (what == C.LEFT_RING);
    else if (otmp == C.uright)
        result = (what == C.RIGHT_RING);
    else if (otmp == C.ublindf)
        result = (what == C.WORN_BLINDF);
    else if (otmp == C.uwep)
        result = (what == C.W_WEP);
    else if (otmp == C.uswapwep)
        result = (what == C.W_SWAPWEP);
    else if (otmp == C.uquiver)
        result = (what == C.W_QUIVER);

    return result;
}

/* despite their names, cancel_don() and cancel_doff() both apply to both
   donning and doffing... */

export function cancel_doff(obj, slotmask)
{
    /* Called by setworn() for old item in specified slot or by setnotworn()
     * for specified item.  We don't want to call cancel_don() if we got
     * here via <X>_off() -> setworn((struct obj *) 0) -> cancel_doff()
     * because that would stop the 'A' command from continuing with next
     * selected item.  So do_takeoff() sets a flag in takeoff.mask for us.
     * [For taking off an individual item with 'T'/'R'/'w-', it doesn't
     * matter whether cancel_don() gets called here--the item has already
     * been removed by now.]
     */
    if (!(C.svc.context.takeoff.mask & C.I_SPECIAL) && C.callLocal(donning, obj))
        C.callLocal(cancel_don); /* applies to doffing too */
    C.svc.context.takeoff.mask &= ~slotmask;
}

/* despite their names, cancel_don() and cancel_doff() both apply to both
   donning and doffing... */

export function cancel_don()
{
    /* the piece of armor we were donning/doffing has vanished, so stop
     * wasting time on it (and don't dereference it when donning would
     * otherwise finish); afternmv never has some of these values because
     * every item of the corresponding armor category takes 1 turn to wear,
     * but check all of them anyway
     */
    C.svc.context.takeoff.cancelled_don = (C.ga.afternmv == Cloak_on
                                        || C.ga.afternmv == Armor_on
                                        || C.ga.afternmv == Shirt_on
                                        || C.ga.afternmv == Helmet_on
                                        || C.ga.afternmv == Gloves_on
                                        || C.ga.afternmv == Boots_on
                                        || C.ga.afternmv == Shield_on);
    C.ga.afternmv =  0;
    C.gn.nomovemsg = 0;
    C.gm.multi = 0;
    C.svc.context.takeoff.delay = 0;
    C.svc.context.takeoff.what = 0n;
}

/* called by steal() during theft from hero; interrupt donning/doffing */
/* no mesg if stolenobj is already being doffed */
export function stop_donning(stolenobj)
{
    const buf = C.charArray(C.BUFSZ);
    let otmp;
    let putting_on;
    let result = 0;

    for (otmp = C.gi.invent; otmp; otmp = otmp.nobj)
        if ((otmp.owornmask & C.W_ARMOR) && C.callLocal(donning, otmp))
            break;
    /* at most one item will pass donning() test at any given time */
    if (!otmp)
        return 0;

    /* donning() returns True when doffing too; doffing() is more specific */
    putting_on = !C.callLocal(doffing, otmp);
    /* cancel_don() looks at afternmv; it can also cancel doffing */
    C.callLocal(cancel_don);
    /* don't want <armor>_on() or <armor>_off() being called
       by unmul() since the on or off action isn't completing */
    C.ga.afternmv =  0;
    if (putting_on || otmp != stolenobj) {
        C.Sprintf(buf, "You stop %s %s.",
                putting_on ? "putting on" : "taking off",
                C.thesimpleoname(otmp), C.varargs(61));
    } else {
        buf[0] = 0;   /* silently stop doffing stolenobj */
        result = C.int(-C.gm.multi); /* remember this before calling unmul() */
    }
    C.unmul(buf);
    /* while putting on, item becomes worn immediately but side-effects are
       deferred until the delay expires; when interrupted, make it unworn
       (while taking off, item stays worn until the delay expires; when
       interrupted, leave it worn) */
    if (putting_on)
        C.remove_worn_item(otmp, 0);

    return result;
}



/* assign values to Narmorpieces and Naccessories */
/* caller wants this when count is 1 */
export function count_worn_stuff(which, accessorizing)
{
    let otmp;

    C.Narmorpieces = C.Naccessories = 0;

    otmp = 0;
    { if (C.uarmh) { C.Narmorpieces++; otmp = C.uarmh; } }
    { if (C.uarms) { C.Narmorpieces++; otmp = C.uarms; } }
    { if (C.uarmg) { C.Narmorpieces++; otmp = C.uarmg; } }
    { if (C.uarmf) { C.Narmorpieces++; otmp = C.uarmf; } }
    /* for cloak/suit/shirt, we only count the outermost item so that it
       can be taken off without confirmation if final count ends up as 1 */
    if (C.uarmc)
        { if (C.uarmc) { C.Narmorpieces++; otmp = C.uarmc; } }
    else if (C.uarm)
        { if (C.uarm) { C.Narmorpieces++; otmp = C.uarm; } }
    else if (C.uarmu)
        { if (C.uarmu) { C.Narmorpieces++; otmp = C.uarmu; } }
    if (!accessorizing)
        which.value = otmp; /* default item iff Narmorpieces is 1 */

    otmp = 0;
    { if (C.uleft) { C.Naccessories++; otmp = C.uleft; } }
    { if (C.uright) { C.Naccessories++; otmp = C.uright; } }
    { if (C.uamul) { C.Naccessories++; otmp = C.uamul; } }
    { if (C.ublindf) { C.Naccessories++; otmp = C.ublindf; } }
    if (accessorizing)
        which.value = otmp; /* default item iff Naccessories is 1 */
}

/* take off one piece or armor or one accessory;
   shared by dotakeoff('T') and doremring('R') */

export function armor_or_accessory_off(obj)
{
    if (!(obj.owornmask & (C.W_ARMOR | C.W_ACCESSORY))) {
        C.You("are not wearing that.", C.varargs(62));
        return C.ECMD_OK;
    }
    if (obj == C.uskin
        || ((obj == C.uarm) && C.uarmc)
        || ((obj == C.uarmu) && (C.uarmc || C.uarm))) {
        const why = C.charArray(C.QBUFSZ);
        const what = C.charArray(C.QBUFSZ);

        why[0] = what[0] = 0;
        if (obj != C.uskin) {
            if (C.uarmc)
                C.Strcat(what, C.cloak_simple_name(C.uarmc));
            if ((obj == C.uarmu) && C.uarm) {
                if (C.uarmc)
                    C.Strcat(what, " and ");
                C.Strcat(what, C.suit_simple_name(C.uarm));
            }
            C.Snprintf(why, C.sizeof(why), " without taking off your %s first",
                     what, C.varargs(63));
        } else {
            C.Strcpy(why, "; it's embedded");
        }
        C.You_cant("take that off%s.", why, C.varargs(64));
        return C.ECMD_OK;
    }

    C.callLocal(reset_remarm); /* clear context.takeoff.mask and context.takeoff.what */
    C.callLocal(select_off, obj);
    if (!C.svc.context.takeoff.mask)
        return C.ECMD_OK;
    /* none of armoroff()/Ring_/Amulet/Blindf_off() use context.takeoff.mask */
    C.callLocal(reset_remarm);

    if (obj.owornmask & C.W_ARMOR) {
        C.callLocal(armoroff, obj);
    } else if (obj == C.uright || obj == C.uleft) {
        /* Sometimes we want to give the off_msg before removing and
         * sometimes after; for instance, "you were wearing a moonstone
         * ring (on right hand)" is desired but "you were wearing a
         * square amulet (being worn)" is not because of the redundant
         * "being worn".
         */
        C.callLocal(off_msg, obj);
        C.callLocal(Ring_off, obj);
    } else if (obj == C.uamul) {
        C.callLocal(Amulet_off); /* does its own off_msg */
    } else if (obj == C.ublindf) {
        C.callLocal(Blindf_off, obj); /* does its own off_msg */
    } else {
        C.impossible("removing strange accessory: %s",
                   C.safe_typename(obj.otyp), C.varargs(65));
        if (obj.owornmask)
            C.remove_worn_item(obj, 0);
    }
    return C.ECMD_TIME;
}

/* the #takeoff command - remove worn armor */

export function dotakeoff()
{
    let otmp = 0;

    C.callLocal(count_worn_stuff, C.reference("obj", () => otmp, value => otmp = value), 0);
    if (!C.Narmorpieces && !C.Naccessories) {
        /* assert( GRAY_DRAGON_SCALES > YELLOW_DRAGON_SCALE_MAIL ); */
        if (C.uskin)
            C.pline_The("%s merged with your skin!",
                      C.uskin.otyp >= C.GRAY_DRAGON_SCALES
                          ? "dragon scales are"
                          : "dragon scale mail is", C.varargs(66));
        else
            C.pline("Not wearing any armor or accessories.", C.varargs(67));
        return C.ECMD_OK;
    }
    if (C.Narmorpieces != 1 || C.ParanoidRemove || C.gi.item_action_in_progress)
        otmp = C.getobj("take off", takeoff_ok, C.GETOBJ_NOFLAGS);
    if (!otmp)
        return C.ECMD_CANCEL;

    return C.callLocal(armor_or_accessory_off, otmp);
}

/* 'i' or 'I[' followed by <invlet> and then 'T';
   plain dotakeoff() would not give any feedback when picking suit
   covered by cloak, or shirt covered by suit and/or cloak, due to the
   default behavior of equip_ok() (skipping inaccessible items) */

export function ia_dotakeoff()
{
    let res;

    C.gi.item_action_in_progress = 1;
    res = C.callLocal(dotakeoff);
    C.gi.item_action_in_progress = 0;
    return res;
}

/* the #remove command - take off ring or other accessory */

export function doremring()
{
    let otmp = 0;

    C.callLocal(count_worn_stuff, C.reference("obj", () => otmp, value => otmp = value), 1);
    if (!C.Naccessories && !C.Narmorpieces) {
        C.pline("Not wearing any accessories or armor.", C.varargs(68));
        return C.ECMD_OK;
    }
    if (C.Naccessories != 1 || C.ParanoidRemove || C.cmdq_peek(C.CQ_CANNED))
        otmp = C.getobj("remove", remove_ok, C.GETOBJ_NOFLAGS);
    if (!otmp)
        return C.ECMD_CANCEL;

    return C.callLocal(armor_or_accessory_off, otmp);
}

/* Check if something worn is cursed _and_ unremovable. */

export function cursed(otmp)
{
    if (!otmp) {
        C.impossible("cursed without otmp", C.varargs(69));
        return 0;
    }
    /* Curses, like chickens, come home to roost. */
    if ((otmp == C.uwep) ? C.welded(otmp) : otmp.cursed) {
        let use_plural = (C.is_boots(otmp) || C.is_gloves(otmp)
                              || otmp.otyp == C.LENSES || otmp.quan > 1n);

        /* might be trying again after applying grease to hands */
        if (C.Glib && otmp.bknown
            /* for weapon, we'll only get here via 'A )' */
            && (C.uarmg ? (otmp == C.uwep)
                      : ((otmp.owornmask & (C.W_WEP | C.W_RING)) != 0)))
            C.pline("Despite your slippery %s, you can't.",
                  C.callLocal(fingers_or_gloves, 1), C.varargs(70));
        else
            C.You("can't.  %s cursed.", use_plural ? "They are" : "It is", C.varargs(71));
        C.set_bknown(otmp, 1);
        return 1;
    }
    return 0;
}


export function armoroff(otmp)
{
    const offdelaybuf = C.staticBuffer(60);
    let delay = -C.objects[otmp.otyp].oc_delay;
    let what = 0;

    if (C.callLocal(cursed, otmp))
        return 0;
    /* this used to make assumptions about which types of armor had
       delays and which didn't; now both are handled for all types */
    if (delay) {
        C.nomul(delay);
        C.gm.multi_reason = "disrobing";
        switch (C.objects[otmp.otyp].oc_armcat) {
        case C.ARM_SUIT:
            what = C.suit_simple_name(otmp);
            C.ga.afternmv = Armor_off;
            break;
        case C.ARM_SHIELD:
            what = C.shield_simple_name(otmp);
            C.ga.afternmv = Shield_off;
            break;
        case C.ARM_HELM:
            what = C.helm_simple_name(otmp);
            C.ga.afternmv = Helmet_off;
            break;
        case C.ARM_GLOVES:
            what = C.gloves_simple_name(otmp);
            C.ga.afternmv = Gloves_off;
            break;
        case C.ARM_BOOTS:
            what = C.boots_simple_name(otmp);
            C.ga.afternmv = Boots_off;
            break;
        case C.ARM_CLOAK:
            what = C.cloak_simple_name(otmp);
            C.ga.afternmv = Cloak_off;
            break;
        case C.ARM_SHIRT:
            what = C.shirt_simple_name(otmp);
            C.ga.afternmv = Shirt_off;
            break;
        default:
            C.impossible("Taking off unknown armor (%d: %d), delay %d",
                       otmp.otyp, C.objects[otmp.otyp].oc_armcat, delay, C.varargs(72));
            break;
        }
        if (what) {
            /* sizeof offdelaybuf == 60; increase it if this becomes longer */
            C.Snprintf(offdelaybuf, C.sizeof(offdelaybuf),
                     "You finish taking off your %s.", what, C.varargs(73));
            C.gn.nomovemsg = offdelaybuf;
        }
    } else {
        /* no delay so no '(*afternmv)()' or 'nomovemsg' */
        switch (C.objects[otmp.otyp].oc_armcat) {
        case C.ARM_SUIT:
            C.callLocal(Armor_off);
            break;
        case C.ARM_SHIELD:
            C.callLocal(Shield_off);
            break;
        case C.ARM_HELM:
            C.callLocal(Helmet_off);
            break;
        case C.ARM_GLOVES:
            C.callLocal(Gloves_off);
            break;
        case C.ARM_BOOTS:
            C.callLocal(Boots_off);
            break;
        case C.ARM_CLOAK:
            C.callLocal(Cloak_off);
            break;
        case C.ARM_SHIRT:
            C.callLocal(Shirt_off);
            break;
        default:
            C.impossible("Taking off unknown armor (%d: %d), no delay",
                       otmp.otyp, C.objects[otmp.otyp].oc_armcat, C.varargs(74));
            break;
        }
        /* We want off_msg() after removing the item to
           avoid "You were wearing ____ (being worn)." */
        C.callLocal(off_msg, otmp);
    }
    C.svc.context.takeoff.mask = C.svc.context.takeoff.what = 0n;
    return 1;
}


export function already_wearing(cc)
{
    C.You("are already wearing %s%c", cc, (cc == c_that_) ? 33 : 46, C.varargs(75));
}


export function already_wearing2(cc1, cc2)
{
    C.You_cant("wear %s because you're wearing %s there already.", cc1, cc2, C.varargs(76));
}

/*
 * canwearobj checks to see whether the player can wear a piece of armor
 *
 * inputs: otmp (the piece of armor)
 *         noisy (if TRUE give error messages, otherwise be quiet about it)
 * output: mask (otmp's armor type)
 */

export function canwearobj(otmp, mask, noisy)
{
    let err = 0;
    let which;

    /* this is the same check as for 'W' (dowear), but different message,
       in case we get here via 'P' (doputon) */
    if (C.verysmall(C.gy.youmonst.data) || C.nohands(C.gy.youmonst.data)) {
        if (noisy)
            C.You("can't wear any armor in your current form.", C.varargs(77));
        return 0;
    }

    which = C.is_cloak(otmp) ? c_cloak
            : C.is_shirt(otmp) ? c_shirt
              : C.is_suit(otmp) ? c_suit
                : 0;
    if (which && C.cantweararm(C.gy.youmonst.data)
        /* same exception for cloaks as used in m_dowear() */
        && (which != c_cloak
            || ((otmp.otyp != C.MUMMY_WRAPPING)
                ? C.gy.youmonst.data.msize != C.MZ_SMALL
                : !C.WrappingAllowed(C.gy.youmonst.data)))
        && (C.racial_exception(C.addressOf(C.gy, "youmonst"), otmp) < 1)) {
        if (noisy)
            C.pline_The("%s will not fit on your body.", which, C.varargs(78));
        return 0;
    } else if (otmp.owornmask & C.W_ARMOR) {
        if (noisy)
            C.callLocal(already_wearing, c_that_);
        return 0;
    }

    if (C.welded(C.uwep) && C.bimanual(C.uwep) && (C.is_suit(otmp) || C.is_shirt(otmp))) {
        if (noisy)
            C.You("cannot do that while holding your %s.",
                C.is_sword(C.uwep) ? c_sword : c_weapon, C.varargs(79));
        return 0;
    }

    if (C.is_helmet(otmp)) {
        if (C.uarmh) {
            if (noisy)
                C.callLocal(already_wearing, C.an(C.helm_simple_name(C.uarmh)));
            err++;
        } else if (C.Upolyd && C.has_horns(C.gy.youmonst.data) && !C.is_flimsy(otmp)) {
            /* (flimsy exception matches polyself handling) */
            if (noisy)
                C.pline_The("%s won't fit over your horn%s.",
                          C.helm_simple_name(otmp),
                          C.plur(C.num_horns(C.gy.youmonst.data)), C.varargs(80));
            err++;
        } else
            mask.value = C.W_ARMH;
    } else if (C.is_shield(otmp)) {
        if (C.uarms) {
            if (noisy)
                C.callLocal(already_wearing, C.an(c_shield));
            err++;
        } else if (C.uwep && C.bimanual(C.uwep)) {
            if (noisy)
                C.You("cannot wear a shield while wielding a two-handed %s.",
                    C.is_sword(C.uwep) ? c_sword : (C.uwep.otyp == C.BATTLE_AXE)
                                                   ? c_axe
                                                   : c_weapon, C.varargs(81));
            err++;
        } else if (C.u.twoweap) {
            if (noisy)
                C.You("cannot wear a shield while wielding two weapons.", C.varargs(82));
            err++;
        } else
            mask.value = C.W_ARMS;
    } else if (C.is_boots(otmp)) {
        if (C.uarmf) {
            if (noisy)
                C.callLocal(already_wearing, c_boots);
            err++;
        } else if (C.Upolyd && C.slithy(C.gy.youmonst.data)) {
            if (noisy)
                C.You("have no feet...", C.varargs(83)); /* not body_part(FOOT) */
            err++;
        } else if (C.Upolyd && C.gy.youmonst.data.mlet == C.S_CENTAUR) {
            /* break_armor() pushes boots off for centaurs, so don't let
               dowear() put them back on;
               makeplural(body_part(FOOT)) would yield "rear hooves" here,
               which sounds odd, so use hard-coded "hooves" */
            if (noisy)
                C.You("have too many hooves to wear %s.", c_boots, C.varargs(84));
            err++;
        } else if (C.u.utrap
                   && (C.u.utraptype == C.TT_BEARTRAP || C.u.utraptype == C.TT_INFLOOR
                       || C.u.utraptype == C.TT_LAVA
                       || C.u.utraptype == C.TT_BURIEDBALL)) {
            if (C.u.utraptype == C.TT_BEARTRAP) {
                if (noisy)
                    C.Your("%s is trapped!", C.body_part(C.FOOT), C.varargs(85));
            } else if (C.u.utraptype == C.TT_INFLOOR || C.u.utraptype == C.TT_LAVA) {
                if (noisy)
                    C.Your("%s are stuck in the %s!",
                         C.makeplural(C.body_part(C.FOOT)), C.surface(C.u.ux, C.u.uy), C.varargs(86));
            } else { /*TT_BURIEDBALL*/
                if (noisy)
                    C.Your("%s is attached to the buried ball!",
                         C.body_part(C.LEG), C.varargs(87));
            }
            err++;
        } else
            mask.value = C.W_ARMF;
    } else if (C.is_gloves(otmp)) {
        if (C.uarmg) {
            if (noisy)
                C.callLocal(already_wearing, c_gloves);
            err++;
        } else if (C.welded(C.uwep)) {
            if (noisy)
                C.You("cannot wear gloves over your %s.",
                    C.is_sword(C.uwep) ? c_sword : c_weapon, C.varargs(88));
            err++;
        } else if (C.Glib) {
            /* prevent slippery bare fingers from transferring to
               gloved fingers */
            if (noisy)
                C.Your("%s are too slippery to pull on %s.",
                     C.callLocal(fingers_or_gloves, 0), C.gloves_simple_name(otmp), C.varargs(89));
            err++;
        } else
            mask.value = C.W_ARMG;
    } else if (C.is_shirt(otmp)) {
        if (C.uarm || C.uarmc || C.uarmu) {
            if (C.uarmu) {
                if (noisy)
                    C.callLocal(already_wearing, C.an(c_shirt));
            } else {
                if (noisy)
                    C.You_cant("wear that over your %s.",
                             (C.uarm && !C.uarmc) ? c_armor
                                              : C.cloak_simple_name(C.uarmc), C.varargs(90));
            }
            err++;
        } else
            mask.value = C.W_ARMU;
    } else if (C.is_cloak(otmp)) {
        if (C.uarmc) {
            if (noisy)
                C.callLocal(already_wearing, C.an(C.cloak_simple_name(C.uarmc)));
            err++;
        } else
            mask.value = C.W_ARMC;
    } else if (C.is_suit(otmp)) {
        if (C.uarmc) {
            if (noisy)
                C.You("cannot wear armor over a %s.", C.cloak_simple_name(C.uarmc), C.varargs(91));
            err++;
        } else if (C.uarm) {
            if (noisy)
                C.callLocal(already_wearing, "some armor");
            err++;
        } else
            mask.value = C.W_ARM;
    } else {
        /* getobj can't do this after setting its allow_all flag; that
           happens if you have armor for slots that are covered up or
           extra armor for slots that are filled */
        if (noisy)
            C.silly_thing("wear", otmp);
        err++;
    }
    /* Unnecessary since now only weapons and special items like pick-axes get
     * welded to your hand, not armor
        if (welded(otmp)) {
            if (!err++) {
                if (noisy) weldmsg(otmp);
            }
        }
     */
    return !err;
}


export function accessory_or_armor_on(obj)
{
    let mask = 0n;
    let armor, ring, amulet, eyewear;

    if (obj.owornmask & (C.W_ACCESSORY | C.W_ARMOR)) {
        C.callLocal(already_wearing, c_that_);
        return C.ECMD_OK;
    }
    armor = (obj.oclass == C.ARMOR_CLASS);
    ring = (obj.oclass == C.RING_CLASS || obj.otyp == C.MEAT_RING);
    amulet = (obj.oclass == C.AMULET_CLASS);
    eyewear = (obj.otyp == C.BLINDFOLD || obj.otyp == C.TOWEL
               || obj.otyp == C.LENSES);
    /* checks which are performed prior to actually touching the item */
    if (armor) {
        if (!C.callLocal(canwearobj, obj, C.reference("long", () => mask, value => mask = value), 1))
            return C.ECMD_OK;

        if (obj.otyp == C.HELM_OF_OPPOSITE_ALIGNMENT
            && C.qstart_level.dnum == C.u.uz.dnum) { /* in quest */
            if (C.u.ualignbase[C.A_CURRENT] == C.u.ualignbase[C.A_ORIGINAL])
                C.You("narrowly avoid losing all chance at your goal.", C.varargs(92));
            else /* converted */
                C.You("are suddenly overcome with shame and change your mind.", C.varargs(93));
            C.u.ublessed = 0; /* lose your god's protection */
            C.makeknown(obj.otyp);
            C.disp.botl = 1; /* for AC after zeroing u.ublessed */
            return C.ECMD_TIME;
        }
    } else {
        /*
         * FIXME:
         *  except for the rings/nolimbs case, this allows you to put on
         *  accessories without having any hands to manipulate them, and
         *  to put them on when poly'd into a tiny or huge form where
         *  they shouldn't fit.  [If the latter situation changes, make
         *  comparable change to break_armor(polyself.c).]
         */

        /* accessory */
        if (ring) {
            let answer; const qbuf = C.charArray(C.QBUFSZ);
            let res = 0;

            if (C.nolimbs(C.gy.youmonst.data)) {
                C.You("cannot make the ring stick to your body.", C.varargs(94));
                return C.ECMD_OK;
            }
            if (C.uleft && C.uright) {
                C.There("are no more %s%s to fill.",
                      C.humanoid(C.gy.youmonst.data) ? "ring-" : "",
                      C.callLocal(fingers_or_gloves, 0), C.varargs(95));
                return C.ECMD_OK;
            }
            if (C.uleft) {
                mask = C.RIGHT_RING;
            } else if (C.uright) {
                mask = C.LEFT_RING;
            } else {
                do {
                    C.Sprintf(qbuf, "Which %s%s, Right or Left?",
                            C.humanoid(C.gy.youmonst.data) ? "ring-" : "",
                            C.body_part(C.FINGER), C.varargs(96));
                    answer = C.yn_function(qbuf, C.rightleftchars, 0, 1);
                    switch (answer) {
                    case 0:
                    case 27:
                        return C.ECMD_OK;
                    case 108:
                    case 76:
                        mask = C.LEFT_RING;
                        break;
                    case 114:
                    case 82:
                        mask = C.RIGHT_RING;
                        break;
                    }
                } while (!mask);
            }
            if (C.uarmg && C.Glib) {
                C.Your(
              "%s are too slippery to remove, so you cannot put on the ring.",
                     C.gloves_simple_name(C.uarmg), C.varargs(97));
                return C.ECMD_TIME; /* always uses move */
            }
            if (C.uarmg && C.uarmg.cursed) {
                res = !C.uarmg.bknown;
                C.set_bknown(C.uarmg, 1);
                C.You("cannot remove your %s to put on the ring.", c_gloves, C.varargs(98));
                /* uses move iff we learned gloves are cursed */
                return res ? C.ECMD_TIME : C.ECMD_OK;
            }
            if (C.uwep) {
                res = !C.uwep.bknown; /* check this before calling welded() */
                if (((mask == C.RIGHT_RING && C.URIGHTY)
                     || (mask == C.LEFT_RING  && C.ULEFTY)
                     || C.bimanual(C.uwep)) && C.welded(C.uwep)) {
                    let hand = C.body_part(C.HAND);

                    /* welded will set bknown */
                    if (C.bimanual(C.uwep))
                        hand = C.makeplural(hand);
                    C.You("cannot free your weapon %s to put on the ring.",
                        hand, C.varargs(99));
                    /* uses move iff we learned weapon is cursed */
                    return res ? C.ECMD_TIME : C.ECMD_OK;
                }
            }
        } else if (amulet) {
            if (C.uamul) {
                C.callLocal(already_wearing, "an amulet");
                return C.ECMD_OK;
            }
        } else if (eyewear) {
            if (!C.has_head(C.gy.youmonst.data)) {
                C.You("have no head to wear %s on.", C.ansimpleoname(obj), C.varargs(100));
                return C.ECMD_OK;
            }

            if (C.ublindf) {
                if (C.ublindf.otyp == C.TOWEL)
                    C.Your("%s is already covered by a towel.",
                         C.body_part(C.FACE), C.varargs(101));
                else if (C.ublindf.otyp == C.BLINDFOLD) {
                    if (obj.otyp == C.LENSES)
                        C.callLocal(already_wearing2, "lenses", "a blindfold");
                    else
                        C.callLocal(already_wearing, "a blindfold");
                } else if (C.ublindf.otyp == C.LENSES) {
                    if (obj.otyp == C.BLINDFOLD)
                        C.callLocal(already_wearing2, "a blindfold", "some lenses");
                    else
                        C.callLocal(already_wearing, "some lenses");
                } else {
                    C.callLocal(already_wearing, C.something); /* ??? */
                }
                return C.ECMD_OK;
            }
        } else {
            /* neither armor nor accessory */
            C.You_cant("wear that!", C.varargs(102));
            return C.ECMD_OK;
        }
    }

    if (!C.retouch_object(C.reference("obj", () => obj, value => obj = value), 0))
        return C.ECMD_TIME; /* costs a turn even though it didn't get worn */

    if (armor) {
        let delay;

        /* if the armor is wielded, release it for wearing (won't be
           welded even if cursed; that only happens for weapons/weptools) */
        if (obj.owornmask & C.W_WEAPONS)
            C.remove_worn_item(obj, 0);
        /*
         * Setting obj->known=1 is done because setworn() causes hero's AC
         * to change so armor's +/- value is evident via the status line.
         * We used to set it here because of that, but then it would stick
         * if a nymph stole the armor before it was fully worn.  Delay it
         * until the afternmv action.  The player may still know this armor's
         * +/- amount if donning gets interrupted, but the hero won't.
         *
        obj->known = 1;
         */
        C.gw.wasinwater = C.u.uinwater; /* for WWALKING; Boots_on() is too late */
        C.setworn(obj, mask);
        /* if there's no delay, we'll execute 'afternmv' immediately */
        if (obj == C.uarm)
            C.ga.afternmv = Armor_on;
        else if (obj == C.uarmh)
            C.ga.afternmv = Helmet_on;
        else if (obj == C.uarmg)
            C.ga.afternmv = Gloves_on;
        else if (obj == C.uarmf)
            C.ga.afternmv = Boots_on;
        else if (obj == C.uarms)
            C.ga.afternmv = Shield_on;
        else if (obj == C.uarmc)
            C.ga.afternmv = Cloak_on;
        else if (obj == C.uarmu)
            C.ga.afternmv = Shirt_on;
        else
            C.panic("wearing armor not worn as armor? [%08lx]", obj.owornmask, C.varargs(103));

        delay = -C.objects[obj.otyp].oc_delay;
        if (delay) {
            C.nomul(delay);
            C.gm.multi_reason = "dressing up";
            C.gn.nomovemsg = "You finish your dressing maneuver.";
        } else {
            C.unmul(""); /* call afternmv, clear it+nomovemsg+multi_reason */
            C.callLocal(on_msg, obj);
        }
        C.svc.context.takeoff.mask = C.svc.context.takeoff.what = 0n;
        /* gw.wasinwater = 0U; // can't clear this yet; Boots_on() needs it
         * and gets called via afternmv() after this routine has returned */
    } else { /* not armor */
        if (ring) {
            /* Ring_on() expects ring to already be worn as uleft or uright */
            C.setworn(obj, mask);
            C.callLocal(Ring_on, obj);
            /* is_worn(): 'obj' will always be worn here except when putting
               on a ring of levitation while at a sink location */
            if (C.is_worn(obj))
                C.callLocal(on_msg, obj);
        } else if (amulet) {
            /* setworn() and on_msg() handled by Amulet_on() */
            C.callLocal(Amulet_on, obj);
        } else if (eyewear) {
            /* setworn() and on_msg() handled by Blindf_on() */
            C.callLocal(Blindf_on, obj);
        } else {
            C.impossible("putting on unexpected type of accessory: %s",
                       C.safe_typename(obj.otyp), C.varargs(104));
        }
    }
    return C.ECMD_TIME;
}

/* the #wear command */

export function dowear()
{
    let otmp;

    /* cantweararm() checks for suits of armor, not what we want here;
       verysmall() or nohands() checks for shields, gloves, etc... */
    if (C.verysmall(C.gy.youmonst.data) || C.nohands(C.gy.youmonst.data)) {
        C.pline("Don't even bother.", C.varargs(105));
        return C.ECMD_OK;
    }
    if (C.uarm && C.uarmu && C.uarmc && C.uarmh && C.uarms && C.uarmg && C.uarmf
        && C.uleft && C.uright && C.uamul && C.ublindf) {
        /* 'W' message doesn't mention accessories */
        C.You("are already wearing a full complement of armor.", C.varargs(106));
        return C.ECMD_OK;
    }
    otmp = C.getobj("wear", wear_ok, C.GETOBJ_NOFLAGS);
    return otmp ? C.callLocal(accessory_or_armor_on, otmp) : C.ECMD_CANCEL;
}

/* the #puton command */

export function doputon()
{
    let otmp;

    if (C.uleft && C.uright && C.uamul && C.ublindf
        && C.uarm && C.uarmu && C.uarmc && C.uarmh && C.uarms && C.uarmg && C.uarmf) {
        /* 'P' message doesn't mention armor */
        C.Your("%s%s are full, and you're already wearing an amulet and %s.",
             C.humanoid(C.gy.youmonst.data) ? "ring-" : "",
             C.callLocal(fingers_or_gloves, 0),
             (C.ublindf.otyp == C.LENSES) ? "some lenses" : "a blindfold", C.varargs(107));
        return C.ECMD_OK;
    }
    otmp = C.getobj("put on", puton_ok, C.GETOBJ_NOFLAGS);
    return otmp ? C.callLocal(accessory_or_armor_on, otmp) : C.ECMD_CANCEL;
}

/* calculate current armor class */

export function find_ac()
{
    let uac = C.mons[C.u.umonnum].ac; /* base armor class for current form */

    /* armor class from worn gear */
    if (C.uarm)
        uac -= C.ARM_BONUS(C.uarm);
    if (C.uarmc)
        uac -= C.ARM_BONUS(C.uarmc);
    if (C.uarmh)
        uac -= C.ARM_BONUS(C.uarmh);
    if (C.uarmf)
        uac -= C.ARM_BONUS(C.uarmf);
    if (C.uarms)
        uac -= C.ARM_BONUS(C.uarms);
    if (C.uarmg)
        uac -= C.ARM_BONUS(C.uarmg);
    if (C.uarmu)
        uac -= C.ARM_BONUS(C.uarmu);
    if (C.uleft && C.uleft.otyp == C.RIN_PROTECTION)
        uac -= C.uleft.spe;
    if (C.uright && C.uright.otyp == C.RIN_PROTECTION)
        uac -= C.uright.spe;
    if (C.uamul && C.uamul.otyp == C.AMULET_OF_GUARDING)
        uac -= 2; /* fixed amount; main benefit is to MC */

    /* armor class from other sources */
    if (C.HProtection & C.INTRINSIC)
        uac -= C.u.ublessed;
    uac -= C.u.uspellprot;

    /* put a cap on armor class [5.0: was +127,-128, now reduced to +/- 99 */
    if (C.abs(uac) > C.AC_MAX)
        uac = C.sgn(uac) * C.AC_MAX;

    if (uac != C.u.uac) {
        C.u.uac = uac;
        C.disp.botl = 1;
/* these could conceivably be achieved out of order (by being near
           threshold and putting on +N dragon scale mail from bones, for
           instance), but if that happens, that's the order it happened;
           also, testing for these in the usual order would result in more
           record_achievement() attempts and rejects for duplication */
    }
}


export function glibr()
{
    let otmp;
    let xfl = 0;
    let leftfall, rightfall, wastwoweap = 0;
    let otherwep = 0,thiswep,which,hand;

    leftfall = (C.uleft && !C.uleft.cursed
                && (!C.uwep || !(C.welded(C.uwep) && C.ULEFTY)
                    || !C.bimanual(C.uwep)));
    rightfall = (C.uright && !C.uright.cursed
                && (!C.uwep || !(C.welded(C.uwep) && C.URIGHTY)
                    || !C.bimanual(C.uwep)));
/*
    leftfall = (uleft && !uleft->cursed
                && (!uwep || !welded(uwep) || !bimanual(uwep)));
    rightfall = (uright && !uright->cursed && (!welded(uwep)));
*/

    if (!C.uarmg && (leftfall || rightfall) && !C.nolimbs(C.gy.youmonst.data)) {
        /* changed so cursed rings don't fall off, GAN 10/30/86 */
        C.Your("%s off your %s.",
             (leftfall && rightfall) ? "rings slip" : "ring slips",
             (leftfall && rightfall) ? C.callLocal(fingers_or_gloves, 0)
                                     : C.body_part(C.FINGER), C.varargs(108));
        xfl++;
        if (leftfall) {
            otmp = C.uleft;
            C.callLocal(Ring_off, C.uleft);
            C.dropx(otmp);
            C.cmdq_clear(C.CQ_CANNED);
        }
        if (rightfall) {
            otmp = C.uright;
            C.callLocal(Ring_off, C.uright);
            C.dropx(otmp);
            C.cmdq_clear(C.CQ_CANNED);
        }
    }

    otmp = C.uswapwep;
    if (C.u.twoweap && otmp) {
        /* secondary weapon doesn't need nearly as much handling as
           primary; when in two-weapon mode, we know it's one-handed
           with something else in the other hand and also that it's
           a weapon or weptool rather than something unusual, plus
           we don't need to compare its type with the primary */
        otherwep = C.is_sword(otmp) ? c_sword : C.weapon_descr(otmp);
        if (otmp.quan > 1n)
            otherwep = C.makeplural(otherwep);
        hand = C.body_part(C.HAND);
        which = C.URIGHTY ? "left " : "right ";  /* text for the off hand */
        C.Your("%s %s%s from your %s%s.", otherwep, xfl ? "also " : "",
             C.otense(otmp, "slip"), which, hand, C.varargs(109));
        xfl++;
        wastwoweap = 1;
        C.setuswapwep(0); /* clears u.twoweap */
        C.cmdq_clear(C.CQ_CANNED);
        if (C.canletgo(otmp, ""))
            C.dropx(otmp);
    }
    otmp = C.uwep;
    if (otmp && otmp.otyp != C.AKLYS && !C.welded(otmp)) {
        let savequan = otmp.quan;

        /* nice wording if both weapons are the same type */
        thiswep = C.is_sword(otmp) ? c_sword : C.weapon_descr(otmp);
        if (otherwep && C.strcmp(thiswep, C.makesingular(otherwep)))
            otherwep = 0;
        if (otmp.quan > 1n) {
            /* most class names for unconventional wielded items
               are ok, but if wielding multiple apples or rations
               we don't want "your foods slip", so force non-corpse
               food to be singular; skipping makeplural() isn't
               enough--we need to fool otense() too */
            if (!C.strcmp(thiswep, "food"))
                otmp.quan = 1n;
            else
                thiswep = C.makeplural(thiswep);
        }
        hand = C.body_part(C.HAND);
        which = "";
        if (C.bimanual(otmp)) {
            hand = C.makeplural(hand);
        } else if (wastwoweap) {
            /* preceding msg was about non-dominant hand */
            which = C.URIGHTY ? "right " : "left ";
        }
        C.pline("%s %s%s %s%s from your %s%s.",
              !C.strncmp(thiswep, "corpse", 6) ? "The" : "Your",
              otherwep ? "other " : "", thiswep, xfl ? "also " : "",
              C.otense(otmp, "slip"), which, hand, C.varargs(110));
        /* xfl++; */
        otmp.quan = savequan;
        C.setuwep(0);
        C.cmdq_clear(C.CQ_CANNED);
        if (C.canletgo(otmp, ""))
            C.dropx(otmp);
    }
}


export function some_armor(victim)
{
    let otmph,otmp;

    otmph = (victim == C.addressOf(C.gy, "youmonst")) ? C.uarmc : C.which_armor(victim, C.W_ARMC);
    if (!otmph)
        otmph = (victim == C.addressOf(C.gy, "youmonst")) ? C.uarm : C.which_armor(victim, C.W_ARM);
    if (!otmph)
        otmph = (victim == C.addressOf(C.gy, "youmonst")) ? C.uarmu : C.which_armor(victim, C.W_ARMU);

    otmp = (victim == C.addressOf(C.gy, "youmonst")) ? C.uarmh : C.which_armor(victim, C.W_ARMH);
    if (otmp && (!otmph || !C.rn2(4, "some_armor", 2641)))
        otmph = otmp;
    otmp = (victim == C.addressOf(C.gy, "youmonst")) ? C.uarmg : C.which_armor(victim, C.W_ARMG);
    if (otmp && (!otmph || !C.rn2(4, "some_armor", 2644)))
        otmph = otmp;
    otmp = (victim == C.addressOf(C.gy, "youmonst")) ? C.uarmf : C.which_armor(victim, C.W_ARMF);
    if (otmp && (!otmph || !C.rn2(4, "some_armor", 2647)))
        otmph = otmp;
    otmp = (victim == C.addressOf(C.gy, "youmonst")) ? C.uarms : C.which_armor(victim, C.W_ARMS);
    if (otmp && (!otmph || !C.rn2(4, "some_armor", 2650)))
        otmph = otmp;
    return otmph;
}

/* used for praying to check and fix levitation trouble */

export function stuck_ring(ring, otyp)
{
    if (ring != C.uleft && ring != C.uright) {
        C.impossible("stuck_ring: neither left nor right?", C.varargs(111));
        return 0;
    }

    if (ring && ring.otyp == otyp) {
        /* reasons ring can't be removed match those checked by select_off();
           limbless case has extra checks because ordinarily it's temporary */
        if (C.nolimbs(C.gy.youmonst.data) && C.uamul
            && C.uamul.otyp == C.AMULET_OF_UNCHANGING && C.uamul.cursed)
            return C.uamul;
        if (C.welded(C.uwep) && ((ring == C.RING_ON_PRIMARY) || C.bimanual(C.uwep)))
            return C.uwep;
        if (C.uarmg && C.uarmg.cursed)
            return C.uarmg;
        if (ring.cursed)
            return ring;
        /* normally outermost layer is processed first, but slippery gloves
           wears off quickly so uncurse ring itself before handling those */
        if (C.uarmg && C.Glib)
            return C.uarmg;
    }
    /* either no ring or not right type or nothing prevents its removal */
    return 0;
}

/* also for praying; find worn item that confers "Unchanging" attribute */

export function unchanger()
{
    if (C.uamul && C.uamul.otyp == C.AMULET_OF_UNCHANGING)
        return C.uamul;
    return 0;
}


export function select_off(otmp)
{
    let why;
    const buf = C.charArray(C.BUFSZ);

    if (!otmp)
        return 0;
    buf[0] = 0; /* lint suppression */

    /* special ring checks */
    if (otmp == C.uright || otmp == C.uleft) {
        const glibdummy = C.localStruct("obj");

        if (C.nolimbs(C.gy.youmonst.data)) {
            C.pline_The("ring is stuck.", C.varargs(112));
            return 0;
        }
        C.copyStruct(glibdummy, C.cg.zeroobj);
        why = 0; /* the item which prevents ring removal */
        if (C.welded(C.uwep) && ((otmp == C.RING_ON_PRIMARY) || C.bimanual(C.uwep))) {
            C.Sprintf(buf, "free a weapon %s", C.body_part(C.HAND), C.varargs(113));
            why = C.uwep;
        } else if (C.uarmg && (C.uarmg.cursed || C.Glib)) {
            C.Sprintf(buf, "take off your %s%s",
                    C.Glib ? "slippery " : "", C.gloves_simple_name(C.uarmg), C.varargs(114));
            why = !C.Glib ? C.uarmg : glibdummy;
        }
        if (why) {
            C.You("cannot %s to remove the ring.", buf, C.varargs(115));
            C.set_bknown(why, 1);
            return 0;
        }
    }
    /* special glove checks */
    if (otmp == C.uarmg) {
        if (C.welded(C.uwep)) {
            C.You("are unable to take off your %s while wielding that %s.",
                c_gloves, C.is_sword(C.uwep) ? c_sword : c_weapon, C.varargs(116));
            C.set_bknown(C.uwep, 1);
            return 0;
        } else if (C.Glib) {
            C.pline("%s %s are too slippery to take off.",
                  C.uarmg.unpaid ? "The" : "Your", /* simplified Shk_Your() */
                  C.gloves_simple_name(C.uarmg), C.varargs(117));
            return 0;
        }
        if (C.callLocal(better_not_take_that_off, otmp))
            return 0;
    }
    /* special boot checks */
    if (otmp == C.uarmf) {
        if (C.u.utrap && C.u.utraptype == C.TT_BEARTRAP) {
            C.pline_The("bear trap prevents you from pulling your %s out.",
                      C.body_part(C.FOOT), C.varargs(118));
            return 0;
        } else if (C.u.utrap && C.u.utraptype == C.TT_INFLOOR) {
            C.You("are stuck in the %s, and cannot pull your %s out.",
                C.surface(C.u.ux, C.u.uy), C.makeplural(C.body_part(C.FOOT)), C.varargs(119));
            return 0;
        }
    }
    /* special suit and shirt checks */
    if (otmp == C.uarm || otmp == C.uarmu) {
        why = 0; /* the item which prevents disrobing */
        if (C.uarmc && C.uarmc.cursed) {
            C.Sprintf(buf, "remove your %s", C.cloak_simple_name(C.uarmc), C.varargs(120));
            why = C.uarmc;
        } else if (otmp == C.uarmu && C.uarm && C.uarm.cursed) {
            C.Sprintf(buf, "remove your %s", c_suit, C.varargs(121));
            why = C.uarm;
        } else if (C.welded(C.uwep) && C.bimanual(C.uwep)) {
            C.Sprintf(buf, "release your %s",
                    C.is_sword(C.uwep) ? c_sword : (C.uwep.otyp == C.BATTLE_AXE)
                                                   ? c_axe
                                                   : c_weapon, C.varargs(122));
            why = C.uwep;
        }
        if (why) {
            C.You("cannot %s to take off %s.", buf, C.the(C.xname(otmp)), C.varargs(123));
            C.set_bknown(why, 1);
            return 0;
        }
    }
    /* basic curse check */
    if (otmp == C.uquiver || (otmp == C.uswapwep && !C.u.twoweap)) {
        ; /* some items can be removed even when cursed */
    } else {
        /* otherwise, this is fundamental */
        if (C.callLocal(cursed, otmp))
            return 0;
    }

    if (otmp == C.uarm)
        C.svc.context.takeoff.mask |= C.WORN_ARMOR;
    else if (otmp == C.uarmc)
        C.svc.context.takeoff.mask |= C.WORN_CLOAK;
    else if (otmp == C.uarmf)
        C.svc.context.takeoff.mask |= C.WORN_BOOTS;
    else if (otmp == C.uarmg)
        C.svc.context.takeoff.mask |= C.WORN_GLOVES;
    else if (otmp == C.uarmh)
        C.svc.context.takeoff.mask |= C.WORN_HELMET;
    else if (otmp == C.uarms)
        C.svc.context.takeoff.mask |= C.WORN_SHIELD;
    else if (otmp == C.uarmu)
        C.svc.context.takeoff.mask |= C.WORN_SHIRT;
    else if (otmp == C.uleft)
        C.svc.context.takeoff.mask |= C.LEFT_RING;
    else if (otmp == C.uright)
        C.svc.context.takeoff.mask |= C.RIGHT_RING;
    else if (otmp == C.uamul)
        C.svc.context.takeoff.mask |= C.WORN_AMUL;
    else if (otmp == C.ublindf)
        C.svc.context.takeoff.mask |= C.WORN_BLINDF;
    else if (otmp == C.uwep)
        C.svc.context.takeoff.mask |= C.W_WEP;
    else if (otmp == C.uswapwep)
        C.svc.context.takeoff.mask |= C.W_SWAPWEP;
    else if (otmp == C.uquiver)
        C.svc.context.takeoff.mask |= C.W_QUIVER;

    else
        C.impossible("select_off: %s???", C.doname(otmp), C.varargs(124));

    return 0;
}


export function do_takeoff()
{
    let otmp = 0;
    let was_twoweap = C.u.twoweap;
    let doff = C.addressOf(C.svc.context, "takeoff");

    C.svc.context.takeoff.mask |= C.I_SPECIAL; /* set flag for cancel_doff() */
    if (doff.what == C.W_WEP) {
        if (!C.callLocal(cursed, C.uwep)) {
            C.setuwep(0);
            if (was_twoweap)
                C.You("are no longer wielding either weapon.", C.varargs(125));
            else
                C.You("are %s.", C.empty_handed(), C.varargs(126));
        }
    } else if (doff.what == C.W_SWAPWEP) {
        C.setuswapwep(0);
        C.You("%sno longer %s.", was_twoweap ? "are " : "",
            was_twoweap ? "wielding two weapons at once"
                        : "have a second weapon readied", C.varargs(127));
    } else if (doff.what == C.W_QUIVER) {
        C.setuqwep(0);
        C.You("no longer have ammunition readied.", C.varargs(128));
    } else if (doff.what == C.WORN_ARMOR) {
        otmp = C.uarm;
        if (!C.callLocal(cursed, otmp))
            C.callLocal(Armor_off);
    } else if (doff.what == C.WORN_CLOAK) {
        otmp = C.uarmc;
        if (!C.callLocal(cursed, otmp))
            C.callLocal(Cloak_off);
    } else if (doff.what == C.WORN_BOOTS) {
        otmp = C.uarmf;
        if (!C.callLocal(cursed, otmp))
            C.callLocal(Boots_off);
    } else if (doff.what == C.WORN_GLOVES) {
        otmp = C.uarmg;
        if (!C.callLocal(cursed, otmp))
            C.callLocal(Gloves_off);
    } else if (doff.what == C.WORN_HELMET) {
        otmp = C.uarmh;
        if (!C.callLocal(cursed, otmp))
            C.callLocal(Helmet_off);
    } else if (doff.what == C.WORN_SHIELD) {
        otmp = C.uarms;
        if (!C.callLocal(cursed, otmp))
            C.callLocal(Shield_off);
    } else if (doff.what == C.WORN_SHIRT) {
        otmp = C.uarmu;
        if (!C.callLocal(cursed, otmp))
            C.callLocal(Shirt_off);
    } else if (doff.what == C.WORN_AMUL) {
        otmp = C.uamul;
        if (!C.callLocal(cursed, otmp))
            C.callLocal(Amulet_off);
    } else if (doff.what == C.LEFT_RING) {
        otmp = C.uleft;
        if (!C.callLocal(cursed, otmp))
            C.callLocal(Ring_off, C.uleft);
    } else if (doff.what == C.RIGHT_RING) {
        otmp = C.uright;
        if (!C.callLocal(cursed, otmp))
            C.callLocal(Ring_off, C.uright);
    } else if (doff.what == C.WORN_BLINDF) {
        if (!C.callLocal(cursed, C.ublindf))
            C.callLocal(Blindf_off, C.ublindf);
    } else {
        C.impossible("do_takeoff: taking off %lx", doff.what, C.varargs(129));
    }
    C.svc.context.takeoff.mask &= ~C.I_SPECIAL; /* clear cancel_doff() flag */

    return otmp;
}

/* occupation callback for 'A' */

export function take_off()
{
    let i;
    let otmp;
    let doff = C.addressOf(C.svc.context, "takeoff");

    if (doff.what) {
        if (doff.delay > 0) {
            doff.delay--;
            return 1; /* still busy */
        }
        if ((otmp = C.callLocal(do_takeoff)) != 0)
            C.callLocal(off_msg, otmp);
        doff.mask &= ~doff.what;
        doff.what = 0n;
    }

    for (i = 0; C.takeoff_order[i]; i++)
        if (doff.mask & C.takeoff_order[i]) {
            doff.what = C.takeoff_order[i];
            break;
        }

    otmp = 0;
    doff.delay = 0;

    if (doff.what == 0n) {
        C.You("finish %s.", doff.disrobing, C.varargs(130));
        return 0;
    } else if (doff.what == C.W_WEP) {
        doff.delay = 1;
    } else if (doff.what == C.W_SWAPWEP) {
        doff.delay = 1;
    } else if (doff.what == C.W_QUIVER) {
        doff.delay = 1;
    } else if (doff.what == C.WORN_ARMOR) {
        otmp = C.uarm;
        /* If a cloak is being worn, add the time to take it off and put
         * it back on again.  Kludge alert! since that time is 0 for all
         * known cloaks, add 1 so that it actually matters...
         */
        if (C.uarmc)
            doff.delay += 2 * C.objects[C.uarmc.otyp].oc_delay + 1;
    } else if (doff.what == C.WORN_CLOAK) {
        otmp = C.uarmc;
    } else if (doff.what == C.WORN_BOOTS) {
        otmp = C.uarmf;
    } else if (doff.what == C.WORN_GLOVES) {
        otmp = C.uarmg;
    } else if (doff.what == C.WORN_HELMET) {
        otmp = C.uarmh;
    } else if (doff.what == C.WORN_SHIELD) {
        otmp = C.uarms;
    } else if (doff.what == C.WORN_SHIRT) {
        otmp = C.uarmu;
        /* add the time to take off and put back on armor and/or cloak */
        if (C.uarm)
            doff.delay += 2 * C.objects[C.uarm.otyp].oc_delay;
        if (C.uarmc)
            doff.delay += 2 * C.objects[C.uarmc.otyp].oc_delay + 1;
    } else if (doff.what == C.WORN_AMUL) {
        doff.delay = 1;
    } else if (doff.what == C.LEFT_RING) {
        doff.delay = 1;
    } else if (doff.what == C.RIGHT_RING) {
        doff.delay = 1;
    } else if (doff.what == C.WORN_BLINDF) {
        /* [this used to be 2, but 'R' (and 'T') only require 1 turn to
           remove a blindfold, so 'A' shouldn't have been requiring 2] */
        doff.delay = 1;
    } else {
        C.impossible("take_off: taking off %lx", doff.what, C.varargs(131));
        return 0; /* force done */
    }

    if (otmp)
        doff.delay += C.objects[otmp.otyp].oc_delay;

    /* Since setting the occupation now starts the counter next move, that
     * would always produce a delay 1 too big per item unless we subtract
     * 1 here to account for it.
     */
    if (doff.delay > 0)
        doff.delay--;

    C.set_occupation(take_off, doff.disrobing, 0);
    return 1; /* get busy */
}


export function better_not_take_that_off(otmp)
{
    let corpse = C.carrying_stoning_corpse();
    const buf = C.charArray(C.BUFSZ);

    /* u_safe_from_fatal_corpse() with
       (st_corpse | st_petrifies | st_resists) instead of
       (st_corpse | st_petrifies)
       would also check for no stoning resistance before
       bothering to prompt, but losing stoning resistance
       later, without the gloves on could prove dangerous,
       so we won't factor that in */
    if (corpse
        && !C.u_safe_from_fatal_corpse(corpse, C.st_corpse | C.st_petrifies)) {
        C.Snprintf(buf, C.sizeof(buf),
            "Take off your %s despite carrying a dead %s?",
                 C.gloves_simple_name(otmp), C.obj_pmname(corpse), C.varargs(132));
        return (C.paranoid_ynq(1, buf, 0) != 121);
    }
    return 0;
}

/* clear saved context to avoid inappropriate resumption of interrupted 'A' */

export function reset_remarm()
{
    C.svc.context.takeoff.what = C.svc.context.takeoff.mask = 0n;
    C.svc.context.takeoff.disrobing[0] = 0;
}

/* the #takeoffall command -- remove multiple worn items */

export function doddoremarm()
{
    let result = 0;

    if (C.svc.context.takeoff.what || C.svc.context.takeoff.mask) {
        C.You("continue %s.", C.svc.context.takeoff.disrobing, C.varargs(133));
        C.set_occupation(take_off, C.svc.context.takeoff.disrobing, 0);
        return C.ECMD_OK;
    } else if (!C.uwep && !C.uswapwep && !C.uquiver && !C.uamul && !C.ublindf
               && !C.uleft && !C.uright && !C.wearing_armor()) {
        C.You("are not wearing anything.", C.varargs(134));
        return C.ECMD_OK;
    }

    C.add_valid_menu_class(0); /* reset */
    if (C.flags.menu_style != C.MENU_TRADITIONAL
        || (result = C.ggetobj("take off", select_off, 0, 0,
                              0)) < -1)
        C.callLocal(menu_remarm, result);

    if (C.svc.context.takeoff.mask) {
        C.strncpy(C.svc.context.takeoff.disrobing,
                       (((C.svc.context.takeoff.mask & ~C.W_WEAPONS) != 0)
                        /* default activity for armor and/or accessories,
                           possibly combined with weapons */
                        ? "disrobing"
                        /* specific activity when handling weapons only */
                        : "disarming"), C.CONTEXTVERBSZ);
        C.callLocal(take_off);
    }
    /* The time to perform the command is already completely accounted for
     * in take_off(); if we return 1, that would add an extra turn to each
     * disrobe.
     */
    return C.ECMD_OK;
}

/* #altunwield - just unwield alternate weapon, item-action '-' when picking
   uswapwep from context-sensitive inventory */

export function remarm_swapwep()
{
    const cq = C.localStruct("_cmd_queue"); let cmdq;
    let oldbknown;

    if ((cmdq = C.cmdq_pop()) != 0) {
        /* '-' uswapwep item-action picked from context-sensitive invent */
        C.copyStruct(cq, cmdq);
        C.free(cmdq);
    } else {
        cq.typ = C.CMDQ_KEY;
        cq.key = 0; /* something other than '-' */
    }
    if (cq.typ != C.CMDQ_KEY || cq.key != 45 || !C.uswapwep)
        return C.ECMD_FAIL;

    oldbknown = C.uswapwep.bknown; /* when deciding whether this command
                                   * has done something that takes time,
                                   * behave as if a cursed secondary weapon
                                   * can't be unwielded even though things
                                   * don't work that way... */
    C.callLocal(reset_remarm);
    C.svc.context.takeoff.what = C.svc.context.takeoff.mask = C.W_SWAPWEP;
    C.callLocal(do_takeoff);
    return (!C.uswapwep || C.uswapwep.bknown != oldbknown) ? C.ECMD_TIME : C.ECMD_OK;
}


export function menu_remarm(retry)
{
    let n, i = 0;
    let pick_list;
    let all_worn_categories = 1;

    if (retry) {
        all_worn_categories = (retry == -2);
    } else if (C.flags.menu_style == C.MENU_FULL) {
        all_worn_categories = 0;
        n = C.query_category("What type of things do you want to take off?",
                           C.gi.invent, (C.WORN_TYPES | C.ALL_TYPES
                                    | C.UNPAID_TYPES | C.BUCX_TYPES),
                           C.reference("menuarray", () => pick_list, value => pick_list = value), C.PICK_ANY);
        if (!n)
            return 0;
        for (i = 0; i < n; i++) {
            if (pick_list[i].item.a_int == C.ALL_TYPES_SELECTED)
                all_worn_categories = 1;
            else
                C.add_valid_menu_class(pick_list[i].item.a_int);
        }
        C.free(pick_list);
    } else if (C.flags.menu_style == C.MENU_COMBINATION) {
        let ggofeedback = 0;

        i = C.ggetobj("take off", select_off, 0, 1, C.reference("unsigned", () => ggofeedback, value => ggofeedback = value));
        if (ggofeedback & C.ALL_FINISHED)
            return 0;
        all_worn_categories = (i == -2);
    }
    if (C.menu_class_present(117)
        || C.menu_class_present(66) || C.menu_class_present(85)
        || C.menu_class_present(67) || C.menu_class_present(88))
        all_worn_categories = 0;

    n = C.query_objlist("What do you want to take off?", C.addressOf(C.gi, "invent"),
                      (C.SIGNAL_NOMENU | C.USE_INVLET | C.INVORDER_SORT),
                      C.reference("menuarray", () => pick_list, value => pick_list = value), C.PICK_ANY,
                      all_worn_categories ? C.is_worn : C.is_worn_by_type);
    if (n > 0) {
        for (i = 0; i < n; i++)
            C.callLocal(select_off, pick_list[i].item.a_obj);
        C.free(pick_list);
    } else if (n < 0 && C.flags.menu_style != C.MENU_COMBINATION) {
        C.There("is nothing else you can remove or unwield.", C.varargs(135));
    }
    return 0;
}

/* take off the specific worn object and if it still exists after that,
   destroy it (taking off the item might already destroy it by dunking
   hero into lava) */

export function wornarm_destroyed(wornarm)
{
    let invobj,nextobj;
    let wornoid = wornarm.o_id;

    /* cancel_don() resets 'afternmv' when appropriate but doesn't reset
       uarmc/uarm/&c so doing this now won't interfere with the tests in
       'if (wornarm==uarmc) ... else if (wornarm==uarm) ... else ...' */
    if (C.callLocal(donning, wornarm))
        C.callLocal(cancel_don);

    if (wornarm == C.uarmc)
        C.callLocal(Cloak_off);
    else if (wornarm == C.uarm)
        C.callLocal(Armor_off);
    else if (wornarm == C.uarmu)
        C.callLocal(Shirt_off);
    else if (wornarm == C.uarmh)
        C.callLocal(Helmet_off);
    else if (wornarm == C.uarmg)
        C.callLocal(Gloves_off);
    else if (wornarm == C.uarmf)
        C.callLocal(Boots_off);
    else if (wornarm == C.uarms)
        C.callLocal(Shield_off);

    /* 'wornarm' might be destroyed as a side-effect of xxx_off() so
       using carried() to check wornarm->where==OBJ_INVENT is not viable;
       scan invent instead; if already freed it shouldn't be possible to
       have re-used the stale memory for a new item yet but verify o_id
       just in case */
    for (invobj = C.gi.invent; invobj; invobj = nextobj) {
        nextobj = invobj.nobj;
        if (invobj == wornarm && invobj.o_id == wornoid) {
            C.useup(wornarm);
            break;
        }
    }
}

/*
 * returns impacted armor with its in_use bit set,
 * or Null. *resisted is updated to reflect whether
 * it resisted or not */

export function maybe_destroy_armor(armor, atmp, resisted)
{
    if ((armor != 0) && (!atmp || atmp == armor)
        && ((resisted.value = C.obj_resists(armor, 0, 90)) == 0)) {
        armor.in_use = 1;
        return armor;
    }
    return 0;
}

/* hit by destroy armor scroll/black dragon breath */

export function disintegrate_arm(atmp)
{
    let otmp = 0;
    let losing_gloves = 0, resisted = 0,
            resistedc = 0, resistedsuit = 0;
    /*
     * Note: if the cloak resisted, then the suit or shirt underneath
     * wouldn't be impacted either. Likewise, if the suit resisted, the
     * shirt underneath wouldn't be impacted. Since there are no artifact
     * cloaks or suits right now, this is unlikely to come into effect,
     * but it should behave appropriately if/when the situation changes.
     */

    if ((otmp = C.callLocal(maybe_destroy_armor, C.uarmc, atmp, C.reference("boolean", () => resistedc, value => resistedc = value))) != 0) {
        C.urgent_pline("Your %s crumbles and turns to dust!",
                     /* cloak/robe/apron/smock (ID'd apron)/wrapping */
                     C.cloak_simple_name(otmp), C.varargs(136));
    } else if (!resistedc
             && (otmp = C.callLocal(maybe_destroy_armor, C.uarm, atmp, C.reference("boolean", () => resistedsuit, value => resistedsuit = value))) != 0) {
        let suit = C.suit_simple_name(otmp);

        /* for gold DSM, we don't want Armor_gone() to report that it
           stops shining _after_ we've been told that it is destroyed */
        if (otmp.lamplit)
            C.end_burn(otmp, 0);
        C.urgent_pline("Your %s %s to dust and %s to the %s!",
                     /* suit might be "dragon scales" so vtense() is needed */
                     suit, C.vtense(suit, "turn"), C.vtense(suit, "fall"),
                     C.surface(C.u.ux, C.u.uy), C.varargs(137));
    } else if (!resistedc && !resistedsuit
             && (otmp = C.callLocal(maybe_destroy_armor, C.uarmu, atmp, C.reference("boolean", () => resisted, value => resisted = value))) != 0) {
        C.urgent_pline("Your %s crumbles into tiny threads and falls apart!",
                     C.shirt_simple_name(otmp), C.varargs(138)); /* always "shirt" */
    } else if ((otmp = C.callLocal(maybe_destroy_armor, C.uarmh, atmp, C.reference("boolean", () => resisted, value => resisted = value))) != 0) {
        C.urgent_pline("Your %s turns to dust and is blown away!",
                     C.helm_simple_name(otmp), C.varargs(139)); /* "helm" or "hat" */
    } else if ((otmp = C.callLocal(maybe_destroy_armor, C.uarmg, atmp, C.reference("boolean", () => resisted, value => resisted = value))) != 0) {
        C.urgent_pline("Your %s vanish!", C.gloves_simple_name(otmp), C.varargs(140));
        losing_gloves = 1;
    } else if ((otmp = C.callLocal(maybe_destroy_armor, C.uarmf, atmp, C.reference("boolean", () => resisted, value => resisted = value))) != 0) {
        C.urgent_pline("Your %s disintegrate!", C.boots_simple_name(otmp), C.varargs(141));
    } else if ((otmp = C.callLocal(maybe_destroy_armor, C.uarms, atmp, C.reference("boolean", () => resisted, value => resisted = value))) != 0) {
        C.urgent_pline("Your %s crumbles away!", C.shield_simple_name(otmp), C.varargs(142));
    } else {
        return 0; /* could not destroy anything */
    }

    /* cancel_don() if applicable, Cloak_off()/Armor_off()/&c, and useup() */
    C.callLocal(wornarm_destroyed, otmp);
    /* glove loss means wielded weapon will be touched */
    if (losing_gloves)
        C.selftouch("You");

    C.stop_occupation();
    return 1;
}

/* return ERODE_foo erosion type which can apply to object */

export function obj_erode_type(otmp)
{
    if (C.is_flammable(otmp))
        return C.ERODE_BURN;
    else if (C.is_rustprone(otmp))
        return C.ERODE_RUST;
    else if (C.is_crackable(otmp))
        return C.ERODE_CRACK;
    else if (C.is_rottable(otmp))
        return C.ERODE_ROT;
    else if (C.is_corrodeable(otmp))
        return C.ERODE_CORRODE;
    return C.ERODE_NONE;
}

/* erode a number of worn armor(s).
   if the armor is hit when max eroded, destroys it. */

export function destroy_arm()
{
    const armors = [0, 0, 0, 0, 0, 0, 0];
    let otmp;
    let i, idx = 0, hits = C.rn2(4, "destroy_arm", 3282) + 1;
    let ret = 0;

    /* gather worn armor; include non-erodeable ones */
    if (C.uarm) armors[idx++] = C.uarm;
    if (C.uarmc) armors[idx++] = C.uarmc;
    if (C.uarmh) armors[idx++] = C.uarmh;
    if (C.uarms) armors[idx++] = C.uarms;
    if (C.uarmg) armors[idx++] = C.uarmg;
    if (C.uarmf) armors[idx++] = C.uarmf;
    if (C.uarmu) armors[idx++] = C.uarmu;
    if (!idx)
        return 0;

    for (i = 0; i < hits; i++) {
        otmp = armors[C.rn2(idx, "destroy_arm", 3297)];

        if (C.erosion_matters(otmp) && C.is_damageable(otmp) && !otmp.oerodeproof) {
            let erosion = C.callLocal(obj_erode_type, otmp);

            if (erosion != C.ERODE_NONE) {
                let r = C.erode_obj(otmp, C.xname(otmp), erosion, C.EF_PAY|C.EF_DESTROY);

                if (r != C.ER_NOTHING)
                    ret = 1;
                if (r == C.ER_DESTROYED)
                    break;
            }
        }
    }

    if (ret)
        C.stop_occupation();
    return ret;
}


export function adj_abon(otmp, delta)
{
    if (C.uarmg && C.uarmg == otmp && otmp.otyp == C.GAUNTLETS_OF_DEXTERITY) {
        if (delta) {
            C.makeknown(C.uarmg.otyp);
            C.u.abon.a[C.A_DEX] += (delta);
        }
        C.disp.botl = 1;
    }
    if (C.uarmh && C.uarmh == otmp && otmp.otyp == C.HELM_OF_BRILLIANCE) {
        if (delta) {
            C.makeknown(C.uarmh.otyp);
            C.u.abon.a[C.A_INT] += (delta);
            C.u.abon.a[C.A_WIS] += (delta);
        }
        C.disp.botl = 1;
    }
}

/* decide whether a worn item is covered up by some other worn item,
   used for dipping into liquid and applying grease and takeoff_ok();
   some criteria are different than select_off()'s */
/* "dip" or "grease", or null to avoid messages *//* ignore covering unless it is known to
                                   * be cursed */
export function inaccessible_equipment(obj, verb, only_if_known_cursed)
{
    const need_to_take_off_outer_armor =
        "need to take off %s to %s %s.";
    const buf = C.charArray(C.BUFSZ);
    let anycovering = !only_if_known_cursed; /* more comprehensible... */

    if (!obj || !obj.owornmask)
        return 0; /* not inaccessible */

    /* check for suit covered by cloak */
    if (obj == C.uarm && C.uarmc && (anycovering || ((C.uarmc).cursed && (C.uarmc).bknown))) {
        if (verb) {
            C.Strcpy(buf, C.yname(C.uarmc));
            C.You(need_to_take_off_outer_armor, buf, verb, C.yname(obj), C.varargs(143));
        }
        return 1;
    }
    /* check for shirt covered by suit and/or cloak */
    if (obj == C.uarmu
        && ((C.uarm && (anycovering || ((C.uarm).cursed && (C.uarm).bknown))) || (C.uarmc && (anycovering || ((C.uarmc).cursed && (C.uarmc).bknown))))) {
        if (verb) {
            const cloaktmp = C.charArray(C.QBUFSZ);
        const suittmp = C.charArray(C.QBUFSZ);
            /* if sameprefix, use yname and xname to get "your cloak and suit"
               or "Manlobbi's cloak and suit"; otherwise, use yname and yname
               to get "your cloak and Manlobbi's suit" or vice versa */
            let sameprefix = (C.uarm && C.uarmc
                                  && !C.strcmp(C.shk_your(cloaktmp, C.uarmc),
                                             C.shk_your(suittmp, C.uarm)));

            buf[0] = 0;
            if (C.uarmc)
                C.Strcat(buf, C.yname(C.uarmc));
            if (C.uarm && C.uarmc)
                C.Strcat(buf, " and ");
            if (C.uarm)
                C.Strcat(buf, sameprefix ? C.xname(C.uarm) : C.yname(C.uarm));
            C.You(need_to_take_off_outer_armor, buf, verb, C.yname(obj), C.varargs(144));
        }
        return 1;
    }
    /* check for ring covered by gloves */
    if ((obj == C.uleft || obj == C.uright) && C.uarmg && (anycovering || ((C.uarmg).cursed && (C.uarmg).bknown))) {
        if (verb) {
            C.Strcpy(buf, C.yname(C.uarmg));
            C.You(need_to_take_off_outer_armor, buf, verb, C.yname(obj), C.varargs(145));
        }
        return 1;
    }
    /* item is not inaccessible */
    return 0;

}

/* not a getobj callback - unifies code among the other 4 getobj callbacks */

export function equip_ok(obj, removing, accessory)
{
    let is_worn;
    let dummymask = 0;

    if (!obj)
        return C.GETOBJ_EXCLUDE;

    /* ignore for putting on if already worn, or removing if not worn */
    is_worn = ((obj.owornmask & (C.W_ARMOR | C.W_ACCESSORY)) != 0);
    if (removing ^ is_worn)
        return C.GETOBJ_EXCLUDE_INACCESS;

    /* exclude most object classes outright */
    if (obj.oclass != C.ARMOR_CLASS && obj.oclass != C.RING_CLASS
        && obj.oclass != C.AMULET_CLASS) {
        /* ... except for a few wearable exceptions outside these classes */
        if (obj.otyp != C.MEAT_RING && obj.otyp != C.BLINDFOLD
            && obj.otyp != C.TOWEL && obj.otyp != C.LENSES)
            return C.GETOBJ_EXCLUDE;
    }

    /* armor with 'P' or 'R' or accessory with 'W' or 'T' */
    if (accessory ^ (obj.oclass != C.ARMOR_CLASS))
        return C.GETOBJ_DOWNPLAY;

    /* armor we can't wear, e.g. from polyform */
    if (obj.oclass == C.ARMOR_CLASS && !removing
        && !C.callLocal(canwearobj, obj, C.reference("long", () => dummymask, value => dummymask = value), 0))
        return C.GETOBJ_DOWNPLAY;

    /* Possible extension: downplay items (both accessories and armor) which
     * can't be worn because the slot is filled with something else. */

    /* removing inaccessible equipment */
    if (removing && !C.gi.item_action_in_progress) {
        if (C.callLocal(inaccessible_equipment, obj,  0,
                                   (obj.oclass == C.RING_CLASS)))
            return C.GETOBJ_EXCLUDE_INACCESS;
    }

    /* all good to go */
    return C.GETOBJ_SUGGEST;
}

/* getobj callback for P command */

export function puton_ok(obj)
{
    return C.callLocal(equip_ok, obj, 0, 1);
}

/* getobj callback for R command */

export function remove_ok(obj)
{
    return C.callLocal(equip_ok, obj, 1, 1);
}

/* getobj callback for W command */

export function wear_ok(obj)
{
    return C.callLocal(equip_ok, obj, 0, 0);
}

/* getobj callback for T command */

export function takeoff_ok(obj)
{
    return C.callLocal(equip_ok, obj, 1, 0);
}

/* getobj callback for blessed destroy armor.
   suggest any worn armor, even if covered by other armor */

export function any_worn_armor_ok(obj)
{
    if (obj && (obj.owornmask & C.W_ARMOR))
        return C.GETOBJ_SUGGEST;
    return C.GETOBJ_EXCLUDE;
}

/* number of armor pieces worn by hero */

export function count_worn_armor()
{
    let ret = 0;

    if (C.uarm) ret++;
    if (C.uarmc) ret++;
    if (C.uarmh) ret++;
    if (C.uarms) ret++;
    if (C.uarmg) ret++;
    if (C.uarmf) ret++;
    if (C.uarmu) ret++;

    return ret;
}

/*do_wear.c*/
