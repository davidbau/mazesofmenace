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
import { tut2_level } from './tut-2.js';
import { castle_level } from './castle.js';
import { valley_level } from './valley.js';
import { barstrt_level } from './bar-strt.js';
import { barfila_level } from './bar-fila.js';
import { barfilb_level } from './bar-filb.js';
import { barloca_level } from './bar-loca.js';
import { bargoal_level } from './bar-goal.js';
import { minefill_level } from './minefill.js';
import { hellfill_level } from './hellfill.js';
import { QUEST_LEVELS } from './quest-levels.js';
import { tower1_level } from './tower1.js';
import { tower2_level } from './tower2.js';
import { tower3_level } from './tower3.js';
import { orcus_level } from './orcus.js';
import { sanctum_level } from './sanctum.js';
import { medusa1_level } from './medusa-1.js';
import { medusa2_level } from './medusa-2.js';
import { medusa3_level } from './medusa-3.js';
import { medusa4_level } from './medusa-4.js';
import { minetn1_level } from './minetn-1.js';
import { minetn2_level } from './minetn-2.js';
import { minetn3_level } from './minetn-3.js';
import { minetn4_level } from './minetn-4.js';
import { minetn5_level } from './minetn-5.js';
import { minetn6_level } from './minetn-6.js';
import { minetn7_level } from './minetn-7.js';
import { minend1_level } from './minend-1.js';
import { minend2_level } from './minend-2.js';
import { minend3_level } from './minend-3.js';
import { soko11_level } from './soko1-1.js';
import { soko12_level } from './soko1-2.js';
import { soko21_level } from './soko2-1.js';
import { soko22_level } from './soko2-2.js';
import { soko31_level } from './soko3-1.js';
import { soko32_level } from './soko3-2.js';
import { soko41_level } from './soko4-1.js';
import { soko42_level } from './soko4-2.js';
import { juiblex_level } from './juiblex.js';
import { asmodeus_level } from './asmodeus.js';
import { baalz_level } from './baalz.js';
import { knox_level } from './knox.js';
import { fakewiz1_level } from './fakewiz1.js';
import { fakewiz2_level } from './fakewiz2.js';
import { wizard1_level } from './wizard1.js';
import { wizard2_level } from './wizard2.js';
import { wizard3_level } from './wizard3.js';
import { earth_level } from './earth.js';
import { air_level } from './air.js';
import { fire_level } from './fire.js';
import { water_level } from './water.js';
import { astral_level } from './astral.js';

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
    'tut-2': tut2_level,
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
    ...QUEST_LEVELS,
    minefill: minefill_level,
    hellfill: hellfill_level,
    tower1: tower1_level,
    tower2: tower2_level,
    tower3: tower3_level,
    orcus: orcus_level,
    sanctum: sanctum_level,
    'medusa-1': medusa1_level,
    'medusa-2': medusa2_level,
    'medusa-3': medusa3_level,
    'medusa-4': medusa4_level,
    'minetn-1': minetn1_level,
    'minetn-2': minetn2_level,
    'minetn-3': minetn3_level,
    'minetn-4': minetn4_level,
    'minetn-5': minetn5_level,
    'minetn-6': minetn6_level,
    'minetn-7': minetn7_level,
    'minend-1': minend1_level,
    'minend-2': minend2_level,
    'minend-3': minend3_level,
    'soko1-1': soko11_level,
    'soko1-2': soko12_level,
    'soko2-1': soko21_level,
    'soko2-2': soko22_level,
    'soko3-1': soko31_level,
    'soko3-2': soko32_level,
    'soko4-1': soko41_level,
    'soko4-2': soko42_level,
    juiblex: juiblex_level,
    asmodeus: asmodeus_level,
    baalz: baalz_level,
    knox: knox_level,
    fakewiz1: fakewiz1_level,
    fakewiz2: fakewiz2_level,
    wizard1: wizard1_level,
    wizard2: wizard2_level,
    wizard3: wizard3_level,
    earth: earth_level,
    air: air_level,
    fire: fire_level,
    water: water_level,
    astral: astral_level,
};
