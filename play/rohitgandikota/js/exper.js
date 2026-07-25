// exper.js — experience, hit points and energy.
// C ref: src/exper.c

import { game } from './gstate.js';
import { aligns } from './role_data.js';
import { rnd, rn1 } from './rng.js';

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
        let hprnd, hpfix;
        if (game.u.ulevel < urole.xlev) {
            hprnd = urole.hpadv[LORND] + urace.hpadv[LORND];
            hpfix = urole.hpadv[LOFIX] + urace.hpadv[LOFIX];
        } else {
            hprnd = urole.hpadv[HIRND] + urace.hpadv[HIRND];
            hpfix = urole.hpadv[HIFIX] + urace.hpadv[HIFIX];
        }
        hp = rn1(hprnd, hpfix);
    }
    if (hp <= 0)
        hp = 1;
    return hp;
}

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
        enrnd = Math.trunc(game.u.acurr_wis / 2);
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
    return en;
}
