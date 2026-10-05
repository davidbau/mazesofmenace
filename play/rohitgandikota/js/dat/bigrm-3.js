// dat/bigrm-3.js — big room variant 3, the "comb" hall.
// C ref: dat/bigrm-3.lua
//
// A hall lined with wall teeth. 66% of the time every wall square with
// floor on both sides (the "[.w.]" match — '[' and ']' have no terrain
// mapping, so they are transparent and match anything) turns into one of
// F/T/W/Z. The terrain pass runs AFTER the region lighting, so it must
// leave the lit state alone. 28 monsters at fixed spots along the teeth.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_terrain, lspo_region_sel, lspo_stair,
         lspo_non_diggable, lspo_object, lspo_trap, lspo_monster,
         l_selection_fillrect, l_selection_match } from '../sp_lev.js';
import { percent } from '../nhlua.js';
import { rn2 } from '../rng.js';

/* dat/nhlib.lua math.random shim — two-arg form is a + rn2(b + 1 - a) */
const mathrandom = (a, b) => a + rn2(b + 1 - a);

const BIGRM3_MAP = `
---------------------------------------------------------------------------
|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|..............---.......................................---..............|
|...............|.........................................|...............|
|.....|.|.|.|.|---|.|.|.|.|...................|.|.|.|.|.|---|.|.|.|.|.....|
|.....|--------   --------|...................|----------   --------|.....|
|.....|.|.|.|.|---|.|.|.|.|...................|.|.|.|.|.|---|.|.|.|.|.....|
|...............|.........................................|...............|
|..............---.......................................---..............|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|
---------------------------------------------------------------------------`;

export async function bigrm3_level() {
    const des = {
        level_init: lspo_level_init,
        level_flags: lspo_level_flags,
        map: lspo_map_full,
        terrain: (sel, ch) => lspo_terrain(sel, ch),
        region: (sel, lit) => lspo_region_sel(sel, lit),
        stair: (d) => lspo_stair(d),
        non_diggable: () => lspo_non_diggable(),
        object: () => lspo_object(),
        trap: () => lspo_trap(),
        monster: (a) => lspo_monster(a),
    };
    const selection = {
        area: l_selection_fillrect,
        match: l_selection_match,
    };

    des.level_init({ style: 'solidfill', fg: ' ' });
    des.level_flags('mazelevel', 'noflip');

    des.map(BIGRM3_MAP);

    /* Dungeon Description */
    des.region(selection.area(1, 1, 73, 16), 'lit');

    /* replace some walls */
    if (percent(66)) {
        const sel = selection.match('[.w.]');
        const terrains = ['F', 'T', 'W', 'Z'];
        const choice = terrains[mathrandom(1, terrains.length) - 1];
        des.terrain(sel, choice);
    }

    /* Stairs */
    des.stair('up');
    des.stair('down');

    /* Non diggable walls */
    des.non_diggable();

    for (let i = 0; i < 15; i++)
        des.object();

    for (let i = 0; i < 6; i++)
        des.trap();

    des.monster({ x: 1, y: 1 });
    des.monster({ x: 13, y: 1 });
    des.monster({ x: 25, y: 1 });
    des.monster({ x: 37, y: 1 });
    des.monster({ x: 49, y: 1 });
    des.monster({ x: 61, y: 1 });
    des.monster({ x: 73, y: 1 });
    des.monster({ x: 7, y: 7 });
    des.monster({ x: 13, y: 7 });
    des.monster({ x: 25, y: 7 });
    des.monster({ x: 37, y: 7 });
    des.monster({ x: 49, y: 7 });
    des.monster({ x: 61, y: 7 });
    des.monster({ x: 67, y: 7 });
    des.monster({ x: 7, y: 9 });
    des.monster({ x: 13, y: 9 });
    des.monster({ x: 25, y: 9 });
    des.monster({ x: 37, y: 9 });
    des.monster({ x: 49, y: 9 });
    des.monster({ x: 61, y: 9 });
    des.monster({ x: 67, y: 9 });
    des.monster({ x: 1, y: 16 });
    des.monster({ x: 13, y: 16 });
    des.monster({ x: 25, y: 16 });
    des.monster({ x: 37, y: 16 });
    des.monster({ x: 49, y: 16 });
    des.monster({ x: 61, y: 16 });
    des.monster({ x: 73, y: 16 });
}
