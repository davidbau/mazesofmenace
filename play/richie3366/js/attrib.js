// attrib.js — Hero attributes.
// C ref: attrib.c — rnd_attr, init_attr, vary_init_attr, adjattrib (partial).

import { game } from './gstate.js';
import { rn2, rnd } from './rng.js';

export const A_STR = 0;
export const A_INT = 1;
export const A_WIS = 2;
export const A_DEX = 3;
export const A_CON = 4;
export const A_CHA = 5;
export const A_MAX = 6;

function abase(i) {
    return game.u.acurr.a[i];
}
function setAbase(i, v) {
    game.u.acurr.a[i] = v;
}
function amax(i) {
    return game.u.amax.a[i];
}
function setAmax(i, v) {
    game.u.amax.a[i] = v;
}

// C ref: attrib.c acurr() — clamp non-STR to [3,25]; STR min 3 (encoding stub)
export function acurr(i) {
    const u = game.u;
    const tmp = (u.abon?.a?.[i] || 0) + (u.atemp?.a?.[i] || 0) + (u.acurr?.a?.[i] || 0);
    if (i === A_STR) {
        // Full 18/xx encoding omitted; early sessions only need floor of 3
        return Math.max(tmp, 3);
    }
    if (tmp >= 25) return 25;
    if (tmp <= 3) return 3;
    return tmp;
}

// C ref: attrib.c exercise()
export function exercise(i, inc_or_dec) {
    if (i === A_INT || i === A_CHA) return;
    const u = game.u;
    if (!u.aexe) u.aexe = { a: [0, 0, 0, 0, 0, 0] };
    const ax = u.aexe.a[i] || 0;
    const AVAL = 50; // attrib.h
    if (Math.abs(ax) < AVAL) {
        // C: AEXE(i) += (inc_or_dec) ? (rn2(19) > ACURR(i)) : -rn2(2);
        if (inc_or_dec) {
            u.aexe.a[i] = ax + (rn2(19) > acurr(i) ? 1 : 0);
        } else {
            u.aexe.a[i] = ax - rn2(2);
        }
    }
}

function attrMax(i) {
    return game.urace?.attrmax?.[i] ?? 18;
}
function attrMin(i) {
    return game.urace?.attrmin?.[i] ?? 3;
}

// C ref: attrib.c rnd_attr()
function rnd_attr() {
    let x = rn2(100);
    let i;
    for (i = 0; i < A_MAX; ++i) {
        if ((x -= game.urole.attrdist[i]) < 0) break;
    }
    return i;
}

// C ref: attrib.c init_attr_role_redist()
function init_attr_role_redist(np, addition) {
    let tryct = 0;
    const adj = addition ? 1 : -1;
    while ((addition ? np > 0 : np < 0) && tryct < 100) {
        const i = rnd_attr();
        if (
            i >= A_MAX
            || (addition ? abase(i) >= attrMax(i) : abase(i) <= attrMin(i))
        ) {
            tryct++;
            continue;
        }
        tryct = 0;
        setAbase(i, abase(i) + adj);
        setAmax(i, amax(i) + adj);
        np -= adj;
    }
    return np;
}

// C ref: attrib.c init_attr()
export function init_attr(np) {
    const u = game.u;
    if (!u.acurr) u.acurr = { a: [0, 0, 0, 0, 0, 0] };
    if (!u.amax) u.amax = { a: [0, 0, 0, 0, 0, 0] };
    if (!u.atemp) u.atemp = { a: [0, 0, 0, 0, 0, 0] };
    if (!u.atime) u.atime = { a: [0, 0, 0, 0, 0, 0] };
    if (!u.abon) u.abon = { a: [0, 0, 0, 0, 0, 0] };

    for (let i = 0; i < A_MAX; i++) {
        u.acurr.a[i] = u.amax.a[i] = game.urole.attrbase[i];
        u.atemp.a[i] = u.atime.a[i] = 0;
        np -= game.urole.attrbase[i];
    }
    np = init_attr_role_redist(np, true);
    np = init_attr_role_redist(np, false);
    return np;
}

// C ref: attrib.c adjattrib() — increment path used by vary_init_attr / carry boost
export function adjattrib(ndx, incr, _msgflg) {
    if (!incr) return false;
    const old = abase(ndx);
    setAbase(ndx, old + incr);
    if (incr > 0) {
        if (abase(ndx) > amax(ndx)) {
            setAmax(ndx, abase(ndx));
            if (amax(ndx) > attrMax(ndx)) {
                setAbase(ndx, attrMax(ndx));
                setAmax(ndx, attrMax(ndx));
            }
        }
    } else {
        if (abase(ndx) < attrMin(ndx)) {
            // decrease-below-min path uses rn2; not hit by vary_init_attr on seed8000
            const decr = rn2(attrMin(ndx) - abase(ndx) + 1);
            setAbase(ndx, attrMin(ndx));
            setAmax(ndx, amax(ndx) - decr);
            if (amax(ndx) < attrMin(ndx)) setAmax(ndx, attrMin(ndx));
        }
    }
    return abase(ndx) !== old;
}

// C ref: attrib.c vary_init_attr()
export function vary_init_attr() {
    for (let i = 0; i < A_MAX; i++) {
        if (!rn2(20)) {
            const xd = rn2(7) - 2; // biased variation
            adjattrib(i, xd, true);
            if (abase(i) < amax(i)) setAmax(i, abase(i));
        }
    }
}

// C ref: attrib.c newhp() — u.ulevel==0 init path only (level-up deferred)
export function newhp() {
    const u = game.u;
    const roleAdv = game.urole?.hpadv || { infix: 8, inrnd: 0 };
    const raceAdv = game.urace?.hpadv || { infix: 2, inrnd: 0 };
    let hp;
    if ((u.ulevel | 0) === 0) {
        hp = (roleAdv.infix | 0) + (raceAdv.infix | 0);
        if ((roleAdv.inrnd | 0) > 0) hp += rnd(roleAdv.inrnd);
        if ((raceAdv.inrnd | 0) > 0) hp += rnd(raceAdv.inrnd);
        // Alignment init when moves==0 is done in u_init_misc (C newhp + u_init_misc).
    } else {
        // Level-up path not ported yet.
        hp = (roleAdv.lofix | 0) + (raceAdv.lofix | 0);
    }
    if (hp <= 0) hp = 1;
    return hp;
}

// C ref: exper.c newpw() — u.ulevel==0 init path only
export function newpw() {
    const u = game.u;
    const roleAdv = game.urole?.enadv || { infix: 1, inrnd: 0 };
    const raceAdv = game.urace?.enadv || { infix: 1, inrnd: 0 };
    let en;
    if ((u.ulevel | 0) === 0) {
        en = (roleAdv.infix | 0) + (raceAdv.infix | 0);
        if ((roleAdv.inrnd | 0) > 0) en += rnd(roleAdv.inrnd);
        if ((raceAdv.inrnd | 0) > 0) en += rnd(raceAdv.inrnd);
    } else {
        en = 1;
    }
    if (en <= 0) en = 1;
    return en;
}

// C ref: attrib.c change_luck() — clamp u.uluck; no RNG
export function change_luck(n) {
    const u = game.u || (game.u = {});
    let luck = (u.uluck || 0) + (n | 0);
    if (luck > 10) luck = 10;
    if (luck < -10) luck = -10;
    u.uluck = luck;
}
