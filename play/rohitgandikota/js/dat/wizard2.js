// dat/wizard2.js — the middle Wizard's tower level.
// C ref: dat/wizard2.lua
//
// The tower's zoo floor between two ladders, all walls undiggable and
// unphaseable, with hell_tweaks outside the tower map.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_region_full, lspo_door, lspo_ladder, lspo_object, lspo_trap,
         lspo_non_diggable, lspo_non_passwall, lspo_mazewalk,
         lspo_levregion, lspo_teleport_region,
         l_selection_match, l_selection_fillrect,
         l_selection_or } from '../sp_lev.js';
import { selection_getbounds, selection_clone, selection_not } from '../selvar.js';
import { hell_tweaks } from './nhlib.js';

const WIZARD2_MAP = `
----------------------------x
|.....|.S....|.............|x
|.....|.-------S--------S--|x
|.....|.|.........|........|x
|..-S--S|.........|........|x
|..|....|.........|------S-|x
|..|....|.........|.....|..|x
|-S-----|.........|.....|..|x
|.......|.........|S--S--..|x
|.......|.........|.|......|x
|-----S----S-------.|......|x
|............|....S.|......|x
----------------------------x
`.replace(/^\n/, '').replace(/\n$/, '');

export async function wizard2_level() {
    const des = {
        level_init: lspo_level_init,
        level_flags: lspo_level_flags,
        map: lspo_map_full,
        region: lspo_region_full,
        door: (state, x, y) => lspo_door({ state, x, y }),
        ladder: (d, x, y) => lspo_ladder(d, x, y),
        object: (a, x, y, o) => lspo_object(a, x, y, o),
        trap: (t, x, y) => lspo_trap(t, x, y),
        non_diggable: (s) => lspo_non_diggable(s[0], s[1], s[2], s[3]),
        non_passwall: (s) => lspo_non_passwall(s[0], s[1], s[2], s[3]),
        mazewalk: lspo_mazewalk,
        levregion: lspo_levregion,
        teleport_region: lspo_teleport_region,
    };
    const selection = { area: (x1, y1, x2, y2) => [x1, y1, x2, y2] };

    des.level_init({ style: 'mazegrid', bg: '-' });

    des.level_flags('mazelevel', 'noteleport', 'hardfloor');

    const tmpbounds = l_selection_match('-');
    const bnds = { lx: 0, ly: 0, hx: 0, hy: 0 };
    selection_getbounds(tmpbounds, bnds);           /* tmpbounds:bounds() */
    const bounds2 = l_selection_fillrect(bnds.lx, bnds.ly + 1,
                                         bnds.hx - 2, bnds.hy - 1);

    const wiz2 = des.map({ halign: 'center', valign: 'center',
                           map: WIZARD2_MAP, contents: (rm) => {
        des.levregion({ type: 'stair-up', region: [1, 0, 79, 20],
                        region_islev: 1, exclude: [0, 0, 28, 12] });
        des.levregion({ type: 'stair-down', region: [1, 0, 79, 20],
                        region_islev: 1, exclude: [0, 0, 28, 12] });
        des.levregion({ type: 'branch', region: [1, 0, 79, 20],
                        region_islev: 1, exclude: [0, 0, 28, 12] });
        des.teleport_region({ region: [1, 0, 79, 20], region_islev: 1,
                              exclude: [0, 0, 27, 12] });
        /* entire tower in a region, constrains monster migration */
        des.region({ region: [1, 1, 26, 11], lit: 0, type: 'ordinary',
                     arrival_room: true });
        des.region({ region: [9, 3, 17, 9], lit: 0, type: 'zoo',
                     filled: 1 });
        des.door('closed', 15, 2);
        des.door('closed', 11, 10);
        des.mazewalk(28, 5, 'east');
        des.ladder('up', 12, 1);
        des.ladder('down', 14, 11);
        /* Non diggable walls everywhere */
        des.non_diggable(selection.area(0, 0, 27, 12));

        des.non_passwall(selection.area(0, 0, 27, 12));
        /* Random traps. */
        des.trap('spiked pit');
        des.trap('sleep gas');
        des.trap('anti magic');
        des.trap('magic');
        /* Some random loot. */
        des.object('!');
        des.object('!');
        des.object('?');
        des.object('?');
        des.object('+');
        /* treasures */
        des.object('"', 4, 6);
    } });

    const protected_ = l_selection_or(
        selection_not(selection_clone(bounds2)), wiz2);
    hell_tweaks(protected_);
}
