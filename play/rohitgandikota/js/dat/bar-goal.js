// dat/bar-goal.js — the Barbarian quest goal level.
// C ref: dat/Bar-goal.lua
//
// Thoth Amon's unlit cavern: two secret locked doors on the west chamber,
// an unattended noncoaligned altar bearing The Heart of Ahriman, fifteen
// random objects, six traps, and the nemesis with his ogre and troll army.
// wallify() runs at the end because the map has no prebuilt walls.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_region_full, lspo_stair, lspo_door, lspo_object,
         lspo_trap, lspo_monster, lspo_altar, lspo_non_diggable,
         lspo_wallify } from '../sp_lev.js';

const BAR_GOAL_MAP = `
                                                                            
                               .............                                
                             ..................                             
        ....              .........................          ....           
      .......          ..........................           .......         
      ......             ........................          .......          
      ..  ......................................             ..             
       ..                 .....................             ..              
        ..                 ..................              ..               
         ..         ..S...S..............   ................                
          ..                   ........                ...                  
       .........                                         ..                 
       ......  ..                                         ...  ....         
      .. ...    ..                             ......       ........        
   ....          .. ..................        ........       ......         
  ......          ......................       ......         ..            
   ....             ..................              ...........             
                      ..............                                        
                        ...........                                         
                                                                            
`.replace(/^\n/, '').replace(/\n$/, '');

export async function bargoal_level() {
    const des = {
        level_init: lspo_level_init,
        level_flags: lspo_level_flags,
        map: lspo_map_full,
        region: (sel, lit) => lspo_region_full(
            Array.isArray(sel) ? { area: sel, lit: lit === 'lit' } : sel),
        door: (state, x, y) => lspo_door({ state, x, y }),
        stair: (d, x, y) => lspo_stair(d, x, y),
        altar: (o) => lspo_altar(o),
        non_diggable: lspo_non_diggable,
        object: (a, x, y, o) => lspo_object(a, x, y, o),
        trap: (t, x, y) => lspo_trap(t, x, y),
        monster: (a, x, y, o) => lspo_monster(a, x, y, o),
        wallify: lspo_wallify,
    };
    const selection = { area: (x1, y1, x2, y2) => [x1, y1, x2, y2] };

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel');

    des.map(BAR_GOAL_MAP);

    /* Dungeon Description */
    des.region(selection.area(0, 0, 75, 19), 'unlit');
    /* Secret doors */
    des.door('locked', 22, 9);
    des.door('locked', 26, 9);
    /* Stairs */
    des.stair('up', 36, 5);
    /* The altar.  Unattended. */
    des.altar({ x: 63, y: 4, align: 'noncoaligned', type: 'altar' });
    des.non_diggable(selection.area(0, 0, 75, 19));
    /* Objects */
    des.object({ id: 'luckstone', x: 63, y: 4, buc: 'blessed', spe: 0,
                 name: 'The Heart of Ahriman' });
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
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    /* Random monsters. */
    des.monster({ id: 'Thoth Amon', x: 63, y: 4, peaceful: 0 });
    des.monster({ id: 'ogre', peaceful: 0 });
    des.monster({ id: 'ogre', peaceful: 0 });
    des.monster({ id: 'ogre', peaceful: 0 });
    des.monster({ id: 'ogre', peaceful: 0 });
    des.monster({ id: 'ogre', peaceful: 0 });
    des.monster({ id: 'ogre', peaceful: 0 });
    des.monster({ id: 'ogre', peaceful: 0 });
    des.monster({ id: 'ogre', peaceful: 0 });
    des.monster({ id: 'ogre', peaceful: 0 });
    des.monster({ id: 'ogre', peaceful: 0 });
    des.monster({ id: 'ogre', peaceful: 0 });
    des.monster({ id: 'ogre', peaceful: 0 });
    des.monster({ id: 'ogre', peaceful: 0 });
    des.monster({ id: 'ogre', peaceful: 0 });
    des.monster({ id: 'ogre', peaceful: 0 });
    des.monster({ id: 'ogre', peaceful: 0 });
    des.monster({ class: 'O', peaceful: 0 });
    des.monster({ class: 'O', peaceful: 0 });
    des.monster({ id: 'rock troll', peaceful: 0 });
    des.monster({ id: 'rock troll', peaceful: 0 });
    des.monster({ id: 'rock troll', peaceful: 0 });
    des.monster({ id: 'rock troll', peaceful: 0 });
    des.monster({ id: 'rock troll', peaceful: 0 });
    des.monster({ id: 'rock troll', peaceful: 0 });
    des.monster({ id: 'rock troll', peaceful: 0 });
    des.monster({ id: 'rock troll', peaceful: 0 });
    des.monster({ class: 'T', peaceful: 0 });
    des.wallify();
}
