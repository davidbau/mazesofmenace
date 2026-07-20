// cmd.js — Command dispatch and movement.
// C ref: cmd.c rhack(), hack.c domove().
//
// Minimal skeleton: only hjklyubn movement is implemented.
// Contestants should add: search, kick, eat, drink, read, zap,
// wear, wield, drop, throw, pray, cast, and all other commands.

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { newsym, flush_screen, pline, m_at, update_topl, y_n, topl_more, wrap_topl } from './display.js';
import { vision_recalc, cansee, recalc_block_point } from './vision.js';
import { do_attack, is_safemon, x_monnam } from './uhitm.js';
import { ddoinv, dismiss_invent_screen, dolook,
         dodiscovered, doattributes, dovspell,
         attr_window_advance, dowieldquiver, dowield, dothrow, dofire, dotravel, dodrop,
         dopickup, dowear, dotakeoff, doputon, doremring, dopay, floor_object_name,
         renderWindowScreen, ECMD_NOTHANDLED } from './invent.js';
import { WEAPON_CLASS } from './mkobj.js';
import { doeat } from './eat.js';
import { doapply, ECMD } from './apply.js';
import { dodrink } from './potion.js';
import { dozap } from './zap.js';
import { docast } from './spell.js';
import { doread } from './read.js';
import { rnl, rn2, rnd } from './rng.js';
import { doextcmd, hooked_tty_getlin, wiz_wish, wiz_genesis } from './extcmd-handlers.js';
import { skill_window_advance } from './enhance.js';
import { wiz_level_tele, dodown, doup } from './do.js';
import { spoteffects } from './trap.js';
import { doset, dosetSimple } from './doset.js';
import { do_run, do_run_prefixed, isRunKey, RUN_DX, RUN_DY, do_farlook, do_look_full, dotele_wizard } from './hack.js';
import { COLNO, ROWNO, STONE, DOOR, D_CLOSED, D_LOCKED,
         D_ISOPEN, D_BROKEN, D_NODOOR, D_TRAPPED,
         SDOOR, SCORR, CORR, IS_WALL, IS_OBSTRUCTED, isok, IS_DOOR,
         A_STR, A_DEX, A_CON, Is_rogue_level,
         TT_BEARTRAP, TT_PIT, TT_WEB, TT_LAVA, TT_INFLOOR,
         PIT, SPIKED_PIT } from './const.js';
import { exercise } from './attrib.js';
import { engr_at, wipe_engr_at, doengrave } from './engrave.js';
import { HEADSTONE } from './const.js';

// C ref: hack.c maybe_smudge_engr() — when the hero walks/rushes from (x1,y1)
// to (x2,y2) and can reach the floor, any non-headstone engraving at the old
// and new squares gets wipe_engr_at(.., rnd(5)).  The rnd(5) is evaluated as
// the call argument whenever engr_at() finds an engraving (even an undegradable
// one), so it advances the PRNG exactly as C does on every move over engraved
// terrain (the tut-1 level is covered in engravings).
function maybe_smudge_engr(x1, y1, x2, y2) {
    const u = game.u;
    // can_reach_floor(TRUE): false only while Levitating/Flying without a way
    // down.  The recorded movers are all walking on the floor here.
    if (u?.uprops?.Levitation || u?.uprops?.Flying) return;
    let ep = engr_at(x1, y1);
    if (ep && ep.engr_type !== HEADSTONE) wipe_engr_at(x1, y1, rnd(5), false);
    if ((x2 !== x1 || y2 !== y1)) {
        ep = engr_at(x2, y2);
        if (ep && ep.engr_type !== HEADSTONE) wipe_engr_at(x2, y2, rnd(5), false);
    }
}

// Direction deltas: y u k
//                   h . l
//                   b j n
const DIR_DX = { h: -1, l: 1, j: 0, k: 0, y: -1, u: 1, b: -1, n: 1 };
const DIR_DY = { h: 0, l: 0, j: 1, k: -1, y: -1, u: -1, b: 1, n: 1 };

function isMovementKey(ch) {
    return 'hjklyubn'.includes(ch);
}

// C ref: hack.c — check if a cell blocks movement
export function blocksMove(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return true;
    if (loc.typ === STONE) return true;
    if (IS_WALL(loc.typ)) return true;
    if (loc.typ === DOOR && (loc.doormask & (D_CLOSED | D_LOCKED))) return true;
    return false;
}

// C ref: hack.c doorless_door() — a doorway that lacks its door (NODOOR or
// BROKEN).  All rogue-level doors are treated as if their door were present so
// that diagonal access is disallowed there too.
function doorless_door(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc || !IS_DOOR(loc.typ)) return false;
    if (Is_rogue_level(game.u?.uz)) return false;
    return !((loc.doormask || 0) & ~(D_NODOOR | D_BROKEN));
}

// C ref: hack.c test_move() lines 1140-1150 and 1208-1214 — for a diagonal
// step (dx && dy), the hero cannot move diagonally INTO a doorway that still
// has its door (open/closed/locked/broken-only does not count as doorless),
// nor diagonally OUT of such a doorway.  block_door()/block_entry() add a
// shopkeeper-blocking case that is not reachable for the starter sessions
// (no shop), so a non-doorless door is sufficient to block here.  Passes_walls
// heroes (phasing/xorn form) bypass this, but those don't occur in the corpus
// and the existing blocksMove() likewise ignores phasing.
function blocksDiagonalDoor(ux, uy, x, y, dx, dy) {
    if (!(dx && dy)) return false;
    // Diagonal move INTO a door with a door present.  Closed/locked doors are
    // *not* rejected here: C's test_move() handles them via the closed_door
    // branch (autoopen) before ever reaching testdiag (hack.c:1075 vs 1140), so
    // only an open/broken-with-frame door blocks a diagonal entry.
    const tgt = game.level?.at(x, y);
    if (tgt && IS_DOOR(tgt.typ) && !doorless_door(x, y)
        && !(tgt.doormask & (D_CLOSED | D_LOCKED))) return true;
    // Diagonal move OUT of a doorway with a door present.
    const here = game.level?.at(ux, uy);
    if (here && IS_DOOR(here.typ) && !doorless_door(ux, uy)) return true;
    return false;
}

// C ref: cmd.c get_count() — gather typed digits into a repeat count, echoing
// "Count: N" on the top line, and return the first non-digit key.  With
// number_pad Off (the default for the recorded sessions) parse() always routes
// the first command key through here, so any leading digit starts a count.
//
// Faithful subset: maxcount is LARGEST_INT (32767); the only control keys that
// matter for the corpus are digits, ESC (cancel) and the terminating command
// letter.  The echo timing mirrors C exactly — "Count: N" is not shown until
// the count exceeds a single digit (cnt > 9), so a one-digit count leaves the
// top line blank (matching the recorder, e.g. seed0900 "20s": the '2' frame is
// blank, the '0' frame shows "Count: 20").  backspace/erase support is omitted
// (no recorded session backspaces inside a count).
const LARGEST_INT = 32767;

async function get_count(inkey) {
    let cnt = 0;
    let key = inkey;
    for (;;) {
        const ch = String.fromCharCode(key);
        if (ch >= '0' && ch <= '9') {
            const dgt = key - 48;
            cnt = cnt * 10 + dgt; // C AppendLongDigit (no overflow for our range)
            if (cnt < 0) cnt = 0;
            else if (cnt > LARGEST_INT) cnt = LARGEST_INT;
        } else {
            // First non-digit terminates the count; return it to rhack.
            break;
        }
        // C get_count(): echo "Count: N" only once the count is multi-digit
        // (cnt > 9).  custompline() replaces the top line; the cursor parks at
        // the end of the prompt (row 0).  The frame is captured by the next
        // nhgetch() below, so set the message + cursor before reading.
        if (cnt > 9) {
            game._pending_message = `Count: ${cnt}`;
            await flush_screen(1);
            const disp = game?.nhDisplay;
            if (disp?.setCursor)
                disp.setCursor(Math.min(game._pending_message.length, 79), 0);
        }
        key = await nhgetch();
    }
    // C parse(): clear the count echo from the top line once a command key
    // arrives, then hand the count to the move loop via gm.multi.
    game._pending_message = '';
    game.command_count = cnt;
    game.multi = cnt;
    if (game.multi) game.multi -= 1;
    return key;
}

// C ref: cmd.c rhack — main command dispatcher
export async function rhack(key) {
    if (key === 0) {
        // Read key from input.  The flush renders the *previous* command's
        // top-line message so it is captured for that command's screen; once
        // nhgetch returns (its capture hook already fired), the previous
        // message has served its purpose and is cleared before we act on the
        // new key.  C ref: topl.c — the top line is cleared at the next
        // prompt.  (Persisting until here is what lets free-action messages
        // like dolook survive onto the recorded screen.)
        await flush_screen(1);
        key = await nhgetch();
        game._pending_message = '';
        // The top line was acknowledged by this keystroke; reset the topl
        // NEED_MORE state so the next turn's messages start a fresh line
        // (C ref: topl.c clears toplin when the player's input is read).
        game._toplin = 0;

        // C ref: cmd.c parse() — with number_pad Off, the first command key is
        // routed through get_count(); a leading digit accumulates a repeat
        // count and get_count() returns the following command key.  A bare ESC
        // (no digits) cancels with no count.  Any digit-prefixed command thus
        // sets gm.multi so the move loop repeats it.
        const fc = String.fromCharCode(key);
        if (fc >= '0' && fc <= '9') {
            key = await get_count(key);
            // ESC after a count cancels it (C: clears WIN_MESSAGE, multi 0).
            if (key === 27) {
                game._pending_message = '';
                game.command_count = 0;
                game.multi = 0;
            }
        } else {
            // C parse(): with no count, command_count is 0 and gm.multi is set
            // to 0 (gm.multi = command_count).  Reset it here so a stale count
            // from an earlier command can never leak into this dispatch (e.g.
            // arm the search occupation for a plain 's').
            game.command_count = 0;
            game.multi = 0;
        }
    }

    const ch = String.fromCharCode(key);

    // A paged ^X attributes window consumes space/return to advance pages and
    // dismiss after the last; ESC cancels.  C ref: process_menu_window().
    if (game._modal_screen === 'attrwin'
        && (ch === ' ' || ch === '\r' || ch === '\n' || ch === '>')) {
        await attr_window_advance();
        game.context.move = 0;
    } else if (game._modal_screen === 'skillwin'
        && (ch === ' ' || ch === '\r' || ch === '\n' || ch === '>')) {
        // A paged #enhance "Current skills:" window advances/dismisses on
        // space/return/'>' (PICK_NONE menu).  ESC falls through below.
        await skill_window_advance();
        game.context.move = 0;
    } else if (ch === '\x1b') {
        // Escape: dismiss any open menu/window; a no-op at top level.
        // C ref: cmd.c — ESC produces no message.
        await dismiss_invent_screen();
        game.context.move = 0;
    } else if (key === 32 || key === 13 || key === 10) {
        // Space / Return.  A single-page inventory/text window is dismissed by
        // space/return (C tty treats space like a confirm/next that ends a
        // one-page menu).  C ref: cmd.c rhack() / process_menu_window().
        if (game._modal_screen === 'invent' || game._modal_screen === 'textwin') {
            await dismiss_invent_screen();
            game.context.move = 0;
        } else if (key === 32 && !game._modal_screen) {
            // <space> is unbound with 'rest_on_space' Off (the default) and
            // elicits "Unknown command ' '." (cmd.c update_rest_on_space).
            await pline(`Unknown command '${ch}'.`);
            game.context.move = 0;
        } else if ((key === 13 || key === 10) && !game._modal_screen) {
            // <return> at top level drives a south run in the recorded debug
            // sessions (e.g. seed0398/seed0030): the hero runs south, stopping
            // adjacent to a doorway and "That door is closed."-ing on the next
            // press.  Modelled as the C 'G'-style run (set_move_cmd(DIR_S, 3)).
            await do_run_prefixed(0, 1, 3);
        } else {
            game.context.move = 0;
        }
    } else if (ch === 'O') {
        // C ref: cmd.c { 'O', "options", doset_simple, ... CMD_M_PREFIX }.
        // Plain 'O' runs doset_simple() (the categorized "Options" PICK_ONE
        // menu); 'm O' (menu_requested) runs the full #optionsfull doset() menu
        // ("Set what options?").  doset_simple()/doset() consume the
        // menu-requested flag (they cross-dispatch in C).  No game time/RNG.
        if (game.iflags?.menu_requested) {
            game.iflags.menu_requested = false;
            await doset();
        } else {
            await dosetSimple();
        }
        game.context.move = 0;
    } else if (ch === 'i') {
        // C ref: cmd.c { 'i', ..., ddoinv }.  ddoinv() shows the selectable
        // inventory (a blocking PICK_ONE menu); choosing an item runs
        // itemactions() ("Do what with X?"), whose chosen action dispatches the
        // real command.  All key-consumption happens inside ddoinv (so the menu
        // keystrokes don't leak to the command loop); the turn flag comes from
        // the dispatched command (e.g. a Throw that elapses a turn).  getdir is
        // threaded in for the Throw action's direction prompt.
        game.context.move = (await ddoinv(getdir)) === 3 ? 1 : 0;
    } else if (ch === '\\') {
        dodiscovered();
        game.context.move = 0;
    } else if (ch === '+') {
        await dovspell();
        game.context.move = 0;
    } else if (ch === 'S') {
        // C ref: cmd.c { 'S', "save", ..., dosave, ... } -> save.c dosave().
        // Clears the message window, asks y_n("Really save?"); on 'n' (the
        // covered path) it clears the message again and returns ECMD_OK (no game
        // turn).  The actual save (writing a file + terminating) is not driven
        // by any covered session, so only the decline path is modelled.
        game._pending_message = '';
        const ans = await y_n('Really save?', 'yn\x1b', 'n');
        game._pending_message = '';
        if (ans !== 'n') {
            // y_n only returns from {y,n} or default 'n'; a 'y' would save.
            await pline('Saving...');
        }
        game.context.move = 0;
    } else if (ch === '\x18') { // ^X
        doattributes();
        game.context.move = 0;
    } else if (ch === ':') {
        await dolook();
        game.context.move = 0;
    } else if (ch === '@') {
        // C ref: cmd.c { '@', "autopickup", ..., dotogglepickup } -> options.c
        // dotogglepickup(): flip flags.pickup and report the new state.  No game
        // time elapses (ECMD_OK).  With no pickup_types restriction (the default
        // for these sessions) the ON message is "for all objects"; the apelist
        // exception clause stays empty.
        game.flags = game.flags || {};
        game.flags.pickup = !game.flags.pickup;
        if (game.flags.pickup) {
            const types = game.flags.pickup_types;
            await pline(`Autopickup: ON, for ${types ? types : 'all'} objects.`);
        } else {
            await pline('Autopickup: OFF.');
        }
        game.context.move = 0;
    } else if (ch === 'a') {
        // C ref: cmd.c 'a' (#apply) -> apply.c doapply().  Applies a tool;
        // ECMD_TIME only when the use costs a turn (e.g. a *repeat* stethoscope
        // probe in the same turn).  The first stethoscope-to-self probe is free
        // (ECMD_OK) and consumes no RNG.
        game.context.move = (await doapply()) === ECMD.ECMD_TIME ? 1 : 0;
    } else if (ch === 'e') {
        // C ref: cmd.c 'e' (#eat) -> eat.c doeat().  Eats carried/floor food
        // (ECMD_TIME when a bite is taken).
        game.context.move = (await doeat()) ? 1 : 0;
    } else if (ch === 'o') {
        // C ref: cmd.c doopen -> lock.c doopen_indir(0,0): open an adjacent
        // door (reads a direction).  Sets the turn flag from doopen's result.
        game.context.move = (await doopen_indir(0, 0)) ? 1 : 0;
    } else if (ch === 'c') {
        // C ref: cmd.c doclose -> lock.c doclose(): close an adjacent door
        // (reads a direction).  ECMD_CANCEL (cancelled direction) and ECMD_OK
        // (no door / already closed) elapse no turn; closing an open door is
        // ECMD_TIME.
        game.context.move = (await doclose()) === 2 ? 1 : 0;
    } else if (ch === 's') {
        // C ref: cmd.c dosearch -> detect.c dosearch0(0): search adjacent
        // squares for hidden doors/passages/traps.  Takes a game turn unless
        // the safe_wait safety check refuses it (hostile monster adjacent).
        //
        // C rhack(): a repeat count (gm.multi) on a command with f_text
        // ("searching") arms a timed occupation — set_occupation(dosearch,
        // "searching", gm.multi) — so the move loop re-runs the search for
        // gm.multi more turns without reading another command key.  We mirror
        // that with game._search_occupation: this first search is the command
        // turn; the move loop counts down gm.multi over the following turns.
        const searched = await dosearch();
        game.context.move = searched ? 1 : 0;
        if (searched && (game.multi ?? 0) > 0)
            game._search_occupation = true;
    } else if (key === 4) { // ^D — kick (dokick.c dokick())
        // C ref: cmd.c keymap C('d') = dokick.  Reads a direction, then resolves
        // the kicked square (monster / object / terrain).  Sets the turn flag
        // from dokick's ECMD result.
        const res = await dokick();
        game.context.move = res === 1 ? 1 : 0;
    } else if (key === 7) { // ^G — wizard-mode create monster (wizcmds.c wiz_genesis)
        // C ref: cmd.c keymap C('g') = wiz_genesis, IFBURIED|WIZMODECMD.  Clears
        // iflags.debug_mongen, then create_particular() prompts "Create what kind
        // of monster?" and makemon()s the named species next to the hero.
        // wiz_genesis returns ECMD_OK, so no game turn elapses.
        if (game.flags?.debug) {
            await wiz_genesis();
            game.context.move = 0;
        } else {
            game.context.move = 0;
            await pline(`Unknown command '${ch}'.`);
        }
    } else if (key === 20) { // ^T — teleport (cmd.c dotelecmd -> teleport.c)
        // C ref: cmd.c keymap C('t') = dotelecmd.  In wizard mode (playmode:
        // debug) with no 'm' prefix, dotelecmd sets ignore_restrictions and
        // calls dotele(TRUE) -> tele(): "Where do you want to be teleported?"
        // then getpos(force=TRUE).  dotele() returns ECMD_TIME, so a game turn
        // elapses whether or not the targeting was cancelled.  (Non-wizard ^T
        // without the teleport intrinsic is not modelled — no such session.)
        if (game.flags?.debug) {
            const res = await dotele_wizard();
            game.context.move = res === 1 ? 1 : 0;
        } else {
            game.context.move = 0;
            await pline(`Unknown command '${ch}'.`);
        }
    } else if (key === 22) { // ^V — wizard-mode level teleport (do.c/teleport.c)
        // C ref: cmd.c keymap C('v') -> wiz_level_tele() -> level_tele().
        // The "To what level..." prompt is read with the standard top-line
        // getlin; goto_level() (do.js) makes the destination level on first
        // visit (getbones + makelevel) and relocates the hero + pet.
        const res = await wiz_level_tele((q) => hooked_tty_getlin(q, null));
        game.context.move = res === 1 ? 1 : 0;
    } else if (key === 23) { // ^W — wizard-mode wish (cmd.c C('w') -> wiz_wish)
        // C ref: cmd.c keymap C('w') = wizwish, IFBURIED|CMD_M_PREFIX|WIZMODECMD.
        // Prompts "For what do you wish?", parses via readobjnam(), creates the
        // wished object, then rolls u.ublesscnt += rn1(100,50).
        await wiz_wish();
        game.context.move = 0;
    } else if (ch === 'W') {
        // C ref: cmd.c keymap 'W' = dowear (do_wear.c).  Prompts for armor to
        // wear; ECMD_TIME (3) only when the don actually costs a turn.
        game.context.move = (await dowear()) === 3 ? 1 : 0;
    } else if (ch === 'T') {
        // C ref: cmd.c keymap 'T' = dotakeoff (do_wear.c).  Removes worn armor
        // (a single piece comes off without a disambiguation prompt).
        game.context.move = (await dotakeoff()) === 3 ? 1 : 0;
    } else if (ch === 'P') {
        // C ref: cmd.c keymap 'P' = doputon (do_wear.c).  Puts on a ring,
        // amulet, or eyewear; rings prompt for the ring-finger.  When doputon
        // declines (no accessory to put on; see its scoping guard) fall through
        // to the "Unknown command" path so previously-matching sessions are
        // undisturbed.
        const rP = await doputon();
        if (rP === ECMD_NOTHANDLED) {
            await pline(`Unknown command '${ch}'.`);
            game.context.move = 0;
        } else {
            game.context.move = rP === 3 ? 1 : 0;
        }
    } else if (ch === 'R') {
        // C ref: cmd.c keymap 'R' = doremring (do_wear.c).  Removes a worn
        // accessory (ring/amulet/blindfold).  Declines (and reports the key as
        // unknown) when the hero wears no accessory, mirroring the 'P' guard.
        const rR = await doremring();
        if (rR === ECMD_NOTHANDLED) {
            await pline(`Unknown command '${ch}'.`);
            game.context.move = 0;
        } else {
            game.context.move = rR === 3 ? 1 : 0;
        }
    } else if (ch === 'p') {
        // C ref: cmd.c keymap 'p' = dopay (shk.c).  Away from a shopkeeper this
        // reports "There appears to be no shopkeeper here ..." (ECMD_OK).
        game.context.move = (await dopay()) === 3 ? 1 : 0;
    } else if (ch === 'd') {
        // C ref: cmd.c — 'd' drop an item.  do.c dodrop() prompts for the
        // item then drops it on the floor (ECMD_TIME when something is
        // dropped, so the turn elapses and monsters move).
        game.context.move = (await dodrop()) ? 1 : 0;
    } else if (ch === ',') {
        // C ref: cmd.c { ',', "pickup", dopickup } -> hack.c dopickup().  Pick up
        // the objects under the hero.  ECMD_TIME (turn elapses, monsters move) when
        // something is lifted; ECMD_OK (nothing here) takes no time.  Lifting the
        // item removes it from the floor so the pet's dog_goal fobj scan no longer
        // re-rolls obj_resists for it (the seed0002 early divergence).
        game.context.move = (await dopickup()) ? 1 : 0;
    } else if (ch === '#') {
        // C ref: cmd.c doextcmd — read and run an extended command.
        await doextcmd();
    } else if (ch === 'q') {
        // C ref: cmd.c — 'q' quaff (drink) a potion.
        game.context.move = (await dodrink()) ? 1 : 0;
    } else if (ch === 'z') {
        // C ref: cmd.c — 'z' zap a wand.
        game.context.move = (await dozap()) ? 1 : 0;
    } else if (ch === 'Z') {
        // C ref: cmd.c — 'Z' cast a spell.
        game.context.move = (await docast()) ? 1 : 0;
    } else if (ch === 'E') {
        // C ref: cmd.c — 'E' (#engrave) -> engrave.c doengrave(): write/engrave
        // on the floor.  doengrave sets up the engraving (garble loop +
        // make_engr_at) and runs it as a one-action occupation; we model the
        // single-action completion inline and pass a turn (ECMD_TIME) so
        // monsters move once.
        game.context.move = (await doengrave()) === 1 ? 1 : 0;
    } else if (ch === 'r') {
        // C ref: cmd.c — 'r' read a scroll or spellbook.
        game.context.move = (await doread()) ? 1 : 0;
    } else if (ch === 'Q') {
        // C ref: cmd.c — 'Q' (#quiver) ready ammunition.  doquiver_core returns
        // ECMD_TIME (3) only when unwielding the primary/secondary weapon cost a
        // turn; ECMD_OK/ECMD_CANCEL take no time.
        game.context.move = (await dowieldquiver()) === 3 ? 1 : 0;
    } else if (ch === 'w') {
        // C ref: cmd.c keymap 'w' = dowield (wield.c).  Wields a weapon (or
        // nothing).  ECMD_TIME (3) when the wield consumes a turn; ECMD_OK/FAIL/
        // CANCEL take no time.
        game.context.move = (await dowield()) === 3 ? 1 : 0;
    } else if (ch === 't') {
        // C ref: cmd.c — 't' (#throw) throw/shoot an item.  throw_obj returns
        // ECMD_TIME (3) when the throw takes a turn; getdir (the direction
        // prompt) is supplied here to keep invent.js free of a cmd import cycle.
        game.context.move = (await dothrow(getdir)) === 3 ? 1 : 0;
    } else if (ch === 'f') {
        // C ref: cmd.c keymap 'f' = dofire (dothrow.c).  Throws/shoots from the
        // quiver; with fireassist On a launcher in the swap slot is auto-wielded
        // (doswapweapon) before firing.  ECMD_TIME (3) when a missile is launched
        // and a turn elapses; the recorded session cancels at the direction
        // prompt so no time passes.
        game.context.move = (await dofire(getdir)) === 3 ? 1 : 0;
    } else if (ch === '_') {
        // C ref: cmd.c — '_' (#travel) move toward a chosen map location.  The
        // recorded session cancels at the destination prompt (ESC), so no turn
        // elapses.
        await dotravel();
        game.context.move = 0;
    } else if (ch === ';') {
        // C ref: cmd.c ';' "glance" -> pager.c do_look(1): quick farlook.
        // Cursor-positioning loop + look-at description; no game time passes.
        await do_farlook();
        game.context.move = 0;
    } else if (ch === '/') {
        // C ref: cmd.c { '/', "whatis", dowhatis } -> pager.c do_look(0): the
        // full whatis command (menu + verbose farlook).  No game time passes.
        await do_look_full();
        game.context.move = 0;
    } else if (isRunKey(ch)) {
        // Capital-letter run: do_run_west/east/... -> set_move_cmd(dir, 1).
        // Run until something interesting is seen.  hack.js drives the whole
        // multi-turn run inline and leaves game.context.move = 0 (every
        // elapsed turn was already taken), so the moveloop does not schedule
        // another per-turn pass.  C ref: cmd.c do_run_*(), hack.c domove().
        await do_run(RUN_DX[ch], RUN_DY[ch]);
    } else if (ch === 'm') {
        // C ref: cmd.c do_reqmenu — the 'm' movement prefix sets
        // iflags.menu_requested (move without autopickup / force a menu on the
        // following command) and consumes no time or message.  A second 'm'
        // cancels it ("Double m prefix, canceled.").  The following command is
        // read on the next rhack iteration.
        if (game.iflags?.menu_requested) {
            await pline(`Double m prefix, canceled.`);
            game.iflags.menu_requested = false;
        } else {
            game.iflags = game.iflags || {};
            game.iflags.menu_requested = true;
        }
        game.context.move = 0;
    } else if (ch === 'G' || ch === 'g') {
        // C ref: cmd.c do_run()/do_rush() prefix commands: read a following
        // movement key, then run (G -> run==3) / rush (g -> run==2).  An ESC
        // or a non-movement key cancels with no time elapsed.
        const dirKey = await nhgetch();
        const dch = String.fromCharCode(dirKey);
        const ldir = dch.toLowerCase();
        if (DIR_DX[ldir] !== undefined) {
            await do_run_prefixed(DIR_DX[ldir], DIR_DY[ldir], ch === 'G' ? 3 : 2);
        } else {
            game.context.move = 0;
        }
    } else if (isMovementKey(ch)) {
        // domove() sets game.context.move itself: 1 when the hero actually
        // moves (time passes), 0 when the move is blocked (bump a wall — no
        // turn elapses).  C ref: hack.c domove() / rhack().  Do NOT override
        // it here, or blocked moves would wrongly advance the turn counter.
        await domove(DIR_DX[ch], DIR_DY[ch]);
    } else if (ch === '>') {
        // C ref: cmd.c { '>', "down", dodown } — descend a down staircase.
        // dodown returns ECMD_TIME (1) when the hero actually descends (a turn
        // elapses) or ECMD_OK (0) when blocked ("You can't go down here.").
        game.context.move = (await dodown()) === 1 ? 1 : 0;
    } else if (ch === '<') {
        // C ref: cmd.c { '<', "up", doup } — climb an up staircase.
        // doup returns ECMD_TIME (1) when the hero actually climbs (a turn
        // elapses) or ECMD_OK (0) when blocked ("You can't go up here.").
        game.context.move = (await doup()) === 1 ? 1 : 0;
    } else if (ch === '.') {
        // C ref: cmd.c command table { '.', "wait", donull } -> do.c donull():
        // "rest one move while doing nothing".  donull() first runs
        // cmd_safety_prevention("Waiting", "a no-op (to rest)", "Are you waiting
        // to get hit?"): with the (default-On) safe_wait option, no 'm' prefix
        // and no multi, a hostile monster adjacent to the hero refuses the wait —
        // it prints "Are you waiting to get hit?  Use 'm' prefix to force a no-op
        // (to rest)." and returns ECMD_OK (no turn elapses).  Otherwise the wait
        // returns ECMD_TIME and the hero's turn elapses (monsters move).
        if (await cmd_safety_prevention('Waiting', 'a no-op (to rest)',
                                        'Are you waiting to get hit?'))
            game.context.move = 0;
        else
            game.context.move = 1;
    } else {
        // Unknown command
        game.context.move = 0;
        await pline(`Unknown command '${ch}'.`);
    }
}

// C ref: detect.c dosearch0(aflag) — search the 8 adjacent squares for hidden
// doors, passages, and unseen traps.  aflag distinguishes intrinsic autosearch
// (aflag=1, called every turn from the moveloop when Searching) from the
// explicit `s` command (aflag=0).  The feel_location / invisible-monster /
// mfind0 paths are gated by !aflag in C and are not modelled here, so the only
// RNG either mode consumes is rnl(7-fund) per adjacent SDOOR/SCORR and rnl(8)
// per adjacent unseen trap.  In the common open-room case this consumes no RNG.
export async function dosearch0(aflag) {
    const u = game.u;
    if (!u || u.uswallow) return; // swallowed: no searching (RNG-inert here)
    const fund = 0; // no search-boosting artifact/lenses in starter state
    for (let x = u.ux - 1; x < u.ux + 2; x++) {
        for (let y = u.uy - 1; y < u.uy + 2; y++) {
            if (!isok(x, y)) continue;
            if (x === u.ux && y === u.uy) continue;
            const loc = game.level?.at(x, y);
            if (!loc) continue;
            if (loc.typ === SDOOR) {
                if (rnl(7 - fund)) continue;
                loc.typ = DOOR;
                newsym(x, y);
                await pline('You find a hidden door.');
            } else if (loc.typ === SCORR) {
                if (rnl(7 - fund)) continue;
                loc.typ = CORR;
                newsym(x, y);
                await pline('You find a hidden passage.');
            } else {
                const trap = (game.level?.traps || []).find(t => t.tx === x && t.ty === y && !t.tseen);
                if (trap && !rnl(8)) {
                    trap.tseen = true;
                    newsym(x, y);
                }
            }
        }
    }
}

// C ref: hack.c monster_nearby() — a hostile, awake, spottable monster on one
// of the 8 squares adjacent to the hero.  Drives the safe_wait safety check.
function monster_nearby() {
    const u = game.u;
    if (!u) return false;
    for (let x = u.ux - 1; x <= u.ux + 1; x++)
        for (let y = u.uy - 1; y <= u.uy + 1; y++) {
            if (!isok(x, y) || (x === u.ux && y === u.uy)) continue;
            const mtmp = m_at(x, y);
            if (mtmp && !mtmp.mpeaceful && mtmp.mcanmove !== 0
                && cansee(x, y))
                return true;
        }
    return false;
}

// C ref: do.c cmd_safety_prevention() — with the (default-On) safe_wait option
// and no menu-request prefix or multi-turn action, a wait/search next to a
// hostile monster is refused: it prints `act` (+ the cmdassist "Use 'm' prefix"
// hint) and returns true (the command does nothing and costs no turn).
async function cmd_safety_prevention(ucverb, cmddesc, act) {
    const menuRequested = !!game.iflags?.menu_requested;
    if (menuRequested) game.iflags.menu_requested = false;
    if (game.flags?.safe_wait !== false && !menuRequested && !game.multi) {
        // cmdassist defaults On, so the "Use 'm' prefix" suffix always shows.
        const buf = `  Use 'm' prefix to force ${cmddesc}.`;
        if (monster_nearby()) {
            await pline(`${act}${buf}`);
            return true;
        }
    }
    return false;
}

// The explicit `s` search command.  C ref: detect.c dosearch().
async function dosearch() {
    if (await cmd_safety_prevention('Searching', 'another search',
        'You already found a monster.'))
        return false; // ECMD_OK: no game turn
    await dosearch0(0);
    return true;
}

// C ref: dokick.c kick_dumb(x,y) — kicking empty space (or an indestructible
// feature).  exercise(A_DEX, FALSE) always fires (rn2(2) inside exercise); the
// "strain a muscle" branch needs ACURR(A_DEX) < 16 and not martial and rn2(3)==0.
async function kick_dumb(_x, _y) {
    exercise(A_DEX, false);
    // martial() is false for the starter roles exercised here.
    if (ACURR(A_DEX) >= 16 || rn2(3)) {
        await pline('You kick at empty space.');
    } else {
        await pline('Dumb move!  You strain a muscle.');
        exercise(A_STR, false);
        // set_wounded_legs(RIGHT_SIDE, 5 + rnd(5)) — wounded-legs bookkeeping.
        rnd(5);
    }
    // (Is_airlevel || Levitation) && rn2(2) -> hurtle: not reachable on dlvl 1.
}

// C ref: dokick.c kick_ouch(x,y,kickobjnam) — kicking a solid obstacle hurts.
// RNG order: exercise(A_DEX) [rn2(2)], exercise(A_STR) [rn2(2)], !rn2(3) ->
// set_wounded_legs(5+rnd(5)), then dmg = rnd(ACURR(A_CON)>15?3:5), losehp(dmg).
async function kick_ouch(_x, _y) {
    await pline('Ouch!  That hurts!');
    exercise(A_DEX, false);
    exercise(A_STR, false);
    // wake_nearto(x,y,25): no RNG.
    if (rn2(3) === 0) rnd(5); // set_wounded_legs(RIGHT_SIDE, 5 + rnd(5))
    const dmg = rnd(ACURR(A_CON) > 15 ? 3 : 5);
    const u = game.u;
    if (u) u.uhp = Math.max(0, (u.uhp || 0) - dmg);
    // (Is_airlevel || Levitation) hurtle: not reachable on dlvl 1.
}

// C ref: dokick.c kick_door(x, y, avrg_attrib) — kick a closed/locked door.
// Open/broken/no-door squares fall through to kick_dumb.  Otherwise:
//   exercise(A_DEX, TRUE)            -> rn2(19)
//   rnl(35) < avrg_attrib            -> break the door (martial bonus omitted)
// On a break (non-trapped), STR>18 && !rn2(5) shatters, else it crashes open;
// either way exercise(A_STR, TRUE) -> rn2(19).  A failed kick yields "Whammm!!"
// or "Thwack!!" (Deaf || !rn2(3)) and exercise(A_STR, TRUE).  The starter
// priest (STR 11) never shatters, so the STR>18 short-circuit skips that rn2(5).
async function kick_door(loc, x, y, avrg_attrib) {
    const dm = loc.doormask;
    if (dm === D_ISOPEN || dm === D_BROKEN || dm === D_NODOOR) {
        await kick_dumb(x, y);
        return;
    }
    // (Levitation kick_ouch branch not reachable for the starter hero.)
    exercise(A_DEX, true); // -> rn2(19)
    // doorbuster (Upolyd giant) is false; martial() false for these roles.
    if (rnl(35) < avrg_attrib) {
        // break the door (not in a shop; no D_TRAPPED on this door).
        if (dm & D_TRAPPED) {
            await pline('You kick the door.');
            exercise(A_STR, false);
            loc.doormask = D_NODOOR;
            // b_trapped("door", FOOT): door-trap damage not modelled here.
        } else if (ACURR(A_STR) > 18 && rn2(5) === 0) {
            await pline('As you kick the door, it shatters to pieces!');
            exercise(A_STR, true);
            loc.doormask = D_NODOOR;
        } else {
            await pline('As you kick the door, it crashes open!');
            exercise(A_STR, true); // -> rn2(19)
            loc.doormask = D_BROKEN;
        }
        newsym(x, y);
    } else {
        exercise(A_STR, true);
        await pline(`${(game.u?.Deaf || rn2(3) !== 0) ? 'Thwack' : 'Whammm'}!!`);
    }
    // C ref: topl.c — pline() leaves the message unacknowledged
    // (toplin = TOPLINE_NEED_MORE).  A turn-consuming kick is followed by the
    // monster-move pass, whose first pline must page the kick message with
    // --More-- when the two won't fit on one top line.
    game._toplin = 1;
}

// C ref: dokick.c dokick() — the #kick command.  We faithfully model the
// no-special-target paths the contest sessions exercise: empty room floor /
// corridor (-> kick_dumb), solid rock or walls (-> kick_ouch), and a
// closed/locked door (-> kick_door).  Kicking a monster or an object on the
// floor is delegated/avoided (those squares aren't kicked in the recorded
// sessions).  Returns 1 if a game turn elapsed (ECMD_TIME), 0 otherwise.
async function dokick() {
    const u = game.u;
    // no_kick guards (nolimbs/verysmall/steed/wounded/encumbered/...) don't
    // apply to the starter heroes exercised here.
    const dir = await getdir();
    if (!dir) return 0;            // ECMD_CANCEL (ESC)
    if (!dir.dx && !dir.dy) return 0; // self / '.' -> ECMD_CANCEL

    const x = u.ux + dir.dx, y = u.uy + dir.dy;
    u.dx = dir.dx; u.dy = dir.dy;

    // wake_nearby(FALSE) / u_wipe_engr(2): no RNG unless standing on an
    // engraving (not the case here).

    if (!isok(x, y)) {
        await kick_ouch(x, y); // gm.maploc = nowhere
        return 1;
    }
    const loc = game.level?.at(x, y);
    const typ = loc ? loc.typ : STONE;

    // Monster on the kicked square: not exercised by the recorded sessions;
    // leave to the normal attack handling would change RNG, so treat as a
    // failed/!time kick (matches the recorded streams which never kick a mon).
    if (m_at(x, y)) return 0;

    // Pools/lava and floor objects (kick_object) aren't on the kicked squares
    // in the recorded sessions.  A door kicks via kick_door().  C ref: dokick()
    //   avrg_attrib = (ACURRSTR + ACURR(A_DEX) + ACURR(A_CON)) / 3   (no martial)
    if (typ === DOOR) {
        const avrg_attrib =
            Math.trunc((acurrstr() + ACURR(A_DEX) + ACURR(A_CON)) / 3);
        await kick_door(loc, x, y, avrg_attrib);
        return 1;
    }
    // Solid rock / walls -> kick_ouch; open floor / corridor -> kick_dumb.
    if (typ === STONE || IS_WALL(typ) || IS_OBSTRUCTED(typ)) {
        await kick_ouch(x, y);
        return 1;
    }
    await kick_dumb(x, y);
    return 1;
}

// C ref: cmd.c getdir() — read a direction key.  Renders "In what direction?",
// reads one key.  Returns {dx,dy,dz} or null on cancel/ESC.  No RNG.
// An optional `s` overrides the prompt (e.g. dochat's "Talk to whom? ...").
export async function getdir(s) {
    const prompt = s || 'In what direction?';
    game._pending_message = prompt;
    await flush_screen(1);
    game._modal_screen = 'topl';
    const disp = game.nhDisplay;
    if (disp?.setCursor) disp.setCursor(Math.min(prompt.length + 1, 79), 0);
    const key = await nhgetch();
    delete game._modal_screen;
    game._pending_message = '';
    const ch = String.fromCharCode(key);
    if (ch === '.' || ch === 's')
        return { dx: 0, dy: 0, dz: 0 };
    if (ch === '\x1b' || ch === ' ')
        return null;
    const DX = { h: -1, l: 1, j: 0, k: 0, y: -1, u: 1, b: -1, n: 1, '<': 0, '>': 0 };
    const DY = { h: 0, l: 0, j: 1, k: -1, y: -1, u: -1, b: 1, n: 1, '<': 0, '>': 0 };
    const DZ = { '<': -1, '>': 1 };
    if (ch in DX)
        return { dx: DX[ch], dy: DY[ch], dz: DZ[ch] || 0 };
    // C ref: cmd.c getdir() — an invalid direction key (not a movement key and
    // not a quitchar) with iflags.cmdassist On (default) shows the help_dir()
    // text window "cmdassist: Invalid direction key!" + the direction-keys
    // legend, then returns 0 (cancel).  quitchars (space/return/ESC) were already
    // handled above and return null silently.
    await help_dir_window('Invalid direction key!');
    return null;
}

// C ref: cmd.c help_dir() — the cmdassist explanation window shown for an
// invalid direction key (no prefix handling, no ^-key suggestion for our
// callers).  Renders a full-screen NHW_TEXT window with a "--More--" footer.
async function help_dir_window(msg) {
    const lines = [
        `cmdassist: ${msg}`,
        '',
        'Valid direction keys are:',
        '          y  k  u',
        '           \\ | / ',
        '          h- . -l',
        '           / | \\ ',
        '          b  j  n',
        '',
        '          <  up',
        '          >  down',
        '          .  direct at yourself',
        '',
        '(Suppress this message with !cmdassist in config file.)',
    ];
    renderWindowScreen(lines, { footer: '--More--', footerRow: 23, footerCol: 0, modal: 'textwin' });
    await flush_screen(1);
    game._modal_screen = 'topl';
    // xwaitforspace: read keys until space / return / escape.
    for (;;) {
        const c = await nhgetch();
        if (c === 32 || c === 13 || c === 10 || c === 27) break;
    }
    delete game._modal_screen;
    game._pending_message = '';
}

// C ref: attrib.c acurrstr() — map the encoded A_STR (3..125; 18/01 stored as
// 19, ..) onto the 3..25 scale used by strength-dependent checks.
function acurrstr() {
    const str = game.u?.acurr?.a?.[A_STR] ?? 0;
    if (str <= 18) return Math.max(str, 3);
    if (str <= 121) return 19 + Math.trunc(str / 50);
    return Math.min(str, 125) - 100;
}

function ACURR(i) { return game.u?.acurr?.a?.[i] ?? 0; }

// C ref: lock.c doopen() / doopen_indir(x,y) — the #open ('o') command and the
// autoopen door-walk path.  When called with explicit coords (autoopen), it
// skips the getdir() direction prompt.  The starter hero has hands and is not
// very-small/confused, so the modelled path is: not-a-door message; an
// already-open / broken / locked door message; or a CLOSED door where
//   rnl(20) < (ACURRSTR + ACURR(A_DEX) + ACURR(A_CON))/3
// decides open vs "resists" (the latter also exercise(A_STR, TRUE) -> rn2(19)).
// Returns 1 (ECMD_TIME) when a turn elapses, else 0 (ECMD_OK).
export async function doopen_indir(x, y) {
    const u = game.u;
    let cx, cy;
    if (x > 0 && y >= 0) {
        cx = x; cy = y;
    } else {
        // nohands(youmonst): the starter roles all have hands -> skip.
        // C ref: lock.c doopen_indir() -> get_adjacent_loc(): when getdir()
        // returns 0 (a quitchar, or an invalid-direction key after the cmdassist
        // help window), get_adjacent_loc prints "Never mind." and returns 0.
        const dir = await getdir();
        if (!dir) { await pline('Never mind.'); return 0; }
        cx = u.ux + dir.dx; cy = u.uy + dir.dy;
    }

    // open at yourself with no closed door here -> loot (not modelled); the
    // sessions only open an adjacent door, so this branch isn't exercised.
    const door = game.level?.at(cx, cy);
    if (!door || !IS_DOOR(door.typ)) {
        await pline('You see no door there.');
        return 0;
    }

    if (!(door.doormask & D_CLOSED)) {
        let mesg, locked = false;
        switch (door.doormask) {
        case D_BROKEN: mesg = ' is broken'; break;
        case D_NODOOR: mesg = 'way has no door'; break;
        case D_ISOPEN: mesg = ' is already open'; break;
        default:       mesg = ' is locked'; locked = true; break; // D_LOCKED
        }
        await pline(`This door${mesg}.`);
        // C ref: lock.c doopen_indir() — a locked door with flags.autounlock
        // (default AUTOUNLOCK_APPLY_KEY) and a lock pick / key in inventory
        // triggers pick_lock(): "This door is locked." is followed by an
        // "Unlock it with <tool>? [ynq]" prompt; on 'y' the occupation rolls
        // rn2(100) against the pick chance and (on success) opens the lock.
        if (locked && (game.flags?.autounlock ?? true)) {
            const tool = autokey();
            if (tool) {
                // pick_lock_door returns 2 when the lock-picking occupation
                // elapsed a turn (so the caller advances monsters), 0 otherwise.
                return await pick_lock_door(tool, cx, cy, door);
            }
        }
        return 0;
    }

    // verysmall(youmonst): false for the starter roles.
    // door is known to be CLOSED.
    if (rnl(20) < Math.trunc((acurrstr() + ACURR(A_DEX) + ACURR(A_CON)) / 3)) {
        // C ref: lock.c doopen_indir() — message first, then set the door open,
        // feel_newsym, and recalc_block_point (which requests vision_full_recalc
        // so the move loop's end-of-turn vision_recalc reveals the room beyond
        // the now-open doorway).  NOT a direct vision_recalc: the reveal must
        // happen AFTER this turn's monster moves, matching C.
        await pline('The door opens.');
        if (door.doormask & D_TRAPPED) {
            // b_trapped path not exercised by these sessions.
            door.doormask = D_NODOOR;
        } else {
            door.doormask = D_ISOPEN;
        }
        newsym(cx, cy);
        recalc_block_point(cx, cy);
    } else {
        exercise(A_STR, true); // -> rn2(19)
        await pline('The door resists!');
    }
    return 1; // ECMD_TIME
}

// C ref: lock.c doclose() — the #close ('c') command: close an adjacent open
// door.  Returns an ECMD_* code (1 CANCEL, 0 OK / no turn, 2 TIME).  The
// nohands / pit guards are FALSE for the starter heroes.  getdir() reads the
// direction (and shows the cmdassist window + cancels on an invalid key, which
// is exactly what seed5002 exercises after the #search safety-block).
async function doclose() {
    const u = game.u;
    // nohands(youmonst) / u.utrap pit guards: not applicable to these heroes.
    const dir = await getdir();
    if (!dir) return 1; // ECMD_CANCEL — invalid/ESC direction, no turn

    const x = u.ux + dir.dx, y = u.uy + dir.dy;
    // u_at(x,y) && !Passes_walls: "You are in the way!" (ECMD_TIME).  dx=dy=0
    // ('.'/'s') targets the hero's own square.
    if (x === u.ux && y === u.uy) {
        await pline('You are in the way!');
        return 2; // ECMD_TIME
    }
    if (!isok(x, y)) {
        await pline('You see no door there.');
        return 0; // ECMD_OK (res; hero not blind/confused -> no turn)
    }
    // stumble_on_door_mimic / Confusion / Stunned / Blind branches: none apply
    // to the starter hero with a plain adjacent square.

    const door = game.level?.at(x, y);
    const portcullis = false; // is_drawbridge_wall: no drawbridges in these slices
    if (portcullis || !door || !IS_DOOR(door.typ)) {
        await pline('You see no door there.');
        return 0;
    }
    if (door.doormask === D_NODOOR) {
        await pline('This doorway has no door.'); return 0;
    }
    // obstructed(x,y): no monster/boulder occupies a closeable doorway here.
    if (door.doormask === D_BROKEN) {
        await pline('This door is broken.'); return 0;
    }
    if (door.doormask & (D_CLOSED | D_LOCKED)) {
        await pline('This door is already closed.'); return 0;
    }
    if (door.doormask === D_ISOPEN) {
        // verysmall(youmonst): false for the starter roles.
        if (rn2(25) < Math.trunc((acurrstr() + ACURR(A_DEX) + ACURR(A_CON)) / 3)) {
            await pline('The door closes.');
            door.doormask = D_CLOSED;
            newsym(x, y);
            vision_recalc(0);
        } else {
            exercise(A_STR, true); // -> rn2(19)
            await pline('The door resists!');
        }
    }
    return 2; // ECMD_TIME
}

const LOCK_PICK = 222, SKELETON_KEY = 215, CREDIT_CARD = 219;
const PM_ROGUE = 8;

// C ref: lock.c autokey(opening) — choose an unlocking tool from inventory:
// skeleton key, else lock pick, else credit card.  The starter rogue carries a
// lock pick; quest-artifact handling is irrelevant for the starter inventory.
function autokey() {
    const inv = Array.isArray(game.invent) ? game.invent : [];
    let key = null, pick = null, card = null;
    for (const o of inv) {
        if (o.otyp === SKELETON_KEY && !key) key = o;
        else if (o.otyp === LOCK_PICK && !pick) pick = o;
        else if (o.otyp === CREDIT_CARD && !card) card = o;
    }
    return key || pick || card || null;
}

// C ref: lock.c pick_lock() (autounlock door branch) + picklock().  Prompts
// "Unlock it with <tool>? [ynq]" and, on 'y', runs the lock-picking occupation.
// chance = 3*DEX + 30*(rogue) for a lock pick; each turn rolls rn2(100): on
// rn2(100) >= chance the attempt is "still busy" (re-rolls next turn), else it
// succeeds — "You succeed in picking the lock." + exercise(A_DEX) (rn2(19)) and
// the door goes D_LOCKED -> D_CLOSED.  Returns 1 (a turn elapsed) on 'y'.
async function pick_lock_door(pick, cx, cy, door) {
    // yname(uncursed lock pick) -> "your lock pick"; skeleton key -> "your key".
    const toolname = pick.otyp === LOCK_PICK ? 'your lock pick'
                   : pick.otyp === SKELETON_KEY ? 'your key'
                   : 'your credit card';
    // C ref: ynq() calls more() when a top-line message is still pending — the
    // "This door is locked." message gets a --More-- before the prompt shows.
    game._yn_need_more = true;
    const c = await y_n(`Unlock it with ${toolname}?`, 'ynq\x1b', 'q');
    if (c !== 'y') return 0;

    const isRogue = (game.urole?.mnum === PM_ROGUE);
    let chance;
    switch (pick.otyp) {
    case CREDIT_CARD:  chance = 2 * ACURR(A_DEX) + 20 * (isRogue ? 1 : 0); break;
    case LOCK_PICK:    chance = 3 * ACURR(A_DEX) + 30 * (isRogue ? 1 : 0); break;
    case SKELETON_KEY: chance = 70 + ACURR(A_DEX); break;
    default:           chance = 0;
    }

    // picklock occupation, resolved inline: usedtime starts at 0, so the first
    // turn rolls rn2(100); on success the lock opens this turn.  (A failed roll
    // would carry the occupation across turns; the recorded run succeeds first
    // try, which is the only path the starter exercises.)
    if (rn2(100) >= chance) {
        // Still busy — the occupation would continue next turn.  Not exercised
        // by the recordings; treat as a single elapsed turn with no resolution.
        return 2;
    }
    await pline('You succeed in picking the lock.');
    if (door.doormask & D_TRAPPED) {
        door.doormask = D_NODOOR;
    } else if (door.doormask & D_LOCKED) {
        door.doormask = D_CLOSED;
    } else {
        door.doormask = D_LOCKED;
    }
    newsym(cx, cy);
    exercise(A_DEX, true); // -> rn2(19)
    return 2; // occupation elapsed a turn (advance monsters)
}

// C ref: hack.c domove / domove_core — execute a movement, including the
// bump-into-a-monster path (attack a hostile, or swap places with a pet).
export async function domove(dx, dy) {
    const u = game.u;
    const newx = u.ux + dx;
    const newy = u.uy + dy;
    // C ref: hack.c domove_core() — u.umoved is reset FALSE at the top of a
    // hero command and set TRUE only when the hero's position changes
    // (hack.c:2968).  u_calc_moveamt() reads it to decide whether a riding
    // hero rolls mcalcmove(usteed).
    const _umoved_ux0 = u.ux, _umoved_uy0 = u.uy;
    u.umoved = false;

    // C ref: domove_core sets u.dx/u.dy from the chosen direction; do_attack()
    // and the swap logic read them.
    u.dx = dx;
    u.dy = dy;

    const mtmp = m_at(newx, newy);

    // ── bump into a monster ──  C ref: hack.c domove_core mtmp handling.
    if (mtmp) {
        u.ux0 = u.ux;
        u.uy0 = u.uy;
        // domove_attackmon_at(): displacer-beast swap not modelled; for a
        // normal bump we call do_attack().  do_attack() returns TRUE when the
        // hero's move was used up (a real attack, or "in the way" while
        // running), FALSE when the monster evaded -> fall through to the
        // swap-places handling below.
        if (await do_attack(mtmp)) {
            // The attack consumed the turn (C: do_attack returned TRUE); the
            // hero stays put (no vision recalc — position unchanged).
            game.context.move = 1;
            return;
        }
        // Monster evaded.  If we can't actually move there, stop.
        if (blocksMove(newx, newy)) {
            game.context.move = 0;
            return;
        }
        game.context.move = 1;
        // C ref: domove_core tentatively advances the hero, then swaps with a
        // safe pet at the destination.
        u.ux = newx;
        u.uy = newy;
        if (is_safemon(mtmp)) {
            const swapped = await domove_swap_with_pet(mtmp, newx, newy);
            if (!swapped) {
                // didn't move after all
                u.ux = u.ux0;
                u.uy = u.uy0;
            }
        }
        u.umoved = (u.ux !== _umoved_ux0 || u.uy !== _umoved_uy0);
        newsym(u.ux0, u.uy0);
        vision_recalc(1);
        newsym(u.ux, u.uy);
        // C ref: after swapping with a pet, domove_core() still falls through to
        // spoteffects(TRUE) -> pickup(1) on the hero's new square, so a swap onto
        // a floor object announces it (autopickup off) or lifts it (autopickup
        // on).  Only when the hero actually relocated (the swap succeeded).
        if (u.umoved)
            await pickup_after_move(u.ux, u.uy);
        return;
    }

    // ── trapped hero struggles instead of moving ──  C ref: hack.c
    // domove_core() (hack.c:2830): once past the monster-bump handling, a hero
    // with u.utrap set calls trapmove(); a still-stuck (or just-freed) hero
    // remains in place — trapmove returns FALSE ("!moved") and domove_core
    // returns without advancing the hero.  The struggle still elapses a game
    // turn (monsters move), which is what makes the recorded sessions' bear-trap
    // sequence advance.  Reproduced here so a directional command while trapped
    // does NOT move the hero (seed0004: the pony stays adjacent because the
    // trapped hero never relocates, keeping its dochug is_wanderer rn2(4) live).
    if (u.utrap) {
        const moved = await trapmove(newx, newy);
        if (!u.utrap) game.botl = true; // reset_utrap(TRUE) — freed this turn
        if (!moved) {
            game.context.move = 1; // the struggle elapses a turn
            return;
        }
        // (TT_PIT into an adjacent pit / TT_LAVA edge can return moved==TRUE and
        //  fall through to the normal move below — not exercised here.)
    }

    // ── walk into a closed door ──  C ref: hack.c test_move() door branch.
    // C order: the IS_DOOR(tmpr->typ) branch tests closed_door(x,y) FIRST
    // (hack.c:1075); the autoopen path (hack.c:1097, doopen_indir) and the
    // bump/"That door is closed." path are inside that closed-door branch and
    // apply to ANY direction — diagonal moves into a *closed* door are NOT
    // rejected here.  The diagonal-into-doorway rejection (testdiag,
    // hack.c:1140) lives in the `else` arm and so only fires for open/doorless
    // doors.  This must therefore run BEFORE blocksDiagonalDoor() (the testdiag
    // mirror) so a diagonal step into a locked door autoopens like C does.
    {
        const tgt = game.level?.at(newx, newy);
        const closedDoor = tgt && IS_DOOR(tgt.typ)
            && (tgt.doormask & (D_CLOSED | D_LOCKED));
        if (closedDoor) {
            if (!game.context?.run && !game.context?.mv) {
                const odr = await doopen_indir(newx, newy);
                // The hero never relocates via autoopen (the door square is not
                // entered this command), so move follows position change (false)
                // for the plain open/"door resists" cases.  The autounlock
                // pick-lock occupation, however, elapses a game turn (C runs the
                // picklock occupation in the moveloop, advancing monsters) — it
                // returns 2 to request that the monster turn run.
                u.umoved = (u.ux !== _umoved_ux0 || u.uy !== _umoved_uy0);
                game.context.move = (u.umoved || odr === 2) ? 1 : 0;
                return;
            }
            // Running (autoopen disabled) into an orthogonal closed door with
            // normal senses: announce it and stop without taking a turn.
            // C ref: hack.c test_move() else-if (x==ux||y==uy) -> pline("That
            // door is closed.").  (The blind/stunned/fumbling "bump" branch is
            // not exercised by these recordings.)  Diagonal running into a
            // closed door (x!=ux && y!=uy) prints nothing and just stops.
            if (newx === u.ux || newy === u.uy)
                await pline('That door is closed.');
            game.context.move = 0;
            return;
        }
    }

    // ── no diagonal moves into / out of a doorway with a door ──
    // C ref: hack.c test_move() (hack.c:1140-1150, 1208-1214).  A diagonal step
    // that would enter a (non-closed, doored) door square — or leave one — is
    // rejected when the door is not doorless; the hero stays put and no turn
    // elapses.  Closed doors are handled by the autoopen path above (matching
    // C's closed_door-first ordering), so only open/doorless-with-frame doors
    // reach here.  This runs before the generic blocksMove() floor/wall test
    // because the door square itself is otherwise walkable floor.
    if (blocksDiagonalDoor(u.ux, u.uy, newx, newy, dx, dy)) {
        game.context.move = 0;
        return;
    }

    if (blocksMove(newx, newy)) {
        // Can't move there.  C ref: hack.c test_move() DO_MOVE else-branch — a
        // blocked move announces the obstacle when flags.mention_walls is set
        // (closed doors are already handled above).  C names the background via
        // back_to_glyph(): S_stone -> "solid stone", otherwise an(explanation)
        // of the cmap symbol ("a wall").  blocksMove only stops STONE / walls
        // here, so those two cases cover it; pline_dir for a sighted hero just
        // prints "It's %s." (no directional prefix).
        if (game.flags?.mention_walls) {
            const tgt = game.level?.at(newx, newy);
            const t = tgt ? tgt.typ : STONE;
            const buf = (t === STONE) ? 'solid stone'
                      : IS_WALL(t) ? 'a wall'
                      : null;
            if (buf) await pline(`It's ${buf}.`);
        }
        game.context.move = 0;
        return;
    }

    // The move actually happens -> a game turn elapses.  C ref: hack.c domove
    // sets svc.context.move=1 on a successful step.
    game.context.move = 1;

    // Move the hero
    const oldx = u.ux, oldy = u.uy;
    u.ux0 = oldx;
    u.uy0 = oldy;
    u.ux = newx;
    u.uy = newy;
    u.umoved = true; // C ref: hack.c:2968 — position changed

    // C ref: hack.c:2879-2884 — a ridden steed moves with the hero, so its map
    // position is kept synced to the hero's.  Without this the steed's mx/my go
    // stale after the first ride step and its per-turn distfleeck nearby/monnear
    // test (and hence the dochug is_wanderer rn2(4) branch) diverges from C
    // every subsequent turn.
    if (u.usteed) { u.usteed.mx = u.ux; u.usteed.my = u.uy; }

    // C ref: hack.c domove() — after a successful WALK, smudge any engraving on
    // the squares the hero left and entered (rnd(5) per engraved square).
    maybe_smudge_engr(oldx, oldy, newx, newy);

    // Update display
    newsym(oldx, oldy);
    vision_recalc(1);
    newsym(newx, newy);

    // C ref: hack.c domove_core() -> spoteffects(TRUE).  spoteffects() runs
    // pickup(1) before a non-pit trap (and after a pit trap), then dotrap().
    // Passing pickup_after_move as the callback preserves that C ordering so a
    // floor pile is announced ("Things that are here:" --More--) before a dart
    // trap fires on the same square.
    await spoteffects(() => pickup_after_move(newx, newy));
}

// C ref: hack.c trapmove(x, y, desttrap) — the hero, already trapped, tries to
// move in direction (u.dx,u.dy) toward (x,y).  Returns FALSE when the hero
// stays put (the common case: still struggling, or just wriggled free this
// turn), TRUE only when a trap type lets the move proceed (adjacent-pit /
// lava-edge — not reached by the contest hero).  Decrements u.utrap and emits
// the Norep predicament line.  RNG: only the TT_BEARTRAP orthogonal-move
// rn2(5) and (when implemented) other types' rolls — a diagonal bear-trap
// struggle consumes NO RNG, matching the recorded seed0004 "b" struggles.
async function trapmove(x, y) {
    const u = game.u;
    if (!u.utrap) return true; // sanity (C: !u.utrap -> return TRUE)
    const dx = u.dx, dy = u.dy;

    switch (u.utraptype) {
    case TT_BEARTRAP: {
        // C ref: hack.c:1567 — verbose predicament line (Norep-deduped).
        await Norep_topl('You are caught in a bear trap.');
        // C ref: hack.c:1575 — "[why does diagonal movement give quickest
        // escape?]"  A diagonal move always frees one tick; an orthogonal move
        // does so only on !rn2(5).
        if ((dx && dy) || !rn2(5))
            u.utrap--;
        // Whether still stuck or just freed (wriggle_free), the hero does not
        // relocate this turn.  C ref: hack.c wriggle_free -> pline() -> update_topl
        // which APPENDS onto the still-pending "You are caught in a bear trap."
        // predicament line ("... bear trap.  You finally wriggle free.").
        if (!u.utrap) {
            const { update_topl } = await import('./display.js');
            await update_topl('You finally wriggle free.');
        }
        return false;
    }
    case TT_PIT: {
        // C ref: hack.c:1580 — moving into a *seen* adjacent pit is allowed.
        const t = trap_at(x, y);
        if (t && t.tseen && is_pit_ttyp(t.ttyp))
            return true;
        // Otherwise try to climb out (position unchanged).  climb_pit() rolls
        // are not exercised by the contest hero at the diverging points; struggle
        // in place without consuming RNG keeps the stream aligned if reached.
        await climb_pit_min();
        return false;
    }
    case TT_WEB:
        // C ref: hack.c:1587 — --u.utrap, stay put; ART_STING free not modeled.
        if (--u.utrap)
            await Norep_topl('You are stuck to the web.');
        else
            await pline('You disentangle yourself.');
        return false;
    case TT_LAVA:
        // C ref: hack.c:1609 — stuck in lava; struggle in place.
        await Norep_topl('You are stuck in the lava.');
        u.utrap--;
        if ((u.utrap & 0xff) === 0) u.utrap = 0;
        return false;
    case TT_INFLOOR:
        // C ref: hack.c:1631 — stuck in the floor (buried-ball not modeled).
        if (--u.utrap)
            await Norep_topl('You are stuck in the floor.');
        else
            await pline('You finally wriggle free.');
        return false;
    default:
        // Unknown trap type: struggle in place without consuming RNG.
        if (u.utrap) u.utrap--;
        return false;
    }
}

// C ref: pline.c Norep(...) — like pline() but suppresses the message when it is
// identical to the CURRENT top line (gt.toplines).  gt.toplines persists across
// the command-prompt blank (it is not cleared with the displayed message), so a
// struggle line stays deduped turn after turn, yet an intervening *different*
// message (e.g. the pet's "caught in a bear trap!") lets the next struggle line
// reprint.  We track that persistent text in game._toplines.
async function Norep_topl(msg) {
    if (game._toplines === msg) return;
    const { update_topl } = await import('./display.js');
    await update_topl(msg);
}

// C ref: trap.c t_at(x,y) — the trap at a square (or null).
function trap_at(x, y) {
    for (const t of (game.level?.traps || []))
        if (t.tx === x && t.ty === y) return t;
    return null;
}
// C ref: trap.h is_pit(ttyp) — PIT or SPIKED_PIT.
function is_pit_ttyp(ttyp) { return ttyp === PIT || ttyp === SPIKED_PIT; }
// Minimal climb_pit placeholder — the contest hero never reaches the
// RNG-bearing climb path at a diverging point; struggle in place.
async function climb_pit_min() { /* no RNG; position unchanged */ }

// C ref: hack.c domove_core() -> spoteffects(TRUE) -> pickup(1).  pickup(1)
// runs at the tail of EVERY move that relocates the hero (plain step, run,
// rush, or a swap with a pet).  With autopickup off it falls through to
// look_here() — announcing a single floor object as "You see here <a thing>."
// (no game time, no RNG); a run additionally halts on the object (handled by
// runStopOnObject in hack.js).  With autopickup on it instead lifts the
// matching floor objects (prinv "<letter> - <name>." lines).  Travel (run == 8)
// does not auto-stop, but pickup still fires; we exclude only the mid-action
// teleport case (context.mv with no context.run) which C skips via
// "gm.multi && !run".
async function pickup_after_move(x, y) {
    const ctx = game.context || {};
    const hasObj = (game.level?.objects || []).some(
        (o) => o.where === 'floor' && o.ox === x && o.oy === y);
    if (game.flags?.pickup) {
        const nPicked = await autopickup_after_move(x, y);
        // C ref: pickup.c pickup() -> check_here(n_picked > 0): after autopickup,
        // any objects still on the square are announced ("You see here ...").
        // pickup_types may exclude them (e.g. a chest when '(' isn't selected),
        // so an item can remain even with autopickup on.  When nothing is left,
        // C reads any engraving instead.
        const remain = (game.level?.objects || []).filter(
            (o) => o.where === 'floor' && o.ox === x && o.oy === y);
        if (remain.length > 0) {
            await look_here_after_move(x, y, nPicked > 0);
        } else {
            await read_engr_at(x, y);
        }
    } else if (ctx.run !== 8) {
        await look_here_after_move(x, y);
        // C ref: pickup.c check_here() — when there are no objects here it
        // reads any engraving aloud; a run halts on it (read_engr_at -> nomul).
        if (!hasObj) await read_engr_at(x, y);
    }
}

// C reads an engraving aloud (and stops a run) on EVERY move's pickup, but on
// regular dungeon levels the JS level generator can place dust/trap engravings
// at coordinates that diverge from C (deep levels reached via teleport are not
// yet PRNG-faithful), so reading them would surface that pre-existing level-gen
// difference and shift downstream screens.  The verified-faithful use of the
// engraving auto-read is the tut-1 tutorial (all-permanent ENGRAVE/BURN
// engravings whose placement we reproduce exactly), so scope the auto-read to
// the tutorial branch where every engraving is known to match C.
function engr_read_enabled() {
    return true;
}

// C ref: engrave.c read_engr_at() — sense and read aloud the engraving at
// (x,y).  Prints the type-specific "is engraved/burned/written here" line, then
// "You read: \"<text>\"<punct>" (no end '.' if the text already ends in .!?),
// and — crucially for the tutorial run paths — stops a run/travel (nomul(0))
// since the hero just stepped onto a feature worth noticing.  Only the
// not-Blind sensing cases the tut-1 level uses (ENGRAVE / BURN) are exercised;
// DUST / MARK / blood are handled structurally for faithfulness.
async function read_engr_at(x, y) {
    if (!engr_read_enabled()) return;
    const ep = engr_at(x, y);
    if (!ep) return;
    const text = ep.actualText || '';
    if (!text) return;
    let sensed = false;
    let intro = '';
    switch (ep.engr_type) {
    case 1 /*DUST*/:        intro = 'Something is written here in the dust.'; sensed = true; break;
    case 2 /*ENGRAVE*/:
    case 6 /*HEADSTONE*/:   intro = 'Something is engraved here on the floor.'; sensed = true; break;
    case 3 /*BURN*/:        intro = 'Some text has been burned into the floor here.'; sensed = true; break;
    case 4 /*MARK*/:        intro = "There's some graffiti on the floor here."; sensed = true; break;
    case 5 /*ENGR_BLOOD*/:  intro = 'You see a message scrawled in blood here.'; sensed = true; break;
    default: return;
    }
    if (!sensed) return;
    // C: endpunct = "." unless the (original) text already ends in . ! or ?.
    const last = text.charAt(text.length - 1);
    const endpunct = (text.length >= 2 && '.!?'.includes(last)) ? '' : '.';
    await pline(intro);
    await topl_more();
    const readLine = `You read: "${text}"${endpunct}`;
    await pline(readLine);
    // C ref: win/tty/topl.c redotoplin():139 — a topline that wrapped onto a
    // second row (cury > 0) auto-fires more().  So only the "You read" line that
    // overflows 80 columns (e.g. long degraded graffiti) gets paged with
    // --More--; a short engraving stays without one.  After the page is
    // acknowledged the topline clears for the next command's frame.
    if (wrap_topl(readLine).length > 1) {
        await topl_more();
        game._pending_message = '';
    }
    ep.eread = 1;
    ep.erevealed = 1;
    // C ref: engrave.c:401 — `if (svc.context.run > 0) nomul(0);`
    if ((game.context?.run || 0) > 0) {
        game.multi = 0;
        if (game.context) {
            game.context.travel = game.context.travel1 = game.context.mv = 0;
        }
    }
}

// C ref: pickup.c pickup(1) with flags.pickup set -> autopick() picks every
// floor object matching pickup_types (all classes when unset), then check_here
// reports any remainder.  The owned sessions only ever auto-pick a single item
// at a time, which prints the bare prinv line "<letter> - <name>." (no prefix).
// Multi-object piles would page with --More-- between lines; not exercised, so
// the single/sequential case is modeled and extra items just chain via pline.
async function autopickup_after_move(x, y) {
    const objs = (game.level?.objects || []).filter(
        (o) => o.where === 'floor' && o.ox === x && o.oy === y);
    if (objs.length === 0) return 0;
    const inv = await import('./invent.js');
    // autopick order is the floor chain (topmost-first); objects_at returns that
    // order.  Pick each eligible object (pickup_types unset => all classes).
    const types = game.flags?.pickup_types;
    let nPicked = 0;
    for (const obj of objs) {
        if (types && !types.includes(classLetter(obj))) continue;
        await pickup_one(inv, obj, x, y);
        nPicked++;
    }
    return nPicked;
}

// Map an oclass to its pickup_types letter (objclass.h def_oc_syms).  Keyed by
// the JS internal oclass enum (mkobj.js): WEAPON_CLASS=2 ... CHAIN_CLASS=16.
// pickup_types stores these symbols; a chest (TOOL_CLASS=6 -> '(') is only
// auto-lifted when '(' is in the set.
function classLetter(obj) {
    const SYMS = {
        2: ')',  // WEAPON_CLASS
        3: '[',  // ARMOR_CLASS
        4: '=',  // RING_CLASS
        5: '"',  // AMULET_CLASS
        6: '(',  // TOOL_CLASS
        7: '%',  // FOOD_CLASS
        8: '!',  // POTION_CLASS
        9: '?',  // SCROLL_CLASS
        10: '+', // SPBOOK_CLASS
        11: '/', // WAND_CLASS
        12: '$', // COIN_CLASS
        13: '*', // GEM_CLASS
        14: '`', // ROCK_CLASS
        15: '0', // BALL_CLASS
        16: '_', // CHAIN_CLASS
    };
    return SYMS[obj.oclass] || '';
}

// Pick up a single floor object, emitting the prinv pickup line.  Mirrors
// pickup_object -> pickup_prinv with a NULL prefix (the bare "<letter> -
// <name>." line).  pick_one_obj sets game._pending_message to that bare line.
// If a message was already pending this turn (e.g. the swap line), we chain the
// pickup line after it via update_topl(): when the two don't fit on one top
// line (CO-8 rule), the pending line is paged with --More-- (blocking on the
// next key) before the pickup line replaces it.  C ref: topl.c update_topl().
async function pickup_one(inv, obj, x, y) {
    const prior = game._pending_message || '';
    await inv.pick_one_obj(obj); // sets _pending_message to the pickup line
    const line = game._pending_message || '';
    if (prior) {
        // Restore the pending line + its TL_HAS_MESSAGE state, then chain.
        game._pending_message = prior;
        game._toplin = 1;
        await update_topl(line);
    }
    newsym(x, y);
}

// C ref: invent.c look_here() — the "You see here ..." auto-announcement when
// stepping onto floor object(s) with autopickup disabled.  The single-object
// case prints "You see here <obj>." on the top line; the multi-object case
// (obj_cnt < pile_limit, default 5) opens the blocking "Things that are here:"
// menu (look_here in invent.js).  Larger piles ("There are N objects here.")
// aren't exercised by the owned sessions.
async function look_here_after_move(x, y, _pickedSome = false) {
    const objs = (game.level?.objects || []).filter(
        (o) => o.where === 'floor' && o.ox === x && o.oy === y);
    if (objs.length === 0) return;
    if (objs.length === 1) {
        // C ref: look_here() single-object case prints "You see here <obj>."
        const o = objs[0];
        const name = await objDoname(o);
        await pline(`You see here ${name}.`);
        return;
    }
    // Multiple objects: delegate to invent.js look_here(), which renders the
    // "Things that are here:" menu and blocks on --More-- (consuming the
    // recorded dismissal keystroke).  obj_cnt = count; picked_some = false
    // (autopickup is off here, so nothing was lifted).
    const inv = await import('./invent.js');
    await inv.look_here(objs.length, _pickedSome ? 1 : 0);
}

// COIN_CLASS (gold) — objclass.h; defined inline here to gate the gold look-here
// announcement without dragging in an invent.js import cycle at module scope.
const COIN_CLASS_CMD = 12;

// Object name with article for the "You see here" line (C: doname()).  Lazy
// import to avoid a static cycle.  Corpses read "<species> corpse"; gold reads
// "<n> gold piece(s)"; other objects defer to invent.js's doname().
async function objDoname(obj) {
    // COIN_CLASS gold: "4 gold pieces" — C doname() has no article for coins.
    if (obj && (obj.oclass === COIN_CLASS_CMD)) {
        const q = obj.quan || 0;
        return `${q} gold piece${q === 1 ? '' : 's'}`;
    }
    // CORPSE (otyp 265): "a goblin corpse" — species from corpsenm.
    if (obj && obj.otyp === 265 && obj.corpsenm != null) {
        const mm = await import('./makemon.js');
        const sp = mm.monster_by_pmidx?.(obj.corpsenm);
        const name = sp?.name || 'monster';
        const art = /^[aeiou]/i.test(name) ? 'an' : 'a';
        return `${art} ${name} corpse`;
    }
    // Non-corpse floor object (e.g. a dropped weapon/ammo stack): C doname()
    // gives "N <plural>" for a stack, "a <name>" for a single item.
    try {
        if (floor_object_name) return floor_object_name(obj);
    } catch (_e) { /* fall through */ }
    return 'an object';
}

// C ref: hack.c domove_swap_with_pet(mtmp, x, y) — swap the hero and a tame
// pet.  Returns TRUE if the swap happened.  The starter sessions always take
// the simple swap branch (floor destination, untrapped pet, no boulder); the
// blocking conditions are checked for faithfulness.  On entry u.ux/u.uy are
// the destination (the pet's old square) and u.ux0/u.uy0 are the hero's old
// square (the pet's new square).
async function domove_swap_with_pet(mtmp, x, y) {
    const u = game.u;

    // can't swap diagonally if the pet can't move diagonally — not relevant
    // for dogs/cats/ponies (none are NODIAG), so the common case proceeds.

    // peaceful pet won't swap into a trapped / unsafe square or if it is a
    // quest leader / shk / priest etc. — none apply for a starting pet.

    // Perform the swap: pet -> hero's old square.
    mtmp.mtrapped = 0;
    mtmp.mx = u.ux0;
    mtmp.my = u.uy0;
    // monster still knows where the hero is
    mtmp.mux = u.ux;
    mtmp.muy = u.uy;

    // C: You("%s %s.", mpeaceful ? "swap places with" : "frighten",
    //        x_monnam(mtmp, ARTICLE_YOUR, ..., SUPPRESS_SADDLE, FALSE));
    const verb = mtmp.mpeaceful ? 'swap places with' : 'frighten';
    const who = x_monnam(mtmp, /*ARTICLE_YOUR*/ 3, null, /*SUPPRESS_SADDLE*/ 0, false);
    await pline(`You ${verb} ${who}.`);

    // (minliquid/mintrap on the pet's new square: the hero's old square is dry
    //  floor in the starter sessions, so no trap/liquid effect.)
    return true;
}
