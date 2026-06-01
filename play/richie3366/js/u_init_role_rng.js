// u_init_role_rng.js — C u_init.c / mkobj.c leaf RNG for role inventory (narrow port).
// Used while ini_inv is still stubbed so ISAAC matches upstream before init_attr(75).
// C refs: u_init.c u_init_role (PM_ROGUE … PM_CLERIC / PM_RANGER), ini_inv(), trquan(), mkobj.c mksobj+mksobj_init,
//         mkbox_cnts (SACK empty at moves<=1), blessorcurse().

import { game } from './gstate.js';
import { rnd, rn2, rne, rn1 } from './rng.js';
import { OTYP_LEATHER_ARMOR, P_BOW, P_SHURIKEN } from './const.js';
import { OC_SKILL_ROW_BY_OTYP } from './obj_oc_skill_data.js';
import { iniInvMkobjFilterScrollClassMonkLikeC } from './mkobj_scroll_class_rng_like_c.js';
import { iniInvOneMkobjFoodUndefDrawLikeC } from './mkobj_food_class_rng_like_c.js';
import {
    gnIniInvFreshLikeC,
    iniInvAdjustObjRingSpeUndefTropLikeC,
    iniInvGnAfterUndefAcceptLikeC,
    iniInvMkobjFilterPriestHumanLikeC,
    iniInvMkobjFilterWizardHumanLikeC,
    takeLastIniInvRingMksobjSpeLikeC,
} from './mkobj_wizard_ini_inv_filter_like_c.js';
import { SPELLBOOK_OTYP_LEVEL } from './mkobj_wizard_ini_inv_data.js';
import {
    NH5_ARMOR_CLASS,
    NH5_POTION_CLASS,
    NH5_RING_CLASS,
    NH5_SCROLL_CLASS,
    NH5_SPBOOK_CLASS,
    NH5_TOOL_CLASS,
    NH5_WAND_CLASS,
    NH5_WEAPON_CLASS,
} from './nh5_objclass.js';

/** C `objects_nums` — **`WAN_WISHING`** (`u_init.c` **`Wishing[]`**). */
const OTYP_WAN_WISHING = 413;

/** C objects_nums — OBJECTS_ENUM (nethack-c/upstream/include/objects.h). */
const OTYP_DAGGER = 35;
const OTYP_YA = 22;
const OTYP_SHORT_SWORD = 47;
const OTYP_KATANA = 57;
const OTYP_YUMI = 86;
/** NH5 — matches **`OBJECTS_A_AC_ARMOR`** splint row **125** (`u_init_find_ac.js`). */
const OTYP_SPLINT_MAIL = 125;
/** C `OC_SKILL_ROW_BY_OTYP` — **`SPEAR`** (NH5 **`otyp`** **28**). */
const OTYP_SPEAR_MK = 28;
/** C `OC_SKILL_ROW_BY_OTYP` — **`LONG_SWORD`** / **`LANCE`** (`mksobj_init` WEAPON). */
const OTYP_LONG_SWORD_MK = 55;
const OTYP_LANCE_MK = 73;
const OTYP_SACK = 216;
const OTYP_LOCK_PICK = 221;
const OTYP_POT_SICKNESS = 317;
/** C Wizard[] — `OBJECTS_ENUM` / `objects.h`. */
const OTYP_QUARTERSTAFF = 79;
const OTYP_CLOAK_OF_MAGIC_RESISTANCE = 149;
/** C `objects[]` — **`P_WHIP`** / bullwhip at otyp **82**. */
/** C `objects[]` — **`P_WHIP`** / bullwhip (83 is bow). */
const OTYP_BULLWHIP_MK = 82;
const OTYP_FOOD_RATION = 143;
const OTYP_LEATHER_JACKET = 136;
const OTYP_FEDORA = 93;
/** C `objects_nums` — **`WEPTOOL`** **`pick-axe`** after **`DRUM_OF_EARTHQUAKE`** (**`obj_oc_skill_data.js`** **259**). */
const OTYP_PICK_AXE = 260;
const OTYP_TINNING_KIT = 239;
const OTYP_TOUCHSTONE = 472;
const OTYP_TIN_OPENER = 240;
const OTYP_OIL_LAMP = 228;
/** C `OC_SKILL_ROW_BY_OTYP` — **`SCALPEL`** (`mksobj_init`); NH5 invent **`otyp`** **39** (**`OC`** **40** − **1**). */
const OTYP_SCALPEL_MK = 40;
const OTYP_LEATHER_GLOVES_HEAL = 160;
const OTYP_STETHOSCOPE = 238;
/** C `mkobj_wizard_ini_inv_data.js` **`POTION_CLASS_MKOBJ_OC_PROB_ROWS`** order. */
const OTYP_POT_HEALING = 306;
const OTYP_POT_EXTRA_HEALING = 307;
/** C `spellbook_skill_level_data.js` / `objects.h`. */
const OTYP_SPE_HEALING = 374;
const OTYP_SPE_EXTRA_HEALING = 391;
const OTYP_SPE_STONE_TO_FLESH = 405;
const OTYP_APPLE = 277;
/** C `OC_SKILL` / NH5 — **`TWO_HANDED_SWORD`** **`mk`** **56**, invent **55** (adjacent **`KATANA`** **56** nh5 in **`objects_nums`**). */
const OTYP_TWO_HANDED_SWORD_MK = 56;
const OTYP_AXE_MK = 45;
const OTYP_BATTLE_AXE_MK = 46;
/** NH5 — **`CLUB`**; **`SLING`** after **`YUMI`** **86** (`objects.h` **BOW** block). */
const OTYP_CLUB = 78;
const OTYP_SLING = 87;
const OTYP_FLINT = 473;
const OTYP_ROCK = 474;
/** C `objects[]` — PROJECTILE **`ARROW`** … **`CROSSBOW_BOLT`** (otyp **19–24**, negative **`P_BOW`** … skills). */
const OTYP_FIRST_PROJECTILE = 19;
const OTYP_LAST_PROJECTILE = 24;
const OTYP_ARROW = 19;
/** C `OC_SKILL_ROW_BY_OTYP` — **`DART`** (**NH5 invent** **25**). */
const OTYP_DART = 25;
/** C `objects.h` — first **`BOW("bow"`** after **`BULLWHIP`** (**`otyp`** **84**). */
const OTYP_BOW = 84;
/** C `mklev.js` anchor — **`CRAM_RATION`**. */
const OTYP_CRAM_RATION = 145;
/** C `u_init_find_ac.js` — **`CLOAK_OF_DISPLACEMENT`**. */
const OTYP_CLOAK_OF_DISPLACEMENT = 150;
/** C `objects.h` / **`obj_oc_skill_data.js`** — **`MACE`**. */
const OTYP_MACE = 74;
/** C **`ROBE`** — Monk linker **`otyp`**. */
const OTYP_ROBE = 144;
/** C **`SMALL_SHIELD`** — Valkyrie/Knight anchor **151**. */
const OTYP_SMALL_SHIELD = 151;
/** C **`POT_WATER`** — `water_damage.js` anchor **321**. */
const OTYP_POT_WATER = 321;
/** C `objects.h` FOOD after **`CARROT`** — **`SPRIG_OF_WOLFSBANE`**, **`CLOVE_OF_GARLIC`**. */
const OTYP_SPRIG_WOLFSBANE = 283;
const OTYP_CLOVE_GARLIC = 284;

/** C `obj.h` **`is_multigen`** / **`is_poisonable`** (WEAPON + **`oc_skill`** in **`-P_SHURIKEN`..`-P_BOW`**), extended when **`OC_SKILL_ROW_BY_OTYP`** lacks projectiles **19–24**. */
function weaponAmmoMultigenOrPoisonableLikeC(otyp) {
    const row = OC_SKILL_ROW_BY_OTYP.get(otyp);
    const sk = row?.oc_skill ?? 0;
    if (row?.oclass === NH5_WEAPON_CLASS && sk >= -P_SHURIKEN && sk <= -P_BOW) return true;
    return otyp >= OTYP_FIRST_PROJECTILE && otyp <= OTYP_LAST_PROJECTILE;
}

/** C: mkobj.c next_ident — ident += rnd(2) */
function nextIdentLikeC() {
    rnd(2);
}

/** C: mkobj.c blessorcurse(otmp, chance) — fresh obj: !blessed && !cursed */
function blessorcurseLikeC(chance) {
    if (!rn2(chance)) {
        rn2(2);
    }
}

/** C: mkobj.c mksobj_init — **`WAN_WISHING`** (`spe = 1`, no **`rn1`**). */
function mksobjInitWandWishingDiscoverLikeC() {
    void OTYP_WAN_WISHING;
    blessorcurseLikeC(17);
}

/**
 * C: `u_init_inventory_attrs` — `if (discover) ini_inv(Wishing);` after `u_init_role` / `u_init_race`.
 * Explore sets `discover` via `OPTIONS=playmode:explore` (`options.js`).
 * @param {import('./gstate.js').game} [g]
 */
export function consumeIniInvWishingDiscoverRngIfLikeC(g = game) {
    if (!g.program_state?.discover) return;
    trquanMinMaxLikeC(1, 1);
    nextIdentLikeC();
    mksobjInitWandWishingDiscoverLikeC();
}

/**
 * C: `u_init_inventory_attrs` — `if (u.umoney0) ini_inv(Money);` after Wishing when discover.
 * @param {import('./gstate.js').game} [g]
 */
export function consumeIniInvMoneyRngIfLikeC(g = game) {
    if (((g.u?.umoney0 ?? 0) | 0) <= 0) return;
    trquanMinMaxLikeC(1, 1);
    nextIdentLikeC();
}

/** C: mkobj.c mksobj_init — WEAPON_CLASS (artif always FALSE for ini_inv). */
function mksobjInitWeaponLikeC(otyp, artif) {
    const multigen = weaponAmmoMultigenOrPoisonableLikeC(otyp);
    if (multigen) {
        rn1(6, 6);
    }
    if (!rn2(11)) {
        rne(3);
        rn2(2);
    } else if (!rn2(10)) {
        rne(3);
    } else {
        blessorcurseLikeC(10);
    }
    if (multigen && !rn2(100)) {
        /* otmp->opoisoned = 1 */
    }
    if (artif) {
        /* mk_artifact — ini_inv uses artif FALSE */
    }
}

/** C: mkobj.c mksobj_init — ARMOR_CLASS (leather armor: none of the named “bad” armors). */
function mksobjInitArmorLikeC(artif) {
    const r1 = rn2(10);
    let curseBranch = false;
    if (r1 !== 0) {
        curseBranch = !rn2(11);
    }
    if (curseBranch) {
        rne(3);
    } else if (!rn2(10)) {
        rn2(2);
        rne(3);
    } else {
        blessorcurseLikeC(10);
    }
    if (artif) {
        /* mk_artifact — ini_inv uses artif FALSE */
    }
}

/** C: mkobj.c mksobj_init — POTION_CLASS blessorcurse(otmp, 4) */
function mksobjInitPotionLikeC() {
    blessorcurseLikeC(4);
}

/** C: mkobj.c mksobj_init — SCROLL_CLASS blessorcurse(otmp, 4) */
function mksobjInitScrollIniInvLikeC() {
    blessorcurseLikeC(4);
}

/** C: mkobj.c mksobj_init — SPBOOK_CLASS blessorcurse(otmp, 17) */
function mksobjInitSpellbookIniInvLikeC() {
    blessorcurseLikeC(17);
}

/** C: mkobj.c mksobj_init — MAGIC_MARKER `otmp->spe = rn1(70, 30)` */
function mksobjInitMagicMarkerSpeRn1LikeC() {
    rn1(70, 30);
}

/**
 * C: mkobj.c mkbox_cnts — always `for (n = rn2(n + 1); n > 0; n--)`.
 * Startup SACK sets `n = 0` in the switch but still evaluates `rn2(1)` before the loop.
 * Non-startup SACK/OILSKIN fall through to `n = 1` → `rn2(2)` (body RNG deferred).
 */
function mksobjInitSackStartInvLikeC() {
    const n =
        (game.moves | 0) <= 1 && !game.in_mklev
            ? 0
            : 1;
    rn2(n + 1);
}

/** C: mkobj.c FOOD default tail — **`!rn2(6)`** sets **`quan`** **2** (food ration, apple, carrot, …). */
function mksobjInitDefaultFoodQuanMaybeDoubleLikeC() {
    return !rn2(6) ? 2 : 1;
}

/** C: mkobj.c FOOD_RATION path — same default **`quan`** tail as other non-corpse food. */
function mksobjInitFoodRationQuanLikeC() {
    return mksobjInitDefaultFoodQuanMaybeDoubleLikeC();
}

/** C: mkobj.c **`mksobj_init`** — **`GEM_CLASS`** — **FLINT** (not **`LUCKSTONE`**) **`!rn2(6)`** → stack **2** else **1**. */
function mksobjInitGemFlintStackQuanLikeC() {
    return !rn2(6) ? 2 : 1;
}

/** C: mkobj.c **`GEM_CLASS`** — **`TOUCHSTONE`** / non-**`LUCKSTONE`** gray: **`!rn2(6)`** → **`quan`** **2** (overwritten to **1** by **`ini_inv_adjust_obj`**). */
function mksobjInitTouchstoneGemQuanDrawLikeC() {
    if (!rn2(6)) {
        /* otmp->quan = 2 — C ini_inv_adjust_obj forces graystone stack to 1 */
    }
}

/** C: mkobj.c **`OIL_LAMP`** — **`age = rn1(500, 1000)`**, **`blessorcurse(otmp, 5)`**. */
function mksobjInitOilLampToolLikeC() {
    rn1(500, 1000);
    blessorcurseLikeC(5);
}

/**
 * C: u_init.c — **`if (!rn2(5)) ini_inv(Blindfold)`** after role **`trobj[]`** (Rogue, Samurai, Wizard).
 * **`ini_inv(Blindfold)`**: **`trquan`** (**`rn2(1)`**), **`mksobj`** **`next_ident`** (**`rnd(2)`**), **`ini_inv_adjust_obj`** **`trquan`** (**`rn2(1)`**).
 * @returns {boolean} gate open (Rogue / Samurai / Wizard linkers store on role-specific **`g._…IniBlindfold`**).
 */
export function consumeIniInvBlindfoldLeafRngIfGateLikeC() {
    const open = rn2(5) === 0;
    if (open) {
        rn2(1);
        nextIdentLikeC();
        rn2(1);
    }
    return open;
}

/**
 * C: u_init.c u_init_role PM_ROGUE + ini_inv(Rogue[]) for human (no race subs).
 * Order: trquan/mksobj/adjust per u_init.c ini_inv + ini_inv_adjust_obj.
 */
export function consumeRogueHumanIniInvUinitRoleRngLikeC() {
    /* SHORT_SWORD */
    rn2(1);
    nextIdentLikeC();
    mksobjInitWeaponLikeC(OTYP_SHORT_SWORD, false);
    rn2(1);

    /* DAGGER — C ini_inv: first trquan(trop) consumes RNG; adjust sets quan from second trquan() */
    rn2(10);
    nextIdentLikeC();
    mksobjInitWeaponLikeC(OTYP_DAGGER, false);
    game._rogueIniDaggerQuan = 6 + rn2(10);

    /* LEATHER_ARMOR */
    rn2(1);
    nextIdentLikeC();
    mksobjInitArmorLikeC(false);

    /* POT_SICKNESS */
    rn2(1);
    nextIdentLikeC();
    mksobjInitPotionLikeC();

    /* LOCK_PICK — no tool-specific mksobj_init RNG */
    rn2(1);
    nextIdentLikeC();
    rn2(1);

    /* SACK */
    rn2(1);
    nextIdentLikeC();
    mksobjInitSackStartInvLikeC();
    rn2(1);

    /* C u_init.c PM_ROGUE — optional Blindfold after Rogue[] (Samurai/Wizard share same gate when ported). */
    game._rogueIniBlindfold = consumeIniInvBlindfoldLeafRngIfGateLikeC();
}

/**
 * C: u_init.c **`PM_SAMURAI`** **`ini_inv(Samurai[])`** for human (no race subs) + **`!rn2(5)`** blindfold.
 * Order: **`trquan`** / **`mksobj`** / **`ini_inv_adjust_obj`** **`trquan`** per C **`ini_inv`** (weapons: two **`trquan`** each; YA quan from second **`trquan`** → **`g._samuraiIniYaQuan`**).
 */
export function consumeSamuraiHumanIniInvUinitRoleRngLikeC() {
    /* KATANA */
    rn2(1);
    nextIdentLikeC();
    mksobjInitWeaponLikeC(OTYP_KATANA, false);
    rn2(1);

    /* SHORT_SWORD (wakizashi) */
    rn2(1);
    nextIdentLikeC();
    mksobjInitWeaponLikeC(OTYP_SHORT_SWORD, false);
    rn2(1);

    /* YUMI */
    rn2(1);
    nextIdentLikeC();
    mksobjInitWeaponLikeC(OTYP_YUMI, false);
    rn2(1);

    /* YA — first **`trquan`** then adjust stack from second **`trquan`** */
    26 + rn2(20);
    nextIdentLikeC();
    mksobjInitWeaponLikeC(OTYP_YA, false);
    game._samuraiIniYaQuan = 26 + rn2(20);

    /* SPLINT_MAIL */
    rn2(1);
    nextIdentLikeC();
    mksobjInitArmorLikeC(false);

    /* C **`u_init_role`**: **`if (!rn2(5)) ini_inv(Blindfold)`** after **`Samurai[]`**. */
    game._samuraiIniBlindfold = consumeIniInvBlindfoldLeafRngIfGateLikeC();
}

/**
 * C: u_init.c **`PM_KNIGHT`** **`ini_inv(Knight[])`** for human (no **`Lamp`** / blindfold after pack).
 * Apples/carrots: per-obj **`mksobj`** (**`next_ident`** + default FOOD **`!rn2(6)`** stack quan); entering APPLE/CARROT **`quan = 10 + rn2(1)`** each.
 */
export function consumeKnightHumanIniInvUinitRoleRngLikeC() {
    /* LONG_SWORD +1 */
    rn2(1);
    nextIdentLikeC();
    mksobjInitWeaponLikeC(OTYP_LONG_SWORD_MK, false);
    rn2(1);

    /* LANCE +1 */
    rn2(1);
    nextIdentLikeC();
    mksobjInitWeaponLikeC(OTYP_LANCE_MK, false);
    rn2(1);

    /* RING_MAIL +1 */
    rn2(1);
    nextIdentLikeC();
    mksobjInitArmorLikeC(false);
    rn2(1);

    /* HELMET +0 */
    rn2(1);
    nextIdentLikeC();
    mksobjInitArmorLikeC(false);
    rn2(1);

    /* SMALL_SHIELD +0 */
    rn2(1);
    nextIdentLikeC();
    mksobjInitArmorLikeC(false);
    rn2(1);

    /* LEATHER_GLOVES +0 */
    rn2(1);
    nextIdentLikeC();
    mksobjInitArmorLikeC(false);
    rn2(1);

    game._knightIniAppleQuans = [];
    rn2(1);
    for (let i = 0; i < 10; i++) {
        nextIdentLikeC();
        game._knightIniAppleQuans.push(mksobjInitDefaultFoodQuanMaybeDoubleLikeC());
    }

    game._knightIniCarrotQuans = [];
    rn2(1);
    for (let i = 0; i < 10; i++) {
        nextIdentLikeC();
        game._knightIniCarrotQuans.push(mksobjInitDefaultFoodQuanMaybeDoubleLikeC());
    }
}

/**
 * C: u_init.c **`PM_VALKYRIE`** **`ini_inv(Valkyrie[])`** for human + optional **`!rn2(6)`** **`ini_inv(Lamp)`**.
 */
export function consumeValkyrieHumanIniInvUinitRoleRngLikeC() {
    /* SPEAR +1 */
    rn2(1);
    nextIdentLikeC();
    mksobjInitWeaponLikeC(OTYP_SPEAR_MK, false);
    rn2(1);

    /* DAGGER */
    rn2(1);
    nextIdentLikeC();
    mksobjInitWeaponLikeC(OTYP_DAGGER, false);
    rn2(1);

    /* SMALL_SHIELD +3 */
    rn2(1);
    nextIdentLikeC();
    mksobjInitArmorLikeC(false);

    /* FOOD_RATION */
    rn2(1);
    nextIdentLikeC();
    game._valkyrieIniFoodQuan = mksobjInitFoodRationQuanLikeC();

    /* C: **`if (!rn2(6)) ini_inv(Lamp)`** — oil lamp **`mksobj_init`**. */
    game._valkyrieIniLamp = !rn2(6);
    if (game._valkyrieIniLamp) {
        rn2(1);
        nextIdentLikeC();
        mksobjInitOilLampToolLikeC();
        rn2(1);
    }
}

/** C **`M_spell[]`** order: Healing, Protection, Confuse monster. */
const OTYP_MONK_MSPELL_BOOKS = /** @type {const} */ ([373, 402, 376]);

/**
 * C: u_init.c **`PM_MONK`** **`u_init_role`** — **`ini_inv(Monk[])`**, **`M_spell[rn2(90)/30]`**,
 * **`!rn2(4)`** **`Magicmarker`**, **`else if (!rn2(10))`** **`Lamp`** (human; no race subs).
 */
/** C: `trquan()` when `trquan_min` non-zero — `min + rn2(max - min + 1)`. */
function trquanMinMaxLikeC(min, max) {
    if (!min) return 1;
    return min + rn2(max - min + 1);
}

/**
 * C: u_init.c **`PM_WIZARD`** **`ini_inv(Wizard[])`** for human (no race subs) + **`!rn2(5)`** blindfold.
 * Order: **`trquan`** / **`mksobj`** / **`ini_inv_adjust_obj`** per C **`ini_inv`** + **`ini_inv_mkobj_filter`** gn state.
 * Wizard UNDEF rings: **`ini_inv_adjust_obj`** — charged **`spe <= 0`** → **`rne(3)`** (**`takeLastIniInvRingMksobjSpeLikeC`** + **`iniInvAdjustObjRingSpeUndefTropLikeC`**).
 */
export function consumeWizardHumanIniInvUinitRoleRngLikeC() {
    const gn = gnIniInvFreshLikeC();

    /* QUARTERSTAFF +1 blessed */
    trquanMinMaxLikeC(1, 1);
    nextIdentLikeC();
    mksobjInitWeaponLikeC(OTYP_QUARTERSTAFF, false);
    rn2(1);

    /* CLOAK_OF_MAGIC_RESISTANCE +0 — ARMOR: no second trquan in ini_inv_adjust_obj */
    trquanMinMaxLikeC(1, 1);
    nextIdentLikeC();
    mksobjInitArmorLikeC(false);

    /* UNDEF wand */
    trquanMinMaxLikeC(1, 1);
    game._wizardIniWandOtyp = iniInvMkobjFilterWizardHumanLikeC(NH5_WAND_CLASS, false, gn, false);
    iniInvGnAfterUndefAcceptLikeC(NH5_WAND_CLASS, game._wizardIniWandOtyp | 0, gn);

    const ringQ = trquanMinMaxLikeC(2, 2);
    game._wizardIniRingQuan = ringQ;
    game._wizardIniRingOtyps = [];
    for (let i = 0; i < ringQ; i++) {
        const ro = iniInvMkobjFilterWizardHumanLikeC(NH5_RING_CLASS, false, gn, false);
        const speMk = takeLastIniInvRingMksobjSpeLikeC();
        iniInvAdjustObjRingSpeUndefTropLikeC(ro, speMk ?? 0);
        game._wizardIniRingOtyps.push(ro);
        iniInvGnAfterUndefAcceptLikeC(NH5_RING_CLASS, ro, gn);
    }

    const potQ = trquanMinMaxLikeC(3, 3);
    game._wizardIniPotionQuan = potQ;
    game._wizardIniPotionOtyps = [];
    for (let i = 0; i < potQ; i++) {
        const po = iniInvMkobjFilterWizardHumanLikeC(NH5_POTION_CLASS, false, gn, false);
        game._wizardIniPotionOtyps.push(po);
        iniInvGnAfterUndefAcceptLikeC(NH5_POTION_CLASS, po, gn);
    }

    const scrQ = trquanMinMaxLikeC(3, 3);
    game._wizardIniScrollQuan = scrQ;
    game._wizardIniScrollOtyps = [];
    for (let i = 0; i < scrQ; i++) {
        const so = iniInvMkobjFilterWizardHumanLikeC(NH5_SCROLL_CLASS, false, gn, false);
        game._wizardIniScrollOtyps.push(so);
        iniInvGnAfterUndefAcceptLikeC(NH5_SCROLL_CLASS, so, gn);
    }

    /* SPE_FORCE_BOLT — fixed; sets **`got_sp1`** in C before UNDEF spellbook */
    trquanMinMaxLikeC(1, 1);
    nextIdentLikeC();
    mksobjInitSpellbookIniInvLikeC();

    /* UNDEF spellbook — `got_level1_spellbook` TRUE */
    trquanMinMaxLikeC(1, 1);
    game._wizardIniSecondSpellbookOtyp = iniInvMkobjFilterWizardHumanLikeC(NH5_SPBOOK_CLASS, true, gn, false);
    iniInvGnAfterUndefAcceptLikeC(NH5_SPBOOK_CLASS, game._wizardIniSecondSpellbookOtyp | 0, gn);

    /* MAGIC_MARKER — TOOL: adjust **`trquan`** then **`trspe` 19 + **`rn2(4)`** */
    trquanMinMaxLikeC(1, 1);
    nextIdentLikeC();
    mksobjInitMagicMarkerSpeRn1LikeC();
    rn2(1);
    game._wizardIniMagicmarkerSpe = 19 + rn2(4);

    game._wizardIniBlindfold = consumeIniInvBlindfoldLeafRngIfGateLikeC();
}

/**
 * C: u_init.c **`PM_ARCHEOLOGIST`** **`ini_inv(Archeologist[])`** for human (no race subs) +
 * **`if (!rn2(10)) ini_inv(Tinopener); else if (!rn2(4)) ini_inv(Lamp); else if (!rn2(5)) ini_inv(Magicmarker);`**
 * (**strict** **`if` / `else if`** — only one optional pack’s draws).
 */
export function consumeArcheologistHumanIniInvUinitRoleRngLikeC() {
    /* BULLWHIP +2 */
    rn2(1);
    nextIdentLikeC();
    mksobjInitWeaponLikeC(OTYP_BULLWHIP_MK, false);
    rn2(1);

    /* LEATHER_JACKET +0 */
    rn2(1);
    nextIdentLikeC();
    mksobjInitArmorLikeC(false);

    /* FEDORA +0 */
    rn2(1);
    nextIdentLikeC();
    mksobjInitArmorLikeC(false);

    const foodQ = 3 + rn2(1);
    game._archIniFoodRationQuans = [];
    for (let i = 0; i < foodQ; i++) {
        nextIdentLikeC();
        game._archIniFoodRationQuans.push(mksobjInitFoodRationQuanLikeC());
        rn2(1);
    }

    /* PICK_AXE — TOOL_CLASS **`WEPTOOL`**: no **`mksobj_init`** tool branch */
    rn2(1);
    nextIdentLikeC();
    rn2(1);

    /* TINNING_KIT — C **`MAGIC_MARKER`** / **`TINNING_KIT`** shared **`rn1(70,30)`** */
    rn2(1);
    nextIdentLikeC();
    game._archIniTinningSpe = rn1(70, 30);
    rn2(1);

    /* TOUCHSTONE */
    rn2(1);
    nextIdentLikeC();
    mksobjInitTouchstoneGemQuanDrawLikeC();

    /* SACK */
    rn2(1);
    nextIdentLikeC();
    mksobjInitSackStartInvLikeC();
    rn2(1);

    if (!rn2(10)) {
        rn2(1);
        nextIdentLikeC();
        rn2(1);
        game._archIniExtra = 'tin';
        game._archIniMagicmarkerSpe = undefined;
    } else if (!rn2(4)) {
        rn2(1);
        nextIdentLikeC();
        mksobjInitOilLampToolLikeC();
        rn2(1);
        game._archIniExtra = 'lamp';
        game._archIniMagicmarkerSpe = undefined;
    } else if (!rn2(5)) {
        rn2(1);
        nextIdentLikeC();
        mksobjInitMagicMarkerSpeRn1LikeC();
        game._archIniMagicmarkerSpe = 19 + rn2(4);
        rn2(1);
        game._archIniExtra = 'marker';
    } else {
        game._archIniExtra = null;
        game._archIniMagicmarkerSpe = undefined;
    }
}

/**
 * C: u_init.c **`PM_HEALER`** **`u_init_role`** — **`u.umoney0 = rn1(1000,1001)`** then **`ini_inv(Healer[])`**,
 * **`if (!rn2(25)) ini_inv(Lamp)`** (human; no race subs). Money **`rn1`** must precede pack draws (see **`u_init_money.js`**).
 */
export function consumeHealerHumanIniInvUinitRoleRngLikeC() {
    game._healerIniUmoney0Rn1 = rn1(1000, 1001);

    /* SCALPEL */
    rn2(1);
    nextIdentLikeC();
    mksobjInitWeaponLikeC(OTYP_SCALPEL_MK, false);
    rn2(1);

    /* LEATHER_GLOVES +1 */
    rn2(1);
    nextIdentLikeC();
    mksobjInitArmorLikeC(false);

    /* STETHOSCOPE */
    rn2(1);
    nextIdentLikeC();
    rn2(1);

    const healQ = 4 + rn2(1);
    for (let i = 0; i < healQ; i++) {
        nextIdentLikeC();
        mksobjInitPotionLikeC();
        rn2(1);
    }

    const extraHealQ = 4 + rn2(1);
    for (let i = 0; i < extraHealQ; i++) {
        nextIdentLikeC();
        mksobjInitPotionLikeC();
        rn2(1);
    }

    const gn = gnIniInvFreshLikeC();
    trquanMinMaxLikeC(1, 1);
    game._healerIniWandOtyp = iniInvMkobjFilterWizardHumanLikeC(NH5_WAND_CLASS, false, gn, false);
    iniInvGnAfterUndefAcceptLikeC(NH5_WAND_CLASS, game._healerIniWandOtyp | 0, gn);
    rn2(1);

    trquanMinMaxLikeC(1, 1);
    nextIdentLikeC();
    mksobjInitSpellbookIniInvLikeC();
    rn2(1);

    trquanMinMaxLikeC(1, 1);
    nextIdentLikeC();
    mksobjInitSpellbookIniInvLikeC();
    rn2(1);

    trquanMinMaxLikeC(1, 1);
    nextIdentLikeC();
    mksobjInitSpellbookIniInvLikeC();
    rn2(1);

    rn2(1);
    game._healerIniAppleQuans = [];
    const appleQ = 5 + rn2(1);
    for (let i = 0; i < appleQ; i++) {
        nextIdentLikeC();
        game._healerIniAppleQuans.push(mksobjInitDefaultFoodQuanMaybeDoubleLikeC());
    }

    game._healerIniLamp = !rn2(25);
    if (game._healerIniLamp) {
        rn2(1);
        nextIdentLikeC();
        mksobjInitOilLampToolLikeC();
        rn2(1);
    }
}

/**
 * C: u_init.c **`PM_BARBARIAN`** — **`if (rn2(100) >= 50) ini_inv(Barbarian_0); else ini_inv(Barbarian_1);`**
 * then **`if (!rn2(6)) ini_inv(Lamp)`** (human; no race subs).
 */
export function consumeBarbarianHumanIniInvUinitRoleRngLikeC() {
    const pack0 = rn2(100) >= 50;
    game._barbarianIniPack0 = pack0;

    if (pack0) {
        rn2(1);
        nextIdentLikeC();
        mksobjInitWeaponLikeC(OTYP_TWO_HANDED_SWORD_MK, false);
        rn2(1);

        rn2(1);
        nextIdentLikeC();
        mksobjInitWeaponLikeC(OTYP_AXE_MK, false);
        rn2(1);
    } else {
        rn2(1);
        nextIdentLikeC();
        mksobjInitWeaponLikeC(OTYP_BATTLE_AXE_MK, false);
        rn2(1);

        rn2(1);
        nextIdentLikeC();
        mksobjInitWeaponLikeC(OTYP_SHORT_SWORD, false);
        rn2(1);
    }

    rn2(1);
    nextIdentLikeC();
    mksobjInitArmorLikeC(false);
    rn2(1);

    rn2(1);
    nextIdentLikeC();
    game._barbarianIniFoodQuan = mksobjInitFoodRationQuanLikeC();

    game._barbarianIniLamp = !rn2(6);
    if (game._barbarianIniLamp) {
        rn2(1);
        nextIdentLikeC();
        mksobjInitOilLampToolLikeC();
        rn2(1);
    }
}

/**
 * C: u_init.c **`PM_CAVE_DWELLER`** — **`ini_inv(Cave_man[])`** (human; no race subs).
 * **`Cave_man[]`**: club **`+1`**, sling **`+2`**, flint **`10..20`** separate **`mksobj`** stacks
 * (**`mksobj_init`** GEM **FLINT** **`!rn2(6)`** quan **2** else **1**), rock **`3+rn2(1)`** stacks
 * (**`ROCK`** **`rn1(6,6)`** quan each), leather armor **`+0`**.
 */
export function consumeCaveDwellerHumanIniInvUinitRoleRngLikeC() {
    /* CLUB +1 */
    rn2(1);
    nextIdentLikeC();
    mksobjInitWeaponLikeC(OTYP_CLUB, false);
    rn2(1);

    /* SLING +2 */
    rn2(1);
    nextIdentLikeC();
    mksobjInitWeaponLikeC(OTYP_SLING, false);
    rn2(1);

    const nFlint = 10 + rn2(11);
    game._caveIniNFlintTrobj = nFlint;
    let flintQuanSum = 0;
    for (let i = 0; i < nFlint; i++) {
        nextIdentLikeC();
        flintQuanSum += mksobjInitGemFlintStackQuanLikeC();
    }
    game._caveIniFlintQuan = flintQuanSum;

    const nRock = 3 + rn2(1);
    game._caveIniNRockTrobj = nRock;
    let rockQuanSum = 0;
    for (let i = 0; i < nRock; i++) {
        nextIdentLikeC();
        rockQuanSum += rn1(6, 6);
    }
    game._caveIniRockQuan = rockQuanSum;

    /* LEATHER_ARMOR +0 */
    rn2(1);
    nextIdentLikeC();
    mksobjInitArmorLikeC(false);
    rn2(1);
}

/**
 * C: u_init.c **`PM_RANGER`** — **`ini_inv(Ranger[])`** for human (no race subs).
 * **`u_init_role`**: **`knows_class(WEAPON_CLASS)`** only (no RNG). Order: **`trquan`** / **`mksobj`** **`next_ident`**
 * / **`mksobj_init`** / second **`trquan`** on **WEAPON** rows (**`ini_inv_adjust_obj`**); cram **FOOD** × **`4+rn2(1)`**
 * with default FOOD **`!rn2(6)`** stack quan each (**`mksobjInitDefaultFoodQuanMaybeDoubleLikeC`** + per-obj tail **`rn2(1)`** like Monk ration loop).
 */
export function consumeRangerHumanIniInvUinitRoleRngLikeC() {
    /* DAGGER +1 */
    rn2(1);
    nextIdentLikeC();
    mksobjInitWeaponLikeC(OTYP_DAGGER, false);
    rn2(1);

    /* BOW +1 */
    rn2(1);
    nextIdentLikeC();
    mksobjInitWeaponLikeC(OTYP_BOW, false);
    rn2(1);

    /* ARROW +2 — first **`trquan`** then stack from second **`trquan`** */
    50 + rn2(10);
    nextIdentLikeC();
    mksobjInitWeaponLikeC(OTYP_ARROW, false);
    game._rangerIniArrow1Quan = 50 + rn2(10);

    /* ARROW +0 */
    30 + rn2(10);
    nextIdentLikeC();
    mksobjInitWeaponLikeC(OTYP_ARROW, false);
    game._rangerIniArrow2Quan = 30 + rn2(10);

    /* CLOAK_OF_DISPLACEMENT +2 */
    rn2(1);
    nextIdentLikeC();
    mksobjInitArmorLikeC(false);
    rn2(1);

    const nc = 4 + rn2(1);
    game._rangerIniCramN = nc;
    game._rangerIniCramQuans = [];
    for (let i = 0; i < nc; i++) {
        nextIdentLikeC();
        game._rangerIniCramQuans.push(mksobjInitDefaultFoodQuanMaybeDoubleLikeC());
        rn2(1);
    }
}

/**
 * C: u_init.c **`PM_CLERIC`** — **`ini_inv(Priest[])`** for human (no race subs) + **`!rn2(5)`** **`Magicmarker`**
 * **`else if (!rn2(10))`** **`Lamp`** (**strict** **`else if`** — lamp gate only when marker misses).
 */
export function consumePriestHumanIniInvUinitRoleRngLikeC() {
    /* MACE +1 (blessed from **`trobj.trbless`**) */
    rn2(1);
    nextIdentLikeC();
    mksobjInitWeaponLikeC(OTYP_MACE, false);
    rn2(1);

    /* ROBE +0 */
    rn2(1);
    nextIdentLikeC();
    mksobjInitArmorLikeC(false);
    rn2(1);

    /* SMALL_SHIELD +0 */
    rn2(1);
    nextIdentLikeC();
    mksobjInitArmorLikeC(false);
    rn2(1);

    /* POT_WATER × 4 (blessed holy water) */
    const holyQ = 4 + rn2(1);
    for (let i = 0; i < holyQ; i++) {
        nextIdentLikeC();
        mksobjInitPotionLikeC();
        rn2(1);
    }

    /* CLOVE_OF_GARLIC */
    rn2(1);
    nextIdentLikeC();
    mksobjInitDefaultFoodQuanMaybeDoubleLikeC();
    rn2(1);

    /* SPRIG_OF_WOLFSBANE */
    rn2(1);
    nextIdentLikeC();
    mksobjInitDefaultFoodQuanMaybeDoubleLikeC();
    rn2(1);

    const gn = gnIniInvFreshLikeC();
    const sbQ = trquanMinMaxLikeC(2, 2);
    game._priestIniSpellbookOtyps = [];
    let gotSp1 = false;
    for (let i = 0; i < sbQ; i++) {
        const otyp = iniInvMkobjFilterPriestHumanLikeC(NH5_SPBOOK_CLASS, gotSp1, gn, false);
        game._priestIniSpellbookOtyps.push(otyp);
        iniInvGnAfterUndefAcceptLikeC(NH5_SPBOOK_CLASS, otyp, gn);
        if ((SPELLBOOK_OTYP_LEVEL.get(otyp) ?? 99) === 1) gotSp1 = true;
        rn2(1);
    }

    game._priestIniMagicmarker = !rn2(5);
    if (game._priestIniMagicmarker) {
        rn2(1);
        nextIdentLikeC();
        mksobjInitMagicMarkerSpeRn1LikeC();
        game._priestIniMagicmarkerSpe = 19 + rn2(4);
        rn2(1);
    } else {
        game._priestIniLamp = !rn2(10);
        if (game._priestIniLamp) {
            rn2(1);
            nextIdentLikeC();
            mksobjInitOilLampToolLikeC();
            rn2(1);
        }
    }
}

/**
 * C: u_init.c **`PM_TOURIST`** — **`u.umoney0 = rnd(1000)`** then **`ini_inv(Tourist[])`** + strict optional tool chain.
 * Money replay: **`u_init_money.js`** (**`game._touristIniUmoney0Rnd`**).
 */
export function consumeTouristHumanIniInvUinitRoleRngLikeC() {
    game._touristIniUmoney0Rnd = rnd(1000);

    /* DART +2 — C **`ini_inv`**: **`quan = trquan(trop)`** then **`mksobj`**; **`ini_inv_adjust_obj`**
     * sets **`obj->quan = trquan(trop)`** again for **`WEAPON_CLASS`** (**`u_init.c`** ~1226–1228), two draws. */
    trquanMinMaxLikeC(21, 40);
    nextIdentLikeC();
    mksobjInitWeaponLikeC(OTYP_DART, false);
    game._touristIniDartQuan = trquanMinMaxLikeC(21, 40);

    const foodN = trquanMinMaxLikeC(10, 10);
    for (let i = 0; i < foodN; i++) {
        iniInvOneMkobjFoodUndefDrawLikeC();
    }

    const potN = trquanMinMaxLikeC(2, 2);
    for (let i = 0; i < potN; i++) {
        nextIdentLikeC();
        mksobjInitPotionLikeC();
    }

    const scrN = trquanMinMaxLikeC(4, 4);
    for (let i = 0; i < scrN; i++) {
        nextIdentLikeC();
        mksobjInitScrollIniInvLikeC();
    }

    trquanMinMaxLikeC(1, 1);
    nextIdentLikeC();
    mksobjInitArmorLikeC(false);

    /* EXPENSIVE_CAMERA — C **`ini_inv`**: advance **`quan = trquan`**, **`mksobj`**, **`ini_inv_adjust_obj`** (**`TOOL_CLASS`**) second **`trquan`**. */
    trquanMinMaxLikeC(1, 1);
    nextIdentLikeC();
    game._touristIniCameraSpe = rn1(70, 30);
    trquanMinMaxLikeC(1, 1);

    /* CREDIT_CARD — same **`TOOL_CLASS`** double-**`trquan`** pattern; plain tool has no extra **`mksobj_init`** draws. */
    trquanMinMaxLikeC(1, 1);
    nextIdentLikeC();
    trquanMinMaxLikeC(1, 1);

    if (!rn2(25)) {
        rn2(1);
        nextIdentLikeC();
        rn2(1);
        game._touristIniExtra = 'tinopener';
        game._touristIniMagicmarkerSpe = undefined;
    } else if (!rn2(25)) {
        rn2(1);
        nextIdentLikeC();
        rn2(1);
        game._touristIniExtra = 'leash';
        game._touristIniMagicmarkerSpe = undefined;
    } else if (!rn2(25)) {
        rn2(1);
        nextIdentLikeC();
        rn2(1);
        game._touristIniExtra = 'towel';
        game._touristIniMagicmarkerSpe = undefined;
    } else if (!rn2(20)) {
        rn2(1);
        nextIdentLikeC();
        mksobjInitMagicMarkerSpeRn1LikeC();
        game._touristIniMagicmarkerSpe = 19 + rn2(4);
        rn2(1);
        game._touristIniExtra = 'marker';
    } else {
        game._touristIniExtra = null;
        game._touristIniMagicmarkerSpe = undefined;
    }
}

export function consumeMonkHumanIniInvUinitRoleRngLikeC() {
    /* `quan = trquan` — gloves `1+rn2(1)` */
    rn2(1);
    nextIdentLikeC();
    mksobjInitArmorLikeC(false);
    rn2(1);

    rn2(1);
    nextIdentLikeC();
    mksobjInitArmorLikeC(false);
    rn2(1);

    /* UNDEF scroll row: `quan = trquan` then mkobj filter */
    rn2(1);
    game._monkIniUndefScrollOtyp = iniInvMkobjFilterScrollClassMonkLikeC();

    const pq = 3 + rn2(1);
    game._monkIniPotionHealingQuan = pq;
    for (let i = 0; i < pq; i++) {
        nextIdentLikeC();
        mksobjInitPotionLikeC();
        rn2(1);
    }

    const rq = 3 + rn2(1);
    game._monkIniFoodRationQuan = rq;
    for (let i = 0; i < rq; i++) {
        nextIdentLikeC();
        mksobjInitFoodRationQuanLikeC();
        rn2(1);
    }

    const aq = 5 + rn2(1);
    game._monkIniAppleQuan = aq;
    for (let i = 0; i < aq; i++) {
        nextIdentLikeC();
        mksobjInitDefaultFoodQuanMaybeDoubleLikeC();
    }

    const oq = 5 + rn2(1);
    game._monkIniOrangeQuan = oq;
    for (let i = 0; i < oq; i++) {
        nextIdentLikeC();
        mksobjInitDefaultFoodQuanMaybeDoubleLikeC();
    }

    const fq = 3 + rn2(1);
    game._monkIniFortuneCookieQuan = fq;
    for (let i = 0; i < fq; i++) {
        nextIdentLikeC();
        mksobjInitDefaultFoodQuanMaybeDoubleLikeC();
    }

    /* C: `ini_inv(M_spell[rn2(90) / 30])` — **`rn2(90)`** before spell row **`trquan`**. */
    const spIdx = (rn2(90) / 30) | 0;
    game._monkIniMspellIdx = spIdx;
    const speOtyp = OTYP_MONK_MSPELL_BOOKS[spIdx] ?? OTYP_MONK_MSPELL_BOOKS[0];
    game._monkIniMspellSpeOtyp = speOtyp;
    rn2(1);
    nextIdentLikeC();
    mksobjInitSpellbookIniInvLikeC();
    rn2(1);

    game._monkIniMagicmarker = !rn2(4);
    if (game._monkIniMagicmarker) {
        rn2(1);
        nextIdentLikeC();
        mksobjInitMagicMarkerSpeRn1LikeC();
        game._monkIniMagicmarkerSpe = 19 + rn2(4);
        rn2(1);
    } else {
        game._monkIniLamp = !rn2(10);
        if (game._monkIniLamp) {
            rn2(1);
            nextIdentLikeC();
            mksobjInitOilLampToolLikeC();
            rn2(1);
        }
    }
}
