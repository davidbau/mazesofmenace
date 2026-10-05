// readobjnam.js — Wish object parsing (partial).
// C ref: objnam.c readobjnam / rnd_otyp_by_namedesc / wishymatch;
//        non-wizard spe clamp uses objects[].oc_charged (D-1690);
//        wish quan uses objects[].oc_merge (D-1712);
//        wish "poisoned " / permapoisoned (D-1732).

import { game } from './gstate.js';
import { rn2, rnd, rn1 } from './rng.js';
import { str_start_is, strstri, strsubst, mungspaces, strncmpi, fuzzymatch, copynchars, upstart } from './hacklib.js';
import { ALT_SPELLINGS } from './generated/alt_spellings.js';
import { LAST_REAL_GEM } from './generated/objects_data.js';
import {
    objectNames,
    objectNameStrs,
    objectDescrs,
    NUM_OBJECTS,
    MAXOCLASSES,
    ARMOR_CLASS,
    WEAPON_CLASS,
    WAND_CLASS,
    RING_CLASS,
    POTION_CLASS,
    SCROLL_CLASS,
    GEM_CLASS,
    AMULET_CLASS,
    SPBOOK_CLASS,
    TOOL_CLASS,
    FOOD_CLASS,
    VENOM_CLASS, ILLOBJ_CLASS,
    is_poisonable, def_char_to_objclass,
} from './objects.js';
import {
    mksobj, mkobj, weight, curse, oc_merge_of, spot_stop_timers, set_corpsenm, rnd_class, start_timer, objects_at,
    erosion_matters, is_flammable, is_rustprone, is_crackable,
    is_corrodeable, is_rottable, is_damageable,
    place_object, obj_extract_self,
} from './mkobj.js';
import { deltrap, t_at, trapname } from './trap.js';
import { delete_contents, obfree } from './shk.js';
import { artifact_name, nartifact_exist, permapoisoned, artifact_exists } from './artifact.js';
import { is_quest_artifact } from './quest.js';
import { oname, lookup_novel, safe_oname } from './do_name.js';
import { name_to_mon, name_to_monplus } from './mondata.js';
import { tin_variety_txt, set_tin_variety, obj_nutrition, consume_oeaten } from './eat.js';
import { makesingular, makeplural, An, an, japanese_otyp_by_name, maybereleaseobuf } from './objnam.js';
import { align_str } from './roles.js';
import { is_weptool, is_ammo, is_missile } from './wield.js';
import { Is_candle, begin_burn } from './timeout.js';
import { genus, dead_species, can_be_hatched, zombie_form } from './mon.js';
import { counter_were } from './were.js';
import {
    NON_PM, LOW_PM, monsterNames, mons, pmnames, G_UNIQ, G_NOCORPSE,
    is_male, is_female, is_neuter, is_human, is_were, verysmall,
} from './monsters.js';
import {
    BUFSZ,
    ONAME_WISH, SPE_LIM,
    MALE, FEMALE, NEUTRAL,
    CORPSTAT_RANDOM, CORPSTAT_NEUTER, CORPSTAT_FEMALE, CORPSTAT_MALE,
    CORPSTAT_HISTORIC,
    FOUNTAIN, THRONE, SINK, ALTAR, TREE, IRONBARS, CLOUD,
    POOL, MOAT, WATER, LAVAPOOL, LAVAWALL, ICE, ROOM,
    DRAWBRIDGE_UP, DRAWBRIDGE_DOWN, STAIRS, LADDER, SDOOR, DOOR,
    CORR, SCORR,
    HWALL, VWALL, DBWALL, COLNO, ROWNO, isok, Is_rogue_level,
    F_LOOTED, T_LOOTED, S_LPUDDING, S_LDWASHER, S_LRING,
    TREE_LOOTED, TREE_SWARM, ICED_POOL, ICED_MOAT,
    A_CHAOTIC, A_NEUTRAL, A_LAWFUL, A_NONE, Align2amask,
    IS_FOUNTAIN, IS_SINK, IS_GRAVE, IS_WALL, IS_DOOR, IS_FURNITURE,
    MAGIC_PORTAL, MELT_ICE_AWAY, TT_LAVA, TT_NONE,
    NO_TRAP, TRAPNUM, ROCKTRAP, is_hole, Can_fall_thru,
    D_NODOOR, D_BROKEN, D_ISOPEN, D_CLOSED, D_LOCKED, D_TRAPPED,
    WM_MASK, W_NONDIGGABLE, W_NONPASSWALL, RANDOM_TIN,
    P_HAMMER, P_POLEARMS,
    Is_box, Has_contents, BEAR_TRAP, LANDMINE,
    WT_IRON_BALL_INCR, ONAME_NO_FLAGS, TIMER_OBJECT, ZOMBIFY_MON,
    DB_UNDER, DB_MOAT, DB_LAVA, DB_ICE, DB_FLOOR, HAND, something,
} from './const.js';
import { obj_to_any } from './hack.js';

const STRANGE_OBJECT = 0;
const GRAY_DRAGON = monsterNames.indexOf('PM_GRAY_DRAGON');
const YELLOW_DRAGON = monsterNames.indexOf('PM_YELLOW_DRAGON');
const GRAY_DSM = objectNames.indexOf('GRAY_DRAGON_SCALE_MAIL');
const GRAY_DS = objectNames.indexOf('GRAY_DRAGON_SCALES');
const SCALE_MAIL = objectNames.indexOf('SCALE_MAIL');
const BELL_OF_OPENING = objectNames.indexOf('BELL_OF_OPENING');
const WAN_WISHING = objectNames.indexOf('WAN_WISHING');
const SPE_NOVEL = objectNames.indexOf('SPE_NOVEL');
const GOLD_PIECE = objectNames.indexOf('GOLD_PIECE');
const AMULET_OF_YENDOR = objectNames.indexOf('AMULET_OF_YENDOR');
const FAKE_AMULET_OF_YENDOR = objectNames.indexOf('FAKE_AMULET_OF_YENDOR');
const TIN = objectNames.indexOf('TIN');
const TOWEL = objectNames.indexOf('TOWEL');
const SLIME_MOLD = objectNames.indexOf('SLIME_MOLD');
const SKELETON_KEY = objectNames.indexOf('SKELETON_KEY');
const CHEST = objectNames.indexOf('CHEST');
const LARGE_BOX = objectNames.indexOf('LARGE_BOX');
const HEAVY_IRON_BALL = objectNames.indexOf('HEAVY_IRON_BALL');
const IRON_CHAIN = objectNames.indexOf('IRON_CHAIN');
const STATUE = objectNames.indexOf('STATUE');
const FIGURINE = objectNames.indexOf('FIGURINE');
const CORPSE = objectNames.indexOf('CORPSE');
const EGG = objectNames.indexOf('EGG');
const SCR_MAIL = objectNames.indexOf('SCR_MAIL');
const ACID_VENOM = objectNames.indexOf('ACID_VENOM');
const BLINDING_VENOM = objectNames.indexOf('BLINDING_VENOM');
const PM_LONG_WORM_TAIL = monsterNames.indexOf('PM_LONG_WORM_TAIL');
const PM_LONG_WORM = monsterNames.indexOf('PM_LONG_WORM');
const PM_MAIL_DAEMON = monsterNames.indexOf('PM_MAIL_DAEMON');
// C ref: objnam.c readobjnam_init `:3928–3930` — file-local tin-content tags.
const TIN_UNDEFINED = 0;
const TIN_EMPTY = 1;
const TIN_SPINACH = 2;
// C ref: monst.h MS_GUARDIAN (corpse `genus()` remap below).
const MS_GUARDIAN = 38;
// C ref: objnam.c spellings[] via scripts/extract-alt-spellings.py —
// resolve C ob names to object indices once (all 46 resolve; C order kept).
const ALT_SPELLINGS_RESOLVED = ALT_SPELLINGS.map(([sp, ob]) => [sp, objectNames.indexOf(ob)]);
const CRYSTAL_BALL = objectNames.indexOf('CRYSTAL_BALL');
const CRYSKNIFE = objectNames.indexOf('CRYSKNIFE');
const CANDELABRUM_OF_INVOCATION = objectNames.indexOf('CANDELABRUM_OF_INVOCATION');
const BELL = objectNames.indexOf('BELL');
const SPE_BOOK_OF_THE_DEAD = objectNames.indexOf('SPE_BOOK_OF_THE_DEAD');
const SPE_BLANK_PAPER = objectNames.indexOf('SPE_BLANK_PAPER');
const MAGIC_LAMP = objectNames.indexOf('MAGIC_LAMP');
const OIL_LAMP = objectNames.indexOf('OIL_LAMP');
const TALLOW_CANDLE = objectNames.indexOf('TALLOW_CANDLE');
const WAX_CANDLE = objectNames.indexOf('WAX_CANDLE');
const GLOB_OF_GRAY_OOZE = objectNames.indexOf('GLOB_OF_GRAY_OOZE');
const POT_WATER = objectNames.indexOf('POT_WATER');
const SCR_BLANK_PAPER = objectNames.indexOf('SCR_BLANK_PAPER');
const ORANGE = objectNames.indexOf('ORANGE');
const BAG_OF_TRICKS = objectNames.indexOf('BAG_OF_TRICKS');
const HORN_OF_PLENTY = objectNames.indexOf('HORN_OF_PLENTY');
const BEARTRAP = objectNames.indexOf('BEARTRAP');
const LAND_MINE = objectNames.indexOf('LAND_MINE');
const BRASS_LANTERN = objectNames.indexOf('BRASS_LANTERN');
const POT_OIL = objectNames.indexOf('POT_OIL');
const AMULET_VERSUS_POISON = objectNames.indexOf('AMULET_VERSUS_POISON');
const PM_GRAY_OOZE = monsterNames.indexOf('PM_GRAY_OOZE');
const PM_BLACK_PUDDING = monsterNames.indexOf('PM_BLACK_PUDDING');
const ROCK = objectNames.indexOf('ROCK');
const FLINT = objectNames.indexOf('FLINT');
const GOLD_SYM = '$';

/** C ref: objnam.c wrp[] / wrpsym[] — class words for wishing. */
const WRP = [
    'wand', 'ring', 'potion', 'scroll', 'gem',
    'amulet', 'spellbook', 'spell book',
    'weapon', 'armor', 'tool', 'food', 'comestible',
];
const WRPSYMS = [
    WAND_CLASS, RING_CLASS, POTION_CLASS, SCROLL_CLASS, GEM_CLASS,
    AMULET_CLASS, SPBOOK_CLASS, SPBOOK_CLASS, WEAPON_CLASS,
    ARMOR_CLASS, TOOL_CLASS, FOOD_CLASS, FOOD_CLASS,
];

/** Sentinels matching C &hands_obj / &nothing */
export const HANDS_OBJ = { _hands_obj: true };
export const NOTHING_OBJ = { _nothing_obj: true };

function wizardMode() {
    return !!(game.flags?.debug || game.flags?.wizard);
}

function Luck() {
    const u = game.u || {};
    return (u.uluck | 0) + (u.moreluck | 0);
}

/**
 * C `readobjnam` takes `char *bp` and mutates that buffer.
 * `d.bp` is a cursor into it (`d->bp += n` does not erase the prefix).
 * `Strcpy` / `*p = 0` / `strsubst` write at the cursor and drop the tail.
 * `_cbuf` is the caller's string; `_boff` is the cursor. Absent `_cbuf`
 * (a direct `postparse*` caller) is a no-op.
 */
function cbufAdvance(d, n) {
    if (!d || d._cbuf == null || !n) return;
    d._boff = (d._boff | 0) + n;
}

function cbufReplace(d, view) {
    if (!d || d._cbuf == null) return;
    const off = d._boff | 0;
    d._cbuf = d._cbuf.slice(0, off) + String(view ?? '');
}

function cbufText(d) {
    if (!d || d._cbuf == null) return null;
    const z = d._cbuf.indexOf('\0');
    return z < 0 ? d._cbuf : d._cbuf.slice(0, z);
}

/** `name_to_monplus` rest is a pointer into the same buffer. */
function cbufSkipToSuffix(d, rest) {
    if (!d || d._cbuf == null) return;
    const view = String(d.bp ?? '');
    const tail = String(rest ?? '');
    if (view.endsWith(tail)) cbufAdvance(d, view.length - tail.length);
}

function publishWishbuf(missOut, d, munged) {
    if (!missOut) return;
    const text = d ? cbufText(d) : munged;
    if (text != null) missOut.wishbuf = text;
}

/** C objnam.c BSTRCMPI / strcmpi on the suffix — true when it matches. */
function bstrcmpi_end(bp, suff) {
    const s = String(bp || '');
    const t = String(suff);
    if (s.length < t.length) return false;
    return strncmpi(s.slice(s.length - t.length), t, t.length) === 0;
}

/** C strncmpi(bp, pref, strlen(pref)) == 0 — prefix, true on match. */
function strncmpi_start(bp, pref) {
    const t = String(pref);
    return strncmpi(bp, t, t.length) === 0;
}

/**
 * C BSTRCMPI(bp, p-4, "wall") && (bp == p-4 || p[-5] == ' ') —
 * reject fused suffixes like "swallow".
 */
function is_wall_wish(bp) {
    if (!bstrcmpi_end(bp, 'wall')) return false;
    const s = String(bp || '');
    return s.length === 4 || s.charAt(s.length - 5) === ' ';
}

/**
 * C ref: objnam.c set_wallprop_from_str — case-sensitive strstr on
 * remaining bp; |= into wall_info (overlays flags).
 */
function set_wallprop_from_str(bp) {
    const u = game.u;
    const lev = u && game.level?.at(u.ux | 0, u.uy | 0);
    if (!lev) return;
    const s = String(bp || '');
    let wall_prop = 0;
    if (s.includes('undiggable ') || s.includes('nondiggable ')) {
        wall_prop |= W_NONDIGGABLE;
    }
    if (s.includes('unphaseable ') || s.includes('nonpasswall ')) {
        wall_prop |= W_NONPASSWALL;
    }
    if (wall_prop) {
        lev.wall_info = (lev.wall_info | 0) | wall_prop;
        if (lev.flags !== undefined) lev.flags = (lev.flags | 0) | wall_prop;
    }
}

/* C hacklib.c upstart — live export from './hacklib.js' (clone removed D-3358). */

function CAN_OVERWRITE_TERRAIN(ttyp) {
    return ttyp !== LADDER && ttyp !== STAIRS;
}

/**
 * C ref: objnam.c wishymatch `:3243–3338` (staticfn; file-local here too).
 * User spelling vs canonical objects[] name with "of" inversion and the
 * dwarvish/elven/helm/gauntlets/detect/detection/ability/aluminum arms,
 * in C order. C `char buf[BUFSZ]` writes become immutable-string builds
 * (`eos` append point is the string end by construction); `strcmpi(a,b)`
 * is `strncmpi(a,b,-1)` (global.h); `releaseobuf` is the GC no-op
 * `maybereleaseobuf`. `strstri` returns the match tail (hacklib.js:448),
 * so `!*(p + len)` (match runs to NUL) is `tail.length === len` and
 * `p - u_str` (match index) is `u_str.length - tail.length`.
 */
function wishymatch(u_str, o_str, retry_inverted) {
    const DETECT_SP = 'detect '; // C `:3249` detect_SP
    const SP_DETECTION = ' detection'; // C `:3250` SP_detection
    u_str = String(u_str ?? '');
    o_str = String(o_str ?? '');
    // C `:3254–3256` — ignore spaces & hyphens and upper/lower case
    if (fuzzymatch(u_str, o_str, ' -', true)) return true;
    if (retry_inverted) {
        // C `:3258–3275` — "foo of bar" <-> "bar foo" when just one has " of "
        const u_of = strstri(u_str, ' of ');
        const o_of = strstri(o_str, ' of ');
        if (u_of !== null && o_of === null) {
            // C `:3266–3269` Strcpy(buf, u_of+4) + " " + first (u_of-u_str)
            const buf = u_of.slice(4) + ' '
                + copynchars(u_str, u_str.length - u_of.length);
            if (fuzzymatch(buf, o_str, ' -', true)) return true;
        } else if (o_of !== null && u_of === null) {
            // C `:3271–3274`
            const buf = o_of.slice(4) + ' '
                + copynchars(o_str, o_str.length - o_of.length);
            if (fuzzymatch(u_str, buf, ' -', true)) return true;
        }
    }
    // C note `:3277–3280` — one if/else-if chain; a missed prefix arm below
    // falls through to FALSE without trying the later arms.
    if (o_str.slice(0, 9) === 'dwarvish ') { // C `:3281` !strncmp 9
        if (strncmpi(u_str, 'dwarven ', 8) === 0) // C `:3282`
            return fuzzymatch(u_str.slice(8), o_str.slice(9), ' -', true);
    } else if (o_str.slice(0, 6) === 'elven ') { // C `:3284` !strncmp 6
        if (strncmpi(u_str, 'elvish ', 7) === 0) // C `:3285`
            return fuzzymatch(u_str.slice(7), o_str.slice(6), ' -', true);
        else if (strncmpi(u_str, 'elfin ', 6) === 0) // C `:3287`
            return fuzzymatch(u_str.slice(6), o_str.slice(6), ' -', true);
    } else if (strstri(o_str, 'helm') !== null // C `:3289`
            && strstri(u_str, 'helmet') !== null) {
        // C `:3290–3292` copynchars(buf, u_str, BUFSZ-1), helmet->helm
        let buf = copynchars(u_str, BUFSZ - 1);
        buf = strsubst(buf, 'helmet', 'helm');
        return wishymatch(buf, o_str, true);
    } else if (strstri(o_str, 'gauntlets') !== null // C `:3293`
            && strstri(u_str, 'gloves') !== null) {
        // C `:3295–3297` -3: room to replace shorter "gloves" with longer
        let buf = copynchars(u_str, BUFSZ - 1 - 3);
        buf = strsubst(buf, 'gloves', 'gauntlets');
        return wishymatch(buf, o_str, true);
    } else if (o_str.slice(0, 7) === DETECT_SP) { // C `:3298` !strncmp 7
        // C `:3300–3311` — "<foo> detection" (match runs to end) vs
        // "detect <foo>"; the *p='\0' truncation makes u_str the head, so
        // the "monster" check runs against the head; *p=' ' restores it.
        const p = strstri(u_str, SP_DETECTION);
        if (p !== null && p.length === SP_DETECTION.length) {
            const head = u_str.slice(0, u_str.length - p.length);
            let buf = DETECT_SP + head;
            // C `:3307` "detect monster" -> "detect monsters"
            if (strncmpi(head, 'monster', -1) === 0) buf += 's';
            return fuzzymatch(buf, o_str, ' -', true);
        }
    } else if (strstri(o_str, SP_DETECTION) !== null) { // C `:3312`
        // C `:3314–3323` — inverse: "detect <foo>s" vs "<foo> detection"
        if (strncmpi(u_str, DETECT_SP, 7) === 0) {
            const p = makesingular(u_str.slice(DETECT_SP.length));
            const buf = p + SP_DETECTION;
            // C `:3321` avoid churning obufs while looping objects[]
            maybereleaseobuf(p);
            return fuzzymatch(buf, o_str, ' -', true);
        }
    } else if (strstri(o_str, 'ability') !== null) { // C `:3324`
        // C `:3328–3332` — "{potion(s),ring} of {gain,restore,sustain}
        // abilities": trailing "abilities" (to end) -> "ability".
        // C uses strncpy (exact head, no newline stop), not copynchars.
        const p = strstri(u_str, 'abilities');
        if (p !== null && p.length === 9) {
            const buf = u_str.slice(0, u_str.length - p.length) + 'ability';
            return fuzzymatch(buf, o_str, ' -', true);
        }
    } else if (o_str === 'aluminum') { // C `:3333` !strcmp
        // C `:3336–3337` — " wand" already stripped; aluminium+9 /
        // aluminum+8 skip the full words (empty-vs-empty when exact).
        if (strncmpi(u_str, 'aluminium', -1) === 0)
            return fuzzymatch(u_str.slice(9), o_str.slice(8), ' -', true);
    }
    return false; // C `:3338`
}

/** C ref: objnam.c rnd_otyp_by_namedesc `:3455–3529` (D-3403: oc_uname arm). */
export function rnd_otyp_by_namedesc(name, oclass, xtra_prob) {
    if (!name || !name.length) return STRANGE_OBJECT; // C `:3485–3486`
    const check_of = !name.toLowerCase().includes(' of ');
    const objs = game.objects || [];
    let lo = MAXOCLASSES;
    let hi = NUM_OBJECTS - 1;
    if (oclass) {
        const bases = game.bases;
        if (bases) {
            lo = bases[oclass] | 0;
            hi = (bases[oclass + 1] | 0) - 1;
        }
    }
    const valid = [];
    let maxprob = 0;
    const minglob = objectNames.indexOf('GLOB_OF_GRAY_OOZE');
    const maxglob = objectNames.indexOf('GLOB_OF_BLACK_PUDDING');

    for (let i = lo; i <= hi; i++) {
        const zn = objectNameStrs[i];
        if (!zn) continue;
        let hit = wishymatch(name, zn, true);
        if (!hit && check_of) {
            const of = zn.toLowerCase().indexOf(' of ');
            if (of >= 0 && i !== BELL_OF_OPENING
                && (minglob < 0 || i < minglob || i > maxglob)) {
                hit = wishymatch(name, zn.slice(of + 4), false);
            }
        }
        const zd = objectDescrs[i];
        if (!hit && zd) {
            hit = wishymatch(name, zd, false);
            if (!hit && check_of) {
                const of = zd.toLowerCase().indexOf(' of ');
                if (of >= 0) hit = wishymatch(name, zd.slice(of + 4), false);
            }
        }
        // C `:3531–3532` — user-called name (oc_uname; 0/unset skips).
        const zu = objs[i]?.oc_uname;
        if (!hit && zu) hit = wishymatch(name, zu, false);
        if (hit) {
            valid.push(i);
            maxprob += (objs[i]?.oc_prob || 0) + (xtra_prob | 0);
        }
    }
    if (valid.length > 0 && maxprob) {
        let prob = rn2(maxprob);
        for (let i = 0; i < valid.length - 1; i++) {
            prob -= (objs[valid[i]]?.oc_prob || 0) + (xtra_prob | 0);
            if (prob < 0) return valid[i];
        }
        return valid[valid.length - 1];
    }
    return STRANGE_OBJECT;
}

/**
 * C ref: objnam.c readobjnam_parse_charges — strip trailing "(N)" / "(R:S)".
 */
function readobjnam_parse_charges(d) {
    if (!d.bp || d.bp.length <= 1) return;
    const paren = d.bp.lastIndexOf('(');
    if (paren < 0) return;
    let keeptrailing = true;
    let cut = paren;
    if (paren > 0 && d.bp[paren - 1] === ' ') cut = paren - 1;
    let p = d.bp.slice(paren + 1); // past '('
    const head = d.bp.slice(0, cut);
    if (/^lit\)/i.test(p)) {
        d.islit = 1;
        p = p.slice(4); // after "lit)"
    } else {
        let i = 0;
        while (i < p.length && p[i] >= '0' && p[i] <= '9') i++;
        d.spe = parseInt(p.slice(0, i) || '0', 10) || 0;
        p = p.slice(i);
        if (p[0] === ':') {
            p = p.slice(1);
            d.rechrg = d.spe;
            i = 0;
            while (i < p.length && p[i] >= '0' && p[i] <= '9') i++;
            d.spe = parseInt(p.slice(0, i) || '0', 10) || 0;
            p = p.slice(i);
        }
        if (p[0] !== ')') {
            d.spe = 0;
            d.rechrg = 0;
            keeptrailing = false;
            p = '';
        } else {
            d.spesgn = 1;
            p = p.slice(1); // past ')'
        }
    }
    // C objnam.c:4186–4220 — NUL at '(' (or the space before it), then
    // copy the characters after ')' onto that end. The prefix before
    // the cursor stays.
    const charged = keeptrailing ? head + p : head;
    cbufReplace(d, charged);
    d.bp = charged;
    if (d.spe < 0) {
        d.spesgn = -1;
        d.spe = Math.abs(d.spe);
    }
    if (d.spe > SPE_LIM) d.spe = SPE_LIM;
    if (d.rechrg < 0 || d.rechrg > 7) d.rechrg = 7;
}

/**
 * C ref: objnam.c postparse1 wrp[] loop — "wand of X" / "X wand" → oclass.
 * Returns true when actualn/oclass are set for srch (rnd_otyp_by_namedesc).
 */
function readobjnam_parse_class_words(d) {
    const bp = d.bp;
    if (!bp) return 0;
    // C false-hit guards before wrp scan
    if (/^enchant /i.test(bp) || /^destroy /i.test(bp)
        || /^detect food/i.test(bp) || /^food detection/i.test(bp)
        || /^ring mail/i.test(bp) || /^studded leather armor/i.test(bp)
        || /^leather armor/i.test(bp) || /^tooled horn/i.test(bp)
        || /^food ration/i.test(bp) || /^meat ring/i.test(bp)) {
        return 0;
    }
    const lower = bp.toLowerCase();
    for (let i = 0; i < WRP.length; i++) {
        const word = WRP[i];
        const j = word.length;
        if (lower.startsWith(word)
            && (bp.length === j || bp[j] === ' ')) {
            d.oclass = WRPSYMS[i];
            if (d.oclass !== AMULET_CLASS) {
                let rest = bp.slice(j);
                if (/^ of /i.test(rest)) d.actualn = rest.slice(4);
                // else leave actualn unset (C: /* else if(*bp) ?? */)
            } else {
                d.actualn = bp;
            }
            return 1;
        }
        // trailing " <class>"
        if (lower.endsWith(word)
            && (bp.length === j || bp[bp.length - j - 1] === ' ')) {
            d.oclass = WRPSYMS[i];
            if (d.oclass !== AMULET_CLASS) {
                let cut = bp.length - j;
                if (cut > 0 && bp[cut - 1] === ' ') cut -= 1;
                // C objnam.c:4591–4594 — NUL the class word (and the space
                // before it) in the shared buffer.
                const trimmed = bp.slice(0, cut);
                cbufReplace(d, trimmed);
                d.bp = trimmed;
                d.actualn = d.dn = d.bp;
            } else {
                // C `:4599–4602` — "versus poison amulet" without "of".
                if (strncmpi(bp, 'versus poison ', 14) === 0) {
                    d.typ = AMULET_VERSUS_POISON;
                    return 2;
                }
                // C `:4605–4612` — "<shape> amulet" via namedesc; bp kept
                // whole so wishymatch can do "of inversion".
                let l = bp.length - j;
                if (l > 0 && bp[l - 1] === ' ') l -= 1;
                const amubuf = copynchars(bp, Math.min(l, BUFSZ - 1));
                const k = rnd_otyp_by_namedesc(amubuf, AMULET_CLASS, 0);
                if (k !== STRANGE_OBJECT) {
                    d.typ = k;
                    return 2;
                }
                d.actualn = d.dn = bp;
            }
            return 1;
        }
    }
    return 0;
}

/**
 * C ref: objnam.c readobjnam `any:` — wrpsym[rn2(sizeof)] then mkobj(oclass, FALSE).
 * Used when bp is NULL (makewish after MAXWISHTRY) or empty after preparse
 * (ESC/empty wish → makewish clears ESC to "" → preparse returns 1).
 */
/**
 * C ref: objnam.c readobjnam `any:` `:4994–4996` — default a random class,
 * then fall through to the shared `typfnd:` body (readobjnam_finish): C
 * runs the whole fine-tune (wizard remap, create, quan, spe, corpsenm,
 * blessed/erosion, vanish...) on the any path too. (mksobj/mkobj never
 * return null in JS, so C's missing guard is safe to mirror.)
 */
function readobjnam_any(d) {
    if (!d.oclass) {
        d.oclass = WRPSYMS[rn2(WRPSYMS.length)];
    }
    return readobjnam_finish(d);
}

/**
 * C ref: objnam.c dbterrainmesg `:3919–3926` (staticfn) — message common
 * to several wizterrainwish() drawbridge-under results. Async only for
 * the JS pline; call order and text are C-exact.
 */
async function dbterrainmesg(newtype, x, y) {
    const { pline } = await import('./display.js');
    const lev = game.level?.at(x, y);
    await pline(`${newtype} ${(lev?.typ | 0) === DRAWBRIDGE_UP ? 'in front of' : 'under'} the drawbridge.`);
}

/**
 * C ref: objnam.c wizterrainwish `:3554–3916` whole — trap loop, then
 * furniture/terrain wish, then the madeterrain postamble (D-1279
 * furniture; D-1289 traps; D-1290 door/wall; D-1304 secret corridor;
 * this D: drawbridge-under arms, water/fire_damage_chain, lava
 * pooleffects, melting-ice timeout, ice_descr, count_level_features,
 * live is_ice/reset_utrap). Dynamic cross-module imports below are
 * hoisted-function edges (`imports.mjs --can` SAFE).
 */
async function wizterrainwish(d) {
    const u = game.u;
    if (!u) return HANDS_OBJ;
    const x = u.ux | 0;
    const y = u.uy | 0;
    const lev = game.level?.at(x, y);
    if (!lev) return null;
    const {
        switch_terrain, set_uinwater, is_pool, is_lava, waterbody_name,
    } = await import('./hack.js');
    const { feel_newsym, pline, docrt } = await import('./display.js');
    const { recalc_block_point } = await import('./vision.js');
    const {
        maketrap, trapname, water_damage_chain, fire_damage_chain,
        ice_descr, reset_utrap,
    } = await import('./trap.js');
    const { count_level_features } = await import('./mklev.js');
    const { pooleffects } = await import('./pickup.js');
    const { start_melt_ice_timeout, is_ice } = await import('./zap.js');
    const { Levitation, Flying } = await import('./mhitu.js');
    const bp = d.bp || '';
    let madeterrain = false;
    let badterrain = false;
    const oldtyp = lev.typ | 0;
    const is_dbridge = oldtyp === DRAWBRIDGE_DOWN || oldtyp === DRAWBRIDGE_UP;
    const lf = game.level.flags || (game.level.flags = {});

    /* C :3563–3582 — trap names before furniture; always return hands_obj */
    for (let trap = NO_TRAP + 1; trap < TRAPNUM; trap++) {
        let tname = trapname(trap, true);
        if (!str_start_is(bp, tname, true)) continue;
        if (is_hole(trap) && !Can_fall_thru(u.uz)) trap = ROCKTRAP;
        const t = maketrap(x, y, trap);
        if (t) {
            trap = t.ttyp | 0;
            tname = trapname(trap, true);
            await pline(`${An(tname)}${trap !== MAGIC_PORTAL ? '' : ' to nowhere'}.`);
        } else {
            await pline(`Creation of ${an(tname)} failed.`);
        }
        return HANDS_OBJ;
    }

    if (bstrcmpi_end(bp, 'fountain')) {
        lev.typ = FOUNTAIN;
        if (oldtyp !== FOUNTAIN) lf.nfountains = (lf.nfountains | 0) + 1;
        lev.looted = d.looted ? F_LOOTED : 0;
        lev.blessedftn = !!(d.blessed || strncmpi_start(bp, 'magic '));
        /* rm.h:404 — blessedftn IS horizontal (#define); keep split fields in sync. */
        lev.horizontal = !!lev.blessedftn;
        await pline(`A ${lev.blessedftn ? 'magic ' : ''}fountain.`);
        madeterrain = true;
    } else if (bstrcmpi_end(bp, 'throne')) {
        lev.typ = THRONE;
        lev.looted = d.looted ? T_LOOTED : 0;
        await pline('A throne.');
        madeterrain = true;
    } else if (bstrcmpi_end(bp, 'sink')) {
        lev.typ = SINK;
        if (oldtyp !== SINK) lf.nsinks = (lf.nsinks | 0) + 1;
        lev.looted = d.looted ? (S_LPUDDING | S_LDWASHER | S_LRING) : 0;
        await pline('A sink.');
        madeterrain = true;
    } else if (bstrcmpi_end(bp, 'pool')
            || bstrcmpi_end(bp, 'moat')
            || bstrcmpi_end(bp, 'wall of water')) {
        /* C `:3609–3633` — ltyp first; drawbridge keeps its typ and takes
           DB_MOAT under it; the damage chain runs either way. */
        const ltyp = bstrcmpi_end(bp, 'pool') ? POOL
            : bstrcmpi_end(bp, 'moat') ? MOAT
            : WATER;
        if (!is_dbridge) {
            lev.typ = ltyp;
            lev.flags = 0;
        } else {
            /* drawbridgemask overloads flags */
            lev.drawbridgemask = (lev.drawbridgemask | 0) & ~DB_UNDER;
            lev.drawbridgemask |= DB_MOAT;
        }
        const { del_engr_at } = await import('./engrave.js');
        del_engr_at(x, y);
        if (!is_dbridge) {
            const save = u.EHalluc_resistance | 0;
            u.EHalluc_resistance = 1;
            const new_water = waterbody_name(x, y);
            u.EHalluc_resistance = save;
            await pline(`${An(new_water)}.`);
            /* Must manually make kelp! */
        } else {
            await dbterrainmesg('Moat', x, y);
        }
        await water_damage_chain(objects_at(x, y), true);
        madeterrain = true;
    } else if (bstrcmpi_end(bp, 'lava')
            || bstrcmpi_end(bp, 'wall of lava')) {
        /* C `:3637–3662` — same dbridge split with DB_LAVA; pooleffects
           unless airborne over a pool; the fire chain runs either way. */
        const ltyp = bstrcmpi_end(bp, 'wall of lava') ? LAVAWALL : LAVAPOOL;
        if (!is_dbridge) {
            lev.typ = ltyp;
            lev.flags = 0;
        } else {
            /* drawbridgemask overloads flags */
            lev.drawbridgemask = (lev.drawbridgemask | 0) & ~DB_UNDER;
            lev.drawbridgemask |= DB_LAVA;
        }
        const { del_engr_at } = await import('./engrave.js');
        del_engr_at(x, y);
        if (!is_dbridge) {
            await pline(`A ${(lev.typ | 0) === LAVAPOOL ? 'pool' : 'wall'} of molten lava.`);
            if (!(Levitation() || Flying()) || (lev.typ | 0) === LAVAWALL)
                await pooleffects(false);
        } else {
            await dbterrainmesg('Lava', x, y);
        }
        await fire_damage_chain(objects_at(x, y), true, true, x, y);
        madeterrain = true;
    } else if (bstrcmpi_end(bp, 'ice')) {
        /* C `:3663–3689` — DB_ICE under a drawbridge; "melting ice"
           starts the melt timeout at once; ice_descr names the result. */
        if (!is_dbridge) {
            lev.typ = ICE;
            /* icedpool overloads flags; specifies what ice will melt into */
            lev.icedpool = (oldtyp === ROOM) ? ICED_POOL : ICED_MOAT;
        } else {
            /* drawbridgemask overloads flags */
            lev.drawbridgemask = (lev.drawbridgemask | 0) & ~DB_UNDER;
            lev.drawbridgemask |= DB_ICE;
        }
        const { del_engr_at } = await import('./engrave.js');
        del_engr_at(x, y);
        if (strncmpi_start(bp, 'melting '))
            start_melt_ice_timeout(x, y, 0);
        if (!is_dbridge) {
            await pline(`${upstart(ice_descr(x, y))}.`);
        } else {
            await dbterrainmesg('Ice', x, y);
        }
        madeterrain = true;
    } else if (bstrcmpi_end(bp, 'altar')) {
        lev.typ = ALTAR;
        let al;
        if (strncmpi_start(bp, 'chaotic ')) al = A_CHAOTIC;
        else if (strncmpi_start(bp, 'neutral ')) al = A_NEUTRAL;
        else if (strncmpi_start(bp, 'lawful ')) al = A_LAWFUL;
        else if (strncmpi_start(bp, 'unaligned ')) al = A_NONE;
        else al = !rn2(6) ? A_NONE : (rn2((A_LAWFUL | 0) + 2) - 1);
        lev.altarmask = Align2amask(al);
        // C objnam.c:3704 — An(align_str(al)), including "unaligned".
        await pline(`${An(align_str(al))} altar.`);
        madeterrain = true;
    } else if (bstrcmpi_end(bp, 'grave') || bstrcmpi_end(bp, 'headstone')) {
        const { make_grave } = await import('./engrave.js');
        make_grave(x, y, null);
        if (IS_GRAVE(lev.typ)) {
            lev.looted = 0;
            lev.disturbed = d.looted ? 1 : 0;
            /* rm.h:405 — disturbed IS horizontal (#define); keep split fields in sync. */
            lev.horizontal = !!lev.disturbed;
            await pline(`A ${lev.disturbed ? 'disturbed ' : ''}grave.`);
            madeterrain = true;
        } else {
            await pline("Can't place a grave here.");
            badterrain = true;
        }
    } else if (bstrcmpi_end(bp, 'tree')) {
        lev.typ = TREE;
        lev.looted = d.looted ? (TREE_LOOTED | TREE_SWARM) : 0;
        set_wallprop_from_str(bp);
        await pline('A tree.');
        madeterrain = true;
    } else if (bstrcmpi_end(bp, 'bars')) {
        lev.typ = IRONBARS;
        lev.flags = 0;
        set_wallprop_from_str(bp);
        await pline('Iron bars.');
        madeterrain = true;
    } else if (bstrcmpi_end(bp, 'cloud')) {
        lev.typ = CLOUD;
        lev.flags = 0;
        await pline('A cloud.');
        const { del_engr_at } = await import('./engrave.js');
        del_engr_at(x, y);
        madeterrain = true;
    } else if (bstrcmpi_end(bp, 'door')
            || ((d.doorless | 0) && bstrcmpi_end(bp, 'doorway'))) {
        /* C :3740–3821 — require door/wall/bars so horizontal is set */
        const secret = bstrcmpi_end(bp, 'secret door');
        const okLoc = (lev.typ | 0) === DOOR || (lev.typ | 0) === SDOOR
            || (IS_WALL(lev.typ) && (lev.typ | 0) !== DBWALL)
            || (lev.typ | 0) === IRONBARS;
        if (okLoc) {
            const old_wall_info = ((lev.typ | 0) !== DOOR)
                ? (lev.wall_info | 0) : 0;
            lev.typ = secret ? SDOOR : DOOR;
            lev.wall_info = 0;
            if (Is_rogue_level(u.uz)) {
                d.doorless = 1;
                d.locked = 0;
                d.closed = 0;
                d.open = 0;
                d.broken = 0;
            }
            lev.doormask = (d.locked | 0) ? D_LOCKED
                : ((d.doorless | 0) || secret) ? D_NODOOR
                  : (d.open | 0) ? D_ISOPEN
                    : (d.broken | 0) ? D_BROKEN
                      : D_CLOSED;
            if (secret) lev.wall_info |= (old_wall_info & WM_MASK);
            if ((d.trapped | 0) === 2
                || (((lev.doormask & (D_LOCKED | D_CLOSED)) === 0)
                    && !secret)) {
                d.trapped = 0;
            }
            if (d.trapped) lev.doormask |= D_TRAPPED;
            if (lev.flags !== undefined) lev.flags = lev.doormask;
            let dbuf = '';
            if (lev.doormask & D_TRAPPED) dbuf += 'trapped ';
            if (lev.doormask & D_LOCKED) dbuf += 'locked ';
            if ((lev.typ | 0) === SDOOR) {
                dbuf += 'secret door';
            } else {
                if (lev.doormask & D_CLOSED) dbuf += 'closed ';
                if (lev.doormask & D_ISOPEN) dbuf += 'open ';
                if (lev.doormask & D_BROKEN) dbuf += 'broken ';
                if ((lev.doormask & ~D_TRAPPED) === D_NODOOR) {
                    dbuf += 'doorless doorway';
                } else {
                    dbuf += 'door';
                }
            }
            await pline(`${upstart(an(dbuf))}.`);
            madeterrain = true;
        } else {
            const dbuf = secret ? 'secret door' : 'door';
            await pline(`${upstart(dbuf)} requires door or wall location.`);
            badterrain = true;
        }
    } else if (is_wall_wish(bp)) {
        /* C :3822–3835 — HWALL unless N/S neighbor is a wall */
        let wall = HWALL;
        if ((isok(u.ux, u.uy - 1)
                && IS_WALL(game.level.at(u.ux, u.uy - 1)?.typ))
            || (isok(u.ux, u.uy + 1)
                && IS_WALL(game.level.at(u.ux, u.uy + 1)?.typ))) {
            wall = VWALL;
        }
        madeterrain = true;
        lev.typ = wall;
        lev.flags = 0;
        lev.wall_info = 0;
        set_wallprop_from_str(bp);
        const { fix_wall_spines } = await import('./mklev.js');
        fix_wall_spines(
            Math.max(0, u.ux - 1),
            Math.max(0, u.uy - 1),
            Math.min(COLNO, u.ux + 1),
            Math.min(ROWNO, u.uy + 1),
        );
        await pline('A wall.');
    } else if (bstrcmpi_end(bp, 'secret corridor')) {
        /* C :3836–3845 — CORR only; neither CORR nor SCORR uses flags */
        if ((lev.typ | 0) === CORR) {
            lev.typ = SCORR;
            await pline('Secret corridor.');
            madeterrain = true;
        } else {
            await pline('Secret corridor requires corridor location.');
            badterrain = true;
        }
    } else if (bstrcmpi_end(bp, 'room')
            || bstrcmpi_end(bp, 'floor')
            || bstrcmpi_end(bp, 'ground')) {
        /* C `:3852` is_pool_or_lava ≡ is_pool || is_lava (dbridge.c:77–83). */
        if (oldtyp === ROOM
            || (IS_FURNITURE(oldtyp) && CAN_OVERWRITE_TERRAIN(oldtyp))
            || oldtyp === ICE
            || is_pool(x, y) || is_lava(x, y)) {
            lev.typ = ROOM;
            await pline('Room floor.');
            /* C `:3857–3858` — recount fountains/sinks after clobbering one. */
            if (IS_FURNITURE(oldtyp))
                count_level_features();
            const t = t_at(x, y);
            if (t && (t.ttyp | 0) !== MAGIC_PORTAL) deltrap(t);
            madeterrain = true;
        } else if (is_dbridge) {
            /* C `:3863–3867` — floor under the drawbridge. */
            lev.drawbridgemask = (lev.drawbridgemask | 0) & ~DB_UNDER;
            lev.drawbridgemask |= DB_FLOOR;
            await dbterrainmesg('Floor', x, y);
            madeterrain = true;
        } else {
            await pline('Room|floor|ground not allowed here.');
            badterrain = true;
        }
    }

    if (madeterrain) {
        feel_newsym(x, y);
        /* C `:3878–3879` — the hero might have left <x,y> (lava wish,
           declined death, teleported to safety). */
        if ((u.uinwater | 0) && !is_pool(u.ux | 0, u.uy | 0)) {
            await set_uinwater(0);
            await docrt();
            /* [block/unblock_point handled by docrt -> vision_recalc] */
        } else {
            if ((u.utrap | 0) && (u.utraptype | 0) === TT_LAVA
                && !is_lava(u.ux | 0, u.uy | 0)) {
                /* C `:3887` — live export; msg FALSE skips float/fly notes. */
                reset_utrap(false);
            }
            recalc_block_point(x, y);
        }
        /* C `:3893–3894` — recount fountains/sinks from the level. */
        if (IS_FOUNTAIN(oldtyp) || IS_SINK(oldtyp))
            count_level_features();
        /* C `:3895–3896` — live is_ice covers ICE and DB_ICE-under. */
        if (!is_ice(x, y)) spot_stop_timers(x, y, MELT_ICE_AWAY);
        if (IS_FOUNTAIN(oldtyp) || IS_GRAVE(oldtyp)
            || IS_WALL(oldtyp) || oldtyp === IRONBARS
            || IS_DOOR(oldtyp) || oldtyp === SDOOR) {
            if (!IS_FOUNTAIN(lev.typ) && !IS_GRAVE(lev.typ)
                && !IS_DOOR(lev.typ) && (lev.typ | 0) !== SDOOR) {
                lev.horizontal = 0;
                lev.blessedftn = 0;
                lev.disturbed = 0;
            }
        }
        /* C :3907–3910 leftover Lev/Fly FROMOUTSIDE after terrain change */
        await switch_terrain();
    }
    if (madeterrain || badterrain) return HANDS_OBJ;
    return null;
}

/** True only while `readobjnam_wish` is inside `readobjnam`, so the
 * skill prefix waits until `wizterrainwish` returns 0. Direct callers
 * (`proc_wizkit_line`, special-level escape items) run the prefix. */
let deferSkillPrefixForWiztrap = false;

/**
 * C ref: objnam.c readobjnam wiztrap — wizard && !wizkit_wishing &&
 * !d.oclass then wizterrainwish (D-1279 furniture; D-1289 traps;
 * D-1290 door/wall; D-1304 secret corridor).
 * Object-only readobjnam stays sync for wizkit/mklev (C skips terrain
 * when wizkit_wishing). After a null terrain wish, `polearm` / `hammer`
 * still take `rnd_otyp_by_wpnskill` (C `:4982–4989`).
 */
export async function readobjnam_wish(bp, no_wish) {
    const missOut = {};
    deferSkillPrefixForWiztrap = true;
    let otmp;
    try {
        otmp = readobjnam(bp, no_wish, missOut);
    } finally {
        deferSkillPrefixForWiztrap = false;
    }
    if (otmp) {
        /* C objnam.c:5378–5379 — the vanish pline is async-only in JS:
           the sync finish marks d.vanished and this wrapper emits it. */
        if (otmp === HANDS_OBJ && missOut.d && missOut.d.vanished) {
            const { pline } = await import('./display.js');
            const { body_part } = await import('./polyself.js');
            await pline(`For a moment, you feel ${something} in your ${makeplural(body_part(HAND))}, but it disappears!`);
        }
        return otmp;
    }
    if (wizardMode() && !(game.program_state?.wizkit_wishing | 0)
        && missOut.d && !(missOut.d.oclass | 0) && !(missOut.d.typ | 0)) {
        const t = await wizterrainwish(missOut.d);
        if (t) return t;
        /* C objnam.c:4982–4989 — wiztrap returned 0; prefix still applies. */
        const picked = wish_otyp_by_wpnskill_prefix(missOut.d.bp);
        if (picked !== null) {
            missOut.d.typ = picked | 0;
            return readobjnam_finish(missOut.d);
        }
    }
    return otmp;
}

/**
 * C ref: objnam.c readobjnam_preparse `:3966–4175` (staticfn) — strip wish
 * prefixes in C order, mutating d.bp/d.*. Returns 1 when bp is empty at
 * entry (caller goes `any`), else 0. Short-circuit, RNG and mutation order
 * kept: `wet` draws `3 + rn2(3)`, `moist` draws `rnd(2)`; gender words are
 * deleted in place via case-sensitive `strsubst` (C `hacklib.c:536–550`,
 * first occurrence only — so a capitalized `Female ` sets mgend but stays
 * in the string); `corpse/statue/figurine of [a/an/the]` saves the pointer
 * and backtracks after the loop.
 */
function readobjnam_preparse(d) {
    let save_bp = null; // C `:3968` — char *save_bp = 0
    let more_l = 0;
    let res = 1; // C `:3969`

    for (;;) { // C `:3971`
        let l = 0;

        if (!d.bp) // C `:3974` — !d->bp || !*d->bp
            break;
        res = 0; // C `:3976`
        const s = d.bp;
        const isDigit = (c) => c >= '0' && c <= '9';

        if (strncmpi_start(s, 'an ')) { // C `:3978`
            d.cnt = 1;
            l = 3;
        } else if (strncmpi_start(s, 'a ')) { // C `:3978`
            d.cnt = 1;
            l = 2;
        } else if (strncmpi_start(s, 'the ')) { // C `:3980–3982`
            ; /* just increment bp by l below */
            l = 4;
        } else if (!d.cnt && isDigit(s[0]) && s !== '0') { // C `:3983–3991`
            const m = s.match(/^(\d+)/);
            d.cnt = parseInt(m[1], 10); // C atoi
            // C `:3984–3987` — digit and space walks advance the pointer.
            // The characters stay in the caller's buffer.
            const afterDigits = s.slice(m[1].length);
            const sp = afterDigits.match(/^ */)[0].length;
            cbufAdvance(d, m[1].length + sp);
            d.bp = afterDigits.replace(/^ +/, '');
            l = 0;
        } else if (s[0] === '+' || s[0] === '-') { // C `:3992–3996`
            d.spesgn = (s[0] === '+') ? 1 : -1;
            const rest = s.slice(1);
            const m = rest.match(/^(\d+)/);
            d.spe = m ? parseInt(m[1], 10) : 0; // C atoi
            // C `:3990–3995` — `*d->bp++` then digit and space walks.
            const dlen = m ? m[1].length : 0;
            const afterSign = rest.slice(dlen);
            const sp = afterSign.match(/^ */)[0].length;
            cbufAdvance(d, 1 + dlen + sp);
            d.bp = afterSign.replace(/^ +/, '');
            l = 0;
        } else if (strncmpi_start(s, 'blessed ')) { // C `:3997–3999`
            d.blessed = 1; d.uncursed = 0; d.iscursed = 0;
            l = 8;
        } else if (strncmpi_start(s, 'holy ')) { // C `:3997–3999`
            d.blessed = 1; d.uncursed = 0; d.iscursed = 0;
            l = 5;
        } else if (strncmpi_start(s, 'cursed ')) { // C `:4000–4002`
            d.iscursed = 1; d.blessed = 0; d.uncursed = 0;
            l = 7;
        } else if (strncmpi_start(s, 'unholy ')) { // C `:4000–4002`
            d.iscursed = 1; d.blessed = 0; d.uncursed = 0;
            l = 7;
        } else if (strncmpi_start(s, 'uncursed ')) { // C `:4003–4004`
            d.uncursed = 1; d.blessed = 0; d.iscursed = 0;
            l = 9;
        } else if (strncmpi_start(s, 'rustproof ')) { // C `:4005–4013`
            d.erodeproof = 1;
            l = 10;
        } else if (strncmpi_start(s, 'erodeproof ')) { // C `:4005–4013`
            d.erodeproof = 1;
            l = 11;
        } else if (strncmpi_start(s, 'corrodeproof ')) { // C `:4005–4013`
            d.erodeproof = 1;
            l = 13;
        } else if (strncmpi_start(s, 'fixed ')) { // C `:4005–4013`
            d.erodeproof = 1;
            l = 6;
        } else if (strncmpi_start(s, 'fireproof ')) { // C `:4005–4013`
            d.erodeproof = 1;
            l = 10;
        } else if (strncmpi_start(s, 'rotproof ')) { // C `:4005–4013`
            d.erodeproof = 1;
            l = 9;
        } else if (strncmpi_start(s, 'tempered ')) { // C `:4005–4013`
            d.erodeproof = 1;
            l = 9;
        } else if (strncmpi_start(s, 'crackproof ')) { // C `:4005–4013`
            d.erodeproof = 1;
            l = 11;
        } else if (strncmpi_start(s, 'lit ')) { // C `:4014–4016`
            d.islit = 1;
            l = 4;
        } else if (strncmpi_start(s, 'burning ')) { // C `:4014–4016`
            d.islit = 1;
            l = 8;
        } else if (strncmpi_start(s, 'unlit ')) { // C `:4017–4019`
            d.islit = 0;
            l = 6;
        } else if (strncmpi_start(s, 'extinguished ')) { // C `:4017–4019`
            d.islit = 0;
            l = 13;
        } else if (strncmpi_start(s, 'moist ')) {
            /* C `:4022–4028` — "wet" and "moist" are only for towels;
               "moist" arm (outer first disjunct, inner "wet" test false). */
            d.wetness = rnd(2); // C `:4027` — 1..2
            l = 6;
        } else if (strncmpi_start(s, 'wet ')) { // C `:4022–4028`
            d.wetness = 3 + rn2(3); // C `:4025` — 3..5
            l = 4;
        } else if (strncmpi_start(s, 'unlabeled ')) { // C `:4030–4033`
            d.unlabeled = 1;
            l = 10;
        } else if (strncmpi_start(s, 'unlabelled ')) { // C `:4030–4033`
            d.unlabeled = 1;
            l = 11;
        } else if (strncmpi_start(s, 'blank ')) { // C `:4030–4033`
            d.unlabeled = 1;
            l = 6;
        } else if (strncmpi_start(s, 'poisoned ')) { // C `:4034–4035`
            d.ispoisoned = 1;
            l = 9;
        } else if (strncmpi_start(s, 'trapped ')) {
            /* C `:4038–4041` — recognized but honored only in wizard mode */
            d.trapped = 0; // undo any previous "untrapped"
            if (wizardMode()) d.trapped = 1;
            l = 8;
        } else if (strncmpi_start(s, 'untrapped ')) { // C `:4042–4043`
            d.trapped = 2; // not trapped
            l = 10;
        } else if (strncmpi_start(s, 'locked ')) { // C `:4047–4049`
            d.locked = 1; d.closed = 1;
            d.unlocked = 0; d.broken = 0; d.open = 0; d.doorless = 0;
            l = 7;
        } else if (strncmpi_start(s, 'unlocked ')) { // C `:4050–4052`
            d.unlocked = 1; d.closed = 1;
            d.locked = 0; d.broken = 0; d.open = 0; d.doorless = 0;
            l = 9;
        } else if (strncmpi_start(s, 'broken ')) { // C `:4053–4056`
            d.broken = 1;
            d.locked = 0; d.unlocked = 0; d.open = 0; d.closed = 0;
            d.doorless = 0;
            l = 7;
        } else if (strncmpi_start(s, 'open ')) { // C `:4057–4059`
            d.open = 1;
            d.closed = 0; d.locked = 0; d.broken = 0; d.doorless = 0;
            l = 5;
        } else if (strncmpi_start(s, 'closed ')) { // C `:4060–4062`
            d.closed = 1;
            d.open = 0; d.locked = 0; d.broken = 0; d.doorless = 0;
            l = 7;
        } else if (strncmpi_start(s, 'doorless ')) { // C `:4063–4065`
            d.doorless = 1;
            d.open = 0; d.closed = 0; d.locked = 0; d.unlocked = 0;
            d.broken = 0;
            l = 9;
        } else if (strncmpi_start(s, 'looted ')) {
            /* C `:4067–4071` — fountain/sink/throne/tree; disturbed grave
               overloaded here though separate in struct rm */
            d.looted = 1;
            l = 7;
        } else if (strncmpi_start(s, 'disturbed ')) { // C `:4067–4071`
            d.looted = 1;
            l = 10;
        } else if (strncmpi_start(s, 'greased ')) { // C `:4072–4073`
            d.isgreased = 1;
            l = 8;
        } else if (strncmpi_start(s, 'zombifying ')) { // C `:4074–4075`
            d.zombify = 1; // C TRUE
            l = 11;
        } else if (strncmpi_start(s, 'very ')) { // C `:4076–4078`
            /* very rusted very heavy iron ball */
            d.very = 1;
            l = 5;
        } else if (strncmpi_start(s, 'thoroughly ')) { // C `:4079–4080`
            d.very = 2;
            l = 11;
        } else if (strncmpi_start(s, 'rusty ')
                || strncmpi_start(s, 'rusted ')
                || strncmpi_start(s, 'burnt ')
                || strncmpi_start(s, 'burned ')
                || strncmpi_start(s, 'cracked ')) { // C `:4081–4087`
            d.eroded = 1 + d.very;
            d.very = 0;
            if (strncmpi_start(s, 'rusty ')) l = 6;
            else if (strncmpi_start(s, 'rusted ')) l = 7;
            else if (strncmpi_start(s, 'burnt ')) l = 6;
            else if (strncmpi_start(s, 'burned ')) l = 7;
            else l = 8; // cracked
        } else if (strncmpi_start(s, 'corroded ')
                || strncmpi_start(s, 'rotted ')) { // C `:4088–4091`
            d.eroded2 = 1 + d.very;
            d.very = 0;
            l = strncmpi_start(s, 'corroded ') ? 9 : 7;
        } else if (strncmpi_start(s, 'partly eaten ')) { // C `:4092–4094`
            d.halfeaten = 1;
            l = 13;
        } else if (strncmpi_start(s, 'partially eaten ')) { // C `:4092–4094`
            d.halfeaten = 1;
            l = 16;
        } else if (strncmpi_start(s, 'historic ')) { // C `:4095–4096`
            d.ishistoric = 1;
            l = 9;
        } else if (strncmpi_start(s, 'diluted ')) { // C `:4097–4098`
            d.isdiluted = 1;
            l = 8;
        } else if (strncmpi_start(s, 'empty ')) { // C `:4099–4100`
            d.contents = TIN_EMPTY;
            l = 6;
        } else if (strncmpi_start(s, 'small ')) { // C `:4101–4109`
            /* "small" may be a monster-name word (mimic corpse); only a
               glob size when followed by "glob" or containing " glob" */
            l = 6;
            if (!strncmpi_start(s.slice(l), 'glob')
                && strstri(s.slice(l), ' glob') === null)
                break;
            d.gsize = 1;
        } else if (strncmpi_start(s, 'medium ')) { // C `:4110–4116`
            d.gsize = 2;
            l = 7;
        } else if (strncmpi_start(s, 'large ')) { // C `:4117–4124`
            /* "large" may be a monster/object-name word (dog, box); same
               glob guard as "small". "very large " had "very " peeled off
               on a previous iteration. */
            l = 6;
            if (!strncmpi_start(s.slice(l), 'glob')
                && strstri(s.slice(l), ' glob') === null)
                break;
            /* C: (d->very != 1) ? 3 : 4 — very is NOT reset here */
            d.gsize = (d.very !== 1) ? 3 : 4;
        } else if (strncmpi_start(s, 'real ')) { // C `:4125–4130`
            /* accept "real Amulet of Yendor"; don't negate 'fake' here */
            d.real = 1;
            l = 5;
        } else if (strncmpi_start(s, 'fake ')) { // C `:4131–4134`
            d.fake = 1; d.real = 0;
            l = 5;
        } else if (strncmpi_start(s, 'female ')) { // C `:4136–4140`
            d.mgend = FEMALE;
            /* if after "corpse/statue/figurine of", remove from string */
            if (save_bp !== null) {
                const nb = strsubst(d.bp, 'female ', '');
                // C edits the shared buffer in place: the saved prefix is
                // untouched, the current tail shrinks.
                save_bp = save_bp.slice(0, save_bp.length - d.bp.length) + nb;
                cbufReplace(d, nb);
                d.bp = nb;
                l = 0;
            } else {
                l = 7;
            }
        } else if (strncmpi_start(s, 'male ')) { // C `:4141–4144`
            d.mgend = MALE;
            if (save_bp !== null) {
                const nb = strsubst(d.bp, 'male ', '');
                save_bp = save_bp.slice(0, save_bp.length - d.bp.length) + nb;
                cbufReplace(d, nb);
                d.bp = nb;
                l = 0;
            } else {
                l = 5;
            }
        } else if (strncmpi_start(s, 'neuter ')) { // C `:4145–4149`
            d.mgend = NEUTRAL;
            if (save_bp !== null) {
                const nb = strsubst(d.bp, 'neuter ', '');
                save_bp = save_bp.slice(0, save_bp.length - d.bp.length) + nb;
                cbufReplace(d, nb);
                d.bp = nb;
                l = 0;
            } else {
                l = 7;
            }
        } else if (((strncmpi_start(s, 'corpse ') && (l = 7))
                    || (strncmpi_start(s, 'statue ') && (l = 7))
                    || (strncmpi_start(s, 'figurine ') && (l = 9)))
                && strncmpi_start(s.slice(l), 'of ')) {
            /* C `:4157–4166` — corpse/statue/figurine gender hack: accept
               "statue of a female gnome ruler" by skipping "statue of [a ]"
               now and backtracking to save_bp after the loop. */
            more_l = 3;
            save_bp = d.bp; // we'll backtrack to here later
            d._saveOff = d._boff | 0;
            l += more_l; more_l = 0;
            if (strncmpi_start(s.slice(l), 'a ')) {
                more_l = 2;
            } else if (strncmpi_start(s.slice(l), 'an ')) {
                more_l = 3;
            } else if (strncmpi_start(s.slice(l), 'the ')) {
                more_l = 4;
            }
            l += more_l;
        } else { // C `:4167–4169`
            break;
        }
        cbufAdvance(d, l); // C `:4170` — d->bp += l (bytes before the cursor stay)
        d.bp = d.bp.slice(l);
    }
    if (save_bp !== null) { // C `:4172–4173` — pointer back into the same buffer
        d.bp = save_bp;
        if (d._cbuf != null && d._saveOff != null) d._boff = d._saveOff | 0;
    }
    return res; // C `:4174`
}

/**
 * C ref: objnam.c o_ranges[] `:3346–3365` — wishable subranges of objects
 * (name → class + first..last type). Indices resolved once like
 * ALT_SPELLINGS_RESOLVED above; C order kept.
 */
const O_RANGES = [
    ['bag', TOOL_CLASS, 'SACK', 'BAG_OF_TRICKS'],
    ['lamp', TOOL_CLASS, 'OIL_LAMP', 'MAGIC_LAMP'],
    ['candle', TOOL_CLASS, 'TALLOW_CANDLE', 'WAX_CANDLE'],
    ['horn', TOOL_CLASS, 'TOOLED_HORN', 'HORN_OF_PLENTY'],
    ['shield', ARMOR_CLASS, 'SMALL_SHIELD', 'SHIELD_OF_REFLECTION'],
    ['hat', ARMOR_CLASS, 'FEDORA', 'DUNCE_CAP'],
    ['helm', ARMOR_CLASS, 'ELVEN_LEATHER_HELM', 'HELM_OF_TELEPATHY'],
    ['gloves', ARMOR_CLASS, 'LEATHER_GLOVES', 'GAUNTLETS_OF_DEXTERITY'],
    ['gauntlets', ARMOR_CLASS, 'LEATHER_GLOVES', 'GAUNTLETS_OF_DEXTERITY'],
    ['boots', ARMOR_CLASS, 'LOW_BOOTS', 'LEVITATION_BOOTS'],
    ['shoes', ARMOR_CLASS, 'LOW_BOOTS', 'IRON_SHOES'],
    ['cloak', ARMOR_CLASS, 'MUMMY_WRAPPING', 'CLOAK_OF_DISPLACEMENT'],
    ['shirt', ARMOR_CLASS, 'HAWAIIAN_SHIRT', 'T_SHIRT'],
    ['dragon scales', ARMOR_CLASS, 'GRAY_DRAGON_SCALES', 'YELLOW_DRAGON_SCALES'],
    ['dragon scale mail', ARMOR_CLASS, 'GRAY_DRAGON_SCALE_MAIL', 'YELLOW_DRAGON_SCALE_MAIL'],
    ['sword', WEAPON_CLASS, 'SHORT_SWORD', 'KATANA'],
    ['venom', VENOM_CLASS, 'BLINDING_VENOM', 'ACID_VENOM'],
    ['gray stone', GEM_CLASS, 'LUCKSTONE', 'FLINT'],
    ['grey stone', GEM_CLASS, 'LUCKSTONE', 'FLINT'],
].map(([name, oclass, first, last]) => [name, oclass, objectNames.indexOf(first), objectNames.indexOf(last)]);
// C ref: objclass.h `:181` + mon.c `:659` — glass gems are contiguous,
// 9 kinds (mhitm.js breakage uses the same bounds).
const FIRST_GLASS_GEM = objectNames.indexOf('WORTHLESS_WHITE_GLASS');
const LAST_GLASS_GEM = objectNames.indexOf('WORTHLESS_VIOLET_GLASS');
const NUM_GLASS_GEMS = LAST_GLASS_GEM - FIRST_GLASS_GEM + 1;

/**
 * C ref: objnam.c readobjnam_postparse1 `:4240–4663` (staticfn; sole C
 * caller is readobjnam `:4936`). Return codes mirror C: 0 fall through,
 * 1 goto srch, 2 goto typfnd, 3 return otmp, 4 goto any, 5 goto wiztrap.
 * `*p = 0` truncations rewrite the caller buffer via cbufReplace while
 * `bp += n` advances keep the prefix (cbufAdvance) for wishbuf (D-2880).
 * The pudding-glob intercept (`:4337–4368`) retargets bp at globbuf (a
 * separate C buffer), leaving the caller wishbuf untouched (map).
 */
export function readobjnam_postparse1(d) {
    // C `:4245–4250` — " named " truncates; oname() truncates long names.
    {
        const tail = strstri(d.bp, ' named ');
        if (tail !== null) {
            d.name = tail.slice(7);
            const cut = d.bp.slice(0, d.bp.length - tail.length);
            cbufReplace(d, cut);
            d.bp = cut;
        }
    }
    // C `:4251–4263` — " called " truncates; a bare o_ranges type word
    // ("shield called reflection") is a class wish, not that type.
    {
        const tail = strstri(d.bp, ' called ');
        if (tail !== null) {
            d.un = tail.slice(8);
            const cut = d.bp.slice(0, d.bp.length - tail.length);
            cbufReplace(d, cut);
            d.bp = cut;
            for (let i = 0; i < O_RANGES.length; i++) {
                if (d.bp.toLowerCase() === O_RANGES[i][0]) {
                    d.oclass = O_RANGES[i][1];
                    return 1; // goto srch
                }
            }
        }
    }
    // C `:4264–4270` — " labeled "/" labelled " truncates into d.dn.
    {
        let tail = strstri(d.bp, ' labeled ');
        let skip = 9;
        if (tail === null) {
            tail = strstri(d.bp, ' labelled ');
            skip = 10;
        }
        if (tail !== null) {
            d.dn = tail.slice(skip);
            const cut = d.bp.slice(0, d.bp.length - tail.length);
            cbufReplace(d, cut);
            d.bp = cut;
        }
    }
    // C `:4271–4274` — " of spinach" truncates (tin contents).
    {
        const tail = strstri(d.bp, ' of spinach');
        if (tail !== null) {
            const cut = d.bp.slice(0, d.bp.length - tail.length);
            cbufReplace(d, cut);
            d.bp = cut;
            d.contents = TIN_SPINACH;
        }
    }

    // C `:4278–4309` — real vs fake Amulet of Yendor: the fake's
    // description contains the real one's name, so an explicit "real"
    // (or nothing) picks the real Amulet while cheap/plastic/imitation
    // (or a preparsed fake) picks the fake; C `:4306` forces real when
    // fake is false either way. Non-wizard folds to fake at typfnd.
    {
        const amuDescr = objectDescrs[AMULET_OF_YENDOR];
        const tail = amuDescr ? strstri(d.bp, amuDescr) : null;
        if (tail !== null) {
            const at = d.bp.length - tail.length;
            if (at === 0 || d.bp[at - 1] === ' ') {
                let s = d.bp;
                if (s.slice(0, 6).toLowerCase() === 'cheap ') { d.fake = 1; s = s.slice(6); }
                if (s.slice(0, 8).toLowerCase() === 'plastic ') { d.fake = 1; s = s.slice(8); }
                if (s.slice(0, 10).toLowerCase() === 'imitation ') { d.fake = 1; s = s.slice(10); }
                d.real = d.fake ? 0 : 1;
                d.typ = d.real ? AMULET_OF_YENDOR : FAKE_AMULET_OF_YENDOR;
                return 2; // goto typfnd
            }
        }
    }

    // C `:4325–4338` — skip "pair(s)/set(s) of"; pairs double the count
    // (pair-referent objects are not mergeable, so cnt is ignored anyway).
    if (strncmpi(d.bp, 'pair of ', 8) === 0) {
        cbufAdvance(d, 8);
        d.bp = d.bp.slice(8);
        d.cnt *= 2;
    } else if (strncmpi(d.bp, 'pairs of ', 9) === 0) {
        cbufAdvance(d, 9);
        d.bp = d.bp.slice(9);
        if (d.cnt > 1)
            d.cnt *= 2;
    } else if (strncmpi(d.bp, 'set of ', 7) === 0) {
        cbufAdvance(d, 7);
        d.bp = d.bp.slice(7);
    } else if (strncmpi(d.bp, 'sets of ', 8) === 0) {
        cbufAdvance(d, 8);
        d.bp = d.bp.slice(8);
    }

    /* C `:4337–4368` — intercept pudding globs here; they're a valid
       wish target, but we need them to not get treated like a corpse.
       If a count is specified, it will be used to magnify weight
       rather than to specify quantity (which is always 1 for globs). */
    /* check for "glob", "<foo> glob", and "glob of <foo>" */
    d.p = null; // C `d->p = (char *) 0`
    if (/^globs?$/i.test(d.bp) // C strcmpi "glob"/"globs"
        || bstrcmpi_end(d.bp, ' glob') // C BSTRCMPI(bp, bp+i-5)
        || bstrcmpi_end(d.bp, ' globs') // C BSTRCMPI(bp, bp+i-6)
        || (d.p = strstri(d.bp, 'glob of ')) !== null
        || (d.p = strstri(d.bp, 'globs of ')) !== null) {
        // C `:4355–4357` — mgend NULL; name_to_monplus keeps the longest
        // monster prefix, so inverted "<foo> glob" still resolves (the
        // " glob" tail is extraneous, mondata.c); "glob of X" parses X.
        const monTail = !d.p ? d.bp : strstri(d.p, ' of ').slice(4);
        d.mntmp = name_to_mon(monTail, null);
        /* if we didn't recognize monster type, pick a valid one at random */
        if (d.mntmp === NON_PM)
            d.mntmp = rn1(PM_BLACK_PUDDING - PM_GRAY_OOZE, PM_GRAY_OOZE);
        /* normally this would be done when makesingular() changes the value
           but canonical form here is already singular so that won't happen */
        if (d.cnt < 2 && strstri(d.bp, 'globs') !== null)
            d.cnt = 2; /* affects otmp->owt but not otmp->quan for globs */
        /* construct canonical spelling in case name_to_mon() recognized a
           variant (grey ooze) or player used inverted syntax (<foo> glob);
           if player has given a valid monster type but not valid glob type,
           object name lookup won't find it and wish attempt will fail */
        d.globbuf = `glob of ${pmnames[d.mntmp][NEUTRAL]}`;
        d.bp = d.globbuf;
        d.mntmp = NON_PM; /* not useful for "glob of <foo>" object lookup */
        d.oclass = FOOD_CLASS;
        d.actualn = d.bp;
        d.dn = null; // C 0
        return 1; /*goto srch;*/
    }
    // C `:4369` else — corpse type via "of" below (tin/of arm).

    // C `:4378–4397` — corpse type via "of" (figurine of an orc, tin of
    // orc meat). "tin of" sets typ=TIN (return 2, goto typfnd); " of
    // <monster>" truncates bp (C `*d->p = 0`) so srch sees "figurine".
    if (!strstri(d.bp, 'wand ') && !strstri(d.bp, 'spellbook ')
        && !strstri(d.bp, 'gauntlets ') && !strstri(d.bp, 'gloves ')
        && !strstri(d.bp, 'finger ')) {
        const tinTail = strstri(d.bp, 'tin of ');
        if (tinTail !== null) {
            const s = tinTail.slice(7);
            if (s.toLowerCase() === 'spinach') { // C: strcmpi, exact
                d.contents = TIN_SPINACH;
                d.mntmp = NON_PM;
            } else {
                const tvout = { tinvariety: -1 };
                const tmp = tin_variety_txt(s, tvout);
                d.tvariety = tvout.tinvariety;
                const gbox = { gender: d.mgend };
                d.mntmp = name_to_mon(s.slice(tmp), gbox);
                d.mgend = gbox.gender;
            }
            d.typ = TIN;
            return 2; // goto typfnd
        }
        const ofTail = strstri(d.bp, ' of ');
        if (ofTail !== null) {
            const gbox = { gender: d.mgend };
            const mtmp = name_to_mon(ofTail.slice(4), gbox);
            if (mtmp >= LOW_PM) {
                d.mntmp = mtmp;
                d.mgend = gbox.gender;
                // C `:4395` — `*d->p = 0` at " of ".
                const ofCut = d.bp.slice(0, d.bp.length - ofTail.length);
                cbufReplace(d, ofCut);
                d.bp = ofCut;
            }
        }
    }

    // C `:4399–4419` — "Find corpse type w/o of" skips six head words
    // that are object names or rank titles, not monsters: "samurai
    // sword" (not the samurai monster), "wizard lock" (not the wizard
    // monster), "death wand" ('of inversion', not the Rider), "master
    // key" (not the Master rank), "ninja-to" (not the ninja rank),
    // "magenta" (not the mage rank). Without the "master key" guard a
    // wish for the Master Key of Thievery truncates bp at the Monk rank
    // title and never reaches artifact_name (D-2577 regression:
    // scen-wish-Priest-92163 + scen-wish-Rogue-92221).
    {
        const rem = { rest: null };
        const noMonScan = str_start_is(d.bp, 'samurai sword', true)
            || str_start_is(d.bp, 'wizard lock', true)
            || str_start_is(d.bp, 'death wand', true)
            || str_start_is(d.bp, 'master key', true)
            || str_start_is(d.bp, 'ninja-to', true)
            || str_start_is(d.bp, 'magenta', true);
        if (!noMonScan && d.mntmp < LOW_PM && d.bp.length > 2) {
            // C objnam.c:4408 passes &d->mgend (init -1); write back even
            // on NON_PM since name_to_monplus may still set matchgend.
            const gbox = { gender: d.mgend };
            const mndx = name_to_monplus(d.bp, rem, gbox);
            d.mgend = gbox.gender;
            if (mndx >= LOW_PM) {
                d.mntmp = mndx;
                let rest = rem.rest || '';
                if (rest.startsWith(' ')) rest = rest.slice(1);
                else if (/^s /i.test(rest)) rest = rest.slice(2);
                else if (/^es /i.test(rest) || /^'s /i.test(rest)) rest = rest.slice(3);
                else if (!rest && !d.actualn && !d.dn && !d.un && !d.oclass) {
                    d.mntmp = NON_PM;
                    rest = d.bp;
                }
                if (d.mntmp >= LOW_PM) {
                    // C `:4415` — rest points into the same buffer.
                    cbufSkipToSuffix(d, rest);
                    d.bp = rest;
                }
            }
        }
    }

    // C `:4421–4445` — makesingular before alt spellings / wrp / srch.
    // Exceptions: "tricks" (bag of tricks), "clothes" (avoid cloth false
    // hit).
    if (d.bp && !d.typ && !/^tricks$/i.test(d.bp) && !/^clothes$/i.test(d.bp)) {
        const sng = makesingular(d.bp);
        if (sng !== d.bp) {
            if (d.cnt === 1) d.cnt = 2;
            // C `:4453` — Strcpy(d->bp, sng) at the cursor, not origbp.
            cbufReplace(d, sng);
            d.bp = sng;
        }
    }

    // C `:4457–4475` — alternate spellings (luckstone, saber, tripe,
    // ...) resolve with no RNG before wrp / srch.
    if (!d.typ) {
        for (let si = 0; si < ALT_SPELLINGS_RESOLVED.length; si++) {
            if (wishymatch(d.bp, ALT_SPELLINGS_RESOLVED[si][0], true)) {
                d.typ = ALT_SPELLINGS_RESOLVED[si][1];
                return 2; // goto typfnd
            }
        }
        // C `:4468–4469` — can't use the spellings list (shuffled);
        // "grey spell" → "gray spell" in place.
        if (strncmpi(d.bp, 'grey spell', 10) === 0) {
            const fixed = d.bp.slice(0, 2) + 'a' + d.bp.slice(3);
            cbufReplace(d, fixed);
            d.bp = fixed;
        }
        // C `:4471–4475` — "armour" → "armor" squeeze in place (skip
        // past "armo", then copy the remainder beyond the "u").
        const armourTail = strstri(d.bp, 'armour');
        if (armourTail !== null) {
            const at = d.bp.length - armourTail.length + 4;
            const fixed = d.bp.slice(0, at) + d.bp.slice(at + 1);
            cbufReplace(d, fixed);
            d.bp = fixed;
        }
    }

    // C `:4477–4482` — dragon scales (assumes order of dragons).
    if (/^scales$/i.test(d.bp) && d.mntmp >= GRAY_DRAGON && d.mntmp <= YELLOW_DRAGON) {
        d.typ = GRAY_DS + (d.mntmp - GRAY_DRAGON);
        d.mntmp = NON_PM;
        return 2; // goto typfnd
    }

    // C `:4484–4496` — "[un]holy water" suffix ("potion of [un]holy
    // water" needs it: adjective parsing stops at "potion", and neither
    // is an actual potion type).
    if (bstrcmpi_end(d.bp, 'holy water')) {
        if (d.bp.length >= 12
            && strncmpi(d.bp.slice(d.bp.length - 12, d.bp.length - 10), 'un', 2) === 0)
            d.iscursed = 1, d.blessed = d.uncursed = 0; // unholy water
        else
            d.blessed = 1, d.iscursed = d.uncursed = 0; // holy water
        d.typ = POT_WATER;
        return 2; // goto typfnd
    }
    // C `:4497–4508` — accept "paperback" or "paperback book", reject
    // "paperback spellbook" (the wish fails outright).
    if (strncmpi(d.bp, 'paperback', 9) === 0) {
        const dbp = d.bp.slice(9);
        if (!dbp || strncmpi(dbp, ' book', 5) === 0) {
            d.typ = SPE_NOVEL;
            return 2; // goto typfnd
        }
        d.otmp = null;
        return 3; // return otmp
    }
    // C `:4509–4516` — "unlabeled scroll/spellbook" → blank paper.
    if (d.unlabeled && bstrcmpi_end(d.bp, 'scroll')) {
        d.typ = SCR_BLANK_PAPER;
        return 2; // goto typfnd
    }
    if (d.unlabeled && bstrcmpi_end(d.bp, 'spellbook')) {
        d.typ = SPE_BLANK_PAPER;
        return 2; // goto typfnd
    }
    // C `:4517–4521` — "orange" is the fruit, not a gem/potion color.
    if (bstrcmpi_end(d.bp, 'orange') && d.mntmp === NON_PM) {
        d.typ = ORANGE;
        return 2; // goto typfnd
    }

    // C `:4528–4545` — gold/money → mksobj(GOLD_PIECE, FALSE) and return
    // otmp (skips namedesc / typfnd). A leading GOLD_SYM anywhere means
    // gold (C `*d->bp == GOLD_SYM`, first char, not whole bp).
    {
        const bp = d.bp || '';
        const end = bp.length;
        const isGold = (end >= 10 && bp.slice(end - 10).toLowerCase() === 'gold piece')
            || (end >= 7 && bp.slice(end - 7).toLowerCase() === 'zorkmid')
            || /^gold$/i.test(bp) || /^money$/i.test(bp) || /^coin$/i.test(bp)
            || (end > 0 && bp[0] === GOLD_SYM);
        if (!d.typ && isGold && GOLD_PIECE >= 0) {
            let cnt = d.cnt | 0;
            if (cnt > 5000 && !wizardMode()) cnt = 5000;
            else if (cnt < 1) cnt = 1;
            d.otmp = mksobj(GOLD_PIECE, false, false);
            if (!d.otmp) return 3;
            d.otmp.quan = cnt;
            d.otmp.owt = weight(d.otmp);
            if (game.flags) game.flags.botl = true; // C: disp.botl = TRUE
            if (game.disp) game.disp.botl = true;
            return 3; // return otmp
        }
    }

    // C `:4548–4553` — single character class code ("/" wand, ...).
    if (d.bp && d.bp.length === 1) {
        const i = def_char_to_objclass(d.bp);
        if (i < MAXOCLASSES && i > ILLOBJ_CLASS
            && (i !== VENOM_CLASS || wizardMode())) {
            d.oclass = i;
            return 4; // goto any
        }
    }

    // C `:4555–4615` — class names ("<class> [of] X" / "X <class>");
    // "foo amulet" keeps the class word for "of inversion" matching.
    {
        const rc = readobjnam_parse_class_words(d);
        if (rc !== 0) return rc; // 1 → srch, 2 → typfnd
    }

    // C `:4630–4661` — wizard "bear trap"/"land mine": "untrapped <foo>"
    // or "<foo> object" is the disarmed object; "trapped <foo>" or any
    // other suffix is the armed trap (canonical spelling → wiztrap).
    // Without prefix or suffix the object name matches below instead.
    if (wizardMode() && d.bp
        && (strncmpi(d.bp, 'bear', 4) === 0
            || strncmpi(d.bp, 'land', 4) === 0)) {
        const beartrap = d.bp[0].toLowerCase() === 'b';
        let zp = d.bp.slice(4);
        if (zp[0] === ' ') zp = zp.slice(1); // space is optional
        if (strncmpi(zp, beartrap ? 'trap' : 'mine', 4) === 0) {
            zp = zp.slice(4);
            if (d.trapped === 2 || zp.toLowerCase() === ' object') {
                d.typ = beartrap ? BEARTRAP : LAND_MINE;
                return 2; // goto typfnd
            }
            if (d.trapped === 1 || zp !== '') {
                // C: Strcpy(d->bp, trapname(...)) — canonical spelling.
                const canon = trapname(beartrap ? BEAR_TRAP : LANDMINE, true);
                cbufReplace(d, canon);
                d.bp = canon;
                return 5; // goto wiztrap
            }
        }
    }

    return 0;
}

/**
 * C ref: objnam.c readobjnam_postparse2 `:4666–4724` (staticfn; sole C
 * caller is readobjnam `retry:` `:4947–4955`). Return codes mirror C:
 * 0 fall through, 1 goto srch, 2 goto typfnd, 3 return otmp
 * (the switch's 4/5 arms are unreachable from this body).
 * d.p is eos(d.bp) at entry (postparse1 `:4488`), so the BSTRCMPI
 * checks below are plain suffix matches on d.bp.
 */
export function readobjnam_postparse2(d) {
    // C `:4671–4675` — o_ranges exact match (grey-stone arms sit here so
    // they win before the general " stone" strip below).
    for (let i = 0; i < O_RANGES.length; i++) {
        if (String(d.bp || '').toLowerCase() === O_RANGES[i][0]) { // C: strcmpi
            d.typ = rnd_class(O_RANGES[i][2], O_RANGES[i][3]); // C: rnd_class
            return 2; // C: goto typfnd
        }
    }

    // C `:4677–4683` — trailing " stone" / " gem" → GEM_CLASS + srch.
    if (bstrcmpi_end(d.bp, ' stone') || bstrcmpi_end(d.bp, ' gem')) { // C: BSTRCMPI
        // C `:4680` — cut 4 (" gem") else 6 (" stone").
        const bp = String(d.bp || '');
        // C `:4680` — `d->p[idx] = 0` cuts " gem" / " stone" out of the buffer.
        const gemCut = bp.slice(0, bp.length - (bstrcmpi_end(bp, ' gem') ? 4 : 6));
        cbufReplace(d, gemCut);
        d.bp = gemCut;
        d.oclass = GEM_CLASS;
        d.dn = d.actualn = d.bp;
        return 1; // C: goto srch
    } else if (String(d.bp || '').toLowerCase() === 'looking glass') { // C `:4684–4685`
        ; // C: empty arm — avoid the "* glass" false hit, fall to the tail
    } else if (bstrcmpi_end(d.bp, ' glass') // C `:4686–4688` — BSTRCMPI + strcmpi
               || String(d.bp || '').toLowerCase() === 'glass') {
        let s = d.bp;

        // C `:4690–4694` — "broken glass" is a non-existent item.
        if ((d.broken | 0) || strstri(s, 'broken') !== null) {
            d.otmp = null;
            return 3; // C: return otmp
        }
        if (strncmpi_start(s, 'worthless ')) // C `:4696–4697`
            s = s.slice(10);
        if (strncmpi_start(s, 'piece of ')) // C `:4698–4699`
            s = s.slice(9);
        if (strncmpi_start(s, 'colored ')) // C `:4700–4701`
            s = s.slice(8);
        else if (strncmpi_start(s, 'coloured ')) // C `:4702–4703`
            s = s.slice(9);
        if (String(s).toLowerCase() === 'glass') { // C `:4704` — strcmpi
            // C `:4705–4709` — bare "glass" → random color, 9 kinds.
            d.typ = FIRST_GLASS_GEM + rn2(NUM_GLASS_GEMS);
            if ((game.objects?.[d.typ]?.oc_class ?? 0) === GEM_CLASS) // C: objects[].oc_class
                return 2; // C: goto typfnd
            else
                d.typ = 0; // C: somebody changed objects[]? punt
        } else { // C `:4710–4716` — rebuild the canonical form for srch
            const canon = 'worthless piece of ' + s;
            cbufReplace(d, canon); // C: Strcpy(d->bp, tbuf) at the cursor
            d.bp = canon;
        }
    }

    d.actualn = d.bp; // C `:4719–4723` tail
    if (!d.dn)
        d.dn = d.actualn; // C: ex. "skull cap"
    return 0;
}

/**
 * C ref: objnam.c readobjnam_postparse3 `:4727–4899` (staticfn; sole C
 * caller is readobjnam `srch:` `:4958–4967`). Return codes mirror C:
 * 0 fall through, 2 goto typfnd, 6 goto retry (armor ` mail` appended).
 * (Codes 1/3/4/5 belong to the postparse1/2 switch arms, unreachable here.)
 */
export function readobjnam_postparse3(d) {
    // C `:4731–4747` — real gem names match exactly (and plain "tin" is a
    // tin) with no RNG before srch.
    if (!d.oclass && d.actualn) {
        const glo = (game.bases && game.bases[GEM_CLASS]) | 0;
        const want = String(d.actualn).toLowerCase();
        for (let gi = glo; gi <= LAST_REAL_GEM; gi++) {
            const zn = objectNameStrs[gi];
            if (zn && want === String(zn).toLowerCase()) { // C: strcmpi
                d.typ = gi;
                return 2; // C: goto typfnd
            }
        }
        // C `:4741–4746` — "tin of foo" was caught above, but plain "tin"
        // has a random chance of yielding "tin wand" unless caught here.
        if (want === 'tin') { // C: strcmpi
            d.typ = TIN;
            return 2; // C: goto typfnd
        }
    }

    // C `:4749–4759` — the namedesc srch chain. The C `!=` pointer guards
    // on dn/origbp are value comparisons here; a same-content redundant
    // call draws nothing extra (namedesc draws `rn2` only on a hit, which
    // short-circuits the `||` chain either way).
    if ((((d.typ = rnd_otyp_by_namedesc(d.actualn, d.oclass, 1))
          !== STRANGE_OBJECT))
        || (d.dn !== d.actualn
            && ((d.typ = rnd_otyp_by_namedesc(d.dn, d.oclass, 1))
                !== STRANGE_OBJECT))
        || (((d.typ = rnd_otyp_by_namedesc(d.un, d.oclass, 1)))
            !== STRANGE_OBJECT)
        || (d.origbp !== d.actualn
            && ((d.typ = rnd_otyp_by_namedesc(d.origbp, d.oclass, 1))
                !== STRANGE_OBJECT)))
        return 2; // C: goto typfnd
    d.typ = 0; // C `:4760`

    // C `:4762–4772` — Japanese wish names (samurai vocabulary).
    if (d.actualn) {
        const jtyp = japanese_otyp_by_name(d.actualn); // C: strcmpi walk
        if (jtyp) {
            d.typ = jtyp;
            return 2; // C: goto typfnd
        }
    }

    // C `:4773–4781` — "armor" was stripped as a class word and nothing
    // matched: append " mail" and retry (C `goto retry` re-runs postparse2)
    // to catch "plate armor" / "yellow dragon scale armor".
    if (d.oclass === ARMOR_CLASS && strstri(d.bp, 'mail') === null) {
        // C: modifying bp's string is ok; random armor follows if this fails.
        d.bp += ' mail'; // C: Strcat `:4779` — appends at the cursor's NUL
        cbufReplace(d, d.bp);
        return 6; // C: goto retry
    }

    // C `:4782–4786` — bare "spinach" is a tin of spinach.
    if (String(d.bp || '').toLowerCase() === 'spinach') { // C: strcmpi
        d.contents = TIN_SPINACH;
        d.typ = TIN;
        return 2; // C: goto typfnd
    }

    // C `:4805–4870` — fruits are checked last so real object names win
    // (the name table holds "fruit" since init, C options.c `:7341`, so the
    // srch chain above cannot see it). Prefix matching is case-insensitive
    // but the fruit-name match itself is case-sensitive strcmp, not
    // wishymatch (C `:4801–4804` — "grapefruit" must not match "grape").
    if (d.fruitbuf) {
        let fp = d.fruitbuf;
        let cntf = 0;
        let blessedf = 0, iscursedf = 0, uncursedf = 0, halfeatenf = 0;
        for (;;) {
            if (!fp) break; // C `:4812–4813` also breaks on empty
            const low = fp.toLowerCase();
            let l = 0;
            if (low.startsWith('an ')) { cntf = 1; l = 3; } // C `:4814–4815`
            else if (low.startsWith('a ')) { cntf = 1; l = 2; } // C `:4814–4815`
            else if (!cntf && fp[0] >= '0' && fp[0] <= '9') { // C `:4816–4822`
                const m = fp.match(/^(\d+)/); // C: atoi + digit skip
                cntf = parseInt(m[1], 10);
                fp = fp.slice(m[1].length).replace(/^ +/, '');
                continue;
            } else if (low.startsWith('blessed ')) { blessedf = 1; l = 8; }
            else if (low.startsWith('cursed ')) { iscursedf = 1; l = 7; }
            else if (low.startsWith('uncursed ')) { uncursedf = 1; l = 9; }
            else if (low.startsWith('partly eaten ')) { halfeatenf = 1; l = 13; }
            else if (low.startsWith('partially eaten ')) { halfeatenf = 1; l = 16; }
            else break;
            fp = fp.slice(l);
        }
        for (let f = game.ffruit; f; f = f.nextf) { // C `:4841` gf.ffruit
            let ftyp = 0; // C `:4843` 0=none, 1=exact, 2=singular, 3=plural
            if (fp === f.fname) ftyp = 1; // C `:4845` strcmp, exact
            else if (fp === makesingular(f.fname)) ftyp = 2; // C `:4847`
            else if (fp === makeplural(f.fname)) ftyp = 3; // C `:4849`
            if (ftyp) {
                d.typ = SLIME_MOLD;
                d.blessed = blessedf;
                d.iscursed = iscursedf;
                d.uncursed = uncursedf;
                d.halfeaten = halfeatenf;
                // C `:4861–4864` — singular/plural amount when not explicit.
                if (ftyp === 2 && !cntf) cntf = 1;
                else if (ftyp === 3 && !cntf) cntf = 2;
                d.cnt = cntf;
                d.ftype = f.fid;
                return 2; // C: goto typfnd
            }
        }
    }

    // C `:4872–4881` — perhaps an artifact specified by name, not type.
    if (!d.oclass && d.actualn) {
        const out = { otyp: 0 };
        const aname = artifact_name(d.actualn, out, true); // C: TRUE
        if (aname) {
            d.name = aname;
            d.typ = out.otyp;
            return 2; // C: goto typfnd
        }
    }

    // C `:4883–4896` — got a class but no type: class-gated alternate
    // spellings (postparse1's ungated loop already ran; bp may have changed
    // under postparse2, e.g. the gem/glass arms).
    if (d.oclass && !d.typ) {
        for (let si = 0; si < ALT_SPELLINGS_RESOLVED.length; si++) {
            if ((game.objects?.[ALT_SPELLINGS_RESOLVED[si][1]]?.oc_class ?? 0)
                    === d.oclass // C: objects[as->ob].oc_class
                && wishymatch(d.bp, ALT_SPELLINGS_RESOLVED[si][0], true)) {
                d.typ = ALT_SPELLINGS_RESOLVED[si][1];
                return 2; // C: goto typfnd
            }
        }
    }

    return 0;
}

/**
 * C ref: objnam.c readobjnam — wish subset for artifact / named armor / amulet.
 * Empty/NULL → `any` (D-0559); qualifier-only empty (blessed/rustproof/…) deferred.
 * Terrain wish is readobjnam_wish (D-1279 furniture; D-1289 traps;
 * D-1290 door/wall; D-1304 secret corridor).
 */
/**
 * C ref: objnam.c rnd_otyp_by_wpnskill `:3432–3452` (staticfn).
 * Walk `bases[WEAPON_CLASS]` while `oc_class` stays `WEAPON_CLASS`.
 * Count `oc_skill == skill`, then `rn2(n)` selects that slot in
 * the same order (`--n < 0`). No match returns `STRANGE_OBJECT`
 * (the first walk's last hit is the fallback if the second walk
 * does not return).
 * @param {number} skill
 * @returns {number}
 */
function rnd_otyp_by_wpnskill(skill) {
    const objects = game.objects || [];
    const bases = game.bases || [];
    const skillN = skill | 0;
    let n = 0;
    let otyp = STRANGE_OBJECT;
    const start = bases[WEAPON_CLASS] | 0;
    for (let i = start;
        i < NUM_OBJECTS && (objects[i]?.oc_class | 0) === WEAPON_CLASS;
        i++) {
        if ((objects[i].oc_skill | 0) === skillN) {
            n++;
            otyp = i;
        }
    }
    if (n > 0) {
        n = rn2(n);
        for (let i = start;
            i < NUM_OBJECTS && (objects[i]?.oc_class | 0) === WEAPON_CLASS;
            i++) {
            if ((objects[i].oc_skill | 0) === skillN) {
                if (--n < 0) return i;
            }
        }
    }
    return otyp;
}

/**
 * C objnam.c readobjnam `:4982–4989`. `null` means the prefix did
 * not match. A number, including `STRANGE_OBJECT`, means it did.
 * `strncmpi(bp, "polearm", 7)` / `strncmpi(bp, "hammer", 6)`.
 * @returns {number|null}
 */
function wish_otyp_by_wpnskill_prefix(bp) {
    /* C `:4983` — first 7 characters, case-insensitive. */
    if (strncmpi_start(bp, 'polearm')) return rnd_otyp_by_wpnskill(P_POLEARMS);
    /* C `:4986` */
    if (strncmpi_start(bp, 'hammer')) return rnd_otyp_by_wpnskill(P_HAMMER);
    return null;
}

/**
 * C ref: objnam.c readobjnam_init `:3933–3961`.
 * Zeros the wish-parse record, then the non-zero defaults, in that
 * assignment order. `fruitbuf` and `globbuf` start empty (C memset).
 * The caller copies the munged wish into `fruitbuf` (`:4926`) after
 * the nothing/nil/none return. `tmp` and `tinv` stay unset, as in C.
 */
function readobjnam_init(bp, d) {
    /* C `:3935` */
    d.otmp = null;
    /* C `:3936` */
    d.cnt = 0;
    d.spe = 0;
    d.spesgn = 0;
    d.typ = 0;
    /* C `:3937–3945` — one zero chain, rightmost store is `fake`. */
    d.very = 0;
    d.rechrg = 0;
    d.blessed = 0;
    d.uncursed = 0;
    d.iscursed = 0;
    d.ispoisoned = 0;
    d.isgreased = 0;
    d.eroded = 0;
    d.eroded2 = 0;
    d.erodeproof = 0;
    d.halfeaten = 0;
    d.islit = 0;
    d.unlabeled = 0;
    d.ishistoric = 0;
    d.isdiluted = 0;
    d.trapped = 0;
    d.locked = 0;
    d.unlocked = 0;
    d.broken = 0;
    d.open = 0;
    d.closed = 0;
    d.doorless = 0;
    d.looted = 0;
    d.real = 0;
    d.fake = 0;
    /* C `:3946–3950` */
    d.tvariety = RANDOM_TIN;
    d.mgend = -1; /* not specified, aka random */
    d.mntmp = NON_PM;
    d.contents = TIN_UNDEFINED;
    d.oclass = 0;
    /* C `:3951–3954` — null name pointers; zombify is FALSE. */
    d.actualn = null;
    d.dn = null;
    d.un = null;
    d.wetness = 0;
    d.gsize = 0;
    d.zombify = 0;
    /* C `:3955–3958` — bp/origbp alias the caller; ftype is current fruit. */
    d.bp = bp;
    d.origbp = bp;
    d.p = null;
    d.name = null;
    d.ftype = (game.context?.current_fruit | 0);
    /* C `:3959–3960` — memset('\0'). JS has no BUFSZ slab. */
    d.globbuf = '';
    d.fruitbuf = '';
}

export function readobjnam(bp, no_wish, missOut) {
    // Caller's char* after mungspaces and in-place writes (files.c:2568).
    const d = {};
    let munged = null;
    const ret = (value) => {
        publishWishbuf(missOut, d, munged);
        /* Vanish arm (finish) marks d.vanished; the async wrapper needs d
           to emit C's `:5378–5379` pline after this sync return. */
        if (d.vanished && missOut) missOut.d = d;
        return value;
    };
    // C objnam.c:4914 — init even when bp is null, then goto any.
    readobjnam_init(bp, d);
    if (bp == null) {
        return readobjnam_any(d);
    }
    munged = mungspaces(bp);
    bp = munged;
    // C mungspaces edits the same buffer d.bp / d.origbp already alias.
    d.bp = bp;
    d.origbp = bp;
    d._cbuf = bp;
    d._boff = 0;
    // C: "nothing"/"nil"/"none" → return no_wish (wishless conduct)
    if (/^(nothing|nil|none)$/i.test(bp)) return ret(no_wish || NOTHING_OBJ);
    // C: empty bp (or ESC already cleared by makewish) → preparse returns 1 → any
    if (!bp || bp === '\x1b') {
        return ret(readobjnam_any(d));
    }
    // C objnam.c:4926 — Strcpy(d.fruitbuf, bp) after the nothing return.
    // Init left fruitbuf zeroed; this is the pre-prefix wish text.
    d.fruitbuf = bp;

    // C ref: objnam.c readobjnam `:4928` — preparse strips wish prefixes;
    // nonzero (empty bp) goes `any` (C `goto any`).
    if (readobjnam_preparse(d)) {
        return ret(readobjnam_any(d));
    }
    if (!d.cnt) d.cnt = 1;

    // C: readobjnam_parse_charges before postparse
    readobjnam_parse_charges(d);

    // C `:4936–4945` — postparse1 dispatch: 2 typfnd, 3 return otmp,
    // 4 any, 5 wiztrap; 1 skips postparse2 (goto srch), 0 runs it.
    const rc1 = readobjnam_postparse1(d);
    if (rc1 === 3) return ret(d.otmp);
    if (rc1 === 4) return ret(readobjnam_any(d));
    if (rc1 === 2) return ret(readobjnam_finish(d));
    const atWiztrap = (rc1 === 5);
    if (!atWiztrap && rc1 !== 1) {
        // C `retry:` `:4947–4955` — postparse2 dispatch (codes 0/1 run
        // srch below; C's 4/5 arms are unreachable from its body).
        const rc2 = readobjnam_postparse2(d);
        if (rc2 === 3) return ret(d.otmp);
        if (rc2 === 2) return ret(readobjnam_finish(d));
    }
    if (!atWiztrap) {
        // C `srch:` `:4958–4967` — postparse1's fall-through arrives with
        // d.typ unset; actualn/dn default before srch.
        if (!d.actualn) d.actualn = d.bp;
        if (!d.dn) d.dn = d.actualn;

        // C `srch:` + `retry:` — postparse3 returns 0/2/6 only (C's
        // case-1 re-entry is unreachable). Case 6 (armor " mail"
        // appended, `:4776–4780`) re-runs postparse2 on the extended bp,
        // then srch again; the arm self-terminates (bp then contains
        // "mail"). Case 2 leaves d.typ set (typfnd, via the tail below);
        // 0 falls through to wiztrap.
        for (;;) {
            const rc3 = readobjnam_postparse3(d);
            if (rc3 !== 6) break;
            const rc2 = readobjnam_postparse2(d);
            if (rc2 === 3) return ret(d.otmp); // C retry-switch: return otmp
            if (d.typ) break; // C retry-switch case 2 → typfnd (0/1 → srch)
        }
    }

    /* C `wiztrap:` `:4969–4975` + `:4977–4992`. A code-5 arrival (wizard
       "bear trap"/"land mine" canonical spelling) and the srch
       fall-through share this tail. Wizard && !wizkit leaves the miss for
       readobjnam_wish so wizterrainwish runs before the prefix; sync
       callers (files, mklev) cannot await it and resolve the skill
       prefix here like before. A hit falls through even when the pick
       is STRANGE_OBJECT. */
    if (!(d.typ | 0) && !(d.oclass | 0)) {
        const deferWiztrap = deferSkillPrefixForWiztrap
            && wizardMode()
            && !(game.program_state?.wizkit_wishing | 0);
        let skillHit = false;
        if (!deferWiztrap) {
            const picked = wish_otyp_by_wpnskill_prefix(d.bp);
            if (picked !== null) {
                skillHit = true;
                d.typ = picked | 0;
            }
        }
        if (!skillHit) {
            if (missOut) missOut.d = d;
            return ret(null);
        }
    }

    return ret(readobjnam_finish(d));
}

/**
 * C objnam.c readobjnam `typfnd` `:4997` through the object return.
 * `rnd_otyp_by_wpnskill` is the only path that arrives with both
 * `typ` and `oclass` still 0: C `:5037` then `mkobj`s `RANDOM_CLASS`.
 * Every other arrival keeps the previous `mksobj(d.typ)` line.
 */
function readobjnam_finish(d) {
    /* C `typfnd:` `:4997–4998` — the any path defaulted oclass (or typ
       is set); a set typ recomputes oclass. Unreachable with neither. */
    if (d.typ) d.oclass = game.objects?.[d.typ]?.oc_class ?? 0;

    // C `typfnd:` `:4998–5020` — wizard-only objects remap for normal
    // play (same-class remaps, so oclass needs no recompute).
    if (d.typ && !wizardMode()) {
        switch (d.typ) {
        case AMULET_OF_YENDOR:
            d.typ = FAKE_AMULET_OF_YENDOR;
            break;
        case CANDELABRUM_OF_INVOCATION:
            d.typ = rnd_class(TALLOW_CANDLE, WAX_CANDLE);
            break;
        case BELL_OF_OPENING:
            d.typ = BELL;
            break;
        case SPE_BOOK_OF_THE_DEAD:
            d.typ = SPE_BLANK_PAPER;
            break;
        case MAGIC_LAMP:
            d.typ = OIL_LAMP;
            break;
        default:
            /* catch any other non-wishable objects (venom);
               vacuous: no object sets oc_nowish in C. */
            if (game.objects?.[d.typ]?.oc_nowish)
                return null;
            break;
        }
    }

    // C `:5022–5028` — a pudding corpse wish is a glob, not a
    // random-corpse rejection (JS mlet is a string).
    if (d.typ === CORPSE && d.mntmp >= LOW_PM
        && mons(d.mntmp)?.mlet === 'S_PUDDING') {
        d.typ = GLOB_OF_GRAY_OOZE + (d.mntmp - PM_GRAY_OOZE);
        d.mntmp = NON_PM; // not used for globs
    }

    /* C `:5031–5033` — mksobj for a set typ, else mkobj of the class;
       then re-read what we actually got. */
    d.otmp = d.typ ? mksobj(d.typ, true, false) : mkobj(d.oclass, false);
    d.typ = d.otmp.otyp;
    d.oclass = d.otmp.oclass; /* what we actually got */

    // C ref: objnam.c readobjnam `:5042–5083` — globs weigh by gsize
    // and cnt (quan always 1); other mergeables honor d.cnt when
    // oc_merge (wizard unrestricted; else rnd(6) / candle <=7 /
    // ammo-or-rock <=20).
    if (d.otmp.globby) {
        /* for globs, calculate weight based on gsize, then multiply by cnt;
           asking for 2 globs or for 2 small globs produces 1 small glob
           weighing 40au instead of normal 20au; asking for 5 medium globs
           might produce 1 very large glob weighing 600au */
        d.otmp.quan = 1; /* always 1 for globs */
        d.otmp.owt = weight(d.otmp);
        /* gsize 0: unspecified => small;
           1: small (1..5) => keep default owt for 1, yielding 20;
           2: medium (6..15) => use weight for 6, yielding 120;
           3: large (16..25) => 320; 4: very large (26+) => 520 */
        if ((d.gsize | 0) > 1)
            d.otmp.owt += (5 + ((d.gsize | 0) - 2) * 10) * d.otmp.owt;
        /* limit overall weight which limits shrink-away time which in turn
           affects how long some of it will remain available to be eaten */
        if ((d.cnt | 0) > 1) {
            let rn1cnt = rn1(5, 2); /* 2..6 */
            if (rn1cnt > 6 - (d.gsize | 0))
                rn1cnt = 6 - (d.gsize | 0);
            /* C's third disjunct (y_n("Override glob weight limit?")) is
               async in JS (named map): this chain is sync for the
               files/mklev callers, so an over-limit wizard-interactive
               wish clamps as on 'n'; normal and wizkit wishes are exact. */
            if ((d.cnt | 0) > rn1cnt
                && (!wizardMode()
                    || (game.program_state?.wizkit_wishing | 0) !== 0))
                d.cnt = rn1cnt;
            d.otmp.owt *= (d.cnt | 0);
        }
        /* note: the owt assignment below will not change glob's weight */
        d.cnt = 0;
    } else if ((d.cnt | 0) > 0) {
        if (oc_merge_of(d.typ)
            && (wizardMode()
                || (d.cnt | 0) < rnd(6)
                || ((d.cnt | 0) <= 7 && Is_candle(d.otmp))
                || ((d.cnt | 0) <= 20
                    && ((d.typ | 0) === ROCK || (d.typ | 0) === FLINT
                        || is_missile(d.otmp)
                        || (d.oclass === WEAPON_CLASS && is_ammo(d.otmp)))))) {
            d.otmp.quan = d.cnt | 0;
            d.otmp.owt = weight(d.otmp);
        }
    }

    // C `:5085–5091` — a wished lit lamp/candle burns: plant it so the
    // light source is viable, then release it for the caller's use.
    if (d.islit && (d.typ === OIL_LAMP || d.typ === MAGIC_LAMP
                    || d.typ === BRASS_LANTERN
                    || Is_candle(d.otmp) || d.typ === POT_OIL)) {
        place_object(d.otmp, game.u?.ux | 0, game.u?.uy | 0); // u.ux, u.uy
        begin_burn(d.otmp, false);
        obj_extract_self(d.otmp); // now release it for caller's use
    }

    if (d.spesgn === 0) {
        /* spe not specified; retain the randomly assigned value */
        d.spe = d.otmp.spe | 0;
    } else if (wizardMode()) {
        /* no restrictions except SPE_LIM */
    } else if (d.oclass === ARMOR_CLASS || d.oclass === WEAPON_CLASS
        || is_weptool(d.otmp)
        || (d.oclass === RING_CLASS && game.objects?.[d.typ]?.oc_charged)) {
        // C objnam.c readobjnam :5099–5105 — rnd(5) then Luck < 0 flips sign
        if ((d.spe | 0) > rnd(5) && (d.spe | 0) > (d.otmp.spe | 0))
            d.spe = 0;
        if ((d.spe | 0) > 2 && Luck() < 0)
            d.spesgn = -1;
    } else {
        // C: crystal ball cancels like a wand, to (n:-1)
        if (d.oclass === WAND_CLASS || d.typ === CRYSTAL_BALL) {
            if ((d.spe | 0) > 1 && d.spesgn === -1)
                d.spe = 1;
        } else if ((d.spe | 0) > 0 && d.spesgn === -1) {
            d.spe = 0;
        }
        if ((d.spe | 0) > (d.otmp.spe | 0))
            d.spe = d.otmp.spe | 0;
    }
    if (d.spesgn === -1) d.spe = -d.spe;
    if (d.spe > SPE_LIM) d.spe = SPE_LIM;
    if (d.spe < -SPE_LIM) d.spe = -SPE_LIM;
    /* C ref: objnam.c readobjnam — set otmp->spe; may or may not use d.spe.
       d.contents/d.mgend/d.tvariety are parsed by the "tin of"/" of " arm
       above (C `:4381–4397`); d.wetness ("wet "/"moist ") and d.ishistoric
       ("historic ") are parsed by readobjnam_preparse (`:4022–4028`,
       `:4095–4096`); d.ftype defaults to current_fruit (C `:3958`) and the
       postparse3 fruit arm sets it to the wished fruit's fid. */
    switch (d.typ) {
    case TIN:
        d.otmp.spe = 0; /* default: not spinach */
        if (d.contents === TIN_EMPTY) {
            d.otmp.corpsenm = NON_PM;
        } else if (d.contents === TIN_SPINACH) {
            d.otmp.corpsenm = NON_PM;
            d.otmp.spe = 1; /* spinach after all */
        }
        break;
    case TOWEL:
        if (d.wetness)
            d.otmp.spe = d.wetness;
        break;
    case SLIME_MOLD:
        // C objnam.c readobjnam `:5137–5138` — spe is the fruit id
        // (fruit-wish ftype, else the current-fruit default).
        d.otmp.spe = d.ftype | 0;
        break;
    case SKELETON_KEY:
    case CHEST:
    case LARGE_BOX:
    case HEAVY_IRON_BALL:
    case IRON_CHAIN:
        break;
    case STATUE: /* otmp->cobj already done in mksobj() */
    case FIGURINE:
    case CORPSE: {
        /* C ismnum (monst.h:285): LOW_PM..NUMMONS; mons() bounds-checks too. */
        const P = (d.mntmp >= LOW_PM) ? mons(d.mntmp) : null;
        d.otmp.spe = !P ? CORPSTAT_RANDOM
            /* if neuter, force neuter regardless of wish request */
            : is_neuter(P) ? CORPSTAT_NEUTER
                /* not neuter, honor wish unless it conflicts */
                : (d.mgend === FEMALE && !is_male(P)) ? CORPSTAT_FEMALE
                    : (d.mgend === MALE && !is_female(P)) ? CORPSTAT_MALE
                        /* unspecified (C default -1) or wish conflicts */
                        : CORPSTAT_RANDOM;
        if (P && d.otmp.spe === CORPSTAT_RANDOM)
            d.otmp.spe = is_male(P) ? CORPSTAT_MALE
                : is_female(P) ? CORPSTAT_FEMALE
                    : rn2(2) ? CORPSTAT_MALE : CORPSTAT_FEMALE;
        /* C: d.ishistoric ("historic" wish prefix, preparse `:4095–4096`). */
        if (d.ishistoric && d.typ === STATUE)
            d.otmp.spe |= CORPSTAT_HISTORIC;
        break;
    }
    case SCR_MAIL: /* MAIL_STRUCTURES is on (global.h:430) */
        d.otmp.spe = 1;
        break;
    /* splash of venom: 0: normal, and transitory; 1: wishing */
    case ACID_VENOM:
    case BLINDING_VENOM:
        d.otmp.spe = 1;
        break;
    case WAN_WISHING:
        if (!wizardMode()) {
            d.otmp.spe = (rn2(10) ? -1 : 0);
            break;
        }
        /* FALLTHROUGH — wizard: no restrictions except SPE_LIM */
        /*FALLTHRU*/
    default:
        d.otmp.spe = d.spe;
    }

    /* C ref: objnam.c readobjnam — set otmp->corpsenm or dragon scale [mail].
       SCALE_MAIL lives below (pre-existing dragon-mail hunk, same remap). */
    if (d.mntmp >= LOW_PM) {
        let mntmp = d.mntmp | 0;
        if (mntmp === PM_LONG_WORM_TAIL)
            mntmp = PM_LONG_WORM;
        /* werecreatures in beast form are all flagged no-corpse so for
           corpses and tins, switch to their corresponding human form;
           for figurines, override the can't-be-human restriction instead */
        if (d.typ !== FIGURINE && is_were(mons(mntmp))
            && (((game.mvitals?.[mntmp]?.mvflags ?? 0) & G_NOCORPSE) !== 0)) {
            const humanwere = counter_were(mntmp);
            if (humanwere !== NON_PM)
                mntmp = humanwere;
        }
        const P = mons(mntmp);
        const geno = P ? (P.geno | 0) : 0;
        const novitals = (((game.mvitals?.[mntmp]?.mvflags ?? 0) & G_NOCORPSE) !== 0);
        switch (d.typ) {
        case TIN:
            if (dead_species(mntmp, false)) {
                d.otmp.corpsenm = NON_PM; /* it's empty */
            } else if ((!(geno & G_UNIQ) || wizardMode())
                       && !novitals
                       && P && (P.cnutrit | 0) !== 0) {
                d.otmp.corpsenm = mntmp;
            }
            break;
        case CORPSE:
            if ((!(geno & G_UNIQ) || wizardMode()) && !novitals) {
                if (P && (P.msound | 0) === MS_GUARDIAN)
                    mntmp = genus(mntmp, 1);
                set_corpsenm(d.otmp, mntmp);
            }
            /* C `:5222–5225` — zombifying wish starts the hatch timer
               even for monsters with no zombie form: zombie_form()
               returns a mndx or NON_PM (-1), both nonzero, so the C
               gate is vacuous-true and the port keeps the call shape. */
            if (d.zombify && zombie_form(mons(mntmp))) {
                start_timer(rn1(5, 10), TIMER_OBJECT, ZOMBIFY_MON,
                            obj_to_any(d.otmp));
            }
            break;
        case EGG:
            mntmp = can_be_hatched(mntmp);
            /* this also sets hatch timer if appropriate (via set_corpsenm) */
            set_corpsenm(d.otmp, mntmp);
            break;
        case FIGURINE:
            if (!(geno & G_UNIQ)
                && (!is_human(P) || is_were(P))
                && mntmp !== PM_MAIL_DAEMON)
                d.otmp.corpsenm = mntmp;
            break;
        case STATUE:
            d.otmp.corpsenm = mntmp;
            if (Has_contents(d.otmp) && verysmall(mons(mntmp)))
                delete_contents(d.otmp); // no spellbook
            break;
        case SCALE_MAIL:
            // Dragon mail - depends on the order of objects & dragons.
            if (mntmp >= GRAY_DRAGON && mntmp <= YELLOW_DRAGON)
                d.otmp.otyp = GRAY_DSM + mntmp - GRAY_DRAGON;
            break;
        }
    }

    // C `:5258–5267` — blessed/cursed (weight() runs below and addinv()
    // takes care of luck, so the fields are set directly).
    if (d.iscursed) {
        curse(d.otmp);
    } else if (d.uncursed) {
        d.otmp.blessed = false;
        d.otmp.cursed = (Luck() < 0 && !wizardMode());
    } else if (d.blessed) {
        d.otmp.blessed = (Luck() >= 0 || wizardMode());
        d.otmp.cursed = (Luck() < 0 && !wizardMode());
    } else if (d.spesgn < 0) {
        curse(d.otmp);
    }

    /* C `:5270–5288` — wished erosion only when the type can erode. A
       non-erosion object keeps whatever mksobj left. Damageproof plus
       damaged is legal (confused destroy-armor). */
    if (erosion_matters(d.otmp)) {
        d.otmp.oeroded = d.otmp.oeroded2 = 0;
        if (d.eroded && (is_flammable(d.otmp) || is_rustprone(d.otmp)
                         || is_crackable(d.otmp)))
            d.otmp.oeroded = d.eroded | 0;
        if (d.eroded2 && (is_corrodeable(d.otmp) || is_rottable(d.otmp)))
            d.otmp.oeroded2 = d.eroded2 | 0;
        if (d.erodeproof
            && (is_damageable(d.otmp)
                || (d.otmp.otyp | 0) === CRYSKNIFE))
            d.otmp.oerodeproof = (Luck() >= 0 || wizardMode()) ? 1 : 0;
    }

    // C: set otmp->recharged for WAND_CLASS
    if (d.oclass === WAND_CLASS) {
        let rechrg = d.rechrg | 0;
        if (d.otmp.otyp === WAN_WISHING && !wizardMode()) rechrg = 1;
        d.otmp.recharged = rechrg;
    }

    // C objnam.c readobjnam `:5298–5305` — wish "poisoned" coats
    // is_poisonable; else taint FOOD by age=1.
    if (d.ispoisoned) {
        if (is_poisonable(d.otmp)) d.otmp.opoisoned = (Luck() >= 0) ? 1 : 0;
        else if (d.oclass === FOOD_CLASS) d.otmp.age = 1;
    }

    // C `:5314–5318` — [un]trapped wishes (d.trapped 1/2 from preparse).
    if (d.trapped) {
        if (Is_box(d.otmp) || d.typ === TIN)
            d.otmp.otrapped = (d.trapped === 1) ? 1 : 0;
    }
    // C `:5320–5331` — "empty" for containers rather than for tins (tins
    // are handled in the spe switch above, not here).
    if (d.contents === TIN_EMPTY) {
        if (d.otmp.otyp === BAG_OF_TRICKS || d.otmp.otyp === HORN_OF_PLENTY) {
            if (d.otmp.spe > 0)
                d.otmp.spe = 0;
        } else if (Has_contents(d.otmp)) {
            /* this assumes that artifacts can't be randomly generated
               inside containers */
            delete_contents(d.otmp);
            d.otmp.owt = weight(d.otmp);
        }
    }
    // C `:5332–5341` — locked/unlocked/broken; a broken box is untrapped.
    if (Is_box(d.otmp)) {
        if (d.locked) {
            d.otmp.olocked = 1;
            d.otmp.obroken = 0;
        } else if (d.unlocked) {
            d.otmp.olocked = 0;
            d.otmp.obroken = 0;
        } else if (d.broken) {
            d.otmp.olocked = 0;
            d.otmp.obroken = 1;
        }
        if (d.otmp.obroken)
            d.otmp.otrapped = 0;
    }

    // C `:5343–5344` — greased.
    if (d.isgreased)
        d.otmp.greased = 1;

    // C `:5346–5347` — diluted potions (never plain water).
    if (d.isdiluted && d.otmp.oclass === POTION_CLASS)
        d.otmp.odiluted = (d.otmp.otyp !== POT_WATER) ? 1 : 0;

    // C ref: objnam.c readobjnam `:5342–5344` — set tin variety.
    // `rn2(4)` draws even in wizard mode (C `||` short-circuit kept).
    if (d.otmp.otyp === TIN && (d.tvariety | 0) >= 0 && (rn2(4) || wizardMode()))
        set_tin_variety(d.otmp, d.tvariety | 0);

    if (d.name) {
        const out = { otyp: 0 };
        const aname = artifact_name(d.name, out, true);
        if (aname && out.otyp === d.otmp.otyp) d.name = aname;
        // C objnam.c readobjnam :5355–5358 — SPE_NOVEL lookup_novel
        if (d.otmp.otyp === SPE_NOVEL) {
            const novelname = lookup_novel(d.name, d.otmp);
            if (novelname) d.name = novelname;
        }
        const wishedName = d.name;
        d.otmp = oname(d.otmp, d.name, ONAME_WISH);
        if (d.otmp.oartifact || wishedName === aname) {
            d.otmp.quan = 1;
            if (!game.u) game.u = {};
            if (!game.u.uconduct) game.u.uconduct = {};
            game.u.uconduct.wisharti = (game.u.uconduct.wisharti | 0) + 1;
        }
    }

    // C objnam.c readobjnam `:5368–5369` — Grimtooth always poisoned.
    if (permapoisoned(d.otmp)) d.otmp.opoisoned = 1;

    // C objnam.c readobjnam `:5371–5380` — wishing abuse: quest artifacts
    // short-circuit the existence roll (`is_quest_artifact || ...`, so no
    // rn2 for them); non-quest artifacts always roll rn2, even in wizard
    // mode (`&& !wizard` is last). Single if preserves C short-circuit.
    if ((is_quest_artifact(d.otmp)
         || (d.otmp.oartifact && rn2(nartifact_exist()) > 1)) && !wizardMode()) {
        artifact_exists(d.otmp, safe_oname(d.otmp), false, ONAME_NO_FLAGS);
        obfree(d.otmp, null);
        /* C `:5378–5379` "For a moment ..." pline is async-only in JS:
           mark it; readobjnam_wish emits it after this sync return. */
        d.vanished = 1;
        return HANDS_OBJ;
    }

    // C objnam.c readobjnam `:5383–5393` — partly-eaten wish: pre-eat one
    // bite before weighing (skipped for 0/1-nutrition food).
    if (d.halfeaten && d.otmp.oclass === FOOD_CLASS) {
        const nut = obj_nutrition(d.otmp);
        if (nut > 1) {
            d.otmp.oeaten = nut;
            consume_oeaten(d.otmp, 1);
        }
    }

    d.otmp.owt = weight(d.otmp);
    // C `:5397–5398` — "very heavy iron ball" weighs one increment more.
    if (d.very && d.otmp.otyp === HEAVY_IRON_BALL)
        d.otmp.owt += WT_IRON_BALL_INCR;

    return d.otmp;
}
