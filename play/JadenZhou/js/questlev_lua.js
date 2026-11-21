// questlev_lua.js — hand port of the quest level scripts sessions reach:
// dat/Bar-strt.lua and dat/Pri-strt.lua (the quest home levels).
// makemaz() loads them through load_special() (sp_lev.c).
// C ref: dat/Bar-strt.lua, dat/Pri-strt.lua
//
// These scripts roll no dice on the Lua side; the selection operator '&'
// is lua_band() (nhlua.js).

import { lua_band } from './nhlua.js';

// The des.map() maps, verbatim from the .lua files.
const MAP_Bar_strt = [
    '..................................PP........................................',
    '...................................PP.......................................',
    '...................................PP.......................................',
    '....................................PP......................................',
    '........--------------......-----....PPP....................................',
    '........|...S........|......+...|...PPP.....................................',
    '........|----........|......|...|....PP.....................................',
    '........|.\\..........+......-----...........................................',
    '........|----........|...............PP.....................................',
    '........|...S........|...-----.......PPP....................................',
    '........--------------...+...|......PPPPP...................................',
    '.........................|...|.......PPP....................................',
    '...-----......-----......-----........PP....................................',
    '...|...+......|...+..--+--.............PP...................................',
    '...|...|......|...|..|...|..............PP..................................',
    '...-----......-----..|...|.............PPPP.................................',
    '.....................-----............PP..PP................................',
    '.....................................PP...PP................................',
    '....................................PP...PP.................................',
    '....................................PP....PP................................',
].join('\n') + '\n';

const MAP_Pri_strt = [
    '............................................................................',
    '............................................................................',
    '............................................................................',
    '....................------------------------------------....................',
    '....................|................|.....|.....|.....|....................',
    '....................|..------------..|--+-----+-----+--|....................',
    '....................|..|..........|..|.................|....................',
    '....................|..|..........|..|+---+---+-----+--|....................',
    '..................---..|..........|......|...|...|.....|....................',
    '..................+....|..........+......|...|...|.....|....................',
    '..................+....|..........+......|...|...|.....|....................',
    '..................---..|..........|......|...|...|.....|....................',
    '....................|..|..........|..|+-----+---+---+--|....................',
    '....................|..|..........|..|.................|....................',
    '....................|..------------..|--+-----+-----+--|....................',
    '....................|................|.....|.....|.....|....................',
    '....................------------------------------------....................',
    '............................................................................',
    '............................................................................',
    '............................................................................',
].join('\n') + '\n';


// C ref: dat/Bar-strt.lua
//	The "start" level for the quest.
//
//	Here you meet your (besieged) class leader, Pelias,
//	and receive your quest assignment.
function Bar_strt_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'noteleport', 'hardfloor');

    des.map(MAP_Bar_strt);

    // -- the forest beyond the river
    des.replace_terrain({ region: [37, 0, 59, 19], fromterrain: '.', toterrain: 'T', chance: 5 });
    des.replace_terrain({ region: [60, 0, 64, 19], fromterrain: '.', toterrain: 'T', chance: 10 });
    des.replace_terrain({ region: [65, 0, 75, 19], fromterrain: '.', toterrain: 'T', chance: 20 });
    // -- guarantee a path and free spot for the portal
    des.terrain(selection.randline(selection.new(), 37, 7, 62, 2, 7), '.');
    des.terrain([62, 2], '.');

    // -- Dungeon Description
    des.region(selection.area(0, 0, 75, 19), 'lit');
    des.region(selection.area(9, 5, 11, 5), 'unlit');
    des.region(selection.area(9, 7, 11, 7), 'lit');
    des.region(selection.area(9, 9, 11, 9), 'unlit');
    des.region(selection.area(13, 5, 20, 9), 'lit');
    des.region(selection.area(29, 5, 31, 6), 'lit');
    des.region(selection.area(26, 10, 28, 11), 'lit');
    des.region(selection.area(4, 13, 6, 14), 'lit');
    des.region(selection.area(15, 13, 17, 14), 'lit');
    des.region(selection.area(22, 14, 24, 15), 'lit');
    // -- Stairs
    des.stair('down', 9, 9);
    // -- Portal arrival point
    des.levregion({ region: [62, 2, 62, 2], type: 'branch' });
    // -- Doors
    des.door('locked', 12, 5);
    des.door('locked', 12, 9);
    des.door('closed', 21, 7);
    des.door('open', 7, 13);
    des.door('open', 18, 13);
    des.door('open', 23, 13);
    des.door('open', 25, 10);
    des.door('open', 28, 5);
    // -- Elder
    des.monster({ id: 'Pelias', coord: [10, 7], inventory: function() {
        des.object({ id: 'runesword', spe: 5 });
        des.object({ id: 'chain mail', spe: 5 });
    } });
    // -- The treasure of Pelias
    des.object('chest', 9, 5);
    // -- chieftain guards for the audience chamber
    des.monster('chieftain', 10, 5);
    des.monster('chieftain', 10, 9);
    des.monster('chieftain', 11, 5);
    des.monster('chieftain', 11, 9);
    des.monster('chieftain', 14, 5);
    des.monster('chieftain', 14, 9);
    des.monster('chieftain', 16, 5);
    des.monster('chieftain', 16, 9);
    // -- Non diggable walls
    des.non_diggable(selection.area(0, 0, 75, 19));
    // -- One trap to keep the ogres at bay.
    des.trap('spiked pit', 37, 7);
    // -- Eels in the river
    des.monster('giant eel', 36, 1);
    des.monster('giant eel', 37, 9);
    des.monster('giant eel', 39, 15);
    // -- Monsters on siege duty.
    const ogrelocs = lua_band(selection.floodfill(37, 7), selection.area(40, 3, 45, 20));
    for (let i = 0; i <= 11; i++) {
        des.monster({ id: 'ogre', coord: ogrelocs.rndcoord(1), peaceful: 0 });
    }
}

// C ref: dat/Pri-strt.lua
//	The "start" level for the quest.
//
//	Here you meet your (besieged) class leader, High Priest
//	and receive your quest assignment.
function Pri_strt_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'noteleport', 'hardfloor');

    des.map(MAP_Pri_strt);
    // -- Dungeon Description
    des.region(selection.area(0, 0, 75, 19), 'lit');
    des.region({ region: [24, 6, 33, 13], lit: 1, type: 'temple', filled: 2 });

    des.replace_terrain({ region: [0, 0, 10, 19], fromterrain: '.', toterrain: 'T', chance: 10 });
    des.replace_terrain({ region: [65, 0, 75, 19], fromterrain: '.', toterrain: 'T', chance: 10 });
    des.terrain([5, 4], '.');

    const spacelocs = selection.floodfill(5, 4);

    // -- Portal arrival point
    des.levregion({ region: [5, 4, 5, 4], type: 'branch' });
    // -- Stairs
    des.stair('down', 52, 9);
    // -- Doors
    des.door('locked', 18, 9);
    des.door('locked', 18, 10);
    des.door('closed', 34, 9);
    des.door('closed', 34, 10);
    des.door('closed', 40, 5);
    des.door('closed', 46, 5);
    des.door('closed', 52, 5);
    des.door('locked', 38, 7);
    des.door('closed', 42, 7);
    des.door('closed', 46, 7);
    des.door('closed', 52, 7);
    des.door('locked', 38, 12);
    des.door('closed', 44, 12);
    des.door('closed', 48, 12);
    des.door('closed', 52, 12);
    des.door('closed', 40, 14);
    des.door('closed', 46, 14);
    des.door('closed', 52, 14);
    // -- Unattended Altar - unaligned due to conflict - player must align it.
    des.altar({ x: 28, y: 9, align: 'noalign', type: 'altar' });
    // -- High Priest
    des.monster({ id: 'Arch Priest', coord: [28, 10], inventory: function() {
        des.object({ id: 'robe', spe: 4 });
        des.object({ id: 'mace', spe: 4 });
    } });
    // -- The treasure of High Priest
    des.object('chest', 27, 10);
    // -- knight guards for the audience chamber
    des.monster('acolyte', 32, 7);
    des.monster('acolyte', 32, 8);
    des.monster('acolyte', 32, 11);
    des.monster('acolyte', 32, 12);
    des.monster('acolyte', 33, 7);
    des.monster('acolyte', 33, 8);
    des.monster('acolyte', 33, 11);
    des.monster('acolyte', 33, 12);
    // -- Non diggable walls
    des.non_diggable(selection.area(18, 3, 55, 16));
    // -- Random traps
    for (let i = 1; i <= 2; i++) {
        des.trap('dart', spacelocs.rndcoord(1));
    }
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    // -- Monsters on siege duty.
    for (let i = 1; i <= 12; i++) {
        des.monster('human zombie', spacelocs.rndcoord(1));
    }
}

// The hand-ported quest level scripts by file name, for nhl_loadlua().
export const quest_level_lua_files = {
    'Bar-strt.lua': Bar_strt_lua,
    'Pri-strt.lua': Pri_strt_lua,
};
