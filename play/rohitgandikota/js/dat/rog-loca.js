// dat/rog-loca.js — the Rogue quest locate level.
// C ref: dat/Rog-loca.lua
//
// The winding approach canyon: random stairs, a cursed teleport scroll
// planted near the southwest cell, and leprechaun/naga/chameleon packs.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_region_full, lspo_stair, lspo_object, lspo_trap,
         lspo_monster, lspo_non_diggable } from '../sp_lev.js';

const ROG_LOCA_MAP = `             ----------------------------------------------------   --------
           ---.................................................-    --.....|
         ---...--------........-------.......................---     ---...|
       ---.....-      ---......-     ---..................----         --.--
     ---.....----       --------       --..................--         --..| 
   ---...-----                       ----.----.....----.....---      --..|| 
----..----                       -----..---  |...---  |.......---   --...|  
|...---                       ----....---    |.---    |.........-- --...||  
|...-                      ----.....---     ----      |..........---....|   
|...----                ----......---       |         |...|.......-....||   
|......-----          ---.........-         |     -----...|............|    
|..........-----   ----...........---       -------......||...........||    
|..............-----................---     |............|||..........|     
|------...............................---   |...........|| |.........||     
|.....|..............------.............-----..........||  ||........|      
|.....|.............--    ---.........................||    |.......||      
|.....|.............-       ---.....................--|     ||......|       
|-S----------.......----      --.................----        |.....||       
|...........|..........--------..............-----           ||....|        
|...........|............................-----                |....|        
------------------------------------------                    ------        `;

export async function rogloca_level() {
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

    des.map(ROG_LOCA_MAP);
    des.region(selection.area(0, 0, 75, 20), 'lit');
    des.stair('up');
    des.stair('down');
    des.non_diggable(selection.area(0, 0, 75, 20));
    des.object({ id: 'scroll of teleportation', x: 11, y: 18, buc: 'cursed',
                 spe: 0 });
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
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.monster({ id: 'leprechaun', peaceful: 0 });
    des.monster({ id: 'leprechaun', peaceful: 0 });
    des.monster({ id: 'leprechaun', peaceful: 0 });
    des.monster({ id: 'leprechaun', peaceful: 0 });
    des.monster({ id: 'leprechaun', peaceful: 0 });
    des.monster({ id: 'leprechaun', peaceful: 0 });
    des.monster({ id: 'leprechaun', peaceful: 0 });
    des.monster({ id: 'leprechaun', peaceful: 0 });
    des.monster({ id: 'leprechaun', peaceful: 0 });
    des.monster({ id: 'leprechaun', peaceful: 0 });
    des.monster({ id: 'leprechaun', peaceful: 0 });
    des.monster({ id: 'leprechaun', peaceful: 0 });
    des.monster({ id: 'leprechaun', peaceful: 0 });
    des.monster({ id: 'leprechaun', peaceful: 0 });
    des.monster({ id: 'leprechaun', peaceful: 0 });
    des.monster({ id: 'leprechaun', peaceful: 0 });
    des.monster({ id: 'leprechaun', peaceful: 0 });
    des.monster({ class: 'l', peaceful: 0 });
    des.monster({ id: 'guardian naga', peaceful: 0 });
    des.monster({ id: 'guardian naga', peaceful: 0 });
    des.monster({ id: 'guardian naga', peaceful: 0 });
    des.monster({ id: 'guardian naga', peaceful: 0 });
    des.monster({ id: 'guardian naga', peaceful: 0 });
    des.monster({ id: 'guardian naga', peaceful: 0 });
    des.monster({ id: 'guardian naga', peaceful: 0 });
    des.monster({ class: 'N', peaceful: 0 });
    des.monster({ class: 'N', peaceful: 0 });
    des.monster({ class: 'N', peaceful: 0 });
    des.monster({ id: 'chameleon', peaceful: 0 });
    des.monster({ id: 'chameleon', peaceful: 0 });
    des.monster({ id: 'chameleon', peaceful: 0 });
    des.monster({ id: 'chameleon', peaceful: 0 });
    des.monster({ id: 'chameleon', peaceful: 0 });
}
