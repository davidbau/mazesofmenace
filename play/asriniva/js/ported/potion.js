import {C} from '../c-runtime/context.js';

/* NetHack 5.0	potion.c	$NHDT-Date: 1770949988 2026/02/12 18:33:08 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.279 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Robert Patrick Rankin, 2013. */
/* NetHack may be freely redistributed.  See license for details. */


/* used to indicate whether quaff or dip has skipped an opportunity to
   use a fountain or such, in order to vary the feedback if hero lacks
   any potions [reinitialized every time it's used so does not need to
   be placed in struct instance_globals gd] */
export const drink_ok_extra_initial = 0;

/* force `val' to be within valid range for intrinsic timeout value */
export function itimeout(val)

{
    val = C.long(C.long(val));
    if ((C.long(val) >= C.long(C.TIMEOUT)))
        val = C.long(C.TIMEOUT);
    else if ((C.long(val) < C.long(1n)))
        val = C.long(0n);

    return C.long(val);
}

/* increment `old' by `incr' and force result to be valid intrinsic timeout */
export function itimeout_incr(old, incr)

{
    old = C.long(C.long(old)); incr = C.int(C.int(incr));
    return C.long(itimeout(C.long((C.long(C.long((C.long(old) & C.long(C.TIMEOUT)))) + C.long(C.long(incr))))));
}

/* set the timeout field of intrinsic `which' */
export function set_itimeout(which, val)

{
    val = C.long(C.long(val));
    which.value &= ~C.TIMEOUT;
    which.value |= itimeout(val);
}

/* increment the timeout field of intrinsic `which' */
export function incr_itimeout(which, incr)

{
    incr = C.int(C.int(incr));
    set_itimeout(which, itimeout_incr(which.value, incr));
}

export function make_confused(xtime, talk)

{
    xtime = C.long(C.long(xtime)); talk = C.int(C.boolean(talk));
    let old = C.long(C.HConfusion);

    if (C.Unaware)
        talk = C.int(0);

    if (((!xtime && old) ? 1 : 0)) {
        if (talk)
            C.You_feel("less %s now.", C.Hallucination ? "trippy" : "confused");
    }
    if (((((xtime && !old) ? 1 : 0) || ((!xtime && old) ? 1 : 0)) ? 1 : 0))
        C.disp.botl = C.int(1);

    set_itimeout(C.propertyReference("HConfusion"), xtime);
}

export function make_stunned(xtime, talk)

{
    xtime = C.long(C.long(xtime)); talk = C.int(C.boolean(talk));
    let old = C.long(C.HStun);

    if (C.Unaware)
        talk = C.int(0);

    if (((!xtime && old) ? 1 : 0)) {
        if (talk)
            C.You_feel("%s now.",
                     C.Hallucination ? "less wobbly" : "a bit steadier");
    }
    if (((xtime && !old) ? 1 : 0)) {
        if (talk) {
            if (C.u.usteed)
                C.You("wobble in the saddle.");
            else
                C.You("%s...", C.stagger(C.gy.youmonst.data, "stagger"));
        }
    }
    if (((((!xtime && old) ? 1 : 0) || ((xtime && !old) ? 1 : 0)) ? 1 : 0))
        C.disp.botl = C.int(1);

    set_itimeout(C.propertyReference("HStun"), xtime);
}

/* Sick is overloaded with both fatal illness and food poisoning (via
   u.usick_type bit mask), but delayed killer can only support one or
   the other at a time.  They should become separate intrinsics.... */
export function make_sick(xtime,
          cause, /* sickness cause */
          talk,
          type)

{
    xtime = C.long(C.long(xtime)); talk = C.int(C.boolean(talk)); type = C.int(C.int(type));
    let kptr;
    let old = C.long(C.Sick);

/* tell player even if hero is unconscious */

    if ((C.long(xtime) > C.long(0n))) {
        if (C.Sick_resistance)
            return;
        if (!old) {
            /* newly sick */
            C.You_feel("deathly sick.");
        } else {
            /* already sick */
            if (talk)
                C.You_feel("%s worse.", (C.long(xtime) <= C.long(C.long((C.long(C.Sick) / C.long(2n))))) ? "much" : "even");
        }
        set_itimeout(C.propertyReference("Sick"), xtime);
        C.u.usick_type |= type;
        C.disp.botl = C.int(1);
    } else if (((old && (type & C.u.usick_type)) ? 1 : 0)) {
        /* was sick, now not */
        C.u.usick_type &= ~type;
        if (C.u.usick_type) { /* only partly cured */
            if (talk)
                C.You_feel("somewhat better.");
            set_itimeout(C.propertyReference("Sick"), C.long((C.long(C.Sick) * C.long(2)))); /* approximation */
        } else {
            if (talk)
                C.You_feel("cured.  What a relief!");
            C.Sick = C.long(0n); /* set_itimeout(&Sick, 0L) */
        }
        C.disp.botl = C.int(1);
    }

    kptr = C.find_delayed_killer(C.SICK);
    if (C.Sick) {
        C.exercise(C.A_CON, 0);
        /* setting delayed_killer used to be unconditional, but that's
           not right when make_sick(0) is called to cure food poisoning
           if hero was also fatally ill; this is only approximate */
        if (((((xtime || !old) ? 1 : 0) || !kptr) ? 1 : 0)) {
            let kpfx = (C.int((((cause && !C.strcmp(cause, "#wizintrinsic")) ? 1 : 0))
                        ? C.KILLED_BY : C.KILLED_BY_AN));

            C.delayed_killer(C.SICK, kpfx, cause);
        }
    } else
        C.dealloc_killer(kptr);
}

export function make_slimed(xtime, msg)

{
    xtime = C.long(C.long(xtime));
    let old = C.long(C.Slimed);

/* tell player even if hero is unconscious */

    set_itimeout(C.propertyReference("Slimed"), xtime);
    if (C.int(((C.long(xtime) != C.long(0n))) ^ ((C.long(old) != C.long(0n))))) {
        C.disp.botl = C.int(1);
        if (msg)
            C.pline("%s", msg);
    }
    if (!C.Slimed) {
        C.dealloc_killer(C.find_delayed_killer(C.SLIMED));
        /* fake appearance is set late in turn-to-slime countdown */
        if ((((C.U_AP_TYPE == C.M_AP_MONSTER) && (C.gy.youmonst.mappearance == C.PM_GREEN_SLIME)) ? 1 : 0)) {
            C.gy.youmonst.m_ap_type = C.int(C.M_AP_NOTHING);
            C.gy.youmonst.mappearance = C.uint(0);
        }
    }
}

/* start or stop petrification */
export function make_stoned(xtime, msg, killedby, killername)

{
    xtime = C.long(C.long(xtime)); killedby = C.int(C.int(killedby));
    let old = C.long(C.Stoned);

/* tell player even if hero is unconscious */

    set_itimeout(C.propertyReference("Stoned"), xtime);
    if (C.int(((C.long(xtime) != C.long(0n))) ^ ((C.long(old) != C.long(0n))))) {
        C.disp.botl = C.int(1);
        if (msg)
            C.pline("%s", msg);
    }
    if (!C.Stoned)
        C.dealloc_killer(C.find_delayed_killer(C.STONED));
    else if (!old)
        C.delayed_killer(C.STONED, killedby, killername);
}

export function make_vomiting(xtime, talk)

{
    xtime = C.long(C.long(xtime)); talk = C.int(C.boolean(talk));
    let old = C.long(C.Vomiting);

    if (C.Unaware)
        talk = C.int(0);

    set_itimeout(C.propertyReference("Vomiting"), xtime);
    C.disp.botl = C.int(1);
    if (((!xtime && old) ? 1 : 0))
        if (talk)
            C.You_feel("much less nauseated now.");
}

export const vismsg = "vision seems to %s for a moment but is %s now.";
export const eyemsg = "%s momentarily %s.";

export function make_blinded(xtime, talk)

{
    xtime = C.long(C.long(xtime)); talk = C.int(C.boolean(talk));
    let old = C.long(C.BlindedTimeout);
    let u_could_see, can_see_now;
    let eyes;

    /* we probe ahead in case the Eyes of the Overworld
       are or will be overriding blindness */
    u_could_see = C.int(!C.Blind);
    set_itimeout(C.propertyReference("HBlinded"), xtime ? 1n : 0n);
    can_see_now = C.int(!C.Blind);
    set_itimeout(C.propertyReference("HBlinded"), old);

    if (C.Unaware)
        talk = C.int(0);

    if (((can_see_now && !u_could_see) ? 1 : 0)) { /* regaining sight */
        if (talk) {
            if (C.Hallucination)
                C.pline("Far out!  Everything is all cosmic again!");
            else
                C.You("can see again.");
        }
    } else if (((old && !xtime) ? 1 : 0)) {
        /* clearing temporary blindness without toggling blindness */
        if (talk) {
            if (((!C.haseyes(C.gy.youmonst.data) || C.PermaBlind) ? 1 : 0)) {
                strange_feeling(0, 0);
            } else if (C.Blindfolded) {
                eyes = C.body_part(C.EYE);
                if ((C.eyecount(C.gy.youmonst.data) != 1))
                    eyes = C.makeplural(eyes);
                C.Your(eyemsg, eyes, C.vtense(eyes, "itch"));
            } else { /* Eyes of the Overworld */
                C.Your(vismsg, "brighten", C.Hallucination ? "sadder" : "normal");
            }
        }
    }

    if (((u_could_see && !can_see_now) ? 1 : 0)) { /* losing sight */
        if (talk) {
            if (C.Hallucination)
                C.pline("Oh, bummer!  Everything is dark!  Help!");
            else
                C.pline("A cloud of darkness falls upon you.");
        }
        /* Before the hero goes blind, set the ball&chain variables. */
        if (C.Punished)
            C.set_bc(0);
    } else if (((!old && xtime) ? 1 : 0)) {
        /* setting temporary blindness without toggling blindness */
        if (talk) {
            if (((!C.haseyes(C.gy.youmonst.data) || C.PermaBlind) ? 1 : 0)) {
                strange_feeling(0, 0);
            } else if (C.Blindfolded) {
                eyes = C.body_part(C.EYE);
                if ((C.eyecount(C.gy.youmonst.data) != 1))
                    eyes = C.makeplural(eyes);
                C.Your(eyemsg, eyes, C.vtense(eyes, "twitch"));
            } else { /* Eyes of the Overworld */
                C.Your(vismsg, "dim", C.Hallucination ? "happier" : "normal");
            }
        }
    }

    set_itimeout(C.propertyReference("HBlinded"), xtime);

    if (C.int((u_could_see) ^ (can_see_now))) { /* one or the other but not both */
        toggle_blindness();
    }
}

/* blindness has just started or just ended--caller enforces that;
   called by Blindf_on(), Blindf_off(), and make_blinded() */
export function toggle_blindness()

{
    let Stinging = (C.int(((C.uwep && (C.ulong(C.ulong((C.ulong(C.EWarn_of_mon) & C.ulong(C.W_WEP)))) != C.ulong(0n))) ? 1 : 0)));

    /* blindness has just been toggled */
    C.disp.botl = C.int(1); /* status conditions need update */
    C.gv.vision_full_recalc = C.int(1); /* vision has changed */
    /* this vision recalculation used to be deferred until moveloop(),
       but that made it possible for vision irregularities to occur
       (cited case was force bolt hitting an adjacent potion of blindness
       and then a secret door; hero was blinded by vapors but then got the
       message "a door appears in the wall" because wall spot was IN_SIGHT) */
    C.vision_recalc(0);
    if (((((C.Blind_telepat || C.Infravision) ? 1 : 0) || Stinging) ? 1 : 0))
        C.see_monsters(); /* also counts EWarn_of_mon monsters */
    /*
     * Avoid either of the sequences
     * "Sting starts glowing", [become blind], "Sting stops quivering" or
     * "Sting starts quivering", [regain sight], "Sting stops glowing"
     * by giving "Sting is quivering" when becoming blind or
     * "Sting is glowing" when regaining sight so that the eventual
     * "stops" message matches the most recent "Sting is ..." one.
     */
    if (Stinging)
        C.Sting_effects(-1);
    /* update dknown flag for inventory picked up while blind */
    if (!C.Blind)
        C.learn_unseen_invent();
}

/* DISABLE_WARNING_FORMAT_NONLITERAL */

export function make_hallucinated(
    xtime,   /* nonzero if this is an attempt to turn on hallucination */
    talk,
    mask)
    /* nonzero if resistance status should change by mask */
{
    xtime = C.long(C.long(xtime)); talk = C.int(C.boolean(talk)); mask = C.long(C.long(mask));
    let old = C.long(C.HHallucination);
    let changed = C.int(0);
    let message, verb;

    if (C.Unaware)
        talk = C.int(0);

    message = (!xtime) ? "Everything %s SO boring now."
                       : "Oh wow!  Everything %s so cosmic!";
    verb = (!C.Blind) ? "looks" : "feels";

    if (mask) {
        if (C.HHallucination)
            changed = C.int(1);

        if (!xtime)
            C.EHalluc_resistance = C.long(C.long(C.long(C.EHalluc_resistance) | C.long(mask)));
        else
            C.EHalluc_resistance = C.long(C.long(C.long(C.EHalluc_resistance) & C.long(~mask)));
    } else {
        if (((!C.EHalluc_resistance && (!!C.HHallucination != !!xtime)) ? 1 : 0))
            changed = C.int(1);
        set_itimeout(C.propertyReference("HHallucination"), xtime);

        /* clearing temporary hallucination without toggling vision */
        if (((((((!changed && !C.HHallucination) ? 1 : 0) && old) ? 1 : 0) && talk) ? 1 : 0)) {
            if (!C.haseyes(C.gy.youmonst.data)) {
                strange_feeling(0, 0);
            } else if (C.Blind) {
                let eyes = C.body_part(C.EYE);

                if ((C.eyecount(C.gy.youmonst.data) != 1))
                    eyes = C.makeplural(eyes);
                C.Your(eyemsg, eyes, C.vtense(eyes, "itch"));
            } else { /* Grayswandir */
                C.Your(vismsg, "flatten", "normal");
            }
        }
    }

    if (changed) {
        /* in case we're mimicking an orange (hallucinatory form
           of mimicking gold) update the mimicking's-over message */
        if (!C.Hallucination)
            C.eatmupdate();

        if (C.u.uswallow) {
            C.swallowed(0); /* redraw swallow display */
        } else {
            /* The see_* routines should be called *before* the pline. */
            C.see_monsters();
            C.see_objects();
            C.see_traps();
        }

        /* for perm_inv and anything similar
        (eg. Qt windowport's equipped items display) */
        C.update_inventory();

        C.disp.botl = C.int(1);
        if (talk)
            C.pline(message, verb);
    }
    return C.int(changed);
}

/* RESTORE_WARNING_FORMAT_NONLITERAL */

export function make_deaf(xtime, talk)

{
    xtime = C.long(C.long(xtime)); talk = C.int(C.boolean(talk));
    let old = C.long(C.HDeaf);

    if (C.Unaware)
        talk = C.int(0);

    set_itimeout(C.propertyReference("HDeaf"), xtime);
    if (C.int(((C.long(xtime) != C.long(0n))) ^ ((C.long(old) != C.long(0n))))) {
        C.disp.botl = C.int(1);
        if (talk)
            C.You(((old && !C.Deaf) ? 1 : 0) ? "can hear again."
                             : "are unable to hear anything.");
    }
}

/* set or clear "slippery fingers" */
export function make_glib(xtime)

{
    xtime = C.int(C.int(xtime));
    C.disp.botl = C.int((C.disp.botl) | (C.int((!C.Glib) ^ (!!xtime))));
    set_itimeout(C.propertyReference("Glib"), xtime);
    /* may change "(being worn)" to "(being worn; slippery)" or vice versa */
    if (C.uarmg)
        C.update_inventory();
}

export function self_invis_message()

{
    C.pline("%s %s.",
          C.Hallucination ? "Far out, man!  You"
                        : "Gee!  All of a sudden, you",
          C.See_invisible ? "can see right through yourself"
                        : "can't see yourself");
}

export function ghost_from_bottle()

{
    let mtmp = C.makemon(C.mons[C.PM_GHOST], C.u.ux, C.u.uy, C.MM_NOMSG);

    if (!mtmp) {
        C.pline("This bottle turns out to be empty.");
        return;
    }
    if (C.Blind) {
        C.pline("As you open the bottle, %s emerges.", C.something);
        return;
    }
    C.pline("As you open the bottle, an enormous %s emerges!",
          C.Hallucination ? C.rndmonnam(0) : "ghost");
    if (C.flags.verbose)
        C.You("are frightened to death, and unable to move.");
    C.nomul(-3);
    C.gm.multi_reason = "being frightened to death";
    C.gn.nomovemsg = "You regain your composure.";
}

/* getobj callback for object to drink from, which also does double duty as
   the callback for dipping into (both just allow potions). */
export function drink_ok(obj)

{
    /* getobj()'s callback to test whether hands/self is a valid "item" to
       pick is used here to communicate the fact that player has already
       passed up an opportunity to perform the action (drink or dip) on a
       non-inventory dungeon feature, so if there are no potions in invent
       the message will be "you have nothing /else/ to {drink | dip into}";
       if player used 'm' prefix to bypass dungeon features, drink_ok_extra
       will be 0 and the potential "else" will be omitted */
    if (!obj)
        return C.int(C.drink_ok_extra ? C.GETOBJ_EXCLUDE_NONINVENT : C.GETOBJ_EXCLUDE);

    if ((obj.oclass == C.POTION_CLASS))
        return C.int(C.GETOBJ_SUGGEST);

    return C.int(C.GETOBJ_EXCLUDE);
}

/* "Quaffing is like drinking, except you spill more." - Terry Pratchett */
/* the #quaff command */
export function dodrink()

{
    let otmp;

    if (C.Strangled) {
        C.pline("If you can't breathe air, how can you drink liquid?");
        return C.int(C.ECMD_OK);
    }

    C.drink_ok_extra = C.int(0);
    /* preceding 'q'/#quaff with 'm' skips the possibility of drinking
       from fountains, sinks, and surrounding water plus the prompting
       which those entail; optional for interactive use, essential for
       context-sensitive inventory item action 'quaff' */
    if (!C.iflags.menu_requested) {
        /* Is there a fountain to drink from here? */
        /* not as low as floor level but similar restrictions apply */
        if (((C.IS_FOUNTAIN(C.levl[C.u.ux][C.u.uy].typ) && C.can_reach_floor(0)) ? 1 : 0)) {
            if ((C.y_n("Drink from the fountain?") == 121)) {
                C.drinkfountain();
                return C.int(C.ECMD_TIME);
            }
            ++C.drink_ok_extra;
        }
        /* Or a kitchen sink? */
        /* not as low as floor level but similar restrictions apply */
        if (((C.IS_SINK(C.levl[C.u.ux][C.u.uy].typ) && C.can_reach_floor(0)) ? 1 : 0)) {
            if ((C.y_n("Drink from the sink?") == 121)) {
                C.drinksink();
                return C.int(C.ECMD_TIME);
            }
            ++C.drink_ok_extra;
        }
        /* Or are you surrounded by water? */
        if (((C.Underwater && !C.u.uswallow) ? 1 : 0)) {
            if ((C.y_n("Drink the water around you?") == 121)) {
                C.pline("Do you know what lives in this water?");
                return C.int(C.ECMD_TIME);
            }
            ++C.drink_ok_extra;
        }
    }

    otmp = C.getobj("drink", drink_ok, C.GETOBJ_NOFLAGS);
    if (!otmp)
        return C.int(C.ECMD_CANCEL);

    /*
     * 3.6:  quan > 1 used to be left to useup(), but we need to
     * force the current potion to be unworn, and don't want to do
     * that for the entire stack when starting with more than 1.
     * [Drinking a wielded potion of polymorph can trigger a shape
     * change which causes hero's weapon to be dropped.  In 3.4.x,
     * that led to an "object lost" panic since subsequent useup()
     * was no longer dealing with an inventory item.  Unwearing
     * the current potion is intended to keep it in inventory.]
     *
     * 5.0: switch back to relying on useup() unless the object is
     * actually worn.  Otherwise drinking a stack of unpaid potions
     * one by one in a shop makes each one a separate used-up item
     * for 'Ix' invent display and for itemized shop billing instead
     * of having a single stack with quantity greater than 1.
     */
    if (otmp.owornmask) {
        if ((C.long(otmp.quan) > C.long(1n))) {
            otmp = C.splitobj(otmp, 1n);
            otmp.owornmask = C.long(0n); /* rest of original stack is unaffected */
        } else {
            C.remove_worn_item(otmp, 0);
        }
    }
    otmp.in_use = 1; /* you've opened the stopper */

    if (((((C.objdescr_is(otmp, "milky") && !(C.int((C.svm.mvitals[C.PM_GHOST].mvflags) & (C.G_GONE)))) ? 1 : 0) && !C.rn2(C.POTION_OCCUPANT_CHANCE(C.svm.mvitals[C.PM_GHOST].born), 603, "dodrink")) ? 1 : 0)) {
        ghost_from_bottle();
        C.useup(otmp);
        return C.int(C.ECMD_TIME);
    } else if (((((C.objdescr_is(otmp, "smoky") && !(C.int((C.svm.mvitals[C.PM_DJINNI].mvflags) & (C.G_GONE)))) ? 1 : 0) && !C.rn2(C.POTION_OCCUPANT_CHANCE(C.svm.mvitals[C.PM_DJINNI].born), 609, "dodrink")) ? 1 : 0)) {
        C.callLocal(djinni_from_bottle, otmp);
        C.useup(otmp);
        return C.int(C.ECMD_TIME);
    }
    return C.int(dopotion(otmp));
}

export function dopotion(otmp)

{
    let retval;

    otmp.in_use = 1;
    C.gp.potion_nothing = C.gp.potion_unkn = 0;
    if (((retval = C.int(peffects(otmp))) >= 0))
        return C.int(retval ? C.ECMD_TIME : C.ECMD_OK);

    if (C.gp.potion_nothing) {
        C.gp.potion_unkn++;
        C.You("have a %s feeling for a moment, then it passes.",
            C.Hallucination ? "normal" : "peculiar");
    }
    if (((otmp.dknown && !C.objects[otmp.otyp].oc_name_known) ? 1 : 0)) {
        if (!C.gp.potion_unkn) {
            C.makeknown(otmp.otyp);
            C.more_experienced(0, 10);
        } else
            C.trycall(otmp);
    }
    C.useup(otmp);
    return C.int(C.ECMD_TIME);
}

/* potion or spell of restore ability; for spell, otmp is a temporary
   spellbook object that will be blessed if hero is skilled in healing */
export function peffect_restore_ability(otmp)

{
    C.gp.potion_unkn++;
    if (otmp.cursed) {
        C.pline("Ulch!  This makes you feel mediocre!");
        return;
    } else {
        let i, ii;

        /* unlike unicorn horn, overrides Fixed_abil;
           does not recover temporary strength loss due to hunger
           or temporary dexterity loss due to wounded legs */
        C.pline("Wow!  This makes you feel %s!",
              (!otmp.blessed) ? "good"
              : C.unfixable_trouble_count(0) ? "better"
                : "great");
        i = C.int(C.rn2(C.A_MAX, 662, "peffect_restore_ability")); /* start at a random point */
        for (ii = C.int(0); (ii < C.A_MAX); ii++) {
            let lim = C.int(C.AMAX(i));

            /* this used to adjust 'lim' for A_STR when u.uhs was
               WEAK or worse, but that's handled via ATEMP(A_STR) now */
            if ((C.u.acurr.a[i] < lim)) {
                C.u.acurr.a[i] = C.int(lim);
                /* reset stat abuse (but not exercise) to 0 as well */
                C.u.aexe.a[i] = C.int((C.u.aexe.a[i] > 0) ? (C.u.aexe.a[i]) : (0));

                C.disp.botl = C.int(1);
                /* only first found if not blessed */
                if (!otmp.blessed)
                    break;
            }
            if ((++i >= C.A_MAX))
                i = C.int(0);
        }

        /* when using the potion (not the spell) also restore lost levels,
           to make the potion more worth keeping around for players with
           the spell or with a unihorn; this is better than full healing
           in that it can restore all of them, not just half, and a
           blessed potion restores them all at once */
        if ((((otmp.otyp == C.POT_RESTORE_ABILITY) && (C.u.ulevel < C.u.ulevelmax)) ? 1 : 0)) {
            do {
                C.pluslvl(0);
            } while ((((C.u.ulevel < C.u.ulevelmax) && otmp.blessed) ? 1 : 0));
        }
    }
}

export function peffect_hallucination(otmp)

{
    if (C.Halluc_resistance) {
        C.gp.potion_nothing++;
        return;
    } else if (C.Hallucination) {
        C.gp.potion_nothing++;
    }
    make_hallucinated(itimeout_incr(C.HHallucination,
                                           C.int(C.int((C.rn2(200, 705, "peffect_hallucination")) + (C.int((600) - (Math.imul(300, C.bcsign(otmp)))))))),
                             1, 0n);
    if (((((otmp.blessed && !C.rn2(3, 707, "peffect_hallucination")) ? 1 : 0) || ((!otmp.cursed && !C.rn2(6, 707, "peffect_hallucination")) ? 1 : 0)) ? 1 : 0)) {
        C.You("perceive yourself...");
        C.display_nhwindow(C.WIN_MESSAGE, 0);
        C.enlightenment(C.MAGICENLIGHTENMENT, C.ENL_GAMEINPROGRESS);
        C.Your("awareness re-normalizes.");
        C.exercise(C.A_WIS, 1);
    }
}

export function peffect_water(otmp)

{
    if (((!otmp.blessed && !otmp.cursed) ? 1 : 0)) {
        C.pline("This tastes like %s.", C.hliquid("water"));
        C.u.uhunger = C.int((C.u.uhunger) + (C.rnd(10, 721, "peffect_water")));
        C.newuhs(0);
        return;
    }
    C.gp.potion_unkn++;
    if (((C.mon_hates_blessings(C.gy.youmonst) /* undead or demon */ || (C.u.ualign.type == C.A_CHAOTIC)) ? 1 : 0)) {
        if (otmp.blessed) {
            C.pline("This burns like %s!", C.hliquid("acid"));
            C.exercise(C.A_CON, 0);
            if (C.ismnum(C.u.ulycn)) {
                C.Your("affinity to %s disappears!",
                     C.makeplural(C.mons[C.u.ulycn].pmnames[C.NEUTRAL]));
                if (C.samePtr(C.gy.youmonst.data, C.mons[C.u.ulycn]))
                    C.you_unwere(0);
                C.set_ulycn(C.NON_PM); /* cure lycanthropy */
            }
            C.losehp((C.Half_physical_damage ? C.int(C.int((C.int(C.int((C.d(2, 6, 738, "peffect_water")) + (1)))) / (2))) : (C.d(2, 6, 738, "peffect_water"))), "potion of holy water",
                   C.KILLED_BY_AN);
        } else if (otmp.cursed) {
            C.You_feel("quite proud of yourself.");
            healup(C.d(2, 6, 742, "peffect_water"), 0, 0, 0);
            if (((C.ismnum(C.u.ulycn) && !C.Upolyd) ? 1 : 0))
                C.you_were();
            C.exercise(C.A_CON, 1);
        }
    } else {
        if (otmp.blessed) {
            C.You_feel("full of awe.");
            make_sick(0n, 0, 1, C.SICK_ALL);
            C.exercise(C.A_WIS, 1);
            C.exercise(C.A_CON, 1);
            if (C.ismnum(C.u.ulycn))
                C.you_unwere(1); /* "Purified" */
            /* make_confused(0L, TRUE); */
        } else {
            if ((C.u.ualign.type == C.A_LAWFUL)) {
                C.pline("This burns like %s!", C.hliquid("acid"));
                C.losehp((C.Half_physical_damage ? C.int(C.int((C.int(C.int((C.d(2, 6, 759, "peffect_water")) + (1)))) / (2))) : (C.d(2, 6, 759, "peffect_water"))), "potion of unholy water",
                       C.KILLED_BY_AN);
            } else
                C.You_feel("full of dread.");
            if (((C.ismnum(C.u.ulycn) && !C.Upolyd) ? 1 : 0))
                C.you_were();
            C.exercise(C.A_CON, 0);
        }
    }
}

export function peffect_booze(otmp)

{
    C.gp.potion_unkn++;
    C.pline("Ooph!  This tastes like %s%s!",
          otmp.odiluted ? "watered down " : "",
          C.Hallucination ? "dandelion wine" : "liquid fire");
    if (!otmp.blessed) {
        /* booze hits harder if drinking on an empty stomach */
        make_confused(itimeout_incr(C.HConfusion, C.d(C.uint((2) + (C.u.uhs)), 8, 779, "peffect_booze")), 0);
    }
    /* the whiskey makes us feel better */
    if (!otmp.odiluted)
        healup(1, 0, 0, 0);
    C.u.uhunger = C.int((C.u.uhunger) + (Math.imul(10, C.int((2) + (C.bcsign(otmp))))));
    C.newuhs(0);
    C.exercise(C.A_WIS, 0);
    if (otmp.cursed) {
        C.You("pass out.");
        C.gm.multi = C.long(-C.rnd(15, 789, "peffect_booze"));
        C.gn.nomovemsg = "You awake with a headache.";
    }
}

export function peffect_enlightenment(otmp)

{
    if (otmp.cursed) {
        C.gp.potion_unkn++;
        C.You("have an uneasy feeling...");
        C.exercise(C.A_WIS, 0);
    } else {
        if (otmp.blessed) {
            C.adjattrib(C.A_INT, 1, 0);
            C.adjattrib(C.A_WIS, 1, 0);
        }
        C.do_enlightenment_effect();
    }
}

export function peffect_invisibility(otmp)

{
    let is_spell = (C.int((otmp.oclass == C.SPBOOK_CLASS)));

    /* spell cannot penetrate mummy wrapping */
    if (((((is_spell && C.BInvis) ? 1 : 0) && (C.uarmc.otyp == C.MUMMY_WRAPPING)) ? 1 : 0)) {
        C.You_feel("rather itchy under %s.", C.yname(C.uarmc));
        return;
    }
    if (((((C.Invis || C.Blind) ? 1 : 0) || C.BInvis) ? 1 : 0)) {
        C.gp.potion_nothing++;
    } else {
        self_invis_message();
    }
    if (((otmp.blessed && !C.rn2(C.HInvis ? 15 : 30, 825, "peffect_invisibility")) ? 1 : 0))
        C.HInvis = C.long(C.long(C.long(C.HInvis) | C.long(C.FROMOUTSIDE)));
    else
        incr_itimeout(C.propertyReference("HInvis"), C.int((C.d(C.int((6) - (Math.imul(3, C.bcsign(otmp)))), 100, 828, "peffect_invisibility")) + (100)));
    C.newsym(C.u.ux, C.u.uy); /* update position */
    if (otmp.cursed) {
        C.pline("For some reason, you feel your presence is known.");
        C.aggravate();

        /* doing this gives temporary invisibility, but removes permanent
           invisibility */
        C.HInvis = C.long(C.long(C.long(C.HInvis) & C.long(~C.FROMOUTSIDE)));
    }
}

export function peffect_see_invisible(otmp)

{
    let msg = C.int(((C.Invisible && !C.Blind) ? 1 : 0));
    let permchance = C.int(C.int((C.int((10) - (C.HInvis ? 3 : 0))) - (C.HSee_invisible ? 6 : 0)));

    C.gp.potion_unkn++;
    if (otmp.cursed)
        C.pline("Yecch!  This tastes %s.",
              C.Hallucination ? "overripe" : "rotten");
    else
        C.pline(
              C.Hallucination
              ? "This tastes like 10%% real %s%s all-natural beverage."
              : "This tastes like %s%s.",
              otmp.odiluted ? "reconstituted " : "", C.fruitname(1));
    if ((otmp.otyp == C.POT_FRUIT_JUICE)) {
        C.u.uhunger = C.int((C.u.uhunger) + (Math.imul(otmp.odiluted ? 5 : 10, C.int((2) + (C.bcsign(otmp))))));
        C.newuhs(0);
        return;
    }
    if (!otmp.cursed) {
        /* Tell them they can see again immediately, which
         * will help them identify the potion...
         */
        make_blinded(0n, 1);
    }
    if (((otmp.blessed && !C.rn2(permchance, 867, "peffect_see_invisible")) ? 1 : 0))
        C.HSee_invisible = C.long(C.long(C.long(C.HSee_invisible) | C.long(C.FROMOUTSIDE)));
    else
        incr_itimeout(C.propertyReference("HSee_invisible"), C.int(C.int((C.rn2(100, 870, "peffect_see_invisible")) + (750))));
    C.set_mimic_blocking(); /* do special mimic handling */
    C.see_monsters();       /* see invisible monsters */
    C.newsym(C.u.ux, C.u.uy);   /* see yourself! */
    if (((msg && !C.Blind) ? 1 : 0)) {  /* Blind possible if polymorphed */
        C.You("can see through yourself, but you are visible!");
        C.gp.potion_unkn--;
    }
}

export function peffect_paralysis(otmp)

{
    if (C.Free_action) {
        C.You("stiffen momentarily.");
    } else {
        if (((((C.Levitation || C.Is_airlevel(C.u.uz)) ? 1 : 0) || C.Is_waterlevel(C.u.uz)) ? 1 : 0))
            C.You("are motionlessly suspended.");
        else if (C.u.usteed)
            C.You("are frozen in place!");
        else
            C.Your("%s are frozen to the %s!", C.makeplural(C.body_part(C.FOOT)),
                 C.surface(C.u.ux, C.u.uy));
        C.nomul(-(C.int(C.int((C.rn2(10, 893, "peffect_paralysis")) + (C.int((25) - (Math.imul(12, C.bcsign(otmp)))))))));
        C.gm.multi_reason = "frozen by a potion";
        C.gn.nomovemsg = C.You_can_move_again;
        C.exercise(C.A_DEX, 0);
    }
}

export function peffect_sleeping(otmp)

{
    if (((C.Sleep_resistance || C.Free_action) ? 1 : 0)) {
        C.monstseesu(C.M_SEEN_SLEEP);
        C.You("yawn.");
    } else {
        C.You("suddenly fall asleep!");
        C.monstunseesu(C.M_SEEN_SLEEP);
        C.fall_asleep(-C.int(C.int((C.rn2(10, 909, "peffect_sleeping")) + (C.int((25) - (Math.imul(12, C.bcsign(otmp))))))), 1);
    }
}

export function peffect_monster_detection(otmp)

{
    if (otmp.blessed) {
        let i, x, y;

        if (C.Detect_monsters)
            C.gp.potion_nothing++;
        C.gp.potion_unkn++;
        /* after a while, repeated uses become less effective */
        if ((C.long(C.long((C.long(C.HDetect_monsters) & C.long(C.TIMEOUT)))) >= C.long(300n)))
            i = C.int(1);
        else if ((otmp.oclass == C.SPBOOK_CLASS))
            i = C.int(C.int(C.int((C.rn2(40, 926, "peffect_monster_detection")) + (21))));
        else /* potion */
            i = C.int(C.int((C.rn2(100, 928, "peffect_monster_detection")) + (100)));
        incr_itimeout(C.propertyReference("HDetect_monsters"), i);
        for (x = C.int(1); (x < C.COLNO); x++) {
            for (y = C.int(0); (y < C.ROWNO); y++) {
                if ((C.levl[x][y].glyph == C.GLYPH_INVISIBLE)) {
                    C.unmap_object(x, y);
                    C.newsym(x, y);
                }
                if (C.MON_AT(x, y))
                    C.gp.potion_unkn = 0;
            }
        }
        /* if swallowed or underwater, fall through to uncursed case */
        if (((!C.u.uswallow && !C.Underwater) ? 1 : 0)) {
            C.see_monsters();
            if (C.gp.potion_unkn)
                C.You_feel("lonely.");
            return C.int(0);
        }
    }
    if (C.monster_detect(otmp, 0))
        return C.int(1); /* nothing detected */
    C.exercise(C.A_WIS, 1);
    return C.int(0);
}

export function peffect_object_detection(otmp)

{
    if (C.object_detect(otmp, 0))
        return C.int(1); /* nothing detected */
    C.exercise(C.A_WIS, 1);
    return C.int(0);
}

export function peffect_sickness(otmp)

{
    C.pline("Yecch!  This stuff tastes like poison.");
    if (otmp.blessed) {
        C.pline("(But in fact it was mildly stale %s.)", C.fruitname(1));
        if (!C.Role_if(C.PM_HEALER)) {
            /* NB: blessed otmp->fromsink is not possible */
            C.losehp(1, "mildly contaminated potion", C.KILLED_BY_AN);
        }
    } else {
        if (C.Poison_resistance)
            C.pline("(But in fact it was biologically contaminated %s.)",
                  C.fruitname(1));
        if (C.Role_if(C.PM_HEALER)) {
            C.pline("Fortunately, you have been immunized.");
        } else {
            const contaminant = C.stackAlloc(C.BUFSZ);
            let typ = C.int(C.rn2(C.A_MAX, 981, "peffect_sickness"));

            C.Sprintf(contaminant, "%s%s",
                    (C.Poison_resistance) ? "mildly " : "",
                    (otmp.fromsink) ? "contaminated tap water"
                    : "contaminated potion");
            if (!C.Fixed_abil) {
                C.poisontell(typ, 0);
                C.adjattrib(typ, C.Poison_resistance ? -1 : -C.int(C.int((C.rn2(4, 989, "peffect_sickness")) + (3))),
                                 1);
            }
            if (!C.Poison_resistance) {
                if (otmp.fromsink)
                    C.losehp(C.int((C.rnd(10, 994, "peffect_sickness")) + (Math.imul(5, !!(otmp.cursed)))), contaminant,
                           C.KILLED_BY);
                else
                    C.losehp(C.int((C.rnd(10, 997, "peffect_sickness")) + (Math.imul(5, !!(otmp.cursed)))), contaminant,
                           C.KILLED_BY_AN);
            } else {
                /* rnd loss is so that unblessed poorer than blessed */
                C.losehp(C.int((1) + (C.rn2(2, 1001, "peffect_sickness"))), contaminant,
                       (otmp.fromsink) ? C.KILLED_BY : C.KILLED_BY_AN);
            }
            C.exercise(C.A_CON, 0);
        }
    }
    if (C.Hallucination) {
        C.You("are shocked back to your senses!");
        make_hallucinated(0n, 0, 0n);
    }
}

export function peffect_confusion(otmp)

{
    if (!C.Confusion) {
        if (C.Hallucination) {
            C.pline("What a trippy feeling!");
            C.gp.potion_unkn++;
        } else
            C.pline("Huh, What?  Where am I?");
    } else
        C.gp.potion_nothing++;
    make_confused(itimeout_incr(C.HConfusion,
                                C.int(C.int((C.rn2(7, 1025, "peffect_confusion")) + (C.int((16) - (Math.imul(8, C.bcsign(otmp)))))))),
                  0);
}

export function peffect_gain_ability(otmp)

{
    if (otmp.cursed) {
        C.pline("Ulch!  That potion tasted foul!");
        C.gp.potion_unkn++;
    } else if (C.Fixed_abil) {
        C.gp.potion_nothing++;
    } else {      /* If blessed, increase all; if not, try up to */
        let itmp; /* 6 times to find one which can be increased. */
        let ii, i = C.int(-1);   /* increment to 0 */
        for (ii = C.int(C.A_MAX); (ii > 0); ii--) {
            i = C.int(otmp.blessed ? C.int((i) + (1)) : C.rn2(C.A_MAX, 1041, "peffect_gain_ability"));
            /* only give "your X is already as high as it can get"
               message on last attempt (except blessed potions) */
            itmp = C.int((((otmp.blessed || (ii == 1)) ? 1 : 0)) ? 0 : -1);
            if (((C.adjattrib(i, 1, itmp) && !otmp.blessed) ? 1 : 0))
                break;
        }
    }
}

export function peffect_speed(otmp)

{
    let is_speed = (C.int((otmp.otyp == C.POT_SPEED)));

    /* skip when mounted; heal_legs() would heal steed's legs */
    if (((((((is_speed && C.Wounded_legs) ? 1 : 0) && !otmp.cursed) ? 1 : 0) && !C.u.usteed) ? 1 : 0)) {
        C.heal_legs(0);
        C.gp.potion_unkn++;
        return;
    }

    speed_up(C.int(C.int((C.rn2(10, 1063, "peffect_speed")) + (C.int((100) + (Math.imul(60, C.bcsign(otmp))))))));

    /* non-cursed potion grants intrinsic speed */
    if (((((is_speed && !otmp.cursed) ? 1 : 0) && !(C.long((C.long(C.HFast) & C.long(C.INTRINSIC))))) ? 1 : 0)) {
        C.Your("quickness feels very natural.");
        C.HFast = C.long(C.long(C.long(C.HFast) | C.long(C.FROMOUTSIDE)));
    }
}

export function peffect_blindness(otmp)

{
    if (((C.Blind || ((((C.HBlinded || C.EBlinded) ? 1 : 0) && C.BBlinded) ? 1 : 0)) ? 1 : 0))
        C.gp.potion_nothing++;
    make_blinded(itimeout_incr(C.BlindedTimeout,
                               C.int(C.int((C.rn2(200, 1078, "peffect_blindness")) + (C.int((250) - (Math.imul(125, C.bcsign(otmp)))))))),
                 C.boolean(!C.Blind));
}

export function peffect_gain_level(otmp)

{
    if (otmp.cursed) {
        let on_lvl_1 = (C.int((C.ledger_no(C.u.uz) == 1)));

        C.gp.potion_unkn++;
        /* they went up a level */
        if (on_lvl_1 ? C.u.uhave.amulet : C.Can_rise_up(C.u.ux, C.u.uy, C.u.uz)) {
            let newlev;
            const newlevel = C.levelLocal();

            if (on_lvl_1) {
                C.assign_level(newlevel, C.earth_level);
            } else {
                newlev = C.int(C.int((C.depth(C.u.uz)) - (1)));
                C.get_level(newlevel, newlev);
                if (C.on_level(newlevel, C.u.uz)) {
                    C.pline("It tasted bad.");
                    return;
                }
            }
            C.You("rise up, through the %s!", C.ceiling(C.u.ux, C.u.uy));
            C.goto_level(newlevel, 0, 0, 0);
        } else {
            C.You("have an uneasy feeling.");
        }
        return;
    }
    C.pluslvl(0);
    /* blessed potions place you at a random spot in the
       middle of the new level instead of the low point */
    if (otmp.blessed)
        C.u.uexp = C.long(C.rndexp(1));
}

export function peffect_healing(otmp)

{
    C.You_feel("better.");
    healup(C.int((8) + (C.d(C.int((4) + (Math.imul(2, C.bcsign(otmp)))), 4, 1122, "peffect_healing"))), !otmp.cursed ? 1 : 0,
           !!otmp.blessed, !otmp.cursed);
    C.exercise(C.A_CON, 1);
}

export function peffect_extra_healing(otmp)

{
    C.You_feel("much better.");
    healup(C.int((16) + (C.d(C.int((4) + (Math.imul(2, C.bcsign(otmp)))), 8, 1131, "peffect_extra_healing"))),
           otmp.blessed ? 5 : !otmp.cursed ? 2 : 0, !otmp.cursed,
           1);
    make_hallucinated(0n, 1, 0n);
    C.exercise(C.A_CON, 1);
    C.exercise(C.A_STR, 1);
    /* blessed potion also heals wounded legs unless riding (where leg
       wounds apply to the steed rather than to the hero) */
    if (((C.Wounded_legs && ((otmp.blessed && !C.u.usteed) ? 1 : 0)) ? 1 : 0))
        C.heal_legs(0);
}

export function peffect_full_healing(otmp)

{
    C.You_feel("completely healed.");
    healup(400, C.int((4) + (Math.imul(4, C.bcsign(otmp)))), !otmp.cursed, 1);
    /* Restore one lost level if blessed */
    if (((otmp.blessed && (C.u.ulevel < C.u.ulevelmax)) ? 1 : 0)) {
        /* when multiple levels have been lost, drinking
           multiple potions will only get half of them back */
        C.u.ulevelmax = C.int((C.u.ulevelmax) - (1));
        C.pluslvl(0);
    }
    make_hallucinated(0n, 1, 0n);
    C.exercise(C.A_STR, 1);
    C.exercise(C.A_CON, 1);
    /* blessed potion heals wounded legs even when riding (so heals steed's
       legs--it's magic); uncursed potion heals hero's legs unless riding */
    if (((C.Wounded_legs && ((otmp.blessed || ((!otmp.cursed && !C.u.usteed) ? 1 : 0)) ? 1 : 0)) ? 1 : 0))
        C.heal_legs(0);
}

export function peffect_levitation(otmp)

{
    /*
     * BLevitation will be set if levitation is blocked due to being
     * inside rock (currently or formerly in phazing xorn form, perhaps)
     * but it doesn't prevent setting or incrementing Levitation timeout
     * (which will take effect after escaping from the rock if it hasn't
     * expired by then).
     */
    if (((!C.Levitation && !C.BLevitation) ? 1 : 0)) {
        /* kludge to ensure proper operation of float_up() */
        set_itimeout(C.propertyReference("HLevitation"), 1n);
        C.float_up();
        /* This used to set timeout back to 0, then increment it below
           for blessed and uncursed effects.  But now we leave it so
           that cursed effect yields "you float down" on next turn.
           Blessed and uncursed get one extra turn duration. */
    } else /* already levitating, or can't levitate */
        C.gp.potion_nothing++;

    if (otmp.cursed) {
        let stway;

        /* 'already levitating' used to block the cursed effect(s)
           aside from ~I_SPECIAL; it was not clear whether that was
           intentional; either way, it no longer does (as of 3.6.1) */
        C.HLevitation = C.long(C.long(C.long(C.HLevitation) & C.long(~C.I_SPECIAL))); /* can't descend upon demand */
        if (C.BLevitation) {
            ; /* rising via levitation is blocked */
        } else if (((!C.samePtr(stway = C.stairway_at(C.u.ux, C.u.uy), 0) && stway.up) ? 1 : 0)) {
            C.doup();
            /* in case we're already Levitating, which would have
               resulted in incrementing 'nothing' */
            C.gp.potion_nothing = 0; /* not nothing after all */
        } else if (C.has_ceiling(C.u.uz)) {
            let dmg = C.int(C.rnd(!C.uarmh ? 10 : !C.hard_helmet(C.uarmh) ? 6 : 3, 1200, "peffect_levitation"));

            C.You("hit your %s on the %s.", C.body_part(C.HEAD),
                C.ceiling(C.u.ux, C.u.uy));
            C.losehp((C.Half_physical_damage ? C.int(C.int((C.int(C.int((dmg) + (1)))) / (2))) : (dmg)), "colliding with the ceiling",
                   C.KILLED_BY);
            C.gp.potion_nothing = 0; /* not nothing after all */
        }
    } else if (otmp.blessed) {
        /* at this point, timeout is already at least 1 */
        incr_itimeout(C.propertyReference("HLevitation"), C.int(C.int((C.rn2(50, 1210, "peffect_levitation")) + (250))));
        /* can descend at will (stop levitating via '>') provided timeout
           is the only factor (ie, not also wearing Lev ring or boots) */
        C.HLevitation = C.long(C.long(C.long(C.HLevitation) | C.long(C.I_SPECIAL)));
    } else /* timeout is already at least 1 */
        incr_itimeout(C.propertyReference("HLevitation"), C.int(C.int((C.rn2(140, 1215, "peffect_levitation")) + (10))));

    if (((C.Levitation && C.IS_SINK(C.levl[C.u.ux][C.u.uy].typ)) ? 1 : 0))
        C.spoteffects(0);
    /* levitating blocks flying */
    C.float_vs_flight();
}

export function peffect_gain_energy(otmp)

{
    let num;

    if (otmp.cursed)
        C.You_feel("lackluster.");
    else
        C.pline("Magical energies course through your body.");

    /* old: num = rnd(5) + 5 * otmp->blessed + 1;
     *      blessed:  +7..11 max & current (+9 avg)
     *      uncursed: +2.. 6 max & current (+4 avg)
     *      cursed:   -2.. 6 max & current (-4 avg)
     * new: (3.6.0)
     *      blessed:  +3..18 max (+10.5 avg), +9..54 current (+31.5 avg)
     *      uncursed: +2..12 max (+ 7   avg), +6..36 current (+21   avg)
     *      cursed:   -1.. 6 max (- 3.5 avg), -3..18 current (-10.5 avg)
     */
    num = C.int(C.d(otmp.blessed ? 3 : !otmp.cursed ? 2 : 1, 6, 1242, "peffect_gain_energy"));
    if (otmp.cursed)
        num = C.int(-num); /* subtract instead of add when cursed */
    C.u.uenmax = C.int((C.u.uenmax) + (num));
    if ((C.u.uenmax > C.u.uenpeak))
        C.u.uenpeak = C.int(C.u.uenmax);
    else if ((C.u.uenmax <= 0))
        C.u.uenmax = C.int(0);
    C.u.uen = C.int((C.u.uen) + (Math.imul(3, num)));
    if ((C.u.uen > C.u.uenmax))
        C.u.uen = C.int(C.u.uenmax);
    else if ((C.u.uen <= 0))
        C.u.uen = C.int(0);
    C.disp.botl = C.int(1);
    C.exercise(C.A_WIS, 1);
}

export function peffect_oil(otmp)

{
    let good_for_you = C.int(0), vulnerable;

    if (otmp.lamplit) {
        if (C.likes_fire(C.gy.youmonst.data)) {
            C.pline("Ahh, a refreshing drink.");
            good_for_you = C.int(1);
        } else {
            /*
             * Note: if poly'd into green slime, hero ought to take
             * extra damage, but drinking potions in that form isn't
             * possible so there's no need to try to handle that.
             */
            C.You("burn your %s.", C.body_part(C.FACE));
            /* fire damage */
            vulnerable = C.int(((!C.Fire_resistance || C.Cold_resistance) ? 1 : 0));
            C.losehp(C.d(vulnerable ? 4 : 2, 4, 1277, "peffect_oil"),
                   "quaffing a burning potion of oil",
                   C.KILLED_BY);
        }
        /*
         * This is slightly iffy because the burning isn't being
         * spread across the body.  But the message is "the slime
         * that covers you burns away" and having that follow
         * "you burn your face" seems consistent enough.
         */
        C.burn_away_slime();
    } else if (otmp.cursed) {
        C.pline("This tastes like castor oil.");
    } else {
        C.pline("That was smooth!");
    }
    C.exercise(C.A_WIS, good_for_you);
}

export function peffect_acid(otmp)

{
    if (C.Acid_resistance) {
        /* Not necessarily a creature who _likes_ acid */
        C.pline("This tastes %s.", C.Hallucination ? "tangy" : "sour");
    } else {
        let dmg;

        C.pline("This burns%s!",
              otmp.blessed ? " a little" : otmp.cursed ? " a lot"
                                                         : " like acid");
        dmg = C.int(C.d(otmp.cursed ? 2 : 1, otmp.blessed ? 4 : 8, 1308, "peffect_acid"));
        C.losehp((C.Half_physical_damage ? C.int(C.int((C.int(C.int((dmg) + (1)))) / (2))) : (dmg)), "potion of acid", C.KILLED_BY_AN);
        C.exercise(C.A_CON, 0);
    }
    if (C.Stoned)
        C.fix_petrification();
    C.gp.potion_unkn++; /* holy/unholy water can burn like acid too */
}

export function peffect_polymorph(otmp)

{
    C.You_feel("a little %s.", C.Hallucination ? "normal" : "strange");
    if (!C.Unchanging) {
        if (((!otmp.blessed || (C.u.umonnum != C.u.umonster)) ? 1 : 0))
            C.polyself(C.POLY_NOFLAGS);
        else {
            C.polyself(C.int((C.POLY_CONTROLLED) | (C.POLY_LOW_CTRL)));
            if (((C.u.mtimedone && (C.u.umonnum != C.u.umonster)) ? 1 : 0))
                C.u.mtimedone = C.int((C.u.mtimedone < C.int((C.rn2(15, 1327, "peffect_polymorph")) + (10))) ? (C.u.mtimedone) : (C.int((C.rn2(15, 1327, "peffect_polymorph")) + (10))));
        }
    }
}

export function peffects(otmp)

{
    switch (otmp.otyp) {
    case C.POT_RESTORE_ABILITY:
    case C.SPE_RESTORE_ABILITY:
        peffect_restore_ability(otmp);
        break;
    case C.POT_HALLUCINATION:
        peffect_hallucination(otmp);
        break;
    case C.POT_WATER:
        peffect_water(otmp);
        break;
    case C.POT_BOOZE:
        peffect_booze(otmp);
        break;
    case C.POT_ENLIGHTENMENT:
        peffect_enlightenment(otmp);
        break;
    case C.SPE_INVISIBILITY:
    case C.POT_INVISIBILITY:
        peffect_invisibility(otmp);
        break;
    case C.POT_SEE_INVISIBLE: /* tastes like fruit juice in Rogue */
    case C.POT_FRUIT_JUICE:
        peffect_see_invisible(otmp);
        break;
    case C.POT_PARALYSIS:
        peffect_paralysis(otmp);
        break;
    case C.POT_SLEEPING:
        peffect_sleeping(otmp);
        break;
    case C.POT_MONSTER_DETECTION:
    case C.SPE_DETECT_MONSTERS:
        if (peffect_monster_detection(otmp))
            return C.int(1);
        break;
    case C.POT_OBJECT_DETECTION:
    case C.SPE_DETECT_TREASURE:
        if (peffect_object_detection(otmp))
            return C.int(1);
        break;
    case C.POT_SICKNESS:
        C.callLocal(peffect_sickness, otmp);
        break;
    case C.POT_CONFUSION:
        peffect_confusion(otmp);
        break;
    case C.POT_GAIN_ABILITY:
        peffect_gain_ability(otmp);
        break;
    case C.POT_SPEED:
    case C.SPE_HASTE_SELF:
        peffect_speed(otmp);
        break;
    case C.POT_BLINDNESS:
        peffect_blindness(otmp);
        break;
    case C.POT_GAIN_LEVEL:
        peffect_gain_level(otmp);
        break;
    case C.POT_HEALING:
        peffect_healing(otmp);
        break;
    case C.POT_EXTRA_HEALING:
        peffect_extra_healing(otmp);
        break;
    case C.POT_FULL_HEALING:
        peffect_full_healing(otmp);
        break;
    case C.POT_LEVITATION:
    case C.SPE_LEVITATION:
        C.callLocal(peffect_levitation, otmp);
        break;
    case C.POT_GAIN_ENERGY: /* M. Stephenson */
        peffect_gain_energy(otmp);
        break;
    case C.POT_OIL: /* P. Winner */
        peffect_oil(otmp);
        break;
    case C.POT_ACID:
        peffect_acid(otmp);
        break;
    case C.POT_POLYMORPH:
        peffect_polymorph(otmp);
        break;
    default:
        C.impossible("What a funny potion! (%u)", otmp.otyp);
        return C.int(0);
    }
    return C.int(-1);
}

export function healup(nhp, nxtra, curesick, cureblind)

{
    nhp = C.int(C.int(nhp)); nxtra = C.int(C.int(nxtra)); curesick = C.int(C.boolean(curesick)); cureblind = C.int(C.boolean(cureblind));
    if (nhp) {
        if (C.Upolyd) {
            C.u.mh = C.int((C.u.mh) + (nhp));
            if ((C.u.mh > C.u.mhmax))
                C.u.mh = C.int(C.u.mhmax = C.int((C.u.mhmax) + (nxtra)));
        } else {
            C.u.uhp = C.int((C.u.uhp) + (nhp));
            if ((C.u.uhp > C.u.uhpmax)) {
                C.u.uhp = C.int(C.u.uhpmax = C.int((C.u.uhpmax) + (nxtra)));
                if ((C.u.uhpmax > C.u.uhppeak))
                    C.u.uhppeak = C.int(C.u.uhpmax);
            }
        }
    }
    if (cureblind) {
        /* 3.6.1: it's debatable whether healing magic should clean off
           mundane 'dirt', but if it doesn't, blindness isn't cured */
        C.u.ucreamed = C.uint(0);
        make_blinded(0n, 1);
        /* heal deafness too */
        make_deaf(0n, 1);
    }
    if (curesick) {
        make_vomiting(0n, 1);
        make_sick(0n, 0, 1, C.SICK_ALL);
    }
    C.disp.botl = C.int(1);
    return;
}

export function strange_feeling(obj, txt)

{
    if (((C.flags.beginner || !txt) ? 1 : 0))
        C.You("have a %s feeling for a moment, then it passes.",
            C.Hallucination ? "normal" : "strange");
    else
        C.pline1(txt);

    if (!obj) /* e.g., crystal ball finds no traps */
        return;

    if (obj.dknown)
        C.trycall(obj);

    C.useup(obj);
}

export const bottlenames = [ "bottle", "phial", "flagon", "carafe",
                              "flask",  "jar",   "vial" ];
export const hbottlenames = [
    "jug", "pitcher", "barrel", "tin", "bag", "box", "glass", "beaker",
    "tumbler", "vase", "flowerpot", "pan", "thingy", "mug", "teacup",
    "teapot", "keg", "bucket", "thermos", "amphora", "wineskin", "parcel",
    "bowl", "ampoule"
];

export function bottlename()

{
    if (C.Hallucination)
        return hbottlenames[C.rn2(hbottlenames.length, 1491, "bottlename")];
    else
        return bottlenames[C.rn2(bottlenames.length, 1493, "bottlename")];
}

/* handle item dipped into water potion or steed saddle splashed by same */
export function H2Opotion_dip(
    potion,    /* water */
    targobj,   /* item being dipped into the water */
    useeit,        /* will hero see the glow/aura? */
    objphrase)
 /* "Your widget glows" or "Steed's saddle glows" */
{
    useeit = C.int(C.boolean(useeit));
    let func = 0;
    let glowcolor = 0;
const COST_alter = -2;
const COST_none = -1;
    let costchange = C.int(COST_none);
    let altfmt = C.int(0), res = C.int(0);

    if (((!potion || (potion.otyp != C.POT_WATER)) ? 1 : 0))
        return C.int(0);

    if (potion.blessed) {
        if (targobj.cursed) {
            func = C.uncurse;
            glowcolor = C.NH_AMBER;
            costchange = C.int(C.COST_UNCURS);
        } else if (!targobj.blessed) {
            func = C.bless;
            glowcolor = C.NH_LIGHT_BLUE;
            costchange = C.int(COST_alter);
            altfmt = C.int(1); /* "with a <color> aura" */
        }
    } else if (potion.cursed) {
        if (targobj.blessed) {
            func = C.unbless;
            glowcolor = "brown";
            costchange = C.int(C.COST_UNBLSS);
        } else if (!targobj.cursed) {
            func = C.curse;
            glowcolor = C.NH_BLACK;
            costchange = C.int(COST_alter);
            altfmt = C.int(1);
        }
    } else {
        /* dipping into uncursed water; carried() check skips steed saddle */
        if (C.carried(targobj)) {
            C.gm.mentioned_water = C.int(0); /* water_damage() might set this */
            if ((C.long(C.water_damage(targobj, 0, 1)) != C.long(C.ER_NOTHING)))
                res = C.int(1);
            if (C.gm.mentioned_water)
                C.makeknown(C.POT_WATER);
            C.gm.mentioned_water = C.int(0);
        }
    }
    if (func) {
        /* give feedback before altering the target object;
           this used to set obj->bknown even when not seeing
           the effect; now hero has to see the glow, and bknown
           is cleared instead of set if perception is distorted */
        if (useeit) {
            glowcolor = C.hcolor(glowcolor);
            if (altfmt)
                C.pline("%s with %s aura.", objphrase, C.an(glowcolor));
            else
                C.pline("%s %s.", objphrase, glowcolor);
            C.iflags.last_msg = C.int(C.PLNMSG_OBJ_GLOWS);
            targobj.bknown = !C.Hallucination;
        } else {
            /* didn't see what happened:  forget the BUC state if that was
               known unless the bless/curse state of the water is known;
               without this, hero would know the new state even without
               seeing the glow; priest[ess] will immediately relearn it */
            if (((!potion.bknown || !potion.dknown) ? 1 : 0))
                targobj.bknown = 0;
            /* [should the bknown+dknown exception require that water
               be discovered or at least named?] */
        }
        /* potions of water are the only shop goods whose price depends
           on their curse/bless state */
        if (((targobj.unpaid && (targobj.otyp == C.POT_WATER)) ? 1 : 0)) {
            if ((costchange == COST_alter))
                /* added blessing or cursing; update shop
                   bill to reflect item's new higher price */
                C.alter_cost(targobj, 0n);
            else if ((costchange != COST_none))
                /* removed blessing or cursing; you
                   degraded it, now you'll have to buy it... */
                C.costly_alteration(targobj, costchange);
        }
        /* finally, change curse/bless state */
        func(targobj);
        res = C.int(1);
    }
    return C.int(res);
}

/* used when blessed or cursed scroll of light interacts with artifact light;
   if the lit object (Sunsword or gold dragon scales/mail) doesn't resist,
   treat like dipping it in holy or unholy water (BUC change, glow message) */
export function impact_arti_light(
    obj, /* wielded Sunsword or worn gold dragon scales/mail */
    worsen,  /* True: lower BUC state unless already cursed;
                      * False: raise BUC state unless already blessed */
    seeit)
   /* True: give "<obj> glows <color>" message */
{
    worsen = C.int(C.boolean(worsen)); seeit = C.int(C.boolean(seeit));
    let otmp;

    /* if already worst/best BUC it can be, or if it resists, do nothing */
    if ((((worsen ? obj.cursed : obj.blessed) || C.obj_resists(obj, 25, 75)) ? 1 : 0))
        return;

    /* curse() and bless() take care of maybe_adjust_light() */
    otmp = C.mksobj(C.POT_WATER, 1, 0);
    if (worsen)
        C.curse(otmp);
    else
        C.bless(otmp);
    H2Opotion_dip(otmp, obj, seeit, seeit ? C.Yobjnam2(obj, "glow") : "");
    C.dealloc_obj(otmp);
/* defer this until caller has used up the scroll so it won't be
         * visible; player was told that it disappeared as hero read it */
/* carried() will always be True here */

    return;
}

/* potion obj hits monster mon, which might be youmonst; obj always used up */
export function potionhit(mon, obj, how)

{
    how = C.int(C.int(how));
    let botlnam = bottlename();
    let isyou = (C.int(C.samePtr(mon, C.gy.youmonst)));
    let distance, tx, ty;
    let saddle = 0;
    let hit_saddle = C.int(0), your_fault = (C.int((how <= C.POTHIT_HERO_THROW)));

    if (isyou) {
        tx = C.int(C.u.ux), ty = C.int(C.u.uy);
        distance = C.int(0);
        C.pline_The("%s crashes on your %s and breaks into shards.", botlnam,
                  C.body_part(C.HEAD));
        C.losehp((C.Half_physical_damage ? C.int(C.int((C.int(C.int((C.rnd(2, 1638, "potionhit")) + (1)))) / (2))) : (C.rnd(2, 1638, "potionhit"))),
               ((how == C.POTHIT_OTHER_THROW)) ? "propelled potion" /* scatter */
                                           : "thrown potion",
               C.KILLED_BY_AN);
    } else {
        tx = C.int(mon.mx), ty = C.int(mon.my);
        /* sometimes it hits the saddle */
        if (((((C.ulong((C.ulong(mon.misc_worn_check) & C.ulong(C.W_SADDLE))) && (saddle = C.which_armor(mon, C.W_SADDLE))) ? 1 : 0) && ((!C.rn2(10, 1647, "potionhit") || (((obj.otyp == C.POT_WATER) && (((((((C.rnl(10, 1649, "potionhit") > 7) && obj.cursed) ? 1 : 0) || (((C.rnl(10, 1650, "potionhit") < 4) && obj.blessed) ? 1 : 0)) ? 1 : 0) || !C.rn2(3, 1650, "potionhit")) ? 1 : 0)) ? 1 : 0)) ? 1 : 0)) ? 1 : 0))
            hit_saddle = C.int(1);
        distance = C.int(C.distu(tx, ty));
        if (!C.cansee(tx, ty)) {
            
            C.pline("Crash!");
        } else {
            let mnam = C.mon_nam(mon);
            const buf = C.stackAlloc(C.BUFSZ);

            if (((hit_saddle && saddle) ? 1 : 0)) {
                C.Sprintf(buf, "%s saddle",
                        C.s_suffix(C.x_monnam(mon, C.ARTICLE_THE, 0,
                                          (C.int((C.SUPPRESS_IT) | (C.SUPPRESS_SADDLE))),
                                          0)));
            } else if (C.has_head(mon.data)) {
                C.Sprintf(buf, "%s %s", C.s_suffix(mnam),
                        (C.gn.notonhead ? "body" : "head"));
            } else {
                C.Strcpy(buf, mnam);
            }
            
            C.pline_The("%s crashes on %s and breaks into shards.", botlnam,
                      buf);
        }
        if (((((C.rn2(5, 1675, "potionhit") && (mon.mhp > 1)) ? 1 : 0) && !hit_saddle) ? 1 : 0))
            mon.mhp--;
    }

    /* oil doesn't instantly evaporate; Neither does a saddle hit */
    if ((((((obj.otyp != C.POT_OIL) && !hit_saddle) ? 1 : 0) && C.cansee(tx, ty)) ? 1 : 0))
        C.pline("%s.", C.Tobjnam(obj, "evaporate"));

    if (isyou) {
        switch (obj.otyp) {
        case C.POT_OIL:
            if (obj.lamplit)
                C.explode_oil(obj, C.u.ux, C.u.uy);
            break;
        case C.POT_POLYMORPH:
            C.You_feel("a little %s.", C.Hallucination ? "normal" : "strange");
            if (((!C.Unchanging && !C.Antimagic) ? 1 : 0))
                C.polyself(C.POLY_NOFLAGS);
            break;
        case C.POT_ACID:
            if (!C.Acid_resistance) {
                let dmg;

                C.pline("This burns%s!",
                      obj.blessed ? " a little"
                                   : obj.cursed ? " a lot" : "");
                dmg = C.int(C.d(obj.cursed ? 2 : 1, obj.blessed ? 4 : 8, 1701, "potionhit"));
                C.losehp((C.Half_physical_damage ? C.int(C.int((C.int(C.int((dmg) + (1)))) / (2))) : (dmg)), "potion of acid", C.KILLED_BY_AN);
            }
            break;
        }
    } else if (((hit_saddle && saddle) ? 1 : 0)) {
        let mnam; const buf = C.stackAlloc(C.BUFSZ), saddle_glows = C.stackAlloc(C.BUFSZ);
        let affected = C.int(0);
        let useeit = C.int(((((!C.Blind && C.canseemon(mon)) ? 1 : 0) && C.cansee(tx, ty)) ? 1 : 0));

        mnam = C.x_monnam(mon, C.ARTICLE_THE, 0,
                        (C.int((C.SUPPRESS_IT) | (C.SUPPRESS_SADDLE))), 0);
        C.Sprintf(buf, "%s", C.upstart(C.s_suffix(mnam)));

        switch (obj.otyp) {
        case C.POT_WATER:
            C.Snprintf(saddle_glows, C.BUFSZ, "%s %s",
                     buf, C.aobjnam(saddle, "glow"), 0);
            affected = C.int(H2Opotion_dip(obj, saddle, useeit, saddle_glows));
            break;
        case C.POT_POLYMORPH:
            /* Do we allow the saddle to polymorph? */
            break;
        }
        if (((useeit && !affected) ? 1 : 0))
            C.pline("%s %s wet.", buf, C.aobjnam(saddle, "get"));
    } else {
        let angermon = C.int(your_fault), cureblind = C.int(0);

        effect_done: {
        do_illness: {
        do_healing: {
        switch (obj.otyp) {
        case C.POT_FULL_HEALING:
            cureblind = C.int(1);
            
            /*FALLTHRU*/
        case C.POT_EXTRA_HEALING:
            if (!obj.cursed)
                cureblind = C.int(1);
            
            /*FALLTHRU*/
        case C.POT_HEALING:
            if (obj.blessed)
                cureblind = C.int(1);
            if (C.samePtr(mon.data, C.mons[C.PM_PESTILENCE]))
                break do_illness;
            
            /*FALLTHRU*/
        case C.POT_RESTORE_ABILITY:
        case C.POT_GAIN_ABILITY:
            break do_healing;
        case C.POT_SICKNESS:
            if (C.samePtr(mon.data, C.mons[C.PM_PESTILENCE]))
                break do_healing;
            if (((((C.dmgtype(mon.data, C.AD_DISE) /* won't happen, see prior goto */ || C.dmgtype(mon.data, C.AD_PEST) /* most common case */) ? 1 : 0) || C.resists_poison(mon)) ? 1 : 0)) {
                if (C.canseemon(mon))
                    C.pline("%s looks unharmed.", C.Monnam(mon));
                break;
            }
            break do_illness;
        case C.POT_CONFUSION:
        case C.POT_BOOZE:
            if (!C.resist(mon, C.POTION_CLASS, 0, C.NOTELL))
                mon.mconf = 1;
            break;
        case C.POT_INVISIBILITY: {
            let sawit = C.int(C.canspotmon(mon)),
                    cursed_potion = C.int(obj.cursed ? 1 : 0);

            angermon = C.int(((mon.minvis && cursed_potion) ? 1 : 0));
            C.mon_set_minvis(mon, cursed_potion);
            if (((sawit && !C.canspotmon(mon)) ? 1 : 0)) {
                if (C.cansee(mon.mx, mon.my))
                    C.map_invisible(mon.mx, mon.my);
            } else if (((sawit && cursed_potion) ? 1 : 0)) {
                C.pline("%s briefly seems to be transparent.", C.Monnam(mon));
                /* see use_misc(muse.c) for comment about map_invisible() */
            } else if (((!sawit && C.canspotmon(mon)) ? 1 : 0)) {
                /* if an invisible mon glyph was present, mon_set_minvis()'s
                   newsym() has gotten rid of it */
                C.pline("%s appears!", C.Monnam(mon));
            }
            break;
        }
        case C.POT_SLEEPING:
            /* wakeup() doesn't rouse victims of temporary sleep */
            if (C.sleep_monst(mon, C.rnd(12, 1804, "potionhit"), C.POTION_CLASS)) {
                C.pline("%s falls asleep.", C.Monnam(mon));
                C.slept_monst(mon);
            }
            break;
        case C.POT_PARALYSIS:
            if (mon.mcanmove) {
                /* really should be rnd(5) for consistency with players
                 * breathing potions, but...
                 */
                C.paralyze_monst(mon, C.rnd(25, 1814, "potionhit"));
            }
            break;
        case C.POT_SPEED:
            angermon = C.int(0);
            C.mon_adjust_speed(mon, 1, obj);
            break;
        case C.POT_BLINDNESS:
            if (((C.haseyes(mon.data) && !C.mon_perma_blind(mon)) ? 1 : 0)) {
                let btmp = C.int(C.int((C.int((64) + (C.rn2(32, 1823, "potionhit")))) + (Math.imul(C.rn2(32, 1824, "potionhit"), !C.resist(mon, C.POTION_CLASS, 0, C.NOTELL)))));

                btmp = C.int((btmp) + (mon.mblinded));
                mon.mblinded = (btmp < 127) ? (btmp) : (127);
                mon.mcansee = 0;
            }
            break;
        case C.POT_WATER:
            if (((((C.mon_hates_blessings(mon) /* undead or demon */ || C.is_were(mon.data)) ? 1 : 0) || C.is_vampshifter(mon)) ? 1 : 0)) {
                if (obj.blessed) {
                    C.pline("%s %s in pain!", C.Monnam(mon),
                          C.is_silent(mon.data) ? "writhes" : "shrieks");
                    if (!C.is_silent(mon.data))
                        C.wake_nearto(tx, ty, Math.imul(mon.data.mlevel, 10));
                    mon.mhp = C.int((mon.mhp) - (C.d(2, 6, 1839, "potionhit")));
                    /* should only be by you */
                    if (C.DEADMONSTER(mon))
                        C.killed(mon);
                    else if (((C.is_were(mon.data) && !C.is_human(mon.data)) ? 1 : 0))
                        C.new_were(mon); /* revert to human */
                } else if (obj.cursed) {
                    angermon = C.int(0);
                    if (C.canseemon(mon))
                        C.pline("%s looks healthier.", C.Monnam(mon));
                    C.healmon(mon, C.d(2, 6, 1849, "potionhit"), 0);
                    if (((((C.is_were(mon.data) && C.is_human(mon.data)) ? 1 : 0) && !C.Protection_from_shape_changers) ? 1 : 0))
                        C.new_were(mon); /* transform into beast */
                }
            } else if (C.samePtr(mon.data, C.mons[C.PM_GREMLIN])) {
                angermon = C.int(0);
                C.callLocal(split_mon, mon, 0);
            } else if (C.samePtr(mon.data, C.mons[C.PM_IRON_GOLEM])) {
                if (C.canseemon(mon))
                    C.pline("%s rusts.", C.Monnam(mon));
                mon.mhp = C.int((mon.mhp) - (C.d(1, 6, 1860, "potionhit")));
                /* should only be by you */
                if (C.DEADMONSTER(mon))
                    C.killed(mon);
            }
            break;
        case C.POT_OIL:
            if (obj.lamplit)
                C.explode_oil(obj, tx, ty);
            break;
        case C.POT_ACID:
            if (((!C.resists_acid(mon) && !C.resist(mon, C.POTION_CLASS, 0, C.NOTELL)) ? 1 : 0)) {
                C.pline("%s %s in pain!", C.Monnam(mon),
                      C.is_silent(mon.data) ? "writhes" : "shrieks");
                if (!C.is_silent(mon.data))
                    C.wake_nearto(tx, ty, Math.imul(mon.data.mlevel, 10));
                mon.mhp = C.int((mon.mhp) - (C.d(obj.cursed ? 2 : 1, obj.blessed ? 4 : 8, 1876, "potionhit")));
                if (C.DEADMONSTER(mon)) {
                    if (your_fault)
                        C.killed(mon);
                    else
                        C.monkilled(mon, "", C.AD_ACID);
                }
            }
            break;
        case C.POT_POLYMORPH:
            C.bhitm(mon, obj);
            break;
        /*
        case POT_GAIN_LEVEL:
        case POT_LEVITATION:
        case POT_FRUIT_JUICE:
        case POT_MONSTER_DETECTION:
        case POT_OBJECT_DETECTION:
            break;
        */
        }
        break effect_done;
        }

            angermon = C.int(0);
            if ((mon.mhp < mon.mhpmax)) {
                C.healmon(mon, mon.mhpmax, 0);
                if (C.canseemon(mon))
                    C.pline("%s looks sound and hale again.", C.Monnam(mon));
            }
            if (cureblind)
                C.mcureblindness(mon, C.canseemon(mon));
            
        break effect_done;
        }

            if ((mon.mhp > 2)) {
                mon.mhp = C.int((mon.mhp) / (2));
                if (C.canseemon(mon))
                    C.pline("%s looks rather ill.", C.Monnam(mon));
            }
            
        }
        /* target might have been killed */
        if (!C.DEADMONSTER(mon)) {
            if (angermon)
                C.wakeup(mon, 1);
            else
                mon.msleeping = 0;
        }
    }

    /* Note: potionbreathe() does its own docall() */
    if ((((((distance == 0) || (((distance < 3) && !C.rn2(C.int(((1 + C.ACURR(C.A_DEX))) / (2)), 1907, "potionhit")) ? 1 : 0)) ? 1 : 0) && ((!C.breathless(C.gy.youmonst.data) || C.haseyes(C.gy.youmonst.data)) ? 1 : 0)) ? 1 : 0))
        potionbreathe(obj);
    else if (((obj.dknown && C.cansee(tx, ty)) ? 1 : 0))
        C.trycall(obj);

    if (((C.loadChar(C.u.ushops) && obj.unpaid) ? 1 : 0)) {
        let shkp = C.shop_keeper(C.loadChar(C.in_rooms(C.u.ux, C.u.uy, C.SHOPBASE)));

        /* neither of the first two cases should be able to happen;
           only the hero should ever have an unpaid item, and only
           when inside a tended shop */
        if (!shkp) /* if shkp was killed, unpaid ought to cleared already */
            obj.unpaid = 0;
        else if (C.svc.context.mon_moving) /* obj thrown by monster */
            C.subfrombill(obj, shkp);
        else /* obj thrown by hero */
            C.stolen_value(obj, C.u.ux, C.u.uy, C.boolean(shkp.mpeaceful),
                                0);
    }
    C.obfree(obj, 0);
}

/* vapors are inhaled or get in your eyes */
export function potionbreathe(obj)

{
    let i, ii, isdone, kn = C.int(0);
    let cureblind = C.int(0);
    let already_in_use = C.uint(obj.in_use);

    /* potion of unholy water might be wielded; prevent
       you_were() -> drop_weapon() from dropping it so that it
       remains in inventory where our caller expects it to be */
    obj.in_use = 1;

    /* wearing a wet towel protects both eyes and breathing, even when
       the breath effect might be beneficial; we still pass down to the
       naming opportunity in case potion was thrown at hero by a monster */
    switch (C.Half_gas_damage ? C.TOWEL : obj.otyp) {
    case C.TOWEL:
        C.pline("Some vapor passes harmlessly around you.");
        break;
    case C.POT_RESTORE_ABILITY:
    case C.POT_GAIN_ABILITY:
        if (obj.cursed) {
            if (!C.breathless(C.gy.youmonst.data)) {
                C.pline("Ulch!  That potion smells terrible!");
            } else if (C.haseyes(C.gy.youmonst.data)) {
                let eyes = C.body_part(C.EYE);

                if ((C.eyecount(C.gy.youmonst.data) != 1))
                    eyes = C.makeplural(eyes);
                C.Your("%s %s!", eyes, C.vtense(eyes, "sting"));
            }
            break;
        } else {
            i = C.int(C.rn2(C.A_MAX, 1964, "potionbreathe")); /* start at a random point */
            for (isdone = C.int(ii = C.int(0)); ((!isdone && (ii < C.A_MAX)) ? 1 : 0); ii++) {
                if ((C.u.acurr.a[i] < C.AMAX(i))) {
                    C.u.acurr.a[i]++;
                    /* only first found if not blessed */
                    isdone = C.int(!(obj.blessed));
                    C.disp.botl = C.int(1);
                }
                if ((++i >= C.A_MAX))
                    i = C.int(0);
            }
        }
        break;
    case C.POT_FULL_HEALING:
        if (((C.Upolyd && (C.u.mh < C.u.mhmax)) ? 1 : 0))
            C.u.mh++, C.disp.botl = C.int(1);
        if ((C.u.uhp < C.u.uhpmax))
            C.u.uhp++, C.disp.botl = C.int(1);
        cureblind = C.int(1);
        
        /*FALLTHRU*/
    case C.POT_EXTRA_HEALING:
        if (((C.Upolyd && (C.u.mh < C.u.mhmax)) ? 1 : 0))
            C.u.mh++, C.disp.botl = C.int(1);
        if ((C.u.uhp < C.u.uhpmax))
            C.u.uhp++, C.disp.botl = C.int(1);
        if (!obj.cursed)
            cureblind = C.int(1);
        
        /*FALLTHRU*/
    case C.POT_HEALING:
        if (((C.Upolyd && (C.u.mh < C.u.mhmax)) ? 1 : 0))
            C.u.mh++, C.disp.botl = C.int(1);
        if ((C.u.uhp < C.u.uhpmax))
            C.u.uhp++, C.disp.botl = C.int(1);
        if (obj.blessed)
            cureblind = C.int(1);
        if (cureblind) {
            make_blinded(0n, !C.u.ucreamed);
            make_deaf(0n, 1);
        }
        C.exercise(C.A_CON, 1);
        break;
    case C.POT_SICKNESS:
        if (!C.Role_if(C.PM_HEALER)) {
            if (C.Upolyd) {
                if ((C.u.mh <= 5))
                    C.u.mh = C.int(1);
                else
                    C.u.mh = C.int((C.u.mh) - (5));
            } else {
                if ((C.u.uhp <= 5))
                    C.u.uhp = C.int(1);
                else
                    C.u.uhp = C.int((C.u.uhp) - (5));
            }
            C.disp.botl = C.int(1);
            C.exercise(C.A_CON, 0);
        }
        break;
    case C.POT_HALLUCINATION:
        C.You("have a momentary vision.");
        break;
    case C.POT_CONFUSION:
    case C.POT_BOOZE:
        if (!C.Confusion)
            C.You_feel("somewhat dizzy.");
        make_confused(itimeout_incr(C.HConfusion, C.rnd(5, 2031, "potionbreathe")), 0);
        break;
    case C.POT_INVISIBILITY:
        if (((!C.Blind && !C.Invis) ? 1 : 0)) {
            kn++;
            C.pline("For an instant you %s!",
                  C.See_invisible ? "could see right through yourself"
                                : "couldn't see yourself");
        }
        break;
    case C.POT_PARALYSIS:
        kn++;
        if (!C.Free_action) {
            C.pline("%s seems to be holding you.", C.Something);
            C.nomul(-C.rnd(5, 2045, "potionbreathe"));
            C.gm.multi_reason = "frozen by a potion";
            C.gn.nomovemsg = C.You_can_move_again;
            C.exercise(C.A_DEX, 0);
        } else
            C.You("stiffen momentarily.");
        break;
    case C.POT_SLEEPING:
        kn++;
        if (((!C.Free_action && !C.Sleep_resistance) ? 1 : 0)) {
            C.You_feel("rather tired.");
            C.nomul(-C.rnd(5, 2056, "potionbreathe"));
            C.gm.multi_reason = "sleeping off a magical draught";
            C.gn.nomovemsg = C.You_can_move_again;
            C.exercise(C.A_DEX, 0);
        } else {
            C.You("yawn.");
            C.monstseesu(C.M_SEEN_SLEEP);
        }
        break;
    case C.POT_SPEED:
        if (!C.Fast)
            C.Your("knees seem more flexible now.");
        incr_itimeout(C.propertyReference("HFast"), C.rnd(5, 2068, "potionbreathe"));
        C.exercise(C.A_DEX, 1);
        break;
    case C.POT_BLINDNESS:
        if (((!C.Blind && !C.Unaware) ? 1 : 0)) {
            kn++;
            C.pline("It suddenly gets dark.");
        }
        make_blinded(itimeout_incr(C.BlindedTimeout, C.rnd(5, 2076, "potionbreathe")), 0);
        if (((!C.Blind && !C.Unaware) ? 1 : 0))
            C.Your1(C.vision_clears);
        break;
    case C.POT_WATER:
        if ((C.u.umonnum == C.PM_GREMLIN)) {
            C.callLocal(split_mon, C.gy.youmonst, 0);
        } else if (C.ismnum(C.u.ulycn)) {
            /* vapor from [un]holy water will trigger
               transformation but won't cure lycanthropy */
            if (((obj.blessed && C.samePtr(C.gy.youmonst.data, C.mons[C.u.ulycn])) ? 1 : 0))
                C.you_unwere(0);
            else if (((obj.cursed && !C.Upolyd) ? 1 : 0))
                C.you_were();
        }
        break;
    case C.POT_ACID:
    case C.POT_POLYMORPH:
        C.exercise(C.A_CON, 0);
        break;
    /*
    case POT_GAIN_LEVEL:
    case POT_GAIN_ENERGY:
    case POT_LEVITATION:
    case POT_FRUIT_JUICE:
    case POT_MONSTER_DETECTION:
    case POT_OBJECT_DETECTION:
    case POT_OIL:
        break;
     */
    }

    if (!already_in_use)
        obj.in_use = 0;
    /* note: no obfree() -- that's our caller's responsibility */
    if (obj.dknown) {
        if (kn)
            C.makeknown(obj.otyp);
        else
            C.trycall(obj);
    }
    return;
}

/* returns the potion type when o1 is dipped in o2 */
export function mixtype(o1, o2)

{
    let o1typ = C.int(o1.otyp), o2typ = C.int(o2.otyp);

    /* cut down on the number of cases below */
    if ((((o1.oclass == C.POTION_CLASS) && (((((((((((((o2typ == C.POT_GAIN_LEVEL) || (o2typ == C.POT_GAIN_ENERGY)) ? 1 : 0) || (o2typ == C.POT_HEALING)) ? 1 : 0) || (o2typ == C.POT_EXTRA_HEALING)) ? 1 : 0) || (o2typ == C.POT_FULL_HEALING)) ? 1 : 0) || (o2typ == C.POT_ENLIGHTENMENT)) ? 1 : 0) || (o2typ == C.POT_FRUIT_JUICE)) ? 1 : 0)) ? 1 : 0)) {
        /* swap o1 and o2 */
        o1typ = C.int(o2.otyp);
        o2typ = C.int(o1.otyp);
    }

    switch (o1typ) {
    case C.POT_HEALING:
        if ((o2typ == C.POT_SPEED))
            return C.int(C.POT_EXTRA_HEALING);
        
        /*FALLTHRU*/
    case C.POT_EXTRA_HEALING:
    case C.POT_FULL_HEALING:
        if ((((o2typ == C.POT_GAIN_LEVEL) || (o2typ == C.POT_GAIN_ENERGY)) ? 1 : 0))
            return C.int(((o1typ == C.POT_HEALING)) ? C.POT_EXTRA_HEALING
                   : ((o1typ == C.POT_EXTRA_HEALING)) ? C.POT_FULL_HEALING
                     : C.POT_GAIN_ABILITY);
        
        /*FALLTHRU*/
    case C.UNICORN_HORN:
        switch (o2typ) {
        case C.POT_SICKNESS:
            return C.int(C.POT_FRUIT_JUICE);
        case C.POT_HALLUCINATION:
        case C.POT_BLINDNESS:
        case C.POT_CONFUSION:
            return C.int(C.POT_WATER);
        }
        break;
    case C.AMETHYST: /* "a-methyst" == "not intoxicated" */
        if ((o2typ == C.POT_BOOZE))
            return C.int(C.POT_FRUIT_JUICE);
        break;
    case C.POT_GAIN_LEVEL:
    case C.POT_GAIN_ENERGY:
        switch (o2typ) {
        case C.POT_CONFUSION:
            return C.int(C.rn2(3, 2169, "mixtype") ? C.POT_BOOZE : C.POT_ENLIGHTENMENT);
        case C.POT_HEALING:
            return C.int(C.POT_EXTRA_HEALING);
        case C.POT_EXTRA_HEALING:
            return C.int(C.POT_FULL_HEALING);
        case C.POT_FULL_HEALING:
            return C.int(C.POT_GAIN_ABILITY);
        case C.POT_FRUIT_JUICE:
            return C.int(C.POT_SEE_INVISIBLE);
        case C.POT_BOOZE:
            return C.int(C.POT_HALLUCINATION);
        }
        break;
    case C.POT_FRUIT_JUICE:
        switch (o2typ) {
        case C.POT_SICKNESS:
            return C.int(C.POT_SICKNESS);
        case C.POT_ENLIGHTENMENT:
        case C.POT_SPEED:
            return C.int(C.POT_BOOZE);
        case C.POT_GAIN_LEVEL:
        case C.POT_GAIN_ENERGY:
            return C.int(C.POT_SEE_INVISIBLE);
        }
        break;
    case C.POT_ENLIGHTENMENT:
        switch (o2typ) {
        case C.POT_LEVITATION:
            if (C.rn2(3, 2197, "mixtype"))
                return C.int(C.POT_GAIN_LEVEL);
            break;
        case C.POT_FRUIT_JUICE:
            return C.int(C.POT_BOOZE);
        case C.POT_BOOZE:
            return C.int(C.POT_CONFUSION);
        }
        break;
    }

    return C.int(C.STRANGE_OBJECT);
}

/* getobj callback for object to be dipped (not the thing being dipped into,
 * that uses drink_ok) */
export function dip_ok(obj)

{
    if (!obj)
        return C.int(C.GETOBJ_DOWNPLAY);

    /* dipping gold isn't currently implemented */
    if ((obj.oclass == C.COIN_CLASS))
        return C.int(C.GETOBJ_EXCLUDE);

    if (C.inaccessible_equipment(obj, 0, 0))
        return C.int(C.GETOBJ_EXCLUDE_INACCESS);

    return C.int(C.GETOBJ_SUGGEST);
}

/* getobj callback for object to be dipped when hero has slippery hands */
export function dip_hands_ok(obj)

{
    if (((!obj && ((C.Glib && C.can_reach_floor(0)) ? 1 : 0)) ? 1 : 0))
        return C.int(C.GETOBJ_SUGGEST);

    return C.int(dip_ok(obj));
}

/* call hold_another_object() to deal with a transformed potion; its weight
   won't have changed but it might require an extra slot that isn't available
   or it might merge into some other carried stack */
export function hold_potion(
    potobj,
    drop_fmt, drop_arg,
    hold_msg)

{
    let cap = C.int(C.near_capacity()),
        save_pickup_burden = C.int(C.flags.pickup_burden);

    /* prevent a drop due to current setting of the 'pickup_burden' option */
    if ((C.flags.pickup_burden < cap))
        C.flags.pickup_burden = C.int(cap);
    /* remove from inventory after calculating near_capacity() */
    C.obj_extract_self(potobj);
    /* re-insert into inventory, possibly merging with compatible stack */
    potobj = C.hold_another_object(potobj, drop_fmt, drop_arg, hold_msg);
    C.nhUse(potobj);
    C.flags.pickup_burden = C.int(save_pickup_burden);
    C.update_inventory();
    return;
}

/* #dip command - get item to dip, then get potion to dip it into;
   precede with 'm' to bypass fountain, pool, or sink at hero's spot */
export function dodip()

{
    const Dip_ = "Dip ";
    let potion, obj;
    const qbuf = C.stackAlloc(C.QBUFSZ), obuf = C.stackAlloc(C.QBUFSZ);
    let shortestname; /* last resort obj name for prompt */
    let here = C.int(C.levl[C.u.ux][C.u.uy].typ);
    let is_hands, at_pool = C.int(C.is_pool(C.u.ux, C.u.uy)),
            at_fountain = C.int(C.IS_FOUNTAIN(here)), at_sink = C.int(C.IS_SINK(here)),
            at_here = (C.int(((!C.iflags.menu_requested && ((((at_pool || at_fountain) ? 1 : 0) || at_sink) ? 1 : 0)) ? 1 : 0)));

    obj = C.getobj("dip", at_here ? dip_hands_ok : dip_ok, C.GETOBJ_PROMPT);
    if (!obj)
        return C.int(C.ECMD_CANCEL);
    if (C.inaccessible_equipment(obj, "dip", 0))
        return C.int(C.ECMD_OK);

    is_hands = C.int(C.samePtr(obj, C.hands_obj));
    shortestname = (((((is_hands || C.is_plural(obj)) ? 1 : 0) || C.pair_of(obj)) ? 1 : 0)) ? "them"
                                                                : "it";
    C.drink_ok_extra = C.int(0);
    /*
     * Bypass safe_qbuf() since it doesn't handle varying suffix without
     * an awful lot of support work.  Format the object once, even though
     * the fountain and pool prompts offer a lot more room for it.
     * 3.6.0 used thesimpleoname() unconditionally, which posed no risk
     * of buffer overflow but drew bug reports because it omits user-
     * supplied type name.
     * getobj: "What do you want to dip <the object> into? [xyz or ?*] "
     */
    if (is_hands) {
        C.Snprintf(obuf, C.QBUFSZ, "your %s", C.makeplural(C.body_part(C.HAND)), 1);
    } else {
        C.Strcpy(obuf, C.short_oname(obj, C.doname, C.thesimpleoname,
                                 /* 128 - (24 + 54 + 1) leaves 49 for
                                    <object> */
                                 C.int((C.QBUFSZ) - (C.dipPromptSize))));
    }

    /* preceding #dip with 'm' skips the possibility of dipping into pools,
       fountains, and sinks plus the extra prompting which those entail */
    if (!C.iflags.menu_requested) {
        /* Is there a fountain to dip into here? */
        if (!C.can_reach_floor(0)) {
            ; /* can't dip something into fountain or pool if can't reach */
        } else if (at_fountain) {
            C.Snprintf(qbuf, C.QBUFSZ, "%s%s into the fountain?", Dip_,
                     C.flags.verbose ? obuf : shortestname, 2);
            /* "Dip <the object> into the fountain?" */
            if ((C.y_n(qbuf) == 121)) {
                if (!is_hands)
                    obj.pickup_prev = 0;
                C.dipfountain(obj);
                return C.int(C.ECMD_TIME);
            }
            ++C.drink_ok_extra;
        } else if (at_sink) {
            C.Snprintf(qbuf, C.QBUFSZ, "%s%s into the sink?", Dip_,
                     C.flags.verbose ? obuf : shortestname, 3);
            if ((C.y_n(qbuf) == 121)) {
                if (!is_hands)
                    obj.pickup_prev = 0;
                C.dipsink(obj);
                return C.int(C.ECMD_TIME);
            }
            ++C.drink_ok_extra;
        } else if (at_pool) {
            let pooltype = C.waterbody_name(C.u.ux, C.u.uy);

            C.Snprintf(qbuf, C.QBUFSZ, "%s%s into the %s?", Dip_,
                     C.flags.verbose ? obuf : shortestname, pooltype, 4);
            /* "Dip <the object> into the {pool, moat, &c}?" */
            if ((C.y_n(qbuf) == 121)) {
                if (C.Levitation) {
                    C.floating_above(pooltype);
                } else if (((((C.u.usteed && !C.is_swimmer(C.u.usteed.data)) ? 1 : 0) && (C.P_SKILL(C.P_RIDING) < C.P_BASIC)) ? 1 : 0)) {
                    C.rider_cant_reach(); /* not skilled enough to reach */
                } else if (((is_hands || C.samePtr(obj, C.uarmg)) ? 1 : 0)) {
                    if (!is_hands)
                        obj.pickup_prev = 0;
                    C.wash_hands();
                } else {
                    obj.pickup_prev = 0;
                    if ((obj.otyp == C.POT_ACID))
                        obj.in_use = 1;
                    if ((((C.long(C.water_damage(obj, 0, 1)) != C.long(C.ER_DESTROYED)) && obj.in_use) ? 1 : 0))
                        C.useup(obj);
                }
                return C.int(C.ECMD_TIME);
            }
            ++C.drink_ok_extra;
        }
    }

    /* "What do you want to dip <the object> into? [xyz or ?*] " */
    C.Snprintf(qbuf, C.QBUFSZ, "dip %s into",
             C.flags.verbose ? obuf : shortestname, 5);
    potion = C.getobj(qbuf, drink_ok, C.GETOBJ_NOFLAGS);
    if (!potion)
        return C.int(C.ECMD_CANCEL);
    return C.int(C.callLocal(potion_dip, obj, potion));
}

/* #altdip - #dip with "what to dip?" and "what to dip it into?" asked
   in the opposite order; ignores floor water; used for context-sensitive
   inventory item-action: the potion has already been selected and is in
   cmdq ready to answer the first getobj() prompt */
export function dip_into()

{
    let obj, potion;
    const qbuf = C.stackAlloc(C.QBUFSZ);

    if (!C.cmdq_peek(C.CQ_CANNED)) {
        C.impossible("dip_into: where is potion?");
        return C.int(C.ECMD_FAIL);
    }
    /* note: drink_ok() callback for quaffing is also used to validate
       a potion to dip into */
    C.drink_ok_extra = C.int(0); /* affects drink_ok(): haven't been asked about and
                         * declined to use a floor feature like a fountain */
    potion = C.getobj("dip", drink_ok, C.GETOBJ_NOFLAGS);
    if (((!potion || (potion.oclass != C.POTION_CLASS)) ? 1 : 0))
        return C.int(C.ECMD_CANCEL);

    /* "What do you want to dip into <the potion>? [abc or ?*] " */
    C.Snprintf(qbuf, C.QBUFSZ, "dip into %s%s",
             C.is_plural(potion) ? "one of " : "", C.thesimpleoname(potion), 6);
    obj = C.getobj(qbuf, dip_ok, C.GETOBJ_PROMPT);
    if (!obj)
        return C.int(C.ECMD_CANCEL);
    if (C.inaccessible_equipment(obj, "dip", 0))
        return C.int(C.ECMD_OK);
    return C.int(C.callLocal(potion_dip, obj, potion));
}

export function poof(potion)

{
    if (potion.dknown)
        C.trycall(potion);
    C.useup(potion);
}

/* do dipped potion(s) explode? */
export function dip_potion_explosion(obj, dmg)

{
    dmg = C.int(C.int(dmg));
    if (((((((obj.cursed || (obj.otyp == C.POT_ACID)) ? 1 : 0) || (((obj.otyp == C.POT_OIL) && obj.lamplit) ? 1 : 0)) ? 1 : 0) || !C.rn2((((C.uarmc && (C.uarmc.otyp == C.ALCHEMY_SMOCK)) ? 1 : 0)) ? 30 : 10, 2421, "dip_potion_explosion")) ? 1 : 0)) {
        /* it would be better to use up the whole stack in advance
           of the message, but we can't because we need to keep it
           around for potionbreathe() [and we can't set obj->in_use
           to 'amt' because that's not implemented] */
        obj.in_use = 1;
        C.pline("%sThey explode!", !C.Deaf ? "BOOM!  " : "");
        C.wake_nearto(C.u.ux, C.u.uy, C.long((C.long(C.long((C.long(C.BOLT_LIM) + C.long(1)))) * C.long(C.long((C.long(C.BOLT_LIM) + C.long(1)))))));
        C.exercise(C.A_STR, 0);
        if (((!C.breathless(C.gy.youmonst.data) || C.haseyes(C.gy.youmonst.data)) ? 1 : 0))
            potionbreathe(obj);
        C.useupall(obj);
        C.losehp(dmg, /* not physical damage */
               "alchemic blast", C.KILLED_BY_AN);
        return C.int(1);
    }
    return C.int(0);
}

/* called by dodip() or dip_into() after obj and potion have been chosen */
export function potion_dip(obj, potion)

{
    let singlepotion;
    const qbuf = C.stackAlloc(C.QBUFSZ);
    let mixture;

    if (((C.samePtr(potion, obj) && (C.long(potion.quan) == C.long(1n))) ? 1 : 0)) {
        C.pline("That is a potion bottle, not a Klein bottle!");
        return C.int(C.ECMD_OK);
    }
    if (C.samePtr(obj, C.hands_obj)) {
        C.You("can't fit your %s into the mouth of the bottle!",
            C.body_part(C.HAND));
        return C.int(C.ECMD_OK);
    }

    obj.pickup_prev = 0; /* no longer 'recently picked up' */
    potion.in_use = 1; /* assume it will be used up */
    if ((potion.otyp == C.POT_WATER)) {
        let useeit = C.int(((!C.Blind || ((C.samePtr(obj, C.ublindf) && C.Blindfolded_only) ? 1 : 0)) ? 1 : 0));
        let obj_glows = C.Yobjnam2(obj, "glow");

        if (H2Opotion_dip(potion, obj, useeit, obj_glows)) {
            poof(potion);
            return C.int(C.ECMD_TIME);
        }
    } else if ((((obj.otyp == C.POT_POLYMORPH) || (potion.otyp == C.POT_POLYMORPH)) ? 1 : 0)) {
        /* some objects can't be polymorphed */
        if (C.obj_unpolyable((obj.otyp == C.POT_POLYMORPH) ? potion : obj)) {
            C.pline1(C.nothing_happens);
        } else {
            let save_otyp = C.int(obj.otyp);

            /* KMH, conduct */
            if (!C.u.uconduct.polypiles++)
                C.livelog_printf(C.LL_CONDUCT, "polymorphed %s first item",
                               C.uhis());

            obj = C.poly_obj(obj, C.STRANGE_OBJECT);

            /*
             * obj might be gone:
             *  poly_obj() -> set_wear() -> Amulet_on() -> useup()
             * if obj->otyp is worn amulet and becomes AMULET_OF_CHANGE.
             */
            if (!obj) {
                C.makeknown(C.POT_POLYMORPH);
                return C.int(C.ECMD_TIME);
            } else if ((obj.otyp != save_otyp)) {
                C.makeknown(C.POT_POLYMORPH);
                C.useup(potion);
                C.prinv(0, obj, 0n);
                return C.int(C.ECMD_TIME);
            } else {
                C.pline1(C.nothing_seems_to_happen);
                poof(potion);
                return C.int(C.ECMD_TIME);
            }
        }
        potion.in_use = 0; /* didn't go poof */
        return C.int(C.ECMD_TIME);
    } else if ((((obj.oclass == C.POTION_CLASS) && (obj.otyp != potion.otyp)) ? 1 : 0)) {
        let amt = C.int(C.int(obj.quan));
        let magic;

        mixture = C.int(mixtype(obj, potion));

        magic = C.int(((mixture != C.STRANGE_OBJECT)) ? C.objects[mixture].oc_magic
            : (((C.objects[obj.otyp].oc_magic || C.objects[potion.otyp].oc_magic) ? 1 : 0)));
        C.Strcpy(qbuf, "The"); /* assume full stack */
        if ((amt > obj.odiluted ? 2 : magic ? 3 : 7)) {
            /* Trying to dip multiple potions will usually affect only a
               subset; pick an amount between 3 and 8, inclusive, for magic
               potion result, between 7 and N for non-magic. If diluted
               potions are being dipped, only two are affected; this is a
               balance fix to prevent cheap mass alchemy of the (very
               common) potion of healing into the (very valuable) potion of
               full healing, whilst permitting both healing->extra healing
               and extra healing->full healing. */
            if (obj.odiluted)
                amt = C.int(2);
            else if (magic)
                amt = C.int(C.int((C.rnd(C.int(((amt < 8) ? (amt) : (8)) - (C.int((3) - (1)))), 2524, "potion_dip")) + (C.int((3) - (1))))); /* 1..6 + 2 */
            else
                amt = C.int(C.int((C.rnd(C.int((amt) - (C.int((7) - (1)))), 2526, "potion_dip")) + (C.int((7) - (1))))); /* 1..(N-6) + 6 */

            if ((C.long(C.long(amt)) < C.long(obj.quan))) {
                obj = C.splitobj(obj, C.long(amt));
                C.Sprintf(qbuf, "%ld of the", obj.quan);
            }
        }
        /* [N of] the {obj(s)} mix(es) with [one of] {the potion}... */
        C.pline("%s %s %s with %s%s...", qbuf, C.simpleonames(obj),
              C.otense(obj, "mix"), ((C.long(potion.quan) > C.long(1n))) ? "one of " : "",
              C.thesimpleoname(potion));
        /* get rid of 'dippee' before potential perm_invent updates */
        C.useup(potion); /* now gone */
        /* Mixing potions is dangerous...
           KMH, balance patch -- acid is particularly unstable */
        if (C.callLocal(dip_potion_explosion, obj, C.int((amt) + (C.rnd(9, 2541, "potion_dip")))))
            return C.int(C.ECMD_TIME);

        obj.blessed = obj.cursed = obj.bknown = 0;
        if (((C.Blind || C.Hallucination) ? 1 : 0))
            obj.dknown = 0;

        if ((mixture != C.STRANGE_OBJECT)) {
            obj.otyp = C.int(mixture);
        } else {
            let otmp;

            switch (obj.odiluted ? 1 : C.rnd(8, 2553, "potion_dip")) {
            case 1:
                obj.otyp = C.int(C.POT_WATER);
                break;
            case 2:
            case 3:
                obj.otyp = C.int(C.POT_SICKNESS);
                break;
            case 4:
                otmp = C.mkobj(C.POTION_CLASS, 0);
                obj.otyp = C.int(otmp.otyp);
                /* oil uses obj->age field differently from other potions */
                if ((((obj.otyp == C.POT_OIL) || (otmp.otyp == C.POT_OIL)) ? 1 : 0))
                    C.fixup_oil(obj, otmp);
                C.obfree(otmp, 0);
                break;
            default:
                C.useupall(obj);
                C.pline_The("mixture %sevaporates.",
                          !C.Blind ? "glows brightly and " : "");
                return C.int(C.ECMD_TIME);
            }
        }
        obj.odiluted = (obj.otyp != C.POT_WATER);

        if ((((obj.otyp == C.POT_WATER) && !C.Hallucination) ? 1 : 0)) {
            C.pline_The("mixture bubbles%s.", C.Blind ? "" : ", then clears");
        } else if (!C.Blind) {
            C.pline_The("mixture looks %s.",
                      C.hcolor(C.OBJ_DESCR(C.objects[obj.otyp])));
        }

        /* this is required when 'obj' was split off from a bigger stack,
           so that 'obj' will now be assigned its own inventory slot;
           it has a side-effect of merging 'obj' into another compatible
           stack if there is one, so we do it even when no split has
           been made in order to get the merge result for both cases;
           as a consequence, mixing while Fumbling drops the mixture */
        C.freeinv(obj);
        hold_potion(obj, "You drop %s!", C.doname(obj), 0);
        return C.int(C.ECMD_TIME);
    }

    if ((((((potion.otyp == C.POT_ACID) && (obj.otyp == C.CORPSE)) ? 1 : 0) && (obj.corpsenm == C.PM_LICHEN)) ? 1 : 0)) {
        C.pline("%s %s %s around the edges.", C.The(C.cxname(obj)),
              C.otense(obj, "turn"), C.Blind ? "wrinkled"
                                   : potion.odiluted ? C.hcolor(C.NH_ORANGE)
                                     : C.hcolor(C.NH_RED));
        potion.in_use = 0; /* didn't go poof */
        if (potion.dknown)
            C.trycall(potion);
        return C.int(C.ECMD_TIME);
    }

    if ((((potion.otyp == C.POT_WATER) && (obj.otyp == C.TOWEL)) ? 1 : 0)) {
        C.pline_The("towel soaks it up!");
        /* wetting towel already done via water_damage() in H2Opotion_dip */
        poof(potion);
        return C.int(C.ECMD_TIME);
    }

    if (C.is_poisonable(obj)) {
        if ((((potion.otyp == C.POT_SICKNESS) && !obj.opoisoned) ? 1 : 0)) {
            const buf = C.stackAlloc(C.BUFSZ);

            if ((C.long(potion.quan) > C.long(1n)))
                C.Sprintf(buf, "One of %s", C.the(C.xname(potion)));
            else
                C.Strcpy(buf, C.The(C.xname(potion)));
            C.pline("%s forms a coating on %s.", buf, C.the(C.xname(obj)));
            obj.opoisoned = 1;
            poof(potion);
            return C.int(C.ECMD_TIME);
        } else if (((((obj.opoisoned && !C.permapoisoned(obj)) ? 1 : 0) && (((((potion.otyp == C.POT_HEALING) || (potion.otyp == C.POT_EXTRA_HEALING)) ? 1 : 0) || (potion.otyp == C.POT_FULL_HEALING)) ? 1 : 0)) ? 1 : 0)) {
            C.pline("A coating wears off %s.", C.the(C.xname(obj)));
            obj.opoisoned = 0;
            poof(potion);
            return C.int(C.ECMD_TIME);
        }
    }

    if ((potion.otyp == C.POT_ACID)) {
        if ((C.long(C.erode_obj(obj, 0, C.ERODE_CORRODE, C.EF_GREASE)) != C.long(C.ER_NOTHING))) {
            poof(potion);
            return C.int(C.ECMD_TIME);
        }
    }

    more_dips: if ((potion.otyp == C.POT_OIL)) {
        let wisx = C.int(0);

        if (potion.lamplit) { /* burning */
            C.fire_damage(obj, 1, C.u.ux, C.u.uy);
        } else if (potion.cursed) {
            C.pline_The("potion spills and covers your %s with oil.",
                      C.fingers_or_gloves(1));
            make_glib(C.int((C.int((C.long((C.long(C.Glib) & C.long(C.TIMEOUT)))))) + (C.d(2, 10, 2653, "potion_dip"))));
        } else if ((((obj.oclass != C.WEAPON_CLASS) && !C.is_weptool(obj)) ? 1 : 0)) {
            /* the following cases apply only to weapons */
            break more_dips;
            /* Oil removes rust and corrosion, but doesn't unburn or repair
             * cracks.  Arrows, etc are classed as metallic due to arrowhead
             * material, but dipping in oil shouldn't repair them.
             */
        } else if (((((((!C.is_rustprone(obj) && !C.is_corrodeable(obj)) ? 1 : 0) || C.is_ammo(obj)) ? 1 : 0) || ((!obj.oeroded && !obj.oeroded2) ? 1 : 0)) ? 1 : 0)) {
            /* uses up potion, doesn't set obj->greased */
            if (!C.Blind)
                C.pline("%s %s with an oily sheen.", C.Yname2(obj),
                      C.otense(obj, "gleam"));
            else /*if (!uarmg)*/
                C.pline("%s %s oily.", C.Yname2(obj), C.otense(obj, "feel"));
        } else {
            C.pline("%s %s less %s.", C.Yname2(obj),
                  C.otense(obj, !C.Blind ? "are" : "feel"),
                  (((obj.oeroded && obj.oeroded2) ? 1 : 0))
                      ? "corroded and rusty"
                      : obj.oeroded ? "rusty" : "corroded");
            if ((obj.oeroded > 0))
                obj.oeroded--;
            if ((obj.oeroded2 > 0))
                obj.oeroded2--;
            wisx = C.int(1);
        }
        C.exercise(C.A_WIS, wisx);
        if (potion.dknown)
            C.makeknown(potion.otyp);
        C.useup(potion);
        return C.int(C.ECMD_TIME);
    }

    /* Allow filling of MAGIC_LAMPs to prevent identification by player */
    if ((((((obj.otyp == C.OIL_LAMP) || (obj.otyp == C.MAGIC_LAMP)) ? 1 : 0) && (potion.otyp == C.POT_OIL)) ? 1 : 0)) {
        /* Turn off engine before fueling, turn off fuel too :-)  */
        if (((obj.lamplit || potion.lamplit) ? 1 : 0)) {
            C.useup(potion);
            C.explode(C.u.ux, C.u.uy, 11, C.d(6, 6, 2695, "potion_dip"), 0, C.EXPL_FIERY);
            C.exercise(C.A_WIS, 0);
            return C.int(C.ECMD_TIME);
        }
        /* Adding oil to an empty magic lamp renders it into an oil lamp */
        if ((((obj.otyp == C.MAGIC_LAMP) && (obj.spe == 0)) ? 1 : 0)) {
            obj.otyp = C.int(C.OIL_LAMP);
            obj.age = C.long(0);
        }
        if ((C.long(obj.age) > C.long(1000n))) {
            C.pline("%s %s full.", C.Yname2(obj), C.otense(obj, "are"));
            potion.in_use = 0; /* didn't go poof */
        } else {
            C.You("fill %s with oil.", C.yname(obj));
            C.check_unpaid(potion);        /* Yendorian Fuel Tax */
            /* burns more efficiently in a lamp than in a bottle;
               diluted potion provides less benefit but we don't attempt
               to track that the lamp now also has some non-oil in it */
            obj.age = C.long(C.long(C.long(obj.age) + C.long(C.long((C.long(C.long((C.long(!potion.odiluted ? 4n : 3n) * C.long(potion.age)))) / C.long(2n))))));
            if ((C.long(obj.age) > C.long(1500n)))
                obj.age = C.long(1500n);
            C.useup(potion);
            C.exercise(C.A_WIS, 1);
        }
        if (potion.dknown)
            C.makeknown(C.POT_OIL);
        obj.spe = C.int(1);
        C.update_inventory();
        return C.int(C.ECMD_TIME);
    }

    potion.in_use = 0; /* didn't go poof */
    if ((((((obj.otyp == C.UNICORN_HORN) || (obj.otyp == C.AMETHYST)) ? 1 : 0) && ((mixture = C.int(mixtype(obj, potion))) != C.STRANGE_OBJECT)) ? 1 : 0)) {
        const oldbuf = C.stackAlloc(C.BUFSZ), newbuf = C.stackAlloc(C.BUFSZ);
        let old_otyp = C.int(potion.otyp);
        let old_dknown = C.int(0);
        let more_than_one = C.int((C.long(potion.quan) > C.long(1n)));

        C.storeChar(oldbuf, 0);
        if (potion.dknown) {
            old_dknown = C.int(1);
            C.Sprintf(oldbuf, "%s ", C.hcolor(C.OBJ_DESCR(C.objects[potion.otyp])));
        }
        /* with multiple merged potions, split off one and
           just clear it */
        if ((C.long(potion.quan) > C.long(1n))) {
            singlepotion = C.splitobj(potion, 1n);
        } else
            singlepotion = potion;

        C.costly_alteration(singlepotion, C.COST_NUTRLZ);
        singlepotion.otyp = C.int(mixture);
        singlepotion.blessed = 0;
        if ((mixture == C.POT_WATER))
            singlepotion.cursed = singlepotion.odiluted = 0;
        else
            singlepotion.cursed = obj.cursed; /* odiluted left as-is */
        singlepotion.bknown = 0;
        singlepotion.dknown = 0; /* provisionally */
        if (!C.Blind) {
            if (!C.Hallucination)
                C.observe_object(singlepotion);
            C.storeChar(newbuf, 0);
            if ((((mixture == C.POT_WATER) && singlepotion.dknown) ? 1 : 0))
                C.Sprintf(newbuf, "clears");
            else if (!C.Blind)
                C.Sprintf(newbuf, "turns %s",
                        C.hcolor(C.OBJ_DESCR(C.objects[mixture])));
            if (C.loadChar(newbuf))
                C.pline_The("%spotion%s %s.", oldbuf,
                          more_than_one ? " that you dipped into" : "",
                          newbuf);
            else
                C.pline("Something happens.");

            if (((((old_dknown && !C.objects[old_otyp].oc_name_known) ? 1 : 0) && !C.objects[old_otyp].oc_uname) ? 1 : 0)) {
                const fakeobj = C.objectLocal();

                C.copyStruct(fakeobj, C.zeroobj, C.objSize);
                fakeobj.dknown = 1; /* no need to observe_object */
                fakeobj.otyp = old_otyp;
                fakeobj.oclass = C.POTION_CLASS;
                C.docall(fakeobj);
            }
        }
        /* remove potion from inventory and re-insert it, possibly stacking
           with compatible ones; override 'pickup_burden' while doing so */
        hold_potion(singlepotion, "You juggle and drop %s!",
                    C.doname(singlepotion), 0);
        return C.int(C.ECMD_TIME);
    }

    C.pline("Interesting...");
    return C.int(C.ECMD_TIME);
}

/* *monp grants a wish and then leaves the game */
export function mongrantswish(monp)

{
    let mon = monp.value;
    let mx = C.int(mon.mx), my = C.int(mon.my), glyph = C.int(C.glyph_at(mx, my));

    /* remove the monster first in case wish proves to be fatal
       (blasted by artifact), to keep it out of resulting bones file */
    C.mongone(mon);
    monp.value = 0; /* inform caller that monster is gone */
    /* hide that removal from player--map is visible during wish prompt */
    C.tmp_at(C.DISP_ALWAYS, glyph);
    C.tmp_at(mx, my);
    /* grant the wish */
    C.makewish();
    /* clean up */
    C.tmp_at(C.DISP_END, 0);
}

export function djinni_from_bottle(obj)

{
    const mtmp = C.monPointerLocal(0);
    let chance;

    if (!(mtmp.value = C.makemon(C.mons[C.PM_DJINNI], C.u.ux, C.u.uy, C.MM_NOMSG))) {
        C.pline("It turns out to be empty.");
        return;
    }

    if (!C.Blind) {
        C.pline("In a cloud of smoke, %s emerges!", C.a_monnam(mtmp.value));
        C.pline("%s speaks.", C.Monnam(mtmp.value));
    } else {
        C.You("smell acrid fumes.");
        C.pline("%s speaks.", C.Something);
    }

    chance = C.int(C.rn2(5, 2833, "djinni_from_bottle"));
    if (obj.blessed)
        chance = C.int(((chance == 4)) ? C.rnd(4, 2835, "djinni_from_bottle") : 0);
    else if (obj.cursed)
        chance = C.int(((chance == 0)) ? C.rn2(4, 2837, "djinni_from_bottle") : 4);
    /* 0,1,2,3,4:  b=80%,5,5,5,5; nc=20%,20,20,20,20; c=5%,5,5,5,80 */

    
    switch (chance) {
    case 0:
        C.verbalize("I am in your debt.  I will grant one wish!");
        /* give a wish and discard the monster (mtmp set to null) */
        mongrantswish(mtmp);
        break;
    case 1:
        C.verbalize("Thank you for freeing me!");
        C.tamedog(mtmp.value, 0, 0);
        break;
    case 2:
        C.verbalize("You freed me!");
        mtmp.value.mpeaceful = 1;
        C.set_malign(mtmp.value);
        break;
    case 3:
        C.verbalize("It is about time!");
        if (C.canspotmon(mtmp.value))
            C.pline("%s vanishes.", C.Monnam(mtmp.value));
        C.mongone(mtmp.value);
        break;
    default:
        C.verbalize("You disturbed me, fool!");
        mtmp.value.mpeaceful = 0;
        C.set_malign(mtmp.value);
        break;
    }
}

/* clone a gremlin or mold (2nd arg non-null implies heat as the trigger);
   hit points are cut in half (odd HP stays with original) */
export function split_mon(
    mon,  /* monster being split */
    mtmp)
 /* optional attacker whose heat triggered it */
{
    let mtmp2;
    const reason = C.stackAlloc(C.BUFSZ);

    C.storeChar(reason, 0);
    if (mtmp)
        C.Sprintf(reason, " from %s heat",
                (C.samePtr(mtmp, C.gy.youmonst)) ? C.the_your[1]
                                    : C.s_suffix(C.mon_nam(mtmp)));

    if (C.samePtr(mon, C.gy.youmonst)) {
        if ((C.u.mh > C.u.mhmax)) /* sanity precaution */
            C.u.mh = C.int(C.u.mhmax);
        mtmp2 = ((C.u.mh > 1)) ? C.cloneu() : 0;
        if (mtmp2) {
            /* mtmp2 has been created with mhpmax = u.mhmax, mhp = u.mh / 2,
               and u.mh -= mtmp2->mhp; these reductions for both max hp
               can't make either of them exceed corresponding current hp */
            mtmp2.mhpmax = C.int(C.int((C.u.mhmax) / (2)));
            C.u.mhmax = C.int((C.u.mhmax) - (mtmp2.mhpmax));
            C.disp.botl = C.int(1);
            C.You("multiply%s!", reason);
        }
    } else {
        if ((mon.mhp > mon.mhpmax)) /* sanity precaution */
            mon.mhp = C.int(mon.mhpmax);
        mtmp2 = ((mon.mhp > 1)) ? C.clone_mon(mon, 0, 0) : 0;
        if (mtmp2) {
            C.assert((mon.mhpmax >= mon.mhp)); /* mon->mhpmax > 1 */
            /* mtmp2 has been created with mhpmax = mon->mhpmax,
               mhp = mon->mhp / 2, and mon->mh -= mtmp2->mhp;
               dividing max by 2 can't result in it exceeding current */
            mtmp2.mhpmax = C.int(C.int((mon.mhpmax) / (2)));
            mon.mhpmax = C.int((mon.mhpmax) - (mtmp2.mhpmax));
            if (C.canspotmon(mon))
                C.pline("%s multiplies%s!", C.Monnam(mon), reason);
        }
    }
    return mtmp2;
}

/* Character becomes very fast temporarily. */
export function speed_up(duration)

{
    duration = C.long(C.long(duration));
   if (!C.Very_fast)
       C.You("are suddenly moving %sfaster.", C.Fast ? "" : "much ");
   else
       C.Your("%s get new energy.", C.makeplural(C.body_part(C.LEG)));

   C.exercise(C.A_DEX, 1);
   incr_itimeout(C.propertyReference("HFast"), duration);
}

/*potion.c*/
