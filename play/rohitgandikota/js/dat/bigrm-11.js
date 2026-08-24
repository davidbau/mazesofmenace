// dat/bigrm-11.js — big room variant 11, the boulder "maze".
// C ref: dat/bigrm-11.lua
//
// No des.map at all: level_init carves a wide-corridor maze (corrwid
// 3+rn2(3), wallthick 1, deadends kept on a coin flip — the two draws
// happen while the level_init argument table is built, corrwid first).
// Then every thin wall segment with floor on both sides becomes floor
// plus a boulder: two match passes, the second catching the corner stubs
// the first pass exposed. The iterate callbacks get map-relative
// coordinates (the frame is the whole level, xstart 1 / ystart 0).

import { lspo_level_flags, lspo_level_init,
         lspo_terrain, lspo_region_sel, lspo_stair,
         lspo_non_diggable, lspo_object, lspo_trap, lspo_monster,
         l_selection_fillrect, l_selection_match,
         l_selection_or } from '../sp_lev.js';
import { l_selection_iterate } from '../selvar.js';
import { percent } from '../nhlua.js';
import { rn2 } from '../rng.js';

export async function bigrm11_level() {
    const des = {
        level_init: lspo_level_init,
        level_flags: lspo_level_flags,
        /* des.terrain(x, y, ch) — the argc == 3 coord form resolves the
           point through get_location_coord exactly as a one-square area
           does (sp_lev.c:5013, bar-strt.js precedent) */
        terrain: (a, b, c) => (typeof a === 'number')
            ? lspo_terrain(l_selection_fillrect(a, b, a, b), c)
            : lspo_terrain(a, b),
        region: (sel, lit) => lspo_region_sel(sel, lit),
        stair: (d) => lspo_stair(d),
        non_diggable: () => lspo_non_diggable(),
        object: (a, x, y) => lspo_object(a, x, y),
        trap: (t) => lspo_trap(t),
        monster: () => lspo_monster(),
    };
    const selection = {
        area: l_selection_fillrect,
        match: l_selection_match,
    };

    /* function t_or_f() return percent(50) and true or false; end */
    const t_or_f = () => (percent(50) ? true : false);

    des.level_flags('mazelevel', 'noflip');
    des.level_init({ style: 'maze', corrwid: 3 + rn2(3), wallthick: 1,
                     deadends: t_or_f() });

    des.region(selection.area(0, 0, 75, 18), 'lit');
    des.non_diggable();

    const replace_wall_boulder = (x, y) => {
        des.terrain(x, y, '.');
        des.object('boulder', x, y);
    };

    /* replace horizontal and vertical walls */
    {
        const sel = l_selection_or(selection.match('.w.'),
                                   selection.match('.\nw\n.'));
        l_selection_iterate(sel, replace_wall_boulder);
    }
    /* replace the leftover corner walls */
    {
        const sel = selection.match('.w.');
        l_selection_iterate(sel, replace_wall_boulder);
    }

    des.stair('up');
    des.stair('down');

    for (let i = 0; i < 15; i++)
        des.object();
    for (let i = 0; i < 6; i++)
        des.trap('rolling boulder');
    for (let i = 0; i < 28; i++)
        des.monster();
}
