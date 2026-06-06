// u_init.js -- partial hero initialization RNG/state.
// C ref: u_init.c:u_init_misc(), exper.c:newpw().

import { game } from './gstate.js';
import { rnd, rn2, rn1, rne } from './rng.js';
import { findRole } from './roles.js';
import { mkobj, mksobj } from './mklev.js';
import { OBJECT_CHARGED, OBJECT_CLASS, OBJECT_DESCR, OBJECT_USES_KNOWN } from './object_data.js';
import {
    P_ATTACK_SPELL, P_HEALING_SPELL, P_DIVINATION_SPELL, P_ENCHANTMENT_SPELL,
    P_CLERIC_SPELL, P_ESCAPE_SPELL, P_MATTER_SPELL,
} from './const.js';

const ROLE_INIT = new Map([
    ['Archeologist', {
        attrbase: [7, 10, 10, 7, 7, 7],
        attrmax: [20, 20, 20, 10, 20, 10],
        attrdist: [20, 20, 20, 10, 20, 10],
        hp: 13, pwBase: 2, pwRnd: 0, ac: 0, gold: 0,
    }],
    ['Barbarian', {
        attrbase: [16, 7, 7, 15, 16, 6],
        attrmax: [30, 6, 7, 20, 30, 7],
        attrdist: [30, 6, 7, 20, 30, 7],
        hp: 16, pwBase: 2, pwRnd: 0, ac: 0, gold: 0,
    }],
    ['Caveman', {
        attrbase: [10, 7, 7, 7, 8, 6],
        attrmax: [30, 6, 7, 20, 30, 7],
        attrdist: [30, 6, 7, 20, 30, 7],
        hp: 16, pwBase: 2, pwRnd: 0, ac: 0, gold: 0,
    }],
    ['Healer', {
        attrbase: [7, 7, 13, 7, 11, 16],
        attrmax: [15, 20, 20, 15, 25, 5],
        attrdist: [15, 20, 20, 15, 25, 5],
        hp: 13, pwBase: 1, pwRnd: 4, ac: 0, gold: 1218,
    }],
    ['Knight', {
        attrbase: [13, 7, 14, 8, 10, 17],
        attrmax: [30, 15, 15, 10, 20, 10],
        attrdist: [30, 15, 15, 10, 20, 10],
        hp: 16, pwBase: 2, pwRnd: 4, ac: 0, gold: 0,
    }],
    ['Monk', {
        attrbase: [10, 7, 8, 8, 7, 7],
        attrmax: [25, 10, 20, 20, 15, 10],
        attrdist: [25, 10, 20, 20, 15, 10],
        hp: 14, pwBase: 3, pwRnd: 2, ac: 0, gold: 0,
    }],
    ['Priest', {
        attrbase: [7, 7, 10, 7, 7, 7],
        attrmax: [15, 10, 30, 15, 20, 10],
        attrdist: [15, 10, 30, 15, 20, 10],
        hp: 14, pwBase: 5, pwRnd: 3, ac: 0, gold: 0,
    }],
    ['Rogue', {
        attrbase: [7, 7, 7, 10, 7, 6],
        attrmax: [20, 10, 10, 30, 20, 10],
        attrdist: [20, 10, 10, 30, 20, 10],
        hp: 12, pwBase: 2, pwRnd: 0, ac: 0, gold: 0,
    }],
    ['Ranger', {
        attrbase: [13, 13, 13, 9, 13, 7],
        attrmax: [30, 10, 10, 20, 20, 10],
        attrdist: [30, 10, 10, 20, 20, 10],
        hp: 15, pwBase: 2, pwRnd: 0, ac: 0, gold: 0,
    }],
    ['Samurai', {
        attrbase: [10, 8, 7, 10, 17, 6],
        attrmax: [30, 10, 8, 30, 14, 8],
        attrdist: [30, 10, 8, 30, 14, 8],
        hp: 15, pwBase: 2, pwRnd: 0, ac: 0, gold: 0,
    }],
    ['Tourist', {
        attrbase: [7, 10, 6, 7, 7, 10],
        attrmax: [15, 10, 10, 15, 30, 20],
        attrdist: [15, 10, 10, 15, 30, 20],
        hp: 10, pwBase: 2, pwRnd: 0, ac: 0, gold: 757,
    }],
    ['Valkyrie', {
        attrbase: [10, 7, 7, 7, 10, 7],
        attrmax: [30, 6, 7, 20, 30, 7],
        attrdist: [30, 6, 7, 20, 30, 7],
        hp: 16, pwBase: 2, pwRnd: 0, ac: 0, gold: 0,
    }],
    ['Wizard', {
        attrbase: [7, 10, 7, 7, 7, 7],
        attrmax: [10, 30, 10, 20, 20, 10],
        attrdist: [10, 30, 10, 20, 20, 10],
        hp: 12, pwBase: 5, pwRnd: 3, ac: 0, gold: 0,
    }],
]);

const HUMAN_ATTRMAX = [118, 18, 18, 18, 18, 18];

const LEVEL_ADV = new Map([
    ['Archeologist', {
        xlev: 14,
        hpadv: { infix: 11, inrnd: 0, lofix: 0, lornd: 8, hifix: 1, hirnd: 0 },
        enadv: { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 1 },
    }],
    ['Barbarian', {
        xlev: 10,
        hpadv: { infix: 14, inrnd: 0, lofix: 0, lornd: 10, hifix: 2, hirnd: 0 },
        enadv: { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 1 },
        energyMod: 'barbarian',
    }],
    ['Caveman', {
        xlev: 10,
        hpadv: { infix: 14, inrnd: 0, lofix: 0, lornd: 8, hifix: 2, hirnd: 0 },
        enadv: { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 1 },
    }],
    ['Healer', {
        xlev: 20,
        hpadv: { infix: 11, inrnd: 0, lofix: 0, lornd: 8, hifix: 1, hirnd: 0 },
        enadv: { infix: 1, inrnd: 4, lofix: 0, lornd: 1, hifix: 0, hirnd: 2 },
        energyMod: 'healer',
    }],
    ['Knight', {
        xlev: 10,
        hpadv: { infix: 14, inrnd: 0, lofix: 0, lornd: 8, hifix: 2, hirnd: 0 },
        enadv: { infix: 1, inrnd: 4, lofix: 0, lornd: 1, hifix: 0, hirnd: 2 },
        energyMod: 'knight',
    }],
    ['Monk', {
        xlev: 10,
        hpadv: { infix: 12, inrnd: 0, lofix: 0, lornd: 8, hifix: 1, hirnd: 0 },
        enadv: { infix: 2, inrnd: 2, lofix: 0, lornd: 2, hifix: 0, hirnd: 2 },
    }],
    ['Priest', {
        xlev: 10,
        hpadv: { infix: 12, inrnd: 0, lofix: 0, lornd: 8, hifix: 1, hirnd: 0 },
        enadv: { infix: 4, inrnd: 3, lofix: 0, lornd: 2, hifix: 0, hirnd: 2 },
    }],
    ['Ranger', {
        xlev: 10,
        hpadv: { infix: 13, inrnd: 0, lofix: 0, lornd: 6, hifix: 1, hirnd: 0 },
        enadv: { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 1 },
    }],
    ['Rogue', {
        xlev: 11,
        hpadv: { infix: 10, inrnd: 0, lofix: 0, lornd: 8, hifix: 1, hirnd: 0 },
        enadv: { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 1 },
    }],
    ['Samurai', {
        xlev: 11,
        hpadv: { infix: 13, inrnd: 0, lofix: 0, lornd: 8, hifix: 1, hirnd: 0 },
        enadv: { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 1 },
    }],
    ['Tourist', {
        xlev: 14,
        hpadv: { infix: 8, inrnd: 0, lofix: 0, lornd: 8, hifix: 0, hirnd: 0 },
        enadv: { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 1 },
    }],
    ['Wizard', {
        xlev: 12,
        hpadv: { infix: 10, inrnd: 0, lofix: 0, lornd: 8, hifix: 1, hirnd: 0 },
        enadv: { infix: 4, inrnd: 3, lofix: 0, lornd: 2, hifix: 0, hirnd: 3 },
        energyMod: 'wizard',
    }],
    ['Valkyrie', {
        xlev: 10,
        hpadv: { infix: 14, inrnd: 0, lofix: 0, lornd: 8, hifix: 2, hirnd: 0 },
        enadv: { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 1 },
        energyMod: 'valkyrie',
    }],
]);

const RACE_LEVEL_ADV = new Map([
    ['human', {
        attrmax: HUMAN_ATTRMAX,
        hpadv: { infix: 2, inrnd: 0, lofix: 0, lornd: 2, hifix: 1, hirnd: 0 },
        enadv: { infix: 1, inrnd: 0, lofix: 2, lornd: 0, hifix: 2, hirnd: 0 },
    }],
    ['elf', {
        attrmax: [18, 20, 20, 18, 16, 18],
        hpadv: { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 1, hirnd: 0 },
        enadv: { infix: 2, inrnd: 0, lofix: 3, lornd: 0, hifix: 3, hirnd: 0 },
    }],
    ['dwarf', {
        attrmax: [118, 16, 16, 20, 20, 16],
        hpadv: { infix: 4, inrnd: 0, lofix: 0, lornd: 3, hifix: 2, hirnd: 0 },
        enadv: { infix: 0, inrnd: 0, lofix: 0, lornd: 0, hifix: 0, hirnd: 0 },
    }],
    ['gnome', {
        attrmax: [68, 19, 18, 18, 18, 18],
        hpadv: { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 0 },
        enadv: { infix: 2, inrnd: 0, lofix: 2, lornd: 0, hifix: 2, hirnd: 0 },
    }],
    ['orc', {
        attrmax: [68, 16, 16, 18, 18, 16],
        hpadv: { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 0 },
        enadv: { infix: 1, inrnd: 0, lofix: 1, lornd: 0, hifix: 1, hirnd: 0 },
    }],
]);

const UNDEF_TYP = 0;
const UNDEF_SPE = 0x7f;
const UNDEF_BLESS = 2;

const WEAPON_CLASS = 2;
const ARMOR_CLASS = 3;
const RING_CLASS = 4;
const TOOL_CLASS = 6;
const FOOD_CLASS = 7;
const POTION_CLASS = 8;
const SCROLL_CLASS = 9;
const SPBOOK_CLASS = 10;
const WAND_CLASS = 11;
const COIN_CLASS = 12;
const GEM_CLASS = 13;

const GOLD_PIECE = 438;
const ARROW = 18;
const ELVEN_ARROW = 19;
const ORCISH_ARROW = 20;
const SILVER_ARROW = 21;
const YA = 22;
const CROSSBOW_BOLT = 23;
const DART = 24;
const SHURIKEN = 25;
const BOOMERANG = 26;
const SPEAR = 27;
const DAGGER = 34;
const ELVEN_DAGGER = 35;
const ORCISH_DAGGER = 36;
const SILVER_DAGGER = 37;
const ATHAME = 38;
const STILETTO = 41;
const WORM_TOOTH = 42;
const CRYSKNIFE = 43;
const KNIFE = 40;
const ELVEN_SPEAR = 28;
const ORCISH_SPEAR = 29;
const DWARVISH_SPEAR = 30;
const SILVER_SPEAR = 31;
const JAVELIN = 32;
const TRIDENT = 33;
const AXE = 44;
const BATTLE_AXE = 45;
const SHORT_SWORD = 46;
const ELVEN_SHORT_SWORD = 47;
const ORCISH_SHORT_SWORD = 48;
const DWARVISH_SHORT_SWORD = 49;
const SCIMITAR = 50;
const SILVER_SABER = 51;
const BROADSWORD = 52;
const ELVEN_BROADSWORD = 53;
const LONG_SWORD = 54;
const TWO_HANDED_SWORD = 55;
const KATANA = 56;
const TSURUGI = 57;
const RUNESWORD = 58;
const PARTISAN = 59;
const RANSEUR = 60;
const SPETUM = 61;
const GLAIVE = 62;
const HALBERD = 63;
const BARDICHE = 64;
const VOULGE = 65;
const FAUCHARD = 66;
const GUISARME = 67;
const BILL_GUISARME = 68;
const LUCERN_HAMMER = 69;
const BEC_DE_CORBIN = 70;
const DWARVISH_MATTOCK = 71;
const LANCE = 72;
const MACE = 73;
const SILVER_MACE = 74;
const MORNING_STAR = 75;
const WAR_HAMMER = 76;
const CLUB = 77;
const RUBBER_HOSE = 78;
const QUARTERSTAFF = 79;
const AKLYS = 80;
const FLAIL = 81;
const BULLWHIP = 82;
const FEDORA = 92;
const LEATHER_JACKET = 135;
const BOW = 83;
const ELVEN_BOW = 84;
const ORCISH_BOW = 85;
const YUMI = 86;
const SLING = 87;
const CROSSBOW = 88;
const ELVEN_LEATHER_HELM = 89;
const ORCISH_HELM = 90;
const DWARVISH_IRON_HELM = 91;
const HELMET = 97;
const PLATE_MAIL = 121;
const SPLINT_MAIL = 124;
const ELVEN_MITHRIL_COAT = 127;
const CHAIN_MAIL = 128;
const ORCISH_CHAIN_MAIL = 129;
const RING_MAIL = 132;
const ORCISH_RING_MAIL = 133;
const GRAY_DRAGON_SCALE_MAIL = 101;
const SILVER_DRAGON_SCALE_MAIL = 103;
const HAWAIIAN_SHIRT = 136;
const LEATHER_ARMOR = 134;
const ELVEN_CLOAK = 139;
const ORCISH_CLOAK = 140;
const DWARVISH_CLOAK = 141;
const ROBE = 143;
const OILSKIN_CLOAK = 145;
const CLOAK_OF_PROTECTION = 146;
const CLOAK_OF_MAGIC_RESISTANCE = 148;
const CLOAK_OF_DISPLACEMENT = 149;
const SMALL_SHIELD = 150;
const SHIELD_OF_DRAIN_RESISTANCE = 151;
const SHIELD_OF_SHOCK_RESISTANCE = 152;
const ELVEN_SHIELD = 153;
const URUK_HAI_SHIELD = 154;
const ORCISH_SHIELD = 155;
const LARGE_SHIELD = 156;
const DWARVISH_ROUNDSHIELD = 157;
const SHIELD_OF_REFLECTION = 158;
const SCALPEL = 39;
const LEATHER_GLOVES = 159;
const GAUNTLETS_OF_POWER = 161;
const GAUNTLETS_OF_DEXTERITY = 162;
const LOW_BOOTS = 163;
const IRON_SHOES = 164;
const HIGH_BOOTS = 165;
const SPEED_BOOTS = 166;
const ELVEN_BOOTS = 169;
const LEVITATION_BOOTS = 172;
const LARGE_BOX = 214;
const BAG_OF_TRICKS = 220;
const BLINDFOLD = 233;
const CREDIT_CARD = 223;
const EXPENSIVE_CAMERA = 229;
const LOCK_PICK = 222;
const TOWEL = 234;
const LEASH = 236;
const STETHOSCOPE = 237;
const TINNING_KIT = 238;
const TIN_OPENER = 239;
const SACK = 217;
const OIL_LAMP = 227;
const MAGIC_MARKER = 242;
const WOODEN_FLUTE = 247;
const TOOLED_HORN = 249;
const WOODEN_HARP = 253;
const BELL = 255;
const BUGLE = 256;
const LEATHER_DRUM = 257;
const PICK_AXE = 259;
const SPE_FORCE_BOLT = 383;
const SPE_CONFUSE_MONSTER = 377;
const SPE_PROTECTION = 403;
const APPLE = 277;
const ORANGE = 278;
const CARROT = 282;
const SPRIG_OF_WOLFSBANE = 283;
const CLOVE_OF_GARLIC = 284;
const FORTUNE_COOKIE = 289;
const TRIPE_RATION = 264;
const LEMBAS_WAFER = 291;
const CRAM_RATION = 292;
const FOOD_RATION = 293;
const RIN_LEVITATION = 183;
const RIN_HUNGER = 184;
const RIN_AGGRAVATE_MONSTER = 185;
const RIN_POLYMORPH = 196;
const RIN_POLYMORPH_CONTROL = 197;
const POT_HALLUCINATION = 304;
const POT_HEALING = 307;
const POT_EXTRA_HEALING = 308;
const POT_FULL_HEALING = 315;
const POT_POLYMORPH = 316;
const POT_SICKNESS = 318;
const POT_ACID = 320;
const POT_WATER = 322;
const STATUE = 476;
const SCR_ENCHANT_WEAPON = 328;
const SCR_MAGIC_MAPPING = 337;
const SCR_AMNESIA = 338;
const SCR_FIRE = 339;
const SCR_BLANK_PAPER = 365;
const SPE_POLYMORPH = 399;
const SPE_BLANK_PAPER = 407;
const SPE_HEALING = 374;
const SPE_EXTRA_HEALING = 391;
const SPE_STONE_TO_FLESH = 405;
const SPE_NOVEL = 408;
const WAN_WISHING = 414;
const WAN_NOTHING = 416;
const WAN_POLYMORPH = 422;
const WAN_SLEEP = 432;
const TOUCHSTONE = 472;
const FLINT = 473;
const ROCK = 474;

const SPELLBOOK_LEVEL = new Map([
    [366, 5], [367, 2], [368, 4], [369, 4], [370, 3], [371, 7],
    [372, 1], [373, 1], [374, 1], [375, 1], [376, 1], [377, 1],
    [378, 2], [379, 2], [380, 2], [381, 2], [382, 2], [383, 2],
    [384, 3], [385, 3], [386, 3], [387, 5], [388, 3], [389, 3],
    [390, 4], [391, 3], [392, 4], [393, 4], [394, 4], [395, 3],
    [396, 5], [397, 3], [398, 6], [399, 6], [400, 6], [401, 6],
    [402, 7], [403, 1], [404, 1], [405, 3], [406, 2], [407, 0],
]);

const SPELLBOOK_SKILL = new Map([
    [366, P_MATTER_SPELL], [367, P_ATTACK_SPELL], [368, P_ATTACK_SPELL],
    [369, P_ATTACK_SPELL], [370, P_ENCHANTMENT_SPELL], [371, P_ATTACK_SPELL],
    [372, P_DIVINATION_SPELL], [373, P_DIVINATION_SPELL], [374, P_HEALING_SPELL],
    [375, P_MATTER_SPELL], [376, P_ATTACK_SPELL], [377, P_ENCHANTMENT_SPELL],
    [378, P_HEALING_SPELL], [379, P_ATTACK_SPELL], [380, P_ENCHANTMENT_SPELL],
    [381, P_MATTER_SPELL], [382, P_CLERIC_SPELL], [383, P_ATTACK_SPELL],
    [384, P_ENCHANTMENT_SPELL], [385, P_DIVINATION_SPELL], [386, P_HEALING_SPELL],
    [387, P_ENCHANTMENT_SPELL], [388, P_ESCAPE_SPELL], [389, P_DIVINATION_SPELL],
    [390, P_ESCAPE_SPELL], [391, P_HEALING_SPELL], [392, P_HEALING_SPELL],
    [393, P_ESCAPE_SPELL], [394, P_DIVINATION_SPELL], [395, P_CLERIC_SPELL],
    [396, P_DIVINATION_SPELL], [397, P_DIVINATION_SPELL], [398, P_CLERIC_SPELL],
    [399, P_MATTER_SPELL], [400, P_ESCAPE_SPELL], [401, P_CLERIC_SPELL],
    [402, P_MATTER_SPELL], [403, P_CLERIC_SPELL], [404, P_ESCAPE_SPELL],
    [405, P_HEALING_SPELL], [406, P_ATTACK_SPELL],
]);

const ROLE_ALLOWED_STARTING_SPELL_SKILLS = new Map([
    // C ref: src/u_init.c:restricted_spell_discipline(), Skill_P[].
    ['Priest', new Set([P_HEALING_SPELL, P_DIVINATION_SPELL, P_CLERIC_SPELL])],
]);

const WIZARD_INVENTORY = [
    { typ: QUARTERSTAFF, spe: 1, cls: WEAPON_CLASS, min: 1, max: 1, bless: 1, wielded: true },
    { typ: CLOAK_OF_MAGIC_RESISTANCE, spe: 0, cls: ARMOR_CLASS, min: 1, max: 1, bless: UNDEF_BLESS, worn: true },
    { typ: UNDEF_TYP, spe: UNDEF_SPE, cls: WAND_CLASS, min: 1, max: 1, bless: UNDEF_BLESS },
    { typ: UNDEF_TYP, spe: UNDEF_SPE, cls: RING_CLASS, min: 2, max: 2, bless: UNDEF_BLESS },
    { typ: UNDEF_TYP, spe: UNDEF_SPE, cls: POTION_CLASS, min: 3, max: 3, bless: UNDEF_BLESS },
    { typ: UNDEF_TYP, spe: UNDEF_SPE, cls: SCROLL_CLASS, min: 3, max: 3, bless: UNDEF_BLESS },
    { typ: SPE_FORCE_BOLT, spe: 0, cls: SPBOOK_CLASS, min: 1, max: 1, bless: 1 },
    { typ: UNDEF_TYP, spe: UNDEF_SPE, cls: SPBOOK_CLASS, min: 1, max: 1, bless: UNDEF_BLESS },
    { typ: MAGIC_MARKER, spe: 19, cls: TOOL_CLASS, min: 1, max: 1, bless: 0 },
];

const ARCHEOLOGIST_INVENTORY = [
    // C ref: src/u_init.c:Archeologist[].
    { typ: BULLWHIP, spe: 2, cls: WEAPON_CLASS, min: 1, max: 1, bless: UNDEF_BLESS, wielded: true },
    { typ: LEATHER_JACKET, spe: 0, cls: ARMOR_CLASS, min: 1, max: 1, bless: UNDEF_BLESS, worn: true },
    { typ: FEDORA, spe: 0, cls: ARMOR_CLASS, min: 1, max: 1, bless: UNDEF_BLESS, worn: true },
    { typ: FOOD_RATION, spe: 0, cls: FOOD_CLASS, min: 3, max: 3, bless: 0 },
    { typ: PICK_AXE, spe: UNDEF_SPE, cls: TOOL_CLASS, min: 1, max: 1, bless: UNDEF_BLESS },
    { typ: TINNING_KIT, spe: UNDEF_SPE, cls: TOOL_CLASS, min: 1, max: 1, bless: UNDEF_BLESS },
    { typ: TOUCHSTONE, spe: 0, cls: GEM_CLASS, min: 1, max: 1, bless: 0 },
    { typ: SACK, spe: 0, cls: TOOL_CLASS, min: 1, max: 1, bless: 0 },
];

const BARBARIAN_0_INVENTORY = [
    // C ref: src/u_init.c:Barbarian_0[].
    { typ: TWO_HANDED_SWORD, spe: 0, cls: WEAPON_CLASS, min: 1, max: 1, bless: UNDEF_BLESS, wielded: true },
    { typ: AXE, spe: 0, cls: WEAPON_CLASS, min: 1, max: 1, bless: UNDEF_BLESS, alternate: true },
    { typ: RING_MAIL, spe: 0, cls: ARMOR_CLASS, min: 1, max: 1, bless: UNDEF_BLESS, worn: true },
    { typ: FOOD_RATION, spe: 0, cls: FOOD_CLASS, min: 1, max: 1, bless: 0 },
];

const BARBARIAN_1_INVENTORY = [
    // C ref: src/u_init.c:Barbarian_1[].
    { typ: BATTLE_AXE, spe: 0, cls: WEAPON_CLASS, min: 1, max: 1, bless: UNDEF_BLESS, wielded: true },
    { typ: SHORT_SWORD, spe: 0, cls: WEAPON_CLASS, min: 1, max: 1, bless: UNDEF_BLESS, alternate: true },
    { typ: RING_MAIL, spe: 0, cls: ARMOR_CLASS, min: 1, max: 1, bless: UNDEF_BLESS, worn: true },
    { typ: FOOD_RATION, spe: 0, cls: FOOD_CLASS, min: 1, max: 1, bless: 0 },
];

const CAVEMAN_INVENTORY = [
    // C ref: src/u_init.c:Cave_man[].
    { typ: CLUB, spe: 1, cls: WEAPON_CLASS, min: 1, max: 1, bless: UNDEF_BLESS, wielded: true },
    { typ: SLING, spe: 2, cls: WEAPON_CLASS, min: 1, max: 1, bless: UNDEF_BLESS, alternate: true },
    { typ: FLINT, spe: 0, cls: GEM_CLASS, min: 10, max: 20, bless: UNDEF_BLESS },
    { typ: ROCK, spe: 0, cls: GEM_CLASS, min: 3, max: 3, bless: 0 },
    { typ: LEATHER_ARMOR, spe: 0, cls: ARMOR_CLASS, min: 1, max: 1, bless: UNDEF_BLESS, worn: true },
];

const HEALER_INVENTORY = [
    { typ: SCALPEL, spe: 0, cls: WEAPON_CLASS, min: 1, max: 1, bless: UNDEF_BLESS, wielded: true },
    { typ: LEATHER_GLOVES, spe: 1, cls: ARMOR_CLASS, min: 1, max: 1, bless: UNDEF_BLESS, worn: true },
    { typ: STETHOSCOPE, spe: 0, cls: TOOL_CLASS, min: 1, max: 1, bless: 0 },
    { typ: POT_HEALING, spe: 0, cls: POTION_CLASS, min: 4, max: 4, bless: UNDEF_BLESS },
    { typ: POT_EXTRA_HEALING, spe: 0, cls: POTION_CLASS, min: 4, max: 4, bless: UNDEF_BLESS },
    { typ: WAN_SLEEP, spe: UNDEF_SPE, cls: WAND_CLASS, min: 1, max: 1, bless: UNDEF_BLESS },
    { typ: SPE_HEALING, spe: 0, cls: SPBOOK_CLASS, min: 1, max: 1, bless: 1 },
    { typ: SPE_EXTRA_HEALING, spe: 0, cls: SPBOOK_CLASS, min: 1, max: 1, bless: 1 },
    { typ: SPE_STONE_TO_FLESH, spe: 0, cls: SPBOOK_CLASS, min: 1, max: 1, bless: 1 },
    { typ: APPLE, spe: 0, cls: FOOD_CLASS, min: 5, max: 5, bless: 0 },
];

const KNIGHT_INVENTORY = [
    // C ref: src/u_init.c:Knight[].
    { typ: LONG_SWORD, spe: 1, cls: WEAPON_CLASS, min: 1, max: 1, bless: UNDEF_BLESS, wielded: true },
    { typ: LANCE, spe: 1, cls: WEAPON_CLASS, min: 1, max: 1, bless: UNDEF_BLESS, alternate: true },
    { typ: RING_MAIL, spe: 1, cls: ARMOR_CLASS, min: 1, max: 1, bless: UNDEF_BLESS, worn: true },
    { typ: HELMET, spe: 0, cls: ARMOR_CLASS, min: 1, max: 1, bless: UNDEF_BLESS, worn: true },
    { typ: SMALL_SHIELD, spe: 0, cls: ARMOR_CLASS, min: 1, max: 1, bless: UNDEF_BLESS, worn: true },
    { typ: LEATHER_GLOVES, spe: 0, cls: ARMOR_CLASS, min: 1, max: 1, bless: UNDEF_BLESS, worn: true },
    { typ: APPLE, spe: 0, cls: FOOD_CLASS, min: 10, max: 10, bless: 0 },
    { typ: CARROT, spe: 0, cls: FOOD_CLASS, min: 10, max: 10, bless: 0 },
];

const MONK_INVENTORY = [
    // C ref: src/u_init.c:Monk[].
    { typ: LEATHER_GLOVES, spe: 2, cls: ARMOR_CLASS, min: 1, max: 1, bless: UNDEF_BLESS, worn: true },
    { typ: ROBE, spe: 1, cls: ARMOR_CLASS, min: 1, max: 1, bless: UNDEF_BLESS, worn: true },
    { typ: UNDEF_TYP, spe: UNDEF_SPE, cls: SCROLL_CLASS, min: 1, max: 1, bless: UNDEF_BLESS },
    { typ: POT_HEALING, spe: 0, cls: POTION_CLASS, min: 3, max: 3, bless: UNDEF_BLESS },
    { typ: FOOD_RATION, spe: 0, cls: FOOD_CLASS, min: 3, max: 3, bless: 0 },
    { typ: APPLE, spe: 0, cls: FOOD_CLASS, min: 5, max: 5, bless: UNDEF_BLESS },
    { typ: ORANGE, spe: 0, cls: FOOD_CLASS, min: 5, max: 5, bless: UNDEF_BLESS },
    { typ: FORTUNE_COOKIE, spe: 0, cls: FOOD_CLASS, min: 3, max: 3, bless: UNDEF_BLESS },
];

const MONK_STARTING_SPELLBOOKS = [
    // C ref: src/u_init.c:u_init_role() -> M_spell[].
    { typ: SPE_HEALING, spe: 0, cls: SPBOOK_CLASS, min: 1, max: 1, bless: 1 },
    { typ: SPE_PROTECTION, spe: 0, cls: SPBOOK_CLASS, min: 1, max: 1, bless: 1 },
    { typ: SPE_CONFUSE_MONSTER, spe: 0, cls: SPBOOK_CLASS, min: 1, max: 1, bless: 1 },
];

const PRIEST_INVENTORY = [
    // C ref: src/u_init.c:Priest[].
    { typ: MACE, spe: 1, cls: WEAPON_CLASS, min: 1, max: 1, bless: 1, wielded: true },
    { typ: ROBE, spe: 0, cls: ARMOR_CLASS, min: 1, max: 1, bless: UNDEF_BLESS, worn: true },
    { typ: SMALL_SHIELD, spe: 0, cls: ARMOR_CLASS, min: 1, max: 1, bless: UNDEF_BLESS, worn: true },
    { typ: POT_WATER, spe: 0, cls: POTION_CLASS, min: 4, max: 4, bless: 1 },
    { typ: CLOVE_OF_GARLIC, spe: 0, cls: FOOD_CLASS, min: 1, max: 1, bless: 0 },
    { typ: SPRIG_OF_WOLFSBANE, spe: 0, cls: FOOD_CLASS, min: 1, max: 1, bless: 0 },
    { typ: UNDEF_TYP, spe: UNDEF_SPE, cls: SPBOOK_CLASS, min: 2, max: 2, bless: UNDEF_BLESS },
];

const TOURIST_INVENTORY = [
    { typ: DART, spe: 2, cls: WEAPON_CLASS, min: 21, max: 40, bless: UNDEF_BLESS },
    { typ: UNDEF_TYP, spe: UNDEF_SPE, cls: FOOD_CLASS, min: 10, max: 10, bless: 0 },
    { typ: POT_EXTRA_HEALING, spe: 0, cls: POTION_CLASS, min: 2, max: 2, bless: UNDEF_BLESS },
    { typ: SCR_MAGIC_MAPPING, spe: 0, cls: SCROLL_CLASS, min: 4, max: 4, bless: UNDEF_BLESS },
    { typ: HAWAIIAN_SHIRT, spe: 0, cls: ARMOR_CLASS, min: 1, max: 1, bless: UNDEF_BLESS, worn: true },
    { typ: EXPENSIVE_CAMERA, spe: UNDEF_SPE, cls: TOOL_CLASS, min: 1, max: 1, bless: 0 },
    { typ: CREDIT_CARD, spe: 0, cls: TOOL_CLASS, min: 1, max: 1, bless: 0 },
];

const VALKYRIE_INVENTORY = [
    { typ: SPEAR, spe: 1, cls: WEAPON_CLASS, min: 1, max: 1, bless: UNDEF_BLESS, wielded: true },
    { typ: DAGGER, spe: 0, cls: WEAPON_CLASS, min: 1, max: 1, bless: UNDEF_BLESS, alternate: true },
    { typ: SMALL_SHIELD, spe: 3, cls: ARMOR_CLASS, min: 1, max: 1, bless: UNDEF_BLESS, worn: true },
    { typ: FOOD_RATION, spe: 0, cls: FOOD_CLASS, min: 1, max: 1, bless: 0 },
];

const MONEY_INVENTORY = [
    { typ: GOLD_PIECE, spe: 0, cls: COIN_CLASS, min: 1, max: 1, bless: 0 },
];

const WISHING_INVENTORY = [
    { typ: WAN_WISHING, spe: 3, cls: WAND_CLASS, min: 1, max: 1, bless: 0 },
];

const BLINDFOLD_INVENTORY = [
    { typ: BLINDFOLD, spe: 0, cls: TOOL_CLASS, min: 1, max: 1, bless: 0 },
];

const XTRA_FOOD_INVENTORY = [
    { typ: UNDEF_TYP, spe: UNDEF_SPE, cls: FOOD_CLASS, min: 2, max: 2, bless: 0 },
];

const TIN_OPENER_INVENTORY = [
    { typ: TIN_OPENER, spe: 0, cls: TOOL_CLASS, min: 1, max: 1, bless: 0 },
];

const LEASH_INVENTORY = [
    { typ: LEASH, spe: 0, cls: TOOL_CLASS, min: 1, max: 1, bless: 0 },
];

const TOWEL_INVENTORY = [
    { typ: TOWEL, spe: 0, cls: TOOL_CLASS, min: 1, max: 1, bless: 0 },
];

const MAGIC_MARKER_INVENTORY = [
    { typ: MAGIC_MARKER, spe: 19, cls: TOOL_CLASS, min: 1, max: 1, bless: 0 },
];

const LAMP_INVENTORY = [
    { typ: OIL_LAMP, spe: 1, cls: TOOL_CLASS, min: 1, max: 1, bless: 0 },
];

const RANGER_INVENTORY = [
    { typ: DAGGER, spe: 1, cls: WEAPON_CLASS, min: 1, max: 1, bless: UNDEF_BLESS, wielded: true },
    { typ: BOW, spe: 1, cls: WEAPON_CLASS, min: 1, max: 1, bless: UNDEF_BLESS, alternate: true },
    { typ: ARROW, spe: 2, cls: WEAPON_CLASS, min: 50, max: 59, bless: UNDEF_BLESS, quivered: true },
    { typ: ARROW, spe: 0, cls: WEAPON_CLASS, min: 30, max: 39, bless: UNDEF_BLESS },
    { typ: CLOAK_OF_DISPLACEMENT, spe: 2, cls: ARMOR_CLASS, min: 1, max: 1, bless: UNDEF_BLESS, worn: true },
    { typ: CRAM_RATION, spe: 0, cls: FOOD_CLASS, min: 4, max: 4, bless: 0 },
];

const ROGUE_INVENTORY = [
    { typ: SHORT_SWORD, spe: 0, cls: WEAPON_CLASS, min: 1, max: 1, bless: UNDEF_BLESS, wielded: true },
    { typ: DAGGER, spe: 0, cls: WEAPON_CLASS, min: 6, max: 15, bless: 0, alternate: true },
    { typ: LEATHER_ARMOR, spe: 1, cls: ARMOR_CLASS, min: 1, max: 1, bless: UNDEF_BLESS, worn: true },
    { typ: POT_SICKNESS, spe: 0, cls: POTION_CLASS, min: 1, max: 1, bless: 0 },
    { typ: LOCK_PICK, spe: 0, cls: TOOL_CLASS, min: 1, max: 1, bless: 0 },
    { typ: SACK, spe: 0, cls: TOOL_CLASS, min: 1, max: 1, bless: 0 },
];

const SAMURAI_INVENTORY = [
    // C ref: src/u_init.c:Samurai[].
    { typ: KATANA, spe: 0, cls: WEAPON_CLASS, min: 1, max: 1, bless: UNDEF_BLESS, wielded: true },
    { typ: SHORT_SWORD, spe: 0, cls: WEAPON_CLASS, min: 1, max: 1, bless: UNDEF_BLESS, alternate: true },
    { typ: YUMI, spe: 0, cls: WEAPON_CLASS, min: 1, max: 1, bless: UNDEF_BLESS },
    { typ: YA, spe: 0, cls: WEAPON_CLASS, min: 26, max: 45, bless: UNDEF_BLESS, quivered: true },
    { typ: SPLINT_MAIL, spe: 0, cls: ARMOR_CLASS, min: 1, max: 1, bless: UNDEF_BLESS, worn: true },
];

const RANGER_KNOWN_WEAPONS = [
    ELVEN_ARROW, ORCISH_ARROW, YA,
    ELVEN_SPEAR, ORCISH_SPEAR, DWARVISH_SPEAR,
    JAVELIN, ELVEN_BOW, ORCISH_BOW, YUMI,
];

const ROGUE_KNOWN_WEAPONS = [
    ELVEN_DAGGER, ORCISH_DAGGER,
];

const VALKYRIE_KNOWN_WEAPONS = [
    // C ref: u_init.c:knows_class(WEAPON_CLASS), excluding polearms for
    // non-Knight/non-Samurai roles. Discovery output only shows types with
    // descriptions, but order still follows objects[].
    ELVEN_ARROW, ORCISH_ARROW, YA, SHURIKEN,
    ELVEN_SPEAR, ORCISH_SPEAR, DWARVISH_SPEAR, JAVELIN,
    ELVEN_DAGGER, ORCISH_DAGGER, BATTLE_AXE,
    ELVEN_SHORT_SWORD, ORCISH_SHORT_SWORD, DWARVISH_SHORT_SWORD,
    SCIMITAR, ELVEN_BROADSWORD, KATANA, TSURUGI,
    RUNESWORD, DWARVISH_MATTOCK,
];

const SAMURAI_KNOWN_WEAPONS = [
    // C ref: src/u_init.c:u_init_role() -> knows_class(WEAPON_CLASS).
    ELVEN_ARROW, ORCISH_ARROW, YA, SHURIKEN,
    ELVEN_SPEAR, ORCISH_SPEAR, DWARVISH_SPEAR, JAVELIN,
    ELVEN_DAGGER, ORCISH_DAGGER, KNIFE, BATTLE_AXE,
    SHORT_SWORD, ELVEN_SHORT_SWORD, ORCISH_SHORT_SWORD, DWARVISH_SHORT_SWORD,
    SCIMITAR, BROADSWORD, ELVEN_BROADSWORD, KATANA, TSURUGI,
    RUNESWORD, DWARVISH_MATTOCK,
];

const SAMURAI_KNOWN_ARMOR = [
    // C ref: src/u_init.c:u_init_role() -> knows_class(ARMOR_CLASS).
    PLATE_MAIL, SPLINT_MAIL, LEATHER_GLOVES,
];

const STARTING_QUIVER_WEAPONS = new Set([
    ARROW, ELVEN_ARROW, ORCISH_ARROW, SILVER_ARROW, YA, CROSSBOW_BOLT,
    DART, SHURIKEN, BOOMERANG, FLINT, ROCK,
]);
const STARTING_WEAPON_TOOLS = new Set([PICK_AXE]);
const STARTING_THROWN_STONES = new Set([FLINT, ROCK]);

const KNIGHT_KNOWN_WEAPONS = [
    // C ref: src/u_init.c:u_init_role() -> knows_class(WEAPON_CLASS).
    // Knights know all ordinary weapons, including polearms.
    ARROW, ELVEN_ARROW, ORCISH_ARROW, SILVER_ARROW, YA, CROSSBOW_BOLT,
    DART, SHURIKEN, BOOMERANG,
    SPEAR, ELVEN_SPEAR, ORCISH_SPEAR, DWARVISH_SPEAR, SILVER_SPEAR,
    JAVELIN, TRIDENT,
    DAGGER, ELVEN_DAGGER, ORCISH_DAGGER, SILVER_DAGGER, ATHAME,
    SCALPEL, KNIFE, STILETTO, WORM_TOOTH, CRYSKNIFE, AXE, BATTLE_AXE,
    SHORT_SWORD, ELVEN_SHORT_SWORD, ORCISH_SHORT_SWORD, DWARVISH_SHORT_SWORD,
    SCIMITAR, SILVER_SABER, BROADSWORD, ELVEN_BROADSWORD, LONG_SWORD,
    TWO_HANDED_SWORD, KATANA, TSURUGI, RUNESWORD,
    PARTISAN, RANSEUR, SPETUM, GLAIVE, HALBERD, BARDICHE, VOULGE,
    FAUCHARD, GUISARME, BILL_GUISARME, LUCERN_HAMMER, BEC_DE_CORBIN,
    DWARVISH_MATTOCK, LANCE, MACE, SILVER_MACE, MORNING_STAR, WAR_HAMMER,
    CLUB, RUBBER_HOSE, QUARTERSTAFF, AKLYS, FLAIL, BULLWHIP,
    BOW, ELVEN_BOW, ORCISH_BOW, YUMI, SLING, CROSSBOW,
];

const KNIGHT_KNOWN_ARMOR = [
    // C ref: src/u_init.c:u_init_role() -> knows_class(ARMOR_CLASS).
    // Small shields, cornuthaums, and dunce caps are intentionally excluded by
    // C's ambiguous-appearance filter; the latter two are not modeled here.
    ELVEN_LEATHER_HELM, ORCISH_HELM, DWARVISH_IRON_HELM, HELMET,
    PLATE_MAIL, SPLINT_MAIL, ELVEN_MITHRIL_COAT, CHAIN_MAIL,
    ORCISH_CHAIN_MAIL, RING_MAIL, ORCISH_RING_MAIL, HAWAIIAN_SHIRT,
    LEATHER_ARMOR, ORCISH_CLOAK, DWARVISH_CLOAK, ROBE, OILSKIN_CLOAK,
    ELVEN_SHIELD, URUK_HAI_SHIELD, ORCISH_SHIELD, LARGE_SHIELD,
    DWARVISH_ROUNDSHIELD, LEATHER_GLOVES, LOW_BOOTS, IRON_SHOES, HIGH_BOOTS,
];

const ORC_KNOWN_OBJECTS = [
    // C ref: src/u_init.c:u_init_race().
    ORCISH_SHORT_SWORD, ORCISH_ARROW, ORCISH_BOW, ORCISH_SPEAR,
    ORCISH_DAGGER, ORCISH_CHAIN_MAIL, ORCISH_RING_MAIL, ORCISH_HELM,
    ORCISH_SHIELD, URUK_HAI_SHIELD, ORCISH_CLOAK,
];

const ELF_KNOWN_OBJECTS = [
    // C ref: src/u_init.c:u_init_race().
    ELVEN_SHORT_SWORD, ELVEN_ARROW, ELVEN_BOW, ELVEN_SPEAR,
    ELVEN_DAGGER, ELVEN_BROADSWORD, ELVEN_MITHRIL_COAT,
    ELVEN_LEATHER_HELM, ELVEN_SHIELD, ELVEN_BOOTS, ELVEN_CLOAK,
];

const ELF_INSTRUMENT_TYPES = [
    WOODEN_FLUTE, TOOLED_HORN, WOODEN_HARP, BELL, BUGLE, LEATHER_DRUM,
];

const INFRAVISION_RACES = new Set(['elf', 'dwarf', 'gnome', 'orc']);

const RACE_INVENTORY_SUBSTITUTIONS = new Map([
    // C ref: src/u_init.c:ini_inv_obj_substitution().
    ['elf', new Map([
        [DAGGER, ELVEN_DAGGER],
        [SPEAR, ELVEN_SPEAR],
        [SHORT_SWORD, ELVEN_SHORT_SWORD],
        [BOW, ELVEN_BOW],
        [ARROW, ELVEN_ARROW],
        [HELMET, ELVEN_LEATHER_HELM],
        [CLOAK_OF_DISPLACEMENT, ELVEN_CLOAK],
        [CRAM_RATION, LEMBAS_WAFER],
    ])],
    ['orc', new Map([
        [DAGGER, ORCISH_DAGGER],
        [SPEAR, ORCISH_SPEAR],
        [SHORT_SWORD, ORCISH_SHORT_SWORD],
        [BOW, ORCISH_BOW],
        [ARROW, ORCISH_ARROW],
        [HELMET, ORCISH_HELM],
        [SMALL_SHIELD, ORCISH_SHIELD],
        [RING_MAIL, ORCISH_RING_MAIL],
        [CHAIN_MAIL, ORCISH_CHAIN_MAIL],
        [CRAM_RATION, TRIPE_RATION],
        [LEMBAS_WAFER, TRIPE_RATION],
    ])],
    ['dwarf', new Map([
        [SPEAR, DWARVISH_SPEAR],
        [SHORT_SWORD, DWARVISH_SHORT_SWORD],
        [HELMET, DWARVISH_IRON_HELM],
    ])],
]);

function trquan(trop) {
    if (!trop.min) return 1;
    return trop.min + rn2(trop.max - trop.min + 1);
}

function starting_spell_level(otyp) {
    if (otyp === SPE_FORCE_BOLT) return 1;
    return SPELLBOOK_LEVEL.get(otyp) ?? 0;
}

function restricted_starting_spell_discipline(otyp, roleName) {
    const allowed = ROLE_ALLOWED_STARTING_SPELL_SKILLS.get(roleName);
    if (!allowed) return false;
    const skill = SPELLBOOK_SKILL.get(otyp);
    return skill != null && !allowed.has(skill);
}

function rejected_starting_object(obj, noCreate, gotLevel1Spellbook, roleName) {
    const otyp = obj?.otyp;
    if (otyp == null) return false;
    if (otyp === WAN_WISHING || otyp === noCreate.nocreate
        || otyp === noCreate.nocreate2 || otyp === noCreate.nocreate3
        || otyp === noCreate.nocreate4 || otyp === RIN_LEVITATION
        || otyp === POT_HALLUCINATION || otyp === POT_ACID
        || otyp === SCR_AMNESIA || otyp === SCR_FIRE
        || otyp === SCR_BLANK_PAPER || otyp === SPE_BLANK_PAPER
        || otyp === RIN_AGGRAVATE_MONSTER || otyp === RIN_HUNGER
        || otyp === WAN_NOTHING || otyp === SPE_NOVEL) {
        return true;
    }
    if (roleName === 'Monk' && otyp === SCR_ENCHANT_WEAPON) return true;
    if (roleName === 'Wizard' && otyp === SPE_FORCE_BOLT) return true;
    if (obj.oclass === SPBOOK_CLASS) {
        const maxLevel = gotLevel1Spellbook ? 3 : 1;
        return starting_spell_level(otyp) > maxLevel
            || restricted_starting_spell_discipline(otyp, roleName);
    }
    return false;
}

function ini_inv_mkobj_filter(oclass, gotLevel1Spellbook, noCreate, roleName) {
    // C ref: u_init.c:ini_inv_mkobj_filter().
    let obj = mkobj(oclass, false);
    let trycnt = 0;
    while (rejected_starting_object(obj, noCreate, gotLevel1Spellbook, roleName)) {
        if (++trycnt > 1000) return obj;
        obj = mkobj(oclass, false);
    }
    return obj;
}

function learn_initial_spell(obj) {
    // C ref: u_init.c:ini_inv_use_obj() -> spell.c:initialspell().
    if (obj?.oclass !== SPBOOK_CLASS || obj.otyp === SPE_BLANK_PAPER) return;
    const known = game.knownSpells || (game.knownSpells = []);
    if (!known.some((spell) => spell.otyp === obj.otyp)) known.push({ otyp: obj.otyp });
}

function sameObjField(a, b, field, fallback = null) {
    return (a?.[field] ?? fallback) === (b?.[field] ?? fallback);
}

function stackableInventoryClass(oclass) {
    return oclass === FOOD_CLASS || oclass === POTION_CLASS || oclass === SCROLL_CLASS
        || oclass === COIN_CLASS || oclass === GEM_CLASS;
}

export function mergeable_inventory_object(into, obj) {
    if (!into || !obj || into === obj) return false;
    if (into.otyp !== obj.otyp || into.oclass !== obj.oclass) return false;
    if (!stackableInventoryClass(obj.oclass)) return false;
    if (!!into.blessed !== !!obj.blessed || !!into.cursed !== !!obj.cursed) return false;
    if (!sameObjField(into, obj, 'spe', 0)) return false;
    if (!sameObjField(into, obj, 'corpsenm', null)) return false;
    if (!sameObjField(into, obj, 'appearanceName', null)) return false;
    if (!sameObjField(into, obj, 'opoisoned', false)) return false;
    if (!sameObjField(into, obj, 'oeroded', 0) || !sameObjField(into, obj, 'oeroded2', 0)) return false;
    if (!sameObjField(into, obj, 'greased', false)) return false;
    if ((into.wornSide || into.owornmask) || (obj.wornSide || obj.owornmask)) return false;
    return true;
}

export function merge_inventory_object(obj) {
    game.inventory = game.inventory || [];
    const target = game.inventory.find((into) => mergeable_inventory_object(into, obj));
    if (!target) return null;
    target.quan = (target.quan || 1) + (obj.quan || 1);
    return target;
}

export function add_inventory_object(obj) {
    const target = merge_inventory_object(obj);
    if (target) return target;
    // C ref: src/invent.c:assigninvlet(), reorder_invent().  Gold uses '$',
    // which sorts before lettered inventory and is scanned first by systems
    // that walk gi.invent directly, such as dogmove.c:dog_goal().
    if (obj.oclass === COIN_CLASS) {
        game.inventory.unshift(obj);
        return obj;
    }
    game.inventory.push(obj);
    return obj;
}

function discover_starting_object(obj) {
    // C ref: src/u_init.c:ini_inv_use_obj().  Startup discoveries are the
    // object types with OBJ_DESCR() whose carried instance is known.
    if (!obj?.known || typeof obj.otyp !== 'number' || !OBJECT_DESCR[obj.otyp]) return;
    const pending = Array.isArray(game._startingObjectDiscoveries)
        ? game._startingObjectDiscoveries
        : (game._startingObjectDiscoveries = []);
    pending.push(obj.otyp);
}

function flush_starting_object_discoveries() {
    const pending = Array.isArray(game._startingObjectDiscoveries)
        ? game._startingObjectDiscoveries
        : [];
    const order = Array.isArray(game.discoveryOrder)
        ? game.discoveryOrder
        : (game.discoveryOrder = []);
    game.discoveredObjects = game.discoveredObjects || new Set();
    game.encounteredObjects = game.encounteredObjects || new Set();
    for (const otyp of pending) {
        if (!Number.isInteger(otyp)) continue;
        if (!order.includes(otyp)) order.push(otyp);
        if (typeof game.discoveredObjects.add === 'function') game.discoveredObjects.add(otyp);
        if (typeof game.encounteredObjects.add === 'function') game.encounteredObjects.add(otyp);
    }
    game._startingObjectDiscoveries = [];
}

function discover_role_known_object(otyp) {
    if (!Number.isInteger(otyp)) return;
    const order = Array.isArray(game.discoveryOrder)
        ? game.discoveryOrder
        : (game.discoveryOrder = []);
    if (!order.includes(otyp)) order.push(otyp);
    game.discoveredObjects = game.discoveredObjects || new Set();
    if (typeof game.discoveredObjects.add === 'function') game.discoveredObjects.add(otyp);
}

function reorder_samurai_known_discoveries() {
    // C ref: src/u_init.c:u_init_role() -> knows_class(); discovery output
    // follows object-table order for the pre-known classes, not ini_inv order.
    const known = [...SAMURAI_KNOWN_WEAPONS, ...SAMURAI_KNOWN_ARMOR, FOOD_RATION];
    const knownSet = new Set(known);
    const order = Array.isArray(game.discoveryOrder) ? game.discoveryOrder : [];
    const rest = order.filter((otyp) => !knownSet.has(otyp));
    game.discoveryOrder = [...known, ...rest];
}

function is_container_type(otyp) {
    return otyp >= LARGE_BOX && otyp <= BAG_OF_TRICKS;
}

function currentRaceName() {
    return String(game.urace?.name || game._nhopts?.race || 'human').toLowerCase();
}

function substitute_initial_inventory_object(obj) {
    const replacement = RACE_INVENTORY_SUBSTITUTIONS.get(currentRaceName())?.get(obj?.otyp);
    if (!replacement) return;
    obj.otyp = replacement;
    obj.oclass = OBJECT_CLASS[obj.otyp] || obj.oclass;
}

function ini_inv_adjust_obj(trop, obj) {
    let stop = false;
    if (trop.cls === COIN_CLASS) {
        obj.quan = game._goldCount || 0;
        obj.invlet = '$';
        return false;
    }
    obj.cursed = false;
    // C ref: src/u_init.c:ini_inv_adjust_obj().  mksobj()/unknow_object()
    // has already set known for !oc_uses_known types; startup sets it for
    // the remaining types whose full description uses obj->known.
    if (OBJECT_USES_KNOWN[obj.otyp]) obj.known = true;
    obj.dknown = true;
    obj.bknown = true;
    obj.rknown = true;
    if (is_container_type(obj.otyp) || obj.otyp === STATUE) {
        obj.cknown = true;
        obj.lknown = true;
        obj.otrapped = false;
    }
    discover_starting_object(obj);
    if (obj.oclass === WEAPON_CLASS || obj.oclass === TOOL_CLASS) {
        obj.quan = trquan(trop);
        stop = true;
    }
    if (trop.spe !== UNDEF_SPE) {
        obj.spe = trop.spe;
        if (trop.typ === MAGIC_MARKER && obj.spe < 96) obj.spe += rn2(4);
    } else if (obj.oclass === RING_CLASS && OBJECT_CHARGED[obj.otyp] && (obj.spe || 0) <= 0) {
        obj.spe = rne(3);
    }
    if (trop.bless !== UNDEF_BLESS) obj.blessed = !!trop.bless;
    return stop;
}

function apply_starting_worn_extrinsic(obj) {
    if (!obj?.worn) return;
    game.u.uprops = game.u.uprops || {};
    // C refs: u_init.c:ini_inv_use_obj(), worn.c:setworn().
    // Initial worn armor grants extrinsics, but initial_don suppresses the
    // follow-up Cloak_on()/toggle_displacement() message.
    if (obj.otyp === CLOAK_OF_DISPLACEMENT) game.u.uprops.displaced = true;
    if (obj.otyp === CLOAK_OF_MAGIC_RESISTANCE) game.u.uprops.magic_resistance = true;
}

function apply_starting_weapon_use(obj) {
    // C ref: src/u_init.c:ini_inv_use_obj().  Starting missile/ammo stacks
    // fill the quiver before ordinary weapons and weapon-tools are used.
    const weaponLike = obj?.oclass === WEAPON_CLASS
        || (obj?.oclass === TOOL_CLASS && STARTING_WEAPON_TOOLS.has(obj.otyp))
        || STARTING_THROWN_STONES.has(obj?.otyp);
    if (!weaponLike) return;
    if (obj.wielded || obj.alternate || obj.quivered) return;
    if (STARTING_QUIVER_WEAPONS.has(obj.otyp)) {
        if (!(game.inventory || []).some((item) => item?.quivered)) obj.quivered = true;
    } else if (!(game.inventory || []).some((item) => item?.wielded)) {
        obj.wielded = true;
    } else if (!(game.inventory || []).some((item) => item?.alternate)) {
        obj.alternate = true;
    }
}

function armor_base_bonus(obj) {
    switch (obj?.otyp) {
    case GRAY_DRAGON_SCALE_MAIL:
    case SILVER_DRAGON_SCALE_MAIL:
        return 9;
    case SPLINT_MAIL:
        return 6;
    case CHAIN_MAIL:
        return 5;
    case RING_MAIL:
        return 3;
    case ORCISH_RING_MAIL:
        return 2;
    case CLOAK_OF_PROTECTION:
        return 3;
    case LEATHER_ARMOR:
    case ROBE:
        return 2;
    case ELVEN_LEATHER_HELM:
    case ORCISH_HELM:
    case DWARVISH_IRON_HELM:
    case HELMET:
    case CLOAK_OF_MAGIC_RESISTANCE:
    case CLOAK_OF_DISPLACEMENT:
    case LEATHER_JACKET:
    case LEATHER_GLOVES:
    case GAUNTLETS_OF_POWER:
    case GAUNTLETS_OF_DEXTERITY:
    case SMALL_SHIELD:
    case SHIELD_OF_DRAIN_RESISTANCE:
    case SHIELD_OF_SHOCK_RESISTANCE:
    case URUK_HAI_SHIELD:
    case ORCISH_SHIELD:
        return 1;
    case ELVEN_SHIELD:
    case LARGE_SHIELD:
    case DWARVISH_ROUNDSHIELD:
    case SHIELD_OF_REFLECTION:
        return 2;
    default:
        if (obj?.otyp >= SPEED_BOOTS && obj.otyp <= LEVITATION_BOOTS) return 1;
        return 0;
    }
}

function armor_bonus(obj) {
    if (!obj?.worn && !obj?.owornmask) return 0;
    const base = armor_base_bonus(obj);
    const erosion = Math.max(obj.oeroded ?? 0, obj.oeroded2 ?? 0);
    // C ref: include/hack.h:ARM_BONUS(), do_wear.c:find_ac().
    return base + (obj.spe || 0) - Math.min(erosion, base);
}

export function calculated_armor_class() {
    let uac = 10;
    for (const obj of game.inventory || []) {
        if (obj?.oclass === ARMOR_CLASS) uac -= armor_bonus(obj);
    }
    return Math.max(-99, Math.min(99, uac));
}

function ini_inv(trobs, noCreate, roleName) {
    if (!trobs.length) return;
    game.inventory = game.inventory || [];
    let idx = 0;
    let quan = trquan(trobs[idx]);
    let gotLevel1Spellbook = false;
    while (idx < trobs.length) {
        const trop = trobs[idx];
        let obj;
        if (trop.typ !== UNDEF_TYP) {
            obj = mksobj(trop.typ, true, false);
        } else {
            obj = ini_inv_mkobj_filter(trop.cls, gotLevel1Spellbook, noCreate, roleName);
            switch (obj.otyp) {
            case WAN_POLYMORPH:
            case RIN_POLYMORPH:
            case POT_POLYMORPH:
                noCreate.nocreate = RIN_POLYMORPH_CONTROL;
                break;
            case RIN_POLYMORPH_CONTROL:
                noCreate.nocreate = RIN_POLYMORPH;
                noCreate.nocreate2 = SPE_POLYMORPH;
                noCreate.nocreate3 = POT_POLYMORPH;
                break;
            }
            if (obj.oclass === RING_CLASS || obj.oclass === SPBOOK_CLASS) {
                noCreate.nocreate4 = obj.otyp;
            }
        }
        substitute_initial_inventory_object(obj);
        if (ini_inv_adjust_obj(trop, obj)) quan = 1;
        const invObj = add_inventory_object(obj);
        if (trop.wielded) invObj.wielded = true;
        if (trop.alternate) invObj.alternate = true;
        if (trop.quivered) invObj.quivered = true;
        if (trop.worn) invObj.worn = true;
        apply_starting_worn_extrinsic(invObj);
        apply_starting_weapon_use(invObj);
        learn_initial_spell(invObj);
        if (invObj.oclass === SPBOOK_CLASS && starting_spell_level(invObj.otyp) === 1) {
            gotLevel1Spellbook = true;
        }
        if (--quan) continue;
        idx++;
        if (idx < trobs.length) quan = trquan(trobs[idx]);
    }
}

function reset_no_create(noCreate) {
    noCreate.nocreate = UNDEF_TYP;
    noCreate.nocreate2 = UNDEF_TYP;
    noCreate.nocreate3 = UNDEF_TYP;
    noCreate.nocreate4 = UNDEF_TYP;
}

function u_init_race_inventory(noCreate, roleName) {
    // C ref: src/u_init.c:u_init_race().
    const race = currentRaceName();
    if (race === 'elf') {
        if (roleName === 'Priest' || roleName === 'Wizard') {
            const typ = ELF_INSTRUMENT_TYPES[rn2(ELF_INSTRUMENT_TYPES.length)];
            ini_inv([{ typ, spe: 0, cls: TOOL_CLASS, min: 1, max: 1, bless: 0 }], noCreate, roleName);
        }
        for (const otyp of ELF_KNOWN_OBJECTS) discover_role_known_object(otyp);
        return;
    }
    if (race !== 'orc') return;
    if (roleName !== 'Wizard') ini_inv(XTRA_FOOD_INVENTORY, noCreate, roleName);
    for (const otyp of ORC_KNOWN_OBJECTS) discover_role_known_object(otyp);
}

export function u_init_role_inventory() {
    const role = findRole(game._nhopts?.role) || game.urole;
    let roleStartingGold = 0;
    const noCreate = {
        nocreate: UNDEF_TYP,
        nocreate2: UNDEF_TYP,
        nocreate3: UNDEF_TYP,
        nocreate4: UNDEF_TYP,
    };
    if (role?.name?.m === 'Archeologist') {
        ini_inv(ARCHEOLOGIST_INVENTORY, noCreate, role.name.m);
        // C ref: src/u_init.c:u_init_role(). Archeologists get at most one of
        // tin opener, lamp, or magic marker through this ordered gate chain.
        if (!rn2(10)) {
            ini_inv(TIN_OPENER_INVENTORY, noCreate, role.name.m);
        } else if (!rn2(4)) {
            ini_inv(LAMP_INVENTORY, noCreate, role.name.m);
        } else if (!rn2(5)) {
            ini_inv(MAGIC_MARKER_INVENTORY, noCreate, role.name.m);
        }
        discover_role_known_object(SACK);
        discover_role_known_object(TOUCHSTONE);
    } else if (role?.name?.m === 'Barbarian') {
        ini_inv(rn2(100) >= 50 ? BARBARIAN_0_INVENTORY : BARBARIAN_1_INVENTORY,
            noCreate, role.name.m);
        if (!rn2(6)) {
            ini_inv(LAMP_INVENTORY, noCreate, role.name.m);
        }
        // C ref: src/u_init.c:u_init_role() -> knows_class(WEAPON_CLASS),
        // excluding polearms for non-Knight/non-Samurai roles.
        for (const otyp of VALKYRIE_KNOWN_WEAPONS) discover_role_known_object(otyp);
        for (const otyp of KNIGHT_KNOWN_ARMOR) discover_role_known_object(otyp);
    } else if (role?.name?.m === 'Caveman') {
        ini_inv(CAVEMAN_INVENTORY, noCreate, role.name.m);
    } else if (role?.name?.m === 'Healer') {
        game._goldCount = rn1(1000, 1001);
        game._startupRoleGoldInitialized = true;
        roleStartingGold = game._goldCount;
        // C ref: u_init.c:u_init_role(); Healers pre-know full healing
        // before initial inventory side effects mark carried potions seen.
        game.discoveryOrder = Array.isArray(game.discoveryOrder) ? game.discoveryOrder : [];
        if (!game.discoveryOrder.includes(POT_FULL_HEALING)) game.discoveryOrder.push(POT_FULL_HEALING);
        game.discoveredObjects = game.discoveredObjects || new Set();
        game.discoveredObjects.add(POT_FULL_HEALING);
        ini_inv(HEALER_INVENTORY, noCreate, role.name.m);
        if (!rn2(25)) {
            // C may add an oil lamp here; object creation is still unported.
        }
    } else if (role?.name?.m === 'Knight') {
        ini_inv(KNIGHT_INVENTORY, noCreate, role.name.m);
        for (const otyp of KNIGHT_KNOWN_WEAPONS) discover_role_known_object(otyp);
        for (const otyp of KNIGHT_KNOWN_ARMOR) discover_role_known_object(otyp);
    } else if (role?.name?.m === 'Monk') {
        ini_inv(MONK_INVENTORY, noCreate, role.name.m);
        ini_inv([MONK_STARTING_SPELLBOOKS[Math.trunc(rn2(90) / 30)]], noCreate, role.name.m);
        if (!rn2(4)) {
            ini_inv(MAGIC_MARKER_INVENTORY, noCreate, role.name.m);
        } else if (!rn2(10)) {
            ini_inv(LAMP_INVENTORY, noCreate, role.name.m);
        }
        for (const otyp of KNIGHT_KNOWN_ARMOR) discover_role_known_object(otyp);
        discover_role_known_object(SHURIKEN);
    } else if (role?.name?.m === 'Priest') {
        ini_inv(PRIEST_INVENTORY, noCreate, role.name.m);
        if (!rn2(5)) {
            ini_inv(MAGIC_MARKER_INVENTORY, noCreate, role.name.m);
        } else if (!rn2(10)) {
            ini_inv(LAMP_INVENTORY, noCreate, role.name.m);
        }
        discover_role_known_object(POT_WATER);
    } else if (role?.name?.m === 'Tourist') {
        game._goldCount = rnd(1000);
        game._startupRoleGoldInitialized = true;
        roleStartingGold = game._goldCount;
        ini_inv(TOURIST_INVENTORY, noCreate, role.name.m);
        if (!rn2(25)) {
            ini_inv(TIN_OPENER_INVENTORY, noCreate, role.name.m);
        } else if (!rn2(25)) {
            ini_inv(LEASH_INVENTORY, noCreate, role.name.m);
        } else if (!rn2(25)) {
            ini_inv(TOWEL_INVENTORY, noCreate, role.name.m);
        } else if (!rn2(20)) {
            ini_inv(MAGIC_MARKER_INVENTORY, noCreate, role.name.m);
        }
    } else if (role?.name?.m === 'Wizard') {
        ini_inv(WIZARD_INVENTORY, noCreate, role.name.m);
        if (!rn2(5)) {
            ini_inv(BLINDFOLD_INVENTORY, noCreate, role.name.m);
        }
    } else if (role?.name?.m === 'Valkyrie') {
        ini_inv(VALKYRIE_INVENTORY, noCreate, role.name.m);
        if (!rn2(6)) {
            ini_inv(LAMP_INVENTORY, noCreate, role.name.m);
        }
        for (const otyp of VALKYRIE_KNOWN_WEAPONS) discover_role_known_object(otyp);
    } else if (role?.name?.m === 'Ranger') {
        ini_inv(RANGER_INVENTORY, noCreate, role.name.m);
        // C ref: u_init.c:u_init_role() -> knows_class(WEAPON_CLASS).
        // Rangers know launchers, ammo, and spears, but those types have not
        // been encountered yet, so the discoveries menu marks them with '*'.
        for (const otyp of RANGER_KNOWN_WEAPONS) discover_role_known_object(otyp);
    } else if (role?.name?.m === 'Rogue') {
        ini_inv(ROGUE_INVENTORY, noCreate, role.name.m);
        if (!rn2(5)) {
            ini_inv(BLINDFOLD_INVENTORY, noCreate, role.name.m);
        }
        // C ref: u_init.c:u_init_role() -> knows_class(WEAPON_CLASS).
        // Rogues know dagger appearances even before encountering those
        // object types, so discoveries marks them with '*'.
        for (const otyp of ROGUE_KNOWN_WEAPONS) discover_role_known_object(otyp);
    } else if (role?.name?.m === 'Samurai') {
        ini_inv(SAMURAI_INVENTORY, noCreate, role.name.m);
        if (!rn2(5)) {
            ini_inv(BLINDFOLD_INVENTORY, noCreate, role.name.m);
        }
        for (const otyp of SAMURAI_KNOWN_WEAPONS) discover_role_known_object(otyp);
        for (const otyp of SAMURAI_KNOWN_ARMOR) discover_role_known_object(otyp);
        discover_role_known_object(FOOD_RATION);
        reorder_samurai_known_discoveries();
    }
    reset_no_create(noCreate);
    u_init_race_inventory(noCreate, role?.name?.m);
    if (game.flags?.explore) {
        // C ref: u_init.c:u_init_inventory_attrs().  Explore/discovery mode
        // grants a starting wand of wishing before startup money/attributes.
        ini_inv(WISHING_INVENTORY, noCreate, role?.name?.m);
    }
    if (roleStartingGold > 0) {
        game._initialGoldCount = roleStartingGold;
        ini_inv(MONEY_INVENTORY, noCreate, role?.name?.m);
    }
    // C ref: src/u_init.c:u_init_skills_discoveries().  Starting inventory
    // is added to discoveries after role and race pre-knowledge.
    flush_starting_object_discoveries();
}

export function u_init_misc_rng() {
    const role = roleLevelAdv();
    const race = raceLevelAdv();
    const fallbackRole = findRole(game._nhopts?.role);
    const init = ROLE_INIT.get(fallbackRole?.name?.m);
    if (role && race) {
        // C refs: src/u_init.c:u_init_misc(), src/attrib.c:newhp(),
        // src/exper.c:newpw(); level-0 HP/Pw combine role and race advances.
        game._initialHp = initialHitPoints(role, race);
        game._initialPower = initialPower(role, race);
    } else {
        game._initialHp = init?.hp ?? 10;
        let fallbackPower = init?.pwBase ?? 2;
        if ((init?.pwRnd ?? 0) > 0) fallbackPower += rnd(init.pwRnd);
        game._initialPower = fallbackPower;
    }
    if (game.u) {
        // C ref: src/u_init.c:u_init_misc().  All heroes start with range-1
        // night vision and no x-ray vision.
        game.u.nv_range = 1;
        game.u.xray_range = -1;
        game.u.uhandedness = rn2(10) ? 'right' : 'left';
    }
}

function rndAttr(init) {
    let x = rn2(100);
    for (let i = 0; i < init.attrdist.length; i++) {
        x -= init.attrdist[i];
        if (x < 0) return i;
    }
    return init.attrdist.length;
}

function redist(attrs, maxes, init, np, addition) {
    let tryct = 0;
    const adj = addition ? 1 : -1;
    while ((addition ? np > 0 : np < 0) && tryct < 100) {
        const i = rndAttr(init);
        if (i >= attrs.length || (addition ? attrs[i] >= init.attrmax[i] : attrs[i] <= 3)) {
            tryct++;
            continue;
        }
        tryct = 0;
        attrs[i] += adj;
        maxes[i] += adj;
        np -= adj;
    }
    return np;
}

function varyInitAttr(attrs, maxes, limits) {
    for (let i = 0; i < attrs.length; i++) {
        if (!rn2(20)) {
            const xd = rn2(7) - 2;
            attrs[i] += xd;
            if (xd > 0 && attrs[i] > maxes[i]) {
                maxes[i] = Math.min(limits[i], attrs[i]);
                attrs[i] = maxes[i];
            } else if (xd < 0) {
                attrs[i] = Math.max(3, attrs[i]);
                if (attrs[i] < maxes[i]) maxes[i] = attrs[i];
            }
        }
    }
}

function initialAttributes(init) {
    const attrs = init.attrbase.slice();
    const maxes = init.attrbase.slice();
    // C ref: include/attrib.h:ATTRMAX(); initial redistribution is bounded
    // by race maxima, not by the role's attribute distribution weights.
    const limits = raceLevelAdv()?.attrmax || HUMAN_ATTRMAX;
    let np = 75 - attrs.reduce((a, b) => a + b, 0);
    const redistInit = { ...init, attrmax: limits };
    np = redist(attrs, maxes, redistInit, np, true);
    redist(attrs, maxes, redistInit, np, false);
    varyInitAttr(attrs, maxes, limits);
    return { attrs, maxes, limits };
}

export function apply_startup_role_state() {
    const role = findRole(game._nhopts?.role);
    const init = ROLE_INIT.get(role?.name?.m);
    if (!init) return;
    const { attrs, maxes, limits } = initialAttributes(init);
    if (!game._startupRoleGoldInitialized) {
        game._goldCount = init.gold;
        game._initialGoldCount = init.gold;
    }
    const initialHp = game._initialHp ?? init.hp;
    game.u.uhp = initialHp;
    game.u.uhpmax = initialHp;
    game.u.uen = game._initialPower ?? init.pwBase;
    game.u.uenmax = game.u.uen;
    game.u.uac = init.ac;
    game.u.uhunger = 900;
    game.u.ublesscnt = 300;
    game.u.uencumber = 0;
    game.u.acurr = { a: attrs };
    game.u.amax = { a: maxes };
    game.u.attrmax = { a: limits.slice() };
    game.u.uprops = game.u.uprops || {};
    // C ref: src/polyself.c:set_uasmon().  Hero infravision comes from the
    // physical race's monster form while unpolymorphed.
    if (INFRAVISION_RACES.has(currentRaceName())) game.u.uprops.infravision = true;
    if (role?.name?.m === 'Archeologist') {
        // C refs: src/u_init.c:u_init_misc(), src/attrib.c:arc_abil[].
        game.u.uprops.searching = true;
    } else if (role?.name?.m === 'Monk') {
        // C refs: src/u_init.c:u_init_misc(), src/attrib.c:mon_abil[].
        game.u.uprops.intrinsic_fast = true;
        game.u.uprops.sleep_resistance = true;
        game.u.uprops.see_invisible = true;
    } else if (role?.name?.m === 'Samurai') {
        // C ref: src/attrib.c:sam_abil[] grants level-1 intrinsic HFast.
        game.u.uprops.intrinsic_fast = true;
    } else if (role?.name?.m === 'Knight') {
        // C ref: src/u_init.c:u_init_role() grants Knights intrinsic Jumping.
        game.u.uprops.jumping = true;
    }
}

function roleLevelAdv() {
    const role = findRole(game._nhopts?.role) || game.urole;
    return LEVEL_ADV.get(role?.name?.m) || null;
}

function raceLevelAdv() {
    const raceName = game.urace?.name || game._nhopts?.race || 'human';
    return RACE_LEVEL_ADV.get(String(raceName).toLowerCase()) || RACE_LEVEL_ADV.get('human');
}

function currentLevel(u) {
    return u.ulevel == null ? 1 : Number(u.ulevel);
}

function currentAttr(index) {
    return game.u?.acurr?.a?.[index] ?? 10;
}

function energyMod(en, adv) {
    if (adv?.energyMod === 'wizard') return 2 * en;
    if (adv?.energyMod === 'healer' || adv?.energyMod === 'knight') return Math.trunc((3 * en) / 2);
    if (adv?.energyMod === 'barbarian' || adv?.energyMod === 'valkyrie') return Math.trunc((3 * en) / 4);
    return en;
}

function initialHitPoints(role, race) {
    let hp = role.hpadv.infix + race.hpadv.infix;
    if (role.hpadv.inrnd > 0) hp += rnd(role.hpadv.inrnd);
    if (race.hpadv.inrnd > 0) hp += rnd(race.hpadv.inrnd);
    return Math.max(hp, 1);
}

function initialPower(role, race) {
    let en = role.enadv.infix + race.enadv.infix;
    if (role.enadv.inrnd > 0) en += rnd(role.enadv.inrnd);
    if (race.enadv.inrnd > 0) en += rnd(race.enadv.inrnd);
    return Math.max(en, 1);
}

export function newhp() {
    const u = game.u || {};
    const role = roleLevelAdv();
    const race = raceLevelAdv();
    if (!role || !race) return 1;
    const lvl = currentLevel(u);
    let hp;
    if (lvl === 0) {
        hp = initialHitPoints(role, race);
        u.uhpinc = u.uhpinc || [];
        u.uhpinc[0] = hp;
        return hp;
    }
    if (lvl < role.xlev) {
        hp = role.hpadv.lofix + race.hpadv.lofix;
        if (role.hpadv.lornd > 0) hp += rnd(role.hpadv.lornd);
        if (race.hpadv.lornd > 0) hp += rnd(race.hpadv.lornd);
    } else {
        hp = role.hpadv.hifix + race.hpadv.hifix;
        if (role.hpadv.hirnd > 0) hp += rnd(role.hpadv.hirnd);
        if (race.hpadv.hirnd > 0) hp += rnd(race.hpadv.hirnd);
    }

    const con = currentAttr(4);
    let conplus = 0;
    if (con <= 3) conplus = -2;
    else if (con <= 6) conplus = -1;
    else if (con <= 14) conplus = 0;
    else if (con <= 16) conplus = 1;
    else if (con === 17) conplus = 2;
    else if (con === 18) conplus = 3;
    else conplus = 4;
    hp += conplus;

    if (hp <= 0) hp = 1;
    u.uhpinc = u.uhpinc || [];
    if (lvl < 30) u.uhpinc[lvl] = hp;
    return hp;
}

export function newpw() {
    const u = game.u || {};
    const role = roleLevelAdv();
    const race = raceLevelAdv();
    if (!role || !race) return 1;
    const lvl = currentLevel(u);
    if (lvl === 0) {
        const en = initialPower(role, race);
        u.ueninc = u.ueninc || [];
        u.ueninc[0] = en;
        return en;
    }
    let enrnd = Math.trunc(currentAttr(2) / 2);
    let enfix;
    if (lvl < role.xlev) {
        enrnd += role.enadv.lornd + race.enadv.lornd;
        enfix = role.enadv.lofix + race.enadv.lofix;
    } else {
        enrnd += role.enadv.hirnd + race.enadv.hirnd;
        enfix = role.enadv.hifix + race.enadv.hifix;
    }
    let en = energyMod(rn1(enrnd, enfix), role);
    if (en <= 0) en = 1;
    u.ueninc = u.ueninc || [];
    if (lvl < 30) u.ueninc[lvl] = en;
    return en;
}

export function newuexp(level) {
    const lev = Number(level) || 0;
    if (lev < 1) return 0;
    if (lev < 10) return 10 * (1 << lev);
    if (lev < 20) return 10000 * (1 << (lev - 10));
    return 10000000 * (lev - 19);
}

export function pluslvl() {
    const u = game.u || {};
    const hpinc = newhp();
    u.uhp = (u.uhp || 0) + hpinc;
    u.uhpmax = (u.uhpmax || 0) + hpinc;
    if (u.uhp > u.uhpmax) u.uhp = u.uhpmax;

    const eninc = newpw();
    u.uen = (u.uen || 0) + eninc;
    u.uenmax = (u.uenmax || 0) + eninc;
    u.uenpeak = Math.max(u.uenpeak || 0, u.uenmax);

    if ((u.ulevel || 1) < 30) {
        u.uexp = newuexp(u.ulevel || 1);
        u.ulevel = (u.ulevel || 1) + 1;
        u.ulevelmax = Math.max(u.ulevelmax || 0, u.ulevel);
        u.ulevelpeak = Math.max(u.ulevelpeak || 0, u.ulevel);
    }
    return u.ulevel;
}
