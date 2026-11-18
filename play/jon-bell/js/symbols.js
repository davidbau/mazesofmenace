// js/symbols.js
//
// Ported functions from nethack-c/src/symbols.c.

import { game } from './gstate.js';
import { dec_mode, reset_glyphmap } from './display.js';
import { lowc, mungspaces, fuzzymatch } from './hacklib.js';
import { gs, SYM_CONTROL, SYM_PCHAR, SYM_OC, SYM_MON, SYM_OTH, H_UTF8 } from './const.js';
import { escapes } from './options.js';
import { TtyMenu, PICK_ONE, ATR_NONE } from './tty_menu.js';
import { pline } from './pline.js';
import { dat_content } from './dat_source.js';
import { match_glyph as match_glyph_real,
         glyphrep_to_custom_map_entries as glyphrep_to_custom_map_entries_real,
         glyphmap, purge_custom_entries, clear_all_glyphmap_colors, apply_customizations, glyphid_cache_status, fill_glyphid_cache, free_glyphid_cache } from './glyphs.js';
import { H_UNK, WC2_U_UTF8STR, Is_rogue_level } from './const.js';
import { config_error_add } from './cfgfiles.js';
import { free_all_glyphmap_u, unicode_val } from './utf8map.js';

/* C symbols.c:85-318. All symbol tables contain SYMF_MAX (196) nhsym
 * entries, including the six miscellaneous symbols after the warnings. */
export function init_symbols() {
    init_ov_primary_symbols();
    init_ov_rogue_symbols();
    init_primary_symbols();
    init_showsyms();
    init_rogue_symbols();
}

export function init_ov_primary_symbols() {
    const { go } = ensure_sym_arrays();
    go.ov_primary_syms.fill(0);
}

export function init_ov_rogue_symbols() {
    const { go } = ensure_sym_arrays();
    go.ov_rogue_syms.fill(0);
}

export function get_othersym(idx, which_set) {
    const { go, gp, gr } = ensure_sym_arrays();
    const oidx = idx + SYMF_OFF_X;
    let sym = which_set === 1
        ? (go.ov_rogue_syms[oidx] || gr.rogue_syms[oidx])
        : (go.ov_primary_syms[oidx] || gp.primary_syms[oidx]);
    if (!sym) {
        switch (idx) {
        case 0: case 1: sym = 32; break; // DEF_NOTHING
        case 2: sym = DEF_OC_SYM.charCodeAt(14); break; // ROCK_CLASS
        case 3: sym = 73; break; // DEF_INVISIBLE
        }
    }
    return sym;
}

function init_default_symbols(symbols, which_set) {
    for (let i = 0; i < 105; i++) symbols[i] = DEFSYMS_SYM.charCodeAt(i);
    for (let i = 0; i < 18; i++) symbols[i + SYMF_OFF_O] = DEF_OC_SYM.charCodeAt(i);
    for (let i = 0; i < 61; i++) symbols[i + SYMF_OFF_M] = DEF_MON_SYM.charCodeAt(i);
    for (let i = 0; i < 6; i++) symbols[i + SYMF_OFF_W] = 48 + i;
    for (let i = 0; i < 6; i++) symbols[i + SYMF_OFF_X] = get_othersym(i, which_set);
}

export function init_primary_symbols() {
    const { gp } = ensure_sym_arrays();
    gp.primary_utf8 = {};
    init_default_symbols(gp.primary_syms, 0);
    clear_symsetentry(0, false);
}

export function init_showsyms() {
    const { gs } = ensure_sym_arrays();
    init_default_symbols(gs.showsyms, 0);
}

export function switch_symbols(nondefault) {
    const { go, gp, gs } = ensure_sym_arrays();
    if (nondefault) {
        for (let i = 0; i < SYMF_MAX; i++)
            gs.showsyms[i] = go.ov_primary_syms[i] || gp.primary_syms[i];
        // The tty DEC/UTF8 callbacks initialize terminal capabilities. The
        // renderer resolves those modes from symset[].handling for each cell.
    } else {
        init_primary_symbols();
        init_showsyms();
    }
}

export function assign_graphics(whichset) {
    const { go, gp, gr, gs } = ensure_sym_arrays();
    const rogue = whichset === 1;
    const overrides = rogue ? go.ov_rogue_syms : go.ov_primary_syms;
    const symbols = rogue ? gr.rogue_syms : gp.primary_syms;
    for (let i = 0; i < SYMF_MAX; i++)
        gs.showsyms[i] = overrides[i] || symbols[i];
    (game.gc ||= {}).currentgraphics = rogue ? 1 : 0;
    reset_glyphmap(gm_symchange);
}

const gm_symchange = 4; // C display.h: glyphmap_change_triggers

export function update_ov_primary_symset(symp, val) {
    ensure_sym_arrays().go.ov_primary_syms[symp.idx] = val;
}
export function update_ov_rogue_symset(symp, val) {
    ensure_sym_arrays().go.ov_rogue_syms[symp.idx] = val;
}
export function update_primary_symset(symp, val) {
    ensure_sym_arrays().gp.primary_syms[symp.idx] = val;
}
export function update_rogue_symset(symp, val) {
    ensure_sym_arrays().gr.rogue_syms[symp.idx] = val;
}

/* C symbols.c:319-349: discard the old set's attributes and customizations. */
export function clear_symsetentry(which_set, name_too) {
    const set = gs_symset(which_set);
    const old_handling = set.handling;
    set.desc = null;
    set.handling = H_UNK;
    set.nocolor = set.primary = set.rogue = 0;
    if (name_too) set.name = null;
    const other_set = which_set === 0 ? 1 : 0;
    if (old_handling === H_UTF8 && gs_symset(other_set).handling !== H_UTF8)
        free_all_glyphmap_u();
    purge_custom_entries(which_set);
    if (which_set === 0) game._pendingSUtf8 = new Map();
    clear_all_glyphmap_colors();
}

/* C symbols.c:187-215: Rogue defaults, including its object classes. */
export function init_rogue_symbols() {
    const { gr } = ensure_sym_arrays();
    init_default_symbols(gr.rogue_syms, 1);
    gr.rogue_syms[12] = gr.rogue_syms[13] = gr.rogue_syms[14] = 43;
    gr.rogue_syms[25] = gr.rogue_syms[26] = 37;
    const objects = '\0])]=,(:!?+/**`0_.';
    for (let i = 0; i < 18; i++)
        gr.rogue_syms[i + SYMF_OFF_O] = objects.charCodeAt(i);
    clear_symsetentry(1, false);
    gs_symset(1).nocolor = 1;
}

/* C symbols.c:712-770. saved_symbols belongs to the process, not a level. */
export function savedsym_free() {
    let tmp = game.gg?.saved_symbols;
    while (tmp) tmp = tmp.next;
    // C frees the nodes at shutdown without resetting the global head.
    // JS releases their storage when the process/game itself is discarded.
}

export function savedsym_find(name, which_set) {
    for (let tmp = game.gg?.saved_symbols; tmp; tmp = tmp.next)
        if (which_set === tmp.which_set && name === tmp.name) return tmp;
    return null;
}

export function savedsym_add(name, val, which_set) {
    const gg = game.gg ||= {};
    const tmp = savedsym_find(name, which_set);
    if (tmp) tmp.val = val;
    else gg.saved_symbols = { name, val, which_set, next: gg.saved_symbols || null };
}

export function savedsym_strbuf(sbuf) {
    for (let tmp = game.gg?.saved_symbols; tmp; tmp = tmp.next)
        sbuf.str = (sbuf.str || '') + `${tmp.which_set === 1 ? 'ROGUE' : ''}SYMBOLS=${tmp.name}:${tmp.val}\n`;
}

export function free_symsets() {
    const PRIMARYSET = 0;
    const ROGUESET = 1;
    clear_symsetentry(PRIMARYSET, true);
    clear_symsetentry(ROGUESET, true);
}

/* C symbols.c:773-849. Recursion modifies one shared buffer. In
 * particular, a colon found beyond the first comma remains a pointer into
 * the recursively modified tail; do not re-split independent JS strings. */
export function parsesymbols(opts, which_set, onSymbol = null) {
    const holder = typeof opts === 'object' ? opts : null;
    const chars = [...String(holder ? holder.value : opts), '\0'];
    const str = pos => {
        let end = pos;
        while (chars[end] && chars[end] !== '\0') ++end;
        return chars.slice(pos, end).join('');
    };
    const munge = pos => {
        const value = mungspaces(str(pos));
        for (let i = 0; i < value.length; ++i) chars[pos + i] = value[i];
        chars[pos + value.length] = '\0';
        return value;
    };
    const parse = start => {
        let comma = -1, colon = -1;
        for (let ch = start + 1; chars[ch] && chars[ch] !== '\0'; ++ch) {
            const pre = chars[ch - 1], post = chars[ch + 1];
            if (!post || post === '\0') break;
            if (chars[ch] === ',') {
                if (pre === "'" && post === "'") continue;
                if (pre === '\\') continue;
            }
            if (chars[ch] === ':' && pre === "'" && post === "'") continue;
            if (chars[ch] === ',' && comma === -1) comma = ch;
            if (chars[ch] === ':' && colon === -1) colon = ch;
        }
        if (comma !== -1) {
            chars[comma] = '\0';
            if (!parse(comma + 1)) return false;
        }
        let sep = colon;
        if (sep === -1) {
            const offset = str(start).indexOf('=');
            if (offset !== -1) sep = start + offset;
        }
        if (sep === -1) return false;
        chars[sep] = '\0';
        const symname = munge(start), val = munge(sep + 1);
        const symp = match_sym(symname);
        let is_glyph = false;
        if (!symp && symname[0] === 'G' && symname[1] === '_')
            is_glyph = match_glyph_real(symname);
        if (!symp && !is_glyph) return false;
        if (symp && symp.range && symp.range !== SYM_CONTROL) {
            if (gs_symset(which_set).handling === H_UTF8
                || (lowc(val[0] || '\0') === 'u' && val[1] === '+'))
                glyphrep_to_custom_map_entries_real(`${symname}:${val}`.slice(0, 255), { value: 0 });
            else {
                const value = sym_val_real(val);
                if (which_set === 1) update_ov_rogue_symset(symp, value);
                else update_ov_primary_symset(symp, value);
            }
        }
        // C's G_ case only validates and saves; it does not customize here.
        savedsym_add(symname, val, which_set);
        if (onSymbol) onSymbol(symp, symname, val);
        return true;
    };
    const result = parse(0);
    if (holder) holder.value = str(0);
    return result;
}

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
export const LOADSYMS = (() => {
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
export function match_sym(buf) {
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
        if (len >= alt.length && alt.toLowerCase().startsWith(key)) {
            const sp = LOADSYMS.find((s) => s.name === nm);
            /* symbols.c:894 case-sensitive strcmp on the canonical name */
            if (sp)
                return sp;
            /* symbols.c:894 F-arm: the inner while exhausted without the
             * canonical name, so C falls through to the NEXT alternate
             * instead of failing here (needs a name absent from loadsyms) */
        }
    return null;
}

/* options.c:9385 sym_val() — the first byte of the unescaped value */
export function sym_val_real(strval) {
    // C examines bytes, including literal UTF-8 in a config directive.
    strval = String.fromCharCode(...new TextEncoder().encode(strval));
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
            const tmp = strval.slice(1, 128); // QBUFSZ - 1 bytes
            const p = tmp.lastIndexOf('\'');
            if (p >= 0)
                buf = escapes(tmp.slice(0, p));
        }
    } else {
        buf = escapes(strval.slice(0, 127));
    }
    return buf ? (buf.charCodeAt(0) & 0xff) : 0;
}

function ensure_sym_arrays() {
    const gp = game.gp ||= {};
    const gr = game.gr ||= {};
    const go = game.go ||= {};
    const display = game.gs ||= {};
    // The port also exposes decl.c's symset[] through const.js.
    display.symset = gs.symset;
    gs.showsyms = display.showsyms;
    for (const [owner, name] of [[gp, 'primary_syms'], [gr, 'rogue_syms'],
        [go, 'ov_primary_syms'], [go, 'ov_rogue_syms'], [display, 'showsyms']]) {
        if (!Array.isArray(owner[name])) owner[name] = [];
        for (let i = owner[name].length; i < SYMF_MAX; i++) owner[name][i] = 0;
    }
    gs.showsyms = display.showsyms;
    return { gp, gr, go, gs: display };
}

/* C symbols.c:431-654. A missing name builds the linked picker list;
 * otherwise start/finish delimit the requested set within the shared file. */
export function proc_symset_line(buf) {
    return !parse_sym_line(buf, gs.symset_which_set);
}

export function parse_sym_line(line, which_set, st = null) {
    const gc = game.gc ||= {};
    if (!st) st = {
        get start() { return gc.chosen_symset_start; },
        set start(v) { gc.chosen_symset_start = v; },
        get end() { return gc.chosen_symset_end; },
        set end(v) { gc.chosen_symset_end = v; },
    };
    let buf = mungspaces(line.slice(0, 255));
    const hash = buf.lastIndexOf('#');
    if (hash > 0 && buf[hash - 1] === ' ') buf = buf.slice(0, hash - 1);
    let bp = buf.indexOf('=');
    const altp = buf.indexOf(':');
    if (bp < 0 || (altp >= 0 && altp < bp)) bp = altp;
    if (bp < 0) {
        if (buf.slice(0, 6).toLowerCase() === 'finish') {
            if (st.start) st.end = true;
            st.start = false;
            return 1;
        }
        config_error_add('No "finish"');
        return 0;
    }
    let val = buf.slice(bp + 1);
    if (val[0] === ' ') val = val.slice(1);
    const symp = match_sym(buf);
    let is_glyph = false;
    if (!symp && buf[0] === 'G' && buf[1] === '_')
        is_glyph = st.start ? match_glyph_real(buf) : true;
    if (!symp && !is_glyph) {
        config_error_add('Unknown sym keyword');
        return 0;
    }
    const set = gs_symset(which_set);
    if (symp) {
        if (set.name == null) {
            if (symp.range === SYM_CONTROL) {
                let last = gs.symset_list;
                while (last?.next) last = last.next;
                switch (symp.idx) {
                case 0: {
                    const entry = { next: null, idx: gs.symset_count++, name: val,
                        desc: null, handling: H_UNK, nocolor: 0, primary: 0, rogue: 0 };
                    if (last) last.next = entry;
                    else gs.symset_list = entry;
                    break;
                }
                case 2:
                    for (let i = 0; i < KNOWN_HANDLING.length; i++)
                        if (strcmpi(KNOWN_HANDLING[i], val)) {
                            if (last) last.handling = i;
                            break;
                        }
                    break;
                case 3:
                    if (last && last.desc === null) last.desc = val;
                    break;
                case 5:
                    for (const restriction of ['primary', 'rogue'])
                        if (strcmpi(restriction, val)) {
                            if (last) last[restriction] = 1;
                            break;
                        }
                    break;
                }
            }
            return 1;
        }
        if (symp.range === SYM_CONTROL) {
            switch (symp.idx) {
            case 0:
                if (strcmpi(val, set.name)) {
                    st.start = true;
                    if (which_set === 1) init_rogue_symbols();
                    else if (which_set === 0) init_primary_symbols();
                }
                break;
            case 1:
                if (st.start) st.end = true;
                st.start = false;
                break;
            case 2:
                if (st.start) set_symhandling(val, which_set);
                break;
            case 4:
                if (st.start) {
                    if (['true', 'yes', 'on'].some(v => strcmpi(v, val))) set.nocolor = 0;
                    else if (['false', 'no', 'off'].some(v => strcmpi(v, val))) set.nocolor = 1;
                }
                break;
            case 5:
                if (st.start)
                    for (const restriction of ['primary', 'rogue'])
                        if (strcmpi(restriction, val)) {
                            set[restriction] = 1;
                            break;
                        }
                break;
            }
        } else if (set.handling !== H_UTF8) {
            if (st.start) {
                const value = sym_val_real(val);
                if (which_set === 0) update_primary_symset(symp, value);
                else if (which_set === 1) update_rogue_symset(symp, value);
            }
        } else if (st.start) {
            glyphrep_to_custom_map_entries_real(buf, { value: 0 });
            // Preserve the display adapter's symbol-indexed Unicode view.
            const uval = unicode_val(val);
            if (which_set === 0 && uval && uval < 0x110000 && !(uval >= 0xd800 && uval < 0xe000))
                game.gp.primary_utf8[symp.idx] = uval;
        }
    } else if (st.start) {
        glyphrep_to_custom_map_entries_real(buf, { value: 0 });
        if (which_set === 0 && set.handling === H_UTF8) {
            const gsym = match_sym('S_' + buf.slice(2));
            const uval = unicode_val(val);
            if (gsym && gsym.range !== SYM_CONTROL && uval && uval < 0x110000
                && !(uval >= 0xd800 && uval < 0xe000))
                game.gp.primary_utf8[gsym.idx] = uval;
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

/* files.c:2631-2676: the bundled file is the sandbox's read-only source. */
export function read_symbol_file(which_set) {
    const set = gs_symset(which_set);
    set.explicitly = false;
    const text = dat_content('symbols');
    if (text === null || text === undefined) return 0;
    set.explicitly = true;
    const gc = game.gc ||= {};
    gc.chosen_symset_start = gc.chosen_symset_end = false;
    gs.symset_which_set = which_set;
    gs.symset_count = 0;
    for (const raw of text.split('\n')) {
        if (/^\s*(#|$)/.test(raw)) continue;
        proc_symset_line(raw.replace(/\r$/, ''));
    }
    if (!gc.chosen_symset_start && !gc.chosen_symset_end) {
        if (set.name != null && (fuzzymatch(set.name, 'Default symbols', ' -_', true)
            || strcmpi(set.name, 'default'))) clear_symsetentry(which_set, true);
        if (set.name != null) {
            set.explicitly = false;
            return 0;
        }
        return 1;
    }
    if (!gc.chosen_symset_end)
        config_error_add('Missing finish for symset "%s"', set.name || 'unknown');
    return 1;
}

/* C symbols.c:673-690. load_symset always switches the primary display,
 * including when the requested set was the Rogue set. */
export function load_symset(name, which_set) {
    clear_symsetentry(which_set, true);
    gs_symset(which_set).name = name;
    if (read_symbol_file(which_set)) {
        switch_symbols(true);
        apply_customizations(game.gc?.currentgraphics || 0, 3);
    } else {
        clear_symsetentry(which_set, true);
        return 0;
    }
    return 1;
}

/* symbols.c:236-239 showsyms[i] = ov_primary_syms[i] ? : primary_syms[i] */
export function primary_showsym(idx) {
    return game.gs?.showsyms?.[idx] ?? 0;
}

/* C symbols.c:224-226,629-635: retain the full Rogue symbol bytes for
 * pager comparisons, independently of what tty can paint. Missing entries
 * use init_rogue_symbols' defaults in the description class scanner. */
export function rogue_showsyms() {
    const { gr, go } = ensure_sym_arrays();
    return gr.rogue_syms.map((sym, i) => go.ov_rogue_syms[i] || sym);
}

/* glyphs.c:1160-1180 parse_id() is_S arm + glyph_find_core() (glyphs.c:216-258):
 * `glyph:S_<name>:U+NNNN` customizes every glyph of that cmap/objclass/monster
 * class.  The display here keys UTF8 on the symbol index, so record it as
 * parse_sym_line_real does for a G_<cmap> line.  The entry only lands in
 * glyphmap[].u when apply_customizations() runs (glyphs.c:530, from
 * reset_customsymbols() or initoptions), so hold it pending until then.
 * Returns whether S_ matched. */
export function customize_s_glyph_utf8(id, uval) {
    const sp = match_sym(id);
    if (!sp || sp.range === SYM_CONTROL || !/^S_/i.test(id)) return false;
    if (uval) (game._pendingSUtf8 ??= new Map()).set(sp.idx, uval);
    return true;
}
export function apply_pending_s_utf8() {
    if (gs_symset(0).handling === H_UTF8 && game.gp?.primary_utf8)
        for (const [idx, uval] of game._pendingSUtf8 ?? [])
            game.gp.primary_utf8[idx] = uval;
}

export function primary_unicode_symbol(idx) {
    return gs_symset(0).handling === H_UTF8 ? game.gp?.primary_utf8?.[idx] : 0;
}

export function symset_cell(sym, which_set = 0) {
    const handling = gs_symset(which_set).handling;
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

/* C symbols.c:657-670: table order is the sym.h handling enum. */
export function set_symhandling(handling, which_set) {
    const set = gs_symset(which_set);
    set.handling = H_UNK;
    for (let i = 0; i < KNOWN_HANDLING.length; i++) {
        if (strcmpi(KNOWN_HANDLING[i], handling)) {
            set.handling = i;
            return;
        }
    }
}

export function symset_is_compatible(handling, wincap2) {
    return !(handling === H_UTF8 && !(wincap2 & WC2_U_UTF8STR));
}

/* C symbols.c:909-1098. The optional second argument only controls the tty
 * overlay's retained status rows; it is supplied by the options window. */
export async function do_symset(rogueflag, preserveStatus = false) {
    const which_set = rogueflag ? 1 : 0;
    const set = gs_symset(which_set);
    const name = set.name;
    gs.symset_list = null;
    set.name = null;
    const res = read_symbol_file(which_set);
    set.name = name;
    let ready_to_switch = false, nothing_to_do = false;
    let chosen = -2, defindx = 0;
    if (res && gs.symset_list) {
        const available = [];
        let biggest = 'Default Symbols'.length;
        for (let sl = gs.symset_list; sl; sl = sl.next) {
            if (rogueflag ? sl.primary : sl.rogue) continue;
            if (sl.handling === 4) continue; // no MAC_GRAPHICS_ENV in tty build
            available.push(sl);
            biggest = Math.max(biggest, sl.name?.length || 0);
        }
        if (!available.length) {
            await pline('There are no appropriate %s symbol sets available.',
                rogueflag ? 'rogue level' : 'primary');
            return true;
        }
        const menu = new TtyMenu({ overlay: true,
            statusClipCol: preserveStatus ? undefined : 0 });
        if (name == null) defindx = 1;
        menu.add_menu(1, 0, ATR_NONE, 'Default Symbols', false, defindx === 1);
        for (const sl of available) {
            if (sl.name !== null) {
                const id = sl.idx + 2;
                if (name != null && strcmpi(sl.name, name)) defindx = id;
                menu.add_menu(id, 0, ATR_NONE,
                    sl.name.padEnd(biggest + 2) + ' ' + (sl.desc || ''),
                    false, id === defindx);
            }
        }
        menu.end_menu(`Select ${rogueflag ? 'rogue level ' : ''}symbol set:`);
        const { count, picks } = await menu.select_menu(PICK_ONE);
        if (count > 0) {
            chosen = picks[0];
            if (count === 2 && chosen === defindx) chosen = picks[1];
            chosen -= 2;
        } else if (count === 0 && defindx > 0) chosen = defindx - 2;
        if (chosen > -1) {
            let sl = gs.symset_list;
            while (sl && sl.idx !== chosen) sl = sl.next;
            if (sl) {
                const wasDec = dec_mode();
                clear_symsetentry(which_set, true);
                set.name = sl.name;
                ready_to_switch = true;
                // Tty rows retain their old charset until their window clears.
                if (wasDec && sl.handling !== 2) game._decStaleFrom = 0;
            }
        } else if (chosen === -1) clear_symsetentry(which_set, true);
        else nothing_to_do = true;
    } else if (!res) {
        await pline('Unable to access "symbols" file.');
        return true;
    } else if (!gs.symset_list) {
        await pline('There were no symbol sets found in "symbols".');
        return true;
    }
    gs.symset_list = null;
    if (nothing_to_do) return true;
    if (rogueflag) init_rogue_symbols();
    else init_primary_symbols();
    if (set.name != null) {
        if (!glyphid_cache_status()) fill_glyphid_cache();
        const ok = read_symbol_file(which_set);
        if (glyphid_cache_status()) free_glyphid_cache();
        if (ok) ready_to_switch = true;
        else {
            clear_symsetentry(which_set, true);
            return true;
        }
    }
    if (ready_to_switch) switch_symbols(true);
    if (Is_rogue_level(game.u?.uz)) {
        if (rogueflag) assign_graphics(1);
    } else if (!rogueflag) assign_graphics(0);
    apply_customizations(which_set, 3);
    // tty_preference_update("symset") has no action (wintty.c:540-639).
    if (!rogueflag) game._symsetLoaded = set.name;
    game._symsetDarkroomPending = true;
    return true;
}
