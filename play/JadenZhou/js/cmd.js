// cmd.js — Command dispatch and movement.
// C ref: cmd.c rhack(), parse(), getdir(), the default key bindings
// (commands_init()/reset_commands()) and the command functions ported so
// far; hack.c domove() is in hack.js.

import { split_mon } from './potion.js';
import { dryup } from './fountain.js';
import { is_pool } from './makemon.js';
import { There } from './display.js';
import { impossible } from './hack.js';
import { nhcb_counts, nhcb_name } from './nhlua.js';
import { NHCB_CMD_BEFORE } from './const.js';
import { dobreathe } from './polyself.js';
import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { newsym, flush_screen, pline, You_cant, You } from './display.js';
import { getpos } from './getpos.js';
import { vision_recalc } from './vision.js';
import { tty_start_menu, tty_add_menu, tty_end_menu, tty_select_menu,
         add_menu_str, custompline } from './wintty.js';
import { reveal_terrain } from './detect.js';
import { NO_COLOR, ATR_NONE } from './terminal.js';
import { NHW_MENU, MENU_BEHAVE_STANDARD, MENU_ITEMFLAGS_NONE, MENU_ITEMFLAGS_SELECTED,
         PICK_ONE, TER_MAP, TER_TRP, TER_OBJ, TER_FULL } from './const.js';
import { tty_clear_nhwindow, tty_get_ext_cmd, tty_yn_function, tty_create_nhwindow,
         tty_putstr, tty_display_nhwindow, tty_destroy_nhwindow } from './wintty.js';
import { doride } from './steed.js';
import { dopray, doturn, dosacrifice } from './pray.js';
import { dotalk } from './sounds.js';
import { extcmdlist, CMD_NOT_AVAILABLE, INTERNALCMD, WIZMODECMD, AUTOCOMPLETE,
         ECM_IGNOREAC, ECM_EXACTMATCH, ECM_NO1CHARCMD, IFBURIED, PREFIXCMD,
         MOVEMENTCMD, CMD_PARAM, CMD_M_PREFIX, CMD_gGF_PREFIX,
         GENERALCMD } from './func_tab.js';
import { strcmpi, strncmpi, highc, visctrl, strstri } from './hacklib.js';
import { dosearch } from './detect.js';
import { level_tele, dotelecmd } from './teleport.js';
import { wiz_level_change, wiz_wish, wiz_identify, wiz_intrinsic, wiz_map,
         wiz_detect, wiz_polyself, wiz_where } from './wizcmds.js';
import { ddoinv, dolook, doprgold, doprwep, doprarm, doprring, dopramulet,
         doprtool, doprinuse, add_menu_heading, doorganize, adjust_split,
         dotypeinv } from './invent.js';
import { cmd_safety_prevention, nomul, domove, DOMOVE_WALK,
         DOMOVE_RUSH, confdir } from './hack.js';
import { next2u } from './const.js';
import { IS_DOOR, IS_FURNITURE, NHW_TEXT, ECMD_OK, ECMD_TIME, ECMD_CANCEL,
         ECMD_FAIL } from './const.js';
import { dovspell, docast } from './spell.js';
import { dosit } from './sit.js';
import { doinvoke } from './artifact.js';
import { donamelevel, dooverview, recalc_mapseen } from './dungeon.js';
import { authorize_explore_mode } from './sys.js';
import { dodiscovered } from './o_init.js';
import { doattributes, dogenocided, doconduct, dovanquished,
         do_gamelog } from './insight.js';
import { wiz_genesis } from './wizcmds.js';
import { dodrop, doddrop, dodown, doup, dowipe } from './do.js';
import { dozap } from './zap.js';
import { docallcmd } from './do_name.js';
import { doloot, dotip } from './pickup.js';
import { dopickup } from './hack.js';
import { Never_mind, isok, PARANOID_QUIT } from './const.js';
import { dofire, dothrow } from './dothrow.js';
import { dokick } from './dokick.js';
import { doswapweapon, dowieldquiver, dowield, dotwoweapon } from './wield.js';
import { enhance_weapon_skill } from './weapon.js';
import { doapply, dorub, dojump } from './apply.js';
import { dountrap } from './trap.js';
import { doeat } from './eat.js';
import { dowear, doputon, dotakeoff, ia_dotakeoff, doddoremarm } from './do_wear.js';
import { dodrink, dodip, aggravate } from './potion.js';
import { dopay } from './shk.js';
import { dotogglepickup, doset_simple, doset } from './options.js';
import { doread } from './read.js';
import { doengrave } from './engrave.js';
import { set_occupation } from './allmain.js';
import { dohelp, dowhatis, doquickwhatis, dowhatdoes, dowhatdoes_core,
         dohistory } from './pager.js';
import { doextversion } from './mdlib.js';
import { doopen, doforce, doclose } from './lock.js';
import { dosave } from './save.js';
import { done2 } from './end.js';
import { stairway_at, glyph_at, glyph_is_invisible, canspotmon, vobj_at,
         glyph_kind } from './display.js';
import { can_reach_floor } from './engrave.js';
import { x_monnam, mon_nam } from './do_name.js';
import { doname } from './objnam.js';
import { Is_container } from './mkobj.js';
import { num_spells } from './spell.js';
import { t_at } from './trap.js';
import { carrying } from './invent.js';
import { which_armor } from './worn.js';
import { can_saddle, m_at } from './makemon.js';
import { linedup } from './monmove.js';
import { dist2 } from './hacklib.js';
import { test_move, xytodir } from './hack.js';
import { defsyms_explanation } from './pager.js';
import { IS_FOUNTAIN, IS_SINK, IS_THRONE, IS_ALTAR, u_at, Upolyd,
         has_mgivenname, SCORR, D_CLOSED, D_LOCKED, D_ISOPEN, W_SADDLE,
         VIBRATING_SQUARE, TEST_MOVE, ARTICLE_THE,
         SUPPRESS_SADDLE } from './const.js';
import { SKELETON_KEY, LOCK_PICK, CREDIT_CARD, SADDLE, FOOD_CLASS,
         BOULDER } from './objects.js';
import { CLR_WHITE } from './terminal.js';
import { COLNO, ROWNO, xdir, ydir, zdir } from './const.js';
import { PM_GRID_BUG, mons, PM_CAVE_SPIDER, PM_GIANT_SPIDER, PM_MIND_FLAYER,
         PM_MASTER_MIND_FLAYER, PM_GREMLIN, AT_BREA, AT_SPIT, AT_GAZE, S_NYMPH,
         S_UNICORN, M1_HIDE, M1_CONCEAL, M2_JEWELS, MS_SHRIEK } from './monsters.js';
import { is_were, is_vampire, is_vampshifter } from './mondata.js';
import { show_menu_controls as show_menu_controls_cm } from './pager.js';
export { domove };

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
    done2: () => done2(),
    doorganize: () => doorganize(),
    adjust_split: () => adjust_split(),
    doextlist: () => doextlist(),
    dosearch: () => dosearch(),
    dopray: () => dopray(),
    dotalk: () => dotalk(),
    donull: () => donull(),
    ddoinv: () => ddoinv(),
    dotypeinv: () => dotypeinv(),
    wiz_level_change: () => wiz_level_change(),
    wiz_wish: () => wiz_wish(),
    wiz_level_tele: () => wiz_level_tele(),
    dotelecmd: () => dotelecmd(),
    doride: () => doride(),
    dovspell: () => dovspell(),
    dodiscovered: () => dodiscovered(),
    doattributes: () => doattributes(),
    doconduct: () => doconduct(),
    dovanquished: () => dovanquished(),
    do_gamelog: () => do_gamelog(),
    docast: () => docast(),
    wiz_genesis: () => wiz_genesis(),
    dodrop: () => dodrop(),
    doddrop: () => doddrop(),
    dotravel: () => dotravel(),
    dotravel_target: () => dotravel_target(),
    dodown: () => dodown(),
    doup: () => doup(),
    dozap: () => dozap(),
    docallcmd: () => docallcmd(),
    doloot: () => doloot(),
    dotip: () => dotip(),
    dofire: () => dofire(),
    dothrow: () => dothrow(),
    dokick: () => dokick(),
    doswapweapon: () => doswapweapon(),
    dowieldquiver: () => dowieldquiver(),
    doapply: () => doapply(),
    dorub: () => dorub(),
    dountrap: () => dountrap(),
    doeat: () => doeat(),
    dowear: () => dowear(),
    doputon: () => doputon(),
    dotakeoff: () => dotakeoff(),
    ia_dotakeoff: () => ia_dotakeoff(),
    doddoremarm: () => doddoremarm(),
    dodrink: () => dodrink(),
    dopay: () => dopay(),
    dolook: () => dolook(),
    doread: () => doread(),
    doengrave: () => doengrave(),
    dowield: () => dowield(),
    dotwoweapon: () => dotwoweapon(),
    enhance_weapon_skill: () => enhance_weapon_skill(),
    dohelp: () => dohelp(),
    doopen: () => doopen(),
    doforce: () => doforce(),
    doclose: () => doclose(),
    dojump: () => dojump(),
    do_reqmenu: () => do_reqmenu(),
    do_rush: () => do_rush(),
    do_run: () => do_run(),
    do_fight: () => do_fight(),
    dotogglepickup: () => dotogglepickup(),
    doset_simple: () => doset_simple(),
    doset: () => doset(),
    dopickup: () => dopickup(),
    dosave: () => dosave(),
    doprgold: () => doprgold(),
    doprwep: () => doprwep(),
    doprarm: () => doprarm(),
    doprring: () => doprring(),
    dopramulet: () => dopramulet(),
    doprtool: () => doprtool(),
    doprinuse: () => doprinuse(),
    doterrain: () => doterrain(),
    dowhatis: () => dowhatis(),
    doquickwhatis: () => doquickwhatis(),
    doextversion: () => doextversion(),
    dohistory: () => dohistory(),
    dowhatdoes: () => dowhatdoes(),
    dosit: () => dosit(),
    dodip: () => dodip(),
    doinvoke: () => doinvoke(),
    donamelevel: () => donamelevel(),
    dooverview: () => dooverview(),
    domonability: () => domonability(),
    dowipe: () => dowipe(),
    dogenocided: () => dogenocided(),
    doturn: () => doturn(),
    dosacrifice: () => dosacrifice(),
    enter_explore_mode: () => enter_explore_mode(),
    wiz_identify: () => wiz_identify(),
    wiz_intrinsic: () => wiz_intrinsic(),
    wiz_map: () => wiz_map(),
    wiz_detect: () => wiz_detect(),
    wiz_where: () => wiz_where(),
    wiz_polyself: () => wiz_polyself(),
    doherecmdmenu: () => doherecmdmenu(),
    dotherecmdmenu: () => dotherecmdmenu(),
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

/* C ref: cmd.c cmdq_add_ec(CQ_CANNED, fn), cmdq_add_key(CQ_CANNED, key),
   cmdq_add_dir(CQ_CANNED, dx, dy, dz) -- the canned command queue is
   game.cmdq */
export function cmdq_add_ec(fn) {
    if (!game.cmdq) game.cmdq = [];
    game.cmdq.push({ typ: 'ec', fn });
}
export function cmdq_add_key(key) {
    if (!game.cmdq) game.cmdq = [];
    game.cmdq.push({ typ: 'key', key });
}
export function cmdq_add_dir(dx, dy, dz) {
    if (!game.cmdq) game.cmdq = [];
    game.cmdq.push({ typ: 'dir', dirx: dx, diry: dy, dirz: dz });
}

/* C ref: wintype.h CLICK_1, CLICK_2 */
const CLICK_1 = 1, CLICK_2 = 2;
/* C ref: defsym.h S_sink, S_fountain (defsyms[] indices) */
const S_sink = 36, S_fountain = 37;

function sgn(n) { return n < 0 ? -1 : n > 0 ? 1 : 0; }
/* C ref: hacklib.c upstart() */
function upstart(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }

// C ref: cmd.c doherecmdmenu() -- #herecmdmenu command
async function doherecmdmenu() {
    const ch = await here_cmd_menu();

    return (ch !== '\0' && ch !== '\x1b') ? ECMD_TIME : ECMD_OK;
}

// C ref: cmd.c dotherecmdmenu() -- #therecmdmenu command, a way to test
// there_cmd_menu without mouse
async function dotherecmdmenu() {
    const u = game.u;
    const iflags = game.iflags;
    let ch;
    if (!game.clicklook_cc)
        game.clicklook_cc = { x: 0, y: 0 };
    const x = game.clicklook_cc.x;
    const y = game.clicklook_cc.y;

    iflags.getdir_click = CLICK_1 | CLICK_2; /* allow 'far' click */

    if (isok(x, y)) {
        if (x === u.ux && y === u.uy)
            ch = await here_cmd_menu();
        else
            ch = await there_cmd_menu(x, y, iflags.getdir_click);
        game.clicklook_cc.x = game.clicklook_cc.y = -1;
        iflags.getdir_click = 0;
        return (ch !== '\0' && ch !== '\x1b') ? ECMD_TIME : ECMD_OK;
    }

    const dir = await getdir(null);
    const click = iflags.getdir_click;
    iflags.getdir_click = 0;

    if (!dir || !isok(u.ux + u.dx, u.uy + u.dy))
        return ECMD_CANCEL;

    if (u.dx || u.dy)
        ch = await there_cmd_menu(u.ux + u.dx, u.uy + u.dy, click);
    else
        ch = await here_cmd_menu();

    return (ch !== '\0' && ch !== '\x1b') ? ECMD_TIME : ECMD_OK;
}

/* C ref: cmd.c enum menucmd -- commands for [t]herecmdmenu */
const MCMD_NOTHING = 0, MCMD_OPEN_DOOR = 1, MCMD_LOCK_DOOR = 2,
    MCMD_UNTRAP_DOOR = 3, MCMD_KICK_DOOR = 4, MCMD_CLOSE_DOOR = 5,
    MCMD_SEARCH = 6, MCMD_LOOK_TRAP = 7, MCMD_UNTRAP_TRAP = 8,
    MCMD_MOVE_DIR = 9, MCMD_RIDE = 10, MCMD_REMOVE_SADDLE = 11,
    MCMD_APPLY_SADDLE = 12, MCMD_TALK = 13, MCMD_NAME = 14,

    MCMD_QUAFF = 15, MCMD_DIP = 16, MCMD_SIT = 17, MCMD_UP = 18,
    MCMD_DOWN = 19, MCMD_DISMOUNT = 20, MCMD_MONABILITY = 21,
    MCMD_PICKUP = 22, MCMD_LOOT = 23, MCMD_TIP = 24, MCMD_EAT = 25,
    MCMD_DROP = 26, MCMD_REST = 27, MCMD_LOOK_HERE = 28, MCMD_LOOK_AT = 29,
    MCMD_ATTACK_NEXT2U = 30, MCMD_UNTRAP_HERE = 31, MCMD_OFFER = 32,
    MCMD_INVENTORY = 33, MCMD_CAST_SPELL = 34,

    MCMD_THROW_OBJ = 35, MCMD_TRAVEL = 36;

// C ref: cmd.c mcmd_addmenu()
function mcmd_addmenu(win, act, txt) {
    const clr = NO_COLOR;

    /* TODO: fixed letters for the menu entries? */
    tty_add_menu(win, null, act, 0, 0, ATR_NONE, clr, txt,
                 MENU_ITEMFLAGS_NONE);
}

/* the floor pile at <x,y> (svl.level.objects[x][y] via ->nexthere), top
   first */
function floor_pile_at(x, y) {
    const top = vobj_at(x, y);
    if (!top)
        return [];
    return [top, ...(game.level.objects || []).filter(
        o => o !== top && o.ox === x && o.oy === y && o.where === 'OBJ_FLOOR')];
}

// C ref: cmd.c there_cmd_menu_self() -- command menu entries when
// targeting self
function there_cmd_menu_self(win, x, y, act) {
    let K = 0;
    let buf;
    const typ = game.level.at(x, y).typ;
    const stway = stairway_at(x, y);
    let ttmp;

    void act; /* UNUSED */
    if (!u_at(x, y))
        return K;

    if ((IS_FOUNTAIN(typ) || IS_SINK(typ)) && can_reach_floor(false)) {
        buf = `Drink from the ${
            defsyms_explanation[IS_FOUNTAIN(typ) ? S_fountain : S_sink]}`;
        mcmd_addmenu(win, MCMD_QUAFF, buf), ++K;
    }
    if (IS_FOUNTAIN(typ) && can_reach_floor(false))
        mcmd_addmenu(win, MCMD_DIP, "Dip something into the fountain"), ++K;
    if (IS_THRONE(typ))
        mcmd_addmenu(win, MCMD_SIT, "Sit on the throne"), ++K;
    if (IS_ALTAR(typ))
        mcmd_addmenu(win, MCMD_OFFER, "Sacrifice something on the altar"), ++K;

    if (stway && stway.up) {
        buf = `Go up the ${stway.isladder ? "ladder" : "stairs"}`;
        mcmd_addmenu(win, MCMD_UP, buf), ++K;
    }
    if (stway && !stway.up) {
        buf = `Go down the ${stway.isladder ? "ladder" : "stairs"}`;
        mcmd_addmenu(win, MCMD_DOWN, buf), ++K;
    }
    if (game.u.usteed) { /* another movement choice */
        buf = `Dismount ${x_monnam(game.u.usteed, ARTICLE_THE, null,
                                   SUPPRESS_SADDLE, false)}`;
        mcmd_addmenu(win, MCMD_DISMOUNT, buf), ++K;
    }

    /* #if 0 ... Upolyd "Use %s special ability" ... #endif */

    const pile = floor_pile_at(x, y);
    if (pile.length) { /* OBJ_AT(x, y) */
        const otmp = pile[0];

        buf = `Pick up ${(pile.length > 1) ? "items" : doname(otmp)}`;
        mcmd_addmenu(win, MCMD_PICKUP, buf), ++K;

        if (Is_container(otmp)) {
            buf = `Loot ${doname(otmp)}`;
            mcmd_addmenu(win, MCMD_LOOT, buf), ++K;

            buf = `Tip ${doname(otmp)}`;
            mcmd_addmenu(win, MCMD_TIP, buf), ++K;
        }
        if (otmp.oclass === FOOD_CLASS) {
            buf = `Eat ${doname(otmp)}`;
            mcmd_addmenu(win, MCMD_EAT, buf), ++K;
        }
    }

    if (game.invent) {
        mcmd_addmenu(win, MCMD_INVENTORY, "Inventory"), ++K;
        mcmd_addmenu(win, MCMD_DROP, "Drop items"), ++K;
    }
    mcmd_addmenu(win, MCMD_REST, "Rest one turn"), ++K;
    mcmd_addmenu(win, MCMD_SEARCH, "Search around you"), ++K;
    mcmd_addmenu(win, MCMD_LOOK_HERE, "Look at what is here"), ++K;

    if (num_spells() > 0)
        mcmd_addmenu(win, MCMD_CAST_SPELL, "Cast a spell"), ++K;

    if ((ttmp = t_at(x, y)) != null && ttmp.tseen) {
        if (ttmp.ttyp !== VIBRATING_SQUARE)
            mcmd_addmenu(win, MCMD_UNTRAP_HERE,
                         "Attempt to disarm trap"), ++K;
    }
    return K;
}

// C ref: cmd.c there_cmd_menu_next2u() -- add entries to there_cmd_menu,
// when x,y is next to hero
function there_cmd_menu_next2u(win, x, y, mod, act) {
    let K = 0;
    let buf;
    const lev = game.level.at(x, y);
    const typ = lev.typ;
    let ttmp, mtmp;

    if (!next2u(x, y))
        return K;

    if (IS_DOOR(typ)) {
        let key_or_pick, card;
        const dm = lev.doormask;

        if ((dm & (D_CLOSED | D_LOCKED))) {
            mcmd_addmenu(win, MCMD_OPEN_DOOR, "Open the door"), ++K;
            /* unfortunately there's no lknown flag for doors to
               remember the locked/unlocked state */
            key_or_pick = (carrying(SKELETON_KEY) || carrying(LOCK_PICK));
            card = !!carrying(CREDIT_CARD);
            if (key_or_pick || card) {
                buf = `${key_or_pick ? "lock or " : ""}unlock the door`;
                mcmd_addmenu(win, MCMD_LOCK_DOOR, upstart(buf)), ++K;
            }
            /* unfortunately there's no tknown flag for doors (or chests)
               to remember whether a trap had been found */
            mcmd_addmenu(win, MCMD_UNTRAP_DOOR,
                         "Search the door for a trap"), ++K;
            /* [what about #force?] */
            mcmd_addmenu(win, MCMD_KICK_DOOR, "Kick the door"), ++K;
        } else if ((dm & D_ISOPEN) && (mod === CLICK_2)) {
            mcmd_addmenu(win, MCMD_CLOSE_DOOR, "Close the door"), ++K;
        }
    }

    if (typ <= SCORR)
        mcmd_addmenu(win, MCMD_SEARCH, "Search for secret doors"), ++K;

    if ((ttmp = t_at(x, y)) != null && ttmp.tseen) {
        mcmd_addmenu(win, MCMD_LOOK_TRAP, "Examine trap"), ++K;
        if (ttmp.ttyp !== VIBRATING_SQUARE)
            mcmd_addmenu(win, MCMD_UNTRAP_TRAP,
                         "Attempt to disarm trap"), ++K;
        mcmd_addmenu(win, MCMD_MOVE_DIR, "Move on the trap"), ++K;
    }

    /* levl[x][y].glyph == objnum_to_glyph(BOULDER): the remembered glyph
       is the plain (not pile-top) boulder glyph */
    const rg = lev.remembered_glyph;
    if (rg && glyph_kind(rg) === 'obj' && rg.otyp === BOULDER && !rg.piletop)
        mcmd_addmenu(win, MCMD_MOVE_DIR, "Push the boulder"), ++K;

    mtmp = m_at(x, y);
    if (mtmp && !canspotmon(mtmp))
        mtmp = null;
    if (mtmp && which_armor(mtmp, W_SADDLE)) {
        const mnam = x_monnam(mtmp, ARTICLE_THE, null, SUPPRESS_SADDLE, false);

        if (!game.u.usteed) {
            buf = `Ride ${mnam}`;
            mcmd_addmenu(win, MCMD_RIDE, buf), ++K;
        }
        buf = `Remove saddle from ${mnam}`;
        mcmd_addmenu(win, MCMD_REMOVE_SADDLE, buf), ++K;
    }
    if (mtmp && can_saddle(mtmp) && !which_armor(mtmp, W_SADDLE)
        && carrying(SADDLE)) {
        buf = `Put saddle on ${mon_nam(mtmp)}`;
        mcmd_addmenu(win, MCMD_APPLY_SADDLE, buf), ++K;
    }
    if (mtmp && (mtmp.mpeaceful || mtmp.mtame)) {
        buf = `Talk to ${mon_nam(mtmp)}`;
        mcmd_addmenu(win, MCMD_TALK, buf), ++K;

        buf = `Swap places with ${mon_nam(mtmp)}`;
        mcmd_addmenu(win, MCMD_MOVE_DIR, buf), ++K;

        buf = `${!has_mgivenname(mtmp) ? "Name" : "Rename"} ${mon_nam(mtmp)}`;
        mcmd_addmenu(win, MCMD_NAME, buf), ++K;
    }

    if ((mtmp && !(mtmp.mpeaceful || mtmp.mtame))
        || glyph_is_invisible(glyph_at(x, y))) {
        buf = `Attack ${mtmp ? mon_nam(mtmp) : "unseen creature"}`;
        mcmd_addmenu(win, MCMD_ATTACK_NEXT2U, buf), ++K;
        /* attacking overrides any other automatic action */
        act.v = MCMD_ATTACK_NEXT2U;
    } else {
        /* "Move %s", direction - handled below */
    }
    return K;
}

// C ref: cmd.c there_cmd_menu_far()
function there_cmd_menu_far(win, x, y, mod) {
    const u = game.u;
    let K = 0;

    if (mod === CLICK_1) {
        if (linedup(u.ux, u.uy, x, y, 1)
            && dist2(u.ux, u.uy, x, y) < 18 * 18)
            mcmd_addmenu(win, MCMD_THROW_OBJ, "Throw something"), ++K;

        mcmd_addmenu(win, MCMD_TRAVEL, "Travel here"), ++K;
    }
    return K;
}

/* C ref: display.h hero_glyph -- monnum_to_glyph((Upolyd || !showrace)
   ? u.umonnum : urace.mnum, Ugender); for the unpolymorphed hero that is
   the role's '@' as display_self() shows it */
function glyph_is_hero_glyph(glyph) {
    return glyph.kind === 'mon' && glyph.ch === '@'
        && glyph.color === CLR_WHITE && glyph.mndx === undefined;
}

// C ref: cmd.c there_cmd_menu_common()
function there_cmd_menu_common(win, x, y, mod, act) {
    let K = 0;

    void act; /* UNUSED */
    if (mod === CLICK_1 || mod === CLICK_2) { /* ignore iflags.clicklook here */
        /* for self, only include "look at map symbol" if it isn't the
           ordinary hero symbol (steed, invisible w/o see invisible, ?) */
        if (!u_at(x, y) || Upolyd()
            || !glyph_is_hero_glyph(glyph_at(x, y)))
            mcmd_addmenu(win, MCMD_LOOK_AT, "Look at map symbol"), ++K;
    }
    return K;
}

// C ref: cmd.c act_on_act() -- queue up command(s) to perform
// #therecmdmenu action
function act_on_act(act, dx, dy) {
    const u = game.u;
    const iflags = game.iflags;
    let otmp, dir;

    /* a few there_cmd_menu_far() actions use dx,dy differently */
    switch (act) {
    case MCMD_THROW_OBJ:
    case MCMD_TRAVEL:
    case MCMD_LOOK_AT:
        /* keep dx,dy as-is */
        break;
    default:
        /* force dx and dy to be +1, 0, or -1 */
        dx = sgn(dx);
        dy = sgn(dy);
        break;
    }

    switch (act) {
    case MCMD_TRAVEL:
        /* FIXME: player has explicitly picked "travel to this location"
           from the menu but it will only work if flags.travelcmd is True.
           That option is intended as way to guard against stray mouse
           clicks and shouldn't inhibit explicit travel. */
        if (!iflags.travelcc)
            iflags.travelcc = { x: 0, y: 0 };
        iflags.travelcc.x = u.tx = u.ux + dx;
        iflags.travelcc.y = u.ty = u.uy + dy;
        cmdq_add_ec("dotravel_target");
        break;
    case MCMD_THROW_OBJ:
        /* cmdq_add_ec(dothrow); cmdq_add_userinput(); cmdq_add_dir() */
        throw new Error('act_on_act(): queued user-input for dothrow not ported yet');
    case MCMD_OPEN_DOOR:
        cmdq_add_ec("doopen");
        cmdq_add_dir(dx, dy, 0);
        break;
    case MCMD_LOCK_DOOR:
        otmp = carrying(SKELETON_KEY);
        if (!otmp)
            otmp = carrying(LOCK_PICK);
        if (!otmp)
            otmp = carrying(CREDIT_CARD);
        if (otmp) {
            /* cmdq_add_ec(doapply), cmdq_add_key(invlet), cmdq_add_dir(),
               then cmdq_add_key('y') answers "Lock it?" through
               yn_function()'s command queue */
            throw new Error('act_on_act(): queued yn_function() answer not ported yet');
        }
        break;
    case MCMD_UNTRAP_DOOR:
        cmdq_add_ec("dountrap");
        cmdq_add_dir(dx, dy, 0);
        break;
    case MCMD_KICK_DOOR:
        cmdq_add_ec("dokick");
        cmdq_add_dir(dx, dy, 0);
        break;
    case MCMD_CLOSE_DOOR:
        cmdq_add_ec("doclose");
        cmdq_add_dir(dx, dy, 0);
        break;
    case MCMD_SEARCH:
        cmdq_add_ec("dosearch");
        break;
    case MCMD_LOOK_TRAP:
        cmdq_add_ec("doidtrap");
        cmdq_add_dir(dx, dy, 0);
        break;
    case MCMD_UNTRAP_TRAP:
        cmdq_add_ec("dountrap");
        cmdq_add_dir(dx, dy, 0);
        break;
    case MCMD_MOVE_DIR:
        dir = xytodir(dx, dy);
        cmdq_add_ec(`do_move_${move_dirnames[dir]}`); /* move_funcs[dir][MV_WALK] */
        break;
    case MCMD_RIDE:
        cmdq_add_ec("doride");
        cmdq_add_dir(dx, dy, 0);
        break;
    case MCMD_REMOVE_SADDLE:
        /* cmdq_add_ec(do_reqmenu) (m-prefix for #loot: skip any floor
           containers), cmdq_add_ec(doloot), cmdq_add_dir(), then
           cmdq_add_key('y') answers "Do you want to remove saddle?"
           through yn_function()'s command queue */
        throw new Error('act_on_act(): queued yn_function() answer not ported yet');
    case MCMD_APPLY_SADDLE:
        if ((otmp = carrying(SADDLE)) != null) {
            cmdq_add_ec("doapply");
            cmdq_add_key(otmp.invlet);
            cmdq_add_dir(dx, dy, 0);
        }
        break;
    case MCMD_ATTACK_NEXT2U:
        dir = xytodir(dx, dy);
        cmdq_add_ec(`do_move_${move_dirnames[dir]}`); /* move_funcs[dir][MV_WALK] */
        break;
    case MCMD_TALK:
        cmdq_add_ec("dotalk");
        cmdq_add_dir(dx, dy, 0);
        break;
    case MCMD_NAME:
        /* cmdq_add_ec(docallcmd); cmdq_add_key('m'); cmdq_add_dir(): the
           direction is read by getpos() */
        throw new Error('act_on_act(): queued direction for getpos() not ported yet');
    case MCMD_QUAFF:
        /* cmdq_add_ec(dodrink); cmdq_add_key('y') answers "Drink from the
           fountain?" through yn_function()'s command queue */
        throw new Error('act_on_act(): queued yn_function() answer not ported yet');
    case MCMD_DIP:
        /* cmdq_add_ec(dodip); cmdq_add_userinput(); cmdq_add_key('y') */
        throw new Error('act_on_act(): queued user-input for dodip not ported yet');
    case MCMD_SIT:
        cmdq_add_ec("dosit");
        break;
    case MCMD_UP:
        cmdq_add_ec("doup");
        break;
    case MCMD_DOWN:
        cmdq_add_ec("dodown");
        break;
    case MCMD_DISMOUNT:
        cmdq_add_ec("doride");
        break;
    case MCMD_MONABILITY:
        cmdq_add_ec("domonability");
        break;
    case MCMD_PICKUP:
        cmdq_add_ec("dopickup");
        break;
    case MCMD_LOOT:
        cmdq_add_ec("doloot");
        break;
    case MCMD_TIP:
        /* cmdq_add_ec(dotip); cmdq_add_key('y') answers "There is foo
           here; tip it?" through yn_function()'s command queue */
        throw new Error('act_on_act(): queued yn_function() answer not ported yet');
    case MCMD_EAT:
        /* cmdq_add_ec(doeat); cmdq_add_key('y') answers "There is foo
           here; eat it?" through yn_function()'s command queue */
        throw new Error('act_on_act(): queued yn_function() answer not ported yet');
    case MCMD_DROP:
        cmdq_add_ec("dodrop");
        break;
    case MCMD_INVENTORY:
        cmdq_add_ec("ddoinv");
        break;
    case MCMD_REST:
        cmdq_add_ec("donull");
        break;
    case MCMD_LOOK_HERE:
        cmdq_add_ec("dolook");
        break;
    case MCMD_LOOK_AT:
        if (!game.clicklook_cc)
            game.clicklook_cc = { x: 0, y: 0 };
        game.clicklook_cc.x = u.ux + dx;
        game.clicklook_cc.y = u.uy + dy;
        cmdq_add_ec("doclicklook");
        break;
    case MCMD_UNTRAP_HERE:
        cmdq_add_ec("dountrap");
        cmdq_add_dir(0, 0, 1);
        break;
    case MCMD_OFFER:
        /* cmdq_add_ec(dosacrifice); cmdq_add_userinput() */
        throw new Error('act_on_act(): queued user-input for dosacrifice not ported yet');
    case MCMD_CAST_SPELL:
        cmdq_add_ec("docast");
        break;
    default:
        break;
    }
}

// C ref: cmd.c there_cmd_menu() -- offer choice of actions to perform at
// adjacent location <x,y>; a few choices can be farther away
async function there_cmd_menu(x, y, mod) {
    const u = game.u;
    let ch = '\0';
    let npick = 0, K = 0;
    let picks = null;
    /*int dx = sgn(x - u.ux), dy = sgn(y - u.uy);*/
    const dx = x - u.ux, dy = y - u.uy;
    const act = { v: MCMD_NOTHING };

    const win = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(win, MENU_BEHAVE_STANDARD);

    if (u_at(x, y))
        K += there_cmd_menu_self(win, x, y, act);
    else if (next2u(x, y))
        K += there_cmd_menu_next2u(win, x, y, mod, act);
    else
        K += there_cmd_menu_far(win, x, y, mod);
    K += there_cmd_menu_common(win, x, y, mod, act);

    if (!K) {
        /* no menu options, try to move */
        if (next2u(x, y) && await test_move(u.ux, u.uy, dx, dy, TEST_MOVE)) {
            const dir = xytodir(dx, dy);

            cmdq_add_ec(`do_move_${move_dirnames[dir]}`); /* move_funcs[dir][MV_WALK] */
        } else if (game.flags.travelcmd) {
            if (!game.iflags.travelcc)
                game.iflags.travelcc = { x: 0, y: 0 };
            game.iflags.travelcc.x = u.tx = x;
            game.iflags.travelcc.y = u.ty = y;
            cmdq_add_ec("dotravel_target");
        }
        npick = 0;
        ch = '\0';
    } else if (K === 1 && act.v !== MCMD_NOTHING && act.v !== MCMD_TRAVEL) {
        await tty_destroy_nhwindow(win);

        act_on_act(act.v, dx, dy);
        return '\0';
    } else {
        tty_end_menu(win, "What do you want to do?");
        const res = await tty_select_menu(win, PICK_ONE);
        npick = res.n;
        picks = res.selected;
        ch = '\x1b';
    }
    await tty_destroy_nhwindow(win);
    if (npick > 0) {
        act_on_act(picks[0].item, dx, dy);
        return '\0';
    }
    return ch;
}

// C ref: cmd.c here_cmd_menu()
async function here_cmd_menu() {
    await there_cmd_menu(game.u.ux, game.u.uy, CLICK_1);
    return '\0';
}

/* C ref: mondata.h is_hider(), hides_under(), webmaker(), can_breathe(),
   attacktype(), is_mind_flayer(), likes_gems(), is_unicorn() */
function is_hider(ptr) { return (ptr.mflags1 & M1_HIDE) !== 0; }
function hides_under(ptr) { return (ptr.mflags1 & M1_CONCEAL) !== 0; }
function webmaker(ptr) {
    return ptr === mons[PM_CAVE_SPIDER] || ptr === mons[PM_GIANT_SPIDER];
}
function attacktype(ptr, atyp) { return ptr.mattk.some(a => a.aatyp === atyp); }
function can_breathe(ptr) { return attacktype(ptr, AT_BREA); }
function is_mind_flayer(ptr) {
    return ptr === mons[PM_MIND_FLAYER] || ptr === mons[PM_MASTER_MIND_FLAYER];
}
function is_unicorn(ptr) {
    return ptr.mlet === S_UNICORN && (ptr.mflags2 & M2_JEWELS) !== 0;
}

// C ref: cmd.c domonability() -- #monster command - use special monster
// ability while polymorphed
async function domonability() {
    const u = game.u;
    const uptr = game.youmonst.data;
    const might_hide = (is_hider(uptr) || hides_under(uptr));
    let c = '\0';

    if (might_hide && webmaker(uptr)) {
        c = await tty_yn_function("Hide [h] or spin a web [s]?",
                                  "hsq", 'q'); /* hidespinchars */
        if (c === 'q' || c === '\x1b')
            return ECMD_OK;
    }
    if (can_breathe(uptr))
        return await dobreathe();
    else if (attacktype(uptr, AT_SPIT))
        throw new Error('domonability(): dospit() not ported yet');
    else if (uptr.mlet === S_NYMPH)
        throw new Error('domonability(): doremove() not ported yet');
    else if (attacktype(uptr, AT_GAZE))
        throw new Error('domonability(): dogaze() not ported yet');
    else if (is_were(uptr))
        throw new Error('domonability(): dosummon() not ported yet');
    else if ((c !== '\0') ? c === 'h' : might_hide)
        throw new Error('domonability(): dohide() not ported yet');
    else if ((c !== '\0') ? c === 's' : webmaker(uptr))
        throw new Error('domonability(): dospinweb() not ported yet');
    else if (is_mind_flayer(uptr))
        throw new Error('domonability(): domindblast() not ported yet');
    else if (u.umonnum === PM_GREMLIN) {
        if (IS_FOUNTAIN(game.level.at(u.ux, u.uy).typ)) {
            if (await split_mon(game.youmonst, null))
                await dryup(u.ux, u.uy, true);
        } else if (is_pool(u.ux, u.uy)) {
            /* is_pool: might be wearing water walking boots or amulet of
               magical breathing */
            await split_mon(game.youmonst, null);
        } else {
            await There("is no fountain here.");
        }
    } else if (is_unicorn(uptr)) {
        throw new Error('domonability(): use_unicorn_horn() not ported yet');
    } else if (uptr.msound === MS_SHRIEK) {
        await You("shriek.");
        if (u.uburied)
            await pline("Unfortunately sound does not carry well through rock.");
        else
            aggravate();
    } else if (is_vampire(uptr) || is_vampshifter(game.youmonst)) {
        throw new Error('domonability(): dopoly() not ported yet');
    } else if (u.usteed && can_breathe(u.usteed.data)) {
        throw new Error('domonability(): pet_ranged_attk() not ported yet');
    } else if (u.umonnum !== u.umonster) { /* Upolyd */
        await pline("Any special ability you may have is purely reflexive.");
    } else {
        await You("don't have a special ability in your normal form!");
    }
    return ECMD_OK;
}

// C ref: cmd.c enter_explore_mode() -- #exploremode (M-X)
export async function enter_explore_mode() {
    const flags = game.flags;

    if (flags.explore) {
        await You("are already in explore mode.");
    } else {
        const oldmode = !flags.debug ? "normal game" : "debug mode";

        if (!authorize_explore_mode()) {
            if (!flags.debug) {
                await You("cannot access explore mode.");
                return ECMD_OK;
            } else {
                await pline("Note: normally you wouldn't be allowed into explore mode.");
                /* keep going */
            }
        }
        await pline(`Beware!  From explore mode there will be no return to ${oldmode},`);
        if (await paranoid_query((flags.paranoia_bits & PARANOID_QUIT) !== 0, /* ParanoidQuit */
                                 "Do you want to enter explore mode?")) {
            flags.explore = true;
            flags.debug = false;
            tty_clear_nhwindow(game.WIN_MESSAGE);
            await You("are now in non-scoring explore mode.");
        } else {
            tty_clear_nhwindow(game.WIN_MESSAGE);
            await pline(`Continuing with ${oldmode}.`);
        }
    }
    return ECMD_OK;
}

// C ref: cmd.c doc_extcmd_flagstr() -- format extended command flags for
// display; efp null: add a footnote to the menu
function doc_extcmd_flagstr(menuwin, efp) {
    /* note: tag shown for menu prefix is 'm' even if m-prefix action
       has been bound to some other key */
    if (!efp) {
        add_menu_str(menuwin, "[A] Command autocompletes");
        add_menu_str(menuwin, `[m] Command accepts '${visctrl(cmd_from_func("do_reqmenu"))}' prefix`);
        return null;
    } else {
        const mprefix = accept_menu_prefix(efp),
            autocomplete = (efp.flags & AUTOCOMPLETE) !== 0;
        let p = '';

        /* "" or "[m]" or "[A]" or "[mA]" */
        if (mprefix || autocomplete) {
            p += '[';
            if (mprefix)
                p += 'm';
            if (autocomplete)
                p += 'A';
            p += ']';
        }
        return p;
    }
}

// C ref: cmd.c doextlist() -- here after #? - now list all full-word
// commands and provide some navigation capability through the long list
async function doextlist() {
    let buf, cmd_desc;
    let n, pass;
    let menumode = 0, onelist = 0;
    const menushown = [0, 0];
    let redisplay = true, search = false;
    let searchbuf = '';
    const headings = ["Extended commands", "Debugging Extended Commands"];
    const clr = NO_COLOR;
    const wizard = !!game.flags?.debug, discover = !!game.flags?.explore;

    const menuwin = tty_create_nhwindow(NHW_MENU);

    while (redisplay) {
        redisplay = false;
        tty_start_menu(menuwin, MENU_BEHAVE_STANDARD);
        add_menu_str(menuwin, "Extended Commands List");
        add_menu_str(menuwin, "");

        buf = `Switch to ${menumode ? "including" : "excluding"} commands that don't autocomplete`;
        tty_add_menu(menuwin, null, 1, 'a', 0, ATR_NONE, clr, buf,
                     MENU_ITEMFLAGS_NONE);

        if (!searchbuf) {
            /* was 's', but then using ':' handling within the interface
               would only examine the two or three meta entries, not the
               actual list of extended commands shown via separator lines;
               having ':' as an explicit selector overrides the default
               menu behavior for it; we retain 's' as a group accelerator */
            tty_add_menu(menuwin, null, 2, ':', 's', ATR_NONE, clr,
                         "Search extended commands", MENU_ITEMFLAGS_NONE);
        } else {
            buf = "Switch back from search";
            if (buf.length + searchbuf.length + " (\"\")".length < 256 /* QBUFSZ */)
                buf += ` ("${searchbuf}")`;
            /* specifying ':' as a group accelerator here is mostly a
               statement of intent (we'd like to accept it as a synonym but
               also want to hide it from general menu use) because it won't
               work for interfaces which support ':' to search; use as a
               general menu command takes precedence over group accelerator */
            tty_add_menu(menuwin, null, 3, 's', ':', ATR_NONE, clr, buf,
                         MENU_ITEMFLAGS_NONE);
        }
        if (wizard) {
            tty_add_menu(menuwin, null, 4, 'z', 0, ATR_NONE, clr,
                         onelist ? "Switch to showing debugging commands in separate section"
                         : "Switch to showing all alphabetically, including debugging commands",
                         MENU_ITEMFLAGS_NONE);
        }
        add_menu_str(menuwin, "");
        menushown[0] = menushown[1] = 0;
        n = 0;
        for (pass = 0; pass <= 1; ++pass) {
            /* skip second pass if not in wizard mode or wizard mode
               commands are being integrated into a single list */
            if (pass === 1 && (onelist || !wizard))
                break;
            for (const efp of extcmdlist) {
                if ((efp.flags & (CMD_NOT_AVAILABLE | INTERNALCMD)) !== 0)
                    continue;
                /* if hiding non-autocomplete commands, skip such */
                if (menumode === 1 && (efp.flags & AUTOCOMPLETE) === 0)
                    continue;
                /* skip wizard mode commands if not in wizard mode;
                   when showing two sections, skip wizard mode commands
                   in pass==0 and skip other commands in pass==1 */
                const wizc = (efp.flags & WIZMODECMD) !== 0 ? 1 : 0;
                if (wizc && !wizard)
                    continue;
                if (!onelist && pass !== wizc)
                    continue;
                /* command description might get modified on the fly */
                cmd_desc = efp.ef_desc;
                /* suppress part of the description for #genocided if it
                   doesn't apply during the current game */
                if (!wizard && !discover
                    && (efp.flags & GENERALCMD) !== 0 /* minor optimization */
                    && strstri(cmd_desc, "extinct") >= 0)
                    cmd_desc = cmd_desc.replace(" been genocided or become extinct",
                                                " been genocided"); /* strsubst() */
                /* if searching, skip this command if it doesn't match */
                if (searchbuf)
                    throw new Error('doextlist(): search (pmatchi()) not ported yet');

                /* We're about to show an item, have we shown the menu yet?
                   Doing menu in inner loop like this on demand avoids a
                   heading with no subordinate entries on the search
                   results menu. */
                if (!menushown[pass]) {
                    add_menu_heading(menuwin, headings[pass]);
                    menushown[pass] = 1;
                }
                /* longest ef_txt at present is "wizrumorcheck" (13 chars);
                   2nd field will be "    " or " [A]" or " [m]" or "[mA]" */
                buf = ` ${efp.ef_txt.padEnd(14)} ${doc_extcmd_flagstr(menuwin, efp).padStart(4)} ${cmd_desc}`;
                add_menu_str(menuwin, buf);
                ++n;
            }
            if (n)
                add_menu_str(menuwin, "");
        }
        if (searchbuf && !n)
            add_menu_str(menuwin, "no matches");
        else
            doc_extcmd_flagstr(menuwin, null);

        tty_end_menu(menuwin, null);
        const res = await tty_select_menu(menuwin, PICK_ONE);
        n = res.n;
        if (n > 0) {
            switch (res.selected[0].item) {
            case 1: /* 'a': toggle show/hide non-autocomplete */
                menumode = 1 - menumode; /* toggle 0 -> 1, 1 -> 0 */
                redisplay = true;
                break;
            case 2: /* ':' when not searching yet: enable search */
                search = true;
                break;
            case 3: /* 's' when already searching: disable search */
                search = false;
                searchbuf = '';
                redisplay = true;
                break;
            case 4: /* 'z': toggle showing wizard mode commands separately */
                search = false;
                searchbuf = '';
                onelist = 1 - onelist; /* toggle 0 -> 1, 1 -> 0 */
                redisplay = true;
                break;
            }
        } else {
            search = false;
            searchbuf = '';
        }
        if (search)
            throw new Error('doextlist(): search phrase (getlin(), pmatchi()) not ported yet');
    }
    await tty_destroy_nhwindow(menuwin);
    return ECMD_OK;
}

// C ref: cmd.c doterrain() -- the #terrain command: show map without
// obstructions
async function doterrain() {
    let n;
    let which;
    const clr = NO_COLOR;

    /* this used to be done each time vision was recalculated, so would
       always be up to date (hopefully); now we do it on demand instead */
    recalc_mapseen();

    /*
     * normal play: choose between known map without mons, obj, and traps
     *  (to see underlying terrain only), or
     *  known map without mons and objs (to see traps under mons and objs), or
     *  known map without mons (to see objects under monsters);
     * explore mode: normal choices plus full map (w/o mons, objs, traps);
     * wizard mode: normal and explore choices plus
     *  a dump of the internal levl[][].typ codes w/ level flags, or
     *  a legend for the levl[][].typ codes dump
     */
    const men = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(men, MENU_BEHAVE_STANDARD);
    tty_add_menu(men, null, 1, 0, 0, ATR_NONE, clr,
                 "known map without monsters, objects, and traps",
                 MENU_ITEMFLAGS_SELECTED);
    tty_add_menu(men, null, 2, 0, 0, ATR_NONE, clr,
                 "known map without monsters and objects",
                 MENU_ITEMFLAGS_NONE);
    tty_add_menu(men, null, 3, 0, 0, ATR_NONE, clr,
                 "known map without monsters",
                 MENU_ITEMFLAGS_NONE);
    if (game.flags.explore || game.flags.debug) {
        tty_add_menu(men, null, 4, 0, 0, ATR_NONE, clr,
                     "full map without monsters, objects, and traps",
                     MENU_ITEMFLAGS_NONE);
        if (game.flags.debug) {
            tty_add_menu(men, null, 5, 0, 0, ATR_NONE, clr,
                         "internal levl[][].typ codes in base-36",
                         MENU_ITEMFLAGS_NONE);
            tty_add_menu(men, null, 6, 0, 0, ATR_NONE, clr,
                         "legend of base-36 levl[][].typ codes",
                         MENU_ITEMFLAGS_NONE);
        }
    }
    tty_end_menu(men, "View which?");

    const res = await tty_select_menu(men, PICK_ONE);
    n = res.n;
    await tty_destroy_nhwindow(men);
    /*
     * n <  0: player used ESC to cancel;
     * n == 0: preselected entry was explicitly chosen and got toggled off;
     * n == 1: preselected entry was implicitly chosen via <space>|<enter>;
     * n == 2: another entry was explicitly chosen, so skip preselected one.
     */
    which = (n < 0) ? -1 : (n === 0) ? 1 : res.selected[0].item;
    if (n > 1 && which === 1)
        which = res.selected[1].item;

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
    case 5: /* map internals */
        throw new Error('doterrain(): wiz_map_levltyp() not ported yet');
    case 6: /* internal details */
        throw new Error('doterrain(): wiz_levltyp_legend() not ported yet');
    default:
        break;
    }
    return ECMD_OK; /* no time elapses */
}

// C ref: cmd.c accept_menu_prefix()
function accept_menu_prefix(ec) {
    return (ec && ((ec.flags & CMD_M_PREFIX) !== 0));
}

// C ref: do.c donull() -- '.' command: do nothing == rest
export async function donull() {
    if (await cmd_safety_prevention("Waiting", "a no-op (to rest)",
                                    "Are you waiting to get hit?",
                                    "did_nothing_flag"))
        return 0; /* ECMD_OK */
    return 1; /* ECMD_TIME: Do nothing, but let other things happen */
}

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

// C ref: cmd.c bind_key_fn()
function bind_key_fn(key, fn) {
    for (const extcmd of extcmdlist) {
        if (extcmd.ef_funct !== fn)
            continue;
        if ((extcmd.flags & INTERNALCMD) !== 0)
            continue;
        cmdbind_add(key, extcmd, false);
        return true;
    }

    return false;
}

// C ref: cmd.c cmdbind_add() -- bind->userbind is kept in the
// game.Cmd.userbinds set of keys
function cmdbind_add(key, extcmd, user) {
    const binds = game.Cmd.cmdbinds;
    const bind = binds.has(key & 0xff); /* cmdbind_get(key) */

    key &= 0xff;
    if (!key)
        return;
    if (!extcmd && bind) {
        cmdbind_remove(key);
        return;
    }

    /* binding exists, set it to this command (the list position is kept);
       otherwise a new binding goes at the head of C's list, which is the
       end of the Map's insertion order */
    binds.set(key, extcmd);
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

// C ref: cmd.c reset_commands()
/* called at startup (initial == TRUE) and whenever the number_pad option
   is set (initial == FALSE); back_dir_cmd[][], back_dir_key[][] and
   backed_dir_cmd are C's function statics, kept in game.Cmd */
const ndir = "47896321><",
      sdir_swap_yz = "hzkulnjb><",
      ndir_phone_layout = "41236987><";
const N_MOVEMODES = 3; /* MV_WALK, MV_RUN, MV_RUSH */
export function reset_commands(initial) {
    const C = (c) => (0x1f & c);
    const M = (c) => (0x80 | c);
    const ylist = [0x79, 0x59, C(0x79), M(0x79), M(0x59), M(C(0x79))];
    let flagtemp;
    let c, i, updated = 0;
    let dir, mode;

    if (initial) {
        updated = 1;
        game.Cmd = { cmdbinds: new Map(), userbinds: new Set(),
                     num_pad: false, pcHack_compat: false,
                     phone_layout: false, swap_yz: false, serialno: 0,
                     dirchars: sdir, alphadirchars: sdir,
                     back_dir_cmd: [], back_dir_key: [],
                     backed_dir_cmd: false };
        /* gc.Cmd.spkeys[] = spkeys_binds[]'s keys: the default bindings
           are used directly */
        commands_init();
    } else {
        const Cmd = game.Cmd;

        if (Cmd.backed_dir_cmd) {
            for (dir = 0; dir < N_DIRS; dir++) {
                for (mode = 0; mode < N_MOVEMODES; mode++) {
                    cmdbind_add(Cmd.back_dir_key[dir][mode],
                                Cmd.back_dir_cmd[dir][mode], false);
                }
            }
        }

        /* basic num_pad */
        flagtemp = !!game.iflags.num_pad;
        if (flagtemp !== Cmd.num_pad) {
            Cmd.num_pad = flagtemp;
            ++updated;
        }
        /* swap_yz mode (only applicable for !num_pad); intended for
           QWERTZ keyboard used in Central Europe, particularly Germany */
        flagtemp = (game.iflags.num_pad_mode & 1) ? !Cmd.num_pad : false;
        if (flagtemp !== Cmd.swap_yz) {
            Cmd.swap_yz = flagtemp;
            ++updated;
            /* FIXME? should Cmd.spkeys[] be scanned for y and/or z to swap?
               Cmd.swap_yz has been toggled;
               perform the swap (or reverse previous one) */
            for (i = 0; i < ylist.length; i++) {
                c = ylist[i] & 0xff;
                cmdbind_swapkeys(c, c + 1);
            }
        }
        /* MSDOS compatibility mode (only applicable for num_pad) */
        flagtemp = (game.iflags.num_pad_mode & 1) ? Cmd.num_pad : false;
        if (flagtemp !== Cmd.pcHack_compat) {
            Cmd.pcHack_compat = flagtemp;
            ++updated;
            /* pcHack_compat has been toggled */
            /* FIXME: NHKF_DOINV2 ought to be implemented instead of this */
            c = M(0x30) & 0xff;
            if (Cmd.pcHack_compat)
                cmdbind_add(c, ext_func_tab_from_func("dotypeinv"), false);
            else
                cmdbind_remove(c);
        }
        /* phone keypad layout (only applicable for num_pad) */
        flagtemp = (game.iflags.num_pad_mode & 2) ? Cmd.num_pad : false;
        if (flagtemp !== Cmd.phone_layout) {
            Cmd.phone_layout = flagtemp;
            ++updated;
            /* phone_layout has been toggled */
            for (i = 0; i < 3; i++) {
                c = 0x31 + i;             /* 1,2,3 <-> 7,8,9 */
                cmdbind_swapkeys(c, c + 6);
                c = (M(0x31) & 0xff) + i; /* M-1,M-2,M-3 <-> M-7,M-8,M-9 */
                cmdbind_swapkeys(c, c + 6);
            }
        }
    } /*?initial*/

    const Cmd = game.Cmd;
    /* choose updated movement keys */
    if (updated)
        Cmd.serialno++;
    Cmd.dirchars = !Cmd.num_pad
                   ? (!Cmd.swap_yz ? sdir : sdir_swap_yz)
                   : (!Cmd.phone_layout ? ndir : ndir_phone_layout);
    Cmd.alphadirchars = !Cmd.num_pad ? Cmd.dirchars : sdir;

    /* back up the commands & keys overwritten by new movement keys */
    for (dir = 0; dir < N_DIRS; dir++) {
        Cmd.back_dir_key[dir] = Cmd.back_dir_key[dir] || [];
        Cmd.back_dir_cmd[dir] = Cmd.back_dir_cmd[dir] || [];
        for (mode = 0 /* MV_WALK */; mode < N_MOVEMODES; mode++) {
            let di = Cmd.dirchars.charCodeAt(dir);
            let bind;

            if (!Cmd.num_pad) {
                if (mode === 1 /* MV_RUN */) di = highc(Cmd.dirchars[dir]).charCodeAt(0);
                else if (mode === 2 /* MV_RUSH */) di = C(di);
            } else {
                if (mode === 1 /* MV_RUN */) di = M(di);
                else if (mode === 2 /* MV_RUSH */) di = M(di);
            }
            Cmd.back_dir_key[dir][mode] = di;
            if ((bind = Cmd.cmdbinds.get(di)) !== undefined) /* cmdbind_get() */
                Cmd.back_dir_cmd[dir][mode] = bind;
            else
                Cmd.back_dir_cmd[dir][mode] = null;
            cmdbind_remove(di);
        }
    }
    Cmd.backed_dir_cmd = true;

    /* bind the new keys to movement commands */
    for (i = 0; i < N_DIRS; i++) {
        const di = Cmd.dirchars.charCodeAt(i);
        bind_key_fn(di, `do_move_${move_dirnames[i]}`);
        if (!Cmd.num_pad) {
            bind_key_fn(highc(Cmd.dirchars[i]).charCodeAt(0),
                        `do_run_${move_dirnames[i]}`);
            bind_key_fn(C(di), `do_rush_${move_dirnames[i]}`);
        } else {
            /* M(number) works when altmeta is on */
            bind_key_fn(M(di), `do_run_${move_dirnames[i]}`);
            /* can't bind highc() or C() of digits. just use the 5 prefix. */
        }
    }
    /* update_rest_on_space(): rest_on_space is off;
       Cmd.extcmd_char = cmd_from_func(doextcmd) is looked up when used */
}

// C ref: cmd.c ext_func_tab_from_func()
function ext_func_tab_from_func(fn) {
    return extcmdlist.find(e => e.ef_funct === fn) || null;
}

// C ref: cmd.c cmdbind_remove()
function cmdbind_remove(key) {
    game.Cmd.cmdbinds.delete(key & 0xff);
    game.Cmd.userbinds.delete(key & 0xff);
}

// C ref: cmd.c cmdbind_swapkeys() -- swap key bindings for key1 and key2;
// both bindings must exist
function cmdbind_swapkeys(key1, key2) {
    const binds = game.Cmd.cmdbinds;

    if (binds.has(key1) && binds.has(key2)) {
        /* bind1->key = key2; bind2->key = key1: the list order is kept */
        const entries = [...binds].map(([k, v]) =>
            [k === key1 ? key2 : k === key2 ? key1 : k, v]);
        const u1 = game.Cmd.userbinds.has(key1),
              u2 = game.Cmd.userbinds.has(key2);
        binds.clear();
        for (const [k, v] of entries)
            binds.set(k, v);
        game.Cmd.userbinds.delete(key1);
        game.Cmd.userbinds.delete(key2);
        if (u1) game.Cmd.userbinds.add(key2);
        if (u2) game.Cmd.userbinds.add(key1);
    }
}

// C ref: cmd.c commands_init() -- initialize all keyboard commands
function commands_init() {
    const C = (c) => (0x1f & c.charCodeAt(0));
    const M = (c) => (0x80 | c.charCodeAt(0));

    for (const ec of extcmdlist)
        if (ec.key)
            cmdbind_add(ec.key, ec, false);
    /* bind_mousebtn(): no mouse */

    /* number_pad */
    bind_key(C('l'), "redraw", false);
    bind_key('h'.charCodeAt(0), "help", false);
    bind_key('j'.charCodeAt(0), "jump", false);
    bind_key('k'.charCodeAt(0), "kick", false);
    bind_key('l'.charCodeAt(0), "loot", false);
    bind_key(C('n'), "annotate", false);
    bind_key('N'.charCodeAt(0), "name", false);
    bind_key('u'.charCodeAt(0), "untrap", false);
    bind_key('5'.charCodeAt(0), "run", false);
    bind_key(M('5'), "rush", false);
    bind_key('-'.charCodeAt(0), "fight", false);

    /* alt keys: */
    bind_key(M('O'), "overview", false);
    bind_key(M('2'), "twoweapon", false);
    bind_key(M('N'), "name", false);
}

// C ref: cmd.c cmdbind_get()
function cmdbind_get(key) {
    if (!game.Cmd)
        reset_commands(true); /* initoptions_init() */
    return game.Cmd.cmdbinds.get(key & 0xff) || null;
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

// C ref: cmd.c can_do_extcmd()
async function can_do_extcmd(extcmd) {
    const ecflags = extcmd.flags;

    if (game.luacore && nhcb_counts()[NHCB_CMD_BEFORE]) {
        /* lua_getglobal(gl.luacore, "nh_callback_run");
           nhl_pcall_handle(gl.luacore, 2, 1, "can_do_extcmd", NHLpa_panic) */
        const ok = await game.luacore.globals.nh_callback_run(
            nhcb_name[NHCB_CMD_BEFORE], extcmd.ef_txt);
        if (!ok) { /* !lua_toboolean(gl.luacore, -1) */
            return false;
        }
    }

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
                await custompline(`The ${tlist.ef_txt} command does not accept '${which}' prefix.`);
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
            if (tlist.f_text && !game.occupation && game.multi)
                set_occupation(fn, tlist.f_text, game.multi);
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
    await custompline(`Unknown command '${visctrl(key)}'.`); /* custompline(SUPPRESS_HISTORY) */
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
export const GC_NOFLAGS = 0, GC_SAVEHIST = 1, GC_CONDHIST = 2, GC_ECHOFIRST = 4;
/* C ref: global.h LARGEST_INT; integer.h AppendLongDigit() overflow
   limit -- the recorder's 64-bit LONG_MAX is beyond what a JS number
   holds exactly, but counts are capped by maxcount (LARGEST_INT) long
   before that matters */
const LARGEST_INT = 32767;
const LONG_MAX = Number.MAX_SAFE_INTEGER;

/* C ref: hack.h program_state.input_state values, significant during
   readchar(); get_count() expects digits then a command so parse() sets
   it to commandInp */
export const otherInp = 0, commandInp = 1, getposInp = 2, getdirInp = 3;

function program_state() {
    if (!game.program_state)
        game.program_state = {};
    return game.program_state;
}

// C ref: cmd.c pgetchar() -- courtesy of aeb@cwi.nl; the debug fuzzer
// isn't ported
async function pgetchar() {
    return await nhgetch();
}

// C ref: cmd.c readchar_core() -- a key is 0..255; a meta key (M-c) is
// the key with the 8th bit set; the readchar_queue, ^A do-again and
// mouse clicks aren't ported (an EOF/NUL is read as ESC by nhgetch)
async function readchar_core() {
    let sym = await nhgetch(); /* nh_poskey() */

    if (sym === 0x1b && game.iflags?.altmeta
        && program_state().input_state !== otherInp) {
        /* iflags.altmeta: treat two character ``ESC c'' as single `M-c' but
           only when we're called by parse() [possibly via get_count()]
           or getpos() [to support Alt+digit] or getdir() [for arrow keys
           under curses] */
        sym = await pgetchar();
        if (sym === 0)
            sym = 0x1b;
        else if (sym !== 0x1b)
            sym |= 0o200; /* force 8th bit on */
    }

    /* next readchar() will be for an ordinary char unless parse()
       sets this back to non-zero */
    program_state().input_state = otherInp;
    return sym & 0xff;
}

// C ref: cmd.c readchar() -- get a character
export async function readchar() {
    return await readchar_core();
}

// C ref: cmd.c readchar_poskey() -- used by getpos() to accept mouse input
// as well as keyboard input
export async function readchar_poskey() {
    program_state().input_state = getposInp;
    return await readchar_core();
}

/* C ref: cmd.c misc_keys[] -- special keys that aren't commands; the
   NHKF_COUNT ('n') entry is for number_pad only; key is
   gc.Cmd.spkeys[nhkf] with the default bindings */
const misc_keys = [
    { key: 0x1b, desc: "cancel current prompt or pending prefix", numpad: false },
    { key: 0x6e, /* NHKF_COUNT */
      desc: "Prefix: for digits when preceding a command with a count",
      numpad: true },
];

// C ref: cmd.c key2extcmddesc() -- the description of what a key does,
// or null
export function key2extcmddesc(key) {
    let key2cmdbuf = '';
    let cmdbind, txt;
    const M_5 = 0x80 | 0x35, M_0 = 0x80 | 0x30;
    const digit = (c) => (c >= 0x30 && c <= 0x39);

    key &= 0xff;
    /* need to check for movement commands before checking the extended
       commands table because it contains entries for number_pad commands
       that match !number_pad movement (like 'j' for "jump") */
    if (movecmd_mode(key, MV_WALK))
        key2cmdbuf = "move"; /* "move or attack"? */
    else if (movecmd_mode(key, MV_RUSH))
        key2cmdbuf = "rush";
    else if (movecmd_mode(key, MV_RUN))
        key2cmdbuf = "run";
    if (digit(key) || (game.Cmd.num_pad && digit(key & 0x7f /* unmeta() */))) {
        key2cmdbuf = '';
        if (!game.Cmd.num_pad)
            key2cmdbuf = "start of, or continuation of, a count";
        else if (key === 0x35 || key === M_5)
            key2cmdbuf = `${(!!game.Cmd.pcHack_compat !== (key === M_5))
                            ? "run" : "rush"} prefix`;
        else if (key === 0x30 || (game.Cmd.pcHack_compat && key === M_0))
            key2cmdbuf = "synonym for 'i'";
        if (key2cmdbuf)
            return key2cmdbuf;
    }
    /* check prefixes before regular commands; includes ^A pseudo-command */
    for (const mk of misc_keys) {
        if (mk.numpad && !game.iflags.num_pad)
            continue;
        if (key === mk.key)
            return mk.desc;
    }
    /* finally, check whether 'key' is a command */
    if ((cmdbind = cmdbind_get(key)) !== null
        && (txt = cmdbind.ef_txt)) {
        key2cmdbuf = `${cmdbind.ef_desc} (#${txt})`;

        /* special case: for reqmenu prefix (normally 'm'), replace
           "prefix: request menu or modify command (#reqmenu)"
           with two-line "movement prefix:...\nnon-movement prefix:..." */
        if (!strncmpi(key2cmdbuf, "prefix:", 7) && !strcmpi(txt, "reqmenu"))
            key2cmdbuf = key2cmdbuf.replace("prefix:",
                "movement prefix:"
                + " move without autopickup and without attacking"
                + "\n"
                + "non-movement prefix:"); /* strsubst(); and rest of buf */

        /* another special case: 'txt' for '#' is "#" and showing that as
           "perform an extended command (##)" looks silly; strip "(##)" off */
        return key2cmdbuf.replace(" (##)", ""); /* strsubst() */
    }
    return null;
}

// C ref: cmd.c key2txt()
export function key2txt(c) {
    /* should probably switch to "SPC", "ESC", "RET"
       since nethack's documentation uses ESC for <escape> */
    if (c === 0x20)
        return "<space>";
    else if (c === 0x1b)
        return "<esc>"; /* "<escape>" won't fit */
    else if (c === 0x0a)
        return "<enter>"; /* "<return>" won't fit */
    else if (c === 0o177)
        return "<del>"; /* "<delete>" won't fit */
    return visctrl(c);
}

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
    const save_input_state = program_state().input_state;

    game[countfield] = 0;
    for (;;) {
        if (inkey) {
            key = inkey;
            inkey = 0;
        } else {
            /* if readchar() has already been called in this loop, it will
               have reset input_state; put that back to its previous value */
            program_state().input_state = save_input_state;
            key = await readchar();
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
            await custompline(qbuf); /* custompline(SUPPRESS_HISTORY, "%s", qbuf) */
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

    /* affects readchar() behavior for ESC iff 'altmeta' option is On;
       is always reset to otherInp by readchar() */
    program_state().input_state = commandInp;

    if (!game.Cmd.num_pad
        || (foo = await readchar()) === 0x6e) { /* Cmd.spkeys[NHKF_COUNT] */
        /* if 'num_pad' is On then readchar() has just reset input_state;
           set it back to commandInp, so that get_count() supports 'altmeta';
           otherwise "n<count>ESC<character>" becomes "n<count>ESC" (with
           <character> not read from keyboard yet) rather than intended count
           and meta keystroke "n<count>M-<character>" */
        program_state().input_state = commandInp;

        foo = await get_count(null, 0, LARGEST_INT, 'command_count', GC_NOFLAGS);
    }
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
export function dxdy_moveok() {
    const u = game.u;
    if (u.dx && u.dy && u.umonnum === PM_GRID_BUG) /* NODIAG(u.umonnum) */
        u.dx = u.dy = 0;
    return !!(u.dx || u.dy);
}

// C ref: cmd.c cmd_from_dir()
/* C's move_funcs[dir][mode]: do_{move,run,rush}_<dir>, or dodown/doup
   for every mode */
export function cmd_from_dir(dir, mode) {
    const modename = ["move", "run", "rush"];
    return cmd_from_func(dir >= N_DIRS ? (dir === N_DIRS ? "dodown" : "doup")
                         : `do_${modename[mode]}_${move_dirnames[dir]}`);
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
            && !game.Cmd.num_pad)
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

// C ref: cmd.c cmd_from_ecname()
/* return the visual interpretation of the key bound to an extended command,
   or the ext cmd name if not bound to any key */
export function cmd_from_ecname(ecname) {
    let cmdnamebuf;

    for (const extcmd of extcmdlist)
        if (extcmd.ef_txt === ecname) {
            const key = cmd_from_func(extcmd.ef_funct);

            if (key)
                cmdnamebuf = `${visctrl(key)}`;
            else
                cmdnamebuf = `#${ecname}`;
            return cmdnamebuf;
        }

    cmdnamebuf = '';
    return cmdnamebuf;
}

// C ref: cmd.c show_direction_keys()
async function show_direction_keys(win, centerchar, nodiag) {
    let buf;
    const k = (fn) => visctrl(cmd_from_func(fn));

    if (!centerchar)
        centerchar = ' ';

    if (nodiag) {
        buf = `             ${k("do_move_north")}   `;
        await tty_putstr(win, 0, buf);
        await tty_putstr(win, 0, "             |   ");
        buf = `          ${k("do_move_west")}- ${centerchar} -${k("do_move_east")}`;
        await tty_putstr(win, 0, buf);
        await tty_putstr(win, 0, "             |   ");
        buf = `             ${k("do_move_south")}   `;
        await tty_putstr(win, 0, buf);
    } else {
        buf = `          ${k("do_move_northwest")}  ${k("do_move_north")}  ${k("do_move_northeast")}`;
        await tty_putstr(win, 0, buf);
        await tty_putstr(win, 0, "           \\ | / ");
        buf = `          ${k("do_move_west")}- ${centerchar} -${k("do_move_east")}`;
        await tty_putstr(win, 0, buf);
        await tty_putstr(win, 0, "           / | \\ ");
        buf = `          ${k("do_move_southwest")}  ${k("do_move_south")}  ${k("do_move_southeast")}`;
        await tty_putstr(win, 0, buf);
    }
}

// C ref: cmd.c keylist_func_has_key()
function keylist_func_has_key(extcmd, skip_keys_used) /* boolean keys_used[256] */ {
    let i;
    let bind;

    for (i = 0; i < 256; ++i) {
        if (skip_keys_used[i])
            continue;

        if (((bind = cmdbind_get(i)) !== null) && (bind === extcmd))
            return true;
    }
    return false;
}

// C ref: cmd.c keylist_putcmds() -- game.Cmd.cmdbinds maps a key straight
// to its extcmdlist[] entry (bind->cmd)
async function keylist_putcmds(datawin, docount, incl_flags, excl_flags,
                               keys_used) /* boolean keys_used[256] */ {
    let i;
    let buf;
    const keys_already_used = []; /* copy of keys_used[] before updates */
    let count = 0;
    let bind;

    for (i = 0; i < 256; i++) {
        const key = i;

        keys_already_used[i] = keys_used[i];
        if (keys_used[i])
            continue;
        if (key === 0x20 && !game.flags.rest_on_space)
            continue;
        bind = cmdbind_get(key);
        if (bind) {
            if ((incl_flags && !(bind.flags & incl_flags))
                || (excl_flags && (bind.flags & excl_flags)))
                continue;
            if (docount) {
                count++;
                continue;
            }
            if ((bind.flags & CMD_PARAM) !== 0)
                /* "%-7s %-13s %s \"%s\"" with bind->param */
                throw new Error('keylist_putcmds(): a key bound with a parameter not ported yet');
            else
                buf = `${key2txt(key).padEnd(7)} ${bind.ef_txt.padEnd(13)} ${bind.ef_desc}`;
            await tty_putstr(datawin, 0, buf);
            keys_used[i] = true;
        }
    }
    /* also list commands that lack key assignments; most are wizard mode */
    for (const extcmd of extcmdlist) {
        if ((incl_flags && !(extcmd.flags & incl_flags))
            || (excl_flags && (extcmd.flags & excl_flags)))
            continue;
        /* can't just check for non-Null extcmd->key; it holds the
           default assignment and a user-specified binding might hijack
           this command's default key for some other command; or this
           command might have been assigned a key being used for
           movement or as a prefix, intercepting that keystroke */
        if (keylist_func_has_key(extcmd, keys_already_used))
            continue;
        /* found a command for current category without any key assignment */
        if (docount) {
            count++;
            continue;
        }
        /* '#'+20 for one column here == 7+' '+13 for two columns above */
        buf = `#${extcmd.ef_txt.padEnd(20)} ${extcmd.ef_desc}`;
        await tty_putstr(datawin, 0, buf);
    }
    return count;
}

// C ref: cmd.c dokeylist() -- list all keys and their bindings, like
// dat/hh but dynamic; misc_keys[]' key is gc.Cmd.spkeys[nhkf]
export async function dokeylist() {
    let buf;
    let key;
    let spkey_gap;
    const keys_used = new Array(256).fill(false);
    const pfx_seen = new Array(256).fill(-1); /* -1: no special key seen */
    const wizard = !!game.flags.debug;

    /* this is actually ambiguous; tty raw mode will override SIGINT;
       when enabled, treat it like a movement command since assigning
       other commands to this keystroke would be unwise... */
    key = 0x03; /* C('c') */
    keys_used[key] = true;

    /* movement keys have been flagged in keys_used[]; clone them */
    const mov_seen = keys_used.slice();

    spkey_gap = false;
    for (let i = 0; i < misc_keys.length; ++i) {
        if (misc_keys[i].numpad && !game.iflags.num_pad)
            continue;
        key = misc_keys[i].key;
        if (key && !mov_seen[key] && pfx_seen[key] < 0) {
            keys_used[key] = true;
            pfx_seen[key] = i;
        } else
            spkey_gap = true;
    }

    const datawin = tty_create_nhwindow(NHW_TEXT);
    await tty_putstr(datawin, 0, "");
    buf = `${"".padStart(7)} ${"    Full Current Key Bindings List"}`;
    await tty_putstr(datawin, 0, buf);
    for (const extcmd of extcmdlist)
        if (spkey_gap || !keylist_func_has_key(extcmd, keys_used)) {
            buf = `${"".padStart(7)} ${"(also commands with no key assignment)"}`;
            await tty_putstr(datawin, 0, buf);
            break;
        }

    /* directional keys */
    await tty_putstr(datawin, 0, "");
    await tty_putstr(datawin, 0, "Directional keys:");
    await show_direction_keys(datawin, '.', false); /* '.'==self in direct'n grid */

    if (!game.iflags.num_pad) {
        await tty_putstr(datawin, 0, "");
        await tty_putstr(datawin, 0,
            "Ctrl+<direction> will run in specified direction until something very");
        buf = `${"".padStart(7)} ${"interesting is seen."}`;
        await tty_putstr(datawin, 0, buf);
        buf = "Shift"; /* append the rest below */
    } else {
        /* num_pad */
        await tty_putstr(datawin, 0, "");
        buf = "Meta"; /* append the rest next */
    }
    buf += "+<direction> will run in specified direction until you encounter";
    await tty_putstr(datawin, 0, buf);
    buf = `${"".padStart(7)} ${"an obstacle."}`;
    await tty_putstr(datawin, 0, buf);

    await tty_putstr(datawin, 0, "");
    await tty_putstr(datawin, 0, "Miscellaneous keys:");
    for (let i = 0; i < misc_keys.length; ++i) {
        if (misc_keys[i].numpad && !game.iflags.num_pad)
            continue;
        key = misc_keys[i].key;
        if (key && !mov_seen[key] && (pfx_seen[key] === i)) {
            buf = `${key2txt(key).padEnd(7)} ${misc_keys[i].desc}`;
            await tty_putstr(datawin, 0, buf);
        }
    }
    /* (see above) */
    key = 0x03; /* C('c') */
    /* last of the special keys (!NO_SIGNAL) */
    buf = key2txt(key).padEnd(7);
    buf += " interrupt: break out of NetHack (SIGINT)";
    await tty_putstr(datawin, 0, buf);
    /* keyless special key commands, if any */
    if (spkey_gap)
        /* "[%s]" spkey_name() lines */
        throw new Error('dokeylist(): keyless special keys not ported yet');

    const IGNORECMD = (WIZMODECMD | INTERNALCMD | MOVEMENTCMD);

    await tty_putstr(datawin, 0, "");
    await show_menu_controls_cm(datawin, true);

    if (await keylist_putcmds(datawin, true, GENERALCMD, IGNORECMD, keys_used)) {
        await tty_putstr(datawin, 0, "");
        await tty_putstr(datawin, 0, "General commands:");
        await keylist_putcmds(datawin, false, GENERALCMD,
                              IGNORECMD, keys_used);
    }

    if (await keylist_putcmds(datawin, true, 0, GENERALCMD | IGNORECMD, keys_used)) {
        await tty_putstr(datawin, 0, "");
        await tty_putstr(datawin, 0, "Game commands:");
        await keylist_putcmds(datawin, false, 0,
                              GENERALCMD | IGNORECMD,
                              keys_used);
    }

    if (wizard && await keylist_putcmds(datawin, true,
                                        WIZMODECMD, INTERNALCMD, keys_used)) {
        await tty_putstr(datawin, 0, "");
        await tty_putstr(datawin, 0, "Debug mode commands:");
        await keylist_putcmds(datawin, false,
                              WIZMODECMD, INTERNALCMD, keys_used);
    }

    await tty_display_nhwindow(datawin, false);
    await tty_destroy_nhwindow(datawin);
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
        const hsym = highc(String.fromCharCode(sym)); /* @A-Z[ (note: letter() accepts '@') */
        const ctrl = (hsym.charCodeAt(0) - 0x41) + 1; /* 0-27 (note: 28-31 aren't applicable) */
        let explain;
        if ((explain = dowhatdoes_core(ctrl)) !== null
            && (!wiz_only_list.includes(hsym) || game.flags?.debug)) {
            buf = `Are you trying to use ^${hsym}${wiz_only_list.includes(hsym) ? "" : " as specified in the Guidebook"}?`;
            tty_putstr(win, 0, buf);
            tty_putstr(win, 0, "");
            tty_putstr(win, 0, explain);
            tty_putstr(win, 0, "");
            tty_putstr(win, 0,
                       "To use that command, hold down the <Ctrl> key as a shift");
            buf = `and press the <${hsym}> key.`;
            tty_putstr(win, 0, buf);
            tty_putstr(win, 0, "");
        }
    }

    buf = `Valid direction keys${prefixhandling ? " to " : ""}${prefixhandling ? dothat : ""}${nodiag ? " in your current form" : ""} are:`;
    tty_putstr(win, 0, buf);
    await show_direction_keys(win, !prefixhandling ? '.' : ' ', nodiag);

    if (!prefixhandling) {
        tty_putstr(win, 0, "");
        tty_putstr(win, 0, "          <  up");
        tty_putstr(win, 0, "          >  down");
        /* selfi: NHKF_GETDIR_SELF2 's' with number_pad, else
           NHKF_GETDIR_SELF '.' */
        buf = `       ${visctrl((game.Cmd.num_pad ? 's' : '.').charCodeAt(0)).padStart(4)}  direct at yourself`;
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
// the mouse ('_') are ported for the parts reached so far
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

// C ref: cmd.c dotravel() -- '_' command, #travel, via keyboard rather
// than mouse click
async function dotravel() {
    const u = game.u;
    const iflags = game.iflags;
    const cc = { x: 0, y: 0 };

    /*
     * Traveling used to be a no-op if user toggled 'travel' option
     * Off.  However, travel was initially implemented as a mouse-only
     * command and the original purpose of the option was to be able
     * to prevent clicks on the map from initiating travel.
     *
     * Travel via '_' came later.  Since it requires a destination--
     * which offers the user a chance to cancel if it was accidental--
     * there's no reason for the option to disable travel-by-keys.
     */

    if (!iflags.travelcc)
        iflags.travelcc = { x: 0, y: 0 };
    cc.x = iflags.travelcc.x;
    cc.y = iflags.travelcc.y;
    if (cc.x === 0 && cc.y === 0) {
        /* No cached destination, start attempt from current position */
        cc.x = u.ux;
        cc.y = u.uy;
    }
    iflags.getloc_travelmode = true;
    if (iflags.menu_requested) {
        throw new Error('dotravel(): getpos_menu() (m_ travel) not ported yet');
    } else {
        await pline("Where do you want to travel to?");
        if ((await getpos(cc, true, "the desired destination")) < 0) {
            /* user pressed ESC */
            iflags.getloc_travelmode = false;
            return ECMD_CANCEL;
        }
    }
    iflags.travelcc.x = u.tx = cc.x;
    iflags.travelcc.y = u.ty = cc.y;

    return await dotravel_target();
}

// C ref: cmd.c dotravel_target() -- #retravel, travel to iflags.travelcc,
// which must be set
async function dotravel_target() {
    const u = game.u;
    const iflags = game.iflags;
    const ctx = game.context;

    if (!iflags.travelcc)
        iflags.travelcc = { x: 0, y: 0 };
    if (!isok(iflags.travelcc.x, iflags.travelcc.y)) {
        /* assume <0,0>, the value assigned when travel reaches destination */
        await pline("No travel destination set.");
        return ECMD_OK;
    } else if (u.ux === iflags.travelcc.x && u.uy === iflags.travelcc.y) {
        /* maybe interrupted while traveling then just walked rest of way
           so destination hasn't been reset yet */
        await You("are already here.");
        iflags.travelcc.x = iflags.travelcc.y = 0;
        return ECMD_OK;
    }

    iflags.getloc_travelmode = false;

    ctx.travel = 1;
    ctx.travel1 = 1;
    ctx.run = 8;
    ctx.nopick = 1;
    game.domove_attempting |= DOMOVE_RUSH;

    if (!game.multi)
        game.multi = Math.max(COLNO, ROWNO);
    u.last_str_turn = 0;
    ctx.mv = true;

    await domove();
    return ECMD_TIME;
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

    if (game.cmdq?.length) {
        const cmdq = game.cmdq.shift(); /* cmdq_pop() */
        if (cmdq.typ === 'dir') {
            if (!cmdq.dirz) {
                dirsym = game.Cmd.dirchars.charCodeAt(xytodir(cmdq.dirx, cmdq.diry));
            } else {
                /* gc.Cmd.dirchars[DIR_DOWN] '>' or [DIR_UP] '<' */
                dirsym = game.Cmd.dirchars.charCodeAt((cmdq.dirz > 0) ? N_DIRS : N_DIRS + 1);
            }
        } else if (cmdq.typ === 'key') {
            dirsym = cmdq.key.charCodeAt(0);
        } else {
            game.cmdq = []; /* cmdq_clear(CQ_CANNED) */
            dirsym = 0;
            impossible("getdir: command queue had no dir?");
        }
        /* goto got_dirsym */
    } else {
        program_state().input_state = getdirInp;
        dirsym = await tty_yn_function((s && s[0] !== '^') ? s : "In what direction?",
                                       null, '\0');
        if (typeof dirsym === 'string')
            dirsym = dirsym.charCodeAt(0);
        /* remove the prompt string so caller won't have to */
        tty_clear_nhwindow(game.WIN_MESSAGE);

        if (dirsym === 0x12) /* redraw_cmd(): ^R */
            throw new Error('getdir(): ^R redraw not ported yet');
        /* cmdq_add_key(CQ_REPEAT, dirsym): ^A repeat isn't ported */
    }

    /* got_dirsym: */

    const ch = String.fromCharCode(dirsym);
    if (ch === '.' || ch === 's') { /* NHKF_GETDIR_SELF, NHKF_GETDIR_SELF2 */
        u.dx = u.dy = u.dz = 0;
    } else if (ch === '_') { /* NHKF_GETDIR_MOUSE */
        const iflags = game.iflags;
        const cc = { x: 0, y: 0 };
        let pos, mod;

        /*
         * For #therecmdmenu:
         * Player has entered the 'simulated mouse' key ('_' by default)
         * at the "which direction?" prompt so we use getpos() to get a
         * simulated click after moving cursor to the desired location.
         *
         * getpos() returns 0..3 for period, comma, semi-colon, colon.
         * We treat "," as left click and "." as right click due to
         * their positions relative to each other on the keyboard.
         * Using ";" as synonym for "," and ":" for "." is due to their
         * shapes rather than to their keyboard location.
         */
        const qbuf = `desired location, then type '${
            visctrl(','.charCodeAt(0)) /* gc.Cmd.spkeys[NHKF_GETPOS_PICK_Q] */}' for left click, '${
            visctrl('.'.charCodeAt(0)) /* gc.Cmd.spkeys[NHKF_GETPOS_PICK] */}' for right`;
        cc.x = u.ux, cc.y = u.uy; /* starting cursor location for getpos() */
        pos = await getpos(cc, true, qbuf);

        if (pos < 0) {
            /* ESC or other rejection */
            u.dx = u.dy = u.dz = 0;
            mod = 0; /* neither CLICK_1 nor CLICK_2 */
        } else {
            /* caller expects simulated click to be relative to hero's spot */
            u.dx = cc.x - u.ux;
            u.dy = cc.y - u.uy;
            /* non-zero getdir_click actually means ok to click farther than
               one spot away from hero; adjacent click is always allowed */
            if (!iflags.getdir_click) {
                u.dx = sgn(u.dx);
                u.dy = sgn(u.dy);
            }
            u.dz = 0;

            switch (pos) { /* pos + NHKF_GETPOS_PICK */
            case 1: /* NHKF_GETPOS_PICK_Q: quick:   ',' */
            case 2: /* NHKF_GETPOS_PICK_O: once:    ';' */
                mod = CLICK_1;
                break;
            case 0: /* NHKF_GETPOS_PICK: normal:  '.' */
            case 3: /* NHKF_GETPOS_PICK_V: verbose: ':' */
                mod = CLICK_2;
                break;
            default:
                /* could plug in bound values for spkeys[NHKF_GETPOS_PICK],&c
                   but that feels like overkill for something which should
                   never happen; just show their default values */
                impossible(`getpos successful but not one of [.,;:] (${pos})`);
                mod = 0; /* neither CLICK_1 nor CLICK_2 */
                pos = -1; /* return failure */
                break;
            }
        }
        if (iflags.getdir_click)
            iflags.getdir_click = mod;
        return (pos >= 0) ? 1 : 0;
    } else if (!(is_mov = movecmd_mode(dirsym, MV_ANY)) && !u.dz) {
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
