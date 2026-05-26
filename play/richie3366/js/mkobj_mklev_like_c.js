// mkobj_mklev_like_c.js — C mkobj.c mkobj/mksobj_init RNG for mklev fill (not ini_inv).
// C refs: mkobj.c mkobj(), mksobj(), mksobj_init(); fill_ordinary_room mkobj_at(RANDOM_CLASS, …).

import { game } from './gstate.js';
import { depth as depth_of_level } from './hacklib.js';
import { rndmonstLikeC } from './makemon_rndmonst.js';
import { P_BOW, P_SHURIKEN, OTYP_LOADSTONE, OTYP_LUCKSTONE, OTYP_GOLD_PIECE } from './const.js';
import { OC_SKILL_ROW_BY_OTYP } from './obj_oc_skill_data.js';
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
    NH5_COIN_CLASS,
} from './nh5_objclass.js';
import {
    WEAPON_CLASS_MKOBJ_OC_PROB_ROWS,
    ARMOR_CLASS_MKOBJ_OC_PROB_ROWS,
    TOOL_CLASS_MKOBJ_OC_PROB_ROWS,
    GEM_CLASS_MKOBJ_OC_PROB_ROWS,
    RING_CLASS_MKOBJ_OC_PROB_ROWS,
} from './mkobj_mklev_oc_prob_data.js';
import {
    POTION_CLASS_MKOBJ_OC_PROB_ROWS,
    WAND_CLASS_MKOBJ_OC_PROB_ROWS,
    SPBOOK_CLASS_MKOBJ_OC_PROB_ROWS,
} from './mkobj_wizard_ini_inv_data.js';
import { SCROLL_CLASS_MKOBJ_OC_PROB_ROWS } from './mkobj_scroll_class_rng_like_c.js';
import {
    mkobjOtypFoodClassIniInvLikeC,
    mksobjInitFoodClassIniInvAfterOtypLikeC,
} from './mkobj_food_class_rng_like_c.js';

/** C: mkobj.c boxiprobs[] — mkbox_cnts item classes. */
const BOXIPROBS = Object.freeze([
    [18, NH5_GEM_CLASS],
    [15, NH5_FOOD_CLASS],
    [18, NH5_POTION_CLASS],
    [18, NH5_SCROLL_CLASS],
    [12, NH5_SPBOOK_CLASS],
    [7, NH5_COIN_CLASS],
    [6, NH5_WAND_CLASS],
    [5, NH5_RING_CLASS],
    [1, NH5_AMULET_CLASS],
]);

/** C: objects.h — floor containers (mksobj_init TOOL + mkbox_cnts). */
const OTYP_LARGE_BOX = 215;
const OTYP_CHEST = 216;
const OTYP_ICE_BOX = 217;
const OTYP_SACK = 218;
const OTYP_OILSKIN_SACK = 219;
const OTYP_BAG_OF_HOLDING = 220;
/** C: GEM_CLASS — `rnd_class(DILITHIUM_CRYSTAL, LOADSTONE)` in mkbox_cnts. */
const OTYP_DILITHIUM_CRYSTAL = 468;

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

/** C: objclass.h `SPBOOK_no_NOVEL` — mklev.js / mkobj.c `mkobj(SPBOOK_no_NOVEL, …)`. */
const LET_SPBOOK_NO_NOVEL = 11;

/** C: objects.h `SPE_BLANK_PAPER` — `rnd_class` upper bound for novel spellbooks. */
const OTYP_SPE_BLANK_PAPER = 406;

/** @param {readonly (readonly [number, number])[]} rows */
function ocProbMapFromRows(rows) {
    /** @type {Map<number, number>} */
    const m = new Map();
    for (const r of rows) m.set(r[0] | 0, r[1] | 0);
    return m;
}

const SPBOOK_OC_PROB = ocProbMapFromRows(SPBOOK_CLASS_MKOBJ_OC_PROB_ROWS);
const OTYP_SPBOOK_CLASS_FIRST = SPBOOK_CLASS_MKOBJ_OC_PROB_ROWS[0][0] | 0;

/**
 * C: objnam.c rnd_class(first, last) — walk contiguous `objects[i].oc_prob`.
 * @param {number} first
 * @param {number} last
 */
function rndClassMklevOtypLikeC(first, last) {
    const lo = first | 0;
    const hi = last | 0;
    if (hi <= lo) return lo === hi ? lo : 0;
    let sum = 0;
    for (let i = lo; i <= hi; i++) sum += SPBOOK_OC_PROB.get(i) | 0;
    if (!sum) return rn1(hi - lo + 1, lo);
    let x = rnd(sum);
    for (let i = lo; i <= hi; i++) {
        x -= SPBOOK_OC_PROB.get(i) | 0;
        if (x <= 0) return i;
    }
    return hi;
}

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

/** C `objects.h` **`ROCK("rock")`** — NH5 otyp **473**. */
const OTYP_ROCK = 473;
const OTYP_WAN_WISHING = 413;
const OTYP_WAN_STASIS = 415;
/** C `objects[]` — `ROCK_CLASS` `STATUE` (**474** = `BOULDER`). */
const OTYP_STATUE = 475;

const RING_CHARGED = new Set(
    RING_CLASS_MKOBJ_OC_PROB_ROWS.filter((r) => (r[1] | 0) === 1).map((r) => r[0] | 0),
);

/** C: obj.h is_multigen — projectiles 19–24 lack OC_SKILL_ROW_BY_OTYP entries. */
const OTYP_FIRST_PROJECTILE = 19;
const OTYP_LAST_PROJECTILE = 24;

function weaponMultigenMklevLikeC(otyp) {
    const t = otyp | 0;
    const row = OC_SKILL_ROW_BY_OTYP.get(t);
    const sk = row?.oc_skill ?? 0;
    if (row?.oclass === NH5_WEAPON_CLASS && sk >= -P_SHURIKEN && sk <= -P_BOW) return true;
    return t >= OTYP_FIRST_PROJECTILE && t <= OTYP_LAST_PROJECTILE;
}

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

/** C: mkobj.c mksobj_init tail — mkobj_erosions (WEAPON/ARMOR in mklev). */
export function mkobjErosionsMklevLikeC(otyp, oclass) {
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
        return mkobjOtypFromProbRowsLikeC(RING_CLASS_MKOBJ_OC_PROB_ROWS);
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
    case NH5_COIN_CLASS:
        return OTYP_GOLD_PIECE;
    default:
        return 0;
    }
}

/** C: mkobj.c blessorcurse(otmp, chance) — optional otmp for supply-chest cursed checks. */
function levelDifficultyMklevLikeC() {
    return depth_of_level(game.u?.uz) | 0;
}

/**
 * C: mkobj.c mkbox_cnts — floor chest/box contents RNG (mklev `mksobj_at` init=TRUE).
 * @param {{ otyp: number, olocked?: boolean }} box
 */
function mkboxCntsMklevLikeC(box) {
    const t = box.otyp | 0;
    let n;
    switch (t) {
    case OTYP_ICE_BOX:
        n = 20;
        break;
    case OTYP_CHEST:
        n = box.olocked ? 7 : 5;
        break;
    case OTYP_LARGE_BOX:
        n = box.olocked ? 5 : 3;
        break;
    case OTYP_SACK:
    case OTYP_OILSKIN_SACK:
        if ((game.moves | 0) <= 1 && !game.in_mklev) {
            n = 0;
            break;
        }
        /* FALLTHROUGH */
    case OTYP_BAG_OF_HOLDING:
        n = 1;
        break;
    default:
        n = 0;
        break;
    }
    for (n = rn2(n + 1); n > 0; n--) {
        if (t === OTYP_ICE_BOX) {
            mkobjMklevConsumeRngLikeC(NH5_FOOD_CLASS, false);
            continue;
        }
        let tprob = rnd(100);
        let oclass = NH5_GEM_CLASS;
        for (const [iprob, iclass] of BOXIPROBS) {
            tprob -= iprob;
            if (tprob <= 0) {
                oclass = iclass;
                break;
            }
        }
        let otyp = mkobjMklevConsumeRngLikeC(oclass, false);
        if (oclass === NH5_COIN_CLASS) {
            rnd(levelDifficultyMklevLikeC() + 2);
            rnd(75);
        } else {
            while ((otyp | 0) === OTYP_ROCK) {
                otyp = rn1(OTYP_LOADSTONE - OTYP_DILITHIUM_CRYSTAL + 1, OTYP_DILITHIUM_CRYSTAL);
            }
        }
        if (t === OTYP_BAG_OF_HOLDING) {
            if (otyp === OTYP_SACK) {
                /* Is_mbag → SACK */
            } else {
                const OTYP_WAN_CANCELLATION = 433;
                while ((otyp | 0) === OTYP_WAN_CANCELLATION) {
                    otyp = rn1(12, 422);
                }
            }
        }
        void otyp;
    }
}

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
    if (weaponMultigenMklevLikeC(otyp)) rn1(6, 6);
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

/** C: mkobj.c bcsign — +1 blessed, -1 cursed, else 0. */
function bcsignFreshLikeC(bc) {
    return (!!bc.blessed | 0) - (!!bc.cursed | 0);
}

/** C: mkobj.c blessorcurse — skip when already b/c. */
function blessorcurseFreshLikeC(bc, chance) {
    if (bc.blessed || bc.cursed) return;
    if (!rn2(chance)) {
        if (!rn2(2)) bc.cursed = true;
        else bc.blessed = true;
    }
}

/** C: mkobj.c RING_CLASS — non-charged curse types. */
const OTYP_RIN_TELEPORTATION = 194;
const OTYP_RIN_POLYMORPH = 195;
const OTYP_RIN_AGGRAVATE_MONSTER = 196;
const OTYP_RIN_HUNGER = 197;

function mksobjInitRingLikeC(otyp) {
    const t = otyp | 0;
    if (RING_CHARGED.has(t)) {
        const bc = { blessed: false, cursed: false };
        blessorcurseFreshLikeC(bc, 3);
        let spe = 0;
        if (rn2(10)) {
            const sign = bcsignFreshLikeC(bc);
            if (rn2(10) && sign) {
                spe = sign * rne(3);
            } else {
                spe = rn2(2) ? rne(3) : -rne(3);
            }
        }
        if (spe === 0) {
            spe = rn2(4) - rn2(3);
        }
        if (spe < 0 && rn2(5)) {
            /* curse(otmp) */
        }
    } else if (
        rn2(10) &&
        (t === OTYP_RIN_TELEPORTATION ||
            t === OTYP_RIN_POLYMORPH ||
            t === OTYP_RIN_AGGRAVATE_MONSTER ||
            t === OTYP_RIN_HUNGER ||
            !rn2(9))
    ) {
        /* curse(otmp) */
    }
}

/** C: mkobj.c mksobj_init — TOOL_CLASS (per-otyp; default is `break` only). */
function mksobjInitToolLikeC(otyp, otmp) {
    const t = otyp | 0;
    switch (t) {
    case 219: /* TALLOW_CANDLE */
    case 220: /* WAX_CANDLE */
        if (rn2(2)) rn2(7);
        blessorcurseLikeC(5);
        break;
    case 221: /* BRASS_LANTERN */
    case 222: /* OIL_LAMP */
        rn1(500, 1000);
        blessorcurseLikeC(5);
        break;
    case 223: /* MAGIC_LAMP */
        blessorcurseLikeC(2);
        break;
    case OTYP_LARGE_BOX:
    case OTYP_CHEST:
        if (!otmp) {
            otmp = { otyp: t, olocked: false, otrapped: false };
        }
        otmp.olocked = !!rn2(5);
        otmp.otrapped = !rn2(10);
        if (!rn2(100) && otmp.otrapped) {
            /* tknown when trap obvious */
        }
        mkboxCntsMklevLikeC(otmp);
        break;
    case 245: /* EXPENSIVE_CAMERA */
    case 246: /* TINNING_KIT */
    case 247: /* MAGIC_MARKER */
        rn1(70, 30);
        break;
    case 248: /* CAN_OF_GREASE */
        rn1(21, 5);
        blessorcurseLikeC(10);
        break;
    case 249: /* CRYSTAL_BALL */
        rn1(5, 3);
        blessorcurseLikeC(2);
        break;
    case 250: /* HORN_OF_PLENTY */
    case 251: /* BAG_OF_TRICKS */
        rn1(18, 3);
        break;
    case 252: /* MAGIC_FLUTE */
    case 253: /* MAGIC_HARP */
    case 254: /* FROST_HORN */
    case 255: /* FIRE_HORN */
    case 256: /* DRUM_OF_EARTHQUAKE */
        rn1(5, 4);
        break;
    default:
        break;
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
    const letRaw = let_ | 0;
    let oclass;
    let otyp;
    if (letRaw === LET_SPBOOK_NO_NOVEL) {
        /* C: mkobj.c — `rnd_class(svb.bases[SPBOOK_CLASS], SPE_BLANK_PAPER)` */
        otyp = rndClassMklevOtypLikeC(OTYP_SPBOOK_CLASS_FIRST, OTYP_SPE_BLANK_PAPER);
        oclass = NH5_SPBOOK_CLASS;
    } else {
        oclass = nh5OclassFromLet(letRaw);
        if (oclass === NH5_RANDOM_CLASS) {
            oclass = mkobjPickOclassFromMkobjprobsLikeC();
        }
        otyp = mkobjPickOtypForClassLikeC(oclass);
    }
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
        mksobjInitToolLikeC(otyp, otmp);
        break;
    default:
        break;
    }
}
