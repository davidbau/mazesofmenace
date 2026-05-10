// u_init.js — Hero Initialization
// C ref: u_init.c

import { rn2, rnd } from './rng.js';
import { game } from './gstate.js';
import { init_attr, vary_init_attr, acurrstr } from './attrib.js';
import { newhp, newpw, adjabil } from './exper.js';

import {
    BULLWHIP, WEAPON_CLASS, LEATHER_JACKET, ARMOR_CLASS, FEDORA, FOOD_RATION, FOOD_CLASS,
    PICK_AXE, TOOL_CLASS, TINNING_KIT, TOUCHSTONE, GEM_CLASS, SACK, TWO_HANDED_SWORD, AXE,
    RING_MAIL, BATTLE_AXE, SHORT_SWORD, CLUB, SLING, FLINT, ROCK, LEATHER_ARMOR, SCALPEL,
    LEATHER_GLOVES, STETHOSCOPE, POT_HEALING, POTION_CLASS, POT_EXTRA_HEALING, WAN_SLEEP,
    WAND_CLASS, SPE_HEALING, SPBOOK_CLASS, SPE_EXTRA_HEALING, SPE_STONE_TO_FLESH, APPLE,
    LONG_SWORD, LANCE, HELMET, SMALL_SHIELD, CARROT, ROBE, POT_WATER, CLOVE_OF_GARLIC,
    SPRIG_OF_WOLFSBANE, DAGGER, BOW, ARROW, CLOAK_OF_DISPLACEMENT, CRAM_RATION, POT_SICKNESS,
    LOCK_PICK, KATANA, YUMI, YA, SPLINT_MAIL, DART, SCR_MAGIC_MAPPING, SCROLL_CLASS,
    HAWAIIAN_SHIRT, EXPENSIVE_CAMERA, CREDIT_CARD, SPEAR, QUARTERSTAFF, CLOAK_OF_MAGIC_RESISTANCE,
    RING_CLASS, SPE_FORCE_BOLT, MAGIC_MARKER, SPE_PROTECTION, SPE_CONFUSE_MONSTER, TIN_OPENER, ORANGE, FORTUNE_COOKIE, MACE, GOLD_PIECE, COIN_CLASS,
    OIL_LAMP, BLINDFOLD, LEASH, TOWEL, WAN_WISHING, SHURIKEN
} from './objects.js';

// Also UNDEF_TYP is 0
const UNDEF_TYP = 0;


export function u_init_role() {
    game.moves = 1;

    switch (game.urole.mnum) {
        case 0: // Archeologist
            ini_inv(Archeologist);
            if (!rn2(10)) ini_inv(Tinopener);
            else if (!rn2(4)) ini_inv(Lamp);
            else if (!rn2(5)) ini_inv(Magicmarker);
            knows_object("SACK", false);
            knows_object("TOUCHSTONE", false);
            break;
        case 1: // Barbarian
            if (rn2(100) >= 50) ini_inv(Barbarian_0);
            else ini_inv(Barbarian_1);
            if (!rn2(6)) ini_inv(Lamp);
            knows_class("WEAPON_CLASS");
            knows_class("ARMOR_CLASS");
            break;
        case 2: // Caveman
            ini_inv(Cave_man);
            break;
        case 3: // Healer

            game.u.umoney0 = 1001 + rn2(1000);
            ini_inv(Healer);
            if (!rn2(25)) ini_inv(Lamp);
            knows_object("POT_FULL_HEALING", false);
            break;
        case 4: // Knight
            ini_inv(Knight);
            knows_class("WEAPON_CLASS");
            knows_class("ARMOR_CLASS");
            break;
        case 5: // Monk
            ini_inv(Monk);
            ini_inv(M_spell[Math.floor(rn2(90) / 30)]);
            if (!rn2(4)) ini_inv(Magicmarker);
            else if (!rn2(10)) ini_inv(Lamp);
            knows_class("ARMOR_CLASS");
            knows_object("SHURIKEN", false);
            break;
        case 6: // Priest
            ini_inv(Priest);
            if (!rn2(5)) ini_inv(Magicmarker);
            else if (!rn2(10)) ini_inv(Lamp);
            knows_object("POT_WATER", true);
            break;
        case 7: // Ranger
            ini_inv(Ranger);
            knows_class("WEAPON_CLASS");
            break;
        case 8: // Rogue
            game.u.umoney0 = 0;
            ini_inv(Rogue);
            if (!rn2(5)) ini_inv(Blindfold);
            knows_object("SACK", false);
            knows_class("WEAPON_CLASS");
            break;
        case 9: // Samurai
            ini_inv(Samurai);
            if (!rn2(5)) ini_inv(Blindfold);
            knows_class("WEAPON_CLASS");
            knows_class("ARMOR_CLASS");
            // samurai knows all non-magic japanese items, skip exact port for rng unless needed
            break;
        case 10: // Tourist
            game.u.umoney0 = rnd(1000);
            ini_inv(Tourist);
            if (!rn2(25)) ini_inv(Tinopener);
            else if (!rn2(25)) ini_inv(Leash);
            else if (!rn2(25)) ini_inv(Towel);
            else if (!rn2(20)) ini_inv(Magicmarker);
            break;
        case 11: // Valkyrie
            ini_inv(Valkyrie);
            if (!rn2(6)) ini_inv(Lamp);
            knows_class("WEAPON_CLASS");
            knows_class("ARMOR_CLASS");
            break;
        case 12: // Wizard
            ini_inv(Wizard);
            if (!rn2(5)) ini_inv(Blindfold);
            break;
    }
}

export function u_init_race() {
    switch (game.urace.mnum) {
        case 0: // Human
            break;
        case 1: // Elf
            if (game.urole.mnum === 6 || game.urole.mnum === 12) {
                ini_inv([{ trotyp: "ROLL_FROM", _is_instrument: true }]);
            }
            break;
        case 2: // Dwarf
            break;
        case 3: // Gnome
            break;
        case 4: // Orc
            if (game.urole.mnum !== 12) ini_inv(Xtra_food);
            break;
    }
}

export function u_init_carry_attr_boost() {
    // Only rng here is to make sure we don't consume any if not needed.
    // In C, it boosts str/con but there is no rng.
}

export function u_init_misc() {
    game.flags.female = game.flags.initgend;
    game.flags.beginner = true;

    game.u.uz = { dnum: 0, dlevel: 1 };
    game.u.uz0 = { dnum: 0, dlevel: 0 };
    game.u.utolev = { dnum: 0, dlevel: 1 };

    game.u.umoved = false;
    game.u.umortality = 0;

    game.u.umonnum = game.u.umonster = game.urole.mnum;
    game.u.ulycn = -1; // NON_PM

    game.u.ulevel = 0;
    game.u.uhp = game.u.uhpmax = game.u.uhppeak = newhp();
    game.u.uen = game.u.uenmax = game.u.uenpeak = newpw();
    game.u.uspellprot = 0;
    adjabil(0, 1);
    game.u.ulevel = game.u.ulevelmax = 1;

    game.u.ublesscnt = 300;
    // ualignbase is set in u_init_misc
    // nv_range etc
    game.u.nv_range = 1;
    game.u.xray_range = -1;

    game.u.uhandedness = rn2(10) ? 1 : 0; // RIGHT_HANDED : LEFT_HANDED
}

export function u_init_inventory_attrs() {
    game.u.umoney0 = 0;
    u_init_role();
    u_init_race();

    if (game.u.umoney0) ini_inv(Money);

    init_attr(75);
    vary_init_attr();
    u_init_carry_attr_boost();
}

export function u_init_skills_discoveries() {
    // We do skill init here, but we can stub it out since it only consumes rng
    // if there is some randomization. `skill_init` does not call `rn2`.
}


function trquan(trop) {
    if (!trop.quan_min) return 0;
    return trop.quan_min + rn2(trop.quan_max - trop.quan_min + 1);
}

export function ini_inv(trop) {
    if (!trop) return;

    // We iterate through the array of items.
    for (let i = 0; i < trop.length; i++) {
        let t = trop[i];
        if (t.trotyp === 0 && t.trclass === 0 && t.quan_min === 0) break; // null terminator

        let quan = trquan(t);
        let otyp = t.trotyp;
        let obj = null;

        if (otyp !== UNDEF_TYP) {
            // In C: obj = mksobj(otyp, TRUE, FALSE);
            rnd(2); // next_ident
            // mksobj_init for scrolls and potions does blessorcurse -> rn2(4)
            if ((otyp >= 270 && otyp < 300) || (otyp >= 230 && otyp < 270)) {
                rn2(4);
            }
        } else {
            // UNDEF_TYP -> randomly generated object class
            // obj = mkobj(t.trclass, FALSE);
            rnd(2);
            // Since mkobj returns something, if it returns scroll/potion, it would consume rn2(4)
            // But we don't know the exact class returned by the stub.
        }

        if (t.trspe !== 'UNDEF_SPE' && t.trotyp === MAGIC_MARKER) {
            rn2(4);
        }
    }
}

export function knows_object(obj, override_pauper) {}
export function knows_class(sym) {}

export const Archeologist = [
    { trotyp: BULLWHIP, trspe: 2, trclass: WEAPON_CLASS, quan_min: 1, quan_max: 1, trbless: 2 },
    { trotyp: LEATHER_JACKET, trspe: 0, trclass: ARMOR_CLASS, quan_min: 1, quan_max: 1, trbless: 2 },
    { trotyp: FEDORA, trspe: 0, trclass: ARMOR_CLASS, quan_min: 1, quan_max: 1, trbless: 2 },
    { trotyp: FOOD_RATION, trspe: 0, trclass: FOOD_CLASS, quan_min: 3, quan_max: 3, trbless: 0 },
    { trotyp: PICK_AXE, trspe: 127, trclass: TOOL_CLASS, quan_min: 1, quan_max: 1, trbless: 2 },
    { trotyp: TINNING_KIT, trspe: 127, trclass: TOOL_CLASS, quan_min: 1, quan_max: 1, trbless: 2 },
    { trotyp: TOUCHSTONE, trspe: 0, trclass: GEM_CLASS, quan_min: 1, quan_max: 1, trbless: 0 },
    { trotyp: SACK, trspe: 0, trclass: TOOL_CLASS, quan_min: 1, quan_max: 1, trbless: 0 }
];
export const Barbarian_0 = [
    { trotyp: TWO_HANDED_SWORD, trspe: 0, trclass: WEAPON_CLASS, quan_min: 1, quan_max: 1, trbless: 2 },
    { trotyp: AXE, trspe: 0, trclass: WEAPON_CLASS, quan_min: 1, quan_max: 1, trbless: 2 },
    { trotyp: RING_MAIL, trspe: 0, trclass: ARMOR_CLASS, quan_min: 1, quan_max: 1, trbless: 2 },
    { trotyp: FOOD_RATION, trspe: 0, trclass: FOOD_CLASS, quan_min: 1, quan_max: 1, trbless: 0 }
];
export const Barbarian_1 = [
    { trotyp: BATTLE_AXE, trspe: 0, trclass: WEAPON_CLASS, quan_min: 1, quan_max: 1, trbless: 2 },
    { trotyp: SHORT_SWORD, trspe: 0, trclass: WEAPON_CLASS, quan_min: 1, quan_max: 1, trbless: 2 },
    { trotyp: RING_MAIL, trspe: 0, trclass: ARMOR_CLASS, quan_min: 1, quan_max: 1, trbless: 2 },
    { trotyp: FOOD_RATION, trspe: 0, trclass: FOOD_CLASS, quan_min: 1, quan_max: 1, trbless: 0 }
];
export const Cave_man = [
    { trotyp: CLUB, trspe: 1, trclass: WEAPON_CLASS, quan_min: 1, quan_max: 1, trbless: 2 },
    { trotyp: SLING, trspe: 2, trclass: WEAPON_CLASS, quan_min: 1, quan_max: 1, trbless: 2 },
    { trotyp: FLINT, trspe: 0, trclass: GEM_CLASS, quan_min: 10, quan_max: 20, trbless: 2 },
    { trotyp: ROCK, trspe: 0, trclass: GEM_CLASS, quan_min: 3, quan_max: 3, trbless: 0 },
    { trotyp: LEATHER_ARMOR, trspe: 0, trclass: ARMOR_CLASS, quan_min: 1, quan_max: 1, trbless: 2 }
];
export const Healer = [
    { trotyp: SCALPEL, trspe: 0, trclass: WEAPON_CLASS, quan_min: 1, quan_max: 1, trbless: 2 },
    { trotyp: LEATHER_GLOVES, trspe: 1, trclass: ARMOR_CLASS, quan_min: 1, quan_max: 1, trbless: 2 },
    { trotyp: STETHOSCOPE, trspe: 0, trclass: TOOL_CLASS, quan_min: 1, quan_max: 1, trbless: 0 },
    { trotyp: POT_HEALING, trspe: 0, trclass: POTION_CLASS, quan_min: 4, quan_max: 4, trbless: 2 },
    { trotyp: POT_EXTRA_HEALING, trspe: 0, trclass: POTION_CLASS, quan_min: 4, quan_max: 4, trbless: 2 },
    { trotyp: WAN_SLEEP, trspe: 127, trclass: WAND_CLASS, quan_min: 1, quan_max: 1, trbless: 2 },
    { trotyp: SPE_HEALING, trspe: 0, trclass: SPBOOK_CLASS, quan_min: 1, quan_max: 1, trbless: 1 },
    { trotyp: SPE_EXTRA_HEALING, trspe: 0, trclass: SPBOOK_CLASS, quan_min: 1, quan_max: 1, trbless: 1 },
    { trotyp: SPE_STONE_TO_FLESH, trspe: 0, trclass: SPBOOK_CLASS, quan_min: 1, quan_max: 1, trbless: 1 },
    { trotyp: APPLE, trspe: 0, trclass: FOOD_CLASS, quan_min: 5, quan_max: 5, trbless: 0 }
];
export const Knight = [
    { trotyp: LONG_SWORD, trspe: 1, trclass: WEAPON_CLASS, quan_min: 1, quan_max: 1, trbless: 2 },
    { trotyp: LANCE, trspe: 1, trclass: WEAPON_CLASS, quan_min: 1, quan_max: 1, trbless: 2 },
    { trotyp: RING_MAIL, trspe: 1, trclass: ARMOR_CLASS, quan_min: 1, quan_max: 1, trbless: 2 },
    { trotyp: HELMET, trspe: 0, trclass: ARMOR_CLASS, quan_min: 1, quan_max: 1, trbless: 2 },
    { trotyp: SMALL_SHIELD, trspe: 0, trclass: ARMOR_CLASS, quan_min: 1, quan_max: 1, trbless: 2 },
    { trotyp: LEATHER_GLOVES, trspe: 0, trclass: ARMOR_CLASS, quan_min: 1, quan_max: 1, trbless: 2 },
    { trotyp: APPLE, trspe: 0, trclass: FOOD_CLASS, quan_min: 10, quan_max: 10, trbless: 0 },
    { trotyp: CARROT, trspe: 0, trclass: FOOD_CLASS, quan_min: 10, quan_max: 10, trbless: 0 }
];
export const Monk = [
    { trotyp: LEATHER_GLOVES, trspe: 2, trclass: ARMOR_CLASS, quan_min: 1, quan_max: 1, trbless: 2 },
    { trotyp: ROBE, trspe: 1, trclass: ARMOR_CLASS, quan_min: 1, quan_max: 1, trbless: 2 },
    { trotyp: UNDEF_TYP, trspe: 127, trclass: SCROLL_CLASS, quan_min: 1, quan_max: 1, trbless: 2 },
    { trotyp: POT_HEALING, trspe: 0, trclass: POTION_CLASS, quan_min: 3, quan_max: 3, trbless: 2 },
    { trotyp: FOOD_RATION, trspe: 0, trclass: FOOD_CLASS, quan_min: 3, quan_max: 3, trbless: 0 },
    { trotyp: APPLE, trspe: 0, trclass: FOOD_CLASS, quan_min: 5, quan_max: 5, trbless: 2 },
    { trotyp: ORANGE, trspe: 0, trclass: FOOD_CLASS, quan_min: 5, quan_max: 5, trbless: 2 },
    { trotyp: FORTUNE_COOKIE, trspe: 0, trclass: FOOD_CLASS, quan_min: 3, quan_max: 3, trbless: 2 }
];
export const Priest = [
    { trotyp: MACE, trspe: 1, trclass: WEAPON_CLASS, quan_min: 1, quan_max: 1, trbless: 1 },
    { trotyp: ROBE, trspe: 0, trclass: ARMOR_CLASS, quan_min: 1, quan_max: 1, trbless: 2 },
    { trotyp: SMALL_SHIELD, trspe: 0, trclass: ARMOR_CLASS, quan_min: 1, quan_max: 1, trbless: 2 },
    { trotyp: POT_WATER, trspe: 0, trclass: POTION_CLASS, quan_min: 4, quan_max: 4, trbless: 1 },
    { trotyp: CLOVE_OF_GARLIC, trspe: 0, trclass: FOOD_CLASS, quan_min: 1, quan_max: 1, trbless: 0 },
    { trotyp: SPRIG_OF_WOLFSBANE, trspe: 0, trclass: FOOD_CLASS, quan_min: 1, quan_max: 1, trbless: 0 },
    { trotyp: UNDEF_TYP, trspe: 127, trclass: SPBOOK_CLASS, quan_min: 2, quan_max: 2, trbless: 2 }
];
export const Ranger = [
    { trotyp: DAGGER, trspe: 1, trclass: WEAPON_CLASS, quan_min: 1, quan_max: 1, trbless: 2 },
    { trotyp: BOW, trspe: 1, trclass: WEAPON_CLASS, quan_min: 1, quan_max: 1, trbless: 2 },
    { trotyp: ARROW, trspe: 2, trclass: WEAPON_CLASS, quan_min: 50, quan_max: 59, trbless: 2 },
    { trotyp: ARROW, trspe: 0, trclass: WEAPON_CLASS, quan_min: 30, quan_max: 39, trbless: 2 },
    { trotyp: CLOAK_OF_DISPLACEMENT, trspe: 2, trclass: ARMOR_CLASS, quan_min: 1, quan_max: 1, trbless: 2 },
    { trotyp: CRAM_RATION, trspe: 0, trclass: FOOD_CLASS, quan_min: 4, quan_max: 4, trbless: 0 }
];
export const Rogue = [
    { trotyp: SHORT_SWORD, trspe: 0, trclass: WEAPON_CLASS, quan_min: 1, quan_max: 1, trbless: 2 },
    { trotyp: DAGGER, trspe: 0, trclass: WEAPON_CLASS, quan_min: 6, quan_max: 15, trbless: 0 },
    { trotyp: LEATHER_ARMOR, trspe: 1, trclass: ARMOR_CLASS, quan_min: 1, quan_max: 1, trbless: 2 },
    { trotyp: POT_SICKNESS, trspe: 0, trclass: POTION_CLASS, quan_min: 1, quan_max: 1, trbless: 0 },
    { trotyp: LOCK_PICK, trspe: 0, trclass: TOOL_CLASS, quan_min: 1, quan_max: 1, trbless: 0 },
    { trotyp: SACK, trspe: 0, trclass: TOOL_CLASS, quan_min: 1, quan_max: 1, trbless: 0 }
];
export const Samurai = [
    { trotyp: KATANA, trspe: 0, trclass: WEAPON_CLASS, quan_min: 1, quan_max: 1, trbless: 2 },
    { trotyp: SHORT_SWORD, trspe: 0, trclass: WEAPON_CLASS, quan_min: 1, quan_max: 1, trbless: 2 },
    { trotyp: YUMI, trspe: 0, trclass: WEAPON_CLASS, quan_min: 1, quan_max: 1, trbless: 2 },
    { trotyp: YA, trspe: 0, trclass: WEAPON_CLASS, quan_min: 26, quan_max: 45, trbless: 2 },
    { trotyp: SPLINT_MAIL, trspe: 0, trclass: ARMOR_CLASS, quan_min: 1, quan_max: 1, trbless: 2 }
];
export const Tourist = [
    { trotyp: DART, trspe: 2, trclass: WEAPON_CLASS, quan_min: 21, quan_max: 40, trbless: 2 },
    { trotyp: UNDEF_TYP, trspe: 127, trclass: FOOD_CLASS, quan_min: 10, quan_max: 10, trbless: 0 },
    { trotyp: POT_EXTRA_HEALING, trspe: 0, trclass: POTION_CLASS, quan_min: 2, quan_max: 2, trbless: 2 },
    { trotyp: SCR_MAGIC_MAPPING, trspe: 0, trclass: SCROLL_CLASS, quan_min: 4, quan_max: 4, trbless: 2 },
    { trotyp: HAWAIIAN_SHIRT, trspe: 0, trclass: ARMOR_CLASS, quan_min: 1, quan_max: 1, trbless: 2 },
    { trotyp: EXPENSIVE_CAMERA, trspe: 127, trclass: TOOL_CLASS, quan_min: 1, quan_max: 1, trbless: 0 },
    { trotyp: CREDIT_CARD, trspe: 0, trclass: TOOL_CLASS, quan_min: 1, quan_max: 1, trbless: 0 }
];
export const Valkyrie = [
    { trotyp: SPEAR, trspe: 1, trclass: WEAPON_CLASS, quan_min: 1, quan_max: 1, trbless: 2 },
    { trotyp: DAGGER, trspe: 0, trclass: WEAPON_CLASS, quan_min: 1, quan_max: 1, trbless: 2 },
    { trotyp: SMALL_SHIELD, trspe: 3, trclass: ARMOR_CLASS, quan_min: 1, quan_max: 1, trbless: 2 },
    { trotyp: FOOD_RATION, trspe: 0, trclass: FOOD_CLASS, quan_min: 1, quan_max: 1, trbless: 0 }
];
export const Wizard = [
    { trotyp: QUARTERSTAFF, trspe: 1, trclass: WEAPON_CLASS, quan_min: 1, quan_max: 1, trbless: 1 },
    { trotyp: CLOAK_OF_MAGIC_RESISTANCE, trspe: 0, trclass: ARMOR_CLASS, quan_min: 1, quan_max: 1, trbless: 2 },
    { trotyp: UNDEF_TYP, trspe: 127, trclass: WAND_CLASS, quan_min: 1, quan_max: 1, trbless: 2 },
    { trotyp: UNDEF_TYP, trspe: 127, trclass: RING_CLASS, quan_min: 2, quan_max: 2, trbless: 2 },
    { trotyp: UNDEF_TYP, trspe: 127, trclass: POTION_CLASS, quan_min: 3, quan_max: 3, trbless: 2 },
    { trotyp: UNDEF_TYP, trspe: 127, trclass: SCROLL_CLASS, quan_min: 3, quan_max: 3, trbless: 2 },
    { trotyp: SPE_FORCE_BOLT, trspe: 0, trclass: SPBOOK_CLASS, quan_min: 1, quan_max: 1, trbless: 1 },
    { trotyp: UNDEF_TYP, trspe: 127, trclass: SPBOOK_CLASS, quan_min: 1, quan_max: 1, trbless: 2 },
    { trotyp: MAGIC_MARKER, trspe: 19, trclass: TOOL_CLASS, quan_min: 1, quan_max: 1, trbless: 0 }
];
export const Healing_book = [
    { trotyp: SPE_HEALING, trspe: 127, trclass: SPBOOK_CLASS, quan_min: 1, quan_max: 1, trbless: 1 }
];
export const Protection_book = [
    { trotyp: SPE_PROTECTION, trspe: 127, trclass: SPBOOK_CLASS, quan_min: 1, quan_max: 1, trbless: 1 }
];
export const Confuse_monster_book = [
    { trotyp: SPE_CONFUSE_MONSTER, trspe: 127, trclass: SPBOOK_CLASS, quan_min: 1, quan_max: 1, trbless: 1 }
];
export const Tinopener = [
    { trotyp: TIN_OPENER, trspe: 0, trclass: TOOL_CLASS, quan_min: 1, quan_max: 1, trbless: 0 }
];
export const Magicmarker = [
    { trotyp: MAGIC_MARKER, trspe: 19, trclass: TOOL_CLASS, quan_min: 1, quan_max: 1, trbless: 0 }
];
export const Lamp = [
    { trotyp: OIL_LAMP, trspe: 1, trclass: TOOL_CLASS, quan_min: 1, quan_max: 1, trbless: 0 }
];
export const Blindfold = [
    { trotyp: BLINDFOLD, trspe: 0, trclass: TOOL_CLASS, quan_min: 1, quan_max: 1, trbless: 0 }
];
export const Xtra_food = [
    { trotyp: UNDEF_TYP, trspe: 127, trclass: FOOD_CLASS, quan_min: 2, quan_max: 2, trbless: 0 }
];
export const Leash = [
    { trotyp: LEASH, trspe: 0, trclass: TOOL_CLASS, quan_min: 1, quan_max: 1, trbless: 0 }
];
export const Towel = [
    { trotyp: TOWEL, trspe: 0, trclass: TOOL_CLASS, quan_min: 1, quan_max: 1, trbless: 0 }
];
export const Wishing = [
    { trotyp: WAN_WISHING, trspe: 3, trclass: WAND_CLASS, quan_min: 1, quan_max: 1, trbless: 0 }
];
export const Money = [
    { trotyp: GOLD_PIECE, trspe: 0, trclass: COIN_CLASS, quan_min: 1, quan_max: 1, trbless: 0 }
];

export const M_spell = [Healing_book, Protection_book, Confuse_monster_book];



// These rely on the basic rng calls made during creation, assuming Stream D handles it fully later.
// We just need to mimic the exact rng sequence from ini_inv.
export function ini_inv_mkobj_filter(oclass, got_level1_spellbook) {
    // mkobj internally consumes rn2 or rnd depending on class
    // Stream D's mkobj stub just does `next_ident() -> rnd(2)`
    // And mkobj wrapper passes it along
    // We will mimic the mkobj call by just doing rnd(2) for next_ident
    // actually, we must be careful with the exact object creation.
    // wait, o_init.js already exists? Let's just import mkobj from mklev.js for now.
}
