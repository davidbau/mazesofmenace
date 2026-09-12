// glyphs.js — glyph identifiers, the glyph-id cache and the symset
// customizations (custom colours and unicode representations).
// C ref: src/glyphs.c
//
// This port draws from {kind, ...} glyph records; the integer glyph
// numbering of include/display.h (const.js GLYPH_*_OFF) exists for what this
// file does: naming every glyph ("G_vwall_mines") so a symset or SYMBOLS=
// line can address one, and keeping the per-glyph customizations that
// display.c's glyphmap[] carries.

import { game } from './gstate.js';
import {
    MAX_GLYPH, NO_GLYPH, NUM_ZAP,
    GLYPH_MON_MALE_OFF, GLYPH_MON_FEM_OFF, GLYPH_PET_MALE_OFF, GLYPH_PET_FEM_OFF,
    GLYPH_INVIS_OFF, GLYPH_DETECT_MALE_OFF, GLYPH_DETECT_FEM_OFF, GLYPH_BODY_OFF,
    GLYPH_RIDDEN_MALE_OFF, GLYPH_RIDDEN_FEM_OFF, GLYPH_OBJ_OFF, GLYPH_CMAP_OFF,
    GLYPH_CMAP_STONE_OFF, GLYPH_CMAP_MAIN_OFF, GLYPH_CMAP_MINES_OFF,
    GLYPH_CMAP_GEH_OFF, GLYPH_CMAP_KNOX_OFF, GLYPH_CMAP_SOKO_OFF, GLYPH_CMAP_A_OFF,
    GLYPH_ALTAR_OFF, GLYPH_CMAP_B_OFF, GLYPH_ZAP_OFF, GLYPH_CMAP_C_OFF,
    GLYPH_SWALLOW_OFF, GLYPH_EXPLODE_OFF, GLYPH_EXPLODE_FROSTY_OFF,
    GLYPH_WARNING_OFF, GLYPH_STATUE_MALE_OFF, GLYPH_STATUE_FEM_OFF,
    GLYPH_OBJ_PILETOP_OFF, GLYPH_BODY_PILETOP_OFF, GLYPH_STATUE_MALE_PILETOP_OFF,
    GLYPH_STATUE_FEM_PILETOP_OFF, GLYPH_UNEXPLORED_OFF, GLYPH_NOTHING_OFF,
    MAXEXPCHARS, WARNCOUNT, NUM_GRAPHICS, PRIMARYSET,
    custom_none, custom_symbols, custom_ureps, custom_nhcolor, custom_count,
    do_custom_colors, do_custom_symbols, NH_BASIC_COLOR,
} from './const.js';
import { CLR_BLACK } from './terminal.js';
import { defsyms, cmap_names } from './drawing_data.js';
import { PMNAMES, NUMMONS } from './monst_data.js';
import { obj_descr, ONAMES, NUM_OBJECTS } from './objects_data.js';
import { rgbstr_to_int32, set_map_customcolor } from './coloratt.js';
import { config_error_add } from './options.js';
import { unicodeval_to_utf8str } from './hacklib.js';
import { glyphmap } from './display.js';
import { gs_symset, gs_symset_which_set, gc_currentgraphics, loadsyms,
         SYM_PCHAR, SYM_OC, SYM_MON, H_UTF8, MAXPCHARS } from './symbols.js';
import { unicode_val, set_map_u, add_custom_urep_entry } from './utf8map.js';

const S = cmap_names;

/* the include/display.h glyph tests over the integer numbering; this file is
   the only user of that numbering, so they live here rather than in
   display.js, whose same-named functions test the port's glyph records */
const glyph_is_normal_male_monster = g => g >= GLYPH_MON_MALE_OFF && g < GLYPH_MON_MALE_OFF + NUMMONS;
const glyph_is_normal_female_monster = g => g >= GLYPH_MON_FEM_OFF && g < GLYPH_MON_FEM_OFF + NUMMONS;
const glyph_is_female_pet = g => g >= GLYPH_PET_FEM_OFF && g < GLYPH_PET_FEM_OFF + NUMMONS;
const glyph_is_male_pet = g => g >= GLYPH_PET_MALE_OFF && g < GLYPH_PET_MALE_OFF + NUMMONS;
const glyph_is_ridden_female_monster = g => g >= GLYPH_RIDDEN_FEM_OFF && g < GLYPH_RIDDEN_FEM_OFF + NUMMONS;
const glyph_is_ridden_male_monster = g => g >= GLYPH_RIDDEN_MALE_OFF && g < GLYPH_RIDDEN_MALE_OFF + NUMMONS;
const glyph_is_detected_female_monster = g => g >= GLYPH_DETECT_FEM_OFF && g < GLYPH_DETECT_FEM_OFF + NUMMONS;
const glyph_is_detected_male_monster = g => g >= GLYPH_DETECT_MALE_OFF && g < GLYPH_DETECT_MALE_OFF + NUMMONS;
const glyph_is_monster = g => glyph_is_normal_male_monster(g) || glyph_is_normal_female_monster(g)
    || glyph_is_male_pet(g) || glyph_is_female_pet(g)
    || glyph_is_ridden_male_monster(g) || glyph_is_ridden_female_monster(g)
    || glyph_is_detected_male_monster(g) || glyph_is_detected_female_monster(g);
const glyph_to_mon = g =>
    glyph_is_normal_female_monster(g) ? g - GLYPH_MON_FEM_OFF
    : glyph_is_normal_male_monster(g) ? g - GLYPH_MON_MALE_OFF
    : glyph_is_female_pet(g) ? g - GLYPH_PET_FEM_OFF
    : glyph_is_male_pet(g) ? g - GLYPH_PET_MALE_OFF
    : glyph_is_detected_female_monster(g) ? g - GLYPH_DETECT_FEM_OFF
    : glyph_is_detected_male_monster(g) ? g - GLYPH_DETECT_MALE_OFF
    : glyph_is_ridden_female_monster(g) ? g - GLYPH_RIDDEN_FEM_OFF
    : glyph_is_ridden_male_monster(g) ? g - GLYPH_RIDDEN_MALE_OFF
    : NUMMONS;
const glyph_is_body_piletop = g => g >= GLYPH_BODY_PILETOP_OFF && g < GLYPH_BODY_PILETOP_OFF + NUMMONS;
const glyph_is_body = g => (g >= GLYPH_BODY_OFF && g < GLYPH_BODY_OFF + NUMMONS) || glyph_is_body_piletop(g);
const glyph_to_body_corpsenm = g => glyph_is_body_piletop(g) ? g - GLYPH_BODY_PILETOP_OFF : g - GLYPH_BODY_OFF;
const glyph_is_fem_statue_piletop = g => g >= GLYPH_STATUE_FEM_PILETOP_OFF && g < GLYPH_STATUE_FEM_PILETOP_OFF + NUMMONS;
const glyph_is_male_statue_piletop = g => g >= GLYPH_STATUE_MALE_PILETOP_OFF && g < GLYPH_STATUE_MALE_PILETOP_OFF + NUMMONS;
const glyph_is_fem_statue = g => (g >= GLYPH_STATUE_FEM_OFF && g < GLYPH_STATUE_FEM_OFF + NUMMONS) || glyph_is_fem_statue_piletop(g);
const glyph_is_male_statue = g => (g >= GLYPH_STATUE_MALE_OFF && g < GLYPH_STATUE_MALE_OFF + NUMMONS) || glyph_is_male_statue_piletop(g);
const glyph_is_statue = g => glyph_is_male_statue(g) || glyph_is_fem_statue(g);
const glyph_to_statue_corpsenm = g =>
    glyph_is_fem_statue_piletop(g) ? g - GLYPH_STATUE_FEM_PILETOP_OFF
    : glyph_is_male_statue_piletop(g) ? g - GLYPH_STATUE_MALE_PILETOP_OFF
    : glyph_is_fem_statue(g) ? g - GLYPH_STATUE_FEM_OFF
    : g - GLYPH_STATUE_MALE_OFF;
const glyph_is_normal_piletop_obj = g => g >= GLYPH_OBJ_PILETOP_OFF && g < GLYPH_OBJ_PILETOP_OFF + NUM_OBJECTS;
const glyph_is_normal_object = g => g >= GLYPH_OBJ_OFF && g < GLYPH_OBJ_OFF + NUM_OBJECTS;
const glyph_is_object = g => glyph_is_normal_object(g) || glyph_is_normal_piletop_obj(g);
const glyph_to_obj = g => glyph_is_normal_piletop_obj(g) ? g - GLYPH_OBJ_PILETOP_OFF : g - GLYPH_OBJ_OFF;
const walls = (S.S_trwall - S.S_vwall) + 1;
const glyph_is_cmap_main = g => g >= GLYPH_CMAP_MAIN_OFF && g < walls + GLYPH_CMAP_MAIN_OFF;
const glyph_is_cmap_mines = g => g >= GLYPH_CMAP_MINES_OFF && g < walls + GLYPH_CMAP_MINES_OFF;
const glyph_is_cmap_gehennom = g => g >= GLYPH_CMAP_GEH_OFF && g < walls + GLYPH_CMAP_GEH_OFF;
const glyph_is_cmap_knox = g => g >= GLYPH_CMAP_KNOX_OFF && g < walls + GLYPH_CMAP_KNOX_OFF;
const glyph_is_cmap_sokoban = g => g >= GLYPH_CMAP_SOKO_OFF && g < walls + GLYPH_CMAP_SOKO_OFF;
const glyph_is_cmap_a = g => g >= GLYPH_CMAP_A_OFF && g < ((S.S_brdnladder - S.S_ndoor) + 1) + GLYPH_CMAP_A_OFF;
const glyph_is_cmap_altar = g => g >= GLYPH_ALTAR_OFF && g < 5 + GLYPH_ALTAR_OFF;
const glyph_is_cmap_b = g => g >= GLYPH_CMAP_B_OFF && g < GLYPH_ZAP_OFF;
const glyph_is_cmap_zap = g => g >= GLYPH_ZAP_OFF && g < (NUM_ZAP << 2) + GLYPH_ZAP_OFF;
const glyph_is_cmap_c = g => g >= GLYPH_CMAP_C_OFF && g < ((S.S_goodpos - S.S_digbeam) + 1) + GLYPH_CMAP_C_OFF;
const glyph_is_swallow = g => g >= GLYPH_SWALLOW_OFF && g < (NUMMONS << 3) + GLYPH_SWALLOW_OFF;
const glyph_is_explosion = g => g >= GLYPH_EXPLODE_OFF && g < MAXEXPCHARS + GLYPH_EXPLODE_FROSTY_OFF;
const glyph_is_cmap = g => g >= GLYPH_CMAP_STONE_OFF && g < GLYPH_CMAP_C_OFF + ((S.S_goodpos - S.S_digbeam) + 1);
const glyph_to_swallow = g => glyph_is_swallow(g) ? ((g - GLYPH_SWALLOW_OFF) & 0x7) : 0;
const glyph_to_explosion = g => glyph_is_explosion(g) ? ((g - GLYPH_EXPLODE_OFF) % (S.S_expl_br - S.S_expl_tl + 1)) : 0;
const glyph_is_invisible = g => g === GLYPH_INVIS_OFF;
const glyph_is_nothing = g => g === GLYPH_NOTHING_OFF;
const glyph_is_unexplored = g => g === GLYPH_UNEXPLORED_OFF;
const glyph_is_warning = g => g >= GLYPH_WARNING_OFF && g < GLYPH_WARNING_OFF + WARNCOUNT;

// src/glyphs.c glyph_to_cmap() for the integer numbering
export function glyph_to_cmap(glyph) {
    if (glyph === GLYPH_CMAP_STONE_OFF)
        return S.S_stone;
    else if (glyph_is_cmap_main(glyph))
        return (glyph - GLYPH_CMAP_MAIN_OFF) + S.S_vwall;
    else if (glyph_is_cmap_mines(glyph))
        return (glyph - GLYPH_CMAP_MINES_OFF) + S.S_vwall;
    else if (glyph_is_cmap_gehennom(glyph))
        return (glyph - GLYPH_CMAP_GEH_OFF) + S.S_vwall;
    else if (glyph_is_cmap_knox(glyph))
        return (glyph - GLYPH_CMAP_KNOX_OFF) + S.S_vwall;
    else if (glyph_is_cmap_sokoban(glyph))
        return (glyph - GLYPH_CMAP_SOKO_OFF) + S.S_vwall;
    else if (glyph_is_cmap_a(glyph))
        return (glyph - GLYPH_CMAP_A_OFF) + S.S_ndoor;
    else if (glyph_is_cmap_altar(glyph))
        return S.S_altar;
    else if (glyph_is_cmap_b(glyph))
        return (glyph - GLYPH_CMAP_B_OFF) + S.S_grave;
    else if (glyph_is_cmap_zap(glyph))
        return ((glyph - GLYPH_ZAP_OFF) % 4) + S.S_vbeam;
    else if (glyph_is_cmap_c(glyph))
        return (glyph - GLYPH_CMAP_C_OFF) + S.S_digbeam;
    else if (glyph_is_swallow(glyph))
        return glyph_to_swallow(glyph) + S.S_sw_tl;
    else if (glyph_is_explosion(glyph))
        return glyph_to_explosion(glyph) + S.S_expl_tl;
    return NO_GLYPH;
}

/* src/earlyarg.c:628 monsdump[] — the PM_ enum names ("GIANT_ANT") by
   monster index; js/monst_data.js PMNAMES maps "PM_GIANT_ANT" to its index */
const monsdump = (() => {
    const nm = new Array(NUMMONS).fill('');
    for (const [key, idx] of Object.entries(PMNAMES))
        if (key.startsWith('PM_') && idx >= 0 && idx < NUMMONS && !nm[idx])
            nm[idx] = key.slice(3);
    return nm;
})();

/* the glyph-id cache: the C's double-hash table keyed by id, compared
   case-insensitively; a Map keeps the first id inserted for a name, which is
   the entry the C's probe sequence also reaches first */
let glyphid_cache = null;        /* Map lower-cased id -> { glyphnum, id } */
let glyphid_cache_by_num = null; /* Map glyphnum -> id */

/* the find_struct of glyphs.c */
const find_nothing = 0, find_pm = 1, find_oc = 2, find_cmap = 3, find_glyph = 4;
const res_nothing = 0, res_fill_cache = 1, res_dump_glyphids = 2;
function zero_find() {
    return { findtype: find_nothing, val: 0, loadsyms_offset: 0, restype: res_nothing,
             reserved: null, color: 0, unicode_val: null, extraval: null, callback: null };
}
let to_custom_symbol_find = zero_find();

// src/glyphs.c:53 to_custom_symset_entry_callback()
function to_custom_symset_entry_callback(glyph, findwhat) {
    const idx = gs_symset_which_set.v;
    let utf8str = null;
    let uval = 0;

    if (findwhat.extraval)
        findwhat.extraval.v = glyph;

    /* ENHANCED_SYMBOLS */
    if (findwhat.unicode_val)
        uval = unicode_val(findwhat.unicode_val);
    if (uval && (utf8str = unicodeval_to_utf8str(uval))) {
        /* presently the customizations are affiliated with a particular
         * symset but if we don't have any symset context, ignore it for now
         * in order to avoid a segfault. */
        if (gs_symset[idx]?.name) {
            add_custom_urep_entry(gs_symset[idx].name, glyph, uval,
                                  utf8str, gs_symset_which_set.v);
        } else {
            if (!to_custom_symset_entry_callback.glyphnag++)
                config_error_add('Unimplemented customization feature,'
                                 + ' ignoring for now');
        }
    }
    if (findwhat.color) {
        if (gs_symset[idx]?.name) {
            add_custom_nhcolor_entry(gs_symset[idx].name, glyph,
                                     findwhat.color, gs_symset_which_set.v);
        } else {
            if (!to_custom_symset_entry_callback.colornag++)
                config_error_add('Unimplemented customization feature,'
                                 + ' ignoring for now');
        }
    }
}
to_custom_symset_entry_callback.glyphnag = 0;
to_custom_symset_entry_callback.colornag = 0;

// src/glyphs.c:112 glyphrep_to_custom_map_entries() — "G_x[:U+xxxx][/color]";
// glyphptr, when given, is a box whose .v receives the glyph. Return 1 on
// success, 0 on failure.
export function glyphrep_to_custom_map_entries(op, glyphptr) {
    to_custom_symbol_find = zero_find();
    let c_glyphid, c_unicode = null, c_colorval = null;
    let reslt = 0;
    let rgb = 0;

    /* split at the first ':' (unicode) and '/' (colour), as the C's
       in-place NUL writes do */
    let buf = String(op);
    let rest = buf;
    let colon = rest.indexOf(':'), slash = rest.indexOf('/');
    if (colon >= 0 && (slash < 0 || colon < slash)) {
        c_glyphid = rest.slice(0, colon);
        rest = rest.slice(colon + 1);
        slash = rest.indexOf('/');
        if (slash >= 0) {
            c_unicode = rest.slice(0, slash);
            c_colorval = rest.slice(slash + 1);
        } else {
            c_unicode = rest;
        }
    } else if (slash >= 0) {
        c_glyphid = rest.slice(0, slash);
        rest = rest.slice(slash + 1);
        colon = rest.indexOf(':');
        if (colon >= 0) {
            c_colorval = rest.slice(0, colon);
            c_unicode = rest.slice(colon + 1);
        } else {
            c_colorval = rest;
        }
    } else {
        c_glyphid = rest;
    }
    /* some sanity checks */
    if (c_glyphid && c_glyphid[0] === ' ')
        c_glyphid = c_glyphid.slice(1);
    if (c_colorval && c_colorval[0] === ' ')
        c_colorval = c_colorval.slice(1);
    if (c_unicode && c_unicode[0] === ' ')
        c_unicode = c_unicode.replace(/^ +/, '');
    if (c_unicode !== null && !c_unicode.length)
        c_unicode = null;

    if ((c_colorval && (rgb = rgbstr_to_int32(c_colorval)) !== -1)
        || !c_colorval) {
        /* if the color 0 is an actual color, as opposed to just "not set"
           we set a marker bit outside the 24-bit range to indicate a
           valid color value 0. That allows valid color 0, but allows a
           simple checking for 0 to detect "not set". The window port that
           implements the color switch, needs to either check that bit
           or appropriately mask colors with 0xFFFFFF. */
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
const nonzero_black = CLR_BLACK | NH_BASIC_COLOR;

// src/glyphs.c:184 fix_glyphname() — lower case, anything but a letter or a
// digit becomes '_'
export function fix_glyphname(str) {
    let out = '';
    for (const c of str) {
        if (c >= 'A' && c <= 'Z')
            out += c.toLowerCase();
        else if (c >= '0' && c <= '9')
            out += c;
        else if (c < 'a' || c > 'z')
            out += '_';
        else
            out += c;
    }
    return out;
}

// src/glyphs.c:234 glyph_find_core()
function glyph_find_core(id, findwhat) {
    let do_callback, end_find = false;

    if (parse_id(id, findwhat)) {
        if (findwhat.findtype === find_glyph) {
            findwhat.callback(findwhat.val, findwhat);
        } else {
            for (let glyph = 0; glyph < MAX_GLYPH; ++glyph) {
                do_callback = false;
                switch (findwhat.findtype) {
                case find_cmap:
                    if (glyph_to_cmap(glyph) === findwhat.val)
                        do_callback = true;
                    break;
                case find_pm:
                    if (glyph_is_monster(glyph)
                        && game.mons[glyph_to_mon(glyph)].mlet === findwhat.val)
                        do_callback = true;
                    break;
                case find_oc:
                    if (glyph_is_object(glyph)
                        && glyph_to_obj(glyph) === findwhat.val)
                        do_callback = true;
                    break;
                case find_glyph:
                    if (glyph === findwhat.val) {
                        do_callback = true;
                        end_find = true;
                    }
                    break;
                case find_nothing:
                default:
                    end_find = true;
                    break;
                }
                if (do_callback)
                    findwhat.callback(glyph, findwhat);
                if (end_find)
                    break;
            }
        }
        return 1;
    }
    return 0;
}

// src/glyphs.c:303 fill_glyphid_cache()
export function fill_glyphid_cache() {
    if (!glyphid_cache)
        init_glyph_cache();
    if (glyphid_cache) {
        const glyphcache_find = zero_find();
        glyphcache_find.findtype = find_nothing;
        glyphcache_find.reserved = glyphid_cache;
        glyphcache_find.restype = res_fill_cache;
        const reslt = parse_id(null, glyphcache_find);
        if (!reslt)
            free_glyphid_cache();
    }
}

// src/glyphs.c:334 init_glyph_cache()
function init_glyph_cache() {
    glyphid_cache = new Map();
    glyphid_cache_by_num = new Map();
}

// src/glyphs.c:355 free_glyphid_cache()
export function free_glyphid_cache() {
    glyphid_cache = null;
    glyphid_cache_by_num = null;
}

// src/glyphs.c:372 add_glyph_to_cache()
function add_glyph_to_cache(glyphnum, id) {
    const key = id.toLowerCase();
    /* For speed, assume that no ID occurs twice */
    if (!glyphid_cache.has(key))
        glyphid_cache.set(key, { glyphnum, id });
    if (!glyphid_cache_by_num.has(glyphnum))
        glyphid_cache_by_num.set(glyphnum, id);
}

// src/glyphs.c:395 find_glyph_in_cache()
function find_glyph_in_cache(id) {
    const hit = glyphid_cache.get(id.toLowerCase());
    return hit ? hit.glyphnum : -1;
}

// src/glyphs.c:418 find_glyphid_in_cache_by_glyphnum()
function find_glyphid_in_cache_by_glyphnum(glyphnum) {
    if (!glyphid_cache)
        return null;
    return glyphid_cache_by_num.get(glyphnum) ?? null;
}

// src/glyphs.c:452 glyphid_cache_status()
export function glyphid_cache_status() {
    return glyphid_cache !== null;
}

// src/glyphs.c:461 match_glyph() — a "G_..." glyph reference (maybe with a
// colour attached) from a symset or SYMBOLS= line
export function match_glyph(buf) {
    /* buf contains a G_ glyph reference, not an S_ symbol.
        There could be an R-G-B color attached too.
        Let's get a copy to work with. */
    const workbuf = String(buf);
    return glyphrep(workbuf);
}

// src/glyphs.c:473 glyphrep()
export function glyphrep(op) {
    const glyph = { v: NO_GLYPH };
    const reslt = glyphrep_to_custom_map_entries(op, glyph);
    if (reslt)
        return 1;
    return 0;
}

/* src/decl.c gs.sym_customizations[NUM_GRAPHICS + 1][custom_count] */
function new_symset_customization() {
    return { customization_name: null, count: 0, custtype: custom_none,
             details: [] };
}
export const gs_sym_customizations = Array.from({ length: NUM_GRAPHICS + 1 },
    () => Array.from({ length: custom_count }, new_symset_customization));

// src/glyphs.c:484 add_custom_nhcolor_entry()
export function add_custom_nhcolor_entry(customization_name, glyphidx, nhcolor,
                                         which_set) {
    const gdc = gs_sym_customizations[which_set][custom_nhcolor];
    let details, newdetails;

    if (!gdc.details.length) {
        gdc.customization_name = customization_name;
        gdc.custtype = custom_nhcolor;
        gdc.details = [];
    }
    details = find_matching_customization(customization_name, custom_nhcolor,
                                          which_set);
    if (details) {
        for (const d of details) {
            if (d.content.ccolor.glyphidx === glyphidx) {
                d.content.ccolor.nhcolor = nhcolor;
                return 1;
            }
        }
    }
    /* create new details entry */
    newdetails = { content: { ccolor: { glyphidx, nhcolor } } };
    gdc.details.push(newdetails);
    gdc.count++;
    return 1;
}

// src/glyphs.c:530 apply_customizations()
export function apply_customizations(which_set, docustomize) {
    let gmap;
    let at_least_one = false;
    const do_colors = (docustomize & do_custom_colors) !== 0,
          do_symbols = (docustomize & do_custom_symbols) !== 0;

    for (let custs = 0; custs < custom_count; ++custs) {
        const sc = gs_sym_customizations[which_set][custs];
        if (sc.count && sc.details.length) {
            at_least_one = true;
            /* These glyph customizations get applied to the glyphmap array,
               not to symset entries */
            for (const details of sc.details) {
                /* ENHANCED_SYMBOLS */
                if ((game.iflags?.customsymbols ?? true) && do_symbols) {
                    if (sc.custtype === custom_ureps) {
                        gmap = glyphmap()[details.content.urep.glyphidx];
                        if (gs_symset[which_set]?.handling === H_UTF8)
                            set_map_u(gmap, details.content.urep.u.utf32ch,
                                      details.content.urep.u.utf8str);
                    }
                }
                if ((game.iflags?.customcolors ?? true) && do_colors) {
                    if (sc.custtype === custom_nhcolor) {
                        gmap = glyphmap()[details.content.ccolor.glyphidx];
                        set_map_customcolor(gmap, details.content.ccolor.nhcolor);
                    }
                }
            }
        }
    }
    (game.iflags ||= {}).pending_customizations = at_least_one;
}

// src/glyphs.c:736 find_matching_customization() — the details list, or null
export function find_matching_customization(customization_name, custtype,
                                            which_set) {
    const gdc = gs_sym_customizations[which_set][custtype];

    if (gdc.custtype === custtype && gdc.customization_name
        && customization_name === gdc.customization_name)
        return gdc.details;
    return null;
}

// src/glyphs.c:751 purge_all_custom_entries()
export function purge_all_custom_entries() {
    for (let i = 0; i < NUM_GRAPHICS + 1; ++i)
        purge_custom_entries(i);
}

// src/glyphs.c:761 purge_custom_entries()
export function purge_custom_entries(which_set) {
    for (let custtype = custom_none; custtype < custom_count; ++custtype) {
        const gdc = gs_sym_customizations[which_set][custtype];
        gdc.details = [];
        gdc.customization_name = null;
        gdc.count = 0;
    }
}

/* src/glyphs.c:1000 the cmap identifier tables */
const altar_text = ['unaligned', 'chaotic', 'neutral', 'lawful', 'other'];
const altar_other = 4;
const zap_texts = ['missile', 'fire', 'frost', 'sleep',
                   'death', 'lightning', 'poison gas', 'acid'];
const swallow_texts = ['top left', 'top center', 'top right',
                       'middle left', 'middle right', 'bottom left',
                       'bottom center', 'bottom right'];
const expl_type_texts = ['dark', 'noxious', 'muddy', 'wet',
                         'magical', 'fiery', 'frosty'];
const expl_texts = ['tl', 'tc', 'tr', 'ml', 'mc', 'mr', 'bl', 'bc', 'br'];

/* the "S_xxx" -> "xxx" of loadsyms[cmap + cmap_offset].name + 2 */
const cmap_basename = cmap => defsyms[cmap].name.slice(2);

// src/glyphs.c:815 parse_id() — the glyph identifier loop: with a null id
// and res_fill_cache it names every glyph into the cache, otherwise it
// resolves 'id' ("G_..." through the cache, "S_..." against loadsyms[])
function parse_id(id, findwhat) {
    let i = 0, j, mnum, glyph;
    let pm_offset = 0, oc_offset = 0, cmap_offset = 0,
        pm_count = 0, oc_count = 0, cmap_count = 0;
    let skip_base = false, skip_this_one = false, filling_cache = false,
        is_S = false, is_G = false;
    const buf = ['', '', '', ''];

    if (findwhat.findtype === find_nothing && findwhat.restype) {
        if (findwhat.restype === res_dump_glyphids)
            return 0; /* no file to dump to here */
        if (findwhat.restype === res_fill_cache) {
            if (findwhat.reserved && findwhat.reserved === glyphid_cache)
                filling_cache = true;
            else
                return 0;
        }
    }
    is_G = !!(id && id[0] === 'G' && id[1] === '_');
    is_S = !!(id && id[0] === 'S' && id[1] === '_');
    if ((is_G && !glyphid_cache) || filling_cache || is_S) {
        while (i < loadsyms.length && loadsyms[i].range) {
            if (!pm_offset && loadsyms[i].range === SYM_MON)
                pm_offset = i;
            if (!pm_count && pm_offset && loadsyms[i].range !== SYM_MON)
                pm_count = i - pm_offset;
            if (!oc_offset && loadsyms[i].range === SYM_OC)
                oc_offset = i;
            if (!oc_count && oc_offset && loadsyms[i].range !== SYM_OC)
                oc_count = i - oc_offset;
            if (!cmap_offset && loadsyms[i].range === SYM_PCHAR)
                cmap_offset = i;
            if (!cmap_count && cmap_offset && loadsyms[i].range !== SYM_PCHAR)
                cmap_count = i - cmap_offset;
            i++;
        }
        if (pm_offset && !pm_count)
            pm_count = i - pm_offset;
    }
    if (is_G || filling_cache) {
        if (!filling_cache && id && glyphid_cache) {
            const val = find_glyph_in_cache(id);
            if (val >= 0) {
                findwhat.findtype = find_glyph;
                findwhat.val = val;
                findwhat.loadsyms_offset = 0;
                return 1;
            } else {
                return 0;
            }
        } else {
            let buf2, buf3, buf4;

            /* individual matching glyph entries */
            for (glyph = 0; glyph < MAX_GLYPH; ++glyph) {
                skip_base = false;
                skip_this_one = false;
                buf[0] = buf[1] = buf[2] = buf[3] = '';
                if (glyph_is_monster(glyph)) {
                    /* buf2 will hold the distinguishing prefix */
                    /* buf3 will hold the base name */
                    buf2 = '';
                    buf3 = monsdump[glyph_to_mon(glyph)];
                    if (glyph_is_normal_male_monster(glyph)) {
                        buf2 = 'male_';
                    } else if (glyph_is_normal_female_monster(glyph)) {
                        buf2 = 'female_';
                    } else if (glyph_is_ridden_male_monster(glyph)) {
                        buf2 = 'ridden_male_';
                    } else if (glyph_is_ridden_female_monster(glyph)) {
                        buf2 = 'ridden_female_';
                    } else if (glyph_is_detected_male_monster(glyph)) {
                        buf2 = 'detected_male_';
                    } else if (glyph_is_detected_female_monster(glyph)) {
                        buf2 = 'detected_female_';
                    } else if (glyph_is_male_pet(glyph)) {
                        buf2 = 'pet_male_';
                    } else if (glyph_is_female_pet(glyph)) {
                        buf2 = 'pet_female_';
                    }
                    buf[0] = 'G_' + buf2 + buf3;
                } else if (glyph_is_body(glyph)) {
                    /* buf2 will hold the distinguishing prefix */
                    /* buf3 will hold the base name */
                    buf2 = glyph_is_body_piletop(glyph)
                           ? 'piletop_body_'
                           : 'body_';
                    buf3 = monsdump[glyph_to_body_corpsenm(glyph)];
                    buf[0] = 'G_' + buf2 + buf3;
                } else if (glyph_is_statue(glyph)) {
                    /* buf2 will hold the distinguishing prefix */
                    /* buf3 will hold the base name */
                    buf2 = glyph_is_fem_statue_piletop(glyph)
                           ? 'piletop_statue_of_female_'
                           : glyph_is_fem_statue(glyph)
                             ? 'statue_of_female_'
                             : glyph_is_male_statue_piletop(glyph)
                               ? 'piletop_statue_of_male_'
                               : glyph_is_male_statue(glyph)
                                 ? 'statue_of_male_'
                                 : ''; /* shouldn't happen */
                    buf3 = monsdump[glyph_to_statue_corpsenm(glyph)];
                    buf[0] = 'G_' + buf2 + buf3;
                } else if (glyph_is_object(glyph)) {
                    i = glyph_to_obj(glyph);
                    /* buf2 will hold the distinguishing prefix */
                    /* buf3 will hold the base name */
                    if ((i > ONAMES.SCR_STINKING_CLOUD && i < ONAMES.SCR_MAIL)
                        || (i > ONAMES.WAN_LIGHTNING && i < ONAMES.GOLD_PIECE))
                        skip_this_one = true;
                    if (!skip_this_one) {
                        if (i >= ONAMES.WAN_LIGHT && i <= ONAMES.WAN_LIGHTNING)
                            buf2 = 'wand of ';
                        else if (i >= ONAMES.SPE_DIG && i < ONAMES.SPE_BLANK_PAPER)
                            buf2 = 'spellbook of ';
                        else if (i >= ONAMES.SCR_ENCHANT_ARMOR
                                 && i <= ONAMES.SCR_STINKING_CLOUD)
                            buf2 = 'scroll of ';
                        else if (i >= ONAMES.POT_GAIN_ABILITY && i <= ONAMES.POT_WATER)
                            buf2 = (i === ONAMES.POT_WATER) ? 'flask of n'
                                                            : 'potion of ';
                        else if (i >= ONAMES.RIN_ADORNMENT
                                 && i <= ONAMES.RIN_PROTECTION_FROM_SHAPE_CHAN)
                            buf2 = 'ring of ';
                        else if (i === ONAMES.LAND_MINE)
                            buf2 = 'unset ';
                        else
                            buf2 = '';
                        buf3 = (i === ONAMES.SCR_BLANK_PAPER) ? 'blank scroll'
                               : (i === ONAMES.SPE_BLANK_PAPER) ? 'blank spellbook'
                                 : (i === ONAMES.SLIME_MOLD) ? 'slime mold'
                                   : obj_descr[i].oc_name
                                     ? obj_descr[i].oc_name
                                     : obj_descr[i].oc_descr;
                        buf[0] = 'G_';
                        if (glyph_is_normal_piletop_obj(glyph))
                            buf[0] += 'piletop_';
                        buf[0] += buf2 + buf3;
                    }
                } else if (glyph_is_cmap(glyph) || glyph_is_cmap_zap(glyph)
                           || glyph_is_swallow(glyph)
                           || glyph_is_explosion(glyph)) {
                    let cmap = -1;
                    /* buf2 will hold the distinguishing prefix */
                    /* buf3 will hold the base name */
                    /* buf4 will hold the distinguishing suffix */
                    buf2 = '';
                    buf3 = '';
                    buf4 = '';
                    if (glyph === GLYPH_CMAP_OFF) {
                        cmap = S.S_stone;
                        buf3 = 'stone substrate';
                        skip_base = true;
                    } else if (glyph_is_cmap_gehennom(glyph)) {
                        cmap = (glyph - GLYPH_CMAP_GEH_OFF) + S.S_vwall;
                        buf4 = '_gehennom';
                    } else if (glyph_is_cmap_knox(glyph)) {
                        cmap = (glyph - GLYPH_CMAP_KNOX_OFF) + S.S_vwall;
                        buf4 = '_knox';
                    } else if (glyph_is_cmap_main(glyph)) {
                        cmap = (glyph - GLYPH_CMAP_MAIN_OFF) + S.S_vwall;
                        buf4 = '_main';
                    } else if (glyph_is_cmap_mines(glyph)) {
                        cmap = (glyph - GLYPH_CMAP_MINES_OFF) + S.S_vwall;
                        buf4 = '_mines';
                    } else if (glyph_is_cmap_sokoban(glyph)) {
                        cmap = (glyph - GLYPH_CMAP_SOKO_OFF) + S.S_vwall;
                        buf4 = '_sokoban';
                    } else if (glyph_is_cmap_a(glyph)) {
                        cmap = (glyph - GLYPH_CMAP_A_OFF) + S.S_ndoor;
                    } else if (glyph_is_cmap_altar(glyph)) {
                        j = (glyph - GLYPH_ALTAR_OFF);
                        cmap = S.S_altar;
                        if (j !== altar_other) {
                            buf[2] = `${altar_text[j]}_`;
                            buf2 = buf[2];
                        } else {
                            buf3 = 'altar other';
                            skip_base = true;
                        }
                    } else if (glyph_is_cmap_b(glyph)) {
                        cmap = (glyph - GLYPH_CMAP_B_OFF) + S.S_grave;
                    } else if (glyph_is_cmap_zap(glyph)) {
                        j = (glyph - GLYPH_ZAP_OFF);
                        cmap = (j % 4) + S.S_vbeam;
                        buf[2] = cmap_basename(cmap);
                        buf[3] = `${zap_texts[Math.trunc(j / 4)]} zap ${fix_glyphname(buf[2])}`;
                        buf3 = buf[3];
                        buf2 = '';
                        skip_base = true;
                    } else if (glyph_is_cmap_c(glyph)) {
                        cmap = (glyph - GLYPH_CMAP_C_OFF) + S.S_digbeam;
                    } else if (glyph_is_swallow(glyph)) {
                        j = glyph - GLYPH_SWALLOW_OFF;
                        cmap = glyph_to_swallow(glyph);
                        mnum = Math.trunc(j / ((S.S_sw_br - S.S_sw_tl) + 1));
                        buf[3] = 'swallow ' + monsdump[mnum] + ' ' + swallow_texts[cmap];
                        buf3 = buf[3];
                        skip_base = true;
                    } else if (glyph_is_explosion(glyph)) {
                        let expl;
                        j = glyph - GLYPH_EXPLODE_OFF;
                        expl = Math.trunc(j / ((S.S_expl_br - S.S_expl_tl) + 1));
                        cmap = glyph_to_explosion(glyph) + S.S_expl_tl;
                        i = cmap - S.S_expl_tl;
                        buf[2] = `${expl_type_texts[expl]} `;
                        buf2 = buf[2];
                        buf[3] = `expl_${expl_texts[i]}`;
                        buf3 = buf[3];
                        skip_base = true;
                    }
                    if (!skip_base) {
                        if (cmap >= 0 && cmap < MAXPCHARS)
                            buf3 = cmap_basename(cmap);
                    }
                    buf[0] = 'G_' + buf2 + buf3 + buf4;
                } else if (glyph_is_invisible(glyph)) {
                    buf[0] = 'G_invisible';
                } else if (glyph_is_nothing(glyph)) {
                    buf[0] = 'G_nothing';
                } else if (glyph_is_unexplored(glyph)) {
                    buf[0] = 'G_unexplored';
                } else if (glyph_is_warning(glyph)) {
                    j = glyph - GLYPH_WARNING_OFF;
                    buf[0] = `G_warning${j}`;
                }
                if (!skip_this_one) {
                    buf[0] = 'G_' + fix_glyphname(buf[0].slice(2));
                    if (filling_cache) {
                        add_glyph_to_cache(glyph, buf[0]);
                    } else if (id) {
                        if (id.toLowerCase() === buf[0].toLowerCase()) {
                            findwhat.findtype = find_glyph;
                            findwhat.val = glyph;
                            findwhat.loadsyms_offset = 0;
                            return 1;
                        }
                    }
                }
            }
        } /* not glyphid_cache */
    } else if (is_S) {
        const idlow = id.slice(2).toLowerCase();
        /* cmap entries */
        for (i = 0; i < cmap_count; ++i) {
            if (loadsyms[i + cmap_offset].name.slice(2).toLowerCase() === idlow) {
                findwhat.findtype = find_cmap;
                findwhat.val = i;
                findwhat.loadsyms_offset = i + cmap_offset;
                return 1;
            }
        }
        /* objclass entries */
        for (i = 0; i < oc_count; ++i) {
            if (loadsyms[i + oc_offset].name.slice(2).toLowerCase() === idlow) {
                findwhat.findtype = find_oc;
                findwhat.val = i;
                findwhat.loadsyms_offset = i + oc_offset;
                return 1;
            }
        }
        /* permonst entries */
        for (i = 0; i <= pm_count; ++i) {
            if (loadsyms[i + pm_offset]
                && loadsyms[i + pm_offset].name.slice(2).toLowerCase() === idlow) {
                findwhat.findtype = find_pm;
                findwhat.val = i + 1; /* starts at 1 */
                findwhat.loadsyms_offset = i + pm_offset;
                return 1;
            }
        }
    }
    if (filling_cache)
        return 1;
    findwhat.findtype = find_nothing;
    findwhat.val = 0;
    findwhat.loadsyms_offset = 0;
    return 0;
}

// src/glyphs.c:808 wizcustom_glyphids() — every cached glyph id, in glyph
// order, through wizcmds.c wizcustom_callback()
export async function wizcustom_glyphids(win) {
    if (!glyphid_cache)
        return;
    const { wizcustom_callback } = await import('./wizcmds.js');
    for (let glyphnum = 0; glyphnum < MAX_GLYPH; ++glyphnum) {
        const id = find_glyphid_in_cache_by_glyphnum(glyphnum);
        if (id)
            wizcustom_callback(win, glyphnum, id);
    }
}

// src/glyphs.c:1167 clear_all_glyphmap_colors()
export function clear_all_glyphmap_colors() {
    const gm = glyphmap();
    for (let glyph = 0; glyph < MAX_GLYPH; ++glyph) {
        if (gm[glyph].customcolor)
            gm[glyph].customcolor = 0;
        gm[glyph].color256idx = 0;
    }
}

// src/glyphs.c:1179 reset_customcolors()
export function reset_customcolors() {
    clear_all_glyphmap_colors();
    apply_customizations(gc_currentgraphics.set, do_custom_colors);
}
