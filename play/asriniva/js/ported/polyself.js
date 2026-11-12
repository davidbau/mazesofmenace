/* NetHack 5.0	polyself.c	$NHDT-Date: 1772101811 2026/02/26 02:30:11 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.227 $ */
/*      Copyright (C) 1987, 1988, 1989 by Ken Arromdee */
/* NetHack may be freely redistributed.  See license for details. */

/*
 * Polymorph self routine.
 *
 * Note:  the light source handling code assumes that gy.youmonst.m_id
 * always remains 1 and gy.youmonst.mx will always remain 0 when it handles
 * the case of the player polymorphed into a light-emitting monster.
 *
 * Transformation sequences:
 *              /-> polymon                 poly into monster form
 *    polyself =
 *              \-> newman -> polyman       fail to poly, get human form
 *
 *    rehumanize -> polyman                 return to original form
 *
 *    polymon (called directly)             usually golem petrification
 */

import { C } from '../c-runtime/context.js';


export const no_longer_petrify_resistant =
    "No longer petrify-resistant, you";

/* update the gy.youmonst.data structure pointer and intrinsics */
export function set_uasmon()
{
    let mdat = C.mons[C.u.umonnum];
    let was_vampshifter = C.valid_vampshiftform(C.gy.youmonst.cham, C.u.umonnum);

    C.set_mon_data(C.gy.youmonst, mdat);
    C.gy.youmonst.m_id = 1;

    if (C.Protection_from_shape_changers)
        C.gy.youmonst.cham = C.NON_PM;
    else if (C.is_vampire(C.gy.youmonst.data))
        C.gy.youmonst.cham = C.gy.youmonst.mnum;
    /* assume hero-as-chameleon/doppelganger/sandestin doesn't change shape */
    else if (!was_vampshifter)
        C.gy.youmonst.cham = C.NON_PM;
    C.u.mcham = C.gy.youmonst.cham; /* for save/restore since youmonst isn't */



    if (((C.gy.youmonst.data.mresists & (C.MR_FIRE)) != 0)) C.u.uprops[C.FIRE_RES].intrinsic |= C.FROMFORM; else C.u.uprops[C.FIRE_RES].intrinsic &= ~C.FROMFORM;
    if (((C.gy.youmonst.data.mresists & ( C.MR_COLD)) != 0)) C.u.uprops[C.COLD_RES].intrinsic |= C.FROMFORM; else C.u.uprops[C.COLD_RES].intrinsic &= ~C.FROMFORM;
    if (((C.gy.youmonst.data.mresists & (C.MR_SLEEP)) != 0)) C.u.uprops[C.SLEEP_RES].intrinsic |= C.FROMFORM; else C.u.uprops[C.SLEEP_RES].intrinsic &= ~C.FROMFORM;
    if (((C.gy.youmonst.data.mresists & (C.MR_DISINT)) != 0)) C.u.uprops[C.DISINT_RES].intrinsic |= C.FROMFORM; else C.u.uprops[C.DISINT_RES].intrinsic &= ~C.FROMFORM;
    if (((C.gy.youmonst.data.mresists & (C.MR_ELEC)) != 0)) C.u.uprops[C.SHOCK_RES].intrinsic |= C.FROMFORM; else C.u.uprops[C.SHOCK_RES].intrinsic &= ~C.FROMFORM;
    if (((C.gy.youmonst.data.mresists & (C.MR_POISON)) != 0)) C.u.uprops[C.POISON_RES].intrinsic |= C.FROMFORM; else C.u.uprops[C.POISON_RES].intrinsic &= ~C.FROMFORM;
    if (((C.gy.youmonst.data.mresists & (C.MR_ACID)) != 0)) C.u.uprops[C.ACID_RES].intrinsic |= C.FROMFORM; else C.u.uprops[C.ACID_RES].intrinsic &= ~C.FROMFORM;
    if (((C.gy.youmonst.data.mresists & (C.MR_STONE)) != 0)) C.u.uprops[C.STONE_RES].intrinsic |= C.FROMFORM; else C.u.uprops[C.STONE_RES].intrinsic &= ~C.FROMFORM;
    {
        /* resists_drli() takes wielded weapon into account; suppress it */
        let save_uwep = C.uwep;

        C.uwep = 0;
        if (C.resists_drli(C.gy.youmonst)) C.u.uprops[C.DRAIN_RES].intrinsic |= C.FROMFORM; else C.u.uprops[C.DRAIN_RES].intrinsic &= ~C.FROMFORM;
        C.uwep = save_uwep;
    }
    /* resists_magm() takes wielded, worn, and carried equipment into
       into account; cheat and duplicate its monster-specific part */
    if ((C.dmgtype(mdat, C.AD_MAGM)
                        || mdat == C.mons[C.PM_BABY_GRAY_DRAGON]
                        || C.dmgtype(mdat, C.AD_RBRE))) C.u.uprops[C.ANTIMAGIC].intrinsic |= C.FROMFORM; else C.u.uprops[C.ANTIMAGIC].intrinsic &= ~C.FROMFORM;
    if ((mdat.mlet == C.S_FUNGUS || mdat == C.mons[C.PM_GHOUL])) C.u.uprops[C.SICK_RES].intrinsic |= C.FROMFORM; else C.u.uprops[C.SICK_RES].intrinsic &= ~C.FROMFORM;

    if ((mdat == C.mons[C.PM_STALKER] || C.is_bat(mdat))) C.u.uprops[C.STUNNED].intrinsic |= C.FROMFORM; else C.u.uprops[C.STUNNED].intrinsic &= ~C.FROMFORM;
    if (C.dmgtype(mdat, C.AD_HALU)) C.u.uprops[C.HALLUC_RES].intrinsic |= C.FROMFORM; else C.u.uprops[C.HALLUC_RES].intrinsic &= ~C.FROMFORM;
    if (C.perceives(mdat)) C.u.uprops[C.SEE_INVIS].intrinsic |= C.FROMFORM; else C.u.uprops[C.SEE_INVIS].intrinsic &= ~C.FROMFORM;
    if (C.telepathic(mdat)) C.u.uprops[C.TELEPAT].intrinsic |= C.FROMFORM; else C.u.uprops[C.TELEPAT].intrinsic &= ~C.FROMFORM;
    /* note that Infravision uses mons[race] rather than usual mons[role] */
    if (C.infravision(C.Upolyd ? mdat : C.mons[C.gu.urace.mnum])) C.u.uprops[C.INFRAVISION].intrinsic |= C.FROMFORM; else C.u.uprops[C.INFRAVISION].intrinsic &= ~C.FROMFORM;
    if (C.pm_invisible(mdat)) C.u.uprops[C.INVIS].intrinsic |= C.FROMFORM; else C.u.uprops[C.INVIS].intrinsic &= ~C.FROMFORM;
    if (C.can_teleport(mdat)) C.u.uprops[C.TELEPORT].intrinsic |= C.FROMFORM; else C.u.uprops[C.TELEPORT].intrinsic &= ~C.FROMFORM;
    if (C.control_teleport(mdat)) C.u.uprops[C.TELEPORT_CONTROL].intrinsic |= C.FROMFORM; else C.u.uprops[C.TELEPORT_CONTROL].intrinsic &= ~C.FROMFORM;
    if (C.is_floater(mdat)) C.u.uprops[C.LEVITATION].intrinsic |= C.FROMFORM; else C.u.uprops[C.LEVITATION].intrinsic &= ~C.FROMFORM;
    /* floating eye is the only 'floater'; it is also flagged as a 'flyer';
       suppress flying for it so that enlightenment doesn't confusingly
       show latent flight capability always blocked by levitation */
    if ((C.is_flyer(mdat) && !C.is_floater(mdat))) C.u.uprops[C.FLYING].intrinsic |= C.FROMFORM; else C.u.uprops[C.FLYING].intrinsic &= ~C.FROMFORM;
    if (C.is_swimmer(mdat)) C.u.uprops[C.SWIMMING].intrinsic |= C.FROMFORM; else C.u.uprops[C.SWIMMING].intrinsic &= ~C.FROMFORM;
    /* [don't touch MAGICAL_BREATHING here; both Amphibious and Breathless
       key off of it but include different monster forms...] */
    if (C.passes_walls(mdat)) C.u.uprops[C.PASSES_WALLS].intrinsic |= C.FROMFORM; else C.u.uprops[C.PASSES_WALLS].intrinsic &= ~C.FROMFORM;
    if (C.regenerates(mdat)) C.u.uprops[C.REGENERATION].intrinsic |= C.FROMFORM; else C.u.uprops[C.REGENERATION].intrinsic &= ~C.FROMFORM;
    if ((mdat == C.mons[C.PM_SILVER_DRAGON])) C.u.uprops[C.REFLECTING].intrinsic |= C.FROMFORM; else C.u.uprops[C.REFLECTING].intrinsic &= ~C.FROMFORM;
    if (!C.haseyes(mdat)) C.u.uprops[C.BLINDED].intrinsic |= C.FROMFORM; else C.u.uprops[C.BLINDED].intrinsic &= ~C.FROMFORM;
    if ((C.dmgtype_fromattack(mdat, C.AD_BLND, C.AT_EXPL)
                       || C.dmgtype_fromattack(mdat, C.AD_BLND, C.AT_GAZE))) C.u.uprops[C.BLND_RES].intrinsic |= C.FROMFORM; else C.u.uprops[C.BLND_RES].intrinsic &= ~C.FROMFORM;

    /* whether the player is flying/floating depends on their steed,
       which won't be known during the restore process: but BFlying
       and BStealth should be set correctly already in that case, so
       there's nothing to do */
    if (!C.program_state.restoring)
        C.callLocal(float_vs_flight); /* maybe toggle (BFlying & I_SPECIAL) */
    C.callLocal(polysense);

// #ifdef STATUS_HILITES
    if (C.VIA_WINDOWPORT())
        C.status_initialize(C.REASSESS_ONLY);
// #endif
    /* we can reset this now, having just done what it is meant to trigger */
    C.gw.were_changes = 0n;
}

/* Levitation overrides Flying; set or clear BFlying|I_SPECIAL */
export function float_vs_flight()
{
    let stuck_in_floor = (Number(Boolean(C.u.utrap && C.u.utraptype != C.TT_PIT)));

    /* floating overrides flight; so does being trapped in the floor */
    if ((C.HLevitation || C.ELevitation)
        || ((C.HFlying || C.EFlying) && stuck_in_floor))
        C.BFlying |= C.I_SPECIAL;
    else
        C.BFlying &= ~C.I_SPECIAL;
    /* being trapped on the ground (bear trap, web, molten lava survived
       with fire resistance, former lava solidified via cold, tethered
       to a buried iron ball) overrides floating--the floor is reachable */
    if ((C.HLevitation || C.ELevitation) && stuck_in_floor)
        C.BLevitation |= C.I_SPECIAL;
    else
        C.BLevitation &= ~C.I_SPECIAL;

    /* riding blocks stealth unless hero+steed fly, so a change in flying
       might cause a change in stealth */
    C.callLocal(steed_vs_stealth);

    C.disp.botl = 1;
}

/* riding blocks stealth unless hero+steed fly */
export function steed_vs_stealth()
{
    if (C.u.usteed && !C.Flying && !C.Levitation)
        C.BStealth |= C.FROMOUTSIDE;
    else
        C.BStealth &= ~C.FROMOUTSIDE;
}

/* for changing into form that's immune to strangulation */
export function check_strangling(on)
{
    on = C.boolean(on);
    /* on -- maybe resume strangling */
    if (on) {
        let was_strangled = (C.Strangled != 0n);

        /* when Strangled is already set, polymorphing from one
           vulnerable form into another causes the counter to be reset */
        if (C.uamul && C.uamul.otyp == C.AMULET_OF_STRANGULATION
            && C.can_be_strangled(C.gy.youmonst)) {
            C.Strangled = 6n;
            C.disp.botl = 1;
            C.Your("%s %s your %s!", C.simpleonames(C.uamul),
                 was_strangled ? "still constricts" : "begins constricting",
                 C.callLocal(body_part, C.NECK)); /* "throat" */
            C.makeknown(C.AMULET_OF_STRANGULATION);
        }

    /* off -- maybe block strangling */
    } else {
        if (C.Strangled && !C.can_be_strangled(C.gy.youmonst)) {
            C.Strangled = 0n;
            C.disp.botl = 1;
            C.You("are no longer being strangled.");
        }
    }
}



/* make a (new) human out of the player */
export function polyman(fmt, arg)
{
    fmt = C.charPointer(fmt);arg = C.charPointer(arg);
    let sticking = (Number(Boolean(C.sticks(C.gy.youmonst.data) && C.u.ustuck && !C.u.uswallow))),
            was_mimicking = (C.U_AP_TYPE != C.M_AP_NOTHING);
    let was_blind = !!C.Blind,
            had_see_invis = !!C.See_invisible;

    if (C.Upolyd) {
        C.u.acurr = C.u.macurr; /* restore old attribs */
        C.u.amax = C.u.mamax;
        C.u.umonnum = C.u.umonster;
        C.flags.female = C.u.mfemale;
    }
    C.callLocal(set_uasmon);

    C.u.mh = C.u.mhmax = 0;
    C.u.mtimedone = 0;
    C.callLocal(skinback, 0);
    C.u.uundetected = 0;

    if (sticking)
        C.callLocal(uunstick);
    C.find_ac();
    if (was_mimicking) {
        if (C.gm.multi < 0)
            C.unmul("");
        C.gy.youmonst.m_ap_type = C.M_AP_NOTHING;
        C.gy.youmonst.mappearance = 0;
    }

    C.newsym(C.u.ux, C.u.uy);

    C.urgent_pline(fmt, arg);
    /* check whether player foolishly genocided self while poly'd */
    if (C.callLocal(ugenocided)) {
        /* intervening activity might have clobbered genocide info */
        let kptr = C.find_delayed_killer(C.POLYMORPH);

        if (kptr != 0 && C.loadChar(kptr.name)) {
            C.svk.killer.format = kptr.format;
            C.Strcpy(C.svk.killer.name, kptr.name);
        } else {
            C.svk.killer.format = C.KILLED_BY;
            C.Strcpy(C.svk.killer.name, "self-genocide");
        }
        C.dealloc_killer(kptr);
        C.done(C.GENOCIDED);
    }

    if (!!C.See_invisible ^ had_see_invis)
        C.set_mimic_blocking(); /* See_invisible just toggled */

    if (C.u.twoweap && !C.could_twoweap(C.gy.youmonst.data))
        C.untwoweapon();

    if (C.u.utrap && C.u.utraptype == C.TT_PIT) {
        C.set_utrap(C.rn1(() => (6), () => ( 2), 0), C.TT_PIT); /* time to escape resets */
    }
    if (was_blind && !C.Blind) { /* reverting from eyeless */
        C.set_itimeout(C.propertyReference('HBlinded'), 1n);
        C.make_blinded(0n, 1); /* remove blindness */
    }
    C.callLocal(check_strangling, 1);

    if (!C.Levitation && !C.u.ustuck && C.is_pool_or_lava(C.u.ux, C.u.uy))
        C.spoteffects(1);

    C.see_monsters();
}



export function change_sex()
{
    /* Some monsters are always of one sex and their sex can't be changed;
     * Succubi/incubi can change, but are handled below.
     *
     * !Upolyd check necessary because is_male() and is_female()
     * may be true for certain roles
     */
    if (!C.Upolyd
        || (!C.is_male(C.gy.youmonst.data) && !C.is_female(C.gy.youmonst.data)
            && !C.is_neuter(C.gy.youmonst.data)))
        C.flags.female = !C.flags.female;
    if (C.Upolyd) /* poly'd: also change saved sex */
        C.u.mfemale = !C.u.mfemale;
    C.max_rank_sz(); /* [this appears to be superfluous] */
    if ((C.Upolyd ? C.u.mfemale : C.flags.female) && C.gu.urole.name.f)
        C.Strcpy(C.svp.pl_character, C.gu.urole.name.f);
    else
        C.Strcpy(C.svp.pl_character, C.gu.urole.name.m);
    if (!C.Upolyd) {
        C.u.umonnum = C.u.umonster;
    } else if (C.u.umonnum == C.PM_AMOROUS_DEMON) {
        C.flags.female = !C.flags.female;
// #if 0
//         /* change monster type to match new sex; disabled with
//            PM_AMOROUS_DEMON */
//         u.umonnum = (u.umonnum == PM_SUCCUBUS) ? PM_INCUBUS : PM_SUCCUBUS;
// #endif
        C.callLocal(set_uasmon);
    }
}

/* log a message if non-poly'd hero's gender has changed */
export function livelog_newform(viapoly, oldgend, newgend)
{
    viapoly = C.boolean(viapoly);oldgend = C.int(oldgend);newgend = C.int(newgend);
    const buf = C.stackAlloc(C.BUFSZ);
    let oldrole, oldrank, newrole, newrank;

    /*
     * TODO?
     *  Give other logging feedback here instead of in newman().
     */

    if (!C.Upolyd) {
        if (newgend != oldgend) {
            oldrole = (oldgend && C.gu.urole.name.f) ? C.gu.urole.name.f
                                                  : C.gu.urole.name.m;
            newrole = (newgend && C.gu.urole.name.f) ? C.gu.urole.name.f
                                                  : C.gu.urole.name.m;
            oldrank = C.rank_of(C.u.ulevel, C.Role_switch, oldgend);
            newrank = C.rank_of(C.u.ulevel, C.Role_switch, newgend);
            C.Sprintf(buf, "%.10s %.30s", C.genders[C.flags.female].adj, newrank);
            C.livelog_printf(C.LL_MINORAC, "%s into %s",
                           viapoly ? "polymorphed" : "transformed",
                           C.an(C.strcmp(newrole, oldrole) ? newrole
                              : C.strcmp(newrank, oldrank) ? newrank
                                : buf));
        }
    }
}

export function newman()
{
    dead: {

    let newform;
    let i, oldlvl, newlvl, oldgend, newgend, hpmax, enmax;

    oldlvl = C.u.ulevel;
    newlvl = oldlvl + C.rn1(() => (5), () => ( -2), 1);     /* new = old + {-2,-1,0,+1,+2} */
    if (newlvl > 127 || newlvl < 1) { /* level went below 0? */
        break dead; /* old level is still intact (in case of lifesaving) */
    }
    if (newlvl > C.MAXULEV)
        newlvl = C.MAXULEV;
    /* If your level goes down, your peak level goes down by
       the same amount so that you can't simply use blessed
       full healing to undo the decrease.  But if your level
       goes up, your peak level does *not* undergo the same
       adjustment; you might end up losing out on the chance
       to regain some levels previously lost to other causes. */
    if (newlvl < oldlvl)
        C.u.ulevelmax -= (oldlvl - newlvl);
    if (C.u.ulevelmax < newlvl)
        C.u.ulevelmax = newlvl;
    C.u.ulevel = newlvl;

    oldgend = C.callLocal(poly_gender);
    if (C.gs.sex_change_ok && !C.rn2(() => (10), 2))
        C.callLocal(change_sex);

    C.adjabil(oldlvl, C.int(C.u.ulevel));

    /* random experience points for the new experience level */
    C.u.uexp = C.rndexp(0);

    /* set up new attribute points (particularly Con) */
    C.redist_attr();

    /*
     * New hit points:
     *  remove "level gain"-based HP from any extra HP accumulated
     *  (the "extra" might actually be negative);
     *  modify the extra, retaining {80%, 90%, 100%, or 110%};
     *  add in newly generated set of level-gain HP.
     *
     * (This used to calculate new HP in direct proportion to old HP,
     * but that was subject to abuse:  accumulate a large amount of
     * extra HP, drain level down to 1, then polyself to level 2 or 3
     * [lifesaving capability needed to handle level 0 and -1 cases]
     * and the extra got multiplied by 2 or 3.  Repeat the level
     * drain and polyself steps until out of lifesaving capability.)
     */
    hpmax = C.u.uhpmax;
    for (i = 0; i < oldlvl; i++)
        hpmax -= C.int(C.u.uhpinc[i]);
    /* hpmax * rn1(4,8) / 10; 0.95*hpmax on average */
    hpmax = C.rounddiv(C.long(hpmax) * C.long(C.rn1(() => (4), () => ( 8), 3)), 10);
    for (i = 0; (C.u.ulevel = i) < newlvl; i++)
        hpmax += C.newhp();
    if (hpmax < C.u.ulevel)
        hpmax = C.u.ulevel; /* min of 1 HP per level */
    /* retain same proportion for current HP; u.uhp * hpmax / u.uhpmax */
    C.u.uhp = C.rounddiv(C.long(C.u.uhp) * C.long(hpmax), C.u.uhpmax);
    C.setuhpmax(hpmax, 1); /* might reduce u.uhp */
    /*
     * Do the same for spell power.
     */
    enmax = C.u.uenmax;
    for (i = 0; i < oldlvl; i++)
        enmax -= C.int(C.u.ueninc[i]);
    enmax = C.rounddiv(C.long(enmax) * C.long(C.rn1(() => (4), () => ( 8), 4)), 10);
    for (i = 0; (C.u.ulevel = i) < newlvl; i++)
        enmax += C.newpw();
    if (enmax < C.u.ulevel)
        enmax = C.u.ulevel;
    C.u.uen = C.rounddiv(C.long(C.u.uen) * C.long(enmax),
                     ((C.u.uenmax < 1) ? 1 : C.u.uenmax));
    C.u.uenmax = enmax;
    /* [should alignment record be tweaked too?] */

    C.u.uhunger = C.rn1(() => (500), () => ( 500), 5);
    if (C.Sick)
        C.make_sick(0n, 0, 0, C.SICK_ALL);
    if (C.Stoned)
        C.make_stoned(0n, 0, 0, 0);
    if (C.u.uhp <= 0) {
        if (C.Polymorph_control) { /* even when Stunned || Unaware */
            if (C.u.uhp <= 0)
                C.u.uhp = 1;
        } else {
            break dead;
        }
    }
    C.newuhs(0);
    /* use saved gender we're about to revert to, not current */
    newform = ((C.Upolyd ? C.u.mfemale : C.flags.female) && C.gu.urace.individual.f)
                ? C.gu.urace.individual.f
                : (C.gu.urace.individual.m)
                   ? C.gu.urace.individual.m
                   : C.gu.urace.noun;
    C.callLocal(polyman, "You feel like a new %s!", newform);

    newgend = C.callLocal(poly_gender);
    /* note: newman() bypasses achievements for new ranks attained and
       doesn't log "new <form>" when that isn't accompanied by level change */
    if (newlvl != oldlvl)
        C.livelog_printf(C.LL_MINORAC, "became experience level %d as a new %s",
                       newlvl, newform);
    else
        C.callLocal(livelog_newform, 1, oldgend, newgend);

    if (C.Slimed) {
        C.Your("body transforms, but there is still slime on you.");
        C.make_slimed(10n, 0);
    }

    C.disp.botl = 1;
    C.see_monsters();
    C.encumber_msg();

    C.retouch_equipment(2);
    if (!C.uarmg)
        C.selftouch(no_longer_petrify_resistant);

    return;
    } // original dead join
      /* we come directly here if experience level went to 0 or less */
            C.urgent_pline(
                     "Your new form doesn't seem healthy enough to survive.");
            C.svk.killer.format = C.KILLED_BY_AN;
            C.Strcpy(C.svk.killer.name, "unsuccessful polymorph");
            C.done(C.DIED);
            /* must have been life-saved to get here */
            C.newuhs(0);
            C.encumber_msg(); /* used to be done by redist_attr() */
            return; /* lifesaved */
}

export function polyself(psflags)
{
    psflags = C.int(psflags);
    const buf = C.stackAlloc(C.BUFSZ);
    let old_light, new_light, mntmp, mclass, tryct, gvariant = C.NEUTRAL;
    let forcecontrol = ((psflags & C.POLY_CONTROLLED) != 0),
            low_control = ((psflags & C.POLY_LOW_CTRL) != 0),
            monsterpoly = ((psflags & C.POLY_MONSTER) != 0),
            formrevert = ((psflags & C.POLY_REVERT) != 0),
            draconian = (Number(Boolean(C.uarm && C.Is_dragon_armor(C.uarm)))),
            iswere = (C.ismnum(C.u.ulycn)),
            isvamp = (Number(Boolean(C.is_vampire(C.gy.youmonst.data)
                      || C.is_vampshifter(C.gy.youmonst)))),
            controllable_poly = Number(Boolean(C.Polymorph_control && !(C.Stunned || C.Unaware)));

    if (C.Unchanging) {
        C.You("fail to transform!");
        return;
    }
    /* being Stunned|Unaware doesn't negate this aspect of Poly_control */
    if (!C.Polymorph_control && !forcecontrol && !draconian && !iswere
        && !isvamp) {
        if (C.rn2(() => (20), 6) > C.ACURR(C.A_CON)) {
            C.You1(C.shudder_for_moment);
            C.losehp(C.rnd(() => (30), 7), "system shock", C.KILLED_BY_AN);
            C.exercise(C.A_CON, 0);
            return;
        }
    }
    old_light = C.emits_light(C.gy.youmonst.data);
    mntmp = C.NON_PM;

    if (formrevert) {
        mntmp = C.gy.youmonst.cham;
        monsterpoly = 1;
        controllable_poly = 0;
    }

    if (forcecontrol && low_control
        && (draconian || monsterpoly || isvamp || iswere))
        forcecontrol = 0;

    let _polyself_target = null;
    select_form: {
    if (monsterpoly && isvamp)
        { _polyself_target = 'do_vampyr'; break select_form; }

    if (controllable_poly || forcecontrol) {
        C.storeChar(buf + (0), 0);
        tryct = 5;

        choose_form: do {
            mntmp = C.NON_PM;
            C.getlin("Become what kind of monster? [type the name]", buf);
            C.mungspaces(buf);
            if (C.loadChar(buf) == 27) {
                /* user is cancelling controlled poly */
                if (forcecontrol) { /* wizard mode #polyself */
                    C.pline1(C.Never_mind);
                    return;
                }
                C.Strcpy(buf, "*"); /* resort to random */
            }
            if (!C.strcmp(buf, "*") || !C.strcmp(buf, "random")) {
                /* explicitly requesting random result */
                tryct = 0; /* will skip thats_enough_tries */
                continue;  /* end do-while(--tryct > 0) loop */
            }
            mclass = 0;
            mntmp = C.name_to_mon(buf, C.intReference(() => gvariant, value => { gvariant = value; }));
            let _polyself_retry_class = false;
            by_class: while (true) {
            if (_polyself_retry_class || mntmp < C.LOW_PM) {
                mclass = C.name_to_monclass(buf, C.intReference(() => mntmp, value => { mntmp = value; }));
                if (mclass && mntmp == C.NON_PM)
                    mntmp = (draconian && mclass == C.S_DRAGON)
                            ? C.callLocal(armor_to_dragon, C.uarm.otyp)
                            : C.mkclass_poly(mclass);

            /* placeholder monsters are for corpses and all flagged
               M2_NOPOLY but they are reasonable polymorph targets;
               pick a suitable substitute (which might be geno'd) */
            } else if (C.is_placeholder(C.mons[mntmp])
                       /* when your own race, fall to !polyok() case */
                       && !C.your_race(C.mons[mntmp])
                       /* same for generic human, even if hero isn't human */
                       && mntmp != C.PM_HUMAN) {
                /* far less general than mkclass() */
                if (mntmp == C.PM_ORC)
                    mntmp = C.rn2(() => (3), 8) ? C.PM_HILL_ORC : C.PM_MORDOR_ORC;
                else if (mntmp == C.PM_ELF)
                    mntmp = C.rn2(() => (3), 9) ? C.PM_GREEN_ELF : C.PM_GREY_ELF;
                else if (mntmp == C.PM_GIANT)
                    mntmp = C.rn2(() => (3), 10) ? C.PM_STONE_GIANT : C.PM_HILL_GIANT;
                /* note: PM_DWARF and PM_GNOME are ordinary monsters and
                   no longer flagged no-poly so have no need for placeholder
                   handling; PM_HUMAN is a placeholder without a suitable
                   substitute so gets handled differently below */
            }

            if (mntmp < C.LOW_PM) {
                if (!mclass)
                    C.pline("I've never heard of such monsters.");
                else
                    C.You_cant("polymorph into any of those.");
            } else if (C.wizard && C.Upolyd
                       && (mntmp == C.u.umonster
                           /* "priest" and "priestess" match the monster
                              rather than the role; override that unless
                              the text explicitly contains "aligned" */
                           || (C.u.umonster == C.PM_CLERIC
                               && mntmp == C.PM_ALIGNED_CLERIC
                               && !C.strstri(buf, "aligned")))) {
                /* in wizard mode, picking own role while poly'd reverts to
                   normal without newman()'s chance of level or sex change */
                C.callLocal(rehumanize);
                old_light = 0; /* rehumanize() extinguishes u-as-mon light */
                { _polyself_target = 'made_change'; break select_form; }
            } else if (iswere && (C.were_beastie(mntmp) == C.u.ulycn
                                  || mntmp == C.counter_were(C.u.ulycn)
                                  || (C.Upolyd && mntmp == C.PM_HUMAN))) {
                { _polyself_target = 'do_shift'; break select_form; }
            } else if (!C.polyok(C.mons[mntmp])
                       /* Note:  humans are illegal as monsters, but an
                          illegal monster forces newman(), which is what
                          we want if they specified a human.... (unless
                          they specified a unique monster) */
                       && !(mntmp == C.PM_HUMAN
                            || (C.your_race(C.mons[mntmp])
                                && (C.mons[mntmp].geno & C.G_UNIQ) == 0)
                            || mntmp == C.gu.urole.mnum)) {
                let pm_name;

                /* mkclass_poly() can pick a !polyok()
                   candidate; if so, usually try again */
                if (mclass) {
                    if (C.rn2(() => (3), 11) || --tryct > 0)
                        { _polyself_retry_class = true; continue by_class; }
                    /* no retries left; put one back on counter
                       so that end of loop decrement will yield
                       0 and trigger thats_enough_tries message */
                    ++tryct;
                }
                pm_name = C.pmname(C.mons[mntmp], C.flags.female ? C.FEMALE : C.MALE);
                if (C.the_unique_pm(C.mons[mntmp]))
                    pm_name = C.the(pm_name);
                else if (!C.type_is_pname(C.mons[mntmp]))
                    pm_name = C.an(pm_name);
                C.You_cant("polymorph into %s.", pm_name);
            } else
                break choose_form;
            break by_class;
            }
        } while (--tryct > 0);

        if (!tryct)
            C.pline1(C.thats_enough_tries);
        /* allow skin merging, even when polymorph is controlled */
        if (draconian && (tryct <= 0 || mntmp == C.callLocal(armor_to_dragon, C.uarm.otyp)))
            { _polyself_target = 'do_merge'; break select_form; }
        if (isvamp && (tryct <= 0 || mntmp == C.PM_WOLF || mntmp == C.PM_FOG_CLOUD
                       || C.is_bat(C.mons[mntmp])))
            { _polyself_target = 'do_vampyr'; break select_form; }
    }
    }
    if (!_polyself_target && !(controllable_poly || forcecontrol) && (draconian || iswere || isvamp))
        _polyself_target = draconian ? 'do_merge' : iswere ? 'do_shift' : 'do_vampyr';
    if (_polyself_target && _polyself_target !== 'made_change') {
        /* special changes that don't require polyok() */
        if (_polyself_target === 'do_merge') {
            mntmp = C.callLocal(armor_to_dragon, C.uarm.otyp);
            if (!(C.svm.mvitals[mntmp].mvflags & C.G_GENOD)) {
                let was_lit = C.uarm.lamplit;
                let arm_light = C.artifact_light(C.uarm) ? C.arti_light_radius(C.uarm)
                                                     : 0;

                /* allow G_EXTINCT */
                if (C.Is_dragon_scales(C.uarm)) {
                    /* dragon scales remain intact as uskin */
                    C.You("merge with your scaly armor.");
                } else { /* dragon scale mail reverts to scales */
                    /* similar to noarmor(invent.c),
                       shorten to "<color> scale mail" */
                    C.Strcpy(buf, C.simpleonames(C.uarm));
                    C.strsubst(buf, " dragon ", " ");
                    /* tricky phrasing; dragon scale mail is singular, dragon
                       scales are plural (note: we don't use "set of scales",
                       which usually overrides the distinction, here) */
                    C.Your("%s reverts to scales as you merge with them.", buf);
                    /* uarm->spe enchantment remains unchanged;
                       re-converting scales to mail poses risk
                       of evaporation due to over enchanting */
                    C.uarm.otyp += C.GRAY_DRAGON_SCALES - C.GRAY_DRAGON_SCALE_MAIL;
                    C.observe_object(C.uarm);
                    C.disp.botl = 1; /* AC is changing */
                }
                C.uskin = C.uarm;
                C.uarm = 0;
                /* save/restore hack */
                C.uskin.owornmask |= C.I_SPECIAL;
                if (was_lit)
                    C.maybe_adjust_light(C.uskin, arm_light);
                C.update_inventory();
            }
        } else if (_polyself_target === 'do_shift') {
            if (C.Upolyd && C.were_beastie(mntmp) != C.u.ulycn)
                mntmp = C.PM_HUMAN; /* Illegal; force newman() */
            else
                mntmp = C.u.ulycn;
        } else if (_polyself_target === 'do_vampyr') {
            if (mntmp < C.LOW_PM || (C.mons[mntmp].geno & C.G_UNIQ)) {
                mntmp = (C.gy.youmonst.data == C.mons[C.PM_VAMPIRE_LEADER]
                         && !C.rn2(() => (10), 12)) ? C.PM_WOLF
                                      : !C.rn2(() => (4), 13) ? C.PM_FOG_CLOUD
                                                : C.PM_VAMPIRE_BAT;
                if (C.ismnum(C.gy.youmonst.cham)
                    && !C.is_vampire(C.gy.youmonst.data) && !C.rn2(() => (2), 14))
                    mntmp = C.gy.youmonst.cham;
            }
            if (controllable_poly) {
                C.Sprintf(buf, "Become %s?",
                        C.an(C.pmname(C.mons[mntmp], gvariant)));
                if (C.y_n(buf) != 121)
                    return;
            }
        }
        /* if polymon fails, "you feel" message has been given
           so don't follow up with another polymon or newman;
           sex_change_ok left disabled here */
        if (mntmp == C.PM_HUMAN)
            C.callLocal(newman); /* werecritter */
        else
            C.callLocal(polymon, mntmp);
        _polyself_target = 'made_change'; /* maybe not, but this is right anyway */
    }
    if (_polyself_target !== 'made_change') {

    if (mntmp < C.LOW_PM) {
        tryct = 200;
        do {
            /* randomly pick an "ordinary" monster */
            mntmp = C.rn1(() => (C.SPECIAL_PM - C.LOW_PM), () => ( C.LOW_PM), 15);
            if (C.polyok(C.mons[mntmp]) && !C.is_placeholder(C.mons[mntmp]))
                break;
        } while (--tryct > 0);
    }

    /* The below polyok() fails either if everything is genocided, or if
     * we deliberately chose something illegal to force newman().
     */
    C.gs.sex_change_ok++;
    if (!C.polyok(C.mons[mntmp]) || (!forcecontrol && !C.rn2(() => (5), 16))
        || C.your_race(C.mons[mntmp])) {
        C.callLocal(newman);
    } else {
        C.callLocal(polymon, mntmp);
    }
    C.gs.sex_change_ok--; /* reset */

    } // original made_change join

    new_light = C.emits_light(C.gy.youmonst.data);
    if (old_light != new_light) {
        if (old_light)
            C.del_light_source(C.LS_MONSTER, C.monst_to_any(C.gy.youmonst));
        if (new_light == 1)
            ++new_light; /* otherwise it's undetectable */
        if (new_light)
            C.new_light_source(C.u.ux, C.u.uy, new_light, C.LS_MONSTER,
                             C.monst_to_any(C.gy.youmonst));
    }
}

/* (try to) make a mntmp monster out of the player; return 1 if successful */
export function polymon(mntmp)
{
    mntmp = C.int(mntmp);
    const buf = C.stackAlloc(C.BUFSZ), ustuckNam = C.stackAlloc(C.BUFSZ);
    let sticking = Number(Boolean(C.sticks(C.gy.youmonst.data) && C.u.ustuck && !C.u.uswallow)),
            was_blind = !!C.Blind, dochange = 0, was_expelled = 0,
            was_hiding_under = Number(Boolean(C.u.uundetected && C.hides_under(C.gy.youmonst.data)));
    let mlvl, newMaxStr;

    if (C.svm.mvitals[mntmp].mvflags & C.G_GENOD) { /* allow G_EXTINCT */
        C.You_feel("rather %s-ish.",
                 C.pmname(C.mons[mntmp], C.flags.female ? C.FEMALE : C.MALE));
        C.exercise(C.A_WIS, 1);
        return 0;
    }

    /* KMH, conduct */
    if (!C.u.uconduct.polyselfs++)
        C.livelog_printf(C.LL_CONDUCT,
                       "changed form for the first time, becoming %s",
                       C.an(C.pmname(C.mons[mntmp], C.flags.female ? C.FEMALE : C.MALE)));

    /* exercise used to be at the very end but only Wis was affected
       there since the polymorph was always in effect by then */
    C.exercise(C.A_CON, 0);
    C.exercise(C.A_WIS, 1);

    if (!C.Upolyd) {
        /* Human to monster; save human stats */
        C.u.macurr = C.u.acurr;
        C.u.mamax = C.u.amax;
        C.u.mfemale = C.flags.female;
    } else {
        /* Monster to monster; restore human stats, to be
         * immediately changed to provide stats for the new monster
         */
        C.u.acurr = C.u.macurr;
        C.u.amax = C.u.mamax;
        C.flags.female = C.u.mfemale;
    }

    /* if stuck mimicking gold, stop immediately */
    if (C.gm.multi < 0 && C.U_AP_TYPE == C.M_AP_OBJECT
        && C.gy.youmonst.data.mlet != C.S_MIMIC)
        C.unmul("");
    /* if becoming a non-mimic, stop mimicking anything */
    if (C.mons[mntmp].mlet != C.S_MIMIC) {
        /* as in polyman() */
        C.gy.youmonst.m_ap_type = C.M_AP_NOTHING;
        C.gy.youmonst.mappearance = 0;
    }
    if (C.is_male(C.mons[mntmp])) {
        if (C.flags.female)
            dochange = 1;
    } else if (C.is_female(C.mons[mntmp])) {
        if (!C.flags.female)
            dochange = 1;
    } else if (!C.is_neuter(C.mons[mntmp]) && mntmp != C.u.ulycn) {
        if (C.gs.sex_change_ok && !C.rn2(() => (10), 17))
            dochange = 1;
    }

    C.Strcpy(ustuckNam, C.u.ustuck ? C.Some_Monnam(C.u.ustuck) : "");

    C.Strcpy(buf, (C.u.umonnum != mntmp) ? "" : "new ");
    if (dochange) {
        C.flags.female = !C.flags.female;
        C.Strcat(buf, (C.is_male(C.mons[mntmp]) || C.is_female(C.mons[mntmp]))
                       ? "" : C.flags.female ? "female " : "male ");
    }
    C.Strcat(buf, C.pmname(C.mons[mntmp], C.flags.female ? C.FEMALE : C.MALE));
    C.You("%s %s!", (C.u.umonnum != mntmp) ? "turn into" : "feel like", C.an(buf));

    if (C.Stoned && C.poly_when_stoned(C.mons[mntmp])) {
        /* poly_when_stoned already checked stone golem genocide */
        mntmp = C.PM_STONE_GOLEM;
        C.make_stoned(0n, "You turn to stone!", 0, 0);
    }

    C.u.mtimedone = C.rn1(() => (500), () => ( 500), 18);
    C.u.umonnum = mntmp;
    C.callLocal(set_uasmon);

    /* New stats for monster, to last only as long as polymorphed.
     * Currently only strength gets changed.
     */
    newMaxStr = C.callLocal(uasmon_maxStr);
    if (C.strongmonst(C.mons[mntmp])) {
        C.u.acurr.a[C.A_STR] = C.u.amax.a[C.A_STR] = C.char(newMaxStr);
    } else {
        /* not a strongmonst(); if hero has exceptional strength, remove it
           (note: removal is temporary until returning to original form);
           we don't attempt to enforce lower maximum for wimpy forms;
           unlike for strongmonst, current strength does not get set to max */
        C.u.amax.a[C.A_STR] = C.char(newMaxStr);
        /* make sure current is not higher than max (strip exceptional Str) */
        if (C.u.acurr.a[C.A_STR] > C.u.amax.a[C.A_STR])
            C.u.acurr.a[C.A_STR] = C.u.amax.a[C.A_STR];
    }

    if (C.Stone_resistance && C.Stoned) { /* parnes@eniac.seas.upenn.edu */
        C.make_stoned(0n, "You no longer seem to be petrifying.", 0,
                    0);
    }
    if (C.Sick_resistance && C.Sick) {
        C.make_sick(0n, 0, 0, C.SICK_ALL);
        C.You("no longer feel sick.");
    }
    if (C.Slimed) {
        if (C.flaming(C.gy.youmonst.data)) {
            C.make_slimed(0n, "The slime burns away!");
        } else if (mntmp == C.PM_GREEN_SLIME) {
            /* do it silently */
            C.make_slimed(0n, 0);
        }
    }
    C.callLocal(check_strangling, 0); /* maybe stop strangling */
    if (C.nohands(C.gy.youmonst.data))
        C.make_glib(0);

    /*
    mlvl = adj_lev(&mons[mntmp]);
     * We can't do the above, since there's no such thing as an
     * "experience level of you as a monster" for a polymorphed character.
     */
    mlvl = C.int(C.mons[mntmp].mlevel);
    if (C.gy.youmonst.data.mlet == C.S_DRAGON && mntmp >= C.PM_GRAY_DRAGON) {
        C.u.mhmax = C.In_endgame(C.u.uz) ? (8 * mlvl) : (4 * mlvl + C.d(() => (mlvl), () => ( 4), 19));
    } else if (C.is_golem(C.gy.youmonst.data)) {
        C.u.mhmax = C.golemhp(mntmp);
    } else {
        if (!mlvl)
            C.u.mhmax = C.rnd(() => (4), 20);
        else
            C.u.mhmax = C.d(() => (mlvl), () => ( 8), 21);
        if (C.is_home_elemental(C.mons[mntmp]))
            C.u.mhmax *= 3;
    }
    C.u.mh = C.u.mhmax;

    if (C.u.ulevel < mlvl) {
        /* Low level characters can't become high level monsters for long */
// #ifdef DUMB
        /* DRS/NS 2.2.6 messes up -- Peter Kendell */
//         int mtd = u.mtimedone, ulv = u.ulevel;

//         u.mtimedone = mtd * ulv / mlvl;
// #else
        C.u.mtimedone = Math.trunc(C.u.mtimedone * C.u.ulevel / mlvl);
// #endif
    }

    if (C.uskin && mntmp != C.callLocal(armor_to_dragon, C.uskin.otyp))
        C.callLocal(skinback, 0);
    C.callLocal(break_armor);
    C.callLocal(drop_weapon, 1);
    C.find_ac(); /* (repeated below) */
    /* if hiding under something and can't hide anymore, unhide now;
       but don't auto-hide when not already hiding-under */
    if (was_hiding_under)
        C.hideunder(C.gy.youmonst);

    if (C.u.utrap && C.u.utraptype == C.TT_PIT) {
        C.set_utrap(C.rn1(() => (6), () => ( 2), 22), C.TT_PIT); /* time to escape resets */
    }
    if (was_blind && !C.Blind) { /* previous form was eyeless */
        C.set_itimeout(C.propertyReference('HBlinded'), 1n);
        C.make_blinded(0n, 1); /* remove blindness */
    }
    C.newsym(C.u.ux, C.u.uy); /* Change symbol */

    /* you now know what an egg of your type looks like; [moved from
       below in case expels() -> spoteffects() drops hero onto any eggs] */
    if (C.lays_eggs(C.gy.youmonst.data)) {
        C.learn_egg_type(C.u.umonnum);
        /* make queen bees recognize killer bee eggs */
        C.learn_egg_type(C.egg_type_from_parent(C.u.umonnum, 1));
    }

    if (C.u.uswallow) {
        let usiz;

        /* if new form can't be swallowed, make engulfer expel hero */
        if (C.unsolid(C.gy.youmonst.data)
            /* subset of engulf_target() */
            || (usiz = C.gy.youmonst.data.msize) >= C.MZ_HUGE
            || (C.u.ustuck.data.msize < usiz && !C.is_whirly(C.u.ustuck.data))) {
            let expels_mesg = 1;

            if (C.unsolid(C.gy.youmonst.data)) {
                if (C.canspotmon(C.u.ustuck)) /* [see below for explanation] */
                    C.Strcpy(ustuckNam, C.Monnam(C.u.ustuck));
                C.pline("%s can no longer contain you.", ustuckNam);
                expels_mesg = 0;
            }
            C.expels(C.u.ustuck, C.u.ustuck.data, expels_mesg);
            was_expelled = 1;
            /* FIXME? if expels() triggered rehumanize then we should
               return early */
        }

    /* [note:  this 'sticking' handling is only sufficient for changing from
       grabber to engulfer or vice versa because engulfing by poly'd hero
       always ends immediately so won't be in effect during a polymorph] */
    } else if (C.u.ustuck && !sticking /* && !u.uswallow */
               /* being held; if now capable of holding, make holder
                  release so that hero doesn't automagically start holding
                  it; or, release if no longer capable of being held */
               && (C.sticks(C.gy.youmonst.data) || C.unsolid(C.gy.youmonst.data))) {
        /* u.ustuck name was saved above in case we're changing from can-see
           to can't-see; but might have changed from can't-see to can-see so
           override here if hero knows who u.ustuck is */
        if (C.canspotmon(C.u.ustuck))
            C.Strcpy(ustuckNam, C.Monnam(C.u.ustuck));
        C.set_ustuck(0);
        C.pline("%s loses its grip on you.", ustuckNam);
    } else if (sticking && !C.sticks(C.gy.youmonst.data)) {
        /* was holding onto u.ustuck but no longer capable of that */
        C.callLocal(uunstick);
    }

    if (C.u.usteed) {
        if (C.touch_petrifies(C.u.usteed.data) && !C.Stone_resistance && C.rnl(() => (3), 23)) {
            C.pline("%s touch %s.", no_longer_petrify_resistant,
                  C.mon_nam(C.u.usteed));
            C.Sprintf(buf, "riding %s",
                    C.an(C.pmname(C.u.usteed.data, C.Mgender(C.u.usteed))));
            C.instapetrify(buf);
        }
        if (!C.can_ride(C.u.usteed))
            C.dismount_steed(C.DISMOUNT_POLY);
    }

    C.find_ac();
    if (((!C.Levitation && !C.u.ustuck && !C.Flying && C.is_pool_or_lava(C.u.ux, C.u.uy))
         || (C.Underwater && !C.Swimming))
        /* if expelled above, expels() already called spoteffects() */
        && !was_expelled) {
        C.spoteffects(1);
        /* FIXME? if spoteffects() triggered rehumanize then we should
           return early */
    }
    if (C.Passes_walls && C.u.utrap
        && (C.u.utraptype == C.TT_INFLOOR || C.u.utraptype == C.TT_BURIEDBALL)) {
        if (C.u.utraptype == C.TT_INFLOOR) {
            C.pline_The("rock seems to no longer trap you.");
        } else {
            C.pline_The("buried ball is no longer bound to you.");
            C.buried_ball_to_freedom();
        }
        C.reset_utrap(1);
    } else if (C.likes_lava(C.gy.youmonst.data) && C.u.utrap
               && C.u.utraptype == C.TT_LAVA) {
        C.pline_The("%s now feels soothing.", C.hliquid("lava"));
        C.reset_utrap(1);
    }
    if (C.amorphous(C.gy.youmonst.data) || C.is_whirly(C.gy.youmonst.data)
        || C.unsolid(C.gy.youmonst.data)) {
        if (C.Punished) {
            C.You("slip out of the iron chain.");
            C.unpunish();
        } else if (C.u.utrap && C.u.utraptype == C.TT_BURIEDBALL) {
            C.You("slip free of the buried ball and chain.");
            C.buried_ball_to_freedom();
        }
    }
    if (C.u.utrap && (C.u.utraptype == C.TT_WEB || C.u.utraptype == C.TT_BEARTRAP)
        && (C.amorphous(C.gy.youmonst.data) || C.is_whirly(C.gy.youmonst.data)
            || C.unsolid(C.gy.youmonst.data)
            || (C.gy.youmonst.data.msize <= C.MZ_SMALL
                && C.u.utraptype == C.TT_BEARTRAP))) {
        C.You("are no longer stuck in the %s.",
            C.u.utraptype == C.TT_WEB ? "web" : "bear trap");
        /* probably should burn webs too if PM_FIRE_ELEMENTAL */
        C.reset_utrap(1);
    }
    if (C.webmaker(C.gy.youmonst.data) && C.u.utrap && C.u.utraptype == C.TT_WEB) {
        C.You("orient yourself on the web.");
        C.reset_utrap(1);
    }
    C.callLocal(check_strangling, 1); /* maybe start strangling */

    C.disp.botl = 1;
    C.gv.vision_full_recalc = 1;
    C.see_monsters();
    C.encumber_msg();

    C.retouch_equipment(2);
    /* this might trigger a recursive call to polymon() [stone golem
       wielding cockatrice corpse and hit by stone-to-flesh, becomes
       flesh golem above, now gets transformed back into stone golem;
       fortunately neither form uses #monster] */
    if (!C.uarmg)
        C.selftouch(no_longer_petrify_resistant);

    /* the explanation of '#monster' used to be shown sooner, but there are
       possible fatalities above and it isn't useful unless hero survives */
    if (C.flags.verbose) {
        const use_thec = "Use the command #%s to %s.";
        const monsterc = "monster";
        let uptr = C.gy.youmonst.data;
        let might_hide = (Number(Boolean(C.is_hider(uptr) || C.hides_under(uptr))));

        if (C.can_breathe(uptr))
            C.pline(use_thec, monsterc, "use your breath weapon");
        if (C.attacktype(uptr, C.AT_SPIT))
            C.pline(use_thec, monsterc, "spit venom");
        if (uptr.mlet == C.S_NYMPH)
            C.pline(use_thec, monsterc, "remove an iron ball");
        if (C.attacktype(uptr, C.AT_GAZE))
            C.pline(use_thec, monsterc, "gaze at monsters");
        if (might_hide && C.webmaker(uptr))
            C.pline(use_thec, monsterc, "hide or to spin a web");
        else if (might_hide)
            C.pline(use_thec, monsterc, "hide");
        else if (C.webmaker(uptr))
            C.pline(use_thec, monsterc, "spin a web");
        if (C.is_were(uptr))
            C.pline(use_thec, monsterc, "summon help");
        if (C.u.umonnum == C.PM_GREMLIN)
            C.pline(use_thec, monsterc, "multiply in a fountain");
        if (C.is_unicorn(uptr))
            C.pline(use_thec, monsterc, "use your horn");
        if (C.is_mind_flayer(uptr))
            C.pline(use_thec, monsterc, "emit a mental blast");
        if (uptr.msound == C.MS_SHRIEK) /* worthless, actually */
            C.pline(use_thec, monsterc, "shriek");
        if (C.is_vampire(uptr) || C.is_vampshifter(C.gy.youmonst))
            C.pline(use_thec, monsterc, "change shape");

        if (C.lays_eggs(uptr) && C.flags.female
            && !(uptr == C.mons[C.PM_GIANT_EEL]
                 || uptr == C.mons[C.PM_ELECTRIC_EEL]))
            C.pline(use_thec, "sit",
                  C.eggs_in_water(uptr) ? "spawn in the water" : "lay an egg");
    }
    return 1;
}

/* determine hero's temporary strength value used while polymorphed;
   hero poly'd into M2_STRONG monster usually gets 18/100 strength but
   there are exceptions; non-M2_STRONG get maximum strength set to 18 */
export function uasmon_maxStr()
{
    let R;
    let newMaxStr;
    let mndx = C.u.umonnum;
    let ptr = C.mons[mndx];

    if (C.is_orc(ptr)) {
        if (mndx != C.PM_URUK_HAI && mndx != C.PM_ORC_CAPTAIN)
            mndx = C.PM_ORC;
    } else if (C.is_elf(ptr)) {
        mndx = C.PM_ELF;
    } else if (C.is_dwarf(ptr)) {
        mndx = C.PM_DWARF;
    } else if (C.is_gnome(ptr)) {
        mndx = C.PM_GNOME;
// #if 0   
/* use the mons[] value for humans */
//     } else if (is_human(ptr)) {
//         mndx = PM_HUMAN;
// #endif
    }
    R = C.character_race(mndx);

    if (C.strongmonst(ptr)) {
        /* ettins, titans and minotaurs don't pass the is_giant() test;
           giant mummies and giant zombies do but we throttle those */
        let live_H = Number(Boolean(C.is_giant(ptr) && !C.is_undead(ptr)));

        /* hero orcs are limited to 18/50 for maximum strength, so treat
           hero poly'd into an orc the same; goblins, orc shamans, and orc
           zombies don't have strongmonst() attribute so won't get here;
           hobgoblins and orc mummies do get here and are limited to 18/50
           like normal orcs; however, orc captains and Uruk-hai retain 18/100
           strength; hero gnomes are also limited to 18/50; hero elves are
           limited to 18/00 regardless of whether they're strongmonst, but
           the two strongmonst types (monarchs and nobles) have current
           strength set to 18 [by polymon()], the others don't */
        newMaxStr = R ? R.attrmax[C.A_STR] : live_H ? C.STR19(19) : C.STR18(100);
    } else {
        newMaxStr = R ? R.attrmax[C.A_STR] : 18; /* 18 is same as STR18(0) */
    }
    return C.char(newMaxStr);
}

/* dropx() jacket for break_armor() */
export function dropp(obj)
{
    let otmp;

    /*
     * Dropping worn armor while polymorphing might put hero into water
     * (loss of levitation boots or water walking boots that the new
     * form can't wear), where emergency_disrobe() could remove it from
     * inventory.  Without this, dropx() could trigger an 'object lost'
     * panic.  Right now, boots are the only armor which might encounter
     * this situation, but handle it for all armor.
     *
     * Hypothetically, 'obj' could have merged with something (not
     * applicable for armor) and no longer be a valid pointer, so scan
     * inventory for it instead of trusting obj->where.
     */
    for (otmp = C.gi.invent; otmp; otmp = otmp.nobj) {
        if (otmp == obj) {
            C.dropx(obj);
            /* Note that otmp->nobj is pointing at fobj now,
             * as a result of:
             * dropx() -> dropy() -> dropz() -> place_object(),
             * and no longer pointing at the next obj in inventory.
             * That would be an issue if this loop were allowed
             * to continue, but the break statement that
             * follows prevents the loop from continuing on with
             * objects on the floor.
             */
            break;
        }
    }
}

export function break_armor()
{
    let otmp;
    let uptr = C.gy.youmonst.data;

    if (C.breakarm(uptr)) {
        if ((otmp = C.uarm) != 0) {
            if (C.donning(otmp))
                C.cancel_don();
            /* for gold DSM, we don't want Armor_gone() to report that it
               stops shining _after_ we've been told that it is destroyed */
            if (otmp.lamplit)
                C.end_burn(otmp, 0);

            C.You("break out of your armor!");
            C.exercise(C.A_STR, 0);
            C.Armor_gone();
            C.useup(otmp);
        }
        if ((otmp = C.uarmc) != 0
            /* mummy wrapping adapts to small and very big sizes */
            && (otmp.otyp != C.MUMMY_WRAPPING || !C.WrappingAllowed(uptr))) {
            if (otmp.otyp == C.MUMMY_WRAPPING) {
                /* doesn't have a clasp to break open */
                C.Your("%s tears apart!", C.cloak_simple_name(otmp));
                C.Cloak_off();
                C.useup(otmp);
            } else if (otmp.otyp == C.ALCHEMY_SMOCK) {
                C.pline_The("knot on your %s is pulled apart!", C.cloak_simple_name(otmp));
                C.Cloak_off();
                C.callLocal(dropp, otmp);
            } else {
                C.pline_The("clasp on your %s breaks open!", C.cloak_simple_name(otmp));
                C.Cloak_off();
                C.callLocal(dropp, otmp);
            }
        }
        if (C.uarmu) {
            C.Your("shirt rips to shreds!");
            C.useup(C.uarmu);
        }
    } else if (C.sliparm(uptr)) {
        if ((otmp = C.uarm) != 0 && C.racial_exception(C.gy.youmonst, otmp) < 1) {
            if (C.donning(otmp))
                C.cancel_don();
            C.Your("armor falls around you!");
            /* [note: _gone() instead of _off() dates to when life-saving
               could force fire resisting armor back on if hero burned in
               hell (3.0, predating Gehennom); the armor isn't actually
               gone here but also isn't available to be put back on] */
            C.Armor_gone();
            C.callLocal(dropp, otmp);
        }
        if ((otmp = C.uarmc) != 0
            /* mummy wrapping adapts to small and very big sizes */
            && (otmp.otyp != C.MUMMY_WRAPPING || !C.WrappingAllowed(uptr))) {
            if (C.is_whirly(uptr))
                C.Your("%s falls, unsupported!", C.cloak_simple_name(otmp));
            else
                C.You("shrink out of your %s!", C.cloak_simple_name(otmp));
            C.Cloak_off();
            C.callLocal(dropp, otmp);
        }
        if ((otmp = C.uarmu) != 0) {
            if (C.is_whirly(uptr))
                C.You("seep right through your shirt!");
            else
                C.You("become much too small for your shirt!");
            C.setworn(0, otmp.owornmask & C.W_ARMU);
            C.callLocal(dropp, otmp);
        }
    }
    if (C.has_horns(uptr)) {
        if ((otmp = C.uarmh) != 0) {
            if (C.is_flimsy(otmp) && !C.donning(otmp)) {
                const hornbuf = C.stackAlloc(C.BUFSZ);

                /* Future possibilities: This could damage/destroy helmet */
                C.Sprintf(hornbuf, "horn%s", C.plur(C.num_horns(uptr)));
                C.Your("%s %s through %s.", hornbuf, C.vtense(hornbuf, "pierce"),
                     C.yname(otmp));
            } else {
                if (C.donning(otmp))
                    C.cancel_don();
                C.Your("%s falls to the %s!", C.helm_simple_name(otmp),
                     C.surface(C.u.ux, C.u.uy));
                C.Helmet_off();
                C.callLocal(dropp, otmp);
            }
        }
    }
    if (C.nohands(uptr) || C.verysmall(uptr)) {
        if ((otmp = C.uarmg) != 0) {
            if (C.donning(otmp))
                C.cancel_don();
            /* Drop weapon along with gloves */
            C.You("drop your gloves%s!", C.uwep ? " and weapon" : "");
            C.callLocal(drop_weapon, 0);
            C.Gloves_off();
            /* Glib manipulation (ends immediately) handled by Gloves_off */
            C.callLocal(dropp, otmp);
        }
        if ((otmp = C.uarms) != 0) {
            C.You("can no longer hold your shield!");
            C.Shield_off();
            C.callLocal(dropp, otmp);
        }
        if ((otmp = C.uarmh) != 0) {
            if (C.donning(otmp))
                C.cancel_don();
            C.Your("%s falls to the %s!", C.helm_simple_name(otmp),
                 C.surface(C.u.ux, C.u.uy));
            C.Helmet_off();
            C.callLocal(dropp, otmp);
        }
    }
    if (C.nohands(uptr) || C.verysmall(uptr)
        || C.slithy(uptr) || uptr.mlet == C.S_CENTAUR) {
        if ((otmp = C.uarmf) != 0) {
            if (C.donning(otmp))
                C.cancel_don();
            if (C.is_whirly(uptr))
                C.Your("boots fall away!");
            else
                C.Your("boots %s off your feet!",
                     C.verysmall(uptr) ? "slide" : "are pushed");
            C.Boots_off();
            C.callLocal(dropp, otmp);
        }
    }
    /* not armor, but eyewear shouldn't stay worn without a head to wear
       it/them on (should also come off if head is too tiny or too huge,
       but putting accessories on doesn't reject those cases [yet?]);
       amulet stays worn */
    if ((otmp = C.ublindf) != 0 && !C.has_head(uptr)) {
        let l;
        let eyewear = C.simpleonames(otmp); /* blindfold|towel|lenses */

        if (!C.strncmp(eyewear, "pair of ", l = 8)) /* lenses */
            eyewear += l;
        C.Your("%s %s off!", eyewear, C.vtense(eyewear, "fall"));
        C.Blindf_off(0); /* Null: skip usual off mesg */
        C.callLocal(dropp, otmp);
    }
    /* rings stay worn even when no hands */
}

export function drop_weapon(alone)
{
    alone = C.int(alone);
    let otmp;
    let what, which, whichtoo;
    let candropwep, candropswapwep, updateinv = 1;

    if (C.uwep) {
        /* !alone check below is currently superfluous but in the
         * future it might not be so if there are monsters which cannot
         * wear gloves but can wield weapons
         */
        if (!alone || C.cantwield(C.gy.youmonst.data)) {
            candropwep = C.canletgo(C.uwep, "");
            candropswapwep = Number(Boolean(!C.u.twoweap || C.canletgo(C.uswapwep, "")));
            if (alone) {
                what = (candropwep && candropswapwep) ? "drop" : "release";
                which = C.is_sword(C.uwep) ? "sword" : C.weapon_descr(C.uwep);
                if (C.u.twoweap) {
                    whichtoo =
                        C.is_sword(C.uswapwep) ? "sword" : C.weapon_descr(C.uswapwep);
                    if (C.strcmp(which, whichtoo))
                        which = "weapon";
                }
                if (C.uwep.quan != 1n || C.u.twoweap)
                    which = C.makeplural(which);

                C.You("find you must %s %s %s!", what,
                    C.the_your[Number(Boolean(C.strncmp(which, "corpse", 6)))], which);
            }
            /* if either uwep or wielded uswapwep is flagged as 'in_use'
               then don't drop it or explicitly update inventory; leave
               those actions to caller (or caller's caller, &c) */
            if (C.u.twoweap) {
                otmp = C.uswapwep;
                C.uswapwepgone();
                if (otmp.in_use)
                    updateinv = 0;
                else if (candropswapwep)
                    C.dropx(otmp);
            }
            otmp = C.uwep;
            C.uwepgone();
            if (otmp.in_use)
                updateinv = 0;
            else if (candropwep)
                C.dropx(otmp);
            /* [note: dropp vs dropx -- if heart of ahriman is wielded, we
               might be losing levitation by dropping it; but that won't
               happen until the drop, unlike Boots_off() dumping hero into
               water and triggering emergency_disrobe() before dropx()] */

            if (updateinv)
                C.update_inventory();
        } else if (!C.could_twoweap(C.gy.youmonst.data)) {
            C.untwoweapon();
        }
    }
}

/* return to original form, usually either due to polymorph timing out
   or dying from loss of hit points while being polymorphed */
export function rehumanize()
{
    let was_flying = (C.Flying != 0);

    /* You can't revert back while unchanging */
    if (C.Unchanging) {
        if (C.u.mh < 1) {
            C.svk.killer.format = C.NO_KILLER_PREFIX;
            C.Strcpy(C.svk.killer.name, "killed while stuck in creature form");
            C.done(C.DIED);
            /* can get to here if declining to die in explore or wizard
               mode; since we're wearing an amulet of unchanging we can't
               be wearing an amulet of life-saving */
            return; /* don't rehumanize after all */
        } else if (C.uamul && C.uamul.otyp == C.AMULET_OF_UNCHANGING) {
            C.Your("%s %s!", C.simpleonames(C.uamul), C.otense(C.uamul, "fail"));
            C.observe_object(C.uamul);
            C.makeknown(C.AMULET_OF_UNCHANGING);
        }
    }

    /*
     * Right now, dying while being a shifted vampire (bat, cloud, wolf)
     * reverts to human rather than to vampire.
     */

    if (C.emits_light(C.gy.youmonst.data))
        C.del_light_source(C.LS_MONSTER, C.monst_to_any(C.gy.youmonst));
    C.callLocal(polyman, "You return to %s form!", C.gu.urace.adj);

    if (C.u.uhp < 1) {
        /* can only happen if some bit of code reduces u.uhp
           instead of u.mh while poly'd */
        C.Your("old form was not healthy enough to survive.");
        C.Sprintf(C.svk.killer.name, "reverting to unhealthy %s form",
                C.gu.urace.adj);
        C.svk.killer.format = C.KILLED_BY;
        C.done(C.DIED);
    }
    C.nomul(0);

    C.disp.botl = 1;
    C.gv.vision_full_recalc = 1;
    C.encumber_msg();
    C.update_inventory();
    if (was_flying && !C.Flying && C.u.usteed)
        C.You("and %s return gently to the %s.",
            C.mon_nam(C.u.usteed), C.surface(C.u.ux, C.u.uy));
    C.retouch_equipment(2);
    if (!C.uarmg)
        C.selftouch(no_longer_petrify_resistant);
}

export function dobreathe()
{
    let mattk;

    if (C.Strangled) {
        C.You_cant("breathe.  Sorry.");
        return C.ECMD_OK;
    }
    if (C.u.uen < 15) {
        C.You("don't have enough energy to breathe!");
        return C.ECMD_OK;
    }
    C.u.uen -= 15;
    C.disp.botl = 1;

    if (!C.getdir(0))
        return C.ECMD_CANCEL;

    mattk = C.attacktype_fordmg(C.gy.youmonst.data, C.AT_BREA, C.AD_ANY);
    if (!mattk)
        C.impossible("bad breath attack?"); /* mouthwash needed... */
    else if (!C.u.dx && !C.u.dy && !C.u.dz)
        C.ubreatheu(mattk);
    else
        C.ubuzz(C.BZ_U_BREATH(C.BZ_OFS_AD(mattk.adtyp)), C.int(mattk.damn));
    return C.ECMD_TIME;
}

export function dospit()
{
    let otmp;
    let mattk;

    if (!C.getdir(0))
        return C.ECMD_CANCEL;
    mattk = C.attacktype_fordmg(C.gy.youmonst.data, C.AT_SPIT, C.AD_ANY);
    if (!mattk) {
        C.impossible("bad spit attack?");
    } else {
        switch (mattk.adtyp) {
        case C.AD_BLND:
        case C.AD_DRST:
            otmp = C.mksobj(C.BLINDING_VENOM, 1, 0);
            break;
        default:
            C.impossible("bad attack type in dospit");
            
            /*FALLTHRU*/
        case C.AD_ACID:
            otmp = C.mksobj(C.ACID_VENOM, 1, 0);
            break;
        }
        otmp.spe = 1; /* to indicate it's yours */
        C.throwit(otmp, 0n, 0, 0);
    }
    return C.ECMD_TIME;
}

export function doremove()
{
    if (!C.Punished) {
        if (C.u.utrap && C.u.utraptype == C.TT_BURIEDBALL) {
            C.pline_The("ball and chain are buried firmly in the %s.",
                      C.surface(C.u.ux, C.u.uy));
            return C.ECMD_OK;
        }
        C.You("are not chained to anything!");
        return C.ECMD_OK;
    }
    C.unpunish();
    return C.ECMD_TIME;
}

export function dospinweb()
{
    let x = C.u.ux, y = C.u.uy;
    let ttmp = C.t_at(x, y);
    /* disallow webs on water, lava, air & cloud */
    let reject_terrain = Number(Boolean(C.is_pool_or_lava(x, y) || C.IS_AIR(C.levl[x][y].typ)));

    /* [at the time this was written, it was not possible to be both a
       webmaker and a flyer, but with the advent of amulet of flying that
       became a possibility; at present hero can spin a web while flying] */
    if (C.Levitation || reject_terrain) {
        C.You("must be on %s ground to spin a web.",
            reject_terrain ? "solid" : "the");
        return C.ECMD_OK;
    }
    if (C.u.uswallow) {
        C.You("release web fluid inside %s.", C.mon_nam(C.u.ustuck));
        if (C.is_animal(C.u.ustuck.data)) {
            C.expels(C.u.ustuck, C.u.ustuck.data, 1);
            return C.ECMD_OK;
        }
        if (C.is_whirly(C.u.ustuck.data)) {
            let i;

            for (i = 0; i < C.NATTK; i++)
                if (C.u.ustuck.data.mattk[i].aatyp == C.AT_ENGL)
                    break;
            if (i == C.NATTK)
                C.impossible("Swallower has no engulfing attack?");
            else {
                const sweep = C.stackAlloc(30);

                C.storeChar(sweep + (0), 0);
                switch (C.u.ustuck.data.mattk[i].adtyp) {
                case C.AD_FIRE:
                    C.Strcpy(sweep, "ignites and ");
                    break;
                case C.AD_ELEC:
                    C.Strcpy(sweep, "fries and ");
                    break;
                case C.AD_COLD:
                    C.Strcpy(sweep, "freezes, shatters and ");
                    break;
                }
                C.pline_The("web %sis swept away!", sweep);
            }
            return C.ECMD_OK;
        } /* default: a nasty jelly-like creature */
        C.pline_The("web dissolves into %s.", C.mon_nam(C.u.ustuck));
        return C.ECMD_OK;
    }
    if (C.u.utrap) {
        C.You("cannot spin webs while stuck in a trap.");
        return C.ECMD_OK;
    }
    C.exercise(C.A_DEX, 1);
    if (ttmp) {
        switch (ttmp.ttyp) {
        case C.PIT:
        case C.SPIKED_PIT:
            C.You("spin a web, covering up the pit.");
            C.deltrap(ttmp);
            C.bury_objs(x, y);
            C.newsym(x, y);
            return C.ECMD_TIME;
        case C.SQKY_BOARD:
            C.pline_The("squeaky board is muffled.");
            C.deltrap(ttmp);
            C.newsym(x, y);
            return C.ECMD_TIME;
        case C.TELEP_TRAP:
        case C.LEVEL_TELEP:
        case C.MAGIC_PORTAL:
        case C.VIBRATING_SQUARE:
            C.Your("webbing vanishes!");
            return C.ECMD_OK;
        case C.WEB:
            C.You("make the web thicker.");
            return C.ECMD_TIME;
        case C.HOLE:
        case C.TRAPDOOR:
            C.You("web over the %s.",
                (ttmp.ttyp == C.TRAPDOOR) ? "trap door" : "hole");
            C.deltrap(ttmp);
            C.newsym(x, y);
            return C.ECMD_TIME;
        case C.ROLLING_BOULDER_TRAP:
            C.You("spin a web, jamming the trigger.");
            C.deltrap(ttmp);
            C.newsym(x, y);
            return C.ECMD_TIME;
        case C.ARROW_TRAP:
        case C.DART_TRAP:
        case C.BEAR_TRAP:
        case C.ROCKTRAP:
        case C.FIRE_TRAP:
        case C.LANDMINE:
        case C.SLP_GAS_TRAP:
        case C.RUST_TRAP:
        case C.MAGIC_TRAP:
        case C.ANTI_MAGIC:
        case C.POLY_TRAP:
            C.You("have triggered a trap!");
            C.dotrap(ttmp, C.NO_TRAP_FLAGS);
            return C.ECMD_TIME;
        default:
            C.impossible("Webbing over trap type %d?", ttmp.ttyp);
            return C.ECMD_OK;
        }
    } else if (C.On_stairs(x, y)) {
        /* cop out: don't let them hide the stairs */
        C.Your("web fails to impede access to the %s.",
             (C.levl[x][y].typ == C.STAIRS) ? "stairs" : "ladder");
        return C.ECMD_TIME;
    }
    ttmp = C.maketrap(x, y, C.WEB);
    if (ttmp) {
        C.You("spin a web.");
        ttmp.madeby_u = 1;
        C.feeltrap(ttmp);
        if (C.loadChar(C.in_rooms(x, y, C.SHOPBASE)))
            C.add_damage(x, y, C.SHOP_WEB_COST);
    }
    return C.ECMD_TIME;
}

export function dosummon()
{
    let placeholder;
    if (C.u.uen < 10) {
        C.You("lack the energy to send forth a call for help!");
        return C.ECMD_OK;
    }
    C.u.uen -= 10;
    C.disp.botl = 1;

    C.You("call upon your brethren for help!");
    C.exercise(C.A_WIS, 1);
    if (!C.were_summon(C.gy.youmonst.data, 1, C.intReference(() => placeholder, value => { placeholder = value; }), 0))
        C.pline("But none arrive.");
    return C.ECMD_TIME;
}

export function dogaze()
{
    let mtmp;
    let looked = 0;
    const qbuf = C.stackAlloc(C.QBUFSZ);
    let i;
    let adtyp = 0;

    for (i = 0; i < C.NATTK; i++) {
        if (C.gy.youmonst.data.mattk[i].aatyp == C.AT_GAZE) {
            adtyp = C.gy.youmonst.data.mattk[i].adtyp;
            break;
        }
    }
    if (adtyp != C.AD_CONF && adtyp != C.AD_FIRE) {
        C.impossible("gaze attack %d?", adtyp);
        return C.ECMD_OK;
    }

    if (C.Blind) {
        C.You_cant("see anything to gaze at.");
        return C.ECMD_OK;
    } else if (C.Hallucination) {
        C.You_cant("gaze at anything you can see.");
        return C.ECMD_OK;
    }
    if (C.u.uen < 15) {
        C.You("lack the energy to use your special gaze!");
        return C.ECMD_OK;
    }
    C.u.uen -= 15;
    C.disp.botl = 1;

    for (mtmp = C.fmon; mtmp; mtmp = mtmp.nmon) {
        if (C.DEADMONSTER(mtmp))
            continue;
        if (C.canseemon(mtmp) && C.couldsee(mtmp.mx, mtmp.my)) {
            looked++;
            if (C.Invis && !C.perceives(mtmp.data)) {
                C.pline("%s seems not to notice your gaze.", C.Monnam(mtmp));
            } else if (mtmp.minvis && !C.See_invisible) {
                C.You_cant("see where to gaze at %s.", C.Monnam(mtmp));
            } else if (C.M_AP_TYPE(mtmp) == C.M_AP_FURNITURE
                       || C.M_AP_TYPE(mtmp) == C.M_AP_OBJECT) {
                looked--;
                continue;
            } else if (C.flags.safe_dog && mtmp.mtame && !C.Confusion) {
                C.You("avoid gazing at %s.", C.y_monnam(mtmp));
            } else {
                if (C.flags.confirm && mtmp.mpeaceful && !C.Confusion) {
                    C.Sprintf(qbuf, "Really %s %s?",
                            (adtyp == C.AD_CONF) ? "confuse" : "attack",
                            C.mon_nam(mtmp));
                    if (C.y_n(qbuf) != 121)
                        continue;
                }
                C.setmangry(mtmp, 1);
                if (C.helpless(mtmp) || mtmp.mstun
                    || !mtmp.mcansee || !C.haseyes(mtmp.data)) {
                    looked--;
                    continue;
                }
                /* No reflection check for consistency with when a monster
                 * gazes at *you*--only medusa gaze gets reflected then.
                 */
                if (adtyp == C.AD_CONF) {
                    if (!mtmp.mconf)
                        C.Your("gaze confuses %s!", C.mon_nam(mtmp));
                    else
                        C.pline("%s is getting more and more confused.",
                              C.Monnam(mtmp));
                    mtmp.mconf = 1;
                } else if (adtyp == C.AD_FIRE) {
                    let dmg = C.d(() => (2), () => ( 6), 24), orig_dmg = dmg, lev = C.int(C.u.ulevel);

                    C.You("attack %s with a fiery gaze!", C.mon_nam(mtmp));
                    if (C.resists_fire(mtmp)) {
                        C.pline_The("fire doesn't burn %s!", C.mon_nam(mtmp));
                        dmg = 0;
                    }
                    if (lev > C.rn2(() => (20), 25)) {
                        dmg += C.destroy_items(mtmp, C.AD_FIRE, orig_dmg);
                        C.ignite_items(mtmp.minvent);
                    }
                    if (dmg)
                        mtmp.mhp -= dmg;
                    if (C.DEADMONSTER(mtmp))
                        C.killed(mtmp);
                }
                /* For consistency with passive() in uhitm.c, this only
                 * affects you if the monster is still alive.
                 */
                if (C.DEADMONSTER(mtmp))
                    continue;

                if (mtmp.data == C.mons[C.PM_FLOATING_EYE] && !mtmp.mcan) {
                    if (!C.Free_action) {
                        C.You("are frozen by %s gaze!",
                            C.s_suffix(C.mon_nam(mtmp)));
                        C.nomul((C.u.ulevel > 6 || C.rn2(() => (4), 26))
                                  ? -C.d(() => (C.int(mtmp.m_lev) + 1), () => (
                                       C.int(mtmp.data.mattk[0].damd)), 27)
                                  : -200);
                        C.gm.multi_reason = "frozen by a monster's gaze";
                        C.gn.nomovemsg = 0;
                        return C.ECMD_TIME;
                    } else
                        C.You("stiffen momentarily under %s gaze.",
                            C.s_suffix(C.mon_nam(mtmp)));
                }
                /* Technically this one shouldn't affect you at all because
                 * the Medusa gaze is an active monster attack that only
                 * works on the monster's turn, but for it to *not* have an
                 * effect would be too weird.
                 */
                if (mtmp.data == C.mons[C.PM_MEDUSA] && !mtmp.mcan) {
                    C.pline("Gazing at the awake %s is not a very good idea.",
                          C.l_monnam(mtmp));
                    /* as if gazing at a sleeping anything is fruitful... */
                    C.urgent_pline("You turn to stone...");
                    C.svk.killer.format = C.KILLED_BY;
                    C.Strcpy(C.svk.killer.name,
                           "deliberately meeting Medusa's gaze");
                    C.done(C.STONING);
                }
            }
        }
    }
    if (!looked)
        C.You("gaze at no place in particular.");
    return C.ECMD_TIME;
}

/* called by domonability() for #monster */
export function dohide()
{
    let ismimic = C.gy.youmonst.data.mlet == C.S_MIMIC,
            on_ceiling = Number(Boolean(C.is_clinger(C.gy.youmonst.data) || C.Flying));

    /* can't hide while being held (or holding) or while trapped
       (except for floor hiders [trapper or mimic] in pits) */
    if (C.u.ustuck || (C.u.utrap && (C.u.utraptype != C.TT_PIT || on_ceiling))) {
        C.You_cant("hide while you're %s.",
                 !C.u.ustuck ? "trapped"
                   : C.u.uswallow ? (C.digests(C.u.ustuck.data) ? "swallowed"
                                                           : "engulfed")
                     : !C.sticks(C.gy.youmonst.data) ? "being held"
                       : (C.humanoid(C.u.ustuck.data) ? "holding someone"
                                                   : "holding that creature"));
        if (C.u.uundetected || (ismimic && C.U_AP_TYPE != C.M_AP_NOTHING)) {
            C.u.uundetected = 0;
            C.gy.youmonst.m_ap_type = C.M_AP_NOTHING;
            C.newsym(C.u.ux, C.u.uy);
        }
        return C.ECMD_OK;
    }
    /* note: hero-as-eel handling is incomplete but unnecessary;
       such critters aren't offered the option of hiding via #monster */
    if (C.gy.youmonst.data.mlet == C.S_EEL && !C.is_pool(C.u.ux, C.u.uy)) {
        if (C.IS_FOUNTAIN(C.levl[C.u.ux][C.u.uy].typ))
            C.pline_The("fountain is not deep enough to hide in.");
        else
            C.There("is no %s to hide in here.", C.hliquid("water"));
        C.u.uundetected = 0;
        return C.ECMD_OK;
    }
    if (C.hides_under(C.gy.youmonst.data)) {
        let ct = 0n;
        let otmp, otop = C.svl.level.objects[C.u.ux][C.u.uy];

        if (!otop) {
            C.There("is nothing to hide under here.");
            C.u.uundetected = 0;
            return C.ECMD_OK;
        }
        for (otmp = otop;
             otmp && otmp.otyp == C.CORPSE
                  && C.touch_petrifies(C.mons[otmp.corpsenm]);
             otmp = otmp.nexthere)
            ct += otmp.quan;
        /* otmp will be Null iff the entire pile consists of 'trice corpses */
        if (!otmp && !C.Stone_resistance) {
            const kbuf = C.stackAlloc(C.BUFSZ);
            let corpse_name = C.cxname(otop);

            /* for the plural case, we'll say "cockatrice corpses" or
               "chickatrice corpses" depending on the top of the pile
               even if both types are present */
            if (ct == 1)
                corpse_name = C.an(corpse_name);
            /* no need to check poly_when_stoned(); no hide-underers can
               turn into stone golems instead of becoming petrified */
            C.pline("Hiding under %s%s is a fatal mistake...",
                  corpse_name, C.plur(ct));
            C.Sprintf(kbuf, "hiding under %s%s", corpse_name, C.plur(ct));
            C.instapetrify(kbuf);
            /* only reach here if life-saved */
            C.u.uundetected = 0;
            return C.ECMD_TIME;
        }
    }
    /* Planes of Air and Water */
    if (on_ceiling && !C.has_ceiling(C.u.uz)) {
        C.There("is nowhere to hide above you.");
        C.u.uundetected = 0;
        return C.ECMD_OK;
    }
    if ((C.is_hider(C.gy.youmonst.data) && !C.Flying) /* floor hider */
        && (C.Is_airlevel(C.u.uz) || C.Is_waterlevel(C.u.uz))) {
        C.There("is nowhere to hide beneath you.");
        C.u.uundetected = 0;
        return C.ECMD_OK;
    }
    /* TODO? inhibit floor hiding at furniture locations, or
     * else make youhiding() give smarter messages at such spots.
     */

    if (C.u.uundetected || (ismimic && C.U_AP_TYPE != C.M_AP_NOTHING)) {
        C.youhiding(0, 1); /* "you are already hiding" */
        return C.ECMD_OK;
    }

    if (ismimic) {
        /* should bring up a dialog "what would you like to imitate?" */
        C.gy.youmonst.m_ap_type = C.M_AP_OBJECT;
        C.gy.youmonst.mappearance = C.STRANGE_OBJECT;
    } else
        C.u.uundetected = 1;
    C.newsym(C.u.ux, C.u.uy);
    C.youhiding(0, 0); /* "you are now hiding" */
    return C.ECMD_TIME;
}

export function dopoly()
{
    let savedat = C.gy.youmonst.data;

    if (C.is_vampire(C.gy.youmonst.data) || C.is_vampshifter(C.gy.youmonst)) {
        C.callLocal(polyself, C.POLY_MONSTER);
        if (savedat != C.gy.youmonst.data) {
            C.You("transform into %s.",
                C.an(C.pmname(C.gy.youmonst.data, C.Ugender)));
            C.newsym(C.u.ux, C.u.uy);
        }
    }
    return C.ECMD_TIME;
}

/* #monster for hero-as-mind_flayer giving psychic blast */
export function domindblast()
{
    let mtmp, nmon;
    let dmg;

    if (C.u.uen < 10) {
        C.You("concentrate but lack the energy to maintain doing so.");
        return C.ECMD_OK;
    }
    C.u.uen -= 10;
    C.disp.botl = 1;

    C.You("concentrate.");
    C.pline("A wave of psychic energy pours out.");
    for (mtmp = C.fmon; mtmp; mtmp = nmon) {
        let u_sen;

        nmon = mtmp.nmon;
        if (C.DEADMONSTER(mtmp))
            continue;
        if (C.mdistu(mtmp) > C.BOLT_LIM * C.BOLT_LIM)
            continue;
        if (mtmp.mpeaceful)
            continue;
        if (C.mindless(mtmp.data))
            continue;
        u_sen = Number(Boolean(C.telepathic(mtmp.data) && !mtmp.mcansee));
        if (u_sen || (C.telepathic(mtmp.data) && C.rn2(() => (2), 28)) || !C.rn2(() => (10), 29)) {
            dmg = C.rnd(() => (15), 30);
            /* wake it up first, to bring hidden monster out of hiding;
               but in case it is currently peaceful, don't make it hostile
               unless it will survive the psychic blast, otherwise hero
               would avoid the penalty for killing it while peaceful */
            C.wakeup(mtmp, (dmg > mtmp.mhp) ? 1 : 0);
            C.You("lock in on %s %s.", C.s_suffix(C.mon_nam(mtmp)),
                u_sen ? "telepathy"
                : C.telepathic(mtmp.data) ? "latent telepathy"
                  : "mind");
            mtmp.mhp -= dmg;
            if (C.DEADMONSTER(mtmp))
                C.killed(mtmp);
        }
    }
    return C.ECMD_TIME;
}

export function uunstick()
{
    let mtmp = C.u.ustuck;

    if (!mtmp) {
        C.impossible("uunstick: no ustuck?");
        return;
    }
    C.set_ustuck(0); /* before pline() */
    C.pline("%s is no longer in your clutches.", C.Monnam(mtmp));
}

export function skinback(silently)
{
    silently = C.boolean(silently);
    if (C.uskin) {
        let old_light = C.arti_light_radius(C.uskin);

        if (!silently)
            C.Your("skin returns to its original form.");
        C.uarm = C.uskin;
        C.uskin = 0;
        /* undo save/restore hack */
        C.uarm.owornmask &= ~C.I_SPECIAL;

        if (C.artifact_light(C.uarm))
            C.maybe_adjust_light(C.uarm, old_light);
    }
}

export function mbodypart(mon, part)
{
    part = C.int(part);
    const humanoid_parts = [ "arm",       "eye",  "face",         "finger",
                              "fingertip", "foot", "hand",         "handed",
                              "head",      "leg",  "light headed", "neck",
                              "spine",     "toe",  "hair",         "blood",
                              "lung",      "nose", "stomach" ],
        jelly_parts = [ "pseudopod", "dark spot", "front",
                           "pseudopod extension", "pseudopod extremity",
                           "pseudopod root", "grasp", "grasped",
                           "cerebral area", "lower pseudopod", "viscous",
                           "middle", "surface", "pseudopod extremity",
                           "ripples", "juices", "surface", "sensor",
                           "stomach" ],
        animal_parts = [ "forelimb",  "eye",           "face",
                            "foreclaw",  "claw tip",      "rear claw",
                            "foreclaw",  "clawed",        "head",
                            "rear limb", "light headed",  "neck",
                            "spine",     "rear claw tip", "fur",
                            "blood",     "lung",          "nose",
                            "stomach" ],
        bird_parts = [ "wing",     "eye",  "face",         "wing",
                          "wing tip", "foot", "wing",         "winged",
                          "head",     "leg",  "light headed", "neck",
                          "spine",    "toe",  "feathers",     "blood",
                          "lung",     "bill", "stomach" ],
        horse_parts = [ "foreleg",  "eye",           "face",
                           "forehoof", "hoof tip",      "rear hoof",
                           "forehoof", "hooved",        "head",
                           "rear leg", "light headed",  "neck",
                           "backbone", "rear hoof tip", "mane",
                           "blood",    "lung",          "nose",
                           "stomach" ],
        sphere_parts = [ "appendage", "optic nerve", "body", "tentacle",
                            "tentacle tip", "lower appendage", "tentacle",
                            "tentacled", "body", "lower tentacle",
                            "rotational", "equator", "body",
                            "lower tentacle tip", "cilia", "life force",
                            "retina", "olfactory nerve", "interior" ],
        fungus_parts = [ "mycelium", "visual area", "front",
                            "hypha",    "hypha",       "root",
                            "strand",   "stranded",    "cap area",
                            "rhizome",  "sporulated",  "stalk",
                            "root",     "rhizome tip", "spores",
                            "juices",   "gill",        "gill",
                            "interior" ],
        vortex_parts = [ "region",        "eye",           "front",
                            "minor current", "minor current", "lower current",
                            "swirl",         "swirled",       "central core",
                            "lower current", "addled",        "center",
                            "currents",      "edge",          "currents",
                            "life force",    "center",        "leading edge",
                            "interior" ],
        snake_parts = [ "vestigial limb", "eye", "face", "large scale",
                           "large scale tip", "rear region", "scale gap",
                           "scale gapped", "head", "rear region",
                           "light headed", "neck", "length", "rear scale",
                           "scales", "blood", "lung", "forked tongue",
                           "stomach" ],
        worm_parts = [ "anterior segment", "light sensitive cell",
                          "clitellum", "setae", "setae", "posterior segment",
                          "segment", "segmented", "anterior segment",
                          "posterior", "over stretched", "clitellum",
                          "length", "posterior setae", "setae", "blood",
                          "skin", "prostomium", "stomach" ],
        spider_parts = [ "pedipalp", "eye", "face", "pedipalp", "tarsus",
                            "claw", "pedipalp", "palped", "cephalothorax",
                            "leg", "spun out", "cephalothorax", "abdomen",
                            "claw", "hair", "hemolymph", "book lung",
                            "labrum", "digestive tract" ],
        fish_parts = [ "fin", "eye", "premaxillary", "pelvic axillary",
                          "pelvic fin", "anal fin", "pectoral fin", "finned",
                          "head", "peduncle", "played out", "gills",
                          "dorsal fin", "caudal fin", "scales", "blood",
                          "gill", "nostril", "stomach" ];
    /* claw attacks are overloaded in mons[]; most humanoids with
       such attacks should still reference hands rather than claws */
    const not_claws = [
        C.S_HUMAN,     C.S_MUMMY,   C.S_ZOMBIE, C.S_ANGEL, C.S_NYMPH, C.S_LEPRECHAUN,
        C.S_QUANTMECH, C.S_VAMPIRE, C.S_ORC,    C.S_GIANT, /* quest nemeses */
        0 /* string terminator; assert( S_xxx != 0 ); */
    ];
    let mptr = mon.data;

    if (part <= C.NO_PART) {
        C.impossible("mbodypart: bad part %d", part);
        return "mystery part";
    }

    /* some special cases */
    if (mptr.mlet == C.S_DOG || mptr.mlet == C.S_FELINE
        || mptr.mlet == C.S_RODENT || mptr == C.mons[C.PM_OWLBEAR]) {
        switch (part) {
        case C.HAND:
            return "paw";
        case C.HANDED:
            return "pawed";
        case C.FOOT:
            return "rear paw";
        case C.ARM:
        case C.LEG:
            return horse_parts[part]; /* "foreleg", "rear leg" */
        default:
            break; /* for other parts, use animal_parts[] below */
        }
    } else if (mptr.mlet == C.S_YETI) { /* excl. owlbear due to 'if' above */
        /* opposable thumbs, hence "hands", "arms", "legs", &c */
        return humanoid_parts[part]; /* yeti/sasquatch, monkey/ape */
    }
    if ((part == C.HAND || part == C.HANDED)
        && (C.humanoid(mptr) && C.attacktype(mptr, C.AT_CLAW)
            && !C.strchr(not_claws, mptr.mlet) && mptr != C.mons[C.PM_STONE_GOLEM]
            && mptr != C.mons[C.PM_AMOROUS_DEMON]))
        return (part == C.HAND) ? "claw" : "clawed";
    if ((mptr == C.mons[C.PM_MUMAK] || mptr == C.mons[C.PM_MASTODON])
        && part == C.NOSE)
        return "trunk";
    if (mptr == C.mons[C.PM_SHARK] && part == C.HAIR)
        return "skin"; /* sharks don't have scales */
    if ((mptr == C.mons[C.PM_JELLYFISH] || mptr == C.mons[C.PM_KRAKEN])
        && (part == C.ARM || part == C.FINGER || part == C.HAND || part == C.FOOT
            || part == C.TOE))
        return "tentacle";
    if (mptr == C.mons[C.PM_FLOATING_EYE] && part == C.EYE)
        return "cornea";
    if (C.humanoid(mptr) && (part == C.ARM || part == C.FINGER || part == C.FINGERTIP
                           || part == C.HAND || part == C.HANDED))
        return humanoid_parts[part];
    if (mptr.mlet == C.S_COCKATRICE)
        return (part == C.HAIR) ? snake_parts[part] : bird_parts[part];
    if (mptr == C.mons[C.PM_RAVEN])
        return bird_parts[part];
    if (mptr.mlet == C.S_CENTAUR || mptr.mlet == C.S_UNICORN
        || mptr == C.mons[C.PM_KI_RIN]
        || (mptr == C.mons[C.PM_ROTHE] && part != C.HAIR))
        return horse_parts[part];
    if (mptr.mlet == C.S_LIGHT) {
        if (part == C.HANDED)
            return "rayed";
        else if (part == C.ARM || part == C.FINGER || part == C.FINGERTIP
                 || part == C.HAND)
            return "ray";
        else
            return "beam";
    }
    if (mptr == C.mons[C.PM_STALKER] && part == C.HEAD)
        return "head";
    if (mptr.mlet == C.S_EEL && mptr != C.mons[C.PM_JELLYFISH])
        return fish_parts[part];
    if (mptr.mlet == C.S_WORM)
        return worm_parts[part];
    if (mptr.mlet == C.S_SPIDER)
        return spider_parts[part];
    if (C.slithy(mptr) || (mptr.mlet == C.S_DRAGON && part == C.HAIR))
        return snake_parts[part];
    if (mptr.mlet == C.S_EYE)
        return sphere_parts[part];
    if (mptr.mlet == C.S_JELLY || mptr.mlet == C.S_PUDDING
        || mptr.mlet == C.S_BLOB || mptr == C.mons[C.PM_JELLYFISH])
        return jelly_parts[part];
    if (mptr.mlet == C.S_VORTEX || mptr.mlet == C.S_ELEMENTAL)
        return vortex_parts[part];
    if (mptr.mlet == C.S_FUNGUS)
        return fungus_parts[part];
    if (C.humanoid(mptr))
        return humanoid_parts[part];
    return animal_parts[part];
}

export function body_part(part)
{
    part = C.int(part);
    return C.callLocal(mbodypart, C.gy.youmonst, part);
}

export function poly_gender()
{
    /* Returns gender of polymorphed player;
     * 0/1=same meaning as flags.female, 2=none.
     */
    if (C.is_neuter(C.gy.youmonst.data) || !C.humanoid(C.gy.youmonst.data))
        return 2;
    return C.flags.female;
}

export function ugolemeffects(damtype, dam)
{
    damtype = C.int(damtype);dam = C.int(dam);
    let heal = 0;

    /* We won't bother with "slow"/"haste" since players do not
     * have a monster-specific slow/haste so there is no way to
     * restore the old velocity once they are back to human.
     */
    if (C.u.umonnum != C.PM_FLESH_GOLEM && C.u.umonnum != C.PM_IRON_GOLEM)
        return;
    switch (damtype) {
    case C.AD_ELEC:
        if (C.u.umonnum == C.PM_FLESH_GOLEM)
            heal = Math.trunc((dam + 5) / 6); /* Approx 1 per die */
        break;
    case C.AD_FIRE:
        if (C.u.umonnum == C.PM_IRON_GOLEM)
            heal = dam;
        break;
    }
    if (heal && (C.u.mh < C.u.mhmax)) {
        C.u.mh += heal;
        if (C.u.mh > C.u.mhmax)
            C.u.mh = C.u.mhmax;
        C.disp.botl = 1;
        C.pline("Strangely, you feel better than before.");
        C.exercise(C.A_STR, 1);
    }
}

export function armor_to_dragon(atyp)
{
    atyp = C.int(atyp);
    switch (atyp) {
    case C.GRAY_DRAGON_SCALE_MAIL:
    case C.GRAY_DRAGON_SCALES:
        return C.PM_GRAY_DRAGON;
    case C.SILVER_DRAGON_SCALE_MAIL:
    case C.SILVER_DRAGON_SCALES:
        return C.PM_SILVER_DRAGON;
    case C.GOLD_DRAGON_SCALE_MAIL:
    case C.GOLD_DRAGON_SCALES:
        return C.PM_GOLD_DRAGON;
// #if 0 
/* DEFERRED */
//     case SHIMMERING_DRAGON_SCALE_MAIL:
//     case SHIMMERING_DRAGON_SCALES:
//         return PM_SHIMMERING_DRAGON;
// #endif
    case C.RED_DRAGON_SCALE_MAIL:
    case C.RED_DRAGON_SCALES:
        return C.PM_RED_DRAGON;
    case C.ORANGE_DRAGON_SCALE_MAIL:
    case C.ORANGE_DRAGON_SCALES:
        return C.PM_ORANGE_DRAGON;
    case C.WHITE_DRAGON_SCALE_MAIL:
    case C.WHITE_DRAGON_SCALES:
        return C.PM_WHITE_DRAGON;
    case C.BLACK_DRAGON_SCALE_MAIL:
    case C.BLACK_DRAGON_SCALES:
        return C.PM_BLACK_DRAGON;
    case C.BLUE_DRAGON_SCALE_MAIL:
    case C.BLUE_DRAGON_SCALES:
        return C.PM_BLUE_DRAGON;
    case C.GREEN_DRAGON_SCALE_MAIL:
    case C.GREEN_DRAGON_SCALES:
        return C.PM_GREEN_DRAGON;
    case C.YELLOW_DRAGON_SCALE_MAIL:
    case C.YELLOW_DRAGON_SCALES:
        return C.PM_YELLOW_DRAGON;
    default:
        return C.NON_PM;
    }
}

/* some species have awareness of other species */
export function polysense()
{
    let warnidx = C.NON_PM;

    C.svc.context.warntype.speciesidx = C.NON_PM;
    C.svc.context.warntype.species = 0;
    C.svc.context.warntype.polyd = 0;
    C.HWarn_of_mon &= ~C.FROMRACE;

    switch (C.u.umonnum) {
    case C.PM_PURPLE_WORM:
    case C.PM_BABY_PURPLE_WORM:
        warnidx = C.PM_SHRIEKER;
        break;
    case C.PM_VAMPIRE:
    case C.PM_VAMPIRE_LEADER:
        C.svc.context.warntype.polyd = C.M2_HUMAN | C.M2_ELF;
        C.HWarn_of_mon |= C.FROMRACE;
        return;
    }
    if (C.ismnum(warnidx)) {
        C.svc.context.warntype.speciesidx = warnidx;
        C.svc.context.warntype.species = C.mons[warnidx];
        C.HWarn_of_mon |= C.FROMRACE;
    }
}

/* True iff hero's role or race has been genocided */
export function ugenocided()
{
    return (Number(Boolean((C.svm.mvitals[C.gu.urole.mnum].mvflags & C.G_GENOD)
            || (C.svm.mvitals[C.gu.urace.mnum].mvflags & C.G_GENOD))));
}

/* how hero feels "inside" after self-genocide of role or race */
export function udeadinside()
{
    /* self-genocide used to always say "you feel dead inside" but that
       seems silly when you're polymorphed into something undead;
       monkilled() distinguishes between living (killed) and non (destroyed)
       for monster death message; we refine the nonliving aspect a bit */
    return !C.nonliving(C.gy.youmonst.data)
             ? "dead"          /* living, including demons */
             : !C.weirdnonliving(C.gy.youmonst.data)
                 ? "condemned" /* undead plus manes */
                 : "empty";    /* golems plus vortices */
}

/*polyself.c*/

/* change monster type to match new sex; disabled with
           PM_AMOROUS_DEMON */
