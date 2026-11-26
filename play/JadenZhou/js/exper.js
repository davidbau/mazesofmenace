// exper.js — experience levels, and energy gained per level.
// C ref: exper.c
//
// Ported so far: newuexp(), enermod(), newpw(), experience(),
// more_experienced(), newexplevel(), pluslvl() (not for a polymorphed
// hero) and losexp().

import { monhp_per_lvl } from './makemon.js';
import { minuhpmax } from './attrib.js';
import { game } from './gstate.js';
import { livelog_printf, You_feel } from './display.js';
import { LL_MINORAC } from './const.js';
import { count_achievements } from './insight.js';
import { rnd, rn1 } from './rng.js';
import { A_WIS, MAXULEV, NORMAL_SPEED, NATTK, MAGICAL_BREATHING, KILLED_BY,
         DIED } from './const.js';
import { done } from './end.js';
import { killer } from './topten.js';
import { AT_BUTT, AT_WEAP, AT_MAGC, AD_PHYS, AD_BLND, AD_DRLI, AD_STON,
         AD_SLIM, AD_WRAP, S_EEL, M2_NASTY, M1_AMPHIBIOUS } from './monsters.js';
import { find_mac } from './worn.js';
import {
    PM_CLERIC, PM_WIZARD, PM_HEALER, PM_KNIGHT, PM_BARBARIAN, PM_VALKYRIE,
} from './monsters.js';
import { ACURR, adjabil, newhp, setuhpmax } from './attrib.js';
import { xlev_to_rank } from './botl.js';
import { record_achievement, achieve_rank } from './insight.js';
import { pline } from './display.js';
import { Goodbye } from './role.js';
import { resists_drli, extra_nasty } from './mondata.js';
import { Amphibious } from './youprop.js';
import { rehumanize } from './polyself.js';

// C ref: exper.c newuexp()
export function newuexp(lev) {
    if (lev < 1) /* for newuexp(u.ulevel - 1) when u.ulevel is 1 */
        return 0;
    if (lev < 10)
        return (10 * (1 << lev));
    if (lev < 20)
        return (10000 * (1 << (lev - 10)));
    return (10000000 * (lev - 19));
}

// C ref: exper.c enermod()
function enermod(en) {
    switch (game.urole.mnum) { /* Role_switch */
    case PM_CLERIC:
    case PM_WIZARD:
        return (2 * en);
    case PM_HEALER:
    case PM_KNIGHT:
        return Math.trunc((3 * en) / 2);
    case PM_BARBARIAN:
    case PM_VALKYRIE:
        return Math.trunc((3 * en) / 4);
    default:
        return en;
    }
}

// C ref: exper.c newpw()
/* calculate spell power/energy points for new level */
export function newpw() {
    const u = game.u;
    const urole = game.urole, urace = game.urace;
    let en = 0, enrnd, enfix;

    if (u.ulevel === 0) {
        en = urole.enadv.infix + urace.enadv.infix;
        if (urole.enadv.inrnd > 0)
            en += rnd(urole.enadv.inrnd);
        if (urace.enadv.inrnd > 0)
            en += rnd(urace.enadv.inrnd);
    } else {
        enrnd = Math.trunc(ACURR(A_WIS) / 2);
        if (u.ulevel < urole.xlev) {
            enrnd += urole.enadv.lornd + urace.enadv.lornd;
            enfix = urole.enadv.lofix + urace.enadv.lofix;
        } else {
            enrnd += urole.enadv.hirnd + urace.enadv.hirnd;
            enfix = urole.enadv.hifix + urace.enadv.hifix;
        }
        en = enermod(rn1(enrnd, enfix));
    }
    if (en <= 0)
        en = 1;
    if (u.ulevel < MAXULEV) {
        /* remember increment; future level drain could take it away again */
        u.ueninc[u.ulevel] = en;
    } else {
        /* after level 30, throttle energy gains from extra experience;
           once max reaches 600, further increments will be just 1 more */
        let lim = 4 - Math.trunc(u.uenmax / 200);

        lim = Math.max(lim, 1);
        if (en > lim)
            en = lim;
    }
    return en;
}

// C ref: exper.c experience()
export function experience(mtmp, nk) {
    const ptr = mtmp.data;
    let i, tmp, tmp2;

    tmp = 1 + mtmp.m_lev * mtmp.m_lev;

    /*  For higher ac values, give extra experience */
    if ((i = find_mac(mtmp)) < 3)
        tmp += (7 - i) * ((i < 0) ? 2 : 1);

    /*  For very fast monsters, give extra experience */
    if (ptr.mmove > NORMAL_SPEED)
        tmp += (ptr.mmove > Math.trunc(3 * NORMAL_SPEED / 2)) ? 5 : 3;

    /*  For each "special" attack type give extra experience */
    for (i = 0; i < NATTK; i++) {
        tmp2 = ptr.mattk[i].aatyp;
        if (tmp2 > AT_BUTT) {
            if (tmp2 === AT_WEAP)
                tmp += 5;
            else if (tmp2 === AT_MAGC)
                tmp += 10;
            else
                tmp += 3;
        }
    }

    /*  For each "special" damage type give extra experience */
    for (i = 0; i < NATTK; i++) {
        tmp2 = ptr.mattk[i].adtyp;
        if (tmp2 > AD_PHYS && tmp2 < AD_BLND)
            tmp += 2 * mtmp.m_lev;
        else if ((tmp2 === AD_DRLI) || (tmp2 === AD_STON) || (tmp2 === AD_SLIM))
            tmp += 50;
        else if (tmp2 !== AD_PHYS)
            tmp += mtmp.m_lev;
        /* extra heavy damage bonus */
        if ((ptr.mattk[i].damd * ptr.mattk[i].damn) > 23)
            tmp += mtmp.m_lev;
        if (tmp2 === AD_WRAP && ptr.mlet === S_EEL && !Amphibious())
            tmp += 1000;
    }

    /*  For certain "extra nasty" monsters, give even more */
    if (extra_nasty(ptr))
        tmp += (7 * mtmp.m_lev);

    /*  For higher level monsters, an additional bonus is given */
    if (mtmp.m_lev > 8)
        tmp += 50;

    /* MAIL_STRUCTURES: no mail daemon in this build */

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
            tmp = Math.trunc((tmp + 1) / 2);
            nk -= tmp2;
            if (i & 1)
                tmp2 += 20;
        }
    }

    return tmp;
}

// C ref: exper.c more_experienced()
export function more_experienced(exper, rexp) {
    const u = game.u;
    const oldexp = u.uexp,
        oldrexp = u.urexp,
        newexp = oldexp + exper,
        rexpincr = 4 * exper + rexp,
        newrexp = oldrexp + rexpincr;

    /* cap experience and score on wraparound: JS numbers don't wrap */

    if (newexp !== oldexp) {
        u.uexp = newexp;
        if (game.flags.showexp)
            game.disp_botl = true;
        /* even when experience points aren't being shown, experience level
           might be highlighted with a percentage highlight rule and that
           percentage depends upon experience points:
           if (!disp.botl && exp_percent_changing()) disp.botl = TRUE;
           exp_percent_changing() is FALSE without status hilite rules */
    }
    /* newrexp will always differ from oldrexp unless they're LONG_MAX */
    if (newrexp !== oldrexp) {
        u.urexp = newrexp;
        /* SCORE_ON_BOTL (showscore) isn't ported */
    }
    if (u.urexp >= ((game.urole.mnum === PM_WIZARD) ? 1000 : 2000))
        game.flags.beginner = false;
}

// C ref: exper.c newexplevel()
/*
 * Make experience gaining similar to AD&D(tm), whereby you can at most go
 * up by one level at a time, extra expr possibly helping you along.
 * After all, how much real experience does one get shooting a wand of death
 * at a dragon created with a wand of polymorph??
 */
export async function newexplevel() {
    const u = game.u;
    if (u.ulevel < MAXULEV && u.uexp >= newuexp(u.ulevel))
        await pluslvl(true);
}

// C ref: exper.c pluslvl()
export async function pluslvl(
    incr) /* True: incremental experience growth;
           * False: potion of gain level or wraith corpse
           *        or wizard mode #levelchange */ {
    const u = game.u;
    let hpinc, eninc;

    if (!incr)
        await You_feel("more experienced.");

    /* increase hit points (when polymorphed, do monster form first
       in order to retain normal human/whatever increase for later) */
    if (u.umonnum !== u.umonster) { /* Upolyd */
        hpinc = monhp_per_lvl(game.youmonst);
        u.mh += hpinc;
        setuhpmax(u.mhmax, false); /* acts as setmhmax() when Upolyd */
    }
    hpinc = newhp();
    u.uhp += hpinc;
    setuhpmax(u.uhpmax + hpinc, true); /* will lower u.uhp if it exceeds
                                        * u.uhpmax */

    /* increase spell power/energy points */
    eninc = newpw();
    u.uenmax += eninc;
    if (u.uenmax > u.uenpeak)
        u.uenpeak = u.uenmax;
    u.uen += eninc;

    /* increase level (unless already maxxed) */
    if (u.ulevel < MAXULEV) {
        const oldrank = xlev_to_rank(u.ulevel);

        /* increase experience points to reflect new level */
        if (incr) {
            const tmp = newuexp(u.ulevel + 1);

            if (u.uexp >= tmp)
                u.uexp = tmp - 1;
        } else {
            u.uexp = newuexp(u.ulevel);
        }
        ++u.ulevel;
        await pline(`Welcome ${(u.ulevelmax < u.ulevel) ? "" : "back "
                    }to experience level ${u.ulevel}.`);
        if (u.ulevelmax < u.ulevel)
            u.ulevelmax = u.ulevel;
        await adjabil(u.ulevel - 1, u.ulevel); /* give new intrinsics */
        /* SoundAchievement(0, sa2_xplevelup, 0): no sound interface */
        const old_ach_cnt = count_achievements();
        const newrank = xlev_to_rank(u.ulevel);
        if (newrank > oldrank)
            record_achievement(achieve_rank(newrank));
        /* a new rank achievement will log its own message; log a simpler
           message here if we didn't just get an achievement (so when rank
           hasn't changed or hero just regained a lost level and the rank
           achievement doesn't get repeated) */
        if (count_achievements() === old_ach_cnt)
            livelog_printf(LL_MINORAC, `${(u.ulevel <= (u.ulevelpeak || 0)) ? "re" : ""
                                         }gained experience level ${u.ulevel}`);
        if (u.ulevel > (u.ulevelpeak || 0))
            u.ulevelpeak = u.ulevel;
    }
    game.disp_botl = true;
}

// C ref: exper.c losexp()
export async function losexp(drainer) /* cause of death, if drain should be fatal */ {
    const u = game.u;
    let num, uhpmin, olduhpmax;

    /* override life-drain resistance when handling an explicit
       wizard mode request to reduce level; never fatal though */
    if (drainer && drainer === "#levelchange")
        drainer = null;
    else if (resists_drli(game.youmonst))
        return;

    /* level-loss message; "Goodbye level 1." is fatal; divine anger
       (drainer==NULL) resets a level 1 character to 0 experience points
       without reducing level and that isn't fatal so suppress the message
       in that situation */
    if (u.ulevel > 1 || drainer)
        await pline(`${Goodbye()} level ${u.ulevel}.`);

    if (u.ulevel > 1) {
        u.ulevel -= 1;
        /* remove intrinsic abilities */
        await adjabil(u.ulevel + 1, u.ulevel);
        livelog_printf(LL_MINORAC, `lost experience level ${u.ulevel + 1}`);
        /* SoundAchievement(0, sa2_xpleveldown, 0): no sound interface */
    } else { /* u.ulevel==1 */
        if (drainer) {
            killer().format = KILLED_BY;
            if (killer().name !== drainer)
                killer().name = drainer;
            await done(DIED);
        }
        /* no drainer or lifesaved */
        if (u.ulevel > 1)
            /* can happen during debug fuzzing if fuzzer_savelife() uses
               a blessed potion of restore ability to restore lost levels */
            return;
        u.uexp = 0;
        livelog_printf(LL_MINORAC, "lost all experience");
    }

    olduhpmax = u.uhpmax;
    uhpmin = minuhpmax(10); /* same minimum as is used by life-saving */
    num = u.uhpinc[u.ulevel];
    u.uhpmax -= num;
    if (u.uhpmax < uhpmin)
        setuhpmax(uhpmin, true);
    /* uhpmax might try to go up if it has previously been reduced */
    if (u.uhpmax > olduhpmax)
        setuhpmax(olduhpmax, true);

    u.uhp -= num;
    if (u.uhp < 1)
        u.uhp = 1;
    else if (u.uhp > u.uhpmax)
        u.uhp = u.uhpmax;

    num = u.ueninc[u.ulevel];
    u.uenmax -= num;
    if (u.uenmax < 0)
        u.uenmax = 0;
    u.uen -= num;
    if (u.uen < 0)
        u.uen = 0;
    else if (u.uen > u.uenmax)
        u.uen = u.uenmax;

    if (u.uexp > 0)
        u.uexp = newuexp(u.ulevel) - 1;

    if (u.umonnum !== u.umonster) { /* Upolyd */
        num = monhp_per_lvl(game.youmonst);
        u.mhmax -= num;
        u.mh -= num;
        if (u.mh <= 0)
            await rehumanize();
    }

    game.disp_botl = true;
}
