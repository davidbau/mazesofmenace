// mkobj_scroll_class_rng_like_c.js — C mkobj.c mkobj(SCROLL_CLASS) + u_init.c ini_inv_mkobj_filter (Monk scroll).
// C refs: mkobj.c mkobj(); u_init.c ini_inv_mkobj_filter(); objects.h SCROLL_CLASS oc_prob order (OBJECTS_INIT).
// `otyp` indices match cpp **`OBJECTS_ENUM`** / **`OC_COST_BY_OTYP`**.

import { rnd, rn2 } from './rng.js';

/**
 * SCROLL_CLASS rows in **`objects[]`** order: **`[otyp, oc_prob]`**.
 * From **`OBJECTS_INIT`** cpp expansion (sum **1000**).
 * @type {readonly (readonly [number, number])[]}
 */
export const SCROLL_CLASS_MKOBJ_OC_PROB_ROWS = Object.freeze([
    [9, 0],
    [323, 63],
    [324, 45],
    [325, 53],
    [326, 35],
    [327, 65],
    [328, 80],
    [329, 45],
    [330, 15],
    [331, 15],
    [332, 90],
    [333, 55],
    [334, 33],
    [335, 25],
    [336, 180],
    [337, 45],
    [338, 35],
    [339, 30],
    [340, 18],
    [341, 15],
    [342, 15],
    [343, 15],
    [344, 0],
    [345, 0],
    [346, 0],
    [347, 0],
    [348, 0],
    [349, 0],
    [350, 0],
    [351, 0],
    [352, 0],
    [353, 0],
    [354, 0],
    [355, 0],
    [356, 0],
    [357, 0],
    [358, 0],
    [359, 0],
    [360, 0],
    [361, 0],
    [362, 0],
    [363, 0],
    [364, 28],
]);

/** C: o_init.c init_oclass_probs — SCROLL_CLASS total. */
export function scrollClassMkobjProbTotalLikeC() {
    let s = 0;
    for (const r of SCROLL_CLASS_MKOBJ_OC_PROB_ROWS) s += r[1] | 0;
    return s;
}

/** C: mkobj.c mkobj — rnd(total) + walk `oc_prob` (no mksobj yet). */
export function mkobjScrollOtypLeafDrawLikeC() {
    const rows = SCROLL_CLASS_MKOBJ_OC_PROB_ROWS;
    const tot = scrollClassMkobjProbTotalLikeC();
    let prob = rnd(tot);
    let i = 0;
    while (i < rows.length) {
        prob -= rows[i][1] | 0;
        if (prob <= 0) break;
        i++;
    }
    if (i >= rows.length) i = rows.length - 1;
    return rows[i][0] | 0;
}

/** C: mkobj.c next_ident — ident += rnd(2) */
function nextIdentLikeC() {
    rnd(2);
}

/** C: mkobj.c mksobj_init — SCROLL_CLASS blessorcurse(otmp, 4) */
function mksobjInitScrollBless4LikeC() {
    if (!rn2(4)) {
        rn2(2);
    }
}

/** C: mkobj.c FOOD default tail after PANCAKE mksobj fallback. */
function mksobjInitPancakeFoodTailLikeC() {
    if (!rn2(6)) {
        rn2(2);
    }
}

/**
 * One mkobj(SCROLL_CLASS) draw + mksobj(otyp, TRUE, FALSE) init scroll RNG.
 * @returns {number} scroll `otyp`
 */
export function mkobjScrollClassFullDrawLikeC() {
    const otyp = mkobjScrollOtypLeafDrawLikeC();
    nextIdentLikeC();
    mksobjInitScrollBless4LikeC();
    return otyp | 0;
}

/**
 * C: u_init.c ini_inv_mkobj_filter(SCROLL_CLASS, got_sp1=FALSE) for **Monk** (human).
 * @returns {number} accepted scroll `otyp`
 */
export function iniInvMkobjFilterScrollClassMonkLikeC() {
    const OTYP_WAN_WISHING = 413;
    const OTYP_WAN_NOTHING = 415;
    const OTYP_RIN_LEVITATION = 183;
    const OTYP_RIN_AGGRAVATE_MONSTER = 185;
    const OTYP_RIN_HUNGER = 184;
    const OTYP_POT_HALLUCINATION = 304;
    const OTYP_POT_ACID = 320;
    const OTYP_SCR_AMNESIA = 338;
    const OTYP_SCR_FIRE = 339;
    const OTYP_SCR_BLANK_PAPER = 364;
    const OTYP_SPE_BLANK_PAPER = 406;
    const OTYP_SCR_ENCHANT_WEAPON = 328;
    const OTYP_SPE_FORCE_BOLT = 375;
    const OTYP_SPE_NOVEL = 407;
    const OTYP_PANCAKE = 290;

    let trycnt = 0;
    let otyp = mkobjScrollClassFullDrawLikeC();
    while (
        otyp === OTYP_WAN_WISHING ||
        otyp === OTYP_RIN_LEVITATION ||
        otyp === OTYP_POT_HALLUCINATION ||
        otyp === OTYP_POT_ACID ||
        otyp === OTYP_SCR_AMNESIA ||
        otyp === OTYP_SCR_FIRE ||
        otyp === OTYP_SCR_BLANK_PAPER ||
        otyp === OTYP_SPE_BLANK_PAPER ||
        otyp === OTYP_RIN_AGGRAVATE_MONSTER ||
        otyp === OTYP_RIN_HUNGER ||
        otyp === OTYP_WAN_NOTHING ||
        otyp === OTYP_SCR_ENCHANT_WEAPON ||
        otyp === OTYP_SPE_FORCE_BOLT ||
        otyp === OTYP_SPE_NOVEL
    ) {
        if (++trycnt > 1000) {
            nextIdentLikeC();
            mksobjInitPancakeFoodTailLikeC();
            return OTYP_PANCAKE;
        }
        otyp = mkobjScrollClassFullDrawLikeC();
    }
    return otyp | 0;
}
