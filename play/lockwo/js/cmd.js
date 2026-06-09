// cmd.js — Command dispatch and movement.
// C ref: cmd.c rhack(), hack.c domove().
//
// Minimal skeleton: only hjklyubn movement is implemented.
// Contestants should add: search, kick, eat, drink, read, zap,
// wear, wield, drop, throw, pray, cast, and all other commands.

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { newsym, flush_screen, pline, m_at } from './display.js';
import { vision_recalc } from './vision.js';
import { do_attack, is_safemon, x_monnam } from './uhitm.js';
import { ddoinv, dismiss_invent_screen, dolook,
         dodiscovered, doattributes, dovspell,
         attr_window_advance, dowieldquiver, dothrow, dotravel, dodrop } from './invent.js';
import { dodrink } from './potion.js';
import { dozap } from './zap.js';
import { docast } from './spell.js';
import { doread } from './read.js';
import { rnl, rn2, rnd } from './rng.js';
import { doextcmd, hooked_tty_getlin, wiz_wish } from './extcmd-handlers.js';
import { wiz_level_tele } from './do.js';
import { do_run, do_run_prefixed, isRunKey, RUN_DX, RUN_DY, do_farlook } from './hack.js';
import { COLNO, ROWNO, STONE, DOOR, D_CLOSED, D_LOCKED,
         D_ISOPEN, D_BROKEN, D_NODOOR, D_TRAPPED,
         SDOOR, SCORR, CORR, IS_WALL, IS_OBSTRUCTED, isok, IS_DOOR,
         A_STR, A_DEX, A_CON } from './const.js';
import { exercise } from './attrib.js';

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
    }

    const ch = String.fromCharCode(key);

    // A paged ^X attributes window consumes space/return to advance pages and
    // dismiss after the last; ESC cancels.  C ref: process_menu_window().
    if (game._modal_screen === 'attrwin'
        && (ch === ' ' || ch === '\r' || ch === '\n' || ch === '>')) {
        await attr_window_advance();
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
    } else if (ch === 'i') {
        ddoinv();
        game.context.move = 0;
    } else if (ch === '\\') {
        dodiscovered();
        game.context.move = 0;
    } else if (ch === '+') {
        await dovspell();
        game.context.move = 0;
    } else if (ch === '\x18') { // ^X
        doattributes();
        game.context.move = 0;
    } else if (ch === ':') {
        await dolook();
        game.context.move = 0;
    } else if (ch === 'o') {
        // C ref: cmd.c doopen -> lock.c doopen_indir(0,0): open an adjacent
        // door (reads a direction).  Sets the turn flag from doopen's result.
        game.context.move = (await doopen_indir(0, 0)) ? 1 : 0;
    } else if (ch === 's') {
        // C ref: cmd.c dosearch -> detect.c dosearch0(0): search adjacent
        // squares for hidden doors/passages/traps.  Takes a game turn.
        await dosearch();
        game.context.move = 1;
    } else if (key === 4) { // ^D — kick (dokick.c dokick())
        // C ref: cmd.c keymap C('d') = dokick.  Reads a direction, then resolves
        // the kicked square (monster / object / terrain).  Sets the turn flag
        // from dokick's ECMD result.
        const res = await dokick();
        game.context.move = res === 1 ? 1 : 0;
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
    } else if (ch === 'd') {
        // C ref: cmd.c — 'd' drop an item.  do.c dodrop() prompts for the
        // item then drops it on the floor (ECMD_TIME when something is
        // dropped, so the turn elapses and monsters move).
        game.context.move = (await dodrop()) ? 1 : 0;
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
    } else if (ch === 'r') {
        // C ref: cmd.c — 'r' read a scroll or spellbook.
        game.context.move = (await doread()) ? 1 : 0;
    } else if (ch === 'Q') {
        // C ref: cmd.c — 'Q' (#quiver) ready ammunition.  doquiver_core returns
        // ECMD_TIME (3) only when unwielding the primary/secondary weapon cost a
        // turn; ECMD_OK/ECMD_CANCEL take no time.
        game.context.move = (await dowieldquiver()) === 3 ? 1 : 0;
    } else if (ch === 't') {
        // C ref: cmd.c — 't' (#throw) throw/shoot an item.  throw_obj returns
        // ECMD_TIME (3) when the throw takes a turn; getdir (the direction
        // prompt) is supplied here to keep invent.js free of a cmd import cycle.
        game.context.move = (await dothrow(getdir)) === 3 ? 1 : 0;
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
    } else if (isRunKey(ch)) {
        // Capital-letter run: do_run_west/east/... -> set_move_cmd(dir, 1).
        // Run until something interesting is seen.  hack.js drives the whole
        // multi-turn run inline and leaves game.context.move = 0 (every
        // elapsed turn was already taken), so the moveloop does not schedule
        // another per-turn pass.  C ref: cmd.c do_run_*(), hack.c domove().
        await do_run(RUN_DX[ch], RUN_DY[ch]);
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
    } else if (ch === '.') {
        // C ref: cmd.c command table { '.', "wait", donull } -> do.c donull():
        // "rest one move while doing nothing".  donull() returns ECMD_TIME with
        // no top-line message, so the hero's turn elapses (monsters move) but
        // nothing is printed.  cmd_safety_prevention only fires under attack/
        // safety conditions absent in these recordings, so we take the plain
        // ECMD_TIME path.
        game.context.move = 1;
    } else {
        // Unknown command
        game.context.move = 0;
        await pline(`Unknown command '${ch}'.`);
    }
}

// C ref: detect.c dosearch0(0) — explicit searching of the 8 adjacent
// squares for hidden doors, passages, and unseen traps.  RNG is consumed
// only when such a hidden feature is actually adjacent (rnl(7)/rnl(8)); in
// the common open-room case this takes a turn with no RNG.
async function dosearch() {
    const u = game.u;
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
    return null;
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
        const dir = await getdir();
        if (!dir) return 0; // ESC / invalid direction: like get_adjacent_loc fail
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
        let mesg;
        switch (door.doormask) {
        case D_BROKEN: mesg = ' is broken'; break;
        case D_NODOOR: mesg = 'way has no door'; break;
        case D_ISOPEN: mesg = ' is already open'; break;
        default:       mesg = ' is locked'; break; // D_LOCKED
        }
        await pline(`This door${mesg}.`);
        return 0;
    }

    // verysmall(youmonst): false for the starter roles.
    // door is known to be CLOSED.
    if (rnl(20) < Math.trunc((acurrstr() + ACURR(A_DEX) + ACURR(A_CON)) / 3)) {
        if (door.doormask & D_TRAPPED) {
            // b_trapped path not exercised by these sessions.
            door.doormask = D_NODOOR;
        } else {
            door.doormask = D_ISOPEN;
        }
        newsym(cx, cy);
        vision_recalc(0);
        await pline('The door opens.');
    } else {
        exercise(A_STR, true); // -> rn2(19)
        await pline('The door resists!');
    }
    return 1; // ECMD_TIME
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
        return;
    }

    // ── walk into a closed door ──  C ref: hack.c test_move() door branch
    // (hack.c:1097).  With flags.autoopen ON (the default) and not running /
    // confused / stunned / fumbling, a move into a closed door calls
    // doopen_indir(x,y) instead of bumping; svc.context.move is then set from
    // whether the hero actually moved (a resisted door leaves the hero put, so
    // no turn passes — matching the recorded "door resists!" free action).
    // Diagonal moves into a door are disallowed (no autoopen there).
    {
        const tgt = game.level?.at(newx, newy);
        const closedDoor = tgt && IS_DOOR(tgt.typ)
            && (tgt.doormask & (D_CLOSED | D_LOCKED));
        if (closedDoor && !(dx && dy)) {
            if (!game.context?.run && !game.context?.mv) {
                await doopen_indir(newx, newy);
                // The hero never relocates via autoopen (the door square is not
                // entered this command), so move follows position change (false).
                u.umoved = (u.ux !== _umoved_ux0 || u.uy !== _umoved_uy0);
                game.context.move = u.umoved ? 1 : 0;
                return;
            }
            // Running (autoopen disabled) into an orthogonal closed door with
            // normal senses: announce it and stop without taking a turn.
            // C ref: hack.c test_move() else-if (x==ux||y==uy) -> pline("That
            // door is closed.").  (The blind/stunned/fumbling "bump" branch is
            // not exercised by these recordings.)
            await pline('That door is closed.');
            game.context.move = 0;
            return;
        }
    }

    if (blocksMove(newx, newy)) {
        // Can't move there
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

    // Update display
    newsym(oldx, oldy);
    vision_recalc(1);
    newsym(newx, newy);
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
