// dat/val-strt.js — the Valkyrie quest start level.
// C ref: dat/Val-strt.lua
//
// The Shrine of Destiny on an ice sheet: sixteen random lava pools ringed
// with water carved BEFORE the map lands, the Norn's audience hall, eight
// warrior guards, fire ants and two fire giants on siege duty.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_region_full, lspo_stair, lspo_levregion, lspo_door,
         lspo_terrain, lspo_non_diggable, lspo_object, lspo_trap,
         lspo_monster, lspo_feature, l_selection_set, l_selection_or,
         l_selection_grow } from '../sp_lev.js';
import { selection_new, selection_clone } from '../selvar.js';

const VAL_STRT_MAP = `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxxx..xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx...xxxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxx..xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx..{..xxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxxx..xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.....xxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxx..xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.xxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxx..xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.xxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxx..xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx..xxxxxxxxxxxxxxxxxxx
xxxxxxxx.....xxxxxxxxxxxxx|----------------|xxxxxxxxxxx.xxxxxxxxxxxxxxxxxxxx
xxxxxxx..xxx...xxxxxxxxxxx|................|xxxxxxxxxx..xxxxxxxxxxxxxxxxxxxx
xxxxxx..xxxxxx......xxxxx.|................|.xxxxxxxxx.xxxxxxxxxxxxxxxxxxxxx
xxxxx..xxxxxxxxxxxx.......+................+...xxxxxxx.xxxxxxxxxxxxxxxxxxxxx
xxxx..xxxxxxxxx.....xxxxx.|................|.x...xxxxx.xxxxxxxxxxxxxxxxxxxxx
xxx..xxxxxxxxx..xxxxxxxxxx|................|xxxx.......xxxxxxxxxxxxxxxxxxxxx
xxxx..xxxxxxx..xxxxxxxxxxx|----------------|xxxxxxxxxx...xxxxxxxxxxxxxxxxxxx
xxxxxx..xxxx..xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx...xxxxxxxxxxxxxxxxx
xxxxxxx......xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx...xxxxxxxxxxxxxxx
xxxxxxxxx...xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx...x......xxxxxx
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.........xxxxx
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.......xxxxxx
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`;

export async function valstrt_level() {
    const des = {
        level_init: lspo_level_init,
        level_flags: lspo_level_flags,
        map: lspo_map_full,
        terrain: (sel, ch) => lspo_terrain(sel, ch),
        region: (sel, lit) => lspo_region_full(
            Array.isArray(sel) ? { area: sel, lit: lit === 'lit' } : sel),
        levregion: lspo_levregion,
        stair: (d, x, y) => lspo_stair(d, x, y),
        feature: (t, x, y) => lspo_feature(t, x, y),
        door: (state, x, y) => lspo_door({ state, x, y }),
        monster: (a, x, y, o) => lspo_monster(a, x, y, o),
        object: (a, x, y, o) => lspo_object(a, x, y, o),
        non_diggable: (s) => lspo_non_diggable(s[0], s[1], s[2], s[3]),
        trap: (t, x, y) => lspo_trap(t, x, y),
    };
    const selection = { area: (x1, y1, x2, y2) => [x1, y1, x2, y2] };

    des.level_flags('mazelevel', 'noteleport', 'hardfloor', 'icedpools');
    des.level_init({ style: 'solidfill', fg: 'I' });

    let pools = selection_new();
    /* random locations */
    for (let i = 1; i <= 13; i++)
        l_selection_set(pools);
    /* some bigger ones */
    pools = l_selection_or(pools,
                l_selection_grow(l_selection_set(selection_new()), 'west'));
    pools = l_selection_or(pools,
                l_selection_grow(l_selection_set(selection_new()), 'north'));
    pools = l_selection_or(pools,
                l_selection_grow(l_selection_set(selection_new()), 'random'));

    /* Lava pools surrounded by water */
    des.terrain(l_selection_grow(selection_clone(pools), 'all'), 'P');
    des.terrain(pools, 'L');

    des.map(VAL_STRT_MAP);
    /* Dungeon Description */
    des.region(selection.area(0, 0, 75, 19), 'lit');
    /* Portal arrival point */
    des.levregion({ region: [66, 17, 66, 17], type: 'branch' });
    /* Stairs */
    des.stair('down', 18, 1);
    des.feature('fountain', 53, 2);
    /* Doors */
    des.door('locked', 26, 10);
    des.door('locked', 43, 10);
    /* Norn */
    des.monster({ id: 'Norn', coord: [35, 10], inventory: () => {
        des.object({ id: 'banded mail', spe: 5 });
        des.object({ id: 'long sword', spe: 4 });
    } });
    /* The treasure of the Norn */
    des.object('chest', 36, 10);
    /* valkyrie guards for the audience chamber */
    des.monster('warrior', 27, 8);
    des.monster('warrior', 27, 9);
    des.monster('warrior', 27, 11);
    des.monster('warrior', 27, 12);
    des.monster('warrior', 42, 8);
    des.monster('warrior', 42, 9);
    des.monster('warrior', 42, 11);
    des.monster('warrior', 42, 12);
    /* Non diggable walls */
    des.non_diggable(selection.area(26, 7, 43, 13));
    /* Random traps */
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    des.trap('fire');
    /* Monsters on siege duty. */
    des.monster('fire ant', 4, 12);
    des.monster('fire ant', 8, 8);
    des.monster('fire ant', 14, 4);
    des.monster('fire ant', 17, 11);
    des.monster('fire ant', 24, 10);
    des.monster('fire ant', 45, 10);
    des.monster('fire ant', 54, 2);
    des.monster('fire ant', 55, 7);
    des.monster('fire ant', 58, 14);
    des.monster('fire ant', 63, 17);
    des.monster({ id: 'fire giant', x: 18, y: 1, peaceful: 0 });
    des.monster({ id: 'fire giant', x: 10, y: 16, peaceful: 0 });
}
