// dat/hea-loca.js — the Healer quest locate level.
// C ref: dat/Hea-loca.lua
//
// The Isle of the temple of Coeus: a smoothed pool cavern around the
// chaotic shrine (its priest is created), heavy sea-monster population
// and rabid rats.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_region_full, lspo_stair, lspo_door, lspo_object, lspo_trap,
         lspo_monster, lspo_altar, lspo_non_diggable } from '../sp_lev.js';

const HEA_LOCA_MAP = `PPPPPPPPPPPPP.......PPPPPPPPPPP
PPPPPPPP...............PPPPPPPP
PPPP.....-------------...PPPPPP
PPPPP....|.S.........|....PPPPP
PPP......+.|.........|...PPPPPP
PPP......+.|.........|..PPPPPPP
PPPP.....|.S.........|..PPPPPPP
PPPPP....-------------....PPPPP
PPPPPPPP...............PPPPPPPP
PPPPPPPPPPP........PPPPPPPPPPPP`;

export async function healoca_level() {
    const des = {
        level_init: lspo_level_init,
        level_flags: lspo_level_flags,
        map: lspo_map_full,
        region: (sel, lit) => lspo_region_full(
            Array.isArray(sel) ? { area: sel, lit: lit === 'lit' } : sel),
        door: (state, x, y) => lspo_door({ state, x, y }),
        stair: (d, x, y) => lspo_stair(d, x, y),
        altar: (o) => lspo_altar(o),
        non_diggable: (s) => lspo_non_diggable(s[0], s[1], s[2], s[3]),
        object: (a, x, y, o) => lspo_object(a, x, y, o),
        trap: (t, x, y) => lspo_trap(t, x, y),
        monster: (a, x, y, o) => lspo_monster(a, x, y, o),
    };
    const selection = { area: (x1, y1, x2, y2) => [x1, y1, x2, y2] };

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'hardfloor');

    des.level_init({ style: 'mines', fg: '.', bg: 'P', smoothed: true,
                     joined: true, lit: 1, walled: false });
    des.map(HEA_LOCA_MAP);
    des.region(selection.area(0, 0, 30, 9), 'lit');
    des.region({ region: [12, 3, 20, 6], lit: 1, type: 'temple',
                 filled: 1 });
    des.door('closed', 9, 4);
    des.door('closed', 9, 5);
    des.door('locked', 11, 3);
    des.door('locked', 11, 6);
    des.stair('up', 4, 4);
    des.stair('down', 20, 6);
    des.non_diggable(selection.area(11, 2, 21, 7));
    des.altar({ x: 13, y: 5, align: 'chaos', type: 'shrine' });
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
    des.object();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.monster('rabid rat');
    des.monster('rabid rat');
    des.monster('rabid rat');
    des.monster('rabid rat');
    des.monster('rabid rat');
    des.monster('rabid rat');
    des.monster('rabid rat');
    des.monster('rabid rat');
    des.monster({ class: 'r', peaceful: 0 });
    des.monster('giant eel');
    des.monster('giant eel');
    des.monster('giant eel');
    des.monster('giant eel');
    des.monster('giant eel');
    des.monster('electric eel');
    des.monster('electric eel');
    des.monster('kraken');
    des.monster('shark');
    des.monster('shark');
    des.monster({ class: ';', peaceful: 0 });
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
}
