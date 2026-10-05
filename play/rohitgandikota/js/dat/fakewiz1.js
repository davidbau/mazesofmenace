// dat/fakewiz1.js — the first decoy Wizard's tower.
// C ref: dat/fakewiz1.lua
//
// A moated mini-tower on a mazegrid with a lich, a vampire lord and a
// kraken, the wizard3 portal in its heart, and hell_tweaks outside.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_region_full, lspo_trap, lspo_monster, lspo_mazewalk,
         lspo_levregion, lspo_teleport_region,
         l_selection_match, l_selection_fillrect,
         l_selection_or } from '../sp_lev.js';
import { selection_getbounds, selection_clone, selection_not } from '../selvar.js';
import { hell_tweaks } from './nhlib.js';

const FAKEWIZ1_MAP = `
.........
.}}}}}}}.
.}}---}}.
.}--.--}.
.}|...|}.
.}--.--}.
.}}---}}.
.}}}}}}}.
.........
`.replace(/^\n/, '').replace(/\n$/, '');

export async function fakewiz1_level() {
    const des = {
        level_init: lspo_level_init,
        level_flags: lspo_level_flags,
        map: lspo_map_full,
        region: lspo_region_full,
        trap: (t, x, y) => lspo_trap(t, x, y),
        monster: (a, x, y, o) => lspo_monster(a, x, y, o),
        mazewalk: lspo_mazewalk,
        levregion: lspo_levregion,
        teleport_region: lspo_teleport_region,
    };

    des.level_init({ style: 'mazegrid', bg: '-' });

    des.level_flags('mazelevel');

    const tmpbounds = l_selection_match('-');
    const bnds = { lx: 0, ly: 0, hx: 0, hy: 0 };
    selection_getbounds(tmpbounds, bnds);           /* tmpbounds:bounds() */
    const bounds2 = l_selection_fillrect(bnds.lx, bnds.ly + 1,
                                         bnds.hx - 2, bnds.hy - 1);

    const fakewiz1 = des.map({ halign: 'center', valign: 'center',
                               map: FAKEWIZ1_MAP, contents: (rm) => {
        des.levregion({ region: [1, 0, 79, 20], region_islev: 1,
                        exclude: [0, 0, 8, 8], type: 'stair-up' });
        des.levregion({ region: [1, 0, 79, 20], region_islev: 1,
                        exclude: [0, 0, 8, 8], type: 'stair-down' });
        des.levregion({ region: [1, 0, 79, 20], region_islev: 1,
                        exclude: [0, 0, 8, 8], type: 'branch' });
        des.teleport_region({ region: [1, 0, 79, 20], region_islev: 1,
                              exclude: [2, 2, 6, 6] });
        des.levregion({ region: [4, 4, 4, 4], type: 'portal',
                        name: 'wizard3' });
        des.mazewalk(8, 5, 'east');
        des.region({ region: [4, 3, 6, 6], lit: 0, type: 'ordinary',
                     irregular: 1, arrival_room: true });
        des.monster('L', 4, 4);
        des.monster('vampire lord', 3, 4);
        des.monster('kraken', 6, 6);
        /* And to make things a little harder. */
        des.trap('board', 4, 3);
        des.trap('board', 4, 5);
        des.trap('board', 3, 4);
        des.trap('board', 5, 4);
    } });

    const protected_ = l_selection_or(
        selection_not(selection_clone(bounds2)), fakewiz1);
    hell_tweaks(protected_);
}
