// dat/bigrm-10.js — big room variant 10, the "fog maze".
// C ref: dat/bigrm-10.lua
//
// The interior is a lattice of 'C' (cloud) squares. 40% of the time it stays a
// fog maze; the other 60% two replace_terrain passes break it up, the first
// turning 5% of the C squares to floor and the second converting the rest to
// one randomly chosen terrain.
//
// Draw order matters and is C's: percent(40) spends one rn2(100) ALWAYS, and
// only inside that branch does math.random(1, #terrain) spend its rn2(5).

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_replace_terrain, lspo_region_full, lspo_stair,
         lspo_teleport_region, lspo_levregion, lspo_mazewalk,
         lspo_object, lspo_trap, lspo_monster } from '../sp_lev.js';
import { percent } from '../nhlua.js';
import { rn2 } from '../rng.js';

const BIGRM10_MAP = `
.......................................................................
.......................................................................
.......................................................................
.......................................................................
...C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C...
...CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC...
...C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C...
...CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC...
...C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C...
...CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC...
...C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C...
...CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC...
...C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C...
...CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC...
...C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C...
.......................................................................
.......................................................................
.......................................................................
.......................................................................
`;

export async function bigrm10_level() {
    const des = {
        level_init: lspo_level_init,
        level_flags: lspo_level_flags,
        map: lspo_map_full,
        replace_terrain: (o) => lspo_replace_terrain(o),
        region: (o) => lspo_region_full(o),
        teleport_region: (o) => lspo_teleport_region(o),
        levregion: (o) => lspo_levregion(o),
        mazewalk: (o) => lspo_mazewalk(o),
        stair: (d) => lspo_stair(d),
        object: (a, x, y, o) => lspo_object(a, x, y, o),
        trap: () => lspo_trap(),
        monster: (a, x, y, o) => lspo_monster(a, x, y, o),
    };

    des.level_init({ style: 'solidfill', fg: ' ' });
    des.level_flags('mazelevel', 'noflip');
    des.map(BIGRM10_MAP);

    if (percent(40)) {
        /* occasionally it's not a fog maze */
        const terrain = ['L', '}', 'T', '-', 'F'];
        const tidx = rn2(terrain.length);   /* math.random(1, #terrain) */
        /* break it up a bit */
        des.replace_terrain({ region: [0, 0, 70, 18], fromterrain: 'C',
                              toterrain: '.', chance: 5 });
        des.replace_terrain({ region: [0, 0, 70, 18], fromterrain: 'C',
                              toterrain: terrain[tidx] });
    }

    des.region({ area: [0, 0, 70, 18], lit: 1 });

    /* when falling down on this level, never end up in the fog maze */
    des.teleport_region({ region: [0, 0, 70, 18], exclude: [2, 3, 68, 15],
                          dir: 'down' });

    for (let i = 0; i < 15; i++)
        des.object();
    for (let i = 0; i < 6; i++)
        des.trap();
    for (let i = 0; i < 28; i++)
        des.monster();

    des.mazewalk({ x: 4, y: 2, dir: 'south', stocked: 0 });

    /* Stairs up, not in the fog maze */
    des.levregion({ region: [0, 0, 70, 18], exclude: [2, 3, 68, 15],
                    type: 'stair-up' });
    des.stair('down');
}
