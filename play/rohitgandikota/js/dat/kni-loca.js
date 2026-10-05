// dat/kni-loca.js — the Knight quest locate level.
// C ref: dat/Kni-loca.lua
//
// The Isle of Glass: a tor rising from pool-carved swamp, the neutral
// shrine on top (its priest is created), magic traps warding every
// approach but the east, and quasit/jelly swarms.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_region_full, lspo_stair, lspo_object, lspo_trap,
         lspo_monster, lspo_altar } from '../sp_lev.js';

const KNI_LOCA_MAP = `xxxxxxxxx......xxxx...........xxxxxxxxxx
xxxxxxx.........xxx.............xxxxxxxx
xxxx..............................xxxxxx
xx.................................xxxxx
....................................xxxx
.......................................x
........................................
xx...................................xxx
xxxx..............................xxxxxx
xxxxxx..........................xxxxxxxx
xxxxxxxx.........xx..........xxxxxxxxxxx
xxxxxxxxx.......xxxxxx.....xxxxxxxxxxxxx`;

export async function kniloca_level() {
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
        monster: (a, x, y, o) => lspo_monster(a, x, y, o),
    };
    const selection = { area: (x1, y1, x2, y2) => [x1, y1, x2, y2] };

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'hardfloor');

    des.level_init({ style: 'mines', fg: '.', bg: 'P', smoothed: false,
                     joined: true, lit: 1, walled: false });

    des.map(KNI_LOCA_MAP);
    /* Dungeon Description */
    /* The Isle of Glass is a Tor rising out of the swamps surrounding it. */
    des.region(selection.area(0, 0, 39, 11), 'lit');
    /* The top area of the Tor is a holy site. */
    des.region({ region: [9, 2, 27, 9], lit: 1, type: 'temple', filled: 2 });
    /* Stairs */
    des.stair('up', 38, 0);
    des.stair('down', 18, 5);
    /* The altar atop the Tor and its attendant (creating altar makes the
       priest). */
    des.altar({ x: 17, y: 5, align: 'neutral', type: 'shrine' });
    /* Objects */
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
    des.object();
    /* Random traps */
    /* All of the avenues are guarded by magic except for the East. */
    /* South */
    des.trap('magic', 8, 11);
    des.trap('magic', 9, 11);
    des.trap('magic', 10, 11);
    des.trap('magic', 11, 11);
    des.trap('magic', 12, 11);
    des.trap('magic', 13, 11);
    des.trap('magic', 14, 11);
    des.trap('magic', 15, 11);
    des.trap('magic', 16, 11);
    des.trap('magic', 20, 11);
    des.trap('magic', 21, 11);
    des.trap('magic', 22, 11);
    des.trap('magic', 23, 11);
    des.trap('magic', 24, 11);
    des.trap('magic', 25, 11);
    des.trap('magic', 26, 11);
    des.trap('magic', 27, 11);
    des.trap('magic', 28, 11);
    /* West */
    des.trap('magic', 0, 3);
    des.trap('magic', 0, 4);
    des.trap('magic', 0, 5);
    des.trap('magic', 0, 6);
    /* North */
    des.trap('magic', 6, 0);
    des.trap('magic', 7, 0);
    des.trap('magic', 8, 0);
    des.trap('magic', 9, 0);
    des.trap('magic', 10, 0);
    des.trap('magic', 11, 0);
    des.trap('magic', 12, 0);
    des.trap('magic', 13, 0);
    des.trap('magic', 14, 0);
    des.trap('magic', 19, 0);
    des.trap('magic', 20, 0);
    des.trap('magic', 21, 0);
    des.trap('magic', 22, 0);
    des.trap('magic', 23, 0);
    des.trap('magic', 24, 0);
    des.trap('magic', 25, 0);
    des.trap('magic', 26, 0);
    des.trap('magic', 27, 0);
    des.trap('magic', 28, 0);
    des.trap('magic', 29, 0);
    des.trap('magic', 30, 0);
    des.trap('magic', 31, 0);
    des.trap('magic', 32, 0);
    /* Even so, there are magic "sinkholes" around. */
    des.trap('anti magic');
    des.trap('anti magic');
    des.trap('anti magic');
    des.trap('anti magic');
    des.trap('anti magic');
    des.trap('anti magic');
    des.trap('anti magic');
    /* Random monsters. */
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ id: 'quasit', peaceful: 0 });
    des.monster({ class: 'i', peaceful: 0 });
    des.monster({ class: 'j', peaceful: 0 });
    des.monster({ id: 'ochre jelly', peaceful: 0 });
    des.monster({ id: 'ochre jelly', peaceful: 0 });
    des.monster({ id: 'ochre jelly', peaceful: 0 });
    des.monster({ id: 'ochre jelly', peaceful: 0 });
    des.monster({ id: 'ochre jelly', peaceful: 0 });
    des.monster({ id: 'ochre jelly', peaceful: 0 });
    des.monster({ id: 'ochre jelly', peaceful: 0 });
    des.monster({ class: 'j', peaceful: 0 });
}
