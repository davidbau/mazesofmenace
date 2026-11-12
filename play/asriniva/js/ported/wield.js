import { C } from '../c-runtime/context.js';

/* NetHack 5.0	wield.c	$NHDT-Date: 1707525193 2024/02/10 00:33:13 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.110 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Robert Patrick Rankin, 2009. */
/* NetHack may be freely redistributed.  See license for details. */


/* KMH -- Differences between the three weapon slots.
 *
 * The main weapon (uwep):
 * 1.  Is filled by the (w)ield command.
 * 2.  Can be filled with any type of item.
 * 3.  May be carried in one or both hands.
 * 4.  Is used as the melee weapon and as the launcher for
 *     ammunition.
 * 5.  Only conveys intrinsics when it is a weapon, weapon-tool,
 *     or artifact.
 * 6.  Certain cursed items will weld to the hand and cannot be
 *     unwielded or dropped.  See erodeable_wep() and will_weld()
 *     below for the list of which items apply.
 *
 * The secondary weapon (uswapwep):
 * 1.  Is filled by the e(x)change command, which swaps this slot
 *     with the main weapon.  If the "pushweapon" option is set,
 *     the (w)ield command will also store the old weapon in the
 *     secondary slot.
 * 2.  Can be filled with anything that will fit in the main weapon
 *     slot; that is, any type of item.
 * 3.  Is usually NOT considered to be carried in the hands.
 *     That would force too many checks among the main weapon,
 *     second weapon, shield, gloves, and rings; and it would
 *     further be complicated by bimanual weapons.  A special
 *     exception is made for two-weapon combat.
 * 4.  Is used as the second weapon for two-weapon combat, and as
 *     a convenience to swap with the main weapon.
 * 5.  Never conveys intrinsics.
 * 6.  Cursed items never weld (see #3 for reasons), but they also
 *     prevent two-weapon combat.
 *
 * The quiver (uquiver):
 * 1.  Is filled by the (Q)uiver command.
 * 2.  Can be filled with any type of item.
 * 3.  Is considered to be carried in a special part of the pack.
 * 4.  Is used as the item to throw with the (f)ire command.
 *     This is a convenience over the normal (t)hrow command.
 * 5.  Never conveys intrinsics.
 * 6.  Cursed items never weld; their effect is handled by the normal
 *     throwing code.
 * 7.  The autoquiver option will fill it with something deemed
 *     suitable if (f)ire is used when it's empty.
 *
 * No item may be in more than one of these slots.
 */


/* used by will_weld() */
/* probably should be renamed */
/*
#define erodeable_wep(optr)                             \
    ((optr)->oclass == WEAPON_CLASS || is_weptool(optr) \
     || (optr)->otyp == HEAVY_IRON_BALL || (optr)->otyp == IRON_CHAIN)
*/

/* used by welded(), and also while wielding */
/*
#define will_weld(optr) \
    ((optr)->cursed && (erodeable_wep(optr) || (optr)->otyp == TIN_OPENER))
*/

/* to dual-wield, 'obj' must be a weapon or a weapon-tool, and not a bow
   or arrow or missile (dart, shuriken, boomerang), so not matching the
   one-handed weapons which yield "you begin bashing" if used for melee;
   empty hands and two-handed weapons have to be handled separately */
/*
#define TWOWEAPOK(obj) \
    (((obj)->oclass == WEAPON_CLASS)                            \
     ? !(is_launcher(obj) || is_ammo(obj) || is_missile(obj))   \
     : is_weptool(obj))
*/

export const are_no_longer_twoweap = "are no longer using two weapons at once";
export const can_no_longer_twoweap = "can no longer wield two weapons at once";

/*** Functions that place a given item in a slot ***/
/* Proper usage includes:
 * 1.  Initializing the slot during character generation or a
 *     restore.
 * 2.  Setting the slot due to a player's actions.
 * 3.  If one of the objects in the slot is split off, these
 *     functions can be used to put the remainder back in the slot.
 * 4.  Putting an item that was thrown and returned back into the slot.
 * 5.  Emptying the slot, by passing a null object.  NEVER pass
 *     cg.zeroobj!
 *
 * If the item is being moved from another slot, it is the caller's
 * responsibility to handle that.  It's also the caller's responsibility
 * to print the appropriate messages.
 */
export function setuwep(obj)
{
    let olduwep = C.uwep;

    if (C.samePtr(obj, C.uwep))
        return; /* necessary to not set gu.unweapon */
    C.setworn(obj, C.W_WEP);
    /* handle Ogresmasher before Sunsword; even though they can't be happening
       at the same time, botl flag update should come before pline message */
    if (C.samePtr(C.uwep, obj)
        && ((C.uwep && C.uwep.oartifact == C.ART_OGRESMASHER)
            || (olduwep && olduwep.oartifact == C.ART_OGRESMASHER)))
        C.disp.botl = 1; /* gaining or losing Con bonus */
    /* This message isn't printed in the caller because it happens
     * *whenever* Sunsword is unwielded, from whatever cause. */
    if (C.samePtr(C.uwep, obj) && C.artifact_light(olduwep) && olduwep.lamplit) {
        C.end_burn(olduwep, 0);
        if (!C.Blind)
            C.pline("%s shining.", C.Tobjnam(olduwep, "stop"));
    }
    if (C.samePtr(C.uwep, obj)
        && (C.u_wield_art(C.ART_OGRESMASHER)
            || C.is_art(olduwep, C.ART_OGRESMASHER)))
        C.disp.botl = 1;
    /* Note: Explicitly wielding a pick-axe will not give a "bashing"
     * message.  Wielding one via 'a'pplying it will.
     * 3.2.2:  Wielding arbitrary objects will give bashing message too.
     */
    if (obj) {
        C.gu.unweapon = (obj.oclass == C.WEAPON_CLASS)
                       ? C.is_launcher(obj) || C.is_ammo(obj) || C.is_missile(obj)
            || (C.is_pole(obj) && !C.u.usteed && !C.is_art(obj, C.ART_SNICKERSNEE))
                       : !C.is_weptool(obj) && !C.is_wet_towel(obj);
    } else
        C.gu.unweapon = 1; /* for "bare hands" message */
}

export function cant_wield_corpse(obj)
{
    const kbuf = C.stackAlloc(C.BUFSZ);

    if (C.uarmg || obj.otyp != C.CORPSE || !C.touch_petrifies(C.mons[obj.corpsenm])
        || C.Stone_resistance)
        return 0;

    /* Prevent wielding cockatrice when not wearing gloves --KAA */
    C.You("wield %s in your bare %s.",
        C.corpse_xname(obj, 0, C.CXN_PFX_THE),
        C.makeplural(C.body_part(C.HAND)));
    C.Sprintf(kbuf, "wielding %s bare-handed", C.killer_xname(obj));
    C.instapetrify(kbuf);
    return 1;
}

/* description of hands when not wielding anything; also used
   by #seeweapon (')'), #attributes (^X), and #takeoffall ('A') */
export function empty_handed()
{
    return C.uarmg ? "empty handed" /* gloves imply hands */
           : C.humanoid(C.gy.youmonst.data)
             /* hands but no weapon and no gloves */
             ? "bare handed"
               /* alternate phrasing for paws or lack of hands */
               : "not wielding anything";
}

export function ready_weapon(wep)
{
    /* Separated function so swapping works easily */
    let res = C.ECMD_OK;
    let was_twoweap = C.u.twoweap, had_wep = (C.uwep != 0);

    if (!wep) {
        /* No weapon */
        if (C.uwep) {
            C.You("are %s.", empty_handed());
            setuwep(0);
            res = C.ECMD_TIME;
        } else
            C.You("are already %s.", empty_handed());
    } else if (wep.otyp == C.CORPSE && C.callLocal(cant_wield_corpse, wep)) {
        /* hero must have been life-saved to get here; use a turn */
        res = C.ECMD_TIME; /* corpse won't be wielded */
    } else if (C.uarms && C.bimanual(wep)) {
        C.You("cannot wield a two-handed %s while wearing a shield.",
            C.is_sword(wep) ? "sword" : wep.otyp == C.BATTLE_AXE ? "axe"
                                                              : "weapon");
        res = C.ECMD_FAIL;
    } else if (!C.retouch_object(C.objectReference(() => wep, value => { wep = value; }), 0)) {
        res = C.ECMD_TIME; /* takes a turn even though it doesn't get wielded */
    } else {
        /* Weapon WILL be wielded after this point */
        res = C.ECMD_TIME;
        if (((wep).cursed && (((wep).oclass == C.WEAPON_CLASS || C.is_weptool(wep) || (wep).otyp == C.HEAVY_IRON_BALL || (wep).otyp == C.IRON_CHAIN) || (wep).otyp == C.TIN_OPENER))) {
            let tmp = C.xname(wep), thestr = "The ";

            if (C.strncmp(tmp, thestr, 4) && !C.strncmp(C.The(tmp), thestr, 4))
                tmp = thestr;
            else
                tmp = "";
            C.pline("%s%s %s to your %s%s!", tmp, C.aobjnam(wep, "weld"),
                  (wep.quan == 1n) ? "itself" : "themselves", /* a3 */
                  C.bimanual(wep) ? "" :
                      (C.URIGHTY ? "dominant right " : "dominant left "),
                  C.bimanual(wep) ? C.makeplural(C.body_part(C.HAND))
                                : C.body_part(C.HAND));
            C.set_bknown(wep, 1);
        } else {
            /* The message must be printed before setuwep (since
             * you might die and be revived from changing weapons),
             * and the message must be before the death message and
             * Lifesaved rewielding.  Yet we want the message to
             * say "weapon in hand", thus this kludge.
             * [That comment is obsolete.  It dates from the days (3.0)
             * when unwielding Firebrand could cause hero to be burned
             * to death in Hell due to loss of fire resistance.
             * "Lifesaved re-wielding or re-wearing" is ancient history.]
             */
            let dummy = wep.owornmask;

            wep.owornmask |= C.W_WEP;
            if (wep.otyp == C.AKLYS && (wep.owornmask & C.W_WEP) != 0)
                C.You("secure the tether.");
            C.prinv(0, wep, 0n);
            wep.owornmask = dummy;
        }

        setuwep(wep);
        if (was_twoweap && !C.u.twoweap && C.flags.verbose) {
            /* skip this message if we already got "empty handed" one above;
               also, Null is not safe for neither TWOWEAPOK() or bimanual() */
            if (C.uwep)
                C.You("%s.", (((((C.uwep).oclass == C.WEAPON_CLASS) ? !(C.is_launcher(C.uwep) || C.is_ammo(C.uwep) || C.is_missile(C.uwep)) : C.is_weptool(C.uwep)) && !C.bimanual(C.uwep))
                            ? are_no_longer_twoweap
                            : can_no_longer_twoweap));
        }

        /* KMH -- Talking artifacts are finally implemented */
        if (wep.oartifact) {
            res |= C.arti_speak(wep); /* sets ECMD_TIME bit if artifact speaks */
        }

        if (C.artifact_light(wep) && !wep.lamplit) {
            C.begin_burn(wep, 0);
            if (!C.Blind)
                C.pline("%s to shine %s!", C.Tobjnam(wep, "begin"),
                      C.arti_light_description(wep));
        }
/* we'll get back to this someday, but it's not balanced yet */
/* Elves are averse to wielding cold iron */
        if (wep.unpaid) {
            let this_shkp;

            if ((this_shkp = C.shop_keeper(C.inside_shop(C.u.ux, C.u.uy)))
                != 0) {
                C.pline("%s says \"You be careful with my %s!\"",
                      C.shkname(this_shkp), C.xname(wep));
            }
        }
    }
    if ((had_wep != (C.uwep != 0)) && C.condtests[C.bl_bareh].enabled)
        C.disp.botl = 1;
    return res;
}

export function setuqwep(obj)
{
    C.setworn(obj, C.W_QUIVER);
    /* no extra handling needed; this used to include a call to
       update_inventory() but that's already performed by setworn() */
    return;
}

export function setuswapwep(obj)
{
    C.setworn(obj, C.W_SWAPWEP);
    return;
}

/* getobj callback for object to ready for throwing/shooting;
   this filter lets worn items through so that caller can reject them */
export function ready_ok(obj)
{
    if (!obj) /* '-', will empty quiver slot if chosen */
        return C.uquiver ? C.GETOBJ_SUGGEST : C.GETOBJ_DOWNPLAY;

    /* downplay when wielded, unless more than one */
    if (C.samePtr(obj, C.uwep) || (C.samePtr(obj, C.uswapwep) && C.u.twoweap))
        return (obj.quan == 1n) ? C.GETOBJ_DOWNPLAY : C.GETOBJ_SUGGEST;

    if (C.is_ammo(obj)) {
        return ((C.uwep && C.ammo_and_launcher(obj, C.uwep))
                || (C.uswapwep && C.ammo_and_launcher(obj, C.uswapwep)))
                ? C.GETOBJ_SUGGEST
                : C.GETOBJ_DOWNPLAY;
    } else if (C.is_launcher(obj)) { /* part of 'possible extension' below */
        return C.GETOBJ_DOWNPLAY;
    } else {
        if (obj.oclass == C.WEAPON_CLASS || obj.oclass == C.COIN_CLASS)
            return C.GETOBJ_SUGGEST;
        /* Possible extension: exclude weapons that make no sense to throw,
           such as whips, bows, slings, rubber hoses. */
    }

/* superseded by ammo_and_launcher handling above */
/* Include gems/stones as likely candidates if either primary
       or secondary weapon is a sling. */

    return C.GETOBJ_DOWNPLAY;
}

/* getobj callback for object to wield */
export function wield_ok(obj)
{
    if (!obj)
        return C.GETOBJ_SUGGEST;

    if (obj.oclass == C.COIN_CLASS)
        return C.GETOBJ_EXCLUDE;

    if (obj.oclass == C.WEAPON_CLASS || C.is_weptool(obj))
        return C.GETOBJ_SUGGEST;

    return C.GETOBJ_DOWNPLAY;
}

export function finish_splitting(obj)
{
    /* obj was split off from something; give it its own invlet */
    C.freeinv(obj);
    C.addinv_nomerge(obj);
}

/* the #wield command - wield a weapon */
export function dowield()
{
    const qbuf = C.stackAlloc(C.QBUFSZ);
    let wep, oldwep;
    let result;

    /* May we attempt this? */
    C.gm.multi = 0n;
    if (C.cantwield(C.gy.youmonst.data)) {
        C.pline("Don't be ridiculous!");
        return C.ECMD_FAIL;
    }
    /* Keep going even if inventory is completely empty, since wielding '-'
       to wield nothing can be construed as a positive act even when done
       so redundantly. */

    /* Prompt for a new weapon */
    C.clear_splitobjs();
    wielding: {
    already_wielded: {
    if (!(wep = C.getobj("wield", wield_ok, C.GETOBJ_PROMPT | C.GETOBJ_ALLOWCNT))) {
        /* Cancelled */
        return C.ECMD_CANCEL;
    } else if (C.samePtr(wep, C.uwep)) {
        break already_wielded;
    } else if (welded(C.uwep)) {
        weldmsg(C.uwep);
        /* previously interrupted armor removal mustn't be resumed */
        C.reset_remarm();
        /* if player chose a partial stack but can't wield it, undo split */
        if (wep.o_id && wep.o_id == C.svc.context.objsplit.child_oid)
            C.unsplitobj(wep);
        return C.ECMD_FAIL;
    } else if (wep.o_id && wep.o_id == C.svc.context.objsplit.child_oid) {
        /* if wep is the result of supplying a count to getobj()
           we don't want to split something already wielded; for
           any other item, we need to give it its own inventory slot */
        if (C.uwep && C.uwep.o_id == C.svc.context.objsplit.parent_oid) {
            C.unsplitobj(wep);
            /* wep was merged back to uwep, already_wielded uses wep */
            wep = C.uwep;
            break already_wielded;
        }
        finish_splitting(wep);
        break wielding;
    }

    /* Handle no object, or object in other slot */
    if (C.samePtr(wep, C.hands_obj)) {
        wep = 0;
    } else if (C.samePtr(wep, C.uswapwep)) {
        return C.callLocal(doswapweapon);
    } else if (C.samePtr(wep, C.uquiver)) {
        /* offer to split stack if multiple are quivered */
        if (C.uquiver.quan > 1n && C.inv_cnt(0) < C.invlet_basic
                                    && C.splittable(C.uquiver)) {
            C.Sprintf(qbuf, "You have %ld %s readied.  Wield one?",
                    C.uquiver.quan, C.simpleonames(C.uquiver));
            switch (C.ynq(qbuf)) {
            case 'q'.charCodeAt(0):
                return C.ECMD_OK;
            case 'y'.charCodeAt(0):
                /* leave N-1 quivered, split off 1 to wield */
                wep = C.splitobj(C.uquiver, 1n);
                finish_splitting(wep);
                break wielding;
            default:
                break;
            }
            C.Strcpy(qbuf, "Wield all of them instead?");
        } else {
            let use_plural = (C.is_plural(C.uquiver) || C.pair_of(C.uquiver));

            C.Sprintf(qbuf, "You have %s readied.  Wield %s instead?",
                    !use_plural ? "that" : "those",
                    !use_plural ? "it" : "them");
        }
        /* require confirmation to wield the quivered weapon */
        if (C.ynq(qbuf) != 'y'.charCodeAt(0)) {
            C.Shk_Your(qbuf, C.uquiver); /* replace qbuf[] contents */
            C.pline("%s%s %s readied.", qbuf,
                  C.simpleonames(C.uquiver), C.otense(C.uquiver, "remain"));
            return C.ECMD_OK;
        }
        /* wielding whole readied stack, so no longer quivered */
        setuqwep(0);
    } else if (wep.owornmask & (C.W_ARMOR | C.W_ACCESSORY | C.W_SADDLE)) {
        C.You("cannot wield that!");
        return C.ECMD_FAIL;
    }

    break wielding;
    }
        C.You("are already wielding that!");
        if (C.is_weptool(wep) || C.is_wet_towel(wep))
            C.gu.unweapon = 0; /* [see setuwep()] */
        return C.ECMD_FAIL;
    }
    /* Set your new primary weapon */
    oldwep = C.uwep;
    result = C.callLocal(ready_weapon, wep);
    if (C.flags.pushweapon && oldwep && !C.samePtr(C.uwep, oldwep))
        setuswapwep(oldwep);
    untwoweapon();

    return result;
}

/* the #swap command - swap wielded and secondary weapons */
export function doswapweapon()
{
    let oldwep, oldswap;
    let result = 0;

    /* May we attempt this? */
    C.gm.multi = 0n;
    if (C.cantwield(C.gy.youmonst.data)) {
        C.pline("Don't be ridiculous!");
        return C.ECMD_FAIL;
    }
    if (welded(C.uwep)) {
        weldmsg(C.uwep);
        return C.ECMD_FAIL;
    }

    /* Unwield your current secondary weapon */
    oldwep = C.uwep;
    oldswap = C.uswapwep;
    setuswapwep(0);

    /* Set your new primary weapon */
    result = C.callLocal(ready_weapon, oldswap);

    /* Set your new secondary weapon */
    if (C.samePtr(C.uwep, oldwep)) {
        /* Wield failed for some reason */
        setuswapwep(oldswap);
    } else {
        setuswapwep(oldwep);
        if (C.uswapwep)
            C.prinv(0, C.uswapwep, 0n);
        else
            C.You("have no secondary weapon readied.");
    }

    if (C.u.twoweap && !can_twoweapon())
        untwoweapon();

    return result;
}

/* the #quiver command */
export function dowieldquiver()
{
    return C.callLocal(doquiver_core, "ready");
}

/* guts of #quiver command; also used by #fire when refilling empty quiver */
export function doquiver_core(verb)
/* "ready" or "fire" */
{
    const qbuf = C.stackAlloc(C.QBUFSZ);
    let newquiver;
    let res;
    let was_uwep = 0, was_twoweap = C.u.twoweap;

    /* Since the quiver isn't in your hands, don't check cantwield(),
       will_weld(), touch_petrifies(), etc. */
    C.gm.multi = 0n;
    if (!C.gi.invent) {
        /* could accept '-' to empty quiver, but there's no point since
           inventory is empty so uquiver is already Null */
        C.You("have nothing to ready for firing.");
        return C.ECMD_OK;
    }

    /* forget last splitobj() before calling getobj() with GETOBJ_ALLOWCNT */
    C.clear_splitobjs();
    /* Prompt for a new quiver: "What do you want to {ready|fire}?" */
    newquiver = C.getobj(verb, ready_ok, C.GETOBJ_PROMPT | C.GETOBJ_ALLOWCNT);

    quivering: {
    already_quivered: {
    if (!newquiver) {
        /* Cancelled */
        return C.ECMD_CANCEL;
    } else if (C.samePtr(newquiver, C.hands_obj)) { /* no object */
        /* Explicitly nothing */
        if (C.uquiver) {
            C.You("now have no ammunition readied.");
            /* skip 'quivering: prinv()' */
            setuqwep(0);
        } else {
            C.You("already have no ammunition readied!");
        }
        return C.ECMD_OK;
    } else if (newquiver.o_id == C.svc.context.objsplit.child_oid) {
        /* if newquiver is the result of supplying a count to getobj()
           we don't want to split something already in the quiver;
           for any other item, we need to give it its own inventory slot */
        if (C.uquiver && C.uquiver.o_id == C.svc.context.objsplit.parent_oid) {
            C.unsplitobj(newquiver);
            break already_quivered;
        } else if (newquiver.oclass == C.COIN_CLASS) {
            /* don't allow splitting a stack of coins into quiver */
            C.You("can't ready only part of your gold.");
            C.unsplitobj(newquiver);
            return C.ECMD_OK;
        }
        finish_splitting(newquiver);
    } else if (C.samePtr(newquiver, C.uquiver)) {
        break already_quivered;
    } else if (newquiver.owornmask & (C.W_ARMOR | C.W_ACCESSORY | C.W_SADDLE)) {
        C.You("cannot %s that!", verb);
        return C.ECMD_OK;
    } else if (C.samePtr(newquiver, C.uwep)) {
        let weld_res = !C.uwep.bknown;

        if (welded(C.uwep)) {
            weldmsg(C.uwep);
            C.reset_remarm(); /* same as dowield() */
            return weld_res ? C.ECMD_TIME : C.ECMD_OK;
        }
        /* offer to split stack if wielding more than 1 */
        if (C.uwep.quan > 1n && C.inv_cnt(0) < C.invlet_basic
                                    && C.splittable(C.uwep)) {
            C.Sprintf(qbuf, "You are wielding %ld %s.  Ready %ld of them?",
                    C.uwep.quan, C.simpleonames(C.uwep), C.long(C.uwep.quan - 1n));
            switch (C.ynq(qbuf)) {
            case 'q'.charCodeAt(0):
                return C.ECMD_OK;
            case 'y'.charCodeAt(0):
                /* leave 1 wielded, split rest off and put into quiver */
                newquiver = C.splitobj(C.uwep, C.long(C.uwep.quan - 1n));
                finish_splitting(newquiver);
                break quivering;
            default:
                break;
            }
            C.Strcpy(qbuf, "Ready all of them instead?");
        } else {
            let use_plural = (C.is_plural(C.uwep) || C.pair_of(C.uwep));

            C.Sprintf(qbuf, "You are wielding %s.  Ready %s instead?",
                    !use_plural ? "that" : "those",
                    !use_plural ? "it" : "them");
        }
        /* require confirmation to ready the main weapon */
        if (C.ynq(qbuf) != 'y'.charCodeAt(0)) {
            C.Shk_Your(qbuf, C.uwep); /* replace qbuf[] contents */
            C.pline("%s%s %s wielded.", qbuf,
                  C.simpleonames(C.uwep), C.otense(C.uwep, "remain"));
            return C.ECMD_OK;
        }
        /* quivering main weapon, so no longer wielding it */
        setuwep(0);
        untwoweapon();
        was_uwep = 1;
    } else if (C.samePtr(newquiver, C.uswapwep)) {
        if (C.uswapwep.quan > 1n && C.inv_cnt(0) < C.invlet_basic
            && C.splittable(C.uswapwep)) {
            C.Sprintf(qbuf, "%s %ld %s.  Ready %ld of them?",
                    C.u.twoweap ? "You are dual wielding"
                              : "Your alternate weapon is",
                    C.uswapwep.quan, C.simpleonames(C.uswapwep),
                    C.long(C.uswapwep.quan - 1n));
            switch (C.ynq(qbuf)) {
            case 'q'.charCodeAt(0):
                return C.ECMD_OK;
            case 'y'.charCodeAt(0):
                /* leave 1 alt-wielded, split rest off and put into quiver */
                newquiver = C.splitobj(C.uswapwep, C.long(C.uswapwep.quan - 1n));
                finish_splitting(newquiver);
                break quivering;
            default:
                break;
            }
            C.Strcpy(qbuf, "Ready all of them instead?");
        } else {
            let use_plural = (C.is_plural(C.uswapwep) || C.pair_of(C.uswapwep));

            C.Sprintf(qbuf, "%s your %s weapon.  Ready %s instead?",
                    !use_plural ? "That is" : "Those are",
                    C.u.twoweap ? "second" : "alternate",
                    !use_plural ? "it" : "them");
        }
        /* require confirmation to ready the alternate weapon */
        if (C.ynq(qbuf) != 'y'.charCodeAt(0)) {
            C.Shk_Your(qbuf, C.uswapwep); /* replace qbuf[] contents */
            C.pline("%s%s %s %s.", qbuf,
                  C.simpleonames(C.uswapwep), C.otense(C.uswapwep, "remain"),
                  C.u.twoweap ? "wielded" : "as secondary weapon");
            return C.ECMD_OK;
        }
        /* quivering alternate weapon, so no more uswapwep */
        setuswapwep(0);
        untwoweapon();
    }

    break quivering;
    }
        C.pline("That ammunition is already readied!");
        return C.ECMD_OK;
    }
    if (!C.strcmp(verb, "ready")) {
        /* place item in quiver before printing so that inventory feedback
           includes "(at the ready)" */
        setuqwep(newquiver);
        C.prinv(0, newquiver, 0n);
    } else { /* verb=="fire", manually refilling quiver during 'f'ire */
        /* prefix item with description of action, so don't want that to
           include "(at the ready)" */
        C.prinv("You ready:", newquiver, 0n);
        setuqwep(newquiver);
    }

    /* quiver is a convenience slot and manipulating it ordinarily
       consumes no time, but unwielding primary or secondary weapon
       should take time (perhaps we're adjacent to a rust monster
       or disenchanter and want to hit it immediately, but not with
       something we're wielding that's vulnerable to its damage) */
    res = 0;
    if (was_uwep) {
        C.You("are now %s.", empty_handed());
        res = 1;
    } else if (was_twoweap && !C.u.twoweap) {
        C.You("%s.", are_no_longer_twoweap);
        res = 1;
    }
    return res ? C.ECMD_TIME : C.ECMD_OK;
}

/* used for #rub and for applying pick-axe, whip, grappling hook or polearm */
export function wield_tool(obj, verb)
/* "rub",&c */
{
    let what;
    let more_than_1;

    if (C.uwep && C.samePtr(obj, C.uwep))
        return 1; /* nothing to do if already wielding it */

    if (!verb)
        verb = "wield";
    what = C.xname(obj);
    more_than_1 = (obj.quan > 1n || C.strstri(what, "pair of ") != 0
                   || C.strstri(what, "s of ") != 0);

    if (obj.owornmask & (C.W_ARMOR | C.W_ACCESSORY)) {
        C.You_cant("%s %s while wearing %s.", verb, C.yname(obj),
                 more_than_1 ? "them" : "it");
        return 0;
    }
    if (C.uwep && welded(C.uwep)) {
        if (C.flags.verbose) {
            let hand = C.body_part(C.HAND);

            if (C.bimanual(C.uwep))
                hand = C.makeplural(hand);
            if (C.strstri(what, "pair of ") != 0)
                more_than_1 = 0;
            C.pline(
               "Since your weapon is welded to your %s, you cannot %s %s %s.",
                  hand, verb, more_than_1 ? "those" : "that", C.xname(obj));
        } else {
            C.You_cant("do that.");
        }
        return 0;
    }
    if (C.cantwield(C.gy.youmonst.data)) {
        C.You_cant("hold %s strongly enough.", more_than_1 ? "them" : "it");
        return 0;
    }
    /* check shield */
    if (C.uarms && C.bimanual(obj)) {
        C.You("cannot %s a two-handed %s while wearing a shield.", verb,
            (obj.oclass == C.WEAPON_CLASS) ? "weapon" : "tool");
        return 0;
    }

    if (C.samePtr(C.uquiver, obj))
        setuqwep(0);
    if (C.samePtr(C.uswapwep, obj)) {
        C.callLocal(doswapweapon);
        /* doswapweapon might fail */
        if (C.samePtr(C.uswapwep, obj))
            return 0;
    } else {
        let oldwep = C.uwep;

        if (((obj).cursed && (((obj).oclass == C.WEAPON_CLASS || C.is_weptool(obj) || (obj).otyp == C.HEAVY_IRON_BALL || (obj).otyp == C.IRON_CHAIN) || (obj).otyp == C.TIN_OPENER))) {
            /* hope none of ready_weapon()'s early returns apply here... */
            C.callLocal(ready_weapon, obj);
        } else {
            C.You("now wield %s.", C.doname(obj));
            setuwep(obj);
        }
        if (C.flags.pushweapon && oldwep && !C.samePtr(C.uwep, oldwep))
            setuswapwep(oldwep);
    }
    if (C.uwep && !C.samePtr(C.uwep, obj))
        return 0; /* rewielded old object after dying */
    /* applying weapon or tool that gets wielded ends two-weapon combat */
    if (C.u.twoweap)
        untwoweapon();
    if (obj.oclass != C.WEAPON_CLASS)
        C.gu.unweapon = 1;
    return 1;
}

export function can_twoweapon()
{
    let otmp;

    if (!C.could_twoweap(C.gy.youmonst.data)) {
        if (C.Upolyd)
            C.You_cant("use two weapons in your current form.");
        else
            C.pline("%s aren't able to use two weapons at once.",
                  C.makeplural((C.flags.female && C.gu.urole.name.f)
                             ? C.gu.urole.name.f : C.gu.urole.name.m));
    } else if (!C.uwep || !C.uswapwep) {
        let hand_s = C.body_part(C.HAND);

        if (!C.uwep && !C.uswapwep)
            hand_s = C.makeplural(hand_s);
        /* "your hands are empty" or "your {left|right} hand is empty" */
        C.Your("%s%s %s empty.", C.uwep ? "left " : C.uswapwep ? "right " : "",
             hand_s, C.vtense(hand_s, "are"));
    } else if (!(((C.uwep).oclass == C.WEAPON_CLASS) ? !(C.is_launcher(C.uwep) || C.is_ammo(C.uwep) || C.is_missile(C.uwep)) : C.is_weptool(C.uwep)) || !(((C.uswapwep).oclass == C.WEAPON_CLASS) ? !(C.is_launcher(C.uswapwep) || C.is_ammo(C.uswapwep) || C.is_missile(C.uswapwep)) : C.is_weptool(C.uswapwep))) {
        otmp = !(((C.uwep).oclass == C.WEAPON_CLASS) ? !(C.is_launcher(C.uwep) || C.is_ammo(C.uwep) || C.is_missile(C.uwep)) : C.is_weptool(C.uwep)) ? C.uwep : C.uswapwep;
        C.pline("%s %s suitable %s weapon%s.", C.Yname2(otmp),
              C.is_plural(otmp) ? "aren't" : "isn't a",
              (C.samePtr(otmp, C.uwep)) ? "primary" : "secondary",
              C.plur(otmp.quan));
    } else if (C.bimanual(C.uwep) || C.bimanual(C.uswapwep)) {
        otmp = C.bimanual(C.uwep) ? C.uwep : C.uswapwep;
        C.pline("%s isn't one-handed.", C.Yname2(otmp));
    } else if (C.uarms) {
        C.You_cant("use two weapons while wearing a shield.");
    } else if (C.uswapwep.oartifact) {
        C.pline("%s being held second to another weapon!",
              C.Yobjnam2(C.uswapwep, "resist"));
    } else if (C.uswapwep.otyp == C.CORPSE && C.callLocal(cant_wield_corpse, C.uswapwep)) {
        /* [Note: !TWOWEAPOK() check prevents ever getting here...] */
        ; /* must be life-saved to reach here; return FALSE */
    } else if (C.Glib || C.uswapwep.cursed) {
        if (!C.Glib)
            C.set_bknown(C.uswapwep, 1);
        C.callLocal(drop_uswapwep);
    } else
        return 1;
    return 0;
}

/* uswapwep has become cursed while in two-weapon combat mode or hero is
   attempting to dual-wield when it is already cursed or hands are slippery */
export function drop_uswapwep()
{
    const left_hand = C.stackAlloc(C.QBUFSZ);
    let obj = C.uswapwep;

    /* this used to use makeplural(body_part(HAND)) but in order to be
       dual-wielded, or to get this far attempting to achieve that,
       uswapwep must be one-handed; since it's secondary, the hand must
       be the left one */
    C.Sprintf(left_hand, "left %s", C.body_part(C.HAND));
    if (!obj.cursed)
        /* attempting to two-weapon while Glib */
        C.pline("%s from your %s!", C.Yobjnam2(obj, "slip"), left_hand);
    else if (!C.u.twoweap)
        /* attempting to two-weapon when uswapwep is cursed */
        C.pline("%s your grasp and %s from your %s!",
              C.Yobjnam2(obj, "evade"), C.otense(obj, "drop"), left_hand);
    else
        /* already two-weaponing but can't anymore because uswapwep has
           become cursed */
        C.Your("%s spasms and drops %s!", left_hand, C.yobjnam(obj, 0));
    C.dropx(obj);
}

export function set_twoweap(on_off)
{
    on_off = C.boolean(on_off);
    if (on_off != C.u.twoweap) {
        C.u.twoweap = on_off;
        if (C.flags.weaponstatus)
            C.disp.botl = 1;
    }
}

/* the #twoweapon command */
export function dotwoweapon()
{
    /* You can always toggle it off */
    if (C.u.twoweap) {
        C.You("switch to your primary weapon.");
        set_twoweap(0); /* u.twoweap = FALSE */
        C.update_inventory();
        return C.ECMD_OK;
    }

    /* May we use two weapons? */
    if (can_twoweapon()) {
        /* Success! */
        C.You("begin two-weapon combat.");
        set_twoweap(1); /* u.twoweap = TRUE */
        C.update_inventory();
        return (C.rnd(20, 861, 'dotwoweapon') > C.ACURR(C.A_DEX)) ? C.ECMD_TIME : C.ECMD_OK;
    }
    return C.ECMD_OK;
}

/*** Functions to empty a given slot ***/
/* These should be used only when the item can't be put back in
 * the slot by life saving.  Proper usage includes:
 * 1.  The item has been eaten, stolen, burned away, or rotted away.
 * 2.  Making an item disappear for a bones pile.
 */
export function uwepgone()
{
    if (C.uwep) {
        if (C.artifact_light(C.uwep) && C.uwep.lamplit) {
            C.end_burn(C.uwep, 0);
            if (!C.Blind)
                C.pline("%s shining.", C.Tobjnam(C.uwep, "stop"));
        }
        C.setworn(0, C.W_WEP);
        C.gu.unweapon = 1;
        C.update_inventory();
    }
}

export function uswapwepgone()
{
    if (C.uswapwep) {
        C.setworn(0, C.W_SWAPWEP);
        C.update_inventory();
    }
}

export function uqwepgone()
{
    if (C.uquiver) {
        C.setworn(0, C.W_QUIVER);
        C.update_inventory();
    }
}

export function untwoweapon()
{
    if (C.u.twoweap) {
        C.You("%s.", can_no_longer_twoweap);
        set_twoweap(0); /* u.twoweap = FALSE */
        C.update_inventory();
    }
    return;
}

/* enchant wielded weapon */
export function chwepon(otmp, amount)
{
    amount = C.int(amount);
    let color = C.hcolor((amount < 0) ? C.NH_BLACK : C.NH_BLUE);
    let xtime, wepname = "";
    let multiple;
    let otyp = C.STRANGE_OBJECT;

    if (!C.uwep || (C.uwep.oclass != C.WEAPON_CLASS && !C.is_weptool(C.uwep))) {
        const buf = C.stackAlloc(C.BUFSZ);

        if (amount >= 0 && C.uwep && ((C.uwep).cursed && (((C.uwep).oclass == C.WEAPON_CLASS || C.is_weptool(C.uwep) || (C.uwep).otyp == C.HEAVY_IRON_BALL || (C.uwep).otyp == C.IRON_CHAIN) || (C.uwep).otyp == C.TIN_OPENER))) { /* cursed tin opener */
            if (!C.Blind) {
                C.Sprintf(buf, "%s with %s aura.",
                        C.Yobjnam2(C.uwep, "glow"), C.an(C.hcolor(C.NH_AMBER)));
                C.uwep.bknown = !C.Hallucination; /* ok to bypass set_bknown() */
            } else {
                /* cursed tin opener is wielded in right hand */
                C.Sprintf(buf, "Your right %s tingles.", C.body_part(C.HAND));
            }
            C.uncurse(C.uwep);
            C.update_inventory();
        } else {
            C.Sprintf(buf, "Your %s %s.", C.makeplural(C.body_part(C.HAND)),
                    (amount >= 0) ? "twitch" : "itch");
        }
        C.strange_feeling(otmp, buf); /* pline()+docall()+useup() */
        C.exercise(C.A_DEX, (amount >= 0));
        return 0;
    }

    if (otmp && otmp.oclass == C.SCROLL_CLASS)
        otyp = otmp.otyp;

    if (C.uwep.otyp == C.WORM_TOOTH && amount >= 0) {
        multiple = (C.uwep.quan > 1n);
        /* order: message, transformation, shop handling */
        C.Your("%s %s much sharper now.", C.simpleonames(C.uwep),
             multiple ? "fuse, and become" : "is");
        C.uwep.otyp = C.CRYSKNIFE;
        C.uwep.oerodeproof = 0;
        if (multiple) {
            C.uwep.quan = 1n;
            C.uwep.owt = C.weight(C.uwep);
        }
        if (C.uwep.cursed)
            C.uncurse(C.uwep);
        /* update shop bill to reflect new higher value */
        if (C.uwep.unpaid)
            C.alter_cost(C.uwep, 0n);
        if (otyp != C.STRANGE_OBJECT)
            C.makeknown(otyp);
        if (multiple)
            C.encumber_msg();
        return 1;
    } else if (C.uwep.otyp == C.CRYSKNIFE && amount < 0) {
        multiple = (C.uwep.quan > 1n);
        /* order matters: message, shop handling, transformation */
        C.Your("%s %s much duller now.", C.simpleonames(C.uwep),
             multiple ? "fuse, and become" : "is");
        C.costly_alteration(C.uwep, C.COST_DEGRD); /* DECHNT? other? */
        C.uwep.otyp = C.WORM_TOOTH;
        C.uwep.oerodeproof = 0;
        if (multiple) {
            C.uwep.quan = 1n;
            C.uwep.owt = C.weight(C.uwep);
        }
        if (otyp != C.STRANGE_OBJECT && otmp.bknown)
            C.makeknown(otyp);
        if (multiple)
            C.encumber_msg();
        return 1;
    }

    if (C.has_oname(C.uwep))
        wepname = C.ONAME(C.uwep);
    if (amount < 0 && C.uwep.oartifact && C.restrict_name(C.uwep, wepname)) {
        if (!C.Blind)
            C.pline("%s %s.", C.Yobjnam2(C.uwep, "faintly glow"), color);
        return 1;
    }
    /* there is a (soft) upper and lower limit to uwep->spe */
    if (((C.uwep.spe > 5 && amount >= 0) || (C.uwep.spe < -5 && amount < 0))
        && C.rn2(3, 1000, 'chwepon')) {
        if (!C.Blind)
            C.pline("%s %s for a while and then %s.",
                  C.Yobjnam2(C.uwep, "violently glow"), color,
                  C.otense(C.uwep, "evaporate"));
        else
            C.pline("%s.", C.Yobjnam2(C.uwep, "evaporate"));

        C.useupall(C.uwep); /* let all of them disappear */
        return 1;
    }
    if (!C.Blind) {
        xtime = (C.int(amount * amount) == 1) ? "moment" : "while";
        C.pline("%s %s for a %s.",
              C.Yobjnam2(C.uwep, amount == 0 ? "violently glow" : "glow"), color,
              xtime);
        if (otyp != C.STRANGE_OBJECT && C.uwep.known
            && (amount > 0 || (amount < 0 && otmp.bknown)))
            C.makeknown(otyp);
    }
    if (amount < 0)
        C.costly_alteration(C.uwep, C.COST_DECHNT);
    C.uwep.spe += amount;
    if (amount > 0) {
        if (C.uwep.cursed)
            C.uncurse(C.uwep);
        /* update shop bill to reflect new higher price */
        if (C.uwep.unpaid)
            C.alter_cost(C.uwep, 0n);
    }

    /*
     * Enchantment, which normally improves a weapon, has an
     * additional adverse reaction on Magicbane whose effects are
     * spe dependent.  Give an obscure clue here.
     */
    if (C.u_wield_art(C.ART_MAGICBANE) && C.uwep.spe >= 0) {
        C.Your("right %s %sches!", C.body_part(C.HAND),
             (((amount > 1) && (C.uwep.spe > 1)) ? "flin" : "it"));
    }

    /* an elven magic clue, cookie@keebler */
    /* elven weapons vibrate warningly when enchanted beyond a limit */
    if ((C.uwep.spe > 5)
        && (C.is_elven_weapon(C.uwep) || C.uwep.oartifact || !C.rn2(7, 1044, 'chwepon')))
        C.pline("%s unexpectedly.", C.Yobjnam2(C.uwep, "suddenly vibrate"));

    return 1;
}

export function welded(obj)
{
    if (obj && C.samePtr(obj, C.uwep) && ((obj).cursed && (((obj).oclass == C.WEAPON_CLASS || C.is_weptool(obj) || (obj).otyp == C.HEAVY_IRON_BALL || (obj).otyp == C.IRON_CHAIN) || (obj).otyp == C.TIN_OPENER))) {
        C.set_bknown(obj, 1);
        return 1;
    }
    return 0;
}

export function weldmsg(obj)
{
    let savewornmask;
    let hand = C.body_part(C.HAND);

    if (C.bimanual(obj))
        hand = C.makeplural(hand);
    savewornmask = obj.owornmask;
    obj.owornmask = 0n; /* suppress doname()'s "(weapon in hand)";
                          * Yobjnam2() doesn't actually need this because
                          * it is based on xname() rather than doname() */
    C.pline("%s welded to your %s!", C.Yobjnam2(obj, "are"), hand);
    obj.owornmask = savewornmask;
}

/* test whether monster's wielded weapon is stuck to hand/paw/whatever */
export function mwelded(obj)
{
    /* caller is responsible for making sure this is a monster's item */
    if (obj && (obj.owornmask & C.W_WEP) && ((obj).cursed && (((obj).oclass == C.WEAPON_CLASS || C.is_weptool(obj) || (obj).otyp == C.HEAVY_IRON_BALL || (obj).otyp == C.IRON_CHAIN) || (obj).otyp == C.TIN_OPENER)))
        return 1;
    return 0;
}

/*wield.c*/
