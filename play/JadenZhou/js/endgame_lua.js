// endgame_lua.js — port of the Elemental Planes and Astral Plane level
// scripts: dat/earth.lua, dat/air.lua, dat/fire.lua, dat/water.lua and
// dat/astral.lua.
// makemaz() loads them through load_special() (sp_lev.c).
// C ref: dat/earth.lua, dat/air.lua, dat/fire.lua, dat/water.lua, dat/astral.lua
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

const MAP_earth = [
    '                                                                            ',
    '  ...                                                                       ',
    ' ....                ..                                                     ',
    ' .....             ...                                      ..              ',
    '  ....              ....                                     ...            ',
    '   ....              ...                ....                 ...      .     ',
    '    ..                ..              .......                 .      ..     ',
    '                                      ..  ...                        .      ',
    '              .                      ..    .                         ...    ',
    '             ..  ..                  .     ..                         .     ',
    '            ..   ...                        .                               ',
    '            ...   ...                                                       ',
    '              .. ...                                 ..                     ',
    '               ....                                 ..                      ',
    '                          ..                                       ...      ',
    '                         ..                                       .....     ',
    '  ...                                                              ...      ',
    ' ....                                                                       ',
    '   ..                                                                       ',
    '                                                                            ',
].join('\n') + '\n';

// C ref: dat/earth.lua
//                      and Timo Hakulinen
//
//
// These are the ENDGAME levels: earth, air, fire, water, and astral.
// The top-most level, the Astral Level, has 3 temples and shrines.
// Players are supposed to sacrifice the Amulet of Yendor on the appropriate
// shrine.
function earth_lua(L) {
    const G = L.globals, des = G.des;

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'noteleport', 'hardfloor', 'shortsighted');

    des.message('Well done, mortal!');
    des.message('But now thou must face the final Test...');
    des.message('Prove thyself worthy or perish!');

    // The player lands, upon arrival, in the
    // lower-right cavern.  The location of the
    // portal to the next level is randomly chosen.
    // This map has no visible outer boundary, and
    // is mostly diggable "rock".
    des.map(MAP_earth);

    des.replace_terrain({ region: [0, 0, 75, 19], fromterrain: ' ', toterrain: '.', lit: 0, chance: 5 });

    //  Since there are no stairs, this forces the hero's initial placement
    des.teleport_region({ region: [69, 16, 69, 16] });
    des.levregion({ region: [0, 0, 75, 19], exclude: [65, 13, 75, 19], type: 'portal', name: 'air' });
    //  Some helpful monsters.  Making sure a
    //  pick axe and at least one wand of digging
    //  are available.
    des.monster('Elvenking', 67, 16);
    des.monster('minotaur', 67, 14);
    //  An assortment of earth-appropriate nasties
    //  in each cavern.
    des.monster({ id: 'earth elemental', x: 52, y: 13, peaceful: 0 });
    des.monster({ id: 'earth elemental', x: 53, y: 13, peaceful: 0 });
    des.monster('rock troll', 53, 12);
    des.monster('stone giant', 54, 12);
    //
    des.monster('pit viper', 70, 5);
    des.monster('barbed devil', 69, 6);
    des.monster('stone giant', 69, 8);
    des.monster('stone golem', 71, 8);
    des.monster('pit fiend', 70, 9);
    des.monster({ id: 'earth elemental', x: 70, y: 8, peaceful: 0 });
    //
    des.monster({ id: 'earth elemental', x: 60, y: 3, peaceful: 0 });
    des.monster('stone giant', 61, 4);
    des.monster({ id: 'earth elemental', x: 62, y: 4, peaceful: 0 });
    des.monster({ id: 'earth elemental', x: 61, y: 5, peaceful: 0 });
    des.monster('scorpion', 62, 5);
    des.monster('rock piercer', 63, 5);
    //
    des.monster('umber hulk', 40, 5);
    des.monster('dust vortex', 42, 5);
    des.monster('rock troll', 38, 6);
    des.monster({ id: 'earth elemental', x: 39, y: 6, peaceful: 0 });
    des.monster({ id: 'earth elemental', x: 41, y: 6, peaceful: 0 });
    des.monster({ id: 'earth elemental', x: 38, y: 7, peaceful: 0 });
    des.monster('stone giant', 39, 7);
    des.monster({ id: 'earth elemental', x: 43, y: 7, peaceful: 0 });
    des.monster('stone golem', 37, 8);
    des.monster('pit viper', 43, 8);
    des.monster('pit viper', 43, 9);
    des.monster('rock troll', 44, 10);
    //
    des.monster({ id: 'earth elemental', x: 2, y: 1, peaceful: 0 });
    des.monster({ id: 'earth elemental', x: 3, y: 1, peaceful: 0 });
    des.monster('stone golem', 1, 2);
    des.monster({ id: 'earth elemental', x: 2, y: 2, peaceful: 0 });
    des.monster('rock troll', 4, 3);
    des.monster('rock troll', 3, 3);
    des.monster('pit fiend', 3, 4);
    des.monster({ id: 'earth elemental', x: 4, y: 5, peaceful: 0 });
    des.monster('pit viper', 5, 6);
    //
    des.monster({ id: 'earth elemental', x: 21, y: 2, peaceful: 0 });
    des.monster({ id: 'earth elemental', x: 21, y: 3, peaceful: 0 });
    des.monster('minotaur', 21, 4);
    des.monster({ id: 'earth elemental', x: 21, y: 5, peaceful: 0 });
    des.monster('rock troll', 22, 5);
    des.monster({ id: 'earth elemental', x: 22, y: 6, peaceful: 0 });
    des.monster({ id: 'earth elemental', x: 23, y: 6, peaceful: 0 });
    //
    des.monster('pit viper', 14, 8);
    des.monster('barbed devil', 14, 9);
    des.monster({ id: 'earth elemental', x: 13, y: 10, peaceful: 0 });
    des.monster('rock troll', 12, 11);
    des.monster({ id: 'earth elemental', x: 14, y: 12, peaceful: 0 });
    des.monster({ id: 'earth elemental', x: 15, y: 13, peaceful: 0 });
    des.monster('stone giant', 17, 13);
    des.monster('stone golem', 18, 13);
    des.monster('pit fiend', 18, 12);
    des.monster({ id: 'earth elemental', x: 18, y: 11, peaceful: 0 });
    des.monster({ id: 'earth elemental', x: 18, y: 10, peaceful: 0 });
    //
    des.monster('barbed devil', 2, 16);
    des.monster({ id: 'earth elemental', x: 3, y: 16, peaceful: 0 });
    des.monster('rock troll', 2, 17);
    des.monster({ id: 'earth elemental', x: 4, y: 17, peaceful: 0 });
    des.monster({ id: 'earth elemental', x: 4, y: 18, peaceful: 0 });

    des.object('boulder');
}

const MAP_air = [
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
].join('\n') + '\n';

// C ref: dat/air.lua
//                      and Timo Hakulinen
//
function air_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'noteleport', 'hardfloor', 'shortsighted', 'stormy');
    // The following messages are somewhat obtuse, to make then
    // equally meaningful if the player can see or not.
    des.message('What a strange feeling!');
    des.message('You notice that there is no gravity here.');
    // The player lands, upon arrival, in the
    // lower-left area.  The location of the
    // portal to the next level is randomly chosen.
    // This map has no visible outer boundary, and
    // is all "air".
    des.map(MAP_air);
    // Use up and down regions to partition the level into three parts;
    // teleportation can't cross from one part into another.
    // The up region is where you'll arrive after activating the portal from
    // the preceding level; the exit portal is placed inside the down region.
    des.teleport_region({ region: [1, 0, 24, 20], region_islev: 1, exclude: [25, 0, 79, 20], exclude_islev: 1, dir: 'up' });
    des.teleport_region({ region: [56, 0, 79, 20], region_islev: 1, exclude: [1, 0, 55, 20], exclude_islev: 1, dir: 'down' });

    // des.portal(levregion(57,01,78,19),(0,0,0,0),"fire")
    des.levregion({ region: [57, 1, 78, 19], region_islev: 1, type: 'portal', name: 'fire' });
    des.region(selection.area(0, 0, 75, 19), 'lit');
    des.monster({ id: 'air elemental', peaceful: 0 });
    des.monster({ id: 'air elemental', peaceful: 0 });
    des.monster({ id: 'air elemental', peaceful: 0 });
    des.monster({ id: 'air elemental', peaceful: 0 });
    des.monster({ id: 'air elemental', peaceful: 0 });
    des.monster({ id: 'air elemental', peaceful: 0 });
    des.monster({ id: 'air elemental', peaceful: 0 });
    des.monster({ id: 'air elemental', peaceful: 0 });
    des.monster({ id: 'air elemental', peaceful: 0 });
    des.monster({ id: 'air elemental', peaceful: 0 });
    des.monster({ id: 'air elemental', peaceful: 0 });

    des.monster({ id: 'floating eye', peaceful: 0 });
    des.monster({ id: 'floating eye', peaceful: 0 });
    des.monster({ id: 'floating eye', peaceful: 0 });

    des.monster({ id: 'yellow light', peaceful: 0 });
    des.monster({ id: 'yellow light', peaceful: 0 });
    des.monster({ id: 'yellow light', peaceful: 0 });

    des.monster('couatl');

    des.monster('D');
    des.monster('D');
    des.monster('D');
    des.monster('D');
    des.monster('D');

    des.monster('E');
    des.monster('E');
    des.monster('E');
    des.monster('J');
    des.monster('J');

    des.monster({ id: 'djinni', peaceful: 0 });
    des.monster({ id: 'djinni', peaceful: 0 });
    des.monster({ id: 'djinni', peaceful: 0 });

    des.monster({ id: 'fog cloud', peaceful: 0 });
    des.monster({ id: 'fog cloud', peaceful: 0 });
    des.monster({ id: 'fog cloud', peaceful: 0 });
    des.monster({ id: 'fog cloud', peaceful: 0 });
    des.monster({ id: 'fog cloud', peaceful: 0 });
    des.monster({ id: 'fog cloud', peaceful: 0 });
    des.monster({ id: 'fog cloud', peaceful: 0 });
    des.monster({ id: 'fog cloud', peaceful: 0 });
    des.monster({ id: 'fog cloud', peaceful: 0 });
    des.monster({ id: 'energy vortex', peaceful: 0 });
    des.monster({ id: 'energy vortex', peaceful: 0 });
    des.monster({ id: 'energy vortex', peaceful: 0 });
    des.monster({ id: 'energy vortex', peaceful: 0 });
    des.monster({ id: 'energy vortex', peaceful: 0 });
    des.monster({ id: 'steam vortex', peaceful: 0 });
    des.monster({ id: 'steam vortex', peaceful: 0 });
    des.monster({ id: 'steam vortex', peaceful: 0 });
    des.monster({ id: 'steam vortex', peaceful: 0 });
    des.monster({ id: 'steam vortex', peaceful: 0 });
}

const MAP_fire = [
    'LL.............LL..............L...LL.........LL.................LL...........L',
    'LL....LLLLLLLL............L...L.............LL....LLL.......................LL.',
    'L....LL...................L......................LLLL................LL........',
    '.....L.............LLLL...LL....LL...............LLLLL.............LLL.........',
    '.L.LLLL..............LL....L.....LLL..............LLLL..............LLLL......L',
    'LL..........LLLL...LLLL...LLL....LLL......L........LLLL....LL........LLL......L',
    'LL........LLLLLLL...LL.....L......L......LL.........LL......LL........LL...L...',
    'L.........LL..LLL..LL......LL......LLLL..L.........LL......LLL............LL...',
    '......L..LL....LLLLL.................LLLLLLL.......L......LL............LLLLLL.',
    '......L..L.....LL.LLLL.......L............L........LLLLL.LL......LL.........LL.',
    '......LL........L...LL......LL.............LLL.....L...LLL.......LLL.........L.',
    '.L.....LLLLLL........L.......LLL.............L....LL...L.LLL......LLLLLLL......',
    'LL..........LLLL............LL.L.............L....L...LL.........LLL..LLL......',
    '.L...........................LLLLL...........LL...L...L........LLLL..LLLLLL...L',
    '.L.....LLLL.............LL....LL.......LLL...LL.......L..LLL....LLLLLLL.......L',
    '.........LLL.........LLLLLLLLLLL......LLLLL...L...........LL...LL...LL.........',
    '...........LL.......LL.........LL.......LLL....L..LLL....LL.........LL.........',
    '............LLLLLLLLL...........LL....LLL.......LLLLL.....LL........LL.........',
    '.LL...............L.............LLLLLL............LL...LLLL.........LL.......L.',
    'LL.....L..........................LL....................LL..................LLL',
    'L.....LLL......................LLLLL.........L.........LLLLLLLL..............LL',
].join('\n') + '\n';

// C ref: dat/fire.lua
//                      and Timo Hakulinen
//
function fire_lua(L) {
    const G = L.globals, des = G.des;

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'noteleport', 'hardfloor', 'shortsighted', 'hot', 'fumaroles');
    // The player lands, upon arrival, in the
    // lower-right.  The location of the
    // portal to the next level is randomly chosen.
    // This map has no visible outer boundary, and
    // is mostly open area, with lava lakes and bunches of fire traps.
    // It fills the entire mappable area.
    des.map(MAP_fire);
    des.teleport_region({ region: [71, 16, 71, 16] });
    des.levregion({ region: [0, 0, 78, 19], exclude: [67, 13, 78, 19], type: 'portal', name: 'water' });

    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    //  An assortment of fire-appropriate nasties
    des.monster('red dragon');
    des.monster('balrog');
    des.monster({ id: 'fire elemental', peaceful: 0 });
    des.monster({ id: 'fire elemental', peaceful: 0 });
    des.monster('fire vortex');
    des.monster('hell hound');
    //
    des.monster('fire giant');
    des.monster('barbed devil');
    des.monster('hell hound');
    des.monster('stone golem');
    des.monster('pit fiend');
    des.monster({ id: 'fire elemental', peaceful: 0 });
    //
    des.monster({ id: 'fire elemental', peaceful: 0 });
    des.monster('hell hound');
    des.monster({ id: 'fire elemental', peaceful: 0 });
    des.monster({ id: 'fire elemental', peaceful: 0 });
    des.monster('scorpion');
    des.monster('fire giant');
    //
    des.monster('hell hound');
    des.monster('dust vortex');
    des.monster('fire vortex');
    des.monster({ id: 'fire elemental', peaceful: 0 });
    des.monster({ id: 'fire elemental', peaceful: 0 });
    des.monster({ id: 'fire elemental', peaceful: 0 });
    des.monster('hell hound');
    des.monster({ id: 'fire elemental', peaceful: 0 });
    des.monster('stone golem');
    des.monster('pit viper');
    des.monster('pit viper');
    des.monster('fire vortex');
    //
    des.monster({ id: 'fire elemental', peaceful: 0 });
    des.monster({ id: 'fire elemental', peaceful: 0 });
    des.monster('fire giant');
    des.monster({ id: 'fire elemental', peaceful: 0 });
    des.monster('fire vortex');
    des.monster('fire vortex');
    des.monster('pit fiend');
    des.monster({ id: 'fire elemental', peaceful: 0 });
    des.monster('pit viper');
    //
    des.monster({ id: 'salamander', peaceful: 0 });
    des.monster({ id: 'salamander', peaceful: 0 });
    des.monster('minotaur');
    des.monster({ id: 'salamander', peaceful: 0 });
    des.monster('steam vortex');
    des.monster({ id: 'salamander', peaceful: 0 });
    des.monster({ id: 'salamander', peaceful: 0 });
    //
    des.monster('fire giant');
    des.monster('barbed devil');
    des.monster({ id: 'fire elemental', peaceful: 0 });
    des.monster('fire vortex');
    des.monster({ id: 'fire elemental', peaceful: 0 });
    des.monster({ id: 'fire elemental', peaceful: 0 });
    des.monster('hell hound');
    des.monster('fire giant');
    des.monster('pit fiend');
    des.monster({ id: 'fire elemental', peaceful: 0 });
    des.monster({ id: 'fire elemental', peaceful: 0 });
    //
    des.monster('barbed devil');
    des.monster({ id: 'salamander', peaceful: 0 });
    des.monster('steam vortex');
    des.monster({ id: 'salamander', peaceful: 0 });
    des.monster({ id: 'salamander', peaceful: 0 });

    des.object('boulder');
    des.object('boulder');
    des.object('boulder');
    des.object('boulder');
    des.object('boulder');
}

const MAP_water = [
    'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
].join('\n') + '\n';

// C ref: dat/water.lua
//                      and Timo Hakulinen
//
function water_lua(L) {
    const G = L.globals, des = G.des;

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'noteleport', 'hardfloor', 'shortsighted');
    des.message('You find yourself suspended in an air bubble surrounded by water.');
    // The player lands upon arrival to an air bubble
    // within the leftmost third of the level.  The
    // portal to the next level is randomly located in an air
    // bubble within the rightmost third of the level.
    // Bubbles are generated by special code in mkmaze.c for now.
    des.map(MAP_water);
    des.teleport_region({ region: [0, 0, 25, 19] });
    des.levregion({ type: 'portal', region: [51, 0, 75, 19], name: 'astral' });
    // A fisherman's dream...
    des.monster('giant eel');
    des.monster('giant eel');
    des.monster('giant eel');
    des.monster('giant eel');
    des.monster('giant eel');
    des.monster('giant eel');
    des.monster('giant eel');
    des.monster('giant eel');
    des.monster('electric eel');
    des.monster('electric eel');
    des.monster('electric eel');
    des.monster('electric eel');
    des.monster('electric eel');
    des.monster('electric eel');
    des.monster('electric eel');
    des.monster('electric eel');
    des.monster('kraken');
    des.monster('kraken');
    des.monster('kraken');
    des.monster('kraken');
    des.monster('kraken');
    des.monster('kraken');
    des.monster('kraken');
    des.monster('kraken');
    des.monster('kraken');
    des.monster('shark');
    des.monster('shark');
    des.monster('shark');
    des.monster('shark');
    des.monster('piranha');
    des.monster('piranha');
    des.monster('piranha');
    des.monster('piranha');
    des.monster('jellyfish');
    des.monster('jellyfish');
    des.monster('jellyfish');
    des.monster('jellyfish');
    des.monster(';');
    des.monster(';');
    des.monster(';');
    des.monster(';');
    // These guys feel like home here
    des.monster({ id: 'water elemental', peaceful: 0 });
    des.monster({ id: 'water elemental', peaceful: 0 });
    des.monster({ id: 'water elemental', peaceful: 0 });
    des.monster({ id: 'water elemental', peaceful: 0 });
    des.monster({ id: 'water elemental', peaceful: 0 });
    des.monster({ id: 'water elemental', peaceful: 0 });
    des.monster({ id: 'water elemental', peaceful: 0 });
    des.monster({ id: 'water elemental', peaceful: 0 });
    des.monster({ id: 'water elemental', peaceful: 0 });
    des.monster({ id: 'water elemental', peaceful: 0 });
    des.monster({ id: 'water elemental', peaceful: 0 });
    des.monster({ id: 'water elemental', peaceful: 0 });
    des.monster({ id: 'water elemental', peaceful: 0 });
    des.monster({ id: 'water elemental', peaceful: 0 });
    des.monster({ id: 'water elemental', peaceful: 0 });
    des.monster({ id: 'water elemental', peaceful: 0 });
    des.monster({ id: 'water elemental', peaceful: 0 });
    des.monster({ id: 'water elemental', peaceful: 0 });
    des.monster({ id: 'water elemental', peaceful: 0 });
}

const MAP_astral = [
    '                              ---------------                              ',
    '                              |.............|                              ',
    '                              |..---------..|                              ',
    '                              |..|.......|..|                              ',
    '---------------               |..|.......|..|               ---------------',
    '|.............|               |..|.......|..|               |.............|',
    '|..---------..-|   |-------|  |..|.......|..|  |-------|   |-..---------..|',
    '|..|.......|...-| |-.......-| |..|.......|..| |-.......-| |-...|.......|..|',
    '|..|.......|....-|-.........-||..----+----..||-.........-|-....|.......|..|',
    '|..|.......+.....+...........||.............||...........+.....+.......|..|',
    '|..|.......|....-|-.........-|--|.........|--|-.........-|-....|.......|..|',
    '|..|.......|...-| |-.......-|   -|---+---|-   |-.......-| |-...|.......|..|',
    '|..---------..-|   |---+---|    |-.......-|    |---+---|   |-..---------..|',
    '|.............|      |...|-----|-.........-|-----|...|      |.............|',
    '---------------      |.........|...........|.........|      ---------------',
    '                     -------...|-.........-|...-------                     ',
    '                           |....|-.......-|....|                           ',
    '                           ---...|---+---|...---                           ',
    '                             |...............|                             ',
    '                             -----------------                             ',
].join('\n') + '\n';

// C ref: dat/astral.lua
//                      and Timo Hakulinen
//
function astral_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;
    // math.random called from the main chunk or an anonymous function
    const random = (line, ...args) => chunk_random(G, 'astral.lua', line, ...args);

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'noteleport', 'hardfloor', 'nommap', 'shortsighted', 'solidify');
    des.message('You arrive on the Astral Plane!');
    des.message('Here the High Temple of %d is located.');
    des.message('You sense alarm, hostility, and excitement in the air!');
    des.map(MAP_astral);

    // chance to alter above map and turn the wings of the bottom-center into
    // a pair of big (5x15) rooms
    for (let i = 1; i <= 2; i++) {
        // 3.6.[01]: 75% chance that both sides opened up, 25% that neither did;
        // 3.6.2: 60% twice == 36% chance that both sides open up, 24% left side
        // only, 24% right side only, 16% that neither side opens up
        let hall;
        if (G.percent(60)) {
            if (i === 1) {
                des.terrain(selection.area(17, 14, 30, 18), '.');
                des.wallify();
                // temporarily close off the area to be filled so that it doesn't cover
                // the entire entry area
                des.terrain(33, 18, '|');
                hall = selection.floodfill(30, 16);
                // re-connect the opened wing with the rest of the map
                des.terrain(33, 18, '.');
            } else {
                des.terrain(selection.area(44, 14, 57, 18), '.');
                des.wallify();
                des.terrain(41, 18, '|');
                hall = selection.floodfill(44, 16);
                des.terrain(41, 18, '.');
            }
            // extra monsters; was [6 + 3d4] when both wings were opened up at once
            for (let j = 1, j_last = random(61, 4, 9); j <= j_last; j++) {
                des.monster({ id: 'Angel', coord: hall.rndcoord(1), align: 'noalign', peaceful: 0 });
                if (G.percent(50)) {
                    des.monster({ coord: hall.rndcoord(1), peaceful: 0 });
                }
            }
        }
    }

    // Rider locations
    const place = selection.new();
    place.set(23, 9);
    place.set(37, 14);
    place.set(51, 9);

    // Where the player will land on arrival
    des.teleport_region({ region: [29, 15, 45, 15], exclude: [30, 15, 44, 15] });
    // Lit courts
    des.region({ region: [1, 5, 16, 14], lit: 1, type: 'ordinary', irregular: 1 });
    des.region({ region: [31, 1, 44, 10], lit: 1, type: 'ordinary', irregular: 1 });
    des.region({ region: [61, 5, 74, 14], lit: 1, type: 'ordinary', irregular: 1 });
    // A Sanctum for each alignment
    // The shrines' alignments are shuffled for
    // each game
    des.region({ region: [4, 7, 10, 11], lit: 1, type: 'temple', filled: 2 });
    des.region({ region: [34, 3, 40, 7], lit: 1, type: 'temple', filled: 2 });
    des.region({ region: [64, 7, 70, 11], lit: 1, type: 'temple', filled: 2 });

    des.altar({ x: 7, y: 9, align: G.align[0], type: 'sanctum' });
    des.altar({ x: 37, y: 5, align: G.align[1], type: 'sanctum' });
    des.altar({ x: 67, y: 9, align: G.align[2], type: 'sanctum' });
    // Doors
    des.door('closed', 11, 9);
    des.door('closed', 17, 9);
    des.door('locked', 23, 12);
    des.door('locked', 37, 8);
    des.door('closed', 37, 11);
    des.door('closed', 37, 17);
    des.door('locked', 51, 12);
    des.door('locked', 57, 9);
    des.door('closed', 63, 9);
    // Non diggable and phazeable everywhere
    des.non_diggable(selection.area(0, 0, 74, 19));
    des.non_passwall(selection.area(0, 0, 74, 19));
    // Moloch's horde
    // West round room
    des.monster({ id: 'aligned cleric', x: 18, y: 9, align: 'noalign', peaceful: 0 });
    des.monster({ id: 'aligned cleric', x: 19, y: 8, align: 'noalign', peaceful: 0 });
    des.monster({ id: 'aligned cleric', x: 19, y: 9, align: 'noalign', peaceful: 0 });
    des.monster({ id: 'aligned cleric', x: 19, y: 10, align: 'noalign', peaceful: 0 });
    des.monster({ id: 'Angel', x: 20, y: 9, align: 'noalign', peaceful: 0 });
    des.monster({ id: 'Angel', x: 20, y: 10, align: 'noalign', peaceful: 0 });
    des.monster({ id: 'Pestilence', coord: place.rndcoord(1), peaceful: 0 });
    // South-central round room
    des.monster({ id: 'aligned cleric', x: 36, y: 12, align: 'noalign', peaceful: 0 });
    des.monster({ id: 'aligned cleric', x: 37, y: 12, align: 'noalign', peaceful: 0 });
    des.monster({ id: 'aligned cleric', x: 38, y: 12, align: 'noalign', peaceful: 0 });
    des.monster({ id: 'aligned cleric', x: 36, y: 13, align: 'noalign', peaceful: 0 });
    des.monster({ id: 'Angel', x: 38, y: 13, align: 'noalign', peaceful: 0 });
    des.monster({ id: 'Angel', x: 37, y: 13, align: 'noalign', peaceful: 0 });
    des.monster({ id: 'Death', coord: place.rndcoord(1), peaceful: 0 });
    // East round room
    des.monster({ id: 'aligned cleric', x: 56, y: 9, align: 'noalign', peaceful: 0 });
    des.monster({ id: 'aligned cleric', x: 55, y: 8, align: 'noalign', peaceful: 0 });
    des.monster({ id: 'aligned cleric', x: 55, y: 9, align: 'noalign', peaceful: 0 });
    des.monster({ id: 'aligned cleric', x: 55, y: 10, align: 'noalign', peaceful: 0 });
    des.monster({ id: 'Angel', x: 54, y: 9, align: 'noalign', peaceful: 0 });
    des.monster({ id: 'Angel', x: 54, y: 10, align: 'noalign', peaceful: 0 });
    des.monster({ id: 'Famine', coord: place.rndcoord(1), peaceful: 0 });
    //
    // The aligned horde
    //
    // We do not know in advance the alignment of the
    // player.  The mpeaceful bit will need resetting
    // when the level is created.  The setting here is
    // but a place holder.
    //
    // West court
    des.monster({ id: 'aligned cleric', x: 12, y: 7, align: 'chaos', peaceful: 0 });
    des.monster({ id: 'aligned cleric', x: 13, y: 7, align: 'chaos', peaceful: 1 });
    des.monster({ id: 'aligned cleric', x: 14, y: 7, align: 'law', peaceful: 0 });
    des.monster({ id: 'aligned cleric', x: 12, y: 11, align: 'law', peaceful: 1 });
    des.monster({ id: 'aligned cleric', x: 13, y: 11, align: 'neutral', peaceful: 0 });
    des.monster({ id: 'aligned cleric', x: 14, y: 11, align: 'neutral', peaceful: 1 });
    des.monster({ id: 'Angel', x: 11, y: 5, align: 'chaos', peaceful: 0 });
    des.monster({ id: 'Angel', x: 12, y: 5, align: 'chaos', peaceful: 1 });
    des.monster({ id: 'Angel', x: 13, y: 5, align: 'law', peaceful: 0 });
    des.monster({ id: 'Angel', x: 11, y: 13, align: 'law', peaceful: 1 });
    des.monster({ id: 'Angel', x: 12, y: 13, align: 'neutral', peaceful: 0 });
    des.monster({ id: 'Angel', x: 13, y: 13, align: 'neutral', peaceful: 1 });
    // Central court
    des.monster({ id: 'aligned cleric', x: 32, y: 9, align: 'chaos', peaceful: 0 });
    des.monster({ id: 'aligned cleric', x: 33, y: 9, align: 'chaos', peaceful: 1 });
    des.monster({ id: 'aligned cleric', x: 34, y: 9, align: 'law', peaceful: 0 });
    des.monster({ id: 'aligned cleric', x: 40, y: 9, align: 'law', peaceful: 1 });
    des.monster({ id: 'aligned cleric', x: 41, y: 9, align: 'neutral', peaceful: 0 });
    des.monster({ id: 'aligned cleric', x: 42, y: 9, align: 'neutral', peaceful: 1 });
    des.monster({ id: 'Angel', x: 31, y: 8, align: 'chaos', peaceful: 0 });
    des.monster({ id: 'Angel', x: 32, y: 8, align: 'chaos', peaceful: 1 });
    des.monster({ id: 'Angel', x: 31, y: 9, align: 'law', peaceful: 0 });
    des.monster({ id: 'Angel', x: 42, y: 8, align: 'law', peaceful: 1 });
    des.monster({ id: 'Angel', x: 43, y: 8, align: 'neutral', peaceful: 0 });
    des.monster({ id: 'Angel', x: 43, y: 9, align: 'neutral', peaceful: 1 });
    // East court
    des.monster({ id: 'aligned cleric', x: 60, y: 7, align: 'chaos', peaceful: 0 });
    des.monster({ id: 'aligned cleric', x: 61, y: 7, align: 'chaos', peaceful: 1 });
    des.monster({ id: 'aligned cleric', x: 62, y: 7, align: 'law', peaceful: 0 });
    des.monster({ id: 'aligned cleric', x: 60, y: 11, align: 'law', peaceful: 1 });
    des.monster({ id: 'aligned cleric', x: 61, y: 11, align: 'neutral', peaceful: 0 });
    des.monster({ id: 'aligned cleric', x: 62, y: 11, align: 'neutral', peaceful: 1 });
    des.monster({ id: 'Angel', x: 61, y: 5, align: 'chaos', peaceful: 0 });
    des.monster({ id: 'Angel', x: 62, y: 5, align: 'chaos', peaceful: 1 });
    des.monster({ id: 'Angel', x: 63, y: 5, align: 'law', peaceful: 0 });
    des.monster({ id: 'Angel', x: 61, y: 13, align: 'law', peaceful: 1 });
    des.monster({ id: 'Angel', x: 62, y: 13, align: 'neutral', peaceful: 0 });
    des.monster({ id: 'Angel', x: 63, y: 13, align: 'neutral', peaceful: 1 });
    //
    // Assorted nasties
    des.monster({ class: 'L', peaceful: 0 });
    des.monster({ class: 'L', peaceful: 0 });
    des.monster({ class: 'L', peaceful: 0 });
    des.monster({ class: 'V', peaceful: 0 });
    des.monster({ class: 'V', peaceful: 0 });
    des.monster({ class: 'V', peaceful: 0 });
    des.monster({ class: 'D', peaceful: 0 });
    des.monster({ class: 'D', peaceful: 0 });
    des.monster({ class: 'D', peaceful: 0 });
}

// The ported level scripts by file name, for nhl_loadlua().
export const endgame_lua_files = {
    'earth.lua': earth_lua,
    'air.lua': air_lua,
    'fire.lua': fire_lua,
    'water.lua': water_lua,
    'astral.lua': astral_lua,
};
