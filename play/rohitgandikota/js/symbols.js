// symbols.js — the active symbol set.
// C ref: src/symbols.c
//
// C keeps one table, gs.showsyms[], indexed by SYM_OFF_P + cmap index for
// terrain. init_showsyms() fills it from defsyms[].sym, the ASCII defaults in
// include/defsym.h, and loading a symset from dat/symbols overrides entries
// through gp.primary_syms[]; assign_graphics() then copies the chosen set into
// showsyms.
//
// Only the primary set matters here, and only two of them exist in the
// recorded configurations: the built-in ASCII default, and DECgraphics. Our
// defsyms table already carries both columns per entry -- `sym` is the ASCII
// default and `ch`+`dec` are that entry's DECgraphics override -- so the two
// sets are a column selection rather than a file parse.

import { defsyms } from './drawing_data.js';

/* src/decl.c gs.showsyms[] — the live table. Terrain entries only; object and
   monster class symbols are the same in both sets, because dat/symbols'
   DECgraphics section overrides S_* cmap entries and nothing else. */
export const gs_showsyms = { P: null };

/* src/symbols.c:44 switch_symbols() takes a boolean for "not the default set";
   PRIMARYSET/ROGUESET are the two graphics sets. Rogue levels are not reached
   by anything ported, so only the primary set is modelled. */
export const PRIMARYSET = 0;

/* src/symbols.c:376 known_handling[] — indexed by symset[].handling. */
export const known_handling = ['UNKNOWN', 'IBM', 'DEC', 'CURS'];
export const H_UNK = 0, H_IBM = 1, H_DEC = 2, H_CURS = 3;

/* src/decl.c gs.symset[] — which set was loaded and how it is handled.
   optfn_symset() reports these back in the options menu. `name` stays null
   for the built-in default, which is what makes that menu row read
   "default". */
export const gs_symset = [{ name: null, handling: H_UNK }];

/* src/decl.c gc.currentgraphics — the set assign_graphics() last installed. */
export const gc_currentgraphics = { set: PRIMARYSET };

// src/symbols.c:94 init_showsyms() — the ASCII defaults from defsym.h.
export function init_showsyms() {
    gs_showsyms.P = defsyms.map(d => ({ ch: d.sym, dec: false }));
}

// src/symbols.c:217 assign_graphics() — copy the selected set into showsyms.
//
// `dec` selects DECgraphics, which is what dat/symbols' "start: DECgraphics"
// block installs over the defaults. Without it the table keeps what
// init_showsyms() put there.
export function assign_graphics(dec) {
    init_showsyms();
    if (dec)
        for (let i = 0; i < defsyms.length; i++)
            gs_showsyms.P[i] = { ch: defsyms[i].ch, dec: defsyms[i].dec };
    /* dat/symbols' DECgraphics block carries "handling:DEC"; the built-in
       default set has no name and no handler. */
    gs_symset[PRIMARYSET] = dec ? { name: 'DECgraphics', handling: H_DEC }
                                : { name: null, handling: H_UNK };
    gc_currentgraphics.set = PRIMARYSET;
}

// The lookup src/display.c map_glyphinfo() performs: a cmap index becomes the
// symbol the active set gives it.
export function showsym(cmap) {
    return gs_showsyms.P ? gs_showsyms.P[cmap] : null;
}
