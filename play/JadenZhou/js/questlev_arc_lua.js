// questlev_arc_lua.js — port of the Archeologist quest level scripts:
// dat/Arc-strt.lua (home level), dat/Arc-loca.lua (locate level),
// dat/Arc-fila.lua and dat/Arc-filb.lua (filler levels) and dat/Arc-goal.lua
// (goal level).
// makemaz() loads them through load_special() (sp_lev.c).
// C ref: dat/Arc-strt.lua, dat/Arc-loca.lua, dat/Arc-fila.lua, dat/Arc-filb.lua, dat/Arc-goal.lua
//
// Translated from the .lua files by a script (the des.map() maps are
// verbatim), then reviewed. Lua arrays are 1-based: t[i] is t[i - 1] here.
// Lua-side rolls (math.random, nh.rn2; percent, shuffle and d roll inside
// nhlib_lua.js) go through withRngCaller() with the tag the C recorder
// writes; the selection operators |, &, + and - are lua_bor(), lua_band(),
// lua_add() and lua_sub() (nhlua.js).


const MAP_Arc_strt = [
    '............................................................................',
    '............................................................................',
    '............................................................................',
    '............................................................................',
    '....................}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}.................',
    '....................}-------------------------------------}.................',
    '....................}|..S......+.................+.......|}.................',
    '....................}-S---------------+----------|.......|}.................',
    '....................}|.|...............|.......+.|.......|}.................',
    '....................}|.|...............---------.---------}.................',
    '....................}|.S.\\.............+.................+..................',
    '....................}|.|...............---------.---------}.................',
    '....................}|.|...............|.......+.|.......|}.................',
    '....................}-S---------------+----------|.......|}.................',
    '....................}|..S......+.................+.......|}.................',
    '....................}-------------------------------------}.................',
    '....................}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}.................',
    '............................................................................',
    '............................................................................',
    '............................................................................',
].join('\n') + '\n';

// C ref: dat/Arc-strt.lua
//	The "start" level for the quest.
//
//	Here you meet your (besieged) class leader, Lord Carnarvon
//	and receive your quest assignment.
//
function Arc_strt_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'noteleport', 'hardfloor');

    des.map(MAP_Arc_strt);
    // Dungeon Description
    des.region(selection.area(0, 0, 75, 19), 'lit');
    des.region(selection.area(22, 6, 23, 6), 'unlit');
    des.region(selection.area(25, 6, 30, 6), 'unlit');
    des.region(selection.area(32, 6, 48, 6), 'unlit');
    des.region(selection.area(50, 6, 56, 8), 'lit');
    des.region(selection.area(40, 8, 46, 8), 'unlit');
    des.region(selection.area(22, 8, 22, 12), 'unlit');
    des.region(selection.area(24, 8, 38, 12), 'unlit');
    des.region(selection.area(48, 8, 48, 8), 'lit');
    des.region(selection.area(40, 10, 56, 10), 'lit');
    des.region(selection.area(48, 12, 48, 12), 'lit');
    des.region(selection.area(40, 12, 46, 12), 'unlit');
    des.region(selection.area(50, 12, 56, 14), 'lit');
    des.region(selection.area(22, 14, 23, 14), 'unlit');
    des.region(selection.area(25, 14, 30, 14), 'unlit');
    des.region(selection.area(32, 14, 48, 14), 'unlit');
    // Stairs
    des.stair('down', 55, 7);
    // Portal arrival point
    des.levregion({ region: [63, 6, 63, 6], type: 'branch' });
    // Doors
    des.door('closed', 22, 7);
    des.door('closed', 38, 7);
    des.door('locked', 47, 8);
    des.door('locked', 23, 10);
    des.door('locked', 39, 10);
    des.door('locked', 57, 10);
    des.door('locked', 47, 12);
    des.door('closed', 22, 13);
    des.door('closed', 38, 13);
    des.door('locked', 24, 14);
    des.door('closed', 31, 14);
    des.door('locked', 49, 14);
    // Lord Carnarvon
    des.monster({ id: 'Lord Carnarvon', coord: [25, 10], inventory: function() {
            des.object({ id: 'fedora', spe: 5 });
            des.object({ id: 'bullwhip', spe: 4 });
        } });
    // The treasure of Lord Carnarvon
    des.object('chest', 25, 10);
    // student guards for the audience chamber
    des.monster('student', 26, 9);
    des.monster('student', 27, 9);
    des.monster('student', 28, 9);
    des.monster('student', 26, 10);
    des.monster('student', 28, 10);
    des.monster('student', 26, 11);
    des.monster('student', 27, 11);
    des.monster('student', 28, 11);
    // city watch guards in the antechambers
    des.monster('watchman', 50, 6);
    des.monster('watchman', 50, 14);
    // Eels in the moat
    des.monster('giant eel', 20, 10);
    des.monster('giant eel', 45, 4);
    des.monster('giant eel', 33, 16);
    // Non diggable walls
    des.non_diggable(selection.area(0, 0, 75, 19));
    // Random traps
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    // Monsters on siege duty.
    des.monster('S', 60, 9);
    des.monster('M', 60, 10);
    des.monster('S', 60, 11);
    des.monster('S', 60, 12);
    des.monster('M', 60, 13);
    des.monster('S', 61, 10);
    des.monster('S', 61, 11);
    des.monster('S', 61, 12);
    des.monster('S', 30, 3);
    des.monster('M', 20, 17);
    des.monster('S', 67, 2);
    des.monster('S', 10, 19);
}

const MAP_Arc_loca = [
    '............................................................................',
    '............................................................................',
    '............................................................................',
    '........................-------------------------------.....................',
    '........................|....|.S......................|.....................',
    '........................|....|.|.|+------------------.|.....................',
    '........................|....|.|.|.|.........|......|.|.....................',
    '........................|....|.|.|.|.........|......|.|.....................',
    '........................|---+-.|.|.|..---....+......|.|.....................',
    '........................|....|.|.|.---|.|....|......|.|.....................',
    '........................|....S.|.|.+..S.|--S-----S--|.|.....................',
    '........................|....|.|.|.---|.|....|......+.|.....................',
    '........................|---+-.|.|.|..---....|.------.|.....................',
    '........................|....|.|.|.|.........|.|....+.|.....................',
    '........................|....|.|.|.|.........|+|....|-|.....................',
    '........................|....|.|.|------------+------.S.....................',
    '........................|....|.S......................|.....................',
    '........................-------------------------------.....................',
    '............................................................................',
    '............................................................................',
].join('\n') + '\n';

// C ref: dat/Arc-loca.lua
function Arc_loca_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'hardfloor');

    des.map(MAP_Arc_loca);
    // Dungeon Description
    des.region(selection.area(0, 0, 75, 19), 'lit');
    des.region({ region: [25, 4, 28, 7], lit: 1, type: 'temple', filled: 2 });
    des.region({ region: [25, 9, 28, 11], lit: 0, type: 'temple', filled: 2 });
    des.region({ region: [25, 13, 28, 16], lit: 1, type: 'temple', filled: 2 });
    des.region(selection.area(30, 4, 30, 16), 'lit');
    des.region(selection.area(32, 4, 32, 16), 'unlit');
    des.region({ region: [33, 4, 53, 4], lit: 0, type: 'ordinary', irregular: 1 });
    des.region(selection.area(36, 10, 37, 10), 'unlit');
    des.region(selection.area(39, 9, 39, 11), 'unlit');
    des.region({ region: [36, 6, 42, 8], lit: 0, type: 'ordinary', irregular: 1 });
    des.region({ region: [36, 12, 42, 14], lit: 0, type: 'ordinary', irregular: 1 });
    des.region(selection.area(46, 6, 51, 9), 'unlit');
    des.region({ region: [46, 11, 49, 11], lit: 0, type: 'ordinary', irregular: 1 });
    des.region(selection.area(48, 13, 51, 14), 'unlit');
    // Doors
    des.door('closed', 31, 4);
    des.door('closed', 28, 8);
    des.door('locked', 29, 10);
    des.door('closed', 28, 12);
    des.door('closed', 31, 16);
    des.door('locked', 34, 5);
    des.door('locked', 35, 10);
    des.door('locked', 38, 10);
    des.door('closed', 43, 10);
    des.door('closed', 45, 8);
    des.door('locked', 46, 14);
    des.door('locked', 46, 15);
    des.door('locked', 49, 10);
    des.door('locked', 52, 11);
    des.door('closed', 52, 13);
    des.door('closed', 54, 15);
    // Stairs
    des.stair('up', 3, 17);
    des.stair('down', 39, 10);
    // Altars - three types.  All are unattended.
    des.altar({ x: 26, y: 5, align: G.align[0], type: 'altar' });
    des.altar({ x: 26, y: 10, align: G.align[1], type: 'altar' });
    des.altar({ x: 26, y: 15, align: G.align[2], type: 'altar' });
    // Non diggable walls
    des.non_diggable(selection.area(0, 0, 75, 19));
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
    des.object();
    // Treasure?
    des.engraving({ type: 'engrave', text: 'X marks the spot.' });
    des.engraving({ type: 'engrave', text: 'X marks the spot.' });
    des.engraving({ type: 'engrave', text: 'X marks the spot.' });
    des.engraving({ type: 'engrave', text: 'X marks the spot.' });
    // Random traps
    des.trap('spiked pit', 24, 2);
    des.trap('spiked pit', 37, 0);
    des.trap('spiked pit', 23, 5);
    des.trap('spiked pit', 26, 19);
    des.trap('spiked pit', 55, 10);
    des.trap('spiked pit', 55, 8);
    des.trap('pit', 51, 1);
    des.trap('pit', 23, 18);
    des.trap('pit', 31, 18);
    des.trap('pit', 48, 19);
    des.trap('pit', 55, 15);
    des.trap('magic', 60, 4);
    des.trap('statue', 72, 7);
    des.trap('statue');
    des.trap('statue');
    des.trap('anti magic', 64, 12);
    des.trap('sleep gas');
    des.trap('sleep gas');
    des.trap('dart');
    des.trap('dart');
    des.trap('dart');
    des.trap('rolling boulder', 32, 10);
    des.trap('rolling boulder', 40, 16);
    // Random monsters.
    des.monster('S');
    des.monster('S');
    des.monster('S');
    des.monster('S');
    des.monster('S');
    des.monster('S');
    des.monster('S');
    des.monster('S');
    des.monster('S');
    des.monster('S');
    des.monster('S');
    des.monster('S');
    des.monster('S');
    des.monster('S');
    des.monster('S');
    des.monster('S');
    des.monster('S');
    des.monster('S');
    des.monster('M');
    des.monster('human mummy');
    des.monster('human mummy');
    des.monster('human mummy');
    des.monster('human mummy');
    des.monster('human mummy');
    des.monster('human mummy');
    des.monster('human mummy');
    des.monster('M');
}

// C ref: dat/Arc-fila.lua
function Arc_fila_lua(L) {
    const G = L.globals, des = G.des;

    des.room({ type: 'ordinary',
        contents: function() {
            des.stair('up');
            des.object();
            des.monster('S');
        } });

    des.room({ type: 'ordinary',
        contents: function() {
            des.object();
            des.object();
            des.monster('S');
        } });

    des.room({ type: 'ordinary',
        contents: function() {
            des.object();
            des.trap();
            des.object();
            des.monster('S');
        } });

    des.room({ type: 'ordinary',
        contents: function() {
            des.stair('down');
            des.object();
            des.trap();
            des.monster('S');
            des.monster('human mummy');
        } });

    des.room({ type: 'ordinary',
        contents: function() {
            des.object();
            des.object();
            des.trap();
            des.monster('S');
        } });

    des.room({ type: 'ordinary',
        contents: function() {
            des.object();
            des.trap();
            des.monster('S');
        } });

    des.random_corridors();
}

// C ref: dat/Arc-filb.lua
function Arc_filb_lua(L) {
    const G = L.globals, des = G.des;

    des.room({ type: 'ordinary',
        contents: function() {
            des.stair('up');
            des.object();
            des.monster('M');
        } });

    des.room({ type: 'ordinary',
        contents: function() {
            des.object();
            des.object();
            des.monster('M');
        } });

    des.room({ type: 'ordinary',
        contents: function() {
            des.object();
            des.trap();
            des.object();
            des.monster('M');
        } });

    des.room({ type: 'ordinary',
        contents: function() {
            des.stair('down');
            des.object();
            des.trap();
            des.monster('S');
            des.monster('human mummy');
        } });

    des.room({ type: 'ordinary',
        contents: function() {
            des.object();
            des.object();
            des.trap();
            des.monster('S');
        } });

    des.room({ type: 'ordinary',
        contents: function() {
            des.object();
            des.trap();
            des.monster('S');
        } });

    des.random_corridors();
}

const MAP_Arc_goal = [
    '                                                                            ',
    '                                  ---------                                 ',
    '                                  |..|.|..|                                 ',
    '                       -----------|..S.S..|-----------                      ',
    '                       |.|........|+-|.|-+|........|.|                      ',
    '                       |.S........S..|.|..S........S.|                      ',
    '                       |.|........|..|.|..|........|.|                      ',
    '                    ------------------+------------------                   ',
    '                    |..|..........|.......|..........|..|                   ',
    '                    |..|..........+.......|..........S..|                   ',
    '                    |..S..........|.......+..........|..|                   ',
    '                    |..|..........|.......|..........|..|                   ',
    '                    ------------------+------------------                   ',
    '                       |.|........|..|.|..|........|.|                      ',
    '                       |.S........S..|.|..S........S.|                      ',
    '                       |.|........|+-|.|-+|........|.|                      ',
    '                       -----------|..S.S..|-----------                      ',
    '                                  |..|.|..|                                 ',
    '                                  ---------                                 ',
    '                                                                            ',
].join('\n') + '\n';

// C ref: dat/Arc-goal.lua
function Arc_goal_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel');

    des.map(MAP_Arc_goal);
    // Dungeon Description
    des.region(selection.area(0, 0, 75, 19), 'lit');
    des.region(selection.area(35, 2, 36, 3), 'unlit');
    des.region(selection.area(40, 2, 41, 3), 'unlit');
    des.region(selection.area(24, 4, 24, 6), 'unlit');
    des.region(selection.area(26, 4, 33, 6), 'lit');
    des.region(selection.area(38, 2, 38, 6), 'unlit');
    des.region(selection.area(43, 4, 50, 6), 'lit');
    des.region(selection.area(52, 4, 52, 6), 'unlit');
    des.region(selection.area(35, 5, 36, 6), 'unlit');
    des.region(selection.area(40, 5, 41, 6), 'unlit');
    des.region(selection.area(21, 8, 22, 11), 'unlit');
    des.region(selection.area(24, 8, 33, 11), 'lit');
    des.region(selection.area(35, 8, 41, 11), 'unlit');
    des.region(selection.area(43, 8, 52, 11), 'lit');
    des.region(selection.area(54, 8, 55, 11), 'unlit');
    des.region(selection.area(24, 13, 24, 15), 'unlit');
    des.region(selection.area(26, 13, 33, 15), 'unlit');
    des.region(selection.area(35, 13, 36, 14), 'unlit');
    des.region(selection.area(35, 16, 36, 17), 'unlit');
    des.region(selection.area(38, 13, 38, 17), 'unlit');
    des.region(selection.area(40, 13, 41, 14), 'unlit');
    des.region(selection.area(40, 16, 41, 17), 'unlit');
    des.region({ region: [43, 13, 50, 15], lit: 0, type: 'temple', filled: 2 });
    des.region(selection.area(52, 13, 52, 15), 'unlit');
    // Stairs
    des.stair('up', 38, 10);
    // Non diggable walls
    des.non_diggable(selection.area(0, 0, 75, 19));
    // The altar of Huhetotl.  Unattended.
    des.altar({ x: 50, y: 14, align: 'chaos', type: 'altar' });
    // Objects
    des.object({ id: 'crystal ball', x: 50, y: 14, buc: 'blessed', spe: 5, name: 'The Orb of Detection' });
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
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap('rolling boulder', 46, 14);
    // Random monsters.
    des.monster('Minion of Huhetotl', 50, 14);
    des.monster('S');
    des.monster('S');
    des.monster('S');
    des.monster('S');
    des.monster('S');
    des.monster('S');
    des.monster('S');
    des.monster('S');
    des.monster('S');
    des.monster('S');
    des.monster('S');
    des.monster('S');
    des.monster('S');
    des.monster('S');
    des.monster('S');
    des.monster('S');
    des.monster('S');
    des.monster('S');
    des.monster('human mummy');
    des.monster('human mummy');
    des.monster('human mummy');
    des.monster('human mummy');
    des.monster('human mummy');
    des.monster('human mummy');
    des.monster('human mummy');
    des.monster('human mummy');
    des.monster('M');
}

// The ported level scripts by file name, for nhl_loadlua().
export const questlev_arc_lua_files = {
    'Arc-strt.lua': Arc_strt_lua,
    'Arc-loca.lua': Arc_loca_lua,
    'Arc-fila.lua': Arc_fila_lua,
    'Arc-filb.lua': Arc_filb_lua,
    'Arc-goal.lua': Arc_goal_lua,
};
