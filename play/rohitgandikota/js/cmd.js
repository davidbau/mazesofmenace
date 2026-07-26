import { seemimic } from './mon.js';
// cmd.js — Command dispatch and movement.
// C ref: cmd.c rhack(), hack.c domove().
//
// Minimal skeleton: only hjklyubn movement is implemented.
// Contestants should add: search, kick, eat, drink, read, zap,
// wear, wield, drop, throw, pray, cast, and all other commands.

import { game } from './gstate.js';
import { dodrop } from './do.js';
import { any_obj_ok } from './invent.js';
import { dodown, do_wire_mklev, do_wire_dokick, stairway_at } from './do.js';
import { dokick_wire, ship_object } from './dokick.js';
import { mklev, mklev_wire_mon } from './mklev.js';
import { sp_lev_wire_mon } from './sp_lev.js';
import { is_pool, is_lava, m_at, t_at } from './mon.js';
import { do_attack } from './uhitm.js';
import { is_safemon } from './display.js';
import { goodpos, place_monster, remove_monster } from './makemon.js';
import { sobj_at } from './invent.js';
import { PMNAMES, MFLAGS } from './monst_data.js';
import { is_hider, verysmall } from './mondata.js';
import { bad_rock, nomul } from './hack.js';
import { curr_mon_load } from './mon.js';
import { is_pit, GETOBJ_EXCLUDE, GETOBJ_SUGGEST, GETOBJ_NOFLAGS, GETOBJ_PROMPT, GETOBJ_ALLOWCNT, GETOBJ_DOWNPLAY, W_ARMOR, W_ACCESSORY, GETOBJ_EXCLUDE_INACCESS, ARTICLE_YOUR, ARTICLE_THE } from './const.js';
import { ONAMES, OCLASSES } from './objects_data.js';
import { x_monnam } from './do_name.js';
import { You } from './pline.js';

/* js/do.js needs mklev(), and js/sp_lev.js needs mon.js's terrain tests; both
   are cycles when imported directly, so cmd.js -- which already pulls in every
   one of them -- does the wiring. */
do_wire_mklev(mklev);
sp_lev_wire_mon({ is_pool, is_lava, m_at });
mklev_wire_mon({ is_pool, is_lava });
dokick_wire({ stairway_at, t_at });
do_wire_dokick(ship_object);
import { wiz_level_change, wiz_level_tele } from './wizcmds.js';
import { tty_yn_function } from './tty/topl.js';
import { extcmdlist, EXTCMD_FLAGS } from './extcmd_data.js';
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
import { newsym, flush_screen, pline, docrt, _buildScreenOutput,
         tty_clear_nhwindow_message,
         TOPLINE_SPECIAL_PROMPT , TOPLINE_EMPTY} from './display.js';
import { vision_recalc } from './vision.js';
import { COLNO, ROWNO, STONE, DOOR, D_CLOSED, D_LOCKED,
         IS_WALL, IS_OBSTRUCTED, IS_DOOR, IS_FURNITURE } from './const.js';
import { dosearch } from './detect.js';
import { dolook, ECMD_TIME, display_inventory } from './invent.js';
import { dovspell, docast } from './spell.js';
import { dowieldquiver } from './wield.js';

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
    return buf;
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

    /* armor we can't wear, e.g. from polyform */
    if (obj.oclass === OCLASSES.ARMOR_CLASS && !removing
        && !note_unported_cmd('equip_ok:canwearobj'))
        return GETOBJ_DOWNPLAY;

    /* removing inaccessible equipment */
    if (removing)
        note_unported_cmd('equip_ok:inaccessible_equipment');

    /* all good to go */
    return GETOBJ_SUGGEST;
}

/* src/do_wear.c:3451-3475 — the four getobj callbacks over equip_ok. */
const puton_ok   = (o) => equip_ok(o, false, true);
const remove_ok  = (o) => equip_ok(o, true,  true);
const wear_ok    = (o) => equip_ok(o, false, false);
const takeoff_ok = (o) => equip_ok(o, true,  false);

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
    if (name === 'levelchange')
        return await wiz_level_change();

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

    const ch = String.fromCharCode(key);

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
        await domove();
        game.context.move = 1;
    } else if (ch === 'Q') {
        // src/cmd.c cmdlist — 'Q' is dowieldquiver.
        game.context.move = ((await dowieldquiver()) === ECMD_TIME ? 1 : 0);
    } else if (ch === 'Z') {
        // src/cmd.c cmdlist — 'Z' is docast.
        game.context.move = ((await docast()) === ECMD_TIME ? 1 : 0);
    } else if (ch === '\x16') {
        // src/cmd.c:1970 — C('v') is wizlevelport / wiz_level_tele.
        game.context.move = ((await wiz_level_tele()) === ECMD_TIME ? 1 : 0);
    } else if (ch === '>') {
        // src/cmd.c cmdlist — '>' is dodown.
        game.context.move = (await dodown() === ECMD_TIME ? 1 : 0);
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
    } else if (ch === 'd') {
        game.context.move = (await dodrop() === ECMD_TIME ? 1 : 0);
    } else if ('rwqWPR'.includes(ch)) {
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
export async function domove() {
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
    if (blocksMove(newx, newy)) {
        // Can't move there
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
