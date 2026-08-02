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
import { heal_legs } from './trap.js';
import { run_object_timers } from './mkobj.js';
import { update_topl } from './display.js';

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

// The u.uprops[] timers this port materialises.  `get`/`set` read and write
// whichever field the rest of the port already uses for that property.
const TIMED_PROPS = [
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
    { name: 'HALLUC',
      get: (u) => u.uprops?.Hallucination || 0,
      set: (u, v) => { u.uprops.Hallucination = v; },
      expire: expire_hallucination },
];

export async function nh_timeout() {
    const u = game.u;
    if (!u) return;
    if (!u.uprops) u.uprops = {};

    // C ref: timeout.c — `if (u.ucreamed) u.ucreamed--;`, just above the
    // uprops[] loop.  Cream on the face wears off a point a turn independently
    // of the blindness it caused.
    if ((u.ucreamed || 0) > 0) u.ucreamed -= 1;

    for (const p of TIMED_PROPS) {
        const cur = p.get(u);
        if (cur <= 0) continue;      // C: !(intrinsic & TIMEOUT) -> not running
        const next = cur - 1;
        p.set(u, next);
        if (next === 0) await p.expire();
    }

    // C ref: timeout.c nh_timeout() ends with run_timers() — expire any object
    // timer (here: ROT_CORPSE) whose scheduled turn has arrived.
    run_object_timers();
}
