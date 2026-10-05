// dat/sam-filb.js — Samurai quest filler, lower half (at or below the
// locate level).
// C ref: dat/Sam-filb.lua
//
// An unlit fortress corridor block with corner courts, wolves, a d and
// three stalkers.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_region_full, lspo_stair, lspo_door, lspo_object, lspo_trap,
         lspo_monster } from '../sp_lev.js';

const SAM_FILB_MAP = `-------------                                  -------------
|...........|                                  |...........|
|...-----...|----------------------------------|...-----...|
|...|   |...|..................................|...|   |...|
|...-----..........................................-----...|
|...........|--S----------------------------S--|...........|
----...--------.|..........................|.--------...----
   |...|........+..........................+........|...|   
   |...|........+..........................+........|...|   
----...--------.|..........................|.--------...----
|...........|--S----------------------------S--|...........|
|...-----..........................................-----...|
|...|   |...|..................................|...|   |...|
|...-----...|----------------------------------|...-----...|
|...........|                                  |...........|
-------------                                  -------------`;

export async function samfilb_level() {
    const des = {
        level_init: lspo_level_init,
        level_flags: lspo_level_flags,
        map: lspo_map_full,
        region: (sel, lit) => lspo_region_full(
            Array.isArray(sel) ? { area: sel, lit: lit === 'lit' } : sel),
        door: (state, x, y) => lspo_door({ state, x, y }),
        stair: (d, x, y) => lspo_stair(d, x, y),
        object: (a, x, y, o) => lspo_object(a, x, y, o),
        trap: (t, x, y) => lspo_trap(t, x, y),
        monster: (a, x, y, o) => lspo_monster(a, x, y, o),
    };
    const selection = { area: (x1, y1, x2, y2) => [x1, y1, x2, y2] };

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel');

    des.map(SAM_FILB_MAP);

    des.region(selection.area(0, 0, 59, 15), 'unlit');

    des.door('closed', 16, 7);
    des.door('closed', 16, 8);
    des.door('closed', 43, 7);
    des.door('closed', 43, 8);

    des.stair('up');
    des.stair('down');

    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();

    des.monster('d');
    des.monster('wolf');
    des.monster('wolf');
    des.monster('wolf');
    des.monster('wolf');
    des.monster('stalker');
    des.monster('stalker');
    des.monster('stalker');

    des.trap();
    des.trap();
    des.trap();
    des.trap();
}
