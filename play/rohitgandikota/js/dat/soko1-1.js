// dat/soko1-1.js — Sokoban level 1 (top), variant a.
// C ref: dat/soko1-1.lua
//
// The Sokoban prize level: boulders, the hole row, boulder-mimics, the zoo
// reward chamber, and the bag-of-holding/amulet prize on one of three
// shuffled spots behind Elbereth and scare monster.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_region_full, lspo_stair, lspo_door,
         lspo_object, lspo_trap, lspo_monster, lspo_non_diggable,
         lspo_non_passwall, lspo_exclusion, lspo_engraving,
         l_selection_setpoint } from '../sp_lev.js';
import { selection_new, selection_rndcoord } from '../selvar.js';
import { rn2 } from '../rng.js';

/* dat/nhlib.lua:43 percent() — rn2(100) < n */
const percent = (n) => rn2(100) < n;

const SOKO11_MAP = `
--------------------------
|........................|
|.......|---------------.|
-------.------         |.|
 |...........|         |.|
 |...........|         |.|
--------.-----         |.|
|............|         |.|
|............|         |.|
-----.--------   ------|.|
 |..........|  --|.....|.|
 |..........|  |.+.....|.|
 |.........|-  |-|.....|.|
-------.----   |.+.....+.|
|........|     |-|.....|--
|........|     |.+.....|  
|...|-----     --|.....|  
-----            -------  
`.replace(/^\n/, '').replace(/\n$/, '');

export async function soko11_level() {
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
        monster: (a, x, y, o) => lspo_monster(a, x, y, o),
        non_diggable: (s) => lspo_non_diggable(s[0], s[1], s[2], s[3]),
        non_passwall: (s) => lspo_non_passwall(s[0], s[1], s[2], s[3]),
        exclusion: lspo_exclusion,
        engraving: (o) => lspo_engraving(o),
    };
    const selection = { area: (x1, y1, x2, y2) => [x1, y1, x2, y2] };

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'noteleport', 'premapped', 'sokoban',
                    'solidify');
    des.map(SOKO11_MAP);

    const place = selection_new();
    l_selection_setpoint(place, 16, 11);
    l_selection_setpoint(place, 16, 13);
    l_selection_setpoint(place, 16, 15);

    des.stair('down', 1, 1);
    des.region(selection.area(0, 0, 25, 17), 'lit');
    des.non_diggable(selection.area(0, 0, 25, 17));
    des.non_passwall(selection.area(0, 0, 25, 17));

    /* Boulders */
    des.object('boulder', 3, 5);
    des.object('boulder', 5, 5);
    des.object('boulder', 7, 5);
    des.object('boulder', 9, 5);
    des.object('boulder', 11, 5);
    /* */
    des.object('boulder', 4, 7);
    des.object('boulder', 4, 8);
    des.object('boulder', 6, 7);
    des.object('boulder', 9, 7);
    des.object('boulder', 11, 7);
    /* */
    des.object('boulder', 3, 12);
    des.object('boulder', 4, 10);
    des.object('boulder', 5, 12);
    des.object('boulder', 6, 10);
    des.object('boulder', 7, 11);
    des.object('boulder', 8, 10);
    des.object('boulder', 9, 12);
    /* */
    des.object('boulder', 3, 14);

    /* prevent monster generation over the (filled) holes */
    des.exclusion({ type: 'monster-generation', region: [7, 1, 23, 1] });
    /* Traps */
    des.trap('hole', 7, 1);
    des.trap('rolling boulder', 8, 1);
    des.trap('hole', 9, 1);
    des.trap('hole', 10, 1);
    des.trap('hole', 11, 1);
    des.trap('hole', 12, 1);
    des.trap('hole', 13, 1);
    des.trap('hole', 14, 1);
    des.trap('hole', 15, 1);
    des.trap('hole', 16, 1);
    des.trap('hole', 17, 1);
    des.trap('hole', 18, 1);
    des.trap('hole', 19, 1);
    des.trap('hole', 20, 1);
    des.trap('hole', 21, 1);
    des.trap('hole', 22, 1);
    des.trap('hole', 23, 1);

    des.monster({ id: 'giant mimic', appear_as: 'obj:boulder' });
    des.monster({ id: 'giant mimic', appear_as: 'obj:boulder' });

    /* Random objects */
    des.object({ class: '%' });
    des.object({ class: '%' });
    des.object({ class: '%' });
    des.object({ class: '%' });
    des.object({ class: '=' });
    des.object({ class: '/' });

    /* Rewards */
    des.door('locked', 23, 13);
    des.door('closed', 17, 11);
    des.door('closed', 17, 13);
    des.door('closed', 17, 15);

    des.region({ region: [18, 10, 22, 16], lit: 1, type: 'zoo', filled: 1,
                 irregular: 1 });

    const pt = selection_rndcoord(place);
    if (percent(75)) {
        des.object({ id: 'bag of holding', coord: [pt.x, pt.y],
                     buc: 'not-cursed', achievement: 1 });
    } else {
        des.object({ id: 'amulet of reflection', coord: [pt.x, pt.y],
                     buc: 'not-cursed', achievement: 1 });
    }
    des.engraving({ coord: [pt.x, pt.y], type: 'burn', text: 'Elbereth' });
    des.object({ id: 'scroll of scare monster', coord: [pt.x, pt.y],
                 buc: 'cursed' });
}
