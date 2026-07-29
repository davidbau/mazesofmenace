// dat/levels.js — registry of ported special-level scripts.
// C ref: the dat/*.lua files, loaded by load_special() (src/sp_lev.c:6454).
//
// Keys are the proto names makemaz() resolves ("oracle", "bigrm-3", ...).
// A level absent from this registry makes load_special() return false and
// makemaz() records the gap; nothing is faked.

import { oracle_level } from './oracle.js';

export const SPECIAL_LEVELS = {
    oracle: oracle_level,
};
