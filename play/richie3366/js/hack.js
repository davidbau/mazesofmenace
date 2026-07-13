// hack.js — Core hero damage / capacity helpers.
// C ref: hack.c — losehp, nomul, unmul, overexertion (and related).

import { game } from './gstate.js';
import { Upolyd, KILLED_BY } from './const.js';
import { pline } from './display.js';
import { gethungry } from './eat.js';

/**
 * C ref: hack.c overexertion — melee hunger via gethungry; maybe faint.
 * Encumber HP loss (near_capacity / overexert_hp) deferred — no RNG when
 * not heavily encumbered.
 */
export function overexertion() {
    gethungry();
    return (game.multi | 0) < 0;
}

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
 * C ref: hack.c nomul — start/replace multi-turn inactivity (negative = occupation).
 * end_running / cmdq_clear deferred.
 */
export function nomul(nval) {
    if ((game.multi || 0) < nval) return;
    if (!game.flags) game.flags = {};
    if ((game.multi || 0) >= 0) game.flags.botl = true;
    game.multi = nval;
    if (nval === 0) {
        game.multi_reason = null;
        game.nomovemsg = null;
    }
    if (game.context) {
        game.context.run = 0;
        game.context.mv = 0;
    }
}

/**
 * C ref: timeout.c fall_asleep — nomul(how_long) with sleeping reason.
 * Deafness / Hear_again afternmv (#if 0 in C) deferred.
 * @param {number} how_long negative multi turns
 * @param {boolean} wakeup_msg if true, nomovemsg is "You wake up."
 */
export function fall_asleep(how_long, wakeup_msg) {
    // stop_occupation — clear multi-turn occupation without message
    if (typeof game.occupation === 'function') game.occupation = null;
    nomul(how_long);
    game.multi_reason = 'sleeping';
    if (!game.u) game.u = {};
    game.u.usleep = game.moves | 0;
    game.nomovemsg = wakeup_msg ? 'You wake up.' : 'You can move again.';
}

/**
 * C ref: hack.c unmul — finish multi-turn action; run afternmv if set.
 * @param {string|null|undefined} msg_override
 */
export async function unmul(msg_override) {
    if (!game.flags) game.flags = {};
    game.flags.botl = true;
    game.multi = 0;
    let msg = msg_override;
    if (msg === undefined) msg = null;
    if (msg != null) game.nomovemsg = msg;
    else if (!game.nomovemsg) game.nomovemsg = 'You can move again.';
    if (game.nomovemsg) {
        if (game.nomovemsg.length) await pline(game.nomovemsg);
        game.nomovemsg = null;
    }
    game.multi_reason = null;
    const f = game.afternmv;
    game.afternmv = null;
    if (typeof f === 'function') await f();
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
    // C: end_running(TRUE) — clear rush; do NOT force multi=0 (nomul owns that)
    if (game.context) {
        game.context.run = 0;
        game.context.mv = 0;
        game.context.travel = 0;
    }
    if ((game.multi | 0) > 0) game.multi = 0;

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
