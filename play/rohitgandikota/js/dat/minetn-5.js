// dat/minetn-5.js — Minetown variant 5, "Grotto Town" (by Kelly Bailey).
// C ref: dat/minetn-5.lua
//
// A carved-cavern town on a fixed map: five percent() rolls rearrange
// passages, three fountains, four shops and a temple as filled regions,
// gnome homes behind locked doors, and the Town Watch.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_region_full, lspo_region_sel, lspo_stair, lspo_door,
         lspo_feature, lspo_altar, lspo_object, lspo_monster, lspo_terrain,
         l_selection_fillrect, l_selection_line,
         l_selection_setpoint } from '../sp_lev.js';
import { selection_new } from '../selvar.js';
import { rn2 } from '../rng.js';
import { game } from '../gstate.js';
import { monkfoodshop } from './nhlib.js';

/* dat/nhlib.lua:43 percent() — rn2(100) < n */
const percent = (n) => rn2(100) < n;

const MINETN5_MAP = `
-----         ---------                                                    
|...---  ------.......--    -------                       ---------------  
|.....----.........--..|    |.....|          -------      |.............|  
--..-....-.----------..|    |.....|          |.....|     --+---+--.----+-  
 --.--.....----     ----    |.....|  ------  --....----  |..-...--.-.+..|  
  ---.........----  -----   ---+---  |..+.|   ---..-..----..---+-..---..|  
    ----.-....|..----...--    |.|    |..|.|    ---+-.....-+--........--+-  
       -----..|....-.....---- |.|    |..|.------......--................|  
    ------ |..|.............---.--   ----.+..|-.......--..--------+--..--  
    |....| --......---...........-----  |.|..|-...{....---|.........|..--  
    |....|  |........-...-...........----.|..|--.......|  |.........|...|  
    ---+--------....-------...---......--.-------....---- -----------...|  
 ------.---...--...--..-..--...-..---...|.--..-...-....------- |.......--  
 |..|-.........-..---..-..---.....--....|........---...-|....| |.-------   
 |..+...............-+---+-----..--..........--....--...+....| |.|...S.    
-----.....{....----...............-...........--...-...-|....| |.|...|     
|..............-- --+--.---------.........--..-........------- |.--+-------
-+-----.........| |...|.|....|  --.......------...|....---------.....|....|
|...| --..------- |...|.+....|   ---...---    --..|...--......-...{..+..-+|
|...|  ----       ------|....|     -----       -----.....----........|..|.|
-----                   ------                     -------  ---------------
`.replace(/^\n/, '').replace(/\n$/, '');

export async function minetn5_level() {
    const des = {
        level_init: lspo_level_init,
        level_flags: lspo_level_flags,
        map: lspo_map_full,
        region: (sel, lit) => (typeof lit === 'string')
            ? lspo_region_sel(sel, lit) : lspo_region_full(sel),
        stair: (d, x, y) => lspo_stair(d, x, y),
        door: (state, x, y) => lspo_door({ state, x, y }),
        feature: (t, x, y) => lspo_feature(t, x, y),
        altar: (o) => lspo_altar(o),
        object: (a, x, y, o) => lspo_object(a, x, y, o),
        monster: (a, x, y, o) => lspo_monster(a, x, y, o),
        /* des.terrain({x,y}, ch) — the coord form goes through
           get_location_coord like the C (sp_lev.c:5008) */
        terrain: (sel, ch) => Array.isArray(sel)
            ? lspo_terrain(l_selection_setpoint(selection_new(),
                                                sel[0], sel[1]), ch)
            : lspo_terrain(sel, ch),
    };
    const selection = { area: l_selection_fillrect, line: l_selection_line };
    /* dat/nhlib.lua:24 align — shuffled by load_special; Lua is 1-indexed */
    const align = (n) => game.nhlib_align[n - 1];

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel');

    des.map(MINETN5_MAP);

    if (percent(75)) {
        if (percent(50)) {
            des.terrain(selection.line(25, 8, 25, 9), '|');
        } else {
            des.terrain(selection.line(16, 13, 17, 13), '-');
        }
    }
    if (percent(75)) {
        if (percent(50)) {
            des.terrain(selection.line(36, 10, 36, 11), '|');
        } else {
            des.terrain(selection.line(32, 15, 33, 15), '-');
        }
    }
    if (percent(50)) {
        des.terrain(selection.area(21, 4, 22, 5), '.');
        des.terrain(selection.line(14, 9, 14, 10), '|');
    }
    if (percent(50)) {
        des.terrain([46, 13], '|');
        des.terrain(selection.line(43, 5, 47, 5), '-');
        des.terrain(selection.line(42, 6, 46, 6), '.');
        des.terrain(selection.line(46, 7, 47, 7), '.');
    }
    if (percent(50)) {
        des.terrain(selection.area(69, 11, 71, 11), '-');
    }

    des.stair('up', 1, 1);
    des.stair('down', 46, 3);
    des.feature('fountain', 50, 9);
    des.feature('fountain', 10, 15);
    des.feature('fountain', 66, 18);

    des.region(selection.area(0, 0, 74, 20), 'unlit');
    des.region(selection.area(9, 13, 11, 17), 'lit');
    des.region(selection.area(8, 14, 12, 16), 'lit');
    des.region(selection.area(49, 7, 51, 11), 'lit');
    des.region(selection.area(48, 8, 52, 10), 'lit');
    des.region(selection.area(64, 17, 68, 19), 'lit');
    des.region(selection.area(37, 13, 39, 17), 'lit');
    des.region(selection.area(36, 14, 40, 17), 'lit');
    des.region(selection.area(59, 2, 72, 10), 'lit');

    des.monster({ id: 'watchman', peaceful: 1 });
    des.monster({ id: 'watchman', peaceful: 1 });
    des.monster({ id: 'watchman', peaceful: 1 });
    des.monster({ id: 'watchman', peaceful: 1 });
    des.monster({ id: 'watch captain', peaceful: 1 });
    des.monster('gnome');
    des.monster('gnome');
    des.monster('gnome');
    des.monster('gnome');
    des.monster('gnome');
    des.monster('gnome');
    des.monster('gnome lord');
    des.monster('gnome lord');
    des.monster('dwarf');
    des.monster('dwarf');
    des.monster('dwarf');

    /* The shops */
    des.region({ region: [25, 17, 28, 19], lit: 1, type: 'candle shop',
                 filled: 1 });
    des.door('closed', 24, 18);
    des.region({ region: [59, 9, 67, 10], lit: 1, type: 'shop', filled: 1 });
    des.door('closed', 66, 8);
    des.region({ region: [57, 13, 60, 15], lit: 1, type: 'tool shop',
                 filled: 1 });
    des.door('closed', 56, 14);
    des.region({ region: [5, 9, 8, 10], lit: 1, type: monkfoodshop(),
                 filled: 1 });
    des.door('closed', 7, 11);
    /* Gnome homes */
    des.door('closed', 4, 14);
    des.door('locked', 1, 17);
    des.monster('gnomish wizard', 2, 19);
    des.door('locked', 20, 16);
    des.monster('G', 20, 18);
    des.door('random', 21, 14);
    des.door('random', 25, 14);
    des.door('random', 42, 8);
    des.door('locked', 40, 5);
    des.monster('G', 38, 7);
    des.door('random', 59, 3);
    des.door('random', 58, 6);
    des.door('random', 63, 3);
    des.door('random', 63, 5);
    des.door('locked', 71, 3);
    des.door('locked', 71, 6);
    des.door('closed', 69, 4);
    des.door('closed', 67, 16);
    des.monster('gnomish wizard', 67, 14);
    des.object('=', 70, 14);
    des.door('locked', 69, 18);
    des.monster('gnome lord', 71, 19);
    des.door('locked', 73, 18);
    des.object('chest', 73, 19);
    des.door('locked', 50, 6);
    des.object('(', 50, 3);
    des.object({ id: 'statue', x: 38, y: 15, montype: 'gnome king',
                 historic: 1 });
    /* Temple */
    des.region({ region: [29, 2, 33, 4], lit: 1, type: 'temple', filled: 1 });
    des.door('closed', 31, 5);
    des.altar({ x: 31, y: 3, align: align(1), type: 'shrine' });
}
