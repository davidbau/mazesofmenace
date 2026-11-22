// questlev_tou_lua.js — port of the Tourist quest level scripts:
// dat/Tou-strt.lua (home level), dat/Tou-loca.lua (locate level),
// dat/Tou-fila.lua and dat/Tou-filb.lua (filler levels) and dat/Tou-goal.lua
// (goal level).
// makemaz() loads them through load_special() (sp_lev.c).
// C ref: dat/Tou-strt.lua, dat/Tou-loca.lua, dat/Tou-fila.lua, dat/Tou-filb.lua, dat/Tou-goal.lua
//
// Translated from the .lua files by a script (the des.map() maps are
// verbatim), then reviewed. Lua arrays are 1-based: t[i] is t[i - 1] here.
// Lua-side rolls (math.random, nh.rn2; percent, shuffle and d roll inside
// nhlib_lua.js) go through withRngCaller() with the tag the C recorder
// writes; the selection operators |, &, + and - are lua_bor(), lua_band(),
// lua_add() and lua_sub() (nhlua.js).

import { lua_add, lua_sub } from './nhlua.js';

const MAP_Tou_strt = [
    '.......}}....---------..-------------------------------------------------...',
    '........}}...|.......|..|.-------------------------------------------...|...',
    '.........}}..|.......|..|.|......|......|.............|......|......|...|...',
    '..........}}.|.......|..|.|......+......+.............+......+..\\...|...|...',
    '...........}}}..........|.|......|......|.............|......|......|...|...',
    '.............}}.........|.|----S-|--S---|S----------S-|---S--|------|...|...',
    '..............}}}.......|...............................................|...',
    '................}}}.....----S------++--S----------S----------S-----------...',
    '..................}}...........    ..    ...................................',
    '......-------......}}}}........}}}}..}}}}..}}}}..}}}}.......................',
    '......|.....|.......}}}}}}..}}}}   ..   }}}}..}}}}..}}}.....................',
    '......|.....+...........}}}}}}........................}}}..}}}}..}}}..}}}...',
    '......|.....|...........................................}}}}..}}}..}}}}.}}}}',
    '......-------...............................................................',
    '............................................................................',
    '...-------......-------.....................................................',
    '...|.....|......|.....|.....................................................',
    '...|.....+......+.....|.....................................................',
    '...|.....|......|.....|.....................................................',
    '...-------......-------.....................................................',
].join('\n') + '\n';

// C ref: dat/Tou-strt.lua
//	The "start" level for the quest.
//
//	Here you meet your (besieged) class leader, Twoflower
//	and receive your quest assignment.
//
function Tou_strt_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'noteleport', 'hardfloor');
    des.map(MAP_Tou_strt);
    // Dungeon Description
    des.region(selection.area(0, 0, 75, 19), 'lit');
    des.region({ region: [14, 1, 20, 3], lit: 0, type: 'morgue', filled: 1 });
    des.region(selection.area(7, 10, 11, 12), 'unlit');
    des.region(selection.area(4, 16, 8, 18), 'unlit');
    des.region(selection.area(17, 16, 21, 18), 'unlit');
    des.region(selection.area(27, 2, 32, 4), 'unlit');
    des.region(selection.area(34, 2, 39, 4), 'unlit');
    des.region(selection.area(41, 2, 53, 4), 'unlit');
    des.region(selection.area(55, 2, 60, 4), 'unlit');
    des.region(selection.area(62, 2, 67, 4), 'lit');
    // Stairs
    des.stair('down', 66, 3);
    // Portal arrival point
    des.levregion({ region: [68, 14, 68, 14], type: 'branch' });
    // Non diggable walls
    des.non_diggable(selection.area(0, 0, 75, 19));
    // Doors
    des.door('locked', 31, 5);
    des.door('locked', 36, 5);
    des.door('locked', 41, 5);
    des.door('locked', 52, 5);
    des.door('locked', 58, 5);
    des.door('locked', 28, 7);
    des.door('locked', 39, 7);
    des.door('locked', 50, 7);
    des.door('locked', 61, 7);
    des.door('closed', 33, 3);
    des.door('closed', 40, 3);
    des.door('closed', 54, 3);
    des.door('closed', 61, 3);
    des.door('open', 12, 11);
    des.door('open', 9, 17);
    des.door('open', 16, 17);
    des.door('locked', 35, 7);
    des.door('locked', 36, 7);
    // Monsters on siege duty.
    des.monster('giant spider');
    des.monster('giant spider');
    des.monster('giant spider');
    des.monster('giant spider');
    des.monster('giant spider');
    des.monster('giant spider');
    des.monster('giant spider');
    des.monster('giant spider');
    des.monster('giant spider');
    des.monster('giant spider');
    des.monster('giant spider');
    des.monster('giant spider');
    des.monster('s');
    des.monster('s');
    des.monster('forest centaur');
    des.monster('forest centaur');
    des.monster('forest centaur');
    des.monster('forest centaur');
    des.monster('forest centaur');
    des.monster('forest centaur');
    des.monster('forest centaur');
    des.monster('forest centaur');
    des.monster('C');
    // Twoflower
    des.monster({ id: 'Twoflower', coord: [64, 3], inventory: function() {
            des.object({ id: 'walking shoes', spe: 3 });
            des.object({ id: 'hawaiian shirt', spe: 3 });
        } });
    // The treasure of Twoflower
    des.object('chest', 64, 3);
    // guides for the audience chamber
    des.monster('guide', 29, 3);
    des.monster('guide', 32, 4);
    des.monster('guide', 35, 2);
    des.monster('guide', 38, 3);
    des.monster('guide', 45, 3);
    des.monster('guide', 48, 2);
    des.monster('guide', 49, 4);
    des.monster('guide', 51, 3);
    des.monster('guide', 57, 3);
    des.monster('guide', 62, 4);
    des.monster('guide', 66, 4);
    // path guards
    des.monster('watchman', 35, 8);
    des.monster('watchman', 36, 8);
    // river monsters
    des.monster('giant eel', 62, 12);
    des.monster('piranha', 47, 10);
    des.monster('piranha', 29, 11);
    des.monster('kraken', 34, 9);
    des.monster('kraken', 37, 9);
    // Random traps
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
}

const MAP_Tou_loca = [
    '----------------------------------------------------------------------------',
    '|....|......|..........|......|......|...|....|.....|......|...............|',
    '|....|......|.|------|.|......|......|.|.|....|..}..|......|.|----------|..|',
    '|....|--+----.|......|.|-S---+|+-----|.|.S....|.....|---+--|.|..........+..|',
    '|....|........|......|.|...|.........|.|------|..............|..........|-+|',
    '|....+...}}...+......|.|...|.|-----|.|..............|--+----------------|..|',
    '|----|........|------|.|---|.|.....|......|-----+-|.|.......|...........|--|',
    '|............................|.....|.|--+-|.......|.|.......|...........|..|',
    '|----|.....|-------------|...|--+--|.|....|.......|.|-----------+-------|..|',
    '|....+.....+.........S...|...........|....|-------|........................|',
    '|....|.....|.........|...|.|---------|....|.........|-------|.|----------|.|',
    '|....|.....|---------|---|.|......|..+....|-------|.|.......|.+......S.\\.|.|',
    '|....|.....+.........S...|.|......|..|....|.......|.|.......|.|......|...|.|',
    '|-------|..|.........|---|.|+-------------------+-|.|.......+.|----------|.|',
    '|.......+..|---------|.........|.........|..........|.......|.|..........|.|',
    '|.......|..............|--+--|.|.........|.|----+-----------|.|..........|.|',
    '|---------+-|--+-----|-|.....|.|.........|.|........|.|.....+.|..........+.|',
    '|...........|........|.S.....|.|----+----|.|--------|.|.....|.|----------|.|',
    '|...........|........|.|.....|........................|.....|..............|',
    '----------------------------------------------------------------------------',
].join('\n') + '\n';

// C ref: dat/Tou-loca.lua
function Tou_loca_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'hardfloor');
    des.map(MAP_Tou_loca);
    // Dungeon Description
    des.region(selection.area(0, 0, 75, 19), 'lit');
    des.non_diggable(selection.area(0, 0, 75, 19));
    //
    des.region({ region: [1, 1, 4, 5], lit: 0, type: 'morgue', filled: 1 });
    des.region({ region: [15, 3, 20, 5], lit: 1, type: 'shop', filled: 1 });
    des.region({ region: [62, 3, 71, 4], lit: 1, type: 'shop', filled: 1 });
    des.region({ region: [1, 17, 11, 18], lit: 1, type: 'barracks', filled: 1 });
    des.region({ region: [12, 9, 20, 10], lit: 1, type: 'barracks', filled: 1 });
    des.region({ region: [53, 11, 59, 14], lit: 1, type: 'zoo', filled: 1 });
    des.region({ region: [63, 14, 72, 16], lit: 1, type: 'barracks', filled: 1 });
    des.region({ region: [32, 14, 40, 16], lit: 1, type: 'temple', filled: 1 });
    //
    des.region({ region: [6, 1, 11, 2], type: 'ordinary' });
    des.region({ region: [24, 1, 29, 2], type: 'ordinary' });
    des.region({ region: [31, 1, 36, 2], type: 'ordinary' });
    des.region({ region: [42, 1, 45, 3], type: 'ordinary' });
    des.region({ region: [53, 1, 58, 2], type: 'ordinary' });
    des.region({ region: [24, 4, 26, 5], type: 'ordinary' });
    des.region({ region: [30, 6, 34, 7], type: 'ordinary' });
    des.region(selection.area(73, 5, 74, 5), 'unlit');
    des.region({ region: [1, 9, 4, 12], type: 'ordinary' });
    des.region({ region: [1, 14, 7, 15], type: 'ordinary' });
    des.region({ region: [12, 12, 20, 13], type: 'ordinary' });
    des.region({ region: [13, 17, 20, 18], type: 'ordinary' });
    des.region({ region: [22, 9, 24, 10], type: 'ordinary' });
    des.region({ region: [22, 12, 24, 12], type: 'ordinary' });
    des.region({ region: [24, 16, 28, 18], type: 'ordinary' });
    des.region({ region: [28, 11, 33, 12], type: 'ordinary' });
    des.region(selection.area(35, 11, 36, 12), 'lit');
    des.region({ region: [38, 8, 41, 12], type: 'ordinary' });
    des.region({ region: [43, 7, 49, 8], type: 'ordinary' });
    des.region({ region: [43, 12, 49, 12], type: 'ordinary' });
    des.region({ region: [44, 16, 51, 16], type: 'ordinary' });
    des.region({ region: [53, 6, 59, 7], type: 'ordinary' });
    des.region({ region: [61, 6, 71, 7], type: 'ordinary' });
    des.region({ region: [55, 16, 59, 18], type: 'ordinary' });
    des.region({ region: [63, 11, 68, 12], type: 'ordinary' });
    des.region({ region: [70, 11, 72, 12], type: 'ordinary' });
    // Stairs
    des.stair('up', 10, 4);
    des.stair('down', 73, 5);
    // Non diggable walls
    des.non_diggable(selection.area(0, 0, 75, 19));
    des.door('closed', 5, 5);
    des.door('closed', 5, 9);
    des.door('closed', 8, 14);
    des.door('closed', 8, 3);
    des.door('closed', 11, 9);
    des.door('closed', 11, 12);
    des.door('closed', 10, 16);
    des.door('closed', 14, 5);
    des.door('closed', 15, 16);
    des.door('locked', 21, 9);
    des.door('locked', 21, 12);
    des.door('closed', 23, 17);
    des.door('closed', 25, 3);
    des.door('closed', 26, 15);
    des.door('closed', 29, 3);
    des.door('closed', 28, 13);
    des.door('closed', 31, 3);
    des.door('closed', 32, 8);
    des.door('closed', 37, 11);
    des.door('closed', 36, 17);
    des.door('locked', 41, 3);
    des.door('closed', 40, 7);
    des.door('closed', 48, 6);
    des.door('closed', 48, 13);
    des.door('closed', 48, 15);
    des.door('closed', 56, 3);
    des.door('closed', 55, 5);
    des.door('closed', 72, 3);
    des.door('locked', 74, 4);
    des.door('closed', 64, 8);
    des.door('closed', 62, 11);
    des.door('closed', 69, 11);
    des.door('closed', 60, 13);
    des.door('closed', 60, 16);
    des.door('closed', 73, 16);

    // Objects
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
    // Toilet paper
    des.object('blank paper', 71, 12);
    des.object('blank paper', 71, 12);
    // Random traps - must avoid the 2 shops
    let validtraps = selection.area(0, 0, 75, 19).filter_mapchar('.');
    validtraps = lua_sub(validtraps, (lua_add(selection.area(15, 3, 20, 5), selection.area(62, 3, 71, 4))));
    for (let i = 1; i <= 9; i++) {
        des.trap(validtraps.rndcoord(1));
    }
    // Random monsters.
    des.monster('giant spider');
    des.monster('giant spider');
    des.monster('giant spider');
    des.monster('giant spider');
    des.monster('giant spider');
    des.monster('giant spider');
    des.monster('giant spider');
    des.monster('giant spider');
    des.monster('giant spider');
    des.monster('giant spider');
    des.monster('giant spider');
    des.monster('giant spider');
    des.monster('giant spider');
    des.monster('giant spider');
    des.monster('giant spider');
    des.monster('giant spider');
    des.monster('s');
    des.monster('s');
}

// C ref: dat/Tou-fila.lua
function Tou_fila_lua(L) {
    const G = L.globals, des = G.des;

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'noflip');

    des.level_init({ style: 'mines', fg: '.', bg: ' ', smoothed: true, joined: true, walled: true });

    //
    des.stair('up');
    des.stair('down');
    //
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    //
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    //
    des.monster({ id: 'soldier', peaceful: 0 });
    des.monster({ id: 'soldier', peaceful: 0 });
    des.monster({ id: 'soldier', peaceful: 0 });
    des.monster({ id: 'soldier', peaceful: 0 });
    des.monster({ id: 'soldier', peaceful: 0 });
    des.monster({ class: 'H', peaceful: 0 });
    des.monster({ class: 'C', peaceful: 0 });
}

// C ref: dat/Tou-filb.lua
function Tou_filb_lua(L) {
    const G = L.globals, des = G.des;

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'noflip');

    des.level_init({ style: 'mines', fg: '.', bg: ' ', smoothed: true, joined: true, walled: true });

    //
    des.stair('up');
    des.stair('down');
    //
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
    //
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    //
    des.monster({ id: 'soldier', peaceful: 0 });
    des.monster({ id: 'captain', peaceful: 0 });
    des.monster({ id: 'captain', peaceful: 0 });
    des.monster({ class: 'H', peaceful: 0 });
    des.monster({ class: 'H', peaceful: 0 });
    des.monster({ class: 'C', peaceful: 0 });
    des.monster('s');
}

const MAP_Tou_goal = [
    '----------------------------------------------------------------------------',
    '|.........|.........|..........|..| |.................|........|........|..|',
    '|.........|.........|..........|..| |....--------.....|........|........|..|',
    '|------S--|--+-----------+------..| |....|......|.....|........|........|..|',
    '|.........|.......................| |....|......+.....--+-------------+--..|',
    '|.........|.......................| |....|......|..........................|',
    '|-S-----S-|......----------.......| |....|......|..........................|',
    '|..|..|...|......|........|.......| |....-----------.........----..........|',
    '|..+..+...|......|........|.......| |....|.........|.........|}}|..........|',
    '|..|..|...|......+........|.......| |....|.........+.........|}}|..........|',
    '|..|..|...|......|........|.......S.S....|.........|.........----..........|',
    '|---..----|......|........|.......| |....|.........|.......................|',
    '|.........+......|+F-+F-+F|.......| |....-----------.......................|',
    '|---..----|......|..|..|..|.......| |......................--------------..|',
    '|..|..|...|......--F-F--F--.......| |......................+............|..|',
    '|..+..+...|.......................| |--.---...-----+-----..|............|..|',
    '|--|..----|--+-----------+------..| |.....|...|.........|..|------------|..|',
    '|..+..+...|.........|..........|..| |.....|...|.........|..+............|..|',
    '|..|..|...|.........|..........|..| |.....|...|.........|..|............|..|',
    '----------------------------------------------------------------------------',
].join('\n') + '\n';

// C ref: dat/Tou-goal.lua
function Tou_goal_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel');

    des.map(MAP_Tou_goal);
    // Dungeon Description
    des.region(selection.area(0, 0, 75, 19), 'lit');
    // The Inn
    des.region(selection.area(1, 1, 9, 2), 'lit');
    des.region({ region: [1, 4, 9, 5], lit: 1, type: 'barracks', filled: 1 });
    des.region(selection.area(1, 7, 2, 10), 'unlit');
    des.region(selection.area(7, 7, 9, 10), 'unlit');
    des.region(selection.area(1, 14, 2, 15), 'unlit');
    des.region(selection.area(7, 14, 9, 15), 'unlit');
    des.region(selection.area(1, 17, 2, 18), 'unlit');
    des.region(selection.area(7, 17, 9, 18), 'unlit');
    //
    des.region({ region: [11, 1, 19, 2], lit: 0, type: 'barracks', filled: 1 });
    des.region(selection.area(21, 1, 30, 2), 'unlit');
    des.region({ region: [11, 17, 19, 18], lit: 0, type: 'barracks', filled: 1 });
    des.region(selection.area(21, 17, 30, 18), 'unlit');
    // Police Station
    des.region(selection.area(18, 7, 25, 11), 'lit');
    des.region(selection.area(18, 13, 19, 13), 'unlit');
    des.region(selection.area(21, 13, 22, 13), 'unlit');
    des.region(selection.area(24, 13, 25, 13), 'unlit');
    // The town itself
    des.region(selection.area(42, 3, 47, 6), 'unlit');
    des.region(selection.area(42, 8, 50, 11), 'unlit');
    des.region({ region: [37, 16, 41, 18], lit: 0, type: 'morgue', filled: 1 });
    des.region(selection.area(47, 16, 55, 18), 'unlit');
    des.region(selection.area(55, 1, 62, 3), 'unlit');
    des.region(selection.area(64, 1, 71, 3), 'unlit');
    des.region({ region: [60, 14, 71, 15], lit: 1, type: 'shop', filled: 1 });
    des.region({ region: [60, 17, 71, 18], lit: 1, type: 'shop', filled: 1 });
    // Non diggable walls
    des.non_diggable(selection.area(0, 0, 75, 19));
    // Stairs
    des.stair('up', 70, 8);
    // Doors
    des.door('locked', 7, 3);
    des.door('locked', 2, 6);
    des.door('locked', 8, 6);
    des.door('closed', 3, 8);
    des.door('closed', 6, 8);
    des.door('open', 10, 12);
    des.door('closed', 3, 15);
    des.door('closed', 6, 15);
    des.door('closed', 3, 17);
    des.door('closed', 6, 17);
    des.door('closed', 13, 3);
    des.door('random', 25, 3);
    des.door('closed', 13, 16);
    des.door('random', 25, 16);
    des.door('locked', 17, 9);
    des.door('locked', 18, 12);
    des.door('locked', 21, 12);
    des.door('locked', 24, 12);
    des.door('locked', 34, 10);
    des.door('locked', 36, 10);
    des.door('random', 48, 4);
    des.door('random', 56, 4);
    des.door('random', 70, 4);
    des.door('random', 51, 9);
    des.door('random', 51, 15);
    des.door('open', 59, 14);
    des.door('open', 59, 17);
    // Objects
    des.object({ id: 'credit card', x: 4, y: 1, buc: 'blessed', spe: 0, name: 'The Platinum Yendorian Express Card' });
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
    // Random traps - must avoid the 2 shops
    let validtraps = selection.area(0, 0, 75, 19).filter_mapchar('.');
    validtraps = lua_sub(validtraps, selection.area(60, 14, 71, 18));
    for (let i = 1; i <= 6; i++) {
        des.trap(validtraps.rndcoord(1));
    }
    // Random monsters.
    des.monster({ id: 'Master of Thieves', x: 4, y: 1, peaceful: 0 });
    des.monster('giant spider');
    des.monster('giant spider');
    des.monster('giant spider');
    des.monster('giant spider');
    des.monster('giant spider');
    des.monster('giant spider');
    des.monster('giant spider');
    des.monster('giant spider');
    des.monster('giant spider');
    des.monster('giant spider');
    des.monster('giant spider');
    des.monster('giant spider');
    des.monster('giant spider');
    des.monster('giant spider');
    des.monster('giant spider');
    des.monster('giant spider');
    des.monster('s');
    des.monster('s');
    // ladies of the evening
    des.monster('succubus', 2, 8);
    des.monster('succubus', 8, 8);
    des.monster('incubus', 2, 14);
    des.monster('incubus', 8, 14);
    des.monster('incubus', 2, 17);
    des.monster('incubus', 8, 17);
    // Police station (with drunken prisoners)
    des.monster({ id: 'Kop Kaptain', x: 24, y: 9, peaceful: 0 });
    des.monster({ id: 'Kop Lieutenant', x: 20, y: 9, peaceful: 0 });
    des.monster({ id: 'Kop Lieutenant', x: 22, y: 11, peaceful: 0 });
    des.monster({ id: 'Kop Lieutenant', x: 22, y: 7, peaceful: 0 });
    des.monster({ id: 'Keystone Kop', x: 19, y: 7, peaceful: 0 });
    des.monster({ id: 'Keystone Kop', x: 19, y: 8, peaceful: 0 });
    des.monster({ id: 'Keystone Kop', x: 22, y: 9, peaceful: 0 });
    des.monster({ id: 'Keystone Kop', x: 24, y: 11, peaceful: 0 });
    des.monster({ id: 'Keystone Kop', x: 19, y: 11, peaceful: 0 });
    des.monster('prisoner', 19, 13);
    des.monster('prisoner', 21, 13);
    des.monster('prisoner', 24, 13);
    //
    des.monster({ id: 'watchman', x: 33, y: 10, peaceful: 0 });

    des.wallify();
}

// The ported level scripts by file name, for nhl_loadlua().
export const questlev_tou_lua_files = {
    'Tou-strt.lua': Tou_strt_lua,
    'Tou-loca.lua': Tou_loca_lua,
    'Tou-fila.lua': Tou_fila_lua,
    'Tou-filb.lua': Tou_filb_lua,
    'Tou-goal.lua': Tou_goal_lua,
};
