// mkobj_mklev_like_c.js — C mkobj.c mkobj/mksobj_init RNG for mklev fill (not ini_inv).
// C refs: mkobj.c mkobj(), mksobj(), mksobj_init(); fill_ordinary_room mkobj_at(RANDOM_CLASS, …).

import { game } from './gstate.js';
import { depth as depth_of_level } from './hacklib.js';
import { rndmonstLikeC } from './makemon_rndmonst.js';
import { rnd, rn2, rn1, rne } from './rng.js';
import {
    NH5_RANDOM_CLASS,
    NH5_WEAPON_CLASS,
    NH5_ARMOR_CLASS,
    NH5_RING_CLASS,
    NH5_TOOL_CLASS,
    NH5_FOOD_CLASS,
    NH5_POTION_CLASS,
    NH5_SCROLL_CLASS,
    NH5_SPBOOK_CLASS,
    NH5_WAND_CLASS,
    NH5_GEM_CLASS,
    NH5_ROCK_CLASS,
    NH5_AMULET_CLASS,
} from './nh5_objclass.js';
import {
    WEAPON_CLASS_MKOBJ_OC_PROB_ROWS,
    ARMOR_CLASS_MKOBJ_OC_PROB_ROWS,
    TOOL_CLASS_MKOBJ_OC_PROB_ROWS,
    GEM_CLASS_MKOBJ_OC_PROB_ROWS,
} from './mkobj_mklev_oc_prob_data.js';
import {
    POTION_CLASS_MKOBJ_OC_PROB_ROWS,
    WAND_CLASS_MKOBJ_OC_PROB_ROWS,
    SPBOOK_CLASS_MKOBJ_OC_PROB_ROWS,
    RING_CLASS_MKOBJ_ROWS,
} from './mkobj_wizard_ini_inv_data.js';
import { SCROLL_CLASS_MKOBJ_OC_PROB_ROWS } from './mkobj_scroll_class_rng_like_c.js';
import {
    mkobjOtypFoodClassIniInvLikeC,
    mksobjInitFoodClassIniInvAfterOtypLikeC,
} from './mkobj_food_class_rng_like_c.js';

/** C: mkobj.c mkobjprobs[] (non-hell, non-rogue). */
const MKOBJ_PROBS = Object.freeze([
    [10, NH5_WEAPON_CLASS],
    [11, NH5_ARMOR_CLASS],
    [20, NH5_FOOD_CLASS],
    [8, NH5_TOOL_CLASS],
    [7, NH5_GEM_CLASS],
    [16, NH5_POTION_CLASS],
    [16, NH5_SCROLL_CLASS],
    [4, NH5_SPBOOK_CLASS],
    [4, NH5_WAND_CLASS],
    [3, NH5_RING_CLASS],
    [1, NH5_AMULET_CLASS],
]);

/** mklev.js legacy oclass literals → NH5 objclass.h indices. */
const LEGACY_OCLASS_TO_NH5 = new Map([
    [0, NH5_RANDOM_CLASS],
    [1, NH5_WEAPON_CLASS],
    [2, NH5_ARMOR_CLASS],
    [3, NH5_RING_CLASS],
    [7, NH5_FOOD_CLASS],
    [8, NH5_SCROLL_CLASS],
    [9, NH5_POTION_CLASS],
    [12, NH5_TOOL_CLASS],
    [14, NH5_GEM_CLASS],
    [11, NH5_SPBOOK_CLASS],
]);

/** C: objects.h AMULET macros (prob 1 each in mkobj walk). */
const AMULET_CLASS_MKOBJ_OC_PROB_ROWS = Object.freeze([
    [191, 1], [192, 1], [193, 1], [194, 1], [195, 1], [196, 1], [197, 1], [198, 1],
]);

const OTYP_LOADSTONE = 88;
const OTYP_ROCK = 89;
/** C: objects.h LUCKSTONE — skip `!rn2(6)` quan-2 branch in mksobj_init GEM_CLASS. */
const OTYP_LUCKSTONE = 470;
const OTYP_WAN_WISHING = 413;
const OTYP_WAN_STASIS = 415;
/** C: objects.h STATUE — mksobj_init ROCK_CLASS branch (NH5 GEM_CLASS pick). */
const OTYP_STATUE = 472;

const RING_CHARGED = new Set(
    RING_CLASS_MKOBJ_ROWS.filter((r) => (r[1] | 0) === 1).map((r) => r[0] | 0),
);

const WEAPON_MULTIGEN_OTYP = new Set([24, 25, 26]); /* DART, SHURIKEN, BOOMERANG */

/** C: objnam.c erosion_matters — GEM/food/etc. skip mkobj_erosions. */
function erosionMattersMklevLikeC(oclass) {
    switch (oclass | 0) {
    case NH5_WEAPON_CLASS:
    case NH5_ARMOR_CLASS:
        return true;
    case NH5_TOOL_CLASS:
        return false;
    default:
        return false;
    }
}

/** C: mkobj.c may_generate_eroded + mkobj_erosions — in_mklev floor objects only when damageable. */
function mkobjErosionsMklevLikeC(otyp, oclass) {
    if (!game.in_mklev) return;
    if (!erosionMattersMklevLikeC(oclass)) return;
    void otyp;
    if (!rn2(100)) return;
    if (!rn2(80)) {
        let eroded = 0;
        do {
            eroded++;
        } while (eroded < 3 && !rn2(9));
    }
    if (!rn2(80)) {
        let eroded2 = 0;
        do {
            eroded2++;
        } while (eroded2 < 3 && !rn2(9));
    }
    if (!rn2(1000)) {
        /* greased */
    }
}

/** @param {readonly (readonly [number, number])[]} rows */
export function mkobjOtypFromProbRowsLikeC(rows) {
    let tot = 0;
    for (const r of rows) tot += r[1] | 0;
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

/** C: mkobj.c — rnd(100) walk mkobjprobs. */
export function mkobjPickOclassFromMkobjprobsLikeC() {
    let tprob = rnd(100);
    let oclass = NH5_WEAPON_CLASS;
    for (const [iprob, iclass] of MKOBJ_PROBS) {
        tprob -= iprob;
        if (tprob <= 0) {
            oclass = iclass;
            break;
        }
    }
    return oclass;
}

function nh5OclassFromLet(let_) {
    if (LEGACY_OCLASS_TO_NH5.has(let_ | 0)) return LEGACY_OCLASS_TO_NH5.get(let_ | 0);
    return let_ | 0;
}

function mkobjPickOtypForClassLikeC(oclass) {
    switch (oclass) {
    case NH5_SCROLL_CLASS:
        return mkobjOtypFromProbRowsLikeC(SCROLL_CLASS_MKOBJ_OC_PROB_ROWS);
    case NH5_POTION_CLASS:
        return mkobjOtypFromProbRowsLikeC(POTION_CLASS_MKOBJ_OC_PROB_ROWS);
    case NH5_WAND_CLASS:
        return mkobjOtypFromProbRowsLikeC(WAND_CLASS_MKOBJ_OC_PROB_ROWS);
    case NH5_SPBOOK_CLASS:
        return mkobjOtypFromProbRowsLikeC(SPBOOK_CLASS_MKOBJ_OC_PROB_ROWS);
    case NH5_RING_CLASS:
        return mkobjOtypFromProbRowsLikeC(RING_CLASS_MKOBJ_ROWS);
    case NH5_FOOD_CLASS:
        return mkobjOtypFoodClassIniInvLikeC();
    case NH5_WEAPON_CLASS:
        return mkobjOtypFromProbRowsLikeC(WEAPON_CLASS_MKOBJ_OC_PROB_ROWS);
    case NH5_ARMOR_CLASS:
        return mkobjOtypFromProbRowsLikeC(ARMOR_CLASS_MKOBJ_OC_PROB_ROWS);
    case NH5_TOOL_CLASS:
        return mkobjOtypFromProbRowsLikeC(TOOL_CLASS_MKOBJ_OC_PROB_ROWS);
    case NH5_GEM_CLASS:
        return mkobjOtypFromProbRowsLikeC(GEM_CLASS_MKOBJ_OC_PROB_ROWS);
    case NH5_AMULET_CLASS:
        return mkobjOtypFromProbRowsLikeC(AMULET_CLASS_MKOBJ_OC_PROB_ROWS);
    default:
        return 0;
    }
}

/** C: mkobj.c blessorcurse(otmp, chance) — optional otmp for supply-chest cursed checks. */
function blessorcurseLikeC(chance, otmp) {
    if (otmp && (otmp.blessed || otmp.cursed)) return;
    if (!rn2(chance)) {
        if (!rn2(2)) {
            if (otmp) otmp.cursed = true;
        } else if (otmp) {
            otmp.blessed = true;
        }
    }
}

function mksobjInitWeaponLikeC(otyp, artif) {
    if (WEAPON_MULTIGEN_OTYP.has(otyp | 0)) rn1(6, 6);
    if (!rn2(11)) {
        rne(3);
        rn2(2);
    } else if (!rn2(10)) {
        rne(3);
    } else {
        blessorcurseLikeC(10);
    }
    if (!rn2(100)) { /* is_poisonable — broad stub */ }
    if (artif && !rn2(20)) { /* nartifact_exist() stub 0 */ }
}

function mksobjInitArmorLikeC(artif) {
    if (rn2(10) && (!rn2(11))) {
        rne(3);
    } else if (!rn2(10)) {
        rn2(2);
        rne(3);
    } else {
        blessorcurseLikeC(10);
    }
    if (artif && !rn2(40)) { /* mk_artifact stub */ }
}

function mksobjInitWandLikeC(otyp, otmp) {
    if ((otyp | 0) === OTYP_WAN_WISHING) {
        /* spe = 1 */
    } else if ((otyp | 0) === OTYP_WAN_STASIS) {
        rn1(4, 3);
    } else {
        rn1(5, 4);
    }
    blessorcurseLikeC(17, otmp);
}

function mksobjInitRingLikeC(otyp) {
    if (RING_CHARGED.has(otyp | 0)) {
        blessorcurseLikeC(3);
        if (rn2(10)) {
            if (rn2(10)) {
                rn2(2) ? rne(3) : rne(3);
            } else {
                rn2(2) ? rne(3) : rne(3);
            }
        }
        rn2(4);
        rn2(3);
        if (rn2(5)) { /* curse */ }
    } else if (rn2(10) && !rn2(9)) {
        /* curse ring types */
    }
}

function mksobjInitGemLikeC(otyp) {
    const t = otyp | 0;
    if (t === OTYP_LOADSTONE) {
        /* curse(otmp) — no RNG in mktrap_victim path */
    } else if (t === OTYP_ROCK) {
        rn1(6, 6);
    } else if (t !== OTYP_LUCKSTONE && !rn2(6)) {
        /* quan 2 */
    }
}

/** C: mkobj.c mksobj_init ROCK_CLASS STATUE — rndmonnum + optional nested mkobj(SPBOOK). */
function mksobjInitStatueLikeC(otyp) {
    if ((otyp | 0) !== OTYP_STATUE) return;
    rndmonstLikeC(); /* rndmonnum → rndmonst_adj */
    const ld = depth_of_level(game.u?.uz) | 0;
    if (rn2(Math.trunc(ld / 2) + 10) > 10) {
        mkobjMklevConsumeRngLikeC(11, false); /* SPBOOK_no_NOVEL */
    }
}

/** C: mkobj.c mksobj — STATUE corpsenm spe after mksobj_init. */
export function mksobjPostInitStatueLikeC(otyp) {
    if ((otyp | 0) !== OTYP_STATUE) return;
    rn2(2);
}

/**
 * C: mkobj.c mkobj + mksobj(TRUE) init tail — consumes RNG only (no invent graph).
 * @param {number} let_ oclass (mklev legacy or NH5 index)
 * @param {boolean} artif
 * @returns {number} otyp
 */
export function mkobjMklevConsumeRngLikeC(let_, artif) {
    let oclass = nh5OclassFromLet(let_);
    if (oclass === NH5_RANDOM_CLASS) {
        oclass = mkobjPickOclassFromMkobjprobsLikeC();
    }
    const otyp = mkobjPickOtypForClassLikeC(oclass);
    rnd(2);
    mksobjInitMklevLikeC(otyp, oclass, artif);
    mksobjPostInitStatueLikeC(otyp);
    mkobjErosionsMklevLikeC(otyp, oclass);
    return otyp | 0;
}

/**
 * C: mkobj.c mksobj_init (after next_ident in mksobj).
 * @param {number} otyp
 * @param {number} oclass NH5 class
 * @param {boolean} artif
 */
export function mksobjInitMklevLikeC(otyp, oclass, artif, otmp) {
    switch (oclass) {
    case NH5_SCROLL_CLASS:
    case NH5_POTION_CLASS:
        blessorcurseLikeC(4, otmp);
        break;
    case NH5_SPBOOK_CLASS:
        blessorcurseLikeC(17, otmp);
        break;
    case NH5_WAND_CLASS:
        mksobjInitWandLikeC(otyp, otmp);
        break;
    case NH5_RING_CLASS:
        mksobjInitRingLikeC(otyp);
        break;
    case NH5_FOOD_CLASS:
        mksobjInitFoodClassIniInvAfterOtypLikeC(otyp);
        break;
    case NH5_WEAPON_CLASS:
        mksobjInitWeaponLikeC(otyp, artif);
        break;
    case NH5_ARMOR_CLASS:
        mksobjInitArmorLikeC(artif);
        break;
    case NH5_GEM_CLASS:
        mksobjInitGemLikeC(otyp);
        break;
    case NH5_ROCK_CLASS:
        mksobjInitStatueLikeC(otyp);
        break;
    case NH5_AMULET_CLASS:
        if (rn2(10)) blessorcurseLikeC(10);
        else blessorcurseLikeC(10);
        break;
    case NH5_TOOL_CLASS:
        blessorcurseLikeC(5);
        break;
    default:
        break;
    }
}
