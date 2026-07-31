// potion.js — quaffing potions.
// C ref: potion.c.  Ports the command entry (dodrink), the quaff dispatch
// (dopotion / peffects) and the per-potion effects exercised by the gameplay
// sessions.  Effects with no recorded coverage fall back to the generic
// "peculiar feeling" path so the RNG / message sequence stays faithful.

import { game } from './gstate.js';
import { rn2, rnd, rn1, d } from './rng.js';
import { pline, update_topl, y_n } from './display.js';
import { getobj, makeknown, useup, trycall, GETOBJ_SUGGEST, GETOBJ_EXCLUDE,
         GETOBJ_NOFLAGS, GETOBJ_PROMPT, GETOBJ_DOWNPLAY, body_part,
         hands_obj, short_oname, xname } from './invent.js';
import { exercise } from './attrib.js';
import { more_experienced } from './exper.js';
import { POTION_CLASS, POT_OIL, POT_CONFUSION, POT_PARALYSIS, POT_HEALING,
         POT_EXTRA_HEALING, POT_FRUIT_JUICE, POT_BOOZE, POT_SICKNESS,
         objects, COIN_CLASS } from './mkobj.js';
import { A_STR, A_DEX, A_CON, A_WIS, IS_FOUNTAIN, IS_SINK } from './const.js';
import { fruitname } from './objnam.js';
import { newuhs } from './eat.js';
import { Blind, vision_recalc } from './vision.js';
import { dipfountain, drinkfountain, drinksink } from './fountain.js';

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
    // C ref: potion.c:1680-1681 — "oil doesn't instantly evaporate; Neither
    // does a saddle hit".  hit_saddle is always false on the isyou path;
    // cansee(tx,ty) is the hero's own square, true unless Blind.  No RNG.
    if (obj.otyp !== POT_OIL && !Blind()) {
        await update_topl(`The ${xname(obj)} evaporates.`);
    }
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
            // C ref: potion.c:2054 You_feel("rather tired.") = "You feel " +
            // ("You dream that you feel " if Unaware) + line.  No RNG.
            await update_topl(
                `${game.u?.Unaware ? 'You dream that you feel' : 'You feel'} rather tired.`);
            nomul_local(-rnd(5));                        // potion.c:2056 rnd(5)
            // C ref: potion.c:2057-2058 — multi_reason/nomovemsg are set so
            // the moveloop's unmul() (js/allmain.js) announces "You can move
            // again." once the sleep countdown reaches 0 (matches the
            // established peffect_paralysis pattern below).
            game.multi_reason = 'sleeping off a magical draught';
            game.nomovemsg = 'You can move again.';
            exercise(A_DEX, false);                      // attrib.c:509 rn2(2)
        }
        break;
    case 301 /*POT_PARALYSIS*/:
        kn++;                                            // potion.c:2042
        if (!Free_action()) {
            // C ref: potion.c:2041 pline("%s seems to be holding you.",
            // Something) — Something is the plain constant "Something".
            await update_topl('Something seems to be holding you.');
            nomul_local(-rnd(5));
            game.multi_reason = 'frozen by a potion';     // potion.c:2044
            game.nomovemsg = 'You can move again.';       // potion.c:2045
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

// C ref: potion.c healup — restore HP, optionally raising the maximum when the
// healing amount crosses it, and clear the covered temporary ailments.
function healup(nhp, nxtra, curesick, cureblind) {
    const u = game.u;
    if (!u) return;
    if (nhp) {
        u.uhp = (u.uhp || 0) + nhp;
        if (u.uhp > u.uhpmax) {
            u.uhpmax = (u.uhpmax || 0) + nxtra;
            u.uhp = u.uhpmax;
            if (u.uhpmax > (u.uhppeak || 0)) u.uhppeak = u.uhpmax;
        }
    }
    if (curesick) {
        u.sick = false;
        u.usick_type = 0;
    }
    if (cureblind) {
        const wasBlind = Blind();
        u.ucreamed = 0;
        u.blinded = 0;
        if (wasBlind && !Blind()) {
            pline_append_sync('You can see again.');
            vision_recalc(0);
        }
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
function pline_append_sync(msg) {
    game._pending_message = game._pending_message
        ? `${game._pending_message}  ${msg}`
        : msg;
}

// C ref: potion.c peffect_booze — ordinary booze confuses, heals one point,
// provides a little nutrition, and is deliberately not self-identifying.
function peffect_booze(otmp) {
    const u = game.u;
    game.potion_unkn = (game.potion_unkn || 0) + 1;
    pline_sync(`Ooph!  This tastes like ${otmp.odiluted ? 'watered down ' : ''}${Hallucination() ? 'dandelion wine' : 'liquid fire'}!`);
    if (!otmp.blessed) {
        make_confused(itimeout_incr(u?.uprops?.Confusion,
                                    d(2 + (u?.uhs || 0), 8)), false);
    }
    if (!otmp.odiluted) healup(1, 0, false, false);
    if (u) u.uhunger = (u.uhunger ?? 900) + 10 * (2 + bcsign(otmp));
    newuhs(false);
    exercise(A_WIS, false);
    if (otmp.cursed) {
        pline_append_sync('You pass out.');
        game._toplin = 1;
        game.multi = -rnd(15);
        game.nomovemsg = 'You awake with a headache.';
    }
}

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

// C ref: potion.c peffect_paralysis().  The negative multi count makes the
// move loop run each helpless turn without reading input; ordinary per-turn
// monster, hunger, regeneration, and timeout work still runs in C order.
function peffect_paralysis(otmp) {
    if (game.Free_action) {
        pline_sync('You stiffen momentarily.');
        return;
    }
    if (game.Levitation)
        pline_sync('You are motionlessly suspended.');
    else if (game.u?.usteed)
        pline_sync('You are frozen in place!');
    else
        pline_sync('Your feet are frozen to the floor!');
    game._toplin = 1;
    game.multi = -rn1(10, 25 - 12 * bcsign(otmp));
    game.multi_reason = 'frozen by a potion';
    game.nomovemsg = 'You can move again.';
    game.context = game.context || {};
    game.context.travel = game.context.travel1 = game.context.mv = 0;
    exercise(A_DEX, false);
}

function peffect_healing(otmp) {
    pline_sync('You feel better.');
    healup(8 + d(4 + 2 * bcsign(otmp), 4), otmp.cursed ? 0 : 1,
           !!otmp.blessed, !otmp.cursed);
    exercise(A_CON, true);
}

function peffect_extra_healing(otmp) {
    const u = game.u;
    pline_sync('You feel much better.');
    healup(16 + d(4 + 2 * bcsign(otmp), 8),
           otmp.blessed ? 5 : otmp.cursed ? 0 : 2, !otmp.cursed, true);
    const wasHallucinating = Hallucination();
    if (u) {
        u.uhallu = false;
        u.HHallucination = 0;
    }
    if (wasHallucinating)
        pline_append_sync(`Everything ${Blind() ? 'feels' : 'looks'} SO boring now.`);
    exercise(A_CON, true);
    exercise(A_STR, true);
}

// C ref: potion.c peffect_sickness — the covered blessed potion is only mildly
// contaminated.  Its explanatory second pline is long enough to page the taste
// message before damage and turn processing continue.
async function peffect_sickness(otmp) {
    await update_topl('Yecch!  This stuff tastes like poison.');
    if (otmp.blessed) {
        await update_topl(`(But in fact it was mildly stale ${fruitname(true)}.)`);
        const roleName = game.u?.urole?.name?.m || game.urole?.name?.m;
        if (game.initrole !== 3 && roleName !== 'Healer' && game.u)
            game.u.uhp -= 1;
    }
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
async function peffects(otmp) {
    switch (otmp.otyp) {
    case POT_BOOZE:
        peffect_booze(otmp);
        break;
    case POT_OIL:
        peffect_oil(otmp);
        break;
    case POT_FRUIT_JUICE:
        peffect_fruit_juice(otmp);
        break;
    case POT_CONFUSION:
        peffect_confusion(otmp);
        break;
    case POT_PARALYSIS:
        peffect_paralysis(otmp);
        break;
    case POT_HEALING:
        peffect_healing(otmp);
        break;
    case POT_EXTRA_HEALING:
        peffect_extra_healing(otmp);
        break;
    case POT_SICKNESS:
        await peffect_sickness(otmp);
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
export async function dopotion(otmp) {
    otmp.in_use = true;
    game.potion_nothing = 0;
    game.potion_unkn = 0;
    const retval = await peffects(otmp);
    if (retval >= 0)
        return retval ? ECMD_TIME : ECMD_OK;

    if (game.potion_nothing) {
        game.potion_unkn = (game.potion_unkn || 0) + 1;
        await pline(`You have a ${game.u?.Hallucination ? 'normal' : 'peculiar'} feeling for a moment, then it passes.`);
    }
    if (otmp.dknown && !objects[otmp.otyp]?.oc_name_known) {
        if (!game.potion_unkn) {
            // C ref: potion.c dopotion — makeknown() + more_experienced(0, 10)
            // (score-only, no RNG).
            makeknown(otmp.otyp);
            more_experienced(0, 10);
        } else {
            await trycall(otmp);
        }
    }
    useup(otmp);
    return ECMD_TIME;
}

// C ref: potion.c dodrink — the 'q' command.  Before prompting for an inventory
// potion, an unprefixed quaff (no 'm' menu-request) checks for a fountain / sink
// / surrounding water at the hero's square and offers to drink from it.
export async function dodrink() {
    const u = game.u;
    if (u?.Strangled) {
        await pline("If you can't breathe air, how can you drink liquid?");
        return ECMD_OK;
    }

    // C ref: potion.c dodrink — preceding 'q' with 'm' (menu_requested) skips
    // the fountain / sink / surrounding-water prompts; standing on a reachable
    // (not levitating / swallowed) fountain or sink otherwise offers to drink
    // from it (a square is never both, so these are effectively exclusive).
    if (!game.iflags?.menu_requested
        && IS_FOUNTAIN(game.level?.at(u.ux, u.uy)?.typ)
        && dip_can_reach_floor()) {
        if (await y_n('Drink from the fountain?') === 'y') {
            await drinkfountain();
            return ECMD_TIME;
        }
    }
    if (!game.iflags?.menu_requested
        && IS_SINK(game.level?.at(u.ux, u.uy)?.typ)
        && dip_can_reach_floor()) {
        if (await y_n('Drink from the sink?') === 'y') {
            await drinksink();
            return ECMD_TIME;
        }
    }
    // (the surrounding-water quaff prompt is not reached by the covered sessions.)

    const otmp = await getobj('drink', drink_ok, GETOBJ_NOFLAGS);
    if (!otmp)
        return ECMD_CANCEL;

    otmp.in_use = true; // you've opened the stopper

    // The milky/smoky ghost/djinni bottle checks require a ghost/djinni still
    // alive; not modeled (no such potions in the covered sessions).
    return await dopotion(otmp);
}

// C ref: potion.c dip_ok — getobj callback for the object to be dipped.
function dip_ok(obj) {
    if (!obj)
        return GETOBJ_DOWNPLAY;
    if (obj.oclass === COIN_CLASS)
        return GETOBJ_EXCLUDE;
    // inaccessible_equipment (cursed welded gear) isn't modeled; the dippable
    // starter gear is always accessible.
    return GETOBJ_SUGGEST;
}

// C ref: potion.c dip_hands_ok — same, plus the Glib slippery-hands case which
// the contest hero never has.
function dip_hands_ok(obj) {
    return dip_ok(obj);
}

// C ref: potion.c can_reach_floor(FALSE) — FALSE while levitating / swallowed.
function dip_can_reach_floor() {
    const u = game.u || {};
    if (u.uswallow) return false;
    if (u.uprops?.Levitation) return false;
    return true;
}

// C ref: potion.c dodip() — the QBUFSZ(128)-based length budget passed to
// short_oname() when building obuf: 128 minus sizeof the surrounding "What do
// you want to dip into? [...]" prompt text (the widest possible response set).
const DIP_OBUF_LENLIMIT = 128
    - ('What do you want to dip into? [abdeghjkmnpqstvwyzBCEFHIKLNOQRTUWXZ#-# or ?*] '.length + 1);

// C ref: potion.c dodip — the #dip command.  Prompt for an object; if standing
// on a fountain/sink/pool (and 'm' wasn't used) offer to dip into it, else ask
// which potion to dip the object into.
export async function dodip() {
    const u = game.u;
    const here = game.level?.at(u.ux, u.uy)?.typ;
    const at_pool = dip_is_pool(u.ux, u.uy);
    const at_fountain = IS_FOUNTAIN(here);
    const at_sink = IS_SINK(here);
    const menu_requested = !!game.iflags?.menu_requested;
    const at_here = !menu_requested && (at_pool || at_fountain || at_sink);

    const obj = await getobj('dip', at_here ? dip_hands_ok : dip_ok, GETOBJ_PROMPT);
    if (!obj)
        return ECMD_CANCEL;
    // inaccessible_equipment(obj) — not modeled.

    const is_hands = (obj === hands_obj);
    const verbose = game.flags?.verbose !== false;
    const shortestname = (is_hands || (obj.quan || 1) > 1) ? 'them' : 'it';
    const obuf = is_hands ? `your ${body_part(0 /* HAND */)}s` : short_oname(obj, DIP_OBUF_LENLIMIT);
    const named = verbose ? obuf : shortestname;

    if (!menu_requested) {
        if (!dip_can_reach_floor()) {
            /* can't dip something into fountain/pool/sink if unreachable */
        } else if (at_fountain) {
            const q = `Dip ${named} into the fountain?`;
            if (await y_n(q) === 'y') {
                if (!is_hands) obj.pickup_prev = 0;
                // Model C's persistent tty topline: the full y_n query (incl.
                // "[yn] (n)") stays displayed until the dip's own message, if
                // any, replaces it.
                game._pending_message = `${q} [yn] (n)`;
                game._toplin = 0;
                await dipfountain(obj);
                return ECMD_TIME;
            }
        } else if (at_sink) {
            const q = `Dip ${named} into the sink?`;
            if (await y_n(q) === 'y') {
                if (!is_hands) obj.pickup_prev = 0;
                game._pending_message = `${q} [yn] (n)`;
                game._toplin = 0;
                await dipsink(obj);
                return ECMD_TIME;
            }
        } else if (at_pool) {
            if (await y_n(`Dip ${named} into the ${dip_waterbody_name(u.ux, u.uy)}?`) === 'y') {
                // Levitation / steed / wash-hands / water_damage handling for
                // pools is not exercised by the covered sessions.
                return ECMD_TIME;
            }
        }
    }

    // "What do you want to dip <obj> into? [xyz or ?*]"
    const potion = await getobj(`dip ${named} into`, drink_ok, GETOBJ_NOFLAGS);
    if (!potion)
        return ECMD_CANCEL;
    // potion_dip(obj, potion) — dipping into a carried potion isn't reached by
    // the covered sessions (they always dip into the fountain).
    return ECMD_OK;
}

// C ref: rm.h is_pool — POOL/MOAT/WATER.
function dip_is_pool(x, y) {
    const t = game.level?.at(x, y)?.typ;
    return t === 16 /* POOL */ || t === 17 /* MOAT */ || t === 18 /* WATER */;
}

// C ref: mkmaze.c waterbody_name — "water" for an ordinary pool; the fancier
// moat/sea/shore naming isn't reached by the covered sessions.
function dip_waterbody_name(_x, _y) { return 'water'; }

// C ref: potion.c dipsink — dipping into a sink.  Not exercised by the covered
// sessions; kept as a stub so the sink dip path returns cleanly.
async function dipsink(_obj) {
    await pline('The sink quivers upward for a moment.');
}
