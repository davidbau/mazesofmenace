// dat/bigrm-12.js — big room variant 12, "Two hexagons".
// C ref: dat/bigrm-12.lua
//
// Two hexagonal chambers, the west one ringed with pools around a water
// wall core, the east one lava around a lava wall core. Three percent()
// blocks may swap the liquids around; each percent() call spends one
// rn2(100) whether or not its branch runs, and the nested ones only spend
// when the outer branch was taken — the Lua short-circuit IS the draw
// order.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_replace_terrain, lspo_region_full, lspo_stair,
         lspo_non_diggable, lspo_object, lspo_trap,
         lspo_monster, lspo_wallify } from '../sp_lev.js';
import { percent } from '../nhlua.js';

const BIGRM12_MAP = `
                                                                           
         .......................           .......................         
        .........................         .........................        
       ...........................       ...........................       
      .............................     .............................      
     ........PPPPPPPPPPPPPPP........   ........LLLLLLLLLLLLLLL........     
    ........PPPPPPPPPPPPPPPPP........ ........LLLLLLLLLLLLLLLLL........    
   ........PPPWWWWWWWWWWWWWPPP...............LLLZZZZZZZZZZZZZLLL........   
  ........PPPWWWWWWWWWWWWWWWPPP.............LLLZZZZZZZZZZZZZZZLLL........  
 ........PPPWWWWWWWWWWWWWWWWWPPP...........LLLZZZZZZZZZZZZZZZZZLLL........ 
  ........PPPWWWWWWWWWWWWWWWPPP.............LLLZZZZZZZZZZZZZZZLLL........  
   ........PPPWWWWWWWWWWWWWPPP...............LLLZZZZZZZZZZZZZLLL........   
    ........PPPPPPPPPPPPPPPPP........ ........LLLLLLLLLLLLLLLLL........    
     ........PPPPPPPPPPPPPPP........   ........LLLLLLLLLLLLLLL........     
      .............................     .............................      
       ...........................       ...........................       
        .........................         .........................        
         .......................           .......................         
                                                                           `;

export async function bigrm12_level() {
    const des = {
        level_init: lspo_level_init,
        level_flags: lspo_level_flags,
        map: lspo_map_full,
        replace_terrain: (o) => lspo_replace_terrain(o),
        region: (o) => lspo_region_full(o),
        stair: (d) => lspo_stair(d),
        non_diggable: () => lspo_non_diggable(),
        wallify: () => lspo_wallify(),
        object: (a, x, y, o) => lspo_object(a, x, y, o),
        trap: () => lspo_trap(),
        monster: (a, x, y, o) => lspo_monster(a, x, y, o),
    };

    des.level_flags('mazelevel', 'noflipy');
    des.level_init({ style: 'solidfill', fg: ' ' });

    des.map(BIGRM12_MAP);

    /* maybe replace lavawalls/waterwalls with stone walls */
    if (percent(20)) {
        if (percent(50))
            des.replace_terrain({ fromterrain: 'W', toterrain: '-' });
        if (percent(50))
            des.replace_terrain({ fromterrain: 'Z', toterrain: '-' });
    }

    /* maybe replace pools with floor and then possibly walls with pools */
    if (percent(25)) {
        des.replace_terrain({ fromterrain: 'P', toterrain: '.' });
        if (percent(75))
            des.replace_terrain({ fromterrain: 'W', toterrain: 'P' });
    }
    if (percent(25)) {
        des.replace_terrain({ fromterrain: 'L', toterrain: '.' });
        if (percent(75))
            des.replace_terrain({ fromterrain: 'Z', toterrain: 'L' });
    }

    /* maybe make both sides have the same terrain */
    if (percent(20)) {
        if (percent(50)) {
            /* both are lava */
            des.replace_terrain({ fromterrain: 'P', toterrain: 'L' });
            des.replace_terrain({ fromterrain: 'W', toterrain: 'Z' });
        } else {
            /* both are water */
            des.replace_terrain({ fromterrain: 'L', toterrain: 'P' });
            des.replace_terrain({ fromterrain: 'Z', toterrain: 'W' });
        }
    }

    des.region({ area: [0, 0, 75, 19], lit: 1 });
    des.non_diggable();
    des.wallify();

    des.stair('up');
    des.stair('down');

    for (let i = 0; i < 15; i++)
        des.object();
    for (let i = 0; i < 6; i++)
        des.trap();
    for (let i = 0; i < 28; i++)
        des.monster();
}
