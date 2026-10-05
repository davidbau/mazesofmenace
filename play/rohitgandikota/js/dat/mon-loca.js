// dat/mon-loca.js — the Monk quest locate level.
// C ref: dat/Mon-loca.lua
//
// The earth-elemental canyon: random stairs, blessed spinach tins on a
// random floor square burned with Elbereth, and elemental/xorn packs.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_region_full, lspo_stair, lspo_object, lspo_trap,
         lspo_monster, lspo_non_diggable, lspo_engraving,
         l_selection_negate, l_selection_filter_mapchar } from '../sp_lev.js';
import { selection_rndcoord } from '../selvar.js';

const MON_LOCA_MAP = `             ----------------------------------------------------   --------
           ---.................................................-    --.....|
         ---...--------........------........................---     ---...|
       ---.....-      --.......-    ----..................----         --.--
     ---.....----      ---------       --..................--         --..| 
   ---...-----                       ----.----.....----.....---      --..|| 
----..----                       -----..---  |...---  |.......---   --...|  
|...---                       ----....---    |.---    |.........-- --...||  
|...-                      ----.....---     ----      |..........---....|   
|...----                ----......---       |         |...|.......-....||   
|......-----          ---.........-         |     -----...|............|    
|..........-----   ----...........---       -------......||...........||    
|..............-----................---     |............|||..........|     
|-S----...............................---   |...........|| |.........||     
|.....|..............------.............-----..........||  ||........|      
|.....|.............--    ---.........................||    |.......||      
|.....|.............-       ---.....................--|     ||......|       
|---S--------.......----      --.................----        |.....||       
|...........|..........--------..............-----           ||....|        
|...........|............................-----                |....|        
------------------------------------------                    ------        `;

export async function monloca_level() {
    const des = {
        level_init: lspo_level_init,
        level_flags: lspo_level_flags,
        map: lspo_map_full,
        region: (sel, lit) => lspo_region_full(
            Array.isArray(sel) ? { area: sel, lit: lit === 'lit' } : sel),
        stair: (d, x, y) => lspo_stair(d, x, y),
        non_diggable: (s) => lspo_non_diggable(s[0], s[1], s[2], s[3]),
        object: (a, x, y, o) => lspo_object(a, x, y, o),
        engraving: (o) => lspo_engraving(o),
        trap: (t, x, y) => lspo_trap(t, x, y),
        monster: (a, x, y, o) => lspo_monster(a, x, y, o),
    };
    const selection = { area: (x1, y1, x2, y2) => [x1, y1, x2, y2] };

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel');

    des.map(MON_LOCA_MAP);
    /* Random Monsters */

    /* Dungeon Description */
    des.region(selection.area(0, 0, 75, 20), 'lit');
    /* Stairs */
    des.stair('up');
    des.stair('down');
    /* Non diggable walls */
    des.non_diggable(selection.area(0, 0, 75, 20));
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
    /* since vegetarian monks shouldn't eat giant corpses, give a chance for
       Str boost that isn't throttled by exercise restrictions;
       make a modest effort (Elbereth only) to prevent xorns from eating the
       tins */
    const tinplace = l_selection_filter_mapchar(l_selection_negate(), '.');
    const tinloc = selection_rndcoord(tinplace, 0);
    des.object({ id: 'tin', coord: tinloc, quantity: 2, buc: 'blessed',
                 montype: 'spinach' });
    des.engraving({ coord: tinloc, type: 'burn', text: 'Elbereth' });
    /* Random traps */
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    /* Random monsters. */
    des.monster('earth elemental');
    des.monster('earth elemental');
    des.monster('earth elemental');
    des.monster('earth elemental');
    des.monster('earth elemental');
    des.monster('earth elemental');
    des.monster('earth elemental');
    des.monster('earth elemental');
    des.monster('earth elemental');
    des.monster('earth elemental');
    des.monster('earth elemental');
    des.monster('earth elemental');
    des.monster('earth elemental');
    des.monster('earth elemental');
    des.monster('xorn');
    des.monster('xorn');
    des.monster('xorn');
    des.monster('xorn');
    des.monster('xorn');
    des.monster('xorn');
    des.monster('xorn');
    des.monster('xorn');
    des.monster('xorn');
}
