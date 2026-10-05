// dat/pri-loca.js — the Priest quest locate level.
// C ref: dat/Pri-loca.lua
//
// The graveyard ringing a walled temple: a lit-field mines init, four
// morgue regions filling the outside, the irregular temple with its
// unaligned shrine and a hostile aligned cleric, and antechamber loot.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_region_full, lspo_stair, lspo_door, lspo_object,
         lspo_trap, lspo_monster, lspo_altar,
         lspo_non_diggable } from '../sp_lev.js';

const PRI_LOCA_MAP = `........................................
........................................
..........----------+----------.........
..........|........|.|........|.........
..........|........|.|........|.........
..........|----.----.----.----|.........
..........+...................+.........
..........+...................+.........
..........|----.----.----.----|.........
..........|........|.|........|.........
..........|........|.|........|.........
..........----------+----------.........
........................................
........................................`;

export async function priloca_level() {
    const des = {
        level_init: lspo_level_init,
        level_flags: lspo_level_flags,
        map: lspo_map_full,
        region: (sel, lit) => lspo_region_full(
            Array.isArray(sel) ? { area: sel, lit: lit === 'lit' } : sel),
        altar: (o) => lspo_altar(o),
        monster: (a, x, y, o) => lspo_monster(a, x, y, o),
        door: (state, x, y) => lspo_door({ state, x, y }),
        stair: (d, x, y) => lspo_stair(d, x, y),
        non_diggable: (s) => lspo_non_diggable(s[0], s[1], s[2], s[3]),
        object: (a, x, y, o) => lspo_object(a, x, y, o),
        /* des.trap({ coord = ... }) — single-table form routes to opts */
        trap: (t, x, y) => (t !== undefined && t !== null
                            && typeof t === 'object' && !Array.isArray(t))
            ? lspo_trap(undefined, undefined, undefined, t)
            : lspo_trap(t, x, y),
    };
    const selection = { area: (x1, y1, x2, y2) => [x1, y1, x2, y2] };

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'hardfloor', 'noflip');
    /* This is a kludge to init the level as a lit field. */
    des.level_init({ style: 'mines', fg: '.', bg: '.', smoothed: false,
                     joined: false, lit: 1, walled: false });

    des.map(PRI_LOCA_MAP);
    /* Dungeon Description */
    des.region({ region: [0, 0, 9, 13], lit: 0, type: 'morgue', filled: 1 });
    des.region({ region: [9, 0, 30, 1], lit: 0, type: 'morgue', filled: 1 });
    des.region({ region: [9, 12, 30, 13], lit: 0, type: 'morgue',
                 filled: 1 });
    des.region({ region: [31, 0, 39, 13], lit: 0, type: 'morgue',
                 filled: 1 });
    des.region({ region: [11, 3, 29, 10], lit: 1, type: 'temple', filled: 1,
                 irregular: 1 });
    /* The altar inside the temple */
    des.altar({ x: 20, y: 7, align: 'noalign', type: 'shrine' });
    des.monster({ id: 'aligned cleric', x: 20, y: 7, align: 'noalign',
                  peaceful: 0 });
    /* Doors */
    des.door('locked', 10, 6);
    des.door('locked', 10, 7);
    des.door('locked', 20, 2);
    des.door('locked', 20, 11);
    des.door('locked', 30, 6);
    des.door('locked', 30, 7);
    /* Stairs */
    /* Note:  The up stairs are *intentionally* off of the map. */
    des.stair('up', 43, 5);
    des.stair('down', 20, 6);
    /* Non diggable walls */
    des.non_diggable(selection.area(10, 2, 30, 13));
    /* Objects (inside the antechambers). */
    des.object({ coord: [14, 3] });
    des.object({ coord: [15, 3] });
    des.object({ coord: [16, 3] });
    des.object({ coord: [14, 10] });
    des.object({ coord: [15, 10] });
    des.object({ coord: [16, 10] });
    des.object({ coord: [17, 10] });
    des.object({ coord: [24, 3] });
    des.object({ coord: [25, 3] });
    des.object({ coord: [26, 3] });
    des.object({ coord: [27, 3] });
    des.object({ coord: [24, 10] });
    des.object({ coord: [25, 10] });
    des.object({ coord: [26, 10] });
    des.object({ coord: [27, 10] });
    /* Random traps */
    des.trap({ coord: [15, 4] });
    des.trap({ coord: [25, 4] });
    des.trap({ coord: [15, 9] });
    des.trap({ coord: [25, 9] });
    des.trap();
    des.trap();
    /* No random monsters - the morgue generation will put them in. */
}
