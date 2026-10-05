// dat/val-loca.js — the Valkyrie quest locate level.
// C ref: dat/Val-loca.lua
//
// The glacier ringed by lava-pocked ice: a smoothed unwalled mines field
// on ice, the open central sheet, fire ants, fire giants and two H's.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_region_full, lspo_stair, lspo_object, lspo_trap,
         lspo_monster, lspo_non_diggable } from '../sp_lev.js';

const VAL_LOCA_MAP = `PPPPxxxx                      xxxxPPPPPx
PLPxxx                          xPPLLLPP
PPP    .......................    PPPLLP
xx   ............................   PPPP
x  ...............................  xxxx
  .................................   xx
....................................   x
  ...................................   
x  ..................................  x
xx   ..............................   PP
xPPP  ..........................     PLP
xPLLP                             xxPLLP
xPPPPxx                         xxxxPPPP`;

export async function valloca_level() {
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

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'hardfloor', 'icedpools', 'noflip');

    des.level_init({ style: 'mines', fg: '.', bg: 'I', smoothed: true,
                     joined: false, lit: 1, walled: false });

    des.map(VAL_LOCA_MAP);
    /* Dungeon Description */
    des.region(selection.area(0, 0, 39, 12), 'lit');
    /* Stairs */
    des.stair('up', 48, 14);
    des.stair('down', 20, 6);
    /* Non diggable walls */
    des.non_diggable(selection.area(0, 0, 39, 12));
    /* Objects */
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
    /* Random traps */
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap();
    des.trap();
    /* Random monsters. */
    des.monster('fire ant');
    des.monster('fire ant');
    des.monster('fire ant');
    des.monster('fire ant');
    des.monster('fire ant');
    des.monster('fire ant');
    des.monster('fire ant');
    des.monster('fire ant');
    des.monster('fire ant');
    des.monster('fire ant');
    des.monster('fire ant');
    des.monster('fire ant');
    des.monster('fire ant');
    des.monster('fire ant');
    des.monster('fire ant');
    des.monster('fire ant');
    des.monster('fire ant');
    des.monster('a');
    des.monster({ class: 'H', peaceful: 0 });
    des.monster({ id: 'fire giant', peaceful: 0 });
    des.monster({ id: 'fire giant', peaceful: 0 });
    des.monster({ id: 'fire giant', peaceful: 0 });
    des.monster({ id: 'fire giant', peaceful: 0 });
    des.monster({ id: 'fire giant', peaceful: 0 });
    des.monster({ id: 'fire giant', peaceful: 0 });
    des.monster({ id: 'fire giant', peaceful: 0 });
    des.monster({ class: 'H', peaceful: 0 });
}
