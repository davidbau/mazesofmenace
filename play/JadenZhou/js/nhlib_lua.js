// nhlib_lua.js — hand port of dat/nhlib.lua, the library every new Lua
// state loads: nhl_init() runs it before anything else.
// C ref: dat/nhlib.lua
//
// Running the chunk defines the library functions in the state's globals
// and shuffles the global 'align' table. So every new Lua state (the
// dungeon description, the core state, each special level, themed rooms)
// makes those two dice rolls first.
//
// Roll tags: C tags a Lua-side roll with the two innermost Lua frames,
// "<fn> src=<file>:<line> parent=<caller>(<file>:<line>)". The function
// calling nh.rn2/nh.random here is always math.random ("random"), at line 8
// (one argument, nh.rn2) or line 10 (two arguments, nh.random). The parent
// is the Lua function that called math.random and the line of that call, so
// each call site below wraps its math.random call in withRngCaller() with
// its own tag.
//
// Ported so far: math.random, shuffle, align, d, percent. Not ported yet
// (they need u, selection, des or nh.pline, and their definitions roll no
// dice): monkfoodshop, hell_tweaks, pline, nh_set_variables_string,
// nh_get_variables_string, table_stringify and the tutorial functions.

import { withRngCaller } from './rng.js';
import { lua_error } from './nhlua.js';

// C ref: dat/nhlib.lua (top-level chunk)
export function nhlib_lua(L) {
    const G = L.globals;
    const nh = G.nh;

    // -- compatibility shim
    // math.random = function(...)
    G.math.random = function random(...arg) {
        if (arg.length === 1) {
            return 1 + nh.rn2(arg[0]);
        } else if (arg.length === 2) {
            return nh.random(arg[0], arg[1] + 1 - arg[0]);
        } else {
            // we don't support reals
            lua_error('NetHack math.random requires at least one parameter');
        }
    };

    // function shuffle(list)
    G.shuffle = function shuffle(list) {
        // for i = #list, 2, -1 do
        for (let i = list.length; i >= 2; i--) {
            // local j = math.random(i)
            const j = withRngCaller(
                'random src=nhlib.lua:8 parent=shuffle(nhlib.lua:19)',
                () => G.math.random(i));
            // list[i], list[j] = list[j], list[i]   (Lua index k is JS k - 1)
            [list[i - 1], list[j - 1]] = [list[j - 1], list[i - 1]];
        }
    };

    G.align = ['law', 'neutral', 'chaos'];
    G.shuffle(G.align);

    // -- d(2,6) = 2d6
    // -- d(20) = 1d20 (single argument = implicit 1 die)
    // function d(dice, faces)
    G.d = function d(dice, faces) {
        if (faces === undefined) {
            // -- 1-arg form: argument "dice" is actually the number of faces
            // return math.random(1, dice) is a Lua tail call (and so is
            // math.random's own nh.random call): d's frame is gone, and the
            // recorder tags the roll "nh.random src=nhlib.lua:10
            // parent=<d's caller>". The caller supplies that tag with
            // withRngCaller around its d() call.
            return G.math.random(1, dice);
        } else {
            let sum = 0;
            for (let i = 1; i <= dice; i++) {
                sum = sum + withRngCaller(
                    'random src=nhlib.lua:10 parent=d(nhlib.lua:36)',
                    () => G.math.random(1, faces));
            }
            return sum;
        }
    };

    // -- percent(20) returns true 20% of the time
    // function percent(threshold)
    G.percent = function percent(threshold) {
        return withRngCaller(
            'random src=nhlib.lua:10 parent=percent(nhlib.lua:44)',
            () => G.math.random(0, 99)) < threshold;
    };
}
