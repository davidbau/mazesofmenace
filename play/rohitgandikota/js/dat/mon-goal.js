// dat/mon-goal.js — the Monk quest goal level.
// C ref: dat/Mon-goal.lua
//
// Master Kaen's lava cavern (the solidfill init is commented out in the
// Lua): The Eyes of the Overworld and an unaligned altar at one of two
// shuffled places with Kaen on top, and elemental/xorn packs.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_region_full, lspo_stair, lspo_object, lspo_trap,
         lspo_monster, lspo_altar } from '../sp_lev.js';
import { rn2 } from '../rng.js';

/* dat/nhlib.lua math.random shim — two-arg form is a + rn2(b + 1 - a) */
const mathrandom = (a, b) => a + rn2(b + 1 - a);

const MON_GOAL_MAP = `xxxxxx..xxxxxx...xxxxxxxxx
xxxx......xx......xxxxxxxx
xx.xx.............xxxxxxxx
x....................xxxxx
......................xxxx
......................xxxx
xx........................
xxx......................x
xxx................xxxxxxx
xxxx.....x.xx.......xxxxxx
xxxxx...xxxxxx....xxxxxxxx`;

export async function mongoal_level() {
    const des = {
        level_init: lspo_level_init,
        level_flags: lspo_level_flags,
        map: lspo_map_full,
        region: (sel, lit) => lspo_region_full(
            Array.isArray(sel) ? { area: sel, lit: lit === 'lit' } : sel),
        stair: (d, x, y) => lspo_stair(d, x, y),
        altar: (o) => lspo_altar(o),
        object: (a, x, y, o) => lspo_object(a, x, y, o),
        trap: (t, x, y) => lspo_trap(t, x, y),
        monster: (a, x, y, o) => (Array.isArray(x))
            ? lspo_monster(a, x[0], x[1], o)
            : lspo_monster(a, x, y, o),
    };
    const selection = { area: (x1, y1, x2, y2) => [x1, y1, x2, y2] };

    /* the Lua's solidfill level_init line is commented out */
    des.level_flags('mazelevel');

    des.level_init({ style: 'mines', fg: 'L', bg: '.', smoothed: false,
                     joined: false, lit: 0, walled: false });

    des.map(MON_GOAL_MAP);

    const place = [[14, 4], [13, 7]];
    const placeidx = mathrandom(1, place.length);

    des.region(selection.area(0, 0, 25, 10), 'unlit');
    des.stair('up', 20, 5);
    des.object({ id: 'lenses', coord: place[placeidx - 1], buc: 'blessed',
                 spe: 0, name: 'The Eyes of the Overworld' });
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
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap();
    des.trap();
    des.monster('Master Kaen', place[placeidx - 1]);
    des.altar({ coord: place[placeidx - 1], align: 'noalign',
                type: 'altar' });
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
