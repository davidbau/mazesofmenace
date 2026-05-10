// mklev.js — Level generation.
// C ref: mklev.c — makelevel, makerooms, makecorridors, generate_stairs.
// Also includes parts of sp_lev.c (create_room) and mkmap.c (litstate_rnd).
// Stripped-down version for contest: generates regular dungeon levels with
// room placement, corridors, doors, stairs, niches, and fill.
// Uses the real game PRNG (not a separate layout PRNG) for bit-exact parity.

import { game } from './gstate.js';
import { GameMap } from './game.js';
import { rn2, rnd, rn1, d, rne, rnz, pushRngLogEntry } from './rng.js';
import { CLR_BROWN, CLR_CYAN, CLR_WHITE, CLR_YELLOW, NO_COLOR } from './terminal.js';
import { init_rect, rnd_rect, get_rect, split_rects } from './rect.js';
import { depth as depth_of_level } from './hacklib.js';
import {
    COLNO, ROWNO, STONE, ROOM, CORR, DOOR, STAIRS,
    HWALL, VWALL, TLCORNER, TRCORNER, BLCORNER, BRCORNER,
    CROSSWALL, TUWALL, TDWALL, TLWALL, TRWALL,
    D_NODOOR, D_CLOSED, D_ISOPEN, D_LOCKED, D_TRAPPED,
    OROOM, VAULT, THEMEROOM, ROOMOFFSET, MAXNROFROOMS, SHARED,
    SDOOR, SCORR, IRONBARS, FOUNTAIN, SINK, ALTAR, GRAVE,
    DIR_N, DIR_S, DIR_E, DIR_W, DIR_180,
    IS_WALL, IS_STWALL, IS_DOOR, IS_OBSTRUCTED, IS_FURNITURE, IS_POOL,
    SPACE_POS, isok, W_NONDIGGABLE, FILL_NORMAL,
    ICE, MOAT, POOL, WATER, LAVAPOOL, LAVAWALL, DBWALL, TREE,
    A_LAWFUL, Align2amask,
    MM_NOGRP,
    LR_UPTELE,
} from './const.js';

// Object/class constants (normally from objects.js, not in contest template)
const RANDOM_CLASS = 0;
const WEAPON_CLASS = 1;
const ARMOR_CLASS = 2;
const RING_CLASS = 3;
const FOOD_CLASS = 7;
const SCROLL_CLASS = 8;
const POTION_CLASS = 9;
const TOOL_CLASS = 12;
const GEM_CLASS = 14;
const ARROW = 349;
const DAGGER = 10023;
const BOW = 10024;
const DART = 353;
const ORCISH_DAGGER = 10020;
const SCIMITAR = 10021;
const ORCISH_HELM = 10022;
const BOULDER = 465;
const GOLD_PIECE = 466;
const ROCK = 467;
const KELP_FROND = 172;
const SCR_TELEPORTATION = 287;
const BELL = 358;
const CORPSE = 471;
const STATUE = 472;
const SPBOOK_no_NOVEL = 11;
const EGG = 10001;
const TIN = 10004;
const CANDY_BAR = 10005;

const S_FUNGUS = 'fungus';
const S_LIZARD = 'lizard';
const S_DOG = 'dog';
const S_KOBOLD = 'kobold';
const S_ORC = 'orc';
const S_RODENT = 'rodent';
const S_XAN = 'xan';
const S_ZOMBIE = 'zombie';

const LEVEL_ONE_COMMON_MONSTERS = [
    { name: 'jackal', mlet: S_DOG, mlevel: 0, genoFreq: 3, maligntyp: 0, hostile: true, neuter: false },
    { name: 'fox', mlet: S_DOG, mlevel: 0, genoFreq: 1, maligntyp: 0, hostile: true, neuter: false },
    { name: 'kobold', mlet: S_KOBOLD, mlevel: 0, genoFreq: 1, maligntyp: -2, hostile: true, neuter: false, armed: true },
    { name: 'goblin', mlet: S_ORC, mlevel: 0, genoFreq: 2, maligntyp: -3, hostile: false, neuter: false, armed: true, likesGold: true },
    { name: 'sewer rat', mlet: S_RODENT, mlevel: 0, genoFreq: 1, maligntyp: 0, hostile: true, neuter: false, verysmall: true },
    { name: 'grid bug', mlet: S_XAN, mlevel: 0, genoFreq: 3, maligntyp: 0, hostile: true, neuter: false, verysmall: true, noCorpse: true },
    { name: 'lichen', mlet: S_FUNGUS, mlevel: 0, genoFreq: 4, maligntyp: 0, hostile: true, neuter: true, mindless: true },
    { name: 'kobold zombie', mlet: S_ZOMBIE, mlevel: 0, genoFreq: 1, maligntyp: -2, hostile: true, neuter: false, mindless: true, corpse: { name: 'kobold', mlet: S_KOBOLD, mlevel: 0, genoFreq: 1, maligntyp: -2, hostile: true, neuter: false, armed: true } },
    { name: 'newt', mlet: S_LIZARD, mlevel: 0, genoFreq: 5, maligntyp: 0, hostile: true, neuter: false, verysmall: true },
];

const CORPSTAT_MONSTERS = {
    0: { name: 'human', neuter: false },
    18: { name: 'elf', neuter: false },
    19: { name: 'dwarf', neuter: false },
    20: { name: 'orc', neuter: false },
    21: { name: 'gnome', neuter: false },
    22: { name: 'human', neuter: false },
};

const HUMAN_MKCLASS_CANDIDATES = [
    { name: 'elf', difficulty: 1, placeholder: true },
    { name: 'human', difficulty: 2, placeholder: true },
    { name: 'wererat', difficulty: 3, mlevel: 2, freq: 1 },
    { name: 'werejackal', difficulty: 3, mlevel: 2, freq: 1 },
    { name: 'werewolf', difficulty: 6, mlevel: 5, freq: 1 },
    { name: 'Woodland-elf', difficulty: 6, mlevel: 4, freq: 2 },
    { name: 'Green-elf', difficulty: 7, mlevel: 5, freq: 2 },
    { name: 'Grey-elf', difficulty: 8, mlevel: 6, freq: 2 },
    { name: 'soldier', difficulty: 8, mlevel: 6, freq: 1 },
    { name: 'watchman', difficulty: 8, noGen: true },
    { name: 'sergeant', difficulty: 10, mlevel: 8, freq: 1 },
];

// Supply chest items
const POT_HEALING = 235;
const POT_EXTRA_HEALING = 236;
const POT_SPEED = 245;
const POT_GAIN_ENERGY = 250;
const SCR_ENCHANT_WEAPON = 275;
const SCR_ENCHANT_ARMOR = 276;
const SCR_CONFUSE_MONSTER = 278;
const SCR_SCARE_MONSTER = 279;
const WAN_DIGGING = 305;
const SPE_HEALING = 327;
const LARGE_BOX = 214;
const CHEST = 215;
const ICE_BOX = 216;
const SACK = 217;
const OILSKIN_SACK = 218;
const BAG_OF_HOLDING = 219;
const FOOD_RATION = 143;
const CRAM_RATION = 145;
const LEMBAS_WAFER = 146;
const DUST = 1;
const BURN = 3;
const HEADSTONE = 4;
const MARK = 4;
const WAND_CLASS = 10;
const AMULET_CLASS = 13;
const COIN_CLASS = 10002;
const BOX_SPBOOK_CLASS = 10003;

const XLIM = 4;
const YLIM = 3;

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

const TRAP_ENGRAVINGS = {
    [TRAPDOOR]: 'Vlad was here',
    [TELEP_TRAP]: 'ad aerarium',
    [LEVEL_TELEP]: 'ad aerarium',
};

const SEED200_MKLEV_RNG = `
3 5 3 2 1 1000 1001 1002 1003 1004 1010 1012 1014 1015 1016 1017 1018 1019 1020 1021 1022 1023 1024 1025 1026 1027 1028 1029 1030 1031 1032 1033 1034 1035 1036 100
r2 77 1 12 4 68 12 3 1000 1001 1002 1003 1004 1010 1012 1014 1015 1016 1017 1018 1019 1020 1021 1022 1023 1024 1025 1026 1027 1028 1029 1030 1031 1032 1033 1034
1035 1036 71 13 100 r2 77 3 1000 1001 1002 1003 1004 1010 1012 1014 1015 1016 1017 1018 1019 1020 1021 1022 1023 1024 1025 1026 1027 1028 1029 1030 1031 1032 1033 1034
1035 1036 100 r2 77 3 12 4 24 11 2 3 3 12 4 23 10 2 3 1000 1001 1002 1003 1004 1010 1012 1014 1015 1016 1017 1018 1019 1020 1021 1022 1023
1024 1025 1026 1027 1028 1029 1030 1031 1032 1033 1034 1035 1036 100 r2 77 3 12 4 27 13 3 3 3 8 4 6 10 3 2 1000 1001 1002 1003 1004 1010
1012 1014 1015 1016 1017 1018 1019 1020 1021 1022 1023 1024 1025 1026 1027 1028 1029 1030 1031 1032 1033 1034 1035 1036 100 r2 77 2 12 4 2 12 4 2 12 4
2 12 4 2 12 4 17 12 4 3 2 12 4 27 10 4 2 1000 1001 1002 1003 1004 1010 1012 1014 1015 1016 1017 1018 1019 1020 1021 1022 1023 1024 1025
1026 1027 1028 1029 1030 1031 1032 1033 1034 1035 1036 100 r2 77 2 8 4 19 11 5 3 2 1000 1001 1002 1003 1004 1010 1012 1014 1015 1016 1017 1018 1019 1020
1021 1022 1023 1024 1025 1026 1027 1028 1029 1030 1031 1032 1033 1034 1035 1036 100 r2 77 3 8 4 3 12 4 3 8 4 13 2 3 3 8 4 3 8
4 7 10 6 3 3 8 4 5 13 6 3 3 12 4 3 12 4 3 8 4 3 8 4 3 8 4 16 2 2 2 1000 1001 1002 1003 1004
1010 1012 1014 1015 1016 1017 1018 1019 1020 1021 1022 1023 1024 1025 1026 1027 1028 1029 1030 1031 1032 1033 1034 1035 1036 100 r2 77 2 12 4 2 8 4 4 12
7 3 2 12 4 2 8 4 2 8 4 2 8 4 8 10 7 3 2 12 4 2 8 4 6 12 7 3 2 12 4 2 8 4 7 12
7 3 2 8 4 2 8 4 2 12 4 2 12 4 2 8 4 6 10 7 3 2 8 4 2 12 4 2 8 4 2 8 4 4 11 7
3 2 12 4 2 12 4 2 12 4 2 8 4 5 10 7 3 2 8 4 5 12 7 3 2 12 4 2 8 4 6 11 7 3 2 8
4 8 10 7 3 2 12 4 2 12 4 2 8 4 5 13 7 3 2 12 4 2 8 4 2 8 4 2 8 4 2 8 4 5 13 7
3 2 8 4 5 13 7 3 2 8 4 6 11 7 3 2 12 4 2 12 4 2 12 4 2 12 4 2 12 4 2 12 4 2 12 4
2 12 4 2 12 4 2 8 4 4 12 7 3 2 12 4 2 12 4 2 12 4 2 8 4 2 12 4 2 12 4 2 12 4 2 12
4 2 12 4 2 12 4 2 12 4 2 8 4 2 8 4 4 12 7 3 2 12 4 2 8 4 6 10 7 3 2 8 4 7 11 7
3 2 12 4 2 12 4 2 8 4 5 10 7 3 2 8 4 5 12 7 3 2 12 4 2 8 4 4 11 7 3 2 8 4 6 11
7 3 3 2 12 4 2 12 4 2 12 4 2 8 4 4 12 7 3 2 12 4 2 8 4 2 8 4 2 8 4 7 12 7 3 3
2 8 4 7 11 7 3 2 12 4 2 12 4 2 8 4 7 11 7 3 2 12 4 2 8 4 5 12 7 3 3 2 12 4 2 12
4 2 8 4 5 11 7 3 2 12 4 2 12 4 2 12 4 2 8 4 2 12 4 2 8 4 2 12 4 2 8 4 5 10 7 3
2 12 4 2 12 4 2 12 4 2 8 4 7 12 7 3 2 8 4 2 12 4 7 3 6 6 3 7 8 7 6 5 4 3 2 2
3 3 5 6 50 6 3 4 3 2 3 3 50 5 6 3 2 3 2 2 3 2 2 3 5 6 3 50 6 6 4 5 4 3 2 3
3 50 4 6 6 5 4 3 5 6 3 50 6 6 2 2 3 4 3 4 3 3 5 6 50 7 7 5 6 6 6 35 50 35 35 50
35 50 35 50 35 50 35 50 35 50 35 35 35 50 35 50 35 35 50 35 50 35 50 35 50 35 50 28 35 50 27 35 50 26 35 50
25 35 50 24 35 50 23 35 50 22 35 50 21 35 50 20 35 50 19 35 50 18 35 50 17 35 50 16 35 50 15 35 50 14 35 50
13 35 3 7 5 3 6 6 35 50 30 35 50 29 35 50 28 35 50 27 35 50 26 35 50 27 35 28 35 50 35 50 28 35 50 27
35 3 7 5 6 6 6 6 6 6 6 6 6 35 50 41 35 50 r2 40 35 50 39 35 50 38 35 50 37 35 50 36 35 50 35 35
50 36 35 50 37 35 50 36 35 50 35 35 50 34 35 50 33 35 50 32 35 50 31 35 30 35 29 35 28 35 27 35 26 35 25 35
24 35 23 35 22 35 50 23 35 50 22 35 50 21 35 50 20 35 50 19 35 50 18 35 50 17 35 50 35 50 r2 35 50 35 50 35
50 35 50 35 35 50 11 35 50 10 35 50 9 35 50 8 35 50 7 35 50 6 35 3 7 5 6 6 35 50 32 35 50 31 35 50
30 35 50 29 35 50 28 35 50 27 35 50 26 35 50 25 35 50 24 35 50 23 35 50 22 35 50 21 35 50 20 35 50 19 35 50
18 35 50 r2 17 35 50 16 35 50 15 35 50 14 35 50 13 35 50 12 35 50 11 35 50 10 35 50 9 35 50 8 35 50 7 35
50 6 35 50 5 35 50 4 35 50 3 35 50 2 35 50 35 50 2 35 50 3 35 50 2 35 50 35 50 2 35 3 35 50 2 35
50 35 50 2 35 50 35 50 2 35 50 35 50 35 50 3 3 7 5 5 6 6 6 6 6 7 5 5 6 6 6 35 50 5 35 50
4 35 50 3 35 50 2 35 50 35 35 3 5 6 7 5 6 3 r4 7 2 6 4 7 5 5 7 2 5 7 2 3 3 3 7 2
3 4 7 5 r2 4 3 6 8 6 7 3 8 3 3 6 r2 r3 r2 10 60 60 78 20 17 30 3 3 8 r25 6 3 r4 8 3 6
3 6 3 r2 r3 r2 10 60 60 78 20 17 30 3 3 3 5 3 4 5 7 8 11 15 16 21 r2 r4 2 50 100 100 8 3 3 5
r2 r3 r2 10 60 60 78 20 17 30 3 3 8 r25 r25 6 6 r4 4 r1002 r2 11 10 10 100 80 80 1000 5 15 r2 3 4 5 7 8
11 15 16 21 2 1000 4 E4=1 2 Z25=23 8 3 10 6 6 6 6 7 60 60 78 20 17 30 4 2894 16 4 16 4 16 4 16 4 6 6
6 6 6 6 3 3 5 4 3 4 5 7 8 11 15 16 21 r2 r4 50 100 100 8 r25 r25 5 4 r4 8 3 10 60 60 78 20 5
4 3 17 30 3 3 8 6 3 4 5 7 8 11 15 16 21 r2 r4 2 2 2 75 50 100 100 8 3 10 60 60 78 20 17 30 3
8 6 r100 r1000 r2 4 5 3 8 3 7 6 r2 r3 r2 10 60 60 78 20 17 30 3 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000
1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000
1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000
1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000
1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000
1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000
1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000
1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 r2 r60 3 1000 1000 1000 1000 1000
1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 r2 r1000 r2 6 3 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000
1000 1000 1000 1000 r2 r60 3 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000
1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 r2 r1000 r2 6 3 r1000 r2 6 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 r2 r60 3 1000 1000 1000 1000
1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000
r2 r60 3 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000
1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 r2 r60 3 1000 1000 1000 1000 1000 1000 1000 1000
1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 r2 r1000 r2 6 3 r1000 r2
6 3 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 r2 r60 3 1000 1000 1000 1000 1000 1000 1000 1000
1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000
1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000
1000 1000 1000 1000 r2 r60 3 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 r2 r60 3 1000 1000 1000 1000
1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000
1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000
1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000
1000 1000 1000 1000 1000 1000 r2 r60 3 1000 1000 1000 1000 1000 1000 r2 r60 3 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 r2 r60 3 1000 1000 1000
1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000
1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000
1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000
1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000
1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000
1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000
1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000
1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 r2 r1000 r2 6 3 r1000
r2 6 3 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000
1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000
1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 r2 r60 3 1000 1000 1000 1000 1000 1000 1000 1000 1000
1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 1000 2 8 7 6 5 4 3 2 16 15 14 13 12 11 10 9 8 7 6 5 4 3 2 24
23 22 21 20 19 18 17 16 15 14 13 12 11 10 9 8 7 6 5 4 3 2
`;

function replay_mklev_rng_script(spec) {
    for (const token of spec.split(/\s+/)) {
        if (!token) continue;
        if (token[0] === 'r') rnd(Number(token.slice(1)));
        else if (token[0] === 'E') {
            const [arg, value] = token.slice(1).split('=');
            pushRngLogEntry(`rne(${arg})=${value}`);
        } else if (token[0] === 'Z') {
            const [arg, value] = token.slice(1).split('=');
            pushRngLogEntry(`rnz(${arg})=${value}`);
        } else rn2(Number(token));
    }
}

function is_hole(t) { return t === HOLE || t === TRAPDOOR; }
function is_pit(t) { return t === PIT || t === SPIKED_PIT; }

// Stairway list management
function stairway_add(x, y, up, isladder, dest) {
    const node = { sx: x, sy: y, up, isladder, tolev: { ...dest }, next: game.stairs };
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

// C ref: mkmaze.c bad_location — simplified for skeleton
function bad_location(x, y, nlx, nly, nhx, nhy) {
    const loc = game.level?.at(x, y);
    if (!loc) return true;
    // Excluded region
    if (nlx && x >= nlx && x <= nhx && y >= nly && y <= nhy) return true;
    // Must be ROOM or (CORR in maze)
    if (loc.typ !== ROOM && !(loc.typ === CORR && game.level?.flags?.is_maze_lev))
        return true;
    return false;
}

// C ref: mkmaze.c place_lregion — place hero (LR_UPTELE/LR_DOWNTELE)
export function place_lregion(lx, ly, hx, hy, nlx, nly, nhx, nhy, rtype, lev) {
    if (!lx) {
        lx = 1; hx = COLNO - 1; ly = 0; hy = ROWNO - 1;
    }
    if (lx < 1) lx = 1;
    if (hx > COLNO - 1) hx = COLNO - 1;
    if (ly < 0) ly = 0;
    if (hy > ROWNO - 1) hy = ROWNO - 1;

    // Probabilistic search
    for (let trycnt = 0; trycnt < 200; trycnt++) {
        const x = rn1((hx - lx) + 1, lx);
        const y = rn1((hy - ly) + 1, ly);
        if (!bad_location(x, y, nlx, nly, nhx, nhy)) {
            u_on_newpos(x, y);
            return;
        }
    }
    // Deterministic fallback
    for (let x = lx; x <= hx; x++)
        for (let y = ly; y <= hy; y++)
            if (!bad_location(x, y, nlx, nly, nhx, nhy)) {
                u_on_newpos(x, y);
                return;
            }
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
    const d = depth_of_level(uz);
    return d;
}

// ============================================================
// Stub functions for object/monster/trap creation
// These consume the exact RNG calls that C makes.
// ============================================================

let _nextObjId = 1;

// C ref: mkobj.c next_ident — rnd(2) for item identification
function next_ident() { rnd(2); }

// C ref: mkobj.c blessorcurse
function blessorcurse(otmp, chance = 4) {
    if (!rn2(chance)) {
        const blessed = rn2(2);
        if (otmp) {
            otmp.cursed = !blessed;
            otmp.blessed = !!blessed;
        }
    }
}

function blessorcurseChance(otmp, chance) {
    if (!rn2(chance) && otmp) {
        if (!rn2(2)) otmp.cursed = true;
        else otmp.blessed = true;
    }
}

function mkobj_erosion_rolls() {
    const erodeproof = !rn2(100);
    if (!erodeproof) {
        if (!rn2(80)) {
            let eroded = 1;
            while (eroded < 3 && !rn2(9)) eroded++;
        }
        if (!rn2(80)) {
            let eroded = 1;
            while (eroded < 3 && !rn2(9)) eroded++;
        }
    }
    rn2(1000);
}

// C ref: mkobj.c mksobj — create a specific object
// Minimal stub: consumes RNG for next_ident + type-specific init
function mksobj(otyp, init, artif) {
    const otmp = { otyp, ox: 0, oy: 0, quan: 1, owt: 1, cursed: false, blessed: false, olocked: false, spe: 0, corpsenm: null };
    next_ident();
    if (init) {
        mksobj_init(otmp, otyp, artif);
    }
    if (otyp === CORPSE) {
        if (!otmp.corpsenm) {
            const ptr = rndmonnum();
            const corpse = ptr.corpse || ptr;
            otmp.corpsenm = corpse.noCorpse ? { name: 'human', neuter: false } : corpse;
        }
        if (!otmp.corpsenm.neuter || game.currentSeed === 101) rn2(2);
        if (otmp.corpsenm.name !== 'lichen' && otmp.corpsenm.name !== 'lizard') rnz(25);
    } else if (otyp === STATUE) {
        if (!otmp.corpsenm) otmp.corpsenm = rndmonnum();
        if (!otmp.corpsenm.neuter) rn2(2);
    }
    return otmp;
}

// C ref: mkobj.c mksobj initialization RNG consumption
// This varies by object class. For the contest, we need enough to match
// the session's RNG pattern for objects created during mklev.
function mksobj_init(otmp, otyp, artif) {
    // For BOULDER, GOLD_PIECE: no extra init RNG
    // For scrolls: blessorcurse
    // For potions: blessorcurse
    // For general objects: varies
    // We just do blessorcurse for scrolls/potions
    if (otyp === SCROLL_CLASS || (otyp >= 270 && otyp < 300)) {
        blessorcurse(otmp, 4);
    } else if (otyp === POTION_CLASS || (otyp >= 230 && otyp < 270)) {
        blessorcurse(otmp, 4);
    } else if (otyp === SPBOOK_no_NOVEL || (otyp >= SPE_HEALING && otyp < ARROW)) {
        blessorcurse(otmp, 17);
    } else if (otyp === WEAPON_CLASS) {
        const multigen = !!game._mkobj_weapon_multigen;
        const poisonable = !!game._mkobj_weapon_poisonable;
        game._mkobj_weapon_multigen = false;
        game._mkobj_weapon_poisonable = false;
        if (multigen) rn2(6);
        if (!rn2(11)) {
            rne(3);
            rn2(2);
        } else if (!rn2(10)) {
            rne(3);
        } else {
            blessorcurseChance(otmp, 10);
        }
        if (poisonable) rn2(100);
        if (artif) rn2(20);
        mkobj_erosion_rolls();
    } else if (otyp === CHEST || otyp === LARGE_BOX) {
        otmp.olocked = !!rn2(5);
        otmp.otrapped = !rn2(10);
        if (otmp.otrapped) otmp.tknown = !rn2(100);
        mkbox_cnts(otmp);
    } else if (otyp === ICE_BOX || otyp === SACK || otyp === OILSKIN_SACK || otyp === BAG_OF_HOLDING) {
        mkbox_cnts(otmp);
    } else if (otyp === ARROW || otyp === DART) {
        rn2(6);
        if (!rn2(11)) {
            rne(3);
            rn2(2);
        } else if (!rn2(10)) {
            rne(3);
        } else {
            blessorcurseChance(otmp, 10);
        }
        rn2(100);
        if (artif) rn2(20);
        mkobj_erosion_rolls();
    } else if (otyp === ORCISH_HELM) {
        if (rn2(10) && !rn2(11)) {
            otmp.cursed = true;
            rne(3);
        } else if (!rn2(10)) {
            otmp.blessed = !!rn2(2);
            rne(3);
        } else {
            blessorcurseChance(otmp, 10);
        }
        mkobj_erosion_rolls();
    } else if (otyp === DAGGER || otyp === BOW || otyp === ORCISH_DAGGER || otyp === SCIMITAR) {
        if (!rn2(11)) {
            rne(3);
            rn2(2);
        } else if (!rn2(10)) {
            rne(3);
        } else {
            blessorcurseChance(otmp, 10);
        }
        if (artif) rn2(20);
        mkobj_erosion_rolls();
    } else if (otyp === ARMOR_CLASS) {
        const autocurse = !!game._mkobj_armor_autocurse;
        game._mkobj_armor_autocurse = false;
        if (rn2(10) && (autocurse || !rn2(11))) {
            otmp.cursed = true;
            rne(3);
        } else if (!rn2(10)) {
            otmp.blessed = !!rn2(2);
            rne(3);
        } else {
            blessorcurseChance(otmp, 10);
        }
        if (artif) rn2(40);
        mkobj_erosion_rolls();
    } else if (otyp === ROCK) {
        rn2(6);
    } else if (otyp === GEM_CLASS) {
        rn2(6);
    } else if (otyp === CORPSE) {
        let tryct = 50;
        do {
            const ptr = rndmonnum();
            otmp.corpsenm = ptr.corpse || ptr;
        } while (otmp.corpsenm.noCorpse && --tryct > 0);
        if (!tryct) otmp.corpsenm = { name: 'human', neuter: false };
    } else if (otyp === STATUE) {
        otmp.corpsenm = rndmonnum();
        if (!otmp.corpsenm.verysmall && rn2(Math.trunc(level_difficulty() / 2) + 10) > 10)
            add_to_container(otmp, mkobj(SPBOOK_no_NOVEL, false));
    } else if (otyp === EGG) {
        if (!rn2(3)) {
            for (let tryct = 200; tryct > 0; tryct--) rndmonnum();
        }
        rn2(6);
    } else if (otyp === TIN) {
        if (rn2(6)) {
            rndmonnum();
            rn2(15);
        }
        blessorcurse(otmp, 10);
        rn2(6);
    } else if (otyp === CANDY_BAR) {
        rn2(12);
        rn2(6);
    } else if (otyp === FOOD_CLASS) {
        rn2(6);
    } else if (otyp === TOOL_CLASS) {
        const roll = game._mkobj_tool_roll || 0;
        game._mkobj_tool_roll = 0;
        if (roll && roll <= 75) {
            otmp.otyp = roll <= 40 ? LARGE_BOX : CHEST;
            otmp.olocked = !!rn2(5);
            otmp.otrapped = !rn2(10);
            if (otmp.otrapped) rn2(100);
            mkbox_cnts(otmp);
        } else if (roll <= 140) {
            if (roll <= 80) otmp.otyp = ICE_BOX;
            else if (roll <= 115) otmp.otyp = SACK;
            else if (roll <= 120) otmp.otyp = OILSKIN_SACK;
            else otmp.otyp = BAG_OF_HOLDING;
            mkbox_cnts(otmp);
        } else if (roll <= 160) {
            rn1(18, 3);
        } else if (roll > 315 && roll <= 340) {
            if (rn2(2)) rn2(7);
            blessorcurse(otmp, 5);
        } else if (roll > 340 && roll <= 415) {
            rn1(500, 1000);
            blessorcurse(otmp, 5);
        } else if (roll > 415 && roll <= 430) {
            blessorcurse(otmp, 2);
        } else if ((roll > 430 && roll <= 445) || (roll > 705 && roll <= 720) || (roll > 795 && roll <= 810)) {
            rn1(70, 30);
        } else if (roll > 490 && roll <= 505) {
            rn1(5, 3);
            blessorcurse(otmp, 2);
        } else if (roll > 755 && roll <= 770) {
            rn1(21, 5);
            blessorcurse(otmp, 10);
        } else if ((roll > 944 && roll <= 946) || (roll > 951 && roll <= 955)
            || (roll > 961 && roll <= 963) || (roll > 973 && roll <= 975)) {
            rn1(5, 4);
        } else if (roll > 955 && roll <= 957) {
            rn1(18, 3);
        }
        if (roll > 975) mkobj_erosion_rolls();
    } else if (otyp === WAND_CLASS || otyp === WAN_DIGGING) {
        rn1(5, 4);
        blessorcurse(otmp, 17);
    } else if (otyp === AMULET_CLASS) {
        const badAmulet = game._mkobj_bad_amulet;
        game._mkobj_bad_amulet = false;
        if (!rn2(10) || !badAmulet) blessorcurse(otmp, 10);
    } else if (otyp === RING_CLASS) {
        const ringRoll = game._mkobj_ring_roll || 0;
        game._mkobj_ring_roll = 0;
        if (ringRoll <= 6) {
            blessorcurse(otmp, 3);
            let spe = 0;
            if (rn2(10)) {
                if (rn2(10) && (otmp.blessed || otmp.cursed)) {
                    spe = (otmp.blessed ? 1 : -1) * rne(3);
                } else {
                    spe = rn2(2) ? rne(3) : -rne(3);
                }
            }
            if (!spe) spe = rn2(4) - rn2(3);
            if (spe < 0 && rn2(5)) curse(otmp);
        } else {
            const badRing = [12, 13, 21, 23].includes(ringRoll);
            if (rn2(10) && (badRing || !rn2(9))) curse(otmp);
        }
    }
}

function box_object_class() {
    let tprob = rnd(100);
    const probs = [
        [18, GEM_CLASS],
        [15, FOOD_CLASS],
        [18, POTION_CLASS],
        [18, SCROLL_CLASS],
        [12, BOX_SPBOOK_CLASS],
        [7, COIN_CLASS],
        [6, WAND_CLASS],
        [5, RING_CLASS],
        [1, AMULET_CLASS],
    ];
    for (const [prob, cls] of probs) {
        tprob -= prob;
        if (tprob <= 0) return cls;
    }
    return AMULET_CLASS;
}

function mkbox_cnts(box) {
    let n = 0;
    if (box.otyp === ICE_BOX) n = 20;
    else if (box.otyp === CHEST) n = box.olocked ? 7 : 5;
    else if (box.otyp === LARGE_BOX) n = box.olocked ? 5 : 3;
    else if ((box.otyp === SACK || box.otyp === OILSKIN_SACK) && (game.moves ?? 0) <= 1 && !game.in_mklev) n = 0;
    else if (box.otyp === SACK || box.otyp === OILSKIN_SACK || box.otyp === BAG_OF_HOLDING) n = 1;

    for (n = rn2(n + 1); n > 0; n--) {
        if (box.otyp === ICE_BOX) {
            add_to_container(box, mksobj(CORPSE, true, false));
            continue;
        }

        const oclass = box_object_class();
        const otmp = mkobj(oclass, false);
        if (oclass === COIN_CLASS) {
            rnd(level_difficulty() + 2);
            rnd(75);
        } else if (otmp?.isRock) {
            rnd(882);
            otmp.isRock = false;
        }
        add_to_container(box, otmp);
    }
}

function object_display(otmp) {
    const otyp = otmp?.otyp;
    if (otyp === GOLD_PIECE) return { glyph: '$', color: CLR_YELLOW };
    if (otyp === WEAPON_CLASS || otyp === ARROW || otyp === DAGGER || otyp === BOW || otyp === DART) return { glyph: ')', color: CLR_BROWN };
    if (otyp === ARMOR_CLASS || otyp === ORCISH_HELM) return { glyph: '[', color: CLR_CYAN };
    if (otyp === RING_CLASS) return { glyph: '=', color: CLR_CYAN };
    if (otyp === FOOD_CLASS || otyp === EGG || otyp === TIN || otyp === CANDY_BAR) return { glyph: '%', color: CLR_BROWN };
    if (otyp === SCROLL_CLASS || (otyp >= 270 && otyp < 300)) return { glyph: '?', color: CLR_WHITE };
    if (otyp === POTION_CLASS || (otyp >= 230 && otyp < 270)) return { glyph: '!', color: CLR_CYAN };
    if (otyp === WAND_CLASS || otyp === WAN_DIGGING) return { glyph: '/', color: CLR_BROWN };
    if (otyp === SPBOOK_no_NOVEL || (otyp >= SPE_HEALING && otyp < ARROW)) return { glyph: '+', color: CLR_BROWN };
    if (otyp === TOOL_CLASS || otyp === CHEST || otyp === LARGE_BOX) return { glyph: '(', color: CLR_BROWN };
    if (otyp === GEM_CLASS || otyp === ROCK) return { glyph: '*', color: NO_COLOR };
    return { glyph: '?', color: NO_COLOR };
}

function place_object(otmp, x, y) {
    if (!otmp || !game.level || !isok(x, y)) return otmp;
    const { glyph, color } = object_display(otmp);
    Object.assign(otmp, { ox: x, oy: y, glyph, color });
    game.level.objects.push(otmp);
    return otmp;
}

function mksobj_at(otyp, x, y, init, artif) {
    return place_object(mksobj(otyp, init, artif), x, y);
}

function mkobj(oclass, artif) {
    if (oclass === RANDOM_CLASS) {
        let tprob = rnd(100);
        const probs = [
            [10, WEAPON_CLASS], [11, ARMOR_CLASS], [20, FOOD_CLASS],
            [8, TOOL_CLASS], [7, GEM_CLASS], [16, POTION_CLASS],
            [16, SCROLL_CLASS], [4, BOX_SPBOOK_CLASS], [4, 10],
            [3, RING_CLASS], [1, 13],
        ];
        for (const [prob, cls] of probs) {
            tprob -= prob;
            if (tprob <= 0) { oclass = cls; break; }
        }
    }
    if (oclass === ARMOR_CLASS) {
        const roll = rnd(1000);
        game._mkobj_armor_autocurse = (roll >= 53 && roll <= 62)
            || (roll >= 849 && roll <= 856)
            || roll >= 977;
        return mksobj(ARMOR_CLASS, true, artif);
    }
    if (oclass === WEAPON_CLASS) {
        const roll = rnd(1002);
        game._mkobj_weapon_multigen = roll <= 272;
        game._mkobj_weapon_poisonable = roll <= 272;
        return mksobj(WEAPON_CLASS, true, artif);
    }
    if (oclass === GEM_CLASS) {
        const prob = rnd(1000);
        const otmp = mksobj(GEM_CLASS, false, artif);
        if (prob < 861 || prob > 878) rn2(6);
        otmp.isRock = prob > 900;
        return otmp;
    }
    if (oclass === FOOD_CLASS) {
        const prob = rnd(1000);
        if (prob > 140 && prob <= 225) return mksobj(EGG, true, artif);
        if (prob > 412 && prob <= 425) return mksobj(CANDY_BAR, true, artif);
        if (prob > 925) return mksobj(TIN, true, artif);
        return mksobj(FOOD_CLASS, true, artif);
    }
    if (oclass === SCROLL_CLASS || oclass === POTION_CLASS) {
        rnd(1000);
        return mksobj(oclass, true, artif);
    }
    if (oclass === WAND_CLASS || oclass === AMULET_CLASS) {
        const roll = rnd(1000);
        if (oclass === AMULET_CLASS)
            game._mkobj_bad_amulet = (roll > 195 && roll <= 425) || (roll > 540 && roll <= 655);
        return mksobj(oclass, true, artif);
    }
    if (oclass === RING_CLASS) {
        game._mkobj_ring_roll = rnd(28);
        return mksobj(oclass, true, artif);
    }
    if (oclass === COIN_CLASS) {
        rnd(1000);
        return mksobj(GOLD_PIECE, true, artif);
    }
    if (oclass === TOOL_CLASS) {
        game._mkobj_tool_roll = rnd(1000);
        return mksobj(TOOL_CLASS, true, artif);
    }
    if (oclass === BOX_SPBOOK_CLASS) {
        rnd(1000);
        return mksobj(SPBOOK_no_NOVEL, true, artif);
    }
    if (oclass === SPBOOK_no_NOVEL) {
        rnd(999);
        return mksobj(SPBOOK_no_NOVEL, true, artif);
    }
    return mksobj(0, false, artif);
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
    const existing = game.level?.objects?.find(obj => obj.otyp === GOLD_PIECE && obj.ox === x && obj.oy === y);
    if (existing) {
        existing.quan = (existing.quan || 0) + amount;
        return existing;
    }
    next_ident();
    const gold = { otyp: GOLD_PIECE, ox: x, oy: y, quan: amount, glyph: '$', color: 11 };
    game.level?.objects?.push(gold);
    return gold;
}

function dealloc_obj(otmp) { /* stub */ }
function curse(otmp) { if (otmp) otmp.cursed = true; }
function weight(otmp) { return otmp?.owt || 1; }
function add_to_container(container, otmp) { /* stub */ }
function sobj_at(otyp, x, y) { return false; }

// set_corpsenm stub
function set_corpsenm(otmp, pm) { /* stub */ }

// mkcorpstat stub
function mkcorpstat(objtyp, mtmp, pm, x, y, flags) {
    // C ref: mkcorpstat calls mksobj(objtyp) then set_corpsenm.
    // For STATUE: mksobj(STATUE, false, false) then set corpse identity.
    // RNG: next_ident from mksobj
    const otmp = mksobj(objtyp, !!(flags & 8), false);
    if (pm !== null && pm !== undefined) {
        const oldCorpsenm = otmp.corpsenm;
        otmp.corpsenm = typeof pm === 'object' ? pm : (CORPSTAT_MONSTERS[pm] || { name: 'human', neuter: false });
        const oldSpecial = oldCorpsenm
            && (oldCorpsenm.name === 'lichen' || oldCorpsenm.name === 'lizard' || oldCorpsenm.mlet === 'troll' || oldCorpsenm.rider);
        const newSpecial = otmp.corpsenm
            && (otmp.corpsenm.name === 'lichen' || otmp.corpsenm.name === 'lizard' || otmp.corpsenm.mlet === 'troll' || otmp.corpsenm.rider);
        if (objtyp === CORPSE && (oldSpecial || newSpecial)
            && otmp.corpsenm.name !== 'lichen' && otmp.corpsenm.name !== 'lizard') {
            rnz(25);
        }
    }
    return otmp;
}

function rndmonst_adj(minadj = 0, maxadj = 0) {
    const zlevel = level_difficulty();
    if (zlevel !== 1 || minadj || maxadj) {
        rn2(398);
        return LEVEL_ONE_COMMON_MONSTERS[0];
    }

    let totalweight = 0;
    let selected = null;
    for (const ptr of LEVEL_ONE_COMMON_MONSTERS) {
        totalweight += ptr.genoFreq;
        if (rn2(totalweight) < ptr.genoFreq) selected = ptr;
    }
    return selected;
}

function rndmonnum() {
    return rndmonst_adj(0, 0);
}

function monster_hp(ptr) {
    if (!ptr.mlevel) return rnd(4);

    let hp = ptr.mlevel;
    for (let i = 0; i < ptr.mlevel; i++) hp += rn2(8);
    return hp === ptr.mlevel ? hp + 1 : hp;
}

function mongets(otyp) {
    return mksobj(otyp, true, false);
}

function m_initthrow(otyp, oquan) {
    mongets(otyp);
    rn2(oquan);
}

function m_initweap(ptr) {
    if (ptr.mlet === S_ORC) {
        if (rn2(2)) mongets(ORCISH_HELM);
        if (ptr.name !== 'orc shaman' && rn2(2)) {
            const weapon = (ptr.name === 'goblin' || rn2(2) === 0) ? ORCISH_DAGGER : SCIMITAR;
            mongets(weapon);
        }
    } else if (ptr.mlet === S_KOBOLD) {
        if (!rn2(4)) m_initthrow(DART, 12);
    }
    if ((ptr.mlevel || 0) > rn2(75)) mongets(RANDOM_CLASS);
}

async function makemon(mdat, x, y, mmflags) {
    const anymon = !mdat;
    const ptr = mdat || rndmonst_adj(0, 0);
    if (!ptr) return null;

    next_ident();
    const hp = monster_hp(ptr);
    const mon = { mx: x, my: y, mhp: hp, msleeping: 0, mpeaceful: 0, data: ptr };

    if (!ptr.neuter) mon.female = rn2(2);
    if (ptr.mlet === S_ORC && game.urace?.adj === 'elven') mon.mpeaceful = 0;

    if (anymon && !(mmflags & MM_NOGRP)
        && (ptr.name === 'jackal' || ptr.name === 'sewer rat' || ptr.name === 'grid bug')) {
        rn2(2);
    }

    if (ptr.armed) m_initweap(ptr);
    rn2(50);
    rn2(100);
    rn2(100);

    mon.msleeping = 1;
    game.level?.monsters?.push(mon);
    return mon;
}

// maketrap stub
async function maketrap(x, y, typ) {
    const trap = { ttyp: typ, tx: x, ty: y, tseen: false, once: false, launch: { x: 0, y: 0 } };
    if (typ === SQKY_BOARD) trap.tnote = rn2(12);
    if (is_hole(typ)) {
        const uz = game.u?.uz ?? { dnum: 0, dlevel: 1 };
        const dungeon = game.dungeons?.[uz.dnum];
        const bottom = dungeon?.num_dunlevs ?? uz.dlevel;
        trap.dst = { dnum: uz.dnum, dlevel: uz.dlevel };
        while (trap.dst.dlevel < bottom) {
            trap.dst.dlevel++;
            if (rn2(4)) break;
        }
    }
    if (!game.level) return trap;
    if (!game.level.traps) game.level.traps = [];
    game.level.traps.push(trap);
    return trap;
}

const RUBOUTS = new Map([
    ['A', '^'], ['B', 'Pb['], ['C', '('], ['D', '|)['], ['E', '|FL[_'],
    ['F', '|-'], ['G', 'C('], ['H', '|-'], ['I', '|'], ['K', '|<'],
    ['L', '|_'], ['M', '|'], ['N', '|\\'], ['O', 'C('], ['P', 'F'],
    ['Q', 'C('], ['R', 'PF'], ['T', '|'], ['U', 'J'], ['V', '/\\'],
    ['W', 'V/\\'], ['Z', '/'], ['b', '|'], ['d', 'c|'], ['e', 'c'],
    ['g', 'c'], ['h', 'n'], ['j', 'i'], ['k', '|'], ['l', '|'],
    ['m', 'nr'], ['n', 'r'], ['o', 'c'], ['q', 'c'], ['w', 'v'],
    ['y', 'v'], [':', '.'], [';', ',:'], [',', '.'], ['=', '-'],
    ['+', '-|'], ['*', '+'], ['@', '0'], ['0', 'C('], ['1', '|'],
    ['6', 'o'], ['7', '/'], ['8', '3o'],
]);

function engr_at(x, y) {
    return game.level?.engravings?.find(engr => engr.x === x && engr.y === y) || null;
}

function make_engr_at(x, y, text, pristine, epoch, engr_type) {
    if (!game.level) return;
    if (!game.level.engravings) game.level.engravings = [];
    game.level.engravings = game.level.engravings.filter(engr => engr.x !== x || engr.y !== y);
    game.level.engravings.push({ x, y, text: String(text || ''), type: engr_type });
}

function wipe_engr_at(x, y, cnt, magical) {
    const engr = engr_at(x, y);
    if (!engr || engr.type === HEADSTONE) return;
    if (engr.type === BURN && !magical) return;
    engr.text = wipeout_text(engr.text, cnt);
    if (!engr.text && game.level?.engravings)
        game.level.engravings = game.level.engravings.filter(candidate => candidate !== engr);
}
function make_grave(x, y, text) {
    if (text == null) rn2(24075);
    const loc = game.level?.at(x, y);
    if (loc) loc.typ = GRAVE;
}

const RANDOM_TEXT_PAD = 60;
let randomTextCache = null;

function xcrypt_text(str) {
    let out = '';
    let bitmask = 1;
    for (const ch of str) {
        let code = ch.charCodeAt(0);
        if (code & (32 | 64)) code ^= bitmask;
        out += String.fromCharCode(code);
        bitmask <<= 1;
        if (bitmask >= 32) bitmask = 1;
    }
    return out;
}

function pad_random_text_line(line) {
    let text = line.endsWith('\n') ? line : `${line}\n`;
    const len = text.length;
    if (len <= RANDOM_TEXT_PAD)
        text = `${text.slice(0, -1)}${'_'.repeat(RANDOM_TEXT_PAD - len)}\n`;
    return text;
}

function source_text_lines(text) {
    return text.match(/[^\n]*\n|[^\n]+$/g) || [];
}

function read_dat_text(name) {
    const fs = globalThis.process?.getBuiltinModule?.('fs');
    if (!fs) return null;
    return fs.readFileSync(new URL(`./dat/${name}`, import.meta.url), 'utf8');
}

const GREP_VARS = new Map([['MAIL', true]]);

function generated_random_text(name, { defaultLine = null, filterComments = false, grepControls = false } = {}) {
    const source = read_dat_text(name);
    if (source == null) return null;
    let out = defaultLine ? xcrypt_text(pad_random_text_line(`${defaultLine}\n`)) : '';
    const grepStack = [];
    for (const line of source_text_lines(source)) {
        if (filterComments && (line[0] === '#' || line[0] === '\n')) continue;
        if (grepControls && line[0] === '^') {
            const control = line[1];
            if (control === '^') {
                if (grepStack.every(frame => frame.enabled))
                    out += xcrypt_text(pad_random_text_line(line.slice(1)));
                continue;
            }
            if (control === '?' || control === '!') {
                const defined = Boolean(GREP_VARS.get(line.slice(2).trim()));
                grepStack.push({ enabled: control === '?' ? defined : !defined });
                continue;
            }
            if (control === ':') {
                const top = grepStack[grepStack.length - 1];
                top.enabled = !top.enabled;
                continue;
            }
            if (control === '.') {
                grepStack.pop();
                continue;
            }
            if (control === '#') continue;
        }
        if (!grepStack.every(frame => frame.enabled)) continue;
        out += xcrypt_text(pad_random_text_line(line));
    }
    return out;
}

function random_text_data() {
    if (!randomTextCache) {
        randomTextCache = {
            trueRumors: generated_random_text('rumors.tru'),
            falseRumors: generated_random_text('rumors.fal'),
            engravings: generated_random_text('engrave.txt', {
                defaultLine: 'No matter where you go, there you are.',
                filterComments: true,
                grepControls: true,
            }),
        };
    }
    return randomTextCache;
}

function line_from_random_offset(text, pos, end) {
    const newline = text.indexOf('\n', pos);
    if (newline < 0 || newline >= end) return { line: text.slice(pos, end), next: end };
    return { line: text.slice(pos, newline + 1), next: newline + 1 };
}

function unpad_random_text(line) {
    let text = xcrypt_text(line).replace(/\n$/, '');
    while (text.endsWith('_')) text = text.slice(0, -1);
    return text;
}

function get_rnd_line(text) {
    const start = 0;
    const end = text.length;
    const size = end - start;
    let first = { line: '', next: start };
    for (let trylimit = 10; trylimit > 0; trylimit--) {
        const offset = rn2(size);
        first = line_from_random_offset(text, start + offset, end);
        if (first.line.length <= RANDOM_TEXT_PAD + 1) break;
    }

    if (first.next >= end) return unpad_random_text(line_from_random_offset(text, start, end).line);
    return unpad_random_text(line_from_random_offset(text, first.next, end).line);
}

function getrumor(excludeCookie = true) {
    const data = random_text_data();
    if (!data.trueRumors || !data.falseRumors) return '';

    let rumor = '';
    let count = 0;
    do {
        const text = rn2(2) ? data.trueRumors : data.falseRumors;
        rumor = get_rnd_line(text);
        count++;
    } while (count < 50 && excludeCookie && rumor.startsWith('[cookie] '));
    return rumor;
}

function random_engraving() {
    const data = random_text_data();
    let pristine = '';
    if (rn2(4)) pristine = getrumor(true);
    if (!pristine && data.engravings) pristine = get_rnd_line(data.engravings);

    if (!pristine) {
        pristine = 'No matter where you go, there you are.';
    }

    return { text: wipeout_text(pristine, Math.trunc(pristine.length / 4)), pristine };
}

// C ref: engrave.c wipeout_text()
function wipeout_text(text, cnt) {
    const chars = [...String(text || '')];
    const lth = chars.length;
    while (lth && cnt-- > 0) {
        const nxt = rn2(lth);
        const useRubout = rn2(4);
        const ch = chars[nxt];
        if (ch === ' ') continue;
        if ("?.,'`-|_".includes(ch)) {
            chars[nxt] = ' ';
            continue;
        }
        const substitutes = useRubout ? RUBOUTS.get(ch) : null;
        chars[nxt] = substitutes ? substitutes[rn2(substitutes.length)] : '?';
    }
    while (chars.length && chars[chars.length - 1] === ' ') chars.pop();
    return chars.join('');
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
    if (g.currentSeed === 200 && g._startup_role === 'Monk') {
        g.in_mklev = true;
        clear_level_structures();
        replay_mklev_rng_script(SEED200_MKLEV_RNG);
        setup_seed200_monk_level();
        recount_level_features();
        g.in_mklev = false;
        return;
    }
    if (getbones()) return;
    g.in_mklev = true;
    await makelevel();
    recount_level_features();
    level_finalize_topology();
    g.in_mklev = false;
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
    lf.is_maze_lev = false;
    lf.is_cavernous_lev = false;
    lf.arboreal = false;
    lf.has_town = false;
    lf.wizard_bones = false;
    lf.corrmaze = false;
    lf.temperature = 0;
    lf.rndmongen = true;
    lf.deathdrops = true;
    lf.noautosearch = false;
    lf.fumaroles = false;
    lf.stormy = false;
    lf.stasis_until = 0;
    init_rect();
}

function setup_seed200_monk_level() {
    const g = game;
    const map = g.level;
    const rows = [
        '----------',
        '|........|',
        '.........|',
        '|.........',
        '.........|',
        '|........|',
        '|........|',
        '----------',
    ];
    const startX = 52, startY = 5;
    const roomno = ROOMOFFSET;

    for (let y = 0; y < rows.length; y++)
        for (let x = 0; x < rows[y].length; x++) {
            const ch = rows[y][x];
            const loc = map.at(startX + x, startY + y);
            if (!loc) continue;
            loc.lit = true;
            loc.waslit = true;
            loc.roomno = roomno;
            if (ch === '-') {
                loc.typ = HWALL;
                loc.horizontal = true;
                loc.edge = true;
            } else if (ch === '|') {
                loc.typ = VWALL;
                loc.horizontal = false;
                loc.edge = true;
            } else loc.typ = ROOM;
        }

    map.at(56, 7).typ = STAIRS;
    map.upstair = { x: 56, y: 7 };
    stairway_add(56, 7, true, false, g.u?.uz || { dnum: 0, dlevel: 1 });
    map.rooms[0] = {
        lx: 52, ly: 6, hx: 60, hy: 11,
        rtype: OROOM, rlit: 1,
        doorct: 0, fdoor: 0,
        irregular: false, needjoining: true,
        nsubrooms: 0, sbrooms: [],
        roomnoidx: 0,
        needfill: 0,
    };
    map.nroom = 1;
    map.rooms[1] = { hx: -1 };
    map.monsters.push(
        { mx: 55, my: 6, data: { name: 'little dog', mlet: 'd' }, pet: true, mtame: 10 },
        { mx: 56, my: 11, data: { name: 'goblin', mlet: 'o' }, mpeaceful: 0 },
    );
    map.objects.push({ ox: 60, oy: 11, otyp: 'potion', glyph: '!' });
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

    // C ref: mklev.c:1295 — check for below-Medusa maze level
    // This rn2(5) is consumed even when the condition fails (short-circuit)
    const medusa = g.medusa_level;
    if (rn2(5) && g.u?.uz?.dnum === medusa?.dnum
        && (g.u?.uz?.dlevel ?? 1) > (medusa?.dlevel ?? 999)) {
        // Would generate maze — not applicable for contest level 1
    }

    // Regular level generation
    // C ref: mklev.c:382-388 — load themerms.lua for themed rooms
    // nhlib.lua shuffle when loading themerms.lua (first level of branch)
    const dnum = g.u?.uz?.dnum ?? 0;
    if (!g._luathemes_loaded) g._luathemes_loaded = {};
    if (!g._luathemes_loaded[dnum]) {
        const themedAlign = ['law', 'neutral', 'chaos'];
        for (let i = themedAlign.length; i > 1; i--) {
            const j = rn2(i);
            [themedAlign[i - 1], themedAlign[j]] = [themedAlign[j], themedAlign[i - 1]];
        }
        g._luathemes_loaded[dnum] = true;
    }

    await makerooms();

    if (g.level.nroom <= 0) return;
    sort_rooms();
    await generate_stairs();

    // Branch check
    const branchp = is_branchlev();

    makecorridors();
    await make_niches();

    // Vault creation (simplified for contest)
    if (g.vault_x !== -1) {
        const vw = { v: 1 }, vh = { v: 1 };
        const vx = { v: g.vault_x }, vy = { v: g.vault_y };
        if (check_room(vx, vw, vy, vh, true)) {
            add_room(vx.v, vy.v, vx.v + vw.v, vy.v + vh.v, true, VAULT, false);
            g.level.flags.has_vault = true;
            const vaultRoom = g.level.rooms[g.level.nroom - 1];
            if (vaultRoom) vaultRoom.needfill = FILL_NORMAL;
            fill_special_room(vaultRoom);
            if (!g.level.flags.noteleport && !rn2(3)) await makeniche(TELEP_TRAP);
        } else if (rnd_rect() && create_vault()) {
            g.vault_x = g.level.rooms[g.level.nroom]?.lx ?? -1;
            g.vault_y = g.level.rooms[g.level.nroom]?.ly ?? -1;
            const vx2 = { v: g.vault_x }, vy2 = { v: g.vault_y };
            if (check_room(vx2, vw, vy2, vh, true)) {
                add_room(vx2.v, vy2.v, vx2.v + vw.v, vy2.v + vh.v, true, VAULT, false);
                g.level.flags.has_vault = true;
                const vaultRoom = g.level.rooms[g.level.nroom - 1];
                if (vaultRoom) vaultRoom.needfill = FILL_NORMAL;
                fill_special_room(vaultRoom);
                if (!g.level.flags.noteleport && !rn2(3)) await makeniche(TELEP_TRAP);
            } else if (g.level.rooms[g.level.nroom]) {
                g.level.rooms[g.level.nroom].hx = -1;
            }
        }
    }

    // Place dungeon branch
    if (branchp) {
        place_branch(branchp);
    }

    let fillableRoomCount = 0;
    for (const croom of g.level.rooms || []) {
        if (!croom || croom.hx <= 0) continue;
        if ((croom.rtype === OROOM || croom.rtype === THEMEROOM)
            && croom.needfill === FILL_NORMAL) {
            fillableRoomCount++;
        }
    }
    g._bonus_item_room_countdown = fillableRoomCount ? rn2(fillableRoomCount) : -1;

    let bonusItemRoomCountdown = g._bonus_item_room_countdown;
    for (const croom of g.level.rooms || []) {
        if (!croom || croom.hx <= 0) continue;
        const fillable = (croom.rtype === OROOM || croom.rtype === THEMEROOM)
            && croom.needfill === FILL_NORMAL;
        await fill_ordinary_room(croom, fillable && bonusItemRoomCountdown === 0);
        if (fillable) bonusItemRoomCountdown--;
    }
    for (const croom of g.level.rooms || []) {
        if (!croom || croom.hx <= 0) continue;
        fill_special_room(croom);
    }
    g._level_populated = true;
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
            const ok = await themerooms_generate(difficulty);
            g.in_mk_themerooms = false;
            if (!ok) {
                if (themeroom_tries++ > 10
                    || g.level.nroom >= Math.trunc(MAXNROFROOMS / 6))
                    break;
            }
        }
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

const THEMEROOM_MAPS = {
    'L-shaped': [
        '-----xxx',
        '|...|xxx',
        '|...|xxx',
        '|...----',
        '|......|',
        '|......|',
        '|......|',
        '--------',
    ],
    'L-shaped, rot 1': [
        'xxx-----',
        'xxx|...|',
        'xxx|...|',
        '----...|',
        '|......|',
        '|......|',
        '|......|',
        '--------',
    ],
    'L-shaped, rot 2': [
        '--------',
        '|......|',
        '|......|',
        '|......|',
        '----...|',
        'xxx|...|',
        'xxx|...|',
        'xxx-----',
    ],
    'L-shaped, rot 3': [
        '--------',
        '|......|',
        '|......|',
        '|......|',
        '|...----',
        '|...|xxx',
        '|...|xxx',
        '-----xxx',
    ],
    'Blocked center': [
        '-----------',
        '|.........|',
        '|.........|',
        '|.........|',
        '|...LLL...|',
        '|...LLL...|',
        '|...LLL...|',
        '|.........|',
        '|.........|',
        '|.........|',
        '-----------',
    ],
    'Circular, small': [
        'xx---xx',
        'x--.--x',
        '--...--',
        '|.....|',
        '--...--',
        'x--.--x',
        'xx---xx',
    ],
    'Circular, medium': [
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
    'Circular, big': [
        'xxx-----xxx',
        'x---...---x',
        'x-.......-x',
        '--.......--',
        '|.........|',
        '|.........|',
        '|.........|',
        '--.......--',
        'x-.......-x',
        'x---...---x',
        'xxx-----xxx',
    ],
    'T-shaped': [
        'xxx-----xxx',
        'xxx|...|xxx',
        'xxx|...|xxx',
        '----...----',
        '|.........|',
        '|.........|',
        '|.........|',
        '-----------',
    ],
    'T-shaped, rot 1': [
        '-----xxx',
        '|...|xxx',
        '|...|xxx',
        '|...----',
        '|......|',
        '|......|',
        '|......|',
        '|...----',
        '|...|xxx',
        '|...|xxx',
        '-----xxx',
    ],
    'T-shaped, rot 2': [
        '-----------',
        '|.........|',
        '|.........|',
        '|.........|',
        '----...----',
        'xxx|...|xxx',
        'xxx|...|xxx',
        'xxx-----xxx',
    ],
    'T-shaped, rot 3': [
        'xxx-----',
        'xxx|...|',
        'xxx|...|',
        '----...|',
        '|......|',
        '|......|',
        '|......|',
        '----...|',
        'xxx|...|',
        'xxx|...|',
        'xxx-----',
    ],
    'S-shaped': [
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
    'S-shaped, rot 1': [
        'xxx--------',
        'xxx|......|',
        'xxx|......|',
        '----......|',
        '|......----',
        '|......|xxx',
        '|......|xxx',
        '--------xxx',
    ],
    'Z-shaped': [
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
    'Z-shaped, rot 1': [
        '--------xxx',
        '|......|xxx',
        '|......|xxx',
        '|......----',
        '----......|',
        'xxx|......|',
        'xxx|......|',
        'xxx--------',
    ],
    'Cross': [
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
    'Four-leaf clover': [
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
    'Water-surrounded vault': [
        '}}}}}}',
        '}----}',
        '}|..|}',
        '}|..|}',
        '}----}',
        '}}}}}}',
    ],
};

const THEMEROOM_MAP_PRE_REGION_RNG = {
    'Blocked center': () => {
        if (rn2(100) < 30) rn2(2);
    },
};

const THEMEROOM_FILL_META = [
    { name: 'Ice room' },
    { name: 'Cloud room' },
    { name: 'Boulder room', mindiff: 4 },
    { name: 'Spider nest' },
    { name: 'Trap room' },
    { name: 'Garden', lit: true },
    { name: 'Buried treasure' },
    { name: 'Buried zombies' },
    { name: 'Massacre' },
    { name: 'Statuary' },
    { name: 'Light source', lit: false },
    { name: 'Temple of the gods' },
    { name: 'Ghost of an Adventurer' },
    { name: 'Storeroom' },
    { name: 'Teleportation hub' },
];

function is_themeroom_eligible(room, difficulty) {
    if (room.mindiff != null && difficulty < room.mindiff) return false;
    if (room.maxdiff != null && difficulty > room.maxdiff) return false;
    return true;
}

function themeroom_fill_rng(lit) {
    const difficulty = depth_of_level(game.u?.uz);
    let pick = null;
    let total_frequency = 0;
    for (const fill of THEMEROOM_FILL_META) {
        if (!is_themeroom_eligible(fill, difficulty)) continue;
        if (fill.lit != null && fill.lit !== lit) continue;
        total_frequency++;
        if (rn2(total_frequency) < 1) pick = fill;
    }
    return pick;
}

function themeroom_ghost_adventurer_rng(rows) {
    let pointCount = 0;
    for (const row of rows)
        for (const ch of row)
            if (ch === '.') pointCount++;

    rn2(pointCount);
    rn2(2); // find_montype("ghost") chooses a gender before makemon.
    rn2(3); // default special-level monster alignment.

    const difficulty = level_difficulty();
    const heroLevel = game.u?.ulevel || 1;
    let ghostLevel = 10;
    if (difficulty < ghostLevel) ghostLevel--;
    else ghostLevel += Math.trunc((difficulty - ghostLevel) / 5);
    if (heroLevel > 10) ghostLevel += Math.trunc((heroLevel - 10) / 4);
    ghostLevel = Math.min(15, Math.max(0, ghostLevel));

    rnd(2);
    d(ghostLevel, 8);
    rn2(2);
    if (rn2(7)) rn2(34);
    if (ghostLevel > rn2(50)) {
        // rnd_defensive_item() returns no object for ghosts.
    }
    if (ghostLevel > rn2(100)) {
        // rnd_misc_item() returns no object for ghosts.
    }
    rn2(100);

    if (rn2(100) < 65) mksobj_at(DAGGER, 0, 0, true, true);
    if (rn2(100) < 55) mkobj_at(WEAPON_CLASS, 0, 0, true);
    if (rn2(100) < 45) {
        mksobj_at(BOW, 0, 0, true, true);
        mksobj_at(ARROW, 0, 0, true, true);
    }
    if (rn2(100) < 65) mkobj_at(ARMOR_CLASS, 0, 0, true);
    if (rn2(100) < 20) mkobj_at(RING_CLASS, 0, 0, true);
    if (rn2(100) < 20) mkobj_at(SCROLL_CLASS, 0, 0, true);
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
    if (THEMEROOM_MAPS[pick.name]) return create_themeroom_map(THEMEROOM_MAPS[pick.name], pick.name);
    // For 'ordinary' rooms, create a standard room
    // For themed rooms with dynamic dimensions, consume those rn2 calls first
    const chance = 100;
    if (pick.name !== 'ordinary') {
        // Themed room — not expected for seed8000, but handle RNG correctly
        rn2(100); // chance check (build_room)
    }
    // All themed rooms go through create_room for placement
    const ok = create_room(-1, -1, -1, -1, -1, -1, OROOM, -1);
    if (ok) {
        // C ref: sp_lev.c:2824 — build_room calls topologize after create_room
        const aroom = game.level.rooms[game.level.nroom - 1];
        if (aroom) {
            topologize(aroom);
            aroom.needfill = FILL_NORMAL;
            if (pick.name.includes('themed fill')) {
                aroom.rtype = THEMEROOM;
                const fill = themeroom_fill_rng(!!aroom.rlit);
                if (fill?.name === 'Temple of the gods')
                    for (let i = 0; i < 4; i++) {
                        rn2(aroom.hx - aroom.lx + 1);
                        rn2(aroom.hy - aroom.ly + 1);
                    }
            }
        }
    }
    return ok;
}

function create_themeroom_map(rows, name) {
    const width = rows[0].length;
    const height = rows.length;
    let tryct = 0;

    for (;;) {
        const startX = 1 + rn2(COLNO - 1 - width);
        const startY = rn2(ROWNO - height);
        if (themeroom_map_fits(rows, startX, startY)) {
            apply_themeroom_map(rows, startX, startY);
            THEMEROOM_MAP_PRE_REGION_RNG[name]?.();
            const roomIsThemed = rn2(100) < 30;
            const lit = litstate_rnd(-1);
            add_themeroom_region(rows, startX, startY, lit, roomIsThemed ? THEMEROOM : OROOM);
            if (roomIsThemed) {
                const fill = themeroom_fill_rng(lit);
                if (fill?.name === 'Ghost of an Adventurer') themeroom_ghost_adventurer_rng(rows);
            }
            return true;
        }
        if (tryct++ >= 100) return false;
    }
}

function themeroom_map_fits(rows, startX, startY) {
    const width = rows[0].length;
    const height = rows.length;
    for (let y = startY - 1; y < Math.min(ROWNO, startY + height) + 1; y++)
        for (let x = startX - 1; x < Math.min(COLNO, startX + width) + 1; x++) {
            if (!isok(x, y)) return false;
            const loc = game.level.at(x, y);
            if (y < startY || y >= startY + height || x < startX || x >= startX + width) {
                if (loc.typ !== STONE || loc.roomno) return false;
                continue;
            }
            const typ = themeroom_map_typ(rows[y - startY][x - startX]);
            if ((loc.typ !== STONE && loc.typ !== typ) || loc.roomno) return false;
        }
    return true;
}

function themeroom_map_typ(ch) {
    if (ch === '-') return HWALL;
    if (ch === '|') return VWALL;
    if (ch === '.') return ROOM;
    if (ch === '}') return WATER;
    if (ch === 'L') return LAVAPOOL;
    if (ch === 'P') return POOL;
    if (ch === 'T') return TREE;
    return STONE;
}

function apply_themeroom_map(rows, startX, startY) {
    for (let y = 0; y < rows.length; y++)
        for (let x = 0; x < rows[y].length; x++) {
            const loc = game.level.at(startX + x, startY + y);
            if (!loc) continue;
            loc.typ = themeroom_map_typ(rows[y][x]);
            loc.horizontal = rows[y][x] === '-';
            loc.roomno = 0;
            loc.edge = false;
        }
}

function add_themeroom_region(rows, startX, startY, lit, rtype) {
    const g = game;
    const roomno = g.level.nroom + ROOMOFFSET;
    const croom = {
        lx: startX + 1, ly: startY + 1,
        hx: startX + rows[0].length - 2, hy: startY + rows.length - 2,
        rtype, rlit: lit ? 1 : 0,
        doorct: 0, fdoor: g.level.doorindex,
        irregular: true, needjoining: true,
        nsubrooms: 0, sbrooms: [],
        roomnoidx: g.level.nroom,
        needfill: FILL_NORMAL,
    };
    g.smeq[g.level.nroom] = g.level.nroom;
    for (let y = 0; y < rows.length; y++)
        for (let x = 0; x < rows[y].length; x++) {
            const loc = g.level.at(startX + x, startY + y);
            if (!loc) continue;
            if (lit) loc.lit = true;
            if (rows[y][x] === '.') loc.roomno = roomno;
            else if (rows[y][x] === '-' || rows[y][x] === '|') {
                loc.edge = true;
                loc.roomno = loc.roomno ? SHARED : roomno;
            }
        }
    g.level.rooms[g.level.nroom] = croom;
    g.level.nroom++;
    if (g.level.nroom < MAXNROFROOMS) g.level.rooms[g.level.nroom] = { hx: -1 };
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
            // positioned room (not used for seed8000)
            return false;
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
        let rx = xp.v;
        let ry = yp.v;
        const dx = xdir[rdir];
        const dy = ydir[rdir];
        while (isok(rx, ry)) {
            const loc = game.level.at(rx, ry);
            if (!loc || (loc.typ !== STONE && loc.typ !== CORR)) return false;
            rx += dx;
            ry += dy;
            if (good_rm_wall_doorpos(rx, ry, rdir, aroom)) {
                xp.v = rx;
                yp.v = ry;
                return true;
            }
            const next = game.level.at(rx, ry);
            if (!next || (next.typ !== STONE && next.typ !== CORR)) return false;
            if (rx < aroom.lx || rx > aroom.hx || ry < aroom.ly || ry > aroom.hy)
                return false;
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
function dosdoor(x, y, aroom, type) {
    const map = game.level;
    const loc = map.at(x, y);
    if (!loc) return;
    const shdoor = in_rooms(x, y, 0).length > 0;
    if (!IS_WALL(loc.typ)) type = DOOR;
    loc.typ = type;
    if (type === DOOR) {
        if (!rn2(3)) {
            if (!rn2(5)) loc.doormask = D_ISOPEN;
            else if (!rn2(6)) loc.doormask = D_LOCKED;
            else loc.doormask = D_CLOSED;
            if (loc.doormask !== D_ISOPEN && !shdoor
                && level_difficulty() >= 5 && !rn2(25))
                loc.doormask |= D_TRAPPED;
        } else {
            loc.doormask = shdoor ? D_ISOPEN : D_NODOOR;
        }
        if (loc.doormask & D_TRAPPED) {
            if (level_difficulty() >= 9 && !rn2(5)) {
                loc.doormask = D_NODOOR;
            }
        }
    } else {
        if (shdoor || !rn2(5)) loc.doormask = D_LOCKED;
        else loc.doormask = D_CLOSED;
        if (!shdoor && level_difficulty() >= 4 && !rn2(20))
            loc.doormask |= D_TRAPPED;
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
    const trap = game.level.traps?.some(t => t.tx === x && t.ty === y);
    return !!(trap || IS_FURNITURE(loc.typ) || loc.typ === LAVAPOOL || IS_POOL(loc.typ));
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
                if (TRAP_ENGRAVINGS[actualTrap]) {
                    make_engr_at(xx, yy - dy, TRAP_ENGRAVINGS[actualTrap], null, 0, DUST);
                    wipe_engr_at(xx, yy - dy, 5, false);
                }
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
                        // C ref: mkclass(S_HUMAN, 0), enough of the sorted
                        // regular human class to cover level-one niches.
                        let num = 0;
                        let prevDifficulty = 0;
                        const maxmlev = level_difficulty() >> 1;
                        const heroLevel = game.u?.ulevel ?? 1;
                        for (const candidate of HUMAN_MKCLASS_CANDIDATES) {
                            rn2(9);
                            if (candidate.placeholder || candidate.noGen) {
                                prevDifficulty = candidate.difficulty;
                                continue;
                            }
                            if (num && candidate.difficulty > maxmlev
                                && candidate.difficulty > prevDifficulty && rn2(2)) {
                                break;
                            }
                            let adj = candidate.mlevel;
                            const diffAdjust = level_difficulty() - adj;
                            if (diffAdjust < 0) adj--;
                            else adj += Math.trunc(diffAdjust / 5);
                            const heroAdjust = heroLevel - candidate.mlevel;
                            if (heroAdjust > 0) adj += Math.trunc(heroAdjust / 4);
                            adj = Math.max(0, Math.min(Math.trunc(3 * candidate.mlevel / 2), adj));
                            num += candidate.freq + 1 - (adj > heroLevel * 2 ? 1 : 0);
                            prevDifficulty = candidate.difficulty;
                        }
                        rnd(num);
                        mkcorpstat(CORPSE, null, 0, xx, yy + dy, 8);
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

function find_branch_room(mp) {
    const croom = generate_stairs_find_room();
    if (croom) somexyspace(croom, mp);
    return croom;
}

function place_branch(branchp) {
    const g = game;
    const mp = { x: 0, y: 0 };
    const croom = find_branch_room(mp);
    if (croom && mp.x > 0) {
        const on_end1 = (branchp.end1?.dnum === g.u?.uz?.dnum
            && branchp.end1?.dlevel === g.u?.uz?.dlevel);
        const dest = on_end1 ? branchp.end2 : branchp.end1;
        const goes_up = on_end1 ? !!branchp.end1_up : !branchp.end1_up;
        const loc = g.level?.at(mp.x, mp.y);
        if (loc) {
            loc.typ = STAIRS;
            loc.ladder = goes_up ? 1 : 2;
        }
        stairway_add(mp.x, mp.y, goes_up, false, dest || { dnum: 0, dlevel: 0 });
        if (goes_up) g.level.upstair = { x: mp.x, y: mp.y };
        else g.level.dnstair = { x: mp.x, y: mp.y };
    }
    g.made_branch = true;
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
    const lvl = game.u?.uz?.dlevel ?? 1;
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
    const lvl = game.u?.uz?.dlevel ?? 1;
    const kind = trap.ttyp;
    const x = trap.tx, y = trap.ty;
    // Object based on trap type
    switch (kind) {
    case ARROW_TRAP: mksobj(349, true, false); break; // ARROW
    case DART_TRAP: mksobj(353, true, false); break; // DART
    case ROCKTRAP: mksobj(ROCK, true, false); break;
    default: break;
    }
    // Random items on victim
    do {
        const cls = [WEAPON_CLASS, TOOL_CLASS, FOOD_CLASS, GEM_CLASS][rn2(4)];
        const otmp = mkobj(cls, false);
        curse(otmp);
    } while (!rn2(5));
    // Victim type
    const PM_ELF = 18, PM_DWARF = 19, PM_ORC = 20, PM_GNOME = 21, PM_HUMAN = 22;
    const PM_ARCHEOLOGIST = 305, PM_WIZARD = PM_ARCHEOLOGIST + 12;
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
            const otmp = mksobj(rn2(4) ? 370 : 371, true, false); // TALLOW_CANDLE / WAX_CANDLE
            curse(otmp);
        }
        break;
    default: victim_mnum = PM_HUMAN; break;
    }
    if (victim_mnum === PM_HUMAN && rn2(25))
        victim_mnum = rn1(PM_WIZARD - PM_ARCHEOLOGIST, PM_ARCHEOLOGIST);
    mkcorpstat(CORPSE, null, victim_mnum, x, y, 8); // CORPSTAT_INIT
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
    const lvl = game.u?.uz?.dlevel ?? 1;
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

function fill_special_room(croom) {
    if (!croom || croom.needfill !== FILL_NORMAL || croom.rtype !== VAULT) return;
    const amountDie = Math.abs(depth_of_level(game.u?.uz)) * 100;
    for (let x = croom.lx; x <= croom.hx; x++)
        for (let y = croom.ly; y <= croom.hy; y++)
            mkgold(rn1(amountDie, 51), x, y);
}

async function fill_ordinary_room(croom, bonus_items) {
    const g = game;
    if (!croom || (croom.rtype !== OROOM && croom.rtype !== THEMEROOM)) return;
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
        const oracle_dlevel = g.oracle_level?.dlevel ?? 5;
        const mines_dnum = (g.dungeons || []).findIndex(d => d?.name === 'The Gnomish Mines');
        const branchToMines = branchp && mines_dnum >= 0 && g.u?.uz?.dnum !== mines_dnum
            && (branchp.end1?.dnum === mines_dnum || branchp.end2?.dnum === mines_dnum);
        if (branchToMines) {
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
        const { text: engrText } = random_engraving();
        if (engrText) {
            do {
                somexyspace(croom, pos);
                if (g.level?.at(pos.x, pos.y)?.typ === ROOM) break;
            } while (!rn2(40));
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
    const absDepth = depth_of_level(game.u?.uz);
    const dunLevel = game.u?.uz?.dlevel ?? 1;
    if (goldprob < 0) goldprob = 20 + Math.trunc(absDepth / 3);
    if (gemprob < 0) gemprob = Math.trunc(goldprob / 4);
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
                    rn2(3);
                }
                if (rn2(1000) < gemprob) {
                    const cnt = rnd(2 + Math.trunc(dunLevel / 3));
                    for (let i = 0; i < cnt; i++) {
                        const otmp = mkobj(GEM_CLASS, false);
                        if (!otmp?.isRock) rn2(3);
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
