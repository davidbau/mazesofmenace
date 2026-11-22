// questlev_hea_lua.js — port of the Healer quest level scripts:
// dat/Hea-strt.lua (home level), dat/Hea-loca.lua (locate level),
// dat/Hea-fila.lua and dat/Hea-filb.lua (filler levels) and dat/Hea-goal.lua
// (goal level).
// makemaz() loads them through load_special() (sp_lev.c).
// C ref: dat/Hea-strt.lua, dat/Hea-loca.lua, dat/Hea-fila.lua, dat/Hea-filb.lua, dat/Hea-goal.lua
//
// Translated from the .lua files by a script (the des.map() maps are
// verbatim), then reviewed. Lua arrays are 1-based: t[i] is t[i - 1] here.
// Lua-side rolls (math.random, nh.rn2; percent, shuffle and d roll inside
// nhlib_lua.js) go through withRngCaller() with the tag the C recorder
// writes; the selection operators |, &, + and - are lua_bor(), lua_band(),
// lua_add() and lua_sub() (nhlua.js).


const MAP_Hea_strt = [
    'PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP',
    'PPPP........PPPP.....PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP.P..PPPPP......PPPPPPPP',
    'PPP..........PPPP...PPPPP.........................PPPP..PPPPP........PPPPPPP',
    'PP............PPPPPPPP..............................PPP...PPPP......PPPPPPPP',
    'P.....PPPPPPPPPPPPPPP................................PPPPPPPPPPPPPPPPPPPPPPP',
    'PPPP....PPPPPPPPPPPP...................................PPPPP.PPPPPPPPPPPPPPP',
    'PPPP........PPPPP.........-----------------------........PP...PPPPPPP.....PP',
    'PPP............PPPPP....--|.|......S..........S.|--.....PPPP.PPPPPPP.......P',
    'PPPP..........PPPPP.....|.S.|......-----------|S|.|......PPPPPP.PPP.......PP',
    'PPPPPP......PPPPPP......|.|.|......|...|......|.|.|.....PPPPPP...PP.......PP',
    'PPPPPPPPPPPPPPPPPPP.....+.|.|......S.\\.S......|.|.+......PPPPPP.PPPP.......P',
    'PPP...PPPPP...PPPP......|.|.|......|...|......|.|.|.......PPPPPPPPPPP.....PP',
    'PP.....PPP.....PPP......|.|S|-----------......|.S.|......PPPPPPPPPPPPPPPPPPP',
    'PPP..PPPPP...PPPP.......--|.S..........S......|.|--.....PPPPPPPPP....PPPPPPP',
    'PPPPPPPPPPPPPPPP..........-----------------------..........PPPPP..........PP',
    'PPPPPPPPPPPPPPPPP........................................PPPPPP............P',
    'PPP.............PPPP...................................PPP..PPPP..........PP',
    'PP...............PPPPP................................PPPP...PPPP........PPP',
    'PPP.............PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP....PPPPPP',
    'PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP',
].join('\n') + '\n';

// C ref: dat/Hea-strt.lua
//	The "start" level for the quest.
//
//	Here you meet your (besieged) class leader, Hippocrates
//	and receive your quest assignment.
//
function Hea_strt_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'noteleport', 'hardfloor');

    des.map(MAP_Hea_strt);

    des.replace_terrain({ region: [1, 1, 74, 18], fromterrain: 'P', toterrain: '.', chance: 10 });

    // Dungeon Description
    des.region(selection.area(0, 0, 75, 19), 'lit');
    // Stairs
    des.stair('down', 37, 9);
    // Portal arrival point
    des.levregion({ region: [4, 12, 4, 12], type: 'branch' });
    // altar for the Temple
    des.altar({ x: 32, y: 9, align: 'neutral', type: 'altar' });
    // Doors
    des.door('locked', 24, 10);
    des.door('closed', 26, 8);
    des.door('closed', 27, 12);
    des.door('locked', 28, 13);
    des.door('closed', 35, 7);
    des.door('locked', 35, 10);
    des.door('locked', 39, 10);
    des.door('closed', 39, 13);
    des.door('locked', 46, 7);
    des.door('closed', 47, 8);
    des.door('closed', 48, 12);
    des.door('locked', 50, 10);
    // Hippocrates
    des.monster({ id: 'Hippocrates', coord: [37, 10], inventory: function() {
            des.object({ id: 'silver dagger', spe: 5 });
        } });
    // The treasure of Hippocrates
    des.object('chest', 37, 10);
    // intern guards for the audience chamber
    des.monster('attendant', 29, 8);
    des.monster('attendant', 29, 9);
    des.monster('attendant', 29, 10);
    des.monster('attendant', 29, 11);
    des.monster('attendant', 40, 9);
    des.monster('attendant', 40, 10);
    des.monster('attendant', 40, 11);
    des.monster('attendant', 40, 13);
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
    des.monster('rabid rat');
    des.monster('rabid rat');
    des.monster('rabid rat');
    des.monster('rabid rat');
    des.monster('rabid rat');
    des.monster('rabid rat');
    des.monster('rabid rat');
    des.monster('rabid rat');
    des.monster('rabid rat');
    des.monster('rabid rat');
    des.monster('giant eel');
    des.monster('shark');
    des.monster(';');
    des.monster({ class: 'D', peaceful: 0 });
    des.monster({ class: 'D', peaceful: 0 });
    des.monster({ class: 'D', peaceful: 0 });
    des.monster({ class: 'D', peaceful: 0 });
    des.monster({ class: 'D', peaceful: 0 });
    des.monster({ class: 'S', peaceful: 0 });
    des.monster({ class: 'S', peaceful: 0 });
    des.monster({ class: 'S', peaceful: 0 });
    des.monster({ class: 'S', peaceful: 0 });
    des.monster({ class: 'S', peaceful: 0 });
}

const MAP_Hea_loca = [
    'PPPPPPPPPPPPP.......PPPPPPPPPPP',
    'PPPPPPPP...............PPPPPPPP',
    'PPPP.....-------------...PPPPPP',
    'PPPPP....|.S.........|....PPPPP',
    'PPP......+.|.........|...PPPPPP',
    'PPP......+.|.........|..PPPPPPP',
    'PPPP.....|.S.........|..PPPPPPP',
    'PPPPP....-------------....PPPPP',
    'PPPPPPPP...............PPPPPPPP',
    'PPPPPPPPPPP........PPPPPPPPPPPP',
].join('\n') + '\n';

// C ref: dat/Hea-loca.lua
function Hea_loca_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'hardfloor');
    //
    des.level_init({ style: 'mines', fg: '.', bg: 'P', smoothed: true, joined: true, lit: 1, walled: false });

    des.map(MAP_Hea_loca);
    // Dungeon Description
    des.region(selection.area(0, 0, 30, 9), 'lit');
    des.region({ region: [12, 3, 20, 6], lit: 1, type: 'temple', filled: 1 });
    // Doors
    des.door('closed', 9, 4);
    des.door('closed', 9, 5);
    des.door('locked', 11, 3);
    des.door('locked', 11, 6);
    // Stairs
    des.stair('up', 4, 4);
    des.stair('down', 20, 6);
    // Non diggable walls
    des.non_diggable(selection.area(11, 2, 21, 7));
    // Altar in the temple.
    des.altar({ x: 13, y: 5, align: 'chaos', type: 'shrine' });
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
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    // Random monsters.
    des.monster('rabid rat');
    des.monster('rabid rat');
    des.monster('rabid rat');
    des.monster('rabid rat');
    des.monster('rabid rat');
    des.monster('rabid rat');
    des.monster('rabid rat');
    des.monster('rabid rat');
    des.monster({ class: 'r', peaceful: 0 });
    des.monster('giant eel');
    des.monster('giant eel');
    des.monster('giant eel');
    des.monster('giant eel');
    des.monster('giant eel');
    des.monster('electric eel');
    des.monster('electric eel');
    des.monster('kraken');
    des.monster('shark');
    des.monster('shark');
    des.monster({ class: ';', peaceful: 0 });
    des.monster({ class: ';', peaceful: 0 });
    des.monster({ class: 'D', peaceful: 0 });
    des.monster({ class: 'D', peaceful: 0 });
    des.monster({ class: 'D', peaceful: 0 });
    des.monster({ class: 'D', peaceful: 0 });
    des.monster({ class: 'D', peaceful: 0 });
    des.monster({ class: 'S', peaceful: 0 });
    des.monster({ class: 'S', peaceful: 0 });
    des.monster({ class: 'S', peaceful: 0 });
    des.monster({ class: 'S', peaceful: 0 });
    des.monster({ class: 'S', peaceful: 0 });
    des.monster({ class: 'S', peaceful: 0 });
    des.monster({ class: 'S', peaceful: 0 });
    des.monster({ class: 'S', peaceful: 0 });
    des.monster({ class: 'S', peaceful: 0 });
}

// C ref: dat/Hea-fila.lua
function Hea_fila_lua(L) {
    const G = L.globals, des = G.des;

    des.level_init({ style: 'solidfill', fg: 'P' });

    des.level_flags('mazelevel', 'noflip');

    des.level_init({ style: 'mines', fg: '.', bg: 'P', smoothed: false, joined: true, lit: 1, walled: false });

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
    //
    des.monster('rabid rat');
    des.monster({ class: 'r', peaceful: 0 });
    des.monster({ class: 'r', peaceful: 0 });
    des.monster('giant eel');
    des.monster('giant eel');
    des.monster('electric eel');
    des.monster({ class: 'D', peaceful: 0 });
    des.monster({ class: 'D', peaceful: 0 });
    des.monster({ class: 'D', peaceful: 0 });
    des.monster({ class: 'D', peaceful: 0 });
    des.monster({ class: 'S', peaceful: 0 });
    des.monster({ class: 'S', peaceful: 0 });
    des.monster({ class: 'S', peaceful: 0 });
    //
    des.trap();
    des.trap();
    des.trap();
    des.trap();
}

// C ref: dat/Hea-filb.lua
function Hea_filb_lua(L) {
    const G = L.globals, des = G.des;

    des.level_init({ style: 'solidfill', fg: 'P' });

    des.level_flags('mazelevel', 'noflip');

    des.level_init({ style: 'mines', fg: '.', bg: 'P', smoothed: false, joined: true, lit: 1, walled: false });

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
    des.monster('rabid rat');
    des.monster('rabid rat');
    des.monster({ class: 'r', peaceful: 0 });
    des.monster({ class: 'r', peaceful: 0 });
    des.monster('giant eel');
    des.monster('giant eel');
    des.monster('giant eel');
    des.monster('giant eel');
    des.monster('giant eel');
    des.monster('electric eel');
    des.monster('electric eel');
    des.monster({ class: 'D', peaceful: 0 });
    des.monster({ class: 'D', peaceful: 0 });
    des.monster({ class: 'D', peaceful: 0 });
    des.monster({ class: 'D', peaceful: 0 });
    des.monster({ class: 'S', peaceful: 0 });
    des.monster({ class: 'S', peaceful: 0 });
    des.monster({ class: 'S', peaceful: 0 });
    //
    des.trap();
    des.trap();
    des.trap();
    des.trap();
}

const MAP_Hea_goal = [
    '.P....................................PP.',
    'PP.......PPPPPPP....PPPPPPP....PPPP...PP.',
    '...PPPPPPP....PPPPPPP.....PPPPPP..PPP...P',
    '...PP..............................PPP...',
    '..PP..............................PP.....',
    '..PP..............................PPP....',
    '..PPP..............................PP....',
    '.PPP..............................PPPP...',
    '...PP............................PPP...PP',
    '..PPPP...PPPPP..PPPP...PPPPP.....PP...PP.',
    'P....PPPPP...PPPP..PPPPP...PPPPPPP...PP..',
    'PPP..................................PPP.',
].join('\n') + '\n';

// C ref: dat/Hea-goal.lua
function Hea_goal_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;

    des.level_init({ style: 'solidfill', fg: 'P' });

    des.level_flags('mazelevel');

    //
    des.level_init({ style: 'mines', fg: '.', bg: 'P', smoothed: false, joined: true, lit: 1, walled: false });

    des.map(MAP_Hea_goal);
    // Dungeon Description
    des.region(selection.area(0, 0, 40, 11), 'lit');
    // Stairs
    des.stair('up', 39, 10);
    // Non diggable walls
    des.non_diggable(selection.area(0, 0, 40, 11));
    // Objects
    des.object({ id: 'quarterstaff', x: 20, y: 6, buc: 'blessed', spe: 0, name: 'The Staff of Aesculapius' });
    des.object('wand of lightning', 20, 6);
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
    des.monster({ id: 'Cyclops', x: 20, y: 6, peaceful: 0 });
    des.monster('rabid rat');
    des.monster('rabid rat');
    des.monster('rabid rat');
    des.monster({ class: 'r', peaceful: 0 });
    des.monster({ class: 'r', peaceful: 0 });
    des.monster('giant eel');
    des.monster('giant eel');
    des.monster('giant eel');
    des.monster('giant eel');
    des.monster('giant eel');
    des.monster('giant eel');
    des.monster('electric eel');
    des.monster('electric eel');
    des.monster('shark');
    des.monster('shark');
    des.monster({ class: ';', peaceful: 0 });
    des.monster({ class: 'D', peaceful: 0 });
    des.monster({ class: 'D', peaceful: 0 });
    des.monster({ class: 'D', peaceful: 0 });
    des.monster({ class: 'D', peaceful: 0 });
    des.monster({ class: 'D', peaceful: 0 });
    des.monster({ class: 'S', peaceful: 0 });
    des.monster({ class: 'S', peaceful: 0 });
    des.monster({ class: 'S', peaceful: 0 });
    des.monster({ class: 'S', peaceful: 0 });
    des.monster({ class: 'S', peaceful: 0 });
    des.monster({ class: 'S', peaceful: 0 });
    des.monster({ class: 'S', peaceful: 0 });
    des.monster({ class: 'S', peaceful: 0 });
    des.monster({ class: 'S', peaceful: 0 });
    des.monster({ class: 'S', peaceful: 0 });
}

// The ported level scripts by file name, for nhl_loadlua().
export const questlev_hea_lua_files = {
    'Hea-strt.lua': Hea_strt_lua,
    'Hea-loca.lua': Hea_loca_lua,
    'Hea-fila.lua': Hea_fila_lua,
    'Hea-filb.lua': Hea_filb_lua,
    'Hea-goal.lua': Hea_goal_lua,
};
