// nhcore_lua.js — hand port of dat/nhcore.lua, the script loaded into the
// Lua state that lasts the whole game (l_nhcore_init()).
// C ref: dat/nhcore.lua
//
// The chunk only defines globals; it rolls no dice. Its functions are
// ported as far as their callees exist: those needing parts of the nh
// table that aren't ported yet (nh.dump_fmtstr, nh.dnum_name, nh.pline,
// io, u) raise a Lua error when called. nhlib.lua's table_stringify is
// not ported yet either (see nhlib_lua.js).

import { lua_error, lua_type, LUA_TTABLE } from './nhlua.js';

// C ref: dat/nhcore.lua (top-level chunk)
export function nhcore_lua(L) {
    const G = L.globals;

    // -- Data in nh_lua_variables table can be set and queried with nh.variable()
    // -- This table is saved and restored along with the game.
    G.nh_lua_variables = {};

    // -- wrapper to simplify calling from nethack core
    // function get_variables_string()
    G.get_variables_string = function get_variables_string() {
        if (!G.table_stringify)
            lua_error("attempt to call a nil value (global 'table_stringify')");
        return "nh_lua_variables=" + G.table_stringify(G.nh_lua_variables) + ";";
    };

    // function nh_callback_set(cb, fn)
    G.nh_callback_set = function nh_callback_set(cb, fn) {
        const cbname = "_CB_" + cb;

        if (lua_type(G.nh_lua_variables[cbname]) !== LUA_TTABLE) {
            G.nh_lua_variables[cbname] = {};
        }
        G.nh_lua_variables[cbname][fn] = true;
    };

    // function nh_callback_rm(cb, fn)
    G.nh_callback_rm = function nh_callback_rm(cb, fn) {
        const cbname = "_CB_" + cb;

        if (lua_type(G.nh_lua_variables[cbname]) !== LUA_TTABLE) {
            G.nh_lua_variables[cbname] = {};
        }
        delete G.nh_lua_variables[cbname][fn]; /* = nil */
    };

    // function nh_callback_run(cb, ...)
    // (async: a callback may print, e.g. tutorial_turn's nh.pline)
    G.nh_callback_run = async function nh_callback_run(cb, ...args) {
        const cbname = "_CB_" + cb;

        if (lua_type(G.nh_lua_variables[cbname]) !== LUA_TTABLE) {
            G.nh_lua_variables[cbname] = {};
        }
        for (const k of Object.keys(G.nh_lua_variables[cbname])) {
            if (!(await G[k](...args))) {
                return false;
            }
        }
        return true;
    };

    // -- This is an example of generating an external file during gameplay,
    // -- which is updated periodically.
    // -- Intended for public servers using dgamelaunch as their login manager.
    // local prev_dgl_extrainfo = 0;
    // function mk_dgl_extrainfo()
    G.mk_dgl_extrainfo = function mk_dgl_extrainfo() {
        /* needs u.moves, nh.dump_fmtstr, nh.dnum_name and io.open */
        lua_error('mk_dgl_extrainfo: u, nh.dump_fmtstr and io are not ported yet');
    };

    // -- Show a helpful tip when player first uses getpos()
    // function show_getpos_tip()
    G.show_getpos_tip = async function show_getpos_tip() {
        /* a Lua [[long string]] drops the newline right after [[ */
        await G.nh.text(`Tip: Farlooking or selecting a map location

You are now in a "farlook" mode - the movement keys move the cursor,
not your character.  Game time does not advance.  This mode is used
to look around the map, or to select a location on it.

When in this mode, you can press ESC to return to normal game mode,
and pressing ? will show the key help.
`);
    };

    // -- Callback functions
    G.nhcore = {
        // -- start_new_game called once, when starting a new game
        // -- after "Welcome to NetHack" message has been given.
        // -- start_new_game = function() nh.pline("NEW GAME!"); end,

        // -- restore_old_game called once, when restoring a saved game
        // -- after "Welcome back to NetHack" message has been given.
        // -- restore_old_game = function() nh.pline("RESTORED OLD GAME!"); end,

        // -- moveloop_turn is called once per turn.
        // -- moveloop_turn = mk_dgl_extrainfo,

        // -- game_exit is called when the game exits (quit, saved, ...)
        // -- game_exit = function() end,

        // -- getpos_tip is called the first time the code enters getpos()
        getpos_tip: G.show_getpos_tip,

        // -- enter_tutorial and leave_tutorial
        enter_tutorial: G.tutorial_enter,
        leave_tutorial: G.tutorial_leave,
    };
}
