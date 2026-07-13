// cmd.js — Command dispatch and movement.
// C ref: cmd.c rhack(), hack.c domove().
//
// Minimal skeleton: movement, search, inventory / look / spell / discoveries /
// attributes for seed8000. Contestants should add: kick, eat, drink, read, zap,
// wear, wield, drop, throw, pray, cast, and all other commands.

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { newsym, flush_screen, pline } from './display.js';
import { vision_recalc } from './vision.js';
import { COLNO, ROWNO, STONE, DOOR, D_CLOSED, D_LOCKED,
         IS_WALL, IS_OBSTRUCTED, IS_FURNITURE } from './const.js';
import {
    ddoinv, dodiscovered, doattributes, dovspell, dolook,
} from './invent.js';
import { doeat } from './eat.js';
import { dothrow } from './dothrow.js';
import { doapply } from './apply.js';
import { dokick } from './dokick.js';
import { donull } from './do.js';
import { do_attack, mon_at, is_safemon } from './uhitm.js';
import { doopen_indir } from './lock.js';
import { doextcmd } from './getline.js';
import { dosearch } from './detect.js';
import { dotakeoff, dowear } from './do_wear.js';
import { wiz_wish } from './wizcmds.js';
import { dowield } from './wield.js';


// Direction deltas: y u k
//                   h . l
//                   b j n
const DIR_DX = { h: -1, l: 1, j: 0, k: 0, y: -1, u: 1, b: -1, n: 1 };
const DIR_DY = { h: 0, l: 0, j: 1, k: -1, y: -1, u: -1, b: 1, n: 1 };

function isMovementKey(ch) {
    return 'hjklyubn'.includes(ch);
}

function isRunKey(ch) {
    return 'HJKLYUBN'.includes(ch);
}

// C ref: hack.c — check if a cell blocks movement
function blocksMove(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return true;
    if (loc.typ === STONE) return true;
    if (IS_WALL(loc.typ)) return true;
    if (loc.typ === DOOR && (loc.doormask & (D_CLOSED | D_LOCKED))) return true;
    return false;
}

function closed_door_at(x, y) {
    const loc = game.level?.at(x, y);
    return !!(loc && loc.typ === DOOR
        && (loc.doormask & (D_CLOSED | D_LOCKED)));
}

// C ref: hack.c end_running()
function end_running() {
    if (!game.context) game.context = {};
    game.context.run = 0;
    game.context.mv = 0;
    game.multi = 0;
}

// C ref: hack.c lookaround() — minimal: stop for monster ahead or blocked path
function lookaround() {
    if (!game.context?.run) return;
    const u = game.u;
    const nx = u.ux + (u.dx || 0);
    const ny = u.uy + (u.dy || 0);
    // Monster in the square we're about to enter
    const mtmp = mon_at(nx, ny);
    if (mtmp) {
        // C: (run != 1 && !safemon) || (infront && !travel)
        // infront is true here; travel omitted → always stop
        end_running();
        return;
    }
    if (blocksMove(nx, ny)) {
        end_running();
    }
}

// C ref: cmd.c — continue a DOMOVE_RUSH after the first step (moveloop multi>0)
export async function continue_run() {
    if (!game.context?.run || !(game.multi > 0) || !game.context.mv) {
        end_running();
        return false;
    }
    lookaround();
    if (!(game.multi > 0) || !game.context.run) {
        game.context.move = 0;
        return false;
    }
    // C: if (multi < COLNO && !--multi) end_running
    if (game.multi < COLNO && !--game.multi) {
        end_running();
    }
    const dx = game.u.dx || 0;
    const dy = game.u.dy || 0;
    await domove(dx, dy);
    if (game.context.move !== 0) game.context.move = 1;
    return true;
}

export function run_active() {
    return !!(game.context?.run && game.multi > 0 && game.context.mv);
}

// Repeat a counted search (20s) without reading a new key
export function search_repeat_active() {
    return !!(game._repeat_search && (game.multi || 0) > 0);
}

export async function continue_search() {
    if (!search_repeat_active()) {
        game._repeat_search = false;
        game.multi = 0;
        return false;
    }
    game.multi--;
    if (game.multi <= 0) {
        game._repeat_search = false;
        game.multi = 0;
    }
    // C: counted `Ns` re-invokes dosearch each multi tick
    await dosearch();
    game.context.move = 1;
    game.kickedloc = { x: 0, y: 0 };
    return true;
}

// C ref: cmd.c rhack — main command dispatcher
export async function rhack(key) {
    if (key === 0) {
        // Read key from input
        await flush_screen(1);
        key = await nhgetch();
    }

    // Clear prior message when a new command begins (after screen capture).
    game._pending_message = '';

    const ch = String.fromCharCode(key);

    if (isMovementKey(ch)) {
        await domove(DIR_DX[ch], DIR_DY[ch]);
        // domove sets context.move = 0 if blocked; else leave as 1 (allmain preset)
        if (game.context.move !== 0) game.context.move = 1;
    } else if (isRunKey(ch)) {
        // C ref: cmd.c do_run_* + DOMOVE_RUSH — multi = max(COLNO,ROWNO)
        const low = ch.toLowerCase();
        if (!game.context) game.context = {};
        game.context.run = 1;
        game.context.mv = 1;
        if (!game.multi) game.multi = Math.max(COLNO, ROWNO);
        game.u.last_str_turn = 0;
        await domove(DIR_DX[low], DIR_DY[low]);
        if (game.context.move !== 0) game.context.move = 1;
    } else if (ch >= '0' && ch <= '9') {
        // C ref: cmd.c digit → get_count / command_count (no turn)
        // Echo "Count: N" once the value exceeds 9 (second digit).
        if (!game.context) game.context = {};
        const d = ch.charCodeAt(0) - 48;
        game.context.command_count = (game.context.command_count || 0) * 10 + d;
        if (game.context.command_count > 500) game.context.command_count = 500;
        game.context.move = 0;
        if (game.context.command_count > 9) {
            const qbuf = `Count: ${game.context.command_count}`;
            game._pending_message = qbuf;
            await flush_screen(1);
            const disp = game.nhDisplay;
            if (disp?.setCursor) disp.setCursor(qbuf.length, 0);
        }
    } else if (ch === 'a') {
        // C ref: apply.c doapply
        const tookTime = await doapply();
        game.context.move = tookTime ? 1 : 0;
        if (tookTime) game.kickedloc = { x: 0, y: 0 };
    } else if (key === 4) { // Ctrl-D
        // C ref: dokick.c dokick — #kick
        const tookTime = await dokick();
        game.context.move = tookTime ? 1 : 0;
        // C: do NOT clear kickedloc after dokick — pets avoid it this turn
    } else if (ch === '.') {
        // C ref: do.c donull / cmd.c — wait; timed non-kick clears kickedloc
        const tookTime = donull();
        game.context.move = tookTime ? 1 : 0;
        if (tookTime) game.kickedloc = { x: 0, y: 0 };
    } else if (ch === 's') {
        // C ref: detect.c dosearch — takes a turn; count from digit prefix
        const n = game.context?.command_count || 0;
        if (game.context) game.context.command_count = 0;
        if (n > 1) {
            // C: multi = command_count; first search is this turn, rest via multi
            game.multi = n - 1;
            game.context.mv = 0;
            game._repeat_search = true;
        }
        await dosearch();
        game.context.move = 1;
        game.kickedloc = { x: 0, y: 0 };
    } else if (ch === 'T') {
        // C ref: do_wear.c dotakeoff — take off armor/accessory
        const tookTime = await dotakeoff();
        game.context.move = tookTime ? 1 : 0;
        if (tookTime) game.kickedloc = { x: 0, y: 0 };
    } else if (ch === 'w') {
        // C ref: wield.c dowield — wield a weapon
        const tookTime = await dowield();
        game.context.move = tookTime ? 1 : 0;
        if (tookTime) game.kickedloc = { x: 0, y: 0 };
    } else if (ch === 'W') {
        // C ref: do_wear.c dowear — wear armor
        const tookTime = await dowear();
        game.context.move = tookTime ? 1 : 0;
        if (tookTime) game.kickedloc = { x: 0, y: 0 };
    } else if (ch === 'i') {
        // C ref: invent.c ddoinv / display_inventory
        await ddoinv();
        game.context.move = 0;
    } else if (ch === 'e') {
        // C ref: eat.c doeat
        const tookTime = await doeat();
        game.context.move = tookTime ? 1 : 0;
        if (tookTime) game.kickedloc = { x: 0, y: 0 };
    } else if (ch === 't') {
        // C ref: dothrow.c dothrow
        const tookTime = await dothrow();
        game.context.move = tookTime ? 1 : 0;
        if (tookTime) game.kickedloc = { x: 0, y: 0 };
    } else if (ch === '+') {
        // C ref: spell.c dovspell
        await dovspell();
        game.context.move = 0;
    } else if (ch === '\\') {
        // C ref: o_init.c dodiscovered
        await dodiscovered();
        game.context.move = 0;
    } else if (key === 24) { // ^X
        // C ref: insight.c enlightenment / doattributes
        await doattributes();
        game.context.move = 0;
    } else if (key === 23) { // ^W — C('w') wiz_wish
        // C ref: wizcmds.c wiz_wish / cmd.c wizwish
        await wiz_wish();
        game.context.move = 0;
    } else if (ch === ':') {
        // C ref: invent.c dolook / lookat
        await dolook();
        game.context.move = 0;
    } else if (ch === '#') {
        // C ref: cmd.c doextcmd — extended commands
        await doextcmd();
        game.context.move = 0;
    } else if (key === 27) {
        // Esc — cancel run/count; no message
        // C ref: cmd.c / hack.c — ESC ends running and clears multi
        if (game.context?.run || (game.multi || 0) > 0) end_running();
        if (game.context) game.context.command_count = 0;
        game._repeat_search = false;
        game.context.move = 0;
    } else {
        // Unknown command (includes unbound space when !rest_on_space)
        if (game.context?.run || (game.multi || 0) > 0) end_running();
        if (game.context) game.context.command_count = 0;
        game._repeat_search = false;
        game.context.move = 0;
        await pline(`Unknown command '${ch}'.`);
    }
}

// C ref: hack.c domove — execute a movement
async function domove(dx, dy) {
    const u = game.u;
    const newx = u.ux + dx;
    const newy = u.uy + dy;

    // C sets u.dx/u.dy before the blocked-move check (used by lookaround/run)
    u.dx = dx;
    u.dy = dy;
    u.ux0 = u.ux;
    u.uy0 = u.uy;

    // C ref: hack.c test_move — closed_door + flags.autoopen → doopen_indir
    if (closed_door_at(newx, newy)) {
        if (game.context?.run) end_running();
        // C: autoopen default On; skip when run / Confusion / Stunned / Fumbling
        const autoopen = game.flags?.autoopen !== false;
        const impaired = !!(u.Confusion || u.Stunned || u.Fumbling);
        if (autoopen && !game.context?.run && !impaired) {
            await doopen_indir(newx, newy);
            // C: door_opened = !closed_door; move = (pos changed) → usually 0.
            // Both open and resist leave context.move false for autoopen.
            game.context.move = 0;
            return;
        }
        game.context.move = 0;
        return;
    }

    if (blocksMove(newx, newy)) {
        // Can't move there — end a run so lookaround/continue_run don't
        // keep going in the previous direction with stale multi.
        if (game.context?.run) end_running();
        game.context.move = 0;
        return;
    }

    const oldx = u.ux, oldy = u.uy;

    // C ref: hack.c — monster at destination → do_attack (pets via safemon)
    const mtmp = mon_at(newx, newy);
    if (mtmp) {
        // C: domove_attackmon_at → do_attack
        if (do_attack(mtmp)) {
            // Move consumed (stopped for pet in the way, or attacked)
            if (game.context?.run) end_running();
            return;
        }
        // do_attack returned false → displace/swap with safemon
        if (is_safemon(mtmp)) {
            mtmp.mx = oldx;
            mtmp.my = oldy;
            const raw = mtmp.data?.name || 'monster';
            const plain = String(raw).replace(/^PM_/, '').replace(/_/g, ' ').toLowerCase();
            // C: "You swap places with your little dog."
            await pline(`You swap places with your ${plain}.`);
        }
    }

    // Move the hero
    u.ux = newx;
    u.uy = newy;

    // C ref: hack.c domove — clear kickedloc after a successful move
    game.kickedloc = { x: 0, y: 0 };

    // C: running stops on door / obstructed / furniture
    if (game.context?.run && game.context.run < 8) {
        const tmpr = game.level?.at(newx, newy);
        if (tmpr && (tmpr.typ === DOOR || IS_OBSTRUCTED(tmpr.typ)
            || IS_FURNITURE(tmpr.typ))) {
            end_running();
        }
    }

    // Update display
    newsym(oldx, oldy);
    vision_recalc(1);
    newsym(newx, newy);
}
