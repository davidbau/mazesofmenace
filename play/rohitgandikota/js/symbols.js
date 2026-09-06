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

import { defsyms, def_oc_syms, def_monsyms } from './drawing_data.js';
import { mungspaces } from './hacklib.js';
import { game } from './gstate.js';

/* src/decl.c gs.showsyms[] — the live table. Terrain entries only; object and
   monster class symbols are the same in both sets, because dat/symbols'
   DECgraphics section overrides S_* cmap entries and nothing else. */
export const gs_showsyms = { P: null };

/* src/symbols.c:44 switch_symbols() takes a boolean for "not the default set";
   PRIMARYSET/ROGUESET are the two graphics sets. Rogue levels are not reached
   by anything ported, so only the primary set is modelled. */
export const PRIMARYSET = 0;
export const ROGUESET = 1;

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

const note_unported_symbols = (w) => {
    (game.unported ||= new Set()).add('symbols:' + w);
    return false;
};

/* include/hack.h:1080 SYM_OFF_P .. SYM_MAX — one flat table of terrain,
   object class, monster class, warning and "other" symbols */
export const MAXPCHARS = defsyms.length;       /* include/sym.h */
export const MAXOCLASSES = def_oc_syms.length; /* include/objclass.h */
export const MAXMCLASSES = def_monsyms.length; /* include/sym.h */
export const WARNCOUNT = 6;                    /* include/sym.h */
export const MAXOTHER = 6;                     /* include/sym.h:118 */
export const SYM_OFF_P = 0;
export const SYM_OFF_O = SYM_OFF_P + MAXPCHARS;
export const SYM_OFF_M = SYM_OFF_O + MAXOCLASSES;
export const SYM_OFF_W = SYM_OFF_M + MAXMCLASSES;
export const SYM_OFF_X = SYM_OFF_W + WARNCOUNT;
export const SYM_MAX = SYM_OFF_X + MAXOTHER;
/* include/sym.h:112 the "other" symbols */
export const SYM_NOTHING = 0, SYM_UNEXPLORED = 1, SYM_BOULDER = 2,
             SYM_INVISIBLE = 3, SYM_PET_OVERRIDE = 4, SYM_HERO_OVERRIDE = 5;
/* include/hack.h:51 DEF_NOTHING; include/defsym.h MONSYM(35, 'I', INVISIBLE)
   gives DEF_INVISIBLE */
const DEF_NOTHING = ' '.charCodeAt(0);
const DEF_INVISIBLE = 'I'.charCodeAt(0);
const ROCK_CLASS = 14; /* include/objclass.h */
/* include/sym.h symparse.range values */
const SYM_CONTROL = 1, SYM_PCHAR = 2, SYM_OC = 3, SYM_MON = 4, SYM_OTH = 5;

/* src/decl.c go.ov_primary_syms[] / go.ov_rogue_syms[] — the SYMBOLS=
   overrides as character codes; 0 means "no override" */
export const go_ov_primary_syms = new Array(SYM_MAX).fill(0);
export const go_ov_rogue_syms = new Array(SYM_MAX).fill(0);

// src/symbols.c:113 init_ov_rogue_symbols()
export function init_ov_rogue_symbols() {
    for (let i = 0; i < SYM_MAX; i++)
        go_ov_rogue_syms[i] = 0;
}
// src/symbols.c:122 init_ov_primary_symbols()
export function init_ov_primary_symbols() {
    for (let i = 0; i < SYM_MAX; i++)
        go_ov_primary_syms[i] = 0;
}

// src/symbols.c:131 get_othersym() — an "other" symbol, with its default
export function get_othersym(idx, which_set) {
    let sym = 0;
    const oidx = idx + SYM_OFF_X;

    /* gr.rogue_syms[] and gp.primary_syms[] hold nothing for these entries
       in the sets the tty recorder can load, so only the overrides apply */
    if (which_set === ROGUESET)
        sym = go_ov_rogue_syms[oidx] ? go_ov_rogue_syms[oidx] : 0;
    else
        sym = go_ov_primary_syms[oidx] ? go_ov_primary_syms[oidx] : 0;
    if (!sym) {
        switch (idx) {
        case SYM_NOTHING:
        case SYM_UNEXPLORED:
            sym = DEF_NOTHING;
            break;
        case SYM_BOULDER:
            sym = def_oc_syms[ROCK_CLASS].charCodeAt(0);
            break;
        case SYM_INVISIBLE:
            sym = DEF_INVISIBLE;
            break;
        /* these intentionally have no defaults */
        case SYM_PET_OVERRIDE:
        case SYM_HERO_OVERRIDE:
            break;
        }
    }
    return sym;
}

// src/symbols.c:295 update_ov_primary_symset()
export function update_ov_primary_symset(symp, val) {
    go_ov_primary_syms[symp.idx] = val;
}
// src/symbols.c:301 update_ov_rogue_symset()
export function update_ov_rogue_symset(symp, val) {
    go_ov_rogue_syms[symp.idx] = val;
}

/* src/symbols.c:403 loadsyms[] — include/defsym.h expands PCHAR_PARSE,
   OBJCLASS_PARSE and MONSYMS_PARSE into the S_ names of each range */
const OBJCLASS_SYMS = [null, 'S_strange_obj', 'S_weapon', 'S_armor', 'S_ring',
    'S_amulet', 'S_tool', 'S_food', 'S_potion', 'S_scroll', 'S_book', 'S_wand',
    'S_coin', 'S_gem', 'S_rock', 'S_ball', 'S_chain', 'S_venom'];
const MONSYM_SYMS = [null, 'S_ANT', 'S_BLOB', 'S_COCKATRICE', 'S_DOG', 'S_EYE',
    'S_FELINE', 'S_GREMLIN', 'S_HUMANOID', 'S_IMP', 'S_JELLY', 'S_KOBOLD',
    'S_LEPRECHAUN', 'S_MIMIC', 'S_NYMPH', 'S_ORC', 'S_PIERCER', 'S_QUADRUPED',
    'S_RODENT', 'S_SPIDER', 'S_TRAPPER', 'S_UNICORN', 'S_VORTEX', 'S_WORM',
    'S_XAN', 'S_LIGHT', 'S_ZRUTY', 'S_ANGEL', 'S_BAT', 'S_CENTAUR', 'S_DRAGON',
    'S_ELEMENTAL', 'S_FUNGUS', 'S_GNOME', 'S_GIANT', 'S_invisible',
    'S_JABBERWOCK', 'S_KOP', 'S_LICH', 'S_MUMMY', 'S_NAGA', 'S_OGRE',
    'S_PUDDING', 'S_QUANTMECH', 'S_RUSTMONST', 'S_SNAKE', 'S_TROLL', 'S_UMBER',
    'S_VAMPIRE', 'S_WRAITH', 'S_XORN', 'S_YETI', 'S_ZOMBIE', 'S_HUMAN',
    'S_GHOST', 'S_GOLEM', 'S_DEMON', 'S_EEL', 'S_LIZARD', 'S_WORM_TAIL',
    'S_MIMIC_DEF'];
const loadsyms = [
    { range: SYM_CONTROL, idx: 0, name: 'start' },
    { range: SYM_CONTROL, idx: 0, name: 'begin' },
    { range: SYM_CONTROL, idx: 1, name: 'finish' },
    { range: SYM_CONTROL, idx: 2, name: 'handling' },
    { range: SYM_CONTROL, idx: 3, name: 'description' },
    { range: SYM_CONTROL, idx: 4, name: 'color' },
    { range: SYM_CONTROL, idx: 4, name: 'colour' },
    { range: SYM_CONTROL, idx: 5, name: 'restrictions' },
    ...defsyms.map((d, i) => ({ range: SYM_PCHAR, idx: SYM_OFF_P + i, name: d.name })),
    ...OBJCLASS_SYMS.map((n, i) => n ? { range: SYM_OC, idx: SYM_OFF_O + i, name: n } : null)
        .filter(Boolean),
    ...MONSYM_SYMS.map((n, i) => n ? { range: SYM_MON, idx: SYM_OFF_M + i, name: n } : null)
        .filter(Boolean),
    { range: SYM_OTH, idx: SYM_NOTHING + SYM_OFF_X, name: 'S_nothing' },
    { range: SYM_OTH, idx: SYM_UNEXPLORED + SYM_OFF_X, name: 'S_unexplored' },
    { range: SYM_OTH, idx: SYM_BOULDER + SYM_OFF_X, name: 'S_boulder' },
    { range: SYM_OTH, idx: SYM_INVISIBLE + SYM_OFF_X, name: 'S_invisible' },
    { range: SYM_OTH, idx: SYM_PET_OVERRIDE + SYM_OFF_X, name: 'S_pet_override' },
    { range: SYM_OTH, idx: SYM_HERO_OVERRIDE + SYM_OFF_X, name: 'S_hero_override' },
];

/* C strncmpi(): case-insensitive compare of at most n characters */
function strncmpi(a, b, n) {
    for (let i = 0; i < n; i++) {
        const ca = i < a.length ? a[i].toLowerCase() : '',
              cb = i < b.length ? b[i].toLowerCase() : '';
        if (ca !== cb)
            return ca < cb ? -1 : 1;
        if (ca === '')
            return 0;
    }
    return 0;
}

/* src/symbols.c saved_symbols — the SYMBOLS= lines as typed, for the
   options dump */
let saved_symbols = [];

// src/symbols.c:712 savedsym_free()
export function savedsym_free() {
    saved_symbols = [];
}

// src/symbols.c:726 savedsym_find()
function savedsym_find(name, which_set) {
    for (const tmp of saved_symbols)
        if (which_set === tmp.which_set && name === tmp.name)
            return tmp;
    return null;
}

// src/symbols.c:739 savedsym_add()
function savedsym_add(name, val, which_set) {
    let tmp;

    if ((tmp = savedsym_find(name, which_set)) != null) {
        tmp.val = val;
    } else {
        tmp = { name, val, which_set };
        saved_symbols.unshift(tmp);
    }
}

// src/symbols.c:757 savedsym_strbuf()
export function savedsym_strbuf() {
    let sbuf = '';

    for (const tmp of saved_symbols)
        sbuf += `${(tmp.which_set === ROGUESET) ? 'ROGUE' : ''}SYMBOLS=${
                 tmp.name}:${tmp.val}\n`;
    return sbuf;
}

// src/options.c:9302 escapes() — expand \NNN, \oNNN, \xNN, ^X, \M and the
// C-style character escapes of an option value
export function escapes(cp) {
    const oct = '01234567', dec = '0123456789';
    /* hexdd[] is defined in decl.c */
    const hexdd = '00112233445566778899aAbBcCdDeEfF';
    let tp = '', i = 0;
    let cval, meta, dcount, dp;

    while (i < cp.length) {
        /* \M has to be followed by something to do meta conversion,
           otherwise it will just be \M which ultimately yields 'M' */
        meta = (cp[i] === '\\' && (cp[i + 1] === 'm' || cp[i + 1] === 'M')
                && cp[i + 2] !== undefined);
        if (meta)
            i += 2;

        cval = dcount = 0; /* for decimal, octal, hexadecimal cases */
        if ((cp[i] !== '\\' && cp[i] !== '^') || cp[i + 1] === undefined) {
            /* simple character, or nothing left for \ or ^ to escape */
            cval = cp.charCodeAt(i++);
        } else if (cp[i] === '^') { /* expand control-character syntax */
            cval = (cp.charCodeAt(++i) & 0x1f);
            ++i;

        /* remaining cases are all for backslash; we know cp[1] is not \0 */
        } else if (dec.includes(cp[i + 1])) {
            ++i; /* move past backslash to first digit */
            do {
                cval = (cval * 10) + (cp.charCodeAt(i) - 48);
            } while (cp[++i] !== undefined && dec.includes(cp[i]) && ++dcount < 3);
        } else if ((cp[i + 1] === 'o' || cp[i + 1] === 'O') && cp[i + 2] !== undefined
                   && oct.includes(cp[i + 2])) {
            i += 2; /* move past backslash and 'O' */
            do {
                cval = (cval * 8) + (cp.charCodeAt(i) - 48);
            } while (cp[++i] !== undefined && oct.includes(cp[i]) && ++dcount < 3);
        } else if ((cp[i + 1] === 'x' || cp[i + 1] === 'X') && cp[i + 2] !== undefined
                   && (dp = hexdd.indexOf(cp[i + 2])) >= 0) {
            i += 2; /* move past backslash and 'X' */
            do {
                cval = (cval * 16) + Math.trunc(dp / 2);
            } while (cp[++i] !== undefined && (dp = hexdd.indexOf(cp[i])) >= 0
                     && ++dcount < 2);
        } else { /* C-style character escapes */
            switch (cp[++i]) {
            case '\\':
                cval = '\\'.charCodeAt(0);
                break;
            case 'n':
                cval = '\n'.charCodeAt(0);
                break;
            case 't':
                cval = '\t'.charCodeAt(0);
                break;
            case 'b':
                cval = '\b'.charCodeAt(0);
                break;
            case 'r':
                cval = '\r'.charCodeAt(0);
                break;
            default:
                cval = cp.charCodeAt(i);
            }
            ++i;
        }

        if (meta)
            cval |= 0x80;
        tp += String.fromCharCode(cval & 0xff); /* (char) cval */
    }
    return tp;
}

// src/options.c:9385 sym_val() — the character code an option value names
export function sym_val(strval) {
    const QBUFSZ = 128;
    let buf = '', tmp; /* to hold truncated copy of 'strval' */

    if (strval[0] === undefined || strval[1] === undefined) { /* empty, or single character */
        /* if single char is space or tab, leave buf[0]=='\0' */
        if (strval[0] !== undefined && !' \t\n\v\f\r'.includes(strval[0]))
            buf = strval[0];
    } else if (strval[0] === "'") { /* single quote */
        /* simple matching single quote; we know strval[1] isn't '\0' */
        if (strval[2] === "'" && strval[3] === undefined) {
            /* accepts '\' as backslash and ''' as single quote */
            buf = strval[1];

        /* if backslash, handle single or double quote or second backslash */
        } else if (strval[1] === '\\' && strval[2] !== undefined && strval[3] === "'"
                   && "'\"\\".includes(strval[2]) && strval[4] === undefined) {
            buf = strval[2];

        /* not simple quote or basic backslash;
           strip closing quote and let escapes() deal with it */
        } else {
            let p;

            /* +1: skip opening single quote */
            tmp = strval.slice(1, 1 + QBUFSZ - 1);
            if ((p = tmp.lastIndexOf("'")) >= 0) {
                tmp = tmp.slice(0, p);
                buf = escapes(tmp);
            } /* else buf[0] stays '\0' */
        }
    } else { /* not lone char nor single quote */
        tmp = strval.slice(0, QBUFSZ - 1);
        buf = escapes(tmp);
    }

    return buf.length ? buf.charCodeAt(0) : 0;
}

/* C strings inside a mutable buffer: the text from index i to its NUL */
function cstr(buf, i) {
    let e = i;
    while (buf[e] !== '\0')
        e++;
    return buf.slice(i, e).join('');
}

// src/symbols.c:773 parsesymbols() — record "S_name:value" overrides. C
// splits the option text in place with NUL bytes; the same buffer model is
// kept so a comma-separated list parses in the same order.
export function parsesymbols(opts, which_set) {
    const buf = Array.from(String(opts));

    buf.push('\0');
    return parsesymbols_buf(buf, 0, which_set);
}

function parsesymbols_buf(buf, opts, which_set) {
    let val;
    let symname, strval, ch, first_unquoted_comma = -1, first_unquoted_colon = -1;
    let symp;
    let is_glyph = false;

    /* are there any commas or colons that aren't quoted? */
    for (ch = opts + 1; buf[ch] !== '\0'; ++ch) {
        const prech = ch - 1, postch = ch + 1;

        if (buf[postch] === '\0')
            break;
        if (buf[ch] === ',') {
            if (buf[prech] === "'" && buf[postch] === "'")
                continue;
            if (buf[prech] === '\\')
                continue;
        }
        if (buf[ch] === ':') {
            if (buf[prech] === "'" && buf[postch] === "'")
                continue;
        }
        if (buf[ch] === ',' && first_unquoted_comma < 0)
            first_unquoted_comma = ch;
        if (buf[ch] === ':' && first_unquoted_colon < 0)
            first_unquoted_colon = ch;
    }
    if (first_unquoted_comma >= 0) {
        buf[first_unquoted_comma++] = '\0';
        if (!parsesymbols_buf(buf, first_unquoted_comma, which_set))
            return false;
    }

    /* S_sample:string */
    symname = opts;
    strval = first_unquoted_colon;
    if (strval < 0) {
        const eq = cstr(buf, opts).indexOf('=');
        strval = (eq >= 0) ? opts + eq : -1;
    }
    if (strval < 0)
        return false;
    buf[strval++] = '\0';

    /* strip leading and trailing white space from symname and strval */
    const symname_s = mungspaces(cstr(buf, symname));
    const strval_s = mungspaces(cstr(buf, strval));

    symp = match_sym(symname_s);
    if (!symp && symname_s[0] === 'G' && symname_s[1] === '_') {
        /* match_glyph() (src/glyphs.c) accepts a customised glyph name */
        note_unported_symbols('parsesymbols:match_glyph');
        is_glyph = true;
    }
    if (!symp && !is_glyph)
        return false;
    if (symp) {
        if (symp.range && symp.range !== SYM_CONTROL) {
            if (gs_symset[which_set]?.handling === H_UTF8
                || (strval_s[0]?.toLowerCase() === 'u' && strval_s[1] === '+')) {
                /* glyphrep_to_custom_map_entries() (src/glyphs.c) */
                note_unported_symbols('parsesymbols:glyphrep_to_custom_map_entries');
            } else {
                val = sym_val(strval_s);
                if (which_set === ROGUESET)
                    update_ov_rogue_symset(symp, val);
                else
                    update_ov_primary_symset(symp, val);
            }
        }
    }
    savedsym_add(symname_s, strval_s, which_set);
    return true;
}

// src/symbols.c:852 match_sym() — the loadsyms[] entry an "S_..." name selects
export function match_sym(buf) {
    const alternates = [
        ['S_armour', 'S_armor'],
        /* alt explosion names are numbered in phone key/button layout */
        ['S_explode1', 'S_expl_tl'],
        ['S_explode2', 'S_expl_tc'], ['S_explode3', 'S_expl_tr'],
        ['S_explode4', 'S_expl_ml'], ['S_explode5', 'S_expl_mc'],
        ['S_explode6', 'S_expl_mr'], ['S_explode7', 'S_expl_bl'],
        ['S_explode8', 'S_expl_bc'], ['S_explode9', 'S_expl_br'],
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
    for (const sp of loadsyms) {
        if ((len >= sp.name.length) && !strncmpi(buf, sp.name, len))
            return sp;
    }
    for (const alt of alternates) {
        if ((len >= alt[0].length) && !strncmpi(buf, alt[0], len)) {
            for (const sp of loadsyms)
                if (alt[1] === sp.name)
                    return sp;
        }
    }
    return null;
}

/* win/tty/wintty.c g_putch(): under DEC handling a symbol with the high bit
   set is drawn from the line-drawing charset; the table keeps the base
   character and a flag, the way defsyms[] does */
function symbol_from_code(code, handling) {
    if (handling === H_DEC && (code & 0x80))
        return { ch: String.fromCharCode(code & 0x7f), dec: true };
    return { ch: String.fromCharCode(code), dec: false };
}

/* the object class, monster class and "other" halves of gs.showsyms[]:
   the defaults from src/drawing.c, or the SYMBOLS= override */
function fill_class_tables(handling, nondefault) {
    const ov = go_ov_primary_syms;
    const pick = (i, dflt) => {
        const code = nondefault ? ov[i] : 0;
        if (!code)
            return dflt;
        if (handling === H_DEC && (code & 0x80))
            note_unported_symbols('class symbol drawn from the DEC charset');
        return String.fromCharCode(code);
    };
    gs_showsyms.O = def_oc_syms.map((s, i) => pick(SYM_OFF_O + i, s));
    gs_showsyms.M = def_monsyms.map((s, i) => pick(SYM_OFF_M + i, s));
    gs_showsyms.X = [];
    for (let i = 0; i < MAXOTHER; i++) {
        const code = get_othersym(i, PRIMARYSET);
        gs_showsyms.X[i] = code ? String.fromCharCode(code) : '';
    }
}

/* gs.showsyms[SYM_OFF_O + oclass], gs.showsyms[SYM_OFF_M + mlet] and
   gs.showsyms[SYM_OFF_X + idx] as src/display.c map_glyphinfo() reads them */
export function showsym_oc(oclass) {
    return gs_showsyms.O ? gs_showsyms.O[oclass] : def_oc_syms[oclass];
}
export function showsym_mon(mlet) {
    return gs_showsyms.M ? gs_showsyms.M[mlet] : def_monsyms[mlet];
}
export function showsym_other(idx) {
    return gs_showsyms.X ? gs_showsyms.X[idx]
                         : String.fromCharCode(get_othersym(idx, PRIMARYSET));
}

// src/symbols.c:253 switch_symbols() — nondefault: the loaded set with the
// overrides on top; otherwise the built-in defaults
export function switch_symbols(nondefault) {
    if (nondefault) {
        assign_graphics(gs_symset[PRIMARYSET]?.name || null);
    } else {
        init_showsyms();
        fill_class_tables(H_UNK, false);
    }
}

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
    /* src/symbols.c:238 — a SYMBOLS= override replaces the set's symbol:
       showsyms[i] = ov_primary_syms[i] ? ov_primary_syms[i] : primary_syms[i] */
    const set_handling = (primary_symsets.find(s => s.name === name) || {}).handling ?? H_UNK;
    for (let i = 0; i < MAXPCHARS; i++)
        if (go_ov_primary_syms[SYM_OFF_P + i])
            gs_showsyms.P[i] = symbol_from_code(go_ov_primary_syms[SYM_OFF_P + i],
                                                set_handling);
    fill_class_tables(set_handling, true);
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
