// sp_lev_mapchr.js — C nhlua.c char2typ + splev_chr2typ (des ASCII map).
// C ref: nhlua.c char2typ[] / splev_chr2typ().

import {
    STONE, CORR, ROOM, HWALL, VWALL, DOOR, SDOOR, SCORR,
    TLCORNER, TRCORNER, BLCORNER, BRCORNER, CROSSWALL,
    TUWALL, TDWALL, TLWALL, TRWALL, DBWALL,
    AIR, CLOUD, FOUNTAIN, THRONE, SINK, MOAT, POOL,
    LAVAPOOL, LAVAWALL, ICE, WATER, TREE, IRONBARS,
    MAX_TYPE, INVALID_TYPE, MATCH_WALL,
} from './const.js';

/** C: nhlua.c char2typ — linear scan; first `-` matches HWALL. */
const CHAR2TYP = [
    [' ', STONE],
    ['#', CORR],
    ['.', ROOM],
    ['-', HWALL],
    ['|', VWALL],
    ['+', DOOR],
    ['A', AIR],
    ['C', CLOUD],
    ['S', SDOOR],
    ['H', SCORR],
    ['{', FOUNTAIN],
    ['\\', THRONE],
    ['K', SINK],
    ['}', MOAT],
    ['P', POOL],
    ['L', LAVAPOOL],
    ['Z', LAVAWALL],
    ['I', ICE],
    ['W', WATER],
    ['T', TREE],
    ['F', IRONBARS],
    ['x', MAX_TYPE],
    ['B', CROSSWALL],
    ['w', MATCH_WALL],
];

/**
 * C: nhlua.c splev_chr2typ
 * @param {string} ch
 * @returns {number}
 */
export function splevChr2typLikeC(ch) {
    const c = typeof ch === 'string' ? ch[0] : String.fromCharCode(ch | 0);
    for (const [k, typ] of CHAR2TYP) {
        if (k === c) return typ | 0;
    }
    /* C table lists wall corners as `-` with later entries — only HWALL reached for `-`. */
    if (c === '-') return HWALL;
    return INVALID_TYPE;
}
