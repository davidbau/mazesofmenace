// dat/baalz.js — Baalzebub's Lair.
// C ref: dat/baalz.lua
//
// A corrmaze level whose map is a giant fly: the two pools mark wall-fixup
// spots and the iron-bar eyes get diggable columns (baalz_fixup), with
// Baalzebub waiting in the head chamber.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_stair, lspo_door, lspo_object, lspo_trap, lspo_monster,
         lspo_non_diggable, lspo_mazewalk, lspo_levregion,
         lspo_teleport_region } from '../sp_lev.js';

const BAALZ_MAP = `
-------------------------------------------------
|                   ----               ----      
|          ----     |     -----------  |         
| ------      |  ---------|.........|--P         
| F....|  -------|...........--------------      
---....|--|..................S............|----  
+...--....S..----------------|............S...|  
---....|--|..................|............|----  
| F....|  -------|...........-----S--------      
| ------      |  ---------|.........|--P         
|          ----     |     -----------  |         
|                   ----               ----      
-------------------------------------------------
`.replace(/^\n/, '').replace(/\n$/, '');

export async function baalz_level() {
    const des = {
        level_init: lspo_level_init,
        level_flags: lspo_level_flags,
        map: lspo_map_full,
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
    const selection = { area: (x1, y1, x2, y2) => [x1, y1, x2, y2] };

    des.level_init({ style: 'solidfill', fg: ' ', lit: 0 });

    /* TODO FIXME: see baalz_fixup - the legs get removed currently. */

    des.level_flags('mazelevel', 'corrmaze');
    /* the two pools are fakes used to mark spots which need special wall
       fixups; the two iron bars are eyes and spots to their left will be
       made diggable */
    des.map({ halign: 'right', valign: 'center', map: BAALZ_MAP });
    des.levregion({ region: [1, 0, 15, 20], region_islev: 1,
                    exclude: [15, 1, 70, 16], exclude_islev: 1,
                    type: 'stair-up' });
    des.levregion({ region: [1, 0, 15, 20], region_islev: 1,
                    exclude: [15, 1, 70, 16], exclude_islev: 1,
                    type: 'branch' });
    des.teleport_region({ region: [1, 0, 15, 20], region_islev: 1,
                          exclude: [15, 1, 70, 16], exclude_islev: 1 });
    /* this actually leaves the farthest right column diggable */
    des.non_diggable(selection.area(0, 0, 47, 12));
    des.mazewalk(0, 6, 'west');
    des.stair('down', 44, 6);
    des.door('locked', 0, 6);
    /* The fellow in residence */
    des.monster('Baalzebub', 35, 6);
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
    des.trap('spiked pit');
    des.trap('fire');
    des.trap('sleep gas');
    des.trap('anti magic');
    des.trap('fire');
    des.trap('magic');
    des.trap('magic');
    /* Random monsters. */
    des.monster('ghost', 37, 7);
    des.monster('horned devil', 32, 5);
    des.monster('barbed devil', 38, 7);
    des.monster('L');
    /* Some Vampires for good measure */
    des.monster('V');
    des.monster('V');
    des.monster('V');
}
