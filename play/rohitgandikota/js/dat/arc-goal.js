// dat/arc-goal.js — the Archeologist quest goal level.
// C ref: dat/Arc-goal.lua
//
// The Tomb of the Toltec Kings' inner sanctum: a symmetric crypt complex,
// the chaotic altar of Huhetotl bearing The Orb of Detection, the Minion of
// Huhetotl on guard, and a snake/mummy horde.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_region_full, lspo_stair, lspo_object, lspo_trap,
         lspo_monster, lspo_altar, lspo_non_diggable } from '../sp_lev.js';

const ARC_GOAL_MAP = `                                                                            
                                  ---------                                 
                                  |..|.|..|                                 
                       -----------|..S.S..|-----------                      
                       |.|........|+-|.|-+|........|.|                      
                       |.S........S..|.|..S........S.|                      
                       |.|........|..|.|..|........|.|                      
                    ------------------+------------------                   
                    |..|..........|.......|..........|..|                   
                    |..|..........+.......|..........S..|                   
                    |..S..........|.......+..........|..|                   
                    |..|..........|.......|..........|..|                   
                    ------------------+------------------                   
                       |.|........|..|.|..|........|.|                      
                       |.S........S..|.|..S........S.|                      
                       |.|........|+-|.|-+|........|.|                      
                       -----------|..S.S..|-----------                      
                                  |..|.|..|                                 
                                  ---------                                 
                                                                            `;

export async function arcgoal_level() {
    const des = {
        level_init: lspo_level_init,
        level_flags: lspo_level_flags,
        map: lspo_map_full,
        region: (sel, lit) => lspo_region_full(
            Array.isArray(sel) ? { area: sel, lit: lit === 'lit' } : sel),
        stair: (d, x, y) => lspo_stair(d, x, y),
        altar: (o) => lspo_altar(o),
        non_diggable: (s) => lspo_non_diggable(s[0], s[1], s[2], s[3]),
        object: (a, x, y, o) => lspo_object(a, x, y, o),
        trap: (t, x, y) => lspo_trap(t, x, y),
        monster: (a, x, y, o) => lspo_monster(a, x, y, o),
    };
    const selection = { area: (x1, y1, x2, y2) => [x1, y1, x2, y2] };

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel');

    des.map(ARC_GOAL_MAP);
    /* Dungeon Description */
    des.region(selection.area(0, 0, 75, 19), 'lit');
    des.region(selection.area(35, 2, 36, 3), 'unlit');
    des.region(selection.area(40, 2, 41, 3), 'unlit');
    des.region(selection.area(24, 4, 24, 6), 'unlit');
    des.region(selection.area(26, 4, 33, 6), 'lit');
    des.region(selection.area(38, 2, 38, 6), 'unlit');
    des.region(selection.area(43, 4, 50, 6), 'lit');
    des.region(selection.area(52, 4, 52, 6), 'unlit');
    des.region(selection.area(35, 5, 36, 6), 'unlit');
    des.region(selection.area(40, 5, 41, 6), 'unlit');
    des.region(selection.area(21, 8, 22, 11), 'unlit');
    des.region(selection.area(24, 8, 33, 11), 'lit');
    des.region(selection.area(35, 8, 41, 11), 'unlit');
    des.region(selection.area(43, 8, 52, 11), 'lit');
    des.region(selection.area(54, 8, 55, 11), 'unlit');
    des.region(selection.area(24, 13, 24, 15), 'unlit');
    des.region(selection.area(26, 13, 33, 15), 'unlit');
    des.region(selection.area(35, 13, 36, 14), 'unlit');
    des.region(selection.area(35, 16, 36, 17), 'unlit');
    des.region(selection.area(38, 13, 38, 17), 'unlit');
    des.region(selection.area(40, 13, 41, 14), 'unlit');
    des.region(selection.area(40, 16, 41, 17), 'unlit');
    des.region({ region: [43, 13, 50, 15], lit: 0, type: 'temple',
                 filled: 2 });
    des.region(selection.area(52, 13, 52, 15), 'unlit');
    /* Stairs */
    des.stair('up', 38, 10);
    /* Non diggable walls */
    des.non_diggable(selection.area(0, 0, 75, 19));
    /* The altar of Huhetotl.  Unattended. */
    des.altar({ x: 50, y: 14, align: 'chaos', type: 'altar' });
    /* Objects */
    des.object({ id: 'crystal ball', x: 50, y: 14, buc: 'blessed', spe: 5,
                 name: 'The Orb of Detection' });
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
    /* Random traps */
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap('rolling boulder', 46, 14);
    /* Random monsters. */
    des.monster('Minion of Huhetotl', 50, 14);
    des.monster('S');
    des.monster('S');
    des.monster('S');
    des.monster('S');
    des.monster('S');
    des.monster('S');
    des.monster('S');
    des.monster('S');
    des.monster('S');
    des.monster('S');
    des.monster('S');
    des.monster('S');
    des.monster('S');
    des.monster('S');
    des.monster('S');
    des.monster('S');
    des.monster('S');
    des.monster('S');
    des.monster('human mummy');
    des.monster('human mummy');
    des.monster('human mummy');
    des.monster('human mummy');
    des.monster('human mummy');
    des.monster('human mummy');
    des.monster('human mummy');
    des.monster('human mummy');
    des.monster('M');
}
