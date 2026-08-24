// dat/bigrm-13.js — big room variant 13, "Pillars".
// C ref: dat/bigrm-13.lua
//
// The plain hall with a 7x3 grid of 3x3 pillar maps stamped over it in one
// of eight patterns. math.random(1,8) picks the filter; only filter 6
// (random 50%) draws inside the loop, one rn2(2) per grid cell. Each
// pillar map carries an EMPTY contents function on purpose: running it
// resets the map frame to the whole level (sp_lev.c:6313), which is what
// the later region/wallify coordinates are measured against.

import { lspo_level_flags, lspo_level_init, lspo_map_full, lspo_map_coord,
         lspo_region_sel, lspo_stair, lspo_wallify,
         lspo_non_diggable, lspo_object, lspo_trap, lspo_monster,
         l_selection_fillrect } from '../sp_lev.js';
import { rn2 } from '../rng.js';

/* dat/nhlib.lua math.random shim — two-arg form is a + rn2(b + 1 - a) */
const mathrandom = (a, b) => a + rn2(b + 1 - a);

const BIGRM13_MAP = `
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
|.........................................................................|
---------------------------------------------------------------------------`;

const PILLAR = `---
| |
---`;

export async function bigrm13_level() {
    const des = {
        level_init: lspo_level_init,
        level_flags: lspo_level_flags,
        map: (m) => (m && typeof m === 'object' && m.coord)
            ? lspo_map_coord(m) : lspo_map_full(m),
        region: (sel, lit) => lspo_region_sel(sel, lit),
        wallify: () => lspo_wallify(),
        stair: (d) => lspo_stair(d),
        non_diggable: () => lspo_non_diggable(),
        object: () => lspo_object(),
        trap: () => lspo_trap(),
        monster: () => lspo_monster(),
    };
    const selection = { area: l_selection_fillrect };

    des.level_init({ style: 'solidfill', fg: ' ' });
    des.level_flags('mazelevel', 'noflip');

    des.map(BIGRM13_MAP);

    const filters = [
        /* 1: all pillars */
        () => true,
        /* 2: 3 vertical lines */
        (x, y) => (x % 2) === 1,
        /* 3: checkerboard */
        (x, y) => ((x + y) % 2) === 0,
        /* 4: center row */
        (x, y) => (y % 2) === 1,
        /* 5: top and bottom rows */
        (x, y) => (y % 2) === 0,
        /* 6: random 50% */
        (x, y) => mathrandom(0, 1) === 0,
        /* 7: corners and center — Lua x/3 is float division, so the
           equality only holds where x/3 % 2 lands exactly on y % 2 */
        (x, y) => (x / 3) % 2 === y % 2,
        /* 8: slanted — Lua // is floor division */
        (x, y) => Math.floor((x + 1) / 3) === y,
    ];

    const idx = mathrandom(1, filters.length);

    for (let y = 0; y <= 2; y++) {
        for (let x = 0; x <= 6; x++) {
            if (filters[idx - 1](x, y)) {
                des.map({ coord: [12 + x * 9, 4 + y * 5], map: PILLAR,
                          contents: () => {} });
            }
        }
    }

    des.region(selection.area(0, 0, 75, 18), 'lit');
    des.wallify();
    des.non_diggable();

    des.stair('up');
    des.stair('down');

    for (let i = 0; i < 15; i++)
        des.object();
    for (let i = 0; i < 6; i++)
        des.trap();
    for (let i = 0; i < 28; i++)
        des.monster();
}
