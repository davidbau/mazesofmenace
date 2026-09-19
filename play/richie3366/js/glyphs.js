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
    MAX_GLYPH, MAXPCHARS, S_sw_tl, altar_other,
    GLYPH_CMAP_OFF, GLYPH_CMAP_MAIN_OFF, GLYPH_CMAP_MINES_OFF,
    GLYPH_CMAP_GEH_OFF, GLYPH_CMAP_KNOX_OFF, GLYPH_CMAP_SOKO_OFF,
    GLYPH_CMAP_A_OFF, GLYPH_ALTAR_OFF, GLYPH_CMAP_B_OFF, GLYPH_ZAP_OFF,
    GLYPH_CMAP_C_OFF, GLYPH_SWALLOW_OFF, GLYPH_EXPLODE_OFF,
    GLYPH_EXPLODE_DARK_OFF, GLYPH_EXPLODE_NOXIOUS_OFF,
    GLYPH_EXPLODE_MUDDY_OFF, GLYPH_EXPLODE_WET_OFF,
    GLYPH_EXPLODE_MAGICAL_OFF, GLYPH_EXPLODE_FIERY_OFF,
    GLYPH_EXPLODE_FROSTY_OFF, GLYPH_WARNING_OFF,
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
} from './display.js';
import {
    S_stone, S_vwall, S_ndoor, S_altar, S_grave, S_digbeam, S_vbeam,
    S_goodpos, S_expl_tl, S_expl_br,
} from './const.js';
import { monsterNames, mlets, NUMMONS } from './generated/monsters_data.js';
import {
    objectNames, objectNameStrs, objectDescrs,
} from './generated/objects_data.js';
import {
    LOADSYMS, SYM_MON, SYM_OC, SYM_PCHAR,
} from './generated/glyphsyms_data.js';

/* C global.h:390 — `char buf[4][QBUFSZ]` in parse_id. */
const QBUFSZ = 128;
/* C glyphs.c:14 — `enum reserved_activities`. */
const RES_NOTHING = 0, RES_DUMP_GLYPHIDS = 1, RES_FILL_CACHE = 2;
/* C glyphs.c:15 — `enum things_to_find`. */
const FIND_NOTHING = 0, FIND_PM = 1, FIND_OC = 2, FIND_CMAP = 3, FIND_GLYPH = 4;
/* C defsym.h — 8 swallow cells S_sw_tl..S_sw_br (cf. display.js S_sw_tl). */
const S_sw_br = S_sw_tl + 7;

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

/* C glyphs.c free_glyphid_cache `:353–366` (global; JS GC frees the ids). */
export function free_glyphid_cache() {
    if (!glyphidCache) return;
    glyphidCache = null;
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

/* C defsym.h MONSYM(idx 1-based) + parse_id `:1093` `val = i + 1` — mlet
 * ordinal for glyph_find_core's find_pm arm (`mlet == val`). mlets[] holds
 * 'S_ANT'-style names; the MONSYMS loadsyms run is idx order. */
const MLET_ORDINAL = new Map();
{
    let k = 0;
    for (const [range, name] of LOADSYMS) {
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
                            LOADSYMS[cmap + cmap_offset][1].slice(2));
                        b3 = PARSE_ZAP_TEXTS[Math.trunc(j / 4)]
                            + ' zap ' + fixed;
                        b2 = '';
                        skip_base = true;
                    } else if (glyph_is_cmap_c(glyph)) {
                        cmap = (glyph - GLYPH_CMAP_C_OFF) + S_digbeam;
                    } else if (glyph_is_swallow(glyph)) {
                        const j = glyph - GLYPH_SWALLOW_OFF;
                        cmap = glyph_to_swallow(glyph);
                        const mnum = Math.trunc(j / ((S_sw_br - S_sw_tl) + 1));
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
                            b3 = LOADSYMS[cmap + cmap_offset][1].slice(2);
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
            if (strcmpi(LOADSYMS[i + cmap_offset][1].slice(2), id.slice(2)) === 0) {
                findwhat.findtype = FIND_CMAP;
                findwhat.val = i;
                findwhat.loadsyms_offset = i + cmap_offset;
                return 1;
            }
        }
        /* objclass entries */
        for (let i = 0; i < oc_count; ++i) {
            if (strcmpi(LOADSYMS[i + oc_offset][1].slice(2), id.slice(2)) === 0) {
                findwhat.findtype = FIND_OC;
                findwhat.val = i;
                findwhat.loadsyms_offset = i + oc_offset;
                return 1;
            }
        }
        /* permonst entries */
        for (let i = 0; i <= pm_count; ++i) {
            if (strcmpi(LOADSYMS[i + pm_offset][1].slice(2), id.slice(2)) === 0) {
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
