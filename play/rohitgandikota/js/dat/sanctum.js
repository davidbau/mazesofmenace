// dat/sanctum.js — Moloch's Sanctum.
// C ref: dat/sanctum.lua
//
// The invocation-level temple of Moloch: a fire-ringed temple with the
// high-altar sanctum and its priest, an irregular morgue, an invisible
// non-passwall barrier splitting the level, and Moloch's cleric horde.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_region_full, lspo_stair, lspo_door, lspo_object, lspo_trap,
         lspo_monster, lspo_altar, lspo_non_diggable, lspo_non_passwall,
         lspo_teleport_region } from '../sp_lev.js';

const SANCTUM_MAP = `
----------------------------------------------------------------------------
|             --------------                                               |
|             |............|             -------                           |
|       -------............-----         |.....|                           |
|       |......................|        --.....|            ---------      |
|    ----......................---------|......----         |.......|      |
|    |........---------..........|......+.........|     ------+---..|      |
|  ---........|.......|..........--S----|.........|     |........|..|      |
|  |..........|.......|.............|   |.........-------..----------      |
|  |..........|.......|..........----   |..........|....|..|......|        |
|  |..........|.......|..........|      --.......----+---S---S--..|        |
|  |..........---------..........|       |.......|.............|..|        |
|  ---...........................|       -----+-------S---------S---       |
|    |...........................|          |...| |......|    |....|--     |
|    ----.....................----          |...---....---  ---......|     |
|       |.....................|             |..........|    |.....----     |
|       -------...........-----             --...-------    |.....|        |
|             |...........|                  |...|          |.....|        |
|             -------------                  -----          -------        |
----------------------------------------------------------------------------
`.replace(/^\n/, '').replace(/\n$/, '');

export async function sanctum_level() {
    const des = {
        level_init: lspo_level_init,
        level_flags: lspo_level_flags,
        map: lspo_map_full,
        region: lspo_region_full,
        stair: (d, x, y) => lspo_stair(d, x, y),
        door: (state, x, y) => (typeof state === 'object')
            ? lspo_door(state) : lspo_door({ state, x, y }),
        altar: (o) => lspo_altar(o),
        object: (a, x, y, o) => lspo_object(a, x, y, o),
        trap: (t, x, y) => lspo_trap(t, x, y),
        monster: (a, x, y, o) => lspo_monster(a, x, y, o),
        non_diggable: (s) => lspo_non_diggable(s[0], s[1], s[2], s[3]),
        non_passwall: (s) => lspo_non_passwall(s[0], s[1], s[2], s[3]),
        teleport_region: lspo_teleport_region,
    };
    const selection = { area: (x1, y1, x2, y2) => [x1, y1, x2, y2] };

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'noteleport', 'hardfloor', 'nommap');
    /* This is outside the main map, below, so we must do it before adding
       that map and anchoring coordinates to it. This extends the invisible
       barrier up to the top row, which falls outside the drawn map. */
    des.non_passwall(selection.area(39, 0, 41, 0));
    des.map(SANCTUM_MAP);
    des.region({ region: [15, 7, 21, 10], lit: 1, type: 'temple', filled: 2,
                 contents: () => {
                     des.door({ wall: 'random', state: 'secret' });
                 } });
    des.altar({ x: 18, y: 8, align: 'noalign', type: 'sanctum' });
    des.region({ region: [41, 6, 48, 11], lit: 0, type: 'morgue', filled: 1,
                 irregular: 1 });
    /* Non diggable walls */
    des.non_diggable(selection.area(0, 0, 75, 19));
    /* Invisible barrier separating the left & right halves of the level */
    des.non_passwall(selection.area(37, 0, 39, 19));
    /* Doors */
    des.door('closed', 40, 6);
    des.door('locked', 62, 6);
    des.door('closed', 46, 12);
    des.door('closed', 53, 10);
    /* Surround the temple with fire */
    des.trap('fire', 13, 5);
    des.trap('fire', 14, 5);
    des.trap('fire', 15, 5);
    des.trap('fire', 16, 5);
    des.trap('fire', 17, 5);
    des.trap('fire', 18, 5);
    des.trap('fire', 19, 5);
    des.trap('fire', 20, 5);
    des.trap('fire', 21, 5);
    des.trap('fire', 22, 5);
    des.trap('fire', 23, 5);
    des.trap('fire', 13, 12);
    des.trap('fire', 14, 12);
    des.trap('fire', 15, 12);
    des.trap('fire', 16, 12);
    des.trap('fire', 17, 12);
    des.trap('fire', 18, 12);
    des.trap('fire', 19, 12);
    des.trap('fire', 20, 12);
    des.trap('fire', 21, 12);
    des.trap('fire', 22, 12);
    des.trap('fire', 23, 12);
    des.trap('fire', 13, 6);
    des.trap('fire', 13, 7);
    des.trap('fire', 13, 8);
    des.trap('fire', 13, 9);
    des.trap('fire', 13, 10);
    des.trap('fire', 13, 11);
    des.trap('fire', 23, 6);
    des.trap('fire', 23, 7);
    des.trap('fire', 23, 8);
    des.trap('fire', 23, 9);
    des.trap('fire', 23, 10);
    des.trap('fire', 23, 11);
    /* Some traps. */
    des.trap('spiked pit');
    des.trap('fire');
    des.trap('sleep gas');
    des.trap('anti magic');
    des.trap('fire');
    des.trap('magic');
    /* Some random objects */
    des.object('[');
    des.object('[');
    des.object('[');
    des.object('[');
    des.object(')');
    des.object(')');
    des.object('*');
    des.object('!');
    des.object('!');
    des.object('!');
    des.object('!');
    des.object('?');
    des.object('?');
    des.object('?');
    des.object('?');
    des.object('?');
    /* Some monsters. */
    des.monster({ id: 'horned devil', x: 14, y: 12, peaceful: 0 });
    des.monster({ id: 'barbed devil', x: 18, y: 8, peaceful: 0 });
    des.monster({ id: 'erinys', x: 10, y: 4, peaceful: 0 });
    des.monster({ id: 'marilith', x: 7, y: 9, peaceful: 0 });
    des.monster({ id: 'nalfeshnee', x: 27, y: 8, peaceful: 0 });
    /* Moloch's horde */
    des.monster({ id: 'aligned cleric', x: 20, y: 3, align: 'noalign',
                  peaceful: 0 });
    des.monster({ id: 'aligned cleric', x: 15, y: 4, align: 'noalign',
                  peaceful: 0 });
    des.monster({ id: 'aligned cleric', x: 11, y: 5, align: 'noalign',
                  peaceful: 0 });
    des.monster({ id: 'aligned cleric', x: 11, y: 7, align: 'noalign',
                  peaceful: 0 });
    des.monster({ id: 'aligned cleric', x: 11, y: 9, align: 'noalign',
                  peaceful: 0 });
    des.monster({ id: 'aligned cleric', x: 11, y: 12, align: 'noalign',
                  peaceful: 0 });
    des.monster({ id: 'aligned cleric', x: 15, y: 13, align: 'noalign',
                  peaceful: 0 });
    des.monster({ id: 'aligned cleric', x: 17, y: 13, align: 'noalign',
                  peaceful: 0 });
    des.monster({ id: 'aligned cleric', x: 21, y: 13, align: 'noalign',
                  peaceful: 0 });
    /* A few nasties */
    des.monster('L');
    des.monster('L');
    des.monster('V');
    des.monster('V');
    des.monster('V');
    des.stair('up', 63, 15);
    /* Teleporting to this level is allowed after the invocation creates its
       entrance.  Force arrival in that case to be on rightmost third of
       level. */
    des.teleport_region({ region: [54, 1, 79, 18], region_islev: 1,
                          dir: 'down' });
}
