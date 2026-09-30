// js/do_name.js — port of nethack-c/src/do_name.c
//
// JS-only doctrine (CLAUDE.md): hand-authored, source of truth, no build step.
// Correctness is enforced by the differential capture-replay sweep, not types.

import { monPmname, permonstTemplate } from './makemon.js';
import { rn2, rn2_on_display_rng, pushRngLogEntry } from './rng.js';
import { get_rnd_line_from_section } from './mklev.js';
import { BOGUSMON_LINES, BOGUSMON_OFFSETS, BOGUSMON_SIZE, MD_PAD_BOGONS } from './bogusmon_data.js';
import { ENV } from './hostenv.js';

/* C monflag.h enum mgender { MALE, FEMALE, NEUTRAL, NUM_MGENDERS } */
const MALE = 0, FEMALE = 1;

/* oextra referencing/testing macros (nethack-c/include/obj.h:191,196).
 * ONAME(o)      == o->oextra->oname
 * has_oname(o)  == (o->oextra && ONAME(o))
 * In JS the reconstructed obj carries a nested `oextra` object whose `oname`
 * is the captured given-name string, or null when C's has_oname() was false
 * (NULL oextra OR NULL oname). Both forms collapse to the same observable. */
function ONAME(o) {
    return o.oextra.oname;
}
function has_oname(o) {
    return Boolean(o.oextra && ONAME(o));
}

/* safe_oname — C ref: nethack-c/src/do_name.c:94-100
 *   const char *safe_oname(struct obj *obj)
 *   { if (has_oname(obj)) return ONAME(obj); return ""; }
 * Always returns a valid string: the object's given name if it has one, or
 * an empty string otherwise. No RNG, no state change. */
export function safe_oname(obj) {
    if (has_oname(obj))
        return ONAME(obj);
    return "";
}

/* Mgender — C ref: nethack-c/src/do_name.c:1289-1300
 *   int Mgender(struct monst *mtmp) {
 *       int mgender = MALE;
 *       if (mtmp == &gy.youmonst) { if (Upolyd ? u.mfemale : flags.female) mgender = FEMALE; }
 *       else if (mtmp->female) mgender = FEMALE;
 *       return mgender;
 *   }
 * The captured mon_pmname corpus never passes &gy.youmonst (no youmonst form
 * channel here), so the hero branch is dormant — a real monster's gender is
 * just mon->female ? FEMALE : MALE. Neuter monsters are handled downstream by
 * pmname()'s NEUTRAL fallback (their pmnames[MALE]/[FEMALE] are NULL). */
function Mgender(mtmp) {
    return mtmp.female ? FEMALE : MALE;
}

/* mon_pmname — C ref: nethack-c/src/do_name.c:1313-1317
 *   char *mon_pmname(struct monst *mon) { return pmname(mon->data, Mgender(mon)); }
 * mon->data is the monster's current FORM (struct permonst *); the capture
 * carries it as the synthetic `data_mndx` field (mon->data->pmidx). monPmname
 * applies pmname()'s gender-pick + NEUTRAL fallback against that form's row. */
export function mon_pmname(mon) {
    return monPmname(mon.data_mndx | 0, Mgender(mon));
}

/* ── Hallucinatory naming (do_name.c:1362-1421) ────────────────────────────
 *
 * These three draw from the DISPLAY isaac64 stream (js/rng.js
 * rn2_on_display_rng), not the scored one — C rnd.c:26 `enum { CORE, DISP }`.
 * That is why they are invisible to every RNG oracle in this repo: the
 * recorder writes display draws to NETHACK_RNGLOG_DISP
 * (nethack-c-v5/patches/005-rng-display-logging.patch) and the 44 public
 * sessions carry only the core channel — measured 2026-08-14, zero of the
 * corpus's 360 distinct recorded call sites is a display-rng one.  The map
 * cells and the topline are the only oracle for this surface.
 *
 * Was `export function rndmonnam() { throw ... }` at js/priest.js:710, which
 * HALTED seed0399-wizard-hallu-actions at frame 426/532 via
 * mon_nam -> x_monnam.
 */

/* C do_name.c:1364 `const char bogon_codes[] = "-_+|=";` — see dat/bogusmon.txt. */
const bogon_codes = '-_+|=';

/* C do_name.c:1368-1383 bogusmon(buf, code) — a random line of dat/bogusmon,
 * with its leading bogon code (if any) stripped off into *code. */
export function bogusmon(code) {
    /* C: get_rnd_text(BOGUSMONFILE, buf, rn2_on_display_rng, MD_PAD_BOGONS).
     * "might fail (return empty buf[]) if the file isn't available" — the table
     * is generated from the compiled chunk and is never empty here. */
    let mnam = get_rnd_line_from_section(BOGUSMON_LINES, BOGUSMON_OFFSETS,
                                         BOGUSMON_SIZE, rn2_on_display_rng,
                                         MD_PAD_BOGONS);
    if (!mnam)
        return { name: 'bogon', code: '\0' };
    if (bogon_codes.indexOf(mnam[0]) >= 0)  /* strip prefix if present */
        return { name: mnam.slice(1), code: mnam[0] };
    return { name: mnam, code: '\0' };
}

/* C do_name.c:1387-1409 rndmonnam(code) — "return a random monster name, for
 * hallucination".
 *
 *     do {
 *         name = rn2_on_display_rng(SPECIAL_PM + BOGUSMONSIZE - LOW_PM) + LOW_PM;
 *     } while (name < SPECIAL_PM
 *              && (type_is_pname(&mons[name]) || (mons[name].geno & G_NOGEN)));
 *     if (name >= SPECIAL_PM) mnam = bogusmon(buf, code);
 *     else mnam = strcpy(buf, pmname(&mons[name], rn2_on_display_rng(2)));
 *
 * The rejection loop redraws, so the number of display draws depends on the
 * values themselves — a reason to keep it verbatim rather than "optimise" it
 * into a filtered table.
 *
 * Returns the name; the out-parameter `code` is returned alongside it because
 * JS has no char*, and priestname()/x_monnam() feed it to bogon_is_pname().
 */
const BOGUSMONSIZE = 100;                /* C do_name.c:1392 (arbitrary) */
const LOW_PM_DN = 0;                     /* C monsym.h:15 NON_PM + 1 */
const SPECIAL_PM_DN = 330;               /* C monsym.h:23 PM_LONG_WORM_TAIL */
const G_NOGEN_DN = 0x0200;               /* C monflag.h:197 */
const M2_PNAME_DN = 0x00080000;          /* C monflag.h M2_PNAME */
export function rndmonnam_ex() {
    let name;
    do {
        name = rn2_on_display_rng(SPECIAL_PM_DN + BOGUSMONSIZE - LOW_PM_DN) + LOW_PM_DN;
    } while (name < SPECIAL_PM_DN && _rndmonnam_rejected(name));

    if (name >= SPECIAL_PM_DN) {
        const out = bogusmon();
        if (typeof process !== 'undefined' && ENV?.FF_NAME_TRACE === '1')
            pushRngLogEntry(`^rndmonnam[name=${encodeURIComponent(out.name)} code=${out.code.charCodeAt(0) || 0} pick=${name}]`);
        return out;
    }
    /* C mondata.h pmname(pm, mgender); rn2_on_display_rng(2) is MALE/FEMALE. */
    const out = { name: monPmname(name, rn2_on_display_rng(2)), code: '\0' };
    if (typeof process !== 'undefined' && ENV?.FF_NAME_TRACE === '1')
        pushRngLogEntry(`^rndmonnam[name=${encodeURIComponent(out.name)} code=0 pick=${name}]`);
    return out;
}
/* C do_name.c:1400-1402 rejection test — `type_is_pname(&mons[name])
 * || (mons[name].geno & G_NOGEN)`.  C mondata.h:135
 * type_is_pname(ptr) = ((ptr->mflags2 & M2_PNAME) != 0L). */
function _rndmonnam_rejected(mndx) {
    const ptr = permonstTemplate(mndx);
    if (!ptr) return true;
    return ((ptr.mflags2 >>> 0) & M2_PNAME_DN) !== 0
        || ((ptr.geno | 0) & G_NOGEN_DN) !== 0;
}
/* The C-signature form: callers that do not want the bogon code just take the
 * name.  (C's rndmonnam(NULL) is the majority of its 15 call sites.) */
export function rndmonnam() {
    return rndmonnam_ex().name;
}

/* C do_name.c:1414-1420 bogon_is_pname(code) — "check bogusmon prefix to
 * decide whether it's a personal name".  Note it tests "-+=", a HARD-CODED
 * SUBSET of bogon_codes ("-_+|="), exactly as C's own comment at :1362 warns;
 * ported as the subset, not as bogon_codes. */
export function bogon_is_pname(code) {
    if (!code || code === '\0')
        return false;
    return '-+='.indexOf(code) >= 0;
}

/* C do_name.c:1587-1603 — "Discworld novel titles, in the order that they were
 * published; a subset of them have index macros used for variant spellings; if
 * the titles are reordered for some reason, make sure that those get renumbered
 * to match".  Verbatim from nethack-c-v5/upstream/src/do_name.c:1590; the ORDER
 * is load-bearing twice over — it is the rn2() index space (SIZE == 41, which
 * is the modulus the recorder observes) and the NVL_* macros below index it. */
const sir_Terry_novels = [
    "The Colour of Magic", "The Light Fantastic", "Equal Rites", "Mort",
    "Sourcery", "Wyrd Sisters", "Pyramids", "Guards! Guards!", "Eric",
    "Moving Pictures", "Reaper Man", "Witches Abroad", "Small Gods",
    "Lords and Ladies", "Men at Arms", "Soul Music", "Interesting Times",
    "Maskerade", "Feet of Clay", "Hogfather", "Jingo", "The Last Continent",
    "Carpe Jugulum", "The Fifth Elephant", "The Truth", "Thief of Time",
    "The Last Hero", "The Amazing Maurice and His Educated Rodents",
    "Night Watch", "The Wee Free Men", "Monstrous Regiment",
    "A Hat Full of Sky", "Going Postal", "Thud!", "Wintersmith",
    "Making Money", "Unseen Academicals", "I Shall Wear Midnight", "Snuff",
    "Raising Steam", "The Shepherd's Crown"
];
/* C do_name.c:1604-1608 — the variant-spelling index macros.  Only
 * lookup_novel() reads them and that function has no caller in js/ yet; they
 * are kept here so a future lookup_novel() port cannot silently renumber. */
export const NVL_COLOUR_OF_MAGIC = 0;
export const NVL_SOURCERY = 4;
export const NVL_MASKERADE = 17;
export const NVL_AMAZING_MAURICE = 27;
export const NVL_THUD = 33;

/* C do_name.c:1610-1624
 *   const char *noveltitle(int *novidx)
 *   { int j, k = SIZE(sir_Terry_novels);
 *     j = rn2(k);
 *     if (novidx) { if (*novidx == -1) *novidx = j;
 *                   else if (*novidx >= 0 && *novidx < k) j = *novidx; }
 *     return sir_Terry_novels[j]; }
 *
 * The rn2(SIZE) is drawn UNCONDITIONALLY — before the novidx test and even
 * when novidx pins the answer — so it is part of the stream whether or not the
 * drawn value is used.  That is the whole of this port's parity contribution:
 * seed4500 draws it exactly once, at session step 864, as the first leaf this
 * port failed to reproduce.
 *
 * C's `int *novidx` is an in/out parameter.  JS passes a one-field box rather
 * than the object, so the caller stays responsible for the corpsenm/novelidx
 * union aliasing (obj.h #define novelidx corpsenm); handing the obj in would
 * hide that.  The field is `value`, which is this tree's OUTPUT-POINTER
 * convention -- js/struct_reconstructor.js:195 maps C's `int *` to the
 * one-field pseudo-struct ['value'], so the capture-replay sweep can build the
 * argument.  A box named anything else makes the sweep report
 * "field 'x' was not captured" and read as a divergence.
 * Pass null for C's noveltitle(NULL). */
export function noveltitle(novidx) {
    const k = sir_Terry_novels.length;
    let j = rn2(k);

    if (novidx) {
        if ((novidx.value | 0) === -1)
            novidx.value = j;
        else if ((novidx.value | 0) >= 0 && (novidx.value | 0) < k)
            j = novidx.value | 0;
    }
    return sir_Terry_novels[j];
}

/* C do_name.c:1625-1661 lookup_novel().  Novel names are compared
 * case-insensitively, with or without the leading article, and a handful of
 * established American/variant spellings map to the canonical title. */
export function lookup_novel(lookname, idx) {
    const fold = (s) => String(s ?? '').toLowerCase();
    const withoutArticle = (s) => {
        const v = fold(s);
        return v.startsWith('the ') ? v.slice(4) : v;
    };
    let name = String(lookname ?? '');
    const bare = withoutArticle(name);
    if (bare === 'color of magic')
        name = sir_Terry_novels[NVL_COLOUR_OF_MAGIC];
    else if (bare === 'sorcery')
        name = sir_Terry_novels[NVL_SOURCERY];
    else if (bare === 'masquerade')
        name = sir_Terry_novels[NVL_MASKERADE];
    else if (bare === 'amazing maurice')
        name = sir_Terry_novels[NVL_AMAZING_MAURICE];
    else if (bare === 'thud')
        name = sir_Terry_novels[NVL_THUD];

    for (let k = 0; k < sir_Terry_novels.length; k++) {
        const title = sir_Terry_novels[k];
        if (fold(name) === fold(title) || withoutArticle(name) === withoutArticle(title)) {
            if (idx)
                idx.value = k;
            return title;
        }
    }
    const prior = idx ? (idx.value | 0) : -1;
    if (idx && prior >= 0 && prior < sir_Terry_novels.length)
        return sir_Terry_novels[prior];
    return null;
}
