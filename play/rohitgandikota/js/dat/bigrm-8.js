// dat/bigrm-8.js — big room variant 8.
// C ref: dat/bigrm-8.lua
//
// A parallelogram hall split by a diagonal double run of iron bars. 40% of
// the time the bars become one of six other terrains ('.' erases them, '-'
// walls the halves apart); percent(40) always draws, the terrain pick and
// the per-square rn2(100)s only inside the branch.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_replace_terrain, lspo_region_sel, lspo_stair,
         lspo_non_diggable, lspo_object, lspo_trap, lspo_monster,
         l_selection_fillrect } from '../sp_lev.js';
import { percent } from '../nhlua.js';
import { rn2 } from '../rng.js';

/* dat/nhlib.lua math.random shim — two-arg form is a + rn2(b + 1 - a) */
const mathrandom = (a, b) => a + rn2(b + 1 - a);

const BIGRM8_MAP = `
----------------------------------------------                             
|............................................---                           
--.............................................---                         
 ---......................................FF.....---                       
   ---...................................FF........---                     
     ---................................FF...........---                   
       ---.............................FF..............---                 
         ---..........................FF.................---               
           ---.......................FF....................---             
             ---....................FF.......................---           
               ---.................FF..........................---         
                 ---..............FF.............................---       
                   ---...........FF................................----    
                     ---........FF...................................---   
                       ---.....FF......................................--- 
                         ---.............................................--
                           ---............................................|
                             ----------------------------------------------`;

export async function bigrm8_level() {
    const des = {
        level_init: lspo_level_init,
        level_flags: lspo_level_flags,
        map: lspo_map_full,
        replace_terrain: (o) => lspo_replace_terrain(o),
        region: (sel, lit) => lspo_region_sel(sel, lit),
        stair: (d) => lspo_stair(d),
        non_diggable: () => lspo_non_diggable(),
        object: () => lspo_object(),
        trap: () => lspo_trap(),
        monster: () => lspo_monster(),
    };
    const selection = { area: l_selection_fillrect };

    des.level_init({ style: 'solidfill', fg: ' ' });
    des.level_flags('mazelevel');

    des.map(BIGRM8_MAP);

    if (percent(40)) {
        const terrain = ['L', '}', 'T', '.', '-', 'C'];
        const tidx = mathrandom(1, terrain.length);
        des.replace_terrain({ region: [0, 0, 74, 17], fromterrain: 'F',
                              toterrain: terrain[tidx - 1] });
    }

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
