// dat/tower1.js — the upper stage of Vlad's tower.
// C ref: dat/Tower1.lua
//
// A three-lobed keep placed half-left/center with six shuffled niches:
// Vlad in the middle, three vampires and the three brides in niches, seven
// chests (two with candles), all inside a non-diggable shell.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_door, lspo_ladder, lspo_object, lspo_monster,
         lspo_non_diggable } from '../sp_lev.js';
import { rn2 } from '../rng.js';
import { game } from '../gstate.js';
import { PMNAMES, MFLAGS } from '../monst_data.js';

/* dat/nhlib.lua:17 shuffle() — for i = #list, 2, -1: swap i with
   math.random(i) = 1 + rn2(i), both 1-indexed */
function shuffle(list) {
    for (let i = list.length; i >= 2; i--) {
        const j = 1 + rn2(i);
        [list[i - 1], list[j - 1]] = [list[j - 1], list[i - 1]];
    }
}
/* dat/nhlib.lua math.random shim — two-arg form is a + rn2(b + 1 - a) */
const mathrandom = (a, b) => a + rn2(b + 1 - a);

const TOWER1_MAP = `
  --- --- ---  
  |.| |.| |.|  
---S---S---S---
|.......+.+...|
---+-----.-----
  |...\\.|.+.|  
---+-----.-----
|.......+.+...|
---S---S---S---
  |.| |.| |.|  
  --- --- ---  
`.replace(/^\n/, '').replace(/\n$/, '');

export async function tower1_level() {
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
        /* selection.area() here is the [x1,y1,x2,y2] shim; spread it, or
           lspo_non_diggable sees an array as x1 and stamps nothing */
        non_diggable: (s) => lspo_non_diggable(s[0], s[1], s[2], s[3]),
    };
    const selection = { area: (x1, y1, x2, y2) => [x1, y1, x2, y2] };

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'noteleport', 'hardfloor', 'solidify');
    des.map({ halign: 'half-left', valign: 'center', map: TOWER1_MAP });

    const niches = [[3, 1], [3, 9], [7, 1], [7, 9], [11, 1], [11, 9]];
    shuffle(niches);

    des.ladder('down', 11, 5);
    /* The lord and his court */
    des.monster('Vlad the Impaler', 6, 5);
    des.monster('V', niches[0]);
    des.monster('V', niches[1]);
    des.monster('V', niches[2]);
    /* The brides; 'waiting' forces vampire form instead of bat/fog/wolf. */
    /* nh.is_genocided("vampire") — mvitals[PM_VAMPIRE].mvflags & G_GENOD */
    const Vgenod = !!((game.mvitals?.[PMNAMES.PM_VAMPIRE]?.mvflags ?? 0)
                      & MFLAGS.G_GENOD);
    const Vnames = Vgenod ? [null, null, null]
                          : ['Madame', 'Marquise', 'Countess'];
    des.monster({ id: 'vampire lady', coord: niches[3], name: Vnames[0],
                  waiting: 1 });
    des.monster({ id: 'vampire lady', coord: niches[4], name: Vnames[1],
                  waiting: 1 });
    des.monster({ id: 'vampire lady', coord: niches[5], name: Vnames[2],
                  waiting: 1 });
    /* The doors */
    des.door('closed', 8, 3);
    des.door('closed', 10, 3);
    des.door('closed', 3, 4);
    des.door('locked', 10, 5);
    des.door('locked', 8, 7);
    des.door('locked', 10, 7);
    des.door('closed', 3, 6);
    /* treasures */
    des.object('chest', 7, 5);

    des.object('chest', niches[5]);
    des.object('chest', niches[0]);
    des.object('chest', niches[1]);
    des.object('chest', niches[2]);
    des.object({ id: 'chest', coord: niches[3],
                 contents: () => {
                     des.object({ id: 'wax candle',
                                  quantity: mathrandom(4, 8) });
                 } });
    des.object({ id: 'chest', coord: niches[4],
                 contents: () => {
                     des.object({ id: 'tallow candle',
                                  quantity: mathrandom(4, 8) });
                 } });
    /* We have to protect the tower against outside attacks */
    des.non_diggable(selection.area(0, 0, 14, 10));
}
