// dat/bigrm-1.js — big room variant 1.
// C ref: dat/bigrm-1.lua
//
// The plain 75x18 walled hall. 80% of the time one of six decorations is
// drawn across it in one random terrain: a horizontal line, two vertical
// lines, a plus sign, bracket shapes, a "snake" of fillrects, or nothing.
// percent() and the two math.random() calls draw in that Lua order; the
// line/rect/fillrect selections themselves draw nothing.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_terrain, lspo_region_sel, lspo_stair,
         lspo_non_diggable, lspo_object, lspo_trap, lspo_monster,
         l_selection_line, l_selection_rect, l_selection_fillrect,
         l_selection_or } from '../sp_lev.js';
import { percent } from '../nhlua.js';
import { rn2 } from '../rng.js';

/* dat/nhlib.lua math.random shim — two-arg form is a + rn2(b + 1 - a) */
const mathrandom = (a, b) => a + rn2(b + 1 - a);

const BIGRM1_MAP = `
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

export async function bigrm1_level() {
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
        monster: () => lspo_monster(),
    };
    const selection = {
        line: l_selection_line,
        rect: l_selection_rect,
        fillrect: l_selection_fillrect,
        area: l_selection_fillrect,
    };

    des.level_init({ style: 'solidfill', fg: ' ' });
    des.level_flags('mazelevel', 'noflip');

    des.map(BIGRM1_MAP);

    if (percent(80)) {
        const terrains = ['-', 'F', 'L', 'T', 'C'];
        const tidx = mathrandom(1, terrains.length);
        const choice = mathrandom(0, 5);
        if (choice === 0) {
            /* one horizontal line */
            des.terrain(selection.line(10, 8, 65, 8), terrains[tidx - 1]);
        } else if (choice === 1) {
            /* two vertical lines */
            const sel = l_selection_or(selection.line(15, 4, 15, 13),
                                       selection.line(59, 4, 59, 13));
            des.terrain(sel, terrains[tidx - 1]);
        } else if (choice === 2) {
            /* plus sign */
            const sel = l_selection_or(selection.line(10, 8, 64, 8),
                                       selection.line(37, 3, 37, 14));
            des.terrain(sel, terrains[tidx - 1]);
        } else if (choice === 3) {
            /* brackets:  [  ] */
            des.terrain(selection.rect(4, 4, 70, 13), terrains[tidx - 1]);
            const sel = l_selection_or(selection.line(25, 4, 50, 4),
                                       selection.line(25, 13, 50, 13));
            des.terrain(sel, '.');
        } else if (choice === 4) {
            /* snake */
            des.terrain(selection.fillrect(5, 5, 69, 12), terrains[tidx - 1]);
            for (let i = 0; i <= 7; i++) {
                const x = 6 + i * 8;
                const y = 5 + (i % 2);
                des.terrain(selection.fillrect(x, y, x + 6, y + 6), '.');
            }
        } else {
            /* nothing */
        }
    }

    des.region(selection.area(1, 1, 73, 16), 'lit');

    des.stair('up');
    des.stair('down');

    des.non_diggable();

    for (let i = 0; i < 15; i++)
        des.object();
    for (let i = 0; i < 6; i++)
        des.trap();
    for (let i = 0; i < 28; i++)
        des.monster();
}
