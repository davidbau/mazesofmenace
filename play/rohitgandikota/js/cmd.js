// cmd.js — Command dispatch and movement.
// C ref: cmd.c rhack(), hack.c domove().
//
// Minimal skeleton: only hjklyubn movement is implemented.
// Contestants should add: search, kick, eat, drink, read, zap,
// wear, wield, drop, throw, pray, cast, and all other commands.

import { game } from './gstate.js';
import { dodiscovered } from './o_init.js';
import { enlightenment } from './insight.js';
import {
    tty_create_nhwindow, tty_putstr, tty_display_nhwindow, tty_next_page,
    tty_destroy_nhwindow, tty_start_menu, tty_add_menu, tty_end_menu,
    NHW_TEXT, NHW_MENU, ATR_NONE,
} from './tty/wintty.js';
import { MENU_ITEMFLAGS_NONE, MENU_BEHAVE_STANDARD, isok } from './const.js';
import { doopen, doopen_indir } from './lock.js';
import { ECMD_OK, getobj } from './invent.js';
import { doeat } from './eat.js';
import { doapply } from './apply.js';
import { dochat } from './sounds.js';
import { dothrow } from './dothrow.js';
import { getpos } from './getpos.js';
import { NO_COLOR } from './terminal.js';
import { nhgetch } from './input.js';
import { newsym, flush_screen, pline, docrt } from './display.js';
import { vision_recalc } from './vision.js';
import { COLNO, ROWNO, STONE, DOOR, D_CLOSED, D_LOCKED,
         IS_WALL, IS_OBSTRUCTED, IS_DOOR } from './const.js';
import { dosearch } from './detect.js';
import { dolook, ECMD_TIME, display_inventory } from './invent.js';
import { dovspell } from './spell.js';

// Direction deltas: y u k
//                   h . l
//                   b j n
const DIR_DX = { h: -1, l: 1, j: 0, k: 0, y: -1, u: 1, b: -1, n: 1 };
const DIR_DY = { h: 0, l: 0, j: 1, k: -1, y: -1, u: -1, b: 1, n: 1 };

function isMovementKey(ch) {
    return 'hjklyubn'.includes(ch);
}

// Keys src/cmd.c dispatches to real commands that this port has not reached
// yet. Listed explicitly so the set shrinks visibly as commands land, rather
// than hiding behind a catch-all.
const KNOWN_UNPORTED = new Set([
    /* ESC and space reach the main prompt only when no window is open — a
       window consumes its own dismissing key inside display_nhwindow(). C
       treats both as no-ops here and prints nothing, so they must NOT fall
       through to the "Unknown command" branch. */
    '\x1b',
    ' ',
]);

// C ref: hack.c — check if a cell blocks movement
// include/rm.h closed_door()
function closed_door(x, y) {
    const loc = game.level?.at(x, y);
    return !!(loc && IS_DOOR(loc.typ) && (loc.doormask & (D_CLOSED | D_LOCKED)));
}

/* src/allmain.c — autoopen defaults on and none of the recorded rc files turn
   it off, but read the option rather than assuming so an rc that does is
   honoured. */
function flags_autoopen() {
    return game.flags?.autoopen !== false;
}

function blocksMove(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return true;
    if (loc.typ === STONE) return true;
    if (IS_WALL(loc.typ)) return true;
    if (loc.typ === DOOR && (loc.doormask & (D_CLOSED | D_LOCKED))) return true;
    return false;
}

// C ref: cmd.c rhack — main command dispatcher
// src/cmd.c confdir() — a confused or stunned hero moves in a random direction.
// u_maybe_impaired() is false while the property subsystem is absent, so this
// draws nothing yet; it is written out so the draw lands in the right place
// when Confusion becomes reachable.
function confdir(force_impairment) {
    if (force_impairment || u_maybe_impaired()) {
        note_unported_cmd('confdir:impaired');
    }
}

// src/hack.c u_maybe_impaired()
function u_maybe_impaired() {
    return !!(game.u.uprops?.CONFUSION || game.u.uprops?.STUNNED);
}

// src/cmd.c getdir() — read a direction key and set u.dx/u.dy/u.dz.
//
// Only the plain movement-key path is reachable from a recorded session; the
// mouse, help and fuzzer arms all need input this port does not receive. The
// key IS consumed either way, so a caller that skips getdir leaves the session
// one keystroke out of step, not merely one draw.
export async function getdir(s) {
    const dirsym = String.fromCharCode(await nhgetch());

    if (dirsym === '.' || dirsym === 's') {
        game.u.dx = game.u.dy = game.u.dz = 0;
        return true;
    }
    if (dirsym === '<' || dirsym === '>') {
        game.u.dx = game.u.dy = 0;
        game.u.dz = (dirsym === '<') ? -1 : 1;
        return true;
    }
    if (!isMovementKey(dirsym)) {
        /* "What a strange direction!" — no draw, no turn */
        return false;
    }
    game.u.dx = DIR_DX[dirsym];
    game.u.dy = DIR_DY[dirsym];
    game.u.dz = 0;

    if (!game.u.dz)
        confdir(false);
    return true;
}

// src/cmd.c get_adjacent_loc()
export async function get_adjacent_loc(prompt, emsg, x, y, cc) {
    if (!await getdir(prompt))
        return 0; /* pline1(Never_mind) */

    const new_x = x + game.u.dx;
    const new_y = y + game.u.dy;
    if (cc && isok(new_x, new_y)) {
        cc.x = new_x;
        cc.y = new_y;
    } else {
        return 0;
    }
    return 1;
}

function note_unported_cmd(what) {
    (game.unported ||= new Set()).add(what);
}

// win/tty/getline.c hooked_tty_getlin() — read a line of text.
//
// The completion hook rewrites what is DISPLAYED as you type; it never changes
// which keys are consumed. Consumption is what matters here: a command line
// left unread turns its own letters into commands, which is what "#jump\n"
// was doing — j and u moved the hero and the rest were swallowed.
export async function getlin(query) {
    let buf = '';

    for (;;) {
        const c = String.fromCharCode(await nhgetch());

        if (c === '\x1b') {                 /* ESC abandons the line */
            return '\x1b';
        } else if (c === '\n' || c === '\r') {
            break;
        } else if (c === '\b' || c === '\x7f') {
            buf = buf.slice(0, -1);
        } else if (c >= ' ' && c !== '\x7f') {
            buf += c;
        }
    }
    return buf;
}

// win/tty/getline.c:292 tty_get_ext_cmd() — read an extended command name and
// match it against extcmdlist.
async function get_ext_cmd() {
    const buf = (await getlin('#')).trim();

    if (buf === '' || buf === '\x1b')
        return null;
    /* extcmds_match with ECM_EXACTMATCH: the hook has already completed the
       text, so C matches the whole name. */
    return buf;
}

/* The commands whose first act is getobj() and which read nothing further.
   Their effects need the use/wear/drop subsystems; what is ported is the
   object prompt, because that is what decides where the next keystroke goes. */
async function docmd_getobj(ch) {
    const obj = await getobj(ch, null, 0);

    if (!obj)
        return ECMD_OK;   /* Never mind */

    note_unported_cmd(`cmd:${ch}`);
    return ECMD_TIME;
}

// src/dothrow.c:469 dofire() -> throw_obj() -> getdir().
//
// The throw itself needs the missile and trajectory code. What is ported is the
// direction read, because that is what keeps the session in step: C spends a key
// on it and stays put, so a port that skips it walks the hero instead.
async function dofire() {
    /* src/dothrow.c:469 — with a quivered missile C goes straight to
       throw_obj() and its getdir(). With an EMPTY quiver it instead prompts for
       something to fire, which reads a different number of keys, so guessing
       the direction read there would put the session out of step in the other
       direction. Record that case rather than consume a key for it. */
    if (!game.u.uquiver) {
        note_unported_cmd('dofire:empty quiver prompt');
        return ECMD_OK;
    }

    if (!await getdir(null))
        return ECMD_OK;

    note_unported_cmd('dofire:throwit');
    return ECMD_TIME;
}

// src/cmd.c:495 doextcmd() — dispatch an extended command.
//
// The individual commands are not ported. What IS ported is reading the whole
// name off the input, because a session that issues one and does not have it
// consumed runs every later keystroke against the wrong command.
export async function doextcmd() {
    const name = await get_ext_cmd();

    if (name === null)
        return ECMD_OK; /* quit */

    /* src/cmd.c extcmdlist — the command's own function runs here. Only the
       ones that consume further input are wired up so far, because those are
       the ones whose absence puts the whole session out of step. */
    if (name === 'jump')
        return await dojump();

    note_unported_cmd(`extcmd:${name}`);
    return ECMD_OK;
}

// src/apply.c:1847 dojump() -> jump(0). The jump itself needs the movement and
// trap plumbing; what is ported is the getpos() call at src/apply.c:2063, which
// is where a session's cursor keys and pick go.
async function dojump() {
    const cc = { x: game.u.ux, y: game.u.uy };

    /* pline("Where do you want to jump?") */
    if (await getpos(cc, true, 'the desired position') < 0)
        return ECMD_OK; /* ECMD_CANCEL — user pressed ESC */

    note_unported_cmd('jump:movement');
    return ECMD_OK;
}

export async function rhack(key) {
    if (key === 0) {
        // Read key from input
        await flush_screen(1);
        key = await nhgetch();
        // The boundary frame has now been captured with the previous
        // command's message on it, so it is safe to clear for this command.
        game._pending_message = '';
    }

    const ch = String.fromCharCode(key);

    if (isMovementKey(ch)) {
        await domove(DIR_DX[ch], DIR_DY[ch]);
        game.context.move = 1;
    } else if (ch === 's') {
        // src/cmd.c cmdlist — 's' is dosearch, which returns ECMD_TIME.
        game.context.move = (dosearch() ? 1 : 0);
    } else if (ch === '+') {
        // src/cmd.c cmdlist — '+' is dovspell.
        game.context.move = (dovspell() === ECMD_TIME ? 1 : 0);
    } else if (ch === 'i') {
        // src/cmd.c cmdlist — 'i' is ddoinv, which returns ECMD_OK.
        game.context.move = 0;
        await show_inventory();
    } else if (ch === '\x18') {
        // src/cmd.c cmdlist — ^X is doattributes, which returns ECMD_OK.
        game.context.move = 0;
        await show_attributes();
    } else if (ch === '\\') {
        // src/cmd.c cmdlist — '\\' is dodiscovered, which returns ECMD_OK.
        game.context.move = 0;
        await show_discoveries();
    } else if (ch === 'g') {
        // src/cmd.c:1839 do_rush — a PREFIX that sets context.run = 2, making
        // the direction that follows RUN until something interesting appears
        // rather than take one step. It reads no extra key, so this does not
        // misalign the keystream; it moves the hero a different DISTANCE, which
        // is a larger positional divergence than the fight prefix causes.
        if (game.context.run) {
            /* "Double rush prefix, canceled." */
            game.context.run = 0;
        } else {
            game.context.run = 2;
        }
        game.context.move = 0;
    } else if (ch === 'm') {
        // src/cmd.c:1829 do_reqmenu — a PREFIX setting iflags.menu_requested.
        // For a movement command it means "move without picking up", which is
        // a no-op while every recorded rc sets !autopickup; for others it asks
        // for a menu. Reads no extra key.
        if (game.iflags.menu_requested) {
            /* "Double m prefix, canceled." */
            game.iflags.menu_requested = false;
        } else {
            game.iflags.menu_requested = true;
        }
        game.context.move = 0;
    } else if (ch === 'F') {
        // src/cmd.c:1622 do_fight — a PREFIX. It sets context.forcefight and
        // returns WITHOUT reading another key; the direction that follows is a
        // normal movement command that attacks instead of moving. Leaving 'F'
        // unhandled therefore did not misalign keys, it displaced the HERO:
        // C attacks and stays put where we walked into the square.
        if (game.context.forcefight) {
            /* "Double fight prefix, canceled." */
            game.context.forcefight = 0;
            game.context.move = 0;
        } else {
            game.context.forcefight = 1;
            game.context.move = 0;
        }
    } else if (ch === 't') {
        // src/cmd.c cmdlist — 't' is dothrow: getobj() for the object, then
        // throw_obj()'s getdir() for the direction. 133 keystrokes across the
        // public corpus, and both reads were previously left to run as commands.
        game.context.move = (await dothrow() === ECMD_TIME ? 1 : 0);
    } else if (ch === 'c') {
        // src/cmd.c cmdlist — 'c' is dochat, whose getdir() consumes a second
        // key. 107 keystrokes across the public corpus.
        game.context.move = (await dochat() === ECMD_TIME ? 1 : 0);
    } else if (ch === 'a') {
        // src/cmd.c cmdlist — 'a' is doapply. 232 keystrokes across the corpus.
        game.context.move = (await doapply() === ECMD_TIME ? 1 : 0);
    } else if (ch === 'e') {
        // src/cmd.c cmdlist — 'e' is doeat, which reaches floorfood() and then
        // getobj(). 330 keystrokes across the public corpus, the most of any
        // command we did not handle.
        game.context.move = (await doeat() === ECMD_TIME ? 1 : 0);
    } else if ('rwqdWPR'.includes(ch)) {
        // src/cmd.c cmdlist — read, wield, quaff, drop, wear, put on, remove.
        // Every one of them starts with getobj(), which reads the inventory
        // letter. Their effects are unported, but consuming that letter is what
        // keeps the session in step: skip it and the letter runs as a command.
        game.context.move = (await docmd_getobj(ch) === ECMD_TIME ? 1 : 0);
    } else if (ch === '.') {
        // src/cmd.c:1930 — '.' is "wait", donull, which returns ECMD_TIME.
        // src/do.c:2351: the only early exit is cmd_safety_prevention, which
        // fires on a paranoid-confirmation option none of the recorded rc
        // files set. So this rests one move and CONSUMES A TURN; leaving it
        // unhandled made the hero stand still for free while C's clock moved.
        game.context.move = 1;
    } else if (ch === 'f') {
        // src/cmd.c cmdlist — 'f' is dofire, which reaches throw_obj() and
        // getdir(). C consumes the direction key there and the hero does NOT
        // move; leaving 'f' unhandled let the direction run as a movement
        // command and walked the hero one square off, which is what seed0102
        // shows at step 21.
        game.context.move = (await dofire() === ECMD_TIME ? 1 : 0);
    } else if (ch === '#') {
        // src/cmd.c cmdlist — '#' is doextcmd, which reads the command name
        // off the input before doing anything.
        game.context.move = (await doextcmd() === ECMD_TIME ? 1 : 0);
    } else if (ch === 'o') {
        // src/cmd.c cmdlist — 'o' is doopen. It reads a direction key of its
        // own, so skipping it would put the whole session out of step.
        game.context.move = (await doopen() === ECMD_TIME ? 1 : 0);
    } else if (ch === ':') {
        // src/cmd.c cmdlist — ':' is dolook. It returns ECMD_OK when not
        // blind, so looking does not consume a turn.
        game.context.move = (dolook() === ECMD_TIME ? 1 : 0);
    } else if (KNOWN_UNPORTED.has(ch)) {
        // C recognises these keys and does real work for them; we have not
        // ported that work yet. Emitting "Unknown command" here would be
        // actively wrong — C never says that for these — so produce no
        // message and consume no turn until the real command lands.
        game.context.move = 0;
    } else {
        // src/cmd.c rhack() — genuinely unrecognised key.
        game.context.move = 0;
        await pline(`Unknown command '${ch}'.`);
    }
}

// C ref: hack.c domove — execute a movement
async function domove(dx, dy) {
    const u = game.u;
    const newx = u.ux + dx;
    const newy = u.uy + dy;

    /* src/hack.c — with the rush prefix set, domove() repeats until lookaround()
       finds something interesting, so C travels several squares where a single
       step is taken here. The run loop needs lookaround() and is not ported;
       record it so the distance gap is visible rather than silent. */
    if (game.context.run) {
        note_unported_cmd('domove:run loop');
        game.context.run = 0;
    }

    /* src/hack.c:2242 — with the fight prefix set, the hero attacks the target
       square instead of moving onto it, whether or not anything is there. The
       attack itself needs the combat code; what matters here is that the hero
       does NOT move and the turn is still spent. */
    if (game.context.forcefight) {
        game.context.forcefight = 0;
        note_unported_cmd('domove:forcefight attack');
        game.context.move = 1;
        return;
    }

    /* src/hack.c:1097 — walking into a closed door opens it, and doopen_indir()
       is where the rnl(20) is spent. autoopen is on by default, so a session
       never needs to press 'o' for this draw to happen; it fires on the first
       step into a doorway. */
    if (closed_door(newx, newy)
        && flags_autoopen() && !game.context.run
        && !game.u.uprops?.CONFUSION && !game.u.uprops?.STUNNED
        && !game.u.uprops?.FUMBLING) {
        await doopen_indir(newx, newy);
        game.context.door_opened = !closed_door(newx, newy);
        game.context.move = 0; /* (ux != u.ux || uy != u.uy) */
        return;
    }

    if (blocksMove(newx, newy)) {
        // Can't move there
        game.context.move = 0;
        return;
    }

    // Move the hero
    const oldx = u.ux, oldy = u.uy;
    u.ux0 = oldx;
    u.uy0 = oldy;
    u.ux = newx;
    u.uy = newy;

    // Update display
    newsym(oldx, oldy);
    vision_recalc(1);
    newsym(newx, newy);
}


// src/o_init.c dodiscovered() feeds an NHW_TEXT window, which js/tty/wintty.js
// lays out. The window stays up until a key dismisses it, so the frame captured
// at the NEXT nhgetch() is the one showing it.
let open_window = null;

// C's display_nhwindow(win, TRUE) BLOCKS inside the window: wintty.c's dmore()
// waits for a key while the window is on screen, so the frame the recorder
// captures at that nhgetch() is the window itself. Returning to the move loop
// instead would let its flush_screen() redraw the map over it before the next
// capture, which is exactly what a first attempt at this did.
async function show_discoveries() {
    const lines = dodiscovered();
    if (!lines) {
        await pline("You haven't discovered anything yet...");
        return;
    }
    const win = tty_create_nhwindow(NHW_TEXT);
    for (const [text, attr] of lines)
        tty_putstr(win, attr, text);
    tty_display_nhwindow(win);      /* draws the page and parks the cursor */

    /* dmore(): block here until the player dismisses the window */
    await nhgetch();

    tty_destroy_nhwindow(win);
    await docrt();                  /* restore the map underneath */
}


// src/insight.c doattributes() -> enlightenment(BASICENLIGHTENMENT, 0).
//
// The window is an NHW_MENU (create_nhwindow(NHW_MENU) with start_menu, so
// en_via_menu is set and every line goes through add_menu_str). Its 34 lines
// exceed the screen, which collapses offx to 0 and makes it page: the player
// gets "(1 of 2)", presses a key, gets "(2 of 2)", presses again.
async function show_attributes() {
    const win = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(win, MENU_BEHAVE_STANDARD);
    for (const l of enlightenment())
        tty_add_menu(win, null, 0, 0, 0, ATR_NONE, NO_COLOR, l,
                     MENU_ITEMFLAGS_NONE);
    tty_end_menu(win, null);
    tty_display_nhwindow(win);

    /* dmore() blocks once per page */
    await nhgetch();
    while (tty_next_page(win))
        await nhgetch();

    tty_destroy_nhwindow(win);
    await docrt();
}


// src/invent.c display_inventory() -> an NHW_MENU. Its longest line decides
// offx: 80 - (maxcol) - 1, and js/tty/wintty.js adds the +2 for the leading
// and trailing space. seed8000 records the window at column 32 with the cursor
// at [38,20].
async function show_inventory() {
    const items = display_inventory();
    if (!items.length) {
        await pline('Not carrying anything.');
        return;
    }
    const win = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(win, MENU_BEHAVE_STANDARD);
    for (const it of items)
        tty_add_menu(win, null, it.heading ? 0 : 1, it.invlet || 0, 0,
                     it.attr, NO_COLOR, it.str, MENU_ITEMFLAGS_NONE);
    tty_end_menu(win, null);
    tty_display_nhwindow(win);

    await nhgetch();
    while (tty_next_page(win))
        await nhgetch();

    tty_destroy_nhwindow(win);
    await docrt();
}
