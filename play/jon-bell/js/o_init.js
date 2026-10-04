// @ts-nocheck
// o_init.c — object init (partial port).
// @ts-nocheck — sibling imports from hand-maintained js/*.js (see zap.ts).
// C ref: NetHack 3.7 o_init.c randomize_gem_colors(83-109), setgemprobs(54-81),
//        oinit(369-372), init_objects preamble.
//
// Object type ordinals: from nethack-c/include/objects.h enum (post-SCR_MAIL fix).
import { game } from './gstate.js';
import { rn2, pushRngLogEntry } from './rng.js';
import { exercise } from './attrib.js';
import { gem_learned } from './shk.js';
import { MKOBJ_OC_PROB, MKOBJ_SVB_BASES, MKOBJ_OCLASS_PROB_TOTALS, MKOBJ_OC_CLASS, MKOBJ_OC_COLOR, } from './mkobj_data.js';
import { MKOBJ_OC_MATERIAL } from './mkobj_erosion_meta.js';

/* Pre-shuffle objects[].oc_material.  MKOBJ_OC_MATERIAL stands in for C's
 * global objects[] array, which init_objects() mutates in place (o_init.c:141-146),
 * so every `MKOBJ_OC_MATERIAL[otyp]` read in js/ sees the shuffled value.
 * Reset from this copy on each init so a second game in one process starts
 * from the canonical table. */
const _PRISTINE_OC_MATERIAL = Uint8Array.from(MKOBJ_OC_MATERIAL);
import { SHUFFLED_RANGES, WEAPON_TABLE, FIXED_DESCRS } from './o_init_data.js';
import { OC_NAME } from './oc_name_data.js';
/* C objects[].oc_descr — OBJ_DESCR(objects[i]) presence is what o_init.c's
 * oc_name_known audit and u_init.c's ini_inv_use_obj discovery both test. */
import { OC_DESCR } from './oc_descr_data.js';
/* C ref: objnam.c:5422 Japanese_item_name — needed by discover_object's third
 * guard disjunct (o_init.c:465-466).  This closes an import cycle (js/objnam.js
 * imports getObjName and discover_object from this file); both directions are
 * hoisted function declarations and neither is called from a module body, so the
 * live bindings resolve at call time.  Same shape as the objnam<->eat cycle
 * documented at js/objnam.js:38. */
import { Japanese_item_name } from './objnam.js';
/* prop.h HALLUC / HALLUC_RES — the two slots youprop.h:116-120's
 * Hallucination macro reads.  See _observe_hallucinating() below. */
import { HALLUC, HALLUC_RES } from './const.js';

/* C ref: include/objects.h:80-108 — MARKER(FIRST_OBJECT, LAST_GENERIC + 1),
 * with LAST_GENERIC == GENERIC_VENOM, the seventeenth and last GENERIC() row.
 * Slot [0] is STRANGE_OBJECT and slots [1]..[17] are the per-class generic
 * placeholders ("strange", "weapon", "armor", ... "venom"); the first real
 * object type is ARROW at 18.  Shared by discover_object() and
 * observe_object() below, which is how C states it (both o_init.c:447 and
 * o_init.c:460 test the same manifest constant). */
export const FIRST_OBJECT = 18;
/* C ref: you.h:240 Role_if(PM_SAMURAI); role index 9, as js/objnam.js:150 uses
 * it.  initrole-first, because urole is not populated during u_init. */
const _ROLE_IDX_SAMURAI = 9;
function _Role_if_samurai() {
    const g = game;
    const ir = (g.flags && g.flags.initrole != null) ? (g.flags.initrole | 0) : -1;
    if (ir >= 0) return ir === _ROLE_IDX_SAMURAI;
    return ((g.urole && g.urole.mnum != null) ? (g.urole.mnum | 0) : -1) === _ROLE_IDX_SAMURAI;
}
/* Object type constants — C enum values from nethack-c/include/objects.h
 * (verified post-SCR_MAIL insertion at index 364 in commit c258344).
 * DILITHIUM_CRYSTAL=439 JADE=460 LAST_REAL_GEM=460 FIRST_REAL_GEM=439
 * GEM_CLASS=13 (svb.bases[13]=439, svb.bases[14]=475)                  */
const GEM_CLASS = 13;
const FIRST_GEM_IDX = 439; /* DILITHIUM_CRYSTAL — svb.bases[GEM_CLASS] */
const LAST_REAL_GEM = 460; /* JADE */
const DIAMOND = 440;
const SAPPHIRE = 443;
const EMERALD = 445;
const TURQUOISE = 446;
const AQUAMARINE = 448;
const FLUORITE = 457;
/* C o_init.c:54-81 — setgemprobs(d_level *dlev)
 * Level-dependent gem probability reset.  dlev==null means lev=0 (game init).
 * Mutates MKOBJ_OC_PROB and MKOBJ_OCLASS_PROB_TOTALS in place to mirror the
 * runtime objects[].oc_prob modifications C performs at startup and per-level.
 *
 * Algorithm (C ref o_init.c:65-80):
 *   Zero the first (9 - lev/3) gems starting at svb.bases[GEM_CLASS].
 *   Then assign (171 + j - first) / (LAST_REAL_GEM + 1 - first) for each
 *   remaining real gem j up to LAST_REAL_GEM.
 *   Recompute oclass_prob_totals[GEM_CLASS].
 */
export function setgemprobs(dlev) {
    let lev = 0;
    if (dlev !== null) {
        const ledgerStart = game.dungeons?.[dlev.dnum]?.ledger_start ?? 0;
        const raw = dlev.dlevel + ledgerStart;
        /* C: lev = (ledger_no > maxledgerno) ? maxledgerno : ledger_no
         * maxledgerno not yet tracked in JS; clamp to raw (safe for d0). */
        lev = raw;
    }
    const first_base = MKOBJ_SVB_BASES[GEM_CLASS] | 0; /* 439 */
    /* C o_init.c:65-66: zero first (9 - lev/3) gems */
    let j = 0;
    for (; j < 9 - Math.trunc(lev / 3); j++) {
        MKOBJ_OC_PROB[first_base + j] = 0;
    }
    const first = first_base + j; /* first non-zero real gem index */
    /* C o_init.c:74-75: assign (171+j-first)/(LAST_REAL_GEM+1-first) */
    const denom = LAST_REAL_GEM + 1 - first;
    for (let k = first; k <= LAST_REAL_GEM; k++) {
        MKOBJ_OC_PROB[k] = Math.trunc((171 + k - first) / denom);
    }
    /* C o_init.c:77-80: recompute oclass_prob_totals[GEM_CLASS] */
    const next_class_base = MKOBJ_SVB_BASES[GEM_CLASS + 1] | 0; /* 475 */
    let sum = 0;
    for (let k = first_base; k < next_class_base; k++) {
        sum += MKOBJ_OC_PROB[k];
    }
    MKOBJ_OCLASS_PROB_TOTALS[GEM_CLASS] = sum;
}
/* C o_init.c:369-372 — oinit(): level-dependent init, called each makelevel() */
export function oinit() {
    setgemprobs(game.u?.uz ?? null);
}
export function randomize_gem_colors() {
    const g = game;
    g._objDescriptions = g._objDescriptions || {};
    g._objColors = g._objColors || {};
    /* OC_DESCR/MKOBJ_OC_COLOR are the canonical (objects.c) tables; the source
     * gems are never re-described before this point, so reading them directly
     * is the same value C's objects[o_src] holds. */
    const COPY_OBJ_DESCR = (o_dst, o_src) => {
        g._objDescriptions[o_dst] = OC_DESCR[o_src];
        g._objColors[o_dst] = MKOBJ_OC_COLOR[o_src];
    };
    if (rn2(2)) { /* change turquoise from green to blue? */
        COPY_OBJ_DESCR(TURQUOISE, SAPPHIRE);
    }
    if (rn2(2)) { /* change aquamarine from green to blue? */
        COPY_OBJ_DESCR(AQUAMARINE, SAPPHIRE);
    }
    switch (rn2(4)) { /* change fluorite from violet? */
        case 0:
            break;
        case 1: /* blue */
            COPY_OBJ_DESCR(FLUORITE, SAPPHIRE);
            break;
        case 2: /* white */
            COPY_OBJ_DESCR(FLUORITE, DIAMOND);
            break;
        case 3: /* green */
            COPY_OBJ_DESCR(FLUORITE, EMERALD);
            break;
        default:
            break;
    }
}
/* C o_init.c:234 — objects[WAN_NOTHING].oc_dir = rn2(2) ? NODIR : IMMEDIATE
 * WAN_NOTHING's zap direction is randomized at game start.  The result
 * controls the spe range in mksobj_init's WAND_CLASS branch (mkobj.c:1124):
 *   NODIR → rn1(5,11) (range 11-15)
 *   IMMEDIATE → rn1(5,4)  (range 4-8)
 * JS mklev.js reads this via isWanNothingNodir().                         */
const NODIR = 1;
const IMMEDIATE = 2;
/** Runtime oc_dir value for WAN_NOTHING, set by init_objects(). */
let _wan_nothing_oc_dir = IMMEDIATE; /* default IMMEDIATE until init */
/** True when WAN_NOTHING was assigned NODIR by init_objects(). */
export function isWanNothingNodir() {
    return _wan_nothing_oc_dir === NODIR;
}
/* C save.c:savenames / restore.c:restnames.  These mutable object tables live
 * outside `game`; save their live arrays for the graph serializer to detach,
 * then restore them in place so existing imports retain their references. */
export function object_runtime_save_snapshot() {
    return {
        wandNothingDirection: _wan_nothing_oc_dir,
        probabilities: MKOBJ_OC_PROB,
        classTotals: MKOBJ_OCLASS_PROB_TOTALS,
    };
}
export function object_runtime_rest_snapshot(saved) {
    if (!saved) return;
    _wan_nothing_oc_dir = saved.wandNothingDirection;
    MKOBJ_OC_PROB.set(saved.probabilities);
    MKOBJ_OCLASS_PROB_TOTALS.set(saved.classTotals);
}
/**
 * C o_init.c:111-148 — shuffle(o_low, o_high, domaterial).
 *
 * Fisher-Yates permutation of the description indices for the objects in the
 * range [o_low, o_high].  Faithful port of the C loop:
 *
 *     for (num_to_shuffle = 0, j = o_low; j <= o_high; j++)
 *         if (!objects[j].oc_name_known) num_to_shuffle++;
 *     if (num_to_shuffle < 2) return;
 *     for (j = o_low; j <= o_high; j++) {
 *         if (objects[j].oc_name_known) continue;
 *         do i = j + rn2(o_high - j + 1); while (objects[i].oc_name_known);
 *         swap descr_idx[j], descr_idx[i];   // + oc_tough, oc_color, [material]
 *     }
 *
 * Within every range we shuffle here (built by obj_shuffle_range), all items
 * are name-unknown (the unique/non-magic/water/blank items are excluded from
 * the range), so the do/while never re-rolls — the inner call is a single
 * rn2(o_high - j + 1) per j.  Cardinal Rule 1: the rn2 count and order MUST
 * stay byte-identical to C (these are the same calls the previous stub fired).
 *
 * `descrIdx` is an array of length N (N = o_high - o_low + 1) holding, for each
 * slot, the canonical description position currently assigned to it.  Runtime
 * oc_tough follows this permutation for shuffled rings; color and material are
 * likewise written below where their consumers need them.  These swaps consume
 * no RNG.
 *
 * @param {number} N number of items in the range (all name-unknown)
 * @param {number[]} descrIdx slot→canonical-position map, mutated in place
 */
function shuffle(N, descrIdx) {
    /* num_to_shuffle == N (no name_known items in our ranges); skip if < 2. */
    if (N < 2)
        return;
    const o_low = 0, o_high = N - 1;
    for (let j = o_low; j <= o_high; j++) {
        /* C: i = j + rn2(o_high - j + 1) (no re-roll: no oc_name_known here) */
        const i = j + rn2(o_high - j + 1);
        const sw = descrIdx[j];
        descrIdx[j] = descrIdx[i];
        descrIdx[i] = sw;
    }
}
/* Runtime oc_tough values are shuffled with descriptions by C's shuffle().
 * Keep the values needed by item-action/engraving paths alongside the
 * appearance permutation.  The canonical ring hardness comes from the mohs
 * field in objects.h (HARDGEM(mohs), threshold 8). */
const RING_CANONICAL_TOUGH = [
    false, false, false, false, false, false, false, false, false, false,
    false, true, true, true, true, false, false, false, false, false,
    true, false, false, false, true, false, false, false,
];
export function object_tough(otyp) {
    return !!(game._objTough && game._objTough[otyp | 0]);
}
/**
 * C o_init.c:320-347 — shuffle_all(): randomize object descriptions.
 *
 *   shuffle_classes[] = { AMULET, POTION, RING, SCROLL, SPBOOK, WAND, VENOM };
 *   shuffle_types[]   = { HELMET, LEATHER_GLOVES, CLOAK_OF_PROTECTION,
 *                         SPEED_BOOTS };
 *   for each class: obj_shuffle_range(...) then shuffle(first, last, TRUE);
 *   for each type:  obj_shuffle_range(...) then shuffle(first, last, FALSE);
 *
 * SHUFFLED_RANGES (o_init_data.js) already encodes each obj_shuffle_range
 * result (base otyp + the canonical name/descr lists for the items inside the
 * range), so we iterate the ranges in the exact shuffle_all order and fire the
 * same rn2 calls.  The permutation result is written into
 * game._objDescriptions[otyp] = canonical descr now assigned to that otyp,
 * exactly what getObjDescr() reads (objnam.js).
 *
 * This REPLACES the discard-only rn2 stub that fastforward_pre_mklev used to
 * inline; the rn2 sequence is unchanged (same calls, same order) but the
 * results are now applied.
 */
export function shuffle_all() {
    const g = game;
    g._objDescriptions = g._objDescriptions || {};
    g._objTough = g._objTough || {};
    /* Runtime objects[].oc_color after shuffle.  C o_init.c:137-139 swaps
     * oc_color in lockstep with oc_descr_idx inside shuffle(); the color travels
     * with the description (e.g. the "golden" potion description always carries
     * CLR_YELLOW).  The static MKOBJ_OC_COLOR table is the *canonical* (pre-
     * shuffle) per-slot color — i.e. the color of canonical description k.  So
     * after shuffle the otyp at slot k holds the color of the canonical slot
     * descrIdx[k], exactly parallel to the description assignment below.  display.js
     * reads this override when present (object glyphs use objects[otyp].oc_color). */
    g._objColors = g._objColors || {};
    /* Runtime objects[].oc_material after shuffle.  C o_init.c:141-146 swaps
     * oc_material in lockstep with oc_descr_idx, but ONLY when shuffle()'s
     * `domaterial` argument is TRUE — which shuffle_all passes for the whole
     * CLASS ranges and NOT for the four armor sub-type ranges (o_init.c:330 vs
     * :343).  So the material travels with the description exactly as the colour
     * does, and DOMATERIAL below is that TRUE/FALSE split, not a guess.
     *
     * RNG-neutral: the swap consumes no draws.  Read it through the runtime map
     * rather than MKOBJ_OC_MATERIAL when a code path asks what an object in THIS
     * game is made of — themerms.lua's 'Water-surrounded vault' does exactly
     * that (`itmcls["material"] == "glass"`). */
    g._objMaterials = g._objMaterials || {};
    MKOBJ_OC_MATERIAL.set(_PRISTINE_OC_MATERIAL);
    /* Runtime objects[].oc_descr_idx is also consumed by glyphs.c when it
     * transfers object customizations.  Keep the numeric permutation beside
     * the human-readable description map; equal description strings (gems)
     * still retain distinct indices just as C does. */
    g._objDescrIdx = g._objDescrIdx || {};
    /* C shuffle_all order: whole classes first, then armor sub-type ranges. */
    const ORDER = ['AMULET', 'POTION', 'RING', 'SCROLL', 'SPBOOK', 'WAND',
        'VENOM', 'HELMET', 'GLOVES', 'CLOAK', 'BOOTS'];
    /* shuffle(first, last, TRUE) for the classes; FALSE for the armor types. */
    const DOMATERIAL = new Set(['AMULET', 'POTION', 'RING', 'SCROLL', 'SPBOOK',
        'WAND', 'VENOM']);
    for (const key of ORDER) {
        const rng = SHUFFLED_RANGES[key];
        if (!rng)
            continue;
        const N = rng.descrs.length;
        const descrIdx = [];
        for (let k = 0; k < N; k++)
            descrIdx[k] = k; /* identity init: oc_descr_idx = self */
        shuffle(N, descrIdx);
        /* Store the shuffled description per otyp.  Slot k (otyp base+k) now
         * shows the canonical description at position descrIdx[k]. */
        for (let k = 0; k < N; k++) {
            g._objDescrIdx[rng.base + k] = rng.base + descrIdx[k];
            g._objDescriptions[rng.base + k] = rng.descrs[descrIdx[k]];
            /* oc_color follows oc_descr_idx (C o_init.c:137-139). */
            g._objColors[rng.base + k] = MKOBJ_OC_COLOR[rng.base + descrIdx[k]];
            /* oc_material likewise, but only when domaterial (C o_init.c:141-146). */
            if (DOMATERIAL.has(key)) {
                g._objMaterials[rng.base + k] = _PRISTINE_OC_MATERIAL[rng.base + descrIdx[k]];
                MKOBJ_OC_MATERIAL[rng.base + k] = g._objMaterials[rng.base + k];
            }
            if (key === 'RING')
                g._objTough[rng.base + k] = RING_CANONICAL_TOUGH[descrIdx[k]];
        }
    }
    /* Fixed-description items outside any shuffle range (POT_WATER "clear", &c).
     * C ref: o_init.c init_objects() leaves these at their canonical descr_idx. */
    for (const otyp in FIXED_DESCRS)
        g._objDescriptions[otyp] = FIXED_DESCRS[otyp];
    /* Weapons are NOT shuffled, but many have a fixed OBJ_DESCR (e.g.
     * quarterstaff "staff").  OBJ_DESCR(objects[otyp]) returns it unchanged;
     * record the non-null ones so getObjDescr/obj_typename show "(descr)". */
    if (WEAPON_TABLE) {
        for (let k = 0; k < WEAPON_TABLE.descrs.length; k++) {
            const d = WEAPON_TABLE.descrs[k];
            if (d != null)
                g._objDescriptions[WEAPON_TABLE.base + k] = d;
        }
    }
}
/* Object-class numbering (C include/defsym.h), used by the disco subsystem. */
const SPBOOK_CLASS_OC = 10;
/* C OBJ_NAME(objects[otyp]): use the complete role-invariant object table,
 * including ordinary food/tools which can appear in pauper discoveries. */
export function getObjName(otyp) {
    return OC_NAME[otyp] ?? null;
}
/* C weapon.c def_skill: skill levels.  P_ISRESTRICTED=0, P_UNSKILLED=1,
 * P_BASIC=2, P_SKILLED=3, P_EXPERT=4 (skills.h). */
/**
 * C o_init.c:454-490 — discover_object(oindx, mark_as_known,
 * mark_as_encountered, credit_hero) (credit_hero unused by the ported paths).
 *
 * Records a discovered object type.  Maintains, on game state:
 *   game._oc_name_known[otyp]  — boolean (the type's identity is known)
 *   game._oc_encountered[otyp] — boolean (the type was seen/felt)
 *   game._disco[oclass]        — array of otyps in DISCOVERY (insertion) order,
 *                                which drives the dodiscovered display order
 *                                (C svd.disco[] per-class insertion order).
 *
 * Mirrors the C guard: only acts when it would newly set name_known or
 * encountered.  The disco[] list keeps one entry per type, appended the first
 * time the type is discovered (C scans disco[] for the type or the next open
 * slot before writing).
 */
export function discover_object(oindx, mark_as_known, mark_as_encountered, credit_hero) {
    const g = game;
    const trace = typeof process !== 'undefined' && ENV?.FF_DISCOVERY_TRACE === '1';
    if (trace)
        pushRngLogEntry(`^discover_event[otyp=${oindx | 0} class=${MKOBJ_OC_CLASS[oindx | 0] ?? -1}`
            + ` known=${mark_as_known ? 1 : 0} enc=${mark_as_encountered ? 1 : 0}`
            + ` frame=${game._ff_last_input_frame ?? -1}`
            + ` moves=${game.moves | 0} hero=${game.u?.ux | 0},${game.u?.uy | 0}]`);
    /* C ref: o_init.c:459-461 — the CALLEE-side half of the generic-object
     * guard, which this port was missing entirely:
     *     if (oindx < FIRST_OBJECT)  [don't discover generic objects]
     *         return;
     * C states the test TWICE — once in observe_object (o_init.c:447) and
     * again here — so every one of discover_object's call sites is protected
     * whether or not it checked for itself.  This port had only the
     * caller-side half, and only in two of its four observe_object copies, so
     * a generic otyp (1..LAST_GENERIC == 17) reaching any other caller was
     * marked oc_name_known/oc_encountered and appended to _disco[oclass] —
     * which is what the discoveries listing (dodiscovered) renders from.
     * FIRST_OBJECT == 18: objects.h:80-108 puts STRANGE_OBJECT in slot [0],
     * seventeen GENERIC() rows in [1]..[17] (GENERIC_ILLOBJ..GENERIC_VENOM),
     * then MARKER(LAST_GENERIC, GENERIC_VENOM) and
     * MARKER(FIRST_OBJECT, LAST_GENERIC + 1). */
    if ((oindx | 0) < FIRST_OBJECT)
        return;
    g._oc_name_known = g._oc_name_known || {};
    g._oc_encountered = g._oc_encountered || {};
    g._disco = g._disco || {};
    const wasKnown = !!g._oc_name_known[oindx];
    const wasEnc = !!g._oc_encountered[oindx];
    const jpPredisco = _Role_if_samurai() && Japanese_item_name(oindx | 0) != null;
    if ((!wasKnown && mark_as_known) || (!wasEnc && mark_as_encountered) || jpPredisco) {
        const oclass = (MKOBJ_OC_CLASS_LOCAL(oindx)) | 0;
        const list = (g._disco[oclass] = g._disco[oclass] || []);
        /* C: scan disco[] within the class for the target or first open slot. */
        if (!list.includes(oindx))
            list.push(oindx);
        if (mark_as_encountered)
            g._oc_encountered[oindx] = true;
        if (!wasKnown && mark_as_known) {
            g._oc_name_known[oindx] = true;
            const A_WIS = 2;
            if (credit_hero)
                exercise(A_WIS, true);
            /* C o_init.c:486-489: !in_moveloop => initial inventory,
             * gameover => final disclosure */
            if ((g.program_state?.in_moveloop | 0) && !g.program_state?.gameover
                && (MKOBJ_OC_CLASS[oindx | 0] | 0) === 13 /* GEM_CLASS */)
                gem_learned(oindx); /* could affect price of unpaid gems */
        }
        if (trace)
            pushRngLogEntry(`^discover_state[otyp=${oindx | 0} class=${oclass} added=${list.includes(oindx) ? 1 : 0}`
                + ` known=${g._oc_name_known[oindx] ? 1 : 0} enc=${g._oc_encountered[oindx] ? 1 : 0}`
                + ` list=${list.join('.')} frame=${game._ff_last_input_frame ?? -1}`
                + ` moves=${game.moves | 0}]`);
    }
}
/* C o_init.c:498-523 undiscover_object(oindx) — the inverse of the discovery
 * bookkeeping above, called from do_name.c:669 when #call is answered with an
 * empty (all-spaces) name and the type HAD a user name: the type leaves the
 * discoveries list again.
 *
 * C shifts svd.disco[] entries forward over the removed slot and impossible()s
 * if the type is not there; this port's per-class array does the same removal
 * with splice, which preserves the surviving entries' relative order — the
 * property dodiscovered's display order depends on.  The guard is C's: nothing
 * happens while the type is still name_known or encountered.
 *
 * C's gem_learned(oindx) tail (o_init.c:520-521) re-prices unpaid gems.
 * RNG-free. */
export function undiscover_object(oindx) {
    const g = game;
    const idx = oindx | 0;
    if ((g._oc_name_known && g._oc_name_known[idx])
        || (g._oc_encountered && g._oc_encountered[idx]))
        return;
    const oclass = (MKOBJ_OC_CLASS_LOCAL(idx)) | 0;
    const list = g._disco && g._disco[oclass];
    if (!list) return;
    const at = list.indexOf(idx);
    if (at >= 0)
        list.splice(at, 1);
    /* C o_init.c:520-521 */
    if ((MKOBJ_OC_CLASS[idx] | 0) === 13 /* GEM_CLASS */)
        gem_learned(idx); /* ok, it's actually been unlearned */
}

/* C o_init.c:441-452 observe_object(obj) — "make the object dknown and mark it
 * as encountered".  Its home is o_init.c, i.e. this file.  Before this it
 * existed only as a private partial copy in js/display.js:869 (which set
 * dknown and skipped discover_object entirely) and as a second copy inside
 * js/objnam.js for xname_flags(); export the real one so both resolve here. */
export function observe_object(obj) {
    const oindx = obj.otyp | 0;
    if (typeof process !== 'undefined' && ENV?.FF_OBS_TRACE === '1') {
        let caller = '';
        try {
            caller = String(new Error().stack || '').split('\n')[2]?.trim()?.replace(/^at\s+/, '') || '';
        } catch (_) { /* diagnostic only */ }
        pushRngLogEntry(`^observe_event[otyp=${oindx} id=${obj.o_id ?? 0} xy=${obj.ox ?? 0},${obj.oy ?? 0}`
            + ` dknown=${obj.dknown ? 1 : 0} hallu=${_observe_hallucinating() ? 1 : 0}`
            + ` frame=${game._ff_last_input_frame ?? -1}`
            + ` moves=${game.moves | 0} hero=${game.u?.ux | 0},${game.u?.uy | 0} caller=${encodeURIComponent(caller)}]`);
    }
    /* C o_init.c:447 `if (oindx >= FIRST_OBJECT && !Hallucination)` — skip for
     * generic objects (otyp 1..LAST_GENERIC==17) and STRANGE_OBJECT (otyp 0).
     * FIRST_OBJECT is 18 (objects.h:104-108, MARKER(FIRST_OBJECT,
     * LAST_GENERIC + 1), LAST_GENERIC == GENERIC_VENOM, the 17th GENERIC()
     * row) — matches js/cmd.js:46993's own copy of this guard. This copy read
     * `oindx >= 1`, which under-restricts the guard versus C (it excludes
     * only STRANGE_OBJECT, not the sixteen other generic markers 2..17). */
    if (oindx >= FIRST_OBJECT && !_observe_hallucinating()) {
        obj.dknown = 1;
        discover_object(oindx, false, true, false);
    }
}
function _observe_hallucinating() {
    const up = game.u && game.u.uprops ? game.u.uprops : null;
    if (!up) return false;
    const H = (i) => (up[i] ? (up[i].intrinsic | 0) : 0);
    const E = (i) => (up[i] ? (up[i].extrinsic | 0) : 0);
    return !!(H(HALLUC) && !(H(HALLUC_RES) || E(HALLUC_RES)));
}

/* Helper: object class of an otyp, read from the JS object data table. */
function MKOBJ_OC_CLASS_LOCAL(otyp) {
    return MKOBJ_OC_CLASS[otyp] ?? 0;
}
// C owns skill-based recognition in spell.c; retain the old import path.
export { skill_based_spellbook_id } from './spell.js';
import { ENV } from './hostenv.js';
/* Fixed (non-shuffled) descriptions for weapons, from WEAPON_TABLE; null when
 * the type is outside the weapon range or has no description (NoDes). */
function _fixedDescrOf(otyp) {
    const t = WEAPON_TABLE;
    if (t && otyp >= t.base && otyp < t.base + t.descrs.length)
        return t.descrs[otyp - t.base];
    return null;
}
/**
 * C o_init.c:150-235 — init_objects() (partial port).
 * Full C function initialises svb.bases[], shuffles gem colours, shuffles
 * all appearance descriptions, and then randomises WAN_NOTHING's direction.
 * The bases/shuffle/gem steps are handled elsewhere (setgemprobs via oinit,
 * randomize_gem_colors, and the fastforward shuffle RNG sequence).
 * This port handles only the WAN_NOTHING oc_dir step (line 234), which
 * requires an RNG call that must appear in the correct sequence position.
 * fastforward_pre_mklev() calls this instead of issuing rn2(2) directly.
 */
export function init_objects() {
    {
        const g = game;
        g._oc_name_known = g._oc_name_known || {};
        for (let i = MAXOCLASSES_OINIT; i < OC_DESCR.length; i++)
            if (!OC_DESCR[i]) g._oc_name_known[i] = true;
    }
    // The static column is now initialized by resetGame(), before any
    // init_objects/oinit reader, rather than first appearing here.
    /* C o_init.c:234: objects[WAN_NOTHING].oc_dir = rn2(2) ? NODIR : IMMEDIATE */
    _wan_nothing_oc_dir = rn2(2) ? NODIR : IMMEDIATE;
}
const MAXOCLASSES_OINIT = 18; /* objclass.h MAXOCLASSES — C's audit loop start */
