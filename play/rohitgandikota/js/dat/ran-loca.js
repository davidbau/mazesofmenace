// dat/ran-loca.js — the Ranger quest locate level.
// C ref: dat/Ran-loca.lua
//
// The cavern web where the wumpus sleeps on the down stairs, with giant
// bats, centaurs, scorpions and two random s.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_region_full, lspo_stair, lspo_object, lspo_trap,
         lspo_monster, lspo_non_diggable } from '../sp_lev.js';

const RAN_LOCA_MAP = `              .......  .........  .......              
     ...................       ...................     
  ....        .......             .......        ....  
...    .....     .       .....       .     .....    ...
.   .......... .....  ...........  ..... ..........   .
.  ..  ..... ..........  .....  .......... .....  ..  .
.  .     .     .....       .       .....     .     .  .
.  .   .....         .............         .....   .  .
.  .  ................  .......  ................  .  .
.  .   .....            .......            .....   .  .
.  .     .    ......               ......    .     .  .
.  .     ...........   .........   ...........     .  .
.  .          ..........       ..........          .  .
.  ..  .....     .       .....       .     .....  ..  .
.   .......... .....  ...........  ..... ..........   .
.      ..... ..........  .....  .......... .....      .
.        .     .....       .       .....     .        .
...   .......           .......           .......   ...
  ..............     .............     ..............  
      .......  .......  .......  .......  .......      `;

export async function ranloca_level() {
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

    des.level_flags('mazelevel', 'hardfloor');
    des.map(RAN_LOCA_MAP);
    des.region(selection.area(0, 0, 54, 19), 'lit');
    des.stair('up', 25, 5);
    des.stair('down', 27, 18);
    des.non_diggable(selection.area(0, 0, 54, 19));
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    des.trap('spiked pit');
    des.trap('spiked pit');
    des.trap('teleport');
    des.trap('teleport');
    des.trap('arrow');
    des.trap('arrow');
    des.monster({ id: 'wumpus', x: 27, y: 18, peaceful: 0, asleep: 1 });
    des.monster({ id: 'giant bat', peaceful: 0 });
    des.monster({ id: 'giant bat', peaceful: 0 });
    des.monster({ id: 'giant bat', peaceful: 0 });
    des.monster({ id: 'giant bat', peaceful: 0 });
    des.monster({ id: 'forest centaur', peaceful: 0 });
    des.monster({ id: 'forest centaur', peaceful: 0 });
    des.monster({ id: 'forest centaur', peaceful: 0 });
    des.monster({ id: 'forest centaur', peaceful: 0 });
    des.monster({ id: 'mountain centaur', peaceful: 0 });
    des.monster({ id: 'mountain centaur', peaceful: 0 });
    des.monster({ id: 'mountain centaur', peaceful: 0 });
    des.monster({ id: 'mountain centaur', peaceful: 0 });
    des.monster({ id: 'mountain centaur', peaceful: 0 });
    des.monster({ id: 'mountain centaur', peaceful: 0 });
    des.monster({ id: 'mountain centaur', peaceful: 0 });
    des.monster({ id: 'mountain centaur', peaceful: 0 });
    des.monster({ id: 'scorpion', peaceful: 0 });
    des.monster({ id: 'scorpion', peaceful: 0 });
    des.monster({ id: 'scorpion', peaceful: 0 });
    des.monster({ id: 'scorpion', peaceful: 0 });
    des.monster({ class: 's', peaceful: 0 });
    des.monster({ class: 's', peaceful: 0 });
}
