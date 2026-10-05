/**
 * C home: nethack-c/upstream/src/glyphs.c — glyph-id parse family.
 *
 * `parse_id` (`:824–1162`, staticfn) maps a `G_`/`S_` id string to a glyph
 * number (or a loadsyms `S_` entry), generating all 9000+ `G_` candidate
 * names in C order and comparing with case-insensitive `strcmpi`. It backs
 * the glyphid cache (`fill_glyphid_cache`, options/symbols startup), the
 * `--dump-glyphids` debugger listing (`dump_all_glyphids`, earlyarg.c:808)
 * and symbol/color customization lookup (`glyph_find_core`).
 *
 * C linkage shape is kept: C staticfn → module-local function, C global →
 * exported. `find_struct`/`zero_find`, the `find_*`/`res_*` enums and the
 * `glyphid_cache` hash table (double-hash, power-of-two size) are resolved
 * inside this module.
 *
 * Rule #2 adaptations (named, no stdio): `dump_all_glyphids(FILE *fp)`
 * takes a line-sink function; the per-glyph `Fprintf(fp, "(%04d) %s\n")`
 * record is delivered without the trailing newline. `genericptr_t reserved`
 * carries the sink (dump) or the live cache array (fill) by identity.
 */

import {
    MAX_GLYPH, MAXPCHARS, altar_other,
    GLYPH_CMAP_OFF, GLYPH_CMAP_MAIN_OFF, GLYPH_CMAP_MINES_OFF,
    GLYPH_CMAP_GEH_OFF, GLYPH_CMAP_KNOX_OFF, GLYPH_CMAP_SOKO_OFF,
    GLYPH_CMAP_A_OFF, GLYPH_ALTAR_OFF, GLYPH_CMAP_B_OFF, GLYPH_ZAP_OFF,
    GLYPH_CMAP_C_OFF, GLYPH_SWALLOW_OFF, GLYPH_EXPLODE_OFF,
    GLYPH_EXPLODE_DARK_OFF, GLYPH_EXPLODE_NOXIOUS_OFF,
    GLYPH_EXPLODE_MUDDY_OFF, GLYPH_EXPLODE_WET_OFF,
    GLYPH_EXPLODE_MAGICAL_OFF, GLYPH_EXPLODE_FIERY_OFF,
    GLYPH_EXPLODE_FROSTY_OFF, GLYPH_WARNING_OFF,
    GLYPH_OBJ_OFF, GLYPH_OBJ_PILETOP_OFF,
    glyph_is_monster, glyph_is_normal_male_monster,
    glyph_is_normal_female_monster, glyph_is_ridden_male_monster,
    glyph_is_ridden_female_monster, glyph_is_detected_male_monster,
    glyph_is_detected_female_monster, glyph_is_male_pet, glyph_is_female_pet,
    glyph_is_body, glyph_is_body_piletop, glyph_is_statue,
    glyph_is_fem_statue_piletop, glyph_is_fem_statue,
    glyph_is_male_statue_piletop, glyph_is_male_statue,
    glyph_is_object, glyph_is_normal_piletop_obj,
    glyph_is_cmap, glyph_is_cmap_zap, glyph_is_cmap_gehennom,
    glyph_is_cmap_knox, glyph_is_cmap_main, glyph_is_cmap_mines,
    glyph_is_cmap_sokoban, glyph_is_cmap_a, glyph_is_cmap_altar,
    glyph_is_cmap_b, glyph_is_cmap_c, glyph_is_swallow, glyph_is_explosion,
    glyph_is_invisible_id, glyph_is_nothing, glyph_is_unexplored,
    glyph_is_warning, glyph_to_mon, glyph_to_obj, glyph_to_body_corpsenm,
    glyph_to_statue_corpsenm, glyph_to_swallow, glyph_to_explosion,
    glyph_to_cmap,
    NO_GLYPH,
} from './display.js';
import {
    S_stone, S_vwall, S_ndoor, S_altar, S_grave, S_digbeam, S_vbeam,
    S_goodpos, S_expl_tl, S_expl_br,
    H_UTF8, NH_BASIC_COLOR,
} from './const.js';
import { monsterNames, mlets, NUMMONS } from './generated/monsters_data.js';
import {
    objectNames, objectNameStrs, objectDescrs, NUM_OBJECTS,
} from './generated/objects_data.js';
import { dupstr } from './dungeon.js';
import { game } from './gstate.js';
import { NO_COLOR, CLR_BLACK } from './terminal.js';
import { config_error_add } from './botl.js';
import { unicodeval_to_utf8str } from './hacklib.js';
import {
    rgbstr_to_int32, set_map_u, set_map_customcolor, unicode_val,
} from './options.js';
/* C wizcmds.c:818 wizcustom_callback — called only at runtime from
   wizcustom_glyphids below (function declaration, no top-level read). */
import { wizcustom_callback } from './wizcmds.js';
import {
    LOADSYMS, SYM_MON, SYM_OC, SYM_PCHAR,
} from './generated/glyphsyms_data.js';

/* C global.h:390 — `char buf[4][QBUFSZ]` in parse_id. */
const QBUFSZ = 128;
/* C glyphs.c:14 — `enum reserved_activities`. */
const RES_NOTHING = 0, RES_DUMP_GLYPHIDS = 1, RES_FILL_CACHE = 2;
/* C glyphs.c:15 — `enum things_to_find`. */
const FIND_NOTHING = 0, FIND_PM = 1, FIND_OC = 2, FIND_CMAP = 3, FIND_GLYPH = 4;
/* C defsym.h — 8 swallow cells S_sw_tl..S_sw_br. Read at call time, not
   here: this module joins the import cycle via options.js, so its
   top level must not read display.js bindings (TDZ). */

/* C objects.h otyp ids (apply.js:239 / mklev.js:303 indexOf idiom). */
const SCR_STINKING_CLOUD = objectNames.indexOf('SCR_STINKING_CLOUD');
const SCR_MAIL = objectNames.indexOf('SCR_MAIL');
const WAN_LIGHTNING = objectNames.indexOf('WAN_LIGHTNING');
const GOLD_PIECE = objectNames.indexOf('GOLD_PIECE');
const WAN_LIGHT = objectNames.indexOf('WAN_LIGHT');
const SPE_DIG = objectNames.indexOf('SPE_DIG');
const SPE_BLANK_PAPER = objectNames.indexOf('SPE_BLANK_PAPER');
const SCR_ENCHANT_ARMOR = objectNames.indexOf('SCR_ENCHANT_ARMOR');
const POT_GAIN_ABILITY = objectNames.indexOf('POT_GAIN_ABILITY');
const POT_WATER = objectNames.indexOf('POT_WATER');
const RIN_ADORNMENT = objectNames.indexOf('RIN_ADORNMENT');
const RIN_PROTECTION_FROM_SHAPE_CHAN = objectNames.indexOf('RIN_PROTECTION_FROM_SHAPE_CHAN');
const LAND_MINE = objectNames.indexOf('LAND_MINE');
const SCR_BLANK_PAPER = objectNames.indexOf('SCR_BLANK_PAPER');
const SLIME_MOLD = objectNames.indexOf('SLIME_MOLD');

/* C glyphs.c:27 — `static const struct find_struct zero_find = { 0 }`. */
function zero_find() {
    return {
        findtype: FIND_NOTHING, val: 0, loadsyms_offset: 0, loadsyms_count: 0,
        extraval: null, color: 0, unicode_val: null, callback: null,
        restype: RES_NOTHING, reserved: null,
    };
}

/**
 * C ref: hacklib.c strncmpi (`#define strcmpi(a,b) strncmpi((a),(b),-1)`;
 * files.js:173) — A-Z fold, compare until NUL, 0 on equal.
 */
function strcmpi(a, b) {
    const sa = String(a), sb = String(b);
    const n = Math.min(sa.length, sb.length);
    for (let k = 0; k < n; k++) {
        let ca = sa.charCodeAt(k), cb = sb.charCodeAt(k);
        if (ca >= 65 && ca <= 90) ca += 32;
        if (cb >= 65 && cb <= 90) cb += 32;
        if (ca !== cb) return ca - cb;
    }
    if (sa.length === sb.length) return 0;
    return sa.length < sb.length ? -1 : 1;
}

/**
 * C glyphs.c fix_glyphname `:183–197` (staticfn) — A-Z lowercase, keep
 * 0-9a-z, all else `_`. C mutates in place and returns str; JS strings are
 * immutable so the fixed string is returned (callers re-slice the `G_`/`S_`
 * prefix around it, matching the C `buf[0]+2` / `buf[2]` call shapes).
 */
function fix_glyphname(str) {
    let out = '';
    for (const ch of String(str)) {
        const c = ch.codePointAt(0);
        if (c >= 65 && c <= 90) out += String.fromCharCode(c + 32);
        else if ((c >= 48 && c <= 57) || (c >= 97 && c <= 122)) out += ch;
        else out += '_';
    }
    return out;
}

/**
 * C glyphs.c glyph_hash `:438–452` (staticfn) — A-Z fold, rotl-1, XOR,
 * uint32 arithmetic.
 */
function glyph_hash(id) {
    let hash = 0;
    const s = String(id);
    for (let k = 0; k < s.length; k++) {
        let ch = s.charCodeAt(k);
        if (ch >= 65 && ch <= 90) ch += 32;
        hash = (((hash << 1) | (hash >>> 31)) ^ ch) >>> 0;
    }
    return hash;
}

/*
 * C glyphs.c:30–33 — the glyphid cache is a double-hash table whose size
 * is a power of two ≥ 2*MAX_GLYPH; the second hash is forced odd so probing
 * traverses the whole table. Entries are { glyphnum, id }.
 */
let glyphidCache = null;
let glyphidCacheLsize = 0;
let glyphidCacheSize = 0;

/* C glyphs.c init_glyph_cache `:335–351` (staticfn). */
function init_glyph_cache() {
    glyphidCacheLsize = 0;
    glyphidCacheSize = 1;
    while (glyphidCacheSize < 2 * MAX_GLYPH) {
        ++glyphidCacheLsize;
        glyphidCacheSize <<= 1;
    }
    glyphidCache = [];
    for (let k = 0; k < glyphidCacheSize; k++) {
        glyphidCache.push({ glyphnum: 0, id: null });
    }
}

/* C glyphs.c free_glyphid_cache `:355–369` (global) — null guard `:359–360`,
 * per-entry id release `:361–366`, table release + NULL `:367–368`. JS has
 * no malloc/free: each live `id` is nulled in C order (GC reclaims the
 * string), then the table itself is nulled (C `free` + `= NULL`).
 * `glyphidCacheSize` mirrors C's `glyphid_cache_size` bound (`init_glyph_cache`
 * fills exactly that many entries, so the index stays in range like C). */
export function free_glyphid_cache() {
    if (!glyphidCache) return; // C `:359–360`
    for (let idx = 0; idx < glyphidCacheSize; ++idx) { // C `:361`
        if (glyphidCache[idx].id) { // C `:362`
            glyphidCache[idx].id = null; // C `:363–364` free + = 0
        }
    }
    glyphidCache = null; // C `:367–368` free + = NULL
}

/* C glyphs.c add_glyph_to_cache `:368–390` (staticfn). */
function add_glyph_to_cache(glyphnum, id) {
    const hash = glyph_hash(id);
    const hash1 = hash & (glyphidCacheSize - 1);
    const hash2 = ((hash >>> glyphidCacheLsize) & (glyphidCacheSize - 1)) | 1;
    let i = hash1;
    do {
        if (glyphidCache[i].id === null) {
            /* Empty bucket found */
            glyphidCache[i].id = String(id);
            glyphidCache[i].glyphnum = glyphnum | 0;
            return;
        }
        /* For speed, assume that no ID occurs twice */
        i = (i + hash2) & (glyphidCacheSize - 1);
    } while (i !== hash1);
    /* This should never happen */
    throw new Error('glyphid_cache full');
}

/* C glyphs.c find_glyph_in_cache `:392–414` (staticfn) — glyphnum or -1. */
function find_glyph_in_cache(id) {
    const hash = glyph_hash(id);
    const hash1 = hash & (glyphidCacheSize - 1);
    const hash2 = ((hash >>> glyphidCacheLsize) & (glyphidCacheSize - 1)) | 1;
    let i = hash1;
    do {
        if (glyphidCache[i].id === null) {
            /* Empty bucket found */
            return -1;
        }
        if (strcmpi(id, glyphidCache[i].id) === 0) {
            /* Match found */
            return glyphidCache[i].glyphnum;
        }
        i = (i + hash2) & (glyphidCacheSize - 1);
    } while (i !== hash1);
    return -1;
}

/* C glyphs.c glyphid_cache_status `:454–458` (global). */
export function glyphid_cache_status() {
    return glyphidCache !== null;
}

/**
 * C glyphs.c match_glyph `:458–467` (global; extern.h:1175) — resolve a
 * `G_` glyph reference (with an optional R-G-B color attached) through
 * glyphrep. C copies buf into workbuf[BUFSZ] first (`:465`); JS strings
 * are immutable and glyphrep never mutates op (it re-copies at `:126`),
 * so the copy is elided and buf passes through. C callers:
 * parse_sym_line symbols.c:486 (unported — named omission) and
 * parsesymbols symbols.c:825 (wired: options.js parsesymbolsSeg G_ arm).
 */
export function match_glyph(buf) {
    return glyphrep(buf); // C `:466`
}

/**
 * C glyphs.c glyphrep `:470–481` (global; extern.h:1174) — parse one
 * glyphrep spec into custom-map entries; 1 on success, 0 on failure.
 * The `:474–475` no-cache `reslt = 1` is debugger-only (`nhUse` `:476`
 * elided) and always overwritten by the `:477` call below. The `&glyph`
 * out-param rides a `{ v }` box (the glyphrep_to_custom_map_entries
 * precedent); C never reads `glyph` after, so the box is discarded.
 * Sole C caller match_glyph `:466` (wired above).
 */
export function glyphrep(op) {
    let reslt = 0; // C `:472`
    const glyphBox = { v: NO_GLYPH }; // C `:472` glyph = NO_GLYPH
    if (!glyphidCache) // C `:474`
        reslt = 1; // C `:475` for debugger use only; no cache available
    reslt = glyphrep_to_custom_map_entries(op, glyphBox); // C `:477`
    if (reslt) // C `:478`
        return 1; // C `:479`
    return 0; // C `:480`
}

/* C defsym.h MONSYM(idx 1-based) + parse_id `:1093` `val = i + 1` — mlet
 * ordinal for glyph_find_core's find_pm arm (`mlet == val`). mlets[] holds
 * 'S_ANT'-style names; the MONSYMS loadsyms run is idx order. */
const MLET_ORDINAL = new Map();
{
    let k = 0;
    for (const [range, , name] of LOADSYMS) {
        if (range === SYM_MON) MLET_ORDINAL.set(name, ++k);
    }
}

/* C precomputed G_ name fragments (static const tables in the arms). */
const PARSE_ALTAR_TEXT = ['unaligned', 'chaotic', 'neutral', 'lawful', 'other'];
const PARSE_ZAP_TEXTS = [
    'missile', 'fire', 'frost', 'sleep', 'death', 'lightning',
    'poison gas', 'acid',
];
const PARSE_SWALLOW_TEXTS = [
    'top left', 'top center', 'top right', 'middle left', 'middle right',
    'bottom left', 'bottom center', 'bottom right',
];
const PARSE_EXPL_TYPE_TEXTS = [
    'dark', 'noxious', 'muddy', 'wet', 'magical', 'fiery', 'frosty',
];
const PARSE_EXPL_TEXTS = ['tl', 'tc', 'tr', 'ml', 'mc', 'mr', 'bl', 'bc', 'br'];

/**
 * C glyphs.c parse_id `:824–1162` (staticfn) — match `id` against every
 * glyph's `G_` name (or an `S_` loadsyms entry), filling `findwhat`.
 * Returns 1 on match (findtype/val/loadsyms_offset set), 0 otherwise.
 *
 * `monsdump[].nm` is the `PM_` basename minus prefix (DUMP_ENUMS `#bn`),
 * so `monsterNames[m].slice(3)`; `obj_descr[i].oc_name ?: oc_descr` is
 * `objectNameStrs[i] ?? objectDescrs[i]`. C `buf[4][QBUFSZ]` scratch is
 * plain strings (only [0]/[2]/[3] are read); the `memchr` overflow panic
 * is a length guard (loud throw ≡ C panic, mklev.js:28604). C
 * `glyph_is_invisible` is the display.js `glyph_is_invisible_id` glyph
 * predicate (the `glyph_is_invisible` name takes a loc there).
 *
 * Exported although C marks it staticfn: the options/symbols ports call
 * this family, and unit probes reach the match arms through it.
 */
export function parse_id(id, findwhat) {
    let fp = null;
    let pm_offset = 0, oc_offset = 0, cmap_offset = 0;
    let pm_count = 0, oc_count = 0, cmap_count = 0;
    let skip_base = false, skip_this_one = false, dump_ids = false;
    let filling_cache = false, is_S = false, is_G = false;

    if (findwhat.findtype === FIND_NOTHING && findwhat.restype) {
        if (findwhat.restype === RES_DUMP_GLYPHIDS) {
            if (findwhat.reserved) {
                fp = findwhat.reserved;
                dump_ids = true;
            } else {
                return 0;
            }
        }
        if (findwhat.restype === RES_FILL_CACHE) {
            if (findwhat.reserved && findwhat.reserved === glyphidCache) {
                filling_cache = true;
            } else {
                return 0;
            }
        }
    }

    is_G = id != null && id[0] === 'G' && id[1] === '_';
    is_S = id != null && id[0] === 'S' && id[1] === '_';

    if ((is_G && !glyphidCache) || filling_cache || dump_ids || is_S) {
        for (let i = 0; i < LOADSYMS.length; i++) {
            if (!pm_offset && LOADSYMS[i][0] === SYM_MON) pm_offset = i;
            if (!pm_count && pm_offset && LOADSYMS[i][0] !== SYM_MON) {
                pm_count = i - pm_offset;
            }
            if (!oc_offset && LOADSYMS[i][0] === SYM_OC) oc_offset = i;
            if (!oc_count && oc_offset && LOADSYMS[i][0] !== SYM_OC) {
                oc_count = i - oc_offset;
            }
            if (!cmap_offset && LOADSYMS[i][0] === SYM_PCHAR) cmap_offset = i;
            if (!cmap_count && cmap_offset && LOADSYMS[i][0] !== SYM_PCHAR) {
                cmap_count = i - cmap_offset;
            }
        }
    }
    if (is_G || filling_cache || dump_ids) {
        if (!filling_cache && id != null && glyphidCache) {
            const val = find_glyph_in_cache(id);
            if (val >= 0) {
                findwhat.findtype = FIND_GLYPH;
                findwhat.val = val;
                findwhat.loadsyms_offset = 0;
                return 1;
            } else {
                return 0;
            }
        } else {
            /* individual matching glyph entries */
            for (let glyph = 0; glyph < MAX_GLYPH; ++glyph) {
                skip_base = false;
                skip_this_one = false;
                let b0 = '';
                if (glyph_is_monster(glyph)) {
                    /* b2 will hold the distinguishing prefix */
                    /* b3 will hold the base name */
                    let b2 = '';
                    const b3 = monsterNames[glyph_to_mon(glyph)].slice(3);

                    if (glyph_is_normal_male_monster(glyph)) {
                        b2 = 'male_';
                    } else if (glyph_is_normal_female_monster(glyph)) {
                        b2 = 'female_';
                    } else if (glyph_is_ridden_male_monster(glyph)) {
                        b2 = 'ridden_male_';
                    } else if (glyph_is_ridden_female_monster(glyph)) {
                        b2 = 'ridden_female_';
                    } else if (glyph_is_detected_male_monster(glyph)) {
                        b2 = 'detected_male_';
                    } else if (glyph_is_detected_female_monster(glyph)) {
                        b2 = 'detected_female_';
                    } else if (glyph_is_male_pet(glyph)) {
                        b2 = 'pet_male_';
                    } else if (glyph_is_female_pet(glyph)) {
                        b2 = 'pet_female_';
                    }
                    b0 = 'G_' + b2 + b3;
                } else if (glyph_is_body(glyph)) {
                    /* b2 will hold the distinguishing prefix */
                    /* b3 will hold the base name */
                    const b2 = glyph_is_body_piletop(glyph)
                        ? 'piletop_body_'
                        : 'body_';
                    const b3 = monsterNames[glyph_to_body_corpsenm(glyph)].slice(3);
                    b0 = 'G_' + b2 + b3;
                } else if (glyph_is_statue(glyph)) {
                    /* b2 will hold the distinguishing prefix */
                    /* b3 will hold the base name */
                    const b2 = glyph_is_fem_statue_piletop(glyph)
                        ? 'piletop_statue_of_female_'
                        : glyph_is_fem_statue(glyph)
                          ? 'statue_of_female_'
                          : glyph_is_male_statue_piletop(glyph)
                            ? 'piletop_statue_of_male_'
                            : glyph_is_male_statue(glyph)
                              ? 'statue_of_male_'
                              : ''; /* shouldn't happen */
                    const b3 = monsterNames[glyph_to_statue_corpsenm(glyph)].slice(3);
                    b0 = 'G_' + b2 + b3;
                } else if (glyph_is_object(glyph)) {
                    const otyp = glyph_to_obj(glyph);
                    /* b2 will hold the distinguishing prefix */
                    /* b3 will hold the base name */
                    if (((otyp > SCR_STINKING_CLOUD) && (otyp < SCR_MAIL))
                        || ((otyp > WAN_LIGHTNING) && (otyp < GOLD_PIECE))) {
                        skip_this_one = true;
                    }
                    if (!skip_this_one) {
                        let b2;
                        if (otyp >= WAN_LIGHT && otyp <= WAN_LIGHTNING) {
                            b2 = 'wand of ';
                        } else if (otyp >= SPE_DIG && otyp < SPE_BLANK_PAPER) {
                            b2 = 'spellbook of ';
                        } else if (otyp >= SCR_ENCHANT_ARMOR
                            && otyp <= SCR_STINKING_CLOUD) {
                            b2 = 'scroll of ';
                        } else if (otyp >= POT_GAIN_ABILITY && otyp <= POT_WATER) {
                            b2 = otyp === POT_WATER ? 'flask of n' : 'potion of ';
                        } else if (otyp >= RIN_ADORNMENT
                            && otyp <= RIN_PROTECTION_FROM_SHAPE_CHAN) {
                            b2 = 'ring of ';
                        } else if (otyp === LAND_MINE) {
                            b2 = 'unset ';
                        } else {
                            b2 = '';
                        }
                        const b3 = otyp === SCR_BLANK_PAPER ? 'blank scroll'
                            : otyp === SPE_BLANK_PAPER ? 'blank spellbook'
                            : otyp === SLIME_MOLD ? 'slime mold'
                            : (objectNameStrs[otyp] ?? objectDescrs[otyp]);
                        b0 = 'G_'
                            + (glyph_is_normal_piletop_obj(glyph) ? 'piletop_' : '')
                            + b2 + b3;
                    }
                } else if (glyph_is_cmap(glyph) || glyph_is_cmap_zap(glyph)
                    || glyph_is_swallow(glyph) || glyph_is_explosion(glyph)) {
                    let cmap = -1;

                    /* b2 will hold the distinguishing prefix */
                    /* b3 will hold the base name */
                    /* b4 will hold the distinguishing suffix */
                    let b2 = '';
                    let b3 = '';
                    let b4 = '';
                    if (glyph === GLYPH_CMAP_OFF) {
                        cmap = S_stone;
                        b3 = 'stone substrate';
                        skip_base = true;
                    } else if (glyph_is_cmap_gehennom(glyph)) {
                        cmap = (glyph - GLYPH_CMAP_GEH_OFF) + S_vwall;
                        b4 = '_gehennom';
                    } else if (glyph_is_cmap_knox(glyph)) {
                        cmap = (glyph - GLYPH_CMAP_KNOX_OFF) + S_vwall;
                        b4 = '_knox';
                    } else if (glyph_is_cmap_main(glyph)) {
                        cmap = (glyph - GLYPH_CMAP_MAIN_OFF) + S_vwall;
                        b4 = '_main';
                    } else if (glyph_is_cmap_mines(glyph)) {
                        cmap = (glyph - GLYPH_CMAP_MINES_OFF) + S_vwall;
                        b4 = '_mines';
                    } else if (glyph_is_cmap_sokoban(glyph)) {
                        cmap = (glyph - GLYPH_CMAP_SOKO_OFF) + S_vwall;
                        b4 = '_sokoban';
                    } else if (glyph_is_cmap_a(glyph)) {
                        cmap = (glyph - GLYPH_CMAP_A_OFF) + S_ndoor;
                    } else if (glyph_is_cmap_altar(glyph)) {
                        const j = glyph - GLYPH_ALTAR_OFF;
                        cmap = S_altar;
                        if (j !== altar_other) {
                            b2 = PARSE_ALTAR_TEXT[j] + '_';
                        } else {
                            b3 = 'altar other';
                            skip_base = true;
                        }
                    } else if (glyph_is_cmap_b(glyph)) {
                        cmap = (glyph - GLYPH_CMAP_B_OFF) + S_grave;
                    } else if (glyph_is_cmap_zap(glyph)) {
                        const j = glyph - GLYPH_ZAP_OFF;
                        cmap = (j % 4) + S_vbeam;
                        const fixed = fix_glyphname(
                            LOADSYMS[cmap + cmap_offset][2].slice(2));
                        b3 = PARSE_ZAP_TEXTS[Math.trunc(j / 4)]
                            + ' zap ' + fixed;
                        b2 = '';
                        skip_base = true;
                    } else if (glyph_is_cmap_c(glyph)) {
                        cmap = (glyph - GLYPH_CMAP_C_OFF) + S_digbeam;
                    } else if (glyph_is_swallow(glyph)) {
                        const j = glyph - GLYPH_SWALLOW_OFF;
                        cmap = glyph_to_swallow(glyph);
                        /* (S_sw_br - S_sw_tl) + 1 = 8 swallow cells (defsym.h). */
                        const mnum = Math.trunc(j / 8);
                        b3 = 'swallow ' + monsterNames[mnum].slice(3)
                            + ' ' + PARSE_SWALLOW_TEXTS[cmap];
                        skip_base = true;
                    } else if (glyph_is_explosion(glyph)) {
                        const j = glyph - GLYPH_EXPLODE_OFF;
                        const expl = Math.trunc(
                            j / ((S_expl_br - S_expl_tl) + 1));
                        cmap = glyph_to_explosion(glyph) + S_expl_tl;
                        const ci = cmap - S_expl_tl;
                        b2 = PARSE_EXPL_TYPE_TEXTS[expl] + ' ';
                        b3 = 'expl_' + PARSE_EXPL_TEXTS[ci];
                        skip_base = true;
                    }
                    if (!skip_base) {
                        if (cmap >= 0 && cmap < MAXPCHARS) {
                            b3 = LOADSYMS[cmap + cmap_offset][2].slice(2);
                        }
                    }
                    b0 = 'G_' + b2 + b3 + b4;
                } else if (glyph_is_invisible_id(glyph)) {
                    b0 = 'G_invisible';
                } else if (glyph_is_nothing(glyph)) {
                    b0 = 'G_nothing';
                } else if (glyph_is_unexplored(glyph)) {
                    b0 = 'G_unexplored';
                } else if (glyph_is_warning(glyph)) {
                    const j = glyph - GLYPH_WARNING_OFF;
                    b0 = 'G_warning' + j;
                }
                if (b0.length >= QBUFSZ) {
                    throw new Error('parse_id: buf[0] overflowed');
                }
                if (!skip_this_one) {
                    b0 = 'G_' + fix_glyphname(b0.slice(2));
                    if (dump_ids) {
                        fp('(' + String(glyph).padStart(4, '0') + ') ' + b0);
                    } else if (filling_cache) {
                        add_glyph_to_cache(glyph, b0);
                    } else if (id != null) {
                        if (strcmpi(id, b0) === 0) {
                            findwhat.findtype = FIND_GLYPH;
                            findwhat.val = glyph;
                            findwhat.loadsyms_offset = 0;
                            return 1;
                        }
                    }
                }
            }
        } /* not glyphid_cache */
    } else if (is_S) {
        /* cmap entries */
        for (let i = 0; i < cmap_count; ++i) {
            if (strcmpi(LOADSYMS[i + cmap_offset][2].slice(2), id.slice(2)) === 0) {
                findwhat.findtype = FIND_CMAP;
                findwhat.val = i;
                findwhat.loadsyms_offset = i + cmap_offset;
                return 1;
            }
        }
        /* objclass entries */
        for (let i = 0; i < oc_count; ++i) {
            if (strcmpi(LOADSYMS[i + oc_offset][2].slice(2), id.slice(2)) === 0) {
                findwhat.findtype = FIND_OC;
                findwhat.val = i;
                findwhat.loadsyms_offset = i + oc_offset;
                return 1;
            }
        }
        /* permonst entries */
        for (let i = 0; i <= pm_count; ++i) {
            if (strcmpi(LOADSYMS[i + pm_offset][2].slice(2), id.slice(2)) === 0) {
                findwhat.findtype = FIND_PM;
                findwhat.val = i + 1; /* starts at 1 */
                findwhat.loadsyms_offset = i + pm_offset;
                return 1;
            }
        }
    }
    if (dump_ids || filling_cache) return 1;
    findwhat.findtype = FIND_NOTHING;
    findwhat.val = 0;
    findwhat.loadsyms_offset = 0;
    return 0;
}

/**
 * C glyphs.c glyph_find_core `:234–283` (staticfn) — run parse_id, then
 * fan out: a `find_glyph` hit calls back once, otherwise every glyph whose
 * cmap / mlet / otyp matches is called back in glyph order.
 *
 * Exported although C marks it staticfn (same reason as parse_id above).
 */
export function glyph_find_core(id, findwhat) {
    if (parse_id(id, findwhat)) {
        if (findwhat.findtype === FIND_GLYPH) {
            findwhat.callback(findwhat.val, findwhat);
        } else {
            for (let glyph = 0; glyph < MAX_GLYPH; ++glyph) {
                let do_callback = false;
                let end_find = false;
                switch (findwhat.findtype) {
                case FIND_CMAP:
                    if (glyph_to_cmap(glyph) === findwhat.val) {
                        do_callback = true;
                    }
                    break;
                case FIND_PM:
                    if (glyph_is_monster(glyph)
                        && MLET_ORDINAL.get(mlets[glyph_to_mon(glyph)])
                            === findwhat.val) {
                        do_callback = true;
                    }
                    break;
                case FIND_OC:
                    if (glyph_is_object(glyph)
                        && glyph_to_obj(glyph) === findwhat.val) {
                        do_callback = true;
                    }
                    break;
                case FIND_GLYPH:
                    if (glyph === findwhat.val) {
                        do_callback = true;
                        end_find = true;
                    }
                    break;
                case FIND_NOTHING:
                default:
                    end_find = true;
                    break;
                }
                if (do_callback) {
                    findwhat.callback(glyph, findwhat);
                }
                if (end_find) break;
            }
        }
        return 1;
    }
    return 0;
}

/* C sym.h:132–136 — `enum do_customizations` (bitmask over the
   apply_customizations arms). */
const DO_CUSTOM_NONE = 0, DO_CUSTOM_COLORS = 1, DO_CUSTOM_SYMBOLS = 2;
/* C glyphs.c:35 — `static const long nonzero_black` (CLR_BLACK is 0, so
   this is NH_BASIC_COLOR: the "valid color 0" marker bit). */
const NONZERO_BLACK = CLR_BLACK | NH_BASIC_COLOR;
/* C glyphs.c:33 — `static struct find_struct to_custom_symbol_find`
   (BSS-zero; reset from zero_find on every glyphrep call). */
let toCustomSymbolFind = zero_find();
/* C glyphs.c:84/97 — function-static config-error nags. */
let glyphNag = 0, colorNag = 0;

/**
 * C glyphs.c to_custom_symset_entry_callback `:53–104` (staticfn) —
 * glyph_find_core callback for customization writes: record the glyph
 * number through extraval, then file the U+ entry (unicode_val +
 * unicodeval_to_utf8str gate) and/or the color entry under the current
 * symset name. The ENHANCED_SYMBOLS unicode arm is live (config.h:368).
 * `String.fromCodePoint(uval)` is the character the accepted utf8 bytes
 * encode (the encoder rejects surrogates and >U+10FFFF, so it cannot
 * throw); urep utf8str is write-only in JS (shuffle_customizations
 * round-trips it as a string via dupstr). Module-local like C.
 */
function to_custom_symset_entry_callback(glyph, findwhat) {
    const idx = game.gs?.symset_which_set | 0; // C :57 (BSS 0; no JS writers yet)
    const utf8str = [0, 0, 0, 0, 0, 0]; // C :59 uint8[6] = {0}
    let uval = 0; // C :60
    if (findwhat.extraval) // C :63–64
        findwhat.extraval.v = glyph | 0;
    /* C :66 assert(idx range) — elided (BSS-range by construction). */
    if (findwhat.unicode_val) // C :68
        uval = unicode_val(findwhat.unicode_val); // C :69
    if (uval && unicodeval_to_utf8str(uval, utf8str, utf8str.length)) { // C :70
        /* C :71–79 symset-context guard (FIXME preserved in the nag arm). */
        const symName = game.gs?.symset?.[idx]?.name ?? null;
        if (symName) { // C :80
            add_custom_urep_entry(symName, glyph, uval, // C :81–82
                String.fromCodePoint(uval), game.gs?.symset_which_set | 0);
        } else {
            if (!glyphNag++) // C :84–86 static nag
                config_error_add('Unimplemented customization feature,' // C :87–88
                    + ' ignoring for now');
        }
    }
    if (findwhat.color !== 0) { // C :92
        const symName = game.gs?.symset?.[idx]?.name ?? null;
        if (symName) { // C :93
            add_custom_nhcolor_entry(symName, glyph, // C :94–95
                findwhat.color, game.gs?.symset_which_set | 0);
        } else {
            if (!colorNag++) // C :97–99 static nag
                config_error_add('Unimplemented customization feature,' // C :100–101
                    + ' ignoring for now');
        }
    }
}

/**
 * C glyphs.c glyphrep_to_custom_map_entries `:112–181` (global;
 * extern.h:1160) — parse one `glyphid[:U+xxxx][/rrr-ggg-bbb]` spec into
 * the shared to_custom_symbol_find record and run glyph_find_core over
 * it (matches land via to_custom_symset_entry_callback above).
 * The `:`/`/` cuts land after the LAST separator of each kind, and each
 * value runs to the next cut of either kind (the C `:129–149` pointer
 * trace); a lone leading space is skipped once for the id and color, all
 * spaces for the codepoint, and an emptied codepoint is dropped
 * (`:150–161`). Color 0 keeps a nonzero_black marker bit so "set" differs
 * from "unset" (`:165–173`). `glyphptr` is a `{ v }` out-box (the
 * closest_color/options.js precedent) or null — the live parsesymbols
 * `:837` caller (options.js) passes none because C never reads `glyph`
 * after. Other C callers: glyphrep `:477`, optfn_glyph options.c:1836,
 * parse_sym_line symbols.c:641/648 (all unported — map-named).
 * The `:122–124` no-cache `reslt = 1` is dead (overwritten by the
 * glyph_find_core return below); parse_id's no-cache arm still applies.
 */
export function glyphrep_to_custom_map_entries(op, glyphptr) {
    toCustomSymbolFind = zero_find(); // C :116
    const raw = String(op ?? ''); // C :126 Snprintf(buf, "%s", op)
    const nz = raw.indexOf('\0');
    const buf = nz < 0 ? raw : raw.slice(0, nz);
    let rgb = 0; // C :119 long
    /* C :129–149 colon/slash scan with NUL cuts. */
    const cuts = [];
    for (let i = 0; i < buf.length; i++) {
        if (buf[i] === ':' || buf[i] === '/') cuts.push(i); // C :130–139
    }
    const firstCut = cuts.length ? cuts[0] : buf.length;
    let cGlyphid = buf.slice(0, firstCut); // C :128 c_glyphid
    let cUnicode = null, cColorval = null; // C :127
    const lastColon = buf.lastIndexOf(':'); // C :141–144 (last ':' wins)
    if (lastColon >= 0) {
        let end = buf.length;
        for (const c of cuts) { if (c > lastColon) { end = c; break; } }
        cUnicode = buf.slice(lastColon + 1, end);
    }
    const lastSlash = buf.lastIndexOf('/'); // C :145–148 (last '/' wins)
    if (lastSlash >= 0) {
        let end = buf.length;
        for (const c of cuts) { if (c > lastSlash) { end = c; break; } }
        cColorval = buf.slice(lastSlash + 1, end);
    }
    /* C :150–161 sanity checks. */
    if (cGlyphid.startsWith(' ')) cGlyphid = cGlyphid.slice(1); // C :151–152
    if (cColorval !== null && cColorval.startsWith(' ')) // C :153–154
        cColorval = cColorval.slice(1);
    if (cUnicode !== null) { // C :155–159
        while (cUnicode.startsWith(' ')) cUnicode = cUnicode.slice(1);
    }
    if (cUnicode !== null && cUnicode.length === 0) cUnicode = null; // C :160–161
    if ((cColorval !== null && (rgb = rgbstr_to_int32(cColorval)) !== -1) // C :163
        || cColorval === null) { // C :164
        /* C :165–170 nonzero_black marker for valid color 0. */
        toCustomSymbolFind.color = (rgb === -1 || cColorval === null) ? 0 // C :171–173
            : (rgb === 0) ? NONZERO_BLACK
            : rgb;
    }
    if (cUnicode !== null) // C :175
        toCustomSymbolFind.unicode_val = cUnicode; // C :176
    toCustomSymbolFind.extraval = glyphptr ?? null; // C :177 int* (box or null)
    toCustomSymbolFind.callback = to_custom_symset_entry_callback; // C :178
    return glyph_find_core(cGlyphid, toCustomSymbolFind); // C :179–180
}

/**
 * C glyphs.c fill_glyphid_cache `:303–319` (global) — build the cache by
 * running parse_id in fill mode (options.c:4227/7155, symbols.c:1073,
 * wizcmds.c:1949 call this at startup/symset time; all unported, own rows).
 * The `reserved == glyphid_cache` identity gate is the live cache object.
 */
export function fill_glyphid_cache() {
    if (!glyphidCache) {
        init_glyph_cache();
    }
    if (glyphidCache) {
        const cache_find = zero_find();
        cache_find.findtype = FIND_NOTHING;
        cache_find.reserved = glyphidCache;
        cache_find.restype = RES_FILL_CACHE;
        if (!parse_id(null, cache_find)) {
            free_glyphid_cache();
        }
    }
}

/**
 * C glyphs.c dump_all_glyphids `:795–803` (global) — run parse_id in dump
 * mode. C takes `FILE *fp` (earlyarg.c:808 passes stdout); Rule #2 has no
 * stdio, so the JS signature takes a line-sink function receiving each
 * `(0000) G_...` record without its trailing newline.
 */
export function dump_all_glyphids(writeLine) {
    const dump_find = zero_find();
    dump_find.findtype = FIND_NOTHING;
    dump_find.reserved = writeLine;
    dump_find.restype = RES_DUMP_GLYPHIDS;
    parse_id(null, dump_find);
}

/* C sym.h:125–130 — `enum graphics_sets` (NUM_GRAPHICS counts
   PRIMARY+ROGUE; UNICODESET aliases NUM_GRAPHICS, hence the +1 row). */
const PRIMARYSET = 0, ROGUESET = 1, NUM_GRAPHICS = 2, UNICODESET = 2;
/* C sym.h:138–139 — `enum customization_types`. */
const CUSTOM_NONE = 0, CUSTOM_SYMBOLS = 1, CUSTOM_UREPS = 2,
    CUSTOM_NHCOLOR = 3, CUSTOM_COUNT = 4;

/*
 * C decl.h:857–860 — `gs.sym_customizations[NUM_GRAPHICS+1][custom_count]`
 * (BSS-zeroed: null name, 0 count, custom_none, null details chain).
 * Module-local like glyphidCache above; saveload stays unported (map-named,
 * no scored reach — the sole live writers are the add_custom_*_entry ports).
 */
function newSymsetCustomization() {
    return {
        customization_name: null, count: 0, custtype: CUSTOM_NONE,
        details: null, details_end: null,
    };
}
const sym_customizations = [];
for (let _s = 0; _s < NUM_GRAPHICS + 1; _s++) {
    const _row = [];
    for (let _t = 0; _t < CUSTOM_COUNT; _t++) _row.push(newSymsetCustomization());
    sym_customizations.push(_row);
}

/**
 * C glyphs.c find_matching_customization `:736–747` (global;
 * extern.h:1168) — return the details chain for (name, custtype, set) or
 * null. `strcmp` ≡ `===` (ASCII symset names); the name check is
 * `!== null` (C tests the pointer — an empty name is still non-null).
 */
export function find_matching_customization(customization_name, custtype, which_set) {
    const gdc = sym_customizations[which_set | 0][custtype | 0];
    if (gdc.custtype === (custtype | 0) && gdc.customization_name !== null
        && String(customization_name) === gdc.customization_name)
        return gdc.details;
    return null;
}

/**
 * C glyphs.c add_custom_nhcolor_entry `:484–528` (global; extern.h:1165) —
 * record an nhcolor customization for one glyph of one symset: update the
 * existing detail for glyphidx, else append a new detail. Returns 1.
 * `dupstr` ≡ String assignment (JS strings are immutable); `alloc` ≡ object
 * literal (JS GC frees, cf. free_glyphid_cache above). Sole C caller is the
 * live to_custom_symset_entry_callback above (glyphs.c:94).
 */
export function add_custom_nhcolor_entry(customization_name, glyphidx, nhcolor, which_set) {
    const gdc = sym_customizations[which_set | 0][CUSTOM_NHCOLOR];
    const glyph = glyphidx | 0;
    const color = nhcolor >>> 0;
    let details, newdetails = null;

    if (!gdc.details) {
        gdc.customization_name = String(customization_name);
        gdc.custtype = CUSTOM_NHCOLOR;
        gdc.details = null;
        gdc.details_end = null;
    }
    details = find_matching_customization(
        customization_name, CUSTOM_NHCOLOR, which_set);
    if (details) {
        while (details) {
            if (details.content.ccolor.glyphidx === glyph) {
                details.content.ccolor.nhcolor = color;
                return 1;
            }
            details = details.next;
        }
    }
    /* create new details entry */
    /* C `:523–524` writes glyphidx through the urep arm and nhcolor through
       the ccolor arm of `union customization_content` (sym.h:153–157) — the
       same storage; JS keeps the one ccolor record. */
    newdetails = {
        content: { ccolor: { glyphidx: glyph, nhcolor: color } },
        next: null,
    };
    if (gdc.details === null) {
        gdc.details = newdetails;
    } else {
        gdc.details_end.next = newdetails;
    }
    gdc.details_end = newdetails;
    gdc.count++;
    return 1;
}

/**
 * C utf8map.c add_custom_urep_entry `:148–207` (#ifdef ENHANCED_SYMBOLS,
 * live; extern.h) — record a unicode-rep customization for one glyph of
 * one symset: refresh the existing detail for glyphidx (clearing the old
 * utf8str, then setting or clearing the pair on utf32ch, `:170–181`),
 * else append a new detail (`:186–206`). Mirrors add_custom_nhcolor_entry
 * above (same grid, same FIXME on the find_matching call, `:166–167`).
 * `utf8str` is the JS string for the bytes (dupstr ≡ String assignment,
 * immutable strings). Sole C caller is the live
 * to_custom_symset_entry_callback above (glyphs.c:81).
 */
export function add_custom_urep_entry(customization_name, glyphidx, utf32ch, utf8str, which_set) {
    const gdc = sym_customizations[which_set | 0][CUSTOM_UREPS]; // C :155–156
    const glyph = glyphidx | 0; // C :150 int
    const uch = (utf32ch ?? 0) >>> 0; // C :151 uint32
    let details, newdetails = null; // C :157 (= 0)

    if (!gdc.details) { // C :160
        gdc.customization_name = String(customization_name); // C :161 dupstr
        gdc.custtype = CUSTOM_UREPS; // C :162
        gdc.details = null; // C :163–164
        gdc.details_end = null;
    }
    details = find_matching_customization( // C :166–167 (FIXME kept)
        customization_name, CUSTOM_UREPS, which_set);
    if (details) { // C :168
        while (details) { // C :169
            if (details.content.urep.glyphidx === glyph) { // C :170
                if (details.content.urep.u.utf8str) // C :171–172 free
                    details.content.urep.u.utf8str = null;
                if (uch) { // C :173
                    details.content.urep.u.utf8str = // C :174–175 dupstr
                        dupstr(utf8str);
                    details.content.urep.u.utf32ch = uch; // C :176
                } else { // C :177
                    details.content.urep.u.utf8str = null; // C :178
                    details.content.urep.u.utf32ch = 0; // C :179
                }
                return 1; // C :181
            }
            details = details.next; // C :183
        }
    }
    /* create new details entry */ // C :186
    newdetails = { // C :187–188 alloc
        content: {
            urep: {
                glyphidx: glyph, // C :189
                u: {
                    utf8str: (utf8str && String(utf8str).length) // C :190–196
                        ? dupstr(utf8str) : null,
                    utf32ch: uch, // C :197
                },
            },
        },
        next: null, // C :198
    };
    if (gdc.details === null) { // C :199
        gdc.details = newdetails; // C :200
    } else { // C :201
        gdc.details_end.next = newdetails; // C :202
    }
    gdc.details_end = newdetails; // C :204
    gdc.count++; // C :205
    return 1; // C :206
}

/**
 * C glyphs.c apply_customizations `:531–574` (global; extern.h:1181) —
 * stamp one set's customization details onto the glyphmap array (not the
 * symset entries, `:547–548`): urep details via set_map_u under the
 * H_UTF8 handling gate (`:552–560`, ENHANCED_SYMBOLS live), nhcolor
 * details via set_map_customcolor (`:562–568`). Any surviving cell sets
 * iflags.pending_customizations for maybe_shuffle_customizations above.
 * C callers: reset_customcolors `:1182`, initoptions_finish
 * options.c:7379, load_symset symbols.c:683, do_symset symbols.c:1095
 * (all unported — map-named), reset_customsymbols utf8map.c:215
 * (live below).
 */
export function apply_customizations(which_set, docustomize) {
    const set = which_set | 0; // C :532 enum graphics_sets
    const cust = docustomize | 0; // C :533 enum do_customizations
    let atLeastOne = false; // C :538
    const doColors = (cust & DO_CUSTOM_COLORS) !== 0; // C :539
    const doSymbols = (cust & DO_CUSTOM_SYMBOLS) !== 0; // C :540
    const iflags = game.iflags || (game.iflags = {}); // C iflags (BSS-true reads below)
    const gm = ensure_glyphmap(); // C glyphmap[MAX_GLYPH]

    for (let custs = 0; custs < CUSTOM_COUNT; ++custs) { // C :543 custom_count
        const sc = sym_customizations[set][custs]; // C :544
        if (sc.count !== 0 && sc.details !== null) { // C :545
            atLeastOne = true; // C :546
            /* C :547–548 glyphmap array, not symset entries. */
            let details = sc.details; // C :549
            while (details) { // C :550
                if (iflags.customsymbols && doSymbols) { // C :552
                    if (sc.custtype === CUSTOM_UREPS) { // C :553
                        const gmap = gm[details.content.urep.glyphidx]; // C :554
                        if (game.gs?.symset?.[set]?.handling === H_UTF8) // C :555
                            set_map_u(gmap, // C :556–558 (void)
                                details.content.urep.u.utf32ch,
                                details.content.urep.u.utf8str);
                    }
                }
                if (iflags.customcolors && doColors) { // C :562
                    if (sc.custtype === CUSTOM_NHCOLOR) { // C :563
                        const gmap = gm[details.content.ccolor.glyphidx]; // C :564
                        set_map_customcolor(gmap, // C :565–566 (void)
                            details.content.ccolor.nhcolor);
                    }
                }
                details = details.next; // C :569
            }
        }
    }
    iflags.pending_customizations = atLeastOne; // C :573
}

/**
 * C utf8map.c free_all_glyphmap_u `:59–80` (#ifdef ENHANCED_SYMBOLS, live —
 * config.h:368) — drop every glyphmap cell's unicode_representation
 * (utf8str first, then the record; C `free` ≡ null, JS GC collects) so a
 * later apply_customizations restamps from a clean table. C callers:
 * reset_customsymbols utf8map.c:214 (wired below) + clear_symsetentry
 * symbols.c:345 (unported — map-named).
 * Named: the `:74–79` gg.gbuf glyphinfo.gm.u NULL sweep — JS keeps no
 * per-cell glyph_map copies (map_glyphinfo builds fresh records, D-1983;
 * the only `.u` readers walk the live array), so no dangling `.u`
 * references exist to clear.
 */
export function free_all_glyphmap_u() {
    const gm = game.glyphmap; // C glyphmap[MAX_GLYPH] (lazy in JS — absent ≡ all-NULL BSS)
    if (gm && gm.length === MAX_GLYPH) { // C :64 loop over the table
        for (let glyph = 0; glyph < MAX_GLYPH; ++glyph) { // C :64
            if (gm[glyph].u != null) { // C :65
                if (gm[glyph].u.utf8str != null) { // C :66
                    gm[glyph].u.utf8str = null; // C :67–68 free (GC)
                }
                gm[glyph].u = null; // C :70–71 free (GC)
            }
        }
    }
    /* C :74–79 gbuf sweep — named omit (see doc above): no JS gbuf holds gm copies. */
}

/**
 * C utf8map.c reset_customsymbols `:211–217` (#ifdef ENHANCED_SYMBOLS,
 * live) — drop all glyphmap unicode data, then restamp the active set's
 * symbol customizations. Sole C caller: reset_needed_visuals
 * options.c:8996 (wired in js/options.js).
 */
export function reset_customsymbols() {
    free_all_glyphmap_u(); // C :214
    apply_customizations(game.currentgraphics | 0, DO_CUSTOM_SYMBOLS); // C :215 (sym.h do_custom_symbols = 2; gc.currentgraphics ≡ game.currentgraphics)
}

/**
 * C glyphs.c clear_all_glyphmap_colors `:1166–1176` (global) — zero every
 * glyph's customcolor (guarded, `:1172–1173`) and color256idx (`:1174`).
 * JS keeps glyphmap lazy (absent/short ≡ all-NULL BSS, already zeros),
 * so an absent table is already clear and nothing is ensured here
 * (free_all_glyphmap_u guard precedent). C callers: reset_customcolors
 * `:1181` (wired below) + clear_symsetentry (symbols.c:348, unported —
 * named in the D-log).
 */
export function clear_all_glyphmap_colors() {
    const gm = game.glyphmap; // C glyphmap[MAX_GLYPH] (lazy in JS — absent ≡ all-NULL BSS)
    if (gm && gm.length === MAX_GLYPH) {
        for (let glyph = 0; glyph < MAX_GLYPH; ++glyph) { // C `:1171`
            if (gm[glyph].customcolor) // C `:1172`
                gm[glyph].customcolor = 0; // C `:1173`
            gm[glyph].color256idx = 0; // C `:1174`
        }
    }
}

/**
 * C glyphs.c reset_customcolors `:1178–1183` (global) — drop all glyphmap
 * color data, then restamp the active set's color customizations.
 * C caller: reset_needed_visuals options.c:8994 (wired in js/options.js).
 * Mirrors reset_customsymbols above (D-3065).
 */
export function reset_customcolors() {
    clear_all_glyphmap_colors(); // C `:1181`
    apply_customizations(game.currentgraphics | 0, DO_CUSTOM_COLORS); // C `:1182` (sym.h do_custom_colors = 1; gc.currentgraphics ≡ game.currentgraphics)
}

/**
 * C glyphs.c purge_all_custom_entries `:751–758` (global; extern.h:1184) —
 * drop every set's customization details, sets 0..NUM_GRAPHICS inclusive
 * (the +1 row is UNICODESET, cf. the grid above). Sole C caller is
 * freedynamicdata (save.c:1090, save-freeing infra, unported — map-named).
 */
export function purge_all_custom_entries() {
    for (let i = 0; i < NUM_GRAPHICS + 1; ++i) {
        purge_custom_entries(i);
    }
}

/**
 * C glyphs.c purge_custom_entries `:761–794` (staticfn; glyphs.c:50) —
 * free one set's customization detail chains and reset each cell to the
 * BSS end state (null name, 0 count, null details chain). Module-local
 * like C (cf. find_glyphid_in_cache_by_glyphnum above). C `free` ≡ unlink
 * (JS GC collects); the per-arm payload clearing still runs in C order
 * under the `gdc.custtype` guard (urep utf8str / sym symparse+val /
 * ccolor nhcolor+glyphidx) so the end state matches C once the
 * add_custom_symbols/ureps writers land. C callers: the export above
 * (wired) + clear_symsetentry (symbols.c:347, unported — map-named).
 */
function purge_custom_entries(which_set) {
    const set = which_set | 0;
    for (let custtype = CUSTOM_NONE; custtype < CUSTOM_COUNT; ++custtype) {
        const gdc = sym_customizations[set][custtype];
        let details = gdc.details;
        while (details) {
            const next = details.next;
            if (gdc.custtype === CUSTOM_UREPS) {
                if (details.content && details.content.urep
                    && details.content.urep.u)
                    details.content.urep.u.utf8str = null;
            } else if (gdc.custtype === CUSTOM_SYMBOLS) {
                if (details.content && details.content.sym) {
                    details.content.sym.symparse = null;
                    details.content.sym.val = 0;
                }
            } else if (gdc.custtype === CUSTOM_NHCOLOR) {
                if (details.content && details.content.ccolor) {
                    details.content.ccolor.nhcolor = 0;
                    details.content.ccolor.glyphidx = 0;
                }
            }
            details = next;
        }
        gdc.details = null;
        gdc.details_end = null;
        if (gdc.customization_name !== null)
            gdc.customization_name = null;
        gdc.count = 0;
    }
}

/* C glyphs.c find_glyphid_in_cache_by_glyphnum `:418–432` (staticfn) —
   linear scan for the first bucket holding glyphnum; null id ≡ C `id==0`. */
function find_glyphid_in_cache_by_glyphnum(glyphnum) {
    if (!glyphidCache) return null;
    for (let idx = 0; idx < glyphidCacheSize; ++idx) {
        if (glyphidCache[idx].glyphnum === (glyphnum | 0)
            && glyphidCache[idx].id !== null) {
            /* Match found */
            return glyphidCache[idx].id;
        }
    }
    return null;
}

/**
 * C display.c:1672 `glyph_map glyphmap[MAX_GLYPH]` — one explicit element
 * (`sym.color = NO_COLOR`), then C zero-fills the rest. Created lazily
 * on first use (shuffle, `#wizcustom` fill); `reset_glyphmap` still does
 * not fill `sym` / `tileidx`.
 * @returns {object[]}
 */
export function ensure_glyphmap() {
    if (game.glyphmap && game.glyphmap.length === MAX_GLYPH) return game.glyphmap;
    const gm = new Array(MAX_GLYPH);
    for (let i = 0; i < MAX_GLYPH; i++) {
        gm[i] = {
            glyphflags: 0,
            sym: { color: 0, symidx: 0 },
            customcolor: 0,
            color256idx: 0,
            tileidx: 0,
            u: null,
        };
    }
    gm[0].sym.color = NO_COLOR;
    game.glyphmap = gm;
    return gm;
}

/**
 * C glyphs.c maybe_shuffle_customizations `:580–587` (global). One caller,
 * `moveloop_core` (`allmain.c:189–190`).
 */
export function maybe_shuffle_customizations() {
    const iflags = game.iflags;
    if (iflags && iflags.pending_customizations) {
        shuffle_customizations();
        iflags.pending_customizations = 0;
    }
}

/**
 * C glyphs.c shuffle_customizations `:644–732` (staticfn). The `#if 0`
 * body at `:591–642` is not this build. `ENHANCED_SYMBOLS` is defined
 * (`config.h:368`; `config1.h` undefines it only for MSDOS), so the
 * unicode arms are compiled. Gem-description shuffle can repeat
 * `oc_descr_idx`; a repeated index copies `customcolor` / `color256idx`
 * by value and `alloc`s a distinct `unicode_representation` (`dupstr` of
 * `utf8str`). `alloc` is an object literal; `free` drops the reference
 * after clearing `utf8str` (JS strings are immutable, so `dupstr` is the
 * dungeon.js export).
 */
function shuffle_customizations() {
    /* C `:648` static const int offsets[2]. */
    const offsets = [GLYPH_OBJ_OFF, GLYPH_OBJ_PILETOP_OFF];
    const gm = ensure_glyphmap();
    const objs = game.objects;

    for (let j = 0; j < offsets.length; j++) {
        const base = offsets[j];
        const tmp_u = new Array(NUM_OBJECTS);
        const tmp_customcolor = new Array(NUM_OBJECTS);
        const tmp_color256idx = new Array(NUM_OBJECTS);
        const duplicate = new Array(NUM_OBJECTS);
        let i;

        for (i = 0; i < NUM_OBJECTS; i++) {
            duplicate[i] = -1;
            tmp_u[i] = null;
            tmp_customcolor[i] = 0;
            tmp_color256idx[i] = 0;
        }
        for (i = 0; i < NUM_OBJECTS; i++) {
            const idx = objs[i].oc_descr_idx | 0;

            /*
             * Shuffling gem appearances can cause the same oc_descr_idx to
             * appear more than once. Detect this condition and ensure that
             * each pointer points to a unique allocation.
             */
            if (duplicate[idx] >= 0) {
                const other = tmp_u[duplicate[idx]];
                const other_customcolor = tmp_customcolor[duplicate[idx]];
                const other_color256idx = tmp_color256idx[duplicate[idx]];

                tmp_customcolor[i] = other_customcolor >>> 0;
                tmp_color256idx[i] = other_color256idx & 0xffff;
                if (other) {
                    /* C alloc(sizeof unicode_representation) + struct copy. */
                    tmp_u[i] = {
                        utf32ch: other.utf32ch >>> 0,
                        utf8str: null,
                    };
                    if (other.utf8str != null) {
                        tmp_u[i].utf8str = dupstr(other.utf8str);
                    }
                }
            } else {
                const src = gm[base + idx];
                tmp_customcolor[i] = src.customcolor >>> 0;
                tmp_color256idx[i] = src.color256idx & 0xffff;
                tmp_u[i] = src.u;
                if (src.u != null || (src.customcolor >>> 0) !== 0) {
                    duplicate[idx] = i;
                    src.u = null;
                    src.customcolor = 0;
                    src.color256idx = 0;
                }
            }
        }
        for (i = 0; i < NUM_OBJECTS; i++) {
            /* Some glyphmaps may not have been transferred */
            const dst = gm[base + i];
            if (dst.u != null) {
                dst.u.utf8str = null;
                dst.u = null;
            }
            dst.u = tmp_u[i];
            dst.customcolor = tmp_customcolor[i] >>> 0;
            dst.color256idx = tmp_color256idx[i] & 0xffff;
        }
    }
}

/**
 * C glyphs.c wizcustom_glyphids `:807–821` (global; extern.h:1177) —
 * `#wizcustom` menu fill (sole C caller wiz_custom, wizcmds.c:1967,
 * wired: wizcmds.js wiz_custom): every cached glyph id goes through wizcustom_callback
 * (wizcmds.c:1987, js/wizcmds.js — reads the live glyphmap array via
 * ensure_glyphmap; `reset_glyphmap` still does not fill `sym` /
 * `tileidx`, so uncustomized entries format from the zero-fill).
 * The guard, loop, cache scan, id gate and callback below are live.
 */
export function wizcustom_glyphids(win) {
    let id;
    if (!glyphidCache) return;
    for (let glyphnum = 0; glyphnum < MAX_GLYPH; ++glyphnum) {
        id = find_glyphid_in_cache_by_glyphnum(glyphnum);
        if (id) {
            wizcustom_callback(win, glyphnum, id); // C `:818`
        }
    }
}
