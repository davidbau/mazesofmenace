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
import { tty_clear_nhwindow, tty_get_ext_cmd } from './wintty.js';
import { extcmdlist, CMD_NOT_AVAILABLE, INTERNALCMD, WIZMODECMD, AUTOCOMPLETE,
         ECM_IGNOREAC, ECM_EXACTMATCH, ECM_NO1CHARCMD } from './func_tab.js';
import { strcmpi, strncmpi } from './hacklib.js';
import { dosearch } from './detect.js';
import { level_tele } from './teleport.js';
import { wiz_level_change, wiz_wish } from './wizcmds.js';
import { ddoinv } from './invent.js';
import { cmd_safety_prevention, nomul } from './hack.js';
import { IS_DOOR, IS_FURNITURE } from './const.js';
import { dovspell, docast } from './spell.js';
import { dodiscovered } from './o_init.js';
import { doattributes } from './insight.js';
import { wiz_genesis } from './wizcmds.js';

// C ref: cmd.c extcmds_match() -- the indices of the extcmdlist[]
// entries matching findstr
export function extcmds_match(findstr, ecmflags) {
    const retmatchlist = [];
    const fslen = findstr ? findstr.length : 0;
    const ignoreac = (ecmflags & ECM_IGNOREAC) !== 0;
    const exactmatch = (ecmflags & ECM_EXACTMATCH) !== 0;
    const no1charcmd = (ecmflags & ECM_NO1CHARCMD) !== 0;
    const wizard = !!game.flags?.debug;

    for (let i = 0; i < extcmdlist.length; i++) {
        const ec = extcmdlist[i];
        if (ec.flags & (CMD_NOT_AVAILABLE | INTERNALCMD))
            continue;
        if (!wizard && (ec.flags & WIZMODECMD))
            continue;
        if (!ignoreac && !(ec.flags & AUTOCOMPLETE))
            continue;
        if (no1charcmd && (ec.ef_txt.length === 1))
            continue;
        if (!findstr) {
            retmatchlist.push(i);
        } else if (exactmatch) {
            if (!strcmpi(findstr, ec.ef_txt))
                retmatchlist.push(i);
        } else {
            if (!strncmpi(findstr, ec.ef_txt, fslen))
                retmatchlist.push(i);
        }
    }
    return retmatchlist;
}

// the extended commands ported so far, by their cmd.c function name
const ext_funcs = {
    dosearch: () => dosearch(),
    donull: () => donull(),
    wiz_level_change: () => wiz_level_change(),
    wiz_wish: () => wiz_wish(),
};

// C ref: cmd.c doextcmd() -- here is the main command dispatcher for
// the extended commands (not bound to '#' in rhack() yet)
async function doextcmd() {
    let idx, retval, func;

    /* keep repeating until we don't run help or quit */
    do {
        idx = await tty_get_ext_cmd();
        if (idx < 0)
            return 0; /* ECMD_OK: quit */

        func = extcmdlist[idx].ef_funct;
        /* can_do_extcmd(), iflags.menu_requested -- not ported yet */
        if (!ext_funcs[func]) {
            /* the command itself is not ported yet; no time passes */
            return 0;
        }
        retval = await ext_funcs[func]();
    } while (func === "doextlist");

    return retval;
}

// C ref: do.c donull() -- '.' command: do nothing == rest
async function donull() {
    if (await cmd_safety_prevention("Waiting", "a no-op (to rest)",
                                    "Are you waiting to get hit?",
                                    "did_nothing_flag"))
        return 0; /* ECMD_OK */
    return 1; /* ECMD_TIME: Do nothing, but let other things happen */
}
import { COLNO, ROWNO, STONE, DOOR, D_CLOSED, D_LOCKED,
         IS_WALL, IS_OBSTRUCTED } from './const.js';

// Direction deltas: y u k
//                   h . l
//                   b j n
const DIR_DX = { h: -1, l: 1, j: 0, k: 0, y: -1, u: 1, b: -1, n: 1 };
const DIR_DY = { h: 0, l: 0, j: 1, k: -1, y: -1, u: -1, b: 1, n: 1 };

function isMovementKey(ch) {
    return 'hjklyubn'.includes(ch);
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

// C ref: cmd.c rhack — main command dispatcher
export async function rhack(key) {
    const firsttime = (key === 0);
    if (key === 0 && game.cmdq?.length) {
        /* C ref: cmd.c rhack() -- a queued (CQ_CANNED) command from
           itemactions_pushkeys() runs before reading the keyboard */
        const cmdq = game.cmdq.shift();
        if (cmdq.typ === 'ec') {
            const fn = ext_funcs[cmdq.fn];
            if (!fn) {
                /* the queued command is not ported yet: nothing happens,
                   and the keys queued for it go with it (cmdq_clear()) */
                game.cmdq = [];
                game.context.move = 0;
                return;
            }
            game.context.move = (await fn()) ? 1 : 0;
            return;
        }
        key = cmdq.key.charCodeAt(0);
    } else if (key === 0) {
        // Read key from input
        await flush_screen(1);
        key = await nhgetch();
        /* C ref: cmd.c parse() -- the message window is cleared once the
           command key has been read */
        tty_clear_nhwindow(game.WIN_MESSAGE);
    }

    const ch = String.fromCharCode(key);

    /* if there's no command, there's nothing to do except reset */
    if (!key || key === 0o377 || ch === '\x1b') {
        game.context.move = 0; /* reset_cmd_vars(TRUE) */
        return;
    }

    if (isMovementKey(ch)) {
        set_move_cmd(ch, 0); /* do_move_<dir>() */
        await domove();
        game.context.move = 1;
    } else if (isMovementKey(ch.toLowerCase())) {
        /* C ref: cmd.c do_run_<dir>() -- shift+dir is MV_RUN */
        set_move_cmd(ch.toLowerCase(), 1);
        /* rhack(): (gd.domove_attempting & DOMOVE_RUSH) != 0 */
        if (firsttime) {
            if (!game.multi)
                game.multi = Math.max(COLNO, ROWNO);
            game.u.last_str_turn = 0;
        }
        game.context.mv = 1;
        await domove();
        game.iflags.menu_requested = false;
        return;
    } else if (ch === '\x17' && game.flags?.debug) {
        /* C ref: cmd.c Cmd ^W (wizard mode) -> wizcmds.c wiz_wish() */
        game.context.move = (await wiz_wish()) ? 1 : 0;
    } else if (ch === '\x16' && game.flags?.debug) {
        /* C ref: cmd.c Cmd ^V (wizard mode) -> wizcmds.c wiz_level_tele() */
        await level_tele();
        game.context.move = 0; /* ECMD_OK */
    } else if (ch === '.') {
        /* C ref: cmd.c Cmd '.' -> donull(); ECMD_TIME takes a move */
        game.context.move = (await donull()) ? 1 : 0;
    } else if (ch === 'i') {
        /* C ref: cmd.c Cmd 'i' -> invent.c ddoinv(); ECMD_OK, no time */
        await ddoinv();
        game.context.move = 0;
    } else if (ch === '+' || ch === '\\' || ch === '\x18' || ch === 'Z'
               || (ch === '\x07' && game.flags?.debug)) {
        /* C ref: cmd.c Cmd '+' dovspell(), '\\' dodiscovered(),
           ^X doattributes(), 'Z' docast(), ^G (wizard mode) wiz_genesis();
           ECMD_TIME takes a move */
        const fn = (ch === '+') ? dovspell : (ch === '\\') ? dodiscovered
                   : (ch === '\x18') ? doattributes
                   : (ch === 'Z') ? docast : wiz_genesis;
        game.context.move = ((await fn()) & 1) ? 1 : 0;
    } else {
        /* every other command is not ported yet ('#' doextcmd() and 's'
           dosearch() wait for the tutorial query, without which keys
           typed at it would reach the command loop), and neither are the
           prompts and windows whose keys would otherwise arrive here.
           C's "Unknown command '%s'." for keys missing from cmdlist[] is
           left out until the key bindings (cmd.c reset_commands()) are
           ported -- nothing happens */
        game.context.move = 0;
    }
}

// C ref: cmd.c set_move_cmd() -- dir is the direction key, run the
// context.run mode (0 walk, 1 shift-run, 3 rush)
function set_move_cmd(dir, run) {
    const u = game.u;
    u.dz = 0;
    u.dx = DIR_DX[dir];
    u.dy = DIR_DY[dir];
    /* #reqmenu -prefix disables autopickup during movement */
    if (game.iflags.menu_requested)
        game.context.nopick = 1;
    game.context.travel = game.context.travel1 = 0;
    /* if (!gd.domove_attempting && !u.dz): prefixes aren't ported yet */
    game.context.run = run;
}

// C ref: hack.c domove() / domove_core() -- execute a movement in
// direction u.dx, u.dy
export async function domove() {
    const u = game.u;
    const newx = u.ux + u.dx;
    const newy = u.uy + u.dy;

    if (blocksMove(newx, newy)) {
        // Can't move there: test_move() failed
        game.context.move = 0;
        nomul(0);
        return;
    }

    // Move the hero
    const oldx = u.ux, oldy = u.uy;
    u.ux0 = oldx;
    u.uy0 = oldy;
    u.ux = newx;
    u.uy = newy;

    const tmpr = game.level.at(u.ux, u.uy);
    if (game.context.run) {
        if (game.context.run < 8)
            if (IS_DOOR(tmpr.typ) || IS_OBSTRUCTED(tmpr.typ)
                || IS_FURNITURE(tmpr.typ))
                nomul(0);
    }

    if (u.ux0 !== u.ux || u.uy0 !== u.uy) {
        u.umoved = 1;
        // Update display
        newsym(oldx, oldy);
        vision_recalc(1);
        newsym(newx, newy);
    }
    /* runmode_delay_output(): display timing only */
}
