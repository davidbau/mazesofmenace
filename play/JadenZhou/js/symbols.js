// symbols.js -- C ref: symbols.c, the overrides of the primary symbol set
// that SYMBOLS= config lines give (go.ov_primary_syms[]): loadsyms[],
// init_ov_primary_symbols(), update_ov_primary_symset(), parsesymbols()
// and match_sym().  The overrides are per game (game.ov_primary_syms);
// display.js applies them where a glyph becomes a screen symbol
// (gs.showsyms[] = ov_primary_syms[] ? ov_primary_syms[] : primary_syms[]).

import { game } from './gstate.js';
import { strncmpi, mungspaces, lowc } from './hacklib.js';
import { sym_val } from './options.js';
import { SYM_INVALID, SYM_CONTROL, SYM_PCHAR, SYM_OC, SYM_MON, SYM_OTH,
         SYM_NOTHING, SYM_UNEXPLORED, SYM_BOULDER, SYM_INVISIBLE,
         SYM_PET_OVERRIDE, SYM_HERO_OVERRIDE, MAXOTHER, WARNCOUNT,
         ROGUESET } from './const.js';
import { MAXOCLASSES } from './objects.js';
import { MAXMCLASSES } from './monsters.js';

// C ref: defsym.h PCHAR()/PCHAR2() -- the S_* cmap symbol names, by index
const pchar_names = [
    'S_stone', 'S_vwall', 'S_hwall', 'S_tlcorn', 'S_trcorn', 'S_blcorn',
    'S_brcorn', 'S_crwall', 'S_tuwall', 'S_tdwall', 'S_tlwall', 'S_trwall',
    'S_ndoor', 'S_vodoor', 'S_hodoor', 'S_vcdoor', 'S_hcdoor', 'S_bars',
    'S_tree', 'S_room', 'S_darkroom', 'S_engroom', 'S_corr', 'S_litcorr',
    'S_engrcorr', 'S_upstair', 'S_dnstair', 'S_upladder', 'S_dnladder',
    'S_brupstair', 'S_brdnstair', 'S_brupladder', 'S_brdnladder', 'S_altar',
    'S_grave', 'S_throne', 'S_sink', 'S_fountain', 'S_pool', 'S_ice',
    'S_lava', 'S_lavawall', 'S_vodbridge', 'S_hodbridge', 'S_vcdbridge',
    'S_hcdbridge', 'S_air', 'S_cloud', 'S_water', 'S_arrow_trap',
    'S_dart_trap', 'S_falling_rock_trap', 'S_squeaky_board', 'S_bear_trap',
    'S_land_mine', 'S_rolling_boulder_trap', 'S_sleeping_gas_trap',
    'S_rust_trap', 'S_fire_trap', 'S_pit', 'S_spiked_pit', 'S_hole',
    'S_trap_door', 'S_teleportation_trap', 'S_level_teleporter',
    'S_magic_portal', 'S_web', 'S_statue_trap', 'S_magic_trap',
    'S_anti_magic_trap', 'S_polymorph_trap', 'S_vibrating_square',
    'S_trapped_door', 'S_trapped_chest', 'S_vbeam', 'S_hbeam', 'S_lslant',
    'S_rslant', 'S_digbeam', 'S_flashbeam', 'S_boomleft', 'S_boomright',
    'S_ss1', 'S_ss2', 'S_ss3', 'S_ss4', 'S_poisoncloud', 'S_goodpos',
    'S_sw_tl', 'S_sw_tc', 'S_sw_tr', 'S_sw_ml', 'S_sw_mr', 'S_sw_bl',
    'S_sw_bc', 'S_sw_br', 'S_expl_tl', 'S_expl_tc', 'S_expl_tr',
    'S_expl_ml', 'S_expl_mc', 'S_expl_mr', 'S_expl_bl', 'S_expl_bc',
    'S_expl_br',
];
// C ref: sym.h MAXPCHARS
const MAXPCHARS = pchar_names.length; /* 105 */

// C ref: defsym.h OBJCLASS()/OBJCLASS2() -- the object class symbol
// names, by class (1 .. MAXOCLASSES - 1)
const oc_names = [
    null, 'S_strange_obj', 'S_weapon', 'S_armor', 'S_ring', 'S_amulet',
    'S_tool', 'S_food', 'S_potion', 'S_scroll', 'S_book', 'S_wand',
    'S_coin', 'S_gem', 'S_rock', 'S_ball', 'S_chain', 'S_venom',
];

// C ref: defsym.h MONSYM() -- the monster class symbol names, by class
// (1 .. MAXMCLASSES - 1); class 35's is "S_invisible"
const mon_names = [
    null, 'S_ANT', 'S_BLOB', 'S_COCKATRICE', 'S_DOG', 'S_EYE', 'S_FELINE',
    'S_GREMLIN', 'S_HUMANOID', 'S_IMP', 'S_JELLY', 'S_KOBOLD',
    'S_LEPRECHAUN', 'S_MIMIC', 'S_NYMPH', 'S_ORC', 'S_PIERCER',
    'S_QUADRUPED', 'S_RODENT', 'S_SPIDER', 'S_TRAPPER', 'S_UNICORN',
    'S_VORTEX', 'S_WORM', 'S_XAN', 'S_LIGHT', 'S_ZRUTY', 'S_ANGEL', 'S_BAT',
    'S_CENTAUR', 'S_DRAGON', 'S_ELEMENTAL', 'S_FUNGUS', 'S_GNOME',
    'S_GIANT', 'S_invisible', 'S_JABBERWOCK', 'S_KOP', 'S_LICH', 'S_MUMMY',
    'S_NAGA', 'S_OGRE', 'S_PUDDING', 'S_QUANTMECH', 'S_RUSTMONST',
    'S_SNAKE', 'S_TROLL', 'S_UMBER', 'S_VAMPIRE', 'S_WRAITH', 'S_XORN',
    'S_YETI', 'S_ZOMBIE', 'S_HUMAN', 'S_GHOST', 'S_GOLEM', 'S_DEMON',
    'S_EEL', 'S_LIZARD', 'S_WORM_TAIL', 'S_MIMIC_DEF',
];

// C ref: hack.h SYM_OFF_P .. SYM_MAX -- the ranges of gs.showsyms[]
export const SYM_OFF_P = 0;
export const SYM_OFF_O = SYM_OFF_P + MAXPCHARS;
export const SYM_OFF_M = SYM_OFF_O + MAXOCLASSES;
export const SYM_OFF_W = SYM_OFF_M + MAXMCLASSES;
export const SYM_OFF_X = SYM_OFF_W + WARNCOUNT;
export const SYM_MAX = SYM_OFF_X + MAXOTHER;

// C ref: symbols.c loadsyms[] -- { range, idx, name }; the fence post
// (SYM_INVALID) ends it
const loadsyms = [
    { range: SYM_CONTROL, idx: 0, name: "start" },
    { range: SYM_CONTROL, idx: 0, name: "begin" },
    { range: SYM_CONTROL, idx: 1, name: "finish" },
    { range: SYM_CONTROL, idx: 2, name: "handling" },
    { range: SYM_CONTROL, idx: 3, name: "description" },
    { range: SYM_CONTROL, idx: 4, name: "color" },
    { range: SYM_CONTROL, idx: 4, name: "colour" },
    { range: SYM_CONTROL, idx: 5, name: "restrictions" },
    /* PCHAR_PARSE */
    ...pchar_names.map((name, i) => ({ range: SYM_PCHAR, idx: i, name })),
    /* OBJCLASS_PARSE */
    ...oc_names.slice(1).map((name, i) => ({ range: SYM_OC,
                                             idx: i + 1 + SYM_OFF_O, name })),
    /* MONSYMS_PARSE */
    ...mon_names.slice(1).map((name, i) => ({ range: SYM_MON,
                                              idx: i + 1 + SYM_OFF_M, name })),
    { range: SYM_OTH, idx: SYM_NOTHING + SYM_OFF_X, name: "S_nothing" },
    { range: SYM_OTH, idx: SYM_UNEXPLORED + SYM_OFF_X, name: "S_unexplored" },
    { range: SYM_OTH, idx: SYM_BOULDER + SYM_OFF_X, name: "S_boulder" },
    { range: SYM_OTH, idx: SYM_INVISIBLE + SYM_OFF_X, name: "S_invisible" },
    { range: SYM_OTH, idx: SYM_PET_OVERRIDE + SYM_OFF_X, name: "S_pet_override" },
    { range: SYM_OTH, idx: SYM_HERO_OVERRIDE + SYM_OFF_X, name: "S_hero_override" },
    { range: SYM_INVALID, idx: 0, name: null } /* fence post */
];

// C ref: symbols.c init_ov_primary_symbols()
/* initialize defaults for the overrides to the primary symset */
export function init_ov_primary_symbols() {
    game.ov_primary_syms = new Array(SYM_MAX).fill(0);
}

// C ref: symbols.c update_ov_primary_symset()
export function update_ov_primary_symset(symp, val) {
    if (!game.ov_primary_syms)
        init_ov_primary_symbols();
    game.ov_primary_syms[symp.idx] = val & 0xff; /* (nhsym) val */
}

// C ref: symbols.c savedsym_add() -- the saved_symbols list (newest first)
// that savedsym_strbuf() writes back out as SYMBOLS= lines
function savedsym_add(name, val, which_set) {
    const saved = (game.saved_symbols ||= []);
    /* savedsym_find() */
    const tmp = saved.find(s => which_set === s.which_set && name === s.name);
    if (tmp)
        tmp.val = val;
    else
        saved.unshift({ name, val, which_set });
}

/* the NUL-terminated string at buf[i] (buf is a char array) */
function cstr(buf, i) {
    let s = '';
    while (i < buf.length && buf[i] !== '\0')
        s += buf[i++];
    return s;
}

// C ref: symbols.c parsesymbols()
/* Parse the value of a SYMBOLS line from a config file */
export function parsesymbols(opts, which_set) {
    return parsesymbols_at(Array.from(opts), 0, which_set);
}

/* parsesymbols() on the string at buf[start]; the C code writes NULs
   into its argument, so this works on one char array */
function parsesymbols_at(buf, start, which_set) {
    let val;
    let first_unquoted_comma = -1, first_unquoted_colon = -1;
    let is_glyph = false;
    const at = (k) => (k < buf.length ? buf[k] : '\0');

    /* are there any commas or colons that aren't quoted? */
    for (let ch = start + 1; at(ch) !== '\0'; ++ch) {
        const prech = at(ch - 1), postch = at(ch + 1);

        if (postch === '\0')
            break;
        if (buf[ch] === ',') {
            if (prech === '\'' && postch === '\'')
                continue;
            if (prech === '\\')
                continue;
        }
        if (buf[ch] === ':') {
            if (prech === '\'' && postch === '\'')
                continue;
        }
        if (buf[ch] === ',' && first_unquoted_comma < 0)
            first_unquoted_comma = ch;
        if (buf[ch] === ':' && first_unquoted_colon < 0)
            first_unquoted_colon = ch;
    }
    if (first_unquoted_comma >= 0) {
        buf[first_unquoted_comma++] = '\0';
        if (!parsesymbols_at(buf, first_unquoted_comma, which_set))
            return false;
    }

    /* S_sample:string */
    let strval = first_unquoted_colon;
    if (strval < 0) {
        const eq = cstr(buf, start).indexOf('='); /* strchr(opts, '=') */
        strval = (eq >= 0) ? start + eq : -1;
    }
    if (strval < 0)
        return false;
    buf[strval++] = '\0';

    /* strip leading and trailing white space from symname and strval */
    const symname = mungspaces(cstr(buf, start));
    const strvalS = mungspaces(cstr(buf, strval));

    const symp = match_sym(symname);
    if (!symp && symname[0] === 'G' && symname[1] === '_') {
        /* is_glyph = match_glyph(symname) */
        throw new Error('parsesymbols(): G_ glyph customizations (glyphs.c match_glyph()) not ported yet');
    }
    if (!symp && !is_glyph)
        return false;
    if (symp) {
        if (symp.range && symp.range !== SYM_CONTROL) {
            /* gs.symset[which_set].handling == H_UTF8: no symset the
               port loads (default, DECgraphics) has UTF-8 handling */
            if (lowc(strvalS[0] || '') === 'u' && strvalS[1] === '+') {
                throw new Error('parsesymbols(): U+ symbol values (glyphrep_to_custom_map_entries()) not ported yet');
            } else {
                val = sym_val(strvalS);
                if (which_set === ROGUESET)
                    throw new Error('parsesymbols(): update_ov_rogue_symset() not ported yet');
                else
                    update_ov_primary_symset(symp, val);
            }
        }
    }
    savedsym_add(symname, strvalS, which_set);
    return true;
}

// C ref: symbols.c match_sym()
export function match_sym(buf) {
    const alternates = [
        { altnm: "S_armour", nm: "S_armor" },
        /* alt explosion names are numbered in phone key/button layout */
        { altnm: "S_explode1", nm: "S_expl_tl" },
        { altnm: "S_explode2", nm: "S_expl_tc" }, { altnm: "S_explode3", nm: "S_expl_tr" },
        { altnm: "S_explode4", nm: "S_expl_ml" }, { altnm: "S_explode5", nm: "S_expl_mc" },
        { altnm: "S_explode6", nm: "S_expl_mr" }, { altnm: "S_explode7", nm: "S_expl_bl" },
        { altnm: "S_explode8", nm: "S_expl_bc" }, { altnm: "S_explode9", nm: "S_expl_br" },
    ];
    let len = buf.length;
    let p = buf.indexOf(':');
    const q = buf.indexOf('=');

    /* G_ lines will never match here */
    if ((buf[0] === 'G' || buf[0] === 'g') && buf[1] === '_')
        return null;

    if (p < 0 || (q >= 0 && q < p))
        p = q;
    if (p >= 0) {
        /* note: there will be at most one space before the '='
           because caller has condensed buf[] with mungspaces() */
        if (p > 0 && buf[p - 1] === ' ')
            p--;
        len = p;
    }
    for (let i = 0; loadsyms[i].range; i++) {
        const sp = loadsyms[i];
        if (len >= sp.name.length && !strncmpi(buf, sp.name, len))
            return sp;
    }
    for (const alt of alternates) {
        if (len >= alt.altnm.length && !strncmpi(buf, alt.altnm, len)) {
            for (let i = 0; loadsyms[i].range; i++)
                if (alt.nm === loadsyms[i].name)
                    return loadsyms[i];
        }
    }
    return null;
}
