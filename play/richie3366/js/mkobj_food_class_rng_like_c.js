// mkobj_food_class_rng_like_c.js — C mkobj.c mkobj(FOOD_CLASS) + mksobj FOOD_CLASS init for u_init ini_inv.
// C refs: mkobj.c mkobj(), mksobj_init() FOOD_CLASS, rndmonnum/rndmonnum_adj, rndmonst_adj;
//         makemon.c rndmonst_adj (D:1 !Inhell, AM_NEutral dungeon); mon.c undead_to_corpse, can_be_hatched,
//         dead_species; mondata.c little_to_big / big_to_little;
//         eat.c set_tin_variety RANDOM_TIN / TTSZ; read.c assign_candy_wrapper.
//
// Data: js/mons_rndmonst_ini_inv_data.js — mons[0..SPECIAL_PM-1] geno/difficulty/maligntyp/cnutrit/mflags1 + grownups.

import { G_GENOD } from './const.js';
import { game } from './gstate.js';
import { mvitalsNocorpseLikeC } from './mvitals.js';
import { rnd, rn1, rn2 } from './rng.js';
import {
    LITTLE_TO_BIG_GROWNUPS,
    MONS_GENO_PLAN_B,
    MONS_RNDMONST_CNUTRIT,
    MONS_RNDMONST_DIFFICULTY,
    MONS_RNDMONST_MALIGNTYP,
    MONS_RNDMONST_MFLAGS1,
} from './mons_rndmonst_ini_inv_data.js';

const G_UNIQ = 0x1000;
const G_NOHELL = 0x0800;
const G_HELL = 0x0400;
const G_NOGEN = 0x0200;
/** C `monflag.h` **`G_FREQ`** mask */
const G_FREQ = 0x0007;

/** C `permonst.h` — **`SPECIAL_PM`** == first post-normal slot (**`PM_LONG_WORM_TAIL`**). */
const SPECIAL_PM = 338;
const LOW_PM = 0;

/** C `align.h` **`A_NEUTRAL`** — **`uncommon()`** vs **`Inhell`**. */
const A_NEUTRAL = 0;
/** Main dungeon co-alignment for **`rndmonst_adj`** **`align_shift`** when not **`Is_special`**. */
const AM_NEUTRAL = 0x02;
/** C `global.h` **`ALIGNWEIGHT`**. */
const ALIGNWEIGHT = 4;

/** C `monflag.h` **`M1_OVIPAROUS`** — **`lays_eggs`**. */
const M1_OVIPAROUS = 0x00400000;

/** C `objects.h` FOOD_CLASS slice **`[otyp, oc_prob]`** incl. **`MEAT_RING`** (**0**). */
const FOOD_CLASS_MKOBJ_WALK = /** @type {readonly (readonly [number, number])[]} */ ([
    [173, 140],
    [174, 0],
    [175, 85],
    [176, 0],
    [177, 0],
    [178, 0],
    [179, 0],
    [180, 0],
    [181, 0],
    [182, 0],
    [183, 0],
    [184, 0],
    [185, 3],
    [186, 15],
    [187, 10],
    [188, 10],
    [189, 10],
    [190, 10],
    [191, 15],
    [192, 7],
    [193, 7],
    [194, 75],
    [195, 0],
    [196, 25],
    [197, 13],
    [198, 55],
    [199, 25],
    [200, 20],
    [201, 20],
    [202, 380],
    [203, 0],
    [204, 0],
    [205, 75],
]);

let _foodClassProbTotal = 0;
for (const [, p] of FOOD_CLASS_MKOBJ_WALK) _foodClassProbTotal += p | 0;

/** C `eat.c` **`tintxts`** count — **`TTSZ`**. */
const TTSZ = 16;
/** C `eat.c` **`ROTTEN_TIN`** / **`HOMEMADE_TIN`**. */
const ROTTEN_TIN = 0;
const HOMEMADE_TIN = 1;

/** C `mon.c` **`can_be_hatched`** / egg typed branch. */
const PM_KILLER_BEE = 1;
const PM_QUEEN_BEE = 5;
const PM_GARGOYLE = 43;
const PM_WINGED_GARGOYLE = 44;
const PM_SCORPIUS = 359;
const PM_SCORPION = 99;

/** C `include/hack.h` **`NON_PM`** */
const NON_PM = -1;

/** C: mkobj.c **`next_ident`** — **`ident += rnd(2)`** */
function nextIdentLikeC() {
    rnd(2);
}

function blessorcurseLikeC(chance) {
    if (!rn2(chance)) {
        rn2(2);
    }
}

/**
 * C: **`u.uz`** not quest + **`rn2(7)`** branch omitted (no RNG when not on quest branch).
 * C: **`dungeon.c`** **`level_difficulty()`** on **D:1** before aggravate (**`depth(&u.uz)`** == **1**).
 * C: **`u.ulevel`** **1** at **`ini_inv`**.
 */
function rndmonstIniInvSurfaceLikeC() {
    const zlevel = 1;
    const ulevel = 1;
    const minmlev = Math.floor(zlevel / 6) + 0;
    const maxmlev = Math.floor((zlevel + ulevel) / 2) + 0;
    const inhell = false;

    let totalweight = 0;
    /** @type {number} */
    let selectedMndx = NON_PM;

    for (let mndx = LOW_PM; mndx < SPECIAL_PM; mndx++) {
        const diff = MONS_RNDMONST_DIFFICULTY[mndx] | 0;
        if (diff < minmlev || diff > maxmlev) continue;

        const geno = MONS_GENO_PLAN_B[mndx] | 0;
        if (uncommonIniInvLikeC(mndx, geno, inhell)) continue;
        if (inhell && (geno & G_NOHELL) !== 0) continue;

        const mal = MONS_RNDMONST_MALIGNTYP[mndx] | 0;
        let alshift = 0;
        switch (AM_NEUTRAL) {
            case 0x00:
                alshift = 0;
                break;
            case 0x04:
                alshift = Math.trunc((mal + 20) / (2 * ALIGNWEIGHT));
                break;
            case 0x02:
                alshift = Math.trunc((20 - Math.abs(mal)) / ALIGNWEIGHT);
                break;
            case 0x01:
                alshift = Math.trunc((-(mal - 20)) / (2 * ALIGNWEIGHT));
                break;
            default:
                alshift = 0;
        }
        const weight = (geno & G_FREQ) + alshift + 0;
        if (weight > 0) {
            totalweight += weight;
            if (rn2(totalweight) < weight) {
                selectedMndx = mndx;
            }
        }
    }

    if (selectedMndx === NON_PM || uncommonIniInvLikeC(selectedMndx, MONS_GENO_PLAN_B[selectedMndx] | 0, inhell)) {
        return null;
    }
    return selectedMndx;
}

/**
 * C: **`uncommon()`** in **`makemon.c`** — **`mvitals`** **`G_GONE`** omitted (chargen).
 * @param {number} mndx
 * @param {number} geno
 * @param {boolean} inhell
 */
function uncommonIniInvLikeC(mndx, geno, inhell) {
    if ((geno & (G_NOGEN | G_UNIQ)) !== 0) return true;
    if (inhell) return (MONS_RNDMONST_MALIGNTYP[mndx] | 0) > A_NEUTRAL;
    return (geno & G_HELL) !== 0;
}

/**
 * C: **`mkobj.c`** **`rndmonnum_adj`** Plan B — **`excludeflags = G_UNIQ | G_NOGEN | (Inhell ? G_NOHELL : G_HELL)`**.
 * @returns {number} **`mndx`**
 */
export function rndmonnumIniInvPlanBLikeC() {
    const inhell = false;
    const excludeflags = G_UNIQ | G_NOGEN | (inhell ? G_NOHELL : G_HELL);
    let i;
    do {
        i = rn1(SPECIAL_PM - LOW_PM, LOW_PM);
    } while ((MONS_GENO_PLAN_B[i] & excludeflags) !== 0);
    return i;
}

/**
 * C: **`rndmonnum()`** / **`rndmonnum_adj(0,0)`** — Plan **`rndmonst_adj`** then Plan B.
 * @returns {number} **`mndx`**
 */
export function rndmonnumIniInvLikeC() {
    const planA = rndmonstIniInvSurfaceLikeC();
    if (planA !== null) return planA;
    return rndmonnumIniInvPlanBLikeC();
}

/** C: **`mon.c`** **`undead_to_corpse`** (subset by **`mons[]`** index). */
function undeadToCorpseIniInvLikeC(mndx) {
    const m = mndx | 0;
    switch (m) {
        case 237:
        case 187:
            return 59;
        case 240:
        case 190:
            return 46;
        case 238:
        case 188:
            return 166;
        case 239:
        case 189:
            return 71;
        case 241:
        case 191:
            return 262;
        case 224:
        case 232:
            return 266;
        case 242:
        case 192:
            return 266;
        case 245:
        case 194:
            return 168;
        case 243:
        case 193:
            return 173;
        default:
            return m;
    }
}

/** C: **`mondata.c`** **`little_to_big`**. */
function littleToBigIniInvLikeC(montype) {
    let m = montype | 0;
    for (let i = 0; i < LITTLE_TO_BIG_GROWNUPS.length; i++) {
        const pair = LITTLE_TO_BIG_GROWNUPS[i];
        const from = pair[0] | 0;
        if (from < 0) break;
        if (m === from) {
            m = pair[1] | 0;
            break;
        }
    }
    return m;
}

/**
 * C: **`mon.c`** **`can_be_hatched`** — includes **`BREEDER_EGG`** **`!rn2(77)`** in condition.
 * @returns {number} **`mndx`** or **`NON_PM`**
 */
function canBeHatchedIniInvLikeC(mnum) {
    let m = mnum | 0;
    if (m === PM_SCORPIUS) m = PM_SCORPION;
    m = littleToBigIniInvLikeC(m);
    const lays = (MONS_RNDMONST_MFLAGS1[m] & M1_OVIPAROUS) !== 0;
    if (
        m === PM_KILLER_BEE ||
        m === PM_GARGOYLE ||
        (lays && (!rn2(77) || (m !== PM_QUEEN_BEE && m !== PM_WINGED_GARGOYLE)))
    ) {
        return m;
    }
    return NON_PM;
}

/** C: **`mondata.c`** **`big_to_little`** (inverse of **`little_to_big`** on **`grownups`**). */
function bigToLittleIniInvLikeC(montype) {
    let m = montype | 0;
    for (let i = 0; i < LITTLE_TO_BIG_GROWNUPS.length; i++) {
        const pair = LITTLE_TO_BIG_GROWNUPS[i];
        const from = pair[0] | 0;
        if (from < 0) break;
        const to = pair[1] | 0;
        if (m === to) {
            m = from;
            break;
        }
    }
    return m;
}

/**
 * C: **`mon.c`** **`dead_species`** — egg path uses **`egg == TRUE`** (**`big_to_little`** alt index).
 * @param {number} mIdx
 * @param {boolean} egg
 */
function deadSpeciesIniInvLikeC(mIdx, egg) {
    const m = mIdx | 0;
    if (m < LOW_PM) return true;
    const altIdx = egg ? bigToLittleIniInvLikeC(m) : m;
    const arr = game?.mvitals;
    if (!Array.isArray(arr)) return false;
    const slotM = arr[m];
    const slotAlt = arr[altIdx];
    const g1 = (slotM?.mvflags | 0) & G_GENOD;
    const g2 = (slotAlt?.mvflags | 0) & G_GENOD;
    return g1 !== 0 || g2 !== 0;
}

/** C: **`eat.c`** **`nonrotting_corpse`** (no **`is_rider`** macro — rider indices). */
function nonrottingCorpseIniInvLikeC(mnum) {
    const m = mnum | 0;
    return (
        m === 333 /* PM_LIZARD */ ||
        m === 162 /* PM_LICHEN */ ||
        m === 318 ||
        m === 319 ||
        m === 320 ||
        m === 6 /* PM_ACID_BLOB */
    );
}

/** C: **`read.c`** **`assign_candy_wrapper`** — **`SIZE(candy_wrappers)-1` == **12**. */
function assignCandyWrapperSpeIniInvLikeC() {
    return 1 + rn2(12);
}

/** C: mkobj.c **`mkobj(FOOD_CLASS, artif)`** */
export function mkobjOtypFoodClassIniInvLikeC() {
    let prob = rnd(_foodClassProbTotal);
    let i = 0;
    while (i < FOOD_CLASS_MKOBJ_WALK.length) {
        const p = FOOD_CLASS_MKOBJ_WALK[i][1] | 0;
        prob -= p;
        if (prob <= 0) return FOOD_CLASS_MKOBJ_WALK[i][0] | 0;
        i++;
    }
    return FOOD_CLASS_MKOBJ_WALK[FOOD_CLASS_MKOBJ_WALK.length - 1][0] | 0;
}

/** C: mkobj.c **`mksobj_init`** — **`FOOD_CLASS`** */
export function mksobjInitFoodClassIniInvAfterOtypLikeC(otyp) {
    const t = otyp | 0;
    switch (t) {
        case 174 /* CORPSE */: {
            let tryct = 50;
            let cm = 0;
            do {
                cm = undeadToCorpseIniInvLikeC(rndmonnumIniInvLikeC());
            } while (mvitalsNocorpseLikeC(game, cm) && --tryct > 0);
            if (tryct === 0) {
                /* C: **`corpsenm = PM_HUMAN`** — no extra RNG. */
            }
            break;
        }
        case 175 /* EGG */:
            if (!rn2(3)) {
                for (let tryct = 200; tryct > 0; tryct--) {
                    const mndx = canBeHatchedIniInvLikeC(rndmonnumIniInvLikeC());
                    if (mndx !== NON_PM && !deadSpeciesIniInvLikeC(mndx, true)) break;
                }
            }
            break;
        case 205 /* TIN */:
            if (!rn2(6)) {
                /* SPINACH_TIN */
            } else {
                let tryct = 200;
                while (tryct-- > 0) {
                    const mndx = undeadToCorpseIniInvLikeC(rndmonnumIniInvLikeC());
                    if ((MONS_RNDMONST_CNUTRIT[mndx] | 0) !== 0 && !mvitalsNocorpseLikeC(game, mndx)) {
                        let r = rn2(TTSZ - 1);
                        if (r === ROTTEN_TIN && nonrottingCorpseIniInvLikeC(mndx)) r = HOMEMADE_TIN;
                        void r;
                        break;
                    }
                }
            }
            blessorcurseLikeC(10);
            break;
        case 194 /* SLIME_MOLD */:
            break;
        case 184 /* KELP_FROND */:
            rnd(2);
            break;
        case 197 /* CANDY_BAR */:
            assignCandyWrapperSpeIniInvLikeC();
            break;
        default:
            break;
    }
    if (t >= 180 && t <= 183) {
        rn2(5);
    } else if (t !== 174 && t !== 179 && t !== 184 && !rn2(6)) {
        /* quan 2 */
    }
}

/**
 * C: **`ini_inv`** one **`FOOD_CLASS`** **`UNDEF_TYP`** draw.
 */
export function iniInvOneMkobjFoodUndefDrawLikeC() {
    const otyp = mkobjOtypFoodClassIniInvLikeC();
    nextIdentLikeC();
    mksobjInitFoodClassIniInvAfterOtypLikeC(otyp);
    rn2(1);
}
