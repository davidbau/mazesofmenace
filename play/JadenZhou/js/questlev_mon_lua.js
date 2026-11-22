// questlev_mon_lua.js — port of the Monk quest level scripts:
// dat/Mon-strt.lua (home level), dat/Mon-loca.lua (locate level),
// dat/Mon-fila.lua and dat/Mon-filb.lua (filler levels) and dat/Mon-goal.lua
// (goal level).
// makemaz() loads them through load_special() (sp_lev.c).
// C ref: dat/Mon-strt.lua, dat/Mon-loca.lua, dat/Mon-fila.lua, dat/Mon-filb.lua, dat/Mon-goal.lua
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

const MAP_Mon_strt = [
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

// C ref: dat/Mon-strt.lua
//	The "start" level for the quest.
//
//	Here you meet your (besieged) class leader, the Grand Master
//	and receive your quest assignment.
//
function Mon_strt_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'noteleport', 'hardfloor');

    des.map(MAP_Mon_strt);
    // Dungeon Description
    des.region(selection.area(0, 0, 75, 19), 'lit');
    des.region({ region: [24, 6, 33, 13], lit: 1, type: 'temple' });

    des.replace_terrain({ region: [0, 0, 10, 19], fromterrain: '.', toterrain: 'T', chance: 10 });
    des.replace_terrain({ region: [65, 0, 75, 19], fromterrain: '.', toterrain: 'T', chance: 10 });

    const spacelocs = selection.floodfill(5, 4);

    // Portal arrival point
    des.terrain([5, 4], '.');
    des.levregion({ region: [5, 4, 5, 4], type: 'branch' });
    // Stairs
    des.stair('down', 52, 9);
    // Doors
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
    // Unattended Altar - unaligned due to conflict - player must align it.
    des.altar({ x: 28, y: 9, align: 'noalign', type: 'altar' });
    // The Grand Master
    des.monster({ id: 'Grand Master', coord: [28, 10], inventory: function() {
            des.object({ id: 'robe', spe: 6 });
        } });
    // No treasure chest!
    // guards for the audience chamber
    des.monster('abbot', 32, 7);
    des.monster('abbot', 32, 8);
    des.monster('abbot', 32, 11);
    des.monster('abbot', 32, 12);
    des.monster('abbot', 33, 7);
    des.monster('abbot', 33, 8);
    des.monster('abbot', 33, 11);
    des.monster('abbot', 33, 12);
    // Non diggable walls
    des.non_diggable(selection.area(18, 3, 55, 16));
    // Random traps
    for (let i = 1; i <= 2; i++) {
        des.trap('dart', spacelocs.rndcoord(1));
    }
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    // Monsters on siege duty.
    for (let i = 1; i <= 8; i++) {
        des.monster('earth elemental', spacelocs.rndcoord(1));
    }
    for (let i = 1; i <= 4; i++) {
        des.monster('xorn', spacelocs.rndcoord(1));
    }
    // next to leader, so possibly tricky to pick up if not ready for quest yet;
    // there's no protection against a xorn eating these tins; BUC state is random
    des.object({ id: 'tin', coord: [29, 9], quantity: 2, montype: 'spinach' });
    // ensure enough vegetarian food generates for vegetarian games
    des.object({ id: 'food ration', coord: [46, 4], quantity: 4 });
}

const MAP_Mon_loca = [
    '             ----------------------------------------------------   --------',
    '           ---.................................................-    --.....|',
    '         ---...--------........------........................---     ---...|',
    '       ---.....-      --.......-    ----..................----         --.--',
    '     ---.....----      ---------       --..................--         --..| ',
    '   ---...-----                       ----.----.....----.....---      --..|| ',
    '----..----                       -----..---  |...---  |.......---   --...|  ',
    '|...---                       ----....---    |.---    |.........-- --...||  ',
    '|...-                      ----.....---     ----      |..........---....|   ',
    '|...----                ----......---       |         |...|.......-....||   ',
    '|......-----          ---.........-         |     -----...|............|    ',
    '|..........-----   ----...........---       -------......||...........||    ',
    '|..............-----................---     |............|||..........|     ',
    '|-S----...............................---   |...........|| |.........||     ',
    '|.....|..............------.............-----..........||  ||........|      ',
    '|.....|.............--    ---.........................||    |.......||      ',
    '|.....|.............-       ---.....................--|     ||......|       ',
    '|---S--------.......----      --.................----        |.....||       ',
    '|...........|..........--------..............-----           ||....|        ',
    '|...........|............................-----                |....|        ',
    '------------------------------------------                    ------        ',
].join('\n') + '\n';

// C ref: dat/Mon-loca.lua
function Mon_loca_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel');

    //         1         2         3         4         5         6         7
    // 123456789012345678901234567890123456789012345678901234567890123456789012345
    des.map(MAP_Mon_loca);
    // Random Monsters

    // Dungeon Description
    des.region(selection.area(0, 0, 75, 20), 'lit');
    // Stairs
    des.stair('up');
    des.stair('down');
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
    // since vegetarian monks shouldn't eat giant corpses, give a chance for
    // Str boost that isn't throttled by exercise restrictions;
    // make a modest effort (Elbereth only) to prevent xorns from eating the tins
    const tinplace = selection.negate().filter_mapchar('.');
    const tinloc = tinplace.rndcoord(0);
    des.object({ id: 'tin', coord: tinloc, quantity: 2, buc: 'blessed',
        montype: 'spinach' });
    des.engraving({ coord: tinloc, type: 'burn', text: 'Elbereth' });
    // Random traps
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    // Random monsters.
    des.monster('earth elemental');
    des.monster('earth elemental');
    des.monster('earth elemental');
    des.monster('earth elemental');
    des.monster('earth elemental');
    des.monster('earth elemental');
    des.monster('earth elemental');
    des.monster('earth elemental');
    des.monster('earth elemental');
    des.monster('earth elemental');
    des.monster('earth elemental');
    des.monster('earth elemental');
    des.monster('earth elemental');
    des.monster('earth elemental');
    des.monster('xorn');
    des.monster('xorn');
    des.monster('xorn');
    des.monster('xorn');
    des.monster('xorn');
    des.monster('xorn');
    des.monster('xorn');
    des.monster('xorn');
    des.monster('xorn');
}

// C ref: dat/Mon-fila.lua
function Mon_fila_lua(L) {
    const G = L.globals, des = G.des;

    des.room({ type: 'ordinary',
        contents: function() {
            des.stair('up');
            des.object();
            des.monster({ class: 'E', peaceful: 0 });
        } });

    des.room({ type: 'ordinary',
        contents: function() {
            des.object();
            des.object();
            des.monster({ class: 'E', peaceful: 0 });
        } });

    des.room({ type: 'ordinary',
        contents: function() {
            des.object();
            des.trap();
            des.object();
            des.monster('xorn');
            des.monster('earth elemental');
        } });

    des.room({ type: 'ordinary',
        contents: function() {
            des.stair('down');
            des.object();
            des.trap();
            des.monster({ class: 'E', peaceful: 0 });
            des.monster('earth elemental');
        } });

    des.room({ type: 'ordinary',
        contents: function() {
            des.object();
            des.object();
            des.trap();
            des.monster({ class: 'X', peaceful: 0 });
        } });

    des.room({ type: 'ordinary',
        contents: function() {
            des.object();
            des.trap();
            des.monster('earth elemental');
        } });

    des.random_corridors();
}

// C ref: dat/Mon-filb.lua
function Mon_filb_lua(L) {
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
            des.monster({ class: 'X', peaceful: 0 });
        } });

    des.room({ type: 'ordinary',
        contents: function() {
            des.object();
            des.trap();
            des.object();
            des.monster({ class: 'E', peaceful: 0 });
        } });

    des.room({ type: 'ordinary',
        contents: function() {
            des.stair('down');
            des.object();
            des.trap();
            des.monster({ class: 'E', peaceful: 0 });
            des.monster('earth elemental');
        } });

    des.room({ type: 'ordinary',
        contents: function() {
            des.object();
            des.object();
            des.trap();
            des.monster({ class: 'X', peaceful: 0 });
        } });

    des.room({ type: 'ordinary',
        contents: function() {
            des.object();
            des.trap();
            des.monster('earth elemental');
        } });

    des.random_corridors();
}

const MAP_Mon_goal = [
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

// C ref: dat/Mon-goal.lua
// des.level_init({ style = "solidfill", fg = " " });
function Mon_goal_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;
    // math.random called from the main chunk or an anonymous function
    const random = (line, ...args) => chunk_random(G, 'Mon-goal.lua', line, ...args);

    des.level_flags('mazelevel');

    des.level_init({ style: 'mines', fg: 'L', bg: '.', smoothed: false, joined: false, lit: 0, walled: false });

    des.map(MAP_Mon_goal);
    // Dungeon Description
    const place = [[14, 4], [13, 7]];
    const placeidx = random(27, 1, place.length);

    des.region(selection.area(0, 0, 25, 10), 'unlit');
    // Stairs
    des.stair('up', 20, 5);
    // Objects
    des.object({ id: 'lenses', coord: place[placeidx - 1], buc: 'blessed', spe: 0, name: 'The Eyes of the Overworld' });
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
    des.monster('Master Kaen', place[placeidx - 1]);
    des.altar({ coord: place[placeidx - 1], align: 'noalign', type: 'altar' });
    des.monster('earth elemental');
    des.monster('earth elemental');
    des.monster('earth elemental');
    des.monster('earth elemental');
    des.monster('earth elemental');
    des.monster('earth elemental');
    des.monster('earth elemental');
    des.monster('earth elemental');
    des.monster('earth elemental');
    des.monster('xorn');
    des.monster('xorn');
    des.monster('xorn');
    des.monster('xorn');
    des.monster('xorn');
    des.monster('xorn');
    des.monster('xorn');
    des.monster('xorn');
    des.monster('xorn');
}

// The ported level scripts by file name, for nhl_loadlua().
export const questlev_mon_lua_files = {
    'Mon-strt.lua': Mon_strt_lua,
    'Mon-loca.lua': Mon_loca_lua,
    'Mon-fila.lua': Mon_fila_lua,
    'Mon-filb.lua': Mon_filb_lua,
    'Mon-goal.lua': Mon_goal_lua,
};
