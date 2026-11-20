// exper.js — experience levels, and energy gained per level.
// C ref: exper.c
//
// Only what hero initialization needs so far: newuexp(), enermod(), newpw();
// and more_experienced(), newexplevel() (pluslvl() is not ported yet).

import { game } from './gstate.js';
import { rnd, rn1 } from './rng.js';
import { A_WIS, MAXULEV } from './const.js';
import {
    PM_CLERIC, PM_WIZARD, PM_HEALER, PM_KNIGHT, PM_BARBARIAN, PM_VALKYRIE,
} from './monsters.js';
import { ACURR } from './attrib.js';

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
export function newexplevel() {
    const u = game.u;
    if (u.ulevel < MAXULEV && u.uexp >= newuexp(u.ulevel))
        throw new Error('newexplevel(): pluslvl() not ported yet');
}
