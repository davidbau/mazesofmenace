// attrib.js — the hero's characteristics.
// C ref: src/attrib.c
//
// init_attr(75) hands out the points the role's attrbase[] does not already
// account for, one rnd_attr() draw per point, retrying when the chosen
// characteristic is already at its racial cap. So the number of rn2(100) calls
// depends on the role's base spread AND the race's attrmin/attrmax — a wrong
// race silently changes the draw count.
//
// vary_init_attr() then rolls rn2(20) for each of the six, and rn2(7) only for
// the ones that pass, so its count depends on the first six results.

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { role_abil, race_abil } from './role_data.js';

// include/attrib.h — A_STR, A_INT, A_WIS, A_DEX, A_CON, A_CHA
export const A_MAX = 6;

const ABASE = (i) => game.u.acurr.a[i];
const setABASE = (i, v) => { game.u.acurr.a[i] = v; };
const AMAX = (i) => game.u.amax.a[i];
const setAMAX = (i, v) => { game.u.amax.a[i] = v; };
const ATTRMIN = (i) => game.urace.attrmin[i];
const ATTRMAX = (i) => game.urace.attrmax[i];

// src/attrib.c:679 rnd_attr() — pick a characteristic by the role's attrdist
// weights. Returns A_MAX when the weights do not cover the draw, and the
// caller treats that as a retry.
function rnd_attr() {
    let x = rn2(100);
    let i;
    for (i = 0; i < A_MAX; ++i)
        if ((x -= game.urole.attrdist[i]) < 0)
            break;
    return i;
}

// src/attrib.c:695 init_attr_role_redist()
function init_attr_role_redist(np, addition) {
    let tryct = 0;
    const adj = addition ? 1 : -1;

    while ((addition ? (np > 0) : (np < 0)) && tryct < 100) {
        const i = rnd_attr();

        if (i >= A_MAX
            || (addition ? (ABASE(i) >= ATTRMAX(i))
                         : (ABASE(i) <= ATTRMIN(i)))) {
            tryct++;
            continue;
        }
        tryct = 0;
        setABASE(i, ABASE(i) + adj);
        setAMAX(i, AMAX(i) + adj);
        np -= adj;
    }
    return np;
}

// src/attrib.c:714 init_attr()
export function init_attr(np) {
    game.u.acurr = { a: new Array(A_MAX).fill(0) };
    game.u.amax = { a: new Array(A_MAX).fill(0) };
    game.u.atemp = { a: new Array(A_MAX).fill(0) };
    game.u.atime = { a: new Array(A_MAX).fill(0) };

    for (let i = 0; i < A_MAX; i++) {
        const base = game.urole.attrbase[i];
        setABASE(i, base);
        setAMAX(i, base);
        np -= base;
    }

    /* distribute leftover points, then remove any overshoot */
    np = init_attr_role_redist(np, true);
    np = init_attr_role_redist(np, false);
}

// src/attrib.c:762 vary_init_attr()
export function vary_init_attr() {
    for (let i = 0; i < A_MAX; i++)
        if (!rn2(20)) {
            const xd = rn2(7) - 2;   /* biased variation */
            adjattrib(i, xd, true);
            if (ABASE(i) < AMAX(i))
                setAMAX(i, ABASE(i));
        }
}

// src/attrib.c:31 adjattrib() — the only draw is the rn2() that decides how
// much of the excess to take off AMAX when a decrease would go below the
// racial minimum.
function adjattrib(ndx, incr, msgflg) {
    if (!incr)
        return false;

    setABASE(ndx, ABASE(ndx) + incr);
    if (incr > 0) {
        if (ABASE(ndx) > AMAX(ndx)) {
            setAMAX(ndx, ABASE(ndx));
            if (AMAX(ndx) > ATTRMAX(ndx)) {
                setABASE(ndx, ATTRMAX(ndx));
                setAMAX(ndx, ATTRMAX(ndx));
            }
        }
    } else {
        if (ABASE(ndx) < ATTRMIN(ndx)) {
            const decr = rn2(ATTRMIN(ndx) - ABASE(ndx) + 1);
            setABASE(ndx, ATTRMIN(ndx));
            setAMAX(ndx, AMAX(ndx) - decr);
            if (AMAX(ndx) < ATTRMIN(ndx))
                setAMAX(ndx, ATTRMIN(ndx));
        }
    }
    return true;
}

// src/attrib.c:990 adjabil() — grant the intrinsics a role or race has earned
// by reaching `newlevel`. Draws nothing, but what it sets decides whether
// u_calc_moveamt() draws: Fast costs an rn2(3) every single turn.
export function adjabil(oldlevel, newlevel) {
    const u = game.u;
    u.intrinsic ||= {};

    const grant = (table) => {
        for (const [ulevel, ability] of table) {
            if (ulevel > oldlevel && ulevel <= newlevel)
                u.intrinsic[ability] = true;
            else if (ulevel > newlevel && ulevel <= oldlevel)
                delete u.intrinsic[ability];
        }
    };

    grant(role_abil(game.flags.initrole ?? 0));
    grant(race_abil(game.flags.initrace ?? 0));
}

// include/youprop.h — Fast is the intrinsic; Very_fast additionally needs
// speed boots, a potion or a spell, none of which exist yet.
export const Fast = () => !!game.u.intrinsic?.HFast;
export const Very_fast = () => false;
