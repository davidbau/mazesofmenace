// dat/wizard3.js — the bottom Wizard's tower level.
// C ref: dat/wizard3.lua
//
// The tower's entry floor: a moated decoy heart, a morgue (unfilled) and a
// beehive, the fakewiz1 portal, the entry chamber with a chance-placed
// secret door, and hell_tweaks outside the tower map.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_region_full, lspo_door, lspo_ladder, lspo_object, lspo_trap,
         lspo_monster, lspo_non_diggable, lspo_non_passwall, lspo_mazewalk,
         lspo_levregion, lspo_teleport_region,
         l_selection_match, l_selection_fillrect,
         l_selection_or } from '../sp_lev.js';
import { selection_getbounds, selection_clone, selection_not } from '../selvar.js';
import { rn2 } from '../rng.js';
import { hell_tweaks } from './nhlib.js';

/* dat/nhlib.lua:43 percent() — rn2(100) < n */
const percent = (n) => rn2(100) < n;

const WIZARD3_MAP = `
----------------------------x
|..|............S..........|x
|..|..------------------S--|x
|..|..|.........|..........|x
|..S..|.}}}}}}}.|..........|x
|..|..|.}}---}}.|-S--------|x
|..|..|.}--.--}.|..|.......|x
|..|..|.}|...|}.|..|.......|x
|..---|.}--.--}.|..|.......|x
|.....|.}}---}}.|..|.......|x
|.....S.}}}}}}}.|..|.......|x
|.....|.........|..|.......|x
----------------------------x
`.replace(/^\n/, '').replace(/\n$/, '');

export async function wizard3_level() {
    const des = {
        level_init: lspo_level_init,
        level_flags: lspo_level_flags,
        map: lspo_map_full,
        region: lspo_region_full,
        door: (o, x, y) => (typeof o === 'object')
            ? lspo_door(o) : lspo_door({ state: o, x, y }),
        ladder: (d, x, y) => lspo_ladder(d, x, y),
        object: (a, x, y, o) => lspo_object(a, x, y, o),
        trap: (t, x, y) => lspo_trap(t, x, y),
        monster: (a, x, y, o) => lspo_monster(a, x, y, o),
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

    const wiz3 = des.map({ halign: 'center', valign: 'center',
                           map: WIZARD3_MAP, contents: (rm) => {
        des.levregion({ type: 'stair-up', region: [1, 0, 79, 20],
                        region_islev: 1, exclude: [0, 0, 28, 12] });
        des.levregion({ type: 'stair-down', region: [1, 0, 79, 20],
                        region_islev: 1, exclude: [0, 0, 28, 12] });
        des.levregion({ type: 'branch', region: [1, 0, 79, 20],
                        region_islev: 1, exclude: [0, 0, 28, 12] });
        des.teleport_region({ region: [1, 0, 79, 20], region_islev: 1,
                              exclude: [0, 0, 27, 12] });
        des.levregion({ region: [25, 11, 25, 11], type: 'portal',
                        name: 'fakewiz1' });
        des.mazewalk(28, 9, 'east');
        des.region({ region: [7, 3, 15, 11], lit: 0, type: 'morgue',
                     filled: 2 });
        des.region({ region: [17, 6, 18, 11], lit: 0, type: 'beehive',
                     filled: 1 });
        /* make the entry chamber a real room; it affects monster arrival */
        des.region({ region: [20, 6, 26, 11], lit: 0, type: 'ordinary',
                     arrival_room: true,
                     contents: () => {
                         let w = 'north';
                         if (percent(50)) w = 'west';
                         des.door({ state: 'secret', wall: w });
                     } });
        des.door('closed', 18, 5);
        des.ladder('up', 11, 7);
        /* Non diggable walls
           Walls inside the moat stay diggable */
        des.non_diggable(selection.area(0, 0, 6, 12));
        des.non_diggable(selection.area(6, 0, 27, 2));
        des.non_diggable(selection.area(16, 2, 27, 12));
        des.non_diggable(selection.area(6, 12, 16, 12));

        des.non_passwall(selection.area(0, 0, 6, 12));
        des.non_passwall(selection.area(6, 0, 27, 2));
        des.non_passwall(selection.area(16, 2, 27, 12));
        des.non_passwall(selection.area(6, 12, 16, 12));

        des.monster('L', 10, 7);
        des.monster('vampire lord', 12, 7);
        /* Some surrounding horrors */
        des.monster('kraken', 8, 5);
        des.monster('giant eel', 8, 8);
        des.monster('kraken', 14, 5);
        des.monster('giant eel', 14, 8);
        /* Other monsters */
        des.monster('L');
        des.monster('D');
        des.monster('D', 26, 9);
        des.monster('&');
        des.monster('&');
        des.monster('&');
        /* And to make things a little harder. */
        des.trap('board', 10, 7);
        des.trap('board', 12, 7);
        des.trap('board', 11, 6);
        des.trap('board', 11, 8);
        /* Some loot */
        des.object(')');
        des.object('!');
        des.object('?');
        des.object('?');
        des.object('(');
        /* treasures */
        des.object('"', 11, 7);
    } });

    const protected_ = l_selection_or(
        selection_not(selection_clone(bounds2)), wiz3);
    hell_tweaks(protected_);
}
