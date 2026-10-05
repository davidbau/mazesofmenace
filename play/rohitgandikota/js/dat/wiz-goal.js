// dat/wiz-goal.js — the Wizard quest goal level.
// C ref: dat/Wiz-goal.lua
//
// The Dark One's dungeon block: a temple holding The Eye of the
// Aethiopica (the Lua's "aligned" key is a typo the C ignores, so the
// altar align falls to the default random), iron-barred cells with named
// captives, and bat/imp swarms.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_region_full, lspo_stair, lspo_door, lspo_object, lspo_trap,
         lspo_monster, lspo_altar, lspo_non_diggable } from '../sp_lev.js';

const WIZ_GOAL_MAP = `                                                                            
                                                                            
                                                                            
                   -------------                 -------------              
                   |...........|                 |...........|              
            -------|...........-------------------...........|              
            |......S...........|..|..|..|..|..|..|...........|              
            |......|...........|..|..|..|..|..|..|...........|              
            |......|...........-F+-F+-F+-F+-F+-F+-...........|              
            --S----|...........S.................+...........|              
            |......|...........-F+-F+-F+-F+-F+-F+-...........|              
            |......|...........|..|..|..|..|..|..|...........|              
            |......|...........|..|..|..|..|..|..|...........|              
            -------|...........-------------------...........|              
                   |...........|                 |...........|              
                   -------------                 -------------              
                                                                            
                                                                            
                                                                            
                                                                            `;

export async function wizgoal_level() {
    const des = {
        level_init: lspo_level_init,
        level_flags: lspo_level_flags,
        map: lspo_map_full,
        region: (sel, lit) => lspo_region_full(
            Array.isArray(sel) ? { area: sel, lit: lit === 'lit' } : sel),
        door: (state, x, y) => lspo_door({ state, x, y }),
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

    des.map(WIZ_GOAL_MAP);
    /* Dungeon Description */
    des.region({ region: [13, 10, 18, 12], lit: 0, type: 'temple',
                 filled: 2 });
    des.region(selection.area(13, 6, 18, 8), 'lit');
    des.region(selection.area(20, 4, 30, 14), 'unlit');
    des.region(selection.area(32, 6, 33, 7), 'unlit');
    des.region(selection.area(35, 6, 36, 7), 'unlit');
    des.region(selection.area(38, 6, 39, 7), 'unlit');
    des.region(selection.area(41, 6, 42, 7), 'unlit');
    des.region(selection.area(44, 6, 45, 7), 'unlit');
    des.region(selection.area(47, 6, 48, 7), 'unlit');
    des.region(selection.area(32, 9, 48, 9), 'unlit');
    des.region(selection.area(32, 11, 33, 12), 'unlit');
    des.region(selection.area(35, 11, 36, 12), 'unlit');
    des.region(selection.area(38, 11, 39, 12), 'unlit');
    des.region(selection.area(41, 11, 42, 12), 'unlit');
    des.region(selection.area(44, 11, 45, 12), 'unlit');
    des.region(selection.area(47, 11, 48, 12), 'unlit');
    des.region(selection.area(50, 4, 60, 14), 'lit');
    /* Doors */
    des.door('locked', 19, 6);
    des.door('locked', 14, 9);
    des.door('locked', 31, 9);
    des.door('locked', 33, 8);
    des.door('locked', 36, 8);
    des.door('locked', 39, 8);
    des.door('locked', 42, 8);
    des.door('locked', 45, 8);
    des.door('locked', 48, 8);
    des.door('locked', 33, 10);
    des.door('locked', 36, 10);
    des.door('locked', 39, 10);
    des.door('locked', 42, 10);
    des.door('locked', 45, 10);
    des.door('locked', 48, 10);
    des.door('locked', 49, 9);
    /* Stairs */
    des.stair('up', 55, 5);
    /* Non diggable walls */
    des.non_diggable(selection.area(0, 0, 75, 19));
    /* The altar.  This is not a shrine. */
    /* the Lua key is "aligned", which get_table_align never reads, so the
       align option is absent and defaults to "random" — port the typo */
    des.altar({ coord: [16, 11], type: 'altar' });
    /* Objects */
    des.object({ id: 'amulet of ESP', x: 16, y: 11, buc: 'blessed', spe: 0,
                 name: 'The Eye of the Aethiopica' });
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
    /* Random monsters. */
    des.monster('Dark One', 16, 11);
    /* the Lua tables carry a bare `random` (a nil global), so the entry
       contributes nothing — class plus peaceful is the whole spec */
    des.monster({ class: 'B', peaceful: 0 });
    des.monster({ class: 'B', peaceful: 0 });
    des.monster({ class: 'B', peaceful: 0 });
    des.monster({ class: 'B', peaceful: 0 });
    des.monster({ class: 'B', peaceful: 0 });
    des.monster({ class: 'B', peaceful: 0 });
    des.monster({ class: 'B', peaceful: 0 });
    des.monster({ class: 'B', peaceful: 0 });
    des.monster({ class: 'B', peaceful: 0 });
    des.monster({ class: 'B', peaceful: 0 });
    des.monster({ class: 'B', peaceful: 0 });
    des.monster({ class: 'i', peaceful: 0 });
    des.monster({ class: 'i', peaceful: 0 });
    des.monster({ class: 'i', peaceful: 0 });
    des.monster({ class: 'i', peaceful: 0 });
    des.monster({ class: 'i', peaceful: 0 });
    des.monster({ class: 'i', peaceful: 0 });
    des.monster({ class: 'i', peaceful: 0 });
    des.monster('vampire bat');
    des.monster('vampire bat');
    des.monster('vampire bat');
    des.monster('vampire bat');
    des.monster('vampire bat');
    des.monster('vampire bat');
    des.monster('vampire bat');
    des.monster('vampire bat');
    des.monster({ class: 'i', peaceful: 0 });
    /* Captive Monsters in the dungeon */
    des.monster({ id: 'rogue', x: 35, y: 6, peaceful: 1, name: 'Pug' });
    des.monster({ id: 'owlbear', x: 47, y: 6, peaceful: 1, asleep: 1 });
    des.monster({ id: 'wizard', x: 32, y: 11, peaceful: 1, asleep: 1,
                  name: 'Newt' });
    des.monster({ id: 'Grey-elf', x: 44, y: 11, peaceful: 1 });
    des.monster({ id: 'hill giant', x: 47, y: 11, peaceful: 1, asleep: 1 });
    des.monster({ id: 'gnomish wizard', x: 38, y: 6, peaceful: 1 });
    des.monster({ id: 'prisoner', x: 35, y: 11, peaceful: 1 });
    des.monster({ id: 'prisoner', x: 41, y: 11, peaceful: 1, asleep: 1 });
}
