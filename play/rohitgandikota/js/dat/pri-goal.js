// dat/pri-goal.js — the Priest quest goal level.
// C ref: dat/Pri-goal.lua
//
// The unlit lava cavern of Moloch's sanctum: the Mitre of Holiness at one
// of two shuffled places with Nalzok on top of it, zombie and wraith
// hordes, and four fire traps.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_region_full, lspo_stair, lspo_object, lspo_trap,
         lspo_monster } from '../sp_lev.js';
import { rn2 } from '../rng.js';

/* dat/nhlib.lua math.random shim — two-arg form is a + rn2(b + 1 - a) */
const mathrandom = (a, b) => a + rn2(b + 1 - a);

const PRI_GOAL_MAP = `xxxxxx..xxxxxx...xxxxxxxxx
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

export async function prigoal_level() {
    const des = {
        level_init: lspo_level_init,
        level_flags: lspo_level_flags,
        map: lspo_map_full,
        region: (sel, lit) => lspo_region_full(
            Array.isArray(sel) ? { area: sel, lit: lit === 'lit' } : sel),
        stair: (d, x, y) => lspo_stair(d, x, y),
        object: (a, x, y, o) => lspo_object(a, x, y, o),
        trap: (t, x, y) => lspo_trap(t, x, y),
        monster: (a, x, y, o) => (Array.isArray(x))
            ? lspo_monster(a, x[0], x[1], o)
            : lspo_monster(a, x, y, o),
    };
    const selection = { area: (x1, y1, x2, y2) => [x1, y1, x2, y2] };

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel');

    des.level_init({ style: 'mines', fg: 'L', bg: '.', smoothed: false,
                     joined: false, lit: 0, walled: false });

    des.map(PRI_GOAL_MAP);
    /* Dungeon Description */
    const place = [[14, 4], [13, 7]];
    const placeidx = mathrandom(1, place.length);

    des.region(selection.area(0, 0, 25, 10), 'unlit');
    /* Stairs */
    des.stair('up', 20, 5);
    /* Objects [note: eroded=-1 => obj->oerodeproof=1] */
    des.object({ id: 'helm of brilliance', coord: place[placeidx - 1],
                 buc: 'blessed', spe: 0, eroded: -1,
                 name: 'The Mitre of Holiness' });
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
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap();
    des.trap();
    /* Random monsters. */
    des.monster('Nalzok', place[placeidx - 1]);
    des.monster('human zombie');
    des.monster('human zombie');
    des.monster('human zombie');
    des.monster('human zombie');
    des.monster('human zombie');
    des.monster('human zombie');
    des.monster('human zombie');
    des.monster('human zombie');
    des.monster('human zombie');
    des.monster('human zombie');
    des.monster('human zombie');
    des.monster('human zombie');
    des.monster('human zombie');
    des.monster('human zombie');
    des.monster('human zombie');
    des.monster('human zombie');
    des.monster('Z');
    des.monster('Z');
    des.monster('wraith');
    des.monster('wraith');
    des.monster('wraith');
    des.monster('wraith');
    des.monster('wraith');
    des.monster('wraith');
    des.monster('wraith');
    des.monster('wraith');
    des.monster('W');
}
