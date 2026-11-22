// questlev_wiz_lua.js — port of the Wizard quest level scripts:
// dat/Wiz-strt.lua (home level), dat/Wiz-loca.lua (locate level),
// dat/Wiz-fila.lua and dat/Wiz-filb.lua (filler levels) and dat/Wiz-goal.lua
// (goal level).
// makemaz() loads them through load_special() (sp_lev.c).
// C ref: dat/Wiz-strt.lua, dat/Wiz-loca.lua, dat/Wiz-fila.lua, dat/Wiz-filb.lua, dat/Wiz-goal.lua
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

const MAP_Wiz_strt = [
    '............................................................................',
    '.....................C....CC.C........................C.....................',
    '..........CCC.....................CCC.......................................',
    '........CC........-----------.......C.C...C...C....C........................',
    '.......C.....---------------------...C..C..C..C.............................',
    '......C..C...------....\\....------....C.....C...............................',
    '........C...||....|.........|....||.........................................',
    '.......C....||....|.........+....||.........................................',
    '.......C...||---+--.........|....|||........................................',
    '......C....||...............|--S--||........................................',
    '...........||--+--|++----|---|..|.SS..........C......C......................',
    '........C..||.....|..|...|...|--|.||..CC..C.....C..........C................',
    '.......C...||.....|..|.--|.|.|....||.................C..C...................',
    '.....C......||....|..|.....|.|.--||..C..C..........C...........}}}..........',
    '......C.C...||....|..-----.|.....||...C.C.C..............C....}}}}}}........',
    '.........C...------........|------....C..C.....C..CC.C......}}}}}}}}}}}.....',
    '.........CC..---------------------...C.C..C.....CCCCC.C.......}}}}}}}}......',
    '.........C........-----------..........C.C.......CCC.........}}}}}}}}}......',
    '..........C.C.........................C............C...........}}}}}........',
    '......................CCC.C.................................................',
].join('\n') + '\n';

// C ref: dat/Wiz-strt.lua
//	The "start" level for the quest.
//
//	Here you meet your (besieged) class leader, Neferet the Green
//	and receive your quest assignment.
//
function Wiz_strt_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'noteleport', 'hardfloor');

    des.map(MAP_Wiz_strt);

    // first do cloud everywhere
    des.replace_terrain({ region: [0, 0, 75, 19], fromterrain: '.', toterrain: 'C', chance: 10 });
    // then replace clouds inside the tower back to floor
    des.replace_terrain({ region: [13, 5, 33, 15], fromterrain: 'C', toterrain: '.', chance: 100 });

    // Dungeon Description
    des.region(selection.area(0, 0, 75, 19), 'lit');
    des.region(selection.area(35, 0, 49, 3), 'unlit');
    des.region(selection.area(43, 12, 49, 16), 'unlit');
    des.region({ region: [19, 11, 33, 15], lit: 0, type: 'ordinary', irregular: 1 });
    des.region(selection.area(30, 10, 31, 10), 'unlit');
    // Stairs
    des.stair('down', 30, 10);
    // Portal arrival point
    des.terrain([63, 6], '.');
    des.levregion({ region: [63, 6, 63, 6], type: 'branch' });
    // Doors
    des.door('closed', 31, 9);
    des.door('closed', 16, 8);
    des.door('closed', 28, 7);
    des.door('locked', 34, 10);
    des.door('locked', 35, 10);
    des.door('closed', 15, 10);
    des.door('locked', 19, 10);
    des.door('locked', 20, 10);
    // Neferet the Green, the quest leader
    des.monster({ id: 'Neferet the Green', coord: [23, 5], inventory: function() {
            des.object({ id: 'elven cloak', spe: 5 });
            des.object({ id: 'quarterstaff', spe: 5 });
        } });
    // The treasure of the quest leader
    des.object('chest', 24, 5);
    // apprentice guards for the audience chamber
    des.monster('apprentice', 30, 7);
    des.monster('apprentice', 24, 6);
    des.monster('apprentice', 15, 6);
    des.monster('apprentice', 15, 12);
    des.monster('apprentice', 26, 11);
    des.monster('apprentice', 27, 11);
    des.monster('apprentice', 19, 9);
    des.monster('apprentice', 20, 9);
    // Eels in the pond
    des.monster('giant eel', 62, 14);
    des.monster('giant eel', 69, 15);
    des.monster('giant eel', 67, 17);
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
    des.monster({ class: 'B', x: 60, y: 9, peaceful: 0 });
    des.monster({ class: 'W', x: 60, y: 10, peaceful: 0 });
    des.monster({ class: 'B', x: 60, y: 11, peaceful: 0 });
    des.monster({ class: 'B', x: 60, y: 12, peaceful: 0 });
    des.monster({ class: 'i', x: 60, y: 13, peaceful: 0 });
    des.monster({ class: 'B', x: 61, y: 10, peaceful: 0 });
    des.monster({ class: 'B', x: 61, y: 11, peaceful: 0 });
    des.monster({ class: 'B', x: 61, y: 12, peaceful: 0 });
    des.monster({ class: 'B', x: 35, y: 3, peaceful: 0 });
    des.monster({ class: 'i', x: 35, y: 17, peaceful: 0 });
    des.monster({ class: 'B', x: 36, y: 17, peaceful: 0 });
    des.monster({ class: 'B', x: 34, y: 16, peaceful: 0 });
    des.monster({ class: 'i', x: 34, y: 17, peaceful: 0 });
    des.monster({ class: 'W', x: 67, y: 2, peaceful: 0 });
    des.monster({ class: 'B', x: 10, y: 19, peaceful: 0 });
}

const MAP_Wiz_loca = [
    '.............        .......................................................',
    '..............       .............}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}.......',
    '..............      ..............}.................................}.......',
    '..............      ..............}.-------------------------------.}.......',
    '...............     .........C....}.|.............................|.}.......',
    '...............    ..........C....}.|.---------------------------.|.}.......',
    '...............    .........CCC...}.|.|.........................|.|.}.......',
    '................   ....C....CCC...}.|.|.-----------------------.|.|.}.......',
    '.......C..C.....  .....C....CCC...}.|.|.|......+.......+......|.|.|.}.......',
    '.............C..CC.....C....CCC...}.|.|.|......|-------|......|.|.|.}.......',
    '................   ....C....CCC...}.|.|.|......|.......|......|.|.|.}.......',
    '......C..C.....    ....C....CCC...}.|.|.|......|-------|......|.|.|.}.......',
    '............C..     ...C....CCC...}.|.|.|......+.......+......|.|.|.}.......',
    '........C......    ....C....CCC...}.|.|.-----------------------.|.|.}.......',
    '....C......C...     ........CCC...}.|.|.........................|.|.}.......',
    '......C..C....      .........C....}.|.---------------------------.|.}.......',
    '..............      .........C....}.|.............................|.}.......',
    '.............       ..............}.-------------------------------.}.......',
    '.............        .............}.................................}.......',
    '.............        .............}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}.......',
    '.............        .......................................................',
].join('\n') + '\n';

// C ref: dat/Wiz-loca.lua
function Wiz_loca_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;
    // math.random called from the main chunk or an anonymous function
    const random = (line, ...args) => chunk_random(G, 'Wiz-loca.lua', line, ...args);

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'hardfloor');

    des.map(MAP_Wiz_loca);

    des.replace_terrain({ region: [0, 0, 30, 20], fromterrain: '.', toterrain: 'C', chance: 15 });
    des.replace_terrain({ region: [68, 0, 75, 20], fromterrain: '.', toterrain: '}', chance: 25 });
    des.replace_terrain({ region: [34, 1, 68, 19], fromterrain: '}', toterrain: '.', chance: 2 });

    // Dungeon Description
    des.region(selection.area(0, 0, 75, 20), 'lit');
    des.region({ region: [37, 4, 65, 16], lit: 0, type: 'ordinary', irregular: 1,
        contents: function() {
            des.door({ state: 'secret', wall: 'random' });
        } });
    des.region({ region: [39, 6, 63, 14], lit: 0, type: 'ordinary', irregular: 1,
        contents: function() {
            des.door({ state: 'secret', wall: 'random' });
        } });

    des.region({ region: [41, 8, 46, 12], lit: 1, type: 'ordinary', irregular: 1,
        contents: function() {
            const walls = ['north', 'south', 'west'];
            const widx = random(53, 1, walls.length);
            des.door({ state: 'secret', wall: walls[widx - 1] });
        } });

    des.region({ region: [56, 8, 61, 12], lit: 1, type: 'ordinary', irregular: 1,
        contents: function() {
            const walls = ['north', 'south', 'east'];
            const widx = random(61, 1, walls.length);
            des.door({ state: 'secret', wall: walls[widx - 1] });
        } });

    des.region(selection.area(48, 8, 54, 8), 'unlit');
    des.region(selection.area(48, 12, 54, 12), 'unlit');

    des.region({ region: [48, 10, 54, 10], lit: 0, type: 'ordinary', irregular: 1,
        contents: function() {
            des.door({ state: 'secret', wall: 'random' });
        } });

    // Doors
    des.door('locked', 55, 8);
    des.door('locked', 55, 12);
    des.door('locked', 47, 8);
    des.door('locked', 47, 12);
    // Stairs
    des.terrain([3, 17], '.');
    des.stair('up', 3, 17);
    des.stair('down', 48, 10);
    // Non diggable walls
    des.non_diggable(selection.area(0, 0, 75, 20));
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
    // Random traps
    des.trap('spiked pit', 24, 2);
    des.trap('spiked pit', 7, 10);
    des.trap('spiked pit', 23, 5);
    des.trap('spiked pit', 26, 19);
    des.trap('spiked pit', 72, 2);
    des.trap('spiked pit', 72, 12);
    des.trap('falling rock', 45, 16);
    des.trap('falling rock', 65, 13);
    des.trap('falling rock', 55, 6);
    des.trap('falling rock', 39, 11);
    des.trap('falling rock', 57, 9);
    des.trap('magic');
    des.trap('statue');
    des.trap('statue');
    des.trap('polymorph');
    des.trap('anti magic', 53, 10);
    des.trap('sleep gas');
    des.trap('sleep gas');
    des.trap('dart');
    des.trap('dart');
    des.trap('dart');
    // Random monsters.
    des.monster({ class: 'B', peaceful: 0 });
    des.monster({ class: 'B', peaceful: 0 });
    des.monster({ class: 'B', peaceful: 0 });
    des.monster({ class: 'B', peaceful: 0 });
    des.monster({ class: 'B', peaceful: 0 });
    des.monster({ class: 'B', peaceful: 0 });
    des.monster({ class: 'B', peaceful: 0 });
    des.monster({ class: 'B', peaceful: 0 });
    des.monster({ class: 'B', peaceful: 0 });
    des.monster({ class: 'B', peaceful: 0 });
    des.monster({ class: 'B', peaceful: 0 });
    des.monster({ class: 'B', peaceful: 0 });
    des.monster({ class: 'i', peaceful: 0 });
    des.monster({ class: 'i', peaceful: 0 });
    des.monster({ class: 'i', peaceful: 0 });
    des.monster({ class: 'i', peaceful: 0 });
    des.monster({ class: 'i', peaceful: 0 });
    des.monster({ class: 'i', peaceful: 0 });
    des.monster({ class: 'i', peaceful: 0 });
    des.monster('vampire bat');
    des.monster('vampire bat');
    des.monster('vampire bat');
    des.monster('vampire bat');
    des.monster('vampire bat');
    des.monster('vampire bat');
    des.monster('vampire bat');
    des.monster({ class: 'i', peaceful: 0 });
}

// C ref: dat/Wiz-fila.lua
function Wiz_fila_lua(L) {
    const G = L.globals, des = G.des;

    des.room({ type: 'ordinary',
        contents: function() {
            des.stair('up');
            des.object();
            des.monster({ class: 'i', peaceful: 0 });
        } });

    des.room({ type: 'ordinary',
        contents: function() {
            des.object();
            des.object();
            des.monster({ class: 'i', peaceful: 0 });
        } });

    des.room({ type: 'ordinary',
        contents: function() {
            des.object();
            des.trap();
            des.object();
            des.monster('vampire bat');
            des.monster('vampire bat');
        } });

    des.room({ type: 'ordinary',
        contents: function() {
            des.stair('down');
            des.object();
            des.trap();
            des.monster({ class: 'i', peaceful: 0 });
            des.monster('vampire bat');
        } });

    des.room({ type: 'ordinary',
        contents: function() {
            des.object();
            des.object();
            des.trap();
            des.monster({ class: 'i', peaceful: 0 });
        } });

    des.room({ type: 'ordinary',
        contents: function() {
            des.object();
            des.trap();
            des.monster('vampire bat');
        } });

    des.random_corridors();
}

// C ref: dat/Wiz-filb.lua
function Wiz_filb_lua(L) {
    const G = L.globals, des = G.des;

    des.room({ type: 'ordinary',
        contents: function() {
            des.stair('up');
            des.object();
            des.monster({ class: 'X', peaceful: 0 });
        } });

    des.room({ type: 'ordinary',
        contents: function() {
            des.object();
            des.object();
            des.monster({ class: 'i', peaceful: 0 });
        } });

    des.room({ type: 'ordinary',
        contents: function() {
            des.object();
            des.trap();
            des.object();
            des.monster({ class: 'X', peaceful: 0 });
        } });

    des.room({ type: 'ordinary',
        contents: function() {
            des.stair('down');
            des.object();
            des.trap();
            des.monster({ class: 'i', peaceful: 0 });
            des.monster('vampire bat');
        } });

    des.room({ type: 'ordinary',
        contents: function() {
            des.object();
            des.object();
            des.trap();
            des.monster({ class: 'i', peaceful: 0 });
        } });

    des.room({ type: 'ordinary',
        contents: function() {
            des.object();
            des.trap();
            des.monster('vampire bat');
        } });

    des.random_corridors();
}

const MAP_Wiz_goal = [
    '                                                                            ',
    '                                                                            ',
    '                                                                            ',
    '                   -------------                 -------------              ',
    '                   |...........|                 |...........|              ',
    '            -------|...........-------------------...........|              ',
    '            |......S...........|..|..|..|..|..|..|...........|              ',
    '            |......|...........|..|..|..|..|..|..|...........|              ',
    '            |......|...........-F+-F+-F+-F+-F+-F+-...........|              ',
    '            --S----|...........S.................+...........|              ',
    '            |......|...........-F+-F+-F+-F+-F+-F+-...........|              ',
    '            |......|...........|..|..|..|..|..|..|...........|              ',
    '            |......|...........|..|..|..|..|..|..|...........|              ',
    '            -------|...........-------------------...........|              ',
    '                   |...........|                 |...........|              ',
    '                   -------------                 -------------              ',
    '                                                                            ',
    '                                                                            ',
    '                                                                            ',
    '                                                                            ',
].join('\n') + '\n';

// C ref: dat/Wiz-goal.lua
function Wiz_goal_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel');

    des.map(MAP_Wiz_goal);
    // Dungeon Description
    des.region({ region: [13, 10, 18, 12], lit: 0, type: 'temple', filled: 2 });
    des.region(selection.area(13, 6, 18, 8), 'lit');
    des.region(selection.area(20, 4, 30, 14), 'unlit');
    des.region(selection.area(32, 6, 33, 7), 'unlit');
    des.region(selection.area(35, 6, 36, 7), 'unlit');
    des.region(selection.area(38, 6, 39, 7), 'unlit');
    des.region(selection.area(41, 6, 42, 7), 'unlit');
    des.region(selection.area(44, 6, 45, 7), 'unlit');
    des.region(selection.area(47, 6, 48, 7), 'unlit');
    des.region(selection.area(32, 9, 48, 9), 'unlit');
    des.region(selection.area(32, 11, 33, 12), 'unlit');
    des.region(selection.area(35, 11, 36, 12), 'unlit');
    des.region(selection.area(38, 11, 39, 12), 'unlit');
    des.region(selection.area(41, 11, 42, 12), 'unlit');
    des.region(selection.area(44, 11, 45, 12), 'unlit');
    des.region(selection.area(47, 11, 48, 12), 'unlit');
    des.region(selection.area(50, 4, 60, 14), 'lit');
    // Doors
    des.door('locked', 19, 6);
    des.door('locked', 14, 9);
    des.door('locked', 31, 9);
    des.door('locked', 33, 8);
    des.door('locked', 36, 8);
    des.door('locked', 39, 8);
    des.door('locked', 42, 8);
    des.door('locked', 45, 8);
    des.door('locked', 48, 8);
    des.door('locked', 33, 10);
    des.door('locked', 36, 10);
    des.door('locked', 39, 10);
    des.door('locked', 42, 10);
    des.door('locked', 45, 10);
    des.door('locked', 48, 10);
    des.door('locked', 49, 9);
    // Stairs
    des.stair('up', 55, 5);
    // Non diggable walls
    des.non_diggable(selection.area(0, 0, 75, 19));
    // The altar.  This is not a shrine.
    des.altar({ coord: [16, 11], aligned: 'noncoaligned', type: 'altar' });
    // Objects
    des.object({ id: 'amulet of ESP', x: 16, y: 11, buc: 'blessed', spe: 0, name: 'The Eye of the Aethiopica' });
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
    // Random monsters.
    des.monster('Dark One', 16, 11);
    des.monster({ class: 'B', peaceful: 0 } /* random: undefined global (nil) */);
    des.monster({ class: 'B', peaceful: 0 } /* random: undefined global (nil) */);
    des.monster({ class: 'B', peaceful: 0 } /* random: undefined global (nil) */);
    des.monster({ class: 'B', peaceful: 0 } /* random: undefined global (nil) */);
    des.monster({ class: 'B', peaceful: 0 } /* random: undefined global (nil) */);
    des.monster({ class: 'B', peaceful: 0 } /* random: undefined global (nil) */);
    des.monster({ class: 'B', peaceful: 0 } /* random: undefined global (nil) */);
    des.monster({ class: 'B', peaceful: 0 } /* random: undefined global (nil) */);
    des.monster({ class: 'B', peaceful: 0 } /* random: undefined global (nil) */);
    des.monster({ class: 'B', peaceful: 0 } /* random: undefined global (nil) */);
    des.monster({ class: 'B', peaceful: 0 } /* random: undefined global (nil) */);
    des.monster({ class: 'i', peaceful: 0 } /* random: undefined global (nil) */);
    des.monster({ class: 'i', peaceful: 0 } /* random: undefined global (nil) */);
    des.monster({ class: 'i', peaceful: 0 } /* random: undefined global (nil) */);
    des.monster({ class: 'i', peaceful: 0 } /* random: undefined global (nil) */);
    des.monster({ class: 'i', peaceful: 0 } /* random: undefined global (nil) */);
    des.monster({ class: 'i', peaceful: 0 } /* random: undefined global (nil) */);
    des.monster({ class: 'i', peaceful: 0 } /* random: undefined global (nil) */);
    des.monster('vampire bat');
    des.monster('vampire bat');
    des.monster('vampire bat');
    des.monster('vampire bat');
    des.monster('vampire bat');
    des.monster('vampire bat');
    des.monster('vampire bat');
    des.monster('vampire bat');
    des.monster({ class: 'i', peaceful: 0 } /* random: undefined global (nil) */);
    // Captive Monsters in the dungeon
    des.monster({ id: 'rogue', x: 35, y: 6, peaceful: 1, name: 'Pug' });
    des.monster({ id: 'owlbear', x: 47, y: 6, peaceful: 1, asleep: 1 });
    des.monster({ id: 'wizard', x: 32, y: 11, peaceful: 1, asleep: 1, name: 'Newt' });
    des.monster({ id: 'Grey-elf', x: 44, y: 11, peaceful: 1 });
    des.monster({ id: 'hill giant', x: 47, y: 11, peaceful: 1, asleep: 1 });
    des.monster({ id: 'gnomish wizard', x: 38, y: 6, peaceful: 1 });
    des.monster({ id: 'prisoner', x: 35, y: 11, peaceful: 1 });
    des.monster({ id: 'prisoner', x: 41, y: 11, peaceful: 1, asleep: 1 });
}

// The ported level scripts by file name, for nhl_loadlua().
export const questlev_wiz_lua_files = {
    'Wiz-strt.lua': Wiz_strt_lua,
    'Wiz-loca.lua': Wiz_loca_lua,
    'Wiz-fila.lua': Wiz_fila_lua,
    'Wiz-filb.lua': Wiz_filb_lua,
    'Wiz-goal.lua': Wiz_goal_lua,
};
