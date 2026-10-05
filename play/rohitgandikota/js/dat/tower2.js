// dat/tower2.js — the middle stage of Vlad's tower.
// C ref: dat/Tower2.lua
//
// The same three-lobed keep as the top floor, ten shuffled niches holding
// two demons, two hell hound pups, a winter wolf, two trapped-amulet
// chests, boots, plate mail and one of seven shuffled spellbooks. Note the
// Lua deals from place[10] first, then place[1..9] in order.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_door, lspo_ladder, lspo_object, lspo_monster,
         lspo_non_diggable } from '../sp_lev.js';
import { lua_shuffle as shuffle } from '../nhlua.js';

const TOWER2_MAP = `
  --- --- ---  
  |.| |.| |.|  
---S---S---S---
|.S.........S.|
---.------+----
  |......|..|  
--------.------
|.S......+..S.|
---S---S---S---
  |.| |.| |.|  
  --- --- ---  `;

export async function tower2_level() {
    const at = (f) => (a, x, y, o) =>
        Array.isArray(x) ? f(a, x[0], x[1], o) : f(a, x, y, o);
    const des = {
        level_init: lspo_level_init,
        level_flags: lspo_level_flags,
        map: lspo_map_full,
        ladder: (d, x, y) => lspo_ladder(d, x, y),
        door: (state, x, y) => lspo_door({ state, x, y }),
        monster: at(lspo_monster),
        object: at(lspo_object),
        non_diggable: (s) => lspo_non_diggable(s[0], s[1], s[2], s[3]),
    };
    const selection = { area: (x1, y1, x2, y2) => [x1, y1, x2, y2] };

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'noteleport', 'hardfloor', 'solidify');
    des.map({ halign: 'half-left', valign: 'center', map: TOWER2_MAP });

    /* Random places are the 10 niches */
    const place = [[3, 1], [7, 1], [11, 1], [1, 3], [13, 3],
                   [1, 7], [13, 7], [3, 9], [7, 9], [11, 9]];
    shuffle(place);

    des.ladder('up', 11, 5);
    des.ladder('down', 3, 7);
    des.door('locked', 10, 4);
    des.door('locked', 9, 7);
    des.monster('&', place[9]);
    des.monster('&', place[0]);
    des.monster('hell hound pup', place[1]);
    des.monster('hell hound pup', place[2]);
    des.monster('winter wolf', place[3]);
    des.object({ id: 'chest', coord: place[4],
                 contents: () => {
                     des.object('amulet of life saving');
                 } });
    des.object({ id: 'chest', coord: place[5],
                 contents: () => {
                     des.object('amulet of strangulation');
                 } });
    des.object('water walking boots', place[6]);
    des.object('crystal plate mail', place[7]);

    const spbooks = [
        'spellbook of invisibility',
        'spellbook of cone of cold',
        'spellbook of create familiar',
        'spellbook of clairvoyance',
        'spellbook of charm monster',
        'spellbook of stone to flesh',
        'spellbook of polymorph',
    ];
    shuffle(spbooks);
    des.object(spbooks[0], place[8]);

    /* Walls in the tower are non diggable */
    des.non_diggable(selection.area(0, 0, 14, 10));
}
