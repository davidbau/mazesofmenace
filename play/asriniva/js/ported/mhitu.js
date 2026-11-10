import { C } from './c-runtime.js';
/* NetHack 5.0	mhitu.c	$NHDT-Date: 1775259433 2026/04/03 15:37:13 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.341 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Robert Patrick Rankin, 2012. */
/* NetHack may be freely redistributed.  See license for details. */






/* monster hits hero (most callers have been moved to uthim.c) */
export function hitmsg(mtmp, mattk)
{
    let compat;
    let verb = 0, again, punct = "!";
    let Monst_name = C.Monnam(mtmp);

    /* Note: if opposite gender, "seductively";
       if same gender, "engagingly" for nymph, normal msg for others. */
    if ((compat = C.callLocal(could_seduce, mtmp, C.gy.youmonst, mattk)) != 0
        && !mtmp.mcan && !mtmp.mspec_used) {
        C.pline_mon(mtmp, "%s %s you %s.", Monst_name,
              !C.Blind ? "smiles at" : !C.Deaf ? "talks to" : "touches",
              (compat == 2) ? "engagingly" : "seductively");
    } else {
        switch (mattk.aatyp) {
        case C.AT_BITE:
            verb = "bites";
            break;
        case C.AT_KICK:
            if (C.thick_skinned(C.gy.youmonst.data))
                punct = ".";
            verb = "kicks";
            break;
        case C.AT_STNG:
            verb = "stings";
            break;
        case C.AT_BUTT:
            verb = "butts";
            break;
        case C.AT_TUCH:
            verb = "touches you";
            break;
        case C.AT_TENT:
            verb = "tentacles suck your brain";
            Monst_name = C.s_suffix(Monst_name);
            break;
        case C.AT_EXPL:
        case C.AT_BOOM:
            verb = "explodes";
            break;
        default:
            verb = "hits";
        }
        /* if a monster hits more than once with similar attack, say so */
        again = (mtmp.m_id == C.gh.hitmsg_mid
                 && C.gh.hitmsg_prev != 0
                 && C.address(mattk) == C.address(C.gh.hitmsg_prev) + C.attackSize
                 && mattk.aatyp == C.gh.hitmsg_prev.aatyp) ? " again" : "";
        C.pline_mon(mtmp, "%s %s%s%s", Monst_name, verb, again, punct);
    }
    C.gh.hitmsg_mid = mtmp.m_id;
    C.gh.hitmsg_prev = mattk;
}

/* monster missed you */
export function missmu(mtmp, nearmiss, mattk)
{
    nearmiss = C.boolean(nearmiss);
    C.gh.hitmsg_mid = 0;
    C.gh.hitmsg_prev = 0;

    if (!C.canspotmon(mtmp))
        C.map_invisible(mtmp.mx, mtmp.my);

    if (C.callLocal(could_seduce, mtmp, C.gy.youmonst, mattk) && !mtmp.mcan)
        C.pline_mon(mtmp, "%s pretends to be friendly.", C.Monnam(mtmp));
    else
        C.pline_mon(mtmp, "%s %smisses!", C.Monnam(mtmp),
                  (nearmiss && C.flags.verbose) ? "just " : "");

    C.stop_occupation();
}

/* strike types P|S|B: Pierce (pointed: stab) => "thrusts",
   Slash (edged: slice) or whack (blunt: Bash) => "swings" */
export function mswings_verb(mwep, bash) /* attacker's weapon */     /* True: using polearm while too close */
{
    bash = C.boolean(bash);
    let verb;
    let otyp = mwep.otyp,
        /* (monsters don't actually wield towels, wet or otherwise) */
        lash = (Number(Boolean(C.objects[otyp].oc_skill == C.P_WHIP || C.is_wet_towel(mwep)))),
        /* some weapons can have more than one strike type; for those,
           give a mix of thrust and swing (caller doesn't care either way) */
        thrust = (Number(Boolean((C.objects[otyp].oc_dir & C.PIERCE) != 0
                  && ((C.objects[otyp].oc_dir & ~C.PIERCE) == 0 || !C.rn2(() => (2), 0)))));

    verb = bash ? "bashes with" /*sigh*/
           : lash ? "lashes"
             : thrust ? "thrusts"
               : "swings";
    /* (might have caller also pass attacker's formatted name so that
       if hallucination makes that be plural, we could use vtense() to
       adjust the result to match) */
    return verb;
}

/* monster swings obj */
export function mswings(mtmp, otemp, bash) /* attacker */ /* attacker's weapon */       /* True: polearm used at too close range */
{
    bash = C.boolean(bash);
    if (C.flags.verbose && !C.Blind && C.mon_visible(mtmp)) {
        C.pline_mon(mtmp, "%s %s %s%s %s.", C.Monnam(mtmp),
                  C.callLocal(mswings_verb, otemp, bash),
                  (otemp.quan > 1n) ? "one of " : "",
                  C.mhis(mtmp), C.xname(otemp));
    }
}

/* return how a poison attack was delivered */
export function mpoisons_subj(mtmp, mattk)
{
    if (mattk.aatyp == C.AT_WEAP) {
        let mwep = (mtmp == C.gy.youmonst) ? C.uwep : C.MON_WEP(mtmp);
        /* "Foo's attack was poisoned." is pretty lame, but at least
           it's better than "sting" when not a stinging attack... */
        return (!mwep || !mwep.opoisoned) ? "attack" : "weapon";
    } else {
        return (mattk.aatyp == C.AT_TUCH) ? "contact"
                  : (mattk.aatyp == C.AT_GAZE) ? "gaze"
                       : (mattk.aatyp == C.AT_BITE) ? "bite" : "sting";
    }
}

/* called when your intrinsic speed is taken away */
export function u_slow_down()
{
    C.HFast = 0n;
    if (!C.Fast)
        C.You("slow down.");
    else /* speed boots */
        C.Your("quickness feels less natural.");
    C.exercise(C.A_DEX, 0);
}

/* monster attacked wrong location due to monster blindness, hero
   invisibility, hero displacement, or hero being underwater */
export function wildmiss(mtmp, mattk)
{
    let compat;
    let Monst_name; /* Monnam(), deferred until after early returns */
    /* expected reasons for wildmiss() */
    let unotseen = (Number(Boolean(!mtmp.mcansee || (C.Invis && !C.perceives(mtmp.data))))),
            unotthere = (C.Displaced != 0), usubmerged = (C.Underwater != 0);

    /* the reasons for wildmiss end up getting checked twice so that the
       impossible can be given, if warranted, before the early returns */
    if (!unotseen && !unotthere && !usubmerged) {
        /* this used to be the 'else' case below */
        C.impossible("%s attacks you without knowing your location?",
                   C.Some_Monnam(mtmp));
        return;
    }

    /* no map_invisible() -- no way to tell where _this_ is coming from */

    if (!C.flags.verbose)
        return;
    /* no feedback if hero doesn't see the monster's spot */
    if (!C.cansee(mtmp.mx, mtmp.my))
        return;
    /* maybe it's attacking an image around the corner? */

    compat = ((mattk.adtyp == C.AD_SEDU || mattk.adtyp == C.AD_SSEX)
              ? C.callLocal(could_seduce, mtmp, C.gy.youmonst, mattk) : 0);
    Monst_name = C.Monnam(mtmp);

    C.set_msg_xy(mtmp.mx, mtmp.my);
    if (unotseen) { /* !mtmp->cansee || (Invis && !perceives(mtmp->data)) */
        let swings = (mattk.aatyp == C.AT_BITE) ? "snaps"
                             : (mattk.aatyp == C.AT_KICK) ? "kicks"
                               : (mattk.aatyp == C.AT_STNG
                                  || mattk.aatyp == C.AT_BUTT
                                  || C.nolimbs(mtmp.data)) ? "lunges"
                                 : "swings";

        if (compat) {
            C.pline("%s tries to touch you and misses!", Monst_name);
        } else {
            switch (C.rn2(() => (3), 1)) {
            case 0:
                C.pline("%s %s wildly and misses!", Monst_name, swings);
                break;
            case 1:
                C.pline("%s attacks a spot beside you.", Monst_name);
                break;
            case 2:
                C.pline("%s strikes at %s!", Monst_name,
                      C.is_waterwall(mtmp.mux,mtmp.muy)
                        ? "empty water"
                        : "thin air");
                break;
            default:
                C.pline("%s %s wildly!", Monst_name, swings);
                break;
            }
        }
    } else if (unotthere) { /* Displaced */
        /* give 'displaced' message even if hero is Blind */
        if (compat)
            C.pline("%s smiles %s at your %sdisplaced image...", Monst_name,
                  (compat == 2) ? "engagingly" : "seductively",
                  C.Invis ? "invisible " : "");
        else
            C.pline("%s strikes at your %sdisplaced image and misses you!",
                  /* Note:  if you're both invisible and displaced, only
                   * monsters which see invisible will attack your displaced
                   * image, since the displaced image is also invisible. */
                  Monst_name, C.Invis ? "invisible " : "");

    } else if (usubmerged) { /* Underwater */
        /* monsters may miss especially on water level where
           bubbles shake the player here and there */
        if (compat)
            C.pline("%s reaches towards your distorted image.", Monst_name);
        else
            C.pline("%s is fooled by water reflections and misses!",
                  Monst_name);

    } else {
        ; /*NOTREACHED*/
    }
}

export function expels(mtmp, mdat, message) /* if mtmp is polymorphed, mdat != mtmp->data */
{
    message = C.boolean(message);
    C.disp.botl = 1;
    if (message) {
        if (C.digests(mdat)) {
            C.You("get regurgitated!");
        } else if (C.enfolds(mdat)) {
            C.pline_mon(mtmp, "%s unfolds and you are released!", C.Monnam(mtmp));
        } else {
            const blast = C.stackAlloc(40);
            let attk = C.attacktype_fordmg(mdat, C.AT_ENGL, C.AD_ANY);

            C.storeChar(blast + (0), 0);
            if (!attk) {
                C.impossible("Swallower has no engulfing attack?");
            } else {
                if (C.is_whirly(mdat)) {
                    switch (attk.adtyp) {
                    case C.AD_ELEC:
                        C.Strcpy(blast, " in a shower of sparks");
                        break;
                    case C.AD_COLD:
                        C.Strcpy(blast, " in a blast of frost");
                        break;
                    }
                } else {
                    C.Strcpy(blast, " with a squelch");
                }
                C.You("get expelled from %s%s!", C.mon_nam(mtmp), blast);
            }
        }
    }
    C.unstuck(mtmp); /* ball&chain returned in unstuck() */
    C.mnexto(mtmp, C.RLOC_NOMSG);
    C.newsym(C.u.ux, C.u.uy);
    /* to cover for a case where mtmp is not in a next square */
    if (C.um_dist(mtmp.mx, mtmp.my, 1))
        C.pline("Brrooaa...  You land hard at some distance.");
    C.spoteffects(1);
}

/* select a monster's next attack, possibly substituting for its usual one */
export function getmattk(magr, mdef, indx, prev_result, alt_attk_buf)
{
    indx = C.int(indx);
    let mptr = magr.data;
    let attk = mptr.mattk[indx];
    let weap = (magr == C.gy.youmonst) ? C.uwep : C.MON_WEP(magr);
    let udefend = mdef == C.gy.youmonst;

    /* honor SEDUCE=0 */
    if (!C.SYSOPT_SEDUCE) {


        /* if the first attack is for SSEX damage, all six attacks will be
           substituted (expected succubus/incubus handling); if it isn't
           but another one is, only that other one will be substituted */
        if (mptr.mattk[0].adtyp == C.AD_SSEX) {
            C.copyRecord(alt_attk_buf, C.c_sa_no[indx]);
            attk = alt_attk_buf;
        } else if (attk.adtyp == C.AD_SSEX) {
            C.copyRecord(alt_attk_buf, attk);
            attk = alt_attk_buf;
            attk.adtyp = C.AD_DRLI;
        }
    }

    /* prevent a monster with two consecutive disease or hunger attacks
       from hitting with both of them on the same turn; if the first has
       already hit, switch to a stun attack for the second */
    if (indx > 0 && prev_result[indx - 1] > C.M_ATTK_MISS
        && (attk.adtyp == C.AD_DISE || attk.adtyp == C.AD_PEST
            || attk.adtyp == C.AD_FAMN)
        && attk.adtyp == mptr.mattk[indx - 1].adtyp) {
        C.copyRecord(alt_attk_buf, attk);
        attk = alt_attk_buf;
        attk.adtyp = C.AD_STUN;

    /* make drain-energy damage be somewhat in proportion to energy */
    } else if (attk.adtyp == C.AD_DREN && udefend) {
        let ulev = C.max(C.u.ulevel, 6);

        C.copyRecord(alt_attk_buf, attk);
        attk = alt_attk_buf;
        /* 3.6.0 used 4d6 but since energy drain came out of max energy
           once current energy was gone, that tended to have a severe
           effect on low energy characters; it's now 2d6 with adjustments */
        if (C.u.uen <= 5 * ulev && attk.damn > 1) {
            attk.damn -= 1; /* low energy: 2d6 -> 1d6 */
            if (C.u.uenmax <= 2 * ulev && attk.damd > 3)
                attk.damd -= 3; /* very low energy: 1d6 -> 1d3 */
        } else if (C.u.uen > 12 * ulev) {
            attk.damn += 1; /* high energy: 2d6 -> 3d6 */
            if (C.u.uenmax > 20 * ulev)
                attk.damd += 3; /* very high energy: 3d6 -> 3d9 */
            /* note: 3d9 is slightly higher than previous 4d6 */
        }

    /* holders/engulfers who release the hero have mspec_used set to rnd(2)
       and can't re-hold/re-engulf until it has been decremented to zero;
       likewise for transformation by genetic engineer */
    } else if (magr.mspec_used && (attk.aatyp == C.AT_ENGL
                                    || attk.aatyp == C.AT_HUGS
                                    || attk.adtyp == C.AD_STCK
                                    || attk.adtyp == C.AD_POLY)) {
        let wimpy = (attk.damd == 0); /* lichen, violet fungus */

        /* can't re-engulf or re-grab yet; switch to simpler attack */
        C.copyRecord(alt_attk_buf, attk);
        attk = alt_attk_buf;
        if (attk.adtyp == C.AD_ACID || attk.adtyp == C.AD_ELEC
            || attk.adtyp == C.AD_COLD || attk.adtyp == C.AD_FIRE) {
            attk.aatyp = C.AT_TUCH;
        } else {
            attk.aatyp = C.AT_CLAW; /* attack message will be "<foo> hits" */
            attk.adtyp = C.AD_PHYS;
        }
        attk.damn = 1; /* relatively weak: 1d6 */
        attk.damd = 6;
        if (wimpy && attk.aatyp == C.AT_CLAW) {
            attk.aatyp = C.AT_TUCH;
            attk.damn = attk.damd = 0;
        }

    /* barrow wight, Nazgul, erinys have weapon attack for non-physical
       damage; force physical damage if attacker has been cancelled or
       if weapon is sufficiently interesting; a few unique creatures
       have two weapon attacks where one does physical damage and other
       doesn't--avoid forcing physical damage for those */
    } else if (indx == 0 && magr != C.gy.youmonst
               && attk.aatyp == C.AT_WEAP && attk.adtyp != C.AD_PHYS
               && !(mptr.mattk[1].aatyp == C.AT_WEAP
                    && mptr.mattk[1].adtyp == C.AD_PHYS)
               && (magr.mcan
                   || (weap && ((weap.otyp == C.CORPSE
                                 && C.touch_petrifies(C.mons[weap.corpsenm]))
                                || C.is_art(weap, C.ART_STORMBRINGER)
                                || C.is_art(weap, C.ART_VORPAL_BLADE))))) {
        C.copyRecord(alt_attk_buf, attk);
        attk = alt_attk_buf;
        attk.adtyp = C.AD_PHYS;

    /* liches have a touch attack for cold damage and also a spell attack;
       they won't use the spell for monster vs monster so become impotent
       against cold resistant foes; change the touch damage from cold to
       physical if target will resist */
    } else if (indx == 0 && attk.aatyp == C.AT_TUCH && attk.adtyp == C.AD_COLD
               && (udefend ? C.Cold_resistance : C.resists_cold(mdef))
               /* don't substitute if target is immune to normal damage */
               && mdef.data != C.mons[C.PM_SHADE]) {
        C.copyRecord(alt_attk_buf, attk);
        attk = alt_attk_buf;
        attk.adtyp = C.AD_PHYS;
        /* lessen new physical damage compared to old cold damage:
         *        before  after
         * lich:    1d10  1d6
         * demi:    3d4   2d4
         * master:  3d6   2d6
         * arch-:   5d6   3d6
         */
        attk.damn = Math.trunc((attk.damn + 1) / 2);
        if (attk.damd == 10)
            attk.damd = 6;

    }

    /* elementals on their home plane do double damage */
    if (attk != alt_attk_buf && C.is_home_elemental(mptr)) {
        C.copyRecord(alt_attk_buf, attk);
        attk = alt_attk_buf;
        attk.damn *= 2;
    }

    return attk;
}

/* calc some variables needed for mattacku() */
export function calc_mattacku_vars(mtmp, ranged, range2, foundyou, youseeit)
{
    C.setReference(ranged, (C.mdistu(mtmp) > 3));
    C.setReference(range2, !C.monnear(mtmp, mtmp.mux, mtmp.muy));
    C.setReference(foundyou, C.u_at(mtmp.mux, mtmp.muy));
    C.setReference(youseeit, C.canseemon(mtmp));

    /* do_attack() uses bhitpos to set/clear notonhead; do likewise here */
    C.gb.bhitpos.x = C.u.ux, C.gb.bhitpos.y = C.u.uy;
    /* hero poly'd into a long worm isn't allowed to grow a tail, so
       hitting tail instead of head can't happen */
    C.gn.notonhead = 0;
}

/* return TRUE iff monster or hero is trapped in a (spiked) pit */
export function mtrapped_in_pit(mtmp)
{
    let ttmp = 0;

    if (mtmp == C.gy.youmonst)
        ttmp = (C.u.utrap && C.u.utraptype == C.TT_PIT) ? C.t_at(C.u.ux, C.u.uy) : 0;
    else
        ttmp = mtmp.mtrapped ? C.t_at(mtmp.mx, mtmp.my) : 0;

    if (ttmp && C.is_pit(ttmp.ttyp))
        return 1;
    return 0;
}

/*
 * mattacku: monster attacks you
 *      returns 1 if monster dies (e.g. "yellow light"), 0 otherwise
 *      Note: if you're displaced or invisible the monster might attack the
 *              wrong position...
 *      Assumption: it's attacking you or an empty square; if there's another
 *              monster which it attacks by mistake, the caller had better
 *              take care of it...
 */
export function mattacku(mtmp)
{
    let mattk; const alt_attk = C.localRecord("attack");
    let i, j = 0, tmp; const sum = C.localArray("i32", C.NATTK);
    let mdat = mtmp.data;
    /*
     * ranged: Is it near you?  Affects your actions.
     * range2: Does it think it's near you?  Affects its actions.
     * foundyou: Is it attacking you or your image?
     * youseeit: Can you observe the attack?  It might be attacking your
     *     image around the corner, or invisible, or you might be blind.
     * skipnonmagc: Are further physical attack attempts useless?  (After
     *     a wild miss--usually due to attacking displaced image.  Avoids
     *     excessively verbose miss feedback when monster can do multiple
     *     attacks and would miss the same wrong spot each time.)
     */
    let ranged, range2, foundyou, firstfoundyou, youseeit,
            skipnonmagc = 0;

    C.callLocal(calc_mattacku_vars, mtmp, C.booleanReference(() => ranged, value => { ranged = value; }), C.booleanReference(() => range2, value => { range2 = value; }), C.booleanReference(() => foundyou, value => { foundyou = value; }), C.booleanReference(() => youseeit, value => { youseeit = value; }));

    if (!ranged)
        C.nomul(0);
    if (C.DEADMONSTER(mtmp))
        return 1;
    if (C.Underwater && !C.is_swimmer(mtmp.data))
        return 0;

    /* If swallowed, can only be affected by u.ustuck */
    if (C.u.uswallow) {
        if (mtmp != C.u.ustuck)
            return 0;
        C.u.ustuck.mux = C.u.ux;
        C.u.ustuck.muy = C.u.uy;
        if (C.u.uinvulnerable)
            return 0; /* stomachs can't hurt you! */
        range2 = 0;
        foundyou = 1;
    } else if (C.u.usteed) {
        if (mtmp == C.u.usteed)
            /* Your steed won't attack you */
            return 0;
        /* Orcs like to steal and eat horses and the like */
        if (!C.rn2(() => (C.is_orc(mtmp.data) ? 2 : 4), 2) && C.m_next2u(mtmp)) {
            /* attack your steed instead; 'bhitpos' and 'notonhead' are
               already set from targeting hero */
            i = C.mattackm(mtmp, C.u.usteed);
            if ((i & C.M_ATTK_AGR_DIED) != 0)
                return 1;
            /* make sure steed is still alive and within range */
            if ((i & C.M_ATTK_DEF_DIED) != 0 || !C.u.usteed
                || !C.m_next2u(mtmp))
                return 0;
            /* Let your steed retaliate */
            C.gb.bhitpos.x = mtmp.mx, C.gb.bhitpos.y = mtmp.my;
            C.gn.notonhead = 0;
            return !!(C.mattackm(C.u.usteed, mtmp) & C.M_ATTK_DEF_DIED);
        }
    }

    if (C.u.uundetected && !range2 && foundyou && !C.u.uswallow) {
        if (!C.canspotmon(mtmp))
            C.map_invisible(mtmp.mx, mtmp.my);
        C.u.uundetected = 0;
        if (C.is_hider(C.gy.youmonst.data) && C.u.umonnum != C.PM_TRAPPER) {
            /* ceiling hider */
            const cc = C.localRecord("nhcoord"); /* maybe we need a unexto() function? */
            let obj;

            C.You("fall from the %s!", C.ceiling(C.u.ux, C.u.uy));
            /* take monster off map now so that its location
               is eligible for placing hero; we assume that a
               removed monster remembers its old spot <mx,my> */
            C.remove_monster(mtmp.mx, mtmp.my);
            if (!C.enexto(cc, C.u.ux, C.u.uy, C.gy.youmonst.data)
                /* a fish won't voluntarily swap positions
                   when it's in water and hero is over land */
                || (mtmp.data.mlet == C.S_EEL
                    && C.is_pool(mtmp.mx, mtmp.my)
                    && !C.is_pool(C.u.ux, C.u.uy))) {
                /* couldn't find any spot for hero; this used to
                   kill off attacker, but now we just give a "miss"
                   message and keep both mtmp and hero at their
                   original positions; hero has become unconcealed
                   so mtmp's next move will be a regular attack */
                C.place_monster(mtmp, mtmp.mx, mtmp.my); /* put back */
                C.newsym(C.u.ux, C.u.uy); /* u.uundetected was toggled */
                C.pline_mon(mtmp, "%s draws back as you drop!", C.Monnam(mtmp));
                return 0;
            }

            /* put mtmp at hero's spot and move hero to <cc.x,.y> */
            C.newsym(mtmp.mx, mtmp.my); /* finish removal */
            C.place_monster(mtmp, C.u.ux, C.u.uy);
            if (mtmp.wormno) {
                C.worm_move(mtmp);
                /* tail hasn't grown, so if it now occupies <cc.x,.y>
                   then one of its original spots must be free */
                if (C.m_at(cc.x, cc.y))
                    C.enexto(cc, C.u.ux, C.u.uy, C.gy.youmonst.data);
            }
            C.teleds(cc.x, cc.y, C.TELEDS_ALLOW_DRAG); /* move hero */
            C.set_apparxy(mtmp);
            C.newsym(C.u.ux, C.u.uy);

            if (C.gy.youmonst.data.mlet != C.S_PIERCER)
                return 0; /* lurkers don't attack */

            obj = C.which_armor(mtmp, C.WORN_HELMET);
            if (C.hard_helmet(obj)) {
                C.Your("blow glances off %s %s.", C.s_suffix(C.mon_nam(mtmp)),
                     C.helm_simple_name(obj));
            } else {
                if (3 + C.find_mac(mtmp) <= C.rnd(() => (20), 3)) {
                    C.pline("%s is hit by a falling piercer (you)!",
                          C.Monnam(mtmp));
                    if ((mtmp.mhp -= C.d(() => (3), () => ( 6), 4)) < 1)
                        C.killed(mtmp);
                } else
                    C.pline("%s is almost hit by a falling piercer (you)!",
                          C.Monnam(mtmp));
            }

        } else {
            /* surface hider */
            if (!youseeit) {
                C.pline("It tries to move where you are hiding.");
            } else {
                /* Ugly kludge for eggs.  The message is phrased so as
                 * to be directed at the monster, not the player,
                 * which makes "laid by you" wrong.  For the
                 * parallelism to work, we can't rephrase it, so we
                 * zap the "laid by you" momentarily instead.
                 */
                let obj = C.svl.level.objects[C.u.ux][C.u.uy];

                if (obj || C.u.umonnum == C.PM_TRAPPER
                    || (C.gy.youmonst.data.mlet == C.S_EEL
                        && C.is_pool(C.u.ux, C.u.uy))) {
                    let save_spe = 0; /* suppress warning */

                    if (obj) {
                        save_spe = obj.spe;
                        if (obj.otyp == C.EGG)
                            obj.spe = 0;
                    }
                    /* note that m_monnam() overrides hallucination, which is
                       what we want when message is from mtmp's perspective */
                    if (C.gy.youmonst.data.mlet == C.S_EEL
                        || C.u.umonnum == C.PM_TRAPPER)
                        C.pline(
                             "Wait, %s!  There's a hidden %s named %s there!",
                              C.m_monnam(mtmp),
                              C.pmname(C.gy.youmonst.data, C.Ugender), C.svp.plname);
                    else
                        C.pline(
                          "Wait, %s!  There's a %s named %s hiding under %s!",
                              C.m_monnam(mtmp),
                              C.pmname(C.gy.youmonst.data, C.Ugender),
                              C.svp.plname,
                              C.doname(C.svl.level.objects[C.u.ux][C.u.uy]));
                    if (obj)
                        obj.spe = save_spe;
                } else
                    C.impossible("hiding under nothing?");
            }
            C.newsym(C.u.ux, C.u.uy);
        }
        return 0;
    }

    /* hero might be a mimic, concealed via #monster */
    if (C.gy.youmonst.data.mlet == C.S_MIMIC && C.U_AP_TYPE && !range2
        && foundyou && !C.u.uswallow) {
        let sticky = C.sticks(C.gy.youmonst.data);

        if (!C.canspotmon(mtmp))
            C.map_invisible(mtmp.mx, mtmp.my);
        if (sticky && !youseeit)
            C.pline("It gets stuck on you.");
        else /* see note about m_monnam() above */
            C.pline("Wait, %s!  That's a %s named %s!", C.m_monnam(mtmp),
                  C.pmname(C.gy.youmonst.data, C.Ugender), C.svp.plname);
        if (sticky)
            C.set_ustuck(mtmp);
        C.gy.youmonst.m_ap_type = C.M_AP_NOTHING;
        C.gy.youmonst.mappearance = 0;
        C.newsym(C.u.ux, C.u.uy);
        return 0;
    }

    /* non-mimic hero might be mimicking an object after eating m corpse */
    if (C.U_AP_TYPE == C.M_AP_OBJECT && !range2 && foundyou && !C.u.uswallow) {
        if (!C.canspotmon(mtmp))
            C.map_invisible(mtmp.mx, mtmp.my);
        if (!youseeit)
            C.pline("%s %s!", C.Something,
                  (C.likes_gold(mtmp.data)
                   && C.gy.youmonst.mappearance == C.GOLD_PIECE)
                  ? "tries to pick you up"
                  : "disturbs you");
        else /* see note about m_monnam() above */
            C.pline("Wait, %s!  That %s is really %s named %s!", C.m_monnam(mtmp),
                  C.mimic_obj_name(C.gy.youmonst),
                  C.an(C.pmname(C.mons[C.u.umonnum], C.Ugender)), C.svp.plname);
        if (C.gm.multi < 0) { /* this should always be the case */
            const buf = C.stackAlloc(C.BUFSZ);

            C.Sprintf(buf, "You appear to be %s again.",
                    C.Upolyd ? C.an(C.pmname(C.gy.youmonst.data,
                                                      C.flags.female))
                           : "yourself");
            C.unmul(buf); /* immediately stop mimicking */
        }
        return 0;
    }

    /*  Work out the armor class differential   */
    tmp = C.AC_VALUE(() => (C.u.uac), 5) + 10; /* tmp ~= 0 - 20 */
    tmp += mtmp.m_lev;
    if (C.gm.multi < 0)
        tmp += 4;
    if ((C.Invis && !C.perceives(mdat)) || !mtmp.mcansee)
        tmp -= 2;
    if (mtmp.mtrapped)
        tmp -= 2;
    if (tmp <= 0)
        tmp = 1;

    /* make eels visible the moment they hit/miss us */
    if (mdat.mlet == C.S_EEL && mtmp.minvis && C.cansee(mtmp.mx, mtmp.my)) {
        mtmp.minvis = 0;
        C.newsym(mtmp.mx, mtmp.my);
    }

    /* when not cancelled and not in current form due to shapechange, many
       demons can summon more demons and were creatures can summon critters;
       also, were creature might change from human to animal or vice versa */
    if (mtmp.cham == C.NON_PM && !mtmp.mcan && !range2
        && (C.is_demon(mdat) || C.is_were(mdat))) {
        let already_fleeing = mtmp.mflee != 0;

        C.callLocal(summonmu, mtmp, youseeit);
        /* were-creature might have changed to beast form; if that has
           caused it to become afraid (due to non-human reacting to scroll
           of scare monster or engraved "Elbereth" which was being ignored
           while in human form), don't continue this attack */
        if (mtmp.mflee && !already_fleeing)
            return 0;
        mdat = mtmp.data; /* update cached value in case of were change */
    }

    if (C.u.uinvulnerable) { /* in the midst of successful prayer */
        /* monsters won't attack you */
        if (mtmp == C.u.ustuck) {
            C.pline_mon(mtmp, "%s loosens its grip slightly.", C.Monnam(mtmp));
        } else if (!range2) {
            if (youseeit || C.sensemon(mtmp))
                C.pline("%s starts to attack you, but pulls back.",
                      C.Monnam(mtmp));
            else
                C.You_feel("%s move nearby.", C.something);
        }
        return 0;
    }

    /* Unlike defensive stuff, don't let them use item _and_ attack. */
    if (C.find_offensive(mtmp)) {
        let offended = C.use_offensive(mtmp);

        if (offended != 0)
            return (offended == 1);
    }

    C.gs.skipdrin = 0; /* [see mattackm(mhitm.c)] */
    firstfoundyou = foundyou;

    for (i = 0; i < C.NATTK; i++) {
        sum[i] = C.M_ATTK_MISS;
        /* counterattack against attack [i-1] might have been fatal */
        if (C.DEADMONSTER(mtmp))
            return 1;
        if (i > 0) {
            /* recalc in case prior attack moved hero; mtmp doesn't make
               another attempt to guess your location but might have
               accidentally knocked you to where it thought you were
               [not sure whether that's actually possible] */
            C.callLocal(calc_mattacku_vars, mtmp, C.booleanReference(() => ranged, value => { ranged = value; }), C.booleanReference(() => range2, value => { range2 = value; }), C.booleanReference(() => foundyou, value => { foundyou = value; }), C.booleanReference(() => youseeit, value => { youseeit = value; }));
            /* if hero was found but isn't anymore, avoid wildmiss now */
            if (firstfoundyou && !foundyou)
                continue; /* set sum[i] to 'miss' but skip other actions */
            if (!C.u_at(C.gb.bhitpos.x, C.gb.bhitpos.y))
                continue;
        }
        C.mon_currwep = 0;
        mattk = C.callLocal(getmattk, mtmp, C.gy.youmonst, i, sum, alt_attk);
        if ((C.u.uswallow && mattk.aatyp != C.AT_ENGL)
            || (skipnonmagc && mattk.aatyp != C.AT_MAGC)
            || (C.gs.skipdrin && mattk.aatyp == C.AT_TENT
                && mattk.adtyp == C.AD_DRIN))
            continue;

        switch (mattk.aatyp) {
        case C.AT_CLAW: /* "hand to hand" attacks */
        case C.AT_KICK:
        case C.AT_BITE:
        case C.AT_STNG:
        case C.AT_TUCH:
        case C.AT_BUTT:
        case C.AT_TENT:
            if (mattk.aatyp == C.AT_KICK && C.callLocal(mtrapped_in_pit, mtmp))
                continue;
            if (!range2 && (!C.MON_WEP(mtmp) || mtmp.mconf || C.Conflict
                            || !C.touch_petrifies(C.gy.youmonst.data))) {
                if (foundyou) {
                    if (tmp > (j = C.rnd(() => (20 + i), 6))) {
                        if (C.unsolid(C.gy.youmonst.data)
                            && C.failed_grab(mtmp, C.gy.youmonst, mattk))
                            continue;
                        if (mattk.aatyp != C.AT_KICK
                            || !C.thick_skinned(C.gy.youmonst.data))
                            sum[i] = C.callLocal(hitmu, mtmp, mattk);
                    } else
                        C.callLocal(missmu, mtmp, (tmp == j), mattk);
                } else {
                    C.callLocal(wildmiss, mtmp, mattk);
                    /* skip any remaining non-spell attacks */
                    skipnonmagc = 1;
                }
            }
            break;

        case C.AT_HUGS: /* automatic if prev two attacks succeed */
            /* Note: if displaced, prev attacks never succeeded */
            if ((!range2 && i >= 2 && sum[i - 1] && sum[i - 2])
                || mtmp == C.u.ustuck) {
                if (!C.failed_grab(mtmp, C.gy.youmonst, mattk))
                    sum[i] = C.callLocal(hitmu, mtmp, mattk);
            }
            break;

        case C.AT_GAZE: /* can affect you either ranged or not */
            /* Medusa gaze already operated through m_respond in
               dochug(); don't gaze more than once per round. */
            if (mdat != C.mons[C.PM_MEDUSA])
                sum[i] = C.callLocal(gazemu, mtmp, mattk);
            break;

        case C.AT_EXPL: /* automatic hit if next to, and aimed at you */
            if (!range2)
                sum[i] = C.callLocal(explmu, mtmp, mattk, foundyou);
            break;

        case C.AT_ENGL:
            if (!range2) {
                if (foundyou) {
                    if (C.u.uswallow
                        || (!mtmp.mspec_used && tmp > (j = C.rnd(() => (20 + i), 7)))) {
                        /* force swallowing monster to be displayed
                           even when hero is moving away */
                        C.flush_screen(1);
                        sum[i] = C.callLocal(gulpmu, mtmp, mattk);
                    } else {
                        C.callLocal(missmu, mtmp, (tmp == j), mattk);
                    }
                } else if (C.digests(mtmp.data)) {
                    C.pline_mon(mtmp, "%s gulps some air!", C.Monnam(mtmp));
                } else {
                    if (youseeit) {
                        C.pline_mon(mtmp, "%s lunges forward and recoils!",
                                  C.Monnam(mtmp));
                    } else {
                        if (C.is_whirly(mtmp.data)) {
                            C.Soundeffect(() => C.se_rushing_wind_noise, () => 60);
                        }
                        C.You_hear("a %s nearby.",
                                 C.is_whirly(mtmp.data) ? "rushing noise"
                                                       : "splat");
                    }
                }
            }
            break;
        case C.AT_BREA:
            if (range2)
                sum[i] = C.breamu(mtmp, mattk);
            /* Note: breamu takes care of displacement */
            break;
        case C.AT_SPIT:
            if (range2)
                sum[i] = C.spitmu(mtmp, mattk);
            /* Note: spitmu takes care of displacement */
            break;
        case C.AT_WEAP:
            if (range2) {
                if (!C.Is_rogue_level(C.u.uz))
                    C.thrwmu(mtmp);
            } else {
                let hittmp = 0;

                /* Rare but not impossible.  Normally the monster
                 * wields when 2 spaces away, but it can be
                 * teleported or whatever....
                 */
                if (mtmp.weapon_check == C.NEED_WEAPON || !C.MON_WEP(mtmp)) {
                    mtmp.weapon_check = C.NEED_HTH_WEAPON;
                    /* mon_wield_item resets weapon_check as appropriate */
                    if (C.mon_wield_item(mtmp) != 0)
                        break;
                }
                if (foundyou) {
                    C.mon_currwep = C.MON_WEP(mtmp);
                    if (C.mon_currwep) {
                        let bash = (Number(Boolean(C.is_pole(C.mon_currwep)
                                        && !C.is_art(C.mon_currwep,
                                                   C.ART_SNICKERSNEE)
                                        && C.m_next2u(mtmp))));

                        hittmp = C.hitval(C.mon_currwep, C.gy.youmonst);
                        tmp += hittmp;
                        C.callLocal(mswings, mtmp, C.mon_currwep, bash);
                    }
                    if (tmp > (j = C.gm.mhitu_dieroll = C.rnd(() => (20 + i), 8)))
                        sum[i] = C.callLocal(hitmu, mtmp, mattk);
                    else
                        C.callLocal(missmu, mtmp, (tmp == j), mattk);
                    /* KMH -- Don't accumulate to-hit bonuses */
                    if (C.mon_currwep)
                        tmp -= hittmp;
                } else {
                    C.callLocal(wildmiss, mtmp, mattk);
                    /* skip any remaining non-spell attacks */
                    skipnonmagc = 1;
                }
            }
            break;
        case C.AT_MAGC:
            if (range2)
                sum[i] = C.buzzmu(mtmp, mattk);
            else
                sum[i] = C.castmu(mtmp, mattk, 1, foundyou);
            break;

        default: /* no attack */
            break;
        }
        if (C.disp.botl)
            C.bot();
        /* give player a chance of waking up before dying -kaa */
        if (sum[i] == C.M_ATTK_HIT) { /* successful attack */
            if (C.u.usleep && C.u.usleep < C.svm.moves && !C.rn2(() => (10), 9)) {
                C.gm.multi = -1;
                C.gn.nomovemsg = "The combat suddenly awakens you.";
            }
        }
        if ((sum[i] & C.M_ATTK_AGR_DIED))
            return 1; /* attacker dead */
        if ((sum[i] & C.M_ATTK_AGR_DONE))
            break; /* attacker teleported, no more attacks */
        /* sum[i] == 0: unsuccessful attack */
    }
    return 0;
}

/* monster summons help for its fight against hero */
export function summonmu(mtmp, youseeit)
{
    youseeit = C.boolean(youseeit);
    let mdat = mtmp.data;

    /*
     * Extracted from mattacku() to reduce clutter there.
     * Caller has verified that 'mtmp' hasn't been cancelled
     * and isn't a shapechanger.
     */

    if (C.is_demon(mdat)) {
        if (mdat != C.mons[C.PM_BALROG] && mdat != C.mons[C.PM_AMOROUS_DEMON]) {
            if (!C.rn2(() => (C.Inhell ? 10 : 16), 10))
                C.msummon(mtmp);
        }
        return; /* no such thing as a demon were creature, so we're done */
    }

    if (C.is_were(mdat)) {
        /* if hero has Protection_from_shape_changers, new_were() will work
           in the critter-to-human direction but be a no-op the other way;
           we repeat the criteria here for clarity */
        if (C.is_human(mdat)) { /* maybe switch to animal form */
            if (!C.Protection_from_shape_changers && !C.rn2(() => (5 - (C.night() * 2)), 11))
                C.new_were(mtmp);
        } else { /* maybe switch to back human form */
            if (C.Protection_from_shape_changers || !C.rn2(() => (30), 12))
                C.new_were(mtmp);
        }
        mdat = mtmp.data; /* form change invalidates cached value */

        /* maybe summon compatible critters;
           not blocked by Protection_from_shape_changers */
        if (!C.rn2(() => (10), 13)) {
            let numseen, numhelp;
            const buf = C.stackAlloc(C.BUFSZ), genericwere = C.stackAlloc(C.BUFSZ);

            C.Strcpy(genericwere, "creature");
            if (youseeit)
                C.pline_mon(mtmp, "%s summons help!", C.Monnam(mtmp));
            numhelp = C.were_summon(mdat, 0, C.intReference(() => numseen, value => { numseen = value; }), genericwere);
            if (youseeit) {
                if (numhelp > 0) {
                    if (numseen == 0)
                        C.You_feel("hemmed in.");
                } else {
                    C.pline("But none comes.");
                }
            } else {
                let from_nowhere;

                if (!C.Deaf) {
                    C.pline("%s %s!", C.Something,
                          C.makeplural(C.growl_sound(mtmp)));
                    from_nowhere = "";
                } else {
                    from_nowhere = " from nowhere";
                }
                if (numhelp > 0) {
                    if (numseen < 1) {
                        C.You_feel("hemmed in.");
                    } else {
                        if (numseen == 1)
                            C.Sprintf(buf, "%s appears", C.an(genericwere));
                        else
                            C.Sprintf(buf, "%s appear",
                                    C.makeplural(genericwere));
                        C.pline("%s%s!", C.upstart(buf), from_nowhere);
                    }
                } /* else no help came; but you didn't know it tried */
            }
        } /* summon critters */
        return;
    } /* were creature */
}

export function diseasemu(mdat)
{
    if (C.Sick_resistance) {
        C.You_feel("a slight illness.");
        return 0;
    } else {
        C.make_sick(C.Sick ? C.Sick / 3n + 1n : C.long(C.rn1(() => (C.ACURR(C.A_CON)), () => ( 20), 14)),
                  mdat.pmnames[C.NEUTRAL], 1, C.SICK_NONVOMITABLE);
        return 1;
    }
}

/* check whether slippery clothing protects from hug or wrap attack */
export function u_slip_free(mtmp, mattk)
{
    let obj;

    /* greased armor does not protect against AT_ENGL+AD_WRAP */
    if (mattk.aatyp == C.AT_ENGL)
        return 0;

    obj = (C.uarmc ? C.uarmc : C.uarm);
    if (!obj)
        obj = C.uarmu;
    if (mattk.adtyp == C.AD_DRIN)
        obj = C.uarmh;

    /* if your cloak/armor is greased, monster slips off; this
       protection might fail (33% chance) when the armor is cursed */
    if (obj && (obj.greased || obj.otyp == C.OILSKIN_CLOAK)
        && (!obj.cursed || C.rn2(() => (3), 15))) {
        C.pline_mon(mtmp, "%s %s your %s %s!", C.Monnam(mtmp),
              (mattk.adtyp == C.AD_WRAP) ? "slips off of"
                                        : "grabs you, but cannot hold onto",
              obj.greased ? "greased" : "slippery",
              /* avoid "slippery slippery cloak"
                 for undiscovered oilskin cloak */
              (obj.greased || C.objects[obj.otyp].oc_name_known)
                  ? C.xname(obj)
                  : C.cloak_simple_name(obj));

        if (obj.greased && !C.rn2(() => (2), 16)) {
            C.pline_The("grease wears off.");
            obj.greased = 0;
            C.update_inventory();
        }
        return 1;
    }
    return 0;
}

/* armor that sufficiently covers the body might be able to block magic */
export function magic_negation(mon)
{
    let o;
    let wearmask;
    let armpro, mc = 0;
    let is_you = (mon == C.gy.youmonst),
            via_amul = 0,
            gotprot = is_you ? (C.EProtection != 0n)
                             /* high priests have innate protection */
                             : (mon.data == C.mons[C.PM_HIGH_CLERIC]);

    for (o = is_you ? C.gi.invent : mon.minvent; o; o = o.nobj) {
        /* a_can field is only applicable for armor (which must be worn) */
        if ((o.owornmask & C.W_ARMOR) != 0n) {
            armpro = C.objects[o.otyp].a_can;
            if (armpro > mc)
                mc = armpro;
        } else if ((o.owornmask & C.W_AMUL) != 0n) {
            via_amul = (o.otyp == C.AMULET_OF_GUARDING);
        }
        /* if we've already confirmed Protection, skip additional checks */
        if (is_you || gotprot)
            continue;

        /* omit W_SWAPWEP+W_QUIVER; W_ART+W_ARTI handled by protects() */
        wearmask = C.W_ARMOR | C.W_ACCESSORY;
        if (o.oclass == C.WEAPON_CLASS || C.is_weptool(o))
            wearmask |= C.W_WEP;
        if (C.protects(o, ((o.owornmask & wearmask) != 0n) ? 1 : 0))
            gotprot = 1;
    }

    if (gotprot) {
        /* extrinsic Protection increases mc by 1 (2 for amulet of guarding);
           multiple sources don't provide multiple increments */
        mc += via_amul ? 2 : 1;
        if (mc > 3)
            mc = 3;
    } else if (mc < 1) {
        /* intrinsic Protection is weaker (play balance; obtaining divine
           protection is too easy); it confers minimum mc 1 instead of 0 */
        if ((is_you && ((C.HProtection && C.u.ublessed > 0) || C.u.uspellprot))
            /* aligned priests and angels have innate intrinsic Protection */
            || (mon.data == C.mons[C.PM_ALIGNED_CLERIC]
                || C.is_minion(mon.data)))
            mc = 1;
    }
    return mc;
}

/*
 * hitmu: monster hits you
 * returns MM_ flags
*/
export function hitmu(mtmp, mattk)
{
    let mdat = mtmp.data;
    let olduasmon = C.gy.youmonst.data;
    let res;
    const mhm = C.localRecord("mhitm_data");
    mhm.hitflags = C.M_ATTK_MISS;
    mhm.permdmg = 0;
    mhm.specialdmg = 0;
    mhm.done = 0;

    if (!C.canspotmon(mtmp))
        C.map_invisible(mtmp.mx, mtmp.my);

    /*  If the monster is undetected & hits you, you should know where
     *  the attack came from.
     */
    if (mtmp.mundetected && (C.hides_under(mdat) || mdat.mlet == C.S_EEL)) {
        mtmp.mundetected = 0;
        if (!C.tp_sensemon(mtmp) && !C.Detect_monsters) {
            let obj;
            let what;
            const Amonbuf = C.stackAlloc(C.BUFSZ);

            if ((obj = C.svl.level.objects[mtmp.mx][mtmp.my]) != 0) {
                if (C.Blind && !obj.dknown)
                    what = C.something;
                else if (C.is_pool(mtmp.mx, mtmp.my) && !C.Underwater)
                    what = "the water";
                else
                    what = C.doname(obj);

                C.Strcpy(Amonbuf, C.Amonnam(mtmp));
                /* mtmp might be invisible with hero unable to see same */
                if (!C.strcmp(Amonbuf, "It")) /* note: not strcmpi() */
                    C.Strcpy(Amonbuf, C.Something);
                C.pline("%s was hidden under %s!", Amonbuf, what);
            }
            C.newsym(mtmp.mx, mtmp.my);
        }
    }

    /*  First determine the base damage done */
    mhm.damage = C.d(() => (C.int(mattk.damn)), () => ( C.int(mattk.damd)), 17);
    if ((C.is_undead(mdat) || C.is_vampshifter(mtmp)) && C.midnight())
        mhm.damage += C.d(() => (C.int(mattk.damn)), () => ( C.int(mattk.damd)), 18); /* extra dmg */

    C.mhitm_adtyping(mtmp, mattk, C.gy.youmonst, mhm);

    C.mhitm_knockback(mtmp, C.gy.youmonst, mattk, C.addressOf(mhm, "hitflags"),
                           (C.MON_WEP(mtmp) != 0));

    if (mhm.done)
        return mhm.hitflags;

    if ((C.Upolyd ? C.u.mh : C.u.uhp) < 1) {
        /* already dead? call rehumanize() or done_in_by() as appropriate */
        C.callLocal(mdamageu, mtmp, 1);
        mhm.damage = 0;
    }

    /*  Negative armor class reduces damage done instead of fully protecting
     *  against hits.
     */
    if (mhm.damage && C.u.uac < 0) {
        mhm.damage -= C.rnd(() => (-C.u.uac), 19);
        if (mhm.damage < 1)
            mhm.damage = 1;
    }

    if (mhm.damage > 0) {
        /* [Half_physical_damage isn't applied to mhm.permdmg] */
        if (C.Half_physical_damage
            /* Mitre of Holiness, even if not currently blessed */
            || (C.Role_if(C.PM_CLERIC) && C.uarmh && C.is_quest_artifact(C.uarmh)
                && C.mon_hates_blessings(mtmp)))
            mhm.damage = Math.trunc((mhm.damage + 1) / 2);

        if (mhm.permdmg) { /* Death's life force drain */
            let lowerlimit, hpmax_p;
            /*
             * Apply some of the damage to permanent hit points:
             *  polymorphed         100% against poly'd hpmax
             *  hpmax > 25*lvl      100% against normal hpmax
             *  hpmax > 10*lvl  50..100%
             *  hpmax >  5*lvl  25..75%
             *  otherwise        0..50%
             * Never reduces hpmax below 1 hit point per level.
             */
            mhm.permdmg = C.rn2(() => (Math.trunc(mhm.damage / 2) + 1), 20);
            if (C.Upolyd || C.u.uhpmax > 25 * C.u.ulevel)
                mhm.permdmg = mhm.damage;
            else if (C.u.uhpmax > 10 * C.u.ulevel)
                mhm.permdmg += Math.trunc(mhm.damage / 2);
            else if (C.u.uhpmax > 5 * C.u.ulevel)
                mhm.permdmg += Math.trunc(mhm.damage / 4);

            if (C.Upolyd) {
                hpmax_p = C.addressOf(C.u, "mhmax");
                /* [can't use gy.youmonst.m_lev] */
                lowerlimit = C.min(C.int(C.gy.youmonst.data.mlevel), C.u.ulevel);
            } else {
                hpmax_p = C.addressOf(C.u, "uhpmax");
                lowerlimit = C.minuhpmax(1);
            }
            if (C.loadInt(hpmax_p) - mhm.permdmg > lowerlimit)
                C.storeInt(hpmax_p, C.loadInt(hpmax_p) - mhm.permdmg);
            else if (C.loadInt(hpmax_p) > lowerlimit)
                C.storeInt(hpmax_p, lowerlimit);
            /* else unlikely...
             * already at or below minimum threshold, do nothing to hpmax */
            C.disp.botl = 1;
        }

        C.callLocal(mdamageu, mtmp, mhm.damage);
    }

    if (mhm.damage)
        res = C.callLocal(passiveum, olduasmon, mtmp, mattk);
    else
        res = C.M_ATTK_HIT;
    C.stop_occupation();
    return res;
}

/* An interface for use when taking a blindfold off, for example,
 * to see if an engulfing attack should immediately take affect, like
 * a passive attack. TRUE if engulfing blindness occurred */
export function gulp_blnd_check()
{
    let mattk;

    if (!C.Blinded && C.u.uswallow
        && (mattk = C.attacktype_fordmg(C.u.ustuck.data, C.AT_ENGL, C.AD_BLND))
        && C.can_blnd(C.u.ustuck, C.gy.youmonst, mattk.aatyp, 0)) {
        ++C.u.uswldtim; /* compensate for gulpmu change */
        C.callLocal(gulpmu, C.u.ustuck, mattk);
        return 1;
    }
    return 0;
}

/* monster swallows you, or damage if already swallowed (u.uswallow != 0) */
export function gulpmu(mtmp, mattk)
{
    let t = C.t_at(C.u.ux, C.u.uy);
    let tmp = C.d(() => (C.int(mattk.damn)), () => ( C.int(mattk.damd)), 21);
    let tim_tmp;
    let otmp2, nextobj;
    let i;
    let physical_damage = 0;

    if (!C.u.uswallow) { /* swallows you */
        let omx = mtmp.mx, omy = mtmp.my;

        if (!C.engulf_target(mtmp, C.gy.youmonst))
            return C.M_ATTK_MISS;
        if ((t && C.is_pit(t.ttyp)) && C.sobj_at(C.BOULDER, C.u.ux, C.u.uy))
            return C.M_ATTK_MISS;
        if (C.failed_grab(mtmp, C.gy.youmonst, mattk))
            return C.M_ATTK_MISS;

        if (C.Punished)
            C.unplacebc(); /* ball&chain go away */
        C.remove_monster(omx, omy);
        mtmp.mtrapped = 0; /* no longer on old trap */
        C.place_monster(mtmp, C.u.ux, C.u.uy);
        C.set_ustuck(mtmp);
        C.newsym(mtmp.mx, mtmp.my);
        /* 5.0: dismount for all engulfers, not just for purple worms */
        if (C.u.usteed) {
            const buf = C.stackAlloc(C.BUFSZ);

            C.Strcpy(buf, C.mon_nam(C.u.usteed));
            C.urgent_pline("%s %s forward and plucks you off %s!",
                         C.Some_Monnam(mtmp),
                         /* 't', purple 'w' */
                         C.is_animal(mtmp.data) ? "lunges"
                           /* 'v', air 'E' */
                           : C.is_whirly(mtmp.data) ? "whirls"
                             /* none (some 'v', already whirling) */
                             : C.unsolid(mtmp.data) ? "flows"
                               /* ochre 'j', Juiblex */
                               : C.amorphous(mtmp.data) ? "oozes"
                                 /* none (all AT_ENGL are already covered) */
                                 : "surges",
                         buf);
            C.dismount_steed(C.DISMOUNT_ENGULFED);
        } else {
            C.urgent_pline("%s %s!", C.Monnam(mtmp),
                         C.digests(mtmp.data) ? "swallows you whole"
                         : C.enfolds(mtmp.data) ? "folds itself around you"
                           : "engulfs you");
        }
        C.stop_occupation();
        C.reset_occupations(); /* behave as if you had moved */

        if (C.u.utrap) {
            C.You("are released from the %s!",
                (C.u.utraptype == C.TT_WEB) ? "web" : "trap");
            C.reset_utrap(0);
        }

        i = C.number_leashed();
        if (i > 0) {
            let s = (i > 1) ? "leashes" : "leash";

            C.pline_The("%s %s loose.", s, C.vtense(s, "snap"));
            C.unleash_all();
        }

        if (C.touch_petrifies(C.gy.youmonst.data) && !C.resists_ston(mtmp)) {
            /* put the attacker back where it started;
               the resulting statue will end up there
               [note: if poly'd hero could ride or non-poly'd hero could
               acquire touch_petrifies() capability somehow, this code
               would need to deal with possibility of steed having taken
               engulfer's previous spot when hero was forcibly dismounted] */
            C.remove_monster(mtmp.mx, mtmp.my); /* u.ux,u.uy */
            C.place_monster(mtmp, omx, omy);
            C.minstapetrify(mtmp, 1);
            /* normally unstuck() would do this, but we're not
               fully swallowed yet so that won't work here */
            if (C.Punished)
                C.placebc();
            C.set_ustuck(0);
            return (!C.DEADMONSTER(mtmp)) ? C.M_ATTK_MISS : C.M_ATTK_AGR_DIED;
        }

        C.display_nhwindow(C.WIN_MESSAGE, 0);
        C.vision_recalc(2); /* hero can't see anything */
        C.u.uswallow = 1;
        /* for digestion, shorter time is more dangerous;
           for other swallowings, longer time means more
           chances for the swallower to attack */
        if (mattk.adtyp == C.AD_DGST) {
            /* having good armor & high constitution makes
               it take longer for you to be digested, but
               you'll end up trapped inside for longer too */
            tim_tmp = C.int(C.ACURR(C.A_CON)) + 10 - C.int(C.u.uac) + C.rn2(() => (20), 22);
            if (tim_tmp < 0)
                tim_tmp = 0;
            tim_tmp = Math.trunc(tim_tmp / C.int(mtmp.m_lev));
            tim_tmp += 3;
        } else {
            /* higher level attacker takes longer to eject hero */
            tim_tmp = C.rnd(() => (C.int(mtmp.m_lev) + Math.trunc(10 / 2)), 23);
        }
        /* u.uswldtim always set > 1 */
        C.u.uswldtim = C.uint(((tim_tmp < 2) ? 2 : tim_tmp));
        C.swallowed(1); /* update the map display, shows hero swallowed */
        if (!C.flaming(mtmp.data)) {
            for (otmp2 = C.gi.invent; otmp2; otmp2 = nextobj) {
                nextobj = otmp2.nobj;
                C.snuff_lit(otmp2);
            }
        }
    }

    if (mtmp != C.u.ustuck)
        return C.M_ATTK_MISS;
    if (C.Punished) {
        /* ball&chain are in limbo while swallowed; update their internal
           location to be at swallower's spot */
        if (C.uchain.where == C.OBJ_FREE)
            C.uchain.ox = mtmp.mx, C.uchain.oy = mtmp.my;
        if (C.uball.where == C.OBJ_FREE)
            C.uball.ox = mtmp.mx, C.uball.oy = mtmp.my;
    }
    if (C.u.uswldtim > 0)
        C.u.uswldtim -= 1;

    switch (mattk.adtyp) {
    case C.AD_DGST:
        physical_damage = 1;
        if (C.Slow_digestion) {
            /* Messages are handled below */
            C.u.uswldtim = 0;
            tmp = 0;
        } else if (C.u.uswldtim == 0) {
            C.pline("%s totally digests you!", C.Monnam(mtmp));
            tmp = C.u.uhp;
            if (C.Half_physical_damage)
                tmp *= 2; /* sorry */
        } else {
            C.pline("%s%s digests you!", C.Monnam(mtmp),
                  (C.u.uswldtim == 2) ? " thoroughly"
                                    : (C.u.uswldtim == 1) ? " utterly" : "");
            C.exercise(C.A_STR, 0);
        }
        break;
    case C.AD_PHYS:
        physical_damage = 1;
        if (mtmp.data == C.mons[C.PM_FOG_CLOUD]) {
            C.You("are laden with moisture and %s",
                C.flaming(C.gy.youmonst.data)
                    ? "are smoldering out!"
                    : C.Breathless ? "find it mildly uncomfortable."
                                 : C.amphibious(C.gy.youmonst.data)
                                       ? "feel comforted."
                                       : "can barely breathe!");
            if ((C.Amphibious || C.Breathless) && !C.flaming(C.gy.youmonst.data))
                tmp = 0;
        } else {
            C.You("are %s!", C.enfolds(mtmp.data) ? "being squashed"
                                               : "pummeled with debris");
            C.exercise(C.A_STR, 0);
        }
        break;
    case C.AD_ACID:
        if (C.Acid_resistance) {
            C.You("are covered with a seemingly harmless goo.");
            /* NB: the monst[un]seesu calls in gulpmu are no-ops since the
               hero must be currently swallowed for the attack to hit... */
            C.monstseesu(C.M_SEEN_ACID);
            tmp = 0;
        } else {
            if (C.Hallucination)
                C.pline("Ouch!  You've been slimed!");
            else
                C.You("are covered in slime!  It burns!");
            C.exercise(C.A_STR, 0);
            C.monstunseesu(C.M_SEEN_ACID);
        }
        break;
    case C.AD_BLND:
        if (C.can_blnd(mtmp, C.gy.youmonst, mattk.aatyp, 0)) {
            if (!C.Blind) {
                let was_blinded = C.Blinded;

                if (!C.Blinded)
                    C.You_cant("see in here!");
                C.make_blinded(C.long(tmp), 0);
                if (!was_blinded && !C.Blind)
                    C.Your1(C.vision_clears);
            } else
                /* keep him blind until disgorged */
                C.incr_itimeout(C.propertyReference('HBlinded'), 1n);
        }
        tmp = 0;
        break;
    case C.AD_ELEC:
        if (!mtmp.mcan && C.rn2(() => (2), 24)) {
            C.pline_The("air around you crackles with electricity.");
            if (C.Shock_resistance) {
                C.shieldeff(C.u.ux, C.u.uy);
                C.You("seem unhurt.");
                C.monstseesu(C.M_SEEN_ELEC);
                C.ugolemeffects(C.AD_ELEC, tmp);
                tmp = 0;
            } else {
                C.monstunseesu(C.M_SEEN_ELEC);
            }
        } else
            tmp = 0;
        break;
    case C.AD_COLD:
        if (!mtmp.mcan && C.rn2(() => (2), 25)) {
            if (C.Cold_resistance) {
                C.shieldeff(C.u.ux, C.u.uy);
                C.You_feel("mildly chilly.");
                C.monstseesu(C.M_SEEN_COLD);
                C.ugolemeffects(C.AD_COLD, tmp);
                tmp = 0;
            } else {
                C.You("are freezing to death!");
                C.monstunseesu(C.M_SEEN_COLD);
            }
        } else
            tmp = 0;
        break;
    case C.AD_FIRE:
        if (!mtmp.mcan && C.rn2(() => (2), 26)) {
            if (C.Fire_resistance) {
                C.shieldeff(C.u.ux, C.u.uy);
                C.You_feel("mildly hot.");
                C.monstseesu(C.M_SEEN_FIRE);
                C.ugolemeffects(C.AD_FIRE, tmp);
                tmp = 0;
            } else {
                C.You("are burning to a crisp!");
                C.monstunseesu(C.M_SEEN_FIRE);
            }
            C.burn_away_slime();
        } else
            tmp = 0;
        break;
    case C.AD_DISE:
        if (!C.callLocal(diseasemu, mtmp.data))
            tmp = 0;
        break;
    case C.AD_DREN:
        /* AC magic cancellation doesn't help when engulfed */
        if (!mtmp.mcan && C.rn2(() => (4), 27)) /* 75% chance */
            C.drain_en(tmp, 0);
        tmp = 0;
        break;
    default:
        physical_damage = 1;
        tmp = 0;
        break;
    }

    if (physical_damage) {
        /* same damage reduction for AC as in hitmu */
        if (C.u.uac < 0)
            tmp -= C.rnd(() => (-C.u.uac), 28);
        if (tmp < 0)
            tmp = 1;

        tmp = C.Maybe_Half_Phys(tmp);
    }

    C.gm.mswallower = mtmp; /* match gulpmm() */
    C.callLocal(mdamageu, mtmp, tmp);
    C.gm.mswallower = 0;
    if (tmp)
        C.stop_occupation();

    if (!C.u.uswallow) {
        ; /* life-saving has already expelled swallowed hero */
    } else if (C.touch_petrifies(C.gy.youmonst.data) && !C.resists_ston(mtmp)) {
        C.pline("%s very hurriedly %s you!", C.Monnam(mtmp),
              C.digests(mtmp.data) ? "regurgitates"
              : C.enfolds(mtmp.data) ? "releases"
                : "expels");
        C.callLocal(expels, mtmp, mtmp.data, 0);
    } else if (!C.u.uswldtim || C.gy.youmonst.data.msize >= C.MZ_HUGE) {
        /* As of 3.6.2: u.uswldtim used to be set to 0 by life-saving but it
           expels now so the !u.uswldtim case is no longer possible;
           however, polymorphing into a huge form while already
           swallowed is still possible */
        C.You("get %s!", C.digests(mtmp.data) ? "regurgitated"
                       : C.enfolds(mtmp.data) ? "released"
                         : "expelled");
        if (C.flags.verbose
            && (C.digests(mtmp.data) && C.Slow_digestion))
            C.pline("Obviously %s doesn't like your taste.", C.mon_nam(mtmp));
        C.callLocal(expels, mtmp, mtmp.data, 0);
    }
    return C.M_ATTK_HIT;
}

/* monster explodes in your face */
export function explmu(mtmp, mattk, ufound)
{
    ufound = C.boolean(ufound);
    let kill_agr = 1;
    let not_affected;
    let tmp;

    if (mtmp.mcan)
        return C.M_ATTK_MISS;

    tmp = C.d(() => (C.int(mattk.damn)), () => ( C.int(mattk.damd)), 29);
    not_affected = C.defended(mtmp, C.int(mattk.adtyp));

    if (!ufound) {
        C.pline("%s explodes at a spot in %s!",
              C.canseemon(mtmp) ? C.Monnam(mtmp) : "It",
              C.is_waterwall(mtmp.mux,mtmp.muy) ? "empty water"
                                                : "thin air");
    } else {
        C.callLocal(hitmsg, mtmp, mattk);
    }

    switch (mattk.adtyp) {
    case C.AD_COLD:
    case C.AD_FIRE:
    case C.AD_ELEC:
        C.mon_explodes(mtmp, mattk);
        if (!C.DEADMONSTER(mtmp))
            kill_agr = 0; /* lifesaving? */
        break;
    case C.AD_BLND:
        not_affected = C.resists_blnd(C.gy.youmonst);
        if (ufound && !not_affected) {
            /* sometimes you're affected even if it's invisible */
            if (C.mon_visible(mtmp) || (C.rnd(() => (tmp = Math.trunc(tmp / 2)), 30) > C.u.ulevel)) {
                C.You("are blinded by a blast of light!");
                C.make_blinded(C.long(tmp), 0);
                if (!C.Blind)
                    C.Your1(C.vision_clears);
            } else if (C.flags.verbose)
                C.You("get the impression it was not terribly bright.");
        }
        break;
    case C.AD_HALU:
        not_affected |= Number(Boolean(C.Blind || (C.u.umonnum == C.PM_BLACK_LIGHT
                                  || C.u.umonnum == C.PM_VIOLET_FUNGUS
                                  || C.dmgtype(C.gy.youmonst.data, C.AD_STUN))));
        if (ufound && !not_affected) {
            let chg;
            if (!C.Hallucination)
                C.You("are caught in a blast of kaleidoscopic light!");
            /* avoid hallucinating the black light as it dies */
            C.mondead(mtmp);    /* remove it from map now */
            kill_agr = 0; /* already killed (maybe lifesaved) */
            chg =
                C.make_hallucinated(C.HHallucination + C.long(tmp), 0, 0n);
            C.You("%s.", chg ? "are freaked out" : "seem unaffected");
        }
        break;
    default:
        C.impossible("unknown exploder damage type %d", mattk.adtyp);
        break;
    }
    if (not_affected) {
        C.You("seem unaffected by it.");
        C.ugolemeffects(C.int(mattk.adtyp), tmp);
    }
    if (kill_agr && !C.DEADMONSTER(mtmp))
        C.mondead(mtmp);
    C.wake_nearto(mtmp.mx, mtmp.my, 7 * 7);
    return (!C.DEADMONSTER(mtmp)) ? C.M_ATTK_MISS : C.M_ATTK_AGR_DIED;
}

/* monster gazes at you */
export function gazemu(mtmp, mattk)
{
    const reactions = [
        "confused",              /* [0] */
        "stunned",               /* [1] */
        "puzzled",   "dazzled",  /* [2,3] */
        "irritated", "inflamed", /* [4,5] */
        "tired",                 /* [6] */
        "dulled",                /* [7] */
    ];
    let react = -1;
    let is_medusa, reflectable,
            cancelled = (mtmp.mcan != 0), already = 0,
            mcanseeu = (Number(Boolean(C.canseemon(mtmp) && C.couldsee(mtmp.mx, mtmp.my)
                        && mtmp.mcansee)));

    if (C.m_seenres(mtmp, C.cvt_adtyp_to_mseenres(mattk.adtyp)))
        return C.M_ATTK_MISS;

    is_medusa = (mtmp.data == C.mons[C.PM_MEDUSA]);
    reflectable = (Number(Boolean(C.Reflecting && C.couldsee(mtmp.mx, mtmp.my) && is_medusa)));
    /* assumes that hero has to see monster's gaze in order to be
       affected, rather than monster just having to look at hero;
       Unaware:  asleep or unconscious => not blind but won't see;
       when hallucinating, hero's brain doesn't register what
       it's seeing correctly so the gaze is usually ineffective
       [this could be taken a lot farther and select a gaze effect
       appropriate to what's currently being displayed, giving
       ordinary monsters a gaze attack when hero thinks he or she
       is facing a gazing creature, but let's not go that far...] */
    if ((C.Hallucination && C.rn2(() => (4), 31)) || (C.Unaware && !reflectable))
        cancelled = 1;

    switch (mattk.adtyp) {
    case C.AD_STON:
        /* note: Medusa is the only monster with stoning gaze, so
           'is_medusa' will always be True here */
        if (cancelled || !mtmp.mcansee) {
            if (!C.canseemon(mtmp))
                break; /* silently */
            if (C.Unaware) { /* can't see attacker even though not blind */
                react = is_medusa ? 4 : 2; /* irritated or puzzled */
                break;
            }
            if (is_medusa && C.Hallucination && !C.rn2(() => (3), 32))
                C.pline("Someone seems overdue for a serpent cut.");
            else
                C.pline_mon(mtmp, "%s %s.", C.Monnam(mtmp),
                      (is_medusa && mtmp.mcan && !react)
                          ? "doesn't look all that ugly"
                          : "gazes ineffectually");
            break;
         }
        if (reflectable) {
            /* hero has line of sight to Medusa and she's not blind */
            let useeit = C.canseemon(mtmp);

            if (useeit)
                C.ureflects("%s gaze is reflected by your %s.",
                                 C.s_suffix(C.Monnam(mtmp)));
            if (C.mon_reflects(mtmp, !useeit ? 0
                                  : "The gaze is reflected away by %s %s!"))
                break;
            if (!C.m_canseeu(mtmp)) { /* probably you're invisible */
                if (useeit)
                    C.pline(
                      "%s doesn't seem to notice that %s gaze was reflected.",
                          C.Monnam(mtmp), C.mhis(mtmp));
                break;
            }
            if (useeit)
                C.pline_mon(mtmp, "%s is turned to stone!", C.Monnam(mtmp));
            C.gs.stoned = 1;
            C.killed(mtmp);

            if (!C.DEADMONSTER(mtmp))
                break;
            return C.M_ATTK_AGR_DIED;
        }
        if (C.canseemon(mtmp) && C.couldsee(mtmp.mx, mtmp.my)
            && !C.Stone_resistance && !C.Unaware) {
            C.You("meet %s gaze.", C.s_suffix(C.mon_nam(mtmp)));
            C.stop_occupation();
            if (C.poly_when_stoned(C.gy.youmonst.data) && C.polymon(C.PM_STONE_GOLEM))
                break;
            C.urgent_pline("You turn to stone...");
            C.svk.killer.format = C.KILLED_BY;
            C.Strcpy(C.svk.killer.name, C.pmname(mtmp.data, C.Mgender(mtmp)));
            C.done(C.STONING);
        }
        break;
    case C.AD_CONF:
        if (mcanseeu && !mtmp.mspec_used && C.rn2(() => (5), 33)) {
            if (cancelled) {
                react = 0; /* "confused" */
                already = (mtmp.mconf != 0);
            } else {
                let conf = C.d(() => (3), () => ( 4), 34);

                mtmp.mspec_used = mtmp.mspec_used + (conf + C.rn2(() => (6), 35));
                if (!C.Confusion)
                    C.pline_mon(mtmp, "%s gaze confuses you!",
                              C.s_suffix(C.Monnam(mtmp)));
                else
                    C.You("are getting more and more confused.");
                C.make_confused(C.HConfusion + C.long(conf), 0);
                C.stop_occupation();
            }
        }
        break;
    case C.AD_STUN:
        if (mcanseeu && !mtmp.mspec_used && C.rn2(() => (5), 36)) {
            if (cancelled) {
                react = 1; /* "stunned" */
                already = (mtmp.mstun != 0);
            } else {
                let stun = C.d(() => (2), () => ( 6), 37);

                mtmp.mspec_used = mtmp.mspec_used + (stun + C.rn2(() => (6), 38));
                C.pline_mon(mtmp, "%s stares piercingly at you!", C.Monnam(mtmp));
                C.make_stunned((C.HStun & C.TIMEOUT) + C.long(stun), 1);
                C.stop_occupation();
            }
        }
        break;
    case C.AD_BLND:
        if (C.canseemon(mtmp) && !C.resists_blnd(C.gy.youmonst)
            && C.mdistu(mtmp) <= C.BOLT_LIM * C.BOLT_LIM) {
            if (cancelled) {
                react = C.rn1(() => (2), () => ( 2), 39); /* "puzzled" || "dazzled" */
                already = (mtmp.mcansee == 0);
                /* Archons gaze every round; we don't want cancelled ones
                   giving the "seems puzzled/dazzled" message that often */
                if (mtmp.mcan && mtmp.data == C.mons[C.PM_ARCHON] && C.rn2(() => (5), 40))
                    react = -1;
            } else {
                let blnd = C.d(() => (C.int(mattk.damn)), () => ( C.int(mattk.damd)), 41);

                C.You("are blinded by %s radiance!", C.s_suffix(C.mon_nam(mtmp)));
                C.make_blinded(C.long(blnd), 0);
                C.stop_occupation();
                /* not blind at this point implies you're wearing
                   the Eyes of the Overworld; make them block this
                   particular stun attack too */
                if (!C.Blind) {
                    C.Your1(C.vision_clears);
                } else {
                    let oldstun = (C.HStun & C.TIMEOUT), newstun = C.long(C.rnd(() => (3), 42));

                    /* we don't want to increment stun duration every time
                       or sighted hero will become incapacitated */
                    C.make_stunned(C.max(oldstun, newstun), 1);
                }
            }
        }
        break;
    case C.AD_FIRE:
        if (mcanseeu && !mtmp.mspec_used && C.rn2(() => (5), 43)) {
            if (cancelled) {
                react = C.rn1(() => (2), () => ( 4), 44); /* "irritated" || "inflamed" */
            } else {
                let dmg = C.d(() => (2), () => ( 6), 45), orig_dmg = dmg, lev = C.int(mtmp.m_lev);

                C.pline_mon(mtmp, "%s attacks you with a fiery gaze!",
                          C.Monnam(mtmp));
                C.stop_occupation();
                if (C.Fire_resistance) {
                    C.shieldeff(C.u.ux, C.u.uy);
                    C.pline_The("fire doesn't feel hot!");
                    C.monstseesu(C.M_SEEN_FIRE);
                    C.ugolemeffects(C.AD_FIRE, C.d(() => (12), () => ( 6), 46));
                    dmg = 0;
                } else {
                    C.monstunseesu(C.M_SEEN_FIRE);
                }
                C.burn_away_slime();
                if (lev > C.rn2(() => (20), 47))
                    C.burnarmor(C.gy.youmonst);
                if (lev > C.rn2(() => (20), 48)) {
                    C.destroy_items(C.gy.youmonst, C.AD_FIRE, orig_dmg);
                    C.ignite_items(C.gi.invent);
                }
                if (dmg)
                    C.callLocal(mdamageu, mtmp, dmg);
            }
        }
        break;
// Original PM_BEHOLDER branch is inactive in the configured source.

    default:
        C.impossible("Gaze attack %d?", mattk.adtyp);
        break;
    }
    if (react >= 0) {
        if (C.Hallucination && C.rn2(() => (3), 49))
            react = C.rn2(() => (C.SIZE(reactions)), 50);
        /* cancelled/hallucinatory feedback; monster might look "confused",
           "stunned",&c but we don't actually set corresponding attribute */
        C.pline_mon(mtmp, "%s looks %s%s.", C.Monnam(mtmp),
              !C.rn2(() => (3), 51) ? "" : already ? "quite "
                                     : (!C.rn2(() => (2), 52) ? "a bit " : "somewhat "),
              reactions[react]);
    }
    return C.M_ATTK_MISS;
}

/* mtmp hits you for n points damage */
export function mdamageu(mtmp, n)
{
    n = C.int(n);
    if (n < 0) {
        C.impossible("mdamageu for negative damage? (%d)", n);
        n = 0;
    }

    C.disp.botl = 1;
    if (C.Upolyd) {
        C.u.mh -= n;
        C.showdamage(n);
        /* caller might have reduced mhmax before calling mdamageu() */
        if (C.u.mh > C.u.mhmax)
            C.u.mh = C.u.mhmax;
        if (C.u.mh < 1)
            C.rehumanize();
    } else {
        C.u.uhp -= n;
        C.showdamage(n);
        /* caller might have reduced uhpmax before calling mdamageu() */
        if (C.u.uhp > C.u.uhpmax)
            C.u.uhp = C.u.uhpmax;
        if (C.u.uhp < 1)
            C.done_in_by(mtmp, C.DIED);
    }
}

/* returns 0 if seduction impossible,
 *         1 if fine,
 *         2 if wrong gender for nymph
 */
export function could_seduce(magr, mdef, mattk) /* non-Null: current atk; Null: genrl capability */
{
    let pagr;
    let agrinvis, defperc;
    let genagr, gendef;
    let adtyp;

    if (C.is_animal(magr.data))
        return 0;
    if (magr == C.gy.youmonst) {
        pagr = C.gy.youmonst.data;
        agrinvis = (C.Invis != 0);
        genagr = C.poly_gender();
    } else {
        pagr = magr.data;
        agrinvis = magr.minvis;
        genagr = C.gender(magr);
    }
    if (mdef == C.gy.youmonst) {
        defperc = (C.See_invisible != 0);
        gendef = C.poly_gender();
    } else {
        defperc = C.perceives(mdef.data);
        gendef = C.gender(mdef);
    }

    adtyp = mattk ? mattk.adtyp
            : C.dmgtype(pagr, C.AD_SSEX) ? C.AD_SSEX
              : C.dmgtype(pagr, C.AD_SEDU) ? C.AD_SEDU
                : C.AD_PHYS;
    if (adtyp == C.AD_SSEX && !C.SYSOPT_SEDUCE)
        adtyp = C.AD_SEDU;

    if (agrinvis && !defperc && adtyp == C.AD_SEDU)
        return 0;

    /* nymphs have two attacks, one for steal-item damage and the other
       for seduction, both pass the could_seduce() test;
       incubi/succubi have three attacks, their claw attacks for damage
       don't pass the test */
    if ((pagr.mlet != C.S_NYMPH && pagr != C.mons[C.PM_AMOROUS_DEMON])
        || (adtyp != C.AD_SEDU && adtyp != C.AD_SSEX && adtyp != C.AD_SITM))
        return 0;

    return (genagr == 1 - gendef) ? 1 : (pagr.mlet == C.S_NYMPH) ? 2 : 0;
}

/* returns 1 if monster teleported (or hero leaves monster's vicinity) */
export function doseduce(mon)
{
    let ring, nring;
    let fem = (Number(Boolean(mon.data == C.mons[C.PM_AMOROUS_DEMON]
                   && C.Mgender(mon) == C.FEMALE))); /* otherwise incubus */
    let seewho, naked; /* True iff no armor */
    let attr_tot, tried_gloves = 0;
    const qbuf = C.stackAlloc(C.QBUFSZ), Who = C.stackAlloc(C.QBUFSZ);

    if (mon.mcan || mon.mspec_used) {
        C.pline_mon(mon, "%s acts as though %s has got a %sheadache.",
                  C.Monnam(mon), C.mhe(mon), mon.mcan ? "severe " : "");
        return 0;
    }
    if (C.unresponsive()) {
        C.pline_mon(mon, "%s seems dismayed at your lack of response.",
                  C.Monnam(mon));
        return 0;
    }
    seewho = C.canseemon(mon);
    if (!seewho)
        C.pline("Someone caresses you...");
    else
        C.You_feel("very attracted to %s.", C.mon_nam(mon));
    /* cache the seducer's name in a local buffer */
    C.Strcpy(Who, (!seewho ? (fem ? "She" : "He") : C.Monnam(mon)));

    /* if in the process of putting armor on or taking armor off,
       interrupt that activity now */
    C.stop_donning(0);
    /* don't try to take off gloves if cursed weapon blocks them */
    if (C.welded(C.uwep))
        tried_gloves = 1;

    for (ring = C.gi.invent; ring; ring = nring) {
        nring = ring.nobj;
        if (ring.otyp != C.RIN_ADORNMENT)
            continue;
        if (fem) {
            if (ring.owornmask && C.uarmg) {
                /* don't take off worn ring if gloves are in the way */
                if (!tried_gloves++)
                    C.callLocal(mayberem, mon, Who, C.uarmg, "gloves");
                if (C.uarmg)
                    continue; /* next ring might not be worn */
            }
            /* confirmation prompt when charisma is high bypassed if deaf */
            if (!C.Deaf && C.rn2(() => (20), 53) < C.ACURR(C.A_CHA)) {
                C.safe_qbuf(qbuf, "\"That ",
                                 " looks pretty.  May I have it?\"", ring,
                                 C.xname, C.simpleonames, "ring");
                C.makeknown(C.RIN_ADORNMENT);
                C.SetVoice(mon, 0, 80, 0);
                if (C.y_n(qbuf) == 110)
                    continue;
            } else
                C.pline("%s decides she'd like %s, and takes it.",
                      Who, C.yname(ring));
            C.makeknown(C.RIN_ADORNMENT);
            /* might be in left or right ring slot or weapon/alt-wep/quiver */
            if (ring.owornmask)
                C.remove_worn_item(ring, 0);
            C.freeinv(ring);
            C.mpickobj(mon, ring);
        } else {
            if (C.uleft && C.uright && C.uleft.otyp == C.RIN_ADORNMENT
                && C.uright.otyp == C.RIN_ADORNMENT)
                break;
            if (ring == C.uleft || ring == C.uright)
                continue;
            if (C.uarmg) {
                /* don't put on ring if gloves are in the way */
                if (!tried_gloves++)
                    C.callLocal(mayberem, mon, Who, C.uarmg, "gloves");
                if (C.uarmg)
                    break; /* no point trying further rings */
            }
            /* confirmation prompt when charisma is high bypassed if deaf */
            if (!C.Deaf && C.rn2(() => (20), 54) < C.ACURR(C.A_CHA)) {
                C.safe_qbuf(qbuf, "\"That ",
                                " looks pretty.  Would you wear it for me?\"",
                                 ring, C.xname, C.simpleonames, "ring");
                C.makeknown(C.RIN_ADORNMENT);
                C.SetVoice(mon, 0, 80, 0);
                if (C.y_n(qbuf) == 110)
                    continue;
            } else {
                C.pline("%s decides you'd look prettier wearing %s,",
                      Who, C.yname(ring));
                C.pline("and puts it on your finger.");
            }
            C.makeknown(C.RIN_ADORNMENT);
            if (!C.uright) {
                C.pline("%s puts %s on your right %s.",
                      Who, C.the(C.xname(ring)), C.body_part(C.HAND));
                C.setworn(ring, C.RIGHT_RING);
            } else if (!C.uleft) {
                C.pline("%s puts %s on your left %s.",
                      Who, C.the(C.xname(ring)), C.body_part(C.HAND));
                C.setworn(ring, C.LEFT_RING);
            } else if (C.uright && C.uright.otyp != C.RIN_ADORNMENT) {
                /* note: the "replaces" message might be inaccurate if
                   hero's location changes and the process gets interrupted,
                   but trying to figure that out in advance in order to use
                   alternate wording is not worth the effort */
                C.pline("%s replaces %s with %s.",
                      Who, C.yname(C.uright), C.yname(ring));
                C.Ring_gone(C.uright);
                /* ring removal might cause loss of levitation which could
                   drop hero onto trap that transports hero somewhere else */
                if (C.u.utotype || !C.m_next2u(mon))
                    return 1;
                C.setworn(ring, C.RIGHT_RING);
            } else if (C.uleft && C.uleft.otyp != C.RIN_ADORNMENT) {
                /* see "replaces" note above */
                C.pline("%s replaces %s with %s.",
                      Who, C.yname(C.uleft), C.yname(ring));
                C.Ring_gone(C.uleft);
                if (C.u.utotype || !C.m_next2u(mon))
                    return 1;
                C.setworn(ring, C.LEFT_RING);
            } else
                C.impossible("ring replacement");
            C.Ring_on(ring);
            C.prinv(0, ring, 0n);
        }
    }

    naked = (Number(Boolean(!C.uarmc && !C.uarmf && !C.uarmg && !C.uarms && !C.uarmh && !C.uarmu)));
    C.urgent_pline("%s %s%s.", Who,
                 C.Deaf ? "seems to murmur into your ear"
                 : naked ? "murmurs sweet nothings into your ear"
                   : "murmurs in your ear",
                 naked ? "" : ", while helping you undress");
    C.callLocal(mayberem, mon, Who, C.uarmc, C.cloak_simple_name(C.uarmc));
    if (!C.uarmc)
        C.callLocal(mayberem, mon, Who, C.uarm, C.suit_simple_name(C.uarm));
    C.callLocal(mayberem, mon, Who, C.uarmf, "boots");
    if (!tried_gloves)
        C.callLocal(mayberem, mon, Who, C.uarmg, "gloves");
    C.callLocal(mayberem, mon, Who, C.uarms, "shield");
    C.callLocal(mayberem, mon, Who, C.uarmh, C.helm_simple_name(C.uarmh));
    if (!C.uarmc && !C.uarm)
        C.callLocal(mayberem, mon, Who, C.uarmu, "shirt");

    /* removing armor (levitation boots, or levitation ring to make
       room for adornment ring with incubus case) might result in the
       hero falling through a trap door or landing on a teleport trap
       and changing location, so hero might not be adjacent to seducer
       any more (mayberem() has its own adjacency test so we don't need
       to check after each potential removal) */
    if (C.u.utotype || !C.m_next2u(mon))
        return 1;

    if (C.uarm || C.uarmc) {
        if (!C.Deaf) {
            if (!(C.ld() && mon.female)) {
                C.SetVoice(mon, 0, 80, 0);
                C.verbalize("You're such a %s; I wish...",
                          C.flags.female ? "sweet lady" : "nice guy");
            } else {
                let yourgloves = C.u_carried_gloves();

                /* have her call your gloves by their correct
                   name, possibly revealing them to you */
                if (yourgloves)
                    C.observe_object(yourgloves);
                C.verbalize("Well, then you owe me %s%s!",
                          yourgloves ? C.yname(yourgloves)
                                     : "twelve pairs of gloves",
                          yourgloves ? " and eleven more pairs of gloves"
                                     : "");
            }
        } else if (seewho)
            C.pline_mon(mon, "%s appears to sigh.", C.Monnam(mon));
        /* else no regret message if can't see or hear seducer */

        if (!C.tele_restrict(mon))
            C.rloc(mon, C.RLOC_MSG);
        return 1;
    }
    if (C.u.ualign.type == C.A_CHAOTIC)
        C.adjalign(1);

    /* by this point you have discovered mon's identity, blind or not... */
    C.urgent_pline(
             "Time stands still while you and %s lie in each other's arms...",
                 C.noit_mon_nam(mon));
    /* 3.6.1: a combined total for charisma plus intelligence of 35-1
       used to guarantee successful outcome; now total maxes out at 32
       as far as deciding what will happen; chance for bad outcome when
       Cha+Int is 32 or more is 2/35, a bit over 5.7% */
    attr_tot = C.ACURR(C.A_CHA) + C.ACURR(C.A_INT);
    if (C.rn2(() => (35), 55) > C.min(attr_tot, 32)) {
        /* Don't bother with mspec_used here... it didn't get tired! */
        C.pline("%s seems to have enjoyed it more than you...",
              C.noit_Monnam(mon));
        switch (C.rn2(() => (5), 56)) {
        case 0:
            C.You_feel("drained of energy.");
            C.u.uen = 0;
            C.u.uenmax -= C.rnd(() => (C.Half_physical_damage ? 5 : 10), 57);
            C.exercise(C.A_CON, 0);
            if (C.u.uenmax < 0)
                C.u.uenmax = 0;
            break;
        case 1:
            C.You("are down in the dumps.");
            C.adjattrib(C.A_CON, -1, 1);
            C.exercise(C.A_CON, 0);
            C.disp.botl = 1;
            break;
        case 2:
            C.Your("senses are dulled.");
            C.adjattrib(C.A_WIS, -1, 1);
            C.exercise(C.A_WIS, 0);
            C.disp.botl = 1;
            break;
        case 3:
            if (!C.resists_drli(C.gy.youmonst)) {
                C.You_feel("out of shape.");
                C.losexp("overexertion");
            } else {
                C.You("have a curious feeling...");
            }
            C.exercise(C.A_CON, 0);
            C.exercise(C.A_DEX, 0);
            C.exercise(C.A_WIS, 0);
            break;
        case 4: {
            let tmp;

            C.You_feel("exhausted.");
            C.exercise(C.A_STR, 0);
            tmp = C.rn1(() => (10), () => ( 6), 58);
            C.losehp(C.Maybe_Half_Phys(tmp), "exhaustion", C.KILLED_BY);
            break;
        } /* case 4 */
        } /* switch */
    } else {
        mon.mspec_used = C.rnd(() => (100), 59); /* monster is worn out */
        C.You("seem to have enjoyed it more than %s...", C.noit_mon_nam(mon));
        switch (C.rn2(() => (5), 60)) {
        case 0:
            C.You_feel("raised to your full potential.");
            C.exercise(C.A_CON, 1);
            C.u.uen = (C.u.uenmax += C.rnd(() => (5), 61));
            if (C.u.uenmax > C.u.uenpeak)
                C.u.uenpeak = C.u.uenmax;
            break;
        case 1:
            C.You_feel("good enough to do it again.");
            C.adjattrib(C.A_CON, 1, 1);
            C.exercise(C.A_CON, 1);
            C.disp.botl = 1;
            break;
        case 2:
            C.You("will always remember %s...", C.noit_mon_nam(mon));
            C.adjattrib(C.A_WIS, 1, 1);
            C.exercise(C.A_WIS, 1);
            C.disp.botl = 1;
            break;
        case 3:
            C.pline("That was a very educational experience.");
            C.pluslvl(0);
            C.exercise(C.A_WIS, 1);
            break;
        case 4:
            C.You_feel("restored to health!");
            C.u.uhp = C.u.uhpmax;
            if (C.Upolyd)
                C.u.mh = C.u.mhmax;
            C.exercise(C.A_STR, 1);
            C.disp.botl = 1;
            break;
        }
    }

    if (mon.mtame) { /* don't charge */
        ;
    } else if (C.rn2(() => (20), 62) < C.ACURR(C.A_CHA)) {
        C.pline("%s demands that you pay %s, but you refuse...",
              C.noit_Monnam(mon), C.noit_mhim(mon));
    } else if (C.u.umonnum == C.PM_LEPRECHAUN) {
        C.pline_mon(mon, "%s tries to take your gold, but fails...",
                  C.noit_Monnam(mon));
    } else {
        let cost;
        let umoney = C.money_cnt(C.gi.invent);

        if (umoney > C.long(C.LARGEST_INT) - 10n)
            cost = C.long(C.rnd(() => (C.LARGEST_INT), 63)) + 500n;
        else
            cost = C.long(C.rnd(() => (C.int(umoney) + 10), 64)) + 500n;
        if (mon.mpeaceful) {
            cost /= 5n;
            if (!cost)
                cost = 1n;
        }
        if (cost > umoney)
            cost = umoney;
        if (!cost) {
            if (!C.Deaf) {
                C.SetVoice(mon, 0, 80, 0);
                C.verbalize("It's on the house!");
            } else {
                C.pline("No charge.");
            }
        } else {
            C.pline_mon(mon, "%s takes %ld %s for services rendered!",
                      C.noit_Monnam(mon), cost, C.currency(cost));
            C.money2mon(mon, cost);
            C.disp.botl = 1;
        }
    }
    if (!C.rn2(() => (25), 65))
        mon.mcan = 1; /* monster is worn out */
    if (!C.tele_restrict(mon))
        C.rloc(mon, C.RLOC_MSG);
    return 1;
}

/* 'mon' tries to remove a piece of hero's armor */
export function mayberem(mon, seducer, obj, str) /* only used for alternate message */
{
    seducer = C.charPointer(seducer);str = C.charPointer(str);
    const qbuf = C.stackAlloc(C.QBUFSZ);

    if (!obj || !obj.owornmask)
        return;
    /* removal of a previous item might have sent the hero elsewhere
       (loss of levitation that leads to landing on a transport trap) */
    if (C.u.utotype || !C.m_next2u(mon))
        return;

    /* being deaf overrides confirmation prompt for high charisma */
    if (C.Deaf) {
        C.pline("%s takes off your %s.", seducer, str);
    } else if (C.rn2(() => (20), 66) < C.ACURR(C.A_CHA)) {
        C.SetVoice(mon, 0, 80, 0); /* y_n aka yn_function is set up for this */
        C.Sprintf(qbuf, "\"Shall I remove your %s, %s?\"", str,
                (!C.rn2(() => (2), 67) ? "lover" : !C.rn2(() => (2), 68) ? "dear" : "sweetheart"));
        if (C.y_n(qbuf) == 110)
            return;
    } else {
        const hairbuf = C.stackAlloc(C.BUFSZ);

        C.Sprintf(hairbuf, "let me run my fingers through your %s",
                C.body_part(C.HAIR));
        C.SetVoice(mon, 0, 80, 0);
        C.verbalize("Take off your %s; %s.", str,
                  (obj == C.uarm)
                     ? "let's get a little closer"
                     : (obj == C.uarmc || obj == C.uarms)
                        ? "it's in the way"
                        : (obj == C.uarmf)
                           ? "let me rub your feet"
                           : (obj == C.uarmg)
                              ? "they're too clumsy"
                              : (obj == C.uarmu)
                                 ? "let me massage you"
                                 /* obj == uarmh */
                                 : hairbuf);
    }
    C.remove_worn_item(obj, 1);
}

export function assess_dmg(mtmp, tmp)
{
    tmp = C.int(tmp);
    if ((mtmp.mhp -= tmp) <= 0) {
        C.pline_mon(mtmp, "%s dies!", C.Monnam(mtmp));
        C.xkilled(mtmp, C.XKILL_NOMSG);
        if (!C.DEADMONSTER(mtmp))
            return C.M_ATTK_HIT;
        return C.M_ATTK_AGR_DIED;
    }
    return C.M_ATTK_HIT;
}

// Original #if 0 block remains inactive.


/* can be used as ranged_attk_assessed() callback.
   Returns TRUE if monster is avoiding use of this attack */
export function mon_avoiding_this_attack(mtmp, attkidx)
{
    attkidx = C.int(attkidx);
    let ptr = mtmp.data;
    let typ = -1;

    if (attkidx >= 0
        && (typ = C.get_atkdam_type(ptr.mattk[attkidx].adtyp)) >= 0
        && C.m_seenres(mtmp, C.cvt_adtyp_to_mseenres(typ)))
        return 1;
    return 0;
}

/*
 * This would be equivalent to:
 *     ranged_attk_assessed(mtmp, mon_avoiding_this_attack)
 * but without the added assessment function call overhead.
 */
export function ranged_attk_available(mtmp)
{
    let i, typ = -1;
    let ptr = mtmp.data;

    for (i = 0; i < C.NATTK; i++) {
        if (C.DISTANCE_ATTK_TYPE(ptr.mattk[i].aatyp)
            && (typ = C.get_atkdam_type(ptr.mattk[i].adtyp)) >= 0
                && C.m_seenres(mtmp, C.cvt_adtyp_to_mseenres(typ)) == 0)
                return 1;
    }
    return 0;
}

/* FIXME:
 *  sequencing issue:  a monster's attack might cause poly'd hero
 *  to revert to normal form.  The messages for passive counterattack
 *  would look better if they came before reverting form, but we need
 *  to know whether hero reverted in order to decide whether passive
 *  damage applies.
 */
export function passiveum(olduasmon, mtmp, mattk)
{
    let i, tmp;
    let oldu_mattk = 0;

    /*
     * mattk      == mtmp's attack that hit you;
     * oldu_mattk == your passive counterattack (even if mtmp's attack
     *               has already caused you to revert to normal form).
     */
    for (i = 0; !oldu_mattk; i++) {
        if (i >= C.NATTK)
            return C.M_ATTK_HIT;
        if (olduasmon.mattk[i].aatyp == C.AT_NONE
            || olduasmon.mattk[i].aatyp == C.AT_BOOM)
            oldu_mattk = olduasmon.mattk[i];
    }
    if (oldu_mattk.damn)
        tmp = C.d(() => (C.int(oldu_mattk.damn)), () => ( C.int(oldu_mattk.damd)), 69);
    else if (oldu_mattk.damd)
        tmp = C.d(() => (C.int(olduasmon.mlevel) + 1), () => ( C.int(oldu_mattk.damd)), 70);
    else
        tmp = 0;

    /* These affect the enemy even if you were "killed" (rehumanized) */
    switch (oldu_mattk.adtyp) {
    case C.AD_ACID:
        if (!C.rn2(() => (2), 71)) {
            C.pline_mon(mtmp, "%s is splashed by %s%s!", C.Monnam(mtmp),
                  /* temporary? hack for sequencing issue:  "your acid"
                     looks strange coming immediately after player has
                     been told that hero has reverted to normal form */
                  !C.Upolyd ? "" : "your ", C.hliquid("acid"));
            if (C.resists_acid(mtmp)) {
                C.pline_mon(mtmp, "%s is not affected.", C.Monnam(mtmp));
                tmp = 0;
            }
        } else
            tmp = 0;
        if (!C.rn2(() => (30), 72))
            C.erode_armor(mtmp, C.ERODE_CORRODE);
        if (!C.rn2(() => (6), 73))
            C.acid_damage(C.MON_WEP(mtmp));
        return C.callLocal(assess_dmg, mtmp, tmp);
    case C.AD_STON: /* cockatrice */
    {
        let protector = C.attk_protection(C.int(mattk.aatyp)),
             wornitems = mtmp.misc_worn_check;

        /* wielded weapon gives same protection as gloves here */
        if (C.MON_WEP(mtmp) != 0)
            wornitems |= C.W_ARMG;

        if (!C.resists_ston(mtmp)
            && (protector == 0n
                || (protector != ~0n
                    && (wornitems & protector) != protector))) {
            if (C.poly_when_stoned(mtmp.data)) {
                C.mon_to_stone(mtmp);
                return 1;
            }
            C.pline_mon(mtmp, "%s turns to stone!", C.Monnam(mtmp));
            C.gs.stoned = 1;
            C.xkilled(mtmp, C.XKILL_NOMSG);
            if (!C.DEADMONSTER(mtmp))
                return C.M_ATTK_HIT;
            return C.M_ATTK_AGR_DIED;
        }
        return C.M_ATTK_HIT;
    }
    case C.AD_ENCH: /* KMH -- remove enchantment (disenchanter) */
        if (C.mon_currwep) {
            /* by_you==True: passive counterattack to hero's action
               is hero's fault */
            C.drain_item(C.mon_currwep, 1);
            /* No message */
        }
        return C.M_ATTK_HIT;
    default:
        break;
    }
    if (!C.Upolyd)
        return C.M_ATTK_HIT;

    /* These affect the enemy only if you are still a monster */
    if (C.rn2(() => (3), 74))
        switch (oldu_mattk.adtyp) {
        case C.AD_PHYS:
            if (oldu_mattk.aatyp == C.AT_BOOM) {
                C.You("explode!");
                /* KMH, balance patch -- this is okay with unchanging */
                C.rehumanize();
                return C.callLocal(assess_dmg, mtmp, tmp);
            }
            break;
        case C.AD_PLYS: /* Floating eye */
            if (tmp > 127)
                tmp = 127;
            if (C.u.umonnum == C.PM_FLOATING_EYE) {
                if (!C.rn2(() => (4), 75))
                    tmp = 127;
                if (mtmp.mcansee && C.haseyes(mtmp.data) && C.rn2(() => (3), 76)
                    && (C.perceives(mtmp.data) || !C.Invis)) {
                    if (C.Blind) {
                        C.pline("As a blind %s, you cannot defend yourself.",
                              C.pmname(C.gy.youmonst.data,
                                     C.flags.female ? C.FEMALE : C.MALE));
                    } else {
                        if (C.mon_reflects(mtmp,
                                         "Your gaze is reflected by %s %s."))
                            return 1;
                        C.pline_mon(mtmp, "%s is frozen by your gaze!",
                                  C.Monnam(mtmp));
                        C.paralyze_monst(mtmp, tmp);
                        return C.M_ATTK_AGR_DONE;
                    }
                }
            } else { /* gelatinous cube */
                C.pline_mon(mtmp, "%s is frozen by you.", C.Monnam(mtmp));
                C.paralyze_monst(mtmp, tmp);
                return C.M_ATTK_AGR_DONE;
            }
            return C.M_ATTK_HIT;
        case C.AD_COLD: /* Brown mold or blue jelly */
            if (C.resists_cold(mtmp)) {
                C.shieldeff(mtmp.mx, mtmp.my);
                C.pline_mon(mtmp, "%s is mildly chilly.", C.Monnam(mtmp));
                C.golemeffects(mtmp, C.AD_COLD, tmp);
                tmp = 0;
                break;
            }
            C.pline_mon(mtmp, "%s is suddenly very cold!", C.Monnam(mtmp));
            C.u.mh += Math.trunc((tmp + C.rn2(() => (2), 77)) / 2);
            if (C.u.mhmax < C.u.mh)
                C.u.mhmax = C.u.mh;
            if (C.u.mhmax > ((C.int(C.gy.youmonst.data.mlevel) + 1) * 8))
                C.split_mon(C.gy.youmonst, mtmp);
            break;
        case C.AD_STUN: /* Yellow mold */
            if (!mtmp.mstun) {
                mtmp.mstun = 1;
                C.pline_mon(mtmp, "%s %s.", C.Monnam(mtmp),
                      C.makeplural(C.stagger(mtmp.data, "stagger")));
            }
            tmp = 0;
            break;
        case C.AD_FIRE: /* Red mold */
            if (C.resists_fire(mtmp)) {
                C.shieldeff(mtmp.mx, mtmp.my);
                C.pline_mon(mtmp, "%s is mildly warm.", C.Monnam(mtmp));
                C.golemeffects(mtmp, C.AD_FIRE, tmp);
                tmp = 0;
                break;
            }
            C.pline_mon(mtmp, "%s is suddenly very hot!", C.Monnam(mtmp));
            break;
        case C.AD_ELEC:
            if (C.resists_elec(mtmp)) {
                C.shieldeff(mtmp.mx, mtmp.my);
                C.pline_mon(mtmp, "%s is slightly tingled.", C.Monnam(mtmp));
                C.golemeffects(mtmp, C.AD_ELEC, tmp);
                tmp = 0;
                break;
            }
            C.pline_mon(mtmp, "%s is jolted with your electricity!",
                      C.Monnam(mtmp));
            break;
        default:
            tmp = 0;
            break;
        }
    else
        tmp = 0;

    return C.callLocal(assess_dmg, mtmp, tmp);
}

export function cloneu()
{
    let mon;
    let mndx = C.monsndx(C.gy.youmonst.data);

    if (C.u.mh <= 1)
        return 0;
    if (C.svm.mvitals[mndx].mvflags & C.G_EXTINCT)
        return 0;
    mon = C.makemon(C.gy.youmonst.data, C.u.ux, C.u.uy,
                  C.NO_MINVENT | C.MM_EDOG | C.MM_NOMSG);
    if (!mon)
        return 0;
    mon.mcloned = 1;
    mon = C.christen_monst(mon, C.svp.plname);
    C.initedog(mon, 1);
    mon.m_lev = C.gy.youmonst.data.mlevel;
    mon.mhpmax = C.u.mhmax;
    mon.mhp = Math.trunc(C.u.mh / 2);
    C.u.mh -= mon.mhp;
    C.disp.botl = 1;
    return mon;
}


/*mhitu.c*/

/* work in progress */

/* "tired" */

/* can't happen... */

/* "dulled" */

/* BEHOLDER */

/* returns True if monster has a range attack in its repertoire
   that it will actually utilize. Caller provides the assessment
   callback (optional). Callback returns 0 if the attack is
   active */
