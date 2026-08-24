// dat/bigrm-2.js — big room variant 2.
// C ref: dat/bigrm-2.lua
//
// The plain hall, lit, then one of three darkness layouts (or none) is
// stamped unlit over it; 25% of the time the darkness (grown by one) has
// its floor turned to ice. math.random(0,3) always draws; percent(25) only
// draws when darkness exists — Lua's `if darkness ~= nil` guards it.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_replace_terrain, lspo_region_sel, lspo_stair,
         lspo_non_diggable, lspo_object, lspo_trap, lspo_monster,
         l_selection_fillrect, l_selection_or,
         l_selection_grow } from '../sp_lev.js';
import { percent } from '../nhlua.js';
import { rn2 } from '../rng.js';

/* dat/nhlib.lua math.random shim — two-arg form is a + rn2(b + 1 - a) */
const mathrandom = (a, b) => a + rn2(b + 1 - a);

const BIGRM2_MAP = `
---------------------------------------------------------------------------
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
|.........................................................................|
---------------------------------------------------------------------------`;

export async function bigrm2_level() {
    const des = {
        level_init: lspo_level_init,
        level_flags: lspo_level_flags,
        map: lspo_map_full,
        replace_terrain: (o) => lspo_replace_terrain(o),
        region: (sel, lit) => lspo_region_sel(sel, lit),
        stair: (d) => lspo_stair(d),
        non_diggable: () => lspo_non_diggable(),
        object: () => lspo_object(),
        trap: () => lspo_trap(),
        monster: () => lspo_monster(),
    };
    const selection = { area: l_selection_fillrect };

    des.level_init({ style: 'solidfill', fg: ' ' });
    des.level_flags('mazelevel', 'noflip');

    des.map(BIGRM2_MAP);
    /* Dungeon Description */
    des.region(selection.area(1, 1, 73, 16), 'lit');

    let darkness;

    const choice = mathrandom(0, 3);
    if (choice === 0) {
        darkness = l_selection_or(l_selection_or(l_selection_or(
            selection.area(1, 7, 22, 9),
            selection.area(24, 1, 50, 5)),
            selection.area(24, 11, 50, 16)),
            selection.area(52, 7, 73, 9));
    } else if (choice === 1) {
        darkness = selection.area(24, 1, 50, 16);
    } else if (choice === 2) {
        darkness = l_selection_or(
            selection.area(1, 1, 22, 16),
            selection.area(52, 1, 73, 16));
    }

    if (darkness !== undefined) {
        des.region(darkness, 'unlit');
        if (percent(25)) {
            des.replace_terrain({ selection: l_selection_grow(darkness),
                                  fromterrain: '.', toterrain: 'I' });
        }
    }

    /* Stairs */
    des.stair('up');
    des.stair('down');
    /* Non diggable walls */
    des.non_diggable();
    /* Objects */
    for (let i = 0; i < 15; i++)
        des.object();
    /* Random traps */
    for (let i = 0; i < 6; i++)
        des.trap();
    /* Random monsters. */
    for (let i = 0; i < 28; i++)
        des.monster();
}
