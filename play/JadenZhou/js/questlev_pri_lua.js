// questlev_pri_lua.js — port of the Priest quest level scripts:
// dat/Pri-loca.lua (locate level), dat/Pri-fila.lua and dat/Pri-filb.lua
// (filler levels) and dat/Pri-goal.lua (goal level); dat/Pri-strt.lua is in
// questlev_lua.js.
// makemaz() loads them through load_special() (sp_lev.c).
// C ref: dat/Pri-loca.lua, dat/Pri-fila.lua, dat/Pri-filb.lua, dat/Pri-goal.lua
//
// Translated from the .lua files by a script (the des.map() maps are
// verbatim), then reviewed. Lua arrays are 1-based: t[i] is t[i - 1] here.
// Lua-side rolls (math.random, nh.rn2; percent, shuffle and d roll inside
// nhlib_lua.js) go through withRngCaller() with the tag the C recorder
// writes; the selection operators |, &, + and - are lua_bor(), lua_band(),
// lua_add() and lua_sub() (nhlua.js).

import { withRngCaller } from './rng.js';
import { chunk_random } from './nhlib_lua.js';

const MAP_Pri_loca = [
    '........................................',
    '........................................',
    '..........----------+----------.........',
    '..........|........|.|........|.........',
    '..........|........|.|........|.........',
    '..........|----.----.----.----|.........',
    '..........+...................+.........',
    '..........+...................+.........',
    '..........|----.----.----.----|.........',
    '..........|........|.|........|.........',
    '..........|........|.|........|.........',
    '..........----------+----------.........',
    '........................................',
    '........................................',
].join('\n') + '\n';

// C ref: dat/Pri-loca.lua
function Pri_loca_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'hardfloor', 'noflip');
    // This is a kludge to init the level as a lit field.
    des.level_init({ style: 'mines', fg: '.', bg: '.', smoothed: false, joined: false, lit: 1, walled: false });

    des.map(MAP_Pri_loca);
    // Dungeon Description
    des.region({ region: [0, 0, 9, 13], lit: 0, type: 'morgue', filled: 1 });
    des.region({ region: [9, 0, 30, 1], lit: 0, type: 'morgue', filled: 1 });
    des.region({ region: [9, 12, 30, 13], lit: 0, type: 'morgue', filled: 1 });
    des.region({ region: [31, 0, 39, 13], lit: 0, type: 'morgue', filled: 1 });
    des.region({ region: [11, 3, 29, 10], lit: 1, type: 'temple', filled: 1, irregular: 1 });
    // The altar inside the temple
    des.altar({ x: 20, y: 7, align: 'noalign', type: 'shrine' });
    des.monster({ id: 'aligned cleric', x: 20, y: 7, align: 'noalign', peaceful: 0 });
    // Doors
    des.door('locked', 10, 6);
    des.door('locked', 10, 7);
    des.door('locked', 20, 2);
    des.door('locked', 20, 11);
    des.door('locked', 30, 6);
    des.door('locked', 30, 7);
    // Stairs
    // Note:  The up stairs are *intentionally* off of the map.
    des.stair('up', 43, 5);
    des.stair('down', 20, 6);
    // Non diggable walls
    des.non_diggable(selection.area(10, 2, 30, 13));
    // Objects (inside the antechambers).
    des.object({ coord: [14, 3] });
    des.object({ coord: [15, 3] });
    des.object({ coord: [16, 3] });
    des.object({ coord: [14, 10] });
    des.object({ coord: [15, 10] });
    des.object({ coord: [16, 10] });
    des.object({ coord: [17, 10] });
    des.object({ coord: [24, 3] });
    des.object({ coord: [25, 3] });
    des.object({ coord: [26, 3] });
    des.object({ coord: [27, 3] });
    des.object({ coord: [24, 10] });
    des.object({ coord: [25, 10] });
    des.object({ coord: [26, 10] });
    des.object({ coord: [27, 10] });
    // Random traps
    des.trap({ coord: [15, 4] });
    des.trap({ coord: [25, 4] });
    des.trap({ coord: [15, 9] });
    des.trap({ coord: [25, 9] });
    des.trap();
    des.trap();
    // No random monsters - the morgue generation will put them in.
}

// C ref: dat/Pri-fila.lua
function Pri_fila_lua(L) {
    const G = L.globals, des = G.des;

    des.room({ type: 'ordinary',
        contents: function() {
            des.stair('up');
            des.object();
            des.monster('human zombie');
        } });

    des.room({ type: 'ordinary',
        contents: function() {
            des.object();
            des.object();
        } });

    des.room({ type: 'ordinary',
        contents: function() {
            des.object();
            des.trap();
            des.object();
            des.monster('human zombie');
        } });

    des.room({ type: 'morgue',
        contents: function() {
            des.stair('down');
            des.object();
            des.trap();
        } });

    des.room({ type: 'ordinary',
        contents: function() {
            des.object();
            des.object();
            des.trap();
            des.monster('wraith');
        } });

    des.room({ type: 'morgue',
        contents: function() {
            des.object();
            des.trap();
        } });

    des.random_corridors();
}

// C ref: dat/Pri-filb.lua
function Pri_filb_lua(L) {
    const G = L.globals, des = G.des;

    des.room({ type: 'ordinary',
        contents: function() {
            des.stair('up');
            des.object();
            des.monster('human zombie');
            des.monster('wraith');
        } });

    des.room({ type: 'morgue',
        contents: function() {
            des.object();
            des.object();
            des.object();
        } });

    des.room({ type: 'ordinary',
        contents: function() {
            des.object();
            des.trap();
            des.object();
            des.monster('human zombie');
            des.monster('wraith');
        } });

    des.room({ type: 'morgue',
        contents: function() {
            des.stair('down');
            des.object();
            des.object();
            des.trap();
        } });

    des.room({ type: 'ordinary',
        contents: function() {
            des.object();
            des.object();
            des.trap();
            des.monster('human zombie');
            des.monster('wraith');
        } });

    des.room({ type: 'morgue',
        contents: function() {
            des.object();
            des.trap();
        } });

    des.random_corridors();
}

const MAP_Pri_goal = [
    'xxxxxx..xxxxxx...xxxxxxxxx',
    'xxxx......xx......xxxxxxxx',
    'xx.xx.............xxxxxxxx',
    'x....................xxxxx',
    '......................xxxx',
    '......................xxxx',
    'xx........................',
    'xxx......................x',
    'xxx................xxxxxxx',
    'xxxx.....x.xx.......xxxxxx',
    'xxxxx...xxxxxx....xxxxxxxx',
].join('\n') + '\n';

// C ref: dat/Pri-goal.lua
function Pri_goal_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;
    // math.random called from the main chunk or an anonymous function
    const random = (line, ...args) => chunk_random(G, 'Pri-goal.lua', line, ...args);

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel');

    des.level_init({ style: 'mines', fg: 'L', bg: '.', smoothed: false, joined: false, lit: 0, walled: false });

    des.map(MAP_Pri_goal);
    // Dungeon Description
    const place = [[14, 4], [13, 7]];
    const placeidx = random(27, 1, place.length);

    des.region(selection.area(0, 0, 25, 10), 'unlit');
    // Stairs
    des.stair('up', 20, 5);
    // Objects [note: eroded=-1 => obj->oerodeproof=1]
    des.object({ id: 'helm of brilliance', coord: place[placeidx - 1],
        buc: 'blessed', spe: 0, eroded: -1, name: 'The Mitre of Holiness' });
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    // Random traps
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap();
    des.trap();
    // Random monsters.
    des.monster('Nalzok', place[placeidx - 1]);
    des.monster('human zombie');
    des.monster('human zombie');
    des.monster('human zombie');
    des.monster('human zombie');
    des.monster('human zombie');
    des.monster('human zombie');
    des.monster('human zombie');
    des.monster('human zombie');
    des.monster('human zombie');
    des.monster('human zombie');
    des.monster('human zombie');
    des.monster('human zombie');
    des.monster('human zombie');
    des.monster('human zombie');
    des.monster('human zombie');
    des.monster('human zombie');
    des.monster('Z');
    des.monster('Z');
    des.monster('wraith');
    des.monster('wraith');
    des.monster('wraith');
    des.monster('wraith');
    des.monster('wraith');
    des.monster('wraith');
    des.monster('wraith');
    des.monster('wraith');
    des.monster('W');
}

// The ported level scripts by file name, for nhl_loadlua().
export const questlev_pri_lua_files = {
    'Pri-loca.lua': Pri_loca_lua,
    'Pri-fila.lua': Pri_fila_lua,
    'Pri-filb.lua': Pri_filb_lua,
    'Pri-goal.lua': Pri_goal_lua,
};
