// dat/minetn-6.js — Minetown variant 6, "Bustling Town" (by Kelly Bailey).
// C ref: dat/minetn-6.lua
//
// A mines-filled cavern with a full-height town map stamped top-center,
// four shops and a temple as filled regions, a crowd of peaceful townsfolk,
// and the inaccessibles flag to patch any cut-off pockets.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_region_full, lspo_door, lspo_altar, lspo_monster,
         lspo_levregion } from '../sp_lev.js';
import { game } from '../gstate.js';
import { monkfoodshop } from './nhlib.js';

const MINETN6_MAP = `
x--------xxxxxxxxxxx-------------------x
x------xxxxxxxxxxxxxx-----------------xx
.-----................----------------.x
.|...|................|...|..|...|...|..
.|...+..--+--.........|...|..|...|...|..
.|...|..|...|..-----..|...|..|-+---+--..
.-----..|...|--|...|..--+---+-.........x
........|...|..|...+.............-----.x
........-----..|...|......--+-...|...|..
x----...|...|+------..{...|..|...+...|..
x|..+...|...|.............|..|...|...|..
.|..|...|...|-+-.....---+-------------.x
.----...--+--..|..-+-|..................
...|........|..|..|..|----....--------.x
...|..T.....----..|..|...+....|......|..
...|-....{........|..|...|....+......|x.
...--..-....T.....--------....|......|x.
.......--.....................----------
.xxxx-----xxxxxxxxxxxxxxxxxx------------
xxxx-------xxxxxxxxxxxxxxx--------------
`.replace(/^\n/, '').replace(/\n$/, '');

export async function minetn6_level() {
    const des = {
        level_init: lspo_level_init,
        level_flags: lspo_level_flags,
        map: lspo_map_full,
        region: (sel, lit) => lspo_region_full(
            Array.isArray(sel) ? { area: sel, lit: lit === 'lit' } : sel),
        door: (state, x, y) => lspo_door({ state, x, y }),
        altar: (o) => lspo_altar(o),
        monster: (a, x, y, o) => lspo_monster(a, x, y, o),
        levregion: lspo_levregion,
    };
    const selection = { area: (x1, y1, x2, y2) => [x1, y1, x2, y2] };
    /* dat/nhlib.lua:24 align — shuffled by load_special; Lua is 1-indexed */
    const align = (n) => game.nhlib_align[n - 1];

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'inaccessibles');

    des.level_init({ style: 'mines', fg: '.', bg: '-', smoothed: true,
                     joined: true, lit: 1, walled: true });

    /* Map extends the full height of the playable area in order to prevent
       any of the cavern fill from getting cut off by walls of the town
       buildings and creating inaccessible spaces. */
    des.map({ halign: 'center', valign: 'top', map: MINETN6_MAP });

    des.region(selection.area(0, 0, 39, 19), 'lit');

    /* stairs can generate 1 column left or right inside the map, in case the
       randomly generated mines layout doesn't extend outside the map */
    des.levregion({ type: 'stair-up', region: [1, 3, 21, 19],
                    region_islev: 1, exclude: [1, 0, 39, 18] });
    des.levregion({ type: 'stair-down', region: [60, 3, 75, 19],
                    region_islev: 1, exclude: [0, 0, 38, 18] });

    des.region(selection.area(13, 7, 14, 8), 'unlit');
    des.region({ region: [9, 9, 11, 11], lit: 1, type: 'candle shop',
                 filled: 1 });
    des.region({ region: [16, 6, 18, 8], lit: 1, type: 'tool shop',
                 filled: 1 });
    des.region({ region: [23, 3, 25, 5], lit: 1, type: 'shop', filled: 1 });
    des.region({ region: [22, 14, 24, 15], lit: 1, type: monkfoodshop(),
                 filled: 1 });
    des.region({ region: [31, 14, 36, 16], lit: 1, type: 'temple',
                 filled: 1 });
    des.altar({ x: 35, y: 15, align: align(1), type: 'shrine' });

    des.door('closed', 5, 4);
    des.door('locked', 4, 10);
    des.door('closed', 10, 4);
    des.door('closed', 10, 12);
    des.door('locked', 13, 9);
    des.door('locked', 14, 11);
    des.door('closed', 19, 7);
    des.door('closed', 19, 12);
    des.door('closed', 24, 6);
    des.door('closed', 24, 11);
    des.door('closed', 25, 14);
    des.door('closed', 28, 6);
    des.door('locked', 28, 8);
    des.door('closed', 30, 15);
    des.door('closed', 31, 5);
    des.door('closed', 35, 5);
    des.door('closed', 33, 9);

    des.monster('gnome');
    des.monster('gnome');
    des.monster('gnome');
    des.monster('gnome');
    des.monster('gnome');
    des.monster('gnome');
    des.monster('gnome', 14, 8);
    des.monster('gnome lord', 14, 7);
    des.monster('gnome', 27, 10);
    des.monster('gnome lord');
    des.monster('gnome lord');
    des.monster('dwarf');
    des.monster('dwarf');
    des.monster('dwarf');
    des.monster({ id: 'dwarf', peaceful: 1 });
    des.monster({ id: 'dwarf', peaceful: 1 });
    des.monster({ id: 'gnome', peaceful: 1 });
    des.monster({ id: 'gnome', peaceful: 1 });
    des.monster({ id: 'hobbit', peaceful: 1 });
    des.monster({ id: 'goblin', peaceful: 1 });
    des.monster({ id: 'kobold', peaceful: 1 });
    des.monster({ id: 'dog', peaceful: 1 });
    des.monster({ id: 'watchman', peaceful: 1 });
    des.monster({ id: 'watchman', peaceful: 1 });
    des.monster({ id: 'watchman', peaceful: 1 });
    des.monster({ id: 'watch captain', peaceful: 1 });
    des.monster({ id: 'watch captain', peaceful: 1 });
}
