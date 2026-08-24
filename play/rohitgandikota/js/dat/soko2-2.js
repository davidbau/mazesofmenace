// dat/soko2-2.js — Sokoban level 2, variant b.
// C ref: dat/soko2-2.lua
//
// A fixed Sokoban puzzle: boulders, the pit/hole row with its rolling
// boulder traps, and the six random objects.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_region_full, lspo_stair, lspo_door,
         lspo_object, lspo_trap, lspo_non_diggable,
         lspo_non_passwall, lspo_exclusion } from '../sp_lev.js';

const SOKO22_MAP = `
  --------            
--|.|....|            
|........|----------  
|.-...-..|.|.......|  
|...-......|.......|  
|.-....|...|.......|  
|....-.--.-|.......|  
|..........|.......|  
|.--...|...|.......---
|....-.|---|.......+.|
--|....|------------.|
  |................+.|
  --------------------
`.replace(/^\n/, '').replace(/\n$/, '');

export async function soko22_level() {
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

    des.map(SOKO22_MAP);
    des.stair('down', 6, 11);
    des.stair('up', 15, 6);
    des.door('locked', 19, 9);
    des.door('locked', 19, 11);
    des.region(selection.area(0, 0, 21, 12), 'lit');
    des.non_diggable(selection.area(0, 0, 21, 12));
    des.non_passwall(selection.area(0, 0, 21, 12));
    /* Boulders */
    des.object('boulder', 4, 2);
    des.object('boulder', 4, 3);
    des.object('boulder', 5, 3);
    des.object('boulder', 7, 3);
    des.object('boulder', 8, 3);
    des.object('boulder', 2, 4);
    des.object('boulder', 3, 4);
    des.object('boulder', 5, 5);
    des.object('boulder', 6, 6);
    des.object('boulder', 9, 6);
    des.object('boulder', 3, 7);
    des.object('boulder', 4, 7);
    des.object('boulder', 7, 7);
    des.object('boulder', 6, 9);
    des.object('boulder', 5, 10);
    des.object('boulder', 5, 11);
    /* prevent monster generation over the (filled) holes */
    des.exclusion({ type: 'monster-generation', region: [6, 11, 18, 11] });
    /* Traps */
    des.trap('rolling boulder', 7, 11);
    des.trap('hole', 8, 11);
    des.trap('hole', 9, 11);
    des.trap('hole', 10, 11);
    des.trap('hole', 11, 11);
    des.trap('hole', 12, 11);
    des.trap('hole', 13, 11);
    des.trap('hole', 14, 11);
    des.trap('hole', 15, 11);
    des.trap('hole', 16, 11);
    des.trap('hole', 17, 11);
    des.trap('hole', 18, 11);
    /* Random objects */
    des.object({ class: '%' });
    des.object({ class: '%' });
    des.object({ class: '%' });
    des.object({ class: '%' });
    des.object({ class: '=' });
    des.object({ class: '/' });
}
