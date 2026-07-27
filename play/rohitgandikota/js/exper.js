import { adjabil } from './attrib.js';
// exper.js — experience, hit points and energy.
// C ref: src/exper.c

import { game } from './gstate.js';
import { aligns } from './role_data.js';
import { rnd, rn1 } from './rng.js';
import { ACURR } from './attrib.js';
import { pline } from './display.js';
import { A_CON, A_WIS , MAXULEV } from './const.js';

// src/exper.c enermod() — role-based energy multiplier. Only reached above
// level 0, so not exercised at character creation.
function enermod(en) {
    switch (game.urole?.name?.m) {
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

// src/attrib.c setuhpmax() — set max HP, tracking the peak.
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

        /* src/exper.c:355 — adjabil() grants the new intrinsics, and it is
           ported in js/attrib.js; only the achievement, sound and livelog
           calls that follow it need subsystems this port lacks. */
        adjabil(game.u.ulevel - 1, game.u.ulevel); /* give new intrinsics */
        note_unported_exper('pluslvl:achievements_livelog');

        if (game.u.ulevel > (game.u.ulevelpeak ?? 0))
            game.u.ulevelpeak = game.u.ulevel;
    }
}

function note_unported_exper(what) {
    (game.unported ||= new Set()).add(what);
}
