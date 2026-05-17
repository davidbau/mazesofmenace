// exper_pluslvl.js — C exper.c pluslvl() / newpw(); attrib.c newhp() for u.ulevel > 0.
// C ref: exper.c pluslvl(), newpw(), more_experienced(); attrib.c newhp() (non-zero level); pray.c pleased pat_on_head.

import { pline } from './display.js';
import { rnd, rn1 } from './rng.js';
import { newuexp, MAXULEV } from './explevel.js';
import { acurrLikeC } from './attr_acurr_like_c.js';
import { applyAdjabil } from './u_init_adjabil.js';
import { monhpPerLvlHeroYoumonstLikeC, setUhpmaxHumanLikeC } from './losexp.js';
import { A_CON, A_WIS } from './const.js';

/** C: role.c struct Role.xlev — cutoff for low vs high hpadv/enadv (per abbreviation). */
const ROLE_XLEV_BY_ABBR = {
    Arc: 14,
    Bar: 10,
    Cav: 10,
    Hea: 20,
    Kni: 10,
    Mon: 10,
    Pri: 10,
    Ran: 12,
    Rog: 11,
    Sam: 11,
    Tou: 14,
    Val: 10,
    Wiz: 12,
};

/** @param {import('./gstate.js').game} g */
function roleXlevLikeC(g) {
    const ab = g?.urole?.abbr;
    if (ab && Object.prototype.hasOwnProperty.call(ROLE_XLEV_BY_ABBR, ab)) {
        return ROLE_XLEV_BY_ABBR[ab];
    }
    return 10;
}

/**
 * C: exper.c enermod (Role_switch).
 * @param {import('./gstate.js').game} g
 * @param {number} en
 */
function enermodHeroLikeC(g, en) {
    const ab = g?.urole?.abbr;
    if (ab === 'Pri' || ab === 'Wiz') return 2 * en;
    if (ab === 'Hea' || ab === 'Kni') return Math.trunc((3 * en) / 2);
    if (ab === 'Bar' || ab === 'Val') return Math.trunc((3 * en) / 4);
    return en;
}

/**
 * C: attrib.c newhp — u.ulevel > 0 only (caller ensures).
 * @param {import('./gstate.js').game} g
 */
export function newhpAtCurrentLevelLikeC(g) {
    const u = g.u;
    const role = g.urole;
    const race = g.urace;
    if (!u || !role?.hpadv || !race?.hpadv) return 1;

    const ul = u.ulevel | 0;
    let hp;
    if (ul < roleXlevLikeC(g)) {
        hp = role.hpadv.lofix + race.hpadv.lofix;
        if (role.hpadv.lornd > 0) hp += rnd(role.hpadv.lornd);
        if (race.hpadv.lornd > 0) hp += rnd(race.hpadv.lornd);
    } else {
        hp = role.hpadv.hifix + race.hpadv.hifix;
        if (role.hpadv.hirnd > 0) hp += rnd(role.hpadv.hirnd);
        if (race.hpadv.hirnd > 0) hp += rnd(race.hpadv.hirnd);
    }

    const con = acurrLikeC(A_CON, g);
    let conplus;
    if (con <= 3) conplus = -2;
    else if (con <= 6) conplus = -1;
    else if (con <= 14) conplus = 0;
    else if (con <= 16) conplus = 1;
    else if (con === 17) conplus = 2;
    else if (con === 18) conplus = 3;
    else conplus = 4;
    hp += conplus;

    if (hp <= 0) hp = 1;
    if (ul < MAXULEV) {
        u.uhpinc = u.uhpinc || [];
        u.uhpinc[ul] = hp;
    } else {
        let lim = 5 - Math.trunc((u.uhpmax | 0) / 300);
        if (lim < 1) lim = 1;
        if (hp > lim) hp = lim;
    }
    return hp;
}

/**
 * C: exper.c newpw — u.ulevel > 0 only.
 * @param {import('./gstate.js').game} g
 */
export function newpwAtCurrentLevelLikeC(g) {
    const u = g.u;
    const role = g.urole;
    const race = g.urace;
    if (!u || !role?.enadv || !race?.enadv) return 1;

    const ul = u.ulevel | 0;
    let enrnd = Math.trunc(acurrLikeC(A_WIS, g) / 2);
    let enfix;
    if (ul < roleXlevLikeC(g)) {
        enrnd += role.enadv.lornd + race.enadv.lornd;
        enfix = role.enadv.lofix + race.enadv.lofix;
    } else {
        enrnd += role.enadv.hirnd + race.enadv.hirnd;
        enfix = role.enadv.hifix + race.enadv.hifix;
    }
    let en = enermodHeroLikeC(g, rn1(enrnd, enfix));
    if (en <= 0) en = 1;
    if (ul < MAXULEV) {
        u.ueninc = u.ueninc || [];
        u.ueninc[ul] = en;
    } else {
        let lim = 4 - Math.trunc((u.uenmax | 0) / 200);
        if (lim < 1) lim = 1;
        if (en > lim) en = lim;
    }
    return en;
}

/**
 * C: exper.c pluslvl(incr) — gain one XL (HP, energy, uexp, adjabil); incr gates You_feel / uexp bump style.
 * @param {import('./gstate.js').game} g
 * @param {boolean} incr
 */
export async function pluslvlHeroLikeC(g, incr) {
    const u = g.u;
    if (!u) return;

    if (!incr) await pline('You feel more experienced.');

    if (u.Upolyd | 0) {
        const hpPoly = monhpPerLvlHeroYoumonstLikeC(g);
        u.mh = (u.mh | 0) + hpPoly;
        u.mhmax = (u.mhmax | 0) + hpPoly;
        if ((u.mhpeak | 0) < (u.mhmax | 0)) u.mhpeak = u.mhmax | 0;
    }

    const hpinc = newhpAtCurrentLevelLikeC(g);
    u.uhp = (u.uhp | 0) + hpinc;
    setUhpmaxHumanLikeC(g, (u.uhpmax | 0) + hpinc, true);

    const eninc = newpwAtCurrentLevelLikeC(g);
    u.uenmax = (u.uenmax | 0) + eninc;
    if ((u.uenmax | 0) > (u.uenpeak | 0)) u.uenpeak = u.uenmax | 0;
    u.uen = (u.uen | 0) + eninc;

    if ((u.ulevel | 0) < MAXULEV) {
        const prevLv = u.ulevel | 0;
        if (incr) {
            const tmp = newuexp(prevLv + 1);
            if ((u.uexp | 0) >= tmp) u.uexp = tmp - 1;
        } else {
            u.uexp = newuexp(prevLv);
        }
        u.ulevel = prevLv + 1;
        const back = (u.ulevelmax | 0) < (u.ulevel | 0) ? '' : 'back ';
        await pline(`Welcome ${back}to experience level ${u.ulevel | 0}.`);
        if ((u.ulevelmax | 0) < (u.ulevel | 0)) u.ulevelmax = u.ulevel | 0;
        applyAdjabil(prevLv, u.ulevel | 0);
        if ((u.ulevel | 0) > (u.ulevelpeak | 0)) u.ulevelpeak = u.ulevel | 0;
    }

    g.disp = g.disp || {};
    g.disp.botl = true;
}

/**
 * C: exper.c **`more_experienced(exper, rexp)`** — **`u.uexp += exper`**, **`u.urexp += 4*exper + rexp`** (cap on positive wrap).
 * Omits **`flags.showexp`** / **`exp_percent_changing`** botl nuance when only **`uexp`** moves.
 * @param {import('./gstate.js').game} g
 * @param {number} exper
 * @param {number} rexp
 */
export function moreExperiencedHeroLikeC(g, exper, rexp) {
    const u = g?.u;
    if (!u) return;
    const ex = exper | 0;
    const rx = rexp | 0;
    let oldexp = Number(u.uexp) | 0;
    if (!Number.isFinite(oldexp)) oldexp = 0;
    let oldrexp = Number(u.urexp) | 0;
    if (!Number.isFinite(oldrexp)) oldrexp = 0;

    let newexp = oldexp + ex;
    const rexpincr = 4 * ex + rx;
    let newrexp = oldrexp + rexpincr;

    if (newexp < 0 && ex > 0) newexp = Number.MAX_SAFE_INTEGER;
    if (newrexp < 0 && rexpincr > 0) newrexp = Number.MAX_SAFE_INTEGER;

    if (newexp !== oldexp) {
        u.uexp = newexp;
        g.disp = g.disp || {};
        g.disp.botl = true;
    }
    if (newrexp !== oldrexp) u.urexp = newrexp;

    /* C: exper.c more_experienced — Role_if(PM_WIZARD) ? 1000 : 2000 */
    const wiz = g?.urole?.abbr === 'Wiz';
    const thresh = wiz ? 1000 : 2000;
    if ((u.urexp | 0) >= thresh && g.flags && typeof g.flags === 'object') {
        g.flags.beginner = false;
    }
}
