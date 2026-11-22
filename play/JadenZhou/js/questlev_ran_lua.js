// questlev_ran_lua.js — port of the Ranger quest level scripts:
// dat/Ran-strt.lua (home level), dat/Ran-loca.lua (locate level),
// dat/Ran-fila.lua and dat/Ran-filb.lua (filler levels) and dat/Ran-goal.lua
// (goal level).
// makemaz() loads them through load_special() (sp_lev.c).
// C ref: dat/Ran-strt.lua, dat/Ran-loca.lua, dat/Ran-fila.lua, dat/Ran-filb.lua, dat/Ran-goal.lua
//
// Translated from the .lua files by a script (the des.map() maps are
// verbatim), then reviewed. Lua arrays are 1-based: t[i] is t[i - 1] here.
// Lua-side rolls (math.random, nh.rn2; percent, shuffle and d roll inside
// nhlib_lua.js) go through withRngCaller() with the tag the C recorder
// writes; the selection operators |, &, + and - are lua_bor(), lua_band(),
// lua_add() and lua_sub() (nhlua.js).


const MAP_Ran_strt = [
    '                                       xx',
    '   ...................................  x',
    '  ..                                 ..  ',
    ' ..  ...............F...............  .. ',
    ' .  ..             .F.             ..  . ',
    ' . ..  .............F.............  .. . ',
    ' . .  ..                         ..  . . ',
    ' . . ..  .......................  .. ... ',
    ' . . .  ..                     ..  .     ',
    ' ... . ..  .|..................... ......',
    ' FFF . .  ..S..................          ',
    ' ... . ..  .|.................  .... ... ',
    ' . . .  ..                     ..  . . . ',
    ' . . ..  .......................  .. . . ',
    ' . .  ..                         ..  . . ',
    ' . ..  .............F.............  .. . ',
    ' .  ..             .F.             ..  . ',
    ' ..  ...............F...............  .. ',
    '  ..                                 ..  ',
    '   ...................................  x',
    '                                       xx',
].join('\n') + '\n';

// C ref: dat/Ran-strt.lua
//	The "start" level for the quest.
//
//	Here you meet your (besieged) class leader, Orion,
//	and receive your quest assignment.
//
function Ran_strt_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;

    des.level_init({ style: 'solidfill', fg: '.' });

    des.level_flags('mazelevel', 'noteleport', 'hardfloor', 'arboreal');

    des.level_init({ style: 'mines', fg: '.', bg: '.', smoothed: true, joined: true, lit: 1, walled: false });
    des.replace_terrain({ region: [0, 0, 76, 19], fromterrain: '.', toterrain: 'T', chance: 5 });
    // 1234567890123456789012345678901234567890123456789012345678901234567890
    des.map({ halign: 'left', valign: 'center', map: MAP_Ran_strt });
    // Dungeon Description
    des.region(selection.area(0, 0, 40, 20), 'lit');
    // Stairs
    des.stair('down', 10, 10);
    // Portal arrival point; just about anywhere on the right hand side of the map
    des.levregion({ region: [51, 2, 77, 18], region_islev: 1, type: 'branch' });
    // Orion
    des.monster({ id: 'Orion', coord: [20, 10], inventory: function() {
            des.object({ id: 'leather armor', spe: 4 });
            des.object({ id: 'yumi', spe: 4 });
            des.object({ id: 'ya', spe: 4, quantity: 50 });
        } });
    // The treasure of Orion
    des.object('chest', 20, 10);
    // Guards for the audience chamber
    des.monster('hunter', 19, 9);
    des.monster('hunter', 20, 9);
    des.monster('hunter', 21, 9);
    des.monster('hunter', 19, 10);
    des.monster('hunter', 21, 10);
    des.monster('hunter', 19, 11);
    des.monster('hunter', 20, 11);
    des.monster('hunter', 21, 11);
    // Non diggable walls
    des.non_diggable(selection.area(0, 0, 40, 20));
    // Traps
    des.trap('arrow', 30, 9);
    des.trap('arrow', 30, 10);
    des.trap('pit', 40, 9);
    des.trap('spiked pit');
    des.trap('bear');
    des.trap('bear');
    // Monsters on siege duty.
    des.monster({ id: 'minotaur', x: 33, y: 9, peaceful: 0, asleep: 1 });
    des.monster({ id: 'forest centaur', x: 19, y: 3, peaceful: 0 });
    des.monster({ id: 'forest centaur', x: 19, y: 4, peaceful: 0 });
    des.monster({ id: 'forest centaur', x: 19, y: 5, peaceful: 0 });
    des.monster({ id: 'forest centaur', x: 21, y: 3, peaceful: 0 });
    des.monster({ id: 'forest centaur', x: 21, y: 4, peaceful: 0 });
    des.monster({ id: 'forest centaur', x: 21, y: 5, peaceful: 0 });
    des.monster({ id: 'forest centaur', x: 1, y: 9, peaceful: 0 });
    des.monster({ id: 'forest centaur', x: 2, y: 9, peaceful: 0 });
    des.monster({ id: 'forest centaur', x: 3, y: 9, peaceful: 0 });
    des.monster({ id: 'forest centaur', x: 1, y: 11, peaceful: 0 });
    des.monster({ id: 'forest centaur', x: 2, y: 11, peaceful: 0 });
    des.monster({ id: 'forest centaur', x: 3, y: 11, peaceful: 0 });
    des.monster({ id: 'forest centaur', x: 19, y: 15, peaceful: 0 });
    des.monster({ id: 'forest centaur', x: 19, y: 16, peaceful: 0 });
    des.monster({ id: 'forest centaur', x: 19, y: 17, peaceful: 0 });
    des.monster({ id: 'forest centaur', x: 21, y: 15, peaceful: 0 });
    des.monster({ id: 'forest centaur', x: 21, y: 16, peaceful: 0 });
    des.monster({ id: 'forest centaur', x: 21, y: 17, peaceful: 0 });
    des.monster({ id: 'plains centaur', peaceful: 0 });
    des.monster({ id: 'plains centaur', peaceful: 0 });
    des.monster({ id: 'plains centaur', peaceful: 0 });
    des.monster({ id: 'plains centaur', peaceful: 0 });
    des.monster({ id: 'plains centaur', peaceful: 0 });
    des.monster({ id: 'plains centaur', peaceful: 0 });
    des.monster({ id: 'scorpion', peaceful: 0 });
    des.monster({ id: 'scorpion', peaceful: 0 });
}

const MAP_Ran_loca = [
    '              .......  .........  .......              ',
    '     ...................       ...................     ',
    '  ....        .......             .......        ....  ',
    '...    .....     .       .....       .     .....    ...',
    '.   .......... .....  ...........  ..... ..........   .',
    '.  ..  ..... ..........  .....  .......... .....  ..  .',
    '.  .     .     .....       .       .....     .     .  .',
    '.  .   .....         .............         .....   .  .',
    '.  .  ................  .......  ................  .  .',
    '.  .   .....            .......            .....   .  .',
    '.  .     .    ......               ......    .     .  .',
    '.  .     ...........   .........   ...........     .  .',
    '.  .          ..........       ..........          .  .',
    '.  ..  .....     .       .....       .     .....  ..  .',
    '.   .......... .....  ...........  ..... ..........   .',
    '.      ..... ..........  .....  .......... .....      .',
    '.        .     .....       .       .....     .        .',
    '...   .......           .......           .......   ...',
    '  ..............     .............     ..............  ',
    '      .......  .......  .......  .......  .......      ',
].join('\n') + '\n';

// C ref: dat/Ran-loca.lua
function Ran_loca_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'hardfloor');
    // 1234567890123456789012345678901234567890123456789012345678901234567890
    des.map(MAP_Ran_loca);
    // Dungeon Description
    des.region(selection.area(0, 0, 54, 19), 'lit');
    // Stairs
    des.stair('up', 25, 5);
    des.stair('down', 27, 18);
    // Non diggable walls
    des.non_diggable(selection.area(0, 0, 54, 19));
    // Objects
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    // Random traps
    des.trap('spiked pit');
    des.trap('spiked pit');
    des.trap('teleport');
    des.trap('teleport');
    des.trap('arrow');
    des.trap('arrow');
    // Random monsters.
    des.monster({ id: 'wumpus', x: 27, y: 18, peaceful: 0, asleep: 1 });
    des.monster({ id: 'giant bat', peaceful: 0 });
    des.monster({ id: 'giant bat', peaceful: 0 });
    des.monster({ id: 'giant bat', peaceful: 0 });
    des.monster({ id: 'giant bat', peaceful: 0 });
    des.monster({ id: 'forest centaur', peaceful: 0 });
    des.monster({ id: 'forest centaur', peaceful: 0 });
    des.monster({ id: 'forest centaur', peaceful: 0 });
    des.monster({ id: 'forest centaur', peaceful: 0 });
    des.monster({ id: 'mountain centaur', peaceful: 0 });
    des.monster({ id: 'mountain centaur', peaceful: 0 });
    des.monster({ id: 'mountain centaur', peaceful: 0 });
    des.monster({ id: 'mountain centaur', peaceful: 0 });
    des.monster({ id: 'mountain centaur', peaceful: 0 });
    des.monster({ id: 'mountain centaur', peaceful: 0 });
    des.monster({ id: 'mountain centaur', peaceful: 0 });
    des.monster({ id: 'mountain centaur', peaceful: 0 });
    des.monster({ id: 'scorpion', peaceful: 0 });
    des.monster({ id: 'scorpion', peaceful: 0 });
    des.monster({ id: 'scorpion', peaceful: 0 });
    des.monster({ id: 'scorpion', peaceful: 0 });
    des.monster({ class: 's', peaceful: 0 });
    des.monster({ class: 's', peaceful: 0 });
}

// C ref: dat/Ran-fila.lua
function Ran_fila_lua(L) {
    const G = L.globals, des = G.des;

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'noflip');

    des.level_init({ style: 'mines', fg: '.', bg: 'T', smoothed: true, joined: true, walled: true });

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
    des.monster({ id: 'mountain centaur', peaceful: 0 });
    des.monster({ id: 'mountain centaur', peaceful: 0 });
    des.monster({ id: 'forest centaur', peaceful: 0 });
    des.monster({ id: 'forest centaur', peaceful: 0 });
    des.monster({ id: 'forest centaur', peaceful: 0 });
    des.monster({ class: 'C', peaceful: 0 });
    des.monster({ id: 'scorpion', peaceful: 0 });
}

// C ref: dat/Ran-filb.lua
function Ran_filb_lua(L) {
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
    des.monster({ id: 'mountain centaur', peaceful: 0 });
    des.monster({ id: 'mountain centaur', peaceful: 0 });
    des.monster({ id: 'mountain centaur', peaceful: 0 });
    des.monster({ id: 'mountain centaur', peaceful: 0 });
    des.monster({ class: 'C', peaceful: 0 });
    des.monster({ id: 'scorpion', peaceful: 0 });
    des.monster({ id: 'scorpion', peaceful: 0 });
}

const MAP_Ran_goal = [
    '                                                                            ',
    '  ...                                                                  ...  ',
    ' .......................................................................... ',
    '  ...                                +                                 ...  ',
    '   .     ............     .......    .                   .......        .   ',
    '   .  .............................  .       ........   .........S..    .   ',
    '   .   ............    .  ......     .       .      .    .......   ..   .   ',
    '   .     .........     .   ....      +       . ...  .               ..  .   ',
    '   .        S          .         .........   .S.    .S...............   .   ',
    '   .  ...   .     ...  .         .........          .                   .   ',
    '   . ........    .....S.+.......+....\\....+........+.                   .   ',
    '   .  ...         ...    S       .........           ..      .....      .   ',
    '   .                    ..       .........            ..      ......    .   ',
    '   .      .......     ...            +       ....    ....    .......... .   ',
    '   . ..............  ..              .      ......  ..  .............   .   ',
    '   .     .............               .     ..........          ......   .   ',
    '  ...                                +                                 ...  ',
    ' .......................................................................... ',
    '  ...                                                                  ...  ',
    '                                                                            ',
].join('\n') + '\n';

// C ref: dat/Ran-goal.lua
function Ran_goal_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel');

    des.map(MAP_Ran_goal);
    // Dungeon Description
    des.region(selection.area(0, 0, 75, 19), 'lit');
    // Stairs
    des.stair('up', 19, 10);
    // Non diggable walls
    des.non_diggable(selection.area(0, 0, 75, 19));
    // Objects
    des.object({ id: 'bow', x: 37, y: 10, buc: 'blessed', spe: 0, name: 'The Longbow of Diana' });
    des.object('chest', 37, 10);
    des.object({ coord: [36, 9] });
    des.object({ coord: [36, 10] });
    des.object({ coord: [36, 11] });
    des.object({ coord: [37, 9] });
    des.object({ coord: [37, 11] });
    des.object({ coord: [38, 9] });
    des.object({ coord: [38, 10] });
    des.object({ coord: [38, 11] });
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
    // doors
    des.door('locked', 12, 8);
    des.door('closed', 22, 10);
    des.door('locked', 24, 10);
    des.door('closed', 25, 11);
    des.door('closed', 32, 10);
    des.door('closed', 37, 3);
    des.door('closed', 37, 7);
    des.door('closed', 37, 13);
    des.door('closed', 37, 16);
    des.door('closed', 42, 10);
    des.door('locked', 46, 8);
    des.door('closed', 51, 10);
    des.door('locked', 53, 8);
    des.door('closed', 65, 5);
    // Random monsters.
    des.monster({ id: 'Scorpius', x: 37, y: 10, peaceful: 0 });
    des.monster({ id: 'forest centaur', x: 36, y: 9, peaceful: 0 });
    des.monster({ id: 'forest centaur', x: 36, y: 10, peaceful: 0 });
    des.monster({ id: 'forest centaur', x: 36, y: 11, peaceful: 0 });
    des.monster({ id: 'forest centaur', x: 37, y: 9, peaceful: 0 });
    des.monster({ id: 'forest centaur', x: 37, y: 11, peaceful: 0 });
    des.monster({ id: 'forest centaur', x: 38, y: 9, peaceful: 0 });
    des.monster({ id: 'mountain centaur', x: 38, y: 10, peaceful: 0 });
    des.monster({ id: 'mountain centaur', x: 38, y: 11, peaceful: 0 });
    des.monster({ id: 'mountain centaur', x: 2, y: 2, peaceful: 0 });
    des.monster({ id: 'mountain centaur', x: 71, y: 2, peaceful: 0 });
    des.monster({ id: 'mountain centaur', x: 2, y: 16, peaceful: 0 });
    des.monster({ id: 'mountain centaur', x: 71, y: 16, peaceful: 0 });
    des.monster({ id: 'forest centaur', peaceful: 0 });
    des.monster({ id: 'forest centaur', peaceful: 0 });
    des.monster({ id: 'mountain centaur', peaceful: 0 });
    des.monster({ id: 'mountain centaur', peaceful: 0 });
    des.monster({ class: 'C', peaceful: 0 });
    des.monster({ class: 'C', peaceful: 0 });
    des.monster({ id: 'scorpion', x: 3, y: 2, peaceful: 0 });
    des.monster({ id: 'scorpion', x: 72, y: 2, peaceful: 0 });
    des.monster({ id: 'scorpion', x: 3, y: 17, peaceful: 0 });
    des.monster({ id: 'scorpion', x: 72, y: 17, peaceful: 0 });
    des.monster({ id: 'scorpion', x: 41, y: 10, peaceful: 0 });
    des.monster({ id: 'scorpion', x: 33, y: 9, peaceful: 0 });
    des.monster({ id: 'scorpion', peaceful: 0 });
    des.monster({ id: 'scorpion', peaceful: 0 });
    des.monster({ class: 's', peaceful: 0 });

    des.wallify();
}

// The ported level scripts by file name, for nhl_loadlua().
export const questlev_ran_lua_files = {
    'Ran-strt.lua': Ran_strt_lua,
    'Ran-loca.lua': Ran_loca_lua,
    'Ran-fila.lua': Ran_fila_lua,
    'Ran-filb.lua': Ran_filb_lua,
    'Ran-goal.lua': Ran_goal_lua,
};
