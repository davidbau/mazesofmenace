// questlev_val_lua.js — port of the Valkyrie quest level scripts:
// dat/Val-strt.lua (home level), dat/Val-loca.lua (locate level),
// dat/Val-fila.lua and dat/Val-filb.lua (filler levels) and dat/Val-goal.lua
// (goal level).
// makemaz() loads them through load_special() (sp_lev.c).
// C ref: dat/Val-strt.lua, dat/Val-loca.lua, dat/Val-fila.lua, dat/Val-filb.lua, dat/Val-goal.lua
//
// Translated from the .lua files by a script (the des.map() maps are
// verbatim), then reviewed. Lua arrays are 1-based: t[i] is t[i - 1] here.
// Lua-side rolls (math.random, nh.rn2; percent, shuffle and d roll inside
// nhlib_lua.js) go through withRngCaller() with the tag the C recorder
// writes; the selection operators |, &, + and - are lua_bor(), lua_band(),
// lua_add() and lua_sub() (nhlua.js).

import { lua_bor } from './nhlua.js';

const MAP_Val_strt = [
    'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    'xxxxxxxxxxxxxxxxx..xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx...xxxxxxxxxxxxxxxxxxxxx',
    'xxxxxxxxxxxxxxxx..xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx..{..xxxxxxxxxxxxxxxxxxxx',
    'xxxxxxxxxxxxxxx..xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.....xxxxxxxxxxxxxxxxxxx',
    'xxxxxxxxxxxxxx..xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.xxxxxxxxxxxxxxxxxxx',
    'xxxxxxxxxxxxx..xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.xxxxxxxxxxxxxxxxxxx',
    'xxxxxxxxxxxx..xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx..xxxxxxxxxxxxxxxxxxx',
    'xxxxxxxx.....xxxxxxxxxxxxx|----------------|xxxxxxxxxxx.xxxxxxxxxxxxxxxxxxxx',
    'xxxxxxx..xxx...xxxxxxxxxxx|................|xxxxxxxxxx..xxxxxxxxxxxxxxxxxxxx',
    'xxxxxx..xxxxxx......xxxxx.|................|.xxxxxxxxx.xxxxxxxxxxxxxxxxxxxxx',
    'xxxxx..xxxxxxxxxxxx.......+................+...xxxxxxx.xxxxxxxxxxxxxxxxxxxxx',
    'xxxx..xxxxxxxxx.....xxxxx.|................|.x...xxxxx.xxxxxxxxxxxxxxxxxxxxx',
    'xxx..xxxxxxxxx..xxxxxxxxxx|................|xxxx.......xxxxxxxxxxxxxxxxxxxxx',
    'xxxx..xxxxxxx..xxxxxxxxxxx|----------------|xxxxxxxxxx...xxxxxxxxxxxxxxxxxxx',
    'xxxxxx..xxxx..xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx...xxxxxxxxxxxxxxxxx',
    'xxxxxxx......xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx...xxxxxxxxxxxxxxx',
    'xxxxxxxxx...xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx...x......xxxxxx',
    'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.........xxxxx',
    'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.......xxxxxx',
    'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
].join('\n') + '\n';

// C ref: dat/Val-strt.lua
//	The "start" level for the quest.
//
//	Here you meet your (besieged) class leader, the Norn,
//	and receive your quest assignment.
//
function Val_strt_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;

    des.level_flags('mazelevel', 'noteleport', 'hardfloor', 'icedpools');
    des.level_init({ style: 'solidfill', fg: 'I' });

    let pools = selection.new();
    // random locations
    for (let i = 1; i <= 13; i++) {
        pools.set();
    }
    // some bigger ones
    pools = lua_bor(pools, selection.grow(selection.set(selection.new()), 'west'));
    pools = lua_bor(pools, selection.grow(selection.set(selection.new()), 'north'));
    pools = lua_bor(pools, selection.grow(selection.set(selection.new()), 'random'));

    // Lava pools surrounded by water
    des.terrain(pools.clone().grow('all'), 'P');
    des.terrain(pools, 'L');

    des.map(MAP_Val_strt);
    // Dungeon Description
    des.region(selection.area(0, 0, 75, 19), 'lit');
    // Portal arrival point
    des.levregion({ region: [66, 17, 66, 17], type: 'branch' });
    // Stairs
    des.stair('down', 18, 1);
    des.feature('fountain', 53, 2);
    // Doors
    des.door('locked', 26, 10);
    des.door('locked', 43, 10);
    // Norn
    des.monster({ id: 'Norn', coord: [35, 10], inventory: function() {
            des.object({ id: 'banded mail', spe: 5 });
            des.object({ id: 'long sword', spe: 4 });
        } });
    // The treasure of the Norn
    des.object('chest', 36, 10);
    // valkyrie guards for the audience chamber
    des.monster('warrior', 27, 8);
    des.monster('warrior', 27, 9);
    des.monster('warrior', 27, 11);
    des.monster('warrior', 27, 12);
    des.monster('warrior', 42, 8);
    des.monster('warrior', 42, 9);
    des.monster('warrior', 42, 11);
    des.monster('warrior', 42, 12);
    // Non diggable walls
    des.non_diggable(selection.area(26, 7, 43, 13));
    // Random traps
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    // Monsters on siege duty.
    des.monster('fire ant', 4, 12);
    des.monster('fire ant', 8, 8);
    des.monster('fire ant', 14, 4);
    des.monster('fire ant', 17, 11);
    des.monster('fire ant', 24, 10);
    des.monster('fire ant', 45, 10);
    des.monster('fire ant', 54, 2);
    des.monster('fire ant', 55, 7);
    des.monster('fire ant', 58, 14);
    des.monster('fire ant', 63, 17);
    des.monster({ id: 'fire giant', x: 18, y: 1, peaceful: 0 });
    des.monster({ id: 'fire giant', x: 10, y: 16, peaceful: 0 });
}

const MAP_Val_loca = [
    'PPPPxxxx                      xxxxPPPPPx',
    'PLPxxx                          xPPLLLPP',
    'PPP    .......................    PPPLLP',
    'xx   ............................   PPPP',
    'x  ...............................  xxxx',
    '  .................................   xx',
    '....................................   x',
    '  ...................................   ',
    'x  ..................................  x',
    'xx   ..............................   PP',
    'xPPP  ..........................     PLP',
    'xPLLP                             xxPLLP',
    'xPPPPxx                         xxxxPPPP',
].join('\n') + '\n';

// C ref: dat/Val-loca.lua
function Val_loca_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'hardfloor', 'icedpools', 'noflip');

    des.level_init({ style: 'mines', fg: '.', bg: 'I', smoothed: true, joined: false, lit: 1, walled: false });

    des.map(MAP_Val_loca);
    // Dungeon Description
    des.region(selection.area(0, 0, 39, 12), 'lit');
    // Stairs
    des.stair('up', 48, 14);
    des.stair('down', 20, 6);
    // Non diggable walls
    des.non_diggable(selection.area(0, 0, 39, 12));
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
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap();
    des.trap();
    // Random monsters.
    des.monster('fire ant');
    des.monster('fire ant');
    des.monster('fire ant');
    des.monster('fire ant');
    des.monster('fire ant');
    des.monster('fire ant');
    des.monster('fire ant');
    des.monster('fire ant');
    des.monster('fire ant');
    des.monster('fire ant');
    des.monster('fire ant');
    des.monster('fire ant');
    des.monster('fire ant');
    des.monster('fire ant');
    des.monster('fire ant');
    des.monster('fire ant');
    des.monster('fire ant');
    des.monster('a');
    des.monster({ class: 'H', peaceful: 0 });
    des.monster({ id: 'fire giant', peaceful: 0 });
    des.monster({ id: 'fire giant', peaceful: 0 });
    des.monster({ id: 'fire giant', peaceful: 0 });
    des.monster({ id: 'fire giant', peaceful: 0 });
    des.monster({ id: 'fire giant', peaceful: 0 });
    des.monster({ id: 'fire giant', peaceful: 0 });
    des.monster({ id: 'fire giant', peaceful: 0 });
    des.monster({ class: 'H', peaceful: 0 });
}

// C ref: dat/Val-fila.lua
function Val_fila_lua(L) {
    const G = L.globals, des = G.des;

    des.level_init({ style: 'solidfill', fg: 'I' });

    des.level_flags('mazelevel', 'icedpools', 'noflip');

    des.level_init({ style: 'mines', fg: '.', bg: 'I', smoothed: true, joined: true, lit: 1, walled: false });

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
    des.monster('fire ant');
    des.monster('fire ant');
    des.monster('fire ant');
    des.monster('fire ant');
    des.monster('fire ant');
    des.monster('a');
    des.monster({ id: 'fire giant', peaceful: 0 });
    //
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
}

// C ref: dat/Val-filb.lua
function Val_filb_lua(L) {
    const G = L.globals, des = G.des;

    des.level_init({ style: 'solidfill', fg: 'L' });

    des.level_flags('mazelevel', 'icedpools', 'noflip');

    des.level_init({ style: 'mines', fg: '.', bg: 'L', smoothed: true, joined: true, lit: 1, walled: false });

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
    des.monster('fire ant');
    des.monster('fire ant');
    des.monster('fire ant');
    des.monster('a');
    des.monster({ id: 'fire giant', peaceful: 0 });
    des.monster({ id: 'fire giant', peaceful: 0 });
    des.monster({ id: 'fire giant', peaceful: 0 });
    //
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap();
    des.trap();
}

const MAP_Val_goal = [
    'xxxxxx.....................xxxxxxxx',
    'xxxxx.......LLLLL.LLLLL......xxxxxx',
    'xxxx......LLLLLLLLLLLLLLL......xxxx',
    'xxxx.....LLL|---------|LLL.....xxxx',
    'xxxx....LL|--.........--|LL.....xxx',
    'x......LL|-...LLLLLLL...-|LL.....xx',
    '.......LL|...LL.....LL...|LL......x',
    '......LL|-..LL.......LL..-|LL......',
    '......LL|.................|LL......',
    '......LL|-..LL.......LL..-|LL......',
    '.......LL|...LL.....LL...|LL.......',
    'xx.....LL|-...LLLLLLL...-|LL......x',
    'xxx.....LL|--.........--|LL.....xxx',
    'xxxx.....LLL|---------|LLL...xxxxxx',
    'xxxxx.....LLLLLLLLLLLLLLL...xxxxxxx',
    'xxxxxx......LLLLL.LLLLL.....xxxxxxx',
    'xxxxxxxxx..................xxxxxxxx',
].join('\n') + '\n';

// C ref: dat/Val-goal.lua
function Val_goal_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;

    des.level_init({ style: 'solidfill', fg: 'L' });

    des.level_flags('mazelevel', 'icedpools');

    des.level_init({ style: 'mines', fg: '.', bg: 'L', smoothed: true, joined: true, lit: 1, walled: false });

    des.map(MAP_Val_goal);
    // Dungeon Description
    des.region(selection.area(0, 0, 34, 16), 'lit');
    // Stairs
    // Note:  The up stairs are *intentionally* off of the map.
    // if the stairs are surrounded by lava, maybe give some room
    des.replace_terrain({ region: [44, 9, 46, 11], fromterrain: 'L', toterrain: '.', chance: 50 });
    des.stair('up', 45, 10);
    // Non diggable walls
    des.non_diggable(selection.area(0, 0, 34, 16));
    // Drawbridges; northern one opens from the south (portcullis) to further
    // north (lowered span), southern one from the north to further south
    des.drawbridge({ x: 17, y: 2, dir: 'south', state: 'random' });
    if (G.percent(75)) {
        des.drawbridge({ x: 17, y: 14, dir: 'north', state: 'open' });
    } else {
        des.drawbridge({ x: 17, y: 14, dir: 'north', state: 'random' });
    }
    // Objects
    des.object({ id: 'crystal ball', x: 17, y: 8, buc: 'blessed', spe: 5, name: 'The Orb of Fate' });
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
    // Traps
    des.trap('board', 13, 8);
    des.trap('board', 21, 8);
    // Random traps
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('board');
    des.trap();
    des.trap();
    // Random monsters.
    des.monster('Lord Surtur', 17, 8);
    des.monster('fire ant');
    des.monster('fire ant');
    des.monster('fire ant');
    des.monster('fire ant');
    des.monster('a');
    des.monster('a');
    des.monster({ id: 'fire giant', x: 10, y: 6, peaceful: 0 });
    des.monster({ id: 'fire giant', x: 10, y: 7, peaceful: 0 });
    des.monster({ id: 'fire giant', x: 10, y: 8, peaceful: 0 });
    des.monster({ id: 'fire giant', x: 10, y: 9, peaceful: 0 });
    des.monster({ id: 'fire giant', x: 10, y: 10, peaceful: 0 });
    des.monster({ id: 'fire giant', x: 24, y: 6, peaceful: 0 });
    des.monster({ id: 'fire giant', x: 24, y: 7, peaceful: 0 });
    des.monster({ id: 'fire giant', x: 24, y: 8, peaceful: 0 });
    des.monster({ id: 'fire giant', x: 24, y: 9, peaceful: 0 });
    des.monster({ id: 'fire giant', x: 24, y: 10, peaceful: 0 });
    des.monster({ id: 'fire giant', peaceful: 0 });
    des.monster({ id: 'fire giant', peaceful: 0 });
    des.monster({ class: 'H', peaceful: 0 });

    //
    //	The "fill" levels for the quest.
    //
    //	These levels are used to fill out any levels not occupied by specific
    //	levels as defined above. "filla" is the upper filler, between the
    //	start and locate levels, and "fillb" the lower between the locate
    //	and goal levels.
    //
}

// The ported level scripts by file name, for nhl_loadlua().
export const questlev_val_lua_files = {
    'Val-strt.lua': Val_strt_lua,
    'Val-loca.lua': Val_loca_lua,
    'Val-fila.lua': Val_fila_lua,
    'Val-filb.lua': Val_filb_lua,
    'Val-goal.lua': Val_goal_lua,
};
