// u_init.js — Player initialization (inventory + attrs).
// C ref: u_init.c — u_init_role, u_init_race, trquan, ini_inv,
//        ini_inv_mkobj_filter, ini_inv_obj_substitution,
//        u_init_inventory_attrs
//        (Tourist + Rogue + Wizard + Priest + Knight + Samurai + Healer +
//         Valkyrie + Ranger + Monk + Archeologist + Barbarian + Caveman;
//         human/orc race kits; elf/dwarf/gnome partial).

import { game } from './gstate.js';
import { rn2, rnd, rn1 } from './rng.js';
import { mksobj, mkobj, weight } from './mkobj.js';
import {
    WEAPON_CLASS,
    ARMOR_CLASS,
    TOOL_CLASS,
    FOOD_CLASS,
    POTION_CLASS,
    SCROLL_CLASS,
    WAND_CLASS,
    RING_CLASS,
    SPBOOK_CLASS,
    COIN_CLASS,
    GEM_CLASS,
    MAXOCLASSES,
    NUM_OBJECTS,
    objectNames,
    objectDescrs,
} from './objects.js';
import { init_attr, vary_init_attr, adjabil, A_STR, A_CON, newhp } from './attrib.js';
import { newpw } from './exper.js';
import { roles, races, aligns, findRole, findRace, findAlign } from './roles.js';
import { discover_object } from './invent.js';
import { otyp_uses_known, Japanese_item_name } from './objnam.js';
import {
    W_ARMU, W_ARM, W_ARMC, W_ARMS, W_ARMH, W_ARMG, W_ARMF,
    W_WEP, W_SWAPWEP, W_QUIVER,
    RIGHT_HANDED, LEFT_HANDED,
    A_NEUTRAL,
    Is_container,
    FROMOUTSIDE,
    P_NONE,
    P_DAGGER, P_KNIFE, P_AXE, P_PICK_AXE, P_SHORT_SWORD,
    P_BROAD_SWORD, P_LONG_SWORD, P_TWO_HANDED_SWORD, P_SABER,
    P_CLUB, P_MACE, P_MORNING_STAR, P_FLAIL, P_HAMMER, P_QUARTERSTAFF,
    P_POLEARMS, P_SPEAR, P_TRIDENT, P_LANCE, P_BOW, P_SLING, P_CROSSBOW,
    P_DART, P_SHURIKEN, P_BOOMERANG, P_WHIP, P_UNICORN_HORN,
    P_ATTACK_SPELL, P_HEALING_SPELL, P_DIVINATION_SPELL,
    P_ENCHANTMENT_SPELL, P_CLERIC_SPELL, P_ESCAPE_SPELL, P_MATTER_SPELL,
    P_RIDING, P_TWO_WEAPON_COMBAT, P_BARE_HANDED_COMBAT, P_MARTIAL_ARTS,
    P_BASIC, P_SKILLED, P_EXPERT, P_MASTER, P_GRAND_MASTER,
} from './const.js';
import {
    PM_TOURIST, PM_ROGUE, PM_CLERIC, PM_WIZARD, PM_MONK, PM_KNIGHT,
    PM_SAMURAI, PM_HEALER, PM_VALKYRIE, PM_RANGER, PM_ARCHEOLOGIST,
    PM_BARBARIAN, PM_CAVE_DWELLER,
    PM_HUMAN, PM_ELF, PM_DWARF, PM_ORC, PM_GNOME,
    NON_PM,
} from './generated/monsters_data.js';
import { mons, is_male, is_female, is_neuter } from './monsters.js';

// C ref: objclass.h ARM_* — oc_skill / oc_subtyp / oc_armcat for armor
const ARM_SUIT = 0;
const ARM_SHIELD = 1;
const ARM_HELM = 2;
const ARM_GLOVES = 3;
const ARM_BOOTS = 4;
const ARM_CLOAK = 5;
const ARM_SHIRT = 6;

const UNDEF_TYP = 0;
const UNDEF_SPE = 127; // '\177'
const UNDEF_BLESS = 2;
const GOLD_SYM = '$';
const invlet_basic = 52;

function otypByName(name) {
    const i = objectNames.indexOf(name);
    return i >= 0 ? i : 0;
}

// C ref: u_init.c Tourist[]
const Tourist = [
    { trotyp: () => otypByName('DART'), trspe: 2, trclass: WEAPON_CLASS, trquan_min: 21, trquan_max: 40, trbless: UNDEF_BLESS },
    { trotyp: () => UNDEF_TYP, trspe: UNDEF_SPE, trclass: FOOD_CLASS, trquan_min: 10, trquan_max: 10, trbless: 0 },
    { trotyp: () => otypByName('POT_EXTRA_HEALING'), trspe: 0, trclass: POTION_CLASS, trquan_min: 2, trquan_max: 2, trbless: UNDEF_BLESS },
    { trotyp: () => otypByName('SCR_MAGIC_MAPPING'), trspe: 0, trclass: SCROLL_CLASS, trquan_min: 4, trquan_max: 4, trbless: UNDEF_BLESS },
    { trotyp: () => otypByName('HAWAIIAN_SHIRT'), trspe: 0, trclass: ARMOR_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: () => otypByName('EXPENSIVE_CAMERA'), trspe: UNDEF_SPE, trclass: TOOL_CLASS, trquan_min: 1, trquan_max: 1, trbless: 0 },
    { trotyp: () => otypByName('CREDIT_CARD'), trspe: 0, trclass: TOOL_CLASS, trquan_min: 1, trquan_max: 1, trbless: 0 },
    { trotyp: () => 0, trspe: 0, trclass: 0, trquan_min: 0, trquan_max: 0, trbless: 0 },
];

// C ref: u_init.c Rogue[]
const Rogue = [
    { trotyp: () => otypByName('SHORT_SWORD'), trspe: 0, trclass: WEAPON_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: () => otypByName('DAGGER'), trspe: 0, trclass: WEAPON_CLASS, trquan_min: 6, trquan_max: 15, trbless: 0 },
    { trotyp: () => otypByName('LEATHER_ARMOR'), trspe: 1, trclass: ARMOR_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: () => otypByName('POT_SICKNESS'), trspe: 0, trclass: POTION_CLASS, trquan_min: 1, trquan_max: 1, trbless: 0 },
    { trotyp: () => otypByName('LOCK_PICK'), trspe: 0, trclass: TOOL_CLASS, trquan_min: 1, trquan_max: 1, trbless: 0 },
    { trotyp: () => otypByName('SACK'), trspe: 0, trclass: TOOL_CLASS, trquan_min: 1, trquan_max: 1, trbless: 0 },
    { trotyp: () => 0, trspe: 0, trclass: 0, trquan_min: 0, trquan_max: 0, trbless: 0 },
];

// C ref: u_init.c Wizard[]
const Wizard = [
    { trotyp: () => otypByName('QUARTERSTAFF'), trspe: 1, trclass: WEAPON_CLASS, trquan_min: 1, trquan_max: 1, trbless: 1 },
    { trotyp: () => otypByName('CLOAK_OF_MAGIC_RESISTANCE'), trspe: 0, trclass: ARMOR_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: () => UNDEF_TYP, trspe: UNDEF_SPE, trclass: WAND_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: () => UNDEF_TYP, trspe: UNDEF_SPE, trclass: RING_CLASS, trquan_min: 2, trquan_max: 2, trbless: UNDEF_BLESS },
    { trotyp: () => UNDEF_TYP, trspe: UNDEF_SPE, trclass: POTION_CLASS, trquan_min: 3, trquan_max: 3, trbless: UNDEF_BLESS },
    { trotyp: () => UNDEF_TYP, trspe: UNDEF_SPE, trclass: SCROLL_CLASS, trquan_min: 3, trquan_max: 3, trbless: UNDEF_BLESS },
    { trotyp: () => otypByName('SPE_FORCE_BOLT'), trspe: 0, trclass: SPBOOK_CLASS, trquan_min: 1, trquan_max: 1, trbless: 1 },
    { trotyp: () => UNDEF_TYP, trspe: UNDEF_SPE, trclass: SPBOOK_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: () => otypByName('MAGIC_MARKER'), trspe: 19, trclass: TOOL_CLASS, trquan_min: 1, trquan_max: 1, trbless: 0 },
    { trotyp: () => 0, trspe: 0, trclass: 0, trquan_min: 0, trquan_max: 0, trbless: 0 },
];

// C ref: u_init.c Priest[]
const Priest = [
    { trotyp: () => otypByName('MACE'), trspe: 1, trclass: WEAPON_CLASS, trquan_min: 1, trquan_max: 1, trbless: 1 },
    { trotyp: () => otypByName('ROBE'), trspe: 0, trclass: ARMOR_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: () => otypByName('SMALL_SHIELD'), trspe: 0, trclass: ARMOR_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: () => otypByName('POT_WATER'), trspe: 0, trclass: POTION_CLASS, trquan_min: 4, trquan_max: 4, trbless: 1 },
    { trotyp: () => otypByName('CLOVE_OF_GARLIC'), trspe: 0, trclass: FOOD_CLASS, trquan_min: 1, trquan_max: 1, trbless: 0 },
    { trotyp: () => otypByName('SPRIG_OF_WOLFSBANE'), trspe: 0, trclass: FOOD_CLASS, trquan_min: 1, trquan_max: 1, trbless: 0 },
    { trotyp: () => UNDEF_TYP, trspe: UNDEF_SPE, trclass: SPBOOK_CLASS, trquan_min: 2, trquan_max: 2, trbless: UNDEF_BLESS },
    { trotyp: () => 0, trspe: 0, trclass: 0, trquan_min: 0, trquan_max: 0, trbless: 0 },
];

// C ref: u_init.c Knight[]
const Knight = [
    { trotyp: () => otypByName('LONG_SWORD'), trspe: 1, trclass: WEAPON_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: () => otypByName('LANCE'), trspe: 1, trclass: WEAPON_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: () => otypByName('RING_MAIL'), trspe: 1, trclass: ARMOR_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: () => otypByName('HELMET'), trspe: 0, trclass: ARMOR_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: () => otypByName('SMALL_SHIELD'), trspe: 0, trclass: ARMOR_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: () => otypByName('LEATHER_GLOVES'), trspe: 0, trclass: ARMOR_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: () => otypByName('APPLE'), trspe: 0, trclass: FOOD_CLASS, trquan_min: 10, trquan_max: 10, trbless: 0 },
    { trotyp: () => otypByName('CARROT'), trspe: 0, trclass: FOOD_CLASS, trquan_min: 10, trquan_max: 10, trbless: 0 },
    { trotyp: () => 0, trspe: 0, trclass: 0, trquan_min: 0, trquan_max: 0, trbless: 0 },
];

// C ref: u_init.c Samurai[]
const Samurai = [
    { trotyp: () => otypByName('KATANA'), trspe: 0, trclass: WEAPON_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: () => otypByName('SHORT_SWORD'), trspe: 0, trclass: WEAPON_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: () => otypByName('YUMI'), trspe: 0, trclass: WEAPON_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: () => otypByName('YA'), trspe: 0, trclass: WEAPON_CLASS, trquan_min: 26, trquan_max: 45, trbless: UNDEF_BLESS },
    { trotyp: () => otypByName('SPLINT_MAIL'), trspe: 0, trclass: ARMOR_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: () => 0, trspe: 0, trclass: 0, trquan_min: 0, trquan_max: 0, trbless: 0 },
];

// C ref: u_init.c Healer[]
const Healer = [
    { trotyp: () => otypByName('SCALPEL'), trspe: 0, trclass: WEAPON_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: () => otypByName('LEATHER_GLOVES'), trspe: 1, trclass: ARMOR_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: () => otypByName('STETHOSCOPE'), trspe: 0, trclass: TOOL_CLASS, trquan_min: 1, trquan_max: 1, trbless: 0 },
    { trotyp: () => otypByName('POT_HEALING'), trspe: 0, trclass: POTION_CLASS, trquan_min: 4, trquan_max: 4, trbless: UNDEF_BLESS },
    { trotyp: () => otypByName('POT_EXTRA_HEALING'), trspe: 0, trclass: POTION_CLASS, trquan_min: 4, trquan_max: 4, trbless: UNDEF_BLESS },
    { trotyp: () => otypByName('WAN_SLEEP'), trspe: UNDEF_SPE, trclass: WAND_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: () => otypByName('SPE_HEALING'), trspe: 0, trclass: SPBOOK_CLASS, trquan_min: 1, trquan_max: 1, trbless: 1 },
    { trotyp: () => otypByName('SPE_EXTRA_HEALING'), trspe: 0, trclass: SPBOOK_CLASS, trquan_min: 1, trquan_max: 1, trbless: 1 },
    { trotyp: () => otypByName('SPE_STONE_TO_FLESH'), trspe: 0, trclass: SPBOOK_CLASS, trquan_min: 1, trquan_max: 1, trbless: 1 },
    { trotyp: () => otypByName('APPLE'), trspe: 0, trclass: FOOD_CLASS, trquan_min: 5, trquan_max: 5, trbless: 0 },
    { trotyp: () => 0, trspe: 0, trclass: 0, trquan_min: 0, trquan_max: 0, trbless: 0 },
];

// C ref: u_init.c Valkyrie[]
const Valkyrie = [
    { trotyp: () => otypByName('SPEAR'), trspe: 1, trclass: WEAPON_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: () => otypByName('DAGGER'), trspe: 0, trclass: WEAPON_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: () => otypByName('SMALL_SHIELD'), trspe: 3, trclass: ARMOR_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: () => otypByName('FOOD_RATION'), trspe: 0, trclass: FOOD_CLASS, trquan_min: 1, trquan_max: 1, trbless: 0 },
    { trotyp: () => 0, trspe: 0, trclass: 0, trquan_min: 0, trquan_max: 0, trbless: 0 },
];

// C ref: u_init.c Ranger[]
const Ranger = [
    { trotyp: () => otypByName('DAGGER'), trspe: 1, trclass: WEAPON_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: () => otypByName('BOW'), trspe: 1, trclass: WEAPON_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: () => otypByName('ARROW'), trspe: 2, trclass: WEAPON_CLASS, trquan_min: 50, trquan_max: 59, trbless: UNDEF_BLESS },
    { trotyp: () => otypByName('ARROW'), trspe: 0, trclass: WEAPON_CLASS, trquan_min: 30, trquan_max: 39, trbless: UNDEF_BLESS },
    { trotyp: () => otypByName('CLOAK_OF_DISPLACEMENT'), trspe: 2, trclass: ARMOR_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: () => otypByName('CRAM_RATION'), trspe: 0, trclass: FOOD_CLASS, trquan_min: 4, trquan_max: 4, trbless: 0 },
    { trotyp: () => 0, trspe: 0, trclass: 0, trquan_min: 0, trquan_max: 0, trbless: 0 },
];

// C ref: u_init.c Monk[]
const Monk = [
    { trotyp: () => otypByName('LEATHER_GLOVES'), trspe: 2, trclass: ARMOR_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: () => otypByName('ROBE'), trspe: 1, trclass: ARMOR_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: () => UNDEF_TYP, trspe: UNDEF_SPE, trclass: SCROLL_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: () => otypByName('POT_HEALING'), trspe: 0, trclass: POTION_CLASS, trquan_min: 3, trquan_max: 3, trbless: UNDEF_BLESS },
    { trotyp: () => otypByName('FOOD_RATION'), trspe: 0, trclass: FOOD_CLASS, trquan_min: 3, trquan_max: 3, trbless: 0 },
    { trotyp: () => otypByName('APPLE'), trspe: 0, trclass: FOOD_CLASS, trquan_min: 5, trquan_max: 5, trbless: UNDEF_BLESS },
    { trotyp: () => otypByName('ORANGE'), trspe: 0, trclass: FOOD_CLASS, trquan_min: 5, trquan_max: 5, trbless: UNDEF_BLESS },
    { trotyp: () => otypByName('FORTUNE_COOKIE'), trspe: 0, trclass: FOOD_CLASS, trquan_min: 3, trquan_max: 3, trbless: UNDEF_BLESS },
    { trotyp: () => 0, trspe: 0, trclass: 0, trquan_min: 0, trquan_max: 0, trbless: 0 },
];

// C ref: u_init.c Archeologist[]
const Archeologist = [
    { trotyp: () => otypByName('BULLWHIP'), trspe: 2, trclass: WEAPON_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: () => otypByName('LEATHER_JACKET'), trspe: 0, trclass: ARMOR_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: () => otypByName('FEDORA'), trspe: 0, trclass: ARMOR_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: () => otypByName('FOOD_RATION'), trspe: 0, trclass: FOOD_CLASS, trquan_min: 3, trquan_max: 3, trbless: 0 },
    { trotyp: () => otypByName('PICK_AXE'), trspe: UNDEF_SPE, trclass: TOOL_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: () => otypByName('TINNING_KIT'), trspe: UNDEF_SPE, trclass: TOOL_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: () => otypByName('TOUCHSTONE'), trspe: 0, trclass: GEM_CLASS, trquan_min: 1, trquan_max: 1, trbless: 0 },
    { trotyp: () => otypByName('SACK'), trspe: 0, trclass: TOOL_CLASS, trquan_min: 1, trquan_max: 1, trbless: 0 },
    { trotyp: () => 0, trspe: 0, trclass: 0, trquan_min: 0, trquan_max: 0, trbless: 0 },
];

// C ref: u_init.c Barbarian_0[] / Barbarian_1[]
const Barbarian_0 = [
    { trotyp: () => otypByName('TWO_HANDED_SWORD'), trspe: 0, trclass: WEAPON_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: () => otypByName('AXE'), trspe: 0, trclass: WEAPON_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: () => otypByName('RING_MAIL'), trspe: 0, trclass: ARMOR_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: () => otypByName('FOOD_RATION'), trspe: 0, trclass: FOOD_CLASS, trquan_min: 1, trquan_max: 1, trbless: 0 },
    { trotyp: () => 0, trspe: 0, trclass: 0, trquan_min: 0, trquan_max: 0, trbless: 0 },
];
const Barbarian_1 = [
    { trotyp: () => otypByName('BATTLE_AXE'), trspe: 0, trclass: WEAPON_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: () => otypByName('SHORT_SWORD'), trspe: 0, trclass: WEAPON_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: () => otypByName('RING_MAIL'), trspe: 0, trclass: ARMOR_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: () => otypByName('FOOD_RATION'), trspe: 0, trclass: FOOD_CLASS, trquan_min: 1, trquan_max: 1, trbless: 0 },
    { trotyp: () => 0, trspe: 0, trclass: 0, trquan_min: 0, trquan_max: 0, trbless: 0 },
];

// C ref: u_init.c Cave_man[] — ROCK trop 3 stacks × mksobj rn1(6,6) → 18..33
const Cave_man = [
    { trotyp: () => otypByName('CLUB'), trspe: 1, trclass: WEAPON_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: () => otypByName('SLING'), trspe: 2, trclass: WEAPON_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: () => otypByName('FLINT'), trspe: 0, trclass: GEM_CLASS, trquan_min: 10, trquan_max: 20, trbless: UNDEF_BLESS },
    { trotyp: () => otypByName('ROCK'), trspe: 0, trclass: GEM_CLASS, trquan_min: 3, trquan_max: 3, trbless: 0 },
    { trotyp: () => otypByName('LEATHER_ARMOR'), trspe: 0, trclass: ARMOR_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: () => 0, trspe: 0, trclass: 0, trquan_min: 0, trquan_max: 0, trbless: 0 },
];

// C ref: u_init.c Healing_book / Protection_book / Confuse_monster_book
const Healing_book = [
    { trotyp: () => otypByName('SPE_HEALING'), trspe: UNDEF_SPE, trclass: SPBOOK_CLASS, trquan_min: 1, trquan_max: 1, trbless: 1 },
    { trotyp: () => 0, trspe: 0, trclass: 0, trquan_min: 0, trquan_max: 0, trbless: 0 },
];
const Protection_book = [
    { trotyp: () => otypByName('SPE_PROTECTION'), trspe: UNDEF_SPE, trclass: SPBOOK_CLASS, trquan_min: 1, trquan_max: 1, trbless: 1 },
    { trotyp: () => 0, trspe: 0, trclass: 0, trquan_min: 0, trquan_max: 0, trbless: 0 },
];
const Confuse_monster_book = [
    { trotyp: () => otypByName('SPE_CONFUSE_MONSTER'), trspe: UNDEF_SPE, trclass: SPBOOK_CLASS, trquan_min: 1, trquan_max: 1, trbless: 1 },
    { trotyp: () => 0, trspe: 0, trclass: 0, trquan_min: 0, trquan_max: 0, trbless: 0 },
];

// C ref: u_init.c Skill_W[] — needed for restricted_spell_discipline in filter
const Skill_W = [
    { skill: P_DAGGER, max: P_EXPERT },
    { skill: P_KNIFE, max: P_SKILLED },
    { skill: P_AXE, max: P_SKILLED },
    { skill: P_SHORT_SWORD, max: P_BASIC },
    { skill: P_CLUB, max: P_SKILLED },
    { skill: P_MACE, max: P_BASIC },
    { skill: P_QUARTERSTAFF, max: P_EXPERT },
    { skill: P_POLEARMS, max: P_SKILLED },
    { skill: P_SPEAR, max: P_BASIC },
    { skill: P_TRIDENT, max: P_BASIC },
    { skill: P_SLING, max: P_SKILLED },
    { skill: P_DART, max: P_EXPERT },
    { skill: P_SHURIKEN, max: P_BASIC },
    { skill: P_ATTACK_SPELL, max: P_EXPERT },
    { skill: P_HEALING_SPELL, max: P_SKILLED },
    { skill: P_DIVINATION_SPELL, max: P_EXPERT },
    { skill: P_ENCHANTMENT_SPELL, max: P_SKILLED },
    { skill: P_CLERIC_SPELL, max: P_SKILLED },
    { skill: P_ESCAPE_SPELL, max: P_EXPERT },
    { skill: P_MATTER_SPELL, max: P_EXPERT },
    { skill: P_RIDING, max: P_BASIC },
    { skill: P_BARE_HANDED_COMBAT, max: P_BASIC },
];

// C ref: u_init.c Skill_P[] — Priest filter discipline
const Skill_P = [
    { skill: P_CLUB, max: P_EXPERT },
    { skill: P_MACE, max: P_EXPERT },
    { skill: P_MORNING_STAR, max: P_EXPERT },
    { skill: P_FLAIL, max: P_EXPERT },
    { skill: P_HAMMER, max: P_EXPERT },
    { skill: P_QUARTERSTAFF, max: P_EXPERT },
    { skill: P_POLEARMS, max: P_SKILLED },
    { skill: P_SPEAR, max: P_SKILLED },
    { skill: P_TRIDENT, max: P_SKILLED },
    { skill: P_LANCE, max: P_BASIC },
    { skill: P_BOW, max: P_BASIC },
    { skill: P_SLING, max: P_BASIC },
    { skill: P_CROSSBOW, max: P_BASIC },
    { skill: P_DART, max: P_BASIC },
    { skill: P_SHURIKEN, max: P_BASIC },
    { skill: P_BOOMERANG, max: P_BASIC },
    { skill: P_UNICORN_HORN, max: P_SKILLED },
    { skill: P_HEALING_SPELL, max: P_EXPERT },
    { skill: P_DIVINATION_SPELL, max: P_EXPERT },
    { skill: P_CLERIC_SPELL, max: P_EXPERT },
    { skill: P_BARE_HANDED_COMBAT, max: P_BASIC },
];

// C ref: u_init.c Skill_K[] — Knight (skills_init still stubbed; filter-ready)
const Skill_K = [
    { skill: P_DAGGER, max: P_BASIC },
    { skill: P_KNIFE, max: P_BASIC },
    { skill: P_AXE, max: P_SKILLED },
    { skill: P_PICK_AXE, max: P_BASIC },
    { skill: P_SHORT_SWORD, max: P_SKILLED },
    { skill: P_BROAD_SWORD, max: P_SKILLED },
    { skill: P_LONG_SWORD, max: P_EXPERT },
    { skill: P_TWO_HANDED_SWORD, max: P_SKILLED },
    { skill: P_SABER, max: P_SKILLED },
    { skill: P_CLUB, max: P_BASIC },
    { skill: P_MACE, max: P_SKILLED },
    { skill: P_MORNING_STAR, max: P_SKILLED },
    { skill: P_FLAIL, max: P_BASIC },
    { skill: P_HAMMER, max: P_BASIC },
    { skill: P_POLEARMS, max: P_SKILLED },
    { skill: P_SPEAR, max: P_SKILLED },
    { skill: P_TRIDENT, max: P_BASIC },
    { skill: P_LANCE, max: P_EXPERT },
    { skill: P_BOW, max: P_BASIC },
    { skill: P_CROSSBOW, max: P_SKILLED },
    { skill: P_ATTACK_SPELL, max: P_SKILLED },
    { skill: P_HEALING_SPELL, max: P_SKILLED },
    { skill: P_CLERIC_SPELL, max: P_SKILLED },
    { skill: P_RIDING, max: P_EXPERT },
    { skill: P_TWO_WEAPON_COMBAT, max: P_SKILLED },
    { skill: P_BARE_HANDED_COMBAT, max: P_EXPERT },
];

// C ref: u_init.c Skill_S[] — Samurai (skills_init still stubbed; filter-ready)
const Skill_S = [
    { skill: P_DAGGER, max: P_BASIC },
    { skill: P_KNIFE, max: P_SKILLED },
    { skill: P_SHORT_SWORD, max: P_EXPERT },
    { skill: P_BROAD_SWORD, max: P_SKILLED },
    { skill: P_LONG_SWORD, max: P_EXPERT },
    { skill: P_TWO_HANDED_SWORD, max: P_EXPERT },
    { skill: P_SABER, max: P_BASIC },
    { skill: P_FLAIL, max: P_SKILLED },
    { skill: P_QUARTERSTAFF, max: P_BASIC },
    { skill: P_POLEARMS, max: P_SKILLED },
    { skill: P_SPEAR, max: P_SKILLED },
    { skill: P_LANCE, max: P_SKILLED },
    { skill: P_BOW, max: P_EXPERT },
    { skill: P_SHURIKEN, max: P_EXPERT },
    { skill: P_ATTACK_SPELL, max: P_BASIC },
    { skill: P_DIVINATION_SPELL, max: P_BASIC },
    { skill: P_CLERIC_SPELL, max: P_SKILLED },
    { skill: P_RIDING, max: P_SKILLED },
    { skill: P_TWO_WEAPON_COMBAT, max: P_EXPERT },
    { skill: P_MARTIAL_ARTS, max: P_MASTER },
];

// C ref: u_init.c Skill_H[] — Healer (skills_init still stubbed; filter-ready)
const Skill_H = [
    { skill: P_DAGGER, max: P_SKILLED },
    { skill: P_KNIFE, max: P_EXPERT },
    { skill: P_SHORT_SWORD, max: P_SKILLED },
    { skill: P_SABER, max: P_BASIC },
    { skill: P_CLUB, max: P_SKILLED },
    { skill: P_MACE, max: P_BASIC },
    { skill: P_QUARTERSTAFF, max: P_EXPERT },
    { skill: P_POLEARMS, max: P_BASIC },
    { skill: P_SPEAR, max: P_BASIC },
    { skill: P_TRIDENT, max: P_BASIC },
    { skill: P_SLING, max: P_SKILLED },
    { skill: P_DART, max: P_EXPERT },
    { skill: P_SHURIKEN, max: P_SKILLED },
    { skill: P_UNICORN_HORN, max: P_EXPERT },
    { skill: P_HEALING_SPELL, max: P_EXPERT },
    { skill: P_BARE_HANDED_COMBAT, max: P_BASIC },
];

// C ref: u_init.c Skill_V[] — Valkyrie (skills_init still stubbed; filter-ready)
const Skill_V = [
    { skill: P_DAGGER, max: P_EXPERT },
    { skill: P_AXE, max: P_EXPERT },
    { skill: P_PICK_AXE, max: P_SKILLED },
    { skill: P_SHORT_SWORD, max: P_SKILLED },
    { skill: P_BROAD_SWORD, max: P_SKILLED },
    { skill: P_LONG_SWORD, max: P_EXPERT },
    { skill: P_TWO_HANDED_SWORD, max: P_EXPERT },
    { skill: P_SABER, max: P_BASIC },
    { skill: P_HAMMER, max: P_EXPERT },
    { skill: P_QUARTERSTAFF, max: P_BASIC },
    { skill: P_POLEARMS, max: P_SKILLED },
    { skill: P_SPEAR, max: P_EXPERT },
    { skill: P_TRIDENT, max: P_BASIC },
    { skill: P_LANCE, max: P_SKILLED },
    { skill: P_SLING, max: P_BASIC },
    { skill: P_ATTACK_SPELL, max: P_BASIC },
    { skill: P_ESCAPE_SPELL, max: P_BASIC },
    { skill: P_RIDING, max: P_SKILLED },
    { skill: P_TWO_WEAPON_COMBAT, max: P_SKILLED },
    { skill: P_BARE_HANDED_COMBAT, max: P_EXPERT },
];

// C ref: u_init.c Skill_Ran[] — Ranger (skills_init still stubbed; filter-ready)
const Skill_Ran = [
    { skill: P_DAGGER, max: P_EXPERT },
    { skill: P_KNIFE, max: P_SKILLED },
    { skill: P_AXE, max: P_SKILLED },
    { skill: P_PICK_AXE, max: P_BASIC },
    { skill: P_SHORT_SWORD, max: P_BASIC },
    { skill: P_MORNING_STAR, max: P_BASIC },
    { skill: P_FLAIL, max: P_SKILLED },
    { skill: P_HAMMER, max: P_BASIC },
    { skill: P_QUARTERSTAFF, max: P_BASIC },
    { skill: P_POLEARMS, max: P_SKILLED },
    { skill: P_SPEAR, max: P_EXPERT },
    { skill: P_TRIDENT, max: P_BASIC },
    { skill: P_BOW, max: P_EXPERT },
    { skill: P_SLING, max: P_EXPERT },
    { skill: P_CROSSBOW, max: P_EXPERT },
    { skill: P_DART, max: P_EXPERT },
    { skill: P_SHURIKEN, max: P_SKILLED },
    { skill: P_BOOMERANG, max: P_EXPERT },
    { skill: P_WHIP, max: P_BASIC },
    { skill: P_HEALING_SPELL, max: P_BASIC },
    { skill: P_DIVINATION_SPELL, max: P_EXPERT },
    { skill: P_ESCAPE_SPELL, max: P_BASIC },
    { skill: P_RIDING, max: P_BASIC },
    { skill: P_BARE_HANDED_COMBAT, max: P_BASIC },
];

// C ref: u_init.c Skill_Mon[] — Monk (skills_init still stubbed; filter-ready)
const Skill_Mon = [
    { skill: P_QUARTERSTAFF, max: P_BASIC },
    { skill: P_SPEAR, max: P_BASIC },
    { skill: P_CROSSBOW, max: P_BASIC },
    { skill: P_SHURIKEN, max: P_BASIC },
    { skill: P_ATTACK_SPELL, max: P_BASIC },
    { skill: P_HEALING_SPELL, max: P_EXPERT },
    { skill: P_DIVINATION_SPELL, max: P_BASIC },
    { skill: P_ENCHANTMENT_SPELL, max: P_BASIC },
    { skill: P_CLERIC_SPELL, max: P_SKILLED },
    { skill: P_ESCAPE_SPELL, max: P_SKILLED },
    { skill: P_MATTER_SPELL, max: P_BASIC },
    { skill: P_MARTIAL_ARTS, max: P_GRAND_MASTER },
];

// C ref: u_init.c Skill_A[] — Archeologist (skills_init still stubbed; filter-ready)
const Skill_A = [
    { skill: P_DAGGER, max: P_BASIC },
    { skill: P_KNIFE, max: P_BASIC },
    { skill: P_PICK_AXE, max: P_EXPERT },
    { skill: P_SHORT_SWORD, max: P_BASIC },
    { skill: P_SABER, max: P_EXPERT },
    { skill: P_CLUB, max: P_SKILLED },
    { skill: P_QUARTERSTAFF, max: P_SKILLED },
    { skill: P_SLING, max: P_SKILLED },
    { skill: P_DART, max: P_BASIC },
    { skill: P_BOOMERANG, max: P_EXPERT },
    { skill: P_WHIP, max: P_EXPERT },
    { skill: P_UNICORN_HORN, max: P_SKILLED },
    { skill: P_ATTACK_SPELL, max: P_BASIC },
    { skill: P_HEALING_SPELL, max: P_BASIC },
    { skill: P_DIVINATION_SPELL, max: P_EXPERT },
    { skill: P_MATTER_SPELL, max: P_BASIC },
    { skill: P_RIDING, max: P_BASIC },
    { skill: P_TWO_WEAPON_COMBAT, max: P_BASIC },
    { skill: P_BARE_HANDED_COMBAT, max: P_EXPERT },
];

// C ref: u_init.c Skill_B[] — Barbarian (skills_init still stubbed; filter-ready)
const Skill_B = [
    { skill: P_DAGGER, max: P_BASIC },
    { skill: P_AXE, max: P_EXPERT },
    { skill: P_PICK_AXE, max: P_SKILLED },
    { skill: P_SHORT_SWORD, max: P_EXPERT },
    { skill: P_BROAD_SWORD, max: P_SKILLED },
    { skill: P_LONG_SWORD, max: P_SKILLED },
    { skill: P_TWO_HANDED_SWORD, max: P_EXPERT },
    { skill: P_SABER, max: P_SKILLED },
    { skill: P_CLUB, max: P_SKILLED },
    { skill: P_MACE, max: P_SKILLED },
    { skill: P_MORNING_STAR, max: P_SKILLED },
    { skill: P_FLAIL, max: P_BASIC },
    { skill: P_HAMMER, max: P_EXPERT },
    { skill: P_QUARTERSTAFF, max: P_BASIC },
    { skill: P_SPEAR, max: P_SKILLED },
    { skill: P_TRIDENT, max: P_SKILLED },
    { skill: P_BOW, max: P_BASIC },
    { skill: P_ATTACK_SPELL, max: P_BASIC },
    { skill: P_ESCAPE_SPELL, max: P_BASIC },
    { skill: P_RIDING, max: P_BASIC },
    { skill: P_TWO_WEAPON_COMBAT, max: P_BASIC },
    { skill: P_BARE_HANDED_COMBAT, max: P_MASTER },
];

// C ref: u_init.c Skill_C[] — Caveman (skills_init still stubbed; filter-ready)
const Skill_C = [
    { skill: P_DAGGER, max: P_BASIC },
    { skill: P_KNIFE, max: P_SKILLED },
    { skill: P_AXE, max: P_SKILLED },
    { skill: P_PICK_AXE, max: P_BASIC },
    { skill: P_CLUB, max: P_EXPERT },
    { skill: P_MACE, max: P_EXPERT },
    { skill: P_MORNING_STAR, max: P_BASIC },
    { skill: P_FLAIL, max: P_SKILLED },
    { skill: P_HAMMER, max: P_SKILLED },
    { skill: P_QUARTERSTAFF, max: P_EXPERT },
    { skill: P_POLEARMS, max: P_SKILLED },
    { skill: P_SPEAR, max: P_EXPERT },
    { skill: P_TRIDENT, max: P_SKILLED },
    { skill: P_BOW, max: P_SKILLED },
    { skill: P_SLING, max: P_EXPERT },
    { skill: P_ATTACK_SPELL, max: P_BASIC },
    { skill: P_MATTER_SPELL, max: P_SKILLED },
    { skill: P_BOOMERANG, max: P_EXPERT },
    { skill: P_UNICORN_HORN, max: P_BASIC },
    { skill: P_BARE_HANDED_COMBAT, max: P_MASTER },
];

function strangeObject() {
    return otypByName('STRANGE_OBJECT') || 0;
}

const Tinopener = [
    { trotyp: () => otypByName('TIN_OPENER'), trspe: 0, trclass: TOOL_CLASS, trquan_min: 1, trquan_max: 1, trbless: 0 },
    { trotyp: () => 0, trspe: 0, trclass: 0, trquan_min: 0, trquan_max: 0, trbless: 0 },
];
const Leash = [
    { trotyp: () => otypByName('LEASH'), trspe: 0, trclass: TOOL_CLASS, trquan_min: 1, trquan_max: 1, trbless: 0 },
    { trotyp: () => 0, trspe: 0, trclass: 0, trquan_min: 0, trquan_max: 0, trbless: 0 },
];
const Towel = [
    { trotyp: () => otypByName('TOWEL'), trspe: 0, trclass: TOOL_CLASS, trquan_min: 1, trquan_max: 1, trbless: 0 },
    { trotyp: () => 0, trspe: 0, trclass: 0, trquan_min: 0, trquan_max: 0, trbless: 0 },
];
const Magicmarker = [
    { trotyp: () => otypByName('MAGIC_MARKER'), trspe: 19, trclass: TOOL_CLASS, trquan_min: 1, trquan_max: 1, trbless: 0 },
    { trotyp: () => 0, trspe: 0, trclass: 0, trquan_min: 0, trquan_max: 0, trbless: 0 },
];
const Blindfold = [
    { trotyp: () => otypByName('BLINDFOLD'), trspe: 0, trclass: TOOL_CLASS, trquan_min: 1, trquan_max: 1, trbless: 0 },
    { trotyp: () => 0, trspe: 0, trclass: 0, trquan_min: 0, trquan_max: 0, trbless: 0 },
];
// C ref: u_init.c Lamp[]
const Lamp = [
    { trotyp: () => otypByName('OIL_LAMP'), trspe: 1, trclass: TOOL_CLASS, trquan_min: 1, trquan_max: 1, trbless: 0 },
    { trotyp: () => 0, trspe: 0, trclass: 0, trquan_min: 0, trquan_max: 0, trbless: 0 },
];
const Wishing = [
    { trotyp: () => otypByName('WAN_WISHING'), trspe: 3, trclass: WAND_CLASS, trquan_min: 1, trquan_max: 1, trbless: 0 },
    { trotyp: () => 0, trspe: 0, trclass: 0, trquan_min: 0, trquan_max: 0, trbless: 0 },
];
const Money = [
    { trotyp: () => otypByName('GOLD_PIECE'), trspe: 0, trclass: COIN_CLASS, trquan_min: 1, trquan_max: 1, trbless: 0 },
    { trotyp: () => 0, trspe: 0, trclass: 0, trquan_min: 0, trquan_max: 0, trbless: 0 },
];
// C ref: u_init.c Xtra_food[] — orc race compensation (2 random foods)
const Xtra_food = [
    { trotyp: () => UNDEF_TYP, trspe: UNDEF_SPE, trclass: FOOD_CLASS, trquan_min: 2, trquan_max: 2, trbless: 0 },
    { trotyp: () => 0, trspe: 0, trclass: 0, trquan_min: 0, trquan_max: 0, trbless: 0 },
];

// C ref: objects.h — weapons with oc_skill == P_DAGGER (extractor lacks oc_skill).
const DAGGER_SKILL_OTYPS = [
    'DAGGER', 'ELVEN_DAGGER', 'ORCISH_DAGGER', 'SILVER_DAGGER', 'ATHAME',
].map(otypByName).filter(i => i > 0);

// C ref: u_init.c inv_subs[] — race-based starting-inventory substitutions
const inv_subs = [
    { race_pm: PM_ELF, item_otyp: () => otypByName('DAGGER'), subs_otyp: () => otypByName('ELVEN_DAGGER') },
    { race_pm: PM_ELF, item_otyp: () => otypByName('SPEAR'), subs_otyp: () => otypByName('ELVEN_SPEAR') },
    { race_pm: PM_ELF, item_otyp: () => otypByName('SHORT_SWORD'), subs_otyp: () => otypByName('ELVEN_SHORT_SWORD') },
    { race_pm: PM_ELF, item_otyp: () => otypByName('BOW'), subs_otyp: () => otypByName('ELVEN_BOW') },
    { race_pm: PM_ELF, item_otyp: () => otypByName('ARROW'), subs_otyp: () => otypByName('ELVEN_ARROW') },
    { race_pm: PM_ELF, item_otyp: () => otypByName('HELMET'), subs_otyp: () => otypByName('ELVEN_LEATHER_HELM') },
    { race_pm: PM_ELF, item_otyp: () => otypByName('CLOAK_OF_DISPLACEMENT'), subs_otyp: () => otypByName('ELVEN_CLOAK') },
    { race_pm: PM_ELF, item_otyp: () => otypByName('CRAM_RATION'), subs_otyp: () => otypByName('LEMBAS_WAFER') },
    { race_pm: PM_ORC, item_otyp: () => otypByName('DAGGER'), subs_otyp: () => otypByName('ORCISH_DAGGER') },
    { race_pm: PM_ORC, item_otyp: () => otypByName('SPEAR'), subs_otyp: () => otypByName('ORCISH_SPEAR') },
    { race_pm: PM_ORC, item_otyp: () => otypByName('SHORT_SWORD'), subs_otyp: () => otypByName('ORCISH_SHORT_SWORD') },
    { race_pm: PM_ORC, item_otyp: () => otypByName('BOW'), subs_otyp: () => otypByName('ORCISH_BOW') },
    { race_pm: PM_ORC, item_otyp: () => otypByName('ARROW'), subs_otyp: () => otypByName('ORCISH_ARROW') },
    { race_pm: PM_ORC, item_otyp: () => otypByName('HELMET'), subs_otyp: () => otypByName('ORCISH_HELM') },
    { race_pm: PM_ORC, item_otyp: () => otypByName('SMALL_SHIELD'), subs_otyp: () => otypByName('ORCISH_SHIELD') },
    { race_pm: PM_ORC, item_otyp: () => otypByName('RING_MAIL'), subs_otyp: () => otypByName('ORCISH_RING_MAIL') },
    { race_pm: PM_ORC, item_otyp: () => otypByName('CHAIN_MAIL'), subs_otyp: () => otypByName('ORCISH_CHAIN_MAIL') },
    { race_pm: PM_ORC, item_otyp: () => otypByName('CRAM_RATION'), subs_otyp: () => otypByName('TRIPE_RATION') },
    { race_pm: PM_ORC, item_otyp: () => otypByName('LEMBAS_WAFER'), subs_otyp: () => otypByName('TRIPE_RATION') },
    { race_pm: PM_DWARF, item_otyp: () => otypByName('SPEAR'), subs_otyp: () => otypByName('DWARVISH_SPEAR') },
    { race_pm: PM_DWARF, item_otyp: () => otypByName('SHORT_SWORD'), subs_otyp: () => otypByName('DWARVISH_SHORT_SWORD') },
    { race_pm: PM_DWARF, item_otyp: () => otypByName('HELMET'), subs_otyp: () => otypByName('DWARVISH_IRON_HELM') },
    { race_pm: PM_DWARF, item_otyp: () => otypByName('LEMBAS_WAFER'), subs_otyp: () => otypByName('CRAM_RATION') },
    { race_pm: PM_GNOME, item_otyp: () => otypByName('BOW'), subs_otyp: () => otypByName('CROSSBOW') },
    { race_pm: PM_GNOME, item_otyp: () => otypByName('ARROW'), subs_otyp: () => otypByName('CROSSBOW_BOLT') },
];

// C ref: u_init.c trquan()
function trquan(trop) {
    if (!trop.trquan_min) return 1;
    return trop.trquan_min + rn2(trop.trquan_max - trop.trquan_min + 1);
}

// C ref: u_init.c skills_for_role() — Wizard + Priest + Knight + Samurai + Healer + Valkyrie + Ranger + Monk + Archeologist + Barbarian + Caveman
function skills_for_role() {
    if (game.urole?.mnum === PM_WIZARD) return Skill_W;
    if (game.urole?.mnum === PM_CLERIC) return Skill_P;
    if (game.urole?.mnum === PM_KNIGHT) return Skill_K;
    if (game.urole?.mnum === PM_SAMURAI) return Skill_S;
    if (game.urole?.mnum === PM_HEALER) return Skill_H;
    if (game.urole?.mnum === PM_VALKYRIE) return Skill_V;
    if (game.urole?.mnum === PM_RANGER) return Skill_Ran;
    if (game.urole?.mnum === PM_MONK) return Skill_Mon;
    if (game.urole?.mnum === PM_ARCHEOLOGIST) return Skill_A;
    if (game.urole?.mnum === PM_BARBARIAN) return Skill_B;
    if (game.urole?.mnum === PM_CAVE_DWELLER) return Skill_C;
    return null;
}

// C ref: spell.c spell_skilltype() — objects[].oc_skill
function spell_skilltype(otyp) {
    return game.objects?.[otyp]?.oc_skill ?? P_NONE;
}

// C ref: u_init.c restricted_spell_discipline()
function restricted_spell_discipline(otyp) {
    const skills = skills_for_role();
    const thisSkill = spell_skilltype(otyp);
    if (!skills) return true;
    for (const s of skills) {
        if (s.skill === thisSkill) return false;
    }
    return true;
}

// C ref: u_init.c ini_inv_mkobj_filter()
function ini_inv_mkobj_filter(oclass, got_level1_spellbook) {
    let obj = mkobj(oclass, false);
    let otyp = obj.otyp;
    let trycnt = 0;
    const nocreate = game.nocreate ?? strangeObject();
    const nocreate2 = game.nocreate2 ?? strangeObject();
    const nocreate3 = game.nocreate3 ?? strangeObject();
    const nocreate4 = game.nocreate4 ?? strangeObject();
    const rolePm = game.urole?.mnum;
    const racePm = game.urace?.mnum;

    while (
        otyp === otypByName('WAN_WISHING')
        || otyp === nocreate
        || otyp === nocreate2
        || otyp === nocreate3
        || otyp === nocreate4
        || otyp === otypByName('RIN_LEVITATION')
        || otyp === otypByName('POT_HALLUCINATION')
        || otyp === otypByName('POT_ACID')
        || otyp === otypByName('SCR_AMNESIA')
        || otyp === otypByName('SCR_FIRE')
        || otyp === otypByName('SCR_BLANK_PAPER')
        || otyp === otypByName('SPE_BLANK_PAPER')
        || otyp === otypByName('RIN_AGGRAVATE_MONSTER')
        || otyp === otypByName('RIN_HUNGER')
        || otyp === otypByName('WAN_NOTHING')
        || (otyp === otypByName('RIN_POISON_RESISTANCE') && racePm === PM_ORC)
        || (otyp === otypByName('SCR_ENCHANT_WEAPON') && rolePm === PM_MONK)
        || (otyp === otypByName('SPE_FORCE_BOLT') && rolePm === PM_WIZARD)
        || (obj.oclass === SPBOOK_CLASS
            && ((game.objects?.[otyp]?.oc_level ?? 0)
                > (got_level1_spellbook ? 3 : 1)
                || restricted_spell_discipline(otyp)))
        || otyp === otypByName('SPE_NOVEL')
    ) {
        if (++trycnt > 1000) {
            obj = mksobj(otypByName('PANCAKE'), true, false);
            break;
        }
        obj = mkobj(oclass, false);
        otyp = obj.otyp;
    }
    return obj;
}

// C ref: u_init.c ini_inv_obj_substitution()
function ini_inv_obj_substitution(_trop, obj) {
    const racePm = game.urace?.mnum;
    if (racePm == null || racePm === PM_HUMAN) return obj.otyp;
    for (const sub of inv_subs) {
        if (sub.race_pm === racePm && obj.otyp === sub.item_otyp()) {
            obj.otyp = sub.subs_otyp();
            break;
        }
    }
    return obj.otyp;
}

// C ref: u_init.c ini_inv_adjust_obj()
function ini_inv_adjust_obj(trop, obj) {
    let stop = false;
    if (trop.trclass === COIN_CLASS) {
        obj.quan = game.u.umoney0;
    } else {
        if (otyp_uses_known(obj.otyp)) obj.known = 1;
        obj.dknown = obj.bknown = obj.rknown = 1;
        // C: Is_container || STATUE → cknown/lknown; otrapped = 0
        if (Is_container(obj) || objectNames[obj.otyp] === 'STATUE') {
            obj.cknown = obj.lknown = 1;
            obj.otrapped = 0;
        }
        obj.cursed = false;
        if (obj.oclass === WEAPON_CLASS || obj.oclass === TOOL_CLASS) {
            obj.quan = trquan(trop);
            stop = true;
        } else if (obj.oclass === GEM_CLASS && is_graystone(obj)
            && objectNames[obj.otyp] !== 'FLINT') {
            // C: graystone except FLINT → quan 1 (TOUCHSTONE/LUCKSTONE/LOADSTONE)
            obj.quan = 1;
        }
        if (trop.trspe !== UNDEF_SPE) {
            obj.spe = trop.trspe;
            if (objectNames[obj.otyp] === 'MAGIC_MARKER' && obj.spe < 96) {
                obj.spe += rn2(4);
            }
        }
        if (trop.trbless !== UNDEF_BLESS) obj.blessed = !!trop.trbless;
    }
    obj.owt = weight(obj);
    return stop;
}

// C ref: invent.c mergable() — sufficient for Tourist starting kit merges.
function mergable(a, b) {
    if (!a || !b || a.otyp !== b.otyp) return false;
    if ((a.spe | 0) !== (b.spe | 0)) return false;
    if (!!a.blessed !== !!b.blessed || !!a.cursed !== !!b.cursed) return false;
    if ((a.corpsenm ?? -1) !== (b.corpsenm ?? -1)) return false;
    if (!!a.known !== !!b.known) return false;
    if ((a.owornmask | 0) || (b.owornmask | 0)) return false;
    return true;
}

// C ref: invent.c assigninvlet()
function assigninvlet(otmp) {
    if (otmp.oclass === COIN_CLASS) {
        otmp.invlet = GOLD_SYM;
        return;
    }
    const inuse = new Array(invlet_basic).fill(false);
    for (const obj of game.invent || []) {
        if (obj === otmp) continue;
        const i = obj.invlet;
        if (typeof i === 'string' && i.length === 1) {
            const c = i.charCodeAt(0);
            if (c >= 97 && c <= 122) inuse[c - 97] = true;
            else if (c >= 65 && c <= 90) inuse[c - 65 + 26] = true;
        }
    }
    let last = game._lastinvnr ?? 51;
    for (let n = 0; n < invlet_basic; n++) {
        last++;
        if (last >= invlet_basic) last = 0;
        if (!inuse[last]) {
            otmp.invlet = last < 26
                ? String.fromCharCode(97 + last)
                : String.fromCharCode(65 + last - 26);
            game._lastinvnr = last;
            return;
        }
    }
    otmp.invlet = '#';
}

function inv_rank(o) {
    const ilet = o.invlet;
    if (ilet === GOLD_SYM) return -1;
    if (typeof ilet === 'string' && ilet.length === 1)
        return ilet.charCodeAt(0) ^ 0x20; // C: invlet ^ 040
    return 999;
}

// C ref: invent.c reorder_invent()
function reorder_invent() {
    const inv = game.invent;
    if (!inv || inv.length < 2) return;
    let need = true;
    while (need) {
        need = false;
        for (let i = 0; i < inv.length - 1; i++) {
            if (inv_rank(inv[i + 1]) < inv_rank(inv[i])) {
                const t = inv[i];
                inv[i] = inv[i + 1];
                inv[i + 1] = t;
                need = true;
            }
        }
    }
}

// C ref: invent.c addinv()
export function addinv(obj) {
    if (!game.invent) game.invent = [];
    for (const otmp of game.invent) {
        if (mergable(otmp, obj)) {
            otmp.quan = (otmp.quan || 1) + (obj.quan || 1);
            otmp.owt = weight(otmp);
            if (otmp.oclass === COIN_CLASS || objectNames[otmp.otyp] === 'GOLD_PIECE') {
                game._goldCount = (game._goldCount || 0) + (obj.quan || 0);
            }
            return otmp;
        }
    }
    assigninvlet(obj);
    if (obj.oclass === COIN_CLASS) {
        game.invent.unshift(obj);
    } else {
        game.invent.push(obj);
    }
    reorder_invent();
    if (obj.oclass === COIN_CLASS || objectNames[obj.otyp] === 'GOLD_PIECE') {
        game._goldCount = (game._goldCount || 0) + (obj.quan || 0);
    }
    return obj;
}

function is_shirt(obj) {
    return (game.objects?.[obj.otyp]?.oc_skill ?? -1) === ARM_SHIRT;
}

function is_suit(obj) {
    return (game.objects?.[obj.otyp]?.oc_skill ?? -1) === ARM_SUIT;
}

function is_cloak(obj) {
    return (game.objects?.[obj.otyp]?.oc_skill ?? -1) === ARM_CLOAK;
}

function is_shield(obj) {
    return (game.objects?.[obj.otyp]?.oc_skill ?? -1) === ARM_SHIELD;
}

function is_helmet(obj) {
    return obj.oclass === ARMOR_CLASS
        && (game.objects?.[obj.otyp]?.oc_skill ?? -1) === ARM_HELM;
}

function is_gloves(obj) {
    return obj.oclass === ARMOR_CLASS
        && (game.objects?.[obj.otyp]?.oc_skill ?? -1) === ARM_GLOVES;
}

function is_boots(obj) {
    return obj.oclass === ARMOR_CLASS
        && (game.objects?.[obj.otyp]?.oc_skill ?? -1) === ARM_BOOTS;
}

// C ref: obj.h is_graystone() — LUCKSTONE/LOADSTONE/FLINT/TOUCHSTONE
function is_graystone(obj) {
    const n = objectNames[obj.otyp];
    return n === 'LUCKSTONE' || n === 'LOADSTONE'
        || n === 'FLINT' || n === 'TOUCHSTONE';
}

// C ref: obj.h is_pole() — P_POLEARMS / P_LANCE (artifact Snickersnee omitted)
function is_pole_skill(oc_skill) {
    return oc_skill === P_POLEARMS || oc_skill === P_LANCE;
}

// C ref: obj.h is_launcher() — WEAPON with oc_skill in P_BOW..P_CROSSBOW
function is_launcher(obj) {
    if (obj.oclass !== WEAPON_CLASS) return false;
    const sk = game.objects?.[obj.otyp]?.oc_skill ?? 0;
    return sk >= P_BOW && sk <= P_CROSSBOW;
}

// C ref: obj.h is_spear() — WEAPON with oc_skill == P_SPEAR
function is_spear(obj) {
    if (obj.oclass !== WEAPON_CLASS) return false;
    return (game.objects?.[obj.otyp]?.oc_skill ?? 0) === P_SPEAR;
}

// C ref: obj.h is_ammo() — WEAPON/GEM with oc_skill in -P_CROSSBOW..-P_BOW
function is_ammo(obj) {
    if (obj.oclass !== WEAPON_CLASS && obj.oclass !== GEM_CLASS) return false;
    const sk = game.objects?.[obj.otyp]?.oc_skill ?? 0;
    return sk >= -P_CROSSBOW && sk <= -P_BOW;
}

// C ref: obj.h is_missile() — WEAPON/TOOL with oc_skill in -P_BOOMERANG..-P_DART
function is_missile(obj) {
    if (obj.oclass !== WEAPON_CLASS && obj.oclass !== TOOL_CLASS) return false;
    const sk = game.objects?.[obj.otyp]?.oc_skill ?? 0;
    return sk >= -P_BOOMERANG && sk <= -P_DART;
}

function has_descr(otyp) {
    // C: OBJ_DESCR(objects[otyp]) != NULL — uses oc_descr_idx (pre-shuffle
    // for starting invent this equals otyp's own descr slot).
    const oc = game.objects?.[otyp];
    const idx = oc?.oc_descr_idx ?? otyp;
    return objectDescrs[idx] != null;
}

// C ref: u_init.c knows_object()
function knows_object(otyp, _override_pauper) {
    // discover_object(otyp, TRUE, FALSE, FALSE) — known but not encountered
    discover_object(otyp, true, false);
}

// C ref: u_init.c knows_class() — ordinary non-magic objects of a class.
// Rogue keeps dagger-name walk; Barbarian/Knight/Samurai/Valkyrie/Ranger/Monk
// walk bases[] like C (weapons + armor; skip CORNUTHAUM/DUNCE_CAP/SMALL_SHIELD;
// non-Knight/Samurai skip polearms/lances; Ranger: launchers/ammo/spears).
function knows_class(sym) {
    const roleMnum = game.urole?.mnum;
    const objects = game.objects;
    if (!objects) return;

    if (roleMnum === PM_ROGUE) {
        if (sym !== WEAPON_CLASS) return;
        for (const ct of DAGGER_SKILL_OTYPS) {
            const obj = objects[ct];
            if (obj && obj.oc_class === WEAPON_CLASS && !obj.oc_magic)
                knows_object(ct, false);
        }
        return;
    }

    // C callers that walk bases[]: Barbarian, Knight, Monk, Ranger, Samurai,
    // Valkyrie. Only ported roles that call knows_class are enabled here.
    if (roleMnum !== PM_KNIGHT && roleMnum !== PM_SAMURAI
        && roleMnum !== PM_VALKYRIE && roleMnum !== PM_RANGER
        && roleMnum !== PM_MONK && roleMnum !== PM_BARBARIAN) {
        return;
    }

    const bases = game.bases || [];
    const start = bases[sym] || 0;
    const end = bases[sym + 1] || objects.length;
    const skip = new Set([
        otypByName('CORNUTHAUM'),
        otypByName('DUNCE_CAP'),
        otypByName('SMALL_SHIELD'),
    ]);
    for (let ct = start; ct < end; ct++) {
        if (skip.has(ct)) continue;
        const oc = objects[ct];
        if (!oc || oc.oc_class !== sym || oc.oc_magic) continue;
        if (sym === WEAPON_CLASS) {
            // C: only knights and samurai recognize polearms/lances
            if (is_pole_skill(oc.oc_skill ?? P_NONE)
                && roleMnum !== PM_KNIGHT && roleMnum !== PM_SAMURAI) {
                continue;
            }
            // C: rangers know launchers, ammo, and spears only
            if (roleMnum === PM_RANGER) {
                const dummy = { oclass: WEAPON_CLASS, otyp: ct };
                if (!is_launcher(dummy) && !is_ammo(dummy) && !is_spear(dummy))
                    continue;
            }
        }
        knows_object(ct, false);
    }
}

// C ref: u_init.c ini_inv_use_obj()
function ini_inv_use_obj(obj) {
    if (has_descr(obj.otyp) && obj.known)
        discover_object(obj.otyp, true, true);
    // C: OIL_LAMP also discovers POT_OIL
    if (objectNames[obj.otyp] === 'OIL_LAMP')
        discover_object(otypByName('POT_OIL'), true, true);

    if (obj.oclass === ARMOR_CLASS) {
        // C ref: u_init.c ini_inv_use_obj armor wear order
        if (is_shield(obj) && !game.u.uarms) {
            obj.owornmask = (obj.owornmask || 0) | W_ARMS;
            game.u.uarms = obj;
        } else if (is_helmet(obj) && !game.u.uarmh) {
            obj.owornmask = (obj.owornmask || 0) | W_ARMH;
            game.u.uarmh = obj;
        } else if (is_gloves(obj) && !game.u.uarmg) {
            obj.owornmask = (obj.owornmask || 0) | W_ARMG;
            game.u.uarmg = obj;
        } else if (is_shirt(obj) && !game.u.uarmu) {
            obj.owornmask = (obj.owornmask || 0) | W_ARMU;
            game.u.uarmu = obj;
        } else if (is_cloak(obj) && !game.u.uarmc) {
            obj.owornmask = (obj.owornmask || 0) | W_ARMC;
            game.u.uarmc = obj;
        } else if (is_boots(obj) && !game.u.uarmf) {
            obj.owornmask = (obj.owornmask || 0) | W_ARMF;
            game.u.uarmf = obj;
        } else if (is_suit(obj) && !game.u.uarm) {
            obj.owornmask = (obj.owornmask || 0) | W_ARM;
            game.u.uarm = obj;
        }
    }
    if (obj.oclass === WEAPON_CLASS || is_missile(obj)
        || objectNames[obj.otyp] === 'TIN_OPENER'
        || objectNames[obj.otyp] === 'FLINT'
        || objectNames[obj.otyp] === 'ROCK') {
        if (is_ammo(obj) || is_missile(obj)) {
            if (!game.u.uquiver) {
                obj.owornmask = (obj.owornmask || 0) | W_QUIVER;
                game.u.uquiver = obj;
            }
        } else if (!game.u.uwep) {
            obj.owornmask = (obj.owornmask || 0) | W_WEP;
            game.u.uwep = obj;
        } else if (!game.u.uswapwep) {
            obj.owornmask = (obj.owornmask || 0) | W_SWAPWEP;
            game.u.uswapwep = obj;
        }
    }
}

// C ref: do_wear.c find_ac() — base human AC 10; ARM_BONUS via objects[].a_ac
export function find_ac() {
    let uac = 10; // mons[PM_HUMAN].ac
    const pieces = [game.u?.uarm, game.u?.uarmc, game.u?.uarmh, game.u?.uarmf,
        game.u?.uarms, game.u?.uarmg, game.u?.uarmu];
    for (const obj of pieces) {
        if (!obj) continue;
        const a_ac = game.objects?.[obj.otyp]?.a_ac ?? 0;
        uac -= a_ac + (obj.spe || 0);
    }
    if (Math.abs(uac) > 99) uac = Math.sign(uac) * 99;
    if (uac !== game.u.uac) {
        game.u.uac = uac;
    }
}

// C ref: u_init.c ini_inv()
function ini_inv(tropArr) {
    let ti = 0;
    let trop = tropArr[ti];
    let quan = trquan(trop);
    let got_sp1 = false;
    while (trop.trclass) {
        let otyp = typeof trop.trotyp === 'function' ? trop.trotyp() : trop.trotyp;
        let obj;
        if (otyp !== UNDEF_TYP) {
            obj = mksobj(otyp, true, false);
        } else {
            obj = ini_inv_mkobj_filter(trop.trclass, got_sp1);
            otyp = obj.otyp;
            // C: poly / poly-control nocreate wiring (wand before ring before book)
            if (otyp === otypByName('WAN_POLYMORPH')
                || otyp === otypByName('RIN_POLYMORPH')
                || otyp === otypByName('POT_POLYMORPH')) {
                game.nocreate = otypByName('RIN_POLYMORPH_CONTROL');
            } else if (otyp === otypByName('RIN_POLYMORPH_CONTROL')) {
                game.nocreate = otypByName('RIN_POLYMORPH');
                game.nocreate2 = otypByName('SPE_POLYMORPH');
                game.nocreate3 = otypByName('POT_POLYMORPH');
            }
            if (obj.oclass === RING_CLASS || obj.oclass === SPBOOK_CLASS) {
                game.nocreate4 = otyp;
            }
        }
        ini_inv_obj_substitution(trop, obj);
        if (ini_inv_adjust_obj(trop, obj)) quan = 1;
        addinv(obj);
        if (obj.oclass === SPBOOK_CLASS
            && (game.objects?.[obj.otyp]?.oc_level ?? 0) === 1) {
            got_sp1 = true;
        }
        if (--quan) continue;
        ti++;
        trop = tropArr[ti];
        quan = trquan(trop);
    }
}

// C ref: u_init.c u_init_role() — Tourist + Rogue + Wizard + Priest + Knight + Samurai + Healer + Valkyrie + Ranger + Monk + Archeologist + Barbarian + Caveman
function u_init_role() {
    const role = game.urole;
    const mnum = role?.mnum;

    // C: reset nocreate before role kit
    const strange = strangeObject();
    game.nocreate = strange;
    game.nocreate2 = strange;
    game.nocreate3 = strange;
    game.nocreate4 = strange;

    if (mnum === PM_ARCHEOLOGIST) {
        game.u.umoney0 = 0;
        ini_inv(Archeologist);
        if (!rn2(10)) ini_inv(Tinopener);
        else if (!rn2(4)) ini_inv(Lamp);
        else if (!rn2(5)) ini_inv(Magicmarker);
        knows_object(otypByName('SACK'), false);
        knows_object(otypByName('TOUCHSTONE'), false);
        game.nocreate = strange;
        game.nocreate2 = strange;
        game.nocreate3 = strange;
        game.nocreate4 = strange;
        return;
    }
    if (mnum === PM_BARBARIAN) {
        // C: rn2(100) >= 50 → Barbarian_0 else Barbarian_1 (avoid rn2(2) skew)
        game.u.umoney0 = 0;
        if (rn2(100) >= 50) ini_inv(Barbarian_0);
        else ini_inv(Barbarian_1);
        if (!rn2(6)) ini_inv(Lamp);
        knows_class(WEAPON_CLASS); // excludes polearms
        knows_class(ARMOR_CLASS);
        game.nocreate = strange;
        game.nocreate2 = strange;
        game.nocreate3 = strange;
        game.nocreate4 = strange;
        return;
    }
    if (mnum === PM_CAVE_DWELLER) {
        // C: PM_CAVE_DWELLER → ini_inv(Cave_man) only (no knows_class / Lamp)
        game.u.umoney0 = 0;
        ini_inv(Cave_man);
        game.nocreate = strange;
        game.nocreate2 = strange;
        game.nocreate3 = strange;
        game.nocreate4 = strange;
        return;
    }
    if (mnum === PM_TOURIST) {
        game.u.umoney0 = rnd(1000);
        ini_inv(Tourist);
        if (!rn2(25)) ini_inv(Tinopener);
        else if (!rn2(25)) ini_inv(Leash);
        else if (!rn2(25)) ini_inv(Towel);
        else if (!rn2(20)) ini_inv(Magicmarker);
        // C resets nocreate after role switch
        game.nocreate = strange;
        game.nocreate2 = strange;
        game.nocreate3 = strange;
        game.nocreate4 = strange;
        return;
    }
    if (mnum === PM_ROGUE) {
        // C: u.umoney0 = 0; (already cleared in u_init_inventory_attrs)
        game.u.umoney0 = 0;
        ini_inv(Rogue);
        if (!rn2(5)) ini_inv(Blindfold);
        knows_object(otypByName('SACK'), false);
        knows_class(WEAPON_CLASS); // daggers only
        game.nocreate = strange;
        game.nocreate2 = strange;
        game.nocreate3 = strange;
        game.nocreate4 = strange;
        return;
    }
    if (mnum === PM_WIZARD) {
        game.u.umoney0 = 0;
        ini_inv(Wizard);
        if (!rn2(5)) ini_inv(Blindfold);
        game.nocreate = strange;
        game.nocreate2 = strange;
        game.nocreate3 = strange;
        game.nocreate4 = strange;
        return;
    }
    if (mnum === PM_CLERIC) {
        game.u.umoney0 = 0;
        ini_inv(Priest);
        if (!rn2(5)) ini_inv(Magicmarker);
        else if (!rn2(10)) ini_inv(Lamp);
        knows_object(otypByName('POT_WATER'), true);
        game.nocreate = strange;
        game.nocreate2 = strange;
        game.nocreate3 = strange;
        game.nocreate4 = strange;
        return;
    }
    if (mnum === PM_KNIGHT) {
        game.u.umoney0 = 0;
        ini_inv(Knight);
        knows_class(WEAPON_CLASS); // all weapons (incl. polearms)
        knows_class(ARMOR_CLASS);
        // C: HJumping |= FROMOUTSIDE — chess-like mobility
        game.u.HJumping = (game.u.HJumping || 0) | FROMOUTSIDE;
        game.nocreate = strange;
        game.nocreate2 = strange;
        game.nocreate3 = strange;
        game.nocreate4 = strange;
        return;
    }
    if (mnum === PM_SAMURAI) {
        game.u.umoney0 = 0;
        ini_inv(Samurai);
        if (!rn2(5)) ini_inv(Blindfold);
        knows_class(WEAPON_CLASS); // all weapons (incl. polearms)
        knows_class(ARMOR_CLASS);
        // C: pre-discover Japanese_item_name types (skip oc_magic)
        const objects = game.objects || [];
        for (let i = MAXOCLASSES; i < NUM_OBJECTS; i++) {
            if (objects[i]?.oc_magic) continue;
            if (Japanese_item_name(i, null)) knows_object(i, false);
        }
        game.nocreate = strange;
        game.nocreate2 = strange;
        game.nocreate3 = strange;
        game.nocreate4 = strange;
        return;
    }
    if (mnum === PM_HEALER) {
        // C: u.umoney0 = rn1(1000, 1001);
        game.u.umoney0 = rn1(1000, 1001);
        ini_inv(Healer);
        if (!rn2(25)) ini_inv(Lamp);
        knows_object(otypByName('POT_FULL_HEALING'), false);
        game.nocreate = strange;
        game.nocreate2 = strange;
        game.nocreate3 = strange;
        game.nocreate4 = strange;
        return;
    }
    if (mnum === PM_VALKYRIE) {
        game.u.umoney0 = 0;
        ini_inv(Valkyrie);
        if (!rn2(6)) ini_inv(Lamp);
        knows_class(WEAPON_CLASS); // excludes polearms
        knows_class(ARMOR_CLASS);
        game.nocreate = strange;
        game.nocreate2 = strange;
        game.nocreate3 = strange;
        game.nocreate4 = strange;
        return;
    }
    if (mnum === PM_RANGER) {
        game.u.umoney0 = 0;
        ini_inv(Ranger);
        knows_class(WEAPON_CLASS); // bows, arrows, spears only
        game.nocreate = strange;
        game.nocreate2 = strange;
        game.nocreate3 = strange;
        game.nocreate4 = strange;
        return;
    }
    if (mnum === PM_MONK) {
        // C: M_spell[rn2(90) / 30] — Healing / Protection / Confuse Monster
        const M_spell = [Healing_book, Protection_book, Confuse_monster_book];
        game.u.umoney0 = 0;
        ini_inv(Monk);
        ini_inv(M_spell[Math.floor(rn2(90) / 30)]);
        if (!rn2(4)) ini_inv(Magicmarker);
        else if (!rn2(10)) ini_inv(Lamp);
        knows_class(ARMOR_CLASS);
        knows_object(otypByName('SHURIKEN'), false);
        game.nocreate = strange;
        game.nocreate2 = strange;
        game.nocreate3 = strange;
        game.nocreate4 = strange;
        return;
    }
    throw new Error(`u_init_role: role not ported (${role?.name?.m})`);
}

// C ref: u_init.c u_init_race()
function u_init_race() {
    const racePm = game.urace?.mnum;
    const rolePm = game.urole?.mnum;

    switch (racePm) {
    case PM_HUMAN:
        break;

    case PM_ELF: {
        // Elves: non-warrior roles get a non-magic instrument (ROLL_FROM).
        if (rolePm === PM_CLERIC || rolePm === PM_WIZARD) {
            const trotyp = [
                'WOODEN_FLUTE', 'TOOLED_HORN', 'WOODEN_HARP',
                'BELL', 'BUGLE', 'LEATHER_DRUM',
            ].map(otypByName);
            const Instrument = [
                {
                    trotyp: () => trotyp[rn2(trotyp.length)],
                    trspe: 0,
                    trclass: TOOL_CLASS,
                    trquan_min: 1,
                    trquan_max: 1,
                    trbless: 0,
                },
                { trotyp: () => 0, trspe: 0, trclass: 0, trquan_min: 0, trquan_max: 0, trbless: 0 },
            ];
            ini_inv(Instrument);
        }
        knows_object(otypByName('ELVEN_SHORT_SWORD'), false);
        knows_object(otypByName('ELVEN_ARROW'), false);
        knows_object(otypByName('ELVEN_BOW'), false);
        knows_object(otypByName('ELVEN_SPEAR'), false);
        knows_object(otypByName('ELVEN_DAGGER'), false);
        knows_object(otypByName('ELVEN_BROADSWORD'), false);
        knows_object(otypByName('ELVEN_MITHRIL_COAT'), false);
        knows_object(otypByName('ELVEN_LEATHER_HELM'), false);
        knows_object(otypByName('ELVEN_SHIELD'), false);
        knows_object(otypByName('ELVEN_BOOTS'), false);
        knows_object(otypByName('ELVEN_CLOAK'), false);
        break;
    }

    case PM_DWARF:
        knows_object(otypByName('DWARVISH_SPEAR'), false);
        knows_object(otypByName('DWARVISH_SHORT_SWORD'), false);
        knows_object(otypByName('DWARVISH_MATTOCK'), false);
        knows_object(otypByName('DWARVISH_IRON_HELM'), false);
        knows_object(otypByName('DWARVISH_MITHRIL_COAT'), false);
        knows_object(otypByName('DWARVISH_CLOAK'), false);
        knows_object(otypByName('DWARVISH_ROUNDSHIELD'), false);
        break;

    case PM_GNOME:
        break;

    case PM_ORC:
        // Compensate for generally inferior equipment
        if (rolePm !== PM_WIZARD) ini_inv(Xtra_food);
        knows_object(otypByName('ORCISH_SHORT_SWORD'), false);
        knows_object(otypByName('ORCISH_ARROW'), false);
        knows_object(otypByName('ORCISH_BOW'), false);
        knows_object(otypByName('ORCISH_SPEAR'), false);
        knows_object(otypByName('ORCISH_DAGGER'), false);
        knows_object(otypByName('ORCISH_CHAIN_MAIL'), false);
        knows_object(otypByName('ORCISH_RING_MAIL'), false);
        knows_object(otypByName('ORCISH_HELM'), false);
        knows_object(otypByName('ORCISH_SHIELD'), false);
        knows_object(otypByName('URUK_HAI_SHIELD'), false);
        knows_object(otypByName('ORCISH_CLOAK'), false);
        break;

    default:
        break;
    }
}

// C ref: u_init.c u_init_carry_attr_boost() — no RNG on increase path
function u_init_carry_attr_boost() {
    // Stub inv_weight: attrs often match without boost on early starters.
    // When invent weight is ported, loop adjattrib(A_STR/A_CON) like C.
    void A_STR;
    void A_CON;
}

/** Role filecode for quest proto rename (role.c / dungeon.c fixup). */
const ROLE_FILECODE = {
    Archeologist: 'Arc', Barbarian: 'Bar', Caveman: 'Cav', Healer: 'Hea',
    Knight: 'Kni', Monk: 'Mon', Priest: 'Pri', Ranger: 'Ran', Rogue: 'Rog',
    Samurai: 'Sam', Tourist: 'Tou', Valkyrie: 'Val', Wizard: 'Wiz',
};

/**
 * Install role/race tables on game from nethackrc / defaults.
 * Call before init_dungeons (quest filecode) and u_init_inventory_attrs.
 */
export function setup_role_race_from_rc(opts = {}) {
    // Prefer flags from player_selection / rc (C: flags.init* already chosen)
    const fr = game.flags || {};
    let role = (fr.initrole >= 0 && roles[fr.initrole]) ? roles[fr.initrole] : null;
    let race = (fr.initrace >= 0 && races[fr.initrace]) ? races[fr.initrace] : null;
    let align = (fr.initalign >= 0 && aligns[fr.initalign]) ? aligns[fr.initalign] : null;
    if (!role) {
        const roleName = typeof opts.role === 'string' ? opts.role : 'Tourist';
        role = findRole(roleName) || roles.find(r => r.name.m === 'Tourist');
    }
    if (!race) {
        const raceName = typeof opts.race === 'string' ? opts.race : 'human';
        race = findRace(raceName) || races.find(r => r.name === 'human');
    }
    if (!align) {
        const alignName = typeof opts.align === 'string' ? opts.align : 'neutral';
        align = findAlign(alignName) || aligns.find(a => a.name === 'neutral');
    }
    game.urole = {
        name: role.name,
        rank: role.title?.[0] || { m: role.name.m, f: role.name.f },
        mnum: role.mnum,
        petnum: role.petnum ?? NON_PM,
        neminum: role.neminum ?? NON_PM,
        filecode: ROLE_FILECODE[role.name.m] || 'Tou',
        attrbase: role.attrbase,
        attrdist: role.attrdist,
        initrecord: role.initrecord ?? 0,
        xlev: role.xlev ?? 14,
        // Priest starts with null gods; role_init_pantheon fills from randrole
        lgod: role.lgod ?? null,
        ngod: role.ngod ?? null,
        cgod: role.cgod ?? null,
        hpadv: role.hpadv || { infix: 8, inrnd: 0, lofix: 0, lornd: 8, hifix: 0, hirnd: 0 },
        enadv: role.enadv || { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 1 },
    };
    game.urace = {
        name: race.name,
        adj: race.adj,
        noun: race.noun || race.name,
        mnum: race.mnum,
        attrmin: race.attrmin,
        attrmax: race.attrmax,
        hpadv: race.hpadv || { infix: 2, inrnd: 0, lofix: 0, lornd: 2, hifix: 1, hirnd: 0 },
        enadv: race.enadv || { infix: 1, inrnd: 0, lofix: 2, lornd: 0, hifix: 2, hirnd: 0 },
    };
    game.flags = game.flags || {};
    if (fr.initgend === 1 || opts.gender === 'female' || opts.gender === 1)
        game.flags.female = true;
    else if (fr.initgend === 0 || opts.gender === 'male' || opts.gender === 0)
        game.flags.female = false;
    // C: flags.initalign indexes aligns[]
    const alignIdx = aligns.indexOf(align);
    game.flags.initalign = alignIdx >= 0 ? alignIdx : 1;
    if (opts.name) game.plname = opts.name;

    // C ref: role.c role_init() — pantheon (Priest) then nemesis gender
    const initrole = roles.indexOf(role);
    game.flags.initrole = initrole >= 0 ? initrole : 0;
    if (fr.initrace >= 0) game.flags.initrace = fr.initrace;
    if (fr.initgend >= 0) game.flags.initgend = fr.initgend;
    // setup_role_race_from_rc is newgame-only; pantheon always starts unset
    game.flags.pantheon = -1;
    role_init_pantheon();
    role_init_cleric_spe_light();
    role_init_nemesis_gender();
}

// C ref: role.c role_init() pantheon selection (role.c:2064-2083)
function role_init_pantheon() {
    // C: if (flags.pantheon == -1) { new game }
    if (game.flags.pantheon != null && game.flags.pantheon !== -1) {
        // restore path already chose pantheon; still copy gods if missing
    } else {
        let pantheon = game.flags.initrole ?? 0;
        let trycnt = 0;
        // C: while (!roles[flags.pantheon].lgod && ++trycnt < 100)
        while (!roles[pantheon]?.lgod && ++trycnt < 100) {
            // C: randrole(FALSE) → rn2(SIZE(roles)-1); JS has no terminator
            pantheon = rn2(roles.length);
        }
        if (!roles[pantheon]?.lgod) {
            for (let i = 0; i < roles.length; i++) {
                if (roles[i].lgod) {
                    pantheon = i;
                    break;
                }
            }
        }
        game.flags.pantheon = pantheon;
    }
    if (!game.urole.lgod) {
        const src = roles[game.flags.pantheon] || {};
        game.urole.lgod = src.lgod;
        game.urole.ngod = src.ngod;
        game.urole.cgod = src.cgod;
    }
}

// C ref: role.c role_init() — SPE_LIGHT becomes P_CLERIC_SPELL for priests
function role_init_cleric_spe_light() {
    if (game.urole?.mnum !== PM_CLERIC) return;
    const otyp = otypByName('SPE_LIGHT');
    if (otyp && game.objects?.[otyp]) {
        game.objects[otyp].oc_skill = P_CLERIC_SPELL;
    }
}

// C ref: role.c role_init() nemesis gender pick (role.c:2050-2060)
function role_init_nemesis_gender() {
    const neminum = game.urole?.neminum ?? NON_PM;
    if (neminum === NON_PM || neminum == null) return;
    const pm = mons(neminum);
    if (!pm) return;
    if (!game.quest_status) game.quest_status = {};
    // C: is_neuter ? 2 : is_female ? 1 : is_male ? 0 : (rn2(100) < 50)
    game.quest_status.nemgend = is_neuter(pm) ? 2
        : is_female(pm) ? 1
            : is_male(pm) ? 0
                : (rn2(100) < 50 ? 1 : 0);
}

// C ref: u_init.c u_init_misc() — pre-mklev; newhp/newpw at ulevel==0.
export async function u_init_misc() {
    const g = game;
    g.u = g.u || {};
    g.flags = g.flags || {};
    g.flags.beginner = true;

    g.u.uz = { dnum: 0, dlevel: 1 };
    g.u.uz0 = { dnum: 0, dlevel: 0 };
    g.u.utolev = { dnum: 0, dlevel: 1 };

    // C: u.ulevel = 0; newhp()/newpw(); adjabil(0,1); u.ulevel = u.ulevelmax = 1;
    g.u.ulevel = 0;
    const hp = newhp();
    const pw = newpw();
    g.u.uhp = g.u.uhpmax = g.u.uhppeak = hp;
    g.u.uen = g.u.uenmax = g.u.uenpeak = pw;
    await adjabil(0, 1);
    g.u.ulevel = g.u.ulevelmax = 1;

    // C: u.ualignbase[...] = u.ualign.type = aligns[flags.initalign].value
    const alignEnt = aligns[g.flags.initalign] || aligns[1];
    const atype = alignEnt?.value ?? A_NEUTRAL;
    g.u.ualign = { type: atype, record: g.urole?.initrecord ?? 0 };
    g.u.ualignbase = { current: atype, original: atype };

    g.u.uhunger = 900;
    g.u.ublesscnt = 300;
    g.u.nv_range = 1;
    g.u.xray_range = -1;

    // C: u.uhandedness = rn2(10) ? RIGHT_HANDED : LEFT_HANDED;
    g.u.uhandedness = rn2(10) ? RIGHT_HANDED : LEFT_HANDED;
}

// C ref: u_init.c u_init_inventory_attrs()
export async function u_init_inventory_attrs() {
    game.invent = [];
    game._goldCount = 0;
    game._lastinvnr = 51; // C: gl.lastinvnr = 51
    game.disco = new Array((game.objects?.length) || 480).fill(0);
    game.u = game.u || {};
    game.u.umoney0 = 0;
    game.u.uarmu = null;
    game.u.uarm = null;
    game.u.uarmc = null;
    game.u.uarmh = null;
    game.u.uarms = null;
    game.u.uarmg = null;
    game.u.uarmf = null;
    game.u.uquiver = null;
    game.u.uwep = null;
    game.u.uswapwep = null;

    u_init_role();
    u_init_race();

    // C ref: u_init.c — if (discover) ini_inv(Wishing)
    if (game.flags?.explore || game.flags?.discover) ini_inv(Wishing);

    if (game.u.umoney0) ini_inv(Money);

    init_attr(75);
    await vary_init_attr();
    u_init_carry_attr_boost();
}

// C ref: u_init.c u_init_skills_discoveries() — wear/wield/discover; skills stubbed.
export function u_init_skills_discoveries() {
    for (const otmp of game.invent || [])
        ini_inv_use_obj(otmp);
    find_ac();
}
