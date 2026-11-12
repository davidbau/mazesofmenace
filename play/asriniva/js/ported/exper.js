/* NetHack 5.0	exper.c	$NHDT-Date: 1706133782 2024/01/24 22:03:02 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.62 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Robert Patrick Rankin, 2007. */
/* NetHack may be freely redistributed.  See license for details. */

import { C } from '../c-runtime/context.js';

/* JavaScript translation of exper.c. The nine original function boundaries
 * and control paths remain. Long arithmetic uses signed64 BigInt casts;
 * rexpincr first evaluates as a C int before conversion to long. Integer
 * divisions truncate, and the local char throttle narrows before max().
 * ABI views preserve stored field widths and live callback effects. RNG
 * annotations retain Clang's source caller locations. SoundAchievement is
 * already an empty macro in this game build. The assertion's native adapter
 * retains its original expression, losexp function, and source line 247.
 */
// #ifndef LONG_MAX
// #include <limits.h>
// #endif

// staticfn int enermod(int);

export function newuexp(lev)
{
    if (lev < 1) /* for newuexp(u.ulevel - 1) when u.ulevel is 1 */
        return 0n;
    if (lev < 10)
        return (C.long(10n * (1n << BigInt(lev))));
    if (lev < 20)
        return (C.long(10000n * (1n << BigInt(lev - 10))));
    return (C.long(10000000n * C.long(lev - 19)));
}

export function enermod(en)
{
    switch (C.Role_switch) {
    case C.PM_CLERIC:
    case C.PM_WIZARD:
        return (C.int(2 * en));
    case C.PM_HEALER:
    case C.PM_KNIGHT:
        return (C.int(Math.trunc(C.int(3 * en) / 2)));
    case C.PM_BARBARIAN:
    case C.PM_VALKYRIE:
        return (C.int(Math.trunc(C.int(3 * en) / 4)));
    default:
        return en;
    }
}

/* calculate spell power/energy points for new level */
export function newpw()
{
    let en = 0, enrnd, enfix;

    if (C.u.ulevel == 0) {
        en = C.gu.urole.enadv.infix + C.gu.urace.enadv.infix;
        if (C.gu.urole.enadv.inrnd > 0)
            en = C.int(en + (C.rnd(C.gu.urole.enadv.inrnd, 52, 'newpw')));
        if (C.gu.urace.enadv.inrnd > 0)
            en = C.int(en + (C.rnd(C.gu.urace.enadv.inrnd, 54, 'newpw')));
    } else {
        enrnd = Math.trunc(C.int(C.ACURR(C.A_WIS)) / 2);
        if (C.u.ulevel < C.gu.urole.xlev) {
            enrnd = C.int(enrnd + (C.gu.urole.enadv.lornd + C.gu.urace.enadv.lornd));
            enfix = C.gu.urole.enadv.lofix + C.gu.urace.enadv.lofix;
        } else {
            enrnd = C.int(enrnd + (C.gu.urole.enadv.hirnd + C.gu.urace.enadv.hirnd));
            enfix = C.gu.urole.enadv.hifix + C.gu.urace.enadv.hifix;
        }
        en = enermod(C.rn1(enrnd, enfix, 64, 'newpw'));
    }
    if (en <= 0)
        en = 1;
    if (C.u.ulevel < C.MAXULEV) {
        /* remember increment; future level drain could take it away again */
        C.u.ueninc[C.u.ulevel] = C.xint16(en);
    } else {
        /* after level 30, throttle energy gains from extra experience;
           once max reaches 600, further increments will be just 1 more */
        let lim = C.char(4 - Math.trunc(C.u.uenmax / 200));

        lim = C.char(Math.max(lim, 1));
        if (en > lim)
            en = lim;
    }
    return en;
}

/* return # of exp points for mtmp after nk killed */
export function experience(mtmp, nk)
{
    let ptr = mtmp.data;
    let i, tmp, tmp2;

    tmp = 1 + mtmp.m_lev * mtmp.m_lev;

    /*  For higher ac values, give extra experience */
    if ((i = C.find_mac(mtmp)) < 3)
        tmp = C.int(tmp + ((7 - i) * ((i < 0) ? 2 : 1)));

    /*  For very fast monsters, give extra experience */
    if (ptr.mmove > C.NORMAL_SPEED)
        tmp = C.int(tmp + ((ptr.mmove > Math.trunc(3 * C.NORMAL_SPEED / 2)) ? 5 : 3));

    /*  For each "special" attack type give extra experience */
    for (i = 0; i < C.NATTK; i++) {
        tmp2 = ptr.mattk[i].aatyp;
        if (tmp2 > C.AT_BUTT) {
            if (tmp2 == C.AT_WEAP)
                tmp = C.int(tmp + (5));
            else if (tmp2 == C.AT_MAGC)
                tmp = C.int(tmp + (10));
            else
                tmp = C.int(tmp + (3));
        }
    }

    /*  For each "special" damage type give extra experience */
    for (i = 0; i < C.NATTK; i++) {
        tmp2 = ptr.mattk[i].adtyp;
        if (tmp2 > C.AD_PHYS && tmp2 < C.AD_BLND)
            tmp = C.int(tmp + (2 * mtmp.m_lev));
        else if ((tmp2 == C.AD_DRLI) || (tmp2 == C.AD_STON) || (tmp2 == C.AD_SLIM))
            tmp = C.int(tmp + (50));
        else if (tmp2 != C.AD_PHYS)
            tmp = C.int(tmp + (mtmp.m_lev));
        /* extra heavy damage bonus */
        if ((ptr.mattk[i].damd * ptr.mattk[i].damn) > 23)
            tmp = C.int(tmp + (mtmp.m_lev));
        if (tmp2 == C.AD_WRAP && ptr.mlet == C.S_EEL && !C.Amphibious)
            tmp = C.int(tmp + (1000));
    }

    /*  For certain "extra nasty" monsters, give even more */
    if (C.extra_nasty(ptr))
        tmp = C.int(tmp + ((7 * mtmp.m_lev)));

    /*  For higher level monsters, an additional bonus is given */
    if (mtmp.m_lev > 8)
        tmp = C.int(tmp + (50));

// #ifdef MAIL_STRUCTURES
    if (C.MAIL_STRUCTURES) {
    /* Mail daemons put up no fight. */
    if (mtmp.data.address == C.mons[C.PM_MAIL_DAEMON].address)
        tmp = 1;
    }
// #endif

    if (mtmp.mrevived || mtmp.mcloned) {
        /*
         *      Reduce experience awarded for repeated killings of
         *      "the same monster".  Kill count includes all of this
         *      monster's type which have been killed--including the
         *      current monster--regardless of how they were created.
         *        1.. 20        full experience
         *       21.. 40        xp / 2
         *       41.. 80        xp / 4
         *       81..120        xp / 8
         *      121..180        xp / 16
         *      181..240        xp / 32
         *      241..255+       xp / 64
         */
        for (i = 0, tmp2 = 20; nk > tmp2 && tmp > 1; ++i) {
            tmp = Math.trunc(C.int(tmp + 1) / 2);
            nk = C.int(nk - (tmp2));
            if (i & 1)
                tmp2 = C.int(tmp2 + (20));
        }
    }

    return (tmp);
}

export function more_experienced(exper, rexp)
{
    let oldexp = C.u.uexp,
         oldrexp = C.u.urexp,
         newexp = C.long(oldexp + BigInt(exper)),
         rexpincr = C.long(C.int(4 * exper + rexp)),
         newrexp = C.long(oldrexp + rexpincr);

    /* cap experience and score on wraparound */
    if (newexp < 0n && exper > 0)
        newexp = C.LONG_MAX;
    if (newrexp < 0n && rexpincr > 0n)
        newrexp = C.LONG_MAX;

    if (newexp != oldexp) {
        C.u.uexp = newexp;
        if (C.flags.showexp)
            C.disp.botl = 1;
        /* even when experience points aren't being shown, experience level
           might be highlighted with a percentage highlight rule and that
           percentage depends upon experience points */
        if (!C.disp.botl && C.exp_percent_changing())
            C.disp.botl = 1;
    }
    /* newrexp will always differ from oldrexp unless they're LONG_MAX */
    if (newrexp != oldrexp) {
        C.u.urexp = newrexp;
// #ifdef SCORE_ON_BOTL
        if (C.SCORE_ON_BOTL) {
        if (C.flags.showscore)
            C.disp.botl = 1;
    }
// #endif
    }
    if (C.u.urexp >= (C.Role_if(C.PM_WIZARD) ? 1000n : 2000n))
        C.flags.beginner = 0;
}

/* e.g., hit by drain life attack */
export function losexp(
    drainer) /* cause of death, if drain should be fatal */
{
    let num, uhpmin, olduhpmax;

    /* override life-drain resistance when handling an explicit
       wizard mode request to reduce level; never fatal though */
    if (drainer && !C.strcmp(drainer, "#levelchange"))
        drainer = 0;
    else if (C.resists_drli(C.gy.youmonst))
        return;

    /* level-loss message; "Goodbye level 1." is fatal; divine anger
       (drainer==NULL) resets a level 1 character to 0 experience points
       without reducing level and that isn't fatal so suppress the message
       in that situation */
    if (C.u.ulevel > 1 || drainer)
        C.pline("%s level %d.", C.Goodbye(), C.u.ulevel);

    if (C.u.ulevel > 1) {
        C.u.ulevel -= 1;
        /* remove intrinsic abilities */
        C.adjabil(C.u.ulevel + 1, C.u.ulevel);
        C.livelog_printf(C.LL_MINORAC, "lost experience level %d", C.u.ulevel + 1);
        // SoundAchievement(0, sa2_xpleveldown, 0); /* inactive empty C macro */
    } else { /* u.ulevel==1 */
        if (drainer) {
            C.svk.killer.format = C.KILLED_BY;
            if (C.svk.killer.name != drainer)
                C.Strcpy(C.svk.killer.name, drainer);
            C.done(C.DIED);
        }
        /* no drainer or lifesaved */
        if (C.u.ulevel > 1)
            /* can happen during debug fuzzing if fuzzer_savelife() uses
               a blessed potion of restore ability to restore lost levels */
            return;
        C.u.uexp = 0n;
        C.livelog_printf(C.LL_MINORAC, "lost all experience");
    }
    C.assert(C.u.ulevel >= 0 && C.u.ulevel < C.MAXULEV); /* valid array index */

    olduhpmax = C.u.uhpmax;
    uhpmin = C.minuhpmax(10); /* same minimum as is used by life-saving */
    num = C.u.uhpinc[C.u.ulevel];
    C.u.uhpmax -= num;
    if (C.u.uhpmax < uhpmin)
        C.setuhpmax(uhpmin, 1);
    /* uhpmax might try to go up if it has previously been reduced by
       strength loss or by a fire trap or by an attack by Death which
       all use a different minimum than life-saving or experience loss;
       we don't allow it to go up because that contradicts assumptions
       elsewhere (such as healing wielder who drains with Stormbringer) */
    if (C.u.uhpmax > olduhpmax)
        C.setuhpmax(olduhpmax, 1);

    C.u.uhp -= num;
    if (C.u.uhp < 1)
        C.u.uhp = 1;
    else if (C.u.uhp > C.u.uhpmax)
        C.u.uhp = C.u.uhpmax;

    num = C.u.ueninc[C.u.ulevel];
    C.u.uenmax -= num;
    if (C.u.uenmax < 0)
        C.u.uenmax = 0;
    C.u.uen -= num;
    if (C.u.uen < 0)
        C.u.uen = 0;
    else if (C.u.uen > C.u.uenmax)
        C.u.uen = C.u.uenmax;

    if (C.u.uexp > 0n)
        C.u.uexp = C.long(newuexp(C.u.ulevel) - 1n);

    if (C.Upolyd) {
        num = C.monhp_per_lvl(C.gy.youmonst);
        C.u.mhmax -= num;
        C.u.mh -= num;
        if (C.u.mh <= 0)
            C.rehumanize();
    }

    C.disp.botl = 1;
}

/*
 * Make experience gaining similar to AD&D(tm), whereby you can at most go
 * up by one level at a time, extra expr possibly helping you along.
 * After all, how much real experience does one get shooting a wand of death
 * at a dragon created with a wand of polymorph??
 */
export function newexplevel()
{
    if (C.u.ulevel < C.MAXULEV && C.u.uexp >= newuexp(C.u.ulevel))
        pluslvl(1);
}

export function pluslvl(
    incr) /* True: incremental experience growth;
                   * False: potion of gain level or wraith corpse
                   *        or wizard mode #levelchange */
{
    let hpinc, eninc;

    if (!incr)
        C.You_feel("more experienced.");

    /* increase hit points (when polymorphed, do monster form first
       in order to retain normal human/whatever increase for later) */
    if (C.Upolyd) {
        hpinc = C.monhp_per_lvl(C.gy.youmonst);
        C.u.mh += hpinc;
        C.setuhpmax(C.u.mhmax, 0); /* acts as setmhmax() when Upolyd */
    }
    hpinc = C.newhp();
    C.u.uhp += hpinc;
    C.setuhpmax(C.int(C.u.uhpmax + hpinc), 1); /* will lower u.uhp if it exceeds
                                        * u.uhpmax */

    /* increase spell power/energy points */
    eninc = newpw();
    C.u.uenmax += eninc;
    if (C.u.uenmax > C.u.uenpeak)
        C.u.uenpeak = C.u.uenmax;
    C.u.uen += eninc;

    /* increase level (unless already maxxed) */
    if (C.u.ulevel < C.MAXULEV) {
        let old_ach_cnt, newrank, oldrank = C.xlev_to_rank(C.u.ulevel);

        /* increase experience points to reflect new level */
        if (incr) {
            let tmp = newuexp(C.u.ulevel + 1);

            if (C.u.uexp >= tmp)
                C.u.uexp = C.long(tmp - 1n);
        } else {
            C.u.uexp = newuexp(C.u.ulevel);
        }
        ++C.u.ulevel;
        C.pline("Welcome %sto experience level %d.",
              (C.u.ulevelmax < C.u.ulevel) ? "" : "back ",
              C.u.ulevel);
        if (C.u.ulevelmax < C.u.ulevel)
            C.u.ulevelmax = C.u.ulevel;
        C.adjabil(C.u.ulevel - 1, C.u.ulevel); /* give new intrinsics */
        // SoundAchievement(0, sa2_xplevelup, 0); /* inactive empty C macro */
        old_ach_cnt = C.count_achievements();
        newrank = C.xlev_to_rank(C.u.ulevel);
        if (newrank > oldrank)
            C.record_achievement(C.achieve_rank(newrank));
        /* a new rank achievement will log its own message; log a simpler
           message here if we didn't just get an achievement (so when rank
           hasn't changed or hero just regained a lost level and the rank
           achievement doesn't get repeated) */
        if (C.count_achievements() == old_ach_cnt)
            C.livelog_printf(C.LL_MINORAC, "%sgained experience level %d",
                           (C.u.ulevel <= C.u.ulevelpeak) ? "re" : "", C.u.ulevel);
        if (C.u.ulevel > C.u.ulevelpeak)
            C.u.ulevelpeak = C.u.ulevel;
    }
    C.disp.botl = 1;
}

/* compute a random amount of experience points suitable for the hero's
   experience level:  base number of points needed to reach the current
   level plus a random portion of what it takes to get to the next level */
export function rndexp(gaining) /* gaining XP via potion vs setting XP for polyself */
{
    let minexp, maxexp, diff, factor, result;

    minexp = (C.u.ulevel == 1) ? 0n : newuexp(C.u.ulevel - 1);
    maxexp = newuexp(C.u.ulevel);
    diff = C.long(maxexp - minexp), factor = 1n;
    /* make sure that `diff' is an argument which rn2() can handle */
    while (diff >= C.long(C.LARGEST_INT))
        diff = C.long(diff / 2n), factor = C.long(factor * 2n);
    result = C.long(minexp + C.long(factor * C.long(C.rn2(C.int(diff), 388, 'rndexp'))));
    /* 3.4.1:  if already at level 30, add to current experience
       points rather than to threshold needed to reach the current
       level; otherwise blessed potions of gain level can result
       in lowering the experience points instead of raising them */
    if (C.u.ulevel == C.MAXULEV && gaining) {
        result = C.long(result + C.long(C.u.uexp - minexp));
        /* avoid wrapping (over 400 blessed potions needed for that...) */
        if (result < C.u.uexp)
            result = C.u.uexp;
    }
    return result;
}

/*exper.c*/
