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
import {
    A_STR, A_INT, A_WIS, A_DEX, A_CON, A_CHA,
    SATIATED, NOT_HUNGRY, HUNGRY, WEAK, FAINTING, FAINTED,
    MOD_ENCUMBER, HVY_ENCUMBER, EXT_ENCUMBER,
    LUCKMIN, LUCKMAX,
} from './const.js';
import { PMNAMES, MONSYMS } from './monst_data.js';

// include/you.h:247 Role_if()
function Role_if(pm) {
    const m = game.urole?.mnum;
    return m === pm || m === PMNAMES[pm];
}

/* src/hack.c near_capacity() and src/botl.c encumber_msg() need inventory
   weight and the carrying-capacity table. Nothing the hero starts with reaches
   MOD_ENCUMBER, so the unencumbered answer is the reachable one; it is recorded
   so the exercise draws it gates are not silently lost when that changes. */
function near_capacity() {
    note_unported_attrib('near_capacity');
    return 0; /* UNENCUMBERED */
}

function encumber_msg() {
    note_unported_attrib('encumber_msg');
}

function note_unported_attrib(what) {
    (game.unported ||= new Set()).add(what);
}


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
    /* C zeroes the whole struct u at startup, so aexe starts empty too;
       exercise() reads it every tenth move. */
    game.u.aexe = { a: new Array(A_MAX).fill(0) };

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

// include/attrib.h:25 ACURRSTR / ACURR(). Exceptional Strength is stored above
// 18 as 18/xx, and acurrstr() folds that back to a plain number.
// include/attrib.h:24 — #define ACURR(x) (acurr(x))
//
// It is the FUNCTION, not the array. Reading u.acurr.a[i] directly skips the
// abon/atemp terms and the 3..25 clamp, which is a different number whenever
// the hero is drained, boosted, or (as at makedog() time) not yet rolled.
export function ACURR(i) {
    return acurr(i);
}

export function acurrstr() {
    const str = ACURR(A_STR);

    if (str <= 18)
        return str;
    if (str <= 121)
        return 19 + Math.trunc((str - 18) / 2); /* 18/01..18/99 -> 19..69 */
    return str - 100;
}

// src/attrib.c:486 AVAL — tune value for exercise gains.
const AVAL = 50;

// include/attrib.h:23 AEXE(x)
const AEXE = (i) => game.u.aexe.a[i];
const setAEXE = (i, v) => { game.u.aexe.a[i] = v; };

// src/attrib.c:490 exercise() — accumulate exercise or abuse of an attribute.
//
// The rn2(19) is the whole point: gain is harder at higher attribute values,
// 79% at 3 down to 0% at 18. It is spent whenever the accumulator is still
// under AVAL, so an ordinary hero pays it every tenth move through exerper().
export function exercise(i, inc_or_dec) {
    if (i === A_INT || i === A_CHA)
        return; /* can't exercise these */

    /* no physical exercise while polymorphed; the body's temporary */
    if (game.u.umonnum !== game.u.umonster && i !== A_WIS)
        return;

    if (Math.abs(AEXE(i)) < AVAL) {
        /*
         *      Law of diminishing returns (Part I):
         *
         *      Gain is harder at higher attribute values.
         *      79% at "3" --> 0% at "18"
         *      Loss is even at all levels (50%).
         *
         *      Note: *YES* ACURR is the right one to use.
         */
        setAEXE(i, AEXE(i) + (inc_or_dec ? (rn2(19) > ACURR(i) ? 1 : 0)
                                         : -rn2(2)));
    }
    if (game.moves > 0 && (i === A_STR || i === A_CON))
        encumber_msg();
}

// src/attrib.c exerper() — the periodic accumulations, every 10 moves for
// hunger and encumbrance and every 5 for status.
export function exerper() {
    if (!(game.moves % 10)) {
        /* Hunger Checks */
        const hs = (game.u.uhunger > 1000) ? SATIATED
                 : (game.u.uhunger > 150) ? NOT_HUNGRY
                 : (game.u.uhunger > 50) ? HUNGRY
                 : (game.u.uhunger > 0) ? WEAK
                 : FAINTING;

        switch (hs) {
        case SATIATED:
            exercise(A_DEX, false);
            if (Role_if('PM_MONK'))
                exercise(A_WIS, false);
            break;
        case NOT_HUNGRY:
            exercise(A_CON, true);
            break;
        case WEAK:
            exercise(A_STR, false);
            if (Role_if('PM_MONK')) /* fasting */
                exercise(A_WIS, true);
            break;
        case FAINTING:
        case FAINTED:
            exercise(A_CON, false);
            break;
        }

        /* Encumbrance Checks */
        switch (near_capacity()) {
        case MOD_ENCUMBER:
            exercise(A_STR, true);
            break;
        case HVY_ENCUMBER:
            exercise(A_STR, true);
            exercise(A_DEX, false);
            break;
        case EXT_ENCUMBER:
            exercise(A_DEX, false);
            exercise(A_CON, false);
            break;
        }
    }

    /* status checks */
    if (!(game.moves % 5)) {
        /* Every one of these is driven by an intrinsic or affliction the hero
           cannot have before the property subsystem lands, so none can fire
           yet. They are written out rather than elided so the order of draws
           is already right when it does. */
        if (game.u.uprops?.CLAIRVOYANT && !game.u.uprops?.BLOCKED_CLAIRVOYANT)
            exercise(A_WIS, true);
        if (game.u.uprops?.REGENERATION)
            exercise(A_STR, true);
        if (game.u.uprops?.SICK || game.u.uprops?.VOMITING)
            exercise(A_CON, false);
        if (game.u.uprops?.CONFUSION || game.u.uprops?.HALLUC)
            exercise(A_WIS, false);
        if ((game.u.uprops?.WOUNDED_LEGS && !game.u.usteed)
            || game.u.uprops?.FUMBLING || game.u.uprops?.STUNNED)
            exercise(A_DEX, false);
    }
}

// src/attrib.c exerchk() — apply the accumulated exercise when due.
export function exerchk() {
    /*  Check out the periodic accumulations */
    exerper();

    /*  Are we ready for a test? */
    if (game.moves >= game.context.next_attrib_check && !game.multi) {
        /* The test itself adjusts attributes through adjattrib() and needs
           ATTRMIN/ATTRMAX plus the poly rules; it draws only through
           attrcurse(), which no reachable state triggers yet. */
        note_unported_attrib('exerchk:test');
    }
}

// src/attrib.c:1200 acurr() — a characteristic's effective value.
//
// This is NOT a read of u.acurr.a[]. It sums three arrays and then CLAMPS,
// and the floor is a hardcoded 3, not the racial ATTRMIN:
//
//     result = (tmp >= 25) ? 25 : (tmp <= 3) ? 3 : tmp;
//
// The floor is what makes initedog() work. newgame() calls makedog() before
// u_init_inventory_attrs(), so u.acurr is still zeroed when the starting pet
// reads ACURR(A_CHA) for its apport -- and gets 3, not 0. Reading the array
// directly would give 0, `apport > rn2(8)` would never pass, dog_goal would
// never settle on a goal, and every later object in the search box would spend
// another rn2(8) that C does not.
//
// Strength is encoded differently (3..18, then 19..118 for 18/xx, then
// 119..125), which is why it skips the shared clamp.
export function acurr(chridx) {
    const a = (o) => (o?.a?.[chridx] ?? 0);
    const tmp = a(game.u.abon) + a(game.u.atemp) + a(game.u.acurr);
    let result = 0;

    if (chridx === A_STR) {
        if (tmp >= STR19(25))
            result = STR19(25);         /* 125 */
        else
            result = Math.max(tmp, 3);
        /* GAUNTLETS_OF_POWER needs worn armour; recorded where uarmg lands. */
    } else if (chridx === A_CHA) {
        if (tmp < 18 && (game.youmonst?.data?.mlet === MONSYMS.S_NYMPH
                         || game.u.umonnum === PMNAMES.PM_AMOROUS_DEMON))
            result = 18;
    } else if (chridx === A_CON) {
        /* u_wield_art(ART_OGRESMASHER) */
    } else if (chridx === A_INT || chridx === A_WIS) {
        /* uarmh == DUNCE_CAP -> 6 */
    } else if (chridx === A_DEX) {
        ; /* there aren't any special cases for dexterity */
    }

    if (result === 0)                   /* none of the special cases applied */
        result = (tmp >= 25) ? 25 : (tmp <= 3) ? 3 : tmp;

    return result;
}

// include/attrib.h STR19()
const STR19 = (y) => (100 + y);

// src/attrib.c:411 change_luck() — adjust luck, clamped to LUCKMIN..LUCKMAX.
//
// The clamps are one-sided on purpose: a value already past a bound in the
// wrong direction is left alone, because only the sign-matching test fires.
export function change_luck(n) {
    game.u.uluck += n;
    if (game.u.uluck < 0 && game.u.uluck < LUCKMIN)
        game.u.uluck = LUCKMIN;
    if (game.u.uluck > 0 && game.u.uluck > LUCKMAX)
        game.u.uluck = LUCKMAX;
}
