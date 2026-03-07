/**
 * const.js — Rogue 3.6 constants from rogue.h
 */

// Maximum number of different things
export const MAXROOMS = 9;
export const MAXTHINGS = 9;
export const MAXOBJ = 9;
export const MAXPACK = 23;
export const MAXTRAPS = 10;
export const NUMTHINGS = 7;

// return values for get functions
export const NORM = 0;
export const QUIT = 1;
export const MINUS = 2;

// Things that appear on the screens
export const PASSAGE = '#';
export const DOOR = '+';
export const FLOOR = '.';
export const PLAYER = '@';
export const TRAP = '^';
export const TRAPDOOR = '>';
export const ARROWTRAP = '{';
export const SLEEPTRAP = '$';
export const BEARTRAP = '}';
export const TELTRAP = '~';
export const DARTTRAP = '`';
export const SECRETDOOR = '&';
export const STAIRS = '%';
export const GOLD = '*';
export const POTION = '!';
export const SCROLL = '?';
export const MAGIC = '$';
export const FOOD = ':';
export const WEAPON = ')';
export const ARMOR = ']';
export const AMULET = ',';
export const RING = '=';
export const STICK = '/';
export const CALLABLE = -1;

// Various constants
export const BEARTIME = 3;
export const SLEEPTIME = 5;
export const HEALTIME = 30;
export const HOLDTIME = 2;
export const STPOS = 0;
export const WANDERTIME = 70;
export const BEFORE = 1;
export const AFTER = 2;
export const HUHDURATION = 20;
export const SEEDURATION = 850;
export const HUNGERTIME = 1300;
export const MORETIME = 150;
export const STOMACHSIZE = 2000;
export const ESCAPE = 27;
export const LEFT = 0;
export const RIGHT = 1;
export const BOLT_LENGTH = 6;

// Screen dimensions
export const LINES = 24;
export const COLS = 80;

// Save against things
export const VS_POISON = 0;
export const VS_PARALYZATION = 0;
export const VS_DEATH = 0;
export const VS_PETRIFICATION = 1;
export const VS_BREATH = 2;
export const VS_MAGIC = 3;

// Various flag bits
export const ISDARK    = 0o000001;
export const ISCURSED  = 0o000001;
export const ISBLIND   = 0o000001;
export const ISGONE    = 0o000002;
export const ISKNOW    = 0o000002;
export const ISRUN     = 0o000004;
export const ISFOUND   = 0o000010;
export const ISINVIS   = 0o000020;
export const ISMEAN    = 0o000040;
export const ISGREED   = 0o000100;
export const ISBLOCK   = 0o000200;
export const ISHELD    = 0o000400;
export const ISHUH     = 0o001000;
export const ISREGEN   = 0o002000;
export const CANHUH    = 0o004000;
export const CANSEE    = 0o010000;
export const ISMISL    = 0o020000;
export const ISCANC    = 0o020000;
export const ISMANY    = 0o040000;
export const ISSLOW    = 0o040000;
export const ISHASTE   = 0o100000;

// Potion types
export const P_CONFUSE = 0;
export const P_PARALYZE = 1;
export const P_POISON = 2;
export const P_STRENGTH = 3;
export const P_SEEINVIS = 4;
export const P_HEALING = 5;
export const P_MFIND = 6;
export const P_TFIND = 7;
export const P_RAISE = 8;
export const P_XHEAL = 9;
export const P_HASTE = 10;
export const P_RESTORE = 11;
export const P_BLIND = 12;
export const P_NOP = 13;
export const MAXPOTIONS = 14;

// Scroll types
export const S_CONFUSE = 0;
export const S_MAP = 1;
export const S_LIGHT = 2;
export const S_HOLD = 3;
export const S_SLEEP = 4;
export const S_ARMOR = 5;
export const S_IDENT = 6;
export const S_SCARE = 7;
export const S_GFIND = 8;
export const S_TELEP = 9;
export const S_ENCH = 10;
export const S_CREATE = 11;
export const S_REMOVE = 12;
export const S_AGGR = 13;
export const S_NOP = 14;
export const S_GENOCIDE = 15;
export const MAXSCROLLS = 16;

// Weapon types
export const MACE = 0;
export const SWORD = 1;
export const BOW = 2;
export const ARROW = 3;
export const DAGGER = 4;
export const ROCK = 5;
export const TWOSWORD = 6;
export const SLING = 7;
export const DART = 8;
export const CROSSBOW = 9;
export const BOLT = 10;
export const SPEAR = 11;
export const MAXWEAPONS = 12;

// Armor types
export const LEATHER = 0;
export const RING_MAIL = 1;
export const STUDDED_LEATHER = 2;
export const SCALE_MAIL = 3;
export const CHAIN_MAIL = 4;
export const SPLINT_MAIL = 5;
export const BANDED_MAIL = 6;
export const PLATE_MAIL = 7;
export const MAXARMORS = 8;

// Ring types
export const R_PROTECT = 0;
export const R_ADDSTR = 1;
export const R_SUSTSTR = 2;
export const R_SEARCH = 3;
export const R_SEEINVIS = 4;
export const R_NOP = 5;
export const R_AGGR = 6;
export const R_ADDHIT = 7;
export const R_ADDDAM = 8;
export const R_REGEN = 9;
export const R_DIGEST = 10;
export const R_TELEPORT = 11;
export const R_STEALTH = 12;
export const MAXRINGS = 13;

// Rod/Wand/Staff types
export const WS_LIGHT = 0;
export const WS_HIT = 1;
export const WS_ELECT = 2;
export const WS_FIRE = 3;
export const WS_COLD = 4;
export const WS_POLYMORPH = 5;
export const WS_MISSILE = 6;
export const WS_HASTE_M = 7;
export const WS_SLOW_M = 8;
export const WS_DRAIN = 9;
export const WS_NOP = 10;
export const WS_TELAWAY = 11;
export const WS_TELTO = 12;
export const WS_CANCEL = 13;
export const MAXSTICKS = 14;
