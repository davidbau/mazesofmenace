// questlev_lua.js — hand port of the quest level scripts sessions reach:
// dat/Bar-strt.lua and dat/Pri-strt.lua (the quest home levels),
// dat/Bar-loca.lua (locate level), dat/Bar-fila.lua and dat/Bar-filb.lua
// (filler levels) and dat/Bar-goal.lua (goal level). The other roles'
// quest levels are in questlev_<role>_lua.js; quest_level_lua_files below
// lists them all.
// makemaz() loads them through load_special() (sp_lev.c).
// C ref: dat/Bar-strt.lua, dat/Pri-strt.lua, dat/Bar-loca.lua, dat/Bar-fila.lua,
// dat/Bar-filb.lua, dat/Bar-goal.lua
//
// These scripts roll no dice on the Lua side; the selection operator '&'
// is lua_band() (nhlua.js).

import { lua_band } from './nhlua.js';
import { questlev_arc_lua_files } from './questlev_arc_lua.js';
import { questlev_cav_lua_files } from './questlev_cav_lua.js';
import { questlev_hea_lua_files } from './questlev_hea_lua.js';
import { questlev_kni_lua_files } from './questlev_kni_lua.js';
import { questlev_mon_lua_files } from './questlev_mon_lua.js';
import { questlev_pri_lua_files } from './questlev_pri_lua.js';
import { questlev_ran_lua_files } from './questlev_ran_lua.js';
import { questlev_rog_lua_files } from './questlev_rog_lua.js';
import { questlev_sam_lua_files } from './questlev_sam_lua.js';
import { questlev_tou_lua_files } from './questlev_tou_lua.js';
import { questlev_val_lua_files } from './questlev_val_lua.js';
import { questlev_wiz_lua_files } from './questlev_wiz_lua.js';

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

const MAP_Bar_loca = [
    '..........PPP.........................................                      ',
    '...........PP..........................................        .......      ',
    '..........PP...........-----..........------------------     ..........     ',
    '...........PP..........+...|..........|....S...........|..  ............    ',
    '..........PPP..........|...|..........|-----...........|...  .............  ',
    '...........PPP.........-----..........+....+...........|...  .............  ',
    '..........PPPPPPPPP...................+....+...........S.................   ',
    '........PPPPPPPPPPPPP.........-----...|-----...........|................    ',
    '......PPPPPPPPPPPPPP..P.......+...|...|....S...........|          ...       ',
    '.....PPPPPPP......P..PPPP.....|...|...------------------..         ...      ',
    '....PPPPPPP.........PPPPPP....-----........................      ........   ',
    '...PPPPPPP..........PPPPPPP..................................   ..........  ',
    '....PPPPPPP........PPPPPPP....................................  ..........  ',
    '.....PPPPP........PPPPPPP.........-----........................   ........  ',
    '......PPP..PPPPPPPPPPPP...........+...|.........................    .....   ',
    '..........PPPPPPPPPPP.............|...|.........................     ....   ',
    '..........PPPPPPPPP...............-----.........................       .    ',
    '..............PPP.................................................          ',
    '...............PP....................................................       ',
    '................PPP...................................................      ',
].join('\n') + '\n';


// C ref: dat/Bar-loca.lua
//	The "locate" level for the quest.
function Bar_loca_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'hardfloor');

    des.map(MAP_Bar_loca);
    // -- Dungeon Description
    des.region(selection.area(0, 0, 75, 19), 'lit');
    des.region(selection.area(24, 3, 26, 4), 'unlit');
    des.region(selection.area(31, 8, 33, 9), 'unlit');
    des.region(selection.area(35, 14, 37, 15), 'unlit');
    des.region(selection.area(39, 3, 54, 8), 'lit');
    des.region(selection.area(56, 0, 75, 8), 'unlit');
    des.region(selection.area(64, 9, 75, 16), 'unlit');
    // -- Doors
    des.door('open', 23, 3);
    des.door('open', 30, 8);
    des.door('open', 34, 14);
    des.door('locked', 38, 5);
    des.door('locked', 38, 6);
    des.door('closed', 43, 3);
    des.door('closed', 43, 5);
    des.door('closed', 43, 6);
    des.door('closed', 43, 8);
    des.door('locked', 55, 6);
    // -- Stairs
    des.stair('up', 5, 2);
    des.stair('down', 70, 13);
    // -- Objects
    des.object({ x: 42, y: 3 });
    des.object({ x: 42, y: 3 });
    des.object({ x: 42, y: 3 });
    des.object({ x: 41, y: 3 });
    des.object({ x: 41, y: 3 });
    des.object({ x: 41, y: 3 });
    des.object({ x: 41, y: 3 });
    des.object({ x: 41, y: 8 });
    des.object({ x: 41, y: 8 });
    des.object({ x: 42, y: 8 });
    des.object({ x: 42, y: 8 });
    des.object({ x: 42, y: 8 });
    des.object({ x: 71, y: 13 });
    des.object({ x: 71, y: 13 });
    des.object({ x: 71, y: 13 });
    // -- Random traps
    des.trap('spiked pit', 10, 13);
    des.trap('spiked pit', 21, 7);
    des.trap('spiked pit', 67, 8);
    des.trap('spiked pit', 68, 9);
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    // -- Random monsters.
    des.monster({ id: 'ogre', x: 12, y: 9, peaceful: 0 });
    des.monster({ id: 'ogre', x: 18, y: 11, peaceful: 0 });
    des.monster({ id: 'ogre', x: 45, y: 5, peaceful: 0 });
    des.monster({ id: 'ogre', x: 45, y: 6, peaceful: 0 });
    des.monster({ id: 'ogre', x: 47, y: 5, peaceful: 0 });
    des.monster({ id: 'ogre', x: 46, y: 5, peaceful: 0 });
    des.monster({ id: 'ogre', x: 56, y: 3, peaceful: 0 });
    des.monster({ id: 'ogre', x: 56, y: 4, peaceful: 0 });
    des.monster({ id: 'ogre', x: 56, y: 5, peaceful: 0 });
    des.monster({ id: 'ogre', x: 56, y: 6, peaceful: 0 });
    des.monster({ id: 'ogre', x: 57, y: 3, peaceful: 0 });
    des.monster({ id: 'ogre', x: 57, y: 4, peaceful: 0 });
    des.monster({ id: 'ogre', x: 57, y: 5, peaceful: 0 });
    des.monster({ id: 'ogre', x: 57, y: 6, peaceful: 0 });
    des.monster({ id: 'ogre', peaceful: 0 });
    des.monster({ id: 'ogre', peaceful: 0 });
    des.monster({ id: 'ogre', peaceful: 0 });
    des.monster({ class: 'O', peaceful: 0 });
    des.monster({ class: 'T', peaceful: 0 });
    des.monster({ id: 'rock troll', x: 46, y: 6, peaceful: 0 });
    des.monster({ id: 'rock troll', x: 47, y: 6, peaceful: 0 });
    des.monster({ id: 'rock troll', x: 56, y: 7, peaceful: 0 });
    des.monster({ id: 'rock troll', x: 57, y: 7, peaceful: 0 });
    des.monster({ id: 'rock troll', x: 70, y: 13, peaceful: 0 });
    des.monster({ id: 'rock troll', peaceful: 0 });
    des.monster({ id: 'rock troll', peaceful: 0 });
    des.monster({ class: 'T', peaceful: 0 });
}

// C ref: dat/Bar-fila.lua
//	The "fill" level for the quest.
function Bar_fila_lua(L) {
    const G = L.globals, des = G.des;

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'noflip');

    des.level_init({ style: 'mines', fg: '.', bg: '.', smoothed: true, joined: true, lit: 0, walled: false });

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
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    //
    des.monster({ id: 'ogre', peaceful: 0 });
    des.monster({ id: 'ogre', peaceful: 0 });
    des.monster({ class: 'O', peaceful: 0 });
    des.monster({ id: 'rock troll', peaceful: 0 });
}

// C ref: dat/Bar-filb.lua
//	The "fill" level for the quest.
function Bar_filb_lua(L) {
    const G = L.globals, des = G.des;

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'noflip');

    des.level_init({ style: 'mines', fg: '.', bg: ' ', smoothed: true, joined: true, lit: 0, walled: true });

    //
    des.stair('up');
    des.stair('down');
    //
    for (let i = 0; i < 11; i++) /* eleven des.object() lines */
        des.object();
    //
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    //
    for (let i = 0; i < 7; i++) /* seven ogre lines */
        des.monster({ id: 'ogre', peaceful: 0 });
    des.monster({ class: 'O', peaceful: 0 });
    des.monster({ id: 'rock troll', peaceful: 0 });
    des.monster({ id: 'rock troll', peaceful: 0 });
    des.monster({ id: 'rock troll', peaceful: 0 });
    des.monster({ class: 'T', peaceful: 0 });
}

const MAP_Bar_goal = [
    '                                                                            ',
    '                               .............                                ',
    '                             ..................                             ',
    '        ....              .........................          ....           ',
    '      .......          ..........................           .......         ',
    '      ......             ........................          .......          ',
    '      ..  ......................................             ..             ',
    '       ..                 .....................             ..              ',
    '        ..                 ..................              ..               ',
    '         ..         ..S...S..............   ................                ',
    '          ..                   ........                ...                  ',
    '       .........                                         ..                 ',
    '       ......  ..                                         ...  ....         ',
    '      .. ...    ..                             ......       ........        ',
    '   ....          .. ..................        ........       ......         ',
    '  ......          ......................       ......         ..            ',
    '   ....             ..................              ...........             ',
    '                      ..............                                        ',
    '                        ...........                                         ',
    '                                                                            ',
].join('\n') + '\n';

// C ref: dat/Bar-goal.lua
//	The "goal" level for the quest.
function Bar_goal_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel');

    des.map(MAP_Bar_goal);
    // -- Dungeon Description
    des.region(selection.area(0, 0, 75, 19), 'unlit');
    // -- Secret doors
    des.door('locked', 22, 9);
    des.door('locked', 26, 9);
    // -- Stairs
    des.stair('up', 36, 5);
    // -- The altar.  Unattended.
    des.altar({ x: 63, y: 4, align: 'noncoaligned', type: 'altar' });
    des.non_diggable(selection.area(0, 0, 75, 19));
    // -- Objects
    des.object({ id: 'luckstone', x: 63, y: 4, buc: 'blessed', spe: 0, name: 'The Heart of Ahriman' });
    for (let i = 0; i < 14; i++) /* fourteen des.object() lines */
        des.object();
    // -- Random traps
    for (let i = 0; i < 6; i++) /* six des.trap() lines */
        des.trap();
    // -- Random monsters.
    des.monster({ id: 'Thoth Amon', x: 63, y: 4, peaceful: 0 });
    for (let i = 0; i < 16; i++) /* sixteen ogre lines */
        des.monster({ id: 'ogre', peaceful: 0 });
    des.monster({ class: 'O', peaceful: 0 });
    des.monster({ class: 'O', peaceful: 0 });
    for (let i = 0; i < 8; i++) /* eight rock troll lines */
        des.monster({ id: 'rock troll', peaceful: 0 });
    des.monster({ class: 'T', peaceful: 0 });
    des.wallify();
}

// The hand-ported quest level scripts by file name, for nhl_loadlua().
export const quest_level_lua_files = {
    'Bar-strt.lua': Bar_strt_lua,
    'Bar-loca.lua': Bar_loca_lua,
    'Bar-fila.lua': Bar_fila_lua,
    'Bar-filb.lua': Bar_filb_lua,
    'Bar-goal.lua': Bar_goal_lua,
    'Pri-strt.lua': Pri_strt_lua,
    ...questlev_arc_lua_files,
    ...questlev_cav_lua_files,
    ...questlev_hea_lua_files,
    ...questlev_kni_lua_files,
    ...questlev_mon_lua_files,
    ...questlev_pri_lua_files,
    ...questlev_ran_lua_files,
    ...questlev_rog_lua_files,
    ...questlev_sam_lua_files,
    ...questlev_tou_lua_files,
    ...questlev_val_lua_files,
    ...questlev_wiz_lua_files,
};
