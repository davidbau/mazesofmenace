import { exercise } from './attrib.js';
import { A_CON } from './const.js';
// eat.js — nutrition.
// C ref: src/eat.c
//
// Only gethungry()'s once-per-turn draw is ported. 5.0 randomised the trigger:
// it used to be (moves % 20), and is now an explicit rn2(20), which is why a
// port that tracks the turn counter correctly still has to make the call.

import { game } from './gstate.js';
import { Race_if } from './u_init.js';
import { PMNAMES } from './monst_data.js';
import { done } from './end.js';
import { set_occupation } from './allmain.js';
import { rn2 } from './rng.js';
import { NOT_HUNGRY, ECMD_OK, ECMD_TIME, SATIATED, KILLED_BY, CHOKING, WEAK,
         HUNGRY, FAINTING,
         A_LAWFUL } from './const.js';
import { ONAMES } from './objects_data.js';
import { getobj, weight, useup, useupf } from './invent.js';
import { pline } from './display.js';
/* include/obj.h:332 carried() is a WHERE test, not list membership. */
import { carried } from './obj.js';

// src/eat.c:3170 gethungry()
export function gethungry() {
    const u = game.u;

    if (u.uinvulnerable)
        return;                       /* forced to fast while praying */

    /* src/eat.c:3191 — rn2(20) replaces the old (int) (svm.moves % 20L) */
    const accessorytime = rn2(20);

    if (accessorytime % 2) {
        /* regeneration and encumbrance burn food; neither is ported */
    } else {
        /* ring of hunger / slow digestion; not ported */
    }

    if (u.uhunger !== undefined)
        u.uhunger--;
}

// src/eat.c:126 init_uhunger() — the hero starts well fed.
//
// exerper() reads uhunger every tenth move to decide which attribute to
// exercise, and each branch spends a different draw: NOT_HUNGRY exercises
// Constitution with rn2(19), while SATIATED and FAINTING both decrement with
// rn2(2). Leaving uhunger unset made every comparison fall through to FAINTING
// and drew the wrong one.
export function init_uhunger() {
    game.u.uhunger = 900;
    game.u.uhs = NOT_HUNGRY;
}

// src/eat.c floorfood() — offer each edible thing at the hero's feet with a
// y/n prompt, then fall through to getobj() for something carried.
//
// Each floor prompt reads ONE key, so the total depends on what is underfoot:
// a bear trap, iron bars, gold and a food item each add one. That makes the
// count data-dependent, and our floor contents are known to differ from C's on
// some levels, so guessing it would misalign a session rather than fix it.
// Only the clean case is ported — nothing edible underfoot, straight to
// getobj — and anything else is recorded.
export async function floorfood(verb, corpsecheck) {
    const here = (game.level?.objects || [])
        .filter(o => o.ox === game.u.ux && o.oy === game.u.uy);
    const trap = (game.level?.traps || [])
        .find(t => t.tx === game.u.ux && t.ty === game.u.uy);

    if (trap || here.length) {
        note_unported_eat('floorfood:floor prompts');
        return null;
    }

    return await getobj(verb, null, 0);
}

// src/eat.c doeat() — the 'e' command.
//
// The eating itself needs the nutrition, corpse and tin code. What is ported is
// the object prompt, because a session that eats and does not have its
// inventory letter consumed runs that letter as a command instead.
export async function doeat() {
    const otmp = await floorfood('eat', 0);

    if (!otmp)
        return ECMD_OK;

    /* src/eat.c doeat() tail — the tin, corpse and conduct arms above this
       need their own subsystems; what is ported is the ordinary-food path,
       which is the one that reaches choke(). */
    if (otmp.otyp === ONAMES.TIN || otmp.otyp === ONAMES.CORPSE
        || otmp.globby) {
        note_unported_eat('doeat:tin_or_corpse');
        return ECMD_TIME;
    }

    const v = (game.context.victual ||= {});
    v.piece = otmp;
    v.o_id = otmp.o_id;
    v.usedtime = 0;
    v.reqtime = game.objects[otmp.otyp].oc_delay;

    /* nutrition units per round eating */
    if (v.reqtime === 0 || !otmp.oeaten)
        v.nmod = 0;
    else if (otmp.oeaten >= v.reqtime)
        v.nmod = -Math.trunc(otmp.oeaten / v.reqtime);
    else
        v.nmod = v.reqtime % otmp.oeaten;

    /* THE death condition: latched ONCE here from the hunger state at the
       moment the meal starts, not re-tested per bite. */
    v.canchoke = (game.u.uhs === SATIATED);

    start_eating(otmp, false);
    return ECMD_TIME;
}

// src/eat.c start_eating() — begin (or resume) a meal.
//
// bite() is called BEFORE usedtime is incremented, so a one-turn meal eaten
// while Satiated chokes on the very first call rather than after finishing.
export function start_eating(otmp, already_partly_eaten) {
    const v = game.context.victual;

    v.fullwarn = 0;
    v.doreset = 0;
    v.eating = 1;

    if (bite()) {
        /* survived choking, finish off food that's nearly done;
           need this to handle cockatrice eggs, fortune cookies, etc */
        if (++v.usedtime >= v.reqtime) {
            /* C brackets this call with a save/restore of gn.nomovemsg so
               that done_eating() does not issue one when the reason we got
               here is a vomit() from bite(). nomovemsg is not tracked, so the
               bracketing records; the call itself is real. */
            note_unported_eat('start_eating:nomovemsg_bracket');
            done_eating(false);
        }
        return;
    }

    if (++v.usedtime >= v.reqtime) {
        /* print "finish eating" message if they just resumed -dlc */
        done_eating((v.reqtime > 1 || already_partly_eaten) ? true : false);
        return;
    }

    set_occupation(eatfood, `eating ${otmp.oname ?? ''}`, 0);
}

function note_unported_eat(what) {
    (game.unported ||= new Set()).add(what);
}

// src/eat.c:245 choke() — the hero eats past Satiated and dies.
//
// This is seed0030's first death and the blocker for seven sessions. The
// guard is the SATIATED state, not the food: eating an ordinary meal chokes
// only when u.uhs is already SATIATED, and anything else returns immediately
// unless it is an amulet of strangulation.
//
// The rn2(20) is the only draw, and it is short-circuited by Breathless or
// Hunger, so a hero with either spends nothing here.
export async function choke(food) {
    /* only happens if you were satiated */
    if (game.u.uhs !== SATIATED) {
        if (!food || food.otyp !== ONAMES.AMULET_OF_STRANGULATION)
            return;
    } else {
        /* Role_if(PM_KNIGHT) && u.ualign.type == A_LAWFUL -> adjalign(-1),
           "gluttony is unchivalrous". Needs the hero's role and alignment
           record; it changes no draw. */
        note_unported_eat('choke:knight_adjalign');
    }

    exercise(A_CON, false);   /* src/eat.c:256 */

    /* Breathless and Hunger are intrinsics this port does not track, so the
       rn2(20) is always the deciding test here. */
    if (!rn2(20)) {
        if (food && food.otyp === ONAMES.AMULET_OF_STRANGULATION)
            return;                     /* "choke, but recover your composure" */
    }

    game.killer = { format: KILLED_BY, name: 'quick snack' };
    await pline('You choke over it.');
    await pline('You die...');
    await done(CHOKING);
}

// src/eat.c:3132 bite() — one turn of eating. Returns 1 if the hero choked and
// survived, 0 otherwise.
//
// The choke gate is the whole reason this function matters here:
//
//     if (victual.canchoke && u.uhunger >= 2000) { choke(piece); return 1; }
//
// so the death is a consequence of ACCUMULATED nutrition, not of the meal.
export function bite() {
    const v = game.context?.victual;
    if (!v)
        return 0;

    if (v.canchoke && game.u.uhunger >= 2000) {
        choke(v.piece);
        return 1;
    }
    if (v.doreset) {
        do_reset_eat();     /* src/eat.c:3142 -- ported at eat.js:307 */
        return 0;
    }
    /* src/eat.c bite() tail — force_save_hs makes lesshungry() treat this as
       eating even though the occupation check would not; see lesshungry. */
    game.force_save_hs = true;
    if (v.nmod < 0) {
        lesshungry(adj_victual_nutrition());
        consume_oeaten(v.piece, v.nmod);        /* -= -nmod */
    } else if (v.nmod > 0 && (v.usedtime % v.nmod)) {
        lesshungry(1);
        consume_oeaten(v.piece, -1);            /* -= 1 */
    }
    game.force_save_hs = false;
    recalc_wt();
    return 0;
}

// src/eat.c eatfood() — the occupation callback. Returns 1 while still busy,
// 0 when the meal is over (or was interrupted).
//
// usedtime is incremented BEFORE bite(), and the test is <= reqtime rather
// than < , so the last turn of a meal still takes a bite. Writing it as < , or
// biting before incrementing, drops that final bite -- and for a Satiated hero
// that final bite is the one that chokes.
export function eatfood() {
    const v = game.context.victual;
    let food = v?.piece;

    if (food && !carried(food) && !obj_here(food, game.u.ux, game.u.uy))
        food = null;
    if (!food) {
        /* maybe it was stolen? */
        do_reset_eat();
        return 0;
    }
    if (!v.eating)
        return 0;

    if (++v.usedtime <= v.reqtime) {
        if (bite())
            return 0;
        return 1;                       /* still busy */
    }
    done_eating(true);
    return 0;
}


// src/invent.c obj_here() — is this object on that square?
const obj_here = (o, x, y) => o.ox === x && o.oy === y;

// src/eat.c done_eating() — the meal finished normally.
//
// Order matters: go.occupation is cleared BEFORE newuhs(), with the C's own
// comment "do this early, so newuhs() knows we're done". newuhs recomputes the
// hunger state, and it reads whether an occupation is running.
export function done_eating(message) {
    const v = game.context.victual;
    const piece = v.piece;

    if (piece)
        piece.in_use = true;
    game.occupation = null;             /* early, so newuhs knows we're done */
    newuhs(false);

    if (message)
        note_unported_eat('done_eating:message');

    /* cpostfx (199 lines) and fpostfx (90) are the food's after-effects and
       need the corpse and food-effect tables; both stay recorded. */
    if (piece && (piece.otyp === ONAMES.CORPSE || piece.globby))
        note_unported_eat('done_eating:cpostfx');
    else if (piece)
        fpostfx(piece);

    /* the object leaves by one of two doors: useup() when carried, useupf()
       when it is lying on the floor (src/eat.c:568, :570). Both are ported;
       useupf's shop-billing arm records inside useupf itself. */
    if (piece) {
        if (carried(piece))
            useup(piece);
        else
            useupf(piece, 1);
    }

    game.context.victual = {};          /* zero_victual */
}

// src/eat.c do_reset_eat() — the meal was interrupted.
//
// canchoke is deliberately NOT cleared: the C comment says so outright, because
// resuming the same food has to remember whether the hero was Satiated when
// they STARTED it. Clearing it here would let a hero resume a meal that should
// still kill them.
export function do_reset_eat() {
    const v = game.context.victual;

    if (v?.piece) {
        v.o_id = 0;
        note_unported_eat('do_reset_eat:touchfood');
    }
    if (v) {
        v.fullwarn = 0;
        v.eating = 0;
        v.doreset = 0;
        /* canchoke intentionally left alone */
    }
}

// src/eat.c newuhs() — recompute the hunger status from u.uhunger.
//
// The state table is the part the choke death depends on:
//
//     h > 1000 -> SATIATED, > 150 -> NOT_HUNGRY, > 50 -> HUNGRY,
//     > 0 -> WEAK, else FAINTING
//
// Note SATIATED starts at 1001 but choke() needs u.uhunger >= 2000 as well,
// so there is a wide band where the hero is Satiated and eating is safe.
//
// save_hs/saved_hs exist so that passing WEAK -> HUNGRY -> NOT_HUNGRY during a
// single meal produces one message about the whole meal rather than one per
// bite; the C's comment block says the occupation test alone is not enough
// because start_eating calls bite() before setting the occupation.
let save_hs = 0, saved_hs = false;

export function newuhs(incr) {
    const h = game.u.uhunger;
    const newhs = (h > 1000) ? SATIATED
                : (h > 150)  ? NOT_HUNGRY
                : (h > 50)   ? HUNGRY
                : (h > 0)    ? WEAK
                             : FAINTING;

    /* mid-meal: remember the status we started at and report once at the end */
    if (game.occupation === eatfood || game.context?.victual?.eating) {
        if (!saved_hs) {
            save_hs = game.u.uhs;
            saved_hs = true;
        }
        game.u.uhs = newhs;
        return;
    }
    if (saved_hs) {
        saved_hs = false;
        /* the "you only feel hungry now" decision compares save_hs to newhs;
           the messages need pline plumbing this path does not have yet */
        note_unported_eat('newuhs:end_of_meal_message');
    }

    /* the FAINTING/FAINTED arms nomul() the hero and draw; WEAK's warnings and
       the Hallucination arm need their own state. */
    if (newhs >= WEAK && game.u.uhs < WEAK)
        note_unported_eat('newuhs:weak_or_fainting');

    game.u.uhs = newhs;
}

// src/eat.c maybe_finished_meal() — finish a meal that consume_oeaten has
// already exhausted, rather than reporting it as interrupted.
//
// stop_occupation calls this FIRST and only prints "You stop <occtxt>." when it
// returns FALSE, so omitting it both leaves the food half-eaten and prints a
// message C does not.
//
// `stopping` clears the occupation BEFORE eatfood() runs, which the C notes is
// "for do_reset_eat" -- eatfood checks the occupation, so leaving it set makes
// the meal look still-in-progress to its own callback.
export function maybe_finished_meal(stopping) {
    const v = game.context?.victual;

    if (game.occupation === eatfood && v && v.usedtime >= v.reqtime) {
        if (stopping)
            game.occupation = null;     /* for do_reset_eat */
        eatfood();                      /* calls done_eating to use the food up */
        return true;
    }
    return false;
}

// src/eat.c morehungry() — spend nutrition and re-evaluate the hunger state.
// newuhs() can draw through its fainting arm, so this is not bookkeeping.
export function morehungry(num) {
    game.u.uhunger -= num;
    newuhs(true);
}

// src/eat.c recalc_wt() — the piece being eaten gets lighter.
//
// Three lines of substance: owt is recomputed from weight() as the meal is
// consumed. C's impossible() on a missing piece is a programming-error
// report, not a game event, so it is recorded rather than made to throw.
export function recalc_wt() {
    const piece = game.context.victual?.piece;

    if (!piece) {
        note_unported_eat('recalc_wt:impossible');
        return;
    }
    piece.owt = weight(piece);
}

// src/eat.c adj_victual_nutrition() — race-adjusted nutrition for the two
// foods that care.
//
// Called ONLY when nmod is negative, which is why the first thing it does is
// negate it; C says so in a comment and asserts nut > 0.
//
// Elves get a quarter more from a lembas wafer and orcs a quarter less
// (800 -> 1000 or 600); dwarves get a sixth more from a cram ration
// (600 -> 700). The roundings differ -- (nut+2)/4 twice, (nut+3)/6 once --
// and are C's, not a uniform formula.
//
// maybe_polyd checks the POLYFORM first and the race second, so a
// polymorphed hero is judged by what it currently is. That is recorded;
// polyform is not modelled, so the race test alone decides here.
export function adj_victual_nutrition() {
    const otyp = game.context.victual.piece.otyp;
    /* only called when nmod is negative; convert to positive */
    let nut = -game.context.victual.nmod;

    if (otyp === ONAMES.LEMBAS_WAFER) {
        note_unported_eat('adj_victual_nutrition:maybe_polyd');
        if (Race_if(PMNAMES.PM_ELF))
            nut += Math.trunc((nut + 2) / 4);       /* 800 -> 1000 */
        else if (Race_if(PMNAMES.PM_ORC))
            nut -= Math.trunc((nut + 2) / 4);       /* 800 -> 600 */
    } else if (otyp === ONAMES.CRAM_RATION) {
        note_unported_eat('adj_victual_nutrition:maybe_polyd');
        if (Race_if(PMNAMES.PM_DWARF))
            nut += Math.trunc((nut + 3) / 6);       /* 600 -> 700 */
    }
    return Math.max(nut, 1);
}

// src/eat.c lesshungry() — add nutrition, then react to the new total.
//
// The two thresholds are 2000 (choke) and 1500 (the "hard time getting all
// of it down" warning), and the 1500 arm exists so that EVERY eating path
// warns before the 2000 one kills you -- C says so in a comment.
//
// iseating is (occupation == eatfood) || force_save_hs, and it decides which
// choke() argument is used and whether reset_eat() follows. The force_save_hs
// half is why recalc_wt's caller sets it around the nutrition update.
//
// newuhs(FALSE) runs unconditionally at the end: the hunger STATE is
// recomputed whether or not anything was said.
//
// reset_eat and paranoid_query are not ported and are recorded; the messages
// need nomovemsg/multi plumbing and are recorded too.
export function lesshungry(num) {
    /* see comments in newuhs() for discussion on force_save_hs */
    const iseating = (game.occupation === eatfood) || game.force_save_hs;

    game.u.uhunger += num;
    if (game.u.uhunger >= 2000) {
        if (!iseating || game.context.victual?.canchoke) {
            if (iseating) {
                choke(game.context.victual.piece);
                note_unported_eat('lesshungry:reset_eat');
            } else {
                choke(null);        /* opentin's tin is not modelled */
                /* no reset_eat() */
            }
        }
    } else {
        /* report when nearly full so all eating warns before choking */
        if (game.u.uhunger >= 1500 && !game.u.uprops?.HUNGER
            && (!game.context.victual?.eating
                || !game.context.victual?.fullwarn)) {
            note_unported_eat('lesshungry:hard_time_msg');
            if (!game.context.victual?.eating) {
                note_unported_eat('lesshungry:multi');
            } else {
                if (game.context.victual.canchoke
                    && (game.context.victual.reqtime
                        - game.context.victual.usedtime) > 1)
                    note_unported_eat('lesshungry:paranoid_query');
            }
        }
    }
    newuhs(false);
}

// src/eat.c consume_oeaten() — reduce a partly-eaten object's remaining food.
//
// A POSITIVE amt is a BIT SHIFT, not a subtraction: oeaten >>= amt halves the
// remainder amt times. A negative amt is the plain decrement, and because the
// value is already negative it is ADDED. Reading the sign as "how much to
// remove" and subtracting in both cases is wrong in the common case.
//
// THE CLAMP AT THE END IS THE POINT, and C spends fourteen lines explaining
// it: oeaten must never reach 0, because the object is not removed from
// inventory until the "you finish eating" message on the NEXT turn, and a
// zero oeaten reads as UNTOUCHED. That produced unexpected encumbrance
// messages at the end of a meal and full nutrition from an interrupted one.
// C also notes oeaten is unsigned there, so an over-subtraction wraps to a
// huge positive -- the reported cause of massively heavy food and unlimited
// satiation. Setting reqtime = usedtime is what actually ends the meal.
export function consume_oeaten(obj, amt) {
    if (amt > 0) {
        /* bit shift to divide the remaining amount of food */
        obj.oeaten >>= amt;
    } else {
        /* simple decrement; value is negative so we actually add it */
        if (obj.oeaten > -amt)
            obj.oeaten += amt;
        else
            obj.oeaten = 0;
    }

    /* mustn't let partly-eaten drop all the way to 0 or the item would be
       restored to untouched; set to no bites left */
    if (obj.oeaten === 0) {
        if (obj === game.context.victual?.piece)  /* true unless wishing */
            game.context.victual.reqtime = game.context.victual.usedtime;
        obj.oeaten = 1;         /* smallest possible positive value */
    }
}

// src/eat.c fpostfx() — a food's after-effects, dispatched on its otyp.
//
// Only seven foods have an arm; everything else -- food rations, tripe,
// cram, k-rations and the rest of what a hero actually eats -- matches no
// case and the switch does nothing. That is why this can be ported now: the
// common path is genuinely empty, not merely unimplemented.
//
// Each arm records under its own object name so the reach tool can rank
// them, rather than one lumped fpostfx entry hiding seven different gaps.
const FPOSTFX_ARMS = [
    'SPRIG_OF_WOLFSBANE', 'CARROT', 'FORTUNE_COOKIE', 'LUMP_OF_ROYAL_JELLY',
    'EGG', 'EUCALYPTUS_LEAF', 'APPLE',
];

export function fpostfx(otmp) {
    for (const name of FPOSTFX_ARMS) {
        if (otmp.otyp === ONAMES[name]) {
            (game.unported ||= new Set()).add(`fpostfx:${name}`);
            return;
        }
    }
    /* no arm for this food; C's switch falls through and does nothing */
}
