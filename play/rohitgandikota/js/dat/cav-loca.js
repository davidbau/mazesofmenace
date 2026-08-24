// dat/cav-loca.js — the Caveman quest locate level.
// C ref: dat/Cav-loca.lua
//
// The bugbear caves: an unlit cavern sprawl with one lit irregular east
// room, bugbear ambush knots, hill giants, and wallify() closing the
// cave walls.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_region_full, lspo_stair, lspo_door, lspo_object, lspo_trap,
         lspo_monster, lspo_non_diggable, lspo_wallify } from '../sp_lev.js';

const CAV_LOCA_MAP = `                                                                            
    .............                     ...........                           
   ...............                   .............                          
    .............                  ...............        ..........        
     ...........                    .............      ...............      
        ...                                    ...   ..................     
         ...                ..........          ... ..................      
          ...              ............          BBB...................     
           ...              ..........          ......................      
            .....                 ..      .....B........................    
  ....       ...............      .    ........B..........................  
 ......     .. .............S..............         ..................      
  ....     ..                ...........             ...............        
     ..  ...                                    ....................        
      ....                                      BB...................       
         ..                 ..                 ..  ...............          
          ..   .......     ....  .....  ....  ..     .......   S            
           ............     ....... ..  .......       .....    ...  ....    
               .......       .....   ......                      .......    
                                                                            `;

export async function cavloca_level() {
    const des = {
        level_init: lspo_level_init,
        level_flags: lspo_level_flags,
        map: lspo_map_full,
        region: (sel, lit) => lspo_region_full(
            Array.isArray(sel) ? { area: sel, lit: lit === 'lit' } : sel),
        door: (state, x, y) => lspo_door({ state, x, y }),
        stair: (d, x, y) => lspo_stair(d, x, y),
        non_diggable: (s) => lspo_non_diggable(s[0], s[1], s[2], s[3]),
        object: (a, x, y, o) => lspo_object(a, x, y, o),
        trap: (t, x, y) => lspo_trap(t, x, y),
        monster: (a, x, y, o) => lspo_monster(a, x, y, o),
        wallify: lspo_wallify,
    };
    const selection = { area: (x1, y1, x2, y2) => [x1, y1, x2, y2] };

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'hardfloor');

    des.map(CAV_LOCA_MAP);
    /* Dungeon Description */
    des.region(selection.area(0, 0, 75, 19), 'unlit');
    des.region({ region: [52, 6, 73, 15], lit: 1, type: 'ordinary',
                 irregular: 1 });
    /* Doors */
    des.door('locked', 28, 11);
    /* Stairs */
    des.stair('up', 4, 3);
    des.stair('down', 73, 10);
    /* Non diggable walls */
    des.non_diggable(selection.area(0, 0, 75, 19));
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
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    /* Random monsters. */
    des.monster({ id: 'bugbear', x: 2, y: 10, peaceful: 0 });
    des.monster({ id: 'bugbear', x: 3, y: 11, peaceful: 0 });
    des.monster({ id: 'bugbear', x: 4, y: 12, peaceful: 0 });
    des.monster({ id: 'bugbear', x: 2, y: 11, peaceful: 0 });
    des.monster({ id: 'bugbear', x: 16, y: 16, peaceful: 0 });
    des.monster({ id: 'bugbear', x: 17, y: 17, peaceful: 0 });
    des.monster({ id: 'bugbear', x: 18, y: 18, peaceful: 0 });
    des.monster({ id: 'bugbear', x: 19, y: 16, peaceful: 0 });
    des.monster({ id: 'bugbear', x: 30, y: 6, peaceful: 0 });
    des.monster({ id: 'bugbear', x: 31, y: 7, peaceful: 0 });
    des.monster({ id: 'bugbear', x: 32, y: 8, peaceful: 0 });
    des.monster({ id: 'bugbear', x: 33, y: 6, peaceful: 0 });
    des.monster({ id: 'bugbear', x: 34, y: 7, peaceful: 0 });
    des.monster({ id: 'bugbear', peaceful: 0 });
    des.monster({ id: 'bugbear', peaceful: 0 });
    des.monster({ id: 'bugbear', peaceful: 0 });
    des.monster({ id: 'bugbear', peaceful: 0 });
    des.monster({ class: 'h', peaceful: 0 });
    des.monster({ class: 'H', peaceful: 0 });
    des.monster({ id: 'hill giant', x: 3, y: 12, peaceful: 0 });
    des.monster({ id: 'hill giant', x: 20, y: 17, peaceful: 0 });
    des.monster({ id: 'hill giant', x: 35, y: 8, peaceful: 0 });
    des.monster({ id: 'hill giant', peaceful: 0 });
    des.monster({ id: 'hill giant', peaceful: 0 });
    des.monster({ id: 'hill giant', peaceful: 0 });
    des.monster({ id: 'hill giant', peaceful: 0 });
    des.monster({ class: 'H', peaceful: 0 });
    des.wallify();
}
