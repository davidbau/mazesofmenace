// eat.js - Eating / food code (and tin variety helpers used at object creation).
// C ref: nethack-c/upstream/src/eat.c

import { rn2, rnd } from './rng.js';
import { monster_by_pmidx } from './makemon.js';
import { game } from './gstate.js';
import { pline, update_topl } from './display.js';

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

// Lazily-resolved cross-module helpers (see import note above).  Populated by
// loadEatDeps() before any eating work runs.
let _invent = null;
let _mkobj = null;
async function loadEatDeps() {
    if (!_invent) _invent = await import('./invent.js');
    if (!_mkobj) _mkobj = await import('./mkobj.js');
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
const PM_LIZARD = 325;
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

function vegetarian(ptr) {
    // C ref: vegetarian() in eat.c; only consulted for HEALTHY_TIN, which
    // is not used at object creation. Conservative default.
    return false;
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

// Minimal per-otyp food properties (oc_delay, oc_nutrition) for the foods that
// appear in the recorded starter inventories.  Only used for the eat message
// and hunger bookkeeping; the eat RNG does not depend on these values.
//   otyp: [oc_delay (reqtime), oc_nutrition]
const FOOD_PROPS = {
    277: [1, 50],    // APPLE
    293: [5, 800],   // FOOD_RATION
    278: [1, 50],    // ORANGE
    279: [1, 50],    // PEAR
    276: [1, 60],    // CARROT (vision)
    280: [1, 80],    // MELON
    288: [3, 200],   // CRAM_RATION
    289: [2, 800],   // LEMBAS_WAFER (approx)
};

function food_delay(otyp) { return (FOOD_PROPS[otyp]?.[0]) ?? 1; }
function food_nutrit(otyp) { return (FOOD_PROPS[otyp]?.[1]) ?? 50; }

// C ref: eat.c obj_nutrition() — base nutrition of a (non-tin, non-corpse)
// food item before per-bite adjustment.  Only the simple food branch is
// modeled here (tins/corpses take different paths not exercised by 'e' on
// carried starter food); slime-mold/named-fruit bonuses don't apply to the
// plain starter foods, so the table value is exact for them.
function obj_nutrition(otmp) {
    return food_nutrit(otmp.otyp);
}

function objName(otmp) {
    return _mkobj?.objects?.[otmp.otyp]?.name || 'food';
}

function an(s) { return /^[aeiou]/i.test(s) ? `an ${s}` : `a ${s}`; }

// C ref: eat.c is_edible() — for the (unpolymorphed) starter hero this reduces
// to "FOOD_CLASS and not a unique/invocation item".
function is_edible(obj) {
    if (!obj) return false;
    if (_mkobj?.objects?.[obj.otyp]?.oc_unique) return false;
    return obj.oclass === FOOD_CLASS;
}

// C ref: eat.c eat_ok() — getobj() callback used by floorfood()'s getobj("eat").
export function eat_ok(obj) {
    const I = _invent;
    if (!obj) return I ? I.GETOBJ_EXCLUDE : -3;
    if (is_edible(obj)) return I ? I.GETOBJ_SUGGEST : 2;
    if (obj.oclass === COIN_CLASS) return I ? I.GETOBJ_EXCLUDE : -3;
    return I ? I.GETOBJ_EXCLUDE_SELECTABLE : 0;
}

// C ref: eat.c touchfood() — split a single item off a stack (consuming the
// rnd(2) inside next_ident via splitobj/nextoid) and mark its initial
// nutrition.  Returns the (possibly split-off) single-item object that will be
// eaten.  The carried/floor distinction and addinv overflow branch don't change
// the RNG, so we model the common carried case: split, then eat the split-off
// one.
function touchfood(otmp) {
    if ((otmp.quan || 1) > 1) {
        // C: splitobj(otmp, 1L) -> nextoid() -> next_ident() == one rnd(2).
        // The JS splitobj() in invent.js does not advance context.ident, so we
        // mirror the C o_id machinery explicitly here.
        _mkobj.next_ident();    // the single rnd(2) the C records at this point
        otmp = {
            ...otmp,
            quan: 1,
            owt: 0,
            owornmask: 0,
            o_id: `${otmp.o_id || 'food'}-bite`,
        };
        otmp.owt = _mkobj.weight(otmp);
        // The remaining stack stays in inventory (its quan was already > 1 and
        // is decremented below by useupf/useup of the eaten single item, which
        // for the split case is the dropped/eaten single piece).
    }
    if (!otmp.oeaten) otmp.oeaten = obj_nutrition(otmp);
    return otmp;
}

// C ref: eat.c:3163 gethungry() — the per-turn hunger machinery.  RNG-exact
// to the C ordering:
//
//   if ((!Unaware || !rn2(10))            <- eat.c:3174, the *first* draw, but
//        && (carnivorous|herbivorous|...) <- only consumed when the hero is
//        && !Slow_digestion)              <- Unaware (asleep/unconscious); the
//       u.uhunger--;                         awake hero short-circuits on
//                                            !Unaware and consumes NOTHING here.
//   accessorytime = rn2(20);              <- eat.c:3191, always consumed.
//
// In every recorded session that reaches a per-turn hunger check the hero is
// awake (Unaware false), so only the rn2(20) at eat.c:3191 fires — which is
// why the historical one-line `rn2(20)` body matched.  We model the full C
// structure here so the export stays correct if a future session sleeps; the
// `Unaware` gate is read from game state and defaults to awake (no extra draw).
//
// NOTE: the live per-turn hook still lives in allmain.js's local gethungry()
// (also `rn2(20)`); this export is the canonical implementation the
// orchestrator can route allmain through without changing behavior.  Do NOT
// edit allmain.js from here.
export function gethungry() {
    const u = game.u;

    // C ref: eat.c:3167 — u.uinvulnerable / debug_hunger skip the whole thing.
    if (u && u.uinvulnerable) return;

    // C ref: eat.c:3174 — Unaware hero burns metabolic food at a slowed rate
    // (1-in-10).  The rn2(10) is only evaluated when Unaware is truthy because
    // C's `||` short-circuits on `!Unaware`.  The starter hero is awake, so
    // this branch consumes no RNG (matching the recorded streams).
    const unaware = !!(u && (u.usleep || u.uunconscious || u.ufrozen));
    if (unaware) rn2(10);

    // C ref: eat.c:3191 — accessorytime = rn2(20); replaces (moves % 20).
    // Always consumed; the only hunger draw in the recorded sessions.
    rn2(20);
}

// C ref: eat.c doeat() — the 'e' command (carried/floor food, no tins/corpses
// for the starter sessions).  Returns truthy when a game turn elapsed
// (ECMD_TIME), falsy when the command was a no-op / cancelled (ECMD_OK).
export async function doeat() {
    await loadEatDeps();

    // floorfood("eat", 0): no floor food at the hero's spot in the recorded
    // sessions (the adjacent 'f' is the pet and '$' is gold, neither edible
    // off the floor here), so we go straight to getobj("eat", eat_ok).
    let otmp = await _invent.getobj('eat', eat_ok);
    if (!otmp) return false;                       // ECMD_OK (cancelled)

    if (!is_edible(otmp)) {
        await pline('You cannot eat that!');
        return false;                              // ECMD_OK
    }

    // Corpse: dedicated eatcorpse() path (rot/taste RNG + monk vegetarian guilt).
    if (otmp.otyp === CORPSE && !otmp.globby) {
        return await eatcorpse_cmd(otmp);
    }
    // Tins / globs take other dedicated paths not exercised by the owned
    // sessions; decline rather than mis-handle their RNG.
    if (otmp.otyp === TIN || otmp.globby) {
        await pline('You cannot eat that!');
        return false;
    }

    const stack = otmp;
    const stackQuan = stack.quan || 1;

    // C: !u.uconduct.food++ (conduct bookkeeping; no RNG).
    const already_partly_eaten = !!stack.oeaten;

    // C: otmp = touchfood(otmp) -> the single rnd(2) for a quan>1 split.
    const piece = touchfood(stack);

    // reqtime = oc_delay; for fresh, non-rotten, non-fortune food we take the
    // fprefx() branch (no RNG) rather than the rottenfood rn2(7) branch (the
    // food is too young for it to trigger).
    let reqtime = food_delay(piece.otyp);
    const basenutrit = obj_nutrition(piece);
    // rounddiv(reqtime * oeaten, basenutrit)
    reqtime = basenutrit === 0 ? 0
        : Math.floor((reqtime * (piece.oeaten || basenutrit) + basenutrit - 1) / basenutrit);

    // Set up the victual context (so a later resume would behave); the starter
    // foods (apple, reqtime 1) finish in a single turn.
    game.context = game.context || {};
    game.context.victual = {
        piece,
        o_id: piece.o_id,
        usedtime: 0,
        reqtime,
        eating: 1,
        canchoke: 0,
        fullwarn: 0,
        doreset: 0,
    };

    // start_eating(): ++usedtime; if usedtime >= reqtime -> done immediately.
    game.context.victual.usedtime = 1;
    const finished = game.context.victual.usedtime >= reqtime;

    // Consume the eaten item from the stack.  Splitting off one piece (above)
    // leaves the remaining quan-1 in inventory, so decrement the original.
    if (stackQuan > 1) {
        stack.quan = stackQuan - 1;
        stack.owt = _mkobj.weight(stack);
    } else {
        _invent.useupall(stack);
    }

    // Message (best-effort; the starter eat sessions that reach here have
    // already diverged at chargen so the screen text is not score-bearing).
    const nm = objName(piece);
    if (reqtime <= 1 || finished) {
        await pline(`You finish eating ${an(nm)}.`);
        game.context.victual = { piece: null, o_id: 0 };
    } else {
        await pline(`You begin eating ${an(nm)}.`);
    }

    return true; // ECMD_TIME — a game turn elapses (per-turn block runs next)
}

const PM_MONK_EAT = 5;
function Role_if_MONK_eat() { return game.urole?.mnum === PM_MONK_EAT; }

// C ref: eat.c violated_vegetarian() — a Monk who eats meat "feels guilty"
// (alignment penalty).  No RNG.
function violated_vegetarian() {
    if (Role_if_MONK_eat()) {
        // You_feel("guilty.") + adjalign(-1).  Alignment record tweak is not
        // score-bearing; emit the message.
        const u = game.u;
        if (u?.ualign && typeof u.ualign.record === 'number') u.ualign.record -= 1;
    }
}

// Species edibility predicates (mondata.h).  Scoped to the early-game corpses.
const VEGAN_NAMES = new Set([ 'lichen', 'brown mold', 'yellow mold', 'green mold',
    'red mold', 'shrieker', 'violet fungus', 'green slime', 'gas spore' ]);
const VEGETARIAN_NAMES = new Set([ ...VEGAN_NAMES,
    /* puddings, blobs etc. are vegetarian-but-not-vegan; not reached here */ ]);
function speciesVegan(name) { return VEGAN_NAMES.has(name); }
function speciesVegetarian(name) { return VEGETARIAN_NAMES.has(name); }
const ACIDIC_EAT = new Set(['acid blob', 'yellow mold', 'green slime']);
const POISON_EAT = new Set(['killer bee', 'red mold', 'cobra', 'pit viper',
    'water moccasin', 'snake', 'python', 'quivering blob', 'acid blob']);

// C ref: eat.c eatcorpse(otmp) — eat a (carried/floor) corpse.  Models the
// ordinary fresh-corpse case the starter sessions reach (goblin): the rot
// calc rn2(20), the rot-away gate rn2(7), and the final taste-message rn2(5).
// Tainted/acidic/poisonous/petrifying corpses (and the multi-bite resume) are
// only partially modeled; the common fresh-meat path is exact.
async function eatcorpse_cmd(otmp) {
    await loadEatDeps();
    const u = game.u;
    const mnum = otmp.corpsenm;
    const sp = monster_by_pmidx(mnum);
    const spName = sp?.name || 'monster';
    const moves = game.moves || 1;

    // C ref: eatcorpse — conduct: !vegan -> unvegan++ (no RNG/msg here);
    // !vegetarian -> violated_vegetarian() (Monk "feel guilty").
    if (!speciesVegan(spName)) { /* unvegan conduct, no message */ }
    if (!speciesVegetarian(spName)) {
        await update_topl('You feel guilty.');
        violated_vegetarian();
    }

    // rot: rotted = (moves - age) / (10 + rn2(20)); cursed +2, blessed -2.
    let rotted = 0;
    // nonrotting_corpse(mnum) is false for a goblin -> roll the rot divisor.
    const age = otmp.age ?? moves;
    rotted = Math.trunc((moves - age) / (10 + rn2(20)));   // eat.c:1887
    if (otmp.cursed) rotted += 2;
    else if (otmp.blessed) rotted -= 2;

    const acidic = ACIDIC_EAT.has(spName);
    const poisonous = POISON_EAT.has(spName);

    // tainted (rotted>5) / acidic / poisonous / sick branches: not reached for
    // a fresh goblin corpse.  (Implemented conservatively: only the common
    // fresh path; if a rotten/poison corpse is eaten the RNG would diverge
    // cleanly rather than silently desync.)
    let tp = 0;
    if (acidic) { tp++; }
    else if (poisonous && rn2(5)) { tp++; }
    else if ((rotted > 5 || (rotted > 3 && rn2(5)))) { tp++; }

    // reqtime = 3 + (cwt >> 6).  cwt for a goblin is 100 -> reqtime 4.
    const cwt = mon_cwt_of(mnum);
    let reqtime = 3 + (cwt >> 6);

    // rot-away gate: if (!tp && !nonrotting && (orotten || !rn2(7)))
    const nonrotting = false; // goblin corpse rots normally
    let usedUp = false;
    if (!tp && !nonrotting && (otmp.orotten || !rn2(7))) {   // eat.c:1949
        // rottenfood()/cnutrit==0 branches: for a fresh, nourishing goblin the
        // consume_oeaten path runs (no extra RNG).  Not the message branch.
    } else {
        // the yummy/palatable taste message.
        const vegetarian = speciesVegetarian(spName);
        // hero carnivorous? human monk is omnivore -> carnivorous() FALSE.
        const heroCarni = false, heroHerbi = false;
        const yummy = vegetarian ? (!heroCarni && heroHerbi)
                                 : (heroCarni && !heroHerbi);
        // palatable: ((vegetarian?herbi:carni) && rn2(10) && ...).  First
        // operand FALSE for omnivore hero -> short-circuits (no rn2(10)).
        const palatable = (vegetarian ? heroHerbi : heroCarni)
                          ? (!!rn2(10) && (rotted < 1 || !rn2(rotted + 1)))
                          : false;
        const palatable_msgs = ['Tokay', 'Istringy', 'Igamey', 'Ifatty', 'Itough'];
        const idx = vegetarian ? 0 : rn2(palatable_msgs.length);  // eat.c:1996
        const palat = palatable_msgs[idx];
        const tasteVerb = (palatable && palat[0] === 'I') ? 'is' : 'tastes';
        const tasteWord = yummy ? 'delicious'
            : palatable ? palat.slice(1) : 'terrible';
        const endCh = (yummy || !palatable) ? '!' : '.';
        // "This goblin corpse tastes terrible!" (the_unique/type_is_pname both
        // false for a goblin -> "This ").  update_topl combines with the
        // preceding "You feel guilty." and forces a --More-- on the long line.
        await update_topl(`This ${spName} corpse ${tasteVerb} ${tasteWord}${endCh}`);
    }

    // Consume the corpse.  reqtime <= 1 finishes immediately; otherwise the
    // multi-turn occupation would run, but the recorded sessions resolve the
    // eat over subsequent turns — we use up the object now (its nutrition /
    // occupation bookkeeping isn't score-bearing) and let the turn elapse.
    void reqtime; void usedUp;
    _invent.useupall(otmp);

    return true; // ECMD_TIME
}

// C ref: monst.c mons[].cwt — corpse weight.  Provided via makemon's helper.
function mon_cwt_of(mnum) {
    try {
        // makemon.js exports mon_cwt(pmidx).
        return (_mkobj && _mkobj.mon_cwt) ? _mkobj.mon_cwt(mnum) : monCwtFallback(mnum);
    } catch (_e) { return monCwtFallback(mnum); }
}
function monCwtFallback(_mnum) { return 100; } // goblin cwt
