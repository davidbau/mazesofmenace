// eat.js - Eating / food code (and tin variety helpers used at object creation).
// C ref: nethack-c/upstream/src/eat.c

import { rn2, rnd, rn1, d } from './rng.js';
import { livelog_printf, LL_CONDUCT } from './livelog.js';
import { monster_by_pmidx, mon_cwt, mon_cnutrit, name_to_pmidx } from './makemon.js';
import { game } from './gstate.js';
import { pline, update_topl, y_n } from './display.js';
import { poison_strdmg, exercise, acurr_eff } from './attrib.js';
import { A_STR, A_DEX, A_CON } from './const.js';
import { attacktype, dmgtype, AT_MAGC, AD_STUN, AD_HALU } from './monattk_data.js';
import { mflags1_of, mflags2_of, M1_ACID, M1_POIS,
         M2_HUMAN, M2_ELF, M2_DWARF, M2_GNOME, M2_ORC, M2_PNAME }
    from './monflags_data.js';
import { more_experienced, newexplevel, pluslvl } from './exper.js';

// NOTE on imports: mkobj.js imports set_tin_variety() from this module, so a
// static `import ... from './mkobj.js'` (or invent.js, which imports mkobj.js)
// at the top of eat.js would close an initialization cycle
// (mkobj -> eat -> invent -> mkobj) that puts mkobj's `const` exports in the
// temporal dead zone.  The eating path is only reached at command time, well
// after all modules have finished initializing, so we resolve those bindings
// lazily via dynamic import() and cache them.  The tin helpers above use no
// cross-module bindings and remain statically importable by mkobj.js.

const COIN_CLASS = 12;      // mkobj.js COIN_CLASS
const CORPSE = 265;         // objects.c CORPSE (food-class corpse)
const TIN = 296;            // objects.c TIN
const FOOD_CLASS = 7;       // mkobj.js FOOD_CLASS
const FORTUNE_COOKIE = 289; // objects.h FORTUNE_COOKIE
const CLOVE_OF_GARLIC = 284; // mkobj.js CLOVE_OF_GARLIC
const APPLE = 277;          // mkobj.js APPLE
const PEAR = 279;           // mkobj.js PEAR
const CRAM_RATION = 292, K_RATION = 294, C_RATION = 295; // mkobj.js rations
const LEMBAS_WAFER = 291;   // objects.h LEMBAS_WAFER
// objects.h stone-to-flesh meats (fprefx's give_feedback cases).
const MEATBALL = 267, MEAT_STICK = 268, ENORMOUS_MEATBALL = 269,
      MEAT_RING = 270;
// C ref: eat.c:65 nonrotting_food(otyp) — only these two never spoil.
function nonrotting_food(otyp) {
    return otyp === LEMBAS_WAFER || otyp === CRAM_RATION;
}

// C ref: mondata.c olfaction(mdat) — most monsters can smell; golems, eyes,
// jellies, puddings, blobs, vortices, elementals, fungi and lights cannot.
// The class index lives in the makemon record's `mcls` (a NUMBER); `mlet` is
// the display LETTER ('F', 'a', ...), so the old `mlet === S_EYE` tests could
// never fire and every one of these classes came out able to smell.
export function olfaction(mdat) {
    // C's mdat is never NULL; do.js passes the HERO's permonst, which this port
    // does not store, and every role's player monster can smell — so a missing
    // record must answer TRUE ("You smell smoke...", not "You sense smoke...").
    if (!mdat) return true;
    const mcls = (typeof mdat.mcls === 'number') ? mdat.mcls : mdat.mlet;
    // defsym.h MONSYM indices.
    const S_GOLEM = 55, S_EYE = 5, S_JELLY = 10, S_PUDDING = 42, S_BLOB = 2,
        S_VORTEX = 22, S_ELEMENTAL = 31, S_FUNGUS = 32, S_LIGHT = 25;
    if (mcls === S_EYE || mcls === S_JELLY || mcls === S_PUDDING
        || mcls === S_BLOB || mcls === S_VORTEX || mcls === S_ELEMENTAL
        || mcls === S_FUNGUS || mcls === S_LIGHT || mcls === S_GOLEM)
        return false;
    return true;
}

// C ref: eat.c garlic_breath(mtmp) — eating garlic scares (untimed) every
// monster within distu < 7 that can smell.  monflee(mtmp, 0, FALSE, FALSE)
// with fleetime 0 and fleemsg FALSE consumes no RNG: it just sets mflee with
// mfleetim 0 (an untimed scare).  The fleeing state then drives the dochug
// rn2(40)/rn2(25) flee/teleport rolls (monmove.js) on each monster's turn.
function garlic_breath() {
    const u = game.u;
    if (!u) return;
    for (const mtmp of (game.level?.monsters || [])) {
        if (mtmp.mhp != null && mtmp.mhp <= 0) continue;
        if (!olfaction(mtmp.data)) continue;
        const dx = mtmp.mx - u.ux, dy = mtmp.my - u.uy;
        if (dx * dx + dy * dy < 7) {
            // monflee(mtmp, 0, FALSE, FALSE): untimed scare, no RNG, no message.
            mtmp.mflee = 1;
            mtmp.mfleetim = 0;
        }
    }
}

// Lazily-resolved cross-module helpers (see import note above).  Populated by
// loadEatDeps() before any eating work runs.
let _invent = null;
let _mkobj = null;
let _engrave = null;
let _vision = null;
async function loadEatDeps() {
    if (!_invent) _invent = await import('./invent.js');
    if (!_mkobj) _mkobj = await import('./mkobj.js');
    if (!_engrave) _engrave = await import('./engrave.js');
    if (!_vision) _vision = await import('./vision.js');
}

// tin types [SPINACH_TIN = -1, overrides corpsenm, nut==600]
// C ref: eat.c tintxts[]
// { txt, nut, fodder, greasy }
export const tintxts = [
    { txt: 'rotten', nut: -50, fodder: 0, greasy: 0 },  // ROTTEN_TIN = 0
    { txt: 'homemade', nut: 50, fodder: 1, greasy: 0 }, // HOMEMADE_TIN = 1
    { txt: 'soup made from', nut: 20, fodder: 1, greasy: 0 },
    { txt: 'french fried', nut: 40, fodder: 0, greasy: 1 },
    { txt: 'pickled', nut: 40, fodder: 1, greasy: 0 },
    { txt: 'boiled', nut: 50, fodder: 1, greasy: 0 },
    { txt: 'smoked', nut: 50, fodder: 1, greasy: 0 },
    { txt: 'dried', nut: 55, fodder: 1, greasy: 0 },
    { txt: 'deep fried', nut: 60, fodder: 0, greasy: 1 },
    { txt: 'szechuan', nut: 70, fodder: 1, greasy: 0 },
    { txt: 'broiled', nut: 80, fodder: 0, greasy: 0 },
    { txt: 'stir fried', nut: 80, fodder: 0, greasy: 1 },
    { txt: 'sauteed', nut: 95, fodder: 0, greasy: 0 },
    { txt: 'candied', nut: 100, fodder: 1, greasy: 0 },
    { txt: 'pureed', nut: 500, fodder: 1, greasy: 0 },
    { txt: '', nut: 0, fodder: 0, greasy: 0 },
];
// C ref: #define TTSZ SIZE(tintxts)
export const TTSZ = tintxts.length;

export const ROTTEN_TIN = 0;
export const HOMEMADE_TIN = 1;

// C ref: hack.h
export const SPINACH_TIN = -1;
export const RANDOM_TIN = -2;
export const HEALTHY_TIN = -3;

const NON_PM = -1;
// Monster permonst indices (monsters.js order, verified via monster_by_pmidx).
// Used only by nonrotting_corpse(); the name-based checks below are the
// authoritative path, but correct numeric indices avoid false positives
// (e.g. killer bee == 1 must NOT be mistaken for acid blob).
const PM_LICHEN = 158;
const PM_LIZARD = 326;
const PM_DEATH = 311;
const PM_PESTILENCE = 312;
const PM_FAMINE = 313;
const PM_ACID_BLOB = 6;

function corpse_mon_name(corpsenm) {
    return monster_by_pmidx(corpsenm)?.name ?? '';
}

// C ref: eat.c:58 #define nonrotting_corpse(mnum)
//   ((mnum) == PM_LIZARD || (mnum) == PM_LICHEN || is_rider(&mons[mnum])
//    || (mnum) == PM_ACID_BLOB)
function nonrotting_corpse(mnum) {
    const name = corpse_mon_name(mnum);
    return mnum === PM_LIZARD || mnum === PM_LICHEN
        || name === 'lizard' || name === 'lichen'
        || mnum === PM_DEATH || mnum === PM_PESTILENCE || mnum === PM_FAMINE
        || name === 'Death' || name === 'Pestilence' || name === 'Famine'
        || mnum === PM_ACID_BLOB || name === 'acid blob';
}

// C ref: ismnum(mnum) -> mnum is a valid monster index (>= LOW_PM)
function ismnum(mnum) {
    return mnum >= 0;
}

// C ref: mondata.h:232 vegan(ptr) — a class test with three named exceptions.
// defsym.h MONSYM indices: S_BLOB 2, S_JELLY 10, S_VORTEX 22, S_LIGHT 25,
// S_ELEMENTAL 31, S_FUNGUS 32, S_PUDDING 42, S_GHOST 54, S_GOLEM 55.
const S_BLOB_C = 2, S_JELLY_C = 10, S_VORTEX_C = 22, S_LIGHT_C = 25,
      S_ELEMENTAL_C = 31, S_FUNGUS_C = 32, S_PUDDING_C = 42, S_GHOST_C = 54,
      S_GOLEM_C = 55;
export function vegan(ptr) {
    if (!ptr) return false;
    const c = ptr.mcls, nm = ptr.name;
    if (c === S_BLOB_C || c === S_JELLY_C || c === S_FUNGUS_C
        || c === S_VORTEX_C || c === S_LIGHT_C) return true;
    // the stalker is the one non-vegan elemental; flesh and leather golems are
    // the two non-vegan golems
    if (c === S_ELEMENTAL_C) return nm !== 'stalker';
    if (c === S_GOLEM_C) return nm !== 'flesh golem' && nm !== 'leather golem';
    return c === S_GHOST_C;   // noncorporeal(ptr)
}

// C ref: mondata.h:239 vegetarian(ptr) = vegan(ptr) || (mlet == S_PUDDING &&
// ptr != &mons[PM_BLACK_PUDDING]).
//
// This used to `return false` unconditionally, described as a "conservative
// default" only consulted for HEALTHY_TIN.  It is not: eat.c tin_details()
// reads it to decide whether a tin's name gets " meat" appended
//     vegetarian(&mons[mnum]) ? "%s" : "%s meat"
// so with the stub EVERY tin was named "<species> meat" — C calls a lichen tin
// "a tin of lichen".  That was invisible on public only because the seed8000
// Tourist's inventory listing (the one session showing a lichen tin) was served
// from a memorised literal.
export function vegetarian(ptr) {
    if (!ptr) return false;
    if (vegan(ptr)) return true;
    return ptr.mcls === S_PUDDING_C && ptr.name !== 'black pudding';
}

// C ref: eat.c tin_variety(obj, displ)
export function tin_variety(obj, displ) {
    let r;
    const mnum = obj.corpsenm;

    if (obj.spe === 1) {
        r = SPINACH_TIN;
    } else if (obj.cursed) {
        r = ROTTEN_TIN; // always rotten if cursed
    } else if (obj.spe < 0) {
        r = -(obj.spe);
        --r; // get rid of the offset
    } else {
        r = rn2(TTSZ - 1);
    }

    if (!displ && r === HOMEMADE_TIN && !obj.blessed && !rn2(7))
        r = ROTTEN_TIN; // some homemade tins go bad

    if (r === ROTTEN_TIN && (ismnum(mnum) && nonrotting_corpse(mnum)))
        r = HOMEMADE_TIN; // lizards don't rot
    return r;
}

// C ref: eat.c:1460 set_tin_variety(struct obj *obj, int forcetype)
export function set_tin_variety(obj, forcetype) {
    let r;
    const mnum = obj.corpsenm;

    if (forcetype === SPINACH_TIN
        || (forcetype === HEALTHY_TIN
            && (mnum === NON_PM /* empty or already spinach */
                || !vegetarian(monster_by_pmidx(mnum))))) { /* replace meat */
        obj.corpsenm = NON_PM; /* not based on any monster */
        obj.spe = 1;           /* spinach */
        return;
    } else if (forcetype === HEALTHY_TIN) {
        r = tin_variety(obj, false);
        if (r < 0 || r >= TTSZ)
            r = ROTTEN_TIN; /* shouldn't happen */
        while ((r === ROTTEN_TIN && !obj.cursed) || !tintxts[r].fodder)
            r = rn2(TTSZ - 1);
    } else if (forcetype >= 0 && forcetype < TTSZ - 1) {
        r = forcetype;
    } else {               /* RANDOM_TIN */
        r = rn2(TTSZ - 1); /* take your pick */
        if (r === ROTTEN_TIN && (ismnum(mnum) && nonrotting_corpse(mnum)))
            r = HOMEMADE_TIN; /* lizards don't rot */
    }
    obj.spe = -(r + 1); /* offset by 1 to allow index 0 */
}

// ---------------------------------------------------------------------------
// Eating (the 'e' command).
//
// C ref: eat.c doeat()/touchfood()/floorfood()/gethungry().  RNG faithfulness:
// the only random draw consumed by the simple "eat carried food" path is the
// single rnd(2) inside next_ident(), reached when touchfood() splits a stack of
// quan > 1 (splitobj -> nextoid -> next_ident).  Fresh, non-rotten food then
// runs through fprefx()/start_eating(), which consume no RNG for the starter
// sessions (the rottenfood rn2(7) is short-circuited because the food is too
// young: svm.moves - obj.age <= 30).  See seed0016 step "j":
//   rnd(2)=2 @ next_ident(mkobj.c:521)   <- this function
//   rn2(12) x2  (mcalcmove)              <- per-turn block (allmain.js)
//   rn2(70)/rn2(200)/rn2(20)/rn2(70) ... <- maybe_generate_rnd_mon, dosounds,
//                                            gethungry, moveloop_core
//
// DISPATCH NOTE (for the orchestrator to wire in cmd.js rhack(); NOT edited
// here): add a branch
//     } else if (ch === 'e') {
//         game.context.move = (await doeat()) ? 1 : 0;
// and `import { doeat } from './eat.js';`.


// C ref: include/objects.h FOOD(name, prob, delay, wt, unk, material,
// nutrition, color, otyp) — [oc_delay (reqtime), oc_nutrition] for EVERY
// comestible otyp (mkobj.js OBJECT_DATA order; tripe ration == 264).
// The previous 8-entry table mislabelled two keys (276 was called CARROT but
// is the eucalyptus leaf; 288 was called CRAM_RATION but is the candy bar)
// and defaulted the other 25 foods to [1, 50], so a candy bar was eaten over
// 3 turns instead of 1 and a lembas wafer delivered 50 nutrition, not 800.
const FOOD_PROPS = {
    264: [2, 200],   // tripe ration
    265: [1, 0],     // corpse (nutrition comes from mons[].cnutrit)
    266: [1, 80],    // egg
    267: [1, 5],     // meatball
    268: [1, 5],     // meat stick
    269: [20, 2000], // enormous meatball
    270: [1, 5],     // meat ring (OBJECT() entry, delay 1 nutrition 5)
    271: [2, 20],    // glob of gray ooze
    272: [2, 20],    // glob of brown pudding
    273: [2, 20],    // glob of green slime
    274: [2, 20],    // glob of black pudding
    275: [1, 30],    // kelp frond
    276: [1, 1],     // eucalyptus leaf
    277: [1, 50],    // apple
    278: [1, 80],    // orange
    279: [1, 50],    // pear
    280: [1, 100],   // melon
    281: [1, 80],    // banana
    282: [1, 50],    // carrot
    283: [1, 40],    // sprig of wolfsbane
    284: [1, 40],    // clove of garlic
    285: [1, 250],   // slime mold
    286: [1, 200],   // lump of royal jelly
    287: [1, 100],   // cream pie
    288: [1, 100],   // candy bar
    289: [1, 40],    // fortune cookie
    290: [2, 200],   // pancake
    291: [2, 800],   // lembas wafer
    292: [3, 600],   // cram ration
    293: [5, 800],   // food ration
    294: [1, 400],   // K-ration
    295: [1, 300],   // C-ration
    296: [0, 0],     // tin (opened by start_tin(), never by the eat delay)
};

// Food otyps referenced by name below (same table order).
const TRIPE_RATION = 264, EGG = 266, EUCALYPTUS_LEAF = 276,
      SPRIG_OF_WOLFSBANE = 283, SLIME_MOLD = 285, LUMP_OF_ROYAL_JELLY = 286,
      CREAM_PIE = 287, CANDY_BAR = 288, PANCAKE = 290, FOOD_RATION = 293,
      CARROT = 282;

// C ref: objects.h oc_material — FLESH is the material that flags a food as an
// animal product (doeat()'s conduct switch) and the one is_rottable() cares
// about.  mkobj.js objects[].material carries the same numbering.
const LIQUID = 1, FLESH = 4, WOOD = 8;

function oc_material(otyp) { return _mkobj?.objects?.[otyp]?.material ?? 0; }
// C ref: obj.h is_rottable(otmp) — material <= WOOD and not LIQUID.
function is_rottable(otmp) {
    const m = oc_material(otmp.otyp);
    return m <= WOOD && m !== LIQUID;
}
// C ref: eat.c:2498 foodword(otmp) — EVERY FOOD_CLASS object is "food" (the
// foodwords[oc_material] table is only reached for non-food a metallivore or
// gelatinous cube is eating, which this port never produces).
function foodword(_otmp) { return 'food'; }

function food_delay(otyp) { const p = FOOD_PROPS[otyp]; return p ? p[0] : 0; }
function food_nutrit(otyp) { const p = FOOD_PROPS[otyp]; return p ? p[1] : 0; }

// C ref: eat.c:325 obj_nutrition(otmp) — a corpse's nutrition is the species
// cnutrit, a glob's is its current weight, everything else is the objects[]
// table value.  (The corpse/glob arms used to be missing, so eatcorpse()'s
// caller computed them by hand and every other caller got 50.)
function obj_nutrition(otmp) {
    if (otmp.otyp === CORPSE) return mon_cnutrit(otmp.corpsenm) ?? 0;
    if (otmp.globby) return otmp.owt || 0;
    return food_nutrit(otmp.otyp);
}

// C ref: eat.c:3808 consume_oeaten(obj, amt) — amt > 0 shifts the remaining
// nutrition right by amt, amt < 0 subtracts.  oeaten must never reach 0 (that
// would restore the item to "untouched"), so it floors at 1 AND cuts the meal
// short by setting reqtime = usedtime.  Both of those were missing.
function consume_oeaten(obj, amt) {
    if (!obj || !obj_nutrition(obj)) return;   /* C: impossible(), no change */
    if (amt > 0) obj.oeaten = (obj.oeaten || 0) >> amt;
    else if ((obj.oeaten || 0) > -amt) obj.oeaten = (obj.oeaten || 0) + amt;
    else obj.oeaten = 0;
    if (obj.oeaten === 0) {
        const v = game.context?.victual;
        if (v && obj === v.piece) v.reqtime = v.usedtime;
        obj.oeaten = 1;
    }
}

// C ref: hack.c rounddiv(x, y) — round-half-up integer division.
function rounddiv(num, den) {
    if (den === 0) return 0;
    const q = Math.trunc(num / den), rem = num % den;
    return (2 * rem >= den) ? q + 1 : q;
}

function objName(otmp) {
    return _mkobj?.objects?.[otmp.otyp]?.name || 'food';
}

function an(s) { return /^[aeiou]/i.test(s) ? `an ${s}` : `a ${s}`; }
function the(s) { return /^[A-Z]/.test(s) ? s : `the ${s}`; }

// C ref: eat.c food_xname(food, the_pfx) — the name used by the "you finish
// eating" line: a corpse becomes "<species> corpse", anything else is its
// singular xname.  `the_pfx` prepends the() (skipped for proper names).
function food_xname(otmp, the_pfx) {
    let result;
    if (otmp.otyp === CORPSE) {
        const nm = monster_by_pmidx(otmp.corpsenm)?.name || 'monster';
        result = `${nm} corpse`;
        if (type_is_pname(otmp.corpsenm)) the_pfx = false;
    } else {
        result = objName(otmp);
    }
    return the_pfx ? the(result) : result;
}

// C ref: eat.c is_edible() — for an unpolymorphed hero this is "FOOD_CLASS and
// not a unique object".  The polymorph arms (fire elemental eats flammables,
// metallivore eats metal, ghoul eats non-veggy corpses/eggs, gelatinous cube
// eats organics) are unported: nothing in this port polymorphs the hero, and a
// wrong arm here would make non-food selectable.
function is_edible(obj) {
    if (!obj) return false;
    if (_mkobj?.objects?.[obj.otyp]?.oc_unique) return false;
    return obj.oclass === FOOD_CLASS;
}

// C ref: eat.c eat_ok() — getobj() callback used by floorfood()'s getobj("eat").
// `getobj_else` is set by floorfood() once the player has DECLINED a piece of
// floor food; eat_ok(NULL) then answers GETOBJ_EXCLUDE_NONINVENT so getobj
// says "you don't have anything ELSE to eat".
let _getobj_else = 0;
export function eat_ok(obj) {
    const I = _invent;
    if (!obj)
        return _getobj_else ? (I ? I.GETOBJ_EXCLUDE_NONINVENT : -2)
                            : (I ? I.GETOBJ_EXCLUDE : -3);
    if (is_edible(obj)) return I ? I.GETOBJ_SUGGEST : 2;
    if (obj.oclass === COIN_CLASS) return I ? I.GETOBJ_EXCLUDE : -3;
    return I ? I.GETOBJ_EXCLUDE_SELECTABLE : 0;
}

// C ref: obj.h carried(obj) — the object is in the hero's inventory.
function carried(otmp) { return otmp?.where === 'invent'; }

// C ref: eat.c touchfood() — split a single item off a stack (consuming the
// rnd(2) inside next_ident via splitobj/nextoid), mark its initial nutrition,
// then freeinv() + addinv_nomerge() it.  That round-trip is why eating one item
// out of a stack gives the bitten piece a BRAND NEW inventory letter (the stack
// still holds the old one, so assigninvlet() clears it and takes lastinvnr+1) —
// which is how an interrupted meal shows up as "m - a partly eaten apple".
// Returns the single-item object that will be eaten.  The inv_cnt >= 52
// overflow branch (dropy instead of addinv, which can also delete the object
// and abort the meal) is not modelled: the port has no inv_cnt().
function touchfood(otmp) {
    const was_carried = carried(otmp);
    if ((otmp.quan || 1) > 1) {
        // C: splitobj(otmp, 1L) -> nextoid() -> next_ident() == one rnd(2).
        // The JS splitobj() in invent.js does not advance context.ident, so we
        // mirror the C o_id machinery explicitly here.
        _mkobj.next_ident();    // the single rnd(2) the C records at this point
        const stack = otmp;
        otmp = {
            ...stack,
            quan: 1,
            owt: 0,
            owornmask: 0,
            where: 'free',
            o_id: `${stack.o_id || 'food'}-bite`,
        };
        otmp.owt = _mkobj.weight(otmp);
        // splitobj() takes the piece out of the stack right away.
        stack.quan -= 1;
        stack.owt = _mkobj.weight(stack);
    }
    if (!otmp.oeaten) otmp.oeaten = obj_nutrition(otmp);
    // freeinv + addinv_nomerge.  For a quan==1 item this is letter-neutral
    // (nothing else holds its letter, so assigninvlet keeps it and leaves
    // lastinvnr alone), so only the split piece actually needs re-adding.
    if (was_carried && otmp.where === 'free') otmp = _invent.addinv_nomerge(otmp);
    return otmp;
}

// C ref: eat.c recalc_wt() — the piece gets lighter as it is eaten.
function recalc_wt() {
    const piece = game.context?.victual?.piece;
    if (piece && _mkobj) piece.owt = _mkobj.weight(piece);
}

// C ref: eat.c reset_eat() — flag the meal for reset at the end of this round.
export function reset_eat() {
    const v = game.context?.victual;
    if (v && v.eating && !v.doreset) v.doreset = 1;
}

// C ref: eat.c do_reset_eat() — abandon the current meal: re-touch the piece
// (so its weight matches what is left), clear the eating flags, stop the
// occupation and re-derive the hunger status.
async function do_reset_eat() {
    const v = (game.context = game.context || {}).victual;
    if (v && v.piece) {
        v.o_id = 0;
        const otmp = touchfood(v.piece);
        v.piece = otmp;
        if (otmp) { v.o_id = otmp.o_id; recalc_wt(); }
    }
    if (v) v.fullwarn = v.eating = v.doreset = 0;
    game._eat_occupation = null;
    await newuhs(false);
}

// C ref: eat.c:3163 gethungry() — the per-turn hunger machinery.  RNG-exact to
// the C ordering:
//
//   if ((!Unaware || !rn2(10))            <- eat.c:3174, only evaluated when
//        && (carnivorous|herbivorous|...) <- the hero is Unaware (asleep or
//        && !Slow_digestion)              <- unconscious); an awake hero
//       u.uhunger--;                         short-circuits and draws nothing.
//   accessorytime = rn2(20);              <- eat.c:3191, always consumed.
//
// The odd/even accessorytime cases (regeneration, encumbrance, Hunger,
// Conflict, worn rings/amulet) each burn another nutrition point and then
// newuhs(TRUE) recomputes the hunger state — all of which used to be missing
// from this copy, which stopped after the two rolls.
//
// NOTE: the live per-turn hook is allmain.js's own gethungry(); this export is
// the canonical implementation the orchestrator can route allmain through.
// Do NOT edit allmain.js from here.
export function gethungry() {
    const u = game.u;
    if (!u) return;

    // C ref: eat.c:3167 — u.uinvulnerable / debug_hunger skip the whole thing.
    if (u.uinvulnerable) return;

    const unaware = !!(u.usleep || u.uunconscious || u.ufrozen);
    // C: (!Unaware || !rn2(10)) && (carnivorous || herbivorous || metallivorous)
    //    && !Slow_digestion.  Every role's player monster eats.
    if (!unaware || !rn2(10)) {
        if (!Slow_digestion()) u.uhunger = (u.uhunger ?? 900) - 1;
    }

    // C ref: eat.c:3191 — accessorytime = rn2(20); replaces (moves % 20).
    const accessorytime = rn2(20);
    if (accessorytime % 2) {
        if (HRegeneration()) u.uhunger--;
        if (_invent && _invent.near_capacity() > 1 /* SLT_ENCUMBER */)
            u.uhunger--;
    } else {
        if (u.uprops?.Hunger) u.uhunger--;
        if (u.uprops?.Conflict) u.uhunger--;
        // cases 0/4/8/12/16: ring of slow digestion from armor, left ring,
        // amulet, right ring, and carrying the real Amulet.  The port has no
        // worn-ring/amulet hunger sources, so only the Amulet case can fire.
        if (accessorytime === 16 && u.uhave?.amulet) u.uhunger--;
    }
    newuhs(true);
}

// The port has no ring/armor slow digestion and no intrinsic regeneration
// source; both predicates exist so gethungry() reads like the C.
function Slow_digestion() { return !!game.u?.uprops?.Slow_digestion; }
function HRegeneration() { return !!game.u?.uprops?.Regeneration; }

// Hunger states (hack.h).
const SATIATED = 0, NOT_HUNGRY = 1, HUNGRY = 2, WEAK = 3, FAINTING = 4,
      FAINTED = 5, STARVED = 6;
const A_STR_EAT = A_STR;

// C ref: eat.c newuhs(incr) — recompute u.uhs from u.uhunger and announce any
// change.  Ported in full: the mid-meal suppression (C stashes the hunger
// status while the eatfood occupation runs so a WEAK->HUNGRY->NOT_HUNGRY meal
// doesn't print "you only feel hungry now"), the FAINTING rn2 roll, the
// temporary strength loss at WEAK, and the starvation death.
let _saved_hs = null;   // C: static save_hs / saved_hs
export function newuhs(incr) {
    const u = game.u;
    if (!u) return;
    const h = u.uhunger ?? 900;
    let newhs = (h > 1000) ? SATIATED
        : (h > 150) ? NOT_HUNGRY
        : (h > 50) ? HUNGRY
        : (h > 0) ? WEAK : FAINTING;

    // C ref: eat.c:3402 — while the eatfood occupation (or start_eating's
    // pre-occupation bite, flagged by force_save_hs) is running, remember the
    // status the meal started at and suppress the messages.
    if (game._eat_occupation || game._force_save_hs) {
        if (_saved_hs === null) _saved_hs = u.uhs ?? NOT_HUNGRY;
        u.uhs = newhs;
        return;
    }
    if (_saved_hs !== null) { u.uhs = _saved_hs; _saved_hs = null; }

    if (newhs === FAINTING) {
        // C ref: eat.c:3418 — u.uhunger is negative here.
        const uhunger_div_by_10 = Math.sign(h) * Math.trunc((Math.abs(h) + 5) / 10);
        if ((u.uhs ?? NOT_HUNGRY) === FAINTED) newhs = FAINTED;
        // The rn2 is drawn whenever uhs > WEAK, i.e. it is NOT short-circuited
        // once the hero has already fainted once.
        if ((u.uhs ?? NOT_HUNGRY) <= WEAK
            || rn2(20 - uhunger_div_by_10) >= 19) {
            if ((u.uhs ?? NOT_HUNGRY) !== FAINTED && (game.multi ?? 0) >= 0) {
                const duration = 10 - uhunger_div_by_10;
                game._eat_occupation = null;
                game._pending_message = 'You faint from lack of food.';
                u.uprops = u.uprops || {};
                u.uprops.HDeaf = (u.uprops.HDeaf || 0) + duration;
                if ((game.multi ?? 0) >= -duration) game.multi = -duration;
                game.multi_reason = 'fainted from lack of food';
                game.nomovemsg = 'You regain consciousness.';
                game.afternmv = unfaint;
                newhs = FAINTED;
                // C also calls selftouch("Falling, you") when not levitating;
                // that only matters while wielding a cockatrice corpse.
            }
        } else if (h < -(100 + 10 * acurr_eff(A_CON))) {
            u.uhs = STARVED;
            game._pending_message = 'You die from starvation.';
            game._starved = true;      /* done(STARVING) is not modelled */
            return;
        }
    }

    if (newhs !== (u.uhs ?? NOT_HUNGRY)) {
        const oldhs = u.uhs ?? NOT_HUNGRY;
        // C ref: eat.c:3470 — crossing into WEAK costs a temporary point of
        // strength (ATEMP(A_STR) = -1), which the status line shows; coming
        // back out of WEAK restores it.
        if (newhs >= WEAK && oldhs < WEAK) {
            u.atemp = u.atemp || { a: [0, 0, 0, 0, 0, 0] };
            u.atemp.a[A_STR_EAT] = -1;
        } else if (newhs < WEAK && oldhs >= WEAK) {
            u.atemp = u.atemp || { a: [0, 0, 0, 0, 0, 0] };
            u.atemp.a[A_STR_EAT] = 0;
        }
        const hallu = !!u.uhallu;
        if (newhs === HUNGRY) {
            game._pending_message = hallu
                ? (!incr ? 'You now have a lesser case of the munchies.'
                         : 'You are getting the munchies.')
                : `You ${!incr ? 'only feel hungry now'
                     : (h < 145) ? 'feel hungry'
                       : 'are beginning to feel hungry'}.`;
        } else if (newhs === WEAK) {
            const role = game.urole?.name?.m || '';
            game._pending_message = hallu
                ? (!incr ? 'You still have the munchies.'
                  : 'The munchies are interfering with your motor capabilities.')
                : (incr && (role === 'Wizard' || role === 'Valkyrie'))
                    ? `${role} needs food, badly!`
                  : (incr && game.urace?.adj === 'elven')
                    ? 'Elf needs food, badly!'
                  : `You ${!incr ? 'are still'
                       : (h < 45) ? 'feel'
                         : 'are beginning to feel'} weak.`;
        }
        // C: incr && occupation && occupation != eatfood/opentin ->
        // stop_occupation(); the eating occupation deliberately survives.
        if (incr && (newhs === HUNGRY || newhs === WEAK)) {
            for (const slot of ['_search_occupation', '_wipe_occupation',
                                '_study_occupation'])
                if (game[slot]) game[slot] = null;
        }
        u.uhs = newhs;
        // C ref: eat.c:3505 — dying of hunger and exhaustion when the status
        // change happens at 0 HP; done() is not modelled here.
    }
}

// C ref: eat.c unfaint() — the afternmv that ends a faint.
export function unfaint() {
    Hear_again();
    const u = game.u;
    if (u && (u.uhs ?? NOT_HUNGRY) > FAINTING) u.uhs = FAINTING;
    game._eat_occupation = null;
    return 0;
}

// C ref: eat.c lesshungry(num) — add nutrition, then either choke (over 2000)
// or warn about being nearly full (1500), then recompute the hunger status.
// The choke and fullwarn arms used to be missing entirely, so a hero who ate
// past 2000 while satiated never died and never got the warning that stops
// the meal.
async function lesshungry_eat(num) {
    const u = game.u;
    if (!u) return;
    const v = (game.context = game.context || {}).victual || {};
    const iseating = !!game._eat_occupation || !!game._force_save_hs;
    u.uhunger = (u.uhunger ?? 900) + num;
    if (u.uhunger >= 2000) {
        if (!iseating || v.canchoke) {
            await choke(iseating ? v.piece : null);
            if (iseating) reset_eat();
        }
    } else if (u.uhunger >= 1500 && !u.uprops?.Hunger
               && (!v.eating || !v.fullwarn)) {
        await update_topl("You're having a hard time getting all of it down.");
        game.nomovemsg = "You're finally finished.";
        if (!v.eating) {
            game.multi = -2;
        } else {
            v.fullwarn = 1;
            // C also offers ParanoidEating's "Continue eating?" prompt here;
            // that option is off in the recorded config, so the query never
            // appears and no input boundary moves.
        }
    }
    newuhs(false);
}

// C ref: eat.c choke(food) — eating while already satiated.  The vomit arm and
// the death arm both matter to the stream: the rn2(20) is drawn whenever the
// hero is neither Breathless nor Hungry-cursed.
async function choke(food) {
    const u = game.u;
    if (!u) return;
    if ((u.uhs ?? NOT_HUNGRY) !== SATIATED) return;   /* AoS case unported */
    // C: Role_if(PM_KNIGHT) && A_LAWFUL -> adjalign(-1) + "like a glutton!".
    if (game.urole?.mnum === 4 /* PM_KNIGHT */ && (u.ualign?.type ?? 0) === 1) {
        if (typeof u.ualign?.record === 'number') u.ualign.record -= 1;
        await update_topl('You feel like a glutton!');
    }
    exercise(A_CON, false);
    if (!rn2(20)) {
        await update_topl('You stuff yourself and then vomit voluminously.');
        // C: morehungry(Hunger ? (u.uhunger - 60) : 1000) — morehungry()
        // SUBTRACTS its argument from u.uhunger.
        u.uhunger = (u.uhunger ?? 900) - (u.uprops?.Hunger
                                          ? ((u.uhunger ?? 900) - 60) : 1000);
        newuhs(true);
        // vomit()'s nomul(-2)/"You can move again" is not modelled.
    } else {
        await update_topl(`You choke over your ${food ? foodword(food) : 'food'}.`);
        await update_topl('You die...');
        game._choked = true;                 /* done(CHOKING) not modelled */
    }
}

// C ref: eat.c bite() — one round's worth of nutrition delivery.  Returns 1
// when the hero choked (the meal is over), 0 otherwise.
async function bite() {
    const v = game.context?.victual;
    if (!v) return 0;
    if (v.canchoke && (game.u?.uhunger ?? 0) >= 2000) {
        await choke(v.piece);
        return 1;
    }
    if (v.doreset) { await do_reset_eat(); return 0; }
    game._force_save_hs = true;
    if (v.nmod < 0) {
        await lesshungry_eat(adj_victual_nutrition());
        consume_oeaten(v.piece, v.nmod);        /* -= -nmod */
    } else if (v.nmod > 0 && (v.usedtime % v.nmod)) {
        await lesshungry_eat(1);
        consume_oeaten(v.piece, -1);            /* -= 1 */
    }
    game._force_save_hs = false;
    recalc_wt();
    return 0;
}

// C ref: eat.c adj_victual_nutrition() — the per-round nutrition of a negative
// nmod, adjusted for the racial lembas/cram bonuses.  Only called when nmod<0.
function adj_victual_nutrition() {
    const v = game.context?.victual;
    const otyp = v?.piece?.otyp;
    let nut = -(v?.nmod || 0);
    const race = game.urace?.adj;
    if (otyp === LEMBAS_WAFER) {
        if (race === 'elven') nut += Math.trunc((nut + 2) / 4);   /* 800->1000 */
        else if (race === 'orcish') nut -= Math.trunc((nut + 2) / 4); /* ->600 */
    } else if (otyp === CRAM_RATION) {
        if (race === 'dwarven') nut += Math.trunc((nut + 3) / 6);  /* 600->700 */
    }
    return Math.max(nut, 1);
}

// C ref: eat.c eatfood() — the eating occupation, run once per turn while the
// meal is in progress.  ++usedtime; while usedtime <= reqtime take another
// bite and stay busy; once past reqtime the meal is done.
export async function eatfood_step() {
    const v = game.context?.victual;
    // C ref: eatfood() — if the food vanished (stolen / no longer here) reset.
    if (!v || !v.piece) { game._eat_occupation = null; await do_reset_eat(); return false; }
    if (!v.eating) { game._eat_occupation = null; return false; }
    v.usedtime = (v.usedtime || 0) + 1;
    if (v.usedtime <= v.reqtime) {
        if (await bite()) { game._eat_occupation = null; return false; }
        return true; // still busy
    }
    await done_eating(true);
    game._eat_occupation = null;
    return false;
}

// C ref: eat.c done_eating(message) — finish the meal: "You finish eating
// <the food>." (unless suppressed), the post-effects, then use the piece up.
async function done_eating(message) {
    const v = game.context?.victual;
    if (!v || !v.piece) return;
    const piece = v.piece;
    piece.in_use = true;
    game._eat_occupation = null;   /* C: go.occupation = 0 before newuhs() */
    newuhs(false);
    if (game.nomovemsg) {
        if (message) await update_topl(game.nomovemsg);
        game.nomovemsg = null;
    } else if (message) {
        await update_topl(`You finish eating ${food_xname(piece, true)}.`);
    }

    if (piece.otyp === CORPSE || piece.globby) await cpostfx(piece.corpsenm);
    else await fpostfx(piece);

    if (carried(piece)) _invent.useup(piece);
    else _invent.useupf(piece, 1);
    game.context.victual = { piece: null, o_id: 0 };
}

// C ref: eat.c start_eating(otmp, already_partly_eaten) — take the first bite
// on the same turn eating starts, then either finish immediately or set the
// eatfood occupation for the remaining reqtime-1 turns.
async function start_eating(otmp, already_partly_eaten) {
    const v = (game.context = game.context || {}).victual;
    v.fullwarn = v.doreset = 0;
    v.eating = 1;

    if (otmp.otyp === CORPSE || otmp.globby) {
        await cprefx(v.piece.corpsenm);
        if (!game.context.victual?.piece || !game.context.victual.eating)
            return;   /* rider revived, or hero died and was lifesaved */
    }

    const old_nomovemsg = game.nomovemsg;
    if (await bite()) {
        // survived choking: finish off food that's nearly done.
        if (++v.usedtime >= v.reqtime) {
            const save_nomovemsg = game.nomovemsg;
            if (!old_nomovemsg) game.nomovemsg = null;
            await done_eating(false);
            if (!old_nomovemsg) game.nomovemsg = save_nomovemsg;
        }
        return;
    }
    if (++v.usedtime >= v.reqtime) {
        // "print finish eating message if they just resumed" -dlc
        await done_eating((v.reqtime > 1 || already_partly_eaten) ? true : false);
        return;
    }
    // set_occupation(eatfood, "eating <food>", 0)
    game._eat_occupation = true;
}

// C ref: eat.c floorfood("eat", 0) — for an ordinary (non-metallivorous) hero
// on reachable floor, scan the objects at the hero's spot and, for each
// non-coin edible one, ask "There is/are <obj> here; eat it/one? [ynq] (n)".
//   'y' -> return that object (eat it off the floor);
//   'q' -> return a CANCEL sentinel (abort the command);
//   'n' -> continue to the next floor object, then fall through to inventory.
// The metallivore arms (bear trap, iron bars, gold) need a polymorphed hero.
// Returns { kind:'floor', obj } | { kind:'cancel' } | { kind:'invent' }.
async function floorfood_eat() {
    const u = game.u;
    _getobj_else = 0;
    // C ref: floorfood() — the 'm' prefix (menu_requested) and being mounted
    // both skip the floor entirely, as does not being able to reach it.
    const skipfloor = !!game.iflags?.menu_requested || !!u.usteed;
    if (!skipfloor) {
        const objs = (game.level?.objects || []).filter(
            (o) => o.where === 'floor' && o.ox === u.ux && o.oy === u.uy);
        for (const otmp of objs) {
            // feeding (corpsecheck 0): non-coin && is_edible.
            if (otmp.oclass === COIN_CLASS || !is_edible(otmp)) continue;
            const one = (otmp.quan || 1) === 1;
            // "There <is/are> <doname> here; eat <it/one>?"
            const nm = _invent.obj_doname(otmp);
            const verbBe = one ? 'is' : 'are';
            const qbuf = `There ${verbBe} ${nm} here; eat ${one ? 'it' : 'one'}?`;
            const c = await y_n(qbuf, 'ynq', 'n');
            if (c === 'y') return { kind: 'floor', obj: otmp };
            if (c === 'q') return { kind: 'cancel' };
            ++_getobj_else;   // 'n': declined this one
            // 'n': try the next floor object, then inventory.
        }
    }
    return { kind: 'invent' };
}

// C ref: hack.c check_capacity(str) — refuse the action while carrying more
// than EXT_ENCUMBER (Strained).  doeat() calls it right after floorfood(), so
// an overloaded hero burns no turn even after answering the floor prompt.
async function check_capacity() {
    if (_invent && _invent.near_capacity() >= 3 /* EXT_ENCUMBER */) {
        await pline('You cannot do that while carrying so much stuff.');
        return true;
    }
    return false;
}

export async function doeat() {
    await loadEatDeps();
    const u = game.u;

    // C: if (Strangled) "If you can't breathe air, how can you consume
    // solids?" — the port has no strangulation source.

    // C: floorfood("eat", 0) first — a heavy corpse (or any edible) at the
    // hero's spot is offered before the inventory getobj prompt.
    const ff = await floorfood_eat();
    if (ff.kind === 'cancel') return false;        // ECMD_OK (declined with 'q')
    let otmp = ff.kind === 'floor' ? ff.obj : null;

    if (!otmp) {
        // floorfood declined / nothing edible on the floor -> getobj("eat").
        otmp = await _invent.getobj('eat', eat_ok);
        if (!otmp) return false;                   // ECMD_OK (cancelled)
    }
    if (await check_capacity()) return false;      // ECMD_OK

    if (!is_edible(otmp)) {
        await pline('You cannot eat that!');
        return false;                              // ECMD_OK
    }
    // C: eating something you're wearing / a rustproofed metal item / a ring
    // of slow digestion / any non-FOOD_CLASS object (doeat_nonfood) all need a
    // polymorphed or metallivorous hero, which the port never produces.

    // C ref: eat.c:2919 — resuming the meal already in progress.  Without this
    // branch a resumed meal ran the whole fresh-food path again: a second
    // conduct bump, a second rot check (an extra rn2(7)) and a restarted
    // reqtime.
    const v0 = game.context?.victual;
    if (v0 && v0.piece && otmp === v0.piece) {
        const one_bite_left = (v0.usedtime + 1 >= v0.reqtime);
        if ((u.uhs ?? NOT_HUNGRY) !== SATIATED) v0.canchoke = 0;
        v0.o_id = 0;
        otmp = touchfood(otmp);
        if (otmp) { v0.piece = otmp; v0.o_id = otmp.o_id; }
        else await do_reset_eat();
        await update_topl(`You ${!one_bite_left ? 'resume'
                                : 'consume the last bite of'} your meal.`);
        if (otmp) await start_eating(otmp, false);
        return true;                               // ECMD_TIME
    }

    // C: tins are a special case — start_tin() opens them over several turns.
    // start_tin()/opentin()/consume_tin() are unported (see the DEFERRED note
    // at the end of this file); declining is wrong but bounded, whereas a
    // half-ported tin would desync the whole opening occupation.
    if (otmp.otyp === TIN) {
        await pline('You cannot eat that!');
        return false;
    }

    // C ref: eat.c doeat():2962 — `if (!u.uconduct.food++) livelog_printf(
    // LL_CONDUCT, "ate for the first time - %s", food_xname(otmp, FALSE));`
    // The chronicle entry was missing, so #chronicle ('v') listed one line short.
    u.uconduct = u.uconduct || {};
    let ll_conduct = 0;
    if (!(u.uconduct.food || 0)) {
        ll_conduct++;
        livelog_printf(LL_CONDUCT, `ate for the first time - ${food_xname(otmp, false)}`);
    }
    u.uconduct.food = (u.uconduct.food || 0) + 1;

    const already_partly_eaten = !!otmp.oeaten;
    // C: otmp = touchfood(otmp) -> the single rnd(2) for a quan>1 split.
    otmp = touchfood(otmp);
    game.context = game.context || {};
    const v = game.context.victual = {
        piece: otmp, o_id: otmp.o_id, usedtime: 0, reqtime: 0, nmod: 0,
        eating: 0, canchoke: 0, fullwarn: 0, doreset: 0,
    };

    let dont_start = false;
    if (otmp.otyp === CORPSE || otmp.globby) {
        const tmp = await eatcorpse(otmp);
        if (tmp === 2) {
            // used up
            game.context.victual = { piece: null, o_id: 0 };
            return true;                           // ECMD_TIME
        } else if (tmp) {
            dont_start = true;
        }
    } else {
        // C ref: eat.c:2985 — the conduct switch on the food's material.
        if (oc_material(otmp.otyp) === FLESH) {
            if (!(u.uconduct.unvegan || 0) && !ll_conduct) {
                livelog_printf(LL_CONDUCT,
                    `consumed animal products for the first time, by eating ${an(food_xname(otmp, false))}`);
                ll_conduct++;
            }
            u.uconduct.unvegan = (u.uconduct.unvegan || 0) + 1;
            if (otmp.otyp !== EGG) {
                if (violated_vegetarian()) await update_topl('You feel guilty.');
            }
        } else if (otmp.otyp === PANCAKE || otmp.otyp === FORTUNE_COOKIE
                   || otmp.otyp === CREAM_PIE || otmp.otyp === CANDY_BAR
                   || otmp.otyp === LUMP_OF_ROYAL_JELLY) {
            if (!(u.uconduct.unvegan || 0) && !ll_conduct)
                livelog_printf(LL_CONDUCT,
                    `consumed animal products (${food_xname(otmp, false)}) for the first time`);
            u.uconduct.unvegan = (u.uconduct.unvegan || 0) + 1;
        }

        v.reqtime = food_delay(otmp.otyp);
        // C ref: eat.c:3027 — the first-bite rot check.  The && chain decides
        // whether the rn2(7) is drawn at all: a cursed item short-circuits
        // before it, and food younger than its threshold never reaches it.
        if (otmp.otyp !== FORTUNE_COOKIE
            && (otmp.cursed
                || (!nonrotting_food(otmp.otyp)
                    && ((game.moves ?? 0) - (otmp.age ?? 0))
                         > (otmp.blessed ? 50 : 30)
                    && (otmp.orotten || !rn2(7))))) {
            if (await rottenfood_eat(otmp)) {
                otmp.orotten = true;
                dont_start = true;
            }
            consume_oeaten(otmp, 1);               /* oeaten >>= 1 */
        } else if (!already_partly_eaten) {
            // C: fprefx() returning FALSE means the food is gone (a pyrolisk
            // egg exploded) — the meal never starts.
            if (!await fprefx(otmp)) {
                await do_reset_eat();
                return true;                       // ECMD_TIME
            }
        } else {
            await update_topl(`You ${v.reqtime === 1 ? 'eat' : 'begin eating'} `
                              + `${_invent.obj_doname(otmp)}.`);
        }
    }

    // re-calc the nutrition
    const basenutrit = obj_nutrition(otmp);
    v.reqtime = (basenutrit === 0) ? 0
        : rounddiv(v.reqtime * (otmp.oeaten || 0), basenutrit);
    if (v.reqtime === 0 || !otmp.oeaten) v.nmod = 0;
    else if (otmp.oeaten >= v.reqtime) v.nmod = -Math.trunc(otmp.oeaten / v.reqtime);
    else v.nmod = v.reqtime % otmp.oeaten;
    // C ref: eat.c:3086 — canchoke decides whether bite()/lesshungry() can kill
    // the hero later in the meal; it used to be hardcoded 0.
    v.canchoke = ((u.uhs ?? NOT_HUNGRY) === SATIATED) ? 1 : 0;

    if (!dont_start) await start_eating(otmp, already_partly_eaten);
    else otmp.owt = _mkobj.weight(otmp);
    _invent.update_inventory?.();
    return true; // ECMD_TIME — a game turn elapses (per-turn block runs next)
}

// C ref: eat.c fprefx(otmp) — "first bite" feedback (present tense,
// eat.c:2099).  Returns FALSE when eating must not proceed (the pyrolisk egg
// explodes and is used up).  The recorder is a MACOS build, so a non-cursed
// APPLE prints the Macintosh line (eat.c:2183) rather than the UNIX rnd(100)
// "core dumped" joke.
async function fprefx(otmp) {
    const u = game.u;
    const Halluc = !!u?.uhallu;
    const v = game.context?.victual;
    let give_feedback = false;

    switch (otmp.otyp) {
    case EGG:
        // C: a pyrolisk egg explodes (explode() + the egg is used up) and the
        // meal is aborted; d(3,6) is rolled for the damage.
        if (corpse_mon_name(otmp.corpsenm) === 'pyrolisk') {
            if (carried(otmp)) _invent.useup(otmp);
            else _invent.useupf(otmp, 1);
            d(3, 6);                              /* explode() damage roll */
            return false;
        } else if ((game.moves ?? 0) - (otmp.age ?? 0) > 400 /* 2*MAX_EGG_HATCH_TIME */) {
            await update_topl('Ugh.  Rotten egg.');
            // make_vomiting(Vomiting + d(10,4), TRUE)
            const t = d(10, 4);
            if (u) {
                u.uprops = u.uprops || {};
                u.uprops.Vomiting = (u.uprops.Vomiting || 0) + t;
            }
        } else give_feedback = true;
        break;
    case FOOD_RATION:
        // C prints NOTHING when the hero is not hungry enough; the old port
        // fell through to give_feedback and said "This food ration is
        // delicious!" for every food ration ever eaten.
        if ((u?.uhunger ?? 900) <= 200)
            await update_topl(Halluc ? 'Oh wow, like, superior, man!'
                                     : 'This food really hits the spot!');
        else if ((u?.uhunger ?? 900) < 700)
            await update_topl('This satiates your stomach!');
        break;
    case TRIPE_RATION:
        // hero is humanoid and not carnivorous-only, and no role is an orc by
        // default, so C's third arm is the reachable one.
        if (heroCarnivorous() && !heroHumanoid()) {
            await update_topl('This tripe ration is surprisingly good!');
        } else if (game.urace?.adj === 'orcish') {
            await update_topl(Halluc ? 'Tastes great!  Less filling!'
                                     : 'Mmm, tripe... not bad!');
        } else {
            await update_topl('Yak - dog food!');
            // C: more_experienced(1, 0) + newexplevel() — one experience
            // point, which can level the hero up (and roll newhp()/newpw()).
            more_experienced(1, 0);
            await newexplevel();
            // "not cannibalism, but we use similar criteria"
            if (rn2(2) && !CANNIBAL_ALLOWED()) {
                const t = rn1(v?.reqtime ?? 2, 14);
                if (u) {
                    u.uprops = u.uprops || {};
                    u.uprops.Vomiting = (u.uprops.Vomiting || 0) + t;
                }
            }
        }
        break;
    case LEMBAS_WAFER:
        if (game.urace?.adj === 'orcish') {
            await update_topl('!#?&* elf kibble!');
            break;
        } else if (game.urace?.adj === 'elven') {
            await update_topl('A little goes a long way.');
            break;
        }
        give_feedback = true;
        break;
    case MEATBALL:
    case MEAT_STICK:
    case ENORMOUS_MEATBALL:
    case MEAT_RING:
        give_feedback = true;
        break;
    case CLOVE_OF_GARLIC:
        if (u?.uundead) {
            const t = rn1(v?.reqtime ?? 1, 5);
            u.uprops = u.uprops || {};
            u.uprops.Vomiting = (u.uprops.Vomiting || 0) + t;
            break;
        }
        garlic_breath();
        /* FALLTHROUGH to the default arm */
        give_feedback = await fprefx_default(otmp, Halluc);
        break;
    default:
        give_feedback = await fprefx_default(otmp, Halluc);
        break;
    }
    if (give_feedback) {
        // give_feedback: the generic per-food taste line (eat.c:2204).
        // C ref: pline() -> vpline -> update_topl: the give_feedback line pages
        // via the topline NEED_MORE state machine ("...is delicious!--More--")
        // so a following fortune-cookie readout fires its own --More-- frame.
        const ration = (otmp.otyp === CRAM_RATION || otmp.otyp === K_RATION
                        || otmp.otyp === C_RATION);
        const taste = otmp.cursed ? (Halluc ? 'grody!' : 'terrible!')
            : ration ? 'bland.'
            : (Halluc ? 'gnarly!' : 'delicious!');
        await update_topl(`This ${objName(otmp)} is ${taste}`);
    }
    return true;
}

// The default arm of fprefx()'s switch: returns TRUE when the generic
// give_feedback line should be printed.
async function fprefx_default(otmp, Halluc) {
    // C: otmp->spe == svc.context.current_fruit (the player's own fruit).
    // current_fruit is not modelled, so this can only fire once it is.
    if (otmp.otyp === SLIME_MOLD && !otmp.cursed
        && game.context?.current_fruit != null
        && otmp.spe === game.context.current_fruit) {
        await update_topl(`My, this is a ${Halluc ? 'primo' : 'yummy'} `
                          + `${objName(otmp)}!`);
        return false;
    }
    if (otmp.otyp === APPLE && otmp.cursed && !game.u?.uprops?.Sleep_resistance)
        return false;   /* skip core joke; feedback deferred to fpostfx() */
    if (otmp.otyp === APPLE) {
        await pline('Delicious!  Must be a Macintosh!');
        return false;
    }
    if (otmp.otyp === PEAR) {
        if (!Halluc) {
            await pline('Core dumped.');
        } else {
            const x = rnd(100);
            await pline(`${x <= 75 ? 'Segmentation fault'
                          : x <= 99 ? 'Bus error' : "Yo' mama"} -- core dumped.`);
        }
        return false;
    }
    return true;
}

// C ref: eat.c fpostfx(otmp) — post-consumption effects for non-corpse food.
async function fpostfx(otmp) {
    const u = game.u;
    switch (otmp.otyp) {
    case SPRIG_OF_WOLFSBANE:
        // C: you_unwere(TRUE) when the hero is a lycanthrope; the port has no
        // u.ulycn source.
        break;
    case CARROT:
        // C: make_blinded(u.ucreamed, TRUE) — a carrot SETS the blindness
        // timer to however much cream is on your face (normally 0), so it
        // cures blindness.  Blind gates a large number of later rn2
        // predicates, so this is not display-only.  make_blinded() only
        // announces when sight is actually regained, hence the was_blind
        // guard (C: can_see_now && !u_could_see).
        // C's guard is `!u.uswallow || !attacktype_fordmg(ustuck, AT_ENGL,
        // AD_BLND)`; nothing in this port engulfs the hero.
        if (u && !u.uswallow) {
            const was_blind = _vision.Blind();
            u.blinded = u.ucreamed || 0;
            u.ucreamed = 0;
            if (was_blind && !_vision.Blind()) {
                await update_topl(u.uhallu
                    ? 'Far out!  Everything is all cosmic again!'
                    : 'You can see again.');
                try { _vision.vision_recalc(0); } catch (e) { /* ignore */ }
            }
        }
        break;
    case FORTUNE_COOKIE: {
        // C: outrumor(bcsign(otmp), BY_COOKIE)
        const bcsign = (otmp.blessed ? 1 : 0) - (otmp.cursed ? 1 : 0);
        const line = _engrave.outrumor(bcsign, _engrave.BY_COOKIE);
        // BY_COOKIE feedback: "This cookie has a scrap of paper inside." then
        // "It reads:" then the rumor (skipped when blind/fainted, in which case
        // outrumor returned '' with no RNG).
        if (line) {
            // C ref: outrumor() -> pline() -> update_topl for each line so the
            // BY_COOKIE readout pages ("scrap of paper...It reads:--More--")
            // instead of clobbering the topline in one dumb overwrite.
            await update_topl('This cookie has a scrap of paper inside.');
            await update_topl('It reads:');
            await update_topl(line);
        }
        // C: if (!Blind) if (!u.uconduct.literate++) livelog(...). No RNG.
        if (!_vision.Blind()) {
            game.u = game.u || {};
            game.u.uconduct = game.u.uconduct || {};
            game.u.uconduct.literate = (game.u.uconduct.literate || 0) + 1;
        }
        break;
    }
    case LUMP_OF_ROYAL_JELLY:
        // C: "This stuff seems to be VERY healthy!" — gainstr then rnd(20) HP,
        // with a 1-in-17 max-HP bump.  All three draws are unconditional.
        gainstr(otmp, 1);
        if (u) {
            u.uhp = (u.uhp || 0) + (otmp.cursed ? -rnd(20) : rnd(20));
            if (u.uhp > u.uhpmax) {
                if (!rn2(17)) {
                    u.uhpmax++;
                    if ((u.uhpmax || 0) > (u.uhppeak || 0)) u.uhppeak = u.uhpmax;
                }
                u.uhp = u.uhpmax;
            } else if (u.uhp <= 0) {
                game._poisoned_death = true;   /* done(POISONING) unported */
            }
            // C: if (!cursed) heal_legs(0) — wounded legs are healed.
            if (!otmp.cursed && u.uprops?.Wounded_legs) {
                u.uprops.Wounded_legs = 0;
                if (u.atemp?.a && (u.atemp.a[A_DEX] || 0) < 0)
                    u.atemp.a[A_DEX]++;
            }
        }
        break;
    case EGG:
        // C: a cockatrice/chickatrice egg petrifies the eater (make_stoned(5)).
        if (ismnum(otmp.corpsenm) && flesh_petrifies(otmp.corpsenm)) {
            if (u && !u.uprops?.Stoned) {
                u.uprops = u.uprops || {};
                u.uprops.Stoned = 5;
                game._delayed_killer = `${corpse_mon_name(otmp.corpsenm)} egg`;
            }
        }
        break;
    case EUCALYPTUS_LEAF:
        // C: cures sickness and vomiting when not cursed.
        if (u && !otmp.cursed) {
            if (u.uprops?.Sick) u.uprops.Sick = 0;
            if (u.uprops?.Vomiting) u.uprops.Vomiting = 0;
        }
        break;
    case APPLE:
        // C ref: eat.c:2582 — Snow White: a cursed apple puts the hero to
        // sleep for rn1(11, 20) turns.  fprefx() deliberately printed nothing
        // for this case, and this arm was missing, so a cursed apple used to
        // be eaten in complete silence with no roll at all.
        if (otmp.cursed && !u?.uprops?.Sleep_resistance) {
            if (game.u?.uprops?.HDeaf || !game.flags?.acoustics)
                await update_topl('You fall asleep.');
            else
                await update_topl('You hear sinister laughter as you fall asleep...');
            const dur = -rn1(11, 20);
            const { fall_asleep } = await import('./zap.js');
            await fall_asleep(dur, true);
        }
        break;
    }
}

// C ref: attrib.c gainstr(otmp, incr, givemsg) — the lump of royal jelly's
// strength boost.  Only the non-cursed +1 path is reachable from eat.c.
function gainstr(otmp, incr) {
    const u = game.u;
    if (!u) return;
    let num = incr;
    if (!num) num = (rn2(4) ? 1 : rnd(6));       /* not reached from eat.c */
    adjattrib_str(otmp?.cursed ? -num : num);
}
function adjattrib_str(incr) {
    const u = game.u;
    if (!u?.acurr?.a) return;
    const A_STR = 0;
    const v = (u.acurr.a[A_STR] || 0) + incr;
    u.acurr.a[A_STR] = Math.max(3, Math.min(125, v));
}

const PM_MONK_EAT = 5, PM_CAVEMAN_EAT = 2;
function Role_if_MONK_eat() { return game.urole?.mnum === PM_MONK_EAT; }
// C ref: eat.c:51 CANNIBAL_ALLOWED() — Cavemen and orcs may eat their own kind
// (and domestic animals) without penalty.
function CANNIBAL_ALLOWED() {
    return game.urole?.mnum === PM_CAVEMAN_EAT || game.urace?.adj === 'orcish';
}

// C ref: eat.c violated_vegetarian() — a Monk who eats meat "feels guilty"
// (alignment penalty).  No RNG.
// Returns true if the guilty message should be shown (Monk only); the caller
// emits it so it can chain on the topline.
function violated_vegetarian() {
    const u = game.u;
    if (u) {
        u.uconduct = u.uconduct || {};
        u.uconduct.unvegetarian = (u.uconduct.unvegetarian || 0) + 1;
    }
    if (Role_if_MONK_eat()) {
        // C: You_feel("guilty.") + adjalign(-1).
        if (u?.ualign && typeof u.ualign.record === 'number') u.ualign.record -= 1;
        return true;
    }
    return false;
}

// C ref: mondata.h carnivorous(ptr)/herbivorous(ptr)/humanoid(ptr) applied to
// gy.youmonst.data, which for an unpolymorphed hero is the ROLE's player
// monster (mons[PM_ARCHEOLOGIST]...).  Verified against monsters.h: every
// role's player monster is M1_OMNIVORE and M1_HUMANOID except the Monk, whose
// player monster is M1_HERBIVORE only.  (u.umonnum in this port holds the ROLE
// number, not a permonst index, so the flag tables can't be read directly.)
function heroCarnivorous() { return !Role_if_MONK_eat(); }
function heroHerbivorous() { return true; }
function heroHumanoid() { return true; }

// C ref: mondata.h your_race(ptr) = (ptr->mflags2 & urace.selfmask).
const RACE_SELFMASK = {
    human: M2_HUMAN, elven: M2_ELF, dwarven: M2_DWARF,
    gnomish: M2_GNOME, orcish: M2_ORC,
};
function your_race(mnum) {
    const mask = RACE_SELFMASK[game.urace?.adj] || 0;
    const ptr = monster_by_pmidx(mnum);
    return !!ptr && (mflags2_of(ptr) & mask) !== 0;
}
// C ref: mondata.h type_is_pname(ptr) = mflags2 & M2_PNAME.
function type_is_pname(mnum) {
    const ptr = monster_by_pmidx(mnum);
    return !!ptr && (mflags2_of(ptr) & M2_PNAME) !== 0;
}
// C ref: mondata.h the_unique_pm(ptr) — a G_UNIQ species that isn't a pname.
function the_unique_pm(mnum) {
    const ptr = monster_by_pmidx(mnum);
    return !!ptr && ((ptr.geno || 0) & 0x1000 /* G_UNIQ */) !== 0
           && !type_is_pname(mnum);
}
// C ref: mondata.h flesh_petrifies(pm) — cockatrice, chickatrice or Medusa.
function flesh_petrifies(mnum) {
    const nm = corpse_mon_name(mnum);
    return nm === 'cockatrice' || nm === 'chickatrice' || nm === 'Medusa';
}
// C ref: mondata.h acidic(ptr)/poisonous(ptr) = mflags1 & M1_ACID/M1_POIS.
function mon_acidic(ptr) { return (mflags1_of(ptr) & M1_ACID) !== 0; }
function mon_poisonous(ptr) { return (mflags1_of(ptr) & M1_POIS) !== 0; }

// C ref: eat.c maybe_cannibal(pm, allowmsg) — eating your own race (or, for
// the domestic-animal caller, a pet species) costs Luck.  The rn1(4, 2) is
// drawn whenever the penalty applies, and once per move at most.
async function maybe_cannibal(pm, allowmsg) {
    if ((game.moves ?? 0) === game._ate_brains) return false;
    game._ate_brains = game.moves ?? 0;
    if (!CANNIBAL_ALLOWED() && your_race(pm)) {
        if (allowmsg) await update_topl('You cannibal!  You will regret this!');
        const u = game.u;
        if (u) {
            u.uprops = u.uprops || {};
            u.uprops.Aggravate_monster = 1;
        }
        change_luck(-rn1(4, 2));                 /* -5..-2 */
        return true;
    }
    return false;
}

// C ref: attrib.c change_luck(n).
function change_luck(n) {
    const u = game.u;
    if (!u) return;
    u.uluck = (u.uluck || 0) + n;
    const LUCKADD = 3, LUCKMAX = 10 * LUCKADD, LUCKMIN = -LUCKMAX;
    if (u.uluck < 0 && u.uluck < LUCKMIN) u.uluck = LUCKMIN;
    if (u.uluck > 0 && u.uluck > LUCKMAX) u.uluck = LUCKMAX;
}

// Species names of the domestic animals cprefx() penalizes.
const DOMESTIC_NAMES = new Set([
    'little dog', 'dog', 'large dog', 'kitten', 'housecat', 'large cat',
]);

// C ref: eat.c cprefx(pm) — run by start_eating() BEFORE the first bite of a
// corpse.  The cannibalism Luck roll used to be missing entirely.
async function cprefx(pm) {
    await maybe_cannibal(pm, true);
    const nm = corpse_mon_name(pm);
    if (flesh_petrifies(pm)) {
        // C: "You turn to stone." + done(STONING) unless Stone_resistance.
        game._stoning_death = true;
        return;
    }
    if (DOMESTIC_NAMES.has(nm)) {
        if (!CANNIBAL_ALLOWED()) {
            await update_topl(`You feel that eating the ${nm} was a bad idea.`);
            const u = game.u;
            if (u) { u.uprops = u.uprops || {}; u.uprops.Aggravate_monster = 1; }
        }
    } else if (nm === 'Death' || nm === 'Pestilence' || nm === 'Famine') {
        await update_topl('Eating that is instantly fatal.');
        game._rider_death = true;
    } else if (nm === 'green slime') {
        const u = game.u;
        if (u && !u.uprops?.Slimed) {
            await update_topl("You don't feel very well.");
            u.uprops = u.uprops || {};
            u.uprops.Slimed = 10;
        }
    }
    // C: PM_LIZARD (and any acidic corpse) calls fix_petrification() when the
    // hero is Stoned; the port has no Stoned timer to clear.
}

// C ref: eat.c:1103 eye_of_newt_buzz() — eating a magic-attack monster (or a
// newt) has a chance to give a small magical energy boost.  Rolls fire even
// when the boost is invisible (uen already at cap): the RNG stream must stay
// in lockstep with C regardless of whether the botl message ends up printed.
async function eye_of_newt_buzz() {
    const u = game.u;
    if (!u) return;
    if (rn2(3) || 3 * u.uen <= 2 * u.uenmax) {
        const old_uen = u.uen;
        u.uen += rnd(3);
        if (u.uen > u.uenmax) {
            if (!rn2(3)) {
                u.uenmax++;
                if (u.uenmax > u.uenpeak) u.uenpeak = u.uenmax;
            }
            u.uen = u.uenmax;
        }
        if (old_uen !== u.uen) {
            await update_topl('You feel a mild buzz.');
            game.botl = true;
        }
    }
}

// C ref: eat.c cpostfx(pm) — the corpse's after-effects.  Ported: the
// hallucination corpses, the magic-energy buzz (which used to be gated on the
// literal species name "newt" instead of C's attacktype(ptr, AT_MAGC) test),
// the wraith level gain and the nurse heal.
//
// DEFERRED (see the note at the end of this file): corpse_intrinsic()/givit(),
// which roll rn2(count) per conveyable intrinsic and then should_givit()'s
// rn2(chance).  They need mons[].mconveys, which this port's monster table
// does not carry (only mresists), and guessing from mresists would draw RNG
// that C does not.  Corpses that convey nothing (the overwhelming majority,
// including every corpse the covered sessions eat) draw nothing there.
async function cpostfx(pm) {
    const ptr = monster_by_pmidx(pm);
    const nm = ptr?.name || '';
    let check_intrinsics = false;

    switch (nm) {
    case 'wraith':
        // C: pluslvl(FALSE) — gain an experience level (newhp()/newpw() rolls).
        await pluslvl(false, update_topl);
        break;
    case 'nurse': {
        const u = game.u;
        if (u) { u.uhp = u.uhpmax; u.blinded = 0; game.botl = true; }
        check_intrinsics = true;
        break;
    }
    case 'stalker':
    case 'yellow light':
    case 'giant bat':
    case 'bat': {
        // C: make_stunned((HStun & TIMEOUT) + 30) — twice for yellow
        // light/giant bat/stalker (they fall through into the bat case).
        const u = game.u;
        if (u) {
            u.uprops = u.uprops || {};
            const inc = (nm === 'bat') ? 30 : 60;
            u.uprops.Stun = (u.uprops.Stun || 0) + inc;
        }
        break;
    }
    case 'quantum mechanic': {
        const u = game.u;
        await update_topl('Your velocity suddenly seems very uncertain!');
        if (u) {
            u.uprops = u.uprops || {};
            if (u.uprops.Fast) { u.uprops.Fast = 0; await update_topl('You seem slower.'); }
            else { u.uprops.Fast = 1; await update_topl('You seem faster.'); }
        }
        break;
    }
    case 'lizard': {
        const u = game.u;
        if (u?.uprops) {
            if ((u.uprops.Stun || 0) > 2) u.uprops.Stun = 2;
            if ((u.uprops.Confusion || 0) > 2) u.uprops.Confusion = 2;
        }
        check_intrinsics = true;
        break;
    }
    case 'Death': case 'Pestilence': case 'Famine':
        break;                 /* life-saved; no intrinsics */
    case 'mind flayer': case 'master mind flayer':
        // C: 1-in-2 chance of +1 Int when below the max, else "tasted bland".
        if (!rn2(2)) {
            await update_topl('Yum!  That was real brain food!');
            break;
        }
        check_intrinsics = true;
        break;
    default:
        check_intrinsics = true;
        break;
    }

    if (check_intrinsics && ptr) {
        // C: dmgtype(ptr, AD_STUN) || dmgtype(ptr, AD_HALU) || violet fungus.
        if (dmgtype(ptr, AD_STUN) || dmgtype(ptr, AD_HALU)
            || nm === 'violet fungus') {
            await update_topl('Oh wow!  Great stuff!');
            const u = game.u;
            if (u) {
                u.uprops = u.uprops || {};
                u.uprops.Hallucination = (u.uprops.Hallucination || 0) + 200;
                u.uhallu = true;
            }
        }
        // C: attacktype(ptr, AT_MAGC) || pm == PM_NEWT.
        if (attacktype(ptr, AT_MAGC) || nm === 'newt')
            await eye_of_newt_buzz();
        // corpse_intrinsic(ptr) + givit(): DEFERRED, see the comment above.
    }
}

// Species edibility predicates: use the real mondata.h vegan()/vegetarian()
// class tests (above) rather than a name list, so an unlisted species can't
// silently come out "meat".
function speciesVegan(mnum) { return vegan(monster_by_pmidx(mnum)); }
function speciesVegetarian(mnum) { return vegetarian(monster_by_pmidx(mnum)); }

// C ref: hack.c losehp() — subtract damage from u.uhp (no RNG); the death
// path is not modelled here.
function losehp_eat(n) {
    const u = game.u;
    if (!u) return;
    u.uhp -= n;
    if (u.uhp > u.uhpmax) u.uhpmax = u.uhp;
    if (u.uhp < 0) u.uhp = 0;
}

// C ref: eat.c rottenfood(obj) — "first bite" of rotten food.  Rolls, in
// order: a confusion chance, then (only if that missed) a blindness chance,
// then (only if that missed too) a pass-out chance.  Returns true if the hero
// passed out (aborting the rest of this meal).
async function rottenfood_eat(obj) {
    await update_topl(`Blecch!  ${obj && !is_rottable(obj) ? 'Awful' : 'Rotten'}`
                      + ` ${obj ? foodword(obj) : 'food'}!`);
    const u = game.u;
    const hallu = !!u?.uhallu;
    if (!rn2(4)) {                                          // eat.c:1817
        await update_topl(hallu ? 'You feel rather trippy.'
                                 : 'You feel rather light headed.');
        if (u) {
            if (!u.uprops) u.uprops = {};
            const newval = (u.uprops.Confusion || 0) + d(2, 4);   // eat.c:1822
            u.uprops.Confusion = newval;
            u.uconf = newval > 0;
        }
    } else if (!rn2(4) && !_vision.Blind()) {                // eat.c:1823
        await update_topl('Everything suddenly goes dark.');
        if (u) u.blinded = (u.blinded || 0) + d(2, 10);          // eat.c:1827
        if (!_vision.Blind()) await update_topl('Your vision quickly clears.');
    } else if (!rn2(3)) {                                    // eat.c:1830
        const dur = rnd(10);                                     // eat.c:1832
        const blind = _vision.Blind();
        const levitating = !!u?.uprops?.Levitation;
        // C ref: eat.c:1836 — a blind, levitating (or air/water level) hero
        // "loses control of yourself" instead of hitting the floor.
        const what = !blind ? 'goes' : levitating ? 'you lose control of'
                                                  : 'you slap against the';
        const where = !blind ? 'dark' : levitating ? 'yourself'
                     : (u?.usteed ? 'saddle' : 'floor');
        await update_topl(`The world spins and ${what} ${where}.`);
        // C ref: eat.c:1843-1847 — incr_itimeout(&HDeaf, duration) then
        // nomul(-duration) with afternmv = Hear_again.  Both matter for RNG:
        // while Deaf, dosounds() returns before its ambient rolls, and while
        // unconscious gethungry() draws its extra Unaware rn2(10).  Hear_again
        // then draws rn2(2) when the hero comes to.
        if (u) {
            if (!u.uprops) u.uprops = {};
            u.uprops.HDeaf = (u.uprops.HDeaf || 0) + dur;
        }
        if ((game.multi ?? 0) >= -dur) game.multi = -dur;        // nomul(-dur)
        game.multi_reason = 'unconscious from rotten food';
        game.nomovemsg = 'You are conscious again.';
        game.afternmv = Hear_again;
        return true; // eat.c:1848 — passed out; meal aborted
    }
    return false;
}

// C ref: eat.c eatcorpse(otmp) — a corpse has been selected as food.  Returns
// 0 (eat it), 1 (dont_start: the hero passed out on the first bite) or 2 (the
// corpse was used up on the spot and no meal happens).  Sets victual.reqtime
// and may reduce oeaten.
async function eatcorpse(otmp) {
    const u = game.u;
    const mnum = otmp.corpsenm;
    const sp = monster_by_pmidx(mnum);
    const v = game.context.victual;
    let retcode = 0, tp = 0, rotted = 0;
    const moves = game.moves || 1;
    const glob = !!otmp.globby;
    // C ref: eat.c:1861 — a corpse that will petrify or slime the hero skips
    // the "tainted" branch entirely (those effects are deadlier and come
    // first), so the rot damage cascade must know about them.
    const stoneable = flesh_petrifies(mnum);
    const slimeable = (corpse_mon_name(mnum) === 'green slime'
                       && !u?.uprops?.Slimed);

    // C ref: eatcorpse — conduct: !vegan -> unvegan++ (no RNG/msg here);
    // !vegetarian -> violated_vegetarian() (Monk "feel guilty").
    if (!speciesVegan(mnum) && u) {
        u.uconduct = u.uconduct || {};
        u.uconduct.unvegan = (u.uconduct.unvegan || 0) + 1;
    }
    if (!speciesVegetarian(mnum)) {
        if (violated_vegetarian()) await update_topl('You feel guilty.');
    }

    // C ref: eat.c:1884 if (!nonrotting_corpse(mnum)) { rotted = (moves - age)
    // / (10 + rn2(20)); cursed +2, blessed -2. }  Lizard/lichen/Rider/acid-blob
    // corpses never rot, so C skips this whole block (no rn2(20) roll).
    const nonrotting = nonrotting_corpse(mnum);
    const age = otmp.age ?? moves;
    if (!nonrotting) {
        rotted = Math.trunc((moves - age) / (10 + rn2(20)));   // eat.c:1887
        if (otmp.cursed) rotted += 2;
        else if (otmp.blessed) rotted -= 2;
    }

    // C ref: eat.c:1895-1943 — the tainted / acidic / poisonous / mildly-ill
    // cascade.  The tainted arm USES THE CORPSE UP and returns 2: no meal
    // happens at all, so the eating occupation (and every turn of monster
    // moves it would have run) never starts.
    if (!glob && !stoneable && !slimeable && rotted > 5) {
        const cannibal = await maybe_cannibal(mnum, false);
        const what = (sp?.mcls === S_FUNGUS_C) ? 'fungoid vegetation'
            : speciesVegetarian(mnum) ? 'protoplasm' : 'meat';
        await update_topl(`Ulch - that ${what} was tainted`
                          + `${cannibal ? ', you cannibal' : ''}!`);
        if (u?.uprops?.Sick_resistance) {
            await update_topl("It doesn't seem at all sickening, though...");
        } else {
            let sick_time = rn1(10, 10);                   // eat.c:1909
            const sick = u?.uprops?.Sick || 0;
            if (sick && sick_time > sick) sick_time = (sick > 1) ? sick - 1 : 1;
            if (u) { u.uprops = u.uprops || {}; u.uprops.Sick = sick_time; }
            await update_topl('(It must have died too long ago to be safe to eat.)');
        }
        if (carried(otmp)) _invent.useup(otmp);
        else _invent.useupf(otmp, 1);
        return 2;
    } else if (sp && mon_acidic(sp) && !u?.uprops?.Acid_resistance) {
        tp++;
        await update_topl('You have a very bad case of stomach acid.');
        losehp_eat(rnd(15));                           // eat.c:1926 acid losehp
    } else if (sp && mon_poisonous(sp) && rn2(5)) {
        tp++;
        await update_topl('Ecch - that must have been poisonous!');
        if (!u?.uprops?.Poison_resistance)
            poison_strdmg(rnd(4), rnd(15));            // eat.c:1932 poison dmg
        else
            await update_topl('You seem unaffected by the poison.');
    } else if ((rotted > 5 || (rotted > 3 && rn2(5)))
               && !u?.uprops?.Sick_resistance) {       // eat.c:1939
        tp++;
        await update_topl(`You feel ${u?.uprops?.Sick ? 'very ' : ''}sick.`);
        losehp_eat(rnd(8));                            // eat.c:1942 losehp(rnd(8))
    }

    // delay is weight dependent: reqtime = 3 + (cwt >> 6); a glob uses its own
    // weight instead of the species corpse weight.
    v.reqtime = 3 + ((glob ? (otmp.owt || 0) : mon_cwt_of(mnum)) >> 6);

    if (!tp && !nonrotting && (otmp.orotten || !rn2(7))) {   // eat.c:1949
        // C ref: eat.c:1950 if (rottenfood(otmp)) { orotten=TRUE; retcode=1; }
        if (await rottenfood_eat(otmp)) {
            otmp.orotten = true;
            otmp = touchfood(otmp);
            if (!otmp) return 1;
            v.piece = otmp;
            retcode = 1;
        }
        // C ref: eat.c:1959 — a corpse with no nutrition (wraith, ...) rots
        // away completely instead of being eaten.
        if (!mon_cnutrit(otmp.corpsenm)) {
            if (!retcode) await update_topl('The corpse rots away completely.');
            if (carried(otmp)) _invent.useup(otmp);
            else _invent.useupf(otmp, 1);
            retcode = 2;
        }
        // C ref: eat.c:1970 consume_oeaten(otmp, 2) — a rotted corpse loses
        // 3/4 of its nutrition (oeaten >>= 2).
        if (!retcode) consume_oeaten(otmp, 2);
    } else if ((corpse_mon_name(mnum) === 'cockatrice'
                || corpse_mon_name(mnum) === 'chickatrice')
               && (u?.uprops?.Stone_resistance || u?.uhallu)) {
        await update_topl('This tastes just like chicken!');
    } else if (tp) {
        /* a damage message was already delivered; no taste message, no RNG */
    } else {
        // the yummy/palatable taste message.
        const isVegan = speciesVegan(mnum), isVeggy = speciesVegetarian(mnum);
        const heroCarni = heroCarnivorous(), heroHerbi = heroHerbivorous();
        const yummy = isVegan ? (!heroCarni && heroHerbi)
                              : (heroCarni && !heroHerbi);
        // palatable: ((vegetarian?herbi:carni) && rn2(10) && ...).  For an
        // omnivore hero the first operand is TRUE, so rn2(10) is rolled; C's &&
        // short-circuits the (rotted<1 || !rn2(rotted+1)) tail when rn2(10)==0.
        const palatable = (isVeggy ? heroHerbi : heroCarni)
                          ? (!!rn2(10) && (rotted < 1 || !rn2(rotted + 1)))
                          : false;
        const palatable_msgs = ['Tokay', 'Istringy', 'Igamey', 'Ifatty', 'Itough'];
        const idx = isVeggy ? 0 : rn2(palatable_msgs.length);  // eat.c:1996
        const palat = palatable_msgs[idx];
        const hallu = !!u?.uhallu;
        const use_is = hallu || (palatable && palat[0] === 'I');
        const pmxnam = food_xname(otmp, false);
        const prefix = type_is_pname(mnum) ? ''
            : the_unique_pm(mnum) ? 'The ' : 'This ';
        const tasteWord = hallu
            ? (yummy ? 'gnarly' : palatable ? 'copacetic' : 'grody')
            : (yummy ? 'delicious' : palatable ? palat.slice(1) : 'terrible');
        const endCh = (yummy || !palatable) ? '!' : '.';
        // "This goblin corpse tastes terrible!"  update_topl combines with the
        // preceding "You feel guilty." and forces a --More-- on the long line.
        await update_topl(`${prefix}${pmxnam} ${use_is ? 'is' : 'tastes'} `
                          + `${tasteWord}${endCh}`);
    }

    return retcode;
}

// C ref: monst.c mons[].cwt — corpse weight (makemon.js mon_cwt(pmidx)).  The
// eating delay reqtime = 3 + (cwt >> 6) depends on it, so a stale fallback made
// every corpse take the goblin's 4-turn meal regardless of species.
function mon_cwt_of(mnum) {
    const c = mon_cwt(mnum);
    return (c != null) ? c : 100;   /* goblin cwt */
}

// C ref: eat.c Hear_again() — the afternmv callback run by unmul() when the hero
// wakes from fainting: a 1-in-2 chance that the deafness clears early.  The
// rn2(2) is drawn unconditionally, so it must fire even when it loses.
export function Hear_again() {
    if (!rn2(2)) {
        const u = game.u;
        if (u?.uprops) u.uprops.HDeaf = 0;   /* make_deaf(0L, FALSE) */
        game.botl = true;                    /* disp.botl = TRUE */
    }
    return 0;
}

// ---------------------------------------------------------------------------
// DEFERRED from eat.c (real behaviour, deliberately not ported here):
//   * start_tin()/opentin()/consume_tin()/costly_tin() — the whole multi-turn
//     tin-opening occupation, including its rn2 rolls and the tin's contents.
//     doeat() currently declines a tin.
//   * doeat_nonfood()/eataccessory()/eatspecial() — eating rings, wands, gems
//     and armor; needs a metallivorous or gelatinous-cube hero.
//   * edibility_prompts() — needs u.uedibility (the "sense of smell" boon).
//   * corpse_intrinsic()/givit()/should_givit()/temp_givit() — needs
//     mons[].mconveys, which makemon.js's table does not carry.
//   * cpostfx()'s polyself corpses (chameleon, doppelganger, genetic
//     engineer), the mimic "pile of gold" occupation, lycanthropy and
//     the displacer beast's d(6,6).
//   * eat_brains() (the mind flayer's tentacle attack).
// ---------------------------------------------------------------------------
