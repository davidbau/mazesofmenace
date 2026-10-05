// dat/soko2-1.js — Sokoban level 2, variant a.
// C ref: dat/soko2-1.lua
//
// A fixed Sokoban puzzle: boulders, the pit/hole row with its rolling
// boulder traps, and the six random objects.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_region_full, lspo_stair, lspo_door,
         lspo_object, lspo_trap, lspo_non_diggable,
         lspo_non_passwall, lspo_exclusion } from '../sp_lev.js';

const SOKO21_MAP = `
--------------------
|........|...|.....|
|.....-..|.-.|.....|
|..|.....|...|.....|
|-.|..-..|.-.|.....|
|...--.......|.....|
|...|...-...-|.....|
|...|..|...--|.....|
|-..|..|----------+|
|..................|
|...|..|------------
--------            
`.replace(/^\n/, '').replace(/\n$/, '');

export async function soko21_level() {
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

    des.map(SOKO21_MAP);
    des.stair('down', 6, 10);
    des.stair('up', 16, 4);
    des.door('locked', 18, 8);
    des.region(selection.area(0, 0, 19, 11), 'lit');
    des.non_diggable(selection.area(0, 0, 19, 11));
    des.non_passwall(selection.area(0, 0, 19, 11));
    /* Boulders */
    des.object('boulder', 2, 2);
    des.object('boulder', 3, 2);
    des.object('boulder', 5, 3);
    des.object('boulder', 7, 3);
    des.object('boulder', 7, 2);
    des.object('boulder', 8, 2);
    des.object('boulder', 10, 3);
    des.object('boulder', 11, 3);
    des.object('boulder', 2, 7);
    des.object('boulder', 2, 8);
    des.object('boulder', 3, 9);
    des.object('boulder', 5, 7);
    des.object('boulder', 6, 6);
    /* prevent monster generation over the (filled) holes */
    des.exclusion({ type: 'monster-generation', region: [7, 9, 18, 9] });
    /* Traps */
    des.trap('rolling boulder', 7, 9);
    des.trap('hole', 8, 9);
    des.trap('hole', 9, 9);
    des.trap('hole', 10, 9);
    des.trap('hole', 11, 9);
    des.trap('hole', 12, 9);
    des.trap('hole', 13, 9);
    des.trap('hole', 14, 9);
    des.trap('hole', 15, 9);
    des.trap('hole', 16, 9);
    des.trap('hole', 17, 9);
    /* Random objects */
    des.object({ class: '%' });
    des.object({ class: '%' });
    des.object({ class: '%' });
    des.object({ class: '%' });
    des.object({ class: '=' });
    des.object({ class: '/' });
}
