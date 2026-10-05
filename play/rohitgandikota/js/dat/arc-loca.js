// dat/arc-loca.js — the Archeologist quest locate level.
// C ref: dat/Arc-loca.lua
//
// The Tomb of the Toltec Kings: three temples on the west (their altars
// taking the nhlib-shuffled law/neutral/chaos order), irregular burial
// chambers, four "X marks the spot." engravings, heavy trapping, and a
// snake and mummy population.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_region_full, lspo_stair, lspo_door, lspo_object,
         lspo_trap, lspo_monster, lspo_altar, lspo_non_diggable,
         lspo_engraving } from '../sp_lev.js';
import { game } from '../gstate.js';

const ARC_LOCA_MAP = `............................................................................
............................................................................
............................................................................
........................-------------------------------.....................
........................|....|.S......................|.....................
........................|....|.|.|+------------------.|.....................
........................|....|.|.|.|.........|......|.|.....................
........................|....|.|.|.|.........|......|.|.....................
........................|---+-.|.|.|..---....+......|.|.....................
........................|....|.|.|.---|.|....|......|.|.....................
........................|....S.|.|.+..S.|--S-----S--|.|.....................
........................|....|.|.|.---|.|....|......+.|.....................
........................|---+-.|.|.|..---....|.------.|.....................
........................|....|.|.|.|.........|.|....+.|.....................
........................|....|.|.|.|.........|+|....|-|.....................
........................|....|.|.|------------+------.S.....................
........................|....|.S......................|.....................
........................-------------------------------.....................
............................................................................
............................................................................`;

export async function arcloca_level() {
    const des = {
        level_init: lspo_level_init,
        level_flags: lspo_level_flags,
        map: lspo_map_full,
        region: (sel, lit) => lspo_region_full(
            Array.isArray(sel) ? { area: sel, lit: lit === 'lit' } : sel),
        door: (state, x, y) => lspo_door({ state, x, y }),
        stair: (d, x, y) => lspo_stair(d, x, y),
        altar: (o) => lspo_altar(o),
        non_diggable: (s) => lspo_non_diggable(s[0], s[1], s[2], s[3]),
        object: (a, x, y, o) => lspo_object(a, x, y, o),
        engraving: (o) => lspo_engraving(o),
        trap: (t, x, y) => lspo_trap(t, x, y),
        monster: (a, x, y, o) => lspo_monster(a, x, y, o),
    };
    const selection = { area: (x1, y1, x2, y2) => [x1, y1, x2, y2] };
    /* dat/nhlib.lua:24 align — shuffled by load_special; Lua is 1-indexed */
    const align = (n) => game.nhlib_align[n - 1];

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'hardfloor');

    des.map(ARC_LOCA_MAP);
    /* Dungeon Description */
    des.region(selection.area(0, 0, 75, 19), 'lit');
    des.region({ region: [25, 4, 28, 7], lit: 1, type: 'temple', filled: 2 });
    des.region({ region: [25, 9, 28, 11], lit: 0, type: 'temple', filled: 2 });
    des.region({ region: [25, 13, 28, 16], lit: 1, type: 'temple', filled: 2 });
    des.region(selection.area(30, 4, 30, 16), 'lit');
    des.region(selection.area(32, 4, 32, 16), 'unlit');
    des.region({ region: [33, 4, 53, 4], lit: 0, type: 'ordinary',
                 irregular: 1 });
    des.region(selection.area(36, 10, 37, 10), 'unlit');
    des.region(selection.area(39, 9, 39, 11), 'unlit');
    des.region({ region: [36, 6, 42, 8], lit: 0, type: 'ordinary',
                 irregular: 1 });
    des.region({ region: [36, 12, 42, 14], lit: 0, type: 'ordinary',
                 irregular: 1 });
    des.region(selection.area(46, 6, 51, 9), 'unlit');
    des.region({ region: [46, 11, 49, 11], lit: 0, type: 'ordinary',
                 irregular: 1 });
    des.region(selection.area(48, 13, 51, 14), 'unlit');
    /* Doors */
    des.door('closed', 31, 4);
    des.door('closed', 28, 8);
    des.door('locked', 29, 10);
    des.door('closed', 28, 12);
    des.door('closed', 31, 16);
    des.door('locked', 34, 5);
    des.door('locked', 35, 10);
    des.door('locked', 38, 10);
    des.door('closed', 43, 10);
    des.door('closed', 45, 8);
    des.door('locked', 46, 14);
    des.door('locked', 46, 15);
    des.door('locked', 49, 10);
    des.door('locked', 52, 11);
    des.door('closed', 52, 13);
    des.door('closed', 54, 15);
    /* Stairs */
    des.stair('up', 3, 17);
    des.stair('down', 39, 10);
    /* Altars - three types.  All are unattended. */
    des.altar({ x: 26, y: 5, align: align(1), type: 'altar' });
    des.altar({ x: 26, y: 10, align: align(2), type: 'altar' });
    des.altar({ x: 26, y: 15, align: align(3), type: 'altar' });
    /* Non diggable walls */
    des.non_diggable(selection.area(0, 0, 75, 19));
    /* Objects */
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
    /* Treasure? */
    des.engraving({ type: 'engrave', text: 'X marks the spot.' });
    des.engraving({ type: 'engrave', text: 'X marks the spot.' });
    des.engraving({ type: 'engrave', text: 'X marks the spot.' });
    des.engraving({ type: 'engrave', text: 'X marks the spot.' });
    /* Random traps */
    des.trap('spiked pit', 24, 2);
    des.trap('spiked pit', 37, 0);
    des.trap('spiked pit', 23, 5);
    des.trap('spiked pit', 26, 19);
    des.trap('spiked pit', 55, 10);
    des.trap('spiked pit', 55, 8);
    des.trap('pit', 51, 1);
    des.trap('pit', 23, 18);
    des.trap('pit', 31, 18);
    des.trap('pit', 48, 19);
    des.trap('pit', 55, 15);
    des.trap('magic', 60, 4);
    des.trap('statue', 72, 7);
    des.trap('statue');
    des.trap('statue');
    des.trap('anti magic', 64, 12);
    des.trap('sleep gas');
    des.trap('sleep gas');
    des.trap('dart');
    des.trap('dart');
    des.trap('dart');
    des.trap('rolling boulder', 32, 10);
    des.trap('rolling boulder', 40, 16);
    /* Random monsters. */
    des.monster('S');
    des.monster('S');
    des.monster('S');
    des.monster('S');
    des.monster('S');
    des.monster('S');
    des.monster('S');
    des.monster('S');
    des.monster('S');
    des.monster('S');
    des.monster('S');
    des.monster('S');
    des.monster('S');
    des.monster('S');
    des.monster('S');
    des.monster('S');
    des.monster('S');
    des.monster('S');
    des.monster('M');
    des.monster('human mummy');
    des.monster('human mummy');
    des.monster('human mummy');
    des.monster('human mummy');
    des.monster('human mummy');
    des.monster('human mummy');
    des.monster('human mummy');
    des.monster('M');
}
