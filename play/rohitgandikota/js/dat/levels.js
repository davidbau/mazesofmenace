// dat/levels.js — registry of ported special-level scripts.
// C ref: the dat/*.lua files, loaded by load_special() (src/sp_lev.c:6454).
//
// Keys are the proto names makemaz() resolves ("oracle", "bigrm-3", ...).
// A level absent from this registry makes load_special() return false and
// makemaz() records the gap; nothing is faked.

import { oracle_level } from './oracle.js';
import { bigrm1_level } from './bigrm-1.js';
import { bigrm2_level } from './bigrm-2.js';
import { bigrm3_level } from './bigrm-3.js';
import { bigrm4_level } from './bigrm-4.js';
import { bigrm5_level } from './bigrm-5.js';
import { bigrm6_level } from './bigrm-6.js';
import { bigrm7_level } from './bigrm-7.js';
import { bigrm8_level } from './bigrm-8.js';
import { bigrm9_level } from './bigrm-9.js';
import { bigrm10_level } from './bigrm-10.js';
import { bigrm11_level } from './bigrm-11.js';
import { bigrm12_level } from './bigrm-12.js';
import { bigrm13_level } from './bigrm-13.js';
import { tut1_level } from './tut-1.js';
import { castle_level } from './castle.js';
import { valley_level } from './valley.js';
import { barstrt_level } from './bar-strt.js';
import { barfila_level } from './bar-fila.js';
import { barfilb_level } from './bar-filb.js';
import { barloca_level } from './bar-loca.js';
import { bargoal_level } from './bar-goal.js';
import { minefill_level } from './minefill.js';
import { tower1_level } from './tower1.js';
import { tower2_level } from './tower2.js';
import { tower3_level } from './tower3.js';

export const SPECIAL_LEVELS = {
    'bigrm-1': bigrm1_level,
    'bigrm-2': bigrm2_level,
    'bigrm-3': bigrm3_level,
    'bigrm-4': bigrm4_level,
    'bigrm-5': bigrm5_level,
    'bigrm-6': bigrm6_level,
    'bigrm-7': bigrm7_level,
    'bigrm-8': bigrm8_level,
    'bigrm-9': bigrm9_level,
    'bigrm-10': bigrm10_level,
    'bigrm-11': bigrm11_level,
    'bigrm-12': bigrm12_level,
    'bigrm-13': bigrm13_level,
    'tut-1': tut1_level,
    oracle: oracle_level,
    castle: castle_level,
    valley: valley_level,
    /* quest levels: the "x-" proto names take the hero's role filecode
       (src/dungeon.c:1136), so the key is the substituted name */
    'Bar-strt': barstrt_level,
    'Bar-fila': barfila_level,
    'Bar-filb': barfilb_level,
    'Bar-loca': barloca_level,
    'Bar-goal': bargoal_level,
    minefill: minefill_level,
    tower1: tower1_level,
    tower2: tower2_level,
    tower3: tower3_level,
};
