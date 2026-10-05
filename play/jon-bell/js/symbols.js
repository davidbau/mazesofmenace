// js/symbols.js
//
// Ported functions from nethack-c/src/symbols.c.

import { game } from './gstate.js';
import { lowc, mungspaces } from './mklev.js';
import { SYM_CONTROL, H_UTF8 } from './const.js';
import { match_glyph as match_glyph_real,
         glyphrep_to_custom_map_entries as glyphrep_to_custom_map_entries_real } from './glyphs.js';

/**
 * C ref: nethack-c/src/symbols.c:121-128 — init_ov_primary_symbols()
 * Initialize defaults for the overrides to the primary symset.
 */
export function init_ov_primary_symbols() {
    const go = game.go || {};
    if (!Array.isArray(go.ov_primary_syms)) {
        go.ov_primary_syms = [];
    }
    let i;
    const len = go.ov_primary_syms.length;
    for (i = 0; i < len; i++) {
        go.ov_primary_syms[i] = 0;
    }
    game.go = go;
}

/**
 * C ref: nethack-c/src/symbols.c:112-119 — init_ov_rogue_symbols()
 * Initialize defaults for the overrides to the rogue symset.
 */
export function init_ov_rogue_symbols() {
    const go = game.go || {};
    if (!Array.isArray(go.ov_rogue_syms)) {
        go.ov_rogue_syms = [];
    }
    let i;
    const len = go.ov_rogue_syms.length;
    for (i = 0; i < len; i++) {
        go.ov_rogue_syms[i] = 0;
    }
    game.go = go;
}

/**
 * C ref: nethack-c/src/symbols.c:84-93 — init_symbols()
 * Initialize all symbol sets.
 */
export function init_symbols() {
    init_ov_primary_symbols();
    init_ov_rogue_symbols();
    init_primary_symbols();
    init_showsyms();
    init_rogue_symbols();
}

/**
 * C ref: nethack-c/src/symbols.c:711-723 — savedsym_free()
 * Free all nodes in the saved_symbols linked list.
 * Iterates through the list, freeing each node's name and val strings,
 * then the node itself. saved_symbols is reset to NULL implicitly (in C
 * it's a global; in JS the list object just goes out of scope when all
 * references are dropped).
 */
export function savedsym_free() {
    const gg = game.gg || {};
    let tmp = gg.saved_symbols;
    while (tmp) {
        const tmp2 = tmp.next;
        // In C: free(tmp->name), free(tmp->val), free(tmp).
        // In JS, strings and objects are garbage-collected.
        // No explicit action needed beyond dropping the reference.
        tmp = tmp2;
    }
    // Reset the head pointer to NULL (in C: saved_symbols = NULL).
    gg.saved_symbols = null;
    game.gg = gg;
}

/**
 * C ref: nethack-c/src/symbols.c:130-163 — get_othersym()
 * Return a symbol for the given idx and which_set.
 * First tries to find an override in the ov_*_syms arrays,
 * then falls back to the primary or rogue set,
 * then applies special defaults for certain indices.
 */
export function get_othersym(idx, which_set) {
    const SYM_OFF_P = 0;
    const MAXPCHARS = 105;
    const SYM_OFF_O = SYM_OFF_P + MAXPCHARS;  // 105
    const MAXOCLASSES = 18;
    const SYM_OFF_M = SYM_OFF_O + MAXOCLASSES;  // 123
    const MAXMCLASSES = 61;
    const SYM_OFF_W = SYM_OFF_M + MAXMCLASSES;  // 184
    const WARNCOUNT = 6;
    const SYM_OFF_X = SYM_OFF_W + WARNCOUNT;  // 190

    const ROGUESET = 1;
    const PRIMARYSET = 0;

    // Symbol indices for the special cases
    const SYM_NOTHING = 0;
    const SYM_UNEXPLORED = 1;
    const SYM_BOULDER = 2;
    const SYM_INVISIBLE = 3;

    // Default symbols
    const DEF_NOTHING = ' '.charCodeAt(0);  // 32
    const DEF_INVISIBLE = ' '.charCodeAt(0);  // 32 (default to space for invisible)

    // Object class for rocks
    const ROCK_CLASS = 14;

    // Character symbols for object classes (def_oc_syms)
    const def_oc_syms = [
        0,      // 0: placeholder
        93, 41, 91, 61, 34, 40, 37, 33,  // 1-8: ], ), [, =, ", (, %, !
        63, 43, 47, 36, 42, 96, 48, 95, 46  // 9-17: ?, +, /, $, *, `, 0, _, .
    ];

    let sym = 0;
    const oidx = idx + SYM_OFF_X;

    // Initialize game state structures if not present
    const go = game.go || {};
    const gp = game.gp || {};
    const gr = game.gr || {};

    if (!Array.isArray(go.ov_rogue_syms)) {
        go.ov_rogue_syms = [];
    }
    if (!Array.isArray(go.ov_primary_syms)) {
        go.ov_primary_syms = [];
    }
    if (!Array.isArray(gp.primary_syms)) {
        gp.primary_syms = [];
    }
    if (!Array.isArray(gr.rogue_syms)) {
        gr.rogue_syms = [];
    }

    // C: if (which_set == ROGUESET)
    //     sym = go.ov_rogue_syms[oidx] ? go.ov_rogue_syms[oidx] : gr.rogue_syms[oidx];
    // else
    //     sym = go.ov_primary_syms[oidx] ? go.ov_primary_syms[oidx] : gp.primary_syms[oidx];
    if (which_set === ROGUESET) {
        sym = go.ov_rogue_syms[oidx] ? go.ov_rogue_syms[oidx] : gr.rogue_syms[oidx];
    } else {
        sym = go.ov_primary_syms[oidx] ? go.ov_primary_syms[oidx] : gp.primary_syms[oidx];
    }

    // C: if (!sym) { switch(idx) { ... } }
    if (!sym) {
        switch(idx) {
            case SYM_NOTHING:
            case SYM_UNEXPLORED:
                sym = DEF_NOTHING;
                break;
            case SYM_BOULDER:
                // sym = def_oc_syms[ROCK_CLASS].sym;
                sym = def_oc_syms[ROCK_CLASS];
                break;
            case SYM_INVISIBLE:
                sym = DEF_INVISIBLE;
                break;
        }
    }

    game.go = go;
    game.gp = gp;
    game.gr = gr;

    return sym;
}


export function switch_symbols(nondefault) {
    const SYM_MAX = 190;  // SYM_OFF_X (184) + MAXOTHER (6)

    const go = game.go || {};
    const gp = game.gp || {};
    const gs = game.gs || {};

    // Ensure arrays exist
    if (!Array.isArray(go.ov_primary_syms)) {
        go.ov_primary_syms = [];
    }
    if (!Array.isArray(gp.primary_syms)) {
        gp.primary_syms = [];
    }
    if (!Array.isArray(gs.showsyms)) {
        gs.showsyms = [];
    }

    if (nondefault) {
        // Copy from overrides or fall back to primary syms
        for (let i = 0; i < SYM_MAX; i++) {
            gs.showsyms[i] = go.ov_primary_syms[i] ? go.ov_primary_syms[i] : gp.primary_syms[i];
        }
        // In C, there are platform-specific callbacks for graphics mode switching.
        // These are conditionally compiled and not relevant to our cross-platform JS port.
        // The callbacks modify graphics state on the C side; in JS we skip them.
    } else {
        // Reset to defaults
        init_primary_symbols();
        init_showsyms();
    }

    game.go = go;
    game.gp = gp;
    game.gs = gs;
}

export function assign_graphics(whichset) {
    const ROGUESET = 1;
    const PRIMARYSET = 0;
    const SYM_MAX = 190;  // SYM_OFF_X (184) + MAXOTHER (6)

    const go = game.go || {};
    const gp = game.gp || {};
    const gr = game.gr || {};
    const gs = game.gs || {};
    const gc = game.gc || {};

    // Ensure arrays exist
    if (!Array.isArray(go.ov_rogue_syms)) {
        go.ov_rogue_syms = [];
    }
    if (!Array.isArray(gr.rogue_syms)) {
        gr.rogue_syms = [];
    }
    if (!Array.isArray(go.ov_primary_syms)) {
        go.ov_primary_syms = [];
    }
    if (!Array.isArray(gp.primary_syms)) {
        gp.primary_syms = [];
    }
    if (!Array.isArray(gs.showsyms)) {
        gs.showsyms = [];
    }

    switch (whichset) {
    case ROGUESET:
        for (let i = 0; i < SYM_MAX; i++)
            gs.showsyms[i] = go.ov_rogue_syms[i] ? go.ov_rogue_syms[i]
                                           : gr.rogue_syms[i];
        gc.currentgraphics = ROGUESET;
        break;
    case PRIMARYSET:
    default:
        for (let i = 0; i < SYM_MAX; i++)
            gs.showsyms[i] = go.ov_primary_syms[i] ? go.ov_primary_syms[i]
                                            : gp.primary_syms[i];
        gc.currentgraphics = PRIMARYSET;
        break;
    }

    reset_glyphmap(gm_symchange);

    game.go = go;
    game.gp = gp;
    game.gr = gr;
    game.gs = gs;
    game.gc = gc;
}

const gm_symchange = 0;

function reset_glyphmap(reason) {
    // not yet ported: reset_glyphmap
}

function init_primary_symbols() { /* not yet ported: init_primary_symbols */ }
function init_showsyms() { /* not yet ported: init_showsyms */ }

function clear_symsetentry(which_set, name_too) {
    // not yet ported: clear_symsetentry
}

/**
 * C ref: nethack-c/src/symbols.c:186-215 — init_rogue_symbols()
 * Initialize gr.rogue_syms[] with the default Rogue-level symbol set:
 * the pchar defaults, then a handful of pchar overrides, then the
 * object-class, monster-class, warning, and "other" symbol ranges.
 */
export function init_rogue_symbols() {
    const SYM_OFF_P = 0;
    const MAXPCHARS = 105;
    const SYM_OFF_O = SYM_OFF_P + MAXPCHARS;     // 105
    const MAXOCLASSES = 18;
    const SYM_OFF_M = SYM_OFF_O + MAXOCLASSES;   // 123
    const MAXMCLASSES = 61;
    const SYM_OFF_W = SYM_OFF_M + MAXMCLASSES;   // 184
    const WARNCOUNT = 6;
    const SYM_OFF_X = SYM_OFF_W + WARNCOUNT;     // 190
    const MAXOTHER = 6;
    const ROGUESET = 1;

    // S_* pchar indices (nethack-c/include/defsym.h PCHAR list order).
    const S_ndoor = 12;
    const S_vodoor = 13;
    const S_hodoor = 14;
    const S_upstair = 25;
    const S_dnstair = 26;

    // defsyms[i].sym for i in 0..MAXPCHARS-1 (nethack-c/include/defsym.h,
    // the PCHAR2/PCHAR list's drawing char, in idx order 0-104).
    const defsyms_sym = [
        ' ', '|', '-', '-', '-', '-', '-', '-', '-', '-', '|', '|',
        '.', '-', '|', '+', '+', '#', '#', '.', '.', '`', '#', '#', '#',
        '<', '>', '<', '>', '<', '>', '<', '>',
        '_',
        '|', '\\', '{', '{', '}', '.', '}', '}', '.', '.', '#', '#', ' ', '#', '}',
        '^', '^', '^', '^', '^', '^', '^', '^', '^', '^', '^', '^', '^', '^', '^', '^', '^',
        '"', '^', '^', '^', '^', '~', '^', '^',
        '|', '-', '\\', '/',
        '*', '!', ')', '(',
        '0', '#', '@', '*',
        '#', '$',
        '/', '-', '\\', '|', '|', '\\', '-', '/',
        '/', '-', '\\', '|', ' ', '|', '\\', '-', '/',
    ];

    // def_r_oc_syms[i] for i in 0..MAXOCLASSES-1 (nethack-c/src/drawing.c:69-77).
    const def_r_oc_syms = [
        '\0', ']', ')', ']', '=', ',', '(', ':', '!', '?',
        '+', '/', '*', '*', '`', '0', '_', '.',
    ];

    // def_monsyms[i].sym for i in 0..MAXMCLASSES-1 (nethack-c/include/defsym.h
    // MONSYMS list, matching js/drawing.js's def_monsyms_chars).
    const def_monsyms_sym = [
        '\0',
        'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j',
        'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't',
        'u', 'v', 'w', 'x', 'y', 'z', 'A', 'B', 'C', 'D',
        'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N',
        'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X',
        'Y', 'Z', '@', ' ', '\'', '&', ';', ':', '~', ']',
    ];

    // def_warnsyms[i].sym for i in 0..WARNCOUNT-1 (nethack-c/src/drawing.c:37-48).
    const def_warnsyms_sym = ['0', '1', '2', '3', '4', '5'];

    const gr = game.gr || {};
    const gs = game.gs || {};
    if (!Array.isArray(gr.rogue_syms)) {
        gr.rogue_syms = [];
    }
    if (!Array.isArray(gs.symset)) {
        gs.symset = [];
    }

    let i;
    for (i = 0; i < MAXPCHARS; i++)
        gr.rogue_syms[i + SYM_OFF_P] = defsyms_sym[i].charCodeAt(0);
    gr.rogue_syms[S_vodoor] = gr.rogue_syms[S_hodoor]
        = gr.rogue_syms[S_ndoor] = '+'.charCodeAt(0);
    gr.rogue_syms[S_upstair] = gr.rogue_syms[S_dnstair] = '%'.charCodeAt(0);

    for (i = 0; i < MAXOCLASSES; i++)
        gr.rogue_syms[i + SYM_OFF_O] = def_r_oc_syms[i].charCodeAt(0);
    for (i = 0; i < MAXMCLASSES; i++)
        gr.rogue_syms[i + SYM_OFF_M] = def_monsyms_sym[i].charCodeAt(0);
    for (i = 0; i < WARNCOUNT; i++)
        gr.rogue_syms[i + SYM_OFF_W] = def_warnsyms_sym[i].charCodeAt(0);
    for (i = 0; i < MAXOTHER; i++)
        gr.rogue_syms[i + SYM_OFF_X] = get_othersym(i, ROGUESET);

    clear_symsetentry(ROGUESET, false);
    // default on Rogue level is no color, but some symbol sets can
    // override that
    if (!gs.symset[ROGUESET]) {
        gs.symset[ROGUESET] = {};
    }
    gs.symset[ROGUESET].nocolor = 1;

    game.gr = gr;
    game.gs = gs;
}

export function free_symsets() {
    const PRIMARYSET = 0;
    const ROGUESET = 1;
    clear_symsetentry(PRIMARYSET, true);
    clear_symsetentry(ROGUESET, true);
}

export function parsesymbols(opts, which_set) {
    const ROGUESET = 1;
    let first_unquoted_comma = -1;
    let first_unquoted_colon = -1;
    let is_glyph = false;
    let symp;

    /* are there any commas or colons that aren't quoted? */
    for (let i = 1; i < opts.length; i++) {
        let pre = opts[i - 1];
        let ch = opts[i];
        /* if no post character, break (C: if (!*postch) break;) */
        if (i + 1 >= opts.length)
            break;
        let post = opts[i + 1];

        if (ch === ',') {
            if (pre === '\'' && post === '\'')
                continue;
            if (pre === '\\')
                continue;
        }
        if (ch === ':') {
            if (pre === '\'' && post === '\'')
                continue;
        }
        if (ch === ',' && first_unquoted_comma === -1)
            first_unquoted_comma = i;
        if (ch === ':' && first_unquoted_colon === -1)
            first_unquoted_colon = i;
    }

    if (first_unquoted_comma !== -1) {
        /* C: *first_unquoted_comma++ = '\0'; */
        let right = opts.substring(first_unquoted_comma + 1);
        if (!parsesymbols(right, which_set))
            return false;
        /* truncate opts to before the comma for the rest of processing */
        opts = opts.substring(0, first_unquoted_comma);
        if (first_unquoted_colon > first_unquoted_comma)
            first_unquoted_colon = -1;
    }

    /* S_sample:string */
    let colon_idx = first_unquoted_colon;
    if (colon_idx === -1)
        colon_idx = opts.indexOf('=');
    if (colon_idx === -1)
        return false;

    let symname = opts.substring(0, colon_idx);
    let strval = opts.substring(colon_idx + 1);

    /* strip leading and trailing white space from symname and strval */
    symname = mungspaces(symname);
    strval = mungspaces(strval);

    symp = match_sym(symname);
    if (!symp && symname[0] === 'G' && symname[1] === '_') {
        is_glyph = match_glyph_real(symname);
    }
    if (!symp && !is_glyph)
        return false;

    if (symp) {
        if (symp.range && symp.range !== SYM_CONTROL) {
            const gs = game.gs || {};
            if (!gs.symset) gs.symset = [];
            if (!gs.symset[which_set]) gs.symset[which_set] = {};
            if ((gs.symset[which_set].handling === H_UTF8)
                || (lowc(strval[0]) === 'u' && strval[1] === '+')) {
                let buf = symname + ":" + strval;
                let glyph = 0;
                glyphrep_to_custom_map_entries_real(buf, { value: glyph });
            } else {
                let val = sym_val(strval);
                if (which_set === ROGUESET)
                    update_ov_rogue_symset(symp, val);
                else
                    update_ov_primary_symset(symp, val);
            }
        }
    }

    savedsym_add(opts, strval, which_set);
    return true;
}

/* stubs for unported helpers */
function match_sym() { return { range: 2, name: "" }; }
function savedsym_add() { }
function update_ov_primary_symset() { }
function update_ov_rogue_symset() { }
function sym_val() { return 0; }
