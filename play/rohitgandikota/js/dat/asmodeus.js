// dat/asmodeus.js — Asmodeus's Lair.
// C ref: dat/asmodeus.lua
//
// A mazegrid level with two mapped parts: Asmodeus's cold palace half-left
// and a long guarded corridor half-right, joined by mazewalks, with
// hell_tweaks over everything outside them.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_region_full, lspo_region_sel, lspo_stair, lspo_door,
         lspo_object, lspo_trap, lspo_monster, lspo_non_diggable,
         lspo_mazewalk, lspo_levregion, lspo_teleport_region,
         l_selection_match, l_selection_fillrect,
         l_selection_or } from '../sp_lev.js';
import { selection_getbounds, selection_clone, selection_not } from '../selvar.js';
import { hell_tweaks } from './nhlib.js';

const ASMO1_MAP = `
---------------------
|.............|.....|
|.............S.....|
|---+------------...|
|.....|.........|-+--
|..---|.........|....
|..|..S.........|....
|..|..|.........|....
|..|..|.........|-+--
|..|..-----------...|
|..S..........|.....|
---------------------
`.replace(/^\n/, '').replace(/\n$/, '');

const ASMO2_MAP = `
---------------------------------
................................|
................................+
................................|
---------------------------------
`.replace(/^\n/, '').replace(/\n$/, '');

export async function asmodeus_level() {
    const des = {
        level_init: lspo_level_init,
        level_flags: lspo_level_flags,
        map: lspo_map_full,
        region: (sel, lit) => (typeof lit === 'string')
            ? lspo_region_sel(sel, lit) : lspo_region_full(sel),
        stair: (d, x, y) => lspo_stair(d, x, y),
        door: (state, x, y) => lspo_door({ state, x, y }),
        object: (a, x, y, o) => lspo_object(a, x, y, o),
        trap: (t, x, y) => lspo_trap(t, x, y),
        monster: (a, x, y, o) => lspo_monster(a, x, y, o),
        non_diggable: (s) => lspo_non_diggable(s[0], s[1], s[2], s[3]),
        mazewalk: lspo_mazewalk,
        levregion: lspo_levregion,
        teleport_region: lspo_teleport_region,
    };
    /* selection.area: the region form uses real selections, non_diggable
       the rect shim — pick per call site below */
    const rect = (x1, y1, x2, y2) => [x1, y1, x2, y2];

    des.level_init({ style: 'mazegrid', bg: '-' });

    des.level_flags('mazelevel');

    const tmpbounds = l_selection_match('-');
    const bnds = { lx: 0, ly: 0, hx: 0, hy: 0 };
    selection_getbounds(tmpbounds, bnds);           /* tmpbounds:bounds() */
    const bounds2 = l_selection_fillrect(bnds.lx, bnds.ly + 1,
                                         bnds.hx - 2, bnds.hy - 1);

    /* First part */
    const asmo1 = des.map({ halign: 'half-left', valign: 'center',
                            map: ASMO1_MAP, contents: (rm) => {
        /* Doors */
        des.door('closed', 4, 3);
        des.door('locked', 18, 4);
        des.door('closed', 18, 8);

        des.stair('down', 13, 7);
        /* Non diggable walls */
        des.non_diggable(rect(0, 0, 20, 11));
        /* Entire main area */
        des.region(l_selection_fillrect(1, 1, 20, 10), 'unlit');
        /* The fellow in residence */
        des.monster('Asmodeus', 12, 7);
        /* Some random weapons and armor. */
        des.object('[');
        des.object('[');
        des.object(')');
        des.object(')');
        des.object('*');
        des.object('!');
        des.object('!');
        des.object('?');
        des.object('?');
        des.object('?');
        /* Some traps. */
        des.trap('spiked pit', 5, 2);
        des.trap('fire', 8, 6);
        des.trap('sleep gas');
        des.trap('anti magic');
        des.trap('fire');
        des.trap('magic');
        des.trap('magic');
        /* Random monsters. */
        des.monster('ghost', 11, 7);
        des.monster('horned devil', 10, 5);
        des.monster('L');
        /* Some Vampires for good measure */
        des.monster('V');
        des.monster('V');
        des.monster('V');
    } });

    des.levregion({ region: [1, 0, 6, 20], region_islev: 1,
                    exclude: [6, 1, 70, 16], exclude_islev: 1,
                    type: 'stair-up' });

    des.levregion({ region: [1, 0, 6, 20], region_islev: 1,
                    exclude: [6, 1, 70, 16], exclude_islev: 1,
                    type: 'branch' });
    des.teleport_region({ region: [1, 0, 6, 20], region_islev: 1,
                          exclude: [6, 1, 70, 16], exclude_islev: 1 });

    /* Second part */
    const asmo2 = des.map({ halign: 'half-right', valign: 'center',
                            map: ASMO2_MAP, contents: (rm) => {
        des.mazewalk(32, 2, 'east');
        /* Non diggable walls */
        des.non_diggable(rect(0, 0, 32, 4));
        des.door('closed', 32, 2);
        des.monster('&');
        des.monster('&');
        des.monster('&');
        des.trap('anti magic');
        des.trap('fire');
        des.trap('magic');
    } });

    const protected_ = l_selection_or(
        l_selection_or(selection_not(selection_clone(bounds2)), asmo1),
        asmo2);
    hell_tweaks(protected_);
}
