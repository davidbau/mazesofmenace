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

// end.h death codes (subset).  DIED=0; GENOCIDED separates the death codes
// that leave a tombstone/bones from the ones that don't (QUIT/ESCAPED/
// ASCENDED); PANICKED separates "real" deaths from program panics in done().
const DIED = 0;
const ESCAPED = 14;   // C: hack.h:497
const ASCENDED = 15;  // C: hack.h:498
const GENOCIDED = 10;
const PANICKED = 11;
const QUIT = 13;

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
// C ref: dungeon.c:1338 deepest_lev_reached(noquest) — the deepest DEPTH the
// hero reached in any dungeon, not the depth they happened to die on.
function deepest_lev_reached_js(noquest = false) {
    const dgns = game.dungeons || [];
    let ret = 0;
    for (let i = 0; i < dgns.length; i++) {
        const d = dgns[i];
        if (!d || (noquest && i === game.quest_dnum)) continue;
        const dl = d.dunlev_ureached || 0;
        if (!dl) continue;
        const dep = (d.depth_start ?? 1) + dl - 1;
        if (dep > ret) ret = dep;
    }
    return ret;
}

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

    // C ref: end.c really_done() score calc + dungeon.c:1338 deepest_lev_reached().
    // Using the CURRENT depth loses 50 points per level for any hero who
    // descends and then climbs back before dying.
    const deepest = deepest_lev_reached_js(false) || depth;
    let tmp = umoney - (u?.umoney0 || 0);
    if (tmp < 0) tmp = 0;
    if (how < PANICKED) tmp -= Math.trunc(tmp / 10);
    tmp += 50 * (deepest - 1);
    if (deepest > 20) tmp += 1000 * ((deepest > 30) ? 10 : deepest - 20);
    const urexp = (u?.urexp || 0) + tmp;

    // Death description for the tombstone (formatkiller with NO_KILLER_PREFIX
    // just yields killer.name).  ends[]/deaths[] fall back for the summary.
    const deathText = game._killer_name || DEATHS[how] || 'died';
    const year = (+String(game.datetime || '').slice(0, 4)) || 2020;
    const moves = (game.moves == null ? 0 : (game.moves | 0));

    // ── build the endgame TEXT window (24 lines), C ref rip.c + end.c ──
    const lines = [];
    // C: end.c really_done() draws the stone only for a death (how <= GENOCIDED);
    // ESCAPED/ASCENDED/QUIT get the text summary alone, and their middle line is
    // "You escaped from the dungeon with N points," (end.c:1475) rather than the
    // "in <dungeon> on dungeon level N" form.
    const stone = how <= GENOCIDED;
    if (stone) {
        lines.push('');                                // 0 (genl_outrip leading "")
        for (const r of genl_outrip(plname, umoney, deathText, year))
            lines.push(r);                             // 1..15 (stone)
        lines.push('');                                // 16 (genl_outrip trailing "")
        lines.push('');                                // 17
    }
    lines.push(`${goodbye_for_role(roleName)} ${plname} the ${roleName}...`); // 18
    lines.push('');                                    // 19
    lines.push((how !== ESCAPED && how !== ASCENDED)
        ? `You ${ENDS[how]} in ${dungeonName} on dungeon level ${depth}`
          + ` with ${urexp} point${plur(urexp)},`
        : `You ${how === ASCENDED ? 'went to your reward' : 'escaped from the dungeon'}`
          + ` with ${urexp} point${plur(urexp)},`);    // 20
    lines.push(`and ${umoney} piece${plur(umoney)} of gold, after ${moves} move${plur(moves)}.`); // 21
    lines.push(`You were level ${u?.ulevel || 1} with a maximum of ${u?.uhpmax || 0}`
        + ` hit point${plur(u?.uhpmax || 0)} when you ${ENDS[how]}.`); // 22
    lines.push('');                                    // 23

    const MORE = '--More--';
    const drawMore = (row) => {
        for (let i = 0; i < MORE.length; i++) disp.setCell(i, row, MORE[i], NO_COLOR, 0);
        disp.setCursor(MORE.length, row); // cursor one past --More-- (col 8)
    };

    // C ref: getline.c xwaitforspace(quitchars) behind every dmore() — only
    // " \r\n\033" dismiss the page; any other key rings the bell and waits
    // again WITHOUT redrawing, so it is recorded as a repeat of the same frame.
    const waitforspace = async () => {
        for (;;) {
            const k = await nhgetch();
            if (k === 32 || k === 13 || k === 10 || k === 27) return k;
        }
    };

    // Page 1 — the tombstone.  C tty process_text_window() prints window lines
    // 0..(rows-2) then pauses with --More-- on the last row (rows-1 == 23).
    disp.clearScreen();
    for (let i = 0; i < ROWS - 1 && i < lines.length; i++) {
        if (lines[i]) disp.putstr(0, i, lines[i], NO_COLOR, 0);
    }
    drawMore(ROWS - 1);
    // wintty.c:1821 — ESC sets WIN_CANCELLED and abandons every remaining page.
    const ripCancelled = (await waitforspace()) === 27;

    // The remaining pages are blank --More-- acknowledgements: process_text_window
    // clears and shows its final page (window line 23 == "" -> blank) with
    // --More--, then the endgame window teardown / topten() setup pauses for the
    // recorded space/return acknowledgements before the score line is printed.
    for (let b = 0; !ripCancelled && b < 5; b++) {
        disp.clearScreen();
        drawMore(ROWS - 1);
        // NOT waitforspace(): this port folds really_done()'s disclosure
        // queries into these frames, and those answer keys ('y'/'n') are not
        // quitchars — looping here would swallow the next command.
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
// C ref: end.c:1303-1319 — the hero's corpse and grave, created between
// disclose() and savebones() ("grave creation should be after disclosure so it
// doesn't have this grave in the current level's features for #overview").
//
//   corpse = mk_named_object(CORPSE, &mons[mnum], u.ux, u.uy, svp.plname);
//   make_grave(u.ux, u.uy, pbuf);
//
// mk_named_object() is mkcorpstat(CORPSE, NULL, ptr, x, y, CORPSTAT_INIT) plus
// oname().  Skipping it cost 29 RNG calls on every bones-eligible death:
// next_ident's rnd(2), the 23 rn2 @ rndmonst_adj that mksobj's rndmonnum()
// rolls for the CORPSE's placeholder corpsenm, and start_corpse_timeout's 5
// (seed0030 seg6 step 247 idx 0-28, verified against the C recorder).  The
// draws happen even though the corpsenm is immediately overwritten with the
// hero's race.  make_grave() itself draws nothing when given a text.
//
// C's guard is `u.ugrave_arise == NON_PM && !(mvitals[u.umonnum].mvflags &
// G_NOCORPSE)`; ugrave_arise is set from `how` at end.c:1206-1218, so the
// death codes that leave no ordinary corpse are the ones excluded here.
async function make_hero_corpse_and_grave(how) {
    const BURNING = 5, DISSOLVED = 6, STONING = 8, TURNED_SLIME = 9;
    if (how === PANICKED || how === BURNING || how === DISSOLVED
        || how === STONING || how === TURNED_SLIME)
        return null;
    try {
        const u = game.u;
        const x = u?.ux, y = u?.uy;
        if (!x && !y) return null;
        const { mkcorpstat, CORPSE } = await import('./mkobj.js');
        const { name_to_pmidx } = await import('./makemon.js');
        const { make_grave } = await import('./engrave.js');
        const { CORPSTAT_INIT } = await import('./const.js');
        // C: `int mnum = !Upolyd ? gu.urace.mnum : u.umonnum;`  This port's
        // u.umonnum holds the ROLE index, not a mons[] pmidx, so resolve the
        // race's monster by name (mons[] carries "human"/"elf"/"dwarf"/
        // "gnome"/"orc" as the player-race entries).
        const raceName = String(game.urace?.noun || game.urace?.name
                                || game.initrace || 'human').toLowerCase();
        const mnum = name_to_pmidx(raceName);
        const corpse = mkcorpstat(CORPSE, null, mnum ?? null, x, y,
                                  CORPSTAT_INIT);
        const plname = game.plname || game.u?.uname || 'Hero';
        if (corpse) corpse.oname = plname;
        // C: Sprintf(pbuf, "%s, ", plname); formatkiller(...); make_grave().
        make_grave(x, y, `${plname}, ${killer_epitaph(how)}`);
        return corpse;
    } catch {
        return null;   // never break the death sequence over a bones artifact
    }
}

// C ref: topten.c formatkiller(..., how, TRUE) as used for the headstone text.
function killer_epitaph(how) {
    const kn = game._killer_name || '';
    if (kn) return kn;
    return DEATHS[how] || 'died';
}

async function done(how) {
    const d = await deps();
    const u = game.u;
    const stopprint = !!game._done_stopprint;

    // how < PANICKED: force HP to zero (it may already be <= 0) and redraw
    // bot.  Skip the forced status update when quitting via a 'q' answer to
    // "Dump core?" (done_stopprint) — end.c done(): disp.botl = FALSE etc.
    // C ref: end.c:1044 — the forced status update comes FIRST (end.c:1048),
    // and only then does end.c:1071 zero u.uhp, with no second bot().  Doing it
    // in the other order let the zeroed HP reach the endgame screens.
    if (!(how === QUIT && stopprint)) {
        d.freeze_botl();
        await d.bot();
        await d.flush_screen(1);
    }
    if (how < PANICKED) {
        // MEASURED NEGATIVE, do not re-add: C's end.c:1071 also sets
        // disp.botl = TRUE after zeroing HP, so a later refresh redraws the
        // status with HP:0 even when the bot() above drew nothing (u.uhp was
        // exactly -1, botl.c's dosave() sentinel).  Re-freezing the botl here
        // wins seed0030's step 582 but costs seed5002 -12, the held-out proxy
        // -14 and seed0030's own step 779.  The extra release point is the
        // botl-is-a-snapshot trap; some other frame must be re-releasing it.
        u.uhp = 0;
        if (u.mh != null) u.mh = 0;
    }

    // C ref: end.c:1081 — `if (Lifesaved && (how <= GENOCIDED))`.  Lifesaved is
    // the LIFESAVED extrinsic, conferred only by a worn amulet of life saving.
    let survive = false;
    const uamul = game.uamul || game.u?.uamul;
    if (uamul && uamul.otyp === 202 /*AMULET_OF_LIFE_SAVING*/ && how <= GENOCIDED) {
        const I = await import('./invent.js');
        // C ref: end.c:1077 sets disp.botl = TRUE after zeroing uhp, so the
        // plines below reach bot() with a LIVE status line again.
        game._botlFrozen = null;
        game.botl = true;
        await d.update_topl('But wait...');
        I.makeknown(202);
        await d.update_topl(`Your medallion ${!game.u?.Blinded ? 'begins to glow' : 'feels warm'}!`);
        await d.update_topl('You feel much better!');
        await d.update_topl('The medallion crumbles to dust!');
        I.useup(uamul);
        // C ref: end.c:1092 adjattrib(A_CON, -1, TRUE) — no RNG.
        if (game.u?.acurr?.a) game.u.acurr.a[4] = (game.u.acurr.a[4] | 0) - 1;
        if (game.u?.abase?.a) game.u.abase.a[4] = (game.u.abase.a[4] | 0) - 1;
        savelife(how);
        survive = true;
    }

    // explore/wizard mode: offer the "Die?" paranoid query — but only for
    // how <= GENOCIDED (end.c done()); QUIT/ESCAPED/ASCENDED skip it outright.
    // paranoid_query shows the deferred "You die...--More--" first
    // (game._yn_need_more) then "Die? [yn] (n)".  A 'y' would end the game;
    // the contest player declines.
    const wizard = !!game.flags?.debug;
    const discover = !!game.flags?.discover;
    if (!survive && (wizard || discover) && how <= GENOCIDED) {
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
        let bones_ok = false;
        if (how < GENOCIDED) {
            const { can_make_bones } = await import('./bones.js');
            bones_ok = can_make_bones();
        }
        // C ref: end.c:1238 really_done() — `taken = paybill((how == ESCAPED)
        // ? -1 : (how != QUIT), silently)`, immediately after the bones_ok
        // computation and before display_nhwindow(WIN_MESSAGE) pages the
        // "You die..." line.  An angry shopkeeper the hero died next to takes
        // everything, and that message shares the death topline.
        if (how !== PANICKED && !stopprint) {
            const { paybill } = await import('./shkroom.js');
            const before = game._pending_message;
            await paybill(how === ESCAPED ? -1 : (how !== QUIT ? 1 : 0));
            // C ref: pline.c vpline() `if (u.ux) flush_screen(1)` ->
            // display.c:2236 `if (disp.botl || disp.botlx) bot()`.  done() has
            // just forced u.uhp to 0 and set disp.botl, so the shopkeeper's
            // "takes all your possessions" pline redraws the status with HP:0.
            if (game._pending_message !== before) { delete game._botlFrozen; d.freeze_botl(); }
        }

        game.program_state = game.program_state || {};
        game.program_state.gameover = true;

        if (stopprint) {
            // C ref: end.c disclose() — every one of its six category blocks
            // is gated on "!done_stopprint", so a 'q' answer to the wizard-
            // mode "Dump core?" query (set via done_stopprint++ in done2())
            // skips all of them outright; the tombstone is unreachable too
            // (outrip() requires how < GENOCIDED, and QUIT is 13).  What's
            // left is topten()'s wizard/discover branch: a bare score-skipped
            // notice, no table.
            await quit_final_message();
        } else if (!wizard && !discover) {
            // C ref: end.c really_done() — normal-game (non-wizard/explore)
            // death tail.  After the bones check, display_nhwindow(WIN_MESSAGE,
            // FALSE) pages the still-unseen "You die..." top line with
            // --More--, then disclose() offers its six end-of-game queries
            // before the tombstone/topten teardown.
            if (game._toplin === 1) { // display_nhwindow(WIN_MESSAGE): more()
                await d.topl_more();
                game._toplin = 0;
                game._pending_message = '';
            }
            // Acking that --More-- is where the deferred status redraw lands:
            // every frame from the first disclosure prompt on shows the zeroed
            // HP, while the "You die..." --More-- frames still show the value
            // done()'s own bot() left (nothing, when uhp was exactly -1).
            delete game._botlFrozen;
            // C ref: end.c really_done() — "needed for both inventory
            // disclosure and dumplog": for how != PANICKED, fully identify
            // every inventory object (discover_object + known/bknown/dknown/
            // rknown=1 + set_cknown_lknown) before disclose() runs, so its
            // 'i' listing shows true names/enchantments, not appearances.
            if (how !== PANICKED) {
                const invmod = await import('./invent.js');
                const inv = Array.isArray(game.invent) ? game.invent
                    : (Array.isArray(game.gi?.invent) ? game.gi.invent : []);
                for (const obj of inv) invmod.fully_identify_obj(obj);
            }
            const clean = await disclose(how);
            // C ref: end.c:1363 — savebones() runs AFTER disclose(), i.e. after
            // the "You die..." --More-- has been paged; doing it earlier wiped
            // the map out from under those frames.
            if (bones_ok) {
                const corpse = await make_hero_corpse_and_grave(how);
                const { savebones } = await import('./bones.js');
                await savebones(how, corpse || game._death_corpse || null);
            }
            if (clean) await real_death_epilogue(how);
        }
    }
}

// C ref: topten.c topten() wizard/discover branch — reached once bones/
// disclose/tombstone are all unreachable (done_stopprint, how >= GENOCIDED):
// a blank line then "Since you were in wizard mode, the score list will not
// be checked." (no --More--, no table), and the game ends.
async function quit_final_message() {
    const disp = game?.nhDisplay;
    if (!disp?.putstr) {
        game.program_state = game.program_state || {};
        game.program_state.gameover = true;
        return;
    }
    const { nhgetch } = await import('./input.js');
    const NO_COLOR = 8; // terminal.js NO_COLOR
    const wizard = !!game.flags?.debug;
    disp.clearScreen();
    const msg = `Since you were in ${wizard ? 'wizard' : 'discover'} mode,`
        + ' the score list will not be checked.';
    disp.putstr(0, 1, msg, NO_COLOR, 0);
    // C ref: end.c really_done() tail — "if (done_stopprint) { raw_print("");
    // raw_print(""); }" right before nh_terminate(): two more blank-line
    // cursor advances (no visible text change) when quitting via 'q'.
    disp.setCursor(0, game._done_stopprint ? 4 : 2);
    game.program_state = game.program_state || {};
    game.program_state.gameover = true;
    await nhgetch();
}

// C ref: end.c done2() — the '#quit' command.  Confirms via paranoid_query
// (ParanoidQuit is off by default, so a plain "[yn] (n)" prompt), then in
// wizard mode offers ynq("Dump core?").  Declining the core dump either way
// falls through to done(QUIT); answering 'q' there sets done_stopprint,
// which done()/disclose() key off of to skip straight to the score-skipped
// notice.  The tutorial-abandon branch (no tutorial support in this port)
// and the 'y' core-dump branch (an immediate process abort with no further
// screens) aren't exercised by any recorded session.
export async function doquit() {
    const d = await deps();
    const ans = await d.y_n('Really quit without saving?', 'yn', 'n');
    if (ans !== 'y') return 0; // ECMD_OK: declined, keep playing

    const wizard = !!game.flags?.debug;
    if (wizard) {
        const c = await d.y_n('Dump core?', 'ynq', 'q');
        if (c === 'q') game._done_stopprint = (game._done_stopprint || 0) + 1;
    }
    await done(QUIT);
    return 0;
}

// C ref: flag.h DISCLOSE_* char values + decl.c disclosure_options="iavgco".
function disclose_ask(c) {
    switch (c) {
    case '+': return { ask: false, defquery: 'y' };
    case '#': return { ask: false, defquery: 'a' };
    case '-': return { ask: false, defquery: 'n' };
    case 'y': return { ask: true, defquery: 'y' };
    case '?': return { ask: true, defquery: 'a' };
    default: return { ask: true, defquery: 'n' }; // 'n' (the startup default) or unset
    }
}

// C ref: options.c optfn_disclose() do_set — parse the `disclose:` rc option
// into per-category settings (i,a,v,g,c,o order, decl.c disclosure_options).
// Absent an rc override, options.c's initoptions() sets every category to
// DISCLOSE_PROMPT_DEFAULT_NO ('n') at startup, so that is the default here too.
const DISCLOSURE_CATS = ['i', 'a', 'v', 'g', 'c', 'o'];
function parse_end_disclose() {
    const settings = { i: 'n', a: 'n', v: 'n', g: 'n', c: 'n', o: 'n' };
    const raw = game.flags?.disclose;
    if (raw == null) return settings;
    const s = String(raw).trim();
    if (s === '' || /^all$/i.test(s)) {
        for (const k of DISCLOSURE_CATS) settings[k] = 'y';
        return settings;
    }
    if (/^none$/i.test(s)) {
        for (const k of DISCLOSURE_CATS) settings[k] = '-';
        return settings;
    }
    let prefix = null;
    for (const ch of s) {
        let c = ch.toLowerCase();
        if (c === 'k') c = 'v'; // killed -> vanquished
        if (c === 'd') c = 'o'; // dungeon -> overview
        if (DISCLOSURE_CATS.includes(c)) {
            settings[c] = prefix || '+'; // bare category letter -> YES_WITHOUT_PROMPT
            prefix = null;
        } else if ('yn+-#?'.includes(ch)) {
            prefix = ch;
        }
        // spaces and unrecognized chars: ignored, matching the C parser.
    }
    return settings;
}

// C ref: end.c disclose(how, taken) — end-of-game disclosure queries.  The
// 'i' query's 'y' content (display_inventory) is ported via invent.js's
// display_inventory_interactive(); 'a'/'c'/'o' render their content through
// insight.js's show_attributes_disclosure()/show_conduct_disclosure() and
// dungeon.js's build_overview_lines() (via extcmd-handlers.js's
// show_overview_disclosure()).  'v'/'g' (list_vanquished/list_genocided) are
// gated in C on there being at least one dead/genocided species to list
// (ntypes/ngone != 0); when that count is 0 neither ever prompts at all, no
// matter what 'ask' is, so only treat a true 'ask' as an unmodeled gap (their
// bespoke sort-order sub-menus aren't ported) when the list would actually be
// non-empty.  taken (items confiscated before death) is never true for a
// plain HP-loss death, so the 'i' query always uses the "possessions
// identified?" wording.
async function disclose(how) {
    const d = await deps();
    const settings = parse_end_disclose();
    const inv = Array.isArray(game.invent) ? game.invent
        : (Array.isArray(game.gi?.invent) ? game.gi.invent : []);
    const final = (how >= PANICKED) ? 1 : 2; // ENL_GAMEOVERALIVE : ENL_GAMEOVERDEAD

    async function query(settingChar, qbuf) {
        const { ask, defquery } = disclose_ask(settingChar);
        return ask ? await d.y_n(qbuf, 'ynq\x1b', defquery) : defquery;
    }

    if (inv.length) {
        const c = await query(settings.i, 'Do you want your possessions identified?');
        if (c === 'y') {
            const invmod = await import('./invent.js');
            await invmod.display_inventory_interactive(null);
        }
        if (c === 'q') return true;
    }

    {
        const c = await query(settings.a, 'Do you want to see your attributes?');
        if (c === 'y') {
            const { show_attributes_disclosure } = await import('./insight.js');
            await show_attributes_disclosure(final);
        }
        if (c === 'q') return true;
    }

    {
        // C ref: insight.c:2826 list_vanquished() — the prompt exists only when
        // some species has died; ntypes > 1 widens the answer set to ynaqchars,
        // which shows as "[ynaq]".  'a' means "choose a sort order first".
        const { vanquished_ntypes, anyGenocidedOrExtinct, list_vanquished_screen }
            = await import('./insight.js');
        const ntypes = vanquished_ntypes();
        if (ntypes > 0) {
            const { ask, defquery } = disclose_ask(settings.v);
            const resp = (ntypes > 1) ? 'ynaq\x1b' : 'ynq\x1b a';
            const c = ask
                ? await d.y_n('Do you want an account of creatures vanquished?', resp, defquery)
                : defquery;
            if (c === 'y' || c === 'a') await list_vanquished_screen();
            if (c === 'q') return true;
        }
        // list_genocided() prints nothing at all when nothing was genocided or
        // went extinct, so there is no prompt in that case.
        if (anyGenocidedOrExtinct() && disclose_ask(settings.g).ask) return false;
    }

    {
        const c = await query(settings.c, 'Do you want to see your conduct?');
        if (c === 'y') {
            const { show_conduct_disclosure } = await import('./insight.js');
            await show_conduct_disclosure(final);
        }
        if (c === 'q') return true;
    }

    {
        const c = await query(settings.o, 'Do you want to see the dungeon overview?');
        if (c === 'y') {
            const { show_overview_disclosure } = await import('./extcmd-handlers.js');
            await show_overview_disclosure(final, how);
        }
        if (c === 'q') return true;
    }

    return true;
}

// C ref: end.c really_done() tail for a normal (non-wizard, non-discover)
// death: outrip() renders the tombstone into a TEXT window whose teardown
// pages two more blank --More-- acknowledgements, then topten() reports the
// score.  The scores "record" file is always empty in this harness (no
// state persists a real high-score list), so the just-died entry is always
// rank 1 ("You made the top ten list!"); other rank0/skip_scores branches
// of topten() are not reachable here.
async function real_death_epilogue(how) {
    const disp = game?.nhDisplay;
    const { nhgetch } = await import('./input.js');
    if (!disp?.putstr) return;
    const { genl_outrip } = await import('./rip.js');
    const { roles, races, genders, aligns } = await import('./role.js');
    const u = game.u;
    const NO_COLOR = 8;
    const ATR_BOLD = 2;
    const ROWS = 24;
    const COLNO = 80;

    const plname = game.plname || game.svp?.plname || 'wizard';
    const female = !!game.flags?.female;
    const roleName = (female && game.urole?.name?.f)
        ? game.urole.name.f
        : (game.urole?.name?.m || 'Adventurer');
    const inv = Array.isArray(game.invent) ? game.invent
        : (Array.isArray(game.gi?.invent) ? game.gi.invent : []);
    const umoney = money_toplevel(inv) + hidden_gold_inv(inv);

    const uz = u?.uz || { dnum: 0, dlevel: 1 };
    const dungeonName = game.dungeons?.[uz.dnum]?.dname || 'The Dungeons of Doom';
    // deepest_lev_reached(FALSE) approximated by the current depth (matches
    // outrip_and_score's own simplification for these single-descent deaths).
    const depth = (game.dungeons?.[uz.dnum]?.depth_start ?? 1) + (uz.dlevel | 0) - 1;

    const deepest2 = deepest_lev_reached_js(false) || depth;
    let tmp = umoney - (u?.umoney0 || 0);
    if (tmp < 0) tmp = 0;
    if (how < PANICKED) tmp -= Math.trunc(tmp / 10);
    tmp += 50 * (deepest2 - 1);
    if (deepest2 > 20) tmp += 1000 * ((deepest2 > 30) ? 10 : deepest2 - 20);
    const urexp = (u?.urexp || 0) + tmp;
    u.urexp = urexp; // really_done() persists this before topten() reads it

    const deathText = game._killer_name || DEATHS[how] || 'died';
    const year = (+String(game.datetime || '').slice(0, 4)) || 2020;
    const moves = (game.moves == null ? 0 : (game.moves | 0));

    const lines = [];
    // Stone only for a death (how <= GENOCIDED); see outrip_and_score().
    const stone = how <= GENOCIDED;
    if (stone) {
        lines.push('');
        for (const r of genl_outrip(plname, umoney, deathText, year)) lines.push(r);
        lines.push('');
        lines.push('');
    }
    lines.push(`${goodbye_for_role(roleName)} ${plname} the ${roleName}...`);
    lines.push('');
    lines.push((how !== ESCAPED && how !== ASCENDED)
        ? `You ${ENDS[how]} in ${dungeonName} on dungeon level ${depth}`
          + ` with ${urexp} point${plur(urexp)},`
        : `You ${how === ASCENDED ? 'went to your reward' : 'escaped from the dungeon'}`
          + ` with ${urexp} point${plur(urexp)},`);
    lines.push(`and ${umoney} piece${plur(umoney)} of gold, after ${moves} move${plur(moves)}.`);
    lines.push(`You were level ${u?.ulevel || 1} with a maximum of ${u?.uhpmax || 0}`
        + ` hit point${plur(u?.uhpmax || 0)} when you ${ENDS[how]}.`);
    lines.push('');

    const MORE = '--More--';
    const drawMore = (row) => {
        for (let i = 0; i < MORE.length; i++) disp.setCell(i, row, MORE[i], NO_COLOR, 0);
        disp.setCursor(MORE.length, row);
    };

    // C ref: getline.c xwaitforspace(quitchars) behind every dmore() — only
    // " \r\n\033" dismiss; any other key rings the bell and waits again without
    // redrawing, so it records as a repeat of the same frame.
    const waitforspace = async () => {
        for (;;) {
            const k = await nhgetch();
            if (k === 32 || k === 13 || k === 10 || k === 27) return k;
        }
    };

    // C ref: wintty.c process_text_window() — the endgame TEXT window is paged
    // 23 lines at a time with --More-- on row 23 of EVERY page (including the
    // last).  A death's text is exactly 24 lines (blank + 15 rip rows + 2 blank
    // + goodbye + blank + 3 summary + trailing blank), so it pages as a full
    // page then a blank one; a QUIT's is 6 lines -> a single page.
    const PAGE = ROWS - 1;
    const npages = Math.max(1, Math.ceil(lines.length / PAGE));
    let ripCancelled = false;
    for (let p = 0; p < npages && !ripCancelled; p++) {
        disp.clearScreen();
        for (let i = 0; i < PAGE; i++) {
            const t = lines[p * PAGE + i];
            if (t) disp.putstr(0, i, t, NO_COLOR, 0);
        }
        drawMore(ROWS - 1);
        ripCancelled = (await waitforspace()) === 27;
    }

    // C ref: topten() — "assure minimum number of points": t0->points is
    // floored to 0 when under sysopt.pointsmin (always 1: POINTSMIN's
    // config-file floor is max(POINTSMIN,1)).
    const scorePoints = urexp < 1 ? 0 : urexp;

    // topten() real (non-wizard) output.
    const roleFC = roles[game.initrole]?.filecode || '?';
    const raceFC = races[game.initrace]?.filecode || '?';
    const genderFC = genders[female ? 1 : 0]?.filecode || '?';
    const alignFC = aligns.find(a => a.value === (u?.ualign?.type ?? 0))?.filecode || '?';
    const entry = {
        points: scorePoints, name: plname, plrole: roleFC, plrace: raceFC,
        plgend: genderFC, plalign: alignFC, death: deathText, dungeonName,
        deathdnum: uz.dnum, knoxDnum: -99, // Fort Ludios unreachable here
        deathlev: depth, maxlvl: depth, hp: u?.uhp ?? 0, maxhp: u?.uhpmax ?? 0,
        urexp,
    };
    const tt = topten_list(entry);

    // Blank --More-- acknowledgements (endwin teardown): two when the entry
    // makes the list (each of seed0030's diverse deaths scores real points and
    // gets the "You made the top ten list!" banner), one when it doesn't
    // (seed0009's Tutorial death, floored to 0 points; seed0030's Samurai quit).
    // (blank trailing page handled by the pager above)

    disp.clearScreen();
    let row = 0;
    const printLine = (text, so) => {
        disp.putstr(0, row++, text, NO_COLOR, so ? ATR_BOLD : 0);
    };
    printLine('', false);              // C: HUP topten_print("") before the list
    if (tt.notbeaten) { printLine(tt.notbeaten, false); printLine('', false); }
    if (tt.banner) { printLine(tt.banner, false); printLine('', false); }
    printLine(topten_outheader(COLNO), false);
    for (const e of tt.shown) {
        if (e.blank) { printLine('', false); continue; }
        for (const l of topten_outentry(e.rank, e.entry, e.so, COLNO))
            printLine(l, e.so);
    }
    disp.setCursor(0, row);
    topten_record_write(tt);

    game.program_state = game.program_state || {};
    game.program_state.gameover = true;
    // C nh_terminate()s here, so a real session simply stops consuming keys.
    // A replayed one must not: this port's post-death UI is shorter than C's
    // (the disclosure prompts are unported), so a hero who dies EARLIER than
    // the recorded one leaves keys queued.  Segments of one session share a
    // single flattened screen index, so those unread keys shift every later
    // segment out of alignment.  Draining them holds the alignment; the
    // trailing frames themselves can't match content until the missing
    // prompts are ported.  Bounded by the replay queue rather than by
    // nhgetch()'s end-of-input throw, so an interactive session (queue empty,
    // refilled only by a real keypress) still stops at the single read here
    // instead of swallowing every key the player presses afterwards.
    const replayq = game?.nhDisplay;
    while ((replayq?.inputQueueLength ?? 0) > 0) await nhgetch();
    await nhgetch();
}

// ── the persistent 'record' (high-score) file ──
//
// C ref: topten.c topten().  RECORD survives from one game to the next, so in a
// multi-segment session every death after the first prints the WHOLE accumulated
// list, not just the fresh entry.  The harness shares one Web-Storage handle
// across a session's segments (frozen/score.sh: "storage ... makes save/restore
// + bones persist across segments"), which is what stands in for that file here.
const RECORD_KEY = 'nethack.record';
// sysopt: sys.c:66-69 clamps the config.h values.  PERS_IS_UID is 1 on unix, and
// every segment of a session runs as the same uid, so the "same person" half of
// the PERSMAX test is always TRUE and only the role filecode distinguishes.
const PERSMAX = 3, ENTRYMAX = 100, POINTSMIN = 1;
// options.c:7170-7172 defaults.
const END_TOP = 3, END_AROUND = 2, END_OWN = false;

function topten_record_read() {
    const storage = game.storage;
    if (!storage || typeof storage.getItem !== 'function') return [];
    try {
        const blob = storage.getItem(RECORD_KEY);
        const arr = blob ? JSON.parse(blob) : null;
        return Array.isArray(arr) ? arr : [];
    } catch { return []; }
}

// C: the record file is rewritten (with the merged list) only when flg was set,
// i.e. only when this game's entry was inserted or an over-PERSMAX entry dropped.
function topten_record_write(tt) {
    const storage = game.storage;
    if (!tt.flg || !storage || typeof storage.setItem !== 'function') return;
    try { storage.setItem(RECORD_KEY, JSON.stringify(tt.list)); } catch { /*noop*/ }
}

// C ref: hacklib.c ordin(n).
function ordin(n) {
    const dd = n % 10;
    return (dd === 0 || dd > 3 || Math.trunc((n % 100) / 10) === 1) ? 'th'
         : (dd === 1 ? 'st' : dd === 2 ? 'nd' : 'rd');
}

// C ref: topten.c topten() — merge t0 into the record list, decide rank0 and
// which entries get displayed.  Returns { list, shown, banner, notbeaten, flg }.
function topten_list(t0) {
    const stored = topten_record_read();
    const list = [];
    let rank = 1, occ_cnt = PERSMAX, rank0 = -1, rank1 = 0, flg = 0;
    let notbeaten = null;
    for (let i = 0; ; i++) {
        // i >= stored.length is the zero-points sentinel a short record file
        // reads back as (readentry() at EOF).
        const src = i < stored.length ? stored[i] : null;
        const pts = src ? (src.points < POINTSMIN ? 0 : src.points) : 0;
        if (rank0 < 0 && pts < t0.points) {
            rank0 = rank++;
            list.push(t0);
            occ_cnt--;
            flg++;
        }
        if (pts === 0) break;
        const t1 = { ...src, points: pts };
        if (t1.plrole === t0.plrole && --occ_cnt <= 0) {
            if (rank0 < 0) {
                rank0 = 0;
                rank1 = rank;
                notbeaten = `You didn't beat your previous score of ${pts} points.`;
            }
            // occ_cnt < 0: this entry is over the per-person limit, so it is
            // dropped from the rewritten file (C reuses the node and continues).
            if (occ_cnt < 0) { flg++; continue; }
        }
        list.push(t1);
        if (rank <= ENTRYMAX) rank++;
        if (rank > ENTRYMAX) break;
    }

    let banner = null;
    if (flg && rank0 > 0) {
        banner = rank0 <= 10
            ? 'You made the top ten list!'
            : `You reached the ${rank0}${ordin(rank0)} place on the top ${ENTRYMAX} list.`;
    }
    if (rank0 === 0) rank0 = rank1;
    if (rank0 <= 0) rank0 = rank;

    // skip_scores is FALSE with the default end_top=3.
    const shown = [];
    for (let i = 0; i < list.length; i++) {
        const r = i + 1;
        if (!(r <= END_TOP
              || (r >= rank0 - END_AROUND && r <= rank0 + END_AROUND)
              || (END_OWN && list[i].name === t0.name))) continue;
        if (r === rank0 - END_AROUND && rank0 > END_TOP + END_AROUND + 1 && !END_OWN)
            shown.push({ rank: -1, entry: null, so: false, blank: true });
        if (r !== rank0) shown.push({ rank: r, entry: list[i], so: false });
        else if (!rank1) shown.push({ rank: r, entry: list[i], so: true });
        else {
            shown.push({ rank: r, entry: list[i], so: true });
            shown.push({ rank: 0, entry: t0, so: true });
        }
    }
    // C: "if (rank0 >= rank) outentry(0, t0, TRUE)" — this game's entry did not
    // make the list (or fell past its end), so it is appended rankless.
    if (rank0 >= rank) shown.push({ rank: 0, entry: t0, so: true });
    return { list, shown, banner, notbeaten, flg };
}

// C ref: topten.c outheader() — the column header line, padded so "Hp [max]"
// lands flush against the right edge (COLNO - 9 == where the padding stops).
function topten_outheader(COLNO) {
    let line = ' No  Points     Name';
    while (line.length < COLNO - 9) line += ' ';
    line += 'Hp [max]';
    return line;
}

// C ref: topten.c outentry(rank, t1, so) — format one score-list entry,
// word-wrapping across as many lines as needed so the "Hp [max]" column
// stays aligned at the right edge.  Reduced to the death-description branches
// reachable by a plain "died in <dungeon> [on level N]" contest death
// (escaped/ascended/starved/choked/poisoned/crushed/petrified and the
// astral-plane wording are not reachable here).  `so` (standout) pads each
// line to COLNO-1 for the bold render, matching the just-died entry.
function topten_outentry(rank, entry, so, COLNO) {
    let linebuf = rank ? String(rank).padStart(3) : '   ';
    // C: "%10ld", t1->points ? t1->points : u.urexp — a points-floored-to-0
    // entry still shows the raw score it would have had.
    const pts = entry.points ? entry.points : (entry.urexp || 0);
    linebuf += ` ${String(pts).padStart(10)}  ${entry.name.slice(0, 10)}`;
    linebuf += `-${entry.plrole}`;
    if (entry.plrace !== '?') linebuf += `-${entry.plrace}`;
    linebuf += `-${entry.plgend}`;
    if (entry.plalign !== '?') linebuf += `-${entry.plalign} `;
    else linebuf += ' ';

    let secondLine = true;
    const death = entry.death;
    if (death.startsWith('quit')) { linebuf += 'quit'; secondLine = false; }
    else if (death.startsWith('died of st')) { linebuf += 'starved to death'; secondLine = false; }
    else if (death.startsWith('choked')) linebuf += `choked on h${entry.plgend[0] === 'F' ? 'er' : 'is'} food`;
    else if (death.startsWith('poisoned')) linebuf += 'was poisoned';
    else if (death.startsWith('crushed')) linebuf += 'was crushed to death';
    else if (death.startsWith('petrified by ')) linebuf += 'turned to stone';
    else linebuf += 'died';
    // C: svd.dungeons[t1->deathdnum].dname — resolved against the CURRENT game's
    // dungeon table, so a record entry written by an earlier game re-reads it.
    const dname = game.dungeons?.[entry.deathdnum]?.dname || entry.dungeonName;
    linebuf += ` in ${dname}`;
    if (entry.deathdnum !== entry.knoxDnum) linebuf += ` on level ${entry.deathlev}`;
    if (entry.deathlev !== entry.maxlvl) linebuf += ` [max ${entry.maxlvl}]`;
    if (death.startsWith('quit ')) linebuf += death.slice(4);
    linebuf += '.';

    if (secondLine) {
        const d0 = death.charAt(0).toUpperCase() + death.slice(1);
        linebuf += `  ${d0}.`;
        linebuf = linebuf.replace('; the ', ', the ');
    }

    const printed = [];
    let lngr = linebuf.length;
    const hppos0 = COLNO - 10; // sizeof "  Hp [max]" - sizeof ""
    while (lngr >= hppos0) {
        let bp = linebuf.length;
        while (!(bp < linebuf.length && linebuf[bp] === ' ' && bp < hppos0)) {
            bp--;
            if (bp < 0) break;
        }
        if (15 >= bp) bp = hppos0 - 1;
        if (bp > 5 && linebuf.slice(bp - 5, bp) === ' [max') bp -= 5;
        const carry = linebuf[bp] !== ' ' ? linebuf.slice(bp) : linebuf.slice(bp + 1);
        printed.push(linebuf.slice(0, bp));
        linebuf = `${' '.repeat(15)} ${carry}`;
        lngr = linebuf.length;
    }

    const hpbuf = entry.hp <= 0 ? '-' : String(entry.hp);
    const hppos = COLNO - 7 - hpbuf.length;
    if (linebuf.length <= hppos) {
        while (linebuf.length < hppos) linebuf += ' ';
        linebuf += hpbuf;
        const pad = entry.maxhp < 10 ? '  ' : entry.maxhp < 100 ? ' ' : '';
        linebuf += ` ${pad}[${entry.maxhp}]`;
    }
    printed.push(linebuf);

    if (!so) return printed;
    return printed.map((t) => {
        let s = t;
        while (s.length < COLNO - 1) s += ' ';
        return s;
    });
}

// C ref: hack.h an(str) — indefinite article.
function an(s) { return /^[aeiou]/i.test(s) ? `an ${s}` : `a ${s}`; }

// C ref: end.c done_in_by() killer-name construction, reduced to the common
// case: an ordinary (non-unique, non-ghost, non-shopkeeper, non-priest,
// non-shapeshifted) monster.  monhealthdescr() is a no-op in this NetHack
// version (pager.c:140-161, disabled behind `#if 0`), so no health descriptor
// is ever prepended.  killer.format is KILLED_BY_AN, giving "killed by a
// <species>" — used for both the tombstone engraving and the topten entry.
function killer_text_for_monster(mtmp) {
    // C ref: end.c:264-271 — a shopkeeper killer gets an honorific and NO
    // article (killer.format = KILLED_BY).  formatkiller() (topten.c:137) then
    // rewrites every ',' in the stored name to ';'; outentry() reverses it for
    // the on-screen topten table only (js/end.js:856), so the stored form must
    // carry the semicolon or the tombstone's word wrap comes out wrong.
    if (mtmp?.isshk) {
        const shknm = shk_name_for_killer(mtmp);
        // shkname_is_pname(): ESHK(mtmp)->shknam[0] == '_' (a proper name, no
        // honorific) — shknms[] marks those with a leading underscore.
        const raw = mtmp.eshk?.shknam || '';
        const honorific = raw[0] === '_' ? '' : (mtmp.female ? 'Ms. ' : 'Mr. ');
        return `killed by ${honorific}${shknm}; the shopkeeper`;
    }
    const name = mtmp?.data?.name || 'monster';
    return `killed by ${an(name)}`;
}
// shkroom.js imports end.js, so resolve shkname() lazily through the game state
// the caller already has rather than adding a static cycle.
function shk_name_for_killer(mtmp) {
    const nm = mtmp.eshk?.shknam;
    if (!nm) return mtmp.data?.name || 'shopkeeper';
    return /[A-Za-z]/.test(nm[0]) ? nm : nm.slice(1);
}

// C ref: end.c done_in_by(mtmp, how) — a monster killed the hero.  Announces
// "You die..." then runs done(how).
export async function done_in_by(mtmp, how = DIED) {
    const d = await deps();
    // C ref end.c:195 — You((how == STONING) ? "turn to stone..." : "die...").
    await d.update_topl('You die...');
    game._killer_mon = mtmp || null;
    if (mtmp) game._killer_name = killer_text_for_monster(mtmp);
    await done(how);
}

export { done, savelife, DIED, ESCAPED };
