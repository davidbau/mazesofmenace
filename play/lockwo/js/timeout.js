// timeout.js — per-turn timed-property countdown.
// C ref: timeout.c nh_timeout() — decrements the hero's timed intrinsics each
// turn and fires their expiry effect when the timeout reaches 0.  C keeps every
// timer in the u.uprops[] array and walks it with
//
//     for (upp = u.uprops; upp < u.uprops + SIZE(u.uprops); upp++)
//         if ((upp->intrinsic & TIMEOUT) && !(--upp->intrinsic & TIMEOUT)) {
//             switch (upp - u.uprops) { ... }
//         }
//
// i.e. every RUNNING timer ticks down by one and the property's expiry case
// runs on the turn it reaches zero.  This port keeps the same timers as plain
// integers (game.u.uprops.Confusion, game.u.blinded, ...), so the loop below is
// a table over those fields; C's array order only matters when two expire on
// the same turn and both talk.
//
// Consumes NO RNG: none of the modelled expiry cases (CONFUSION / STUNNED /
// BLINDED / WOUNDED_LEGS / HALLUC) draws.  The cases that DO draw — SICK's
// rn2(100) recovery check, SLEEPY's rnd(20) fall_asleep, STONED/SLIMED's
// done_timeout() death — need properties nothing in this port ever sets, so
// they are deliberately absent rather than guessed at.

import { game } from './gstate.js';
import { rn2, rnd, d } from './rng.js';
import { heal_legs } from './trap.js';
import { exercise } from './attrib.js';
import { A_CON } from './const.js';
import { nomul, stop_occupation } from './hack.js';
import { run_object_timers } from './mkobj.js';
import { update_topl } from './display.js';
import { Unaware } from './const.js';
import { youHaveFast, youHaveVeryFast } from './allmain.js';

// C ref: youprop.h Hallucination — the expiry messages swap in hallucinating
// variants.
function Hallucination() {
    return ((game.u?.uprops?.Hallucination || 0) > 0);
}

// C ref: potion.c make_confused(0L, TRUE) —
// You_feel("less %s now.", Hallucination ? "trippy" : "confused").
async function expire_confusion() {
    const u = game.u;
    u.uprops.Confusion = 0;
    u.uconf = false;
    await update_topl(`You feel less ${Hallucination() ? 'trippy' : 'confused'} now.`);
}

// C ref: potion.c make_stunned(0L, TRUE) —
// You_feel("%s now.", Hallucination ? "less wobbly" : "a bit steadier").
async function expire_stun() {
    const u = game.u;
    u.uprops.Stun = 0;
    u.Stunned = false;
    await update_topl(`You feel ${Hallucination() ? 'less wobbly' : 'a bit steadier'} now.`);
}

// C ref: potion.c make_blinded(0L, TRUE) — regaining sight prints
// Your1(vision_clears) ("Your vision clears.") for an ordinary eyed hero whose
// blindness simply ran out.  The Blindfolded and eyeless variants need a worn
// blindfold / a polymorph form this port's blindness sources never combine
// with.
async function expire_blinded() {
    const u = game.u;
    u.blinded = 0;
    await update_topl('Your vision clears.');
}

// C ref: potion.c make_hallucinated(0L, TRUE, 0L) — the display refresh and
// its "Everything looks SO boring now." line need hallucination to have been
// drawing something; no covered session sets the timer, so only the counter is
// modelled.
function expire_hallucination() {
    game.u.uprops.Hallucination = 0;
}

// C ref: timeout.c:1222 slip_or_trip() — the fumble feedback.  Only the on-foot,
// non-ice arms are reachable for the covered heroes (no steed, no ice level, no
// FROMOUTSIDE fumbling source).
//
// SCOPE: the object-on-my-square arm ("You trip over <obj>.") needs
// iflags.last_msg == PLNMSG_ONE_ITEM_HERE to choose between the pronoun and the
// full doname(); we use doname() unconditionally, and skip the corpse
// petrification check (no covered hero walks barefoot over a cockatrice).
async function slip_or_trip() {
    const u = game.u;
    const { vobj_at } = await import('./display.js');
    const otmp = vobj_at(u.ux, u.uy);
    if (otmp) {
        const { doname_invent } = await import('./invent.js');
        await update_topl(`You trip over ${doname_invent(otmp)}.`);
        return;
    }
    switch (rn2(4)) {
    case 1:
        await update_topl(`You trip over your own ${Hallucination() ? 'elbow' : 'feet'}.`);
        break;
    case 2:
        await update_topl(`You slip ${Hallucination() ? 'on a banana peel' : 'and nearly fall'}.`);
        break;
    case 3:
        await update_topl('You flounder.');
        break;
    default:
        await update_topl('You stumble.');
        break;
    }
}

// C ref: timeout.c:902 case FUMBLING — fires slip_or_trip() when the countdown
// reaches 0 and then RE-ARMS with another rnd(20) for as long as the hero is
// still Fumbling (worn fumble boots / gauntlets).  Unlike every other timer here
// it is a repeating one, so the rnd(20) has to be re-drawn every cycle.
async function expire_fumbling() {
    const u = game.u;
    // C: `if (u.umoved && !(Levitation || Flying))` — an airborne hero skips
    // slip_or_trip() and so skips its rn2(4).
    if (u.umoved && !(u.uprops?.Levitation || u.uprops?.Flying)) {
        await slip_or_trip();
        // C: nomul(-2); gm.multi_reason = "fumbling"; gn.nomovemsg = "";
        game.multi = -2;
        game.multi_reason = 'fumbling';
        game.nomovemsg = '';
        // SCOPE: the inv_weight() > -WT_NOISY_INV "You make a lot of noise!" +
        // wake_nearby() branch needs the noisy-inventory threshold; the covered
        // hero's pack stays well under it.
    }
    // HFumbling &= ~FROMOUTSIDE (ice); then re-arm while still Fumbling.
    u.HFumblingOutside = 0;
    if (u.HFumbling || u.EFumbling) u.HFumbling = (u.HFumbling || 0) + rnd(20);
}

// C ref: timeout.c vomiting_dialogue() — the Vomiting countdown's staged
// messages.  Runs BEFORE the uprops[] decrement loop, so it reads (Vomiting-1).
const VOMITING_TEXTS = [
    'are feeling mildly nauseated.',
    'feel slightly confused.',
    "can't seem to think straight.",
    'feel incredibly sick.',
    'are about to vomit.',
];
function _conf() { return (game.u?.uprops?.Confusion || 0); }
function _stun() { return (game.u?.uprops?.Stun || 0); }
function _make_confused(x) { const u = game.u; u.uprops.Confusion = x; u.uconf = x > 0; }
function _make_stunned(x) { const u = game.u; u.uprops.Stun = x; u.Stunned = x > 0; }

async function vomiting_dialogue() {
    const u = game.u;
    const v = (u.uprops.Vomiting || 0);
    let txt = null;
    switch (v - 1) {
    case 14:
        txt = VOMITING_TEXTS[0];
        break;
    case 11:
        txt = VOMITING_TEXTS[1];
        if (_conf() > 0) txt = 'feel slightly more confused.';
        break;
    case 6:
        _make_stunned(_stun() + d(2, 4));
        await stop_occupation();
        /* FALLTHROUGH */
    case 9:
        _make_confused(_conf() + d(2, 4));
        if ((game.multi || 0) > 0) nomul(0);
        break;
    case 8:
        txt = VOMITING_TEXTS[2];
        if (_stun() > 0) txt = "can't think straight.";
        break;
    case 5:
        txt = VOMITING_TEXTS[3];
        break;
    case 2:
        txt = VOMITING_TEXTS[4];
        break;
    case 0:
        await stop_occupation();
        u.uhunger = (u.uhunger || 0) - 20;
        await update_topl('You vomit!');
        u.uprops.Vomiting = 0;
        nomul(-2);
        game.multi_reason = 'vomiting';
        game.nomovemsg = 'You can move again.';
        break;
    default:
        break;
    }
    if (txt) await update_topl('You ' + txt);
    exercise(A_CON, false);
}

// The u.uprops[] timers this port materialises.  `get`/`set` read and write
// whichever field the rest of the port already uses for that property.
// NOTE: this list is NOT in prop.h numeric order (CONFUSION 14 before STUNNED
// 13, WOUNDED_LEGS 26 before HALLUC 23 / DEAF 16) — the order is only
// observable when two timers expire on the same turn and both print, so the
// pre-existing entries are left where they are.  FUMBLING (prop.h 25) is placed
// after DEAF and before FAST (64), which is the position with the fewest
// remaining inversions.
const TIMED_PROPS = [
    // prop.h INVULNERABLE = 11, ahead of every other entry here.  Only
    // #wizintrinsic gives it a timeout, and timeout.c has no case for it, so it
    // expires silently.
    { name: 'INVULNERABLE',
      get: (u) => u.uprops?.Invulnerable || 0,
      set: (u, v) => { u.uprops.Invulnerable = v; },
      expire: async () => {} },
    { name: 'CONFUSION',
      get: (u) => u.uprops?.Confusion || 0,
      set: (u, v) => { u.uprops.Confusion = v; u.uconf = v > 0; },
      expire: expire_confusion },
    { name: 'STUNNED',
      get: (u) => u.uprops?.Stun || 0,
      set: (u, v) => { u.uprops.Stun = v; },
      expire: expire_stun },
    { name: 'BLINDED',
      get: (u) => u.blinded || 0,
      set: (u, v) => { u.blinded = v; },
      expire: expire_blinded },
    { name: 'WOUNDED_LEGS',
      get: (u) => u.HWounded_legs || 0,
      set: (u, v) => { u.HWounded_legs = v; },
      // C: heal_legs(0) then stop_occupation().
      expire: async () => { await heal_legs(0); } },
    { name: 'VOMITING',
      get: (u) => u.uprops?.Vomiting || 0,
      set: (u, v) => { u.uprops.Vomiting = v; },
      expire: async () => {} },
    { name: 'HALLUC',
      get: (u) => u.uprops?.Hallucination || 0,
      set: (u, v) => { u.uprops.Hallucination = v; },
      expire: expire_hallucination },
    // C ref: timeout.c:752 case DEAF — set_itimeout(&HDeaf, 1) then make_deaf(0,
    // TRUE), which prints "You can hear again." and stops any occupation.  A
    // timed deafness comes from eat.c rottenfood(); while it runs, sounds.c
    // dosounds() returns before ANY of its ambient rolls, so the countdown is
    // load-bearing for the PRNG stream, not just for the message.
    { name: 'DEAF',
      get: (u) => u.uprops?.HDeaf || 0,
      set: (u, v) => { u.uprops.HDeaf = v; },
      // C: set_itimeout(&HDeaf, 1L); make_deaf(0L, TRUE).  potion.c make_deaf()
      // suppresses its message while Unaware — which the rotten-food case always
      // is — so the deafness clears silently and creates no --More-- boundary.
      expire: async () => {
          const u = game.u;
          const old = u?.uprops?.HDeaf || 0;
          if (u?.uprops) u.uprops.HDeaf = 0;
          if (!Unaware() && old) await update_topl('You can hear again.');
      } },
    // prop.h FUMBLING = 25.  The only expiry case here that draws RNG (rn2(4)
    // in slip_or_trip, then the rnd(20) re-arm).
    { name: 'FUMBLING',
      get: (u) => u.HFumbling || 0,
      set: (u, v) => { u.HFumbling = v; },
      expire: expire_fumbling },
    // prop.h FAST = 64, after every other entry here.  A timed HFast is what
    // makes Very_fast true (hack.h Very_fast == ((HFast & ~INTRINSIC) || EFast)),
    // so this countdown is load-bearing: u_calc_moveamt draws a different roll
    // while it runs.  C ref: timeout.c case FAST —
    // `if (!Very_fast) You_feel("yourself slow down%s.", Fast ? " a bit" : "")`.
    { name: 'FAST',
      get: (u) => u.uprops?.HFast || 0,
      set: (u, v) => { u.uprops.HFast = v; },
      expire: async () => {
          if (youHaveVeryFast()) return;
          await update_topl(`You feel yourself slow down${youHaveFast() ? ' a bit' : ''}.`);
      } },
];

export async function nh_timeout() {
    const u = game.u;
    if (!u) return;
    if (!u.uprops) u.uprops = {};

    // C ref: allmain.c moveloop_core():513 `u.umoved = FALSE;` — it runs once
    // per moveloop_core() iteration, i.e. once per elapsed turn, and only a
    // domove() sets it back TRUE.  While gm.multi < 0 no command is dispatched
    // at all, so a HELPLESS turn's nh_timeout() always reads umoved FALSE; that
    // is what makes C skip slip_or_trip() (and its rn2(4)) on the paralysis
    // turns FUMBLING's own nomul(-2) creates.  This port takes a run's turns
    // inline inside ONE moveloop_core iteration (hack.js run_movement ->
    // moveloop_turn), so that reset is skipped and umoved stays stale-TRUE.
    // Re-derive it, but only when the PREVIOUS turn already ended helpless: a
    // nomul(-N) that the hero's own move set up (paralysis trap) must keep
    // umoved TRUE for the next turn, exactly as C does.
    if ((game.multi ?? 0) < 0 && game._helpless_at_timeout) u.umoved = false;

    // C ref: timeout.c — `if (u.ucreamed) u.ucreamed--;`, just above the
    // uprops[] loop.  Cream on the face wears off a point a turn independently
    // of the blindness it caused.
    if ((u.uprops.Vomiting || 0) > 0) await vomiting_dialogue();

    if ((u.ucreamed || 0) > 0) u.ucreamed -= 1;

    for (const p of TIMED_PROPS) {
        const cur = p.get(u);
        if (cur <= 0) continue;      // C: !(intrinsic & TIMEOUT) -> not running
        const next = cur - 1;
        p.set(u, next);
        if (next === 0) await p.expire();
    }

    // Sampled AFTER the expiry cases, so a nomul(-N) fired by one of them (the
    // FUMBLING slip) counts: allmain.c:377 `if (gm.multi < 0) ++gm.multi` sits
    // later in the same once-per-turn block, and no domove() can follow it.
    game._helpless_at_timeout = ((game.multi ?? 0) < 0);

    // C ref: timeout.c nh_timeout() ends with run_timers() — expire any object
    // timer (here: ROT_CORPSE) whose scheduled turn has arrived.
    run_object_timers();
}
