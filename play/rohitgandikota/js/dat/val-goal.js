// dat/val-goal.js — the Valkyrie quest goal level.
// C ref: dat/Val-goal.lua
//
// Lord Surtur's lava fortress: a walled keep in a lava moat with two
// drawbridges (the southern one usually open), The Orb of Fate under
// Surtur, squeaky boards flanking him, and a fire giant garrison.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_region_full, lspo_stair, lspo_object, lspo_trap,
         lspo_monster, lspo_non_diggable, lspo_replace_terrain,
         lspo_drawbridge } from '../sp_lev.js';
import { rn2 } from '../rng.js';

/* dat/nhlib.lua:10 percent(n) — rn2(100) < n */
const percent = (n) => rn2(100) < n;

const VAL_GOAL_MAP = `xxxxxx.....................xxxxxxxx
xxxxx.......LLLLL.LLLLL......xxxxxx
xxxx......LLLLLLLLLLLLLLL......xxxx
xxxx.....LLL|---------|LLL.....xxxx
xxxx....LL|--.........--|LL.....xxx
x......LL|-...LLLLLLL...-|LL.....xx
.......LL|...LL.....LL...|LL......x
......LL|-..LL.......LL..-|LL......
......LL|.................|LL......
......LL|-..LL.......LL..-|LL......
.......LL|...LL.....LL...|LL.......
xx.....LL|-...LLLLLLL...-|LL......x
xxx.....LL|--.........--|LL.....xxx
xxxx.....LLL|---------|LLL...xxxxxx
xxxxx.....LLLLLLLLLLLLLLL...xxxxxxx
xxxxxx......LLLLL.LLLLL.....xxxxxxx
xxxxxxxxx..................xxxxxxxx`;

export async function valgoal_level() {
    const des = {
        level_init: lspo_level_init,
        level_flags: lspo_level_flags,
        map: lspo_map_full,
        region: (sel, lit) => lspo_region_full(
            Array.isArray(sel) ? { area: sel, lit: lit === 'lit' } : sel),
        replace_terrain: (o) => lspo_replace_terrain(o),
        stair: (d, x, y) => lspo_stair(d, x, y),
        non_diggable: (s) => lspo_non_diggable(s[0], s[1], s[2], s[3]),
        drawbridge: (o) => lspo_drawbridge(o),
        object: (a, x, y, o) => lspo_object(a, x, y, o),
        trap: (t, x, y) => lspo_trap(t, x, y),
        monster: (a, x, y, o) => lspo_monster(a, x, y, o),
    };
    const selection = { area: (x1, y1, x2, y2) => [x1, y1, x2, y2] };

    des.level_init({ style: 'solidfill', fg: 'L' });

    des.level_flags('mazelevel', 'icedpools');

    des.level_init({ style: 'mines', fg: '.', bg: 'L', smoothed: true,
                     joined: true, lit: 1, walled: false });

    des.map(VAL_GOAL_MAP);
    /* Dungeon Description */
    des.region(selection.area(0, 0, 34, 16), 'lit');
    /* Stairs */
    /* Note:  The up stairs are *intentionally* off of the map. */
    /* if the stairs are surrounded by lava, maybe give some room */
    des.replace_terrain({ region: [44, 9, 46, 11], fromterrain: 'L',
                          toterrain: '.', chance: 50 });
    des.stair('up', 45, 10);
    /* Non diggable walls */
    des.non_diggable(selection.area(0, 0, 34, 16));
    /* Drawbridges; northern one opens from the south (portcullis) to further
       north (lowered span), southern one from the north to further south */
    des.drawbridge({ x: 17, y: 2, dir: 'south', state: 'random' });
    if (percent(75))
        des.drawbridge({ x: 17, y: 14, dir: 'north', state: 'open' });
    else
        des.drawbridge({ x: 17, y: 14, dir: 'north', state: 'random' });
    /* Objects */
    des.object({ id: 'crystal ball', x: 17, y: 8, buc: 'blessed', spe: 5,
                 name: 'The Orb of Fate' });
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
    /* Traps */
    des.trap('board', 13, 8);
    des.trap('board', 21, 8);
    /* Random traps */
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('board');
    des.trap();
    des.trap();
    /* Random monsters. */
    des.monster('Lord Surtur', 17, 8);
    des.monster('fire ant');
    des.monster('fire ant');
    des.monster('fire ant');
    des.monster('fire ant');
    des.monster('a');
    des.monster('a');
    des.monster({ id: 'fire giant', x: 10, y: 6, peaceful: 0 });
    des.monster({ id: 'fire giant', x: 10, y: 7, peaceful: 0 });
    des.monster({ id: 'fire giant', x: 10, y: 8, peaceful: 0 });
    des.monster({ id: 'fire giant', x: 10, y: 9, peaceful: 0 });
    des.monster({ id: 'fire giant', x: 10, y: 10, peaceful: 0 });
    des.monster({ id: 'fire giant', x: 24, y: 6, peaceful: 0 });
    des.monster({ id: 'fire giant', x: 24, y: 7, peaceful: 0 });
    des.monster({ id: 'fire giant', x: 24, y: 8, peaceful: 0 });
    des.monster({ id: 'fire giant', x: 24, y: 9, peaceful: 0 });
    des.monster({ id: 'fire giant', x: 24, y: 10, peaceful: 0 });
    des.monster({ id: 'fire giant', peaceful: 0 });
    des.monster({ id: 'fire giant', peaceful: 0 });
    des.monster({ class: 'H', peaceful: 0 });
}
