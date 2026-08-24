// dat/ran-goal.js — the Ranger quest goal level.
// C ref: dat/Ran-goal.lua
//
// Scorpius's walled wood: The Longbow of Diana and a chest under the
// nemesis, a centaur ring around him, scorpions in the corners, and
// wallify() closing the cave walls.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_region_full, lspo_stair, lspo_door, lspo_object, lspo_trap,
         lspo_monster, lspo_non_diggable, lspo_wallify } from '../sp_lev.js';

const RAN_GOAL_MAP = `                                                                            
  ...                                                                  ...  
 .......................................................................... 
  ...                                +                                 ...  
   .     ............     .......    .                   .......        .   
   .  .............................  .       ........   .........S..    .   
   .   ............    .  ......     .       .      .    .......   ..   .   
   .     .........     .   ....      +       . ...  .               ..  .   
   .        S          .         .........   .S.    .S...............   .   
   .  ...   .     ...  .         .........          .                   .   
   . ........    .....S.+.......+....\\....+........+.                   .   
   .  ...         ...    S       .........           ..      .....      .   
   .                    ..       .........            ..      ......    .   
   .      .......     ...            +       ....    ....    .......... .   
   . ..............  ..              .      ......  ..  .............   .   
   .     .............               .     ..........          ......   .   
  ...                                +                                 ...  
 .......................................................................... 
  ...                                                                  ...  
                                                                            `;

export async function rangoal_level() {
    const des = {
        level_init: lspo_level_init,
        level_flags: lspo_level_flags,
        map: lspo_map_full,
        region: (sel, lit) => lspo_region_full(
            Array.isArray(sel) ? { area: sel, lit: lit === 'lit' } : sel),
        stair: (d, x, y) => lspo_stair(d, x, y),
        door: (state, x, y) => lspo_door({ state, x, y }),
        non_diggable: (s) => lspo_non_diggable(s[0], s[1], s[2], s[3]),
        object: (a, x, y, o) => lspo_object(a, x, y, o),
        trap: (t, x, y) => lspo_trap(t, x, y),
        monster: (a, x, y, o) => lspo_monster(a, x, y, o),
        wallify: lspo_wallify,
    };
    const selection = { area: (x1, y1, x2, y2) => [x1, y1, x2, y2] };

    des.level_init({ style: 'solidfill', fg: ' ' });
    des.level_flags('mazelevel');
    des.map(RAN_GOAL_MAP);
    des.region(selection.area(0, 0, 75, 19), 'lit');
    des.stair('up', 19, 10);
    des.non_diggable(selection.area(0, 0, 75, 19));
    des.object({ id: 'bow', x: 37, y: 10, buc: 'blessed', spe: 0,
                 name: 'The Longbow of Diana' });
    des.object('chest', 37, 10);
    des.object({ coord: [36, 9] });
    des.object({ coord: [36, 10] });
    des.object({ coord: [36, 11] });
    des.object({ coord: [37, 9] });
    des.object({ coord: [37, 11] });
    des.object({ coord: [38, 9] });
    des.object({ coord: [38, 10] });
    des.object({ coord: [38, 11] });
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
    des.door('locked', 12, 8);
    des.door('closed', 22, 10);
    des.door('locked', 24, 10);
    des.door('closed', 25, 11);
    des.door('closed', 32, 10);
    des.door('closed', 37, 3);
    des.door('closed', 37, 7);
    des.door('closed', 37, 13);
    des.door('closed', 37, 16);
    des.door('closed', 42, 10);
    des.door('locked', 46, 8);
    des.door('closed', 51, 10);
    des.door('locked', 53, 8);
    des.door('closed', 65, 5);
    des.monster({ id: 'Scorpius', x: 37, y: 10, peaceful: 0 });
    des.monster({ id: 'forest centaur', x: 36, y: 9, peaceful: 0 });
    des.monster({ id: 'forest centaur', x: 36, y: 10, peaceful: 0 });
    des.monster({ id: 'forest centaur', x: 36, y: 11, peaceful: 0 });
    des.monster({ id: 'forest centaur', x: 37, y: 9, peaceful: 0 });
    des.monster({ id: 'forest centaur', x: 37, y: 11, peaceful: 0 });
    des.monster({ id: 'forest centaur', x: 38, y: 9, peaceful: 0 });
    des.monster({ id: 'mountain centaur', x: 38, y: 10, peaceful: 0 });
    des.monster({ id: 'mountain centaur', x: 38, y: 11, peaceful: 0 });
    des.monster({ id: 'mountain centaur', x: 2, y: 2, peaceful: 0 });
    des.monster({ id: 'mountain centaur', x: 71, y: 2, peaceful: 0 });
    des.monster({ id: 'mountain centaur', x: 2, y: 16, peaceful: 0 });
    des.monster({ id: 'mountain centaur', x: 71, y: 16, peaceful: 0 });
    des.monster({ id: 'forest centaur', peaceful: 0 });
    des.monster({ id: 'forest centaur', peaceful: 0 });
    des.monster({ id: 'mountain centaur', peaceful: 0 });
    des.monster({ id: 'mountain centaur', peaceful: 0 });
    des.monster({ class: 'C', peaceful: 0 });
    des.monster({ class: 'C', peaceful: 0 });
    des.monster({ id: 'scorpion', x: 3, y: 2, peaceful: 0 });
    des.monster({ id: 'scorpion', x: 72, y: 2, peaceful: 0 });
    des.monster({ id: 'scorpion', x: 3, y: 17, peaceful: 0 });
    des.monster({ id: 'scorpion', x: 72, y: 17, peaceful: 0 });
    des.monster({ id: 'scorpion', x: 41, y: 10, peaceful: 0 });
    des.monster({ id: 'scorpion', x: 33, y: 9, peaceful: 0 });
    des.monster({ id: 'scorpion', peaceful: 0 });
    des.monster({ id: 'scorpion', peaceful: 0 });
    des.monster({ class: 's', peaceful: 0 });
    des.wallify();
}
