// questlev_sam_lua.js — port of the Samurai quest level scripts:
// dat/Sam-strt.lua (home level), dat/Sam-loca.lua (locate level),
// dat/Sam-fila.lua and dat/Sam-filb.lua (filler levels) and dat/Sam-goal.lua
// (goal level).
// makemaz() loads them through load_special() (sp_lev.c).
// C ref: dat/Sam-strt.lua, dat/Sam-loca.lua, dat/Sam-fila.lua, dat/Sam-filb.lua, dat/Sam-goal.lua
//
// Translated from the .lua files by a script (the des.map() maps are
// verbatim), then reviewed. Lua arrays are 1-based: t[i] is t[i - 1] here.
// Lua-side rolls (math.random, nh.rn2; percent, shuffle and d roll inside
// nhlib_lua.js) go through withRngCaller() with the tag the C recorder
// writes; the selection operators |, &, + and - are lua_bor(), lua_band(),
// lua_add() and lua_sub() (nhlua.js).

import { withRngCaller } from './rng.js';

// math.random called from a script's main chunk or from an anonymous
// function the C side calls (contents, inventory, iterate): the recorder
// tags the roll with nhlib's math.random line (8 for one argument, 10 for
// two) and the calling frame, which Lua cannot name ("lua"), at the calling
// line.
function chunk_random(G, file, line, ...args) {
    return withRngCaller(
        `random src=nhlib.lua:${args.length === 1 ? 8 : 10} parent=lua(${file}:${line})`,
        () => G.math.random(...args));
}

const MAP_Sam_strt = [
    '..............................................................PP............',
    '...............................................................PP...........',
    '..........---------------------------------------------------...PPP.........',
    '..........|......|.........|...|..............|...|.........|....PPPPP......',
    '......... |......|.........S...|..............|...S.........|.....PPPP......',
    '..........|......|.........|---|..............|---|.........|.....PPP.......',
    '..........+......|.........+...-------++-------...+.........|......PP.......',
    '..........+......|.........|......................|.........|......PP.......',
    '......... |......---------------------++--------------------|........PP.....',
    '..........|.................................................|.........PP....',
    '..........|.................................................|...........PP..',
    '..........----------------------------------------...-------|............PP.',
    '..........................................|.................|.............PP',
    '.............. ................. .........|.................|..............P',
    '............. } ............... } ........|.................|...............',
    '.............. ........PP....... .........|.................|...............',
    '.....................PPP..................|.................|...............',
    '......................PP..................-------------------...............',
    '............................................................................',
    '............................................................................',
].join('\n') + '\n';

// C ref: dat/Sam-strt.lua
//	The "start" level for the quest.
//
//	Here you meet your (besieged) class leader, Lord Sato
//	and receive your quest assignment.
//
//      The throne room designation produces random atmospheric
//      messages (until the room is entered) but this one doesn't
//      actually contain any throne.
//
function Sam_strt_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'noteleport', 'hardfloor');

    des.map(MAP_Sam_strt);
    // Dungeon Description
    des.region(selection.area(0, 0, 75, 19), 'lit');
    des.region({ region: [18, 3, 26, 7], lit: 1, type: 'throne', filled: 2 });
    // Portal arrival zone
    des.levregion({ region: [62, 12, 70, 17], type: 'branch' });
    // Stairs
    des.stair('down', 29, 4);
    // Doors
    des.door('locked', 10, 6);
    des.door('locked', 10, 7);
    des.door('closed', 27, 4);
    des.door('closed', 27, 6);
    des.door('closed', 38, 6);
    des.door('locked', 38, 8);
    des.door('closed', 39, 6);
    des.door('locked', 39, 8);
    des.door('closed', 50, 4);
    des.door('closed', 50, 6);
    // Lord Sato
    des.monster({ id: 'Lord Sato', coord: [20, 4], inventory: function() {
            des.object({ id: 'splint mail', spe: 5, eroded: -1, buc: 'not-cursed' });
            des.object({ id: 'katana', spe: 4, eroded: -1, buc: 'not-cursed' });
        } });
    // The treasure of Lord Sato
    des.object('chest', 20, 4);
    // roshi guards for the audience chamber
    des.monster('roshi', 18, 4);
    des.monster('roshi', 18, 5);
    des.monster('roshi', 18, 6);
    des.monster('roshi', 18, 7);
    des.monster('roshi', 26, 4);
    des.monster('roshi', 26, 5);
    des.monster('roshi', 26, 6);
    des.monster('roshi', 26, 7);
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
    des.monster({ id: 'ninja', x: 64, y: 0, peaceful: 0 });
    des.monster('wolf', 65, 1);
    des.monster({ id: 'ninja', x: 67, y: 2, peaceful: 0 });
    des.monster({ id: 'ninja', x: 69, y: 5, peaceful: 0 });
    des.monster({ id: 'ninja', x: 69, y: 6, peaceful: 0 });
    des.monster('wolf', 69, 7);
    des.monster({ id: 'ninja', x: 70, y: 6, peaceful: 0 });
    des.monster({ id: 'ninja', x: 70, y: 7, peaceful: 0 });
    des.monster({ id: 'ninja', x: 72, y: 1, peaceful: 0 });
    des.monster('wolf', 75, 9);
    des.monster({ id: 'ninja', x: 73, y: 5, peaceful: 0 });
    des.monster({ id: 'ninja', x: 68, y: 2, peaceful: 0 });
    des.monster('stalker');
}

const MAP_Sam_loca = [
    '............................................................................',
    '............................................................................',
    '........-----..................................................-----........',
    '........|...|..................................................|...|........',
    '........|...---..}..--+------------------------------+--..}..---...|........',
    '........|-|...|.....|...|....|....|....|....|....|.|...|.....|...|-|........',
    '..........|...-------...|....|....|....|....|....S.|...-------...|..........',
    '..........|-|.........------+----+-+-------+-+--------.........|-|..........',
    '............|..--------.|}........................}|.--------..|............',
    '............|..+........+..........................+........+..|............',
    '............|..+........+..........................+........+..|............',
    '............|..--------.|}........................}|.--------..|............',
    '..........|-|.........--------+-+-------+-+----+------.........|-|..........',
    '..........|...-------...|.S....|....|....|....|....|...-------...|..........',
    '........|-|...|.....|...|.|....|....|....|....|....|...|.....|...|-|........',
    '........|...---..}..--+------------------------------+--..}..---...|........',
    '........|...|..................................................|...|........',
    '........-----..................................................-----........',
    '............................................................................',
    '............................................................................',
].join('\n') + '\n';

// C ref: dat/Sam-loca.lua
function Sam_loca_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'hardfloor');

    des.map(MAP_Sam_loca);
    // Dungeon Description
    des.region(selection.area(0, 0, 75, 19), 'lit');
    // Doors
    des.door('locked', 22, 4);
    des.door('locked', 22, 15);
    des.door('locked', 53, 4);
    des.door('locked', 53, 15);
    des.door('locked', 49, 6);
    des.door('locked', 26, 13);
    des.door('locked', 28, 7);
    des.door('locked', 30, 12);
    des.door('locked', 33, 7);
    des.door('locked', 32, 12);
    des.door('locked', 35, 7);
    des.door('locked', 40, 12);
    des.door('locked', 43, 7);
    des.door('locked', 42, 12);
    des.door('locked', 45, 7);
    des.door('locked', 47, 12);
    des.door('closed', 15, 9);
    des.door('closed', 15, 10);
    des.door('closed', 24, 9);
    des.door('closed', 24, 10);
    des.door('closed', 51, 9);
    des.door('closed', 51, 10);
    des.door('closed', 60, 9);
    des.door('closed', 60, 10);
    // Stairs
    des.stair('up', 10, 10);
    des.stair('down', 25, 14);
    // Non diggable walls
    des.non_diggable(selection.area(0, 0, 75, 19));
    // Objects
    des.object('*', 25, 5);
    des.object('*', 26, 5);
    des.object('*', 27, 5);
    des.object('*', 28, 5);
    des.object('*', 25, 6);
    des.object('*', 26, 6);
    des.object('*', 27, 6);
    des.object('*', 28, 6);
    //
    des.object('[', 40, 5);
    des.object('[', 41, 5);
    des.object('[', 42, 5);
    des.object('[', 43, 5);
    des.object('[', 40, 6);
    des.object('[', 41, 6);
    des.object('[', 42, 6);
    des.object('[', 43, 6);
    //
    des.object(')', 27, 13);
    des.object(')', 28, 13);
    des.object(')', 29, 13);
    des.object(')', 30, 13);
    des.object(')', 27, 14);
    des.object(')', 28, 14);
    des.object(')', 29, 14);
    des.object(')', 30, 14);
    //
    des.object('(', 37, 13);
    des.object('(', 38, 13);
    des.object('(', 39, 13);
    des.object('(', 40, 13);
    des.object('(', 37, 14);
    des.object('(', 38, 14);
    des.object('(', 39, 14);
    des.object('(', 40, 14);
    // Random traps
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    // Random monsters.
    des.monster({ id: 'ninja', x: 15, y: 5, peaceful: 0 });
    des.monster({ id: 'ninja', x: 16, y: 5, peaceful: 0 });
    des.monster('wolf', 17, 5);
    des.monster('wolf', 18, 5);
    des.monster({ id: 'ninja', x: 19, y: 5, peaceful: 0 });
    des.monster('wolf', 15, 14);
    des.monster('wolf', 16, 14);
    des.monster({ id: 'ninja', x: 17, y: 14, peaceful: 0 });
    des.monster({ id: 'ninja', x: 18, y: 14, peaceful: 0 });
    des.monster('wolf', 56, 5);
    des.monster({ id: 'ninja', x: 57, y: 5, peaceful: 0 });
    des.monster('wolf', 58, 5);
    des.monster('wolf', 59, 5);
    des.monster({ id: 'ninja', x: 56, y: 14, peaceful: 0 });
    des.monster('wolf', 57, 14);
    des.monster({ id: 'ninja', x: 58, y: 14, peaceful: 0 });
    des.monster('d', 59, 14);
    des.monster('wolf', 60, 14);
    des.monster('stalker');
    des.monster('stalker');
    des.monster('stalker');
    des.monster('stalker');
    des.monster('stalker');
    des.monster('stalker');
    des.monster('stalker');
    des.monster('stalker');
    des.monster('stalker');
    //	"guards" for the central courtyard.
    des.monster({ id: 'samurai', x: 30, y: 5, peaceful: 0 });
    des.monster({ id: 'samurai', x: 31, y: 5, peaceful: 0 });
    des.monster({ id: 'samurai', x: 32, y: 5, peaceful: 0 });
    des.monster({ id: 'samurai', x: 32, y: 14, peaceful: 0 });
    des.monster({ id: 'samurai', x: 33, y: 14, peaceful: 0 });
    des.monster({ id: 'samurai', x: 34, y: 14, peaceful: 0 });
}

// C ref: dat/Sam-fila.lua
function Sam_fila_lua(L) {
    const G = L.globals, des = G.des;

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'noflip');

    des.level_init({ style: 'mines', fg: '.', bg: 'P', smoothed: true, joined: true, walled: true });

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
    //
    des.monster('d');
    des.monster('wolf');
    des.monster('wolf');
    des.monster('wolf');
    des.monster('wolf');
    des.monster('wolf');
    des.monster('stalker');
    //
    des.trap();
    des.trap();
    des.trap();
    des.trap();
}

const MAP_Sam_filb = [
    '-------------                                  -------------',
    '|...........|                                  |...........|',
    '|...-----...|----------------------------------|...-----...|',
    '|...|   |...|..................................|...|   |...|',
    '|...-----..........................................-----...|',
    '|...........|--S----------------------------S--|...........|',
    '----...--------.|..........................|.--------...----',
    '   |...|........+..........................+........|...|   ',
    '   |...|........+..........................+........|...|   ',
    '----...--------.|..........................|.--------...----',
    '|...........|--S----------------------------S--|...........|',
    '|...-----..........................................-----...|',
    '|...|   |...|..................................|...|   |...|',
    '|...-----...|----------------------------------|...-----...|',
    '|...........|                                  |...........|',
    '-------------                                  -------------',
].join('\n') + '\n';

// C ref: dat/Sam-filb.lua
function Sam_filb_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel');

    des.map(MAP_Sam_filb);
    des.region(selection.area(0, 0, 59, 15), 'unlit');
    // Doors
    des.door('closed', 16, 7);
    des.door('closed', 16, 8);
    des.door('closed', 43, 7);
    des.door('closed', 43, 8);
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
    //
    des.monster('d');
    des.monster('wolf');
    des.monster('wolf');
    des.monster('wolf');
    des.monster('wolf');
    des.monster('stalker');
    des.monster('stalker');
    des.monster('stalker');
    //
    des.trap();
    des.trap();
    des.trap();
    des.trap();
}

const MAP_Sam_goal = [
    '                                             ',
    '           .......................           ',
    '       ......-------------------......       ',
    '    ......----.................----......    ',
    '   ....----.....-------------.....----....   ',
    '  ....--.....----...........----.....--....  ',
    '  ...||....---....---------....---....||...  ',
    '  ...|....--....---.......---....--....|...  ',
    ' ....|...||...---...--+--...---...||...|.... ',
    ' ....|...|....|....|-...-|....|....|...|.... ',
    ' ....|...|....|....+.....+....|....|...|.... ',
    ' ....|...|....|....|-...-|....|....|...|.... ',
    ' ....|...||...---...--+--...---...||...|.... ',
    '  ...|....--....---.......---....--....|...  ',
    '  ...||....---....---------....---....||...  ',
    '  ....--.....----...........----.....--....  ',
    '   ....----.....-------------.....----....   ',
    '    ......----.................----......    ',
    '       ......-------------------......       ',
    '           .......................           ',
].join('\n') + '\n';

// C ref: dat/Sam-goal.lua
function Sam_goal_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;
    // math.random called from the main chunk or an anonymous function
    const random = (line, ...args) => chunk_random(G, 'Sam-goal.lua', line, ...args);

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'noteleport');

    des.map(MAP_Sam_goal);
    // Dungeon Description
    const place = [[2, 11], [42, 9]];
    const placeidx = random(34, 1, place.length);

    des.region(selection.area(0, 0, 44, 19), 'unlit');
    // Doors
    des.door('closed', 19, 10);
    des.door('closed', 22, 8);
    des.door('closed', 22, 12);
    des.door('closed', 25, 10);
    // Stairs
    des.stair({ dir: 'up', coord: place[placeidx - 1] });

    // Holes in the concentric ring walls
    const place_2 = [[22, 14], [30, 10], [22, 6], [14, 10]];
    const placeidx_2 = random(47, 1, place_2.length);
    des.terrain(place_2[placeidx_2 - 1], '.');
    const place_3 = [[22, 4], [35, 10], [22, 16], [9, 10]];
    const placeidx_3 = random(50, 1, place_3.length);
    des.terrain(place_3[placeidx_3 - 1], '.');
    const place_4 = [[22, 2], [22, 18]];
    const placeidx_4 = random(53, 1, place_4.length);
    des.terrain(place_4[placeidx_4 - 1], '.');

    // Non diggable walls
    des.non_diggable(selection.area(0, 0, 44, 19));
    // Objects
    des.object({ id: 'tsurugi', x: 22, y: 10, buc: 'blessed', spe: 0, name: 'The Tsurugi of Muramasa' });
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
    //
    des.trap('board', 22, 9);
    des.trap('board', 24, 10);
    des.trap('board', 22, 11);
    // Random traps
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    // Random monsters.
    des.monster('Ashikaga Takauji', 22, 10);
    des.monster({ id: 'samurai', peaceful: 0 });
    des.monster({ id: 'samurai', peaceful: 0 });
    des.monster({ id: 'samurai', peaceful: 0 });
    des.monster({ id: 'samurai', peaceful: 0 });
    des.monster({ id: 'samurai', peaceful: 0 });
    des.monster({ id: 'ninja', peaceful: 0 });
    des.monster({ id: 'ninja', peaceful: 0 });
    des.monster({ id: 'ninja', peaceful: 0 });
    des.monster({ id: 'ninja', peaceful: 0 });
    des.monster({ id: 'ninja', peaceful: 0 });
    des.monster('wolf');
    des.monster('wolf');
    des.monster('wolf');
    des.monster('wolf');
    des.monster('d');
    des.monster('d');
    des.monster('stalker');
    des.monster('stalker');
    des.monster('stalker');
    des.monster('stalker');
    des.monster('stalker');
    des.monster('stalker');
    des.monster('stalker');
    des.monster('stalker');
    des.monster('stalker');
}

// The ported level scripts by file name, for nhl_loadlua().
export const questlev_sam_lua_files = {
    'Sam-strt.lua': Sam_strt_lua,
    'Sam-loca.lua': Sam_loca_lua,
    'Sam-fila.lua': Sam_fila_lua,
    'Sam-filb.lua': Sam_filb_lua,
    'Sam-goal.lua': Sam_goal_lua,
};
