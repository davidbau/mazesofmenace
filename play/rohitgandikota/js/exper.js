import { adjabil } from './attrib.js';
// exper.js — experience, hit points and energy.
// C ref: src/exper.c

import { game } from './gstate.js';
import { aligns } from './role_data.js';
import { PMNAMES, ATTKS as A, MFLAGS, MONSYMS } from './monst_data.js';
import { rnd, rn1, rn2 } from './rng.js';
import { ACURR } from './attrib.js';
import { pline } from './display.js';
import { A_CON, A_WIS, NORMAL_SPEED, NATTK } from './const.js';
import { find_mac } from './worn.js';

// src/exper.c enermod() — role-based energy multiplier. Only reached above
// level 0, so not exercised at character creation.
function enermod(en) {
    switch (game.urole?.name?.m) {
    /* src/exper.c:28 — PM_CLERIC doubles alongside PM_WIZARD. The role's
       male name is "Priest", not "Cleric", which is how this arm went
       missing: the C switches on the role's PM number, not its name. */
    case 'Priest':
    case 'Wizard':
        return 2 * en;
    case 'Healer':
    case 'Knight':
        return Math.trunc((3 * en) / 2);
    case 'Barbarian':
    case 'Valkyrie':
        return Math.trunc((3 * en) / 4);
    default:
        return en;
    }
}

// struct RoleAdvance, include/you.h:23 — { infix, inrnd, lofix, lornd,
// hifix, hirnd }. The generated tables carry it as a positional array.
const INFIX = 0, INRND = 1, LOFIX = 2, LORND = 3, HIFIX = 4, HIRND = 5;

// src/exper.c newhp() — hit points for a new level.
//
// At level 0 this draws only when inrnd is positive. Every role and every race
// in 5.0 has hpadv.inrnd == 0, so newhp() makes no draw at character creation —
// which is why the recordings show newpw() alone at that point and why an
// implementation that "helpfully" rolled something here would desynchronise.
export function newhp() {
    const urole = game.urole, urace = game.urace;
    let hp;

    if (game.u.ulevel === 0) {
        hp = urole.hpadv[INFIX] + urace.hpadv[INFIX];
        if (urole.hpadv[INRND] > 0)
            hp += rnd(urole.hpadv[INRND]);
        if (urace.hpadv[INRND] > 0)
            hp += rnd(urace.hpadv[INRND]);
        /* src/attrib.c:1091 — the initial hero's alignment record is set HERE,
           not in u_init, and it is the role's initrecord rather than zero.
           peace_minded() reads it as rn2(16 + u.ualign.record), so a Healer
           whose record is 0 instead of 10 draws rn2(16) where C draws rn2(26). */
        if (game.moves === 0) {
            game.u.ualign.type = aligns[game.flags.initalign].value;
            game.u.ualign.record = urole.initrecord;
        }
    } else {
        /* src/attrib.c:1098 — TWO separate rnd() calls, one for the role and
           one for the race, each skipped when its lornd/hirnd is 0. This used
           to be a single rn1(role+race, fix), which is a different number of
           draws as well as a different distribution: rn1(a+b, f) spends one
           call, C spends up to two.

           The Constitution bonus below was missing entirely. */
        let conplus;

        if (game.u.ulevel < urole.xlev) {
            hp = urole.hpadv[LOFIX] + urace.hpadv[LOFIX];
            if (urole.hpadv[LORND] > 0)
                hp += rnd(urole.hpadv[LORND]);
            if (urace.hpadv[LORND] > 0)
                hp += rnd(urace.hpadv[LORND]);
        } else {
            hp = urole.hpadv[HIFIX] + urace.hpadv[HIFIX];
            if (urole.hpadv[HIRND] > 0)
                hp += rnd(urole.hpadv[HIRND]);
            if (urace.hpadv[HIRND] > 0)
                hp += rnd(urace.hpadv[HIRND]);
        }
        const con = ACURR(A_CON);
        if (con <= 3)        conplus = -2;
        else if (con <= 6)   conplus = -1;
        else if (con <= 14)  conplus = 0;
        else if (con <= 16)  conplus = 1;
        else if (con === 17) conplus = 2;
        else if (con === 18) conplus = 3;
        else                 conplus = 4;
        hp += conplus;
    }
    if (hp <= 0)
        hp = 1;
    if (game.u.ulevel < MAXULEV) {
        /* remember increment; future level drain could take it away again */
        (game.u.uhpinc ||= [])[game.u.ulevel] = hp;
    } else {
        /* after level 30, throttle hit point gains from extra experience */
        let lim = 5 - Math.trunc(game.u.uhpmax / 300);

        lim = Math.max(lim, 1);
        if (hp > lim)
            hp = lim;
    }
    return hp;
}

// include/global.h:413 MAXULEV
const MAXULEV = 30;

// src/exper.c:45 newpw() — spell power / energy points for a new level.
export function newpw() {
    const urole = game.urole, urace = game.urace;
    let en = 0, enrnd, enfix;

    if (game.u.ulevel === 0) {
        en = urole.enadv[INFIX] + urace.enadv[INFIX];
        if (urole.enadv[INRND] > 0)
            en += rnd(urole.enadv[INRND]);
        if (urace.enadv[INRND] > 0)
            en += rnd(urace.enadv[INRND]);
    } else {
        enrnd = Math.trunc(ACURR(A_WIS) / 2);
        if (game.u.ulevel < urole.xlev) {
            enrnd += urole.enadv[LORND] + urace.enadv[LORND];
            enfix = urole.enadv[LOFIX] + urace.enadv[LOFIX];
        } else {
            enrnd += urole.enadv[HIRND] + urace.enadv[HIRND];
            enfix = urole.enadv[HIFIX] + urace.enadv[HIFIX];
        }
        en = enermod(rn1(enrnd, enfix));
    }
    if (en <= 0)
        en = 1;
    if (game.u.ulevel < MAXULEV) {
        /* remember increment; future level drain could take it away again */
        (game.u.ueninc ||= [])[game.u.ulevel] = en;
    } else {
        /* after level 30, throttle energy gains from extra experience */
        let lim = 4 - Math.trunc(game.u.uenmax / 200);

        lim = Math.max(lim, 1);
        if (en > lim)
            en = lim;
    }
    return en;
}

// src/exper.c newuexp() — the experience threshold for a level.
export function newuexp(lev) {
    if (lev < 1)                        /* newuexp(u.ulevel - 1) at level 1 */
        return 0;
    if (lev < 10)
        return 10 * (1 << lev);
    if (lev < 20)
        return 10000 * (1 << (lev - 10));
    return 10000000 * (lev - 19);
}

// src/exper.c:378 rndexp(): a random experience total within the hero's
// current level. The factor loop keeps rn2's argument within a signed int.
export function rndexp(gaining) {
    const u = game.u;
    const minexp = (u.ulevel === 1) ? 0 : newuexp(u.ulevel - 1);
    const maxexp = newuexp(u.ulevel);
    let diff = maxexp - minexp;
    let factor = 1;
    const LARGEST_INT = 0x7fffffff;
    while (diff >= LARGEST_INT) {
        diff = Math.trunc(diff / 2);
        factor *= 2;
    }
    let result = minexp + factor * rn2(diff);
    if (u.ulevel === MAXULEV && gaining) {
        result += (u.uexp || 0) - minexp;
        if (result < (u.uexp || 0))
            result = u.uexp || 0;
    }
    return result;
}

// src/attrib.c setuhpmax() — set max HP, tracking the peak.
// src/exper.c:207 losexp() — lose an experience level (or, at level 1 with
// no drainer, just all experience). resists_drli needs the drain-resistance
// worn scan; nothing grants it to a fresh hero, so the real reads run.
export async function losexp(drainer) {
    const u = game.u;

    /* resists_drli(youmonst) — worn drain-resistance not modelled */

    if (u.ulevel > 1 || drainer)
        await pline(`Goodbye level ${u.ulevel}.`);

    if (u.ulevel > 1) {
        u.ulevel -= 1;
        (game.unported ||= new Set()).add('losexp:adjabil');
    } else {
        if (drainer) {
            game.killer = { format: 1 /* KILLED_BY */, name: drainer };
            const { done } = await import('./end.js');
            const { DIED } = await import('./const.js');
            await done(DIED);
        }
        u.uexp = 0;
        /* src/exper.c:245 */
        const { livelog_add } = await import('./pline.js');
        livelog_add('lost all experience');
    }

    const olduhpmax = u.uhpmax;
    /* src/attrib.c:1147 minuhpmax(10) — max(u.ulevel, 10) */
    const uhpmin = Math.max(u.ulevel, 10);
    let num = (u.uhpinc?.[u.ulevel] ?? 0);
    u.uhpmax -= num;
    if (u.uhpmax < uhpmin)
        setuhpmax(uhpmin, true);
    if (u.uhpmax > olduhpmax)
        setuhpmax(olduhpmax, true);

    u.uhp -= num;
    if (u.uhp < 1)
        u.uhp = 1;
    else if (u.uhp > u.uhpmax)
        u.uhp = u.uhpmax;

    num = (u.ueninc?.[u.ulevel] ?? 0);
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

    /* Upolyd mh adjustment — polymorph not modelled */
    (game.disp ||= {}).botl = true;
}

export function setuhpmax(newmax, even_when_polyd) {
    /* Upolyd is false in this port; the else arm needs polymorph state. */
    if (newmax !== game.u.uhpmax) {
        game.u.uhpmax = newmax;
        if (game.u.uhpmax > (game.u.uhppeak ?? 0))
            game.u.uhppeak = game.u.uhpmax;
    }
    if (game.u.uhp > game.u.uhpmax)
        game.u.uhp = game.u.uhpmax;
}

// src/exper.c pluslvl() — gain an experience level.
//
// `incr` is FALSE for a potion of gain level, a wraith corpse, or wizard-mode
// #levelchange; TRUE for ordinary experience growth. The two differ in how
// u.uexp is set, not in the draws.
//
// The draws are newhp() and newpw(), in that order, and BOTH are spent before
// the level counter moves. newhp's level-up branch spends up to two rnd calls
// (role and race, each gated on its adv being non-zero) plus a Constitution
// bonus; newpw spends one rn1.
/* async because pline() is: update_topl() can reach more(), which BLOCKS for
   a keystroke. Calling pline without awaiting it let wiz_level_change's loop
   run all its iterations at once while the messages queued up behind an
   unawaited promise, so the top line froze on the first level gained. */
export async function pluslvl(incr) {
    if (!incr)
        await pline('You feel more experienced.');

    /* Upolyd would take monhp_per_lvl() first; not reachable here. */
    const hpinc = newhp();
    game.u.uhp += hpinc;
    setuhpmax(game.u.uhpmax + hpinc, true);

    const eninc = newpw();
    game.u.uenmax += eninc;
    if (game.u.uenmax > (game.u.uenpeak ?? 0))
        game.u.uenpeak = game.u.uenmax;
    game.u.uen += eninc;

    if (game.u.ulevel < MAXULEV) {
        if (incr) {
            const tmp = newuexp(game.u.ulevel + 1);
            if (game.u.uexp >= tmp)
                game.u.uexp = tmp - 1;
        } else {
            game.u.uexp = newuexp(game.u.ulevel);
        }
        ++game.u.ulevel;
        await pline(`Welcome ${(game.u.ulevelmax < game.u.ulevel) ? '' : 'back '}`
                    + `to experience level ${game.u.ulevel}.`);
        if (game.u.ulevelmax < game.u.ulevel)
            game.u.ulevelmax = game.u.ulevel;

        /* src/exper.c:355 — adjabil() grants the new intrinsics. The tail:
           SoundAchievement is audio-only and livelog_printf writes the
           out-of-band log, so neither can touch the terminal; the rank
           achievement's u.uachieved state has no ported reader and records
           only when a rank boundary is actually crossed. */
        await adjabil(game.u.ulevel - 1, game.u.ulevel); /* give new intrinsics */
        /* src/botl.c xlev_to_rank() */
        const xlev_to_rank = (xlev) =>
            (xlev <= 2) ? 0 : (xlev <= 30) ? Math.trunc((xlev + 2) / 4) : 8;
        const newrank = xlev_to_rank(game.u.ulevel);
        if (newrank > xlev_to_rank(game.u.ulevel - 1)) {
            const { ACH_RNK1, record_achievement } =
                await import('./insight.js');
            const ach = ACH_RNK1 + newrank - 1;
            record_achievement(game.flags.female ? -ach : ach);
        }
        if (game.u.ulevel > (game.u.ulevelpeak ?? 0))
            game.u.ulevelpeak = game.u.ulevel;

        if (game.u.ulevel > (game.u.ulevelpeak ?? 0))
            game.u.ulevelpeak = game.u.ulevel;
    }
}

function note_unported_exper(what) {
    (game.unported ||= new Set()).add(what);
}

// src/exper.c:85 experience() — the points a kill is worth.
//
// No draws: it is arithmetic over the monster's level, AC, speed and attack
// table, then a halving loop that shrinks the award for repeated kills of the
// same species. `nk` is mvitals[].died INCLUDING this kill.
export function experience(mtmp, nk) {
    const ptr = game.mons[mtmp.mnum];
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
        tmp2 = ptr.mattk[i][0];
        if (tmp2 > A.AT_BUTT) {
            if (tmp2 === A.AT_WEAP)
                tmp += 5;
            else if (tmp2 === A.AT_MAGC)
                tmp += 10;
            else
                tmp += 3;
        }
    }

    /*  For each "special" damage type give extra experience */
    for (i = 0; i < NATTK; i++) {
        tmp2 = ptr.mattk[i][1];
        if (tmp2 > A.AD_PHYS && tmp2 < A.AD_BLND)
            tmp += 2 * mtmp.m_lev;
        else if (tmp2 === A.AD_DRLI || tmp2 === A.AD_STON || tmp2 === A.AD_SLIM)
            tmp += 50;
        else if (tmp2 !== A.AD_PHYS)
            tmp += mtmp.m_lev;
        /* extra heavy damage bonus */
        if (ptr.mattk[i][3] * ptr.mattk[i][2] > 23)
            tmp += mtmp.m_lev;
        if (tmp2 === A.AD_WRAP && ptr.mlet === MONSYMS.S_EEL)
            note_unported_exper('experience:amphibious_eel');
    }

    /*  For certain "extra nasty" monsters, give even more */
    if (ptr.mflags2 & MFLAGS.M2_NASTY)
        tmp += (7 * mtmp.m_lev);

    /*  For higher level monsters, an additional bonus is given */
    if (mtmp.m_lev > 8)
        tmp += 50;

    if (mtmp.mrevived || mtmp.mcloned) {
        /* reduce experience for repeated killings of "the same monster" */
        for (i = 0, tmp2 = 20; nk > tmp2 && tmp > 1; ++i) {
            tmp = Math.trunc((tmp + 1) / 2);
            nk -= tmp2;
            if (i & 1)
                tmp2 += 20;
        }
    }

    return tmp;
}

// src/exper.c more_experienced() — add experience points and score.
export function more_experienced(exper, rexp) {
    const oldexp = game.u.uexp || 0,
          oldrexp = game.u.urexp || 0,
          newexp = oldexp + exper,
          newrexp = oldrexp + 4 * exper + rexp;

    if (newexp !== oldexp)
        game.u.uexp = newexp;
    if (newrexp !== oldrexp)
        game.u.urexp = newrexp;
    /* flags.beginner gates some feedback wording; harmless to track */
    const m = game.urole?.mnum;                     /* Role_if(PM_WIZARD) */
    const wiz = m === 'PM_WIZARD' || m === PMNAMES.PM_WIZARD;
    if (game.u.urexp >= (wiz ? 1000 : 2000))
        game.flags.beginner = false;
}

// src/exper.c newexplevel()
export async function newexplevel() {
    if (game.u.ulevel < MAXULEV && (game.u.uexp || 0) >= newuexp(game.u.ulevel))
        await pluslvl(true);
}
