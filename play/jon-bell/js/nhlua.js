// Core Lua lifetime and callbacks: frozen v5 src/nhlua.c and decl.c.
// Lua execution belongs to the authored interpreter; callback bodies remain
// the actual dat/nhcore.lua / nhlib.lua functions, not JS approximations.
import { game } from './gstate.js';
import { createLevelLuaState } from './lua/nh_state.js';
import { LuaTable } from './lua/interp.js';
import { tokenize } from './lua/lexer.js';
import { parse } from './lua/parser.js';
import { dat_content } from './dat_source.js';
import { impossible } from './pline.js';
import { TtyMenu, PICK_NONE } from './tty_menu.js';
import { l_obj_gc } from './nhlobj.js';
import { nhlib_load_toplevel_rng } from './nhlib.js';
import { registerStaticReset } from './statics.js';

// Existing version-query boundary; its throwaway version-only Lua state is
// still represented by nhlib's top-level RNG helper, independently of core.
let lua_ver = '', lua_copyright = '';
export function get_lua_version() {
    if (!lua_ver) {
        nhlib_load_toplevel_rng();
        lua_ver = '5.4.8';
        lua_copyright = 'Lua 5.4.8  Copyright (C) 1994-2025 Lua.org, PUC-Rio';
    }
    return lua_ver;
}
export function nhl_lua_ver() { return lua_ver; }
export function nhl_lua_copyright() { return lua_copyright; }
export function nhl_reset_lua_version() { lua_ver = ''; lua_copyright = ''; }
registerStaticReset('nhlua.js: gl.lua_ver / gl.lua_copyright', nhl_reset_lua_version);

export const NHCORE_START_NEW_GAME = 0, NHCORE_RESTORE_OLD_GAME = 1,
    NHCORE_MOVELOOP_TURN = 2, NHCORE_GAME_EXIT = 3, NHCORE_GETPOS_TIP = 4,
    NHCORE_ENTER_TUTORIAL = 5, NHCORE_LEAVE_TUTORIAL = 6;
export const NHCB_CMD_BEFORE = 0, NHCB_LVL_ENTER = 1,
    NHCB_LVL_LEAVE = 2, NHCB_END_TURN = 3;
export const nhcore_call_names = ['start_new_game', 'restore_old_game',
    'moveloop_turn', 'game_exit', 'getpos_tip', 'enter_tutorial', 'leave_tutorial'];
export const nhcb_name = ['cmd_before', 'level_enter', 'level_leave', 'end_turn'];
export const lua_toboolean = value => value !== null && value !== undefined && value !== false;
export const lua_isfunction = value => typeof value === 'function' || value?.type === 'function';
export function lua_checkstring(value) {
    if (typeof value !== 'string' && typeof value !== 'number')
        throw new Error('Lua string expected');
    return String(value);
}

export async function nhl_init() {
    (game.iflags ||= {}).in_lua = true;
    const L = await createLevelLuaState();
    return L;
}

export async function nhl_done(L) {
    if (L) {
        for (const lo of L.objectRefs || []) await l_obj_gc(lo);
        L.objectRefs?.clear();
        L.close();
    }
    (game.iflags ||= {}).in_lua = false;
}

export async function nhl_loadlua(L, name) {
    /* dat_content() is called OUTSIDE any catch on purpose: a "this name
     * differs between 3.7 and 5.0 and was never vendored" throw must not be
     * laundered into C's benign "cannot open" arm below. */
    const source = dat_content(name);
    if (source === null) {
        await impossible('nhl_loadlua: Error opening (%s)', name);
        return false;
    }
    await L.run(parse(tokenize(source)));
    return true;
}

export async function l_nhcore_init() {
    const gl = (game.gl ||= {});
    gl.luacore = await nhl_init();
    if (gl.luacore) {
        if (!(await nhl_loadlua(gl.luacore, 'nhcore.lua'))) {
            gl.luacore = null;
        } else {
            game.nhcore_call_available = nhcore_call_names.map(() => true);
        }
    } else {
        await impossible('l_nhcore_init failed');
    }
}

export async function l_nhcore_done() {
    if (game.gl?.luacore) {
        await nhl_done(game.gl.luacore);
        game.gl.luacore = null;
    }
    // C also releases its luapat regex allocations. The JS pattern engine
    // has no corresponding native allocation pool.
}

export async function l_nhcore_call(callidx) {
    const L = game.gl?.luacore;
    if (callidx < 0 || callidx >= nhcore_call_names.length || !L
        || !game.nhcore_call_available[callidx])
        return;
    const nhcore = L.getGlobal('nhcore');
    if (!(nhcore instanceof LuaTable)) {
        await nhl_done(L);
        game.gl.luacore = null;
        return;
    }
    const fn = nhcore.get(nhcore_call_names[callidx]);
    if (lua_isfunction(fn)) {
        await L.callFunction(null, fn, []);
    } else {
        game.nhcore_call_available[callidx] = false;
    }
}

export async function nhl_callback(...args) {
    const L = game.gl?.luacore;
    if (!L) throw new Error('panic: nh luacore not inited');
    const argc = args.length;
    if (argc === 2 || argc === 3) {
        const rm = argc === 3 ? lua_toboolean(args[2]) : false;
        const fn = lua_checkstring(args[1]), cb = lua_checkstring(args[0]);
        const i = nhcb_name.indexOf(cb);
        if (i < 0) return;
        if (rm) {
            game.nhcb_counts[i]--;
            if (game.nhcb_counts[i] < 0)
                await impossible('nh.callback counts are wrong');
        } else {
            game.nhcb_counts[i]++;
        }
        await L.callFunction(null, L.getGlobal(rm ? 'nh_callback_rm' : 'nh_callback_set'), [cb, fn]);
    }
}

// Shared spelling of the four identical C caller arms. The real Lua dispatcher
// decides truth and ordering; a nonzero count is deliberately not a Set size.
export async function nh_callback_run(callback, ...args) {
    const L = game.gl?.luacore;
    if (!L || !game.nhcb_counts[callback]) return true;
    return L.callFunction(null, L.getGlobal('nh_callback_run'), [nhcb_name[callback], ...args]);
}

export async function tutorial(enter) {
    await l_nhcore_call(enter ? NHCORE_ENTER_TUTORIAL : NHCORE_LEAVE_TUTORIAL);
    if (!enter) {
        game.nhcore_call_available[NHCORE_ENTER_TUTORIAL] = false;
        game.nhcore_call_available[NHCORE_LEAVE_TUTORIAL] = false;
    }
}

export async function nhl_variable(L, ...args) {
    const core = game.gl?.luacore;
    if (!core) throw new Error('panic: nh luacore not inited');
    const variables = core.getGlobal('nh_lua_variables');
    if (!(variables instanceof LuaTable)) {
        await impossible('nh_lua_variables is not a lua table');
        return;
    }
    if (args.length !== 1 && args.length !== 2) throw new Error('Wrong number of arguments');
    const key = lua_checkstring(args[0]);
    const value = args.length === 1 ? variables.get(key) : args[1];
    if (value instanceof LuaTable) {
        if (args.length === 1) {
            const text = await core.callFunction(null, core.getGlobal('nh_get_variables_string'), [value]);
            return L.run(parse(tokenize(text)));
        }
        const text = await L.callFunction(null, L.getGlobal('nh_set_variables_string'), [key, value]);
        await core.run(parse(tokenize(text)));
    } else if (value == null || ['string', 'boolean', 'number'].includes(typeof value)) {
        const scalar = typeof value === 'number' ? (Number.isInteger(value) ? value : 0) : value ?? null;
        if (args.length === 1) return scalar;
        variables.set(key, scalar);
    } else {
        throw new Error(`Cannot ${args.length === 1 ? 'get' : 'set'} variable of that type`);
    }
}

export async function get_nh_lua_variables() {
    const L = game.gl?.luacore;
    if (!L) throw new Error('panic: nh luacore not inited');
    const fn = L.getGlobal('get_variables_string');
    return lua_isfunction(fn) ? L.callFunction(null, fn, []) : null;
}

export async function restore_luadata(text) {
    if (!game.gl?.luacore) await l_nhcore_init();
    await game.gl.luacore.run(parse(tokenize(text)));
}

// C nhl_text's line splitting and argument consumption, including repeatedly
// reading argument 1 while popping the last argument.
export async function nhl_text(...args) {
    if (!args.length) return;
    const win = new TtyMenu({ overlay: true });
    while (args.length) {
        const text = lua_checkstring(args[0]);
        let start = 0;
        const last = text.length - 1;
        do {
            const nl = text.indexOf('\n', start);
            let end = nl >= 0 && nl - start <= 76 ? nl : Math.min(start + 76, last);
            while (end > start && text[end] !== ' ' && text[end] !== '\n') end--;
            win.add_menu_str(text.slice(start, end));
            start = end + 1;
        } while (start < text.length);
        args.pop();
    }
    win.end_menu(null);
    await win.select_menu(PICK_NONE);
}
