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
import { TRUE, FALSE, NHL_SB_SAFE } from './const.js';
import * as C from './const.js';
import { nhlib_lua } from './nhlib_lua.js';
import { dungeon_lua } from './dungeon_lua.js';
import { nhcore_lua } from './nhcore_lua.js';
import { themerms_lua } from './themerms_lua.js';
import { quest_lua } from './quest_lua.js';
import { l_register_des } from './sp_lev.js';
import { l_selection_register } from './selvar.js';
import { l_obj_register } from './nhlobj.js';
import { level_difficulty } from './dungeon.js';

// C's impossible() (pline.c) is not ported yet.
function impossible(msg) { console.error(`impossible: ${msg}`); }

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

// C ref: nhlua.c nhl_functions[] — the "nh" table. Only some functions
// are ported so far.
const nhl_functions = {
    impossible: nhl_impossible,
    rn2: nhl_rn2,
    random: nhl_random,
    level_difficulty: nhl_level_difficulty,
    debug_themerm: nhl_get_debug_themerm_name,
};

// The hand-ported Lua scripts by file name: the files nhl_loadlua() can
// open (C: dlb_fopen() on the nhdat container).
const nhl_lua_files = {
    'nhlib.lua': nhlib_lua,
    'dungeon.lua': dungeon_lua,
    'nhcore.lua': nhcore_lua,
    'themerms.lua': themerms_lua,
    'quest.lua': quest_lua,
};

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
    const altfname = `(${fname})`;
    const chunk = Object.hasOwn(nhl_lua_files, fname) ? nhl_lua_files[fname] : null;

    if (!chunk) {
        impossible(`nhl_loadlua: Error opening ${altfname}`);
        ret = FALSE;
        return ret;
    }
    /* luaL_loadbuffer() + nhl_pcall_handle(L, 0, LUA_MULTRET, fname,
       NHLpa_impossible) */
    try {
        chunk(L);
    } catch (e) {
        if (!(e instanceof LuaError)) throw e;
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

    /* init_nhc_data(L), init_u_data(L): not ported yet */
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
        if (npa === NHLpa_panic)
            impossible(`(panic) Lua error ${L.sid}:${L.name || '(unknown)'} ${e.message}`);
        else
            impossible(`Lua error: ${L.sid}:${L.name || '(unknown)'} ${e.message}`);
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
export function l_nhcore_call(callidx) {
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
        fn();
    } else {
        /*impossible("nhcore.%s is not a lua function",
          nhcore_call_names[callidx]);*/
        game.nhcore_call_available[callidx] = FALSE;
    }
}
