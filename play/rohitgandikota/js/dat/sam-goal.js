// dat/sam-goal.js — the Samurai quest goal level.
// C ref: dat/Sam-goal.lua
//
// Ashikaga Takauji's ring fortress: concentric diamond walls with three
// randomly punched holes and a random up-stair side, The Tsurugi of
// Muramasa at the center, squeaky boards, and samurai/ninja defenders.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_region_full, lspo_stair, lspo_door, lspo_terrain,
         lspo_object, lspo_trap, lspo_monster, lspo_non_diggable,
         l_selection_fillrect } from '../sp_lev.js';
import { rn2 } from '../rng.js';

/* dat/nhlib.lua math.random shim — two-arg form is a + rn2(b + 1 - a) */
const mathrandom = (a, b) => a + rn2(b + 1 - a);

const SAM_GOAL_MAP = `                                             
           .......................           
       ......-------------------......       
    ......----.................----......    
   ....----.....-------------.....----....   
  ....--.....----...........----.....--....  
  ...||....---....---------....---....||...  
  ...|....--....---.......---....--....|...  
 ....|...||...---...--+--...---...||...|.... 
 ....|...|....|....|-...-|....|....|...|.... 
 ....|...|....|....+.....+....|....|...|.... 
 ....|...|....|....|-...-|....|....|...|.... 
 ....|...||...---...--+--...---...||...|.... 
  ...|....--....---.......---....--....|...  
  ...||....---....---------....---....||...  
  ....--.....----...........----.....--....  
   ....----.....-------------.....----....   
    ......----.................----......    
       ......-------------------......       
           .......................           `;

export async function samgoal_level() {
    const des = {
        level_init: lspo_level_init,
        level_flags: lspo_level_flags,
        map: lspo_map_full,
        region: (sel, lit) => lspo_region_full(
            Array.isArray(sel) ? { area: sel, lit: lit === 'lit' } : sel),
        door: (state, x, y) => lspo_door({ state, x, y }),
        /* des.stair({ dir=..., coord=... }) — table form */
        stair: (d, x, y) => (typeof d === 'object')
            ? lspo_stair(d.dir, d.coord[0], d.coord[1])
            : lspo_stair(d, x, y),
        terrain: (sel, ch) => {
            if (Array.isArray(sel)) {
                lspo_terrain(l_selection_fillrect(sel[0], sel[1],
                                                  sel[0], sel[1]), ch);
            } else {
                lspo_terrain(sel, ch);
            }
        },
        non_diggable: (s) => lspo_non_diggable(s[0], s[1], s[2], s[3]),
        object: (a, x, y, o) => lspo_object(a, x, y, o),
        trap: (t, x, y) => lspo_trap(t, x, y),
        monster: (a, x, y, o) => lspo_monster(a, x, y, o),
    };
    const selection = { area: (x1, y1, x2, y2) => [x1, y1, x2, y2] };

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'noteleport');

    des.map(SAM_GOAL_MAP);
    /* Dungeon Description */
    const place1 = [[2, 11], [42, 9]];
    const placeidx1 = mathrandom(1, place1.length);

    des.region(selection.area(0, 0, 44, 19), 'unlit');
    /* Doors */
    des.door('closed', 19, 10);
    des.door('closed', 22, 8);
    des.door('closed', 22, 12);
    des.door('closed', 25, 10);
    /* Stairs */
    des.stair({ dir: 'up', coord: place1[placeidx1 - 1] });

    /* Holes in the concentric ring walls */
    const place2 = [[22, 14], [30, 10], [22, 6], [14, 10]];
    const placeidx2 = mathrandom(1, place2.length);
    des.terrain(place2[placeidx2 - 1], '.');
    const place3 = [[22, 4], [35, 10], [22, 16], [9, 10]];
    const placeidx3 = mathrandom(1, place3.length);
    des.terrain(place3[placeidx3 - 1], '.');
    const place4 = [[22, 2], [22, 18]];
    const placeidx4 = mathrandom(1, place4.length);
    des.terrain(place4[placeidx4 - 1], '.');

    /* Non diggable walls */
    des.non_diggable(selection.area(0, 0, 44, 19));
    /* Objects */
    des.object({ id: 'tsurugi', x: 22, y: 10, buc: 'blessed', spe: 0,
                 name: 'The Tsurugi of Muramasa' });
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

    des.trap('board', 22, 9);
    des.trap('board', 24, 10);
    des.trap('board', 22, 11);
    /* Random traps */
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    /* Random monsters. */
    des.monster('Ashikaga Takauji', 22, 10);
    des.monster({ id: 'samurai', peaceful: 0 });
    des.monster({ id: 'samurai', peaceful: 0 });
    des.monster({ id: 'samurai', peaceful: 0 });
    des.monster({ id: 'samurai', peaceful: 0 });
    des.monster({ id: 'samurai', peaceful: 0 });
    des.monster({ id: 'ninja', peaceful: 0 });
    des.monster({ id: 'ninja', peaceful: 0 });
    des.monster({ id: 'ninja', peaceful: 0 });
    des.monster({ id: 'ninja', peaceful: 0 });
    des.monster({ id: 'ninja', peaceful: 0 });
    des.monster('wolf');
    des.monster('wolf');
    des.monster('wolf');
    des.monster('wolf');
    des.monster('d');
    des.monster('d');
    des.monster('stalker');
    des.monster('stalker');
    des.monster('stalker');
    des.monster('stalker');
    des.monster('stalker');
    des.monster('stalker');
    des.monster('stalker');
    des.monster('stalker');
    des.monster('stalker');
}
