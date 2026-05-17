// losexp.js — Experience / max-HP floor helpers (exper.c + attrib.c subset).
// C ref: exper.c losexp(), attrib.c minuhpmax(), setuhpmax(), role.c Goodbye().

import { pline } from './display.js';
import { newuexp } from './explevel.js';
import { resistsDrliHeroLikeC, raceptr } from './mondata.js';
import { applyAdjabil } from './u_init_adjabil.js';
import { rnd, rn2 } from './rng.js';
import { rehumanizeHeroAfterPolyDrainLikeC } from './were_hero.js';
import {
    PM_GRAY_DRAGON,
    PM_YELLOW_DRAGON,
    PM_STRAW_GOLEM,
    PM_PAPER_GOLEM,
    PM_ROPE_GOLEM,
    PM_LEATHER_GOLEM,
    PM_GOLD_GOLEM,
    PM_WOOD_GOLEM,
    PM_FLESH_GOLEM,
    PM_CLAY_GOLEM,
    PM_STONE_GOLEM,
    PM_GLASS_GOLEM,
    PM_IRON_GOLEM,
    S_GOLEM,
    S_DRAGON,
} from './const.js';

/**
 * C: role.c Goodbye() — role-specific farewell word before " level N.".
 * @param {object} g
 */
export function goodbyeWordLikeC(g) {
    const abbr = g?.urole?.abbr;
    switch (abbr) {
        case 'Kni':
            return 'Fare thee well';
        case 'Sam':
            return 'Sayonara';
        case 'Tou':
            return 'Aloha';
        case 'Val':
            return 'Farvel';
        default:
            return 'Goodbye';
    }
}

/**
 * C: attrib.c minuhpmax(altmin) — max(u.ulevel, altmin), altmin floored at 1.
 * @param {object} u
 * @param {number} altmin
 */
export function minuhpmaxLikeC(u, altmin) {
    let a = altmin | 0;
    if (a < 1) a = 1;
    return Math.max(u?.ulevel | 0, a);
}

/**
 * C: makemon.c **`golemhp(int type)`** — **`monhp_per_lvl`** golem branch.
 * @param {number} mndx `monsndx(mon)` / hero **`umonnum`**
 */
export function golemhpLikeC(mndx) {
    switch (mndx | 0) {
        case PM_STRAW_GOLEM:
            return 20;
        case PM_PAPER_GOLEM:
            return 20;
        case PM_ROPE_GOLEM:
            return 30;
        case PM_LEATHER_GOLEM:
            return 40;
        case PM_GOLD_GOLEM:
            return 60;
        case PM_WOOD_GOLEM:
            return 50;
        case PM_FLESH_GOLEM:
            return 40;
        case PM_CLAY_GOLEM:
            return 70;
        case PM_STONE_GOLEM:
            return 100;
        case PM_GLASS_GOLEM:
            return 80;
        case PM_IRON_GOLEM:
            return 120;
        default:
            return 0;
    }
}

/**
 * C: makemon.c **`monhp_per_lvl(struct monst *)`** — hero poly (**`gy.youmonst`**).
 * @param {import('./gstate.js').game} g
 */
export function monhpPerLvlHeroYoumonstLikeC(g) {
    const ptr = raceptr(g?.youmonst);
    const mndx = (g?.youmonst?.mnum ?? g?.u?.umonnum) | 0;
    const mlev = (g?.youmonst?.m_lev ?? g?.u?.m_lev ?? 0) | 0;
    const mlet = ptr?.mlet | 0;

    if (mlet === S_GOLEM) {
        const gh = golemhpLikeC(mndx);
        const denom = Math.max(1, ptr?.mlevel | 0);
        return Math.trunc(gh / denom);
    }

    const pml = ptr?.mlevel | 0;
    if (pml > 49) return 4 + rnd(4);

    if (mlet === S_DRAGON && mndx >= PM_GRAY_DRAGON && mndx <= PM_YELLOW_DRAGON) return 4 + rn2(5);

    if (!mlev) return rnd(4);
    return rnd(8);
}

/**
 * C: attrib.c setuhpmax(newmax, even_when_polyd) — human u.uhpmax / u.uhp / u.uhppeak when !Upolyd
 * or even_when_polyd (losexp uses TRUE for clamp calls).
 * @param {object} g
 * @param {number} newmax
 * @param {boolean} evenWhenPolyd
 */
export function setUhpmaxHumanLikeC(g, newmax, evenWhenPolyd) {
    const u = g?.u;
    if (!u) return;
    if ((u.Upolyd | 0) && !evenWhenPolyd) return;
    const nm = newmax | 0;
    if ((u.uhpmax | 0) !== nm) {
        u.uhpmax = nm;
        if ((u.uhppeak | 0) < (u.uhpmax | 0)) u.uhppeak = u.uhpmax | 0;
    }
    if ((u.uhp | 0) > (u.uhpmax | 0)) u.uhp = u.uhpmax | 0;
    g.disp = g.disp || {};
    g.disp.botl = true;
}

/**
 * C: exper.c losexp(drainer) with drainer==NULL — trap.c dofiretrap human branch;
 * not fatal at XL 1; poly tail: **`monhp_per_lvl`**-style drain + minimal **`rehumanize`**.
 * @param {object} g
 */
export async function losexpNullLikeC(g) {
    const u = g.u;
    if (!u) return;
    if (resistsDrliHeroLikeC(g)) return;

    if ((u.ulevel | 0) > 1) {
        await pline(`${goodbyeWordLikeC(g)} level ${u.ulevel | 0}.`);
    }

    if ((u.ulevel | 0) > 1) {
        const prevLv = u.ulevel | 0;
        u.ulevel = prevLv - 1;
        /* C: attrib.c adjabil(u.ulevel + 1, u.ulevel) immediately after decrement */
        applyAdjabil(prevLv, u.ulevel | 0);
    } else {
        u.uexp = 0;
    }

    const olduhpmax = u.uhpmax | 0;
    const uhpmin = minuhpmaxLikeC(u, 10);
    let num = u.uhpinc?.[u.ulevel | 0] | 0;
    u.uhpmax = (u.uhpmax | 0) - num;
    if ((u.uhpmax | 0) < uhpmin) {
        setUhpmaxHumanLikeC(g, uhpmin, true);
    }
    if ((u.uhpmax | 0) > olduhpmax) {
        setUhpmaxHumanLikeC(g, olduhpmax, true);
    }

    u.uhp = (u.uhp | 0) - num;
    if ((u.uhp | 0) < 1) u.uhp = 1;
    else if ((u.uhp | 0) > (u.uhpmax | 0)) u.uhp = u.uhpmax | 0;

    num = u.ueninc?.[u.ulevel | 0] | 0;
    u.uenmax = Math.max(0, (u.uenmax | 0) - num);
    u.uen = (u.uen | 0) - num;
    if ((u.uen | 0) < 0) u.uen = 0;
    else if ((u.uen | 0) > (u.uenmax | 0)) u.uen = u.uenmax | 0;

    if ((u.uexp | 0) > 0) {
        u.uexp = newuexp(u.ulevel | 0) - 1;
    }

    if (u.Upolyd | 0) {
        /* C: exper.c losexp — monhp_per_lvl(&youmonst); rehumanize() if mh <= 0 */
        const numPoly = monhpPerLvlHeroYoumonstLikeC(g);
        u.mhmax = Math.max(0, (u.mhmax | 0) - numPoly);
        u.mh = (u.mh | 0) - numPoly;
        if ((u.mh | 0) <= 0) await rehumanizeHeroAfterPolyDrainLikeC(g);
        else if ((u.mh | 0) > (u.mhmax | 0)) u.mh = u.mhmax | 0;
    }

    g.disp = g.disp || {};
    g.disp.botl = true;
}
