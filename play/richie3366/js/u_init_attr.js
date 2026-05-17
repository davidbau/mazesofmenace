// u_init_attr.js — Hero starting attributes from role + race.
// C ref: attrib.c init_attr(), init_attr_role_redist(), rnd_attr(), vary_init_attr();
//        u_init.c u_init_inventory_attrs() calls init_attr(75) then vary_init_attr(); zeros u.aexe[].

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { A_MAX, A_STR, A_CON } from './const.js';
import { adjattrib, getRaceAttrMin, getRaceAttrMax } from './attrib.js';
import { syncHeroInvWeightNetLikeC, syncHeroWeightCapStrConBaselineLikeC } from './encumbr.js';

/**
 * C: attrib.c rnd_attr — uses gu.urole.attrdist[].
 * @returns {number} attribute index 0..A_MAX-1, or A_MAX on failure
 */
function rndAttr() {
    const dist = game.urole?.attrdist;
    if (!dist || dist.length < A_MAX) return A_MAX;
    let x = rn2(100);
    for (let i = 0; i < A_MAX; i++) {
        x -= dist[i];
        if (x < 0) return i;
    }
    return A_MAX;
}

/**
 * C: attrib.c init_attr_role_redist
 * @param {number} np
 * @param {boolean} addition
 */
function initAttrRoleRedist(np, addition) {
    const u = game.u;
    if (!u?.acurr?.a || !u?.amax?.a) return np;
    let tryct = 0;
    const adj = addition ? 1 : -1;

    while ((addition ? np > 0 : np < 0) && tryct < 100) {
        const i = rndAttr();
        const ab = u.acurr.a[i] ?? 0;
        const amn = getRaceAttrMin(i);
        const amx = getRaceAttrMax(i);
        if (i >= A_MAX
            || (addition ? (ab >= amx) : (ab <= amn))) {
            tryct++;
            continue;
        }
        tryct = 0;
        u.acurr.a[i] = ab + adj;
        u.amax.a[i] = (u.amax.a[i] ?? ab) + adj;
        np -= adj;
    }
    return np;
}

/**
 * C: attrib.c init_attr(int np) — np is 75 in u_init_inventory_attrs().
 * @param {number} np
 */
export function initAttr(np) {
    const u = game.u;
    const base = game.urole?.attrbase;
    if (!u) return;
    if (!u.acurr?.a) u.acurr = { a: [] };
    if (!u.amax?.a) u.amax = { a: [] };
    if (!base || base.length < A_MAX) return;

    for (let i = 0; i < A_MAX; i++) {
        const b = base[i];
        u.acurr.a[i] = b;
        u.amax.a[i] = b;
        u.abon = u.abon || { a: [] };
        u.abon.a[i] = 0;
        u.atemp = u.atemp || { a: [] };
        u.atime = u.atime || { a: [] };
        u.atemp.a[i] = 0;
        u.atime.a[i] = 0;
        u.aexe = u.aexe || { a: [] };
        u.aexe.a[i] = 0;
        np -= b;
    }

    np = initAttrRoleRedist(np, true);
    np = initAttrRoleRedist(np, false);

    game.disp = game.disp || {};
    game.disp.botl = true;
}

/** C: attrib.c vary_init_attr(void) */
export function varyInitAttr() {
    const u = game.u;
    if (!u?.acurr?.a || !u?.amax?.a) return;

    for (let i = 0; i < A_MAX; i++) {
        if (rn2(20)) continue;
        const xd = rn2(7) - 2;
        adjattrib(i, xd, true);
        if ((u.acurr.a[i] ?? 0) < (u.amax.a[i] ?? 0)) u.amax.a[i] = u.acurr.a[i];
    }
}

/** @param {number} np — C passes 75 */
export function applyInitAttrPipeline(np) {
    initAttr(np);
    varyInitAttr();
}

/**
 * C: u_init.c u_init_carry_attr_boost — raise Str/Con while **`inv_weight() > 0`**.
 * Uses **`syncHeroWeightCapStrConBaselineLikeC`** so capacity tracks **`adjattrib`** bumps (C **`weight_cap()`**).
 * @param {import('./gstate.js').game} g
 */
export function uInitCarryAttrBoostLikeC(g) {
    const u = g?.u;
    if (!u) return;
    for (;;) {
        syncHeroWeightCapStrConBaselineLikeC(g);
        syncHeroInvWeightNetLikeC(g);
        if ((u.inv_weight | 0) <= 0) break;
        if (adjattrib(A_STR, 1, true)) continue;
        if (adjattrib(A_CON, 1, true)) continue;
        break;
    }
}
