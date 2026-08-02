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
import { is_pool, is_lava, m_at, t_at } from './mon.js';
import { do_attack } from './uhitm.js';
import { is_safemon } from './display.js';
import { goodpos, place_monster, remove_monster } from './makemon.js';
import { sobj_at } from './invent.js';
import { PMNAMES, MFLAGS } from './monst_data.js';
import { is_hider, verysmall } from './mondata.js';
import { bad_rock, nomul, domove_attackmon_at, spoteffects, dopickup } from './hack.js';
import { doloot } from './pickup.js';
import { curr_mon_load } from './mon.js';
import { ECMD_FAIL, ECMD_CANCEL, A_DEX } from './const.js';
import { ACURR } from './attrib.js';
import { is_pit, GETOBJ_EXCLUDE, GETOBJ_SUGGEST, GETOBJ_NOFLAGS, GETOBJ_PROMPT, GETOBJ_ALLOWCNT, GETOBJ_DOWNPLAY, W_ARMOR, W_ACCESSORY, GETOBJ_EXCLUDE_INACCESS, ARTICLE_YOUR, ARTICLE_THE, CQ_CANNED, CQ_REPEAT, CMDQ_EXTCMD, CMDQ_KEY } from './const.js';
import { ONAMES, OCLASSES } from './objects_data.js';
import { x_monnam, docallcmd } from './do_name.js';
import { You } from './pline.js';

/* js/do.js needs mklev(), and js/sp_lev.js needs mon.js's terrain tests; both
   are cycles when imported directly, so cmd.js -- which already pulls in every
   one of them -- does the wiring. */
do_wire_mklev(mklev);
sp_lev_wire_mon({ is_pool, is_lava, m_at });
mklev_wire_mon({ is_pool, is_lava });
dokick_wire({ stairway_at, t_at });
do_wire_dokick(ship_object);
import { wiz_level_change, wiz_level_tele, wiz_wish } from './wizcmds.js';
import { tty_yn_function } from './tty/topl.js';
import { extcmdlist, EXTCMD_FLAGS } from './extcmd_data.js';
import { dodiscovered } from './o_init.js';
import { enlightenment } from './insight.js';
import { tty_create_nhwindow, tty_putstr, tty_display_nhwindow, tty_next_page, tty_destroy_nhwindow, tty_start_menu, tty_add_menu, tty_end_menu, NHW_TEXT, NHW_MENU, ATR_NONE } from './tty/wintty.js';
import { MENU_ITEMFLAGS_NONE, MENU_BEHAVE_STANDARD, isok, HEADSTONE, xdir, ydir, zdir } from './const.js';
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
import { newsym, flush_screen, pline, docrt, _buildScreenOutput, tty_clear_nhwindow_message, TOPLINE_SPECIAL_PROMPT, TOPLINE_EMPTY, TOPLINE_NEED_MORE, more } from './display.js';
import { vision_recalc } from './vision.js';
import { COLNO, ROWNO, STONE, DOOR, D_CLOSED, D_LOCKED, D_NODOOR, D_BROKEN, IS_WALL, IS_OBSTRUCTED, IS_DOOR, IS_FURNITURE } from './const.js';
import { dosearch } from './detect.js';
import { doengrave, engr_at, wipe_engr_at } from './engrave.js';
import { rnd } from './rng.js';
import { ACCESSIBLE } from './const.js';
import { morehungry } from './eat.js';
import { dohelp, dowhatis, doquickwhatis } from './pager.js';
import { dolook, ECMD_TIME, display_inventory } from './invent.js';
import { dovspell, docast } from './spell.js';
import { dowieldquiver } from './wield.js';
import { dozap } from './zap.js';

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
    if (loc.typ === STONE) return true;
    if (IS_WALL(loc.typ)) return true;
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

// src/hack.c:4063 doorless_door() — no physical door in the frame. Rogue
// level doors count as present to keep diagonals blocked there.
function doorless_door(x, y) {
    const lev_p = game.level?.at(x, y);
    if (!lev_p || !IS_DOOR(lev_p.typ))
        return false;
    /* Is_rogue_level: the rogue level is not modelled yet */
    return !(lev_p.doormask & ~(D_NODOOR | D_BROKEN));
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
    await nhgetch();
    while (tty_next_page(win))
        await nhgetch();
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
    game.context.travel = game.context.travel1 = 0;
    game.context.run = run;
    game.context.nopick = 0;
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
        game._pending_message = `${query} ${buf}`;
        game._toplin = TOPLINE_SPECIAL_PROMPT;
        _buildScreenOutput();
        const display = game?.nhDisplay;
        if (display) {
            const CO = display.cols ?? 80;
            display.setCursor(Math.min(query.length + 1 + pos, CO - 1), 0);
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
    /* extcmds_match with ECM_EXACTMATCH: the hook has already completed the
       text, so C matches the whole name. */
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

   'q', 'r' and 'd' carry their real filters. 'w', 'W', 'P' and 'R' all route
   through C's equip_ok(obj, taking_off, is_accessory), which is a larger
   function and is not ported, so they stay null and still offer the whole
   inventory; their VERBS are correct. */
const GETOBJ_CMD = {
    q: { word: 'drink',   ok: drink_ok, flags: GETOBJ_NOFLAGS },
    r: { word: 'read',    ok: read_ok,  flags: GETOBJ_PROMPT },
    w: { word: 'wield',   ok: null,      flags: GETOBJ_PROMPT | GETOBJ_ALLOWCNT },
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
    if (name === 'loot')
        return await doloot();
    if (name === 'force') {
        const { doforce } = await import('./lock.js');
        return await doforce();
    }
    if (name === 'chat')
        return await dochat();
    if (name === 'name')
        return await docallcmd();
    if (name === 'jump')
        return await dojump();
    if (name === 'levelchange')
        return await wiz_level_change();
    if (name === 'wizwish')
        return await wiz_wish();

    note_unported_cmd(`extcmd:${name}`);
    return ECMD_OK;
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
    morehungry(rnd(25));
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
    if (key === 0) {
        // Read key from input
        live_input = true;
        await flush_screen(1);
        key = await nhgetch();
        // The boundary frame has now been captured with the previous
        // command's message on it, so it is safe to clear for this command.
        //
        // win/tty/wintty.c tty_clear_nhwindow(), NHW_MESSAGE, clears the FLAG
        // as well as the text. Dropping the text alone left toplin at
        // TOPLINE_NEED_MORE with nothing behind it, and update_topl's joining
        // branch then glued the next message onto an empty string, indenting
        // it by the two spaces the join inserts.
        /* js/display.js:606 records this same defect on seed0360: clearing
           the text without erasing the cells leaves the old prompt painted
           in the grid for whatever draws next to land on top of. */
        tty_clear_nhwindow_message(game._topl_cury || 0);
        game._pending_message = '';
        game._toplin = TOPLINE_EMPTY;
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
                _buildScreenOutput();
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
    game.cmd_key = ch0;

    /* src/cmd.c:1518 do_run_west() and friends — a SHIFTED direction letter
       is the run form of the move: set_move_cmd(dir, 1) puts context.run = 1
       and the same domove/moveloop machinery carries the hero until
       lookaround or a blocked step calls nomul(0). The rush prefix 'g' uses
       run = 2; the only difference between the modes is how lookaround
       decides what is interesting enough to stop at. */
    const ch = 'HJKLYUBN'.includes(ch0) ? ch0.toLowerCase() : ch0;
    if (ch !== ch0 && isMovementKey(ch) && !game.context.run)
        game.context.run = 1;

    if (isMovementKey(ch)) {
        /* src/cmd.c movecmd() — the key sets u.dx/u.dy, then domove() reads
           them. Keeping the direction on `u` is what lets moveloop's run
           branch call domove() again without re-reading a key. */
        game.u.dx = DIR_DX[ch];
        game.u.dy = DIR_DY[ch];
        /* src/cmd.c:3792 DOMOVE_RUSH — seed multi with max(COLNO, ROWNO) as
           the upper bound on how far one command can carry the hero. The run
           does NOT end by counting down: moveloop's guard is
           (multi < COLNO && !--multi) and multi starts AT COLNO, so it never
           decrements for a rush. It ends through nomul(0), from lookaround or
           from domove bumping a monster, being blocked, or stepping onto a
           door. */
        if (game.context.run) {
            if (!game.multi)
                game.multi = Math.max(COLNO, ROWNO);
            game.u.last_str_turn = 0;
            game.context.mv = true;
        }
        /* src/cmd.c:5103 parse() — "assume next command will take game time".
           The flag is set BEFORE domove() runs, and domove's no-move exits
           (blocked step, hack.c:2846) clear it. Setting it after the call
           erased that clear, so a wall bump charged a full turn: seed0016's
           three bumps put the whole game three turns ahead of C. */
        game.context.move = 1;
        await domove();
    } else if (ch === 'z') {
        // src/cmd.c cmdlist — 'z' is dozap: getobj for the wand, getdir for
        // the direction, and a self-zap of sleep knocks the hero out for
        // rnd(50) helpless turns.
        game.context.move = ((await dozap()) === ECMD_TIME ? 1 : 0);
    } else if (ch === 'Q') {
        // src/cmd.c cmdlist — 'Q' is dowieldquiver.
        game.context.move = ((await dowieldquiver()) === ECMD_TIME ? 1 : 0);
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
        game.context.move = (dosearch() ? 1 : 0);
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
        else
            game.context.move = (await docmd_getobj(ch) === ECMD_TIME ? 1 : 0);
    } else if (ch === '.') {
        // src/cmd.c:1930 — '.' is "wait", donull. cmd_safety_prevention
        // (flags.safe_wait, default On) refuses the rest next to a spottable
        // hostile with "Are you waiting to get hit?" and NO time passes.
        const { donull } = await import('./do.js');
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
// src/hack.c:2694 domove() — the wrapper around domove_core(). It records
// where the hero started and, if the move actually happened, smudges any
// engraving on the square left behind and the one arrived at.
export async function domove() {
    const ux1 = game.u.ux, uy1 = game.u.uy;
    await domove_core();
    /* gd.domove_succeeded & (DOMOVE_RUSH | DOMOVE_WALK): the move counts as
       taken when the hero's position actually changed */
    if (game.u.ux !== ux1 || game.u.uy !== uy1)
        await maybe_smudge_engr(ux1, uy1, game.u.ux, game.u.uy);
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
    const dx = u.dx, dy = u.dy;
    const newx = u.ux + dx;
    const newy = u.uy + dy;

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
                || game.u.uprops?.FUMBLING)
                note_unported_cmd('test_move:walk_into_door');
            else
                await pline('That door is closed.');
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

    // Move the hero
    const oldx = u.ux, oldy = u.uy;
    u.ux0 = oldx;
    u.uy0 = oldy;
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
    await tty_display_nhwindow(win);

    await nhgetch();
    while (tty_next_page(win))
        await nhgetch();

    tty_destroy_nhwindow(win);
    await docrt();
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
    game.iflags.getloc_travelmode = false;
    (game.unported ||= new Set()).add('cmd:dotravel_target');
    return 0; /* ECMD_OK; the travel movement is the recorded gap above */
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
