// dat/minetn-1.js — Minetown variant 1, "Orcish Town".
// C ref: dat/minetn-1.lua
//
// Frontier Town overrun by orcs: iron-bar barricades, a defiled shrine,
// shopkeeper corpses in the looted shops, guaranteed candles, rubble, and
// the orcish army placed by rndcoord inside the floodfilled town.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_region_full, lspo_door, lspo_feature, lspo_altar,
         lspo_object, lspo_monster, lspo_replace_terrain, lspo_wallify,
         lspo_levregion, lspo_teleport_region,
         l_selection_fillrect, l_selection_flood,
         l_selection_and } from '../sp_lev.js';
import { selection_rndcoord } from '../selvar.js';
import { rn2 } from '../rng.js';

/* dat/nhlib.lua math.random shim — two-arg form is a + rn2(b + 1 - a) */
const mathrandom = (a, b) => a + rn2(b + 1 - a);
/* dat/nhlib.lua:43 percent() — rn2(100) < n */
const percent = (n) => rn2(100) < n;
/* dat/nhlib.lua:17 shuffle() — for i = #list, 2, -1: swap i with
   math.random(i) = 1 + rn2(i), both 1-indexed */
function shuffle(list) {
    for (let i = list.length; i >= 2; i--) {
        const j = 1 + rn2(i);
        [list[i - 1], list[j - 1]] = [list[j - 1], list[i - 1]];
    }
}

const MINETN1_MAP = `
.....................................
.----------------F------------------.
.|.................................|.
.|.-------------......------------.|.
.|.|...|...|...|......|..|...|...|.|.
.F.|...|...|...|......|..|...|...|.|.
.|.|...|...|...|......|..|...|...|.F.
.|.|...|...|----......------------.|.
.|.---------.......................|.
.|.................................|.
.|.---------.....--...--...........|.
.|.|...|...|----.|.....|.---------.|.
.|.|...|...|...|.|.....|.|..|....|.|.
.|.|...|...|...|.|.....|.|..|....|.|.
.|.|...|...|...|.|.....|.|..|....|.|.
.|.-------------.-------.---------.|.
.|.................................F.
.-----------F------------F----------.
.....................................
`.replace(/^\n/, '').replace(/\n$/, '');

export async function minetn1_level() {
    const at = (f) => (a, x, y, o) =>
        Array.isArray(x) ? f(a, x[0], x[1], o) : f(a, x, y, o);
    const des = {
        level_init: lspo_level_init,
        level_flags: lspo_level_flags,
        map: lspo_map_full,
        region: (sel, lit) => lspo_region_full(
            Array.isArray(sel) ? { area: sel, lit: lit === 'lit' } : sel),
        door: (state, x, y) => lspo_door({ state, x, y }),
        feature: (t, x, y) => lspo_feature(t, x, y),
        altar: (o) => lspo_altar(o),
        object: at(lspo_object),
        monster: (a, x, y, o) => lspo_monster(a, x, y, o),
        replace_terrain: lspo_replace_terrain,
        wallify: () => lspo_wallify(),
        levregion: lspo_levregion,
        teleport_region: lspo_teleport_region,
    };
    const selection = { area: (x1, y1, x2, y2) => [x1, y1, x2, y2] };

    des.level_flags('mazelevel');

    des.level_init({ style: 'mines', fg: '.', bg: ' ', smoothed: true,
                     joined: true, walled: true });

    des.map(MINETN1_MAP);

    /* Don't let the player fall into his likely death; used to explicitly
       exclude the town, but that meant that you couldn't teleport out as
       well as not in. */
    des.teleport_region({ region: [1, 1, 75, 19], exclude: [1, 0, 35, 21],
                          region_islev: 1 });
    des.region(selection.area(1, 1, 35, 17), 'lit');
    des.levregion({ type: 'stair-up', region: [1, 3, 21, 19],
                    region_islev: 1, exclude: [0, 1, 36, 17] });
    des.levregion({ type: 'stair-down', region: [57, 3, 75, 19],
                    region_islev: 1, exclude: [0, 1, 36, 17] });

    /* shame we can't make polluted fountains */
    des.feature('fountain', 16, 9);
    des.feature('fountain', 25, 9);

    /* the altar's defiled; useful for BUC but never coaligned */
    des.altar({ x: 20, y: 13, align: 'noalign', type: 'shrine' });

    /* set up the shop doors; could be broken down */
    des.door('random', 5, 8);
    des.door('random', 9, 8);
    des.door('random', 13, 7);
    des.door('random', 22, 5);
    des.door('random', 27, 7);
    des.door('random', 31, 7);
    des.door('random', 5, 10);
    des.door('random', 9, 10);
    des.door('random', 15, 13);
    des.door('random', 25, 13);
    des.door('random', 31, 11);

    /* knock a few holes in the shop interior walls */
    des.replace_terrain({ region: [7, 4, 11, 6], fromterrain: '|',
                          toterrain: '.', chance: 18 });
    des.replace_terrain({ region: [25, 4, 29, 6], fromterrain: '|',
                          toterrain: '.', chance: 18 });
    des.replace_terrain({ region: [7, 12, 11, 14], fromterrain: '|',
                          toterrain: '.', chance: 18 });
    des.replace_terrain({ region: [28, 12, 28, 14], fromterrain: '|',
                          toterrain: '.', chance: 33 });

    /* One spot each in most shops... */
    const place = [[5, 4], [9, 5], [13, 4], [26, 4], [31, 5], [30, 14],
                   [5, 14], [10, 13], [26, 14], [27, 13]];
    shuffle(place);

    /* scatter some bodies */
    des.object({ id: 'corpse', x: 20, y: 12, montype: 'aligned cleric' });
    des.object({ id: 'corpse', coord: place[0], montype: 'shopkeeper' });
    des.object({ id: 'corpse', coord: place[1], montype: 'shopkeeper' });
    des.object({ id: 'corpse', coord: place[2], montype: 'shopkeeper' });
    des.object({ id: 'corpse', coord: place[3], montype: 'shopkeeper' });
    des.object({ id: 'corpse', coord: place[4], montype: 'shopkeeper' });
    des.object({ id: 'corpse', montype: 'watchman' });
    des.object({ id: 'corpse', montype: 'watchman' });
    des.object({ id: 'corpse', montype: 'watchman' });
    des.object({ id: 'corpse', montype: 'watchman' });
    des.object({ id: 'corpse', montype: 'watch captain' });

    /* Rubble! */
    {
        const n = mathrandom(10, 19);
        for (let i = 1; i <= n; i++) {
            if (percent(90)) {
                des.object('boulder');
            }
            des.object('rock');
        }
    }

    /* Guarantee 7 candles since we won't have Izchak available */
    des.object({ id: 'wax candle', coord: place[3],
                 quantity: mathrandom(1, 2) });

    des.object({ id: 'wax candle', coord: place[0],
                 quantity: mathrandom(2, 4) });
    des.object({ id: 'wax candle', coord: place[1],
                 quantity: mathrandom(1, 2) });
    des.object({ id: 'tallow candle', coord: place[2],
                 quantity: mathrandom(1, 3) });
    des.object({ id: 'tallow candle', coord: place[1],
                 quantity: mathrandom(1, 2) });
    des.object({ id: 'tallow candle', coord: place[3],
                 quantity: mathrandom(1, 2) });

    /* go ahead and leave a lamp next to one corpse to be suggestive
       and some empty wands... */
    des.object('oil lamp', place[1]);
    des.object({ id: 'wand of striking', coord: place[0], buc: 'uncursed',
                 spe: 0 });
    des.object({ id: 'wand of striking', coord: place[2], buc: 'uncursed',
                 spe: 0 });
    des.object({ id: 'wand of striking', coord: place[3], buc: 'uncursed',
                 spe: 0 });
    des.object({ id: 'wand of magic missile', coord: place[3],
                 buc: 'uncursed', spe: 0 });
    des.object({ id: 'wand of magic missile', coord: place[4],
                 buc: 'uncursed', spe: 0 });

    /* the Orcish Army */

    const inside = l_selection_flood(18, 8);
    const near_temple = l_selection_and(l_selection_fillrect(17, 8, 23, 14),
                                        inside);

    {
        const n = mathrandom(5, 15);
        for (let i = 1; i <= n; i++) {
            if (percent(50)) {
                const c = selection_rndcoord(inside, 1);
                des.monster({ id: 'orc-captain', coord: [c.x, c.y],
                              peaceful: 0 });
            } else {
                if (percent(80)) {
                    const c = selection_rndcoord(inside, 1);
                    des.monster({ id: 'Uruk-hai', coord: [c.x, c.y],
                                  peaceful: 0 });
                } else {
                    const c = selection_rndcoord(inside, 1);
                    des.monster({ id: 'Mordor orc', coord: [c.x, c.y],
                                  peaceful: 0 });
                }
            }
        }
    }
    /* shamans can be hanging out in/near the temple
       one of the shamans is higher level */
    {
        const n = mathrandom(1, 6);
        for (let i = 1; i <= n; i++) {
            const c = selection_rndcoord(near_temple, 0);
            des.monster({ id: 'orc shaman', coord: [c.x, c.y], peaceful: 0,
                          m_lev_adj: (i === 1) ? 3 : 0 });
        }
    }
    /* these are not such a big deal to run into outside the bars */
    {
        const n = mathrandom(10, 19);
        for (let i = 1; i <= n; i++) {
            if (percent(90)) {
                des.monster({ id: 'hill orc', peaceful: 0 });
            } else {
                des.monster({ id: 'goblin', peaceful: 0 });
            }
        }
    }

    /* Hack to force full-level wallification */

    des.wallify();
}
