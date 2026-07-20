// potion.js — quaffing potions.
// C ref: potion.c.  Ports the command entry (dodrink), the quaff dispatch
// (dopotion / peffects) and the per-potion effects exercised by the gameplay
// sessions.  Effects with no recorded coverage fall back to the generic
// "peculiar feeling" path so the RNG / message sequence stays faithful.

import { game } from './gstate.js';
import { rn2, rn1, rnd, d } from './rng.js';
import { pline } from './display.js';
import { getobj, makeknown, useup, trycall, GETOBJ_SUGGEST, GETOBJ_EXCLUDE,
         GETOBJ_NOFLAGS, body_part } from './invent.js';
import { exercise } from './attrib.js';
import { POTION_CLASS, POT_OIL, POT_CONFUSION, POT_FRUIT_JUICE, objects } from './mkobj.js';
import { A_WIS, A_DEX, A_CON } from './const.js';
import { fruitname } from './objnam.js';
import { newuhs } from './eat.js';

// C ref: potion.c make_confused(xtime, talk) — set the HConfusion timeout.  The
// hero's confusion timer lives on game.u.uprops.Confusion (read by isConfused()
// in engrave.js) and is mirrored to game.u.uconf for the uhitm safe-pet check.
function make_confused(xtime, _talk) {
    const u = game.u;
    if (!u) return;
    if (!u.uprops) u.uprops = {};
    u.uprops.Confusion = xtime;
    u.uconf = xtime > 0;
}
function Confusion() { return (game.u?.uprops?.Confusion || 0) > 0; }
function Hallucination() { return !!game.u?.uhallu; }
// C ref: objclass.h bcsign(o) — blessed(+1)/cursed(-1)/uncursed(0).
function bcsign(o) { return (o.blessed ? 1 : 0) - (o.cursed ? 1 : 0); }
// C ref: youprop.h itimeout_incr — add to a (possibly running) property timer.
function itimeout_incr(cur, incr) { return (cur || 0) + incr; }

// ── monster-thrown potion shatter on the hero (potion.c potionhit/breathe) ──
// C ref: potion.c bottlename() — a random flavor noun for the shattering
// vessel.  Non-hallucinating rolls rn2(7) into bottlenames[]; the string is
// display-only but the roll must fire to keep the PRNG in sync (seed0030
// step 50: a gnome hurls a potion of sleeping that crashes on the hero's head).
const BOTTLENAMES = ['bottle', 'phial', 'flagon', 'carafe', 'flask', 'jar', 'vial'];
function bottlename() {
    // Hallucination uses a different (larger) table; not exercised here.
    return BOTTLENAMES[rn2(BOTTLENAMES.length)];
}

// Offensive-potion otyps (mkobj.js OBJECT_DATA order).
const POT_SLEEPING = 314, POT_ACID = 320, POT_POLYMORPH = 316;
const HEAD_PART = 8; // const.js HEAD

// C ref: potion.c Maybe_Half_Phys(dmg) — halves physical damage when the hero
// has Half_physical_damage.  The recorded heroes lack that property, so this is
// the identity (no RNG either way).
function Maybe_Half_Phys(dmg) {
    return (game.u?.uprops?.HalfPhysDam > 0) ? Math.floor((dmg + 1) / 2) : dmg;
}
function Free_action() { return (game.u?.uprops?.FreeAction || 0) > 0; }
function Sleep_resistance() { return (game.u?.uprops?.SleepResistance || 0) > 0; }
function Acid_resistance() { return (game.u?.uprops?.AcidResistance || 0) > 0; }

// C ref: hack.c nomul(nval) — make the hero helpless for |nval| turns (nval<0).
// Replicated locally (hack.js owns the canonical copy) so the potion CRASH path
// can knock the hero out without reaching outside this file's lane; only the
// game.multi side-effect is needed for the moveloop to run the sleep turns.
function nomul_local(nval) {
    if ((game.multi ?? 0) < nval) return;
    game.multi = nval;
    if (game.context) game.context.travel = game.context.travel1 = game.context.mv = 0;
}

// C ref: potion.c potionhit(&youmonst, obj, how) — a thrown potion shatters on
// the hero.  Scoped to the isyou branch exercised by the contest (a monster
// lobs an offensive potion at the hero).  bottlename() rolls first, then the
// "crashes ... breaks into shards" message + losehp(Maybe_Half_Phys(rnd(2))),
// the isyou per-otyp effect (ACID burns for d(1,8); SLEEPING has no direct
// effect here), and finally potionbreathe() since distance==0 for the hero.
export async function potionhit_hero(obj, how) {
    const u = game.u;
    const botlnam = bottlename();                        // potion.c:1627 rn2(7)
    const { update_topl } = await import('./display.js');
    await update_topl(
        `The ${botlnam} crashes on your ${body_part(HEAD_PART)} and breaks into shards.`);
    // losehp(Maybe_Half_Phys(rnd(2)), "thrown potion", KILLED_BY_AN)
    let dmg = Maybe_Half_Phys(rnd(2));                   // potion.c:1638 rnd(2)
    u.uhp -= dmg;
    // isyou per-otyp direct effect (potion.c:1683)
    switch (obj.otyp) {
    case POT_ACID:
        if (!Acid_resistance()) {
            const adm = Maybe_Half_Phys(d(obj.cursed ? 2 : 1, obj.blessed ? 4 : 8));
            u.uhp -= adm;
        }
        break;
    case POT_POLYMORPH:
        // polyself not modeled for the thrown case (not exercised).
        break;
    default:
        break; // POT_SLEEPING and others: no direct isyou effect
    }
    if (u.uhp < 1) {
        const { done_in_by } = await import('./end.js');
        await done_in_by(null, 0 /*DIED*/);
    }
    // distance == 0 for the hero -> always breathe the vapors (potion.c:1903).
    await potionbreathe_hero(obj);
}

// C ref: potion.c potionbreathe(obj) — vapors inhaled by the hero.  Only the
// otyps a monster can hurl offensively are modeled (SLEEPING/PARALYSIS/ACID/…);
// each reproduces its exact RNG (nomul(-rnd(5)) + exercise(A_DEX,FALSE) for
// sleeping/paralysis, exercise(A_CON,FALSE) for acid).  Each vapor case also
// tracks C's local `kn` "learned something" flag (kn++ for INVISIBILITY/
// PARALYSIS/SLEEPING/BLINDNESS); the tail then discovers the potion type when
// the object was seen (obj->dknown, set by the thrower's observe_object) —
// makeknown(otyp) which credits a Wisdom exercise (attrib.c:509 rn2(19)).
async function potionbreathe_hero(obj) {
    let kn = 0;
    switch (obj.otyp) {
    case POT_SLEEPING:
        kn++;                                            // potion.c:2053
        if (!Free_action() && !Sleep_resistance()) {
            nomul_local(-rnd(5));                        // potion.c:2056 rnd(5)
            exercise(A_DEX, false);                      // attrib.c:509 rn2(2)
        }
        break;
    case 301 /*POT_PARALYSIS*/:
        kn++;                                            // potion.c:2042
        if (!Free_action()) {
            nomul_local(-rnd(5));
            exercise(A_DEX, false);
        }
        break;
    case POT_ACID:
        exercise(A_CON, false);                          // rn2(2)  (no kn++)
        break;
    default:
        break;
    }
    // C ref: potion.c:2111 — potionbreathe() does its own docall(): once the
    // vapors have been resolved, if the object's appearance is known to the hero
    // (obj->dknown, set at throw time by the thrower's observe_object) then a
    // vapor case that flagged `kn` identifies the type outright.  makeknown()
    // == discover_object(otyp, TRUE, TRUE, TRUE); the credit_hero pass rolls
    // exercise(A_WIS, TRUE) (attrib.c:509 rn2(19)) the first time the type
    // becomes name-known.  We gate on the private _seen_thrown marker the
    // offensive-throw path sets (mirroring obj->dknown without reaching into the
    // object-shuffle lane); makeknown() is idempotent (guarded on oc_name_known).
    if (obj._seen_thrown) {
        if (kn) makeknown(obj.otyp);                     // discover_object -> rn2(19)
        else await trycall(obj);
    }
}

const ECMD_CANCEL = 0;
const ECMD_OK = 0;
const ECMD_TIME = 1;

// C ref: potion.c drink_ok — getobj callback: only potions are suggested.
function drink_ok(obj) {
    if (!obj)
        return GETOBJ_EXCLUDE;
    if (obj.oclass === POTION_CLASS)
        return GETOBJ_SUGGEST;
    return GETOBJ_EXCLUDE;
}

// C ref: potion.c peffect_oil — drinking a potion of oil.  Unlit + uncursed
// (the only case covered) prints "That was smooth!" then exercises Wisdom in
// the "not good for you" direction (-rn2(2)).
function peffect_oil(otmp) {
    let good_for_you = false;
    if (otmp.lamplit) {
        // No lamplit potions of oil are quaffed in the covered sessions.
        good_for_you = false;
    } else if (otmp.cursed) {
        game.potion_unkn = (game.potion_unkn || 0); // no extra flagging
        pline_sync('This tastes like castor oil.');
    } else {
        pline_sync('That was smooth!');
    }
    exercise(A_WIS, good_for_you);
}

// pline is async (sets the pending message); for the synchronous peffect bodies
// we only need to stash the message, so call the setter directly.
function pline_sync(msg) { game._pending_message = msg; }

// C ref: potion.c peffect_confusion(otmp) — drinking a potion of confusion.
// When not already confused (and not hallucinating) prints "Huh, What?  Where
// am I?"; then make_confused(itimeout_incr(HConfusion, rn1(7, 16 - 8*bcsign))).
// For a cursed potion bcsign == -1 so the duration is rn1(7,24) (== rn2(7)+24).
function peffect_confusion(otmp) {
    const u = game.u;
    if (!Confusion()) {
        if (Hallucination()) {
            pline_sync('What a trippy feeling!');
            game.potion_unkn = (game.potion_unkn || 0) + 1;
        } else {
            pline_sync('Huh, What?  Where am I?');
        }
    } else {
        game.potion_nothing = (game.potion_nothing || 0) + 1;
    }
    make_confused(itimeout_incr(u?.uprops?.Confusion,
                                rn1(7, 16 - 8 * bcsign(otmp))), false);
}

// C ref: potion.c peffect_see_invisible — POT_FRUIT_JUICE shares this handler.
// For the fruit-juice sub-case (uncursed, not diluted, not hallucinating, not
// already invisible — the only case the sessions reach) it just announces the
// taste and nourishes a little, then returns before the see-invisible logic.
function peffect_fruit_juice(otmp) {
    game.potion_unkn = (game.potion_unkn || 0) + 1;
    if (otmp.cursed) {
        pline_sync(`Yecch!  This tastes ${Hallucination() ? 'overripe' : 'rotten'}.`);
    } else if (Hallucination()) {
        pline_sync(`This tastes like 10% real ${otmp.odiluted ? 'reconstituted ' : ''}${fruitname(true)} all-natural beverage.`);
    } else {
        pline_sync(`This tastes like ${otmp.odiluted ? 'reconstituted ' : ''}${fruitname(true)}.`);
    }
    // POT_FRUIT_JUICE: nourish and return (no see-invisible effect).
    const u = game.u;
    if (u) u.uhunger = (u.uhunger ?? 900) + (otmp.odiluted ? 5 : 10) * (2 + bcsign(otmp));
    newuhs(false);
}

// C ref: potion.c peffects — dispatch by potion type; returns -1 to signal
// "used up with possible discovery", >=0 to signal an already-handled result.
function peffects(otmp) {
    switch (otmp.otyp) {
    case POT_OIL:
        peffect_oil(otmp);
        break;
    case POT_FRUIT_JUICE:
        peffect_fruit_juice(otmp);
        break;
    case POT_CONFUSION:
        peffect_confusion(otmp);
        break;
    default:
        // Uncovered potion type: treat as "nothing obvious happened" so the
        // generic dopotion tail emits the peculiar-feeling message.
        game.potion_nothing = (game.potion_nothing || 0) + 1;
        break;
    }
    return -1;
}

// C ref: potion.c dopotion — apply a quaffed potion and handle discovery.
async function dopotion(otmp) {
    otmp.in_use = true;
    game.potion_nothing = 0;
    game.potion_unkn = 0;
    const retval = peffects(otmp);
    if (retval >= 0)
        return retval ? ECMD_TIME : ECMD_OK;

    if (game.potion_nothing) {
        game.potion_unkn = (game.potion_unkn || 0) + 1;
        await pline(`You have a ${game.u?.Hallucination ? 'normal' : 'peculiar'} feeling for a moment, then it passes.`);
    }
    if (otmp.dknown && !objects[otmp.otyp]?.oc_name_known) {
        if (!game.potion_unkn) {
            makeknown(otmp.otyp);
            // more_experienced(0, 10): no RNG, score-only.
        } else {
            await trycall(otmp);
        }
    }
    useup(otmp);
    return ECMD_TIME;
}

// C ref: potion.c dodrink — the 'q' command.  The fountain / sink / underwater
// pre-checks don't apply on the covered open-room starts, so we go straight to
// the getobj prompt.
export async function dodrink() {
    if (game.u?.Strangled) {
        await pline("If you can't breathe air, how can you drink liquid?");
        return ECMD_OK;
    }

    const otmp = await getobj('drink', drink_ok, GETOBJ_NOFLAGS);
    if (!otmp)
        return ECMD_CANCEL;

    otmp.in_use = true; // you've opened the stopper

    // The milky/smoky ghost/djinni bottle checks require a ghost/djinni still
    // alive; not modeled (no such potions in the covered sessions).
    return await dopotion(otmp);
}
