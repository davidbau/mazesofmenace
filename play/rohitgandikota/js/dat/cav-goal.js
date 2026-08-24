// dat/cav-goal.js — the Caveman quest goal level.
// C ref: dat/Cav-goal.lua
//
// The Chromatic Dragon's lair: a lit diamond cavern, The Sceptre of Might
// under the sleeping dragon, three shriekers, and wallify() closing the
// cave walls.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_region_full, lspo_stair, lspo_object, lspo_monster,
         lspo_non_diggable, lspo_wallify } from '../sp_lev.js';

const CAV_GOAL_MAP = `                                                                            
                          .....................                             
                         .......................                            
                        .........................                           
                       ...........................                          
                      .............................                         
                     ...............................                        
                    .................................                       
                   ...................................                      
                  .....................................                     
                 .......................................                    
                  .....................................                     
                   ...................................                      
                    .................................                       
                     ...............................                        
                      .............................                         
                       ...........................                          
                        .........................                           
                         .......................                            
                                                                            `;

export async function cavgoal_level() {
    const des = {
        level_init: lspo_level_init,
        level_flags: lspo_level_flags,
        map: lspo_map_full,
        region: (sel, lit) => lspo_region_full(
            Array.isArray(sel) ? { area: sel, lit: lit === 'lit' } : sel),
        stair: (d, x, y) => lspo_stair(d, x, y),
        non_diggable: (s) => lspo_non_diggable(s[0], s[1], s[2], s[3]),
        object: (a, x, y, o) => lspo_object(a, x, y, o),
        monster: (a, x, y, o) => lspo_monster(a, x, y, o),
        wallify: lspo_wallify,
    };
    const selection = { area: (x1, y1, x2, y2) => [x1, y1, x2, y2] };

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel');

    des.map(CAV_GOAL_MAP);
    /* Dungeon Description */
    des.region(selection.area(0, 0, 75, 19), 'lit');
    /* Stairs */
    des.stair('up');
    /* Non diggable walls */
    des.non_diggable(selection.area(0, 0, 75, 19));
    /* Objects */
    des.object({ id: 'mace', x: 23, y: 10, buc: 'blessed', spe: 0,
                 name: 'The Sceptre of Might' });
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
    /* monsters. */
    des.monster({ id: 'Chromatic Dragon', x: 23, y: 10, asleep: 1 });
    des.monster('shrieker', 26, 13);
    des.monster('shrieker', 25, 8);
    des.monster('shrieker', 45, 11);
    des.wallify();
}
