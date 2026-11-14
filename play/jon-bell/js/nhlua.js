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
import { AIR, BLCORNER, BRCORNER, CLOUD, CORR, CROSSWALL, DBWALL, DOOR, FOUNTAIN, HWALL, ICE, INVALID_TYPE, IRONBARS, LAVAPOOL, LAVAWALL, MATCH_WALL, MAX_TYPE, MOAT, POOL, ROOM, SCORR, SDOOR, SINK, STONE, TDWALL, THRONE, TLCORNER, TLWALL, TRCORNER, TREE, TRWALL, TUWALL, VWALL, WATER } from './const.js'; // relocate-fns
import { get_coord } from './sp_lev.js'; // relocate-fns
import { impossible_cmd } from './cmd.js';
import { freeinv, useupall } from './invent.js'; // relocate-fns
import { LEVITATION } from './const.js'; // relocate-fns
import { init_uhunger } from './eat.js'; // relocate-fns
import { copy_you } from './game.js'; // relocate-fns
import { addinv_nomerge } from './invent.js'; // relocate-fns
import { update_inventory } from './invent.js'; // relocate-fns
import { extract_nobj } from './mkobj.js'; // relocate-fns
import { pline } from './pline.js'; // relocate-fns
import { obfree } from './shk.js'; // relocate-fns
import { MAXSPELL } from './spell.js'; // relocate-fns
import { setnotworn, setworn } from './worn.js'; // relocate-fns

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
    const win = new TtyMenu({ overlay: !(game.iflags?.menu_overlay === false || game.iflags?.menu_overlay === 0) }); /* wintty.c:1927 */
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

const char2typ = [
    { ch: ' ', typ: STONE },
    { ch: '#', typ: CORR },
    { ch: '.', typ: ROOM },
    { ch: '-', typ: HWALL },
    { ch: '-', typ: TLCORNER },
    { ch: '-', typ: TRCORNER },
    { ch: '-', typ: BLCORNER },
    { ch: '-', typ: BRCORNER },
    { ch: '-', typ: CROSSWALL },
    { ch: '-', typ: TUWALL },
    { ch: '-', typ: TDWALL },
    { ch: '-', typ: TLWALL },
    { ch: '-', typ: TRWALL },
    { ch: '-', typ: DBWALL },
    { ch: '|', typ: VWALL },
    { ch: '+', typ: DOOR },
    { ch: 'A', typ: AIR },
    { ch: 'C', typ: CLOUD },
    { ch: 'S', typ: SDOOR },
    { ch: 'H', typ: SCORR },
    { ch: '{', typ: FOUNTAIN },
    /* C nhlua.c has `{ '\\', THRONE }` — ONE backslash. The two-character
     * form this used to hold could never equal a single map character, so
     * knox.lua:48 `des.terrain(43,09, "\\")` resolved to INVALID_TYPE; it is
     * only reachable at all now that the lexer decodes `"\\"` to one byte. */
    { ch: '\\', typ: THRONE },
    { ch: 'K', typ: SINK },
    { ch: '}', typ: MOAT },
    { ch: 'P', typ: POOL },
    { ch: 'L', typ: LAVAPOOL },
    { ch: 'Z', typ: LAVAWALL },
    { ch: 'I', typ: ICE },
    { ch: 'W', typ: WATER },
    { ch: 'T', typ: TREE },
    { ch: 'F', typ: IRONBARS }, // Fe = iron
    { ch: 'x', typ: MAX_TYPE }, // "see-through"
    { ch: 'B', typ: CROSSWALL }, // hack: boundary location
    { ch: 'w', typ: MATCH_WALL }, // IS_STWALL()
    { ch: '\0', typ: STONE },
];

function splev_chr2typ(c) {
    for (let i = 0; char2typ[i].ch; i++) {
        if (c === char2typ[i].ch)
            return char2typ[i].typ;
    }
    return INVALID_TYPE;
}

// check_mapchr helper (static to this module)
export function check_mapchr(s) {
    if (s && s.length === 1)
        return splev_chr2typ(s[0]);
    return INVALID_TYPE;
}

export function get_table_int_opt(args, name, defval) {
    const v = args.get(name);
    if (v == null) return defval;
    return Number(v);
}

export function get_table_str_opt(args, name, defval) {
    const v = args.get(name);
    if (v == null || v === '') return defval;
    return String(v);
}

// C ref: nhlua.c get_table_str(L, name) — required string field (no
// default; not reached by tut-1/tut-2, which always supply "text").
export function get_table_str(args, name) {
    const v = args.get(name);
    return (v == null) ? '' : String(v);
}

export function get_table_mapchr_opt(args, name, defval) {
    const v = args.get(name);
    if (v == null || v === '') return defval;
    const s = String(v);
    if (s.length === 0) return defval;
    const typ = check_mapchr(s);
    if (typ === INVALID_TYPE)
        throw new Error('Erroneous map char');
    return typ;
}

// boolean_opt: accepts Lua booleans AND 0/1 like C
export function get_table_boolean_opt(args, name, defval) {
    const v = args.get(name);
    if (v == null) return defval;
    const t = typeof v;
    if (t === 'boolean') return v ? 1 : 0;
    if (t === 'number') {
        const n = Number(v);
        if (n === 0 || n === 1) return n;
        throw new Error('Expected a boolean');
    }
    if (t === 'string') {
        const s = String(v).toLowerCase();
        if (s === 'true' || s === 'yes') return 1;
        if (s === 'false' || s === 'no') return 0;
        throw new Error('Expected a boolean');
    }
    throw new Error('Expected a boolean');
}

// get_table_option: map string through allowed list → index (like luaL_checkoption)
export function get_table_option(args, name, defval, opts) {
    const v = args.get(name);
    const s = (v != null) ? String(v) : defval;
    for (let i = 0; opts[i] != null; i++) {
        if (s === opts[i]) return i;
    }
    return 0; // default to first option if not found (C's luaL_checkoption behavior)
}

// C ref: nhlua.c:2391-2411 load_lua(): fresh state, run the file, nhl_done.
// Returns FALSE when the file cannot be loaded (ret value is ignored by
// wiz_load_lua, wizcmds.c:368).
export async function load_lua(name) {
    let ret = true;
    const L = await nhl_init();
    if (!L) {
        ret = false;
    } else if (!(await nhl_loadlua(L, name))) {
        ret = false;
    }
    await nhl_done(L);
    return ret;
}

/** C ref: nhlua.c:508-525 nhl_get_xy_params(L, x, y).
 *  `args` is the (already argc==1-table-checked-by-caller-excluded) remaining
 *  positional arg list. Returns {ok,x,y}; C ignores the return value at this
 *  callsite, so ok=false leaves x,y at the caller's -1,-1 sentinel default —
 *  same as C leaving *x,*y untouched. */
export function nhl_get_xy_params(args) {
    if (args.length === 2)
        return { ok: true, x: Number(args[0]), y: Number(args[1]) };
    if (args.length === 1 && args[0] && args[0].type === 'table') {
        const c = get_coord(args[0]);
        return { ok: true, x: c.x, y: c.y };
    }
    return { ok: false, x: -1, y: -1 };
}

/** C ref: nhlua.c:1171-1179 get_table_int(L, name) — required integer field,
 *  throws if absent/non-numeric (no defval, unlike get_table_int_opt). */
export function get_table_int(args, name) {
    const v = args.get(name);
    if (v == null)
        throw new Error(`wrong parameters (missing "${name}")`);
    return Number(v);
}

/** C ref: nhlua.c:243-255 get_table_mapchr(L, name) — required (non-opt)
 *  mapchar lookup, distinct from the EXISTING get_table_mapchr_opt
 *  (js/sp_lev.js:134, which takes a defval). Shared with lspo_terrain
 *  (port-lspo-terrain-w2-001) — defined here, reused there, not redefined. */
export function get_table_mapchr(args, name) {
    const ter = get_table_str(args, name);
    const typ = check_mapchr(ter);
    if (typ === INVALID_TYPE)
        throw new Error('Erroneous map char');
    return typ;
}

// C nhlua.c:1722. Save by value only what C stores by value. Inventory and
// monster pointers retain their identity; all inventory effects use the
// shared C-shaped helpers in their original order.
export async function nhl_gamestate(reststate = false) {
    const g = game, gg = g.gg;
    let wornmask, otmp;

    if (reststate && gg.gmst_stored) {
        const cur_uz = { ...g.u.uz }, cur_uz0 = { ...g.u.uz0 };

        g.moves = gg.gmst_moves;
        g._botlPaintedMoves = null;
        await pline(`Resetting time to move #${g.moves}.`);
        gg.gmst_moves = 0;

        g._lastinvnr = 51;
        while (g.invent)
            await useupall(g.invent);
        /* float_down()'s botl flush (trap.c:4054) runs inside the useupall loop,
         * so the status shown at the "You float gently" --More-- already lacks
         * Lev even though the rest of the painted hero predates the memcpy. */
        g._tutorialLevSnap = { ...g.u.uprops?.[LEVITATION] };
        while ((otmp = gg.gmst_invent) != null) {
            wornmask = otmp.owornmask;
            otmp.owornmask = 0;
            extract_nobj(otmp, gg, 'gmst_invent');
            await addinv_nomerge(otmp);
            if (wornmask)
                await setworn(otmp, wornmask);
        }
        if (!gg.gmst_ubak || !gg.gmst_disco || !gg.gmst_mvitals)
            throw new Error('nhl_gamestate: missing saved state');
        copy_you(gg.gmst_ubak, g.u);
        g._disco = Object.fromEntries(Object.entries(gg.gmst_disco).map(([k, v]) => [k, v.slice()]));
        g.mvitals = Object.fromEntries(Object.entries(gg.gmst_mvitals).map(([k, v]) => [k, { ...v }]));
        // objects[].oc_name_known is not part of svd.disco. C retains the
        // current knowledge bits, but frees every player-assigned type name.
        for (const otyp of Object.keys(g._oc_uname || {}))
            delete g._oc_uname[otyp];
        g.u.uz = cur_uz;
        g.u.uz0 = cur_uz0;
        init_uhunger();
        await free_tutorial();
        gg.gmst_stored = false;
        g.spl_book = gg.gmst_spl_book.map(v => ({ ...v }));
    } else if (!reststate && !gg.gmst_stored) {
        gg.gmst_moves = g.moves;
        while ((otmp = g.invent) != null) {
            wornmask = otmp.owornmask;
            setnotworn(otmp);
            freeinv(otmp);
            otmp.owornmask = wornmask;
            otmp.nobj = gg.gmst_invent;
            gg.gmst_invent = otmp;
        }
        g._lastinvnr = 51;
        gg.gmst_ubak = copy_you(g.u);
        gg.gmst_disco = Object.fromEntries(Object.entries(g._disco || {}).map(([k, v]) => [k, v.slice()]));
        gg.gmst_mvitals = Object.fromEntries(Object.entries(g.mvitals || {}).map(([k, v]) => [k, { ...v }]));
        gg.gmst_spl_book = Array.from({ length: MAXSPELL + 1 }, (_, i) => ({
            sp_id: g.spl_book?.[i]?.sp_id || 0,
            sp_lev: g.spl_book?.[i]?.sp_lev || 0,
            sp_know: g.spl_book?.[i]?.sp_know || 0,
        }));
        g.spl_book = Array.from({ length: MAXSPELL + 1 }, () => ({ sp_id: 0, sp_lev: 0, sp_know: 0 }));
        gg.gmst_stored = true;
    } else {
        impossible_cmd('nhl_gamestate: inconsistent state (%s vs %s)',
            reststate ? 'restore' : 'save', gg.gmst_stored ? 'already stored' : 'not stored');
    }
    update_inventory();
    return 0;
}

// C nhlua.c:1809. This releases dynamic storage, not the stored flag, clock,
// or inline spell array. On normal restore the inventory has already moved.
export async function free_tutorial() {
    const gg = game.gg;
    let otmp;
    while ((otmp = gg.gmst_invent) != null) {
        extract_nobj(otmp, gg, 'gmst_invent');
        otmp.owornmask = 0;
        await obfree(otmp, null);
    }
    gg.gmst_ubak = null;
    gg.gmst_disco = null;
    gg.gmst_mvitals = null;
}
