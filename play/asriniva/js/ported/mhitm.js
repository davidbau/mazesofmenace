/* NetHack 5.0	mhitm.c	$NHDT-Date: 1732979463 2024/11/30 07:11:03 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.253 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Robert Patrick Rankin, 2011. */
/* NetHack may be freely redistributed.  See license for details. */

import { C } from '../c-runtime/context.js';
// Original artifact constants come from compiled metadata.

export const brief_feeling =
    "have a %s feeling for a moment, then it passes.";


export function noises(magr, mattk)
{
    let farq = (C.mdistu(magr) > 15);

    if (!C.Deaf && (farq != C.gf.far_noise || C.long(C.svm.moves - C.gn.noisetime) > 10n)) {
        C.gf.far_noise = farq;
        C.gn.noisetime = C.svm.moves;
        C.You_hear("%s%s.",
                 (mattk.aatyp == C.AT_EXPL) ? "an explosion" : "some noises",
                 farq ? " in the distance" : "");
    }
}

export function pre_mm_attack(magr, mdef)
{
    let showit = 0;

    /* unhiding or unmimicking happens even if hero can't see it
       because the formerly concealed monster is now in action */
    if (C.M_AP_TYPE(mdef)) {
        C.seemimic(mdef);
        showit |= C.gv.vis;
    } else if (mdef.mundetected) {
        mdef.mundetected = 0;
        showit |= C.gv.vis;
    }
    if (C.M_AP_TYPE(magr)) {
        C.seemimic(magr);
        showit |= C.gv.vis;
    } else if (magr.mundetected) {
        magr.mundetected = 0;
        showit |= C.gv.vis;
    }

    if (C.gv.vis) {
        if (!C.canspotmon(magr))
            C.map_invisible(magr.mx, magr.my);
        else if (showit)
            C.newsym(magr.mx, magr.my);
        if (!C.canspotmon(mdef))
            C.map_invisible(mdef.mx, mdef.my);
        else if (showit)
            C.newsym(mdef.mx, mdef.my);
    }
}

/* feedback for when a monster-vs-monster attack misses */
export function missmm(magr, mdef, mattk) /* attacker */ /* defender */ /* attack and damage types */
{
    pre_mm_attack(magr, mdef);

    if (C.gv.vis) {
        C.pline("%s %s %s.", C.Monnam(magr),
              (magr.mcan || !C.could_seduce(magr, mdef, mattk)) ? "misses"
                  : "pretends to be friendly to",
              C.mon_nam_too(mdef, magr));
    } else {
        noises(magr, mattk);
    }
}

/*
 *  fightm()  -- fight some other monster
 *
 *  Returns:
 *      0 - Monster did nothing.
 *      1 - If the monster made an attack.  The monster might have died.
 *
 *  There is an exception to the above.  If mtmp has the hero swallowed,
 *  then we report that the monster did nothing so it will continue to
 *  digest the hero.
 */
 /* have monsters fight each other */
export function fightm(mtmp)
{
    let mon, nmon;
    let result, has_u_swallowed;
    /* perhaps the monster will resist Conflict */
    if (C.resist_conflict(mtmp))
        return 0;

    if (C.samePtr(C.u.ustuck, mtmp)) {
        /* perhaps we're holding it... */
        if (C.itsstuck(mtmp))
            return 0;
    }
    has_u_swallowed = C.engulfing_u(mtmp);

    for (mon = C.fmon; mon; mon = nmon) {
        nmon = mon.nmon;
        if (C.samePtr(nmon, mtmp))
            nmon = mtmp.nmon;
        /* Be careful to ignore monsters that are already dead, since we
         * might be calling this before we've cleaned them up.  This can
         * happen if the monster attacked a cockatrice bare-handedly, for
         * instance.
         */
        if (!C.samePtr(mon, mtmp) && !C.DEADMONSTER(mon)) {
            if (C.monnear(mtmp, mon.mx, mon.my)) {
                if (!C.u.uswallow && (C.samePtr(mtmp, C.u.ustuck))) {
                    if (!C.rn2(4, 133, 'fightm')) {
                        C.set_ustuck(0);
                        C.pline("%s releases you!", C.Monnam(mtmp));
                    } else
                        break;
                }

                /* mtmp can be killed */
                C.gb.bhitpos.x = mon.mx, C.gb.bhitpos.y = mon.my;
                C.gn.notonhead = 0;
                result = C.callLocal(mattackm, mtmp, mon);

                if (result & C.M_ATTK_AGR_DIED)
                    return 1; /* mtmp died */
                /*
                 * If mtmp has the hero swallowed, lie and say there
                 * was no attack (this allows mtmp to digest the hero).
                 */
                if (has_u_swallowed)
                    return 0;

                /* allow attacked monsters a chance to hit back, primarily
                   to allow monsters that resist conflict to respond */
                if ((result & (C.M_ATTK_HIT | C.M_ATTK_DEF_DIED)) == C.M_ATTK_HIT
                    && C.rn2(4, 157, 'fightm') && mon.movement > C.rn2(C.NORMAL_SPEED, 157, 'fightm')) {
                    if (mon.movement > C.NORMAL_SPEED)
                        mon.movement -= C.NORMAL_SPEED;
                    else
                        mon.movement = 0;
                    C.gb.bhitpos.x = mtmp.mx, C.gb.bhitpos.y = mtmp.my;
                    C.gn.notonhead = 0;
                    C.callLocal(mattackm, mon, mtmp); /* return attack */
                }

                return (result & C.M_ATTK_HIT) ? 1 : 0;
            }
        }
    }
    return 0;
}

/*
 * mdisplacem() -- attacker moves defender out of the way;
 *                 returns same results as mattackm().
 */
export function mdisplacem(magr, mdef, quietly)
{
    let pa, pd;
    let tx, ty, fx, fy;

    /* sanity checks; could matter if we unexpectedly get a long worm */
    if (!magr || !mdef || C.samePtr(magr, mdef))
        return C.M_ATTK_MISS;
    pa = magr.data, pd = mdef.data;
    tx = mdef.mx, ty = mdef.my; /* destination */
    fx = magr.mx, fy = magr.my; /* current location */
    if (!C.samePtr(C.m_at(fx, fy), magr) || !C.samePtr(C.m_at(tx, ty), mdef))
        return C.M_ATTK_MISS;

    /* The 1 in 7 failure below matches the chance in do_attack()
     * for pet displacement.
     */
    if (!C.rn2(7, 199, 'mdisplacem'))
        return C.M_ATTK_MISS;

    /* Grid bugs cannot displace at an angle. */
    if (C.samePtr(pa, C.mons[C.PM_GRID_BUG]) && magr.mx != mdef.mx
        && magr.my != mdef.my)
        return C.M_ATTK_MISS;

    /* undetected monster becomes un-hidden if it is displaced */
    if (mdef.mundetected)
        mdef.mundetected = 0;
    if (C.M_AP_TYPE(mdef) && C.M_AP_TYPE(mdef) != C.M_AP_MONSTER)
        C.seemimic(mdef);
    /* wake up the displaced defender */
    mdef.msleeping = 0;
    mdef.mstrategy &= ~C.STRAT_WAITMASK;
    C.finish_meating(mdef);

    /*
     * Set up the visibility of action.
     * You can observe monster displacement if you can see both of
     * the monsters involved.
     */
    C.gv.vis = (C.canspotmon(magr) && C.canspotmon(mdef));

    if (C.touch_petrifies(pd) && !C.resists_ston(magr)) {
        if (!C.which_armor(magr, C.W_ARMG)) {
            if (C.poly_when_stoned(pa)) {
                C.mon_to_stone(magr);
                return C.M_ATTK_HIT; /* no damage during the polymorph */
            }
            if (!quietly && C.canspotmon(magr)) {
                if (C.gv.vis) {
                    C.pline("%s tries to move %s out of %s way.", C.Monnam(magr),
                          C.mon_nam(mdef), C.is_rider(pa) ? "the" : C.mhis(magr));
                }
                C.pline_mon(magr, "%s turns to stone!", C.Monnam(magr));
            }
            C.monstone(magr);
            if (!C.DEADMONSTER(magr))
                return C.M_ATTK_HIT; /* lifesaved */
            else if (magr.mtame && !C.gv.vis)
                C.You(brief_feeling, "peculiarly sad");
            return C.M_ATTK_AGR_DIED;
        }
    }

    C.remove_monster(fx, fy); /* pick up from orig position */
    if (mdef.wormno)
        C.remove_worm(mdef);
    else
        C.remove_monster(tx, ty);
    C.place_monster(magr, tx, ty); /* put down at target spot */
    C.place_monster(mdef, fx, fy);
    if (mdef.wormno) /* now put down tail */
        C.place_worm_tail_randomly(mdef, fx, fy);
    /* either creature might move into or out of a poison gas cloud */
    C.update_monster_region(magr);
    C.update_monster_region(mdef);

    if (C.gv.vis && !quietly)
        C.pline("%s moves %s out of %s way!", C.Monnam(magr), C.mon_nam(mdef),
              C.is_rider(pa) ? "the" : C.mhis(magr));
    C.newsym(fx, fy);  /* see it       */
    C.newsym(tx, ty);  /*   all happen */
    C.flush_screen(0); /* make sure it shows up */

    return C.M_ATTK_HIT;
}

/*
 * mattackm() -- a monster attacks another monster.
 *
 *          --------- aggressor died
 *         /  ------- defender died
 *        /  /  ----- defender was hit
 *       /  /  /
 *      x  x  x
 *
 *      0x8     M_ATTK_AGR_DONE
 *      0x4     M_ATTK_AGR_DIED
 *      0x2     M_ATTK_DEF_DIED
 *      0x1     M_ATTK_HIT
 *      0x0     M_ATTK_MISS
 *
 * Each successive attack has a lower probability of hitting.  Some rely on
 * success of previous attacks.  ** this doesn't seem to be implemented -dl **
 *
 * Attacker has targeted <bhitpos.x,bhitpos.y> rather than
 * <mdef->mx,mdef->my>; matters for long worms.
 *
 * In the case of exploding monsters, the monster dies as well.
 */
export function mattackm(magr, mdef)
{
    let i,          /* loop counter */
        tmp,        /* armor class difference */
        strike = 0, /* hit this attack */
        attk,       /* attack attempted this time */
        struck = 0, /* hit at least once */
        res = C.intArrayLocal(C.NATTK), /* results of all attacks */
        dieroll = 0;
    let mattk; const alt_attk = C.attackLocal();
    let mwep;
    let pa, pd;

    if (!magr || !mdef)
        return C.M_ATTK_MISS; /* mike@genat */
    if (C.helpless(magr))
        return C.M_ATTK_MISS;
    pa = magr.data;
    pd = mdef.data;

    /* Grid bugs cannot attack at an angle. */
    if (C.samePtr(pa, C.mons[C.PM_GRID_BUG]) && magr.mx != mdef.mx
        && magr.my != mdef.my)
        return C.M_ATTK_MISS;

    /* Calculate the armour class differential. */
    tmp = C.find_mac(mdef) + magr.m_lev;
    if (mdef.mconf || C.helpless(mdef)) {
        tmp += 4;
        mdef.msleeping = 0;
    }

    /* mundetected monsters become un-hidden if they are attacked */
    if (mdef.mundetected) {
        mdef.mundetected = 0;
        C.newsym(mdef.mx, mdef.my);
        if (C.canseemon(mdef) && !C.sensemon(mdef)) {
            if (C.Unaware) {
                let justone = (mdef.data.geno & C.G_UNIQ) != 0n;
                let montype;

                montype = C.noname_monnam(mdef, justone ? C.ARTICLE_THE
                                                      : C.ARTICLE_NONE);
                if (!justone)
                    montype = C.makeplural(montype);
                C.You("dream of %s.", montype);
            } else {
                if (C.iflags.last_msg == C.PLNMSG_HIDE_UNDER
                    && mdef.m_id == C.gl.last_hider)
                    C.pline_mon(mdef, "%s emerges from hiding.", C.Monnam(mdef));
                else if (mdef.m_id == C.gl.last_hider)
                    C.You("notice %s.", C.mon_nam(mdef));
                else
                    C.pline("Suddenly, you notice %s.", C.a_monnam(mdef));
            }
        }
    }

    /* Elves hate orcs. */
    if (C.is_elf(pa) && C.is_orc(pd))
        tmp++;

    /* Set up the visibility of action */
    C.gv.vis = ((C.cansee(magr.mx, magr.my) && C.canspotmon(magr))
              || (C.cansee(mdef.mx, mdef.my) && C.canspotmon(mdef)));

    /* Set flag indicating monster has moved this turn.  Necessary since a
     * monster might get an attack out of sequence (i.e. before its move) in
     * some cases, in which case this still counts as its move for the round
     * and it shouldn't move again.
     */
    magr.mlstmv = C.svm.moves;

    /* controls whether a mind flayer uses all of its tentacle-for-DRIN
       attacks; when fighting a headless monster, stop after the first
       one because repeating the same failing hit (or even an ordinary
       tentacle miss) is very verbose and makes the flayer look stupid */
    C.gs.skipdrin = 0;

    /* Now perform all attacks for the monster. */
    for (i = 0; i < C.NATTK; i++) {
        res[i] = C.M_ATTK_MISS;

        /* target might no longer be there */
        if (i > 0 && (!C.samePtr(C.m_at(C.gb.bhitpos.x, C.gb.bhitpos.y), mdef)
                      || C.DEADMONSTER(magr) || C.DEADMONSTER(mdef)))
            continue;

        mattk = C.getmattk(magr, mdef, i, res, alt_attk);
        /* reduce verbosity for mind flayer attacking creature without a
           head (or worm's tail); this is similar to monster with multiple
           attacks after a wildmiss against displaced or invisible hero */
        if (C.gs.skipdrin && mattk.aatyp == C.AT_TENT && mattk.adtyp == C.AD_DRIN)
            continue;
        mwep = 0;
        attk = 1;

        switch (mattk.aatyp) {
        case C.AT_WEAP: /* "hand to hand" attacks */
            if (C.distmin(magr.mx, magr.my, mdef.mx, mdef.my) > 1) {
                /* D: Do a ranged attack here! */
                strike = (C.thrwmm(magr, mdef) == C.M_ATTK_MISS) ? 0 : 1;
                if (strike)
                    /* don't really know if we hit or not; pretend we did */
                    res[i] |= C.M_ATTK_HIT;
                if (C.DEADMONSTER(mdef))
                    res[i] = C.M_ATTK_DEF_DIED;
                if (C.DEADMONSTER(magr))
                    res[i] |= C.M_ATTK_AGR_DIED;
                break;
            }
            if (magr.weapon_check == C.NEED_WEAPON || !C.MON_WEP(magr)) {
                magr.weapon_check = C.NEED_HTH_WEAPON;
                if (C.mon_wield_item(magr) != 0)
                    return C.M_ATTK_MISS;
            }
            C.possibly_unwield(magr, 0);
            if ((mwep = C.MON_WEP(magr)) != 0) {
                if (C.gv.vis)
                    mswingsm(magr, mdef, mwep);
                tmp += C.hitval(mwep, mdef);
            }
            
            /*FALLTHRU*/
        case C.AT_CLAW:
        case C.AT_KICK:
        case C.AT_BITE:
        case C.AT_STNG:
        case C.AT_TUCH:
        case C.AT_BUTT:
        case C.AT_TENT:
            if (mattk.aatyp == C.AT_KICK && C.mtrapped_in_pit(magr))
                    continue;
            /* Nymph that teleported away on first attack? */
            if (C.distmin(magr.mx, magr.my, mdef.mx, mdef.my) > 1)
                /* Continue because the monster may have a ranged attack. */
                continue;
            /* Monsters won't attack cockatrices physically if they
             * have a weapon instead.  This instinct doesn't work for
             * players, or under conflict or confusion.
             */
            if (!magr.mconf && !C.Conflict && mwep && mattk.aatyp != C.AT_WEAP
                && C.touch_petrifies(mdef.data)) {
                strike = 0;
                break;
            }
            dieroll = C.rnd(20 + i, 441, 'mattackm');
            strike = (tmp > dieroll);
            /* KMH -- don't accumulate to-hit bonuses */
            if (mwep)
                tmp -= C.hitval(mwep, mdef);
            if (strike) {
                /* for eel AT_TUCH+AD_WRAP attack: can't grab an unsolid
                   target; the unsolid test is redundant since failed_grab
                   checks it too, but is cheap and avoids calling failed_grab
                   for ordinary targets */
                if (C.unsolid(mdef.data) && C.callLocal(failed_grab, magr, mdef, mattk)) {
                    strike = 0;
                    break;
                }
                res[i] = C.callLocal(hitmm, magr, mdef, mattk, mwep, dieroll);
                if ((C.samePtr(mdef.data, C.mons[C.PM_BLACK_PUDDING])
                     || C.samePtr(mdef.data, C.mons[C.PM_BROWN_PUDDING]))
                    && (mwep && (C.objects[mwep.otyp].oc_material == C.IRON
                                 || C.objects[mwep.otyp].oc_material == C.METAL))
                    && mdef.mhp > 1 && !mdef.mcan) {
                    let mclone;

                    if ((mclone = C.clone_mon(mdef, 0, 0)) != 0) {
                        if (C.gv.vis && C.canspotmon(mdef))
                            C.pline("%s divides as %s hits it!",
                                  C.Monnam(mdef), C.mon_nam(magr));
                        C.mintrap(mclone, C.NO_TRAP_FLAGS);
                        if (C.DEADMONSTER(magr))
                            res[i] |= C.M_ATTK_AGR_DIED;
                    }
                }
            } else
                missmm(magr, mdef, mattk);
            break;

        case C.AT_HUGS: /* automatic if prev two attacks succeed */
            strike = (i >= 2 && res[i - 1] == C.M_ATTK_HIT
                      && res[i - 2] == C.M_ATTK_HIT);
            if (strike) {
                /* note: monsters with hug attacks don't wear cloaks or gloves
                   so this doesn't need a special case for hugging a shade
                   while covered by blessed armor (which does damage but does
                   not achieve a successful hold); likewise, rope golems can't
                   wield weapons so ability to choke isn't affected by such */
                if (C.callLocal(failed_grab, magr, mdef, mattk))
                    strike = 0;
                else
                    res[i] = C.callLocal(hitmm, magr, mdef, mattk, 0, 0);
            }
            break;

        case C.AT_GAZE:
            strike = 0;
            res[i] = C.callLocal(gazemm, magr, mdef, mattk);
            break;

        case C.AT_EXPL:
            /* D: Prevent explosions from a distance */
            if (C.distmin(magr.mx, magr.my, mdef.mx, mdef.my) > 1)
                continue;

            res[i] = explmm(magr, mdef, mattk);
            if (res[i] == C.M_ATTK_MISS) { /* cancelled--no attack */
                strike = 0;
                attk = 0;
            } else
                strike = 1; /* automatic hit */
            break;

        case C.AT_ENGL:
            if (C.samePtr(mdef.data, C.mons[C.PM_SHADE])) { /* no silver teeth... */
                if (C.gv.vis)
                    C.pline("%s attempt to engulf %s is futile.",
                          C.s_suffix(C.Monnam(magr)), C.mon_nam(mdef));
                strike = 0;
                break;
            }
            if (C.u.usteed && C.samePtr(mdef, C.u.usteed)) {
                strike = 0;
                break;
            }
            /* D: Prevent engulf from a distance */
            if (C.distmin(magr.mx, magr.my, mdef.mx, mdef.my) > 1)
                continue;
            /* Engulfing attacks are directed at the hero if possible. -dlc */
            if (C.engulfing_u(magr)) {
                strike = 0;
            } else if ((strike = (tmp > C.rnd(20 + i, 528, 'mattackm'))) != 0) {
                if (C.callLocal(failed_grab, magr, mdef, mattk))
                    strike = 0; /* purple worm can't swallow unsolid mons */
                else
                    res[i] = gulpmm(magr, mdef, mattk);
            } else {
                missmm(magr, mdef, mattk);
            }
            break;

        case C.AT_BREA:
        case C.AT_SPIT:
            /*
             * Ranged attacks aren't allowed at point blank range.
             *
             * That impacts pet use of ranged attacks.  It's rather arbitrary
             * but various parts of the code assume it to be the case, not to
             * mention a part of player tactics when fighting dragons.
             */
            if (!C.monnear(magr, mdef.mx, mdef.my)) {
                let mmtmp = ((mattk.aatyp == C.AT_BREA)
                             ? C.breamm(magr, mattk, mdef)
                             : C.spitmm(magr, mattk, mdef));

                strike = (mmtmp == C.M_ATTK_MISS) ? 0 : 1;
                /* We don't really know if we hit or not; pretend we did. */
                if (strike)
                    res[i] |= C.M_ATTK_HIT;
                if (C.DEADMONSTER(mdef))
                    res[i] = C.M_ATTK_DEF_DIED;
                if (C.DEADMONSTER(magr))
                    res[i] |= C.M_ATTK_AGR_DIED;
            } else {
                strike = 0;
                attk = 0;
            }
            break;

        default: /* no attack */
            strike = 0;
            attk = 0;
            break;
        }

        if (attk && !(res[i] & C.M_ATTK_AGR_DIED)
            && C.distmin(magr.mx, magr.my, mdef.mx, mdef.my) <= 1)
            res[i] = C.callLocal(passivemm, magr, mdef, strike,
                               (res[i] & C.M_ATTK_DEF_DIED), mwep);

        if (res[i] & C.M_ATTK_DEF_DIED)
            return res[i];
        if (res[i] & C.M_ATTK_AGR_DIED)
            return res[i];
        /* return if aggressor can no longer attack */
        if ((res[i] & C.M_ATTK_AGR_DONE) || C.helpless(magr))
            return res[i];
        /* eg. defender was knocked into a level teleport trap */
        if (C.mon_offmap(mdef))
            return res[i];
        if (res[i] & C.M_ATTK_HIT)
            struck = 1; /* at least one hit */
    } /* for (;i < NATTK;) loop */

    return (struck ? C.M_ATTK_HIT : C.M_ATTK_MISS);
}

/* can't hold an unsolid target (ghosts, lights, vortices, most elementals)
   or a long worm tail */
export function failed_grab(magr, mdef, mattk)
{
    if ((C.unsolid(mdef.data) || C.gn.notonhead)
        /* hug attack: most holders (owlbear, python, pit fiend, &c);
           wrap damage: eel grabbing, trapper/lurker-above engulfing;
           stick-to damage: mimic, lichen;
           digestion damage: purple worm swallowing */
        && (mattk.aatyp == C.AT_HUGS || mattk.adtyp == C.AD_WRAP
            || mattk.adtyp == C.AD_STCK  || mattk.adtyp == C.AD_DGST)) {
        if ((C.gv.vis && C.canspotmon(mdef)) /* mon-vs-mon */
            || C.samePtr(magr, C.gy.youmonst) || C.samePtr(mdef, C.gy.youmonst)) {
            const magrnam = C.stackAlloc(C.BUFSZ), mdefnam = C.stackAlloc(C.BUFSZ);
            let tailmiss = C.gn.notonhead;
            let verb = (mattk.adtyp == C.AD_DGST) ? "gulp"
                               : (mattk.adtyp == C.AD_STCK) ? "adhere"
                                 : "grab";

            /* beware of "Foo's grab passes through Bar's ghost";
               mon_nam(x_monnam) calls s_suffix() for named ghosts and
               s_suffix() uses a single static buffer; make copies of both
               names to overcome that [note: comment predates 'tailmiss'] */
            C.Strcpy(magrnam, (C.samePtr(magr, C.gy.youmonst)) ? "Your"
                                                   : C.s_suffix(C.Monnam(magr)));
            if (!tailmiss) {
                C.Strcpy(mdefnam, (C.samePtr(mdef, C.gy.youmonst)) ? "you"
                                                       : C.mon_nam(mdef));
            } else {
                /* hero poly'd into long worm can't grow tail
                   so no 'youmonst' handling is needed here */
                C.Sprintf(mdefnam, "%s tail", C.s_suffix(C.some_mon_nam(mdef)));
            }
            /* unsolid grab misses are actually somewhat iffy--how come
               ordinary attacks don't also pass right through? */
            C.pline("%.99s %s attempt %s %.99s!", magrnam, verb,
                  !tailmiss ? "passes right through" : "fails to hold",
                  mdefnam);
        }
        return 1;
    }
    return 0;
}

/* Returns the result of mdamagem(). */
export function hitmm(magr, mdef, mattk, mwep, dieroll)
{
    let compat;
    let weaponhit = (mattk.aatyp == C.AT_WEAP
                         || (mattk.aatyp == C.AT_CLAW && mwep)),
            silverhit = (weaponhit && mwep
                         && C.objects[mwep.otyp].oc_material == C.SILVER);

    pre_mm_attack(magr, mdef);

    compat = !magr.mcan ? C.could_seduce(magr, mdef, mattk) : 0;
    if (!compat && C.shade_miss(magr, mdef, mwep, 0, C.gv.vis))
        return C.M_ATTK_MISS; /* bypass mdamagem() */

    if (C.gv.vis) {
        const buf = C.stackAlloc(C.BUFSZ), magr_name = C.stackAlloc(C.BUFSZ);

        C.Strcpy(magr_name, C.Monnam(magr));
        if (compat) {
            C.Snprintf(buf, C.BUFSZ, "%s %s", magr_name,
                    mdef.mcansee ? "smiles at" : "talks to", 0);
            C.pline("%s %s %s.", buf, C.mon_nam(mdef),
                  (compat == 2) ? "engagingly" : "seductively");
        } else {
            C.storeChar(buf, 0);
            switch (mattk.aatyp) {
            case C.AT_BITE:
                C.Snprintf(buf, C.BUFSZ, "%s bites", magr_name, 1);
                break;
            case C.AT_STNG:
                C.Snprintf(buf, C.BUFSZ, "%s stings", magr_name, 2);
                break;
            case C.AT_BUTT:
                C.Snprintf(buf, C.BUFSZ, "%s butts", magr_name, 3);
                break;
            case C.AT_TUCH:
                C.Snprintf(buf, C.BUFSZ, "%s touches", magr_name, 4);
                break;
            case C.AT_TENT:
                C.Snprintf(buf, C.BUFSZ, "%s tentacles suck",
                         C.s_suffix(magr_name), 5);
                break;
            case C.AT_HUGS:
                if (!C.samePtr(magr, C.u.ustuck)) {
                    C.Snprintf(buf, C.BUFSZ, "%s squeezes", magr_name, 6);
                    break;
                }
                
                /*FALLTHRU*/
            default:
                if (!weaponhit || !mwep || !mwep.oartifact)
                    C.Snprintf(buf, C.BUFSZ, "%s hits", magr_name, 7);
                break;
            }
            if (C.loadChar(buf))
                C.pline("%s %s.", buf, C.mon_nam_too(mdef, magr));

            if (C.mon_hates_silver(mdef) && silverhit) {
                let mdef_name = C.mon_nam_too(mdef, magr);

                /* note: mon_nam_too returns a modifiable buffer; so
                   does s_suffix, but it returns a single static buffer
                   and we might be calling it twice for this message */
                C.Strcpy(magr_name, C.s_suffix(magr_name));
                if (!C.noncorporeal(mdef.data) && !C.amorphous(mdef.data)) {
                    if (!C.samePtr(mdef, magr)) {
                        mdef_name = C.s_suffix(mdef_name);
                    } else {
                        C.strsubst(mdef_name, "himself", "his own");
                        C.strsubst(mdef_name, "herself", "her own");
                        C.strsubst(mdef_name, "itself", "its own");
                    }
                    C.Strcat(mdef_name, " flesh");
                }

                C.pline("%s %s sears %s!", magr_name, /* s_suffix(magr_name), */
                      C.simpleonames(mwep), mdef_name);
            }
        }
    } else
        noises(magr, mattk);

    return C.callLocal(mdamagem, magr, mdef, mattk, mwep, dieroll);
}

/* Returns the same values as mdamagem(). */
export function gazemm(magr, mdef, mattk)
{
    const buf = C.stackAlloc(C.BUFSZ);
    /* an Archon's gaze affects target even if Archon itself is blinded */
    let archon = (C.samePtr(magr.data, C.mons[C.PM_ARCHON])
                      && mattk.adtyp == C.AD_BLND),
            altmesg = (archon && !magr.mcansee);

    /* bring target out of hiding even if hero doesn't see it happen (this
       is already done in pre_mm_attack() and shouldn't be needed here) */
    if (mdef.data.mlet == C.S_MIMIC && C.M_AP_TYPE(mdef) != C.M_AP_NOTHING)
        C.seemimic(mdef);
    mdef.mundetected = 0;

    if (C.gv.vis) {
        C.Sprintf(buf, "%s gazes %s",
                altmesg ? C.Adjmonnam(magr, "blinded") : C.Monnam(magr),
                altmesg ? "toward" : "at");
        C.pline("%s %s...", buf,
              C.canspotmon(mdef) ? C.mon_nam(mdef) : "something");
    }

    if (magr.mcan || !mdef.mcansee
        || (archon ? C.resists_blnd(mdef) : !magr.mcansee)
        || (magr.minvis && !C.perceives(mdef.data)) || mdef.msleeping) {
        if (C.gv.vis && C.canspotmon(mdef))
            C.pline("but nothing happens.");
        return C.M_ATTK_MISS;
    }
    /* call mon_reflects 2x, first test, then, if visible, print message */
    if (C.samePtr(magr.data, C.mons[C.PM_MEDUSA]) && C.mon_reflects(mdef, 0)) {
        if (C.canseemon(mdef))
            C.mon_reflects(mdef, "The gaze is reflected away by %s %s.");
        if (mdef.mcansee) {
            if (C.mon_reflects(magr, 0)) {
                if (C.canseemon(magr))
                    C.mon_reflects(magr,
                                      "The gaze is reflected away by %s %s.");
                return C.M_ATTK_MISS;
            }
            if (mdef.minvis && !C.perceives(magr.data)) {
                if (C.canseemon(magr)) {
                    C.pline(
                      "%s doesn't seem to notice that %s gaze was reflected.",
                          C.Monnam(magr), C.mhis(magr));
                }
                return C.M_ATTK_MISS;
            }
            if (C.canseemon(magr))
                C.pline_mon(magr, "%s is turned to stone!", C.Monnam(magr));
            C.monstone(magr);
            if (!C.DEADMONSTER(magr))
                return C.M_ATTK_MISS;
            return C.M_ATTK_AGR_DIED;
        }
    } else if (archon) {
        C.mhitm_ad_blnd(magr, mattk, mdef, 0);
        /* an Archon's blinding radiance also stuns;
           this is different from the way the hero gets stunned because
           a stunned monster recovers randomly instead of via countdown;
           both cases make an effort to prevent the target from being
           continuously stunned due to repeated gaze attacks */
        if (C.rn2(2, 798, 'gazemm'))
            mdef.mstun = 1;
    }

    return C.callLocal(mdamagem, magr, mdef, mattk, 0, 0);
}

/* return True if magr is allowed to swallow mdef, False otherwise */
export function engulf_target(magr, mdef)
{
    let lev;
    let ax, ay, dx, dy;
    let uatk = (C.samePtr(magr, C.gy.youmonst)),
            udef = (C.samePtr(mdef, C.gy.youmonst));

    /* can't swallow something that's too big */
    if (mdef.data.msize >= C.MZ_HUGE
        || (magr.data.msize < mdef.data.msize && !C.is_whirly(magr.data)))
        return 0;

    /* can't (move to) swallow if trapped. TODO: could do some? */
    if (mdef.mtrapped || magr.mtrapped)
        return 0;

    /* if attacker is phasing in solid rock and defender can't move there,
       or vice versa, don't allow engulf to succeed; otherwise expelling
       might not be able to place attacker and defender both back on map;
       when defender is the hero, a sanity_check complaint about placing
       the hero on top of a monster can occur */
    dx = (C.samePtr(mdef, C.gy.youmonst)) ? C.u.ux : mdef.mx;
    dy = (C.samePtr(mdef, C.gy.youmonst)) ? C.u.uy : mdef.my;
    lev = C.levl[dx][dy];
    if (!(udef ? C.Passes_walls : C.passes_walls(mdef.data))
          && (C.IS_OBSTRUCTED(lev.typ) || C.closed_door(dx, dy) || C.IS_TREE(lev.typ)
              /* not passes_bars(); engulfer isn't squeezing through */
              || (lev.typ == C.IRONBARS && !C.is_whirly(magr.data))))
        return 0;
    ax = (C.samePtr(magr, C.gy.youmonst)) ? C.u.ux : magr.mx;
    ay = (C.samePtr(magr, C.gy.youmonst)) ? C.u.uy : magr.my;
    lev = C.levl[ax][ay];
    if (!(uatk ? C.Passes_walls : C.passes_walls(magr.data))
        && (C.IS_OBSTRUCTED(lev.typ) || C.closed_door(ax, ay) || C.IS_TREE(lev.typ)
            || (lev.typ == C.IRONBARS && !C.is_whirly(mdef.data))))
        return 0;

    return 1;
}

/* Returns the same values as mattackm(). */
export function gulpmm(magr, mdef, mattk)
{
    let ax, ay, dx, dy;
    let status;
    let obj;

    if (!engulf_target(magr, mdef))
        return C.M_ATTK_MISS;

    if (C.gv.vis) {
        C.pline("%s %s %s.", C.Monnam(magr),
              C.digests(magr.data) ? "swallows"
              : C.enfolds(magr.data) ? "encloses"
                : "engulfs",
              C.mon_nam(mdef));
    }
    if (!C.flaming(magr.data)) {
        for (obj = mdef.minvent; obj; obj = obj.nobj)
            C.snuff_lit(obj);
    }

    if (C.is_vampshifter(mdef)
        && C.newcham(mdef, C.mons[mdef.cham], C.NO_NC_FLAGS)) {
        if (C.gv.vis) {
            /* 'it' -- previous form is no longer available and
               using that would be excessively verbose */
            C.pline("%s expels %s.", C.Monnam(magr),
                  C.canspotmon(mdef) ? "it" : C.something);
            if (C.canspotmon(mdef)) {
                C.pline("It turns into %s.",
                      C.x_monnam(mdef, C.ARTICLE_A, 0,
                               (C.SUPPRESS_NAME | C.SUPPRESS_IT
                                | C.SUPPRESS_INVISIBLE), 0));
            }
        }
        return C.M_ATTK_HIT; /* bypass mdamagem() */
    }

    /*
     *  All of this manipulation is needed to keep the display correct.
     *  There is a flush at the next pline().
     */
    ax = magr.mx;
    ay = magr.my;
    dx = mdef.mx;
    dy = mdef.my;
    /*
     *  Leave the defender in the monster chain at its current position,
     *  but don't leave it on the screen.  Move the aggressor to the
     *  defender's position.
     */
    C.remove_monster(dx, dy);
    C.remove_monster(ax, ay);
    C.place_monster(magr, dx, dy);
    C.newsym(ax, ay); /* erase old position */
    C.newsym(dx, dy); /* update new position */

    C.gm.mswallower = magr; /* corpse_chance() wants this */
    status = C.callLocal(mdamagem, magr, mdef, mattk, 0, 0);
    C.gm.mswallower = 0; /* reset */

    if ((status & (C.M_ATTK_AGR_DIED | C.M_ATTK_DEF_DIED))
        == (C.M_ATTK_AGR_DIED | C.M_ATTK_DEF_DIED)) {
        ;                              /* both died -- do nothing  */
    } else if (status & C.M_ATTK_DEF_DIED) { /* defender died */
        /*
         *  Note: mdamagem() -> monkilled() -> mondead() -> m_detach()
         *  -> relmon() used to call remove_monster() for the dead
         *  monster even when it wasn't the one on the map, so we
         *  needed to put magr back after mdef was killed and removed
         *  from their shared spot.  But now [5.0] relmon() calls
         *  mon_leaving_level() and that checks whether the monster at
         *  dying monster's coordinates is that dying monster and only
         *  removes it when they match.  So magr is still at mdef's
         *  former spot these days.
         *
         *  We still potentially do one fixup:  if the gulp targeted
         *  an inhospitable location, magr will return to its previous
         *  spot instead of staying.
         */
        if (!C.goodpos(dx, dy, magr, C.MM_IGNOREWATER)) {
            if (C.samePtr(C.m_at(dx, dy), magr)) {
                C.remove_monster(dx, dy);
                C.newsym(dx, dy);
            }
            dx = ax, dy = ay; /* magr's spot at start of the attack */
        }
        if (!C.samePtr(C.m_at(dx, dy), magr)) {
            C.place_monster(magr, dx, dy);
            C.newsym(dx, dy);
        }
        /* aggressor moves to <dx,dy> and might encounter trouble there */
        if (C.minliquid(magr)
            || (C.t_at(dx, dy)
                && C.mintrap(magr, C.NO_TRAP_FLAGS) == C.Trap_Killed_Mon))
            status |= C.M_ATTK_AGR_DIED;
    } else if (status & C.M_ATTK_AGR_DIED) { /* aggressor died */
        C.place_monster(mdef, dx, dy);
        C.newsym(dx, dy);
    } else {                           /* both alive, put them back */
        if (C.cansee(dx, dy)) {
            C.pline("%s is %s!", C.Monnam(mdef),
                  C.digests(magr.data) ? "regurgitated"
                    : C.enfolds(magr.data) ? "released"
                      : "expelled");
        }

        C.remove_monster(dx,dy);
        C.place_monster(magr, ax, ay);
        C.place_monster(mdef, dx, dy);
        C.newsym(ax, ay);
        C.newsym(dx, dy);
    }

    return status;
}

export function explmm(magr, mdef, mattk)
{
    let result;

    if (magr.mcan)
        return C.M_ATTK_MISS;

    if (C.cansee(magr.mx, magr.my))
        C.pline_mon(magr, "%s explodes!", C.Monnam(magr));
    else
        noises(magr, mattk);

    /* monster explosion types which actually create an explosion */
    if (mattk.adtyp == C.AD_FIRE || mattk.adtyp == C.AD_COLD
        || mattk.adtyp == C.AD_ELEC) {
        C.mon_explodes(magr, mattk);
        /* unconditionally set AGR_DIED here; lifesaving is accounted below */
        result = C.M_ATTK_AGR_DIED | (C.DEADMONSTER(mdef) ? C.M_ATTK_DEF_DIED : 0);
    } else {
        result = C.callLocal(mdamagem, magr, mdef, mattk, 0, 0);
    }

    /* Kill off aggressor if it didn't die. */
    if (!(result & C.M_ATTK_AGR_DIED)) {
        let was_leashed = (magr.mleashed != 0);

        C.mondead(magr);
        if (!C.DEADMONSTER(magr))
            return result; /* life saved */
        result |= C.M_ATTK_AGR_DIED;

        /* mondead() -> m_detach() -> m_unleash() always suppresses
           the m_unleash() slack message, so deliver it here instead */
        if (was_leashed)
            C.Your("leash falls slack.");
    }
    if (magr.mtame) /* give this one even if it was visible */
        C.You(brief_feeling, "melancholy");

    return result;
}

/*
 *  See comment at top of mattackm(), for return values.
 */
export function mdamagem(magr, mdef, mattk, mwep, dieroll)
{
    let pa = magr.data, pd = mdef.data;
    const mhm = C.mhitmLocal();
    mhm.damage = C.d(C.int(mattk.damn), C.int(mattk.damd), 1025, 'mdamagem');
    mhm.hitflags = C.M_ATTK_MISS;
    mhm.permdmg = 0;
    mhm.specialdmg = 0;
    mhm.dieroll = dieroll;
    mhm.done = 0;

    if ((C.touch_petrifies(pd) /* or flesh_petrifies() */
         || (mattk.adtyp == C.AD_DGST && C.samePtr(pd, C.mons[C.PM_MEDUSA])))
        && !C.resists_ston(magr)) {
        let protector = attk_protection(C.int(mattk.aatyp)),
             wornitems = magr.misc_worn_check;

        /* wielded weapon gives same protection as gloves here */
        if (mwep)
            wornitems |= C.W_ARMG;

        if (protector == 0n
            || (protector != ~0n && (wornitems & protector) != protector)) {
            if (C.poly_when_stoned(pa)) {
                C.mon_to_stone(magr);
                return C.M_ATTK_HIT; /* no damage during the polymorph */
            }
            if (C.gv.vis && C.canspotmon(magr))
                C.pline_mon(magr, "%s turns to stone!", C.Monnam(magr));
            C.monstone(magr);
            if (!C.DEADMONSTER(magr))
                return C.M_ATTK_HIT; /* lifesaved */
            else if (magr.mtame && !C.gv.vis)
                C.You(brief_feeling, "peculiarly sad");
            return C.M_ATTK_AGR_DIED;
        }
    }

    C.mhitm_adtyping(magr, mattk, mdef, mhm);

    if (C.mhitm_knockback(magr, mdef, mattk, C.fieldRef(mhm, 'hitflags'),
                        (C.MON_WEP(magr) != 0))
        && ((mhm.hitflags & (C.M_ATTK_DEF_DIED | C.M_ATTK_HIT)) != 0
            || C.mon_offmap(mdef)))
        return mhm.hitflags;

    if (mhm.done)
        return mhm.hitflags;

    if (!mhm.damage)
        return mhm.hitflags;

    mdef.mhp -= mhm.damage;
    if (mdef.mhp < 1) {
        if (C.samePtr(C.m_at(mdef.mx, mdef.my), magr)) { /* see gulpmm() */
            C.remove_monster(mdef.mx, mdef.my);
            mdef.mhp = 1; /* otherwise place_monster will complain */
            C.place_monster(mdef, mdef.mx, mdef.my);
            mdef.mhp = 0;
        }
        if (mattk.aatyp == C.AT_WEAP || mattk.aatyp == C.AT_CLAW)
            C.gm.mkcorpstat_norevive = C.troll_baned(mdef, mwep) ? 1 : 0;
        C.gz.zombify = (!mwep && C.zombie_maker(magr)
                     && (mattk.aatyp == C.AT_TUCH
                         || mattk.aatyp == C.AT_CLAW
                         || mattk.aatyp == C.AT_BITE)
                     && C.zombie_form(mdef.data) != C.NON_PM);
        C.monkilled(mdef, "", C.int(mattk.adtyp));
        C.gz.zombify = 0; /* reset */
        C.gm.mkcorpstat_norevive = 0;
        if (!C.DEADMONSTER(mdef))
            return mhm.hitflags; /* mdef lifesaved */
        else if (mhm.hitflags == C.M_ATTK_AGR_DIED)
            return (C.M_ATTK_DEF_DIED | C.M_ATTK_AGR_DIED);

        if (mattk.adtyp == C.AD_DGST) {
            /* various checks similar to dog_eat and meatobj.
             * after monkilled() to provide better message ordering */
            if (C.ismnum(mdef.cham)) {
                C.newcham(magr, 0, C.NC_SHOW_MSG);
            } else if (C.samePtr(pd, C.mons[C.PM_GREEN_SLIME]) && !C.slimeproof(pa)) {
                C.newcham(magr, C.mons[C.PM_GREEN_SLIME], C.NC_SHOW_MSG);
            } else if (C.samePtr(pd, C.mons[C.PM_WRAITH])) {
                C.grow_up(magr, 0);
                /* don't grow up twice */
                return (C.M_ATTK_DEF_DIED
                        | (!C.DEADMONSTER(magr) ? 0 : C.M_ATTK_AGR_DIED));
            } else if (C.samePtr(pd, C.mons[C.PM_NURSE])) {
                C.healmon(magr, magr.mhpmax, 0);
            }
            C.mon_givit(magr, pd);
        }
        /* caveat: above digestion handling doesn't keep `pa' up to date */

        return (C.M_ATTK_DEF_DIED
                | (C.grow_up(magr, mdef) ? 0 : C.M_ATTK_AGR_DIED));
    }
    return (mhm.hitflags == C.M_ATTK_AGR_DIED) ? C.M_ATTK_AGR_DIED : C.M_ATTK_HIT;
}

export function mon_poly(magr, mdef, dmg)
{
    const freaky = " undergoes a freakish metamorphosis";
    let oldform = mdef.data;

    if (C.samePtr(mdef, C.gy.youmonst)) {
        if (C.Antimagic) {
            C.shieldeff(C.u.ux, C.u.uy);
        } else if (C.Unchanging) {
            ; /* just take a little damage */
        } else {
            /* system shock might take place in polyself() */
            if (C.u.ulycn == C.NON_PM) {
                C.You("are subjected to a freakish metamorphosis.");
                C.polyself(C.POLY_NOFLAGS);
            } else if (C.u.umonnum != C.u.ulycn) {
                C.You_feel("an unnatural urge coming on.");
                C.you_were();
            } else {
                C.You_feel("a natural urge coming on.");
                C.you_unwere(0);
            }
            dmg = 0;
        }
    } else {
        const Before = C.stackAlloc(C.BUFSZ);

        C.Strcpy(Before, C.Monnam(mdef));
        if (C.resists_magm(mdef)) {
            /* Magic resistance */
            if (C.gv.vis)
                C.shieldeff_mon(mdef);
        } else if (C.resist(mdef, C.WAND_CLASS, 0, C.TELL)) {
            /* general resistance to magic... */
            ;
        } else if (!C.rn2(25, 1157, 'mon_poly') && mdef.cham == C.NON_PM
                   && (mdef.mcan
                       || C.pm_to_cham(C.monsndx(mdef.data)) != C.NON_PM)) {
            /* system shock; this variation takes away half of mon's HP
               rather than kill outright */
            if (C.gv.vis)
                C.pline("%s shudders!", Before);

            dmg += Math.trunc((mdef.mhpmax + 1) / 2);
            mdef.mhp -= dmg;
            dmg = 0;
            if (C.DEADMONSTER(mdef)) {
                if (C.samePtr(magr, C.gy.youmonst))
                    C.xkilled(mdef, C.XKILL_GIVEMSG | C.XKILL_NOCORPSE);
                else
                    C.monkilled(mdef, "", C.AD_RBRE);
            }
        } else if (C.newcham(mdef, 0, C.NO_NC_FLAGS)) {
            if (C.gv.vis) { /* either seen or adjacent */
                let was_seen = !!C.strcmpi("It", Before),
                        verbosely = C.flags.verbose || !was_seen;

                if (C.canspotmon(mdef))
                    C.pline("%s%s%s turns into %s.", Before,
                          verbosely ? freaky : "", verbosely ? " and" : "",
                          C.x_monnam(mdef, C.ARTICLE_A, 0,
                                   (C.SUPPRESS_NAME | C.SUPPRESS_IT
                                    | C.SUPPRESS_INVISIBLE), 0));
                else if (was_seen || C.samePtr(magr, C.gy.youmonst))
                    C.pline("%s%s%s.", Before, freaky,
                          !was_seen ? "" : " and disappears");
            }
            dmg = 0;
            if (C.can_teleport(magr.data)) {
                if (C.samePtr(magr, C.gy.youmonst))
                    C.tele();
                else if (!C.tele_restrict(magr))
                    C.rloc(magr, C.RLOC_MSG);
            }
        } else {
            if (C.gv.vis && C.flags.verbose)
                C.pline1(C.nothing_happens);
        }
    }
    /* when a transformation has happened, can't attack again for poly
       effect during next turn or two; not enforced for poly'd hero */
    if (!C.samePtr(mdef.data, oldform) && !C.samePtr(magr, C.gy.youmonst))
        magr.mspec_used += C.rnd(2, 1204, 'mon_poly');

    return dmg;
}

export function paralyze_monst(mon, amt)
{
    if (amt > 127)
        amt = 127;

    mon.mcanmove = 0;
    mon.mfrozen = amt;
    mon.meating = 0; /* terminate any meal-in-progress */
    mon.mstrategy &= ~C.STRAT_WAITFORU;
}

/* `mon' is hit by a sleep attack; return 1 if it's affected, 0 otherwise */
export function sleep_monst(mon, amt, how)
{
    /* reveal mimic unless already asleep or paralyzed (won't be 'busy') */
    if (how >= 0 && !mon.msleeping && !mon.mfrozen
        && mon.data.mlet == C.S_MIMIC && (C.M_AP_TYPE(mon) == C.M_AP_FURNITURE
                                          || C.M_AP_TYPE(mon) == C.M_AP_OBJECT))
        C.seemimic(mon);

    if (C.resists_sleep(mon) || C.defended(mon, C.AD_SLEE)
        || (how >= 0 && C.resist(mon, C.char(how), 0, C.NOTELL))) {
        C.shieldeff(mon.mx, mon.my);
    } else if (mon.mcanmove) {
        C.finish_meating(mon); /* terminate any meal-in-progress */
        amt += C.int(mon.mfrozen);
        if (amt > 0) { /* sleep for N turns */
            mon.mcanmove = 0;
            mon.mfrozen = C.min(amt, 127);
        } else { /* sleep until awakened */
            mon.msleeping = 1;
        }
        return 1;
    }
    return 0;
}

/* sleeping grabber releases, engulfer doesn't; don't use for paralysis! */
export function slept_monst(mon)
{
    if (C.helpless(mon) && C.samePtr(mon, C.u.ustuck)
        && !C.sticks(C.gy.youmonst.data) && !C.u.uswallow) {
        C.pline_mon(mon, "%s grip relaxes.", C.s_suffix(C.Monnam(mon)));
        C.unstuck(mon);
    }
}

export function rustm(mdef, obj)
{
    let dmgtyp = C.ERODE_NONE, chance = 1;

    if (!mdef || !obj)
        return; /* just in case */
    /* AD_ACID and AD_ENCH are handled in passivemm() and passiveum() */
    if (C.dmgtype(mdef.data, C.AD_CORR)) {
        dmgtyp = C.ERODE_CORRODE;
    } else if (C.dmgtype(mdef.data, C.AD_RUST)) {
        dmgtyp = C.ERODE_RUST;
    } else if (C.dmgtype(mdef.data, C.AD_FIRE)
               /* steam vortex: fire resist applies, fire damage doesn't */
               && !C.samePtr(mdef.data, C.mons[C.PM_STEAM_VORTEX])) {
        dmgtyp = C.ERODE_BURN;
        chance = 6;
    }

    if (dmgtyp != C.ERODE_NONE && !C.rn2(chance, 1278, 'rustm'))
        C.erode_obj(obj, 0, dmgtyp, C.EF_GREASE | C.EF_VERBOSE);
}

export function mswingsm(magr, mdef, otemp) /* attacker */ /* defender */  /* attacker's weapon */
{
    if (C.flags.verbose && !C.Blind && C.mon_visible(magr)) {
        let bash = (C.is_pole(otemp) && !C.is_art(otemp, C.ART_SNICKERSNEE)
                        && (C.dist2(magr.mx, magr.my, mdef.mx, mdef.my)
                            <= 2));

        C.pline("%s %s %s%s %s at %s.", C.Monnam(magr), C.mswings_verb(otemp, bash),
              (otemp.quan > 1n) ? "one of " : "", C.mhis(magr), C.xname(otemp),
              C.mon_nam(mdef));
    }
}

/*
 * Passive responses by defenders.  Does not replicate responses already
 * handled above.  Returns same values as mattackm.
 */
export function passivemm(magr, mdef, mhitb, mdead, mwep)
{
    let mddat = mdef.data;
    let madat = magr.data;
    const buf = C.stackAlloc(C.BUFSZ);
    let i, tmp;
    let mhit = mhitb ? C.M_ATTK_HIT : C.M_ATTK_MISS;

    for (i = 0;; i++) {
        if (i >= C.NATTK)
            return (mdead | mhit); /* no passive attacks */
        if (mddat.mattk[i].aatyp == C.AT_NONE)
            break;
    }
    if (mddat.mattk[i].damn)
        tmp = C.d(C.int(mddat.mattk[i].damn), C.int(mddat.mattk[i].damd), 1324, 'passivemm');
    else if (mddat.mattk[i].damd)
        tmp = C.d(C.int(mddat.mlevel) + 1, C.int(mddat.mattk[i].damd), 1326, 'passivemm');
    else
        tmp = 0;

    // C assess_dmg destination is the closing edge of this block.
    assess_dmg: {
    /* These affect the enemy even if defender killed */
    switch (mddat.mattk[i].adtyp) {
    case C.AD_ACID:
        if (mhitb && !C.rn2(2, 1333, 'passivemm')) {
            C.Strcpy(buf, C.Monnam(magr));
            if (C.canseemon(magr))
                C.pline("%s is splashed by %s %s!", buf,
                      C.s_suffix(C.mon_nam(mdef)), C.hliquid("acid"));
            if (C.resists_acid(magr)) {
                if (C.canseemon(magr))
                    C.pline("%s is not affected.", C.Monnam(magr));
                tmp = 0;
            }
        } else
            tmp = 0;
        if (!C.rn2(30, 1345, 'passivemm'))
            C.erode_armor(magr, C.ERODE_CORRODE);
        if (!C.rn2(6, 1347, 'passivemm'))
            C.acid_damage(C.MON_WEP(magr));
        break assess_dmg;
    case C.AD_ENCH: /* KMH -- remove enchantment (disenchanter) */
        if (mhitb && !mdef.mcan && mwep) {
            C.drain_item(mwep, 0);
            /* No message */
        }
        break;
    default:
        break;
    }
    if (mdead || mdef.mcan)
        return (mdead | mhit);

    /* These affect the enemy only if defender is still alive */
    if (C.rn2(3, 1363, 'passivemm'))
        switch (mddat.mattk[i].adtyp) {
        case C.AD_PLYS: /* Floating eye */
            if (tmp > 127)
                tmp = 127;
            if (C.samePtr(mddat, C.mons[C.PM_FLOATING_EYE])) {
                if (!C.rn2(4, 1369, 'passivemm'))
                    tmp = 127;
                if (magr.mcansee && C.haseyes(madat) && mdef.mcansee
                    && (C.perceives(madat) || !mdef.minvis)) {
                    /* construct format string; guard against '%' in Monnam */
                    C.Strcpy(buf, C.s_suffix(C.Monnam(mdef)));
                    C.strNsubst(buf, "%", "%%", 0);
                    C.Strcat(buf, " gaze is reflected by %s %s.");
                    if (C.mon_reflects(magr,
                                     C.canseemon(magr) ? buf : 0))
                        return (mdead | mhit);
                    C.Strcpy(buf, C.Monnam(magr));
                    if (C.canseemon(magr))
                        C.pline("%s is frozen by %s gaze!", buf,
                              C.s_suffix(C.mon_nam(mdef)));
                    paralyze_monst(magr, tmp);
                    return (mdead | mhit);
                }
            } else { /* gelatinous cube */
                C.Strcpy(buf, C.Monnam(magr));
                if (C.canseemon(magr))
                    C.pline("%s is frozen by %s.", buf, C.mon_nam(mdef));
                paralyze_monst(magr, tmp);
                return (mdead | mhit);
            }
            return 1;
        case C.AD_COLD:
            if (C.resists_cold(magr)) {
                if (C.canseemon(magr)) {
                    C.pline_mon(magr, "%s is mildly chilly.", C.Monnam(magr));
                    C.golemeffects(magr, C.AD_COLD, tmp);
                }
                tmp = 0;
                break;
            }
            if (C.canseemon(magr))
                C.pline_mon(magr, "%s is suddenly very cold!", C.Monnam(magr));
            C.healmon(mdef, Math.trunc(tmp / 2), Math.trunc(tmp / 2));
            if (mdef.mhpmax > (C.int(mdef.m_lev + 1) * 8))
                C.split_mon(mdef, magr);
            break;
        case C.AD_STUN:
            if (!magr.mstun) {
                magr.mstun = 1;
                if (C.canseemon(magr))
                    C.pline_mon(magr, "%s %s...", C.Monnam(magr),
                          C.makeplural(C.stagger(magr.data, "stagger")));
            }
            tmp = 0;
            break;
        case C.AD_FIRE:
            if (C.resists_fire(magr)) {
                if (C.canseemon(magr)) {
                    C.pline_mon(magr, "%s is mildly warmed.", C.Monnam(magr));
                    C.golemeffects(magr, C.AD_FIRE, tmp);
                }
                tmp = 0;
                break;
            }
            if (C.canseemon(magr))
                C.pline_mon(magr, "%s is suddenly very hot!", C.Monnam(magr));
            break;
        case C.AD_ELEC:
            if (C.resists_elec(magr)) {
                if (C.canseemon(magr)) {
                    C.pline_mon(magr, "%s is mildly tingled.", C.Monnam(magr));
                    C.golemeffects(magr, C.AD_ELEC, tmp);
                }
                tmp = 0;
                break;
            }
            if (C.canseemon(magr))
                C.pline_mon(magr, "%s is jolted with electricity!",
                          C.Monnam(magr));
            break;
        default:
            tmp = 0;
            break;
        }
    else
        tmp = 0;

    } // assess_dmg

    if ((magr.mhp -= tmp) <= 0) {
        C.monkilled(magr, "", C.int(mddat.mattk[i].adtyp));
        return (mdead | mhit | C.M_ATTK_AGR_DIED);
    }
    return (mdead | mhit);
}

/* hero or monster has successfully hit target mon with drain energy attack */
export function xdrainenergym(mon, givemsg)
{
    if (mon.mspec_used < 20 /* limit draining */
        && (C.attacktype(mon.data, C.AT_MAGC)
            || C.attacktype(mon.data, C.AT_BREA))) {
        mon.mspec_used += C.d(2, 2, 1466, 'xdrainenergym');
        if (givemsg)
            C.pline_mon(mon, "%s seems lethargic.", C.Monnam(mon));
    }
}

/* "aggressive defense"; what type of armor prevents specified attack
   from touching its target? */
export function attk_protection(aatyp)
{
    let w_mask = 0n;

    switch (aatyp) {
    case C.AT_NONE:
    case C.AT_SPIT:
    case C.AT_EXPL:
    case C.AT_BOOM:
    case C.AT_GAZE:
    case C.AT_BREA:
    case C.AT_MAGC:
        w_mask = ~0n; /* special case; no defense needed */
        break;
    case C.AT_CLAW:
    case C.AT_TUCH:
    case C.AT_WEAP:
        w_mask = C.W_ARMG; /* caller needs to check for weapon */
        break;
    case C.AT_KICK:
        w_mask = C.W_ARMF;
        break;
    case C.AT_BUTT:
        w_mask = C.W_ARMH;
        break;
    case C.AT_HUGS:
        w_mask = (C.W_ARMC | C.W_ARMG); /* attacker needs both to be protected */
        break;
    case C.AT_BITE:
    case C.AT_STNG:
    case C.AT_ENGL:
    case C.AT_TENT:
    default:
        w_mask = 0n; /* no defense available */
        break;
    }
    return w_mask;
}

/*mhitm.c*/
