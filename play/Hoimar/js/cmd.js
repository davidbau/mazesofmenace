// cmd.js — Command dispatch and movement.
// C ref: cmd.c rhack(), hack.c domove().
//
// Minimal skeleton: only hjklyubn movement is implemented.
// Contestants should add: search, kick, eat, drink, read, zap,
// wear, wield, drop, throw, pray, cast, and all other commands.

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import {
    newsym, show_glyph_cell, flush_screen, pline, append_pline, clear_pending_message, docrt,
    serialize_terminal_grid, queue_more_prompt,
    apply_hallucination_display_transition, refresh_swallowed_overlay,
    see_monsters, see_objects, see_nearby_objects, see_traps, refresh_warning_monsters, map_level_for_wizard,
    object_glyph_for_menu, serialize_known_terrain_view_screen,
} from './display.js';
import { cansee, couldsee, vision_recalc, vision_reset } from './vision.js';
import {
    makemon, mklev, mkobj, mkcorpstat, mksobj, monster_by_user_name, monsterPtr,
    next_ident, place_lregion, place_object, shopTypeName, u_on_dnstairs, u_on_upstairs,
} from './mklev.js';
import { OBJECT_CHARGED, OBJECT_CLASS, OBJECT_DELAY, OBJECT_MATERIAL, OBJECT_PROB } from './object_data.js';
import { finish_pet_kill, obj_resists, pet_arrive_with_you } from './dog.js';
import { merge_inventory_object, newuexp, pluslvl } from './u_init.js';
import { adjalign, exercise, gethungry } from './allmain_turns.js';
import { initrack } from './track.js';
import { roleGod, roleGreeting, roleRankForLevel } from './roles.js';
import { d, rn1, rn2, rnd, rnl, rnz } from './rng.js';
import { dist2 } from './hacklib.js';
import { getObjectDescription } from './o_init.js';
import { getRumor, hallucinatedLiquidName, randomHallucinatedMonsterName } from './random_text.js';
import { finish_pending_swallowed_expulsion } from './monmove.js';
import { writeSavedGame } from './save_restore.js';
import { ATR_INVERSE, NO_COLOR } from './terminal.js';
import * as C from './const.js';
import {
    COLNO, ROWNO, STONE, CORR, DOOR, D_NODOOR, D_CLOSED, D_LOCKED,
    SDOOR, SCORR, IS_WALL, IS_OBSTRUCTED, IS_POOL, LR_UPTELE, LR_DOWNTELE, A_STR, A_DEX, A_CON, A_WIS,
} from './const.js';

function refreshWarningAfterHeroMove() {
    if (!game.u?.uprops?.warning) return;
    if (game.u?.uhallucination || game.u?.uprops?.hallucination) return;
    refresh_warning_monsters();
}

// Direction deltas: y u k
//                   h . l
//                   b j n
const DIR_DX = { h: -1, l: 1, j: 0, k: 0, y: -1, u: 1, b: -1, n: 1 };
const DIR_DY = { h: 0, l: 0, j: 1, k: -1, y: -1, u: -1, b: 1, n: 1 };
const RUN_KEY = { H: 'h', L: 'l', J: 'j', K: 'k', Y: 'y', U: 'u', B: 'b', N: 'n' };
const CONFUSED_DIRS = [
    { dx: -1, dy: 0 }, { dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 },
    { dx: -1, dy: -1 }, { dx: 1, dy: -1 }, { dx: 1, dy: 1 }, { dx: -1, dy: 1 },
];

const AMULET_OF_LIFE_SAVING = 202;
const AMULET_OF_UNCHANGING = 207;
const AMULET_OF_GUARDING = 210;
const GRAY_DRAGON_SCALE_MAIL = 101;
const WAN_LIGHT = 410;
const WAN_WISHING = 414;
const WAN_FIRE = 430;
const WAN_COLD = 431;
const WAN_SLEEP = 432;
const WAN_DEATH = 433;
const WAN_LIGHTNING = 434;
const WAN_MAKE_INVISIBLE = 418;
const WAN_SECRET_DOOR_DETECTION = 411;
const WAN_POLYMORPH = 422;
const WAN_DIGGING = 428;
const WAN_MAGIC_MISSILE = 429;
const QUARTERSTAFF = 79;
const WAR_HAMMER = 76;
const CLOAK_OF_MAGIC_RESISTANCE = 148;
const CLOAK_OF_PROTECTION = 146;
const M1_FLY = 0x00000001;
const M1_CLING = 0x00000010;
const M1_CONCEAL = 0x00000080;
const M1_HIDE = 0x00000100;
const M2_STALK = 0x01000000;
const M2_NASTY = 0x02000000;
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
const SPEED_BOOTS = 166;
const LEVITATION_BOOTS = 172;
const RIN_TELEPORT_CONTROL = 195;
const RIN_INCREASE_ACCURACY = 176;
const RIN_STEALTH = 181;
const RIN_PROTECTION = 178;
const LOCK_PICK = 222;
const CREDIT_CARD = 223;
const EXPENSIVE_CAMERA = 229;
const MIRROR = 230;
const BLINDFOLD = 233;
const TOWEL = 234;
const LEASH = 236;
const STETHOSCOPE = 237;
const TIN_OPENER = 239;
const FIGURINE = 241;
const MAGIC_MARKER = 242;
const LEATHER_DRUM = 257;
const DRUM_OF_EARTHQUAKE = 258;
const LARGE_BOX = 214;
const CHEST = 215;
const ICE_BOX = 216;
const SACK = 217;
const BAG_OF_TRICKS = 220;
const GOLD_PIECE = 438;
const ARROW = 18;
const ELVEN_ARROW = 19;
const ORCISH_ARROW = 20;
const YA = 22;
const SCALPEL = 39;
const DART = 24;
const DAGGER = 34;
const ELVEN_DAGGER = 35;
const SHORT_SWORD = 46;
const ELVEN_SPEAR = 28;
const ORCISH_SPEAR = 29;
const DWARVISH_SPEAR = 30;
const JAVELIN = 32;
const BOW = 83;
const ELVEN_BOW = 84;
const ORCISH_BOW = 85;
const YUMI = 86;
const ORCISH_DAGGER = 36;
const TRIPE_RATION = 264;
const CORPSE = 265;
const EGG = 266;
const MEATBALL = 267;
const MEAT_STICK = 268;
const ENORMOUS_MEATBALL = 269;
const MEAT_RING = 270;
const GLOB_OF_GRAY_OOZE = 271;
const POT_SICKNESS = 318;
const GLOB_OF_BROWN_PUDDING = 272;
const GLOB_OF_GREEN_SLIME = 273;
const GLOB_OF_BLACK_PUDDING = 274;
const KELP_FROND = 275;
const EUCALYPTUS_LEAF = 276;
const G_NOCORPSE = 0x0010;
const STATUE = 476;
const RANDOM_CLASS = 0;
const POT_GAIN_ABILITY = 297;
const POT_CONFUSION = 299;
const POT_PARALYSIS = 301;
const POT_HEALING = 307;
const POT_EXTRA_HEALING = 308;
const POT_FULL_HEALING = 315;
const POT_POLYMORPH = 316;
const POT_BOOZE = 317;
const POT_FRUIT_JUICE = 319;
const POT_OIL = 321;
const POT_WATER = 322;
const SCR_REMOVE_CURSE = 327;
const SCR_ENCHANT_WEAPON = 328;
const SCR_LIGHT = 332;
const SCR_MAGIC_MAPPING = 337;
const BOULDER = 475;
const APPLE = 277;
const ORANGE = 278;
const PEAR = 279;
const MELON = 280;
const BANANA = 281;
const CARROT = 282;
const SPRIG_OF_WOLFSBANE = 283;
const CLOVE_OF_GARLIC = 284;
const SLIME_MOLD = 285;
const LUMP_OF_ROYAL_JELLY = 286;
const CREAM_PIE = 287;
const CANDY_BAR = 288;
const FORTUNE_COOKIE = 289;
const PANCAKE = 290;
const LEMBAS_WAFER = 291;
const CRAM_RATION = 292;
const FOOD_RATION = 293;
const K_RATION = 294;
const C_RATION = 295;
const TIN = 296;
const CHAIN_MAIL = 128;
const LEATHER_GLOVES = 159;
const GAUNTLETS_OF_POWER = 161;
const MZ_HUMAN = 2;
const M2_COLLECT = 0x40000000;
const ARMOR_CLASS = 3;
const WEAPON_CLASS = 2;
const RING_CLASS = 4;
const AMULET_CLASS = 5;
const TOOL_CLASS = 6;
const FOOD_CLASS = 7;
const POTION_CLASS = 8;
const SCROLL_CLASS = 9;
const SPBOOK_CLASS = 10;
const WAND_CLASS = 11;
const COIN_CLASS = 12;
const GEM_CLASS = 13;
const BALL_CLASS = 15;
const CHAIN_CLASS = 16;
const FIRST_SPELL = 366;
const LAST_SPELL = 407;
const SPE_POLYMORPH = 399;
const SPE_BLANK_PAPER = 407;
const SPE_NOVEL = 408;
const SPE_BOOK_OF_THE_DEAD = 409;
const LEVELCHANGE_MORE_LEN = '--More--'.length;

const KILL_DROP_SUBHUMAN_FALLBACK = new Set([
    'lichen',
]);

const MONSTER_ATTACK_TYPE = new Map([
    // C ref: include/monattk.h. Ordering affects exper.c:experience().
    ['AT_NONE', 0],
    ['AT_CLAW', 1],
    ['AT_BITE', 2],
    ['AT_KICK', 3],
    ['AT_BUTT', 4],
    ['AT_TUCH', 5],
    ['AT_STNG', 6],
    ['AT_HUGS', 7],
    ['AT_SPIT', 10],
    ['AT_ENGL', 11],
    ['AT_BREA', 12],
    ['AT_EXPL', 13],
    ['AT_BOOM', 14],
    ['AT_GAZE', 15],
    ['AT_TENT', 16],
    ['AT_WEAP', 254],
    ['AT_MAGC', 255],
]);

const MONSTER_DAMAGE_TYPE = new Map([
    // C ref: include/monattk.h. Numeric order is used by exper.c:experience().
    ['AD_PHYS', 0],
    ['AD_MAGM', 1],
    ['AD_FIRE', 2],
    ['AD_COLD', 3],
    ['AD_SLEE', 4],
    ['AD_DISN', 5],
    ['AD_ELEC', 6],
    ['AD_DRST', 7],
    ['AD_ACID', 8],
    ['AD_SPC1', 9],
    ['AD_SPC2', 10],
    ['AD_BLND', 11],
    ['AD_STUN', 12],
    ['AD_SLOW', 13],
    ['AD_PLYS', 14],
    ['AD_DRLI', 15],
    ['AD_DREN', 16],
    ['AD_LEGS', 17],
    ['AD_STON', 18],
    ['AD_STCK', 19],
    ['AD_SGLD', 20],
    ['AD_SITM', 21],
    ['AD_SEDU', 22],
    ['AD_TLPT', 23],
    ['AD_RUST', 24],
    ['AD_CONF', 25],
    ['AD_DGST', 26],
    ['AD_HEAL', 27],
    ['AD_WRAP', 28],
    ['AD_WERE', 29],
    ['AD_DRDX', 30],
    ['AD_DRCO', 31],
    ['AD_DRIN', 32],
    ['AD_DISE', 33],
    ['AD_DCAY', 34],
    ['AD_SSEX', 35],
    ['AD_HALU', 36],
    ['AD_DETH', 37],
    ['AD_PEST', 38],
    ['AD_FAMN', 39],
    ['AD_SLIM', 40],
    ['AD_ENCH', 41],
    ['AD_CORR', 42],
    ['AD_POLY', 43],
    ['AD_CLRC', 240],
    ['AD_SPEL', 241],
    ['AD_RBRE', 242],
    ['AD_SAMU', 252],
    ['AD_CURS', 253],
]);

const BULKY_KILL_DROP_OBJECTS = new Set([
    // C ref: src/mon.c:xkilled(); small monsters discard generated
    // kill-treasure objects whose object table weight is > 30.
    91, 96, 98, 99, 100,
    101, 102, 103, 104, 105, 106, 107, 108, 109, 110,
    111, 112, 113, 114, 115, 116, 117, 118, 119, 120,
    121, 122, 123, 124, 125, 126, 127, 128, 129, 130,
    131, 132, 133, 134,
    153, 154, 155, 156, 157, 158,
    164, 170,
    CHEST, EXPENSIVE_CAMERA, STETHOSCOPE, BOULDER,
]);

const CORPSE_WEIGHT_BY_MONSTER = new Map([
    // C ref: include/monsters.h SIZ(cwt, cnutrit, ...).
    ['GNOME', 650],
]);

const LEGACY_CORPSE_NUM_TO_MONSTER = new Map([
    [21, 'GNOME'],
]);

const OBJECT_BASE_NAMES = new Map([
    [ARROW, 'arrow'],
    [ELVEN_ARROW, 'elven arrow'],
    [ORCISH_ARROW, 'orcish arrow'],
    [YA, 'ya'],
    [DART, 'dart'],
    [DAGGER, 'dagger'],
    [ELVEN_DAGGER, 'elven dagger'],
    [SHORT_SWORD, 'short sword'],
    [ELVEN_SPEAR, 'elven spear'],
    [ORCISH_SPEAR, 'orcish spear'],
    [DWARVISH_SPEAR, 'dwarvish spear'],
    [JAVELIN, 'javelin'],
    [SCALPEL, 'scalpel'],
    [ORCISH_DAGGER, 'crude dagger'],
    [WAR_HAMMER, 'war hammer'],
    [QUARTERSTAFF, 'quarterstaff'],
    [BOW, 'bow'],
    [ELVEN_BOW, 'elven bow'],
    [ORCISH_BOW, 'orcish bow'],
    [YUMI, 'yumi'],
    [GRAY_DRAGON_SCALE_MAIL, 'gray dragon scale mail'],
    [CLOAK_OF_MAGIC_RESISTANCE, 'cloak of magic resistance'],
    [CLOAK_OF_DISPLACEMENT, 'cloak of displacement'],
    [SPEED_BOOTS, 'speed boots'],
    [CHAIN_MAIL, 'chain mail'],
    [LEATHER_GLOVES, 'leather gloves'],
    [GAUNTLETS_OF_POWER, 'gauntlets of power'],
    [AMULET_OF_LIFE_SAVING, 'amulet of life saving'],
    [RIN_PROTECTION, 'ring of protection'],
    [RIN_INCREASE_ACCURACY, 'ring of increase accuracy'],
    [188, 'ring of poison resistance'],
    [199, 'ring of see invisible'],
    [RIN_STEALTH, 'ring of stealth'],
    [RIN_TELEPORT_CONTROL, 'ring of teleport control'],
    [200, 'ring of protection from shape changers'],
    [LOCK_PICK, 'lock pick'],
    [CREDIT_CARD, 'credit card'],
    [EXPENSIVE_CAMERA, 'expensive camera'],
    [MIRROR, 'mirror'],
    [BLINDFOLD, 'blindfold'],
    [TOWEL, 'towel'],
    [LEASH, 'leash'],
    [STETHOSCOPE, 'stethoscope'],
    [TIN_OPENER, 'tin opener'],
    [MAGIC_MARKER, 'magic marker'],
    [257, 'drum'],
    [258, 'drum'],
    [LARGE_BOX, 'large box'],
    [CHEST, 'chest'],
    [ICE_BOX, 'ice box'],
    [SACK, 'sack'],
    [POT_CONFUSION, 'potion of confusion'],
    [POT_PARALYSIS, 'potion of paralysis'],
    [311, 'potion of monster detection'],
    [312, 'potion of object detection'],
    [306, 'potion of see invisible'],
    [307, 'potion of healing'],
    [308, 'potion of extra healing'],
    [309, 'potion of gain level'],
    [POT_FULL_HEALING, 'potion of full healing'],
    [POT_BOOZE, 'potion of booze'],
    [POT_OIL, 'potion of oil'],
    [316, 'potion of polymorph'],
    [POT_SICKNESS, 'potion of sickness'],
    [323, 'scroll of enchant armor'],
    [325, 'scroll of confuse monster'],
    [326, 'scroll of scare monster'],
    [328, 'scroll of enchant weapon'],
    [330, 'scroll of taming'],
    [332, 'scroll of light'],
    [335, 'scroll of food detection'],
    [336, 'scroll of identify'],
    [SCR_MAGIC_MAPPING, 'scroll of magic mapping'],
    [374, 'spellbook of healing'],
    [367, 'spellbook of magic missile'],
    [370, 'spellbook of sleep'],
    [372, 'spellbook of light'],
    [373, 'spellbook of detect monsters'],
    [375, 'spellbook of knock'],
    [377, 'spellbook of confuse monster'],
    [379, 'spellbook of drain life'],
    [378, 'spellbook of cure blindness'],
    [380, 'spellbook of slow monster'],
    [382, 'spellbook of create monster'],
    [383, 'spellbook of force bolt'],
    [384, 'spellbook of cause fear'],
    [391, 'spellbook of extra healing'],
    [397, 'spellbook of identify'],
    [403, 'spellbook of protection'],
    [405, 'spellbook of stone to flesh'],
    [SPE_NOVEL, 'novel'],
    [SPE_BOOK_OF_THE_DEAD, 'Book of the Dead'],
    [WAN_MAKE_INVISIBLE, 'wand of make invisible'],
    [WAN_DIGGING, 'wand of digging'],
    [WAN_MAGIC_MISSILE, 'wand of magic missile'],
    [WAN_SECRET_DOOR_DETECTION, 'wand of secret door detection'],
    [WAN_POLYMORPH, 'wand of polymorph'],
    [WAN_FIRE, 'wand of fire'],
    [WAN_COLD, 'wand of cold'],
    [WAN_SLEEP, 'wand of sleep'],
    [WAN_DEATH, 'wand of death'],
    [WAN_LIGHTNING, 'wand of lightning'],
    [421, 'wand of undead turning'],
    // C ref: include/objects.h FOOD() entries; ordinary food names are known.
    [TRIPE_RATION, 'tripe ration'],
    [EGG, 'egg'],
    [MEATBALL, 'meatball'],
    [MEAT_STICK, 'meat stick'],
    [ENORMOUS_MEATBALL, 'enormous meatball'],
    [MEAT_RING, 'meat ring'],
    [GLOB_OF_GRAY_OOZE, 'glob of gray ooze'],
    [GLOB_OF_BROWN_PUDDING, 'glob of brown pudding'],
    [GLOB_OF_GREEN_SLIME, 'glob of green slime'],
    [GLOB_OF_BLACK_PUDDING, 'glob of black pudding'],
    [KELP_FROND, 'kelp frond'],
    [EUCALYPTUS_LEAF, 'eucalyptus leaf'],
    [APPLE, 'apple'],
    [ORANGE, 'orange'],
    [PEAR, 'pear'],
    [MELON, 'melon'],
    [BANANA, 'banana'],
    [CARROT, 'carrot'],
    [SPRIG_OF_WOLFSBANE, 'sprig of wolfsbane'],
    [CLOVE_OF_GARLIC, 'clove of garlic'],
    [SLIME_MOLD, 'slime mold'],
    [LUMP_OF_ROYAL_JELLY, 'lump of royal jelly'],
    [CREAM_PIE, 'cream pie'],
    [CANDY_BAR, 'candy bar'],
    [FORTUNE_COOKIE, 'fortune cookie'],
    [PANCAKE, 'pancake'],
    [LEMBAS_WAFER, 'lembas wafer'],
    [CRAM_RATION, 'cram ration'],
    [FOOD_RATION, 'food ration'],
    [K_RATION, 'K-ration'],
    [C_RATION, 'C-ration'],
    [TIN, 'tin'],
    [BOULDER, 'boulder'],
    [461, 'white gem'],
]);

const ARMOR_XNAMES = new Map([
    // C ref: include/objects.h armor entries plus objnam.c:xname_flags().
    // nameKnown mirrors the object table's `kn` flag.
    [89, { name: 'elven leather helm', desc: 'leather hat', nameKnown: false, cost: 8 }],
    [90, { name: 'orcish helm', desc: 'iron skull cap', nameKnown: false, cost: 10 }],
    [91, { name: 'dwarvish iron helm', desc: 'hard hat', nameKnown: false, cost: 20 }],
    [92, { name: 'fedora', nameKnown: true, cost: 1 }],
    [93, { name: 'cornuthaum', desc: 'conical hat', nameKnown: false, cost: 80 }],
    [94, { name: 'dunce cap', desc: 'conical hat', nameKnown: false, cost: 1 }],
    [95, { name: 'dented pot', nameKnown: true, cost: 8 }],
    [96, { name: 'helm of brilliance', desc: 'crystal helmet', nameKnown: false, cost: 50 }],
    [97, { name: 'helmet', desc: 'plumed helmet', nameKnown: false, cost: 10 }],
    [98, { name: 'helm of caution', desc: 'etched helmet', nameKnown: false, cost: 50 }],
    [99, { name: 'helm of opposite alignment', desc: 'crested helmet', nameKnown: false, cost: 50 }],
    [100, { name: 'helm of telepathy', desc: 'visored helmet', nameKnown: false, cost: 50 }],
    [101, { name: 'gray dragon scale mail', nameKnown: true, cost: 1200 }],
    [102, { name: 'gold dragon scale mail', nameKnown: true, cost: 900 }],
    [103, { name: 'silver dragon scale mail', nameKnown: true, cost: 1200 }],
    [104, { name: 'red dragon scale mail', nameKnown: true, cost: 900 }],
    [105, { name: 'white dragon scale mail', nameKnown: true, cost: 900 }],
    [106, { name: 'orange dragon scale mail', nameKnown: true, cost: 900 }],
    [107, { name: 'black dragon scale mail', nameKnown: true, cost: 1200 }],
    [108, { name: 'blue dragon scale mail', nameKnown: true, cost: 900 }],
    [109, { name: 'green dragon scale mail', nameKnown: true, cost: 900 }],
    [110, { name: 'yellow dragon scale mail', nameKnown: true, cost: 900 }],
    [111, { name: 'gray dragon scales', nameKnown: true, cost: 700, scales: true }],
    [112, { name: 'gold dragon scales', nameKnown: true, cost: 500, scales: true }],
    [113, { name: 'silver dragon scales', nameKnown: true, cost: 700, scales: true }],
    [114, { name: 'red dragon scales', nameKnown: true, cost: 500, scales: true }],
    [115, { name: 'white dragon scales', nameKnown: true, cost: 500, scales: true }],
    [116, { name: 'orange dragon scales', nameKnown: true, cost: 500, scales: true }],
    [117, { name: 'black dragon scales', nameKnown: true, cost: 700, scales: true }],
    [118, { name: 'blue dragon scales', nameKnown: true, cost: 500, scales: true }],
    [119, { name: 'green dragon scales', nameKnown: true, cost: 500, scales: true }],
    [120, { name: 'yellow dragon scales', nameKnown: true, cost: 500, scales: true }],
    [121, { name: 'plate mail', nameKnown: true, cost: 600 }],
    [122, { name: 'crystal plate mail', nameKnown: true, cost: 820 }],
    [123, { name: 'bronze plate mail', nameKnown: true, cost: 400 }],
    [124, { name: 'splint mail', nameKnown: true, cost: 80 }],
    [125, { name: 'banded mail', nameKnown: true, cost: 90 }],
    [126, { name: 'dwarvish mithril-coat', nameKnown: true, cost: 240 }],
    [127, { name: 'elven mithril-coat', nameKnown: true, cost: 240 }],
    [128, { name: 'chain mail', nameKnown: true, cost: 75 }],
    [129, { name: 'orcish chain mail', desc: 'crude chain mail', nameKnown: false, cost: 75 }],
    [130, { name: 'scale mail', nameKnown: true, cost: 45 }],
    [131, { name: 'studded leather armor', nameKnown: true, cost: 15 }],
    [132, { name: 'ring mail', nameKnown: true, cost: 100 }],
    [133, { name: 'orcish ring mail', desc: 'crude ring mail', nameKnown: false, cost: 80 }],
    [134, { name: 'leather armor', nameKnown: true, cost: 5 }],
    [135, { name: 'leather jacket', nameKnown: true, cost: 10 }],
    [136, { name: 'Hawaiian shirt', nameKnown: true, cost: 3 }],
    [137, { name: 'T-shirt', nameKnown: true, cost: 2 }],
    [138, { name: 'mummy wrapping', nameKnown: true, cost: 2 }],
    [139, { name: 'elven cloak', desc: 'faded pall', nameKnown: false, cost: 60 }],
    [140, { name: 'orcish cloak', desc: 'coarse mantelet', nameKnown: false, cost: 40 }],
    [141, { name: 'dwarvish cloak', desc: 'hooded cloak', nameKnown: false, cost: 50 }],
    [142, { name: 'oilskin cloak', desc: 'slippery cloak', nameKnown: false, cost: 50 }],
    [143, { name: 'robe', nameKnown: true, cost: 50 }],
    [144, { name: 'alchemy smock', desc: 'apron', nameKnown: false, cost: 50 }],
    [145, { name: 'leather cloak', nameKnown: true, cost: 40 }],
    [146, { name: 'cloak of protection', desc: 'tattered cape', nameKnown: false, cost: 50 }],
    [147, { name: 'cloak of invisibility', desc: 'opera cloak', nameKnown: false, cost: 60 }],
    [148, { name: 'cloak of magic resistance', desc: 'ornamental cope', nameKnown: false, cost: 60 }],
    [149, { name: 'cloak of displacement', desc: 'piece of cloth', nameKnown: false, cost: 50 }],
    [150, { name: 'small shield', desc: 'wooden shield', nameKnown: false, cost: 3 }],
    [151, { name: 'shield of drain resistance', desc: 'wooden shield', nameKnown: false, cost: 50 }],
    [152, { name: 'shield of shock resistance', desc: 'wooden shield', nameKnown: false, cost: 50 }],
    [153, { name: 'elven shield', desc: 'blue and green shield', nameKnown: false, cost: 7 }],
    [154, { name: 'Uruk-hai shield', desc: 'white-handed shield', nameKnown: false, cost: 7 }],
    [155, { name: 'orcish shield', desc: 'red-eyed shield', nameKnown: false, cost: 7 }],
    [156, { name: 'large shield', nameKnown: true, cost: 10 }],
    [157, { name: 'dwarvish roundshield', desc: 'large round shield', nameKnown: false, cost: 10 }],
    [158, { name: 'shield of reflection', desc: 'polished silver shield', nameKnown: false, cost: 50 }],
    [159, { name: 'leather gloves', desc: 'old gloves', nameKnown: false, cost: 8 }],
    [160, { name: 'gauntlets of fumbling', desc: 'padded gloves', nameKnown: false, cost: 50 }],
    [161, { name: 'gauntlets of power', desc: 'riding gloves', nameKnown: false, cost: 50 }],
    [162, { name: 'gauntlets of dexterity', desc: 'fencing gloves', nameKnown: false, cost: 50 }],
    [163, { name: 'low boots', desc: 'walking shoes', nameKnown: false, cost: 8 }],
    [164, { name: 'iron shoes', desc: 'hard shoes', nameKnown: false, cost: 16 }],
    [165, { name: 'high boots', desc: 'jackboots', nameKnown: false, cost: 12 }],
    [166, { name: 'speed boots', desc: 'combat boots', nameKnown: false, cost: 50 }],
    [167, { name: 'water walking boots', desc: 'jungle boots', nameKnown: false, cost: 50 }],
    [168, { name: 'jumping boots', desc: 'hiking boots', nameKnown: false, cost: 50 }],
    [169, { name: 'elven boots', desc: 'mud boots', nameKnown: false, cost: 8 }],
    [170, { name: 'kicking boots', desc: 'buckled boots', nameKnown: false, cost: 8 }],
    [171, { name: 'fumble boots', desc: 'riding boots', nameKnown: false, cost: 30 }],
    [172, { name: 'levitation boots', desc: 'snow boots', nameKnown: false, cost: 30 }],
]);

const ARMOR_MAGIC_CANCELLATION = new Map([
    [93, 1], // cornuthaum
    [121, 2], [122, 2],
    [123, 1], [124, 1], [125, 1],
    [126, 2], [127, 2],
    [128, 1], [129, 1], [130, 1], [131, 1], [132, 1], [133, 1], [134, 1],
    [138, 1], [139, 1], [140, 1], [141, 1],
    [142, 2], [143, 2],
    [144, 1], [145, 1],
    [146, 3],
    [147, 1], [148, 1], [149, 1],
]);

const SPELLBOOK_SPELL_INFO = new Map([
    [374, { name: 'healing', level: 1, category: 'healing', skillLevel: C.P_BASIC }],
    [378, { name: 'cure blindness', level: 2, category: 'healing', skillLevel: C.P_UNSKILLED }],
    [380, { name: 'slow monster', level: 2, category: 'enchantment', skillLevel: C.P_BASIC }],
    [382, { name: 'create monster', level: 2, category: 'clerical', skillLevel: C.P_UNSKILLED }],
    [383, { name: 'force bolt', level: 1, category: 'attack', skillLevel: C.P_BASIC }],
    [391, { name: 'extra healing', level: 3, category: 'healing', skillLevel: C.P_BASIC }],
    [397, { name: 'identify', level: 3, category: 'divination', skillLevel: C.P_UNSKILLED }],
    [405, { name: 'stone to flesh', level: 3, category: 'healing', skillLevel: C.P_BASIC }],
]);

const INVENTORY_GROUPS = [
    { cls: AMULET_CLASS, title: 'Amulets' },
    { cls: WEAPON_CLASS, title: 'Weapons' },
    { cls: ARMOR_CLASS, title: 'Armor' },
    { cls: FOOD_CLASS, title: 'Comestibles' },
    { cls: SCROLL_CLASS, title: 'Scrolls' },
    { cls: SPBOOK_CLASS, title: 'Spellbooks' },
    { cls: POTION_CLASS, title: 'Potions' },
    { cls: RING_CLASS, title: 'Rings' },
    { cls: WAND_CLASS, title: 'Wands' },
    { cls: TOOL_CLASS, title: 'Tools' },
    { cls: GEM_CLASS, title: 'Gems/Stones' },
];

const TOURIST_STARTER_MENU = [
    { cls: WEAPON_CLASS, line: 'a - 27 +2 darts (at the ready)' },
    { cls: ARMOR_CLASS, line: 'j - an uncursed +0 Hawaiian shirt (being worn)' },
    { cls: FOOD_CLASS, line: 'b - 6 uncursed food rations' },
    { cls: FOOD_CLASS, line: 'c - an uncursed apple' },
    { cls: FOOD_CLASS, line: 'd - 2 uncursed fortune cookies' },
    { cls: FOOD_CLASS, line: 'e - an uncursed clove of garlic' },
    { cls: FOOD_CLASS, line: 'f - an uncursed slime mold' },
    { cls: FOOD_CLASS, line: 'g - 2 uncursed tins of lichen' },
    { cls: SCROLL_CLASS, line: 'i - 4 uncursed scrolls of magic mapping' },
    { cls: POTION_CLASS, line: 'h - 2 uncursed potions of extra healing' },
    { cls: TOOL_CLASS, line: 'k - an expensive camera (0:34)' },
    { cls: TOOL_CLASS, line: 'l - an uncursed credit card' },
];

// C ref: attrib.c role innate ability tables plus adjabil().  Level-gain
// messages are ordinary plines emitted after pluslvl()'s welcome message.
const ROLE_INNATE_ABILITIES = new Map([
    ['Archeologist', [
        { level: 5, prop: 'stealth', gain: 'stealthy' },
        { level: 10, prop: 'fast', gain: 'quick' },
    ]],
    ['Barbarian', [
        { level: 7, prop: 'fast', gain: 'quick' },
        { level: 15, prop: 'stealth', gain: 'stealthy' },
    ]],
    ['Caveman', [
        { level: 7, prop: 'fast', gain: 'quick' },
        { level: 15, prop: 'warning', gain: 'sensitive' },
    ]],
    ['Healer', [
        { level: 15, prop: 'warning', gain: 'sensitive' },
    ]],
    ['Knight', [
        { level: 7, prop: 'fast', gain: 'quick' },
    ]],
    ['Monk', [
        { level: 3, prop: 'poison_resistance', gain: 'healthy' },
        { level: 5, prop: 'stealth', gain: 'stealthy' },
        { level: 7, prop: 'warning', gain: 'sensitive' },
        { level: 9, prop: 'searching', gain: 'perceptive' },
        { level: 11, prop: 'fire_resistance', gain: 'cool' },
        { level: 13, prop: 'cold_resistance', gain: 'warm' },
        { level: 15, prop: 'shock_resistance', gain: 'insulated' },
        { level: 17, prop: 'teleport_control', gain: 'controlled' },
    ]],
    ['Priest', [
        { level: 15, prop: 'warning', gain: 'sensitive' },
        { level: 20, prop: 'fire_resistance', gain: 'cool' },
    ]],
    ['Ranger', [
        { level: 7, prop: 'stealth', gain: 'stealthy' },
    ]],
    ['Rogue', [
        { level: 10, prop: 'searching', gain: 'perceptive' },
    ]],
    ['Samurai', [
        { level: 15, prop: 'stealth', gain: 'stealthy' },
    ]],
    ['Tourist', [
        { level: 10, prop: 'searching', gain: 'perceptive' },
        { level: 20, prop: 'poison_resistance', gain: 'hardy' },
    ]],
    ['Wizard', [
        { level: 15, prop: 'warning', gain: 'sensitive' },
        { level: 17, prop: 'teleport_control', gain: 'controlled' },
    ]],
]);

const RACE_INNATE_ABILITIES = new Map([
    ['elf', [
        { level: 4, prop: 'sleep_resistance', gain: 'awake' },
    ]],
]);

function wishedObjectSpec(name) {
    const wish = String(name || '').toLowerCase();
    const spec = {};
    const chargeMatch = wish.match(/\((\d+)(?::(\d+))?\)/);
    if (chargeMatch) {
        spec.recharged = Number(chargeMatch[1]);
        spec.spe = Number(chargeMatch[2] ?? chargeMatch[1]);
    }
    const speMatch = wish.match(/(?:^|\s)([+-]\d+)(?:\s|$)/);
    if (speMatch) spec.spe = Number(speMatch[1]);
    if (wish.includes('blessed')) {
        spec.blessed = true;
        spec.cursed = false;
    } else if (wish.includes('cursed') && !wish.includes('uncursed')) {
        spec.cursed = true;
        spec.blessed = false;
    } else if (wish.includes('uncursed')) {
        spec.cursed = false;
        spec.blessed = false;
    }
    if (wish.includes('amulet of life saving')) {
        rn2(76);
        return { ...spec, otyp: AMULET_OF_LIFE_SAVING };
    }
    if (wish.includes('gray dragon scale mail') || wish.includes('grey dragon scale mail')) {
        rn2(67);
        return { ...spec, otyp: GRAY_DRAGON_SCALE_MAIL };
    }
    if (wish.includes('speed boots')) {
        rn2(13);
        return { ...spec, otyp: SPEED_BOOTS };
    }
    if (wish.includes('gauntlets of power')) {
        // C ref: objnam.c:rnd_otyp_by_namedesc() searches the shuffled
        // gloves description/name pool before readobjnam() creates armor.
        rn2(9);
        return { ...spec, otyp: GAUNTLETS_OF_POWER };
    }
    if (wish.includes('cloak of magic resistance')) {
        // C ref: objnam.c:rnd_otyp_by_namedesc() searches the cloak/armor
        // description/name pool before mksobj() initializes the cloak.
        rn2(13);
        return { ...spec, otyp: CLOAK_OF_MAGIC_RESISTANCE };
    }
    if (wish.includes('cloak of displacement')) {
        // C ref: objnam.c:rnd_otyp_by_namedesc() searches the cloak/armor
        // description/name pool before mksobj() initializes the cloak.
        rn2(13);
        return { ...spec, otyp: CLOAK_OF_DISPLACEMENT };
    }
    if (wish.includes('mjollnir')) {
        // C ref: objnam.c:readobjnam() resolves the artifact name to a
        // war hammer, then oname() handles artifact naming after mksobj().
        return { ...spec, otyp: WAR_HAMMER, oname: 'Mjollnir', namedArtifact: true };
    }
    if (wish.includes('wand of fire')) {
        rn2(41);
        return { ...spec, otyp: WAN_FIRE };
    }
    if (wish.includes('wand of cold')) {
        rn2(41);
        return { ...spec, otyp: WAN_COLD };
    }
    if (wish.includes('wand of lightning')) {
        rn2(41);
        return { ...spec, otyp: WAN_LIGHTNING };
    }
    if (wish.includes('wand of polymorph')) {
        rn2(46);
        return { ...spec, otyp: WAN_POLYMORPH };
    }
    if (wish.includes('wand of magic missile')) {
        // C ref: objnam.c:rnd_otyp_by_namedesc() check_of also matches
        // "spellbook of magic missile", so the probability pool is 41+10.
        rn2(51);
        return { ...spec, otyp: WAN_MAGIC_MISSILE };
    }
    if (wish.includes('wand of death')) {
        rn2(41);
        return { ...spec, otyp: WAN_DEATH };
    }
    if (wish.includes('wand of digging')) {
        rn2(41);
        return { ...spec, otyp: WAN_DIGGING };
    }
    if (wish.includes('ring of teleport control')) {
        rn2(2);
        return { ...spec, otyp: RIN_TELEPORT_CONTROL, appearanceName: 'ivory ring' };
    }
    if (wish.includes('stethoscope')) {
        rn2(26);
        return { ...spec, otyp: STETHOSCOPE };
    }
    if (wish.includes('magic marker')) {
        rn2(16);
        return { ...spec, otyp: MAGIC_MARKER };
    }
    if (wish.includes('mirror')) {
        rn2(46);
        return { ...spec, otyp: MIRROR, appearanceName: 'looking glass' };
    }
    if (wish.includes('expensive camera')) {
        rn2(16);
        return { ...spec, otyp: EXPENSIVE_CAMERA };
    }
    return null;
}

function validInvlet(ch) {
    return typeof ch === 'string' && /^[a-z]$/.test(ch);
}

function ensureInventoryLetters() {
    game.inventory = game.inventory || [];
    const used = new Set();
    for (const obj of game.inventory) {
        if (obj?.oclass === COIN_CLASS || obj?.invlet === '$') {
            if (obj) obj.invlet = '$';
            continue;
        }
        if (validInvlet(obj?.invlet)) used.add(obj.invlet);
    }

    let nextCode = 97;
    for (const obj of game.inventory) {
        if (obj?.oclass === COIN_CLASS || obj?.invlet === '$') {
            if (obj) obj.invlet = '$';
            continue;
        }
        if (!obj || validInvlet(obj.invlet)) continue;
        while (nextCode <= 122 && used.has(String.fromCharCode(nextCode))) nextCode++;
        if (nextCode > 122) break;
        obj.invlet = String.fromCharCode(nextCode++);
        used.add(obj.invlet);
    }

    let maxCode = 96;
    for (const letter of used) maxCode = Math.max(maxCode, letter.charCodeAt(0));
    game._next_invlet_code = Math.max(game._next_invlet_code || 97, maxCode + 1);
}

function assignInventoryLetter(obj) {
    ensureInventoryLetters();
    let code = game._next_invlet_code || 97;
    while (code <= 122 && game.inventory.some((item) => item?.invlet === String.fromCharCode(code))) {
        code++;
    }
    obj.invlet = code <= 122 ? String.fromCharCode(code) : '?';
    game._next_invlet_code = code + 1;
    return obj.invlet;
}

function make_wish_object(name) {
    const spec = wishedObjectSpec(name);
    if (!spec?.otyp) return null;
    const otmp = mksobj(spec.otyp, true, false);
    otmp.wishedfor = true;
    if (typeof spec.spe === 'number') otmp.spe = spec.spe;
    if (typeof spec.recharged === 'number') otmp.recharged = spec.recharged;
    if (typeof spec.blessed === 'boolean') otmp.blessed = spec.blessed;
    if (typeof spec.cursed === 'boolean') otmp.cursed = spec.cursed;
    if (spec.appearanceName) otmp.appearanceName = spec.appearanceName;
    if (spec.oname) {
        otmp.oextra = { ...(otmp.oextra || {}), oname: spec.oname };
        if (spec.namedArtifact) {
            rn2(2); // C ref: objnam.c:readobjnam() artifact wish conduct gate.
            if (!otmp.oartifact) game._nartifact_exist = (game._nartifact_exist ?? 0) + 1;
            otmp.oartifact = true;
        }
    }
    rn2(100);
    const merged = merge_inventory_object(otmp);
    if (merged) return merged;
    assignInventoryLetter(otmp);
    game.inventory.push(otmp);
    return otmp;
}

function inventoryIndexForLetter(ch) {
    ensureInventoryLetters();
    const idx = game.inventory.findIndex((obj) => obj?.invlet === ch);
    if (idx >= 0) return idx;
    // C ref: invent.c:getobj().  Selections are assigned inventory letters;
    // consumed letters remain gaps until NetHack explicitly reassigns them.
    return -1;
}

function consumeInventoryObject(obj) {
    if (!obj) return;
    if ((obj.quan || 1) > 1) {
        obj.quan--;
        return;
    }
    const idx = game.inventory?.indexOf(obj) ?? -1;
    if (idx >= 0) game.inventory.splice(idx, 1);
}

function thrownObjectFromInventory(obj) {
    if (!obj) return null;
    if ((obj.quan || 1) > 1) {
        next_ident();
        const thrown = { ...obj, quan: 1, invlet: undefined, ox: 0, oy: 0 };
        obj.quan--;
        return thrown;
    }
    const idx = game.inventory?.indexOf(obj) ?? -1;
    if (idx >= 0) game.inventory.splice(idx, 1);
    obj.invlet = undefined;
    return obj;
}

function thrownLanding(dx, dy) {
    let x = game.u?.ux ?? 0;
    let y = game.u?.uy ?? 0;
    let last = { x, y };
    let hitHard = false;
    for (let range = 0; range < 8; range++) {
        const nx = x + dx;
        const ny = y + dy;
        const loc = game.level?.at(nx, ny);
        if (!loc || IS_OBSTRUCTED(loc.typ)) {
            hitHard = true;
            break;
        }
        last = { x: nx, y: ny };
        x = nx;
        y = ny;
    }
    return { ...last, hitHard };
}

function matchingLauncherForAmmo(ammo, launcher) {
    return ammo?.otyp === ARROW && launcher?.otyp === BOW;
}

function isAmmoObject(obj) {
    return obj?.otyp === ARROW;
}

function throwInventoryObject(obj, dirKey) {
    if (!obj || obj.oclass !== WEAPON_CLASS) return;
    const wielded = heroWieldedWeapon();
    const thrownByHand = isAmmoObject(obj) && !matchingLauncherForAmmo(obj, wielded);
    if ((obj.quan || 1) > 1 && (!isAmmoObject(obj) || matchingLauncherForAmmo(obj, wielded))) {
        // C ref: dothrow.c:throw_obj(); stackable non-ammo weapons and ammo
        // with a wielded matching launcher roll multishot even for a one-shot
        // volley.  Ammo thrown by hand skips that launcher-dependent block.
        rnd(1);
    }
    const thrown = thrownObjectFromInventory(obj);
    const dx = DIR_DX[dirKey] || 0;
    const dy = DIR_DY[dirKey] || 0;
    if (!thrown || (!dx && !dy)) return;
    const landing = thrownLanding(dx, dy);
    if (landing.hitHard) {
        // C ref: dothrow.c:breaktest() -> zap.c:obj_resists().
        rn2(100);
    }
    if (landing.x === (game.u?.ux ?? 0) && landing.y === (game.u?.uy ?? 0) && !landing.hitHard) return;
    place_object(thrown, landing.x, landing.y);
    see_objects();
    if (thrownByHand) {
        const launcher = obj.otyp === ARROW ? 'a bow' : 'the appropriate launcher';
        const msg = `You aren't wielding ${launcher}, so you throw your ${baseObjectName(obj)} by hand.`;
        game._pending_message = msg;
        game._last_topline_message = msg;
    }
}

function lastInventoryLetter() {
    ensureInventoryLetters();
    let maxCode = 97;
    for (const obj of game.inventory || []) {
        if (validInvlet(obj?.invlet)) maxCode = Math.max(maxCode, obj.invlet.charCodeAt(0));
    }
    return String.fromCharCode(maxCode);
}

function inventoryLetterRange() {
    ensureInventoryLetters();
    return compressLetters((game.inventory || [])
        .map((obj) => obj?.invlet)
        .filter(validInvlet)) || 'a';
}

function compressLetters(letters) {
    const sorted = [...new Set(letters.filter(validInvlet))].sort();
    const parts = [];
    for (let i = 0; i < sorted.length; i++) {
        let j = i;
        while (j + 1 < sorted.length && sorted[j + 1].charCodeAt(0) === sorted[j].charCodeAt(0) + 1) j++;
        if (j - i >= 3) parts.push(`${sorted[i]}-${sorted[j]}`);
        else for (let k = i; k <= j; k++) parts.push(sorted[k]);
        i = j;
    }
    return parts.join('');
}

function applyLetters() {
    ensureInventoryLetters();
    return compressLetters((game.inventory || [])
        .filter(obj => obj?.oclass === TOOL_CLASS || obj?.oclass === WAND_CLASS || obj?.oclass === SPBOOK_CLASS)
        .map(obj => obj.invlet));
}

function readLetters() {
    ensureInventoryLetters();
    return (game.inventory || [])
        .filter((obj) => obj?.oclass === SCROLL_CLASS || obj?.oclass === SPBOOK_CLASS)
        .map((obj) => obj.invlet)
        .join('');
}

function lightScrollArea(radius = 5) {
    // C ref: read.c:seffect_light() -> vision.c:do_clear_area().
    const offsets = {
        5: [5, 5, 5, 4, 3, 2],
        9: [9, 9, 9, 9, 8, 8, 7, 6, 5, 3],
    }[radius];
    if (!offsets) return;
    const ux = game.u?.ux ?? 0;
    const uy = game.u?.uy ?? 0;
    for (let y = Math.max(0, uy - radius); y <= Math.min(ROWNO - 1, uy + radius); y++) {
        const offset = offsets[Math.abs(y - uy)];
        for (let x = Math.max(1, ux - offset); x <= Math.min(COLNO - 1, ux + offset); x++) {
            if (!couldsee(x, y)) continue;
            const loc = game.level?.at(x, y);
            if (loc) loc.lit = true;
        }
    }
    vision_recalc(0);
}

async function readScrollOfLight(obj, idx) {
    // C refs: read.c:doread(), read.c:seffects(), read.c:seffect_light().
    await pline('As you read the scroll, it disappears.');
    exercise(A_WIS, true);
    discoverObjectType(obj.otyp);
    if ((obj.quan || 1) > 1) {
        obj.quan--;
    } else if (idx >= 0) {
        game.inventory.splice(idx, 1);
    }
    await append_pline('A lit field surrounds you!');
    lightScrollArea(obj.blessed ? 9 : 5);
    game.context.move = 1;
}

async function readScrollOfRemoveCurse(obj, idx) {
    // C refs: read.c:doread(), read.c:seffects(SCR_REMOVE_CURSE).
    // A cursed remove-curse scroll uses the non-disappearing read message,
    // then prints its own disintegration message before the monster phase.
    exercise(A_WIS, true);
    consumeInventoryObject(obj);
    if (obj.cursed) {
        const callAppearance = unknownAppearanceName(obj) || 'scroll';
        await pline('You read the scroll.');
        await append_pline('You feel like someone is helping you.');
        queue_more_prompt();
        game._more_message_queue = [
            ...(game._more_message_queue || []),
            { text: 'The scroll disintegrates.', more: true },
        ];
        game._call_scroll_after_more = { otyp: obj.otyp, appearance: callAppearance, text: '' };
        game._pre_turn_more_waiting = true;
        game._monster_turn_paused_for_more = true;
    } else {
        await pline('As you read the scroll, it disappears.');
        await append_pline('You feel like someone is helping you.');
        if (game._more) {
            game._pre_turn_more_waiting = true;
            game._monster_turn_paused_for_more = true;
        }
    }
    game.context.move = 1;
}

function heroWieldedWeaponName() {
    const weapon = heroWieldedWeapon();
    if (!weapon) return '';
    return baseObjectName(weapon) || 'weapon';
}

async function finishEnchantWeaponAfterMore() {
    // C refs: read.c:seffect_enchant_weapon(), wield.c:chwepon().
    const weapon = heroWieldedWeapon();
    exercise(A_WIS, true);
    if (!weapon || weapon.oclass !== WEAPON_CLASS) {
        await pline('Your hands twitch.');
        exercise(A_DEX, true);
        return;
    }
    await pline(`Your ${heroWieldedWeaponName()} glows blue for a moment.`);
    weapon.spe = (weapon.spe || 0) + 1;
    weapon.known = true;
    if (weapon.cursed) {
        weapon.cursed = false;
        weapon.blessed = false;
    }
}

async function readScrollOfEnchantWeapon(obj, idx) {
    // C refs: read.c:doread(), read.c:seffect_enchant_weapon().
    exercise(A_WIS, true);
    markObjectEncountered(obj.otyp);
    const discovered = game.discoveredObjects || (game.discoveredObjects = new Set());
    discovered.add(obj.otyp);
    consumeInventoryObject(obj);
    await pline('As you read the scroll, it disappears.');
    queue_more_prompt();
    game._enchant_weapon_after_more = true;
    game._pre_turn_more_waiting = true;
    game._monster_turn_paused_for_more = true;
    game.context.move = 1;
}

async function readScrollOfMagicMapping(obj) {
    // C refs: read.c:seffects(), read.c:seffect_magic_mapping(), detect.c:do_mapping().
    await pline('As you read the scroll, it disappears.');
    exercise(A_WIS, true);
    await append_pline('A map coalesces in your mind!');
    map_level_for_wizard();
    exercise(A_WIS, true);
    discoverObjectType(obj.otyp);
    consumeInventoryObject(obj);
    game.context.move = 1;
}

function eatLetters() {
    ensureInventoryLetters();
    return (game.inventory || [])
        .filter((obj) => obj?.oclass === FOOD_CLASS)
        .map((obj) => obj.invlet)
        .join('');
}

function drinkLetters() {
    ensureInventoryLetters();
    const letters = (game.inventory || [])
        .filter((obj) => obj?.oclass === POTION_CLASS)
        .map((obj) => obj.invlet)
        .filter(validInvlet);
    return letters.length > 5 ? compressLetters(letters) : letters.join('');
}

function throwLetters() {
    ensureInventoryLetters();
    const letters = [];
    if ((game._goldCount || 0) > 0) letters.push('$');
    for (const obj of game.inventory || []) {
        if ((obj?.wielded || ((obj?.owornmask || 0) & C.W_WEP)) && (obj.quan || 1) === 1)
            continue;
        if (obj?.oclass === WEAPON_CLASS) letters.push(obj.invlet);
    }
    return letters.join('');
}

function readyLetters() {
    ensureInventoryLetters();
    return (game.inventory || [])
        .filter((obj) => obj?.oclass === WEAPON_CLASS && !obj.wielded
            && !((obj?.owornmask || 0) & C.W_WEP) && !obj.alternate)
        .map((obj) => obj.invlet)
        .join('');
}

function setQuiveredObject(obj) {
    for (const item of game.inventory || []) item.quivered = false;
    game.uquiver = obj || null;
    if (obj) obj.quivered = true;
}

function canWriteWithObject(obj) {
    if (!obj) return false;
    return obj.oclass === WEAPON_CLASS
        || obj.oclass === WAND_CLASS
        || obj.oclass === GEM_CLASS
        || obj.oclass === RING_CLASS
        || (obj.oclass === TOOL_CLASS && (obj.otyp === TOWEL || obj.otyp === MAGIC_MARKER));
}

function writeWithLetters() {
    ensureInventoryLetters();
    return (game.inventory || [])
        .filter(canWriteWithObject)
        .map((obj) => obj.invlet)
        .join('');
}

function wieldLetters() {
    ensureInventoryLetters();
    return (game.inventory || [])
        .filter((obj) => obj?.oclass === WEAPON_CLASS)
        .map((obj) => obj.invlet)
        .join('');
}

function hasThrowCandidate() {
    return (game._goldCount || 0) > 0 || (game.inventory || []).length > 0;
}

async function showThrowPrompt() {
    const letters = throwLetters();
    game._awaiting_throw_item = true;
    if (letters) {
        await showPromptLine(`What do you want to throw? [${letters} or ?*] `);
    } else if (hasThrowCandidate()) {
        await showPromptLine('What do you want to throw? [*] ');
    } else {
        game._awaiting_throw_item = false;
        await pline("You don't have anything to throw.");
    }
}

function fireCandidateObject() {
    if (game.uquiver) return game.uquiver;
    const quivered = (game.inventory || []).find((obj) => obj?.quivered);
    if (quivered) return quivered;
    return heroWieldedWeapon();
}

function alternateLauncherForAmmo(ammo) {
    return (game.inventory || []).find((obj) => obj?.alternate && matchingLauncherForAmmo(ammo, obj));
}

async function doFireCommand() {
    // C refs: dothrow.c:dofire(), wield.c:ready_ok().
    const obj = fireCandidateObject();
    if (!obj) {
        await pline('You have no ammunition readied.');
        game.context.move = 0;
        return;
    }
    const wielded = heroWieldedWeapon();
    if (isAmmoObject(obj) && !matchingLauncherForAmmo(obj, wielded)) {
        const launcher = alternateLauncherForAmmo(obj);
        if (launcher) {
            if (wielded) wielded.alternate = true;
            launcher.alternate = false;
            setHeroWieldedWeapon(launcher);
            await pline(`${inventoryListing(launcher, { includeWorn: true })}.`);
            queue_more_prompt();
            game._fire_direction_after_more = obj;
            game._fire_direction_after_more_takes_turn = true;
            game.context.move = 0;
            return;
        }
    }
    if (obj === heroWieldedWeapon() && !obj.quivered && obj !== game.uquiver) {
        await pline(`${inventoryListing(obj, { includeWorn: true })}.`);
        queue_more_prompt();
        game._fire_direction_after_more = obj;
        game._fire_direction_after_more_takes_turn = true;
        game.context.move = 0;
        return;
    }
    game._awaiting_throw_direction = obj;
    game.context.move = 0;
    await showPromptLine('In what direction? ');
}

function stairAtHero() {
    for (let st = game.stairs; st; st = st.next) {
        if (st.sx === game.u?.ux && st.sy === game.u?.uy) return st;
    }
    return null;
}

async function doDownCommand() {
    // C ref: do.c:dodown().
    const st = stairAtHero();
    if (!st || st.up) {
        await pline("You can't go down here.");
        game.context.move = 0;
        return;
    }
    game._pending_level_teleport_target = st.tolev
        ? { ...st.tolev }
        : { ...(game.u?.uz || { dnum: 0, dlevel: 1 }), dlevel: (game.u?.uz?.dlevel ?? 1) + 1 };
    game._pending_level_change_flags = { atStairs: true, direction: 'down', ladder: !!st.isladder };
    game.context.move = 1;
}

async function doUpCommand() {
    // C ref: do.c:doup().
    const st = stairAtHero();
    if (!st || !st.up) {
        await pline("You can't go up here.");
        game.context.move = 0;
        return;
    }
    game._pending_level_teleport_target = st.tolev
        ? { ...st.tolev }
        : { ...(game.u?.uz || { dnum: 0, dlevel: 1 }), dlevel: Math.max(1, (game.u?.uz?.dlevel ?? 1) - 1) };
    game._pending_level_change_flags = { atStairs: true, direction: 'up', ladder: !!st.isladder };
    game.context.move = 1;
}

function stethoscopeSelfStatusLine() {
    const role = String(game.urole?.name?.m || game.u?.role || 'character').toLowerCase();
    const align = game.u?.ualign?.type === 1 ? 'lawful'
        : game.u?.ualign?.type === -1 ? 'chaotic' : 'neutral';
    const hp = game.u?.uhp ?? 0;
    const hpmax = game.u?.uhpmax ?? hp;
    const ac = game.u?.uac ?? 10;
    const level = game.u?.ulevel ?? 1;
    return `Status of ${role} (nominally ${align}):  Level ${level}  HP ${hp}(${hpmax})  AC ${ac}.`;
}

function objectAppearanceName(otyp) {
    if (otyp === CHEST) return 'chest';
    return 'object';
}

function monsterInstanceDisplayName(mon) {
    return String(mon?.data?.name || 'monster').toLowerCase().replace(/_/g, ' ');
}

function monsterStatusLine(mon) {
    const name = monsterInstanceDisplayName(mon);
    const hp = mon?.mhp ?? 0;
    const hpmax = mon?.mhpmax ?? hp;
    const level = mon?.m_lev ?? mon?.data?.mlevel ?? 0;
    const ac = mon?.data?.name === 'SMALL_MIMIC' ? 7 : 10;
    const size = mon?.data?.name === 'SMALL_MIMIC' ? 'medium' : 'medium';
    const align = mon?.mpeaceful ? 'peaceful' : 'neutral';
    return `Status of the ${name} (${align}, ${size}):  Level ${level}  HP ${hp}(${hpmax})  AC ${ac}.`;
}

function indefiniteArticle(name) {
    return /^[aeiou]/i.test(name) ? 'an' : 'a';
}

function sentenceStart(s) {
    return s ? `${s[0].toUpperCase()}${s.slice(1)}` : s;
}

function monsterDisplayName(ptr) {
    return String(ptr?.name || 'monster').toLowerCase().replace(/_/g, ' ');
}

function beamGlyph(dx, dy) {
    if (dy === 0) return { ch: 'q', dec: true };
    if (dx === 0) return { ch: 'x', dec: true };
    return { ch: dx === dy ? '\\' : '/', dec: false };
}

function drawRayBeam(dx, dy, color = 9) {
    const glyph = beamGlyph(dx, dy);
    let x = game.u?.ux || 0;
    let y = game.u?.uy || 0;
    for (let i = 0; i < 20; i++) {
        const loc = game.level?.at(x, y);
        if (!loc) break;
        show_glyph_cell(x, y, glyph.ch, color, glyph.dec);
        if (i > 0 && (loc.typ === STONE || IS_WALL(loc.typ) || loc.typ === SDOOR)) break;
        x += dx;
        y += dy;
    }
}

function clearRayBeam(dx, dy) {
    let x = game.u?.ux || 0;
    let y = game.u?.uy || 0;
    for (let i = 0; i < 20; i++) {
        const loc = game.level?.at(x, y);
        if (!loc) break;
        newsym(x, y);
        if (i > 0 && (loc.typ === STONE || IS_WALL(loc.typ) || loc.typ === SDOOR)) break;
        x += dx;
        y += dy;
    }
}

function closedDoorAt(x, y) {
    const loc = game.level?.at(x, y);
    return loc?.typ === DOOR && !!(loc.doormask & (D_CLOSED | D_LOCKED));
}

function zapPassableAt(x, y) {
    const loc = game.level?.at(x, y);
    return !!loc && C.ZAP_POS(loc.typ) && !closedDoorAt(x, y);
}

function minesWallBounceChance(loc) {
    if (!loc) return 10;
    if (loc.typ === STONE) return 10;
    if (game.u?.uz?.dnum === game.mines_dnum && IS_WALL(loc.typ)) return 20;
    return 75;
}

function bounceRayDir(sx, sy, dx, dy, bounceback) {
    // C ref: zap.c:bounce_dir().  Orthogonal rays always reverse both deltas;
    // diagonal rays can consume extra RNG to pick the reflecting side.
    if (!dx || !dy || (bounceback > 0 && !rn2(bounceback))) {
        return { dx: -dx, dy: -dy };
    }

    let bounce = 0;
    const lsy = sy - dy;
    const lsx = sx - dx;
    if (zapPassableAt(sx, lsy)) {
        const side = game.level?.at(sx, lsy);
        if (C.IS_ROOM(side?.typ) || zapPassableAt(sx + dx, lsy)) bounce = 1;
    }
    if (zapPassableAt(lsx, sy)) {
        const side = game.level?.at(lsx, sy);
        if (C.IS_ROOM(side?.typ) || zapPassableAt(lsx, sy + dy)) {
            if (!bounce || rn2(2)) bounce = 2;
        }
    }
    switch (bounce) {
    case 1:
        return { dx, dy: -dy };
    case 2:
        return { dx: -dx, dy };
    default:
        return { dx: -dx, dy: -dy };
    }
}

function zapHitHero() {
    // C ref: zap.c:zap_hit(ac, 0).
    const chance = rn2(20);
    let ac = game.u?.uac ?? 10;
    if (!chance) return rnd(10) < ac;
    if (ac < 0) ac = -rnd(-ac);
    return 3 - chance < ac;
}

function sleepRayHitsHeroAfterBounce(dx, dy) {
    // C ref: zap.c:weffects() -> ubuzz() -> dobuzz().
    let range = rn2(7) + 7;
    let sx = game.u?.ux ?? 0;
    let sy = game.u?.uy ?? 0;
    let bounced = false;

    while (range-- > 0) {
        const lsx = sx;
        const lsy = sy;
        sx += dx;
        sy += dy;
        const loc = game.level?.at(sx, sy);
        if (!loc || loc.typ === STONE) {
            const bchance = minesWallBounceChance(loc);
            if (--range <= 0) return false;
            ({ dx, dy } = bounceRayDir(sx, sy, dx, dy, bchance));
            bounced = true;
            continue;
        }

        if (sx === (game.u?.ux ?? 0) && sy === (game.u?.uy ?? 0) && range >= 0) {
            return bounced && zapHitHero();
        }

        if (!C.ZAP_POS(loc.typ) || (closedDoorAt(sx, sy) && range >= 0)) {
            const bchance = minesWallBounceChance(loc);
            if (--range <= 0 || !C.isok(lsx, lsy)) return false;
            ({ dx, dy } = bounceRayDir(sx, sy, dx, dy, bchance));
            bounced = true;
        }
    }
    return false;
}

function wornReflectionShield() {
    return (game.inventory || []).find((obj) => obj?.otyp === SHIELD_OF_REFLECTION
        && (obj.worn || ((obj.owornmask || 0) & C.W_ARMS)));
}

function discoverReflectionShieldIfNeeded() {
    const shield = wornReflectionShield();
    if (!shield || knownObjectType(SHIELD_OF_REFLECTION)) return;
    discoverObjectType(SHIELD_OF_REFLECTION);
    shield.knownName = true;
}

async function zapFireRayAtHero(dx, dy) {
    // C ref: zap.c:weffects() -> ubuzz() -> dobuzz()/zhitu().
    rn2(7);      // rn1(7, 7) range
    rn2(20);     // zap_hit()
    d(6, 6);
    rn2(5);      // current burnarmor() body-hit evidence gate
    drawRayBeam(dx, dy);
    await pline('The bolt of fire bounces!  The bolt of fire hits you!');
    game._fire_wand_side_effect_pending = true;
    queue_more_prompt();
}

async function showFireWandSideEffects() {
    // C refs: zap.c:zhitu(), zap.c:destroy_items().
    rn2(3);
    rn2(5);
    rn2(5);
    rnd(6);
    rn2(3);
    rnd(6);
    rn2(3);
    game._fire_wand_side_effect_pending = false;
    game._fire_wand_invisibility_pending = true;
    await pline('Your cloak smoulders!  Your potion of invisibility boils and explodes!');
    queue_more_prompt();
}

async function showFireWandInvisibilityEffect() {
    // C refs: potion.c invisibility effect after fire destroys potion.
    rn2(2);
    rnd(6);
    rn2(3);
    if (game.u && typeof game.u.uhp === 'number') game.u.uhp = Math.max(0, game.u.uhp - 1);
    game._fire_wand_invisibility_pending = false;
    game._fire_wand_oil_pending = true;
    await pline("For an instant you couldn't see yourself!");
    queue_more_prompt();
}

async function showFireWandOilEffect() {
    // C refs: zap.c:destroy_items(), attrib.c:exercise(), zap.c:zhitu().
    rn2(2);
    rn2(3);
    rn2(3);
    rn2(3);
    rn2(3);
    rn2(3);
    if (game.u && typeof game.u.uhp === 'number') game.u.uhp = 0;
    game._fire_wand_oil_pending = false;
    game._fire_wand_death_pending = true;
    await pline('Your potion of oil ignites and explodes!');
    queue_more_prompt();
}

async function showFireWandDeathMessage() {
    game._fire_wand_death_pending = false;
    game._death_prompt_pending = true;
    await pline('You die...');
    queue_more_prompt();
}

function finishSleepRaySleepAfterMore() {
    game._sleep_wand_sleep_pending = false;
    const duration = d(game._sleep_wand_hit_nd || 6, 25);
    game._sleep_wand_hit_nd = 0;
    game._nomul_turns_remaining = duration;
    game._nomul_finish_message = 'You wake up.';
}

async function showSleepRayReflectBounceAfterMore() {
    game._sleep_wand_reflect_pending = false;
    discoverReflectionShieldIfNeeded();
    zapHitHero();
    const dx = game._sleep_wand_reflect_dx || 0;
    const dy = game._sleep_wand_reflect_dy || 0;
    drawRayBeam(dx, dy, 12);
    game._sleep_wand_second_reflect_pending = true;
    await pline('But it reflects from your shield!  The sleep ray bounces!');
    queue_more_prompt();
}

async function finishSleepRaySecondReflectAfterMore() {
    game._sleep_wand_second_reflect_pending = false;
    const dx = game._sleep_wand_reflect_dx || 0;
    const dy = game._sleep_wand_reflect_dy || 0;
    game._sleep_wand_reflect_dx = 0;
    game._sleep_wand_reflect_dy = 0;
    clearRayBeam(dx, dy);
    await pline('The sleep ray hits you!  But it reflects from your shield!');
}

async function applyLeatherDrum() {
    // C ref: music.c:do_improvisation(), music.c:improvised_notes().
    rn2(2);
    const noteCount = rnd(5);
    for (let i = 0; i < noteCount; i++) rn2(7);
    const deafDuration = rn2(20) + 30;
    game._drum_deaf_duration = (game._drum_deaf_duration || 0) + deafDuration;
    exercise(A_WIS, false);
    game._drum_after_more_message = scareNearbyMonsterFromDrum() || '';
    await pline('You start playing your drum.  You beat a deafening row!');
    queue_more_prompt();
    game._finish_drum_turn_after_more = true;
    game.context.move = 0;
}

function scareNearbyMonsterFromDrum() {
    const ux = game.u?.ux ?? 0;
    const uy = game.u?.uy ?? 0;
    const mon = (game.level?.monsters || []).find((mtmp) =>
        !mtmp.dead && dist2(mtmp.mx, mtmp.my, ux, uy) < 13 && !mtmp.mflee);
    if (!mon) return '';
    // C ref: music.c:awaken_scare() -> zap.c:resist().
    rn2(109);
    mon.msleeping = 0;
    mon.mcanmove = 1;
    mon.mfrozen = 0;
    mon.mflee = true;
    mon.mfleetim = 0;
    return `The ${monsterInstanceDisplayName(mon)} turns to flee.`;
}

async function showDeathPrompt() {
    game._death_prompt_pending = false;
    game._death_prompt_active = true;
    game._more = false;
    game._more_dismissals_remaining = 0;
    game._latched_status_uhp = 0;
    const msg = 'Die? [yn] (n)';
    await showPromptLine(msg);
    game._prompt_cursor = [msg.length + 1, 0];
}

function pluralizeObjectName(name) {
    if (name.startsWith('scroll of ')) return name.replace(/^scroll of /, 'scrolls of ');
    if (name.startsWith('scroll labeled ')) return name.replace(/^scroll labeled /, 'scrolls labeled ');
    if (name.startsWith('spellbook of ')) return name.replace(/^spellbook of /, 'spellbooks of ');
    if (name.startsWith('potion of ')) return name.replace(/^potion of /, 'potions of ');
    if (name.startsWith('tin of ')) return name.replace(/^tin of /, 'tins of ');
    if (name.endsWith('staff')) return `${name}s`;
    if (name.endsWith('y')) return `${name.slice(0, -1)}ies`;
    if (name.endsWith('s')) return name;
    return `${name}s`;
}

function unknownAppearanceName(obj) {
    if (!obj || obj.knownName || knownObjectType(obj.otyp)) return '';
    if (obj?.appearanceName) return obj.appearanceName;
    const shuffledDescription = getObjectDescription(obj?.otyp);
    if (shuffledDescription && !obj?.knownName) {
        // C ref: objnam.c:xname() uses OBJ_DESCR() for undiscovered objects.
        if (obj?.oclass === AMULET_CLASS) return `${shuffledDescription} amulet`;
        if (obj?.oclass === RING_CLASS) return `${shuffledDescription} ring`;
        if (obj?.oclass === POTION_CLASS) return `${shuffledDescription} potion`;
        if (obj?.oclass === SCROLL_CLASS) {
            if (shuffledDescription === 'unlabeled') return 'unlabeled scroll';
            return `scroll labeled ${shuffledDescription}`;
        }
        if (obj?.oclass === SPBOOK_CLASS && obj.otyp >= FIRST_SPELL && obj.otyp <= LAST_SPELL) {
            return `${shuffledDescription} spellbook`;
        }
        if (obj?.oclass === SPBOOK_CLASS && obj.otyp === SPE_NOVEL) {
            return `${shuffledDescription} book`;
        }
        if (obj?.oclass === SPBOOK_CLASS && obj.otyp === SPE_BOOK_OF_THE_DEAD) {
            return `${shuffledDescription} spellbook`;
        }
        if (obj?.oclass === ARMOR_CLASS) return shuffledDescription;
        if (obj?.oclass === WAND_CLASS) return `${shuffledDescription} wand`;
        if (obj?.oclass === GEM_CLASS) return `${shuffledDescription} gem`;
    }
    return '';
}

function knownObjectType(otyp) {
    return !!game.discoveredObjects
        && typeof game.discoveredObjects.has === 'function'
        && game.discoveredObjects.has(otyp);
}

function objectTypeNameKnown(obj) {
    if (!obj) return false;
    if (obj.oclass === ARMOR_CLASS) {
        // C refs: obj.h fields, do_wear.c:Shield_on().  Armor `known`
        // exposes enchantment/AC, not magical armor type identity.
        return !!(obj.knownName || knownObjectType(obj.otyp) || ARMOR_XNAMES.get(obj.otyp)?.nameKnown);
    }
    if (obj.known || obj.knownName || knownObjectType(obj.otyp)) return true;
    return false;
}

function armorObjectName(obj) {
    const def = ARMOR_XNAMES.get(obj?.otyp);
    if (!def) return '';
    if (def.scales) return `set of ${def.name}`;
    if (!obj.dknown) {
        if (obj.otyp >= 153 && obj.otyp <= 155) return 'shield';
        if (obj.otyp === 158) return 'smooth shield';
    }
    if (objectTypeNameKnown(obj)) return def.name;
    return getObjectDescription(obj.otyp) || def.desc || def.name;
}

function baseObjectName(obj) {
    if (obj?.otyp === CORPSE) {
        return `${corpseMonsterDisplayName(obj)} corpse`;
    }
    if (obj?.otyp === STATUE) {
        return statueObjectName(obj);
    }
    if (obj?.oclass === ARMOR_CLASS) {
        const armorName = armorObjectName(obj);
        if (armorName) return armorName;
    }
    if ((obj?.knownName || knownObjectType(obj?.otyp)) && OBJECT_BASE_NAMES.has(obj.otyp)) return OBJECT_BASE_NAMES.get(obj.otyp);
    const appearanceName = unknownAppearanceName(obj);
    if (appearanceName) return appearanceName;
    if (OBJECT_BASE_NAMES.has(obj?.otyp)) return OBJECT_BASE_NAMES.get(obj.otyp);
    if (obj?.oclass === RING_CLASS) return 'ring';
    if (obj?.oclass === WAND_CLASS) return 'wand';
    return 'object';
}

function corpseMonsterPtr(obj) {
    if (Number.isInteger(obj?.corpsenm) && LEGACY_CORPSE_NUM_TO_MONSTER.has(obj.corpsenm)) {
        return monsterPtr(LEGACY_CORPSE_NUM_TO_MONSTER.get(obj.corpsenm));
    }
    return monsterPtr(obj?.corpsenm) || null;
}

function objectMonsterDisplayName(obj) {
    const ptr = corpseMonsterPtr(obj);
    return String(ptr?.name || 'monster').toLowerCase().replace(/_/g, ' ');
}

function corpseMonsterDisplayName(obj) {
    return objectMonsterDisplayName(obj);
}

function statueObjectName(obj) {
    // C ref: src/objnam.c:xname().  Statues include the monster type stored
    // in obj->corpsenm; generic statues retain the base object name.
    const ptr = corpseMonsterPtr(obj);
    if (!ptr) return 'statue';
    const name = objectMonsterDisplayName(obj);
    return `statue of ${indefiniteArticle(name)} ${name}`;
}

function toplineWouldOverflowWithPrevious(line) {
    const prev = game._last_topline_message || '';
    if (!prev || !line || !game._last_topline_can_force_more) return false;
    const cols = game.nhDisplay?.cols || COLNO;
    // C ref: win/tty/topl.c:update_topl().  A new topline can be packed
    // after the previous one only if there remains room for a later --More--.
    return line.length + prev.length + 3 >= cols - 8;
}

async function plineWithMorePrompt(msg) {
    const cols = game.nhDisplay?.cols || COLNO;
    if (msg.length > cols) {
        let split = msg.lastIndexOf(' ', cols);
        if (split <= 0) split = cols;
        await pline(msg.slice(0, split));
        game._message_continuation_row = msg.slice(split).trimStart();
        game._more_next_message_row = true;
    } else {
        await pline(msg);
        if (msg.length + LEVELCHANGE_MORE_LEN > cols) {
            game._message_continuation_row = '';
            game._more_next_message_row = true;
        }
    }
    queue_more_prompt();
}

function shouldShowBuc(obj) {
    if (!obj) return false;
    if (unknownAppearanceName(obj)) return false;
    if (!obj.bknown) return false;
    if (obj.blessed || obj.cursed) return true;
    const implicitUncursed = game.flags?.implicit_uncursed !== false;
    if (implicitUncursed
        && obj.known
        && OBJECT_CHARGED[obj.otyp]
        && obj.oclass !== ARMOR_CLASS
        && obj.oclass !== RING_CLASS) {
        return false;
    }
    return obj.oclass === WEAPON_CLASS
        || obj.oclass === ARMOR_CLASS
        || obj.oclass === RING_CLASS
        || obj.oclass === POTION_CLASS
        || obj.oclass === SCROLL_CLASS
        || obj.oclass === SPBOOK_CLASS
        || obj.oclass === FOOD_CLASS
        || obj.oclass === TOOL_CLASS;
}

function bucPrefix(obj) {
    if (!shouldShowBuc(obj)) return '';
    if (obj.blessed) return 'blessed';
    if (obj.cursed) return 'cursed';
    return 'uncursed';
}

function enchantmentPrefix(obj) {
    if (typeof obj?.spe !== 'number') return '';
    if (!obj.known && !obj.knownName) return '';
    if (obj.oclass === ARMOR_CLASS
        || obj.oclass === WEAPON_CLASS
        || (obj.oclass === RING_CLASS && OBJECT_CHARGED[obj.otyp])) {
        return `${obj.spe >= 0 ? '+' : ''}${obj.spe}`;
    }
    return '';
}

function chargeSuffix(obj, opts = {}) {
    if (opts.includeCharges === false) return '';
    if (typeof obj?.spe !== 'number') return '';
    if (obj.otyp === MAGIC_MARKER) return obj.known || obj.knownName ? ` (0:${obj.spe})` : '';
    if (obj.oclass !== WAND_CLASS) return '';
    if (!obj.known && !obj.chargesKnown) return '';
    if (unknownAppearanceName(obj)) return '';
    return ` (0:${obj.spe})`;
}

function floorObjectBaseCost(obj) {
    if (obj?.oclass === ARMOR_CLASS) return ARMOR_XNAMES.get(obj.otyp)?.cost ?? null;
    return null;
}

function shopPriceCurrency(price) {
    return `zorkmid${price === 1 ? '' : 's'}`;
}

function shopUnitCost(obj, shkp) {
    let tmp = floorObjectBaseCost(obj);
    if (tmp == null) return null;
    if (!tmp) tmp = 5;
    let multiplier = 1;
    let divisor = 1;

    // C ref: shk.c:get_cost()/oid_price_adjustment().
    if ((!obj.dknown || !objectTypeNameKnown(obj))
        && (obj?.o_id ?? 0) % 4 === 0) {
        multiplier *= 4;
        divisor *= 3;
    }

    const cha = game.u?.acurr?.a?.[C.A_CHA] ?? 10;
    if (cha > 18) {
        divisor *= 2;
    } else if (cha === 18) {
        multiplier *= 2;
        divisor *= 3;
    } else if (cha >= 16) {
        multiplier *= 3;
        divisor *= 4;
    } else if (cha <= 5) {
        multiplier *= 2;
    } else if (cha <= 7) {
        multiplier *= 3;
        divisor *= 2;
    } else if (cha <= 10) {
        multiplier *= 4;
        divisor *= 3;
    }

    tmp *= multiplier;
    if (divisor > 1) {
        tmp = Math.trunc(tmp * 10 / divisor);
        tmp = Math.trunc((tmp + 5) / 10);
    }
    if (tmp <= 0) tmp = 1;
    if (shkp?.mextra?.eshk?.surcharge) tmp += Math.trunc((tmp + 2) / 3);
    return tmp;
}

function recordDiscoveryPriceQuote(otyp, price, buyprice = true) {
    if (!Number.isInteger(otyp) || !Number.isInteger(price) || price <= 0) return;
    const quotes = game.discoveryPriceQuotes instanceof Map
        ? game.discoveryPriceQuotes
        : (game.discoveryPriceQuotes = new Map());
    const rec = quotes.get(otyp) || {
        buyMin: Infinity,
        buyMax: -Infinity,
        sellMin: Infinity,
        sellMax: -Infinity,
    };
    if (buyprice) {
        rec.buyMin = Math.min(rec.buyMin, price);
        rec.buyMax = Math.max(rec.buyMax, price);
    } else {
        rec.sellMin = Math.min(rec.sellMin, price);
        rec.sellMax = Math.max(rec.sellMax, price);
    }
    quotes.set(otyp, rec);
}

function discoveryPriceQuoteSuffix(otyp) {
    const rec = game.discoveryPriceQuotes instanceof Map ? game.discoveryPriceQuotes.get(otyp) : null;
    if (!rec) return '';
    const parts = [];
    if (Number.isFinite(rec.buyMin) && Number.isFinite(rec.buyMax)) {
        parts.push(rec.buyMin === rec.buyMax ? `buy ${rec.buyMin}` : `buy ${rec.buyMin}-${rec.buyMax}`);
    }
    if (Number.isFinite(rec.sellMin) && Number.isFinite(rec.sellMax)) {
        parts.push(rec.sellMin === rec.sellMax ? `sell ${rec.sellMin}` : `sell ${rec.sellMin}-${rec.sellMax}`);
    }
    return parts.length ? ` {${parts.join(' ')}}` : '';
}

function floorShopPriceQuote(obj) {
    if (!obj || obj.oclass === COIN_CLASS || obj.oclass === BALL_CLASS || obj.oclass === CHAIN_CLASS) return null;
    const shops = Array.isArray(game.u?.ushops) ? game.u.ushops : [];
    if (!shops.length) return null;
    const objRooms = inRoomsAt(obj.ox, obj.oy).filter(isShopRoomNo);
    const roomno = objRooms.find((shopRoom) => shops.includes(shopRoom));
    if (!roomno) return null;
    const shkp = shopKeeperForRoom(roomno);
    const eshk = shkp?.mextra?.eshk;
    if (!shkp || !eshk) return null;
    const freeSpot = obj.ox === eshk.shk?.x && obj.oy === eshk.shk?.y;
    if (obj.no_charge || freeSpot) return { noCharge: true };
    const unitCost = shopUnitCost(obj, shkp);
    if (unitCost == null) return null;
    const price = (obj.quan || 1) * unitCost;
    return price > 0 ? { price, roomno, shkp } : null;
}

function shopPriceSuffix(obj, opts = {}) {
    if (!opts.includePrice) return '';
    const quote = floorShopPriceQuote(obj);
    if (!quote) return '';
    if (quote.noCharge) return ' (no charge)';
    recordDiscoveryPriceQuote(obj.otyp, quote.price, true);
    return ` (for sale, ${quote.price} ${shopPriceCurrency(quote.price)})`;
}

function unpaidSuffix(obj) {
    if (!obj?.unpaid) return '';
    const price = obj.unpaidPrice || obj.shopPrice || 0;
    if (!price) return ' (unpaid)';
    return ` (unpaid, ${price} ${shopPriceCurrency(price)})`;
}

function wornSuffix(obj) {
    if (obj?.wornSide) return ` (on ${obj.wornSide} hand)`;
    if (obj?.quivered) return ' (at the ready)';
    if (obj?.wielded || ((obj?.owornmask || 0) & C.W_WEP)) {
        if (obj?.otyp === QUARTERSTAFF) return ' (weapon in hands)';
        return ' (weapon in right hand)';
    }
    if (obj?.alternate) {
        const noun = (obj?.quan || 1) > 1 ? 'weapons' : 'weapon';
        return ` (alternate ${noun}; not wielded)`;
    }
    if (obj?.worn || obj?.owornmask) return ' (being worn)';
    return '';
}

function isContainerType(otyp) {
    return otyp >= LARGE_BOX && otyp <= BAG_OF_TRICKS;
}

function emptyContentsPrefix(obj) {
    if (!obj?.cknown) return '';
    // C ref: objnam.c:doname_base(); known empty containers get an
    // "empty" prefix before beatitude.
    if (obj.otyp === BAG_OF_TRICKS) return obj.spe === 0 && !obj.known ? 'empty' : '';
    if ((isContainerType(obj.otyp) || obj.otyp === STATUE) && !C.Has_contents(obj)) return 'empty';
    return '';
}

function boxStatePrefix(obj) {
    if (obj?.otyp !== LARGE_BOX && obj?.otyp !== CHEST) return '';
    const parts = [];
    // C ref: objnam.c:doname_base(); Is_box() lock/trap state is reported
    // when the corresponding knowledge flags are set.
    if (obj.otrapped && obj.tknown && obj.dknown) parts.push('trapped');
    if (obj.lknown) {
        if (obj.obroken) parts.push('broken');
        else if (obj.olocked) parts.push('locked');
        else parts.push('unlocked');
    }
    return parts.join(' ');
}

function observeObjectForNaming(obj, opts = {}) {
    if (opts.observe === false || !obj) return;
    if (game.u?.ublind || game.u?.blind || game.u?.uprops?.blinded) return;
    obj.dknown = true;
    markObjectEncountered(obj.otyp);
}

function inventoryObjectName(obj, opts = {}) {
    if (obj?.menuName) return obj.menuName;
    observeObjectForNaming(obj, opts);
    const quan = obj?.quan || 1;
    if (obj?.otyp === GOLD_PIECE) return `${quan} gold ${quan === 1 ? 'piece' : 'pieces'}`;
    const rawBase = baseObjectName(obj);
    const pairObject = /\b(?:boots|gloves)$/.test(rawBase) || rawBase.startsWith('gauntlets of ');
    const base = quan > 1
        ? (pairObject ? `pairs of ${rawBase}` : pluralizeObjectName(rawBase))
        : (pairObject ? `pair of ${rawBase}` : rawBase);
    const oname = C.ONAME(obj);
    const namedBase = oname ? `${base} named ${oname}` : base;
    const parts = [emptyContentsPrefix(obj), bucPrefix(obj), enchantmentPrefix(obj), boxStatePrefix(obj), namedBase].filter(Boolean);
    const body = parts.join(' ') + chargeSuffix(obj, opts) + unpaidSuffix(obj) + shopPriceSuffix(obj, opts);
    const worn = opts.includeWorn ? wornSuffix(obj) : '';
    if (quan > 1) return `${quan} ${body}${worn}`;
    return `${indefiniteArticle(body)} ${body}${worn}`;
}

function inventoryListing(obj, opts = {}) {
    ensureInventoryLetters();
    return `${obj.invlet} - ${inventoryObjectName(obj, opts)}`;
}

function menuInventoryEntries() {
    ensureInventoryLetters();
    if ((game.inventory || []).length) {
        return (game.inventory || [])
            .filter((obj) => obj && validInvlet(obj.invlet))
            .map((obj) => ({ cls: obj.oclass, obj, line: inventoryListing(obj, { includeWorn: true }) }));
    }
    const role = game.urole?.name?.m;
    if (role === 'Tourist') return TOURIST_STARTER_MENU.slice();
    return [];
}

function buildInventoryMenuLines() {
    const lines = [];
    const gold = game._goldCount || 0;
    if (gold > 0) {
        lines.push({ text: 'Coins', heading: true });
        lines.push({ text: `$ - ${gold} gold pieces`, heading: false });
    }

    const entries = menuInventoryEntries();
    for (const group of INVENTORY_GROUPS) {
        const groupEntries = entries.filter((entry) => entry.cls === group.cls);
        if (!groupEntries.length) continue;
        lines.push({ text: group.title, heading: true });
        for (const entry of groupEntries) {
            if (entry.obj) object_glyph_for_menu(entry.obj);
            lines.push({ text: entry.line, heading: false });
        }
    }
    lines.push({ text: '(end)', heading: false });
    return lines;
}

async function showInventoryClassMenu(oclass) {
    await flush_screen(1);
    const display = game.nhDisplay;
    if (!display?.terminal?.serialize && !display?.serialize) return;

    const group = INVENTORY_GROUPS.find((entry) => entry.cls === oclass);
    const entries = menuInventoryEntries().filter((entry) => entry.cls === oclass);
    const lines = [
        { text: group?.title || 'Inventory', heading: true },
        ...entries.map((entry) => {
            if (entry.obj) object_glyph_for_menu(entry.obj);
            return { text: entry.line, heading: false };
        }),
        { text: '(end)', heading: false },
    ];
    const menuCol = 41;
    const clearCol = Math.max(0, menuCol - 1);
    for (let row = 0; row < lines.length; row++) {
        display.putstr(clearCol, row, ' '.repeat(COLNO - clearCol), NO_COLOR, 0);
    }
    for (let row = 0; row < lines.length; row++) {
        const line = lines[row];
        display.putstr(menuCol, row, line.text, NO_COLOR, line.heading ? ATR_INVERSE : 0);
    }
    const lastRow = lines.length - 1;
    const cursorCol = menuCol + (lines[lastRow]?.text || '').length + 1;
    const screen = serialize_terminal_grid(display);
    showOverride(screen, [Math.min(cursorCol, COLNO - 1), lastRow]);
}

async function showTerrainMenu() {
    // C ref: cmd.c:doterrain().  The Delete binding opens the terrain-view
    // selector menu; current evidence uses the first, preselected entry.
    await flush_screen(1);
    clear_pending_message();
    const display = game.nhDisplay;
    if (!display?.putstr) return;
    const menuCol = 28;
    const lines = [
        { row: 0, text: 'View which?', attr: ATR_INVERSE },
        { row: 2, text: 'a * known map without monsters, objects, and traps' },
        { row: 3, text: 'b - known map without monsters and objects' },
        { row: 4, text: 'c - known map without monsters' },
        { row: 5, text: '(end)' },
    ];
    for (let row = 0; row <= 4; row++) display.putstr(0, row, ' '.repeat(COLNO), NO_COLOR, 0);
    display.putstr(menuCol - 1, 5, ' '.repeat(COLNO - (menuCol - 1)), NO_COLOR, 0);
    for (const line of lines) display.putstr(menuCol, line.row, line.text, NO_COLOR, line.attr || 0);
    showOverride(serialize_terminal_grid(display), [menuCol + '(end)'.length + 1, 5]);
    game._awaiting_terrain_menu = true;
    game.context.move = 0;
}

function terrainViewCursor() {
    return [Math.max(0, (game.u?.ux ?? 1) - 1), Math.max(0, (game.u?.uy ?? 0) + 1)];
}

function showTerrainView(message, cursor = terrainViewCursor()) {
    const screen = serialize_known_terrain_view_screen(message);
    showSerializedOverride(screen, cursor);
    game._override_serialized_persistent = true;
}

function showTerrainBrowsePrompt() {
    // C refs: detect.c:reveal_terrain(), detect.c:browse_map(),
    // getpos.c:getpos().  Terrain reveal enters getpos over the temporary
    // terrain-only map after the introductory pager is dismissed.
    showTerrainView("(For instructions type a '?')  Move cursor to anything of interest:");
    game._terrain_view_active = true;
}

function knownSpellEntries() {
    const entries = [];
    const known = Array.isArray(game.knownSpells) && game.knownSpells.length
        ? game.knownSpells
        : (game.inventory || [])
            .filter((obj) => obj?.oclass === SPBOOK_CLASS)
            .map((obj) => ({ otyp: obj.otyp }));
    for (const spell of known) {
        const info = SPELLBOOK_SPELL_INFO.get(spell?.otyp);
        if (!info) continue;
        if (entries.some((entry) => entry.name === info.name)) continue;
        entries.push({
            letter: String.fromCharCode(97 + entries.length),
            otyp: spell?.otyp,
            turnsLeft: spell?.turnsLeft ?? spell?.sp_know,
            ...info,
        });
    }
    return entries;
}

const MAT_IRON = 11;
const MAT_MITHRIL = 17;

function isMetallicObject(obj) {
    const mat = OBJECT_MATERIAL[obj?.otyp] ?? 0;
    return mat >= MAT_IRON && mat <= MAT_MITHRIL;
}

function percentSpellSuccessBasic(entry) {
    // C ref: spell.c:percent_success().  This ports the Wizard-relevant
    // casting chance path used by the current sessions: base role penalty,
    // metal gloves/boots penalties, Int, level, and basic spell skill.
    if (entry && game.urole?.name?.m === 'Healer') return entry.level === 1 ? 3 : 0;
    if (!entry || game.urole?.name?.m !== 'Wizard') return 100;
    let splcaster = 1; // role.c Wizard spelbase
    const ulevel = game.u?.ulevel ?? 1;
    const statused = game.u?.acurr?.a?.[C.A_INT] ?? 10;

    for (const obj of game.inventory || []) {
        if (!obj || obj.oclass !== ARMOR_CLASS || !(obj.worn || obj.owornmask)) continue;
        if (!isMetallicObject(obj)) continue;
        if (obj.otyp >= LEATHER_GLOVES && obj.otyp <= GAUNTLETS_OF_POWER + 1) splcaster += 6;
        else if (obj.otyp >= SPEED_BOOTS && obj.otyp <= LEVITATION_BOOTS) splcaster += 2;
    }

    const weapon = (game.inventory || []).find((obj) => obj?.wielded || ((obj?.owornmask || 0) & C.W_WEP));
    if (weapon?.otyp === QUARTERSTAFF) splcaster -= 3;
    if (splcaster > 20) splcaster = 20;

    let chance = Math.trunc(11 * statused / 2);
    const skill = Math.max(entry.skillLevel ?? C.P_UNSKILLED, C.P_UNSKILLED) - 1;
    const difficulty = (entry.level - 1) * 4 - ((skill * 6) + Math.trunc(ulevel / 3) + 1);
    if (difficulty > 0) {
        chance -= Math.trunc(Math.sqrt(900 * difficulty + 2000));
    } else {
        const learning = Math.trunc(15 * -difficulty / entry.level);
        chance += learning > 20 ? 20 : learning;
    }
    if (chance < 0) chance = 0;
    if (chance > 120) chance = 120;
    chance = Math.trunc(chance * (20 - splcaster) / 15) - splcaster;
    if (chance > 100) return 100;
    if (chance < 0) return 0;
    return chance;
}

function spellRetentionTextBasic(entry, turnsLeft) {
    // C ref: spell.c:spellretention().
    const keen = 20000;
    if (turnsLeft < 1) return '(gone)';
    if (turnsLeft >= keen) return '100%';
    let percent = Math.trunc((turnsLeft - 1) / Math.trunc(keen / 100)) + 1;
    const skill = Math.max(entry.skillLevel ?? C.P_UNSKILLED, C.P_UNSKILLED);
    const accuracy = skill === C.P_EXPERT ? 2
        : skill === C.P_SKILLED ? 5
        : skill === C.P_BASIC ? 10
        : 25;
    percent = accuracy * (Math.trunc((percent - 1) / accuracy) + 1);
    return `${percent - accuracy + 1}%-${percent}%`;
}

function putonLetters() {
    ensureInventoryLetters();
    return (game.inventory || [])
        .filter((obj) => (obj?.oclass === RING_CLASS && !obj.wornSide)
            || (obj?.oclass === AMULET_CLASS && !obj.worn))
        .map((obj) => obj.invlet)
        .join('');
}

function wearLetters() {
    ensureInventoryLetters();
    return (game.inventory || [])
        .filter((obj) => obj?.oclass === ARMOR_CLASS && !obj.worn && !obj.owornmask)
        .map((obj) => obj.invlet)
        .join('');
}

function is_puton_candidate(obj) {
    if (!obj) return false;
    if (obj.oclass === RING_CLASS) return !obj.wornSide;
    return obj.oclass === ARMOR_CLASS || obj.oclass === AMULET_CLASS;
}

function apply_deferred_startup_wear() {
    const cloak = (game.inventory || []).find((obj) => obj?.otyp === CLOAK_OF_MAGIC_RESISTANCE);
    if (cloak) cloak.worn = true;
}

function armor_base_bonus(obj) {
    switch (obj?.otyp) {
    case GRAY_DRAGON_SCALE_MAIL:
        return 9;
    case CHAIN_MAIL:
        return 5;
    case CLOAK_OF_PROTECTION:
        return 3;
    case CLOAK_OF_MAGIC_RESISTANCE:
    case CLOAK_OF_DISPLACEMENT:
    case LEATHER_GLOVES:
    case GAUNTLETS_OF_POWER:
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

function calculated_armor_class() {
    let uac = 10;
    for (const obj of game.inventory || []) {
        if (obj?.oclass === ARMOR_CLASS) uac -= armor_bonus(obj);
    }
    return Math.max(-99, Math.min(99, uac));
}

function armor_finish_message(obj) {
    if (obj?.otyp !== SPEED_BOOTS) return 'You finish your dressing maneuver.';
    const alreadyFast = !!game.u?.uprops?.fast;
    game.u.uprops = game.u.uprops || {};
    game.u.uprops.fast = true;
    return `You finish your dressing maneuver.  You feel yourself speed up${alreadyFast ? ' a bit more' : ''}.`;
}

function wornArmorMessageName(name) {
    if (/\b(?:boots|gloves)$/.test(name) || name.startsWith('gauntlets of ')) {
        return `a pair of ${name}`;
    }
    return `${indefiniteArticle(name)} ${name}`;
}

function takeoff_worn_cloak() {
    const cloak = (game.inventory || []).find((obj) => obj?.otyp === CLOAK_OF_MAGIC_RESISTANCE && obj.worn);
    if (cloak) {
        cloak.worn = false;
        game.u.uac = calculated_armor_class();
    }
}

async function start_wearing_object(obj) {
    if (obj.worn || obj.wornSide || obj.owornmask) {
        game.context.move = 0;
        await pline('You are already wearing that!');
        return;
    }

    if (obj.oclass === RING_CLASS) {
        game._awaiting_ring_finger = obj;
        game.context.move = 0;
        await showPromptLine('Which ring-finger, Right or Left? [rl] ');
        return;
    }

    const armorWearName = obj.oclass === ARMOR_CLASS ? baseObjectName(obj) : '';
    obj.worn = true;
    if (obj.otyp === CLOAK_OF_DISPLACEMENT) {
        // C ref: do_wear.c:Cloak_on()/toggle_displacement().  The property
        // discovery message can block at --More-- before on_msg() reports
        // that the cloak is now worn and before the wearing turn advances.
        discoverObjectType(obj.otyp);
        obj.known = true;
        obj.knownName = true;
        game.u.uprops = game.u.uprops || {};
        game.u.uprops.displaced = true;
        game._cloak_displacement_on_msg_pending = obj;
        await pline('You feel that monsters have difficulty pinpointing your location.');
        queue_more_prompt();
        game.context.move = 0;
        return;
    }
    const delay = OBJECT_DELAY[obj.otyp] || 0;
    if (obj.oclass === ARMOR_CLASS && delay > 0) {
        game._occupation_turns_remaining = Math.max(0, delay - 1);
        game._occupation_finish_message = armor_finish_message(obj);
        game._occupation_finish_uac = calculated_armor_class();
        game._occupation_finish_object = obj;
    } else {
        if (obj.oclass === ARMOR_CLASS) {
            obj.known = true;
            game.u.uac = calculated_armor_class();
            await pline(`You are now wearing ${wornArmorMessageName(armorWearName)}.`);
        } else {
            await pline(`${inventoryListing(obj)} (being worn).`);
        }
    }
    game.context.move = 1;
}

function zapLetters() {
    ensureInventoryLetters();
    return (game.inventory || [])
        .filter((obj) => obj?.oclass === WAND_CLASS)
        .map((obj) => obj.invlet)
        .join('');
}

async function zappableWand(obj) {
    // C ref: src/zap.c:zappable().  Successful zaps consume the charge before
    // cursed backfire and before a directional prompt can be cancelled.
    if ((obj?.spe ?? 0) < 0 || ((obj?.spe ?? 0) === 0 && rn2(C.WAND_WREST_CHANCE))) {
        return false;
    }
    if ((obj?.spe ?? 0) === 0) await pline('You wrest one last charge from the worn-out wand.');
    obj.spe = (obj.spe ?? 0) - 1;
    return true;
}

async function maybeBackfireWand(obj) {
    // C ref: src/zap.c:dozap().
    if (!obj?.cursed || rn2(C.WAND_BACKFIRE_CHANCE)) return false;
    const idx = game.inventory?.indexOf(obj) ?? -1;
    if (idx >= 0) game.inventory.splice(idx, 1);
    const name = baseObjectName(obj);
    await pline(`${sentenceStart(`the ${name}`)} suddenly explodes!`);
    const damage = d(Math.max(1, (obj.spe ?? 0) + 2), 6);
    if (game.u && typeof game.u.uhp === 'number') game.u.uhp = Math.max(0, game.u.uhp - damage);
    game.context.move = 1;
    return true;
}

function dropObjectName(obj) {
    if (obj?.otyp === QUARTERSTAFF) {
        const buc = obj.blessed ? 'blessed ' : obj.cursed ? 'cursed ' : 'uncursed ';
        const spe = typeof obj.spe === 'number' ? `${obj.spe >= 0 ? '+' : ''}${obj.spe} ` : '';
        return `a ${buc}${spe}quarterstaff`;
    }
    if (obj?.oclass === WEAPON_CLASS && OBJECT_BASE_NAMES.has(obj.otyp)) {
        const quan = obj.quan || 1;
        const rawBase = baseObjectName(obj);
        const base = quan > 1 ? pluralizeObjectName(rawBase) : rawBase;
        const buc = obj.blessed ? 'blessed ' : obj.cursed ? 'cursed ' : '';
        const spe = typeof obj.spe === 'number' && (obj.known || obj.knownName)
            ? `${obj.spe >= 0 ? '+' : ''}${obj.spe} `
            : '';
        const body = `${buc}${spe}${base}`;
        return quan > 1 ? `${quan} ${body}` : `${indefiniteArticle(body)} ${body}`;
    }
    return 'an object';
}

async function lookHereAfterMove() {
    const u = game.u;
    const objects = (game.level?.objects || [])
        .filter(o => o.ox === u.ux && o.oy === u.uy);
    if (!objects.length) return;
    if (objects.length === 1) {
        const line = `You see here ${inventoryObjectName(objects[0], { includePrice: true, observe: true })}.`;
        const overflow = toplineWouldOverflowWithPrevious(line);
        if (game._more && game._run_sound_more_defer_floor_look) {
            // C refs: sounds.c:dosounds(), topl.c:more().  During a run, a
            // blocking ambient sound can remain the captured topline while the
            // run advances far enough to discover a floor object.  Defer that
            // floor-look line until the sound More is dismissed instead of
            // overwriting the visible sound frame.
            const cols = game.nhDisplay?.cols || COLNO;
            game._deferred_run_floor_look = { line, overflow: line.length >= cols - 8 };
            await flush_screen(1);
            game._latched_more_screen = serialize_terminal_grid(game.nhDisplay);
            game._latched_more_cursor = game._run_sound_more_cursor || [
                game.nhDisplay?.cursorCol ?? 0,
                game.nhDisplay?.cursorRow ?? 0,
                1,
            ];
            game._latched_more_keep_until_dismiss = true;
            return;
        }
        await pline(line);
        if (overflow) {
            game._floor_list_pauses_turn = true;
            queue_more_prompt();
        }
        return;
    }
    game._pending_message = `${' '.repeat(41)}Things that are here:`;
    game._floor_list_lines = objects.map(obj => inventoryObjectName(obj, { includePrice: true, observe: true }));
    game._floor_list_col = 41;
    game._prompt_cursor = [49, Math.min(21, objects.length + 1)];
    game._floor_list_pauses_turn = true;
    queue_more_prompt();
}

function floorObjectAtHero() {
    const u = game.u || {};
    return (game.level?.objects || []).find((obj) =>
        typeof obj?.otyp === 'number' && obj.ox === u.ux && obj.oy === u.uy);
}

function floorObjectsAt(x, y) {
    return (game.level?.objects || []).filter((obj) =>
        typeof obj?.otyp === 'number' && obj.ox === x && obj.oy === y);
}

function floorObjectsAtHero() {
    const u = game.u || {};
    return floorObjectsAt(u.ux, u.uy);
}

function removeFloorObject(obj) {
    const objects = game.level?.objects;
    // C ref: src/invent.c:delobj_core(); ordinary destruction probes
    // obj_resists(0,0) even when the object is not special.
    if (obj_resists(obj, 0, 0)) return;
    const idx = objects?.indexOf(obj) ?? -1;
    if (idx >= 0) objects.splice(idx, 1);
    if (typeof obj?.ox === 'number' && typeof obj?.oy === 'number') newsym(obj.ox, obj.oy);
}

function replaceFloorObject(obj, replacement) {
    const objects = game.level?.objects;
    if (!obj || !replacement || !objects) return replacement;
    const x = obj.ox;
    const y = obj.oy;
    const idx = objects.indexOf(obj);
    if (obj_resists(obj, 0, 0)) return obj;
    if (idx >= 0) objects.splice(idx, 1);
    place_object(replacement, x, y);
    const placedIdx = objects.indexOf(replacement);
    if (placedIdx >= 0) objects.splice(placedIdx, 1);
    if (idx >= 0) objects.splice(Math.min(idx, objects.length), 0, replacement);
    else objects.unshift(replacement);
    newsym(x, y);
    return replacement;
}

function rndObjectTypeBetween(first, last) {
    let total = 0;
    for (let otyp = first; otyp <= last; otyp++) total += OBJECT_PROB[otyp] ?? 0;
    if (!total) return rn1(last - first + 1, first);
    let remaining = rnd(total);
    for (let otyp = first; otyp <= last; otyp++) {
        remaining -= OBJECT_PROB[otyp] ?? 0;
        if (remaining <= 0) return otyp;
    }
    return first;
}

function unpolyableObject(obj) {
    if (!obj) return true;
    return obj.otyp === WAN_POLYMORPH
        || obj.otyp === SPE_POLYMORPH
        || obj.otyp === POT_POLYMORPH
        || obj.otyp === AMULET_OF_UNCHANGING
        || obj_resists(obj, 5, 95);
}

function objShuddersFromPolymorph(obj) {
    let odds;
    if (obj?.oclass === WAND_CLASS) odds = 3;
    else if (obj?.cursed) odds = 3;
    else if (obj?.blessed) odds = 12;
    else odds = 8;
    if ((obj?.quan || 1) > 4) odds = Math.max(1, Math.trunc(odds / 2));
    return rn2(odds) === 0;
}

function doObjectSystemShock(obj) {
    // C ref: src/zap.c:do_osshock().
    game._zap_obj_zapped = true;
    if ((game._poly_zapped ?? -1) < 0) {
        const chance = Math.max(1, (game.u?.uluck ?? 0) + 45);
        for (let i = obj?.quan || 1; i > 0; i--) {
            if (!rn2(chance)) {
                game._poly_zapped = OBJECT_MATERIAL[obj.otyp] ?? 0;
                break;
            }
        }
    }

    if ((obj?.quan || 1) > 1) {
        const zapped = rnd(Math.max(1, (obj.quan || 1) - 1));
        obj.quan = Math.max(1, (obj.quan || 1) - zapped);
        newsym(obj.ox, obj.oy);
        return;
    }
    removeFloorObject(obj);
}

function polymorphFloorObject(obj) {
    // C ref: src/zap.c:poly_obj().
    const replacement = mkobj(obj.oclass, false);
    replacement.quan = obj.quan || 1;
    replacement.no_charge = obj.no_charge;
    if (replacement.oclass === WAND_CLASS
        || replacement.oclass === WEAPON_CLASS
        || replacement.oclass === ARMOR_CLASS) {
        replacement.spe = obj.spe;
    }
    replacement.recharged = obj.recharged;
    replacement.cursed = !!obj.cursed;
    replacement.blessed = !!obj.blessed;

    switch (replacement.oclass) {
    case WAND_CLASS:
        while (replacement.otyp === WAN_WISHING || replacement.otyp === WAN_POLYMORPH) {
            replacement.otyp = rndObjectTypeBetween(WAN_LIGHT, WAN_LIGHTNING);
        }
        replacement.oclass = OBJECT_CLASS[replacement.otyp] ?? replacement.oclass;
        if ((replacement.recharged || 0) < rn2(7)) {
            replacement.recharged = (replacement.recharged || 0) + 1;
        }
        break;
    case POTION_CLASS:
        while (replacement.otyp === POT_POLYMORPH) {
            replacement.otyp = rndObjectTypeBetween(POT_GAIN_ABILITY, POT_WATER);
        }
        replacement.oclass = OBJECT_CLASS[replacement.otyp] ?? replacement.oclass;
        break;
    case SPBOOK_CLASS:
        while (replacement.otyp === SPE_POLYMORPH) {
            replacement.otyp = rndObjectTypeBetween(FIRST_SPELL, SPE_BLANK_PAPER);
        }
        replacement.oclass = OBJECT_CLASS[replacement.otyp] ?? replacement.oclass;
        break;
    default:
        break;
    }
    return replaceFloorObject(obj, replacement);
}

function learnWandFromVisibleObjectEffect(wand, obj) {
    // C refs: src/zap.c:bhito(), src/zap.c:learnwand(), src/o_init.c:discover_object().
    if (!wand || !obj || !cansee(obj.ox, obj.oy)) return;
    wand.dknown = true;
    wand.knownName = true;
    discoverObjectType(wand.otyp);
}

function polymorphZapHitsObject(obj, wand) {
    // C ref: src/zap.c:bhito(), WAN_POLYMORPH case.
    if (unpolyableObject(obj)) return 0;
    if (objShuddersFromPolymorph(obj)) {
        doObjectSystemShock(obj);
        learnWandFromVisibleObjectEffect(wand, obj);
        return 1;
    }
    polymorphFloorObject(obj);
    return 1;
}

async function zapPolymorphObjects(wand, dx, dy) {
    // C refs: src/zap.c:weffects(), src/zap.c:bhit(), src/zap.c:bhitpile().
    if (!dx && !dy) return;
    game._zap_obj_zapped = false;
    game._poly_zapped = -1;
    let range = rn1(8, 6);
    let x = game.u?.ux ?? 0;
    let y = game.u?.uy ?? 0;
    while (range-- > 0) {
        x += dx;
        y += dy;
        const loc = game.level?.at(x, y);
        if (!loc) break;
        const pile = floorObjectsAt(x, y).slice();
        for (const obj of pile) {
            if (obj.ox === x && obj.oy === y && (game.level?.objects || []).includes(obj)) {
                polymorphZapHitsObject(obj, wand);
            }
        }
        if (!C.ZAP_POS(loc.typ) || closedDoorAt(x, y)) break;
    }
    if (game._zap_obj_zapped) await pline('You feel shuddering vibrations.');
    game._zap_obj_zapped = false;
    game._poly_zapped = -1;
}

function lookHereFeature() {
    const st = stairAtHero();
    if (st?.up) return { line: 'There is a staircase up out of the dungeon here.', blocks: true };
    if (st) return { line: 'There is a staircase down here.', blocks: false };
    const loc = game.level?.at(game.u?.ux, game.u?.uy);
    if (loc?.typ === C.DOOR && (loc.doormask || 0) === C.D_NODOOR) return { line: 'There is a doorway here.', blocks: false };
    if (loc?.typ === C.SINK) return { line: 'There is a sink here.', blocks: false };
    if (loc?.typ === C.FOUNTAIN) return { line: 'There is a fountain here.', blocks: false };
    return { line: '', blocks: false };
}

function isContainerObject(obj) {
    return obj?.otyp === LARGE_BOX || obj?.otyp === CHEST || obj?.otyp === ICE_BOX;
}

function containerAt(x, y) {
    return floorObjectsAt(x, y).find((obj) => isContainerObject(obj));
}

function monsterBesideHero() {
    const ux = game.u?.ux ?? 0;
    const uy = game.u?.uy ?? 0;
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            if (mon_at(ux + dx, uy + dy)) return true;
        }
    }
    return false;
}

async function doLootCommand() {
    const container = containerAt(game.u?.ux, game.u?.uy);
    if (!container) {
        // C ref: pickup.c:doloot_core().  With no floor container, #loot
        // asks for a direction only when directional monster looting applies.
        if (monsterBesideHero()) {
            await showPromptLine('Loot in what direction? ');
            game._awaiting_loot_direction = true;
        } else {
            await pline("You don't find anything here to loot.");
        }
        game.context.move = 0;
        return;
    }

    const name = baseObjectName(container) || 'container';
    if (container.olocked) {
        if (container.lknown) await pline(`The ${name} is locked.`);
        else await pline(`Hmmm, the ${name} turns out to be locked.`);
        container.lknown = true;
        game.context.move = 0;
        return;
    }

    await pline(`There is nothing in the ${name}.`);
    game.context.move = 0;
}

function forceableWeapon(obj) {
    if (!obj) return false;
    if (obj.oclass === WEAPON_CLASS) return true;
    if (obj.oclass === ROCK_CLASS) return true;
    return false;
}

async function doForceCommand() {
    // C ref: lock.c:doforce().  Forcing with a suitable wielded weapon costs
    // a turn even when there is no box on the hero's square.
    const weapon = heroWieldedWeapon();
    if (!forceableWeapon(weapon)) {
        await pline(weapon
            ? "You can't force anything with that weapon."
            : "You can't force anything when not wielding a weapon.");
        game.context.move = 0;
        return;
    }
    const box = containerAt(game.u?.ux, game.u?.uy);
    if (!box) {
        await pline('You decide not to force the issue.');
        game.context.move = 1;
        return;
    }
    await pline(`There is ${inventoryObjectName(box)} here, but its lock is already ${box.obroken ? 'broken' : 'unlocked'}.`);
    game.context.move = 1;
}

function validDirectionKey(ch) {
    return 'hykulnjb<>.'.includes(ch);
}

function directionDelta(ch) {
    return {
        dx: DIR_DX[ch] || 0,
        dy: DIR_DY[ch] || 0,
        dz: ch === '<' ? -1 : ch === '>' ? 1 : 0,
    };
}

async function handleLootDirection(ch) {
    // C refs: pickup.c:doloot_core(), cmd.c:get_adjacent_loc().
    game._awaiting_loot_direction = false;
    clear_pending_message();
    if (!validDirectionKey(ch)) {
        game.context.move = 0;
        if (ch === '\x1b' || ch === 'q') {
            await pline('Never mind.');
        } else if (game.iflags?.cmdassist !== false) {
            game._direction_help_screen = INVALID_DIRECTION_HELP_SCREEN;
            game._direction_help_after_more_message = 'Never mind.';
            showSerializedOverride(INVALID_DIRECTION_HELP_SCREEN, [8, 23]);
            queue_more_prompt();
        } else {
            await pline('Never mind.');
        }
        return;
    }

    const { dx, dy, dz } = directionDelta(ch);
    const ux = game.u?.ux ?? 0;
    const uy = game.u?.uy ?? 0;
    const x = ux + dx;
    const y = uy + dy;
    const underfoot = x === ux && y === uy;
    if (dz < 0) {
        await pline("You don't find anything to loot on the ceiling.");
    } else if (underfoot && containerAt(x, y)) {
        await doLootCommand();
    } else if (!underfoot && containerAt(x, y)) {
        await pline('You have to be at a container to loot it.');
    } else {
        await pline(`You don't find anything ${underfoot ? 'here' : 'there'} to loot.`);
    }
    game.context.move = 0;
}

function extractFloorObject(obj) {
    const idx = game.level?.objects?.indexOf(obj) ?? -1;
    if (idx >= 0) game.level.objects.splice(idx, 1);
    if (typeof obj?.ox === 'number' && typeof obj?.oy === 'number') newsym(obj.ox, obj.oy);
    obj.ox = 0;
    obj.oy = 0;
}

function pickupGoldObject(obj) {
    const picked = obj?.quan || 1;
    extractFloorObject(obj);
    game._goldCount = (game._goldCount || 0) + picked;
    let carried = (game.inventory || []).find((item) => item?.otyp === GOLD_PIECE);
    if (carried) {
        carried.quan = game._goldCount;
    } else {
        carried = obj;
        carried.invlet = '$';
        carried.quan = game._goldCount;
        game.inventory = game.inventory || [];
        game.inventory.push(carried);
    }
    return `$ - ${picked} gold ${picked === 1 ? 'piece' : 'pieces'} (${game._goldCount} in total).`;
}

function pickupInventoryObject(obj) {
    extractFloorObject(obj);
    const merged = merge_inventory_object(obj);
    const carried = merged || obj;
    if (!merged) {
        if (!obj.invlet) assignInventoryLetter(obj);
        game.inventory.push(obj);
    }
    return carried;
}

function shopPickupHonorific() {
    // C ref: shk.c:append_honorific().  Non-demigod heroes pick among the
    // first four honorifics using ordinary game RNG.
    const honored = ['good', 'honored', 'most gracious', 'esteemed'];
    let title = honored[rn2(honored.length)];
    const raceName = String(game.urace?.name || game.urace?.adj || game._nhopts?.race || 'human').toLowerCase();
    if (raceName === 'elf' || raceName === 'elven') title += game.flags?.female ? ' hiril' : ' hir';
    else if (raceName !== 'human') title += ' creature';
    else title += game.flags?.female ? ' lady' : ' sir';
    return title;
}

function markShopItemUnpaid(obj, quote) {
    if (!obj || !quote?.price) return;
    recordDiscoveryPriceQuote(obj.otyp, quote.price, true);
    obj.unpaid = true;
    obj.unpaidPrice = quote.price;
    obj.shopPrice = quote.price;
    obj.shopRoom = quote.roomno;
    const eshk = quote.shkp?.mextra?.eshk;
    if (eshk && !obj._bill_recorded) {
        eshk.billct = (eshk.billct || 0) + 1;
        obj._bill_recorded = true;
    }
}

function shopPickupQuoteMessage(obj, quote) {
    const shkp = quote?.shkp;
    const eshk = shkp?.mextra?.eshk;
    let intro = '"For you,';
    if (!shkp?.mpeaceful) {
        intro += ' scum;';
    } else if (!eshk?.surcharge) {
        intro += ` ${shopPickupHonorific()}; only`;
    }
    const name = baseObjectName(obj);
    return `${intro} ${quote.price} ${shopPriceCurrency(quote.price)} for this ${name}."`;
}

function shopPickupQuote(obj) {
    observeObjectForNaming(obj, { observe: true });
    const quote = floorShopPriceQuote(obj);
    if (!quote?.price) return null;
    markShopItemUnpaid(obj, quote);
    return quote;
}

function payMenuObjectName(obj) {
    const copy = { ...obj, unpaid: false, unpaidPrice: 0, shopPrice: 0 };
    return inventoryObjectName(copy, { includeCharges: false });
}

function payMenuEntriesForShopkeeper(shkp) {
    const roomno = shkp?.mextra?.eshk?.shoproom;
    return (game.inventory || [])
        .filter((obj) => obj?.unpaid && (!roomno || obj.shopRoom === roomno))
        .map((obj, idx) => ({
            selector: MENU_SELECTOR_CHARS[idx] || '?',
            obj,
            selected: false,
            price: obj.unpaidPrice || obj.shopPrice || 0,
        }));
}

function renderPayMenu(menu) {
    const display = game.nhDisplay;
    if (!display?.putstr) return false;
    const menuCol = 41;
    const lines = [
        { text: 'Pay for which items?', heading: true },
        { text: '', heading: false },
        ...menu.entries.map((entry) => ({
            text: `${entry.selector} ${entry.selected ? '+' : '-'} ${entry.price} Zm, ${payMenuObjectName(entry.obj)}`,
            heading: false,
        })),
        { text: '(end)', heading: false },
    ];
    for (let row = 0; row < lines.length; row++) {
        display.putstr(0, row, ' '.repeat(COLNO), NO_COLOR, 0);
    }
    for (let row = 0; row < lines.length; row++) {
        const line = lines[row];
        display.putstr(menuCol, row, line.text, NO_COLOR, line.heading ? ATR_INVERSE : 0);
    }
    const lastRow = lines.length - 1;
    const cursorCol = menuCol + '(end)'.length + 1;
    const screen = serialize_terminal_grid(display);
    game._pay_menu_screen = screen;
    showOverride(screen, [cursorCol, lastRow]);
    return true;
}

function shopThankYouMessage(shkp) {
    const eshk = shkp?.mextra?.eshk || {};
    const shopName = shopTypeName(roomForNo(eshk.shoproom)?.rtype);
    return `"Thank you for shopping in ${sSuffix(shkname(shkp))} ${shopName}${!eshk.surcharge ? '!' : '.'}"`;
}

function payGoldToMonster(shkp, amount) {
    const carried = (game.inventory || []).find((obj) => obj?.otyp === GOLD_PIECE);
    const current = game._goldCount || carried?.quan || 0;
    if (current <= 0 || amount <= 0) return;
    let paidId = carried?.o_id;
    if (current > amount) paidId = next_ident();
    game._goldCount = Math.max(0, current - amount);
    if (carried) {
        if (game._goldCount > 0) carried.quan = game._goldCount;
        else removeInventoryObject(carried);
    }
    shkp.inventory = shkp.inventory || [];
    shkp.inventory.push({
        otyp: GOLD_PIECE,
        oclass: COIN_CLASS,
        quan: amount,
        o_id: paidId,
    });
}

async function commitPayMenuSelection(menu) {
    const selected = (menu?.entries || []).filter((entry) => entry.selected);
    const shkp = menu?.shkp;
    game._pay_menu = null;
    game._pay_menu_screen = null;
    await redrawAfterFullScreenMenuDismiss();
    if (!selected.length || !shkp) {
        game.context.move = 0;
        return;
    }

    const entry = selected[0];
    const obj = entry.obj;
    const price = entry.price || 0;
    payGoldToMonster(shkp, price);
    obj.unpaid = false;
    obj.unpaidPrice = 0;
    obj.shopPrice = 0;
    const eshk = shkp.mextra?.eshk;
    if (eshk) eshk.billct = Math.max(0, (eshk.billct || 0) - 1);

    await pline(`You bought ${payMenuObjectName(obj)} for ${price} gold piece${price === 1 ? '' : 's'}.`);
    queue_more_prompt();
    game._more_message_queue = [
        ...(game._more_message_queue || []),
        { text: shopThankYouMessage(shkp), move: true },
    ];
    game.context.move = 0;
}

async function showPayMenu(shkp) {
    await flush_screen(1);
    const menu = { shkp, entries: payMenuEntriesForShopkeeper(shkp) };
    game._pay_menu = menu;
    if (!menu.entries.length || !renderPayMenu(menu)) {
        game._pay_menu = null;
        game._pay_menu_screen = null;
        await pline(`You do not owe ${shkname(shkp)} anything.`);
    }
    game.context.move = 0;
}

async function doPayCommand() {
    game.context.move = 0;
    const heroShopRooms = (Array.isArray(game.u?.ushops) && game.u.ushops.length)
        ? game.u.ushops
        : inRoomsAt(game.u?.ux, game.u?.uy).filter(isShopRoomNo);
    let shkp = null;
    for (const roomno of heroShopRooms) {
        const candidate = shopKeeperForRoom(roomno);
        if (candidate && shopkeeperInHisShop(candidate)) {
            shkp = candidate;
            break;
        }
    }
    if (!shkp) {
        const adjacent = (game.level?.monsters || []).filter((mon) =>
            mon?.isshk && dist2(mon.mx, mon.my, game.u?.ux ?? 0, game.u?.uy ?? 0) <= 2);
        if (adjacent.length === 1) shkp = adjacent[0];
    }
    if (!shkp) {
        await pline('There appears to be no shopkeeper here to receive your payment.');
        return;
    }
    const eshk = shkp.mextra?.eshk || {};
    if ((eshk.billct || 0) > 0 || payMenuEntriesForShopkeeper(shkp).length) {
        await showPayMenu(shkp);
        return;
    }
    await pline(`You do not owe ${shkname(shkp)} anything.`);
}

function heavyPickupTrouble(obj) {
    return obj?.otyp === CHAIN_MAIL || obj?.otyp === 158;
}

function pickupTroublePrefix() {
    const enc = game.u?.uencumber || 0;
    if (enc >= C.EXT_ENCUMBER) return 'You have extreme difficulty';
    if (enc >= C.HVY_ENCUMBER) return 'You have much trouble';
    if (enc >= C.MOD_ENCUMBER) return 'You have trouble';
    if (enc >= C.SLT_ENCUMBER) return 'You have a little trouble';
    return '';
}

async function finishShopQuotedPickup(obj) {
    const carried = pickupInventoryObject(obj);
    game.context.move = 1;
    if (!heavyPickupTrouble(carried)) {
        await pline(`${carried.invlet} - ${inventoryObjectName(carried)}.`);
        return;
    }
    if (game.u) game.u.uencumber = Math.max(game.u.uencumber || 0, 1);
    await plineWithMorePrompt(`You have a little trouble lifting ${carried.invlet} - ${inventoryObjectName(carried)}.`);
    game._finish_pickup_turn_after_more = true;
    game.context.move = 0;
}

async function finishHeavyPickup(obj) {
    pickupInventoryObject(obj);
    if (game.u) game.u.uencumber = Math.max(game.u.uencumber || 0, 1);
    game._extra_encumbered_turn_pending = true;
    await pline('Your movements are slowed slightly because of your load.');
}

async function triggerSpotEffectsAtHero() {
    await checkSpecialRoomAfterMove();
    return triggerTrapAtHero();
}

async function triggerTrapAtHero() {
    const u = game.u || {};
    const trap = (game.level?.traps || []).find(t => t.tx === u.ux && t.ty === u.uy);
    if (!trap) return false;
    if (trap.ttyp === C.DART_TRAP) {
        mksobj(DART, true, false);
        rn2(6);
        const damage = rnd(3);
        rnd(20);
        exercise(A_DEX, false);
        if (typeof game.u?.uhp === 'number') game.u.uhp = Math.max(0, game.u.uhp - damage);
        trap.tseen = true;
        newsym(trap.tx, trap.ty);
        await pline('A little dart shoots out at you!  You are hit by a little dart.');
        return true;
    }
    if (trap.ttyp === C.RUST_TRAP) {
        // C ref: trap.c:trapeffect_rust_trap().
        trap.tseen = true;
        newsym(trap.tx, trap.ty);
        switch (rn2(5)) {
        case 0:
            await pline('A gush of water hits you on the head!');
            break;
        case 1:
            await pline('A gush of water hits your left arm!');
            break;
        case 2:
            await pline('A gush of water hits your right arm!');
            break;
        default:
            await pline('A gush of water hits you!');
            break;
        }
        return true;
    }
    return false;
}

function roomForNo(roomno) {
    const idx = (roomno ?? 0) - C.ROOMOFFSET;
    return idx >= 0 ? game.level?.rooms?.[idx] : null;
}

function isShopRoomNo(roomno) {
    return (roomForNo(roomno)?.rtype ?? 0) >= C.SHOPBASE;
}

function inRoomsAt(x, y) {
    const loc = game.level?.at(x, y);
    const roomno = loc?.roomno ?? 0;
    if (roomno >= C.ROOMOFFSET) return [roomno];
    return [];
}

function shopKeeperForRoom(roomno) {
    return (game.level?.monsters || []).find((mon) =>
        mon?.isshk && mon.mextra?.eshk?.shoproom === roomno) || null;
}

function shopkeeperInHisShop(mon) {
    const roomno = mon?.mextra?.eshk?.shoproom;
    return !!roomno && inRoomsAt(mon.mx, mon.my).includes(roomno);
}

function shkname(mon) {
    return String(mon?.mextra?.eshk?.shknam || 'shopkeeper').replace(/^[_+\-|]/, '');
}

function sSuffix(name) {
    return /s$/i.test(name) ? `${name}'` : `${name}'s`;
}

async function uEnteredShop(roomno) {
    const shkp = shopKeeperForRoom(roomno);
    const eshk = shkp?.mextra?.eshk;
    if (!shkp || !eshk || eshk.following) return;
    const customer = game.plname || 'Hero';
    if ((!eshk.visitct || eshk.customer)
        && String(eshk.customer || '').toLowerCase() !== String(customer).toLowerCase()) {
        eshk.visitct = 0;
        eshk.following = false;
        eshk.customer = customer;
        shkp.mpeaceful = 1;
    }
    const name = shkname(shkp);
    const shopName = shopTypeName(roomForNo(roomno)?.rtype);
    const again = eshk.visitct++ ? ' again' : '';
    const hello = roleGreeting(game.urole, 'shopkeeper');
    // C ref: shk.c:u_entered_shop().  verbalize() wraps shopkeeper speech in
    // quotes; the common peaceful, audible path is enough for current evidence.
    await pline(`"${hello}, ${customer}!  Welcome${again} to ${sSuffix(name)} ${shopName}!"`);
}

async function checkSpecialRoomAfterMove() {
    const u = game.u || {};
    const rooms = inRoomsAt(u.ux, u.uy);
    const prevShops = Array.isArray(u.ushops) ? u.ushops.slice() : [];
    const shops = rooms.filter(isShopRoomNo);
    const entered = shops.filter((roomno) => !prevShops.includes(roomno));
    u.urooms0 = Array.isArray(u.urooms) ? u.urooms.slice() : [];
    u.ushops0 = prevShops;
    u.urooms = rooms;
    u.ushops = shops;
    u.ushops_entered = entered;
    u.ushops_left = prevShops.filter((roomno) => !shops.includes(roomno));
    if (entered.length) await uEnteredShop(entered[0]);
}

function pickupMenuEntries(objects) {
    const entries = [];
    const weapons = objects.filter(obj => obj.oclass === WEAPON_CLASS);
    const food = objects.filter(obj => obj.oclass === FOOD_CLASS);
    const gems = objects.filter(obj => obj.oclass === 13);
    let selector = 97;
    for (const [heading, group] of [['Weapons', weapons], ['Comestibles', food], ['Gems/Stones', gems]]) {
        if (!group.length) continue;
        entries.push({ heading });
        for (const obj of group) {
            entries.push({ selector: String.fromCharCode(selector++), obj, selected: false });
        }
    }
    return entries;
}

function refreshPickupMenu() {
    const menu = game._pickup_menu;
    if (!menu) return;
    const lines = [''];
    for (const entry of menu.entries) {
        if (entry.heading) {
            lines.push(entry.heading);
        } else {
            lines.push(`${entry.selector} ${entry.selected ? '+' : '-'} ${inventoryObjectName(entry.obj)}`);
        }
    }
    lines.push('(end)');
    game._pending_message = `${' '.repeat(41)}Pick up what?`;
    game._floor_list_lines = lines;
    game._floor_list_col = 41;
    game._floor_list_show_more = false;
    game._prompt_cursor = [47, lines.length];
}

async function showPickupMenu(objects) {
    game._pickup_menu = { entries: pickupMenuEntries(objects) };
    refreshPickupMenu();
    game.context.move = 0;
}

async function finishPickupMenu() {
    const menu = game._pickup_menu;
    game._pickup_menu = null;
    game._floor_list_lines = null;
    game._floor_list_show_more = true;
    game._prompt_cursor = null;
    const selected = (menu?.entries || []).filter(entry => entry.selected && entry.obj).map(entry => entry.obj);
    if (!selected.length) {
        game.context.move = 0;
        await pline('Never mind.');
        return;
    }
    game.context.move = 1;
    const messages = [];
    for (const obj of selected) {
        if (obj.otyp === GOLD_PIECE) {
            messages.push(pickupGoldObject(obj));
            continue;
        }
        extractFloorObject(obj);
        const merged = merge_inventory_object(obj);
        const carried = merged || obj;
        if (!merged) {
            assignInventoryLetter(carried);
            game.inventory = game.inventory || [];
            game.inventory.push(carried);
        }
        messages.push(`${carried.invlet} - ${inventoryObjectName(carried)}.`);
    }
    await pline(messages.join('  '));
}

async function handlePickupMenuKey(ch) {
    const menu = game._pickup_menu;
    if (!menu) return false;
    if (ch === '\r' || ch === '\n') {
        await finishPickupMenu();
        return true;
    }
    const entry = menu.entries.find(item => item.selector === ch);
    if (entry) entry.selected = !entry.selected;
    refreshPickupMenu();
    game.context.move = 0;
    return true;
}

function floorCorpseAtHero() {
    const u = game.u || {};
    return (game.level?.objects || []).find((obj) =>
        obj?.otyp === CORPSE && obj.ox === u.ux && obj.oy === u.uy);
}

function corpseEatingReqtime(obj) {
    // C ref: eat.c:eatcorpse(); corpse delay is weight-dependent:
    // victual.reqtime = 3 + (mons[mnum].cwt >> 6), then start_eating()
    // records the first bite without consuming an input boundary.
    const cwt = obj?.corpse_cwt || CORPSE_WEIGHT_BY_MONSTER.get(corpseMonsterPtr(obj)?.name) || 0;
    return 3 + (cwt >> 6);
}

function rottenFoodInterruptsEating() {
    // C ref: eat.c:rottenfood().  Only the unconsciousness branch prevents
    // start_eating() from recording the first bite.
    if (!rn2(4)) {
        d(2, 4);
        return false;
    }
    if (!rn2(4)) {
        d(2, 10);
        return false;
    }
    if (!rn2(3)) {
        rnd(10);
        return true;
    }
    return false;
}

function markObjectEncountered(otyp) {
    if (!Number.isInteger(otyp)) return;
    const order = Array.isArray(game.discoveryOrder)
        ? game.discoveryOrder
        : (game.discoveryOrder = []);
    if (!order.includes(otyp)) order.push(otyp);
    const encountered = game.encounteredObjects || (game.encounteredObjects = new Set());
    if (typeof encountered.add === 'function') encountered.add(otyp);
}

function discoverObjectType(otyp, markEncountered = true) {
    const discovered = game.discoveredObjects || (game.discoveredObjects = new Set());
    if (markEncountered) markObjectEncountered(otyp);
    if (discovered.has(otyp)) return false;
    discovered.add(otyp);
    exercise(A_WIS, true);
    return true;
}

function increaseHeroTimeout(stateKey, amount) {
    if (!game.u) return 0;
    game.u.uprops = game.u.uprops || {};
    const oldTimeout = game.u.uprops[stateKey] || 0;
    const newTimeout = Math.min(C.TIMEOUT, Math.max(0, oldTimeout + amount));
    game.u.uprops[stateKey] = newTimeout;
    if (stateKey === 'confusion') game.u.uconfusion = newTimeout;
    return newTimeout;
}

function healup(nhp, nxtra) {
    game.u = game.u || {};
    if (!nhp) return;
    game.u.uhp = (game.u.uhp || 0) + nhp;
    if (game.u.uhp > (game.u.uhpmax || 0)) {
        game.u.uhpmax = (game.u.uhpmax || 0) + nxtra;
        game.u.uhp = game.u.uhpmax;
    }
}

async function drinkPotion(obj, idx) {
    if (!obj || obj.oclass !== POTION_CLASS) {
        game.context.move = 0;
        await pline('Never mind.');
        return;
    }
    const appearance = getObjectDescription(obj.otyp) || 'ruby';
    if ((obj.quan || 1) > 1) obj.quan--;
    else if (idx >= 0) game.inventory.splice(idx, 1);
    if (obj.otyp === POT_PARALYSIS) {
        // C ref: potion.c:peffect_paralysis().
        const bcsign = obj.blessed ? 1 : (obj.cursed ? -1 : 0);
        game._nomul_turns_remaining = rn2(10) + 25 - (12 * bcsign);
        game._nomul_finish_message = 'You can move again.';
        exercise(A_DEX, false);
        discoverObjectType(obj.otyp);
        await pline('Your feet are frozen to the floor!');
        game.context.move = 1;
        return;
    }
    if (obj.otyp === POT_CONFUSION) {
        // C refs: potion.c:peffect_confusion(), potion.c:dopotion().
        const alreadyConfused = !!(game.u?.uprops?.confusion || game.u?.uconfusion);
        const bcsign = obj.blessed ? 1 : (obj.cursed ? -1 : 0);
        if (!alreadyConfused) {
            if (game.u?.uhallucination || game.u?.uprops?.hallucination)
                await pline('What a trippy feeling!');
            else
                await pline('Huh, What?  Where am I?');
        }
        increaseHeroTimeout('confusion', rn1(7, 16 - (8 * bcsign)));
        if (!alreadyConfused && !(game.u?.uhallucination || game.u?.uprops?.hallucination))
            discoverObjectType(obj.otyp);
        game.context.move = 1;
        return;
    }
    if (obj.otyp === POT_HEALING) {
        // C ref: potion.c:peffect_healing().
        const bcsign = obj.blessed ? 1 : (obj.cursed ? -1 : 0);
        await pline('You feel better.');
        healup(8 + d(4 + (2 * bcsign), 4), obj.cursed ? 0 : 1);
        exercise(A_CON, true);
        game.context.move = 1;
        return;
    }
    if (obj.otyp === POT_EXTRA_HEALING) {
        // C ref: potion.c:peffect_extra_healing().
        const bcsign = obj.blessed ? 1 : (obj.cursed ? -1 : 0);
        await pline('You feel much better.');
        healup(16 + d(4 + (2 * bcsign), 8), obj.blessed ? 5 : (obj.cursed ? 0 : 2));
        exercise(A_CON, true);
        exercise(A_STR, true);
        game.context.move = 1;
        return;
    }
    if (obj.otyp === POT_BOOZE) {
        // C refs: potion.c:peffect_booze(), potion.c:dopotion().
        const bcsign = obj.blessed ? 1 : (obj.cursed ? -1 : 0);
        const prefix = obj.odiluted ? 'watered down ' : '';
        const liquid = (game.u?.uhallucination || game.u?.uprops?.hallucination)
            ? 'dandelion wine'
            : 'liquid fire';
        await pline(`Ooph!  This tastes like ${prefix}${liquid}!`);
        if (!obj.blessed) increaseHeroTimeout('confusion', d(2 + (game.u?.uhs ?? 1), 8));
        if (!obj.odiluted && game.u && typeof game.u.uhp === 'number')
            game.u.uhp = Math.min(game.u.uhpmax || game.u.uhp, game.u.uhp + 1);
        if (game.u) game.u.uhunger = (game.u.uhunger ?? 900) + (10 * (2 + bcsign));
        exercise(A_WIS, false);
        game._drink_call_after_more = appearance;
        queue_more_prompt();
        game.context.move = 0;
        return;
    }
    if (obj.otyp === POT_OIL) {
        // C ref: potion.c:peffect_oil().  Non-lit oil is not beneficial;
        // even the smooth uncursed case abuses Wisdom.
        await pline(obj.cursed ? 'This tastes like castor oil.' : 'That was smooth!');
        exercise(A_WIS, false);
        game.context.move = 1;
        return;
    }
    if (obj.otyp !== POT_FRUIT_JUICE) {
        game.context.move = 1;
        return;
    }
    game._drink_call_after_more = appearance;
    await pline('This tastes like slime mold juice.');
    queue_more_prompt();
    game.context.move = 0;
}

async function drinkSink() {
    // C ref: fountain.c:drinksink().
    const roll = rn2(20);
    if (roll === 0) {
        await pline('You take a sip of very cold water.');
    } else if (roll === 1) {
        await pline('You take a sip of very warm water.');
    } else if (roll === 2) {
        await pline('You take a sip of scalding hot water.');
    } else if (roll === 9) {
        // C refs: fountain.c:drinksink(), eat.c:vomit().
        const hungerLoss = rn1(Math.max(1, 30 - currentAttr(A_CON)), 11);
        if (game.u) game.u.uhunger = (game.u.uhunger ?? 900) - hungerLoss;
        game._nomul_turns_remaining = 3;
        game._nomul_finish_message = 'You can move again.';
        await pline('Gaggg... this tastes like sewage!  You vomit.');
    } else {
        const temp = rn2(3) ? (rn2(2) ? 'cold' : 'warm') : 'hot';
        await pline(`You take a sip of ${temp} water.`);
    }
    game.context.move = 1;
}

async function handleFloorCorpseEatKey(ch) {
    const obj = game._floor_corpse_eat_obj;
    const corpseName = baseObjectName(obj);
    game._awaiting_floor_corpse_eat = false;
    game._floor_corpse_eat_obj = null;
    game._prompt_cursor = null;
    if (ch !== 'y') {
        game.context.move = 0;
        await pline('Never mind.');
        return true;
    }
    rn2(20);
    let firstBiteStarted = false;
    if (obj?._live_kill_corpse) {
        rn2(7);
        firstBiteStarted = !rottenFoodInterruptsEating();
    } else {
        rn2(5);
        const damage = rnd(8);
        if (typeof game.u?.uhp === 'number') game.u.uhp = Math.max(0, game.u.uhp - damage);
    }
    if (obj) game._pending_eaten_corpse_remove = obj;
    game._occupation_turns_remaining = Math.max(0, corpseEatingReqtime(obj) - (firstBiteStarted ? 1 : 0));
    game._occupation_pre_finish_catchup = firstBiteStarted;
    game._occupation_finish_message = `You finish eating the ${corpseName}.`;
    game._occupation_pack_finish_message = true;
    game._occupation_finish_removes_eaten_corpse = true;
    await pline(obj?._live_kill_corpse ? 'Blecch!  Rotten food!' : 'You feel sick.');
    game.context.move = 1;
    return true;
}

async function continueQueuedCookieMessage(ch) {
    if (!game._cookie_message_queue?.length || !game._more
        || (ch !== ' ' && ch !== '\r' && ch !== '\n')) {
        return false;
    }
    const next = game._cookie_message_queue.shift();
    await pline(next.text);
    game._more_next_message_row = false;
    if (next.more) {
        queue_more_prompt();
        game.context.move = 0;
    } else {
        game._more = false;
        game.context.move = next.move ? 1 : 0;
    }
    return true;
}

async function handleEatItemKey(ch) {
    game._awaiting_eat_item = false;
    game._prompt_cursor = null;
    if (ch === '\x1b' || ch === ' ') {
        game.context.move = 0;
        await pline('Never mind.');
        return true;
    }
    const idx = inventoryIndexForLetter(ch);
    const obj = idx >= 0 ? game.inventory?.[idx] : null;
    if (!obj) {
        game.context.move = 0;
        await pline("You don't have that object.");
        queue_more_prompt();
        return true;
    }
    if (obj.oclass !== FOOD_CLASS) {
        // C refs: eat.c:eat_ok(), eat.c:doeat().  Inedible carried objects
        // are selectable by getobj(), then rejected by doeat() without a More.
        game.context.move = 0;
        await pline('You cannot eat that!');
        return true;
    }

    consumeInventoryObject(obj);
    if (obj.otyp === FORTUNE_COOKIE) {
        const rumor = getRumor(0, false);
        exercise(A_WIS, true);
        game._cookie_message_queue = [
            { text: 'This cookie has a scrap of paper inside.  It reads:', more: true },
            { text: rumor, move: true },
        ];
        game.context.move = 0;
        await pline('This fortune cookie is delicious!');
        game._more_next_message_row = false;
        queue_more_prompt();
        return true;
    }

    game.context.move = 1;
    await pline(`${inventoryObjectName(obj)} is delicious!`);
    return true;
}

export function finish_pending_eaten_corpse() {
    const obj = game._pending_eaten_corpse_remove;
    if (!obj) return;
    game._pending_eaten_corpse_remove = null;
    // C ref: eat.c:done_eating() -> invent.c:delobj_core().
    obj_resists(obj, 0, 0);
    extractFloorObject(obj);
}

async function pickupHere() {
    const objects = floorObjectsAtHero();
    if (objects.length > 1) {
        await showPickupMenu(objects);
        return;
    }
    const obj = objects[0] || null;
    if (!obj) {
        game.context.move = 0;
        await pline('There is nothing here to pick up.');
        return;
    }
    game.context.move = 1;
    if (obj.otyp === GOLD_PIECE) {
        await pline(pickupGoldObject(obj));
        return;
    }
    const quote = shopPickupQuote(obj);
    if (quote) {
        game._pending_shop_pickup = obj;
        await plineWithMorePrompt(shopPickupQuoteMessage(obj, quote));
        game.context.move = 0;
        return;
    }
    if (obj.otyp === CHAIN_MAIL) {
        // C ref: pickup.c:lift_object(); raising encumbrance prompts before
        // pickup completion.
        assignInventoryLetter(obj);
        game._pending_heavy_pickup = obj;
        await pline(`You have a little trouble lifting ${obj.invlet} - ${inventoryObjectName(obj)}.`);
        queue_more_prompt();
        game.context.move = 0;
        return;
    }
    const carried = pickupInventoryObject(obj);
    const prefix = pickupTroublePrefix();
    await pline(`${prefix ? `${prefix} lifting ` : ''}${carried.invlet} - ${inventoryObjectName(carried)}.`);
}

function isMovementKey(ch) {
    return 'hjklyubn'.includes(ch);
}

function isGetposMovementKey(ch) {
    return isMovementKey(ch) || !!RUN_KEY[ch];
}

function runDirectionForKey(ch) {
    return RUN_KEY[ch] || null;
}

async function startRunDirection(dir, mode) {
    game.context.run = {
        dx: DIR_DX[dir],
        dy: DIR_DY[dir],
        mode,
        steps: 0,
        allowTurns: true,
    };
    game.context.mv = 1;
    game.context.move = await domove(DIR_DX[dir], DIR_DY[dir]) ? 1 : 0;
    if (!game.context.move || game._run_stop_after_move) {
        game.context.run = null;
        game._run_stop_after_move = false;
    }
}

function hasWoundedLegs() {
    return !!game.u?.uprops?.wounded_legs;
}

function setWoundedLegs(side, timeout) {
    // C ref: do.c:set_wounded_legs().
    const u = game.u || (game.u = {});
    u.uprops = u.uprops || {};
    if (!u.uprops.wounded_legs && Array.isArray(u.acurr?.a)) {
        u.acurr.a[A_DEX] = Math.max(0, (u.acurr.a[A_DEX] ?? 0) - 1);
        u.wounded_legs_dex_penalty = true;
    }
    u.uprops.wounded_legs = Math.max(u.uprops.wounded_legs || 0, timeout || 0);
    u.wounded_legs_side = side || u.wounded_legs_side || 'right';
}

function woundedLegsKickMessage() {
    // C ref: do.c:legs_in_no_shape().
    const side = game.u?.wounded_legs_side || 'right';
    if (side === 'both') return 'Your legs are in no shape for kicking.';
    const prefix = side === 'left' ? 'left ' : side === 'right' ? 'right ' : '';
    return `Your ${prefix}leg is in no shape for kicking.`;
}

const EXTENDED_AUTOCOMPLETE = [
    { name: 'chat', min: 3 },
    { name: 'force', min: 1 },
    { name: 'kick', min: 1 },
    { name: 'levelchange', min: 2, wizard: true },
    { name: 'loot', min: 1 },
    { name: 'name', min: 1 },
    { name: 'pray', min: 2 },
    { name: 'quit', min: 1 },
    { name: 'wizgenesis', min: 10, wizard: true },
    { name: 'wizintrinsic', min: 4, wizard: true },
];

function availableExtendedCommands() {
    const wizard = !!(game.wizard || game.flags?.debug);
    return EXTENDED_AUTOCOMPLETE.filter((cmd) => !cmd.wizard || wizard);
}

function completeExtendedCommand(input) {
    const typed = String(input || '').toLowerCase();
    if (!typed) return '';
    const commands = availableExtendedCommands();
    const exact = commands.find((cmd) => cmd.name === typed);
    if (exact) return exact.name;
    const prefixMatches = commands.filter((cmd) => cmd.name.startsWith(typed));
    const matches = prefixMatches.filter((cmd) => typed.length >= cmd.min);
    return prefixMatches.length === 1 && matches.length === 1 ? matches[0].name : typed;
}

async function showExtendedCommandInput(typed) {
    // C ref: win/tty/getline.c:ext_cmd_getlin_hook().  The prompt displays
    // the unique completion, while the cursor remains after the typed prefix.
    const input = String(typed || '').toLowerCase();
    const shown = completeExtendedCommand(input);
    await showPromptLine(`# ${shown}`);
    game._prompt_cursor = [Math.min(input.length + 2, 79), 0];
}

function showNameCommandMenu() {
    const display = game.nhDisplay;
    if (!display?.putstr) return;
    // C refs: cmd.c `name` extended command, do_name.c:docallcmd().
    // TTY draws this menu over the existing map without clearing full rows.
    const col = 32;
    const rows = [
        [0, 'What do you want to name?', true],
        [2, 'm - a monster', false],
        [3, 'i - a particular object in inventory', false],
        [4, 'o - the type of an object in inventory', false],
        [5, 'f - the type of an object upon the floor', false],
        [6, 'd - the type of an object on discoveries list', false],
        [7, 'a - record an annotation for the current level', false],
        [8, '(end)', false],
    ];
    display.putstr(0, 0, ' '.repeat(col), NO_COLOR, 0);
    for (const [row, text, inverse] of rows) {
        display.putstr(col - 1, row, ' ', NO_COLOR, 0);
        display.putstr(col, row, text, NO_COLOR, inverse ? ATR_INVERSE : 0);
    }
    const screen = serialize_terminal_grid(display);
    game._name_menu_screen = screen;
    showOverride(screen, [col + '(end)'.length + 1, 8]);
}

function alignNameForHero() {
    const typ = game.u?.ualign?.type;
    if (typ > 0) return 'lawful';
    if (typ < 0) return 'chaotic';
    return 'neutral';
}

function prayerGodName() {
    return roleGod(game.urole, alignNameForHero());
}

async function finishPrayerResult() {
    const god = prayerGodName();
    await pline(`You feel that ${god} is satisfied.`);
    if ((game.u?.ualign?.record ?? 0) < 2) adjalign(1);
    rn1(2, 1);
    game.u.ublesscnt = rnz(350);
}

// C ref: hack.c — check if a cell blocks movement
function blocksMove(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return true;
    if (loc.typ === STONE) return true;
    if (loc.typ === SDOOR || loc.typ === SCORR) return true;
    if (IS_WALL(loc.typ)) return true;
    if (loc.typ === DOOR && (loc.doormask & (D_CLOSED | D_LOCKED))) return true;
    return false;
}

function sobj_at_basic(otyp, x, y) {
    return (game.level?.objects || []).find(o => o.otyp === otyp && o.ox === x && o.oy === y) || null;
}

function boulderDestinationBlocked(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return true;
    if (IS_OBSTRUCTED(loc.typ) || IS_WALL(loc.typ)) return true;
    if (loc.typ === DOOR && (loc.doormask & (D_CLOSED | D_LOCKED))) return true;
    return !!sobj_at_basic(BOULDER, x, y);
}

function shouldShowBoulderPushMessage(boulder) {
    // C ref: hack.c:dopush() suppresses repeated messages for the same
    // boulder until enough turns have passed.
    const now = game.moves || 0;
    if (game._bldrpush_obj !== boulder) {
        game._bldrpush_obj = boulder;
        game._bldrpushtime = now + 1;
    }
    const show = now > (game._bldrpushtime || 0) + 2
        || now < (game._bldrpushtime || 0);
    game._bldrpushtime = now;
    return show;
}

async function tryPushBoulder(boulder, sx, sy, dx, dy) {
    const rx = sx + dx;
    const ry = sy + dy;
    if (boulderDestinationBlocked(rx, ry)) {
        await pline('You try to move the boulder, but in vain.');
        game.context.move = 0;
        return false;
    }

    if (shouldShowBoulderPushMessage(boulder))
        await pline('With great effort you move the boulder.');
    exercise(A_STR, true);
    boulder.ox = rx;
    boulder.oy = ry;
    if (game.context?.run) game._run_stop_after_move = true;
    vision_reset();

    const u = game.u;
    const oldx = u.ux, oldy = u.uy;
    u.ux0 = oldx;
    u.uy0 = oldy;
    u.ux = sx;
    u.uy = sy;
    newsym(oldx, oldy);
    newsym(rx, ry);
    vision_recalc(1);
    newsym(rx, ry);
    refreshWarningAfterHeroMove();
    newsym(sx, sy);
    return true;
}

function mon_at(x, y) {
    return (game.level?.monsters || []).find((mon) => mon.mx === x && mon.my === y);
}

function monsterName(mon) {
    return String(mon?.data?.name || 'monster').toLowerCase().replaceAll('_', ' ');
}

function monsterHitName(mon) {
    if (game.u?.uhallucination || game.u?.uprops?.hallucination) {
        // C ref: do_name.c:x_monnam(ARTICLE_THE) -> rndmonnam().
        return randomHallucinatedMonsterName('the');
    }
    return `the ${monsterName(mon)}`;
}

function monsterKillName(mon) {
    if (mon?.mtame && (game.u?.uhallucination || game.u?.uprops?.hallucination)) {
        // C ref: mon.c:xkilled() passes adjective "poor" to x_monnam().
        return `the poor ${randomHallucinatedMonsterName('')}`;
    }
    return monsterHitName(mon);
}

const HALLUCINATED_PET_SOUNDS = [
    'beep', 'boing', 'sing', 'belche', 'creak', 'cough',
    'rattle', 'ululate', 'pop', 'jingle', 'sniffle', 'tinkle',
    'eep', 'clatter', 'hum', 'sizzle', 'twitter', 'wheeze',
    'rustle', 'honk', 'lisp', 'yodel', 'coo', 'burp',
    'moo', 'boom', 'murmur', 'oink', 'quack', 'rumble',
    'twang', 'toot', 'gargle', 'hoot', 'warble',
];

function vtenseThirdPerson(verb) {
    if (verb.endsWith('e')) return `${verb}s`;
    return `${verb}s`;
}

async function maybePetAbuseSound(mon) {
    if (!(game.u?.uhallucination || game.u?.uprops?.hallucination)) return false;
    const verb = HALLUCINATED_PET_SOUNDS[rn2(HALLUCINATED_PET_SOUNDS.length)];
    const subject = randomHallucinatedMonsterName('the');
    const line = `${subject.slice(0, 1).toUpperCase()}${subject.slice(1)} ${vtenseThirdPerson(verb)}!`;
    await pline(line);
    return true;
}

const MONSTER_AC = new Map([
    ['grid bug', 9],
]);

const VERY_SMALL_MONSTERS = new Set([
    'giant ant', 'killer bee', 'soldier ant', 'fire ant', 'queen bee',
    'acid blob', 'chickatrice', 'homunculus', 'imp', 'leprechaun',
    'sewer rat', 'giant rat', 'rabid rat', 'wererat', 'cave spider',
    'centipede', 'grid bug', 'xan', 'bat', 'garter snake',
    'newt', 'gecko', 'iguana', 'lizard', 'chameleon',
]);

const WEAPON_SMALL_DAMAGE_DIE = new Map([
    [SCALPEL, 3],
]);

function monsterArmorClass(mon) {
    const name = monsterName(mon);
    return mon?.mac ?? mon?.ac ?? mon?.data?.ac ?? MONSTER_AC.get(name) ?? 10;
}

function heroMeleeToHit(mon) {
    const level = game.u?.ulevel ?? 1;
    return 10 + level + (10 - monsterArmorClass(mon));
}

function heroWieldedWeapon() {
    return (game.inventory || []).find((obj) => obj?.wielded || ((obj?.owornmask || 0) & C.W_WEP));
}

function setHeroWieldedWeapon(obj) {
    for (const item of game.inventory || []) {
        if (!item) continue;
        item.wielded = false;
        item.owornmask = (item.owornmask || 0) & ~C.W_WEP;
    }
    if (!obj) return;
    obj.wielded = true;
    obj.owornmask = (obj.owornmask || 0) | C.W_WEP;
}

function heroMeleeSmallDamageDie() {
    const weapon = heroWieldedWeapon();
    return WEAPON_SMALL_DAMAGE_DIE.get(weapon?.otyp) || 6;
}

function heroMeleeDamageBonus() {
    const weapon = heroWieldedWeapon();
    if (!weapon || typeof weapon.spe !== 'number') return 0;
    return weapon.spe;
}

function doorwayBlocksDiagonalForHero(loc) {
    return loc && loc.typ === DOOR && (loc.doormask & ~C.D_BROKEN);
}

function currentAttr(index) {
    return game.u?.acurr?.a?.[index] ?? 10;
}

function kickDamageDie() {
    return currentAttr(A_CON) > 15 ? 3 : 5;
}

async function kickOuch(x, y, kickobjnam = '') {
    // C ref: dokick.c:kick_ouch().
    await pline('Ouch!  That hurts!');
    exercise(A_DEX, false);
    exercise(A_STR, false);
    if (C.isok(x, y)) {
        for (const mon of game.level?.monsters || []) {
            if (dist2(x, y, mon.mx, mon.my) <= 25) mon.msleeping = false;
        }
    }
    if (!rn2(3)) setWoundedLegs('right', 5 + rnd(5));
    const damage = rnd(kickDamageDie());
    const halfPhysical = !!game.u?.uprops?.half_physical_damage;
    const finalDamage = halfPhysical ? Math.trunc((damage + 1) / 2) : damage;
    if (typeof game.u?.uhp === 'number')
        game.u.uhp = Math.max(0, game.u.uhp - finalDamage);
}

async function kickDumb(x, y) {
    // C ref: dokick.c:kick_dumb().
    exercise(A_DEX, false);
    if (currentAttr(A_DEX) >= 16 || rn2(3)) {
        await pline('You kick at empty space.');
    } else {
        await pline('Dumb move!  You strain a muscle.');
        exercise(A_STR, false);
        setWoundedLegs('right', 5 + rnd(5));
    }
}

async function kickDoor(x, y, loc) {
    // C ref: dokick.c:kick_door().  Door kicks exercise Dex before the
    // force-open test; a failed kick exercises Str and prints Thwack/Whammm.
    exercise(A_DEX, true);
    const avrgAttrib = Math.trunc((currentAttr(A_STR) + currentAttr(A_DEX) + currentAttr(A_CON)) / 3);
    if (rnl(35) < avrgAttrib) {
        exercise(A_STR, true);
        loc.doormask = C.D_BROKEN;
        loc.flags = C.D_BROKEN;
        newsym(x, y);
        vision_reset();
        vision_recalc(0);
        await pline('As you kick the door, it crashes open!');
    } else {
        exercise(A_STR, true);
        await pline(`${!rn2(3) ? 'Thwack' : 'Whammm'}!!`);
    }
}

async function kickDirection(ch) {
    // C ref: dokick.c:dokick(), dokick.c:kick_nondoor().
    const dx = DIR_DX[ch] || 0;
    const dy = DIR_DY[ch] || 0;
    if (!dx && !dy) {
        game.context.move = 0;
        return;
    }
    const x = (game.u?.ux ?? 0) + dx;
    const y = (game.u?.uy ?? 0) + dy;
    for (const mon of game.level?.monsters || []) {
        if (dist2(game.u?.ux ?? 0, game.u?.uy ?? 0, mon.mx, mon.my) <= 25)
            mon.msleeping = false;
    }
    if (!C.isok(x, y)) {
        await kickOuch(x, y);
        game.context.move = 1;
        return;
    }
    const loc = game.level?.at(x, y);
    if (mon_at(x, y)) {
        game.context.move = 0;
        await pline('You kick at empty space.');
        return;
    }
    if (loc?.typ === DOOR) {
        await kickDoor(x, y, loc);
    } else if (loc && (loc.typ === SDOOR || loc.typ === SCORR
        || loc.typ === C.STAIRS || loc.typ === C.LADDER
        || C.IS_STWALL(loc.typ))) {
        await kickOuch(x, y);
    } else {
        await kickDumb(x, y);
    }
    game.context.move = 1;
}

async function tryAutoOpenDoor(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc || loc.typ !== DOOR || !(loc.doormask & D_CLOSED) || (loc.doormask & D_LOCKED)) return false;
    const threshold = Math.trunc((currentAttr(A_STR) + currentAttr(A_DEX) + currentAttr(A_CON)) / 3);
    if (rnl(20) < threshold) {
        loc.doormask = C.D_ISOPEN;
        loc.flags = C.D_ISOPEN;
        newsym(x, y);
        vision_reset();
        vision_recalc(0);
        await pline('The door opens.');
    } else {
        exercise(A_STR, true);
        await pline('The door resists!');
    }
    game.context.move = 0;
    return true;
}

async function bumpClosedDoor(dx, dy) {
    if (dx && dy) {
        await pline("You can't move diagonally into an intact doorway.");
        game.context.move = 0;
        return false;
    }
    if (currentAttr(A_DEX) < 10) {
        await pline('Ouch!  You bump into a door.');
        exercise(A_DEX, false);
        if (game.context?.run) game._run_stop_after_move = true;
        game.context.move = 1;
        return true;
    }
    await pline('That door is closed.');
    game.context.move = 0;
    return false;
}

function runShouldStopAfterMove(source, target, run = game.context?.run) {
    if (hostileMonsterNearHeroForRunStop(run)) return true;
    // C ref: hack.c:lookaround().  Travel (`context.travel`, run mode 8)
    // does not stop just because the chosen path crosses a doorway or leaves
    // a corridor; findtravelpath()/lookaround() own travel continuation.
    if (run?.travel) return false;
    if ([C.FOUNTAIN, C.SINK, C.ALTAR, C.THRONE, C.GRAVE].includes(target?.typ)) return true;
    return target?.typ === DOOR || (source?.typ === CORR && target?.typ === C.ROOM);
}

function runStepIsOpen(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    if (sobj_at_basic(BOULDER, x, y)) return true;
    if (mon_at(x, y)) return false;
    if (loc.typ === DOOR && (loc.doormask & (D_CLOSED | D_LOCKED))) return true;
    return !blocksMove(x, y);
}

function maybeTurnCorridorRun(run) {
    if (!run || run.travel) return;
    if (!run.allowTurns) return;
    const u = game.u;
    if (!u) return;
    const current = game.level?.at(u.ux, u.uy);
    if (!current || current.typ === C.ROOM) return;
    const desiredX = u.ux + run.dx;
    const desiredY = u.uy + run.dy;
    if (runStepIsOpen(desiredX, desiredY)) return;

    let corrct = 0;
    let noturn = false;
    let x0 = 0;
    let y0 = 0;
    let m0 = 1;
    let i0 = 9;
    for (let nx = u.ux - 1; nx <= u.ux + 1; nx++) {
        for (let ny = u.uy - 1; ny <= u.uy + 1; ny++) {
            if (nx === u.ux && ny === u.uy) continue;
            const loc = game.level?.at(nx, ny);
            if (!loc || loc.typ === STONE) continue;
            if (nx === u.ux - run.dx && ny === u.uy - run.dy) continue;
            const mtmp = mon_at(nx, ny);
            const closedDoor = loc?.typ === DOOR && !!(loc.doormask & (D_CLOSED | D_LOCKED));
            let corridorCandidate = false;
            if (C.IS_OBSTRUCTED(loc.typ) || loc.typ === C.ROOM
                || C.IS_AIR(loc.typ) || loc.typ === C.ICE) {
                continue;
            } else if (closedDoor) {
                if (nx !== u.ux && ny !== u.uy) continue;
                corridorCandidate = true;
            } else if (loc.typ === CORR || loc.typ === SCORR) {
                corridorCandidate = true;
            } else if (C.IS_POOL(loc.typ) || C.IS_LAVA(loc.typ)) {
                continue;
            } else if (run.mode === 1) {
                corridorCandidate = true;
            }
            if (!corridorCandidate) continue;
            const i = dist2(nx, ny, desiredX, desiredY);
            if (i > 2) continue;
            if (corrct === 1 && dist2(nx, ny, x0, y0) !== 1) noturn = true;
            if (i < i0) {
                i0 = i;
                x0 = nx;
                y0 = ny;
                m0 = mtmp ? 1 : 0;
            }
            corrct++;
        }
    }
    if ((run.mode === 1 || run.mode === 3 || run.mode === 8)
        && !noturn && !m0 && i0
        && (corrct === 1 || (corrct === 2 && i0 === 1))) {
        const nextDx = x0 - u.ux;
        const nextDy = y0 - u.uy;
        if (nextDx !== run.dx || nextDy !== run.dy) {
            // C ref: hack.c:lookaround(); repeated corner running is limited
            // by cumulative last_str_turn rather than a one-turn boolean.
            let turn = 0;
            if (i0 === 2) {
                turn = (run.dx === y0 - u.uy && run.dy === u.ux - x0) ? 2 : -2;
            } else if (run.dx && run.dy) {
                turn = ((run.dx === run.dy && y0 === u.uy)
                    || (run.dx !== run.dy && y0 !== u.uy)) ? -1 : 1;
            } else {
                turn = ((x0 - u.ux === y0 - u.uy && !run.dy)
                    || (x0 - u.ux !== y0 - u.uy && run.dy)) ? 1 : -1;
            }
            const lastTurn = (run.lastStrTurn || 0) + turn;
            if (lastTurn < -2 || lastTurn > 2) return;
            run.lastStrTurn = lastTurn;
        }
        run.dx = nextDx;
        run.dy = nextDy;
    }
}

async function runShouldStopBeforeRepeatMove(run) {
    // C refs: allmain.c:moveloop_core(), hack.c:lookaround().  Repeated
    // rushes stop before a closed door; shifted run mode 1 treats it as a
    // corridor candidate and can still bump into it via domove_core().
    if (!run || run.travel || run.mode === 1) return false;
    if (game.u?.ublind || game.u?.uprops?.blind) return false;
    const u = game.u;
    if (!u) return false;
    for (let nx = u.ux - 1; nx <= u.ux + 1; nx++) {
        for (let ny = u.uy - 1; ny <= u.uy + 1; ny++) {
            if (nx === u.ux && ny === u.uy) continue;
            if (nx === u.ux - run.dx && ny === u.uy - run.dy) continue;
            const loc = game.level?.at(nx, ny);
            const closedDoor = loc?.typ === DOOR && !!(loc.doormask & (D_CLOSED | D_LOCKED));
            if (!closedDoor) continue;
            if (nx !== u.ux && ny !== u.uy) continue;
            if (game.flags?.mention_walls) await pline('You stop in front of the door.');
            game.context.move = 0;
            return true;
        }
    }
    return false;
}

function hostileMonsterNearHeroForRunStop(run = game.context?.run) {
    const u = game.u;
    if (!u) return false;
    for (let x = u.ux - 1; x <= u.ux + 1; x++) {
        for (let y = u.uy - 1; y <= u.uy + 1; y++) {
            if (x === u.ux && y === u.uy) continue;
            const mon = mon_at(x, y);
            if (!mon) continue;
            if (run?.mode === 1 && !run.travel) {
                // C ref: hack.c:lookaround().  Shift-direction running only
                // stops for visible monsters in the square being run toward;
                // side monsters are ignored until they block or attack.
                const infront = x === u.ux + run.dx && y === u.uy + run.dy;
                if (!infront) continue;
                if (cansee(x, y)) return true;
                continue;
            }
            if (mon.mpeaceful || mon.mtame || monsterHasNoAttacks(mon)) continue;
            if (cansee(x, y)) return true;
        }
    }
    return false;
}

export function shouldStopRunForNearbyMonster() {
    return hostileMonsterNearHeroForRunStop();
}

function monsterSwapName(mon) {
    const name = monsterName(mon);
    if (mon?.mtame) return `your ${name}`;
    if (mon?.mpeaceful) return `the peaceful ${name}`;
    return `the ${name}`;
}

function isSafeMonster(mon) {
    if (!mon || game.flags?.safe_dog === false) return false;
    if (!mon.mpeaceful) return false;
    if (!cansee(mon.mx, mon.my)) return false;
    if (game.u?.uprops?.confusion || game.u?.uconfusion) return false;
    if (game.u?.uprops?.hallucination || game.u?.uhallucination) return false;
    if (game.u?.uprops?.stunned || game.u?.ustunned) return false;
    return true;
}

function monsterHasNoAttacks(mon) {
    const attacks = mon?.data?.mattk || [];
    return !attacks.some((attack) => attack && attack[0] && attack[0] !== 'AT_BOOM');
}

function monsterNearbyForSafety() {
    const ux = game.u?.ux ?? 0;
    const uy = game.u?.uy ?? 0;
    for (const mon of game.level?.monsters || []) {
        if (Math.abs((mon.mx ?? 0) - ux) > 1 || Math.abs((mon.my ?? 0) - uy) > 1) continue;
        if (mon.mx === ux && mon.my === uy) continue;
        if (mon.m_ap_type === C.M_AP_FURNITURE || mon.m_ap_type === C.M_AP_OBJECT) continue;
        if (mon.mpeaceful && !(game.u?.uhallucination || game.u?.uprops?.hallucination)) continue;
        if (monsterHasNoAttacks(mon)) continue;
        if (mon.mundetected) continue;
        // C ref: hack.c:monster_nearby() skips helpless(mon), which is
        // msleeping || !mcanmove.  mfrozen is retained for older JS callers
        // that may not have synchronized mcanmove yet.
        if (mon.msleeping || mon.mcanmove === 0 || mon.mfrozen) continue;
        if (mon.minvis && !(game.u?.usee_invisible || game.u?.uprops?.see_invisible)) continue;
        return true;
    }
    return false;
}

async function cmdSafetyPrevention(ucverb, cmddesc, act, flagKey) {
    // C ref: do.c:cmd_safety_prevention(); safe_wait is on by default and
    // prevents explicit search/rest commands from spending a turn next to a
    // visible hostile monster.
    if (game.flags?.safe_wait === false || game.iflags?.menu_requested || game.context?.multi) {
        game[flagKey] = 0;
        return false;
    }
    let suffix = '';
    if (game.iflags?.cmdassist !== false || !(game[flagKey] || 0)) {
        suffix = `  Use 'm' prefix to force ${cmddesc}.`;
    }
    game[flagKey] = (game[flagKey] || 0) + 1;
    if (monsterNearbyForSafety()) {
        await pline(`${act}${suffix}`);
        return true;
    }
    game[flagKey] = 0;
    if (game.u?.stoned || game.u?.slimed || game.u?.strangled || game.u?.sick) {
        await pline(`${ucverb} doesn't feel like a good idea right now.`);
        return true;
    }
    return false;
}

async function attackMonster(mon) {
    // C ref: hack.c:domove() enters uhitm() instead of moving onto
    // occupied monster squares.  Reuse the current narrow uhitm() RNG front
    // door; full weapon, passive, resist, and death handling remain backlog.
    await heroMeleeAttack(mon);
}

async function swapWithSafeMonster(mon, x, y) {
    const u = game.u;
    if (!rn2(7)) {
        if (mon.mtame) {
            const fleetime = rnd(6);
            mon.mflee = true;
            mon.mfleetim = Math.max(mon.mfleetim || 0, fleetime === 1 ? 2 : fleetime);
        }
        await pline(`You stop.  ${monsterSwapName(mon).replace(/^your /, 'Your ')} is in the way!`);
        game.context.run = null;
        return;
    }
    const oldx = u.ux;
    const oldy = u.uy;
    u.ux = x;
    u.uy = y;
    mon.mx = oldx;
    mon.my = oldy;
    newsym(oldx, oldy);
    vision_recalc(1);
    refreshWarningAfterHeroMove();
    newsym(x, y);
    await pline(`You swap places with ${monsterSwapName(mon)}.`);
}

async function heroMeleeAttack(mon) {
    gethungry();
    exercise(A_DEX, true);
    const dieroll = rnd(20);
    const hit = heroMeleeToHit(mon) > dieroll;
    if (!hit) {
        await pline(`You miss ${monsterHitName(mon)}.`);
        rn2(3);
        game.context.run = null;
        return;
    }
    exercise(A_DEX, true);
    const damage = Math.max(1, rnd(heroMeleeSmallDamageDie()) + heroMeleeDamageBonus());
    if (typeof mon.mhp === 'number') {
        mon.mhp -= damage;
        if (mon.mhp <= 0) {
            const petSoundPrinted = mon.mtame ? await abuseDog(mon) : false;
            const killLine = `You kill ${monsterKillName(mon)}!`;
            if (game._pending_message) await append_pline(killLine);
            else await pline(killLine);
            if (petSoundPrinted) queue_more_prompt();
            heroKilledMonster(mon);
            if (game._more) {
                game._pre_turn_more_waiting = true;
                game._monster_turn_paused_for_more = true;
            }
            game.context.run = null;
            return;
        }
    }
    await pline(`You hit ${monsterHitName(mon)}.`);
    rn2(3);
    rn2(6);
    rn2(25);
    rn2(3);
    game.context.run = null;
}

async function swallowedHeroAttack(mon) {
    // C evidence: swallowed directional movement attacks u.ustuck rather
    // than moving.  This is still a narrow uhitm() front door.
    await heroMeleeAttack(mon);
}

async function abuseDog(mon) {
    if (!mon.mtame) return false;
    if (game.u?.conflict || game.u?.uprops?.conflict) {
        mon.mtame = Math.trunc(mon.mtame / 2);
    } else {
        mon.mtame--;
    }
    if (mon.mtame && mon.edog) mon.edog.abuse = (mon.edog.abuse || 0) + 1;
    if (mon.mx !== 0) {
        if (mon.mtame && rn2(mon.mtame)) {
            return await maybePetAbuseSound(mon);
        } else {
            return await maybePetAbuseSound(mon);
        }
    }
    return false;
}

function corpseChance(mon) {
    const genoFreq = (mon.data?.geno ?? 0) & 0x7;
    const verysmall = VERY_SMALL_MONSTERS.has(monsterName(mon)) ? 1 : 0;
    const denom = 2 + (genoFreq < 2 ? 1 : 0) + verysmall;
    return !rn2(denom);
}

function corpseStatFlagsForMonster(mon, baseFlags = C.CORPSTAT_NONE) {
    let flags = baseFlags;
    if (mon?.female) flags |= C.CORPSTAT_FEMALE;
    else if (!mon?.data?.neuter) flags |= C.CORPSTAT_MALE;
    return flags;
}

function ttyMapColor(color) {
    return color === 0 || color === 7 ? NO_COLOR : color;
}

function corpseDisplayColorForMonster(mon) {
    return ttyMapColor(mon?.data?.color ?? NO_COLOR);
}

function makeMonsterCorpse(mon, baseFlags = C.CORPSTAT_NONE) {
    // C ref: src/mon.c:make_corpse().  The ordinary xkilled() path enters
    // mkcorpstat(CORPSE, ..., CORPSTAT_INIT), so mksobj() first initializes a
    // random corpse before the caller-supplied monster type overrides it.
    if ((mon?.data?.geno || 0) & G_NOCORPSE) return null;
    const flags = corpseStatFlagsForMonster(mon, baseFlags) | C.CORPSTAT_INIT;
    const oldLiveCorpseTimeout = game._live_corpse_timeout;
    game._live_corpse_timeout = true;
    try {
        const corpse = mkcorpstat(CORPSE, mon, mon?.data, mon.mx, mon.my, flags);
        if (corpse) {
            corpse.color = corpseDisplayColorForMonster(mon);
            corpse._live_kill_corpse = true;
        }
        return corpse;
    } finally {
        game._live_corpse_timeout = oldLiveCorpseTimeout;
    }
}

function accessibleKillDropSquare(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    if (C.ACCESSIBLE(loc.typ) && !(C.IS_DOOR(loc.typ) && (loc.doormask & (D_CLOSED | D_LOCKED)))) return true;
    return C.IS_POOL(loc.typ);
}

function killDropMonsterBelowHumanSize(mon) {
    if (typeof mon?.data?.msize === 'number') return mon.data.msize < MZ_HUMAN;
    return KILL_DROP_SUBHUMAN_FALLBACK.has(monsterName(mon));
}

function discardFreeObjectForDelobjParity(obj) {
    // C ref: src/invent.c:delobj_core(); ordinary discards still probe
    // obj_resists(0,0), even though the object is never placed.
    obj_resists(obj, 0, 0);
}

function shouldDiscardKillTreasure(mon, obj) {
    // C ref: src/mon.c:xkilled().  Killed monsters may create a random
    // "illogical" object, but generated food for non-collectors and bulky
    // items from sub-human monsters are deleted before corpse_chance().
    if (!obj) return false;
    if (obj.oclass === FOOD_CLASS && !((mon.data?.mflags2 || 0) & M2_COLLECT)
        && !obj.oartifact) {
        return true;
    }
    if (killDropMonsterBelowHumanSize(mon) && obj.otyp !== FIGURINE
        && BULKY_KILL_DROP_OBJECTS.has(obj.otyp)) {
        return true;
    }
    return false;
}

function maybeDropKillTreasure(mon) {
    // C ref: mon.c:xkilled() creates a random extra object before
    // corpse_chance() when the kill-location and monster filters allow it.
    if (rn2(6)) return;
    if ((mon.data?.geno || 0) & G_NOCORPSE) return;
    if (mon.mx === game.u?.ux && mon.my === game.u?.uy) return;
    if (mon.data?.mlet === 'S_KOP') return;
    if (mon.mcloned) return;
    if (!accessibleKillDropSquare(mon.mx, mon.my)) return;
    const otmp = mkobj(RANDOM_CLASS, true);
    if (shouldDiscardKillTreasure(mon, otmp)) {
        discardFreeObjectForDelobjParity(otmp);
        return;
    }
    place_object(otmp, mon.mx, mon.my);
}

function monsterExperienceBasic(mon) {
    // C ref: exper.c:experience().
    const level = mon?.m_lev ?? mon?.data?.mlevel ?? 0;
    let xp = 1 + level * level;
    const ac = monsterArmorClass(mon);
    if (ac < 3) xp += (7 - ac) * (ac < 0 ? 2 : 1);
    const speed = mon?.data?.mmove ?? mon?.mmove ?? 12;
    if (speed > 12) xp += speed > 18 ? 5 : 3;
    for (const attack of mon?.data?.mattk || []) {
        if (!attack) continue;
        const [aatyp, adtyp, damn = 0, damd = 0] = attack;
        const attackType = MONSTER_ATTACK_TYPE.get(aatyp) ?? 0;
        if (attackType > 4) {
            if (attackType === 254) xp += 5;
            else if (attackType === 255) xp += 10;
            else xp += 3;
        }
        const damageType = MONSTER_DAMAGE_TYPE.get(adtyp);
        if (damageType == null) continue;
        if (damageType > 0 && damageType < 11) xp += 2 * level;
        else if (damageType === 15 || damageType === 18 || damageType === 40) xp += 50;
        else if (damageType !== 0) xp += level;
        if ((damd * damn) > 23) xp += level;
        if (damageType === 28 && mon?.data?.mlet === 'S_EEL') {
            // Hero polymorph/amphibious state is not modeled yet; the normal
            // human cases currently represented are non-amphibious.
            xp += 1000;
        }
    }
    if ((mon?.data?.mflags2 || 0) & M2_NASTY) xp += 7 * level;
    if (level > 8) xp += 50;
    return xp;
}

function gainExperienceForKill(mon) {
    // C ref: mon.c:xkilled() -> more_experienced().
    if (!game.u) return;
    game.u.uexp = (game.u.uexp || 0) + monsterExperienceBasic(mon);
}

function heroKilledMonster(mon) {
    if (mon.mtame) {
        // C ref: mon.c:xkilled(); killing a tame monster is a major
        // alignment abuse and feeds later peace_minded() RNG gates.
        adjalign(-15);
        game.u.uluck = (game.u?.uluck || 0) - 1;
        game._pending_tame_kill_reaction = true;
    }
    maybeDropKillTreasure(mon);
    if (corpseChance(mon) && accessibleKillDropSquare(mon.mx, mon.my)) {
        makeMonsterCorpse(mon);
    }
    if (mon.mpeaceful && !rn2(2)) {
        // Luck adjustment is outside the current scoring surface.
    }
    gainExperienceForKill(mon);
    const monsters = game.level?.monsters || [];
    const idx = monsters.indexOf(mon);
    if (idx >= 0) monsters.splice(idx, 1);
    newsym(mon.mx, mon.my);
}

async function forceFightEmpty(dx, dy) {
    const x = game.u.ux + dx;
    const y = game.u.uy + dy;
    const loc = game.level?.at(x, y);
    let target = 'thin air';
    let solid = false;

    if (!loc) {
        target = 'an unknown obstacle';
        solid = true;
    } else if (loc.typ === DOOR && (loc.doormask & (D_CLOSED | D_LOCKED))) {
        target = 'the door';
        solid = true;
    } else if (loc.typ === STONE || IS_WALL(loc.typ) || loc.typ === SDOOR || loc.typ === SCORR) {
        target = 'the wall';
        solid = true;
    }

    await pline(`You ${solid ? 'harmlessly ' : ''}attack ${target}.`);
}

function zapDig(dx, dy) {
    let depth = rn1(18, 8);
    let x = game.u.ux + dx;
    let y = game.u.uy + dy;
    while (--depth >= 0) {
        const loc = game.level?.at(x, y);
        if (!loc) break;
        if (IS_WALL(loc.typ) || loc.typ === SDOOR) {
            loc.typ = DOOR;
            loc.doormask = D_NODOOR;
            loc.flags = 0;
            depth -= 2;
            newsym(x, y);
        } else if (loc.typ === STONE || loc.typ === SCORR) {
            loc.typ = CORR;
            loc.flags = 0;
            depth--;
            newsym(x, y);
        } else if (IS_OBSTRUCTED(loc.typ) && loc.typ !== DOOR) {
            loc.typ = CORR;
            loc.flags = 0;
            depth--;
            newsym(x, y);
        }
        x += dx;
        y += dy;
    }
}

const TOURIST_DISCOVERIES_SCREEN = "Discoveries, by order of discovery within each class\n\n\u001b[7mScrolls\u001b[0m\n  scroll of magic mapping (ANDOVA BEGARIN)\n\u001b[7mPotions\u001b[0m\n  potion of extra healing (murky)\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n--More--";
const DISCOVERY_DESCRIPTION_SLOT = new Map([
    [ELVEN_ARROW, 'runed arrow'],
    [ORCISH_ARROW, 'crude arrow'],
    [YA, 'bamboo arrow'],
    [ELVEN_SPEAR, 'runed spear'],
    [ORCISH_SPEAR, 'crude spear'],
    [DWARVISH_SPEAR, 'stout spear'],
    [JAVELIN, 'throwing spear'],
    [ELVEN_BOW, 'runed bow'],
    [ORCISH_BOW, 'crude bow'],
    [YUMI, 'long bow'],
    [ELVEN_DAGGER, 'runed dagger'],
    [ORCISH_DAGGER, 'crude dagger'],
    [SACK, 'bag'],
    [QUARTERSTAFF, 'staff'],
    [CLOAK_OF_MAGIC_RESISTANCE, 148],
    [383, 376], // SPE_FORCE_BOLT's shuffled description slot in this object table.
]);
const WIZARD_SKILL_BASED_SPELLBOOKS = [
    367, // magic missile
    370, // sleep
    372, // light
    373, // detect monsters
    374, // healing
    375, // knock
    377, // confuse monster
    379, // drain life
    380, // slow monster
    384, // cause fear
    403, // protection
];
const DISCOVERY_SECTIONS = [
    ['Amulets', AMULET_CLASS],
    ['Weapons', WEAPON_CLASS],
    ['Armor', ARMOR_CLASS],
    ['Scrolls', SCROLL_CLASS],
    ['Spellbooks', SPBOOK_CLASS],
    ['Potions', POTION_CLASS],
    ['Rings', RING_CLASS],
    ['Wands', WAND_CLASS],
    ['Tools', TOOL_CLASS],
];
const STR_ATTR1 = " Contestant the Tourist's attributes:\n\n Background:\n  You are a Rambler, a level 1 female human Tourist.\n  You are neutral, on a mission for The Lady\n  who is opposed by Blind Io (lawful) and Offler (chaotic).\n  You are left-handed.\n  You are in the Dungeons of Doom, on level 1.\n  You entered the dungeon 11 turns ago.\n  You have 0 experience points.\n\n Basics:\n  You have all 10 hit points.\n  You have both energy points (spell power).\n  Your armor class is 10.\n  Your wallet contains 757 zorkmids.\n  Autopickup is off.\n\n Characteristics:\n  Your strength is 9.\n  Your dexterity is 14.\n  Your constitution is 12.\n  Your intelligence is 11.\n (1 of 2)";
const STR_ATTR2 = "  Your wisdom is 16.\n  Your charisma is 16.\n\n Status:\n  You aren't hungry.\n  You are unencumbered.\n  You are bare handed.\n  You are unskilled in bare handed combat.\n\n Miscellaneous:\n  Total elapsed playing time is none.\n (2 of 2)";
const INVALID_DIRECTION_HELP_SCREEN = "cmdassist: Invalid direction key!\n\nValid direction keys are:\n\x1b[10Cy  k  u\n\x1b[11C\\ | /\n\x1b[10Ch- . -l\n\x1b[11C/ | \\\n\x1b[10Cb  j  n\n\n\x1b[10C<  up\n\x1b[10C>  down\n\x1b[10C.  direct at yourself\n\n(Suppress this message with !cmdassist in config file.)\n\n\n\n\n\n\n\n\n\n--More--";
const TRAVEL_CURSOR_PROMPT = "(For instructions type a '?')  Move cursor to the desired destination:";
const GETPOS_HELP_LINES = [
    "Use 'h', 'j', 'k', 'l' to move the cursor to the desired destination.",
    "Use 'H', 'J', 'K', 'L' to fast-move the cursor, 8 units at a time.",
    "(or prefix normal move with 'G' or 'g' to fast-move)",
    "Or enter a background symbol (ex. '<').",
    "Use '@' to move the cursor on yourself.",
    "Use 'm'/'M' to move the cursor to next/previous monster.",
    "Use 'o'/'O' to move the cursor to next/previous object.",
    "Use 'd'/'D' to move the cursor to next/previous door or doorway.",
    "Use 'x'/'X' to move the cursor next to an unexplored location.",
    "Use 'a'/'A' to move the cursor to anything interesting.",
    "Use '*' to change fast-move mode to skipping same glyphs.",
    "Use '!' to toggle menu listing for possible targets.",
    'Use \'"\' to change the mode of limiting possible targets.',
    "Use '#' to toggle automatic description.",
    "Type a '.' when you are at the right place.",
];
const LOOKUP_DATA = new Map([
    // C ref: dat/data.base:fountain.
    ['fountain', [
        'Rest! This little Fountain runs',
        'Thus for aye: -- It never stays',
        'For the look of summer suns,',
        'Nor the cold of winter days.',
        "Whose'er shall wander near,",
        'When the Syrian heat is worst,',
        'Let him hither come, nor fear',
        'Lest he may not slake his thirst:',
        'He will find this little river',
        'Running still, as bright as ever.',
        'Let him drink, and onward hie,',
        'Bearing but in thought, that I,',
        'Erotas, bade the Naiad fall,',
        'And thank the great god Pan for all!',
        '        [ For a Fountain, by Bryan Waller Procter ]',
    ]],
    // C ref: dat/data.base:*staff.
    ['quarterstaff', [
        "So they stood, each in his place, neither moving a finger's",
        'breadth back, for one good hour, and many blows were given',
        'and received by each in that time, till here and there were',
        'sore bones and bumps, yet neither thought of crying "Enough,"',
        'or seemed likely to fall from off the bridge.  Now and then',
        'they stopped to rest, and each thought that he never had seen',
        'in all his life before such a hand at quarterstaff.  At last',
        'Robin gave the stranger a blow upon the ribs that made his',
        'jacket smoke like a damp straw thatch in the sun.  So shrewd',
        "was the stroke that the stranger came within a hair's breadth",
        'of falling off the bridge; but he regained himself right',
        'quickly, and, by a dexterous blow, gave Robin a crack on the',
        'crown that caused the blood to flow.  Then Robin grew mad',
        'with anger, and smote with all his might at the other; but',
        'the stranger warded the blow, and once again thwacked Robin,',
        'and this time so fairly that he fell heels over head into the',
        'water, as the queen pin falls in a game of bowls.',
        '        [ The Merry Adventures of Robin Hood, by Howard Pyle ]',
    ]],
]);
const HELP_MENU_LINES = [
    'Select one item:',
    '',
    'a - About NetHack (version information).',
    'b - Long description of the game and commands.',
    'c - List of game commands.',
    'd - Concise history of NetHack.',
    'e - Info on a character in the game display.',
    'f - Info on what a given key does.',
    'g - List of game options.',
    'h - Longer explanation of game options.',
    "i - Using the '#optionsfull' or 'm O' command to set options.",
    'j - Full list of keyboard commands.',
    'k - List of extended commands.',
    'l - List menu control keys.',
    "m - Description of NetHack's command line.",
    'n - The NetHack license.',
    'o - Support information.',
    '(end)',
];
const HELP_FILE_BY_SELECTOR = new Map([
    ['b', 'help'],
    ['c', 'hh'],
    ['d', 'history'],
    ['h', 'opthelp'],
    ['i', 'optmenu'],
    ['j', 'cmdhelp'],
    ['l', 'cmdhelp'],
    ['m', 'usagehlp'],
    ['n', 'license'],
]);
const ABOUT_NETHACK_PAGES = [
    [
        'MacOS NetHack Version 5.0.0 - last build May  2 2026 12:00:00.',
        '',
        'Options compiled into this edition:',
        '    I32LP64 data model, color, data file compression, deferred handling of',
        '    hangup signal, insurance files for recovering from crashes, live logging',
        '    support, log file, extended log file, errors and warnings log file, mail',
        '    daemon, news file, internal pager used for viewing help files, pattern',
        '    matching via posixregex, pseudo random numbers generated by ISAAC64,',
        '    strong PRNG seed from /dev/random, restore saved games via menu, screen',
        '    clipping, shell command, traditional status display, status via',
        '    windowport with highlighting, suspend command, terminal info library,',
        '    system configuration at run-time, show stack trace on error, launch',
        '    browser to report issues, save and bones files accepted from version',
        '    5.0.0 only, and basic NetHack features.',
        '',
        'Supported windowing system:',
        '    "tty" (traditional text with optional line-drawing).',
        '',
        'Supported soundlib:',
        '    "nosound".',
        '',
        "NetHack 5.0.* uses the 'Lua' interpreter to process some data:",
        '    Lua 5.4.8  Copyright (C) 1994-2025 Lua.org, PUC-Rio',
    ],
    [
        '    "Permission is hereby granted, free of charge, to any person obtaining',
        '     a copy of this software and associated documentation files (the',
        '     "Software"), to deal in the Software without restriction including',
        '     without limitation the rights to use, copy, modify, merge, publish,',
        '     distribute, sublicense, and/or sell copies of the Software, and to',
        '     permit persons to whom the Software is furnished to do so, subject to',
        '     the following conditions:',
        '     The above copyright notice and this permission notice shall be',
        '     included in all copies or substantial portions of the Software."',
    ],
];
const OPTION_HELP_LINES = [
    '',
    '                 NetHack Options Help:',
    '',
    'Set options as OPTIONS=<options> in',
    '/Users/davidbau/git/mazesofmenace/teleport/maud/test/comparison/c-harness/results/.nethackrc',
    'or use `NETHACKOPTIONS="<options>"\' in your environment',
    '(<options> is a list of options separated by commas)',
    'or press "O" while playing and use the menu.',
    '',
    'Boolean options (which can be negated by prefixing them with \'!\' or "no"):',
    'accessiblemsg, acoustics, altmeta, armorstatus, autodescribe, autodig,',
    'autoopen, autopickup, autoquiver, bgcolors, blind, bones, checkpoint,',
    'cmdassist, color, confirm, customcolors, customsymbols, dark_room, deaf,',
    'dropped_nopick, eight_bit_tty, extmenu, female, fireassist, fixinv,',
    'force_invmenu, goldX, help, herecmd_menu, hilite_pet, hilite_pile,',
    'hitpointbar, idlecheckpoint, ignintr, implicit_uncursed, legacy,',
    'lit_corridor, lootabc, mail, mention_decor, mention_map, mention_walls,',
    'menu_overlay, menucolors, mon_movement, news, nudist, null, pauper,',
    'pickup_stolen, pickup_thrown, price_quotes, pushweapon, query_menu,',
    'quick_farsight, reroll, rest_on_space, safe_pet, safe_wait, selectsaved,',
    'showdamage, showexp, showrace, showvers, silent, sortpack, sounds, sparkle,',
    'spot_monsters, standout, status_updates, terrainstatus, time, tips,',
    'tombstone, toptenwin, travel, tutorial, use_darkgray, use_inverse,',
    'use_truecolor, verbose, voices, weaponstatus, whatis_menu, whatis_moveskip.',
    '',
    'Compound options:',
    optLine('windowtype', 'windowing system to use (should be specified first),'),
    optLine('playmode', 'normal play, non-scoring explore mode, or debug mode,'),
    optLine('name', "your character's name (e.g., name:Merlin-W),"),
    optLine('role', 'your starting role (e.g., Barbarian, Valkyrie),'),
    optLine('race', 'your starting race (e.g., Human, Elf),'),
    optLine('gender', 'your starting gender (male or female),'),
    optLine('alignment', 'your starting alignment (lawful, neutral, or chaotic),'),
    optLine('altkeyhandling', '(not applicable),'),
    optLine('autounlock', 'action to take when encountering locked door or chest,'),
    optLine('boulder', 'deprecated (use S_boulder in sym file instead),'),
    optLine('catname', 'name of your starting pet if it is a kitten,'),
    optLine('crash_email', 'email address for reporting,'),
    optLine('crash_name', 'your name for reporting,'),
    optLine('crash_urlmax', 'length of longest url we can generate,'),
    optLine('DECgraphics', 'load DECGraphics display symbols into symset,'),
    optLine('disclose', 'the kinds of information to disclose at end of game,'),
    optLine('dogname', 'name of your starting pet if it is a little dog,'),
    optLine('dungeon', 'list of symbols to use in drawing the dungeon map,'),
    optLine('effects', 'list of symbols to use in drawing special effects,'),
    optLine('fruit', 'name of a fruit you enjoy eating,'),
    optLineTight('glyph', 'set representation of a glyph to a unicode value and color,'),
    optLine('hilite_status', 'a status highlighting rule (can occur multiple times),'),
    optLine('horsename', 'name of your starting pet if it is a pony,'),
    optLine('IBMgraphics', 'load IBMGraphics display symbols into symset,'),
    optLine('menu_deselect_all', 'deselect all items in a menu,'),
    optLine('menu_deselect_page', 'deselect all items on this page of a menu,'),
    optLine('menu_first_page', 'jump to the first page in a menu,'),
    optLine('menu_headings', 'display style for menu headings,'),
    optLine('menu_invert_all', 'invert all items in a menu,'),
    optLine('menu_invert_page', 'invert all items on this page of a menu,'),
    optLine('menu_last_page', 'jump to the last page in a menu,'),
    optLine('menu_next_page', 'go to the next menu page,'),
    optLine('menu_objsyms', 'show object symbols in menus,'),
    optLine('menu_previous_page', 'go to the previous menu page,'),
    optLine('menu_search', 'search for a menu item,'),
    optLine('menu_select_all', 'select all items in a menu,'),
    optLine('menu_select_page', 'select all items on this page of a menu,'),
    optLine('menu_shift_left', 'pan current menu page left,'),
    optLine('menu_shift_right', 'pan current menu page right,'),
    optLine('menuinvertmode', 'experimental behavior of menu inverts,'),
    optLine('menustyle', 'user interface for object selection,'),
    optLine('monsters', 'list of symbols to use for monsters,'),
    optLine('msg_window', 'control of "view previous message(s)" (^P) behavior,'),
    optLine('msghistory', 'number of top line messages to save,'),
    optLine('number_pad', 'use the number pad for movement,'),
    optLine('objects', 'list of symbols to use for objects,'),
    optLine('packorder', 'the inventory order of the items in your pack,'),
    optLineTight('paranoid_confirmation', 'extra prompting in certain situations,'),
    optLine('petattr', 'attributes for highlighting pets,'),
    optLine('pettype', 'your preferred initial pet type,'),
    optLine('pickup_burden', 'maximum burden picked up before prompt,'),
    optLine('pickup_types', 'types of objects to pick up automatically,'),
    optLine('pile_limit', 'threshold for "there are many objects here",'),
    optLine('roguesymset', 'load a set of rogue display symbols from symbols file,'),
    optLine('runmode', "display frequency when `running' or `travelling',"),
    optLine('scores', 'the parts of the score list you wish to see,'),
    optLine('sortdiscoveries', 'preferred order when displaying discovered objects,'),
    optLine('sortloot', 'sort object selection lists by description,'),
    optLine('sortvanquished', 'preferred order when displaying vanquished monsters,'),
    optLine('soundlib', 'soundlib interface to use (if any),'),
    optLine('statushilites', '0=no status highlighting, N=show highlights for N turns,'),
    optLine('statuslines', '2 or 3 lines for status display,'),
    optLine('suppress_alert', 'suppress alerts about version-specific features,'),
    optLine('symset', 'load a set of display symbols from symbols file,'),
    optLine('traps', 'list of symbols to use in drawing traps,'),
    optLine('versinfo', "extra information for 'showvers',"),
    optLine('warnings', 'display characters for warnings,'),
    optLine('whatis_coord', 'show coordinates when auto-describing cursor position,'),
    optLineTight('whatis_filter', 'filter coordinate locations when targeting next or previous,'),
    optLine('cond_', 'prefix for cond_ options,'),
    optLine('font', 'prefix for font options.'),
    '',
    'Other settings:',
    ' autocompletions',
    ' autopickup exceptions',
    ' bind keys',
    ' menu colors',
    ' message types',
    ' status condition fields',
    ' status highlight rules',
    '',
    '',
    'Some of the options can only be set before the game is started;',
    'those items will not be selectable in the \'O\' command\'s menu.',
    'Some options are stored in a game\'s save file, and will keep saved',
    'values when restoring that game even if you have updated your config-',
    'uration file to change them.  Such changes will matter for new games.',
    'The "other settings" can be set with \'O\', but when set within the',
    'configuration file they use their own directives rather than OPTIONS.',
    'See NetHack\'s "Guidebook" for details.',
];
const MENU_CONTROL_LINES = [
    'Menu control keys:',
    '',
    '           Whole  Current',
    '            Menu   Page',
    '  Select     .      ,',
    '  Invert     @      ~',
    'Deselect     -      \\',
    '',
    '   Go to     >      Next page',
    '             <      Previous page',
    '             ^      First page',
    '             |      Last page',
    '',
    '  Search     :      Exter a target string and invert all matching entries',
    '',
    '   Other   Return   Accept current choice(s) and dismiss menu',
    '           Enter    Same as Return',
    '           Space    If not on last page, advance one page;',
    '                    when on last page, treat like Return',
    '           Escape   Cancel menu without making any choice(s)',
];
const CONTACT_LINES = [
    'To contact the NetHack development team directly,',
    "see the 'Contact' form on our website or email <devteam@nethack.org>.",
    '',
    'For more information on NetHack, or to report a bug,',
    'visit our website "https://www.nethack.org/".',
];
const KEY_BINDING_LINES = [
    '',
    '            Full Current Key Bindings List',
    '        (also commands with no key assignment)',
    '',
    'Directional keys:',
    '          y  k  u',
    '           \\ | /',
    '          h- . -l',
    '           / | \\',
    '          b  j  n',
    '',
    'Ctrl+<direction> will run in specified direction until something very',
    '        interesting is seen.',
    'Shift+<direction> will run in specified direction until you encounter',
    '        an obstacle.',
    '',
    'Miscellaneous keys:',
    '<esc>   cancel current prompt or pending prefix',
    keyMenuLine('^C', 'interrupt: break out of NetHack (SIGINT)'),
    '',
    'Menu control keys:',
    keyMenuLine('>', 'Go to next page'),
    keyMenuLine('<', 'Go to previous page'),
    keyMenuLine('^', 'Go to first page'),
    keyMenuLine('|', 'Go to last page'),
    keyMenuLine('.', 'Select all items in entire menu'),
    keyMenuLine('@', 'Invert selection for all items'),
    keyMenuLine('-', 'Unselect all items in entire menu'),
    keyMenuLine(',', 'Select all items on current page'),
    keyMenuLine('~', "Invert current page's selections"),
    keyMenuLine('\\', 'Unselect all items on current page'),
    keyMenuLine(':', 'Search and invert matching items'),
    keyMenuLine('Return', 'Accept current choice(s) and dismiss menu'),
    keyMenuLine('Enter', 'Same as Return'),
    keyMenuLine('Space', 'If not on last page, advance one page;'),
    '        when on last page, treat like Return',
    keyMenuLine('Escape', 'Cancel menu without making any choice(s)'),
    '',
    'General commands:',
    keyBindingLine('^A', 'repeat', 'repeat a previous command'),
    keyBindingLine('^O', 'overview', 'show a summary of the explored dungeon'),
    keyBindingLine('^P', 'prevmsg', 'view recent game messages'),
    keyBindingLine('^R', 'redraw', 'redraw screen'),
    keyBindingLine('^X', 'attributes', 'show your attributes'),
    keyBindingLine('^Z', 'suspend', "push game to background ('fg' to come back)"),
    keyBindingLine('!', 'shell', "leave game to enter a sub-shell ('exit' to come back)"),
    keyBindingLine('"', 'seeamulet', 'show the amulet currently worn'),
    keyBindingLine('#', '#', 'enter and perform an extended command'),
    keyBindingLine('$', 'showgold', 'show gold, possibly shop credit or debt'),
    keyBindingLine('&', 'whatdoes', 'tell what a command does'),
    keyBindingLine('(', 'seetools', 'show the tools currently in use'),
    keyBindingLine(')', 'seeweapon', 'show the weapon currently wielded'),
    keyBindingLine('*', 'seeall', 'show all equipment in use'),
    keyBindingLine('+', 'showspells', 'list and reorder known spells'),
    keyBindingLine('/', 'whatis', 'show what type of thing a symbol corresponds to'),
    keyBindingLine(';', 'glance', 'show what type of thing a map symbol corresponds to'),
    keyBindingLine('=', 'seerings', 'show the ring(s) currently worn'),
    keyBindingLine('?', 'help', 'give a help message'),
    keyBindingLine('@', 'autopickup', "toggle the 'autopickup' option on/off"),
    keyBindingLine('C', 'call', 'name a monster, specific object, or type of object'),
    keyBindingLine('I', 'inventtype', 'show inventory of one specific item class'),
    keyBindingLine('O', 'options', 'show option settings'),
    keyBindingLine('S', 'save', 'save the game and exit'),
    keyBindingLine('V', 'versionshort', 'show version and date+time program was built'),
    keyBindingLine('[', 'seearmor', 'show the armor currently worn'),
    keyBindingLine('\\', 'known', 'show what object types have been discovered'),
    keyBindingLine('^', 'showtrap', 'describe an adjacent, discovered trap'),
    keyBindingLine('`', 'knownclass', 'show discovered types for one class of objects'),
    keyBindingLine('i', 'inventory', 'show your inventory'),
    keyBindingLine('v', 'chronicle', 'show journal of major events'),
    keyBindingLine('|', 'perminv', 'scroll persistent inventory display'),
    keyBindingLine('<del>', 'terrain', 'view map without monsters or objects obstructing it'),
    keyBindingLine('M-?', '?', 'list all extended commands'),
    keyBindingLine('M-A', 'annotate', 'name current level'),
    keyBindingLine('M-C', 'conduct', 'list voluntary challenges you have maintained'),
    keyBindingLine('M-N', 'name', 'same as call; name a monster or object or object type'),
    keyBindingLine('M-O', 'overview', 'show a summary of the explored dungeon'),
    keyBindingLine('M-V', 'vanquished', 'list vanquished monsters'),
    keyBindingLine('M-X', 'exploremode', 'enter explore (discovery) mode'),
    keyBindingLine('M-a', 'adjust', 'adjust inventory letters'),
    keyBindingLine('M-e', 'enhance', 'advance or check weapon and spell skills'),
    keyBindingLine('M-g', 'genocided', 'list monsters that have been genocided or become extinct'),
    keyBindingLine('M-n', 'name', 'same as call; name a monster or object or object type'),
    keyBindingLine('M-v', 'version', 'list compile time options for this version of NetHack'),
    extendedKeyLine('#bugreport', 'file a bug report'),
    extendedKeyLine('#herecmdmenu', 'show menu of commands you can do here'),
    extendedKeyLine('#history', "show a summary of the game's development"),
    extendedKeyLine('#lookaround', 'describe what you can see'),
    extendedKeyLine('#optionsfull', 'show all option settings, possibly change them'),
    extendedKeyLine('#quit', 'exit without saving current game'),
    extendedKeyLine('#saveoptions', 'save the game configuration'),
    extendedKeyLine('#therecmdmenu', 'menu of commands you can do from here to adjacent spot'),
    extendedKeyLine('#toggle', 'toggle boolean option'),
    '',
    'Game commands:',
    keyBindingLine('^D', 'kick', 'kick something'),
    keyBindingLine('^T', 'teleport', 'teleport around the level'),
    keyBindingLine('^_', 'retravel', 'travel to previously selected travel location'),
    keyBindingLine(',', 'pickup', 'pick up things at the current location'),
    keyBindingLine('-', 'fight', "prefix: force fight even if you don't see a monster"),
    keyBindingLine('.', 'wait', 'rest one move while doing nothing'),
    keyBindingLine('5', 'run', 'prefix: run until something interesting is seen'),
    keyBindingLine(':', 'look', 'look at what is here'),
    keyBindingLine('<', 'up', 'go up a staircase'),
    keyBindingLine('>', 'down', 'go down a staircase'),
    keyBindingLine('A', 'takeoffall', 'remove all armor'),
    keyBindingLine('D', 'droptype', 'drop specific item types'),
    keyBindingLine('E', 'engrave', 'engrave writing on the floor'),
    keyBindingLine('F', 'fight', "prefix: force fight even if you don't see a monster"),
    keyBindingLine('G', 'run', 'prefix: run until something interesting is seen'),
    keyBindingLine('P', 'puton', 'put on an accessory (ring, amulet, etc)'),
    keyBindingLine('Q', 'quiver', 'select ammunition for quiver'),
    keyBindingLine('R', 'remove', 'remove an accessory (ring, amulet, etc)'),
    keyBindingLine('T', 'takeoff', 'take off one piece of armor'),
    keyBindingLine('W', 'wear', 'wear a piece of armor'),
    keyBindingLine('X', 'twoweapon', 'toggle two-weapon combat'),
    keyBindingLine('Z', 'cast', 'zap (cast) a spell'),
    keyBindingLine('_', 'travel', 'travel to a specific location on the map'),
    keyBindingLine('a', 'apply', 'apply (use) a tool (pick-axe, key, lamp...)'),
    keyBindingLine('c', 'close', 'close a door'),
    keyBindingLine('d', 'drop', 'drop an item'),
    keyBindingLine('e', 'eat', 'eat something'),
    keyBindingLine('f', 'fire', 'fire ammunition from quiver'),
    keyBindingLine('g', 'rush', 'prefix: rush until something interesting is seen'),
    keyBindingLine('m', 'reqmenu', 'prefix: request menu or modify command'),
    keyBindingLine('o', 'open', 'open a door'),
    keyBindingLine('p', 'pay', 'pay your shopping bill'),
    keyBindingLine('q', 'quaff', 'quaff (drink) something'),
    keyBindingLine('r', 'read', 'read a scroll or spellbook'),
    keyBindingLine('s', 'search', 'search for traps and secret doors'),
    keyBindingLine('t', 'throw', 'throw something'),
    keyBindingLine('w', 'wield', 'wield (put in use) a weapon'),
    keyBindingLine('x', 'swap', 'swap wielded and secondary weapons'),
    keyBindingLine('z', 'zap', 'zap a wand'),
    keyBindingLine('M-2', 'twoweapon', 'toggle two-weapon combat'),
    keyBindingLine('M-5', 'rush', 'prefix: rush until something interesting is seen'),
    keyBindingLine('M-R', 'ride', 'mount or dismount a saddled steed'),
    keyBindingLine('M-T', 'tip', 'empty a container'),
    keyBindingLine('M-c', 'chat', 'talk to someone'),
    keyBindingLine('M-d', 'dip', 'dip an object into something'),
    keyBindingLine('M-f', 'force', 'force a lock'),
    keyBindingLine('M-i', 'invoke', "invoke an object's special powers"),
    keyBindingLine('M-j', 'jump', 'jump to another location'),
    keyBindingLine('M-l', 'loot', 'loot a box on the floor'),
    keyBindingLine('M-m', 'monster', "use monster's special ability"),
    keyBindingLine('M-o', 'offer', 'offer a sacrifice to the gods'),
    keyBindingLine('M-p', 'pray', 'pray to the gods for help'),
    keyBindingLine('M-r', 'rub', 'rub a lamp or a stone'),
    keyBindingLine('M-s', 'sit', 'sit down'),
    keyBindingLine('M-t', 'turn', 'turn undead away'),
    keyBindingLine('M-u', 'untrap', 'untrap something'),
    keyBindingLine('M-w', 'wipe', 'wipe off your face'),
];

function optLine(name, desc) {
    // C ref: options.c:option_help() formats compound option names with
    // "%-20s - %s" before the tty text-window renderer compresses spaces.
    return `\`${name}'`.padEnd(20, ' ') + ` - ${desc}`;
}

function optLineTight(name, desc) {
    return `\`${name}' - ${desc}`;
}

function keyMenuLine(key, desc) {
    return key.padEnd(8, ' ') + desc;
}

function keyBindingLine(key, cmd, desc) {
    return key.padEnd(8, ' ') + cmd.padEnd(14, ' ') + desc;
}

function extendedKeyLine(cmd, desc) {
    return cmd.padEnd(22, ' ') + desc;
}

function showOverride(screen, cursor) {
    game._override_serialized_screen = null;
    game._override_screen = screen;
    game._override_cursor = cursor ? [cursor[0], cursor[1], 1] : null;
    if (game.nhDisplay && cursor) {
        game.nhDisplay.cursorCol = cursor[0];
        game.nhDisplay.cursorRow = cursor[1];
    }
}

function showSerializedOverride(screen, cursor) {
    const display = game.nhDisplay;
    const term = display?.terminal || display;
    if (term?.serialize && !term._teleportSerializeBase) {
        const originalSerialize = term.serialize.bind(term);
        Object.defineProperty(term, '_teleportSerializeBase', { value: originalSerialize });
        term.serialize = () => ((game._override_screen || game._override_serialized_persistent)
                && game._override_serialized_screen)
            ? game._override_serialized_screen
            : originalSerialize();
    }
    showOverride(screen, cursor);
    game._override_serialized_screen = screen;
}

function clearOverrideScreen() {
    game._override_screen = null;
    game._override_serialized_screen = null;
    game._override_serialized_persistent = false;
    game._override_cursor = null;
    game._override_prev = null;
}

async function redrawAfterFullScreenMenuDismiss() {
    // C ref: win/tty/wintty.c:erase_menu_or_text().  Full-screen menus
    // dismissed with offx == 0 restore the playfield via docrt()+flush.
    const prevWarning = game._hallucination_warning_rng_active;
    game._hallucination_warning_rng_active = true;
    try {
        vision_recalc(2);
        vision_recalc(0);
        await docrt();
        await flush_screen(1);
    } finally {
        game._hallucination_warning_rng_active = prevWarning;
    }
}

const TRAVEL_TIP_ROWS = [
    [0, 'Tip: Farlooking or selecting a map location'],
    [2, 'You are now in a "farlook" mode - the movement keys move the cursor,'],
    [3, 'not your character.  Game time does not advance.  This mode is used'],
    [4, 'to look around the map, or to select a location on it.'],
    [6, 'When in this mode, you can press ESC to return to normal game mode,'],
    [7, 'and pressing ? will show the key help.'],
    [8, '(end)'],
];

function showTravelTipOverScreen(baseScreen) {
    const lines = String(baseScreen || '').split('\n');
    while (lines.length < C.TERMINAL_ROWS) lines.push('');
    for (let row = 0; row <= 8; row++) lines[row] = '';
    for (const [row, text] of TRAVEL_TIP_ROWS) lines[row] = `\x1b[10C${text}`;
    showSerializedOverride(lines.slice(0, C.TERMINAL_ROWS).join('\n'), [16, 8]);
    game._override_serialized_persistent = true;
}

async function showTravelTipScreen(baseScreen = null) {
    // C refs: cmd.c:dotravel(), detect.c:browse_map().  Farlook, travel,
    // and terrain browsing all use the same getpos tip before the first
    // cursor prompt.
    if (baseScreen) {
        showTravelTipOverScreen(baseScreen);
        return;
    }
    await flush_screen(1);
    const display = game.nhDisplay;
    if (!display?.putstr) return;
    for (let row = 0; row <= 8; row++)
        display.putstr(9, row, ' '.repeat(C.COLNO - 9), NO_COLOR, 0);
    for (const [row, text] of TRAVEL_TIP_ROWS) {
        display.putstr(10, row, text, NO_COLOR, 0);
    }
    const screen = serialize_terminal_grid(display);
    showSerializedOverride(screen, [16, 8]);
    game._override_serialized_persistent = true;
}

async function showLookAtMenu() {
    // C ref: pager.c:dowhatis().  The tty "look at" chooser is drawn over
    // the map; selecting '/' enters the getpos farlook path.
    await flush_screen(1);
    const display = game.nhDisplay;
    if (!display?.putstr) return;
    for (let row = 0; row <= 14; row++) {
        for (let col = 39; col < COLNO; col++)
            display.setCell(col, row, ' ', NO_COLOR, 0);
    }
    const rows = [
        [0, 40, 'What do you want to look at:'],
        [2, 40, '/ - something on the map'],
        [3, 40, "i - something you're carrying"],
        [4, 40, '? - something else (by symbol or name)'],
        [6, 40, 'm - nearby monsters'],
        [7, 40, 'M - all monsters shown on map'],
        [8, 40, 'o - nearby objects'],
        [9, 40, 'O - all objects shown on map'],
        [10, 40, 't - nearby traps'],
        [11, 40, 'T - all seen or remembered traps'],
        [12, 40, 'e - nearby engravings'],
        [13, 40, 'E - all seen or remembered engravings'],
        [14, 40, '(end)'],
    ];
    for (const [row, col, text] of rows)
        display.putstr(col, row, text, NO_COLOR, row === 0 ? ATR_INVERSE : 0);
    const screen = serialize_terminal_grid(display);
    showSerializedOverride(screen, [46, 14]);
    game._override_serialized_persistent = true;
}

async function showHelpMenu() {
    // C ref: pager.c:dohelp().  Tty renders the NHW_MENU over the existing
    // map with the menu body starting at column 17.
    await flush_screen(1);
    const display = game.nhDisplay;
    if (!display?.putstr) return;
    for (let row = 0; row < HELP_MENU_LINES.length; row++) {
        for (let col = 16; col < COLNO; col++)
            display.setCell(col, row, ' ', NO_COLOR, 0);
    }
    for (let row = 0; row < HELP_MENU_LINES.length; row++)
        display.putstr(17, row, HELP_MENU_LINES[row], NO_COLOR, row === 0 ? ATR_INVERSE : 0);
    const screen = serialize_terminal_grid(display);
    game._help_menu_screen = screen;
    showSerializedOverride(screen, [23, HELP_MENU_LINES.length - 1]);
    game._override_serialized_persistent = false;
}

function expandTabsForTty(line) {
    let out = '';
    let col = 0;
    for (const ch of String(line ?? '')) {
        if (ch === '\t') {
            const count = 8 - (col % 8);
            out += ' '.repeat(count);
            col += count;
        } else {
            out += ch;
            col++;
        }
    }
    return out;
}

function wrapTtyTextLine(line) {
    // C ref: win/tty/wintty.c:tty_putstr().  Text windows store long lines,
    // but if a space appears before the terminal edge they split there.
    const out = [];
    let rest = expandTabsForTty(line);
    while (rest.length + 1 > COLNO) {
        let split = -1;
        for (let i = COLNO - 1; i > 0; i--) {
            if (rest[i] === ' ') {
                split = i + 1;
                break;
            }
        }
        if (split <= 0) break;
        out.push(rest.slice(0, split).slice(0, COLNO - 1));
        rest = rest.slice(split);
    }
    out.push(rest.slice(0, COLNO - 1));
    return out;
}

function normalizeTtyTextLines(lines) {
    const out = [];
    for (const line of lines)
        out.push(...wrapTtyTextLine(line));
    return out;
}

function renderHelpTextPage() {
    const page = game._help_text_page || 0;
    const pages = game._help_text_pages || [[]];
    const rows = Array.from({ length: C.TERMINAL_ROWS }, () => '');
    const pageLines = pages[Math.min(page, pages.length - 1)] || [];
    for (let i = 0; i < Math.min(pageLines.length, C.TERMINAL_ROWS - 1); i++)
        rows[i] = pageLines[i];
    rows[C.TERMINAL_ROWS - 1] = '--More--';
    const screen = rows.join('\n');
    game._help_text_screen = screen;
    showSerializedOverride(screen, [8, C.TERMINAL_ROWS - 1]);
    game._override_serialized_persistent = false;
}

function showHelpTextLines(lines) {
    // C ref: win/tty/wintty.c:process_text_window().  Full-screen text
    // windows show 23 data rows followed by the tty --More-- prompt.
    const normalized = normalizeTtyTextLines(lines);
    const pages = [];
    for (let i = 0; i < Math.max(1, normalized.length); i += C.TERMINAL_ROWS - 1)
        pages.push(normalized.slice(i, i + C.TERMINAL_ROWS - 1));
    if (!pages.length) pages.push([]);
    game._help_text_pages = pages;
    game._help_text_page = 0;
    renderHelpTextPage();
}

async function readUpstreamDataFile(name) {
    try {
        if (globalThis.process?.versions?.node) {
            const fs = await import('node:fs/promises');
            return await fs.readFile(`nethack-c/upstream/dat/${name}`, 'utf8');
        }
    } catch {
        return null;
    }
    return null;
}

async function showHelpDataFile(name) {
    // C ref: pager.c:dispfile_*() -> tty_display_file().
    const text = await readUpstreamDataFile(name);
    if (text == null) {
        await redrawAfterFullScreenMenuDismiss();
        await pline(`Cannot open "${name}".`);
        return;
    }
    showHelpTextLines(text.replace(/\r/g, '').split('\n'));
}

function showAboutNetHack() {
    // C refs: version.c:doextversion(), dat/nhlib.lua:shuffle().  Rendering
    // runtime Lua version info initializes nhlib once; its align table
    // shuffle consumes rn2(3), then rn2(2).
    if (!game._runtime_lua_info_initialized) {
        rn2(3);
        rn2(2);
        game._runtime_lua_info_initialized = true;
    }
    const pages = ABOUT_NETHACK_PAGES.map((page) => normalizeTtyTextLines(page));
    game._help_text_pages = pages;
    game._help_text_page = 0;
    renderHelpTextPage();
}

async function handleHelpMenuSelection(ch) {
    game._help_menu_screen = null;
    if (ch === '\x1b' || ch === ' ' || ch === '\r' || ch === '\n') {
        await redrawAfterFullScreenMenuDismiss();
        game.context.move = 0;
        return;
    }
    if (ch === 'a') {
        showAboutNetHack();
        game.context.move = 0;
        return;
    }
    if (ch === 'e') {
        await showLookAtMenu();
        game._awaiting_lookat_menu = true;
        game.context.move = 0;
        return;
    }
    if (ch === 'f') {
        await redrawAfterFullScreenMenuDismiss();
        if (!game._whatdoes_intro_seen) {
            game._whatdoes_intro_seen = true;
            await pline("Ask about '&' or '?' to get more info.");
            queue_more_prompt();
            game._help_what_command_after_more = true;
        } else {
            game._awaiting_help_what_command = true;
            await showPromptLine('What command?', { trailingInputSpace: true });
        }
        game.context.move = 0;
        return;
    }
    if (ch === 'g') {
        showHelpTextLines(OPTION_HELP_LINES);
        game.context.move = 0;
        return;
    }
    if (ch === 'j') {
        // C ref: cmd.c:dokeylist() via pager.c:dohelp().
        showHelpTextLines(KEY_BINDING_LINES);
        game.context.move = 0;
        return;
    }
    if (ch === 'l') {
        showHelpTextLines(MENU_CONTROL_LINES);
        game.context.move = 0;
        return;
    }
    if (ch === 'o') {
        showHelpTextLines(CONTACT_LINES);
        game.context.move = 0;
        return;
    }
    const file = HELP_FILE_BY_SELECTOR.get(ch);
    if (file) {
        await showHelpDataFile(file);
        game.context.move = 0;
        return;
    }
    await showHelpMenu();
    game.context.move = 0;
}

async function showGetposHelpScreen(kind = 'travel') {
    // C ref: getpos.c:getpos_help(). Tty menu overlays the current map from
    // column 10 onward and blocks on a More prompt before returning to getpos.
    await flush_screen(1);
    const display = game.nhDisplay;
    if (!display?.putstr) return;
    display.clearRow(0);
    for (let row = 1; row <= 16; row++) {
        for (let col = 9; col < COLNO; col++)
            display.setCell(col, row, ' ', NO_COLOR, 0);
    }
    for (let row = 0; row < GETPOS_HELP_LINES.length; row++)
        display.putstr(10, row, GETPOS_HELP_LINES[row], NO_COLOR, 0);
    display.putstr(10, 16, '--More--', NO_COLOR, 0);
    display.setCursor(18, 16);
    const screen = serialize_terminal_grid(display);
    game._getpos_help_screen = screen;
    game._getpos_help_after_more = kind;
    showSerializedOverride(screen, [18, 16]);
    queue_more_prompt();
}

async function showLookupDataOverlay(lines) {
    // C refs: pager.c:checkfile(), win/tty/wintty.c:tty_display_nhwindow().
    // Data lookups are NHW_MENU text windows; when the tty can fit them in a
    // corner, it overlays text on the current map and leaves rows underneath.
    await flush_screen(1);
    const display = game.nhDisplay;
    if (!display?.putstr) return;
    const maxLen = Math.max(0, ...lines.map((line) => line.length));
    const col = Math.max(11, COLNO - maxLen - 1);
    const clearCol = Math.max(0, col - 1);
    display.clearRow(0);
    for (let row = 0; row < lines.length; row++) {
        for (let c = clearCol; c < COLNO; c++) display.setCell(c, row, ' ', NO_COLOR, 0);
        display.putstr(col, row, lines[row], NO_COLOR, 0);
    }
    const moreRow = Math.min(lines.length, C.TERMINAL_ROWS - 1);
    for (let c = col; c < COLNO; c++) display.setCell(c, moreRow, ' ', NO_COLOR, 0);
    display.putstr(col, moreRow, '--More--', NO_COLOR, 0);
    const screen = serialize_terminal_grid(display);
    game._look_data_screen = screen;
    showSerializedOverride(screen, [Math.min(col + '--More--'.length, COLNO - 1), moreRow]);
}

function lookCoord(x, y) {
    return `<${x},${y}>`;
}

function lookListLine(x, y, glyph, text, leading = ' ') {
    return `${leading}${lookCoord(x, y).padEnd(9, ' ')}${glyph}  ${text}`;
}

function lookObjectName(obj) {
    return inventoryObjectName(obj, { observe: false });
}

function lookObjectGlyph(obj) {
    const glyph = object_glyph_for_menu(obj);
    return glyph?.ch || obj?.ch || '?';
}

function showLookListScreen(lines) {
    const rows = Array.from({ length: C.TERMINAL_ROWS }, () => '');
    for (let i = 0; i < Math.min(lines.length, C.TERMINAL_ROWS - 1); i++)
        rows[i] = lines[i];
    rows[C.TERMINAL_ROWS - 1] = '--More--';
    const screen = rows.join('\n');
    game._look_list_screen = screen;
    showSerializedOverride(screen, [8, C.TERMINAL_ROWS - 1]);
}

function visibleLookObjects() {
    return (game.level?.objects || [])
        .filter((obj) => obj?.otyp !== GOLD_PIECE && cansee(obj.ox, obj.oy))
        .sort((a, b) => (a.oy - b.oy) || (a.ox - b.ox));
}

function showLookMonsterList(all = false) {
    const ux = game.u?.ux ?? 0;
    const uy = game.u?.uy ?? 0;
    const lines = [
        all ? 'All monsters currently shown on the map:'
            : `Monsters currently shown near ${lookCoord(ux, uy)}:`,
        '',
        lookListLine(ux, uy, '@', heroGetposDescription()),
    ];
    const monsters = (game.level?.monsters || [])
        .filter((mon) => cansee(mon.mx, mon.my))
        .sort((a, b) => (a.my - b.my) || (a.mx - b.mx));
    for (const mon of monsters) {
        const prefix = mon.mtame ? 'tame ' : mon.mpeaceful ? 'peaceful ' : '';
        lines.push(lookListLine(mon.mx, mon.my, mon.ch || '?', `${prefix}${monsterName(mon)}`));
    }
    showLookListScreen(lines);
}

function showLookObjectList(all = false) {
    const ux = game.u?.ux ?? 0;
    const uy = game.u?.uy ?? 0;
    const lines = [
        all ? 'All objects currently shown on the map:'
            : `Objects currently shown near ${lookCoord(ux, uy)}:`,
        '',
    ];
    for (const obj of visibleLookObjects())
        lines.push(lookListLine(obj.ox, obj.oy, lookObjectGlyph(obj), lookObjectName(obj)));
    showLookListScreen(lines);
}

function showLookEngravingList(all = false) {
    const lines = [
        all ? 'Seen or remembered engravings on this level:'
            : 'Nearby seen or remembered engravings:',
        '',
    ];
    const engravings = (game.level?.engravings || [])
        .slice()
        .sort((a, b) => (a.y - b.y) || (a.x - b.x));
    for (const ep of engravings) {
        const obscured = game.u?.ux === ep.x && game.u?.uy === ep.y ? ', obscured by @' : '';
        const coord = lookCoord(ep.x, ep.y).padEnd(8, ' ');
        lines.push(`  ${coord}\`  remembered text: "${ep.text || ep.pristine || ''}"${obscured}`);
    }
    showLookListScreen(lines);
}

async function resumeGetposAfterHelp(kind) {
    game._getpos_help_screen = '';
    game._getpos_help_after_more = '';
    if (kind === 'travel') {
        const cursor = currentTravelCursor();
        await showPromptLine('Move cursor to the desired destination:');
        setTravelMapCursorAt(cursor.x, cursor.y);
    } else if (kind === 'teleport') {
        const cursor = currentTeleportCursor();
        await showPromptLine("Move cursor to the desired position:");
        setTravelMapCursorAt(cursor.x, cursor.y);
    } else if (kind === 'farlook') {
        const cursor = currentFarlookCursor();
        await showPromptLine('Pick a monster, object or location.');
        setTravelMapCursorAt(cursor.x, cursor.y);
    }
}

function setTravelMapCursor() {
    setTravelMapCursorAt(game.u?.ux ?? 1, game.u?.uy ?? 0);
}

function setTravelMapCursorAt(x, y) {
    const col = Math.max(0, x - 1);
    const row = Math.max(1, y + 1);
    game._prompt_cursor = [col, row];
    const display = game.nhDisplay;
    if (display) {
        display.cursorCol = col;
        display.cursorRow = row;
    }
}

function setTravelTipCursor() {
    game._prompt_cursor = [16, 8];
    const display = game.nhDisplay;
    if (display) {
        display.cursorCol = 16;
        display.cursorRow = 8;
    }
}

function getposKeyDisplay(ch) {
    if (!ch) return '';
    const code = ch.charCodeAt(0);
    if (code < 32) return `^${String.fromCharCode(code + 64)}`;
    return ch;
}

function truncateGetposCursorToMap(cursor, dx, dy) {
    // C ref: getpos.c:truncate_to_map().  Diagonal moves at the edge
    // shorten both axes together instead of clamping x and y separately.
    if (cursor.x + dx < 1) {
        dy -= Math.sign(dy) * (1 - (cursor.x + dx));
        dx = 1 - cursor.x;
    } else if (cursor.x + dx > COLNO - 1) {
        dy += Math.sign(dy) * ((COLNO - 1) - (cursor.x + dx));
        dx = (COLNO - 1) - cursor.x;
    }
    if (cursor.y + dy < 0) {
        dx -= Math.sign(dx) * (0 - (cursor.y + dy));
        dy = 0 - cursor.y;
    } else if (cursor.y + dy > ROWNO - 1) {
        dx += Math.sign(dx) * ((ROWNO - 1) - (cursor.y + dy));
        dy = (ROWNO - 1) - cursor.y;
    }
    cursor.x += dx;
    cursor.y += dy;
}

function moveGetposCursor(cursor, ch, multiplier = 1) {
    // C ref: getpos.c:getpos().  Uppercase movement commands are getpos
    // rush/run cursor moves, defaulting to eight map squares.
    const dir = RUN_KEY[ch] || ch;
    const scale = multiplier * (RUN_KEY[ch] ? 8 : 1);
    truncateGetposCursorToMap(
        cursor,
        (DIR_DX[dir] || 0) * scale,
        (DIR_DY[dir] || 0) * scale,
    );
}

function defaultTravelPromptTarget() {
    const u = game.u;
    if (!u) return null;
    return {
        // C ref: getpos.c:getpos().  A line-feed key at the travel getpos
        // prompt behaves as a rush south cursor move, clamped to the map.
        x: u.ux,
        y: Math.min(ROWNO - 1, u.uy + 8),
    };
}

function setTravelCachedTarget(target) {
    game._travel_cached_target = target;
    return target;
}

function currentTravelCursor() {
    if (!game._travel_cursor) {
        const cached = game._travel_cached_target;
        game._travel_cursor = cached
            ? { x: cached.x, y: cached.y }
            : { x: game.u?.ux ?? 1, y: game.u?.uy ?? 0 };
    }
    return game._travel_cursor;
}

function heroGetposDescription() {
    const race = String(game.urace?.adj || game.urace?.name || game._nhopts?.race || 'human').toLowerCase();
    const role = String(game.urole?.name?.m || game.u?.role || 'wizard').toLowerCase();
    const name = String(game.plname || game.u?.name || 'wizard').toLowerCase();
    return `${race} ${role} called ${name}`;
}

function travelLocationDescription(x, y) {
    // C refs: getpos.c:auto_describe(), pager.c:do_screen_description().
    // Describing the hero's own glyph reports the hero monster name rather
    // than the raw '@' map symbol.
    if (game.u?.ux === x && game.u?.uy === y) return heroGetposDescription();
    const loc = game.level?.at(x, y);
    if (!loc || !travelSeenOrKnown(x, y)) return 'unexplored area (no travel path)';
    const noTravelPath = !!(game.u && (game.u.ux !== x || game.u.uy !== y)
        && !findTravelStepToKnownTarget({ x, y }));
    let desc;
    if (loc.typ === C.CLOUD) desc = 'fog/vapor cloud';
    else if (IS_WALL(loc.typ)) desc = 'wall (no travel path)';
    else if (loc.typ === C.STAIRS) {
        const st = travelFeatureStairAt(x, y);
        const down = !st?.up;
        const blocked = noTravelPath;
        desc = `${blocked ? 'blocked ' : ''}staircase ${down ? 'down' : 'up'}${blocked ? ' (no travel path)' : ''}`;
    }
    else if (loc.typ === C.ROOM && !couldsee(x, y)) desc = `dark part of a room${noTravelPath ? ' (no travel path)' : ''}`;
    else if (loc.typ === STONE || loc.typ === SCORR) desc = 'stone (no travel path)';
    else if (loc.typ === CORR) desc = 'corridor';
    else if (loc.typ === DOOR) {
        const closed = !!(loc.doormask & (D_CLOSED | D_LOCKED));
        desc = `${closed ? 'closed door' : 'doorway'}${noTravelPath ? ' (no travel path)' : ''}`;
    } else if (loc.typ === SDOOR) desc = `doorway${noTravelPath ? ' (no travel path)' : ''}`;
    else desc = loc.disp_ch && loc.disp_ch !== ' ' ? String(loc.disp_ch) : 'unexplored area';
    return desc;
}

function teleportLocationDescription(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return 'stone';
    if (loc.typ === C.CLOUD) return 'fog/vapor cloud';
    if (loc.typ === STONE || loc.typ === SCORR) return 'stone';
    if (IS_WALL(loc.typ)) return 'wall';
    if (loc.typ === CORR) return 'corridor';
    if (loc.typ === DOOR || loc.typ === SDOOR) return 'doorway';
    if (loc.typ === C.ROOM) return 'floor of a room';
    return loc.disp_ch && loc.disp_ch !== ' ' ? String(loc.disp_ch) : 'floor of a room';
}

function farlookLocationDescription(x, y) {
    if (game.u?.ux === x && game.u?.uy === y) return heroGetposDescription();
    const loc = game.level?.at(x, y);
    if (!loc) return 'stone';
    if (loc.typ === C.STAIRS) {
        const st = travelFeatureStairAt(x, y);
        if (st?.isbranch) return `branch staircase ${st.up ? 'up' : 'down'}`;
        return `staircase ${st?.up ? 'up' : 'down'}`;
    }
    if (loc.typ === C.ROOM) return 'floor of a room';
    if (loc.typ === C.CLOUD) return 'fog/vapor cloud';
    if (loc.typ === STONE || loc.typ === SCORR) return 'stone';
    if (IS_WALL(loc.typ)) return 'wall';
    if (loc.typ === CORR) return 'corridor';
    if (loc.typ === DOOR || loc.typ === SDOOR) return 'doorway';
    return loc.disp_ch && loc.disp_ch !== ' ' ? String(loc.disp_ch) : 'floor of a room';
}

function farlookFullDescription(x, y) {
    if (game.u?.ux === x && game.u?.uy === y)
        return `@\x1b[8Ca human or elf (${heroGetposDescription()})`;
    const stair = travelFeatureStairAt(x, y);
    if (stair?.isbranch) {
        const dir = stair.up ? 'up' : 'down';
        return `${stair.up ? '<' : '>'}\x1b[8Ca staircase ${dir} or a branch staircase ${dir} (branch staircase ${dir})`;
    }
    const loc = game.level?.at(x, y);
    if (!loc || loc.typ === STONE || loc.typ === SCORR || IS_WALL(loc.typ))
        return '\x0ex\x0f\x1b[8Cthe interior of a monster or a wall (wall)';
    if (loc.typ === CORR)
        return '#\x1b[8Ccan be many things (corridor)';
    return '\x0e~\x0f\x1b[8Ca doorway or the floor of a room or the dark part of a room or ice';
}

function farlookMoreInfoTopic(x, y) {
    if (game.u?.ux === x && game.u?.uy === y) return 'human wizard';
    const stair = travelFeatureStairAt(x, y);
    if (stair?.isbranch) return `branch staircase ${stair.up ? 'up' : 'down'}`;
    return '';
}

function farlookContinuation(x, y) {
    if (game.u?.ux === x && game.u?.uy === y) return '';
    const loc = game.level?.at(x, y);
    if (!loc || loc.typ === STONE || loc.typ === SCORR || IS_WALL(loc.typ)) return '';
    if (loc.typ === CORR) return '';
    return '(floor of a room)';
}

function farlookNeedsPromptAfterFullDescription(x, y) {
    const loc = game.level?.at(x, y);
    return loc?.typ === CORR;
}

function engravingAt(x, y) {
    return (game.level?.engravings || []).find((ep) => ep.x === x && ep.y === y) || null;
}

function engravingVisibleText(ep) {
    return ep?.text || ep?.pristine || '';
}

async function describeTravelCursor() {
    const cursor = currentTravelCursor();
    await pline(travelLocationDescription(cursor.x, cursor.y));
    setTravelMapCursorAt(cursor.x, cursor.y);
}

function currentFarlookCursor() {
    if (!game._farlook_cursor)
        game._farlook_cursor = { x: game.u?.ux ?? 1, y: game.u?.uy ?? 0 };
    return game._farlook_cursor;
}

async function describeFarlookCursor() {
    const cursor = currentFarlookCursor();
    await pline(farlookLocationDescription(cursor.x, cursor.y));
    setTravelMapCursorAt(cursor.x, cursor.y);
}

function currentTeleportCursor() {
    if (!game._teleport_cursor)
        game._teleport_cursor = { x: game.u?.ux ?? 1, y: game.u?.uy ?? 0 };
    return game._teleport_cursor;
}

async function describeTeleportCursor() {
    const cursor = currentTeleportCursor();
    await pline(teleportLocationDescription(cursor.x, cursor.y));
    setTravelMapCursorAt(cursor.x, cursor.y);
}

function teleokBasic(x, y, allowTrap = false) {
    if (x < 1 || x >= COLNO || y < 0 || y >= ROWNO) return false;
    if (mon_at(x, y)) return false;
    if (!allowTrap && (game.level?.traps || []).some(t => t.tx === x && t.ty === y)) return false;
    if (sobj_at_basic(BOULDER, x, y)) return false;
    const loc = game.level?.at(x, y);
    if (!loc || blocksMove(x, y) || IS_POOL(loc.typ) || C.IS_LAVA(loc.typ)) return false;
    return C.SPACE_POS(loc.typ);
}

async function teledsBasic(x, y) {
    const u = game.u;
    if (!u) return;
    const oldx = u.ux;
    const oldy = u.uy;
    u.ux0 = oldx;
    u.uy0 = oldy;
    u.ux = x;
    u.uy = y;
    newsym(oldx, oldy);
    see_monsters();
    game.vision_full_recalc = 1;
    vision_recalc(0);
    refreshWarningAfterHeroMove();
    newsym(x, y);
    game._prompt_cursor = null;
    await append_pline(`You materialize in ${x === oldx && y === oldy ? 'the same' : 'a different'} location!`);
}

async function safeTeledsBasic() {
    for (let tcnt = 0; tcnt < 40; tcnt++) {
        const x = rnd(COLNO - 1);
        const y = rn2(ROWNO);
        if (teleokBasic(x, y, false)) {
            await teledsBasic(x, y);
            return true;
        }
    }
    for (let y = 0; y < ROWNO; y++) {
        for (let x = 1; x < COLNO; x++) {
            if (teleokBasic(x, y, false)) {
                await teledsBasic(x, y);
                return true;
            }
        }
    }
    return false;
}

const TRAVEL_DIRS_ORD = [
    [-1, 0], [0, -1], [1, 0], [0, 1],
    [-1, -1], [1, -1], [1, 1], [-1, 1],
];

function travelSeenOrKnown(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    return !!(loc.seenv || loc.remembered_glyph || (loc.disp_ch && loc.disp_ch !== ' ') || couldsee(x, y));
}

function travelFeatureStairAt(x, y) {
    for (let st = game.stairs; st; st = st.next)
        if (st.sx === x && st.sy === y) return st;
    return null;
}

function travelFeatureStair(up) {
    for (let st = game.stairs; st; st = st.next)
        if (!!st.up === !!up && travelSeenOrKnown(st.sx, st.sy)) return st;
    return null;
}

const GETPOS_FEATURE_TYPES = new Map([
    ['_', [C.ALTAR]],
    ['{', [C.FOUNTAIN]],
    ['#', [C.SINK]],
    ['\\', [C.THRONE]],
    ['|', [C.GRAVE]],
    ['}', [C.POOL, C.MOAT, C.WATER]],
    ['~', [C.LAVAPOOL, C.LAVAWALL, C.ICE]],
]);

function isGetposFeatureSearchKey(ch) {
    return ch === '^' || GETPOS_FEATURE_TYPES.has(ch);
}

function getposFeatureAt(ch, x, y) {
    if (ch === '^') return (game.level?.traps || []).some(t => t.tx === x && t.ty === y);
    const types = GETPOS_FEATURE_TYPES.get(ch);
    if (!types) return false;
    const loc = game.level?.at(x, y);
    return !!loc && types.includes(loc.typ);
}

function findGetposFeature(ch, cursor) {
    for (let pass = 0; pass <= 1; pass++) {
        const loY = pass === 0 ? cursor.y : 0;
        const hiY = pass === 0 ? ROWNO - 1 : cursor.y;
        for (let y = loY; y <= hiY; y++) {
            const loX = pass === 0 && y === loY ? cursor.x + 1 : 1;
            const hiX = pass === 1 && y === hiY ? cursor.x : COLNO - 1;
            for (let x = loX; x <= hiX; x++) {
                if (travelSeenOrKnown(x, y) && getposFeatureAt(ch, x, y)) return { x, y };
            }
        }
    }
    return null;
}

async function handleGetposFeatureSearch(ch, cursor, describeCursor) {
    if (!isGetposFeatureSearchKey(ch)) return false;
    const found = findGetposFeature(ch, cursor);
    if (found) {
        cursor.x = found.x;
        cursor.y = found.y;
        await describeCursor();
    } else {
        await pline(`Can't find dungeon feature '${ch}'.`);
        setTravelMapCursorAt(cursor.x, cursor.y);
    }
    return true;
}

function travelMoveAllowed(x, y, dx, dy) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 1 || nx >= COLNO || ny < 0 || ny >= ROWNO) return false;
    if (blocksMove(nx, ny)) return false;
    if (sobj_at_basic(BOULDER, nx, ny)) return false;
    if (dx && dy) {
        const source = game.level?.at(x, y);
        const target = game.level?.at(nx, ny);
        if (doorwayBlocksDiagonalForHero(source) || doorwayBlocksDiagonalForHero(target)) return false;
    }
    return true;
}

function findTravelStepToKnownTarget(target) {
    const u = game.u;
    if (!u || !target) return false;
    if (u.ux === target.x && u.uy === target.y) return null;

    const seen = new Set([`${target.x},${target.y}`]);
    const queue = [{ x: target.x, y: target.y }];
    for (let qi = 0; qi < queue.length && qi < COLNO * ROWNO; qi++) {
        const here = queue[qi];
        for (const [dx, dy] of TRAVEL_DIRS_ORD) {
            const nx = here.x + dx;
            const ny = here.y + dy;
            if (!travelMoveAllowed(here.x, here.y, dx, dy)) continue;
            if (nx === u.ux && ny === u.uy) {
                return { dx: here.x - u.ux, dy: here.y - u.uy };
            }
            const key = `${nx},${ny}`;
            if (seen.has(key) || !travelSeenOrKnown(nx, ny)) continue;
            seen.add(key);
            queue.push({ x: nx, y: ny });
        }
    }
    return null;
}

function distminCoords(ax, ay, bx, by) {
    return Math.max(Math.abs(ax - bx), Math.abs(ay - by));
}

function guessTravelGoal(target) {
    const u = game.u;
    if (!u || !target) return null;
    const startKey = `${u.ux},${u.uy}`;
    const seen = new Set([startKey]);
    const travel = new Map();
    const queue = [{ x: u.ux, y: u.uy, radius: 0 }];
    for (let qi = 0; qi < queue.length && qi < COLNO * ROWNO; qi++) {
        const here = queue[qi];
        for (const [dx, dy] of TRAVEL_DIRS_ORD) {
            const nx = here.x + dx;
            const ny = here.y + dy;
            const key = `${nx},${ny}`;
            if (seen.has(key) || !travelMoveAllowed(here.x, here.y, dx, dy) || !travelSeenOrKnown(nx, ny)) continue;
            seen.add(key);
            travel.set(key, here.radius + 1);
            queue.push({ x: nx, y: ny, radius: here.radius + 1 });
        }
    }

    let px = u.ux;
    let py = u.uy;
    let bestDist = distminCoords(target.x, target.y, u.ux, u.uy);
    let bestD2 = dist2(target.x, target.y, u.ux, u.uy);
    let bestTravel = COLNO * ROWNO;
    for (let x = 1; x < COLNO; x++) {
        for (let y = 0; y < ROWNO; y++) {
            const ctrav = travel.get(`${x},${y}`) || 0;
            if (!ctrav || !couldsee(x, y)) continue;
            const nextDist = distminCoords(target.x, target.y, x, y);
            if (nextDist === bestDist && ctrav < bestTravel) {
                const nd2 = dist2(target.x, target.y, x, y);
                if (nd2 < bestD2) {
                    px = x;
                    py = y;
                    bestD2 = nd2;
                    bestTravel = ctrav;
                }
            } else if (nextDist < bestDist) {
                px = x;
                py = y;
                bestDist = nextDist;
                bestD2 = dist2(target.x, target.y, x, y);
                bestTravel = ctrav;
            }
        }
    }
    return { x: px, y: py };
}

function findTravelStep(target) {
    const direct = findTravelStepToKnownTarget(target);
    if (direct) return direct;
    const guess = guessTravelGoal(target);
    if (!guess) return direct;
    if (game.u?.ux === guess.x && game.u?.uy === guess.y) {
        const dx = Math.sign((target?.x ?? game.u.ux) - game.u.ux);
        const dy = Math.sign((target?.y ?? game.u.uy) - game.u.uy);
        return travelMoveAllowed(game.u.ux, game.u.uy, dx, dy) ? { dx, dy } : direct;
    }
    return findTravelStepToKnownTarget(guess) || direct;
}

async function beginTravelRunToCachedTarget() {
    const target = game._travel_cached_target;
    if (!target) return false;
    game._run_stop_after_move = false;
    game.context.run = { travel: true, target: { x: target.x, y: target.y }, steps: 0 };
    return continueRunStep();
}

const DEFAULT_TIMEOUT_INCR = 30;
const MENU_ROWS_PER_PAGE = C.TERMINAL_ROWS - 1;
const MENU_SELECTOR_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

const WIZ_INTRINSIC_PROPERTIES = [
    { prop: C.INVULNERABLE, stateKey: 'invulnerable', label: 'invulnerable' },
    { prop: C.STONED, stateKey: 'stoned', label: 'petrifying' },
    { prop: C.SLIMED, stateKey: 'slimed', label: 'becoming slime' },
    { prop: C.STRANGLED, stateKey: 'strangled', label: 'strangling' },
    { prop: C.SICK, stateKey: 'sick', label: 'fatally sick' },
    { prop: C.STUNNED, stateKey: 'stunned', label: 'stunned' },
    { prop: C.CONFUSION, stateKey: 'confusion', label: 'confused' },
    { prop: C.HALLUC, stateKey: 'hallucination', label: 'hallucinating' },
    { prop: C.BLINDED, stateKey: 'blinded', label: 'blinded' },
    { prop: C.DEAF, stateKey: 'deaf', label: 'deafness' },
    { prop: C.VOMITING, stateKey: 'vomiting', label: 'vomiting' },
    { prop: C.GLIB, stateKey: 'glib', label: 'slippery fingers' },
    { prop: C.WOUNDED_LEGS, stateKey: 'wounded_legs', label: 'wounded legs' },
    { prop: C.SLEEPY, stateKey: 'sleepy', label: 'sleepy' },
    { prop: C.TELEPORT, stateKey: 'teleporting', label: 'teleporting' },
    { prop: C.POLYMORPH, stateKey: 'polymorphing', label: 'polymorphing' },
    { prop: C.LEVITATION, stateKey: 'levitation', label: 'levitating' },
    { prop: C.FAST, stateKey: 'fast', label: 'very fast' },
    { prop: C.CLAIRVOYANT, stateKey: 'clairvoyant', label: 'clairvoyant' },
    { prop: C.DETECT_MONSTERS, stateKey: 'monster_detection', label: 'monster detection' },
    { prop: C.SEE_INVIS, stateKey: 'see_invisible', label: 'see invisible' },
    { prop: C.INVIS, stateKey: 'invisible', label: 'invisible' },
    { prop: C.ACID_RES, stateKey: 'acid_resistance', label: 'acid resistance' },
    { prop: C.STONE_RES, stateKey: 'stoning_resistance', label: 'stoning resistance' },
    { prop: C.DISPLACED, stateKey: 'displaced', label: 'displaced' },
    { prop: C.PASSES_WALLS, stateKey: 'pass_thru_walls', label: 'pass thru walls' },
    { prop: C.MAGICAL_BREATHING, stateKey: 'magical_breathing', label: 'magical breathing' },
    { prop: C.WWALKING, stateKey: 'water_walking', label: 'water walking' },
    { prop: C.FIRE_RES, stateKey: 'fire_resistance', label: 'fire resistance' },
    { prop: C.COLD_RES, stateKey: 'cold_resistance', label: 'cold resistance' },
    { prop: C.SLEEP_RES, stateKey: 'sleep_resistance', label: 'sleep resistance' },
    { prop: C.DISINT_RES, stateKey: 'disintegration_resistance', label: 'disintegration resistance' },
    { prop: C.SHOCK_RES, stateKey: 'shock_resistance', label: 'shock resistance' },
    { prop: C.POISON_RES, stateKey: 'poison_resistance', label: 'poison resistance' },
    { prop: C.DRAIN_RES, stateKey: 'drain_resistance', label: 'drain resistance' },
    { prop: C.SICK_RES, stateKey: 'sickness_resistance', label: 'sickness resistance' },
    { prop: C.ANTIMAGIC, stateKey: 'magic_resistance', label: 'magic resistance' },
    { prop: C.HALLUC_RES, stateKey: 'hallucination_resistance', label: 'hallucination resistance' },
    { prop: C.BLND_RES, stateKey: 'light_induced_blindness_resistance', label: 'light-induced blindness resistance' },
    { prop: C.FUMBLING, stateKey: 'fumbling', label: 'fumbling' },
    { prop: C.HUNGER, stateKey: 'voracious_hunger', label: 'voracious hunger' },
    { prop: C.TELEPAT, stateKey: 'telepathic', label: 'telepathic' },
    { prop: C.WARNING, stateKey: 'warning', label: 'warning' },
    { prop: C.WARN_OF_MON, stateKey: 'warn_monster_type_or_class', label: 'warn: monster type or class' },
    { prop: C.WARN_UNDEAD, stateKey: 'warn_undead', label: 'warn: undead' },
    { prop: C.SEARCHING, stateKey: 'searching', label: 'searching' },
    { prop: C.INFRAVISION, stateKey: 'infravision', label: 'infravision' },
    { prop: C.ADORNED, stateKey: 'adorned', label: 'adorned (+/- Cha)' },
    { prop: C.STEALTH, stateKey: 'stealth', label: 'stealthy' },
    { prop: C.AGGRAVATE_MONSTER, stateKey: 'monster_aggravation', label: 'monster aggravation' },
    { prop: C.CONFLICT, stateKey: 'conflict', label: 'conflict' },
    { prop: C.JUMPING, stateKey: 'jumping', label: 'jumping' },
    { prop: C.TELEPORT_CONTROL, stateKey: 'teleport_control', label: 'teleport control' },
    { prop: C.FLYING, stateKey: 'flying', label: 'flying' },
    { prop: C.SWIMMING, stateKey: 'swimming', label: 'swimming' },
    { prop: C.SLOW_DIGESTION, stateKey: 'slow_digestion', label: 'slow digestion' },
    { prop: C.HALF_SPDAM, stateKey: 'half_spell_damage', label: 'half spell damage' },
    { prop: C.HALF_PHDAM, stateKey: 'half_physical_damage', label: 'half physical damage' },
    { prop: C.REGENERATION, stateKey: 'hp_regeneration', label: 'HP regeneration' },
    { prop: C.ENERGY_REGENERATION, stateKey: 'energy_regeneration', label: 'energy regeneration' },
    { prop: C.PROTECTION, stateKey: 'extra_protection', label: 'extra protection' },
    { prop: C.PROT_FROM_SHAPE_CHANGERS, stateKey: 'protection_from_shape_changers', label: 'protection from shape changers' },
    { prop: C.POLYMORPH_CONTROL, stateKey: 'polymorph_control', label: 'polymorph control' },
    { prop: C.UNCHANGING, stateKey: 'unchanging', label: 'unchanging' },
    { prop: C.REFLECTING, stateKey: 'reflecting', label: 'reflecting' },
    { prop: C.FREE_ACTION, stateKey: 'free_action', label: 'free action' },
    { prop: C.FIXED_ABIL, stateKey: 'fixed_abilities', label: 'fixed abilities' },
    { prop: C.LIFESAVED, stateKey: 'life_will_be_saved', label: 'life will be saved' },
];

function intrinsicTimeoutValue(row) {
    const value = game.u?.uprops?.[row.stateKey];
    return typeof value === 'number' && value > 0 ? value : 0;
}

function intrinsicMenuRows() {
    const rows = [
        { kind: 'text', text: ' \x1b[7mWhich intrinsics?\x1b[0m' },
        { kind: 'blank' },
    ];
    if (game.iflags?.cmdassist !== false) {
        rows.push({
            kind: 'text',
            text: ` [Precede any selection with a count to increment by other than ${DEFAULT_TIMEOUT_INCR}.]`,
        });
    }
    for (const row of WIZ_INTRINSIC_PROPERTIES) {
        if (row.prop === C.HALLUC_RES) continue;
        if (row.prop === C.FIRE_RES) {
            rows.push({ kind: 'text', text: ' --' });
        }
        rows.push({ kind: 'selectable', ...row });
    }
    return rows;
}

function renderIntrinsicMenu(menu) {
    const rows = menu.rows;
    const start = menu.page * MENU_ROWS_PER_PAGE;
    const pageRows = rows.slice(start, start + MENU_ROWS_PER_PAGE);
    const lines = [];
    let selectorIndex = 0;
    for (const row of pageRows) {
        if (row.kind === 'selectable') {
            const selector = MENU_SELECTOR_CHARS[selectorIndex++] || '?';
            row.selector = selector;
            const indicator = row.count > 0 ? '#' : (row.selected ? '+' : '-');
            const timeout = intrinsicTimeoutValue(row);
            const tail = timeout ? ` [${timeout}]` : '';
            lines.push(` ${selector} ${indicator} ${row.label}${tail}`);
        } else {
            lines.push(row.text || '');
        }
    }
    const footer = menu.pages.length > 1
        ? ` (${menu.page + 1} of ${menu.pages.length})`
        : ' (end)';
    lines.push(footer);
    const screen = lines.join('\n');
    showSerializedOverride(screen, [footer.length, lines.length - 1]);
}

function beginIntrinsicMenu() {
    game._intrinsic_menu = {
        kind: 'wizintrinsic',
        rows: intrinsicMenuRows(),
        page: 0,
        pages: [],
        count: '',
    };
    game._intrinsic_menu.pages = [];
    for (let i = 0; i < game._intrinsic_menu.rows.length; i += MENU_ROWS_PER_PAGE) {
        game._intrinsic_menu.pages.push(game._intrinsic_menu.rows.slice(i, i + MENU_ROWS_PER_PAGE));
    }
    renderIntrinsicMenu(game._intrinsic_menu);
}

function intrinsicRowForSelector(menu, ch) {
    const start = menu.page * MENU_ROWS_PER_PAGE;
    let selectorIndex = 0;
    for (const row of menu.rows.slice(start, start + MENU_ROWS_PER_PAGE)) {
        if (row.kind !== 'selectable') continue;
        const selector = MENU_SELECTOR_CHARS[selectorIndex++] || '?';
        if (selector === ch) return row;
    }
    return null;
}

function updateIntrinsicMenuSelection(menu, row, count) {
    if (!row) return;
    const togglingOff = row.selected && !count;
    if (togglingOff) {
        row.selected = false;
        row.count = -1;
    } else {
        row.selected = true;
        row.count = count > 0 ? count : -1;
    }
}

function refreshSwallowedHallucinationAfterMore() {
    if (!(game.u?.uhallucination || game.u?.uprops?.hallucination)) return;
    if (game.u?.uswallow && game.u?.ustuck && game._swallowed_map_active)
        refresh_swallowed_overlay();
    else {
        see_monsters();
        see_objects();
        see_traps();
    }
}

async function showNextStartupPreambleMessage() {
    if (!Array.isArray(game._startup_preamble_messages)
        || game._startup_preamble_messages.length === 0) return false;
    const msg = game._startup_preamble_messages.shift();
    await pline(msg);
    // C ref: allmain.c:moveloop_preamble().  Date messages are normal
    // topl plines queued behind the startup welcome pager.
    game._more_next_message_row = false;
    if (game._startup_preamble_messages.length > 0) queue_more_prompt();
    else game._more = false;
    game.context.move = 0;
    return true;
}

function isStartupWelcomeMessage(msg) {
    return typeof msg === 'string'
        && (msg.includes('welcome to NetHack') || msg.includes('welcome back to NetHack'));
}

async function handleQueuedMore(ch) {
    if (!game._more || (game._more_dismissals_remaining || 0) <= 0) return false;
    let resumeMonsterBehindNewMore = false;
    const moreDismissKey = !!game._monster_more_accepts_any_key
        || ch === ' ' || ch === '\r' || ch === '\n' || ch === '\x1b';
    const pausedMonsterTurn = !!game._monster_turn_paused_for_more;
    const swallowedDamageResume = pausedMonsterTurn && !!game._swallowed_damage_more_waiting;
    const preTurnResume = pausedMonsterTurn && !!game._pre_turn_more_waiting;
    const monsterAttackResume = pausedMonsterTurn && !!game._monster_attack_more_waiting;
    const pausedFloorListTurn = !!game._resume_floor_list_turn;
    const pausedRunTail = !!game._run_paused_for_more;
    const preserveMonsterMoreBase = pausedMonsterTurn
        && game._preserve_more_base_for_next_monster_message
        && game._latched_more_screen;
    if (!moreDismissKey) {
        if (game._direction_help_screen) {
            showSerializedOverride(game._direction_help_screen, [8, 23]);
            game._override_prev = null;
        }
        if (game._getpos_help_screen) {
            showSerializedOverride(game._getpos_help_screen, [18, 16]);
            game._override_prev = null;
        }
        game.context.move = 0;
        return true;
    }

    game._more_dismissals_remaining--;
    game._monster_more_accepts_any_key = false;
    if (preserveMonsterMoreBase) {
        game._monster_more_base_screen = preserveMonsterMoreBase;
        game._monster_more_base_deferred = (game._deferred_warning_redraws || []).slice();
        game._monster_more_restore_message = game._pending_message || '';
    }
    game._preserve_more_base_for_next_monster_message = false;
    game._latched_more_screen = null;
    game._latched_more_cursor = null;
    game._latched_more_keep_until_dismiss = false;
    if (game._fire_wand_side_effect_pending) {
        game._more_dismissals_remaining = 0;
        await showFireWandSideEffects();
    } else if (game._fire_wand_invisibility_pending) {
        game._more_dismissals_remaining = 0;
        await showFireWandInvisibilityEffect();
    } else if (game._fire_wand_oil_pending) {
        game._more_dismissals_remaining = 0;
        await showFireWandOilEffect();
    } else if (game._fire_wand_death_pending) {
        game._more_dismissals_remaining = 0;
        await showFireWandDeathMessage();
    } else if (game._sleep_wand_reflect_pending) {
        game._more_dismissals_remaining = 0;
        await showSleepRayReflectBounceAfterMore();
    } else if (game._sleep_wand_second_reflect_pending) {
        game._more_dismissals_remaining = 0;
        game._more = false;
        await finishSleepRaySecondReflectAfterMore();
        game.context.move = 1;
        return true;
    } else if (game._sleep_wand_sleep_pending) {
        game._more_dismissals_remaining = 0;
        game._more = false;
        finishSleepRaySleepAfterMore();
        game.context.move = 1;
        return true;
    } else if (game._monster_death_pending) {
        game._more_dismissals_remaining = 0;
        game._monster_death_pending = false;
        game._death_prompt_pending = true;
        await pline('You die...');
        queue_more_prompt();
    } else if (game._death_prompt_pending) {
        await showDeathPrompt();
    } else if (game._more_dismissals_remaining <= 0) {
        if (await showNextStartupPreambleMessage()) return true;
        if (game._post_arrival_pager_active) {
            game._post_arrival_pager_active = false;
            clearOverrideScreen();
            const tempMessage = game._post_arrival_temp_message;
            game._post_arrival_temp_message = null;
            clear_pending_message();
            if (tempMessage?.line) await showTemperatureChangeMessage(tempMessage);
            game.context.move = 0;
            return true;
        }
        if (game._deferred_run_floor_look) {
            const deferred = game._deferred_run_floor_look;
            game._deferred_run_floor_look = null;
            game._run_sound_more_defer_floor_look = false;
            game._run_sound_more_screen = null;
            game._run_sound_more_cursor = null;
            game._run_paused_for_more = false;
            game._resume_run_after_more = false;
            game._run_paused_before_encumbered_check = false;
            if (game.context) game.context.run = null;
            if (game.u?.uencumber) game._extra_encumbered_turn_pending = true;
            clear_pending_message();
            await pline(deferred.line);
            if (deferred.overflow) queue_more_prompt();
            game.context.move = 0;
            return true;
        }
        game._run_sound_more_defer_floor_look = false;
        game._run_sound_more_screen = null;
        game._run_sound_more_cursor = null;
        if (game._post_arrival_pager_screen) {
            const screen = game._post_arrival_pager_screen;
            const cursor = game._post_arrival_pager_cursor || [8, C.TERMINAL_ROWS - 1];
            game._post_arrival_pager_screen = null;
            game._post_arrival_pager_cursor = null;
            game._post_arrival_pager_active = true;
            clear_pending_message();
            showSerializedOverride(screen, cursor);
            queue_more_prompt();
            game.context.move = 0;
            return true;
        }
        if (game._cookie_message_queue?.length) {
            const next = game._cookie_message_queue.shift();
            await pline(next.text);
            game._more_next_message_row = false;
            if (next.more) queue_more_prompt();
            else game._more = false;
            game.context.move = next.move ? 1 : 0;
            return true;
        }
        if (game._more_message_queue?.length) {
            const next = game._more_message_queue.shift();
            await pline(next.text);
            game._more_next_message_row = false;
            if (next.more) queue_more_prompt();
            else game._more = false;
            game.context.move = next.move ? 1 : 0;
            return true;
        }
        clear_pending_message();
        if (game._finish_pickup_turn_after_more) {
            game._finish_pickup_turn_after_more = false;
            game.context.move = 1;
            return true;
        }
        if (game._finish_drum_turn_after_more) {
            game._finish_drum_turn_after_more = false;
            if (game._drum_deaf_duration) {
                game.u = game.u || {};
                game.u.uprops = game.u.uprops || {};
                game.u.uprops.deaf = (game.u.uprops.deaf || 0) + game._drum_deaf_duration;
                game._drum_deaf_duration = 0;
            }
            const msg = game._drum_after_more_message || '';
            game._drum_after_more_message = '';
            if (msg) await pline(msg);
            game.context.move = 1;
            return true;
        }
        if (game._pending_shop_pickup) {
            const obj = game._pending_shop_pickup;
            game._pending_shop_pickup = null;
            await finishShopQuotedPickup(obj);
            return true;
        }
        await finishPendingStairArrivalRedraw();
        if (game._restore_message_after_more) {
            const msg = game._restore_message_after_more;
            game._restore_message_after_more = '';
            await pline(msg);
        }
        game._hallucination_warning_rng_active = false;
        if (game._arrival_floor_look_after_more) {
            game._arrival_floor_look_after_more = false;
            await lookHereAfterMove();
            game.context.move = 0;
            return true;
        }
        if (game._direction_help_screen) {
            game._direction_help_screen = '';
            game._override_prev = null;
        }
        if (game._direction_help_after_more_message) {
            const msg = game._direction_help_after_more_message;
            game._direction_help_after_more_message = '';
            await pline(msg);
            game.context.move = 0;
            return true;
        }
        if (game._getpos_help_after_more) {
            const kind = game._getpos_help_after_more;
            await resumeGetposAfterHelp(kind);
            game.context.move = 0;
            return true;
        }
        if (game._help_what_command_after_more) {
            game._help_what_command_after_more = false;
            game._awaiting_help_what_command = true;
            await showPromptLine('What command?', { trailingInputSpace: true });
            game.context.move = 0;
            return true;
        }
        if (game._farlook_prompt_after_instruction_more) {
            game._farlook_prompt_after_instruction_more = false;
            game._awaiting_farlook_prompt = true;
            game._farlook_cursor = { x: game.u?.ux ?? 1, y: game.u?.uy ?? 0 };
            await showPromptLine('Move cursor to a monster, object or location:');
            setTravelMapCursorAt(game._farlook_cursor.x, game._farlook_cursor.y);
            game.context.move = 0;
            return true;
        }
        if (game._farlook_more_info_after_more) {
            const state = game._farlook_more_info_after_more;
            game._farlook_more_info_after_more = null;
            await showPromptLine(`More info about "${state.topic}"? [yn] (n)`, { trailingInputSpace: true });
            game._awaiting_farlook_more_info = state;
            game.context.move = 0;
            return true;
        }
        if (game._farlook_resume_after_more) {
            const state = game._farlook_resume_after_more;
            game._farlook_resume_after_more = null;
            if (ch === '\x1b') {
                game._awaiting_farlook_prompt = false;
                game._farlook_cursor = null;
                setTravelMapCursorAt(game.u?.ux ?? state.x, game.u?.uy ?? state.y);
                game.context.move = 0;
                return true;
            }
            game._awaiting_farlook_prompt = true;
            game._farlook_cursor = { x: state.x, y: state.y };
            await pline('Pick a monster, object or location.');
            setTravelMapCursorAt(state.x, state.y);
            game.context.move = 0;
            return true;
        }
        if (game._farlook_intro_after_more) {
            game._farlook_intro_after_more = false;
            clear_pending_message();
            if (!game._farlook_tip_seen) {
                game._farlook_tip_seen = true;
                game._travel_tip_active = 'farlook';
                await showTravelTipScreen();
            } else {
                game._awaiting_farlook_prompt = true;
                game._farlook_cursor = { x: game.u?.ux ?? 1, y: game.u?.uy ?? 0 };
                await showPromptLine("(For instructions type a '?')");
                setTravelMapCursorAt(game._farlook_cursor.x, game._farlook_cursor.y);
            }
            game.context.move = 0;
            return true;
        }
        if (game._travel_tip_pending) {
            game._travel_tip_pending = false;
            game._travel_tip_active = true;
            game._travel_tip_seen = true;
            clear_pending_message();
            await showTravelTipScreen();
            game.context.move = 0;
            return true;
        }
        if (game._resume_write_prompt_after_more) {
            game._resume_write_prompt_after_more = false;
            await showPromptLine('What do you want to write on? [*] ');
            game.context.move = 0;
            return true;
        }
        if (game._resume_read_prompt_after_more) {
            game._resume_read_prompt_after_more = false;
            await showPromptLine(`What do you want to read? [${readLetters()} or ?*] `);
            game.context.move = 0;
            return true;
        }
        if (game._resume_engrave_prompt_after_more) {
            game._resume_engrave_prompt_after_more = false;
            game._awaiting_engrave_item = true;
            await showPromptLine(`What do you want to write with? [- ${writeWithLetters()} or ?*] `);
            game.context.move = 0;
            return true;
        }
        if (game._resume_engrave_text_after_more) {
            game._resume_engrave_text_after_more = false;
            game._awaiting_engrave_text = { text: '' };
            await showPromptLine('What do you want to write in the dust here?', { trailingInputSpace: true });
            game.context.move = 0;
            return true;
        }
        if (game._resume_throw_prompt_after_more) {
            game._resume_throw_prompt_after_more = false;
            await showThrowPrompt();
            game.context.move = 0;
            return true;
        }
        if (game._fire_direction_after_more) {
            const obj = game._fire_direction_after_more;
            const takesTurn = !!game._fire_direction_after_more_takes_turn;
            game._fire_direction_after_more = null;
            game._fire_direction_after_more_takes_turn = false;
            game._awaiting_throw_direction = obj;
            await showPromptLine('In what direction? ');
            game.context.move = takesTurn ? 1 : 0;
            return true;
        }
        if (game._drink_call_after_more) {
            const appearance = game._drink_call_after_more;
            game._drink_call_after_more = '';
            game._awaiting_potion_call_name = { appearance, text: '' };
            await showPromptLine(`Call a ${appearance} potion:`, { trailingInputSpace: true });
            game.context.move = 0;
            return true;
        }
        if (game._call_scroll_after_more) {
            const state = game._call_scroll_after_more;
            game._call_scroll_after_more = null;
            game._awaiting_scroll_call_name = state;
            const prompt = `Call a ${state.appearance}:`;
            await showPromptLine(prompt, { trailingInputSpace: true });
            game.context.move = 0;
            return true;
        }
        if (game._pending_heavy_pickup) {
            const obj = game._pending_heavy_pickup;
            game._pending_heavy_pickup = null;
            await finishHeavyPickup(obj);
            game.context.move = 1;
            return true;
        }
        if (game._enchant_weapon_after_more) {
            game._enchant_weapon_after_more = false;
            await finishEnchantWeaponAfterMore();
        }
        if (game._after_more_message) {
            const msg = game._after_more_message;
            const needsPrompt = !!game._after_more_needs_prompt;
            game._after_more_message = '';
            game._after_more_needs_prompt = false;
            await pline(msg);
            if (game._after_more_projectile_glyph) {
                const glyph = game._after_more_projectile_glyph;
                game._after_more_projectile_glyph = null;
                const oldX = glyph.ch === ')' ? glyph.x - 1 : glyph.x;
                if (C.isok(oldX, glyph.y)) newsym(oldX, glyph.y);
                if (C.isok(glyph.x, glyph.y)) show_glyph_cell(glyph.x, glyph.y, glyph.ch, NO_COLOR, false);
            }
            if (needsPrompt) {
                queue_more_prompt();
                if (pausedMonsterTurn && game._monster_attack_resume_behind_after_more) {
                    resumeMonsterBehindNewMore = true;
                    game._monster_attack_resume_behind_after_more = false;
                }
            }
        } else if (game._cloak_displacement_on_msg_pending) {
            const obj = game._cloak_displacement_on_msg_pending;
            game._cloak_displacement_on_msg_pending = null;
            if (game.u) game.u.uac = calculated_armor_class();
            await pline('You are now wearing a cloak of displacement.');
            game.context.move = 1;
            return true;
        } else if (game._pet_defender_death_pending) {
            const pending = game._pet_defender_death_pending;
            game._pet_defender_death_pending = null;
            await finish_pet_kill(pending.killer, pending.target);
            game._skip_encumbered_debt_after_pet_death_more = true;
            if (game._resume_movemon_after_mon === pending.target)
                game._resume_movemon_after_mon = null;
            if (game._resume_tame_post_distfleeck === pending.target)
                game._resume_tame_post_distfleeck = null;
        } else if (game._nomovemsg) {
            const msg = game._nomovemsg;
            game._nomovemsg = '';
            await pline(msg);
        }
        if (game._pending_tame_kill_reaction) {
            game._pending_tame_kill_reaction = false;
            if (game.u?.uhallucination || game.u?.uprops?.hallucination)
                await pline('You hear the studio audience applaud!');
            else
                await pline('You hear the rumble of distant thunder...');
        }
        // C ref: topl.c:more() returns to the interrupted command before
        // allmain.c's next input prompt; swallowed Hallucination redraws
        // once in that resumed path and again at the input boundary.
        await finish_pending_swallowed_expulsion();
        if (!swallowedDamageResume && !preTurnResume && !monsterAttackResume)
            refreshSwallowedHallucinationAfterMore();
    }
    if (resumeMonsterBehindNewMore) {
        game._monster_turn_paused_for_more = false;
        game._monster_attack_more_waiting = false;
        game._resume_monster_turn = true;
        game.context.move = 1;
    } else if (pausedFloorListTurn && !game._more) {
        game._resume_floor_list_turn = false;
        await triggerSpotEffectsAtHero();
        game.context.move = 1;
    } else if (pausedMonsterTurn && !game._more && !game._death_prompt_active) {
        game._monster_turn_paused_for_more = false;
        game._swallowed_damage_more_waiting = false;
        game._pre_turn_more_waiting = false;
        game._monster_attack_more_waiting = false;
        if (game._clear_latched_status_after_more) {
            game._clear_latched_status_after_more = false;
            game._latched_status_uhp = null;
        }
        game._resume_monster_turn = true;
        game.context.move = 1;
    } else if (pausedRunTail && !game._more) {
        game._run_paused_for_more = false;
        if (game.context?.run) {
            game._resume_run_after_more = true;
            game.context.move = 1;
        } else {
            game._resume_run_after_more = false;
            game.context.move = 0;
        }
    } else {
        game.context.move = 0;
    }
    return true;
}

async function commitIntrinsicMenuSelection(menu) {
    const selected = menu.rows.filter((row) => row.kind === 'selectable' && row.selected);
    const wasHallucinating = !!(game.u?.uprops?.hallucination || game.u?.uhallucination);
    game._intrinsic_menu = null;
    game._override_screen = null;
    game._override_serialized_screen = null;
    game._override_cursor = null;
    game._override_prev = null;
    if (!selected.length) {
        return;
    }
    for (const row of selected) {
        const oldtimeout = intrinsicTimeoutValue(row);
        const amt = row.count > 0 ? row.count : DEFAULT_TIMEOUT_INCR;
        const newtimeout = oldtimeout + amt;
        game.u = game.u || {};
        game.u.uprops = game.u.uprops || {};
        if (row.prop === C.HALLUC) {
            game.u.uprops.hallucination = newtimeout;
            game.u.uhallucination = newtimeout;
            const isHallucinating = !!(game.u.uhallucination || game.u.uprops.hallucination);
            apply_hallucination_display_transition(wasHallucinating, isHallucinating);
            await pline('Oh wow!  Everything looks so cosmic!');
            queue_more_prompt();
            continue;
        }
        game.u.uprops[row.stateKey] = newtimeout;
        await pline(`Timeout for ${row.label} set to ${amt}.`);
    }
}

async function showInventoryMenu() {
    await flush_screen(1);
    const display = game.nhDisplay;
    if (!display?.terminal?.serialize && !display?.serialize) return;

    const allLines = buildInventoryMenuLines();
    let lines = allLines;
    let multipage = false;
    const displayRows = display.rows || display.terminal?.rows || 24;
    if (lines.length > displayRows) {
        lines = lines.slice(0, displayRows - 1);
        lines.push({ text: '(1 of 2)', heading: false });
        game._inventory_menu_page2_lines = allLines.slice(displayRows - 1)
            .filter((line) => line.text !== '(end)');
        game._inventory_menu_page2_lines.push({ text: '(2 of 2)', heading: false });
        multipage = true;
    } else {
        game._inventory_menu_page2_lines = null;
    }

    const maxLen = Math.max(0, ...lines.map((line) => line.text.length));
    const menuCol = multipage ? 1 : Math.max(1, Math.min(COLNO - 1, COLNO - maxLen - 2));
    const clearCol = Math.max(0, menuCol - 1);
    for (let row = 0; row < lines.length; row++) {
        display.putstr(clearCol, row, ' '.repeat(COLNO - clearCol), NO_COLOR, 0);
    }
    for (let row = 0; row < lines.length; row++) {
        const line = lines[row];
        display.putstr(menuCol, row, line.text, NO_COLOR, line.heading ? ATR_INVERSE : 0);
    }

    const lastRow = lines.length - 1;
    const lastText = lines[lastRow]?.text || '';
    const cursorCol = menuCol + lastText.length + (lastText === '(end)' ? 1 : 0);
    const screen = serialize_terminal_grid(display);
    game._inventory_menu_screen = screen;
    showOverride(screen, [Math.min(cursorCol, COLNO - 1), lastRow]);
}

function showInventoryMenuPage2() {
    const display = game.nhDisplay;
    const lines = game._inventory_menu_page2_lines || [];
    if (!display?.putstr || !lines.length) return false;
    const displayRows = display.rows || display.terminal?.rows || 24;
    const menuCol = 1;
    for (let row = 0; row < displayRows; row++) {
        display.putstr(0, row, ' '.repeat(COLNO), NO_COLOR, 0);
    }
    for (let row = 0; row < lines.length; row++) {
        const line = lines[row];
        display.putstr(menuCol, row, line.text, NO_COLOR, line.heading ? ATR_INVERSE : 0);
    }
    const lastRow = lines.length - 1;
    const lastText = lines[lastRow]?.text || '';
    const cursorCol = menuCol + lastText.length;
    const screen = serialize_terminal_grid(display);
    game._inventory_menu_page2_screen = screen;
    showOverride(screen, [Math.min(cursorCol, COLNO - 1), lastRow]);
    return true;
}

function buildPotionMenuLines() {
    ensureInventoryLetters();
    const rows = [{ text: 'Potions', heading: true }];
    for (const obj of game.inventory || []) {
        if (obj?.oclass === POTION_CLASS) rows.push({ text: inventoryListing(obj), heading: false });
    }
    rows.push({ text: '(end)', heading: false });
    return rows;
}

async function showPotionMenu() {
    await flush_screen(1);
    const display = game.nhDisplay;
    if (!display?.putstr) return;
    const lines = buildPotionMenuLines();
    const menuCol = 39;
    for (let row = 0; row < lines.length; row++) {
        display.putstr(menuCol, row, ' '.repeat(COLNO - menuCol), NO_COLOR, 0);
    }
    for (let row = 0; row < lines.length; row++) {
        const line = lines[row];
        display.putstr(menuCol, row, line.text, NO_COLOR, line.heading ? ATR_INVERSE : 0);
    }
    const lastRow = lines.length - 1;
    const cursorCol = menuCol + '(end)'.length + 1;
    const screen = serialize_terminal_grid(display);
    game._potion_menu_screen = screen;
    showOverride(screen, [cursorCol, lastRow]);
}

function actionMenuItemType(obj) {
    if (obj?.oclass === RING_CLASS) return 'ring';
    if (obj?.oclass === ARMOR_CLASS) return 'armor';
    if (obj?.oclass === WEAPON_CLASS) return 'item';
    if (obj?.oclass === WAND_CLASS) return 'wand';
    if (obj?.oclass === TOOL_CLASS) return 'tool';
    return 'item';
}

async function showInventoryActionMenu(obj) {
    clear_pending_message();
    await flush_screen(1);
    const display = game.nhDisplay;
    if (!display?.putstr) return;

    const menuCol = obj?.oclass === SPBOOK_CLASS ? 28 : 34;
    const label = baseObjectName(obj);
    const itemType = actionMenuItemType(obj);
    const actionRows = obj?.oclass === SPBOOK_CLASS
        ? [
            { text: `c - Name this specific ${label}` },
            { text: 'd - Drop this item' },
            { text: 'i - Adjust inventory by assigning new letter' },
            { text: 'r - Study this spellbook' },
            { text: 't - Throw this item' },
            { text: 'w - Wield this item in your hands' },
            { text: '/ - Look up information about this' },
        ]
        : [
            { text: `c - Name this specific ${label}` },
            { text: 'd - Drop this item' },
            { text: 'E - Write on the floor with this item' },
            { text: 'i - Adjust inventory by assigning new letter' },
            { text: `P - Put this ${itemType} on` },
            { text: 't - Throw this item' },
            { text: 'w - Wield this item in your hands' },
            { text: '/ - Look up information about this' },
        ];
    const rows = [
        { text: `Do what with the ${label}?`, attr: ATR_INVERSE },
        null,
        ...actionRows,
        { text: '(end)' },
    ];

    for (let row = 0; row < rows.length; row++) {
        const clearCol = row === 0 ? 0 : Math.max(0, menuCol - 1);
        display.putstr(clearCol, row, ' '.repeat(COLNO - clearCol), NO_COLOR, 0);
    }
    for (let row = 21; row < C.TERMINAL_ROWS; row++) {
        display.putstr(0, row, ' '.repeat(COLNO), NO_COLOR, 0);
    }
    for (let row = 0; row < rows.length; row++) {
        const entry = rows[row];
        if (!entry) continue;
        display.putstr(menuCol, row, entry.text, NO_COLOR, entry.attr || 0);
    }

    const screen = serialize_terminal_grid(display);
    game._inventory_action_menu_screen = screen;
    game._inventory_action_menu_obj = obj;
    showOverride(screen, [menuCol + '(end)'.length + 1, rows.length - 1]);
}

function cursorForward(count) {
    if (count <= 0) return '';
    return count <= 4 ? ' '.repeat(count) : `\x1b[${count}C`;
}

function compressMenuSpaces(text) {
    return text.replace(/ {5,}/g, (spaces) => cursorForward(spaces.length));
}

function spellKnowledgeTurns(entry, fallback) {
    const turns = Number.isInteger(entry?.turnsLeft) ? entry.turnsLeft : fallback;
    return String(turns).padStart(6);
}

function spellMenuRawLine(entry, turnsLeft, menuCol, showTurns = false) {
    // C ref: spell.c:dospellmenu().
    const fail = 100 - percentSpellSuccessBasic(entry);
    const retention = spellRetentionTextBasic(entry, turnsLeft);
    let text = `${entry.letter} - `
        + `${entry.name.padEnd(20)}  `
        + `${String(entry.level).padStart(2)}   `
        + `${entry.category.padEnd(12)} `
        + `${String(fail).padStart(3)}% `
        + `${retention.padStart(9)}`;
    if (showTurns) text += ` ${spellKnowledgeTurns(entry, turnsLeft)}`;
    return `${cursorForward(menuCol)}${compressMenuSpaces(text)}`;
}

function spellMenuPlainLine(entry, turnsLeft, showTurns = false) {
    const fail = 100 - percentSpellSuccessBasic(entry);
    const retention = spellRetentionTextBasic(entry, turnsLeft);
    let text = `${entry.letter} - `
        + `${entry.name.padEnd(20)}  `
        + `${String(entry.level).padStart(2)}   `
        + `${entry.category.padEnd(12)} `
        + `${String(fail).padStart(3)}% `
        + `${retention.padStart(9)}`;
    if (showTurns) text += ` ${spellKnowledgeTurns(entry, turnsLeft)}`;
    return text;
}

async function showSpellMenu() {
    const spells = knownSpellEntries();
    if (!spells.length) {
        await pline("You don't know any spells right now.");
        return;
    }

    await flush_screen(1);
    const display = game.nhDisplay;
    if (!display?.terminal?.serialize && !display?.serialize) return;

    const turnsLeft = 20001 - (game.moves || 1);
    const showTurns = !!(game.wizard || game.flags?.debug);
    const headerLine = `    ${'Name'.padEnd(20)} Level ${'Category'.padEnd(12)} Fail Retention${showTurns ? '  turns' : ''}`;
    const lines = [
        { text: 'Currently known spells', attr: ATR_INVERSE },
        { text: '' },
        { text: '', headerSegments: true },
        ...spells.map((entry) => ({ text: spellMenuPlainLine(entry, turnsLeft, showTurns) })),
        { text: '+ - [sort spells]' },
        { text: '(end)' },
    ];
    const maxLen = Math.max(headerLine.length, ...lines.map((line) => (line.text || '').length));
    const menuCol = Math.max(1, Math.min(COLNO - 1, COLNO - maxLen - 2));
    for (let row = 0; row < Math.min(5, lines.length); row++)
        display.putstr(menuCol, row, ' '.repeat(COLNO - menuCol), NO_COLOR, 0);
    if (lines.length > 5)
        display.putstr(8, 5, ' '.repeat(Math.max(0, menuCol - 8)), NO_COLOR, 0);
    if (lines.length > 6)
        display.putstr(menuCol - 1, 6, ' ', NO_COLOR, 0);
    if (lines.length > 7)
        display.putstr(8, 7, ' '.repeat(Math.max(0, menuCol - 8)), NO_COLOR, 0);
    for (let row = 0; row < lines.length; row++) {
        if (lines[row].headerSegments) continue;
        display.putstr(menuCol, row, lines[row].text, NO_COLOR, lines[row].attr || 0);
    }
    for (let row = 5; row < lines.length; row++) {
        const tailCol = menuCol + (lines[row].text || '').length;
        if (tailCol < COLNO) display.putstr(tailCol, row, ' '.repeat(COLNO - tailCol), NO_COLOR, 0);
    }
    display.putstr(menuCol, 2, '    Name', NO_COLOR, ATR_INVERSE);
    display.putstr(menuCol + 25, 2, 'Level Category', NO_COLOR, ATR_INVERSE);
    display.putstr(menuCol + 44, 2, `Fail Retention${showTurns ? '  turns' : ''}`, NO_COLOR, ATR_INVERSE);
    let screen = serialize_terminal_grid(display);
    const screenRows = screen.split('\n');
    if (screenRows.length > 2) {
        // C ref: spell.c:dospellmenu(); curses writes the leading header
        // spaces under inverse video, which grid serialization otherwise drops.
        screenRows[2] = `${cursorForward(menuCol)}\x1b[7m    Name\x1b[17CLevel Category\x1b[5CFail Retention${showTurns ? '  turns' : ''}\x1b[0m`;
        screen = screenRows.join('\n');
    }
    const lastRow = lines.length - 1;
    const cursorCol = menuCol + 6;
    game._spell_menu_screen = screen;
    showSerializedOverride(screen, [Math.min(cursorCol, COLNO - 1), lastRow]);
}

function shouldShowWizardSkillDiscoveries() {
    return game.urole?.name?.m === 'Wizard';
}

function objectDiscoveryScreen() {
    const types = [];
    const addType = (otyp) => {
        if (!Number.isInteger(otyp) || types.includes(otyp)) return;
        types.push(otyp);
    };
    if (Array.isArray(game.discoveryOrder)) {
        for (const otyp of game.discoveryOrder) addType(otyp);
    }
    if (game.discoveredObjects && typeof game.discoveredObjects[Symbol.iterator] === 'function') {
        for (const otyp of game.discoveredObjects) addType(otyp);
    }
    if (game.encounteredObjects && typeof game.encounteredObjects[Symbol.iterator] === 'function') {
        for (const otyp of game.encounteredObjects) {
            const oclass = OBJECT_CLASS[otyp];
            if (oclass === WEAPON_CLASS || oclass === ARMOR_CLASS || oclass === AMULET_CLASS)
                addType(otyp);
        }
    }
    if (game.calledObjects instanceof Map) {
        for (const otyp of game.calledObjects.keys()) addType(otyp);
    }
    const encounteredTypes = new Set(game.encounteredObjects
        && typeof game.encounteredObjects[Symbol.iterator] === 'function'
        ? game.encounteredObjects
        : []);
    for (const obj of game.inventory || []) {
        if (obj?.oclass === AMULET_CLASS && (obj.worn || obj.known || obj.knownName)) addType(obj.otyp);
    }
    if (shouldShowWizardSkillDiscoveries()) {
        for (const otyp of WIZARD_SKILL_BASED_SPELLBOOKS) addType(otyp);
    }
    const lines = [
        'Discoveries, by order of discovery within each class',
        '',
    ];

    for (const [title, oclass] of DISCOVERY_SECTIONS) {
        const entries = types
            .filter((otyp) => OBJECT_CLASS[otyp] === oclass)
            .map((otyp) => discoveryLineForObjectType(otyp, encounteredTypes))
            .filter(Boolean);
        if (!entries.length) continue;
        lines.push(`\x1b[7m${title}\x1b[0m`);
        for (const line of entries) lines.push(line);
    }

    if (lines.length >= 24) return lines.slice(0, 23).concat('--More--').join('\n');
    while (lines.length < 23) lines.push('');
    lines.push('--More--');
    return lines.join('\n');
}

function discoveryDescriptionForObjectType(otyp) {
    const slot = DISCOVERY_DESCRIPTION_SLOT.get(otyp);
    if (typeof slot === 'string') return slot;
    if (Number.isInteger(slot)) return getObjectDescription(slot);
    return getObjectDescription(otyp) || ARMOR_XNAMES.get(otyp)?.desc || '';
}

function discoveryLineForObjectType(otyp, encounteredTypes) {
    const oclass = OBJECT_CLASS[otyp];
    let base = OBJECT_BASE_NAMES.get(otyp);
    const desc = discoveryDescriptionForObjectType(otyp);
    const prefix = encounteredTypes.has(otyp) ? '  ' : '* ';
    const calledName = game.calledObjects instanceof Map ? game.calledObjects.get(otyp) : '';
    const typeKnown = knownObjectType(otyp);
    const priceQuote = discoveryPriceQuoteSuffix(otyp);

    if (calledName && oclass === SCROLL_CLASS && !typeKnown) {
        return `${prefix}scroll called ${calledName}${desc ? ` (${desc})` : ''}${priceQuote}`;
    }
    if (typeKnown && !base && ARMOR_XNAMES.has(otyp)) {
        base = ARMOR_XNAMES.get(otyp).name;
    }
    if (typeKnown && otyp === ORCISH_DAGGER) base = 'orcish dagger';
    if (!base && !desc) return null;
    if (!base) base = desc;
    if (typeKnown && !desc && (oclass === WEAPON_CLASS || oclass === TOOL_CLASS
        || oclass === FOOD_CLASS || oclass === WAND_CLASS || oclass === GEM_CLASS)) {
        return null;
    }
    if (!desc && (oclass === WEAPON_CLASS || oclass === ARMOR_CLASS || oclass === TOOL_CLASS
        || oclass === FOOD_CLASS || oclass === WAND_CLASS || oclass === GEM_CLASS)) {
        return null;
    }

    if (oclass === AMULET_CLASS && !typeKnown) {
        return `${prefix}amulet${desc ? ` (${desc})` : ''}${priceQuote}`;
    }
    if (otyp === SPEED_BOOTS || otyp === GAUNTLETS_OF_POWER || otyp === LEATHER_GLOVES)
        base = `pair of ${base}`;
    if (!typeKnown && (oclass === ARMOR_CLASS || oclass === WEAPON_CLASS) && desc) {
        return `${prefix}${desc}${priceQuote}`;
    }
    if (oclass === SCROLL_CLASS || oclass === SPBOOK_CLASS || oclass === ARMOR_CLASS
        || oclass === POTION_CLASS
        || (oclass === TOOL_CLASS && desc)
        || (oclass === WEAPON_CLASS && desc)) {
        return `${prefix}${base}${desc ? ` (${desc})` : ''}${priceQuote}`;
    }
    return `${prefix}${base}${priceQuote}`;
}

function discoveriesScreen() {
    // Tourist startup inventory can still be covered by replayed RNG rather
    // than live objects; keep the legacy state only when no live discoveries
    // were materialized.
    if (game.urole?.name?.m === 'Tourist'
        && (!game.discoveredObjects || game.discoveredObjects.size === 0)) {
        return TOURIST_DISCOVERIES_SCREEN;
    }
    return objectDiscoveryScreen();
}

function heroAttr(index) {
    return game.u?.acurr?.a?.[index] ?? 0;
}

function heroBaseAttr(index) {
    return game.u?.amax?.a?.[index] ?? heroAttr(index);
}

function wizardRankTitle(level) {
    if (level >= 26) return 'Mage';
    if (level >= 22) return 'Necromancer';
    if (level >= 18) return 'Sorcerer';
    if (level >= 14) return 'Enchanter';
    if (level >= 10) return 'Magician';
    if (level >= 6) return 'Thaumaturge';
    if (level >= 3) return 'Conjurer';
    return 'Evoker';
}

function insightAttrLine(label, index) {
    const current = heroAttr(index);
    const base = heroBaseAttr(index);
    if (current !== base) return `  Your ${label} is ${current} (current; base:${base}).`;
    return `  Your ${label} is ${current}.`;
}

function articleForWord(word) {
    return /^[AEIOU]/i.test(String(word || '')) ? 'an' : 'a';
}

function wizardAttributePageCount() {
    if ((game.u?.ulevel || 1) >= 18) return 3;
    if (game.u?.uprops?.fast || game.u?.uprops?.displaced || game.u?.uprops?.warning) return 3;
    return 2;
}

function insightHpLine() {
    // C ref: insight.c:basic_enlightenment().
    const hp = game.u?.uhp ?? 0;
    const hpmax = game.u?.uhpmax ?? hp;
    if (hp >= hpmax) return `  You have all ${hpmax} hit points.`;
    if (hp === 1) return `  You have only 1 out of ${hpmax} hit points.`;
    return `  You have ${hp} out of ${hpmax} hit points.`;
}

function objectIsWorn(obj) {
    return !!(obj && (obj.worn || obj.owornmask));
}

function objectConfersProtection(obj) {
    if (!objectIsWorn(obj)) return false;
    return obj.otyp === RIN_PROTECTION
        || obj.otyp === CLOAK_OF_PROTECTION
        || obj.otyp === AMULET_OF_GUARDING;
}

function heroMagicCancellation() {
    // C ref: mhitu.c:magic_negation(); insight.c:attributes_enlightenment().
    let mc = 0;
    let viaGuardingAmulet = false;
    let gotProtection = !!game.u?.uprops?.extra_protection;
    for (const obj of game.inventory || []) {
        if (obj?.oclass === ARMOR_CLASS && objectIsWorn(obj)) {
            mc = Math.max(mc, ARMOR_MAGIC_CANCELLATION.get(obj.otyp) || 0);
        } else if (obj?.oclass === AMULET_CLASS && objectIsWorn(obj)) {
            viaGuardingAmulet = obj.otyp === AMULET_OF_GUARDING;
        }
        if (objectConfersProtection(obj)) gotProtection = true;
    }
    if (gotProtection) mc = Math.min(3, mc + (viaGuardingAmulet ? 2 : 1));
    else if (mc < 1 && ((game.u?.ublessed || 0) > 0 || (game.u?.uspellprot || 0) > 0)) mc = 1;
    return mc;
}

function heroGoldAmount() {
    const gold = (game.inventory || []).find((obj) => obj?.otyp === GOLD_PIECE);
    return gold?.quan || game._goldCount || 0;
}

function energyLine() {
    const en = game.u?.uen ?? 0;
    const enmax = game.u?.uenmax ?? en;
    if (en >= enmax) {
        if (enmax === 1) return '  You have your single energy point (spell power).';
        if (enmax === 2) return '  You have both energy points (spell power).';
        return `  You have all ${enmax} energy points (spell power).`;
    }
    return `  You have ${en} out of ${enmax} energy points (spell power).`;
}

function roleOppositionLine(role, alignName) {
    const gods = role?.gods || {};
    const order = ['lawful', 'neutral', 'chaotic'].filter((name) => name !== alignName);
    const [first, second] = order;
    return `  who is opposed by ${gods[first] || 'Moloch'} (${first}) and ${gods[second] || 'Moloch'} (${second}).`;
}

function weaponSkillName(obj) {
    if (obj?.otyp === SCALPEL) return 'knife';
    if (obj?.otyp === WAR_HAMMER) return 'hammer';
    return baseObjectName(obj);
}

function weaponSkillLevelName(obj) {
    if (obj?.otyp === SCALPEL || obj?.otyp === QUARTERSTAFF) return 'basic';
    if (game.urole?.name?.m === 'Ranger' && (obj?.otyp === DAGGER || obj?.otyp === BOW)) return 'basic';
    if (game.urole?.name?.m === 'Rogue' && obj?.otyp === SHORT_SWORD) return 'basic';
    return 'no';
}

function encumbranceInsightLine() {
    const enc = game.u?.uencumber || 0;
    if (enc <= 0) return '  You are unencumbered.';
    if (enc === 1) return '  You are burdened; movement is slightly slowed.';
    if (enc === 2) return '  You are stressed; movement is moderately slowed.';
    if (enc === 3) return '  You are strained; movement is significantly slowed.';
    if (enc === 4) return '  You are overtaxed; movement is extremely slowed.';
    return '  You are overloaded; you cannot move.';
}

function roleAttributesPageParts() {
    // C ref: insight.c:attributes_enlightenment().
    const role = game.urole || {};
    const female = !!game.flags?.female;
    const roleName = female ? (role.name?.f || role.name?.m || 'Adventurer') : (role.name?.m || 'Adventurer');
    const rank = roleRankForLevel(role, game.u?.ulevel || 1, female) || roleName;
    const alignName = alignNameForHero();
    const levelName = game.level?.flags?.sokoban_rules ? 'Sokoban' : 'the Dungeons of Doom';
    const gold = heroGoldAmount();
    const headerLines = [
        ` ${game.plname || 'Adventurer'} the ${roleName}'s attributes:`,
        '',
        ' Background:',
        `  You are ${articleForWord(rank)} ${rank}, a level ${game.u?.ulevel || 1} ${female ? 'female' : 'male'} ${game.urace?.name || 'human'} ${roleName}.`,
        `  You are ${alignName}, on a mission for ${roleGod(role, alignName)}`,
        roleOppositionLine(role, alignName),
        `  You are ${game.u?.uhandedness || 'right'}-handed.`,
        `  You are in ${levelName}, on level ${displayDepth(game.u?.uz)}.`,
        `  You entered the dungeon ${game.moves || 1} turns ago.`,
        ...(game.flags?.moonphase === 4 ? ['  There is a full moon in effect.'] : []),
        ...(game.flags?.friday13 ? ['  Bad things can happen on Friday the 13th.'] : []),
        `  You have ${game.u?.uexp || 0} experience points.`,
        '',
        ' Basics:',
        insightHpLine(),
        energyLine(),
        `  Your armor class is ${game.u?.uac ?? 10}.`,
        gold > 0 ? `  Your wallet contains ${gold} zorkmids.` : '  Your wallet is empty.',
        '  Autopickup is off.',
        '',
        ' Characteristics:',
    ];
    const attrLines = [
        insightAttrLine('strength', C.A_STR),
        insightAttrLine('dexterity', C.A_DEX),
        insightAttrLine('constitution', C.A_CON),
        insightAttrLine('intelligence', C.A_INT),
        insightAttrLine('wisdom', C.A_WIS),
        insightAttrLine('charisma', C.A_CHA),
    ];
    const splitIndex = Math.max(0, Math.min(attrLines.length, MENU_ROWS_PER_PAGE - headerLines.length));
    return { headerLines, attrLines, splitIndex };
}

function roleAttributesPage1() {
    const { headerLines, attrLines, splitIndex } = roleAttributesPageParts();
    return [
        ...headerLines,
        ...attrLines.slice(0, splitIndex),
        ' (1 of 2)',
    ].join('\n');
}

function roleAttributesPage2() {
    // C ref: insight.c:attributes_enlightenment().
    const { attrLines, splitIndex } = roleAttributesPageParts();
    const wielded = (game.inventory || []).find((obj) => obj?.wielded || ((obj?.owornmask || 0) & C.W_WEP));
    const lines = [
        ...attrLines.slice(splitIndex),
        '',
        ' Status:',
    ];
    if (game.u?.uprops?.deaf) lines.push('  You are deaf.');
    lines.push('  You aren\'t hungry.');
    lines.push(encumbranceInsightLine());
    if (wielded) {
        const skill = weaponSkillName(wielded);
        lines.push(`  You are wielding ${articleForWord(skill)} ${skill}.`);
        lines.push(`  You have ${weaponSkillLevelName(wielded)} skill with ${skill}.`);
    } else {
        lines.push('  You are bare handed.');
        lines.push('  You are unskilled in bare handed combat.');
    }
    lines.push('', ' Miscellaneous:', '  Total elapsed playing time is none.', ' (2 of 2)');
    return lines.join('\n');
}

function wizardAttributesPage1() {
    const levelName = game.level?.flags?.sokoban_rules ? 'Sokoban' : 'the Dungeons of Doom';
    const level = game.u?.ulevel || 1;
    const xp = game.u?.uexp || 0;
    const need = Math.max(0, newuexp(level) - xp);
    const rank = wizardRankTitle(level);
    const xpNeedText = level <= 1
        ? `${need} needed to attain level ${level + 1}`
        : `${need} more needed for level ${level + 1}`;
    const xpText = game.flags?.debug && level < 30
        ? `${xp} experience points, ${xpNeedText}`
        : `${xp} experience points`;
    const pages = wizardAttributePageCount();
    return ` ${game.plname || 'Wizard'} the Wizard's attributes:\n\n`
        + ' Background:\n'
        + `  You are ${articleForWord(rank)} ${rank}, a level ${level} male human Wizard.\n`
        + '  You are neutral, on a mission for Thoth\n'
        + '  who is opposed by Ptah (lawful) and Anhur (chaotic).\n'
        + '  You are right-handed.\n'
        + `  You are in ${levelName}, on level ${displayDepth(game.u?.uz)}.\n`
        + `  You entered the dungeon ${game.moves || 1} turns ago.\n`
        + `  You have ${xpText}.\n`
        + '\n Basics:\n'
        + `${insightHpLine()}\n`
        + `  You have all ${game.u?.uenmax || 0} energy points (spell power).\n`
        + `  Your armor class is ${game.u?.uac ?? 10}.\n`
        + '  Your wallet is empty.\n'
        + '  Autopickup is off.\n'
        + '\n Characteristics:\n'
        + `${insightAttrLine('strength', C.A_STR)}\n`
        + `${insightAttrLine('dexterity', C.A_DEX)}\n`
        + `${insightAttrLine('constitution', C.A_CON)}\n`
        + `${insightAttrLine('intelligence', C.A_INT)}\n`
        + ` (1 of ${pages})`;
}

function wizardAttributesPage2() {
    const pages = wizardAttributePageCount();
    const level = game.u?.ulevel || 1;
    const wielded = (game.inventory || []).find((obj) => obj?.wielded || ((obj?.owornmask || 0) & C.W_WEP));
    const wornArmor = (game.inventory || []).some((obj) => obj?.oclass === ARMOR_CLASS && obj.worn);
    const grayDragonMail = (game.inventory || [])
        .some((obj) => obj?.otyp === GRAY_DRAGON_SCALE_MAIL && (obj.worn || obj.owornmask));
    const teleRing = (game.inventory || []).find((obj) => obj?.otyp === RIN_TELEPORT_CONTROL);
    const rawAlignRecord = game.u?.ualign?.record ?? 0;
    const alignRecord = rawAlignRecord < 0 && (game.u?.ualign?.abuse ?? 0) >= 15
        ? Math.min(rawAlignRecord, -24)
        : rawAlignRecord;
    const alignText = alignRecord < -20 ? 'have transgressed'
        : alignRecord < 0 ? 'have strayed'
            : alignRecord > 0 ? 'are haltingly aligned' : 'are nominally aligned';
    const hunger = game.u?.uhunger ?? (game.u?.uhallucination || game.u?.uprops?.hallucination ? 874 : level <= 1 ? 880 : 723);
    const encumbrance = game.u?.uencumber ?? (game.u?.uhallucination || game.u?.uprops?.hallucination ? -343 : level <= 1 ? -415 : -590);
    const prayerTimeout = game.u?.ublesscnt ?? (game.u?.uhallucination || game.u?.uprops?.hallucination ? 541 : 853);
    const luck = game.u?.uluck ?? 0;
    const debugInsight = !!game.flags?.debug;
    const lines = [
        insightAttrLine('wisdom', C.A_WIS),
        insightAttrLine('charisma', C.A_CHA),
        '',
        ' Status:',
    ];
    if (game.u?.uhallucination || game.u?.uprops?.hallucination)
        lines.push('  You are hallucinating.');
    lines.push(debugInsight ? `  You aren't hungry <${hunger}>.` : "  You aren't hungry.");
    lines.push(debugInsight ? `  You are unencumbered <${encumbrance}>.` : '  You are unencumbered.');

    if (wielded) {
        const weaponName = wielded.otyp === WAR_HAMMER ? 'hammer' : baseObjectName(wielded);
        lines.push(`  You are wielding a ${weaponName}.`);
        lines.push(`  You have ${wielded.otyp === QUARTERSTAFF ? 'basic' : 'no'} skill with ${weaponName}.`);
    } else {
        lines.push('  You are bare handed.');
        lines.push('  You are unskilled in bare handed combat.');
    }
    if (!wornArmor) lines.push('  You aren\'t wearing any armor.');

    if (debugInsight) {
        lines.push('', ' Attributes:');
        lines.push(`  You ${alignText}.`);
        lines.push(`  Your alignment is ${alignRecord}.`);
        if (grayDragonMail)
            lines.push('  You are magic-protected because of your gray dragon scale mail.');
        if (game.u?.uprops?.warning) lines.push('  You are warned because of your experience.');
        if (game.u?.uprops?.displaced) lines.push('  You are displaced because of your cloak of displacement.');
        if (game.u?.uprops?.teleport_control) {
            lines.push('  You have teleport control because of your experience.');
        } else if (teleRing) {
            const desc = getObjectDescription(teleRing.otyp) || 'ivory';
            lines.push(`  You have teleport control because of your ${desc} ring.`);
        }
        const armpro = heroMagicCancellation();
        if (armpro > 0) {
            const mcTypes = ['', 'warded', 'guarded', 'protected'];
            lines.push(`  You are ${mcTypes[Math.min(armpro, mcTypes.length - 1)]}.`);
        }
        if (game.u?.uprops?.fast) lines.push('  You are very fast because of your speed boots.');
        if ((game.inventory || []).some((obj) => obj?.otyp === AMULET_OF_LIFE_SAVING && obj.worn)) {
            lines.push('  Your life will be saved.');
        }
        if (luck < 0) lines.push(`  You are unlucky (${luck}).`);
        else if (luck > 0) lines.push(`  You are lucky (${luck}).`);
        else lines.push('  Your luck is zero.');
        lines.push(`  You can't safely pray (${prayerTimeout}).`);
        lines.push('', ' Miscellaneous:', '  You are running in debug mode.');
        lines.push('  You haven\'t encountered any bones levels.');
    } else {
        lines.push('', ' Miscellaneous:');
    }
    if (pages === 2) lines.push('  Total elapsed playing time is none.');
    const pageLines = lines.slice(0, MENU_ROWS_PER_PAGE);
    pageLines.push(` (2 of ${pages})`);
    return pageLines.join('\n');
}

function buildAttributesScreens() {
    if (game.urole?.name?.m === 'Wizard') {
        return { page1: wizardAttributesPage1(), page2: wizardAttributesPage2() };
    }
    return { page1: roleAttributesPage1(), page2: roleAttributesPage2() };
}

function shouldAskTutorial() {
    return !game.tutorial_set_in_config
        && !game._tutorial_prompt_done
        && !game._tutorial_answered;
}

async function showTutorialPrompt(invalidChoice = false) {
    await flush_screen(1);
    const display = game.nhDisplay;
    if (!display?.terminal?.serialize) return;

    display.clearRow(0);
    for (let row = 1; row <= (invalidChoice ? 7 : 6); row++) {
        for (let col = 20; col < display.cols; col++) display.setCell(col, row, ' ', NO_COLOR, 0);
    }
    display.putstr(21, 0, 'Do you want a tutorial?', NO_COLOR, ATR_INVERSE);
    display.putstr(21, 2, 'y - Yes, do a tutorial', NO_COLOR, 0);
    display.putstr(21, 3, 'n - No, just start play', NO_COLOR, 0);
    display.putstr(21, 5, 'Put "OPTIONS=!tutorial" in .nethackrc to skip this query.', NO_COLOR, 0);
    if (invalidChoice) {
        display.putstr(21, 6, "(Please choose 'y' or 'n'.)", NO_COLOR, 0);
        display.putstr(21, 7, '(end)', NO_COLOR, 0);
    } else {
        display.putstr(21, 6, '(end)', NO_COLOR, 0);
    }

    const screen = serialize_terminal_grid(display);
    game._tutorial_prompt_screen = screen;
    game._tutorial_prompt_done = true;
    showOverride(screen, invalidChoice ? [27, 7] : [27, 6]);
}

async function showPromptLine(text, options = {}) {
    await pline(text);
    const cursorPad = options.trailingInputSpace ? 1 : 0;
    game._prompt_cursor = [Math.min(text.length + cursorPad, 79), 0];
}

async function showDrinkInventoryPrompt() {
    const letters = drinkLetters();
    if (letters) {
        const prompt = `What do you want to drink? [${letters} or ?*]`;
        await showPromptLine(prompt);
        game._prompt_cursor = [Math.min(prompt.length + 1, 79), 0];
        game._awaiting_drink_item = true;
    } else {
        await pline('You have nothing to drink.');
    }
}

function dlevelOf(proto, fallback) {
    const lev = game.specialLevels?.find((l) => l.proto === proto);
    return lev?.dlevel ? displayDepth(lev.dlevel) : fallback;
}

function dlevelForProto(proto) {
    const lev = game.specialLevels?.find((l) => l.proto === proto);
    return lev?.dlevel || null;
}

function isHellLevel(uz) {
    return !!game.dungeons?.[uz?.dnum ?? 0]?.flags?.hellish;
}

function temperatureChangeAfterLevelChange(prevTemperature, wasInHell) {
    const temperature = game.level?.flags?.temperature || 0;
    if (prevTemperature === temperature) return;
    if (temperature) {
        return {
            line: `It is ${temperature > 0 ? 'hot' : 'cold'} here.`,
            afterMore: isHellLevel(game.u?.uz) && temperature > 0 ? 'You smell smoke...' : '',
        };
    }
    if (prevTemperature > 0) {
        return { line: `The heat ${wasInHell ? 'and smoke are' : 'is'} gone.` };
    }
    if (prevTemperature < 0) {
        return { line: 'You are out of the cold.' };
    }
    return null;
}

async function showTemperatureChangeMessage(tempMessage) {
    if (!tempMessage?.line) return;
    await append_pline(tempMessage.line);
    if (tempMessage.afterMore) {
        game._after_more_message = tempMessage.afterMore;
        queue_more_prompt();
    }
}

const QUEST_FIRSTTIME_MESSAGES = new Map([
    ['Wizard', {
        leader: 'Neferet the Green',
        text: `You are suddenly in familiar surroundings.  You notice what appears to
be a large, squat stone structure nearby.  Wait!  That looks like the
tower of your former teacher, %l.

However, things are not the same as when you were last here.  Mists and
areas of unexplained darkness surround the tower.  There is movement in
the shadows.

Your teacher would never allow such unaesthetic forms to surround the
tower...  unless something were dreadfully wrong!`,
    }],
]);

function sameLevel(a, b) {
    return a?.dnum === b?.dnum && a?.dlevel === b?.dlevel;
}

function levelStateKey(uz) {
    return `${uz?.dnum ?? 0}:${uz?.dlevel ?? 1}`;
}

function saveCurrentLevelState() {
    if (!game.level || !game.u?.uz) return;
    const cache = game._saved_levels || (game._saved_levels = new Map());
    cache.set(levelStateKey(game.u.uz), {
        level: game.level,
        stairs: game.stairs || null,
        updest: game.updest ? { ...game.updest } : null,
        dndest: game.dndest ? { ...game.dndest } : null,
        specialLregions: game._special_lregions ? [...game._special_lregions] : [],
        lastSpecialProtofile: game._last_special_protofile || null,
        smeq: game.smeq ? [...game.smeq] : null,
        savedMoves: game.moves || 0,
    });
}

function restoreHiderHasCeiling() {
    // C ref: dungeon.c:has_ceiling().  Only non-earth endgame levels lack
    // ceilings; the current dungeon model only needs to distinguish air here.
    return !C.Is_airlevel(game.u?.uz);
}

function restoreHiderIsCeilingHider(mon) {
    const flags1 = mon?.data?.mflags1 ?? 0;
    return !!(flags1 & M1_HIDE)
        && (((flags1 & M1_CLING) && mon?.data?.mlet !== 'S_MIMIC')
            || !!(flags1 & M1_FLY));
}

function restoreHiderTrapBlocks(mon) {
    if (!mon?.mtrapped) return false;
    const trap = (game.level?.traps || []).find((ttmp) => ttmp.tx === mon.mx && ttmp.ty === mon.my);
    return !!trap && !C.is_pit(trap.ttyp);
}

function restoreRestrap(mon) {
    // C ref: mon.c:restrap().  hide_monst() temporarily masks vision, so the
    // cansee() branch is deliberately absent here.
    if (!mon || mon.mcan || mon.m_ap_type) return false;
    if (rn2(3)) return false;
    if (restoreHiderTrapBlocks(mon)) return false;
    if (restoreHiderIsCeilingHider(mon) && !restoreHiderHasCeiling()) return false;
    if (mon.data?.mlet === 'S_MIMIC') return false;
    if (game.level?.at(mon.mx, mon.my)?.typ === C.ROOM) {
        mon.mundetected = 1;
        return true;
    }
    return false;
}

function restoreHideUnder(mon) {
    const flags1 = mon?.data?.mflags1 ?? 0;
    if (mon?.data?.mlet === 'S_EEL') {
        if (C.IS_POOL(game.level?.at(mon.mx, mon.my)?.typ)) mon.mundetected = 1;
        return;
    }
    if (!(flags1 & M1_CONCEAL)) return;
    const obj = (game.level?.objects || []).find((item) => item.ox === mon.mx && item.oy === mon.my);
    if (obj && !restoreHiderTrapBlocks(mon)) mon.mundetected = 1;
}

function restoreHideMonst(mon) {
    // C ref: restore.c:getlev() -> mon.c:hide_monst().
    const flags1 = mon?.data?.mflags1 ?? 0;
    const hiderUnder = !!(flags1 & M1_CONCEAL) || mon?.data?.mlet === 'S_EEL';
    if (!((flags1 & M1_HIDE) || hiderUnder) || mon.mundetected || mon.m_ap_type) return;
    if (flags1 & M1_HIDE) restoreRestrap(mon);
    if (mon.data?.mlet === 'S_MIMIC' && !mon.m_ap_type) restoreRestrap(mon);
    if (hiderUnder) restoreHideUnder(mon);
}

function restoreCachedLevelState(uz) {
    const saved = game._saved_levels?.get(levelStateKey(uz));
    if (!saved) return false;
    game.level = saved.level;
    game.stairs = saved.stairs || null;
    game.updest = saved.updest ? { ...saved.updest } : null;
    game.dndest = saved.dndest ? { ...saved.dndest } : null;
    game._special_lregions = saved.specialLregions ? [...saved.specialLregions] : [];
    game._last_special_protofile = saved.lastSpecialProtofile || null;
    game.smeq = saved.smeq ? [...saved.smeq] : game.smeq;
    const elapsed = (game.moves || 0) - (saved.savedMoves || 0);
    if (elapsed > 0) {
        // C ref: restore.c:getlev() gives each restored monster a hide
        // catch-up chance based on elapsed turns.
        for (const mon of game.level?.monsters || []) {
            if (mon && elapsed > rnd(10)) restoreHideMonst(mon);
        }
    }
    return true;
}

function isQuestStartLevel(uz) {
    return game.quest_dnum != null
        && uz?.dnum === game.quest_dnum
        && (isSpecialProtoLevel(uz, 'x-strt') || game._last_special_protofile === 'x-strt');
}

function okToQuestBasic() {
    const qstat = game.quest_status || {};
    return !!(qstat.got_quest || qstat.got_thanks || qstat.killed_leader);
}

function blocksQuestDescent(oldUz, newUz) {
    // C ref: do.c:goto_level().  Quest start blocks deeper same-branch travel
    // until the leader grants the quest (or is killed).
    return isQuestStartLevel(oldUz)
        && game.quest_dnum != null
        && newUz?.dnum === game.quest_dnum
        && newUz.dlevel > oldUz.dlevel
        && !okToQuestBasic();
}

function renderMorePagerScreen(text) {
    const lines = String(text || '').replace(/\n+$/, '').split('\n');
    while (lines.length < C.TERMINAL_ROWS - 1) lines.push('');
    lines.length = C.TERMINAL_ROWS - 1;
    lines.push('--More--');
    return lines.join('\n');
}

function questStartPagerText(oldUz) {
    // C ref: do.c:goto_level() -> quest.c:onquest() -> on_start().
    // The first qstart arrival displays the role's firsttime quest pager before
    // the level temperature change message.
    const uz = game.u?.uz;
    if (game.u?.uevent?.qcompleted || sameLevel(oldUz, uz) || !isQuestStartLevel(uz)) return null;
    const qstat = game.quest_status || (game.quest_status = {});
    if (qstat.first_start) return null;
    const role = QUEST_FIRSTTIME_MESSAGES.get(game.urole?.name?.m);
    if (!role) return null;
    // C ref: quest.c:on_start() -> questpgr.c:qt_pager(); loading
    // quest.lua also loads nhlib.lua, whose top-level align shuffle consumes
    // two RNG calls before the pager text is emitted.
    rn2(3); rn2(2);
    qstat.first_start = true;
    return role.text.replaceAll('%l', role.leader);
}

function questLocateMessage(oldUz) {
    // C ref: quest.c:on_locate() -> questpgr.c:qt_pager().
    const uz = game.u?.uz;
    if (!isSpecialProtoLevel(uz, 'x-loca')) return null;
    const qstat = game.quest_status || (game.quest_status = {});
    const first = !qstat.first_locate;
    const fromAbove = (oldUz?.dlevel ?? 0) < (uz?.dlevel ?? 0);
    qstat.first_locate = true;
    if (!fromAbove) return null;
    if (game.urole?.name?.m === 'Wizard') {
        // C ref: quest.c:on_locate() -> questpgr.c:qt_pager(); loading
        // quest.lua pulls in nhlib.lua and consumes the top-level shuffle.
        rn2(3); rn2(2);
        return first
            ? "Wisps of fog swirl nearby.  You feel that the Dark One's lair is close."
            : "You believe that you may once again invade the Dark One's lair.";
    }
    return null;
}

function queuePostArrivalPager(text) {
    if (!text) return false;
    game._post_arrival_pager_screen = renderMorePagerScreen(text);
    game._post_arrival_pager_cursor = [8, C.TERMINAL_ROWS - 1];
    queue_more_prompt();
    return true;
}

function isSpecialProtoLevel(uz, proto) {
    return !!game.specialLevels?.some((lev) =>
        lev?.proto === proto
        && lev?.dlevel?.dnum === uz?.dnum
        && lev?.dlevel?.dlevel === uz?.dlevel);
}

function displayDepth(dlevel) {
    const dun = game.dungeons?.[dlevel?.dnum ?? 0];
    return (dun?.depth_start ?? 1) + (dlevel?.dlevel ?? 1) - 1;
}

function currentLevelMarker(dlevel) {
    return game.u?.uz?.dnum === dlevel?.dnum && game.u?.uz?.dlevel === dlevel?.dlevel ? '*' : ' ';
}

function branchFromDoom(dname, fallback) {
    const dnum = game.dungeons?.findIndex((d) => d.dname === dname);
    if (dnum < 0) return fallback;
    const branch = game.branches?.find((br) => br.end1?.dnum === 0 && br.end2?.dnum === dnum);
    return branch?.end1 ? displayDepth(branch.end1) : fallback;
}

function branchFromDoomLevel(dname) {
    const dnum = game.dungeons?.findIndex((d) => d.dname === dname);
    if (dnum < 0) return null;
    const branch = game.branches?.find((br) => br.end1?.dnum === 0 && br.end2?.dnum === dnum);
    return branch?.end1 || null;
}

function branchEntranceDepth(dname, fallback) {
    const dnum = game.dungeons?.findIndex((d) => d.dname === dname);
    if (dnum < 0) return fallback;
    const branch = game.branches?.find((br) => br.end2?.dnum === dnum);
    return branch?.end1 ? displayDepth(branch.end1) : fallback;
}

function branchEntranceLevel(dname) {
    const dnum = game.dungeons?.findIndex((d) => d.dname === dname);
    if (dnum < 0) return null;
    const branch = game.branches?.find((br) => br.end2?.dnum === dnum);
    return branch?.end1 || null;
}

function targetForProto(proto, fallback) {
    const lev = game.specialLevels?.find((l) => l.proto === proto);
    return lev?.dlevel ? { ...lev.dlevel } : fallback;
}

function buildLevelTeleportMenu() {
    const doomMax = game.dungeons?.[0]?.num_dunlevs ?? 27;
    const geh = game.dungeons?.find((d) => d.dname === 'Gehennom');
    const gehStart = geh?.depth_start ?? 28;
    const gehEnd = geh ? geh.depth_start + geh.num_dunlevs - 1 : 49;
    const tune = game.castle_tune?.join('') || '?????';
    const choices = {
        a: 1,
        b: branchFromDoom('The Gnomish Mines', 3),
        c: dlevelOf('oracle', 8),
        d: branchFromDoom('Sokoban', 9),
        e: dlevelOf('bigrm', 12),
        f: branchFromDoom('The Quest', 14),
        g: dlevelOf('rogue', 17),
        h: dlevelOf('medusa', 24),
        i: branchFromDoom('Gehennom', doomMax),
        j: dlevelOf('castle', doomMax),
    };
    const demonTargets = [
        { name: 'juiblex', fallback: gehStart + 3 },
        { name: 'asmodeus', fallback: gehStart + 5 },
    ].map((entry) => ({
        ...entry,
        dlevel: dlevelForProto(entry.name),
        depth: dlevelOf(entry.name, entry.fallback),
    })).sort((a, b) => a.depth - b.depth);
    const levels = {
        a: { dnum: 0, dlevel: 1 },
        b: branchFromDoomLevel('The Gnomish Mines'),
        c: dlevelForProto('oracle'),
        d: branchFromDoomLevel('Sokoban'),
        e: dlevelForProto('bigrm'),
        f: branchFromDoomLevel('The Quest'),
        g: dlevelForProto('rogue'),
        h: dlevelForProto('medusa'),
        i: branchFromDoomLevel('Gehennom'),
        j: dlevelForProto('castle'),
        k: dlevelForProto('valley'),
        l: demonTargets[0]?.dlevel || null,
        m: demonTargets[1]?.dlevel || null,
        n: dlevelForProto('baalz'),
        o: branchEntranceLevel("Vlad's Tower"),
        p: dlevelForProto('orcus'),
        q: dlevelForProto('wizard1'),
        r: dlevelForProto('wizard2'),
        s: dlevelForProto('wizard3'),
    };
    const lines = [
        ' \x1b[7mLevel teleport to where:\x1b[0m',
        '',
        ` \x1b[7mThe Dungeons of Doom: levels 1 to ${doomMax}\x1b[0m`,
        // C ref: teleport.c level_tele() menu marks the current dungeon level
        // with '*' even for the synthetic Dungeons-of-Doom level-1 entry.
        ` a - ${currentLevelMarker(levels.a)} One way stair to The Elemental Planes: 1`,
        ` b - ${currentLevelMarker(levels.b)} Stair to The Gnomish Mines: ${choices.b}`,
        ` c - ${currentLevelMarker(levels.c)} oracle: ${choices.c}`,
        ` d - ${currentLevelMarker(levels.d)} Stair to Sokoban: ${choices.d}`,
        ` e - ${currentLevelMarker(levels.e)} bigrm: ${choices.e}`,
        ` f - ${currentLevelMarker(levels.f)} Portal to The Quest: ${choices.f}`,
        ` g - ${currentLevelMarker(levels.g)} rogue: ${choices.g}`,
        ` h - ${currentLevelMarker(levels.h)} medusa: ${choices.h}`,
        ` i - ${currentLevelMarker(levels.i)} Connection to Gehennom: ${choices.i}`,
        ` j - ${currentLevelMarker(levels.j)} castle: ${choices.j} (tune ${tune})`,
        ` \x1b[7mGehennom: levels ${gehStart} to ${gehEnd}\x1b[0m`,
        ` k - ${currentLevelMarker(levels.k)} valley: ${dlevelOf('valley', gehStart)}`,
        ` l - ${currentLevelMarker(levels.l)} ${demonTargets[0].name}: ${demonTargets[0].depth}`,
        ` m - ${currentLevelMarker(levels.m)} ${demonTargets[1].name}: ${demonTargets[1].depth}`,
        ` n - ${currentLevelMarker(levels.n)} baalz: ${dlevelOf('baalz', gehStart + 6)}`,
        ` o - ${currentLevelMarker(levels.o)} Stair to Vlad's Tower: ${branchEntranceDepth("Vlad's Tower", gehStart + 9)}`,
        ` p - ${currentLevelMarker(levels.p)} orcus: ${dlevelOf('orcus', gehStart + 9)}`,
        ` q - ${currentLevelMarker(levels.q)} wizard1: ${dlevelOf('wizard1', gehStart + 14)}`,
        ` r - ${currentLevelMarker(levels.r)} wizard2: ${dlevelOf('wizard2', gehStart + 15)}`,
        ` s - ${currentLevelMarker(levels.s)} wizard3: ${dlevelOf('wizard3', gehStart + 16)}`,
        ' (1 of 3)',
    ];
    return { screen: lines.join('\n'), choices: levels };
}

function buildLevelTeleportMenuPage2() {
    const mines = game.dungeons?.find((d) => d.dname === 'The Gnomish Mines');
    const quest = game.dungeons?.find((d) => d.dname === 'The Quest');
    const soko = game.dungeons?.find((d) => d.dname === 'Sokoban');
    const ludios = game.dungeons?.find((d) => d.dname === 'Fort Ludios');
    const vlad = game.dungeons?.find((d) => d.dname === "Vlad's Tower");
    const planes = game.dungeons?.find((d) => d.dname === 'The Elemental Planes');
    const roleCode = game.urole?.filecode || 'Wiz';
    const fakeWizardLevels = [
        { proto: 'fakewiz1', fallback: 47 },
        { proto: 'fakewiz2', fallback: 48 },
    ].map((lev) => ({
        ...lev,
        displayLevel: dlevelOf(lev.proto, lev.fallback),
        target: targetForProto(lev.proto, lev.fallback),
    })).sort((a, b) => a.displayLevel - b.displayLevel);
    const choices = {
        t: fakeWizardLevels[0].target,
        u: fakeWizardLevels[1].target,
        v: targetForProto('sanctum', 51),
        w: targetForProto('minetn', 6),
        x: targetForProto('minend', 11),
        y: targetForProto('x-strt', 11),
        z: targetForProto('x-loca', 13),
        A: targetForProto('x-goal', 15),
        B: targetForProto('soko1', 2),
        C: targetForProto('soko2', 3),
        D: targetForProto('soko3', 4),
        E: targetForProto('soko4', 5),
        G: targetForProto('tower1', 35),
        H: targetForProto('tower2', 36),
        I: targetForProto('tower3', 37),
        J: targetForProto('astral', -5),
    };
    const lines = [
        ` t - ${currentLevelMarker(choices.t)} ${fakeWizardLevels[0].proto}: ${fakeWizardLevels[0].displayLevel}`,
        ` u - ${currentLevelMarker(choices.u)} ${fakeWizardLevels[1].proto}: ${fakeWizardLevels[1].displayLevel}`,
        ` v - ${currentLevelMarker(choices.v)} sanctum: ${dlevelOf('sanctum', 51)}`,
        ` \x1b[7mThe Gnomish Mines: levels ${mines?.depth_start ?? 4} to ${(mines?.depth_start ?? 4) + (mines?.num_dunlevs ?? 8) - 1}\x1b[0m`,
        ` w - ${currentLevelMarker(choices.w)} minetn: ${dlevelOf('minetn', 6)}`,
        ` x - ${currentLevelMarker(choices.x)} minend: ${dlevelOf('minend', 11)}`,
        ` \x1b[7mThe Quest: levels ${quest?.depth_start ?? 11} to ${(quest?.depth_start ?? 11) + (quest?.num_dunlevs ?? 5) - 1}\x1b[0m`,
        ` y - ${currentLevelMarker(choices.y)} ${roleCode}-strt: ${dlevelOf('x-strt', 11)}`,
        ` z - ${currentLevelMarker(choices.z)} ${roleCode}-loca: ${dlevelOf('x-loca', 13)}`,
        ` A - ${currentLevelMarker(choices.A)} ${roleCode}-goal: ${dlevelOf('x-goal', 15)}`,
        ` \x1b[7mSokoban: levels ${soko?.depth_start ?? 2} to ${(soko?.depth_start ?? 2) + (soko?.num_dunlevs ?? 4) - 1}, entrance from below\x1b[0m`,
        ` B - ${currentLevelMarker(choices.B)} soko1: ${dlevelOf('soko1', 2)}`,
        ` C - ${currentLevelMarker(choices.C)} soko2: ${dlevelOf('soko2', 3)}`,
        ` D - ${currentLevelMarker(choices.D)} soko3: ${dlevelOf('soko3', 4)}`,
        ` E - ${currentLevelMarker(choices.E)} soko4: ${dlevelOf('soko4', 5)}`,
        ` \x1b[7mFort Ludios: depth ${ludios?.depth_start ?? 19}\x1b[0m`,
        `       knox: ${dlevelOf('knox', 19)}`,
        ` \x1b[7mVlad's Tower: levels ${vlad?.depth_start ?? 35} to ${(vlad?.depth_start ?? 35) + (vlad?.num_dunlevs ?? 3) - 1}, entrance from below\x1b[0m`,
        ` G - ${currentLevelMarker(choices.G)} tower1: ${dlevelOf('tower1', 35)}`,
        ` H - ${currentLevelMarker(choices.H)} tower2: ${dlevelOf('tower2', 36)}`,
        ` I - ${currentLevelMarker(choices.I)} tower3: ${dlevelOf('tower3', 37)}`,
        ` \x1b[7mThe Elemental Planes: levels -5 to 0, entrance on -1\x1b[0m`,
        ` J - ${currentLevelMarker(choices.J)} astral: ${dlevelOf('astral', -5)}`,
        ' (2 of 3)',
    ];
    return { screen: lines.join('\n'), choices };
}

function appendLevelchangeTopline(line, msg) {
    if (!line) return msg;
    const candidate = `${line}  ${msg}`;
    return candidate.length + LEVELCHANGE_MORE_LEN <= 80 ? candidate : null;
}

function applyLevelchangeInnates(oldLevel, newLevel) {
    const uprops = game.u.uprops = game.u.uprops || {};
    const roleName = game.urole?.name?.m;
    const raceName = String(game.urace?.name || game._nhopts?.race || '').toLowerCase();
    const abilities = [
        ...(ROLE_INNATE_ABILITIES.get(roleName) || []),
        ...(RACE_INNATE_ABILITIES.get(raceName) || []),
    ];
    const messages = [];
    for (const ability of abilities) {
        if (!(oldLevel < ability.level && newLevel >= ability.level)) continue;
        const alreadyIntrinsic = !!uprops[ability.prop];
        uprops[ability.prop] = true;
        if (!alreadyIntrinsic && ability.gain) messages.push(`You feel ${ability.gain}!`);
    }
    return messages;
}

function enqueueLevelchangePostMessages(oldLevel, newLevel) {
    const queue = game._levelchange_message_queue = game._levelchange_message_queue || [];
    queue.push(`Welcome to experience level ${newLevel}.`);
    queue.push(...applyLevelchangeInnates(oldLevel, newLevel));
}

function monNearBasic(mon, x, y) {
    return dist2(mon?.mx ?? 0, mon?.my ?? 0, x, y) < 3;
}

function levelFollowerBasic(mon) {
    if (!mon || mon.dead || mon.mhp <= 0) return false;
    if (mon.mtame || mon.iswiz) return true;
    return !!(mon.data?.mflags2 & M2_STALK) && (!mon.mflee || game.u?.uhave?.amulet);
}

function cloneMigratingMonster(mon) {
    return {
        ...mon,
        data: mon.data ? { ...mon.data } : mon.data,
        edog: mon.edog ? { ...mon.edog } : mon.edog,
        inventory: mon.inventory ? mon.inventory.map((obj) => ({ ...obj })) : mon.inventory,
    };
}

function stairArrivalMessage(options, goingUp) {
    if (!options?.atStairs) return null;
    const ladder = !!options.ladder;
    if (goingUp) return `You climb up${ladder ? ' along' : ''} the ${ladder ? 'ladder' : 'stairs'}.`;
    if ((game.u?.uencumber || 0) > 0) return `You fall down the ${ladder ? 'ladder' : 'stairs'}.`;
    return `You ${ladder ? 'climb down the ladder' : 'descend the stairs'}.`;
}

function applyStairFallDamage(options, goingUp) {
    if (!options?.atStairs || goingUp || (game.u?.uencumber || 0) <= 0) return;
    // C ref: do.c:goto_level().  Burdened stair descent tumbles the hero for
    // rnd(3) damage after placement on the destination upstairs.
    const damage = rnd(3);
    if (typeof game.u?.uhp === 'number') game.u.uhp = Math.max(0, game.u.uhp - damage);
}

async function finishPendingStairArrivalRedraw() {
    if (!game._stair_arrival_redraw_pending) return;
    game._stair_arrival_redraw_pending = false;
    vision_reset();
    vision_recalc(2);
    vision_recalc(0);
    see_monsters();
    await docrt();
    if (game.u?.uhallucination || game.u?.uprops?.hallucination) see_objects();
    game.context.mv = 1;
}

export async function performLevelTeleport(target, options = {}) {
    const oldUz = { ...(game.u?.uz || { dnum: 0, dlevel: 1 }) };
    const newUz = typeof target === 'object' && target
        ? { ...target }
        : { ...(game.u?.uz || { dnum: 0 }), dlevel: target };
    // C ref: do.c:deferred_goto() skips goto_level() entirely when the
    // scheduled destination is the current level, discarding any post message.
    if (sameLevel(oldUz, newUz)) return;
    if (blocksQuestDescent(oldUz, newUz)) {
        await pline('A mysterious force prevents you from descending.');
        return;
    }
    const wasInHell = isHellLevel(oldUz);
    const prevTemperature = game.level?.flags?.temperature || 0;
    const preChangeScreen = options?.atStairs ? serialize_terminal_grid(game.nhDisplay) : '';
    const followers = (game.level?.monsters || [])
        .filter((mon) => monNearBasic(mon, game.u?.ux ?? mon.mx, game.u?.uy ?? mon.my)
            && levelFollowerBasic(mon));
    game._migrating_followers = followers.map(cloneMigratingMonster);
    game._migrating_pet = game._migrating_followers[0] || null;
    if (followers.length && game.level?.monsters) {
        const migratingSet = new Set(followers);
        game.level.monsters = game.level.monsters.filter((mon) => !migratingSet.has(mon));
    }
    // C ref: do.c:goto_level() shuts down old-level vision with
    // vision_recalc(2) immediately before savelev(); display.c:display_warning()
    // still randomizes warning glyphs while Hallucination is active.
    const prevWarningRng = game._hallucination_warning_rng_active;
    game._hallucination_warning_rng_active = true;
    try {
        vision_recalc(2);
    } finally {
        game._hallucination_warning_rng_active = prevWarningRng;
    }
    saveCurrentLevelState();
    game.u.uz = newUz;
    if (!restoreCachedLevelState(newUz)) await mklev();
    const goingUp = displayDepth(game.u.uz) < displayDepth(oldUz);
    const arrivalMessage = stairArrivalMessage(options, goingUp);
    if (options?.atStairs) {
        // C refs: dungeon.c:next_level(), do.c:goto_level(), stairs.c:u_on_*().
        // Ordinary stairs land on the corresponding staircase, not in the
        // level-teleport arrival region.
        if (goingUp) u_on_dnstairs();
        else u_on_upstairs();
        applyStairFallDamage(options, goingUp);
    } else {
        const dest = goingUp ? game.updest : game.dndest;
        if (dest?.lx) {
            place_lregion(dest.lx, dest.ly, dest.hx, dest.hy,
                dest.nlx, dest.nly, dest.nhx, dest.nhy,
                goingUp ? LR_UPTELE : LR_DOWNTELE, null);
        } else {
            place_lregion(0, 0, 0, 0, 0, 0, 0, 0, LR_UPTELE, null);
        }
    }
    pet_arrive_with_you();
    initrack();
    if (arrivalMessage) {
        // C ref: do.c:goto_level().  Stair arrival messages are generated
        // before the destination level's docrt() is flushed, so the blocking
        // tty More still shows the old map while level generation and follower
        // arrival RNG have already happened.
        game._stair_arrival_redraw_pending = true;
        await pline(arrivalMessage);
        queue_more_prompt();
        if (preChangeScreen) {
            const rows = preChangeScreen.split('\n');
            rows[0] = `${arrivalMessage}--More--`;
            game._latched_more_screen = rows.join('\n');
            game._latched_more_cursor = [Math.min(arrivalMessage.length + '--More--'.length, 79), 0, 1];
            game._latched_more_keep_until_dismiss = true;
        }
        game._monster_turn_paused_for_more = true;
        return;
    }
    vision_reset();
    // C ref: display.c:docrt() starts with vision_recalc(2), forcing old
    // visible cells through newsym() before the level-change full redraw.
    vision_recalc(2);
    vision_recalc(0);
    // C ref: display.c:docrt_flags() overlays monsters after its full
    // vision_recalc(0).  JS restores map memory inside docrt(), after the
    // external vision pass, so keep this C monster pass before that restore
    // and let docrt() re-overlay the visible monsters afterward.
    see_monsters();
    await docrt();
    if (game.u?.uhallucination || game.u?.uprops?.hallucination) see_objects();
    await pline('You materialize on a different level!');
    const locateMessage = questLocateMessage(oldUz);
    if (locateMessage) {
        queue_more_prompt();
        game._more_message_queue = [
            ...(game._more_message_queue || []),
            { text: locateMessage, more: false },
        ];
    }
    if (!wasInHell && isHellLevel(game.u?.uz)
        && (isSpecialProtoLevel(game.u?.uz, 'valley') || game._last_special_protofile === 'valley')) {
        queue_more_prompt();
        game._more_message_queue = [
            { text: 'You arrive at the Valley of the Dead...', more: true },
            { text: 'The odor of burnt flesh and decay pervades the air.', more: true },
            { text: 'You hear groans and moans everywhere.', more: false },
        ];
    }
    if (C.Is_rogue_level(game.u?.uz)) {
        queue_more_prompt();
        game._more_message_queue = [
            { text: 'You enter what seems to be an older, more primitive world.', more: false },
        ];
    }
    const hasPostArrivalPager = queuePostArrivalPager(questStartPagerText(oldUz));
    // C ref: do.c:goto_level() performs docrt()/flush before the deferred
    // materialize pline and temperature-change messages; the following input
    // boundary does not immediately rerandomize the hallucinated new-level map.
    const tempMessage = temperatureChangeAfterLevelChange(prevTemperature, wasInHell);
    if (tempMessage?.line && hasPostArrivalPager) game._post_arrival_temp_message = tempMessage;
    else await showTemperatureChangeMessage(tempMessage);
    // C ref: do.c:goto_level() runs pickup(1) after the deferred
    // materialize pline; if arrival lands on visible floor objects, the
    // pending object listing forces the materialize line to block first.
    const arrivalObjects = (game.level?.objects || []).some((obj) =>
        obj.ox === game.u?.ux && obj.oy === game.u?.uy && obj.otyp !== GOLD_PIECE);
    if (!game._more && arrivalObjects) {
        game._arrival_floor_look_after_more = true;
        queue_more_prompt();
    }
    game.context.mv = 1;
}

async function applyPendingLevelChange() {
    const target = Math.min(30, Math.max(1, Number(game._levelchange_target || 0)));
    const queue = game._levelchange_message_queue = game._levelchange_message_queue || [];
    if (!target || ((game.u?.ulevel || 1) >= target && queue.length === 0)) {
        game._levelchange_target = 0;
        game._levelchange_message_queue = [];
        game.context.move = 0;
        game._more = false;
        return;
    }

    let line = '';
    while (true) {
        let msg;
        let preLevelGain = false;
        if (queue.length > 0) {
            msg = queue.shift();
        } else if ((game.u?.ulevel || 1) < target) {
            msg = 'You feel more experienced.';
            preLevelGain = true;
        } else {
            break;
        }

        const nextLine = appendLevelchangeTopline(line, msg);
        if (nextLine == null) {
            if (!preLevelGain) queue.unshift(msg);
            break;
        }

        line = nextLine;
        if (preLevelGain) {
            const oldLevel = game.u?.ulevel || 1;
            const newLevel = pluslvl();
            enqueueLevelchangePostMessages(oldLevel, newLevel);
        }
    }

    if (line) await pline(line);
    const hasPending = queue.length > 0 || (game.u?.ulevel || 1) < target;
    game._more = hasPending;
    if (!hasPending) {
        game._levelchange_target = 0;
        game._levelchange_message_queue = [];
    }
    game.context.move = 0;
}

// C ref: cmd.c rhack — main command dispatcher
function isCommandCountDigit(ch) {
    return ch >= '0' && ch <= '9';
}

function startOrContinueCommandCount(ch) {
    game._command_count_digits = `${game._command_count_digits || ''}${ch}`;
    game.context.move = 0;
}

function consumeCommandCountForCommand() {
    const digits = game._command_count_digits || '';
    game._command_count_digits = '';
    if (!digits) {
        game.context.commandCount = 0;
        game.context.multi = 0;
        return 0;
    }
    const count = Math.min(Number.parseInt(digits, 10) || 0, 2147483647);
    game.context.commandCount = count;
    game.context.multi = count > 0 ? count - 1 : 0;
    return count;
}

function queueSimpleTimedRepeatsForCount() {
    // C ref: cmd.c:parse()/set_occupation()/timed_occupation().  The
    // command's own time charge is handled by moveloop_core() after rhack()
    // returns; the simple repeat queue only models the subsequent timed
    // occupation turns.
    const remaining = Math.max(0, (game.context?.multi || 0) - 2);
    if (remaining > 0) game._simple_timed_repeats_remaining = remaining;
}

function refreshHeroPreviousPositionForStationaryCommand() {
    if (!game.u) return;
    game.u.ux0 = game.u.ux;
    game.u.uy0 = game.u.uy;
}

function clearDeferredPetPickupObjects() {
    for (const obj of game.level?.objects || []) {
        if (obj?._defer_pet_pickup) delete obj._defer_pet_pickup;
    }
}

export async function rhack(key) {
    if (key === 0) {
        // Read key from input
        await flush_screen(1);
        key = await nhgetch();
    }

    let ch = String.fromCharCode(key);

    if (game._awaiting_pray_force_more && game._more && (ch === ' ' || ch === '\r' || ch === '\n')) {
        clear_pending_message();
        game._awaiting_pray_force_more = false;
        game._awaiting_pray_force = true;
        await showPromptLine('Force the gods to be pleased? [yn] (n) ');
        game.context.move = 0;
        return;
    }

    if (game._awaiting_prayer_done_more && game._more && (ch === ' ' || ch === '\r' || ch === '\n')) {
        clear_pending_message();
        game._awaiting_prayer_done_more = false;
        await finishPrayerResult();
        game.context.move = 0;
        return;
    }

    if (game._apply_invalid_more && game._more) {
        if (ch === ' ' || ch === '\r' || ch === '\n' || ch === '\x1b') {
            game._apply_invalid_more = false;
            clear_pending_message();
            game._awaiting_apply_item = true;
            await showPromptLine(`What do you want to use or apply? [${applyLetters()} or ?*] `);
            game.context.move = 0;
            return;
        }
        game.context.move = 0;
        return;
    }

    if (game._terrain_view_done_more) {
        if (ch === ' ' || ch === '\r' || ch === '\n' || ch === '\x1b') {
            game._terrain_view_done_more = false;
            game._terrain_view_active = false;
            clear_pending_message();
            clearOverrideScreen();
        }
        game.context.move = 0;
        return;
    }

    if (game._terrain_view_intro_more) {
        game._override_prev = null;
        if (ch === ' ' || ch === '\r' || ch === '\n' || ch === '\x1b') {
            game._terrain_view_intro_more = false;
            game._more = false;
            game._more_dismissals_remaining = 0;
            clear_pending_message();
            if (!game._terrain_getpos_tip_seen) {
                game._terrain_getpos_tip_seen = true;
                game._travel_tip_active = 'terrain';
                await showTravelTipScreen(serialize_known_terrain_view_screen(''));
            } else {
                showTerrainBrowsePrompt();
            }
        }
        game.context.move = 0;
        return;
    }

    if (game._terrain_view_active) {
        if (ch === ' ' || ch === '\r' || ch === '\n' || ch === '\x1b') {
            const moreMessage = 'Done.--More--';
            showTerrainView(moreMessage, [Math.min(moreMessage.length, 79), 0]);
            game._pending_message = 'Done.';
            game._more = true;
            game._terrain_view_done_more = true;
            game._terrain_view_active = false;
        }
        game.context.move = 0;
        return;
    }

    if (game._awaiting_terrain_menu) {
        game._awaiting_terrain_menu = false;
        clearOverrideScreen();
        if (ch === 'a') {
            game._terrain_view_active = true;
            showTerrainView("Showing known terrain only...  (For instructions type a '?')");
        } else if (ch === ' ' || ch === '\r' || ch === '\n') {
            game._terrain_view_intro_more = true;
            const msg = 'Showing known terrain only...';
            showTerrainView(`${msg}--More--`, [msg.length + '--More--'.length, 0]);
            game._pending_message = msg;
            queue_more_prompt();
        }
        game.context.move = 0;
        return;
    }

    if (await handleQueuedMore(ch)) return;

    if (game._travel_tip_active) {
        if (ch === ' ' || ch === '\r' || ch === '\n' || ch === '\x1b') {
            const kind = game._travel_tip_active;
            game._travel_tip_active = false;
            clearOverrideScreen();
            if (kind === 'farlook') {
                await pline("(For instructions type a '?')");
                queue_more_prompt();
                game._farlook_prompt_after_instruction_more = true;
            } else if (kind === 'terrain') {
                showTerrainBrowsePrompt();
            } else {
                await showPromptLine(TRAVEL_CURSOR_PROMPT);
                setTravelMapCursor();
                game._awaiting_travel_cursor = false;
                game._awaiting_travel_prompt = true;
            }
        } else {
            setTravelTipCursor();
        }
        game.context.move = 0;
        return;
    }

    if (game._awaiting_lookat_menu) {
        clearOverrideScreen();
        game._awaiting_lookat_menu = false;
        if (ch === '/') {
            await pline('Please move the cursor to a monster, object or location.');
            queue_more_prompt();
            game._farlook_intro_after_more = true;
        } else if (ch === 'i') {
            await showInventoryMenu();
            game._look_inventory_lookup_active = true;
        } else if (ch === '?') {
            await showPromptLine('Specify what? (type the word)', { trailingInputSpace: true });
            game._awaiting_lookat_word = { text: '' };
        } else if (ch === 'm' || ch === 'M') {
            showLookMonsterList(ch === 'M');
        } else if (ch === 'o' || ch === 'O') {
            showLookObjectList(ch === 'O');
        } else if (ch === 't') {
            await pline('No traps seen or remembered nearby.');
        } else if (ch === 'T') {
            await pline('No traps seen or remembered.');
        } else if (ch === 'e' || ch === 'E') {
            showLookEngravingList(ch === 'E');
        } else if (ch === '\x1b' || ch === ' ') {
            clear_pending_message();
        } else {
            await pline('Never mind.');
        }
        game.context.move = 0;
        return;
    }

    if (game._awaiting_lookat_word) {
        const state = game._awaiting_lookat_word;
        const prompt = 'Specify what? (type the word)';
        if (ch === '\x1b') {
            game._awaiting_lookat_word = null;
            clear_pending_message();
            game.context.move = 0;
            return;
        }
        if (ch === '\r' || ch === '\n') {
            game._awaiting_lookat_word = null;
            clear_pending_message();
            const query = state.text.trim().replace(/\s+/g, ' ').toLowerCase();
            const lines = LOOKUP_DATA.get(query);
            if (lines) await showLookupDataOverlay(lines);
            else await pline("You don't have any information on those things.");
            game.context.move = 0;
            return;
        }
        if (ch === '\x7f' || ch === '\b') {
            state.text = state.text.slice(0, -1);
        } else if (ch >= ' ' && ch !== '\x7f') {
            state.text += ch;
        }
        await showPromptLine(`${prompt}${state.text ? ` ${state.text}` : ''}`, { trailingInputSpace: !state.text });
        game.context.move = 0;
        return;
    }

    if (game._awaiting_help_what_command) {
        // C ref: pager.c:dowhatdoes() -> dowhatdoes_core().
        game._awaiting_help_what_command = false;
        clear_pending_message();
        if (ch === '\x1b') {
            game.context.move = 0;
            return;
        }
        if (ch === 'i') await pline('i       show your inventory (#inventory).');
        else if (ch === '&' || ch === '?') {
            await showHelpDataFile('keyhelp');
        } else {
            const code = ch.charCodeAt(0) || 0;
            await pline(`No such command '${ch}', char code ${code} (0${code.toString(8).padStart(3, '0')} or 0x${code.toString(16).padStart(2, '0')}).`);
        }
        game.context.move = 0;
        return;
    }

    if (game._awaiting_farlook_more_info) {
        const state = game._awaiting_farlook_more_info;
        game._awaiting_farlook_more_info = null;
        clear_pending_message();
        if (ch === 'y' || ch === 'Y') {
            await pline('No detailed information available.');
            queue_more_prompt();
            game._farlook_cursor = { x: state.x, y: state.y };
        } else {
            game._awaiting_farlook_prompt = true;
            game._farlook_cursor = { x: state.x, y: state.y };
            await pline('Pick a monster, object or location.');
            setTravelMapCursorAt(state.x, state.y);
        }
        game.context.move = 0;
        return;
    }

    if (game._death_prompt_active) {
        if (ch === 'y' || ch === 'Y') {
            game._death_prompt_active = false;
            game._fatal_monster_attack_paused = false;
            game._resume_turn_tail_after_more = false;
            game._latched_status_uhp = null;
            game.program_state = game.program_state || {};
            game.program_state.gameover = true;
            game.context.move = 0;
            return;
        }
        if (ch === 'n' || ch === 'N' || ch === ' ' || ch === '\r' || ch === '\n') {
            game._death_prompt_active = false;
            const resumeTailOnly = !!game._resume_turn_tail_after_more;
            game._fatal_monster_attack_paused = false;
            game._prompt_cursor = null;
            if (game.u && typeof game.u.uhp === 'number')
                game.u.uhp = Math.max(1, game.u.uhpmax || game.u.uhp);
            game._latched_status_uhp = null;
            if (game._monster_turn_paused_for_more && !resumeTailOnly) {
                game._nomovemsg = 'You survived that attempt on your life.';
                await pline("OK, so you don't die.");
                game._monster_turn_paused_for_more = false;
                game._resume_monster_turn = true;
                game._savelife_resume_active = true;
                game.context.move = 1;
            } else {
                await pline("OK, so you don't die.  You survived that attempt on your life.");
                if (resumeTailOnly) {
                    game._monster_turn_paused_for_more = false;
                    game._savelife_resume_active = true;
                    game.context.move = 1;
                } else {
                    game.context.move = 0;
                }
            }
            return;
        }
        const msg = 'Die? [yn] (n)';
        await showPromptLine(msg);
        game._prompt_cursor = [msg.length + 1, 0];
        game.context.move = 0;
        return;
    }

    if (game._awaiting_quit_confirm) {
        clear_pending_message();
        game._awaiting_quit_confirm = false;
        if (ch === 'y' || ch === 'Y') {
            const prompt = 'Dump core? [ynq] (q)';
            await pline(prompt);
            game._prompt_cursor = [prompt.length + 1, 0];
            game._awaiting_dump_core = true;
        }
        game.context.move = 0;
        return;
    }

    if (game._awaiting_dump_core) {
        if (ch === 'y' || ch === 'Y' || ch === 'n' || ch === 'N'
            || ch === 'q' || ch === 'Q' || ch === '\x1b') {
            clear_pending_message();
            game._awaiting_dump_core = false;
            const screen = '\nSince you were in wizard mode, the score list will not be checked.';
            showOverride(screen, [0, 4]);
            game.program_state = game.program_state || {};
            game.program_state.gameover = true;
            game.context.move = 0;
            return;
        }
        const prompt = 'Dump core? [ynq] (q)';
        await pline(prompt);
        game._prompt_cursor = [prompt.length + 1, 0];
        game.context.move = 0;
        return;
    }

    if (game._awaiting_pray_confirm) {
        clear_pending_message();
        game._awaiting_pray_confirm = false;
        if (ch === 'y' || ch === 'Y') {
            await pline(`You begin praying to ${prayerGodName()}.`);
            game._more = true;
            game._awaiting_pray_force_more = !!(game.wizard || game.flags?.debug);
        }
        game.context.move = 0;
        return;
    }

    if (game._awaiting_pray_force) {
        clear_pending_message();
        game._awaiting_pray_force = false;
        if (ch === 'y' || ch === 'Y') {
            game.u.ublesscnt = 0;
            if ((game.u.ualign?.record ?? 0) <= 0) game.u.ualign.record = 1;
            game.u.ugangr = 0;
            if ((game.u.uluck ?? 0) < 0) game.u.uluck = 0;
            game.u.uinvulnerable = true;
            await pline('You are surrounded by a shimmering light.');
            game._more = true;
            game._prayer_turns_remaining = 2;
            game.context.move = 1;
        } else {
            game.context.move = 1;
        }
        return;
    }

    if (game._levelchange_target && game._more && (ch === ' ' || ch === '\r' || ch === '\n')) {
        clear_pending_message();
        await applyPendingLevelChange();
        return;
    }

    if (game._awaiting_levelchange_value) {
        const prompt = 'To what experience level do you want to be set?';
        if (ch >= '0' && ch <= '9') {
            game._levelchange_input = `${game._levelchange_input || ''}${ch}`;
            await showPromptLine(`${prompt} ${game._levelchange_input}`);
            game.context.move = 0;
            return;
        }
        if (ch === '\r' || ch === '\n') {
            const target = Number(game._levelchange_input || 0);
            clear_pending_message();
            game._awaiting_levelchange_value = false;
            game._levelchange_input = '';
            if (target > 0) {
                game._levelchange_target = target;
                game._levelchange_message_queue = [];
                await applyPendingLevelChange();
            } else {
                await pline('Never mind.');
                game.context.move = 0;
            }
            return;
        }
        game.context.move = 0;
        return;
    }

    if (game._awaiting_extended_command) {
        if (ch === '\r' || ch === '\n') {
            const typedExtCommand = game._extended_command_input || game._extended_command || '';
            const cmd = completeExtendedCommand(typedExtCommand);
            clear_pending_message();
            game._awaiting_extended_command = false;
            game._extended_command_input = '';
            game._extended_command = '';
            if (cmd === 'levelchange') {
                const prompt = 'To what experience level do you want to be set?';
                await showPromptLine(prompt);
                game._prompt_cursor = [prompt.length + 1, 0];
                game._awaiting_levelchange_value = true;
                game._levelchange_input = '';
            } else if (cmd === 'pray') {
                await showPromptLine('Are you sure you want to pray? [yn] (n) ');
                game._awaiting_pray_confirm = true;
                game.context.move = 0;
            } else if (cmd === 'quit') {
                // C ref: src/end.c:done2().
                const prompt = 'Really quit without saving? [yn] (n)';
                await pline(prompt);
                game._prompt_cursor = [prompt.length + 1, 0];
                game._awaiting_quit_confirm = true;
            } else if (cmd === 'wizintrinsic') {
                beginIntrinsicMenu();
                game._intrinsic_menu.count = '';
                game.context.move = 0;
            } else if (cmd === 'wizgenesis') {
                // C refs: src/cmd.c extended command table, src/wizcmds.c:wiz_genesis().
                const prompt = 'Create what kind of monster?';
                await pline(prompt);
                game._prompt_cursor = [prompt.length + 1, 0];
                game._awaiting_create_monster = true;
                game._create_monster_input = '';
            } else if (cmd === 'chat') {
                // C ref: sounds.c:dochat().
                await showPromptLine('Talk to whom? (in what direction) ');
                game._awaiting_chat_direction = true;
                game.context.move = 0;
            } else if (cmd === 'kick') {
                if (hasWoundedLegs()) {
                    await pline(woundedLegsKickMessage());
                    queue_more_prompt();
                    game.context.move = 0;
                } else {
                    await showPromptLine('In what direction? ');
                    game._awaiting_kick_direction = true;
                    game.context.move = 0;
                }
            } else if (cmd === 'loot') {
                await doLootCommand();
            } else if (cmd === 'force') {
                await doForceCommand();
            } else if (cmd === 'name') {
                showNameCommandMenu();
                game.context.move = 0;
            } else {
                // C ref: win/tty/getline.c:tty_get_ext_cmd().
                if (typedExtCommand) {
                    await pline(`#${typedExtCommand.slice(0, 60)}: unknown extended command.`);
                }
            }
            if (cmd !== 'force') game.context.move = 0;
            return;
        }
        if (ch === '\x1b') {
            clear_pending_message();
            game._awaiting_extended_command = false;
            game._extended_command_input = '';
            game._extended_command = '';
            game.context.move = 0;
            return;
        }
        if (ch === '\x7f' || ch === '\b') {
            const typed = (game._extended_command_input || '').slice(0, -1);
            game._extended_command_input = typed;
            game._extended_command = completeExtendedCommand(typed);
            await showExtendedCommandInput(typed);
            game.context.move = 0;
            return;
        }
        if (/^[A-Za-z]$/.test(ch)) {
            const typed = `${game._extended_command_input || ''}${ch}`.toLowerCase();
            game._extended_command_input = typed;
            game._extended_command = completeExtendedCommand(typed);
            await showExtendedCommandInput(typed);
            game.context.move = 0;
            return;
        }
        game.context.move = 0;
        return;
    }

    if (game._awaiting_loot_direction) {
        await handleLootDirection(ch);
        return;
    }

    if (game._awaiting_chat_direction) {
        game._awaiting_chat_direction = false;
        clear_pending_message();
        const dx = DIR_DX[ch] ?? 0;
        const dy = DIR_DY[ch] ?? 0;
        if (ch === '.') {
            await pline('Talking to yourself is a bad habit for a dungeoneer.');
        } else if (ch === '\x1b') {
            clear_pending_message();
        } else if (ch === '<' || ch === '>') {
            await pline(`They won't hear you ${ch === '<' ? 'up' : 'down'} there.`);
        } else if (dx || dy) {
            // C ref: sounds.c:dochat().  Chatting toward empty floor is
            // silent; only walls/secret doors produce a response.
            const tx = (game.u?.ux ?? 0) + dx;
            const ty = (game.u?.uy ?? 0) + dy;
            const loc = game.level?.at(tx, ty);
            if (loc && (IS_WALL(loc.typ) || loc.typ === SDOOR)) {
                await pline("It's like talking to a wall.");
            } else {
                const mon = mon_at(tx, ty);
                if (mon && mon.msleeping) {
                    await pline(`${monsterName(mon).replace(/^./, c => c.toUpperCase())} seems not to notice you.`);
                }
            }
        } else {
            clear_pending_message();
        }
        game.context.move = 0;
        return;
    }

    if (game._awaiting_travel_prompt) {
        if (ch === '>' || ch === '<') {
            const st = travelFeatureStair(ch === '<');
            if (st) {
                game._travel_cursor = { x: st.sx, y: st.sy };
                await describeTravelCursor();
            } else {
                await pline(`Can't find dungeon feature '${ch}'.`);
                const cursor = currentTravelCursor();
                setTravelMapCursorAt(cursor.x, cursor.y);
            }
        } else if (ch === '\r' || ch === '\n') {
            const cursor = currentTravelCursor();
            truncateGetposCursorToMap(cursor, 0, 8);
            await describeTravelCursor();
        } else if (ch === ' ') {
            await describeTravelCursor();
        } else if (ch === '?') {
            await showGetposHelpScreen('travel');
        } else if (isGetposMovementKey(ch)) {
            const cursor = currentTravelCursor();
            moveGetposCursor(cursor, ch);
            await describeTravelCursor();
        } else if (await handleGetposFeatureSearch(ch, currentTravelCursor(), describeTravelCursor)) {
            // handled by getpos feature search
        } else if (ch === '.' || ch === ',') {
            const cursor = currentTravelCursor();
            if (game.u?.ux === cursor.x && game.u?.uy === cursor.y) {
                game._awaiting_travel_prompt = false;
                game._travel_cursor = null;
                await pline('You are already here.');
                setTravelMapCursor();
                game.context.move = 0;
                return;
            }
            setTravelCachedTarget({ x: cursor.x, y: cursor.y });
            game._awaiting_travel_prompt = false;
            game._travel_cursor = null;
            const pendingBeforeTravel = game._pending_message || '';
            const clearGetposError = /^(?:Unknown direction:|Can't find dungeon feature )/.test(pendingBeforeTravel);
            if (clearGetposError) clear_pending_message();
            const startedTravel = await beginTravelRunToCachedTarget();
            if (clearGetposError && !startedTravel && pendingBeforeTravel) await pline(pendingBeforeTravel);
            game.context.move = startedTravel ? 1 : 0;
            return;
        } else if (ch === '\x1b') {
            game._awaiting_travel_prompt = false;
            game._travel_cursor = null;
            clear_pending_message();
        } else {
            await pline(`Unknown direction: '${getposKeyDisplay(ch)}' (use 'h', 'j', 'k', 'l' or '.').`);
            const cursor = currentTravelCursor();
            setTravelMapCursorAt(cursor.x, cursor.y);
        }
        game.context.move = 0;
        return;
    }

    if (game._awaiting_teleport_prompt) {
        if (isGetposMovementKey(ch)) {
            const cursor = currentTeleportCursor();
            moveGetposCursor(cursor, ch);
            await describeTeleportCursor();
        } else if (ch === ' ') {
            await describeTeleportCursor();
        } else if (ch === '?') {
            await showGetposHelpScreen('teleport');
        } else if (await handleGetposFeatureSearch(ch, currentTeleportCursor(), describeTeleportCursor)) {
            // handled by getpos feature search
        } else if (ch === '.' || ch === ',') {
            const cursor = currentTeleportCursor();
            game._awaiting_teleport_prompt = false;
            game._teleport_cursor = null;
            if (teleokBasic(cursor.x, cursor.y, false)) {
                await teledsBasic(cursor.x, cursor.y);
            } else {
                await pline('Sorry...');
                await safeTeledsBasic();
            }
            game.context.move = 1;
            return;
        } else if (ch === '\x1b') {
            game._awaiting_teleport_prompt = false;
            game._teleport_cursor = null;
            clear_pending_message();
        } else {
            await pline(`Unknown direction: '${getposKeyDisplay(ch)}' (use 'h', 'j', 'k', 'l' or '.').`);
            const cursor = currentTeleportCursor();
            setTravelMapCursorAt(cursor.x, cursor.y);
        }
        game.context.move = 0;
        return;
    }

    if (game._awaiting_farlook_prompt) {
        if (isGetposMovementKey(ch)) {
            const cursor = currentFarlookCursor();
            moveGetposCursor(cursor, ch);
            await describeFarlookCursor();
        } else if (ch === ' ') {
            await describeFarlookCursor();
        } else if (ch === '?') {
            await showGetposHelpScreen('farlook');
        } else if (await handleGetposFeatureSearch(ch, currentFarlookCursor(), describeFarlookCursor)) {
            // handled by getpos feature search
        } else if (ch === '.' || ch === ',' || ch === ';' || ch === ':') {
            const cursor = currentFarlookCursor();
            game._awaiting_farlook_prompt = false;
            game._farlook_cursor = null;
            game._prompt_cursor = null;
            const moreInfoTopic = farlookMoreInfoTopic(cursor.x, cursor.y);
            const continuationRow = moreInfoTopic ? '' : farlookContinuation(cursor.x, cursor.y);
            game._message_continuation_row = continuationRow;
            if (moreInfoTopic) {
                game._farlook_more_info_after_more = { topic: moreInfoTopic, x: cursor.x, y: cursor.y };
                queue_more_prompt();
            } else if (continuationRow || farlookNeedsPromptAfterFullDescription(cursor.x, cursor.y)) {
                // C refs: pager.c:do_look(), getpos.c:getpos().  After a
                // blocking farlook explanation, do_look() loops back into
                // getpos() at the same cursor position.
                game._farlook_resume_after_more = { x: cursor.x, y: cursor.y };
                if (continuationRow) game._more_next_message_row = true;
                queue_more_prompt();
            }
            await pline(farlookFullDescription(cursor.x, cursor.y));
        } else if (ch === '\x1b') {
            game._awaiting_farlook_prompt = false;
            game._farlook_cursor = null;
            clear_pending_message();
        } else {
            await pline(`Unknown direction: '${getposKeyDisplay(ch)}' (use 'h', 'j', 'k', 'l' or '.').`);
            const cursor = currentFarlookCursor();
            setTravelMapCursorAt(cursor.x, cursor.y);
        }
        game.context.move = 0;
        return;
    }

    if (game._awaiting_travel_cursor) {
        if (ch === ' ') {
            await pline(heroGetposDescription());
            setTravelMapCursor();
        } else if (ch === '.') {
            game._awaiting_travel_cursor = false;
            await pline('You are already here.');
            setTravelMapCursor();
        } else if (ch === '\x1b') {
            game._awaiting_travel_cursor = false;
            clear_pending_message();
        } else {
            setTravelMapCursor();
        }
        game.context.move = 0;
        return;
    }

    if (game._travel_path_failed_linger) {
        if (ch === ' ') {
            game.context.move = 0;
            return;
        }
        if (ch === '.') {
            game._travel_path_failed_linger = false;
            game.context.move = await beginTravelRunToCachedTarget() ? 1 : 0;
            return;
        }
        game._travel_path_failed_linger = false;
    }

    if (game._intrinsic_menu) {
        const menu = game._intrinsic_menu;
        game._override_prev = null;
        if (ch >= '0' && ch <= '9') {
            menu.count = `${menu.count || ''}${ch}`;
            renderIntrinsicMenu(menu);
            game.context.move = 0;
            return;
        }
        if (ch === '\x1b') {
            game._intrinsic_menu = null;
            game._override_screen = null;
            game._override_serialized_screen = null;
            game._override_cursor = null;
            await docrt();
            game.context.move = 0;
            return;
        }
        if (ch === ' ' || ch === '>' || ch === '<' || ch === '^' || ch === '|') {
            if (ch === ' ' && menu.page < menu.pages.length - 1) {
                menu.page++;
                menu.count = '';
                renderIntrinsicMenu(menu);
                game.context.move = 0;
                return;
            }
            if (ch === '>' && menu.page < menu.pages.length - 1) {
                menu.page++;
                menu.count = '';
                renderIntrinsicMenu(menu);
                game.context.move = 0;
                return;
            }
            if (ch === '<' && menu.page > 0) {
                menu.page--;
                menu.count = '';
                renderIntrinsicMenu(menu);
                game.context.move = 0;
                return;
            }
            if (ch === '^' && menu.page > 0) {
                menu.page = 0;
                menu.count = '';
                renderIntrinsicMenu(menu);
                game.context.move = 0;
                return;
            }
            if (ch === '|' && menu.page < menu.pages.length - 1) {
                menu.page = menu.pages.length - 1;
                menu.count = '';
                renderIntrinsicMenu(menu);
                game.context.move = 0;
                return;
            }
            if (ch !== ' ') {
                game.context.move = 0;
                return;
            }
            await commitIntrinsicMenuSelection(menu);
            game.context.move = 0;
            return;
        }
        if (ch === '\r' || ch === '\n') {
            await commitIntrinsicMenuSelection(menu);
            game.context.move = 0;
            return;
        }
        if (/^[A-Za-z]$/.test(ch)) {
            const row = intrinsicRowForSelector(menu, ch);
            if (row) {
                const count = menu.count ? Number.parseInt(menu.count, 10) : 0;
                updateIntrinsicMenuSelection(menu, row, count);
                menu.count = '';
                renderIntrinsicMenu(menu);
            }
            game.context.move = 0;
            return;
        }
        game.context.move = 0;
        return;
    }

    if (game._awaiting_level_teleport) {
        const prompt = 'To what level do you want to teleport? ';
        if (game._level_teleport_help_pending) {
            if (ch === '\r' || ch === '\n') {
                clear_pending_message();
                game._awaiting_level_teleport = false;
                game._level_teleport_help_pending = false;
                game._level_teleport_input = '';
                const menu = buildLevelTeleportMenu();
                game._level_teleport_menu_screen = menu.screen;
                game._level_teleport_menu_choices = menu.choices;
                showOverride(menu.screen, [9, 23]);
            }
            game.context.move = 0;
            return;
        }
        if (ch === '?') {
            game._level_teleport_input = '?';
            game._level_teleport_help_pending = true;
            await showPromptLine(`${prompt}?`);
            game.context.move = 0;
            return;
        }
        if (ch >= '0' && ch <= '9') {
            game._level_teleport_input = `${game._level_teleport_input || ''}${ch}`;
            await showPromptLine(`${prompt}${game._level_teleport_input}`);
            game.context.move = 0;
            return;
        }
        const target = Number(game._level_teleport_input || 0);
        clear_pending_message();
        game._awaiting_level_teleport = false;
        game._level_teleport_input = '';
        if ((ch === '\r' || ch === '\n') && target > 0)
            game._pending_level_teleport_target = target;
        game.context.move = 0;
        return;
    }

    if (game._awaiting_wish) {
        const prompt = 'For what do you wish? ';
        if (ch === '\r' || ch === '\n') {
            const wish = game._wish_input || '';
            clear_pending_message();
            game._awaiting_wish = false;
            game._wish_input = '';
            const obj = make_wish_object(wish);
            if (obj) await pline(`${inventoryListing(obj, { includeCharges: false })}.`);
            game.context.move = 0;
            return;
        }
        if (ch === '\x1b') {
            clear_pending_message();
            game._awaiting_wish = false;
            game._wish_input = '';
            game.context.move = 0;
            return;
        }
        game._wish_input = `${game._wish_input || ''}${ch}`;
        await showPromptLine(`${prompt}${game._wish_input}`);
        game.context.move = 0;
        return;
    }

    if (game._awaiting_create_monster) {
        const prompt = 'Create what kind of monster?';
        if (ch === '\r' || ch === '\n') {
            const input = game._create_monster_input || '';
            clear_pending_message();
            game._awaiting_create_monster = false;
            game._create_monster_input = '';
            const ptr = monster_by_user_name(input);
            if (ptr) {
                const mon = await makemon(ptr, game.u?.ux || 0, game.u?.uy || 0, 0);
                const name = monsterDisplayName(ptr);
                if (mon) {
                    newsym(mon.mx, mon.my);
                    await pline(`${sentenceStart(indefiniteArticle(name))} ${name} appears next to you.`);
                }
            }
            else await pline("I've never heard of such monsters.");
            game.context.move = 0;
            return;
        }
        if (ch === '\x1b') {
            clear_pending_message();
            game._awaiting_create_monster = false;
            game._create_monster_input = '';
            game.context.move = 0;
            return;
        }
        game._create_monster_input = `${game._create_monster_input || ''}${ch}`;
        await showPromptLine(`${prompt}${game._create_monster_input ? ` ${game._create_monster_input}` : ''}`);
        game.context.move = 0;
        return;
    }

    if (game._awaiting_potion_call_name) {
        const state = game._awaiting_potion_call_name;
        const prompt = `Call a ${state.appearance} potion:`;
        if (ch === '\r' || ch === '\n') {
            clear_pending_message();
            game._awaiting_potion_call_name = null;
            game.context.move = 1;
            return;
        }
        if (ch === '\x7f' || ch === '\b') {
            state.text = state.text.slice(0, -1);
        } else if (ch !== '\x1b') {
            state.text = `${state.text}${ch}`;
        }
        await showPromptLine(`${prompt}${state.text ? ` ${state.text}` : ''}`, { trailingInputSpace: !state.text });
        game.context.move = 0;
        return;
    }

    if (game._awaiting_scroll_call_name) {
        const state = game._awaiting_scroll_call_name;
        const prompt = `Call a ${state.appearance}:`;
        if (ch === '\r' || ch === '\n' || ch === '\x1b') {
            const name = (state.text || '').trim();
            if (name && ch !== '\x1b') {
                markObjectEncountered(state.otyp);
                if (!(game.calledObjects instanceof Map)) game.calledObjects = new Map();
                game.calledObjects.set(state.otyp, name);
            }
            clear_pending_message();
            game._awaiting_scroll_call_name = null;
            game._monster_turn_paused_for_more = false;
            game._pre_turn_more_waiting = false;
            game._resume_monster_turn = true;
            game.context.move = 1;
            return;
        }
        if (ch === '\x7f' || ch === '\b') {
            state.text = state.text.slice(0, -1);
        } else {
            state.text = `${state.text || ''}${ch}`;
        }
        await showPromptLine(`${prompt}${state.text ? ` ${state.text}` : ''}`, { trailingInputSpace: !state.text });
        game.context.move = 0;
        return;
    }

    if (game._awaiting_engrave_text) {
        const state = game._awaiting_engrave_text;
        const prompt = 'What do you want to write in the dust here?';
        if (ch === '\r' || ch === '\n') {
            const text = state.text || '';
            clear_pending_message();
            game._awaiting_engrave_text = null;
            if (!text.trim()) {
                game.context.move = 0;
                await pline('Never mind.');
                return;
            }
            // C refs: engrave.c:doengrave(), engrave.c:make_engr_at().
            for (const c of text) if (c !== ' ') rn2(25);
            if (text === 'Elbereth') exercise(A_WIS, true);
            if (game.level) {
                game.level.engravings = (game.level.engravings || [])
                    .filter((ep) => ep.x !== game.u?.ux || ep.y !== game.u?.uy);
                game.level.engravings.unshift({
                    x: game.u?.ux,
                    y: game.u?.uy,
                    text,
                    pristine: text,
                    epoch: game.moves || 0,
                    type: C.DUST,
                    guardobjects: false,
                    eread: true,
                    erevealed: true,
                });
            }
            game.context.move = 1;
            return;
        }
        if (ch === '\x1b') {
            clear_pending_message();
            game._awaiting_engrave_text = null;
            game.context.move = 0;
            await pline('Never mind.');
            return;
        }
        if (ch === '\x7f' || ch === '\b') {
            state.text = state.text.slice(0, -1);
        } else {
            state.text = `${state.text || ''}${ch}`;
        }
        await showPromptLine(`${prompt}${state.text ? ` ${state.text}` : ''}`, { trailingInputSpace: !state.text });
        game.context.move = 0;
        return;
    }

    if (game._awaiting_drink_item) {
        clear_pending_message();
        if (ch === '?' || ch === '*') {
            await showPotionMenu();
            game.context.move = 0;
            return;
        }
        game._awaiting_drink_item = false;
        if (ch === ' ' || ch === '\x1b') {
            game.context.move = 0;
            await pline('Never mind.');
            return;
        }
        const idx = inventoryIndexForLetter(ch);
        const obj = idx >= 0 ? game.inventory?.[idx] : null;
        await drinkPotion(obj, idx);
        return;
    }

    if (game._awaiting_sink_drink_confirm) {
        clear_pending_message();
        game._awaiting_sink_drink_confirm = false;
        if (ch === 'y' || ch === 'Y') await drinkSink();
        else {
            game.context.move = 0;
            await showDrinkInventoryPrompt();
        }
        return;
    }

    if (game._awaiting_wear_item) {
        clear_pending_message();
        game._awaiting_wear_item = false;
        const idx = inventoryIndexForLetter(ch);
        const obj = idx >= 0 ? game.inventory?.[idx] : null;
        if (obj && (obj.oclass === ARMOR_CLASS || obj.oclass === AMULET_CLASS || obj.oclass === RING_CLASS)) {
            await start_wearing_object(obj);
        } else if (ch === 'b') {
            game.context.move = 0;
            await pline('You are already wearing that!');
        } else if (ch === '\x1b') {
            game.context.move = 0;
            await pline('Never mind.');
        } else {
            game.context.move = 0;
            await pline("You can't wear that.");
        }
        return;
    }

    if (game._awaiting_wield_item) {
        clear_pending_message();
        game._awaiting_wield_item = false;
        if (ch === '-') {
            const old = heroWieldedWeapon();
            setHeroWieldedWeapon(null);
            game.context.move = old ? 1 : 0;
            await pline(old ? 'You are empty handed.' : 'You are already empty handed.');
            return;
        }
        if (ch === '\x1b' || ch === ' ') {
            game.context.move = 0;
            await pline('Never mind.');
            return;
        }
        const idx = inventoryIndexForLetter(ch);
        const obj = idx >= 0 ? game.inventory?.[idx] : null;
        if (!obj || obj.oclass !== WEAPON_CLASS) {
            game.context.move = 0;
            await pline("You don't have that object.");
            return;
        }
        if (obj === heroWieldedWeapon()) {
            game.context.move = 0;
            await pline('You are already wielding that!');
            return;
        }
        setHeroWieldedWeapon(obj);
        await pline(`${inventoryListing(obj, { includeWorn: true })}.`);
        game.context.move = 1;
        return;
    }

    if (game._awaiting_quiver_confirm) {
        clear_pending_message();
        const obj = game._awaiting_quiver_confirm;
        game._awaiting_quiver_confirm = null;
        if (ch !== 'y') {
            game.context.move = 0;
            await pline('Never mind.');
            return;
        }
        obj.alternate = false;
        setQuiveredObject(obj);
        game.context.move = 0;
        await pline(`${inventoryListing(obj, { includeWorn: true })}.`);
        return;
    }

    if (game._awaiting_quiver_item) {
        clear_pending_message();
        game._awaiting_quiver_item = false;
        if (ch === ' ' || ch === '\x1b') {
            game.context.move = 0;
            await pline('Never mind.');
            return;
        }
        if (ch === '-') {
            setQuiveredObject(null);
            game.context.move = 0;
            await pline('You now have no ammunition readied.');
            return;
        }
        const idx = inventoryIndexForLetter(ch);
        const obj = idx >= 0 ? game.inventory?.[idx] : null;
        if (!obj || obj.oclass !== WEAPON_CLASS) {
            game.context.move = 0;
            await pline("You don't have that object.");
            return;
        }
        if (obj.quivered) {
            game.context.move = 0;
            await pline('That ammunition is already readied!');
            return;
        }
        if (obj.alternate) {
            game._awaiting_quiver_confirm = obj;
            game.context.move = 0;
            await showPromptLine('That is your alternate weapon.  Ready it instead? [ynq] (q)', { trailingInputSpace: true });
            return;
        }
        setQuiveredObject(obj);
        game.context.move = 0;
        await pline(`${inventoryListing(obj, { includeWorn: true })}.`);
        return;
    }

    if (game._awaiting_drop_item) {
        const promptLine = game._pending_message || '';
        clear_pending_message();
        game._awaiting_drop_item = false;
        const idx = inventoryIndexForLetter(ch);
        const obj = idx >= 0 ? game.inventory?.[idx] : null;
        if (!obj) {
            game.context.move = 0;
            await pline('Never mind.');
            return;
        }
        game.inventory.splice(idx, 1);
        place_object(obj, game.u.ux, game.u.uy);
        if (game.flags?.verbose === false) {
            game._pending_message = promptLine;
            game._prompt_cursor = null;
            game.context.move = 1;
            return;
        }
        await pline(`You drop ${dropObjectName(obj)}.`);
        game.context.move = 1;
        return;
    }

    if (game._awaiting_puton_item) {
        clear_pending_message();
        game._awaiting_puton_item = false;
        const idx = inventoryIndexForLetter(ch);
        const obj = idx >= 0 ? game.inventory?.[idx] : null;
        if (!is_puton_candidate(obj)) {
            game.context.move = 0;
            await pline('Never mind.');
            return;
        }
        await start_wearing_object(obj);
        return;
    }

    if (game._awaiting_read_item) {
        clear_pending_message();
        if (ch === ' ' || ch === '\x1b') {
            game._awaiting_read_item = false;
            game.context.move = 0;
            await pline('Never mind.');
            return;
        }
        const idx = inventoryIndexForLetter(ch);
        const obj = idx >= 0 ? game.inventory?.[idx] : null;
        if (!obj) {
            game.context.move = 0;
            game._resume_read_prompt_after_more = true;
            await pline("You don't have that object.");
            queue_more_prompt();
            return;
        }
        game._awaiting_read_item = false;
        if (obj.oclass !== SCROLL_CLASS && obj.oclass !== SPBOOK_CLASS) {
            game.context.move = 0;
            await pline('That is a silly thing to read.');
            return;
        }
        if (obj.otyp === SCR_REMOVE_CURSE) {
            await readScrollOfRemoveCurse(obj, idx);
            return;
        }
        if (obj.otyp === SCR_ENCHANT_WEAPON) {
            await readScrollOfEnchantWeapon(obj, idx);
            return;
        }
        if (obj.otyp === SCR_LIGHT) {
            await readScrollOfLight(obj, idx);
            return;
        }
        if (obj.otyp === SCR_MAGIC_MAPPING) {
            await readScrollOfMagicMapping(obj);
            return;
        }
        game.context.move = 0;
        return;
    }

    if (game._awaiting_throw_item) {
        clear_pending_message();
        game._awaiting_throw_item = false;
        if (ch === ' ' || ch === '\x1b') {
            game.context.move = 0;
            await pline('Never mind.');
            return;
        }
        if (ch === '$') {
            game._awaiting_throw_direction = { otyp: GOLD_PIECE, oclass: COIN_CLASS, quan: game._goldCount || 0 };
            game.context.move = 0;
            await showPromptLine('In what direction? ');
            return;
        }
        const idx = inventoryIndexForLetter(ch);
        const obj = idx >= 0 ? game.inventory?.[idx] : null;
        if (!obj) {
            game.context.move = 0;
            game._resume_throw_prompt_after_more = true;
            await pline("You don't have that object.");
            queue_more_prompt();
            return;
        }
        if (obj.oclass !== WEAPON_CLASS) {
            game.context.move = 0;
            await pline('Never mind.');
            return;
        }
        game._awaiting_throw_direction = obj;
        game.context.move = 0;
        await showPromptLine('In what direction? ');
        return;
    }

    if (game._awaiting_ring_finger) {
        clear_pending_message();
        const obj = game._awaiting_ring_finger;
        game._awaiting_ring_finger = null;
        if (ch !== 'r' && ch !== 'R' && ch !== 'l' && ch !== 'L') {
            game.context.move = 0;
            await pline('Never mind.');
            return;
        }
        obj.wornSide = (ch === 'r' || ch === 'R') ? 'right' : 'left';
        await pline(`${inventoryListing(obj)} (on ${obj.wornSide} hand).`);
        game.context.move = 1;
        return;
    }

    if (game._awaiting_zap_item) {
        if (ch === '?' || ch === '*') {
            clear_pending_message();
            await showInventoryClassMenu(WAND_CLASS);
            game._awaiting_zap_item = true;
            game.context.move = 0;
            return;
        }
        clear_pending_message();
        game._awaiting_zap_item = false;
        clearOverrideScreen();
        const idx = inventoryIndexForLetter(ch);
        const obj = idx >= 0 ? game.inventory?.[idx] : null;
        if (!obj || obj.oclass !== WAND_CLASS) {
            game.context.move = 0;
            await pline('Never mind.');
            return;
        }
        if (!await zappableWand(obj)) {
            game.context.move = 1;
            await pline('Nothing happens.');
            return;
        }
        if (await maybeBackfireWand(obj)) return;
        if (obj.otyp === WAN_SECRET_DOOR_DETECTION) {
            // C ref: zap.c:zapnodir() -> detect.c:findit().
            exercise(A_WIS, true);
            obj.knownName = true;
            await pline("You don't find anything.");
            game.context.move = 1;
            return;
        }
        game._awaiting_zap_direction = obj;
        game.context.move = 0;
        await showPromptLine('In what direction? ');
        return;
    }

    if (game._awaiting_throw_direction) {
        clear_pending_message();
        const throwObj = game._awaiting_throw_direction;
        game._awaiting_throw_direction = null;
        if (!'hykulnjb<>.'.includes(ch)) {
            game.context.move = 0;
            if (game.iflags?.cmdassist !== false) {
                game._direction_help_screen = INVALID_DIRECTION_HELP_SCREEN;
                game._direction_help_after_more_message = '';
                showSerializedOverride(INVALID_DIRECTION_HELP_SCREEN, [8, 23]);
                queue_more_prompt();
            } else {
                await pline('What a strange direction!');
            }
            return;
        }
        if (ch === '<' || ch === '>' || ch === '.') {
            game.context.move = 0;
            await pline('You cannot throw an object at yourself.');
            return;
        }
        throwInventoryObject(throwObj, ch);
        game.context.move = 1;
        return;
    }

    if (game._awaiting_close_direction || game._awaiting_open_direction) {
        clear_pending_message();
        const opening = !!game._awaiting_open_direction;
        game._awaiting_close_direction = false;
        game._awaiting_open_direction = false;
        if (!'hykulnjb<>.'.includes(ch)) {
            game.context.move = 0;
            if (game.iflags?.cmdassist !== false) {
                game._direction_help_screen = INVALID_DIRECTION_HELP_SCREEN;
                game._direction_help_after_more_message = opening ? 'Never mind.' : '';
                showSerializedOverride(INVALID_DIRECTION_HELP_SCREEN, [8, 23]);
                queue_more_prompt();
            } else {
                await pline('What a strange direction!');
            }
            return;
        }
        const x = (game.u?.ux ?? 0) + (DIR_DX[ch] || 0);
        const y = (game.u?.uy ?? 0) + (DIR_DY[ch] || 0);
        const loc = game.level?.at(x, y);
        if (opening) {
            game.context.move = 0;
            if (!loc || !C.IS_DOOR(loc.typ)) await pline('You see no door there.');
            else await pline('This door is already open.');
            return;
        }
        if (!loc || !C.IS_DOOR(loc.typ)) {
            game.context.move = 0;
            await pline('You see no door there.');
            return;
        }
        if (loc.doormask === D_NODOOR) {
            game.context.move = 0;
            await pline('This doorway has no door.');
            return;
        }
        if (loc.doormask === C.D_BROKEN) {
            game.context.move = 0;
            await pline('This door is broken.');
            return;
        }
        if (loc.doormask & (D_CLOSED | D_LOCKED)) {
            game.context.move = 0;
            await pline('This door is already closed.');
            return;
        }
        if (loc.doormask === C.D_ISOPEN) {
            if (rn2(25) < 10) {
                loc.doormask = D_CLOSED;
                newsym(x, y);
                await pline('The door closes.');
            } else {
                await pline('The door resists!');
            }
            game.context.move = 1;
            return;
        }
        game.context.move = 0;
        await pline('You see no door there.');
        return;
    }

    if (game._awaiting_kick_direction) {
        game._awaiting_kick_direction = false;
        clear_pending_message();
        if (!'hykulnjb<>.'.includes(ch)) {
            game.context.move = 0;
            if (game.iflags?.cmdassist !== false) {
                game._direction_help_screen = INVALID_DIRECTION_HELP_SCREEN;
                game._direction_help_after_more_message = '';
                showSerializedOverride(INVALID_DIRECTION_HELP_SCREEN, [8, 23]);
                queue_more_prompt();
            } else {
                await pline('What a strange direction!');
            }
            return;
        }
        await kickDirection(ch);
        return;
    }

    if (game._awaiting_engrave_item) {
        clear_pending_message();
        if (ch === ' ' || ch === '\x1b') {
            game._awaiting_engrave_item = false;
            game.context.move = 0;
            await pline('Never mind.');
            return;
        }
        if (ch === '-') {
            // C ref: engrave.c:doengrave().  Fingertip writing uses dust and
            // prompts for text after the initial message's More prompt.
            game._awaiting_engrave_item = false;
            game._resume_engrave_text_after_more = true;
            game.context.move = 0;
            await pline('You write in the dust with your fingertip.');
            queue_more_prompt();
            return;
        }
        const idx = inventoryIndexForLetter(ch);
        const obj = idx >= 0 ? game.inventory?.[idx] : null;
        if (!obj) {
            game.context.move = 0;
            game._resume_engrave_prompt_after_more = true;
            await pline("You don't have that object.");
            queue_more_prompt();
            return;
        }
        game._awaiting_engrave_item = false;
        game.context.move = 0;
        await pline("You can't engrave with that!");
        return;
    }

    if (game._awaiting_zap_direction) {
        clear_pending_message();
        const obj = game._awaiting_zap_direction;
        game._awaiting_zap_direction = null;
        if (!'hykulnjb<>.'.includes(ch)) {
            game.context.move = 1;
            if (!game.u?.ublind && !game.u?.uprops?.blind) {
                await pline(`${sentenceStart(`the ${baseObjectName(obj)}`)} glows and fades.`);
            }
            return;
        }
        exercise(A_WIS, true);
        if (obj.otyp === WAN_DIGGING) {
            obj.knownName = true;
            obj.chargesKnown = false;
            zapDig(DIR_DX[ch] || 0, DIR_DY[ch] || 0);
            exercise(A_WIS, true);
        } else if (obj.otyp === WAN_FIRE) {
            obj.knownName = true;
            await zapFireRayAtHero(DIR_DX[ch] || 0, DIR_DY[ch] || 0);
        } else if (obj.otyp === WAN_SLEEP) {
            obj.knownName = true;
            const dx = DIR_DX[ch] || 0;
            const dy = DIR_DY[ch] || 0;
            if (sleepRayHitsHeroAfterBounce(dx, dy)) {
                drawRayBeam(dx, dy, 12);
                await pline('The sleep ray bounces!  The sleep ray hits you!');
                game._sleep_wand_hit_nd = 6;
                if (wornReflectionShield()) {
                    game._sleep_wand_reflect_pending = true;
                    game._sleep_wand_reflect_dx = dx;
                    game._sleep_wand_reflect_dy = dy;
                } else {
                    game._sleep_wand_sleep_pending = true;
                }
                queue_more_prompt();
            }
        } else if (obj.otyp === WAN_POLYMORPH) {
            await zapPolymorphObjects(obj, DIR_DX[ch] || 0, DIR_DY[ch] || 0);
        }
        // C ref: topl.c:more() can block inside zap.c:zhitu() before the
        // command returns to allmain.c for turn-tail monster movement.
        game.context.move = (game._fire_wand_side_effect_pending
            || game._sleep_wand_reflect_pending
            || game._sleep_wand_sleep_pending) ? 0 : 1;
        return;
    }

    if (game._awaiting_apply_item) {
        clear_pending_message();
        game._awaiting_apply_item = false;
        if (ch === '\x1b' || ch === ' ' || ch === '\r' || ch === '\n') {
            game.context.move = 0;
            await pline('Never mind.');
            return;
        }
        const idx = inventoryIndexForLetter(ch);
        const obj = idx >= 0 ? game.inventory?.[idx] : null;
        if (!obj) {
            game.context.move = 0;
            game._awaiting_apply_item = true;
            game._apply_invalid_more = true;
            await pline("You don't have that object.");
            queue_more_prompt();
            return;
        }
        if (obj.oclass !== TOOL_CLASS) {
            game.context.move = 0;
            await pline("Sorry, I don't know how to use that.");
            return;
        }
        if (obj.otyp === EXPENSIVE_CAMERA || obj.otyp === STETHOSCOPE
            || obj.otyp === LOCK_PICK || obj.otyp === CREDIT_CARD) {
            game._awaiting_apply_direction = obj;
            game.context.move = 0;
            await showPromptLine('In what direction? ');
            return;
        }
        if (obj.otyp === MAGIC_MARKER) {
            game._awaiting_write_on_item = obj;
            game.context.move = 0;
            await showPromptLine('What do you want to write on? [*] ');
            return;
        }
        if (obj.otyp === LEATHER_DRUM) {
            await applyLeatherDrum();
            return;
        }
        game.context.move = 0;
        await pline('Nothing happens.');
        return;
    }

    if (game._awaiting_write_on_item) {
        clear_pending_message();
        const marker = game._awaiting_write_on_item;
        const idx = inventoryIndexForLetter(ch);
        const obj = idx >= 0 ? game.inventory?.[idx] : null;
        if (!obj) {
            game.context.move = 0;
            game._awaiting_write_on_item = marker;
            game._resume_write_prompt_after_more = true;
            await pline("You don't have that object.");
            queue_more_prompt();
            return;
        }
        game._awaiting_write_on_item = null;
        game.context.move = 0;
        await pline('That is a silly thing to write on.');
        return;
    }

    if (game._awaiting_apply_direction) {
        clear_pending_message();
        const obj = game._awaiting_apply_direction;
        game._awaiting_apply_direction = null;
        if (!'hykulnjb<>.'.includes(ch)) {
            game.context.move = 0;
            await pline('Never mind.');
            return;
        }
        if (obj.otyp === STETHOSCOPE) {
            const seq = game.moves ?? 0;
            game.context.move = game._stethoscope_seq === seq ? 1 : 0;
            game._stethoscope_seq = seq;
            if (ch === '.') await pline(stethoscopeSelfStatusLine());
            else {
                const rx = (game.u?.ux ?? 0) + (DIR_DX[ch] || 0);
                const ry = (game.u?.uy ?? 0) + (DIR_DY[ch] || 0);
                const mon = (game.level?.monsters || []).find(m => m.mx === rx && m.my === ry);
                if (mon?.m_ap_type === C.M_AP_OBJECT) {
                    const what = objectAppearanceName(mon.mappearance);
                    mon.m_ap_type = C.M_AP_NOTHING;
                    mon.mappearance = 0;
                    newsym(mon.mx, mon.my);
                    await pline(`That ${what} is really a ${monsterInstanceDisplayName(mon)}.`);
                    game._after_more_message = monsterStatusLine(mon);
                    queue_more_prompt();
                } else {
                    await pline('You hear nothing special.');
                }
            }
            return;
        }
        if (obj.otyp === LOCK_PICK || obj.otyp === CREDIT_CARD) {
            // C ref: lock.c:pick_lock().  Learning that an adjacent square is
            // not a door still consumes the apply-key/lockpick turn.
            const rx = (game.u?.ux ?? 0) + (DIR_DX[ch] || 0);
            const ry = (game.u?.uy ?? 0) + (DIR_DY[ch] || 0);
            const loc = game.level?.at(rx, ry);
            game.context.move = 1;
            if (!loc || !C.IS_DOOR(loc.typ)) await pline('You see no door there.');
            else if (loc.doormask === D_NODOOR) await pline('This doorway has no door.');
            else if (loc.doormask & C.D_ISOPEN) await pline('You cannot lock an open door.');
            else await pline('This lock is not implemented yet.');
            return;
        }
        if (typeof obj.spe === 'number' && obj.spe > 0) obj.spe--;
        game.context.move = 1;
        return;
    }

    // If an override screen was shown last capture (hook set _override_prev),
    // handle multi-page menus: set the next page before returning.
    if (game._override_prev) {
        const prev = game._override_prev;
        game._override_prev = null;
        const tutorialOverride = prev === game._tutorial_prompt_screen
            || (typeof prev === 'string' && prev.includes('Do you want a tutorial?'));
        if (tutorialOverride) {
            if (ch === 'n' || ch === '\x1b') {
                clear_pending_message();
                game._tutorial_answered = true;
                game.context.move = 0;
                return;
            }
            if (ch === 'y') {
                // Tutorial dungeon transfer is not implemented yet; record
                // the answer so regular play continues without corrupting RNG.
                clear_pending_message();
                game._tutorial_answered = true;
                game.context.move = 0;
                return;
            }
            await showTutorialPrompt(true);
            game.context.move = 0;
            return;
        }
        if (prev === game._help_menu_screen) {
            clearOverrideScreen();
            await handleHelpMenuSelection(ch);
            game.context.move = 0;
            return;
        }
        if (prev === game._help_text_screen) {
            const keyCode = ch.charCodeAt(0);
            const dismiss = ch === ' ' || ch === '\r' || ch === '\n';
            const cancel = ch === '\x1b';
            const pages = game._help_text_pages || [[]];
            const page = game._help_text_page || 0;
            if (dismiss && page + 1 < pages.length) {
                game._help_text_page = page + 1;
                renderHelpTextPage();
            } else if (dismiss || cancel) {
                game._help_text_pages = null;
                game._help_text_page = 0;
                game._help_text_screen = null;
                clearOverrideScreen();
                await redrawAfterFullScreenMenuDismiss();
            } else {
                showSerializedOverride(prev, [8, C.TERMINAL_ROWS - 1]);
                game._override_serialized_persistent = false;
            }
            game.context.move = 0;
            void keyCode;
            return;
        }
        if (prev === game._pay_menu_screen) {
            const menu = game._pay_menu;
            if (ch === '\x1b') {
                game._pay_menu = null;
                game._pay_menu_screen = null;
                await redrawAfterFullScreenMenuDismiss();
                game.context.move = 0;
                return;
            }
            if (ch === '\r' || ch === '\n') {
                await commitPayMenuSelection(menu);
                game.context.move = 0;
                return;
            }
            const entry = menu?.entries?.find((item) => item.selector === ch);
            if (entry) entry.selected = !entry.selected;
            if (menu) renderPayMenu(menu);
            game.context.move = 0;
            return;
        }
        if (prev === game._level_teleport_menu_screen) {
            if (ch === ' ') {
                const menu = buildLevelTeleportMenuPage2();
                game._level_teleport_menu_page2_screen = menu.screen;
                game._level_teleport_menu_page2_choices = menu.choices;
                showOverride(menu.screen, [9, 23]);
                game.context.move = 0;
                return;
            }
            const target = game._level_teleport_menu_choices?.[ch];
            if (target) {
                await redrawAfterFullScreenMenuDismiss();
                game._pending_level_teleport_target = target;
            }
            game.context.move = 0;
            return;
        }
        if (prev === game._level_teleport_menu_page2_screen) {
            const target = game._level_teleport_menu_page2_choices?.[ch];
            if (target) {
                await redrawAfterFullScreenMenuDismiss();
                game._pending_level_teleport_target = target;
            }
            game.context.move = 0;
            return;
        }
        if (game._look_inventory_lookup_active && prev === game._inventory_menu_screen) {
            game._look_inventory_lookup_active = false;
            game._inventory_menu_screen = null;
            game._inventory_menu_page2_lines = null;
            if (ch === '\x1b' || ch === ' ' || ch === '\r' || ch === '\n') {
                await redrawAfterFullScreenMenuDismiss();
                game.context.move = 0;
                return;
            }
            const idx = inventoryIndexForLetter(ch);
            const obj = idx >= 0 ? game.inventory?.[idx] : null;
            const lines = LOOKUP_DATA.get(baseObjectName(obj).toLowerCase());
            if (lines) await showLookupDataOverlay(lines);
            else {
                await redrawAfterFullScreenMenuDismiss();
                await pline("You don't have any information on those things.");
            }
            game.context.move = 0;
            return;
        }
        if (prev === game._inventory_menu_screen) {
            if (ch === ' ' && game._inventory_menu_page2_lines?.length) {
                showInventoryMenuPage2();
                game.context.move = 0;
                return;
            }
            const idx = inventoryIndexForLetter(ch);
            const obj = idx >= 0 ? game.inventory?.[idx] : null;
            if (obj) await showInventoryActionMenu(obj);
            else {
                game._inventory_menu_screen = null;
                game._inventory_menu_page2_lines = null;
                await redrawAfterFullScreenMenuDismiss();
            }
            game.context.move = 0;
            return;
        }
        if (prev === game._inventory_menu_page2_screen) {
            game._inventory_menu_screen = null;
            game._inventory_menu_page2_screen = null;
            game._inventory_menu_page2_lines = null;
            await redrawAfterFullScreenMenuDismiss();
            game.context.move = 0;
            return;
        }
        if (prev === game._potion_menu_screen) {
            clear_pending_message();
            game._override_prev = null;
            game._potion_menu_screen = null;
            game._awaiting_drink_item = false;
            const idx = inventoryIndexForLetter(ch);
            const obj = idx >= 0 ? game.inventory?.[idx] : null;
            if (obj?.oclass === POTION_CLASS) await drinkPotion(obj, idx);
            else game.context.move = 0;
            return;
        }
        if (prev === game._inventory_action_menu_screen) {
            const obj = game._inventory_action_menu_obj;
            if (ch === '\r' || ch === '\n' || ch === ' ' || ch === '\x1b') {
                game._inventory_action_menu_obj = null;
                game._inventory_action_menu_screen = null;
                await redrawAfterFullScreenMenuDismiss();
                game.context.move = 0;
                return;
            }
            if (ch === 't' && obj) {
                clear_pending_message();
                game._inventory_action_menu_obj = null;
                game._inventory_action_menu_screen = null;
                game._awaiting_throw_direction = obj;
                game.context.move = 0;
                await showPromptLine('In what direction? ');
                return;
            }
            if (obj) await showInventoryActionMenu(obj);
            game.context.move = 0;
            return;
        }
        if (prev === game._attributes_page2_screen && key !== 32 && key !== 13 && key !== 27) {
            const row = Math.max(0, (game._attributes_page2_screen || '').split('\n').length - 1);
            showOverride(game._attributes_page2_screen, [9, row]);
            game.context.move = 0;
            return;
        }
        if (prev === game._discovery_screen
            || prev === game._look_data_screen
            || prev === game._look_list_screen
            || prev === game._name_menu_screen
            || (prev === game._attributes_page1_screen && key !== 32 && key !== 13)
            || prev === game._attributes_page2_screen) {
            game._spell_menu_screen = null;
            game._discovery_screen = null;
            game._look_data_screen = null;
            game._look_list_screen = null;
            game._name_menu_screen = null;
            game._attributes_page1_screen = null;
            game._attributes_page2_screen = null;
            await redrawAfterFullScreenMenuDismiss();
            game.context.move = 0;
            return;
        }
        if (prev === game._attributes_page1_screen && (key === 32 || key === 13)) {
            // Space/Enter pages to second attributes page.
            const row = Math.max(0, (game._attributes_page2_screen || '').split('\n').length - 1);
            showOverride(game._attributes_page2_screen, [9, row]);
        }
        if (game._deferred_startup_uac != null) {
            game.u.uac = game._deferred_startup_uac;
            game._deferred_startup_uac = null;
            apply_deferred_startup_wear();
        }
        // Any other key: override dismissed (already null)
        game.context.move = 0;
        return;
    }

    const showStartupTutorial = shouldAskTutorial()
        && game._more
        && isStartupWelcomeMessage(game._pending_message)
        && (ch === ' ' || ch === '\r' || ch === '\n');

    if (!showStartupTutorial
        && game._more
        && isStartupWelcomeMessage(game._pending_message)
        && Array.isArray(game._startup_preamble_messages)
        && game._startup_preamble_messages.length
        && (ch === ' ' || ch === '\r' || ch === '\n')) {
        await showNextStartupPreambleMessage();
        return;
    }

    const occupationMore = ch === ' '
        && game._occupation_paused_for_more
        && game._more;
    if (occupationMore) {
        clear_pending_message();
        game._occupation_paused_for_more = false;
        game._occupation_resume = true;
        game.context.move = 1;
        return;
    }

    if (game._avoid_pool_tip_pending && game._more
        && (ch === ' ' || ch === '\r' || ch === '\n' || ch === '\x1b')) {
        game._avoid_pool_tip_pending = false;
        game._more = false;
        await pline("(Tip: use 'm' prefix to step in if you really want to.)");
        game.context.move = 0;
        return;
    }
    if (game._awaiting_save_confirm) {
        game._awaiting_save_confirm = false;
        clear_pending_message();
        if (ch === 'y' || ch === 'Y') {
            writeSavedGame();
            const screen = `Be seeing you...${'\n'.repeat(C.TERMINAL_ROWS - 1)}`;
            showOverride(screen, [0, 1]);
            game._pending_message = 'Be seeing you...';
            game.program_state = game.program_state || {};
            game.program_state.gameover = true;
        }
        game.context.move = 0;
        return;
    }
    if (game._more && ch !== ' ' && ch !== '\r' && ch !== '\n' && ch !== '\x1b') {
        // C ref: win/tty/topl.c:more(); non-dismissal keys do not reach rhack().
        game.context.move = 0;
        return;
    }
    if (game._pickup_menu) {
        await handlePickupMenuKey(ch);
        return;
    }
    if (await continueQueuedCookieMessage(ch)) return;
    if (game._awaiting_floor_corpse_eat) {
        await handleFloorCorpseEatKey(ch);
        return;
    }
    if (game._awaiting_eat_item) {
        await handleEatItemKey(ch);
        return;
    }

    // C ref: cmd.c:parse()/get_count().  With number_pad off, digits are a
    // count prefix and do not dispatch until a following non-digit command.
    if (isCommandCountDigit(ch)) {
        startOrContinueCommandCount(ch);
        return;
    }
    if (game._command_count_digits && ch === '\x1b') {
        game._command_count_digits = '';
        clear_pending_message();
        game.context.move = 0;
        return;
    }
    consumeCommandCountForCommand();

    // Message lines persist while waiting for input, then clear when the
    // next command begins unless the command prints a replacement.
    clear_pending_message();
    clearDeferredPetPickupObjects();
    const forceCommandPrefix = !!game._force_command_prefix;
    game._force_command_prefix = false;
    const redrawCommand = ch === '\x12' || ch === '\x0c';
    if (!redrawCommand) game._redraw_resumes_run = null;

    if (redrawCommand) {
        // C refs: cmd.c:cmdlist[]/bind_key(); display.c:doredraw()/docrt_flags().
        vision_recalc(2);
        vision_recalc(0);
        await docrt();
        if (game._redraw_resumes_run) {
            game.context.run = { ...game._redraw_resumes_run, stopBeforeOpenDoor: true };
            game._redraw_resumes_run = null;
            game._resume_run_after_more = true;
            game.context.move = 1;
        } else if (game.context?.run) {
            game.context.run.stopBeforeOpenDoor = true;
            game._resume_run_after_more = true;
            game.context.move = 1;
        } else {
            game.context.move = 0;
        }
    } else if (game._forcefight_pending && isMovementKey(ch)) {
        game._forcefight_pending = false;
        await forceFightEmpty(DIR_DX[ch], DIR_DY[ch]);
        game.context.move = 1;
    } else if (game._forcefight_pending) {
        game._forcefight_pending = false;
        game.context.move = 0;
    } else if (isMovementKey(ch)) {
        game.context.move = await domove(DIR_DX[ch], DIR_DY[ch]) ? 1 : 0;
    } else if (key === 10) {
        // C refs: cmd.c:reset_commands(), cmd.c:do_rush_south().  Line-feed is
        // C('j'), bound to rush mode 3 rather than shifted run mode 1.
        await startRunDirection('j', 3);
    } else if (runDirectionForKey(ch)) {
        const dir = runDirectionForKey(ch);
        await startRunDirection(dir, 1);
    } else if (ch === 'F') {
        game.context.move = 0;
        game._forcefight_pending = true;
    } else if (ch === '.') {
        if (!forceCommandPrefix && await cmdSafetyPrevention('Waiting', 'a no-op (to rest)',
            'Are you waiting to get hit?', '_did_nothing_flag')) {
            game.context.move = 0;
        } else {
            refreshHeroPreviousPositionForStationaryCommand();
            game.context.move = 1;
            queueSimpleTimedRepeatsForCount();
        }
    } else if (ch === 's') {
        if (!forceCommandPrefix && await cmdSafetyPrevention('Searching', 'another search',
            'You already found a monster.', '_already_found_flag')) {
            game.context.move = 0;
        } else {
            refreshHeroPreviousPositionForStationaryCommand();
            game.context.move = 1;
            queueSimpleTimedRepeatsForCount();
        }
    } else if (ch === 'm') {
        game._force_command_prefix = true;
        game.context.move = 0;
    } else if (ch === 'c') {
        game._awaiting_close_direction = true;
        game.context.move = 0;
        await showPromptLine('In what direction? ');
    } else if (ch === 'o') {
        game._awaiting_open_direction = true;
        game.context.move = 0;
        await showPromptLine('In what direction? ');
    } else if (key === 4) {
        if (hasWoundedLegs()) {
            await pline(woundedLegsKickMessage());
            queue_more_prompt();
            game.context.move = 0;
        } else {
            game._awaiting_kick_direction = true;
            game.context.move = 0;
            await showPromptLine('In what direction? ');
        }
    } else if (ch === '#') {
        game.context.move = 0;
        game._awaiting_extended_command = true;
        game._extended_command_input = '';
        game._extended_command = '';
        await showPromptLine('# ');
    } else if (key === 0x7f) {
        await showTerrainMenu();
    } else if (ch === '_') {
        game.context.move = 0;
        if (!game._travel_tip_seen) {
            await pline('Where do you want to travel to?');
            queue_more_prompt();
            game._travel_tip_pending = true;
        } else {
            await showPromptLine("Where do you want to travel to?  (For instructions type a '?')");
            if (game._travel_reset_cursor_once) {
                game._travel_reset_cursor_once = false;
                game._travel_cursor = { x: game.u?.ux ?? 1, y: game.u?.uy ?? 0 };
            } else {
                game._travel_cursor = game._travel_cached_target
                    ? { x: game._travel_cached_target.x, y: game._travel_cached_target.y }
                    : { x: game.u?.ux ?? 1, y: game.u?.uy ?? 0 };
            }
            setTravelMapCursorAt(game._travel_cursor.x, game._travel_cursor.y);
            game._awaiting_travel_prompt = true;
        }
    } else if (ch === 'i') {
        game.context.move = 0;
        await showInventoryMenu();
    } else if (ch === 'w') {
        game.context.move = 0;
        const letters = wieldLetters();
        game._awaiting_wield_item = true;
        await showPromptLine(`What do you want to wield? [-${letters ? ` ${letters}` : ''} or ?*] `);
    } else if (ch === 'Q') {
        game.context.move = 0;
        const letters = readyLetters();
        game._awaiting_quiver_item = true;
        await showPromptLine(`What do you want to ready? [-${letters ? ` ${letters}` : ''} or ?*] `);
    } else if (ch === 'f') {
        await doFireCommand();
    } else if (ch === '+') {
        game.context.move = 0;
        await showSpellMenu();
    } else if (key === 20) { // ^T teleport
        game.context.move = 0;
        await showPromptLine("Where do you want to be teleported?  (For instructions type a '?')");
        game._teleport_cursor = { x: game.u?.ux ?? 1, y: game.u?.uy ?? 0 };
        setTravelMapCursorAt(game._teleport_cursor.x, game._teleport_cursor.y);
        game._awaiting_teleport_prompt = true;
    } else if (ch === '?') {
        game.context.move = 0;
        await showHelpMenu();
    } else if (ch === '/') {
        game.context.move = 0;
        await showLookAtMenu();
        game._awaiting_lookat_menu = true;
    } else if (ch === ';') {
        game.context.move = 0;
        await pline('Pick a monster, object or location.');
        game._farlook_cursor = { x: game.u?.ux ?? 1, y: game.u?.uy ?? 0 };
        setTravelMapCursorAt(game._farlook_cursor.x, game._farlook_cursor.y);
        game._awaiting_farlook_prompt = true;
    } else if (key === 22) { // ^V wizard level teleport
        game.context.move = 0;
        const msg = 'To what level do you want to teleport? ';
        await pline(msg);
        game._prompt_cursor = [msg.length, 0];
        game._awaiting_level_teleport = true;
        game._level_teleport_input = '';
    } else if (key === 23) { // ^W wizard wish
        game.context.move = 0;
        const msg = 'For what do you wish? ';
        await pline(msg);
        game._prompt_cursor = [msg.length, 0];
        game._awaiting_wish = true;
        game._wish_input = '';
    } else if (key === 7) { // ^G wizard create monster
        game.context.move = 0;
        const msg = 'Create what kind of monster?';
        await pline(msg);
        // C ref: read.c:create_particular() -> win/tty/getline.c:hooked_tty_getlin().
        game._prompt_cursor = [msg.length + 1, 0];
        game._awaiting_create_monster = true;
        game._create_monster_input = '';
    } else if (ch === 'W') {
        game.context.move = 0;
        const letters = wearLetters();
        const msg = letters ? `What do you want to wear? [${letters} or ?*] ` : 'What do you want to wear? [*] ';
        await pline(msg);
        game._prompt_cursor = [msg.length, 0];
        game._awaiting_wear_item = true;
    } else if (ch === 'T') {
        game.context.move = 1;
        if (game.u) game.u.uac = 10;
        takeoff_worn_cloak();
        await pline('You were wearing an uncursed +0 cloak of magic resistance.');
    } else if (ch === '\\') {
        game.context.move = 0;
        const screen = discoveriesScreen();
        game._discovery_screen = screen;
        showOverride(screen, [8, 23]);
    } else if (key === 24) { // ^X
        game.context.move = 0;
        const screens = buildAttributesScreens();
        game._attributes_page1_screen = screens.page1;
        game._attributes_page2_screen = screens.page2;
        showOverride(screens.page1, [9, 23]);
    } else if (key === 6 && (game.wizard || game.flags?.debug)) {
        // C ref: wizcmds.c:wiz_map() -> detect.c:do_mapping().
        map_level_for_wizard(true);
        exercise(A_WIS, true);
        game._travel_reset_cursor_once = true;
        game.context.move = 0;
    } else if (ch === '>') {
        await doDownCommand();
    } else if (ch === '<') {
        await doUpCommand();
    } else if (ch === ':') {
        game.context.move = 0;
        const ep = engravingAt(game.u?.ux, game.u?.uy);
        const etext = engravingVisibleText(ep);
        if (etext) {
            // C refs: invent.c:dolook() -> pickup.c:look_here() ->
            // engrave.c:read_engr_at().
            await pline(`Something is written here in the dust.  You read: "${etext}".`);
            queue_more_prompt();
        } else {
            // C ref: invent.c:dolook() -> invent.c:look_here().
            const feature = lookHereFeature();
            const objects = floorObjectsAtHero();
            if (feature.line) await pline(feature.line);
            if (feature.blocks && objects.length > 0) {
                queue_more_prompt();
                return;
            }
            if (objects.length === 1) {
                const line = `You see here ${inventoryObjectName(objects[0], { includePrice: true, observe: true })}.`;
                if (feature.line) await append_pline(line);
                else await pline(line);
            } else if (objects.length > 1) {
                const count = objects.length === 2 ? 'two'
                    : objects.length < 5 ? 'a few'
                        : objects.length < 10 ? 'several' : 'many';
                const line = `There are ${count} objects here.`;
                if (feature.line) await append_pline(line);
                else await pline(line);
            } else if (!feature.line) {
                await pline("You see no objects here.");
            }
        }
    } else if (ch === ',') {
        await pickupHere();
    } else if (ch === 'p') {
        await doPayCommand();
    } else if (ch === '$') {
        game.context.move = 0;
        const gold = heroGoldAmount();
        await pline(gold > 0
            ? `Your wallet contains ${gold} zorkmids.`
            : 'Your wallet is empty.');
    } else if (ch === ')') {
        game.context.move = 0;
        const weapon = heroWieldedWeapon();
        if (weapon) await pline(`${inventoryListing(weapon, { includeWorn: true })}.`);
        else await pline('You are bare handed.');
    } else if (ch === '[') {
        game.context.move = 0;
        const wornArmor = (game.inventory || []).filter((obj) =>
            obj?.oclass === ARMOR_CLASS && (obj.worn || (obj.owornmask || 0)));
        if (wornArmor.length) await pline(`${inventoryListing(wornArmor[0], { includeWorn: true })}.`);
        else await pline('You are not wearing any armor.');
    } else if (ch === '=') {
        game.context.move = 0;
        const rings = (game.inventory || []).filter((obj) => obj?.oclass === RING_CLASS && (obj.worn || obj.wornSide));
        if (rings.length) await pline(`${inventoryListing(rings[0], { includeWorn: true })}.`);
        else await pline('You are not wearing any rings.');
    } else if (ch === '"') {
        game.context.move = 0;
        const amulet = (game.inventory || []).find((obj) => obj?.oclass === AMULET_CLASS && (obj.worn || (obj.owornmask || 0)));
        if (amulet) await pline(`${inventoryListing(amulet, { includeWorn: true })}.`);
        else await pline('You are not wearing an amulet.');
    } else if (ch === 'P') {
        game.context.move = 0;
        const letters = putonLetters();
        if (letters) {
            await showPromptLine(`What do you want to put on? [${letters} or ?*] `);
            game._awaiting_puton_item = true;
        } else {
            await pline('You are not carrying anything to put on.');
        }
    } else if (ch === 'r') {
        game.context.move = 0;
        await showPromptLine(`What do you want to read? [${readLetters()} or ?*] `);
        game._awaiting_read_item = true;
    } else if (ch === 'E') {
        game.context.move = 0;
        await showPromptLine(`What do you want to write with? [- ${writeWithLetters()} or ?*] `);
        game._awaiting_engrave_item = true;
    } else if (ch === 'q') {
        game.context.move = 0;
        if (game.level?.at(game.u?.ux, game.u?.uy)?.typ === C.SINK) {
            const prompt = 'Drink from the sink? [yn] (n)';
            await showPromptLine(prompt);
            game._prompt_cursor = [prompt.length + 1, 0];
            game._awaiting_sink_drink_confirm = true;
            return;
        }
        await showDrinkInventoryPrompt();
    } else if (ch === 'e') {
        const corpse = floorCorpseAtHero();
        if (corpse) {
            const corpseName = baseObjectName(corpse);
            game.context.move = 0;
            game._awaiting_floor_corpse_eat = true;
            game._floor_corpse_eat_obj = corpse;
            await showPromptLine(`There is a ${corpseName} here; eat it? [ynq] (n)`, { trailingInputSpace: true });
        } else {
            game.context.move = 0;
            const letters = eatLetters();
            if (letters) {
                game._awaiting_eat_item = true;
                await showPromptLine(`What do you want to eat? [${letters} or ?*] `);
            }
            else await pline("You don't have anything to eat.");
        }
    } else if (ch === 'z') {
        game.context.move = 0;
        const letters = zapLetters();
        if (letters) {
            await showPromptLine(`What do you want to zap? [${letters} or ?*] `);
            game._awaiting_zap_item = true;
        } else {
            await pline('You have nothing to zap.');
        }
    } else if (ch === 't') {
        game.context.move = 0;
        await showThrowPrompt();
    } else if (ch === 'a') {
        game.context.move = 0;
        const letters = applyLetters();
        if (letters) {
            await showPromptLine(`What do you want to use or apply? [${letters} or ?*] `);
            game._awaiting_apply_item = true;
        } else {
            await pline('You have nothing to use or apply.');
        }
    } else if (ch === 'd') {
        game.context.move = 0;
        await showPromptLine(`What do you want to drop? [${inventoryLetterRange()} or ?*] `);
        game._awaiting_drop_item = true;
    } else if (ch === 'S') {
        game.context.move = 0;
        await showPromptLine('Really save? [yn] (n)', { trailingInputSpace: true });
        game._awaiting_save_confirm = true;
    } else if (ch === ' ' && showStartupTutorial) {
        game.context.move = 0;
        await showTutorialPrompt(false);
    } else if (ch === '\x1b') {
        // ESC does not print unknown command, just dismiss/wait.
        game.context.move = 0;
    } else {
        // Unknown command
        game.context.move = 0;
        await pline(`Unknown command '${ch}'.`);
    }
}

// C ref: hack.c domove — execute a movement
export async function continueRunStep() {
    const run = game.context?.run;
    if (!run) return false;
    if (run.steps++ > COLNO * ROWNO) {
        game.context.run = null;
        game.context.move = 0;
        return false;
    }
    if (await runShouldStopBeforeRepeatMove(run)) {
        game.context.run = null;
        return false;
    }
    maybeTurnCorridorRun(run);
    let step = run.travel ? findTravelStep(run.target) : { dx: run.dx, dy: run.dy };
    if (!step) {
        game.context.run = null;
        game.context.move = 0;
        return false;
    }
    if (run.travel) {
        // C ref: hack.c:findtravelpath()/domove().  Travel chooses a path,
        // but each domove attempt receives a unit direction.
        step = { dx: Math.sign(step.dx), dy: Math.sign(step.dy) };
    }
    game.context.move = 0;
    game.context.mv = 1;
    const moved = await domove(step.dx, step.dy);
    if (run.travel) setTravelMapCursor();
    game.context.move = moved ? 1 : 0;
    if (run.travel && game.u?.ux === run.target.x && game.u?.uy === run.target.y) {
        game._travel_cached_target = null;
        game.context.run = null;
        return moved;
    }
    if (!moved || game._run_stop_after_move) {
        game.context.run = null;
        game._run_stop_after_move = false;
    }
    return moved;
}

function uMaybeImpaired() {
    // C ref: hack.c:u_maybe_impaired().
    if (game.u?.uprops?.stunned || game.u?.ustunned) return true;
    if (game.u?.uprops?.confusion || game.u?.uconfusion) return !rn2(5);
    return false;
}

function impairedMovementDirection() {
    // C refs: hack.c:impaired_movement(), cmd.c:confdir().
    if (!uMaybeImpaired()) return null;
    for (let tries = 0; tries <= 50; tries++) {
        const dir = CONFUSED_DIRS[rn2(CONFUSED_DIRS.length)];
        const x = (game.u?.ux || 0) + dir.dx;
        const y = (game.u?.uy || 0) + dir.dy;
        if (C.isok(x, y) && !blocksMove(x, y)) return dir;
    }
    return { blocked: true, dx: 0, dy: 0 };
}

export async function domove(dx, dy) {
    const u = game.u;
    if (u.uswallow && u.ustuck) {
        await swallowedHeroAttack(u.ustuck);
        return true;
    }

    const impaired = impairedMovementDirection();
    if (impaired?.blocked) {
        game.context.move = 0;
        return false;
    }
    if (impaired) {
        dx = impaired.dx;
        dy = impaired.dy;
        if (game.context?.run && !game.context.run.travel) {
            // C ref: cmd.c:confdir()/hack.c:domove_core().  Confused
            // movement mutates u.dx/u.dy, so an active run continues (or
            // stops) using the confused vector rather than the original key.
            game.context.run.dx = dx;
            game.context.run.dy = dy;
        }
    }

    const newx = u.ux + dx;
    const newy = u.uy + dy;
    const target = game.level.at(newx, newy);
    const currentSource = game.level.at(u.ux, u.uy);
    const is_diag = dx !== 0 && dy !== 0;

    if (game.context?.run?.stopBeforeOpenDoor && !game.context.run.travel) {
        if (currentSource?.typ === CORR && target?.typ === DOOR
            && !(target.doormask & (D_CLOSED | D_LOCKED))) {
            // C ref: hack.c:lookaround().  A message/redraw-interrupted
            // corridor run can stop at the doorway boundary before exposing
            // the next room.
            game.context.run.stopBeforeOpenDoor = false;
            game.context.move = 0;
            return false;
        }
    }

    if (is_diag && !blocksMove(newx, newy)) {
        const side1x = u.ux + dx, side1y = u.uy;
        const side2x = u.ux, side2y = u.uy + dy;
        const sokoBouldersBlock = !!game.level?.flags?.sokoban_rules;
        const side1Blocked = blocksMove(side1x, side1y)
            || (sokoBouldersBlock && sobj_at_basic(BOULDER, side1x, side1y));
        const side2Blocked = blocksMove(side2x, side2y)
            || (sokoBouldersBlock && sobj_at_basic(BOULDER, side2x, side2y));
        if (side1Blocked && side2Blocked) {
            await pline('You cannot pass that way.');
            game.context.move = 0;
            return false;
        }
    }

    if (is_diag && game.level?.flags?.sokoban_rules && sobj_at_basic(BOULDER, newx, newy)) {
        await pline('You try to move the boulder, but in vain.');
        game.context.move = 0;
        return false;
    }
    const boulder = sobj_at_basic(BOULDER, newx, newy);
    if (boulder) {
        return tryPushBoulder(boulder, newx, newy, dx, dy);
    }

    if (target?.typ === DOOR && (target.doormask & (D_CLOSED | D_LOCKED))) {
        if (game.context?.run) return bumpClosedDoor(dx, dy);
        if (target.doormask & D_LOCKED) {
            // C ref: lock.c:doopen_indir().  A normal movement key against a
            // locked door reports the lock without spending a turn; run/rush
            // movement still uses the bump-into-door path above.
            await pline('This door is locked.');
            game.context.move = 0;
            return false;
        }
        if (await tryAutoOpenDoor(newx, newy)) return false;
        return bumpClosedDoor(dx, dy);
    }

    if (blocksMove(newx, newy)) {
        // Can't move there
        game.context.move = 0;
        return false;
    }

    if (target && IS_POOL(target.typ)) {
        // C ref: hack.c:domove_core(); paranoid movement into known liquid
        // is a zero-time prompt gate.
        await pline(`You avoid stepping into the pool of ${hallucinatedLiquidName('water')}.`);
        game._more = true;
        game._avoid_pool_tip_pending = true;
        game.context.move = 0;
        return false;
    }

    const mon = mon_at(newx, newy);
    if (mon) {
        if (isSafeMonster(mon)) {
            await swapWithSafeMonster(mon, newx, newy);
            return true;
        }
        if (game.context?.run && cansee(newx, newy)) {
            // C ref: hack.c:domove_core().  Running into a visible non-safe
            // monster stops the run instead of performing a melee attack.
            game.context.move = 0;
            game.context.run = null;
            return false;
        }
        await attackMonster(mon);
        return true;
    }

    if (is_diag) {
        const source = game.level.at(u.ux, u.uy);
        if (doorwayBlocksDiagonalForHero(target) || doorwayBlocksDiagonalForHero(source)) {
            if (game.flags?.mention_walls) await pline(`You can't move diagonally into an intact doorway.`);
            game.context.move = 0;
            return false;
        }
    }

    // Move the hero
    const oldx = u.ux, oldy = u.uy;
    const source = game.level.at(oldx, oldy);
    u.ux0 = oldx;
    u.uy0 = oldy;
    u.ux = newx;
    u.uy = newy;
    if (game.context?.run && runShouldStopAfterMove(source, target)) {
        if (target?.typ === DOOR && !(target.doormask & (D_CLOSED | D_LOCKED))) {
            game._redraw_resumes_run = { ...game.context.run };
        } else {
            game._redraw_resumes_run = null;
        }
        game._run_stop_after_move = true;
    }

    // Update display
    newsym(oldx, oldy);
    vision_recalc(1);
    see_nearby_objects();
    // C ref: hack.c:domove() post-move vision redraw clears warning glyphs
    // whose mdisdu() range changed when the hero moved.
    refreshWarningAfterHeroMove();
    newsym(newx, newy);
    await checkSpecialRoomAfterMove();
    await lookHereAfterMove();
    if (!game._more) await triggerTrapAtHero();
    return true;
}
