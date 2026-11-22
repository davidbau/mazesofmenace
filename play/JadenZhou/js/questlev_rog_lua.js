// questlev_rog_lua.js — port of the Rogue quest level scripts:
// dat/Rog-strt.lua (home level), dat/Rog-loca.lua (locate level),
// dat/Rog-fila.lua and dat/Rog-filb.lua (filler levels) and dat/Rog-goal.lua
// (goal level).
// makemaz() loads them through load_special() (sp_lev.c).
// C ref: dat/Rog-strt.lua, dat/Rog-loca.lua, dat/Rog-fila.lua, dat/Rog-filb.lua, dat/Rog-goal.lua
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

const MAP_Rog_strt = [
    '---------------------------------.------------------------------------------',
    '|.....|.||..........|....|......|.|.........|.......+............---.......|',
    '|.....|..+..........+....---....S.|...-S-----.-----.|............+.+.......|',
    '|.....+.||........---......|....|.|...|.....|.|...|.---.....------.--------|',
    '|-----|.-------|..|........------.-----.....|.--..|...-------..............|',
    '|.....|........------+------..........+.....|..--S---.........------.-----..',
    '|.....|.------...............-----.}}.--------.|....-------.---....|.+...--|',
    '|..-+--.|....|-----.--------.|...|.....+.....|.|....|.....+.+......|.--....|',
    '|..|....|....|....+.|......|.|...-----.|.....|.--...|.....|.|......|..|....|',
    '|..|.-----S----...|.+....-----...|...|.----..|..|.---....--.---S-----.|----|',
    '|..|.|........|...------.|.S.....|...|....-----.+.|......|..|.......|.|....|',
    '|---.-------..|...|....|.|.|.....|...----.|...|.|---.....|.|-.......|.---..|',
    '...........|..S...|....---.----S----..|...|...+.|..-------.---+-....|...--+|',
    '|---------.---------...|......|....S..|.---...|.|..|...........----.---....|',
    '|........|.........|...+.------....|---.---...|.--+-.----.----....|.+...--+|',
    '|........|.---+---.|----.--........|......-----......|..|..|.--+-.|.-S-.|..|',
    '|........|.|.....|........----------.----.......---.--..|-.|....|.-----.|..|',
    '|----....+.|.....----+---............|..|--------.+.|...SS.|....|.......|..|',
    '|...--+-----.....|......|.------------............---...||.------+--+----..|',
    '|..........S.....|......|.|..........S............|.....||...|.....|....|..|',
    '-------------------------.--------------------------------------------------',
].join('\n') + '\n';

// C ref: dat/Rog-strt.lua
//	The "start" level for the quest.
//
//	Here you meet your (besieged) class leader, Master of Thieves
//	and receive your quest assignment.
//
function Rog_strt_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;
    // math.random called from the main chunk or an anonymous function
    const random = (line, ...args) => chunk_random(G, 'Rog-strt.lua', line, ...args);

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'noteleport', 'hardfloor', 'nommap');

    //         1         2         3         4         5         6         7
    // 123456789012345678901234567890123456789012345678901234567890123456789012345
    des.map(MAP_Rog_strt);
    // Dungeon Description
    // REGION:(00,00,75,20),lit,"ordinary"

    const streets = selection.floodfill(0, 12);

    // The down stairs is at one of the 4 "exits".  The others are mimics,
    // mimicking stairwells.
    const place = [[33, 0], [0, 12], [25, 20], [75, 5]];
    G.shuffle(place);

    des.stair({ dir: 'down', coord: place[0] });
    des.monster({ id: 'giant mimic', coord: place[1], appear_as: 'ter:staircase down' });
    des.monster({ id: 'large mimic', coord: place[2], appear_as: 'ter:staircase down' });
    des.monster({ id: 'small mimic', coord: place[3], appear_as: 'ter:staircase down' });
    // Portal arrival point
    des.levregion({ region: [19, 9, 19, 9], type: 'branch' });
    // Doors (secret)
    // DOOR:locked|closed|open,(xx,yy)
    des.door('locked', 32, 2);
    des.door('locked', 63, 9);
    des.door('locked', 27, 10);
    des.door('locked', 31, 12);
    des.door('locked', 35, 13);
    des.door('locked', 69, 15);
    des.door('locked', 56, 17);
    des.door('locked', 57, 17);
    des.door('locked', 11, 19);
    des.door('locked', 37, 19);
    des.door('locked', 39, 2);
    des.door('locked', 49, 5);
    des.door('locked', 10, 9);
    des.door('locked', 14, 12);
    // Doors (regular)
    des.door('closed', 52, 1);
    des.door('closed', 9, 2);
    des.door('closed', 20, 2);
    des.door('closed', 65, 2);
    des.door('closed', 67, 2);
    des.door('closed', 6, 3);
    des.door('closed', 21, 5);
    des.door('closed', 38, 5);
    des.door('closed', 69, 6);
    des.door('closed', 4, 7);
    des.door('closed', 39, 7);
    des.door('closed', 58, 7);
    des.door('closed', 60, 7);
    des.door('closed', 18, 8);
    des.door('closed', 20, 9);
    des.door('closed', 48, 10);
    des.door('closed', 46, 12);
    des.door('closed', 62, 12);
    des.door('closed', 74, 12);
    des.door('closed', 23, 14);
    des.door('closed', 23, 14);
    des.door('closed', 50, 14);
    des.door('closed', 68, 14);
    des.door('closed', 74, 14);
    des.door('closed', 14, 15);
    des.door('closed', 63, 15);
    des.door('closed', 9, 17);
    des.door('closed', 21, 17);
    des.door('closed', 50, 17);
    des.door('closed', 6, 18);
    des.door('closed', 65, 18);
    des.door('closed', 68, 18);
    // Master of Thieves
    des.monster({ id: 'Master of Thieves', coord: [36, 11], inventory: function() {
            des.object({ id: 'leather armor', spe: 5 });
            des.object({ id: 'silver dagger', spe: 4 });
            des.object({ id: 'dagger', spe: 2, quantity: G.d(2, 4), buc: 'not-cursed' });
        } });
    // The treasure of Master of Thieves
    des.object('chest', 36, 11);
    // thug guards, room #1
    des.monster('thug', 28, 10);
    des.monster('thug', 29, 11);
    des.monster('thug', 30, 9);
    des.monster('thug', 31, 7);
    // thug guards, room #2
    des.monster('thug', 31, 13);
    des.monster('thug', 33, 14);
    des.monster('thug', 30, 15);
    // thug guards, room #3
    des.monster('thug', 35, 9);
    des.monster('thug', 36, 13);
    // Non diggable walls
    des.non_diggable(selection.area(0, 0, 75, 20));
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
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    //
    // Monsters to get in the way.
    //
    // West exit
    des.monster({ id: 'leprechaun', x: 1, y: 12, peaceful: 0 });
    des.monster({ id: 'water nymph', x: 2, y: 12, peaceful: 0 });
    // North exit
    des.monster({ id: 'water nymph', x: 33, y: 1, peaceful: 0 });
    des.monster({ id: 'leprechaun', x: 33, y: 2, peaceful: 0 });
    // East exit
    des.monster({ id: 'water nymph', x: 74, y: 5, peaceful: 0 });
    des.monster({ id: 'leprechaun', x: 74, y: 4, peaceful: 0 });
    // South exit
    des.monster({ id: 'leprechaun', x: 25, y: 19, peaceful: 0 });
    des.monster({ id: 'water nymph', x: 25, y: 18, peaceful: 0 });
    // Wandering the streets.
    for (let i = 1, i_last = random(160, 4, 7); i <= i_last; i++) {
        des.monster({ id: 'water nymph', coord: streets.rndcoord(1), peaceful: 0 });
        des.monster({ id: 'leprechaun', coord: streets.rndcoord(1), peaceful: 0 });
    }
    for (let i = 1, i_last = random(164, 7, 10); i <= i_last; i++) {
        des.monster({ id: 'chameleon', coord: streets.rndcoord(1), peaceful: 0 });
    }
}

const MAP_Rog_loca = [
    '             ----------------------------------------------------   --------',
    '           ---.................................................-    --.....|',
    '         ---...--------........-------.......................---     ---...|',
    '       ---.....-      ---......-     ---..................----         --.--',
    '     ---.....----       --------       --..................--         --..| ',
    '   ---...-----                       ----.----.....----.....---      --..|| ',
    '----..----                       -----..---  |...---  |.......---   --...|  ',
    '|...---                       ----....---    |.---    |.........-- --...||  ',
    '|...-                      ----.....---     ----      |..........---....|   ',
    '|...----                ----......---       |         |...|.......-....||   ',
    '|......-----          ---.........-         |     -----...|............|    ',
    '|..........-----   ----...........---       -------......||...........||    ',
    '|..............-----................---     |............|||..........|     ',
    '|------...............................---   |...........|| |.........||     ',
    '|.....|..............------.............-----..........||  ||........|      ',
    '|.....|.............--    ---.........................||    |.......||      ',
    '|.....|.............-       ---.....................--|     ||......|       ',
    '|-S----------.......----      --.................----        |.....||       ',
    '|...........|..........--------..............-----           ||....|        ',
    '|...........|............................-----                |....|        ',
    '------------------------------------------                    ------        ',
].join('\n') + '\n';

// C ref: dat/Rog-loca.lua
function Rog_loca_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel');

    //         1         2         3         4         5         6         7
    // 123456789012345678901234567890123456789012345678901234567890123456789012345
    des.map(MAP_Rog_loca);
    // Dungeon Description
    des.region(selection.area(0, 0, 75, 20), 'lit');
    // Doors
    // DOOR:locked|closed|open,(xx,yy)
    // Stairs
    des.stair('up');
    des.stair('down');
    // Non diggable walls
    des.non_diggable(selection.area(0, 0, 75, 20));
    // Objects
    des.object({ id: 'scroll of teleportation', x: 11, y: 18, buc: 'cursed', spe: 0 });
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
    des.monster({ id: 'leprechaun', peaceful: 0 });
    des.monster({ id: 'leprechaun', peaceful: 0 });
    des.monster({ id: 'leprechaun', peaceful: 0 });
    des.monster({ id: 'leprechaun', peaceful: 0 });
    des.monster({ id: 'leprechaun', peaceful: 0 });
    des.monster({ id: 'leprechaun', peaceful: 0 });
    des.monster({ id: 'leprechaun', peaceful: 0 });
    des.monster({ id: 'leprechaun', peaceful: 0 });
    des.monster({ id: 'leprechaun', peaceful: 0 });
    des.monster({ id: 'leprechaun', peaceful: 0 });
    des.monster({ id: 'leprechaun', peaceful: 0 });
    des.monster({ id: 'leprechaun', peaceful: 0 });
    des.monster({ id: 'leprechaun', peaceful: 0 });
    des.monster({ id: 'leprechaun', peaceful: 0 });
    des.monster({ id: 'leprechaun', peaceful: 0 });
    des.monster({ id: 'leprechaun', peaceful: 0 });
    des.monster({ id: 'leprechaun', peaceful: 0 });
    des.monster({ class: 'l', peaceful: 0 });
    des.monster({ id: 'guardian naga', peaceful: 0 });
    des.monster({ id: 'guardian naga', peaceful: 0 });
    des.monster({ id: 'guardian naga', peaceful: 0 });
    des.monster({ id: 'guardian naga', peaceful: 0 });
    des.monster({ id: 'guardian naga', peaceful: 0 });
    des.monster({ id: 'guardian naga', peaceful: 0 });
    des.monster({ id: 'guardian naga', peaceful: 0 });
    des.monster({ class: 'N', peaceful: 0 });
    des.monster({ class: 'N', peaceful: 0 });
    des.monster({ class: 'N', peaceful: 0 });
    des.monster({ id: 'chameleon', peaceful: 0 });
    des.monster({ id: 'chameleon', peaceful: 0 });
    des.monster({ id: 'chameleon', peaceful: 0 });
    des.monster({ id: 'chameleon', peaceful: 0 });
    des.monster({ id: 'chameleon', peaceful: 0 });
}

// C ref: dat/Rog-fila.lua
function Rog_fila_lua(L) {
    const G = L.globals, des = G.des;

    des.room({ type: 'ordinary',
        contents: function() {
            des.stair('up');
            des.object();
            des.monster({ id: 'leprechaun', peaceful: 0 });
        } });

    des.room({ type: 'ordinary',
        contents: function() {
            des.object();
            des.object();
            des.monster({ id: 'leprechaun', peaceful: 0 });
            des.monster({ id: 'guardian naga', peaceful: 0 });
        } });

    des.room({ type: 'ordinary',
        contents: function() {
            des.object();
            des.trap();
            des.trap();
            des.object();
            des.monster({ id: 'water nymph', peaceful: 0 });
        } });

    des.room({ type: 'ordinary',
        contents: function() {
            des.stair('down');
            des.object();
            des.trap();
            des.trap();
            des.monster({ class: 'l', peaceful: 0 });
            des.monster({ id: 'guardian naga', peaceful: 0 });
        } });

    des.room({ type: 'ordinary',
        contents: function() {
            des.object();
            des.object();
            des.trap();
            des.trap();
            des.monster({ id: 'leprechaun', peaceful: 0 });
        } });

    des.room({ type: 'ordinary',
        contents: function() {
            des.object();
            des.trap();
            des.trap();
            des.monster({ id: 'leprechaun', peaceful: 0 });
            des.monster({ id: 'water nymph', peaceful: 0 });
        } });

    des.random_corridors();
}

// C ref: dat/Rog-filb.lua
function Rog_filb_lua(L) {
    const G = L.globals, des = G.des;

    des.room({ type: 'ordinary',
        contents: function() {
            des.stair('up');
            des.object();
            des.monster({ id: 'leprechaun', peaceful: 0 });
        } });

    des.room({ type: 'ordinary',
        contents: function() {
            des.object();
            des.object();
            des.monster({ id: 'leprechaun', peaceful: 0 });
            des.monster({ id: 'guardian naga', peaceful: 0 });
        } });

    des.room({ type: 'ordinary',
        contents: function() {
            des.object();
            des.trap();
            des.trap();
            des.object();
            des.monster({ id: 'water nymph', peaceful: 0 });
        } });

    des.room({ type: 'ordinary',
        contents: function() {
            des.stair('down');
            des.object();
            des.trap();
            des.trap();
            des.monster({ class: 'l', peaceful: 0 });
            des.monster({ id: 'guardian naga', peaceful: 0 });
        } });

    des.room({ type: 'ordinary',
        contents: function() {
            des.object();
            des.object();
            des.trap();
            des.trap();
            des.monster({ id: 'leprechaun', peaceful: 0 });
        } });

    des.room({ type: 'ordinary',
        contents: function() {
            des.object();
            des.trap();
            des.trap();
            des.monster({ id: 'leprechaun', peaceful: 0 });
            des.monster({ id: 'water nymph', peaceful: 0 });
        } });

    des.random_corridors();
}

const MAP_Rog_goal = [
    '-----      -------.......................................|-----------------|',
    '|...|  -----.....|.......................................|.................|',
    '|...----...|.....|.......................................|....---------....|',
    '|.---......---..--.................................------------.......|....|',
    '|...............|..................................|..|...|...----........-|',
    '|.....-----....--.................................|-..--..-|.....----S----| ',
    '|--S---...|....|.................................|-........-|....|........| ',
    '|.........---------.............................|-....}}....-|...|...|....| ',
    '|....|.....S......|............................|-.....}}.....-|..--.------| ',
    '|-----.....--.....|...........................|-...}}}}}}}}...-|....|.....--',
    '|...........--....------S-----...............|-....}}}}}}}}....-|..........|',
    '|............--........|...| |..............--.....}}.}}........----------S-',
    '|.............|........|...| |..............|......}}}}}}}}......|...|.....|',
    '|S-.---.---.---.---.---|...| ------------...--........}}.}}.....--..---....|',
    '|.---.---.---.---.-S-..----- |....|.....|....|-....}}}}}}}}....---..S.|--..|',
    '|...|.......|..........|...---....---...S.....|-...}}}}}}}}...-|.S..|...|..|',
    '|...|..|....|..........|............|..--..----|-.....}}.....-|..----...-S--',
    '|...|---....----.......|----- ......|...---|    |-....}}....-|...|..--.--..|',
    '-----.....---.....--.---....--...--------..|     |-........-|....|.........|',
    '    |.............|..........|.............S...   |S-------|.....|..-----..|',
    '    ----------------------------------------  ......       ----------   ----',
].join('\n') + '\n';

// C ref: dat/Rog-goal.lua
function Rog_goal_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'noteleport');

    //         1         2         3         4         5         6         7
    // 123456789012345678901234567890123456789012345678901234567890123456789012345
    des.map(MAP_Rog_goal);
    // Dungeon Description
    des.region(selection.area(0, 0, 75, 20), 'lit');
    // Stairs
    des.levregion({ region: [1, 0, 15, 20], region_islev: 1, exclude: [1, 18, 4, 20], type: 'stair-up' });
    // Doors
    // Non diggable walls
    des.non_diggable(selection.area(0, 0, 75, 20));
    // One trap to keep the gnomes at bay.
    des.trap('spiked pit', 37, 7);
    // Objects
    des.object({ id: 'skeleton key', x: 38, y: 10, buc: 'blessed', spe: 0, name: 'The Master Key of Thievery' });
    des.object({ id: 'tin', x: 26, y: 12, montype: 'chameleon' });
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
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    // Random monsters.
    des.monster({ id: 'Master Assassin', x: 38, y: 10, peaceful: 0 });
    des.monster({ id: 'leprechaun', peaceful: 0 });
    des.monster({ id: 'leprechaun', peaceful: 0 });
    des.monster({ id: 'leprechaun', peaceful: 0 });
    des.monster({ id: 'leprechaun', peaceful: 0 });
    des.monster({ id: 'leprechaun', peaceful: 0 });
    des.monster({ id: 'leprechaun', peaceful: 0 });
    des.monster({ id: 'leprechaun', peaceful: 0 });
    des.monster({ id: 'leprechaun', peaceful: 0 });
    des.monster({ id: 'leprechaun', peaceful: 0 });
    des.monster({ id: 'leprechaun', peaceful: 0 });
    des.monster({ id: 'leprechaun', peaceful: 0 });
    des.monster({ id: 'leprechaun', peaceful: 0 });
    des.monster({ id: 'leprechaun', peaceful: 0 });
    des.monster({ id: 'leprechaun', peaceful: 0 });
    des.monster({ id: 'leprechaun', peaceful: 0 });
    des.monster({ id: 'leprechaun', peaceful: 0 });
    des.monster({ class: 'l', peaceful: 0 });
    des.monster({ class: 'l', peaceful: 0 });
    des.monster({ id: 'guardian naga', peaceful: 0 });
    des.monster({ id: 'guardian naga', peaceful: 0 });
    des.monster({ id: 'guardian naga', peaceful: 0 });
    des.monster({ id: 'guardian naga', peaceful: 0 });
    des.monster({ id: 'guardian naga', peaceful: 0 });
    des.monster({ id: 'guardian naga', peaceful: 0 });
    des.monster({ id: 'guardian naga', peaceful: 0 });
    des.monster({ id: 'guardian naga', peaceful: 0 });
    des.monster({ class: 'N', peaceful: 0 });
    des.monster({ class: 'N', peaceful: 0 });
    des.monster({ class: 'N', peaceful: 0 });
    des.monster({ id: 'chameleon', peaceful: 0 });
    des.monster({ id: 'chameleon', peaceful: 0 });
    des.monster({ id: 'chameleon', peaceful: 0 });
    des.monster({ id: 'chameleon', peaceful: 0 });
    des.monster({ id: 'chameleon', peaceful: 0 });
    des.monster({ id: 'shark', x: 51, y: 14, peaceful: 0 });
    des.monster({ id: 'shark', x: 53, y: 9, peaceful: 0 });
    des.monster({ id: 'shark', x: 55, y: 15, peaceful: 0 });
    des.monster({ id: 'shark', x: 58, y: 10, peaceful: 0 });
}

// The ported level scripts by file name, for nhl_loadlua().
export const questlev_rog_lua_files = {
    'Rog-strt.lua': Rog_strt_lua,
    'Rog-loca.lua': Rog_loca_lua,
    'Rog-fila.lua': Rog_fila_lua,
    'Rog-filb.lua': Rog_filb_lua,
    'Rog-goal.lua': Rog_goal_lua,
};
