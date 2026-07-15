// timeout.js — timed property expiry (timeout.c nh_timeout subset).
// C ref: timeout.c nh_timeout — once-per-turn intrinsic TIMEOUT decrement.

import { game } from './gstate.js';
import { TIMEOUT } from './const.js';
import { heal_legs } from './trap.js';
import { stop_occupation } from './hack.js';
import { run_timers } from './mkobj.js';

/**
 * C ref: timeout.c nh_timeout — decrement timed intrinsics; on TIMEOUT
 * expiry run property-specific handlers.
 * Envelope this iteration: WOUNDED_LEGS → heal_legs(0) + stop_occupation.
 * Named omissions: luck baseluck; Stoned/Slimed/Sick/… dialogues; FAST/
 * CONFUSION/STUNNED/BLINDED/DEAF/INVIS/SEE_INVIS/HALLUC/SLEEPY/
 * LEVITATION/… cases; Glib; run_regions; ublesscnt; mtimedone; usptime;
 * ugallop; delayed killers; uinvulnerable early return polish.
 */
export async function nh_timeout() {
    const u = game.u || (game.u = {});
    // C: if (u.uinvulnerable) return; — deferred until invuln props exist
    // C: for (upp = u.uprops; …) if ((intrinsic & TIMEOUT) && !(--intrinsic & TIMEOUT))
    const hw = u.HWounded_legs | 0;
    if (hw & TIMEOUT) {
        // C: --upp->intrinsic then test TIMEOUT bits cleared
        const next = hw - 1;
        u.HWounded_legs = next;
        if (!(next & TIMEOUT)) {
            // C case WOUNDED_LEGS: heal_legs(0); stop_occupation();
            await heal_legs(0);
            await stop_occupation();
        }
    }
    // C: run_timers() at end of nh_timeout — corpse rot / object timers
    await run_timers();
}
