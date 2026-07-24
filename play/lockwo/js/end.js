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
const PANICKED = 11;

// C ref: end.c ends[] — "when you %s" phrasing per death code (also the
// "You %s in <dungeon>" verb for the score summary).
const ENDS = [
    'died', 'choked', 'were poisoned', 'starved', 'drowned', 'burned',
    'dissolved in the lava', 'were crushed', 'turned to stone',
    'turned into slime', 'were genocided', 'panicked', 'were tricked',
    'quit', 'escaped', 'ascended',
];
// C ref: end.c deaths[] — noun form used when no killer text is available.
const DEATHS = [
    'died', 'choked', 'poisoned', 'starvation', 'drowning', 'burning',
    'dissolving under the heat and pressure', 'crushed', 'turned to stone',
    'turned into slime', 'genocided', 'panic', 'trickery', 'quit',
    'escaped', 'ascended',
];

// C ref: role.c Goodbye() — role-specific farewell for the score summary line.
function goodbye_for_role(roleName) {
    switch (roleName) {
    case 'Knight':   return 'Fare thee well';
    case 'Samurai':  return 'Sayonara';
    case 'Tourist':  return 'Aloha';
    case 'Valkyrie': return 'Farvel';
    default:         return 'Goodbye';
    }
}

// C ref: hack.h plur(x) — "" when x == 1, "s" otherwise.
function plur(n) { return (n === 1) ? '' : 's'; }

// Sum the coins carried directly in `inv` (C ref: engrave.c money_cnt — does NOT
// descend into containers; that is hidden_gold()'s job).
function money_toplevel(inv) {
    let s = 0;
    for (const o of inv) if (o && o.oclass === COIN_CLASS) s += o.quan || 0;
    return s;
}
// C ref: invent.c hidden_gold(TRUE) — total gold stashed inside carried
// containers (recursively).  Kept separate from money_toplevel() so the score
// calculation mirrors end.c (umoney = money_cnt + hidden_gold).
function hidden_gold_inv(inv) {
    let s = 0;
    for (const o of inv) {
        if (o?.cobj) {
            for (const c of o.cobj) {
                if (c?.oclass === COIN_CLASS) s += c.quan || 0;
                if (c?.cobj) s += hidden_gold_inv([c]);
            }
        }
    }
    return s;
}
const COIN_CLASS = 12; // mkobj.js COIN_CLASS

// C ref: end.c really_done() endgame display + rip.c outrip() + topten().
// Reached from done_selfzap()/done() once the hero has actually died (the
// wizard-mode "Die?" query was accepted and, if bones are possible, "Save
// bones?" answered).  Renders the tombstone page, the tty window-teardown
// --More-- acknowledgements, and (in wizard/discover mode) the topten
// "score list will not be checked" line, driving nhgetch() at each boundary so
// every frame is captured.  The final nhgetch() exhausts the recorded input and
// terminates the segment (as the moveloop's own read would otherwise do).
export async function outrip_and_score(how) {
    const disp = game?.nhDisplay;
    const { nhgetch } = await import('./input.js');
    if (!disp?.putstr) { // no display (shouldn't happen in replay) — just end.
        game.program_state = game.program_state || {};
        game.program_state.gameover = true;
        return;
    }
    const { genl_outrip } = await import('./rip.js');
    const u = game.u;
    const NO_COLOR = 8; // terminal.js NO_COLOR (default fg; emits no SGR escape)
    const ROWS = 24;

    // ── gather the values engraved / printed ──
    const plname = game.plname || game.svp?.plname || 'wizard';
    const female = !!game.flags?.female;
    const roleName = (female && game.urole?.name?.f)
        ? game.urole.name.f
        : (game.urole?.name?.m || 'Adventurer');
    const inv = Array.isArray(game.invent) ? game.invent
        : (Array.isArray(game.gi?.invent) ? game.gi.invent : []);
    // umoney = money_cnt(invent) + hidden_gold(TRUE); gd.done_money = umoney.
    const umoney = money_toplevel(inv) + hidden_gold_inv(inv);

    // depth of the death level (dnum 0 -> depth == dlevel).
    const uz = u?.uz || { dnum: 0, dlevel: 1 };
    const dungeonName = game.dungeons?.[uz.dnum]?.dname || 'The Dungeons of Doom';
    const depth = (game.dungeons?.[uz.dnum]?.depth_start ?? 1) + (uz.dlevel | 0) - 1;

    // C ref: end.c really_done() score calc.  deepest_lev_reached(FALSE) is the
    // deepest depth reached; approximate with the current depth (the only level
    // reached in the covered path).  tmp = net gold gain, minus 10%, plus a
    // per-level bonus; u.urexp already holds the reward-experience earned in play.
    const deepest = depth;
    let tmp = umoney - (u?.umoney0 || 0);
    if (tmp < 0) tmp = 0;
    if (how < PANICKED) tmp -= Math.trunc(tmp / 10);
    tmp += 50 * (deepest - 1);
    const urexp = (u?.urexp || 0) + tmp;

    // Death description for the tombstone (formatkiller with NO_KILLER_PREFIX
    // just yields killer.name).  ends[]/deaths[] fall back for the summary.
    const deathText = game._killer_name || DEATHS[how] || 'died';
    const year = (+String(game.datetime || '').slice(0, 4)) || 2020;
    const moves = (game.moves == null ? 0 : (game.moves | 0));

    // ── build the endgame TEXT window (24 lines), C ref rip.c + end.c ──
    const lines = [];
    lines.push('');                                    // 0 (genl_outrip leading "")
    for (const r of genl_outrip(plname, umoney, deathText, year))
        lines.push(r);                                 // 1..15 (stone)
    lines.push('');                                    // 16 (genl_outrip trailing "")
    lines.push('');                                    // 17
    lines.push(`${goodbye_for_role(roleName)} ${plname} the ${roleName}...`); // 18
    lines.push('');                                    // 19
    lines.push(`You ${ENDS[how]} in ${dungeonName} on dungeon level ${depth}`
        + ` with ${urexp} point${plur(urexp)},`);      // 20
    lines.push(`and ${umoney} piece${plur(umoney)} of gold, after ${moves} move${plur(moves)}.`); // 21
    lines.push(`You were level ${u?.ulevel || 1} with a maximum of ${u?.uhpmax || 0}`
        + ` hit point${plur(u?.uhpmax || 0)} when you ${ENDS[how]}.`); // 22
    lines.push('');                                    // 23

    const MORE = '--More--';
    const drawMore = (row) => {
        for (let i = 0; i < MORE.length; i++) disp.setCell(i, row, MORE[i], NO_COLOR, 0);
        disp.setCursor(MORE.length, row); // cursor one past --More-- (col 8)
    };

    // Page 1 — the tombstone.  C tty process_text_window() prints window lines
    // 0..(rows-2) then pauses with --More-- on the last row (rows-1 == 23).
    disp.clearScreen();
    for (let i = 0; i < ROWS - 1 && i < lines.length; i++) {
        if (lines[i]) disp.putstr(0, i, lines[i], NO_COLOR, 0);
    }
    drawMore(ROWS - 1);
    await nhgetch();

    // The remaining pages are blank --More-- acknowledgements: process_text_window
    // clears and shows its final page (window line 23 == "" -> blank) with
    // --More--, then the endgame window teardown / topten() setup pauses for the
    // recorded space/return acknowledgements before the score line is printed.
    for (let b = 0; b < 5; b++) {
        disp.clearScreen();
        drawMore(ROWS - 1);
        await nhgetch();
    }

    // topten() in wizard/discover mode: raw_print("") then raw_print(msg) — two
    // lines to the bare screen (no --More--); cursor ends on the row after.
    // C ref: topten.c topten() wizard branch + tty raw_print.
    disp.clearScreen();
    const wizard = !!game.flags?.debug;
    const msg = `Since you were in ${wizard ? 'wizard' : 'discover'} mode,`
        + ' the score list will not be checked.';
    disp.putstr(0, 1, msg, NO_COLOR, 0);
    disp.setCursor(0, 2);
    game.program_state = game.program_state || {};
    game.program_state.gameover = true;
    // Final read: consumes the last recorded key (or exhausts the queue, which
    // ends the segment exactly as the moveloop's own command read would).
    await nhgetch();
}

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
            // C ref: end.c really_done() — bones_ok = (how < GENOCIDED) &&
            // can_make_bones(); if (bones_ok) savebones(how, corpse).
            // can_make_bones() draws rn2(1 + (depth>>2)); in wizard mode it then
            // returns TRUE, so savebones() rewrites the death level into a legacy
            // (bones) level and stashes it in the shared storage handle for a
            // later segment's getbones() to reload.  This is where seed5006's
            // seg0 death on Dlvl:3 leaves the bones that seg1's ^V-to-3 loads.
            const { can_make_bones, savebones } = await import('./bones.js');
            if (can_make_bones()) {
                await savebones(how, game._death_corpse || null);
            }
        }
        game.program_state = game.program_state || {};
        game.program_state.gameover = true;

        // C ref: end.c really_done() — normal-game (non-wizard/explore) death
        // tail.  After the bones check, display_nhwindow(WIN_MESSAGE, FALSE)
        // pages the still-unseen "You die..." top line with --More--, then
        // disclose() offers the end-of-game disclosure prompts.  In
        // wizard/explore mode the paranoid "Die?" query above already paged the
        // death line, and those recordings stop before disclosure, so this tail
        // is scoped to the normal game modes.
        if (!wizard && !discover) {
            if (game._toplin === 1) { // display_nhwindow(WIN_MESSAGE): more()
                await d.topl_more();
                game._toplin = 0;
                game._pending_message = '';
            }
            await disclose(how);
        }
    }
}

// C ref: end.c disclose(how, taken) — end-of-game disclosure queries.  Only the
// first query ("Do you want your possessions identified?") is reached by the
// covered normal-game death: the recorded player runs out of input at that
// prompt, so the remaining attribute/vanquished/genocided/conduct/overview
// queries are not yet ported.  On a plain HP-loss death nothing was confiscated
// (taken == FALSE), so the wording is the "possessions identified?" form; with
// the default flags.end_disclose, should_query_disclose_option('i') asks with
// defquery 'n' and ynqchars, giving "... [ynq] (n)".
async function disclose(_how) {
    const d = await deps();
    const inv = Array.isArray(game.invent) ? game.invent
        : (Array.isArray(game.gi?.invent) ? game.gi.invent : []);
    if (inv.length) {
        await d.y_n('Do you want your possessions identified?', 'ynq\x1b', 'n');
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
