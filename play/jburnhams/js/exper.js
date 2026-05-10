// exper.js — Experience system
// C ref: exper.c

import { rn2, rnd, rn1 } from './rng.js';
import { game } from './gstate.js';
import {
    PM_CLERIC, PM_WIZARD, PM_HEALER, PM_KNIGHT, PM_BARBARIAN, PM_VALKYRIE
} from './const.js';

function enermod(en) {
    switch (game.urole.mnum) {
    case PM_CLERIC:
    case PM_WIZARD:
        return (2 * en);
    case PM_HEALER:
    case PM_KNIGHT:
        return Math.floor((3 * en) / 2);
    case PM_BARBARIAN:
    case PM_VALKYRIE:
        return Math.floor((3 * en) / 4);
    default:
        return en;
    }
}
import { acurr, A_WIS } from './attrib.js';

export function newuexp(lev) {
    if (lev < 1) return 0;
    if (lev < 10) return 10 * Math.pow(2, lev - 1);
    if (lev < 20) return 10000 * Math.pow(2, lev - 10);
    return 10000000 * (lev - 19);
}

export function newpw() {
    let en = 0, enrnd = 0, enfix = 0;

    if (game.u.ulevel === 0) {
        en = game.urole.enadv.infix + game.urace.enadv.infix;
        if (game.urole.enadv.inrnd > 0)
            en += rnd(game.urole.enadv.inrnd);
        if (game.urace.enadv.inrnd > 0)
            en += rnd(game.urace.enadv.inrnd);
    } else {
        enrnd = Math.floor(acurr(A_WIS) / 2);
        // xlev is typically 10 for magic users, maybe different per role. We will need to pull xlev later if used, but for newpw it's just initial init anyway.
        let xlev = game.urole.xlev || 10;
        if (game.u.ulevel < xlev) {
            enrnd += game.urole.enadv.lornd + game.urace.enadv.lornd;
            enfix = game.urole.enadv.lofix + game.urace.enadv.lofix;
        } else {
            enrnd += game.urole.enadv.hirnd + game.urace.enadv.hirnd;
            enfix = game.urole.enadv.hifix + game.urace.enadv.hifix;
        }
        en = enfix;
        if (enrnd > 0) {
            en += rnd(enrnd);
        }
        en = enermod(en);
    }
    if (en <= 0) en = 1;
    return en;
}

export function newhp() {
    let hp = 0;
    if (game.u.ulevel === 0) {
        hp = game.urole.hpadv.infix + game.urace.hpadv.infix;
        if (game.urole.hpadv.inrnd > 0)
            hp += rnd(game.urole.hpadv.inrnd);
        if (game.urace.hpadv.inrnd > 0)
            hp += rnd(game.urace.hpadv.inrnd);
    } else {
        let xlev = game.urole.xlev || 10;
        if (game.u.ulevel < xlev) {
            hp = game.urole.hpadv.lofix + game.urace.hpadv.lofix;
            if (game.urole.hpadv.lornd > 0)
                hp += rnd(game.urole.hpadv.lornd);
            if (game.urace.hpadv.lornd > 0)
                hp += rnd(game.urace.hpadv.lornd);
        } else {
            hp = game.urole.hpadv.hifix + game.urace.hpadv.hifix;
            if (game.urole.hpadv.hirnd > 0)
                hp += rnd(game.urole.hpadv.hirnd);
            if (game.urace.hpadv.hirnd > 0)
                hp += rnd(game.urace.hpadv.hirnd);
        }
    }
    return hp;
}

export function adjabil(oldlevel, newlevel) {
    // Only RNG we care about right now is whether abilities gained cause rn2 checks?
    // They don't seem to based on attrib.c.
}

// C ref: exper.c newexplevel()
export function check_experience() {
    // In C, check_experience() doesn't exist, it's newexplevel()
    if (game.u.ulevel < 30 && game.u.uexp >= newuexp(game.u.ulevel)) { // MAXULEV = 30
        pluslvl(true);
    }
}

// C ref: exper.c pluslvl()
export function pluslvl(incr) {
    let hpinc, eninc;

    if (game.u.Upolyd) {
        // hpinc = monhp_per_lvl(game.youmonst); // consumes RNG
        // we can stub this or ignore since u_init does not poly
        // for now just add rn2 stub if we hit this, but we won't hit it in init
    }
    hpinc = newhp();
    game.u.uhp += hpinc;
    game.u.uhpmax += hpinc;
    if (game.u.uhp > game.u.uhpmax) game.u.uhp = game.u.uhpmax;
    // setuhpmax does more, but for RNG / basic state, this is sufficient

    eninc = newpw();
    game.u.uenmax += eninc;
    if (game.u.uenmax > game.u.uenpeak) {
        game.u.uenpeak = game.u.uenmax;
    }
    game.u.uen += eninc;

    if (game.u.ulevel < 30) {
        if (incr) {
            let tmp = newuexp(game.u.ulevel + 1);
            if (game.u.uexp >= tmp) game.u.uexp = tmp - 1;
        } else {
            if (game.u.uexp < newuexp(game.u.ulevel)) {
                game.u.uexp = newuexp(game.u.ulevel);
            }
        }
        game.u.ulevel++;
        adjabil(game.u.ulevel - 1, game.u.ulevel);
    }
}

// C ref: exper.c losexp()
export function losexp(drainer) {
    if (game.u.ulevel > 1) {
        game.u.ulevel -= 1;
        adjabil(game.u.ulevel + 1, game.u.ulevel);
    } else {
        game.u.uexp = 0;
    }

    if (game.u.uexp > 0)
        game.u.uexp = newuexp(game.u.ulevel) - 1;

    // other stats loss
}

// C ref: exper.c rndexp()
export function rndexp(gaining) {
    let minexp = (game.u.ulevel === 1) ? 0 : newuexp(game.u.ulevel - 1);
    let maxexp = newuexp(game.u.ulevel);
    let diff = maxexp - minexp;
    let factor = 1;
    // In JS we don't have LARGEST_INT wrapping issues usually, but match C logic if needed.
    // For rn2, C diff must be an int
    let result = minexp + factor * rn2(diff);
    if (game.u.ulevel === 30 && gaining) {
        result += (game.u.uexp - minexp);
        if (result < game.u.uexp) result = game.u.uexp;
    }
    return result;
}
