// cmd.js — Command dispatch and movement.
// C ref: cmd.c rhack(), hack.c domove().
//
// Minimal skeleton: only hjklyubn movement is implemented.
// Contestants should add: search, kick, eat, drink, read, zap,
// wear, wield, drop, throw, pray, cast, and all other commands.

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { newsym, flush_screen, pline, m_at, update_topl, y_n, topl_more, wrap_topl, see_nearby_objects, map_invisible, unmap_object } from './display.js';
import { vision_recalc, cansee, recalc_block_point, Blind } from './vision.js';
import { do_attack, is_safemon, x_monnam, canspotmon, mon_nam } from './uhitm.js';
import { ddoinv, dismiss_invent_screen, dolook,
         dodiscovered, doattributes, dovspell,
         attr_window_advance, dowieldquiver, dowield, dothrow, dofire, dotravel, dodrop,
         dopickup, dowear, dotakeoff, doputon, doremring, dopay, floor_object_name,
         doprgold, doprwep, doprarm, doprring, dopramulet,
         renderWindowScreen, ECMD_NOTHANDLED, describe_decor, dfeature_at } from './invent.js';
import { WEAPON_CLASS, objects as OBJECTS } from './mkobj.js';
import { doeat } from './eat.js';
import { doapply, ECMD } from './apply.js';
import { dodrink } from './potion.js';
import { dozap } from './zap.js';
import { docast } from './spell.js';
import { doread } from './read.js';
import { dohelp } from './pager.js';
import { rnl, rn2, rnd } from './rng.js';
import { doextcmd, hooked_tty_getlin, wiz_wish, wiz_genesis } from './extcmd-handlers.js';
import { skill_window_advance } from './enhance.js';
import { wiz_level_tele, dodown, doup } from './do.js';
import { spoteffects, t_at, immune_to_trap, into_vs_onto, trap_explanation,
         TRAP_CLEARLY_IMMUNE } from './trap.js';
import { doset, dosetSimple } from './doset.js';
import { do_run, do_run_prefixed, isRunKey, RUN_DX, RUN_DY, do_farlook, do_look_full, dotele_wizard, doterrain, avoid_moving_on_trap } from './hack.js';
import { COLNO, ROWNO, STONE, DOOR, D_CLOSED, D_LOCKED,
         D_ISOPEN, D_BROKEN, D_NODOOR, D_TRAPPED,
         SDOOR, SCORR, CORR, IS_WALL, IS_OBSTRUCTED, IS_ROCK, isok, IS_DOOR,
         IS_STWALL, IS_FURNITURE, ACCESSIBLE,
         TREE, IRONBARS, POOL, MOAT, WATER, LAVAPOOL, LAVAWALL, ROOM, IS_POOL, IS_LAVA,
         A_STR, A_DEX, A_CON, A_WIS, Is_rogue_level,
         TT_BEARTRAP, TT_PIT, TT_WEB, TT_LAVA, TT_INFLOOR,
         PIT, SPIKED_PIT, TIP_SWIM, TRAPNUM } from './const.js';
import { exercise, acurr_eff } from './attrib.js';
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

// C ref: cmd.c extcmdlist[] — each command's default key.  A nethackrc
// BIND=key:command entry replaces Cmd.commands[key] with the named command; our
// dispatcher keys on each command's default character, so a bound key is
// translated to the command's default key (below) before dispatch.  Ctrl-keys
// are their literal control code.
const CMD_DEFAULT_KEY = {
    apply: 'a', attributes: '\x18', autopickup: '@', call: 'C', cast: 'Z',
    chronicle: 'v', close: 'c', down: '>', drop: 'd', droptype: 'D',
    eat: 'e', engrave: 'E', fight: 'F', fire: 'f', glance: ';', help: '?',
    inventory: 'i', inventtype: 'I', kick: '\x04', known: '\\', knownclass: '`',
    look: ':', open: 'o', options: 'O', overview: '\x0f', pay: 'p',
    perminv: '|', pickup: ',', prevmsg: '\x10', puton: 'P', quaff: 'q',
    quiver: 'Q', read: 'r', redraw: '\x12', remove: 'R', repeat: '\x01',
    reqmenu: 'm', retravel: '\x1f', run: 'G', rush: 'g', save: 'S',
    search: 's', seeall: '*', seeamulet: '"', seearmor: '[', seerings: '=',
    seetools: '(', seeweapon: ')', shell: '!', showgold: '$', showspells: '+',
    showtrap: '^', suspend: '\x1a', swap: 'x', takeoff: 'T', takeoffall: 'A',
    teleport: '\x14', terrain: '\x7f', throw: 't', travel: '_', twoweapon: 'X',
    up: '<', versionshort: 'V', wait: '.', wear: 'W', whatdoes: '&',
    whatis: '/', wield: 'w', zap: 'z',
};

// C ref: cmd.c reset_commands() — with number_pad off the movement keys bind
// three ways per direction: the plain letter -> walk (do_move, run==0), the
// capitalized letter -> run (do_run, run==1, handled by isRunKey), and
// C(<letter>) i.e. Ctrl+letter -> rush (do_rush, run==3).  Map each of the 8
// direction control codes (letter & 0x1f) to its direction letter so the rush
// binding is faithful.  C('j') == 10 (LF) is caught earlier with Return, so it
// isn't listed here.
const CTRL_RUSH_DIR = (() => {
    const m = {};
    for (const letter of 'hklyubn') // 'j' -> 10 handled with Return
        m[letter.charCodeAt(0) & 0x1f] = letter;
    return m;
})();

// C ref: hack.c — check if a cell blocks movement
export function blocksMove(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return true;
    // C ref: hack.c test_move() first physical-obstacle test —
    //     if (IS_OBSTRUCTED(tmpr->typ) || tmpr->typ == IRONBARS) { ... return FALSE }
    // with IS_OBSTRUCTED(typ) == ((typ) < POOL), i.e. STONE, every wall type,
    // TREE, and the two *secret* terrains SDOOR and SCORR.  A secret door is
    // drawn as the wall it hides, so it looks passable to a test that only
    // rejects IS_WALL — the hero would walk straight through an unfound secret
    // door while C bumps and loses no turn.  The Passes_walls / tunnels /
    // autodig / metallivorous escapes all need an intrinsic or a wielded pick
    // that no covered hero has, so the obstruction is unconditional here.
    if (IS_OBSTRUCTED(loc.typ) || loc.typ === IRONBARS) return true;
    if (loc.typ === DOOR && (loc.doormask & (D_CLOSED | D_LOCKED))) return true;
    return false;
}

// C ref: dbridge.c is_pool(x,y) — POOL/MOAT/WATER (the Juiblex-moat nuance is
// omitted; not reached by the corpus).
function isPoolTerrain(x, y) {
    if (!isok(x, y)) return false;
    const t = game.level?.at(x, y)?.typ;
    return t === POOL || t === MOAT || t === WATER;
}

// C ref: hack.c u_simple_floortyp(x,y) — simplified floor liquid/solid state
// used by swim_move_danger() to detect a dry<->wet terrain transition.  A
// levitating/flying hero never touches the liquid below (Underwater and the
// water-level nuance aren't reached by the corpus).
function u_simple_floortyp(x, y) {
    const loc = game.level?.at(x, y);
    const typ = loc ? loc.typ : STONE;
    const u = game.u;
    const airborne = !!(u?.uprops?.Levitation || u?.uprops?.Flying);
    if (typ === WATER) return WATER; // wall of water: fly/lev doesn't matter
    if (typ === LAVAWALL) return LAVAWALL; // wall of lava: fly/lev doesn't matter
    if (!airborne) {
        if (isPoolTerrain(x, y)) return POOL;
        if (IS_LAVA(typ)) return LAVAPOOL;
    }
    return ROOM;
}

// C ref: pager.c waterbody_name(x,y) — non-hallucinating water-body name; the
// special-level and hallucination variants aren't reached by the corpus.
function waterbody_name(x, y) {
    const loc = game.level?.at(x, y);
    const typ = loc ? loc.typ : STONE;
    if (typ === LAVAPOOL) return 'molten lava';
    if (typ === MOAT) return 'moat';
    if (typ === WATER) return 'wall of water';
    if (typ === LAVAWALL) return 'wall of lava';
    return 'pool of water';
}

// C ref: hack.c handle_tip(TIP_SWIM) — the first time paranoid_confirm:swim
// blocks a step into water/lava, remind the player of the 'm' prefix (tracked
// so it only shows once, via the same game._tips_shown bitmask
// handle_getpos_tip() in invent.js uses for TIP_GETPOS).
async function handle_swim_tip() {
    if (game._tips_shown && (game._tips_shown & (1 << TIP_SWIM))) return;
    game._tips_shown = (game._tips_shown || 0) | (1 << TIP_SWIM);
    const { update_topl } = await import('./display.js');
    await update_topl(`(Tip: use 'm' prefix to step in if you really want to.)`);
}

// C ref: hack.c swim_move_danger(x,y) — is it dangerous/unwanted for the hero
// to step onto (x,y) due to water or lava?  A dry<->wet transition onto a
// *seen*, unimpaired square blocks the move with a message unless the 'm'
// (nopick) prefix was used — matching the on-by-default paranoid_confirm:swim.
// Water-walking/lava-walking boots and Underwater are never worn/reached by
// the corpus, so those branches just don't fire.
async function swim_move_danger(x, y) {
    const u = game.u;
    const loc = game.level?.at(x, y);
    const typ = loc ? loc.typ : STONE;
    const newtyp = u_simple_floortyp(x, y);
    const liquidWall = (newtyp === WATER) || (newtyp === LAVAWALL);
    if (u.uprops?.Underwater && (isPoolTerrain(x, y) || newtyp === WATER))
        return false;
    const stunned = (u.uprops?.Stun || 0) > 0 || !!u.Stunned;
    const confused = (u.uprops?.Confusion || 0) > 0;
    const seenv = loc ? (loc.seenv || 0) : 0;
    const pool = isPoolTerrain(x, y);
    const lava = IS_LAVA(typ);
    if (newtyp !== u_simple_floortyp(u.ux, u.uy) && !stunned && !confused && seenv
        && (pool || lava || liquidWall)) {
        const curTyp = game.level?.at(u.ux, u.uy)?.typ ?? STONE;
        if (pool || (lava && !IS_LAVA(curTyp)) || liquidWall) {
            if (game.context?.nopick) {
                game._tips_shown = (game._tips_shown || 0) | (1 << TIP_SWIM);
                return false;
            }
            // ParanoidSwim (paranoid_confirm:swim) is on by default.
            const { update_topl } = await import('./display.js');
            await update_topl(`You avoid stepping into the ${waterbody_name(x, y)}.`);
            await handle_swim_tip();
            return true;
        }
    }
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

// C ref: hack.c:991 test_move(ux,uy,dx,dy,TEST_MOVE) — "would this step be
// viable at all", the silent query the paranoid_confirm:trap gate makes before
// it bothers asking.  TEST_MOVE rejects the same things the DO_MOVE walk in
// domove() below rejects: an obstruction or iron bars (hack.c:1011), a closed
// door (hack.c:1075-1136), and a diagonal into or out of an intact doorway
// (hack.c:1140-1150, 1208-1214) — it just prints nothing and pushes nothing.
// Not modelled: the boulder arm (hack.c:1216) only rejects when
// svc.context.run >= 2, which can never reach this gate because a rush over a
// seen trap already stopped in avoid_running_into_trap(); and the diagonal
// bad_rock squeeze (hack.c:1153) which this port's DO_MOVE does not model
// either, so both tests agree.
function test_move_quiet(x, y) {
    const u = game.u;
    if (!isok(x, y)) return false;
    if (blocksMove(x, y)) return false;
    if (blocksDiagonalDoor(u.ux, u.uy, x, y, u.dx, u.dy)) return false;
    return true;
}

// C ref: hack.c:2494-2509 avoid_running_into_trap_or_liquid(x,y), called from
// domove_core() at hack.c:2757 — BEFORE the monster-bump block and long before
// the paranoid prompt.  While running, stepping onto a known trap stops the
// hero instead of prompting: run >= 2 (rush 'g', run 'G', travel run==8) sets
// context.move = 0 and returns, so C never asks; run == 1 (shift-direction)
// only nomul(0)s and walks on, and then the prompt below does fire.
// The `Blind && avoid_moving_on_liquid()` half of C's test needs
// Known_wwalking/Known_lwalking, which this port has no predicate for, and is
// left unported.
async function avoid_running_into_trap(x, y) {
    const c = game.context;
    const would_stop = ((c?.run || 0) >= 2);
    if (!c?.run) return false;
    if (!avoid_moving_on_trap(x, y)) return false;
    // C emits this from inside avoid_moving_on_trap(x, y, msg) (hack.c:2452).
    if (would_stop && game.flags?.mention_walls) {
        const t = t_at(x, y);
        if (t) await pline(`You stop in front of ${an(trap_explanation(t.ttyp))}.`);
    }
    game.multi = 0; // C nomul(0)
    if (!would_stop) return false;
    c.move = 0;
    return true;
}

// C ref: hack.c:2514-2582 avoid_trap_andor_region(x,y) — the
// paranoid_confirm:trap gate, called from domove_core() at hack.c:2826 (after
// u_rooted(), before trapmove()/test_move(DO_MOVE)).  TRUE => the hero declined
// to step onto the trap: no move, no elapsed turn.  options.c:7173 defaults
// flags.paranoia_bits to PARANOID_PRAY|PARANOID_SWIM|PARANOID_TRAP and no
// session changes it, so ParanoidTrap is always on.  ParanoidConfirm is NOT
// among the defaults, so paranoid_query() is the plain
// yn_function(prompt, "yn", 'n') arm (cmd.c:5645, cmd.c:5657).
//
// "Really step" / "Step into" are C's u_locomotion("step") (hack.c:1817) — a
// levitating hero reads "float", a flying one "fly", a mounted one "ride".
// Levitation and Flying make every ground trap CLEARLY_IMMUNE, so only a rider
// could see a different verb on the trap question.
// The Hallucination arm below is dead in this port: hallucination is fragmented
// across u.uhallu / u.HHallucination / u.uprops.Hallucination and nothing ever
// sets any of them, so the rnd(TRAPNUM - 1) name roll never fires.
async function avoid_trap_andor_region(x, y) {
    const u = game.u;
    const c = game.context;
    const stunned = (u.uprops?.Stun || 0) > 0 || !!u.Stunned;
    const confused = (u.uprops?.Confusion || 0) > 0;
    // C: `!svc.context.nopick || svc.context.run` — the 'm' prefix opts out.
    const nopick_opt_out = (c?.nopick && !c?.run);

    // ── visible gas-cloud region (hack.c:2521-2550) ──  Entering a visible
    // region is treated like entering a trap.  Moving from one region into
    // another only asks when the new one damages (poison gas) and the old one
    // does not (vapor).  Poison resistance deliberately does NOT suppress this:
    // the cloud blocks vision either way.
    if (!stunned && !confused && !Blind() && !u.uhallu && !nopick_opt_out) {
        const { visible_region_at, reg_damg } = await import('./region.js');
        const newreg = visible_region_at(x, y);
        const oldreg = newreg ? visible_region_at(u.ux, u.uy) : null;
        if (newreg && (!oldreg || (reg_damg(newreg) > 0 && reg_damg(oldreg) === 0))
            && test_move_quiet(x, y)) {
            // C: Snprintf("%s into that %s cloud?", ...) then upstart().
            const q = `Step into that ${reg_damg(newreg) > 0 ? 'poison gas' : 'vapor'} cloud?`;
            if (await y_n(q) !== 'y') {
                game.multi = 0; // C nomul(0)
                c.move = 0;
                return true;
            }
        }
    }

    if (stunned || confused) return false;
    if (nopick_opt_out) return false;
    const trap = t_at(x, y);
    if (!trap || !trap.tseen) return false;
    if (!test_move_quiet(x, y)) return false;
    const hallu = !!u.uhallu;
    // Harmless-to-this-hero traps are stepped on without comment; Hallucination
    // overrides that because every trap still shows as a bare '^'.
    if (!hallu && immune_to_trap(u, trap.ttyp) === TRAP_CLEARLY_IMMUNE)
        return false;
    const traptype = hallu ? rnd(TRAPNUM - 1) : trap.ttyp;
    const qbuf = `Really step ${into_vs_onto(traptype) ? 'into' : 'onto'}`
               + ` that ${trap_explanation(traptype)}?`;
    if (await y_n(qbuf) === 'y') return false;
    game.multi = 0; // C nomul(0)
    c.move = 0;
    return true;
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

    let ch = String.fromCharCode(key);

    // C ref: cmd.c parsebindings() — a nethackrc BIND=key:command entry rebinds
    // `key` to run `command`.  Translate a custom-bound key to that command's
    // default key so the existing (default-key) dispatch below handles it.
    if (game.keybind && Object.prototype.hasOwnProperty.call(game.keybind, ch)) {
        const dflt = CMD_DEFAULT_KEY[game.keybind[ch]];
        if (dflt !== undefined) {
            ch = dflt;
            key = ch.charCodeAt(0);
        }
    }

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
    } else if (ch === '$') {
        // C ref: cmd.c { GOLD_SYM, "showgold", ..., doprgold } — show wallet gold.
        await doprgold();
        game.context.move = 0;
    } else if (ch === ')') {
        // C ref: cmd.c { WEAPON_SYM, "seeweapon", ..., doprwep } — wielded weapon.
        await doprwep();
        game.context.move = 0;
    } else if (ch === '[') {
        // C ref: cmd.c { ARMOR_SYM, "seearmor", ..., doprarm } — worn armor.
        await doprarm();
        game.context.move = 0;
    } else if (ch === '=') {
        // C ref: cmd.c { RING_SYM, "seerings", ..., doprring } — worn ring(s).
        await doprring();
        game.context.move = 0;
    } else if (ch === '"') {
        // C ref: cmd.c { AMULET_SYM, "seeamulet", ..., dopramulet } — worn amulet.
        await dopramulet();
        game.context.move = 0;
    } else if (ch === '+') {
        await dovspell();
        game.context.move = 0;
    } else if (ch === 'S') {
        // C ref: cmd.c { 'S', "save", ..., dosave, ... } -> save.c dosave().
        // Clears the message window, asks y_n("Really save?"); 'n' declines (no
        // game turn), 'y' writes the save to the shared storage handle and
        // terminates the segment with "Be seeing you..." (a later segment's
        // restore reads the save back).
        const { dosave } = await import('./save.js');
        await dosave();
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
    } else if (key === 127) { // <del> / '\177' — #terrain (cmd.c doterrain)
        // C ref: cmd.c command list — '\177' (<del>/<rubout>) is bound to the
        // "terrain" command (doterrain, IFBURIED|GENERALCMD|AUTOCOMPLETE): show
        // the known map without monsters/objects/traps.  ECMD_OK (no game time).
        await doterrain();
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
    } else if (ch === '?') {
        // C ref: cmd.c { '?', "help", dohelp, IFBURIED | GENERALCMD } ->
        // pager.c dohelp(): the help-topic PICK_ONE menu ("Select one item:").
        // Consumes no game time (ECMD_OK).
        await dohelp();
        game.context.move = 0;
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
    } else if (CTRL_RUSH_DIR[key] !== undefined) {
        // C ref: cmd.c reset_commands() — Ctrl+<direction letter> is bound to
        // the rush movement (do_rush_*, set_move_cmd(dir, 3)).  Rush goes until
        // something interesting (following corridors past forks differently from
        // a plain run); e.g. C('l') / '\f' rushes east.  hack.js drives the
        // whole multi-turn rush inline and leaves game.context.move = 0.
        const rdir = CTRL_RUSH_DIR[key];
        await do_run_prefixed(DIR_DX[rdir], DIR_DY[rdir], 3);
    } else if (ch === 'F') {
        // C ref: cmd.c do_fight() — the 'F' fight prefix forces an attack in the
        // direction of the following movement command (attack even when nothing
        // is seen there).  It sets svc.context.forcefight, takes no time, and
        // prints nothing; the next movement command consumes and clears the
        // flag.  A second 'F' cancels ("Double fight prefix, canceled.").
        if (game.context.forcefight) {
            await Norep_topl('Double fight prefix, canceled.');
            game.context.forcefight = 0;
        } else {
            game.context.forcefight = 1;
        }
        game.context.move = 0;
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
        // C ref: cmd.c set_move_cmd() — the 'm' (reqmenu) prefix disables
        // autopickup AND (via swim_move_danger) lets the hero intentionally
        // step into water/lava for this one move.
        game.context.nopick = game.iflags?.menu_requested ? 1 : 0;
        game.iflags && (game.iflags.menu_requested = false);
        // domove() sets game.context.move itself: 1 when the hero actually
        // moves (time passes), 0 when the move is blocked (bump a wall — no
        // turn elapses).  C ref: hack.c domove() / rhack().  Do NOT override
        // it here, or blocked moves would wrongly advance the turn counter.
        await domove(DIR_DX[ch], DIR_DY[ch]);
        // C ref: cmd.c rhack() DOMOVE_WALK branch — forcefight is cleared right
        // after domove() so the 'F' prefix only affects this one step.
        game.context.forcefight = 0;
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

    // C ref: cmd.c rhack() — after a command that elapsed a game turn, if the
    // hero did something OTHER than kicking, reset the kicked location so pets
    // no longer avoid it (dokick keeps it for its own monster-move phase; the
    // hack.c domove() path also clears it, which the movement branch above
    // covers here).  isok({0,0}) is false, so this disables the avoidance.
    if (game.context?.move && key !== 4)
        game.kickedloc = { x: 0, y: 0 };
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
                // C ref: detect.c dosearch0() — exercise(A_WIS, TRUE) fires on
                // every successful find, before nomul(0).
                exercise(A_WIS, true);
                newsym(x, y);
                // C ref: detect.c dosearch0() — nomul(0) on a successful find:
                // a counted search ("9s") stops immediately instead of running
                // out its full repeat count.
                if ((game.multi ?? 0) > 0) game.multi = 0;
                await pline('You find a hidden door.');
            } else if (loc.typ === SCORR) {
                if (rnl(7 - fund)) continue;
                loc.typ = CORR;
                exercise(A_WIS, true);
                newsym(x, y);
                if ((game.multi ?? 0) > 0) game.multi = 0;
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
// A monster is excluded when: disguised as furniture/an object (mimic);
// peaceful (unless the hero is hallucinating); an undetected hider (mimic/
// piercer/trapper); or helpless (asleep or otherwise unable to move) — C's
// helpless(mon) = msleeping || !mcanmove.  (onscary and the invisible-but-
// sensed canspotmon path aren't modeled: no covered session exercises them.)
const M1_HIDE_PMIDX = new Set([64, 65, 66, 78, 79, 80, 98, 99]);
export function monster_nearby() {
    const u = game.u;
    if (!u) return false;
    const hallu = !!u?.uhallu;
    for (let x = u.ux - 1; x <= u.ux + 1; x++)
        for (let y = u.uy - 1; y <= u.uy + 1; y++) {
            if (!isok(x, y) || (x === u.ux && y === u.uy)) continue;
            const mtmp = m_at(x, y);
            if (!mtmp) continue;
            if (mtmp.m_ap_type === 'furniture' || mtmp.m_ap_type === 'obj') continue;
            if (!(hallu || !mtmp.mpeaceful)) continue;
            if (M1_HIDE_PMIDX.has(mtmp.data?.pmidx) && mtmp.mundetected) continue;
            if (mtmp.msleeping || !mtmp.mcanmove) continue;
            if (cansee(x, y)) return true;
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
            // C: Norep("%s%s", act, buf) — suppressed when identical to the
            // current top line, so a repeated blocked search/wait next to the
            // same monster doesn't re-print every turn.
            await Norep_topl(`${act}${buf}`);
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
        // C ref: dokick.c:951-952 feel_newsym(x,y); recalc_block_point(x,y) —
        // the broken/gone door is now transparent, so re-run vision (reveals
        // whatever lies beyond the doorway).
        newsym(x, y);
        recalc_block_point(x, y);
    } else {
        exercise(A_STR, true);
        // C ref: dokick.c:966 pline("%s!!", (Deaf || !rn2(3)) ? "Thwack" :
        // "Whammm") — Thwack when rn2(3)==0 (or Deaf), else Whammm.
        await pline(`${(game.u?.Deaf || rn2(3) === 0) ? 'Thwack' : 'Whammm'}!!`);
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

    // C ref: dokick.c:1325 — record the kicked square so a peaceful/tame
    // monster avoids stepping onto it for this turn's monster-move phase
    // (m_avoid_kicked_loc).  Cleared by the next hero action (rhack/domove).
    game.kickedloc = { x, y };

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
    // C ref: win/tty/topl.c tty_yn_function() — `if (toplin == TOPLINE_NEED_MORE
    // && !skip) more(); flags &= ~(WIN_STOP|WIN_NOSTOP);` before drawing the new
    // prompt: an unacknowledged pending message (e.g. a pet dropping an item
    // this same turn) gets its own --More-- pause rather than being silently
    // overwritten — unless the player already dismissed a previous --More--
    // with ESC this turn (game._winStop), in which case the message was
    // suppressed outright and no extra pause is owed.  Either way the
    // suppression is one-shot: clear it once this prompt has been drawn.
    if (game._toplin === 1 && !game._winStop) await topl_more();
    game._winStop = false;
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

// C ref: attrib.c acurr(chridx) — effective attribute = abon+atemp+acurr,
// clamped to [3,25] for non-STR characteristics (e.g. wounded legs' atemp
// [A_DEX] -= 1).  Delegates to attrib.js' shared acurr_eff so every ACURR()
// call site here (door-open, lock-picking, wounded-legs/strain thresholds)
// sees the same temporary stat adjustments C's acurr() would.
function ACURR(i) { return acurr_eff(i); }

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

// C ref: include/onames.h — the lock-picking tools (mkobj.js OBJECTS rows).
// (Earlier revisions had SKELETON_KEY/CREDIT_CARD wrong (215=LARGE_BOX,
// 219=BAG_OF_HOLDING); corrected so autokey()/pick_lock() key off the real
// object types.)
const SKELETON_KEY = 221, LOCK_PICK = 222, CREDIT_CARD = 223;
const LARGE_BOX = 214, CHEST = 215, ICE_BOX = 216;
const PM_ROGUE = 8;

// C ref: include/lock.h — pick_lock() / lock-occupation result codes.
const PICKLOCK_DID_NOTHING = 0, PICKLOCK_DID_SOMETHING = 1,
      PICKLOCK_LEARNED_SOMETHING = 2;

// C ref: objclass.h Is_box() — the three lockable floor containers.
function Is_box_otyp(otyp) {
    return otyp === LARGE_BOX || otyp === CHEST || otyp === ICE_BOX;
}
// an(name): the object's unidentified simple name with its indefinite article.
// The tools/boxes here are never appearance-shuffled, so objects[otyp].name is
// the displayed noun.
function an_obj(otyp) {
    const nm = OBJECTS[otyp]?.name || 'object';
    return (/^[aeiou]/i.test(nm) ? 'an ' : 'a ') + nm;
}
// C ref: lock.c lock_action() — the gerund phrase for the occupation messages.
function lock_action_str(picktyp, target) {
    if (target.door && !(target.door.doormask & D_LOCKED)) return 'locking the door';
    if (target.box && !target.box.olocked)
        return target.box.otyp === CHEST ? 'locking the chest' : 'locking the box';
    if (picktyp === LOCK_PICK || picktyp === CREDIT_CARD) return 'picking the lock';
    if (target.door) return 'unlocking the door';
    if (target.box) return target.box.otyp === CHEST ? 'unlocking the chest' : 'unlocking the box';
    return 'picking the lock';
}

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

// C ref: lock.c pick_lock(pick, 0, 0, NULL) — the #apply path for a lock pick /
// skeleton key / credit card.  get_adjacent_loc() -> getdir() prompts "In what
// direction?"; the target is a container under the hero (dx==dy==0) or an
// adjacent door.  Returns a PICKLOCK_* code (doapply maps non-zero -> ECMD_TIME).
// The occupation is resolved inline in a single turn, exactly like the existing
// pick_lock_door() (a failed first rn2(100) is treated as one elapsed turn).
// Unreached-at-these-depths sub-branches (resuming an interrupted attempt,
// nohands/engulfed, drawbridge locks, credit-card shopkeepers, door-mimics, and
// the Master-Key trap-disarm) are documented rather than modelled.
export async function pick_lock(pick) {
    const u = game.u;
    const picktyp = pick.otyp;
    const isRogue = (game.urole?.mnum === PM_ROGUE);

    // get_adjacent_loc(NULL, "Invalid location!", u.ux, u.uy, &cc):
    const dir = await getdir();
    if (!dir) { await pline('Never mind.'); return PICKLOCK_DID_NOTHING; }
    const cx = u.ux + dir.dx, cy = u.uy + dir.dy;
    if (!isok(cx, cy)) { await pline('Invalid location!'); return PICKLOCK_DID_NOTHING; }

    let ch = 0, target = null;
    if (cx === u.ux && cy === u.uy) {
        // Pick the lock on a container under the hero.
        if (dir.dz < 0) {
            await pline("There isn't any sort of lock up there.");
            return PICKLOCK_LEARNED_SOMETHING;
        }
        // is_lava / is_pool guards: the hero stands on dry floor in these runs.
        // C walks svl.level.objects[x][y] head-first (newest first); this port's
        // level.objects is a flat, push-ordered array, so reverse for that order.
        const pile = (game.level?.objects || [])
            .filter((o) => o.where === 'floor' && o.ox === cx && o.oy === cy)
            .reverse();
        let count = 0;
        for (const otmp of pile) {
            if (!Is_box_otyp(otmp.otyp)) continue;
            count++;
            let verb, it = false;
            if (otmp.obroken) verb = 'fix';
            else if (!otmp.olocked) { verb = 'lock'; it = true; }
            else if (picktyp !== LOCK_PICK) { verb = 'unlock'; it = true; }
            else verb = 'pick';
            otmp.lknown = 1;
            game._yn_need_more = true;
            const c = await y_n(`There is ${an_obj(otmp.otyp)} here; ${verb} ${it ? 'it' : 'its lock'}?`, 'ynq\x1b', 'q');
            if (c === 'q' || c === '\x1b') return PICKLOCK_DID_NOTHING;
            if (c === 'n') continue; // try next box
            if (otmp.obroken) {
                await pline(`You can't fix its broken lock with ${an_obj(picktyp)}.`);
                return PICKLOCK_LEARNED_SOMETHING;
            }
            if (picktyp === CREDIT_CARD && !otmp.olocked) {
                await pline(`You can't do that with ${an_obj(picktyp)}.`);
                return PICKLOCK_LEARNED_SOMETHING;
            }
            switch (picktyp) {
            case CREDIT_CARD:  ch = ACURR(A_DEX) + 20 * (isRogue ? 1 : 0); break;
            case LOCK_PICK:    ch = 4 * ACURR(A_DEX) + 25 * (isRogue ? 1 : 0); break;
            case SKELETON_KEY: ch = 75 + ACURR(A_DEX); break;
            }
            if (otmp.cursed) ch = Math.trunc(ch / 2);
            target = { box: otmp };
            break;
        }
        if (!target) {
            if (!count) await pline("There doesn't seem to be any sort of lock here.");
            return PICKLOCK_LEARNED_SOMETHING; // decided against all boxes
        }
    } else {
        // Pick the lock in an adjacent door.  (u.utrap TT_PIT guard: unreached.)
        const mtmp = m_at(cx, cy);
        if (mtmp && canspotmon(mtmp)) {
            await pline(`I don't think ${mon_nam(mtmp)} would appreciate that.`);
            return PICKLOCK_LEARNED_SOMETHING;
        }
        const door = game.level?.at(cx, cy);
        if (!door || !IS_DOOR(door.typ)) {
            // C ref: lock.c — the not-a-door branch runs update_mapseen_for(cc) +
            // feel_location(cc) and returns PICKLOCK_LEARNED_SOMETHING when that
            // examination changes the remembered glyph / seen-vector / lastseentyp
            // (feel_location() always set_seenv()s the probed tile from the hero's
            // new vantage), else PICKLOCK_DID_NOTHING.  For the sighted hero
            // probing an adjacent square this examination registers as LEARNED (a
            // turn elapses).  This port doesn't keep C's per-tile glyph/seenv
            // memory to distinguish the rare already-fully-cached DID_NOTHING case,
            // so it returns LEARNED — matching the recorded turn-consuming apply.
            await pline(`You ${Blind() ? 'feel' : 'see'} no door there.`);
            return PICKLOCK_LEARNED_SOMETHING;
        }
        switch (door.doormask) {
        case D_NODOOR: await pline('This doorway has no door.'); return PICKLOCK_LEARNED_SOMETHING;
        case D_ISOPEN: await pline('You cannot lock an open door.'); return PICKLOCK_LEARNED_SOMETHING;
        case D_BROKEN: await pline('This door is broken.'); return PICKLOCK_LEARNED_SOMETHING;
        default: break;
        }
        if (picktyp === CREDIT_CARD && !(door.doormask & D_LOCKED)) {
            await pline("You can't lock a door with a credit card.");
            return PICKLOCK_LEARNED_SOMETHING;
        }
        game._yn_need_more = true;
        const c = await y_n(`${(door.doormask & D_LOCKED) ? 'Unlock' : 'Lock'} it?`, 'ynq\x1b', 'q');
        if (c !== 'y') return PICKLOCK_DID_NOTHING;
        switch (picktyp) {
        case CREDIT_CARD:  ch = 2 * ACURR(A_DEX) + 20 * (isRogue ? 1 : 0); break;
        case LOCK_PICK:    ch = 3 * ACURR(A_DEX) + 30 * (isRogue ? 1 : 0); break;
        case SKELETON_KEY: ch = 70 + ACURR(A_DEX); break;
        }
        target = { door, cx, cy };
    }

    // set_occupation(picklock, ...): first turn (usedtime 0) rolls rn2(100);
    // >= chance -> still busy (would carry over), else succeed this turn.
    if (rn2(100) >= ch) return PICKLOCK_DID_SOMETHING; // busy: a turn elapsed
    await pline(`You succeed in ${lock_action_str(picktyp, target)}.`);
    if (target.door) {
        const door = target.door;
        if (door.doormask & D_TRAPPED) door.doormask = D_NODOOR; // b_trapped unreached
        else if (door.doormask & D_LOCKED) door.doormask = D_CLOSED;
        else door.doormask = D_LOCKED;
        newsym(target.cx, target.cy);
    } else {
        target.box.olocked = target.box.olocked ? 0 : 1;
    }
    exercise(A_DEX, true); // -> rn2(19)
    return PICKLOCK_DID_SOMETHING;
}

// C ref: hack.c u_maybe_impaired() — a Stunned hero is always impaired; a
// merely Confused one is impaired only 1-in-5 of the time.  Short-circuit
// order matters: Stunned skips the rn2(5) draw entirely (matches C's
// `Stunned || (Confusion && !rn2(5))`).
function u_maybe_impaired() {
    const u = game.u;
    const stunned = (u.uprops?.Stun || 0) > 0 || !!u.Stunned;
    if (stunned) return true;
    const confused = (u.uprops?.Confusion || 0) > 0;
    return confused && !rn2(5);
}

// C ref: decl.c dirs_ord[]/xdir[]/ydir[] — cardinals-first direction order and
// the compass-point deltas, DIR_W..DIR_SW indexed 0..7.
const DIRS_ORD = [0, 2, 4, 6, 1, 3, 5, 7]; // W, N, E, S, NW, NE, SE, SW
const XDIR = [-1, -1, 0, 1, 1, 1, 0, -1];
const YDIR = [0, -1, -1, -1, 0, 1, 1, 1];
const PM_GRID_BUG = 116;

// C ref: cmd.c confdir(force_impairment) — if impaired (or forced), pick a
// random direction and overwrite u.dx/u.dy.  A grid-bug hero is NODIAG and
// only draws from the 4 cardinal entries of dirs_ord.
function confdir(forceImpairment) {
    const u = game.u;
    if (!(forceImpairment || u_maybe_impaired())) return;
    const kmax = (u.umonnum === PM_GRID_BUG) ? 4 : 8;
    const k = DIRS_ORD[rn2(kmax)];
    u.dx = XDIR[k];
    u.dy = YDIR[k];
}

// C ref: hack.c bad_rock(mdat,x,y) — reduced to the plain-human-hero case (no
// Sokoban boulder-push, no tunneling/wall-passing): blocked iff the square is
// obstructed terrain (rock/wall/tree/iron bars).
function bad_rock(x, y) {
    const loc = game.level?.at(x, y);
    return IS_OBSTRUCTED(loc ? loc.typ : 0);
}

// C ref: hack.c impaired_movement(&x, &y) — while impaired, repeatedly pick a
// random direction (confdir(TRUE)) until it lands on a valid, non-rock square,
// giving up (and returning "can't move") after 50 tries.  Returns the
// (possibly redirected) destination, or null if domove_core should bail out.
function impaired_movement(x, y) {
    const u = game.u;
    if (!u_maybe_impaired()) return { x, y };
    let tries = 0;
    let nx = x, ny = y;
    do {
        if (tries++ > 50) return null;
        confdir(true);
        nx = u.ux + u.dx;
        ny = u.uy + u.dy;
    } while (!isok(nx, ny) || bad_rock(nx, ny));
    return { x: nx, y: ny };
}

// C ref: hack.c:2638 escape_from_sticky_mon(x, y) — the hero, held by a
// sticking monster (lichen / acid blob / owlbear), tries to step away.  Returns
// TRUE when the attempt costs the turn.
//
// The rn2 MODULUS depends on the holder's mcanmove, and case 3 falls through to
// default, so a sleeping holder both escapes more often and can be woken.
async function escape_from_sticky_mon(x, y) {
    const u = game.u;
    const held = u.ustuck;
    if (!held || (x === held.mx && y === held.my)) return false;
    // Dynamic: monmove.js -> ... -> cmd.js is a static cycle.
    const { m_next2u, y_monnam_local } = await import('./monmove.js');
    if (!m_next2u(held)) { u.ustuck = null; return false; }
    // sticks(youmonst.data) is FALSE for every playable base form.
    const roll = rn2(!held.mcanmove ? 8 : 40);                  // hack.c:2664
    if (roll === 3 && !held.mcanmove) {
        held.mfrozen = 1;
        held.msleeping = 0;
    }
    if (roll > 2) {  /* case 3 falls through to default */
        // Conflict is not modeled; a hostile holder never releases.
        if (held.mconf || !held.mtame) {
            await pline(`You cannot escape from ${y_monnam_local(held)}!`);
            game.multi = 0;                                     // nomul(0)
            return true;
        }
    }
    u.ustuck = null;
    await pline(`You pull free from ${y_monnam_local(held)}.`);
    return false;
}

// C ref: hack.c domove / domove_core — execute a movement, including the
// bump-into-a-monster path (attack a hostile, or swap places with a pet).
export async function domove(dx, dy) {
    const u = game.u;
    // C ref: hack.c rhack() sets u.dx/u.dy from the pressed direction key
    // BEFORE calling domove(); domove_core() then reads u.ux+u.dx/u.uy+u.dy
    // as its starting point.  Our domove(dx,dy) receives that direction as
    // parameters, so this assignment is the equivalent point.
    u.dx = dx;
    u.dy = dy;
    // C ref: hack.c domove_core() — u.umoved is reset FALSE at the top of a
    // hero command and set TRUE only when the hero's position changes
    // (hack.c:2968).  u_calc_moveamt() reads it to decide whether a riding
    // hero rolls mcalcmove(usteed).
    const _umoved_ux0 = u.ux, _umoved_uy0 = u.uy;
    u.umoved = false;

    // C ref: hack.c domove_core() — `x = u.ux + u.dx; y = u.uy + u.dy; if
    // (impaired_movement(&x, &y)) return;`.  The u.uswallow branch (u.dx=dy=0,
    // move onto u.ustuck) isn't reached by these sessions (no engulfers).
    const redirected = impaired_movement(u.ux + dx, u.uy + dy);
    if (!redirected) return; // 50 tries found no valid square; turn wasted
    const newx = redirected.x, newy = redirected.y;

    // C ref: hack.c:2757 — a run/rush/travel step onto a known trap stops the
    // hero here, before the monster-bump block, so C never reaches the
    // paranoid_confirm:trap prompt below while rushing.
    if (await avoid_running_into_trap(newx, newy)) return;

    // C ref: hack.c:2760 — after the out-of-bounds / avoid-trap checks and
    // BEFORE bumping into a monster.  Returns TRUE => the turn is spent.
    if (await escape_from_sticky_mon(newx, newy)) return;

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

    // ── force-fight an empty square ──  C ref: hack.c domove_fight_empty(x,y).
    // With the 'F' prefix (svc.context.forcefight) and no monster at the target,
    // the hero wastes a turn "attacking" the terrain rather than moving there.
    // (The remembered-invisible-'I' glyph trigger and the pick-axe dig branch
    // are not exercised by the corpus, so only the plain forcefight-at-terrain
    // case is modelled.)  Consumes no RNG.  C: domove_core runs this before
    // trapmove()/test_move(), so it sits right after the monster-bump block.
    if (game.context?.forcefight) {
        const off_edge = !isok(newx, newy);
        const loc = off_edge ? null : game.level?.at(newx, newy);
        const typ = loc ? loc.typ : STONE;
        // C: solid = off_edge || !accessible(x,y) || IS_FURNITURE(typ)
        const solid = off_edge || !ACCESSIBLE(typ) || IS_FURNITURE(typ);
        let buf;
        if (off_edge) {
            buf = 'an unknown obstacle';
        } else if (solid) {
            // C: a seen square (or any stone-wall / secret door/corridor) is
            // named via the cmap explanation ("the wall"); otherwise it reads
            // as an unknown obstacle.
            const seen = ((loc?.seenv ?? 0) & 0xff) || IS_STWALL(typ)
                       || typ === SDOOR || typ === SCORR;
            const expl = seen ? forcefight_terrain_expl(typ) : null;
            buf = expl ? `the ${expl}` : 'an unknown obstacle';
        } else {
            buf = 'thin air';
        }
        // C: You("%s%s %s.", solid ? "harmlessly " : "", "attack", buf).
        await pline(`You ${solid ? 'harmlessly ' : ''}attack ${buf}.`);
        // C nomul(0): no run/multi is active during a plain 'F'+walk, so this is
        // a no-op here; the wasted attack still elapses a game turn.
        game.multi = 0;
        game.context.mv = 0;
        game.context.move = 1;
        return;
    }

    // ── paranoid_confirm:trap ──  C ref: hack.c:2823-2828 — `if (ParanoidTrap)
    // { if (avoid_trap_andor_region(x, y)) return; }`, between u_rooted() and
    // the u.utrap/trapmove() handling below.
    if (await avoid_trap_andor_region(newx, newy)) return;

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
            // Running (autoopen disabled) into an orthogonal closed door:
            // C ref: hack.c test_move() else-if (x==ux||y==uy).  A hero who is
            // Blind, Stunned, Fumbling, or has ACURR(A_DEX) < 10 bumps into the
            // door instead of just noticing it's closed; unlike the plain
            // "closed" stop, the bump consumes the move (C sets
            // context.door_opened = context.move = TRUE and calls nomul(0)).
            // Diagonal running into a closed door (x!=ux && y!=uy) prints
            // nothing and just stops, matching neither sub-branch.
            if (newx === u.ux || newy === u.uy) {
                const stunned = (u.uprops?.Stun || 0) > 0 || !!u.Stunned;
                const fumbling = !!(u.HFumbling || u.EFumbling);
                if (Blind() || stunned || ACURR(A_DEX) < 10 || fumbling) {
                    if (u.usteed) {
                        await pline(`You can't lead ${mon_nam(u.usteed)} through that closed door.`);
                    } else {
                        await pline('Ouch!  You bump into a door.');
                        exercise(A_DEX, false);
                    }
                    game.multi = 0; // C nomul(0)
                    game.context.move = 1; // C: context.door_opened = context.move = TRUE
                    return;
                }
                await pline('That door is closed.');
            }
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
    if (blocksDiagonalDoor(u.ux, u.uy, newx, newy, u.dx, u.dy)) {
        game.context.move = 0;
        return;
    }

    // ── push a boulder ──  C ref: hack.c test_move() DO_MOVE branch -> moverock().
    // A boulder sits on an otherwise-passable square, so blocksMove() below would
    // wrongly let the hero step onto it.  Instead, C tries to roll the boulder one
    // square further in the move direction; if it can't move, test_move returns
    // FALSE and the hero stays put (no turn elapses).  Only reached when the hero
    // does not pass through walls (the corpus heroes never do).
    {
        const bobj = boulder_at(newx, newy);
        if (bobj) {
            const pushed = await moverock(bobj, newx, newy, u.dx, u.dy);
            if (pushed < 0) {
                // Boulder couldn't be pushed: hero stays put, no turn elapses.
                game.context.move = 0;
                return;
            }
            // Boulder rolled away -> fall through to the normal move onto its old
            // square (blocksMove sees plain floor/corridor there now).
        }
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

    // ── avoid stepping into water/lava (paranoid_confirm:swim) ──  C ref:
    // hack.c domove() -> swim_move_danger(x,y), checked right after test_move()
    // succeeds and before the hero actually relocates.
    if (await swim_move_danger(newx, newy)) {
        game.context.move = 0;
        game.multi = 0; // C nomul(0)
        return;
    }

    // C ref: hack.c domove_core():2860 — "Move ball and chain."  This runs
    // BEFORE the hero relocates (drag_ball wants the hero's OLD square for the
    // chain) and can abort the move entirely, e.g. "You cannot drag the heavy
    // iron ball."
    let bc = null;
    if (u.uball && u.uchain) {
        const { drag_ball } = await import('./ball.js');
        bc = await drag_ball(newx, newy, true);
        if (!bc) return;
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

    // C ref: hack.c:2877 — `m_postmove_effect(&gy.youmonst)` fires immediately
    // after the tentative position update and before the steed follows; it reads
    // u.ux0/u.uy0, so a hero polymorphed into a hezrou / steam vortex leaves its
    // cloud on the square just vacated.
    {
        const { m_postmove_effect } = await import('./monmove.js');
        await m_postmove_effect(u);
    }

    // C ref: hack.c:2879-2884 — a ridden steed moves with the hero, so its map
    // position is kept synced to the hero's.  Without this the steed's mx/my go
    // stale after the first ride step and its per-turn distfleeck nearby/monnear
    // test (and hence the dochug is_wanderer rn2(4) branch) diverges from C
    // every subsequent turn.
    if (u.usteed) { u.usteed.mx = u.ux; u.usteed.my = u.uy; }

    // C ref: hack.c domove_core() -> u_on_newpos() -> dungeon.c see_nearby_objects().
    // Having relocated on the same level, the hero may now be close enough to a
    // generic (undescribed) potion/gem/spellbook to see it up close, upgrading
    // its map glyph from the generic gray class symbol to its appearance color.
    // Runs before vision_recalc(1) (matching u_on_newpos's position in
    // domove_core), so it uses the still-old viz_array like C does.
    see_nearby_objects();

    // Update display
    newsym(oldx, oldy);
    vision_recalc(1);
    newsym(newx, newy);

    // C ref: hack.c domove_core() -> spoteffects(TRUE).  spoteffects() runs
    // pickup(1) before a non-pit trap (and after a pit trap), then dotrap().
    // Passing pickup_after_move as the callback (called with the CURRENT
    // hero position, not these fixed newx/newy) preserves that C ordering so
    // a floor pile is announced ("Things that are here:" --More--) before a
    // dart trap fires on the same square — and so a fall-into-water/crawl-out
    // re-entry (pooleffects -> drown -> teleds -> spoteffects again) picks up
    // at the square the hero actually lands on, not the one it fell into.
    // C ref: hack.c domove_core():2976 — `if (Punished) move_bc(0, ...)`, i.e.
    // put the ball and chain back down at the positions drag_ball() picked.
    // This happens BEFORE spoteffects(), so the pile the hero steps onto
    // already includes anything the chain landed on.
    if (bc) {
        const { move_bc } = await import('./ball.js');
        move_bc(0, bc.bc_control, bc.ballx, bc.bally, bc.chainx, bc.chainy);
    }

    await spoteffects(pickup_after_move);
    // C ref: end.c really_done() longjmps out; if spoteffects() (e.g.
    // lava_effects()) just ended the game, none of domove()'s post-move work
    // (engraving smudge) runs.
    if (game.program_state?.gameover) return;

    // C ref: hack.c domove_core():2984 — "delay next move because of ball
    // dragging; must come after we finished picking up, in spoteffects()".
    // nomul(-2) makes the hero helpless for two turns, so ONE movement command
    // runs TWO moveloop iterations (monsters move twice, the hunger/sounds rolls
    // fire twice).  Leaving this out is what desynchronised seed4500 from step
    // 514: C advanced T:87 -> 89 for a single 'l' keypress.
    if (bc?.cause_delay) {
        // C ref: hack.c nomul(nval) — `if (gm.multi < nval) return; gm.multi =
        // nval;`.  multi is 0 on a normal step, so this always takes.  The
        // moveloop's `if (multi < 0) ++multi` countdown (allmain.js) then runs
        // the extra turn(s) with no command read in between.
        if ((game.multi ?? 0) >= -2) game.multi = -2;
        game.multi_reason = 'dragging an iron ball';
        game.nomovemsg = '';
    }

    // C ref: hack.c domove() — after domove_core() (movement + spoteffects,
    // i.e. everything above) completes, a successful WALK/RUSH smudges any
    // engraving on the squares the hero left and entered (rnd(5) per engraved
    // square) using the CURRENT position (spoteffects may have moved the hero
    // further, e.g. falling through a trap door).  This runs AFTER read_engr_at
    // (called from spoteffects' pickup path), so what gets read/displayed this
    // turn is the engraving as it stood BEFORE this move's smudge.
    maybe_smudge_engr(oldx, oldy, u.ux, u.uy);
}

// C ref: drawing.c defsyms[].explanation (the short "desc" field) for the
// terrain a hero force-fights via domove_fight_empty().  Walls (and secret
// doors, which display as walls) read as "wall"; pools/moat/water read as
// "water"; lava as "molten lava"; stone/tree/iron-bars name themselves.
// Returns null for terrain types not named here (caller falls back to "an
// unknown obstacle"), mirroring the seen-but-unhandled case conservatively.
function forcefight_terrain_expl(typ) {
    if (typ === STONE) return 'stone';
    if (IS_WALL(typ) || typ === SDOOR) return 'wall';
    if (typ === TREE) return 'tree';
    if (typ === IRONBARS) return 'iron bars';
    if (typ === POOL || typ === MOAT || typ === WATER) return 'water';
    if (typ === LAVAPOOL) return 'molten lava';
    return null;
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

// C ref: mkobj.c sobj_at(BOULDER, x, y) — the topmost boulder lying on the floor
// at (x,y), or null.  BOULDER otyp is 475 (mkobj.js).  vobj_at-style scan of the
// flat level object list, returning the last (top-of-pile) match.
function boulder_at(x, y) {
    let found = null;
    for (const o of (game.level?.objects || []))
        if (o.where === 'floor' && o.ox === x && o.oy === y && o.otyp === 475)
            found = o;
    return found;
}

// C ref: mondata.h throws_rocks(ptr) == (mons[].mflags2 & M2_ROCKTHROW).  Only
// giant-kin (giants, ettin, titan, minotaur) and the Cyclops throw/lift rocks,
// so a hero polymorphed into one of those forms pushes a boulder with "little"
// rather than "great" effort.  Ordinary heroes are never in this set, so the
// word is "great" for every recorded session.  pmidx values match u.umonnum
// (== PM_* monster index); same set as monmove.js's ROCKTHROW_PMIDX.
const ROCKTHROW_MONS = new Set([169, 170, 171, 172, 173, 174, 175, 176, 177, 359]);
function hero_throws_rocks() { return ROCKTHROW_MONS.has(game.u?.umonnum); }

// C ref: objnam.c the(xname(otmp)) for a lone boulder — "the boulder".  Built
// from the object type's base name so it stays correct for any pushable object
// (boulders never take a shuffled appearance and always have quan 1 on the map).
function the_pushable_name(otmp) {
    return `the ${OBJECTS[otmp.otyp]?.name || 'boulder'}`;
}

// C ref: hack.c moverock() — the hero, moving in direction (dx,dy), tries to
// push the boulder at (sx,sy) one square further to (rx,ry).  Returns 0 when the
// boulder rolled (or the hero may still advance), -1 when it is stuck and the
// hero must stay put.  Only the on-foot, sighted common case is exercised by the
// corpus; the swallowing-trap / pool / mounted variants are guarded out of the
// success path so no boulder is ever left in an inconsistent map state.
async function moverock(otmp, sx, sy, dx, dy) {
    const u = game.u;
    const rx = u.ux + 2 * dx; // boulder destination
    const ry = u.uy + 2 * dy;
    game.multi = 0; // C nomul(0)

    // Levitation: no leverage to push.  (verysmall/steed variants omitted — no
    // tiny-form or mounted hero pushes a boulder in the corpus.)
    if (u?.uprops?.Levitation) {
        await pline(`You don't have enough leverage to push ${the_pushable_name(otmp)}.`);
        return -1;
    }

    const dloc = game.level?.at(rx, ry);
    const dtyp = dloc ? dloc.typ : STONE;
    const isPoolLava = dtyp === POOL || dtyp === MOAT || dtyp === WATER
                    || dtyp === LAVAPOOL;
    const closedDoor = dloc && IS_DOOR(dtyp)
                    && (dloc.doormask & (D_CLOSED | D_LOCKED));
    // C: the moverock_core() outer condition — destination must be a real,
    // in-bounds, non-wall/rock/ironbars square not itself holding a boulder.
    // A diagonal push is refused into a doored doorway (unless doorless).
    const destOk = isok(rx, ry) && !IS_ROCK(dtyp) && dtyp !== IRONBARS
        && (!IS_DOOR(dtyp) || !(dx && dy) || doorless_door(rx, ry))
        && !boulder_at(rx, ry);

    if (destOk) {
        // C ref: hack.c moverock_core() — a monster occupying the destination
        // blocks the push (unless it's a noncorporeal ghost/shade, or one
        // pinned in a pit/spiked pit).  Report it as seen or heard, then
        // refuse the push, before falling through to the trap/door/pool
        // handling below.
        const mtmp = m_at(rx, ry);
        const destTrap = trap_at(rx, ry);
        if (mtmp && mtmp.data?.mlet !== ' ' /* noncorporeal ghost/shade */
            && (!mtmp.mtrapped || !(destTrap && is_pit_ttyp(destTrap.ttyp)))) {
            // Two plines can fire in the same turn (sense + verbose), so route
            // both through update_topl() — it inserts the --More-- pause (its
            // own screen frame) when they don't fit coalesced on one line,
            // exactly like C's back-to-back pline() calls do.
            let deliverPart1 = false;
            if (canspotmon(mtmp)) {
                await update_topl(`There's ${x_monnam(mtmp, 2, null, 0, false)} on the other side.`);
                deliverPart1 = true;
            } else {
                if (!game.u?.Deaf && game.flags?.acoustics !== false) {
                    await update_topl(`You hear a monster behind ${the_pushable_name(otmp)}.`);
                    deliverPart1 = true;
                }
                map_invisible(rx, ry);
            }
            if (game.flags?.verbose !== false) {
                await update_topl(deliverPart1
                    ? `Perhaps that's why you cannot move it.`
                    : `You cannot move ${the_pushable_name(otmp)}.`);
            }
            return -1;
        }
    }

    const canRoll = destOk
        && !closedDoor && !isPoolLava
        && !trap_at(rx, ry);  // keep the boulder off any trap (conservative)

    if (canRoll) {
        // C ref: hack.c moverock() — the "With <little|great> effort you move
        // <the boulder>." line, suppressed (via the static lastmovetime) when the
        // hero pushed the same boulder within the last two turns so a run of
        // pushes doesn't spam it.
        if (!u.usteed) {
            const lmt = game._boulder_lastmovetime;
            if (lmt == null || game.moves > lmt + 2 || game.moves < lmt)
                await pline(`With ${hero_throws_rocks() ? 'little' : 'great'} effort `
                          + `you move ${the_pushable_name(otmp)}.`);
            // C ref: hack.c dopush() — `if (!easypush) exercise(A_STR, TRUE);`.
            // A non-rock-thrower trains Str (rn2(19) inside exercise) on EVERY
            // push, independent of whether the effort message printed.
            if (!hero_throws_rocks()) exercise(A_STR, true);
            game._boulder_lastmovetime = game.moves;
        }
        // C ref: hack.c dopush() — "if (glyph_is_invisible(levl[rx][ry].glyph))
        // unmap_object(rx, ry);" BEFORE moving the boulder: a destination
        // square remembered as holding a sensed-but-unseen monster ('I') must
        // have that notation cleared so the newsym(rx,ry) below shows the
        // boulder instead of re-asserting the stale 'I'.
        if (dloc?.invisMon) unmap_object(rx, ry);
        // C: movobj(otmp, rx, ry) == remove_object(obj) + place_object(obj, ox, oy):
        // the boulder is unlinked from the floor chain and RE-INSERTED AT THE
        // FOBJ HEAD, not just given new coordinates.  A later dog_goal() fobj
        // scan (dogmove.js) walks that chain newest-first, so a pet's
        // apport/obj_resists roll order depends on this repositioning; leaving
        // the boulder at its original (creation-order) slot in our flat
        // game.level.objects array desyncs that scan's RNG order against a
        // separately-created object the boulder has now been pushed past.
        const _objs = game.level?.objects;
        if (_objs) {
            const _oi = _objs.indexOf(otmp);
            if (_oi >= 0) _objs.splice(_oi, 1);
        }
        otmp.ox = rx;
        otmp.oy = ry;
        if (_objs) _objs.push(otmp);
        // C ref: mkobj.c place_object() block_point(rx,ry) / remove_object()
        // recalc_block_point(sx,sy) — a boulder blocks light, so relocating it
        // must update the vision map: the destination becomes opaque and the
        // vacated square becomes transparent again (unless the terrain blocks).
        // Without this a monster's clear_path() to the hero would ignore the
        // boulder and skip linedup()'s rn2(2+boulderspots) roll.
        recalc_block_point(rx, ry);
        recalc_block_point(sx, sy);
        newsym(rx, ry);
        newsym(sx, sy);
        return 0;
    }

    // C ref: hack.c moverock() nopushmsg: — the boulder is wedged and won't budge.
    if (game.flags?.verbose !== false)
        await pline(`You try to move ${the_pushable_name(otmp)}, but in vain.`);
    return -1;
}

// C ref: hack.c domove_core() -> spoteffects(TRUE) -> pickup(1).  pickup(1)
// runs at the tail of EVERY move that relocates the hero (plain step, run,
// rush, or a swap with a pet).  With autopickup off it falls through to
// look_here() — announcing a single floor object as "You see here <a thing>."
// (no game time, no RNG); a run additionally halts on the object (handled by
// runStopOnObject in hack.js).  With autopickup on it instead lifts the
// matching floor objects (prinv "<letter> - <name>." lines).  Travel (run == 8)
// does not auto-stop, but pickup still fires; we exclude only the mid-action
// teleport case (context.mv with no context.run) which C skips via
// "gm.multi && !run".  Exported so steed.js's dismount_steed_bychoice() can
// invoke the same pickup(1) tail that C's float_down() runs once the hero has
// landed on the dismount square.
export async function pickup_after_move(x, y) {
    const ctx = game.context || {};
    // C ref: pickup.c check_here() counts the objects here EXCLUDING uchain:
    //     for (obj = level.objects[u.ux][u.uy]; obj; obj = obj->nexthere)
    //         if (obj != uchain) ct++;
    // so a hero who steps onto the trailing end of the punishment chain gets no
    // "You see here an iron chain." — seed4500 step 517 shows an empty topline.
    const not_uchain = (o) => o !== game.u?.uchain;
    const hasObj = (game.level?.objects || []).filter(not_uchain).some(
        (o) => o.where === 'floor' && o.ox === x && o.oy === y);
    // C ref: hack.c spoteffects() -> pickup(1) -> describe_decor() (pickup.c),
    // and check_here() -> describe_decor(): with the 'mention_decor' option on,
    // an unobscured dungeon feature under the hero is announced ("There is a
    // broken door here.") before objects are looked at / picked up.  A move that
    // lands the hero IN a pool/lava is short-circuited by pooleffects(TRUE)
    // BEFORE pickup() runs (spoteffects goto spotdone), so those are not
    // announced.  mention_decor is only set by the tutorial, so this is inert
    // elsewhere; the tutorial hero always sinks, so the pool/lava skip matches
    // C (a hero held above liquid by Lev/Fly/Wwalk is out of scope here).
    // C ref: pickup.c check_here() — describe_decor()'s return value becomes
    // LOOKHERE_SKIP_DFEATURE, telling look_here() not to re-announce the same
    // feature it just printed.  Outside the tutorial (mention_decor off),
    // describe_decor() never runs, so look_here() is the one that announces it.
    let decorAnnounced = false;
    if (game.flags?.mention_decor) {
        const loc = game.level?.at?.(x, y);
        const inLiquid = !!loc && (IS_POOL(loc.typ) || IS_LAVA(loc.typ));
        if (!inLiquid) decorAnnounced = await describe_decor();
    }
    // C ref: pickup.c pickup() — "if there's anything here, stop running":
    //   if (OBJ_AT(u.ux,u.uy) && svc.context.run && svc.context.run != 8
    //       && !svc.context.nopick) nomul(0);
    // This runs INSIDE pickup(), i.e. BEFORE autopickup lifts the object, so a
    // run halts ON the object's square even when autopickup then removes it from
    // the floor.  (hack.js runStopOnObject only catches the no-autopickup case,
    // where the object is still on the floor after the move.)  nomul(0): leave a
    // busy hero alone (multi < 0), else clear multi + travel state to end the run.
    if (hasObj && ctx.run && ctx.run !== 8 && !ctx.nopick
        && (game.multi ?? 0) >= 0) {
        game.multi = 0;
        game.context = game.context || {};
        game.context.travel = game.context.travel1 = game.context.mv = 0;
    }
    if (game.flags?.pickup) {
        const nPicked = await autopickup_after_move(x, y);
        // C ref: pickup.c pickup() -> check_here(n_picked > 0): after autopickup,
        // any objects still on the square are announced ("You see here ...").
        // pickup_types may exclude them (e.g. a chest when '(' isn't selected),
        // so an item can remain even with autopickup on.  When nothing is left,
        // C reads any engraving instead.
        const remain = (game.level?.objects || []).filter(
            (o) => not_uchain(o) && o.where === 'floor' && o.ox === x && o.oy === y);
        if (remain.length > 0) {
            await look_here_after_move(x, y, nPicked > 0, decorAnnounced);
        } else {
            await read_engr_at(x, y);
        }
    } else if (ctx.run !== 8) {
        // C ref: pickup.c check_here() — `if (ct) look_here(ct, lhflags); else
        // read_engr_at(...)`, with ct counting everything but uchain.  The
        // look_here() call was unconditional here, so a square holding only the
        // punishment chain still got a "You see here an iron chain." line that C
        // never prints.
        if (hasObj) await look_here_after_move(x, y, false, decorAnnounced);
        else await read_engr_at(x, y);
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
    const readLine = `You read: "${text}"${endpunct}`;
    await pline(intro);
    // C ref: win/tty/topl.c update_topl() — the "You read" pline is a second
    // update_topl() call in the same turn: when there's room for it plus
    // "--More--" on the intro's line (len(bp)+len(toplines)+3 < CO-8) it's
    // appended after two spaces with no paging; otherwise the intro pages with
    // --More-- first before "You read" starts a fresh line.
    if (readLine.length + intro.length + 3 < 80 - 8) {
        game._pending_message = `${intro}  ${readLine}`;
        game._toplines = game._pending_message;
    } else {
        await topl_more();
        await pline(readLine);
        // C ref: win/tty/topl.c redotoplin():139 — a topline that wrapped onto a
        // second row (cury > 0) auto-fires more().  So only the "You read" line
        // that overflows 80 columns (e.g. long degraded graffiti) gets paged
        // with --More--; a short one stays without one.  After the page is
        // acknowledged the topline clears for the next command's frame.
        if (wrap_topl(readLine).length > 1) {
            await topl_more();
            game._pending_message = '';
        }
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
    game._pickup_encumbrance = 0; // C ref: pickup.c pickup(1) — gp.pickup_encumbrance = 0
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

// C ref: invent.c an() — indefinite article.  Local copy matching the same
// helper duplicated per-file elsewhere (eat.js, invent.js, uhitm.js, hack.js).
function an(s) { return /^[aeiou]/i.test(s) ? `an ${s}` : `a ${s}`; }

// C ref: invent.c look_here() — the "There is <feature> here." + "You see
// here <obj>." auto-announcement when stepping onto a dungeon feature and/or
// floor object(s) with autopickup disabled.  The single-object case prints
// the dfeature line (if any and not already announced by describe_decor's
// mention_decor path) then "You see here <obj>." on the top line; the
// multi-object case (obj_cnt < pile_limit, default 5) opens the blocking
// "Things that are here:" menu (look_here in invent.js).  Larger piles
// ("There are N objects here.") aren't exercised by the owned sessions.
async function look_here_after_move(x, y, _pickedSome = false, skipDfeature = false) {
    const objs = (game.level?.objects || []).filter(
        (o) => o.where === 'floor' && o.ox === x && o.oy === y);
    if (objs.length === 0) return;
    // C ref: look_here() — "if (dfeature && !skip_dfeature) pline1(fbuf);"
    // fbuf = "There is <a feature> here." (dfeature_at names stairs, altars,
    // fountains, doors, ...).  skip_dfeature (LOOKHERE_SKIP_DFEATURE) is set
    // only when describe_decor() (mention_decor / tutorial) already reported
    // the same feature earlier this move.
    const dfeature = skipDfeature ? null : dfeature_at(x, y);
    if (objs.length === 1) {
        // C ref: look_here() single-object case: [dfeature pline1] then
        // You("%s here %s.", verb, ...) -> pline() -> update_topl().  Both go
        // through update_topl so they chain onto any already-pending message
        // (e.g. autopickup's prinv line) per the CO-8 rule, or page it with
        // --More-- first when there's no room — e.g. "$ - 7 gold pieces (19 in
        // total).  You see here a food ration." on one topline.
        const o = objs[0];
        const name = await objDoname(o);
        if (dfeature) await update_topl(`There is ${an(dfeature)} here.`);
        await update_topl(`You see here ${name}.`);
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
    // C's You() -> pline() -> update_topl() sets tty_toplin = 1, so a later
    // same-turn message (e.g. the displaced pet dropping an item during its own
    // move) concatenates onto this line ("You swap places with Slasher.  Slasher
    // drops a food ration.").  Our pline() stub doesn't set that state, so route
    // the swap line through update_topl() to keep the concatenation faithful.
    const verb = mtmp.mpeaceful ? 'swap places with' : 'frighten';
    const who = x_monnam(mtmp, /*ARTICLE_YOUR*/ 3, null, /*SUPPRESS_SADDLE*/ 0, false);
    await update_topl(`You ${verb} ${who}.`);

    // (minliquid/mintrap on the pet's new square: the hero's old square is dry
    //  floor in the starter sessions, so no trap/liquid effect.)
    return true;
}
