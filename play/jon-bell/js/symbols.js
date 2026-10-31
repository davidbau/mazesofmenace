// js/symbols.js
//
// Ported functions from nethack-c/src/symbols.c.

import { game } from './gstate.js';
import { reset_glyphmap } from './display.js';
import { lowc, mungspaces } from './mklev.js';
import { gs, SYM_CONTROL, SYM_PCHAR, SYM_OC, SYM_MON, SYM_OTH, H_UTF8 } from './const.js';
import { escapes } from './cmd_config.js';
import { dat_content } from './dat_source.js';
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
    const DEF_INVISIBLE = 'I'.charCodeAt(0);  // defsym.h:336 MONSYM(INVISIBLE)

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

    game.go = go;
    game.gp = gp;
    game.gr = gr;
    game.gs = gs;
    game.gc = gc;
    reset_glyphmap(gm_symchange);
}

const gm_symchange = 4; // C display.h: glyphmap_change_triggers

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

/* ------------------------------------------------------------------------
 * dat/symbols loading: read_sym_file (files.c:2631) -> parse_sym_line
 * (symbols.c:465) -> load_symset (symbols.c:692), feeding gp.primary_syms[]
 * and gs.showsyms[] exactly as C does.  The file is bundled (js/dat/symbols,
 * nethack-c-v5/upstream/dat/symbols) because js/ never reads a filesystem.
 * ---------------------------------------------------------------------- */
const SYMF_OFF_O = 105, SYMF_OFF_M = 105 + 18, SYMF_OFF_W = 105 + 18 + 61,
      SYMF_OFF_X = 105 + 18 + 61 + 6, SYMF_MAX = 105 + 18 + 61 + 6 + 6;

/* symbols.c:398-432 loadsyms[] — SYM_CONTROL keywords, then the PCHAR,
 * OBJCLASS and MONSYMS names in defsym.h order, then the SYM_OTH slots.
 * match_sym() scans forward, so the MONSYM S_invisible ('I', idx M+37)
 * shadows the SYM_OTH S_invisible exactly as in C. */
const LOADSYMS = (() => {
    const out = [
        { range: SYM_CONTROL, idx: 0, name: 'start' }, { range: SYM_CONTROL, idx: 0, name: 'begin' },
        { range: SYM_CONTROL, idx: 1, name: 'finish' }, { range: SYM_CONTROL, idx: 2, name: 'handling' },
        { range: SYM_CONTROL, idx: 3, name: 'description' }, { range: SYM_CONTROL, idx: 4, name: 'color' },
        { range: SYM_CONTROL, idx: 4, name: 'colour' }, { range: SYM_CONTROL, idx: 5, name: 'restrictions' },
    ];
    const pchar = ('stone vwall hwall tlcorn trcorn blcorn brcorn crwall tuwall tdwall tlwall trwall '
        + 'ndoor vodoor hodoor vcdoor hcdoor bars tree room darkroom engroom corr litcorr engrcorr '
        + 'upstair dnstair upladder dnladder brupstair brdnstair brupladder brdnladder altar grave '
        + 'throne sink fountain pool ice lava lavawall vodbridge hodbridge vcdbridge hcdbridge air '
        + 'cloud water arrow_trap dart_trap falling_rock_trap squeaky_board bear_trap land_mine '
        + 'rolling_boulder_trap sleeping_gas_trap rust_trap fire_trap pit spiked_pit hole trap_door '
        + 'teleportation_trap level_teleporter magic_portal web statue_trap magic_trap '
        + 'anti_magic_trap polymorph_trap vibrating_square trapped_door trapped_chest vbeam hbeam '
        + 'lslant rslant digbeam flashbeam boomleft boomright ss1 ss2 ss3 ss4 poisoncloud goodpos '
        + 'sw_tl sw_tc sw_tr sw_ml sw_mr sw_bl sw_bc sw_br expl_tl expl_tc expl_tr expl_ml expl_mc '
        + 'expl_mr expl_bl expl_bc expl_br').split(' ');
    pchar.forEach((n, i) => out.push({ range: SYM_PCHAR, idx: i, name: 'S_' + n }));
    ('strange_obj weapon armor ring amulet tool food potion scroll book wand coin gem rock ball '
     + 'chain venom').split(' ')
        .forEach((n, i) => out.push({ range: SYM_OC, idx: SYMF_OFF_O + i + 1, name: 'S_' + n }));
    ('ANT BLOB COCKATRICE DOG EYE FELINE GREMLIN HUMANOID IMP JELLY KOBOLD LEPRECHAUN MIMIC NYMPH '
     + 'ORC PIERCER QUADRUPED RODENT SPIDER TRAPPER UNICORN VORTEX WORM XAN LIGHT ZRUTY ANGEL BAT '
     + 'CENTAUR DRAGON ELEMENTAL FUNGUS GNOME GIANT invisible JABBERWOCK KOP LICH MUMMY NAGA OGRE '
     + 'PUDDING QUANTMECH RUSTMONST SNAKE TROLL UMBER VAMPIRE WRAITH XORN YETI ZOMBIE HUMAN GHOST '
     + 'GOLEM DEMON EEL LIZARD WORM_TAIL MIMIC_DEF').split(' ')
        .forEach((n, i) => out.push({ range: SYM_MON, idx: SYMF_OFF_M + i + 1, name: 'S_' + n }));
    ['nothing', 'unexplored', 'boulder', 'invisible', 'pet_override', 'hero_override']
        .forEach((n, i) => out.push({ range: SYM_OTH, idx: SYMF_OFF_X + i, name: 'S_' + n }));
    return out;
})();
const KNOWN_HANDLING = ['UNKNOWN', 'IBM', 'DEC', 'CURS', 'MAC', 'UTF8'];

/* drawing.c def_oc_syms[].sym / def_monsyms[].sym / def_warnsyms[].sym */
const DEF_OC_SYM = '\0])[="(%!?+/$*`0_.';
const DEF_MON_SYM = '\0abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ@ \'&;:~]';
/* defsym.h PCHAR sym column (same table init_rogue_symbols transcribes) */
const DEFSYMS_SYM = ' |--------||.-|++##..`###<><><><>_|\\{{}.}}..## #}^^^^^^^^^^^^^^^^^"^^^^~^^|-\\/*!)(0#@*#$/-\\||\\-//-\\| |\\-/';

function strcmpi(a, b) { return String(a).toLowerCase() === String(b).toLowerCase(); }

/* symbols.c:868 match_sym() — strncmpi over the keyword part of buf */
function match_sym_real(buf) {
    if ((buf[0] === 'G' || buf[0] === 'g') && buf[1] === '_')
        return null;
    let p = buf.indexOf(':');
    const q = buf.indexOf('=');
    if (p < 0 || (q >= 0 && q < p))
        p = q;
    let len = buf.length;
    if (p >= 0) {
        if (p > 0 && buf[p - 1] === ' ')
            p--;
        len = p;
    }
    const key = buf.slice(0, len).toLowerCase();
    for (const sp of LOADSYMS)
        if (len >= sp.name.length && sp.name.toLowerCase().startsWith(key))
            return sp;
    const alternates = [['S_armour', 'S_armor'], ['S_explode1', 'S_expl_tl'], ['S_explode2', 'S_expl_tc'],
        ['S_explode3', 'S_expl_tr'], ['S_explode4', 'S_expl_ml'], ['S_explode5', 'S_expl_mc'],
        ['S_explode6', 'S_expl_mr'], ['S_explode7', 'S_expl_bl'], ['S_explode8', 'S_expl_bc'],
        ['S_explode9', 'S_expl_br']];
    for (const [alt, nm] of alternates)
        if (len >= alt.length && alt.toLowerCase().startsWith(key))
            return LOADSYMS.find((sp) => sp.name === nm) || null;
    return null;
}

/* options.c:9385 sym_val() — the first byte of the unescaped value */
export function sym_val_real(strval) {
    let buf = '';
    if (!strval[0] || !strval[1]) {
        if (strval[0] && !/\s/.test(strval[0]))
            buf = strval[0];
    } else if (strval[0] === '\'') {
        if (strval[2] === '\'' && strval.length === 3) {
            buf = strval[1];
        } else if (strval[1] === '\\' && strval[2] && strval[3] === '\''
                   && '\'"\\'.includes(strval[2]) && strval.length === 4) {
            buf = strval[2];
        } else {
            const tmp = strval.slice(1);
            const p = tmp.lastIndexOf('\'');
            if (p >= 0)
                buf = escapes(tmp.slice(0, p));
        }
    } else {
        buf = escapes(strval);
    }
    return buf ? (buf.charCodeAt(0) & 0xff) : 0;
}

function ensure_sym_arrays() {
    const gp = game.gp || (game.gp = {});
    const go = game.go || (game.go = {});
    if (!Array.isArray(gp.primary_syms) || gp.primary_syms.length < SYMF_MAX)
        gp.primary_syms = new Array(SYMF_MAX).fill(0);
    if (!Array.isArray(go.ov_primary_syms) || go.ov_primary_syms.length < SYMF_MAX)
        go.ov_primary_syms = new Array(SYMF_MAX).fill(0);
    return { gp, go };
}

/* symbols.c:165-184 init_primary_symbols() (primary set only; the
 * clear_symsetentry() it ends with is done by load_symset's caller). */
function init_primary_syms_real() {
    const { gp } = ensure_sym_arrays();
    gp.primary_utf8 = {};
    for (let i = 0; i < 105; i++) gp.primary_syms[i] = DEFSYMS_SYM.charCodeAt(i);
    for (let i = 0; i < 18; i++) gp.primary_syms[i + SYMF_OFF_O] = DEF_OC_SYM.charCodeAt(i);
    for (let i = 0; i < 61; i++) gp.primary_syms[i + SYMF_OFF_M] = DEF_MON_SYM.charCodeAt(i);
    for (let i = 0; i < 6; i++) gp.primary_syms[i + SYMF_OFF_W] = 48 + i;
    for (let i = 0; i < 6; i++) gp.primary_syms[i + SYMF_OFF_X] = 0;
    for (let i = 0; i < 6; i++) gp.primary_syms[i + SYMF_OFF_X] = get_othersym(i, 0);
}

/* symbols.c:465-658 parse_sym_line() for a chosen-set load (symset name
 * non-null); the pick-list arm is do_symset's and is not needed here. */
function parse_sym_line_real(line, which_set, st) {
    let buf = line.replace(/\s+/g, ' ').trim();               /* mungspaces */
    const hash = buf.lastIndexOf('#');
    if (hash > 0 && buf[hash - 1] === ' ')
        buf = buf.slice(0, hash - 1);
    let bp = buf.indexOf('=');
    const altp = buf.indexOf(':');
    if (bp < 0 || (altp >= 0 && altp < bp))
        bp = altp;
    if (bp < 0) {
        if (buf.slice(0, 6).toLowerCase() === 'finish') {
            if (st.start) st.end = true;
            st.start = false;
            return 1;
        }
        return 0;
    }
    let val = buf.slice(bp + 1);
    if (val[0] === ' ')
        val = val.slice(1);
    const symp = match_sym_real(buf);
    const set = gs_symset(which_set);
    if (!symp) {
        /* G_ glyph lines (glyphs.c add_custom_urep_entry): a plain G_<cmap>
         * line customizes that cmap glyph's UTF8 representation, as S_<cmap>
         * would; level-variant G_ names (_sokoban, _gehennom) match nothing. */
        if (st.start && which_set === 0 && set.handling === H_UTF8
            && /^G_/.test(buf)) {
            const gsym = match_sym_real('S_' + buf.slice(2));
            const u = /^U\+([0-9a-f]+)/i.exec(val.trim());
            if (gsym && gsym.range !== SYM_CONTROL && u && parseInt(u[1], 16))
                game.gp.primary_utf8[gsym.idx] = parseInt(u[1], 16);
        }
        return 1;
    }
    if (symp.range === SYM_CONTROL) {
        switch (symp.idx) {
        case 0:
            if (strcmpi(val, set.name)) {
                st.start = true;
                if (which_set === 0) {
                    init_primary_syms_real();
                    set.handling = 0; set.nocolor = 0; set.primary = 0; set.rogue = 0;
                }
            }
            break;
        case 1:
            if (st.start) st.end = true;
            st.start = false;
            break;
        case 2:
            if (st.start) {
                set.handling = 0;
                const i = KNOWN_HANDLING.findIndex((h) => strcmpi(h, val));
                if (i >= 0) set.handling = i;
            }
            break;
        case 4:
            if (st.start) {
                if (/^(true|yes|on)$/i.test(val)) set.nocolor = 0;
                else if (/^(false|no|off)$/i.test(val)) set.nocolor = 1;
            }
            break;
        case 5:
            if (st.start) {
                if (strcmpi(val, 'primary')) set.primary = 1;
                else if (strcmpi(val, 'rogue')) set.rogue = 1;
            }
            break;
        default:
            break;
        }
    } else if (st.start && which_set === 1 && st.symbols) {
        // C symbols.c:629-635: the selected Rogue set overrides its defaults.
        st.symbols[symp.idx] = sym_val_real(val);
    } else if (st.start && which_set === 0) {
        if (set.handling !== H_UTF8) {
            game.gp.primary_syms[symp.idx] = sym_val_real(val);
        } else {
            /* symbols.c:638-641 -> glyphs.c:68-83: Unicode replaces the
             * glyph's u entry, leaving its ordinary ttychar unchanged. */
            const u = /^U\+([0-9a-f]+)/i.exec(val.trim());
            if (u && parseInt(u[1], 16))
                game.gp.primary_utf8[symp.idx] = parseInt(u[1], 16);
        }
    }
    return 1;
}

/* gs.symset[] is const.js's decl.c global (display.js reads the same one) */
function gs_symset(which_set) {
    if (!Array.isArray(gs.symset)) gs.symset = [];
    if (!gs.symset[which_set]) gs.symset[which_set] = {};
    return gs.symset[which_set];
}

/* symbols.c:692 load_symset(s, PRIMARYSET) + files.c:2631 read_sym_file():
 * fills gp.primary_syms[] and the set's handling/nocolor from dat/symbols.
 * Returns false when the named set is not in the file (C then clears the
 * entry and keeps the default symbols). */
export function load_primary_symset_from_file(name) {
    const text = dat_content('symbols');
    if (name && !text)
        return false;
    const set = gs_symset(0);
    /* symbols.c:330-345 clear_symsetentry(PRIMARYSET, TRUE) */
    set.handling = 0; set.nocolor = 0; set.primary = 0; set.rogue = 0;
    set.name = name || null;
    ensure_sym_arrays();
    init_primary_syms_real();
    /* C symbols.c:1067-1071: selecting Default Symbols still resets the
     * primary table, without a subsequent read_sym_file(). */
    if (!name) {
        game._symsetLoaded = null;
        return true;
    }
    const st = { start: false, end: false };
    for (const raw of text.split('\n')) {
        const line = raw.replace(/\r$/, '');
        if (/^\s*(#|$)/.test(line))
            continue;                       /* parse_conf_file skips comments */
        parse_sym_line_real(line, 0, st);
    }
    game._symsetLoaded = (st.start || st.end) ? name : null;
    return !!game._symsetLoaded;
}

/* symbols.c:303-307 update_ov_primary_symset() for a SYMBOLS=S_x:val pair */
export function set_primary_symbol_override(symname, strval) {
    const symp = match_sym_real(`${symname}:${strval}`);
    if (!symp || symp.range === SYM_CONTROL)
        return false;
    const { go } = ensure_sym_arrays();
    go.ov_primary_syms[symp.idx] = sym_val_real(strval);
    return true;
}

/* symbols.c:236-239 showsyms[i] = ov_primary_syms[i] ? : primary_syms[i] */
export function primary_showsym(idx) {
    const go = game.go, gp = game.gp;
    const ov = go?.ov_primary_syms?.[idx];
    return ov ? ov : (gp?.primary_syms?.[idx] ?? 0);
}

/* C symbols.c:224-226,629-635: retain the full Rogue symbol bytes for
 * pager comparisons, independently of what tty can paint. Missing entries
 * use init_rogue_symbols' defaults in the description class scanner. */
export function rogue_showsyms() {
    const name = gs_symset(1).name;
    if (!game._roguePagerSymbols || game._roguePagerSymbols.name !== name) {
        const symbols = [];
        const st = { start: false, end: false, symbols };
        if (name)
            for (const line of (dat_content('symbols') || '').split('\n'))
                if (!/^\s*(#|$)/.test(line)) parse_sym_line_real(line, 1, st);
        game._roguePagerSymbols = { name, symbols };
    }
    const overrides = game.go?.ov_rogue_syms;
    return Array.from({ length: SYMF_MAX }, (_, i) =>
        overrides?.[i] || game._roguePagerSymbols.symbols[i]);
}

export function primary_unicode_symbol(idx) {
    return gs_symset(0).handling === H_UTF8 ? game.gp?.primary_utf8?.[idx] : 0;
}

export function symset_cell(sym) {
    const handling = gs_symset(0).handling;
    let cell;
    if (!(sym & 0x80))
        cell = { ch: String.fromCharCode(sym), dec: false };
    else if (handling === 1 /* H_IBM */ || handling === H_UTF8)
        cell = { ch: String.fromCharCode(sym & 0x7f), dec: false };
    else
        cell = { ch: String.fromCharCode(sym ^ 0x80), dec: true };
    if (cell.ch.charCodeAt(0) < 0x20)
        cell = { ch: ' ', dec: false, ctl: true, alt: !!cell.dec };
    return cell;
}
export const SYM_OFFSETS = { O: SYMF_OFF_O, M: SYMF_OFF_M, W: SYMF_OFF_W, X: SYMF_OFF_X };
export function defsym_char(idx) { return DEFSYMS_SYM[idx]; }

/* C symbols.c loadsyms[]: the canonical name for a display symbol. */
export function symbol_name(idx) {
    return LOADSYMS.find(sp => sp.range !== SYM_CONTROL && sp.idx === idx)?.name;
}
