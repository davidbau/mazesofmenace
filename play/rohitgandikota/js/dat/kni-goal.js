// dat/kni-goal.js — the Knight quest goal level.
// C ref: dat/Kni-goal.lua
//
// Ixoth's isle: a lit western shore of pools, the unlit dragon ground
// with The Magic Mirror of Merlin under Ixoth, a 15-object hoard block,
// and quasit/jelly swarms.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_region_full, lspo_stair, lspo_object, lspo_trap,
         lspo_monster, lspo_non_diggable } from '../sp_lev.js';

const KNI_GOAL_MAP = `....PPPP..PPP..                                                             
.PPPPP...PP..     ..........     .................................          
..PPPPP...P..    ...........    ...................................         
..PPP.......   ...........    ......................................        
...PPP.......    .........     ...............   .....................      
...........    ............    ............     ......................      
............   .............      .......     .....................         
..............................            .........................         
...............................   ..................................        
.............................    ....................................       
.........    ......................................................         
.....PP...    .....................................................         
.....PPP....    ....................................................        
......PPP....   ..............   ....................................       
.......PPP....  .............    .....................................      
........PP...    ............    ......................................     
...PPP........     ..........     ..................................        
..PPPPP........     ..........     ..............................           
....PPPPP......       .........     ..........................              
.......PPPP...                                                              `;

export async function knigoal_level() {
    const des = {
        level_init: lspo_level_init,
        level_flags: lspo_level_flags,
        map: lspo_map_full,
        region: (sel, lit) => lspo_region_full(
            Array.isArray(sel) ? { area: sel, lit: lit === 'lit' } : sel),
        stair: (d, x, y) => lspo_stair(d, x, y),
        non_diggable: (s) => lspo_non_diggable(s[0], s[1], s[2], s[3]),
        object: (a, x, y, o) => lspo_object(a, x, y, o),
        trap: (t, x, y) => lspo_trap(t, x, y),
        monster: (a, x, y, o) => lspo_monster(a, x, y, o),
    };
    const selection = { area: (x1, y1, x2, y2) => [x1, y1, x2, y2] };

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel');

    des.map(KNI_GOAL_MAP);
    /* Dungeon Description */
    des.region(selection.area(0, 0, 14, 19), 'lit');
    des.region(selection.area(15, 0, 75, 19), 'unlit');
    /* Stairs */
    des.stair('up', 3, 8);
    /* Non diggable walls */
    des.non_diggable(selection.area(0, 0, 75, 19));
    /* Objects */
    des.object({ id: 'mirror', x: 50, y: 6, buc: 'blessed', spe: 0,
                 name: 'The Magic Mirror of Merlin' });
    des.object({ coord: [33, 1] });
    des.object({ coord: [33, 2] });
    des.object({ coord: [33, 3] });
    des.object({ coord: [33, 4] });
    des.object({ coord: [33, 5] });
    des.object({ coord: [34, 1] });
    des.object({ coord: [34, 2] });
    des.object({ coord: [34, 3] });
    des.object({ coord: [34, 4] });
    des.object({ coord: [34, 5] });
    des.object({ coord: [35, 1] });
    des.object({ coord: [35, 2] });
    des.object({ coord: [35, 3] });
    des.object({ coord: [35, 4] });
    des.object({ coord: [35, 5] });
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    /* Random traps */
    des.trap('spiked pit', 13, 7);
    des.trap('spiked pit', 12, 8);
    des.trap('spiked pit', 12, 9);
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    /* Random monsters. */
    des.monster({ id: 'Ixoth', x: 50, y: 6, peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ class: 'i', peaceful: 0 });
    des.monster({ class: 'i', peaceful: 0 });
    des.monster({ id: 'ochre jelly', peaceful: 0 });
    des.monster({ id: 'ochre jelly', peaceful: 0 });
    des.monster({ id: 'ochre jelly', peaceful: 0 });
    des.monster({ id: 'ochre jelly', peaceful: 0 });
    des.monster({ id: 'ochre jelly', peaceful: 0 });
    des.monster({ id: 'ochre jelly', peaceful: 0 });
    des.monster({ id: 'ochre jelly', peaceful: 0 });
    des.monster({ id: 'ochre jelly', peaceful: 0 });
    des.monster({ class: 'j', peaceful: 0 });
}
