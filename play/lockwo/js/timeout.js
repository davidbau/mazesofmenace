// timeout.js — per-turn timed-property countdown.
// C ref: timeout.c nh_timeout() — decrements the hero's timed intrinsics each
// turn and fires their expiry effect when the timeout reaches 0.  The contest
// hero only exercises the WOUNDED_LEGS timer (a bear trap's set_wounded_legs),
// which expires with heal_legs(0); the other timed properties are either never
// set at the diverging points or are handled where they're applied, so they are
// intentionally omitted here.  Consumes NO RNG (matches the recorded stream).

import { game } from './gstate.js';
import { heal_legs } from './trap.js';

export async function nh_timeout() {
    const u = game.u;
    if (!u) return;

    // C ref: timeout.c WOUNDED_LEGS case (timeout.c:774) — heal_legs(0) when the
    // wounded-legs timer runs out.  The JS stores the remaining turns directly in
    // u.HWounded_legs (set_wounded_legs), so decrement it and heal at 0.
    if ((u.HWounded_legs || 0) > 0) {
        u.HWounded_legs -= 1;
        if (u.HWounded_legs === 0)
            await heal_legs(0);
    }
}
