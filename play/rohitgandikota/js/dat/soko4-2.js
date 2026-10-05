// dat/soko4-2.js — Sokoban level 4, variant b.
// C ref: dat/soko4-2.lua
//
// A fixed Sokoban puzzle: boulders, the pit/hole row with its rolling
// boulder traps, and the six random objects.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_region_full, lspo_stair, lspo_door,
         lspo_object, lspo_trap, lspo_non_diggable,
         lspo_non_passwall, lspo_exclusion,
         lspo_levregion } from '../sp_lev.js';

const SOKO42_MAP = `
-------- ------
|.|....|-|....|
|.|-..........|
|.||....|.....|
|.||....|.....|
|.|-----|.-----
|.|    |......|
|.-----|......|
|.............|
|..|---|......|
----   --------
`.replace(/^\n/, '').replace(/\n$/, '');

export async function soko42_level() {
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
        levregion: lspo_levregion,
    };
    const selection = { area: (x1, y1, x2, y2) => [x1, y1, x2, y2] };

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'noteleport', 'hardfloor', 'premapped',
                    'sokoban', 'solidify');

    des.map(SOKO42_MAP);
    des.levregion({ region: [3, 1, 3, 1], type: 'branch' });
    des.stair('up', 1, 1);
    des.region(selection.area(0, 0, 14, 10), 'lit');
    des.non_diggable(selection.area(0, 0, 14, 10));
    des.non_passwall(selection.area(0, 0, 14, 10));
    /* Boulders */
    des.object('boulder', 5, 2);
    des.object('boulder', 6, 2);
    des.object('boulder', 6, 3);
    des.object('boulder', 7, 3);
    des.object('boulder', 9, 5);
    des.object('boulder', 10, 3);
    des.object('boulder', 11, 2);
    des.object('boulder', 12, 3);
    des.object('boulder', 7, 8);
    des.object('boulder', 8, 8);
    des.object('boulder', 9, 8);
    des.object('boulder', 10, 8);
    /* prevent monster generation over the (filled) pits */
    des.exclusion({ type: 'monster-generation', region: [1, 1, 1, 9] });
    des.exclusion({ type: 'monster-generation', region: [1, 8, 7, 9] });
    /* Traps */
    des.trap('pit', 1, 2);
    des.trap('pit', 1, 3);
    des.trap('pit', 1, 4);
    des.trap('pit', 1, 5);
    des.trap('pit', 1, 6);
    des.trap('rolling boulder', 1, 7);
    des.trap('pit', 1, 8);
    des.trap('pit', 2, 8);
    des.trap('pit', 3, 8);
    des.trap('pit', 4, 8);
    des.trap('pit', 5, 8);
    des.trap('rolling boulder', 6, 8);
    /* A little help */
    des.object('scroll of earth', 1, 9);
    des.object('scroll of earth', 2, 9);
    /* Random objects */
    des.object({ class: '%' });
    des.object({ class: '%' });
    des.object({ class: '%' });
    des.object({ class: '%' });
    des.object({ class: '=' });
    des.object({ class: '/' });
}
