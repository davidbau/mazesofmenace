import { seemimic } from './mon.js';
// cmd.js — Command dispatch and movement.
// C ref: cmd.c rhack(), hack.c domove().
//
// Minimal skeleton: only hjklyubn movement is implemented.
// Contestants should add: search, kick, eat, drink, read, zap,
// wear, wield, drop, throw, pray, cast, and all other commands.

import { game } from './gstate.js';
import { dodrop } from './do.js';
import { any_obj_ok, doprwep, doprarm, doprring, dopramulet, doprtool,
         doprinuse, doprgold } from './invent.js';
import { dodown, doup, do_wire_mklev, do_wire_dokick, stairway_at } from './do.js';
import { dokick_wire, ship_object, dokick } from './dokick.js';
import { mklev, mklev_wire_mon } from './mklev.js';
import { sp_lev_wire_mon } from './sp_lev.js';
import { is_pool, is_lava, m_at, t_at, newcham, resists_ston,
         mongone } from './mon.js';
import { do_attack } from './uhitm.js';
import { is_safemon, mon_visible, sensemon, unmap_invisible } from './display.js';
import { goodpos, place_monster, remove_monster } from './makemon.js';
import { sobj_at } from './invent.js';
import { PMNAMES, MFLAGS } from './monst_data.js';
import { is_hider, verysmall } from './mondata.js';
import { bad_rock, nomul, domove_attackmon_at, spoteffects, dopickup, trapmove, doorless_door, could_move_onto_boulder } from './hack.js';
import { In_sokoban, surface } from './dungeon.js';
import { Hallucination } from './youprop.js';
import { u_on_newpos } from './teleport.js';
import { doloot } from './pickup.js';
import { curr_mon_load } from './mon.js';
import { ECMD_FAIL, ECMD_CANCEL, Never_mind, A_DEX, M_AP_TYPE, M_AP_FURNITURE,
         M_AP_OBJECT } from './const.js';
import { ACURR, exercise } from './attrib.js';
import { is_pit, GETOBJ_EXCLUDE, GETOBJ_SUGGEST, GETOBJ_NOFLAGS, GETOBJ_PROMPT, GETOBJ_ALLOWCNT, GETOBJ_DOWNPLAY, W_ARMOR, W_ACCESSORY, GETOBJ_EXCLUDE_INACCESS, ARTICLE_YOUR, ARTICLE_THE, CQ_CANNED, CQ_REPEAT, CMDQ_EXTCMD, CMDQ_KEY } from './const.js';
import { ONAMES, OCLASSES } from './objects_data.js';
import { cxname, simpleonames, the } from './objnam.js';
import { x_monnam, docallcmd } from './do_name.js';
import { You } from './pline.js';

/* js/do.js needs mklev(), and js/sp_lev.js needs mon.js's terrain tests; both
   are cycles when imported directly, so cmd.js -- which already pulls in every
   one of them -- does the wiring. */
do_wire_mklev(mklev);
sp_lev_wire_mon({ is_pool, is_lava, m_at, newcham, resists_ston, mongone });
mklev_wire_mon({ is_pool, is_lava });
dokick_wire({ stairway_at, t_at });
do_wire_dokick(ship_object);
/* js/dungeon.js surface() needs stairway_at (do.c home) without importing
   do.js into the dungeon module graph */
import { dungeon_wire_stairway_at } from './dungeon.js';
dungeon_wire_stairway_at(stairway_at);
import { wiz_level_change, wiz_level_tele, wiz_wish } from './wizcmds.js';
import { tty_yn_function } from './tty/topl.js';
import { extcmdlist, EXTCMD_FLAGS } from './extcmd_data.js';
import { dodiscovered } from './o_init.js';
import { enlightenment } from './insight.js';
import { tty_create_nhwindow, tty_putstr, tty_display_nhwindow, tty_next_page,
         tty_destroy_nhwindow, tty_start_menu, tty_add_menu, tty_end_menu,
         tty_select_menu, NHW_TEXT, NHW_MENU, ATR_NONE } from './tty/wintty.js';
import { MENU_ITEMFLAGS_NONE, MENU_BEHAVE_STANDARD, isok, HEADSTONE, xdir, ydir, zdir, N_DIRS, N_DIRS_Z, DIR_ERR, DIR_W, DIR_NW, DIR_N, DIR_NE, DIR_E, DIR_SE, DIR_S, DIR_SW, DOMOVE_WALK, DOMOVE_RUSH } from './const.js';
import { doopen, doopen_indir, doclose } from './lock.js';
import { ECMD_OK, getobj } from './invent.js';
import { doeat } from './eat.js';
import { doread, wiz_genesis } from './read.js';
import { dodrink } from './potion.js';
import { doapply } from './apply.js';
import { dochat } from './sounds.js';
import { dothrow, dofire } from './dothrow.js';
import { getpos, getpos_sethilite } from './getpos.js';
import { get_valid_jump_position, is_valid_jump_pos } from './apply.js';
import { dowear, doputon, dotakeoff, doremring, canwearobj_core } from './do_wear.js';
import { show_menu_controls } from './options.js';
import { xwaitforspace } from './tty/getline.js';
import { NO_COLOR } from './terminal.js';
import { nhgetch } from './input.js';
import { newsym, flush_screen, pline, docrt, paint_topline, tty_clear_nhwindow_message, TOPLINE_SPECIAL_PROMPT, TOPLINE_EMPTY, TOPLINE_NEED_MORE, more } from './display.js';
import { vision_recalc } from './vision.js';
import { COLNO, ROWNO, STONE, DOOR, D_CLOSED, D_LOCKED, D_NODOOR, D_BROKEN, IS_WALL, IS_OBSTRUCTED, IS_DOOR, IS_FURNITURE } from './const.js';
import { dosearch } from './detect.js';
import { doengrave, engr_at, wipe_engr_at } from './engrave.js';
import { rnd, rn2 } from './rng.js';
import { ACCESSIBLE } from './const.js';
import { morehungry } from './eat.js';
import { dohelp, dowhatis, doquickwhatis } from './pager.js';
import { dolook, ECMD_TIME, display_inventory } from './invent.js';
import { dovspell, docast } from './spell.js';
import { dowieldquiver, dowield, dotwoweapon } from './wield.js';
import { dozap } from './zap.js';

// Direction deltas: y u k
//                   h . l
//                   b j n
const DIR_DX = { h: -1, l: 1, j: 0, k: 0, y: -1, u: 1, b: -1, n: 1 };
/* include/hack.h — sdir order "hykulnjb" indexes xdir/ydir; the same DIR
   codes set_move_cmd() receives from the do_move_/do_run_/do_rush_ family. */
const KEY_TO_DIR = { h: DIR_W, y: DIR_NW, k: DIR_N, u: DIR_NE,
                     l: DIR_E, n: DIR_SE, j: DIR_S, b: DIR_SW };
const DIR_DY = { h: 0, l: 0, j: 1, k: -1, y: -1, u: -1, b: 1, n: 1 };

function isMovementKey(ch) {
    return 'hjklyubn'.includes(ch);
}

// Keys src/cmd.c dispatches to real commands that this port has not reached
// yet. Listed explicitly so the set shrinks visibly as commands land, rather
// than hiding behind a catch-all.
const KNOWN_UNPORTED = new Set([
    /* ESC reaches the main prompt only when no window is open — a window
       consumes its own dismissing key inside display_nhwindow(). C's parse()
       treats it as a count cancel and prints nothing.

       SPACE used to be listed here on the same reasoning, and that was wrong.
       src/cmd.c:2818 skips binding it:

           if (key == ' ' && !flags.rest_on_space)
               continue;

       so with rest_on_space off — the default — space is bound to nothing and
       falls through to "Unknown command ' '." C really does print that, on
       seed0030's very first keystroke among others. */
    '\x1b',
]);

// C ref: hack.c — check if a cell blocks movement
// include/rm.h closed_door()
export function closed_door(x, y) {
    const loc = game.level?.at(x, y);
    return !!(loc && IS_DOOR(loc.typ) && (loc.doormask & (D_CLOSED | D_LOCKED)));
}

/* src/allmain.c — autoopen defaults on and none of the recorded rc files turn
   it off, but read the option rather than assuming so an rc that does is
   honoured. */
function flags_autoopen() {
    return game.flags?.autoopen !== false;
}

function blocksMove(x, y, dx, dy) {
    /* src/hack.c:1001 — test_move clears door_opened on entry; without this
       a door opened two commands ago lets a later blocked move keep its
       turn and run a monster round C never ran */
    game.context.door_opened = false;
    const loc = game.level?.at(x, y);
    if (!loc) return true;
    if (IS_OBSTRUCTED(loc.typ)) return true;
    if (loc.typ === DOOR && (loc.doormask & (D_CLOSED | D_LOCKED))) return true;
    /* src/hack.c:1140 test_move() — diagonal moves into an intact doorway
       are not allowed (block_door boulder check needs Sokoban state) */
    if (dx && dy && IS_DOOR(loc.typ) && !doorless_door(x, y)) return true;
    /* src/hack.c:1208 — nor diagonal moves OUT of one */
    const ust = game.level?.at(game.u.ux, game.u.uy);
    if (dx && dy && ust && IS_DOOR(ust.typ)
        && !doorless_door(game.u.ux, game.u.uy)) return true;
    return false;
}

/* doorless_door() moved to js/hack.js, its C home (src/hack.c:4063). */

// src/cmd.c:3847 xytodir() — convert an x,y delta into a direction code.
export function xytodir(x, y) {
    for (let dd = 0; dd < N_DIRS; dd++)
        if (x === xdir[dd] && y === ydir[dd])
            return dd;
    return DIR_ERR;
}

// src/cmd.c:3859 dirtocoord() — convert a direction code into an x,y pair.
export function dirtocoord(cc, dd) {
    if (dd > DIR_ERR && dd < N_DIRS_Z) {
        cc.x = xdir[dd];
        cc.y = ydir[dd];
    }
}

// C ref: cmd.c rhack — main command dispatcher
// src/cmd.c:4300 confdir() — a confused or stunned hero moves in a random
// direction: dirs_ord[rn2(8)] (cardinals first), halved for grid bugs.
const dirs_ord_cmd = [0, 2, 4, 6, 1, 3, 5, 7]; /* W N E S NW NE SE SW */
export function confdir(force_impairment) {
    if (force_impairment || u_maybe_impaired()) {
        const kmax = (game.u.umonnum === PMNAMES.PM_GRID_BUG)
            ? (N_DIRS / 2) : N_DIRS;
        const k = dirs_ord_cmd[rn2(kmax)];
        game.u.dx = xdir[k];
        game.u.dy = ydir[k];
    }
}

// src/hack.c:2418 u_maybe_impaired() — Stunned, or Confusion with the
// 4-in-5 roll. The rn2(5) draws EVERY move while merely confused.
export function u_maybe_impaired() {
    const Stunned = (game.u.intrinsic?.HStun || 0) > 0
        || !!game.u.uprops?.STUNNED;
    const Confusion = (game.u.intrinsic?.HConfusion || 0) > 0
        || !!game.u.uprops?.CONFUSION;
    return !!(Stunned || (Confusion && !rn2(5)));
}

// src/cmd.c:3919 show_direction_keys() — the compass rose. The default
// keybindings put the plain letters on the movement commands, so visctrl of
// each is the letter itself; rebinding is not ported.
function show_direction_keys(win, centerchar, nodiag) {
    if (!centerchar)
        centerchar = ' ';

    if (nodiag) {
        tty_putstr(win, 0, "             k   ");
        tty_putstr(win, 0, "             |   ");
        tty_putstr(win, 0, `          h- ${centerchar} -l`);
        tty_putstr(win, 0, "             |   ");
        tty_putstr(win, 0, "             j   ");
    } else {
        tty_putstr(win, 0, "          y  k  u");
        tty_putstr(win, 0, "           \\ | / ");
        tty_putstr(win, 0, `          h- ${centerchar} -l`);
        tty_putstr(win, 0, "           / | \\ ");
        tty_putstr(win, 0, "          b  j  n");
    }
}

/*
 * src/cmd.c:4171 help_dir() — the cmdassist panel for an invalid direction.
 *
 * Only the non-prefix arm is reachable: every caller here passes the ESC
 * spkey, so prefixhandling is false, and getdir always passes sym='\0' (its
 * caller's prompt never starts with '^'), which skips the are-you-trying-
 * to-use-^X dowhatdoes arm entirely.
 */
async function help_dir(sym, msg) {
    const win = tty_create_nhwindow(NHW_TEXT);
    /* include/hack.h:1414 NODIAG() — grid bug only */
    const nodiag = (game.u.umonnum === PMNAMES.PM_GRID_BUG);

    if (msg) {
        tty_putstr(win, 0, `cmdassist: ${msg}`);
        tty_putstr(win, 0, "");
    }

    tty_putstr(win, 0, `Valid direction keys${nodiag ? " in your current form" : ""} are:`);
    show_direction_keys(win, '.', nodiag);

    tty_putstr(win, 0, "");
    tty_putstr(win, 0, "          <  up");
    tty_putstr(win, 0, "          >  down");
    /* C: "       %4s  direct at yourself" with visctrl(NHKF_GETDIR_SELF),
       which is "." under the default bindings */
    tty_putstr(win, 0, "          .  direct at yourself");

    if (msg) {
        /* non-null msg means that this wasn't an explicit user request */
        tty_putstr(win, 0, "");
        tty_putstr(win, 0,
               "(Suppress this message with !cmdassist in config file.)");
    }
    await tty_display_nhwindow(win);
    await xwaitforspace('\x1b ');
    while (tty_next_page(win))
        await xwaitforspace('\x1b ');
    tty_destroy_nhwindow(win);
    await docrt();
    return true;
}

// src/cmd.c:1386 set_move_cmd() — a movement command records its direction
// on `u` before it runs, which is what makes u.dz nonzero for '>' and '<'.
export function set_move_cmd(dir, run) {
    game.u.dz = zdir[dir];
    game.u.dx = xdir[dir];
    game.u.dy = ydir[dir];
    /* #reqmenu -prefix disables autopickup during movement */
    if (game.iflags?.menu_requested)
        game.context.nopick = 1;
    game.context.travel = game.context.travel1 = 0;
    /* src/cmd.c:1395 — a pending prefix (g/G) owns context.run; a bare
       movement key sets it, which is also what clears a stale run=8 left
       behind by a finished travel (its arrival arm re-asserts 8 after
       nomul, and C only clears it at the next set_move_cmd or
       reset_cmd_vars). */
    if (!game.domove_attempting && !game.u.dz) {
        game.context.run = run;
        game.domove_attempting |= (!run ? DOMOVE_WALK : DOMOVE_RUSH);
    }
}

// src/cmd.c getdir() — read a direction key and set u.dx/u.dy/u.dz.
//
// Only the plain movement-key path is reachable from a recorded session; the
// mouse, help and fuzzer arms all need input this port does not receive. The
// key IS consumed either way, so a caller that skips getdir leaves the session
// one keystroke out of step, not merely one draw.
export async function getdir(s) {
    /* src/cmd.c getdir():
         dirsym = yn_function((s && *s != '^') ? s : "In what direction?",
                              (char *) 0, '\0', FALSE);
       The read was going straight to nhgetch, so the prompt never appeared;
       routing it through tty_yn_function paints it without changing which
       key is consumed. A caller-supplied string starting with '^' is a
       key-hint, not a prompt, and is ignored here as C ignores it. */
    const dirsym = await tty_yn_function(
        (s && s[0] !== '^') ? s : 'In what direction?', null, '\0');

    /* src/cmd.c:4011 — "remove the prompt string so caller won't have to":
       clear_nhwindow(WIN_MESSAGE) physically blanks the topline on every
       exit path, so the answered prompt is gone by the next boundary. */
    tty_clear_nhwindow_message(game._topl_cury || 0);
    game._pending_message = '';

    if (dirsym === '.' || dirsym === 's') {
        game.u.dx = game.u.dy = game.u.dz = 0;
        /* src/cmd.c:4116 — getdir's tail runs confdir(FALSE) for every
           !u.dz result, INCLUDING the self-direction: while confused the
           rn2(5) inside u_maybe_impaired still draws here. */
        confdir(false);
        return true;
    }
    if (dirsym === '<' || dirsym === '>') {
        game.u.dx = game.u.dy = 0;
        game.u.dz = (dirsym === '<') ? -1 : 1;
        return true;
    }
    if (!isMovementKey(dirsym)) {
        /* src/cmd.c:4095-4110 — a key in quitchars (" \r\n\033",
           src/decl.c:96) cancels quietly; anything else gets the cmdassist
           help panel (iflags.cmdassist is opt_out, default On) or the
           "What a strange direction!" pline when assistance is off. The
           '?' help-request retry is recorded; no recorded session asks. */
        if (!" \r\n\x1b".includes(dirsym)) {
            let did_help = false;
            if (dirsym === '?' || (game.iflags.cmdassist !== false)) {
                did_help = await help_dir('\0', "Invalid direction key!");
                if (dirsym === '?')
                    note_unported_cmd('getdir:help_retry');
            }
            if (!did_help)
                await pline("What a strange direction!");
        }
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
    if (!await getdir(prompt)) {
        await pline(Never_mind);
        return 0;
    }

    const new_x = x + game.u.dx;
    const new_y = y + game.u.dy;
    if (cc && isok(new_x, new_y)) {
        cc.x = new_x;
        cc.y = new_y;
    } else {
        if (emsg)
            await pline(emsg);
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
export async function getlin(query, hook) {
    /* C tracks two things: obufp, the buffer, and bufp, the insertion point
       inside it. They come apart under NEWAUTOCOMP (win/tty/getline.c:11,
       always defined) because a completion extends the buffer while leaving
       "pointer and cursor ... where they were". Modelling only the buffer put
       our cursor at the end of the expansion; C leaves it after the typed
       characters, which is a cursor-only mismatch on an otherwise exact
       screen. */
    let buf = '';
    let pos = 0;

    /* win/tty/getline.c:53 — an unacknowledged message gets its --More--
       BEFORE the prompt appears:
           if (ttyDisplay->toplin == TOPLINE_NEED_MORE && !(cw->flags & WIN_STOP))
               more();
       "You write in the dust with your fingertip." carries a --More-- for
       exactly this reason: doengrave's getlin comes right behind it. */
    if (game._toplin === TOPLINE_NEED_MORE && !game._win_stop)
        await more();

    for (;;) {
        /* win/tty/getline.c hooked_tty_getlin():
         *
         *     custompline(OVERRIDE_MSGTYPE | SUPPRESS_HISTORY, "%s ", query);
         *     for (;;) {
         *         Strcat(strcat(strcpy(gt.toplines, query), " "), obufp);
         *         term_curs_set(1);
         *         c = pgetchar();
         *
         * The top line is rewritten to "<query> <buf>" before EVERY key and
         * the cursor parks just past it. Reading the keys without painting
         * any of that left the prompt invisible: seed0360's '#' never
         * appeared and the cursor sat out on the map.
         */
        const promptText = `${query} ${buf}`;
        game._toplin = TOPLINE_SPECIAL_PROMPT;
        const display = game?.nhDisplay;
        const CO = display?.cols ?? 80;
        /* win/tty/topl.c topl_putsym() reserves the final terminal
           column. When curx reaches CO - 1, it moves to the next row
           before painting the following character. */
        const lineWidth = Math.max(CO - 1, 1);
        const lines = [];
        for (let start = 0; start < promptText.length; start += lineWidth)
            lines.push(promptText.slice(start, start + lineWidth));
        if (!lines.length)
            lines.push('');

        const oldCury = game._topl_cury || 0;
        const newCury = lines.length - 1;
        if (oldCury > newCury)
            tty_clear_nhwindow_message(oldCury);

        game._pending_message = lines.join('\n');
        game._topl_cury = newCury;
        paint_topline();

        if (display) {
            const logicalPos = query.length + 1 + pos;
            let cursorRow = 0, cursorCol = logicalPos;
            if (logicalPos > lineWidth) {
                cursorRow = Math.floor((logicalPos - 1) / lineWidth);
                cursorCol = ((logicalPos - 1) % lineWidth) + 1;
            }
            display.setCursor(cursorCol, cursorRow);
        }

        const c = String.fromCharCode(await nhgetch());

        if (c === '\x1b') {
            /* ESC with text typed clears the line and keeps reading; only ESC
               on an empty line abandons. Returning immediately either way ate
               a key the C spends going round again. */
            if (buf !== '') {
                buf = '';               /* obufp[0] = '\0'; bufp = obufp; */
                pos = 0;
                continue;
            }
            getlin_cleanup();
            return '\x1b';
        } else if (c === '\n' || c === '\r') {
            /* NEWAUTOCOMP does NOT truncate here, so a completed name is
               returned whole even though the cursor sat mid-string. */
            break;
        } else if (c === '\b' || c === '\x7f') {
            /*  bufp--; ... *bufp = 0;  — back up and drop the rest. */
            if (pos > 0) {
                pos--;
                buf = buf.slice(0, pos);
            }
            /* else tty_nhbell() */
        } else if (c >= ' ' && c !== '\x7f' && pos < COLNO) {
            /*  *bufp = c; bufp[1] = 0;  — the new character REPLACES whatever
                the previous completion had put after the cursor. */
            buf = buf.slice(0, pos) + c;
            pos++;
            if (hook) {
                const completed = hook(buf);
                if (completed !== null)
                    buf = completed;    /* pointer and cursor left where they were */
            }
        }
    }
    getlin_cleanup();
    return buf;
}

/* win/tty/getline.c:213 — hooked_tty_getlin's exit:
       ttyDisplay->toplin = TOPLINE_NON_EMPTY;
       clear_nhwindow(WIN_MESSAGE);   / * clean up after ourselves * /
   The prompt (and typed answer) are ERASED the moment the read finishes;
   whatever the caller plines next starts from a blank top line. */
function getlin_cleanup() {
    game._toplin = TOPLINE_SPECIAL_PROMPT; /* non-EMPTY so the erase runs */
    tty_clear_nhwindow_message(game._topl_cury || 0);
    game._pending_message = '';
    game._toplin = TOPLINE_EMPTY;
}

// src/cmd.c extcmds_match() — the indices of the extended commands matching
// findstr, filtered exactly as the C filters them.
export function extcmds_match(findstr, ecmflags) {
    const F = EXTCMD_FLAGS;
    const ignoreac = (ecmflags & F.ECM_IGNOREAC) !== 0;
    const exactmatch = (ecmflags & F.ECM_EXACTMATCH) !== 0;
    const no1charcmd = (ecmflags & F.ECM_NO1CHARCMD) !== 0;
    const out = [];

    for (let i = 0; i < extcmdlist.length; i++) {
        const e = extcmdlist[i];
        if (e.flags & (F.CMD_NOT_AVAILABLE | F.INTERNALCMD))
            continue;
        if (!game.wizard && (e.flags & F.WIZMODECMD))
            continue;
        if (!ignoreac && !(e.flags & F.AUTOCOMPLETE))
            continue;
        if (no1charcmd && e.ef_txt.length === 1)
            continue;
        if (findstr === null || findstr === undefined) {
            out.push(i);
        } else if (exactmatch) {
            if (findstr.toLowerCase() === e.ef_txt.toLowerCase())
                out.push(i);
        } else {
            if (e.ef_txt.slice(0, findstr.length).toLowerCase()
                === findstr.toLowerCase())
                out.push(i);
        }
    }
    return out;
}

// win/tty/getline.c ext_cmd_getlin_hook() — expand the typed prefix as soon as
// exactly one command still matches, which is how "#j\n" runs #jump.
function ext_cmd_getlin_hook(base) {
    const matches = extcmds_match(base, EXTCMD_FLAGS.ECM_NOFLAGS);

    return matches.length === 1 ? extcmdlist[matches[0]].ef_txt : null;
}

// win/tty/getline.c:292 tty_get_ext_cmd() — read an extended command name and
// match it against extcmdlist.
async function get_ext_cmd() {
    /* C passes the completion hook unless replaying with in_doagain. */
    const buf = (await getlin('#', ext_cmd_getlin_hook)).trim();

    if (buf === '' || buf === '\x1b')
        return null;
    /* extcmds_match with ECM_IGNOREAC | ECM_EXACTMATCH: the hook has already
       completed the text, so C matches the whole name; anything else is
       "<initiator><input>: unknown extended command." and returns -1. */
    if (!extcmdlist.some((e) => e.ef_txt === buf)) {
        await pline(`#${buf.slice(0, 60)}: unknown extended command.`);
        return null;
    }
    return buf;
}

/* src/potion.c drink_ok() — only potions are suggested for 'q'. The !obj arm
   returns GETOBJ_EXCLUDE; C's EXCLUDE_NONINVENT case needs drink_ok_extra,
   which tracks whether the hero already passed up a fountain, and is not
   modelled. */
function drink_ok(obj) {
    if (!obj)
        return GETOBJ_EXCLUDE;
    if (obj.oclass === OCLASSES.POTION_CLASS)
        return GETOBJ_SUGGEST;
    return GETOBJ_EXCLUDE;
}

/* src/read.c:315 read_ok() — scrolls and spellbooks. Note the else arm is
   GETOBJ_DOWNPLAY, not GETOBJ_EXCLUDE: C distinguishes "not a sensible
   choice" from "not allowed", and only SUGGEST puts a letter in the prompt,
   so both keep the letter out while meaning different things to the menu. */
function read_ok(obj) {
    if (!obj)
        return GETOBJ_EXCLUDE;
    if (obj.oclass === OCLASSES.SCROLL_CLASS
        || obj.oclass === OCLASSES.SPBOOK_CLASS)
        return GETOBJ_SUGGEST;
    return GETOBJ_DOWNPLAY;
}

/* any_obj_ok() lives in js/invent.js, mirroring src/invent.c:1710. */

/* src/do_wear.c:3404 equip_ok() — the shared filter behind W, T, P and R.
//
   The two XORs carry the logic and neither is decorative:

     removing ^ is_worn                  putting ON something already worn,
                                         or taking OFF something not worn, is
                                         EXCLUDE_INACCESS -- the item exists
                                         but the action does not apply.
     accessory ^ (oclass != ARMOR_CLASS) armor offered to 'P'/'R', or an
                                         accessory offered to 'W'/'T', is
                                         DOWNPLAY rather than EXCLUDE: it is
                                         wearable, just not by this command.

   The class test excludes everything but armor, rings and amulets, THEN
   re-admits four specific otyps -- MEAT_RING, BLINDFOLD, TOWEL, LENSES --
   which are wearable while belonging to other classes. Dropping that
   exception list would make a blindfold unofferable to 'P'.

   canwearobj (polyform restrictions) and inaccessible_equipment (cursed
   armor covering a ring) are recorded; every other arm is real. */
function equip_ok(obj, removing, accessory) {
    if (!obj)
        return GETOBJ_EXCLUDE;

    /* ignore for putting on if already worn, or removing if not worn */
    const is_worn = ((obj.owornmask & (W_ARMOR | W_ACCESSORY)) !== 0);
    if (!!removing !== is_worn)
        return GETOBJ_EXCLUDE_INACCESS;

    /* exclude most object classes outright */
    if (obj.oclass !== OCLASSES.ARMOR_CLASS
        && obj.oclass !== OCLASSES.RING_CLASS
        && obj.oclass !== OCLASSES.AMULET_CLASS) {
        /* ... except for a few wearable exceptions outside these classes */
        if (obj.otyp !== ONAMES.MEAT_RING && obj.otyp !== ONAMES.BLINDFOLD
            && obj.otyp !== ONAMES.TOWEL && obj.otyp !== ONAMES.LENSES)
            return GETOBJ_EXCLUDE;
    }

    /* armor with 'P' or 'R' or accessory with 'W' or 'T' */
    if (!!accessory !== (obj.oclass !== OCLASSES.ARMOR_CLASS))
        return GETOBJ_DOWNPLAY;

    /* armor we can't wear (slot occupied, poly form, ...) */
    if (obj.oclass === OCLASSES.ARMOR_CLASS && !removing
        && !canwearobj_core(obj).mask)
        return GETOBJ_DOWNPLAY;

    /* removing inaccessible equipment */
    if (removing)
        note_unported_cmd('equip_ok:inaccessible_equipment');

    /* all good to go */
    return GETOBJ_SUGGEST;
}

/* src/do_wear.c:3451-3475 — the four getobj callbacks over equip_ok.
   Exported for js/do_wear.js's command layer. */
export const puton_ok   = (o) => equip_ok(o, false, true);
export const remove_ok  = (o) => equip_ok(o, true,  true);
export const wear_ok    = (o) => equip_ok(o, false, false);
export const takeoff_ok = (o) => equip_ok(o, true,  false);

/* src/cmd.c cmdlist — the verb and object filter each command hands getobj().
   Read from the C, not invented: the word appears verbatim in the prompt
   ("What do you want to drink?") and the flags decide whether '-' for hands
   is offered. A missing filter offers the WHOLE inventory, which is what
   js/cmd.js used to do by passing null.

   'q', 'r' and 'd' carry their real filters. 'w' is dispatched to dowield()
   and no longer routes through here. */
const GETOBJ_CMD = {
    q: { word: 'drink',   ok: drink_ok, flags: GETOBJ_NOFLAGS },
    r: { word: 'read',    ok: read_ok,  flags: GETOBJ_PROMPT },
    W: { word: 'wear',    ok: wear_ok,   flags: GETOBJ_NOFLAGS },
    P: { word: 'put on',  ok: puton_ok,  flags: GETOBJ_NOFLAGS },
    R: { word: 'remove',  ok: remove_ok, flags: GETOBJ_NOFLAGS },
    d: { word: 'drop',    ok: any_obj_ok, flags: GETOBJ_NOFLAGS },
};

/* The commands whose first act is getobj() and which read nothing further.
   Their effects need the use/wear/drop subsystems; what is ported is the
   object prompt, because that is what decides where the next keystroke goes. */
async function docmd_getobj(ch) {
    const spec = GETOBJ_CMD[ch];
    const obj = await getobj(spec ? spec.word : ch,
                            spec ? spec.ok : null,
                            spec ? spec.flags : 0);

    if (!obj)
        return ECMD_OK;   /* Never mind */

    note_unported_cmd(`cmd:${ch}`);
    return ECMD_TIME;
}
/* dofire() lives in js/dothrow.js, its C home (src/dothrow.c:469), with the
   fireassist launcher-wielding chain. The local stub that only reached
   getdir() was replaced when the command queue landed. */


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
    if (name === 'quit') {
        const { done2 } = await import('./end.js');
        return await done2();
    }
    if (name === 'enhance') {
        const { enhance_weapon_skill } = await import('./weapon.js');
        return await enhance_weapon_skill();
    }
    if (name === 'terrain')
        return await doterrain();
    if (name === 'adjust') {
        const { doorganize } = await import('./invent.js');
        return await doorganize();
    }
    if (name === 'genocided') {
        /* src/insight.c list_genocided() — nothing is ever genocided in a
           recorded session, so only the empty-list line is live */
        const { pline } = await import('./display.js');
        await pline('No creatures have been genocided.');
        return ECMD_OK;
    }
    if (name === 'vanquished') {
        const { list_vanquished } = await import('./insight.js');
        await list_vanquished('y', false);
        return ECMD_OK;
    }
    if (name === 'conduct') {
        const { show_conduct } = await import('./insight.js');
        return await show_conduct();
    }
    if (name === 'chronicle') {
        const { do_gamelog } = await import('./insight.js');
        return await do_gamelog();
    }
    if (name === 'overview') {
        /* src/dungeon.c:3339 show_overview() — the ^O window */
        const { show_overview } = await import('./dungeon.js');
        await show_overview();
        return ECMD_OK;
    }
    if (name === 'offer') {
        /* src/pray.c:1854 dosacrifice() — only the not-on-an-altar arm is
           reachable without altars underfoot; the rite itself records */
        const { ALTAR } = await import('./const.js');
        const loc = game.level?.at(game.u.ux, game.u.uy);
        if (!loc || loc.typ !== ALTAR || game.u.uswallow) {
            const { You } = await import('./pline.js');
            const airborne = game.u.uprops?.LEVITATION
                             || game.u.uprops?.FLYING;
            await You(`are not ${airborne ? 'over' : 'on'} an altar.`);
            return ECMD_OK;
        }
        (game.unported ||= new Set()).add('cmd:doextcmd:offer_rite');
        return ECMD_OK;
    }
    if (name === 'loot')
        return await doloot();
    if (name === 'force') {
        const { doforce } = await import('./lock.js');
        return await doforce();
    }
    if (name === 'chat')
        return await dochat();
    if (name === 'twoweapon')
        return await dotwoweapon();
    if (name === 'name')
        return await docallcmd();
    if (name === 'jump')
        return await dojump();
    if (name === 'levelchange')
        return await wiz_level_change();
    if (name === 'ride') {
        const { doride } = await import('./steed.js');
        return await doride();
    }
    if (name === 'sit') {
        const { dosit } = await import('./sit.js');
        return await dosit();
    }
    if (name === 'pray') {
        const { dopray } = await import('./pray.js');
        return await dopray();
    }
    if (name === 'dip') {
        const { dodip } = await import('./potion.js');
        return await dodip();
    }
    if (name === 'rub') {
        const { dorub } = await import('./apply.js');
        return await dorub();
    }
    if (name === 'wipe') {
        const { dowipe } = await import('./do.js');
        return await dowipe();
    }
    if (name === 'polyself') {
        const { wiz_polyself } = await import('./polyself.js');
        return await wiz_polyself();
    }
    if (name === 'monster') {
        const { domonability } = await import('./polyself.js');
        return await domonability();
    }
    if (name === 'invoke') {
        const { doinvoke } = await import('./artifact.js');
        return await doinvoke();
    }
    if (name === 'untrap') {
        const { dountrap } = await import('./trap.js');
        return await dountrap();
    }
    if (name === 'tip') {
        const { dotip } = await import('./pickup.js');
        return await dotip();
    }
    if (name === 'herecmdmenu')
        return await doherecmdmenu();
    if (name === 'annotate') {
        /* src/dungeon.c:2571 donamelevel() -> query_annotation(): the
           getlin consumes the annotation text; skipping it fed the typed
           annotation to the command loop as keystrokes. */
        const nbuf = await getlin(
            'What do you want to call this dungeon level?');
        if (nbuf != null && nbuf !== '' && nbuf !== '\x1b') {
            const t = nbuf.trim().replace(/ {2,}/g, ' ');
            if (t && t !== ' ')
                (game.level_annotations ||= {})[
                    `${game.u.uz.dnum}:${game.u.uz.dlevel}`] = t;
        }
        return ECMD_OK;
    }
    if (name === 'version') {
        /* src/version.c:169 doextversion() — the options text substitutes
           :LUAVERSION:, and get_lua_version() boots a Lua state the FIRST
           time, which loads nhlib.lua and spends its 3-item align shuffle
           (rn2(3), rn2(2)). Cached in gl.lua_ver afterwards. The pager
           display itself is recorded. */
        if (!game._lua_ver_known) {
            game._lua_ver_known = true;
            const themedAlign = [0, 1, 2];
            for (let i = themedAlign.length; i > 1; i--) {
                const j = rn2(i);
                [themedAlign[i - 1], themedAlign[j]] =
                    [themedAlign[j], themedAlign[i - 1]];
            }
        }
        /* the pager window: banner line, then the compiled-options text
           (build data, js/version_data.js) */
        {
            const { VERSION_BANNER_LINE, VERSION_OPTIONS_TEXT } =
                await import('./version_data.js');
            const win = tty_create_nhwindow(NHW_TEXT);
            tty_putstr(win, 0, VERSION_BANNER_LINE);
            for (const line of VERSION_OPTIONS_TEXT)
                tty_putstr(win, 0, line);
            await tty_display_nhwindow(win);
            await nhgetch();
            while (tty_next_page(win))
                await nhgetch();
            tty_destroy_nhwindow(win);
            await docrt();
        }
        return ECMD_OK;
    }
    if (name === 'wizwish')
        return await wiz_wish();
    if (name === 'wizgenesis')
        return await wiz_genesis();

    note_unported_cmd(`extcmd:${name}`);
    return ECMD_OK;
}

// src/cmd.c:4332 doherecmdmenu() and there_cmd_menu_self(). The command
// presents actions available on the hero's square, then queues the selected
// action so the normal command loop runs it on the next pass.
async function doherecmdmenu() {
    const { Is_container } = await import('./obj.js');
    const { doname } = await import('./objnam.js');
    const { num_spells } = await import('./spell.js');
    const { can_reach_floor, dotip } = await import('./pickup.js');
    const { dountrap } = await import('./trap.js');
    const { donull } = await import('./do.js');
    const {
        FOUNTAIN, SINK, THRONE, ALTAR, VIBRATING_SQUARE,
    } = await import('./const.js');

    const win = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(win, MENU_BEHAVE_STANDARD);
    const actions = new Map();
    let nextId = 1;
    const add = (text, fn, ...keys) => {
        const id = nextId++;
        actions.set(id, { fn, keys });
        tty_add_menu(win, null, id, 0, 0, ATR_NONE, NO_COLOR, text,
                     MENU_ITEMFLAGS_NONE);
    };

    const u = game.u;
    const loc = game.level?.at(u.ux, u.uy);
    const typ = loc?.typ;
    if ((typ === FOUNTAIN || typ === SINK) && can_reach_floor(false)) {
        add(`Drink from the ${typ === FOUNTAIN ? 'fountain' : 'sink'}`,
            () => dodrink(drink_ok), 'y');
    }
    if (typ === FOUNTAIN && can_reach_floor(false)) {
        const { dodip } = await import('./potion.js');
        add('Dip something into the fountain', dodip);
    }
    if (typ === THRONE) {
        const { dosit } = await import('./sit.js');
        add('Sit on the throne', dosit);
    }
    if (typ === ALTAR)
        add('Sacrifice something on the altar',
            () => doextcmd_named_offer());

    const stway = stairway_at(u.ux, u.uy);
    if (stway) {
        const kind = stway.isladder ? 'ladder' : 'stairs';
        add(`Go ${stway.up ? 'up' : 'down'} the ${kind}`,
            stway.up ? doup : dodown);
    }

    const floor = (game.level?.objects || [])
        .filter(o => o.ox === u.ux && o.oy === u.uy);
    if (floor.length) {
        const obj = floor[0];
        add(`Pick up ${floor.length > 1 ? 'items' : doname(obj)}`, dopickup);
        if (Is_container(obj)) {
            add(`Loot ${doname(obj)}`, doloot);
            add(`Tip ${doname(obj)}`, dotip, 'y');
        }
        if (obj.oclass === OCLASSES.FOOD_CLASS)
            add(`Eat ${doname(obj)}`, doeat, 'y');
    }

    if ((game.invent || []).length) {
        add('Inventory', show_inventory);
        add('Drop items', dodrop);
    }
    add('Rest one turn', donull);
    add('Search around you', dosearch);
    add('Look at what is here', dolook);
    if (num_spells() > 0)
        add('Cast a spell', docast);

    const trap = t_at(u.ux, u.uy);
    if (trap?.tseen && trap.ttyp !== VIBRATING_SQUARE)
        add('Attempt to disarm trap', dountrap);

    tty_end_menu(win, 'What do you want to do?');
    const picks = await tty_select_menu(win, 1 /* PICK_ONE */);
    tty_destroy_nhwindow(win);
    if (picks.length) {
        const action = actions.get(picks[0]);
        if (action) {
            cmdq_add_ec(CQ_CANNED, action.fn);
            for (const key of action.keys)
                cmdq_add_key(CQ_CANNED, key);
        }
    }
    return ECMD_OK;
}

async function doextcmd_named_offer() {
    const loc = game.level?.at(game.u.ux, game.u.uy);
    if (!loc || loc.typ !== (await import('./const.js')).ALTAR) {
        await You('are not on an altar.');
        return ECMD_OK;
    }
    note_unported_cmd('cmd:doextcmd:offer_rite');
    return ECMD_OK;
}

// src/cmd.c:1098 doterrain() — #terrain command, show known map, inspired by
// crawl's '|' command. Default key is DEL (cmd.c:1895, '\177').
export async function doterrain() {
    const {
        tty_create_nhwindow, tty_destroy_nhwindow, tty_start_menu,
        tty_add_menu, tty_end_menu, tty_select_menu, tty_get_nhwindow,
        NHW_MENU,
    } = await import('./tty/wintty.js');
    const { NO_COLOR } = await import('./terminal.js');
    const { MENU_ITEMFLAGS_SELECTED } = await import('./const.js');
    const { recalc_mapseen } = await import('./dungeon.js');
    const { reveal_terrain } = await import('./detect.js');
    const { TER_MAP, TER_TRP, TER_OBJ, TER_FULL } = await import('./const.js');

    /* this used to be done each time vision was recalculated, so would
       always be up to date (hopefully); now we do it on demand instead */
    recalc_mapseen();

    /* normal play: choose between known map without mons, obj, and traps,
       or known map without mons and objs, or known map without mons;
       explore mode: normal choices plus full map;
       wizard mode: those plus the levl[][].typ dumps */
    const win = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(win, 0);
    tty_add_menu(win, null, 1, 'a', 0, 0, NO_COLOR,
                 'known map without monsters, objects, and traps',
                 MENU_ITEMFLAGS_SELECTED);
    tty_add_menu(win, null, 2, 'b', 0, 0, NO_COLOR,
                 'known map without monsters and objects', 0);
    tty_add_menu(win, null, 3, 'c', 0, 0, NO_COLOR,
                 'known map without monsters', 0);
    if (game.discover || game.wizard) {
        tty_add_menu(win, null, 4, 'd', 0, 0, NO_COLOR,
                     'full map without monsters, objects, and traps', 0);
        if (game.wizard) {
            tty_add_menu(win, null, 5, 'e', 0, 0, NO_COLOR,
                         'internal levl[][].typ codes in base-36', 0);
            tty_add_menu(win, null, 6, 'f', 0, 0, NO_COLOR,
                         'legend of base-36 levl[][].typ codes', 0);
        }
    }
    tty_end_menu(win, 'View which?');

    const picks = await tty_select_menu(win, 1 /* PICK_ONE */);
    const cancelled = !!tty_get_nhwindow(win)?.cancelled;
    tty_destroy_nhwindow(win);
    /* n < 0: ESC; n == 0: preselected entry explicitly toggled off;
       n == 1: preselected chosen via <space>|<enter>;
       n == 2: another entry explicitly chosen, so skip preselected one */
    let which = cancelled ? -1 : (picks.length === 0) ? 1 : picks[0];
    if (picks.length > 1 && which === 1)
        which = picks[1];

    switch (which) {
    case 1: /* known map */
        await reveal_terrain(TER_MAP);
        break;
    case 2: /* known map with known traps */
        await reveal_terrain(TER_MAP | TER_TRP);
        break;
    case 3: /* known map with known traps and objects */
        await reveal_terrain(TER_MAP | TER_TRP | TER_OBJ);
        break;
    case 4: /* full map */
        await reveal_terrain(TER_MAP | TER_FULL);
        break;
    case 5: /* map internals: wiz_map_levltyp() */
    case 6: /* internal details: wiz_levltyp_legend() */
        note_unported_cmd('doterrain:wiz_levltyp');
        break;
    default:
        break;
    }
    return ECMD_OK; /* no time elapses */
}

// src/apply.c:1847 dojump() -> jump(0). The jump itself needs the movement and
// trap plumbing; what is ported is the getpos() call at src/apply.c:2063, which
// is where a session's cursor keys and pick go.
async function dojump() {
    await pline('Where do you want to jump?');

    const cc = { x: game.u.ux, y: game.u.uy };
    /* src/apply.c:2062 — the cursor marks squares the jump cannot reach.
       display_jump_positions (the tmp_at beam) is not ported; the validator
       is, because getpos' auto-describe prints "(invalid target)" from it. */
    getpos_sethilite(null, get_valid_jump_position);

    if (await getpos(cc, true, 'the desired position') < 0)
        return ECMD_CANCEL; /* user pressed ESC */

    /* src/apply.c:2065 — the same validator again, this time with its
       messages; a rejected target ends the command without a turn. */
    if (!(await is_valid_jump_pos(cc.x, cc.y, game.jumping_is_magic, true)))
        return ECMD_FAIL;

    /* src/apply.c:2116 — jumping onto your own square never moves you */
    if (cc.x === game.u.ux && cc.y === game.u.uy) {
        if (t_at(cc.x, cc.y)) {
            note_unported_cmd('jump:in_place_trap');
            return ECMD_TIME;
        }
        /* jumping in place takes no time and doesn't exercise anything */
        await You('decide not to jump after all.');
        return ECMD_OK;
    }

    /*
     * Check the path from uc to cc, calling hurtle_step at each location.
     * The final position actually reached will be in cc.
     */
    const uc = { x: game.u.ux, y: game.u.uy };
    let range = cc.x - uc.x;
    if (range < 0) range = -range;
    let temp = cc.y - uc.y;
    if (temp < 0) temp = -temp;
    if (range < temp) range = temp;

    const { walk_path } = await import('./dothrow.js');
    const { teleds, TELEDS_NO_FLAGS } = await import('./teleport.js');
    walk_path(uc, cc, hurtle_jump, { range });
    /* hurtle_jump -> hurtle_step results in <u.ux,u.uy> == <cc.x,cc.y> and
     * usually moves the ball if punished, but does not handle all the
     * effects of landing on the final position.
     */
    await teleds(cc.x, cc.y, TELEDS_NO_FLAGS);
    nomul(-1);
    game.multi_reason = 'jumping around';
    game.nomovemsg = '';
    await morehungry(rnd(25));
    return ECMD_TIME;
}

// src/dothrow.c hurtle_step() — one square of a hurtle, via walk_path().
//
// Only the unobstructed case is live. C's wall/crevice arm draws
// rnd(2 + range) for the damage and wakes monsters; a jump that hits
// something is recorded instead of guessed.
function hurtle_step(arg, x, y) {
    if (!isok(x, y) || bad_rock_at(x, y)) {
        note_unported_cmd('hurtle_step:obstructed');
        return false;
    }
    if (m_at(x, y)) {
        note_unported_cmd('hurtle_step:monster');
        return false;
    }
    /* C moves the hero one step here; teleds() places them at the end */
    return true;
}

/* src/apply.c hurtle_jump() — hurtle_step with flying allowed over water */
function hurtle_jump(arg, x, y) {
    return hurtle_step(arg, x, y);
}

/* include/rm.h — a square the hero cannot occupy */
function bad_rock_at(x, y) {
    const loc = game.level?.at(x, y);
    return !loc || !ACCESSIBLE(loc.typ);
}

export async function rhack(key) {
    /* src/cmd.c:3635 — every command begins with the menu-request and
       no-pickup markers cleared; set_move_cmd() re-raises nopick from
       menu_requested for the m-prefix case. C's prefixes loop inside one
       rhack() call (goto got_prefix_input) so the reset runs once per
       command; ours span two rhack() calls, so a pending prefix skips it. */
    if (!game._cmd_prefix_pending) {
        game.iflags.menu_requested = false;
        game.context.nopick = 0;
    }
    game._cmd_prefix_pending = false;
    /* src/cmd.c:3642 — queued commands run before any key is read. A
       CMDQ_EXTCMD entry dispatches its function directly, exactly like the
       doextcmd arm below; a CMDQ_KEY becomes the command key as if typed. */
    if (key === 0) {
        const cmdq = cmdq_pop();
        if (cmdq) {
            if (cmdq.typ === CMDQ_EXTCMD && cmdq.fn) {
                game.context.move = ((await cmdq.fn()) === ECMD_TIME ? 1 : 0);
                return;
            }
            if (cmdq.typ === CMDQ_KEY)
                key = String(cmdq.key).charCodeAt(0);
        }
    }
    let live_input = false;
    let clear_before_dispatch = false;
    if (key === 0) {
        // Read key from input
        live_input = true;
        await flush_screen(1);
        key = await nhgetch();
        /* NOTE: the pre-dispatch topline clear happens BELOW, after the
           count-prefix digits are collected — a digit key leaves the
           previous message visible (seed0007 step 231: "You swap places
           with your kitten." survives the '9' of "9s"), and only the
           actual command dispatch clears it. */
        clear_before_dispatch = true;
    }

    let ch0 = String.fromCharCode(key);

    /* src/cmd.c:5009 get_count() via parse() — with !number_pad, typed
       digits accumulate a repeat count and the first non-digit key is the
       command. "Count: N" is echoed only once the count reaches two digits
       (`cnt > 9`), each time on a cleared topline with no history. ESC
       cancels the count and the command read. parse() then sets
       gm.multi = count - 1 and remembers gc.cmd_key for the repeat arm. */
    if (live_input && !game.in_doagain && ch0 >= '0' && ch0 <= '9') {
        let cnt = 0;
        while (ch0 >= '0' && ch0 <= '9') {
            cnt = 10 * cnt + (ch0.charCodeAt(0) - 48);
            if (cnt > 9) {
                /* src/cmd.c:5070 — clear_nhwindow(WIN_MESSAGE) then
                   custompline(SUPPRESS_HISTORY, "Count: %ld"). The cursor
                   parks at the end of the text (recorded cursor [9,0] for
                   "Count: 20"), the same shape as the other topline
                   prompts. */
                tty_clear_nhwindow_message(game._topl_cury || 0);
                const ctext = `Count: ${cnt}`;
                game._pending_message = ctext;
                game._toplin = TOPLINE_SPECIAL_PROMPT;
                paint_topline();
                const display = game?.nhDisplay;
                if (display)
                    display.setCursor(
                        Math.min(ctext.length, (display.cols ?? 80) - 1), 0);
            }
            key = await nhgetch();
            ch0 = String.fromCharCode(key);
        }
        if (ch0 === '\x1b') {          /* esc cancels count (TH) */
            tty_clear_nhwindow_message(game._topl_cury || 0);
            game._pending_message = '';
            game._toplin = TOPLINE_EMPTY;
            game.command_count = 0;
            game.context.move = 0;
            return;
        }
        game.command_count = cnt;
        /* src/cmd.c:5142 — gm.multi = count; if (multi) multi--; */
        game.multi = cnt;
        if (game.multi)
            game.multi--;
        /* the count text stays on the topline in C until the command's own
           output replaces it; rhack's pre-dispatch clear already ran */
    }
    /* the deferred pre-dispatch clear (see the note at the key read):
       win/tty/wintty.c tty_clear_nhwindow(), NHW_MESSAGE, clears the FLAG
       as well as the text; dropping the text alone left toplin at
       TOPLINE_NEED_MORE with nothing behind it. */
    if (clear_before_dispatch) {
        tty_clear_nhwindow_message(game._topl_cury || 0);
        game._pending_message = '';
        game._toplin = TOPLINE_EMPTY;
    }

    game.cmd_key = ch0;

    /* src/options.c:7669 bind_key() — a BIND=key:command line replaces the
       key's default binding. The dispatch chain below is keyed by each
       command's DEFAULT key, so translating the bound key to that default
       reaches the same function C rebinds to. */
    {
        const boundname = game.rc_key_bindings?.[ch0];
        if (boundname !== undefined) {
            const e = extcmdlist.find((x) => x.ef_txt === boundname);
            if (e && e.key)
                ch0 = String.fromCharCode(e.key);
        }
    }

    /* src/cmd.c:1518 do_run_west() and friends — a SHIFTED direction letter
       is the run form of the move: set_move_cmd(dir, 1) puts context.run = 1
       and the same domove/moveloop machinery carries the hero until
       lookaround or a blocked step calls nomul(0). The rush prefix 'g' uses
       run = 2; the only difference between the modes is how lookaround
       decides what is interesting enough to stop at. */
    /* src/cmd.c:1440-1567 do_move_/do_run_/do_rush_ family — the shifted letter
       is the MV_RUN form (set_move_cmd(dir, 1)) and the C(dirchar) control
       form is MV_RUSH (set_move_cmd(dir, 3)), the ^J/^L/^N bindings that
       override redraw and annotate under !num_pad. */
    const CTRL_DIR = { '\x08': 'h', '\x19': 'y', '\x0b': 'k', '\x15': 'u',
                       '\x0c': 'l', '\x0e': 'n', '\x0a': 'j', '\x02': 'b' };
    let movemode = 0;
    let ch = ch0;
    if ('HJKLYUBN'.includes(ch0)) {
        ch = ch0.toLowerCase();
        movemode = 1;
    } else if (CTRL_DIR[ch0] !== undefined) {
        ch = CTRL_DIR[ch0];
        movemode = 3;
    }

    if (isMovementKey(ch)) {
        /* src/cmd.c:1386 set_move_cmd() — sets u.dx/u.dy and, when no g/G
           prefix is pending, context.run. Keeping the direction on `u` is
           what lets moveloop's run branch call domove() again without
           re-reading a key. */
        set_move_cmd(KEY_TO_DIR[ch], movemode);
        /* src/cmd.c:3792 rhack's DOMOVE_RUSH arm — seed multi with
           max(COLNO, ROWNO) as the upper bound on how far one command can
           carry the hero. The run does NOT end by counting down: moveloop's
           guard is (multi < COLNO && !--multi) and multi starts AT COLNO, so
           it never decrements for a rush. It ends through nomul(0), from
           lookaround or from domove bumping a monster, being blocked, or
           stepping onto a door. */
        if (game.context.run) {
            if (!game.multi)
                game.multi = Math.max(COLNO, ROWNO);
            game.u.last_str_turn = 0;
        }
        /* src/cmd.c:3787 — the WALK arm sets mv only when a count is up;
           the RUSH arm always does. run != 0 covers both rush forms. */
        if (game.context.run || game.multi)
            game.context.mv = true;
        /* src/cmd.c:5103 parse() — "assume next command will take game time".
           The flag is set BEFORE domove() runs, and domove's no-move exits
           (blocked step, hack.c:2846) clear it. Setting it after the call
           erased that clear, so a wall bump charged a full turn: seed0016's
           three bumps put the whole game three turns ahead of C. */
        game.context.move = 1;
        const was_forcefight = !!game.context.forcefight;
        await domove();
        if (was_forcefight)
            game.context.forcefight = 0;
    } else if (ch === 'z') {
        // src/cmd.c cmdlist — 'z' is dozap: getobj for the wand, getdir for
        // the direction, and a self-zap of sleep knocks the hero out for
        // rnd(50) helpless turns.
        game.context.move = ((await dozap()) === ECMD_TIME ? 1 : 0);
    } else if (ch === 'Q') {
        // src/cmd.c cmdlist — 'Q' is dowieldquiver.
        game.context.move = ((await dowieldquiver()) === ECMD_TIME ? 1 : 0);
    } else if (ch === 'X') {
        // src/cmd.c:1913 cmdlist — 'X' is dotwoweapon.
        game.context.move = ((await dotwoweapon()) === ECMD_TIME ? 1 : 0);
    } else if (ch === 'Z') {
        // src/cmd.c cmdlist — 'Z' is docast.
        game.context.move = ((await docast()) === ECMD_TIME ? 1 : 0);
    } else if (ch === '\x16') {
        // src/cmd.c:1970 — C('v') is wizlevelport / wiz_level_tele.
        game.context.move = ((await wiz_level_tele()) === ECMD_TIME ? 1 : 0);
    } else if (ch === '\x17') {
        // src/cmd.c:2000 — C('w') is wizwish / wiz_wish.
        game.context.move = ((await wiz_wish()) === ECMD_TIME ? 1 : 0);
    } else if (ch === ',') {
        // src/cmd.c:1799 cmdlist — ',' is dopickup.
        game.context.move = (await dopickup() === ECMD_TIME ? 1 : 0);
    } else if (ch === 'p') {
        // src/cmd.c cmdlist: 'p' is dopay.
        const { dopay } = await import('./shk.js');
        game.context.move = ((await dopay()) === ECMD_TIME ? 1 : 0);
    } else if (ch === 'O') {
        // src/cmd.c:1780 cmdlist — 'O' is doset_simple.
        const { doset_simple } = await import('./options.js');
        game.context.move = (await doset_simple() === ECMD_TIME ? 1 : 0);
    } else if (ch === '\x14') {
        // src/cmd.c:1890 cmdlist — C('t') is dotelecmd.
        const { dotelecmd } = await import('./teleport.js');
        game.context.move = (await dotelecmd() === ECMD_TIME ? 1 : 0);
    } else if (ch === '\x04') {
        // src/cmd.c cmdlist — C('d') is dokick.
        game.context.move = (await dokick() === ECMD_TIME ? 1 : 0);
        game._cmd_was_kick = true;
    } else if (ch === '\x07') {
        // src/cmd.c:1962 cmdlist — C('g') is wiz_genesis.
        game.context.move = ((await wiz_genesis()) === ECMD_TIME ? 1 : 0);
    } else if (ch === '<') {
        // src/cmd.c cmdlist — '<' is doup.
        game.context.move = (await doup() === ECMD_TIME ? 1 : 0);
    } else if (ch === '>') {
        // src/cmd.c cmdlist — '>' is dodown.
        game.context.move = (await dodown() === ECMD_TIME ? 1 : 0);
    } else if (ch === '?') {
        // src/cmd.c cmdlist — '?' is dohelp, a menu of viewers.
        game.context.move = 0;
        await dohelp();
    } else if (ch === '/') {
        // src/cmd.c cmdlist — '/' is dowhatis, the farlook chain.
        game.context.move = 0;
        await dowhatis();
    } else if (ch === ';') {
        // src/cmd.c cmdlist — ';' is doquickwhatis.
        game.context.move = 0;
        await doquickwhatis();
    } else if (ch === 'E') {
        // src/cmd.c cmdlist — 'E' is doengrave.
        game.context.move = ((await doengrave()) === ECMD_TIME ? 1 : 0);
    } else if (ch === '_') {
        // src/cmd.c cmdlist — '_' is dotravel.
        game.context.move = ((await dotravel()) === ECMD_TIME ? 1 : 0);
    } else if (ch === 's') {
        // src/cmd.c cmdlist — 's' is dosearch, which returns ECMD_TIME.
        /* src/cmd.c:3728 — a counted command whose cmdlist entry carries
           f_text ("searching") becomes a TIMED OCCUPATION, so a nearby
           monster interrupts it with "You stop searching." */
        if (game.multi && !game.occupation) {
            const { set_occupation } = await import('./allmain.js');
            set_occupation(async () => { await dosearch(); }, 'searching',
                           game.multi);
        }
        game.context.move = ((await dosearch()) ? 1 : 0);
    } else if (ch === '+') {
        // src/cmd.c cmdlist — '+' is dovspell.
        game.context.move = ((await dovspell()) === ECMD_TIME ? 1 : 0);
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
        if (game.domove_attempting & DOMOVE_RUSH) {
            /* "Double rush prefix, canceled." */
            game.context.run = 0;
            game.domove_attempting = 0;
        } else {
            game.context.run = 2;
            game.domove_attempting |= DOMOVE_RUSH;
            game._cmd_prefix_pending = true;
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
            game._cmd_prefix_pending = true;
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
        // src/cmd.c cmdlist — 'c' is doclose (close a door), whose getdir()
        // consumes a second key. Chat is reachable only as #chat (M-c); this
        // used to dispatch dochat here, which read the same number of keys
        // but printed chat responses where C reports about doors.
        game.context.move = (await doclose() === ECMD_TIME ? 1 : 0);
    } else if (ch === 'a') {
        // src/cmd.c cmdlist — 'a' is doapply. 232 keystrokes across the corpus.
        game.context.move = (await doapply() === ECMD_TIME ? 1 : 0);
    } else if (ch === 'e') {
        // src/cmd.c cmdlist — 'e' is doeat, which reaches floorfood() and then
        // getobj(). 330 keystrokes across the public corpus, the most of any
        // command we did not handle.
        game.context.move = (await doeat() === ECMD_TIME ? 1 : 0);
    } else if (ch === 'd') {
        game.context.move = (await dodrop() === ECMD_TIME ? 1 : 0);
    } else if ('rwqWPRT'.includes(ch)) {
        // src/cmd.c cmdlist — read, wield, quaff, drop, wear, put on, remove.
        // Every one of them starts with getobj(), which reads the inventory
        // letter. Their effects are unported, but consuming that letter is what
        // keeps the session in step: skip it and the letter runs as a command.
        if (ch === 'r')
            game.context.move = ((await doread(read_ok)) === ECMD_TIME ? 1 : 0);
        else if (ch === 'q')
            game.context.move = ((await dodrink(drink_ok)) === ECMD_TIME ? 1 : 0);
        else if (ch === 'W')
            game.context.move = ((await dowear()) === ECMD_TIME ? 1 : 0);
        else if (ch === 'P')
            game.context.move = ((await doputon()) === ECMD_TIME ? 1 : 0);
        else if (ch === 'T')
            game.context.move = ((await dotakeoff()) === ECMD_TIME ? 1 : 0);
        else if (ch === 'R')
            game.context.move = ((await doremring()) === ECMD_TIME ? 1 : 0);
        else if (ch === 'w')
            // src/cmd.c cmdlist — 'w' is dowield.
            game.context.move = ((await dowield()) === ECMD_TIME ? 1 : 0);
        else
            game.context.move = (await docmd_getobj(ch) === ECMD_TIME ? 1 : 0);
    } else if (ch === '.') {
        // src/cmd.c:1930 — '.' is "wait", donull. cmd_safety_prevention
        // (flags.safe_wait, default On) refuses the rest next to a spottable
        // hostile with "Are you waiting to get hit?" and NO time passes.
        const { donull } = await import('./do.js');
        /* src/cmd.c:3728 — counted '.' becomes the "waiting" timed
           occupation, same as counted 's' */
        if (game.multi && !game.occupation) {
            const { set_occupation } = await import('./allmain.js');
            set_occupation(async () => { await donull(); }, 'waiting',
                           game.multi);
        }
        game.context.move = ((await donull()) === ECMD_TIME ? 1 : 0);
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
    } else if (ch === 'S') {
        // src/cmd.c cmdlist — 'S' is dosave: "Really save?", write the
        // state to storage, and exit the process like C's nh_terminate.
        const { dosave } = await import('./save.js');
        game.context.move = (await dosave() === ECMD_TIME ? 1 : 0);
    } else if (ch === 'o') {
        // src/cmd.c cmdlist — 'o' is doopen. It reads a direction key of its
        // own, so skipping it would put the whole session out of step.
        game.context.move = (await doopen() === ECMD_TIME ? 1 : 0);
    } else if (ch === ')') {
        // src/cmd.c cmdlist — ')' is doprwep.
        game.context.move = ((await doprwep()) === ECMD_TIME ? 1 : 0);
    } else if (ch === '[') {
        // src/cmd.c cmdlist — '[' is doprarm.
        game.context.move = ((await doprarm()) === ECMD_TIME ? 1 : 0);
    } else if (ch === '=') {
        // src/cmd.c cmdlist — '=' is doprring.
        game.context.move = ((await doprring()) === ECMD_TIME ? 1 : 0);
    } else if (ch === '"') {
        // src/cmd.c cmdlist — '"' is dopramulet.
        game.context.move = ((await dopramulet()) === ECMD_TIME ? 1 : 0);
    } else if (ch === '(') {
        // src/cmd.c cmdlist — '(' is doprtool.
        game.context.move = ((await doprtool()) === ECMD_TIME ? 1 : 0);
    } else if (ch === '*') {
        // src/cmd.c cmdlist — '*' is doprinuse.
        game.context.move = ((await doprinuse()) === ECMD_TIME ? 1 : 0);
    } else if (ch === '$') {
        // src/cmd.c:1868 cmdlist — GOLD_SYM is doprgold.
        game.context.move = ((await doprgold()) === ECMD_TIME ? 1 : 0);
    } else if (ch === '@') {
        /* src/options.c:9256 dotogglepickup — flips flags.pickup and says
           so. C's FIELD is flags.pickup but the rc OPTION is named
           "autopickup", and our option parser stores it under the option
           name, so flags.autopickup is the one field; toggling a separate
           flags.pickup left pickup() reading the untouched rc value. */
        game.flags.autopickup = !game.flags.autopickup;
        if (game.flags.autopickup) {
            /* src/options.c:9262 — oc_to_str(flags.pickup_types) is empty
               when no types are configured, and C then says "all". The
               autopickup-exception suffix needs an apelist, which no
               recorded rc defines. */
            const ocl = game.flags.pickup_types || '';
            if (game.apelist)
                note_unported_cmd('dotogglepickup:exceptions');
            await pline(`Autopickup: ON, for ${ocl || 'all'} objects.`);
        } else {
            await pline('Autopickup: OFF.');
        }
        game.context.move = 0;
    } else if (ch === ':') {
        // src/cmd.c cmdlist — ':' is dolook. It returns ECMD_OK when not
        // blind, so looking does not consume a turn.
        game.context.move = ((await dolook()) === ECMD_TIME ? 1 : 0);
    } else if (ch === '\x7f') {
        /* src/cmd.c:1895 cmdlist — \177 == <del> aka <delete> aka <rubout>
           is the default key for #terrain */
        game.context.move = ((await doterrain()) === ECMD_TIME ? 1 : 0);
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

    /* src/cmd.c:3820-3825 — "hero did something else than kicking a
       location; reset the location, so pets don't avoid it". Without this
       the square of a long-ago kick stayed poisoned forever and every pet
       pathfinding pass silently skipped it as a candidate. */
    if (game.context.move && !game._cmd_was_kick)
        game.kickedloc = { x: 0, y: 0 };
    game._cmd_was_kick = false;
}

// C ref: hack.c domove — execute a movement
// src/hack.c:2694 domove() — the wrapper around domove_core(). It records
// where the hero started and, if the move actually happened, smudges any
// engraving on the square left behind and the one arrived at.
export async function domove() {
    const ux1 = game.u.ux, uy1 = game.u.uy;
    game.domove_succeeded = 0;
    await domove_core();
    /* src/hack.c:2708 — the tail of C's domove() zeroes gk.kickedloc on
       every hero move attempt, kick follow-through over. */
    game.kickedloc = { x: 0, y: 0 };
    /* src/hack.c:2706 — every move attempt consumes the walk/rush marker */
    game.domove_attempting = 0;
    /* src/hack.c:2701 — smudge/bubble evaluation keys on domove_succeeded,
       which stays 0 for a run's continuation moves (attempting is 0 then) */
    if ((game.domove_succeeded & (DOMOVE_RUSH | DOMOVE_WALK)) !== 0) {
        await maybe_smudge_engr(ux1, uy1, game.u.ux, game.u.uy);
        /* src/hack.c:2704 — one rn2(2) after every actual hero move on the
           Plane of Water: the hero's bubble may take the hero's heading */
        const { maybe_adjust_hero_bubble } = await import('./mkmaze.js');
        maybe_adjust_hero_bubble();
    }
}

// src/hack.c:3020 maybe_smudge_engr()
async function maybe_smudge_engr(x1, y1, x2, y2) {
    /* can_reach_floor(TRUE): true for an ordinary walking hero */
    let ep = engr_at(x1, y1);
    if (ep && ep.engr_type !== HEADSTONE)
        wipe_engr_at(x1, y1, rnd(5), false);
    if ((x2 !== x1 || y2 !== y1)
        && (ep = engr_at(x2, y2)) && ep.engr_type !== HEADSTONE)
        wipe_engr_at(x2, y2, rnd(5), false);
}

async function domove_core() {
    const u = game.u;
    /* C's domove() takes no arguments and reads u.dx/u.dy, which movecmd()
       set from the key. moveloop's run branch calls it the same way, so the
       direction has to live on `u` rather than in a parameter. */

    /* src/hack.c:2724 — travel picks this step's direction */
    if (game.context.travel) {
        const { findtravelpath, TRAVP_TRAVEL, TRAVP_GUESS }
            = await import('./hack.js');
        if (!await findtravelpath(TRAVP_TRAVEL))
            await findtravelpath(TRAVP_GUESS);
        if (globalThis.__dog_trace)
            console.error(`TRAV at(${game.u.ux},${game.u.uy}) d(${game.u.dx},${game.u.dy}) t(${game.u.tx},${game.u.ty}) multi=${game.multi} run=${game.context.run}`);
        game.context.travel1 = 0;
    }

    /* src/hack.c:2747 impaired_movement() — a stunned (always) or confused
       (4 in 5) hero moves in a random viable direction; the rn2(5) inside
       u_maybe_impaired() draws on EVERY move while merely confused, and
       each confdir retry draws rn2(8). */
    if (u_maybe_impaired()) {
        let tries = 0;
        let ix, iy;
        do {
            if (tries++ > 50) {
                nomul(0);
                return;
            }
            confdir(true);
            ix = u.ux + u.dx;
            iy = u.uy + u.dy;
        } while (!isok(ix, iy) || bad_rock(game.youmonst.data, ix, iy));
    }

    const dx = u.dx, dy = u.dy;
    const newx = u.ux + dx;
    const newy = u.uy + dy;

    /* src/hack.c:2242 — with the fight prefix set, the hero attacks the target
       square instead of moving onto it, whether or not anything is there. The
       attack itself needs the combat code; what matters here is that the hero
       does NOT move and the turn is still spent. */
    if (game.context.forcefight && !m_at(newx, newy)) {
        /* src/hack.c:2228 domove_fight_empty() handles the no-target case.
           A real target continues through domove_attackmon_at below while
           forcefight is still set, bypassing the peaceful-monster prompt. */
        const { domove_fight_empty } = await import('./hack.js');
        await domove_fight_empty(newx, newy);
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

    /* src/hack.c:2763 -- a run into a visible monster that is not currently
       safe stops before attacking and costs no turn.  Confusion can make a
       tame monster temporarily unsafe, so this guard must precede the normal
       bump/attack path. */
    {
        const mtmp_run = m_at(newx, newy);
        if (mtmp_run && !is_safemon(mtmp_run) && game.context.run
            && ((!u.ublind && mon_visible(mtmp_run)
                 && M_AP_TYPE(mtmp_run) !== M_AP_FURNITURE
                 && M_AP_TYPE(mtmp_run) !== M_AP_OBJECT)
                || sensemon(mtmp_run))) {
            nomul(0);
            game.context.move = 0;
            return;
        }
    }

    /* src/hack.c:2775 -- record the start of this move before bump, attack,
       trap, liquid, and blocked-terrain exits.  Missile AI later compares
       this position with the current one to decide whether the hero is
       retreating, so updating it only after a successful step leaves stale
       state. */
    u.ux0 = u.ux;
    u.uy0 = u.uy;

    /* src/hack.c's domove_attackmon_at() call is NOT wired here yet.
       js/hack.js now holds that function (it was missing entirely; the C
       does not call do_attack from domove directly, it calls this).

       RE-MEASURED after the melee chain reached 34 functions: wiring it
       costs 23 screens and 2,973 RNG calls. That is down from the 30 screens
       measured when only do_attack's head existed, so the chain is closing
       the gap, but it is still a regression and stays out.

       It does NOT throw -- checked -- so the cost is real behaviour, not a
       crash. The remaining gap is the unported kill path (xkilled, killed)
       and the monster's own attack turn: a hero who swings and connects but
       whose target never retaliates diverges from the first exchange.

       NOTE the ordering trap found while measuring: this call must sit AFTER
       `const mtmp = m_at(...)` below. Placed above it the whole suite reads
       56/11405 from a temporal dead zone, which looks like a catastrophic
       behavioural regression and is really one misplaced line. */

    /* src/hack.c:2786 — bumping a monster ends a run.
     *
     *     if (mtmp) {
     *         if (!is_safemon(mtmp) || svc.context.forcefight)
     *             nomul(0);
     *         ...
     *     }
     *
     * C's comment explains the is_safemon half: "don't stop travel when
     * displacing pets; if the displace fails for some reason, do_attack() in
     * uhitm.c will stop travel rather than domove". So walking into a pet
     * keeps the run going and walking into anything else does not.
     *
     * Unlike hack.c:2766 this is NOT gated on context.run and does NOT
     * return -- it only clears multi and lets the rest of domove proceed.
     * This sits before the blocked-move test, matching C's order. */
    {
        const mtmp_bump = m_at(newx, newy);
        if (mtmp_bump && (!is_safemon(mtmp_bump) || game.context.forcefight))
            nomul(0);
    }

    /* src/hack.c:2790 — domove_attackmon_at() gates walking into an occupied
       square, for a hostile target as well as a safe one. do_attack's combat
       tail runs attack_checks(), the overexertion() hunger tick, u_wipe_engr
       and hitum(), so the whole hero-attacks-monster chain is live. */
    {
        const mtmp_atk = m_at(newx, newy);
        if (mtmp_atk) {
            const displaceu = { value: false };
            if (await domove_attackmon_at(mtmp_atk, newx, newy, displaceu)) {
                /* the move was used up; C's domove returns here */
                return;
            }
        }
    }

    /* src/hack.c:2813: reaching an apparently empty destination proves
       that a remembered invisible-monster marker there is stale. This must
       run before boulder handling so a boulder pushed onto that square can
       replace the marker in map memory. */
    unmap_invisible(newx, newy);

    /* src/hack.c:2831 — when u.utrap is true the struggle may consume the
       move: trapmove() returns FALSE to stay put (time passes), TRUE when
       the hero escaped or may proceed. */
    if (game.u.utrap) {
        const desttrap = t_at(newx, newy);
        const moved = await trapmove(newx, newy, desttrap);
        if (!game.u.utrap) {
            (game.disp ||= {}).botl = true;
            game.u.utraptype = 0;   /* reset_utrap */
        }
        if (!moved)
            return;
    }

    /* src/hack.c:2852 — is it dangerous to swim in water or lava? The
       swim guard refuses a bare move into known liquid (paranoid_confirm
       includes swim by default) and costs no time. */
    {
        const { swim_move_danger } = await import('./hack.js');
        if (await swim_move_danger(newx, newy)) {
            game.context.move = 0;
            nomul(0);
            return;
        }
    }

    /* src/hack.c:2846 — the blocked-move exit.
     *
     *     if (!test_move(u.ux, u.uy, x - u.ux, y - u.uy, DO_MOVE)) {
     *         if (!svc.context.door_opened) {
     *             svc.context.move = 0;
     *             nomul(0);
     *         }
     *         return;
     *     }
     *
     * The nomul(0) is how a RUN ends in the ordinary case: lookaround() does
     * not stop a rush crossing an open room, so C relies on the hero walking
     * into something. Without it a wired run loop has no terminator.
     *
     * The door_opened guard matters: walking into a closed door with autoopen
     * opens it and consumes the turn, and that must NOT stop a run. */
    if (blocksMove(newx, newy, dx, dy)) {
        // Can't move there
        /* src/hack.c:1058 — with mention_walls the blocked move says what
           stopped it, naming the background glyph. Only the solid-stone and
           wall cases are reachable here; anything else records. */
        const bloc = game.level?.at(newx, newy);
        /* src/hack.c:1113 — an orthogonal walk into a closed door that
           autoopen did not handle (autoopen is off while running) says so,
           unless the hero is clumsy enough to walk into it instead. */
        if (closed_door(newx, newy) && !game.context.door_opened
            && (newx === u.ux || newy === u.uy)) {
            if (u.ublind || game.u.uprops?.STUNNED || ACURR(A_DEX) < 10
                || game.u.uprops?.FUMBLING) {
                if (u.usteed) {
                    note_unported_cmd('test_move:steed_into_door');
                } else {
                    await pline('Ouch!  You bump into a door.');
                    exercise(A_DEX, false);
                }
                game.context.door_opened = true;
                game.context.move = 1;
                nomul(0);
            } else {
                await pline('That door is closed.');
            }
        } else if (game.flags?.mention_walls && !game.context.door_opened) {
            if (!bloc || bloc.typ === STONE)
                await pline("It's solid stone.");
            else if (IS_WALL(bloc.typ))
                await pline("It's a wall.");
            else
                note_unported_cmd('test_move:mention_walls_other');
        }
        if (!game.context.door_opened) {
            game.context.move = 0;
            nomul(0);
        }
        return;
    }

    /* src/hack.c:1230 — test_move()'s boulder arm, the DO_MOVE slice:
       walking into a boulder tries to push it (moverock, hack.c:336), and
       a failed push blocks the move exactly like terrain. */
    if (sobj_at(ONAMES.BOULDER, newx, newy)
        && (In_sokoban(game.u.uz) || !game.u.uprops?.PASSES_WALLS)) {
        if (!(u.ublind || Hallucination()) && (game.context.run | 0) >= 2
            && !could_move_onto_boulder(newx, newy)) {
            if (game.flags?.mention_walls)
                await pline('A boulder blocks your path.');
            game.context.move = 0;
            nomul(0);
            return;
        }
        /* tunneling monsters chew before pushing; the un-polymorphed hero
           never tunnels */
        const { moverock } = await import('./hack.js');
        if ((await moverock()) < 0) {
            if (!game.context.door_opened) {
                game.context.move = 0;
                nomul(0);
            }
            return;
        }
        /* push succeeded (or squeezed): if a boulder still remains on the
           target square after moverock() returned 0, C's test_move lets
           the move proceed only for could_move_onto_boulder cases; the
           vacated-square case just walks on */
    }

    // Move the hero
    const oldx = u.ux, oldy = u.uy;
    u.ux = newx;
    u.uy = newy;

    /* src/hack.c:2919 — with a safe monster at the destination, move it to
       the hero's previous square. This is the ELSE-IF arm of the
       displacer-beast branch and carries a hider guard. C runs it after
       tentatively setting the hero's position, and puts the hero back if the
       swap is refused. */
    const mtmp = m_at(newx, newy);
    if (mtmp && is_safemon(mtmp)
        && !(is_hider(game.mons[mtmp.mnum]) && mtmp.mundetected)) {
        if (!(await domove_swap_with_pet(mtmp, newx, newy))) {
            game.u.ux = game.u.ux0;     /* didn't move after all */
            game.u.uy = game.u.uy0;
        }
    }

    /* src/hack.c:2934 — full re-position after the tentative move; this is
       where a ridden steed's mx,my get synced to the hero. */
    u_on_newpos(u.ux, u.uy);

    /* src/hack.c:2936 — the post-move run check.
     *
     *     reset_occupations();
     *     if (svc.context.run) {
     *         if (svc.context.run < 8)
     *             if (IS_DOOR(tmpr->typ) || IS_OBSTRUCTED(tmpr->typ)
     *                 || IS_FURNITURE(tmpr->typ))
     *                 nomul(0);
     *     }
     *
     * tmpr is the square just MOVED ONTO, not the one ahead. This is the
     * second ordinary way a run ends -- stepping onto a doorway, a fountain,
     * an altar, stairs -- and it is separate from lookaround(), which only
     * inspects neighbours. run == 8 is the travel case and is exempt. */
    reset_occupations();
    if (game.context.run) {
        if (game.context.run < 8) {
            const tmpr = game.level?.at?.(newx, newy);
            if (tmpr && (IS_DOOR(tmpr.typ) || IS_OBSTRUCTED(tmpr.typ)
                         || IS_FURNITURE(tmpr.typ)))
                nomul(0);
        }
    }

    // Update display
    newsym(oldx, oldy);
    vision_recalc(1);
    newsym(newx, newy);

    /* src/hack.c:2964 — position changed: mark success for domove()'s
       smudge/bubble tail and set u.umoved, read by u_calc_moveamt (steed
       budget) and the encumbrance exhaustion arm. The attempting mask is 0
       during a run's continuation moves, so those never mark success and
       never smudge engravings. */
    if (u.ux !== u.ux0 || u.uy !== u.uy0) {
        game.domove_succeeded |= ((game.domove_attempting | 0)
                                  & (DOMOVE_RUSH | DOMOVE_WALK));
        game.u.umoved = true;
    }

    /* src/hack.c:2980 — "if (u.umoved) spoteffects(TRUE);". The move above
       either happened or returned early, so reaching here means umoved. */
    if (u.ux !== u.ux0 || u.uy !== u.uy0)
        await spoteffects(true);
}

// src/hack.c:2098 domove_swap_with_pet() — returns TRUE if places were
// swapped. Draws only through goodpos(), whose S_EEL rn2(13) is its one draw,
// so the arms must be evaluated in C's order.
//
// EVERY hero coordinate here goes through game.u, not a local `u`. An earlier
// attempt used a bare `u`, which is a local inside domove and invisible from
// module scope, so this function threw on every step onto a pet and cost 247
// screens. It looked like a logic fault and was not.
async function domove_swap_with_pet(mtmp, x, y) {
    let didnt_move = false;
    const mdat = game.mons[mtmp.mnum];
    const u_with_boulder = !!sobj_at(ONAMES.BOULDER, game.u.ux, game.u.uy);

    /* seemimic/newsym before moving the hero, per the C's own comment */
    game.u.ux = game.u.ux0; game.u.uy = game.u.uy0;
    mtmp.mundetected = 0;
    if (mtmp.m_ap_type)
        seemimic(mtmp);         /* src/hack.c -- ported at mon.js:1213 */
    game.u.ux = mtmp.mx; game.u.uy = mtmp.my;   /* resume swapping positions */

    const trap = mtmp.mtrapped ? t_at(mtmp.mx, mtmp.my) : null;
    if (!trap)
        mtmp.mtrapped = 0;

    if (mtmp.mtrapped && trap && is_pit(trap.ttyp)
        && sobj_at(ONAMES.BOULDER, trap.tx, trap.ty)) {
        didnt_move = true;              /* pinned in a pit by a boulder */
    } else if (game.u.ux0 !== x && game.u.uy0 !== y
               && mtmp.mnum === PMNAMES.PM_GRID_BUG) {
        note_unported_cmd('domove_swap_with_pet:nodiag_msg');
        didnt_move = true;
    } else if (u_with_boulder
               && !(verysmall(mdat)
                    && (!mtmp.minvent?.length || curr_mon_load(mtmp) <= 600))) {
        note_unported_cmd('domove_swap_with_pet:boulder_msg');
        didnt_move = true;
    } else if (game.u.ux0 !== x && game.u.uy0 !== y
               && bad_rock(mdat, x, game.u.uy0)
               && bad_rock(mdat, game.u.ux0, y)
               && (bigmonst(mdat) || curr_mon_load(mtmp) > 600)) {
        note_unported_cmd('domove_swap_with_pet:wont_fit_msg');
        didnt_move = true;
    } else if (mtmp.mpeaceful && mtmp.mtrapped) {
        note_unported_cmd('domove_swap_with_pet:trapped_msg');
        didnt_move = true;
    } else if (mtmp.mpeaceful
               && (!goodpos(game.u.ux0, game.u.uy0, mtmp, 0)
                   || t_at(game.u.ux0, game.u.uy0) !== null
                   || mundisplaceable(mtmp))) {
        note_unported_cmd('domove_swap_with_pet:wont_swap_msg');
        didnt_move = true;
    } else {
        mtmp.mtrapped = 0;
        remove_monster(x, y);
        place_monster(mtmp, game.u.ux0, game.u.uy0);
        newsym(x, y);
        newsym(game.u.ux0, game.u.uy0);
        /* src/hack.c:2169 — the verb depends on PEACEFULNESS, not tameness:
           a peaceful monster is swapped with, a hostile one is frightened.
           The article is ARTICLE_YOUR for a tame monster, which x_monnam
           downgrades to ARTICLE_THE for anything else, so "your little dog"
           and "the jackal" both come out of the same call.

           C's third argument is a "peaceful" adjective for peaceful non-tame
           monsters, and its has_mgivenname/type_is_pname article choice is
           not modelled; both are recorded inside x_monnam. */
        await You(`${mtmp.mpeaceful ? 'swap places with' : 'frighten'} `
                  + x_monnam(mtmp,
                             mtmp.mtame ? ARTICLE_YOUR : ARTICLE_THE,
                             (mtmp.mpeaceful && !mtmp.mtame) ? 'peaceful' : null,
                             0, false)
                  + '.');
    }
    return !didnt_move;
}

// include/monst.h:227 mundisplaceable()
function mundisplaceable(mon) {
    return !!(mon.ispriest || mon.isshk || mon.isgd
              || mon.mnum === PMNAMES.PM_ORACLE);
}

// include/mondata.h bigmonst()
const bigmonst = (ptr) => ptr.msize >= MFLAGS.MZ_LARGE;



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
    await tty_display_nhwindow(win);      /* draws the page and parks the cursor */

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
    await tty_display_nhwindow(win);

    /* dmore() blocks once per page and accepts ONLY the quitchars: any
       other key (a ^O pressed early) is swallowed while the window stays */
    await xwaitforspace(' \r\n\x1b');
    while (tty_next_page(win))
        await xwaitforspace(' \r\n\x1b');

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
        tty_add_menu(win, null,
                     it.heading ? 0 : it.invlet.charCodeAt(0),
                     it.invlet || 0, 0,
                     it.attr, NO_COLOR, it.str, MENU_ITEMFLAGS_NONE);
    tty_end_menu(win, null);
    const picks = await tty_select_menu(win, 1 /* PICK_ONE */);
    tty_destroy_nhwindow(win);
    if (!picks.length)
        return;

    const invlet = String.fromCharCode(picks[0]);
    const obj = (game.invent || []).find(o => o.invlet === invlet);
    if (obj)
        await show_item_actions(obj);
}

function add_item_action(win, action, text) {
    tty_add_menu(win, null, action.charCodeAt(0), action, 0,
                 ATR_NONE, NO_COLOR, text, MENU_ITEMFLAGS_NONE);
}

/* src/iactions.c itemactions(), common ordinary-object actions. More unusual
   item-specific apply, invoke, and equipment variants stay with their command
   implementations until those paths need them. */
async function show_item_actions(obj) {
    const win = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(win, MENU_BEHAVE_STANDARD);
    const wornItem = !!(obj.owornmask & (W_ARMOR | W_ACCESSORY));
    const simpleName = simpleonames(obj);

    add_item_action(win, 'c', `Name this specific ${simpleName}`);
    if (!game.objects[obj.otyp].oc_name_known)
        add_item_action(win, 'C', `Call the type for ${simpleName}`);
    if (!wornItem)
        add_item_action(win, 'd', `Drop this ${obj.quan > 1 ? 'stack' : 'item'}`);
    if (obj.oclass === OCLASSES.RING_CLASS) {
        const verb = game.objects[obj.otyp].oc_tough ? 'Engrave' : 'Write';
        add_item_action(win, 'E', `${verb} on the ${surface(game.u.ux, game.u.uy)} `
                        + `with ${obj.quan > 1 ? 'one of these items' : 'this item'}`);
    }
    if (obj.oclass !== OCLASSES.COIN_CLASS)
        add_item_action(win, 'i', 'Adjust inventory by assigning new letter');
    if (obj.quan > 1 && obj.oclass !== OCLASSES.COIN_CLASS)
        add_item_action(win, 'I', 'Adjust inventory by splitting this stack');
    if (obj.oclass === OCLASSES.SPBOOK_CLASS)
        add_item_action(win, 'r', 'Study this spellbook');
    else if (obj.oclass === OCLASSES.SCROLL_CLASS)
        add_item_action(win, 'r', 'Read this scroll to activate its magic');
    if (!wornItem && obj.oclass === OCLASSES.RING_CLASS)
        add_item_action(win, 'P', !game.u.uleft || !game.u.uright
            ? 'Put this ring on' : '[both ring fingers in use]');
    if (!wornItem)
        add_item_action(win, 't', obj.quan === 1
            ? 'Throw this item' : 'Throw one of these');
    if (!wornItem && obj !== game.u.uwep)
        add_item_action(win, 'w', `Wield this ${obj.quan > 1 ? 'stack' : 'item'}`
                        + ' in your hands');
    if (!wornItem && obj.oclass === OCLASSES.ARMOR_CLASS)
        add_item_action(win, 'W', 'Wear this armor');
    if (obj.oclass === OCLASSES.WAND_CLASS)
        add_item_action(win, 'z', 'Zap this wand to release its magic');
    add_item_action(win, '/', `Look up information about ${obj.quan > 1
        ? 'these' : 'this'}`);

    tty_end_menu(win, `Do what with ${the(cxname(obj))}?`);
    const picks = await tty_select_menu(win, 1 /* PICK_ONE */);
    tty_destroy_nhwindow(win);
    if (picks.length)
        queue_item_action(String.fromCharCode(picks[0]), obj);
}

function queue_item_action(action, obj) {
    const push = (fn, ...keys) => {
        cmdq_add_ec(CQ_CANNED, fn);
        for (const key of keys)
            cmdq_add_key(CQ_CANNED, key);
    };
    switch (action) {
    case 'c': push(docallcmd, 'i', obj.invlet); break;
    case 'd': push(dodrop, obj.invlet); break;
    case 'E': push(doengrave, obj.invlet); break;
    case 'P': push(doputon, obj.invlet); break;
    case 'r': push(() => doread(read_ok), obj.invlet); break;
    case 't': push(dothrow, obj.invlet); break;
    case 'w': push(dowield, obj.invlet); break;
    case 'z': push(dozap, obj.invlet); break;
    case '/': push(dowhatis, 'i', obj.invlet); break;
    default:
        note_unported_cmd(`item_action:${action}`);
        break;
    }
}

// src/do_wear.c reset_remarm() — forget a partly-finished take-off.
export function reset_remarm() {
    const t = (game.context.takeoff ||= {});
    t.what = t.mask = 0;
    t.disrobing = '';
}

// src/lock.c:259 reset_pick() — forget a partly-finished lock pick or force.
export function reset_pick() {
    const x = (game.xlock ||= {});
    x.usedtime = x.chance = x.picktyp = 0;
    x.magic_key = false;
    x.door = null;
    x.box = null;
}

// src/apply.c:2813 reset_trapset() — forget a partly-set trap.
export function reset_trapset() {
    const t = (game.trapinfo ||= {});
    t.tobj = 0;
    t.force_bungle = 0;
}

// src/cmd.c:195 reset_occupations() — abandon every multi-turn task at once.
//
// Three separate state blocks, cleared together because any command that
// interrupts the hero has to abandon ALL of them, not just the one it knows
// about. Dropping an object does this: you cannot go on picking a lock while
// rummaging through your pack.
export function reset_occupations() {
    reset_remarm();
    reset_pick();
    reset_trapset();
}

// src/cmd.c:431 cmdq_clear() — drop every queued command in queue `q`.
//
// C walks a linked list and frees it; the queue is an array here, so emptying
// it is the whole function. The port has no producer for the queue yet, so
// this clears an empty list exactly as C does when nothing is queued.
export function cmdq_clear(q) {
    (game.command_queue ||= [])[q] = null;
}

/* The queue entries mirror C's struct _cmd_queue: {typ, fn} for CMDQ_EXTCMD
   (the function itself stands in for C's ext_func_tab lookup) and {typ, key}
   for CMDQ_KEY (key kept as the character, converted at the consumer). The
   backing store is an array per queue where C uses a singly-linked list with
   tail append; push/shift preserve the same FIFO order. */

// src/cmd.c:254 cmdq_add_ec() — add extended command function to the queue.
export function cmdq_add_ec(q, fn) {
    ((game.command_queue ||= [])[q] ||= []).push({ typ: CMDQ_EXTCMD, fn });
}

// src/cmd.c:274 cmdq_add_key() — add a key to the command queue.
export function cmdq_add_key(q, key) {
    ((game.command_queue ||= [])[q] ||= []).push({ typ: CMDQ_KEY, key });
}

// src/cmd.c:410 cmdq_pop() — pop the topmost command. The queue popped
// depends on whether a do-again (^A) replay is in progress.
export function cmdq_pop() {
    const q = game.in_doagain ? CQ_REPEAT : CQ_CANNED;
    const list = (game.command_queue ||= [])[q];
    if (list && list.length)
        return list.shift();
    return null;
}

// src/cmd.c:421 cmdq_peek() — the top entry without popping it.
export function cmdq_peek(q) {
    const list = (game.command_queue ||= [])[q];
    return (list && list.length) ? list[0] : null;
}

// src/cmd.c:5299 dotravel() — the '_' command: pick a destination with
// getpos (force=TRUE, so unknown keys coach rather than abort), then walk
// there. The walk itself (dotravel_target -> findtravelpath/domove) is the
// unported half: a session that actually PICKS a spot desyncs there and the
// gap is recorded. The cached-destination and menu_requested arms need
// iflags state no session sets.
export async function dotravel() {
    const cc = { x: 0, y: 0 };
    cc.x = game.iflags?.travelcc?.x || 0;
    cc.y = game.iflags?.travelcc?.y || 0;
    if (cc.x === 0 && cc.y === 0) {
        cc.x = game.u.ux;
        cc.y = game.u.uy;
    }
    game.iflags = game.iflags || {};
    game.iflags.getloc_travelmode = true;
    await pline('Where do you want to travel to?');
    if (await getpos(cc, true, 'the desired destination') < 0) {
        /* user pressed ESC */
        game.iflags.getloc_travelmode = false;
        return ECMD_CANCEL_TRAVEL;
    }
    /* src/cmd.c:5340 — iflags.travelcc.x = u.tx = cc.x */
    game.iflags.travelcc = { x: cc.x, y: cc.y };
    game.u.tx = cc.x;
    game.u.ty = cc.y;
    return await dotravel_target();
}

// src/cmd.c:5348 dotravel_target() — install the travel state and take the
// first step.
async function dotravel_target() {
    const cc = game.iflags?.travelcc || { x: 0, y: 0 };
    if (!isok(cc.x, cc.y)) {
        await pline('No travel destination set.');
        return ECMD_OK;
    } else if (game.u.ux === cc.x && game.u.uy === cc.y) {
        const { You } = await import('./pline.js');
        await You('are already here.');
        game.iflags.travelcc = { x: 0, y: 0 };
        return ECMD_OK;
    }

    game.iflags.getloc_travelmode = false;

    game.context.travel = 1;
    game.context.travel1 = 1;
    game.context.run = 8;
    game.context.nopick = 1;

    if (!game.multi)
        game.multi = Math.max(COLNO, ROWNO);
    game.u.last_str_turn = 0;
    game.context.mv = true;

    /* u.tx/u.ty — the destination findtravelpath floods from */
    game.u.tx = cc.x;
    game.u.ty = cc.y;
    (game.travelmap ||= new Set()).clear();

    await domove();
    return ECMD_TIME;
}

/* include/hack.h ECMD_CANCEL */
const ECMD_CANCEL_TRAVEL = 0x04;

/* src/cmd.c:2085 misc_keys[] — the special-key entries dokeylist and
   key2extcmddesc share. The count prefix is numpad-only and numpad is off. */
const misc_keys = [
    { key: 27, desc: 'cancel current prompt or pending prefix' },
];

// src/cmd.c key2txt() — printable form of a key for the binding lists.
export function key2txt(c) {
    if (c === 32) return '<space>';
    if (c === 27) return '<esc>';
    if (c === 10) return '<enter>';
    if (c === 127) return '<del>';
    return visctrl_key(c);
}

/* src/hacklib.c visctrl() — '^X' for control chars, 'M-x' for meta */
function visctrl_key(c) {
    let out = '';
    if (c & 0x80) {
        out += 'M-';
        c &= 0x7f;
    }
    if (c < 0x20) {
        out += '^';
        c |= 0x40;
    } else if (c === 0x7f) {
        return out + '^?';
    }
    return out + String.fromCharCode(c);
}

/* the default key -> extended command bindings: commands_init() walks
   extcmdlist and binds each entry's default key, later entries replacing
   earlier ones on a collision. Its extra bind_key() calls follow; most are
   number_pad alternates whose keys reset_commands() then rebinds to
   movement commands for !num_pad (h/j/k/l/N/u, ^L/^N via the ctrl-rush
   forms), and '5'/M-5/'-' land on MOVEMENTCMD entries the key lists
   exclude. The two that survive visibly are M-O overview and M-N name —
   exactly the pair the recorded '?j' listing shows. */
function cmdbind_table() {
    const binds = new Map();
    for (const e of extcmdlist)
        if (e.key)
            binds.set(e.key, e);
    const by_txt = (t) => extcmdlist.find(e => e.ef_txt === t);
    binds.set('5'.charCodeAt(0), by_txt('run'));
    binds.set(0x80 | '5'.charCodeAt(0), by_txt('rush'));
    binds.set('-'.charCodeAt(0), by_txt('fight'));
    binds.set(0x80 | 'O'.charCodeAt(0), by_txt('overview'));
    binds.set(0x80 | '2'.charCodeAt(0), by_txt('twoweapon'));
    binds.set(0x80 | 'N'.charCodeAt(0), by_txt('name'));
    return binds;
}

// src/cmd.c keylist_putcmds() — one category's bound keys, then the
// commands of that category with no key at all.
function keylist_putcmds(putline, docount, incl_flags, excl_flags, keys_used) {
    const binds = cmdbind_table();
    const keys_already_used = keys_used.slice();
    let count = 0;

    for (let i = 0; i < 256; i++) {
        if (keys_used[i]) continue;
        if (i === 32 /* && !flags.rest_on_space */) continue;
        const cmd = binds.get(i);
        if (!cmd) continue;
        if ((incl_flags && !(cmd.flags & incl_flags))
            || (excl_flags && (cmd.flags & excl_flags)))
            continue;
        if (docount) {
            count++;
            continue;
        }
        putline(`${key2txt(i).padEnd(7)} ${cmd.ef_txt.padEnd(13)} ${cmd.ef_desc}`);
        keys_used[i] = true;
    }
    /* commands that lack key assignments */
    for (const extcmd of extcmdlist) {
        if ((incl_flags && !(extcmd.flags & incl_flags))
            || (excl_flags && (extcmd.flags & excl_flags)))
            continue;
        /* keylist_func_has_key: is some not-yet-listed key bound to it? */
        let has_key = false;
        for (const [k, cmd] of binds)
            if (!keys_already_used[k] && cmd === extcmd) {
                has_key = true;
                break;
            }
        if (has_key) continue;
        if (docount) {
            count++;
            continue;
        }
        putline(`#${extcmd.ef_txt.padEnd(20)} ${extcmd.ef_desc}`);
    }
    return count;
}

/* include/func_tab.h flag bundle dokeylist ignores everywhere */
const KEYLIST_IGNORE = EXTCMD_FLAGS.WIZMODECMD | EXTCMD_FLAGS.INTERNALCMD
    | EXTCMD_FLAGS.MOVEMENTCMD;

// src/cmd.c dokeylist() — the '?j' full key bindings window.
export async function dokeylist() {
    const keys_used = new Array(256).fill(false);
    const pfx_seen = new Array(256).fill(0);
    keys_used[3] = true;                        /* ^C, SIGINT */
    const mov_seen = keys_used.slice();
    let spkey_gap = false;
    for (const mk of misc_keys) {
        if (mk.key && !mov_seen[mk.key] && !pfx_seen[mk.key]) {
            keys_used[mk.key] = true;
            pfx_seen[mk.key] = 1;
        } else {
            spkey_gap = true;
        }
    }

    const win = tty_create_nhwindow(NHW_TEXT);
    const putline = (s) => tty_putstr(win, 0, s);

    putline('');
    putline('        ' + '    Full Current Key Bindings List');
    {
        /* the "(also commands with no key assignment)" subtitle shows when
           spkey_gap or any command has no key; the '#'-only commands make
           it always true here, but test it the way the C does */
        const binds = cmdbind_table();
        let any_keyless = spkey_gap;
        for (const extcmd of extcmdlist) {
            if (any_keyless) break;
            let has_key = false;
            for (const [k, cmd] of binds)
                if (!keys_used[k] && cmd === extcmd) {
                    has_key = true;
                    break;
                }
            if (!has_key) any_keyless = true;
        }
        if (any_keyless)
            putline('        ' + '(also commands with no key assignment)');
    }

    /* directional keys */
    putline('');
    putline('Directional keys:');
    show_direction_keys(win, '.', false);

    putline('');
    putline('Ctrl+<direction> will run in specified direction until something very');
    putline('        ' + 'interesting is seen.');
    putline('Shift+<direction> will run in specified direction until you encounter');
    putline('        ' + 'an obstacle.');

    putline('');
    putline('Miscellaneous keys:');
    for (const mk of misc_keys)
        if (mk.key && !mov_seen[mk.key] && pfx_seen[mk.key])
            putline(`${key2txt(mk.key).padEnd(7)} ${mk.desc}`);
    putline(`${key2txt(3).padEnd(7)} interrupt: break out of NetHack (SIGINT)`);

    putline('');
    show_menu_controls(putline, true);

    if (keylist_putcmds(putline, true, EXTCMD_FLAGS.GENERALCMD,
                        KEYLIST_IGNORE, keys_used)) {
        putline('');
        putline('General commands:');
        keylist_putcmds(putline, false, EXTCMD_FLAGS.GENERALCMD,
                        KEYLIST_IGNORE, keys_used);
    }

    if (keylist_putcmds(putline, true, 0,
                        EXTCMD_FLAGS.GENERALCMD | KEYLIST_IGNORE, keys_used)) {
        putline('');
        putline('Game commands:');
        keylist_putcmds(putline, false, 0,
                        EXTCMD_FLAGS.GENERALCMD | KEYLIST_IGNORE, keys_used);
    }

    if (game.wizard
        && keylist_putcmds(putline, true, EXTCMD_FLAGS.WIZMODECMD,
                           EXTCMD_FLAGS.INTERNALCMD, keys_used)) {
        putline('');
        putline('Debug mode commands:');
        keylist_putcmds(putline, false, EXTCMD_FLAGS.WIZMODECMD,
                        EXTCMD_FLAGS.INTERNALCMD, keys_used);
    }

    await tty_display_nhwindow(win);
    for (;;) {
        await xwaitforspace(' \r\n\x1b');
        if (game.morc === '\x1b')
            break;
        if (!tty_next_page(win))
            break;
    }
    tty_destroy_nhwindow(win);
    await docrt();
    return 0; /* ECMD_OK */
}

// src/cmd.c key2extcmddesc() — what a key does, for dowhatdoes ('?f').
export function key2extcmddesc(key) {
    const ch = String.fromCharCode(key & 0x7f);
    /* movement commands take precedence over the binding table */
    if (!(key & 0x80)) {
        if ('hjklyubn'.includes(ch))
            return 'move'; /* "move or attack"? */
        if ('HJKLYUBN'.includes(ch))
            return 'run';
    }
    if (ch >= '0' && ch <= '9')
        return 'start of, or continuation of, a count';
    for (const mk of misc_keys)
        if (key === mk.key)
            return mk.desc;
    const cmd = cmdbind_table().get(key);
    if (cmd && cmd.ef_txt) {
        let buf = `${cmd.ef_desc} (#${cmd.ef_txt})`;
        /* reqmenu prefix gets a two-line movement/non-movement form */
        if (buf.toLowerCase().startsWith('prefix:') && cmd.ef_txt === 'reqmenu')
            buf = 'movement prefix:'
                + ' move without autopickup and without attacking'
                + '\n'
                + 'non-movement prefix:' + buf.slice(7);
        return buf;
    }
    return null;
}
