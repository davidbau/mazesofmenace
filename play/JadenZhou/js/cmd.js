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
         MOVEMENTCMD, CMD_PARAM, CMD_M_PREFIX, CMD_gGF_PREFIX } from './func_tab.js';
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
import { dodrop, dodown, doup } from './do.js';
import { dozap } from './zap.js';
import { docallcmd } from './do_name.js';
import { doloot } from './pickup.js';
import { dopickup } from './hack.js';
import { Never_mind, isok } from './const.js';
import { dofire, dothrow } from './dothrow.js';
import { dokick } from './dokick.js';
import { doswapweapon, dowieldquiver, dowield, dotwoweapon } from './wield.js';
import { doapply, dorub, dojump } from './apply.js';
import { doeat } from './eat.js';
import { dowear, doputon, dotakeoff, ia_dotakeoff } from './do_wear.js';
import { dodrink } from './potion.js';
import { dotogglepickup, doset_simple, doset } from './options.js';
import { doread } from './read.js';
import { dohelp } from './pager.js';
import { doopen } from './lock.js';

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
    dodown: () => dodown(),
    doup: () => doup(),
    dozap: () => dozap(),
    docallcmd: () => docallcmd(),
    doloot: () => doloot(),
    dofire: () => dofire(),
    dothrow: () => dothrow(),
    dokick: () => dokick(),
    doswapweapon: () => doswapweapon(),
    dowieldquiver: () => dowieldquiver(),
    doapply: () => doapply(),
    dorub: () => dorub(),
    doeat: () => doeat(),
    dowear: () => dowear(),
    doputon: () => doputon(),
    dotakeoff: () => dotakeoff(),
    ia_dotakeoff: () => ia_dotakeoff(),
    dodrink: () => dodrink(),
    dolook: () => dolook(),
    doread: () => doread(),
    dowield: () => dowield(),
    dotwoweapon: () => dotwoweapon(),
    dohelp: () => dohelp(),
    doopen: () => doopen(),
    dojump: () => dojump(),
    do_reqmenu: () => do_reqmenu(),
    do_rush: () => do_rush(),
    do_run: () => do_run(),
    do_fight: () => do_fight(),
    dotogglepickup: () => dotogglepickup(),
    doset_simple: () => doset_simple(),
    doset: () => doset(),
    dopickup: () => dopickup(),
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
        if (game.iflags.menu_requested
            && !accept_menu_prefix(extcmdlist[idx])) {
            await pline(`'${visctrl(cmd_from_func("do_reqmenu"))}' prefix has no effect for the ${extcmdlist[idx].ef_txt} command.`);
            game.iflags.menu_requested = false;
        }
        /* tell rhack() what command is actually executing */
        game.ext_tlist = extcmdlist[idx];

        if (!cmd_funcs[func])
            throw new Error(`doextcmd(): unported command ${func} not ported yet`);
        retval = await cmd_funcs[func]();
    } while (func === "doextlist");

    return retval;
}

// C ref: cmd.c accept_menu_prefix()
function accept_menu_prefix(ec) {
    return (ec && ((ec.flags & CMD_M_PREFIX) !== 0));
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

/* C ref: cmd.c gc.Cmd.cmdbinds (struct Cmd_bind list) -- key -> extcmdlist
   entry, kept per game as game.Cmd.cmdbinds (a Map); built by
   reset_commands(TRUE) (commands_init(), then the !number_pad movement
   keys), then BIND= options add to it via bind_key() */

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

// C ref: cmd.c cmdbind_add() -- bind->userbind is kept in the
// game.Cmd.userbinds set of keys
function cmdbind_add(key, extcmd, user) {
    key &= 0xff;
    if (!key)
        return;
    if (!extcmd) {
        game.Cmd.cmdbinds.delete(key); /* cmdbind_remove(key) */
        game.Cmd.userbinds.delete(key);
        return;
    }
    game.Cmd.cmdbinds.set(key, extcmd);
    if (user)
        game.Cmd.userbinds.add(key);
    else
        game.Cmd.userbinds.delete(key);
}

// C ref: cmd.c count_bind_keys()
export function count_bind_keys() {
    const keys = new Set();
    let nbinds = 0;

    if (!game.Cmd)
        reset_commands(true); /* initoptions_init() */
    /* commands bound to different key */
    for (const [key, cmd] of game.Cmd.cmdbinds) {
        keys.add(key);
        if (game.Cmd.userbinds.has(key) && cmd && (cmd.key & 0xff) !== key)
            nbinds++;
    }

    /* commands which should be bound to a key, but aren't */
    for (const ec of extcmdlist)
        if (ec.key && !keys.has(ec.key & 0xff))
            nbinds++;

    return nbinds;
}

// C ref: cmd.c bind_key()
export function bind_key(key, command, user) {
    let buf, p = null, lastp;

    /* special case: "nothing" is reserved for unbinding */
    if (!strcmpi(command, "nothing")) {
        game.Cmd.cmdbinds.delete(key & 0xff); /* cmdbind_remove(key) */
        game.Cmd.userbinds.delete(key & 0xff);
        return true;
    }

    /* copy command to buf for modification */
    buf = command;

    /* does buf have a parameter in parenthesis? */
    if ((p = buf.indexOf('(')) >= 0
        && (lastp = buf.lastIndexOf(')')) >= 0
        && (lastp > p)) {
        const param = buf.slice(p + 1, lastp);
        buf = buf.slice(0, p);
        /* p points to the parameter */
        p = param;
    } else {
        p = null;
    }

    for (const extcmd of extcmdlist) {
        if (strcmpi(buf, extcmd.ef_txt))
            continue;
        if ((extcmd.flags & INTERNALCMD) !== 0)
            continue;
        cmdbind_add(key, extcmd, user);

        if ((extcmd.flags & CMD_PARAM) !== 0)
            throw new Error('bind_key(): commands with a parameter not ported yet');
        else if (p && p.length > 0)
            throw new Error('bind_key(): config_error_add() not ported yet');
        return true;
    }

    return false;
}

// C ref: cmd.c reset_commands() -- the initial call (initial == TRUE)
// from initoptions_init(), with number_pad off
export function reset_commands(initial) {
    if (!initial)
        throw new Error('reset_commands(): changing number_pad not ported yet');
    game.Cmd = { cmdbinds: commands_init(), userbinds: new Set() };
}

// C ref: cmd.c commands_init() + the rest of reset_commands(TRUE)
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
    if (!game.Cmd)
        reset_commands(true); /* initoptions_init() */
    return game.Cmd.cmdbinds.get(key & 0xff) || null;
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

// C ref: cmd.c rhack — main command dispatcher; a prefix command (m, F,
// g, G) loops back to got_prefix_input for the command it modifies
export async function rhack(key) {
    const firsttime = (key === 0);
    let cmdq_ec = null, prefix_seen = null;
    let was_m_prefix = false;
    let func = null; /* dummyfunction */
    const ctx = game.context;

    game.iflags.menu_requested = false;
    ctx.nopick = 0;
    for (;;) { /* got_prefix_input: */
        if (game.cmdq?.length) {
            /* doing queued (CQ_CANNED) commands, e.g. from
               itemactions_pushkeys() */
            const cq = game.cmdq.shift(); /* cmdq_pop() */
            if (cq.typ === 'ec'
                && (cmdq_ec = extcmdlist.find(e => e.ef_funct === cq.fn) || null))
                ; /* goto do_cmdq_extcmd */
            else
                key = (cq.typ === 'key') ? cq.key.charCodeAt(0) : 0;
        } else if (firsttime) {
            key = await parse();
            /* parse() pushed a cmd but didn't return any key */
            if (!key && game.cmdq?.length)
                continue; /* goto got_prefix_input */
        }

        if (!cmdq_ec) {
            /* if there's no command, there's nothing to do except reset */
            if (!key || key === 0o377 || key === 0x1b) {
                /* nhbell() for a non-ESC key: no sound */
                reset_cmd_vars(true);
                return;
            }

            /* handle most movement commands */
            ctx.travel = ctx.travel1 = 0;
        }
        /* do_cmdq_extcmd: */
        let tlist = cmdq_ec || cmdbind_get(key);

        /* current - use key to directly index cmdlist array */
        if (!tlist)
            break; /* bad_command */

        let res;
        if (!(await can_do_extcmd(tlist))) {
            /* can_do_extcmd() already gave a message */
            reset_cmd_vars(true);
            res = ECMD_OK;
        } else if (prefix_seen && !(tlist.flags & PREFIXCMD)
                   && !(tlist.flags & (was_m_prefix ? CMD_M_PREFIX
                                                    : CMD_gGF_PREFIX))) {
            const pfxidx = cmd_from_func(prefix_seen.ef_funct);
            const which = (pfxidx !== 0) ? visctrl(pfxidx)
                          : (prefix_seen.ef_funct === "do_reqmenu")
                            ? "move-no-pickup or request-menu"
                            : prefix_seen.ef_txt;

            /*
             * We got a prefix previously and looped for another
             * command instead of returning, but the command we got
             * doesn't accept a prefix.  The feedback here supersedes
             * the former call to help_dir() (for 'bad_command' below).
             */
            if (was_m_prefix) {
                /* custompline(SUPPRESS_HISTORY, ...) */
                await pline(`The ${tlist.ef_txt} command does not accept '${which}' prefix.`);
            } else {
                const ch = tlist.key;
                const up = (ch === 0x3c || tlist.ef_funct === "doup"),
                    down = (ch === 0x3e || tlist.ef_funct === "dodown");

                await pline(`The '${which}' prefix should be followed by a movement command${(up || down) ? " other than up or down" : ""}.`);
            }
            res = ECMD_FAIL;
            prefix_seen = null;
        } else {
            func = tlist.ef_funct;
            const fn = cmd_funcs[func];
            if (!fn) {
                throw new Error(tlist.flags & PREFIXCMD
                    ? `rhack(): unported command prefix ${func} not ported yet`
                    : `rhack(): unported command ${func} not ported yet`);
            }
            /* tlist->f_text && !occupation && multi: set_occupation()
               isn't used by any command ported so far */
            game.ext_tlist = null;
            /* cmdq_add_ec(CQ_REPEAT, ...): the ^A repeat isn't ported */

            res = await fn(); /* perform the command */
            /* if 'func' is doextcmd(), 'tlist' is for Cmd.commands['#']
               rather than for the command that doextcmd() just ran;
               doextcmd() notifies us what that was via ext_tlist;
               other commands leave it Null */
            if (game.ext_tlist) {
                tlist = game.ext_tlist;
                game.ext_tlist = null;
            }

            if ((tlist.flags & PREFIXCMD) !== 0) {
                /* it was a prefix command, mark and get another cmd */
                if ((res & ECMD_CANCEL) !== 0) {
                    /* prefix commands cancel if pressed twice */
                    reset_cmd_vars(true);
                    return;
                }
                prefix_seen = tlist;
                cmdq_ec = null;
                if (func === "do_reqmenu")
                    was_m_prefix = true;
                continue; /* goto got_prefix_input */
            } else if (!(tlist.flags & MOVEMENTCMD)
                       && game.domove_attempting) {
                /* not a movement command, but a move prefix earlier? */
                ; /* just do nothing */
            } else if (((game.domove_attempting
                         & (DOMOVE_RUSH | DOMOVE_WALK)) !== 0)
                       && !ctx.travel && !dxdy_moveok()) {
                /* trying to move diagonally as a grid bug */
                await You_cant("get there from here...");
                reset_cmd_vars(true);
                return;
            } else if ((game.domove_attempting & DOMOVE_WALK) !== 0) {
                if (game.multi)
                    ctx.mv = 1;
                await domove();
                ctx.forcefight = 0;
                game.iflags.menu_requested = false;
                return;
            } else if ((game.domove_attempting & DOMOVE_RUSH) !== 0) {
                if (firsttime) {
                    if (!game.multi)
                        game.multi = Math.max(COLNO, ROWNO);
                    game.u.last_str_turn = 0;
                }
                ctx.mv = 1;
                await domove();
                game.iflags.menu_requested = false;
                return;
            }
            prefix_seen = null;
        }
        rhack_result(res, func);
        return;
    }

    /* if we reach here, cmd wasn't found in cmdlist[] */
    await pline(`Unknown command '${visctrl(key)}'.`); /* custompline(SUPPRESS_HISTORY) */
    game.cmdq = []; /* cmdq_clear(CQ_CANNED); cmdq_clear(CQ_REPEAT) */
    /* didn't move */
    ctx.move = 0;
    game.multi = 0;
}

// C ref: cmd.c do_reqmenu() -- #reqmenu, prefix command to modify some
// others
async function do_reqmenu() {
    if (game.iflags.menu_requested) {
        /* Norep() */
        await pline(`Double ${visctrl(cmd_from_func("do_reqmenu"))} prefix, canceled.`);
        game.iflags.menu_requested = false;
        return ECMD_CANCEL;
    }

    game.iflags.menu_requested = true;
    return ECMD_OK;
}

// C ref: cmd.c do_rush() -- #rush
async function do_rush() {
    if ((game.domove_attempting & DOMOVE_RUSH)) {
        await pline("Double rush prefix, canceled."); /* Norep() */
        game.context.run = 0;
        game.domove_attempting = 0;
        return ECMD_CANCEL;
    }

    game.context.run = 2;
    game.domove_attempting |= DOMOVE_RUSH;
    return ECMD_OK;
}

// C ref: cmd.c do_run() -- #run
async function do_run() {
    if ((game.domove_attempting & DOMOVE_RUSH)) {
        await pline("Double run prefix, canceled."); /* Norep() */
        game.context.run = 0;
        game.domove_attempting = 0;
        return ECMD_CANCEL;
    }

    game.context.run = 3;
    game.domove_attempting |= DOMOVE_RUSH;
    return ECMD_OK;
}

// C ref: cmd.c do_fight() -- #fight
async function do_fight() {
    if (game.context.forcefight) {
        await pline("Double fight prefix, canceled."); /* Norep() */
        game.context.forcefight = 0;
        game.domove_attempting = 0;
        return ECMD_CANCEL;
    }

    game.context.forcefight = 1;
    game.domove_attempting |= DOMOVE_WALK;
    return ECMD_OK;
}

/* C ref: hack.h GC_* get_count() flags */
const GC_NOFLAGS = 0, GC_SAVEHIST = 1, GC_CONDHIST = 2, GC_ECHOFIRST = 4;
/* C ref: global.h LARGEST_INT; integer.h AppendLongDigit() overflow
   limit -- the recorder's 64-bit LONG_MAX is beyond what a JS number
   holds exactly, but counts are capped by maxcount (LARGEST_INT) long
   before that matters */
const LARGEST_INT = 32767;
const LONG_MAX = Number.MAX_SAFE_INTEGER;

// C ref: cmd.c get_count()
/* read a count (digits) and return the next non-digit key; the count
   goes into game[countfield] (C's 'count' output pointer) */
export async function get_count(allowchars, /* what comes after digits; if Null, anything */
                                inkey,      /* if caller already got first digit, this is it */
                                maxcount,   /* if user tries to enter a bigger count, use this */
                                countfield, /* primary output: game[countfield] */
                                gc_flags) { /* control flags: GC_SAVEHIST, GC_ECHOFIRST */
    let qbuf;
    let key;
    let cnt = 0;
    const first = inkey ? (inkey - 0x30) : 0;
    let backspaced = false, showzero = true;
    /* should "Count: 123" go into message history? */
    const historicmsg = (gc_flags & GC_SAVEHIST) !== 0,
        /* put "Count: N" into mesg hist unless N is the same as the
           [first digit] value passed in via 'inkey' */
        conditionalmsg = (gc_flags & GC_CONDHIST) !== 0,
        /* normally "Count: 12" isn't echoed until the second digit */
        echoalways = (gc_flags & GC_ECHOFIRST) !== 0;
    /* this should be done in port code so that we have erase_char
       and kill_char available; we can at least fake erase_char */
    const STANDBY_erase_char = 0o177;

    game[countfield] = 0;
    for (;;) {
        if (inkey) {
            key = inkey;
            inkey = 0;
        } else {
            key = await nhgetch(); /* readchar() */
        }

        if (key >= 0x30 && key <= 0x39) { /* digit(key) */
            const dgt = key - 0x30;

            /* cnt = (10 * cnt) + (key - '0'); */
            cnt = (cnt < Math.trunc(LONG_MAX / 10)
                   || (cnt === Math.trunc(LONG_MAX / 10) && dgt <= LONG_MAX % 10))
                  ? cnt * 10 + dgt : -1; /* AppendLongDigit() */
            if (cnt < 0)
                cnt = 0;
            else if (maxcount > 0 && cnt > maxcount)
                cnt = maxcount;
            /* if we've backed up to nothing, then typed 0, show that 0 */
            showzero = (key === 0x30);
        } else if (key === 0x08 || key === STANDBY_erase_char) {
            if (!cnt && !echoalways)
                break;
            showzero = false;
            cnt = Math.trunc(cnt / 10);
            backspaced = true;
        } else if (key === 0x1b) { /* gc.Cmd.spkeys[NHKF_ESC] */
            break;
        } else if (!allowchars || allowchars.includes(String.fromCharCode(key))) {
            game[countfield] = cnt;
            break;
        }

        if (cnt > 9 || backspaced || echoalways) {
            tty_clear_nhwindow(game.WIN_MESSAGE);
            if (backspaced && !cnt && !showzero) {
                qbuf = "Count: ";
            } else {
                qbuf = `Count: ${cnt}`;
                backspaced = false;
            }
            await pline(qbuf); /* custompline(SUPPRESS_HISTORY, "%s", qbuf) */
            /* mark_synch(): output flush only */
        }
    }

    if (historicmsg || (conditionalmsg && game[countfield] !== first))
        throw new Error('get_count(): putmsghistory() not ported yet');

    return key;
}

// C ref: cmd.c parse() -- main command input routine when not repeating
// and not executing canned commands; input comes via get_count() which
// collects repeat count if one is present and returns next non-digit to us
async function parse() {
    let foo;
    let bind;

    game.iflags.in_parse = true;
    game.command_count = 0;
    game.context.move = 1; /* assume next command will take game time */
    await flush_screen(1); /* Flush screen buffer. Put the cursor on the hero. */

    /* program_state.input_state = commandInp: 'altmeta' isn't ported */

    /* !gc.Cmd.num_pad: number_pad is off */
    foo = await get_count(null, 0, LARGEST_INT, 'command_count', GC_NOFLAGS);
    game.last_command_count = game.command_count;

    if (foo === 0x1b) { /* esc cancels count (TH) */
        tty_clear_nhwindow(game.WIN_MESSAGE);
        game.command_count = 0;
        game.last_command_count = 0;
    /* gi.in_doagain: the ^A do-again command isn't ported */
    } else if (foo && (bind = cmdbind_get(foo & 0xff)) !== null
               /* these shouldn't go into the do-again buffer */
               && (bind.ef_funct === "do_repeat"
                   || bind.ef_funct === "doprev_message"
                   /* this one might get put into the do-again buffer but
                      only if the interface code tells the core to do it */
                   || bind.ef_funct === "doextcmd")) {
        /* gc.command_count will be set again when we
           re-enter with gi.in_doagain set true */
        game.command_count = game.last_command_count;
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
export function set_move_cmd(dir, run) {
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

/* C ref: hack.h enum movemodes */
export const MV_ANY = -1, MV_WALK = 0, MV_RUN = 1, MV_RUSH = 2;

// C ref: cmd.c movecmd() with a mode -- is sym bound to the move_funcs[][]
// command of that mode? sets u.dx, u.dy, u.dz; returns !u.dz for a move
export function movecmd_mode(sym, mode) {
    const u = game.u;
    let d = -1; /* DIR_ERR */
    const bind = cmdbind_get(sym);

    if (bind) {
        const fnc = bind.ef_funct;
        const modename = ["move", "run", "rush"];

        for (d = N_DIRS + 2 - 1; d > -1; d--) {
            if (d >= N_DIRS) { /* dodown, doup */
                if (fnc === (d === N_DIRS ? "dodown" : "doup"))
                    break;
                continue;
            }
            if (mode === MV_ANY
                ? modename.some(m => fnc === `do_${m}_${move_dirnames[d]}`)
                : fnc === `do_${modename[mode]}_${move_dirnames[d]}`)
                break;
        }
    }

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

// C ref: cmd.c cmd_from_func() -- a key bound to the command; C's
// cmdbinds list has the newest binding first, which is the reverse of
// the Map's insertion order
export function cmd_from_func(fn) {
    let ret = 0;

    if (!game.Cmd)
        reset_commands(true); /* initoptions_init() */
    const binds = [...game.Cmd.cmdbinds].reverse();
    for (const [i, cmd] of binds) {
        /* skip space; we'll use it below as last resort if no other
           keystroke invokes space's command */
        if (i === 0x20)
            continue;
        /* skip digits if number_pad is Off; also skip '-' unless it has
           been bound to something other than what number_pad assigns */
        if (((i >= 0x30 && i <= 0x39) || (i === 0x2d && fn === "do_fight"))
            /* && !gc.Cmd.num_pad */)
            continue;

        if (cmd && cmd.ef_funct === fn) {
            if (i >= 0x20 && i <= 0x7e)
                return i;
            else {
                ret = i;
            }
        }
    }
    const bind = game.Cmd.cmdbinds.get(0x20);
    if (bind && bind.ef_funct === fn)
        return 0x20;
    return ret;
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

// C ref: cmd.c paranoid_ynq() -- the !be_paranoid cases (plain y/n or
// y/n/q queries); the "yes"/"no" getlin() query isn't ported
export async function paranoid_ynq(be_paranoid, prompt, accept_q) {
    let c = 'n'; /* default result */

    if (be_paranoid)
        throw new Error('paranoid_ynq(): paranoid_confirm "yes" query not ported yet');
    else if (accept_q)
        /* 'y', 'n', or 'q' */
        c = await tty_yn_function(prompt, "ynq", 'n'); /* ynqchars */
    else
        /* 'y' or 'n' */
        c = await tty_yn_function(prompt, "yn", 'n'); /* ynchars */
    if (c !== 'y' && (c !== 'q' || !accept_q))
        c = 'n';
    return c;
}

// C ref: cmd.c paranoid_query()
/* for paranoid_confirm:quit,die,attack,&c prompting; allows yes or n|no;
   result is True for yes; n|no and ESC yield False */
export async function paranoid_query(be_paranoid, prompt) {
    return (await paranoid_ynq(be_paranoid, prompt, false)) === 'y';
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
