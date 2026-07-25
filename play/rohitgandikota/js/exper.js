// exper.js — experience, hit points and energy.
// C ref: src/exper.c

import { game } from './gstate.js';
import { aligns } from './role_data.js';
import { rnd, rn1 } from './rng.js';
import { ACURR } from './attrib.js';
import { A_CON, A_WIS } from './const.js';

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
