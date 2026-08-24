// dat/bigrm-5.js — big room variant 5, the rhombus.
// C ref: dat/bigrm-5.lua
//
// A big diamond-shaped hall. 25% of the time, 2% of the floor squares are
// picked (one rn2(100) per floor square), the picked set grown by one, and
// that area's floor turned to ice or clouds — the toterrain percent(50)
// draws while the des.replace_terrain argument table is built, i.e. after
// the percentage pass and before the replace pass's own rn2(100)s.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_replace_terrain, lspo_region_sel, lspo_stair,
         lspo_non_diggable, lspo_object, lspo_trap, lspo_monster,
         l_selection_fillrect, l_selection_match,
         l_selection_grow } from '../sp_lev.js';
import { selection_filter_percent } from '../selvar.js';
import { percent } from '../nhlua.js';

const BIGRM5_MAP = `
                            ------------------                            
                    ---------................---------                    
              -------................................-------              
         ------............................................------         
      ----......................................................----      
    ---............................................................---    
  ---................................................................---  
---....................................................................---
|........................................................................|
|........................................................................|
|........................................................................|
---....................................................................---
  ---................................................................---  
    ---............................................................---    
      ----......................................................----      
         ------............................................------         
              -------................................-------              
                    ---------................---------                    
                            ------------------                            `;

export async function bigrm5_level() {
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
    const selection = {
        area: l_selection_fillrect,
        match: l_selection_match,
    };

    des.level_init({ style: 'solidfill', fg: ' ' });
    des.level_flags('mazelevel', 'noflip');

    des.map(BIGRM5_MAP);

    if (percent(25)) {
        /* selection.match("."):percentage(2):grow() */
        const sel = l_selection_grow(
            selection_filter_percent(selection.match('.'), 2));
        des.replace_terrain({ selection: sel, fromterrain: '.',
                              toterrain: percent(50) ? 'I' : 'C' });
    }

    des.region(selection.area(0, 0, 72, 18), 'lit');

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
