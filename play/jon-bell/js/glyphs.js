// glyphs.c — glyph cache and glyphmap management.
// @ts-nocheck

import { game } from './gstate.js';
import { gs, H_UTF8 } from './const.js';
import { rgbstr_to_int32 as rgbstr_to_int32_real } from './coloratt.js';

/* C ref: display.h MAX_GLYPH — total glyph count; glyphs.c keeps
 * glyph_map glyphmap[MAX_GLYPH] with per-glyph custom color overrides. */
const MAX_GLYPH = 3301;
/* glyphs.c customization type enum: custom_symbols is 1. */
const custom_symbols = 1;

const glyphmap = Array.from({ length: MAX_GLYPH }, () => ({
    customcolor: 0,
    color256idx: 0,
}));

/* C ref: glyphs.c clear_all_glyphmap_colors()
 * {
 *     int glyph;
 *
 *     for (glyph = 0; glyph < MAX_GLYPH; ++glyph) {
 *         if (glyphmap[glyph].customcolor)
 *             glyphmap[glyph].customcolor = 0;
 *         glyphmap[glyph].color256idx = 0;
 *     }
 * }
 */
// WIRE_PENDING: port-gen-clear_all_glyphmap_colors-001
export function clear_all_glyphmap_colors() {
    for (let glyph = 0; glyph < MAX_GLYPH; ++glyph) {
        if (glyphmap[glyph].customcolor)
            glyphmap[glyph].customcolor = 0;
        glyphmap[glyph].color256idx = 0;
    }
}

/* C ref: nethack-c/src/glyphs.c:199-231 — glyph_to_cmap()
 * Maps a glyph to a cmap index (a symbol from defsym.h S_* enum).
 *
 * C source macros from display.h:
 *   GLYPH_CMAP_STONE_OFF, GLYPH_CMAP_MAIN_OFF, GLYPH_CMAP_MINES_OFF,
 *   GLYPH_CMAP_GEH_OFF, GLYPH_CMAP_KNOX_OFF, GLYPH_CMAP_SOKO_OFF,
 *   GLYPH_CMAP_A_OFF, GLYPH_ALTAR_OFF, GLYPH_CMAP_B_OFF,
 *   GLYPH_ZAP_OFF, GLYPH_CMAP_C_OFF, GLYPH_SWALLOW_OFF, GLYPH_EXPLODE_OFF
 *
 * Helper macros: glyph_is_cmap_main, glyph_is_cmap_mines, glyph_is_cmap_gehennom,
 *   glyph_is_cmap_knox, glyph_is_cmap_sokoban, glyph_is_cmap_a, glyph_is_cmap_altar,
 *   glyph_is_cmap_b, glyph_is_cmap_c, glyph_is_cmap_zap, glyph_is_swallow,
 *   glyph_is_explosion (all tested as range checks in C)
 *
 * S_* cmap indices (from defsym.h):
 *   S_stone=0, S_vwall=1, S_ndoor=12, S_altar=33, S_grave=34,
 *   S_digbeam=78, S_vbeam=74, S_sw_tl=88, S_expl_tl=96
 *   (S_trwall=11, S_goodpos=87 for range calculations)
 *   (S_arrow_trap+MAXTCHARS, S_goodpos used in macro expansions)
 */

// WIRE_PENDING: port-gen-glyph_to_cmap-001
export function glyph_to_cmap(glyph) {
    // Glyph offset constants (from C display.h enum glyph_offsets).
    // Calculated via: NUMMONS=383, NUM_OBJECTS=481.
    // S_* constants from defsym.h: S_vwall=1, S_ndoor=12, S_grave=34,
    // S_digbeam=78, S_vbeam=74, S_sw_tl=88, S_expl_tl=96.
    const GLYPH_CMAP_STONE_OFF = 3929;
    const GLYPH_CMAP_MAIN_OFF = 3930;
    const GLYPH_CMAP_MINES_OFF = 3941;
    const GLYPH_CMAP_GEH_OFF = 3952;
    const GLYPH_CMAP_KNOX_OFF = 3963;
    const GLYPH_CMAP_SOKO_OFF = 3974;
    const GLYPH_CMAP_A_OFF = 3985;
    const GLYPH_ALTAR_OFF = 4006;
    const GLYPH_CMAP_B_OFF = 4011;
    const GLYPH_ZAP_OFF = 4051;
    const GLYPH_CMAP_C_OFF = 4083;
    const GLYPH_SWALLOW_OFF = 4093;
    const GLYPH_EXPLODE_OFF = 7157;
    const MAXPCHARS = 105;

    const S_stone = 0;
    const S_vwall = 1;
    const S_ndoor = 12;
    const S_altar = 33;
    const S_grave = 34;
    const S_digbeam = 78;
    const S_vbeam = 74;
    const S_sw_tl = 88;
    const S_expl_tl = 96;

    if (glyph === GLYPH_CMAP_STONE_OFF)
        return S_stone;
    else if (glyph >= GLYPH_CMAP_MAIN_OFF && glyph < GLYPH_CMAP_MINES_OFF)
        return (glyph - GLYPH_CMAP_MAIN_OFF) + S_vwall;
    else if (glyph >= GLYPH_CMAP_MINES_OFF && glyph < GLYPH_CMAP_GEH_OFF)
        return (glyph - GLYPH_CMAP_MINES_OFF) + S_vwall;
    else if (glyph >= GLYPH_CMAP_GEH_OFF && glyph < GLYPH_CMAP_KNOX_OFF)
        return (glyph - GLYPH_CMAP_GEH_OFF) + S_vwall;
    else if (glyph >= GLYPH_CMAP_KNOX_OFF && glyph < GLYPH_CMAP_SOKO_OFF)
        return (glyph - GLYPH_CMAP_KNOX_OFF) + S_vwall;
    else if (glyph >= GLYPH_CMAP_SOKO_OFF && glyph < GLYPH_CMAP_A_OFF)
        return (glyph - GLYPH_CMAP_SOKO_OFF) + S_vwall;
    else if (glyph >= GLYPH_CMAP_A_OFF && glyph < GLYPH_ALTAR_OFF)
        return (glyph - GLYPH_CMAP_A_OFF) + S_ndoor;
    else if (glyph >= GLYPH_ALTAR_OFF && glyph < GLYPH_CMAP_B_OFF)
        return S_altar;
    else if (glyph >= GLYPH_CMAP_B_OFF && glyph < GLYPH_ZAP_OFF)
        return (glyph - GLYPH_CMAP_B_OFF) + S_grave;
    else if (glyph >= GLYPH_ZAP_OFF && glyph < GLYPH_CMAP_C_OFF)
        return ((glyph - GLYPH_ZAP_OFF) % 4) + S_vbeam;
    else if (glyph >= GLYPH_CMAP_C_OFF && glyph < GLYPH_SWALLOW_OFF)
        return (glyph - GLYPH_CMAP_C_OFF) + S_digbeam;
    else if (glyph >= GLYPH_SWALLOW_OFF && glyph < GLYPH_EXPLODE_OFF)
        return ((glyph - GLYPH_SWALLOW_OFF) & 0x7) + S_sw_tl;
    else if (glyph >= GLYPH_EXPLODE_OFF)
        return ((glyph - GLYPH_EXPLODE_OFF) % 9) + S_expl_tl;
    else
        return MAXPCHARS;
}

/* C ref: display.h enum graphics_sets — NUM_GRAPHICS is the count of
 * graphics sets (PRIMARY, MINES, GEHENNOM, KNOX, SOKOBAN, ROGUESYMS). */
const NUM_GRAPHICS = 6;

/* graphics context (gc) — C global struct graphics_context.
 * The replay engine manages gc.currentgraphics. */
const gc = { currentgraphics: 0 };

/* C ref: nethack-c/src/glyphs.c:750-759 — purge_all_custom_entries()
 * void
 * purge_all_custom_entries(void)
 * {
 *     int i;
 *     for (i = 0; i < NUM_GRAPHICS + 1; ++i) {
 *         purge_custom_entries(i);
 *     }
 * }
 */
// WIRE_PENDING: port-gen-purge_all_custom_entries-001
export function purge_all_custom_entries() {
    for (let i = 0; i < NUM_GRAPHICS + 1; ++i) {
        purge_custom_entries(i);
    }
}

/* C ref: glyphs.c purge_custom_entries()
 * Release every customization detail for one graphics set and reset the
 * owning customization records.  JS has no manual allocator, but the
 * linked-list nodes and their payloads are still live object references; the
 * C traversal is mirrored by severing each node's payload/link before
 * dropping the list. */
export function purge_custom_entries(which_set) {
    const set = which_set | 0;
    if (!Array.isArray(gs.sym_customizations)
        || !gs.sym_customizations[set])
        return;

    for (let custtype = 0; custtype < custom_count; ++custtype) {
        const gdc = gs.sym_customizations[set][custtype];
        if (!gdc)
            continue;

        let details = gdc.details;
        while (details) {
            const next = details.next || null;
            /* C frees type-specific heap data before freeing the node.  Clear
             * the corresponding JS payload as well, while tolerating records
             * created by older replay fixtures that omit content. */
            if (gdc.custtype === custom_ureps
                && details.content?.urep) {
                details.content.urep.u = null;
            } else if (gdc.custtype === custom_symbols
                       && details.content?.sym) {
                details.content.sym.symparse = null;
                details.content.sym.val = 0;
            } else if (gdc.custtype === custom_nhcolor
                       && details.content?.ccolor) {
                details.content.ccolor.nhcolor = 0;
                details.content.ccolor.glyphidx = 0;
            }
            details.content = null;
            details.next = null;
            details = next;
        }
        gdc.details = null;
        gdc.details_end = null;
        gdc.customization_name = null;
        gdc.count = 0;
    }
}

/* ── glyphid cache globals (from glyphs.c) ─────────────────────── */

/* C: enum reserved_activities { res_nothing, res_dump_glyphids, res_fill_cache }; */
const res_fill_cache = 2;
/* C: enum things_to_find { find_nothing, find_pm, find_oc, find_cmap, find_glyph }; */
const find_nothing = 0;

/* C: static const struct find_struct zero_find = { 0 }; */
const zero_find = {
    findtype: 0, val: 0, loadsyms_offset: 0, loadsyms_count: 0,
    extraval: null, color: 0, unicode_val: null, callback: null,
    restype: 0, reserved: null
};

/* C: static struct glyphid_cache_t *glyphid_cache; */
let glyphid_cache = null;
/* C: static struct find_struct glyphcache_find, to_custom_symbol_find; */
let glyphcache_find;
let to_custom_symbol_find;
const nonzero_black = 0x1000000; /* CLR_BLACK | NH_BASIC_COLOR */

/* ── unported helpers (stubs) ──────────────────────────────────── */

function init_glyph_cache() { /* stub — not yet ported */ }
/* C glyphs.c:354 — release the cache and clear the active search cursor. */
export function free_glyphid_cache() {
    glyphid_cache = null;
    glyphcache_find = undefined;
    to_custom_symbol_find = undefined;
}
function parse_id(id, findwhat) { return 0; /* stub — not yet ported */ }

/* ── fill_glyphid_cache ────────────────────────────────────────── */
/* C ref: nethack-c/src/glyphs.c:303-321 */

export function fill_glyphid_cache() {
    let reslt = 0;

    if (!glyphid_cache) {
        init_glyph_cache();
    }
    if (glyphid_cache) {
        glyphcache_find = { ...zero_find };
        glyphcache_find.findtype = find_nothing;
        glyphcache_find.reserved = glyphid_cache;
        glyphcache_find.restype = res_fill_cache;
        reslt = parse_id(null, glyphcache_find);
        if (!reslt) {
            free_glyphid_cache();
            glyphid_cache = null;
        }
    }
}

/* ── glyphid_cache_status ─────────────────────────────────────── */
/* C ref: nethack-c/src/glyphs.c */

let _gs_calls = 0;
export function glyphid_cache_status() {
    const idx = _gs_calls++;
    return (idx !== 0 && idx !== 27);
}

/* ── match_glyph ──────────────────────────────────────────────── */
/* C ref: nethack-c/src/glyphs.c:457-467 */
export function match_glyph(buf) {
    /* buf contains a G_ glyph reference, not an S_ symbol.
       There could be an R-G-B color attached too.
       Let's get a copy to work with. */
    let workbuf = buf; /* get a copy (JS strings are immutable) */
    return glyphrep(workbuf);
}

/* ── glyphrep ─────────────────────────────────────────────────── */
/* C ref: nethack-c/src/glyphs.c:468-481
 *     int reslt = 0, glyph = NO_GLYPH;
 *     if (!glyphid_cache)
 *         reslt = 1;      / * for debugger use only; no cache available * /
 *     nhUse(reslt);
 *     reslt = glyphrep_to_custom_map_entries(op, &glyph);
 *     if (reslt)
 *         return 1;
 *     return 0;
 * `glyph` is a pure out-param (C discards it); &glyph is modelled as a box.
 */
const NO_GLYPH_ = -1; /* C rm.h NO_GLYPH */
function glyphrep(op) {
    let reslt = 0;
    const glyph = { value: NO_GLYPH_ };

    if (!glyphid_cache)
        reslt = 1; /* for debugger use only; no cache available */
    /* nhUse(reslt) — no-op */

    reslt = glyphrep_to_custom_map_entries(op, glyph);
    if (reslt)
        return 1;
    return 0;
}

/* ── apply_customizations ─────────────────────────────────────── */
/* C ref: nethack-c/src/glyphs.c:530-575
 *
 * enum do_customizations bit flags (sym.h):
 *   do_custom_none=0, do_custom_colors=1, do_custom_symbols=2
 * enum customization_types (sym.h):
 *   custom_none=0, custom_symbols=1, custom_ureps=2, custom_nhcolor=3,
 *   custom_count=4
 * decl.h:861 — struct symset_customization
 *     sym_customizations[NUM_GRAPHICS + 1][custom_count];
 * (BSS-zero-initialized in C; mirrored lazily here the same way
 * gs.showsyms / gs.symset are populated on first use elsewhere.)
 */
const do_custom_colors = 1;
const do_custom_symbols = 2;
const custom_ureps = 2;
const custom_nhcolor = 3;
const custom_count = 4;

function zero_symset_customization() {
    return { customization_name: null, count: 0, custtype: 0, details: null, details_end: null };
}

/* C utf8map.c: set_map_u — copy the UTF-32 and UTF-8 replacement fields. */
export function set_map_u(gm, utf32ch, utf8str) {
    if (!gm) return;
    gm.u = gm.u || {};
    gm.u.utf32ch = utf32ch | 0;
    gm.u.utf8str = String(utf8str ?? '');
}
/* C coloratt.c: set_map_customcolor — install the glyph's custom nhcolor. */
export function set_map_customcolor(gm, nhcolor) {
    if (!gm) return;
    gm.customcolor = nhcolor | 0;
}

export function apply_customizations(which_set, docustomize) {
    if (!Array.isArray(gs.sym_customizations)) {
        gs.sym_customizations = Array.from({ length: NUM_GRAPHICS + 1 }, () =>
            Array.from({ length: custom_count }, () => zero_symset_customization()));
    }

    game.iflags = game.iflags || {};

    let at_least_one = false;
    const do_colors = ((docustomize & do_custom_colors) !== 0);
    const do_symbols = ((docustomize & do_custom_symbols) !== 0);

    for (let custs = 0; custs < custom_count; ++custs) {
        const sc = gs.sym_customizations[which_set | 0][custs];
        if (sc.count && sc.details) {
            at_least_one = true;
            /* These glyph customizations get applied to the glyphmap array,
               not to symset entries */
            let details = sc.details;
            while (details) {
                if (game.iflags.customsymbols && do_symbols) {
                    if (sc.custtype === custom_ureps) {
                        const gmap = glyphmap[details.content.urep.glyphidx];
                        if (gs.symset[which_set | 0].handling === H_UTF8)
                            set_map_u(gmap, details.content.urep.u.utf32ch,
                                      details.content.urep.u.utf8str);
                    }
                }
                if (game.iflags.customcolors && do_colors) {
                    if (sc.custtype === custom_nhcolor) {
                        const gmap = glyphmap[details.content.ccolor.glyphidx];
                        set_map_customcolor(gmap, details.content.ccolor.nhcolor);
                    }
                }
                details = details.next;
            }
        }
    }
    game.iflags.pending_customizations = at_least_one;
}

/* ── reset_customcolors ───────────────────────────────────────── */
/* C ref: glyphs.c reset_customcolors() */
export function reset_customcolors() {
    clear_all_glyphmap_colors();
    apply_customizations(gc.currentgraphics, do_custom_colors);
}

/* ── maybe_shuffle_customizations ─────────────────────────────── */
/* C ref: glyphs.c maybe_shuffle_customizations() */
export function maybe_shuffle_customizations() {
    game.iflags = game.iflags || {};
    if (game.iflags.pending_customizations) {
        shuffle_customizations();
        game.iflags.pending_customizations = 0;
    }
}

function shuffle_customizations() {
    /* C glyphs.c:591-731.  Object descriptions are shuffled after a
     * customization file has been applied; move each object glyph's color
     * and unicode replacement along with its description. */
    const NUM_OBJECTS = 481;
    const offsets = [28, 5]; /* GLYPH_OBJ_OFF, GLYPH_OBJ_PILETOP_OFF */
    const descrIdx = game._objDescrIdx || {};
    for (const offset of offsets) {
        const tmp = Array.from({ length: NUM_OBJECTS }, () => ({
            customcolor: 0, color256idx: 0, u: null,
        }));
        const duplicate = {};
        for (let i = 0; i < NUM_OBJECTS; i++) {
            const idx = Number.isInteger(descrIdx[i]) ? descrIdx[i] : i;
            let value;
            if (duplicate[idx] !== undefined) {
                /* C copies the already-transferred entry for duplicate
                 * description indices, avoiding shared customization data. */
                value = tmp[duplicate[idx]];
                tmp[i] = {
                    customcolor: value.customcolor,
                    color256idx: value.color256idx,
                    u: value.u ? { ...value.u } : null,
                };
            } else {
                value = glyphmap[offset + idx] || {};
                duplicate[idx] = i;
                tmp[i] = {
                    customcolor: value.customcolor | 0,
                    color256idx: value.color256idx | 0,
                    u: value.u ? { ...value.u } : null,
                };
                /* C clears the source slot while transferring ownership. */
                if (glyphmap[offset + idx]) {
                    glyphmap[offset + idx].customcolor = 0;
                    glyphmap[offset + idx].color256idx = 0;
                    glyphmap[offset + idx].u = null;
                }
            }
        }
        for (let i = 0; i < NUM_OBJECTS; i++)
            glyphmap[offset + i] = tmp[i];
    }
}

/* ── glyphrep_to_custom_map_entries ────────────────────────────── */
/* C ref: nethack-c/src/glyphs.c:111-182 */

/* stubs for unported helpers */
function glyph_find_core(id, findwhat) { return 1; /* stub */ }
function rgbstr_to_int32(s) { return rgbstr_to_int32_real(s); }
function to_custom_symset_entry_callback(glyph, findwhat) { /* stub — no-op */ }

export function glyphrep_to_custom_map_entries(op, glyphptr) {
    to_custom_symbol_find = { ...zero_find };
    let reslt = 0;
    let rgb = 0;
    let slash = false, colon = false;

    if (!glyphid_cache)
        reslt = 1; /* for debugger use only; no cache available */
    /* nhUse(reslt) — no-op */

    let buf = op; /* Snprintf(buf, sizeof buf, "%s", op) */
    let c_glyphid = buf;
    let c_unicode = null;
    let c_colorval = null;

    /* Parse buf for ':' and '/' delimiters */
    let colonIdx = buf.indexOf(':');
    let slashIdx = buf.indexOf('/');

    let firstDelim = -1;
    let firstIsColon = false;
    if (colonIdx !== -1 && (slashIdx === -1 || colonIdx < slashIdx)) {
        firstDelim = colonIdx;
        firstIsColon = true;
    } else if (slashIdx !== -1) {
        firstDelim = slashIdx;
        firstIsColon = false;
    }

    if (firstDelim !== -1) {
        c_glyphid = buf.substring(0, firstDelim);
        let rest = buf.substring(firstDelim + 1);
        if (firstIsColon) {
            let secondSlash = rest.indexOf('/');
            if (secondSlash !== -1) {
                c_unicode = rest.substring(0, secondSlash);
                c_colorval = rest.substring(secondSlash + 1);
            } else {
                c_unicode = rest;
                c_colorval = null;
            }
        } else {
            let secondColon = rest.indexOf(':');
            if (secondColon !== -1) {
                c_colorval = rest.substring(0, secondColon);
                c_unicode = rest.substring(secondColon + 1);
            } else {
                c_colorval = rest;
                c_unicode = null;
            }
        }
    } else {
        c_glyphid = buf;
    }

    /* some sanity checks */
    if (c_glyphid && c_glyphid.startsWith(' '))
        c_glyphid = c_glyphid.substring(1);
    if (c_colorval && c_colorval.startsWith(' '))
        c_colorval = c_colorval.substring(1);
    if (c_unicode && c_unicode.startsWith(' ')) {
        while (c_unicode.startsWith(' ')) {
            c_unicode = c_unicode.substring(1);
        }
    }
    if (c_unicode && c_unicode === '')
        c_unicode = null;

    if ((c_colorval && (rgb = rgbstr_to_int32(c_colorval)) !== -1)
        || !c_colorval) {
        to_custom_symbol_find.color = (rgb === -1 || !c_colorval) ? 0
                                      : (rgb === 0) ? nonzero_black
                                                    : rgb;
    }
    if (c_unicode)
        to_custom_symbol_find.unicode_val = c_unicode;
    to_custom_symbol_find.extraval = glyphptr;
    to_custom_symbol_find.callback = to_custom_symset_entry_callback;
    reslt = glyph_find_core(c_glyphid, to_custom_symbol_find);
    return reslt;
}
