// questlev_kni_lua.js — port of the Knight quest level scripts:
// dat/Kni-strt.lua (home level), dat/Kni-loca.lua (locate level),
// dat/Kni-fila.lua and dat/Kni-filb.lua (filler levels) and dat/Kni-goal.lua
// (goal level).
// makemaz() loads them through load_special() (sp_lev.c).
// C ref: dat/Kni-strt.lua, dat/Kni-loca.lua, dat/Kni-fila.lua, dat/Kni-filb.lua, dat/Kni-goal.lua
//
// Translated from the .lua files by a script (the des.map() maps are
// verbatim), then reviewed. Lua arrays are 1-based: t[i] is t[i - 1] here.
// Lua-side rolls (math.random, nh.rn2; percent, shuffle and d roll inside
// nhlib_lua.js) go through withRngCaller() with the tag the C recorder
// writes; the selection operators |, &, + and - are lua_bor(), lua_band(),
// lua_add() and lua_sub() (nhlua.js).

import { withRngCaller } from './rng.js';

const MAP_Kni_strt = [
    '..................................................',
    '.-----......................................-----.',
    '.|...|......................................|...|.',
    '.--|+-------------------++-------------------+|--.',
    '...|...................+..+...................|...',
    '...|.|-----------------|++|-----------------|.|...',
    '...|.|.................|..|.........|.......|.|...',
    '...|.|...\\.............+..+.........|.......|.|...',
    '...|.|.................+..+.........+.......|.|...',
    '...|.|.................|..|.........|.......|.|...',
    '...|.|--------------------------------------|.|...',
    '...|..........................................|...',
    '.--|+----------------------------------------+|--.',
    '.|...|......................................|...|.',
    '.-----......................................-----.',
    '..................................................',
].join('\n') + '\n';

// C ref: dat/Kni-strt.lua
//	The "start" level for the quest.
//
//	Here you meet your (besieged) class leader, King Arthur
//	and receive your quest assignment.
//
function Kni_strt_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection, nh = G.nh;

    des.level_init({ style: 'solidfill', fg: '.' });

    des.level_flags('mazelevel', 'noteleport', 'hardfloor');
    // This is a kludge to init the level as a lit field.
    des.level_init({ style: 'mines', fg: '.', bg: '.', smoothed: false, joined: false, lit: 1, walled: false });

    des.map(MAP_Kni_strt);
    // Dungeon Description
    des.region(selection.area(0, 0, 49, 15), 'lit');
    des.region(selection.area(4, 4, 45, 11), 'unlit');
    des.region({ region: [6, 6, 22, 9], lit: 1, type: 'throne', filled: 2 });
    des.region(selection.area(27, 6, 43, 9), 'lit');
    // Portal arrival point
    des.levregion({ region: [20, 14, 20, 14], type: 'branch' });
    // Stairs
    des.stair('down', 40, 7);
    // Doors
    // Outside Doors
    des.door('locked', 24, 3);
    des.door('locked', 25, 3);
    // Inside Doors
    des.door('closed', 23, 4);
    des.door('closed', 26, 4);
    des.door('locked', 24, 5);
    des.door('locked', 25, 5);
    des.door('closed', 23, 7);
    des.door('closed', 26, 7);
    des.door('closed', 23, 8);
    des.door('closed', 26, 8);
    des.door('closed', 36, 8);
    // Watchroom Doors
    des.door('closed', 4, 3);
    des.door('closed', 45, 3);
    des.door('closed', 4, 12);
    des.door('closed', 45, 12);
    // King Arthur
    des.monster({ id: 'King Arthur', coord: [9, 7], inventory: function() {
            des.object({ id: 'long sword', spe: 4, buc: 'blessed', name: 'Excalibur' });
            des.object({ id: 'plate mail', spe: 4 });
        } });
    // The treasure of King Arthur
    des.object('chest', 9, 7);
    // knight guards for the watchrooms
    des.monster({ id: 'knight', x: 4, y: 2, peaceful: 1 });
    des.monster({ id: 'knight', x: 4, y: 13, peaceful: 1 });
    des.monster({ id: 'knight', x: 45, y: 2, peaceful: 1 });
    des.monster({ id: 'knight', x: 45, y: 13, peaceful: 1 });
    // page guards for the audience chamber
    des.monster('page', 16, 6);
    des.monster('page', 18, 6);
    des.monster('page', 20, 6);
    des.monster('page', 16, 9);
    des.monster('page', 18, 9);
    des.monster('page', 20, 9);
    // Non diggable walls
    des.non_diggable(selection.area(0, 0, 49, 15));
    // Random traps
    des.trap('sleep gas', 24, 4);
    des.trap('sleep gas', 25, 4);
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    // Monsters on siege duty.
    des.monster({ id: 'quasit', x: 14, y: 0, peaceful: 0 });
    des.monster({ id: 'quasit', x: 16, y: 0, peaceful: 0 });
    des.monster({ id: 'quasit', x: 18, y: 0, peaceful: 0 });
    des.monster({ id: 'quasit', x: 20, y: 0, peaceful: 0 });
    des.monster({ id: 'quasit', x: 22, y: 0, peaceful: 0 });
    des.monster({ id: 'quasit', x: 24, y: 0, peaceful: 0 });
    des.monster({ id: 'quasit', x: 26, y: 0, peaceful: 0 });
    des.monster({ id: 'quasit', x: 28, y: 0, peaceful: 0 });
    des.monster({ id: 'quasit', x: 30, y: 0, peaceful: 0 });
    des.monster({ id: 'quasit', x: 32, y: 0, peaceful: 0 });
    des.monster({ id: 'quasit', x: 34, y: 0, peaceful: 0 });
    des.monster({ id: 'quasit', x: 36, y: 0, peaceful: 0 });

    // Some warhorses
    for (let i = 1, i_last = 2 + withRngCaller('nh.rn2(Kni-strt.lua:107)', () => nh.rn2(3)); i <= i_last; i++) {
        des.monster({ id: 'warhorse', peaceful: 1, inventory: function() {
                if (G.percent(50)) {
                    des.object('saddle');
                }
            } });
    }
}

const MAP_Kni_loca = [
    'xxxxxxxxx......xxxx...........xxxxxxxxxx',
    'xxxxxxx.........xxx.............xxxxxxxx',
    'xxxx..............................xxxxxx',
    'xx.................................xxxxx',
    '....................................xxxx',
    '.......................................x',
    '........................................',
    'xx...................................xxx',
    'xxxx..............................xxxxxx',
    'xxxxxx..........................xxxxxxxx',
    'xxxxxxxx.........xx..........xxxxxxxxxxx',
    'xxxxxxxxx.......xxxxxx.....xxxxxxxxxxxxx',
].join('\n') + '\n';

// C ref: dat/Kni-loca.lua
function Kni_loca_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'hardfloor');

    des.level_init({ style: 'mines', fg: '.', bg: 'P', smoothed: false, joined: true, lit: 1, walled: false });

    des.map(MAP_Kni_loca);
    // Dungeon Description
    // The Isle of Glass is a Tor rising out of the swamps surrounding it.
    des.region(selection.area(0, 0, 39, 11), 'lit');
    // The top area of the Tor is a holy site.
    des.region({ region: [9, 2, 27, 9], lit: 1, type: 'temple', filled: 2 });
    // Stairs
    des.stair('up', 38, 0);
    des.stair('down', 18, 5);
    // The altar atop the Tor and its attendant (creating altar makes the priest).
    des.altar({ x: 17, y: 5, align: 'neutral', type: 'shrine' });
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
    // All of the avenues are guarded by magic except for the East.
    // South
    des.trap('magic', 8, 11);
    des.trap('magic', 9, 11);
    des.trap('magic', 10, 11);
    des.trap('magic', 11, 11);
    des.trap('magic', 12, 11);
    des.trap('magic', 13, 11);
    des.trap('magic', 14, 11);
    des.trap('magic', 15, 11);
    des.trap('magic', 16, 11);
    des.trap('magic', 20, 11);
    des.trap('magic', 21, 11);
    des.trap('magic', 22, 11);
    des.trap('magic', 23, 11);
    des.trap('magic', 24, 11);
    des.trap('magic', 25, 11);
    des.trap('magic', 26, 11);
    des.trap('magic', 27, 11);
    des.trap('magic', 28, 11);
    // West
    des.trap('magic', 0, 3);
    des.trap('magic', 0, 4);
    des.trap('magic', 0, 5);
    des.trap('magic', 0, 6);
    // North
    des.trap('magic', 6, 0);
    des.trap('magic', 7, 0);
    des.trap('magic', 8, 0);
    des.trap('magic', 9, 0);
    des.trap('magic', 10, 0);
    des.trap('magic', 11, 0);
    des.trap('magic', 12, 0);
    des.trap('magic', 13, 0);
    des.trap('magic', 14, 0);
    des.trap('magic', 19, 0);
    des.trap('magic', 20, 0);
    des.trap('magic', 21, 0);
    des.trap('magic', 22, 0);
    des.trap('magic', 23, 0);
    des.trap('magic', 24, 0);
    des.trap('magic', 25, 0);
    des.trap('magic', 26, 0);
    des.trap('magic', 27, 0);
    des.trap('magic', 28, 0);
    des.trap('magic', 29, 0);
    des.trap('magic', 30, 0);
    des.trap('magic', 31, 0);
    des.trap('magic', 32, 0);
    // Even so, there are magic "sinkholes" around.
    des.trap('anti magic');
    des.trap('anti magic');
    des.trap('anti magic');
    des.trap('anti magic');
    des.trap('anti magic');
    des.trap('anti magic');
    des.trap('anti magic');
    // Random monsters.
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ class: 'i', peaceful: 0 });
    des.monster({ class: 'j', peaceful: 0 });
    des.monster({ id: 'ochre jelly', peaceful: 0 });
    des.monster({ id: 'ochre jelly', peaceful: 0 });
    des.monster({ id: 'ochre jelly', peaceful: 0 });
    des.monster({ id: 'ochre jelly', peaceful: 0 });
    des.monster({ id: 'ochre jelly', peaceful: 0 });
    des.monster({ id: 'ochre jelly', peaceful: 0 });
    des.monster({ id: 'ochre jelly', peaceful: 0 });
    des.monster({ class: 'j', peaceful: 0 });
}

// C ref: dat/Kni-fila.lua
function Kni_fila_lua(L) {
    const G = L.globals, des = G.des;

    des.level_init({ style: 'solidfill', fg: '.' });

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
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ class: 'i', peaceful: 0 });
    des.monster({ id: 'ochre jelly', peaceful: 0 });
    //
    des.trap();
    des.trap();
    des.trap();
    des.trap();
}

// C ref: dat/Kni-filb.lua
function Kni_filb_lua(L) {
    const G = L.globals, des = G.des;

    des.level_init({ style: 'solidfill', fg: '.' });

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
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ class: 'i', peaceful: 0 });
    des.monster({ id: 'ochre jelly', peaceful: 0 });
    des.monster({ id: 'ochre jelly', peaceful: 0 });
    des.monster({ id: 'ochre jelly', peaceful: 0 });
    //
    des.trap();
    des.trap();
    des.trap();
    des.trap();
}

const MAP_Kni_goal = [
    '....PPPP..PPP..                                                             ',
    '.PPPPP...PP..     ..........     .................................          ',
    '..PPPPP...P..    ...........    ...................................         ',
    '..PPP.......   ...........    ......................................        ',
    '...PPP.......    .........     ...............   .....................      ',
    '...........    ............    ............     ......................      ',
    '............   .............      .......     .....................         ',
    '..............................            .........................         ',
    '...............................   ..................................        ',
    '.............................    ....................................       ',
    '.........    ......................................................         ',
    '.....PP...    .....................................................         ',
    '.....PPP....    ....................................................        ',
    '......PPP....   ..............   ....................................       ',
    '.......PPP....  .............    .....................................      ',
    '........PP...    ............    ......................................     ',
    '...PPP........     ..........     ..................................        ',
    '..PPPPP........     ..........     ..............................           ',
    '....PPPPP......       .........     ..........................              ',
    '.......PPPP...                                                              ',
].join('\n') + '\n';

// C ref: dat/Kni-goal.lua
function Kni_goal_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel');

    des.map(MAP_Kni_goal);
    // Dungeon Description
    des.region(selection.area(0, 0, 14, 19), 'lit');
    des.region(selection.area(15, 0, 75, 19), 'unlit');
    // Stairs
    des.stair('up', 3, 8);
    // Non diggable walls
    des.non_diggable(selection.area(0, 0, 75, 19));
    // Objects
    des.object({ id: 'mirror', x: 50, y: 6, buc: 'blessed', spe: 0, name: 'The Magic Mirror of Merlin' });
    des.object({ coord: [33, 1] });
    des.object({ coord: [33, 2] });
    des.object({ coord: [33, 3] });
    des.object({ coord: [33, 4] });
    des.object({ coord: [33, 5] });
    des.object({ coord: [34, 1] });
    des.object({ coord: [34, 2] });
    des.object({ coord: [34, 3] });
    des.object({ coord: [34, 4] });
    des.object({ coord: [34, 5] });
    des.object({ coord: [35, 1] });
    des.object({ coord: [35, 2] });
    des.object({ coord: [35, 3] });
    des.object({ coord: [35, 4] });
    des.object({ coord: [35, 5] });
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    // Random traps
    des.trap('spiked pit', 13, 7);
    des.trap('spiked pit', 12, 8);
    des.trap('spiked pit', 12, 9);
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    // Random monsters.
    des.monster({ id: 'Ixoth', x: 50, y: 6, peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ class: 'i', peaceful: 0 });
    des.monster({ class: 'i', peaceful: 0 });
    des.monster({ id: 'ochre jelly', peaceful: 0 });
    des.monster({ id: 'ochre jelly', peaceful: 0 });
    des.monster({ id: 'ochre jelly', peaceful: 0 });
    des.monster({ id: 'ochre jelly', peaceful: 0 });
    des.monster({ id: 'ochre jelly', peaceful: 0 });
    des.monster({ id: 'ochre jelly', peaceful: 0 });
    des.monster({ id: 'ochre jelly', peaceful: 0 });
    des.monster({ id: 'ochre jelly', peaceful: 0 });
    des.monster({ class: 'j', peaceful: 0 });
}

// The ported level scripts by file name, for nhl_loadlua().
export const questlev_kni_lua_files = {
    'Kni-strt.lua': Kni_strt_lua,
    'Kni-loca.lua': Kni_loca_lua,
    'Kni-fila.lua': Kni_fila_lua,
    'Kni-filb.lua': Kni_filb_lua,
    'Kni-goal.lua': Kni_goal_lua,
};
