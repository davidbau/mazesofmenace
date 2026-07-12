// hack.js — Core hero damage / capacity helpers.
// C ref: hack.c — losehp (and related). Other hack.c units remain elsewhere.

import { game } from './gstate.js';
import { Upolyd, KILLED_BY } from './const.js';

/**
 * C ref: hack.h Maybe_Half_Phys — Half_physical_damage halves ((dmg+1)/2).
 * Prop not yet wired → identity.
 */
export function maybe_half_phys(dmg) {
    const u = game.u;
    const half = !!(u?.HHalf_physical_damage || u?.EHalf_physical_damage);
    if (half) return Math.trunc((dmg + 1) / 2);
    return dmg;
}

/**
 * C ref: hack.c losehp() — subtract HP (or mh when Upolyd).
 * showdamage / maybe_wail / done(DIED) bodies deferred; death still clamps
 * uhp and marks gameover so callers do not continue with negative HP.
 */
export function losehp(n, knam, k_format = KILLED_BY) {
    const u = game.u || (game.u = {});
    if (!game.flags) game.flags = {};
    game.flags.botl = true;
    // end_running(TRUE) — clear rush/multi if active
    if (game.context) {
        game.context.run = 0;
        game.context.mv = 0;
    }
    game.multi = 0;

    if (Upolyd(u)) {
        u.mh = (u.mh || 0) - n;
        if ((u.mhmax || 0) < (u.mh || 0)) u.mhmax = u.mh;
        if ((u.mh || 0) < 1) {
            // rehumanize deferred — treat as fatal for now
            u.mh = 0;
            if (game.program_state) game.program_state.gameover = true;
        }
        return;
    }

    u.uhp = (u.uhp || 0) - n;
    if ((u.uhp || 0) > (u.uhpmax || 0)) u.uhpmax = u.uhp;
    if ((u.uhp || 0) < 1) {
        u.uhp = 0;
        // C: urgent_pline("You die..."); done(DIED); — full death path deferred
        if (game.program_state) game.program_state.gameover = true;
        void knam;
        void k_format;
    }
    // else if (n > 0 && u.uhp * 10 < u.uhpmax) maybe_wail() — deferred
}
