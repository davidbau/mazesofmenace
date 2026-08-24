// dat/tower3.js — the bottom stage of Vlad's tower.
// C ref: dat/Tower3.lua
//
// The tower entrance: a locked door with a dragon behind it, two more
// fixed monsters, six random ones, and four fixed treasures each guarded
// by a random trap in the corner niches (the niche list is NOT shuffled
// here). The branch arrival region sits just inside the west wall.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_door, lspo_ladder, lspo_levregion, lspo_object, lspo_trap,
         lspo_monster, lspo_non_diggable } from '../sp_lev.js';

const TOWER3_MAP = `
    --- --- ---    
    |.| |.| |.|    
  ---S---S---S---  
  |.S.........S.|  
-----.........-----
|...|.........+...|
|.---.........---.|
|.|.S.........S.|.|
|.---S---S---S---.|
|...|.|.|.|.|.|...|
---.---.---.---.---
  |.............|  
  ---------------  `;

export async function tower3_level() {
    const at = (f) => (a, x, y, o) =>
        Array.isArray(x) ? f(a, x[0], x[1], o) : f(a, x, y, o);
    const des = {
        level_init: lspo_level_init,
        level_flags: lspo_level_flags,
        map: lspo_map_full,
        levregion: (o) => lspo_levregion(o),
        ladder: (d, x, y) => lspo_ladder(d, x, y),
        door: (state, x, y) => lspo_door({ state, x, y }),
        monster: at(lspo_monster),
        object: at(lspo_object),
        trap: (t, x, y) => (t && typeof t === 'object')
            ? lspo_trap(undefined, undefined, undefined, t)
            : lspo_trap(t, x, y),
        non_diggable: (s) => lspo_non_diggable(s[0], s[1], s[2], s[3]),
    };
    const selection = { area: (x1, y1, x2, y2) => [x1, y1, x2, y2] };

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'noteleport', 'hardfloor', 'solidify');
    des.map({ halign: 'half-left', valign: 'center', map: TOWER3_MAP });

    /* Random places are the 10 niches */
    const place = [[5, 1], [9, 1], [13, 1], [3, 3], [15, 3],
                   [3, 7], [15, 7], [5, 9], [9, 9], [13, 9]];

    des.levregion({ type: 'branch', region: [2, 5, 2, 5] });
    des.ladder('up', 5, 7);
    /* Entry door is, of course, locked */
    des.door('locked', 14, 5);
    /* Let's put a dragon behind the door, just for the fun... */
    des.monster('D', 13, 5);
    des.monster({ x: 12, y: 4 });
    des.monster({ x: 12, y: 6 });
    des.monster();
    des.monster();
    des.monster();
    des.monster();
    des.monster();
    des.monster();
    des.object('long sword', place[3]);
    des.trap({ coord: place[3] });
    des.object('lock pick', place[0]);
    des.trap({ coord: place[0] });
    des.object('elven cloak', place[1]);
    des.trap({ coord: place[1] });
    des.object('blindfold', place[2]);
    des.trap({ coord: place[2] });
    /* Walls in the tower are non diggable */
    des.non_diggable(selection.area(0, 0, 18, 12));
}
