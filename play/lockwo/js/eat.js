// eat.js - Eating / food code (and tin variety helpers used at object creation).
// C ref: nethack-c/upstream/src/eat.c

import { rn2, rnd, rn1 } from './rng.js';
import { monster_by_pmidx, mon_cwt, mon_cnutrit } from './makemon.js';
import { game } from './gstate.js';
import { pline, update_topl, y_n } from './display.js';
import { poison_strdmg } from './attrib.js';

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
const CRAM_RATION = 292, K_RATION = 294, C_RATION = 295; // mkobj.js rations

// C ref: mondata.c olfaction(mdat) — most monsters can smell; golems, eyes,
// jellies, puddings, blobs, vortices, elementals, fungi and lights cannot.
// Keyed by the makemon data record's monster-class letter (mlet / S_*).
function olfaction(mdat) {
    const mlet = mdat?.mlet;
    // defsym.h MONSYM indices (every one of these was wrong before).
    const S_GOLEM = 55, S_EYE = 5, S_JELLY = 10, S_PUDDING = 42, S_BLOB = 2,
        S_VORTEX = 22, S_ELEMENTAL = 31, S_FUNGUS = 32, S_LIGHT = 25;
    if (mlet === S_EYE || mlet === S_JELLY || mlet === S_PUDDING
        || mlet === S_BLOB || mlet === S_VORTEX || mlet === S_ELEMENTAL
        || mlet === S_FUNGUS || mlet === S_LIGHT || mlet === S_GOLEM)
        return false;
    if (/golem/.test(mdat?.name || '')) return false;
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
async function loadEatDeps() {
    if (!_invent) _invent = await import('./invent.js');
    if (!_mkobj) _mkobj = await import('./mkobj.js');
    if (!_engrave) _engrave = await import('./engrave.js');
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
    289: [1, 40],    // FORTUNE_COOKIE (objects.h: delay 1, nutrition 40)
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

// C ref: eat.c newuhs(incr) — recompute the hunger status (u.uhs) from
// u.uhunger and announce any status change.  Only the not-eating, NOT_HUNGRY
// path is exercised by the covered sessions (drinking fruit juice nudges
// hunger up while well-fed), where newhs == u.uhs and this is a pure no-op.
// The HUNGRY/WEAK transition messages are ported faithfully; the FAINTING /
// STARVED branches (which would need fainting occupation / done()) are not yet
// reached and are left out so we never diverge mid-port.
export function newuhs(incr) {
    const u = game.u;
    if (!u) return;
    const h = u.uhunger ?? 900;
    const newhs = (h > 1000) ? 0 /*SATIATED*/
        : (h > 150) ? 1 /*NOT_HUNGRY*/
        : (h > 50) ? 2 /*HUNGRY*/
        : (h > 0) ? 3 /*WEAK*/ : 4 /*FAINTING*/;
    if (newhs === (u.uhs ?? 1)) { u.uhs = newhs; return; }
    if (newhs === 2 /*HUNGRY*/ || newhs === 3 /*WEAK*/) {
        const word = newhs === 2
            ? (!incr ? 'only feel hungry now' : (h < 145) ? 'feel hungry' : 'are beginning to feel hungry')
            : (!incr ? 'are still' : (h < 45) ? 'feel' : 'are beginning to feel');
        if (newhs === 2) game._pending_message = `You ${word}.`;
        else game._pending_message = `You ${word} weak.`;
    }
    u.uhs = newhs;
}

// C ref: eat.c doeat() — the 'e' command (carried/floor food, no tins/corpses
// for the starter sessions).  Returns truthy when a game turn elapsed
// (ECMD_TIME), falsy when the command was a no-op / cancelled (ECMD_OK).
// C ref: eat.c floorfood("eat", 0) — for an ordinary (non-metallivorous) hero
// on reachable floor, scan the objects at the hero's spot and, for each
// non-coin edible one, ask "There is/are <obj> here; eat it/one? [ynq] (n)".
//   'y' -> return that object (eat it off the floor);
//   'q' -> return a CANCEL sentinel (abort the command);
//   'n' -> continue to the next floor object, then fall through to inventory.
// Returns { kind:'floor', obj } | { kind:'cancel' } | { kind:'invent' }.
async function floorfood_eat() {
    const u = game.u;
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
        // 'n': try the next floor object, then inventory.
    }
    return { kind: 'invent' };
}

export async function doeat() {
    await loadEatDeps();

    // C: floorfood("eat", 0) first — a heavy corpse (or any edible) at the
    // hero's spot is offered before the inventory getobj prompt.
    const ff = await floorfood_eat();
    if (ff.kind === 'cancel') return false;        // ECMD_OK (declined with 'q')
    if (ff.kind === 'floor') {
        const fobj = ff.obj;
        if (fobj.otyp === CORPSE && !fobj.globby)
            return await eatcorpse_cmd(fobj);
        // Non-corpse floor food (food ration, etc.) isn't exercised off the
        // floor by the owned sessions; fall through to the inventory path.
    }

    // floorfood declined / nothing edible on the floor -> getobj("eat", eat_ok).
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

    // C ref: eat.c doeat() -> fprefx(otmp) — the per-otyp "first bite" feedback
    // (present tense), issued once on the first bite (not on resume), before the
    // possibly-multi-turn meal completes.  RNG-free for the foods reached here.
    const nm = objName(piece);
    if (!already_partly_eaten) await fprefx(piece);

    if (reqtime <= 1 || finished) {
        // C ref: eat.c eatfood()/start_eating() -> done_eating(message), with
        // message = (reqtime > 1 || already_partly_eaten) (eat.c:2067).  A FRESH
        // single-turn food passes FALSE, so the "You finish eating" line is
        // suppressed — only fprefx()'s feedback shows (e.g. an apple prints just
        // "Delicious!  Must be a Macintosh!").
        if (reqtime > 1 || already_partly_eaten) {
            await pline(`You finish eating ${an(nm)}.`);
        }
        // done_eating() -> fpostfx(piece): per-otyp post-effects (the only
        // RNG-bearing one the owned sessions reach is the fortune cookie's
        // outrumor()).
        await fpostfx(piece);
        game.context.victual = { piece: null, o_id: 0 };
    }
    // else: multi-turn meal in progress — C sets the eatfood occupation and
    // prints no extra start-of-meal line (fprefx already gave the feedback).

    return true; // ECMD_TIME — a game turn elapses (per-turn block runs next)
}

// C ref: eat.c fprefx(otmp) — "first bite" feedback (present tense, eat.c:2099).
// Only the cases reachable by the scored sessions are ported; the rest fall
// through to give_feedback.  All RNG-free here.  The recorder is a MACOS build,
// so a non-cursed APPLE prints the Macintosh line (eat.c:2183) rather than the
// UNIX rnd(100) "core dumped" joke.
async function fprefx(otmp) {
    const Halluc = !!game.u?.uhallu;
    if (otmp.otyp === CLOVE_OF_GARLIC && !game.u?.uundead) {
        garlic_breath();
        /* FALLTHROUGH to give_feedback */
    } else if (otmp.otyp === APPLE && otmp.cursed /* && !Sleep_resistance */) {
        return; /* skip core joke; feedback deferred to fpostfx() (sleep) */
    } else if (otmp.otyp === APPLE) {
        await pline('Delicious!  Must be a Macintosh!');
        return;
    }
    // give_feedback: the generic per-food taste line (eat.c:2204).
    const ration = (otmp.otyp === CRAM_RATION || otmp.otyp === K_RATION
                    || otmp.otyp === C_RATION);
    const taste = otmp.cursed ? (Halluc ? 'grody!' : 'terrible!')
        : ration ? 'bland.'
        : (Halluc ? 'gnarly!' : 'delicious!');
    // C ref: pline() -> vpline -> update_topl: the give_feedback line pages via
    // the topline NEED_MORE state machine ("...is delicious!--More--") so the
    // following fortune-cookie readout fires its own --More-- frame.
    await update_topl(`This ${objName(otmp)} is ${taste}`);
}

// C ref: eat.c fpostfx(otmp) — post-consumption effects for non-corpse food.
// Only FORTUNE_COOKIE is RNG-bearing on the starter paths: it reads the
// fortune (outrumor -> getrumor draws + WIS exercise) and, when not blind,
// marks the literate conduct (no RNG).
async function fpostfx(otmp) {
    if (otmp.otyp === FORTUNE_COOKIE) {
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
        if (!game.u?.Blind) {
            game.u = game.u || {};
            game.u.uconduct = game.u.uconduct || {};
            game.u.uconduct.literate = (game.u.uconduct.literate || 0) + 1;
        }
    }
}

const PM_MONK_EAT = 5;
function Role_if_MONK_eat() { return game.urole?.mnum === PM_MONK_EAT; }

// C ref: eat.c violated_vegetarian() — a Monk who eats meat "feels guilty"
// (alignment penalty).  No RNG.
// Returns true if the guilty message should be shown (Monk only); the caller
// emits it so it can chain on the topline.
function violated_vegetarian() {
    if (Role_if_MONK_eat()) {
        // C: You_feel("guilty.") + adjalign(-1).  Alignment record tweak is not
        // score-bearing.
        const u = game.u;
        if (u?.ualign && typeof u.ualign.record === 'number') u.ualign.record -= 1;
        return true;
    }
    return false;
}

// Species edibility predicates (mondata.h).  Scoped to the early-game corpses.
const VEGAN_NAMES = new Set([ 'lichen', 'brown mold', 'yellow mold', 'green mold',
    'red mold', 'shrieker', 'violet fungus', 'green slime', 'gas spore' ]);
const VEGETARIAN_NAMES = new Set([ ...VEGAN_NAMES,
    /* puddings, blobs etc. are vegetarian-but-not-vegan; not reached here */ ]);
function speciesVegan(name) { return VEGAN_NAMES.has(name); }
function speciesVegetarian(name) { return VEGETARIAN_NAMES.has(name); }

// C ref: eat.c eatcorpse(otmp) — eat a (carried/floor) corpse.  Models the
// ordinary fresh-corpse case the starter sessions reach (goblin): the rot
// calc rn2(20), the rot-away gate rn2(7), and the final taste-message rn2(5).
// Tainted/acidic/poisonous/petrifying corpses (and the multi-bite resume) are
// only partially modeled; the common fresh-meat path is exact.
// C ref: hack.c losehp() — subtract damage from u.uhp (no RNG); the death
// path isn't reached by the corpse-eating sessions.
function losehp_eat(n) {
    const u = game.u;
    if (!u) return;
    u.uhp -= n;
    if (u.uhp > u.uhpmax) u.uhpmax = u.uhp;
    if (u.uhp < 0) u.uhp = 0;
}

// C ref: eat.c lesshungry(num) — raise u.uhunger by num and recompute the
// hunger state.  The choke path (u.uhunger >= 2000 while a canchoke victual is
// active) isn't reached by the covered sessions, so this is the plain
// "add nutrition then newuhs()" body.
function lesshungry_eat(num) {
    const u = game.u;
    if (!u) return;
    u.uhunger = (u.uhunger ?? 900) + num;
    newuhs(false);
}

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
        // C: violated_vegetarian() emits "You feel guilty." only for a Monk.
        if (violated_vegetarian()) await update_topl('You feel guilty.');
    }

    // C ref: eat.c:1884 if (!nonrotting_corpse(mnum)) { rotted = (moves - age)
    // / (10 + rn2(20)); cursed +2, blessed -2. }  Lizard/lichen/Rider/acid-blob
    // corpses never rot, so C skips this whole block (no rn2(20) roll).
    const nonrotting = nonrotting_corpse(mnum);
    let rotted = 0;
    const age = otmp.age ?? moves;
    if (!nonrotting) {
        rotted = Math.trunc((moves - age) / (10 + rn2(20)));   // eat.c:1887
        if (otmp.cursed) rotted += 2;
        else if (otmp.blessed) rotted -= 2;
    }

    // C ref: mondata.h acidic(ptr)/poisonous(ptr) = mflags1 & M1_ACID/M1_POIS.
    const acidic = !!sp?.acidic;
    const poisonous = !!sp?.poisonous;

    // C ref: eat.c:1895-1943 — the tainted / acidic / poisonous / mildly-ill
    // damage cascade.  The mildly-ill branch ("corpse left too long") is the one
    // the seed0002 gnome corpse hits: rotted in (3,5] with rn2(5) true -> "You
    // feel sick." + losehp(rnd(8)).  (Acid/poison/heavily-tainted branches are
    // modeled enough to keep the RNG stream honest if reached.)
    let tp = 0;
    if (rotted > 5) {
        // tainted: tp++ implicitly via early-return in C; "Ulch ... tainted!"
        // then (Sick_resistance false) rn1(10,10) sick_time + make_sick.
        tp++;
        await update_topl(`Ulch - that meat was tainted!`);
        rn1(10, 10);                                  // eat.c:1909 sick_time
        // make_sick has no RNG; the hero is now ill.  Corpse is used up below.
    } else if (acidic) {
        tp++;
        await update_topl('You have a very bad case of stomach acid.');
        losehp_eat(rnd(15));                           // eat.c:1926 acid losehp
    } else if (poisonous && rn2(5)) {
        tp++;
        await update_topl('Ecch - that must have been poisonous!');
        poison_strdmg(rnd(4), rnd(15));                // eat.c:1932 poison dmg
    } else if (rotted > 3 && rn2(5)) {                 // eat.c:1939
        tp++;
        await update_topl(`You feel ${game.u?.Sick ? 'very ' : ''}sick.`);
        losehp_eat(rnd(8));                            // eat.c:1942 losehp(rnd(8))
    }

    // reqtime = 3 + (cwt >> 6).  cwt for a goblin is 100 -> reqtime 4; a gnome
    // (cwt 650) -> reqtime 3 + 10 = 13.  This is the eating occupation length:
    // C runs start_eating() then the eatfood() occupation for reqtime turns,
    // each turn advancing the monster move loop (the bulk of step 53's RNG).
    const cwt = mon_cwt_of(mnum);
    let reqtime = 3 + (cwt >> 6);

    // C ref: eat.c obj_nutrition(CORPSE) — a fresh corpse's nutrition is
    // mons[mnum].cnutrit; touchfood() sets otmp->oeaten to it on first bite.
    // The per-turn lesshungry() delivery below drives the hero's uhunger (hence
    // the Satiated/Hungry status word).  Age-based rot reduction (>>=2) is
    // applied in the rot-away branch, mirroring consume_oeaten(otmp, 2).
    // A fresh corpse has oeaten==0/unset; C's obj_nutrition(CORPSE) yields
    // mons[mnum].cnutrit, which touchfood() stores into oeaten.  A partly-eaten
    // corpse keeps its remaining oeaten.
    let oeaten = otmp.oeaten ? otmp.oeaten : mon_cnutrit(mnum);

    // rot-away gate: if (!tp && !nonrotting_corpse(mnum) && (orotten || !rn2(7)))
    let usedUp = false;
    if (!tp && !nonrotting && (otmp.orotten || !rn2(7))) {   // eat.c:1949
        // rottenfood()/cnutrit==0 branches: for a fresh, nourishing goblin the
        // consume_oeaten path runs (no extra RNG).  Not the message branch.
        // C ref: eat.c:1970 consume_oeaten(otmp, 2) — a rotted corpse loses 3/4
        // of its nutrition (oeaten >>= 2).
        oeaten = oeaten >> 2;
    } else if (tp) {
        // C ref: eat.c:1976 — a damage message (sick/tainted/acid/poison) was
        // already delivered; skip the taste message and roll no taste RNG.
    } else {
        // the yummy/palatable taste message.
        const vegetarian = speciesVegetarian(spName);
        // C ref: eat.c uses carnivorous(gy.youmonst.data)/herbivorous(...).  A
        // non-polymorphed hero's data is the role's player-monster (mons[].
        // mflags1): every role player-monster is M1_OMNIVORE (carnivore AND
        // herbivore) EXCEPT the Monk, whose player-monster is M1_HERBIVORE only.
        // (Polymorph is not modeled by the covered sessions.)
        const PM_MONK = 5;
        const isMonk = (game.u?.umonnum === PM_MONK)
                       || (game.urole?.mnum === PM_MONK);
        const heroCarni = !isMonk, heroHerbi = true;
        const yummy = vegetarian ? (!heroCarni && heroHerbi)
                                 : (heroCarni && !heroHerbi);
        // palatable: ((vegetarian?herbi:carni) && rn2(10) && ...).  For an
        // omnivore hero the first operand is TRUE, so rn2(10) is rolled; C's &&
        // short-circuits the (rotted<1 || !rn2(rotted+1)) tail when rn2(10)==0.
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

    void usedUp;

    // C ref: eat.c start_eating(otmp, FALSE).  Sets up the multi-turn eating
    // occupation: usedtime starts at 1; bite() (no RNG for a corpse) runs; if
    // usedtime >= reqtime the meal is done immediately (only happens for
    // reqtime<=1, never for a corpse).  Otherwise set_occupation(eatfood) so the
    // moveloop runs the eatfood() occupation for the remaining reqtime-1 turns —
    // each turn advancing the monster move loop, which is where the bulk of this
    // command's RNG (and the pet's repeated dog_move) comes from.
    // C ref: eat.c doeat() nmod computation (eat.c:3068) — nutrition units per
    // round of eating.  For oeaten >= reqtime it's -floor(oeaten/reqtime) (the
    // negative "big bite" case bite() handles); otherwise reqtime % oeaten (the
    // positive "1 point on some turns" case).  Used by eatfood_step's bite().
    let nmod;
    if (reqtime === 0 || oeaten === 0) nmod = 0;
    else if (oeaten >= reqtime) nmod = -Math.trunc(oeaten / reqtime);
    else nmod = reqtime % oeaten;

    // C ref: eat.c start_eating() calls bite() once, synchronously, BEFORE
    // entering the eatfood() occupation loop — this is the meal's first bite,
    // delivered on the same turn eating starts (not deferred to the next
    // turn).  bite()'s nmod<0 branch is unconditional, so this first call
    // always delivers -nmod nutrition; the nmod>0 branch checks
    // usedtime%nmod with usedtime still 0 (the ++usedtime happens after
    // bite() returns), i.e. 0%nmod===0, so it's a no-op here and needs no
    // separate call.
    if (nmod < 0) {
        lesshungry_eat(-nmod);
        oeaten += nmod;
    }

    game.context = game.context || {};
    game.context.victual = {
        piece: otmp,
        o_id: otmp.o_id,
        usedtime: 1,
        reqtime,
        nmod,
        oeaten,
        eating: 1,
        canchoke: 0,
        fullwarn: 0,
        doreset: 0,
        // remember how the corpse was held so done_eating uses the right useup.
        on_floor: (otmp.where === 'floor' || otmp.where === 1),
        spName,
        mnum,
    };

    if (game.context.victual.usedtime >= reqtime) {
        // Single-turn finish (reqtime<=1, not reachable for a corpse): emit the
        // completion message and use the corpse up now.
        await done_eating_corpse(true);
        return true;
    }

    // Multi-turn occupation: the moveloop (allmain.js) will run eatfood_step()
    // each subsequent turn until the meal completes (and prints "finish eating").
    game._eat_occupation = true;
    return true; // ECMD_TIME
}

// C ref: eat.c eatfood() — the eating occupation step run once per turn while
// the meal is in progress.  ++usedtime; while usedtime <= reqtime the hero is
// still busy (return 1); once usedtime > reqtime the meal is done (return 0).
// bite() consumes no RNG for a corpse, so the only per-turn RNG is the monster
// move loop the caller (moveloop) runs after this step.  Returns true while the
// occupation should continue, false when finished.
export async function eatfood_step() {
    const v = game.context?.victual;
    if (!v || !v.piece) { game._eat_occupation = false; return false; }
    // C ref: eatfood() — if the food vanished (stolen / no longer here) reset.
    if (!v.eating) { game._eat_occupation = false; return false; }
    v.usedtime = (v.usedtime || 0) + 1;
    if (v.usedtime <= v.reqtime) {
        // C ref: eat.c bite() — per-turn nutrition delivery (no RNG for a
        // corpse).  nmod < 0: a "big bite" of -nmod units each turn; nmod > 0:
        // 1 unit on turns where usedtime % nmod != 0.  lesshungry() raises
        // u.uhunger, driving the hunger status word (Satiated/Hungry) shown on
        // the bottom line; consume_oeaten depletes the remaining nutrition.
        const nmod = v.nmod || 0;
        if (nmod < 0) {
            lesshungry_eat(-nmod);
            v.oeaten = (v.oeaten || 0) + nmod;      // oeaten -= -nmod
        } else if (nmod > 0 && (v.usedtime % nmod)) {
            lesshungry_eat(1);
            v.oeaten = (v.oeaten || 0) - 1;
        }
        return true; // still busy
    }
    // done
    await done_eating_corpse(v.reqtime > 1);
    game._eat_occupation = false;
    return false;
}

// C ref: eat.c done_eating(message) — finish the meal: print "You finish eating
// <corpse>." (when message), run cpostfx (RNG-inert for the plain corpses our
// sessions eat), then use up the corpse.  Clears the victual context.
async function done_eating_corpse(message) {
    await loadEatDeps();
    const v = game.context?.victual;
    if (!v || !v.piece) return;
    const otmp = v.piece;
    if (message)
        await update_topl(`You finish eating the ${v.spName} corpse.`);
    // cpostfx(corpsenm): special-corpse intrinsics / effects.  For the ordinary
    // corpses the contest sessions eat (gnome, etc.) this conveys nothing and
    // rolls no RNG, so it is a no-op here.  (If an intrinsic-bearing corpse is
    // ever eaten this is where givit()'s rolls would go.)
    // Remove the eaten corpse: useupf for a floor corpse (so the pet's dog_goal
    // fobj scan no longer sees it), useup/useupall for a carried one.
    if (v.on_floor)
        _invent.useupf(otmp, 1);
    else
        _invent.useupall(otmp);
    game.context.victual = { piece: null, o_id: 0 };
}

// C ref: monst.c mons[].cwt — corpse weight (makemon.js mon_cwt(pmidx)).  The
// eating delay reqtime = 3 + (cwt >> 6) depends on it, so a stale fallback made
// every corpse take the goblin's 4-turn meal regardless of species.
function mon_cwt_of(mnum) {
    const c = mon_cwt(mnum);
    return (c != null) ? c : monCwtFallback(mnum);
}
function monCwtFallback(_mnum) { return 100; } // goblin cwt
