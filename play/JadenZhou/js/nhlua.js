// nhlua.js — NetHack's Lua interface: creating Lua states, loading Lua
// scripts, the "nh" dice functions, and the table accessors C code uses to
// read Lua data.
// C ref: nhlua.c — nhl_init, nhlL_newstate, nhl_loadlua, nhl_done, nhl_error,
// nhl_rn2, nhl_random, l_nhcore_init, l_nhcore_done, l_nhcore_call,
// get_table_int, get_table_int_opt, get_table_str,
// get_table_str_opt, get_table_option.
//
// The JS port has no Lua interpreter. The scripts in dat/ are hand-ported to
// JS modules (nhlib_lua.js, dungeon_lua.js, ...). Each exports a function
// that runs the script's top-level chunk against a Lua state, and
// nhl_loadlua() runs it by file name, as C loads the file from the dlb.
//
// A Lua state is a plain object; its global table is L.globals. A Lua table
// is a JS array when it is a sequence (Lua index i is JS index i - 1) or a
// JS object when it is a hash. nil is undefined.
//
// C reads Lua tables through the Lua stack: lua_getfield(L, -1, name) on the
// table at the top. The JS port passes that table itself where C has it on
// top of the stack, so C's get_table_int(L, "base") is
// get_table_int(tbl, "base") here.
//
// Dice: C's nhl_rn2() and nhl_random() tag each roll with the calling Lua
// function and line, read from the Lua stack (nhl_rnglog_set_lua_caller()).
// JS has no Lua stack to read, so ported Lua code makes those calls inside
// withRngCaller('<tag>', ...) (rng.js) with the tag C records.
//
// Not ported yet (no dice in the code that runs so far): the Lua standard
// libraries, the sandbox limits, and the rest of the nh table, nhc, u,
// selection, des and obj (init_nhc_data, init_u_data, l_selection_register,
// l_register_des, l_obj_register).

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { TRUE, FALSE, NHL_SB_SAFE, NON_PM, G_GENOD } from './const.js';
import * as C from './const.js';
import { nhlib_lua } from './nhlib_lua.js';
import { dungeon_lua } from './dungeon_lua.js';
import { nhcore_lua } from './nhcore_lua.js';
import { themerms_lua } from './themerms_lua.js';
import { tty_create_nhwindow, tty_start_menu, add_menu_str, tty_end_menu,
         tty_select_menu, tty_destroy_nhwindow } from './wintty.js';
import { quest_lua } from './quest_lua.js';
import { oracle_lua } from './oracle_lua.js';
import { bigrm_lua_files } from './bigrm_lua.js';
import { quest_level_lua_files } from './questlev_lua.js';
import { soko_lua_files } from './soko_lua.js';
import { tower_lua_files } from './tower_lua.js';
import { mines_lua_files } from './mines_lua.js';
import { valley_lua_files } from './valley_lua.js';
import { medusa_lua_files } from './medusa_lua.js';
import { castle_lua_files } from './castle_lua.js';
import { name_to_mon } from './mondata.js';
import { l_register_des, get_coord, cvt_to_abscoord } from './sp_lev.js';
import { l_selection_register } from './selvar.js';
import { l_obj_register, nhl_get_timertype } from './nhlobj.js';
import { level_difficulty, depth } from './dungeon.js';
import { Invocation_lev } from './mklev.js';
import { NUMMONS, HIGH_PM } from './monsters.js';
import { FIRST_OBJECT, NUM_OBJECTS } from './objects.js';
import { hellfill_lua_files } from './hellfill_lua.js';
import { wizard_lua_files } from './wizard_lua.js';
import { sanctum_lua_files } from './sanctum_lua.js';
import { knox_lua_files } from './knox_lua.js';
import { lairs_lua_files } from './lairs_lua.js';
import { endgame_lua_files } from './endgame_lua.js';

// C's impossible() (pline.c) is not ported yet.
function impossible(msg) { console.error(`impossible: ${msg}`); }
function panic(msg) { throw new Error(`panic: ${msg}`); }

// Lua basic types (lua.h), as lua_type() returns them.
export const LUA_TNIL = 0;
export const LUA_TBOOLEAN = 1;
export const LUA_TNUMBER = 3;
export const LUA_TSTRING = 4;
export const LUA_TTABLE = 5;
export const LUA_TFUNCTION = 6;
export const LUA_TUSERDATA = 7;

// A full userdata (lua_newuserdata()) with its metatable: the JS port's
// stand-in for C structs handed to Lua (e.g. struct _lua_obj).
export class LuaUserdata {
    constructor(metatable, fields) {
        this.metatable = metatable;
        Object.assign(this, fields);
    }
}

// lauxlib.h luaL_checkudata() — the userdata at 'v' if its metatable is
// the one registered as 'tname'
export function luaL_checkudata(v, tname) {
    if (!(v instanceof LuaUserdata) || v.metatable?.__name !== tname)
        lua_error(`${tname} expected, got ${lua_typename(v)}`);
    return v;
}

// Lua method call syntax: ud:name(...) looks up 'name' through the
// userdata's metatable __index and calls it with ud as first argument.
export function lua_callmeth(ud, name, ...args) {
    const index = (ud instanceof LuaUserdata) ? ud.metatable?.__index : null;
    const fn = index ? index[name] : undefined;
    if (typeof fn !== 'function')
        lua_error(`attempt to call a nil value (method '${name}')`);
    return fn(ud, ...args);
}

// A Lua error raised by ported code (C: lua_error()). The protected calls in
// nhl_loadlua() catch it, as lua_pcall() would.
export class LuaError extends Error {}

export function lua_error(msg) {
    throw new LuaError(msg);
}

// lua.h lua_type()
export function lua_type(v) {
    if (v === undefined || v === null) return LUA_TNIL;
    if (v instanceof LuaUserdata) return LUA_TUSERDATA;
    switch (typeof v) {
    case 'boolean': return LUA_TBOOLEAN;
    case 'number': return LUA_TNUMBER;
    case 'string': return LUA_TSTRING;
    case 'function': return LUA_TFUNCTION;
    default: return LUA_TTABLE;
    }
}

function lua_typename(v) {
    return ['nil', 'boolean', 'userdata', 'number', 'string', 'table',
            'function', 'userdata'][lua_type(v)];
}

// Lua's binary | and & operators on userdata (lvm.c luaT_trybinTM()):
// call the __bor / __band metamethod of the first operand that has one.
function lua_arith_tm(a, b, event) {
    const tm = (a instanceof LuaUserdata && a.metatable?.[event])
        || (b instanceof LuaUserdata && b.metatable?.[event]);
    if (typeof tm !== 'function')
        lua_error((event === '__add' || event === '__sub'
                   ? 'attempt to perform arithmetic on a '
                   : 'attempt to perform bitwise operation on a ')
                  + `${lua_typename(a)} value`);
    return tm(a, b);
}
export function lua_bor(a, b) { return lua_arith_tm(a, b, '__bor'); }
export function lua_band(a, b) { return lua_arith_tm(a, b, '__band'); }
export function lua_bxor(a, b) { return lua_arith_tm(a, b, '__bxor'); }
// Lua's binary + and - (lvm.c luaO_arith(), else luaT_trybinTM() with
// __add / __sub)
export function lua_add(a, b) {
    if (typeof a === 'number' && typeof b === 'number') return a + b;
    return lua_arith_tm(a, b, '__add');
}
export function lua_sub(a, b) {
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    return lua_arith_tm(a, b, '__sub');
}

// lua.h lua_istable()
export function lua_istable(v) {
    return lua_type(v) === LUA_TTABLE;
}

// lua.h lua_len() on a sequence: the # operator.
export function lua_len(tbl) {
    return tbl.length;
}

// lauxlib.h luaL_checkinteger()
export function luaL_checkinteger(v) {
    if (typeof v === 'number' && Number.isInteger(v)) return v;
    if (typeof v === 'string' && v.trim() !== '' && Number.isInteger(Number(v)))
        return Number(v);
    if (typeof v === 'number')
        lua_error('number has no integer representation');
    lua_error(`number expected, got ${lua_typename(v)}`);
}

// lauxlib.h luaL_checkstring() — numbers convert to strings.
export function luaL_checkstring(v) {
    if (typeof v === 'string') return v;
    if (typeof v === 'number') return String(v);
    lua_error(`string expected, got ${lua_typename(v)}`);
}

// lauxlib.h luaL_optstring()
export function luaL_optstring(v, def) {
    return lua_type(v) === LUA_TNIL ? def : luaL_checkstring(v);
}

// lauxlib.h luaL_checkoption() — index of the string v in lst (C's lst is
// NULL-terminated; here it is a plain array).
export function luaL_checkoption(v, def, lst) {
    const name = def ? luaL_optstring(v, def) : luaL_checkstring(v);
    const i = lst.indexOf(name);
    if (i >= 0) return i;
    lua_error(`invalid option '${name}'`);
}

// C ref: nhlua.c nhl_error()
export function nhl_error(L, msg) {
    lua_error(msg);
}

// C ref: nhlua.c char2typ[]
const char2typ = [
    [' ', C.STONE],
    ['#', C.CORR],
    ['.', C.ROOM],
    ['-', C.HWALL],
    ['-', C.TLCORNER],
    ['-', C.TRCORNER],
    ['-', C.BLCORNER],
    ['-', C.BRCORNER],
    ['-', C.CROSSWALL],
    ['-', C.TUWALL],
    ['-', C.TDWALL],
    ['-', C.TLWALL],
    ['-', C.TRWALL],
    ['-', C.DBWALL],
    ['|', C.VWALL],
    ['+', C.DOOR],
    ['A', C.AIR],
    ['C', C.CLOUD],
    ['S', C.SDOOR],
    ['H', C.SCORR],
    ['{', C.FOUNTAIN],
    ['\\', C.THRONE],
    ['K', C.SINK],
    ['}', C.MOAT],
    ['P', C.POOL],
    ['L', C.LAVAPOOL],
    ['Z', C.LAVAWALL],
    ['I', C.ICE],
    ['W', C.WATER],
    ['T', C.TREE],
    ['F', C.IRONBARS], /* Fe = iron */
    ['x', C.MAX_TYPE], /* "see-through" */
    ['B', C.CROSSWALL], /* hack: boundary location */
    ['w', C.MATCH_WALL], /* IS_STWALL() */
];

// C ref: nhlua.c splev_chr2typ()
export function splev_chr2typ(c) {
    for (const [ch, typ] of char2typ)
        if (c === ch)
            return typ;
    return C.INVALID_TYPE;
}

// C ref: nhlua.c check_mapchr()
export function check_mapchr(s) {
    if (s && s.length === 1)
        return splev_chr2typ(s[0]);
    return C.INVALID_TYPE;
}

// C ref: nhlua.c get_table_mapchr()
export function get_table_mapchr(tbl, name) {
    const ter = get_table_str(tbl, name);
    const typ = check_mapchr(ter);
    if (typ === C.INVALID_TYPE)
        nhl_error(null, 'Erroneous map char');
    return typ;
}

// C ref: nhlua.c get_table_mapchr_opt()
export function get_table_mapchr_opt(tbl, name, defval) {
    const ter = get_table_str_opt(tbl, name, '');
    let typ;
    if (ter) {
        typ = check_mapchr(ter);
        if (typ === C.INVALID_TYPE)
            nhl_error(null, 'Erroneous map char');
    } else
        typ = defval;
    return typ;
}

// C ref: nhlua.c get_table_int()
/* get mandatory integer value from table */
export function get_table_int(tbl, name) {
    return luaL_checkinteger(tbl[name]);
}

// C ref: nhlua.c get_table_int_opt()
/* get optional integer value from table */
export function get_table_int_opt(tbl, name, defval) {
    let ret = defval;
    const v = tbl[name];
    if (lua_type(v) !== LUA_TNIL) {
        ret = luaL_checkinteger(v);
    }
    return ret;
}

// C ref: nhlua.c get_table_str()
export function get_table_str(tbl, name) {
    return luaL_checkstring(tbl[name]);
}

// C ref: nhlua.c get_table_str_opt()
/* get optional string value from table. */
export function get_table_str_opt(tbl, name, defval) {
    let ret;
    const v = tbl[name];
    const ltyp = lua_type(v);

    if (ltyp === LUA_TSTRING || ltyp === LUA_TNIL) {
        ret = luaL_optstring(v, defval);
    } else if (ltyp === LUA_TFUNCTION) {
        ret = luaL_optstring(v(), defval);
    } else {
        nhl_error(null, 'get_table_str_opt: no string');
    }
    if (ret !== undefined && ret !== null)
        return ret;
    return null;
}

// C ref: nhlua.c get_table_option()
/* opts[] is a null-terminated list */
export function get_table_option(tbl, name, defval, opts) {
    return luaL_checkoption(tbl[name], defval, opts);
}

// C ref: nhlua.c nhl_rn2()
/* rn2(10) */
function nhl_rn2(...args) {
    if (args.length === 1) {
        const range = luaL_checkinteger(args[0]);
        /* nhl_rnglog_set_lua_caller(L, "nh.rn2"): the ported Lua caller
           supplies the tag through withRngCaller() */
        return rn2(range);
    }
    nhl_error(null, 'Wrong args');
}

// C ref: nhlua.c nhl_random()
/* random(10);  -- is the same as rn2(10); */
/* random(5,8); -- same as 5 + rn2(8); */
function nhl_random(...args) {
    if (args.length === 1) {
        const range = luaL_checkinteger(args[0]);
        return rn2(range);
    } else if (args.length === 2) {
        const base = luaL_checkinteger(args[0]);
        const range = luaL_checkinteger(args[1]);
        return base + rn2(range);
    }
    nhl_error(null, 'Wrong args');
}

// C ref: nhlua.c nhl_impossible()
/* impossible("Error!") */
function nhl_impossible(...args) {
    if (args.length === 1)
        impossible(luaL_checkstring(args[0]));
    else
        nhl_error(null, 'Wrong args');
    return 0;
}

// C ref: nhlua.c nhl_level_difficulty()
/* local difficulty = nh.level_difficulty() */
function nhl_level_difficulty(...args) {
    if (args.length === 0) {
        return level_difficulty();
    } else {
        nhl_error(null, 'level_difficulty should not have any args');
    }
}

// C ref: nhlua.c nhl_get_debug_themerm_name()
/* local debug_themerm = nh.debug_themerm(is_fill) */
function nhl_get_debug_themerm_name(...args) {
    if (args.length === 1) {
        /* THEMERM / THEMERMFILL are read from the environment only in
           wizard mode; the JS port has no environment to read, so this is
           always nil */
        return undefined;
    }
    nhl_error(null, 'Wrong args');
}

// C ref: nhlua.c nhl_get_xy_params()
/* x,y from the arguments (x, y) or ({x, y}); null if neither */
function nhl_get_xy_params(args) {
    const argc = args.length;
    let ret = null;

    if (argc === 2) {
        ret = { x: Math.trunc(Number(args[0]) || 0),
                y: Math.trunc(Number(args[1]) || 0) }; /* lua_tointeger */
    } else if (argc === 1 && lua_type(args[0]) === LUA_TTABLE) {
        ret = get_coord(args[0]);
    }
    return ret;
}

// C ref: timeout.h timer_is_pos()
function timer_is_pos(ttype) { return ttype === 'MELT_ICE_AWAY'; }

// C ref: timeout.c spot_stop_timers() -- the timer queue is not ported
// yet; like obj.timer (nhlobj.js), a location's pending level timer is
// kept in levl[x][y].timer = { when, action }
function spot_stop_timers(x, y, func_index) {
    const lev = game.level.at(x, y);
    if (lev.timer && lev.timer.action === func_index)
        lev.timer = null; /* no cleanup function for MELT_ICE_AWAY */
}

// C ref: nhlua.c nhl_timer_start_at()
/* start timer at location x,y */
/* nh.start_timer_at(x,y, "melt-ice", 10); */
function nhl_timer_start_at(...args) {
    const timertype = nhl_get_timertype(args[args.length - 2]);
    const when = Math.trunc(Number(args[args.length - 1]) || 0); /* lua_tointeger */

    const xy = nhl_get_xy_params(args.slice(0, args.length - 2));
    if (!xy) {
        nhl_error(null, 'nhl_timer_start_at: Wrong args');
        /*NOTREACHED*/
        return 0;
    }

    cvt_to_abscoord(xy);
    const x = xy.x, y = xy.y;

    if (timer_is_pos(timertype) && C.isok(x, y)) {
        spot_stop_timers(x, y, timertype);
        /* start_timer(when, TIMER_LEVEL, MELT_ICE_AWAY, long_to_any(where)) */
        game.level.at(x, y).timer = { when, action: timertype };
    }
    return 0;
}

// C ref: nhlua.c nhl_text()
/* text("foo\nbar\nbaz") -- show the lines in a menu window */
async function nhl_text(...args) {
    const argc = args.length;

    if (argc > 0) {
        const tmpwin = tty_create_nhwindow(C.NHW_MENU);
        tty_start_menu(tmpwin, C.MENU_BEHAVE_STANDARD);

        while (args.length > 0) {
            const str = String(args.shift()); /* luaL_checkstring(L, 1) */
            const lstr = str.length - 1;
            let pos = 0;

            do {
                const nlp = str.indexOf('\n', pos);
                let ptr;

                if (nlp >= 0 && (nlp - pos) <= 76) {
                    ptr = nlp;
                } else {
                    ptr = pos + 76;
                    if (ptr > lstr)
                        ptr = lstr;
                }
                while ((ptr > pos) && !(str[ptr] === ' ' || str[ptr] === '\n'))
                    ptr--;
                /* *ptr = '\0' */
                add_menu_str(tmpwin, str.slice(pos, ptr));
                pos = ptr + 1;
            } while (pos < str.length && pos <= lstr);
        }

        tty_end_menu(tmpwin, null);
        await tty_select_menu(tmpwin, C.PICK_NONE);
        await tty_destroy_nhwindow(tmpwin);
    }
    return 0;
}

// C ref: nhlua.c nhl_is_genocided()
/* local is_genocided = nh.is_genocided("vampire"); */
function nhl_is_genocided(...args) {
    if (args.length === 1) {
        const paramstr = luaL_checkstring(args[0]);
        const mgend = { v: 0 };
        const i = name_to_mon(paramstr, mgend);

        return ((i !== NON_PM)
                && (game.mvitals[i].mvflags & G_GENOD)) ? TRUE : FALSE;
    } else {
        nhl_error(null, 'Wrong args');
    }
    return undefined;
}

// C ref: nhlua.c nhl_functions[] — the "nh" table. Only some functions
// are ported so far.
const nhl_functions = {
    is_genocided: nhl_is_genocided,
    impossible: nhl_impossible,
    rn2: nhl_rn2,
    random: nhl_random,
    level_difficulty: nhl_level_difficulty,
    debug_themerm: nhl_get_debug_themerm_name,
    start_timer_at: nhl_timer_start_at,
    text: nhl_text,
};

// The hand-ported Lua scripts by file name: the files nhl_loadlua() can
// open (C: dlb_fopen() on the nhdat container).
const nhl_lua_files = {
    'nhlib.lua': nhlib_lua,
    'dungeon.lua': dungeon_lua,
    'nhcore.lua': nhcore_lua,
    'themerms.lua': themerms_lua,
    'quest.lua': quest_lua,
    'oracle.lua': oracle_lua,
};

// the file's chunk, if it's one of the hand-ported scripts (the level
// script tables are read at call time: their modules import this one)
function nhl_lua_file(fname) {
    if (Object.hasOwn(nhl_lua_files, fname))
        return nhl_lua_files[fname];
    if (Object.hasOwn(bigrm_lua_files, fname))
        return bigrm_lua_files[fname];
    if (Object.hasOwn(quest_level_lua_files, fname))
        return quest_level_lua_files[fname];
    if (Object.hasOwn(soko_lua_files, fname))
        return soko_lua_files[fname];
    if (Object.hasOwn(tower_lua_files, fname))
        return tower_lua_files[fname];
    if (Object.hasOwn(mines_lua_files, fname))
        return mines_lua_files[fname];
    if (Object.hasOwn(valley_lua_files, fname))
        return valley_lua_files[fname];
    if (Object.hasOwn(medusa_lua_files, fname))
        return medusa_lua_files[fname];
    if (Object.hasOwn(castle_lua_files, fname))
        return castle_lua_files[fname];
    if (Object.hasOwn(hellfill_lua_files, fname))
        return hellfill_lua_files[fname];
    if (Object.hasOwn(wizard_lua_files, fname))
        return wizard_lua_files[fname];
    if (Object.hasOwn(sanctum_lua_files, fname))
        return sanctum_lua_files[fname];
    if (Object.hasOwn(knox_lua_files, fname))
        return knox_lua_files[fname];
    if (Object.hasOwn(lairs_lua_files, fname))
        return lairs_lua_files[fname];
    if (Object.hasOwn(endgame_lua_files, fname))
        return endgame_lua_files[fname];
    return null;
}

// C ref: nhlua.c nhl_meta_u_index()
/* the u table's __index: read a hero field. u.inventory (nhl_push_obj
   of the hero's inventory chain) stops explicitly. */
function nhl_meta_u_index(tkey) {
    const u = game.u;
    /* nhl_push_anything(): ANY_UCHAR and ANY_SCHAR read one byte */
    const uchar = (v) => (v ?? 0) & 0xff;
    const schar = (v) => ((((v ?? 0) & 0xff) ^ 0x80) - 0x80);
    const ustruct = {
        ux: () => uchar(u.ux),
        uy: () => uchar(u.uy),
        dx: () => schar(u.dx),
        dy: () => schar(u.dy),
        dz: () => schar(u.dz),
        tx: () => uchar(u.tx),
        ty: () => uchar(u.ty),
        ulevel: () => u.ulevel,
        ulevelmax: () => u.ulevelmax,
        uhunger: () => u.uhunger,
        nv_range: () => u.nv_range,
        xray_range: () => u.xray_range,
        umonster: () => u.umonster,
        umonnum: () => u.umonnum,
        mh: () => u.mh,
        mhmax: () => u.mhmax,
        mtimedone: () => u.mtimedone,
        dlevel: () => u.uz.dlevel,
        dnum: () => u.uz.dnum,
        uluck: () => u.uluck,
        uhp: () => u.uhp,
        uhpmax: () => u.uhpmax,
        uen: () => u.uen,
        uenmax: () => u.uenmax,
    };
    if (Object.hasOwn(ustruct, tkey))
        return ustruct[tkey]();

    if (tkey === 'role') {
        return game.urole.name.m;
    } else if (tkey === 'moves') {
        return game.moves;
    } else if (tkey === 'uhave_amulet') {
        return u.uhave?.amulet ? 1 : 0;
    } else if (tkey === 'depth') {
        return depth(u.uz);
    } else if (tkey === 'invocation_level') {
        return Invocation_lev(u.uz) ? true : false;
    }
    if (tkey === 'inventory')
        nhl_error(null, `u.${tkey} is not ported yet`);

    nhl_error(null, 'Unknown u table index');
    /*NOTREACHED*/
    return undefined;
}

// C ref: nhlua.c nhl_consts[]
function nhl_consts() {
    return [
        ['COLNO', C.COLNO],
        ['ROWNO', C.ROWNO],
        ['NUMMONS', NUMMONS],
        ['LOW_PM', C.LOW_PM],
        ['HIGH_PM', HIGH_PM],
        ['FIRST_OBJECT', FIRST_OBJECT],
        ['LAST_OBJECT', NUM_OBJECTS - 1],
        ['DLB', 0], /* the recorder is built without DLB (config.h) */
    ];
}

// C ref: nhlua.c init_nhc_data()
/* register and init the constants table */
function init_nhc_data(L) {
    const nhc = {};

    for (const [name, value] of nhl_consts())
        nhc[name] = value;

    L.globals.nhc = nhc;
}

// C ref: nhlua.c init_u_data()
/* the global 'u' table; its metatable reads hero fields on access and
   refuses writes. The u.clear_inventory/u.giveobj functions are not
   ported yet. */
function init_u_data(L) {
    L.globals.u = new Proxy({}, {
        get(_t, k) {
            if (typeof k !== 'string') return undefined;
            if (k === 'clear_inventory' || k === 'giveobj')
                nhl_error(null, `u.${k} is not ported yet`);
            return nhl_meta_u_index(k);
        },
        set() {
            nhl_error(null, 'Cannot set u table values');
            return false;
        },
    });
}

// C ref: nhlua.c nhlL_newstate()
// The sandbox memory and instruction limits (nhl_user_data) are not
// modelled; the state keeps its id and name for error messages.
function nhlL_newstate(sbi, name) {
    let sid = 0;
    if (sbi.memlimit || sbi.steps || sbi.perpcall) {
        if (game.lua_sid === undefined) game.lua_sid = 0;
        sid = ++game.lua_sid;
    }
    return { globals: {}, sbi, name, sid };
}

// C ref: nhlua.c nhl_loadlua()
/* read lua code/data from a dlb module or an external file
   into a string buffer and feed that to lua */
export function nhl_loadlua(L, fname) {
    let ret = TRUE;
    const chunk = nhl_lua_file(fname);

    if (!chunk) {
        /* C opens every dat/ file; only the hand-ported ones exist here */
        throw new Error(`nhl_loadlua(): ${fname} not ported yet`);
    }
    /* luaL_loadbuffer() + nhl_pcall_handle(L, 0, LUA_MULTRET, fname,
       NHLpa_impossible) */
    try {
        chunk(L);
    } catch (e) {
        if (!(e instanceof LuaError)) throw e;
        if (/not ported yet/.test(e.message))
            throw new Error(e.message);
        impossible(`Lua error: ${L.sid}:${L.name || '(unknown)'} ${e.message}`);
        ret = FALSE;
    }
    return ret;
}

// C ref: nhlua.c nhl_init()
export function nhl_init(sbi) {
    const L = nhlL_newstate(sbi, 'nhl_init');
    if (!L) return null;

    if (!game.iflags) game.iflags = {};
    game.iflags.in_lua = TRUE;

    /* register nh -table, and functions for it */
    L.globals.nh = { ...nhl_functions };

    init_nhc_data(L);

    /* init u -table */
    init_u_data(L);
    l_selection_register(L);
    l_register_des(L);
    l_obj_register(L);

    /* nhlib.lua assumes the math table exists. */
    if (lua_type(L.globals.math) !== LUA_TTABLE) {
        L.globals.math = {};
    }

    if (!nhl_loadlua(L, 'nhlib.lua')) {
        nhl_done(L);
        return null;
    }

    return L;
}

// C ref: nhlua.c load_lua()
export function load_lua(name, sbi) {
    let ret = TRUE;
    const L = nhl_init(sbi);

    give_up: {
        if (!L) {
            ret = FALSE;
            break give_up;
        }

        if (!nhl_loadlua(L, name)) {
            ret = FALSE;
            break give_up;
        }
    }
    /* give_up: */
    nhl_done(L);

    return ret;
}

// nhlua.h NHL_pcall_action
export const NHLpa_panic = 0;
export const NHLpa_impossible = 1;

// C ref: nhlua.c nhl_pcall_handle()
// Calls fn(...args) as lua_pcall() would. A Lua error is reported as C
// reports it; panic() is not ported, so NHLpa_panic reports it like
// NHLpa_impossible does. Returns nonzero on error.
export function nhl_pcall_handle(L, fn, args, name, npa) {
    try {
        fn(...args);
    } catch (e) {
        if (!(e instanceof LuaError)) throw e;
        /* a des.* or nh.* function the port lacks raised the Lua error;
           C would have run it, so stop instead of dropping the error */
        if (/not ported yet/.test(e.message))
            throw new Error(e.message);
        /* XXX can we get a lua stack trace as well? */
        switch (npa) {
        case NHLpa_panic:
            panic(`Lua error ${L.sid}:${L.name || '(unknown)'} ${e.message}`);
            /*NOTREACHED*/
            break;
        case NHLpa_impossible:
            impossible(`Lua error: ${L.sid}:${L.name || '(unknown)'} ${e.message}`);
            /* Drop the error.  If the caller cares, use nhl_pcall(). */
        }
        return 1;
    }
    return 0;
}

// C ref: nhlua.c nhl_done()
export function nhl_done(L) {
    if (L) {
        /* lua_close(L) */
        L.globals = null;
    }
}

// C ref: nhlua.c nhcore_call_names[NUM_NHCORE_CALLS]
const nhcore_call_names = [
    "start_new_game",
    "restore_old_game",
    "moveloop_turn",
    "game_exit",
    "getpos_tip",
    "enter_tutorial",
    "leave_tutorial",
];
const NUM_NHCORE_CALLS = nhcore_call_names.length;

// C ref: nhlua.c l_nhcore_init()
/* create a Lua state that lasts until end of game */
export function l_nhcore_init() {
    const sbi = { flags: NHL_SB_SAFE, memlimit: 1 * 1024 * 1024, steps: 0,
                  perpcall: 1 * 1024 * 1024 };

    /* nhcore_call_available[] is a static array in C */
    game.nhcore_call_available = new Array(NUM_NHCORE_CALLS).fill(FALSE);
    if ((game.luacore = nhl_init(sbi)) !== null) {
        if (!nhl_loadlua(game.luacore, "nhcore.lua")) {
            game.luacore = null;
        } else {
            let i;

            for (i = 0; i < NUM_NHCORE_CALLS; i++)
                game.nhcore_call_available[i] = TRUE;
        }
    } else
        impossible("l_nhcore_init failed");
}

// C ref: nhlua.c l_nhcore_done()
export function l_nhcore_done() {
    if (game.luacore) {
        nhl_done(game.luacore);
        game.luacore = null;
    }
    /* end_luapat(); -- the file-pattern Lua state is not ported yet */
}

// C ref: nhlua.c l_nhcore_call()
export async function l_nhcore_call(callidx) {
    const L = game.luacore;

    if (callidx < 0 || callidx >= NUM_NHCORE_CALLS || !L
        || !game.nhcore_call_available[callidx])
        return;

    const nhcore = L.globals.nhcore; /* lua_getglobal(gl.luacore, "nhcore") */
    if (!lua_istable(nhcore)) {
        /*impossible("nhcore is not a lua table");*/
        nhl_done(L);
        game.luacore = null;
        return;
    }

    const fn = nhcore[nhcore_call_names[callidx]];
    if (lua_type(fn) === LUA_TFUNCTION) {
        /* nhl_pcall_handle(gl.luacore, 0, 1, "l_nhcore_call", NHLpa_panic) */
        await fn();
    } else {
        /*impossible("nhcore.%s is not a lua function",
          nhcore_call_names[callidx]);*/
        game.nhcore_call_available[callidx] = FALSE;
    }
}
