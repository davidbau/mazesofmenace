// dat/minefill.js — the fill level for the Gnomish Mines.
// C ref: dat/minefill.lua
//
// A walled, joined, smoothed cavern (mkmap "mines" style), stocked with
// gems, a tool, random objects, chance boulders, a gnome contingent with
// dwarves, and six traps.

import { lspo_level_flags, lspo_level_init, lspo_stair,
         lspo_object, lspo_trap, lspo_monster } from '../sp_lev.js';
import { rn2 } from '../rng.js';

/* dat/nhlib.lua math.random shim — two-arg form is a + rn2(b + 1 - a) */
const mathrandom = (a, b) => a + rn2(b + 1 - a);
/* dat/nhlib.lua percent() — rn2(100) < n */
const percent = (n) => rn2(100) < n;

export async function minefill_level() {
    const des = {
        level_init: lspo_level_init,
        level_flags: lspo_level_flags,
        stair: (d, x, y) => lspo_stair(d, x, y),
        object: (a, x, y, o) => lspo_object(a, x, y, o),
        trap: (t, x, y) => lspo_trap(t, x, y),
        monster: (a, x, y, o) => lspo_monster(a, x, y, o),
    };

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'noflip');

    des.level_init({ style: 'mines', fg: '.', bg: ' ',
                     smoothed: true, joined: true, walled: true });

    des.stair('up');
    des.stair('down');

    for (let i = 1, n = mathrandom(2, 5); i <= n; i++)
        des.object('*');
    des.object('(');
    for (let i = 1, n = mathrandom(2, 4); i <= n; i++)
        des.object();
    if (percent(75)) {
        for (let i = 1, n = mathrandom(1, 2); i <= n; i++)
            des.object('boulder');
    }

    for (let i = 1, n = mathrandom(6, 8); i <= n; i++)
        des.monster('gnome');
    des.monster('gnome lord');
    des.monster('dwarf');
    des.monster('dwarf');
    des.monster('G');
    des.monster('G');
    des.monster(percent(50) ? 'h' : 'G');

    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
}
