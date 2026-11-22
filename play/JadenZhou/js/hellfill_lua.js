// hellfill_lua.js — hand port of dat/hellfill.lua, the Gehennom filler
// levels (every Gehennom level that isn't a special level). makemaz()
// loads it through load_special() (sp_lev.c).
// C ref: dat/hellfill.lua
//
// Lua-side rolls (math.random, percent, shuffle) go through withRngCaller()
// with the tag the C recorder writes: "random src=nhlib.lua:<8|10>
// parent=<fn>(hellfill.lua:<line>)", where <fn> is the name Lua's debug
// info gives the function that called math.random (ldebug.c
// funcnamefromcall()):
//   - the main chunk, the anonymous hells[] variants (called as
//     hells[hellno]()) and the des.map() 'contents' callbacks (called from
//     C) have no name: "lua";
//   - a named global function keeps its name (populatemaze, rnd_halign,
//     rnd_valign, rnd_hell_prefab);
//   - a prefab function called through the local 'fab' is "fab"; a
//     repeatable prefab's contents, called as fab.contents(), is "contents".
// percent() and shuffle() always tag their own frames (see nhlib_lua.js).
// Every other roll comes from the des.* and selection functions.

import { withRngCaller } from './rng.js';

const F = 'hellfill.lua';

// math.random called by the function Lua names 'fn' at hellfill.lua 'line'
function random(G, fn, line, ...args) {
    return withRngCaller(
        `random src=nhlib.lua:${args.length === 1 ? 8 : 10} parent=${fn}(${F}:${line})`,
        () => G.math.random(...args));
}

// The prefab maps, verbatim from the .lua file (a Lua long string drops
// the newline right after its opening [[).
const MAP_prefab1 = [
    '......',
    '......',
    '......',
    '......',
    '......',
    '......',
    '......',
    '......',
    '......',
    '......',
    '......',
    '......',
    '......',
    '......',
    '......',
    '......',
].join('\n');

const MAP_prefab2 = [
    'xxxxxx.....xxxxxx',
    'xxxx.........xxxx',
    'xx.............xx',
    'xx.............xx',
    'x...............x',
    'x...............x',
    '.................',
    '.................',
    '.................',
    '.................',
    '.................',
    'x...............x',
    'x...............x',
    'xx.............xx',
    'xx.............xx',
    'xxxx.........xxxx',
    'xxxxxx.....xxxxxx',
].join('\n') + '\n';

const MAP_prefab3 = [
    'xxxxxx.xxxxxx',
    'xLLLLLLLLLLLx',
    'xL---------Lx',
    'xL|.......|Lx',
    'xL|.......|Lx',
    '.L|.......|L.',
    'xL|.......|Lx',
    'xL|.......|Lx',
    'xL---------Lx',
    'xLLLLLLLLLLLx',
    'xxxxxx.xxxxxx',
].join('\n') + '\n';

const MAP_prefab4 = [
    '..............................................................',
    '..............................................................',
    '..............................................................',
    '..............................................................',
    '..............................................................',
].join('\n');

const MAP_prefab5 = [
    'x.....x',
    '.......',
    '.......',
    '.......',
    '.......',
    '.......',
    'x.....x',
].join('\n');

const MAP_prefab6 = [
    'BBBBBBB',
    'B.....B',
    'B.....B',
    'B.....B',
    'B.....B',
    'B.....B',
    'BBBBBBB',
].join('\n');

const MAP_prefab7 = [
    '..........',
    '..........',
    '..........',
    '...FFFF...',
    '...F..F...',
    '...F..F...',
    '...FFFF...',
    '..........',
    '..........',
    '..........',
].join('\n');

const MAP_prefab8 = [
    '.........',
    '.}}}}}}}.',
    '.}}---}}.',
    '.}--.--}.',
    '.}|...|}.',
    '.}--.--}.',
    '.}}---}}.',
    '.}}}}}}}.',
    '.........',
].join('\n') + '\n';

const MAP_prefab9_lava = [
    '.....',
    '.LLL.',
    '.LZL.',
    '.LLL.',
    '.....',
].join('\n');

const MAP_prefab9_water = [
    '.....',
    '.PPP.',
    '.PWP.',
    '.PPP.',
    '.....',
].join('\n');

const MAP_prefab10 = [
    '...',
    '...',
    '...',
    '...',
    '...',
    '...',
    '...',
    '...',
    '...',
    '...',
    '...',
    '...',
    '...',
    '...',
    '...',
    '...',
    '...',
].join('\n');

// C ref: dat/hellfill.lua (top-level chunk)
//	The "fill" level for gehennom.
//
//	This level is used to fill out any levels not occupied by
//	specific levels.
function hellfill_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;

    // function hellobjects()
    G.hellobjects = function hellobjects() {
        const objclass = ['(', '/', '=', '+', ')', '[', '?', '*', '%'];
        G.shuffle(objclass);

        des.object(objclass[0]);
        des.object(objclass[0]);
        des.object(objclass[1]);
        des.object(objclass[2]);
        des.object(objclass[3]);
        des.object(objclass[4]);
        des.object();
        des.object();
    };

    //

    // function hellmonsters()
    G.hellmonsters = function hellmonsters() {
        const monclass = ['V', 'D', ' ', '&', 'Z'];
        G.shuffle(monclass);

        des.monster({ class: monclass[0], peaceful: 0 });
        des.monster({ class: monclass[0], peaceful: 0 });
        des.monster({ class: monclass[1], peaceful: 0 });
        des.monster({ class: monclass[1], peaceful: 0 });
        des.monster({ class: monclass[2], peaceful: 0 });
        des.monster({ class: monclass[3], peaceful: 0 });
        des.monster({ peaceful: 0 });
        des.monster({ class: 'H', peaceful: 0 });
    };

    //

    // function helltraps()
    G.helltraps = function helltraps() {
        for (let i = 1; i <= 12; i++) {
            des.trap();
        }
    };

    //

    // function populatemaze()
    G.populatemaze = function populatemaze() {
        // for i = 1, math.random(8) + 11 do
        for (let i = 1, n = random(G, 'populatemaze', 54, 8) + 11; i <= n; i++) {
            if (G.percent(50)) {
                des.object('*');
            } else {
                des.object();
            }
        }

        for (let i = 1, n = random(G, 'populatemaze', 62, 10) + 2; i <= n; i++) {
            des.object('`');
        }

        for (let i = 1, n = random(G, 'populatemaze', 66, 3); i <= n; i++) {
            des.monster({ id: 'minotaur', peaceful: 0 });
        }

        for (let i = 1, n = random(G, 'populatemaze', 70, 5) + 7; i <= n; i++) {
            des.monster({ peaceful: 0 });
        }

        for (let i = 1, n = random(G, 'populatemaze', 74, 6) + 7; i <= n; i++) {
            des.gold();
        }

        for (let i = 1, n = random(G, 'populatemaze', 78, 6) + 7; i <= n; i++) {
            des.trap();
        }
    };

    //

    // function rnd_halign()
    G.rnd_halign = function rnd_halign() {
        const aligns = ['half-left', 'center', 'half-right'];
        return aligns[random(G, 'rnd_halign', 87, 1, aligns.length) - 1];
    };

    // function rnd_valign()
    G.rnd_valign = function rnd_valign() {
        const aligns = ['top', 'center', 'bottom'];
        return aligns[random(G, 'rnd_valign', 92, 1, aligns.length) - 1];
    };

    // -- the prefab maps must have contents-function, or populatemaze()
    // -- puts the stuff only inside the prefab map.
    // -- contains either a function, or an object with "repeatable" and "contents".
    // -- function alone implies not repeatable.
    // (Lua index i is JS index i - 1)
    const hell_prefabs = [
        {
            repeatable: true,
            contents: function () {
                des.map({ halign: G.rnd_halign(), valign: 'center', map: MAP_prefab1,
                          contents: function () {} });
            },
        },
        {
            repeatable: true,
            contents: function () {
                des.map({ halign: G.rnd_halign(), valign: 'center', map: MAP_prefab2,
                          contents: function () {} });
            },
        },
        function (coldhell) {
            des.map({ halign: G.rnd_halign(), valign: G.rnd_valign(), map: MAP_prefab3,
                      contents: function () {
                des.non_diggable(selection.area(2, 2, 10, 8));
                des.region(selection.area(4, 4, 8, 6), 'lit');
                des.exclusion({ type: 'teleport', region: [2, 2, 10, 8] });
                if (coldhell) {
                    des.replace_terrain({ region: [1, 1, 11, 9], fromterrain: 'L',
                                          toterrain: 'P' });
                }
                const dblocs = [
                    { x: 1, y: 5, dir: 'east', state: 'closed' },
                    { x: 11, y: 5, dir: 'west', state: 'closed' },
                    { x: 6, y: 1, dir: 'south', state: 'closed' },
                    { x: 6, y: 9, dir: 'north', state: 'closed' },
                ];
                G.shuffle(dblocs);
                for (let i = 1, n = random(G, 'lua', 173, 1, dblocs.length); i <= n; i++) {
                    des.drawbridge(dblocs[i - 1]);
                }
                const mons = ['H', 'T', '@'];
                G.shuffle(mons);
                for (let i = 1, n = 3 + random(G, 'lua', 178, 1, 5); i <= n; i++) {
                    des.monster(mons[0], 6, 5);
                }
            } });
        },
        {
            repeatable: true,
            contents: function () {
                des.map({ halign: 'center', valign: 'center', map: MAP_prefab4,
                          contents: function () {} });
            },
        },
        {
            repeatable: true,
            contents: function () {
                des.map({ halign: G.rnd_halign(), valign: G.rnd_valign(), lit: true,
                          map: MAP_prefab5, contents: function () {} });
            },
        },
        function () {
            des.map({ halign: G.rnd_halign(), valign: G.rnd_valign(), map: MAP_prefab6,
                      contents: function () {
                des.region({ region: [2, 2, 2, 2], type: 'temple', filled: 1, irregular: 1 });
                des.altar({ x: 3, y: 3, align: 'noalign',
                            type: G.percent(75) ? 'altar' : 'shrine' });
            } });
        },
        function () {
            des.map({ halign: G.rnd_halign(), valign: G.rnd_valign(), map: MAP_prefab7,
                      contents: function () {
                des.exclusion({ type: 'teleport', region: [4, 4, 5, 5] });
                const mons = ['Angel', 'D', 'H', 'L'];
                des.monster(mons[random(G, 'lua', 234, 1, mons.length) - 1], 4, 4);
            } });
        },

        function () {
            des.map({ halign: G.rnd_halign(), valign: G.rnd_valign(), map: MAP_prefab8,
                      contents: function (rm) {
                des.exclusion({ type: 'teleport', region: [3, 3, 5, 5] });
                des.monster('L', 4, 4);
            } });
        },
        function () {
            const mapstr = G.percent(30) ? MAP_prefab9_lava : MAP_prefab9_water;
            for (let dx = 1; dx <= 5; dx++) {
                des.map({ x: dx * 14 - 4, y: random(G, 'fab', 267, 3, 15),
                          map: mapstr, contents: function () {} });
            }
        },
        {
            repeatable: true,
            contents: function () {
                const mapstr = MAP_prefab10;
                for (let dx = 1; dx <= 3; dx++) {
                    des.map({ x: random(G, 'contents', 293, 3, 75), y: 3,
                              map: mapstr, contents: function () {} });
                }
            },
        },
    ];

    // function rnd_hell_prefab(coldhell)
    G.rnd_hell_prefab = function rnd_hell_prefab(coldhell) {
        let dorepeat = true;
        let nloops = 0;
        do {
            nloops = nloops + 1;
            const pf = random(G, 'rnd_hell_prefab', 305, 1, hell_prefabs.length);
            const fab = hell_prefabs[pf - 1];
            const fabtype = typeof fab === 'function' ? 'function' : 'table';

            if (fabtype === 'function') {
                fab(coldhell);
                dorepeat = false;
            } else if (fabtype === 'table') {
                fab.contents(coldhell);
                // dorepeat = not (fab.repeatable and math.random(0, nloops * 2) == 0);
                dorepeat = !(fab.repeatable
                             && random(G, 'rnd_hell_prefab', 314, 0, nloops * 2) === 0);
            }
        } while (!((!dorepeat) || (nloops > 5)));
    };

    G.hells = [
        // -- 1: "mines" style with lava
        function () {
            des.level_init({ style: 'solidfill', fg: ' ', lit: 0 });
            des.level_flags('mazelevel', 'noflip');
            des.level_init({ style: 'mines', fg: '.', smoothed: true, joined: true, lit: 0,
                             walled: true });
            des.replace_terrain({ fromterrain: ' ', toterrain: 'L' });
            des.replace_terrain({ fromterrain: '.', toterrain: 'L', chance: 5 });
            des.replace_terrain({ mapfragment: 'w', toterrain: 'L', chance: 20 });
            des.replace_terrain({ mapfragment: 'w', toterrain: '.', chance: 15 });
        },

        // -- 2: mazes like original, with some hell_tweaks
        function () {
            des.level_init({ style: 'solidfill', fg: ' ', lit: 0 });
            des.level_flags('mazelevel', 'noflip');
            des.level_init({ style: 'mazegrid', bg: '-' });
            des.mazewalk({ coord: [1, 10], dir: 'east', stocked: false });
            const tmpbounds = selection.match('-');
            // tmpbounds:bounds() -- the selection's own 'bounds' rect shadows
            // the method in JS; a Lua userdata has no fields, so the method
            // call is selection.bounds(tmpbounds) through the metatable
            const bnds = selection.bounds(tmpbounds);
            const protected_area = selection.fillrect(bnds.lx, bnds.ly + 1, bnds.hx - 2,
                                                      bnds.hy - 1);
            G.hell_tweaks(protected_area.negate());
            if (G.percent(25)) {
                G.rnd_hell_prefab(false);
            }
        },

        // -- 3: mazes, style 1: wall thick = 1, random wid corr
        function () {
            des.level_init({ style: 'solidfill', fg: ' ', lit: 0 });
            des.level_flags('mazelevel', 'noflip');
            des.level_init({ style: 'maze', wallthick: 1 });
        },

        // -- 4: mazes, style 2: replace wall with iron bars or lava
        function () {
            const cwid = random(G, 'lua', 355, 4);
            des.level_init({ style: 'solidfill', fg: ' ', lit: 0 });
            des.level_flags('mazelevel', 'noflip');
            des.level_init({ style: 'maze', wallthick: 1, corrwid: cwid });
            const outside_walls = selection.match(' ');
            const wallterrain = ['F', 'L'];
            G.shuffle(wallterrain);
            des.replace_terrain({ mapfragment: 'w', toterrain: wallterrain[0] });
            if (cwid === 1) {
                if (wallterrain[0] === 'F' && G.percent(80)) {
                    // -- replace some horizontal iron bars walls with floor
                    des.replace_terrain({ mapfragment: '.\nF\n.', toterrain: '.',
                                          chance: 25 * random(G, 'lua', 366, 4) });
                } else if (G.percent(25)) {
                    G.rnd_hell_prefab(false);
                }
            }
            des.terrain(outside_walls, ' '); // -- return the outside back to solid wall
        },

        // -- 5: mazes, thick walls, occasionally lava instead of walls
        function () {
            const wwid = 1 + random(G, 'lua', 376, 2);
            des.level_init({ style: 'solidfill', fg: ' ', lit: 0 });
            des.level_flags('mazelevel', 'noflip');
            des.level_init({ style: 'maze', wallthick: wwid,
                             corrwid: random(G, 'lua', 379, 2) });
            if (G.percent(50)) {
                const outside_walls = selection.match(' ');
                des.replace_terrain({ mapfragment: 'w', toterrain: 'L' });
                des.terrain(outside_walls, ' '); // -- return the outside back to solid wall
                if (wwid === 3 && G.percent(40)) {
                    const sel = selection.match('LLL\nLLL\nLLL');
                    des.terrain(sel.percentage(30 * random(G, 'lua', 386, 4)), 'Z');
                }
            }
        },

        // -- 6: cold maze, with ice and water
        function () {
            const cwid = random(G, 'lua', 393, 4);
            des.level_init({ style: 'solidfill', fg: ' ', lit: 0 });
            des.level_flags('mazelevel', 'noflip', 'cold');
            des.level_init({ style: 'maze', wallthick: 1, corrwid: cwid });
            const outside_walls = selection.match(' ');
            const icey = selection.negate().percentage(10).grow().filter_mapchar('.');
            des.terrain(icey, 'I');
            if (cwid > 1) {
                // -- turn some ice into wall of water
                des.terrain(icey.percentage(1), 'W');
            }
            des.terrain(icey.percentage(5), 'P');
            if (G.percent(25)) {
                des.terrain(selection.match('w'), 'W'); // -- walls of water
            }
            if (cwid === 1 && G.percent(25)) {
                G.rnd_hell_prefab(true);
            }
            des.terrain(outside_walls, ' '); // -- return the outside back to solid wall
        },

        // -- 7: open cavern, "mines" with more space
        function () {
            // -- walls are either stone or lava
            const wter = G.percent(50) ? ' ' : 'L';
            des.level_init({ style: 'solidfill', fg: ' ', lit: 0 });
            des.level_flags('mazelevel', 'noflip');
            des.level_init({ style: 'mines', fg: '.', bg: wter, smoothed: true, joined: true,
                             lit: 0 });
            const sel = selection.match('.').grow();
            des.terrain({ selection: sel, typ: '.', lit: 0 });

            const border = selection.rect(0, 0, 78, 20);
            des.terrain({ selection: border, typ: wter, lit: 0 });
            des.wallify();
        },

    ];

    // local hellno = math.random(1, #hells);
    const hellno = random(G, 'lua', 431, 1, G.hells.length);
    G.hells[hellno - 1]();

    //

    des.stair('up');
    if (G.u.invocation_level) {
        des.trap('vibrating square');
    } else {
        des.stair('down');
    }

    G.populatemaze();
}

// The hand-ported Gehennom filler script by file name, for nhl_loadlua().
export const hellfill_lua_files = {
    'hellfill.lua': hellfill_lua,
};
