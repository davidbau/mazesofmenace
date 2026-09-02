// dat/tut-2.js — the 5.0 tutorial's second level.
// C ref: dat/tut-2.lua
//
// A single lit room with the up staircase, one burned engraving that names
// the up-stairs key exactly as nh.eckey() renders it ('<'), and a magic
// portal back out. Nothing here draws RNG.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_region_full, lspo_non_diggable, lspo_engraving,
         lspo_trap, lspo_stair } from '../sp_lev.js';

const TUT2_MAP = `
--------------
|............|
|............|
|............|
|............|
|............|
|............|
--------------`;

export async function tut2_level() {
    const des = {
        level_init: lspo_level_init,
        level_flags: lspo_level_flags,
        map: lspo_map_full,
        region: (o) => lspo_region_full(o),
        stair: (o) => lspo_stair(o.dir,
                                 Array.isArray(o.coord) ? o.coord[0] : o.coord?.x,
                                 Array.isArray(o.coord) ? o.coord[1] : o.coord?.y),
        engraving: (o) => lspo_engraving(o),
        trap: (o) => lspo_trap(o.type, undefined, undefined, o),
        non_diggable: () => lspo_non_diggable(),
    };

    des.level_init({ style: 'solidfill', fg: ' ' });
    des.level_flags('mazelevel', 'noflip',
                    'nomongen', 'nodeathdrops', 'noautosearch');

    des.map(TUT2_MAP);

    des.region({ area: [1, 1, 73, 16], lit: 1 });

    des.stair({ dir: 'up', coord: [2, 2] });

    /* nh.eckey("up") renders the default binding, '<' */
    des.engraving({ coord: [1, 1], type: 'burn',
                    text: "Use '<' to go up the stairs", degrade: false });

    des.trap({ type: 'magic portal', coord: [11, 5], seen: true });

    des.non_diggable();
}
