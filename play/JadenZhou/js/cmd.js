// cmd.js — Command dispatch and movement.
// C ref: cmd.c rhack(), parse(), getdir(), the default key bindings
// (commands_init()/reset_commands()) and the command functions ported so
// far; hack.c domove() is in hack.js.

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { newsym, flush_screen, pline, You_cant } from './display.js';
import { vision_recalc } from './vision.js';
import { tty_clear_nhwindow, tty_get_ext_cmd, tty_yn_function, tty_create_nhwindow,
         tty_putstr, tty_display_nhwindow, tty_destroy_nhwindow } from './wintty.js';
import { doride } from './steed.js';
import { dopray } from './pray.js';
import { dotalk } from './sounds.js';
import { extcmdlist, CMD_NOT_AVAILABLE, INTERNALCMD, WIZMODECMD, AUTOCOMPLETE,
         ECM_IGNOREAC, ECM_EXACTMATCH, ECM_NO1CHARCMD, IFBURIED, PREFIXCMD,
         MOVEMENTCMD } from './func_tab.js';
import { strcmpi, strncmpi, highc } from './hacklib.js';
import { dosearch } from './detect.js';
import { level_tele } from './teleport.js';
import { wiz_level_change, wiz_wish } from './wizcmds.js';
import { ddoinv, dolook } from './invent.js';
import { cmd_safety_prevention, nomul, domove, DOMOVE_WALK,
         DOMOVE_RUSH, confdir } from './hack.js';
export { domove };
import { IS_DOOR, IS_FURNITURE, NHW_TEXT, ECMD_OK, ECMD_TIME, ECMD_CANCEL,
         ECMD_FAIL } from './const.js';
import { dovspell, docast } from './spell.js';
import { dodiscovered } from './o_init.js';
import { doattributes } from './insight.js';
import { wiz_genesis } from './wizcmds.js';
import { dodrop } from './do.js';
import { dozap } from './zap.js';
import { docallcmd } from './do_name.js';
import { doloot } from './pickup.js';
import { Never_mind, isok } from './const.js';
import { dofire } from './dothrow.js';
import { doswapweapon, dowieldquiver } from './wield.js';
import { doapply, dorub } from './apply.js';
import { doeat } from './eat.js';
import { dowear, doputon } from './do_wear.js';
import { dodrink } from './potion.js';

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

// the commands ported so far, by their cmd.c function name (keys and
// extended commands both go through this table)
const cmd_funcs = {
    doextcmd: () => doextcmd(),
    dosearch: () => dosearch(),
    dopray: () => dopray(),
    dotalk: () => dotalk(),
    donull: () => donull(),
    ddoinv: () => ddoinv(),
    wiz_level_change: () => wiz_level_change(),
    wiz_wish: () => wiz_wish(),
    wiz_level_tele: () => wiz_level_tele(),
    doride: () => doride(),
    dovspell: () => dovspell(),
    dodiscovered: () => dodiscovered(),
    doattributes: () => doattributes(),
    docast: () => docast(),
    wiz_genesis: () => wiz_genesis(),
    dodrop: () => dodrop(),
    dozap: () => dozap(),
    docallcmd: () => docallcmd(),
    doloot: () => doloot(),
    dofire: () => dofire(),
    doswapweapon: () => doswapweapon(),
    dowieldquiver: () => dowieldquiver(),
    doapply: () => doapply(),
    dorub: () => dorub(),
    doeat: () => doeat(),
    dowear: () => dowear(),
    doputon: () => doputon(),
    dodrink: () => dodrink(),
    dolook: () => dolook(),
};
/* C ref: cmd.c do_move_<dir>(), do_run_<dir>(), do_rush_<dir>() */
["west", "northwest", "north", "northeast", "east", "southeast", "south",
 "southwest"].forEach((name, dir) => {
    cmd_funcs[`do_move_${name}`] = () => { set_move_cmd(dir, 0); return ECMD_TIME; };
    cmd_funcs[`do_run_${name}`] = () => { set_move_cmd(dir, 1); return ECMD_TIME; };
    cmd_funcs[`do_rush_${name}`] = () => { set_move_cmd(dir, 3); return ECMD_TIME; };
});

// C ref: wizcmds.c wiz_level_tele()
async function wiz_level_tele() {
    if (game.flags?.debug)
        await level_tele();
    else
        await pline(unavailcmd("wizlevelport"));
    return ECMD_OK;
}

// C ref: cmd.c doextcmd() -- here is the main command dispatcher for
// the extended commands
async function doextcmd() {
    let idx, retval, func;

    /* keep repeating until we don't run help or quit */
    do {
        idx = await tty_get_ext_cmd();
        if (idx < 0)
            return 0; /* ECMD_OK: quit */

        func = extcmdlist[idx].ef_funct;
        if (!(await can_do_extcmd(extcmdlist[idx])))
            return ECMD_OK;
        /* iflags.menu_requested: the m prefix isn't ported yet */
        if (!cmd_funcs[func]) {
            /* the command itself is not ported yet; no time passes */
            return ECMD_OK;
        }
        retval = await cmd_funcs[func]();
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
import { COLNO, ROWNO, xdir, ydir, zdir } from './const.js';
import { PM_GRID_BUG } from './monsters.js';

/* C ref: cmd.c dirchars[] for number_pad off (sdir): DIR_W .. DIR_SW,
   then DIR_DOWN '>' and DIR_UP '<' */
const sdir = "hykulnjb><";
const N_DIRS = 8;
/* C ref: cmd.c move_funcs[][] -- walk, run and rush per direction */
const move_dirnames = ["west", "northwest", "north", "northeast", "east",
                       "southeast", "south", "southwest"];

/* C ref: cmd.c Cmd.commands[] (struct Cmd_bind list) -- key -> extcmdlist
   entry; built like commands_init() then reset_commands(TRUE) with
   number_pad off; a BIND= option isn't applied yet */
let cmd_bindings = null;

function bind_key_txt(map, key, txt) {
    const ec = extcmdlist.find(e => e.ef_txt === txt);
    if (ec)
        map.set(key & 0xff, ec);
}

function bind_key_fn(map, key, fn) {
    const ec = extcmdlist.find(e => e.ef_funct === fn);
    if (ec)
        map.set(key & 0xff, ec);
}

// C ref: cmd.c commands_init() + reset_commands(TRUE)
function commands_init() {
    const map = new Map();
    const C = (c) => (0x1f & c.charCodeAt(0));
    const M = (c) => (0x80 | c.charCodeAt(0));

    for (const ec of extcmdlist)
        if (ec.key)
            map.set(ec.key & 0xff, ec); /* cmdbind_add() */
    /* number_pad bindings, overridden below for the !number_pad keys */
    bind_key_txt(map, C('l'), "redraw");
    bind_key_txt(map, 'h'.charCodeAt(0), "help");
    bind_key_txt(map, 'j'.charCodeAt(0), "jump");
    bind_key_txt(map, 'k'.charCodeAt(0), "kick");
    bind_key_txt(map, 'l'.charCodeAt(0), "loot");
    bind_key_txt(map, C('n'), "annotate");
    bind_key_txt(map, 'N'.charCodeAt(0), "name");
    bind_key_txt(map, 'u'.charCodeAt(0), "untrap");
    bind_key_txt(map, '5'.charCodeAt(0), "run");
    bind_key_txt(map, M('5'), "rush");
    bind_key_txt(map, '-'.charCodeAt(0), "fight");
    /* alt keys: */
    bind_key_txt(map, M('O'), "overview");
    bind_key_txt(map, M('2'), "twoweapon");
    bind_key_txt(map, M('N'), "name");

    /* reset_commands(): back up and remove the keys overwritten by the
       movement keys, then bind the new keys to movement commands */
    for (let dir = 0; dir < N_DIRS; dir++) {
        const di = sdir.charCodeAt(dir);
        map.delete(di);
        map.delete(highc(sdir[dir]).charCodeAt(0));
        map.delete(di & 0x1f);
    }
    for (let i = 0; i < N_DIRS; i++) {
        const di = sdir[i];
        bind_key_fn(map, di.charCodeAt(0), `do_move_${move_dirnames[i]}`);
        bind_key_fn(map, highc(di).charCodeAt(0), `do_run_${move_dirnames[i]}`);
        bind_key_fn(map, di.charCodeAt(0) & 0x1f, `do_rush_${move_dirnames[i]}`);
    }
    /* update_rest_on_space(): rest_on_space is off */
    return map;
}

// C ref: cmd.c cmdbind_get()
function cmdbind_get(key) {
    if (!cmd_bindings)
        cmd_bindings = commands_init();
    return cmd_bindings.get(key & 0xff) || null;
}

// C ref: hacklib.c visctrl()
function visctrl(c) {
    let ccc = '';
    if (c & 0o200)
        ccc += 'M-';
    c &= 0o177;
    if (c < 0o40)
        ccc += '^' + String.fromCharCode(c | 0o100); /* letter */
    else if (c === 0o177)
        ccc += '^' + String.fromCharCode(c & ~0o100); /* '?' */
    else
        ccc += String.fromCharCode(c); /* printable character */
    return ccc;
}

// C ref: cmd.c reset_cmd_vars()
function reset_cmd_vars(reset_cmdq) {
    const ctx = game.context;
    ctx.run = 0;
    ctx.nopick = ctx.forcefight = 0;
    ctx.move = ctx.mv = 0;
    game.domove_attempting = 0;
    game.multi = 0;
    game.iflags.menu_requested = false;
    ctx.travel = ctx.travel1 = 0;
    /* travelmap: travel isn't ported */
    if (reset_cmdq)
        game.cmdq = []; /* cmdq_clear(CQ_CANNED); cmdq_clear(CQ_REPEAT) */
}

const unavailcmd = (txt) => `Unavailable command '${txt}'.`;

// C ref: cmd.c can_do_extcmd() -- the Lua NHCB_CMD_BEFORE callback isn't
// ported (only the tutorial registers one)
async function can_do_extcmd(extcmd) {
    const ecflags = extcmd.flags;

    if (!game.flags?.debug && (ecflags & WIZMODECMD)) {
        await pline(unavailcmd(extcmd.ef_txt));
        return false;
    } else if (game.u.uburied && !(ecflags & IFBURIED)) {
        await You_cant("do that while you are buried!");
        return false;
    }
    return true;
}

// C ref: cmd.c rhack() -- the end of the command: what the ECMD_* result
// does to context.move
function rhack_result(res, func) {
    /* it is possible to have a result of (ECMD_TIME|ECMD_CANCEL) */
    if ((res & (ECMD_CANCEL | ECMD_FAIL)) !== 0) {
        /* command was canceled by user, maybe they declined to
           pick an object to act on, or command failed to finish */
        reset_cmd_vars(true);
    } else if ((res & (ECMD_OK | ECMD_TIME)) === ECMD_OK) {
        reset_cmd_vars(game.multi < 0);
    }
    /* reset_cmd_vars() sets context.move to False so we might
       need to change it [back] to True */
    if ((res & ECMD_TIME) !== 0) {
        game.context.move = 1;
        if (func !== "dokick") {
            /* hero did something else than kicking a location;
               reset the location, so pets don't avoid it */
            game.kickedloc = { x: 0, y: 0 };
        }
    }
}

// C ref: cmd.c rhack — main command dispatcher
export async function rhack(key) {
    const firsttime = (key === 0);
    let cmdq_ec = null;

    if (key === 0 && game.cmdq?.length) {
        /* C ref: cmd.c rhack() -- a queued (CQ_CANNED) command from
           itemactions_pushkeys() runs before reading the keyboard */
        const cmdq = game.cmdq.shift();
        if (cmdq.typ === 'ec')
            cmdq_ec = extcmdlist.find(e => e.ef_funct === cmdq.fn) || null;
        else
            key = cmdq.key.charCodeAt(0);
    } else if (key === 0) {
        key = await parse();
    }

    if (!cmdq_ec) {
        /* if there's no command, there's nothing to do except reset */
        if (!key || key === 0o377 || key === 0x1b) {
            /* nhbell() for a non-ESC key: no sound */
            reset_cmd_vars(true);
            return;
        }
    }

    /* handle most movement commands */
    game.context.travel = game.context.travel1 = 0;
    const tlist = cmdq_ec || cmdbind_get(key);

    if (tlist) {
        let res;
        const func = tlist.ef_funct;
        if (!(await can_do_extcmd(tlist))) {
            /* can_do_extcmd() already gave a message */
            reset_cmd_vars(true);
            res = ECMD_OK;
        } else if (tlist.flags & PREFIXCMD) {
            /* the F, m, g and G prefixes (and their next command) are
               not ported yet: nothing happens */
            game.context.move = 0;
            return;
        } else {
            const fn = cmd_funcs[func];
            if (!fn) {
                /* the command itself is not ported yet: nothing happens,
                   and any keys queued for it go with it */
                if (cmdq_ec)
                    game.cmdq = [];
                game.context.move = 0;
                return;
            }
            res = await fn();
            if ((tlist.flags & MOVEMENTCMD) && game.domove_attempting) {
                if (((game.domove_attempting & (DOMOVE_RUSH | DOMOVE_WALK)) !== 0)
                    && !game.context.travel && !dxdy_moveok()) {
                    /* trying to move diagonally as a grid bug */
                    await You_cant("get there from here...");
                    reset_cmd_vars(true);
                    return;
                } else if ((game.domove_attempting & DOMOVE_WALK) !== 0) {
                    if (game.multi)
                        game.context.mv = 1;
                    await domove();
                    game.context.forcefight = 0;
                    game.iflags.menu_requested = false;
                    return;
                } else if ((game.domove_attempting & DOMOVE_RUSH) !== 0) {
                    if (firsttime) {
                        if (!game.multi)
                            game.multi = Math.max(COLNO, ROWNO);
                        game.u.last_str_turn = 0;
                    }
                    game.context.mv = 1;
                    await domove();
                    game.iflags.menu_requested = false;
                    return;
                }
            }
        }
        rhack_result(res, func);
        return;
    }

    /* if we reach here, cmd wasn't found in cmdlist[] */
    await pline(`Unknown command '${visctrl(key)}'.`); /* custompline(SUPPRESS_HISTORY) */
    game.cmdq = []; /* cmdq_clear(CQ_CANNED); cmdq_clear(CQ_REPEAT) */
    /* didn't move */
    game.context.move = 0;
    game.multi = 0;
}

// C ref: cmd.c parse() -- read the command key; with number_pad off a
// count prefix (get_count()) isn't ported yet, so digits are commands
async function parse() {
    game.iflags.in_parse = true;
    game.command_count = 0;
    game.context.move = 1; /* assume next command will take game time */
    await flush_screen(1); /* Flush screen buffer. Put the cursor on the hero. */

    const foo = await nhgetch();
    game.last_command_count = game.command_count;
    if (foo === 0x1b) { /* esc cancels count (TH) */
        tty_clear_nhwindow(game.WIN_MESSAGE);
        game.command_count = 0;
        game.last_command_count = 0;
    }
    game.multi = game.command_count;
    if (game.multi)
        game.multi--;

    game.cmd_key = foo;
    tty_clear_nhwindow(game.WIN_MESSAGE);

    game.iflags.in_parse = false;
    return game.cmd_key;
}

// C ref: cmd.c set_move_cmd()
function set_move_cmd(dir, run) {
    const u = game.u;
    u.dz = zdir[dir];
    u.dx = xdir[dir];
    u.dy = ydir[dir];
    /* #reqmenu -prefix disables autopickup during movement */
    if (game.iflags.menu_requested)
        game.context.nopick = 1;
    game.context.travel = game.context.travel1 = 0;
    if (!game.domove_attempting && !u.dz) {
        game.context.run = run;
        game.domove_attempting |= (!run ? DOMOVE_WALK : DOMOVE_RUSH);
    }
}

/* C ref: cmd.c quitchars[] */
const quitchars = " \r\n\x1b";
/* C ref: cmd.c Cmd.dirchars[] (number_pad off) */
const dirchars = sdir;

// C ref: cmd.c movecmd() -- mode MV_ANY: a walk, run or rush key
// (move_funcs[][]) sets u.dx, u.dy, u.dz; returns !u.dz for a move
function movecmd(sym) {
    const u = game.u;
    let d = -1; /* DIR_ERR */
    const c = String.fromCharCode(sym);
    const lc = c.toLowerCase();

    if (dirchars.includes(c))
        d = dirchars.indexOf(c);                 /* MV_WALK, '>' and '<' */
    else if ('hykulnjb'.includes(lc))
        d = dirchars.indexOf(lc);                /* MV_RUN: shifted */
    else if (sym >= 1 && sym <= 26
             && 'hykulnjb'.includes(String.fromCharCode(sym + 96)))
        d = dirchars.indexOf(String.fromCharCode(sym + 96)); /* MV_RUSH: ^dir */

    if (d !== -1) {
        u.dx = xdir[d];
        u.dy = ydir[d];
        u.dz = zdir[d];
        return !u.dz;
    }
    u.dz = 0;
    return 0;
}

// C ref: cmd.c dxdy_moveok()
function dxdy_moveok() {
    const u = game.u;
    if (u.dx && u.dy && u.umonnum === PM_GRID_BUG) /* NODIAG(u.umonnum) */
        return false;
    return true;
}

// C ref: cmd.c cmd_from_func() -- a key bound to the command
function cmd_from_func(fn) {
    if (!cmd_bindings)
        cmd_bindings = commands_init();
    for (const [key, ec] of cmd_bindings)
        if (ec.ef_funct === fn)
            return key;
    return 0;
}

// C ref: cmd.c show_direction_keys()
function show_direction_keys(win, centerchar, nodiag) {
    let buf;
    const k = (fn) => visctrl(cmd_from_func(fn));

    if (!centerchar)
        centerchar = ' ';

    if (nodiag) {
        buf = `             ${k("do_move_north")}   `;
        tty_putstr(win, 0, buf);
        tty_putstr(win, 0, "             |   ");
        buf = `          ${k("do_move_west")}- ${centerchar} -${k("do_move_east")}`;
        tty_putstr(win, 0, buf);
        tty_putstr(win, 0, "             |   ");
        buf = `             ${k("do_move_south")}   `;
        tty_putstr(win, 0, buf);
    } else {
        buf = `          ${k("do_move_northwest")}  ${k("do_move_north")}  ${k("do_move_northeast")}`;
        tty_putstr(win, 0, buf);
        tty_putstr(win, 0, "           \\ | / ");
        buf = `          ${k("do_move_west")}- ${centerchar} -${k("do_move_east")}`;
        tty_putstr(win, 0, buf);
        tty_putstr(win, 0, "           / | \\ ");
        buf = `          ${k("do_move_southwest")}  ${k("do_move_south")}  ${k("do_move_southeast")}`;
        tty_putstr(win, 0, buf);
    }
}

// C ref: cmd.c help_dir() -- explain choices if player has asked for
// getdir() help or has given an invalid direction; spkey is always ESC
// here (the prefix-key handling is #if 0 in C too)
async function help_dir(sym, spkey, msg) {
    const wiz_only_list = "EFGIVW";
    const prefixhandling = (spkey !== 0x1b);
    const dothat = "do that";
    const nodiag = (game.u.umonnum === PM_GRID_BUG); /* NODIAG(u.umonnum) */
    let buf = '';

    const win = tty_create_nhwindow(NHW_TEXT);

    if (msg) {
        buf = `cmdassist: ${msg}`;
        tty_putstr(win, 0, buf);
        tty_putstr(win, 0, "");
    }

    if (!prefixhandling && sym && (/[@A-Za-z]/.test(String.fromCharCode(sym))
                                   || sym === '['.charCodeAt(0))) {
        /* '[': old 'cmdhelp' showed ESC as ^[ */
        /* dowhatdoes_core(): key2extcmddesc() needs the command
           descriptions, which aren't in func_tab.js yet */
        void wiz_only_list;
        throw new Error('help_dir(): dowhatdoes_core() not ported yet');
    }

    buf = `Valid direction keys${prefixhandling ? " to " : ""}${prefixhandling ? dothat : ""}${nodiag ? " in your current form" : ""} are:`;
    tty_putstr(win, 0, buf);
    show_direction_keys(win, !prefixhandling ? '.' : ' ', nodiag);

    if (!prefixhandling) {
        tty_putstr(win, 0, "");
        tty_putstr(win, 0, "          <  up");
        tty_putstr(win, 0, "          >  down");
        /* NHKF_GETDIR_SELF is '.' with number_pad off */
        buf = `       ${visctrl('.'.charCodeAt(0)).padStart(4)}  direct at yourself`;
        tty_putstr(win, 0, buf);
    }

    if (msg) {
        /* non-null msg means that this wasn't an explicit user request */
        tty_putstr(win, 0, "");
        tty_putstr(win, 0,
                   "(Suppress this message with !cmdassist in config file.)");
    }
    await tty_display_nhwindow(win, false);
    tty_destroy_nhwindow(win);
    return true;
}

// C ref: cmd.c getdir() -- the direction prompt; the command queue and
// the mouse ('_') aren't ported yet
// C ref: cmd.c get_adjacent_loc() -- prompts the user for a direction and
// returns the adjacent location in cc
export async function get_adjacent_loc(prompt, emsg, x, y, cc) {
    if (!(await getdir(prompt))) {
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

export async function getdir(s) {
    const u = game.u;
    let dirsym, is_mov;

    /* cmdq_pop(): queued directions aren't ported */
    dirsym = await tty_yn_function((s && s[0] !== '^') ? s : "In what direction?",
                                   null, '\0');
    if (typeof dirsym === 'string')
        dirsym = dirsym.charCodeAt(0);
    /* remove the prompt string so caller won't have to */
    tty_clear_nhwindow(game.WIN_MESSAGE);

    if (dirsym === 0x12) /* redraw_cmd(): ^R */
        throw new Error('getdir(): ^R redraw not ported yet');
    /* cmdq_add_key(CQ_REPEAT, dirsym): ^A repeat isn't ported */

    const ch = String.fromCharCode(dirsym);
    if (ch === '.' || ch === 's') { /* NHKF_GETDIR_SELF, NHKF_GETDIR_SELF2 */
        u.dx = u.dy = u.dz = 0;
    } else if (ch === '_') { /* NHKF_GETDIR_MOUSE */
        throw new Error('getdir(): getpos() not ported yet');
    } else if (!(is_mov = movecmd(dirsym)) && !u.dz) {
        let did_help = false, help_requested;

        if (!quitchars.includes(ch)) {
            help_requested = (ch === '?'); /* NHKF_GETDIR_HELP */
            if (help_requested || game.iflags.cmdassist !== false) {
                did_help = await help_dir((s && s[0] === '^') ? dirsym : 0,
                                          0x1b, /* Cmd.spkeys[NHKF_ESC] */
                                          help_requested ? null
                                          : "Invalid direction key!");
                if (help_requested)
                    return await getdir(s); /* goto retry */
            }
            if (!did_help)
                await pline("What a strange direction!");
        }
        return 0;
    } else if (is_mov && !dxdy_moveok()) {
        await pline("You can't orient yourself that direction."); /* You_cant() */
        return 0;
    }
    if (!u.dz)
        confdir(false);
    return 1;
}
