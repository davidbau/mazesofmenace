// encumbr.js — Carry capacity tier for botl / enlightenment.
// C ref: hack.h encumbrance_types, hack.c near_capacity(), inv_weight(), botl.c enc_stat[],
// cmd.c (encumbrance enlight).

import { game } from './gstate.js';
import { NH5_COIN_CLASS } from './nh5_objclass.js';
import {
    A_CON,
    WT_WEIGHTCAP_STRCON,
    WT_WEIGHTCAP_SPARE,
    MAX_CARR_CAP,
} from './const.js';
import { acurrLikeC, acurrstrLikeC } from './attr_acurr_like_c.js';

export const ENC = {
    UNENCUMBERED: 0,
    SLT_ENCUMBER: 1,
    MOD_ENCUMBER: 2,
    HVY_ENCUMBER: 3,
    EXT_ENCUMBER: 4,
    OVERLOADED: 5,
};

/** C: botl.c enc_stat[] — index matches ENC (0 unused). */
const ENC_WORD = ['', 'burdened', 'stressed', 'strained', 'overtaxed', 'overloaded'];

/**
 * C: hack.c **`weight_cap()`** core — **`WT_WEIGHTCAP_STRCON * (ACURRSTR + ACURR(A_CON)) + WT_WEIGHTCAP_SPARE`**
 * capped by **`MAX_CARR_CAP`**, floored at **1** (poly / levitation / wounded legs omitted until ported).
 * @param {import('./gstate.js').game} g
 * @returns {number}
 */
export function syncHeroWeightCapStrConBaselineLikeC(g) {
    const u = g?.u;
    if (!u?.acurr?.a) return 1;
    const str = acurrstrLikeC(g);
    const con = acurrLikeC(A_CON, g);
    let carrcap = WT_WEIGHTCAP_STRCON * (str + con) + WT_WEIGHTCAP_SPARE;
    if (carrcap > MAX_CARR_CAP) carrcap = MAX_CARR_CAP;
    const cap = Math.max(carrcap | 0, 1);
    u.weight_cap = cap;
    return cap;
}

/**
 * C: hack.c **`inv_weight()`** weight sum on **`gi.invent`** (coins **`(quan+50)/100`**, boulder
 * when **`!throws_rocks`** omitted until poly **`throws_rocks`** is ported) minus **`weight_cap()`**.
 * @param {import('./gstate.js').game} g
 */
export function heroInventRawWtLikeC(g) {
    let w = 0;
    for (let o = g?.invent; o; o = o.nobj) {
        if ((o.oclass | 0) === NH5_COIN_CLASS) {
            const q = Number(o.quan) || 0;
            w += Math.trunc((q + 50) / 100);
        } else {
            /* C: boulder omitted when **`throws_rocks`** — count always until poly port */
            w += o.owt | 0;
        }
    }
    return w;
}

/**
 * C: **`hack.c`** **`inv_weight()`** return value into **`u.inv_weight`** (**`raw - weight_cap`**)
 * so **`calc_capacity(0)`** matches C when **`weight_cap > 1`**.
 * @param {import('./gstate.js').game} g
 */
export function syncHeroInvWeightNetLikeC(g) {
    const u = g?.u;
    if (!u) return 0;
    const raw = heroInventRawWtLikeC(g);
    const wc = u.weight_cap | 0;
    u.inv_weight = raw - wc;
    return u.inv_weight;
}

/**
 * C: hack.c near_capacity(void) — **`calc_capacity(0)`** when **`weight_cap > 1`**; else stub **`u.near_capacity`**.
 * @param {import('./gstate.js').game} [g]
 * @returns {number}
 */
export function nearCapacity(g = game) {
    const u = g?.u;
    if (!u) return 0;
    if ((u.weight_cap | 0) > 1) return calcCapacityXtraWtLikeC(g, 0);
    return u.near_capacity ?? 0;
}

/**
 * C: **`hack.c`** **`calc_capacity(int xtra_wt)`** — **`(inv_weight + xtra_wt)`** vs **`weight_cap`** tier **0..5**.
 * @param {import('./gstate.js').game} g
 * @param {number} xtraWt
 */
export function calcCapacityXtraWtLikeC(g, xtraWt) {
    const u = g?.u;
    if (!u) return ENC.UNENCUMBERED;
    const wt = (u.inv_weight | 0) + (xtraWt | 0);
    const wc = u.weight_cap | 0;
    if (wt <= 0) return ENC.UNENCUMBERED;
    if (wc <= 1) return ENC.OVERLOADED;
    const cap = Math.trunc((wt * 2) / wc) + 1;
    return cap > ENC.OVERLOADED ? ENC.OVERLOADED : cap;
}

/**
 * @param {number} [cap] — u.near_capacity result (0 = unencumbered)
 * @param {boolean} [final] — past tense like C enlightenment `final`
 */
export function enlightEncumbranceLine(cap, final = false) {
    const c = cap == null || cap <= 0 ? ENC.UNENCUMBERED : Math.min(cap, ENC.OVERLOADED);
    if (c === ENC.UNENCUMBERED) return '  You are unencumbered.';
    const word = ENC_WORD[c] || 'burdened';
    const adj = c === ENC.SLT_ENCUMBER ? 'slightly'
        : c === ENC.MOD_ENCUMBER ? 'moderately'
            : c === ENC.HVY_ENCUMBER ? 'very'
                : c === ENC.EXT_ENCUMBER ? 'extremely'
                    : 'not possible';
    const verb = final ? 'was' : 'is';
    const slow = c < ENC.OVERLOADED ? ' slowed' : '';
    return `  You are ${word}; movement ${verb} ${adj}${slow}.`;
}
