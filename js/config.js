// config.js -- Game constants and configuration
// Mirrors constants from include/hack.h, include/global.h, include/rm.h

import { COMMIT_NUMBER } from './version.js';

// Version (patchlevel.h)
export const VERSION_MAJOR = 3;
export const VERSION_MINOR = 7;
export const PATCHLEVEL = 0;
export const VERSION_STRING = `NetHack ${VERSION_MAJOR}.${VERSION_MINOR}.${PATCHLEVEL} Royal Jelly #${COMMIT_NUMBER} — vibe-coded by The Hive`;

// Map dimensions (global.h)
export const COLNO = 80;   // number of columns
export const ROWNO = 21;   // number of rows (map area)

// Display dimensions
export const TERMINAL_COLS = 80;
export const TERMINAL_ROWS = 24;  // message + map + 2 status lines
export const MESSAGE_ROW = 0;
export const MAP_ROW_START = 1;
export const STATUS_ROW_1 = 22;
export const STATUS_ROW_2 = 23;

// Level location types (rm.h:55-97)
export const STONE = 0;
export const VWALL = 1;
export const HWALL = 2;
export const TLCORNER = 3;
export const TRCORNER = 4;
export const BLCORNER = 5;
export const BRCORNER = 6;
export const CROSSWALL = 7;
export const TUWALL = 8;
export const TDWALL = 9;
export const TLWALL = 10;
export const TRWALL = 11;
export const DBWALL = 12;
export const TREE = 13;
export const SDOOR = 14;
export const SCORR = 15;
export const POOL = 16;
export const MOAT = 17;
export const WATER = 18;
export const DRAWBRIDGE_UP = 19;
export const LAVAPOOL = 20;
export const LAVAWALL = 21;
export const IRONBARS = 22;
export const DOOR = 23;
export const CORR = 24;
export const ROOM = 25;
export const STAIRS = 26;
export const LADDER = 27;
export const FOUNTAIN = 28;
export const THRONE = 29;
export const SINK = 30;
export const GRAVE = 31;
export const ALTAR = 32;
export const ICE = 33;
export const DRAWBRIDGE_DOWN = 34;
export const AIR = 35;
export const CLOUD = 36;
export const MAX_TYPE = 37;

// Door states (rm.h)
export const D_NODOOR = 0;
export const D_BROKEN = 1;
export const D_ISOPEN = 2;
export const D_CLOSED = 4;
export const D_LOCKED = 8;
export const D_TRAPPED = 16;
export const D_SECRET = 32;

// Movement speed (hack.h)
export const NORMAL_SPEED = 12;

// Direction arrays (decl.h, hack.c)
// Index: 0=W, 1=NW, 2=N, 3=NE, 4=E, 5=SE, 6=S, 7=SW, 8=up, 9=down
export const xdir = [-1, -1,  0,  1,  1,  1,  0, -1, 0,  0];
export const ydir = [ 0, -1, -1, -1,  0,  1,  1,  1, 0,  0];
export const zdir = [0, 0, 0, 0, 0, 0, 0, 0, 1, -1];

// Direction constants
export const DIR_W = 0;
export const DIR_NW = 1;
export const DIR_N = 2;
export const DIR_NE = 3;
export const DIR_E = 4;
export const DIR_SE = 5;
export const DIR_S = 6;
export const DIR_SW = 7;
export const DIR_UP = 8;
export const DIR_DOWN = 9;
export const N_DIRS = 8;
export function DIR_180(dir) { return (dir + 4) % N_DIRS; }

// Encumbrance levels (hack.h)
export const UNENCUMBERED = 0;
export const SLT_ENCUMBER = 1;
export const MOD_ENCUMBER = 2;
export const HVY_ENCUMBER = 3;
export const EXT_ENCUMBER = 4;
export const OVERLOADED = 5;

// Alignment (align.h)
export const A_NONE = -128;
export const A_CHAOTIC = -1;
export const A_NEUTRAL = 0;
export const A_LAWFUL = 1;

// Altar mask bits (C ref: align.h:29-37, rm.h:179)
export const AM_NONE = 0x00;
export const AM_CHAOTIC = 0x01;
export const AM_NEUTRAL = 0x02;
export const AM_LAWFUL = 0x04;
export const AM_MASK = 0x07;
export const AM_SHRINE = 0x08;
export const AM_SANCTUM = 0x10;

// C ref: align.h Align2amask / Amask2align
export function Align2amask(x) {
    if (x === A_NONE) return AM_NONE;
    if (x === A_LAWFUL) return AM_LAWFUL;
    return (x + 2) & 0xff; // A_NEUTRAL(0)->2, A_CHAOTIC(-1)->1
}
export function Amask2align(x) {
    const masked = x & AM_MASK;
    if (masked === 0) return A_NONE;
    if (masked === AM_LAWFUL) return A_LAWFUL;
    return masked - 2; // 2->0 (NEUTRAL), 1->-1 (CHAOTIC)
}

// Gender
export const MALE = 0;
export const FEMALE = 1;
export const NEUTER = 2;

// Races
export const RACE_HUMAN = 0;
export const RACE_ELF = 1;
export const RACE_DWARF = 2;
export const RACE_GNOME = 3;
export const RACE_ORC = 4;

// Roles (role.c) - just the basic set for initial implementation
export const PM_ARCHEOLOGIST = 0;
export const PM_BARBARIAN = 1;
export const PM_CAVEMAN = 2;
export const PM_HEALER = 3;
export const PM_KNIGHT = 4;
export const PM_MONK = 5;
export const PM_PRIEST = 6;
export const PM_ROGUE = 7;  // Swapped with Ranger to match roles array order
export const PM_RANGER = 8;
export const PM_SAMURAI = 9;
export const PM_TOURIST = 10;
export const PM_VALKYRIE = 11;
export const PM_WIZARD = 12;

// Attributes (attrib.h)
export const A_STR = 0;
export const A_INT = 1;
export const A_WIS = 2;
export const A_DEX = 3;
export const A_CON = 4;
export const A_CHA = 5;
export const NUM_ATTRS = 6;

// Room types (mkroom.h)
export const OROOM = 0;
export const THEMEROOM = 1;
export const COURT = 2;
export const SWAMP = 3;
export const VAULT = 4;
export const BEEHIVE = 5;
export const MORGUE = 6;
export const BARRACKS = 7;
export const ZOO = 8;
export const DELPHI = 9;
export const TEMPLE = 10;
export const LEPREHALL = 11;
export const COCKNEST = 12;
export const ANTHOLE = 13;
export const SHOPBASE = 14;

// Window types (wintype.h)
export const NHW_MESSAGE = 1;
export const NHW_STATUS = 2;
export const NHW_MAP = 3;
export const NHW_MENU = 4;
export const NHW_TEXT = 5;

// Maximum values
export const MAXNROFROOMS = 40;
export const MAXDUNGEON = 16;
export const MAXLEVEL = 32;
export const MAXOCLASSES = 18;
export const MAXMCLASSES = 34;
export const ROOMOFFSET = 3;

// Check if position is within map bounds
// C ref: cmd.c isok() — x >= 1 && x <= COLNO-1 && y >= 0 && y <= ROWNO-1
export function isok(x, y) {
    return x >= 1 && x <= COLNO - 1 && y >= 0 && y <= ROWNO - 1;
}

// Check terrain type helpers (rm.h)
export function IS_WALL(typ) {
    // C ref: rm.h — IS_WALL(typ) ((typ) && (typ) <= DBWALL)
    return typ >= VWALL && typ <= DBWALL;
}
export function IS_STWALL(typ) {
    return typ <= DBWALL; // includes STONE and all wall types
}
export function IS_ROCK(typ) {
    return typ < POOL;
}
export function IS_DOOR(typ) {
    return typ === DOOR;
}
export function IS_ROOM(typ) {
    // C ref: rm.h -- #define IS_ROOM(typ) ((typ) >= ROOM)
    return typ >= ROOM;
}
export function IS_FURNITURE(typ) {
    return typ >= STAIRS && typ <= ALTAR;
}
export function ACCESSIBLE(typ) {
    // C ref: rm.h -- #define ACCESSIBLE(typ) ((typ) >= DOOR)
    return typ >= DOOR;
}
export function IS_POOL(typ) {
    // C ref: rm.h — IS_POOL(typ) ((typ) >= POOL && (typ) <= DRAWBRIDGE_UP)
    return typ >= POOL && typ <= DRAWBRIDGE_UP;
}
export function IS_LAVA(typ) {
    // C ref: rm.h — IS_LAVA(typ) ((typ) == LAVAPOOL || (typ) == LAVAWALL)
    return typ === LAVAPOOL || typ === LAVAWALL;
}
export function IS_OBSTRUCTED(typ) {
    // C ref: rm.h — IS_OBSTRUCTED(typ) ((typ) < POOL)
    return typ < POOL;
}
export function IS_DRAWBRIDGE(typ) {
    // C ref: rm.h — IS_DRAWBRIDGE(typ) ((typ) == DRAWBRIDGE_UP || (typ) == DRAWBRIDGE_DOWN)
    return typ === DRAWBRIDGE_UP || typ === DRAWBRIDGE_DOWN;
}
export function IS_WATERWALL(typ) {
    // C ref: rm.h — IS_WATERWALL(typ) ((typ) == WATER)
    return typ === WATER;
}

// Drawbridge mask bits (rm.h:269-282)
export const DB_NORTH = 0;
export const DB_SOUTH = 1;
export const DB_EAST = 2;
export const DB_WEST = 3;
export const DB_DIR = 3;    // mask for direction
export const DB_MOAT = 0;
export const DB_LAVA = 4;
export const DB_ICE = 8;
export const DB_FLOOR = 16;
export const DB_UNDER = 28; // mask for underneath

// Trap types (trap.h)
export const ALL_TRAPS = -1;
export const NO_TRAP = 0;
export const ARROW_TRAP = 1;
export const DART_TRAP = 2;
export const ROCKTRAP = 3;
export const SQKY_BOARD = 4;
export const BEAR_TRAP = 5;
export const LANDMINE = 6;
export const ROLLING_BOULDER_TRAP = 7;
export const SLP_GAS_TRAP = 8;
export const RUST_TRAP = 9;
export const FIRE_TRAP = 10;
export const PIT = 11;
export const SPIKED_PIT = 12;
export const HOLE = 13;
export const TRAPDOOR = 14;
export const TELEP_TRAP = 15;
export const LEVEL_TELEP = 16;
export const MAGIC_PORTAL = 17;
export const WEB = 18;
export const STATUE_TRAP = 19;
export const MAGIC_TRAP = 20;
export const ANTI_MAGIC = 21;
export const POLY_TRAP = 22;
export const VIBRATING_SQUARE = 23;
export const TRAPPED_DOOR = 24;
export const TRAPPED_CHEST = 25;
export const TRAPNUM = 26;

// Trap helpers (trap.h)
export function is_pit(ttyp) { return ttyp === PIT || ttyp === SPIKED_PIT; }
export function is_hole(ttyp) { return ttyp === HOLE || ttyp === TRAPDOOR; }

// Trap flags for mktrap
export const MKTRAP_NOFLAGS = 0;
export const MKTRAP_SEEN = 0x01;
export const MKTRAP_MAZEFLAG = 0x02;
export const MKTRAP_NOSPIDERONWEB = 0x04;
export const MKTRAP_NOVICTIM = 0x08;

// Intrinsic property indices (prop.h)
// C ref: include/prop.h — enum for you.uprops[] indices
export const FIRE_RES = 0;
export const COLD_RES = 1;
export const SLEEP_RES = 2;
export const DISINT_RES = 3;
export const SHOCK_RES = 4;
export const POISON_RES = 5;
export const ACID_RES = 6;
export const STONE_RES = 7;
export const DRAIN_RES = 8;
export const SICK_RES = 9;
export const INVULNERABLE = 10;
export const ANTIMAGIC = 11;
export const PROP_INDEX_START_ABILITIES = 12; // marker
export const STUNNED = 12;
export const CONFUSION = 13;
export const BLINDED = 14;
export const DEAF = 15;
export const SICK = 16;
export const STONED = 17;
export const STRANGLED = 18;
export const VOMITING = 19;
export const GLIB = 20;
export const SLIMED = 21;
export const HALLUC = 22;
export const HALLUC_RES = 23;
export const FUMBLING = 24;
export const WOUNDED_LEGS = 25;
export const SLEEPING = 26;
export const HUNGER = 27;
export const FAST = 28;
export const WARN_OF_MON = 29;
export const WARNING = 30;
export const SEARCHING = 31;
export const SEE_INVIS = 32;
export const INVIS = 33;
export const TELEPORT = 34;
export const TELEPORT_CONTROL = 35;
export const POLYMORPH = 36;
export const POLYMORPH_CONTROL = 37;
export const LEVITATION = 38;
export const STEALTH = 39;
export const AGGRAVATE_MONSTER = 40;
export const CONFLICT = 41;
export const PROTECTION = 42;
export const PROT_FROM_SHAPE_CHANGERS = 43;
export const DETECT_MONSTERS = 44;
export const ENERGY_REGENERATION = 45;
export const HALF_SPDAM = 46;
export const HALF_PHDAM = 47;
export const REGENERATION = 48;
export const TELEPAT = 49;
export const INFRAVISION = 50;
export const CLAIRVOYANT = 51;
export const FLYING = 52;
export const WATERPROOF = 53;
export const SWIMMING = 54;
export const FREE_ACTION = 55;
export const FIXED_ABIL = 56;
export const LIFESAVED = 57;
export const DISPLACED = 58;
export const UNCHANGING = 59;
export const REFLECTING = 60;
export const MAGICAL_BREATHING = 61;
export const PASSES_WALLS = 62;
export const SLOW_DIGESTION = 63;
export const LAST_PROP = 63;

// Intrinsic bitmask constants (prop.h)
// C ref: include/prop.h — bitmask for intrinsic field
export const TIMEOUT = 0x00FFFFFF;     // timeout portion of intrinsic
export const FROM_ROLE = 0x01000000;   // from role
export const FROM_RACE = 0x02000000;   // from race
export const FROM_FORM = 0x04000000;   // from polymorph form
export const FROMOUTSIDE = 0x08000000; // from outside source (corpse, potion)
export const INTRINSIC = 0x10000000;   // generic intrinsic bit
export const I_SPECIAL = 0x20000000;   // property-specific flag

// Sickness types (C ref: you.h usick_type)
export const SICK_VOMITABLE = 0x01;    // food poisoning
export const SICK_NONVOMITABLE = 0x02; // illness (from corpse, etc.)
