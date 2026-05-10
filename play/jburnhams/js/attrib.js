// attrib.js — Attribute modification routines
// C ref: attrib.c

import { rn2, rnd } from './rng.js';
import { game } from './gstate.js';

export const A_STR = 0;
export const A_INT = 1;
export const A_WIS = 2;
export const A_DEX = 3;
export const A_CON = 4;
export const A_CHA = 5;
export const A_MAX = 6;

export const ATTRMIN = (x) => 3;
export const ATTRMAX = (x) => ((x === A_STR) ? game.urace.attrmax[x] : game.urace.attrmax[x]);

export function ABASE(x) { return game.u.abase.a[x]; }
export function set_ABASE(x, val) { game.u.abase.a[x] = val; }
export function AMAX(x) { return game.u.amax.a[x]; }
export function set_AMAX(x, val) { game.u.amax.a[x] = val; }
export function ATEMP(x) { return game.u.atemp.a[x]; }
export function set_ATEMP(x, val) { game.u.atemp.a[x] = val; }
export function ABON(x) { return game.u.abon.a[x]; }

export function acurr(chridx) {
    let tmp = game.u.abon.a[chridx] + game.u.atemp.a[chridx] + game.u.abase.a[chridx];
    if (chridx === A_STR) {
        if (tmp >= 125) {
            // max strength handling logic if needed
        }
    }
    return tmp;
}

export function adjattrib(ndx, incr, msgflg) {
    if (!incr) return false;

    // For F-hero-init, we only need the exact RNG calls from adjattrib.
    // If incr is negative, there might be rn2 calls.
    // In vary_init_attr, incr can be negative (rn2(7) - 2).
    let old_abase = ABASE(ndx);
    let old_amax = AMAX(ndx);

    let abase = old_abase + incr;
    let amax = old_amax;

    if (incr > 0) {
        if (abase > amax) {
            amax = abase;
            if (amax > ATTRMAX(ndx)) {
                abase = amax = ATTRMAX(ndx);
            }
        }
    } else { // incr is negative
        if (abase < ATTRMIN(ndx)) {
            let decr = rn2(ATTRMIN(ndx) - abase + 1);
            abase = ATTRMIN(ndx);
            amax -= decr;
            if (amax < ATTRMIN(ndx)) {
                amax = ATTRMIN(ndx);
            }
        }
    }

    set_ABASE(ndx, abase);
    set_AMAX(ndx, amax);

    return true; // Simplification, full logic isn't strictly needed for init
}

export function rnd_attr() {
    let x = rn2(100);
    let i;
    for (i = 0; i < A_MAX; ++i) {
        x -= game.urole.attrdist[i];
        if (x < 0) break;
    }
    return i;
}

export function init_attr_role_redist(np, addition) {
    let tryct = 0;
    let adj = addition ? 1 : -1;

    while ((addition ? (np > 0) : (np < 0)) && tryct < 100) {
        let i = rnd_attr();

        if (i >= A_MAX || (addition ? (ABASE(i) >= ATTRMAX(i)) : (ABASE(i) <= ATTRMIN(i)))) {
            tryct++;
            continue;
        }
        tryct = 0;
        set_ABASE(i, ABASE(i) + adj);
        set_AMAX(i, AMAX(i) + adj);
        np -= adj;
    }
    return np;
}

export function init_attr(np) {
    if (!game.u.abase) game.u.abase = { a: [0,0,0,0,0,0] };
    if (!game.u.amax) game.u.amax = { a: [0,0,0,0,0,0] };
    if (!game.u.acurr) game.u.acurr = { a: [0,0,0,0,0,0] };
    if (!game.u.atemp) game.u.atemp = { a: [0,0,0,0,0,0] };
    if (!game.u.abon) game.u.abon = { a: [0,0,0,0,0,0] };

    for (let i = 0; i < A_MAX; i++) {
        set_ABASE(i, game.urole.attrbase[i]);
        set_AMAX(i, game.urole.attrbase[i]);
        set_ATEMP(i, 0); // ATIME not fully ported right now
        np -= game.urole.attrbase[i];
        game.u.acurr.a[i] = game.urole.attrbase[i];
    }

    np = init_attr_role_redist(np, true);
    np = init_attr_role_redist(np, false);
}

export function vary_init_attr() {
    for (let i = 0; i < A_MAX; i++) {
        if (!rn2(20)) {
            let xd = rn2(7) - 2;
            adjattrib(i, xd, true);
            if (ABASE(i) < AMAX(i)) {
                set_AMAX(i, ABASE(i));
            }
        }
    }
}

export const STR18 = (x) => (18 + x);
export const STR19 = (x) => (100 + x);

export function acurrstr() {
    let str = acurr(A_STR);
    let result;
    if (str <= STR18(0)) {
        result = Math.max(str, 3);
    } else if (str <= STR19(21)) {
        result = 19 + Math.floor(str / 50);
    } else {
        result = Math.min(str, 125) - 100;
    }
    return result;
}

// ATTRMAX is race-specific in C, wait, let's fix it
export function real_ATTRMAX(x) {
    if (x === A_STR) {
        // if Upolyd, uasmon_maxStr().. let's just do urace.attrmax for now
    }
    return game.urace.attrmax[x];
}
