// u_init.js — Hero Initialization
// C ref: u_init.c

import { rn2, rnd } from './rng.js';
import {
    P_NONE, P_DAGGER, P_KNIFE, P_AXE, P_PICK_AXE, P_SHORT_SWORD, P_BROAD_SWORD,
    P_LONG_SWORD, P_TWO_HANDED_SWORD, P_SABER, P_CLUB, P_MACE, P_MORNING_STAR,
    P_FLAIL, P_HAMMER, P_QUARTERSTAFF, P_POLEARMS, P_SPEAR, P_TRIDENT, P_LANCE,
    P_BOW, P_SLING, P_CROSSBOW, P_DART, P_SHURIKEN, P_BOOMERANG, P_WHIP,
    P_UNICORN_HORN, P_ATTACK_SPELL, P_HEALING_SPELL, P_DIVINATION_SPELL,
    P_ENCHANTMENT_SPELL, P_CLERIC_SPELL, P_ESCAPE_SPELL, P_MATTER_SPELL,
    P_BARE_HANDED_COMBAT, P_TWO_WEAPON_COMBAT, P_RIDING, P_NUM_SKILLS,
    P_MARTIAL_ARTS, P_ISRESTRICTED, P_UNSKILLED, P_BASIC, P_SKILLED,
    P_EXPERT, P_MASTER, P_GRAND_MASTER, PM_ARCHEOLOGIST, PM_BARBARIAN,
    PM_CAVE_DWELLER, PM_HEALER, PM_KNIGHT, PM_MONK, PM_CLERIC,
    PM_ROGUE, PM_RANGER, PM_SAMURAI, PM_TOURIST, PM_VALKYRIE, PM_WIZARD
} from './const.js';
import { objects } from './objects.js';
import { PM_PONY } from './monst.js';
import {
    WEAPON_CLASS, ARMOR_CLASS, POTION_CLASS, SCROLL_CLASS, WAND_CLASS,
    SPBOOK_CLASS, FOOD_CLASS, TOOL_CLASS, GEM_CLASS, RING_CLASS, COIN_CLASS
} from './const.js';
import { invent } from './decl.js';
import { game } from './gstate.js';
import { init_attr, vary_init_attr, acurrstr } from './attrib.js';
import { newhp, newpw, adjabil } from './exper.js';
import { next_ident } from './mkobj.js';

import {
    BULLWHIP, LEATHER_JACKET, FEDORA, FOOD_RATION,
    PICK_AXE, TINNING_KIT, TOUCHSTONE, SACK, TWO_HANDED_SWORD, AXE,
    RING_MAIL, BATTLE_AXE, SHORT_SWORD, CLUB, SLING, FLINT, ROCK, LEATHER_ARMOR, SCALPEL,
    LEATHER_GLOVES, STETHOSCOPE, POT_HEALING, POT_EXTRA_HEALING, WAN_SLEEP,
    SPE_HEALING, SPE_EXTRA_HEALING, SPE_STONE_TO_FLESH, APPLE,
    LONG_SWORD, LANCE, HELMET, SMALL_SHIELD, CARROT, ROBE, POT_WATER, CLOVE_OF_GARLIC,
    SPRIG_OF_WOLFSBANE, DAGGER, BOW, ARROW, CLOAK_OF_DISPLACEMENT, CRAM_RATION, POT_SICKNESS,
    LOCK_PICK, KATANA, YUMI, YA, SPLINT_MAIL, DART, SCR_MAGIC_MAPPING,
    HAWAIIAN_SHIRT, EXPENSIVE_CAMERA, CREDIT_CARD, SPEAR, QUARTERSTAFF, CLOAK_OF_MAGIC_RESISTANCE,
    SPE_FORCE_BOLT, MAGIC_MARKER, SPE_PROTECTION, SPE_CONFUSE_MONSTER, TIN_OPENER, ORANGE, FORTUNE_COOKIE, MACE, GOLD_PIECE,
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
    skill_init(skills_for_role());
}


export const Skill_A = [
    { skill: P_DAGGER, skmax: P_BASIC },
    { skill: P_KNIFE, skmax: P_BASIC },
    { skill: P_PICK_AXE, skmax: P_EXPERT },
    { skill: P_SHORT_SWORD, skmax: P_BASIC },
    { skill: P_SABER, skmax: P_EXPERT },
    { skill: P_CLUB, skmax: P_SKILLED },
    { skill: P_QUARTERSTAFF, skmax: P_SKILLED },
    { skill: P_SLING, skmax: P_SKILLED },
    { skill: P_DART, skmax: P_BASIC },
    { skill: P_BOOMERANG, skmax: P_EXPERT },
    { skill: P_WHIP, skmax: P_EXPERT },
    { skill: P_UNICORN_HORN, skmax: P_SKILLED },
    { skill: P_ATTACK_SPELL, skmax: P_BASIC },
    { skill: P_HEALING_SPELL, skmax: P_BASIC },
    { skill: P_DIVINATION_SPELL, skmax: P_EXPERT },
    { skill: P_MATTER_SPELL, skmax: P_BASIC },
    { skill: P_RIDING, skmax: P_BASIC },
    { skill: P_TWO_WEAPON_COMBAT, skmax: P_BASIC },
    { skill: P_BARE_HANDED_COMBAT, skmax: P_EXPERT },
    { skill: P_NONE, skmax: 0 }
];

export const Skill_B = [
    { skill: P_DAGGER, skmax: P_BASIC },
    { skill: P_AXE, skmax: P_EXPERT },
    { skill: P_PICK_AXE, skmax: P_SKILLED },
    { skill: P_SHORT_SWORD, skmax: P_EXPERT },
    { skill: P_BROAD_SWORD, skmax: P_SKILLED },
    { skill: P_LONG_SWORD, skmax: P_SKILLED },
    { skill: P_TWO_HANDED_SWORD, skmax: P_EXPERT },
    { skill: P_SABER, skmax: P_SKILLED },
    { skill: P_CLUB, skmax: P_SKILLED },
    { skill: P_MACE, skmax: P_SKILLED },
    { skill: P_MORNING_STAR, skmax: P_SKILLED },
    { skill: P_FLAIL, skmax: P_BASIC },
    { skill: P_HAMMER, skmax: P_EXPERT },
    { skill: P_QUARTERSTAFF, skmax: P_BASIC },
    { skill: P_SPEAR, skmax: P_SKILLED },
    { skill: P_TRIDENT, skmax: P_SKILLED },
    { skill: P_BOW, skmax: P_BASIC },
    { skill: P_ATTACK_SPELL, skmax: P_BASIC },
    { skill: P_ESCAPE_SPELL, skmax: P_BASIC },
    { skill: P_RIDING, skmax: P_BASIC },
    { skill: P_TWO_WEAPON_COMBAT, skmax: P_BASIC },
    { skill: P_BARE_HANDED_COMBAT, skmax: P_MASTER },
    { skill: P_NONE, skmax: 0 }
];

export const Skill_C = [
    { skill: P_DAGGER, skmax: P_BASIC },
    { skill: P_KNIFE, skmax: P_SKILLED },
    { skill: P_AXE, skmax: P_SKILLED },
    { skill: P_PICK_AXE, skmax: P_BASIC },
    { skill: P_CLUB, skmax: P_EXPERT },
    { skill: P_MACE, skmax: P_EXPERT },
    { skill: P_MORNING_STAR, skmax: P_BASIC },
    { skill: P_FLAIL, skmax: P_SKILLED },
    { skill: P_HAMMER, skmax: P_SKILLED },
    { skill: P_QUARTERSTAFF, skmax: P_EXPERT },
    { skill: P_POLEARMS, skmax: P_SKILLED },
    { skill: P_SPEAR, skmax: P_EXPERT },
    { skill: P_TRIDENT, skmax: P_SKILLED },
    { skill: P_BOW, skmax: P_SKILLED },
    { skill: P_SLING, skmax: P_EXPERT },
    { skill: P_ATTACK_SPELL, skmax: P_BASIC },
    { skill: P_MATTER_SPELL, skmax: P_BASIC },
    { skill: P_BOOMERANG, skmax: P_EXPERT },
    { skill: P_UNICORN_HORN, skmax: P_BASIC },
    { skill: P_BARE_HANDED_COMBAT, skmax: P_MASTER },
    { skill: P_NONE, skmax: 0 }
];

export const Skill_H = [
    { skill: P_DAGGER, skmax: P_SKILLED },
    { skill: P_KNIFE, skmax: P_EXPERT },
    { skill: P_SHORT_SWORD, skmax: P_SKILLED },
    { skill: P_SABER, skmax: P_BASIC },
    { skill: P_CLUB, skmax: P_SKILLED },
    { skill: P_MACE, skmax: P_BASIC },
    { skill: P_QUARTERSTAFF, skmax: P_EXPERT },
    { skill: P_POLEARMS, skmax: P_BASIC },
    { skill: P_SPEAR, skmax: P_BASIC },
    { skill: P_TRIDENT, skmax: P_BASIC },
    { skill: P_SLING, skmax: P_SKILLED },
    { skill: P_DART, skmax: P_EXPERT },
    { skill: P_SHURIKEN, skmax: P_SKILLED },
    { skill: P_UNICORN_HORN, skmax: P_EXPERT },
    { skill: P_HEALING_SPELL, skmax: P_EXPERT },
    { skill: P_BARE_HANDED_COMBAT, skmax: P_BASIC },
    { skill: P_NONE, skmax: 0 }
];

export const Skill_K = [
    { skill: P_DAGGER, skmax: P_BASIC },
    { skill: P_KNIFE, skmax: P_BASIC },
    { skill: P_AXE, skmax: P_SKILLED },
    { skill: P_PICK_AXE, skmax: P_BASIC },
    { skill: P_SHORT_SWORD, skmax: P_SKILLED },
    { skill: P_BROAD_SWORD, skmax: P_SKILLED },
    { skill: P_LONG_SWORD, skmax: P_EXPERT },
    { skill: P_TWO_HANDED_SWORD, skmax: P_SKILLED },
    { skill: P_SABER, skmax: P_SKILLED },
    { skill: P_CLUB, skmax: P_BASIC },
    { skill: P_MACE, skmax: P_SKILLED },
    { skill: P_MORNING_STAR, skmax: P_SKILLED },
    { skill: P_FLAIL, skmax: P_BASIC },
    { skill: P_HAMMER, skmax: P_BASIC },
    { skill: P_POLEARMS, skmax: P_EXPERT },
    { skill: P_SPEAR, skmax: P_SKILLED },
    { skill: P_TRIDENT, skmax: P_BASIC },
    { skill: P_LANCE, skmax: P_EXPERT },
    { skill: P_BOW, skmax: P_BASIC },
    { skill: P_CROSSBOW, skmax: P_SKILLED },
    { skill: P_ATTACK_SPELL, skmax: P_SKILLED },
    { skill: P_HEALING_SPELL, skmax: P_SKILLED },
    { skill: P_CLERIC_SPELL, skmax: P_SKILLED },
    { skill: P_RIDING, skmax: P_EXPERT },
    { skill: P_TWO_WEAPON_COMBAT, skmax: P_SKILLED },
    { skill: P_BARE_HANDED_COMBAT, skmax: P_EXPERT },
    { skill: P_NONE, skmax: 0 }
];

export const Skill_Mon = [
    { skill: P_QUARTERSTAFF, skmax: P_BASIC },
    { skill: P_SPEAR, skmax: P_BASIC },
    { skill: P_CROSSBOW, skmax: P_BASIC },
    { skill: P_SHURIKEN, skmax: P_BASIC },
    { skill: P_ATTACK_SPELL, skmax: P_BASIC },
    { skill: P_HEALING_SPELL, skmax: P_EXPERT },
    { skill: P_DIVINATION_SPELL, skmax: P_BASIC },
    { skill: P_ENCHANTMENT_SPELL, skmax: P_BASIC },
    { skill: P_CLERIC_SPELL, skmax: P_SKILLED },
    { skill: P_ESCAPE_SPELL, skmax: P_SKILLED },
    { skill: P_MATTER_SPELL, skmax: P_BASIC },
    { skill: P_MARTIAL_ARTS, skmax: P_GRAND_MASTER },
    { skill: P_NONE, skmax: 0 }
];

export const Skill_P = [
    { skill: P_CLUB, skmax: P_EXPERT },
    { skill: P_MACE, skmax: P_EXPERT },
    { skill: P_MORNING_STAR, skmax: P_EXPERT },
    { skill: P_FLAIL, skmax: P_EXPERT },
    { skill: P_HAMMER, skmax: P_EXPERT },
    { skill: P_QUARTERSTAFF, skmax: P_EXPERT },
    { skill: P_POLEARMS, skmax: P_SKILLED },
    { skill: P_SPEAR, skmax: P_SKILLED },
    { skill: P_TRIDENT, skmax: P_SKILLED },
    { skill: P_LANCE, skmax: P_BASIC },
    { skill: P_BOW, skmax: P_BASIC },
    { skill: P_SLING, skmax: P_BASIC },
    { skill: P_CROSSBOW, skmax: P_BASIC },
    { skill: P_DART, skmax: P_BASIC },
    { skill: P_SHURIKEN, skmax: P_BASIC },
    { skill: P_BOOMERANG, skmax: P_BASIC },
    { skill: P_UNICORN_HORN, skmax: P_BASIC },
    { skill: P_HEALING_SPELL, skmax: P_EXPERT },
    { skill: P_DIVINATION_SPELL, skmax: P_EXPERT },
    { skill: P_CLERIC_SPELL, skmax: P_EXPERT },
    { skill: P_BARE_HANDED_COMBAT, skmax: P_BASIC },
    { skill: P_NONE, skmax: 0 }
];

export const Skill_R = [
    { skill: P_DAGGER, skmax: P_EXPERT },
    { skill: P_KNIFE, skmax: P_EXPERT },
    { skill: P_SHORT_SWORD, skmax: P_EXPERT },
    { skill: P_BROAD_SWORD, skmax: P_SKILLED },
    { skill: P_LONG_SWORD, skmax: P_SKILLED },
    { skill: P_TWO_HANDED_SWORD, skmax: P_BASIC },
    { skill: P_SABER, skmax: P_SKILLED },
    { skill: P_CLUB, skmax: P_SKILLED },
    { skill: P_MACE, skmax: P_SKILLED },
    { skill: P_MORNING_STAR, skmax: P_BASIC },
    { skill: P_FLAIL, skmax: P_BASIC },
    { skill: P_HAMMER, skmax: P_BASIC },
    { skill: P_POLEARMS, skmax: P_BASIC },
    { skill: P_SPEAR, skmax: P_BASIC },
    { skill: P_CROSSBOW, skmax: P_EXPERT },
    { skill: P_DART, skmax: P_EXPERT },
    { skill: P_SHURIKEN, skmax: P_SKILLED },
    { skill: P_DIVINATION_SPELL, skmax: P_SKILLED },
    { skill: P_ESCAPE_SPELL, skmax: P_SKILLED },
    { skill: P_MATTER_SPELL, skmax: P_SKILLED },
    { skill: P_RIDING, skmax: P_BASIC },
    { skill: P_TWO_WEAPON_COMBAT, skmax: P_EXPERT },
    { skill: P_BARE_HANDED_COMBAT, skmax: P_EXPERT },
    { skill: P_NONE, skmax: 0 }
];

export const Skill_Ran = [
    { skill: P_DAGGER, skmax: P_EXPERT },
    { skill: P_KNIFE, skmax: P_SKILLED },
    { skill: P_AXE, skmax: P_SKILLED },
    { skill: P_PICK_AXE, skmax: P_BASIC },
    { skill: P_SHORT_SWORD, skmax: P_BASIC },
    { skill: P_MORNING_STAR, skmax: P_BASIC },
    { skill: P_FLAIL, skmax: P_SKILLED },
    { skill: P_HAMMER, skmax: P_BASIC },
    { skill: P_QUARTERSTAFF, skmax: P_BASIC },
    { skill: P_POLEARMS, skmax: P_SKILLED },
    { skill: P_SPEAR, skmax: P_EXPERT },
    { skill: P_TRIDENT, skmax: P_BASIC },
    { skill: P_BOW, skmax: P_EXPERT },
    { skill: P_SLING, skmax: P_EXPERT },
    { skill: P_CROSSBOW, skmax: P_EXPERT },
    { skill: P_DART, skmax: P_EXPERT },
    { skill: P_SHURIKEN, skmax: P_SKILLED },
    { skill: P_BOOMERANG, skmax: P_EXPERT },
    { skill: P_WHIP, skmax: P_BASIC },
    { skill: P_HEALING_SPELL, skmax: P_BASIC },
    { skill: P_DIVINATION_SPELL, skmax: P_EXPERT },
    { skill: P_ESCAPE_SPELL, skmax: P_BASIC },
    { skill: P_RIDING, skmax: P_BASIC },
    { skill: P_BARE_HANDED_COMBAT, skmax: P_BASIC },
    { skill: P_NONE, skmax: 0 }
];

export const Skill_S = [
    { skill: P_DAGGER, skmax: P_BASIC },
    { skill: P_KNIFE, skmax: P_SKILLED },
    { skill: P_SHORT_SWORD, skmax: P_EXPERT },
    { skill: P_BROAD_SWORD, skmax: P_SKILLED },
    { skill: P_LONG_SWORD, skmax: P_EXPERT },
    { skill: P_TWO_HANDED_SWORD, skmax: P_EXPERT },
    { skill: P_SABER, skmax: P_BASIC },
    { skill: P_FLAIL, skmax: P_SKILLED },
    { skill: P_QUARTERSTAFF, skmax: P_BASIC },
    { skill: P_POLEARMS, skmax: P_SKILLED },
    { skill: P_SPEAR, skmax: P_SKILLED },
    { skill: P_LANCE, skmax: P_SKILLED },
    { skill: P_BOW, skmax: P_EXPERT },
    { skill: P_SHURIKEN, skmax: P_EXPERT },
    { skill: P_ATTACK_SPELL, skmax: P_BASIC },
    { skill: P_DIVINATION_SPELL, skmax: P_BASIC }, /* special spell is clairvoyance */
    { skill: P_CLERIC_SPELL, skmax: P_SKILLED },
    { skill: P_RIDING, skmax: P_SKILLED },
    { skill: P_TWO_WEAPON_COMBAT, skmax: P_EXPERT },
    { skill: P_MARTIAL_ARTS, skmax: P_MASTER },
    { skill: P_NONE, skmax: 0 }
];

export const Skill_T = [
    { skill: P_DAGGER, skmax: P_EXPERT },
    { skill: P_KNIFE, skmax: P_SKILLED },
    { skill: P_AXE, skmax: P_BASIC },
    { skill: P_PICK_AXE, skmax: P_BASIC },
    { skill: P_SHORT_SWORD, skmax: P_EXPERT },
    { skill: P_BROAD_SWORD, skmax: P_BASIC },
    { skill: P_LONG_SWORD, skmax: P_BASIC },
    { skill: P_TWO_HANDED_SWORD, skmax: P_BASIC },
    { skill: P_SABER, skmax: P_SKILLED },
    { skill: P_CLUB, skmax: P_SKILLED },
    { skill: P_MACE, skmax: P_BASIC },
    { skill: P_MORNING_STAR, skmax: P_BASIC },
    { skill: P_FLAIL, skmax: P_BASIC },
    { skill: P_HAMMER, skmax: P_BASIC },
    { skill: P_QUARTERSTAFF, skmax: P_BASIC },
    { skill: P_POLEARMS, skmax: P_BASIC },
    { skill: P_SPEAR, skmax: P_BASIC },
    { skill: P_TRIDENT, skmax: P_BASIC },
    { skill: P_LANCE, skmax: P_BASIC },
    { skill: P_BOW, skmax: P_BASIC },
    { skill: P_SLING, skmax: P_BASIC },
    { skill: P_CROSSBOW, skmax: P_BASIC },
    { skill: P_DART, skmax: P_EXPERT },
    { skill: P_SHURIKEN, skmax: P_BASIC },
    { skill: P_BOOMERANG, skmax: P_BASIC },
    { skill: P_WHIP, skmax: P_BASIC },
    { skill: P_UNICORN_HORN, skmax: P_SKILLED },
    { skill: P_DIVINATION_SPELL, skmax: P_BASIC },
    { skill: P_ENCHANTMENT_SPELL, skmax: P_BASIC },
    { skill: P_ESCAPE_SPELL, skmax: P_SKILLED },
    { skill: P_RIDING, skmax: P_BASIC },
    { skill: P_TWO_WEAPON_COMBAT, skmax: P_SKILLED },
    { skill: P_BARE_HANDED_COMBAT, skmax: P_SKILLED },
    { skill: P_NONE, skmax: 0 }
];

export const Skill_V = [
    { skill: P_DAGGER, skmax: P_EXPERT },
    { skill: P_AXE, skmax: P_EXPERT },
    { skill: P_PICK_AXE, skmax: P_SKILLED },
    { skill: P_SHORT_SWORD, skmax: P_SKILLED },
    { skill: P_BROAD_SWORD, skmax: P_SKILLED },
    { skill: P_LONG_SWORD, skmax: P_EXPERT },
    { skill: P_TWO_HANDED_SWORD, skmax: P_EXPERT },
    { skill: P_SABER, skmax: P_BASIC },
    { skill: P_HAMMER, skmax: P_EXPERT },
    { skill: P_QUARTERSTAFF, skmax: P_BASIC },
    { skill: P_POLEARMS, skmax: P_SKILLED },
    { skill: P_SPEAR, skmax: P_SKILLED },
    { skill: P_TRIDENT, skmax: P_BASIC },
    { skill: P_LANCE, skmax: P_SKILLED },
    { skill: P_SLING, skmax: P_BASIC },
    { skill: P_ATTACK_SPELL, skmax: P_BASIC },
    { skill: P_ESCAPE_SPELL, skmax: P_BASIC },
    { skill: P_RIDING, skmax: P_SKILLED },
    { skill: P_TWO_WEAPON_COMBAT, skmax: P_SKILLED },
    { skill: P_BARE_HANDED_COMBAT, skmax: P_EXPERT },
    { skill: P_NONE, skmax: 0 }
];

export const Skill_W = [
    { skill: P_DAGGER, skmax: P_EXPERT },
    { skill: P_KNIFE, skmax: P_SKILLED },
    { skill: P_AXE, skmax: P_SKILLED },
    { skill: P_SHORT_SWORD, skmax: P_BASIC },
    { skill: P_CLUB, skmax: P_SKILLED },
    { skill: P_MACE, skmax: P_BASIC },
    { skill: P_QUARTERSTAFF, skmax: P_EXPERT },
    { skill: P_POLEARMS, skmax: P_SKILLED },
    { skill: P_SPEAR, skmax: P_BASIC },
    { skill: P_TRIDENT, skmax: P_BASIC },
    { skill: P_SLING, skmax: P_SKILLED },
    { skill: P_DART, skmax: P_EXPERT },
    { skill: P_SHURIKEN, skmax: P_BASIC },
    { skill: P_ATTACK_SPELL, skmax: P_EXPERT },
    { skill: P_HEALING_SPELL, skmax: P_SKILLED },
    { skill: P_DIVINATION_SPELL, skmax: P_EXPERT },
    { skill: P_ENCHANTMENT_SPELL, skmax: P_SKILLED },
    { skill: P_CLERIC_SPELL, skmax: P_SKILLED },
    { skill: P_ESCAPE_SPELL, skmax: P_EXPERT },
    { skill: P_MATTER_SPELL, skmax: P_EXPERT },
    { skill: P_RIDING, skmax: P_BASIC },
    { skill: P_BARE_HANDED_COMBAT, skmax: P_BASIC },
    { skill: P_NONE, skmax: 0 }
];

export function skills_for_role() {
    switch (game.urole.mnum) {
        case PM_ARCHEOLOGIST: return Skill_A;
        case PM_BARBARIAN: return Skill_B;
        case PM_CAVE_DWELLER: return Skill_C;
        case PM_HEALER: return Skill_H;
        case PM_KNIGHT: return Skill_K;
        case PM_MONK: return Skill_Mon;
        case PM_CLERIC: return Skill_P;
        case PM_ROGUE: return Skill_R;
        case PM_RANGER: return Skill_Ran;
        case PM_SAMURAI: return Skill_S;
        case PM_TOURIST: return Skill_T;
        case PM_VALKYRIE: return Skill_V;
        case PM_WIZARD: return Skill_W;
        default: return Skill_T; // Fallback
    }
}

function practice_needed_to_advance(level) {
    return level * level * 20;
}

function weapon_type(obj) {
    if (!obj) return P_BARE_HANDED_COMBAT;
    if (obj.oclass !== WEAPON_CLASS && obj.oclass !== TOOL_CLASS && obj.oclass !== GEM_CLASS) {
        // Not a weapon, weapon-tool, or ammo
        return P_NONE;
    }
    let type = objects[obj.otyp].oc_subtyp; // oc_skill is mapped to oc_subtyp
    return type < 0 ? -type : type;
}

export function skill_init(class_skill) {
    game.u.weapon_skills = [];
    for (let skill = 0; skill < P_NUM_SKILLS; skill++) {
        game.u.weapon_skills[skill] = {
            skill: P_ISRESTRICTED,
            max_skill: P_ISRESTRICTED,
            advance: 0
        };
    }

    // Set skill for all weapons in inventory to be basic
    for (let obj = invent; obj; obj = obj.nobj) {
        let oc_skill = objects[obj.otyp].oc_subtyp;
        // is_ammo(otmp) from obj.h
        let is_ammo = (obj.oclass === WEAPON_CLASS || obj.oclass === GEM_CLASS) &&
                      (oc_skill >= -P_CROSSBOW && oc_skill <= -P_BOW);
        if (is_ammo || obj.oclass === GEM_CLASS) continue;

        let skill = weapon_type(obj);
        if (skill !== P_NONE) {
            game.u.weapon_skills[skill].skill = P_BASIC;
        }
    }

    if (game.urole.mnum === PM_HEALER || game.urole.mnum === PM_MONK) {
        game.u.weapon_skills[P_HEALING_SPELL].skill = P_BASIC;
    } else if (game.urole.mnum === PM_CLERIC) {
        game.u.weapon_skills[P_CLERIC_SPELL].skill = P_BASIC;
    } else if (game.urole.mnum === PM_WIZARD) {
        game.u.weapon_skills[P_ATTACK_SPELL].skill = P_BASIC;
        game.u.weapon_skills[P_ENCHANTMENT_SPELL].skill = P_BASIC;
    }

    for (let i = 0; i < class_skill.length; i++) {
        let skmax = class_skill[i].skmax;
        let skill = class_skill[i].skill;

        if (skill === P_NONE) break;

        game.u.weapon_skills[skill].max_skill = skmax;
        if (game.u.weapon_skills[skill].skill === P_ISRESTRICTED) {
            game.u.weapon_skills[skill].skill = P_UNSKILLED;
        }
    }

    if (game.u.weapon_skills[P_BARE_HANDED_COMBAT].max_skill > P_EXPERT) {
        game.u.weapon_skills[P_BARE_HANDED_COMBAT].skill = P_BASIC;
    }

    // Roles that start with a horse know how to ride it
    if (game.urole.petnum === PM_PONY) game.u.weapon_skills[P_RIDING].skill = P_BASIC;

    for (let skill = 0; skill < P_NUM_SKILLS; skill++) {
        if (game.u.weapon_skills[skill].skill !== P_ISRESTRICTED) {
            if (game.u.weapon_skills[skill].max_skill < game.u.weapon_skills[skill].skill) {
                game.u.weapon_skills[skill].max_skill = game.u.weapon_skills[skill].skill;
            }
            game.u.weapon_skills[skill].advance = practice_needed_to_advance(game.u.weapon_skills[skill].skill);
        }
    }

    // unrestrict_weapon_skill(spell_skilltype(gu.urole.spelspec));
    // skill_based_spellbook_id();
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
            next_ident(); // next_ident
            // mksobj_init for scrolls and potions does blessorcurse -> rn2(4)
            if ((otyp >= 270 && otyp < 300) || (otyp >= 230 && otyp < 270)) {
                rn2(4);
            }
        } else {
            // UNDEF_TYP -> randomly generated object class
            // obj = mkobj(t.trclass, FALSE);
            next_ident();
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
    let obj = mkobj(oclass, false);
    let otyp = obj.otyp;
    let trycnt = 0;

    // Simplistic stub just recreating the same C loop structure
    // Since gn.nocreate etc aren't fully implemented in our JS, we'll just check the base case.
    while (
        otyp === WAN_WISHING || // WAN_WISHING
        otyp === RIN_LEVITATION || // RIN_LEVITATION
        otyp === POT_HALLUCINATION || // POT_HALLUCINATION
        otyp === POT_ACID || // POT_ACID
        otyp === SCR_AMNESIA || // SCR_AMNESIA
        otyp === SCR_FIRE || // SCR_FIRE
        otyp === SCR_BLANK_PAPER || // SCR_BLANK_PAPER
        otyp === SPE_BLANK_PAPER || // SPE_BLANK_PAPER
        otyp === RIN_AGGRAVATE_MONSTER || // RIN_AGGRAVATE_MONSTER
        otyp === RIN_HUNGER || // RIN_HUNGER
        otyp === WAN_NOTHING || // WAN_NOTHING
        (obj.oclass === SPBOOK_CLASS && objects[otyp].oc_level > (got_level1_spellbook ? 3 : 1)) // SPBOOK_CLASS
    ) {
        if (++trycnt > 1000) {
            obj = mksobj(PANCAKE, true, false); // PANCAKE
            break;
        }
        obj = mkobj(oclass, false);
        otyp = obj.otyp;
    }
    return obj;
}
