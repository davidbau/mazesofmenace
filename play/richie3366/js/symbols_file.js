// symbols_file.js — C symbols.c read_sym_file / switch_symbols / parse_sym_line.
// C ref: symbols.c parse_sym_line, files.c read_sym_file, dat/symbols symset blocks.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gs, gp, H_DEC, H_IBM, PRIMARYSET, set_symhandling } from './const.js';
import { mungspacesLikeC } from './hacklib.js';
import { SYM_PARSE_BY_NAME } from './symbols_symmap_data.js';
import { NO_COLOR } from './terminal.js';
import { DEF_MONSYM_DISPLAY } from './makemon_rndmonst.js';
import {
    NH5_WEAPON_CLASS, NH5_ARMOR_CLASS, NH5_RING_CLASS, NH5_AMULET_CLASS,
    NH5_TOOL_CLASS, NH5_FOOD_CLASS, NH5_POTION_CLASS, NH5_SCROLL_CLASS,
    NH5_SPBOOK_CLASS, NH5_WAND_CLASS, NH5_COIN_CLASS, NH5_GEM_CLASS,
    NH5_ROCK_CLASS, NH5_BALL_CLASS, NH5_CHAIN_CLASS,
} from './nh5_objclass.js';

/** C: objclass.h VENOM_CLASS — not exported from nh5_objclass.js stub. */
const NH5_VENOM_CLASS = 17;

/** C: hack.h SYM_MAX — room for cmap + obj + mon + other symbol slots. */
const SYM_MAX = 512;

/** C: sym.h MAXPCHARS, objclass.h MAXOCLASSES, sym.h MAXMCLASSES. */
const MAXPCHARS = 105;
const MAXOCLASSES = 18;
const MAXMCLASSES = 61;
/** C: hack.h SYM_OFF_O / SYM_OFF_M */
const SYM_OFF_O = MAXPCHARS;
const SYM_OFF_M = SYM_OFF_O + MAXOCLASSES;

/** C: drawing.c def_oc_syms[MAXOCLASSES] (defsym.h OBJCLASS). */
const DEF_OC_SYMS = Object.freeze([
    '\0', '\0', ')', '[', '=', '"', '(', '%', '!', '?', '+', '/', '$', '*', '`', '0', '_', '.',
]);

/** C: drawing.c defsyms[MAXPCHARS] — defsym.h PCHAR default tty chars (idx 0..104). */
const DEF_PCHAR_SYMS = Object.freeze([
    32, 124, 45, 45, 45, 45, 45, 45, 45, 45, 124, 124, 46, 45, 124, 43, 43, 35, 35, 46, 46, 96, 35, 35, 35, 60, 62, 60, 62, 60, 62, 60, 62, 95, 124, 92, 123, 123, 125, 46, 125, 125, 46, 46, 35, 35, 32, 35, 125, 94, 94, 94, 94, 94, 94, 94, 94, 94, 94, 94, 94, 94, 94, 94, 94, 94, 34, 94, 94, 94, 94, 126, 94, 94, 124, 45, 92, 47, 42, 33, 41, 40, 48, 35, 64, 42, 35, 36, 47, 45, 92, 124, 124, 92, 45, 47, 47, 45, 92, 124, 32, 124, 92, 45, 47,
]);

/** C: symbols.c init_primary_symbols / init_showsyms — cmap PCHAR defaults. */
function initCmapDefsymsInArrayLikeC(arr) {
    for (let i = 0; i < MAXPCHARS; i++) {
        arr[i] = DEF_PCHAR_SYMS[i] & 0xff;
    }
}

/** C: defsym.h cmap indices (PCHAR idx). */
export const S_stone = 0;
export const S_vwall = 1;
export const S_hwall = 2;
export const S_tlcorn = 3;
export const S_trcorn = 4;
export const S_blcorn = 5;
export const S_brcorn = 6;
export const S_crwall = 7;
export const S_tuwall = 8;
export const S_tdwall = 9;
export const S_tlwall = 10;
export const S_trwall = 11;
export const S_ndoor = 12;
export const S_vodoor = 13;
export const S_hodoor = 14;
export const S_vcdoor = 15;
export const S_hcdoor = 16;
export const S_bars = 17;
export const S_tree = 18;
export const S_room = 19;
export const S_darkroom = 20;
export const S_engroom = 21;
export const S_corr = 22;
export const S_litcorr = 23;
export const S_engrcorr = 24;
export const S_upstair = 25;
export const S_dnstair = 26;
export const S_upladder = 27;
export const S_dnladder = 28;
export const S_altar = 33;
export const S_grave = 34;
export const S_throne = 35;
export const S_sink = 36;
export const S_fountain = 37;
export const S_pool = 38;
export const S_ice = 39;
export const S_lava = 40;
export const S_water = 48;

/**
 * C: dat/symbols DECgraphics — sym_val bytes → tty DEC line-drawing chars (SO/SI set).
 * Matches display.js decgraphics[] for wall cmap 1–11.
 */
const DEC_SYM_BYTE_TO_TTY = Object.freeze({
    0xf8: 'x', 0xf1: 'q', 0xec: 'l', 0xeb: 'k', 0xed: 'm', 0xea: 'j', 0xee: 'n',
    0xf6: 'v', 0xf7: 'w', 0xf5: 'u', 0xf4: 't',
    0xfe: '~', 0xe1: 'a', 0xfc: '|', 0xe7: 'g', 0xe0: '\\',
    0xf9: 'y', 0xfa: 'z', 0xfb: '{', 0xef: 'o', 0xf3: 's',
});

/** C: dat/symbols DECgraphics cmap + features (parse_sym_line subset). */
const DECGRAPHICS_PRIMARY = Object.freeze({
    [S_vwall]: 0xf8, [S_hwall]: 0xf1, [S_tlcorn]: 0xec, [S_trcorn]: 0xeb,
    [S_blcorn]: 0xed, [S_brcorn]: 0xea, [S_crwall]: 0xee,
    [S_tuwall]: 0xf6, [S_tdwall]: 0xf7, [S_tlwall]: 0xf5, [S_trwall]: 0xf4,
    [S_ndoor]: 0xfe, [S_vodoor]: 0xe1, [S_hodoor]: 0xe1,
    [S_bars]: 0xfc, [S_tree]: 0xe7, [S_room]: 0xfe,
    /* C: dat/symbols DECgraphics — no S_upstair/S_dnstair; defsym '<'/'>' remain */
    [S_upladder]: 0xf9, [S_dnladder]: 0xfa,
    [S_altar]: 0xfb, [S_fountain]: 0xfb, [S_pool]: 0xe0, [S_ice]: 0xfe,
    [S_lava]: 0xe0,
});

/** C: dat/symbols IBMgraphics cmap A/B (parse_sym_line subset). */
const IBMGRAPHICS_PRIMARY = Object.freeze({
    [S_vwall]: 0xb3, [S_hwall]: 0xc4, [S_tlcorn]: 0xda, [S_trcorn]: 0xbf,
    [S_blcorn]: 0xc0, [S_brcorn]: 0xd9, [S_crwall]: 0xc5,
    [S_tuwall]: 0xc1, [S_tdwall]: 0xc2, [S_tlwall]: 0xb4, [S_trwall]: 0xc3,
    [S_ndoor]: 0xfa, [S_vodoor]: 0xfe, [S_hodoor]: 0xfe,
    [S_bars]: 0xf0, [S_tree]: 0xf1, [S_room]: 0xfa,
    [S_corr]: 0xb0, [S_litcorr]: 0xb1, [S_engrcorr]: 0xb0,
    [S_engroom]: 0xee,
    [S_fountain]: 0xf4, [S_sink]: 0xf4, [S_pool]: 0xf7,
    [S_ice]: 0xfa, [S_lava]: 0xf7, [S_water]: 0xf7,
});

/** C: dat/symbols IBMgraphics — parse_sym_line SYM_OC rows (S_weapon … S_venom). */
const IBMGRAPHICS_OBJ = Object.freeze({
    [NH5_WEAPON_CLASS]: 0x18,
    [NH5_ARMOR_CLASS]: 0x5b,
    [NH5_RING_CLASS]: 0x3d,
    [NH5_AMULET_CLASS]: 0x0c,
    [NH5_TOOL_CLASS]: 0x28,
    [NH5_FOOD_CLASS]: 0x05,
    [NH5_POTION_CLASS]: 0xad,
    [NH5_SCROLL_CLASS]: 0x0e,
    [NH5_SPBOOK_CLASS]: 0x2b,
    [NH5_WAND_CLASS]: 0xe7,
    [NH5_COIN_CLASS]: 0x0f,
    [NH5_GEM_CLASS]: 0x0f,
    [NH5_ROCK_CLASS]: 0x60,
    [NH5_BALL_CLASS]: 0x30,
    [NH5_CHAIN_CLASS]: 0x5f,
    [NH5_VENOM_CLASS]: 0x2e,
});

const SYMSSET_PRIMARY_OVERRIDES = {
    DECgraphics: DECGRAPHICS_PRIMARY,
    IBMgraphics: IBMGRAPHICS_PRIMARY,
    curses: DECGRAPHICS_PRIMARY,
};

const SYMSSET_OBJ_OVERRIDES = {
    IBMgraphics: IBMGRAPHICS_OBJ,
};

/** C: symbols.c init_showsyms / init_primary_symbols — obj + mon class bytes. */
function initObjMonSymsInArrayLikeC(arr) {
    for (let i = 0; i < MAXOCLASSES; i++) {
        arr[SYM_OFF_O + i] = (DEF_OC_SYMS[i]?.charCodeAt(0) ?? 0) & 0xff;
    }
    for (let i = 0; i < MAXMCLASSES; i++) {
        arr[SYM_OFF_M + i] = (DEF_MONSYM_DISPLAY[i]?.charCodeAt(0) ?? 0) & 0xff;
    }
}

function initPrimarySymbolsLikeC() {
    gp.primary_syms = new Array(SYM_MAX).fill(0);
    gs.showsyms = new Array(SYM_MAX).fill(0);
    initCmapDefsymsInArrayLikeC(gp.primary_syms);
    initCmapDefsymsInArrayLikeC(gs.showsyms);
    initObjMonSymsInArrayLikeC(gp.primary_syms);
    initObjMonSymsInArrayLikeC(gs.showsyms);
}

function applySymsetOverridesLikeC(name) {
    if (!gp.primary_syms) return;
    const tab = SYMSSET_PRIMARY_OVERRIDES[name];
    if (tab) {
        for (const [idx, byte] of Object.entries(tab)) {
            gp.primary_syms[idx | 0] = byte | 0;
        }
    }
    const objTab = SYMSSET_OBJ_OVERRIDES[name];
    if (objTab) {
        for (const [oc, byte] of Object.entries(objTab)) {
            gp.primary_syms[SYM_OFF_O + (oc | 0)] = byte | 0;
        }
    }
}

/**
 * C: symbols.c sym_val DEC byte → tty alternate-font character for render_map_row.
 * @param {number} byte
 * @returns {string|null}
 */
export function decSymByteToTtyCh(byte) {
    return DEC_SYM_BYTE_TO_TTY[byte | 0] ?? null;
}

/**
 * C: display.c glyph_to_mapglyph — nhsym → tty char (DEC sym_val bytes use decSymByteToTtyCh).
 * @param {number} sym
 * @returns {{ ch: string, color: number, dec: boolean }|null}
 */
function symNhsymToGlyphLikeC(sym) {
    const handling = gs.symset[PRIMARYSET]?.handling | 0;
    if (handling === H_DEC) {
        const ch = decSymByteToTtyCh(sym);
        if (ch) return { ch, color: NO_COLOR, dec: true };
    }
    if (handling === H_IBM) {
        const ch = String.fromCharCode(sym & 0xff);
        if (!ch || ch === '\0') return null;
        return { ch, color: NO_COLOR, dec: false };
    }
    const ch = String.fromCharCode(sym & 0xff);
    if (!ch || ch === '\0') return null;
    return { ch, color: NO_COLOR, dec: false };
}

/** C: objects[otyp].oc_class + SYM_OFF_O → gs.showsyms (non-rogue; rogue uses def_r_oc_syms in display.c). */
export function objClassSymGlyphFromShowsymsLikeC(ocClass) {
    const sym = gs.showsyms?.[SYM_OFF_O + (ocClass | 0)] | 0;
    if (!sym) return null;
    return symNhsymToGlyphLikeC(sym);
}

/** C: mons[mnum].mlet + SYM_OFF_M → gs.showsyms. */
export function monClassSymGlyphFromShowsymsLikeC(mlet) {
    const sym = gs.showsyms?.[SYM_OFF_M + (mlet | 0)] | 0;
    if (!sym) return null;
    return symNhsymToGlyphLikeC(sym);
}

export function cmapSymGlyphFromShowsymsLikeC(sIdx, rogueIbm) {
    void rogueIbm;
    const sym = gs.showsyms?.[sIdx | 0] | 0;
    if (!sym) return null;
    /* C: map_glyphinfo — DEC sym_val bytes map to tty alt-font; defsym ASCII unchanged */
    return symNhsymToGlyphLikeC(sym);
}

/** C: symbols.c switch_symbols(nondefault) — copy primary_syms → showsyms. */
export function switchSymbolsPrimaryLikeC(nondefault) {
    if (nondefault && gp.primary_syms) {
        gs.showsyms = gp.primary_syms.slice();
        return;
    }
    initPrimarySymbolsLikeC();
}

const SYM_CONTROL = 1;
const SYM_PCHAR = 2;
const SYM_OC = 3;
const SYM_MON = 4;

/**
 * C: options.c sym_val() — `\xNN`, quoted char, or first byte.
 * @param {string} strval
 * @returns {number}
 */
function symValLikeC(strval) {
    const s = mungspacesLikeC(strval);
    if (!s) return 0;
    if (s.length === 1) return s.charCodeAt(0) & 0xff;
    const x = s.match(/^\\x([0-9a-fA-F]{2})/);
    if (x) return parseInt(x[1], 16) & 0xff;
    if (s.startsWith("'") && s.length >= 2) {
        if (s.length >= 4 && s[1] === '\\' && s[3] === "'") return s.charCodeAt(2) & 0xff;
        if (s[2] === "'") return s.charCodeAt(1) & 0xff;
    }
    return s.charCodeAt(0) & 0xff;
}

/**
 * C: symbols.c match_sym() — name before `=`/`:` (G_* lines skipped).
 * @param {string} buf
 * @returns {{ range: number, idx: number }|null}
 */
function matchSymLikeC(buf) {
    if ((buf[0] === 'G' || buf[0] === 'g') && buf[1] === '_') return null;
    let end = buf.length;
    const eq = buf.indexOf('=');
    const col = buf.indexOf(':');
    let sep = -1;
    if (eq >= 0 && (col < 0 || eq < col)) sep = eq;
    else if (col >= 0) sep = col;
    if (sep >= 0) {
        end = sep;
        if (sep > 0 && buf[sep - 1] === ' ') end = sep - 1;
    }
    const key = buf.slice(0, end).trim();
    const hit = SYM_PARSE_BY_NAME[key] ?? SYM_PARSE_BY_NAME[key.toLowerCase()];
    if (hit) return hit;
    if (key === 'S_armour') return SYM_PARSE_BY_NAME.S_armor ?? null;
    return null;
}

/**
 * C: symbols.c parse_sym_line() — subset for PRIMARYSET cmap/obj/mon (no G_* / UTF-8).
 * @param {string} line
 * @param {number} whichSet
 * @param {{ chosenStart: boolean, chosenEnd: boolean, targetName: string|null }} ctx
 * @returns {boolean}
 */
function parseSymLineLikeC(line, whichSet, ctx) {
    let buf = mungspacesLikeC(line);
    if (!buf) return true;
    const hash = buf.lastIndexOf('#');
    if (hash > 0 && buf[hash - 1] === ' ') buf = buf.slice(0, hash - 1).trimEnd();

    let sep = buf.indexOf('=');
    const altp = buf.indexOf(':');
    if (sep < 0 || (altp >= 0 && altp < sep)) sep = altp;

    if (sep < 0) {
        if (buf.toLowerCase().startsWith('finish')) {
            if (ctx.chosenStart) ctx.chosenEnd = true;
            ctx.chosenStart = false;
            return true;
        }
        return false;
    }
    const symp = matchSymLikeC(buf);
    if (!symp) return true;
    let valStart = sep + 1;
    while (valStart < buf.length && buf[valStart] === ' ') valStart++;
    const valStr = buf.slice(valStart).trim();

    if (symp.range === SYM_CONTROL) {
        if (!ctx.targetName) return true;
        switch (symp.idx) {
        case 0: {
            const want = valStr.toLowerCase();
            const got = (ctx.targetName || '').toLowerCase();
            if (want === got || want.replace(/graphics$/i, '') === got.replace(/graphics$/i, '')) {
                ctx.chosenStart = true;
                initPrimarySymbolsLikeC();
            }
            break;
        }
        case 1:
            if (ctx.chosenStart) ctx.chosenEnd = true;
            ctx.chosenStart = false;
            break;
        case 2:
            if (ctx.chosenStart) set_symhandling(valStr, whichSet);
            break;
        default:
            break;
        }
        return true;
    }

    if (!ctx.chosenStart) return true;
    const val = symValLikeC(valStr);
    if (whichSet === PRIMARYSET) {
        gp.primary_syms[symp.idx] = val;
    }
    return true;
}

/** Optional read of nethack-c/upstream/dat/symbols (embedded tables remain fallback). */
function tryReadDatSymbolsText() {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const candidates = [
        path.join(process.cwd(), 'nethack-c/upstream/dat/symbols'),
        path.resolve(here, '../nethack-c/upstream/dat/symbols'),
    ];
    for (const p of candidates) {
        try {
            if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8');
        } catch { /* sandboxed judge may deny fs */ }
    }
    return null;
}

/**
 * C: files.c read_sym_file() + symbols.c parse_sym_line for one symset block.
 * @param {number} whichSet
 * @param {string} symsetName
 * @returns {boolean}
 */
function readSymFileDatLikeC(whichSet, symsetName) {
    const text = tryReadDatSymbolsText();
    if (!text) return false;
    const ctx = { chosenStart: false, chosenEnd: false, targetName: symsetName };
    gs.symset[whichSet].name = symsetName;
    for (const raw of text.split(/\r?\n/)) {
        const line = raw.trim();
        if (!line || line[0] === '#') continue;
        parseSymLineLikeC(line, whichSet, ctx);
    }
    return ctx.chosenStart && ctx.chosenEnd;
}

/** C: symbols.c read_sym_file(PRIMARYSET) — dat/symbols when available, else embedded cmap tables. */
export function readSymFilePrimaryLikeC(name) {
    if (!name) return false;
    initPrimarySymbolsLikeC();
    if (readSymFileDatLikeC(PRIMARYSET, name)) {
        switchSymbolsPrimaryLikeC(true);
        return true;
    }
    if (!SYMSSET_PRIMARY_OVERRIDES[name]) return false;
    applySymsetOverridesLikeC(name);
    switchSymbolsPrimaryLikeC(true);
    return true;
}
