// exper.js — Experience / level-up.
// C ref: exper.c — experience, more_experienced, newuexp, newexplevel,
//         newpw, pluslvl (partial); callers in mon.c xkilled / wizcmds / …

import { game } from './gstate.js';
import { rn1, rnd } from './rng.js';
import { MAXULEV, NATTK } from './const.js';
import { pline } from './display.js';
import { acurr, A_WIS, newhp, adjabil } from './attrib.js';
import { find_mac } from './mhitm.js';
import { NORMAL_SPEED } from './mon.js';
import { extra_nasty } from './monsters.js';
import {
    PM_CLERIC,
    PM_WIZARD,
    PM_HEALER,
    PM_KNIGHT,
    PM_BARBARIAN,
    PM_VALKYRIE,
} from './generated/monsters_data.js';

// C ref: monattk.h — experience() compares against these exact values
const AT_BUTT = 4;
const AT_WEAP = 254;
const AT_MAGC = 255;
const AD_PHYS = 0;
const AD_BLND = 11;
const AD_DRLI = 15;
const AD_STON = 18;
const AD_SLIM = 40;
const AD_WRAP = 28;

// C ref: exper.c newuexp()
export function newuexp(lev) {
    if (lev < 1) return 0;
    if (lev < 10) return (10 * (1 << lev)) | 0;
    if (lev < 20) return (10000 * (1 << (lev - 10))) | 0;
    return (10000000 * ((lev - 19) | 0)) | 0;
}

// C ref: exper.c enermod()
function enermod(en) {
    switch (game.urole?.mnum) {
        case PM_CLERIC:
        case PM_WIZARD:
            return (2 * en) | 0;
        case PM_HEALER:
        case PM_KNIGHT:
            return Math.trunc((3 * en) / 2);
        case PM_BARBARIAN:
        case PM_VALKYRIE:
            return Math.trunc((3 * en) / 4);
        default:
            return en | 0;
    }
}

// C ref: exper.c newpw() — init (ulevel==0) and level-up paths
export function newpw() {
    const u = game.u;
    const roleAdv = game.urole?.enadv || { infix: 1, inrnd: 0 };
    const raceAdv = game.urace?.enadv || { infix: 1, inrnd: 0 };
    let en = 0;
    if ((u.ulevel | 0) === 0) {
        en = (roleAdv.infix | 0) + (raceAdv.infix | 0);
        if ((roleAdv.inrnd | 0) > 0) en += rnd(roleAdv.inrnd);
        if ((raceAdv.inrnd | 0) > 0) en += rnd(raceAdv.inrnd);
    } else {
        let enrnd = (acurr(A_WIS) / 2) | 0;
        let enfix;
        const xlev = game.urole?.xlev ?? 14;
        if ((u.ulevel | 0) < xlev) {
            enrnd += (roleAdv.lornd | 0) + (raceAdv.lornd | 0);
            enfix = (roleAdv.lofix | 0) + (raceAdv.lofix | 0);
        } else {
            enrnd += (roleAdv.hirnd | 0) + (raceAdv.hirnd | 0);
            enfix = (roleAdv.hifix | 0) + (raceAdv.hifix | 0);
        }
        en = enermod(rn1(enrnd, enfix));
    }
    if (en <= 0) en = 1;
    if ((u.ulevel | 0) < MAXULEV) {
        if (!u.ueninc) u.ueninc = [];
        u.ueninc[u.ulevel | 0] = en;
    } else {
        let lim = 4 - Math.trunc((u.uenmax || 0) / 200);
        if (lim < 1) lim = 1;
        if (en > lim) en = lim;
    }
    return en;
}

// C ref: attrib.c setuhpmax() — non-polyd path used by pluslvl
function setuhpmax(newmax, _evenWhenPolyd) {
    const u = game.u;
    if ((u.uhpmax || 0) !== newmax) {
        u.uhpmax = newmax;
        if ((u.uhppeak || 0) < u.uhpmax) u.uhppeak = u.uhpmax;
        if (!game.flags) game.flags = {};
        game.flags.botl = true;
    }
    if ((u.uhp || 0) > (u.uhpmax || 0)) {
        u.uhp = u.uhpmax;
        game.flags.botl = true;
    }
}

/**
 * C ref: exper.c pluslvl(incr)
 * incr false: potion / #levelchange / wraith (You_feel + set xp).
 * Achievements / livelog / SoundAchievement deferred.
 */
export async function pluslvl(incr) {
    const u = game.u || (game.u = {});
    if (!incr) await pline('You feel more experienced.');

    // Upolyd monhp_per_lvl deferred
    const hpinc = newhp();
    u.uhp = (u.uhp || 0) + hpinc;
    setuhpmax((u.uhpmax || 0) + hpinc, true);

    const eninc = newpw();
    u.uenmax = (u.uenmax || 0) + eninc;
    if ((u.uenpeak || 0) < u.uenmax) u.uenpeak = u.uenmax;
    u.uen = (u.uen || 0) + eninc;

    if ((u.ulevel | 0) < MAXULEV) {
        const oldlevel = u.ulevel | 0;
        // C: increase experience points to reflect new level BEFORE ++ulevel
        if (incr) {
            const tmp = newuexp(oldlevel + 1);
            if ((u.uexp | 0) >= tmp) u.uexp = tmp - 1;
        } else {
            u.uexp = newuexp(oldlevel);
        }
        u.ulevel = oldlevel + 1;
        const back = (u.ulevelmax | 0) < (u.ulevel | 0) ? '' : 'back ';
        await pline(`Welcome ${back}to experience level ${u.ulevel}.`);
        if ((u.ulevelmax | 0) < (u.ulevel | 0)) u.ulevelmax = u.ulevel;
        await adjabil(oldlevel, u.ulevel);
        if ((u.ulevel | 0) > (u.ulevelpeak | 0)) u.ulevelpeak = u.ulevel;
    }
    if (!game.flags) game.flags = {};
    game.flags.botl = true;
}

/**
 * C ref: exper.c experience(mtmp, nk) — XP awarded for killing mtmp.
 * Amphibious eel AD_WRAP +1000 and MAIL_DAEMON special deferred.
 */
export function experience(mtmp, nk) {
    const ptr = mtmp?.data;
    if (!ptr) return 1;
    const m_lev = mtmp.m_lev | 0;
    let tmp = 1 + m_lev * m_lev;
    let i = find_mac(mtmp);
    if (i < 3) tmp += (7 - i) * (i < 0 ? 2 : 1);

    const mmove = ptr.mmove | 0;
    if (mmove > NORMAL_SPEED) {
        tmp += mmove > Math.trunc((3 * NORMAL_SPEED) / 2) ? 5 : 3;
    }

    const mattk = ptr.mattk || [];
    for (i = 0; i < NATTK; i++) {
        const tmp2 = mattk[i]?.aatyp | 0;
        if (tmp2 > AT_BUTT) {
            if (tmp2 === AT_WEAP) tmp += 5;
            else if (tmp2 === AT_MAGC) tmp += 10;
            else tmp += 3;
        }
    }
    for (i = 0; i < NATTK; i++) {
        const slot = mattk[i] || { adtyp: 0, damn: 0, damd: 0 };
        const tmp2 = slot.adtyp | 0;
        if (tmp2 > AD_PHYS && tmp2 < AD_BLND) tmp += 2 * m_lev;
        else if (tmp2 === AD_DRLI || tmp2 === AD_STON || tmp2 === AD_SLIM) tmp += 50;
        else if (tmp2 !== AD_PHYS) tmp += m_lev;
        if (((slot.damd | 0) * (slot.damn | 0)) > 23) tmp += m_lev;
        // AD_WRAP + S_EEL + !Amphibious → +1000 deferred (named omission)
        void AD_WRAP;
    }
    if (extra_nasty(ptr)) tmp += 7 * m_lev;
    if (m_lev > 8) tmp += 50;

    if (mtmp.mrevived || mtmp.mcloned) {
        let tmp2 = 20;
        let nkLeft = nk | 0;
        for (i = 0; nkLeft > tmp2 && tmp > 1; ++i) {
            tmp = Math.trunc((tmp + 1) / 2);
            nkLeft -= tmp2;
            if (i & 1) tmp2 += 20;
        }
    }
    return tmp;
}

/** C ref: exper.c more_experienced(exper, rexp) */
export function more_experienced(exper, rexp) {
    const u = game.u || (game.u = {});
    if (!game.flags) game.flags = {};
    const oldexp = u.uexp | 0;
    const oldrexp = u.urexp | 0;
    const newexp = oldexp + (exper | 0);
    const rexpincr = 4 * (exper | 0) + (rexp | 0);
    const newrexp = oldrexp + rexpincr;
    // LONG_MAX wrap deferred — JS Number stays finite for early-game totals
    if (newexp !== oldexp) {
        u.uexp = newexp;
        if (game.flags.showexp) game.flags.botl = true;
        // exp_percent_changing deferred
    }
    if (newrexp !== oldrexp) {
        u.urexp = newrexp;
        // SCORE_ON_BOTL showscore deferred
    }
    const beginnerCap = game.urole?.mnum === PM_WIZARD ? 1000 : 2000;
    if ((u.urexp | 0) >= beginnerCap) game.flags.beginner = false;
}

/** C ref: exper.c newexplevel() */
export async function newexplevel() {
    const u = game.u || {};
    if ((u.ulevel | 0) < MAXULEV && (u.uexp | 0) >= newuexp(u.ulevel | 0)) {
        await pluslvl(true);
    }
}
