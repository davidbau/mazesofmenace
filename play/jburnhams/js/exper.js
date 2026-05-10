// exper.js — Experience system
// C ref: exper.c

import { rn2, rnd } from './rng.js';
import { game } from './gstate.js';
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
        if (enrnd > 0) en += rnd(enrnd);
    }
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
