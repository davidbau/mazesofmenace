// dat/soko4-1.js — Sokoban level 4, variant a.
// C ref: dat/soko4-1.lua
//
// A fixed Sokoban puzzle: boulders, the pit/hole row with its rolling
// boulder traps, and the six random objects.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_region_full, lspo_stair, lspo_door,
         lspo_object, lspo_trap, lspo_non_diggable,
         lspo_non_passwall, lspo_exclusion,
         lspo_levregion } from '../sp_lev.js';

const SOKO41_MAP = `
------  ----- 
|....|  |...| 
|....----...| 
|...........| 
|..|-|.|-|..| 
---------|.---
|......|.....|
|..----|.....|
--.|   |.....|
 |.|---|.....|
 |...........|
 |..|---------
 ----         
`.replace(/^\n/, '').replace(/\n$/, '');

export async function soko41_level() {
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

    des.map(SOKO41_MAP);
    /* In case you haven't played the game Sokoban, you'll learn */
    /* quickly.  This branch isn't particularly difficult, just time */
    /* consuming.  Some players may wish to skip this branch. */
    /* The following actions are currently permitted without penalty: */
    /* Carrying or throwing a boulder already in inventory */
    /* (player or nonplayer). */
    /* Teleporting boulders. */
    /* Digging in the floor. */
    /* The following actions are permitted, but with a luck penalty: */
    /* Breaking boulders. */
    /* Stone-to-fleshing boulders. */
    /* Creating new boulders (e.g., with a scroll of earth). */
    /* Jumping. */
    /* Being pulled by a thrown iron ball. */
    /* Hurtling through the air from Newton's 3rd law. */
    /* Squeezing past boulders when naked or as a giant. */
    /* These actions are not permitted: */
    /* Moving diagonally between two boulders and/or walls. */
    /* Pushing a boulder diagonally. */
    /* Picking up boulders (player or nonplayer). */
    /* Digging or walking through walls. */
    /* Teleporting within levels or between levels of this branch. */
    /* Using cursed potions of gain level. */
    /* Escaping a pit/hole (e.g., by flying, levitation, or */
    /* passing a dexterity check). */
    /* Bones files are not permitted. */
    /* ## Bottom (first) level of Sokoban ### */
    des.levregion({ region: [6, 4, 6, 4], type: 'branch' });
    des.stair('up', 6, 6);
    des.region(selection.area(0, 0, 13, 12), 'lit');
    des.non_diggable(selection.area(0, 0, 13, 12));
    des.non_passwall(selection.area(0, 0, 13, 12));
    /* Boulders */
    des.object('boulder', 2, 2);
    des.object('boulder', 2, 3);
    des.object('boulder', 10, 2);
    des.object('boulder', 9, 3);
    des.object('boulder', 10, 4);
    des.object('boulder', 8, 7);
    des.object('boulder', 9, 8);
    des.object('boulder', 9, 9);
    des.object('boulder', 8, 10);
    des.object('boulder', 10, 10);
    /* prevent monster generation over the (filled) pits */
    des.exclusion({ type: 'monster-generation', region: [1, 6, 7, 11] });
    /* Traps */
    des.trap('pit', 4, 6);
    des.trap('pit', 2, 6);
    des.trap('pit', 2, 7);
    des.trap('pit', 2, 8);
    des.trap('rolling boulder', 2, 9);
    des.trap('pit', 2, 10);
    des.trap('pit', 3, 10);
    des.trap('pit', 4, 10);
    des.trap('pit', 5, 10);
    des.trap('pit', 6, 10);
    des.trap('rolling boulder', 7, 10);
    /* A little help */
    des.object('scroll of earth', 2, 11);
    des.object('scroll of earth', 3, 11);
    /* Random objects */
    des.object({ class: '%' });
    des.object({ class: '%' });
    des.object({ class: '%' });
    des.object({ class: '%' });
    des.object({ class: '=' });
    des.object({ class: '/' });
}
