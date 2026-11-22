// questlev_cav_lua.js — port of the Caveman quest level scripts:
// dat/Cav-strt.lua (home level), dat/Cav-loca.lua (locate level),
// dat/Cav-fila.lua and dat/Cav-filb.lua (filler levels) and dat/Cav-goal.lua
// (goal level).
// makemaz() loads them through load_special() (sp_lev.c).
// C ref: dat/Cav-strt.lua, dat/Cav-loca.lua, dat/Cav-fila.lua, dat/Cav-filb.lua, dat/Cav-goal.lua
//
// Translated from the .lua files by a script (the des.map() maps are
// verbatim), then reviewed. Lua arrays are 1-based: t[i] is t[i - 1] here.
// Lua-side rolls (math.random, nh.rn2; percent, shuffle and d roll inside
// nhlib_lua.js) go through withRngCaller() with the tag the C recorder
// writes; the selection operators |, &, + and - are lua_bor(), lua_band(),
// lua_add() and lua_sub() (nhlua.js).


const MAP_Cav_strt = [
    '                                                                            ',
    '  ......     ..........................       ...        ....  ......       ',
    ' ......       ..........................     ........       ....    .....   ',
    '  ..BB      .............................    .........            ....  ..  ',
    '     ..    ......................              .......      ..     ....  .. ',
    '     ..     ....................                     ..  .......    ..  ... ',
    '   ..              S   BB                .....     .......   ....      .... ',
    '    ..        ...  .   ..               ........  ..     ..   ..       ...  ',
    '     ..      ......     ..             ............       ..          ...   ',
    '       .      ....       ..             ........           ..  ...........  ',
    '  ...   ..     ..        .............                  ................... ',
    ' .....   .....            ...............................      ...........  ',
    '  .....B................            ...                               ...   ',
    '  .....     .  ..........        .... .      ...  ..........           ...  ',
    '   ...     ..          .............  ..    ...................        .... ',
    '          BB       ..   .........      BB    ...  ..........  ..   ...  ... ',
    '       ......    .....  B          ........         ..         .. ....  ... ',
    '     ..........  ..........         ..... ...      .....        ........    ',
    '       ..  ...    .  .....         ....    ..       ...            ..       ',
    '                                                                            ',
].join('\n') + '\n';

// C ref: dat/Cav-strt.lua
//	The "start" level for the quest.
//
//	Here you meet your (besieged) class leader, Shaman Karnov
//	and receive your quest assignment.
//
function Cav_strt_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'noteleport', 'hardfloor');

    des.map(MAP_Cav_strt);
    // Dungeon Description
    des.region(selection.area(0, 0, 75, 19), 'unlit');
    des.region({ region: [13, 1, 40, 5], lit: 1, type: 'temple', filled: 1, irregular: 1 });
    // The occupied rooms.
    des.region({ region: [2, 1, 8, 3], lit: 1, type: 'ordinary', irregular: 1 });
    des.region({ region: [1, 11, 6, 14], lit: 1, type: 'ordinary', irregular: 1 });
    des.region({ region: [13, 8, 18, 10], lit: 1, type: 'ordinary', irregular: 1 });
    des.region({ region: [5, 17, 14, 18], lit: 1, type: 'ordinary', irregular: 1 });
    des.region({ region: [17, 16, 23, 18], lit: 1, type: 'ordinary', irregular: 1 });
    des.region({ region: [35, 16, 44, 18], lit: 1, type: 'ordinary', irregular: 1 });
    // Stairs
    des.stair('down', 2, 3);
    // Portal arrival point
    des.levregion({ region: [71, 9, 71, 9], type: 'branch' });
    // Doors
    des.door('locked', 19, 6);
    // The temple altar (this will force a priest(ess) to be created)
    des.altar({ x: 36, y: 2, align: 'coaligned', type: 'shrine' });
    // Shaman Karnov
    des.monster({ id: 'Shaman Karnov', coord: [35, 2], inventory: function() {
            des.object({ id: 'leather armor', spe: 5 });
            des.object({ id: 'club', spe: 5 });
        } });
    // The treasure of Shaman Karnov
    des.object('chest', 34, 2);
    // neanderthal guards for the audience chamber
    des.monster('neanderthal', 20, 3);
    des.monster('neanderthal', 20, 2);
    des.monster('neanderthal', 20, 1);
    des.monster('neanderthal', 21, 3);
    des.monster('neanderthal', 21, 2);
    des.monster('neanderthal', 21, 1);
    des.monster('neanderthal', 22, 1);
    des.monster('neanderthal', 26, 9);
    // Non diggable walls
    des.non_diggable(selection.area(0, 0, 75, 19));
    // Random traps
    des.trap('pit', 47, 11);
    des.trap('pit', 57, 10);
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    // Monsters on siege duty (in the outer caves).
    des.monster({ id: 'bugbear', x: 47, y: 2, peaceful: 0 });
    des.monster({ id: 'bugbear', x: 48, y: 3, peaceful: 0 });
    des.monster({ id: 'bugbear', x: 49, y: 4, peaceful: 0 });
    des.monster({ id: 'bugbear', x: 67, y: 3, peaceful: 0 });
    des.monster({ id: 'bugbear', x: 69, y: 4, peaceful: 0 });
    des.monster({ id: 'bugbear', x: 51, y: 13, peaceful: 0 });
    des.monster({ id: 'bugbear', x: 53, y: 14, peaceful: 0 });
    des.monster({ id: 'bugbear', x: 55, y: 15, peaceful: 0 });
    des.monster({ id: 'bugbear', x: 63, y: 10, peaceful: 0 });
    des.monster({ id: 'bugbear', x: 65, y: 9, peaceful: 0 });
    des.monster({ id: 'bugbear', x: 67, y: 10, peaceful: 0 });
    des.monster({ id: 'bugbear', x: 69, y: 11, peaceful: 0 });
    des.wallify();
}

const MAP_Cav_loca = [
    '                                                                            ',
    '    .............                     ...........                           ',
    '   ...............                   .............                          ',
    '    .............                  ...............        ..........        ',
    '     ...........                    .............      ...............      ',
    '        ...                                    ...   ..................     ',
    '         ...                ..........          ... ..................      ',
    '          ...              ............          BBB...................     ',
    '           ...              ..........          ......................      ',
    '            .....                 ..      .....B........................    ',
    '  ....       ...............      .    ........B..........................  ',
    ' ......     .. .............S..............         ..................      ',
    '  ....     ..                ...........             ...............        ',
    '     ..  ...                                    ....................        ',
    '      ....                                      BB...................       ',
    '         ..                 ..                 ..  ...............          ',
    '          ..   .......     ....  .....  ....  ..     .......   S            ',
    '           ............     ....... ..  .......       .....    ...  ....    ',
    '               .......       .....   ......                      .......    ',
    '                                                                            ',
].join('\n') + '\n';

// C ref: dat/Cav-loca.lua
function Cav_loca_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'hardfloor');

    des.map(MAP_Cav_loca);
    // Dungeon Description
    des.region(selection.area(0, 0, 75, 19), 'unlit');
    des.region({ region: [52, 6, 73, 15], lit: 1, type: 'ordinary', irregular: 1 });
    // Doors
    des.door('locked', 28, 11);
    // Stairs
    des.stair('up', 4, 3);
    des.stair('down', 73, 10);
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
    // Random traps
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    // Random monsters.
    des.monster({ id: 'bugbear', x: 2, y: 10, peaceful: 0 });
    des.monster({ id: 'bugbear', x: 3, y: 11, peaceful: 0 });
    des.monster({ id: 'bugbear', x: 4, y: 12, peaceful: 0 });
    des.monster({ id: 'bugbear', x: 2, y: 11, peaceful: 0 });
    des.monster({ id: 'bugbear', x: 16, y: 16, peaceful: 0 });
    des.monster({ id: 'bugbear', x: 17, y: 17, peaceful: 0 });
    des.monster({ id: 'bugbear', x: 18, y: 18, peaceful: 0 });
    des.monster({ id: 'bugbear', x: 19, y: 16, peaceful: 0 });
    des.monster({ id: 'bugbear', x: 30, y: 6, peaceful: 0 });
    des.monster({ id: 'bugbear', x: 31, y: 7, peaceful: 0 });
    des.monster({ id: 'bugbear', x: 32, y: 8, peaceful: 0 });
    des.monster({ id: 'bugbear', x: 33, y: 6, peaceful: 0 });
    des.monster({ id: 'bugbear', x: 34, y: 7, peaceful: 0 });
    des.monster({ id: 'bugbear', peaceful: 0 });
    des.monster({ id: 'bugbear', peaceful: 0 });
    des.monster({ id: 'bugbear', peaceful: 0 });
    des.monster({ id: 'bugbear', peaceful: 0 });
    des.monster({ class: 'h', peaceful: 0 });
    des.monster({ class: 'H', peaceful: 0 });
    des.monster({ id: 'hill giant', x: 3, y: 12, peaceful: 0 });
    des.monster({ id: 'hill giant', x: 20, y: 17, peaceful: 0 });
    des.monster({ id: 'hill giant', x: 35, y: 8, peaceful: 0 });
    des.monster({ id: 'hill giant', peaceful: 0 });
    des.monster({ id: 'hill giant', peaceful: 0 });
    des.monster({ id: 'hill giant', peaceful: 0 });
    des.monster({ id: 'hill giant', peaceful: 0 });
    des.monster({ class: 'H', peaceful: 0 });
    des.wallify();

    //
    //	The "goal" level for the quest.
    //
    //	Here you meet Tiamat your nemesis monster.  You have to
    //	defeat Tiamat in combat to gain the artifact you have
    //	been assigned to retrieve.
    //
}

// C ref: dat/Cav-fila.lua
function Cav_fila_lua(L) {
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
    des.monster({ id: 'bugbear', peaceful: 0 });
    des.monster({ id: 'bugbear', peaceful: 0 });
    des.monster({ id: 'bugbear', peaceful: 0 });
    des.monster({ id: 'bugbear', peaceful: 0 });
    des.monster({ id: 'bugbear', peaceful: 0 });
    des.monster({ class: 'h', peaceful: 0 });
    des.monster({ id: 'hill giant', peaceful: 0 });
}

// C ref: dat/Cav-filb.lua
function Cav_filb_lua(L) {
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
    des.object();
    //
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    //
    des.monster({ id: 'bugbear', peaceful: 0 });
    des.monster({ id: 'bugbear', peaceful: 0 });
    des.monster({ id: 'bugbear', peaceful: 0 });
    des.monster({ id: 'bugbear', peaceful: 0 });
    des.monster({ class: 'h', peaceful: 0 });
    des.monster({ class: 'h', peaceful: 0 });
    des.monster({ id: 'hill giant', peaceful: 0 });
    des.monster({ id: 'hill giant', peaceful: 0 });
}

const MAP_Cav_goal = [
    '                                                                            ',
    '                          .....................                             ',
    '                         .......................                            ',
    '                        .........................                           ',
    '                       ...........................                          ',
    '                      .............................                         ',
    '                     ...............................                        ',
    '                    .................................                       ',
    '                   ...................................                      ',
    '                  .....................................                     ',
    '                 .......................................                    ',
    '                  .....................................                     ',
    '                   ...................................                      ',
    '                    .................................                       ',
    '                     ...............................                        ',
    '                      .............................                         ',
    '                       ...........................                          ',
    '                        .........................                           ',
    '                         .......................                            ',
    '                                                                            ',
].join('\n') + '\n';

// C ref: dat/Cav-goal.lua
function Cav_goal_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel');

    des.map(MAP_Cav_goal);
    // Dungeon Description
    des.region(selection.area(0, 0, 75, 19), 'lit');
    // Stairs
    des.stair('up');
    // Non diggable walls
    des.non_diggable(selection.area(0, 0, 75, 19));
    // Objects
    des.object({ id: 'mace', x: 23, y: 10, buc: 'blessed', spe: 0, name: 'The Sceptre of Might' });
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
    // monsters.
    des.monster({ id: 'Chromatic Dragon', x: 23, y: 10, asleep: 1 });
    des.monster('shrieker', 26, 13);
    des.monster('shrieker', 25, 8);
    des.monster('shrieker', 45, 11);
    des.wallify();
}

// The ported level scripts by file name, for nhl_loadlua().
export const questlev_cav_lua_files = {
    'Cav-strt.lua': Cav_strt_lua,
    'Cav-loca.lua': Cav_loca_lua,
    'Cav-fila.lua': Cav_fila_lua,
    'Cav-filb.lua': Cav_filb_lua,
    'Cav-goal.lua': Cav_goal_lua,
};
