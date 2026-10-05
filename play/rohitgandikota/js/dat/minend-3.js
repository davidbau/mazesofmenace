// dat/minend-3.js — Mine end variant 3, "Catacombs" (by Kelly Bailey).
// C ref: dat/minend-3.lua
//
// A dotted-wall catacomb map walked by an unstocked MAZEWALK, a shuffled
// luckstone/flint pair behind the crypt walls, level-teleport traps on the
// niches, and the mummy/zombie garrison.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_region_full, lspo_stair, lspo_door, lspo_feature,
         lspo_object, lspo_trap, lspo_monster, lspo_non_diggable,
         lspo_mazewalk, lspo_wallify } from '../sp_lev.js';
import { rn2 } from '../rng.js';

/* dat/nhlib.lua:17 shuffle() — for i = #list, 2, -1: swap i with
   math.random(i) = 1 + rn2(i), both 1-indexed */
function shuffle(list) {
    for (let i = list.length; i >= 2; i--) {
        const j = 1 + rn2(i);
        [list[i - 1], list[j - 1]] = [list[j - 1], list[i - 1]];
    }
}

const MINEND3_MAP = `
 - - - - - - - - - - -- -- - - . - - - - - - - - - -- - - -- - - - - . - - |
------...---------.-----------...-----.-------.-------     ----------------|
 - - - - - - - - - - - . - - - . - - - - - - - - - - -- - -- - . - - - - - |
------------.---------...-------------------------.---   ------------------|
 - - - - - - - - - - . . - - --- - . - - - - - - - - -- -- - - - - |.....| |
--.---------------.......------------------------------- ----------|.....S-|
 - - - - |.. ..| - ....... . - - - - |.........| - - - --- - - - - |.....| |
----.----|.....|------.......--------|.........|--------------.------------|
 - - - - |..{..| - - -.... . --- - -.S.........S - - - - - - - - - - - - - |
---------|.....|--.---...------------|.........|---------------------------|
 - - - - |.. ..| - - - . - - - - - - |.........| - --- . - - - - - - - - - |
----------------------...-------.---------------------...------------------|
---..| - - - - - - - - . --- - - - - - - - - - - - - - . - - --- - - --- - |
-.S..|----.-------.------- ---------.-----------------...----- -----.-------
---..| - - - - - - - -- - - -- . - - - - - . - - - . - . - - -- -- - - - -- 
-.S..|--------.---.---       -...---------------...{.---------   ---------  
--|. - - - - - - - -- - - - -- . - - - --- - - - . . - - - - -- - - - - - - 
`.replace(/^\n/, '').replace(/\n$/, '');

export async function minend3_level() {
    const at = (f) => (a, x, y, o) =>
        Array.isArray(x) ? f(a, x[0], x[1], o) : f(a, x, y, o);
    const des = {
        level_init: lspo_level_init,
        level_flags: lspo_level_flags,
        map: lspo_map_full,
        region: (sel, lit) => lspo_region_full(
            Array.isArray(sel) ? { area: sel, lit: lit === 'lit' } : sel),
        stair: (d, x, y) => lspo_stair(d, x, y),
        door: (state, x, y) => lspo_door({ state, x, y }),
        feature: at(lspo_feature),
        object: at(lspo_object),
        trap: at(lspo_trap),
        monster: (a, x, y, o) => lspo_monster(a, x, y, o),
        non_diggable: (s) => lspo_non_diggable(s[0], s[1], s[2], s[3]),
        mazewalk: lspo_mazewalk,
        wallify: () => lspo_wallify(),
    };
    const selection = { area: (x1, y1, x2, y2) => [x1, y1, x2, y2] };

    des.level_init({ style: 'solidfill', fg: '-' });

    des.level_flags('mazelevel', 'nommap');

    des.map({ halign: 'center', valign: 'bottom', map: MINEND3_MAP });

    const place = [[1, 15], [68, 6], [1, 13]];
    shuffle(place);

    des.non_diggable(selection.area(67, 3, 73, 7));
    des.non_diggable(selection.area(0, 12, 2, 16));
    des.feature('fountain', [12, 8]);
    des.feature('fountain', [51, 15]);
    des.region(selection.area(0, 0, 75, 16), 'unlit');
    des.region(selection.area(38, 6, 46, 10), 'lit');
    des.door('closed', 37, 8);
    des.door('closed', 47, 8);
    des.door('closed', 73, 5);
    des.door('closed', 2, 15);
    des.mazewalk({ x: 36, y: 8, dir: 'west', stocked: false });
    des.stair('up', 42, 8);
    des.wallify();

    /* Objects */
    des.object('diamond');
    des.object('*');
    des.object('diamond');
    des.object('*');
    des.object('emerald');
    des.object('*');
    des.object('emerald');
    des.object('*');
    des.object('emerald');
    des.object('*');
    des.object('ruby');
    des.object('*');
    des.object('ruby');
    des.object('amethyst');
    des.object('*');
    des.object('amethyst');
    des.object({ id: 'luckstone', coord: place[1], buc: 'not-cursed',
                 achievement: 1 });
    des.object('flint', place[0]);
    des.object('?');
    des.object('?');
    des.object('?');
    des.object('?');
    des.object('?');
    des.object('+');
    des.object('+');
    des.object('+');
    des.object('+');
    des.object();
    des.object();
    des.object();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    /* One-time annoyance factor */
    des.trap('level teleport', place[1]);
    des.trap('level teleport', place[0]);
    des.monster('M');
    des.monster('M');
    des.monster('M');
    des.monster('M');
    des.monster('M');
    des.monster('ettin mummy');
    des.monster('V');
    des.monster('Z');
    des.monster('Z');
    des.monster('Z');
    des.monster('Z');
    des.monster('Z');
    des.monster('V');
    des.monster('e');
    des.monster('e');
    des.monster('e');
    des.monster('e');
}
