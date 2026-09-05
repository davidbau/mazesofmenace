// symbols.js — the active symbol set.
// C ref: src/symbols.c
//
// C keeps one table, gs.showsyms[], indexed by SYM_OFF_P + cmap index for
// terrain. init_showsyms() fills it from defsyms[].sym, the ASCII defaults in
// include/defsym.h, and loading a symset from dat/symbols overrides entries
// through gp.primary_syms[]; assign_graphics() then copies the chosen set into
// showsyms.
//
// Only the primary set matters here. The built-in ASCII and DEC sets come
// from defsyms; runtime sets carry the overrides from dat/symbols that affect
// the tty recorder.

import { defsyms } from './drawing_data.js';
import { game } from './gstate.js';

/* src/decl.c gs.showsyms[] — the live table. Terrain entries only; object and
   monster class symbols are the same in both sets, because dat/symbols'
   DECgraphics section overrides S_* cmap entries and nothing else. */
export const gs_showsyms = { P: null };

/* src/symbols.c:44 switch_symbols() takes a boolean for "not the default set";
   PRIMARYSET/ROGUESET are the two graphics sets. Rogue levels are not reached
   by anything ported, so only the primary set is modelled. */
export const PRIMARYSET = 0;

/* src/symbols.c:376 known_handling[] — indexed by symset[].handling. */
export const known_handling = ['UNKNOWN', 'IBM', 'DEC', 'CURS', 'MAC', 'UTF8'];
export const H_UNK = 0, H_IBM = 1, H_DEC = 2, H_CURS = 3, H_MAC = 4,
             H_UTF8 = 5;

/* dat/symbols entries eligible for the primary set in the pinned tty build.
   `index` is symsetentry.idx, retained because do_symset uses index+2 as the
   menu identifier even though rogue-only and MAC entries are filtered out. */
export const primary_symsets = [
    { index: -1, name: null, label: 'Default Symbols', description: '',
      handling: H_UNK },
    { index: 0, name: 'plain', description:
      "same as default symbols, except '+' for corner walls", handling: H_UNK },
    { index: 1, name: 'Blank', description: 'completely blank symbols',
      handling: H_UNK },
    { index: 2, name: 'IBMgraphics', description:
      'special line-drawing characters used for walls', handling: H_IBM },
    { index: 3, name: 'IBMGraphics_1', description: '', handling: H_IBM },
    { index: 4, name: 'IBMGraphics_2', description: '', handling: H_IBM },
    { index: 8, name: 'curses', description:
      'approximation of IBMgraphics using DECgraphics', handling: H_DEC },
    { index: 9, name: 'DECgraphics', description:
      'special line-drawing characters used for walls', handling: H_DEC },
    { index: 11, name: 'Enhanced1', description:
      'Enhanced with Unicode glyphs and 24-bit color', handling: H_UTF8 },
    { index: 12, name: 'Enhanced2', description:
      'Enhanced with more Unicode glyphs and 24-bit color', handling: H_UTF8 },
    { index: 13, name: 'AmigaFont', description:
      'Amiga hack.font line-drawing and effect characters', handling: H_UNK },
];

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
// A truthy legacy argument selects DECgraphics. A string selects the matching
// runtime set from dat/symbols; otherwise the built-in table stays active.
export function assign_graphics(set) {
    const name = (typeof set === 'string') ? set : set ? 'DECgraphics' : null;
    init_showsyms();
    if (name === 'DECgraphics' || name === 'curses')
        for (let i = 0; i < defsyms.length; i++)
            gs_showsyms.P[i] = { ch: defsyms[i].ch, dec: defsyms[i].dec };
    else if (name === 'plain') {
        for (const n of ['S_tlcorn', 'S_trcorn', 'S_blcorn', 'S_brcorn',
                         'S_crwall', 'S_tuwall', 'S_tdwall', 'S_tlwall',
                         'S_trwall']) {
            const i = defsyms.findIndex(d => d.name === n);
            if (i >= 0)
                gs_showsyms.P[i] = { ch: '+', dec: false };
        }
    } else if (name === 'Blank') {
        for (let i = 0; i < defsyms.length; i++)
            gs_showsyms.P[i] = { ch: ' ', dec: false };
    } else if (name === 'Enhanced1' || name === 'Enhanced2') {
        /* The deterministic tty recorder snapshots g_putch output. UTF-8
           glyphs are emitted through g_pututf8 instead, so overridden cmap
           cells remain blank in its screen model. Preserve that observable
           behavior rather than substituting unrelated ASCII glyphs. */
        const common = [
            'S_corr', 'S_engrcorr', 'S_litcorr', 'S_vwall', 'S_hwall',
            'S_tlcorn', 'S_trcorn', 'S_blcorn', 'S_brcorn', 'S_crwall',
            'S_tuwall', 'S_tdwall', 'S_tlwall', 'S_trwall', 'S_ndoor',
            'S_vodoor', 'S_hodoor', 'S_bars', 'S_tree', 'S_room',
            'S_engroom', 'S_darkroom', 'S_upladder', 'S_dnladder',
            'S_altar', 'S_grave', 'S_pool', 'S_ice', 'S_lava',
            'S_lavawall', 'S_vodbridge', 'S_hodbridge', 'S_water', 'S_web',
            'S_vbeam', 'S_hbeam', 'S_sw_tc', 'S_sw_ml', 'S_sw_mr',
            'S_sw_bc', 'S_expl_tc', 'S_expl_ml', 'S_expl_mr', 'S_expl_bc',
        ];
        if (name === 'Enhanced2')
            common.push('S_cloud');
        for (const n of common) {
            const i = defsyms.findIndex(d => d.name === n);
            if (i >= 0)
                gs_showsyms.P[i] = { ch: ' ', dec: false, utf8: true };
        }
    }
    /* src/display.c:1851 — with dark_room on (the 5.0 default) S_darkroom
       displays with S_room's symbol: the DEC middle dot under DECgraphics,
       plain '.' otherwise. Verified against the instrumented recorder:
       showsyms[S_darkroom] is 0xfe for a symset:DECgraphics rc and '.' for
       a plain one. */
    if (game?.flags?.dark_room !== false) {
        const S_room = 19, S_darkroom = 20; /* cmap_names would cycle */
        gs_showsyms.P[S_darkroom] = { ...gs_showsyms.P[S_room] };
    }
    /* dat/symbols' DECgraphics block carries "handling:DEC"; the built-in
       default set has no name and no handler. */
    const entry = primary_symsets.find(s => s.name === name);
    gs_symset[PRIMARYSET] = entry
        ? { name: entry.name, handling: entry.handling }
        : { name: null, handling: H_UNK };
    gc_currentgraphics.set = PRIMARYSET;

    /* C's remembered map stores glyph numbers, then resolves those through
       the current glyph map while redrawing. This port also caches the old
       character, so re-resolve remembered cmap glyphs when the set changes. */
    for (const column of game.level?.locations || [])
        for (const loc of column || []) {
            const remembered = loc?.remembered_glyph;
            const cmap = remembered?.glyph?.cmap;
            if (cmap !== undefined && gs_showsyms.P[cmap]) {
                remembered.ch = gs_showsyms.P[cmap].ch;
                remembered.decgfx = !!gs_showsyms.P[cmap].dec;
            }
            const displayed = loc?.disp_glyph;
            const dcmap = displayed?.cmap;
            if (dcmap !== undefined && gs_showsyms.P[dcmap]) {
                loc.disp_ch = gs_showsyms.P[dcmap].ch;
                loc.disp_decgfx = !!gs_showsyms.P[dcmap].dec;
            }
        }
}

// The lookup src/display.c map_glyphinfo() performs: a cmap index becomes the
// symbol the active set gives it.
export function showsym(cmap) {
    return gs_showsyms.P ? gs_showsyms.P[cmap] : null;
}
