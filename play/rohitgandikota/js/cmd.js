// cmd.js — Command dispatch and movement.
// C ref: cmd.c rhack(), hack.c domove().
//
// Minimal skeleton: only hjklyubn movement is implemented.
// Contestants should add: search, kick, eat, drink, read, zap,
// wear, wield, drop, throw, pray, cast, and all other commands.

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { newsym, flush_screen, pline } from './display.js';
import { vision_recalc } from './vision.js';
import { COLNO, ROWNO, STONE, DOOR, D_CLOSED, D_LOCKED,
         IS_WALL, IS_OBSTRUCTED } from './const.js';
import { dosearch } from './detect.js';
import { dolook, ECMD_TIME } from './invent.js';
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
    'i',      // ddoinv       — inventory menu
    '\\',    // dodiscovered — discoveries
    '\x18',   // doattributes — ^X
    '\x1b',   // ESC          — dismiss / cancel
    ' ',      // dismiss --More--
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
