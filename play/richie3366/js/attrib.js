// attrib.js — Hero attributes and luck.
// C ref: attrib.c acurr, adjattrib, change_luck(), exercise(); you.h ATTRMIN/ATTRMAX.

import { game } from './gstate.js';
import {
    LUCKMIN,
    LUCKMAX,
    STR18,
    A_STR,
    A_INT,
    A_WIS,
    A_DEX,
    A_CON,
    A_CHA,
    A_MAX,
} from './const.js';
import { rn1, rn2 } from './rng.js';
import { nearCapacity, ENC } from './encumbr.js';
import { acurrLikeC } from './attr_acurr_like_c.js';

const DEF_ATTRMIN = Object.freeze([3, 3, 3, 3, 3, 3]);
const DEF_ATTRMAX = Object.freeze([STR18(100), 18, 18, 18, 18, 18]);

/** @param {number} ndx A_STR…A_CHA — C ATTRMIN(ndx) */
export function getRaceAttrMin(ndx) {
    return game.urace?.attrmin?.[ndx] ?? DEF_ATTRMIN[ndx] ?? 3;
}

/** @param {number} ndx A_STR…A_CHA — C ATTRMAX(ndx) */
export function getRaceAttrMax(ndx) {
    return game.urace?.attrmax?.[ndx] ?? DEF_ATTRMAX[ndx] ?? 18;
}

/** @param {number} ndx A_STR…A_CHA */
function attrMin(ndx) {
    return getRaceAttrMin(ndx);
}

/** @param {number} ndx A_STR…A_CHA */
function attrMax(ndx) {
    return getRaceAttrMax(ndx);
}

/**
 * C: attrib.c acurr(x) — effective attribute (**`u.abon`/`u.atemp`/`u.acurr`** sum + C specials).
 * @param {number} x attrib_types A_STR…A_CHA
 */
export function acurr(x) {
    return acurrLikeC(x, game);
}

/**
 * C: botl.c get_strength_str — string for **St:** on **`do_statusline1`** from **ACURR(A_STR)**.
 * Encoded strength: plain **3–18**, **18/01–18/99**, **18/\*\*** at **STR18(100)**, **19–25** when **> STR18(100)** (**`%2d`**).
 */
export function getStrengthStrLikeC() {
    const st = acurr(A_STR);
    if (st > 18) {
        if (st > STR18(100))
            return String(st - 100).padStart(2, ' ');
        if (st < STR18(100))
            return `18/${String(st - 18).padStart(2, '0')}`;
        return '18/**';
    }
    return `${st}`;
}

/** C: change_luck(schar n) — adjust u.uluck with bounds; no RNG. */
export function changeLuck(n) {
    const u = game.u;
    u.uluck = (u.uluck ?? 0) + n;
    if (u.uluck < 0 && u.uluck < LUCKMIN) u.uluck = LUCKMIN;
    if (u.uluck > 0 && u.uluck > LUCKMAX) u.uluck = LUCKMAX;
}

/**
 * C: attrib.c adjattrib(int ndx, int incr, int msgflg)
 * JS maps ABASE/AMAX onto u.acurr.a / u.amax.a (no separate ABASE until invent/poly port).
 * @param {number} attr — A_STR … A_CHA
 * @param {number} change — delta (positive or negative)
 * @param {boolean|number} tell — C msgflg: positive => no message (hero init uses truthy skip)
 * @returns {boolean} true if ACURR changed
 */
export function adjattrib(attr, change, tell) {
    void tell;
    const u = game.u;
    if (!change || !u?.acurr?.a || !u?.amax?.a) return false;
    if (u.Fixed_abil) return false;

    const old_acurr = acurr(attr);
    const old_abase = u.acurr.a[attr] ?? 10;
    const AMN = attrMin(attr);
    const AMX = attrMax(attr);

    u.acurr.a[attr] = old_abase + change;

    if (change > 0) {
        if (u.acurr.a[attr] > u.amax.a[attr]) {
            u.amax.a[attr] = u.acurr.a[attr];
            if (u.amax.a[attr] > AMX) u.acurr.a[attr] = u.amax.a[attr] = AMX;
        }
    } else {
        if (u.acurr.a[attr] < AMN) {
            const decr = rn2(AMN - u.acurr.a[attr] + 1);
            u.acurr.a[attr] = AMN;
            u.amax.a[attr] -= decr;
            if (u.amax.a[attr] < AMN) u.amax.a[attr] = AMN;
        }
    }

    if (acurr(attr) === old_acurr) return false;

    if (u.atemp?.a) u.atemp.a[attr] = 0;
    if (u.atime?.a) u.atime.a[attr] = 0;
    if (u.aexe?.a) u.aexe.a[attr] = 0;

    game.disp = game.disp || {};
    game.disp.botl = true;
    return true;
}

/** C: attrib.c #define AVAL 50 — tune value for exercise gains */
const AVAL = 50;

function ensureAexe(u) {
    if (!u) return;
    if (!u.aexe?.a || u.aexe.a.length < A_MAX) {
        const prev = u.aexe?.a || [];
        u.aexe = { a: Array.from({ length: A_MAX }, (_, j) => prev[j] ?? 0) };
    }
}

/**
 * C: attrib.c exercise(int i, boolean inc_or_dec)
 * Encumbrance message (C encumber_msg on Str/Con) not called — pickup.encumberMsg is async.
 * @param {number} i — A_STR … A_CHA
 * @param {boolean} incOrDec
 */
export function exercise(i, incOrDec) {
    const u = game.u;
    if (!u) return;
    if (i === A_INT || i === A_CHA) return;
    if ((u.Upolyd | 0) && i !== A_WIS) return;
    ensureAexe(u);
    let ax = u.aexe.a[i] | 0;
    if (Math.abs(ax) >= AVAL) return;
    ax += incOrDec ? (rn2(19) > acurr(i) ? 1 : 0) : -rn2(2);
    u.aexe.a[i] = ax;
    /* C: if (svm.moves > 0 && (i == A_STR || i == A_CON)) encumber_msg(); */
}

/** C: sgn() — sign of int */
function sgn(x) {
    return x > 0 ? 1 : x < 0 ? -1 : 0;
}

/* C: attrib.c exertext[][] — order A_STR…A_CHA; Int/Cha unused */
const EXERTEXT = Object.freeze([
    ['exercising diligently', 'exercising properly'],
    [null, null],
    ['very observant', 'paying attention'],
    ['working on your reflexes', 'working on reflexes lately'],
    ['leading a healthy life-style', 'watching your health'],
    [null, null],
]);

/**
 * C: attrib.c exerper(void) — hunger / encumbrance / status hooks into exercise().
 * Uses u.uhunger when set (C eat.c init_uhunger: 900); skips hunger branch otherwise.
 */
export function exerper() {
    const g = game;
    const u = g.u;
    if (!u) return;
    const moves = g.moves | 0;

    if (!(moves % 10)) {
        const uh = u.uhunger;
        if (typeof uh === 'number') {
            const band =
                uh > 1000 ? 'sat'
                    : uh > 150 ? 'not'
                        : uh > 50 ? 'hungry'
                            : uh > 0 ? 'weak'
                                : 'faint';
            const monk = g.urole?.abbr === 'Mon';
            if (band === 'sat') {
                exercise(A_DEX, false);
                if (monk) exercise(A_WIS, false);
            } else if (band === 'not') {
                exercise(A_CON, true);
            } else if (band === 'weak') {
                exercise(A_STR, false);
                if (monk) exercise(A_WIS, true);
            } else if (band === 'faint') {
                exercise(A_CON, false);
            }
        }

        const cap = nearCapacity();
        if (cap === ENC.MOD_ENCUMBER) exercise(A_STR, true);
        else if (cap === ENC.HVY_ENCUMBER) {
            exercise(A_STR, true);
            exercise(A_DEX, false);
        } else if (cap === ENC.EXT_ENCUMBER) {
            exercise(A_DEX, false);
            exercise(A_CON, false);
        }
    }

    if (!(moves % 5)) {
        if ((u.HClairvoyant | 0) && !(u.BClairvoyant | 0)) exercise(A_WIS, true);
        if (u.HRegeneration) exercise(A_STR, true);
        if (u.usick || u.Vomiting) exercise(A_CON, false);
        if (u.Confusion || u.Hallucination) exercise(A_WIS, false);
        if (((u.wounded_legs | 0) && !u.usteed) || u.Fumbling || u.HStun) exercise(A_DEX, false);
    }
}

/**
 * C: attrib.c exerchk(void) — after exerper, maybe apply AEXE and schedule next check.
 * @returns {string[]} pline texts ("You …") for caller to await pline()
 */
export function collectExerchkPlines() {
    const plines = [];
    const g = game;
    const u = g.u;
    if (!u) return plines;

    exerper();

    g.context = g.context || {};
    if (g.context.next_attrib_check == null) g.context.next_attrib_check = 600;
    const nextChk = g.context.next_attrib_check;
    const moves = g.moves | 0;
    if (moves < nextChk || (g.multi | 0)) return plines;

    ensureAexe(u);
    for (let i = 0; i < A_MAX; i++) {
        const ax0 = u.aexe.a[i] | 0;
        if (!ax0) continue;

        const modVal = sgn(ax0);
        let lolim = attrMin(i);
        let hilim = attrMax(i);
        if (hilim > 18) hilim = 18;
        const abase = u.acurr?.a?.[i] ?? 10;
        if ((ax0 < 0 ? abase <= lolim : abase >= hilim)) {
            u.aexe.a[i] = (Math.abs(ax0) / 2) * modVal;
            continue;
        }
        if ((u.Upolyd | 0) && i !== A_WIS) {
            u.aexe.a[i] = (Math.abs(ax0) / 2) * modVal;
            continue;
        }

        const thresh = i !== A_WIS ? Math.trunc((Math.abs(ax0) * 2) / 3) : Math.abs(ax0);
        if (rn2(AVAL) > thresh) {
            u.aexe.a[i] = (Math.abs(ax0) / 2) * modVal;
            continue;
        }

        let axPost = ax0;
        if (adjattrib(i, modVal, -1)) {
            axPost = 0;
            const pair = EXERTEXT[i];
            const j = modVal > 0 ? 0 : 1;
            const phrase = pair?.[j];
            if (phrase) {
                const lead = modVal > 0 ? 'must have been' : "haven't been";
                plines.push(`You ${lead} ${phrase}.`);
            }
        }
        u.aexe.a[i] = (Math.abs(axPost) / 2) * modVal;
    }

    g.context.next_attrib_check += rn1(200, 800);
    return plines;
}
