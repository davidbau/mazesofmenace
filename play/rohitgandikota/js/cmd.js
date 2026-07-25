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
import { MENU_ITEMFLAGS_NONE, MENU_BEHAVE_STANDARD } from './const.js';
import { NO_COLOR } from './terminal.js';
import { nhgetch } from './input.js';
import { newsym, flush_screen, pline, docrt } from './display.js';
import { vision_recalc } from './vision.js';
import { COLNO, ROWNO, STONE, DOOR, D_CLOSED, D_LOCKED,
         IS_WALL, IS_OBSTRUCTED } from './const.js';
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
function blocksMove(x, y) {
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
