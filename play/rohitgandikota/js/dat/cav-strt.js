// dat/cav-strt.js — the Caveman quest start level.
// C ref: dat/Cav-strt.lua
//
// Shaman Karnov's caves: an irregular temple with a coaligned shrine (its
// priest is created), six occupied side caves, neanderthal guards, and a
// dozen bugbears in the outer caves. wallify() closes the cave walls.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_region_full, lspo_stair, lspo_levregion, lspo_door,
         lspo_object, lspo_trap, lspo_monster, lspo_altar,
         lspo_non_diggable, lspo_wallify } from '../sp_lev.js';

const CAV_STRT_MAP = `                                                                            
  ......     ..........................       ...        ....  ......       
 ......       ..........................     ........       ....    .....   
  ..BB      .............................    .........            ....  ..  
     ..    ......................              .......      ..     ....  .. 
     ..     ....................                     ..  .......    ..  ... 
   ..              S   BB                .....     .......   ....      .... 
    ..        ...  .   ..               ........  ..     ..   ..       ...  
     ..      ......     ..             ............       ..          ...   
       .      ....       ..             ........           ..  ...........  
  ...   ..     ..        .............                  ................... 
 .....   .....            ...............................      ...........  
  .....B................            ...                               ...   
  .....     .  ..........        .... .      ...  ..........           ...  
   ...     ..          .............  ..    ...................        .... 
          BB       ..   .........      BB    ...  ..........  ..   ...  ... 
       ......    .....  B          ........         ..         .. ....  ... 
     ..........  ..........         ..... ...      .....        ........    
       ..  ...    .  .....         ....    ..       ...            ..       
                                                                            `;

export async function cavstrt_level() {
    const des = {
        level_init: lspo_level_init,
        level_flags: lspo_level_flags,
        map: lspo_map_full,
        region: (sel, lit) => lspo_region_full(
            Array.isArray(sel) ? { area: sel, lit: lit === 'lit' } : sel),
        stair: (d, x, y) => lspo_stair(d, x, y),
        levregion: lspo_levregion,
        door: (state, x, y) => lspo_door({ state, x, y }),
        altar: (o) => lspo_altar(o),
        monster: (a, x, y, o) => lspo_monster(a, x, y, o),
        object: (a, x, y, o) => lspo_object(a, x, y, o),
        non_diggable: (s) => lspo_non_diggable(s[0], s[1], s[2], s[3]),
        trap: (t, x, y) => lspo_trap(t, x, y),
        wallify: lspo_wallify,
    };
    const selection = { area: (x1, y1, x2, y2) => [x1, y1, x2, y2] };

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'noteleport', 'hardfloor');

    des.map(CAV_STRT_MAP);
    /* Dungeon Description */
    des.region(selection.area(0, 0, 75, 19), 'unlit');
    des.region({ region: [13, 1, 40, 5], lit: 1, type: 'temple', filled: 1,
                 irregular: 1 });
    /* The occupied rooms. */
    des.region({ region: [2, 1, 8, 3], lit: 1, type: 'ordinary',
                 irregular: 1 });
    des.region({ region: [1, 11, 6, 14], lit: 1, type: 'ordinary',
                 irregular: 1 });
    des.region({ region: [13, 8, 18, 10], lit: 1, type: 'ordinary',
                 irregular: 1 });
    des.region({ region: [5, 17, 14, 18], lit: 1, type: 'ordinary',
                 irregular: 1 });
    des.region({ region: [17, 16, 23, 18], lit: 1, type: 'ordinary',
                 irregular: 1 });
    des.region({ region: [35, 16, 44, 18], lit: 1, type: 'ordinary',
                 irregular: 1 });
    /* Stairs */
    des.stair('down', 2, 3);
    /* Portal arrival point */
    des.levregion({ region: [71, 9, 71, 9], type: 'branch' });
    /* Doors */
    des.door('locked', 19, 6);
    /* The temple altar (this will force a priest(ess) to be created) */
    des.altar({ x: 36, y: 2, align: 'coaligned', type: 'shrine' });
    /* Shaman Karnov */
    des.monster({ id: 'Shaman Karnov', coord: [35, 2], inventory: () => {
        des.object({ id: 'leather armor', spe: 5 });
        des.object({ id: 'club', spe: 5 });
    } });
    /* The treasure of Shaman Karnov */
    des.object('chest', 34, 2);
    /* neanderthal guards for the audience chamber */
    des.monster('neanderthal', 20, 3);
    des.monster('neanderthal', 20, 2);
    des.monster('neanderthal', 20, 1);
    des.monster('neanderthal', 21, 3);
    des.monster('neanderthal', 21, 2);
    des.monster('neanderthal', 21, 1);
    des.monster('neanderthal', 22, 1);
    des.monster('neanderthal', 26, 9);
    /* Non diggable walls */
    des.non_diggable(selection.area(0, 0, 75, 19));
    /* Random traps */
    des.trap('pit', 47, 11);
    des.trap('pit', 57, 10);
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    /* Monsters on siege duty (in the outer caves). */
    des.monster({ id: 'bugbear', x: 47, y: 2, peaceful: 0 });
    des.monster({ id: 'bugbear', x: 48, y: 3, peaceful: 0 });
    des.monster({ id: 'bugbear', x: 49, y: 4, peaceful: 0 });
    des.monster({ id: 'bugbear', x: 67, y: 3, peaceful: 0 });
    des.monster({ id: 'bugbear', x: 69, y: 4, peaceful: 0 });
    des.monster({ id: 'bugbear', x: 51, y: 13, peaceful: 0 });
    des.monster({ id: 'bugbear', x: 53, y: 14, peaceful: 0 });
    des.monster({ id: 'bugbear', x: 55, y: 15, peaceful: 0 });
    des.monster({ id: 'bugbear', x: 63, y: 10, peaceful: 0 });
    des.monster({ id: 'bugbear', x: 65, y: 9, peaceful: 0 });
    des.monster({ id: 'bugbear', x: 67, y: 10, peaceful: 0 });
    des.monster({ id: 'bugbear', x: 69, y: 11, peaceful: 0 });
    des.wallify();
}
