// dat/hea-goal.js — the Healer quest goal level.
// C ref: dat/Hea-goal.lua
//
// The Isle of the Cyclops: pool-flooded mines carving, The Staff of
// Aesculapius and a wand of lightning under Cyclops, and the sea-monster
// horde.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_region_full, lspo_stair, lspo_object, lspo_trap,
         lspo_monster, lspo_non_diggable } from '../sp_lev.js';

const HEA_GOAL_MAP = `.P....................................PP.
PP.......PPPPPPP....PPPPPPP....PPPP...PP.
...PPPPPPP....PPPPPPP.....PPPPPP..PPP...P
...PP..............................PPP...
..PP..............................PP.....
..PP..............................PPP....
..PPP..............................PP....
.PPP..............................PPPP...
...PP............................PPP...PP
..PPPP...PPPPP..PPPP...PPPPP.....PP...PP.
P....PPPPP...PPPP..PPPPP...PPPPPPP...PP..
PPP..................................PPP.`;

export async function heagoal_level() {
    const des = {
        level_init: lspo_level_init,
        level_flags: lspo_level_flags,
        map: lspo_map_full,
        region: (sel, lit) => lspo_region_full(
            Array.isArray(sel) ? { area: sel, lit: lit === 'lit' } : sel),
        stair: (d, x, y) => lspo_stair(d, x, y),
        non_diggable: (s) => lspo_non_diggable(s[0], s[1], s[2], s[3]),
        object: (a, x, y, o) => lspo_object(a, x, y, o),
        trap: (t, x, y) => lspo_trap(t, x, y),
        monster: (a, x, y, o) => lspo_monster(a, x, y, o),
    };
    const selection = { area: (x1, y1, x2, y2) => [x1, y1, x2, y2] };

    des.level_init({ style: 'solidfill', fg: 'P' });

    des.level_flags('mazelevel');

    des.level_init({ style: 'mines', fg: '.', bg: 'P', smoothed: false,
                     joined: true, lit: 1, walled: false });
    des.map(HEA_GOAL_MAP);
    des.region(selection.area(0, 0, 40, 11), 'lit');
    des.stair('up', 39, 10);
    des.non_diggable(selection.area(0, 0, 40, 11));
    des.object({ id: 'quarterstaff', x: 20, y: 6, buc: 'blessed', spe: 0,
                 name: 'The Staff of Aesculapius' });
    des.object('wand of lightning', 20, 6);
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.monster({ id: 'Cyclops', x: 20, y: 6, peaceful: 0 });
    des.monster('rabid rat');
    des.monster('rabid rat');
    des.monster('rabid rat');
    des.monster({ class: 'r', peaceful: 0 });
    des.monster({ class: 'r', peaceful: 0 });
    des.monster('giant eel');
    des.monster('giant eel');
    des.monster('giant eel');
    des.monster('giant eel');
    des.monster('giant eel');
    des.monster('giant eel');
    des.monster('electric eel');
    des.monster('electric eel');
    des.monster('shark');
    des.monster('shark');
    des.monster({ class: ';', peaceful: 0 });
    des.monster({ class: 'D', peaceful: 0 });
    des.monster({ class: 'D', peaceful: 0 });
    des.monster({ class: 'D', peaceful: 0 });
    des.monster({ class: 'D', peaceful: 0 });
    des.monster({ class: 'D', peaceful: 0 });
    des.monster({ class: 'S', peaceful: 0 });
    des.monster({ class: 'S', peaceful: 0 });
    des.monster({ class: 'S', peaceful: 0 });
    des.monster({ class: 'S', peaceful: 0 });
    des.monster({ class: 'S', peaceful: 0 });
    des.monster({ class: 'S', peaceful: 0 });
    des.monster({ class: 'S', peaceful: 0 });
    des.monster({ class: 'S', peaceful: 0 });
    des.monster({ class: 'S', peaceful: 0 });
    des.monster({ class: 'S', peaceful: 0 });
}
