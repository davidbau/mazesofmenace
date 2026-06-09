// mkobj_wizard_ini_inv_filter_like_c.js — C mkobj.c + u_init.c ini_inv_mkobj_filter (one while-loop).
// C refs: mkobj.c mkobj/mksobj_init (WAND/RING/POTION/SCROLL/SPBOOK); u_init.c ini_inv_mkobj_filter().

import { rnd, rn2, rn1, rne } from './rng.js';
import { P_NONE } from './const.js';
import {
    mkobjOtypFoodClassIniInvLikeC,
    mksobjInitFoodClassIniInvAfterOtypLikeC,
} from './mkobj_food_class_rng_like_c.js';
import { mkobjScrollOtypLeafDrawLikeC } from './mkobj_scroll_class_rng_like_c.js';
import {
    WAND_CLASS_MKOBJ_OC_PROB_ROWS,
    RING_CLASS_MKOBJ_ROWS,
    POTION_CLASS_MKOBJ_OC_PROB_ROWS,
    SPBOOK_CLASS_MKOBJ_OC_PROB_ROWS,
    SPELLBOOK_OTYP_LEVEL,
    SPELLBOOK_OTYP_OC_SKILL,
    STRANGE_OBJECT_OTYP,
} from './mkobj_wizard_ini_inv_data.js';
import {
    NH5_FOOD_CLASS,
    NH5_POTION_CLASS,
    NH5_RING_CLASS,
    NH5_SCROLL_CLASS,
    NH5_SPBOOK_CLASS,
    NH5_WAND_CLASS,
} from './nh5_objclass.js';
import { DEF_SKILLS_BY_ABBR } from './u_init_skill_defs.js';

const RING_OC_CHARGED = new Map(RING_CLASS_MKOBJ_ROWS);

/** C: last **`mksobj_init`** **`RING_CLASS`** **`obj->spe`** before **`u_init.c`** **`ini_inv_adjust_obj`**. */
let lastIniInvRingMksobjSpe = /** @type {number | undefined} */ (undefined);

const OTYP_WAN_WISHING = 413;
const OTYP_WAN_STASIS = 414;
const OTYP_WAN_NOTHING = 415;
const OTYP_WAN_POLYMORPH = 421;
const OTYP_RIN_LEVITATION = 183;
const OTYP_RIN_AGGRAVATE_MONSTER = 185;
const OTYP_RIN_HUNGER = 184;
const OTYP_RIN_TELEPORTATION = 194;
const OTYP_RIN_POLYMORPH = 196;
const OTYP_RIN_POLYMORPH_CONTROL = 197;
const OTYP_RIN_POISON_RESISTANCE = 188;
const OTYP_POT_POLYMORPH = 316;
const OTYP_POT_HALLUCINATION = 304;
const OTYP_POT_ACID = 320;
const OTYP_SCR_AMNESIA = 338;
const OTYP_SCR_FIRE = 339;
const OTYP_SCR_BLANK_PAPER = 364;
const OTYP_SCR_ENCHANT_WEAPON = 328;
const OTYP_SPE_BLANK_PAPER = 406;
const OTYP_SPE_FORCE_BOLT = 375;
const OTYP_SPE_NOVEL = 407;
const OTYP_SPE_POLYMORPH = 398;
const OTYP_PANCAKE = 290;

const WAND_NODIR = new Map(WAND_CLASS_MKOBJ_OC_PROB_ROWS.map((r) => [r[0], (r[2] | 0) === 1]));

/** @param {readonly (readonly [number, number])[]} rows */
function mkobjOtypFromProbRowsLikeC(rows) {
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

/** C: mkobj.c next_ident — ident += rnd(2) */
function nextIdentLikeC() {
    rnd(2);
}

/** C: mkobj.c blessorcurse — neither blessed nor cursed on fresh obj */
function blessorcurseLikeC(chance) {
    if (!rn2(chance)) {
        rn2(2);
    }
}

function mksobjInitPancakeFoodTailLikeC() {
    if (!rn2(6)) {
        rn2(2);
    }
}

/** C: mkobj.c mksobj_init — SCROLL_CLASS blessorcurse(otmp, 4) */
function mksobjInitScrollBless4LikeC() {
    blessorcurseLikeC(4);
}

/** C: mkobj.c mksobj_init — WAND_CLASS */
function mksobjInitWandLikeC(otyp) {
    if (otyp === OTYP_WAN_WISHING) {
        /* spe = 1 — no RNG */
    } else if (otyp === OTYP_WAN_STASIS) {
        rn1(4, 3);
    } else {
        const nodir = WAND_NODIR.get(otyp) === true;
        rn1(5, nodir ? 11 : 4);
    }
    blessorcurseLikeC(17);
}

/** @param {{ blessed: number; cursed: number }} bc */
function blessorcurseFreshObjLikeC(bc, chance) {
    if (bc.blessed || bc.cursed) return;
    if (!rn2(chance)) {
        if (!rn2(2)) bc.cursed = 1;
        else bc.blessed = 1;
    }
}

function bcsignLikeC(bc) {
    return (!!bc.blessed | 0) - (!!bc.cursed | 0);
}

/**
 * C: mkobj.c **`mksobj_init`** — **`RING_CLASS`** (**`obj->spe`**).
 * @returns {number} **`spe`** after **`mksobj_init`** (**`0`** if not charged).
 */
function mksobjInitRingLikeC(otyp, charged) {
    const bc = { blessed: 0, cursed: 0 };
    if (charged) {
        blessorcurseFreshObjLikeC(bc, 3);
        let spe = 0;
        if (rn2(10)) {
            if (rn2(10) && bcsignLikeC(bc)) {
                spe = bcsignLikeC(bc) * rne(3);
            } else {
                spe = rn2(2) ? rne(3) : -rne(3);
            }
        }
        if (spe === 0) {
            spe = rn2(4) - rn2(3);
        }
        if (spe < 0 && rn2(5)) {
            /* curse(otmp) — no RNG */
        }
        return spe;
    }
    if (
        rn2(10) &&
        (otyp === OTYP_RIN_TELEPORTATION ||
            otyp === OTYP_RIN_POLYMORPH ||
            otyp === OTYP_RIN_AGGRAVATE_MONSTER ||
            otyp === OTYP_RIN_HUNGER ||
            !rn2(9))
    ) {
        /* curse(otmp) — no RNG */
    }
    return 0;
}

/**
 * C: **`u_init.c`** **`ini_inv_adjust_obj`** — when **`trop->trspe == UNDEF_SPE`**, charged ring with **`spe <= 0`** → **`spe = rne(3)`**.
 * @param {number} otyp
 * @param {number} speAfterMksobj
 */
export function iniInvAdjustObjRingSpeUndefTropLikeC(otyp, speAfterMksobj) {
    if (RING_OC_CHARGED.get(otyp) !== 1) return;
    if (speAfterMksobj > 0) return;
    rne(3);
}

/** @returns {number | undefined} */
export function takeLastIniInvRingMksobjSpeLikeC() {
    const v = lastIniInvRingMksobjSpe;
    lastIniInvRingMksobjSpe = undefined;
    return v;
}

function mksobjInitPotionLikeC() {
    blessorcurseLikeC(4);
}

function mksobjInitSpellbookIniInvLikeC() {
    blessorcurseLikeC(17);
}

/**
 * C: u_init.c `restricted_spell_discipline` — `spell_skilltype(otyp)` not in `skills_for_role()`.
 * @param {number} otyp
 * @param {string} roleAbbr C role table key (`Wiz`, `Pri`, `Mon`, `Hea`, …)
 */
/**
 * C: `Role_if` / `Race_if` + `restricted_spell_discipline` for one role table.
 * @param {string} roleAbbr C role abbr (`Tou`, `Ran`, `Val`, `Kni`, …)
 * @param {number} raceMnum C `gu.urace.mnum`
 * @returns {IniInvMkobjFilterCtx}
 */
export function iniInvMkobjFilterCtxForRoleLikeC(roleAbbr, raceMnum) {
    return {
        roleWizard: roleAbbr === 'Wiz',
        roleMonk: roleAbbr === 'Mon',
        raceOrc: (raceMnum | 0) === 4,
        restrictedSpellDiscipline: (otyp) => restrictedSpellDisciplineForRoleLikeC(otyp, roleAbbr),
    };
}

export function restrictedSpellDisciplineForRoleLikeC(otyp, roleAbbr) {
    const sk = SPELLBOOK_OTYP_OC_SKILL.get(otyp);
    if (sk === undefined) return true;
    if (sk === P_NONE) return true;
    const rows = DEF_SKILLS_BY_ABBR[roleAbbr];
    if (!rows) return true;
    for (const [skill] of rows) {
        if (skill === P_NONE) break;
        if (skill === sk) return false;
    }
    return true;
}

/** C: `restricted_spell_discipline` when `skills_for_role()` is `Skill_W[]`. */
export function wizardSpellbookRestrictedLikeC(otyp) {
    return restrictedSpellDisciplineForRoleLikeC(otyp, 'Wiz');
}

/** C: `restricted_spell_discipline` when `skills_for_role()` is `Skill_C[]` (Cleric). */
export function clericSpellbookRestrictedLikeC(otyp) {
    return restrictedSpellDisciplineForRoleLikeC(otyp, 'Pri');
}

/**
 * @typedef {object} IniInvMkobjFilterCtx
 * @property {boolean} roleWizard C `Role_if(PM_WIZARD)` — reject `SPE_FORCE_BOLT`
 * @property {boolean} roleMonk C `Role_if(PM_MONK)` — reject `SCR_ENCHANT_WEAPON`
 * @property {boolean} raceOrc C `Race_if(PM_ORC)` — reject `RIN_POISON_RESISTANCE`
 * @property {(otyp: number) => boolean} restrictedSpellDiscipline C `restricted_spell_discipline(otyp)`
 */

/**
 * @typedef {{ n1: number; n2: number; n3: number; n4: number }} GnLikeC
 * Mirrors C `gn.nocreate`..`nocreate4`.
 */

/** @returns {GnLikeC} */
export function gnIniInvFreshLikeC() {
    return { n1: STRANGE_OBJECT_OTYP, n2: STRANGE_OBJECT_OTYP, n3: STRANGE_OBJECT_OTYP, n4: STRANGE_OBJECT_OTYP };
}

/**
 * C: u_init.c post-UNDEF_typ `switch (otyp)` + `nocreate4` for ring/spellbook.
 * @param {number} oclassNH5
 * @param {number} otyp
 * @param {GnLikeC} gn
 */
export function iniInvGnAfterUndefAcceptLikeC(oclassNH5, otyp, gn) {
    switch (otyp) {
        case OTYP_WAN_POLYMORPH:
        case OTYP_RIN_POLYMORPH:
        case OTYP_POT_POLYMORPH:
            gn.n1 = OTYP_RIN_POLYMORPH_CONTROL;
            break;
        case OTYP_RIN_POLYMORPH_CONTROL:
            gn.n1 = OTYP_RIN_POLYMORPH;
            gn.n2 = OTYP_SPE_POLYMORPH;
            gn.n3 = OTYP_POT_POLYMORPH;
            break;
        default:
            break;
    }
    if (oclassNH5 === NH5_RING_CLASS || oclassNH5 === NH5_SPBOOK_CLASS) {
        gn.n4 = otyp | 0;
    }
}

/** C: u_init.c `ini_inv_mkobj_filter` while-body reject test. */
function iniInvMkobjFilterRejectLikeC(oclassNH5, otyp, gotSp1, gn, ctx) {
    if (otyp === OTYP_WAN_WISHING) return true;
    if (otyp === gn.n1 || otyp === gn.n2 || otyp === gn.n3 || otyp === gn.n4) return true;
    if (otyp === OTYP_RIN_LEVITATION) return true;
    if (otyp === OTYP_POT_HALLUCINATION || otyp === OTYP_POT_ACID) return true;
    if (otyp === OTYP_SCR_AMNESIA || otyp === OTYP_SCR_FIRE || otyp === OTYP_SCR_BLANK_PAPER) return true;
    if (otyp === OTYP_SPE_BLANK_PAPER) return true;
    if (otyp === OTYP_RIN_AGGRAVATE_MONSTER || otyp === OTYP_RIN_HUNGER) return true;
    if (otyp === OTYP_WAN_NOTHING) return true;
    if (otyp === OTYP_RIN_POISON_RESISTANCE && ctx.raceOrc) return true;
    if (otyp === OTYP_SCR_ENCHANT_WEAPON && ctx.roleMonk) return true;
    if (otyp === OTYP_SPE_FORCE_BOLT && ctx.roleWizard) return true;
    if (otyp === OTYP_SPE_NOVEL) return true;
    if (oclassNH5 === NH5_SPBOOK_CLASS) {
        const lv = SPELLBOOK_OTYP_LEVEL.get(otyp) ?? 99;
        const maxLv = gotSp1 ? 3 : 1;
        if (lv > maxLv || ctx.restrictedSpellDiscipline(otyp)) return true;
    }
    return false;
}

/** One C `mkobj`+`mksobj(...,TRUE,FALSE)` leaf RNG after `otyp` pick. */
function mksobjInitForOclassLikeC(oclassNH5, otyp) {
    nextIdentLikeC();
    if (oclassNH5 === NH5_WAND_CLASS) {
        lastIniInvRingMksobjSpe = undefined;
        mksobjInitWandLikeC(otyp);
    } else if (oclassNH5 === NH5_RING_CLASS) {
        lastIniInvRingMksobjSpe = mksobjInitRingLikeC(otyp, RING_OC_CHARGED.get(otyp) === 1);
    } else if (oclassNH5 === NH5_POTION_CLASS) {
        lastIniInvRingMksobjSpe = undefined;
        mksobjInitPotionLikeC();
    } else if (oclassNH5 === NH5_SCROLL_CLASS) {
        lastIniInvRingMksobjSpe = undefined;
        mksobjInitScrollBless4LikeC();
    } else if (oclassNH5 === NH5_SPBOOK_CLASS) {
        lastIniInvRingMksobjSpe = undefined;
        mksobjInitSpellbookIniInvLikeC();
    } else if (oclassNH5 === NH5_FOOD_CLASS) {
        lastIniInvRingMksobjSpe = undefined;
        mksobjInitFoodClassIniInvAfterOtypLikeC(otyp);
    } else {
        lastIniInvRingMksobjSpe = undefined;
    }
}

/** @returns {number} otyp */
function mkobjOtypPickOnlyLikeC(oclassNH5) {
    if (oclassNH5 === NH5_WAND_CLASS) return mkobjOtypFromProbRowsLikeC(WAND_CLASS_MKOBJ_OC_PROB_ROWS);
    if (oclassNH5 === NH5_RING_CLASS) {
        const n = RING_CLASS_MKOBJ_ROWS.length;
        let prob = rnd(n);
        let i = 0;
        while (i < n) {
            prob -= 1;
            if (prob <= 0) break;
            i++;
        }
        if (i >= n) i = n - 1;
        return RING_CLASS_MKOBJ_ROWS[i][0] | 0;
    }
    if (oclassNH5 === NH5_POTION_CLASS) return mkobjOtypFromProbRowsLikeC(POTION_CLASS_MKOBJ_OC_PROB_ROWS);
    if (oclassNH5 === NH5_SCROLL_CLASS) return mkobjScrollOtypLeafDrawLikeC();
    if (oclassNH5 === NH5_SPBOOK_CLASS) return mkobjOtypFromProbRowsLikeC(SPBOOK_CLASS_MKOBJ_OC_PROB_ROWS);
    if (oclassNH5 === NH5_FOOD_CLASS) return mkobjOtypFoodClassIniInvLikeC();
    return OTYP_PANCAKE;
}

/**
 * C: u_init.c `ini_inv_mkobj_filter(int oclass, boolean got_level1_spellbook)`.
 * @param {number} oclassNH5
 * @param {boolean} gotSp1
 * @param {GnLikeC} gn
 * @param {IniInvMkobjFilterCtx} ctx
 * @returns {number} accepted `otyp`
 */
export function iniInvMkobjFilterLikeC(oclassNH5, gotSp1, gn, ctx) {
    let trycnt = 0;
    let otyp = mkobjOtypPickOnlyLikeC(oclassNH5);
    mksobjInitForOclassLikeC(oclassNH5, otyp);
    while (iniInvMkobjFilterRejectLikeC(oclassNH5, otyp, gotSp1, gn, ctx)) {
        if (++trycnt > 1000) {
            lastIniInvRingMksobjSpe = undefined;
            nextIdentLikeC();
            mksobjInitPancakeFoodTailLikeC();
            return OTYP_PANCAKE;
        }
        otyp = mkobjOtypPickOnlyLikeC(oclassNH5);
        mksobjInitForOclassLikeC(oclassNH5, otyp);
    }
    return otyp | 0;
}

/** Human Wizard — `Role_if(PM_WIZARD)` + `Skill_W[]` spell restrictions. */
export function iniInvMkobjFilterWizardHumanLikeC(oclassNH5, gotSp1, gn, raceOrc = false) {
    return iniInvMkobjFilterLikeC(oclassNH5, gotSp1, gn, {
        roleWizard: true,
        roleMonk: false,
        raceOrc,
        restrictedSpellDiscipline: wizardSpellbookRestrictedLikeC,
    });
}

/** Human Cleric — `Skill_C[]` spell restrictions; no wizard-only `SPE_FORCE_BOLT` reject. */
export function iniInvMkobjFilterPriestHumanLikeC(oclassNH5, gotSp1, gn, raceOrc = false) {
    return iniInvMkobjFilterLikeC(oclassNH5, gotSp1, gn, {
        roleWizard: false,
        roleMonk: false,
        raceOrc,
        restrictedSpellDiscipline: clericSpellbookRestrictedLikeC,
    });
}

/** Human Monk UNDEF scroll row — `Role_if(PM_MONK)` rejects `SCR_ENCHANT_WEAPON`. */
export function iniInvMkobjFilterScrollClassMonkLikeC() {
    return iniInvMkobjFilterLikeC(NH5_SCROLL_CLASS, false, gnIniInvFreshLikeC(), {
        roleWizard: false,
        roleMonk: true,
        raceOrc: false,
        restrictedSpellDiscipline: (otyp) => restrictedSpellDisciplineForRoleLikeC(otyp, 'Mon'),
    });
}
