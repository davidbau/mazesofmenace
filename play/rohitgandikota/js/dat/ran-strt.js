// dat/ran-strt.js — the Ranger quest start level.
// C ref: dat/Ran-strt.lua
//
// Orion's camp in the arboreal ring maze: a left-aligned map over a
// treed mines field, eight hunter guards, a sleeping minotaur in the
// ring, and forest centaur siege squads at the four gates.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_replace_terrain, lspo_region_full, lspo_stair,
         lspo_levregion, lspo_object, lspo_trap, lspo_monster,
         lspo_non_diggable } from '../sp_lev.js';

const RAN_STRT_MAP = `                                       xx
   ...................................  x
  ..                                 ..  
 ..  ...............F...............  .. 
 .  ..             .F.             ..  . 
 . ..  .............F.............  .. . 
 . .  ..                         ..  . . 
 . . ..  .......................  .. ... 
 . . .  ..                     ..  .     
 ... . ..  .|..................... ......
 FFF . .  ..S..................          
 ... . ..  .|.................  .... ... 
 . . .  ..                     ..  . . . 
 . . ..  .......................  .. . . 
 . .  ..                         ..  . . 
 . ..  .............F.............  .. . 
 .  ..             .F.             ..  . 
 ..  ...............F...............  .. 
  ..                                 ..  
   ...................................  x
                                       xx`;

export async function ranstrt_level() {
    const des = {
        level_init: lspo_level_init,
        level_flags: lspo_level_flags,
        map: lspo_map_full,
        replace_terrain: (o) => lspo_replace_terrain(o),
        region: (sel, lit) => lspo_region_full(
            Array.isArray(sel) ? { area: sel, lit: lit === 'lit' } : sel),
        stair: (d, x, y) => lspo_stair(d, x, y),
        levregion: lspo_levregion,
        monster: (a, x, y, o) => lspo_monster(a, x, y, o),
        object: (a, x, y, o) => lspo_object(a, x, y, o),
        non_diggable: (s) => lspo_non_diggable(s[0], s[1], s[2], s[3]),
        trap: (t, x, y) => lspo_trap(t, x, y),
    };
    const selection = { area: (x1, y1, x2, y2) => [x1, y1, x2, y2] };

    des.level_init({ style: 'solidfill', fg: '.' });

    des.level_flags('mazelevel', 'noteleport', 'hardfloor', 'arboreal');

    des.level_init({ style: 'mines', fg: '.', bg: '.', smoothed: true,
                     joined: true, lit: 1, walled: false });
    des.replace_terrain({ region: [0, 0, 76, 19], fromterrain: '.',
                          toterrain: 'T', chance: 5 });
    des.map({ halign: 'left', valign: 'center', map: RAN_STRT_MAP });
    /* Dungeon Description */
    des.region(selection.area(0, 0, 40, 20), 'lit');
    /* Stairs */
    des.stair('down', 10, 10);
    /* Portal arrival point; just about anywhere on the right hand side of
       the map */
    des.levregion({ region: [51, 2, 77, 18], region_islev: 1,
                    type: 'branch' });
    /* Orion */
    des.monster({ id: 'Orion', coord: [20, 10], inventory: () => {
        des.object({ id: 'leather armor', spe: 4 });
        des.object({ id: 'yumi', spe: 4 });
        des.object({ id: 'ya', spe: 4, quantity: 50 });
    } });
    /* The treasure of Orion */
    des.object('chest', 20, 10);
    /* Guards for the audience chamber */
    des.monster('hunter', 19, 9);
    des.monster('hunter', 20, 9);
    des.monster('hunter', 21, 9);
    des.monster('hunter', 19, 10);
    des.monster('hunter', 21, 10);
    des.monster('hunter', 19, 11);
    des.monster('hunter', 20, 11);
    des.monster('hunter', 21, 11);
    /* Non diggable walls */
    des.non_diggable(selection.area(0, 0, 40, 20));
    /* Traps */
    des.trap('arrow', 30, 9);
    des.trap('arrow', 30, 10);
    des.trap('pit', 40, 9);
    des.trap('spiked pit');
    des.trap('bear');
    des.trap('bear');
    /* Monsters on siege duty. */
    des.monster({ id: 'minotaur', x: 33, y: 9, peaceful: 0, asleep: 1 });
    des.monster({ id: 'forest centaur', x: 19, y: 3, peaceful: 0 });
    des.monster({ id: 'forest centaur', x: 19, y: 4, peaceful: 0 });
    des.monster({ id: 'forest centaur', x: 19, y: 5, peaceful: 0 });
    des.monster({ id: 'forest centaur', x: 21, y: 3, peaceful: 0 });
    des.monster({ id: 'forest centaur', x: 21, y: 4, peaceful: 0 });
    des.monster({ id: 'forest centaur', x: 21, y: 5, peaceful: 0 });
    des.monster({ id: 'forest centaur', x: 1, y: 9, peaceful: 0 });
    des.monster({ id: 'forest centaur', x: 2, y: 9, peaceful: 0 });
    des.monster({ id: 'forest centaur', x: 3, y: 9, peaceful: 0 });
    des.monster({ id: 'forest centaur', x: 1, y: 11, peaceful: 0 });
    des.monster({ id: 'forest centaur', x: 2, y: 11, peaceful: 0 });
    des.monster({ id: 'forest centaur', x: 3, y: 11, peaceful: 0 });
    des.monster({ id: 'forest centaur', x: 19, y: 15, peaceful: 0 });
    des.monster({ id: 'forest centaur', x: 19, y: 16, peaceful: 0 });
    des.monster({ id: 'forest centaur', x: 19, y: 17, peaceful: 0 });
    des.monster({ id: 'forest centaur', x: 21, y: 15, peaceful: 0 });
    des.monster({ id: 'forest centaur', x: 21, y: 16, peaceful: 0 });
    des.monster({ id: 'forest centaur', x: 21, y: 17, peaceful: 0 });
    des.monster({ id: 'plains centaur', peaceful: 0 });
    des.monster({ id: 'plains centaur', peaceful: 0 });
    des.monster({ id: 'plains centaur', peaceful: 0 });
    des.monster({ id: 'plains centaur', peaceful: 0 });
    des.monster({ id: 'plains centaur', peaceful: 0 });
    des.monster({ id: 'plains centaur', peaceful: 0 });
    des.monster({ id: 'scorpion', peaceful: 0 });
    des.monster({ id: 'scorpion', peaceful: 0 });
}
