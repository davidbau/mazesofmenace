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
// Ported so far: math.random, shuffle, align, d, monkfoodshop, percent,
// hell_tweaks. Not ported yet (they need nh.pline or the tutorial, and their
// definitions roll no dice): pline, nh_set_variables_string,
// nh_get_variables_string, table_stringify and the tutorial functions.

import { withRngCaller } from './rng.js';
import { lua_error, lua_bor, lua_band } from './nhlua.js';

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

    // function monkfoodshop()
    G.monkfoodshop = function monkfoodshop() {
        if (G.u.role === 'Monk') {
            return 'health food shop';
        }
        return 'food shop';
    };

    // -- percent(20) returns true 20% of the time
    // function percent(threshold)
    G.percent = function percent(threshold) {
        return withRngCaller(
            'random src=nhlib.lua:10 parent=percent(nhlib.lua:44)',
            () => G.math.random(0, 99)) < threshold;
    };

    // -- tweaks to gehennom levels; might add random lava pools or
    // -- a lava river.
    // -- protected_area is a selection where no changes will be done.
    // function hell_tweaks(protected_area)
    G.hell_tweaks = function hell_tweaks(protected_area) {
        const u = G.u, nhc = G.nhc, selection = G.selection, des = G.des;
        // math.random called from hell_tweaks at 'line'
        const random = (line, ...args) => withRngCaller(
            `random src=nhlib.lua:${args.length === 1 ? 8 : 10} `
            + `parent=hell_tweaks(nhlib.lua:${line})`,
            () => G.math.random(...args));
        const liquid = 'L';
        const ground = '.';
        const n_prot = protected_area.numpoints();
        const prot = protected_area.negate();

        // -- random pools
        if (G.percent(20 + u.depth)) {
            let pools = selection.new();
            const maxpools = 5 + random(66, u.depth);
            for (let i = 1; i <= maxpools; i++) {
                pools.set();
            }
            pools = lua_bor(pools, selection.grow(selection.set(selection.new()), 'west'));
            pools = lua_bor(pools, selection.grow(selection.set(selection.new()), 'north'));
            pools = lua_bor(pools, selection.grow(selection.set(selection.new()), 'random'));

            pools = lua_band(pools, prot);

            if (G.percent(80)) {
                const poolground = lua_band(pools.clone().grow('all'), prot);
                const pval = random(78, 1, 8) * 10;
                des.terrain(poolground.percentage(pval), ground);
            }
            des.terrain(pools, liquid);
        }

        // -- river
        if (G.percent(50)) {
            let allrivers = selection.new();
            // -- # of lava pools required (Lua '/' is float division)
            const reqpts = ((nhc.COLNO * nhc.ROWNO) - n_prot) / 12;
            let rpts = 0;
            let rivertries = 0;

            do {
                const floor = selection.match(ground);
                const a = selection.rndcoord(floor);
                const b = selection.rndcoord(floor);
                let lavariver = selection.randline(selection.new(), a.x, a.y, b.x, b.y, 10);

                if (G.percent(50)) {
                    lavariver = selection.grow(lavariver, 'north');
                }
                if (G.percent(50)) {
                    lavariver = selection.grow(lavariver, 'west');
                }
                allrivers = lua_bor(allrivers, lavariver);
                allrivers = lua_band(allrivers, prot);

                rpts = allrivers.numpoints();
                rivertries = rivertries + 1;
            } while (!((rpts > reqpts) || (rivertries > 7)));

            if (G.percent(60)) {
                const prc = 10 * random(111, 1, 6);
                let riverbanks = selection.grow(allrivers);
                riverbanks = lua_band(riverbanks, prot);
                des.terrain(selection.percentage(riverbanks, prc), ground);
            }

            des.terrain(allrivers, liquid);
        }

        // -- replacing some walls with boulders
        if (G.percent(20)) {
            const amount = 3 * random(122, 1, 8);
            let bwalls = lua_bor(selection.match('.w.').percentage(amount),
                                 selection.match('.\nw\n.').percentage(amount));
            bwalls = lua_band(bwalls, prot);
            bwalls.iterate(function (x, y) {
                des.terrain(x, y, '.');
                des.object('boulder', x, y);
            });
        }

        // -- replacing some walls with iron bars
        if (G.percent(20)) {
            const amount = 3 * random(133, 1, 8);
            let fwalls = lua_bor(selection.match('.w.').percentage(amount),
                                 selection.match('.\nw\n.').percentage(amount));
            fwalls = lua_band(lua_band(fwalls.grow(), selection.match('w')), prot);
            des.terrain(fwalls, 'F');
        }
    };
}
