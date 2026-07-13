// exper.js — Experience / level-up.
// C ref: exper.c — newpw, pluslvl (partial); callers in wizcmds / potion / eat.

import { game } from './gstate.js';
import { rn1, rnd } from './rng.js';
import { MAXULEV } from './const.js';
import { pline } from './display.js';
import { acurr, A_WIS, newhp, adjabil } from './attrib.js';
import {
    PM_CLERIC,
    PM_WIZARD,
    PM_HEALER,
    PM_KNIGHT,
    PM_BARBARIAN,
    PM_VALKYRIE,
} from './generated/monsters_data.js';

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
 * Achievements / livelog / SoundAchievement / newuexp deferred.
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
