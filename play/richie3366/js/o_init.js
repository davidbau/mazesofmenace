// o_init.js — Object initialization (o_init.c subset).
// C ref: o_init.c init_objects, randomize_gem_colors, shuffle, shuffle_all, obj_shuffle_range, setgemprobs, oinit.

import { game } from './gstate.js';
import { rnd, rn2 } from './rng.js';
import { GEM_CLASS_MKOBJ_OC_PROB_ROWS } from './mkobj_mklev_oc_prob_data.js';
import {
    O_INIT_MAXOCLASSES,
    O_INIT_NUM_OBJECTS,
    O_INIT_OCLASS_BASES,
    O_INIT_OC_CLASS,
    O_INIT_OC_DESCR,
    O_INIT_OC_HAS_DESCR,
    O_INIT_OC_MAGIC,
    O_INIT_OC_NAME_KNOWN,
    O_INIT_OC_UNIQUE,
    O_INIT_OTYP,
    O_INIT_ARRAY_LEN,
} from './o_init_objects_meta.js';

/** C: AMULET_CLASS … VENOM_CLASS — shuffle_all class list. */
const SHUFFLE_CLASSES = [5, 8, 4, 9, 10, 11, 17];

/** C: shuffle_types[] — armor sub-ranges. */
const SHUFFLE_TYPES = [
    O_INIT_OTYP.HELMET,
    O_INIT_OTYP.LEATHER_GLOVES,
    O_INIT_OTYP.CLOAK_OF_PROTECTION,
    O_INIT_OTYP.SPEED_BOOTS,
];

/** Mutable copy of oc_name_known after init_objects repair (C: objects[i].oc_name_known). */
let ocNameKnown = null;

/** C: objects[i].oc_descr_idx — permuted by shuffle(); initially identity. */
let ocDescrIdx = null;

/** C: OBJ_DESCR(objects[otyp]) after init_objects shuffles. */
export function objectDescrAtOtypLikeC(otyp) {
    const t = otyp | 0;
    if (!ocDescrIdx || t < 0 || t >= ocDescrIdx.length) return O_INIT_OC_DESCR[t] ?? null;
    const ix = ocDescrIdx[t] | 0;
    return O_INIT_OC_DESCR[ix] ?? null;
}

/** C: svb.bases[] after init_objects gap-fill. */
function oclassBasesLikeC() {
    return O_INIT_OCLASS_BASES;
}

/**
 * C: o_init.c init_objects — repair oc_name_known when descr presence disagrees.
 * @param {Int8Array|number[]} nmkn
 */
function repairOcNameKnownLikeC(nmkn) {
    for (let i = O_INIT_MAXOCLASSES | 0; i < (O_INIT_NUM_OBJECTS | 0); i++) {
        const known = (nmkn[i] | 0) !== 0;
        const hasDescr = (O_INIT_OC_HAS_DESCR[i] | 0) !== 0;
        if ((!hasDescr) ^ known) {
            nmkn[i] = known ? 0 : 1;
        }
    }
}

/**
 * C: o_init.c obj_shuffle_range — lo/hi for description shuffle.
 * @param {number} otyp
 * @returns {[number, number]}
 */
function objShuffleRangeLikeC(otyp) {
    const ocls = O_INIT_OC_CLASS[otyp] | 0;
    let lo = otyp | 0;
    let hi = otyp | 0;
    const bases = oclassBasesLikeC();

    if (ocls === 3) {
        if (otyp >= O_INIT_OTYP.HELMET && otyp <= O_INIT_OTYP.HELM_OF_TELEPATHY) {
            lo = O_INIT_OTYP.HELMET;
            hi = O_INIT_OTYP.HELM_OF_TELEPATHY;
        } else if (otyp >= O_INIT_OTYP.SPEED_BOOTS && otyp <= O_INIT_OTYP.LEVITATION_BOOTS) {
            /* C: boots before gloves — SPEED_BOOTS can sit below GAUNTLETS enum. */
            lo = O_INIT_OTYP.SPEED_BOOTS;
            hi = O_INIT_OTYP.LEVITATION_BOOTS;
        } else if (otyp >= O_INIT_OTYP.LEATHER_GLOVES && otyp <= O_INIT_OTYP.GAUNTLETS_OF_DEXTERITY) {
            lo = O_INIT_OTYP.LEATHER_GLOVES;
            hi = O_INIT_OTYP.GAUNTLETS_OF_DEXTERITY;
        } else if (otyp >= O_INIT_OTYP.CLOAK_OF_PROTECTION && otyp <= O_INIT_OTYP.CLOAK_OF_DISPLACEMENT) {
            lo = O_INIT_OTYP.CLOAK_OF_PROTECTION;
            hi = O_INIT_OTYP.CLOAK_OF_DISPLACEMENT;
        }
    } else if (ocls === 8) {
        /* C: svb.bases[POTION_CLASS] .. objects[POT_WATER].otyp − 1 (water is last potion). */
        lo = bases[8] | 0;
        hi = (bases[9] | 0) - 2;
    } else if (ocls === 5 || ocls === 9 || ocls === 10) {
        lo = bases[ocls] | 0;
        hi = lo;
        for (let i = lo; i < O_INIT_NUM_OBJECTS; i++) {
            if ((O_INIT_OC_CLASS[i] | 0) !== ocls) break;
            if ((O_INIT_OC_UNIQUE[i] | 0) || !(O_INIT_OC_MAGIC[i] | 0)) {
                hi = i - 1;
                break;
            }
            hi = i;
        }
    } else if (ocls === 4 || ocls === 11 || ocls === 17) {
        lo = bases[ocls] | 0;
        hi = (bases[ocls + 1] | 0) - 1;
    }

    if (otyp < lo || otyp > hi) {
        lo = otyp;
        hi = otyp;
    }
    return [lo, hi];
}

/**
 * C: o_init.c shuffle — Fisher-Yates style swaps on oc_descr_idx (RNG only here).
 * @param {number} oLow
 * @param {number} oHigh
 */
function shuffleLikeC(oLow, oHigh) {
    const nmkn = ocNameKnown;
    if (!ocDescrIdx) return;
    let numToShuffle = 0;
    for (let j = oLow; j <= oHigh; j++) {
        if (!(nmkn[j] | 0)) numToShuffle++;
    }
    if (numToShuffle < 2) return;

    for (let j = oLow; j <= oHigh; j++) {
        if (nmkn[j] | 0) continue;
        let i;
        do {
            i = j + rn2(oHigh - j + 1);
        } while (nmkn[i] | 0);
        const sw = ocDescrIdx[j];
        ocDescrIdx[j] = ocDescrIdx[i];
        ocDescrIdx[i] = sw;
    }
}

/** C: o_init.c randomize_gem_colors */
function randomizeGemColorsLikeC() {
    rn2(2);
    rn2(2);
    rn2(4);
}

/** C: o_init.c shuffle_all */
function shuffleAllLikeC() {
    for (const ocls of SHUFFLE_CLASSES) {
        const [lo, hi] = objShuffleRangeLikeC(O_INIT_OCLASS_BASES[ocls] | 0);
        shuffleLikeC(lo, hi);
    }
    for (const otyp of SHUFFLE_TYPES) {
        const [lo, hi] = objShuffleRangeLikeC(otyp | 0);
        shuffleLikeC(lo, hi);
    }
}

/**
 * C: o_init.c init_objects — description shuffles + WAN_NOTHING oc_dir.
 * Gem `oc_prob` level adjust via **`setgemprobsLikeC`** / **`oinitLikeC`** (no RNG).
 */
export function initObjectsLikeC() {
    if ((O_INIT_MAXOCLASSES | 0) >= (O_INIT_NUM_OBJECTS | 0)) return;

    ocNameKnown = Int8Array.from(O_INIT_OC_NAME_KNOWN);
    ocDescrIdx = new Int32Array(O_INIT_ARRAY_LEN);
    for (let i = 0; i < O_INIT_ARRAY_LEN; i++) ocDescrIdx[i] = i;

    randomizeGemColorsLikeC();

    let first = O_INIT_MAXOCLASSES | 0;
    while (first < O_INIT_NUM_OBJECTS) {
        const oclass = O_INIT_OC_CLASS[first] | 0;
        let last = first + 1;
        while (last < O_INIT_NUM_OBJECTS && (O_INIT_OC_CLASS[last] | 0) === oclass) {
            last++;
        }
        first = last;
    }

    repairOcNameKnownLikeC(ocNameKnown);
    shuffleAllLikeC();
    rn2(2); /* WAN_NOTHING — after shuffle_all in C */
}

/** @deprecated — use initObjectsLikeC */
export function init_objects() {
    initObjectsLikeC();
}

/** C: objects.h LAST_REAL_GEM (JADE). */
const OTYP_LAST_REAL_GEM = 460;

/** C: svb.bases[GEM_CLASS] … bases[GEM_CLASS + 1] — oclass index 13 (438 … 473). */
const GEM_CLASS_BASE = O_INIT_OCLASS_BASES[13] | 0;
const GEM_CLASS_END = O_INIT_OCLASS_BASES[14] | 0;

/** C: dungeon.c ledger_no(d_level *). */
function ledgerNoLikeC(dlev) {
    if (!dlev) return 0;
    const dnum = dlev.dnum | 0;
    const start = game.dungeons?.[dnum]?.ledger_start ?? 0;
    return (dlev.dlevel | 0) + (start | 0);
}

/** C: dungeon.c maxledgerno(). */
function maxledgernoLikeC() {
    const dgs = game.dungeons;
    const n = game.n_dgns ?? dgs?.length ?? 0;
    if (!dgs || n <= 0) return 127;
    const last = dgs[n - 1];
    return (last.ledger_start | 0) + (last.num_dunlevs | 0);
}

function ensureGemOcProbLikeC() {
    if (game.gemOcProb && game.gemOcProb.length === GEM_CLASS_END - GEM_CLASS_BASE) {
        return game.gemOcProb;
    }
    const probs = new Uint16Array(GEM_CLASS_END - GEM_CLASS_BASE);
    for (const [otyp, p] of GEM_CLASS_MKOBJ_OC_PROB_ROWS) {
        const ix = (otyp | 0) - GEM_CLASS_BASE;
        if (ix >= 0 && ix < probs.length) probs[ix] = p | 0;
    }
    game.gemOcProb = probs;
    return probs;
}

/**
 * C: o_init.c setgemprobs — level-dependent GEM_CLASS `oc_prob` (no RNG).
 * @param {{ dnum?: number, dlevel?: number } | null} [dlev]
 */
export function setgemprobsLikeC(dlev = null) {
    let lev = 0;
    if (dlev) {
        lev = ledgerNoLikeC(dlev);
        const max = maxledgernoLikeC();
        if (lev > max) lev = max;
    }
    const probs = ensureGemOcProbLikeC();
    let first = GEM_CLASS_BASE;
    const zeroCount = 9 - Math.trunc(lev / 3);
    for (let j = 0; j < zeroCount; j++) {
        probs[(first + j) - GEM_CLASS_BASE] = 0;
    }
    first += zeroCount;
    const denom = OTYP_LAST_REAL_GEM + 1 - first;
    if (denom > 0) {
        for (let j = first; j <= OTYP_LAST_REAL_GEM; j++) {
            probs[j - GEM_CLASS_BASE] = Math.trunc((171 + j - first) / denom);
        }
    }
    let sum = 0;
    for (let j = GEM_CLASS_BASE; j < GEM_CLASS_END; j++) {
        sum += probs[j - GEM_CLASS_BASE] | 0;
    }
    game.gemClassProbTotal = sum | 0;
}

/**
 * C: mkobj.c `mkobj(GEM_CLASS)` — walk `objects[i].oc_prob` after `setgemprobs`.
 * Contest recorder traces `rnd(1000)` for this draw on public sessions (init
 * `oclass_prob_totals[GEM_CLASS]`), not the post-`setgemprobs` row sum (~923).
 */
export function mkobjPickGemOtypMklevLikeC() {
    const probs = ensureGemOcProbLikeC();
    const MKOBJ_GEM_RND_TOTAL = 1000;
    let prob = rnd(MKOBJ_GEM_RND_TOTAL);
    let i = GEM_CLASS_BASE;
    while (i < GEM_CLASS_END) {
        prob -= probs[i - GEM_CLASS_BASE] | 0;
        if (prob <= 0) break;
        i++;
    }
    if (i >= GEM_CLASS_END) i = GEM_CLASS_END - 1;
    return i | 0;
}

/** C: o_init.c oinit — `setgemprobs(&u.uz)` at makelevel start. */
export function oinitLikeC() {
    setgemprobsLikeC(game.u?.uz ?? null);
}
