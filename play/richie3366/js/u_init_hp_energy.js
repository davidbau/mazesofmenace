// u_init_hp_energy.js — Birth hit points and spell energy from role + race.
// C ref: attrib.c newhp() (u.ulevel == 0 branch), exper.c newpw() (u.ulevel == 0);
// polyself.c / you.h u.mh — syncPolyHpFromHumanShape (stub until mons[] HP).

import { game } from './gstate.js';
import { rnd } from './rng.js';

/**
 * @param {{ infix: number, inrnd: number, lofix: number, lornd: number, hifix: number, hirnd: number }} adv
 */
function sumRoleAdvance(adv) {
    let n = adv.infix;
    if (adv.inrnd > 0) n += rnd(adv.inrnd);
    return n;
}

/** C: attrib.c newhp — only the u.ulevel == 0 initial-hero path. */
export function newhpInitial() {
    const role = game.urole;
    const race = game.urace;
    if (!role?.hpadv || !race?.hpadv) return 10;
    let hp = sumRoleAdvance(role.hpadv) + sumRoleAdvance(race.hpadv);
    if (hp <= 0) hp = 1;
    return hp;
}

/** C: exper.c newpw — only the u.ulevel == 0 initial-hero path (no enermod). */
export function newpwInitial() {
    const role = game.urole;
    const race = game.urace;
    if (!role?.enadv || !race?.enadv) return 2;
    let en = sumRoleAdvance(role.enadv) + sumRoleAdvance(race.enadv);
    if (en <= 0) en = 1;
    return en;
}

/**
 * C: polyself / newhp — when polymorphed, monster HP lives in u.mh / u.mhmax / u.mhpeak.
 * Until `mons[]` / `rehumanize` port, mirror human max HP so hunger / traps / overexert_hp
 * see defined values. Call when toggling Upolyd if not going through applyBirthHpEnergy.
 */
export function syncPolyHpFromHumanShape() {
    const u = game.u;
    if (!u || !(u.Upolyd | 0)) return;
    const humanMax = Math.max(1, u.uhpmax | 0);
    if (u.mhmax == null) u.mhmax = humanMax;
    if (u.mhpeak == null) u.mhpeak = u.mhmax | 0;
    if (u.mh == null) u.mh = Math.min(Math.max(0, u.uhp | 0), u.mhmax | 0);
}

/**
 * C: u_init.c u_init_misc — u.uhp = u.uhpmax = u.uhppeak = newhp();
 * then adjabil(0,1); u.ulevel = 1 (adjabil partially in u_init_adjabil.js; caller sets ulevel).
 */
export function applyBirthHpEnergy() {
    const u = game.u;
    if (!u) return;
    /* C: attrib.c newhp — svm.moves == 0 && u.ulevel == 0: u.ualign.record = gu.urole.initrecord */
    const moves = game.moves ?? 0;
    const ulevel = u.ulevel ?? 0;
    if (moves === 0 && ulevel === 0) {
        u.ualign = u.ualign || { type: 0, record: 0 };
        u.ualign.record = game.urole?.initrecord ?? 0;
    }
    const hp = newhpInitial();
    const en = newpwInitial();
    u.uhp = hp;
    u.uhpmax = hp;
    u.uhppeak = hp;
    u.uen = en;
    u.uenmax = en;
    u.uenpeak = en;
    /* C: attrib.c newhp() — u.uhpinc[u.ulevel] before u.ulevel bumps (u.ulevel==0 here). */
    u.uhpinc = u.uhpinc || [];
    u.ueninc = u.ueninc || [];
    u.uhpinc[0] = hp;
    u.ueninc[0] = en;
    syncPolyHpFromHumanShape();
}
