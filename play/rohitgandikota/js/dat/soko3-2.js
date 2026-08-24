// dat/soko3-2.js — Sokoban level 3, variant b.
// C ref: dat/soko3-2.lua
//
// A fixed Sokoban puzzle: boulders, the pit/hole row with its rolling
// boulder traps, and the six random objects.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_region_full, lspo_stair, lspo_door,
         lspo_object, lspo_trap, lspo_non_diggable,
         lspo_non_passwall, lspo_exclusion } from '../sp_lev.js';

const SOKO32_MAP = `
 ----          -----------
-|..|-------   |.........|
|..........|   |.........|
|..-----.-.|   |.........|
|..|...|...|   |.........|
|.........-|   |.........|
|.......|..|   |.........|
|.----..--.|   |.........|
|........|.--  |.........|
|.---.-.....------------+|
|...|...-................|
|.........----------------
----|..|..|               
    -------               
`.replace(/^\n/, '').replace(/\n$/, '');

export async function soko32_level() {
    const des = {
        level_init: lspo_level_init,
        level_flags: lspo_level_flags,
        map: lspo_map_full,
        region: (sel, lit) => lspo_region_full(
            Array.isArray(sel) ? { area: sel, lit: lit === 'lit' } : sel),
        stair: (d, x, y) => lspo_stair(d, x, y),
        door: (state, x, y) => lspo_door({ state, x, y }),
        object: (a, x, y, o) => lspo_object(a, x, y, o),
        trap: (t, x, y) => lspo_trap(t, x, y),
        non_diggable: (s) => lspo_non_diggable(s[0], s[1], s[2], s[3]),
        non_passwall: (s) => lspo_non_passwall(s[0], s[1], s[2], s[3]),
        exclusion: lspo_exclusion,
    };
    const selection = { area: (x1, y1, x2, y2) => [x1, y1, x2, y2] };

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'noteleport', 'premapped', 'sokoban',
                    'solidify');

    des.map(SOKO32_MAP);
    des.stair('down', 3, 1);
    des.stair('up', 20, 4);
    des.door('locked', 24, 9);
    des.region(selection.area(0, 0, 25, 13), 'lit');
    des.non_diggable(selection.area(0, 0, 25, 13));
    des.non_passwall(selection.area(0, 0, 25, 13));
    /* Boulders */
    des.object('boulder', 2, 3);
    des.object('boulder', 8, 3);
    des.object('boulder', 9, 4);
    des.object('boulder', 2, 5);
    des.object('boulder', 4, 5);
    des.object('boulder', 9, 5);
    des.object('boulder', 2, 6);
    des.object('boulder', 5, 6);
    des.object('boulder', 6, 7);
    des.object('boulder', 3, 8);
    des.object('boulder', 7, 8);
    des.object('boulder', 5, 9);
    des.object('boulder', 10, 9);
    des.object('boulder', 7, 10);
    des.object('boulder', 10, 10);
    des.object('boulder', 3, 11);
    /* prevent monster generation over the (filled) holes */
    des.exclusion({ type: 'monster-generation', region: [11, 10, 24, 10] });
    /* Traps */
    des.trap('rolling boulder', 11, 10);
    des.trap('hole', 12, 10);
    des.trap('hole', 13, 10);
    des.trap('hole', 14, 10);
    des.trap('hole', 15, 10);
    des.trap('hole', 16, 10);
    des.trap('hole', 17, 10);
    des.trap('hole', 18, 10);
    des.trap('hole', 19, 10);
    des.trap('hole', 20, 10);
    des.trap('hole', 21, 10);
    des.trap('hole', 22, 10);
    des.trap('hole', 23, 10);
    /* Random objects */
    des.object({ class: '%' });
    des.object({ class: '%' });
    des.object({ class: '%' });
    des.object({ class: '%' });
    des.object({ class: '=' });
    des.object({ class: '/' });
}
