// mklev.js — Level generation.
// C ref: mklev.c — makelevel, makerooms, makecorridors, generate_stairs.
// Also includes parts of sp_lev.c (create_room) and mkmap.c (litstate_rnd).
// Stripped-down version for contest: generates regular dungeon levels with
// room placement, corridors, doors, stairs, niches, and fill.
// Uses the real game PRNG (not a separate layout PRNG) for bit-exact parity.

import { game } from './gstate.js';
import { GameMap } from './game.js';
import { rn2, rnd, rn1, rne, rnz, d } from './rng.js';
import { init_rect, rnd_rect, get_rect, split_rects } from './rect.js';
import { depth as depth_of_level, distmin, dist2 } from './hacklib.js';
import { randomEngraving, randomEpitaph } from './random_text.js';
import {
    OBJECT_CLASS, OBJECT_PROB, OBJECT_CHARGED, OBJECT_DIR,
    CLASS_BASES, CLASS_TOTALS,
} from './object_data.js';
import { getObjectColor, getObjectMaterial } from './o_init.js';
import { MONSTER_DATA } from './monster_data.js';
import { m_dowear_basic } from './mon_wear.js';
import {
    COLNO, ROWNO, STONE, ROOM, CORR, DOOR, STAIRS, LADDER, AIR, CLOUD,
    HWALL, VWALL, TLCORNER, TRCORNER, BLCORNER, BRCORNER,
    CROSSWALL, TUWALL, TDWALL, TLWALL, TRWALL,
    D_NODOOR, D_BROKEN, D_CLOSED, D_ISOPEN, D_LOCKED, D_TRAPPED, D_SECRET,
    OROOM, VAULT, THEMEROOM, COURT, BARRACKS, ZOO, LEPREHALL, SHOPBASE, DELPHI, MORGUE, TEMPLE, SWAMP, BEEHIVE,
    CANDLESHOP, TOOLSHOP, FOODSHOP,
    ROOMOFFSET, MAXNROFROOMS, SHARED,
    SDOOR, SCORR, IRONBARS, TREE, FOUNTAIN, SINK, ALTAR, GRAVE,
    DIR_N, DIR_S, DIR_E, DIR_W, DIR_180,
    IS_WALL, IS_STWALL, IS_DOOR, IS_OBSTRUCTED, IS_FURNITURE, IS_POOL, IS_LAVA, IS_ROOM,
    SPACE_POS, ZAP_POS, isok, W_NONDIGGABLE, FILL_NORMAL, FILL_NONE, FILL_LVFLAGS,
    DRY, WET, HOT, SOLID,
    ICE, MOAT, POOL, WATER, LAVAPOOL, LAVAWALL, DBWALL, DRAWBRIDGE_UP, THRONE,
    A_LAWFUL, A_NONE, Align2amask,
    LR_DOWNSTAIR, LR_UPSTAIR, LR_BRANCH, LR_TELE, LR_UPTELE, LR_DOWNTELE, NO_MINVENT, MM_IGNOREWATER, MM_IGNORELAVA, MM_ADJACENTOK, MM_ANGRY, MM_EPRI, MM_ASLEEP, MM_NOGRP, MM_NOTAIL, MM_NONAME, MM_NOWAIT, GP_CHECKSCARY, GP_AVOID_MONPOS,
    MARK as ENGR_MARK, N_ENGRAVE,
    M_AP_OBJECT, M_AP_FURNITURE,
    STRAT_APPEARMSG, STRAT_WAITFORU, STRAT_CLOSE,
    M3_WAITFORU, M3_CLOSE, M3_WAITMASK, M3_COVETOUS,
    In_mines, Is_rogue_level,
} from './const.js';

// Object/class constants (normally from objects.js, not in contest template)
const RANDOM_CLASS = 0;
const STRANGE_OBJECT = 0;
const WEAPON_CLASS = 2;
const ARMOR_CLASS = 3;
const RING_CLASS = 4;
const AMULET_CLASS = 5;
const FAKE_AMULET_OF_YENDOR = 212;
const AMULET_OF_YENDOR = 213;
const TOOL_CLASS = 6;
const TALLOW_CANDLE = 224;
const WAX_CANDLE = 225;
const BRASS_LANTERN = 226;
const OIL_LAMP = 227;
const MAGIC_LAMP = 228;
const MAGIC_MARKER = 242;
const LOCK_PICK = 222;
const BLINDFOLD = 233;
const FOOD_CLASS = 7;
const POTION_CLASS = 8;
const POT_BOOZE = 317;
const POT_FRUIT_JUICE = 319;
const POT_OIL = 321;
const SCROLL_CLASS = 9;
const SCR_LIGHT = 332;
const SPBOOK_CLASS = 10;
const SPE_CONE_OF_COLD = 369;
const SPE_LIGHT = 372;
const SPE_CLAIRVOYANCE = 385;
const SPE_CHARM_MONSTER = 387;
const SPE_INVISIBILITY = 393;
const SPE_POLYMORPH = 399;
const SPE_CREATE_FAMILIAR = 401;
const SPE_STONE_TO_FLESH = 405;
const SPE_BOOK_OF_THE_DEAD = 409;
const WAND_CLASS = 11;
const WAN_LIGHT = 410;
const COIN_CLASS = 12;
const GEM_CLASS = 13;
const ROCK_CLASS = 14;
const ARROW = 18;
const ORCISH_ARROW = 20;
const CROSSBOW_BOLT = 20;
const DART = 23;
const SHURIKEN = 25;
const BOULDER = 475;
const ELVEN_ARROW = 19;
const ELVEN_SPEAR = 28;
const DWARVISH_SPEAR = 30;
const TRIDENT = 33;
const DAGGER = 34;
const ELVEN_DAGGER = 35;
const ORCISH_DAGGER = 36;
const ATHAME = 38;
const KNIFE = 40;
const STILETTO = 41;
const WORM_TOOTH = 42;
const AXE = 44;
const BATTLE_AXE = 45;
const SPEAR = 27;
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
const RUNESWORD = 58;
const PARTISAN = 59;
const RANSEUR = 60;
const SPETUM = 61;
const GLAIVE = 62;
const LUCERN_HAMMER = 69;
const DWARVISH_MATTOCK = 71;
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
const BOW = 83;
const ELVEN_BOW = 84;
const ORCISH_BOW = 85;
const SLING = 87;
const CROSSBOW = 88;
const ELVEN_LEATHER_HELM = 89;
const ORCISH_HELM = 90;
const DWARVISH_IRON_HELM = 91;
const DWARVISH_MITHRIL_COAT = 126;
const ORCISH_CHAIN_MAIL = 129;
const PLATE_MAIL = 121;
const CRYSTAL_PLATE_MAIL = 122;
const SPLINT_MAIL = 124;
const BANDED_MAIL = 125;
const STUDDED_LEATHER_ARMOR = 131;
const RING_MAIL = 132;
const LEATHER_ARMOR = 134;
const LEATHER_JACKET = 135;
const ORCISH_CLOAK = 140;
const DWARVISH_CLOAK = 141;
const DENTED_POT = 95;
const HELMET = 97;
const URUK_HAI_SHIELD = 154;
const ORCISH_SHIELD = 155;
const SMALL_SHIELD = 150;
const LARGE_SHIELD = 156;
const DWARVISH_ROUNDSHIELD = 157;
const SHIELD_OF_REFLECTION = 158;
const LEATHER_GLOVES = 159;
const GAUNTLETS_OF_FUMBLING = 160;
const LOW_BOOTS = 163;
const IRON_SHOES = 164;
const HIGH_BOOTS = 165;
const WATER_WALKING_BOOTS = 167;
const ELVEN_MITHRIL_COAT = 127;
const MUMMY_WRAPPING = 138;
const ELVEN_CLOAK = 139;
const LEATHER_CLOAK = 145;
const ELVEN_SHIELD = 153;
const ELVEN_BOOTS = 169;
const FUMBLE_BOOTS = 171;
const LEVITATION_BOOTS = 172;
const ROBE = 149;
const TIN_WHISTLE = 245;
const SKELETON_KEY = 221;
const FIGURINE = 241;
const BUGLE = 256;
const MIRROR = 230;
const CRYSTAL_BALL = 231;
const PICK_AXE = 259;
const GRAPPLING_HOOK = 260;
const UNICORN_HORN = 261;
const CANDELABRUM_OF_INVOCATION = 262;
const BELL_OF_OPENING = 263;
const GOLD_PIECE = 438;
const DILITHIUM_CRYSTAL = 439;
const DIAMOND = 440;
const RUBY = 441;
const EMERALD = 445;
const AMETHYST = 455;
const LUCKSTONE = 470;
const LOADSTONE = 471;
const TOUCHSTONE = 472;
const FLINT = 473;
const ROCK = 474;
const KELP_FROND = 275;
const CREAM_PIE = 287;
const SCR_TELEPORTATION = 333;
const SCR_CHARGING = 342;
const BELL = 263;
const CORPSE = 265;
const EGG = 266;
const MEAT_RING = 270;
const STATUE = 476;
const SPBOOK_no_NOVEL = -SPBOOK_CLASS;
const RIN_HUNGER = 184;
const RIN_AGGRAVATE_MONSTER = 185;
const RIN_TELEPORTATION = 194;
const RIN_POLYMORPH = 196;
const RIN_INVISIBILITY = 198;

// Supply chest items
const POT_HEALING = 307;
const POT_EXTRA_HEALING = 308;
const POT_FULL_HEALING = 315;
const POT_CONFUSION = 299;
const POT_BLINDNESS = 300;
const POT_PARALYSIS = 301;
const POT_SICKNESS = 319;
const POT_SPEED = 302;
const POT_INVISIBILITY = 305;
const POT_GAIN_LEVEL = 309;
const POT_OBJECT_DETECTION = 312;
const POT_GAIN_ENERGY = 313;
const POT_SLEEPING = 314;
const POT_POLYMORPH = 316;
const POT_ACID = 320;
const POT_WATER = 322;
const SCR_ENCHANT_WEAPON = 328;
const SCR_ENCHANT_ARMOR = 323;
const SCR_CONFUSE_MONSTER = 325;
const SCR_SCARE_MONSTER = 326;
const SCR_CREATE_MONSTER = 329;
const SCR_EARTH = 340;
const SCR_BLANK_PAPER = 365;
const WAN_CREATE_MONSTER = 413;
const WAN_WISHING = 414;
const WAN_NOTHING = 416;
const WAN_STRIKING = 417;
const WAN_MAKE_INVISIBLE = 418;
const WAN_SPEED_MONSTER = 420;
const WAN_POLYMORPH = 422;
const WAN_TELEPORTATION = 424;
const WAN_DIGGING = 428;
const WAN_MAGIC_MISSILE = 429;
const WAN_FIRE = 430;
const WAN_COLD = 431;
const WAN_SLEEP = 432;
const WAN_DEATH = 433;
const WAN_LIGHTNING = 434;
const SPE_HEALING = 374;
const LARGE_BOX = 214;
const CHEST = 215;
const ICE_BOX = 216;
const SACK = 217;
const OILSKIN_SACK = 218;
const BAG_OF_HOLDING = 219;
const FOOD_RATION = 293;
const CRAM_RATION = 292;
const LEMBAS_WAFER = 291;
const K_RATION = 294;
const C_RATION = 295;
const TIN = 296;
const AMULET_OF_LIFE_SAVING = 202;
const AMULET_OF_STRANGULATION = 203;
const AMULET_OF_RESTFUL_SLEEP = 204;
const AMULET_OF_CHANGE = 206;
const AMULET_OF_REFLECTION = 208;
const ENGRAVE = 2;
const DUST = 3;
const MARK = 6;

const G_FREQ = 0x0007;
const G_NOGEN = 0x0200;
const G_HELL = 0x0400;
const G_NOHELL = 0x0800;
const G_UNIQ = 0x1000;
const G_IGNORE = 0x8000;
const G_NOCORPSE = 0x0010;
const MR_FIRE = 0x01;
const MR_COLD = 0x02;
const MR_STONE = 0x80;
const G_LGROUP = 0x0040;
const G_SGROUP = 0x0080;
const CORPSTAT_HISTORIC = 0x04;

const SPLEV_LEFT = 1;
const SPLEV_CENTER = 3;
const SPLEV_RIGHT = 5;
const TOP = 1;
const BOTTOM = 5;

const M2_NOPOLY = 0x00000001;
const M2_HUMAN = 0x00000008;
const M2_UNDEAD = 0x00000002;
const M2_WERE = 0x00000004;
const M2_ELF = 0x00000010;
const M2_DWARF = 0x00000020;
const M2_GNOME = 0x00000040;
const M2_ORC = 0x00000080;
const M2_DEMON = 0x00000100;
const M2_MINION = 0x00001000;
const M2_GIANT = 0x00002000;
const M2_SHAPESHIFTER = 0x00004000;
const M2_LORD = 0x00000400;
const M2_PRINCE = 0x00000800;
const M2_HOSTILE = 0x00100000;
const M2_PEACEFUL = 0x00200000;
const M2_NASTY = 0x02000000;
const M2_STRONG = 0x04000000;
const M2_GREEDY = 0x10000000;
const MIMIC_FURNITURE_CLASS = Symbol('MIMIC_FURNITURE_CLASS');
const MIMIC_STRANGE_OBJECT = Symbol('MIMIC_STRANGE_OBJECT');
const M1_FLY = 0x00000001;
const M1_SWIM = 0x00000002;
const M1_AMPHIBIOUS = 0x00000200;
const M1_WALLWALK = 0x00000008;
const M1_NOEYES = 0x00001000;
const M1_MINDLESS = 0x00010000;
const M1_HUMANOID = 0x00020000;
const M1_ANIMAL = 0x00040000;
const M1_UNSOLID = 0x00100000;
const M1_OVIPAROUS = 0x00400000;

const MS_LEADER = 36;
const MS_NEMESIS = 37;
const MS_GUARDIAN = 38;
const MS_PRIEST = 41;
const MM_EMIN = 0x00000400;
const MM_NOCOUNTBIRTH = 0x00000004;
const MM_NOMSG = 0x00020000;
const MM_MINVIS = 0x00100000;

const LIQUID = 1;
const WOOD = 8;
const DRAGON_HIDE = 10;
const IRON = 11;
const COPPER = 13;
const PLASTIC = 18;
const GLASS = 19;

const XLIM = 4;
const YLIM = 3;

const mkobjprobs = [
    { iprob: 10, iclass: WEAPON_CLASS },
    { iprob: 11, iclass: ARMOR_CLASS },
    { iprob: 20, iclass: FOOD_CLASS },
    { iprob: 8, iclass: TOOL_CLASS },
    { iprob: 7, iclass: GEM_CLASS },
    { iprob: 16, iclass: POTION_CLASS },
    { iprob: 16, iclass: SCROLL_CLASS },
    { iprob: 4, iclass: SPBOOK_CLASS },
    { iprob: 4, iclass: WAND_CLASS },
    { iprob: 3, iclass: RING_CLASS },
    { iprob: 1, iclass: AMULET_CLASS },
];

const rogueprobs = [
    { iprob: 12, iclass: WEAPON_CLASS },
    { iprob: 12, iclass: ARMOR_CLASS },
    { iprob: 22, iclass: FOOD_CLASS },
    { iprob: 22, iclass: POTION_CLASS },
    { iprob: 22, iclass: SCROLL_CLASS },
    { iprob: 5, iclass: WAND_CLASS },
    { iprob: 5, iclass: RING_CLASS },
];

const hellprobs = [
    { iprob: 20, iclass: WEAPON_CLASS },
    { iprob: 20, iclass: ARMOR_CLASS },
    { iprob: 16, iclass: FOOD_CLASS },
    { iprob: 12, iclass: TOOL_CLASS },
    { iprob: 10, iclass: GEM_CLASS },
    { iprob: 1, iclass: POTION_CLASS },
    { iprob: 1, iclass: SCROLL_CLASS },
    { iprob: 8, iclass: WAND_CLASS },
    { iprob: 8, iclass: RING_CLASS },
    { iprob: 4, iclass: AMULET_CLASS },
];

const boxiprobs = [
    { iprob: 18, iclass: GEM_CLASS },
    { iprob: 15, iclass: FOOD_CLASS },
    { iprob: 18, iclass: POTION_CLASS },
    { iprob: 18, iclass: SCROLL_CLASS },
    { iprob: 12, iclass: SPBOOK_CLASS },
    { iprob: 7, iclass: COIN_CLASS },
    { iprob: 6, iclass: WAND_CLASS },
    { iprob: 5, iclass: RING_CLASS },
    { iprob: 1, iclass: AMULET_CLASS },
];

const GHOST_NAMES = [
    'Adri', 'Andries', 'Andreas', 'Bert', 'David', 'Dirk',
    'Emile', 'Frans', 'Fred', 'Greg', 'Hether', 'Jay',
    'John', 'Jon', 'Karnov', 'Kay', 'Kenny', 'Kevin',
    'Maud', 'Michiel', 'Mike', 'Peter', 'Robert', 'Ron',
    'Tom', 'Wilmar', 'Nick Danger', 'Phoenix', 'Jiro', 'Mizue',
    'Stephan', 'Lance Braccus', 'Shadowhawk', 'Murphy',
];

const NASTY_MONSTER_NAMES = [
    'COCKATRICE', 'ETTIN', 'STALKER', 'MINOTAUR',
    'OWLBEAR', 'PURPLE_WORM', 'XAN', 'UMBER_HULK',
    'XORN', 'ZRUTY', 'LEOCROTTA', 'BALUCHITHERIUM',
    'CARNIVOROUS_APE', 'FIRE_ELEMENTAL', 'JABBERWOCK',
    'IRON_GOLEM', 'OCHRE_JELLY', 'GREEN_SLIME',
    'DISPLACER_BEAST', 'GENETIC_ENGINEER',
    'BLACK_DRAGON', 'RED_DRAGON', 'ARCH_LICH', 'VAMPIRE_LEADER',
    'MASTER_MIND_FLAYER', 'DISENCHANTER', 'WINGED_GARGOYLE',
    'STORM_GIANT', 'OLOG_HAI', 'ELF_NOBLE', 'ELVEN_MONARCH',
    'OGRE_TYRANT', 'CAPTAIN', 'GREMLIN',
    'SILVER_DRAGON', 'ORANGE_DRAGON', 'GREEN_DRAGON',
    'YELLOW_DRAGON', 'GUARDIAN_NAGA', 'FIRE_GIANT',
    'ALEAX', 'COUATL', 'HORNED_DEVIL', 'BARBED_DEVIL',
];

// Direction deltas
const xdir = [-1, -1, 0, 1, 1, 1, 0, -1];
const ydir = [0, -1, -1, -1, 0, 1, 1, 1];

// Trap constants
const NO_TRAP = 0;
const TRAPNUM = 26;
const ARROW_TRAP = 1;
const DART_TRAP = 2;
const ROCKTRAP = 3;
const SQKY_BOARD = 4;
const BEAR_TRAP = 5;
const LANDMINE = 6;
const ROLLING_BOULDER_TRAP = 7;
const SLP_GAS_TRAP = 8;
const RUST_TRAP = 9;
const FIRE_TRAP = 10;
const PIT = 11;
const SPIKED_PIT = 12;
const HOLE = 13;
const TRAPDOOR = 14;
const TELEP_TRAP = 15;
const LEVEL_TELEP = 16;
const MAGIC_PORTAL = 17;
const WEB = 18;
const STATUE_TRAP = 19;
const MAGIC_TRAP = 20;
const ANTI_MAGIC = 21;
const POLY_TRAP = 22;
const VIBRATING_SQUARE = 23;
const TRAPPED_DOOR = 24;
const TRAPPED_CHEST = 25;

function is_hole(t) { return t === HOLE || t === TRAPDOOR; }
function is_pit(t) { return t === PIT || t === SPIKED_PIT; }
function unhideable_trap(t) { return t === HOLE; }
function undestroyable_trap(t) { return t === MAGIC_PORTAL || t === VIBRATING_SQUARE; }
function is_xport_trap(t) { return t >= TELEP_TRAP && t <= MAGIC_PORTAL; }

const MONSTERS = MONSTER_DATA.map(([name, mlet, mlevel, mmove, maligntyp, geno, difficulty, color, neuter, male, female, msound = 0, mresists = 0, mconveys = 0, mflags1 = 0, mflags2 = 0, mflags3 = 0, mattk = []]) => ({
    name, mlet, mlevel, mmove, maligntyp, geno, difficulty, color, msound, mresists, mconveys, mflags1, mflags2, mflags3, mattk,
    neuter: !!neuter, male: !!male, female: !!female,
}));

const SPECIAL_PM = MONSTERS.findIndex(mon => mon.name === 'LONG_WORM_TAIL');
const MONGEN_ORDER_LIMIT = SPECIAL_PM >= 0 ? SPECIAL_PM : MONSTERS.length;

export const MONSTER_SYMBOLS = {
    S_ANT: 'a', S_BLOB: 'b', S_COCKATRICE: 'c', S_DOG: 'd',
    S_EYE: 'e', S_FELINE: 'f', S_GREMLIN: 'g', S_HUMANOID: 'h',
    S_IMP: 'i', S_JELLY: 'j', S_KOBOLD: 'k', S_LEPRECHAUN: 'l',
    S_MIMIC: 'm', S_NYMPH: 'n', S_ORC: 'o', S_PIERCER: 'p',
    S_QUADRUPED: 'q', S_RODENT: 'r', S_SPIDER: 's', S_TRAPPER: 't',
    S_UNICORN: 'u', S_VORTEX: 'v', S_WORM: 'w', S_XAN: 'x',
    S_LIGHT: 'y', S_ZRUTY: 'z', S_ANGEL: 'A', S_BAT: 'B',
    S_CENTAUR: 'C', S_DRAGON: 'D', S_ELEMENTAL: 'E', S_FUNGUS: 'F',
    S_GNOME: 'G', S_GIANT: 'H', S_JABBERWOCK: 'J', S_KOP: 'K',
    S_LICH: 'L', S_MUMMY: 'M', S_NAGA: 'N', S_OGRE: 'O',
    S_PUDDING: 'P', S_QUANTMECH: 'Q', S_RUSTMONST: 'R', S_SNAKE: 'S',
    S_TROLL: 'T', S_UMBER: 'U', S_VAMPIRE: 'V', S_WRAITH: 'W',
    S_XORN: 'X', S_YETI: 'Y', S_ZOMBIE: 'Z', S_GOLEM: '\'',
    S_HUMAN: '@', S_GHOST: ' ', S_DEMON: '&', S_EEL: ';',
    S_LIZARD: ':', S_WORM_TAIL: '~',
};

function monster_mlet_sort_value(ptr) {
    return (ptr?.difficulty ?? 0) | ((MONSTER_SYMBOLS[ptr?.mlet]?.charCodeAt(0) ?? 0) << 8);
}

const MONGEN_ORDER = (() => {
    const order = MONSTERS.map((_, i) => i);
    const sorted = order.slice(0, MONGEN_ORDER_LIMIT)
        .sort((a, b) => monster_mlet_sort_value(MONSTERS[a]) - monster_mlet_sort_value(MONSTERS[b]));
    return sorted.concat(order.slice(MONGEN_ORDER_LIMIT));
})();

const PLACEHOLDER_MONSTERS = new Set(['ORC', 'GIANT', 'ELF', 'HUMAN']);
const DOPPELGANGER_ROLE_FORMS = [
    'ARCHEOLOGIST', 'BARBARIAN', 'CAVEMAN', 'HEALER', 'KNIGHT',
    'MONK', 'PRIEST', 'RANGER', 'ROGUE', 'SAMURAI', 'TOURIST',
    'VALKYRIE', 'WIZARD',
];
const DOPPELGANGER_GUARDIAN_FORMS = [
    'STUDENT', 'CHIEFTAIN', 'NEANDERTHAL', 'ATTENDANT', 'PAGE',
    'ABBOT', 'ACOLYTE', 'HUNTER', 'THUG', 'NINJA', 'ROSHI',
    'GUIDE', 'APPRENTICE',
];
const MPLAYER_FORMS = new Set(DOPPELGANGER_ROLE_FORMS);

const VERY_SMALL_MONSTERS = new Set([
    'GIANT_ANT', 'KILLER_BEE', 'SOLDIER_ANT', 'FIRE_ANT', 'QUEEN_BEE',
    'ACID_BLOB', 'CHICKATRICE', 'HOMUNCULUS', 'IMP', 'LEPRECHAUN',
    'SEWER_RAT', 'GIANT_RAT', 'RABID_RAT', 'WERERAT', 'CAVE_SPIDER',
    'CENTIPEDE', 'GRID_BUG', 'XAN', 'BAT', 'GARTER_SNAKE',
    'NEWT', 'GECKO', 'IGUANA', 'LIZARD', 'CHAMELEON',
]);

function monsterName(mon) {
    if (Number.isInteger(mon)) return MONSTERS[mon]?.name ?? null;
    if (!mon) return null;
    return typeof mon === 'string' ? mon : mon.name;
}

export function monsterPtr(mon) {
    if (Number.isInteger(mon)) return MONSTERS[mon] || null;
    if (!mon) return null;
    if (typeof mon === 'object') return mon;
    return MONSTERS.find(ptr => ptr.name === mon) || null;
}

function monsterIndex(ptr) {
    return MONSTERS.indexOf(ptr);
}

function verysmall_monster(mon) {
    const ptr = monsterPtr(mon);
    if (ptr && ptr.mlet === 'S_HUMAN') return false;
    return VERY_SMALL_MONSTERS.has(monsterName(ptr || mon));
}

// Stairway list management
function stairway_add(x, y, up, isladder, dest, isbranch = false) {
    const node = { sx: x, sy: y, up, isladder, isbranch, u_traversed: false, tolev: { ...dest }, next: game.stairs };
    game.stairs = node;
}

// ── Stairway lookup ──

function stairway_find_dir(up) {
    for (let s = game.stairs; s; s = s.next)
        if (s.up === up) return s;
    return null;
}

function stairway_find_special_dir(up) {
    for (let s = game.stairs; s; s = s.next)
        if (s.tolev.dnum !== (game.u?.uz?.dnum ?? 0) && s.up !== up) return s;
    return null;
}

// ── Hero placement (C ref: stairs.c, mkmaze.c) ──

function u_on_newpos(x, y) {
    game.u.ux = x;
    game.u.uy = y;
}

function u_at(x, y) {
    return game.u?.ux === x && game.u?.uy === y;
}

function m_at(x, y) {
    return (game.level?.monsters || []).find(m => m.mx === x && m.my === y) || null;
}

// C ref: mkmaze.c bad_location — simplified for skeleton
function bad_location(x, y, nlx, nly, nhx, nhy) {
    const loc = game.level?.at(x, y);
    if (!loc) return true;
    if (occupied(x, y)) return true;
    // Excluded region
    if (nlx && x >= nlx && x <= nhx && y >= nly && y <= nhy) return true;
    // Must be ROOM, AIR, or (CORR in maze).
    if (loc.typ !== ROOM && loc.typ !== AIR
        && !(loc.typ === CORR && game.level?.flags?.is_maze_lev))
        return true;
    return false;
}

function put_lregion_here(x, y, nlx, nly, nhx, nhy, rtype, oneshot) {
    if (bad_location(x, y, nlx, nly, nhx, nhy)) return false;
    if ((rtype === LR_TELE || rtype === LR_UPTELE || rtype === LR_DOWNTELE) && m_at(x, y)) {
        return !!oneshot;
    }
    switch (rtype) {
    case LR_TELE:
    case LR_UPTELE:
    case LR_DOWNTELE:
        u_on_newpos(x, y);
        break;
    case LR_DOWNSTAIR:
    case LR_UPSTAIR:
        mkstairs(x, y, rtype === LR_UPSTAIR, null);
        break;
    case LR_BRANCH:
        place_branch(is_branchlev(), x, y);
        break;
    default:
        return false;
    }
    return true;
}

const CC_INCL_CENTER = 0x01;
const CC_UNSHUFFLED = 0x02;
const CC_RING_PAIRS = 0x04;
const CC_SKIP_MONS = 0x08;
const CC_SKIP_INACCS = 0x10;

// C ref: teleport.c:collect_coords().
export function collect_coords(cx, cy, maxradius = 0, cc_flags = 0, filter = null) {
    const include_cxcy = !!(cc_flags & CC_INCL_CENTER);
    const scramble = !(cc_flags & CC_UNSHUFFLED);
    const ring_pairs = scramble && !!(cc_flags & CC_RING_PAIRS);
    const skip_mons = !!(cc_flags & CC_SKIP_MONS);
    const skip_inaccessible = !!(cc_flags & CC_SKIP_INACCS);
    const coords = [];

    const rowrange = (cy < Math.trunc(ROWNO / 2)) ? (ROWNO - 1 - cy) : cy;
    const colrange = (cx < Math.trunc(COLNO / 2)) ? (COLNO - 1 - cx) : cx;
    const kmax = Math.max(rowrange, colrange);
    maxradius = maxradius ? Math.min(maxradius, kmax) : kmax;

    let passStart = 0;
    let n = 0;
    for (let radius = include_cxcy ? 0 : 1; radius <= maxradius; radius++) {
        const newpass = !ring_pairs || ((radius % 2) !== 0 || radius === 0);
        const passend = !ring_pairs || ((radius % 2) === 0 || radius === maxradius);
        if (newpass) {
            passStart = coords.length;
            n = 0;
        }
        const lox = cx - radius, hix = cx + radius;
        const loy = cy - radius, hiy = cy + radius;
        for (let y = Math.max(loy, 0); y <= hiy; y++) {
            if (y > ROWNO - 1) break;
            for (let x = Math.max(lox, 1); x <= hix; x++) {
                if (x > COLNO - 1) break;
                if (x !== lox && x !== hix && y !== loy && y !== hiy) continue;
                const loc = game.level?.at(x, y);
                if ((skip_mons && m_at(x, y))
                    || (skip_inaccessible && (!loc || !SPACE_POS(loc.typ)))) continue;
                if (filter && !filter(x, y)) continue;
                coords.push({ x, y });
                n++;
            }
        }
        if (scramble && passend) {
            let i = passStart;
            while (n > 1) {
                const j = rn2(n);
                if (j) [coords[i], coords[i + j]] = [coords[i + j], coords[i]];
                i++;
                n--;
            }
        }
    }
    return coords;
}

function mon_in_air_for(ptr) {
    return !!((ptr?.mflags1 ?? 0) & M1_FLY);
}

function mon_swims_for(ptr) {
    return !!((ptr?.mflags1 ?? 0) & M1_SWIM) || !!ptr?.swimmer;
}

function mon_is_floater_for(ptr) {
    return ptr?.mlet === 'S_EYE' || ptr?.mlet === 'S_LIGHT';
}

function mon_likes_lava_for(ptr) {
    return ptr?.name === 'FIRE_ELEMENTAL' || ptr?.name === 'SALAMANDER';
}

function mon_likes_fire_for(ptr) {
    return ptr?.name === 'FIRE_VORTEX'
        || ptr?.name === 'FLAMING_SPHERE'
        || mon_likes_lava_for(ptr);
}

function pm_to_humidity(ptr) {
    let loc = DRY;
    if (!ptr) return loc;
    const flags1 = ptr.mflags1 ?? 0;
    if (ptr.mlet === 'S_EEL' || (flags1 & M1_AMPHIBIOUS) || mon_swims_for(ptr)) loc = WET;
    if (mon_in_air_for(ptr) || mon_is_floater_for(ptr)) loc |= HOT | WET;
    if ((flags1 & M1_WALLWALK) || ptr.mlet === 'S_GHOST') loc |= SOLID;
    if (mon_likes_fire_for(ptr)) loc |= HOT;
    return loc;
}

function engr_at(x, y) {
    return (game.level?.engravings || []).find(ep => ep.x === x && ep.y === y) || null;
}

function sengr_at(text, x, y, strict = false) {
    const ep = engr_at(x, y);
    if (!ep) return null;
    const actual = String(ep.text || '');
    const needle = String(text || '');
    if (strict) {
        return actual.toLowerCase() === needle.toLowerCase() ? ep : null;
    }
    return actual.toLowerCase().includes(needle.toLowerCase()) ? ep : null;
}

function goodpos_onscary(x, y, ptr) {
    if (!ptr) return false;
    // C ref: teleport.c:goodpos_onscary(), the fake-monster approximation
    // used by enexto() and monster creation.
    if (ptr.mlet === 'S_HUMAN' || ptr.mlet === 'S_ANGEL') return false;
    if (ptr.name === 'MINOTAUR' || ((ptr.mflags1 ?? 0) & M1_NOEYES)) return false;
    if (game.level?.at(x, y)?.typ === ALTAR && ptr.mlet === 'S_VAMPIRE') return true;
    if (sobj_at(SCR_SCARE_MONSTER, x, y)) return true;
    return !!sengr_at('Elbereth', x, y, true);
}

function goodpos(x, y, entflags = 0, ptr = null) {
    if (!isok(x, y)) return false;
    if (!(entflags & 0x00400000) && u_at(x, y)) return false; // GP_ALLOW_U
    if (m_at(x, y)) return false;
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    const isPool = IS_POOL(loc.typ);
    const isLava = IS_LAVA(loc.typ);
    if (isPool) {
        if (!(entflags & MM_IGNOREWATER)
            && !(ptr && (mon_swims_for(ptr) || mon_in_air_for(ptr)))) {
            return false;
        }
    } else if (isLava) {
        if (!(entflags & MM_IGNORELAVA)
            && !(ptr && (mon_in_air_for(ptr) || mon_likes_lava_for(ptr)))) {
            return false;
        }
    } else if (!SPACE_POS(loc.typ)) {
        return false;
    }
    if ((entflags & GP_CHECKSCARY) && goodpos_onscary(x, y, ptr)) return false;
    return true;
}

function cansee_at(x, y) {
    return !!(game.viz_array?.[y]?.[x] & 0x2); // IN_SIGHT
}

function makemon_rnd_goodpos(ptr, gpflags) {
    // C ref: makemon.c:makemon_rnd_goodpos().
    gpflags |= GP_AVOID_MONPOS;
    let nx = 0;
    let ny = 0;
    let good = false;
    let tryct = 0;
    do {
        nx = rn1(COLNO - 3, 2);
        ny = rn2(ROWNO);
        good = (!game.in_mklev && cansee_at(nx, ny)) ? false : goodpos(nx, ny, gpflags, ptr);
    } while ((++tryct < 50) && !good);

    if (!good) {
        const xofs = nx;
        const yofs = ny;
        for (let bl = game.in_mklev ? 1 : 0; bl < 2; bl++) {
            if (!bl) gpflags &= ~GP_CHECKSCARY;
            for (let dx = 0; dx < COLNO; dx++) {
                for (let dy = 0; dy < ROWNO; dy++) {
                    nx = ((dx + xofs) % (COLNO - 1)) + 1;
                    ny = ((dy + yofs) % (ROWNO - 1)) + 1;
                    if (bl === 0 && cansee_at(nx, ny)) continue;
                    if (goodpos(nx, ny, gpflags, ptr)) return { x: nx, y: ny };
                }
            }
            if (bl === 0 && (!ptr || ptr.mmove)) {
                for (let stway = game.stairs; stway; stway = stway.next) {
                    if (stway.tolev?.dnum === game.u?.uz?.dnum && !rn2(2)) {
                        nx = stway.sx;
                        ny = stway.sy;
                        break;
                    }
                }
                if (goodpos(nx, ny, gpflags, ptr)) return { x: nx, y: ny };
            }
        }
        return null;
    }
    return { x: nx, y: ny };
}

export function enexto_core(cx, cy, ptr, entflags) {
    const near = collect_coords(cx, cy, 3, 0, null);
    for (const cc of near)
        if (goodpos(cc.x, cc.y, entflags, ptr)) return cc;

    const all = collect_coords(cx, cy, 0, 0, null);
    for (let i = near.length; i < all.length; i++)
        if (goodpos(all[i].x, all[i].y, entflags, ptr)) return all[i];

    if ((entflags & 0x00200000) && goodpos(cx, cy, entflags, ptr)) return { x: cx, y: cy }; // GP_ALLOW_XY
    return null;
}

// C ref: mkmaze.c place_lregion — place hero (LR_UPTELE/LR_DOWNTELE)
export function place_lregion(lx, ly, hx, hy, nlx, nly, nhx, nhy, rtype, lev) {
    if (!lx) {
        if (rtype === LR_BRANCH && game.level?.nroom) {
            place_branch(is_branchlev());
            return;
        }
        lx = 1; hx = COLNO - 1; ly = 0; hy = ROWNO - 1;
    }
    if (lx < 1) lx = 1;
    if (hx > COLNO - 1) hx = COLNO - 1;
    if (ly < 0) ly = 0;
    if (hy > ROWNO - 1) hy = ROWNO - 1;

    // Probabilistic search
    const oneshot = lx === hx && ly === hy;
    for (let trycnt = 0; trycnt < 200; trycnt++) {
        const x = rn1((hx - lx) + 1, lx);
        const y = rn1((hy - ly) + 1, ly);
        if (put_lregion_here(x, y, nlx, nly, nhx, nhy, rtype, oneshot)) return;
    }
    // Deterministic fallback
    for (let x = lx; x <= hx; x++)
        for (let y = ly; y <= hy; y++)
            if (put_lregion_here(x, y, nlx, nly, nhx, nhy, rtype, true)) return;
}

// C ref: stairs.c u_on_upstairs — place hero on upstairs or fallback
export function u_on_upstairs() {
    const stway = stairway_find_dir(true);
    if (stway) { u_on_newpos(stway.sx, stway.sy); return; }
    // No upstair — try special stairs, then random
    const special = stairway_find_special_dir(0);
    if (special) { u_on_newpos(special.sx, special.sy); return; }
    // Random placement via place_lregion
    place_lregion(0, 0, 0, 0, 0, 0, 0, 0, LR_UPTELE, null);
}

// oinit stub (level-dependent object probability reset)
function oinit() { /* no-op for contest */ }

// level_difficulty stub
function level_difficulty() {
    const uz = game.u?.uz;
    let d = depth_of_level(uz);
    const dungeon = game.dungeons?.[uz?.dnum ?? 0];
    const branch = game.branches?.find((br) => br.end2?.dnum === (uz?.dnum ?? 0));
    if (branch?.end1_up) {
        d += 2 * ((dungeon?.entry_lev ?? uz?.dlevel ?? 1) - (uz?.dlevel ?? 1) + 1);
    }
    return d;
}

// ============================================================
// Stub functions for object/monster/trap creation
// These consume the exact RNG calls that C makes.
// ============================================================

let _nextObjId = 1;

// C ref: mkobj.c next_ident — rnd(2) for item identification
export function next_ident() { rnd(2); }

function bless(otmp) {
    if (otmp) {
        otmp.blessed = true;
        otmp.cursed = false;
    }
}

// C ref: mkobj.c blessorcurse()
function blessorcurse(otmp, chance) {
    if (!otmp || otmp.blessed || otmp.cursed) return;
    if (!rn2(chance)) {
        if (!rn2(2)) curse(otmp);
        else bless(otmp);
    }
}

function bcsign(otmp) {
    return otmp?.blessed ? 1 : otmp?.cursed ? -1 : 0;
}

function nartifact_exist() {
    return game._nartifact_exist ?? 0;
}

const RANDOM_ARTIFACT_BASE_COUNTS = new Map([
    [RUNESWORD, 1],
    [WAR_HAMMER, 2],
    [BATTLE_AXE, 1],
    [ORCISH_DAGGER, 1],
    [ELVEN_BROADSWORD, 1],
    [ELVEN_DAGGER, 1],
    [ATHAME, 1],
    [LONG_SWORD, 5],
    [BROADSWORD, 1],
    [SILVER_MACE, 1],
    [SILVER_SABER, 2],
    [MORNING_STAR, 1],
    [KATANA, 1],
]);

function maybe_artifact(otmp, chance) {
    if (!otmp || otmp.oartifact) return;
    if (!rn2(chance + (10 * nartifact_exist()))) {
        const eligible = RANDOM_ARTIFACT_BASE_COUNTS.get(otmp.otyp) ?? 0;
        if (!eligible) return;
        rn2(eligible); // C ref: artifact.c:mk_artifact() eligible[] selection.
        game._nartifact_exist = nartifact_exist() + 1;
        otmp.oartifact = true;
    }
}

function object_material(otyp) {
    return getObjectMaterial(otyp) ?? 0;
}

function is_flammable(otmp) {
    const mat = object_material(otmp.otyp);
    return (mat <= WOOD && mat !== LIQUID) || mat === PLASTIC;
}

function is_rottable(otmp) {
    const mat = object_material(otmp.otyp);
    return (mat <= WOOD && mat !== LIQUID) || mat === DRAGON_HIDE;
}

function is_rustprone(otmp) {
    return object_material(otmp.otyp) === IRON;
}

function is_crackable(otmp) {
    return object_material(otmp.otyp) === GLASS && otmp.oclass === ARMOR_CLASS;
}

function is_corrodeable(otmp) {
    const mat = object_material(otmp.otyp);
    return mat === COPPER || mat === IRON;
}

function erosion_matters(otmp) {
    return otmp.oclass === WEAPON_CLASS || otmp.oclass === ARMOR_CLASS
        || (otmp.oclass === TOOL_CLASS && is_weptool(otmp));
}

function is_weptool(otmp) {
    return otmp?.otyp === PICK_AXE || otmp?.otyp === GRAPPLING_HOOK || otmp?.otyp === UNICORN_HORN;
}

function is_damageable(otmp) {
    return is_rustprone(otmp) || is_flammable(otmp) || is_rottable(otmp)
        || is_corrodeable(otmp) || is_crackable(otmp);
}

function may_generate_eroded(otmp) {
    if ((game.moves ?? 0) <= 1 && !game.in_mklev) return false;
    return !!otmp && !otmp.oerodeproof && !otmp.oartifact
        && otmp.otyp !== WORM_TOOTH && otmp.otyp !== UNICORN_HORN
        && erosion_matters(otmp) && is_damageable(otmp);
}

function mkobj_erosions(otmp) {
    if (!may_generate_eroded(otmp)) return;

    if (!rn2(100)) {
        otmp.oerodeproof = true;
    } else {
        if (!rn2(80) && (is_flammable(otmp) || is_rustprone(otmp) || is_crackable(otmp))) {
            do {
                otmp.oeroded = (otmp.oeroded ?? 0) + 1;
            } while (otmp.oeroded < 3 && !rn2(9));
        }

        if (!rn2(80) && (is_rottable(otmp) || is_corrodeable(otmp))) {
            do {
                otmp.oeroded2 = (otmp.oeroded2 ?? 0) + 1;
            } while (otmp.oeroded2 < 3 && !rn2(9));
        }
    }

    if (!rn2(1000)) otmp.greased = true;
}

function object_class(otyp) {
    return OBJECT_CLASS[otyp] ?? RANDOM_CLASS;
}

function class_base(oclass) {
    for (let i = 18; i < OBJECT_CLASS.length; i++) {
        if (OBJECT_CLASS[i] === oclass) return i;
    }
    return CLASS_BASES[oclass] ?? -1;
}

function pick_prob_entry(entries, total) {
    let remaining = total ?? 100;
    if (total == null) remaining = rnd(100);
    else remaining = rnd(total);
    for (const entry of entries) {
        remaining -= entry.iprob;
        if (remaining <= 0) return entry;
    }
    return entries[entries.length - 1];
}

function rnd_class(first, last) {
    if (last <= first) return first;
    let sum = 0;
    for (let i = first; i <= last; i++) sum += OBJECT_PROB[i] ?? 0;
    if (!sum) return rn1(last - first + 1, first);
    let remaining = rnd(sum);
    for (let i = first; i <= last; i++) {
        remaining -= OBJECT_PROB[i] ?? 0;
        if (remaining <= 0) return i;
    }
    return first;
}

function pick_object_type_for_class(oclass) {
    if (oclass === SPBOOK_no_NOVEL) {
        return rnd_class(class_base(SPBOOK_CLASS), 407);
    }

    const base = class_base(oclass);
    if (base == null || base < 0) return 0;

    const total = CLASS_TOTALS[oclass] ?? 0;
    if (total <= 0) return base;
    let remaining = rnd(total);
    let i = base;
    while (i < OBJECT_CLASS.length && OBJECT_CLASS[i] === oclass) {
        remaining -= OBJECT_PROB[i] ?? 0;
        if (remaining <= 0) return i;
        i++;
    }
    return base;
}

function mkbox_cnts(box) {
    let n = 0;
    switch (box?.otyp) {
    case ICE_BOX:
        n = 20;
        break;
    case CHEST:
        n = box.olocked ? 7 : 5;
        break;
    case LARGE_BOX:
        n = box.olocked ? 5 : 3;
        break;
    case SACK:
    case OILSKIN_SACK:
        if ((game.moves ?? 0) <= 1 && !game.in_mklev) {
            n = 0;
            break;
        }
        n = 1;
        break;
    case BAG_OF_HOLDING:
        n = 1;
        break;
    default:
        break;
    }

    for (n = rn2(n + 1); n > 0; n--) {
        const otmp = box?.otyp === ICE_BOX
            ? mksobj(CORPSE, true, false)
            : mkobj(pick_prob_entry(boxiprobs).iclass, false);
        if (otmp?.oclass === COIN_CLASS) {
            otmp.quan = rnd(level_difficulty() + 2) * rnd(75);
        } else {
            while (otmp?.otyp === ROCK) {
                otmp.otyp = rnd_class(DILITHIUM_CRYSTAL, LOADSTONE);
                otmp.oclass = object_class(otmp.otyp);
                if ((otmp.quan || 1) > 2) otmp.quan = 1;
            }
        }
    }
}

// C ref: mkobj.c mksobj — create a specific object
// Minimal stub: consumes RNG for next_ident + type-specific init
export function mksobj(otyp, init, artif) {
    const otmp = {
        otyp,
        oclass: object_class(otyp),
        ox: 0,
        oy: 0,
        quan: 1,
        owt: 1,
        cursed: false,
        blessed: false,
        olocked: false,
        otrapped: false,
        tknown: false,
        known: false,
        bknown: false,
        rknown: false,
        dknown: false,
        spe: 0,
        corpsenm: null,
    };
    next_ident();
    if (init) {
        mksobj_init(otmp, otyp, artif);
    }
    // C ref: mkobj.c:mksobj(); statue species metadata is initialized even
    // when the caller passes init=FALSE.
    if (otyp === STATUE && !init) {
        if (otmp.corpsenm == null) otmp.corpsenm = rndmonnum();
        const ptr = monster_ptr(otmp.corpsenm);
        if (ptr && !ptr.neuter && !ptr.female && !ptr.male) rn2(2);
        set_corpsenm(otmp, otmp.corpsenm);
    }
    if (game._in_monster_init) {
        game._monster_init_item_count = (game._monster_init_item_count || 0) + 1;
        if (otyp === GOLD_PIECE) game._monster_init_has_gold = true;
        const mon = game._monster_init_current;
        if (mon) {
            // C ref: makemon.c:mongets() links monster-init objects into minvent.
            otmp.ox = mon.mx;
            otmp.oy = mon.my;
            mon.inventory = mon.inventory || [];
            mon.inventory.unshift(otmp);
        }
    }
    return otmp;
}

// C ref: mkobj.c mksobj initialization RNG consumption
// This varies by object class. For the contest, we need enough to match
// the session's RNG pattern for objects created during mklev.
function mksobj_init(otmp, otyp, artif) {
    switch (object_class(otyp)) {
    case FOOD_CLASS:
        if (otyp === CORPSE) {
            if (!otmp.corpsenm) {
                let tryct = 50;
                let ptr = null;
                do {
                    ptr = undead_to_corpse_ptr(rndmonnum_ptr());
                } while (ptr && (ptr.geno & G_NOCORPSE) && --tryct > 0);
                otmp.corpsenm = ptr ? ptr.name : 'HUMAN';
            }
        } else if (otyp === EGG) {
            otmp.corpsenm = null;
            if (!rn2(3)) {
                for (let tryct = 200; tryct > 0; tryct--) {
                    const ptr = can_be_hatched_ptr(rndmonnum_ptr());
                    if (ptr) {
                        otmp.corpsenm = ptr.name;
                        break;
                    }
                }
            }
        } else if (otyp === KELP_FROND) {
            otmp.quan = rnd(2);
        } else if (otyp === TIN) {
            otmp.corpsenm = null;
            if (!rn2(6)) {
                otmp.spe = 1; // SPINACH_TIN
            } else {
                for (let tryct = 200; tryct > 0; tryct--) {
                    const ptr = undead_to_corpse_ptr(rndmonnum_ptr());
                    if (!tin_can_contain(ptr)) continue;
                    otmp.corpsenm = ptr.name;
                    rn2(15); // set_tin_variety(RANDOM_TIN)
                    break;
                }
            }
            blessorcurse(otmp, 10);
        }
        if (otyp !== CORPSE && otyp !== MEAT_RING && otyp !== KELP_FROND && !rn2(6)) {
            otmp.quan = 2;
        }
        if (otyp === EGG && otmp.corpsenm) {
            for (let i = 151; i <= 200; i++) {
                if (rnd(i) > 150) break;
            }
        }
        break;
    case GEM_CLASS:
        otmp.corpsenm = 0;
        if (otyp === LOADSTONE) curse(otmp);
        else if (otyp === ROCK) otmp.quan = rn1(6, 6);
        else if (otyp !== LUCKSTONE && !rn2(6)) otmp.quan = 2;
        else otmp.quan = 1;
        break;
    case ROCK_CLASS:
        if (otyp === ROCK) {
            otmp.quan = rn1(6, 6);
        } else if (otyp === STATUE) {
            const ptr = rndmonnum_ptr();
            otmp.corpsenm = ptr ? monsterIndex(ptr) : null;
            if (ptr && !verysmall_monster(ptr)) {
                if (rn2(Math.trunc(level_difficulty() / 2) + 10) > 10) {
                    mkobj(SPBOOK_no_NOVEL, false);
                }
            }
        }
        break;
    case TOOL_CLASS:
        if (otyp === CHEST || otyp === LARGE_BOX) {
            otmp.olocked = !!rn2(5);
            otmp.otrapped = !rn2(10);
            otmp.tknown = otmp.otrapped && !rn2(100);
            mkbox_cnts(otmp);
        } else if (otyp === ICE_BOX || otyp === SACK || otyp === OILSKIN_SACK
            || otyp === BAG_OF_HOLDING) {
            mkbox_cnts(otmp);
        } else if (otyp === 224 || otyp === 225) {
            // TALLOW_CANDLE, WAX_CANDLE
            otmp.spe = 1;
            otmp.quan = 1 + (rn2(2) ? rn2(7) : 0);
            blessorcurse(otmp, 5);
        } else if (otyp === 226 || otyp === 227) {
            // BRASS_LANTERN, OIL_LAMP
            otmp.spe = 1;
            otmp.age = rn1(500, 1000);
            blessorcurse(otmp, 5);
        } else if (otyp === 228) {
            // MAGIC_LAMP
            otmp.spe = 1;
            blessorcurse(otmp, 2);
        } else if (otyp === 229 || otyp === 238 || otyp === 242) {
            // EXPENSIVE_CAMERA, TINNING_KIT, MAGIC_MARKER
            otmp.spe = rn1(70, 30);
        } else if (otyp === 231) { // CRYSTAL_BALL
            otmp.spe = rn1(5, 3);
            blessorcurse(otmp, 2);
        } else if (otyp === 240) { // CAN_OF_GREASE
            otmp.spe = rn1(21, 5);
            blessorcurse(otmp, 10);
        }
        break;
    case POTION_CLASS:
    case SCROLL_CLASS:
        blessorcurse(otmp, 4);
        break;
    case SPBOOK_CLASS:
        blessorcurse(otmp, 17);
        break;
    case WAND_CLASS:
        if (otyp === WAN_WISHING) otmp.spe = 1;
        else otmp.spe = rn1(5, (OBJECT_DIR[otyp] === 1) ? 11 : 4);
        blessorcurse(otmp, 17);
        break;
    case RING_CLASS:
        if (OBJECT_CHARGED[otyp]) {
            blessorcurse(otmp, 3);
            if (rn2(10)) {
                const sign = bcsign(otmp);
                if (rn2(10) && sign) {
                    otmp.spe = sign * rne(3);
                } else {
                    otmp.spe = rn2(2) ? rne(3) : -rne(3);
                }
            }
            if (otmp.spe === 0) otmp.spe = rn2(4) - rn2(3);
            if (otmp.spe < 0 && rn2(5)) curse(otmp);
        } else if (rn2(10) && (is_bad_uncursed_ring(otyp) || !rn2(9))) {
            curse(otmp);
        }
        break;
    case WEAPON_CLASS:
        if (is_multigen_weapon(otyp)) otmp.quan = rn1(6, 6);
        if (!rn2(11)) {
            otmp.spe = rne(3);
            otmp.blessed = !!rn2(2);
        } else if (!rn2(10)) {
            curse(otmp);
            otmp.spe = -rne(3);
        } else {
            blessorcurse(otmp, 10);
        }
        if (is_poisonable_weapon(otyp) && !rn2(100)) otmp.opoisoned = 1;
        if (artif) maybe_artifact(otmp, 20);
        break;
    case ARMOR_CLASS:
        if (rn2(10) && (is_special_cursed_armor(otyp) || !rn2(11))) {
            curse(otmp);
            otmp.spe = -rne(3);
        } else if (!rn2(10)) {
            otmp.blessed = !!rn2(2);
            otmp.spe = rne(3);
        } else {
            blessorcurse(otmp, 10);
        }
        if (artif) maybe_artifact(otmp, 40);
        break;
    case AMULET_CLASS:
        if (rn2(10) && (otyp === AMULET_OF_STRANGULATION
            || otyp === AMULET_OF_CHANGE || otyp === AMULET_OF_RESTFUL_SLEEP)) {
            curse(otmp);
        } else {
            blessorcurse(otmp, 10);
        }
        break;
    default:
        break;
    }

    mkobj_erosions(otmp);

    const corpsePtr = monsterPtr(otmp.corpsenm);
    if ((otyp === STATUE || otyp === CORPSE) && corpsePtr
        && !corpsePtr.neuter && !corpsePtr.male && !corpsePtr.female) {
        rn2(2);
    }
    if (otyp === CORPSE && monsterName(otmp.corpsenm) !== 'LICHEN') {
        rnz(25);
    }
}

function is_poisonable_weapon(otyp) {
    // C ref: obj.h is_poisonable(): weapon skill in the multigen missile
    // range, plus permanently poisoned types. The local object table does
    // not expose oc_skill yet, so keep the known early missile id range.
    return otyp >= ARROW && otyp <= SHURIKEN;
}

function is_multigen_weapon(otyp) {
    return otyp >= ARROW && otyp <= SHURIKEN;
}

function is_special_cursed_armor(otyp) {
    // C hard-curses these armor types without the ordinary !rn2(11) gate.
    return otyp === 99 || otyp === GAUNTLETS_OF_FUMBLING
        || otyp === FUMBLE_BOOTS || otyp === LEVITATION_BOOTS;
}

function is_bad_uncursed_ring(otyp) {
    return otyp === RIN_TELEPORTATION || otyp === RIN_POLYMORPH
        || otyp === RIN_AGGRAVATE_MONSTER || otyp === RIN_HUNGER;
}

const OBJECT_CLASS_GLYPH = {
    [WEAPON_CLASS]: { ch: ')', color: 7 },
    [ARMOR_CLASS]: { ch: '[', color: 6 },
    [RING_CLASS]: { ch: '=', color: 14 },
    [AMULET_CLASS]: { ch: '"', color: 14 },
    [TOOL_CLASS]: { ch: '(', color: 7 },
    [FOOD_CLASS]: { ch: '%', color: 3 },
    [POTION_CLASS]: { ch: '!', color: 7 },
    [SCROLL_CLASS]: { ch: '?', color: 15 },
    [SPBOOK_CLASS]: { ch: '+', color: 3 },
    [WAND_CLASS]: { ch: '/', color: 14 },
    [COIN_CLASS]: { ch: '$', color: 14 },
    [GEM_CLASS]: { ch: '*', color: 7 },
    [ROCK_CLASS]: { ch: '`', color: 7 },
};

function object_display_color(otmp) {
    return getObjectColor(otmp?.otyp) ?? OBJECT_CLASS_GLYPH[otmp?.oclass]?.color ?? 7;
}

export function place_object(otmp, x, y) {
    if (!otmp || !game.level?.objects) return otmp;
    const glyph = OBJECT_CLASS_GLYPH[otmp.oclass] || { ch: '?', color: 7 };
    otmp.ox = x;
    otmp.oy = y;
    otmp.ch = glyph.ch;
    otmp.color = object_display_color(otmp);
    game.level.objects.unshift(otmp);
    return otmp;
}

function mksobj_at(otyp, x, y, init, artif) {
    return place_object(mksobj(otyp, init, artif), x, y);
}

export function mkobj(oclass, artif) {
    let chosenClass = oclass;
    if (chosenClass === RANDOM_CLASS) {
        const probs = rogue_level_active() ? rogueprobs : Inhell() ? hellprobs : mkobjprobs;
        chosenClass = pick_prob_entry(probs).iclass;
    }
    const otyp = pick_object_type_for_class(chosenClass);
    return mksobj(otyp, true, artif);
}

function mkobj_at(oclass, x, y, artif) {
    return place_object(mkobj(oclass, artif), x, y);
}

function mkgold(amount, x, y) {
    // C ref: mkobj.c mkgold()
    if (amount <= 0) {
        // C ref: mkobj.c:2008-2010
        const depthVal = depth_of_level(game.u?.uz);
        const mul = rnd(Math.trunc(30 / Math.max(12 - depthVal, 2)));
        amount = 1 + rnd(level_difficulty() + 2) * mul;
    }
    const existing = game.level?.objects?.find(o => o.otyp === GOLD_PIECE && o.ox === x && o.oy === y);
    if (existing) {
        existing.quan = (existing.quan || 0) + amount;
        return;
    }
    // mksobj_at(GOLD_PIECE) calls next_ident
    next_ident();
    if (game.level?.objects) {
        const gold = {
            otyp: GOLD_PIECE,
            oclass: COIN_CLASS,
            ox: x, oy: y,
            quan: amount,
            ch: '$',
        };
        gold.color = object_display_color(gold);
        game.level.objects.unshift(gold);
    }
}

function dealloc_obj(otmp) { /* stub */ }
function curse(otmp) { if (otmp) otmp.cursed = true; }
function weight(otmp) { return otmp?.owt || 1; }
function add_to_container(container, otmp) { /* stub */ }
function sobj_at(otyp, x, y) {
    return (game.level?.objects || []).find(o => o.otyp === otyp && o.ox === x && o.oy === y) || false;
}

function set_corpsenm(otmp, pm) {
    if (otmp) otmp.corpsenm = pm;
}

function set_corpsenm_restart(otmp, pm) {
    set_corpsenm(otmp, pm);
    if (otmp?.otyp === CORPSE) start_corpse_timeout(otmp);
}

function monster_ptr(ref) {
    if (typeof ref === 'number') return MONSTERS[ref] || null;
    if (ref === 'CAVEWOMAN') return MONSTERS.find((mon) => mon.name === 'CAVEMAN') || null;
    if (typeof ref === 'string') return MONSTERS.find((mon) => mon.name === ref) || null;
    return ref?.name ? ref : null;
}

export function monster_by_user_name(name) {
    const key = String(name || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
    return MONSTERS.find((mon) => mon.name === key) || null;
}

function monster_name_gender(name) {
    switch (String(name || '').trim().toLowerCase()) {
    case 'vampire lord':
        return 'male';
    case 'vampire lady':
        return 'female';
    default:
        return null;
    }
}

function monster_name_needs_find_gender_roll(name, ptr) {
    if (!ptr || ptr.neuter || ptr.male || ptr.female) return false;
    return monster_name_gender(name) == null;
}

function apply_monster_name_gender(mon, name) {
    const gender = monster_name_gender(name);
    if (!mon || gender == null) return mon;
    mon.female = gender === 'female' ? 1 : 0;
    return mon;
}

function is_rider_ref(ref) {
    const name = monster_ptr(ref)?.name;
    return name === 'DEATH' || name === 'FAMINE' || name === 'PESTILENCE';
}

function special_corpse(ref) {
    const ptr = monster_ptr(ref);
    if (!ptr) return false;
    return ptr.name === 'LIZARD' || ptr.name === 'LICHEN'
        || ptr.mlet === 'S_TROLL' || is_rider_ref(ptr);
}

function undead_to_corpse_ptr(ptr) {
    if (!ptr) return null;
    const mapped = ({
        KOBOLD_ZOMBIE: 'KOBOLD',
        KOBOLD_MUMMY: 'KOBOLD',
        DWARF_ZOMBIE: 'DWARF',
        DWARF_MUMMY: 'DWARF',
        GNOME_ZOMBIE: 'GNOME',
        GNOME_MUMMY: 'GNOME',
        ORC_ZOMBIE: 'ORC',
        ORC_MUMMY: 'ORC',
        ELF_ZOMBIE: 'ELF',
        ELF_MUMMY: 'ELF',
        VAMPIRE: 'HUMAN',
        VAMPIRE_LEADER: 'HUMAN',
        HUMAN_ZOMBIE: 'HUMAN',
        HUMAN_MUMMY: 'HUMAN',
        GIANT_ZOMBIE: 'GIANT',
        GIANT_MUMMY: 'GIANT',
        ETTIN_ZOMBIE: 'ETTIN',
        ETTIN_MUMMY: 'ETTIN',
    })[ptr.name];
    return mapped ? monster_ptr(mapped) : ptr;
}

function little_to_big_ptr(ptr) {
    if (!ptr) return null;
    const mapped = ({
        GNOME: 'GNOME_LEADER',
        GNOME_LEADER: 'GNOME_RULER',
        DWARF: 'DWARF_LEADER',
        DWARF_LEADER: 'DWARF_RULER',
        MIND_FLAYER: 'MASTER_MIND_FLAYER',
        ORC: 'ORC_CAPTAIN',
        HILL_ORC: 'ORC_CAPTAIN',
        MORDOR_ORC: 'ORC_CAPTAIN',
        URUK_HAI: 'ORC_CAPTAIN',
        SEWER_RAT: 'GIANT_RAT',
        CAVE_SPIDER: 'GIANT_SPIDER',
        OGRE: 'OGRE_LEADER',
        OGRE_LEADER: 'OGRE_TYRANT',
        ELF: 'ELF_NOBLE',
        WOODLAND_ELF: 'ELF_NOBLE',
        GREEN_ELF: 'ELF_NOBLE',
        GREY_ELF: 'ELF_NOBLE',
        ELF_NOBLE: 'ELVEN_MONARCH',
        LICH: 'DEMILICH',
        DEMILICH: 'MASTER_LICH',
        MASTER_LICH: 'ARCH_LICH',
        VAMPIRE: 'VAMPIRE_LEADER',
        BAT: 'GIANT_BAT',
        BABY_GRAY_DRAGON: 'GRAY_DRAGON',
        BABY_GOLD_DRAGON: 'GOLD_DRAGON',
        BABY_SILVER_DRAGON: 'SILVER_DRAGON',
        BABY_RED_DRAGON: 'RED_DRAGON',
        BABY_WHITE_DRAGON: 'WHITE_DRAGON',
        BABY_ORANGE_DRAGON: 'ORANGE_DRAGON',
        BABY_BLACK_DRAGON: 'BLACK_DRAGON',
        BABY_BLUE_DRAGON: 'BLUE_DRAGON',
        BABY_GREEN_DRAGON: 'GREEN_DRAGON',
        BABY_YELLOW_DRAGON: 'YELLOW_DRAGON',
        RED_NAGA_HATCHLING: 'RED_NAGA',
        BLACK_NAGA_HATCHLING: 'BLACK_NAGA',
        GOLDEN_NAGA_HATCHLING: 'GOLDEN_NAGA',
        GUARDIAN_NAGA_HATCHLING: 'GUARDIAN_NAGA',
        SMALL_MIMIC: 'LARGE_MIMIC',
        LARGE_MIMIC: 'GIANT_MIMIC',
        BABY_LONG_WORM: 'LONG_WORM',
        BABY_PURPLE_WORM: 'PURPLE_WORM',
        BABY_CROCODILE: 'CROCODILE',
        SOLDIER: 'SERGEANT',
        SERGEANT: 'LIEUTENANT',
        LIEUTENANT: 'CAPTAIN',
        WATCHMAN: 'WATCH_CAPTAIN',
        ALIGNED_CLERIC: 'HIGH_CLERIC',
        STUDENT: 'ARCHEOLOGIST',
        ATTENDANT: 'HEALER',
        PAGE: 'KNIGHT',
        ACOLYTE: 'CLERIC',
        APPRENTICE: 'WIZARD',
        MANES: 'LEMURE',
        KEYSTONE_KOP: 'KOP_SERGEANT',
        KOP_SERGEANT: 'KOP_LIEUTENANT',
        KOP_LIEUTENANT: 'KOP_KAPTAIN',
    })[ptr.name];
    return mapped ? monster_ptr(mapped) : ptr;
}

function can_be_hatched_ptr(ptr) {
    if (!ptr) return null;
    if (ptr.name === 'SCORPIUS') ptr = monster_ptr('SCORPION') || ptr;
    ptr = little_to_big_ptr(ptr);
    const lays = !!(ptr?.mflags1 & M1_OVIPAROUS);
    if (ptr?.name === 'KILLER_BEE' || ptr?.name === 'GARGOYLE') return ptr;
    if (lays) {
        const breederEgg = !rn2(77);
        if (breederEgg || !['QUEEN_BEE', 'WINGED_GARGOYLE'].includes(ptr.name))
            return ptr;
    }
    return null;
}

function tin_can_contain(ptr) {
    return !!ptr && !(ptr.geno & G_NOCORPSE);
}

function start_corpse_timeout(body) {
    // C ref: mkobj.c:start_corpse_timeout(). Timer storage is still future
    // work; this preserves the RNG shape for ordinary rotting corpses.
    const ptr = monster_ptr(body?.corpsenm);
    if (!ptr || ptr.name === 'LIZARD' || ptr.name === 'LICHEN') return;
    rnz(game.in_mklev ? 25 : 10);
}

// mkcorpstat stub
function mkcorpstat(objtyp, mtmp, pm, x, y, flags) {
    // C ref: mkcorpstat calls mksobj(objtyp) then set_corpsenm.
    // For STATUE/CORPSE: mksobj(..., init, false) may pick a random
    // corpsenm before mkcorpstat's caller-supplied type overrides it.
    // RNG: next_ident from mksobj
    const otmp = mksobj(objtyp, !!(flags & 8), false);
    const oldCorpsenm = otmp.corpsenm;
    if (pm !== null && pm !== undefined) {
        set_corpsenm(otmp, pm);
        if (otmp.otyp === CORPSE && (special_corpse(oldCorpsenm) || special_corpse(otmp.corpsenm))) {
            start_corpse_timeout(otmp);
        }
    } else if (otmp.corpsenm == null) {
        // rndmonnum — pick random monster
        otmp.corpsenm = rndmonnum();
    }
    return isok(x, y) ? place_object(otmp, x, y) : otmp;
}

function monmin_difficulty(levdif) { return Math.trunc(levdif / 6); }
function monmax_difficulty(levdif) {
    const ulevel = game.u?.ulevel || 1;
    return Math.trunc((levdif + ulevel) / 2);
}

function Inhell(uz = game.u?.uz) {
    return !!game.dungeons?.[uz?.dnum ?? 0]?.flags?.hellish;
}

function is_demon_lord_or_prince(ptr) {
    return ptr?.mlet === 'S_DEMON' && !!((ptr.mflags2 ?? 0) & (M2_LORD | M2_PRINCE));
}

function noteleport_level_for(mon = null, ptr = mon?.data) {
    // C ref: teleport.c:noteleport_level(); demon courts in Gehennom block
    // teleportation for non-lord/prince monsters.
    if (Inhell() && !is_demon_lord_or_prince(ptr)) {
        if ((game.level?.monsters || []).some(m => is_demon_lord_or_prince(m.data)))
            return true;
    }
    if (game.level?.flags?.noteleport) return true;
    return false;
}

let alignShiftOldMoves = null;
let alignShiftSeed = null;
let alignShiftSpecial = null;

function align_shift(ptr) {
    const uz = game.u?.uz;
    // C ref: makemon.c:align_shift() caches Is_special(&u.uz) until moves
    // changes; same-move level generation reuses that cached special.
    if (alignShiftOldMoves !== (game.moves ?? 0) || alignShiftSeed !== game.currentSeed) {
        alignShiftSpecial = (game.specialLevels || []).find((lev) =>
            lev?.dlevel?.dnum === uz?.dnum && lev?.dlevel?.dlevel === uz?.dlevel) || null;
        alignShiftOldMoves = game.moves ?? 0;
        alignShiftSeed = game.currentSeed;
    }
    const dungeon = game.dungeons?.[uz?.dnum ?? 0];
    const align = alignShiftSpecial ? (alignShiftSpecial.flags?.align ?? A_NONE) : (dungeon?.flags?.align ?? null);
    if (align == null || align === A_NONE) return 0;
    if (align === A_LAWFUL) return Math.trunc((ptr.maligntyp + 20) / (2 * 4));
    if (align === 0) return Math.trunc((20 - Math.abs(ptr.maligntyp)) / 4);
    return Math.trunc((-(ptr.maligntyp - 20)) / (2 * 4));
}

function pm_resistance(ptr, mask) {
    return !!((ptr?.mresists ?? 0) & mask);
}

function temperature_shift(ptr) {
    const temperature = game.level?.flags?.temperature ?? 0;
    if (temperature && pm_resistance(ptr, temperature > 0 ? MR_FIRE : MR_COLD))
        return 3;
    return 0;
}

function uncommon_monster(ptr) {
    if (!ptr) return true;
    if (ptr.geno & (G_NOGEN | G_UNIQ)) return true;
    if (Inhell()) return (ptr.maligntyp ?? 0) > 0 || !!(ptr.geno & G_NOHELL);
    return !!(ptr.geno & G_HELL);
}

const QUEST_MONSTER_ROLES = new Map([
    ['Wizard', {
        enemy1num: 'VAMPIRE_BAT',
        enemy2num: 'XORN',
        enemy1sym: 'S_BAT',
        enemy2sym: 'S_WRAITH',
    }],
]);

function quest_montype_basic() {
    // C ref: questpgr.c:qt_montype().
    const roleQuest = QUEST_MONSTER_ROLES.get(game.urole?.name?.m);
    if (!roleQuest) return null;
    const primary = !!rn2(5);
    const numName = primary ? roleQuest.enemy1num : roleQuest.enemy2num;
    const sym = primary ? roleQuest.enemy1sym : roleQuest.enemy2sym;
    const qpm = monsterPtr(numName);
    if (qpm && rn2(5)) return qpm;
    return mkclass_aligned(sym, 0);
}

function rndmonst_adj(minadj = 0, maxadj = 0) {
    // C ref: makemon.c:rndmonst_adj() gives quest levels a role-specific
    // monster front door via questpgr.c:qt_montype().
    if (game.u?.uz?.dnum === game.quest_dnum && QUEST_MONSTER_ROLES.has(game.urole?.name?.m)
        && rn2(7)) {
        const qptr = quest_montype_basic();
        if (qptr) return qptr;
    }

    const zlevel = level_difficulty();
    const minmlev = monmin_difficulty(zlevel) + minadj;
    const maxmlev = monmax_difficulty(zlevel) + maxadj;
    let totalweight = 0;
    let selected = null;

    // C ref: makemon.c:rndmonst_adj() walks the mons[] table from
    // include/monsters.h and uses reservoir sampling over eligible monsters.
    for (const ptr of MONSTERS) {
        if (ptr.difficulty < minmlev || ptr.difficulty > maxmlev) continue;
        if (uncommon_monster(ptr)) continue;
        const weight = (ptr.geno & G_FREQ) + align_shift(ptr) + temperature_shift(ptr);
        if (weight <= 0) continue;
        totalweight += weight;
        if (rn2(totalweight) < weight) selected = ptr;
    }
    return selected;
}

function rndmonnum_ptr() {
    return rndmonst_adj(0, 0);
}

// rndmonnum — select a random common monster type.
function rndmonnum() {
    const ptr = rndmonnum_ptr();
    return ptr ? ptr.name : null;
}

function montoostrong(ptr, maxmlev) {
    return (ptr?.difficulty ?? 0) > maxmlev;
}

function mk_gen_ok(ptr, _mv_mask, gn_mask) {
    if (!ptr) return false;
    if (ptr.geno & gn_mask) return false;
    return !PLACEHOLDER_MONSTERS.has(ptr.name);
}

function mkclass_aligned(mlet, spc = 0, atyp = A_NONE) {
    const classMons = [];
    for (let i = 0; i < MONGEN_ORDER_LIMIT; i++) {
        const ptr = MONSTERS[MONGEN_ORDER[i]];
        if (ptr.mlet === mlet) classMons.push(ptr);
        else if (classMons.length) break;
    }
    if (!classMons.length) return null;

    const maxmlev = level_difficulty() >> 1;
    const zeroFreqForClass = MONSTERS.every(ptr => ptr.mlet !== mlet || !(ptr.geno & G_FREQ));
    let mvMask = 0x03; // G_GONE; mvitals are not modeled yet.
    if (spc & G_IGNORE) {
        mvMask = 0;
        spc &= ~G_IGNORE;
    }

    let num = 0;
    const weights = new Map();
    for (let i = 0; i < classMons.length; i++) {
        const ptr = classMons[i];
        if (atyp !== A_NONE && Math.sign(ptr.maligntyp || 0) !== Math.sign(atyp)) continue;
        let gnMask = G_NOGEN | G_UNIQ;
        if (rn2(9) || mlet === 'S_LICH') gnMask |= Inhell() ? G_NOHELL : G_HELL;
        gnMask &= ~spc;
        if (!mk_gen_ok(ptr, mvMask, gnMask)) continue;
        if (num && montoostrong(ptr, maxmlev)
            && i > 0 && ptr.difficulty > classMons[i - 1].difficulty
            && rn2(2)) {
            break;
        }
        let k = ptr.geno & G_FREQ;
        if (!k && zeroFreqForClass) k = 1;
        if (k > 0) {
            const weight = k + 1 - (adj_lev_for(ptr) > ((game.u?.ulevel ?? 1) * 2) ? 1 : 0);
            weights.set(ptr, weight);
            num += weight;
        }
    }
    if (!num) return null;

    let pick = rnd(num);
    for (const ptr of classMons) {
        const weight = weights.get(ptr) || 0;
        pick -= weight;
        if (pick <= 0) return ptr;
    }
    return null;
}

export function adj_lev_for(ptr) {
    if (!ptr) return 0;
    if (ptr.name === 'WIZARD_OF_YENDOR') {
        // C ref: makemon.c:adj_lev() keeps the Wizard at base level plus
        // prior deaths, independent of dungeon difficulty. Wizard deaths are
        // not modeled yet, so this is the initial base-level case.
        return Math.min(ptr.mlevel ?? 0, 49);
    }
    let tmp = ptr.mlevel ?? 0;
    if (tmp > 49) return 50;
    const tmp2a = level_difficulty() - tmp;
    if (tmp2a < 0) tmp--;
    else tmp += Math.trunc(tmp2a / 5);
    const tmp2b = (game.u?.ulevel ?? 1) - (ptr.mlevel ?? 0);
    if (tmp2b > 0) tmp += Math.trunc(tmp2b / 4);
    let limit = Math.trunc(3 * (ptr.mlevel ?? 0) / 2);
    if (limit > 49) limit = 49;
    return tmp > limit ? limit : (tmp > 0 ? tmp : 0);
}

export function newmonhp_state_for(ptr, monLevel = adj_lev_for(ptr)) {
    if (!ptr) return { hp: 0, level: 0 };
    const lev = monLevel;
    if (ptr.mlet === 'S_GOLEM') return { hp: lev, level: monLevel };
    if ((ptr.mlevel ?? 0) > 49) {
        const hp = 2 * (ptr.mlevel - 6);
        // C ref: makemon.c:newmonhp() stores fixed-HP special monsters
        // at an approximate level for later m_initinv() item gates.
        return { hp, level: Math.trunc(hp / 4) };
    }
    if (ptr.mlet === 'S_DRAGON' && !String(ptr.name || '').startsWith('BABY_')) {
        return { hp: 4 * lev + d(lev, 4), level: monLevel };
    }
    if (!lev) return { hp: rnd(4), level: monLevel };
    let hp = d(lev, 8);
    if (hp === lev) hp++;
    return { hp, level: monLevel };
}

export function newmonhp_for(ptr, monLevel = adj_lev_for(ptr)) {
    return newmonhp_state_for(ptr, monLevel).hp;
}

function init_mon_gender_for(ptr) {
    if (!ptr || ptr.neuter || ptr.male || ptr.female) return false;
    return !!rn2(2);
}

function pm_to_cham_for(ptr) {
    if (!ptr || !(ptr.mflags2 & M2_SHAPESHIFTER)) return null;
    return ptr;
}

function is_vampire_shifter_base(ptr) {
    return ptr?.name === 'VAMPIRE'
        || ptr?.name === 'VAMPIRE_LORD'
        || ptr?.name === 'VLAD_THE_IMPALER';
}

function is_pool_or_lava_at(x, y) {
    const typ = game.level?.at(x, y)?.typ;
    return typ != null && (IS_POOL(typ) || IS_LAVA(typ));
}

function pick_vamp_shape_for(mon) {
    const cham = mon?.cham;
    if (!cham) return null;
    let wolfchance = 10;
    if (cham.name === 'VLAD_THE_IMPALER') {
        wolfchance = 3;
    }
    if ((cham.name === 'VLAD_THE_IMPALER' || cham.name === 'VAMPIRE_LORD')
        && !rn2(wolfchance) && !is_pool_or_lava_at(mon.mx, mon.my)) {
        return monsterPtr('WOLF');
    }
    if (cham.name === 'VAMPIRE' || cham.name === 'VAMPIRE_LORD' || cham.name === 'VLAD_THE_IMPALER') {
        return !rn2(4) ? monsterPtr('FOG_CLOUD') : monsterPtr('VAMPIRE_BAT');
    }
    return null;
}

function big_to_little_shape_ptr(ptr) {
    if (!ptr) return null;
    const mapped = ({
        ARCH_LICH: 'MASTER_LICH',
        MASTER_MIND_FLAYER: 'MIND_FLAYER',
    })[ptr.name];
    return mapped ? monsterPtr(mapped) : ptr;
}

function pick_nasty_for(difcap = 0) {
    let ptr = monsterPtr(NASTY_MONSTER_NAMES[rn2(NASTY_MONSTER_NAMES.length)]);
    if (!ptr) return null;
    if (difcap > 0 && ptr.difficulty >= difcap) ptr = big_to_little_shape_ptr(ptr);
    return ptr;
}

function polyok_shape_for(ptr) {
    return !!ptr && !((ptr.mflags2 ?? 0) & M2_NOPOLY);
}

function accept_newcham_shape_for(mon, ptr) {
    if (!ptr || PLACEHOLDER_MONSTERS.has(ptr.name)) return false;
    if (MPLAYER_FORMS.has(ptr.name)) return true;
    if ((ptr.mflags2 ?? 0) & M2_SHAPESHIFTER) {
        const cham = mon?.cham;
        if (cham && ptr.name === cham.name) return true;
    }
    return polyok_shape_for(ptr);
}

function pick_sandestin_shape_for() {
    if (rn2(7)) return pick_nasty_for((monsterPtr('ARCHON')?.difficulty ?? 0) - 1);
    return null;
}

function doppel_general_shape_for() {
    for (let tryct = 5; tryct > 0; tryct--) {
        const ptr = MONSTERS[rn2(MONGEN_ORDER_LIMIT)]; // C ref: rn1(SPECIAL_PM - LOW_PM, LOW_PM)
        if (ptr && ((ptr.mflags1 ?? 0) & M1_HUMANOID) && polyok_shape_for(ptr)) {
            return ptr;
        }
    }
    return null;
}

function random_poly_shape_for(mon = null) {
    for (let tryct = 50; tryct > 0; tryct--) {
        const ptr = MONSTERS[rn2(MONGEN_ORDER_LIMIT)]; // C ref: SPECIAL_PM - LOW_PM
        if (accept_newcham_shape_for(mon, ptr)) return ptr;
    }
    return null;
}

let animalShapes = null;

function pick_animal_shape_for() {
    if (!animalShapes) {
        animalShapes = MONSTERS.slice(0, MONGEN_ORDER_LIMIT)
            .filter(ptr => (ptr.mflags1 ?? 0) & M1_ANIMAL);
    }
    if (!animalShapes.length) return null;
    return animalShapes[rn2(animalShapes.length)];
}

function pick_doppelganger_shape_for(mon) {
    if (!rn2(7)) return pick_nasty_for((monsterPtr('JABBERWOCK')?.difficulty ?? 0) - 1);
    if (rn2(3)) {
        // C ref: mon.c:select_newcham_form(), topten.c:tt_doppel().
        // The local harness has no usable score entry for this branch, so
        // tt_doppel() falls back to a random role monster after the score
        // rank probe.
        if (rn2(13)) rnd(10);
        return monsterPtr(DOPPELGANGER_ROLE_FORMS[rn2(DOPPELGANGER_ROLE_FORMS.length)]);
    }
    if (!rn2(3)) {
        return monsterPtr(DOPPELGANGER_GUARDIAN_FORMS[rn2(DOPPELGANGER_GUARDIAN_FORMS.length)]);
    }
    return doppel_general_shape_for(mon);
}

function pick_chameleon_shape_for(mon = null) {
    if (!rn2(3)) return pick_animal_shape_for();
    return random_poly_shape_for(mon);
}

export function pick_newcham_shape_for(mon) {
    for (let tryct = 20; tryct > 0; tryct--) {
        const cham = mon?.cham;
        let ptr = cham?.name === 'SANDESTIN'
            ? pick_sandestin_shape_for(mon)
            : cham?.name === 'DOPPELGANGER'
                ? pick_doppelganger_shape_for(mon)
            : cham?.name === 'CHAMELEON'
                ? pick_chameleon_shape_for(mon)
            : is_vampire_shifter_base(cham)
                ? pick_vamp_shape_for(mon)
            : null;
        if (!ptr) ptr = random_poly_shape_for(mon);
        if (accept_newcham_shape_for(mon, ptr)) return ptr;
    }
    return null;
}

function mgender_from_permonst_for(mon, ptr) {
    if (!mon || !ptr) return;
    if (ptr.male) {
        mon.female = false;
    } else if (ptr.female) {
        mon.female = true;
    } else if (!ptr.neuter) {
        // C evaluates the rn2(10) gate before noticing vampire shifters keep
        // their current gender.
        if (!rn2(10) && !(ptr.mlet === 'S_VAMPIRE' || is_vampire_shifter_base(mon.cham))) {
            mon.female = !mon.female;
        }
    }
}

function initial_shapeshift(mon, ptr) {
    const cham = pm_to_cham_for(ptr);
    if (!cham || cham.name === 'VLAD_THE_IMPALER') return false;
    mon.cham = cham;
    const shape = cham.name === 'SANDESTIN'
        ? pick_sandestin_shape_for(mon)
        : cham.name === 'DOPPELGANGER'
            ? pick_doppelganger_shape_for(mon)
        : cham.name === 'CHAMELEON'
            ? pick_chameleon_shape_for(mon)
        : is_vampire_shifter_base(cham)
            ? pick_vamp_shape_for(mon)
            : null;
    if (!shape || shape.name === ptr.name) return false;
    mgender_from_permonst_for(mon, shape);
    const monState = newmonhp_state_for(shape);
    mon.data = { ...shape, mmove: shape.mmove ?? 12 };
    mon.ch = MONSTER_SYMBOLS[shape.mlet] ?? 'm';
    mon.color = shape.color ?? 15;
    mon.m_lev = monState.level;
    mon.mhp = monState.hp;
    mon.mhpmax = monState.hp;
    return true;
}

function rndghostname() {
    if (rn2(7)) return GHOST_NAMES[rn2(GHOST_NAMES.length)];
    return game.plname || game.u?.name || 'wizard';
}

// C ref: do_name.c:roguename()
function roguename() {
    return rn2(3)
        ? (rn2(2) ? 'Michael Toy' : 'Kenneth Arnold')
        : 'Glenn Wichman';
}

function m_initinv_for(ptr, mon = null) {
    if (!ptr) return;
    if (rogue_level_active()) return;
    const monLevel = mon?.m_lev ?? adj_lev_for(ptr);
    if (ptr.msound === MS_PRIEST) {
        if (rn2(7)) mksobj(ROBE, true, false);
        mksobj(SMALL_SHIELD, true, false);
        const amount = rn1(10, 20);
        const gold = mksobj(GOLD_PIECE, false, false);
        gold.quan = amount;
    }
    if (ptr.mlet === 'S_GNOME' && !rn2((In_mines(game.u?.uz) && game.in_mklev) ? 20 : 60)) {
        mksobj(rn2(4) ? TALLOW_CANDLE : WAX_CANDLE, true, false);
    }
    if (ptr.mlet === 'S_NYMPH') {
        if (!rn2(2)) mksobj(MIRROR, true, false);
        if (!rn2(2)) mksobj(POT_OBJECT_DETECTION, true, false);
    }
    if (ptr.mlet === 'S_GIANT') {
        if (ptr.name === 'MINOTAUR') {
            const uz = game.u?.uz || {};
            const earth = game.earth_level
                && uz.dnum === game.earth_level.dnum && uz.dlevel === game.earth_level.dlevel;
            if (!rn2(8) || (game.in_mklev && earth)) mksobj(WAN_DIGGING, true, false);
        } else if (ptr.mflags2 & M2_GIANT) {
            for (let cnt = rn2(Math.trunc(monLevel / 2)); cnt > 0; cnt--) {
                const otmp = mksobj(rnd_class(DILITHIUM_CRYSTAL, LUCKSTONE - 1), false, false);
                otmp.quan = rn1(2, 3);
                otmp.owt = Math.max(1, otmp.quan);
            }
        }
    }
    if (ptr.mlet === 'S_WRAITH' && ptr.name === 'NAZGUL') {
        const ring = mksobj(RIN_INVISIBILITY, false, false);
        if (ring) curse(ring);
    }
    if (ptr.mlet === 'S_LICH') {
        if (ptr.name === 'MASTER_LICH' && !rn2(13)) {
            mksobj(rn2(7) ? ATHAME : WAN_NOTHING, true, false);
        } else if (ptr.name === 'ARCH_LICH' && !rn2(3)) {
            const otmp = mksobj(rn2(3) ? ATHAME : QUARTERSTAFF, true, !rn2(13));
            if (otmp) {
                if ((otmp.spe ?? 0) < 2) otmp.spe = rnd(3);
                if (!rn2(4)) otmp.oerodeproof = true;
            } else {
                rnd(3);
                rn2(4);
            }
        }
    }
    if (ptr.mlet === 'S_QUANTMECH') {
        if (!rn2(20)) {
            mksobj(LARGE_BOX, false, false);
            mksobj(CORPSE, true, false);
        }
    }
    if (ptr.mlet === 'S_MUMMY') {
        if (rn2(7)) mksobj(MUMMY_WRAPPING, true, false);
    }
    if (ptr.mlet === 'S_LEPRECHAUN') {
        d(level_difficulty(), 30);
        mksobj(GOLD_PIECE, false, false);
    }
    if (ptr.mlet === 'S_DEMON') {
        // C ref: makemon.c:m_initinv() gives Asmodeus wands despite no weapon attack.
        if (ptr.name === 'ASMODEUS') {
            mksobj(WAN_COLD, true, false);
            mksobj(WAN_FIRE, true, false);
        } else if (ptr.name === 'ICE_DEVIL' && !rn2(4)) {
            mksobj(SPEAR, true, false);
        }
    }
    if (is_mercenary_for(ptr)) {
        let mac = 0;
        switch (ptr.name) {
        case 'GUARD': mac = -1; break;
        case 'SOLDIER':
        case 'WATCHMAN': mac = 3; break;
        case 'SERGEANT': mac = 0; break;
        case 'LIEUTENANT':
        case 'WATCH_CAPTAIN': mac = -2; break;
        case 'CAPTAIN': mac = -3; break;
        default: mac = 0; break;
        }
        const armorBaseBonus = (otyp) => ({
            [PLATE_MAIL]: 7,
            [CRYSTAL_PLATE_MAIL]: 7,
            [SPLINT_MAIL]: 6,
            [BANDED_MAIL]: 6,
            [STUDDED_LEATHER_ARMOR]: 3,
            [RING_MAIL]: 3,
            [LEATHER_ARMOR]: 2,
            [HELMET]: 1,
            [DENTED_POT]: 1,
            [SMALL_SHIELD]: 1,
            [LARGE_SHIELD]: 2,
            [LOW_BOOTS]: 1,
            [HIGH_BOOTS]: 2,
            [LEATHER_GLOVES]: 1,
            [LEATHER_CLOAK]: 1,
        })[otyp] || 0;
        const armorBonus = (otmp) => {
            const base = armorBaseBonus(otmp?.otyp);
            const erosion = Math.max(otmp?.oeroded ?? 0, otmp?.oeroded2 ?? 0);
            return base + (otmp?.spe ?? 0) - Math.min(erosion, base);
        };
        const addArmor = (otyp) => {
            if (!otyp) return;
            const otmp = mksobj(otyp, true, false);
            mac += armorBonus(otmp);
        };
        if (mac < -1 && rn2(5)) addArmor(rn2(5) ? PLATE_MAIL : CRYSTAL_PLATE_MAIL);
        else if (mac < 3 && rn2(5)) addArmor(rn2(3) ? SPLINT_MAIL : BANDED_MAIL);
        else if (rn2(5)) addArmor(rn2(3) ? RING_MAIL : STUDDED_LEATHER_ARMOR);
        else addArmor(LEATHER_ARMOR);

        if (mac < 10 && rn2(3)) addArmor(HELMET);
        else if (mac < 10 && rn2(2)) addArmor(DENTED_POT);
        if (mac < 10 && rn2(3)) addArmor(SMALL_SHIELD);
        else if (mac < 10 && rn2(2)) addArmor(LARGE_SHIELD);
        if (mac < 10 && rn2(3)) addArmor(LOW_BOOTS);
        else if (mac < 10 && rn2(2)) addArmor(HIGH_BOOTS);
        if (mac < 10 && rn2(3)) addArmor(LEATHER_GLOVES);
        else if (mac < 10 && rn2(2)) addArmor(LEATHER_CLOAK);

        if (ptr.name === 'WATCH_CAPTAIN') {
            // Better weapon rather than extra gear here.
        } else if (ptr.name === 'WATCHMAN') {
            if (rn2(3)) mksobj(TIN_WHISTLE, true, false);
        } else if (ptr.name === 'GUARD') {
            mksobj(TIN_WHISTLE, true, false);
        } else {
            if (!rn2(3)) mksobj(K_RATION, true, false);
            if (!rn2(2)) mksobj(C_RATION, true, false);
            if (ptr.name !== 'SOLDIER' && !rn2(3)) mksobj(BUGLE, true, false);
        }
    }
    if (ptr.name === 'SHOPKEEPER') {
        mksobj(SKELETON_KEY, true, false);
        switch (rn2(4)) {
        case 0:
            mksobj(WAN_MAGIC_MISSILE, true, false);
        case 1:
            mksobj(POT_EXTRA_HEALING, true, false);
        case 2:
            mksobj(POT_HEALING, true, false);
        case 3:
            mksobj(WAN_STRIKING, true, false);
        }
    }
    if (ptr.name === 'SOLDIER' && rn2(13)) return;
    if (monLevel > rn2(50)) {
        const defensive = rnd_defensive_item_for(ptr, mon);
        if (defensive) mksobj(defensive, true, false);
    }
    if (monLevel > rn2(100)) {
        const misc = rnd_misc_item_for(ptr, mon);
        if (misc) mksobj(misc, true, false);
    }
    if ((ptr.mflags2 & M2_GREEDY) && !game._monster_init_has_gold) {
        if (!rn2(5)) {
            d(level_difficulty(), game._monster_init_item_count ? 5 : 10);
            mksobj(GOLD_PIECE, false, false);
        }
    }
}

function nonliving_for(ptr) {
    if (!ptr) return false;
    return !!((ptr.mflags2 & M2_UNDEAD) || ptr.name === 'MANES'
        || ptr.mlet === 'S_GOLEM' || ptr.mlet === 'S_VORTEX');
}

function hero_sees_invisible() {
    return !!(game.u?.see_invisible || game.u?.See_invisible || game.u?.uinvis_aware);
}

function rnd_misc_item_for(ptr, mon = null) {
    if ((ptr?.mflags1 ?? 0) & (M1_ANIMAL | M1_MINDLESS)) return 0;
    if (ptr?.mlet === 'S_GHOST' || ptr?.mlet === 'S_KOP') return 0;
    const difficulty = ptr?.difficulty ?? 0;
    if (difficulty < 6 && !rn2(30)) {
        return rn2(6) ? POT_POLYMORPH : WAN_POLYMORPH;
    }
    if (!rn2(40) && !nonliving_for(ptr) && ptr?.mlet !== 'S_VAMPIRE') {
        return AMULET_OF_LIFE_SAVING;
    }
    switch (rn2(3)) {
    case 0:
        if (mon?.isgd) return 0;
        return rn2(6) ? POT_SPEED : WAN_SPEED_MONSTER;
    case 1:
        if (mon?.mpeaceful && !hero_sees_invisible()) return 0;
        return rn2(6) ? POT_INVISIBILITY : WAN_MAKE_INVISIBLE;
    case 2:
        return POT_GAIN_LEVEL;
    default:
        return 0;
    }
}

function rnd_defensive_item_for(ptr, mon = null) {
    if ((ptr?.mflags1 ?? 0) & (M1_ANIMAL | M1_MINDLESS)) return 0;
    if (ptr?.mlet === 'S_GHOST' || ptr?.mlet === 'S_KOP') return 0;
    const difficulty = ptr?.difficulty ?? 0;
    let trycnt = 0;
    for (;;) {
        switch (rn2(8 + (difficulty > 3 ? 1 : 0) + (difficulty > 6 ? 1 : 0) + (difficulty > 8 ? 1 : 0))) {
        case 6:
        case 9:
            if (noteleport_level_for(mon, ptr) && ++trycnt < 2) continue;
            if (!rn2(3)) return WAN_TELEPORTATION;
            return SCR_TELEPORTATION;
        case 0:
        case 1:
            return SCR_TELEPORTATION;
        case 8:
        case 10:
            if (!rn2(3)) return WAN_CREATE_MONSTER;
            return SCR_CREATE_MONSTER;
        case 2:
            return SCR_CREATE_MONSTER;
        case 3:
            return POT_HEALING;
        case 4:
            return POT_EXTRA_HEALING;
        case 5:
            return ptr?.name !== 'PESTILENCE' ? POT_FULL_HEALING : POT_SICKNESS;
        case 7:
            if (isSokobanLevel() && rn2(4)) continue;
            if (mon?.isshk || mon?.isgd || mon?.ispriest) return 0;
            return WAN_DIGGING;
        default:
            return 0;
        }
    }
}

function m_initthrow_for(otyp, oquan) {
    const otmp = mksobj(otyp, true, false);
    // C ref: makemon.c:m_initthrow() sets stack quantity from rn1(oquan, 3).
    otmp.quan = rn1(oquan, 3);
    otmp.owt = Math.max(1, otmp.quan);
}

function is_armed_for(ptr) {
    return !!ptr?.mattk?.some((atk) => atk && atk[0] === 'AT_WEAP');
}

function is_mercenary_for(ptr) {
    return ['GUARD', 'SOLDIER', 'SERGEANT', 'LIEUTENANT', 'CAPTAIN', 'WATCHMAN', 'WATCH_CAPTAIN']
        .includes(ptr?.name);
}

function is_elf_mon(ptr) {
    return ptr?.mlet === 'S_HUMAN' && (ptr.name?.includes('ELF') || ptr.name?.includes('ELVEN'));
}

function maybe_init_offensive_item_for(ptr) {
    if (adj_lev_for(ptr) > rn2(75)) {
        const offensive = rnd_offensive_item_for(ptr);
        if (offensive) mksobj(offensive, true, false);
    }
}

function rnd_offensive_item_for(ptr) {
    if (!ptr) return 0;
    if ((ptr.mflags1 ?? 0) & (M1_ANIMAL | M1_MINDLESS)) return 0;
    if (ptr.mattk?.some((atk) => atk && atk[0] === 'AT_EXPL')) return 0;
    if (ptr.mlet === 'S_GHOST' || ptr.mlet === 'S_KOP') return 0;
    const difficulty = ptr.difficulty ?? 0;
    if (difficulty > 7 && !rn2(35)) return WAN_DEATH;
    switch (rn2(9 - (difficulty < 4 ? 1 : 0) + 4 * (difficulty > 6 ? 1 : 0))) {
    case 0:
        if ((ptr.mflags1 ?? 0) & M1_UNSOLID) return SCR_EARTH;
    case 1:
        return WAN_STRIKING;
    case 2:
        return POT_ACID;
    case 3:
        return POT_CONFUSION;
    case 4:
        return POT_BLINDNESS;
    case 5:
        return POT_SLEEPING;
    case 6:
        return POT_PARALYSIS;
    case 7:
    case 8:
        return WAN_MAGIC_MISSILE;
    case 9:
        return WAN_SLEEP;
    case 10:
        return WAN_FIRE;
    case 11:
        return WAN_COLD;
    case 12:
        return WAN_LIGHTNING;
    default:
        return 0;
    }
}

function m_initweap_general_for(ptr) {
    const flags = ptr?.mflags2 ?? 0;
    const bias = ((flags & M2_LORD) ? 1 : 0)
        + ((flags & M2_PRINCE) ? 2 : 0)
        + ((flags & M2_NASTY) ? 1 : 0);
    const pick = rnd(14 - (2 * bias));
    const strong = !!(flags & M2_STRONG);
    switch (pick) {
    case 1:
        if (strong) mksobj(BATTLE_AXE, true, false);
        else m_initthrow_for(DART, 12);
        break;
    case 2:
        if (strong) mksobj(TWO_HANDED_SWORD, true, false);
        else {
            mksobj(CROSSBOW, true, false);
            m_initthrow_for(CROSSBOW_BOLT, 12);
        }
        break;
    case 3:
        mksobj(BOW, true, false);
        m_initthrow_for(ARROW, 12);
        break;
    case 4:
        if (strong) mksobj(LONG_SWORD, true, false);
        else m_initthrow_for(DAGGER, 3);
        break;
    case 5:
        if (strong) mksobj(LUCERN_HAMMER, true, false);
        else mksobj(AKLYS, true, false);
        break;
    default:
        break;
    }
    maybe_init_offensive_item_for(ptr);
}

function m_initweap_for(ptr) {
    if (!ptr) return;
    if (ptr.name === 'SHOPKEEPER') {
        maybe_init_offensive_item_for(ptr);
        return;
    }
    if (ptr.msound === MS_PRIEST) {
        const mace = mksobj(MACE, false, false);
        mace.spe = rnd(3);
        if (!rn2(2)) curse(mace);
        maybe_init_offensive_item_for(ptr);
        return;
    }
    if (ptr.mlet === 'S_DEMON') {
        switch (ptr.name) {
        case 'BALROG':
            mksobj(BULLWHIP, true, false);
            mksobj(BROADSWORD, true, false);
            break;
        case 'ORCUS':
            mksobj(WAN_DEATH, true, false);
            break;
        case 'HORNED_DEVIL':
            mksobj(rn2(4) ? TRIDENT : BULLWHIP, true, false);
            break;
        case 'DISPATER':
            mksobj(WAN_STRIKING, true, false);
            break;
        case 'YEENOGHU':
            mksobj(FLAIL, true, false);
            break;
        }
        if (ptr.mflags2 & M2_DEMON) m_initweap_general_for(ptr);
        else maybe_init_offensive_item_for(ptr);
        return;
    }
    if (ptr.mlet === 'S_ANGEL' && ptr.name !== 'KI_RIN') {
        const typ = rn2(3) ? LONG_SWORD : SILVER_MACE;
        const weapon = mksobj(typ, false, false);
        rn2(20); // artifact-promotion gate; artifact naming has no RNG here.
        if (weapon) {
            weapon.blessed = true;
            weapon.cursed = false;
            weapon.oerodeproof = true;
            weapon.spe = rn2(4) + (typ === SILVER_MACE ? 3 : 0);
        } else {
            rn2(4);
        }
        const shieldTyp = (!rn2(4) || (ptr.mflags2 & M2_LORD))
            ? SHIELD_OF_REFLECTION
            : LARGE_SHIELD;
        const shield = mksobj(shieldTyp, false, false);
        if (shield) {
            shield.oerodeproof = true;
            shield.spe = 0;
        }
        maybe_init_offensive_item_for(ptr);
        return;
    }
    if (ptr.mlet === 'S_GIANT') {
        if (rn2(2)) mksobj(ptr.name !== 'ETTIN' ? BOULDER : CLUB, true, false);
        if (ptr.name !== 'ETTIN' && !rn2(5)) {
            mksobj(rn2(2) ? TWO_HANDED_SWORD : BATTLE_AXE, true, false);
        }
        maybe_init_offensive_item_for(ptr);
        return;
    }
    if (is_mercenary_for(ptr)) {
        let w1 = 0, w2 = 0;
        if (ptr.name === 'SOLDIER' || ptr.name === 'WATCHMAN') {
            if (!rn2(3)) {
                w1 = PARTISAN + rn2(12);
                w2 = rn2(2) ? DAGGER : KNIFE;
            } else {
                w1 = rn2(2) ? SPEAR : SHORT_SWORD;
            }
        } else if (ptr.name === 'SERGEANT') {
            w1 = rn2(2) ? FLAIL : MACE;
        } else if (ptr.name === 'LIEUTENANT') {
            w1 = rn2(2) ? BROADSWORD : LONG_SWORD;
        } else if (ptr.name === 'CAPTAIN' || ptr.name === 'WATCH_CAPTAIN') {
            w1 = rn2(2) ? LONG_SWORD : SILVER_SABER;
        } else {
            if (!rn2(4)) w1 = DAGGER;
            if (!rn2(7)) w2 = SPEAR;
        }
        if (w1) mksobj(w1, true, false);
        if (!w2 && w1 !== DAGGER && !rn2(4)) w2 = KNIFE;
        if (w2) mksobj(w2, true, false);
        maybe_init_offensive_item_for(ptr);
        return;
    }
    if (is_elf_mon(ptr)) {
        if (rn2(2)) mksobj(rn2(2) ? ELVEN_MITHRIL_COAT : ELVEN_CLOAK, true, false);
        if (rn2(2)) mksobj(ELVEN_LEATHER_HELM, true, false);
        else if (!rn2(4)) mksobj(ELVEN_BOOTS, true, false);
        if (rn2(2)) mksobj(ELVEN_DAGGER, true, false);
        switch (rn2(3)) {
        case 0:
            if (!rn2(4)) mksobj(ELVEN_SHIELD, true, false);
            if (rn2(3)) mksobj(ELVEN_SHORT_SWORD, true, false);
            mksobj(ELVEN_BOW, true, false);
            m_initthrow_for(ELVEN_ARROW, 12);
            break;
        case 1:
            mksobj(ELVEN_BROADSWORD, true, false);
            if (rn2(2)) mksobj(ELVEN_SHIELD, true, false);
            break;
        case 2:
            if (rn2(2)) {
                mksobj(ELVEN_SPEAR, true, false);
                mksobj(ELVEN_SHIELD, true, false);
            }
            break;
        }
        if (ptr.name === 'ELVENKING') {
            if (rn2(3)) mksobj(PICK_AXE, true, false);
            if (!rn2(50)) mksobj(CRYSTAL_BALL, true, false);
        }
        maybe_init_offensive_item_for(ptr);
        return;
    }
    if (ptr.mlet === 'S_HUMAN' && (ptr.mflags2 & M2_WERE)) {
        maybe_init_offensive_item_for(ptr);
        return;
    }
    if (ptr.msound === MS_GUARDIAN) {
        // C ref: makemon.c:m_initweap(); Wizard quest apprentices use the
        // generic student/attendant/guide guardian kit.
        if (ptr.name === 'APPRENTICE') {
            if (rn2(2)) mksobj(rn2(3) ? DAGGER : KNIFE, true, false);
            if (rn2(5)) mksobj(rn2(3) ? LEATHER_JACKET : LEATHER_CLOAK, true, false);
            if (rn2(3)) mksobj(rn2(3) ? LOW_BOOTS : HIGH_BOOTS, true, false);
            if (rn2(3)) mksobj(POT_HEALING, true, false);
        }
        maybe_init_offensive_item_for(ptr);
        return;
    }
    if (ptr.name === 'HOBBIT') {
        switch (rn2(3)) {
        case 0:
            mksobj(DAGGER, true, false);
            break;
        case 1:
            mksobj(ELVEN_DAGGER, true, false);
            break;
        case 2:
            mksobj(SLING, true, false);
            m_initthrow_for(!rn2(4) ? FLINT : ROCK, 6);
            break;
        }
        if (!rn2(10)) mksobj(ELVEN_MITHRIL_COAT, true, false);
        if (!rn2(10)) mksobj(DWARVISH_CLOAK, true, false);
        maybe_init_offensive_item_for(ptr);
        return;
    }
    if (ptr.mlet === 'S_HUMANOID' && (ptr.mflags2 & M2_DWARF)) {
        if (rn2(7)) mksobj(DWARVISH_CLOAK, true, false);
        if (rn2(7)) mksobj(IRON_SHOES, true, false);
        if (!rn2(4)) {
            mksobj(DWARVISH_SHORT_SWORD, true, false);
            if (rn2(2)) {
                mksobj(DWARVISH_MATTOCK, true, false);
            } else {
                mksobj(rn2(2) ? AXE : DWARVISH_SPEAR, true, false);
                mksobj(DWARVISH_ROUNDSHIELD, true, false);
            }
            mksobj(DWARVISH_IRON_HELM, true, false);
            if (!rn2(3)) mksobj(DWARVISH_MITHRIL_COAT, true, false);
        } else {
            mksobj(!rn2(3) ? PICK_AXE : DAGGER, true, false);
        }
        maybe_init_offensive_item_for(ptr);
        return;
    }
    if (ptr.mlet === 'S_KOP') {
        if (!rn2(4)) m_initthrow_for(CREAM_PIE, 2);
        if (!rn2(3)) mksobj(rn2(2) ? CLUB : RUBBER_HOSE, true, false);
        maybe_init_offensive_item_for(ptr);
        return;
    }
    if (ptr.mlet === 'S_KOBOLD') {
        if (!rn2(4)) {
            m_initthrow_for(DART, 12);
        }
        if (adj_lev_for(ptr) > rn2(75)) {
            // rnd_offensive_item() is not modeled yet.
        }
        return;
    }
    if (ptr.mlet === 'S_CENTAUR') {
        if (rn2(2)) {
            if (ptr.name === 'FOREST_CENTAUR') {
                mksobj(BOW, true, false);
                m_initthrow_for(ARROW, 12);
            } else {
                mksobj(CROSSBOW, true, false);
                m_initthrow_for(CROSSBOW_BOLT, 12);
            }
        }
        maybe_init_offensive_item_for(ptr);
        return;
    }
    if (ptr.mlet === 'S_TROLL') {
        if (!rn2(2)) {
            switch (rn2(4)) {
            case 0:
                mksobj(RANSEUR, true, false);
                break;
            case 1:
                mksobj(PARTISAN, true, false);
                break;
            case 2:
                mksobj(GLAIVE, true, false);
                break;
            case 3:
                mksobj(SPETUM, true, false);
                break;
            }
        }
        maybe_init_offensive_item_for(ptr);
        return;
    }
    if (ptr.mlet === 'S_WRAITH') {
        mksobj(KNIFE, true, false);
        mksobj(LONG_SWORD, true, false);
        maybe_init_offensive_item_for(ptr);
        return;
    }
    if (ptr.mlet === 'S_ZOMBIE') {
        if (!rn2(4)) mksobj(LEATHER_ARMOR, true, false);
        if (!rn2(4)) mksobj(rn2(3) ? KNIFE : SHORT_SWORD, true, false);
        maybe_init_offensive_item_for(ptr);
        return;
    }
    if (ptr.mlet === 'S_LIZARD') {
        if (ptr.name === 'SALAMANDER') {
            mksobj(rn2(7) ? SPEAR : (rn2(3) ? TRIDENT : STILETTO), true, false);
        }
        maybe_init_offensive_item_for(ptr);
        return;
    }
    if (ptr.mlet === 'S_OGRE') {
        const divisor = ptr.name === 'OGRE_KING' ? 3 : ptr.name === 'OGRE_LORD' ? 6 : 12;
        if (!rn2(divisor)) mksobj(BATTLE_AXE, true, false);
        else mksobj(CLUB, true, false);
        maybe_init_offensive_item_for(ptr);
        return;
    }
    if (ptr.mlet === 'S_GNOME') {
        m_initweap_general_for(ptr);
        return;
    }
    if (ptr.mlet === 'S_VAMPIRE') {
        m_initweap_general_for(ptr);
        return;
    }
    if (ptr.mlet === 'S_GOLEM') {
        m_initweap_general_for(ptr);
        return;
    }
    if (ptr.mlet === 'S_HUMANOID') {
        maybe_init_offensive_item_for(ptr);
        return;
    }
    if (ptr.mlet !== 'S_ORC') {
        maybe_init_offensive_item_for(ptr);
        return;
    }
    if (rn2(2)) mksobj(ORCISH_HELM, true, false);
    let orcKind = ptr.name;
    if (orcKind === 'ORC_CAPTAIN') orcKind = rn2(2) ? 'MORDOR_ORC' : 'URUK_HAI';
    switch (orcKind) {
    case 'MORDOR_ORC':
        if (!rn2(3)) mksobj(SCIMITAR, true, false);
        if (!rn2(3)) mksobj(ORCISH_SHIELD, true, false);
        if (!rn2(3)) mksobj(KNIFE, true, false);
        if (!rn2(3)) mksobj(ORCISH_CHAIN_MAIL, true, false);
        break;
    case 'URUK_HAI':
        if (!rn2(3)) mksobj(ORCISH_CLOAK, true, false);
        if (!rn2(3)) mksobj(ORCISH_SHORT_SWORD, true, false);
        if (!rn2(3)) mksobj(IRON_SHOES, true, false);
        if (!rn2(3)) {
            mksobj(ORCISH_BOW, true, false);
            m_initthrow_for(ORCISH_ARROW, 12);
        }
        if (!rn2(3)) mksobj(URUK_HAI_SHIELD, true, false);
        break;
    default:
        if (orcKind !== 'ORC_SHAMAN' && rn2(2)) {
            mksobj((orcKind === 'GOBLIN' || rn2(2) === 0) ? ORCISH_DAGGER : SCIMITAR, true, false);
        }
        break;
    }
    maybe_init_offensive_item_for(ptr);
}

function peace_minded_for(ptr) {
    const mal = ptr?.maligntyp ?? 0;
    const ual = game.u?.ualign?.type ?? 0;
    const mflags2 = ptr?.mflags2 ?? 0;
    if (mflags2 & M2_PEACEFUL) return true;
    if (mflags2 & M2_HOSTILE) return false;
    if (ptr?.msound === MS_LEADER || ptr?.msound === MS_GUARDIAN) return true;
    if (ptr?.msound === MS_NEMESIS) return false;
    if (ptr?.name === 'ERINYS') return !game.u?.ualign?.abuse;
    if (mflags2 & race_lovemask()) return true;
    if (mflags2 & race_hatemask()) return false;
    if (Math.sign(mal) !== Math.sign(ual)) return false;
    if (mal < 0 && game.u?.uhave?.amulet) return false;
    if (mflags2 & M2_MINION) return (game.u?.ualign?.record ?? 0) >= 0;
    return !!rn2(16 + Math.max(game.u?.ualign?.record ?? 0, -15))
        && !!rn2(2 + Math.abs(mal));
}

function race_masks() {
    switch (game.urace?.name || game.urace?.adj || game._nhopts?.race || 'human') {
    case 'elf':
    case 'elven':
        return { self: M2_ELF, love: M2_ELF, hate: M2_ORC };
    case 'dwarf':
    case 'dwarven':
        return { self: M2_DWARF, love: M2_DWARF | M2_GNOME, hate: M2_ORC };
    case 'gnome':
    case 'gnomish':
        return { self: M2_GNOME, love: M2_DWARF | M2_GNOME, hate: M2_HUMAN };
    case 'orc':
    case 'orcish':
        return { self: M2_ORC, love: 0, hate: M2_HUMAN | M2_ELF | M2_DWARF };
    case 'human':
    default:
        return { self: M2_HUMAN, love: 0, hate: M2_GNOME | M2_ORC };
    }
}

function race_lovemask() {
    return game.urace?.lovemask ?? race_masks().love;
}

function race_hatemask() {
    return game.urace?.hatemask ?? race_masks().hate;
}

function room_type_at(x, y) {
    const roomno = (game.level?.at(x, y)?.roomno ?? 0) - ROOMOFFSET;
    return roomno >= 0 ? game.level?.rooms?.[roomno]?.rtype : 0;
}

function set_mimic_sym(mon) {
    if (!mon) return;

    function can_be_hatched(ptr) {
        return !!ptr && !(ptr.geno & G_NOCORPSE);
    }

    function assignMonsterBasedObjectShape() {
        if (mon.m_ap_type !== M_AP_OBJECT
            || ![STATUE, FIGURINE, CORPSE, EGG, TIN].includes(mon.mappearance)) return;
        let mndx = rndmonnum();
        const ptr = monsterPtr(mndx);
        const nocorpse = !!(ptr?.geno & G_NOCORPSE);
        if (mon.mappearance === CORPSE && nocorpse) {
            // C ref: makemon.c:set_mimic_sym() falls back to a role monster
            // shape when a corpse appearance selected a no-corpse monster.
            mndx = rn1(13, 0);
        } else if ((mon.mappearance === EGG && !can_be_hatched(ptr))
            || (mon.mappearance === TIN && nocorpse)) {
            mndx = null;
        }
        mon.mcorpsenm = mndx;
    }

    const x = mon.mx, y = mon.my;
    const loc = game.level?.at(x, y);
    const obj = (game.level?.objects || []).find(o => o.ox === x && o.oy === y);
    if (obj) {
        mon.m_ap_type = M_AP_OBJECT;
        mon.mappearance = obj.otyp;
        assignMonsterBasedObjectShape();
        return;
    }
    if (loc && (IS_DOOR(loc.typ) || IS_WALL(loc.typ) || loc.typ === SDOOR || loc.typ === SCORR)) {
        mon.m_ap_type = M_AP_FURNITURE;
        mon.mappearance = loc.typ;
        return;
    }
    if (game.level?.flags?.is_maze_lev
        && !(In_mines(game.u?.uz) && game.level?.flags?.has_town)
        && !isSokobanLevel() && rn2(2)) {
        mon.m_ap_type = M_AP_OBJECT;
        mon.mappearance = STATUE;
        assignMonsterBasedObjectShape();
        return;
    }
    if (((loc?.roomno ?? 0) - ROOMOFFSET) < 0 && !(game.level?.traps || []).some(t => t.tx === x && t.ty === y)) {
        mon.m_ap_type = M_AP_OBJECT;
        mon.mappearance = BOULDER;
        return;
    }
    const rt = room_type_at(x, y);
    if (rt === ZOO || rt === VAULT) {
        mon.m_ap_type = M_AP_OBJECT;
        mon.mappearance = GOLD_PIECE;
        return;
    }
    if (rt === DELPHI) {
        if (rn2(2)) {
            mon.m_ap_type = M_AP_OBJECT;
            mon.mappearance = STATUE;
        } else {
            mon.m_ap_type = M_AP_FURNITURE;
            mon.mappearance = FOUNTAIN;
        }
        return;
    }
    if (rt >= SHOPBASE) {
        if (rn2(10) >= depth_of_level(game.u?.uz)) {
            mon.m_ap_type = M_AP_OBJECT;
            mon.mappearance = STRANGE_OBJECT;
            return;
        }
        let s_sym = get_shop_item(rt - SHOPBASE);
        if (s_sym < 0) {
            mon.m_ap_type = M_AP_OBJECT;
            mon.mappearance = -s_sym;
            assignMonsterBasedObjectShape();
            return;
        }
        if (s_sym === RANDOM_CLASS || s_sym > ROCK_CLASS) {
            // C ref: makemon.c:set_mimic_sym() chooses
            // syms[rn2(SIZE(syms) - 2) + 2], excluding only furniture.
            const syms = [
                RING_CLASS, WAND_CLASS, WEAPON_CLASS, FOOD_CLASS, COIN_CLASS,
                SCROLL_CLASS, POTION_CLASS, ARMOR_CLASS, AMULET_CLASS,
                TOOL_CLASS, ROCK_CLASS, GEM_CLASS, SPBOOK_CLASS,
                MIMIC_STRANGE_OBJECT, MIMIC_STRANGE_OBJECT,
            ];
            s_sym = syms[rn2(syms.length)];
        }
        mon.m_ap_type = M_AP_OBJECT;
        if (s_sym === MIMIC_STRANGE_OBJECT) mon.mappearance = STRANGE_OBJECT;
        else if (s_sym === COIN_CLASS) mon.mappearance = GOLD_PIECE;
        else mon.mappearance = mkobj(s_sym, false)?.otyp ?? STRANGE_OBJECT;
        assignMonsterBasedObjectShape();
        return;
    }

    // C ref: makemon.c:set_mimic_sym(), default room symbol table.
    const syms = [
        MIMIC_FURNITURE_CLASS, MIMIC_FURNITURE_CLASS, RING_CLASS, WAND_CLASS,
        WEAPON_CLASS, FOOD_CLASS, COIN_CLASS, SCROLL_CLASS, POTION_CLASS,
        ARMOR_CLASS, AMULET_CLASS, TOOL_CLASS, ROCK_CLASS, GEM_CLASS,
        SPBOOK_CLASS, MIMIC_STRANGE_OBJECT, MIMIC_STRANGE_OBJECT,
    ];
    const s_sym = syms[rn2(syms.length)];
    if (s_sym === MIMIC_FURNITURE_CLASS) {
        const furnsyms = [STAIRS, STAIRS, STAIRS, STAIRS, ALTAR, GRAVE, FOUNTAIN, SINK];
        mon.m_ap_type = M_AP_FURNITURE;
        mon.mappearance = furnsyms[rn2(furnsyms.length)];
    } else {
        mon.m_ap_type = M_AP_OBJECT;
        if (s_sym === MIMIC_STRANGE_OBJECT) {
            mon.mappearance = STRANGE_OBJECT;
        } else if (s_sym === COIN_CLASS) {
            mon.mappearance = GOLD_PIECE;
        } else {
            const otmp = mkobj(s_sym, false);
            mon.mappearance = otmp?.otyp ?? STRANGE_OBJECT;
        }
    }
    assignMonsterBasedObjectShape();
}

function m_initgrp(mon, x, y, n, mmflags) {
    let cnt = rnd(n);
    const ulev = game.u?.ulevel ?? 1;
    cnt = Math.trunc(cnt / (ulev < 3 ? 4 : ulev < 5 ? 2 : 1));
    if (!cnt) cnt++;

    let origin = { x, y };
    while (cnt-- > 0) {
        if (peace_minded_for(mon.data)) continue;
        const cc = enexto_core(origin.x, origin.y, mon.data, mmflags);
        if (!cc) continue;
        origin = cc;
        const created = makemon(mon.data, cc.x, cc.y, mmflags | MM_NOGRP);
        if (created?.then) {
            // makemon has no asynchronous boundary before side effects, but
            // keep the call browser-safe if that ever changes.
        }
        const head = game.level?.monsters?.[0];
        if (head && head.data?.name === mon.data?.name && head.mx === cc.x && head.my === cc.y) {
            head.mpeaceful = 0;
        }
    }
}

function pm_invisible_ptr(ptr) {
    // C ref: mondata.h:pm_invisible().
    return ptr?.name === 'STALKER' || ptr?.name === 'BLACK_LIGHT';
}

function mon_set_minvis(mon, cursedPotion = false) {
    // C ref: worn.c:mon_set_minvis().
    if (!mon) return;
    mon.perminvis = cursedPotion ? 0 : 1;
    if (!mon.invis_blkd) mon.minvis = mon.perminvis;
}

function init_mstrategy_for(mon, ptr, mmflags) {
    // C ref: makemon.c:makemon() initializes mstrategy from mflags3 unless
    // MM_NOWAIT suppresses the initial waiting/covetous strategy.
    const flags = ptr?.mflags3 ?? 0;
    if (!mon || !flags || (mmflags & MM_NOWAIT)) return;
    if (flags & M3_WAITFORU) mon.mstrategy |= STRAT_WAITFORU;
    if (flags & M3_CLOSE) mon.mstrategy |= STRAT_CLOSE;
    if (flags & (M3_WAITMASK | M3_COVETOUS)) mon.mstrategy |= STRAT_APPEARMSG;
}

// makemon stub
export function makemon(mdat, x, y, mmflags = 0) {
    let ptr = (mdat === null) ? null : mdat;
    const gpflags = ((mmflags & MM_IGNOREWATER) ? MM_IGNOREWATER : 0)
        | GP_CHECKSCARY | GP_AVOID_MONPOS;
    if (x === 0 && y === 0) {
        const cc = makemon_rnd_goodpos(ptr, gpflags);
        if (!cc) return null;
        x = cc.x;
        y = cc.y;
    }
    const byyou = u_at(x, y);
    if (byyou && !game.in_mklev) {
        const cc = enexto_core(game.u.ux, game.u.uy, ptr, gpflags)
            || enexto_core(game.u.ux, game.u.uy, ptr, gpflags & ~GP_CHECKSCARY);
        if (!cc) return null;
        x = cc.x;
        y = cc.y;
    }
    if (!isok(x, y)) return null;
    if (m_at(x, y)) {
        if (!(mmflags & MM_ADJACENTOK)) return null;
        const cc = enexto_core(x, y, ptr, gpflags);
        if (!cc) return null;
        x = cc.x;
        y = cc.y;
    }
    if (!ptr) {
        let tryct = 0;
        do {
            ptr = rndmonst_adj(0, 0);
            if (!ptr) return null;
        } while (++tryct <= 50 && !goodpos(x, y, gpflags, ptr));
    }
    next_ident();
    const monState = newmonhp_state_for(ptr);
    const female = init_mon_gender_for(ptr);
    const peaceful = (mmflags & MM_ANGRY) ? false : peace_minded_for(ptr);
    const display = {
        ch: MONSTER_SYMBOLS[ptr.mlet] ?? 'm',
        color: ptr.color ?? 15,
        mmove: ptr.mmove ?? 12,
    };
    const mon = {
        mx: x, my: y,
        // C ref: makemon.c:makemon().  `zeromonst` clears mux/muy to 0;
        // set_apparxy() must not treat a new monster as already knowing
        // the current hero square.
        mux: 0, muy: 0,
        ch: display.ch,
        color: display.color,
        data: { ...ptr, mmove: ptr.mmove ?? display.mmove },
        m_lev: monState.level,
        mhp: monState.hp,
        mhpmax: monState.hp,
        female,
        msleeping: (mmflags & MM_ASLEEP) ? 1 : 0,
        mpeaceful: peaceful ? 1 : 0,
        mtame: (mmflags & 0x00000800) ? 10 : 0,
        movement: 0,
        minvis: 0,
        perminvis: 0,
        invis_blkd: 0,
        mstrategy: 0,
    };
    // C makemon() inserts at the head of fmon. Movement allocation and
    // action order depend on this list order because each monster consumes
    // its own speed-rounding roll.
    if (game.level?.monsters) game.level.monsters.unshift(mon);
    if (mmflags & MM_MINVIS) mon_set_minvis(mon, false);
    if (ptr.mlet === 'S_MIMIC') {
        set_mimic_sym(mon);
    }
    if (pm_invisible_ptr(ptr)) mon_set_minvis(mon, false);
    if ((ptr.mlet === 'S_SPIDER' || ptr.mlet === 'S_SNAKE') && game.in_mklev && x && y) {
        mkobj_at(RANDOM_CLASS, x, y, true);
        mon.mundetected = 1;
    }
    if (ptr.mlet === 'S_EEL' && game.in_mklev && IS_POOL(game.level?.at(x, y)?.typ)) {
        // C ref: makemon.c:makemon() calls hideunder() for sea monsters
        // during level creation, which hides them under water without RNG.
        mon.mundetected = 1;
    }
    if (ptr.mlet === 'S_LEPRECHAUN') mon.msleeping = 1;
    if ((ptr.mlet === 'S_NYMPH' || ptr.mlet === 'S_JABBERWOCK')
        && rn2(5) && !game.u?.uhave?.amulet) {
        mon.msleeping = 1;
    }
    mon.cham = null;
    if (ptr.name === 'VLAD_THE_IMPALER') {
        const candelabrum = mksobj(CANDELABRUM_OF_INVOCATION, true, false);
        if (candelabrum) {
            candelabrum.spe = 0;
            candelabrum.age = 0;
        }
    }
    let allow_minvent = true;
    if (initial_shapeshift(mon, ptr)) allow_minvent = false;
    if (ptr.name === 'GHOST' && !(mmflags & MM_NONAME)) mon.mgivenname = rndghostname();
    if (game.in_mklev && !game.u?.uhave?.amulet
        && (((ptr.mflags2 & M2_DEMON) && !(ptr.mflags2 & (M2_LORD | M2_PRINCE))) || ptr.name === 'WUMPUS'
            || ptr.name === 'LONG_WORM' || ptr.name === 'GIANT_EEL')
        && rn2(5)) {
        mon.msleeping = 1;
    }
    if (ptr.name === 'LONG_WORM') {
        const tailCount = (mmflags & MM_NOTAIL) ? 0 : rn2(5);
        for (let seg = 0; seg < tailCount; seg++) {
            for (let i = 8; i > 0; i--) rn2(i);
        }
    }
    const anymon = mdat === null;
    if (anymon && !(mmflags & MM_NOGRP)) {
        if ((ptr.geno & G_SGROUP) && rn2(2)) {
            m_initgrp(mon, mon.mx, mon.my, 3, mmflags);
        } else if (ptr.geno & G_LGROUP) {
            if (rn2(3)) m_initgrp(mon, mon.mx, mon.my, 10, mmflags);
            else m_initgrp(mon, mon.mx, mon.my, 3, mmflags);
        }
    }
    if (allow_minvent && !(mmflags & NO_MINVENT)) {
        game._in_monster_init = true;
        game._monster_init_current = mon;
        game._monster_init_item_count = 0;
        game._monster_init_has_gold = false;
        try {
            if (is_armed_for(ptr)) m_initweap_for(ptr);
            m_initinv_for(ptr, mon);
            // C ref: makemon.c:makemon() calls m_dowear(mtmp, TRUE) after
            // initial monster inventory creation; creation wear has no delay.
            m_dowear_basic(mon, true);
            rn2(100); // saddle chance gate; type predicates may short-circuit after it
        } finally {
            game._in_monster_init = false;
            game._monster_init_current = null;
            game._monster_init_item_count = 0;
            game._monster_init_has_gold = false;
        }
    }
    init_mstrategy_for(mon, mon.data || ptr, mmflags);
    return mon;
}

function isSokobanLevel() {
    const dnum = game.u?.uz?.dnum ?? 0;
    return game.dungeons?.[dnum]?.dname === 'Sokoban' || !!game.level?.flags?.sokoban_rules;
}

function holeDestination() {
    const uz = game.u?.uz || { dnum: 0, dlevel: 1 };
    const dungeon = game.dungeons?.[uz.dnum];
    const bottom = dungeon?.num_dunlevs ?? uz.dlevel;
    const dst = { dnum: uz.dnum, dlevel: uz.dlevel };
    while (dst.dlevel < bottom) {
        dst.dlevel++;
        if (rn2(4)) break;
    }
    return dst;
}

function closed_door_at(x, y) {
    const loc = game.level?.at(x, y);
    return loc?.typ === DOOR && !!(loc.doormask & (D_CLOSED | D_LOCKED));
}

function isclearpath_basic(cc, distance, dx, dy) {
    // C ref: trap.c:isclearpath().
    let x = cc.x;
    let y = cc.y;
    while (distance-- > 0) {
        x += dx;
        y += dy;
        if (!isok(x, y)) return false;
        const typ = game.level?.at(x, y)?.typ;
        if (typ == null || !ZAP_POS(typ) || closed_door_at(x, y)) return false;
        const trap = (game.level?.traps || []).find((ttmp) => ttmp.tx === x && ttmp.ty === y);
        if (trap && (is_pit(trap.ttyp) || is_hole(trap.ttyp) || is_xport_trap(trap.ttyp))) return false;
    }
    cc.x = x;
    cc.y = y;
    return true;
}

function find_random_launch_coord_basic(trap) {
    // C ref: trap.c:find_random_launch_coord().  Explicit Lua launchplace
    // offsets are not currently modeled; random special traps use this path.
    if (!trap || isSokobanLevel()) return null;
    const x = trap.tx;
    const y = trap.ty;
    const mindist = trap.ttyp === ROLLING_BOULDER_TRAP ? 2 : 4;
    let distance = rn1(5, 4);
    let dir = rn2(8);
    let trycount = 0;
    while (distance >= mindist) {
        const dx = xdir[dir];
        const dy = ydir[dir];
        const cc = { x, y };
        let success = !(trap.ttyp === ROLLING_BOULDER_TRAP
                && is_pool_or_lava_at(x + distance * dx, y + distance * dy))
            && isclearpath_basic(cc, distance, dx, dy);
        if (trap.ttyp === ROLLING_BOULDER_TRAP) {
            const bcc = { x, y };
            if (!isclearpath_basic(bcc, distance, -dx, -dy)) success = false;
        }
        if (success) return cc;
        if (++dir > 7) dir = 0;
        if ((++trycount % 8) === 0) distance--;
    }
    return null;
}

function mkroll_launch_basic(trap, x, y, otyp, ocount) {
    // C ref: trap.c:mkroll_launch().
    const cc = find_random_launch_coord_basic(trap) || { x, y };
    if (cc.x !== x || cc.y !== y) {
        const obj = mksobj_at(otyp, cc.x, cc.y, true, false);
        if (obj) obj.quan = ocount;
    }
    trap.launch = { x: cc.x, y: cc.y };
    if (trap.ttyp === ROLLING_BOULDER_TRAP) {
        trap.launch2 = { x: x - (cc.x - x), y: y - (cc.y - y) };
    } else {
        trap.launch_otyp = otyp;
    }
}

// maketrap stub
function maketrap(x, y, typ) {
    // C ref: trap.c:maketrap() - these are door/chest states, not map traps.
    if (typ === TRAPPED_DOOR || typ === TRAPPED_CHEST) return null;
    if (!game.level) return null;
    if (!game.level.traps) game.level.traps = [];
    let trap = game.level.traps.find((ttmp) => ttmp.tx === x && ttmp.ty === y) || null;
    const oldplace = !!trap;
    if (oldplace && undestroyable_trap(trap.ttyp)) return null;
    const loc = game.level.at(x, y);
    const terrain = loc?.typ ?? STONE;
    if (!oldplace
        && (terrain === STAIRS || terrain === LADDER
            || IS_POOL(terrain) || IS_LAVA(terrain)
            || (IS_FURNITURE(terrain) && typ !== PIT && typ !== HOLE)
            || ((terrain === AIR || terrain === CLOUD) && typ !== MAGIC_PORTAL)
            || (typ === LEVEL_TELEP && game.branches?.some((br) =>
                br.end1?.dnum === game.u?.uz?.dnum && br.end2?.dnum === game.u?.uz?.dnum)))) {
        return null;
    }
    if (!trap) trap = { tx: x, ty: y };
    trap.ttyp = typ;
    trap.tseen = unhideable_trap(typ);
    trap.once = false;
    trap.launch = { x: 0, y: 0 };
    delete trap.tnote;
    delete trap.dst;
    delete trap.launch2;
    if (typ === SQKY_BOARD) {
        const used = new Set((game.level?.traps || [])
            .filter((t) => t.ttyp === SQKY_BOARD && typeof t.tnote === 'number')
            .map((t) => t.tnote));
        const available = [];
        for (let k = 0; k < 12; k++) if (!used.has(k)) available.push(k);
        trap.tnote = available.length ? available[rn2(available.length)] : rn2(12);
    }
    if (typ === STATUE_TRAP) {
        // C ref: trap.c:mk_trap_statue().
        let ptr = null;
        let trycount = 10;
        do {
            ptr = rndmonst_adj(3, 6);
        } while (--trycount > 0 && ptr?.mlet === 'S_UNICORN'
            && Math.sign(game.u?.ualign?.type ?? 0) === Math.sign(ptr.maligntyp ?? 0));
        const statue = mkcorpstat(STATUE, null, ptr, x, y, 0);
        const was = makemon(ptr, 0, 0, MM_NOCOUNTBIRTH | MM_NOMSG);
        if (statue && was) {
            statue.contents = was.inventory || [];
            game.level.monsters = (game.level?.monsters || []).filter((mon) => mon !== was);
        }
    }
    if (is_hole(typ)) {
        trap.dst = holeDestination();
    }
    if (typ === ROLLING_BOULDER_TRAP) mkroll_launch_basic(trap, x, y, BOULDER, 1);
    if (!oldplace) game.level.traps.push(trap);
    return trap;
}

function make_engr_at(x, y, text, pristine, epoch, engr_type) {
    if (!game.level) return null;
    game.level.engravings = (game.level.engravings || [])
        .filter(ep => ep.x !== x || ep.y !== y);
    const actual = String(text || '');
    const ep = {
        x,
        y,
        text: actual,
        pristine: pristine == null ? actual : String(pristine),
        epoch: epoch || 0,
        type: engr_type > 0 ? engr_type : rnd(N_ENGRAVE - 1),
        guardobjects: game.in_mklev && actual.toLowerCase() === 'elbereth',
    };
    game.level.engravings.unshift(ep);
    return ep;
}
function wipe_engr_at(x, y, cnt, perm) { /* stub */ }
function make_grave(x, y, text) {
    const loc = game.level?.at(x, y);
    if (!loc || (loc.typ !== ROOM && loc.typ !== GRAVE)) return;
    if ((game.level?.traps || []).some(trap => trap.tx === x && trap.ty === y)) return;
    loc.typ = GRAVE;
    if (text == null) randomEpitaph();
}

// in_rooms stub
function in_rooms(x, y, rtype) { return []; }

// ============================================================
// Core mklev functions (ported from main project's mklev.js)
// ============================================================

// C ref: bones.c getbones()
function getbones() {
    const flags = game.flags || {};
    if (flags.explore) return false;
    if (flags.bones === false) return false;
    if (rn2(3) && !game.flags?.debug) return false;
    return false;
}

const BIGRM_12_MAP = [
    '                                                                           ',
    '         .......................           .......................         ',
    '        .........................         .........................        ',
    '       ...........................       ...........................       ',
    '      .............................     .............................      ',
    '     ........PPPPPPPPPPPPPPP........   ........LLLLLLLLLLLLLLL........     ',
    '    ........PPPPPPPPPPPPPPPPP........ ........LLLLLLLLLLLLLLLLL........    ',
    '   ........PPPWWWWWWWWWWWWWPPP...............LLLZZZZZZZZZZZZZLLL........   ',
    '  ........PPPWWWWWWWWWWWWWWWPPP.............LLLZZZZZZZZZZZZZZZLLL........  ',
    ' ........PPPWWWWWWWWWWWWWWWWWPPP...........LLLZZZZZZZZZZZZZZZZZLLL........ ',
    '  ........PPPWWWWWWWWWWWWWWWPPP.............LLLZZZZZZZZZZZZZZZLLL........  ',
    '   ........PPPWWWWWWWWWWWWWPPP...............LLLZZZZZZZZZZZZZLLL........   ',
    '    ........PPPPPPPPPPPPPPPPP........ ........LLLLLLLLLLLLLLLLL........    ',
    '     ........PPPPPPPPPPPPPPP........   ........LLLLLLLLLLLLLLL........     ',
    '      .............................     .............................      ',
    '       ...........................       ...........................       ',
    '        .........................         .........................        ',
    '         .......................           .......................         ',
    '                                                                           ',
];
const BIGRM_12_XSTART = 3;
const BIGRM_12_YSTART = 1;

const BIGRM_2_MAP = [
    '---------------------------------------------------------------------------',
    '|.........................................................................|',
    '|.........................................................................|',
    '|.........................................................................|',
    '|.........................................................................|',
    '|.........................................................................|',
    '|.........................................................................|',
    '|.........................................................................|',
    '|.........................................................................|',
    '|.........................................................................|',
    '|.........................................................................|',
    '|.........................................................................|',
    '|.........................................................................|',
    '|.........................................................................|',
    '|.........................................................................|',
    '|.........................................................................|',
    '|.........................................................................|',
    '---------------------------------------------------------------------------',
];
const BIGRM_2_XSTART = 3;
const BIGRM_2_YSTART = 3;

const BIGRM_4_MAP = [
    '-----------                                                     -----------',
    '|.........|                                                     |.........|',
    '|.........-------------                             -------------.........|',
    '---...................------------       ------------...................---',
    '  --.............................---------.............................--  ',
    '   --.................................................................--   ',
    '    --...............................................................--    ',
    '     --......LLLLL.......................................LLLLL......--     ',
    '      --.....LLLLL.......................................LLLLL.....--      ',
    '      --.....LLLLL.......................................LLLLL.....--      ',
    '     --......LLLLL.......................................LLLLL......--     ',
    '    --...............................................................--    ',
    '   --.................................................................--   ',
    '  --.............................---------.............................--  ',
    '---...................------------       ------------...................---',
    '|.........-------------                             -------------.........|',
    '|.........|                                                     |.........|',
    '-----------                                                     -----------',
];
const BIGRM_4_XSTART = 3;
const BIGRM_4_YSTART = 3;

const CASTLE_MAP = [
    '}}}}}}}}}.............................................}}}}}}}}}',
    '}-------}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}-------}',
    '}|.....|-----------------------------------------------|.....|}',
    '}|.....+...............................................+.....|}',
    '}-------------------------------+-----------------------------}',
    '}}}}}}|........|..........+...........|.......S.S.......|}}}}}}',
    '.....}|........|..........|...........|.......|.|.......|}.....',
    '.....}|........------------...........---------S---------}.....',
    '.....}|...{....+..........+.........\\.S.................+......',
    '.....}|........------------...........---------S---------}.....',
    '.....}|........|..........|...........|.......|.|.......|}.....',
    '}}}}}}|........|..........+...........|.......S.S.......|}}}}}}',
    '}-------------------------------+-----------------------------}',
    '}|.....+...............................................+.....|}',
    '}|.....|-----------------------------------------------|.....|}',
    '}-------}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}-------}',
    '}}}}}}}}}.............................................}}}}}}}}}',
];

const SANCTUM_MAP = [
    '----------------------------------------------------------------------------',
    '|             --------------                                               |',
    '|             |............|             -------                           |',
    '|       -------............-----         |.....|                           |',
    '|       |......................|        --.....|            ---------      |',
    '|    ----......................---------|......----         |.......|      |',
    '|    |........---------..........|......+.........|     ------+---..|      |',
    '|  ---........|.......|..........--S----|.........|     |........|..|      |',
    '|  |..........|.......|.............|   |.........-------..----------      |',
    '|  |..........|.......|..........----   |..........|....|..|......|        |',
    '|  |..........|.......|..........|      --.......----+---S---S--..|        |',
    '|  |..........---------..........|       |.......|.............|..|        |',
    '|  ---...........................|       -----+-------S---------S---       |',
    '|    |...........................|          |...| |......|    |....|--     |',
    '|    ----.....................----          |...---....---  ---......|     |',
    '|       |.....................|             |..........|    |.....----     |',
    '|       -------...........-----             --...-------    |.....|        |',
    '|             |...........|                  |...|          |.....|        |',
    '|             -------------                  -----          -------        |',
    '----------------------------------------------------------------------------',
];

const MINETN_5_XSTART = 3;
const MINETN_5_YSTART = 0;
const MINETN_5_MAP = [
    '-----         ---------                                                    ',
    '|...---  ------.......--    -------                       ---------------  ',
    '|.....----.........--..|    |.....|          -------      |.............|  ',
    '--..-....-.----------..|    |.....|          |.....|     --+---+--.----+-  ',
    ' --.--.....----     ----    |.....|  ------  --....----  |..-...--.-.+..|  ',
    '  ---.........----  -----   ---+---  |..+.|   ---..-..----..---+-..---..|  ',
    '    ----.-....|..----...--    |.|    |..|.|    ---+-.....-+--........--+-  ',
    '       -----..|....-.....---- |.|    |..|.------......--................|  ',
    '    ------ |..|.............---.--   ----.+..|-.......--..--------+--..--  ',
    '    |....| --......---...........-----  |.|..|-...{....---|.........|..--  ',
    '    |....|  |........-...-...........----.|..|--.......|  |.........|...|  ',
    '    ---+--------....-------...---......--.-------....---- -----------...|  ',
    ' ------.---...--...--..-..--...-..---...|.--..-...-....------- |.......-- ',
    ' |..|-.........-..---..-..---.....--....|........---...-|....| |.-------  ',
    ' |..+...............-+---+-----..--..........--....--...+....| |.|...S.   ',
    '-----.....{....----...............-...........--...-...-|....| |.|...|    ',
    '|..............-- --+--.---------.........--..-........------- |.--+-------',
    '-+-----.........| |...|.|....|  --.......------...|....---------.....|....|',
    '|...| --..------- |...|.+....|   ---...---    --..|...--......-...{..+..-+|',
    '|...|  ----       ------|....|     -----       -----.....----........|..|.|',
    '-----                   ------                     -------  ---------------',
];

const MINEND_2_XSTART = 3;
const MINEND_2_YSTART = 3;
const MINEND_2_MAP = [
    '---------------------------------------------------------------------------',
    '|...................................................|                     |',
    '|.|---------S--.--|...|--------------------------|..|                     |',
    '|.||---|   |.||-| |...|..........................|..|                     |',
    '|.||...| |-|.|.|---...|.............................|                ..   |',
    '|.||...|-|.....|....|-|..........................|..|.               ..   |',
    '|.||.....|-S|..|....|............................|..|..                   |',
    '|.||--|..|..|..|-|..|----------------------------|..|-.                   |',
    '|.|   |..|..|....|..................................|...                  |',
    '|.|   |..|..|----|..-----------------------------|..|....                 |',
    '|.|---|..|--|.......|----------------------------|..|.....                |',
    '|...........|----.--|......................|     |..|.......              |',
    '|-----------|...|.| |------------------|.|.|-----|..|.....|..             |',
    '|-----------|.{.|.|--------------------|.|..........|.....|....           |',
    '|...............|.S......................|-------------..-----...         |',
    '|.--------------|.|--------------------|.|.........................       |',
    '|.................|                    |.....................|........    |',
    '---------------------------------------------------------------------------',
];

const SOKO1_XSTART = 27;
const SOKO1_YSTART = 3;

const SOKO1_1_MAP = [
    '--------------------------',
    '|........................|',
    '|.......|---------------.|',
    '-------.------         |.|',
    ' |...........|         |.|',
    ' |...........|         |.|',
    '--------.-----         |.|',
    '|............|         |.|',
    '|............|         |.|',
    '-----.--------   ------|.|',
    ' |..........|  --|.....|.|',
    ' |..........|  |.+.....|.|',
    ' |.........|-  |-|.....|.|',
    '-------.----   |.+.....+.|',
    '|........|     |-|.....|--',
    '|........|     |.+.....|  ',
    '|...|-----     --|.....|  ',
    '-----            -------  ',
];

const SOKO1_2_MAP = [
    '  ------------------------',
    '  |......................|',
    '  |..-------------------.|',
    '----.|    -----        |.|',
    '|..|.--  --...|        |.|',
    '|.....|--|....|        |.|',
    '|.....|..|....|        |.|',
    '--....|......--        |.|',
    ' |.......|...|   ------|.|',
    ' |....|..|...| --|.....|.|',
    ' |....|--|...| |.+.....|.|',
    ' |.......|..-- |-|.....|.|',
    ' ----....|.--  |.+.....+.|',
    '    ---.--.|   |-|.....|--',
    '     |.....|   |.+.....|  ',
    '     |..|..|   --|.....|  ',
    '     -------     -------  ',
];

const SOKO2_1_MAP = [
    '--------------------',
    '|........|...|.....|',
    '|.....-..|.-.|.....|',
    '|..|.....|...|.....|',
    '|-.|..-..|.-.|.....|',
    '|...--.......|.....|',
    '|...|...-...-|.....|',
    '|...|..|...--|.....|',
    '|-..|..|----------+|',
    '|..................|',
    '|...|..|------------',
    '--------            ',
];

const SOKO2_2_MAP = [
    '  --------            ',
    '--|.|....|            ',
    '|........|----------  ',
    '|.-...-..|.|.......|  ',
    '|...-......|.......|  ',
    '|.-....|...|.......|  ',
    '|....-.--.-|.......|  ',
    '|..........|.......|  ',
    '|.--...|...|.......---',
    '|....-.|---|.......+.|',
    '--|....|------------.|',
    '  |................+.|',
    '  --------------------',
];

const SOKO3_1_MAP = [
    '-----------       -----------',
    '|....|....|--     |.........|',
    '|....|......|     |.........|',
    '|.........|--     |.........|',
    '|....|....|       |.........|',
    '|-.---------      |.........|',
    '|....|.....|      |.........|',
    '|....|.....|      |.........|',
    '|..........|      |.........|',
    '|....|.....|---------------+|',
    '|....|......................|',
    '-----------------------------',
];

const SOKO3_2_MAP = [
    ' ----          -----------',
    '-|..|-------   |.........|',
    '|..........|   |.........|',
    '|..-----.-.|   |.........|',
    '|..|...|...|   |.........|',
    '|.........-|   |.........|',
    '|.......|..|   |.........|',
    '|.----..--.|   |.........|',
    '|........|.--  |.........|',
    '|.---.-.....------------+|',
    '|...|...-................|',
    '|.........----------------',
    '----|..|..|               ',
    '    -------               ',
];

const SOKO4_1_MAP = [
    '------  ----- ',
    '|....|  |...| ',
    '|....----...| ',
    '|...........| ',
    '|..|-|.|-|..| ',
    '---------|.---',
    '|......|.....|',
    '|..----|.....|',
    '--.|   |.....|',
    ' |.|---|.....|',
    ' |...........|',
    ' |..|---------',
    ' ----         ',
];

const SOKO4_2_MAP = [
    '-------- ------',
    '|.|....|-|....|',
    '|.|-..........|',
    '|.||....|.....|',
    '|.||....|.....|',
    '|.|-----|.-----',
    '|.|    |......|',
    '|.-----|......|',
    '|.............|',
    '|..|---|......|',
    '----   --------',
];

const TOWER1_X = 17;
const TOWER1_Y = 5;
const TOWER3_X = 17;
const TOWER3_Y = 5;
const TOWER1_MAP = [
    '  --- --- ---  ',
    '  |.| |.| |.|  ',
    '---S---S---S---',
    '|.......+.+...|',
    '---+-----.-----',
    '  |...\\.|.+.|  ',
    '---+-----.-----',
    '|.......+.+...|',
    '---S---S---S---',
    '  |.| |.| |.|  ',
    '  --- --- ---  ',
];

const TOWER2_MAP = [
    '  --- --- ---  ',
    '  |.| |.| |.|  ',
    '---S---S---S---',
    '|.S.........S.|',
    '---.------+----',
    '  |......|..|  ',
    '--------.------',
    '|.S......+..S.|',
    '---S---S---S---',
    '  |.| |.| |.|  ',
    '  --- --- ---  ',
];

const TOWER3_MAP = [
    '    --- --- ---    ',
    '    |.| |.| |.|    ',
    '  ---S---S---S---  ',
    '  |.S.........S.|  ',
    '-----.........-----',
    '|...|.........+...|',
    '|.---.........---.|',
    '|.|.S.........S.|.|',
    '|.---S---S---S---.|',
    '|...|.|.|.|.|.|...|',
    '---.---.---.---.---',
    '  |.............|  ',
    '  ---------------  ',
];

const MEDUSA3_MAP = [
    '}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}',
    '}}}}}}}}}}.}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}.}}}}}}}}}}}}}}}}}}}}}}}}}}}}',
    '}}}}}}}}T..T.}}}}}}}}}}}}}}}}}}}}..}}}}}}}}.}}}...}}}}}}}.}}}}}......}}}}}}}',
    '}}}}}}.......T.}}}}}}}}}}}..}}}}..T.}}}}}}...T...T..}}...T..}}..-----..}}}}}',
    '}}}...-----....}}}}}}}}}}.T..}}}}}...}}}}}.....T..}}}}}......T..|...|.T..}}}',
    '}}}.T.|...|...T.}}}}}}}.T......}}}}..T..}}.}}}.}}...}}}}}.T.....+...|...}}}}',
    '}}}}..|...|.}}.}}}}}.....}}}T.}}}}.....}}}}}}.T}}}}}}}}}}}}}..T.|...|.}}}}}}',
    '}}}}}.|...|.}}}}}}..T..}}}}}}}}}}}}}T.}}}}}}}}..}}}}}}}}}}}.....-----.}}}}}}',
    '}}}}}.--+--..}}}}}}...}}}}}}}}}}}}}}}}}}}T.}}}}}}}}}}}}}}}}.T.}........}}}}}',
    '}}}}}.......}}}}}}..}}}}}}}}}.}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}.}}}.}}.T.}}}}}}',
    '}}.T...T...}}}}T}}}}}}}}}}}....}}}}}}}}}}T}}}}}.T}}...}}}}}}}}}}}}}}...}}}}}',
    '}}}...T}}}}}}}..}}}}}}}}}}}.T...}}}}}}}}.T.}.T.....T....}}}}}}}}}}}}}.}}}}}}',
    '}}}}}}}}}}}}}}}....}}}}}}}...}}.}}}}}}}}}}............T..}}}}}.T.}}}}}}}}}}}',
    '}}}}}}}}}}}}}}}}..T..}}}}}}}}}}}}}}..}}}}}..------+--...T.}}}....}}}}}}}}}}}',
    '}}}}.}..}}}}}}}.T.....}}}}}}}}}}}..T.}}}}.T.|...|...|....}}}}}.}}}}}...}}}}}',
    '}}}.T.}...}..}}}}T.T.}}}}}}.}}}}}}}....}}...|...+...|.}}}}}}}}}}}}}..T...}}}',
    '}}}}..}}}.....}}...}}}}}}}...}}}}}}}}}}}}}T.|...|...|}}}}}}}}}}}....T..}}}}}',
    '}}}}}..}}}.T..}}}.}}}}}}}}.T..}}}}}}}}}}}}}}---S-----}}}}}}}}}}}}}....}}}}}}',
    '}}}}}}}}}}}..}}}}}}}}}}}}}}}.}}}}}}}}}}}}}}}}}T..T}}}}}}}}}}}}}}}}}}}}}}}}}}',
    '}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}',
];
const MEDUSA3_PLACE_WIDTH = 76;
const MEDUSA3_X = 3;
const MEDUSA3_Y = 1;

const SOKO_LEVELS = {
    'soko1-1': {
        map: SOKO1_1_MAP,
        stair: [1, 1],
        boulders: [
            [3, 5], [5, 5], [7, 5], [9, 5], [11, 5],
            [4, 7], [4, 8], [6, 7], [9, 7], [11, 7],
            [3, 12], [4, 10], [5, 12], [6, 10], [7, 11],
            [8, 10], [9, 12], [3, 14],
        ],
        traps: [
            [HOLE, 7, 1], [ROLLING_BOULDER_TRAP, 8, 1],
            [HOLE, 9, 1], [HOLE, 10, 1], [HOLE, 11, 1],
            [HOLE, 12, 1], [HOLE, 13, 1], [HOLE, 14, 1],
            [HOLE, 15, 1], [HOLE, 16, 1], [HOLE, 17, 1],
            [HOLE, 18, 1], [HOLE, 19, 1], [HOLE, 20, 1],
            [HOLE, 21, 1], [HOLE, 22, 1], [HOLE, 23, 1],
        ],
        rewardPlaces: [[16, 11], [16, 13], [16, 15]],
        rewardBagPercent: 75,
        zooRegion: [18, 10, 22, 16],
        doors: [[23, 13, D_LOCKED], [17, 11, D_CLOSED], [17, 13, D_CLOSED], [17, 15, D_CLOSED]],
    },
    'soko1-2': {
        map: SOKO1_2_MAP,
        stair: [6, 15],
        boulders: [
            [4, 4], [2, 6], [3, 6], [4, 7], [5, 7],
            [2, 8], [5, 8], [3, 9], [4, 9], [3, 10],
            [5, 10], [6, 12], [7, 14], [11, 5], [12, 6],
            [10, 7], [11, 7], [10, 8], [12, 9], [11, 10],
        ],
        traps: [
            [ROLLING_BOULDER_TRAP, 5, 1], [HOLE, 6, 1],
            [HOLE, 7, 1], [HOLE, 8, 1], [HOLE, 9, 1],
            [HOLE, 10, 1], [HOLE, 11, 1], [HOLE, 12, 1],
            [HOLE, 13, 1], [HOLE, 14, 1], [HOLE, 15, 1],
            [HOLE, 16, 1], [HOLE, 17, 1], [HOLE, 18, 1],
            [HOLE, 19, 1], [HOLE, 20, 1], [HOLE, 21, 1],
            [HOLE, 22, 1], [HOLE, 23, 1],
        ],
        rewardPlaces: [[16, 10], [16, 12], [16, 14]],
        rewardBagPercent: 25,
        zooRegion: [18, 9, 22, 15],
        doors: [[23, 12, D_LOCKED], [17, 10, D_CLOSED], [17, 12, D_CLOSED], [17, 14, D_CLOSED]],
    },
    'soko2-1': {
        map: SOKO2_1_MAP,
        xstart: 31,
        ystart: 5,
        stairs: [[false, 6, 10], [true, 16, 4]],
        boulders: [
            [2, 2], [3, 2],
            [5, 3], [7, 3], [7, 2], [8, 2],
            [10, 3], [11, 3],
            [2, 7], [2, 8], [3, 9],
            [5, 7], [6, 6],
        ],
        traps: [
            [ROLLING_BOULDER_TRAP, 7, 9],
            [HOLE, 8, 9], [HOLE, 9, 9], [HOLE, 10, 9],
            [HOLE, 11, 9], [HOLE, 12, 9], [HOLE, 13, 9],
            [HOLE, 14, 9], [HOLE, 15, 9], [HOLE, 16, 9],
            [HOLE, 17, 9],
        ],
        randomObjects: [FOOD_CLASS, FOOD_CLASS, FOOD_CLASS, FOOD_CLASS, RING_CLASS, WAND_CLASS],
        doors: [[18, 8, D_LOCKED]],
    },
    'soko2-2': {
        map: SOKO2_2_MAP,
        xstart: 29,
        ystart: 5,
        stairs: [[false, 6, 11], [true, 15, 6]],
        boulders: [
            [4, 2], [4, 3], [5, 3], [7, 3], [8, 3],
            [2, 4], [3, 4], [5, 5], [6, 6], [9, 6],
            [3, 7], [4, 7], [7, 7], [6, 9], [5, 10], [5, 11],
        ],
        traps: [
            [ROLLING_BOULDER_TRAP, 7, 11],
            [HOLE, 8, 11], [HOLE, 9, 11], [HOLE, 10, 11],
            [HOLE, 11, 11], [HOLE, 12, 11], [HOLE, 13, 11],
            [HOLE, 14, 11], [HOLE, 15, 11], [HOLE, 16, 11],
            [HOLE, 17, 11], [HOLE, 18, 11],
        ],
        randomObjects: [FOOD_CLASS, FOOD_CLASS, FOOD_CLASS, FOOD_CLASS, RING_CLASS, WAND_CLASS],
        doors: [[19, 9, D_LOCKED], [19, 11, D_LOCKED]],
    },
    'soko3-1': {
        map: SOKO3_1_MAP,
        xstart: 27,
        ystart: 5,
        stairs: [[false, 11, 2], [true, 23, 4]],
        boulders: [
            [3, 2], [4, 2],
            [6, 2], [6, 3], [7, 2],
            [3, 6], [2, 7], [3, 7], [3, 8], [2, 9], [3, 9], [4, 9],
            [6, 7], [6, 9], [8, 7], [8, 10], [9, 8], [9, 9], [10, 7], [10, 10],
        ],
        traps: [
            [ROLLING_BOULDER_TRAP, 11, 10],
            [HOLE, 12, 10], [HOLE, 13, 10], [HOLE, 14, 10],
            [HOLE, 15, 10], [HOLE, 16, 10], [HOLE, 17, 10],
            [HOLE, 18, 10], [HOLE, 19, 10], [HOLE, 20, 10],
            [HOLE, 21, 10], [HOLE, 22, 10], [HOLE, 23, 10],
            [HOLE, 24, 10], [HOLE, 25, 10], [HOLE, 26, 10],
        ],
        randomObjects: [FOOD_CLASS, FOOD_CLASS, FOOD_CLASS, FOOD_CLASS, RING_CLASS, WAND_CLASS],
        doors: [[27, 9, D_LOCKED]],
    },
    'soko3-2': {
        map: SOKO3_2_MAP,
        xstart: 27,
        ystart: 5,
        stairs: [[false, 3, 1], [true, 20, 4]],
        boulders: [
            [2, 3], [8, 3], [9, 4], [2, 5], [4, 5], [9, 5],
            [2, 6], [5, 6], [6, 7], [3, 8], [7, 8], [5, 9],
            [10, 9], [7, 10], [10, 10], [3, 11],
        ],
        traps: [
            [ROLLING_BOULDER_TRAP, 11, 10],
            [HOLE, 12, 10], [HOLE, 13, 10], [HOLE, 14, 10],
            [HOLE, 15, 10], [HOLE, 16, 10], [HOLE, 17, 10],
            [HOLE, 18, 10], [HOLE, 19, 10], [HOLE, 20, 10],
            [HOLE, 21, 10], [HOLE, 22, 10], [HOLE, 23, 10],
        ],
        randomObjects: [FOOD_CLASS, FOOD_CLASS, FOOD_CLASS, FOOD_CLASS, RING_CLASS, WAND_CLASS],
        doors: [[24, 9, D_LOCKED]],
    },
    'soko4-1': {
        map: SOKO4_1_MAP,
        xstart: 33,
        ystart: 5,
        stairs: [[true, 6, 6]],
        branchRegion: [6, 4, 6, 4],
        boulders: [
            [2, 2], [2, 3],
            [10, 2], [9, 3], [10, 4],
            [8, 7], [9, 8], [9, 9], [8, 10], [10, 10],
        ],
        traps: [
            [PIT, 4, 6],
            [PIT, 2, 6], [PIT, 2, 7], [PIT, 2, 8], [ROLLING_BOULDER_TRAP, 2, 9],
            [PIT, 2, 10], [PIT, 3, 10], [PIT, 4, 10], [PIT, 5, 10],
            [PIT, 6, 10], [ROLLING_BOULDER_TRAP, 7, 10],
        ],
        typedObjects: [[SCR_EARTH, 2, 11], [SCR_EARTH, 3, 11]],
        randomObjects: [FOOD_CLASS, FOOD_CLASS, FOOD_CLASS, FOOD_CLASS, RING_CLASS, WAND_CLASS],
        doors: [],
    },
    'soko4-2': {
        map: SOKO4_2_MAP,
        xstart: 33,
        ystart: 7,
        stairs: [[true, 1, 1]],
        branchRegion: [3, 1, 3, 1],
        boulders: [
            [5, 2], [6, 2], [6, 3], [7, 3],
            [9, 5], [10, 3], [11, 2], [12, 3],
            [7, 8], [8, 8], [9, 8], [10, 8],
        ],
        traps: [
            [PIT, 1, 2], [PIT, 1, 3], [PIT, 1, 4], [PIT, 1, 5],
            [PIT, 1, 6], [ROLLING_BOULDER_TRAP, 1, 7],
            [PIT, 1, 8], [PIT, 2, 8], [PIT, 3, 8], [PIT, 4, 8],
            [PIT, 5, 8], [ROLLING_BOULDER_TRAP, 6, 8],
        ],
        typedObjects: [[SCR_EARTH, 1, 9], [SCR_EARTH, 2, 9]],
        randomObjects: [FOOD_CLASS, FOOD_CLASS, FOOD_CLASS, FOOD_CLASS, RING_CLASS, WAND_CLASS],
        doors: [],
    },
};

function bigrm12TerrainAt(x, y) {
    return BIGRM_12_MAP[y]?.[x] || ' ';
}

function bigrm2TerrainAt(x, y) {
    return BIGRM_2_MAP[y]?.[x] || ' ';
}

function bigrm4TerrainAt(x, y) {
    return BIGRM_4_MAP[y]?.[x] || ' ';
}

function sokoXStart(spec) { return spec.xstart ?? SOKO1_XSTART; }
function sokoYStart(spec) { return spec.ystart ?? SOKO1_YSTART; }

function sokoAbs(spec, x, y) {
    return { x: x + sokoXStart(spec), y: y + sokoYStart(spec) };
}

function sokoTerrainAt(spec, x, y) {
    return spec.map[y]?.[x] || ' ';
}

function minetn5X(x) { return x + MINETN_5_XSTART; }
function minetn5Y(y) { return y + MINETN_5_YSTART; }

function createIrregularRoomFromSeed(x, y, rtype, lit, needfill) {
    const seed = game.level?.at(x, y);
    if (!seed || seed.typ === STONE) return null;
    const roomno = game.level.nroom + ROOMOFFSET;
    const targetTyp = seed.typ;
    const seen = new Set();
    const queue = [[x, y]];
    const floorCells = [];
    let minx = x, maxx = x, miny = y, maxy = y;
    while (queue.length) {
        const [cx, cy] = queue.shift();
        const key = `${cx},${cy}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const loc = game.level.at(cx, cy);
        if (!loc || loc.typ !== targetTyp) continue;
        loc.roomno = roomno;
        loc.lit = lit;
        floorCells.push([cx, cy]);
        minx = Math.min(minx, cx);
        maxx = Math.max(maxx, cx);
        miny = Math.min(miny, cy);
        maxy = Math.max(maxy, cy);
        for (let dy = -1; dy <= 1; dy++)
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = cx + dx, ny = cy + dy;
                if (!isok(nx, ny) || seen.has(`${nx},${ny}`)) continue;
                if (game.level.at(nx, ny)?.typ === targetTyp) queue.push([nx, ny]);
            }
    }
    for (const [cx, cy] of floorCells) {
        for (let yy = cy - 1; yy <= cy + 1; yy++)
            for (let xx = cx - 1; xx <= cx + 1; xx++) {
                const loc = game.level.at(xx, yy);
                if (!loc || !(IS_WALL(loc.typ) || IS_DOOR(loc.typ) || loc.typ === SDOOR)) continue;
                loc.edge = true;
                if (lit) loc.lit = lit;
                if (!loc.roomno) loc.roomno = roomno;
                else if (loc.roomno !== roomno) loc.roomno = SHARED;
            }
    }
    const croom = {
        lx: minx, ly: miny, hx: maxx, hy: maxy,
        rtype, rlit: lit ? 1 : 0,
        doorct: 0, fdoor: game.level.doorindex,
        irregular: true, needjoining: true,
        nsubrooms: 0, sbrooms: [],
        roomnoidx: game.level.nroom,
        needfill,
    };
    game.smeq[game.level.nroom] = game.level.nroom;
    game.level.rooms[game.level.nroom] = croom;
    game.level.nroom++;
    if (game.level.nroom < MAXNROFROOMS) game.level.rooms[game.level.nroom] = { hx: -1 };
    return croom;
}

function minetn5SetTerrain(x, y, ch) {
    const loc = game.level?.at(minetn5X(x), minetn5Y(y));
    if (!loc) return;
    switch (ch) {
    case '.':
        loc.typ = ROOM;
        break;
    case '-':
        loc.typ = HWALL;
        break;
    case '|':
        loc.typ = VWALL;
        break;
    case '+':
        loc.typ = DOOR;
        set_door_mask(loc, D_CLOSED);
        break;
    case 'S':
        loc.typ = SDOOR;
        set_door_mask(loc, D_CLOSED);
        break;
    case '{':
        loc.typ = FOUNTAIN;
        break;
    default:
        loc.typ = STONE;
        break;
    }
}

function minetn5Line(x1, y1, x2, y2, ch) {
    const dx = Math.sign(x2 - x1), dy = Math.sign(y2 - y1);
    let x = x1, y = y1;
    while (true) {
        minetn5SetTerrain(x, y, ch);
        if (x === x2 && y === y2) break;
        x += dx; y += dy;
    }
}

function minetn5Area(x1, y1, x2, y2, ch) {
    for (let y = y1; y <= y2; y++)
        for (let x = x1; x <= x2; x++)
            minetn5SetTerrain(x, y, ch);
}

function minetn5Region(x1, y1, x2, y2, lit) {
    const grow = lit ? 1 : 0;
    for (let y = y1 - grow; y <= y2 + grow; y++)
        for (let x = x1 - grow; x <= x2 + grow; x++) {
            const loc = game.level?.at(minetn5X(x), minetn5Y(y));
            if (loc) loc.lit = !!lit;
        }
}

function minetn5RoomRegion(x1, y1, x2, y2, lit, rtype) {
    add_room(minetn5X(x1), minetn5Y(y1), minetn5X(x2), minetn5Y(y2), lit ? 1 : 0, rtype, true);
    const room = game.level.rooms[game.level.nroom - 1];
    if (room) room.needfill = FILL_NORMAL;
    topologize(room);
    return room;
}

function minetn5Door(state, x, y) {
    const ax = minetn5X(x), ay = minetn5Y(y);
    const loc = game.level?.at(ax, ay);
    if (!loc) return;
    loc.typ = DOOR;
    if (state === 'random') {
        const states = [D_NODOOR, D_BROKEN, D_ISOPEN, D_CLOSED, D_LOCKED];
        set_door_mask(loc, states[rn2(states.length)]);
    } else if (state === 'locked') {
        set_door_mask(loc, D_LOCKED);
    } else if (state === 'closed') {
        set_door_mask(loc, D_CLOSED);
    } else if (state === 'open') {
        set_door_mask(loc, D_ISOPEN);
    } else {
        set_door_mask(loc, D_NODOOR);
    }
    for (const room of game.level?.rooms || []) {
        if (!room || room.hx < 0) continue;
        if (ax >= room.lx - 1 && ax <= room.hx + 1 && ay >= room.ly - 1 && ay <= room.hy + 1) {
            add_door(ax, ay, room);
            break;
        }
    }
}

function minetn5Monster(name, x = null, y = null, peaceful = null) {
    const ptr = monsterPtr(name);
    if (ptr) {
        if (['WATCHMAN', 'WATCH_CAPTAIN', 'GNOME', 'DWARF', 'GNOMISH_WIZARD'].includes(ptr.name)) rn2(2);
        rn2(3); // induced_align() for special-level monster creation
    }
    const loc = (x == null || y == null)
        ? specialRandomDryLocation(MINETN_5_MAP[0].length, MINETN_5_MAP.length, MINETN_5_XSTART, MINETN_5_YSTART)
        : { x: minetn5X(x), y: minetn5Y(y) };
    const mon = makemon(ptr, loc.x, loc.y, 0);
    if (mon && peaceful != null) {
        mon.mpeaceful = !!peaceful;
        mon.mhostile = !peaceful;
    }
    return mon;
}

function minetn5ClassMonster(mlet, x, y) {
    rn2(3); // induced_align() before special-level class selection
    const ptr = mkclass_aligned(mlet, G_NOGEN);
    return makemon(ptr, minetn5X(x), minetn5Y(y), 0);
}

function minend2X(x) { return x + MINEND_2_XSTART; }
function minend2Y(y) { return y + MINEND_2_YSTART; }

function minend2SetTerrain(x, y, ch) {
    const loc = game.level?.at(minend2X(x), minend2Y(y));
    if (!loc) return;
    switch (ch) {
    case '.':
        loc.typ = ROOM;
        break;
    case '-':
        loc.typ = HWALL;
        break;
    case '|':
        loc.typ = VWALL;
        break;
    case 'S':
        loc.typ = SDOOR;
        set_door_mask(loc, D_CLOSED);
        break;
    case '{':
        loc.typ = FOUNTAIN;
        break;
    default:
        loc.typ = STONE;
        break;
    }
}

function minend2Region(x1, y1, x2, y2, lit) {
    const grow = lit ? 1 : 0;
    for (let y = y1 - grow; y <= y2 + grow; y++)
        for (let x = x1 - grow; x <= x2 + grow; x++) {
            const loc = game.level?.at(minend2X(x), minend2Y(y));
            if (loc) loc.lit = !!lit;
        }
}

function minend2Door(state, x, y) {
    const loc = game.level?.at(minend2X(x), minend2Y(y));
    if (!loc) return;
    loc.typ = DOOR;
    set_door_mask(loc, state === 'locked' ? D_LOCKED : D_CLOSED);
}

function minend2NonDiggable(x1, y1, x2, y2) {
    for (let y = y1; y <= y2; y++)
        for (let x = x1; x <= x2; x++) {
            const loc = game.level?.at(minend2X(x), minend2Y(y));
            if (loc) loc.wall_info = (loc.wall_info || 0) | W_NONDIGGABLE;
        }
}

function minend2RandomDryLocation() {
    return specialRandomDryLocation(MINEND_2_MAP[0].length, MINEND_2_MAP.length,
        MINEND_2_XSTART, MINEND_2_YSTART);
}

function minend2TrapLocation() {
    let loc = minend2RandomDryLocation();
    let trycnt = 0;
    while ((game.level?.at(loc.x, loc.y)?.typ === STAIRS
            || game.level?.at(loc.x, loc.y)?.typ === LADDER)
           && ++trycnt <= 100) {
        loc = minend2RandomDryLocation();
    }
    return loc;
}

function minend2FixedObject(otyp, x, y, init = true, artif = false) {
    return mksobj_at(otyp, minend2X(x), minend2Y(y), init, artif);
}

function minend2ClassObject(oclass, x = null, y = null) {
    const loc = x == null ? minend2RandomDryLocation() : { x: minend2X(x), y: minend2Y(y) };
    return mkobj_at(oclass, loc.x, loc.y, true);
}

function minend2RandomObject() {
    const loc = minend2RandomDryLocation();
    return mkobj_at(RANDOM_CLASS, loc.x, loc.y, true);
}

function minend2Trap() {
    const loc = minend2TrapLocation();
    let kind;
    do { kind = traptype_rnd(); } while (kind === NO_TRAP);
    const trap = maketrap(loc.x, loc.y, kind);
    maybeTrapVictim(trap);
}

function minend2Monster(ref) {
    const cls = String(ref || '').length === 1
        ? (castleMonsterClass(ref)
            || Object.keys(MONSTER_SYMBOLS).find((mlet) => MONSTER_SYMBOLS[mlet] === ref))
        : null;
    let ptr = cls ? null : monster_ptr(ref);
    if (!cls && ['GNOMISH_WIZARD', 'GNOME', 'HOBBIT', 'DWARF'].includes(ptr?.name)) rn2(2);
    rn2(3); // induced_align() fallback for unaligned Mines End monsters.
    if (cls) ptr = mkclass_aligned(cls, G_NOGEN);
    let loc = minend2RandomDryLocation();
    if (m_at(loc.x, loc.y)) {
        const cc = enexto_core(loc.x, loc.y, ptr, GP_CHECKSCARY)
            || enexto_core(loc.x, loc.y, ptr, 0);
        if (cc) loc = cc;
    }
    return makemon(ptr, loc.x, loc.y, 0);
}

function loadMinend2Special() {
    // C ref: dat/minend-2.lua loaded through sp_lev.c:lspo_map().
    rn2(3); rn2(2); // nhlib shuffle()
    rn2(2); // splev_initlev()
    for (let y = 0; y < ROWNO; y++)
        for (let x = 1; x < COLNO; x++)
            game.level.at(x, y).typ = STONE;
    game.level.flags.is_maze_lev = true;
    game.level.flags.mines_walls = true;
    for (let y = 0; y < MINEND_2_MAP.length; y++)
        for (let x = 0; x < MINEND_2_MAP[y].length; x++)
            minend2SetTerrain(x, y, MINEND_2_MAP[y][x]);

    if (rn2(100) < 50) {
        minend2SetTerrain(55, 14, '-');
        minend2SetTerrain(56, 14, '-');
        minend2SetTerrain(61, 15, '|');
        minend2SetTerrain(52, 5, 'S');
        minend2Door('locked', 52, 5);
    }
    if (rn2(100) < 50) {
        minend2SetTerrain(18, 1, '|');
        for (let yy = 12; yy <= 13; yy++)
            for (let xx = 7; xx <= 8; xx++)
                minend2SetTerrain(xx, yy, '.');
    }
    if (rn2(100) < 50) {
        minend2SetTerrain(49, 4, '|');
        minend2SetTerrain(21, 5, '.');
    }
    if (rn2(100) < 50) {
        if (rn2(100) < 50) minend2SetTerrain(22, 1, '|');
        else {
            minend2SetTerrain(50, 7, '-');
            minend2SetTerrain(51, 7, '-');
        }
    }

    game.dndest = { lx: 23, ly: 3, hx: 48, hy: 16, nlx: 0, nly: 0, nhx: 0, nhy: 0 };
    game.updest = { ...game.dndest };
    const fountain = game.level?.at(minend2X(14), minend2Y(13));
    if (fountain) {
        fountain.typ = FOUNTAIN;
        game.level.flags.nfountains = (game.level.flags.nfountains || 0) + 1;
    }
    minend2Region(23, 3, 48, 6, true);
    minend2Region(21, 6, 22, 6, true);
    minend2Region(14, 4, 14, 4, false);
    minend2Region(10, 5, 14, 8, false);
    minend2Region(10, 9, 11, 9, false);
    minend2Region(15, 8, 16, 8, false);
    minend2Door('locked', 12, 2);
    minend2Door('locked', 11, 6);
    placeSpecialStair(minend2X(36), minend2Y(4), true);
    minend2NonDiggable(0, 0, 52, 17);
    minend2NonDiggable(53, 0, 74, 0);
    minend2NonDiggable(53, 17, 74, 17);
    minend2NonDiggable(74, 1, 74, 16);
    minend2NonDiggable(53, 7, 55, 7);
    minend2NonDiggable(53, 14, 61, 14);

    make_engr_at(minend2X(12), minend2Y(3),
        "You are now entering the Gnome King's wine cellar.", 0, 0, ENGRAVE);
    make_engr_at(minend2X(12), minend2Y(4),
        'Trespassers will be persecuted!', 0, 0, ENGRAVE);

    minend2FixedObject(POT_BOOZE, 10, 7);
    minend2FixedObject(POT_BOOZE, 10, 7);
    minend2ClassObject(POTION_CLASS, 10, 7);
    minend2FixedObject(POT_BOOZE, 10, 8);
    minend2FixedObject(POT_BOOZE, 10, 8);
    minend2ClassObject(POTION_CLASS, 10, 8);
    minend2FixedObject(POT_BOOZE, 10, 9);
    minend2FixedObject(POT_BOOZE, 10, 9);
    minend2FixedObject(POT_OBJECT_DETECTION, 10, 9);

    minend2FixedObject(DIAMOND, 69, 4);
    minend2ClassObject(GEM_CLASS, 69, 4);
    minend2FixedObject(DIAMOND, 69, 4);
    minend2ClassObject(GEM_CLASS, 69, 4);
    minend2FixedObject(EMERALD, 70, 4);
    minend2ClassObject(GEM_CLASS, 70, 4);
    minend2FixedObject(EMERALD, 70, 4);
    minend2ClassObject(GEM_CLASS, 70, 4);
    minend2FixedObject(EMERALD, 69, 5);
    minend2ClassObject(GEM_CLASS, 69, 5);
    minend2FixedObject(RUBY, 69, 5);
    minend2ClassObject(GEM_CLASS, 69, 5);
    minend2FixedObject(RUBY, 70, 5);
    minend2FixedObject(AMETHYST, 70, 5);
    minend2ClassObject(GEM_CLASS, 70, 5);
    minend2FixedObject(AMETHYST, 70, 5);
    const luckstone = minend2FixedObject(LUCKSTONE, 70, 5);
    if (luckstone) luckstone.cursed = false;

    for (let i = 0; i < 7; i++) minend2ClassObject(GEM_CLASS);
    minend2ClassObject(TOOL_CLASS);
    minend2ClassObject(TOOL_CLASS);
    minend2RandomObject();
    minend2RandomObject();
    minend2RandomObject();

    for (let i = 0; i < 6; i++) minend2Trap();

    for (const ref of [
        'GNOME_KING',
        'GNOME_LORD', 'GNOME_LORD', 'GNOME_LORD',
        'GNOMISH_WIZARD', 'GNOMISH_WIZARD',
        'GNOME', 'GNOME', 'GNOME', 'GNOME', 'GNOME', 'GNOME', 'GNOME', 'GNOME', 'GNOME',
        'HOBBIT', 'HOBBIT',
        'DWARF', 'DWARF', 'DWARF',
        'h',
    ]) minend2Monster(ref);
    wallification(1, 0, COLNO - 1, ROWNO - 1);
    flip_level_rnd(3);
}

function loadMinetown5Special() {
    // C ref: dat/minetn-5.lua loaded through sp_lev.c:lspo_map().
    rn2(3); rn2(2); // nhlib shuffle()
    rn2(2); // splev_initlev()
    for (let y = 0; y < ROWNO; y++)
        for (let x = 1; x < COLNO; x++)
            game.level.at(x, y).typ = STONE;
    game.level.flags.is_maze_lev = true;
    game.level.flags.has_town = true;
    game.level.flags.mines_walls = true;

    for (let y = 0; y < MINETN_5_MAP.length; y++)
        for (let x = 0; x < MINETN_5_MAP[y].length; x++)
            minetn5SetTerrain(x, y, MINETN_5_MAP[y][x]);

    if (rn2(100) < 75) {
        if (rn2(100) < 50) minetn5Line(25, 8, 25, 9, '|');
        else minetn5Line(16, 13, 17, 13, '-');
    }
    if (rn2(100) < 75) {
        if (rn2(100) < 50) minetn5Line(36, 10, 36, 11, '|');
        else minetn5Line(32, 15, 33, 15, '-');
    }
    if (rn2(100) < 50) {
        minetn5Area(21, 4, 22, 5, '.');
        minetn5Line(14, 9, 14, 10, '|');
    }
    if (rn2(100) < 50) {
        minetn5SetTerrain(46, 13, '|');
        minetn5Line(43, 5, 47, 5, '-');
        minetn5Line(42, 6, 46, 6, '.');
        minetn5Line(46, 7, 47, 7, '.');
    }
    if (rn2(100) < 50) minetn5Area(69, 11, 71, 11, '-');

    placeSpecialStair(minetn5X(1), minetn5Y(1), true);
    placeSpecialStair(minetn5X(46), minetn5Y(3), false);
    for (const [x, y] of [[50, 9], [10, 15], [66, 18]]) {
        const loc = game.level?.at(minetn5X(x), minetn5Y(y));
        if (loc) loc.typ = FOUNTAIN;
    }

    minetn5Region(0, 0, 74, 20, false);
    for (const r of [
        [9, 13, 11, 17], [8, 14, 12, 16], [49, 7, 51, 11],
        [48, 8, 52, 10], [64, 17, 68, 19], [37, 13, 39, 17],
        [36, 14, 40, 17], [59, 2, 72, 10],
    ]) minetn5Region(...r, true);

    for (const name of [
        'WATCHMAN', 'WATCHMAN', 'WATCHMAN', 'WATCHMAN', 'WATCH_CAPTAIN',
        'GNOME', 'GNOME', 'GNOME', 'GNOME', 'GNOME', 'GNOME',
        'GNOME_LORD', 'GNOME_LORD', 'DWARF', 'DWARF', 'DWARF',
    ]) minetn5Monster(name, null, null,
        name === 'WATCHMAN' || name === 'WATCH_CAPTAIN' ? true : null);

    minetn5RoomRegion(25, 17, 28, 19, true, CANDLESHOP);
    minetn5Door('closed', 24, 18);
    minetn5RoomRegion(59, 9, 67, 10, true, SHOPBASE);
    minetn5Door('closed', 66, 8);
    minetn5RoomRegion(57, 13, 60, 15, true, TOOLSHOP);
    minetn5Door('closed', 56, 14);
    minetn5RoomRegion(5, 9, 8, 10, true, FOODSHOP);
    minetn5Door('closed', 7, 11);
    minetn5Door('closed', 4, 14);
    minetn5Door('locked', 1, 17);
    minetn5Monster('GNOMISH_WIZARD', 2, 19);
    minetn5Door('locked', 20, 16);
    minetn5ClassMonster('S_GNOME', 20, 18);
    minetn5Door('random', 21, 14);
    minetn5Door('random', 25, 14);
    minetn5Door('random', 42, 8);
    minetn5Door('locked', 40, 5);
    minetn5ClassMonster('S_GNOME', 38, 7);
    minetn5Door('random', 59, 3);
    minetn5Door('random', 58, 6);
    minetn5Door('random', 63, 3);
    minetn5Door('random', 63, 5);
    minetn5Door('locked', 71, 3);
    minetn5Door('locked', 71, 6);
    minetn5Door('closed', 69, 4);
    minetn5Door('closed', 67, 16);
    minetn5Monster('GNOMISH_WIZARD', 67, 14);
    mkobj_at(RING_CLASS, minetn5X(70), minetn5Y(14), true);
    minetn5Door('locked', 69, 18);
    minetn5Monster('GNOME_LORD', 71, 19);
    minetn5Door('locked', 73, 18);
    mksobj_at(CHEST, minetn5X(73), minetn5Y(19), true, false);
    minetn5Door('locked', 50, 6);
    mkobj_at(TOOL_CLASS, minetn5X(50), minetn5Y(3), true);
    const statue = mksobj_at(STATUE, minetn5X(38), minetn5Y(15), true, true);
    if (statue) statue.corpsenm = MONSTERS.findIndex(m => m.name === 'GNOME_KING');

    const temple = {
        lx: minetn5X(29), ly: minetn5Y(2), hx: minetn5X(33), hy: minetn5Y(4),
        rtype: TEMPLE, rlit: 1, doorct: 0, fdoor: game.level.doorindex,
        irregular: false, needjoining: false, nsubrooms: 0, sbrooms: [],
        roomnoidx: game.level.nroom, needfill: FILL_LVFLAGS,
    };
    game.level.rooms[game.level.nroom] = temple;
    game.smeq[game.level.nroom] = game.level.nroom;
    game.level.nroom++;
    game.level.flags.has_temple = true;
    minetn5Door('closed', 31, 5);
    const altar = game.level?.at(minetn5X(31), minetn5Y(3));
    if (altar) altar.typ = ALTAR;
    priestini(temple);
    flip_level_rnd(3);

    wallification(1, 0, COLNO - 1, ROWNO - 1);
}

function loadSokoTerrain(spec) {
    const xstart = sokoXStart(spec);
    const ystart = sokoYStart(spec);
    for (let y = 0; y < spec.map.length; y++) {
        for (let x = 0; x < spec.map[y].length; x++) {
            const loc = game.level.at(x + xstart, y + ystart);
            if (!loc) continue;
            switch (spec.map[y][x]) {
            case '.':
                loc.typ = ROOM;
                loc.lit = true;
                break;
            case '-':
                loc.typ = HWALL;
                break;
            case '|':
                loc.typ = VWALL;
                break;
            case '+':
                loc.typ = DOOR;
                set_door_mask(loc, D_CLOSED);
                loc.lit = true;
                break;
            default:
                loc.typ = STONE;
                break;
            }
        }
    }
    game.level.flags.is_maze_lev = true;
    game.level.flags.mines_walls = true;
    game.level.flags.noteleport = true;
    game.level.flags.sokoban_rules = true;
}

function sokoDryLocation(spec) {
    let x, y, loc;
    const xstart = sokoXStart(spec);
    const ystart = sokoYStart(spec);
    do {
        x = rn2(spec.map[0].length);
        y = rn2(spec.map.length);
        loc = game.level?.at(x + xstart, y + ystart);
    } while (!loc || !SPACE_POS(loc.typ) || sobj_at(BOULDER, x + xstart, y + ystart));
    return { x: x + xstart, y: y + ystart };
}

function loadBigrm12Terrain() {
    for (let y = 0; y < BIGRM_12_MAP.length; y++) {
        for (let x = 0; x < BIGRM_12_MAP[y].length; x++) {
            const loc = game.level.at(x + BIGRM_12_XSTART, y + BIGRM_12_YSTART);
            if (!loc) continue;
            // C ref: dat/bigrm-12.lua des.region(selection.area(...), "lit")
            // runs before des.wallify(), so the whole scripted selection,
            // including stone that can become wall, participates in lit vision.
            loc.lit = true;
            switch (BIGRM_12_MAP[y][x]) {
            case '.': loc.typ = ROOM; break;
            case 'P': loc.typ = POOL; break;
            case 'W': loc.typ = WATER; break;
            case 'L': loc.typ = LAVAPOOL; break;
            case 'Z': loc.typ = LAVAWALL; break;
            default: loc.typ = STONE; break;
            }
        }
    }
    game.level.flags.is_maze_lev = true;
}

function bigrm12GetFloorLocation() {
    let x, y;
    do {
        x = rn2(75);
        y = rn2(19);
    } while (bigrm12TerrainAt(x, y) !== '.');
    return { x: x + BIGRM_12_XSTART, y: y + BIGRM_12_YSTART };
}

function bigrm2GetFloorLocation() {
    let x, y;
    do {
        x = rn2(75);
        y = rn2(18);
    } while (bigrm2TerrainAt(x, y) !== '.');
    return { x: x + BIGRM_2_XSTART, y: y + BIGRM_2_YSTART };
}

function bigrm4GetFloorLocation() {
    let x, y;
    do {
        x = rn2(75);
        y = rn2(18);
    } while (bigrm4TerrainAt(x, y) !== '.');
    return { x: x + BIGRM_4_XSTART, y: y + BIGRM_4_YSTART };
}

function placeSpecialStair(x, y, up) {
    const loc = game.level?.at(x, y);
    if (loc) {
        loc.typ = STAIRS;
        loc.ladder = up ? 1 : 2;
    }
    const dest = {
        dnum: game.u?.uz?.dnum ?? 0,
        dlevel: (game.u?.uz?.dlevel ?? 1) + (up ? -1 : 1),
    };
    stairway_add(x, y, !!up, false, dest);
    if (up) game.level.upstair = { x, y };
    else game.level.dnstair = { x, y };
}

function flipXForBounds(x, minx, maxx) {
    return (maxx - x) + minx;
}

function flipYForBounds(y, miny, maxy) {
    return (maxy - y) + miny;
}

function flipPoint(pt, flp, minx, miny, maxx, maxy, xprop = 'x', yprop = 'y') {
    if (!pt) return;
    const x = pt[xprop], y = pt[yprop];
    if (x == null || y == null || x < minx || x > maxx || y < miny || y > maxy) return;
    if (flp & 1) pt[yprop] = flipYForBounds(y, miny, maxy);
    if (flp & 2) pt[xprop] = flipXForBounds(x, minx, maxx);
}

function flipDestArea(dest, flp, minx, miny, maxx, maxy) {
    if (!dest?.lx) return;
    if (flp & 1) {
        const ly = flipYForBounds(dest.hy, miny, maxy);
        const hy = flipYForBounds(dest.ly, miny, maxy);
        dest.ly = Math.min(ly, hy);
        dest.hy = Math.max(ly, hy);
        if (dest.nly || dest.nhy) {
            const nly = flipYForBounds(dest.nhy, miny, maxy);
            const nhy = flipYForBounds(dest.nly, miny, maxy);
            dest.nly = Math.min(nly, nhy);
            dest.nhy = Math.max(nly, nhy);
        }
    }
    if (flp & 2) {
        const lx = flipXForBounds(dest.hx, minx, maxx);
        const hx = flipXForBounds(dest.lx, minx, maxx);
        dest.lx = Math.min(lx, hx);
        dest.hx = Math.max(lx, hx);
        if (dest.nlx || dest.nhx) {
            const nlx = flipXForBounds(dest.nhx, minx, maxx);
            const nhx = flipXForBounds(dest.nlx, minx, maxx);
            dest.nlx = Math.min(nlx, nhx);
            dest.nhx = Math.max(nlx, nhx);
        }
    }
}

function flip_level(flp) {
    if (!(flp & 3) || !game.level) return;
    const { xmin, xmax, ymin, ymax } = get_level_extends();
    const minx = Math.max(1, xmin);
    const maxx = Math.min(COLNO - 1, xmax);
    const miny = Math.max(0, ymin);
    const maxy = Math.min(ROWNO - 1, ymax);
    const map = game.level;

    if (flp & 1) {
        for (let y = miny; y < Math.trunc((miny + maxy + 1) / 2); y++) {
            const yy = flipYForBounds(y, miny, maxy);
            for (let x = minx; x <= maxx; x++)
                [map.locations[x][y], map.locations[x][yy]] = [map.locations[x][yy], map.locations[x][y]];
        }
    }
    if (flp & 2) {
        for (let x = minx; x < Math.trunc((minx + maxx + 1) / 2); x++) {
            const xx = flipXForBounds(x, minx, maxx);
            for (let y = miny; y <= maxy; y++)
                [map.locations[x][y], map.locations[xx][y]] = [map.locations[xx][y], map.locations[x][y]];
        }
    }

    for (const obj of map.objects || []) flipPoint(obj, flp, minx, miny, maxx, maxy, 'ox', 'oy');
    for (const trap of map.traps || []) {
        flipPoint(trap, flp, minx, miny, maxx, maxy, 'tx', 'ty');
        flipPoint(trap.launch, flp, minx, miny, maxx, maxy);
    }
    for (const mon of map.monsters || []) flipPoint(mon, flp, minx, miny, maxx, maxy, 'mx', 'my');
    for (const ep of map.engravings || []) flipPoint(ep, flp, minx, miny, maxx, maxy);
    for (const door of map.doors || []) flipPoint(door, flp, minx, miny, maxx, maxy);
    for (const room of map.rooms || []) {
        if (!room || room.hx < 0) continue;
        if (flp & 1) {
            const ly = flipYForBounds(room.hy, miny, maxy);
            const hy = flipYForBounds(room.ly, miny, maxy);
            room.ly = Math.min(ly, hy);
            room.hy = Math.max(ly, hy);
        }
        if (flp & 2) {
            const lx = flipXForBounds(room.hx, minx, maxx);
            const hx = flipXForBounds(room.lx, minx, maxx);
            room.lx = Math.min(lx, hx);
            room.hx = Math.max(lx, hx);
        }
    }
    for (let st = game.stairs; st; st = st.next)
        flipPoint(st, flp, minx, miny, maxx, maxy, 'sx', 'sy');
    flipPoint(map.upstair, flp, minx, miny, maxx, maxy);
    flipPoint(map.dnstair, flp, minx, miny, maxx, maxy);
    flipDestArea(game.updest, flp, minx, miny, maxx, maxy);
    flipDestArea(game.dndest, flp, minx, miny, maxx, maxy);

    // JS stores display-oriented wall spines directly in terrain; C derives
    // the rendered wall angle from seenv, so rebuild spines after transposing.
    fix_wall_spines(minx, miny, maxx, maxy);
}

function flip_level_rnd(allow_flips) {
    let flp = 0;
    if ((allow_flips & 1) && rn2(2)) flp |= 1;
    if ((allow_flips & 2) && rn2(2)) flp |= 2;
    if (flp) flip_level(flp);
    return flp;
}

function wallify_map(x1, y1, x2, y2) {
    const map = game.level;
    if (!map) return;
    y1 = Math.max(y1, 0);
    x1 = Math.max(x1, 1);
    y2 = Math.min(y2, ROWNO - 1);
    x2 = Math.min(x2, COLNO - 1);
    for (let y = y1; y <= y2; y++) {
        const loY = y > 0 ? y - 1 : 0;
        const hiY = y < y2 ? y + 1 : y2;
        for (let x = x1; x <= x2; x++) {
            const loc = map.at(x, y);
            if (!loc || loc.typ !== STONE) continue;
            const loX = x > 1 ? x - 1 : 1;
            const hiX = x < x2 ? x + 1 : x2;
            let wallTyp = null;
            for (let yy = loY; yy <= hiY && wallTyp == null; yy++) {
                for (let xx = loX; xx <= hiX; xx++) {
                    const typ = map.at(xx, yy)?.typ;
                    if (IS_ROOM(typ) || typ === CROSSWALL) {
                        wallTyp = (yy !== y) ? HWALL : VWALL;
                        break;
                    }
                }
            }
            if (wallTyp != null) loc.typ = wallTyp;
        }
    }
}

function loadBigrm12Special() {
    loadBigrm12Terrain();
    const align = [0, 0, 0];
    for (let i = align.length; i > 1; i--) {
        const j = rn2(i);
        [align[i - 1], align[j]] = [align[j], align[i - 1]];
    }
    rn2(2); // splev_initlev flip state for noflipy map initialization
    rn2(100); // percent(20), wall replacement
    rn2(100); // percent(25), water side replacement
    rn2(100); // percent(25), lava side replacement
    rn2(100); // percent(20), terrain mirroring

    // C ref: bigrm-12.lua des.wallify() -> sp_lev.c:wallify_map().
    wallify_map(0, 0, COLNO - 1, ROWNO - 1);

    bigrm12GetFloorLocation(); // up stair
    bigrm12GetFloorLocation(); // down stair
    for (let i = 0; i < 15; i++) {
        const loc = bigrm12GetFloorLocation();
        mkobj_at(RANDOM_CLASS, loc.x, loc.y, true);
    }
    for (let i = 0; i < 6; i++) {
        const loc = bigrm12GetFloorLocation();
        let kind;
        do { kind = traptype_rnd(); } while (kind === NO_TRAP);
        maketrap(loc.x, loc.y, kind);
        const lvl = level_difficulty();
        if (game.in_mklev && kind !== NO_TRAP
            && lvl <= rnd(4)
            && kind !== SQKY_BOARD && kind !== RUST_TRAP
            && !is_pit(kind) && (kind < HOLE || kind === MAGIC_TRAP)) {
            mktrap_victim({ ttyp: kind, tx: loc.x, ty: loc.y });
        }
    }
    for (let i = 0; i < 28; i++) {
        rn2(3); // induced_align() for random monsters on special levels
        const loc = bigrm12GetFloorLocation();
        makemon(null, loc.x, loc.y, 0);
    }
}

function loadBigrm2Terrain() {
    for (let y = 0; y < BIGRM_2_MAP.length; y++) {
        for (let x = 0; x < BIGRM_2_MAP[y].length; x++) {
            const loc = game.level.at(x + BIGRM_2_XSTART, y + BIGRM_2_YSTART);
            if (!loc) continue;
            switch (BIGRM_2_MAP[y][x]) {
            case '.':
                loc.typ = ROOM;
                loc.lit = true;
                break;
            case '-':
                loc.typ = HWALL;
                break;
            case '|':
                loc.typ = VWALL;
                break;
            default:
                loc.typ = STONE;
                break;
            }
        }
    }
    game.level.flags.is_maze_lev = true;
}

function bigrmTerrainType(ch) {
    switch (ch) {
    case '.': return ROOM;
    case '-': return HWALL;
    case '|': return VWALL;
    case 'P': return POOL;
    case 'L': return LAVAPOOL;
    case 'T': return TREE;
    case 'W': return WATER;
    case 'Z': return LAVAWALL;
    default: return STONE;
    }
}

function loadBigrm4Terrain() {
    for (let y = 0; y < BIGRM_4_MAP.length; y++) {
        for (let x = 0; x < BIGRM_4_MAP[y].length; x++) {
            const loc = game.level.at(x + BIGRM_4_XSTART, y + BIGRM_4_YSTART);
            if (!loc) continue;
            loc.typ = bigrmTerrainType(BIGRM_4_MAP[y][x]);
        }
    }
    game.level.flags.is_maze_lev = true;
}

const WALL_MEMORY_GLYPHS = {
    [HWALL]: 'q',
    [VWALL]: 'x',
    [TLCORNER]: 'l',
    [TRCORNER]: 'k',
    [BLCORNER]: 'm',
    [BRCORNER]: 'j',
    [CROSSWALL]: 'n',
    [TUWALL]: 'v',
    [TDWALL]: 'w',
    [TLWALL]: 'u',
    [TRWALL]: 't',
};

function rememberWallsInRect(x1, y1, x2, y2) {
    for (let y = y1; y <= y2; y++) {
        for (let x = x1; x <= x2; x++) {
            const loc = game.level?.at(x, y);
            const ch = WALL_MEMORY_GLYPHS[loc?.typ];
            if (!ch) continue;
            loc.remembered_glyph = { ch, color: 8, decgfx: true };
        }
    }
}

function lightWallsAdjacentToLitCells(x1, y1, x2, y2) {
    // C ref: vision.c:vision_recalc() one-sided lit wall handling.
    for (let y = y1; y <= y2; y++) {
        for (let x = x1; x <= x2; x++) {
            const loc = game.level?.at(x, y);
            if (!loc || loc.lit || !IS_WALL(loc.typ)) continue;
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                if (game.level?.at(x + dx, y + dy)?.lit) {
                    loc.lit = true;
                    break;
                }
            }
        }
    }
}

function premapGlyphForLoc(loc, x, y) {
    switch (loc?.typ) {
    case ROOM: return { ch: '~', color: 8, decgfx: true };
    case CORR: return { ch: '#', color: 8, decgfx: false };
    case DOOR:
        if (loc.doormask & D_ISOPEN) return { ch: '|', color: 3, decgfx: false };
        if (loc.doormask & (D_CLOSED | D_LOCKED)) return { ch: '+', color: 3, decgfx: false };
        return { ch: '~', color: 8, decgfx: true };
    case STAIRS:
        return {
            ch: game.level?.upstair?.x === x && game.level?.upstair?.y === y ? '<' : '>',
            color: 7,
            decgfx: false,
        };
    case HWALL: return { ch: 'q', color: 4, decgfx: true };
    case VWALL: return { ch: 'x', color: 4, decgfx: true };
    case TLCORNER: return { ch: 'l', color: 4, decgfx: true };
    case TRCORNER: return { ch: 'k', color: 4, decgfx: true };
    case BLCORNER: return { ch: 'm', color: 4, decgfx: true };
    case BRCORNER: return { ch: 'j', color: 4, decgfx: true };
    case CROSSWALL: return { ch: 'n', color: 4, decgfx: true };
    case TUWALL: return { ch: 'v', color: 4, decgfx: true };
    case TDWALL: return { ch: 'w', color: 4, decgfx: true };
    case TLWALL: return { ch: 'u', color: 4, decgfx: true };
    case TRWALL: return { ch: 't', color: 4, decgfx: true };
    default: return null;
    }
}

function premapSokoban() {
    for (let y = 0; y < ROWNO; y++) {
        for (let x = 1; x < COLNO; x++) {
            const loc = game.level?.at(x, y);
            const bg = premapGlyphForLoc(loc, x, y);
            if (!bg) continue;
            loc.seenv = 0xff;
            loc.waslit = true;
            loc.remembered_glyph = bg;
            const boulder = sobj_at(BOULDER, x, y);
            if (boulder) {
                loc.remembered_glyph = {
                    ch: boulder.ch || '`',
                    color: boulder.color ?? 7,
                    decgfx: false,
                };
            }
        }
    }

    for (const trap of game.level?.traps || []) {
        const loc = game.level?.at(trap.tx, trap.ty);
        if (!loc) continue;
        trap.tseen = true;
        loc.remembered_glyph = {
            ch: '^',
            color: (trap.ttyp === HOLE || trap.ttyp === TRAPDOOR) ? 3 : 7,
            decgfx: false,
        };
    }
    game.level.flags.premapped = true;
}

function loadBigrm2Special() {
    loadBigrm2Terrain();
    const align = [0, 0, 0];
    for (let i = align.length; i > 1; i--) {
        const j = rn2(i);
        [align[i - 1], align[j]] = [align[j], align[i - 1]];
    }
    rn2(2); // splev_initlev flip state for des.level_flags("noflip")
    const darknessChoice = rn2(4); // math.random(0, 3)
    if (darknessChoice !== 3 && rn2(100) < 25) {
        // des.replace_terrain(darkness:grow(), ".", "I") has no RNG; the
        // exact ice mask can be filled in when display/terrain needs it.
    }

    let loc = bigrm2GetFloorLocation();
    placeSpecialStair(loc.x, loc.y, true);
    loc = bigrm2GetFloorLocation();
    placeSpecialStair(loc.x, loc.y, false);

    for (let i = 0; i < 15; i++) {
        loc = bigrm2GetFloorLocation();
        mkobj_at(RANDOM_CLASS, loc.x, loc.y, true);
    }
    for (let i = 0; i < 6; i++) {
        loc = bigrm2GetFloorLocation();
        let kind;
        do { kind = traptype_rnd(); } while (kind === NO_TRAP);
        maketrap(loc.x, loc.y, kind);
        const lvl = level_difficulty();
        if (game.in_mklev && kind !== NO_TRAP
            && lvl <= rnd(4)
            && kind !== SQKY_BOARD && kind !== RUST_TRAP
            && !is_pit(kind) && (kind < HOLE || kind === MAGIC_TRAP)) {
            mktrap_victim({ ttyp: kind, tx: loc.x, ty: loc.y });
        }
    }
    for (let i = 0; i < 28; i++) {
        rn2(3);
        loc = bigrm2GetFloorLocation();
        makemon(null, loc.x, loc.y, 0);
    }
}

function loadBigrm4Special() {
    // C ref: dat/bigrm-4.lua loaded through mkmaze.c:makemaz().
    loadBigrm4Terrain();
    l_nhcore_init();
    rn2(2); // splev_initlev flip state for des.level_flags("noflip")

    const terrains = ['.', '.', '.', '.', 'P', 'L', '-', 'T', 'W', 'Z'];
    const toterr = terrains[rn2(terrains.length)];
    if (toterr !== 'L') {
        for (let y = 0; y < BIGRM_4_MAP.length; y++) {
            for (let x = 0; x < BIGRM_4_MAP[y].length; x++) {
                if (BIGRM_4_MAP[y][x] !== 'L') continue;
                if (rn2(100) < 100) {
                    const loc = game.level?.at(x + BIGRM_4_XSTART, y + BIGRM_4_YSTART);
                    if (loc) loc.typ = bigrmTerrainType(toterr);
                }
            }
        }
    }

    for (const [x, y] of [[5, 2], [5, 15], [69, 2], [69, 15]]) {
        const loc = game.level?.at(x + BIGRM_4_XSTART, y + BIGRM_4_YSTART);
        if (loc) loc.typ = FOUNTAIN;
    }
    for (let y = 1; y <= 16; y++)
        for (let x = 1; x <= 73; x++) {
            const loc = game.level?.at(x + BIGRM_4_XSTART, y + BIGRM_4_YSTART);
            if (loc) loc.lit = true;
        }

    let loc = bigrm4GetFloorLocation();
    placeSpecialStair(loc.x, loc.y, true);
    loc = bigrm4GetFloorLocation();
    placeSpecialStair(loc.x, loc.y, false);
    for (let i = 0; i < 15; i++) {
        loc = bigrm4GetFloorLocation();
        mkobj_at(RANDOM_CLASS, loc.x, loc.y, true);
    }
    for (let i = 0; i < 6; i++) {
        loc = bigrm4GetFloorLocation();
        let kind;
        do { kind = traptype_rnd(); } while (kind === NO_TRAP);
        const trap = maketrap(loc.x, loc.y, kind);
        maybeTrapVictim(trap);
    }
    for (let i = 0; i < 28; i++) {
        rn2(3);
        loc = bigrm4GetFloorLocation();
        makemon(null, loc.x, loc.y, 0);
    }
}

function maybeTrapVictim(trap) {
    const kind = trap?.ttyp ?? NO_TRAP;
    const lvl = level_difficulty();
    if (kind === WEB) {
        // C ref: mklev.c:mktrap() creates a web's guarding spider before
        // the trap victim gate.
        makemon(monster_ptr('GIANT_SPIDER'), trap.tx, trap.ty, 0);
    }
    if (game.in_mklev && kind !== NO_TRAP
        && lvl <= rnd(4)
        && kind !== SQKY_BOARD && kind !== RUST_TRAP
        && !(kind === ROLLING_BOULDER_TRAP && trap.launch?.x === trap.tx && trap.launch?.y === trap.ty)
        && !is_pit(kind) && (kind < HOLE || kind === MAGIC_TRAP)) {
        if (kind === LANDMINE) { trap.ttyp = PIT; trap.tseen = true; }
        mktrap_victim(trap);
    }
}

function createSokoGiantMimic(spec) {
    rn2(2); // find_montype() name ambiguity gate for "giant mimic".
    rn2(3); // induced_align() for special-level monsters.
    const ptr = MONSTERS.find(m => m.name === 'GIANT_MIMIC');
    const loc = sokoDryLocation(spec);
    const mon = makemon(ptr, loc.x, loc.y, 0);
    if (mon) {
        mon.m_ap_type = M_AP_OBJECT;
        mon.mappearance = BOULDER;
    }
}

function sokoRandomObject(spec, oclass) {
    const loc = sokoDryLocation(spec);
    mkobj_at(oclass, loc.x, loc.y, true);
}

function createSokoReward(spec) {
    const idx = rn2(spec.rewardPlaces.length);
    const [rx, ry] = spec.rewardPlaces[idx];
    const loc = sokoAbs(spec, rx, ry);
    const prize = (rn2(100) < spec.rewardBagPercent) ? BAG_OF_HOLDING : AMULET_OF_REFLECTION;
    const prizeObj = mksobj_at(prize, loc.x, loc.y, true, false);
    if (prizeObj) {
        prizeObj.cursed = false;
        prizeObj.blessed = false;
    }
    make_engr_at(loc.x, loc.y, 'Elbereth', 0, 0, 1);
    const scare = mksobj_at(SCR_SCARE_MONSTER, loc.x, loc.y, true, false);
    if (scare) {
        scare.cursed = true;
        scare.blessed = false;
    }
}

function createSokoZooRoom(spec) {
    const [x1, y1] = spec.zooRegion || [];
    const room = createIrregularRoomFromSeed(sokoXStart(spec) + x1, sokoYStart(spec) + y1,
        ZOO, true, FILL_NORMAL);
    if (!room) return null;
    for (let x = room.lx - 1; x <= room.hx + 1; x++)
        for (let y = room.ly - 1; y <= room.hy + 1; y++) {
            const loc = game.level.at(x, y);
            if (loc && IS_DOOR(loc.typ)) add_door(x, y, room);
        }
    return room;
}

function loadSokoSpecial(protofile) {
    const spec = SOKO_LEVELS[protofile];
    if (!spec) return false;
    loadSokoTerrain(spec);
    const align = [0, 0, 0];
    for (let i = align.length; i > 1; i--) {
        const j = rn2(i);
        [align[i - 1], align[j]] = [align[j], align[i - 1]];
    }
    rn2(2); // splev_initlev lit state for solidfill.

    let loc;
    if (spec.stairs) {
        for (const [up, x, y] of spec.stairs) {
            loc = sokoAbs(spec, x, y);
            placeSpecialStair(loc.x, loc.y, up);
        }
    } else {
        loc = sokoAbs(spec, spec.stair[0], spec.stair[1]);
        placeSpecialStair(loc.x, loc.y, false);
    }

    for (const [x, y] of spec.boulders) {
        loc = sokoAbs(spec, x, y);
        mksobj_at(BOULDER, loc.x, loc.y, true, false);
    }

    for (const [kind, x, y] of spec.traps) {
        loc = sokoAbs(spec, x, y);
        const trap = maketrap(loc.x, loc.y, kind);
        maybeTrapVictim(trap);
    }

    for (const [otyp, x, y] of spec.typedObjects || []) {
        loc = sokoAbs(spec, x, y);
        mksobj_at(otyp, loc.x, loc.y, true, false);
    }

    if (spec.rewardPlaces) {
        createSokoGiantMimic(spec);
        createSokoGiantMimic(spec);
    }

    for (const cls of spec.randomObjects || [FOOD_CLASS, FOOD_CLASS, FOOD_CLASS, FOOD_CLASS, RING_CLASS, WAND_CLASS]) {
        sokoRandomObject(spec, cls);
    }

    for (const [x, y, mask] of spec.doors) {
        loc = sokoAbs(spec, x, y);
        const door = game.level?.at(loc.x, loc.y);
        if (door) {
            door.typ = DOOR;
            set_door_mask(door, mask);
        }
    }

    const zooRoom = spec.zooRegion ? createSokoZooRoom(spec) : null;
    if (spec.rewardPlaces) createSokoReward(spec);
    wallification(1, 0, COLNO - 1, ROWNO - 1);
    const flp = flip_level_rnd(3);
    if (spec.branchRegion) {
        const [x1, y1, x2, y2] = spec.branchRegion;
        const inarea = {
            x1: sokoXStart(spec) + x1,
            y1: sokoYStart(spec) + y1,
            x2: sokoXStart(spec) + x2,
            y2: sokoYStart(spec) + y2,
        };
        const bounds = {
            minx: sokoXStart(spec),
            miny: sokoYStart(spec),
            maxx: sokoXStart(spec) + spec.map[0].length - 1,
            maxy: sokoYStart(spec) + spec.map.length - 1,
        };
        if (flp & 1) {
            const ny1 = flipYForBounds(inarea.y2, bounds.miny, bounds.maxy);
            const ny2 = flipYForBounds(inarea.y1, bounds.miny, bounds.maxy);
            inarea.y1 = Math.min(ny1, ny2);
            inarea.y2 = Math.max(ny1, ny2);
        }
        if (flp & 2) {
            const nx1 = flipXForBounds(inarea.x2, bounds.minx, bounds.maxx);
            const nx2 = flipXForBounds(inarea.x1, bounds.minx, bounds.maxx);
            inarea.x1 = Math.min(nx1, nx2);
            inarea.x2 = Math.max(nx1, nx2);
        }
        game._special_lregions = [{
            rtype: LR_BRANCH,
            inarea,
            delarea: { x1: -1, y1: -1, x2: -1, y2: -1 },
        }];
        fixup_special();
    }
    premapSokoban();
    if (zooRoom) fill_special_room(zooRoom);
    return true;
}

function towerX(x, xstart = TOWER1_X) { return xstart + x; }
function towerY(y, ystart = TOWER1_Y) { return ystart + y; }
function towerAbs(x, y, xstart = TOWER1_X, ystart = TOWER1_Y) {
    return { x: towerX(x, xstart), y: towerY(y, ystart) };
}
function tower1X(x) { return towerX(x, TOWER1_X); }
function tower1Y(y) { return towerY(y, TOWER1_Y); }
function tower1Abs(x, y) { return towerAbs(x, y, TOWER1_X, TOWER1_Y); }

function loadTowerTerrain(mapRows, xstart = TOWER1_X, ystart = TOWER1_Y) {
    game.level.flags.is_maze_lev = true;
    game.level.flags.noteleport = true;
    game.level.flags.hardfloor = true;
    for (let y = 0; y < mapRows.length; y++) {
        const row = mapRows[y];
        for (let x = 0; x < row.length; x++) {
            const loc = game.level?.at(towerX(x, xstart), towerY(y, ystart));
            if (!loc) continue;
            switch (row[x]) {
            case '.':
                loc.typ = ROOM;
                break;
            case '-':
                loc.typ = HWALL;
                break;
            case '|':
                loc.typ = VWALL;
                break;
            case '+':
                loc.typ = DOOR;
                set_door_mask(loc, D_CLOSED);
                break;
            case 'S':
                loc.typ = SDOOR;
                loc.horizontal = row[x - 1] === '-' || row[x + 1] === '-';
                set_door_mask(loc, D_CLOSED);
                break;
            case '\\':
                loc.typ = THRONE;
                break;
            default:
                loc.typ = STONE;
                break;
            }
        }
    }
}

function loadTower1Terrain() {
    loadTowerTerrain(TOWER1_MAP);
}

function placeSpecialLadder(x, y, up) {
    const loc = game.level?.at(x, y);
    if (loc) {
        loc.typ = LADDER;
        loc.ladder = up ? 1 : 2;
    }
    const dest = {
        dnum: game.u?.uz?.dnum ?? 0,
        dlevel: (game.u?.uz?.dlevel ?? 1) + (up ? -1 : 1),
    };
    stairway_add(x, y, !!up, true, dest);
}

function towerMonsterClass(ch) {
    if (ch === 'V') return 'S_VAMPIRE';
    if (ch === '&') return 'S_DEMON';
    if (ch === 'D') return 'S_DRAGON';
    return null;
}

function towerCreateMonster(id, x, y, opts = {}) {
    const xstart = opts.xstart ?? TOWER1_X;
    const ystart = opts.ystart ?? TOWER1_Y;
    const cls = String(id || '').length === 1 ? towerMonsterClass(id) : null;
    let ptr = cls ? null : monster_by_user_name(id);
    if (!cls && !opts.waiting && monster_name_needs_find_gender_roll(id, ptr)) rn2(2);
    rn2(3); // C ref: dungeon.c:induced_align() on unaligned Vlad's Tower levels.
    if (cls) ptr = mkclass_aligned(cls, G_NOGEN);
    const mon = makemon(ptr, towerX(x, xstart), towerY(y, ystart), opts.mmflags || 0);
    if (mon && opts.name) mon.mgivenname = opts.name;
    if (mon && opts.waiting) {
        // C ref: sp_lev.c:create_monster() applies Lua `waiting=1` by
        // setting STRAT_WAITFORU, independent of the monster's mflags3.
        mon.mstrategy |= STRAT_WAITFORU;
        mon.mstrategy_waiting = 1;
        if (ptr && mon.data?.name !== ptr.name) {
            mgender_from_permonst_for(mon, ptr);
            const monState = newmonhp_state_for(ptr);
            mon.data = { ...ptr, mmove: ptr.mmove ?? 12 };
            mon.ch = MONSTER_SYMBOLS[ptr.mlet] ?? mon.ch;
            mon.color = ptr.color ?? mon.color;
            mon.m_lev = monState.level;
            mon.mhp = monState.hp;
            mon.mhpmax = monState.hp;
            mon.cham = null;
        }
    }
    return mon;
}

function tower1SetDoor(x, y, mask) {
    towerSetDoor(x, y, mask, TOWER1_X, TOWER1_Y);
}

function towerSetDoor(x, y, mask, xstart = TOWER1_X, ystart = TOWER1_Y) {
    const loc = game.level?.at(towerX(x, xstart), towerY(y, ystart));
    if (!loc) return;
    loc.typ = DOOR;
    set_door_mask(loc, mask);
}

function towerRandomDryLocation(mapRows, xstart = TOWER1_X, ystart = TOWER1_Y) {
    return specialRandomDryLocation(mapRows[0].length, mapRows.length, xstart, ystart);
}

function towerCreateTrapAt(x, y, xstart = TOWER1_X, ystart = TOWER1_Y) {
    let kind;
    do { kind = traptype_rnd(); } while (kind === NO_TRAP);
    const trap = maketrap(towerX(x, xstart), towerY(y, ystart), kind);
    maybeTrapVictim(trap);
}

function towerCreateRandomMonster(mapRows, xstart = TOWER1_X, ystart = TOWER1_Y) {
    rn2(3); // C ref: dungeon.c:induced_align() on unaligned Vlad's Tower levels.
    const loc = towerRandomDryLocation(mapRows, xstart, ystart);
    if (m_at(loc.x, loc.y)) {
        const cc = enexto_core(loc.x, loc.y, null, GP_CHECKSCARY)
            || enexto_core(loc.x, loc.y, null, 0);
        if (cc) {
            loc.x = cc.x;
            loc.y = cc.y;
        }
    }
    return makemon(null, loc.x, loc.y, 0);
}

function loadTower1Special() {
    loadTower1Terrain();
    const align = [0, 0, 0];
    for (let i = align.length; i > 1; i--) {
        const j = rn2(i);
        [align[i - 1], align[j]] = [align[j], align[i - 1]];
    }
    rn2(2); // splev_initlev lit state for solidfill.

    const niches = [[3, 1], [3, 9], [7, 1], [7, 9], [11, 1], [11, 9]];
    for (let i = niches.length; i > 1; i--) {
        const j = rn2(i);
        [niches[i - 1], niches[j]] = [niches[j], niches[i - 1]];
    }

    placeSpecialLadder(tower1X(11), tower1Y(5), false);
    towerCreateMonster('Vlad the Impaler', 6, 5);
    for (let i = 0; i < 3; i++) towerCreateMonster('V', niches[i][0], niches[i][1]);
    const names = ['Madame', 'Marquise', 'Countess'];
    for (let i = 3; i < 6; i++) {
        towerCreateMonster('vampire lord', niches[i][0], niches[i][1], {
            name: names[i - 3],
            waiting: true,
        });
    }

    for (const [x, y, mask] of [
        [8, 3, D_CLOSED], [10, 3, D_CLOSED], [3, 4, D_CLOSED],
        [10, 5, D_LOCKED], [8, 7, D_LOCKED], [10, 7, D_LOCKED],
        [3, 6, D_CLOSED],
    ]) tower1SetDoor(x, y, mask);

    mksobj_at(CHEST, tower1X(7), tower1Y(5), true, false);
    for (const idx of [5, 0, 1, 2, 3, 4]) {
        const [x, y] = niches[idx];
        const chest = mksobj_at(CHEST, tower1X(x), tower1Y(y), true, false);
        if ((idx === 3 || idx === 4) && chest) {
            rn1(5, 4); // Lua math.random(4,8) for scripted candle quantity.
            specialRandomDryLocation(TOWER1_MAP[0].length, TOWER1_MAP.length, TOWER1_X, TOWER1_Y);
            mksobj(idx === 3 ? WAX_CANDLE : TALLOW_CANDLE, true, false);
        }
    }

    wallification(1, 0, COLNO - 1, ROWNO - 1);
    flip_level_rnd(3);
}

function loadTower2Special() {
    loadTowerTerrain(TOWER2_MAP);
    const align = [0, 0, 0];
    for (let i = align.length; i > 1; i--) {
        const j = rn2(i);
        [align[i - 1], align[j]] = [align[j], align[i - 1]];
    }
    rn2(2); // splev_initlev lit state for solidfill.

    const place = [[3, 1], [7, 1], [11, 1], [1, 3], [13, 3],
        [1, 7], [13, 7], [3, 9], [7, 9], [11, 9]];
    for (let i = place.length; i > 1; i--) {
        const j = rn2(i);
        [place[i - 1], place[j]] = [place[j], place[i - 1]];
    }

    placeSpecialLadder(tower1X(11), tower1Y(5), true);
    placeSpecialLadder(tower1X(3), tower1Y(7), false);
    tower1SetDoor(10, 4, D_LOCKED);
    tower1SetDoor(9, 7, D_LOCKED);

    towerCreateMonster('&', place[9][0], place[9][1]);
    towerCreateMonster('&', place[0][0], place[0][1]);
    towerCreateMonster('hell hound pup', place[1][0], place[1][1]);
    towerCreateMonster('hell hound pup', place[2][0], place[2][1]);
    towerCreateMonster('winter wolf', place[3][0], place[3][1]);

    let loc = tower1Abs(place[4][0], place[4][1]);
    mksobj_at(CHEST, loc.x, loc.y, true, false);
    specialRandomDryLocation(TOWER2_MAP[0].length, TOWER2_MAP.length, TOWER1_X, TOWER1_Y);
    mksobj(AMULET_OF_LIFE_SAVING, true, false);

    loc = tower1Abs(place[5][0], place[5][1]);
    mksobj_at(CHEST, loc.x, loc.y, true, false);
    specialRandomDryLocation(TOWER2_MAP[0].length, TOWER2_MAP.length, TOWER1_X, TOWER1_Y);
    mksobj(AMULET_OF_STRANGULATION, true, false);

    loc = tower1Abs(place[6][0], place[6][1]);
    mksobj_at(WATER_WALKING_BOOTS, loc.x, loc.y, true, true);
    loc = tower1Abs(place[7][0], place[7][1]);
    mksobj_at(CRYSTAL_PLATE_MAIL, loc.x, loc.y, true, true);

    const spbooks = [
        SPE_INVISIBILITY, SPE_CONE_OF_COLD, SPE_CREATE_FAMILIAR,
        SPE_CLAIRVOYANCE, SPE_CHARM_MONSTER, SPE_STONE_TO_FLESH,
        SPE_POLYMORPH,
    ];
    for (let i = spbooks.length; i > 1; i--) {
        const j = rn2(i);
        [spbooks[i - 1], spbooks[j]] = [spbooks[j], spbooks[i - 1]];
    }
    loc = tower1Abs(place[8][0], place[8][1]);
    mksobj_at(spbooks[0], loc.x, loc.y, true, false);

    wallification(1, 0, COLNO - 1, ROWNO - 1);
    flip_level_rnd(3);
}

function loadTower3Special() {
    loadTowerTerrain(TOWER3_MAP, TOWER3_X, TOWER3_Y);
    const align = [0, 0, 0];
    for (let i = align.length; i > 1; i--) {
        const j = rn2(i);
        [align[i - 1], align[j]] = [align[j], align[i - 1]];
    }
    rn2(2); // splev_initlev lit state for solidfill.

    const place = [[5, 1], [9, 1], [13, 1], [3, 3], [15, 3],
        [3, 7], [15, 7], [5, 9], [9, 9], [13, 9]];

    placeSpecialLadder(towerX(5, TOWER3_X), towerY(7, TOWER3_Y), true);
    towerSetDoor(14, 5, D_LOCKED, TOWER3_X, TOWER3_Y);

    towerCreateMonster('D', 13, 5, { xstart: TOWER3_X, ystart: TOWER3_Y });
    towerCreateMonster(null, 12, 4, { xstart: TOWER3_X, ystart: TOWER3_Y });
    towerCreateMonster(null, 12, 6, { xstart: TOWER3_X, ystart: TOWER3_Y });
    for (let i = 0; i < 6; i++) towerCreateRandomMonster(TOWER3_MAP, TOWER3_X, TOWER3_Y);

    let loc = towerAbs(place[3][0], place[3][1], TOWER3_X, TOWER3_Y);
    mksobj_at(LONG_SWORD, loc.x, loc.y, true, true);
    towerCreateTrapAt(place[3][0], place[3][1], TOWER3_X, TOWER3_Y);

    loc = towerAbs(place[0][0], place[0][1], TOWER3_X, TOWER3_Y);
    mksobj_at(LOCK_PICK, loc.x, loc.y, true, true);
    towerCreateTrapAt(place[0][0], place[0][1], TOWER3_X, TOWER3_Y);

    loc = towerAbs(place[1][0], place[1][1], TOWER3_X, TOWER3_Y);
    mksobj_at(ELVEN_CLOAK, loc.x, loc.y, true, true);
    towerCreateTrapAt(place[1][0], place[1][1], TOWER3_X, TOWER3_Y);

    loc = towerAbs(place[2][0], place[2][1], TOWER3_X, TOWER3_Y);
    mksobj_at(BLINDFOLD, loc.x, loc.y, true, true);
    towerCreateTrapAt(place[2][0], place[2][1], TOWER3_X, TOWER3_Y);

    wallification(1, 0, COLNO - 1, ROWNO - 1);
    const flp = flip_level_rnd(3);
    const bounds = {
        minx: TOWER3_X,
        miny: TOWER3_Y,
        maxx: TOWER3_X + TOWER3_MAP[0].length - 1,
        maxy: TOWER3_Y + TOWER3_MAP.length - 1,
    };
    const branch = flipRectForBounds({
        x1: towerX(2, TOWER3_X), y1: towerY(5, TOWER3_Y),
        x2: towerX(2, TOWER3_X), y2: towerY(5, TOWER3_Y),
    }, flp, bounds.minx, bounds.miny, bounds.maxx, bounds.maxy);
    game._special_lregions = [{
        rtype: LR_BRANCH,
        inarea: branch,
        delarea: { x1: -1, y1: -1, x2: -1, y2: -1 },
    }];
    fixup_special();
}

function medusa3SetTerrain() {
    game.level.flags.is_maze_lev = true;
    game.level.flags.noteleport = true;
    game.level.flags.shortsighted = true;
    for (let y = 0; y < MEDUSA3_MAP.length; y++) {
        const row = MEDUSA3_MAP[y];
        for (let x = 0; x < row.length; x++) {
            const loc = game.level?.at(MEDUSA3_X + x, MEDUSA3_Y + y);
            if (!loc) continue;
            loc.lit = false;
            switch (row[x]) {
            case '.':
                loc.typ = ROOM;
                break;
            case '}':
                loc.typ = MOAT;
                break;
            case 'T':
                loc.typ = TREE;
                break;
            case '-':
                loc.typ = HWALL;
                break;
            case '|':
                loc.typ = VWALL;
                break;
            case '+':
                loc.typ = DOOR;
                set_door_mask(loc, D_CLOSED);
                break;
            case 'S':
                loc.typ = SDOOR;
                loc.horizontal = row[x - 1] === '-' || row[x + 1] === '-';
                set_door_mask(loc, D_CLOSED);
                break;
            default:
                loc.typ = STONE;
                break;
            }
        }
    }
}

function medusa3ApplyLitRegion(x1, y1, x2, y2, lit) {
    for (let y = y1; y <= y2; y++) {
        for (let x = x1; x <= x2; x++) {
            const loc = game.level?.at(MEDUSA3_X + x, MEDUSA3_Y + y);
            if (loc) loc.lit = !!lit;
        }
    }
}

function medusa3ArrivalRoom(lit) {
    // C ref: dat/medusa-3.lua arrival_room region via sp_lev.c:lspo_region().
    const before = game.level?.nroom ?? 0;
    add_room(MEDUSA3_X + 49, MEDUSA3_Y + 14, MEDUSA3_X + 51, MEDUSA3_Y + 16,
        lit ? 1 : 0, OROOM, true);
    const croom = game.level?.rooms?.[before];
    if (croom) {
        croom.needfill = FILL_NONE;
        croom.needjoining = true;
    }
}

function medusa3SetDoor(x, y, mask) {
    const loc = game.level?.at(MEDUSA3_X + x, MEDUSA3_Y + y);
    if (!loc) return;
    loc.typ = DOOR;
    set_door_mask(loc, mask);
}

function medusa3RandomDoor(x, y) {
    const states = [D_NODOOR, D_BROKEN, D_ISOPEN, D_CLOSED, D_LOCKED];
    medusa3SetDoor(x, y, states[rn2(states.length)]);
}

function medusa3PickCoord(points) {
    const idx = rn2(points.length);
    const [pt] = points.splice(idx, 1);
    return { x: MEDUSA3_X + pt.x, y: MEDUSA3_Y + pt.y };
}

function medusa3DryLocation() {
    return specialRandomDryLocation(MEDUSA3_PLACE_WIDTH, MEDUSA3_MAP.length, MEDUSA3_X, MEDUSA3_Y);
}

function medusa3MonsterLocation(ptr) {
    let x = 0, y = 0;
    let trycnt = 0;
    do {
        x = MEDUSA3_X + rn2(MEDUSA3_PLACE_WIDTH);
        y = MEDUSA3_Y + rn2(MEDUSA3_MAP.length);
        if (specialMonsterLocationOk(x, y, ptr)) return { x, y };
    } while (++trycnt < 100);
    return medusa3DryLocation();
}

function medusa3Object(otyp = null, x = null, y = null) {
    const loc = x == null ? medusa3DryLocation() : { x, y };
    if (otyp == null) mkobj_at(RANDOM_CLASS, loc.x, loc.y, true);
    else mksobj_at(otyp, loc.x, loc.y, true, true);
}

function medusa3ContainedObject(otyp) {
    // C ref: sp_lev.c:create_object() resolves a DRY coordinate even when
    // the object is immediately moved into a special container/statue.
    medusa3DryLocation();
    return mksobj(otyp, true, true);
}

function medusa3Statue(x = null, y = null, ptr = null) {
    const loc = x == null ? medusa3DryLocation() : { x, y };
    const obj = mkcorpstat(STATUE, null, ptr, loc.x, loc.y, 8);
    if (obj && ptr) {
        obj.spe = CORPSTAT_HISTORIC;
        obj.male = 1;
        obj.onamelth = 'Perseus'.length;
        obj.name = 'Perseus';
    }
    if (obj && !ptr) medusa3PopulateRandomStatue(obj);
    return obj;
}

function medusa3FixupStatueAt(x, y, topTen = true) {
    const obj = topTen
        ? mksobj_at(STATUE, x, y, false, false)
        : mkcorpstat(STATUE, null, null, x, y, 0);
    if (obj && topTen) {
        // C ref: mkobj.c:mk_tt_object(), topten.c:get_rnd_toptenentry().
        // The local harness has no readable score entries for this path, so
        // tt_oname() consumes the rank probe and then mk_tt_object() falls
        // back to a random role monster.
        rnd(10);
        set_corpsenm(obj, monsterIndex(monster_ptr(TOPTEN_CORPSE_ROLES[rn2(TOPTEN_CORPSE_ROLES.length)])));
    }
    let tryct = 0;
    while (++tryct < 100 && obj) {
        const ptr = monster_ptr(obj.corpsenm);
        if (!ptr || (!((ptr.mresists ?? 0) & MR_STONE) && !poly_when_stoned_ptr(ptr))) break;
        set_corpsenm(obj, rndmonnum());
    }
    return obj;
}

function medusa3FixupSpecial() {
    // C ref: mkmaze.c:fixup_special(); Medusa levels add extra top-ten
    // statues to the first scripted room after lregions are fixed.
    const croom = game.level?.rooms?.[0];
    if (!croom) return;
    for (let tryct = rnd(4); tryct > 0; tryct--) {
        const x = somex(croom);
        const y = somey(croom);
        if (goodpos(x, y, 0, null)) medusa3FixupStatueAt(x, y, true);
    }
    const topTen = !!rn2(2);
    medusa3FixupStatueAt(somex(croom), somey(croom), topTen);
}

function resists_ston_mon(mon) {
    return !!((mon?.data?.mresists ?? 0) & MR_STONE);
}

function poly_when_stoned_ptr(ptr) {
    // C ref: mondata.c:poly_when_stoned(); non-stone golems petrify into
    // stone golems and are therefore not valid Medusa statue victims.
    return ptr?.mlet === 'S_GOLEM' && ptr.name !== 'STONE_GOLEM';
}

function medusa3PopulateRandomStatue(obj) {
    // C ref: sp_lev.c:create_object(): Medusa random statues are petrified
    // monsters and inherit a temporary monster's inventory.
    let ptr = monster_ptr(obj.corpsenm);
    for (let i = 0; ptr && i < 1000; i++, ptr = rndmonnum_ptr()) {
        const was = makemon(ptr, 0, 0, MM_NOCOUNTBIRTH | MM_NOMSG);
        if (!was) continue;
        if (!resists_ston_mon(was) && !poly_when_stoned_ptr(ptr)) {
            obj.corpsenm = monsterIndex(ptr);
            obj.contents = was.inventory || [];
            game.level.monsters = (game.level?.monsters || []).filter((mon) => mon !== was);
            return;
        }
        game.level.monsters = (game.level?.monsters || []).filter((mon) => mon !== was);
    }
}

function medusa3Trap(kind = null) {
    const loc = medusa3DryLocation();
    let actual = kind;
    if (actual == null) do { actual = traptype_rnd(); } while (actual === NO_TRAP);
    const trap = maketrap(loc.x, loc.y, actual);
    maybeTrapVictim(trap);
}

function medusa3Monster(id, x = null, y = null, mmflags = 0) {
    const ptr = monster_ptr(id);
    if (monster_name_needs_find_gender_roll(id, ptr)) rn2(2);
    induced_align_80();
    const loc = x == null ? medusa3MonsterLocation(ptr) : { x, y };
    if (m_at(loc.x, loc.y)) {
        const cc = enexto_core(loc.x, loc.y, ptr, GP_CHECKSCARY)
            || enexto_core(loc.x, loc.y, ptr, 0);
        if (cc) {
            loc.x = cc.x;
            loc.y = cc.y;
        }
    }
    return makemon(ptr, loc.x, loc.y, mmflags);
}

function registerMedusa3Lregions(flp) {
    const bounds = { minx: 1, miny: 0, maxx: COLNO - 1, maxy: ROWNO - 1 };
    const downTele = flipRectForBounds({ x1: MEDUSA3_X + 33, y1: MEDUSA3_Y + 2, x2: MEDUSA3_X + 38, y2: MEDUSA3_Y + 7 }, flp,
        bounds.minx, bounds.miny, bounds.maxx, bounds.maxy);
    const upstairs = flipRectForBounds({ x1: MEDUSA3_X + 32, y1: MEDUSA3_Y + 1, x2: MEDUSA3_X + 39, y2: MEDUSA3_Y + 7 }, flp,
        bounds.minx, bounds.miny, bounds.maxx, bounds.maxy);
    game._special_lregions = [
        {
            rtype: LR_DOWNTELE,
            inarea: downTele,
            delarea: { x1: 0, y1: 0, x2: 0, y2: 0 },
        },
        {
            rtype: LR_UPSTAIR,
            inarea: upstairs,
            delarea: { x1: 0, y1: 0, x2: 0, y2: 0 },
        },
    ];
}

function loadMedusa3Special() {
    // C ref: dat/medusa-3.lua loaded via sp_lev.c:load_special().
    l_nhcore_init();
    rn2(2); // splev_initlev() random lit state for solidfill.
    medusa3SetTerrain();

    const places = [{ x: 8, y: 6 }, { x: 66, y: 5 }, { x: 46, y: 15 }];
    const medloc = medusa3PickCoord(places);
    const altloc = medusa3PickCoord(places);
    const othloc = medusa3PickCoord(places);

    medusa3ApplyLitRegion(0, 0, 74, 19, true);
    medusa3ArrivalRoom(litstate_rnd(-1)); // arrival_room region {49,14,51,16}.
    medusa3ApplyLitRegion(7, 5, 9, 7, false);
    medusa3ApplyLitRegion(65, 4, 67, 6, false);
    medusa3ApplyLitRegion(45, 14, 47, 16, false);

    for (const [x1, y1, x2, y2] of [
        [6, 4, 10, 8],
        [64, 3, 68, 7],
        [44, 13, 48, 17],
    ]) {
        for (let y = y1; y <= y2; y++)
            for (let x = x1; x <= x2; x++) {
                const loc = game.level?.at(MEDUSA3_X + x, MEDUSA3_Y + y);
                if (loc) loc.wall_info |= W_NONDIGGABLE;
            }
    }

    mkstairs(medloc.x, medloc.y, false, null);
    medusa3SetDoor(8, 8, D_LOCKED);
    medusa3SetDoor(64, 5, D_LOCKED);
    medusa3RandomDoor(50, 13);
    medusa3SetDoor(48, 15, D_LOCKED);
    const fountain = game.level?.at(othloc.x, othloc.y);
    if (fountain) fountain.typ = FOUNTAIN;

    medusa3Statue(medloc.x, medloc.y, monster_ptr('KNIGHT'));
    if (rn2(100) < 75) {
        const shield = medusa3ContainedObject(SHIELD_OF_REFLECTION);
        if (shield) {
            shield.cursed = true;
            shield.blessed = false;
            shield.spe = 0;
        }
    }
    if (rn2(100) < 25) {
        const boots = medusa3ContainedObject(LEVITATION_BOOTS);
        if (boots) boots.spe = 0;
    }
    if (rn2(100) < 50) {
        const sword = medusa3ContainedObject(SCIMITAR);
        if (sword) {
            sword.blessed = true;
            sword.cursed = false;
            sword.spe = 2;
        }
    }
    if (rn2(100) < 50) medusa3ContainedObject(SACK);

    medusa3Statue(altloc.x, altloc.y, null);
    for (let i = 0; i < 6; i++) medusa3Statue();
    for (let i = 0; i < 8; i++) medusa3Object();
    medusa3Object(SCR_BLANK_PAPER, MEDUSA3_X + 48, MEDUSA3_Y + 18);
    medusa3Object(SCR_BLANK_PAPER, MEDUSA3_X + 48, MEDUSA3_Y + 18);

    medusa3Trap(RUST_TRAP);
    medusa3Trap(RUST_TRAP);
    medusa3Trap(SQKY_BOARD);
    medusa3Trap(SQKY_BOARD);
    medusa3Trap();

    medusa3Monster('MEDUSA', medloc.x, medloc.y, MM_ASLEEP | MM_NOGRP);
    medusa3Monster('GIANT_EEL');
    medusa3Monster('GIANT_EEL');
    medusa3Monster('JELLYFISH');
    medusa3Monster('JELLYFISH');
    medusa3Monster('WOOD_NYMPH');
    medusa3Monster('WOOD_NYMPH');
    medusa3Monster('WATER_NYMPH');
    medusa3Monster('WATER_NYMPH');
    for (let i = 0; i < 30; i++) medusa3Monster('RAVEN');

    wallification(1, 0, COLNO - 1, ROWNO - 1);
    const flp = flip_level_rnd(3);
    registerMedusa3Lregions(flp);
    fixup_special();
}

function buildSpecialRoom(spec, parent = null) {
    const chance = spec.chance ?? 100;
    const rtype = (!chance || rn2(100) < chance) ? (spec.rtype ?? OROOM) : OROOM;
    const room = parent
        ? create_subroom(parent, spec.x ?? -1, spec.y ?? -1, spec.w ?? -1, spec.h ?? -1,
            rtype, spec.lit ?? -1)
        : (() => {
            const before = game.level.nroom;
            const ok = create_room(spec.x ?? -1, spec.y ?? -1, spec.w ?? -1, spec.h ?? -1,
                spec.xal ?? -1, spec.yal ?? -1, rtype, spec.lit ?? -1);
            return ok ? game.level.rooms[before] : null;
        })();
    if (!room) return null;
    if (parent) parent.irregular = true;
    topologize(room);
    room.needfill = spec.filled ?? FILL_NORMAL;
    room.needjoining = spec.joined ?? true;
    return room;
}

function specialRoomLocation(croom, relx = -1, rely = -1, good = null) {
    const ok = good || ((x, y) => {
        const loc = game.level?.at(x, y);
        return loc && SPACE_POS(loc.typ) && !sobj_at(BOULDER, x, y);
    });
    if (relx >= 0 && rely >= 0) {
        return { x: croom ? croom.lx + relx : relx, y: croom ? croom.ly + rely : rely };
    }
    const pos = { x: 0, y: 0 };
    let trycnt = 0;
    do {
        if (!somexy(croom, pos)) break;
        if (ok(pos.x, pos.y)) return { x: pos.x, y: pos.y };
    } while (++trycnt < 100);
    for (let x = croom.lx; x <= croom.hx; x++)
        for (let y = croom.ly; y <= croom.hy; y++)
            if (ok(x, y)) return { x, y };
    return { x: croom.lx, y: croom.ly };
}

function createSpecialStair(croom, up) {
    const loc = specialRoomLocation(croom, -1, -1, (x, y) => {
        const typ = game.level?.at(x, y)?.typ;
        return typ === ROOM || typ === CORR || typ === ICE;
    });
    placeSpecialStair(loc.x, loc.y, up);
}

function createSpecialRandomObject(croom) {
    const loc = specialRoomLocation(croom);
    mkobj_at(RANDOM_CLASS, loc.x, loc.y, true);
}

function createSpecialTrap(croom) {
    const loc = specialRoomLocation(croom, -1, -1, (x, y) => game.level?.at(x, y)?.typ === ROOM);
    let kind;
    do { kind = traptype_rnd(); } while (kind === NO_TRAP);
    const trap = maketrap(loc.x, loc.y, kind);
    maybeTrapVictim(trap);
}

function induced_align_80() {
    // C ref: dungeon.c:induced_align(80). JS stores aligntyp values in
    // dungeon/special flags, so neutral (0) is still an active alignment.
    const special = currentSpecialLevel();
    const spAlign = special?.flags?.align;
    if (spAlign != null && spAlign !== A_NONE) {
        if (rn2(100) < 80) return Align2amask(spAlign);
    }
    const dungeon = game.dungeons?.[game.u?.uz?.dnum ?? 0];
    const dAlign = dungeon?.flags?.align;
    if (dAlign != null && dAlign !== A_NONE) {
        if (rn2(100) < 80) return Align2amask(dAlign);
    }
    return Align2amask(rn2(3) - 1);
}

function createSpecialMonster(croom, ptr = null, relx = -1, rely = -1) {
    induced_align_80();
    const loc = specialRoomLocation(croom, relx, rely);
    if (m_at(loc.x, loc.y)) {
        const cc = enexto_core(loc.x, loc.y, ptr, GP_CHECKSCARY)
            || enexto_core(loc.x, loc.y, ptr, 0);
        if (cc) {
            loc.x = cc.x;
            loc.y = cc.y;
        }
    }
    if (croom && !inside_room(croom, loc.x, loc.y)) return null;
    return makemon(ptr, loc.x, loc.y, 0);
}

function createOracleStatue(croom, relx, rely) {
    // C ref: sp_lev.c:lspo_object() parses montype="C" with mkclass().
    const ptr = mkclass_aligned('S_CENTAUR', G_NOGEN | G_IGNORE);
    const loc = specialRoomLocation(croom, relx, rely);
    const otmp = mksobj_at(STATUE, loc.x, loc.y, true, true);
    if (otmp) {
        otmp.spe = CORPSTAT_HISTORIC;
        set_corpsenm(otmp, ptr?.name ?? null);
    }
}

function createOracleDoorway(croom) {
    // C ref: oracle.lua des.door({state="nodoor", wall="all"}).
    let x = 0, y = 0;
    for (let trycnt = 0; trycnt < 100; trycnt++) {
        switch (rn2(4)) {
        case 0:
            y = croom.ly - 1;
            x = croom.lx + rn2(1 + croom.hx - croom.lx);
            if (!isok(x, y - 1) || IS_OBSTRUCTED(game.level.at(x, y - 1)?.typ)) continue;
            break;
        case 1:
            y = croom.hy + 1;
            x = croom.lx + rn2(1 + croom.hx - croom.lx);
            if (!isok(x, y + 1) || IS_OBSTRUCTED(game.level.at(x, y + 1)?.typ)) continue;
            break;
        case 2:
            x = croom.lx - 1;
            y = croom.ly + rn2(1 + croom.hy - croom.ly);
            if (!isok(x - 1, y) || IS_OBSTRUCTED(game.level.at(x - 1, y)?.typ)) continue;
            break;
        default:
            x = croom.hx + 1;
            y = croom.ly + rn2(1 + croom.hy - croom.ly);
            if (!isok(x + 1, y) || IS_OBSTRUCTED(game.level.at(x + 1, y)?.typ)) continue;
            break;
        }
        if (!okdoor(x, y)) continue;
        const loc = game.level.at(x, y);
        if (loc) {
            loc.typ = DOOR;
            set_door_mask(loc, D_NODOOR);
        }
        return;
    }
}

function loadOracleSpecial() {
    // C ref: dat/oracle.lua loaded via sp_lev.c:load_special().
    l_nhcore_init();
    game.level.flags.is_maze_lev = false;
    game.level.flags.noteleport = false;

    const oracleRoom = buildSpecialRoom({
        x: 3, y: 3, xal: SPLEV_CENTER, yal: SPLEV_CENTER,
        w: 11, h: 9, rtype: OROOM, lit: 1,
    });
    if (!oracleRoom) return;
    for (const [x, y] of [[0, 0], [0, 8], [10, 0], [10, 8], [5, 1], [5, 7], [2, 4], [8, 4]]) {
        createOracleStatue(oracleRoom, x, y);
    }

    const delphi = buildSpecialRoom({ x: 4, y: 3, w: 3, h: 3, rtype: DELPHI, lit: 1 }, oracleRoom);
    if (delphi) {
        for (const [x, y] of [[0, 1], [1, 0], [1, 2], [2, 1]]) {
            const loc = specialRoomLocation(delphi, x, y);
            const tile = game.level.at(loc.x, loc.y);
            if (tile) tile.typ = FOUNTAIN;
        }
        createSpecialMonster(delphi, MONSTERS.find(m => m.name === 'ORACLE'), 1, 1);
        createOracleDoorway(delphi);
    }

    createSpecialMonster(oracleRoom);
    createSpecialMonster(oracleRoom);

    let room = buildSpecialRoom({});
    if (room) {
        createSpecialStair(room, true);
        createSpecialRandomObject(room);
    }
    room = buildSpecialRoom({});
    if (room) {
        createSpecialStair(room, false);
        createSpecialRandomObject(room);
        createSpecialTrap(room);
        createSpecialMonster(room);
        createSpecialMonster(room);
    }
    room = buildSpecialRoom({});
    if (room) {
        createSpecialRandomObject(room);
        createSpecialRandomObject(room);
        createSpecialMonster(room);
    }
    room = buildSpecialRoom({});
    if (room) {
        createSpecialRandomObject(room);
        createSpecialTrap(room);
        createSpecialMonster(room);
    }
    room = buildSpecialRoom({});
    if (room) {
        createSpecialRandomObject(room);
        createSpecialTrap(room);
        createSpecialMonster(room);
    }

    makecorridors();
    wallification(1, 0, COLNO - 1, ROWNO - 1);
}

function castleObjectClass(ch) {
    switch (ch) {
    case '[': return ARMOR_CLASS;
    case ')': return WEAPON_CLASS;
    case '*': return GEM_CLASS;
    case '%': return FOOD_CLASS;
    default: return RANDOM_CLASS;
    }
}

const CASTLE_X = 9;
const CASTLE_Y = 3;
function castleX(x) { return x + CASTLE_X; }
function castleY(y) { return y + CASTLE_Y; }

const SANCTUM_X = 3;
const SANCTUM_Y = 1;
function sanctumX(x) { return x + SANCTUM_X; }
function sanctumY(y) { return y + SANCTUM_Y; }

function clearSpecialLregions() {
    game._special_lregions = [];
    game.updest = { lx: 0, ly: 0, hx: 0, hy: 0, nlx: 0, nly: 0, nhx: 0, nhy: 0 };
    game.dndest = { lx: 0, ly: 0, hx: 0, hy: 0, nlx: 0, nly: 0, nhx: 0, nhy: 0 };
}

const VALLEY_X = 3;
const VALLEY_Y = 1;
const VALLEY_MAP = [
    '----------------------------------------------------------------------------',
    '|...S.|..|.....|  |.....-|      |................|   |...............| |...|',
    '|---|.|.--.---.|  |......--- ----..........-----.-----....---........---.-.|',
    '|   |.|.|..| |.| --........| |.............|   |.......---| |-...........--|',
    '|   |...S..| |.| |.......-----.......------|   |--------..---......------- |',
    '|----------- |.| |-......| |....|...-- |...-----................----       |',
    '|.....S....---.| |.......| |....|...|  |..............-----------          |',
    '|.....|.|......| |.....--- |......---  |....---.......|                    |',
    '|.....|.|------| |....--   --....-- |-------- ----....---------------      |',
    '|.....|--......---BBB-|     |...--  |.......|    |..................|      |',
    '|..........||........-|    --...|   |.......|    |...||.............|      |',
    '|.....|...-||-........------....|   |.......---- |...||.............--     |',
    '|.....|--......---...........--------..........| |.......---------...--    |',
    '|.....| |------| |--.......--|   |..B......----- -----....| |.|  |....---  |',
    '|.....| |......--| ------..| |----..B......|       |.--------.-- |-.....---|',
    '|------ |........|  |.|....| |.....----BBBB---------...........---.........|',
    '|       |........|  |...|..| |.....|  |-.............--------...........---|',
    '|       --.....-----------.| |....-----.....----------     |.........----  |',
    '|        |..|..B...........| |.|..........|.|              |.|........|    |',
    '----------------------------------------------------------------------------',
];

function valleyX(x) { return x + VALLEY_X; }
function valleyY(y) { return y + VALLEY_Y; }

function valleySetTerrain(x, y, ch) {
    const loc = game.level?.at(valleyX(x), valleyY(y));
    if (!loc) return;
    loc.lit = false;
    switch (ch) {
    case '.': loc.typ = ROOM; break;
    case '-': loc.typ = HWALL; break;
    case '|': loc.typ = VWALL; break;
    case '+': loc.typ = DOOR; loc.doormask = D_NODOOR; break;
    case 'S': loc.typ = SDOOR; loc.doormask = D_CLOSED; break;
    case 'B': loc.typ = CROSSWALL; break;
    default: loc.typ = STONE; break;
    }
}

function valleyLine(x1, y1, x2, y2, ch) {
    const dx = Math.sign(x2 - x1);
    const dy = Math.sign(y2 - y1);
    let x = x1, y = y1;
    while (true) {
        valleySetTerrain(x, y, ch);
        if (x === x2 && y === y2) break;
        x += dx;
        y += dy;
    }
}

function valleyMapCleanupBoundaries() {
    for (let y = 0; y < VALLEY_MAP.length; y++)
        for (let x = 0; x < VALLEY_MAP[y].length; x++) {
            const loc = game.level?.at(valleyX(x), valleyY(y));
            if (loc?.typ === CROSSWALL) loc.typ = ROOM;
        }
}

function valleyDryLocation() {
    return specialRandomDryLocation(VALLEY_MAP[0].length, VALLEY_MAP.length, VALLEY_X, VALLEY_Y);
}

function valleyTrapLocation() {
    let loc = valleyDryLocation();
    let trycnt = 0;
    while ((game.level?.at(loc.x, loc.y)?.typ === STAIRS
            || game.level?.at(loc.x, loc.y)?.typ === LADDER)
           && ++trycnt <= 100) {
        loc = valleyDryLocation();
    }
    return loc;
}

function valleyObject(oclassOrType) {
    const loc = valleyDryLocation();
    if (typeof oclassOrType === 'number' && oclassOrType < 0)
        mksobj_at(-oclassOrType, loc.x, loc.y, true, true);
    else
        mkobj_at(oclassOrType, loc.x, loc.y, true);
}

function valleyCorpse(monName) {
    const loc = valleyDryLocation();
    const corpse = mksobj_at(CORPSE, loc.x, loc.y, true, true);
    set_corpsenm_restart(corpse, monster_ptr(monName));
}

function valleyTrap(kind, x = null, y = null) {
    const loc = x == null ? valleyTrapLocation() : { x: valleyX(x), y: valleyY(y) };
    const trap = maketrap(loc.x, loc.y, kind);
    maybeTrapVictim(trap);
}

function specialMonsterLocationOk(x, y, ptr) {
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    const humidity = pm_to_humidity(ptr);
    if ((humidity & SOLID) && IS_OBSTRUCTED(loc.typ)) return true;
    if ((humidity & DRY) && SPACE_POS(loc.typ)) {
        const bould = sobj_at(BOULDER, x, y);
        if (!bould || (humidity & SOLID)) return true;
    }
    if ((humidity & WET) && IS_POOL(loc.typ)) return true;
    if ((humidity & HOT) && IS_LAVA(loc.typ)) return true;
    return false;
}

function valleyMonsterLocation(ptr) {
    let x = VALLEY_X, y = VALLEY_Y;
    let trycnt = 0;
    do {
        x = VALLEY_X + rn2(VALLEY_MAP[0].length);
        y = VALLEY_Y + rn2(VALLEY_MAP.length);
        if (specialMonsterLocationOk(x, y, ptr)) return { x, y };
    } while (++trycnt < 100);
    return valleyDryLocation();
}

function valleyMonster(ref) {
    const cls = String(ref || '').length === 1 ? castleMonsterClass(ref) : null;
    let ptr = cls ? null : monster_ptr(ref);
    if (!cls && monster_name_needs_find_gender_roll(ref, ptr)) rn2(2);
    induced_align_80();
    if (cls) ptr = mkclass_aligned(cls, G_NOGEN);
    const loc = valleyMonsterLocation(ptr);
    if (m_at(loc.x, loc.y)) {
        const cc = enexto_core(loc.x, loc.y, ptr, GP_CHECKSCARY)
            || enexto_core(loc.x, loc.y, ptr, 0);
        if (cc) {
            loc.x = cc.x;
            loc.y = cc.y;
        }
    }
    makemon(ptr, loc.x, loc.y, 0);
}

function valleyFloodRoomCells(sx, sy) {
    const start = { x: valleyX(sx), y: valleyY(sy) };
    const seen = new Set();
    const cells = [];
    const queue = [start];
    while (queue.length) {
        const { x, y } = queue.shift();
        const key = `${x},${y}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const loc = game.level?.at(x, y);
        if (!loc || !SPACE_POS(loc.typ)) continue;
        cells.push({ x, y });
        queue.push({ x: x + 1, y }, { x: x - 1, y }, { x, y: y + 1 }, { x, y: y - 1 });
    }
    return cells;
}

function valleyAddFillRoom(x1, y1, x2, y2, lit, rtype, needfill = FILL_NORMAL, irregular = false) {
    const cells = irregular ? valleyFloodRoomCells(x1, y1) : [];
    if (irregular && cells.length) {
        x1 = Math.min(...cells.map(c => c.x)) - VALLEY_X;
        y1 = Math.min(...cells.map(c => c.y)) - VALLEY_Y;
        x2 = Math.max(...cells.map(c => c.x)) - VALLEY_X;
        y2 = Math.max(...cells.map(c => c.y)) - VALLEY_Y;
    }
    add_room(valleyX(x1), valleyY(y1), valleyX(x2), valleyY(y2), lit, rtype, true);
    const room = game.level.rooms[(game.level.nroom || 1) - 1];
    if (room) {
        room.needfill = needfill;
        room.irregular = irregular;
        const rmno = room.roomnoidx + ROOMOFFSET;
        const markCells = irregular ? cells : [];
        if (!irregular) {
            for (let x = room.lx; x <= room.hx; x++)
                for (let y = room.ly; y <= room.hy; y++) markCells.push({ x, y });
        }
        for (const { x, y } of markCells) {
                const loc = game.level?.at(x, y);
                if (loc && SPACE_POS(loc.typ)) {
                    loc.roomno = rmno;
                    loc.edge = false;
                }
        }
    }
}

function templeAltarInRoom(croom) {
    for (let x = croom.lx; x <= croom.hx; x++)
        for (let y = croom.ly; y <= croom.hy; y++)
            if (game.level?.at(x, y)?.typ === ALTAR) return { x, y };
    return {
        x: Math.trunc((croom.lx + croom.hx) / 2),
        y: Math.trunc((croom.ly + croom.hy) / 2),
    };
}

function give_mon_obj(mon, obj) {
    if (!mon || !obj) return obj;
    obj.ox = mon.mx;
    obj.oy = mon.my;
    mon.inventory = mon.inventory || [];
    mon.inventory.unshift(obj);
    return obj;
}

function priestini(croom, sanctum = false) {
    // C ref: priest.c:priestini(), called by sp_lev.c:create_altar() for shrines.
    const altar = templeAltarInRoom(croom);
    const si = rn2(8);
    let pos = altar;
    for (let i = 0; i < 8; i++) {
        const dir = (i + si) % 8;
        const x = altar.x + xdir[dir], y = altar.y + ydir[dir];
        const loc = game.level?.at(x, y);
        if (loc && SPACE_POS(loc.typ)) {
            pos = { x, y };
            break;
        }
    }
    const priest = sanctum
        ? MONSTERS.find(m => m.name === 'HIGH_PRIEST')
        : MONSTERS.find(m => m.name === 'PRIEST' && m.difficulty >= 15)
            || MONSTERS.find(m => m.name === 'PRIEST');
    makemon(priest, pos.x, pos.y, MM_EPRI);
    const mon = game.level?.monsters?.[0];
    if (mon && mon.mx === pos.x && mon.my === pos.y) {
        mon.ispriest = 1;
        mon.msleeping = 0;
        mon.mpeaceful = 1;
    }
    if (sanctum) {
        give_mon_obj(mon, mksobj(AMULET_OF_YENDOR, true, false));
    }
    const count = rn2(3) + 2;
    for (let i = 0; i < count; i++) {
        give_mon_obj(mon, mkobj(SPBOOK_no_NOVEL, false));
    }
    rn2(2);
}

function flipRectForBounds(rect, flp, minx, miny, maxx, maxy) {
    let { x1, y1, x2, y2 } = rect;
    if (flp & 1) {
        const ny1 = flipYForBounds(y2, miny, maxy);
        const ny2 = flipYForBounds(y1, miny, maxy);
        y1 = Math.min(ny1, ny2);
        y2 = Math.max(ny1, ny2);
    }
    if (flp & 2) {
        const nx1 = flipXForBounds(x2, minx, maxx);
        const nx2 = flipXForBounds(x1, minx, maxx);
        x1 = Math.min(nx1, nx2);
        x2 = Math.max(nx1, nx2);
    }
    return { x1, y1, x2, y2 };
}

function registerValleyLregions(flp, bounds) {
    const branch = flipRectForBounds({
        x1: valleyX(66), y1: valleyY(17), x2: valleyX(66), y2: valleyY(17),
    }, flp, bounds.minx, bounds.miny, bounds.maxx, bounds.maxy);
    const down = flipRectForBounds({
        x1: valleyX(58), y1: valleyY(9), x2: valleyX(72), y2: valleyY(18),
    }, flp, bounds.minx, bounds.miny, bounds.maxx, bounds.maxy);
    game._special_lregions = [
        { rtype: LR_BRANCH, inarea: branch, delarea: { x1: -1, y1: -1, x2: -1, y2: -1 } },
        { rtype: LR_DOWNTELE, inarea: down, delarea: { x1: -1, y1: -1, x2: -1, y2: -1 } },
    ];
}

function registerSanctumLregions(flp, bounds) {
    const down = flipRectForBounds({
        x1: 54, y1: 1, x2: 79, y2: 18,
    }, flp, bounds.minx, bounds.miny, bounds.maxx, bounds.maxy);
    game._special_lregions.push({
        rtype: LR_DOWNTELE,
        inarea: down,
        delarea: { x1: -1, y1: -1, x2: -1, y2: -1 },
    });
}

function loadValleySpecial() {
    // C ref: dat/valley.lua loaded through sp_lev.c:lspo_map().
    rn2(3); rn2(2); // nhlib shuffle()
    rn2(2); // splev_initlev()
    for (let y = 0; y < ROWNO; y++)
        for (let x = 1; x < COLNO; x++)
            game.level.at(x, y).typ = STONE;
    game.level.flags.is_maze_lev = true;
    game.level.flags.noteleport = true;
    game.level.flags.hardfloor = true;
    game.level.flags.nommap = true;
    game.level.flags.temperature = 0; // des.level_flags("temperate")

    for (let y = 0; y < VALLEY_MAP.length; y++)
        for (let x = 0; x < VALLEY_MAP[y].length; x++)
            valleySetTerrain(x, y, VALLEY_MAP[y][x]);

    if (rn2(100) < 50) {
        valleyLine(50, 8, 53, 8, '-');
        valleyLine(40, 8, 43, 8, 'B');
    }
    if (rn2(100) < 50) {
        valleySetTerrain(27, 12, '|');
        valleyLine(27, 3, 29, 3, 'B');
        valleySetTerrain(28, 2, '-');
    }
    if (rn2(100) < 50) {
        valleyLine(16, 10, 16, 11, '|');
        valleyLine(9, 13, 14, 13, 'B');
    }

    valleyAddFillRoom(1, 6, 5, 14, true, TEMPLE, FILL_LVFLAGS);
    valleyAddFillRoom(19, 1, 24, 8, false, MORGUE, FILL_NORMAL, true);
    valleyAddFillRoom(9, 14, 16, 18, false, MORGUE, FILL_NORMAL, true);
    valleyAddFillRoom(37, 9, 43, 14, false, MORGUE, FILL_NORMAL, true);

    placeSpecialStair(valleyX(1), valleyY(1), false);
    valleySetTerrain(4, 1, '+');
    game.level.at(valleyX(4), valleyY(1)).doormask = D_LOCKED;
    valleySetTerrain(8, 4, '+');
    game.level.at(valleyX(8), valleyY(4)).doormask = D_LOCKED;
    valleySetTerrain(6, 6, '+');
    game.level.at(valleyX(6), valleyY(6)).doormask = D_LOCKED;
    const altar = game.level.at(valleyX(3), valleyY(10));
    if (altar) altar.typ = ALTAR;
    const templeRoom = game.level.rooms?.find(r => r.rtype === TEMPLE
        && valleyX(3) >= r.lx && valleyX(3) <= r.hx
        && valleyY(10) >= r.ly && valleyY(10) <= r.hy);
    if (templeRoom) {
        priestini(templeRoom);
        game.level.flags.has_temple = true;
    }

    for (const name of [
        'ARCHEOLOGIST', 'ARCHEOLOGIST', 'BARBARIAN', 'BARBARIAN',
        'CAVEMAN', 'CAVEWOMAN', 'HEALER', 'HEALER',
        'KNIGHT', 'KNIGHT', 'RANGER', 'RANGER',
        'ROGUE', 'ROGUE', 'SAMURAI', 'SAMURAI',
        'TOURIST', 'TOURIST', 'VALKYRIE', 'VALKYRIE',
        'WIZARD', 'WIZARD',
    ]) valleyCorpse(name);
    for (const cls of [ARMOR_CLASS, ARMOR_CLASS, ARMOR_CLASS, ARMOR_CLASS,
        WEAPON_CLASS, WEAPON_CLASS, WEAPON_CLASS, WEAPON_CLASS]) {
        valleyObject(cls);
    }
    for (const cls of [-RUBY, GEM_CLASS, GEM_CLASS,
        POTION_CLASS, POTION_CLASS, POTION_CLASS,
        SCROLL_CLASS, SCROLL_CLASS, SCROLL_CLASS,
        WAND_CLASS, WAND_CLASS, RING_CLASS, RING_CLASS,
        SPBOOK_CLASS, SPBOOK_CLASS, TOOL_CLASS, TOOL_CLASS, TOOL_CLASS]) {
        valleyObject(cls);
    }

    valleyTrap(SPIKED_PIT, 5, 2);
    valleyTrap(SPIKED_PIT, 14, 5);
    valleyTrap(SLP_GAS_TRAP, 3, 1);
    valleyTrap(SQKY_BOARD, 21, 12);
    valleyTrap(SQKY_BOARD);
    valleyTrap(DART_TRAP, 60, 1);
    valleyTrap(DART_TRAP, 26, 17);
    valleyTrap(ANTI_MAGIC);
    valleyTrap(ANTI_MAGIC);
    valleyTrap(MAGIC_TRAP);
    valleyTrap(MAGIC_TRAP);

    for (let i = 0; i < 6; i++) valleyMonster('GHOST');
    for (let i = 0; i < 3; i++) valleyMonster('VAMPIRE_BAT');
    valleyMonster('L');
    for (const cls of ['V', 'V', 'V', 'Z', 'Z', 'Z', 'Z', 'M', 'M', 'M', 'M'])
        valleyMonster(cls);

    valleyMapCleanupBoundaries();
    const ext = get_level_extends();
    const bounds = {
        minx: Math.max(1, ext.xmin),
        maxx: Math.min(COLNO - 1, ext.xmax),
        miny: Math.max(0, ext.ymin),
        maxy: Math.min(ROWNO - 1, ext.ymax),
    };
    wallification(1, 0, COLNO - 1, ROWNO - 1);
    const flp = flip_level_rnd(3);
    registerValleyLregions(flp, bounds);
    fixup_special();
}

function castleLevelRegion(x1, y1, x2, y2) {
    return { x1, y1, x2, y2 };
}

function castleMapRegion(x1, y1, x2, y2) {
    return { x1: castleX(x1), y1: castleY(y1), x2: castleX(x2), y2: castleY(y2) };
}

function registerCastleLregions() {
    game._special_lregions = [
        {
            rtype: LR_DOWNTELE,
            inarea: castleLevelRegion(1, 0, 10, 20),
            delarea: castleMapRegion(1, 1, 61, 15),
        },
        {
            rtype: LR_UPTELE,
            inarea: castleLevelRegion(69, 0, 79, 20),
            delarea: castleMapRegion(1, 1, 61, 15),
        },
        {
            rtype: LR_UPSTAIR,
            inarea: castleLevelRegion(1, 0, 10, 20),
            delarea: castleMapRegion(0, 0, 62, 16),
        },
    ];
}

function lregionDest(r) {
    return {
        lx: r.inarea.x1, ly: r.inarea.y1, hx: r.inarea.x2, hy: r.inarea.y2,
        nlx: r.delarea.x1, nly: r.delarea.y1, nhx: r.delarea.x2, nhy: r.delarea.y2,
    };
}

function fixup_special() {
    let addedBranch = false;
    for (const r of game._special_lregions || []) {
        switch (r.rtype) {
        case LR_BRANCH:
            addedBranch = true;
            place_lregion(r.inarea.x1, r.inarea.y1, r.inarea.x2, r.inarea.y2,
                r.delarea.x1, r.delarea.y1, r.delarea.x2, r.delarea.y2, r.rtype, null);
            break;
        case LR_DOWNSTAIR:
        case LR_UPSTAIR:
            place_lregion(r.inarea.x1, r.inarea.y1, r.inarea.x2, r.inarea.y2,
                r.delarea.x1, r.delarea.y1, r.delarea.x2, r.delarea.y2, r.rtype, null);
            break;
        case LR_TELE:
            game.updest = lregionDest(r);
            game.dndest = lregionDest(r);
            break;
        case LR_UPTELE:
            game.updest = lregionDest(r);
            break;
        case LR_DOWNTELE:
            game.dndest = lregionDest(r);
            break;
        }
    }
    if (!addedBranch && is_branchlev()) {
        place_lregion(0, 0, 0, 0, 0, 0, 0, 0, LR_BRANCH, null);
    }
    if (game._last_special_protofile === 'medusa-3') medusa3FixupSpecial();
    if (game._last_special_protofile === 'baalz') baalzFixup();
}

function castleMonsterClass(ch) {
    switch (ch) {
    case 'L': return 'S_LICH';
    case 'N': return 'S_NAGA';
    case 'E': return 'S_ELEMENTAL';
    case 'H': return 'S_GIANT';
    case 'M': return 'S_MUMMY';
    case 'O': return 'S_OGRE';
    case 'R': return 'S_RUSTMONST';
    case 'T': return 'S_TROLL';
    case 'V': return 'S_VAMPIRE';
    case 'X': return 'S_XORN';
    case 'Z': return 'S_ZOMBIE';
    case 'D': return 'S_DRAGON';
    default: return null;
    }
}

function castleMonsterPtr(id) {
    const key = String(id || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
    return MONSTERS.find(mon => mon.name === key) || null;
}

function castleCreateMonster(id, x, y, mmflags = 0) {
    const cls = String(id || '').length === 1 ? castleMonsterClass(id) : null;
    let ptr = cls ? null : castleMonsterPtr(id);
    // C ref: sp_lev.c:find_montype() resolves a gender value for named
    // special monsters before create_monster() applies random alignment.
    if (!cls && monster_name_needs_find_gender_roll(id, ptr)) rn2(2);
    induced_align_80();
    if (cls) ptr = mkclass_aligned(cls, G_NOGEN);
    return makemon(ptr, castleX(x), castleY(y), mmflags);
}

function castleSetDoor(x, y, mask) {
    const loc = game.level?.at(castleX(x), castleY(y));
    if (!loc) return;
    loc.typ = DOOR;
    set_door_mask(loc, mask);
}

function createCastleRoomRegion(x1, y1, x2, y2, lit, rtype, needfill) {
    const before = game.level?.nroom ?? 0;
    add_room(castleX(x1), castleY(y1), castleX(x2), castleY(y2), lit ? 1 : 0, rtype, true);
    const croom = game.level?.rooms?.[before];
    if (!croom) return;
    croom.needjoining = true;
    croom.needfill = needfill;
    topologize(croom);
    for (let x = croom.lx - 1; x <= croom.hx + 1; x++) {
        for (let y = croom.ly - 1; y <= croom.hy + 1; y++) {
            const loc = game.level?.at(x, y);
            if (loc && (IS_DOOR(loc.typ) || loc.typ === SDOOR)) add_door(x, y, croom);
        }
    }
}

function castleApplyRegion(x1, y1, x2, y2, lit, rtype = OROOM, needfill = FILL_NONE) {
    for (let y = y1; y <= y2; y++) {
        for (let x = x1; x <= x2; x++) {
            const loc = game.level?.at(castleX(x), castleY(y));
            if (!loc) continue;
            if (loc.typ === ROOM || loc.typ === CORR || loc.typ === DOOR || loc.typ === SDOOR)
                loc.lit = !!lit;
        }
    }
    if (rtype !== OROOM) createCastleRoomRegion(x1, y1, x2, y2, lit, rtype, needfill);
}

function specialRandomDryLocation(width, height, xstart = 0, ystart = 0) {
    let x = xstart, y = ystart;
    let trycnt = 0;
    do {
        x = xstart + rn2(width);
        y = ystart + rn2(height);
        const loc = game.level?.at(x, y);
        if (loc && SPACE_POS(loc.typ) && !sobj_at(BOULDER, x, y)) return { x, y };
    } while (++trycnt < 100);
    for (let xx = xstart; xx < xstart + width; xx++)
        for (let yy = ystart; yy < ystart + height; yy++) {
            const loc = game.level?.at(xx, yy);
            if (loc && SPACE_POS(loc.typ) && !sobj_at(BOULDER, xx, yy)) return { x: xx, y: yy };
        }
    return { x, y };
}

function createSpecialContainerObject(otyp, width, height) {
    // C ref: sp_lev.c:create_object() resolves a DRY coordinate even for
    // objects that are immediately removed into a special-level container.
    specialRandomDryLocation(width, height, CASTLE_X, CASTLE_Y);
    return mksobj(otyp, true, false);
}

function specialTouchedKey(x, y) {
    return `${x},${y}`;
}

function markSpecialTouchedRect(x1, y1, x2, y2) {
    game._special_touched = game._special_touched || new Set();
    for (let y = y1; y <= y2; y++)
        for (let x = x1; x <= x2; x++)
            game._special_touched.add(specialTouchedKey(x, y));
}

function mazeMove(x, y, dir) {
    switch (dir) {
    case 0: return { x, y: y - 1 };
    case 1: return { x: x + 1, y };
    case 2: return { x, y: y + 1 };
    case 3: return { x: x - 1, y };
    default: return { x, y };
    }
}

function specialMazeOkay(x, y, dir) {
    const xMazeMax = COLNO - 2;
    const yMazeMax = ROWNO - 1;
    let pos = mazeMove(x, y, dir);
    pos = mazeMove(pos.x, pos.y, dir);
    return pos.x >= 3 && pos.y >= 3 && pos.x <= xMazeMax && pos.y <= yMazeMax
        && game.level?.at(pos.x, pos.y)?.typ === STONE;
}

function specialWalkfrom(x, y, typ = ROOM) {
    const loc = game.level?.at(x, y);
    if (loc && !IS_DOOR(loc.typ)) {
        loc.typ = typ;
        loc.flags = 0;
    }
    for (;;) {
        const dirs = [];
        for (let dir = 0; dir < 4; dir++)
            if (specialMazeOkay(x, y, dir)) dirs.push(dir);
        if (!dirs.length) return;
        const dir = dirs[rn2(dirs.length)];
        let pos = mazeMove(x, y, dir);
        const mid = game.level?.at(pos.x, pos.y);
        if (mid) mid.typ = typ;
        pos = mazeMove(pos.x, pos.y, dir);
        specialWalkfrom(pos.x, pos.y, typ);
    }
}

function castleMaze1xy() {
    const xMazeMax = COLNO - 2;
    const yMazeMax = ROWNO - 1;
    let x = 0, y = 0;
    let tryct = 2000;
    do {
        x = rn1(xMazeMax - 3, 3);
        y = rn1(yMazeMax - 3, 3);
        if (--tryct < 0) break;
        const loc = game.level?.at(x, y);
        if ((x % 2) && (y % 2) && !game._special_touched?.has(specialTouchedKey(x, y))
            && loc && SPACE_POS(loc.typ) && !sobj_at(BOULDER, x, y)) {
            return { x, y };
        }
    } while (true);
    return { x, y };
}

function castleFillEmptyMaze() {
    const xMazeMax = COLNO - 2;
    const yMazeMax = ROWNO - 1;
    const mapcountmax = Math.trunc(((xMazeMax - 2) * (yMazeMax - 2)) / 2);
    let mapcount = (xMazeMax - 2) * (yMazeMax - 2);
    for (let x = 2; x < xMazeMax; x++)
        for (let y = 0; y < yMazeMax; y++)
            if (game._special_touched?.has(specialTouchedKey(x, y))) mapcount--;
    if (mapcount <= Math.trunc(mapcountmax / 10)) return;
    const mapfact = Math.trunc((mapcount * 100) / mapcountmax);
    for (let cnt = rnd(Math.trunc((20 * mapfact) / 100)); cnt > 0; cnt--) {
        const mm = castleMaze1xy();
        mkobj_at(rn2(2) ? GEM_CLASS : RANDOM_CLASS, mm.x, mm.y, true);
    }
    for (let cnt = rnd(Math.trunc((12 * mapfact) / 100)); cnt > 0; cnt--) {
        const mm = castleMaze1xy();
        mksobj_at(BOULDER, mm.x, mm.y, true, false);
    }
    for (let cnt = rn2(2); cnt > 0; cnt--) {
        const mm = castleMaze1xy();
        makemon(castleMonsterPtr('minotaur'), mm.x, mm.y, 0);
    }
    for (let cnt = rnd(Math.trunc((12 * mapfact) / 100)); cnt > 0; cnt--) {
        const mm = castleMaze1xy();
        makemon(null, mm.x, mm.y, 0);
    }
    for (let cnt = rn2(Math.trunc((15 * mapfact) / 100)); cnt > 0; cnt--) {
        const mm = castleMaze1xy();
        mkgold(0, mm.x, mm.y);
    }
    for (let cnt = rn2(Math.trunc((15 * mapfact) / 100)); cnt > 0; cnt--) {
        const mm = castleMaze1xy();
        let kind;
        do { kind = specialRndTrap(); } while (kind === NO_TRAP);
        if (sobj_at(BOULDER, mm.x, mm.y))
            while (is_pit(kind) || is_hole(kind)) kind = specialRndTrap();
        maketrap(mm.x, mm.y, kind);
    }
}

function specialRndTrap() {
    const uz = game.u?.uz || { dnum: 0, dlevel: 1 };
    const dungeon = game.dungeons?.[uz.dnum];
    // C ref: dungeon.c:Can_dig_down() also rejects hardfloor levels.
    const canDigDown = !game.level?.flags?.hardfloor
        && (uz.dlevel ?? 1) < (dungeon?.num_dunlevs ?? uz.dlevel ?? 1);
    let kind = rnd(TRAPNUM - 1);
    switch (kind) {
    case HOLE:
    case VIBRATING_SQUARE:
    case MAGIC_PORTAL:
        kind = NO_TRAP;
        break;
    case TRAPDOOR:
        if (!canDigDown) kind = NO_TRAP;
        break;
    case LEVEL_TELEP:
    case TELEP_TRAP:
        if (game.level?.flags?.noteleport) kind = NO_TRAP;
        break;
    case ROLLING_BOULDER_TRAP:
    case ROCKTRAP:
        if (game.astral_level && uz.dnum === game.astral_level.dnum) kind = NO_TRAP;
        break;
    }
    return kind;
}

function castleMazeWalk(x, y, dirName, typ = ROOM, stocked = true) {
    x = castleX(x);
    y = castleY(y);
    switch (dirName) {
    case 'north': y--; break;
    case 'south': y++; break;
    case 'east': x++; break;
    case 'west': x--; break;
    default: break;
    }
    const loc = game.level?.at(x, y);
    if (loc && !IS_DOOR(loc.typ)) {
        loc.typ = typ;
        loc.flags = 0;
    }
    if (!(x % 2)) {
        if (dirName === 'east') x++;
        else x--;
        const xloc = game.level?.at(x, y);
        if (xloc) {
            xloc.typ = typ;
            xloc.flags = 0;
        }
    }
    if (!(y % 2)) {
        if (dirName === 'south') y++;
        else y--;
    }
    specialWalkfrom(x, y, typ);
    if (stocked) castleFillEmptyMaze();
}

function loadCastleTerrain() {
    game._special_touched = new Set();
    for (let x = 2; x <= COLNO - 2; x++) {
        for (let y = 0; y <= ROWNO - 1; y++) {
            const loc = game.level?.at(x, y);
            if (!loc) continue;
            loc.typ = (y < 2 || ((x % 2) && (y % 2))) ? STONE : HWALL;
            loc.lit = false;
        }
    }
    for (let y = 0; y < CASTLE_MAP.length; y++) {
        for (let x = 0; x < CASTLE_MAP[y].length; x++) {
            const loc = game.level?.at(castleX(x), castleY(y));
            if (!loc) continue;
            loc.lit = false;
            switch (CASTLE_MAP[y][x]) {
            case '.':
                loc.typ = ROOM;
                break;
            case '-':
                loc.typ = HWALL;
                break;
            case '|':
                loc.typ = VWALL;
                break;
            case '+':
                loc.typ = DOOR;
                set_door_mask(loc, D_CLOSED);
                break;
            case 'S':
                loc.typ = SDOOR;
                set_door_mask(loc, D_CLOSED);
                break;
            case '{':
                loc.typ = FOUNTAIN;
                break;
            case '\\':
                loc.typ = THRONE;
                break;
            case '}':
                loc.typ = MOAT;
                break;
            default:
                loc.typ = STONE;
                break;
            }
        }
    }
    markSpecialTouchedRect(CASTLE_X, CASTLE_Y,
        castleX(CASTLE_MAP[0].length - 1), castleY(CASTLE_MAP.length - 1));
    game.level.flags.is_maze_lev = true;
    game.level.flags.noteleport = true;
}

function loadCastleSpecial() {
    // C ref: dat/castle.lua loaded via sp_lev.c:load_special().
    l_nhcore_init();
    loadCastleTerrain();

    const object = ['[', ')', '*', '%'];
    lua_shuffle(object);
    const towerPlaces = [{ x: 4, y: 2 }, { x: 58, y: 2 }, { x: 4, y: 14 }, { x: 58, y: 14 }];
    const monster = ['L', 'N', 'E', 'H', 'M', 'O', 'R', 'T', 'X', 'Z'];
    lua_shuffle(monster);
    registerCastleLregions();

    const fountain = game.level?.at(castleX(10), castleY(8));
    if (fountain) fountain.typ = FOUNTAIN;

    for (const [x, y, mask] of [
        [7, 3, D_CLOSED], [55, 3, D_CLOSED],
        [32, 4, D_LOCKED], [26, 5, D_LOCKED], [46, 5, D_LOCKED], [48, 5, D_LOCKED],
        [47, 7, D_LOCKED], [15, 8, D_CLOSED], [26, 8, D_CLOSED],
        [38, 8, D_LOCKED], [56, 8, D_LOCKED], [47, 9, D_LOCKED],
        [26, 11, D_LOCKED], [46, 11, D_LOCKED], [48, 11, D_LOCKED],
        [32, 12, D_LOCKED], [7, 13, D_CLOSED], [55, 13, D_CLOSED],
    ]) castleSetDoor(x, y, mask);

    const bridge = game.level?.at(castleX(5), castleY(8));
    if (bridge) bridge.typ = DRAWBRIDGE_UP;
    const bridgeWall = game.level?.at(castleX(6), castleY(8));
    if (bridgeWall) bridgeWall.typ = DBWALL;

    const storerooms = [
        { cls: castleObjectClass(object[0]), xs: [39, 40, 41, 42, 43, 44, 45], ys: [5, 6] },
        { cls: castleObjectClass(object[1]), xs: [49, 50, 51, 52, 53, 54, 55], ys: [5, 6] },
        { cls: castleObjectClass(object[2]), xs: [39, 40, 41, 42, 43, 44, 45], ys: [10, 11] },
        { cls: castleObjectClass(object[3]), xs: [49, 50, 51, 52, 53, 54, 55], ys: [10, 11] },
    ];
    for (const store of storerooms) {
        for (const y of store.ys)
            for (const x of store.xs)
                mkobj_at(store.cls, castleX(x), castleY(y), true);
    }

    const loc = towerPlaces[rn2(towerPlaces.length)];
    const wishingChest = mksobj_at(CHEST, castleX(loc.x), castleY(loc.y), true, false);
    if (wishingChest) {
        wishingChest.olocked = true;
        wishingChest.otrapped = false;
        wishingChest.contents = [
            createSpecialContainerObject(WAN_WISHING, CASTLE_MAP[0].length, CASTLE_MAP.length),
            createSpecialContainerObject(POT_GAIN_LEVEL, CASTLE_MAP[0].length, CASTLE_MAP.length),
        ];
    }
    make_engr_at(castleX(loc.x), castleY(loc.y), 'Elbereth', 0, 0, 3); // BURN
    const scare = mksobj_at(SCR_SCARE_MONSTER, castleX(loc.x), castleY(loc.y), true, false);
    if (scare) {
        scare.cursed = true;
        scare.blessed = false;
    }

    mksobj_at(CHEST, castleX(37), castleY(8), true, false);
    for (const [x, y] of [[40, 8], [44, 8], [48, 8], [52, 8], [55, 8]]) {
        const trap = maketrap(castleX(x), castleY(y), TRAPDOOR);
        maybeTrapVictim(trap);
    }

    for (const [id, x, y] of [
        ['soldier', 8, 6], ['soldier', 9, 5], ['soldier', 11, 5], ['soldier', 12, 6],
        ['soldier', 8, 10], ['soldier', 9, 11], ['soldier', 11, 11], ['soldier', 12, 10],
        ['lieutenant', 9, 8],
        ['soldier', 3, 2], ['soldier', 5, 2], ['soldier', 57, 2], ['soldier', 59, 2],
        ['soldier', 3, 14], ['soldier', 5, 14], ['soldier', 57, 14], ['soldier', 59, 14],
        ['D', 47, 5], ['D', 47, 6], ['D', 47, 10], ['D', 47, 11],
        ['giant eel', 5, 7], ['giant eel', 5, 9], ['giant eel', 57, 7], ['giant eel', 57, 9],
        ['shark', 5, 0], ['shark', 5, 16], ['shark', 57, 0], ['shark', 57, 16],
    ]) castleCreateMonster(id, x, y);

    for (const [idx, x, y] of [
        [9, 27, 5], [0, 30, 5], [1, 33, 5], [2, 36, 5],
        [3, 28, 6], [4, 31, 6], [5, 34, 6], [6, 37, 6],
        [7, 27, 7], [8, 30, 7], [9, 33, 7], [0, 36, 7],
        [1, 28, 8], [2, 31, 8], [3, 34, 8],
        [4, 27, 9], [5, 30, 9], [6, 33, 9], [7, 36, 9],
        [8, 28, 10], [9, 31, 10], [0, 34, 10], [1, 37, 10],
        [2, 27, 11], [3, 30, 11], [4, 33, 11], [5, 36, 11],
    ]) castleCreateMonster(monster[idx], x, y);

    castleMazeWalk(0, 10, 'west');
    castleMazeWalk(62, 6, 'east');

    castleApplyRegion(0, 0, 62, 16, 0);
    castleApplyRegion(0, 5, 5, 11, 1);
    castleApplyRegion(57, 5, 62, 11, 1);
    castleApplyRegion(27, 5, 37, 11, 1, COURT, FILL_LVFLAGS);
    castleApplyRegion(7, 5, 14, 11, 1);
    castleApplyRegion(39, 5, 45, 6, 1);
    castleApplyRegion(39, 10, 45, 11, 1);
    castleApplyRegion(49, 5, 55, 6, 1);
    castleApplyRegion(49, 10, 55, 11, 1);
    castleApplyRegion(2, 2, 6, 3, 1);
    castleApplyRegion(56, 2, 60, 3, 1);
    castleApplyRegion(2, 13, 6, 14, 1);
    castleApplyRegion(56, 13, 60, 14, 1);
    castleApplyRegion(16, 5, 25, 6, 1, BARRACKS, FILL_NORMAL);
    castleApplyRegion(16, 10, 25, 11, 1, BARRACKS, FILL_NORMAL);
    castleApplyRegion(8, 3, 54, 3, 0);
    castleApplyRegion(8, 13, 54, 13, 0);
    castleApplyRegion(16, 8, 25, 8, 0);
    castleApplyRegion(39, 8, 55, 8, 0);
    castleApplyRegion(47, 5, 47, 6, 0);
    castleApplyRegion(47, 10, 47, 11, 0);

    wallification(1, 0, COLNO - 1, ROWNO - 1);
    flip_level_rnd(2); // des.level_flags("noflipy") leaves horizontal flipping enabled.
    fixup_special();
}

function sanctumSetDoor(x, y, mask) {
    const loc = game.level?.at(sanctumX(x), sanctumY(y));
    if (!loc) return;
    loc.typ = DOOR;
    set_door_mask(loc, mask);
}

function loadSanctumTerrain() {
    game._special_touched = new Set();
    for (let y = 0; y < ROWNO; y++) {
        for (let x = 1; x < COLNO; x++) {
            const loc = game.level?.at(x, y);
            if (loc) loc.typ = STONE;
        }
    }
    for (let y = 0; y < SANCTUM_MAP.length; y++) {
        for (let x = 0; x < SANCTUM_MAP[y].length; x++) {
            const loc = game.level?.at(sanctumX(x), sanctumY(y));
            if (!loc) continue;
            loc.lit = false;
            switch (SANCTUM_MAP[y][x]) {
            case '.':
                loc.typ = ROOM;
                break;
            case '-':
                loc.typ = HWALL;
                break;
            case '|':
                loc.typ = VWALL;
                break;
            case '+':
                loc.typ = DOOR;
                set_door_mask(loc, D_CLOSED);
                break;
            case 'S':
                loc.typ = SDOOR;
                set_door_mask(loc, D_CLOSED);
                loc.horizontal = true;
                break;
            default:
                loc.typ = STONE;
                break;
            }
        }
    }
    markSpecialTouchedRect(SANCTUM_X, SANCTUM_Y,
        sanctumX(SANCTUM_MAP[0].length - 1), sanctumY(SANCTUM_MAP.length - 1));
    game.level.flags.is_maze_lev = true;
    game.level.flags.noteleport = true;
    game.level.flags.hardfloor = true;
    game.level.flags.nommap = true;
    game.level.flags.red_walls = true;
}

function sanctumCreateRoomRegion(x1, y1, x2, y2, lit, rtype, needfill) {
    for (let y = y1; y <= y2; y++) {
        for (let x = x1; x <= x2; x++) {
            const loc = game.level?.at(sanctumX(x), sanctumY(y));
            if (loc && (loc.typ === ROOM || loc.typ === CORR || loc.typ === DOOR || loc.typ === SDOOR))
                loc.lit = !!lit;
        }
    }
    const before = game.level?.nroom ?? 0;
    add_room(sanctumX(x1), sanctumY(y1), sanctumX(x2), sanctumY(y2), lit ? 1 : 0, rtype, true);
    const croom = game.level?.rooms?.[before];
    if (!croom) return null;
    croom.needjoining = true;
    croom.needfill = needfill;
    topologize(croom);
    return croom;
}

function sanctumDryLocation() {
    return specialRandomDryLocation(SANCTUM_MAP[0].length, SANCTUM_MAP.length, SANCTUM_X, SANCTUM_Y);
}

function sanctumTrap(kind, x = null, y = null) {
    const loc = x == null ? sanctumDryLocation() : { x: sanctumX(x), y: sanctumY(y) };
    const trap = maketrap(loc.x, loc.y, kind);
    maybeTrapVictim(trap);
}

function sanctumObject(ch) {
    const loc = sanctumDryLocation();
    const cls = {
        '[': ARMOR_CLASS,
        ')': WEAPON_CLASS,
        '*': GEM_CLASS,
        '!': POTION_CLASS,
        '?': SCROLL_CLASS,
    }[ch] || RANDOM_CLASS;
    mkobj_at(cls, loc.x, loc.y, true);
}

function sanctumMonsterPtr(id) {
    if (String(id || '').toLowerCase() === 'aligned cleric')
        return MONSTERS.find(m => m.name === 'PRIEST' && m.difficulty >= 15)
            || MONSTERS.find(m => m.name === 'PRIEST');
    return monster_by_user_name(id);
}

function sanctumCreateMonster(id, x = null, y = null, peaceful = null) {
    const cls = String(id || '').length === 1 ? castleMonsterClass(id) : null;
    let ptr = cls ? null : sanctumMonsterPtr(id);
    const alignedCleric = String(id || '').toLowerCase() === 'aligned cleric';
    if (!cls && monster_name_needs_find_gender_roll(id, ptr)) rn2(2);
    if (!alignedCleric) induced_align_80();
    if (cls) ptr = mkclass_aligned(cls, G_NOGEN);
    const loc = x == null ? sanctumDryLocation() : { x: sanctumX(x), y: sanctumY(y) };
    const mon = makemon(ptr, loc.x, loc.y, alignedCleric ? (MM_ADJACENTOK | MM_EMIN | MM_NOMSG) : 0);
    if (alignedCleric && mon) {
        mon.isminion = 1;
        mon.ispriest = 0;
        mon.mpeaceful = 0;
        mon.msleeping = 0;
    } else if (mon && peaceful != null) {
        mon.mpeaceful = peaceful ? 1 : 0;
    }
    return mon;
}

function loadSanctumSpecial() {
    // C ref: dat/sanctum.lua loaded via sp_lev.c:load_special().
    rn2(3); rn2(2); // nhlib shuffle()
    rn2(2); // splev_initlev()
    loadSanctumTerrain();

    rn2(4); // des.door({ wall = "random", state = "secret" }) wall
    rn2(4); // random wall coordinate selection front door
    const temple = sanctumCreateRoomRegion(15, 7, 21, 10, 1, TEMPLE, FILL_LVFLAGS);
    const altar = game.level?.at(sanctumX(18), sanctumY(8));
    if (altar) {
        altar.typ = ALTAR;
        altar.altarmask = A_NONE;
    }
    if (temple) priestini(temple, true);
    const morgue = createIrregularRoomFromSeed(sanctumX(41), sanctumY(6), MORGUE, false, FILL_NORMAL);
    if (morgue) {
        const rmno = morgue.roomnoidx + ROOMOFFSET;
        for (let x = morgue.lx - 1; x <= morgue.hx + 1; x++)
            for (let y = morgue.ly - 1; y <= morgue.hy + 1; y++) {
                const loc = game.level?.at(x, y);
                if (loc && (IS_DOOR(loc.typ) || loc.typ === SDOOR)
                    && (loc.roomno === rmno || loc.roomno === SHARED))
                    add_door(x, y, morgue);
            }
    }

    for (const [x, y, mask] of [
        [40, 6, D_CLOSED],
        [62, 6, D_LOCKED],
        [46, 12, D_CLOSED],
        [53, 10, D_CLOSED],
    ]) sanctumSetDoor(x, y, mask);
    fix_wall_spines(SANCTUM_X, SANCTUM_Y,
        sanctumX(SANCTUM_MAP[0].length - 1), sanctumY(SANCTUM_MAP.length - 1));

    for (const [x, y] of [
        [13, 5], [14, 5], [15, 5], [16, 5], [17, 5], [18, 5],
        [19, 5], [20, 5], [21, 5], [22, 5], [23, 5],
        [13, 12], [14, 12], [15, 12], [16, 12], [17, 12], [18, 12],
        [19, 12], [20, 12], [21, 12], [22, 12], [23, 12],
        [13, 6], [13, 7], [13, 8], [13, 9], [13, 10], [13, 11],
        [23, 6], [23, 7], [23, 8], [23, 9], [23, 10], [23, 11],
    ]) sanctumTrap(FIRE_TRAP, x, y);

    for (const kind of [SPIKED_PIT, FIRE_TRAP, SLP_GAS_TRAP, ANTI_MAGIC, FIRE_TRAP, MAGIC_TRAP])
        sanctumTrap(kind);
    for (const ch of ['[', '[', '[', '[', ')', ')', '*', '!', '!', '!', '!', '?', '?', '?', '?', '?'])
        sanctumObject(ch);

    for (const [id, x, y, peaceful] of [
        ['horned devil', 14, 12, 0],
        ['barbed devil', 18, 8, 0],
        ['erinys', 10, 4, 0],
        ['marilith', 7, 9, 0],
        ['nalfeshnee', 27, 8, 0],
        ['aligned cleric', 20, 3, 0],
        ['aligned cleric', 15, 4, 0],
        ['aligned cleric', 11, 5, 0],
        ['aligned cleric', 11, 7, 0],
        ['aligned cleric', 11, 9, 0],
        ['aligned cleric', 11, 12, 0],
        ['aligned cleric', 15, 13, 0],
        ['aligned cleric', 17, 13, 0],
        ['aligned cleric', 21, 13, 0],
    ]) sanctumCreateMonster(id, x, y, peaceful);
    for (const id of ['L', 'L', 'V', 'V', 'V']) sanctumCreateMonster(id);

    placeSpecialStair(sanctumX(63), sanctumY(15), true);
    const ext = get_level_extends();
    const bounds = {
        minx: Math.max(1, ext.xmin),
        maxx: Math.min(COLNO - 1, ext.xmax),
        miny: Math.max(0, ext.ymin),
        maxy: Math.min(ROWNO - 1, ext.ymax),
    };
    wallification(1, 0, COLNO - 1, ROWNO - 1);
    const flp = flip_level_rnd(3);
    registerSanctumLregions(flp, bounds);
    fixup_special();
}

const ASMO1_X = 15;
const ASMO1_Y = 5;
const ASMO1_MAP = [
    '---------------------',
    '|.............|.....|',
    '|.............S.....|',
    '|---+------------...|',
    '|.....|.........|-+--',
    '|..---|.........|....',
    '|..|..S.........|....',
    '|..|..|.........|....',
    '|..|..|.........|-+--',
    '|..|..-----------...|',
    '|..S..........|.....|',
    '---------------------',
];
const ASMO2_X = 35;
const ASMO2_Y = 9;
const ASMO2_MAP = [
    '---------------------------------',
    '................................|',
    '................................+',
    '................................|',
    '---------------------------------',
];

function asmoX(x, xstart = ASMO1_X) { return x + xstart; }
function asmoY(y, ystart = ASMO1_Y) { return y + ystart; }

function asmoSetTerrain(xstart, ystart, x, y, ch) {
    const loc = game.level?.at(asmoX(x, xstart), asmoY(y, ystart));
    if (!loc) return;
    loc.lit = false;
    switch (ch) {
    case '.':
        loc.typ = ROOM;
        break;
    case '-':
        loc.typ = HWALL;
        break;
    case '|':
        loc.typ = VWALL;
        break;
    case '+':
        loc.typ = DOOR;
        set_door_mask(loc, D_CLOSED);
        break;
    case 'S':
        loc.typ = SDOOR;
        set_door_mask(loc, D_CLOSED);
        break;
    default:
        loc.typ = STONE;
        break;
    }
}

function asmoLoadMap(mapRows, xstart, ystart) {
    for (let y = 0; y < mapRows.length; y++)
        for (let x = 0; x < mapRows[y].length; x++)
            asmoSetTerrain(xstart, ystart, x, y, mapRows[y][x]);
    markSpecialTouchedRect(xstart, ystart,
        xstart + mapRows[0].length - 1, ystart + mapRows.length - 1);
}

function loadAsmodeusTerrain() {
    game._special_touched = new Set();
    for (let x = 2; x <= COLNO - 2; x++) {
        for (let y = 0; y <= ROWNO - 1; y++) {
            const loc = game.level?.at(x, y);
            if (!loc) continue;
            loc.typ = (y < 2 || ((x % 2) && (y % 2))) ? STONE : HWALL;
            loc.lit = false;
        }
    }
    asmoLoadMap(ASMO1_MAP, ASMO1_X, ASMO1_Y);
    asmoLoadMap(ASMO2_MAP, ASMO2_X, ASMO2_Y);
    game.level.flags.is_maze_lev = true;
}

function asmoDryLocation(mapRows = ASMO1_MAP, xstart = ASMO1_X, ystart = ASMO1_Y) {
    return specialRandomDryLocation(mapRows[0].length, mapRows.length, xstart, ystart);
}

function asmoTrapLocation(mapRows = ASMO1_MAP, xstart = ASMO1_X, ystart = ASMO1_Y) {
    let loc = asmoDryLocation(mapRows, xstart, ystart);
    let trycnt = 0;
    while ((game.level?.at(loc.x, loc.y)?.typ === STAIRS
            || game.level?.at(loc.x, loc.y)?.typ === LADDER)
           && ++trycnt <= 100) {
        loc = asmoDryLocation(mapRows, xstart, ystart);
    }
    return loc;
}

function asmoObject(ch, mapRows = ASMO1_MAP, xstart = ASMO1_X, ystart = ASMO1_Y) {
    const loc = asmoDryLocation(mapRows, xstart, ystart);
    const cls = {
        '[': ARMOR_CLASS,
        ')': WEAPON_CLASS,
        '*': GEM_CLASS,
        '!': POTION_CLASS,
        '?': SCROLL_CLASS,
    }[ch] || RANDOM_CLASS;
    mkobj_at(cls, loc.x, loc.y, true);
}

function asmoTrap(kind, x = null, y = null, mapRows = ASMO1_MAP, xstart = ASMO1_X, ystart = ASMO1_Y) {
    const loc = x == null ? asmoTrapLocation(mapRows, xstart, ystart)
        : { x: asmoX(x, xstart), y: asmoY(y, ystart) };
    const trap = maketrap(loc.x, loc.y, kind);
    maybeTrapVictim(trap);
}

function asmoMonsterClass(ch) {
    if (ch === '&') return 'S_DEMON';
    return castleMonsterClass(ch);
}

function asmoMonsterLocation(ptr, mapRows = ASMO1_MAP, xstart = ASMO1_X, ystart = ASMO1_Y) {
    let x = xstart, y = ystart;
    let trycnt = 0;
    do {
        x = xstart + rn2(mapRows[0].length);
        y = ystart + rn2(mapRows.length);
        if (specialMonsterLocationOk(x, y, ptr)) return { x, y };
    } while (++trycnt < 100);
    return asmoDryLocation(mapRows, xstart, ystart);
}

function asmoCreateMonster(id, x = null, y = null,
    mapRows = ASMO1_MAP, xstart = ASMO1_X, ystart = ASMO1_Y) {
    const cls = String(id || '').length === 1 ? asmoMonsterClass(id) : null;
    let ptr = cls ? null : monster_by_user_name(id);
    if (!cls && monster_name_needs_find_gender_roll(id, ptr)) rn2(2);
    induced_align_80();
    if (cls) ptr = mkclass_aligned(cls, G_NOGEN);
    const loc = x == null ? asmoMonsterLocation(ptr, mapRows, xstart, ystart)
        : { x: asmoX(x, xstart), y: asmoY(y, ystart) };
    if (m_at(loc.x, loc.y)) {
        const cc = enexto_core(loc.x, loc.y, ptr, GP_CHECKSCARY)
            || enexto_core(loc.x, loc.y, ptr, 0);
        if (cc) {
            loc.x = cc.x;
            loc.y = cc.y;
        }
    }
    return apply_monster_name_gender(makemon(ptr, loc.x, loc.y, 0), id);
}

function asmoMazeWalk(x, y, dirName, xstart = ASMO2_X, ystart = ASMO2_Y) {
    x = asmoX(x, xstart);
    y = asmoY(y, ystart);
    switch (dirName) {
    case 'north': y--; break;
    case 'south': y++; break;
    case 'east': x++; break;
    case 'west': x--; break;
    default: break;
    }
    const loc = game.level?.at(x, y);
    if (loc && !IS_DOOR(loc.typ)) {
        loc.typ = ROOM;
        loc.flags = 0;
    }
    if (!(x % 2)) {
        if (dirName === 'east') x++;
        else x--;
        const xloc = game.level?.at(x, y);
        if (xloc) {
            xloc.typ = ROOM;
            xloc.flags = 0;
        }
    }
    if (!(y % 2)) {
        if (dirName === 'south') y++;
        else y--;
    }
    specialWalkfrom(x, y, ROOM);
    castleFillEmptyMaze();
}

function registerAsmodeusLregions(flp, bounds) {
    const inarea = { x1: 1, y1: 0, x2: 6, y2: 20 };
    const delarea = { x1: 6, y1: 1, x2: 70, y2: 16 };
    const up = flipRectForBounds(inarea, flp, bounds.minx, bounds.miny, bounds.maxx, bounds.maxy);
    const branch = flipRectForBounds(inarea, flp, bounds.minx, bounds.miny, bounds.maxx, bounds.maxy);
    const exclude = flipRectForBounds(delarea, flp, bounds.minx, bounds.miny, bounds.maxx, bounds.maxy);
    game._special_lregions = [
        { rtype: LR_UPSTAIR, inarea: up, delarea: exclude },
        { rtype: LR_BRANCH, inarea: branch, delarea: exclude },
        { rtype: LR_TELE, inarea: up, delarea: exclude },
    ];
}

function selKey(x, y) { return `${x},${y}`; }
function selPoint(set, x, y) { set.add(selKey(x, y)); return set; }
function selHas(set, x, y) { return set.has(selKey(x, y)); }
function selCoords(set) {
    return [...set].map(k => {
        const [x, y] = k.split(',').map(Number);
        return { x, y };
    });
}

function hellTweaksProtectedOk(x, y) {
    if (typeof game._hell_tweaks_protected_ok === 'function') {
        return game._hell_tweaks_protected_ok(x, y);
    }
    if (x < 3 || x > 77 || y < 3 || y > 19) return false;
    if (x >= ASMO1_X && x < ASMO1_X + ASMO1_MAP[0].length
        && y >= ASMO1_Y && y < ASMO1_Y + ASMO1_MAP.length) return false;
    if (x >= ASMO2_X && x < ASMO2_X + ASMO2_MAP[0].length
        && y >= ASMO2_Y && y < ASMO2_Y + ASMO2_MAP.length) return false;
    return true;
}

function hellTweaksRandomPoint() {
    return { x: 1 + rn2(COLNO - 1), y: rn2(ROWNO) };
}

function hellTweaksSetRandom(set) {
    const p = hellTweaksRandomPoint();
    selPoint(set, p.x, p.y);
    return set;
}

function hellTweaksGrow(set, dirName = 'all') {
    let dir = dirName;
    if (dir === 'random') {
        dir = ['north', 'south', 'east', 'west'][rn2(4)];
    }
    const dirs = {
        west: [[-1, 0]],
        east: [[1, 0]],
        north: [[0, -1]],
        south: [[0, 1]],
        all: [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]],
    }[dir] || [];
    const add = [];
    for (const { x, y } of selCoords(set)) {
        for (const [dx, dy] of dirs) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < COLNO && ny >= 0 && ny < ROWNO) add.push({ x: nx, y: ny });
        }
    }
    for (const p of add) selPoint(set, p.x, p.y);
    return set;
}

function hellTweaksFilterProtected(set) {
    const out = new Set();
    for (const { x, y } of selCoords(set))
        if (hellTweaksProtectedOk(x, y)) selPoint(out, x, y);
    return out;
}

function hellTweaksPercentage(set, pct) {
    const out = new Set();
    for (const { x, y } of selCoords(set).sort((a, b) => a.x - b.x || a.y - b.y)) {
        if (rn2(100) < pct) selPoint(out, x, y);
    }
    return out;
}

function hellTweaksRndCoord(set) {
    const coords = selCoords(set).sort((a, b) => a.x - b.x || a.y - b.y);
    if (!coords.length) return { x: -1, y: -1 };
    return coords[rn2(coords.length)];
}

function hellTweaksRandLine(x1, y1, x2, y2, rough, rec, set = new Set()) {
    if (rec < 1 || (x2 === x1 && y2 === y1)) return set;
    rough = Math.min(rough, Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)));
    let mx, my;
    if (rough < 2) {
        mx = Math.trunc((x1 + x2) / 2);
        my = Math.trunc((y1 + y2) / 2);
    } else {
        do {
            const dx = rn2(rough) - Math.trunc(rough / 2);
            const dy = rn2(rough) - Math.trunc(rough / 2);
            mx = Math.trunc((x1 + x2) / 2) + dx;
            my = Math.trunc((y1 + y2) / 2) + dy;
        } while (mx > COLNO - 1 || mx < 0 || my < 0 || my > ROWNO - 1);
    }
    selPoint(set, mx, my);
    rough = Math.trunc((rough * 2) / 3);
    rec--;
    hellTweaksRandLine(x1, y1, mx, my, rough, rec, set);
    hellTweaksRandLine(mx, my, x2, y2, rough, rec, set);
    selPoint(set, x2, y2);
    return set;
}

function hellTweaksFloorSelection() {
    const set = new Set();
    for (let x = 0; x < COLNO; x++)
        for (let y = 0; y < ROWNO; y++) {
            const loc = game.level?.at(x, y);
            if (loc?.typ === ROOM) selPoint(set, x, y);
        }
    return set;
}

function hellTweaksMatchPattern(rows) {
    const set = new Set();
    const h = rows.length;
    const w = rows[0]?.length ?? 0;
    const cx = Math.trunc(w / 2);
    const cy = Math.trunc(h / 2);
    for (let x = 1; x < COLNO; x++) {
        for (let y = 0; y < ROWNO; y++) {
            let ok = true;
            for (let py = 0; py < h && ok; py++) {
                for (let px = 0; px < w; px++) {
                    const tx = x + px - cx;
                    const ty = y + py - cy;
                    const typ = isok(tx, ty) ? game.level?.at(tx, ty)?.typ : STONE;
                    const ch = rows[py][px];
                    if (ch === '.' && typ !== ROOM) { ok = false; break; }
                    if (ch === 'w' && !IS_STWALL(typ)) { ok = false; break; }
                }
            }
            if (ok) selPoint(set, x, y);
        }
    }
    return set;
}

function applyTerrainSelection(set, typ) {
    for (const { x, y } of selCoords(set)) {
        const loc = game.level?.at(x, y);
        if (loc) {
            loc.typ = typ;
            // C ref: mkmap.c:finish_map() and sp_lev.c region lighting.
            if (typ === LAVAPOOL) loc.lit = true;
        }
    }
}

function hellTweaksAsmodeus() {
    // C ref: dat/nhlib.lua:hell_tweaks().
    const depth = depth_of_level(game.u?.uz);
    if (rn2(100) < 20 + depth) {
        let pools = new Set();
        const maxpools = 5 + (1 + rn2(depth));
        for (let i = 0; i < maxpools; i++) hellTweaksSetRandom(pools);
        const west = hellTweaksGrow(hellTweaksSetRandom(new Set()), 'west');
        const north = hellTweaksGrow(hellTweaksSetRandom(new Set()), 'north');
        const random = hellTweaksGrow(hellTweaksSetRandom(new Set()), 'random');
        pools = new Set([...pools, ...west, ...north, ...random]);
        pools = hellTweaksFilterProtected(pools);
        if (rn2(100) < 80) {
            const poolground = hellTweaksFilterProtected(hellTweaksGrow(new Set(pools), 'all'));
            const pval = (1 + rn2(8)) * 10;
            const pct = hellTweaksPercentage(poolground, pval);
            applyTerrainSelection(pct, ROOM);
        }
        applyTerrainSelection(pools, LAVAPOOL);
    }
    if (rn2(100) < 50) {
        let allrivers = new Set();
        const unprotectedCount = (() => {
            let n = 0;
            for (let x = 0; x < COLNO; x++)
                for (let y = 0; y < ROWNO; y++)
                    if (hellTweaksProtectedOk(x, y)) n++;
            return n;
        })();
        const reqpts = unprotectedCount / 12;
        let rpts = 0;
        let rivertries = 0;
        do {
            const floor = hellTweaksFloorSelection();
            const a = hellTweaksRndCoord(floor);
            const b = hellTweaksRndCoord(floor);
            // C ref: nhlsel.c:l_selection_randline() passes rec=12 to
            // selection_do_randline(); low-roughness recursion adds points
            // without consuming additional RNG.
            let lavariver = hellTweaksRandLine(a.x, a.y, b.x, b.y, 10, 12);
            if (rn2(100) < 50) lavariver = hellTweaksGrow(lavariver, 'north');
            if (rn2(100) < 50) lavariver = hellTweaksGrow(lavariver, 'west');
            allrivers = new Set([...allrivers, ...lavariver]);
            allrivers = hellTweaksFilterProtected(allrivers);
            rpts = allrivers.size;
            rivertries++;
        } while (!(rpts > reqpts || rivertries > 7));
        if (rn2(100) < 60) {
            const prc = 10 * (1 + rn2(6));
            const riverbanks = hellTweaksFilterProtected(hellTweaksGrow(new Set(allrivers), 'all'));
            applyTerrainSelection(hellTweaksPercentage(riverbanks, prc), ROOM);
        }
        applyTerrainSelection(allrivers, LAVAPOOL);
    }
    if (rn2(100) < 20) {
        const amount = 3 * (1 + rn2(8));
        let bwalls = new Set([
            ...hellTweaksPercentage(hellTweaksMatchPattern(['.w.']), amount),
            ...hellTweaksPercentage(hellTweaksMatchPattern(['.', 'w', '.']), amount),
        ]);
        bwalls = hellTweaksFilterProtected(bwalls);
        for (const { x, y } of selCoords(bwalls).sort((a, b) => a.y - b.y || a.x - b.x)) {
            applyTerrainSelection(selPoint(new Set(), x, y), ROOM);
            mksobj_at(BOULDER, x, y, true, false);
        }
    }
    if (rn2(100) < 20) {
        const amount = 3 * (1 + rn2(8));
        let fwalls = new Set([
            ...hellTweaksPercentage(hellTweaksMatchPattern(['.w.']), amount),
            ...hellTweaksPercentage(hellTweaksMatchPattern(['.', 'w', '.']), amount),
        ]);
        fwalls = hellTweaksGrow(fwalls, 'all');
        const wallSet = hellTweaksMatchPattern(['w']);
        fwalls = hellTweaksFilterProtected(new Set(selCoords(fwalls)
            .filter(p => selHas(wallSet, p.x, p.y))
            .map(p => selKey(p.x, p.y))));
        applyTerrainSelection(fwalls, IRONBARS);
    }
}

function loadAsmodeusSpecial() {
    // C ref: dat/asmodeus.lua loaded through sp_lev.c:lspo_map().
    rn2(3); rn2(2); // nhlib shuffle()
    loadAsmodeusTerrain();
    asmoSetTerrain(ASMO1_X, ASMO1_Y, 4, 3, '+');
    game.level.at(asmoX(4), asmoY(3)).doormask = D_CLOSED;
    asmoSetTerrain(ASMO1_X, ASMO1_Y, 18, 4, '+');
    game.level.at(asmoX(18), asmoY(4)).doormask = D_LOCKED;
    asmoSetTerrain(ASMO1_X, ASMO1_Y, 18, 8, '+');
    game.level.at(asmoX(18), asmoY(8)).doormask = D_CLOSED;
    placeSpecialStair(asmoX(13), asmoY(7), false);

    asmoCreateMonster('Asmodeus', 12, 7);
    for (const ch of ['[', '[', ')', ')', '*', '!', '!', '?', '?', '?']) asmoObject(ch);
    asmoTrap(SPIKED_PIT, 5, 2);
    asmoTrap(FIRE_TRAP, 8, 6);
    for (const kind of [SLP_GAS_TRAP, ANTI_MAGIC, FIRE_TRAP, MAGIC_TRAP, MAGIC_TRAP])
        asmoTrap(kind);
    asmoCreateMonster('ghost', 11, 7);
    asmoCreateMonster('horned devil', 10, 5);
    asmoCreateMonster('L');
    for (const id of ['V', 'V', 'V']) asmoCreateMonster(id);

    asmoMazeWalk(32, 2, 'east');
    asmoSetTerrain(ASMO2_X, ASMO2_Y, 32, 2, '+');
    game.level.at(asmoX(32, ASMO2_X), asmoY(2, ASMO2_Y)).doormask = D_CLOSED;
    for (const id of ['&', '&', '&'])
        asmoCreateMonster(id, null, null, ASMO2_MAP, ASMO2_X, ASMO2_Y);
    for (const kind of [ANTI_MAGIC, FIRE_TRAP, MAGIC_TRAP])
        asmoTrap(kind, null, null, ASMO2_MAP, ASMO2_X, ASMO2_Y);

    const ext = get_level_extends();
    const bounds = {
        minx: Math.max(1, ext.xmin),
        maxx: Math.min(COLNO - 1, ext.xmax),
        miny: Math.max(0, ext.ymin),
        maxy: Math.min(ROWNO - 1, ext.ymax),
    };
    hellTweaksAsmodeus();
    wallification(1, 0, COLNO - 1, ROWNO - 1);
    const flp = flip_level_rnd(3);
    registerAsmodeusLregions(flp, bounds);
    fixup_special();
}

function loadJuiblexSwampTerrain() {
    // C ref: sp_lev.c:lvlfill_swamp().
    for (let x = 2; x <= COLNO - 2; x++) {
        for (let y = 0; y <= ROWNO - 1; y++) {
            const loc = game.level?.at(x, y);
            if (!loc) continue;
            loc.typ = MOAT;
            loc.lit = false;
        }
    }
    for (let x = 2; x <= Math.min(COLNO - 2, COLNO - 2); x += 2) {
        for (let y = 0; y <= Math.min(ROWNO - 1, ROWNO - 2); y += 2) {
            const loc = game.level?.at(x, y);
            if (loc) {
                loc.typ = ROOM;
                loc.lit = false;
            }
            let c = 0;
            if (game.level?.at(x + 1, y)?.typ === MOAT) c++;
            if (game.level?.at(x, y + 1)?.typ === MOAT) c++;
            if (game.level?.at(x + 1, y + 1)?.typ === MOAT) c++;
            if (c === 3) {
                switch (rn2(3)) {
                case 0:
                    game.level.at(x + 1, y).typ = ROOM;
                    break;
                case 1:
                    game.level.at(x, y + 1).typ = ROOM;
                    break;
                case 2:
                    game.level.at(x + 1, y + 1).typ = ROOM;
                    break;
                default:
                    break;
                }
            }
        }
    }
    game.level.flags.is_maze_lev = true;
}

const JUIB_LEFT_X = 1;
const JUIB_LEFT_Y = 15;
const JUIB_RIGHT_X = 69;
const JUIB_RIGHT_Y = 3;
const JUIB_LAIR_X = 15;
const JUIB_LAIR_Y = 3;
const JUIB_SMALL_LEFT = [
    'xxxxxxxx',
    'xx...xxx',
    'xxx...xx',
    'xxxx.xxx',
    'xxxxxxxx',
];
const JUIB_SMALL_RIGHT = [
    'xxxxxxxx',
    'xxxx.xxx',
    'xxx...xx',
    'xx...xxx',
    'xxxxxxxx',
];
const JUIB_LAIR = [
    'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    'xxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.xxxx',
    'xxx...xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx...xxx',
    'xxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.xxxx',
    'xxxxxxxxxxxxxxxxxxxxxxxx}}}xxxxxxxxxxxxxxx}}}}}xxxx',
    'xxxxxxxxxxxxxxxxxxxxxxx}}}}}xxxxxxxxxxxxx}.....}xxx',
    'xxxxxxxxxxxxxxxxxxxxxx}}...}}xxxxxxxxxxx}..P.P..}xx',
    'xxxxxxxxxxxxxxxxxxxxx}}..P..}}xxxxxxxxxxx}.....}xxx',
    'xxxxxxxxxxxxxxxxxxxxx}}.P.P.}}xxxxxxxxxxxx}...}xxxx',
    'xxxxxxxxxxxxxxxxxxxxx}}..P..}}xxxxxxxxxxxx}...}xxxx',
    'xxxxxxxxxxxxxxxxxxxxxx}}...}}xxxxxxxxxxxxxx}}}xxxxx',
    'xxxxxxxxxxxxxxxxxxxxxxx}}}}}xxxxxxxxxxxxxxxxxxxxxxx',
    'xxxxxxxxxxxxxxxxxxxxxxxx}}}xxxxxxxxxxxxxxxxxxxxxxxx',
    'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    'xxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.xxxx',
    'xxx...xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx...xxx',
    'xxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.xxxx',
    'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
];

function juibSetTerrain(xstart, ystart, x, y, ch) {
    if (ch === 'x') return;
    const loc = game.level?.at(xstart + x, ystart + y);
    if (!loc) return;
    loc.lit = false;
    switch (ch) {
    case '.': loc.typ = ROOM; break;
    case '}': loc.typ = MOAT; break;
    case 'P': loc.typ = POOL; break;
    default: break;
    }
}

function juibLoadMap(rows, xstart, ystart) {
    for (let y = 0; y < rows.length; y++)
        for (let x = 0; x < rows[y].length; x++)
            juibSetTerrain(xstart, ystart, x, y, rows[y][x]);
}

function juibDryLocation(rows, xstart, ystart) {
    return specialRandomDryLocation(rows[0].length, rows.length, xstart, ystart);
}

function juibObject(otyp, rows, xstart, ystart) {
    const loc = juibDryLocation(rows, xstart, ystart);
    mksobj_at(otyp, loc.x, loc.y, true, false);
}

function juibAbs(x, y) {
    return { x: JUIB_LAIR_X + x, y: JUIB_LAIR_Y + y };
}

function juibObjectAt(oclass, x, y) {
    const loc = juibAbs(x, y);
    mkobj_at(oclass, loc.x, loc.y, true);
}

function juibRandomObject(oclass) {
    const loc = juibDryLocation(JUIB_LAIR, JUIB_LAIR_X, JUIB_LAIR_Y);
    mkobj_at(oclass, loc.x, loc.y, true);
}

function juibRandomBoulder() {
    const loc = juibDryLocation(JUIB_LAIR, JUIB_LAIR_X, JUIB_LAIR_Y);
    mksobj_at(BOULDER, loc.x, loc.y, true, false);
}

function juibTrap(kind) {
    const loc = juibDryLocation(JUIB_LAIR, JUIB_LAIR_X, JUIB_LAIR_Y);
    const trap = maketrap(loc.x, loc.y, kind);
    maybeTrapVictim(trap);
}

function registerJuiblexLregions() {
    const left = { x1: 1, y1: 0, x2: 11, y2: 20 };
    const right = { x1: 69, y1: 0, x2: 79, y2: 20 };
    const exclude = {
        x1: JUIB_LAIR_X, y1: JUIB_LAIR_Y,
        x2: JUIB_LAIR_X + JUIB_LAIR[0].length - 1,
        y2: JUIB_LAIR_Y + JUIB_LAIR.length - 1,
    };
    game._special_lregions = [
        { rtype: LR_DOWNSTAIR, inarea: left, delarea: exclude },
        { rtype: LR_UPSTAIR, inarea: right, delarea: exclude },
        { rtype: LR_BRANCH, inarea: left, delarea: exclude },
        { rtype: LR_UPTELE, inarea: left, delarea: exclude },
        { rtype: LR_DOWNTELE, inarea: right, delarea: exclude },
    ];
}

function shuffleArrayInPlace(arr) {
    for (let i = arr.length; i > 1; i--) {
        const j = rn2(i);
        const tmp = arr[i - 1];
        arr[i - 1] = arr[j];
        arr[j] = tmp;
    }
    return arr;
}

function juibSelectionPoint(set, x, y) {
    return selPoint(set, JUIB_LAIR_X + x, JUIB_LAIR_Y + y);
}

function juibRndCoordRemove(set) {
    const coords = selCoords(set).sort((a, b) => a.x - b.x || a.y - b.y);
    const p = coords[rn2(coords.length)];
    set.delete(selKey(p.x, p.y));
    return p;
}

function juibCreateFountainMimic(loc) {
    rn2(2); // C ref: sp_lev.c:find_montype() ambiguity gate for "giant mimic".
    rn2(3); // C ref: sp_lev.c:create_monster() induced_align().
    const ptr = MONSTERS.find(m => m.name === 'GIANT_MIMIC');
    const mon = makemon(ptr, loc.x, loc.y, 0);
    if (mon) {
        mon.m_ap_type = M_AP_FURNITURE;
        mon.mappearance = FOUNTAIN;
    }
}

function juibCreateSwampRegion() {
    // C ref: dat/juiblex.lua des.region(..., type="swamp", filled=2).
    add_room(JUIB_LAIR_X, JUIB_LAIR_Y,
        JUIB_LAIR_X + JUIB_LAIR[0].length - 1,
        JUIB_LAIR_Y + JUIB_LAIR.length - 1,
        false, SWAMP, true);
    const room = game.level.rooms?.[game.level.nroom - 1];
    if (room) {
        room.needfill = FILL_LVFLAGS;
        topologize(room);
    }
}

function juibCreateMonster(id, x, y) {
    let ptr = monster_by_user_name(id);
    if (String(id || '').toLowerCase() === 'lemure') rn2(2);
    else if (monster_name_needs_find_gender_roll(id, ptr)) rn2(2);
    induced_align_80();
    const loc = juibAbs(x, y);
    return makemon(ptr, loc.x, loc.y, 0);
}

function juibCreateRandomMonster(id) {
    const ptr = monster_by_user_name(id);
    rn2(2);
    induced_align_80();
    let loc = asmoMonsterLocation(ptr, JUIB_LAIR, JUIB_LAIR_X, JUIB_LAIR_Y);
    if (m_at(loc.x, loc.y)) {
        loc = enexto_core(loc.x, loc.y, ptr, GP_CHECKSCARY)
            || enexto_core(loc.x, loc.y, ptr, 0)
            || loc;
    }
    return makemon(ptr, loc.x, loc.y, 0);
}

function juibMonsterClass(ch) {
    return Object.entries(MONSTER_SYMBOLS).find(([, sym]) => sym === ch)?.[0] ?? null;
}

function juibCreateClassMonster(ch, x, y) {
    induced_align_80();
    const ptr = mkclass_aligned(juibMonsterClass(ch), G_NOGEN);
    let loc = x == null ? asmoMonsterLocation(ptr, JUIB_LAIR, JUIB_LAIR_X, JUIB_LAIR_Y)
        : juibAbs(x, y);
    if (m_at(loc.x, loc.y)) {
        loc = enexto_core(loc.x, loc.y, ptr, GP_CHECKSCARY)
            || enexto_core(loc.x, loc.y, ptr, 0)
            || loc;
    }
    return makemon(ptr, loc.x, loc.y, 0);
}

function loadJuiblexSpecial() {
    // C ref: dat/juiblex.lua starts with nhlib shuffle then LVLINIT_SWAMP.
    rn2(3); rn2(2);
    loadJuiblexSwampTerrain();
    game.level.flags.shortsighted = true;
    game.level.flags.temperature = 0; // des.level_flags("temperate")
    juibLoadMap(JUIB_SMALL_LEFT, JUIB_LEFT_X, JUIB_LEFT_Y);
    juibObject(BOULDER, JUIB_SMALL_LEFT, JUIB_LEFT_X, JUIB_LEFT_Y);
    juibLoadMap(JUIB_SMALL_RIGHT, JUIB_RIGHT_X, JUIB_RIGHT_Y);
    juibObject(BOULDER, JUIB_SMALL_RIGHT, JUIB_RIGHT_X, JUIB_RIGHT_Y);
    juibLoadMap(JUIB_LAIR, JUIB_LAIR_X, JUIB_LAIR_Y);
    const monster = shuffleArrayInPlace(['j', 'b', 'P', 'F']);
    const place = new Set();
    juibSelectionPoint(place, 4, 2);
    juibSelectionPoint(place, 46, 2);
    juibSelectionPoint(place, 4, 15);
    juibSelectionPoint(place, 46, 15);
    juibCreateSwampRegion();
    const fountain = juibRndCoordRemove(place);
    if (game.level?.at(fountain.x, fountain.y)) game.level.at(fountain.x, fountain.y).typ = FOUNTAIN;
    juibCreateFountainMimic(juibRndCoordRemove(place));
    juibCreateFountainMimic(juibRndCoordRemove(place));
    juibCreateFountainMimic(juibRndCoordRemove(place));
    juibCreateMonster('Juiblex', 25, 8);
    juibCreateMonster('lemure', 43, 8);
    juibCreateMonster('lemure', 44, 8);
    juibCreateMonster('lemure', 45, 8);
    juibObjectAt(GEM_CLASS, 43, 6);
    juibObjectAt(GEM_CLASS, 45, 6);
    juibObjectAt(POTION_CLASS, 43, 9);
    juibObjectAt(POTION_CLASS, 44, 9);
    juibObjectAt(POTION_CLASS, 45, 9);
    juibCreateClassMonster(monster[3], 25, 6);
    juibCreateClassMonster(monster[0], 24, 7);
    juibCreateClassMonster(monster[1], 26, 7);
    juibCreateClassMonster(monster[2], 23, 8);
    juibCreateClassMonster(monster[2], 27, 8);
    juibCreateClassMonster(monster[1], 24, 9);
    juibCreateClassMonster(monster[0], 26, 9);
    juibCreateClassMonster(monster[3], 25, 10);
    for (let i = 0; i < 4; i++) juibCreateClassMonster('j');
    for (let i = 0; i < 4; i++) juibCreateClassMonster('P');
    for (let i = 0; i < 3; i++) juibCreateClassMonster('b');
    for (let i = 0; i < 3; i++) juibCreateClassMonster('F');
    for (let i = 0; i < 2; i++) juibCreateClassMonster('m');
    juibCreateRandomMonster('jellyfish');
    juibCreateRandomMonster('jellyfish');
    for (let i = 0; i < 3; i++) juibRandomObject(POTION_CLASS);
    for (let i = 0; i < 3; i++) juibRandomObject(FOOD_CLASS);
    juibRandomBoulder();
    juibTrap(SLP_GAS_TRAP);
    juibTrap(SLP_GAS_TRAP);
    juibTrap(ANTI_MAGIC);
    juibTrap(ANTI_MAGIC);
    juibTrap(MAGIC_TRAP);
    juibTrap(MAGIC_TRAP);
    registerJuiblexLregions();
    fixup_special();
}

const BAALZ_X = 29;
const BAALZ_Y = 5;
const BAALZ_MAP = [
    '-------------------------------------------------',
    '|                   ----               ----      ',
    '|          ----     |     -----------  |         ',
    '| ------      |  ---------|.........|--P         ',
    '| F....|  -------|...........--------------      ',
    '---....|--|..................S............|----  ',
    '+...--....S..----------------|............S...|  ',
    '---....|--|..................|............|----  ',
    '| F....|  -------|...........-----S--------      ',
    '| ------      |  ---------|.........|--P         ',
    '|          ----     |     -----------  |         ',
    '|                   ----               ----      ',
    '-------------------------------------------------',
];

function baalzSetTerrain(x, y, ch) {
    if (ch === ' ') return;
    const loc = game.level?.at(BAALZ_X + x, BAALZ_Y + y);
    if (!loc) return;
    loc.lit = false;
    switch (ch) {
    case '.': loc.typ = ROOM; break;
    case '-': loc.typ = HWALL; break;
    case '|': loc.typ = VWALL; break;
    case '+': loc.typ = DOOR; set_door_mask(loc, D_CLOSED); break;
    case 'S': loc.typ = SDOOR; set_door_mask(loc, D_CLOSED); break;
    case 'P': loc.typ = POOL; break;
    case 'F': loc.typ = IRONBARS; break;
    default: loc.typ = STONE; break;
    }
}

function loadBaalzTerrain() {
    game._special_touched = new Set();
    for (let x = 1; x < COLNO; x++) {
        for (let y = 0; y < ROWNO; y++) {
            const loc = game.level?.at(x, y);
            if (!loc) continue;
            loc.typ = STONE;
            loc.lit = false;
        }
    }
    for (let y = 0; y < BAALZ_MAP.length; y++)
        for (let x = 0; x < BAALZ_MAP[y].length; x++)
            baalzSetTerrain(x, y, BAALZ_MAP[y][x]);
    markSpecialTouchedRect(BAALZ_X, BAALZ_Y,
        BAALZ_X + BAALZ_MAP[0].length - 1, BAALZ_Y + BAALZ_MAP.length - 1);
    // C ref: dat/baalz.lua des.non_diggable(selection.area(00,00,47,12)).
    // The final map column is intentionally left diggable.
    for (let y = BAALZ_Y; y <= BAALZ_Y + 12; y++) {
        for (let x = BAALZ_X; x <= BAALZ_X + 47; x++) {
            const loc = game.level?.at(x, y);
            if (loc) loc.wall_info = (loc.wall_info || 0) | W_NONDIGGABLE;
        }
    }
    game.level.flags.is_maze_lev = true;
    game.level.flags.corrmaze = true;
}

function baalzFixup() {
    const map = game.level;
    if (!map) return;
    const midy = Math.trunc(ROWNO / 2);
    let x1 = 0, lastx = 0;
    for (let x = 0; x < COLNO; x++) {
        if ((map.at(x, midy)?.wall_info & W_NONDIGGABLE) !== 0) {
            if (!lastx) x1 = x + 1;
            lastx = x;
        }
    }
    const x2 = ((lastx > x1) ? lastx : COLNO) - 1;
    let y1 = 0, lasty = 0;
    for (let y = 0; y < ROWNO; y++) {
        if ((map.at(x1, y)?.wall_info & W_NONDIGGABLE) !== 0) {
            if (!lasty) y1 = y + 1;
            lasty = y;
        }
    }
    const y2 = ((lasty > y1) ? lasty : ROWNO) - 1;
    const fakePools = [];
    for (let x = x1; x <= x2; x++) {
        for (let y = y1; y <= y2; y++) {
            const loc = map.at(x, y);
            if (!loc) continue;
            if (loc.typ === POOL) {
                loc.typ = HWALL;
                fakePools.push({ x, y });
            } else if (loc.typ === IRONBARS) {
                for (const dx of [-1, 1]) {
                    if (isok(x + dx, y)
                        && (map.at(x + dx, y)?.wall_info & W_NONDIGGABLE) !== 0) {
                        map.at(x + dx, y).wall_info &= ~W_NONDIGGABLE;
                        if (isok(x + 2 * dx, y))
                            map.at(x + 2 * dx, y).wall_info &= ~W_NONDIGGABLE;
                        break;
                    }
                }
            }
        }
    }
    wallification(Math.max(x1 - 2, 1), Math.max(y1 - 2, 0),
        Math.min(x2 + 2, COLNO - 1), Math.min(y2 + 2, ROWNO - 1));

    const [first, second] = fakePools;
    if (first) {
        const loc = map.at(first.x, first.y);
        const below = map.at(first.x, first.y + 1);
        if ((loc?.typ === TLWALL || loc?.typ === TRWALL) && below?.typ === TUWALL) {
            loc.typ = loc.typ === TLWALL ? BRCORNER : BLCORNER;
            below.typ = HWALL;
        }
    }
    if (second) {
        const loc = map.at(second.x, second.y);
        const above = map.at(second.x, second.y - 1);
        if ((loc?.typ === TLWALL || loc?.typ === TRWALL) && above?.typ === TDWALL) {
            loc.typ = loc.typ === TLWALL ? TRCORNER : TLCORNER;
            above.typ = HWALL;
        }
    }
}

function registerBaalzLregions(flp) {
    const bounds = get_level_extends();
    const minx = Math.max(1, bounds.xmin);
    const maxx = Math.min(COLNO - 1, bounds.xmax);
    const miny = Math.max(0, bounds.ymin);
    const maxy = Math.min(ROWNO - 1, bounds.ymax);
    const inarea = { x1: 1, y1: 0, x2: 15, y2: 20 };
    const exclude = { x1: 15, y1: 1, x2: 70, y2: 16 };
    const area = flipRectForBounds(inarea, flp, minx, miny, maxx, maxy);
    const delarea = flipRectForBounds(exclude, flp, minx, miny, maxx, maxy);
    game._special_lregions = [
        { rtype: LR_UPSTAIR, inarea: area, delarea },
        { rtype: LR_BRANCH, inarea: area, delarea },
        { rtype: LR_TELE, inarea: area, delarea },
    ];
}

function loadBaalzSpecial() {
    rn2(3); rn2(2); // nhlib shuffle()
    loadBaalzTerrain();
    asmoMazeWalk(0, 6, 'west', BAALZ_X, BAALZ_Y);
    placeSpecialStair(BAALZ_X + 44, BAALZ_Y + 6, false);
    baalzSetTerrain(0, 6, '+');
    set_door_mask(game.level.at(BAALZ_X, BAALZ_Y + 6), D_LOCKED);
    asmoCreateMonster('Baalzebub', 35, 6, BAALZ_MAP, BAALZ_X, BAALZ_Y);
    for (const ch of ['[', '[', ')', ')', '*', '!', '!', '?', '?', '?'])
        asmoObject(ch, BAALZ_MAP, BAALZ_X, BAALZ_Y);
    for (const kind of [SPIKED_PIT, FIRE_TRAP, SLP_GAS_TRAP, ANTI_MAGIC,
        FIRE_TRAP, MAGIC_TRAP, MAGIC_TRAP])
        asmoTrap(kind, null, null, BAALZ_MAP, BAALZ_X, BAALZ_Y);
    asmoCreateMonster('ghost', 37, 7, BAALZ_MAP, BAALZ_X, BAALZ_Y);
    asmoCreateMonster('horned devil', 32, 5, BAALZ_MAP, BAALZ_X, BAALZ_Y);
    asmoCreateMonster('barbed devil', 38, 7, BAALZ_MAP, BAALZ_X, BAALZ_Y);
    for (const id of ['L', 'V', 'V', 'V'])
        asmoCreateMonster(id, null, null, BAALZ_MAP, BAALZ_X, BAALZ_Y);
    wallification(1, 0, COLNO - 1, ROWNO - 1);
    const flp = flip_level_rnd(3);
    registerBaalzLregions(flp);
    fixup_special();
}

const ORCUS_X = 33;
const ORCUS_Y = 3;
const ORCUS_MAP = [
    '.|....|....|....|..............|....|........',
    '.|....|....|....|..............|....|........',
    '.|....|....|....|--...-+-------|.............',
    '.|....|....|....|..............+.............',
    '.|.........|....|..............|....|........',
    '.--+-...-+----+--....-------...--------.-+---',
    '.....................|.....|.................',
    '.....................|.....|.................',
    '.--+----....-+---....|.....|...----------+---',
    '.|....|....|....|....---+---...|......|......',
    '.|.........|....|..............|......|......',
    '.----...---------.....-----....+......|......',
    '.|........................|....|......|......',
    '.----------+-...--+--|....|....----------+---',
    '.|....|..............|....+....|.............',
    '.|....+.......|......|....|....|.............',
    '.|....|.......|......|....|....|.............',
];

function orcusX(x) { return ORCUS_X + x; }
function orcusY(y) { return ORCUS_Y + y; }

function loadOrcusTerrain() {
    game._special_touched = new Set();
    for (let x = 2; x <= COLNO - 2; x++) {
        for (let y = 0; y <= ROWNO - 2; y++) {
            const loc = game.level?.at(x, y);
            if (!loc) continue;
            loc.typ = (y < 2 || ((x % 2) && (y % 2))) ? STONE : HWALL;
            loc.lit = false;
        }
    }
    asmoLoadMap(ORCUS_MAP, ORCUS_X, ORCUS_Y);
    game.level.flags.is_maze_lev = true;
    game.level.flags.shortsighted = true;
}

function orcusSetDoor(x, y, mask) {
    const loc = game.level?.at(orcusX(x), orcusY(y));
    if (!loc) return;
    loc.typ = DOOR;
    set_door_mask(loc, mask);
}

function orcusCreateRoomRegion(x1, y1, x2, y2, lit, rtype, needfill) {
    for (let y = y1; y <= y2; y++) {
        for (let x = x1; x <= x2; x++) {
            const loc = game.level?.at(orcusX(x), orcusY(y));
            if (loc && (loc.typ === ROOM || loc.typ === CORR || loc.typ === DOOR || loc.typ === SDOOR))
                loc.lit = !!lit;
        }
    }
    const before = game.level?.nroom ?? 0;
    add_room(orcusX(x1), orcusY(y1), orcusX(x2), orcusY(y2), lit ? 1 : 0, rtype, true);
    const croom = game.level?.rooms?.[before];
    if (!croom) return null;
    croom.needjoining = true;
    croom.needfill = needfill;
    topologize(croom);
    for (let x = croom.lx - 1; x <= croom.hx + 1; x++) {
        for (let y = croom.ly - 1; y <= croom.hy + 1; y++) {
            const loc = game.level?.at(x, y);
            if (loc && (IS_DOOR(loc.typ) || loc.typ === SDOOR)) add_door(x, y, croom);
        }
    }
    return croom;
}

function orcusFixedObject(otyp, x, y) {
    mksobj_at(otyp, orcusX(x), orcusY(y), true, false);
}

function orcusRandomObject(otyp = null) {
    const loc = asmoDryLocation(ORCUS_MAP, ORCUS_X, ORCUS_Y);
    if (otyp == null) mkobj_at(RANDOM_CLASS, loc.x, loc.y, true);
    else mksobj_at(otyp, loc.x, loc.y, true, false);
}

function orcusCreateGenericMonster() {
    // C ref: sp_lev.c:create_monster() resolves AM_SPLEV_RANDOM before
    // get_location_coord(), even for bare des.monster() random monsters.
    induced_align_80();
    let loc = asmoMonsterLocation(null, ORCUS_MAP, ORCUS_X, ORCUS_Y);
    if (m_at(loc.x, loc.y)) {
        loc = enexto_core(loc.x, loc.y, null, GP_CHECKSCARY)
            || enexto_core(loc.x, loc.y, null, 0)
            || loc;
    }
    return makemon(null, loc.x, loc.y, 0);
}

function registerOrcusLregions(flp, bounds) {
    const inarea = { x1: 1, y1: 0, x2: 12, y2: 20 };
    const exclude = { x1: 20, y1: 1, x2: 70, y2: 20 };
    const area = flipRectForBounds(inarea, flp, bounds.minx, bounds.miny, bounds.maxx, bounds.maxy);
    const delarea = flipRectForBounds(exclude, flp, bounds.minx, bounds.miny, bounds.maxx, bounds.maxy);
    game._special_lregions = [
        { rtype: LR_UPSTAIR, inarea: area, delarea },
        { rtype: LR_BRANCH, inarea: area, delarea },
        { rtype: LR_TELE, inarea: area, delarea },
    ];
}

function hellTweaksOrcus() {
    const prior = game._hell_tweaks_protected_ok;
    game._hell_tweaks_protected_ok = (x, y) => {
        // C ref: dat/orcus.lua computes bounds2 from selection.match("-")
        // after LVLINIT_MAZEGRID and before des.map(); selection.bounds()
        // returns absolute coords, then selection.fillrect() treats them as
        // map-relative and adds gx.xstart (1) via get_location_coord().
        if (x < 3 || x > 77 || y < 3 || y > 19) return false;
        return !(x >= ORCUS_X && x < ORCUS_X + ORCUS_MAP[0].length
            && y >= ORCUS_Y && y < ORCUS_Y + ORCUS_MAP.length);
    };
    try {
        hellTweaksAsmodeus();
    } finally {
        game._hell_tweaks_protected_ok = prior;
    }
}

function loadOrcusSpecial() {
    // C ref: dat/orcus.lua loaded through sp_lev.c:lspo_map().
    rn2(3); rn2(2); // nhlib shuffle()
    loadOrcusTerrain();
    asmoMazeWalk(0, 6, 'west', ORCUS_X, ORCUS_Y);
    placeSpecialStair(orcusX(33), orcusY(15), false);

    for (const [x, y] of [
        [19, 2], [20, 2], [21, 2], [36, 2], [36, 3],
        [6, 4], [5, 5], [6, 5], [7, 5], [39, 5],
        [8, 8], [9, 8], [10, 8], [11, 8], [6, 10],
        [5, 11], [6, 11], [7, 11], [21, 11], [21, 12],
        [13, 13], [14, 13], [15, 13], [14, 14],
    ]) orcusFixedObject(BOULDER, x, y);

    for (const [x, y, mask] of [
        [23, 2, D_CLOSED], [31, 3, D_ISOPEN], [3, 5, D_NODOOR],
        [9, 5, D_CLOSED], [14, 5, D_CLOSED], [41, 5, D_CLOSED],
        [3, 8, D_ISOPEN], [13, 8, D_NODOOR], [41, 8, D_ISOPEN],
        [24, 9, D_CLOSED], [31, 11, D_CLOSED], [11, 13, D_ISOPEN],
        [18, 13, D_CLOSED], [41, 13, D_CLOSED], [26, 14, D_ISOPEN],
        [6, 15, D_CLOSED],
    ]) orcusSetDoor(x, y, mask);

    const altar = game.level?.at(orcusX(24), orcusY(7));
    if (altar) {
        altar.typ = ALTAR;
        altar.altarmask = A_NONE;
    }
    orcusCreateRoomRegion(22, 12, 25, 16, 0, MORGUE, FILL_NORMAL);
    orcusCreateRoomRegion(32, 9, 37, 12, 1, SHOPBASE, FILL_NORMAL);
    orcusCreateRoomRegion(12, 0, 15, 4, 1, SHOPBASE, FILL_NORMAL);

    for (const kind of [SPIKED_PIT, SLP_GAS_TRAP, ANTI_MAGIC, FIRE_TRAP,
        FIRE_TRAP, FIRE_TRAP, MAGIC_TRAP, MAGIC_TRAP])
        asmoTrap(kind, null, null, ORCUS_MAP, ORCUS_X, ORCUS_Y);
    for (let i = 0; i < 10; i++) orcusRandomObject();
    orcusRandomObject(rn2(2) === 1 ? MAGIC_MARKER : MAGIC_LAMP);

    for (const [id, x, y] of [
        ['Orcus', 33, 15],
        ['human zombie', 32, 15],
        ['shade', 32, 14],
        ['shade', 32, 16],
        ['vampire', 35, 16],
        ['vampire', 35, 14],
        ['vampire lord', 36, 14],
        ['vampire lord', 36, 15],
    ]) asmoCreateMonster(id, x, y, ORCUS_MAP, ORCUS_X, ORCUS_Y);
    for (const id of [
        'skeleton', 'skeleton', 'skeleton', 'skeleton', 'skeleton',
        'shade', 'shade', 'shade', 'shade',
        'giant zombie', 'giant zombie', 'giant zombie',
        'ettin zombie', 'ettin zombie', 'ettin zombie',
        'human zombie', 'human zombie', 'human zombie',
        'vampire', 'vampire', 'vampire',
        'vampire lord', 'vampire lord',
    ]) asmoCreateMonster(id, null, null, ORCUS_MAP, ORCUS_X, ORCUS_Y);
    for (let i = 0; i < 5; i++) orcusCreateGenericMonster();

    const ext = get_level_extends();
    const bounds = {
        minx: Math.max(1, ext.xmin),
        maxx: Math.min(COLNO - 1, ext.xmax),
        miny: Math.max(0, ext.ymin),
        maxy: Math.min(ROWNO - 1, ext.ymax),
    };
    hellTweaksOrcus();
    wallification(1, 0, COLNO - 1, ROWNO - 1);
    const flp = flip_level_rnd(3);
    registerOrcusLregions(flp, bounds);
    fixup_special();
}

// Bare des.map([[...]]) defaults to centered placement.
// C ref: sp_lev.c:lspo_map().
const WIZ_START_X = 3;
const WIZ_START_Y = 1;
const WIZ_START_MAP = [
    '............................................................................',
    '.....................C....CC.C........................C.....................',
    '..........CCC.....................CCC.......................................',
    '........CC........-----------.......C.C...C...C....C........................',
    '.......C.....---------------------...C..C..C..C.............................',
    '......C..C...------....\\....------....C.....C...............................',
    '........C...||....|.........|....||.........................................',
    '.......C....||....|.........+....||.........................................',
    '.......C...||---+--.........|....|||........................................',
    '......C....||...............|--S--||........................................',
    '...........||--+--|++----|---|..|.SS..........C......C......................',
    '........C..||.....|..|...|...|--|.||..CC..C.....C..........C................',
    '.......C...||.....|..|.--|.|.|....||.................C..C...................',
    '.....C......||....|..|.....|.|.--||..C..C..........C...........}}}..........',
    '......C.C...||....|..-----.|.....||...C.C.C..............C....}}}}}}........',
    '.........C...------........|------....C..C.....C..CC.C......}}}}}}}}}}}.....',
    '.........CC..---------------------...C.C..C.....CCCCC.C.......}}}}}}}}......',
    '.........C........-----------..........C.C.......CCC.........}}}}}}}}}......',
    '..........C.C.........................C............C...........}}}}}........',
    '......................CCC.C.................................................',
];

function wizStartX(x) { return WIZ_START_X + x; }
function wizStartY(y) { return WIZ_START_Y + y; }

function wizStartSetTerrain(x, y, ch) {
    const loc = game.level?.at(wizStartX(x), wizStartY(y));
    if (!loc) return;
    loc.lit = false;
    loc.horizontal = false;
    switch (ch) {
    case '.': loc.typ = ROOM; break;
    case 'C': loc.typ = CLOUD; break;
    case '}': loc.typ = MOAT; break;
    case '\\': loc.typ = THRONE; break;
    case '-': loc.typ = HWALL; break;
    case '|': loc.typ = VWALL; break;
    case '+':
        loc.typ = DOOR;
        set_door_mask(loc, D_CLOSED);
        break;
    case 'S':
        loc.typ = SDOOR;
        loc.horizontal = WIZ_START_MAP[y]?.[x - 1] === '-' || WIZ_START_MAP[y]?.[x + 1] === '-';
        set_door_mask(loc, D_SECRET);
        break;
    default:
        loc.typ = STONE;
        break;
    }
    game._special_touched = game._special_touched || new Set();
    game._special_touched.add(specialTouchedKey(wizStartX(x), wizStartY(y)));
}

function loadWizStartTerrain(litRandom) {
    game._special_touched = new Set();
    for (let x = 1; x < COLNO; x++) {
        for (let y = 0; y < ROWNO; y++) {
            const loc = game.level?.at(x, y);
            if (!loc) continue;
            loc.typ = STONE;
            loc.flags = 0;
            loc.doormask = 0;
            loc.lit = !!litRandom;
        }
    }
    for (let y = 0; y < WIZ_START_MAP.length; y++)
        for (let x = 0; x < WIZ_START_MAP[y].length; x++)
            wizStartSetTerrain(x, y, WIZ_START_MAP[y][x]);
    game.level.flags.is_maze_lev = true;
    game.level.flags.noteleport = true;
    game.level.flags.hardfloor = true;
}

function wizStartApplyReplaceTerrain(x1, y1, x2, y2, fromTyp, toTyp, chance) {
    // C ref: sp_lev.c:lspo_replace_terrain().
    for (let x = x1; x <= x2; x++) {
        for (let y = y1; y <= y2; y++) {
            const loc = game.level?.at(wizStartX(x), wizStartY(y));
            if (!loc || loc.typ !== fromTyp) continue;
            if (rn2(100) < chance) loc.typ = toTyp;
        }
    }
}

function wizStartApplyLit(x1, y1, x2, y2, lit) {
    for (let y = y1; y <= y2; y++)
        for (let x = x1; x <= x2; x++) {
            const loc = game.level?.at(wizStartX(x), wizStartY(y));
            if (loc) loc.lit = !!lit;
        }
}

function wizStartSetDoor(x, y, mask) {
    // C ref: sp_lev.c:sel_set_door().  Applying des.door() to an existing
    // map secret door updates its mask but leaves it as SDOOR.
    const loc = game.level?.at(wizStartX(x), wizStartY(y));
    if (!loc) return;
    let doorMask = mask;
    if (!IS_DOOR(loc.typ) && loc.typ !== SDOOR)
        loc.typ = (doorMask & D_SECRET) ? SDOOR : DOOR;
    if (doorMask & D_SECRET) {
        doorMask &= ~D_SECRET;
        if (doorMask < D_CLOSED) doorMask = D_CLOSED;
    }
    loc.horizontal = false;
    set_door_mask(loc, doorMask);
}

function wizStartDryLocation() {
    return specialRandomDryLocation(WIZ_START_MAP[0].length, WIZ_START_MAP.length,
        WIZ_START_X, WIZ_START_Y);
}

function wizStartInventoryObject(mon, otyp, spe) {
    const loc = wizStartDryLocation();
    const obj = mksobj_at(otyp, loc.x, loc.y, true, true);
    if (obj) {
        obj.spe = spe;
        game.level.objects = (game.level.objects || []).filter((o) => o !== obj);
        give_mon_obj(mon, obj);
    }
    return obj;
}

function wizStartMonsterClass(ch) {
    switch (ch) {
    case 'B': return 'S_BAT';
    case 'W': return 'S_WRAITH';
    case 'i': return 'S_IMP';
    default: return wizardMonsterClass(ch);
    }
}

function wizStartCreateMonster(id, x, y, peaceful = null) {
    const cls = String(id || '').length === 1 ? wizStartMonsterClass(id) : null;
    let ptr = cls ? null : monster_by_user_name(id);
    if (!cls && monster_name_needs_find_gender_roll(id, ptr)) rn2(2);
    induced_align_80();
    if (cls) ptr = mkclass_aligned(cls, G_NOGEN);
    const loc = { x: wizStartX(x), y: wizStartY(y) };
    if (m_at(loc.x, loc.y)) {
        const cc = enexto_core(loc.x, loc.y, ptr, GP_CHECKSCARY)
            || enexto_core(loc.x, loc.y, ptr, 0);
        if (cc) {
            loc.x = cc.x;
            loc.y = cc.y;
        }
    }
    const mon = apply_monster_name_gender(makemon(ptr, loc.x, loc.y, 0), id);
    if (mon && peaceful === 0) mon.mpeaceful = 0;
    return mon;
}

function wizStartTrap() {
    const loc = wizStartDryLocation();
    let kind;
    do { kind = traptype_rnd(); } while (kind === NO_TRAP);
    const trap = maketrap(loc.x, loc.y, kind);
    maybeTrapVictim(trap);
}

function registerWizStartLregions(flp, bounds) {
    const branch = flipRectForBounds({
        x1: wizStartX(63), y1: wizStartY(6),
        x2: wizStartX(63), y2: wizStartY(6),
    }, flp, bounds.minx, bounds.miny, bounds.maxx, bounds.maxy);
    game._special_lregions = [
        { rtype: LR_BRANCH, inarea: branch, delarea: { x1: -1, y1: -1, x2: -1, y2: -1 } },
    ];
}

function loadWizardStartSpecial() {
    // C ref: dat/Wiz-strt.lua loaded through sp_lev.c:lspo_map().
    rn2(3); rn2(2); // nhlib shuffle()
    const litRandom = rn2(2); // C ref: sp_lev.c:splev_initlev().
    loadWizStartTerrain(litRandom);
    wizStartApplyReplaceTerrain(0, 0, 75, 19, ROOM, CLOUD, 10);
    wizStartApplyReplaceTerrain(13, 5, 33, 15, CLOUD, ROOM, 100);

    wizStartApplyLit(0, 0, 75, 19, true);
    wizStartApplyLit(35, 0, 49, 3, false);
    wizStartApplyLit(43, 12, 49, 16, false);
    wizStartApplyLit(19, 11, 33, 15, false);
    wizStartApplyLit(30, 10, 31, 10, false);

    placeSpecialStair(wizStartX(30), wizStartY(10), false);
    wizStartSetTerrain(63, 6, '.');
    for (const [x, y, mask] of [
        [31, 9, D_CLOSED], [16, 8, D_CLOSED], [28, 7, D_CLOSED],
        [34, 10, D_LOCKED], [35, 10, D_LOCKED], [15, 10, D_CLOSED],
        [19, 10, D_LOCKED], [20, 10, D_LOCKED],
    ]) wizStartSetDoor(x, y, mask);

    const leader = wizStartCreateMonster('Neferet the Green', 23, 5);
    if (leader) leader.inventory = [];
    wizStartInventoryObject(leader, ELVEN_CLOAK, 5);
    wizStartInventoryObject(leader, QUARTERSTAFF, 5);
    mksobj_at(CHEST, wizStartX(24), wizStartY(5), true, false);

    for (const [id, x, y] of [
        ['apprentice', 30, 7], ['apprentice', 24, 6],
        ['apprentice', 15, 6], ['apprentice', 15, 12],
        ['apprentice', 26, 11], ['apprentice', 27, 11],
        ['apprentice', 19, 9], ['apprentice', 20, 9],
        ['giant eel', 62, 14], ['giant eel', 69, 15], ['giant eel', 67, 17],
    ]) wizStartCreateMonster(id, x, y);

    for (let i = 0; i < 6; i++) wizStartTrap();

    for (const [id, x, y] of [
        ['B', 60, 9], ['W', 60, 10], ['B', 60, 11], ['B', 60, 12],
        ['i', 60, 13], ['B', 61, 10], ['B', 61, 11], ['B', 61, 12],
        ['B', 35, 3], ['i', 35, 17], ['B', 36, 17], ['B', 34, 16],
        ['i', 34, 17], ['W', 67, 2], ['B', 10, 19],
    ]) wizStartCreateMonster(id, x, y, 0);

    const ext = get_level_extends();
    const bounds = {
        minx: Math.max(1, ext.xmin),
        maxx: Math.min(COLNO - 1, ext.xmax),
        miny: Math.max(0, ext.ymin),
        maxy: Math.min(ROWNO - 1, ext.ymax),
    };
    wallification(1, 0, COLNO - 1, ROWNO - 1);
    const flp = flip_level_rnd(3);
    registerWizStartLregions(flp, bounds);
    fixup_special();
}

const WIZARD1_X = 25;
const WIZARD1_Y = 5;
const WIZARD1_MAP = [
    '----------------------------x',
    '|.......|..|.........|.....|x',
    '|.......S..|.}}}}}}}.|.....|x',
    '|..--S--|..|.}}---}}.|---S-|x',
    '|..|....|..|.}--.--}.|..|..|x',
    '|..|....|..|.}|...|}.|..|..|x',
    '|..--------|.}--.--}.|..|..|x',
    '|..|.......|.}}---}}.|..|..|x',
    '|..S.......|.}}}}}}}.|..|..|x',
    '|..|.......|.........|..|..|x',
    '|..|.......|-----------S-S-|x',
    '|..|.......S...............|x',
    '----------------------------x',
];
const WIZARD2_MAP = [
    '----------------------------x',
    '|.....|.S....|.............|x',
    '|.....|.-------S--------S--|x',
    '|.....|.|.........|........|x',
    '|..-S--S|.........|........|x',
    '|..|....|.........|------S-|x',
    '|..|....|.........|.....|..|x',
    '|-S-----|.........|.....|..|x',
    '|.......|.........|S--S--..|x',
    '|.......|.........|.|......|x',
    '|-----S----S-------.|......|x',
    '|............|....S.|......|x',
    '----------------------------x',
];
const WIZARD3_MAP = [
    '----------------------------x',
    '|..|............S..........|x',
    '|..|..------------------S--|x',
    '|..|..|.........|..........|x',
    '|..S..|.}}}}}}}.|..........|x',
    '|..|..|.}}---}}.|-S--------|x',
    '|..|..|.}--.--}.|..|.......|x',
    '|..|..|.}|...|}.|..|.......|x',
    '|..---|.}--.--}.|..|.......|x',
    '|.....|.}}---}}.|..|.......|x',
    '|.....S.}}}}}}}.|..|.......|x',
    '|.....|.........|..|.......|x',
    '----------------------------x',
];

function wizardX(x) { return WIZARD1_X + x; }
function wizardY(y) { return WIZARD1_Y + y; }

function wizardSetTerrain(x, y, ch, mapRows = WIZARD1_MAP) {
    if (ch === 'x') return;
    const loc = game.level?.at(wizardX(x), wizardY(y));
    if (!loc) return;
    loc.lit = false;
    switch (ch) {
    case '.': loc.typ = ROOM; break;
    case '}': loc.typ = MOAT; break;
    case '-': loc.typ = HWALL; break;
    case '|': loc.typ = VWALL; break;
    case '+':
        loc.typ = DOOR;
        set_door_mask(loc, D_CLOSED);
        break;
    case 'S':
        loc.typ = SDOOR;
        loc.horizontal = mapRows[y]?.[x - 1] === '-' || mapRows[y]?.[x + 1] === '-';
        set_door_mask(loc, D_CLOSED);
        break;
    default:
        loc.typ = STONE;
        break;
    }
    game._special_touched = game._special_touched || new Set();
    game._special_touched.add(specialTouchedKey(wizardX(x), wizardY(y)));
}

function loadWizardMazegridTerrain(mapRows) {
    game._special_touched = new Set();
    for (let x = 2; x <= COLNO - 2; x++) {
        for (let y = 0; y <= ROWNO - 2; y++) {
            const loc = game.level?.at(x, y);
            if (!loc) continue;
            loc.typ = (y < 2 || ((x % 2) && (y % 2))) ? STONE : HWALL;
            loc.lit = false;
        }
    }
    for (let y = 0; y < mapRows.length; y++)
        for (let x = 0; x < mapRows[y].length; x++)
            wizardSetTerrain(x, y, mapRows[y][x], mapRows);
    game.level.flags.is_maze_lev = true;
    game.level.flags.noteleport = true;
    game.level.flags.hardfloor = true;
}

function createWizardRoomRegion(x1, y1, x2, y2, lit, rtype, needfill, arrival = false) {
    for (let y = y1; y <= y2; y++)
        for (let x = x1; x <= x2; x++) {
            const loc = game.level?.at(wizardX(x), wizardY(y));
            if (loc && (loc.typ === ROOM || loc.typ === CORR || loc.typ === DOOR || loc.typ === SDOOR))
                loc.lit = !!lit;
        }
    const before = game.level?.nroom ?? 0;
    add_room(wizardX(x1), wizardY(y1), wizardX(x2), wizardY(y2), lit ? 1 : 0, rtype, true);
    const croom = game.level?.rooms?.[before];
    if (!croom) return null;
    croom.needjoining = true;
    croom.needfill = needfill;
    croom.arrival = !!arrival;
    topologize(croom);
    return croom;
}

function wizardCreateDoor(croom, wall) {
    // C ref: sp_lev.c:create_door(), for des.door({ state="secret", wall=... }).
    for (let trycnt = 0; trycnt < 100; trycnt++) {
        let x = 0, y = 0;
        switch (rn2(4)) {
        case 0:
            if (wall !== 'random' && wall !== 'north') continue;
            y = croom.ly - 1;
            x = croom.lx + rn2(1 + croom.hx - croom.lx);
            if (!isok(x, y - 1) || IS_OBSTRUCTED(game.level?.at(x, y - 1)?.typ)) continue;
            break;
        case 1:
            if (wall !== 'random' && wall !== 'south') continue;
            y = croom.hy + 1;
            x = croom.lx + rn2(1 + croom.hx - croom.lx);
            if (!isok(x, y + 1) || IS_OBSTRUCTED(game.level?.at(x, y + 1)?.typ)) continue;
            break;
        case 2:
            if (wall !== 'random' && wall !== 'west') continue;
            x = croom.lx - 1;
            y = croom.ly + rn2(1 + croom.hy - croom.ly);
            if (!isok(x - 1, y) || IS_OBSTRUCTED(game.level?.at(x - 1, y)?.typ)) continue;
            break;
        case 3:
            if (wall !== 'random' && wall !== 'east') continue;
            x = croom.hx + 1;
            y = croom.ly + rn2(1 + croom.hy - croom.ly);
            if (!isok(x + 1, y) || IS_OBSTRUCTED(game.level?.at(x + 1, y)?.typ)) continue;
            break;
        default:
            break;
        }
        if (!okdoor(x, y)) continue;
        const loc = game.level?.at(x, y);
        if (!loc) return;
        loc.typ = SDOOR;
        loc.doormask = D_SECRET;
        add_door(x, y, croom);
        return;
    }
}

function wizardDryLocation(mapRows = WIZARD1_MAP) {
    return specialRandomDryLocation(mapRows[0].length, mapRows.length, WIZARD1_X, WIZARD1_Y);
}

function wizardMonsterLocation(ptr, mapRows = WIZARD1_MAP) {
    let x = WIZARD1_X, y = WIZARD1_Y;
    let trycnt = 0;
    do {
        x = WIZARD1_X + rn2(mapRows[0].length);
        y = WIZARD1_Y + rn2(mapRows.length);
        if (specialMonsterLocationOk(x, y, ptr)) return { x, y };
    } while (++trycnt < 100);
    return wizardDryLocation(mapRows);
}

function wizardMonsterClass(ch) {
    if (ch === '&') return 'S_DEMON';
    return castleMonsterClass(ch);
}

function wizardCreateMonster(id, x = null, y = null, mmflags = 0, mapRows = WIZARD1_MAP) {
    const cls = String(id || '').length === 1 ? wizardMonsterClass(id) : null;
    let ptr = cls ? null : monster_by_user_name(id);
    if (!cls && monster_name_needs_find_gender_roll(id, ptr)) rn2(2);
    induced_align_80();
    if (cls) ptr = mkclass_aligned(cls, G_NOGEN);
    const loc = x == null ? wizardMonsterLocation(ptr, mapRows) : { x: wizardX(x), y: wizardY(y) };
    if (m_at(loc.x, loc.y)) {
        const cc = enexto_core(loc.x, loc.y, ptr, GP_CHECKSCARY)
            || enexto_core(loc.x, loc.y, ptr, 0);
        if (cc) {
            loc.x = cc.x;
            loc.y = cc.y;
        }
    }
    return apply_monster_name_gender(makemon(ptr, loc.x, loc.y, mmflags), id);
}

function wizardTrap(kind, x = null, y = null, mapRows = WIZARD1_MAP) {
    const loc = x == null ? asmoTrapLocation(mapRows, WIZARD1_X, WIZARD1_Y)
        : { x: wizardX(x), y: wizardY(y) };
    const trap = maketrap(loc.x, loc.y, kind);
    maybeTrapVictim(trap);
}

function wizardObject(ref, x = null, y = null, mapRows = WIZARD1_MAP) {
    const loc = x == null ? wizardDryLocation(mapRows) : { x: wizardX(x), y: wizardY(y) };
    const cls = {
        ')': WEAPON_CLASS,
        '(': TOOL_CLASS,
        '"': AMULET_CLASS,
        '!': POTION_CLASS,
        '?': SCROLL_CLASS,
        '+': SPBOOK_CLASS,
    }[ref] || null;
    if (cls != null) return mkobj_at(cls, loc.x, loc.y, true);
    const otyp = String(ref || '').toLowerCase() === 'book of the dead' ? SPE_BOOK_OF_THE_DEAD
        : String(ref || '').toLowerCase() === 'ruby' ? RUBY
        : null;
    if (otyp != null) return mksobj_at(otyp, loc.x, loc.y, true, false);
    return mkobj_at(RANDOM_CLASS, loc.x, loc.y, true);
}

function registerWizardMapLregions(mapRows, flp, bounds) {
    const inarea = { x1: 1, y1: 0, x2: 79, y2: 20 };
    const exclude = { x1: WIZARD1_X, y1: WIZARD1_Y,
        x2: WIZARD1_X + mapRows[0].length - 1, y2: WIZARD1_Y + mapRows.length - 1 };
    const teleExclude = { x1: WIZARD1_X, y1: WIZARD1_Y,
        x2: WIZARD1_X + mapRows[0].length - 2, y2: WIZARD1_Y + mapRows.length - 1 };
    game._special_lregions = [
        { rtype: LR_UPSTAIR, inarea: flipRectForBounds(inarea, flp, bounds.minx, bounds.miny, bounds.maxx, bounds.maxy),
          delarea: flipRectForBounds(exclude, flp, bounds.minx, bounds.miny, bounds.maxx, bounds.maxy) },
        { rtype: LR_DOWNSTAIR, inarea: flipRectForBounds(inarea, flp, bounds.minx, bounds.miny, bounds.maxx, bounds.maxy),
          delarea: flipRectForBounds(exclude, flp, bounds.minx, bounds.miny, bounds.maxx, bounds.maxy) },
        { rtype: LR_BRANCH, inarea: flipRectForBounds(inarea, flp, bounds.minx, bounds.miny, bounds.maxx, bounds.maxy),
          delarea: flipRectForBounds(exclude, flp, bounds.minx, bounds.miny, bounds.maxx, bounds.maxy) },
        { rtype: LR_TELE, inarea: flipRectForBounds(inarea, flp, bounds.minx, bounds.miny, bounds.maxx, bounds.maxy),
          delarea: flipRectForBounds(teleExclude, flp, bounds.minx, bounds.miny, bounds.maxx, bounds.maxy) },
    ];
}

function hellTweaksWizardMap(mapRows) {
    const prior = game._hell_tweaks_protected_ok;
    game._hell_tweaks_protected_ok = (x, y) => {
        if (x < 3 || x > 77 || y < 3 || y > 19) return false;
        return !(x >= WIZARD1_X && x < WIZARD1_X + mapRows[0].length
            && y >= WIZARD1_Y && y < WIZARD1_Y + mapRows.length
            && mapRows[y - WIZARD1_Y]?.[x - WIZARD1_X] !== 'x');
    };
    try {
        hellTweaksAsmodeus();
    } finally {
        game._hell_tweaks_protected_ok = prior;
    }
}

function loadWizard1Special() {
    // C ref: dat/wizard1.lua loaded through sp_lev.c:lspo_map().
    rn2(3); rn2(2); // nhlib shuffle()
    loadWizardMazegridTerrain(WIZARD1_MAP);

    const morgue = createWizardRoomRegion(12, 1, 20, 9, 0, MORGUE, FILL_LVFLAGS);
    if (morgue) {
        const wall = ['south', 'west', 'east'][rn2(3)];
        wizardCreateDoor(morgue, wall);
    }
    createWizardRoomRegion(1, 1, 10, 11, 0, OROOM, FILL_NONE, true);
    asmoMazeWalk(28, 5, 'east', WIZARD1_X, WIZARD1_Y);
    placeSpecialLadder(wizardX(6), wizardY(5), false);

    wizardCreateMonster('Wizard of Yendor', 16, 5, MM_ASLEEP);
    wizardCreateMonster('hell hound', 15, 5);
    wizardCreateMonster('vampire lord', 17, 5);
    wizardObject('Book of the Dead', 16, 5);
    for (const [id, x, y] of [
        ['kraken', 14, 2], ['giant eel', 17, 2], ['kraken', 13, 4],
        ['giant eel', 13, 6], ['kraken', 19, 4], ['giant eel', 19, 6],
        ['kraken', 15, 8], ['giant eel', 17, 8], ['piranha', 15, 2],
        ['piranha', 19, 8],
    ]) wizardCreateMonster(id, x, y);
    for (const id of ['D', 'H', '&', '&', '&', '&']) wizardCreateMonster(id);
    for (const [x, y] of [[16, 4], [16, 6], [15, 5], [17, 5]])
        wizardTrap(SQKY_BOARD, x, y);
    for (const kind of [SPIKED_PIT, SLP_GAS_TRAP, ANTI_MAGIC, MAGIC_TRAP])
        wizardTrap(kind);
    for (const ref of ['ruby', '!', '!', '?', '?', '+', '+', '+'])
        wizardObject(ref);

    const ext = get_level_extends();
    const bounds = {
        minx: Math.max(1, ext.xmin),
        maxx: Math.min(COLNO - 1, ext.xmax),
        miny: Math.max(0, ext.ymin),
        maxy: Math.min(ROWNO - 1, ext.ymax),
    };
    hellTweaksWizardMap(WIZARD1_MAP);
    wallification(1, 0, COLNO - 1, ROWNO - 1);
    const flp = flip_level_rnd(3);
    registerWizardMapLregions(WIZARD1_MAP, flp, bounds);
    fixup_special();
}

function wizardSetDoor(x, y, mask) {
    const loc = game.level?.at(wizardX(x), wizardY(y));
    if (!loc) return;
    loc.typ = DOOR;
    set_door_mask(loc, mask);
}

function loadWizard2Special() {
    // C ref: dat/wizard2.lua loaded through sp_lev.c:lspo_map().
    rn2(3); rn2(2); // nhlib shuffle()
    loadWizardMazegridTerrain(WIZARD2_MAP);

    createWizardRoomRegion(1, 1, 26, 11, 0, OROOM, FILL_NONE, true);
    createWizardRoomRegion(9, 3, 17, 9, 0, ZOO, FILL_NORMAL);
    wizardSetDoor(15, 2, D_CLOSED);
    wizardSetDoor(11, 10, D_CLOSED);
    asmoMazeWalk(28, 5, 'east', WIZARD1_X, WIZARD1_Y);
    placeSpecialLadder(wizardX(12), wizardY(1), true);
    placeSpecialLadder(wizardX(14), wizardY(11), false);

    for (const kind of [SPIKED_PIT, SLP_GAS_TRAP, ANTI_MAGIC, MAGIC_TRAP])
        wizardTrap(kind, null, null, WIZARD2_MAP);
    for (const ref of ['!', '!', '?', '?', '+'])
        wizardObject(ref, null, null, WIZARD2_MAP);
    wizardObject('"', 4, 6, WIZARD2_MAP);

    const ext = get_level_extends();
    const bounds = {
        minx: Math.max(1, ext.xmin),
        maxx: Math.min(COLNO - 1, ext.xmax),
        miny: Math.max(0, ext.ymin),
        maxy: Math.min(ROWNO - 1, ext.ymax),
    };
    hellTweaksWizardMap(WIZARD2_MAP);
    wallification(1, 0, COLNO - 1, ROWNO - 1);
    const flp = flip_level_rnd(3);
    registerWizardMapLregions(WIZARD2_MAP, flp, bounds);
    fixup_special();
}

function loadWizard3Special() {
    // C ref: dat/wizard3.lua loaded through sp_lev.c:lspo_map().
    rn2(3); rn2(2); // nhlib shuffle()
    loadWizardMazegridTerrain(WIZARD3_MAP);

    asmoMazeWalk(28, 9, 'east', WIZARD1_X, WIZARD1_Y);
    createWizardRoomRegion(7, 3, 15, 11, 0, MORGUE, FILL_LVFLAGS);
    createWizardRoomRegion(17, 6, 18, 11, 0, BEEHIVE, FILL_NORMAL);
    const entry = createWizardRoomRegion(20, 6, 26, 11, 0, OROOM, FILL_NONE, true);
    if (entry) {
        const wall = rn2(100) < 50 ? 'west' : 'north';
        wizardCreateDoor(entry, wall);
    }
    wizardSetDoor(18, 5, D_CLOSED);
    placeSpecialLadder(wizardX(11), wizardY(7), true);

    wizardCreateMonster('L', 10, 7, 0, WIZARD3_MAP);
    wizardCreateMonster('vampire lord', 12, 7, 0, WIZARD3_MAP);
    for (const [id, x, y] of [
        ['kraken', 8, 5], ['giant eel', 8, 8],
        ['kraken', 14, 5], ['giant eel', 14, 8],
    ]) wizardCreateMonster(id, x, y, 0, WIZARD3_MAP);
    wizardCreateMonster('L', null, null, 0, WIZARD3_MAP);
    wizardCreateMonster('D', null, null, 0, WIZARD3_MAP);
    wizardCreateMonster('D', 26, 9, 0, WIZARD3_MAP);
    for (const id of ['&', '&', '&']) wizardCreateMonster(id, null, null, 0, WIZARD3_MAP);
    for (const [x, y] of [[10, 7], [12, 7], [11, 6], [11, 8]])
        wizardTrap(SQKY_BOARD, x, y, WIZARD3_MAP);
    for (const ref of [')', '!', '?', '?', '(']) wizardObject(ref, null, null, WIZARD3_MAP);
    wizardObject('"', 11, 7, WIZARD3_MAP);

    const ext = get_level_extends();
    const bounds = {
        minx: Math.max(1, ext.xmin),
        maxx: Math.min(COLNO - 1, ext.xmax),
        miny: Math.max(0, ext.ymin),
        maxy: Math.min(ROWNO - 1, ext.ymax),
    };
    hellTweaksWizardMap(WIZARD3_MAP);
    wallification(1, 0, COLNO - 1, ROWNO - 1);
    const flp = flip_level_rnd(3);
    registerWizardMapLregions(WIZARD3_MAP, flp, bounds);
    fixup_special();
}

const WIZ_LOCA_X = 3;
const WIZ_LOCA_Y = 0;
const WIZ_LOCA_MAP = [
    '.............        .......................................................',
    '..............       .............}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}.......',
    '..............      ..............}.................................}.......',
    '..............      ..............}.-------------------------------.}.......',
    '...............     .........C....}.|.............................|.}.......',
    '...............    ..........C....}.|.---------------------------.|.}.......',
    '...............    .........CCC...}.|.|.........................|.|.}.......',
    '................   ....C....CCC...}.|.|.-----------------------.|.|.}.......',
    '.......C..C.....  .....C....CCC...}.|.|.|......+.......+......|.|.|.}.......',
    '.............C..CC.....C....CCC...}.|.|.|......|-------|......|.|.|.}.......',
    '................   ....C....CCC...}.|.|.|......|.......|......|.|.|.}.......',
    '......C..C.....    ....C....CCC...}.|.|.|......|-------|......|.|.|.}.......',
    '............C..     ...C....CCC...}.|.|.|......+.......+......|.|.|.}.......',
    '........C......    ....C....CCC...}.|.|.-----------------------.|.|.}.......',
    '....C......C...     ........CCC...}.|.|.........................|.|.}.......',
    '......C..C....      .........C....}.|.---------------------------.|.}.......',
    '..............      .........C....}.|.............................|.}.......',
    '.............       ..............}.-------------------------------.}.......',
    '.............        .............}.................................}.......',
    '.............        .............}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}.......',
    '.............        .......................................................',
];

function wizLocaX(x) { return WIZ_LOCA_X + x; }
function wizLocaY(y) { return WIZ_LOCA_Y + y; }

function wizLocaSetTerrain(x, y, ch) {
    const loc = game.level?.at(wizLocaX(x), wizLocaY(y));
    if (!loc) return;
    loc.lit = false;
    loc.horizontal = false;
    switch (ch) {
    case '.': loc.typ = ROOM; break;
    case 'C': loc.typ = CLOUD; break;
    case '}': loc.typ = MOAT; break;
    case '-': loc.typ = HWALL; break;
    case '|': loc.typ = VWALL; break;
    case '+':
        loc.typ = DOOR;
        set_door_mask(loc, D_CLOSED);
        break;
    default:
        loc.typ = STONE;
        break;
    }
}

function loadWizLocaTerrain(litRandom) {
    for (let x = 1; x < COLNO; x++) {
        for (let y = 0; y < ROWNO; y++) {
            const loc = game.level?.at(x, y);
            if (!loc) continue;
            loc.typ = STONE;
            loc.flags = 0;
            loc.doormask = 0;
            loc.lit = !!litRandom;
        }
    }
    for (let y = 0; y < WIZ_LOCA_MAP.length; y++)
        for (let x = 0; x < WIZ_LOCA_MAP[y].length; x++)
            wizLocaSetTerrain(x, y, WIZ_LOCA_MAP[y][x]);
    game.level.flags.is_maze_lev = true;
    game.level.flags.hardfloor = true;
}

function wizLocaApplyReplaceTerrain(x1, y1, x2, y2, fromTyp, toTyp, chance) {
    // C ref: sp_lev.c:lspo_replace_terrain().
    for (let x = x1; x <= x2; x++) {
        for (let y = y1; y <= y2; y++) {
            const loc = game.level?.at(wizLocaX(x), wizLocaY(y));
            if (!loc || loc.typ !== fromTyp) continue;
            if (rn2(100) < chance) loc.typ = toTyp;
        }
    }
}

function wizLocaApplyLit(x1, y1, x2, y2, lit) {
    for (let x = x1; x <= x2; x++)
        for (let y = y1; y <= y2; y++) {
            const loc = game.level?.at(wizLocaX(x), wizLocaY(y));
            if (loc) loc.lit = !!lit;
        }
}

function createWizLocaRoomRegion(x1, y1, x2, y2, lit, rtype, needfill) {
    for (let y = y1; y <= y2; y++)
        for (let x = x1; x <= x2; x++) {
            const loc = game.level?.at(wizLocaX(x), wizLocaY(y));
            if (loc && (loc.typ === ROOM || loc.typ === CORR || loc.typ === DOOR || loc.typ === SDOOR))
                loc.lit = !!lit;
        }
    const before = game.level?.nroom ?? 0;
    add_room(wizLocaX(x1), wizLocaY(y1), wizLocaX(x2), wizLocaY(y2), lit ? 1 : 0, rtype, true);
    const croom = game.level?.rooms?.[before];
    if (!croom) return null;
    croom.needjoining = true;
    croom.needfill = needfill;
    topologize(croom);
    return croom;
}

function wizLocaSetDoor(x, y, mask) {
    const loc = game.level?.at(wizLocaX(x), wizLocaY(y));
    if (!loc) return;
    loc.typ = DOOR;
    set_door_mask(loc, mask);
}

function wizLocaDryLocation() {
    return specialRandomDryLocation(WIZ_LOCA_MAP[0].length, WIZ_LOCA_MAP.length,
        WIZ_LOCA_X, WIZ_LOCA_Y);
}

function wizLocaTrapLocation() {
    let loc = wizLocaDryLocation();
    let trycnt = 0;
    while ((game.level?.at(loc.x, loc.y)?.typ === STAIRS
            || game.level?.at(loc.x, loc.y)?.typ === LADDER)
           && ++trycnt <= 100) {
        loc = wizLocaDryLocation();
    }
    return loc;
}

function wizLocaObject() {
    const loc = wizLocaDryLocation();
    return mkobj_at(RANDOM_CLASS, loc.x, loc.y, true);
}

function wizLocaTrap(kind, x = null, y = null) {
    const loc = x == null ? wizLocaTrapLocation() : { x: wizLocaX(x), y: wizLocaY(y) };
    const trap = maketrap(loc.x, loc.y, kind);
    maybeTrapVictim(trap);
}

function wizLocaMonsterClass(ch) {
    switch (ch) {
    case 'B': return 'S_BAT';
    case 'i': return 'S_IMP';
    default: return wizardMonsterClass(ch);
    }
}

function wizLocaMonsterLocation(ptr) {
    let x = WIZ_LOCA_X, y = WIZ_LOCA_Y;
    let trycnt = 0;
    do {
        x = WIZ_LOCA_X + rn2(WIZ_LOCA_MAP[0].length);
        y = WIZ_LOCA_Y + rn2(WIZ_LOCA_MAP.length);
        if (specialMonsterLocationOk(x, y, ptr)) return { x, y };
    } while (++trycnt < 100);
    return wizLocaDryLocation();
}

function wizLocaCreateMonster(id, mmflags = 0, opts = {}) {
    const cls = String(id || '').length === 1 ? wizLocaMonsterClass(id) : null;
    let ptr = cls ? null : monster_by_user_name(id);
    if (!cls && monster_name_needs_find_gender_roll(id, ptr)) rn2(2);
    induced_align_80();
    if (cls) ptr = mkclass_aligned(cls, G_NOGEN);
    const loc = wizLocaMonsterLocation(ptr);
    const mon = apply_monster_name_gender(makemon(ptr, loc.x, loc.y, mmflags), id);
    if (mon && typeof opts.peaceful === 'boolean') {
        // C ref: sp_lev.c:create_monster() applies Lua peaceful=0/1 after
        // makemon(), so peace_minded() RNG has already happened.
        mon.mpeaceful = opts.peaceful ? 1 : 0;
    }
    return mon;
}

function wizardQuestFillerProto() {
    if (game.urole?.name?.m !== 'Wizard') return null;
    const uz = game.u?.uz;
    if (!uz || uz.dnum !== game.quest_dnum) return null;
    if (currentSpecialLevel()) return null;
    if (uz.dlevel === 2) return 'Wiz-fila';
    if (uz.dlevel === 4 || uz.dlevel === 5) return 'Wiz-filb';
    return null;
}

function createWizardFillerMonster(croom, id, opts = {}) {
    const cls = String(id || '').length === 1 ? wizLocaMonsterClass(id) : null;
    let ptr = cls ? null : monster_by_user_name(id);
    if (!cls && monster_name_needs_find_gender_roll(id, ptr)) rn2(2);
    induced_align_80();
    if (cls) ptr = mkclass_aligned(cls, G_NOGEN);
    const loc = specialRoomLocation(croom);
    const mon = apply_monster_name_gender(makemon(ptr, loc.x, loc.y, 0), id);
    if (mon && typeof opts.peaceful === 'boolean') {
        // C ref: sp_lev.c:create_monster(); Lua peaceful=0 overrides after
        // makemon() has already run peace_minded().
        mon.mpeaceful = opts.peaceful ? 1 : 0;
    }
    return mon;
}

function loadWizardFillerSpecial(proto) {
    // C ref: dat/Wiz-fila.lua and dat/Wiz-filb.lua.
    l_nhcore_init();
    game.level.flags.is_maze_lev = false;
    game.level.flags.hardfloor = false;

    let room = buildSpecialRoom({});
    if (room) {
        createSpecialStair(room, true);
        createSpecialRandomObject(room);
        createWizardFillerMonster(room, proto === 'Wiz-filb' ? 'X' : 'i', { peaceful: false });
    }

    room = buildSpecialRoom({});
    if (room) {
        createSpecialRandomObject(room);
        createSpecialRandomObject(room);
        createWizardFillerMonster(room, 'i', { peaceful: false });
    }

    room = buildSpecialRoom({});
    if (room) {
        createSpecialRandomObject(room);
        createSpecialTrap(room);
        createSpecialRandomObject(room);
        if (proto === 'Wiz-filb') {
            createWizardFillerMonster(room, 'X', { peaceful: false });
        } else {
            createWizardFillerMonster(room, 'vampire bat');
            createWizardFillerMonster(room, 'vampire bat');
        }
    }

    room = buildSpecialRoom({});
    if (room) {
        createSpecialStair(room, false);
        createSpecialRandomObject(room);
        createSpecialTrap(room);
        createWizardFillerMonster(room, 'i', { peaceful: false });
        createWizardFillerMonster(room, 'vampire bat');
    }

    room = buildSpecialRoom({});
    if (room) {
        createSpecialRandomObject(room);
        createSpecialRandomObject(room);
        createSpecialTrap(room);
        createWizardFillerMonster(room, 'i', { peaceful: false });
    }

    room = buildSpecialRoom({});
    if (room) {
        createSpecialRandomObject(room);
        createSpecialTrap(room);
        createWizardFillerMonster(room, 'vampire bat');
    }

    makecorridors();
    wallification(1, 0, COLNO - 1, ROWNO - 1);
    flip_level_rnd(3);
}

function loadWizardLocateSpecial() {
    // C ref: dat/Wiz-loca.lua loaded through sp_lev.c:lspo_map().
    rn2(3); rn2(2); // nhlib shuffle()
    const litRandom = rn2(2); // C ref: sp_lev.c:splev_initlev().
    loadWizLocaTerrain(litRandom);

    wizLocaApplyReplaceTerrain(0, 0, 30, 20, ROOM, CLOUD, 15);
    wizLocaApplyReplaceTerrain(68, 0, 75, 20, ROOM, MOAT, 25);
    wizLocaApplyReplaceTerrain(34, 1, 68, 19, MOAT, ROOM, 2);

    wizLocaApplyLit(0, 0, 75, 20, true);
    const outer = createWizLocaRoomRegion(37, 4, 65, 16, 0, OROOM, FILL_NONE);
    if (outer) wizardCreateDoor(outer, 'random');
    const middle = createWizLocaRoomRegion(39, 6, 63, 14, 0, OROOM, FILL_NONE);
    if (middle) wizardCreateDoor(middle, 'random');
    const left = createWizLocaRoomRegion(41, 8, 46, 12, 1, OROOM, FILL_NONE);
    if (left) wizardCreateDoor(left, ['north', 'south', 'west'][rn2(3)]);
    const right = createWizLocaRoomRegion(56, 8, 61, 12, 1, OROOM, FILL_NONE);
    if (right) wizardCreateDoor(right, ['north', 'south', 'east'][rn2(3)]);
    wizLocaApplyLit(48, 8, 54, 8, false);
    wizLocaApplyLit(48, 12, 54, 12, false);
    const center = createWizLocaRoomRegion(48, 10, 54, 10, 0, OROOM, FILL_NONE);
    if (center) wizardCreateDoor(center, 'random');

    for (const [x, y, mask] of [
        [55, 8, D_LOCKED], [55, 12, D_LOCKED], [47, 8, D_LOCKED],
        [47, 12, D_LOCKED],
    ]) wizLocaSetDoor(x, y, mask);

    wizLocaSetTerrain(3, 17, '.');
    placeSpecialStair(wizLocaX(3), wizLocaY(17), true);
    placeSpecialStair(wizLocaX(48), wizLocaY(10), false);

    for (let x = 0; x <= 75; x++)
        for (let y = 0; y <= 20; y++) {
            const loc = game.level?.at(wizLocaX(x), wizLocaY(y));
            if (loc && IS_WALL(loc.typ)) loc.wall_info |= W_NONDIGGABLE;
        }

    for (let i = 0; i < 15; i++) wizLocaObject();
    for (const [kind, x, y] of [
        [SPIKED_PIT, 24, 2], [SPIKED_PIT, 7, 10], [SPIKED_PIT, 23, 5],
        [SPIKED_PIT, 26, 19], [SPIKED_PIT, 72, 2], [SPIKED_PIT, 72, 12],
        [ROCKTRAP, 45, 16], [ROCKTRAP, 65, 13], [ROCKTRAP, 55, 6],
        [ROCKTRAP, 39, 11], [ROCKTRAP, 57, 9],
    ]) wizLocaTrap(kind, x, y);
    for (const kind of [MAGIC_TRAP, STATUE_TRAP, STATUE_TRAP, POLY_TRAP,
        ANTI_MAGIC, SLP_GAS_TRAP, SLP_GAS_TRAP, DART_TRAP, DART_TRAP, DART_TRAP]) {
        if (kind === ANTI_MAGIC) wizLocaTrap(kind, 53, 10);
        else wizLocaTrap(kind);
    }

    for (let i = 0; i < 12; i++) wizLocaCreateMonster('B', 0, { peaceful: false });
    for (let i = 0; i < 7; i++) wizLocaCreateMonster('i', 0, { peaceful: false });
    for (let i = 0; i < 7; i++) wizLocaCreateMonster('vampire bat');
    wizLocaCreateMonster('i', 0, { peaceful: false });

    wallification(1, 0, COLNO - 1, ROWNO - 1);
    flip_level_rnd(3);
}

function makemaz_special(slev) {
    const proto = slev?.proto || '';
    if (proto && slev?.rndlevs) {
        game._last_special_protofile = `${proto}-${rnd(slev.rndlevs)}`;
    } else {
        game._last_special_protofile = proto;
    }
    if (game._last_special_protofile === 'bigrm-12') {
        loadBigrm12Special();
        // C ref: sp_lev.c:lspo_final_map_cleanup() runs final
        // wallification() after the Lua script's des.wallify() pass and
        // before the post-load flip gate.
        wallification(1, 0, COLNO - 1, ROWNO - 1);
        flip_level_rnd(2); // des.level_flags("noflipy") leaves horizontal flipping enabled.
        return;
    }
    if (game._last_special_protofile === 'bigrm-2') {
        loadBigrm2Special();
        wallification(1, 0, COLNO - 1, ROWNO - 1);
        rememberWallsInRect(BIGRM_2_XSTART, BIGRM_2_YSTART,
            BIGRM_2_XSTART + BIGRM_2_MAP[0].length - 1,
            BIGRM_2_YSTART + BIGRM_2_MAP.length - 1);
        return;
    }
    if (game._last_special_protofile === 'bigrm-4') {
        loadBigrm4Special();
        wallification(1, 0, COLNO - 1, ROWNO - 1);
        lightWallsAdjacentToLitCells(BIGRM_4_XSTART, BIGRM_4_YSTART,
            BIGRM_4_XSTART + BIGRM_4_MAP[0].length - 1,
            BIGRM_4_YSTART + BIGRM_4_MAP.length - 1);
        return;
    }
    if (loadSokoSpecial(game._last_special_protofile)) {
        return;
    }
    if (game._last_special_protofile === 'minetn-5') {
        loadMinetown5Special();
        return;
    }
    if (game._last_special_protofile === 'minend-2') {
        loadMinend2Special();
        return;
    }
    if (game._last_special_protofile === 'oracle') {
        loadOracleSpecial();
        return;
    }
    if (game._last_special_protofile === 'castle') {
        loadCastleSpecial();
        return;
    }
    if (game._last_special_protofile === 'valley') {
        loadValleySpecial();
        return;
    }
    if (game._last_special_protofile === 'sanctum') {
        loadSanctumSpecial();
        return;
    }
    if (game._last_special_protofile === 'asmodeus') {
        loadAsmodeusSpecial();
        return;
    }
    if (game._last_special_protofile === 'juiblex') {
        loadJuiblexSpecial();
        return;
    }
    if (game._last_special_protofile === 'baalz') {
        loadBaalzSpecial();
        return;
    }
    if (game._last_special_protofile === 'orcus') {
        loadOrcusSpecial();
        return;
    }
    if (game._last_special_protofile === 'x-strt' && game.urole?.name?.m === 'Wizard') {
        loadWizardStartSpecial();
        return;
    }
    if (game._last_special_protofile === 'x-loca' && game.urole?.name?.m === 'Wizard') {
        loadWizardLocateSpecial();
        return;
    }
    if (game._last_special_protofile === 'wizard1') {
        loadWizard1Special();
        return;
    }
    if (game._last_special_protofile === 'wizard2') {
        loadWizard2Special();
        return;
    }
    if (game._last_special_protofile === 'wizard3') {
        loadWizard3Special();
        return;
    }
    if (game._last_special_protofile === 'tower1') {
        loadTower1Special();
        return;
    }
    if (game._last_special_protofile === 'tower2') {
        loadTower2Special();
        return;
    }
    if (game._last_special_protofile === 'tower3') {
        loadTower3Special();
        return;
    }
    if (game._last_special_protofile === 'medusa-3') {
        loadMedusa3Special();
        return;
    }
    game.level.flags.is_maze_lev = true;
}

// C ref: allmain.c l_nhcore_init()
export function l_nhcore_init() {
    const align = [0, 0, 0]; // A_LAWFUL, A_NEUTRAL, A_CHAOTIC
    for (let i = align.length; i > 1; i--) {
        const j = rn2(i);
        [align[i - 1], align[j]] = [align[j], align[i - 1]];
    }
    game.splev_align = align;
}

// C ref: mklev.c mklev()
export async function mklev() {
    const g = game;
    if (getbones()) return;
    g.in_mklev = true;
    clearSpecialLregions();
    await makelevel();
    const slev = currentSpecialLevel();
    const loadedSpecial = !!(slev?.proto && slev.proto !== 'rogue');
    if (loadedSpecial) link_doors_rooms();
    if (loadedSpecial && (game._last_special_protofile === 'castle'
        || game._last_special_protofile === 'valley'
        || game._last_special_protofile === 'sanctum'
        || game._last_special_protofile === 'orcus'
        || game._last_special_protofile === 'minetn-5'
        || game._last_special_protofile === 'wizard1'
        || game._last_special_protofile === 'wizard2'
        || game._last_special_protofile === 'wizard3')) {
        for (let i = 0; i < (g.level?.nroom ?? 0); i++) {
            fill_special_room(g.level.rooms[i]);
        }
    }
    recount_level_features();
    level_finalize_topology();
    g.in_mklev = false;
}

function currentSpecialLevel() {
    const uz = game.u?.uz || { dnum: 0, dlevel: 1 };
    return game.specialLevels?.find((lev) =>
        lev?.dlevel?.dnum === uz.dnum && lev?.dlevel?.dlevel === uz.dlevel) || null;
}

function recount_level_features() {
    const lvl = game.level;
    if (!lvl?.flags) return;
    let nfountains = 0, nsinks = 0;
    for (let y = 0; y < ROWNO; y++)
        for (let x = 1; x < COLNO; x++) {
            const typ = lvl.at(x, y)?.typ;
            if (typ === FOUNTAIN) nfountains++;
            if (typ === SINK) nsinks++;
        }
    lvl.flags.nfountains = nfountains;
    lvl.flags.nsinks = nsinks;
}

// C ref: mklev.c clear_level_structures()
function clear_level_structures() {
    const g = game;
    g.fmon = null;
    g.level = new GameMap();
    g.level.nroom = 0;
    g.level.rooms = [];
    g.made_branch = false;
    g.smeq = new Array(MAXNROFROOMS + 1).fill(0);
    g.level.doorindex = 0;
    g.level.doors = [];
    g.stairs = null;
    g.vault_x = -1;
    const lf = g.level.flags;
    lf.nfountains = 0;
    lf.nsinks = 0;
    lf.has_shop = false;
    lf.has_vault = false;
    lf.has_zoo = false;
    lf.has_court = false;
    lf.has_morgue = false;
    lf.graveyard = false;
    lf.has_beehive = false;
    lf.has_barracks = false;
    lf.has_temple = false;
    lf.has_swamp = false;
    lf.noteleport = false;
    lf.hardfloor = false;
    lf.nommap = false;
    lf.hero_memory = true;
    lf.shortsighted = false;
    lf.sokoban_rules = false;
    lf.red_walls = false;
    lf.is_maze_lev = false;
    lf.is_cavernous_lev = false;
    lf.arboreal = false;
    lf.has_town = false;
    lf.wizard_bones = false;
    lf.corrmaze = false;
    lf.temperature = Inhell() ? 1 : 0;
    lf.rndmongen = true;
    lf.deathdrops = true;
    lf.noautosearch = false;
    lf.fumaroles = false;
    lf.stormy = false;
    lf.stasis_until = 0;
    init_rect();
}

// C ref: mkmap.c litstate_rnd()
function litstate_rnd(litstate) {
    if (litstate < 0) {
        const d = depth_of_level(game.u?.uz);
        return (rnd(1 + Math.abs(d)) < 11 && rn2(77)) ? true : false;
    }
    return !!litstate;
}

// C ref: mklev.c makelevel()
async function makelevel() {
    const g = game;
    oinit();
    clear_level_structures();

    const slev = currentSpecialLevel();
    if (slev?.proto && slev.proto !== 'rogue') {
        makemaz_special(slev);
        return;
    }
    const questFiller = wizardQuestFillerProto();
    if (questFiller) {
        game._last_special_protofile = questFiller;
        loadWizardFillerSpecial(questFiller);
        return;
    }
    // C ref: mklev.c:1295 — check for below-Medusa maze level
    // This rn2(5) is consumed even when the condition fails (short-circuit)
    const medusa = g.medusa_level;
    if (rn2(5) && g.u?.uz?.dnum === medusa?.dnum
        && (g.u?.uz?.dlevel ?? 1) > (medusa?.dlevel ?? 999)) {
        // Would generate maze — not applicable for contest level 1
    }

    const rogueLevel = rogue_level_active(slev);

    // Regular level generation
    // C ref: mklev.c:382-388 — load themerms.lua for themed rooms
    // nhlib.lua shuffle when loading themerms.lua (first level of branch)
    const dnum = g.u?.uz?.dnum ?? 0;
    if (!rogueLevel && !g._luathemes_loaded) g._luathemes_loaded = {};
    if (!rogueLevel && !g._luathemes_loaded[dnum]) {
        const themedAlign = ['law', 'neutral', 'chaos'];
        for (let i = themedAlign.length; i > 1; i--) {
            const j = rn2(i);
            [themedAlign[i - 1], themedAlign[j]] = [themedAlign[j], themedAlign[i - 1]];
        }
        g._luathemes_loaded[dnum] = true;
    }

    if (rogueLevel) {
        makeroguerooms();
        makerogueghost();
    } else {
        await makerooms();
    }

    if (g.level.nroom <= 0) return;
    sort_rooms();
    await generate_stairs();

    // Branch check
    const branchp = is_branchlev();
    let room_threshold = branchp ? 4 : 3;

    if (!rogueLevel) {
        makecorridors();
        await make_niches();

        // Vault creation (simplified for contest)
        if (g.vault_x !== -1) {
            const vw = { v: 1 }, vh = { v: 1 };
            const vx = { v: g.vault_x }, vy = { v: g.vault_y };
            if (check_room(vx, vw, vy, vh, true)) {
                add_room(vx.v, vy.v, vx.v + vw.v, vy.v + vh.v, true, VAULT, false);
                g.level.flags.has_vault = true;
                room_threshold++;
                const vaultRoom = g.level.rooms[g.level.nroom - 1];
                if (vaultRoom) vaultRoom.needfill = FILL_NORMAL;
                fill_special_room(vaultRoom);
                if (!is_branchlev()) rn2(3);
                if (!rn2(3)) await makeniche(TELEP_TRAP);
            } else if (rnd_rect() && create_vault()) {
                g.vault_x = g.level.rooms[g.level.nroom]?.lx ?? -1;
                g.vault_y = g.level.rooms[g.level.nroom]?.ly ?? -1;
                const fw = { v: 1 }, fh = { v: 1 };
                const fx = { v: g.vault_x }, fy = { v: g.vault_y };
                if (check_room(fx, fw, fy, fh, true)) {
                    add_room(fx.v, fy.v, fx.v + fw.v, fy.v + fh.v, true, VAULT, false);
                    g.level.flags.has_vault = true;
                    room_threshold++;
                    const vaultRoom = g.level.rooms[g.level.nroom - 1];
                    if (vaultRoom) vaultRoom.needfill = FILL_NORMAL;
                    fill_special_room(vaultRoom);
                    if (!is_branchlev()) rn2(3);
                    if (!rn2(3)) await makeniche(TELEP_TRAP);
                } else if (g.level.rooms[g.level.nroom]) {
                    g.level.rooms[g.level.nroom].hx = -1;
                }
            }
        }

        const u_depth = depth_of_level(g.u?.uz);
        const medusaDepth = g.medusa_level ? depth_of_level(g.medusa_level) : 999;
        if (u_depth > 1 && u_depth < medusaDepth
            && g.level.nroom >= room_threshold && rn2(u_depth) < 3) {
            do_mkroom(SHOPBASE);
        } else if (u_depth > 4 && !rn2(6)) {
            do_mkroom(COURT);
        } else if (u_depth > 5 && !rn2(8)) {
            do_mkroom(LEPREHALL);
        } else if (u_depth > 6 && !rn2(7)) {
            do_mkroom(ZOO);
        }
    }

    // Place dungeon branch
    if (branchp) {
        const prevstairs = g.stairs;
        place_branch(branchp);
        if ((g.u?.uz?.dnum ?? 0) === 0 && (g.u?.uz?.dlevel ?? 1) === 1
            && g.stairs !== prevstairs) {
            g.stairs.u_traversed = true;
        }
    }

    // Fill rooms
    const fillable_rooms = g.level.rooms.filter(r => 
        (r.rtype === OROOM || r.rtype === THEMEROOM) && r.needfill === FILL_NORMAL);
    let bonus_item_room_idx = fillable_rooms.length ? rn2(fillable_rooms.length) : -1;

    for (let i = 0; i < g.level.nroom; i++) {
        const croom = g.level.rooms[i];
        const is_fillable = (croom.rtype === OROOM || croom.rtype === THEMEROOM) && croom.needfill === FILL_NORMAL;
        await fill_ordinary_room(croom, is_fillable && bonus_item_room_idx === 0);
        if (is_fillable) bonus_item_room_idx--;
    }
    for (let i = 0; i < g.level.nroom; i++) {
        fill_special_room(g.level.rooms[i]);
    }
}

// C ref: mklev.c makerooms()
async function makerooms() {
    const g = game;
    let tried_vault = false;
    const difficulty = depth_of_level(g.u?.uz);
    let themeroom_tries = 0;

    while (g.level.nroom < (MAXNROFROOMS - 1) && rnd_rect()) {
        if (g.level.nroom >= Math.trunc(MAXNROFROOMS / 6) && rn2(2) && !tried_vault) {
            tried_vault = true;
            if (create_vault()) {
                g.vault_x = g.level.rooms[g.level.nroom]?.lx ?? -1;
                g.vault_y = g.level.rooms[g.level.nroom]?.ly ?? -1;
                if (g.level.rooms[g.level.nroom]) g.level.rooms[g.level.nroom].hx = -1;
            }
        } else {
            // Themed room selection (reservoir sampling)
            g.in_mk_themerooms = true;
            let generated = false;
            try {
                generated = await themerooms_generate(difficulty);
            } finally {
                g.in_mk_themerooms = false;
            }
            if (!generated) {
                if (themeroom_tries++ > 10
                    || g.level.nroom >= Math.trunc(MAXNROFROOMS / 6))
                    break;
            }
        }
    }
}

const XL_UP = 1;
const XL_DOWN = 2;
const XL_LEFT = 4;
const XL_RIGHT = 8;

function rogue_level_active(slev = currentSpecialLevel()) {
    return Is_rogue_level(game.u?.uz) || slev?.proto === 'rogue';
}

// C ref: extralev.c:corr()
function rogue_corr_tile(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return;
    loc.typ = rn2(50) ? CORR : SCORR;
}

// C ref: extralev.c:roguejoin()
function roguejoin(x1, y1, x2, y2, horiz) {
    if (horiz) {
        const middle = x1 + rn2(x2 - x1 + 1);
        for (let x = Math.min(x1, middle); x <= Math.max(x1, middle); x++)
            rogue_corr_tile(x, y1);
        for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++)
            rogue_corr_tile(middle, y);
        for (let x = Math.min(middle, x2); x <= Math.max(middle, x2); x++)
            rogue_corr_tile(x, y2);
    } else {
        const middle = y1 + rn2(y2 - y1 + 1);
        for (let y = Math.min(y1, middle); y <= Math.max(y1, middle); y++)
            rogue_corr_tile(x1, y);
        for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++)
            rogue_corr_tile(x, middle);
        for (let y = Math.min(middle, y2); y <= Math.max(middle, y2); y++)
            rogue_corr_tile(x2, y);
    }
}

// C ref: extralev.c:roguecorr()
function roguecorr(rooms, x, y, dir) {
    let fromx, fromy, tox, toy;
    if (dir === XL_DOWN) {
        rooms[y][x].doortable &= ~XL_DOWN;
        if (!rooms[y][x].real) {
            fromx = rooms[y][x].rlx + 1 + 26 * x;
            fromy = rooms[y][x].rly + 7 * y;
        } else {
            fromx = rooms[y][x].rlx + rn2(rooms[y][x].dx) + 1 + 26 * x;
            fromy = rooms[y][x].rly + rooms[y][x].dy + 7 * y;
            dodoor(fromx, fromy, game.level.rooms[rooms[y][x].nroom]);
            set_door_mask(game.level.at(fromx, fromy), D_NODOOR);
            fromy++;
        }
        if (y >= 2) return;
        y++;
        rooms[y][x].doortable &= ~XL_UP;
        if (!rooms[y][x].real) {
            tox = rooms[y][x].rlx + 1 + 26 * x;
            toy = rooms[y][x].rly + 7 * y;
        } else {
            tox = rooms[y][x].rlx + rn2(rooms[y][x].dx) + 1 + 26 * x;
            toy = rooms[y][x].rly - 1 + 7 * y;
            dodoor(tox, toy, game.level.rooms[rooms[y][x].nroom]);
            set_door_mask(game.level.at(tox, toy), D_NODOOR);
            toy--;
        }
        roguejoin(fromx, fromy, tox, toy, false);
    } else if (dir === XL_RIGHT) {
        rooms[y][x].doortable &= ~XL_RIGHT;
        if (!rooms[y][x].real) {
            fromx = rooms[y][x].rlx + 1 + 26 * x;
            fromy = rooms[y][x].rly + 7 * y;
        } else {
            fromx = rooms[y][x].rlx + rooms[y][x].dx + 1 + 26 * x;
            fromy = rooms[y][x].rly + rn2(rooms[y][x].dy) + 7 * y;
            dodoor(fromx, fromy, game.level.rooms[rooms[y][x].nroom]);
            set_door_mask(game.level.at(fromx, fromy), D_NODOOR);
            fromx++;
        }
        if (x >= 2) return;
        x++;
        rooms[y][x].doortable &= ~XL_LEFT;
        if (!rooms[y][x].real) {
            tox = rooms[y][x].rlx + 1 + 26 * x;
            toy = rooms[y][x].rly + 7 * y;
        } else {
            tox = rooms[y][x].rlx - 1 + 1 + 26 * x;
            toy = rooms[y][x].rly + rn2(rooms[y][x].dy) + 7 * y;
            dodoor(tox, toy, game.level.rooms[rooms[y][x].nroom]);
            set_door_mask(game.level.at(tox, toy), D_NODOOR);
            tox--;
        }
        roguejoin(fromx, fromy, tox, toy, true);
    }
}

// C ref: extralev.c:miniwalk()
function miniwalk(rooms, x, y) {
    for (;;) {
        const here = rooms[y][x];
        const dirs = [];
        if (x > 0 && !(here.doortable & XL_LEFT)
            && (!rooms[y][x - 1].doortable || !rn2(10)))
            dirs.push(0);
        if (x < 2 && !(here.doortable & XL_RIGHT)
            && (!rooms[y][x + 1].doortable || !rn2(10)))
            dirs.push(1);
        if (y > 0 && !(here.doortable & XL_UP)
            && (!rooms[y - 1][x].doortable || !rn2(10)))
            dirs.push(2);
        if (y < 2 && !(here.doortable & XL_DOWN)
            && (!rooms[y + 1][x].doortable || !rn2(10)))
            dirs.push(3);
        if (!dirs.length) return;
        switch (dirs[rn2(dirs.length)]) {
        case 0:
            here.doortable |= XL_LEFT;
            x--;
            rooms[y][x].doortable |= XL_RIGHT;
            break;
        case 1:
            here.doortable |= XL_RIGHT;
            x++;
            rooms[y][x].doortable |= XL_LEFT;
            break;
        case 2:
            here.doortable |= XL_UP;
            y--;
            rooms[y][x].doortable |= XL_DOWN;
            break;
        case 3:
            here.doortable |= XL_DOWN;
            y++;
            rooms[y][x].doortable |= XL_UP;
            break;
        default:
            return;
        }
        miniwalk(rooms, x, y);
    }
}

// C ref: extralev.c:makeroguerooms()
function makeroguerooms() {
    const g = game;
    let nroom = 0;
    const rooms = Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => ({})));
    for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 3; x++) {
            const here = rooms[y][x];
            if (!rn2(5) && (nroom || (x < 2 && y < 2))) {
                here.real = false;
                here.rlx = rn1(22, 2);
                here.rly = rn1((y === 2) ? 4 : 3, 2);
            } else {
                here.real = true;
                here.dx = rn1(22, 2);
                here.dy = rn1((y === 2) ? 4 : 3, 2);
                here.rlx = rnd(23 - here.dx + 1);
                here.rly = rnd(((y === 2) ? 5 : 4) - here.dy + 1);
                nroom++;
            }
            here.doortable = 0;
        }
    }
    miniwalk(rooms, rn2(3), rn2(3));
    g.level.nroom = 0;
    for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 3; x++) {
            const here = rooms[y][x];
            if (!here.real) continue;
            here.nroom = g.level.nroom;
            g.smeq[g.level.nroom] = g.level.nroom;
            const lowx = 1 + 26 * x + here.rlx;
            const lowy = 7 * y + here.rly;
            const hix = lowx + here.dx - 1;
            const hiy = lowy + here.dy - 1;
            add_room(lowx, lowy, hix, hiy, !rn2(7), OROOM, false);
        }
    }
    for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 3; x++) {
            const here = rooms[y][x];
            if (here.doortable & XL_DOWN) roguecorr(rooms, x, y, XL_DOWN);
            if (here.doortable & XL_RIGHT) roguecorr(rooms, x, y, XL_RIGHT);
        }
    }
}

// C ref: extralev.c:makerogueghost()
function makerogueghost() {
    const g = game;
    if (!g.level.nroom) return;
    const croom = g.level.rooms[rn2(g.level.nroom)];
    const x = somex(croom);
    const y = somey(croom);
    const ghost = makemon(monsterPtr('GHOST'), x, y, 0);
    if (!ghost) return;
    ghost.msleeping = 1;
    ghost.mgivenname = roguename();
    let ghostobj;
    if (rn2(4)) {
        ghostobj = mksobj_at(FOOD_RATION, x, y, false, false);
        if (ghostobj) {
            ghostobj.quan = rnd(7);
            ghostobj.owt = weight(ghostobj);
        }
    }
    if (rn2(2)) {
        ghostobj = mksobj_at(MACE, x, y, false, false);
        if (ghostobj) ghostobj.spe = rnd(3);
        if (rn2(4)) curse(ghostobj);
    } else {
        ghostobj = mksobj_at(TWO_HANDED_SWORD, x, y, false, false);
        if (ghostobj) ghostobj.spe = rnd(5) - 2;
        if (rn2(4)) curse(ghostobj);
    }
    ghostobj = mksobj_at(BOW, x, y, false, false);
    if (ghostobj) ghostobj.spe = 1;
    if (rn2(4)) curse(ghostobj);
    ghostobj = mksobj_at(ARROW, x, y, false, false);
    if (ghostobj) {
        ghostobj.spe = 0;
        ghostobj.quan = rn1(10, 25);
        ghostobj.owt = weight(ghostobj);
    }
    if (rn2(4)) curse(ghostobj);
    if (rn2(2)) {
        ghostobj = mksobj_at(RING_MAIL, x, y, false, false);
        if (ghostobj) ghostobj.spe = rn2(3);
        if (!rn2(3) && ghostobj) ghostobj.oerodeproof = true;
        if (rn2(4)) curse(ghostobj);
    } else {
        ghostobj = mksobj_at(PLATE_MAIL, x, y, false, false);
        if (ghostobj) ghostobj.spe = rnd(5) - 2;
        if (!rn2(3) && ghostobj) ghostobj.oerodeproof = true;
        if (rn2(4)) curse(ghostobj);
    }
    if (rn2(2)) {
        ghostobj = mksobj_at(FAKE_AMULET_OF_YENDOR, x, y, true, false);
        if (ghostobj) ghostobj.known = true;
    }
}

// Themed room metadata — must match C's themerms.lua frequency table exactly.
// Generated from themeroom_meta.js (31 rooms).
const THEMEROOM_META = [
    { name: 'default', frequency: 1000 },
    { name: 'Fake Delphi', frequency: 1 },
    { name: 'Room in a room', frequency: 1 },
    { name: 'Huge room with another room inside', frequency: 1 },
    { name: 'Nesting rooms', frequency: 1 },
    { name: 'Default room with themed fill', frequency: 6 },
    { name: 'Unlit room with themed fill', frequency: 2 },
    { name: 'Room with both normal contents and themed fill', frequency: 2 },
    { name: 'Pillars', frequency: 1 },
    { name: 'Mausoleum', frequency: 1 },
    { name: 'Random dungeon feature', frequency: 1 },
    { name: 'L-shaped', frequency: 1 },
    { name: 'L-shaped, rot 1', frequency: 1 },
    { name: 'L-shaped, rot 2', frequency: 1 },
    { name: 'L-shaped, rot 3', frequency: 1 },
    { name: 'Blocked center', frequency: 1 },
    { name: 'Circular, small', frequency: 1 },
    { name: 'Circular, medium', frequency: 1 },
    { name: 'Circular, big', frequency: 1 },
    { name: 'T-shaped', frequency: 1 },
    { name: 'T-shaped, rot 1', frequency: 1 },
    { name: 'T-shaped, rot 2', frequency: 1 },
    { name: 'T-shaped, rot 3', frequency: 1 },
    { name: 'S-shaped', frequency: 1 },
    { name: 'S-shaped, rot 1', frequency: 1 },
    { name: 'Z-shaped', frequency: 1 },
    { name: 'Z-shaped, rot 1', frequency: 1 },
    { name: 'Cross', frequency: 1 },
    { name: 'Four-leaf clover', frequency: 1 },
    { name: 'Water-surrounded vault', frequency: 1 },
    { name: 'Twin businesses', frequency: 1, mindiff: 4 },
];

const THEMED_MAPS = new Map([
    ['L-shaped', {
        filler: [1, 1],
        map: [
            '-----xxx',
            '|...|xxx',
            '|...|xxx',
            '|...----',
            '|......|',
            '|......|',
            '|......|',
            '--------',
        ],
    }],
    ['L-shaped, rot 1', {
        filler: [5, 1],
        map: [
            'xxx-----',
            'xxx|...|',
            'xxx|...|',
            '----...|',
            '|......|',
            '|......|',
            '|......|',
            '--------',
        ],
    }],
    ['L-shaped, rot 2', {
        filler: [1, 1],
        map: [
            '--------',
            '|......|',
            '|......|',
            '|......|',
            '----...|',
            'xxx|...|',
            'xxx|...|',
            'xxx-----',
        ],
    }],
    ['L-shaped, rot 3', {
        filler: [1, 1],
        map: [
            '--------',
            '|......|',
            '|......|',
            '|......|',
            '|...----',
            '|...|xxx',
            '|...|xxx',
            '-----xxx',
        ],
    }],
    ['Circular, medium', {
        filler: [4, 4],
        map: [
            'xx-----xx',
            'x--...--x',
            '--.....--',
            '|.......|',
            '|.......|',
            '|.......|',
            '--.....--',
            'x--...--x',
            'xx-----xx',
        ],
    }],
    ['S-shaped', {
        filler: [2, 2],
        map: [
            '-----xxx',
            '|...|xxx',
            '|...|xxx',
            '|...----',
            '|......|',
            '|......|',
            '|......|',
            '----...|',
            'xxx|...|',
            'xxx|...|',
            'xxx-----',
        ],
    }],
    ['S-shaped, rot 1', {
        filler: [5, 5],
        map: [
            'xxx--------',
            'xxx|......|',
            'xxx|......|',
            '----......|',
            '|......----',
            '|......|xxx',
            '|......|xxx',
            '--------xxx',
        ],
    }],
    ['Z-shaped', {
        filler: [5, 5],
        map: [
            'xxx-----',
            'xxx|...|',
            'xxx|...|',
            '----...|',
            '|......|',
            '|......|',
            '|......|',
            '|...----',
            '|...|xxx',
            '|...|xxx',
            '-----xxx',
        ],
    }],
    ['Z-shaped, rot 1', {
        filler: [2, 2],
        map: [
            '--------xxx',
            '|......|xxx',
            '|......|xxx',
            '|......----',
            '----......|',
            'xxx|......|',
            'xxx|......|',
            'xxx--------',
        ],
    }],
    ['Cross', {
        filler: [6, 6],
        map: [
            'xxx-----xxx',
            'xxx|...|xxx',
            'xxx|...|xxx',
            '----...----',
            '|.........|',
            '|.........|',
            '|.........|',
            '----...----',
            'xxx|...|xxx',
            'xxx|...|xxx',
            'xxx-----xxx',
        ],
    }],
    ['Four-leaf clover', {
        filler: [6, 6],
        map: [
            '-----x-----',
            '|...|x|...|',
            '|...---...|',
            '|.........|',
            '---.....---',
            'xx|.....|xx',
            '---.....---',
            '|.........|',
            '|...---...|',
            '|...|x|...|',
            '-----x-----',
        ],
    }],
]);

function is_themeroom_eligible(room, difficulty) {
    if (room.mindiff != null && difficulty < room.mindiff) return false;
    if (room.maxdiff != null && difficulty > room.maxdiff) return false;
    return true;
}

// C ref: themerms.lua themerooms_generate()
// Reservoir sampling picks one themed room. For seed8000 level 1,
// 'ordinary' always wins (frequency 1000 vs others ~1-10).
async function themerooms_generate(difficulty) {
    let pick = null;
    let total_frequency = 0;
    for (const meta of THEMEROOM_META) {
        if (!is_themeroom_eligible(meta, difficulty)) continue;
        const this_frequency = meta.frequency || 1;
        total_frequency += this_frequency;
        if (this_frequency > 0 && rn2(total_frequency) < this_frequency) {
            pick = meta;
        }
    }
    if (!pick) return false;
    const themedMap = THEMED_MAPS.get(pick.name);
    if (themedMap) return create_themed_map_room(themedMap);
    const wantsThemedFill = pick.name === 'Default room with themed fill'
        || pick.name === 'Unlit room with themed fill'
        || pick.name === 'Room with both normal contents and themed fill';
    const normalAndThemedFill = pick.name === 'Room with both normal contents and themed fill';
    // For 'ordinary' rooms, create a standard room
    // For themed rooms with dynamic dimensions, consume those rn2 calls first
    const chance = 100;
    if (pick.name !== 'ordinary') {
        // Themed room — not expected for seed8000, but handle RNG correctly
        rn2(100); // chance check (build_room)
    }
    // All themed rooms go through create_room for placement
    const ok = create_room(-1, -1, -1, -1, -1, -1,
        wantsThemedFill ? THEMEROOM : OROOM,
        pick.name === 'Unlit room with themed fill' ? 0 : -1);
    if (ok) {
        // C ref: sp_lev.c:2824 — build_room calls topologize after create_room
        const aroom = game.level.rooms[game.level.nroom - 1];
        if (aroom) {
            topologize(aroom);
            aroom.needfill = (!wantsThemedFill || normalAndThemedFill) ? FILL_NORMAL : FILL_NONE;
            if (wantsThemedFill) apply_themeroom_fill(aroom);
        }
    }
    return ok;
}

function themed_map_typ(ch) {
    switch (ch) {
    case '-': return HWALL;
    case '|': return VWALL;
    case '.': return ROOM;
    default: return STONE;
    }
}

function themed_map_origin_ok(rows, width, height, xstart, ystart) {
    const xmax = Math.min(COLNO, xstart + width);
    const ymax = Math.min(ROWNO, ystart + height);
    for (let y = ystart - 1; y < ymax + 1; y++) {
        for (let x = xstart - 1; x < xmax + 1; x++) {
            if (!isok(x, y)) return false;
            const loc = game.level.at(x, y);
            if (y < ystart || y >= ystart + height || x < xstart || x >= xstart + width) {
                if (loc.typ !== STONE || loc.roomno !== 0) return false;
                continue;
            }
            const ch = rows[y - ystart]?.[x - xstart] || 'x';
            const typ = themed_map_typ(ch);
            if (((loc.typ !== STONE && loc.typ !== typ) || loc.roomno !== 0)) return false;
        }
    }
    return true;
}

function lua_shuffle(values) {
    for (let i = values.length; i > 1; i--) {
        const j = rn2(i);
        [values[i - 1], values[j]] = [values[j], values[i - 1]];
    }
}

function choose_themeroom_fill(croom) {
    const diff = level_difficulty();
    const fills = [
        { name: 'Ice room' },
        { name: 'Cloud room' },
        { name: 'Boulder room', eligible: () => diff >= 4 },
        { name: 'Spider nest' },
        { name: 'Trap room' },
        { name: 'Garden', eligible: () => !!croom.rlit },
        { name: 'Buried treasure' },
        { name: 'Buried zombies' },
        { name: 'Massacre' },
        { name: 'Statuary' },
        { name: 'Light source', eligible: () => !croom.rlit },
        { name: 'Temple of the gods' },
        { name: 'Ghost of an Adventurer' },
        { name: 'Storeroom' },
        { name: 'Teleportation hub' },
    ];
    let pick = null;
    let total = 0;
    for (const fill of fills) {
        if (fill.eligible && !fill.eligible()) continue;
        const frequency = fill.frequency ?? 1;
        total += frequency;
        if (frequency > 0 && rn2(total) < frequency) pick = fill;
    }
    return pick?.name || null;
}

function apply_themeroom_fill(croom) {
    const fill = choose_themeroom_fill(croom);
    if (fill === 'Storeroom') {
        const locs = [];
        for (let y = croom.ly; y <= croom.hy; y++)
            for (let x = croom.lx; x <= croom.hx; x++)
                if (rn2(100) < 30) locs.push([x, y]);
        for (const _loc of locs) {
            if (rn2(100) < 25) {
                mksobj_at(CHEST, somex(croom), somey(croom), true, false);
            } else {
                rn2(3); // C ref: dungeon.c:induced_align() before mkclass().
                const ptr = mkclass_aligned('S_MIMIC', 0);
                if (ptr) {
                    const mx = somex(croom);
                    const my = somey(croom);
                    makemon(ptr, mx, my, 0);
                    const mon = game.level?.monsters?.find(m => m.mx === mx && m.my === my);
                    if (mon) {
                        mon.m_ap_type = M_AP_OBJECT;
                        mon.mappearance = CHEST;
                    }
                }
            }
        }
        return;
    }
    if (fill !== 'Buried zombies') return;

    const diff = level_difficulty();
    const zombifiable = ['kobold', 'gnome', 'orc', 'dwarf'];
    if (diff > 3) zombifiable.push('elf', 'human');
    if (diff > 6) zombifiable.push('ettin', 'giant');

    const count = Math.trunc(((croom.hx - croom.lx + 1) * (croom.hy - croom.ly + 1)) / 2);
    for (let i = 0; i < count; i++) {
        lua_shuffle(zombifiable);
        const x = somex(croom);
        const y = somey(croom);
        mkcorpstat(CORPSE, null, zombifiable[0], x, y, 8);
    }
}

function create_themed_map_room(spec) {
    const rows = spec.map;
    const height = rows.length;
    const width = Math.max(...rows.map(row => row.length));
    let xstart = 0;
    let ystart = 0;
    let ok = false;
    for (let tryct = 0; tryct <= 100; tryct++) {
        xstart = 1 + rn2(COLNO - 1 - width);
        ystart = rn2(ROWNO - height);
        if (themed_map_origin_ok(rows, width, height, xstart, ystart)) {
            ok = true;
            break;
        }
    }
    if (!ok) return false;

    // C ref: themerms.lua:filler_region() after mapped themed rooms.
    const themedFill = rn2(100) < 30;
    const lit = litstate_rnd(-1);

    for (let y = 0; y < height; y++) {
        const row = rows[y];
        for (let x = 0; x < width; x++) {
            const ch = row[x] || 'x';
            const typ = themed_map_typ(ch);
            const loc = game.level.at(xstart + x, ystart + y);
            if (!loc) continue;
            loc.typ = typ;
            loc.lit = lit;
            loc.horizontal = ch === '-';
            if (typ !== STONE) loc.edge = typ !== ROOM;
        }
    }

    const seedX = xstart + spec.filler[0];
    const seedY = ystart + spec.filler[1];
    const seedLoc = game.level.at(seedX, seedY);
    if (!seedLoc || seedLoc.typ === STONE) return false;

    const roomno = game.level.nroom + ROOMOFFSET;
    const seen = new Set();
    const queue = [[seedX, seedY]];
    const floorCells = [];
    const seedTyp = seedLoc.typ;
    let minx = seedX, maxx = seedX, miny = seedY, maxy = seedY;
    while (queue.length) {
        const [cx, cy] = queue.shift();
        const key = `${cx},${cy}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const loc = game.level.at(cx, cy);
        if (!loc || loc.typ !== seedTyp) continue;
        floorCells.push([cx, cy]);
        loc.roomno = roomno;
        loc.lit = lit;
        minx = Math.min(minx, cx);
        maxx = Math.max(maxx, cx);
        miny = Math.min(miny, cy);
        maxy = Math.max(maxy, cy);
        for (let dy = -1; dy <= 1; dy++)
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = cx + dx, ny = cy + dy;
                if (!isok(nx, ny)) continue;
                if (!seen.has(`${nx},${ny}`)) queue.push([nx, ny]);
            }
    }
    for (const [cx, cy] of floorCells) {
        for (let yy = cy - 1; yy <= cy + 1; yy++)
            for (let xx = cx - 1; xx <= cx + 1; xx++) {
                const loc = game.level.at(xx, yy);
                if (!loc || !(IS_WALL(loc.typ) || IS_DOOR(loc.typ) || loc.typ === SDOOR))
                    continue;
                loc.edge = true;
                if (lit) loc.lit = lit;
                if (!loc.roomno) loc.roomno = roomno;
                else if (loc.roomno !== roomno) loc.roomno = SHARED;
            }
    }

    const croom = {
        lx: minx, ly: miny, hx: maxx, hy: maxy,
        rtype: themedFill ? THEMEROOM : OROOM, rlit: lit ? 1 : 0,
        doorct: 0, fdoor: game.level.doorindex,
        irregular: true, needjoining: true,
        nsubrooms: 0, sbrooms: [],
        roomnoidx: game.level.nroom,
        needfill: FILL_NORMAL,
    };
    game.smeq[game.level.nroom] = game.level.nroom;
    game.level.rooms[game.level.nroom] = croom;
    game.level.nroom++;
    if (game.level.nroom < MAXNROFROOMS) game.level.rooms[game.level.nroom] = { hx: -1 };
    if (themedFill) apply_themeroom_fill(croom);
    return true;
}

// C ref: sp_lev.c check_room()
function check_room(lowx, ddx, lowy, ddy, vault) {
    const map = game.level;
    let hix = lowx.v + ddx.v, hiy = lowy.v + ddy.v;
    const xlim = XLIM + (vault ? 1 : 0);
    const ylim = YLIM + (vault ? 1 : 0);
    const s_lowx = lowx.v, s_ddx = ddx.v;
    const s_lowy = lowy.v, s_ddy = ddy.v;
    if (lowx.v < 3) lowx.v = 3;
    if (lowy.v < 2) lowy.v = 2;
    if (hix > COLNO - 3) hix = COLNO - 3;
    if (hiy > ROWNO - 3) hiy = ROWNO - 3;
    for (;;) {
        if (hix <= lowx.v || hiy <= lowy.v) return false;
        if (game.in_mk_themerooms
            && s_lowx !== lowx.v && s_ddx !== ddx.v
            && s_lowy !== lowy.v && s_ddy !== ddy.v) {
            return false;
        }
        let retry = false;
        for (let x = lowx.v - xlim; x <= hix + xlim && !retry; x++) {
            if (x <= 0 || x >= COLNO) continue;
            let y = Math.max(lowy.v - ylim, 0);
            const ymax = Math.min(hiy + ylim, ROWNO - 1);
            for (; y <= ymax; y++) {
                const loc = map.at(x, y);
                if (loc && loc.typ !== STONE) {
                    if (!rn2(3)) return false;
                    if (game.in_mk_themerooms) return false;
                    if (x < lowx.v) lowx.v = x + xlim + 1;
                    else hix = x - xlim - 1;
                    if (y < lowy.v) lowy.v = y + ylim + 1;
                    else hiy = y - ylim - 1;
                    retry = true;
                    break;
                }
            }
        }
        if (!retry) break;
    }
    ddx.v = hix - lowx.v;
    ddy.v = hiy - lowy.v;
    if (game.in_mk_themerooms
        && s_lowx !== lowx.v && s_ddx !== ddx.v
        && s_lowy !== lowy.v && s_ddy !== ddy.v) {
        return false;
    }
    return true;
}

// C ref: sp_lev.c create_room()
function create_room(x, y, w, h, xal, yal, rtype, rlit) {
    const g = game;
    let xabs = 0, yabs = 0;
    let r1 = null, r2 = null;
    let wtmp, htmp;
    let trycnt = 0;
    let vault = false;
    let xlim = XLIM, ylim = YLIM;
    if (rtype === -1) rtype = OROOM;
    if (rtype === VAULT) {
        vault = true;
        xlim++;
        ylim++;
    }
    rlit = litstate_rnd(rlit);
    do {
        wtmp = w; htmp = h;
        let xtmp = x, ytmp = y;
        let xaltmp = xal, yaltmp = yal;
        if ((xtmp < 0 && ytmp < 0 && wtmp < 0 && xaltmp < 0 && yaltmp < 0) || vault) {
            r1 = rnd_rect();
            if (!r1) return false;
            const hx = r1.hx, hy = r1.hy, lx = r1.lx, ly = r1.ly;
            let dx, dy;
            if (vault) {
                dx = dy = 1;
            } else {
                dx = 2 + rn2((hx - lx > 28) ? 12 : 8);
                dy = 2 + rn2(4);
                if (dx * dy > 50) dy = Math.trunc(50 / dx);
            }
            const xborder = (lx > 0 && hx < COLNO - 1) ? 2 * xlim : xlim + 1;
            const yborder = (ly > 0 && hy < ROWNO - 1) ? 2 * ylim : ylim + 1;
            if (hx - lx < dx + 3 + xborder || hy - ly < dy + 3 + yborder) {
                r1 = null;
                continue;
            }
            xabs = lx + (lx > 0 ? xlim : 3)
                   + rn2(hx - (lx > 0 ? lx : 3) - dx - xborder + 1);
            yabs = ly + (ly > 0 ? ylim : 2)
                   + rn2(hy - (ly > 0 ? ly : 2) - dy - yborder + 1);
            if (ly === 0 && hy >= ROWNO - 1
                && (!g.level.nroom || !rn2(g.level.nroom))
                && (yabs + dy > Math.trunc(ROWNO / 2))) {
                yabs = rn1(3, 2);
                if (g.level.nroom < 4 && dy > 1) dy--;
            }
            const lowx = { v: xabs }, ddx = { v: dx };
            const lowy = { v: yabs }, ddy = { v: dy };
            if (!check_room(lowx, ddx, lowy, ddy, vault)) {
                r1 = null;
                continue;
            }
            xabs = lowx.v;
            yabs = lowy.v;
            wtmp = ddx.v + 1;
            htmp = ddy.v + 1;
            r2 = { lx: xabs - 1, ly: yabs - 1, hx: xabs + wtmp, hy: yabs + htmp };
        } else {
            // C ref: sp_lev.c:create_room(), partially-random positioned rooms.
            let rndpos = 0;
            let dx, dy;
            if (xtmp < 0 && ytmp < 0) {
                xtmp = rnd(5);
                ytmp = rnd(5);
                rndpos = 1;
            }
            if (wtmp < 0 || htmp < 0) {
                wtmp = rn1(15, 3);
                htmp = rn1(8, 2);
            }
            if (xaltmp === -1) xaltmp = rnd(3);
            if (yaltmp === -1) yaltmp = rnd(3);

            xabs = Math.trunc(((xtmp - 1) * COLNO) / 5) + 1;
            yabs = Math.trunc(((ytmp - 1) * ROWNO) / 5) + 1;
            switch (xaltmp) {
            case SPLEV_LEFT:
                break;
            case SPLEV_RIGHT:
                xabs += Math.trunc(COLNO / 5) - wtmp;
                break;
            case SPLEV_CENTER:
                xabs += Math.trunc((Math.trunc(COLNO / 5) - wtmp) / 2);
                break;
            default:
                break;
            }
            switch (yaltmp) {
            case TOP:
                break;
            case BOTTOM:
                yabs += Math.trunc(ROWNO / 5) - htmp;
                break;
            case SPLEV_CENTER:
                yabs += Math.trunc((Math.trunc(ROWNO / 5) - htmp) / 2);
                break;
            default:
                break;
            }

            if (xabs + wtmp - 1 > COLNO - 2) xabs = COLNO - wtmp - 3;
            if (xabs < 2) xabs = 2;
            if (yabs + htmp - 1 > ROWNO - 2) yabs = ROWNO - htmp - 3;
            if (yabs < 2) yabs = 2;

            r2 = {
                lx: xabs - 1,
                ly: yabs - 1,
                hx: xabs + wtmp + rndpos,
                hy: yabs + htmp + rndpos,
            };
            r1 = get_rect(r2);
            dx = wtmp;
            dy = htmp;
            if (r1) {
                const lowx = { v: xabs }, ddx = { v: dx };
                const lowy = { v: yabs }, ddy = { v: dy };
                if (!check_room(lowx, ddx, lowy, ddy, vault)) {
                    r1 = null;
                } else {
                    xabs = lowx.v;
                    yabs = lowy.v;
                }
            }
        }
    } while (++trycnt <= 100 && !r1);
    if (!r1) return false;
    split_rects(r1, r2);
    if (!vault) {
        g.smeq[g.level.nroom] = g.level.nroom;
        add_room(xabs, yabs, xabs + wtmp - 1, yabs + htmp - 1, rlit, rtype, false);
    } else {
        if (!g.level.rooms[g.level.nroom]) g.level.rooms[g.level.nroom] = {};
        g.level.rooms[g.level.nroom].lx = xabs;
        g.level.rooms[g.level.nroom].ly = yabs;
    }
    return true;
}

function create_vault() {
    return create_room(-1, -1, 2, 2, -1, -1, VAULT, true);
}

// C ref: mklev.c add_room()
function add_room(lowx, lowy, hix, hiy, lit, rtype, special) {
    const g = game;
    const croom = {
        lx: lowx, ly: lowy, hx: hix, hy: hiy,
        rtype, rlit: lit ? 1 : 0,
        doorct: 0, fdoor: g.level.doorindex,
        irregular: false, needjoining: !special,
        nsubrooms: 0, sbrooms: [],
        roomnoidx: g.level.nroom,
        needfill: 0,
    };
    do_room_or_subroom(croom, lowx, lowy, hix, hiy, lit, rtype, special, true);
    g.level.rooms[g.level.nroom] = croom;
    g.level.nroom++;
    if (g.level.nroom < MAXNROFROOMS) {
        g.level.rooms[g.level.nroom] = { hx: -1 };
    }
}

function add_subroom(proom, lowx, lowy, hix, hiy, lit, rtype, special) {
    if (!proom) return null;
    const croom = {
        roomnoidx: proom.roomnoidx,
        nsubrooms: 0,
        sbrooms: [],
    };
    do_room_or_subroom(croom, lowx, lowy, hix, hiy, lit, rtype, special, false);
    proom.sbrooms = proom.sbrooms || [];
    proom.sbrooms.push(croom);
    proom.nsubrooms = proom.sbrooms.length;
    return croom;
}

function create_subroom(proom, x, y, w, h, rtype, rlit) {
    if (!proom) return null;
    let width = proom.hx - proom.lx + 1;
    let height = proom.hy - proom.ly + 1;
    if (width < 4 || height < 4) return null;
    if (w === -1) w = rnd(width - 3);
    if (h === -1) h = rnd(height - 3);
    if (x === -1) x = rnd(width - w);
    if (y === -1) y = rnd(height - h);
    if (x === 1) x = 0;
    if (y === 1) y = 0;
    if (x + w + 1 === width) x++;
    if (y + h + 1 === height) y++;
    if (rtype === -1) rtype = OROOM;
    rlit = litstate_rnd(rlit);
    const subroom = add_subroom(proom, proom.lx + x, proom.ly + y,
        proom.lx + x + w - 1, proom.ly + y + h - 1, rlit, rtype, false);
    return subroom;
}

// C ref: mklev.c do_room_or_subroom()
function do_room_or_subroom(croom, lowx, lowy, hix, hiy, lit, _rtype, special, is_room) {
    const map = game.level;
    if (!lowx) lowx++;
    if (!lowy) lowy++;
    if (hix >= COLNO - 1) hix = COLNO - 2;
    if (hiy >= ROWNO - 1) hiy = ROWNO - 2;
    if (lit) {
        for (let x = lowx - 1; x <= hix + 1; x++)
            for (let y = Math.max(lowy - 1, 0); y <= hiy + 1; y++)
                if (map.at(x, y)) map.at(x, y).lit = true;
        croom.rlit = 1;
    } else {
        croom.rlit = 0;
    }
    croom.lx = lowx; croom.hx = hix;
    croom.ly = lowy; croom.hy = hiy;
    croom.rtype = _rtype;
    croom.doorct = 0;
    croom.fdoor = game.level.doorindex;
    croom.irregular = false;
    croom.nsubrooms = 0;
    croom.sbrooms = [];
    if (!special) {
        croom.needjoining = true;
        for (let x = lowx - 1; x <= hix + 1; x++)
            for (let y = lowy - 1; y <= hiy + 1; y += (hiy - lowy + 2)) {
                const loc = map.at(x, y);
                if (loc) { loc.typ = HWALL; loc.horizontal = true; }
            }
        for (let x = lowx - 1; x <= hix + 1; x += (hix - lowx + 2))
            for (let y = lowy; y <= hiy; y++) {
                const loc = map.at(x, y);
                if (loc) { loc.typ = VWALL; loc.horizontal = false; }
            }
        for (let x = lowx; x <= hix; x++)
            for (let y = lowy; y <= hiy; y++) {
                const loc = map.at(x, y);
                if (loc) loc.typ = ROOM;
            }
        if (is_room) {
            const tl = map.at(lowx - 1, lowy - 1);
            const tr = map.at(hix + 1, lowy - 1);
            const bl = map.at(lowx - 1, hiy + 1);
            const br = map.at(hix + 1, hiy + 1);
            if (tl) tl.typ = TLCORNER;
            if (tr) tr.typ = TRCORNER;
            if (bl) bl.typ = BLCORNER;
            if (br) br.typ = BRCORNER;
        } else {
            wallification(lowx - 1, lowy - 1, hix + 1, hiy + 1);
        }
    }
}

// C ref: mklev.c sort_rooms()
function sort_rooms() {
    const g = game;
    const n = g.level.nroom;
    const oldToNew = new Array(n).fill(0);
    const liveRooms = g.level.rooms.slice(0, n)
        .sort((a, b) => (a?.lx || 0) - (b?.lx || 0));
    g.level.rooms = liveRooms;
    if (n < MAXNROFROOMS) g.level.rooms[n] = { hx: -1 };
    for (let i = 0; i < n; i++) {
        if (g.level.rooms[i]) {
            oldToNew[g.level.rooms[i].roomnoidx] = i;
            g.level.rooms[i].roomnoidx = i;
        }
    }
    for (let x = 1; x < COLNO; x++)
        for (let y = 0; y < ROWNO; y++) {
            const loc = g.level.at(x, y);
            const rno = loc?.roomno ?? 0;
            if (rno >= ROOMOFFSET && rno < MAXNROFROOMS + 1) {
                loc.roomno = oldToNew[rno - ROOMOFFSET] + ROOMOFFSET;
            }
        }
}

// C ref: mklev.c topologize()
function topologize(croom) {
    if (!croom || croom.irregular) return;
    const roomno = (croom.roomnoidx ?? -1) + ROOMOFFSET;
    const lowx = croom.lx, lowy = croom.ly;
    const hix = croom.hx, hiy = croom.hy;
    if (!game.level || roomno < ROOMOFFSET) return;
    if ((game.level.at(lowx, lowy)?.roomno ?? 0) === roomno) return;
    for (let x = lowx; x <= hix; x++)
        for (let y = lowy; y <= hiy; y++) {
            const loc = game.level.at(x, y);
            if (loc) loc.roomno = roomno;
        }
    for (let x = lowx - 1; x <= hix + 1; x++)
        for (let y = lowy - 1; y <= hiy + 1; y += (hiy - lowy + 2)) {
            const loc = game.level.at(x, y);
            if (loc) { loc.edge = true; loc.roomno = loc.roomno ? SHARED : roomno; }
        }
    for (let x = lowx - 1; x <= hix + 1; x += (hix - lowx + 2))
        for (let y = lowy; y <= hiy; y++) {
            const loc = game.level.at(x, y);
            if (loc) { loc.edge = true; loc.roomno = loc.roomno ? SHARED : roomno; }
        }
}

// ============================================================
// Corridors
// ============================================================

function good_rm_wall_doorpos(x, y, dir, room) {
    const map = game.level;
    const rmno = game.level.rooms.indexOf(room) + ROOMOFFSET;
    if (!isok(x, y) || !room.needjoining) return false;
    const loc = map.at(x, y);
    if (!loc) return false;
    if (!(loc.typ === HWALL || loc.typ === VWALL || IS_DOOR(loc.typ) || loc.typ === SDOOR))
        return false;
    if (bydoor(x, y)) return false;
    const tx = x + xdir[dir], ty = y + ydir[dir];
    if (!isok(tx, ty)) return false;
    const tloc = map.at(tx, ty);
    if (!tloc || IS_OBSTRUCTED(tloc.typ)) return false;
    if (rmno !== tloc.roomno) return false;
    return true;
}

function finddpos_shift(xp, yp, dir, aroom) {
    const rdir = DIR_180(dir);
    if (good_rm_wall_doorpos(xp.v, yp.v, rdir, aroom)) return true;
    if (aroom.irregular) {
        const dx = xdir[rdir];
        const dy = ydir[rdir];
        let rx = xp.v;
        let ry = yp.v;
        let fail = false;
        while (!fail && isok(rx, ry)) {
            const loc = game.level.at(rx, ry);
            if (!loc || !(loc.typ === STONE || loc.typ === CORR)) break;
            rx += dx;
            ry += dy;
            if (good_rm_wall_doorpos(rx, ry, rdir, aroom)) {
                xp.v = rx;
                yp.v = ry;
                return true;
            }
            const next = game.level.at(rx, ry);
            if (!next || !(next.typ === STONE || next.typ === CORR))
                fail = true;
            if (rx < aroom.lx || rx > aroom.hx || ry < aroom.ly || ry > aroom.hy)
                fail = true;
        }
    }
    return false;
}

// C ref: mklev.c finddpos()
function finddpos(cc, dir, aroom) {
    let x1, y1, x2, y2;
    switch (dir) {
    case DIR_N: x1 = aroom.lx; x2 = aroom.hx; y1 = y2 = aroom.ly - 1; break;
    case DIR_S: x1 = aroom.lx; x2 = aroom.hx; y1 = y2 = aroom.hy + 1; break;
    case DIR_W: x1 = x2 = aroom.lx - 1; y1 = aroom.ly; y2 = aroom.hy; break;
    case DIR_E: x1 = x2 = aroom.hx + 1; y1 = aroom.ly; y2 = aroom.hy; break;
    default: return false;
    }
    let tryct = 0;
    let x, y;
    do {
        x = (x2 - x1) ? rn1(x2 - x1 + 1, x1) : x1;
        y = (y2 - y1) ? rn1(y2 - y1 + 1, y1) : y1;
        const xp = { v: x }, yp = { v: y };
        if (finddpos_shift(xp, yp, dir, aroom)) {
            cc.x = xp.v; cc.y = yp.v;
            return true;
        }
    } while (++tryct < 20);
    for (x = x1; x <= x2; x++)
        for (y = y1; y <= y2; y++) {
            const xp = { v: x }, yp = { v: y };
            if (finddpos_shift(xp, yp, dir, aroom)) {
                cc.x = xp.v; cc.y = yp.v;
                return true;
            }
        }
    cc.x = x1; cc.y = y1;
    return false;
}

function maybe_sdoor(chance) {
    const d = depth_of_level(game.u?.uz);
    return (d > 2) && !rn2(Math.max(2, chance));
}

// C ref: sp_lev.c dig_corridor()
function dig_corridor(org, dest, npoints_out, nxcor, ftyp, btyp) {
    const map = game.level;
    let dx = 0, dy = 0;
    let xx = org.x, yy = org.y;
    const tx = dest.x, ty = dest.y;
    let npoints = 0;
    if (npoints_out) npoints_out.v = 0;
    if (xx <= 0 || yy <= 0 || tx <= 0 || ty <= 0
        || xx > COLNO - 1 || tx > COLNO - 1 || yy > ROWNO - 1 || ty > ROWNO - 1)
        return false;
    if (tx > xx) dx = 1;
    else if (ty > yy) dy = 1;
    else if (tx < xx) dx = -1;
    else dy = -1;
    xx -= dx; yy -= dy;
    let cct = 0;
    while (xx !== tx || yy !== ty) {
        if (cct++ > 500 || (nxcor && !rn2(35))) return false;
        xx += dx; yy += dy;
        if (xx >= COLNO - 1 || xx <= 0 || yy <= 0 || yy >= ROWNO - 1) return false;
        const crm = map.at(xx, yy);
        if (!crm) return false;
        if (crm.typ === btyp) {
            if (ftyp === CORR && maybe_sdoor(100)) {
                npoints++;
                if (npoints_out) npoints_out.v = npoints;
                crm.typ = SCORR;
            } else {
                npoints++;
                if (npoints_out) npoints_out.v = npoints;
                crm.typ = ftyp;
                if (nxcor && !rn2(50)) {
                    mksobj_at(BOULDER, xx, yy, true, false);
                }
            }
        } else if (crm.typ !== ftyp && crm.typ !== SCORR) {
            return false;
        }
        let dix = Math.abs(xx - tx);
        let diy = Math.abs(yy - ty);
        if ((dix > diy) && diy && !rn2(dix - diy + 1)) dix = 0;
        else if ((diy > dix) && dix && !rn2(diy - dix + 1)) diy = 0;
        if (dy && dix > diy) {
            const ddx = (xx > tx) ? -1 : 1;
            const ncr = map.at(xx + ddx, yy);
            if (ncr && (ncr.typ === btyp || ncr.typ === ftyp || ncr.typ === SCORR)) {
                dx = ddx; dy = 0; continue;
            }
        } else if (dx && diy > dix) {
            const ddy = (yy > ty) ? -1 : 1;
            const ncr = map.at(xx, yy + ddy);
            if (ncr && (ncr.typ === btyp || ncr.typ === ftyp || ncr.typ === SCORR)) {
                dy = ddy; dx = 0; continue;
            }
        }
        const straight = map.at(xx + dx, yy + dy);
        if (straight && (straight.typ === btyp || straight.typ === ftyp || straight.typ === SCORR))
            continue;
        if (dx) { dx = 0; dy = (ty < yy) ? -1 : 1; }
        else { dy = 0; dx = (tx < xx) ? -1 : 1; }
        const alt = map.at(xx + dx, yy + dy);
        if (alt && (alt.typ === btyp || alt.typ === ftyp || alt.typ === SCORR)) continue;
        dy = -dy; dx = -dx;
    }
    if (npoints_out) npoints_out.v = npoints;
    return true;
}

// C ref: mklev.c dosdoor()
function set_door_mask(loc, mask) {
    loc.flags = mask;
    loc.doormask = mask;
}

function dosdoor(x, y, aroom, type) {
    const map = game.level;
    const loc = map.at(x, y);
    if (!loc) return;
    const shdoor = in_rooms(x, y, 0).length > 0;
    if (!IS_WALL(loc.typ)) type = DOOR;
    loc.typ = type;
    if (type === DOOR) {
        if (!rn2(3)) {
            if (!rn2(5)) set_door_mask(loc, D_ISOPEN);
            else if (!rn2(6)) set_door_mask(loc, D_LOCKED);
            else set_door_mask(loc, D_CLOSED);
            if (loc.flags !== D_ISOPEN && !shdoor
                && level_difficulty() >= 5 && !rn2(25))
                set_door_mask(loc, loc.flags | D_TRAPPED);
        } else {
            set_door_mask(loc, shdoor ? D_ISOPEN : D_NODOOR);
        }
        // C ref: mklev.c:dosdoor() forces Rogue-level doors to D_NODOOR
        // after regular door-state RNG and before trapped-door mimic handling.
        if (rogue_level_active()) set_door_mask(loc, D_NODOOR);
        if (loc.flags & D_TRAPPED) {
            if (level_difficulty() >= 9 && !rn2(5)) {
                set_door_mask(loc, D_NODOOR);
            }
        }
    } else {
        if (shdoor || !rn2(5)) set_door_mask(loc, D_LOCKED);
        else set_door_mask(loc, D_CLOSED);
        if (!shdoor && level_difficulty() >= 4 && !rn2(20))
            set_door_mask(loc, loc.flags | D_TRAPPED);
    }
    add_door(x, y, aroom);
}

function dodoor(x, y, aroom) {
    dosdoor(x, y, aroom, maybe_sdoor(8) ? SDOOR : DOOR);
}

function add_door(x, y, aroom) {
    const g = game;
    if (!g.level.doors) g.level.doors = [];
    for (let i = 0; i < aroom.doorct; i++) {
        const d = g.level.doors[aroom.fdoor + i];
        if (d && d.x === x && d.y === y) return;
    }
    if (aroom.doorct === 0) aroom.fdoor = g.level.doorindex;
    aroom.doorct++;
    for (let tmp = g.level.doorindex; tmp > aroom.fdoor; tmp--)
        g.level.doors[tmp] = g.level.doors[tmp - 1];
    for (const broom of g.level.rooms || []) {
        if (!broom || broom.hx <= 0 || broom === aroom || !(broom.doorct > 0)) continue;
        if ((broom.fdoor ?? 0) >= aroom.fdoor) broom.fdoor++;
    }
    g.level.doors[aroom.fdoor] = { x, y };
    g.level.doorindex++;
}

function shared_with_room(x, y, droom) {
    if (!isok(x, y) || !droom) return false;
    const rmno = (droom.roomnoidx ?? game.level.rooms.indexOf(droom)) + ROOMOFFSET;
    const loc = game.level.at(x, y);
    if ((loc?.roomno ?? 0) === rmno && !loc.edge) return false;
    if (isok(x - 1, y) && (game.level.at(x - 1, y)?.roomno ?? 0) === rmno && x - 1 <= droom.hx)
        return true;
    if (isok(x + 1, y) && (game.level.at(x + 1, y)?.roomno ?? 0) === rmno && x + 1 >= droom.lx)
        return true;
    if (isok(x, y - 1) && (game.level.at(x, y - 1)?.roomno ?? 0) === rmno && y - 1 <= droom.hy)
        return true;
    if (isok(x, y + 1) && (game.level.at(x, y + 1)?.roomno ?? 0) === rmno && y + 1 >= droom.ly)
        return true;
    return false;
}

function maybe_add_door_to_room(x, y, droom) {
    if (!droom || droom.hx < 0) return;
    const rmno = (droom.roomnoidx ?? game.level.rooms.indexOf(droom)) + ROOMOFFSET;
    const loc = game.level.at(x, y);
    if (!loc) return;
    if ((!droom.irregular && inside_room(droom, x, y))
        || (loc.roomno ?? 0) === rmno
        || shared_with_room(x, y, droom)) {
        add_door(x, y, droom);
    }
}

// C ref: sp_lev.c:link_doors_rooms()
function link_doors_rooms() {
    const nroom = game.level?.nroom ?? 0;
    for (let y = 0; y < ROWNO; y++)
        for (let x = 0; x < COLNO; x++) {
            const loc = game.level?.at(x, y);
            if (!loc || !(IS_DOOR(loc.typ) || loc.typ === SDOOR)) continue;
            for (let i = 0; i < nroom; i++) {
                const room = game.level.rooms?.[i];
                maybe_add_door_to_room(x, y, room);
                for (const subroom of room?.sbrooms || [])
                    maybe_add_door_to_room(x, y, subroom);
            }
        }
}

function bydoor(x, y) {
    const map = game.level;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (!isok(x + dx, y + dy)) continue;
        const loc = map.at(x + dx, y + dy);
        if (loc && (IS_DOOR(loc.typ) || loc.typ === SDOOR)) return true;
    }
    return false;
}

function okdoor(x, y) {
    const map = game.level;
    const loc = map.at(x, y);
    if (!loc) return false;
    if (!(loc.typ === HWALL || loc.typ === VWALL)) return false;
    if (bydoor(x, y)) return false;
    return (
        (isok(x - 1, y) && !IS_OBSTRUCTED(map.at(x - 1, y).typ))
        || (isok(x + 1, y) && !IS_OBSTRUCTED(map.at(x + 1, y).typ))
        || (isok(x, y - 1) && !IS_OBSTRUCTED(map.at(x, y - 1).typ))
        || (isok(x, y + 1) && !IS_OBSTRUCTED(map.at(x, y + 1).typ))
    );
}

// C ref: mklev.c join()
function join(a, b, nxcor) {
    const g = game;
    const croom = g.level.rooms[a];
    const troom = g.level.rooms[b];
    if (!croom || !troom) return;
    if (!croom.needjoining || !troom.needjoining) return;
    if (troom.hx < 0 || croom.hx < 0) return;
    let dx, dy;
    const cc = { x: 0, y: 0 }, tt = { x: 0, y: 0 };
    if (troom.lx > croom.hx) {
        dx = 1; dy = 0;
        if (!finddpos(cc, DIR_E, croom)) return;
        if (!finddpos(tt, DIR_W, troom)) return;
    } else if (troom.hy < croom.ly) {
        dy = -1; dx = 0;
        if (!finddpos(cc, DIR_N, croom)) return;
        if (!finddpos(tt, DIR_S, troom)) return;
    } else if (troom.hx < croom.lx) {
        dx = -1; dy = 0;
        if (!finddpos(cc, DIR_W, croom)) return;
        if (!finddpos(tt, DIR_E, troom)) return;
    } else {
        dy = 1; dx = 0;
        if (!finddpos(cc, DIR_S, croom)) return;
        if (!finddpos(tt, DIR_N, troom)) return;
    }
    const xx = cc.x, yy = cc.y;
    const tx = tt.x - dx, ty = tt.y - dy;
    if (nxcor) {
        const loc = game.level.at(xx + dx, yy + dy);
        if (loc && loc.typ !== STONE) return;
    }
    const org = { x: xx + dx, y: yy + dy };
    const dest = { x: tx, y: ty };
    const npoints = { v: 0 };
    const ftyp = CORR;
    const dig_result = dig_corridor(org, dest, npoints, nxcor, ftyp, STONE);
    if ((npoints.v > 0) && (okdoor(xx, yy) || !nxcor))
        dodoor(xx, yy, croom);
    if (!dig_result) return;
    if (okdoor(tt.x, tt.y) || !nxcor)
        dodoor(tt.x, tt.y, troom);
    if (g.smeq[a] < g.smeq[b]) g.smeq[b] = g.smeq[a];
    else g.smeq[a] = g.smeq[b];
}

// C ref: mklev.c makecorridors()
function makecorridors() {
    const g = game;
    let any = true;
    for (let i = 0; i < g.level.nroom; i++) g.smeq[i] = i;
    for (let a = 0; a < g.level.nroom - 1; a++) {
        join(a, a + 1, false);
        if (!rn2(50)) break;
    }
    for (let a = 0; a < g.level.nroom - 2; a++)
        if (g.smeq[a] !== g.smeq[a + 2]) join(a, a + 2, false);
    for (let a = 0; any && a < g.level.nroom; a++) {
        any = false;
        for (let b = 0; b < g.level.nroom; b++)
            if (g.smeq[a] !== g.smeq[b]) { join(a, b, false); any = true; }
    }
    if (g.level.nroom > 2) {
        const count = rn2(g.level.nroom) + 4;
        for (let i = 0; i < count; i++) {
            let a = rn2(g.level.nroom);
            let b = rn2(g.level.nroom - 2);
            if (b >= a) b += 2;
            join(a, b, true);
        }
    }
}

// ============================================================
// Room helper functions
// ============================================================

function somex(croom) { return rn1(croom.hx - croom.lx + 1, croom.lx); }
function somey(croom) { return rn1(croom.hy - croom.ly + 1, croom.ly); }

function somexy(croom, c) {
    if (!croom.nsubrooms) {
        c.x = somex(croom);
        c.y = somey(croom);
        return true;
    }
    let try_cnt = 0;
    while (try_cnt++ < 100) {
        c.x = somex(croom);
        c.y = somey(croom);
        const loc = game.level.at(c.x, c.y);
        if (loc && IS_WALL(loc.typ)) continue;
        return true;
    }
    return false;
}

function occupied(x, y) {
    const loc = game.level.at(x, y);
    if (!loc) return false;
    if (game.level.traps?.some(t => t.tx === x && t.ty === y)) return true;
    return !!(IS_FURNITURE(loc.typ) || loc.typ === LAVAPOOL || IS_POOL(loc.typ));
}

function somexyspace(croom, c) {
    let trycnt = 0;
    let okay;
    do {
        okay = somexy(croom, c) && isok(c.x, c.y) && !occupied(c.x, c.y);
        if (okay) {
            const loc = game.level.at(c.x, c.y);
            okay = loc && (loc.typ === ROOM || loc.typ === CORR || loc.typ === ICE);
        }
    } while (trycnt++ < 100 && !okay);
    return okay;
}

// ============================================================
// Stairs
// ============================================================

function generate_stairs_room_good(croom, phase) {
    if (!croom || croom.hx < 0) return false;
    if (!croom.needjoining && phase >= 0) return false;
    let hasDown = false, hasUp = false;
    for (let st = game.stairs; st; st = st.next) {
        const inRoom = st.sx >= croom.lx && st.sx <= croom.hx
            && st.sy >= croom.ly && st.sy <= croom.hy;
        if (!inRoom) continue;
        if (st.up) hasUp = true; else hasDown = true;
    }
    if (phase >= 1 && (hasDown || hasUp)) return false;
    if (croom.rtype !== OROOM && !(phase < 2 && croom.rtype === THEMEROOM)) return false;
    return true;
}

function generate_stairs_find_room() {
    const g = game;
    if (!g.level.nroom) return null;
    for (let phase = 2; phase > -1; phase--) {
        const candidates = [];
        for (let i = 0; i < g.level.nroom; i++)
            if (generate_stairs_room_good(g.level.rooms[i], phase))
                candidates.push(i);
        if (candidates.length > 0) {
            const pick = rn2(candidates.length);
            return g.level.rooms[candidates[pick]];
        }
    }
    return g.level.rooms[rn2(g.level.nroom)];
}

function mkstairs(x, y, up, croom) {
    const g = game;
    const loc = g.level.at(x, y);
    if (loc) {
        loc.typ = STAIRS;
        loc.ladder = up ? 1 : 2;
    }
    const dest = {
        dnum: g.u?.uz?.dnum ?? 0,
        dlevel: (g.u?.uz?.dlevel ?? 1) + (up ? -1 : 1),
    };
    stairway_add(x, y, !!up, false, dest);
    if (up) g.level.upstair = { x, y };
    else g.level.dnstair = { x, y };
}

async function generate_stairs() {
    const g = game;
    const pos = { x: 0, y: 0 };
    // Down stairs
    {
        const croom = generate_stairs_find_room();
        if (croom) {
            if (!somexyspace(croom, pos)) {
                pos.x = somex(croom);
                pos.y = somey(croom);
            }
            mkstairs(pos.x, pos.y, 0, croom);
        }
    }
    // Up stairs only if not level 1
    if ((g.u?.uz?.dlevel ?? 1) !== 1) {
        const croom = generate_stairs_find_room();
        if (croom) {
            if (!somexyspace(croom, pos)) {
                pos.x = somex(croom);
                pos.y = somey(croom);
            }
            mkstairs(pos.x, pos.y, 1, croom);
        }
    }
}

// ============================================================
// Niches
// ============================================================

function cardinal_nextto_room(aroom, x, y) {
    const map = game.level;
    const rmno = game.level.rooms.indexOf(aroom) + ROOMOFFSET;
    for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        if (!isok(x + dx, y + dy)) continue;
        const loc = map.at(x + dx, y + dy);
        if (loc && !loc.edge && loc.roomno === rmno) return true;
    }
    return false;
}

function place_niche(aroom) {
    let dy;
    const dd = { x: 0, y: 0 };
    if (rn2(2)) {
        dy = 1;
        if (!finddpos(dd, DIR_S, aroom)) return null;
    } else {
        dy = -1;
        if (!finddpos(dd, DIR_N, aroom)) return null;
    }
    const xx = dd.x, yy = dd.y;
    const niche = game.level.at(xx, yy + dy);
    const back = game.level.at(xx, yy - dy);
    if (!niche || niche.typ !== STONE) return null;
    if (!back || IS_POOL(back.typ) || IS_FURNITURE(back.typ)) return null;
    if (!cardinal_nextto_room(aroom, xx, yy)) return null;
    return { dy, xx, yy };
}

async function makeniche(trap_type) {
    const g = game;
    let vct = 8;
    while (vct--) {
        const aroom = g.level.rooms[rn2(g.level.nroom)];
        if (!aroom || aroom.rtype !== OROOM) continue;
        if (aroom.doorct === 1 && rn2(5)) continue;
        const niche = place_niche(aroom);
        if (!niche) continue;
        const { dy, xx, yy } = niche;
        const rm = g.level.at(xx, yy + dy);
        if (!rm) continue;
        if (trap_type || !rn2(4)) {
            rm.typ = SCORR;
            if (trap_type) {
                let actualTrap = trap_type;
                if (is_hole(actualTrap)) actualTrap = ROCKTRAP;
                await maketrap(xx, yy + dy, actualTrap);
            }
            dosdoor(xx, yy, aroom, SDOOR);
        } else {
            rm.typ = CORR;
            if (rn2(7)) {
                dosdoor(xx, yy, aroom, rn2(5) ? SDOOR : DOOR);
            } else {
                const loc = g.level.at(xx, yy);
                if (!rn2(5) && loc && IS_WALL(loc.typ)) {
                    loc.typ = IRONBARS;
                    if (rn2(3)) {
                        const ptr = mkclass_aligned('S_HUMAN', 0);
                        mkcorpstat(CORPSE, null, ptr, xx, yy + dy, 8);
                    }
                }
                if (!g.level.flags.noteleport) {
                    mksobj_at(SCR_TELEPORTATION, xx, yy + dy, true, false);
                }
                if (!rn2(3)) {
                    mkobj_at(RANDOM_CLASS, xx, yy + dy, true);
                }
            }
        }
        return;
    }
}

async function make_niches() {
    const g = game;
    let ct = rnd(Math.trunc(g.level.nroom / 2) + 1);
    let ltptr = ((g.u?.uz?.dlevel ?? 1) > 15);
    let vamp = ((g.u?.uz?.dlevel ?? 1) > 5 && (g.u?.uz?.dlevel ?? 1) < 25);
    while (ct--) {
        if (ltptr && !rn2(6)) {
            ltptr = false;
            await makeniche(LEVEL_TELEP);
        } else if (vamp && !rn2(6)) {
            vamp = false;
            await makeniche(TRAPDOOR);
        } else {
            await makeniche(NO_TRAP);
        }
    }
}

const SHOP_TYPE_PROBS = [42, 14, 10, 10, 5, 5, 3, 3, 3, 2];
const SHKTOOLS_NAME_COUNT = 40;
const SHOP_ITEM_PROBS = [
    [{ iprob: 100, itype: RANDOM_CLASS }],
    [{ iprob: 90, itype: ARMOR_CLASS }, { iprob: 10, itype: WEAPON_CLASS }],
    [{ iprob: 90, itype: SCROLL_CLASS }, { iprob: 10, itype: SPBOOK_CLASS }],
    [{ iprob: 100, itype: POTION_CLASS }],
    [{ iprob: 90, itype: WEAPON_CLASS }, { iprob: 10, itype: ARMOR_CLASS }],
    [{ iprob: 83, itype: FOOD_CLASS }],
    [{ iprob: 85, itype: RING_CLASS }, { iprob: 10, itype: GEM_CLASS }, { iprob: 5, itype: AMULET_CLASS }],
    [{ iprob: 90, itype: WAND_CLASS }, { iprob: 5, itype: -LEATHER_GLOVES }, { iprob: 5, itype: -ELVEN_CLOAK }],
    [{ iprob: 100, itype: TOOL_CLASS }],
    [{ iprob: 90, itype: SPBOOK_CLASS }, { iprob: 10, itype: SCROLL_CLASS }],
    [{ iprob: 70, itype: FOOD_CLASS }, { iprob: 20, itype: -POT_FRUIT_JUICE }, { iprob: 10, itype: FOOD_CLASS }],
    [
        { iprob: 30, itype: -WAX_CANDLE },
        { iprob: 44, itype: -TALLOW_CANDLE },
        { iprob: 5, itype: -BRASS_LANTERN },
        { iprob: 9, itype: -OIL_LAMP },
        { iprob: 3, itype: -MAGIC_LAMP },
        { iprob: 5, itype: -POT_OIL },
        { iprob: 2, itype: -WAN_LIGHT },
        { iprob: 1, itype: -SCR_LIGHT },
        { iprob: 1, itype: -SPE_LIGHT },
    ],
];

function inside_room(croom, x, y) {
    if (croom.irregular) {
        const rmno = game.level.rooms.indexOf(croom) + ROOMOFFSET;
        const loc = game.level.at(x, y);
        return !!loc && !loc.edge && loc.roomno === rmno;
    }
    return x >= croom.lx - 1 && x <= croom.hx + 1
        && y >= croom.ly - 1 && y <= croom.hy + 1;
}

function has_stairs(croom, up) {
    for (let st = game.stairs; st; st = st.next) {
        if (!!st.up === !!up && inside_room(croom, st.sx, st.sy))
            return true;
    }
    return false;
}

function invalid_shop_shape(sroom) {
    const door = game.level.doors?.[sroom.fdoor];
    if (!door) return true;
    let insidex = 0, insidey = 0, insidect = 0;
    for (let x = Math.max(door.x - 1, sroom.lx); x <= Math.min(door.x + 1, sroom.hx); x++)
        for (let y = Math.max(door.y - 1, sroom.ly); y <= Math.min(door.y + 1, sroom.hy); y++) {
            if (game.level.at(x, y)?.typ === ROOM) {
                insidex = x;
                insidey = y;
                insidect++;
            }
        }
    if (insidect < 1) return true;
    if (insidect > 1) return false;
    insidect = 0;
    for (let x = Math.max(insidex - 1, sroom.lx); x <= Math.min(insidex + 1, sroom.hx); x++)
        for (let y = Math.max(insidey - 1, sroom.ly); y <= Math.min(insidey + 1, sroom.hy); y++) {
            if (x === insidex && y === insidey) continue;
            if (game.level.at(x, y)?.typ === ROOM) insidect++;
        }
    return insidect === 1;
}

function mkshop() {
    let sroom = null;
    for (let i = 0; i < game.level.nroom; i++) {
        const room = game.level.rooms[i];
        if (!room || room.hx < 0 || room.rtype !== OROOM) continue;
        if (has_stairs(room, false) || has_stairs(room, true)) continue;
        if (room.doorct === 1) {
            if (invalid_shop_shape(room)) continue;
            sroom = room;
            break;
        }
    }
    if (!sroom) return;
    if (!sroom.rlit) {
        for (let x = sroom.lx - 1; x <= sroom.hx + 1; x++)
            for (let y = sroom.ly - 1; y <= sroom.hy + 1; y++) {
                const loc = game.level.at(x, y);
                if (loc) loc.lit = true;
            }
        sroom.rlit = 1;
    }
    let j = rnd(100);
    let i = 0;
    while (i < SHOP_TYPE_PROBS.length && (j -= SHOP_TYPE_PROBS[i]) > 0) i++;
    if ((sroom.hx - sroom.lx + 1) * (sroom.hy - sroom.ly + 1) > 20
        && (i === 7 || i === 9)) {
        i = 0;
    }
    sroom.rtype = SHOPBASE + i;
    topologize(sroom);
    sroom.needfill = FILL_NORMAL;
}

function do_mkroom(roomtype) {
    if (roomtype >= SHOPBASE) {
        mkshop();
    }
}

function shopkeeper_pos(sroom) {
    const door = sroom?.doorct ? game.level?.doors?.[sroom.fdoor] : null;
    if (!door) return null;
    if (door.x < sroom.lx) return { x: sroom.lx, y: door.y };
    if (door.x > sroom.hx) return { x: sroom.hx, y: door.y };
    if (door.y < sroom.ly) return { x: door.x, y: sroom.ly };
    if (door.y > sroom.hy) return { x: door.x, y: sroom.hy };
    return { x: door.x, y: door.y };
}

function shkinit(shopIndex, sroom) {
    const pos = shopkeeper_pos(sroom);
    const shopkeeper = MONSTERS.find(m => m.name === 'SHOPKEEPER');
    if (!pos || !shopkeeper) return -1;
    makemon(shopkeeper, pos.x, pos.y, 0);
    const shk = game.level?.monsters?.[0];
    if (shk) {
        shk.isshk = 1;
        shk.mpeaceful = 1;
        shk.msleeping = 0;
    }
    rnd(100); // C ref: shknam.c:mkmonmoney() initial capital amount.
    next_ident();
    if (shopIndex === 6) mksobj(TOUCHSTONE, true, false);
    if (shopIndex === 7 || shopIndex === 8 || (shopIndex === 6 && rn2(2))
        || (shopIndex === 0 && rn2(5))) {
        mksobj(SCR_CHARGING, true, false);
    }
    if (shopIndex === 8) rn2(SHKTOOLS_NAME_COUNT);
    return sroom.fdoor ?? 0;
}

function stock_room_goodpos(sroom, sh, sx, sy) {
    const door = sroom?.doorct ? game.level?.doors?.[sh] : null;
    const loc = game.level?.at(sx, sy);
    if (!loc || !IS_ROOM(loc.typ)) return false;
    if (sroom.irregular) {
        const rmno = game.level.rooms.indexOf(sroom) + ROOMOFFSET;
        return !loc.edge && loc.roomno === rmno
            && (!door || distmin(sx, sy, door.x, door.y) > 1);
    }
    return !(door && ((sx === sroom.lx && door.x === sx - 1)
        || (sx === sroom.hx && door.x === sx + 1)
        || (sy === sroom.ly && door.y === sy - 1)
        || (sy === sroom.hy && door.y === sy + 1)));
}

function get_shop_item(shopIndex) {
    const probs = SHOP_ITEM_PROBS[shopIndex] || SHOP_ITEM_PROBS[0];
    let j = rnd(100);
    for (const entry of probs) {
        j -= entry.iprob;
        if (j <= 0) return entry.itype;
    }
    return probs[probs.length - 1].itype;
}

function mkshobj_at(shopIndex, sx, sy) {
    if (rn2(100) < depth_of_level(game.u?.uz) && !m_at(sx, sy)) {
        const ptr = mkclass_aligned('S_MIMIC', 0);
        if (ptr && makemon(ptr, sx, sy, 0)) return;
    }
    const atype = get_shop_item(shopIndex);
    if (atype < 0) mksobj_at(-atype, sx, sy, true, true);
    else mkobj_at(atype, sx, sy, true);
}

function obj_resists_discard_rng(obj) {
    if (!obj || obj.otyp === AMULET_OF_YENDOR
        || obj.otyp === SPE_BOOK_OF_THE_DEAD
        || obj.otyp === CANDELABRUM_OF_INVOCATION
        || obj.otyp === BELL_OF_OPENING) return true;
    return rn2(100) < (obj.oartifact ? 0 : 0);
}

function remove_orcus_shopkeeper(croom) {
    if (game._last_special_protofile !== 'orcus') return;
    const rmno = game.level.rooms.indexOf(croom) + ROOMOFFSET;
    const idx = (game.level?.monsters || []).findIndex(mon =>
        mon.isshk && ((game.level?.at(mon.mx, mon.my)?.roomno ?? 0) === rmno));
    if (idx < 0) return;
    const [shk] = game.level.monsters.splice(idx, 1);
    // C ref: shknam.c:stock_room() Orcus ghost-town hack calls mongone()
    // after stocking; inventory disposal checks obj_resists() for each item.
    for (const obj of shk.inventory || []) obj_resists_discard_rng(obj);
    // JS does not yet materialize the C shopkeeper capital/bill-admin
    // inventory, but mongone() discards those carried records too.
    rn2(100);
    rn2(100);
}

function stock_room(croom) {
    const shopIndex = croom.rtype - SHOPBASE;
    const sh = shkinit(shopIndex, croom);
    if (sh < 0) return;
    let stockcount = 0;
    for (let sx = croom.lx; sx <= croom.hx; sx++)
        for (let sy = croom.ly; sy <= croom.hy; sy++)
            if (stock_room_goodpos(croom, sh, sx, sy)) stockcount++;
    if (stockcount) rnd(stockcount);
    for (let sx = croom.lx; sx <= croom.hx; sx++)
        for (let sy = croom.ly; sy <= croom.hy; sy++)
            if (stock_room_goodpos(croom, sh, sx, sy))
                mkshobj_at(shopIndex, sx, sy);
    remove_orcus_shopkeeper(croom);
    game.level.flags.has_shop = true;
}

function fill_zoo(croom) {
    const type = croom.rtype;
    let goldlim = (type === ZOO || type === LEPREHALL) ? 500 * level_difficulty() : 0;
    const rmno = game.level.rooms.indexOf(croom) + ROOMOFFSET;
    const door = croom.doorct ? game.level.doors?.[croom.fdoor] : null;
    const beehiveQueenX = type === BEEHIVE ? croom.lx + Math.trunc((croom.hx - croom.lx + 1) / 2) : 0;
    const beehiveQueenY = type === BEEHIVE ? croom.ly + Math.trunc((croom.hy - croom.ly + 1) / 2) : 0;
    for (let sx = croom.lx; sx <= croom.hx; sx++)
        for (let sy = croom.ly; sy <= croom.hy; sy++) {
            const loc = game.level.at(sx, sy);
            if (croom.irregular) {
                if (!loc || loc.roomno !== rmno || loc.edge
                    || (door && distmin(sx, sy, door.x, door.y) <= 1))
                    continue;
            } else if (!SPACE_POS(loc?.typ)
                       || (door && ((sx === croom.lx && door.x === sx - 1)
                           || (sx === croom.hx && door.x === sx + 1)
                           || (sy === croom.ly && door.y === sy - 1)
                           || (sy === croom.hy && door.y === sy + 1)))) {
                continue;
            }

            let mdat = null;
            if (type === LEPREHALL) mdat = MONSTERS.find(m => m.name === 'LEPRECHAUN');
            else if (type === BARRACKS) mdat = squadmon();
            else if (type === MORGUE) mdat = morguemon();
            else if (type === BEEHIVE) {
                mdat = MONSTERS.find(m => m.name === (sx === beehiveQueenX && sy === beehiveQueenY
                    ? 'QUEEN_BEE'
                    : 'KILLER_BEE'));
            }
            makemon(mdat, sx, sy, MM_ASLEEP | MM_NOGRP);
            const mon = game.level.monsters?.[0];
            if (mon && mon.mx === sx && mon.my === sy) mon.msleeping = 1;

            if (type === ZOO || type === LEPREHALL) {
                let amountRange;
                if (door) {
                    amountRange = Math.pow(dist2(sx, sy, door.x, door.y), 2);
                } else {
                    amountRange = goldlim;
                }
                if (amountRange >= goldlim) amountRange = 5 * level_difficulty();
                goldlim -= amountRange;
                mkgold(rn1(amountRange, 10), sx, sy);
            } else if (type === BARRACKS) {
                if (!rn2(20)) {
                    mksobj_at(rn2(3) ? LARGE_BOX : CHEST, sx, sy, true, false);
                }
            } else if (type === MORGUE) {
                if (!rn2(5)) mkToptenCorpseAt(sx, sy);
                if (!rn2(10)) mksobj_at(rn2(3) ? LARGE_BOX : CHEST, sx, sy, true, false);
                if (!rn2(5)) make_grave(sx, sy, null);
            }
        }
}

function morguemon() {
    const i = rn2(100);
    const hd = rn2(level_difficulty());
    if (hd > 10 && i < 10) return mkclass_aligned('S_DEMON', 0);
    if (hd > 8 && i > 85) return mkclass_aligned('S_VAMPIRE', 0);
    if (i < 20) return MONSTERS.find(m => m.name === 'GHOST') || null;
    if (i < 40) return MONSTERS.find(m => m.name === 'WRAITH') || null;
    return mkclass_aligned('S_ZOMBIE', 0);
}

const TOPTEN_CORPSE_ROLES = [
    'ARCHEOLOGIST', 'BARBARIAN', 'CAVEMAN', 'HEALER', 'KNIGHT', 'MONK',
    'PRIEST', 'RANGER', 'ROGUE', 'SAMURAI', 'TOURIST', 'VALKYRIE', 'WIZARD',
];

function mkToptenCorpseAt(x, y) {
    // C ref: mkobj.c:mk_tt_object(CORPSE).
    const corpse = mksobj(CORPSE, true, true);
    rnd(10); // get_rnd_toptenentry()
    set_corpsenm_restart(corpse, monster_ptr(TOPTEN_CORPSE_ROLES[rn2(TOPTEN_CORPSE_ROLES.length)]));
    return place_object(corpse, x, y);
}

function squadmon() {
    const squadprob = [
        ['SOLDIER', 80],
        ['SERGEANT', 15],
        ['LIEUTENANT', 4],
        ['CAPTAIN', 1],
    ];
    const selProb = rnd(80 + level_difficulty());
    let cpro = 0;
    for (const [name, prob] of squadprob) {
        cpro += prob;
        if (cpro > selProb) return MONSTERS.find(m => m.name === name) || null;
    }
    const [name] = squadprob[rn2(squadprob.length)];
    return MONSTERS.find(m => m.name === name) || null;
}

function fill_special_room(croom) {
    if (!croom || croom.needfill === FILL_NONE) return;
    if (croom.needfill === FILL_NORMAL && croom.rtype === VAULT) {
        const amountRange = Math.abs(depth_of_level(game.u?.uz)) * 100;
        for (let x = croom.lx; x <= croom.hx; x++)
            for (let y = croom.ly; y <= croom.hy; y++)
                mkgold(rn1(amountRange, 51), x, y);
        game.level.flags.has_vault = true;
    } else if (croom.needfill === FILL_NORMAL
               && (croom.rtype === ZOO || croom.rtype === LEPREHALL
               || croom.rtype === BARRACKS || croom.rtype === MORGUE
               || croom.rtype === BEEHIVE)) {
        fill_zoo(croom);
        if (croom.rtype === ZOO) game.level.flags.has_zoo = true;
        if (croom.rtype === MORGUE) game.level.flags.has_morgue = true;
        if (croom.rtype === BEEHIVE) game.level.flags.has_beehive = true;
    } else if (croom.needfill === FILL_NORMAL && croom.rtype >= SHOPBASE) {
        stock_room(croom);
    }
    if (croom.rtype === VAULT) game.level.flags.has_vault = true;
    if (croom.rtype === ZOO) game.level.flags.has_zoo = true;
    if (croom.rtype === COURT) game.level.flags.has_court = true;
    if (croom.rtype === MORGUE) game.level.flags.has_morgue = true;
    if (croom.rtype === BEEHIVE) game.level.flags.has_beehive = true;
    if (croom.rtype === BARRACKS) game.level.flags.has_barracks = true;
    if (croom.rtype === TEMPLE) game.level.flags.has_temple = true;
}

// ============================================================
// Branch placement
// ============================================================

function is_branchlev() {
    const g = game;
    if (!g.branches) return null;
    for (const br of g.branches) {
        if (br?.end1?.dnum === (g.u?.uz?.dnum ?? 0) && br?.end1?.dlevel === (g.u?.uz?.dlevel ?? 1)) return br;
        if (br?.end2?.dnum === (g.u?.uz?.dnum ?? 0) && br?.end2?.dlevel === (g.u?.uz?.dlevel ?? 1)) return br;
    }
    return null;
}

function branch_to_dnum(branchp, dnum) {
    return !!branchp && dnum != null
        && (branchp.end1?.dnum === dnum || branchp.end2?.dnum === dnum);
}

function find_branch_room(mp) {
    const croom = generate_stairs_find_room();
    if (croom) somexyspace(croom, mp);
    return croom;
}

function place_branch(branchp, x = 0, y = 0) {
    const g = game;
    if (!branchp || g.made_branch) return;
    const mp = { x, y };
    if (!x) find_branch_room(mp);
    if (mp.x > 0) {
        const on_end1 = (branchp.end1?.dnum === g.u?.uz?.dnum
            && branchp.end1?.dlevel === g.u?.uz?.dlevel);
        const dest = on_end1 ? branchp.end2 : branchp.end1;
        if (branchp.type === 'portal') {
            mkportal(mp.x, mp.y, dest);
        } else {
            const goes_up = on_end1 ? !!branchp.end1_up : !branchp.end1_up;
            const loc = g.level?.at(mp.x, mp.y);
            if (loc) {
                loc.typ = STAIRS;
                loc.ladder = goes_up ? 1 : 2;
            }
            stairway_add(mp.x, mp.y, goes_up, false, dest || { dnum: 0, dlevel: 0 }, true);
            if (goes_up) g.level.upstair = { x: mp.x, y: mp.y };
            else g.level.dnstair = { x: mp.x, y: mp.y };
        }
    }
    g.made_branch = true;
}

function mkportal(x, y, dest) {
    // C ref: mkmaze.c:mkportal(); portal branches are floor traps, not stairs.
    const trap = maketrap(x, y, MAGIC_PORTAL);
    if (!trap) return null;
    trap.dst = { dnum: dest?.dnum ?? 0, dlevel: dest?.dlevel ?? 0 };
    return trap;
}

// ============================================================
// Wallification
// ============================================================

function isSolidTile(x, y) {
    if (!isok(x, y)) return true;
    return IS_STWALL(game.level?.at(x, y)?.typ ?? STONE);
}
function isWallOrStone(x, y) {
    if (!isok(x, y)) return 1;
    const typ = game.level?.at(x, y)?.typ ?? STONE;
    return (typ === STONE || isWallTile(x, y)) ? 1 : 0;
}
function isWallTile(x, y) {
    if (!isok(x, y)) return 0;
    const typ = game.level?.at(x, y)?.typ ?? STONE;
    return (IS_WALL(typ) || IS_DOOR(typ) || typ === LAVAWALL
        || typ === WATER || typ === SDOOR || typ === IRONBARS) ? 1 : 0;
}
function extend_spine(locale, wall_there, dx, dy) {
    const nx = 1 + dx, ny = 1 + dy;
    if (!wall_there) return 0;
    if (dx) {
        if (locale[1][0] && locale[1][2] && locale[nx][0] && locale[nx][2]) return 0;
        return 1;
    }
    if (locale[0][1] && locale[2][1] && locale[0][ny] && locale[2][ny]) return 0;
    return 1;
}
function wall_cleanup(x1, y1, x2, y2) {
    const map = game.level;
    if (!map) return;
    for (let x = x1; x <= x2; x++)
        for (let y = y1; y <= y2; y++) {
            const loc = map.at(x, y);
            const typ = loc?.typ ?? STONE;
            if (!(IS_WALL(typ) && typ !== DBWALL)) continue;
            if (isSolidTile(x-1,y-1) && isSolidTile(x-1,y) && isSolidTile(x-1,y+1)
                && isSolidTile(x,y-1) && isSolidTile(x,y+1)
                && isSolidTile(x+1,y-1) && isSolidTile(x+1,y) && isSolidTile(x+1,y+1))
                loc.typ = STONE;
        }
}
function fix_wall_spines(x1, y1, x2, y2) {
    const spineArray = [VWALL, HWALL, HWALL, HWALL,
        VWALL, TRCORNER, TLCORNER, TDWALL,
        VWALL, BRCORNER, BLCORNER, TUWALL,
        VWALL, TLWALL, TRWALL, CROSSWALL];
    const map = game.level;
    if (!map) return;
    for (let x = x1; x <= x2; x++)
        for (let y = y1; y <= y2; y++) {
            const loc = map.at(x, y);
            const typ = loc?.typ ?? STONE;
            if (!(IS_WALL(typ) && typ !== DBWALL)) continue;
            const locale = [
                [isWallOrStone(x-1,y-1), isWallOrStone(x-1,y), isWallOrStone(x-1,y+1)],
                [isWallOrStone(x,y-1), 0, isWallOrStone(x,y+1)],
                [isWallOrStone(x+1,y-1), isWallOrStone(x+1,y), isWallOrStone(x+1,y+1)],
            ];
            const bits = (extend_spine(locale, isWallTile(x,y-1), 0, -1) << 3)
                | (extend_spine(locale, isWallTile(x,y+1), 0, 1) << 2)
                | (extend_spine(locale, isWallTile(x+1,y), 1, 0) << 1)
                | extend_spine(locale, isWallTile(x-1,y), -1, 0);
            if (bits) loc.typ = spineArray[bits];
        }
}
function wallification(x1, y1, x2, y2) {
    wall_cleanup(x1, y1, x2, y2);
    fix_wall_spines(x1, y1, x2, y2);
}

// ============================================================
// Fill ordinary room
// ============================================================

function traptype_rnd() {
    // C ref: mklev.c:traptype_rnd().
    const lvl = level_difficulty();
    let kind = rnd(TRAPNUM - 1);
    switch (kind) {
    case TRAPPED_DOOR: case TRAPPED_CHEST: case MAGIC_PORTAL: case VIBRATING_SQUARE:
        kind = NO_TRAP; break;
    case ROLLING_BOULDER_TRAP: case SLP_GAS_TRAP:
        if (lvl < 2) kind = NO_TRAP; break;
    case LEVEL_TELEP:
        if (lvl < 5 || game.level?.flags?.noteleport) kind = NO_TRAP; break;
    case SPIKED_PIT:
        if (lvl < 5) kind = NO_TRAP; break;
    case LANDMINE:
        if (lvl < 6) kind = NO_TRAP; break;
    case WEB:
        if (lvl < 7) kind = NO_TRAP; break;
    case STATUE_TRAP: case POLY_TRAP:
        if (lvl < 8) kind = NO_TRAP; break;
    case FIRE_TRAP:
        kind = NO_TRAP; break; // not hellish
    case TELEP_TRAP:
        if (game.level?.flags?.noteleport) kind = NO_TRAP; break;
    case HOLE:
        if (rn2(7)) kind = NO_TRAP; break;
    }
    return kind;
}

function find_okay_roompos(croom, crd) {
    let tryct = 0;
    do {
        if (++tryct > 200) return false;
        if (!somexyspace(croom, crd)) return false;
    } while (occupied(crd.x, crd.y) || bydoor(crd.x, crd.y));
    return true;
}

function mktrap_victim(trap) {
    const lvl = level_difficulty();
    const kind = trap.ttyp;
    const x = trap.tx, y = trap.ty;
    // Object based on trap type
    let otmp = null;
    switch (kind) {
    case ARROW_TRAP: otmp = mksobj(ARROW, true, false); break;
    case DART_TRAP: otmp = mksobj(DART, true, false); break;
    case ROCKTRAP: otmp = mksobj(ROCK, true, false); break;
    default: break;
    }
    if (otmp) place_object(otmp, x, y);
    // Random items on victim
    do {
        const cls = [WEAPON_CLASS, TOOL_CLASS, FOOD_CLASS, GEM_CLASS][rn2(4)];
        otmp = mkobj(cls, false);
        curse(otmp);
        place_object(otmp, x, y);
    } while (!rn2(5));
    // Victim type
    const PM_ELF = 18, PM_DWARF = 19, PM_ORC = 20, PM_GNOME = 21, PM_HUMAN = 22;
    const victimCorpseStats = new Map([
        [PM_ELF, { cwt: 800, cnutrit: 350 }],
        [PM_DWARF, { cwt: 900, cnutrit: 300 }],
        [PM_ORC, { cwt: 850, cnutrit: 350 }],
        [PM_GNOME, { cwt: 650, cnutrit: 100 }],
        [PM_HUMAN, { cwt: 1450, cnutrit: 400 }],
    ]);
    // C consumes rn2(PM_WIZARD - PM_ARCHEOLOGIST) here. Local monster ids
    // are still placeholders, so keep the upstream role-monster range shape.
    const PM_ARCHEOLOGIST = 0, ROLE_MONSTER_RANGE_BEFORE_WIZARD = 12;
    let victim_mnum;
    switch (rn2(15)) {
    case 0:
        victim_mnum = PM_ELF;
        if (kind === SLP_GAS_TRAP && !(lvl <= 2 && rn2(2))) victim_mnum = PM_HUMAN;
        break;
    case 1: case 2: victim_mnum = PM_DWARF; break;
    case 3: case 4: case 5: victim_mnum = PM_ORC; break;
    case 6: case 7: case 8: case 9:
        victim_mnum = PM_GNOME;
        if (!rn2(10)) {
            otmp = mksobj(rn2(4) ? TALLOW_CANDLE : WAX_CANDLE, true, false);
            curse(otmp);
            place_object(otmp, x, y);
        }
        break;
    default: victim_mnum = PM_HUMAN; break;
    }
    if (victim_mnum === PM_HUMAN && rn2(25))
        victim_mnum = rn1(ROLE_MONSTER_RANGE_BEFORE_WIZARD, PM_ARCHEOLOGIST);
    const corpse = mkcorpstat(CORPSE, null, victim_mnum, x, y, 8); // CORPSTAT_INIT
    if (corpse) {
        corpse.trap_victim = true;
        const stats = victimCorpseStats.get(victim_mnum);
        if (stats) {
            corpse.corpse_cwt = stats.cwt;
            corpse.corpse_cnutrit = stats.cnutrit;
        }
    }
}

async function mktrap_room(croom) {
    let kind;
    do { kind = traptype_rnd(); } while (kind === NO_TRAP);
    const dungeon = game.dungeons?.[game.u?.uz?.dnum ?? 0];
    const canFallThru = (game.u?.uz?.dlevel ?? 1) < (dungeon?.num_dunlevs ?? 1);
    if (is_hole(kind) && !canFallThru) kind = ROCKTRAP;
    const pos = { x: 0, y: 0 };
    if (!somexyspace(croom, pos)) return;
    const trap = await maketrap(pos.x, pos.y, kind);
    kind = trap ? trap.ttyp : NO_TRAP;
    if (kind === WEB) {
        // C ref: mklev.c:mktrap() creates a web's guarding spider before
        // the trap victim gate.
        makemon(monster_ptr('GIANT_SPIDER'), trap.tx, trap.ty, 0);
    }
    const lvl = level_difficulty();
    if (game.in_mklev && kind !== NO_TRAP
        && lvl <= rnd(4)
        && kind !== SQKY_BOARD && kind !== RUST_TRAP
        && !(kind === ROLLING_BOULDER_TRAP && trap.launch?.x === trap.tx && trap.launch?.y === trap.ty)
        && !is_pit(kind) && (kind < HOLE || kind === MAGIC_TRAP)) {
        if (kind === LANDMINE) { trap.ttyp = PIT; trap.tseen = true; }
        mktrap_victim(trap);
    }
}

function mkfount(croom) {
    const pos = { x: 0, y: 0 };
    if (!find_okay_roompos(croom, pos)) return;
    const loc = game.level?.at(pos.x, pos.y);
    if (loc) {
        loc.typ = FOUNTAIN;
        if (!rn2(7)) loc.blessedftn = 1;
        game.level.flags.nfountains++;
    }
}

function mkaltar(croom) {
    if (!croom || croom.rtype !== OROOM) return;
    const pos = { x: 0, y: 0 };
    if (!find_okay_roompos(croom, pos)) return;
    const loc = game.level?.at(pos.x, pos.y);
    if (!loc) return;
    loc.typ = ALTAR;
    const al = rn2(A_LAWFUL + 2) - 1;
    loc.flags = Align2amask(al);
}

function mkgrave_room(croom) {
    if (croom.rtype !== OROOM) return;
    const dobell = !rn2(10);
    const pos = { x: 0, y: 0 };
    if (!find_okay_roompos(croom, pos)) return;
    make_grave(pos.x, pos.y, dobell ? 'Saved by the bell!' : null);
    if (!rn2(3)) {
        const gold = mksobj(GOLD_PIECE, true, false);
        if (gold) {
            const depth = game.u?.uz?.dlevel ?? 1;
            gold.quan = rnd(20) + depth * rnd(5);
        }
    }
    for (let tryct = rn2(5); tryct > 0; tryct--) {
        const otmp = mkobj(RANDOM_CLASS, true);
        curse(otmp);
    }
    if (dobell) mksobj_at(BELL, pos.x, pos.y, true, false);
}

async function fill_ordinary_room(croom, bonus_items) {
    const g = game;
    if (!croom || (croom.rtype !== OROOM && croom.rtype !== THEMEROOM)) return;

    // C ref: mklev.c:955 — Fill subrooms first
    if (croom.sbrooms) {
        for (const subroom of croom.sbrooms) {
            await fill_ordinary_room(subroom, false);
        }
    }

    if (croom.needfill !== FILL_NORMAL) return;

    const pos = { x: 0, y: 0 };
    // Sleeping monster (33%)
    if (!rn2(3) && somexyspace(croom, pos)) {
        await makemon(null, pos.x, pos.y, MM_NOGRP);
    }
    // Traps
    const u_depth = g.u?.uz?.dlevel ?? 1;
    let x = 8 - Math.trunc(u_depth / 6);
    if (x <= 1) x = 2;
    let trycnt = 0;
    while (!rn2(x) && ++trycnt < 1000) {
        await mktrap_room(croom);
    }
    // Gold
    if (!rn2(3) && somexyspace(croom, pos)) {
        mkgold(0, pos.x, pos.y);
    }
    // Fountain
    if (!rn2(10)) mkfount(croom);
    // Sink
    if (!rn2(60)) {
        if (find_okay_roompos(croom, pos)) {
            const loc = g.level?.at(pos.x, pos.y);
            if (loc) { loc.typ = SINK; g.level.flags.nsinks = (g.level.flags.nsinks || 0) + 1; }
        }
    }
    // Altar
    if (!rn2(60)) mkaltar(croom);
    // Grave
    x = 80 - (u_depth * 2);
    if (x < 2) x = 2;
    if (!rn2(x)) mkgrave_room(croom);
    // Statue
    if (!rn2(20) && somexyspace(croom, pos)) {
        mkcorpstat(STATUE, null, null, pos.x, pos.y, 8);
    }
    // Bonus items
    let skip_chests = false;
    if (bonus_items && somexyspace(croom, pos)) {
        const branchp = is_branchlev();
        const mines_dnum = g.mines_dnum;
        const oracle_dlevel = g.oracle_level?.dlevel ?? 5;
        if (branchp && mines_dnum != null && (g.u?.uz?.dnum ?? 0) !== mines_dnum
            && branch_to_dnum(branchp, mines_dnum)) {
            // Mines entrance bonus food
            mksobj_at((rn2(5) < 3) ? FOOD_RATION : rn2(2) ? CRAM_RATION : LEMBAS_WAFER,
                pos.x, pos.y, true, false);
        } else if (g.u?.uz?.dnum === 0 && (g.u?.uz?.dlevel ?? 1) < oracle_dlevel && rn2(3)) {
            // Supply chest
            const supply_chest = mksobj_at(rn2(3) ? CHEST : LARGE_BOX, pos.x, pos.y, false, false);
            if (supply_chest) {
                supply_chest.olocked = !!rn2(6);
                let tryct2 = 0;
                let cursed_item;
                do {
                    let otyp;
                    const supply_items = [POT_EXTRA_HEALING, POT_SPEED, POT_GAIN_ENERGY,
                        SCR_ENCHANT_WEAPON, SCR_ENCHANT_ARMOR, SCR_CONFUSE_MONSTER,
                        SCR_SCARE_MONSTER, WAN_DIGGING, SPE_HEALING];
                    if (rn2(2)) otyp = POT_HEALING;
                    else otyp = supply_items[rn2(supply_items.length)];
                    const otmp = mksobj(otyp, true, false);
                    if (otmp && otyp === POT_HEALING && rn2(2)) {
                        otmp.quan = 2;
                    }
                    cursed_item = otmp?.cursed ?? false;
                    if (++tryct2 >= 50) break;
                } while (cursed_item || !rn2(5));
                if (rn2(3)) {
                    const extra_classes = [FOOD_CLASS, WEAPON_CLASS, ARMOR_CLASS, GEM_CLASS,
                        SCROLL_CLASS, POTION_CLASS, RING_CLASS,
                        SPBOOK_no_NOVEL, SPBOOK_no_NOVEL, SPBOOK_no_NOVEL];
                    const oclass = extra_classes[rn2(extra_classes.length)];
                    let otmp = mkobj(oclass, false);
                    if (oclass === SPBOOK_no_NOVEL && otmp) {
                        const depth = g.u?.uz?.dlevel ?? 1;
                        const maxpass = (depth > 2) ? 2 : 3;
                        for (let pass = 1; pass <= maxpass; pass++) {
                            mkobj(oclass, false);
                        }
                    }
                }
            }
            skip_chests = true;
        }
    }
    // Box/chest check
    if (!skip_chests && !rn2(Math.trunc(g.level.nroom * 5 / 2)) && somexyspace(croom, pos)) {
        mksobj_at(rn2(3) ? LARGE_BOX : CHEST, pos.x, pos.y, true, false);
    }
    // Graffiti
    const depth = g.u?.uz?.dlevel ?? 1;
    if (!rn2(27 + 3 * Math.abs(depth))) {
        const { text: engrText, pristine } = randomEngraving();
        if (engrText) {
            do {
                somexyspace(croom, pos);
                if (g.level?.at(pos.x, pos.y)?.typ === ROOM) break;
            } while (!rn2(40));
            if (g.level?.at(pos.x, pos.y)?.typ === ROOM) {
                make_engr_at(pos.x, pos.y, engrText, pristine, 0, ENGR_MARK);
            }
        }
    }
    // Random objects
    if (!rn2(3) && somexyspace(croom, pos)) {
        mkobj_at(RANDOM_CLASS, pos.x, pos.y, true);
        let objTrycnt = 0;
        while (!rn2(5)) {
            if (++objTrycnt > 100) break;
            if (somexyspace(croom, pos)) mkobj_at(RANDOM_CLASS, pos.x, pos.y, true);
        }
    }
}

// ============================================================
// Mineralize
// ============================================================

function water_has_kelp(x, y, kelp_pool, kelp_moat) {
    const loc = game.level.at(x, y);
    if (!loc) return false;
    if (kelp_pool && (loc.typ === POOL || loc.typ === WATER) && !rn2(kelp_pool)) return true;
    if (kelp_moat && loc.typ === MOAT && !rn2(kelp_moat)) return true;
    return false;
}

function mineralize_kelp(kelp_pool, kelp_moat) {
    if (kelp_pool < 0) kelp_pool = 10;
    if (kelp_moat < 0) kelp_moat = 30;
    for (let x = 2; x < COLNO - 2; x++)
        for (let y = 1; y < ROWNO - 1; y++)
            if (water_has_kelp(x, y, kelp_pool, kelp_moat))
                mksobj_at(KELP_FROND, x, y, true, false);
}

function mineralize(kelp_pool, kelp_moat, goldprob, gemprob, skip_lvl_checks) {
    const map = game.level;
    mineralize_kelp(kelp_pool, kelp_moat);
    const sp = currentSpecialLevel();
    if (!skip_lvl_checks && sp?.proto && sp.proto !== 'oracle'
        && sp.proto !== 'minend' && !String(sp.proto).startsWith('minend-')) return;
    const absDepth = depth_of_level(game.u?.uz);
    const dunLevel = game.u?.uz?.dlevel ?? 1;
    if (goldprob < 0) goldprob = 20 + Math.trunc(absDepth / 3);
    if (gemprob < 0) gemprob = Math.trunc(goldprob / 4);
    if (!skip_lvl_checks) {
        if (In_mines(game.u?.uz)) {
            goldprob *= 2;
            gemprob *= 3;
        } else if (game.quest_dnum != null && game.u?.uz?.dnum === game.quest_dnum) {
            goldprob = Math.trunc(goldprob / 4);
            gemprob = Math.trunc(gemprob / 6);
        }
    }
    for (let x = 2; x < COLNO - 2; x++) {
        for (let y = 1; y < ROWNO - 1; y++) {
            const loc = map.at(x, y);
            const locBelow = map.at(x, y + 1);
            if (!loc || !locBelow) continue;
            if (locBelow.typ !== STONE) { y += 2; continue; }
            if (loc.typ !== STONE) { y += 1; continue; }
            const n = (d) => { const l = map.at(x + d[0], y + d[1]); return l && l.typ === STONE; };
            if (!(loc.wall_info & W_NONDIGGABLE)
                && n([0,-1]) && n([1,-1]) && n([-1,-1])
                && n([1,0]) && n([-1,0])
                && n([1,1]) && n([-1,1])) {
                if (rn2(1000) < goldprob) {
                    const otmp = mksobj(GOLD_PIECE, false, false);
                    otmp.quan = 1 + rnd(goldprob * 3);
                    if (!rn2(3)) {
                        // Buried object chain is not modeled yet.
                    } else {
                        place_object(otmp, x, y);
                    }
                }
                if (rn2(1000) < gemprob) {
                    const cnt = rnd(2 + Math.trunc(dunLevel / 3));
                    for (let i = 0; i < cnt; i++) {
                        const otmp = mkobj(GEM_CLASS, false);
                        if (otmp?.otyp !== ROCK) {
                            if (!rn2(3)) {
                                // Buried object chain is not modeled yet.
                            } else {
                                place_object(otmp, x, y);
                            }
                        }
                    }
                }
            }
        }
    }
}

// ============================================================
// Level finalize topology
// ============================================================

function get_level_extends() {
    const map = game.level;
    let xmin = 0, xmax = COLNO - 1, ymin = 0, ymax = ROWNO - 1;
    let found = false, nonwall = false;
    for (xmin = 0; !found && xmin <= COLNO - 1; xmin++) {
        for (let y = 0; y <= ROWNO - 1; y++) {
            const typ = map.at(xmin, y)?.typ ?? STONE;
            if (typ !== STONE) { found = true; if (!IS_WALL(typ)) nonwall = true; }
        }
    }
    xmin -= (nonwall || !game.level?.flags?.is_maze_lev) ? 2 : 1;
    found = false; nonwall = false;
    for (xmax = COLNO - 1; !found && xmax >= 0; xmax--) {
        for (let y = 0; y <= ROWNO - 1; y++) {
            const typ = map.at(xmax, y)?.typ ?? STONE;
            if (typ !== STONE) { found = true; if (!IS_WALL(typ)) nonwall = true; }
        }
    }
    xmax += (nonwall || !game.level?.flags?.is_maze_lev) ? 2 : 1;
    found = false; nonwall = false;
    for (ymin = 0; !found && ymin <= ROWNO - 1; ymin++) {
        for (let x = xmin; x <= xmax; x++) {
            const typ = map.at(x, ymin)?.typ ?? STONE;
            if (typ !== STONE) { found = true; if (!IS_WALL(typ)) nonwall = true; }
        }
    }
    ymin -= (nonwall || !game.level?.flags?.is_maze_lev) ? 2 : 1;
    found = false; nonwall = false;
    for (ymax = ROWNO - 1; !found && ymax >= 0; ymax--) {
        for (let x = xmin; x <= xmax; x++) {
            const typ = map.at(x, ymax)?.typ ?? STONE;
            if (typ !== STONE) { found = true; if (!IS_WALL(typ)) nonwall = true; }
        }
    }
    ymax += (nonwall || !game.level?.flags?.is_maze_lev) ? 2 : 1;
    return { xmin, xmax, ymin, ymax };
}

function bound_digging() {
    const map = game.level;
    const { xmin, xmax, ymin, ymax } = get_level_extends();
    for (let x = 0; x < COLNO; x++)
        for (let y = 0; y < ROWNO; y++) {
            const loc = map.at(x, y);
            if (!loc) continue;
            if (IS_STWALL(loc.typ) && (y <= ymin || y >= ymax || x <= xmin || x >= xmax)) {
                loc.wall_info = (loc.wall_info || 0) | W_NONDIGGABLE;
            }
        }
}

function set_wall_state() { /* no-op for contest */ }

function level_finalize_topology() {
    bound_digging();
    mineralize(-1, -1, -1, -1, false);
    game.in_mklev = false;
    if (!game.level?.flags?.is_maze_lev) {
        const nroom = game.level?.nroom ?? 0;
        for (let i = 0; i < nroom; i++)
            topologize(game.level.rooms?.[i]);
    }
    set_wall_state();
    const rooms = game.level?.rooms ?? [];
    for (let i = 0; i < rooms.length; i++) {
        const rm = rooms[i];
        if (rm && rm.rtype != null) rm.orig_rtype = rm.rtype;
    }
}
