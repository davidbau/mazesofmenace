// dat/bigrm-7.js — big room variant 7.
// C ref: dat/bigrm-7.lua
//
// A map-based special level: solidfill init, the fixed diamond-shaped big
// room, one random terrain substitution for its four 'L' squares, the whole
// interior lit, both stairs, non-diggable, then 15 objects, 6 traps and 28
// monsters placed at random.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_replace_terrain, lspo_region_full, lspo_stair,
         lspo_non_diggable, lspo_object, lspo_trap, lspo_monster,
         selection_area_obj } from '../sp_lev.js';
import { rn2 } from '../rng.js';

const BIGRM7_MAP = `
                                                        -----              
                                                ---------...---            
                                        ---------.........L...---          
                                ---------.......................---        
                        ---------.................................---      
                ---------...........................................---    
        ---------.....................................................---  
---------...............................................................---
|.........................................................................|
|.L.....................................................................L.|
|.........................................................................|
---...............................................................---------
  ---.....................................................---------        
    ---...........................................---------                
      ---.................................---------                        
        ---.......................---------                                
          ---...L.........---------                                        
            ---...---------                                                
              -----                                                        `;

export async function bigrm7_level() {
    const des = {
        level_init: lspo_level_init,
        level_flags: lspo_level_flags,
        map: lspo_map_full,
        replace_terrain: (o) => lspo_replace_terrain(o),
        region: (o) => lspo_region_full(o),
        stair: (d) => lspo_stair(d),
        non_diggable: (sel) => lspo_non_diggable(sel),
        object: (a, x, y, o) => lspo_object(a, x, y, o),
        trap: () => lspo_trap(),
        monster: (a, x, y, o) => lspo_monster(a, x, y, o),
    };

    des.level_init({ style: 'solidfill', fg: ' ' });
    des.level_flags('mazelevel');
    des.map(BIGRM7_MAP);

    /* local terrain = { "L", "T", "{", "." }
       local tidx = math.random(1, #terrain)   -- nh.random(1,4) -> rn2(4) */
    const terrain = ['L', 'T', '{', '.'];
    const tidx = rn2(terrain.length);
    des.replace_terrain({ region: [0, 0, 74, 18], fromterrain: 'L',
                          toterrain: terrain[tidx] });

    des.region({ area: [1, 1, 73, 17], lit: 1 });

    des.stair('up');
    des.stair('down');

    des.non_diggable();

    for (let i = 0; i < 15; i++)
        des.object();
    for (let i = 0; i < 6; i++)
        des.trap();
    for (let i = 0; i < 28; i++)
        des.monster();
}
