// objnam.js — object-name parsing helpers for wishing.
//
// C ref: src/objnam.c.  This module ports the random-object-by-name/
// description selection used when granting a wish (readobjnam ->
// rnd_otyp_by_namedesc) plus the supporting fuzzy string matching
// (wishymatch / fuzzymatch) and the wishable name tables (o_ranges,
// alt-spellings).  The single RNG draw lives in rnd_otyp_by_namedesc:
//
//     rn2(maxprob) @ rnd_otyp_by_namedesc(objnam.c:3522)
//
// rendered exactly as the C source emits it.  Matching itself consumes no
// RNG; it only determines the candidate set (n / maxprob) and ordering,
// which in turn fixes the object that the single rn2() resolves to.

import { rn2 } from './rng.js';
import { game } from './gstate.js';
import {
    objects,
    MAXOCLASSES,
    STRANGE_OBJECT,
    BELL_OF_OPENING,
    GLOB_OF_GRAY_OOZE,
    GLOB_OF_BLACK_PUDDING,
    WEAPON_CLASS,
} from './mkobj.js';
import { DESCR_BY_OTYP } from './o_descr_data.js';

const NUM_OBJECTS = objects.length;

// ─────────────────────────────────────────────────────────────────────────
// Object name / description / user-name accessors.
//
// C: OBJ_NAME(obj) = obj_descr[obj.oc_name_idx].oc_name
//    OBJ_DESCR(obj) = obj_descr[obj.oc_descr_idx].oc_descr
//    objects[i].oc_uname = player's call-name for that type
//
// In the JS port the canonical (never-shuffled) object name lives directly on
// objects[i].name.  The appearance text is keyed by the shuffled oc_descr_idx,
// matching C's obj_descr[objects[i].oc_descr_idx].oc_descr.
// ─────────────────────────────────────────────────────────────────────────
function OBJ_NAME(obj) {
    return obj && obj.name ? obj.name : null;
}
function OBJ_DESCR(obj) {
    if (!obj) return null;
    const idx = obj.oc_descr_idx != null ? obj.oc_descr_idx : obj.otyp;
    return DESCR_BY_OTYP[idx] ?? null;
}
function OBJ_UNAME(obj) {
    return obj && obj.oc_uname != null ? obj.oc_uname : null;
}

// ─────────────────────────────────────────────────────────────────────────
// String helpers (C ref: hacklib.c).  Self-contained so this module has no
// dependency on un-exported helpers elsewhere.
// ─────────────────────────────────────────────────────────────────────────

// lowc(): lower-case a single char (ASCII).  C ref: hacklib.c lowc().
function lowc(c) {
    return c >= 'A' && c <= 'Z' ? c.toLowerCase() : c;
}

// fuzzymatch(): compare two strings for equality, skipping any characters in
// ignore_chars (typically " -") and optionally case-blind.  Matches the C
// control flow exactly: each pass consumes one non-ignored char from each
// side, and a match requires both sides to reach their terminating NUL on the
// same pass.  C ref: hacklib.c fuzzymatch().
function fuzzymatch(s1, s2, ignore_chars, caseblind) {
    let i = 0, j = 0;
    const n1 = s1.length, n2 = s2.length;
    let c1, c2;
    do {
        // while ((c1 = *s1++) && strchr(ignore,c1)) continue;
        do {
            c1 = i < n1 ? s1[i++] : '\0';
        } while (c1 !== '\0' && ignore_chars.indexOf(c1) >= 0);
        do {
            c2 = j < n2 ? s2[j++] : '\0';
        } while (c2 !== '\0' && ignore_chars.indexOf(c2) >= 0);
        if (c1 === '\0' || c2 === '\0')
            break;
        if (caseblind) {
            c1 = lowc(c1);
            c2 = lowc(c2);
        }
    } while (c1 === c2);
    return c1 === '\0' && c2 === '\0';
}

// strstri(): case-insensitive substring search; returns the JS index of the
// first occurrence of needle in haystack, or -1.  C returns a pointer; here
// the index suffices and -1 means "not found".  C ref: hacklib.c strstri().
function strstri(haystack, needle) {
    if (haystack == null || needle == null) return -1;
    return haystack.toLowerCase().indexOf(needle.toLowerCase());
}

// strncmp / strncmpi over the first n chars.
function strncmp(a, b, n) {
    return a.slice(0, n) === b.slice(0, n);
}
function strncmpi(a, b, n) {
    return a.slice(0, n).toLowerCase() === b.slice(0, n).toLowerCase();
}
function strcmpi(a, b) {
    return a.toLowerCase() === b.toLowerCase();
}

// strsubst(): replace first occurrence of orig with replacement.  C ref:
// hacklib.c strsubst().
function strsubst(s, orig, replacement) {
    const idx = strstri(s, orig);
    if (idx < 0) return s;
    return s.slice(0, idx) + replacement + s.slice(idx + orig.length);
}

// makesingular(): minimal English de-pluralization sufficient for the
// wishymatch "detect <foo>" / "abilities" special cases.  Full makesingular
// lives in objnam.c; this covers the trailing-'s' cases those branches need.
function makesingular(s) {
    if (s == null) return s;
    if (s.endsWith('ies')) return s.slice(0, -3) + 'y';
    if (s.endsWith('s')) return s.slice(0, -1);
    return s;
}

// C ref: objnam.c fruitname() — name the player's current fruit, optionally
// appending " juice".  svp.pl_fruit defaults to "slime molds"; a custom fruit
// "<x> of <y>" uses the part after " of ".  No public session sets a custom
// fruit, so the default singular ("slime mold") drives "slime mold juice".
export function fruitname(juice) {
    const pl_fruit = game.svp?.pl_fruit || game.pl_fruit || 'slime molds';
    const idx = pl_fruit.indexOf(' of ');
    const fruit_nam = idx >= 0 ? pl_fruit.slice(idx + 4) : pl_fruit;
    return makesingular(fruit_nam) + (juice ? ' juice' : '');
}

// ─────────────────────────────────────────────────────────────────────────
// wishymatch(): does a user-supplied object name match a canonical object
// name/description?  C ref: objnam.c:3243 wishymatch().
//
//   u_str           — from the user (possibly a variant spelling)
//   o_str           — from objects[] (canonical form)
//   retry_inverted  — also try "foo of bar" <-> "bar foo" conversions
// ─────────────────────────────────────────────────────────────────────────
function wishymatch(u_str, o_str, retry_inverted) {
    const detect_SP = 'detect ';
    const SP_detection = ' detection';

    // ignore spaces & hyphens and upper/lower case when comparing
    if (fuzzymatch(u_str, o_str, ' -', true))
        return true;

    if (retry_inverted) {
        // when just one string is "foo of bar", convert it to "bar foo"
        const u_of = strstri(u_str, ' of ');
        const o_of = strstri(o_str, ' of ');
        if (u_of >= 0 && o_of < 0) {
            const buf = u_str.slice(u_of + 4) + ' ' + u_str.slice(0, u_of);
            if (fuzzymatch(buf, o_str, ' -', true))
                return true;
        } else if (o_of >= 0 && u_of < 0) {
            const buf = o_str.slice(o_of + 4) + ' ' + o_str.slice(0, o_of);
            if (fuzzymatch(u_str, buf, ' -', true))
                return true;
        }
    }

    // special cases (note: any " wand" suffix has already been stripped)
    if (strncmp(o_str, 'dwarvish ', 9)) {
        if (strncmpi(u_str, 'dwarven ', 8))
            return fuzzymatch(u_str.slice(8), o_str.slice(9), ' -', true);
    } else if (strncmp(o_str, 'elven ', 6)) {
        if (strncmpi(u_str, 'elvish ', 7))
            return fuzzymatch(u_str.slice(7), o_str.slice(6), ' -', true);
        else if (strncmpi(u_str, 'elfin ', 6))
            return fuzzymatch(u_str.slice(6), o_str.slice(6), ' -', true);
    } else if (strstri(o_str, 'helm') >= 0 && strstri(u_str, 'helmet') >= 0) {
        const buf = strsubst(u_str, 'helmet', 'helm');
        return wishymatch(buf, o_str, true);
    } else if (strstri(o_str, 'gauntlets') >= 0 && strstri(u_str, 'gloves') >= 0) {
        const buf = strsubst(u_str, 'gloves', 'gauntlets');
        return wishymatch(buf, o_str, true);
    } else if (strncmp(o_str, detect_SP, detect_SP.length)) {
        // "detect <foo>" vs "<foo> detection"
        const p = strstri(u_str, SP_detection);
        if (p >= 0 && p + SP_detection.length === u_str.length) {
            let inner = u_str.slice(0, p);
            let buf = detect_SP + inner;
            if (strcmpi(inner, 'monster'))
                buf += 's';
            return fuzzymatch(buf, o_str, ' -', true);
        }
    } else if (strstri(o_str, SP_detection) >= 0) {
        // inverse: "<foo> detection" vs "detect <foo>"
        if (strncmpi(u_str, detect_SP, detect_SP.length)) {
            const p = makesingular(u_str.slice(detect_SP.length));
            const buf = p + SP_detection;
            return fuzzymatch(buf, o_str, ' -', true);
        }
    } else if (strstri(o_str, 'ability') >= 0) {
        // "{potion(s),ring} of {gain,restore,sustain} abilities"
        const p = strstri(u_str, 'abilities');
        if (p >= 0 && p + 'abilities'.length === u_str.length) {
            const buf = u_str.slice(0, p) + 'ability';
            return fuzzymatch(buf, o_str, ' -', true);
        }
    } else if (o_str === 'aluminum') {
        if (strcmpi(u_str, 'aluminium'))
            return fuzzymatch(u_str.slice(9), o_str.slice(8), ' -', true);
    }

    return false;
}

// ─────────────────────────────────────────────────────────────────────────
// Wishable subranges of objects.  C ref: objnam.c o_ranges[].
// (Kept for the readobjnam port to consume; otyp numbers match objects[].)
// ─────────────────────────────────────────────────────────────────────────
export const o_ranges = [
    // name, oclass, f_o_range, l_o_range
    ['bag', 6 /*TOOL_CLASS*/, 217 /*SACK*/, 220 /*BAG_OF_TRICKS*/],
    ['lamp', 6, 227 /*OIL_LAMP*/, 228 /*MAGIC_LAMP*/],
    ['candle', 6, 224 /*TALLOW_CANDLE*/, 225 /*WAX_CANDLE*/],
    ['horn', 6, 249 /*TOOLED_HORN*/, 252 /*HORN_OF_PLENTY*/],
    ['shield', 3 /*ARMOR_CLASS*/, 150 /*SMALL_SHIELD*/, 158 /*SHIELD_OF_REFLECTION*/],
    ['hat', 3, 92 /*FEDORA*/, 94 /*DUNCE_CAP*/],
    ['helm', 3, 89 /*ELVEN_LEATHER_HELM*/, 100 /*HELM_OF_TELEPATHY*/],
    ['gloves', 3, 159 /*LEATHER_GLOVES*/, 162 /*GAUNTLETS_OF_DEXTERITY*/],
    ['gauntlets', 3, 159, 162],
    ['boots', 3, 163 /*LOW_BOOTS*/, 172 /*LEVITATION_BOOTS*/],
    ['shoes', 3, 163, 164 /*IRON_SHOES*/],
    ['cloak', 3, 138 /*MUMMY_WRAPPING*/, 149 /*CLOAK_OF_DISPLACEMENT*/],
    ['shirt', 3, 136 /*HAWAIIAN_SHIRT*/, 137 /*T_SHIRT*/],
    ['dragon scales', 3, 111 /*GRAY_DRAGON_SCALES*/, 120 /*YELLOW_DRAGON_SCALES*/],
    ['dragon scale mail', 3, 101 /*GRAY_DRAGON_SCALE_MAIL*/, 110 /*YELLOW_DRAGON_SCALE_MAIL*/],
    ['sword', 2 /*WEAPON_CLASS*/, 46 /*SHORT_SWORD*/, 56 /*KATANA*/],
    ['venom', 17 /*VENOM_CLASS*/, 478 /*BLINDING_VENOM*/, 479 /*ACID_VENOM*/],
    ['gray stone', 13 /*GEM_CLASS*/, 469 /*LUCKSTONE*/, 472 /*FLINT*/],
    ['grey stone', 13, 469, 472],
];

// Alternate spellings.  C ref: objnam.c spellings[].  (otyp numbers.)
export const spellings = [
    ['pickax', 259 /*PICK_AXE*/],
    ['whip', 82 /*BULLWHIP*/],
    ['saber', 51 /*SILVER_SABER*/],
    ['silver sabre', 51],
    ['smooth shield', 158 /*SHIELD_OF_REFLECTION*/],
    ['grey dragon scale mail', 101 /*GRAY_DRAGON_SCALE_MAIL*/],
    ['grey dragon scales', 111 /*GRAY_DRAGON_SCALES*/],
    ['iron ball', 476 /*HEAVY_IRON_BALL*/],
    ['lantern', 226 /*BRASS_LANTERN*/],
    ['mattock', 71 /*DWARVISH_MATTOCK*/],
    ['amulet of poison resistance', 205 /*AMULET_VERSUS_POISON*/],
    ['amulet of protection', 210 /*AMULET_OF_GUARDING*/],
    ['amulet of telepathy', 201 /*AMULET_OF_ESP*/],
    ['helm of esp', 100 /*HELM_OF_TELEPATHY*/],
    ['gauntlets of ogre power', 161 /*GAUNTLETS_OF_POWER*/],
    ['gauntlets of giant strength', 161],
    ['elven chain mail', 127 /*ELVEN_MITHRIL_COAT*/],
    ['silver shield', 158 /*SHIELD_OF_REFLECTION*/],
    ['potion of sleep', 314 /*POT_SLEEPING*/],
    ['scroll of recharging', 342 /*SCR_CHARGING*/],
    ['recharging', 342],
    ['stone', 473 /*ROCK*/],
    ['camera', 229 /*EXPENSIVE_CAMERA*/],
    ['tee shirt', 137 /*T_SHIRT*/],
    ['can', 296 /*TIN*/],
    ['can opener', 239 /*TIN_OPENER*/],
    ['kelp', 275 /*KELP_FROND*/],
    ['eucalyptus', 276 /*EUCALYPTUS_LEAF*/],
    ['lembas', 291 /*LEMBAS_WAFER*/],
    ['tripe', 264 /*TRIPE_RATION*/],
    ['cookie', 289 /*FORTUNE_COOKIE*/],
    ['pie', 287 /*CREAM_PIE*/],
    ['huge meatball', 269 /*ENORMOUS_MEATBALL*/],
    ['huge chunk of meat', 269],
    ['marker', 242 /*MAGIC_MARKER*/],
    ['hook', 260 /*GRAPPLING_HOOK*/],
    ['grappling iron', 260],
    ['grapnel', 260],
    ['grapple', 260],
    ['protection from shape shifters', 200 /*RIN_PROTECTION_FROM_SHAPE_CHAN*/],
    ['accuracy', 176 /*RIN_INCREASE_ACCURACY*/],
    ['box', 214 /*LARGE_BOX*/],
    ['luck stone', 469 /*LUCKSTONE*/],
    ['load stone', 470 /*LOADSTONE*/],
    ['touch stone', 471 /*TOUCHSTONE*/],
    ['flintstone', 472 /*FLINT*/],
];

// ─────────────────────────────────────────────────────────────────────────
// Class bases.  C ref: objclass.h svb.bases[oclass] = first otyp of class.
// Computed once from objects[] (objects are listed in otyp order grouped by
// class, exactly as the C init_objects() relies on).
// ─────────────────────────────────────────────────────────────────────────
const bases = (() => {
    const b = new Array(MAXOCLASSES + 2).fill(0);
    let prevclass = -1;
    for (let i = 0; i < objects.length; i++) {
        const c = objects[i].oc_class;
        if (c !== prevclass) {
            b[c] = i;
            prevclass = c;
        }
    }
    b[MAXOCLASSES] = b[MAXOCLASSES + 1] = objects.length;
    // back-fill any empty class slots with the following class's base
    for (let last = MAXOCLASSES - 1; last >= 0; last--)
        if (!b[last]) b[last] = b[last + 1];
    return b;
})();

// ─────────────────────────────────────────────────────────────────────────
// rnd_otyp_by_wpnskill(): pick a random weapon of the given skill.  C ref:
// objnam.c:3432.  Requires per-object oc_skill data; the port's objects[]
// does not currently carry oc_skill, so this returns STRANGE_OBJECT (and
// consumes no RNG) until that data is available.  No recorded session reaches
// this path (it is only used for "polearm"/"hammer" wishes).
// ─────────────────────────────────────────────────────────────────────────
export function rnd_otyp_by_wpnskill(skill) {
    let n = 0;
    let otyp = STRANGE_OBJECT;
    for (let i = bases[WEAPON_CLASS];
         i < NUM_OBJECTS && objects[i].oc_class === WEAPON_CLASS; i++) {
        if (objects[i].oc_skill === skill) {
            n++;
            otyp = i;
        }
    }
    if (n > 0) {
        n = rn2(n);
        for (let i = bases[WEAPON_CLASS];
             i < NUM_OBJECTS && objects[i].oc_class === WEAPON_CLASS; i++) {
            if (objects[i].oc_skill === skill)
                if (--n < 0)
                    return i;
        }
    }
    return otyp;
}

// ─────────────────────────────────────────────────────────────────────────
// rnd_otyp_by_namedesc(): of the objects whose name / description / partial
// name / user-name fuzzy-matches `name`, pick one weighted by (oc_prob +
// xtra_prob).  C ref: objnam.c:3455.
//
//   name       — user-supplied target string
//   oclass     — restrict to this object class (0 = all classes)
//   xtra_prob  — added to each candidate's chance; non-zero also lets
//                0%-generation items be considered (wish path passes 1)
//
// The ONLY RNG draw is:  prob = rn2(maxprob)  @ objnam.c:3522
// ─────────────────────────────────────────────────────────────────────────
export function rnd_otyp_by_namedesc(name, oclass, xtra_prob) {
    if (!name || name.length === 0)
        return STRANGE_OBJECT;

    let n = 0;
    const validobjs = [];
    let maxprob = 0;

    // only skip "foo of" for "foo of bar" if target doesn't contain " of "
    const check_of = strstri(name, ' of ') < 0;
    const minglob = GLOB_OF_GRAY_OOZE;
    const maxglob = GLOB_OF_BLACK_PUDDING;

    let lo, hi;
    if (oclass) {
        lo = bases[oclass & 0xff];
        hi = bases[(oclass & 0xff) + 1] - 1;
    } else {
        lo = MAXOCLASSES; // STRANGE_OBJECT + 1
        hi = NUM_OBJECTS - 1;
    }

    for (let i = lo; i <= hi; ++i) {
        let zn = OBJ_NAME(objects[i]);
        // don't match extra descriptions (w/o a real name)
        if (zn == null)
            continue;
        let of;
        if (
            wishymatch(name, zn, true) /* objects[] name */
            // let "<bar>" match "<foo> of <bar>"
            || (check_of
                && i !== BELL_OF_OPENING
                && (i < minglob || i > maxglob)
                && (of = strstri(zn, ' of ')) >= 0
                && wishymatch(name, zn.slice(of + 4), false)) /* partial name */
            || ((zn = OBJ_DESCR(objects[i])) != null
                && wishymatch(name, zn, false)) /* objects[] description */
            || (zn != null && check_of && (of = strstri(zn, ' of ')) >= 0
                && wishymatch(name, zn.slice(of + 4), false)) /* partial descr */
            || ((zn = OBJ_UNAME(objects[i])) != null
                && wishymatch(name, zn, false)) /* user-called name */
        ) {
            validobjs[n++] = i;
            maxprob += (objects[i].oc_prob + xtra_prob);
        }
    }

    if (n > 0 && maxprob) {
        let prob = rn2(maxprob); // @ rnd_otyp_by_namedesc(objnam.c:3522)
        let i;
        for (i = 0; i < n - 1; i++)
            if ((prob -= (objects[validobjs[i]].oc_prob + xtra_prob)) < 0)
                break;
        return validobjs[i];
    }
    return STRANGE_OBJECT;
}

// shiny_obj(): random shiny object of the given class.  C ref: objnam.c:3532.
export function shiny_obj(oclass) {
    return rnd_otyp_by_namedesc('shiny', oclass, 0);
}

// Exported for callers/tests that want the matching primitives directly.
// readobjnam.js consumes these to parse a wish string without duplicating the
// hacklib string helpers.
export { wishymatch, fuzzymatch, strstri };
