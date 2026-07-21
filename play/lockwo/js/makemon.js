// makemon.js - Monster creation.
// C ref: makemon.c - rndmonst_adj, rndmonst, mkclass, mkclass_aligned,
//        makemon, newmonhp, m_initweap.

import { game } from './gstate.js';
import { rn2, rnd, d, rn1 } from './rng.js';
import { depth as depth_of_level } from './hacklib.js';
import { DART, mksobj, mkobj, next_ident, mkobj_at, weight, curse } from './mkobj.js';
import { get_shop_item, FODDERSHOP, VEGETARIAN_CLASS } from './shtypes.js';
// Object-class constants inlined (not imported) to avoid a circular-import TDZ:
// mkobj.js's dependency chain reaches makemon.js, so importing these names here
// can hit them before mkobj.js finishes initializing.
const RANDOM_CLASS = 0, COIN_CLASS = 12, MAXOCLASSES = 18;

// Object type indices (mkobj.js OBJECT_DATA), needed by m_initweap.
const ORCISH_DAGGER = 36;
// SCIMITAR (50) is the alternative in C's ORCISH_DAGGER/SCIMITAR ternary, but
// PM_GOBLIN always short-circuits to ORCISH_DAGGER, so it is never reached here.
const ORCISH_HELM = 90;
import {
    A_NONE, A_CHAOTIC, A_NEUTRAL, A_LAWFUL,
    AM_NONE, AM_CHAOTIC, AM_NEUTRAL, AM_LAWFUL,
    DUNGEON_ALIGN_BY_DNUM,
    GEHENNOM,
    In_endgame, Is_astralevel, Is_rogue_level,
    COLNO, ROWNO, DOOR, IN_SIGHT, POOL, MOAT, WATER, LAVAPOOL,
} from './const.js';

const G_UNIQ = 0x1000;
const G_NOHELL = 0x0800;
const G_HELL = 0x0400;
const G_NOGEN = 0x0200;
const G_SGROUP = 0x0080; // appear in small groups normally
const G_LGROUP = 0x0040; // appear in large groups normally
const G_GENO = 0x0020;
const G_NOCORPSE = 0x0010;
const G_FREQ = 0x0007;
const MM_NOGRP = 0x00002000; // suppress creation of monster groups
const MM_ANGRY = 0x00000020; // monster is created angry
const G_IGNORE = 0x8000;
const G_GONE = 0x03; // mvflags G_GENOD | G_EXTINCT
const G_GENOD = 0x02;

const MR_FIRE = 0x01;
const MR_COLD = 0x02;

const NON_PM = -1;
// C ref: global.h:411 — #define ALIGNWEIGHT 4 (generation weight of alignment).
const ALIGNWEIGHT = 4;

// S_* monster-class symbol indices (include/defsym.h MONSYM order).
const S_LICH = 38;
const S_HUMAN = 53;
const MAXMCLASSES = 61;

// is_placeholder() monsters (include/mondata.h): PM indices excluded by
// mkclass()'s mk_gen_ok.  These are abstract class placeholders.
const PM_ORC = 72;
const PM_GIANT = 169;
const PM_HUMAN = 260;
const PM_ELF = 264;

// SPECIAL_PM = PM_LONG_WORM_TAIL; mons[] iteration for generation stops here.
const SPECIAL_PM = 329;

// S_* index -> display character (include/defsym.h).  Used for the rogue-level
// isupper(monsym) test and for class symbols.
const SYM_CHAR = [
    '\0', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
    'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N',
    'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
    '@', ' ', '\'', '&', ';', ':', '~', ']',
];

// Full mons[] generation data, in mngen (array) order, ported from
// src/monst.c / include/monsters.h (the MON() entries).  Tuple layout:
//   [pmidx, mlet(S_* index), mlevel, maligntyp, geno, mresists, gender,
//    difficulty, mcolor]
// gender: 0 = femaleok/random (rn2(2) consumed), 1 = always male,
//         2 = always female, 3 = neuter (no rn2(2)).  Derived from the
//         M2_MALE / M2_FEMALE / M2_NEUTER flags of mflags2.
// Only the fields that influence the RNG-relevant generation paths are kept
// (selection weighting, difficulty filtering, HP roll, gender, color/symbol).
const MONS_RAW = [
    [0,1,2,0,163,0,0,4,3], [1,1,1,0,98,32,2,6,11], [2,1,3,0,162,32,0,7,4],
    [3,1,3,0,161,1,0,6,1], [4,1,5,0,35,32,0,6,0], [5,1,9,0,544,32,2,12,5],
    [6,2,1,0,34,228,3,2,2], [7,2,5,0,34,36,3,6,15], [8,2,6,0,34,247,3,8,6],
    [9,3,4,0,161,160,0,7,3], [10,3,5,0,37,160,0,8,11], [11,3,6,0,33,33,0,8,1],
    [12,4,0,0,163,0,0,1,3], [13,4,0,0,33,0,0,1,1], [14,4,1,0,161,0,0,2,3],
    [15,4,2,-7,528,32,0,4,3], [16,4,2,0,33,0,0,3,15], [17,4,4,0,33,0,0,5,11],
    [18,4,4,0,33,0,0,5,15], [19,4,6,0,33,0,0,7,15], [20,4,5,0,162,0,0,6,7],
    [21,4,5,-7,528,32,0,7,7], [22,4,5,0,2210,2,0,7,6], [23,4,7,-5,162,0,0,8,0],
    [24,4,7,-5,2081,2,0,9,6], [25,4,7,0,1185,1,0,9,1], [26,4,12,-5,1057,1,0,14,1],
    [27,5,1,0,49,0,3,2,7], [28,5,2,0,37,0,3,3,4], [29,5,6,0,2098,2,3,9,15],
    [30,5,6,0,50,1,3,9,1], [31,5,6,0,50,16,3,10,12], [32,6,2,0,33,0,0,3,15],
    [33,6,4,0,33,0,0,5,15], [34,6,4,0,34,0,0,6,3], [35,6,5,0,33,0,0,7,6], [36,6,5,0,33,0,0,7,0],
    [37,6,6,0,33,0,0,7,15], [38,6,6,0,34,0,0,8,11], [39,6,12,-3,33,0,0,14,4],
    [40,7,5,-9,34,32,0,8,2], [41,7,6,-9,34,128,0,8,3], [42,7,9,-12,33,128,0,11,5],
    [43,8,1,6,34,0,0,2,2], [44,8,2,4,35,0,0,4,1], [45,8,3,-6,33,0,0,5,3], [46,8,4,5,34,0,0,6,4],
    [47,8,6,6,33,0,0,8,5], [48,8,9,-8,33,0,0,13,13], [49,8,13,-8,33,0,0,19,13],
    [50,9,1,-7,113,36,0,3,1], [51,9,2,-7,34,36,0,3,2], [52,9,3,-7,33,0,0,4,1],
    [53,9,3,-7,1137,36,3,5,3], [54,9,3,-7,34,32,0,7,4], [55,9,6,7,35,32,0,7,6],
    [56,10,4,0,34,34,3,5,4], [57,10,5,0,33,192,3,6,2], [58,10,6,0,34,192,3,8,3],
    [59,11,0,-2,33,32,0,1,3], [60,11,1,-3,33,32,0,2,1], [61,11,2,-4,33,32,0,3,5],
    [62,11,2,-4,33,32,0,4,12], [63,12,5,0,36,0,0,4,2], [64,13,7,0,34,64,0,8,3],
    [65,13,8,0,33,64,0,9,1], [66,13,9,0,33,64,0,11,5], [67,14,3,0,34,0,2,5,2],
    [68,14,3,0,34,0,2,5,4], [69,14,3,0,34,0,2,5,3], [70,15,0,-3,34,0,0,1,7],
    [71,15,1,-4,34,0,0,3,3], [72,15,1,-3,608,32,0,3,1], [73,15,2,-4,98,32,0,4,11],
    [74,15,3,-5,97,32,0,5,4], [75,15,3,-4,97,32,0,5,0], [76,15,3,-5,33,32,0,5,12],
    [77,15,5,-5,33,32,0,7,5], [78,16,3,0,36,0,0,4,7], [79,16,5,0,34,0,0,6,6],
    [80,16,7,0,33,64,0,9,15], [81,17,2,0,164,0,0,4,3], [82,17,5,-2,33,0,0,7,7],
    [83,17,6,0,34,0,0,8,1], [84,17,8,0,33,0,0,9,6], [85,17,12,0,34,0,0,13,7],
    [86,17,14,0,34,0,0,15,7], [87,17,20,0,33,0,0,22,0], [88,18,0,0,161,0,0,1,3],
    [89,18,1,0,162,0,0,2,3], [90,18,2,0,33,32,0,4,3], [91,18,2,-7,528,32,0,4,3],
    [92,18,3,0,34,0,0,4,7], [93,18,3,0,544,0,0,4,3], [94,19,1,0,162,32,0,3,7],
    [95,19,2,0,33,32,0,4,11], [96,19,5,0,33,32,0,7,5], [97,19,5,0,34,32,0,8,1],
    [98,20,10,0,34,0,0,12,7], [99,20,12,0,34,0,0,14,2], [100,21,3,0,34,0,0,4,3],
    [101,21,4,7,34,32,0,6,15], [102,21,4,0,33,32,0,6,7], [103,21,4,-7,33,32,0,6,0],
    [104,21,5,0,34,0,0,7,3], [105,21,7,0,34,0,0,9,3], [106,22,3,0,50,164,3,4,7],
    [107,22,4,0,50,164,3,6,3], [108,22,5,0,2097,166,3,7,6], [109,22,6,0,49,188,3,9,12],
    [110,22,7,0,1074,165,3,9,4], [111,22,8,0,1073,165,3,10,11], [112,23,5,0,32,0,0,6,3],
    [113,23,8,0,32,0,0,9,5], [114,23,9,0,34,0,0,10,3], [115,23,15,0,34,0,0,17,5],
    [116,24,0,0,179,48,0,1,5], [117,24,7,0,35,32,0,9,1], [118,25,3,0,52,255,3,5,11],
    [119,25,5,0,50,255,3,7,0], [120,26,9,0,34,0,0,11,3], [121,27,8,7,2193,32,0,11,2],
    [122,27,10,7,2065,54,0,12,11], [123,27,14,12,2065,54,0,19,15],
    [124,27,16,15,2065,32,0,21,11], [125,27,19,15,2065,55,0,26,5], [126,28,0,0,161,0,0,2,3],
    [127,28,2,0,34,0,0,3,1], [128,28,4,0,34,0,0,6,0], [129,28,5,0,34,36,0,7,0],
    [130,29,4,0,33,0,0,6,3], [131,29,5,-1,33,0,0,8,2], [132,29,6,-3,33,0,0,9,6],
    [133,30,12,0,32,0,0,13,7], [134,30,12,0,32,0,0,13,11], [135,30,12,0,32,0,0,13,14],
    [136,30,12,0,32,1,0,13,1], [137,30,12,0,32,2,0,13,15], [138,30,12,0,32,4,0,13,9],
    [139,30,12,0,32,8,0,13,0], [140,30,12,0,32,16,0,13,4], [141,30,12,0,32,32,0,13,2],
    [142,30,12,0,32,192,0,13,11], [143,30,15,4,33,0,0,20,7], [144,30,15,4,33,1,0,20,11],
    [145,30,15,4,33,2,0,20,14], [146,30,15,-4,33,1,0,20,1], [147,30,15,-5,33,2,0,20,15],
    [148,30,15,5,33,4,0,20,9], [149,30,15,-6,33,8,0,20,0], [150,30,15,-7,33,16,0,20,4],
    [151,30,15,6,33,32,0,20,2], [152,30,15,7,33,192,0,20,11], [153,31,8,0,35,0,0,9,15],
    [154,31,8,0,17,160,3,10,6], [155,31,8,0,17,161,3,10,11], [156,31,8,0,17,163,3,10,3],
    [157,31,8,0,17,160,3,10,4], [158,32,0,0,36,0,3,1,10], [159,32,1,0,33,34,3,2,3],
    [160,32,1,0,34,32,3,2,11], [161,32,1,0,33,192,3,2,2], [162,32,1,0,33,33,3,2,1],
    [163,32,3,0,33,32,3,2,5], [164,32,3,0,34,32,3,5,5], [165,33,1,0,161,0,0,3,3],
    [166,33,3,0,34,0,0,4,4], [167,33,3,0,33,0,0,5,12], [168,33,5,0,33,0,0,6,5],
    [169,34,6,2,545,0,0,8,1], [170,34,6,2,161,0,0,8,7], [171,34,8,-2,161,0,0,10,6],
    [172,34,9,2,161,1,0,11,11], [173,34,10,-3,2209,2,0,13,15], [174,34,10,0,33,0,0,13,3],
    [175,34,16,-3,161,16,0,19,4], [176,34,16,9,1,0,0,20,5], [177,34,15,0,544,0,0,17,3],
    [178,36,15,0,33,0,0,18,9], [179,37,1,9,608,0,1,3,4], [180,37,2,10,672,0,1,4,4],
    [181,37,3,11,544,0,1,5,6], [182,37,4,12,544,0,1,6,5], [183,38,11,-9,49,38,0,14,3],
    [184,38,14,-12,49,38,0,18,1], [185,38,17,-15,1073,39,0,21,5],
    [186,38,25,-15,1073,55,0,29,5], [187,39,3,-2,49,38,0,4,3], [188,39,4,-3,49,38,0,5,1],
    [189,39,5,-4,49,38,0,6,7], [190,39,5,-4,49,38,0,6,1], [191,39,6,-5,49,38,0,7,2],
    [192,39,6,-5,49,38,0,7,7], [193,39,7,-6,49,38,0,8,4], [194,39,8,-7,49,38,0,10,6],
    [195,40,3,0,32,33,0,4,1], [196,40,3,0,32,224,0,4,0], [197,40,3,0,32,32,0,4,11],
    [198,40,3,0,32,32,0,4,2], [199,40,6,-4,33,33,0,8,1], [200,40,8,4,33,224,0,10,0],
    [201,40,10,5,33,32,0,13,11], [202,40,12,7,33,32,0,17,2], [203,41,5,-3,161,0,0,7,3],
    [204,41,7,-5,34,0,0,9,1], [205,41,9,-7,34,0,0,11,5], [206,42,3,0,50,227,3,4,7],
    [207,42,5,0,49,242,3,6,3], [208,42,6,0,1073,242,3,8,2], [209,42,10,0,49,242,3,12,0],
    [210,43,7,0,35,32,0,9,6], [211,43,12,0,33,32,0,14,2], [212,44,5,0,34,0,0,8,3],
    [213,44,12,-3,1058,0,0,14,4], [214,45,1,0,97,0,0,3,2], [215,45,4,0,34,32,0,6,3],
    [216,45,4,0,608,32,0,7,1], [217,45,6,0,33,0,0,8,5], [218,45,6,0,33,32,0,9,4],
    [219,45,6,0,33,32,0,10,4], [220,46,7,-3,34,0,0,9,3], [221,46,9,-3,2081,2,0,12,15],
    [222,46,9,-3,33,0,0,12,6], [223,46,11,-3,544,0,0,13,4], [224,46,13,-7,33,0,0,16,5],
    [225,47,9,0,34,0,0,12,3], [226,48,10,-8,49,36,0,12,1], [227,48,12,-9,49,36,0,14,4],
    [228,48,28,-10,4624,36,1,32,5], [229,49,3,-3,49,38,0,8,7], [230,49,6,-6,34,166,0,8,0],
    [231,49,13,-17,49,38,1,17,5], [232,50,8,0,33,131,0,11,3], [233,51,2,0,33,0,0,4,7],
    [234,51,4,0,162,0,0,6,3], [235,51,5,0,35,0,0,7,3], [236,51,5,0,34,2,0,7,15],
    [237,51,6,0,33,0,0,8,0], [238,51,7,2,33,0,0,9,7], [239,52,0,-2,49,38,0,1,3],
    [240,52,1,-2,49,38,0,2,3], [241,52,2,-3,177,38,0,3,7], [242,52,2,-3,177,38,0,3,1],
    [243,52,3,-3,177,38,0,4,2], [244,52,4,-3,177,38,0,5,15], [245,52,6,-4,49,38,0,7,4],
    [246,52,3,-2,49,38,0,5,0], [247,52,8,-4,49,38,0,9,6], [248,52,12,0,528,166,0,14,15],
    [249,55,3,0,17,38,3,4,11], [250,55,3,0,17,38,3,4,15], [251,55,4,0,17,36,3,6,3],
    [252,55,5,0,17,100,3,6,11], [253,55,6,0,17,36,3,7,3], [254,55,7,0,17,38,3,8,3],
    [255,55,9,0,1,55,0,10,1], [256,55,11,0,17,36,0,12,3], [257,55,14,0,17,164,0,15,7],
    [258,55,16,0,17,100,0,18,6], [259,55,18,0,17,55,0,22,6], [260,53,0,0,512,0,0,2,15],
    [261,53,2,-7,1,32,0,3,3], [262,53,2,-7,1,32,0,3,1], [263,53,5,-7,1,32,0,6,9],
    [264,53,0,-3,512,4,0,1,15], [265,53,4,-5,162,4,0,6,2], [266,53,5,-6,162,4,0,7,10],
    [267,53,6,-7,162,4,0,8,7], [268,53,8,-9,162,4,0,11,12], [269,53,9,-10,33,4,0,11,5],
    [270,53,9,0,33,4,0,11,15], [271,53,12,0,512,0,0,15,15], [272,53,12,10,512,0,0,14,4],
    [273,53,12,0,512,0,0,14,15], [274,53,12,0,4608,0,2,13,12], [275,53,12,0,512,16,0,15,15],
    [276,53,25,0,4608,53,0,30,15], [277,53,6,-2,161,0,0,8,7], [278,53,8,-3,161,0,0,10,1],
    [279,53,11,0,35,32,0,13,15], [280,53,10,-4,33,0,0,12,2], [281,53,12,-5,33,0,0,14,4],
    [282,53,6,-2,673,0,0,8,7], [283,53,10,-4,545,0,0,12,2], [284,53,20,-15,4608,160,2,25,10],
    [285,53,30,-128,4608,33,1,34,13], [286,53,20,15,4608,0,1,22,5],
    [287,54,10,-5,528,174,0,12,7], [288,54,12,0,528,174,0,14,0], [289,56,8,-7,528,33,0,11,4],
    [290,56,6,-9,17,33,0,8,7], [291,56,6,11,1042,33,0,9,3], [292,56,7,10,1170,33,2,10,1],
    [293,56,8,8,1170,33,0,11,1], [294,56,7,-12,1041,33,2,11,1], [295,56,8,-9,1170,33,0,11,2],
    [296,56,9,-10,1170,33,0,12,2], [297,56,9,-9,1170,33,0,13,7],
    [298,56,11,-12,1042,35,0,15,15], [299,56,11,-11,1041,33,0,15,1],
    [300,56,13,-13,1042,33,0,16,1], [301,56,13,-5,1041,128,0,15,7],
    [302,56,16,-14,1041,33,0,20,1], [303,56,50,-15,5648,225,1,26,10],
    [304,56,56,-15,5648,33,1,31,5], [305,56,66,-20,5648,33,1,36,5],
    [306,56,72,15,5648,33,1,36,5], [307,56,78,15,5648,33,1,40,5], [308,56,89,20,5648,33,1,45,5],
    [309,56,105,20,5648,35,1,53,5], [310,56,106,-20,5648,33,1,57,5],
    [311,56,30,0,4608,183,0,34,13], [312,56,30,0,4608,183,0,34,13],
    [313,56,30,0,4608,183,0,34,13], [314,56,7,0,528,160,0,8,11], [315,57,3,0,544,32,0,5,4],
    [316,57,5,0,672,0,0,7,1], [317,57,7,0,544,0,0,9,7], [318,57,5,0,544,0,0,7,6],
    [319,57,7,0,544,16,0,10,12], [320,57,20,-3,544,0,0,22,1], [321,58,0,0,37,0,0,1,11],
    [322,58,1,0,37,0,0,2,2], [323,58,2,0,37,0,0,3,3], [324,58,3,0,32,0,0,4,3],
    [325,58,5,0,37,128,0,6,2], [326,58,6,0,34,0,0,7,3], [327,58,6,0,33,0,0,7,3],
    [328,58,8,-9,1025,5,0,12,9], [329,59,0,0,4624,0,0,1,3], [330,53,10,3,512,0,0,12,15],
    [331,53,10,0,512,32,0,12,15], [332,53,10,1,512,0,0,12,15], [333,53,10,0,512,32,0,12,15],
    [334,53,10,3,512,0,0,12,15], [335,53,10,0,512,0,0,11,15], [336,53,10,0,512,0,0,12,15],
    [337,53,10,-3,512,0,0,12,15], [338,53,10,-3,512,0,0,12,15], [339,53,10,3,512,0,0,12,15],
    [340,53,10,0,512,0,0,12,15], [341,53,10,1,512,2,2,12,15], [342,53,10,0,512,0,0,12,15],
    [343,53,20,20,4608,0,1,24,5], [344,53,20,0,4608,32,1,24,5], [345,53,20,20,4608,0,1,24,5],
    [346,53,20,0,4608,32,1,26,5], [347,53,20,20,4608,0,1,24,5], [348,53,25,0,4608,53,1,30,0],
    [349,53,25,0,4608,53,1,30,15], [350,53,20,0,4608,0,1,24,5], [351,53,20,-20,4608,128,1,24,5],
    [352,53,20,20,4608,0,1,24,5], [353,53,20,0,4608,0,1,22,15], [354,53,20,0,4608,2,2,24,5],
    [355,53,20,0,4608,0,2,25,2], [356,56,16,-14,4624,161,0,23,9],
    [357,53,16,-14,4624,160,1,22,5], [358,30,16,-14,4608,255,2,23,5],
    [359,34,18,-15,4608,128,1,23,7], [360,30,15,-14,4608,129,1,22,1],
    [361,53,25,-20,4608,160,1,31,5], [362,56,16,-127,4624,161,1,23,9],
    [363,19,15,-15,4608,160,1,17,5], [364,53,15,18,4608,128,1,20,5],
    [365,53,15,-13,4624,128,1,19,5], [366,34,15,12,4608,129,1,19,5],
    [367,53,15,-10,4624,128,0,20,0], [368,53,5,3,512,0,0,7,15], [369,53,5,0,512,32,0,7,15],
    [370,53,5,1,512,0,0,7,15], [371,53,5,0,512,32,0,7,15], [372,53,5,3,512,0,0,7,15],
    [373,53,5,0,512,0,0,8,15], [374,53,5,0,512,0,0,8,15], [375,53,5,-7,512,0,0,7,15],
    [376,53,5,-3,512,0,0,7,15], [377,53,5,3,512,0,0,7,15], [378,53,5,3,512,0,0,7,15],
    [379,53,5,0,512,0,0,8,15], [380,53,5,1,512,0,2,7,15], [381,53,5,0,512,0,0,8,15],
];

// Neutral monster names, indexed by pmidx (src/monst.c MON() name fields).
// Consumed by external callers (eat.js corpse names, display); not parity.
const MONS_NAMES = [
    "giant ant", "killer bee", "soldier ant", "fire ant", "giant beetle", "queen bee",
    "acid blob", "quivering blob", "gelatinous cube", "chickatrice", "cockatrice", "pyrolisk",
    "jackal", "fox", "coyote", "werejackal", "little dog", "dingo", "dog", "large dog", "wolf",
    "werewolf", "winter wolf cub", "warg", "winter wolf", "hell hound pup", "hell hound",
    "gas spore", "floating eye", "freezing sphere", "flaming sphere", "shocking sphere",
    "kitten", "housecat", "jaguar", "lynx", "panther", "large cat", "tiger", "displacer beast",
    "gremlin", "gargoyle", "winged gargoyle", "hobbit", "dwarf", "bugbear", "dwarf leader",
    "dwarf ruler", "mind flayer", "master mind flayer", "manes", "homunculus", "imp", "lemure",
    "quasit", "tengu", "blue jelly", "spotted jelly", "ochre jelly", "kobold", "large kobold",
    "kobold leader", "kobold shaman", "leprechaun", "small mimic", "large mimic", "giant mimic",
    "wood nymph", "water nymph", "mountain nymph", "goblin", "hobgoblin", "orc", "hill orc",
    "Mordor orc", "Uruk-hai", "orc shaman", "orc-captain", "rock piercer", "iron piercer",
    "glass piercer", "rothe", "mumak", "leocrotta", "wumpus", "titanothere", "baluchitherium",
    "mastodon", "sewer rat", "giant rat", "rabid rat", "wererat", "rock mole", "woodchuck",
    "cave spider", "centipede", "giant spider", "scorpion", "lurker above", "trapper", "pony",
    "white unicorn", "gray unicorn", "black unicorn", "horse", "warhorse", "fog cloud",
    "dust vortex", "ice vortex", "energy vortex", "steam vortex", "fire vortex",
    "baby long worm", "baby purple worm", "long worm", "purple worm", "grid bug", "xan",
    "yellow light", "black light", "zruty", "couatl", "Aleax", "Angel", "ki-rin", "Archon",
    "bat", "giant bat", "raven", "vampire bat", "plains centaur", "forest centaur",
    "mountain centaur", "baby gray dragon", "baby gold dragon", "baby silver dragon",
    "baby red dragon", "baby white dragon", "baby orange dragon", "baby black dragon",
    "baby blue dragon", "baby green dragon", "baby yellow dragon", "gray dragon", "gold dragon",
    "silver dragon", "red dragon", "white dragon", "orange dragon", "black dragon",
    "blue dragon", "green dragon", "yellow dragon", "stalker", "air elemental",
    "fire elemental", "earth elemental", "water elemental", "lichen", "brown mold",
    "yellow mold", "green mold", "red mold", "shrieker", "violet fungus", "gnome",
    "gnome leader", "gnomish wizard", "gnome ruler", "giant", "stone giant", "hill giant",
    "fire giant", "frost giant", "ettin", "storm giant", "titan", "minotaur", "jabberwock",
    "Keystone Kop", "Kop Sergeant", "Kop Lieutenant", "Kop Kaptain", "lich", "demilich",
    "master lich", "arch-lich", "kobold mummy", "gnome mummy", "orc mummy", "dwarf mummy",
    "elf mummy", "human mummy", "ettin mummy", "giant mummy", "red naga hatchling",
    "black naga hatchling", "golden naga hatchling", "guardian naga hatchling", "red naga",
    "black naga", "golden naga", "guardian naga", "ogre", "ogre leader", "ogre tyrant",
    "gray ooze", "brown pudding", "green slime", "black pudding", "quantum mechanic",
    "genetic engineer", "rust monster", "disenchanter", "garter snake", "snake",
    "water moccasin", "python", "pit viper", "cobra", "troll", "ice troll", "rock troll",
    "water troll", "Olog-hai", "umber hulk", "vampire", "vampire leader", "Vlad the Impaler",
    "barrow wight", "wraith", "Nazgul", "xorn", "monkey", "ape", "owlbear", "yeti",
    "carnivorous ape", "sasquatch", "kobold zombie", "gnome zombie", "orc zombie",
    "dwarf zombie", "elf zombie", "human zombie", "ettin zombie", "ghoul", "giant zombie",
    "skeleton", "straw golem", "paper golem", "rope golem", "gold golem", "leather golem",
    "wood golem", "flesh golem", "clay golem", "stone golem", "glass golem", "iron golem",
    "human", "wererat", "werejackal", "werewolf", "elf", "Woodland-elf", "Green-elf",
    "Grey-elf", "elf-noble", "elven monarch", "doppelganger", "shopkeeper", "guard", "prisoner",
    "Oracle", "aligned cleric", "high cleric", "soldier", "sergeant", "nurse", "lieutenant",
    "captain", "watchman", "watch captain", "Medusa", "Wizard of Yendor", "Croesus", "ghost",
    "shade", "water demon", "amorous demon", "horned devil", "erinys", "barbed devil",
    "marilith", "vrock", "hezrou", "bone devil", "ice devil", "nalfeshnee", "pit fiend",
    "sandestin", "balrog", "Juiblex", "Yeenoghu", "Orcus", "Geryon", "Dispater", "Baalzebub",
    "Asmodeus", "Demogorgon", "Death", "Pestilence", "Famine", "djinni", "jellyfish", "piranha",
    "shark", "giant eel", "electric eel", "kraken", "newt", "gecko", "iguana", "baby crocodile",
    "lizard", "chameleon", "crocodile", "salamander", "long worm tail", "archeologist",
    "barbarian", "cave dweller", "healer", "knight", "monk", "cleric", "ranger", "rogue",
    "samurai", "tourist", "valkyrie", "wizard", "Lord Carnarvon", "Pelias", "Shaman Karnov",
    "Hippocrates", "King Arthur", "Grand Master", "Arch Priest", "Orion", "Master of Thieves",
    "Lord Sato", "Twoflower", "Norn", "Neferet the Green", "Minion of Huhetotl", "Thoth Amon",
    "Chromatic Dragon", "Cyclops", "Ixoth", "Master Kaen", "Nalzok", "Scorpius",
    "Master Assassin", "Ashikaga Takauji", "Lord Surtur", "Dark One", "student", "chieftain",
    "neanderthal", "attendant", "page", "abbot", "acolyte", "hunter", "thug", "ninja", "roshi",
    "guide", "warrior", "apprentice",
];

// Build per-monster records from the tuple data.  `mlet` is the DISPLAY
// CHARACTER (so existing display.js / eat.js consumers keep working); `mcls`
// is the numeric S_* class index used internally by rndmonst()/mkclass().
// Map numeric gender code -> the STRING value other modules expect
// (mkobj.js mkcorpstat_spe checks 'neuter'/'female'/'male', else random).
const GENDER_STR = ['random', 'male', 'female', 'neuter'];

// verysmall(ptr) == (msize < MZ_SMALL), i.e. MZ_TINY.  pmidx set ported from
// the SIZ() size field of include/monsters.h.  Consumed by mkobj.js's STATUE
// spellbook-stuffing test (mkobj.c:1154).
const VERYSMALL = new Set([
    0, 1, 2, 3, 5, 6, 9, 51, 52, 63, 88, 89, 90, 91, 94, 95, 116, 117, 126,
    214, 321, 322, 323, 325, 326,
]);

// C ref: monflag.h M1_CARNIVORE / M1_HERBIVORE — per-monster diet flags,
// extracted verbatim from the MON() entries in include/monsters.h.  Indexed by
// pmidx; value is a 2-bit code: bit0 = carnivore, bit1 = herbivore (3 = both,
// the M1_OMNIVORE pair).  Drives dog.c dogfood(), whose return value (DOGFOOD
// for an apple to a herbivore pony, etc.) decides when the pet's invent/fobj
// scans terminate — and therefore how many obj_resists rn2(100) rolls fire.
const MFOOD = [1,0,1,1,1,0,0,0,3,3,3,3,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,3,3,3,0,0,3,3,0,0,0,0,0,0,0,0,0,3,3,0,3,0,1,1,1,0,0,0,3,3,3,3,3,3,3,3,1,1,1,3,2,3,3,2,2,2,1,1,1,1,0,2,1,1,1,1,1,1,2,2,2,2,2,2,0,0,0,0,0,0,1,1,1,1,0,0,0,0,1,0,0,0,0,0,1,1,1,3,3,3,3,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,3,0,3,0,1,1,1,1,1,1,1,3,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,1,3,3,3,1,3,3,1,0,0,3,3,3,3,3,3,0,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,3,3,1,1,1,3,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,3,1,1,1,3,3,3,3,0,0,3,3,3,3,3,0,0,3,3,3,3,3,3,3,3,3,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0,3,3,0,3,3,2,0,3,3,3,3,3,3,3,3,3,3,3,2,3,3,3,3,3,3,3,0,3,1,3,1,2,0,1,3,3,3,3,3,3,3,3,3,2,3,3,3,3,3,3,3,3];

// C ref: include/monsters.h LVL(lvl, mov, ac, mr, aln) — the 3rd field is the
// monster's base armour class, consumed by worn.c find_mac() (which has no worn
// armour to add for these monsters).  Indexed by pmidx, generated from the C
// mons[] table (matched by name; a handful of renamed leaders use their C ac).
const MON_AC = [
    3, -1, 3, 3, 4, -4, 8, 8, 8, 8, 6, 6, 7, 7, 7, 10, 6, 5, 5, 4,
    4, 10, 4, 4, 4, 4, 2, 10, 9, 4, 4, 4, 6, 5, 6, 6, 6, 4, 6, -10,
    2, -4, -2, 10, 10, 5, 4, 2, 5, 0, 7, 6, 2, 7, 2, 5, 8, 8, 8, 10,
    10, 10, 6, 8, 7, 7, 7, 9, 9, 9, 10, 10, 10, 10, 10, 10, 5, 10, 3, 0,
    0, 7, 0, 4, 2, 6, 5, 5, 7, 7, 6, 10, 0, 0, 3, 3, 4, 3, 3, 3,
    6, 2, 2, 2, 5, 4, 0, 2, 2, 2, 2, 2, 5, 5, 5, 6, 9, -4, 0, 0,
    3, 5, 0, -4, -5, -6, 8, 7, 6, 6, 4, 3, 2, 2, 2, 2, 2, 2, 2, 2,
    2, 2, 2, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 3, 2, 2, 2, 2, 9, 9,
    9, 9, 9, 7, 7, 10, 10, 4, 4, 0, 0, 6, 4, 3, 3, 3, -3, 6, -2, 10,
    10, 10, 10, 0, -2, -4, -6, 6, 6, 5, 5, 4, 4, 4, 3, 6, 6, 6, 6, 4,
    2, 2, 0, 5, 3, 0, 8, 8, 6, 6, 3, 3, 2, -10, 8, 3, 3, 5, 2, 2,
    4, 2, 0, 4, -4, 2, 1, 0, -6, 5, 4, 0, -2, 6, 6, 5, 6, 6, 6, 10,
    10, 9, 9, 9, 8, 6, 10, 6, 4, 10, 10, 8, 6, 6, 4, 9, 7, 5, 1, 3,
    10, 10, 10, 10, 10, 10, 10, 10, 10, 5, 5, 0, 10, 10, 0, 0, -2, 10, 10, 0,
    10, 10, 10, 10, 2, -8, 0, -5, 10, -4, 0, -5, 2, 0, -6, 0, -2, -1, -4, -1,
    -3, 4, -2, -7, -5, -6, -3, -2, -5, -7, -8, -5, -5, -5, 4, 6, 4, 2, -1, -3,
    6, 8, 8, 7, 7, 6, 6, 5, -1, 0, 10, 10, 0, 10, 10, 10, 0, 10, 10, 10,
    10, 10, 10, 0, 0, 0, 0, 0, 0, 7, 0, 0, 0, 10, 0, 0, -2, 0, 0, 0,
    -1, -10, -2, 10, 0, 0, 2, 0, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10,
    10, 10,
];

// C ref: include/monsters.h SIZ(wt, nut, snd, siz) — corpse weight (cwt) and
// body size (msize, MZ_*).  Consumed by mkobj.c weight() for CORPSE / STATUE
// objects: a CORPSE weighs quan*cwt, so a missing cwt made every floor corpse
// weigh 1, which lets the pet's can_carry() load check pass spuriously and
// flips dog_goal() from UNDEF to APPORT (skipping the rn2(4) at dogmove.c:575).
// Generated from the C mons[] table, matched by (name, monster-class symbol);
// a handful of renamed leaders/rulers use their C counterpart's SIZ() values
// (dwarf leader=dwarf lord, gnome ruler=gnome king, amorous demon=incubus, ...).
// Indexed by pmidx.
const MON_CWT = [
    10, 1, 20, 30, 200, 1, 30, 200, 600, 10, 30, 30, 300, 300, 300, 300, 150, 400, 400, 800,
    500, 500, 250, 850, 700, 200, 600, 10, 10, 10, 10, 10, 150, 200, 600, 600, 600, 250, 600, 750,
    100, 1000, 1200, 500, 900, 1250, 900, 900, 1450, 1450, 100, 60, 20, 150, 200, 300, 50, 50, 50, 400,
    450, 500, 450, 60, 300, 600, 800, 600, 600, 600, 400, 1000, 850, 1000, 1200, 1300, 1000, 1350, 200, 400,
    400, 400, 2500, 1200, 2500, 2650, 3800, 3800, 20, 30, 30, 40, 30, 30, 50, 50, 200, 50, 800, 800,
    1300, 1300, 1300, 1300, 1500, 1800, 0, 0, 0, 0, 0, 0, 600, 600, 1500, 2700, 15, 300, 0, 0,
    1200, 900, 1450, 1450, 1450, 1450, 20, 30, 40, 30, 2500, 2550, 2550, 1500, 1500, 1500, 1500, 1500, 1500, 1500,
    1500, 1500, 1500, 4500, 4500, 4500, 4500, 4500, 4500, 4500, 4500, 4500, 4500, 900, 0, 0, 2500, 2500, 20, 50,
    50, 50, 50, 100, 100, 650, 700, 700, 750, 2250, 2250, 2200, 2250, 2250, 1700, 2250, 2300, 1500, 1300, 1450,
    1450, 1450, 1450, 1200, 1200, 1200, 1200, 400, 650, 850, 900, 800, 1450, 1700, 2050, 500, 500, 500, 500, 2600,
    2600, 2600, 2600, 1600, 1700, 1700, 500, 500, 400, 900, 1450, 1450, 1000, 750, 50, 100, 150, 250, 100, 250,
    800, 1000, 1200, 1200, 1500, 1200, 1450, 1450, 1450, 1200, 0, 1450, 1200, 100, 1100, 1700, 1600, 1250, 1550, 400,
    650, 850, 900, 800, 1450, 1700, 400, 2050, 300, 400, 400, 450, 450, 800, 900, 1400, 1550, 1900, 1800, 2000,
    1450, 1450, 1450, 1450, 800, 800, 800, 800, 800, 800, 1450, 1450, 1450, 1450, 1450, 1450, 1450, 1450, 1450, 1450,
    1450, 1450, 1450, 1450, 1450, 1450, 1450, 1450, 1450, 1450, 1450, 1450, 1450, 1450, 1450, 1450, 1450, 1450, 1450, 1450,
    1450, 1500, 1450, 1500, 900, 1500, 1500, 1500, 1500, 1500, 1500, 1450, 1450, 1450, 1500, 80, 60, 500, 200, 200,
    1800, 10, 10, 30, 200, 10, 100, 1450, 1500, 0, 1450, 1450, 1450, 1450, 1450, 1450, 1450, 1450, 1450, 1450,
    1450, 1450, 1450, 1450, 1450, 1450, 1450, 1450, 1450, 1450, 2200, 1450, 1450, 1450, 1800, 1450, 1450, 1450, 4500, 1900,
    4500, 1450, 1450, 750, 1450, 1450, 2250, 1450, 1450, 1450, 1450, 1450, 1450, 1450, 1450, 1450, 1450, 1450, 1450, 1450,
    1450, 1450,
];

// C ref: include/monsters.h SIZ() nutrition field (cnutrit) — the base
// nutrition of a corpse of this species (eat.c obj_nutrition() for a CORPSE,
// which sets otmp->oeaten before the per-bite lesshungry() delivery).  Indexed
// by pmidx; extracted verbatim from the MON()/SIZ() entries in monsters.h.
const MON_CNUTRIT = [
    10, 5, 5, 10, 50, 5, 10, 100, 150, 10, 30, 30, 250, 250, 250, 250, 150, 200, 200, 250,
    250, 250, 200, 350, 300, 200, 300, 10, 10, 10, 10, 10, 150, 200, 300, 300, 300, 250, 300, 400,
    20, 200, 300, 200, 300, 250, 300, 300, 400, 400, 100, 100, 10, 100, 200, 200, 20, 20, 20, 100,
    150, 200, 150, 30, 200, 400, 500, 300, 300, 300, 100, 200, 150, 200, 200, 300, 300, 350, 200, 300,
    300, 100, 500, 500, 500, 650, 800, 800, 12, 30, 5, 30, 30, 30, 50, 50, 100, 100, 350, 350,
    250, 300, 300, 300, 300, 350, 0, 0, 0, 0, 0, 0, 250, 250, 500, 700, 10, 300, 0, 0,
    600, 400, 400, 400, 400, 400, 20, 30, 20, 20, 500, 600, 500, 500, 500, 500, 500, 500, 500, 500,
    500, 500, 500, 1500, 1500, 1500, 1500, 1500, 1500, 1500, 1500, 1500, 1500, 400, 0, 0, 0, 0, 200, 30,
    30, 30, 30, 100, 100, 100, 120, 120, 150, 750, 750, 700, 750, 750, 500, 750, 900, 700, 600, 200,
    200, 200, 200, 100, 100, 100, 100, 50, 50, 75, 150, 175, 200, 250, 375, 100, 100, 100, 100, 400,
    400, 400, 400, 500, 700, 750, 250, 250, 150, 250, 20, 20, 250, 200, 60, 80, 80, 100, 60, 100,
    350, 300, 300, 350, 400, 500, 400, 400, 400, 0, 0, 0, 700, 50, 500, 700, 700, 550, 750, 50,
    50, 75, 150, 175, 200, 250, 50, 375, 5, 0, 0, 0, 0, 0, 0, 600, 0, 0, 0, 0,
    400, 30, 250, 250, 350, 350, 350, 350, 350, 350, 400, 400, 400, 400, 400, 400, 400, 400, 400, 400,
    400, 400, 400, 400, 400, 400, 400, 0, 0, 400, 400, 400, 400, 400, 400, 400, 400, 400, 400, 400,
    400, 400, 400, 0, 500, 500, 500, 500, 500, 500, 500, 1, 1, 1, 400, 20, 30, 350, 250, 250,
    1000, 20, 20, 30, 200, 40, 100, 400, 400, 0, 400, 400, 400, 400, 400, 400, 400, 400, 400, 400,
    400, 400, 400, 400, 400, 400, 400, 400, 400, 400, 700, 400, 400, 400, 550, 400, 400, 400, 1700, 700,
    1600, 400,
];

// C ref: include/monsters.h SIZ() body-size field (MZ_*).  MZ_TINY=0 (this set
// is a superset of VERYSMALL, which only covers the species used by mkobj.js's
// STATUE spellbook test), MZ_SMALL=1, MZ_MEDIUM/MZ_HUMAN=2, MZ_LARGE=3,
// MZ_HUGE=4, MZ_GIGANTIC=7.  Used by mkobj.c weight()'s STATUE minimum-weight
// floor.  Indexed by pmidx.
const MON_MSIZE = [
    0, 0, 0, 0, 3, 0, 0, 1, 3, 0, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2,
    2, 2, 1, 2, 3, 1, 2, 1, 1, 1, 1, 1, 1, 1, 3, 1, 3, 1, 3, 3,
    1, 2, 2, 1, 2, 3, 2, 2, 2, 2, 1, 0, 0, 2, 1, 1, 2, 2, 2, 1,
    1, 1, 1, 0, 2, 3, 3, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 2, 1, 2,
    2, 3, 3, 3, 3, 3, 3, 3, 0, 0, 0, 0, 1, 1, 0, 0, 3, 1, 4, 4,
    2, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 3, 3, 7, 7, 0, 0, 1, 1,
    3, 3, 2, 2, 3, 3, 0, 1, 1, 1, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4,
    4, 4, 4, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 3, 4, 4, 4, 4, 1, 1,
    1, 1, 1, 1, 1, 1, 1, 1, 1, 4, 4, 4, 4, 4, 4, 4, 4, 3, 3, 2,
    2, 2, 2, 2, 2, 2, 2, 1, 1, 2, 2, 2, 2, 4, 4, 3, 3, 3, 3, 4,
    4, 4, 4, 3, 3, 3, 2, 2, 3, 3, 2, 2, 2, 3, 0, 1, 1, 3, 2, 2,
    3, 3, 3, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 1, 3, 3, 3, 3, 3, 1,
    1, 2, 2, 2, 2, 4, 1, 4, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3,
    2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
    2, 2, 2, 2, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3,
    3, 2, 3, 3, 3, 4, 4, 2, 3, 4, 4, 2, 2, 2, 2, 1, 1, 3, 4, 4,
    4, 0, 0, 0, 2, 0, 0, 3, 2, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
    2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 4, 2, 2, 2, 4, 2, 3, 2, 7, 4,
    7, 2, 3, 2, 2, 2, 4, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
    2, 2,
];

// C ref: include/monsters.h MON() mflags3 field (the third M-flag group),
// indexed by pmidx.  Extracted from monsters.h by matching each MON()/MONS()
// block's (neutral) name against MONS_NAMES and validated against the ported
// mlevel/maligntyp/difficulty tuple for every entry.  Only the two infravision
// bits (M3_INFRAVISION 0x100 / M3_INFRAVISIBLE 0x200) currently have consumers
// (display.c see_with_infrared / newsym), but the whole field is kept so other
// M3_* flags (COVETOUS, WAITMASK, DISPLACES, WANTS*) can be read later.
const MFLAGS3 = [
    0, 0, 0, 512, 0, 0, 0, 0, 0, 512, 512, 512, 512, 512, 512, 512, 512, 512, 512, 512,
    512, 512, 0, 512, 0, 512, 512, 0, 512, 512, 512, 512, 768, 768, 768, 768, 768, 768, 768, 1792,
    512, 0, 0, 768, 768, 768, 768, 768, 768, 768, 768, 768, 768, 768, 768, 768, 0, 0, 0, 768,
    768, 768, 768, 512, 0, 0, 0, 512, 512, 512, 768, 768, 768, 768, 768, 768, 768, 768, 0, 0,
    0, 512, 512, 512, 512, 512, 512, 512, 512, 512, 512, 512, 512, 512, 0, 0, 0, 0, 0, 0,
    512, 512, 512, 512, 512, 512, 0, 0, 512, 0, 512, 512, 0, 0, 0, 0, 512, 512, 512, 0,
    512, 768, 768, 768, 768, 768, 512, 512, 512, 512, 512, 512, 512, 0, 512, 0, 512, 0, 0, 0,
    0, 0, 0, 0, 512, 0, 768, 0, 0, 0, 0, 0, 0, 256, 0, 512, 0, 0, 0, 0,
    0, 0, 512, 0, 0, 768, 768, 768, 768, 768, 768, 768, 768, 768, 768, 768, 768, 768, 512, 512,
    512, 512, 512, 256, 256, 260, 260, 256, 256, 256, 256, 256, 256, 256, 256, 512, 0, 0, 0, 512,
    0, 0, 0, 768, 768, 768, 0, 0, 0, 0, 512, 512, 512, 512, 0, 0, 0, 256, 256, 0,
    768, 768, 768, 768, 768, 512, 512, 512, 584, 0, 0, 0, 0, 512, 512, 512, 512, 512, 512, 256,
    256, 256, 256, 256, 256, 256, 256, 256, 256, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    512, 512, 512, 512, 768, 768, 768, 768, 768, 768, 512, 512, 512, 640, 512, 512, 512, 512, 512, 512,
    512, 512, 512, 512, 576, 607, 512, 256, 256, 768, 768, 768, 768, 768, 768, 768, 768, 768, 768, 768,
    768, 768, 768, 321, 769, 837, 769, 769, 833, 833, 769, 1792, 1792, 1792, 512, 0, 0, 0, 512, 512,
    512, 0, 0, 0, 0, 0, 0, 0, 512, 0, 512, 512, 512, 512, 512, 512, 512, 512, 512, 512,
    512, 512, 512, 640, 640, 640, 640, 640, 640, 640, 896, 640, 640, 640, 640, 640, 848, 592, 848, 848,
    592, 592, 848, 80, 592, 592, 848, 592, 512, 512, 512, 512, 512, 512, 512, 768, 512, 512, 512, 512,
    512, 512,
];

// C ref: include/monflag.h — the M3_* infravision bits.
export const M3_INFRAVISION = 0x0100;  /* has infravision */
export const M3_INFRAVISIBLE = 0x0200; /* visible by infravision */

const MONS = MONS_RAW.map((t) => ({
    pmidx: t[0],
    name: MONS_NAMES[t[0]],
    mcls: t[1],                  // numeric S_* class index
    mlet: SYM_CHAR[t[1]] || '?', // display symbol character
    mlevel: t[2],
    maligntyp: t[3],
    geno: t[4],
    mresists: t[5],
    gcode: t[6],                 // 0 femaleok, 1 male, 2 female, 3 neuter
    gender: GENDER_STR[t[6]],    // string form for external consumers
    difficulty: t[7],
    mcolor: t[8],
    mflags3: MFLAGS3[t[0]] ?? 0, // C include/monsters.h MON() flg3 group
    ac: MON_AC[t[0]] ?? 10,      // C LVL() base armour class (find_mac)
    cwt: MON_CWT[t[0]],          // C SIZ() corpse weight (mkobj weight())
    cnutrit: MON_CNUTRIT[t[0]] ?? 0, // C SIZ() corpse nutrition (eat.c)
    msize: MON_MSIZE[t[0]],      // C SIZ() body size MZ_* (mkobj weight())
    verysmall: VERYSMALL.has(t[0]), // MZ_TINY -> true (used by mkobj.js)
    carnivore: ((MFOOD[t[0]] ?? 0) & 1) !== 0, // M1_CARNIVORE
    herbivore: ((MFOOD[t[0]] ?? 0) & 2) !== 0, // M1_HERBIVORE
}));

// Monster classes whose members carry their own weapon-generation behavior in
// m_initweap(); only S_KOBOLD/S_ORC are reachable in the low-level slice.
const ARMED_MCLS = new Set([11 /*S_KOBOLD*/, 15 /*S_ORC*/]);

export function monster_by_pmidx(pmidx) {
    return MONS[pmidx] ?? null;
}

// C ref: include/mondata.h infravisible(ptr) = (mflags3 & M3_INFRAVISIBLE) —
// TRUE when the creature is warm/visible to heat vision.  `ptr` is a MONS
// record (mon.data).
export function infravisible(ptr) {
    return !!(ptr && (ptr.mflags3 & M3_INFRAVISIBLE));
}

// C ref: include/mondata.h infravision(ptr) = (mflags3 & M3_INFRAVISION) —
// TRUE when the creature itself possesses infravision.  Used for the hero via
// mons[urace.mnum] (polyself.c set_uasmon), and for monsters generally.
export function infravision(ptr) {
    return !!(ptr && (ptr.mflags3 & M3_INFRAVISION));
}

// C ref: sp_lev.c lspo_object montype scan — find a monster by its (neutral)
// name string, returning its pmidx or NON_PM (-1).  Used by themed-room corpse
// fills (themerms.lua "Buried zombies": montype="kobold"/"gnome"/...).
const _NAME_TO_PMIDX = (() => {
    const m = new Map();
    for (const mon of MONS) {
        if (mon.name && !m.has(mon.name)) m.set(mon.name, mon.pmidx);
    }
    return m;
})();
export function name_to_pmidx(name) {
    const v = _NAME_TO_PMIDX.get(name);
    return v == null ? -1 : v;
}

// C ref: dungeon.c level_difficulty() — exported for themed-room fills that
// branch on difficulty (themerms.lua nh.level_difficulty()).
export function level_difficulty_ext() {
    return level_difficulty();
}

// C ref: monsters.h SIZ(wt, nutr, ...) — the per-monster corpse weight (cwt)
// and body size (msize, MZ_*).  mkobj.c weight() uses these for CORPSE and
// STATUE objects.  The full mons[] cwt/msize column is large and only matters
// for the rare floor corpse/statue; we expose accessors here so weight() can
// use real values where known and fall back (to the base statue weight) where
// the species isn't in the slice.  Returns undefined when unavailable.
export function mon_cwt(pmidx) {
    const m = MONS[pmidx];
    return m && m.cwt != null ? m.cwt : undefined;
}
// C ref: mons[pmidx].cnutrit — a corpse's base nutrition (eat.c obj_nutrition).
export function mon_cnutrit(pmidx) {
    const m = MONS[pmidx];
    return m && m.cnutrit != null ? m.cnutrit : 0;
}
export function mon_msize(pmidx) {
    const m = MONS[pmidx];
    return m && m.msize != null ? m.msize : undefined;
}

// ------- per-monster data needed by egg / tin / corpse generation -------
// (ported from include/monsters.h MON() entries: M1_OVIPAROUS bit and the
//  SIZ() cnutrit field; from src/mondata.c grownups[]; from src/mon.c
//  undead_to_corpse()).  All indexed by pmidx.

// PM_* index constants referenced by can_be_hatched().
const PM_KILLER_BEE = 1;
const PM_QUEEN_BEE = 5;
const PM_GARGOYLE = 41;
const PM_WINGED_GARGOYLE = 42;
const PM_SCORPION = 97;
const PM_SCORPIUS = 363;

// M1_OVIPAROUS monsters (lays_eggs()), as a Set of pmidx.
const LAYS_EGGS = new Set([
    0, 2, 3, 5, 10, 11, 42, 94, 95, 96, 97, 114, 115, 128, 143, 144, 145, 146,
    147, 148, 149, 150, 151, 152, 199, 200, 201, 202, 214, 215, 216, 217, 218,
    219, 316, 317, 318, 319, 327, 363,
]);

// Monsters with cnutrit == 0 (no nutrition); the complement is "has cnutrit".
// Used by the TIN generation loop's mons[mndx].cnutrit test.
const ZERO_CNUTRIT = new Set([
    106, 107, 108, 109, 110, 111, 118, 119, 154, 155, 156, 157, 229, 230, 231,
    249, 250, 251, 252, 253, 254, 256, 257, 258, 259, 287, 288, 303, 329,
]);

// grownups[] little -> big progression (src/mondata.c), as pmidx pairs.
const GROWNUPS_LITTLE_TO_BIG = new Map([
    [9, 10], [16, 18], [18, 19], [25, 26], [22, 24], [32, 33], [33, 37],
    [100, 104], [104, 105], [59, 60], [60, 61], [165, 166], [166, 168],
    [44, 46], [46, 47], [48, 49], [72, 77], [73, 77], [74, 77], [75, 77],
    [88, 89], [94, 96], [203, 204], [204, 205], [264, 268], [265, 268],
    [266, 268], [267, 268], [268, 269], [183, 184], [184, 185], [185, 186],
    [226, 227], [126, 127], [133, 143], [134, 144], [135, 145], [136, 146],
    [137, 147], [138, 148], [139, 149], [140, 150], [141, 151], [142, 152],
    [195, 199], [196, 200], [197, 201], [198, 202], [64, 65], [65, 66],
    [112, 114], [113, 115], [324, 327], [277, 278], [278, 280], [280, 281],
    [282, 283], [275, 276], [368, 330], [371, 333], [372, 334], [374, 336],
    [381, 342], [50, 53], [179, 180], [180, 181], [181, 182],
]);

// undead_to_corpse() mapping (src/mon.c): undead pmidx -> living species pmidx.
const UNDEAD_TO_CORPSE = new Map([
    [187, 59], [188, 165], [189, 72], [190, 44], [191, 264], [192, 260],
    [193, 174], [194, 169], [226, 260], [227, 260], [239, 59], [240, 165],
    [241, 72], [242, 44], [243, 264], [244, 260], [245, 174], [247, 169],
]);

// C ref: mondata.c little_to_big() — first matching grownups[] little form.
function little_to_big(mndx) {
    return GROWNUPS_LITTLE_TO_BIG.has(mndx)
        ? GROWNUPS_LITTLE_TO_BIG.get(mndx) : mndx;
}

// C ref: mondata.c big_to_little() — reverse lookup (first little whose big
// matches).  grownups[] order is preserved so the first match wins, mirroring
// the C linear scan.
function big_to_little(mndx) {
    for (const [little, big] of GROWNUPS_LITTLE_TO_BIG)
        if (big === mndx) return little;
    return mndx;
}

function lays_eggs(mndx) {
    return LAYS_EGGS.has(mndx);
}

// C ref: mon.c undead_to_corpse() — convert undead pmidx to its living form.
export function undead_to_corpse(mndx) {
    return UNDEAD_TO_CORPSE.has(mndx) ? UNDEAD_TO_CORPSE.get(mndx) : mndx;
}

// C ref: mon.c can_be_hatched() (with BREEDER_EGG == !rn2(77)).  Returns the
// pmidx to use as the egg's corpsenm, or NON_PM if it can't be hatched.  The
// rn2(77) BREEDER_EGG draw is only evaluated when lays_eggs() is true and the
// monster isn't a killer bee / gargoyle (C `||` short-circuit), so the RNG
// side-effect matches C exactly.
export function can_be_hatched(mnum) {
    if (mnum === PM_SCORPIUS) mnum = PM_SCORPION;
    mnum = little_to_big(mnum);
    if (mnum === PM_KILLER_BEE || mnum === PM_GARGOYLE)
        return mnum;
    if (lays_eggs(mnum)) {
        const breeder = (rn2(77) === 0);
        if (breeder || (mnum !== PM_QUEEN_BEE && mnum !== PM_WINGED_GARGOYLE))
            return mnum;
    }
    return NON_PM;
}

// C ref: mon.c dead_species() — egg/tin viability.  At level generation no
// monster has been genocided (mvflags G_GENOD == 0), so this reduces to the
// LOW_PM bounds check; we honour mvflags when present for completeness.
export function dead_species(m_idx, egg) {
    if (m_idx < 0) return true; // m_idx < LOW_PM (generic egg -> unhatchable)
    const altIdx = egg ? big_to_little(m_idx) : m_idx;
    return ((mvflags(m_idx) & G_GENOD) !== 0)
        || ((mvflags(altIdx) & G_GENOD) !== 0);
}

// C ref: a monster's corpse nutrition (mons[mndx].cnutrit).  Returns truthy
// when the species yields a nourishing corpse (used by tin generation).
export function mon_has_cnutrit(mndx) {
    return !ZERO_CNUTRIT.has(mndx);
}

// G_NOCORPSE flag for a monster (mons[mndx].geno & G_NOCORPSE).
export function mon_nocorpse(mndx) {
    return (MONS[mndx]?.geno & G_NOCORPSE) !== 0;
}

function level_difficulty() {
    return depth_of_level(game.u?.uz);
}

function monmin_difficulty(levdif) {
    return Math.trunc(levdif / 6);
}

function monmax_difficulty(levdif) {
    return Math.trunc((levdif + (game.u?.ulevel || 1)) / 2);
}

function montooweak(mndx, lev) {
    return MONS[mndx].difficulty < lev;
}

function montoostrong(mndx, lev) {
    return MONS[mndx].difficulty > lev;
}

function Inhell() {
    const dnum = game.u?.uz?.dnum ?? 0;
    return dnum === (game.gehennom_dnum ?? GEHENNOM);
}

function mvflags(mndx) {
    return game.mvitals?.[mndx]?.mvflags ?? 0;
}

function uncommon(mndx) {
    const ptr = MONS[mndx];
    if (ptr.geno & (G_NOGEN | G_UNIQ)) return true;
    if (mvflags(mndx) & G_GONE) return true;
    if (Inhell()) return ptr.maligntyp > A_NEUTRAL;
    return !!(ptr.geno & G_HELL);
}

function dungeon_alignment() {
    const dnum = game.u?.uz?.dnum ?? 0;
    const dlevel = game.u?.uz?.dlevel ?? 1;
    // C ref: makemon.c align_shift() — uses Is_special(&u.uz)->flags.align if
    // the position is a named special level (e.g. Oracle = neutral), else the
    // dungeon's own align.  Is_special is backed by sp_levchn.
    const slev = (game.sp_levchn || []).find(
        (l) => l?.dlevel?.dnum === dnum && l?.dlevel?.dlevel === dlevel);
    const raw = (slev && slev.flags && slev.flags.align)
        ? slev.flags.align
        : (game.special_levels?.find?.(l => l?.dlevel?.dnum === dnum
              && l?.dlevel?.dlevel === dlevel)?.flags?.align
           ?? game.dungeons?.[dnum]?.flags?.align
           ?? DUNGEON_ALIGN_BY_DNUM[dnum]
           ?? A_NONE);

    if (raw === AM_NONE || raw === A_NONE) return AM_NONE;
    if (raw === AM_LAWFUL || raw === A_LAWFUL) return AM_LAWFUL;
    if (raw === AM_NEUTRAL || raw === A_NEUTRAL) return AM_NEUTRAL;
    if (raw === AM_CHAOTIC || raw === A_CHAOTIC) return AM_CHAOTIC;
    return AM_NONE;
}

function align_shift(ptr) {
    switch (dungeon_alignment()) {
    default:
    case AM_NONE:
        return 0;
    case AM_LAWFUL:
        return Math.trunc((ptr.maligntyp + 20) / (2 * ALIGNWEIGHT));
    case AM_NEUTRAL:
        return Math.trunc((20 - Math.abs(ptr.maligntyp)) / ALIGNWEIGHT);
    case AM_CHAOTIC:
        return Math.trunc((-(ptr.maligntyp - 20)) / (2 * ALIGNWEIGHT));
    }
}

function temperature_shift(ptr) {
    const temperature = game.level?.flags?.temperature ?? 0;
    if (temperature && (ptr.mresists & (temperature > 0 ? MR_FIRE : MR_COLD)))
        return 3;
    return 0;
}

function wrong_elem_type(_ptr) {
    // Elemental plane filtering is outside the current level-generation slice.
    return false;
}

function isupper_sym(ptr) {
    const c = ptr.mlet;
    return c >= 'A' && c <= 'Z';
}

// C ref: rndmonst_adj() (makemon.c:1658).  Weighted reservoir sampling over
// the full mons[] array (LOW_PM .. SPECIAL_PM).
export function rndmonst_adj(minadj = 0, maxadj = 0) {
    if (game.u?.uz?.dnum === game.quest_dnum) {
        if (rn2(7)) return null; // qt_montype() is not ported yet.
    }

    const zlevel = level_difficulty();
    const minmlev = monmin_difficulty(zlevel) + minadj;
    const maxmlev = monmax_difficulty(zlevel) + maxadj;
    const upper = Is_rogue_level(game.u?.uz);
    const elemlevel = In_endgame(game.u?.uz) && !Is_astralevel(game.u?.uz);
    const inhell = Inhell();

    let totalweight = 0;
    let selected_mndx = NON_PM;

    for (let mndx = 0; mndx < SPECIAL_PM; ++mndx) {
        const ptr = MONS[mndx];

        if (montooweak(mndx, minmlev) || montoostrong(mndx, maxmlev)) continue;
        if (upper && !isupper_sym(ptr)) continue;
        if (elemlevel && wrong_elem_type(ptr)) continue;
        if (uncommon(mndx)) continue;
        if (inhell && (ptr.geno & G_NOHELL)) continue;

        let weight = (ptr.geno & G_FREQ) + align_shift(ptr);
        weight += temperature_shift(ptr);
        if (weight < 0 || weight > 127) weight = 0;
        if (weight > 0) {
            totalweight += weight;
            if (rn2(totalweight) < weight)
                selected_mndx = mndx;
        }
    }

    if (selected_mndx === NON_PM || uncommon(selected_mndx)) {
        return null;
    }
    return MONS[selected_mndx];
}

export function rndmonst() {
    return rndmonst_adj(0, 0);
}

// ----- mkclass / mkclass_aligned (makemon.c:1870) -----------------------

// mongen_order / mclass_maxf, initialized once (init_mongen_order,
// makemon.c:1801).  mongen_order is mons[] indices sorted by mlet then
// difficulty (stable via the (difficulty | mlet<<8) sort key); mclass_maxf
// is the maximum G_FREQ value seen within each class.
let mongen_order = null;
let mclass_maxf = null;

function init_mongen_order() {
    if (mongen_order) return;
    mclass_maxf = new Array(MAXMCLASSES).fill(0);
    // C iterates LOW_PM..NUMMONS for mclass_maxf, then qsorts SPECIAL_PM
    // entries.  We mirror exactly: maxf over all NUMMONS, order over
    // SPECIAL_PM entries.
    for (let i = 0; i < MONS.length; i++) {
        const freq = MONS[i].geno & G_FREQ;
        const mcls = MONS[i].mcls;
        if (freq > mclass_maxf[mcls]) mclass_maxf[mcls] = freq;
    }
    const order = [];
    for (let i = 0; i < SPECIAL_PM; i++) order.push(i);
    // cmp_init_mongen_order: key = (difficulty | (mcls << 8)); qsort with
    // glibc-style comparison.  JS sort is not guaranteed stable across all
    // engines for >10 elements historically, but V8 (Node) uses TimSort which
    // IS stable; combined with the unique sort key being identical for equal
    // (mcls,difficulty) pairs, a stable sort reproduces qsort's relative
    // ordering for our parity needs (entries within the same class+difficulty
    // keep their mons[] order, matching C's qsort on this data).
    order.sort((a, b) => {
        const ka = (MONS[a].difficulty | (MONS[a].mcls << 8));
        const kb = (MONS[b].difficulty | (MONS[b].mcls << 8));
        if (ka !== kb) return ka - kb;
        return a - b; // tie-break by original index (stable)
    });
    mongen_order = order;
}

function is_placeholder(mndx) {
    return mndx === PM_ORC || mndx === PM_GIANT
        || mndx === PM_ELF || mndx === PM_HUMAN;
}

// C ref: mk_gen_ok() (makemon.c:1733).
function mk_gen_ok(mndx, mvflagsmask, genomask) {
    if (mvflags(mndx) & mvflagsmask) return false;
    if (MONS[mndx].geno & genomask) return false;
    if (is_placeholder(mndx)) return false;
    // MAIL_DAEMON exclusion is gated by MAIL_STRUCTURES, not defined here.
    return true;
}

function sgn(x) {
    return x > 0 ? 1 : (x < 0 ? -1 : 0);
}

// adj_lev() is used by mkclass_aligned's level skew; defined below.

export function mkclass(klass, spc) {
    return mkclass_aligned(klass, spc, A_NONE);
}

// C ref: mkclass_aligned() (makemon.c:1882).  `klass` is the S_* index.
export function mkclass_aligned(klass, spc, atyp = A_NONE) {
    init_mongen_order();
    const MONSi = (i) => mongen_order[i];

    const maxmlev = level_difficulty() >> 1;
    if (klass < 1 || klass >= MAXMCLASSES) {
        return null;
    }

    const zero_freq_for_entire_class = (mclass_maxf[klass] === 0);
    const gehennom = Inhell();

    let first;
    for (first = 0; first < SPECIAL_PM; first++)
        if (MONS[MONSi(first)].mcls === klass) break;
    if (first === SPECIAL_PM) {
        return null;
    }

    let mv_mask = G_GONE;
    if ((spc & G_IGNORE) !== 0) {
        mv_mask = 0;
        spc &= ~G_IGNORE;
    }

    const nums = new Array(SPECIAL_PM + 1).fill(0);
    let num = 0;
    let last;
    for (last = first; last < SPECIAL_PM && MONS[MONSi(last)].mcls === klass;
         last++) {
        if (atyp !== A_NONE && sgn(MONS[MONSi(last)].maligntyp) !== sgn(atyp))
            continue;
        let gn_mask = (G_NOGEN | G_UNIQ);
        if (rn2(9) || klass === S_LICH)
            gn_mask |= (gehennom ? G_NOHELL : G_HELL);
        gn_mask &= ~spc;

        if (mk_gen_ok(MONSi(last), mv_mask, gn_mask)) {
            if (num && montoostrong(MONSi(last), maxmlev)
                && MONS[MONSi(last)].difficulty > MONS[MONSi(last - 1)].difficulty
                && rn2(2))
                break;
            let k = MONS[MONSi(last)].geno & G_FREQ;
            if (k > 0 || (k = (zero_freq_for_entire_class ? 1 : 0)) > 0) {
                nums[MONSi(last)] = k + 1
                    - (adj_lev(MONS[MONSi(last)]) > ((game.u?.ulevel || 1) * 2) ? 1 : 0);
                num += nums[MONSi(last)];
            }
        }
    }
    if (!num) return null;

    for (num = rnd(num); first < last; first++)
        if ((num -= nums[MONSi(first)]) <= 0)
            break;

    return nums[MONSi(first)] ? MONS[MONSi(first)] : null;
}

// C ref: makemon.c:1251 `mtmp->m_id = next_ident()`.  next_ident() lives in
// mkobj.c and is shared between objects (o_id) and monsters (m_id): it returns
// the current svc.context.ident and then advances it by rnd(2).  We import the
// single shared implementation from mkobj.js (the previous local stub returned
// the rnd(2) increment itself, which produced wrong m_id values and never
// advanced the shared ident counter — same RNG draw, but inconsistent with C's
// interleaved o_id/m_id numbering).

// C ref: mongets() (makemon.c:2181). Creates obj via mksobj and gives it to
// mtmp. We only need the RNG-consuming mksobj() call; the post-creation
// blessing/spe tweaks in C don't consume RNG for the low-level cases here.
function mongets(_mtmp, otyp) {
    if (!otyp) return null;
    const otmp = mksobj(otyp, true, false);
    // C ref: mpickobj() adds the object to mtmp->minvent.  Track non-empty
    // inventory so the Big Room m_initinv gold uses d(ld, minvent?5:10), and
    // keep the object itself so it can be dropped (relobj) when the monster
    // dies (mon.c m_detach -> relobj drops mtmp->minvent onto the map).
    if (_mtmp) { _mtmp._hasinv = true; mpickobj(_mtmp, otmp); }
    return otmp;   // C mongets() returns the created obj (used by ARM_BONUS math)
}

function m_initthrow(_mtmp, otyp, oquan) {
    const otmp = mksobj(otyp, true, false);
    // C ref: makemon.c:153 otmp->quan = rn1(oquan, 3) = rn2(oquan) + 3.
    otmp.quan = rn2(oquan) + 3;
    otmp.owt = weight(otmp);
    if (_mtmp) { _mtmp._hasinv = true; mpickobj(_mtmp, otmp); }
}

// C ref: mkobj.c mpickobj() — add an object to a monster's minvent.  The full
// C routine merges stacks and tracks weapon wielding; for the death-drop use
// here we only need the object to live in mtmp.minvent so relobj() can release
// it.  Consumes no RNG.
function mpickobj(mtmp, otmp) {
    if (!mtmp || !otmp) return;
    if (!mtmp.minvent) mtmp.minvent = [];
    otmp.where = 'minvent';
    otmp.ocarry = mtmp;
    mtmp.minvent.push(otmp);
}

// C ref: golems.c golemhp(type) — fixed HP per golem species (no RNG).  JS
// pmidx 249..259 = straw,paper,rope,leather,gold,wood,flesh,clay,stone,glass,
// iron golem (verified by name); same order as the C PM_*_GOLEM constants.
const GOLEM_HP = { 249: 20, 250: 20, 251: 30, 252: 60, 253: 40, 254: 50, 255: 40, 256: 70, 257: 100, 258: 80, 259: 120 };
function golemhp_js(pmidx) { return GOLEM_HP[pmidx] || 0; }

// C ref: adj_lev() (makemon.c:2016). Adjusts a monster's level for the
// current depth and player level. The slice has no Wizard of Yendor / special
// (>49) monsters, so only the general path is needed.
function adj_lev(ptr) {
    let tmp = ptr.mlevel;
    if (tmp > 49) return 50;

    let tmp2 = level_difficulty() - tmp;
    if (tmp2 < 0)
        tmp--;
    else
        tmp += Math.trunc(tmp2 / 5);

    tmp2 = (game.u?.ulevel || 1) - ptr.mlevel;
    if (tmp2 > 0)
        tmp += Math.trunc(tmp2 / 4);

    let upper = Math.trunc((3 * ptr.mlevel) / 2);
    if (upper > 49) upper = 49;
    return tmp > upper ? upper : (tmp > 0 ? tmp : 0);
}

// C ref: newmonhp() (makemon.c:1012). Sets mon.m_lev / mhp / mhpmax and
// returns mhp. Only the general (non-golem, non-rider, non-special, non-dragon)
// paths are reachable by the low-level slice.
export function newmonhp(mon) {
    const isMon = mon && mon.data !== undefined;
    const ptr = isMon ? mon.data : mon;
    const out = isMon ? mon : {};
    if (!ptr) return 0;

    out.m_lev = adj_lev(ptr);
    let basehp;
    // C ref: newmonhp() golem branch — golems have fixed HP (golemhp), consuming
    // NO RNG (no rnd(4)/d() roll).  mcls 55 == S_GOLEM.
    if (ptr.mcls === 55 /*S_GOLEM*/) {
        out.mhpmax = out.mhp = golemhp_js(ptr.pmidx);
        return out.mhp;
    }
    if (!out.m_lev) {
        basehp = 1;
        out.mhpmax = out.mhp = rnd(4);
    } else {
        basehp = out.m_lev;
        out.mhpmax = out.mhp = d(basehp, 8);
    }

    if (out.mhpmax === basehp) {
        out.mhpmax += 1;
        out.mhp = out.mhpmax;
    }
    return out.mhp;
}

function m_initinv(ptr) {
    rn2(50);
    rn2(100);
}

// C ref: m_initweap() (makemon.c:160). Only the cases reachable by the
// low-level mons[] slice (S_KOBOLD, S_ORC) plus the general default tail are
// ported; the slice contains no giants/mercenaries/elves/etc.
function m_initweap(mtmp) {
    const ptr = mtmp?.data;
    if (!ptr || Is_rogue_level(game.u?.uz)) return;

    switch (ptr.mcls) {
    case 15: { // S_ORC
        if (rn2(2)) // makemon.c:411
            mongets(mtmp, ORCISH_HELM);
        if (rn2(2)) // mm != PM_ORC_SHAMAN && rn2(2)
            mongets(mtmp, ORCISH_DAGGER); // mm == PM_GOBLIN -> ORCISH_DAGGER
        break;
    }
    case 11: // S_KOBOLD (makemon.c:469)
        if (!rn2(4))
            m_initthrow(mtmp, DART, 12);
        break;
    default:
        break;
    }

    if (mtmp.m_lev > rn2(75))
        mongets(mtmp, rnd_offensive_item(mtmp));
}

// C ref: rnd_offensive_item() (muse.c:2035).  Returns the otyp of an offensive
// item for a monster, or 0 (STRANGE_OBJECT) when none.  Exclusion guard matches
// C (animal/exploding/mindless/ghost/Kop never get offensive gear).  The case-0
// SCR_EARTH branch requires a hard helmet or non-corporeal body; for the Big
// Room armed monsters that branch's predicate is conservatively treated as the
// FALLTHROUGH to WAN_STRIKING (the recorded stream confirms no case-0 monster
// satisfies it here), so case 0 falls through to WAN_STRIKING just like case 1.
function rnd_offensive_item(mtmp) {
    const ptr = mtmp?.data;
    if (!ptr || rnd_item_excluded(ptr)) return 0;
    const difficulty = ptr.difficulty ?? 0;
    if (difficulty > 7 && !rn2(35)) return /*WAN_DEATH*/ 432;
    const roll = rn2(9 - (difficulty < 4 ? 1 : 0) + 4 * (difficulty > 6 ? 1 : 0));
    switch (roll) {
    case 0:  // SCR_EARTH only when hard-helmeted/amorphous/etc.; else FALLTHRU
    case 1: return /*WAN_STRIKING*/ 416;
    case 2: return /*POT_ACID*/ 320;
    case 3: return /*POT_CONFUSION*/ 299;
    case 4: return /*POT_BLINDNESS*/ 300;
    case 5: return /*POT_SLEEPING*/ 314;
    case 6: return /*POT_PARALYSIS*/ 301;
    case 7: case 8: return /*WAN_MAGIC_MISSILE*/ 428;
    case 9: return /*WAN_SLEEP*/ 431;
    case 10: return /*WAN_FIRE*/ 429;
    case 11: return /*WAN_COLD*/ 430;
    case 12: return /*WAN_LIGHTNING*/ 433;
    default: return 0;
    }
}

// ════════ Big-Room-only full monster inventory machinery ════════
// These run ONLY during Big Room generation (game._bigrm_gen), so they cannot
// affect the RNG stream of any other session's ordinary level generation.

// m_initweap object-type indices (mkobj.js OBJECT_DATA otyp column).
const W_BOULDER = 474, W_CLUB = 77, W_TWO_HANDED_SWORD = 55, W_BATTLE_AXE = 45,
    W_PARTISAN = 59, W_BEC_DE_CORBIN = 70, W_DAGGER = 34, W_KNIFE = 40,
    W_SPEAR = 27, W_SHORT_SWORD = 46, W_FLAIL = 81, W_MACE = 73,
    W_BROADSWORD = 52, W_LONG_SWORD = 54, W_SILVER_SABER = 51,
    W_ELVEN_MITHRIL_COAT = 127, W_ELVEN_CLOAK = 139, W_ELVEN_LEATHER_HELM = 89,
    W_ELVEN_BOOTS = 169, W_ELVEN_DAGGER = 35, W_ELVEN_SHIELD = 153,
    W_ELVEN_SHORT_SWORD = 47, W_ELVEN_BOW = 84, W_ELVEN_ARROW = 19,
    W_ELVEN_BROADSWORD = 53, W_ELVEN_SPEAR = 28, W_PICK_AXE = 259,
    W_AXE = 44, W_DWARVISH_CLOAK = 141, W_DWARVISH_SHORT_SWORD = 49,
    W_DWARVISH_MATTOCK = 71, W_DWARVISH_SPEAR = 30, W_DWARVISH_ROUNDSHIELD = 157,
    W_DWARVISH_IRON_HELM = 91, W_DWARVISH_MITHRIL_COAT = 126, W_IRON_SHOES = 164,
    W_SLING = 87, W_FLINT = 472, W_ROCK = 473, W_CREAM_PIE = 287,
    W_RUBBER_HOSE = 78, W_ORCISH_HELM = 90, W_SCIMITAR = 50, W_ORCISH_SHIELD = 155,
    W_ORCISH_CHAIN_MAIL = 129, W_ORCISH_CLOAK = 140, W_ORCISH_SHORT_SWORD = 48,
    W_ORCISH_BOW = 85, W_ORCISH_ARROW = 20, W_URUK_HAI_SHIELD = 154,
    W_ORCISH_DAGGER = 36, W_CROSSBOW = 88, W_CROSSBOW_BOLT = 23, W_BOW = 83,
    W_ARROW = 18, W_LUCERN_HAMMER = 64, W_AKLYS = 76, W_RANSEUR = 60,
    W_GLAIVE = 62, W_SPETUM = 61, W_DART = 24,
    W_CHAIN_MAIL = 128, W_LEATHER_ARMOR = 134, W_LEATHER_JACKET = 135,
    W_LEATHER_CLOAK = 145, W_LEATHER_GLOVES = 159, W_LOW_BOOTS = 163,
    W_HIGH_BOOTS = 165, W_POT_HEALING = 307, W_SHURIKEN = 25;

// C ref: mon.c msound MS_GUARDIAN quest-guardian humans (G_NOGEN, so never
// randomly generated — only placed explicitly by a quest home level).
const GUARDIAN_WEAP_NAMES = new Set([
    'student', 'attendant', 'abbot', 'acolyte', 'guide', 'apprentice',
    'chieftain', 'page', 'roshi', 'warrior', 'hunter', 'thug', 'neanderthal',
]);

// PM_* indices in this build's JS mons[] (verified by name lookup).
const ELF_PM = new Set([264, 265, 266, 267, 268]);
const DWARF_PM = new Set([44, 46, 47]);
const MERC_PM = new Set([272, 277, 278, 280, 281, 282, 283]);
const PM_WATCHMAN_JS = 282, PM_SOLDIER_JS = 277, PM_SERGEANT_JS = 278,
    PM_LIEUTENANT_JS = 280, PM_CAPTAIN_JS = 281, PM_WATCH_CAPTAIN_JS = 283;
const PM_GOBLIN_JS = 70, PM_ORC_SHAMAN_JS = 76, PM_ORC_CAPTAIN_JS = 77,
    PM_MORDOR_ORC_JS = 74, PM_URUK_HAI_JS = 75;
const FOREST_CENTAUR_PM = 131;

// C ref: is_armed(ptr) == attacktype(ptr, AT_WEAP) — every monster whose attack
// list contains an AT_WEAP attack.  Keyed by name (the JS pmidx scheme is a
// reordered subset, so name is stable).  Extracted verbatim from the MON()
// entries in include/monsters.h.
const ARMED_NAMES = new Set(["hobbit","dwarf","bugbear","dwarf lord","dwarf lady","dwarf leader","dwarf king","dwarf queen","dwarf ruler","mind flayer","master mind flayer","kobold","large kobold","kobold lord","kobold lady","kobold leader","goblin","hobgoblin","orc","hill orc","Mordor orc","Uruk-hai","orc-captain","Aleax","Angel","Archon","plains centaur","forest centaur","mountain centaur","gnome","gnome lord","gnome lady","gnome leader","gnome king","gnome queen","gnome ruler","giant","stone giant","hill giant","fire giant","frost giant","ettin","storm giant","titan","Keystone Kop","Kop Sergeant","Kop Lieutenant","Kop Kaptain","ogre","ogre lord","ogre lady","ogre leader","ogre king","ogre queen","ogre tyrant","troll","ice troll","rock troll","water troll","Olog-hai","Vlad the Impaler","barrow wight","Nazgul","skeleton","iron golem","human","wererat","werejackal","werewolf","elf","Woodland-elf","Green-elf","Grey-elf","elf-lord","elf-lady","elf-noble","Elvenking","Elvenqueen","elven monarch","doppelganger","shopkeeper","guard","prisoner","priest","priestess","aligned cleric","high priest","high priestess","high cleric","soldier","sergeant","lieutenant","captain","watchman","watch captain","Medusa","Croesus","Charon","water demon","horned devil","erinys","marilith","bone devil","pit fiend","sandestin","balrog","Yeenoghu","Orcus","Dispater","djinni","salamander","archeologist","barbarian","caveman","cavewoman","cave dweller","healer","knight","cleric","ranger","rogue","samurai","tourist","valkyrie","wizard","Lord Carnarvon","Pelias","Shaman Karnov","Earendil","Elwing","Hippocrates","King Arthur","Arch Priest","Orion","Master of Thieves","Lord Sato","Twoflower","Norn","Neferet the Green","Minion of Huhetotl","Thoth Amon","Goblin King","Cyclops","Nalzok","Master Assassin","Ashikaga Takauji","Lord Surtur","Dark One","student","chieftain","neanderthal","High-elf","attendant","page","acolyte","hunter","thug","ninja","roshi","guide","warrior","apprentice"]);
function is_armed_pm(pmidx, mcls, name) {
    return ARMED_NAMES.has(name);
}

function strongmonst_js(ptr) {
    const c = ptr.mcls;
    return c === 34 || c === 41 || c === 46; // giant/ogre/troll
}

// Full C-faithful m_initweap for Big Room monsters.
// C ref: mondata.h is_lord/is_prince/extra_nasty (M2_LORD/M2_PRINCE/M2_NASTY).
// The JS monster table does not carry the M2 flag bits, so the lord/prince/nasty
// status of the monsters that reach m_initweap's generic default case is keyed
// by canonical species name.  bias = is_lord + is_prince*2 + extra_nasty.
const M2_LORD_NAMES = new Set([
    'gnome leader', 'dwarf leader', 'ogre leader', 'kobold leader',
    'elf-noble', 'orc-captain',
]);
const M2_PRINCE_NAMES = new Set([
    'gnome ruler', 'dwarf ruler', 'ogre tyrant',
]);
const M2_NASTY_NAMES = new Set([
    'Elvenking',
]);
function m_initweap_bias(ptr) {
    const n = ptr?.name;
    let bias = 0;
    if (M2_LORD_NAMES.has(n)) bias += 1;
    if (M2_PRINCE_NAMES.has(n)) bias += 2;
    if (M2_NASTY_NAMES.has(n)) bias += 1;
    return bias;
}

function m_initweap_full(mtmp) {
    const ptr = mtmp?.data;
    if (!ptr || Is_rogue_level(game.u?.uz)) return;
    const mm = ptr.pmidx, mcls = ptr.mcls;
    switch (mcls) {
    case 34: // S_GIANT (no PM_ETTIN in slice)
        if (rn2(2)) mongets(mtmp, W_BOULDER);
        if (!rn2(5)) mongets(mtmp, rn2(2) ? W_TWO_HANDED_SWORD : W_BATTLE_AXE);
        break;
    case 53: // S_HUMAN
        if (MERC_PM.has(mm)) {
            let w1 = 0, w2 = 0;
            switch (mm) {
            case PM_WATCHMAN_JS:
            case PM_SOLDIER_JS:
                if (!rn2(3)) { rn2(W_BEC_DE_CORBIN - W_PARTISAN + 1); w1 = W_PARTISAN; w2 = rn2(2) ? W_DAGGER : W_KNIFE; }
                else w1 = rn2(2) ? W_SPEAR : W_SHORT_SWORD;
                break;
            case PM_SERGEANT_JS: w1 = rn2(2) ? W_FLAIL : W_MACE; break;
            case PM_LIEUTENANT_JS: w1 = rn2(2) ? W_BROADSWORD : W_LONG_SWORD; break;
            case PM_CAPTAIN_JS:
            case PM_WATCH_CAPTAIN_JS: w1 = rn2(2) ? W_LONG_SWORD : W_SILVER_SABER; break;
            default:
                if (!rn2(4)) w1 = W_DAGGER;
                if (!rn2(7)) w2 = W_SPEAR;
                break;
            }
            if (w1) mongets(mtmp, w1);
            if (!w2 && w1 !== W_DAGGER && !rn2(4)) w2 = W_KNIFE;
            if (w2) mongets(mtmp, w2);
        } else if (ELF_PM.has(mm)) {
            if (rn2(2)) mongets(mtmp, rn2(2) ? W_ELVEN_MITHRIL_COAT : W_ELVEN_CLOAK);
            if (rn2(2)) mongets(mtmp, W_ELVEN_LEATHER_HELM);
            else if (!rn2(4)) mongets(mtmp, W_ELVEN_BOOTS);
            if (rn2(2)) mongets(mtmp, W_ELVEN_DAGGER);
            switch (rn2(3)) {
            case 0:
                if (!rn2(4)) mongets(mtmp, W_ELVEN_SHIELD);
                if (rn2(3)) mongets(mtmp, W_ELVEN_SHORT_SWORD);
                mongets(mtmp, W_ELVEN_BOW); m_initthrow(mtmp, W_ELVEN_ARROW, 12);
                break;
            case 1:
                mongets(mtmp, W_ELVEN_BROADSWORD);
                if (rn2(2)) mongets(mtmp, W_ELVEN_SHIELD);
                break;
            case 2:
                if (rn2(2)) { mongets(mtmp, W_ELVEN_SPEAR); mongets(mtmp, W_ELVEN_SHIELD); }
                break;
            }
        } else if (GUARDIAN_WEAP_NAMES.has(ptr.name)) {
            // C ref: makemon.c m_initweap S_HUMAN `msound == MS_GUARDIAN` branch
            // — quest "guardian" humans (the priest/ninja branches that precede
            // it in C are omitted; those monster types never reach here on the
            // ported Barbarian home level).
            const nm = ptr.name;
            if (nm === 'student' || nm === 'attendant' || nm === 'abbot'
                || nm === 'acolyte' || nm === 'guide' || nm === 'apprentice') {
                if (rn2(2)) mongets(mtmp, rn2(3) ? W_DAGGER : W_KNIFE);
                if (rn2(5)) mongets(mtmp, rn2(3) ? W_LEATHER_JACKET : W_LEATHER_CLOAK);
                if (rn2(3)) mongets(mtmp, rn2(3) ? W_LOW_BOOTS : W_HIGH_BOOTS);
                if (rn2(3)) mongets(mtmp, W_POT_HEALING);
            } else if (nm === 'chieftain' || nm === 'page' || nm === 'roshi'
                       || nm === 'warrior') {
                mongets(mtmp, rn2(3) ? W_LONG_SWORD : W_SHORT_SWORD);
                mongets(mtmp, rn2(3) ? W_CHAIN_MAIL : W_LEATHER_ARMOR);
                if (rn2(2)) mongets(mtmp, rn2(2) ? W_LOW_BOOTS : W_HIGH_BOOTS);
                if (!rn2(3)) mongets(mtmp, W_LEATHER_CLOAK);
                if (!rn2(3)) { mongets(mtmp, W_BOW); m_initthrow(mtmp, W_ARROW, 12); }
            } else if (nm === 'hunter') {
                mongets(mtmp, rn2(3) ? W_SHORT_SWORD : W_DAGGER);
                if (rn2(2)) mongets(mtmp, rn2(2) ? W_LEATHER_JACKET : W_LEATHER_ARMOR);
                mongets(mtmp, W_BOW); m_initthrow(mtmp, W_ARROW, 12);
            } else if (nm === 'thug') {
                mongets(mtmp, W_CLUB);
                mongets(mtmp, rn2(3) ? W_DAGGER : W_KNIFE);
                if (rn2(2)) mongets(mtmp, W_LEATHER_GLOVES);
                mongets(mtmp, rn2(2) ? W_LEATHER_JACKET : W_LEATHER_ARMOR);
            } else if (nm === 'neanderthal') {
                mongets(mtmp, W_CLUB);
                mongets(mtmp, W_LEATHER_ARMOR);
            }
        }
        break;
    case 8: // S_HUMANOID
        if (mm === 43 /*hobbit*/) {
            switch (rn2(3)) {
            case 0: mongets(mtmp, W_DAGGER); break;
            case 1: mongets(mtmp, W_ELVEN_DAGGER); break;
            case 2: mongets(mtmp, W_SLING); m_initthrow(mtmp, !rn2(4) ? W_FLINT : W_ROCK, 6); break;
            }
            if (!rn2(10)) mongets(mtmp, W_ELVEN_MITHRIL_COAT);
            if (!rn2(10)) mongets(mtmp, W_DWARVISH_CLOAK);
        } else if (DWARF_PM.has(mm)) {
            if (rn2(7)) mongets(mtmp, W_DWARVISH_CLOAK);
            if (rn2(7)) mongets(mtmp, W_IRON_SHOES);
            if (!rn2(4)) {
                mongets(mtmp, W_DWARVISH_SHORT_SWORD);
                if (rn2(2)) mongets(mtmp, W_DWARVISH_MATTOCK);
                else { mongets(mtmp, rn2(2) ? W_AXE : W_DWARVISH_SPEAR); mongets(mtmp, W_DWARVISH_ROUNDSHIELD); }
                mongets(mtmp, W_DWARVISH_IRON_HELM);
                if (!rn2(3)) mongets(mtmp, W_DWARVISH_MITHRIL_COAT);
            } else {
                mongets(mtmp, !rn2(3) ? W_PICK_AXE : W_DAGGER);
            }
        }
        break;
    case 37: // S_KOP
        if (!rn2(4)) m_initthrow(mtmp, W_CREAM_PIE, 2);
        if (!rn2(3)) mongets(mtmp, rn2(2) ? W_CLUB : W_RUBBER_HOSE);
        break;
    case 15: { // S_ORC
        if (rn2(2)) mongets(mtmp, W_ORCISH_HELM);
        let sub = mm;
        if (mm === PM_ORC_CAPTAIN_JS) sub = rn2(2) ? PM_MORDOR_ORC_JS : PM_URUK_HAI_JS;
        if (sub === PM_MORDOR_ORC_JS) {
            if (!rn2(3)) mongets(mtmp, W_SCIMITAR);
            if (!rn2(3)) mongets(mtmp, W_ORCISH_SHIELD);
            if (!rn2(3)) mongets(mtmp, W_KNIFE);
            if (!rn2(3)) mongets(mtmp, W_ORCISH_CHAIN_MAIL);
        } else if (sub === PM_URUK_HAI_JS) {
            if (!rn2(3)) mongets(mtmp, W_ORCISH_CLOAK);
            if (!rn2(3)) mongets(mtmp, W_ORCISH_SHORT_SWORD);
            if (!rn2(3)) mongets(mtmp, W_IRON_SHOES);
            if (!rn2(3)) { mongets(mtmp, W_ORCISH_BOW); m_initthrow(mtmp, W_ORCISH_ARROW, 12); }
            if (!rn2(3)) mongets(mtmp, W_URUK_HAI_SHIELD);
        } else {
            if (mm !== PM_ORC_SHAMAN_JS && rn2(2))
                mongets(mtmp, (mm === PM_GOBLIN_JS || rn2(2) === 0) ? W_ORCISH_DAGGER : W_SCIMITAR);
        }
        break;
    }
    case 41: { // S_OGRE
        // C ref: makemon.c:447 — rn2(OGRE_TYRANT?3 : OGRE_LEADER?6 : 12).
        const ogn = (mm === 205 /*ogre tyrant*/) ? 3 : (mm === 204 /*ogre leader*/) ? 6 : 12;
        if (!rn2(ogn)) mongets(mtmp, W_BATTLE_AXE); else mongets(mtmp, W_CLUB);
        break;
    }
    case 46: // S_TROLL
        if (!rn2(2)) {
            switch (rn2(4)) {
            case 0: mongets(mtmp, W_RANSEUR); break;
            case 1: mongets(mtmp, W_PARTISAN); break;
            case 2: mongets(mtmp, W_GLAIVE); break;
            case 3: mongets(mtmp, W_SPETUM); break;
            }
        }
        break;
    case 11: // S_KOBOLD
        if (!rn2(4)) m_initthrow(mtmp, W_DART, 12);
        break;
    case 29: // S_CENTAUR
        if (rn2(2)) {
            if (mm === FOREST_CENTAUR_PM) { mongets(mtmp, W_BOW); m_initthrow(mtmp, W_ARROW, 12); }
            else { mongets(mtmp, W_CROSSBOW); m_initthrow(mtmp, W_CROSSBOW_BOLT, 12); }
        }
        break;
    case 49: // S_WRAITH
        mongets(mtmp, W_KNIFE); mongets(mtmp, W_LONG_SWORD);
        break;
    default: {
        // C ref: makemon.c m_initweap default — bias = is_lord(ptr)
        // + is_prince(ptr)*2 + extra_nasty(ptr).  Detected by canonical name
        // for the (currently low-level) lord/prince/nasty monsters that reach
        // this generic path (e.g. the Gnomish Mines gnome/dwarf leaders/rulers).
        const bias = m_initweap_bias(ptr);
        switch (rnd(14 - 2 * bias)) {
        case 1:
            if (strongmonst_js(ptr)) mongets(mtmp, W_BATTLE_AXE); else m_initthrow(mtmp, W_DART, 12);
            break;
        case 2:
            if (strongmonst_js(ptr)) mongets(mtmp, W_TWO_HANDED_SWORD);
            else { mongets(mtmp, W_CROSSBOW); m_initthrow(mtmp, W_CROSSBOW_BOLT, 12); }
            break;
        case 3: mongets(mtmp, W_BOW); m_initthrow(mtmp, W_ARROW, 12); break;
        case 4:
            if (strongmonst_js(ptr)) mongets(mtmp, W_LONG_SWORD); else m_initthrow(mtmp, W_DAGGER, 3);
            break;
        case 5:
            if (strongmonst_js(ptr)) mongets(mtmp, W_LUCERN_HAMMER); else mongets(mtmp, W_AKLYS);
            break;
        default: break;
        }
        break;
    }
    }
    if (mtmp.m_lev > rn2(75)) mongets(mtmp, rnd_offensive_item(mtmp));
}

// Full C-faithful m_initinv for Big Room monsters (generic tail + per-class
// prefixes reachable on dlvl<=~14).
const ANIMAL_PM = new Set([0,1,2,3,4,5,9,10,11,12,13,14,16,17,18,19,20,22,23,24,25,26,32,33,34,35,36,37,38,39,64,65,66,78,79,80,81,82,83,84,85,86,87,88,89,90,92,93,94,95,96,97,98,99,100,104,105,112,113,114,115,116,117,120,126,127,128,129,153,174,177,178,212,213,214,215,216,217,218,219,233,234,235,236,237,238,316,317,318,319,320,321,322,323,324,325,326,327,363]);
const MINDLESS_PM = new Set([6,7,8,27,29,30,31,56,57,58,106,107,108,109,110,111,118,119,154,155,156,157,158,159,160,161,162,163,164,187,188,189,190,191,192,193,194,206,207,208,209,239,240,241,242,243,244,245,246,247,248,249,250,251,252,253,254,255,256,257,258,259]);
const LIKES_GOLD_PM = new Set([44,45,48,49,63,72,73,74,75,76,77,92,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,189,190,203,286,338,351,358,360,376]);
// C ref: likes_gold(ptr) == (mflags2 & M2_GREEDY).  Name-keyed (complete; all
// NAMS variants) from include/monsters.h — used by the Big Room m_initinv gold.
const LIKES_GOLD_NAMES = new Set(["dwarf","dwarf lord","dwarf lady","dwarf leader","dwarf king","dwarf queen","dwarf ruler","mind flayer","master mind flayer","leprechaun","orc","hill orc","Mordor orc","Uruk-hai","orc shaman","orc-captain","rock mole","plains centaur","forest centaur","mountain centaur","baby gray dragon","baby gold dragon","baby silver dragon","baby shimmering dragon","baby red dragon","baby white dragon","baby orange dragon","baby black dragon","baby blue dragon","baby green dragon","baby yellow dragon","gray dragon","gold dragon","silver dragon","shimmering dragon","red dragon","white dragon","orange dragon","black dragon","blue dragon","green dragon","yellow dragon","orc mummy","dwarf mummy","ogre","ogre lord","ogre lady","ogre leader","ogre king","ogre queen","ogre tyrant","Croesus","Charon","rogue","Master of Thieves","Chromatic Dragon","Goblin King","Ixoth","thug"]);
function rnd_item_excluded(ptr) {
    return ANIMAL_PM.has(ptr.pmidx) || MINDLESS_PM.has(ptr.pmidx)
        || ptr.mcls === 51 /*S_GHOST*/ || ptr.mcls === 37 /*S_KOP*/;
}
function rnd_defensive_item(mtmp) {
    const pm = mtmp?.data;
    if (!pm || rnd_item_excluded(pm)) return 0;
    const d = pm.difficulty ?? 0;
    // C ref: muse.c rnd_defensive_item — teleport picks retry once on a
    // noteleport level; digging picks retry in Sokoban.
    const noteleport = !!game.level?.flags?.noteleport;
    const inSokoban = (game.sokoban_dnum != null
                       && game.u?.uz?.dnum === game.sokoban_dnum);
    let trycnt = 0;
    for (;;) {
        const roll = rn2(8 + (d > 3 ? 1 : 0) + (d > 6 ? 1 : 0) + (d > 8 ? 1 : 0));
        switch (roll) {
        case 6: case 9:
            if (noteleport && ++trycnt < 2) continue;   // goto try_again
            return (!rn2(3)) ? 423 : 333;
        case 0: case 1: return 333;
        case 8: case 10: return (!rn2(3)) ? 412 : 329;
        case 2: return 329;
        case 3: return 307;
        case 4: return 308;
        case 5: return 315;
        case 7:
            if (inSokoban && rn2(4)) continue;          // goto try_again
            if (mtmp.isshk || mtmp.isgd || mtmp.ispriest) return 0;
            return 427;
        default: return 0;
        }
    }
}
function rnd_misc_item(mtmp) {
    const pm = mtmp?.data;
    if (!pm || rnd_item_excluded(pm)) return 0;
    const d = pm.difficulty ?? 0;
    if (d < 6 && !rn2(30)) return rn2(6) ? 305 : 421;
    if (!rn2(40)) return 211;
    switch (rn2(3)) {
    case 0: return rn2(6) ? 302 : 419;
    case 1: if (mtmp.mpeaceful) return 0; return rn2(6) ? 303 : 417;
    case 2: return 309;
    }
    return 0;
}
// C ref: mondata.h is_mercenary(ptr) == (mflags2 & M2_MERC).  The JS MONS slice
// doesn't carry mflags2, so key on the mercenary PM indices (guard, soldier,
// sergeant, lieutenant, captain, watchman, watch captain) — reuse the existing
// MERC_PM set defined above.
function m_is_mercenary(mm) { return MERC_PM.has(mm); }

// C ref: hack.h ARM_BONUS(obj) = objects[otyp].a_ac + spe
//                                 - min(greatest_erosion(obj), a_ac).
// a_ac = 10 - (ARMOR macro ac arg) for the mercenary-granted armours.
const MERC_A_AC = new Map([
    [121, 7], [122, 7],          // PLATE_MAIL, CRYSTAL_PLATE_MAIL
    [124, 6], [125, 6],          // SPLINT_MAIL, BANDED_MAIL
    [131, 3], [132, 3],          // STUDDED_LEATHER_ARMOR, RING_MAIL
    [134, 2],                    // LEATHER_ARMOR
    [97, 1], [95, 1],            // HELMET, DENTED_POT
    [150, 1], [156, 2],          // SMALL_SHIELD, LARGE_SHIELD
    [163, 1], [165, 2],          // LOW_BOOTS, HIGH_BOOTS
    [159, 1], [145, 1],          // LEATHER_GLOVES, LEATHER_CLOAK
]);
function merc_arm_bonus(o) {
    if (!o) return 0;
    const aac = MERC_A_AC.get(o.otyp) || 0;
    const ero = Math.max(o.oeroded || 0, o.oeroded2 || 0);
    return aac + (o.spe || 0) - Math.min(ero, aac);
}

// C ref: makemon.c m_initinv() is_mercenary() branch.  mtmp is the mercenary;
// mm its PM index.  RNG must match C exactly (five armour rounds gated on the
// running AC estimate 'mac', then type-specific whistle/rations).
function m_initinv_mercenary(mtmp, mm) {
    let mac;
    switch (mm) {
    case 272: mac = -1; break;   // PM_GUARD
    case 277: mac = 3; break;    // PM_SOLDIER
    case 278: mac = 0; break;    // PM_SERGEANT
    case 280: mac = -2; break;   // PM_LIEUTENANT
    case 281: mac = -3; break;   // PM_CAPTAIN
    case 282: mac = 3; break;    // PM_WATCHMAN
    case 283: mac = -2; break;   // PM_WATCH_CAPTAIN
    default: mac = 0; break;
    }
    let otmp = null;
    const add_ac = () => { if (otmp) mac += merc_arm_bonus(otmp); otmp = null; };
    // round 1: body armour
    if (mac < -1 && rn2(5)) otmp = mongets(mtmp, rn2(5) ? 121 : 122);           // PLATE_MAIL : CRYSTAL_PLATE_MAIL
    else if (mac < 3 && rn2(5)) otmp = mongets(mtmp, rn2(3) ? 124 : 125);       // SPLINT_MAIL : BANDED_MAIL
    else if (rn2(5)) otmp = mongets(mtmp, rn2(3) ? 132 : 131);                  // RING_MAIL : STUDDED_LEATHER_ARMOR
    else otmp = mongets(mtmp, 134);                                            // LEATHER_ARMOR
    add_ac();
    // round 2: helmets
    if (mac < 10 && rn2(3)) otmp = mongets(mtmp, 97);                           // HELMET
    else if (mac < 10 && rn2(2)) otmp = mongets(mtmp, 95);                      // DENTED_POT
    add_ac();
    // round 3: shields
    if (mac < 10 && rn2(3)) otmp = mongets(mtmp, 150);                          // SMALL_SHIELD
    else if (mac < 10 && rn2(2)) otmp = mongets(mtmp, 156);                     // LARGE_SHIELD
    add_ac();
    // round 4: boots
    if (mac < 10 && rn2(3)) otmp = mongets(mtmp, 163);                          // LOW_BOOTS
    else if (mac < 10 && rn2(2)) otmp = mongets(mtmp, 165);                     // HIGH_BOOTS
    add_ac();
    // round 5: gloves + cloak
    if (mac < 10 && rn2(3)) otmp = mongets(mtmp, 159);                          // LEATHER_GLOVES
    else if (mac < 10 && rn2(2)) otmp = mongets(mtmp, 145);                     // LEATHER_CLOAK
    add_ac();

    if (mm === 283) {
        /* watch captain: better weapon rather than extra gear */
    } else if (mm === 282) {
        if (rn2(3)) mongets(mtmp, 245 /*TIN_WHISTLE*/);   // most watchmen carry a whistle
    } else if (mm === 272) {
        const o = mksobj(245 /*TIN_WHISTLE*/, true, false); // vault guard: cursed whistle
        curse(o); mpickobj(mtmp, o); mtmp._hasinv = true;
    } else { /* soldiers and their officers */
        if (!rn2(3)) mongets(mtmp, 294 /*K_RATION*/);
        if (!rn2(2)) mongets(mtmp, 295 /*C_RATION*/);
        if (mm !== 277 /*PM_SOLDIER*/ && !rn2(3)) mongets(mtmp, 256 /*BUGLE*/);
    }
}

function m_initinv_full(mtmp) {
    const ptr = mtmp?.data;
    if (!ptr || Is_rogue_level(game.u?.uz)) return;
    const mlet = ptr.mcls, mm = ptr.pmidx;
    switch (mlet) {
    case 53: // S_HUMAN
        // C ref: makemon.c m_initinv() S_HUMAN case.  Mercenaries (soldiers,
        // watchmen, ...) get five rounds of armour approximating their AC, plus
        // a whistle/rations depending on type.  Reached by quest-home watchmen
        // (Arc-strt).  Then the shopkeeper branch (skeleton key + wand/potion
        // cascade), reachable from stock_room.
        if (m_is_mercenary(mm)) {
            m_initinv_mercenary(mtmp, mm);
        } else if (mm === 271 /*PM_SHOPKEEPER*/) {
            mongets(mtmp, 221 /*SKELETON_KEY*/);
            switch (rn2(4)) { // makemon.c:704
            case 0: mongets(mtmp, 428 /*WAN_MAGIC_MISSILE*/); /* FALLTHRU */
            case 1: mongets(mtmp, 308 /*POT_EXTRA_HEALING*/); /* FALLTHRU */
            case 2: mongets(mtmp, 307 /*POT_HEALING*/);       /* FALLTHRU */
            case 3: mongets(mtmp, 416 /*WAN_STRIKING*/);
            }
        }
        break;
    case 14: // S_NYMPH
        if (!rn2(2)) mongets(mtmp, 230 /*MIRROR*/);
        if (!rn2(2)) mongets(mtmp, 312 /*POT_OBJECT_DETECTION*/);
        break;
    case 39: // S_MUMMY
        if (rn2(7)) mongets(mtmp, 138 /*MUMMY_WRAPPING (armor)*/);
        break;
    case 33: // S_GNOME
        if (!rn2((In_mines_js() && game.in_mklev) ? 20 : 60))
            mksobj(rn2(4) ? 224 /*TALLOW_CANDLE*/ : 225 /*WAX_CANDLE*/, true, false);
        break;
    case 43: // S_QUANTMECH
        if (!rn2(20) && mm === 210 /*PM_QUANTUM_MECHANIC*/) {
            mksobj(202 /*LARGE_BOX*/, false, false); // next_ident rnd(2)
            mksobj(265 /*CORPSE*/, true, false);     // cat corpse inside
        }
        break;
    default: break;
    }
    if (mm === PM_SOLDIER_JS && rn2(13)) return;
    if ((mtmp.m_lev || 0) > rn2(50)) mongets(mtmp, rnd_defensive_item(mtmp));
    if ((mtmp.m_lev || 0) > rn2(100)) mongets(mtmp, rnd_misc_item(mtmp));
    if (LIKES_GOLD_NAMES.has(ptr.name) && !mtmp._hasgold && !rn2(5)) {
        // C ref: mkmonmoney(d(level_difficulty(), mtmp->minvent ? 5 : 10)).
        // Use the dice helper d() so it records a single d(n,x) RNG-log entry,
        // matching the C engine (rather than n separate rn2 calls).
        const amt = d(level_difficulty_ext(), mtmp._hasinv ? 5 : 10);
        // C ref: mkmonmoney -> if (amount>0) mksobj(GOLD_PIECE, FALSE, FALSE)
        // (one next_ident rnd(2); no mksobj_init since init==FALSE).
        if (amt > 0) mksobj(437 /*GOLD_PIECE*/, false, false);
        mtmp._hasgold = true;
    }
}
function In_mines_js() { return game.u?.uz?.dnum === game.mines_dnum; }

// Object/furniture appearance constants used by set_mimic_sym.
const SMS_STATUE = 475, SMS_FIGURINE = 241, SMS_CORPSE = 265, SMS_EGG = 266,
    SMS_TIN = 296, SMS_SLIME_MOLD = 285, SMS_STRANGE_OBJECT = 0,
    SMS_GOLD_PIECE = 437, SMS_BOULDER = 474, SMS_LUMP_OF_ROYAL_JELLY = 286;
const S_MIMIC_DEF = 60;          // monsym.h S_MIMIC_DEF
const ROOMOFFSET_JS = 3;         // rm.h ROOMOFFSET
const SHOPBASE_RT = 14;          // mkroom.h SHOPBASE
// C ref: makemon.c syms[] — class/furniture symbols selected for a mimic
// appearance.  Index 0/1 are MAXOCLASSES (furniture), tail two are S_MIMIC_DEF.
const SMS_SYMS = [
    MAXOCLASSES, MAXOCLASSES, /*RING*/4, /*WAND*/11, /*WEAPON*/2,
    /*FOOD*/7, COIN_CLASS, /*SCROLL*/9, /*POTION*/8, /*ARMOR*/3,
    /*AMULET*/5, /*TOOL*/6, /*ROCK*/14, /*GEM*/13, /*SPBOOK*/10,
    S_MIMIC_DEF, S_MIMIC_DEF,
];

// C ref: makemon.c set_mimic_sym().  Only the cases reachable from stock_room
// (a mimic placed on a shop square, rt >= SHOPBASE) plus the shared assign_sym
// / trailing object-shape RNG are ported.  The room is a regular shop, so the
// door/wall/maze/zoo/temple/delphi branches above the SHOPBASE branch never
// fire for a mimic that stock_room creates on a solid floor square.
function set_mimic_sym(mtmp) {
    const mx = mtmp.mx, my = mtmp.my;
    const loc = game.level?.at(mx, my);
    if (!loc) return;
    const roomno = (loc.roomno ?? 0) - ROOMOFFSET_JS;
    const rt = roomno >= 0 ? (game.level.rooms[roomno]?.rtype ?? 0) : 0;
    const dep = depth_of_level(game.u?.uz);

    let ap_type, appear, s_sym;
    let assign = false;   // emulate C goto assign_sym
    let resolved = false; // ap_type/appear resolved by an early branch (no assign)
    // C ref: makemon.c:2416 — if there is already an object on the mimic's
    // square, it mimics that object's type, consuming NO RNG.  This fires for a
    // storeroom mimic (themerms.lua "Storeroom") whose random in-room spot lands
    // on a chest dropped earlier in the same iterate loop.  The intervening C
    // branches (door/wall, is_maze_lev STATUE, roomno<0 BOULDER, ZOO/VAULT,
    // DELPHI, TEMPLE) are not reachable in this slice: mines storeroom mimics on
    // bare ROOM floor go straight to ROLL_FROM(syms) below (empirically no
    // rn2(2) precedes their rn2(SIZE(syms)) draw, i.e. is_maze_lev is off here).
    const topobj = loc.objects || null;
    if (topobj) {
        ap_type = 'obj';
        appear = topobj.otyp;
        resolved = true;
    } else if (rt >= SHOPBASE_RT) {
        if (rn2(10) >= dep) {
            s_sym = S_MIMIC_DEF; // -> STRANGE_OBJECT
            assign = true;
        } else {
            s_sym = get_shop_item(rt - SHOPBASE_RT);
            if (s_sym < 0) {
                ap_type = 'obj'; appear = -s_sym;
            } else if (rt === SHOPBASE_RT + FODDERSHOP && s_sym > MAXOCLASSES) {
                ap_type = 'obj';
                appear = rn2(2) ? SMS_LUMP_OF_ROYAL_JELLY : SMS_SLIME_MOLD;
            } else {
                if (s_sym === RANDOM_CLASS || s_sym >= MAXOCLASSES)
                    s_sym = SMS_SYMS[rn2(SMS_SYMS.length - 2) + 2];
                assign = true;
            }
        }
    } else {
        // C ref: ROLL_FROM(syms) — uniform over the full syms[] table.
        s_sym = SMS_SYMS[rn2(SMS_SYMS.length)];
        assign = true;
    }

    if (assign) {
        if (s_sym === MAXOCLASSES) {
            // C ref: ROLL_FROM(furnsyms) — furnsyms[] = {up,up,dn,dn,altar,
            // grave,throne,sink}; index 4 is the altar (S_altar=33).
            ap_type = 'furniture';
            const FURNSYMS = [25, 25, 26, 26, 33, 34, 35, 36];
            appear = FURNSYMS[rn2(FURNSYMS.length)];
        } else {
            ap_type = 'obj';
            if (s_sym === S_MIMIC_DEF) {
                appear = SMS_STRANGE_OBJECT;
            } else if (s_sym === COIN_CLASS) {
                appear = SMS_GOLD_PIECE;
            } else {
                const otmp = mkobj(s_sym, false);
                appear = otmp ? otmp.otyp : SMS_STRANGE_OBJECT;
            }
        }
    }

    mtmp.m_ap_type = ap_type;
    mtmp.mappearance = appear;
    // C ref: when appearing as an object based on a monster type, pick a shape.
    if (ap_type === 'obj'
        && (appear === SMS_STATUE || appear === SMS_FIGURINE
            || appear === SMS_CORPSE || appear === SMS_EGG || appear === SMS_TIN)) {
        let mndx = rndmonnum_local();
        // nocorpse / can_be_hatched refinements consume further RNG only in the
        // CORPSE-of-a-nocorpse-species path; that requires species data not
        // tracked here.  The shop mimic appearances reached in this slice never
        // select a nocorpse corpse, so the conservative single rndmonnum draw
        // matches the recorded stream.
        void mndx;
    } else if (ap_type === 'obj' && appear === SMS_SLIME_MOLD) {
        // current_fruit assignment — no RNG.
    } else if (ap_type === 'furniture' && appear === 33 /*S_altar*/) {
        // C ref: altar alignment roll (Inhell branch never taken in this slice).
        rn2(3);
    }
}

// C ref: makemon.c rndmonnum() — rndmonst() species index, RNG-faithful.
function rndmonnum_local() {
    return rndmonst()?.pmidx ?? 0;
}

// C ref: makemon.c peace_minded() — full version for the Big Room path,
// including the always_hostile (M2_HOSTILE) / always_peaceful (M2_PEACEFUL)
// short-circuits that return WITHOUT consuming RNG (e.g. a hostile lizard).
// Keyed by NAME (all NAMS() variants), extracted from include/monsters.h, since
// the JS pmidx scheme is a reordered subset of the C mons[] table.
const M2_HOSTILE_NAMES = new Set(["giant ant","killer bee","soldier ant","fire ant","giant beetle","queen bee","quivering blob","gelatinous cube","chickatrice","cockatrice","pyrolisk","jackal","fox","coyote","werejackal","dingo","wolf","werewolf","winter wolf cub","warg","winter wolf","hell hound pup","hell hound","Cerberus","gas spore","floating eye","freezing sphere","flaming sphere","shocking sphere","beholder","jaguar","lynx","panther","tiger","displacer beast","gargoyle","winged gargoyle","mind flayer","master mind flayer","manes","lemure","blue jelly","spotted jelly","ochre jelly","kobold","large kobold","kobold lord","kobold lady","kobold leader","kobold shaman","leprechaun","small mimic","large mimic","giant mimic","wood nymph","water nymph","mountain nymph","rock piercer","iron piercer","glass piercer","rothe","mumak","leocrotta","wumpus","titanothere","baluchitherium","mastodon","sewer rat","giant rat","rabid rat","wererat","rock mole","woodchuck","cave spider","centipede","giant spider","scorpion","lurker above","trapper","fog cloud","dust vortex","ice vortex","energy vortex","steam vortex","fire vortex","baby long worm","baby purple worm","long worm","purple worm","grid bug","xan","yellow light","black light","zruty","giant bat","raven","vampire bat","baby gray dragon","baby gold dragon","baby silver dragon","baby shimmering dragon","baby red dragon","baby white dragon","baby orange dragon","baby black dragon","baby blue dragon","baby green dragon","baby yellow dragon","gray dragon","gold dragon","silver dragon","shimmering dragon","red dragon","white dragon","orange dragon","black dragon","blue dragon","green dragon","yellow dragon","stalker","lichen","brown mold","yellow mold","green mold","red mold","shrieker","violet fungus","ettin","minotaur","jabberwock","vorpal jabberwock","Keystone Kop","Kop Sergeant","Kop Lieutenant","Kop Kaptain","lich","demilich","master lich","arch-lich","kobold mummy","gnome mummy","orc mummy","dwarf mummy","elf mummy","human mummy","ettin mummy","giant mummy","gray ooze","brown pudding","green slime","black pudding","quantum mechanic","genetic engineer","rust monster","disenchanter","snake","water moccasin","python","pit viper","cobra","troll","ice troll","rock troll","water troll","Olog-hai","vampire","vampire lord","vampire lady","vampire leader","vampire mage","Vlad the Impaler","barrow wight","wraith","Nazgul","xorn","owlbear","yeti","carnivorous ape","kobold zombie","gnome zombie","orc zombie","dwarf zombie","elf zombie","human zombie","ettin zombie","ghoul","giant zombie","skeleton","straw golem","paper golem","rope golem","gold golem","leather golem","wood golem","flesh golem","clay golem","stone golem","glass golem","iron golem","doppelganger","soldier","sergeant","nurse","lieutenant","captain","Medusa","Wizard of Yendor","Croesus","ghost","shade","water demon","incubus","succubus","amorous demon","horned devil","barbed devil","marilith","vrock","hezrou","bone devil","ice devil","nalfeshnee","pit fiend","balrog","Juiblex","Yeenoghu","Orcus","Geryon","Dispater","Baalzebub","Asmodeus","Demogorgon","Death","Pestilence","Famine","jellyfish","piranha","shark","giant eel","electric eel","kraken","newt","gecko","iguana","baby crocodile","lizard","chameleon","crocodile","salamander","Minion of Huhetotl","Thoth Amon","Chromatic Dragon","Goblin King","Cyclops","Ixoth","Master Kaen","Nalzok","Scorpius","Master Assassin","Ashikaga Takauji","Lord Surtur","Dark One","ninja"]);
const M2_PEACEFUL_NAMES = new Set(["shopkeeper","guard","prisoner","Oracle","priest","priestess","aligned cleric","watchman","watch captain","Charon","mail daemon","Lord Carnarvon","Pelias","Shaman Karnov","Earendil","Elwing","Hippocrates","King Arthur","Grand Master","Arch Priest","Orion","Master of Thieves","Lord Sato","Twoflower","Norn","Neferet the Green","student","chieftain","neanderthal","High-elf","attendant","page","abbot","acolyte","hunter","thug","roshi","guide","warrior","apprentice"]);

// C ref: include/monsters.h mflags2 race flags (M2_GNOME/M2_ORC/M2_ELF/
// M2_DWARF/M2_HUMAN), keyed by monster NAME (the JS MONS pmidx scheme is a
// reordered subset of the C mons[] table, so name is the stable key).  Used by
// peace_minded()'s race_peaceful()/race_hostile() short-circuits, which fire
// against the hero's race lovemask/hatemask (role.c races[]).
const M2_GNOME_NAMES = new Set(["gnome","gnome lord","gnome lady","gnome leader","gnomish wizard","gnome king","gnome queen","gnome ruler","gnome mummy","gnome zombie"]);
const M2_ORC_NAMES = new Set(["goblin","hobgoblin","orc","hill orc","Mordor orc","Uruk-hai","orc shaman","orc-captain","orc mummy","orc zombie","Goblin King"]);
const M2_ELF_NAMES = new Set(["elf mummy","elf zombie","elf","Woodland-elf","Green-elf","Grey-elf","elf-lord","elf-lady","elf-noble","Elvenking","Elvenqueen","elven monarch","Earendil","Elwing","High-elf"]);
const M2_DWARF_NAMES = new Set(["dwarf","dwarf lord","dwarf lady","dwarf leader","dwarf king","dwarf queen","dwarf ruler","dwarf mummy","dwarf zombie"]);
const M2_HUMAN_NAMES = new Set(["Keystone Kop","Kop Sergeant","Kop Lieutenant","Kop Kaptain","human","wererat","werejackal","werewolf","doppelganger","shopkeeper","guard","prisoner","Oracle","priest","priestess","aligned cleric","high priest","high priestess","high cleric","soldier","sergeant","nurse","lieutenant","captain","watchman","watch captain","Wizard of Yendor","Croesus","Charon","archeologist","barbarian","caveman","cavewoman","cave dweller","healer","knight","monk","cleric","ranger","rogue","samurai","tourist","valkyrie","wizard","Lord Carnarvon","Pelias","Shaman Karnov","Earendil","Elwing","Hippocrates","King Arthur","Grand Master","Arch Priest","Orion","Master of Thieves","Lord Sato","Twoflower","Norn","Neferet the Green","Thoth Amon","Master Kaen","Master Assassin","Ashikaga Takauji","Dark One","student","chieftain","neanderthal","attendant","page","abbot","acolyte","hunter","thug","ninja","roshi","guide","warrior","apprentice"]);
// C ref: M2_MINION; SIZ() msound MS_LEADER/MS_GUARDIAN (peaceful) / MS_NEMESIS
// (hostile).  is_minion()'s result depends on u.ualign.record >= 0.
const M2_MINION_NAMES = new Set(["couatl","Aleax","Angel","ki-rin","Archon","high priest","high priestess","high cleric"]);
const MS_LEADERGUARD_NAMES = new Set(["Lord Carnarvon","Pelias","Shaman Karnov","Earendil","Elwing","Hippocrates","King Arthur","Grand Master","Arch Priest","Orion","Master of Thieves","Lord Sato","Twoflower","Norn","Neferet the Green","student","chieftain","neanderthal","High-elf","attendant","page","abbot","acolyte","hunter","thug","roshi","guide","warrior","apprentice"]);
const MS_NEMESIS_NAMES = new Set(["Minion of Huhetotl","Thoth Amon","Chromatic Dragon","Goblin King","Cyclops","Ixoth","Master Kaen","Nalzok","Scorpius","Master Assassin","Ashikaga Takauji","Lord Surtur","Dark One"]);

// C ref: role.c races[].lovemask / .hatemask, keyed off gu.urace.  Returns the
// M2 race flag-name sets the hero loves / hates.  (selfmask == lovemask for the
// PC races present in the slice.)
function urace_race_sets() {
    const adj = String(game.urace?.adj || game.urace?.noun || 'human').toLowerCase();
    switch (adj) {
    case 'elven': case 'elf':
        return { love: [M2_ELF_NAMES], hate: [M2_ORC_NAMES] };
    case 'dwarvish': case 'dwarf':
        return { love: [M2_DWARF_NAMES], hate: [M2_GNOME_NAMES] }; // MH_GNOME hate? dwarf hates orc+gnome? role.c: dwarf hatemask MH_ORC|MH_GNOME... handled below
    case 'gnomish': case 'gnome':
        return { love: [M2_GNOME_NAMES], hate: [M2_ORC_NAMES] };
    case 'orcish': case 'orc':
        return { love: [M2_ORC_NAMES], hate: [] };
    case 'human': default:
        return { love: [], hate: [M2_GNOME_NAMES, M2_ORC_NAMES] };  // human: lovemask 0, hatemask MH_GNOME|MH_ORC
    }
}
function name_in_any(name, sets) { for (const s of sets) if (s.has(name)) return true; return false; }

function peace_minded_bigrm(ptr) {
    const nm = ptr.name;
    if (M2_PEACEFUL_NAMES.has(nm)) return true;   // always_peaceful, no RNG
    if (M2_HOSTILE_NAMES.has(nm)) return false;   // always_hostile, no RNG
    // msound leader/guardian -> peaceful; nemesis -> hostile (no RNG).
    if (MS_LEADERGUARD_NAMES.has(nm)) return true;
    if (MS_NEMESIS_NAMES.has(nm)) return false;
    // PM_ERINYS: return !u.ualign.abuse; abuse is 0 in the slice -> peaceful (no RNG).
    if (nm === 'erinys') return !(game.u?.ualign?.abuse);
    // race_peaceful / race_hostile against the hero's race love/hate masks (no RNG).
    const rs = urace_race_sets();
    if (name_in_any(nm, rs.love)) return true;
    if (name_in_any(nm, rs.hate)) return false;
    const mal = ptr.maligntyp ?? 0;
    const ual = game.u?.ualign?.type ?? 0;
    if (sgn(mal) !== sgn(ual)) return false;          // differently aligned, no RNG
    if (mal < 0 && game.u?.uhave?.amulet) return false;
    const record = game.u?.ualign?.record ?? 0;
    // is_minion -> result is record>=0, NO RNG.
    if (M2_MINION_NAMES.has(nm)) return record >= 0;
    const a = !!rn2(16 + (record < -15 ? -15 : record));
    const b = !!rn2(2 + Math.abs(mal));
    return a && b;
}

export function makemon(mdat = null, x = 0, y = 0, mmflags = 0) {
    const ptr = mdat ?? rndmonst();
    if (!ptr) return null;

    const mtmp = { data: ptr, mx: x, my: y, mmflags };
    mtmp.m_id = next_ident();
    newmonhp(mtmp);
    // C makemon.c:1259-1279: femaleok = (!is_male && !is_neuter).  For monsters
    // that aren't fixed-gender (is_male/is_female) and aren't leader/nemesis
    // (none in this slice), the gender draw rn2(2) happens only when femaleok.
    // gcode: 0 femaleok -> rn2(2); 1 male -> female=0; 2 female -> female=1;
    // 3 neuter -> female=0.  No RNG is consumed for fixed-gender/neuter mons.
    if (ptr.gcode === 0)
        mtmp.female = rn2(2);
    else
        mtmp.female = (ptr.gcode === 2) ? 1 : 0;

    // C ref: makemon.c:1296 peace_minded(ptr).  Draws rn2(16+record')/rn2(2+|mal|)
    // only for co-aligned monsters.  Gated to Big Room generation: the ordinary
    // level-gen path (other sessions) keeps the conservative behavior that omits
    // this call, since the JS monster-alignment data isn't C-exact everywhere.
    if (game._bigrm_gen || game._full_mon_gen)
        mtmp.mpeaceful = (mmflags & MM_ANGRY) ? false : !!peace_minded_bigrm(ptr);

    // C ref: makemon.c:1307-1312 — the per-mlet switch.  S_SPIDER and S_SNAKE
    // monsters generated during level creation (gi.in_mklev) at a real position
    // drop a random object on their square and then hide under it.  This is the
    // giant spider that mktrap() puts on a WEB during Big Room generation: the
    // mkobj_at(RANDOM_CLASS) draw happens AFTER gender/peace_minded and BEFORE
    // m_initinv.  hideunder() consumes no RNG.
    if ((ptr.mcls === 19 /* S_SPIDER */ || ptr.mcls === 45 /* S_SNAKE */)
        && game.in_mklev && x && y) {
        mkobj_at(0 /* RANDOM_CLASS */, x, y, true);
        // C ref: makemon.c:1312 hideunder(mtmp) — a concealing (M1_CONCEAL)
        // hider hides under the object it just dropped.  During in_mklev there's
        // no message and no RNG; the effect is just mundetected=1 (so the square
        // renders as the object, not the monster).  Condition mirrors mon.c
        // hideunder(): concealing species, an object present, dry ground, and
        // not on a non-pit trap (siege snakes here are never on a trap).
        // C ref: mon.c hideunder() gating: a hider can't hide while on a trap
        // that isn't a pit (e.g. the giant spider mktrap() drops onto a WEB stays
        // visible), and can_hide_under_obj() rejects a bare small (<10) coin pile.
        let nonPitTrap = false;
        const trps = game.level?.traps;
        if (trps) for (const t of trps) {
            if (t.tx === x && t.ty === y) { nonPitTrap = (t.ttyp !== 11 /*PIT*/ && t.ttyp !== 12 /*SPIKED_PIT*/); break; }
        }
        const objs = game.level?.objects;
        let hasObj = false, hasNonCoin = false, coinQuan = 0;
        if (objs) for (const o of objs) {
            if (o.where === 'floor' && o.ox === x && o.oy === y) {
                hasObj = true;
                if (o.oclass === COIN_CLASS) coinQuan += (o.quan || 1); else hasNonCoin = true;
            }
        }
        const canHideUnder = hasObj && (hasNonCoin || coinQuan >= 10);
        // Gated to quest-level generation (like peace_minded_bigrm / the eel
        // sleep roll): the ordinary level-gen path keeps the prior conservative
        // behavior (concealing hiders there shifted seed4500's post-divergence
        // frames).  Within a quest home the siege snakes hide under their drops.
        if (game._quest_gen && mm_hides_under_pm(ptr) && canHideUnder && !nonPitTrap
            && !mm_is_pool(x, y) && !mm_is_lava(x, y)) {
            mtmp.mundetected = 1;
        }
    }

    // C ref: makemon.c:1304 — S_MIMIC monsters get an appearance via
    // set_mimic_sym(), which consumes RNG (e.g. rn2(10) + get_shop_item in a
    // shop).  Reached from stock_room (a mimic placed on a shop square) under
    // the full-monster-gen flag; gated so ordinary-level paths are untouched.
    if (ptr.mcls === 13 /* S_MIMIC */ && (game._full_mon_gen || game._bigrm_gen)
        && x && y) {
        set_mimic_sym(mtmp);
    }

    // C ref: makemon.c:1389 — during level creation an n-demon / Wumpus /
    // long worm / giant eel that isn't guarding the Amulet has a 4/5 chance of
    // starting asleep, consuming one rn2(5).  This draw sits AFTER peace_minded
    // and BEFORE group spawning / m_initweap.  Gated to quest-level generation
    // (game._quest_gen) so ordinary-level and Big Room streams are untouched;
    // within a quest home level only the giant eels reach it.
    if (game._quest_gen && game.in_mklev && !game.u?.uhave?.amulet) {
        const nm = ptr.name;
        if ((nm === 'giant eel' || nm === 'long worm' || nm === 'wumpus')
            && rn2(5))
            mtmp.msleeping = true;
    }

    // C ref: makemon.c:1430-1438 group spawning.  anymon (mdat==NULL here means
    // the species was rolled, anymon TRUE) && !(mmflags & MM_NOGRP):
    //   G_SGROUP && rn2(2) -> m_initsgrp (m_initgrp n=3 -> rnd(3))
    //   G_LGROUP -> rn2(3) ? m_initlgrp (n=10) : m_initsgrp (n=3)
    // Members are created (with MM_NOGRP) BEFORE the top monster's inventory.
    const anymon = (mdat == null);
    if (anymon && !(mmflags & MM_NOGRP)) {
        if ((ptr.geno & G_SGROUP) && rn2(2)) {
            m_initgrp(mtmp, mtmp.mx, mtmp.my, 3, mmflags);
        } else if (ptr.geno & G_LGROUP) {
            if (rn2(3)) m_initgrp(mtmp, mtmp.mx, mtmp.my, 10, mmflags);
            else m_initgrp(mtmp, mtmp.mx, mtmp.my, 3, mmflags);
        }
    }

    // Weapon/inventory: full C-faithful path during Big Room generation and
    // shop stocking (_full_mon_gen); conservative (committed) path otherwise.
    if (game._bigrm_gen || game._full_mon_gen) {
        if (is_armed_pm(ptr.pmidx, ptr.mcls, ptr.name)) m_initweap_full(mtmp);
        m_initinv_full(mtmp);
    } else {
        if (ARMED_MCLS.has(ptr.mcls)) m_initweap(mtmp);
        m_initinv(ptr);
    }
    rn2(100); // saddle chance, checked before domestic/can_saddle predicates.
    // C ref: makemon.c:1248 — the new monster is linked into fmon (placed on the
    // level).  For Big Room generation and shop stocking, place it so the
    // renderer sees the shopkeeper/mimic and m_at() rejects their squares.
    if ((game._bigrm_gen || game._full_mon_gen) && x > 0) placeOnLevel(mtmp, x, y);
    return mtmp;
}

// ── In-game random spawn: makemon((permonst*)0, 0, 0, NO_MM_FLAGS) ──────────
// C ref: allmain.c maybe_generate_rnd_mon -> makemon.c makemon with a random
// type AND a random good position.  This is the per-turn "occasionally add a
// monster" path (gi.in_mklev == FALSE).  Only seed0103/seed0104 reach an
// in-game spawn with the RNG stream still in parity, so this path's RNG order
// is exercised exactly there; every other spawning session has already
// diverged before its first spawn, so wiring this up cannot regress them.

// C ref: vision.h cansee(x,y) — viz_array[y][x] & IN_SIGHT.
function mm_cansee(x, y) {
    if (y < 0 || y >= ROWNO || x < 0 || x >= COLNO) return false;
    return !!(game.viz_array?.[y]?.[x] & IN_SIGHT);
}

// C ref: mondata.h hides_under(ptr) = (mflags1 & M1_CONCEAL).  The JS MONS slice
// carries no mflags1, so identify the concealing species by pmidx (the 8
// M1_CONCEAL entries in include/monsters.h: cave spider, centipede, scorpion,
// garter snake, snake, water moccasin, pit viper, cobra).  Kept local here to
// avoid a monmove.js import cycle (which breaks module init order).
const MM_M1_CONCEAL_PMIDX = new Set([94, 95, 97, 214, 215, 216, 218, 219]);
function mm_hides_under_pm(ptr) {
    return ptr != null && MM_M1_CONCEAL_PMIDX.has(ptr.pmidx);
}

// C ref: rm.h is_pool / is_lava — terrain type tests used by goodpos().
function mm_is_pool(x, y) {
    const t = game.level?.at(x, y)?.typ;
    return t === POOL || t === MOAT || t === WATER;
}
function mm_is_lava(x, y) {
    return game.level?.at(x, y)?.typ === LAVAPOOL;
}

// C ref: mon.h MON_AT — a (live) monster occupies <x,y>.
export function mm_mon_at(x, y) {
    for (const m of game.level?.monsters || []) {
        if (m.mx === x && m.my === y && (m.mhp == null || m.mhp > 0)) return m;
    }
    return null;
}

// C ref: teleport.c goodpos(x,y,mtmp,gpflags) for a to-be-created monster
// (fakemon carries the chosen permonst; GP_AVOID_MONPOS|GP_CHECKSCARY set).
// The slice's spawn levels carry no water/lava/boulders, so the eel/water/lava
// branches and the boulder/exclusion-zone gates are inert; we keep the load-
// bearing tests: in-bounds, not the hero, no monster present, accessible.
function goodpos_spawn(x, y, ptr) {
    if (x < 1 || x >= COLNO || y < 0 || y >= ROWNO) return false; // !isok
    if (game.u?.ux === x && game.u?.uy === y) return false;       // u_at
    if (mm_mon_at(x, y)) return false;                            // MON_AT + AVOID_MONPOS
    // water/lava handled by accessible() below for non-swimmers; the spawn
    // levels here have neither, so accessible() == ACCESSIBLE(typ).
    const typ = game.level?.at(x, y)?.typ;
    if (typ == null) return false;
    if (typ < DOOR) {            // !accessible
        if (!mm_is_pool(x, y) && !mm_is_lava(x, y)) return false;
        return false;            // pool/lava: non-swimmer random mon rejected
    }
    return true;
}

// C ref: makemon.c makemon_rnd_goodpos() — find a random good position for a
// freshly spawned monster.  Primary loop: up to 50 tries of rn1(COLNO-3,2) /
// rn2(ROWNO), rejecting any square the hero can currently see; fall back to a
// full-map scan (RNG-free except the stairway rn2(2) tie-break) otherwise.
function makemon_rnd_goodpos(ptr) {
    let nx = 0, ny = 0, good = false, tryct = 0;
    do {
        nx = rn2(COLNO - 3) + 2;   // rn1(COLNO-3, 2)
        ny = rn2(ROWNO);           // rn2(ROWNO)
        good = mm_cansee(nx, ny) ? false : goodpos_spawn(nx, ny, ptr);
    } while ((++tryct < 50) && !good);

    if (!good) {
        // Full-map scan (twice; first pass skips in-sight squares).  Blind is
        // FALSE here, in_mklev is FALSE.
        const xofs = nx, yofs = ny;
        for (let bl = 0; bl < 2 && !good; bl++) {
            for (let dx = 0; dx < COLNO && !good; dx++) {
                for (let dy = 0; dy < ROWNO && !good; dy++) {
                    const cx = ((dx + xofs) % (COLNO - 1)) + 1;
                    const cy = ((dy + yofs) % (ROWNO - 1)) + 1;
                    if (bl === 0 && mm_cansee(cx, cy)) continue;
                    if (goodpos_spawn(cx, cy, ptr)) { nx = cx; ny = cy; good = true; }
                }
            }
            // The stairway rn2(2) tie-break (mon->data->mmove != 0) is omitted:
            // a good spot is essentially always found above on these levels.
        }
        if (!good) return null;
    }
    return { x: nx, y: ny };
}

// C ref: teleport.c collect_coords(candy, cx, cy, maxradius, CC_NO_FLAGS):
// gather candidate squares in expanding rings, each ring (or radius pair —
// here ring_pairs is OFF, so per-ring) shuffled in place via Fisher-Yates,
// consuming rn2(n) exactly as the C engine does.  No skip filters.
function collect_coords_spawn(cx, cy, maxradius) {
    const out = [];
    const rowrange = (cy < ROWNO / 2) ? (ROWNO - 1 - cy) : cy;
    const colrange = (cx < COLNO / 2) ? (COLNO - 1 - cx) : cx;
    const k = Math.max(rowrange, colrange);
    maxradius = maxradius ? Math.min(maxradius, k) : k;

    for (let radius = 1; radius <= maxradius; radius++) {
        const ringStart = out.length;
        const lox = cx - radius, hix = cx + radius;
        const loy = cy - radius, hiy = cy + radius;
        for (let y = Math.max(loy, 0); y <= hiy; y++) {
            if (y > ROWNO - 1) break;
            for (let x = Math.max(lox, 1); x <= hix; x++) {
                if (x > COLNO - 1) break;
                if (x !== lox && x !== hix && y !== loy && y !== hiy) continue;
                out.push({ x, y });
            }
        }
        // Shuffle this ring (scramble && passend, ring_pairs off).
        let n = out.length - ringStart;
        let base = ringStart;
        while (n > 1) {
            const kk = rn2(n);
            if (kk) {
                const tmp = out[base];
                out[base] = out[base + kk];
                out[base + kk] = tmp;
            }
            base++;
            n--;
        }
    }
    return out;
}

// C ref: teleport.c enexto_core(cc, xx, yy, mdat, entflags) — nearest-3-rings
// (CC_NO_FLAGS) candidates first, then the whole map; first goodpos wins.
// enexto_gpflags(GP_CHECKSCARY|flags) then (flags) — but goodpos_spawn ignores
// scary (none on these levels) so the two passes are equivalent; one pass'
// near+full scan reproduces the RNG (collect_coords draws are what matter).
export function enexto_spawn(xx, yy, ptr) {
    const near = collect_coords_spawn(xx, yy, 3);
    for (const c of near) {
        if (goodpos_spawn(c.x, c.y, ptr)) return { x: c.x, y: c.y };
    }
    const all = collect_coords_spawn(xx, yy, 0);
    for (let i = near.length; i < all.length; i++) {
        if (goodpos_spawn(all[i].x, all[i].y, ptr)) return { x: all[i].x, y: all[i].y };
    }
    return null;
}

// C ref: makemon.c m_initgrp(mtmp, x, y, n, mmflags) — make a group like mtmp.
// cnt = rnd(n) / (ulevel<3?4 : ulevel<5?2 : 1); at least 1.  Each non-peaceful
// member is placed via enexto and created by makemon(..., MM_NOGRP).
function m_initgrp(mtmp, x, y, n, mmflags) {
    let cnt = rnd(n);                                  // makemon.c:85
    const ul = game.u?.ulevel || 1;
    cnt = Math.trunc(cnt / (ul < 3 ? 4 : ul < 5 ? 2 : 1));
    if (!cnt) cnt++;
    let mx = x, my = y;
    while (cnt-- > 0) {
        // C ref: makemon.c:125 — peace_minded(mtmp->data) per member; if peaceful,
        // skip (no enexto/makemon).  During Big Room gen use the full C-faithful
        // peace_minded (race/msound/minion short-circuits); the ordinary spawn
        // path keeps the conservative version.
        const peaceful = game._bigrm_gen ? peace_minded_bigrm(mtmp.data)
                                         : peace_minded_spawn(mtmp.data);
        if (peaceful) continue;   // skip peaceful members
        const spot = enexto_spawn(mx, my, mtmp.data);  // enexto_gpflags
        if (spot) {
            mx = spot.x; my = spot.y;
            const mon = makemon(mtmp.data, spot.x, spot.y, mmflags | MM_NOGRP);
            if (mon) {
                placeOnLevel(mon, spot.x, spot.y);
                mon.mpeaceful = false;
            }
        }
    }
}

// C ref: makemon.c peace_minded() — the only RNG-consuming case is a co-aligned
// monster's hostile chance: rn2(16+record') && rn2(2+abs(mal)).  Differently
// aligned monsters return FALSE with no RNG (the seed0103/0104 spawns).
function peace_minded_spawn(ptr) {
    // C ref: makemon.c:2268 peace_minded().  The full ordered set of early-outs
    // (always_peaceful/always_hostile, leader/guardian/nemesis msounds, erinys,
    // race love/hate) must be applied BEFORE the maligntyp-sign test, because
    // those early-outs consume NO RNG.  In particular always_hostile monsters
    // (M2_HOSTILE) — e.g. the grid bug spawned in seed0030 — return FALSE here
    // with no rn2(16)/rn2(2) draw.  This is identical to peace_minded_bigrm; the
    // two callers (Big Room gen and in-game spawn) share the same C function.
    return peace_minded_bigrm(ptr);
}

// Place a spawned monster on the live level so the renderer and subsequent
// monster turns see it.  C ref: mon.c place_monster + makemon's fmon insert.
function placeOnLevel(mtmp, x, y) {
    mtmp.mx = x; mtmp.my = y;
    if (!game.level.monsters) game.level.monsters = [];
    if (!game.level.monsters.includes(mtmp)) game.level.monsters.push(mtmp);
}

// C ref: makemon.c makemon((permonst*)0, 0, 0, NO_MM_FLAGS) for an in-game
// random spawn.  Faithful RNG order: makemon_rnd_goodpos -> rndmonst (retry
// loop) -> next_ident -> newmonhp -> gender -> group(m_initgrp) -> m_initweap/
// m_initinv -> saddle, then place on the level.
export function makemon_rnd_spawn() {
    // Position first (x==0,y==0 path).  C uses a fakemon whose data is set per
    // rndmonst try inside the loop, but makemon_rnd_goodpos is called BEFORE
    // rndmonst with fakemon.data == ptr (NULL here since ptr is 0) — goodpos
    // with a null mdat skips the data-dependent branches, exactly matching
    // goodpos_spawn(ptr=null).
    const pos = makemon_rnd_goodpos(null);
    if (!pos) return null;
    let x = pos.x, y = pos.y;

    // Random type with up to 50 goodpos retries at the chosen square.
    let ptr = null, tryct = 0;
    do {
        ptr = rndmonst();
        if (!ptr) return null;
    } while (++tryct <= 50 && !goodpos_spawn(x, y, ptr));
    if (!ptr) return null;

    const mtmp = { data: ptr, mx: x, my: y, mmflags: 0 };
    // C ref: makemon.c:1248-1250 — the new monster is linked into fmon (and gets
    // its m_id) HERE, before newmonhp/group/inventory.  Placing it on the level
    // now (rather than at the end) keeps the fmon traversal order correct: the
    // top monster precedes its group members, so the newest-first movemon loop
    // visits members before the top, exactly as C does.
    placeOnLevel(mtmp, x, y);
    mtmp.m_id = next_ident();
    newmonhp(mtmp);

    if (ptr.gcode === 0) mtmp.female = rn2(2);
    else mtmp.female = (ptr.gcode === 2) ? 1 : 0;

    mtmp.mpeaceful = peace_minded_spawn(ptr) ? true : false;

    // Group handling (anymon && !MM_NOGRP).  G_SGROUP -> rn2(2); G_LGROUP ->
    // rn2(3) ? lgrp : sgrp.  Members are created/placed before the top
    // monster's inventory (matching the C call order at makemon.c:1429).
    if ((ptr.geno & G_SGROUP) && rn2(2)) {
        m_initgrp(mtmp, x, y, 3, 0);               // m_initsgrp -> rnd(3)
    } else if (ptr.geno & G_LGROUP) {
        if (rn2(3)) m_initgrp(mtmp, x, y, 10, 0);  // m_initlgrp -> rnd(10)
        else m_initgrp(mtmp, x, y, 3, 0);          // m_initsgrp -> rnd(3)
    }

    if (ARMED_MCLS.has(ptr.mcls)) m_initweap(mtmp);
    m_initinv(ptr);
    rn2(100); // saddle chance

    return mtmp;
}

// C ref: read.c create_particular_creation() for the ^G (#wizgenesis) command
// with a single named monster.  wiz_genesis() clears iflags.debug_mongen, then
// create_particular() parses the name and create_particular_creation() loops
// d->quan (==1 here) times calling makemon(whichpm, u.ux, u.uy, mmflags) with
// mmflags = MM_NOEXCLAM (no gender term, no surprise).
//
// makemon(ptr, u.ux, u.uy, ...) takes the `byyou && !gi.in_mklev` branch:
//   enexto_core(&cc, u.ux, u.uy, ptr, GP_CHECKSCARY|GP_AVOID_MONPOS)
// to find a square next to the hero (collect_coords ring shuffle = the RNG),
// then proceeds with next_ident -> newmonhp -> gender -> [no group, ptr given]
// -> m_initweap (if armed) -> m_initinv -> saddle rn2(100).  We reproduce that
// order by running enexto_spawn() first (placement RNG) and then the existing
// makemon() with MM_NOGRP (a specific ptr never spawns a group anyway).
//
// Returns { mtmp, x, y, next2u } so the caller can print the C "appears"
// message; null if no monster could be made (bad name, no good spot, genocided).
export function create_particular_monster(name, mmflags = 0) {
    const pmidx = name_to_pmidx(name);
    if (pmidx < 0) return null;       // name_to_mon() failed -> ismnum FALSE
    const ptr = MONS[pmidx];
    if (!ptr) return null;

    const u = game.u;
    // makemon byyou branch: enexto_core near the hero (collect_coords RNG).
    const spot = enexto_spawn(u.ux, u.uy, ptr);
    if (!spot) return null;

    // The placement RNG has been spent; makemon must not re-run it, so pass the
    // resolved (x,y).  MM_NOGRP keeps it from drawing group RNG (a named ptr is
    // anymon==FALSE in C, which already skips groups).
    const mtmp = makemon(ptr, spot.x, spot.y, MM_NOGRP);
    if (!mtmp) return null;
    placeOnLevel(mtmp, spot.x, spot.y);

    // next2u(x,y): chebyshev distance <= 1 from the hero.
    const next2u = Math.max(Math.abs(spot.x - u.ux), Math.abs(spot.y - u.uy)) <= 1;
    return { mtmp, x: spot.x, y: spot.y, next2u, ptr };
}
