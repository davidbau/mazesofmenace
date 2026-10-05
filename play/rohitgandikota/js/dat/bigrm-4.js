// dat/bigrm-4.js — big room variant 4, the "bone" hall.
// C ref: dat/bigrm-4.lua
//
// A wide hall pinched in the middle, two lava blocks, four fountains in
// the corner alcoves. The lava usually becomes something else: the terrain
// list is weighted 4/10 to plain floor, and 'L' itself means keep the lava
// (no replace pass at all, so its 40 rn2(100) draws are skipped).

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_replace_terrain, lspo_region_sel, lspo_stair, lspo_feature,
         lspo_non_diggable, lspo_object, lspo_trap, lspo_monster,
         l_selection_fillrect } from '../sp_lev.js';
import { rn2 } from '../rng.js';

/* dat/nhlib.lua math.random shim — two-arg form is a + rn2(b + 1 - a) */
const mathrandom = (a, b) => a + rn2(b + 1 - a);

const BIGRM4_MAP = `
-----------                                                     -----------
|.........|                                                     |.........|
|.........-------------                             -------------.........|
---...................------------       ------------...................---
  --.............................---------.............................--  
   --.................................................................--   
    --...............................................................--    
     --......LLLLL.......................................LLLLL......--     
      --.....LLLLL.......................................LLLLL.....--      
      --.....LLLLL.......................................LLLLL.....--      
     --......LLLLL.......................................LLLLL......--     
    --...............................................................--    
   --.................................................................--   
  --.............................---------.............................--  
---...................------------       ------------...................---
|.........-------------                             -------------.........|
|.........|                                                     |.........|
-----------                                                     -----------`;

export async function bigrm4_level() {
    const des = {
        level_init: lspo_level_init,
        level_flags: lspo_level_flags,
        map: lspo_map_full,
        replace_terrain: (o) => lspo_replace_terrain(o),
        region: (sel, lit) => lspo_region_sel(sel, lit),
        feature: (t, x, y) => lspo_feature(t, x, y),
        stair: (d) => lspo_stair(d),
        non_diggable: () => lspo_non_diggable(),
        object: () => lspo_object(),
        trap: () => lspo_trap(),
        monster: () => lspo_monster(),
    };
    const selection = { area: l_selection_fillrect };

    des.level_init({ style: 'solidfill', fg: ' ' });
    des.level_flags('mazelevel', 'noflip');

    des.map(BIGRM4_MAP);

    const terrains = ['.', '.', '.', '.', 'P', 'L', '-', 'T', 'W', 'Z'];
    const tidx = mathrandom(1, terrains.length);
    const toterr = terrains[tidx - 1];
    if (toterr !== 'L') {
        des.replace_terrain({ fromterrain: 'L', toterrain: toterr });
    }

    des.feature('fountain', 5, 2);
    des.feature('fountain', 5, 15);
    des.feature('fountain', 69, 2);
    des.feature('fountain', 69, 15);

    des.region(selection.area(1, 1, 73, 16), 'lit');

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
