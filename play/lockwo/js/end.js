// end.js — hero death / done() flow.
//
// C ref: src/end.c — done_in_by(), done(), savelife().  Scoped to the path the
// contest sessions exercise: a hostile melee attack drops the hero to 0 HP in
// WIZARD mode, the player declines the "Die?" paranoid query, savelife() restores
// HP and sets a one-turn immobilization whose nomovemsg is "You survived that
// attempt on your life." (seed5002 step-256..272).  No RNG is consumed on this
// path: adjattrib(A_CON,-1) only rolls when Con would drop below its minimum
// (it can't here), and savelife()'s HP/hunger fixups are deterministic.

import { game } from './gstate.js';

// end.h death codes (subset).  DIED=0; PANICKED separates "real" deaths from
// program panics in done().
const DIED = 0;

let _display = null;
async function deps() {
    if (!_display) _display = await import('./display.js');
    return _display;
}

// C ref: end.c savelife(how) — put the hero back into a viable state after a
// declined death.  givehp = 50 + 10*(ACURR(A_CON)/2), clamped to uhpmax; the
// hero is immobilized for the rest of the turn (multi = -1) and unmul() will
// announce nomovemsg ("You survived that attempt on your life.") when the turn
// completes.
function savelife(_how) {
    const u = game.u;
    if ((u.ulevel ?? 1) < 1) u.ulevel = 1;
    // minuhpmax(10): ensure uhpmax is at least 10 (it already exceeds that here).
    if ((u.uhpmax ?? 0) < 10) u.uhpmax = 10;
    const con = u.acurr?.a?.[4] ?? 10; // ACURR(A_CON)
    const givehp = 50 + 10 * Math.trunc(con / 2);
    u.uhp = Math.min(u.uhpmax, givehp);
    if (u.mh != null && u.mhmax != null) u.mh = Math.min(u.mhmax, givehp);
    // init_uhunger() only when uhunger < 500: the wizard starts well-fed, skip.

    // gn.nomovemsg = "You survived that attempt on your life."; context.move = 0;
    // gm.multi = -1 (can't move again during the current turn).  The moveloop's
    // unmul() will print nomovemsg when ++multi reaches 0.
    game.nomovemsg = 'You survived that attempt on your life.';
    game.context = game.context || {};
    game.context.move = 0;
    game.multi = -1;
}

// C ref: end.c done(how) — for how < PANICKED, zero the hero's HP, then (in
// wizard/explore mode) offer the paranoid "Die?" query.  Declining runs
// savelife() and lets play continue; accepting ends the game.  Only the
// wizard-mode decline path is exercised by the contest sessions.
async function done(how) {
    const d = await deps();
    const u = game.u;

    // how < PANICKED: force HP to zero (it may already be <= 0) and redraw bot.
    u.uhp = 0;
    if (u.mh != null) u.mh = 0;
    await d.bot();
    await d.flush_screen(1);

    // Lifesaved (amulet) path not reachable for the starter heroes.

    // explore/wizard mode: offer the "Die?" paranoid query.  paranoid_query
    // shows the deferred "You die...--More--" first (game._yn_need_more) then
    // "Die? [yn] (n)".  A 'y' would end the game; the contest player declines.
    const wizard = !!game.flags?.debug;
    const discover = !!game.flags?.discover;
    let survive = false;
    if (wizard || discover) {
        game._yn_need_more = true; // page the pending "You die..." line first
        const ans = await d.y_n('Die?', 'yn\x1b', 'n');
        if (ans !== 'y') {
            // "OK, so you don't die." (update_topl so it concatenates with the
            // monster-move messages that follow this turn), then savelife().
            // adjattrib(A_CON,-1,TRUE): no RNG (Con stays above its minimum) and
            // the status keeps showing the bonus-adjusted value, so leave the
            // displayed Con untouched.
            await d.update_topl("OK, so you don't die.");
            savelife(how);
            survive = true;
        }
    }

    if (!survive) {
        // C ref: end.c really_done(how) — the hero really dies.  Before the
        // disclosure/topten teardown, really_done computes
        //   bones_ok = (how < GENOCIDED) && can_make_bones();
        // (end.c:1201).  can_make_bones() draws a single rn2(1 + (depth>>2))
        // ("fewer ghosts on low levels"); on the Gnomish-Mines death level
        // (depth 3, depth>>2 == 0) that is rn2(1)=0, after which it returns
        // FALSE (no bones written — !wizard, and the harness has no bones file
        // anyway).  This one draw sits between the death blow and the next
        // segment's o_init shuffle, so emitting it keeps the RNG stream aligned
        // across the death boundary (seed0030 step-73).  savebones()/the actual
        // bones-file write is never reached here (bones_ok is FALSE).
        const GENOCIDED = 10; // end.h
        if (how < GENOCIDED) {
            const { can_make_bones } = await import('./bones.js');
            can_make_bones(); // draws rn2(1 + (depth>>2)); result discarded (no bones)
        }
        game.program_state = game.program_state || {};
        game.program_state.gameover = true;
    }
}

// C ref: end.c done_in_by(mtmp, how) — a monster killed the hero.  Announces
// "You die..." (the killer-name buffer is only used if death is accepted, which
// the contest player never does), then runs done(how).
export async function done_in_by(mtmp, how = DIED) {
    const d = await deps();
    // C ref end.c:195 — You((how == STONING) ? "turn to stone..." : "die...").
    await d.update_topl('You die...');
    // killer-name buffer (monhealthdescr + species) is unused on the decline
    // path; record the monster for completeness.
    game._killer_mon = mtmp || null;
    await done(how);
}

export { done, savelife, DIED };
