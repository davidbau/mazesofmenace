// dat/knox.js — Fort Ludios.
// C ref: dat/knox.lua
//
// Croesus's fort: the gold-and-mine treasury seeded square by square via
// treasure_spot, three percent(50) layout variations, a throne room, a
// welcoming-committee zoo, barracks, and the moat dragons and eels.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_region_full, lspo_door, lspo_object, lspo_trap, lspo_monster,
         lspo_non_diggable, lspo_terrain, lspo_gold, lspo_levregion,
         lspo_teleport_region, l_selection_fillrect,
         l_selection_setpoint } from '../sp_lev.js';
import { selection_new, l_selection_iterate } from '../selvar.js';
import { rn2 } from '../rng.js';

/* dat/nhlib.lua math.random shim — two-arg form is a + rn2(b + 1 - a) */
const mathrandom = (a, b) => a + rn2(b + 1 - a);
/* dat/nhlib.lua:43 percent() — rn2(100) < n */
const percent = (n) => rn2(100) < n;

const KNOX_MAP = `
----------------------------------------------------------------------------
| |........|...............................................................|
| |........|.................................................------------..|
| --S----S--.................................................|..........|..|
|   #   |........}}}}}}}....................}}}}}}}..........|..........|..|
|   #   |........}-----}....................}-----}..........--+--+--...|..|
|   # ---........}|...|}}}}}}}}}}}}}}}}}}}}}}|...|}.................|...|..|
|   # |..........}---S------------------------S---}.................|...|..|
|   # |..........}}}|...............|..........|}}}.................+...|..|
| --S----..........}|...............S..........|}...................|...|..|
| |.....|..........}|...............|......\\...S}...................|...|..|
| |.....+........}}}|...............|..........|}}}.................+...|..|
| |.....|........}---S------------------------S---}.................|...|..|
| |.....|........}|...|}}}}}}}}}}}}}}}}}}}}}}|...|}.................|...|..|
| |..-S----......}-----}....................}-----}..........--+--+--...|..|
| |..|....|......}}}}}}}....................}}}}}}}..........|..........|..|
| |..|....|..................................................|..........|..|
| -----------................................................------------..|
|           |..............................................................|
----------------------------------------------------------------------------
`.replace(/^\n/, '').replace(/\n$/, '');

export async function knox_level() {
    const des = {
        level_init: lspo_level_init,
        level_flags: lspo_level_flags,
        map: lspo_map_full,
        region: (sel, lit) => lspo_region_full(
            Array.isArray(sel) ? { area: sel, lit: lit === 'lit' } : sel),
        door: (state, x, y) => lspo_door({ state, x, y }),
        object: (a, x, y, o) => lspo_object(a, x, y, o),
        trap: (t, x, y) => lspo_trap(t, x, y),
        monster: (a, x, y, o) => lspo_monster(a, x, y, o),
        non_diggable: (s) => lspo_non_diggable(s[0], s[1], s[2], s[3]),
        /* des.terrain(x, y, ch) — the 3-arg coordinate form goes through
           get_location_coord like the C (sp_lev.c:5008) */
        terrain: (x, y, ch) =>
            lspo_terrain(l_selection_setpoint(selection_new(), x, y), ch),
        gold: lspo_gold,
        levregion: lspo_levregion,
        teleport_region: lspo_teleport_region,
    };
    const selection = { area: (x1, y1, x2, y2) => [x1, y1, x2, y2] };

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'noteleport');
    /* Fort's entry is via a secret door rather than a drawbridge;
       the moat must be manually circumvented. */
    des.map(KNOX_MAP);
    /* Non diggable walls */
    des.non_diggable(selection.area(0, 0, 75, 19));
    /* Portal arrival point */
    des.levregion({ region: [8, 16, 8, 16], type: 'branch' });
    /* accessible via ^V in wizard mode; arrive near the portal */
    des.teleport_region({ region: [6, 15, 9, 16], dir: 'up' });
    des.teleport_region({ region: [6, 15, 9, 16], dir: 'down' });
    /* Throne room, with Croesus on the throne */
    des.region({ x1: 37, y1: 8, x2: 46, y2: 11, lit: 1, type: 'throne',
                 filled: 1 });
    /* 50% chance each to move throne and/or fort's entry secret door up one
       row */
    if (percent(50)) {
        des.monster({ id: 'Croesus', x: 43, y: 10, peaceful: 0 });
    } else {
        des.monster({ id: 'Croesus', x: 43, y: 9, peaceful: 0 });
        des.terrain(43, 9, '\\');
        des.terrain(43, 10, '.');
    }
    if (percent(50)) {
        des.terrain(47, 9, 'S');
        des.terrain(47, 10, '|');
    }

    /* The Vault */
    const treasure_spot = (x, y) => {
        des.gold({ x, y, amount: 600 + mathrandom(0, 300) });
        if (mathrandom(0, 2) === 0) {
            if (mathrandom(0, 2) === 0) {
                des.trap('spiked pit', x, y);
            } else {
                des.trap('land mine', x, y);
            }
        }
    };

    des.region({ region: [21, 8, 35, 11], lit: 1, type: 'ordinary' });
    const treasury = l_selection_fillrect(21, 8, 35, 11);
    l_selection_iterate(treasury, treasure_spot);

    /* Vault entrance also varies */
    if (percent(50)) {
        des.terrain(36, 9, '|');
        des.terrain(36, 10, 'S');
    }
    /* Corner towers */
    des.region(selection.area(19, 6, 21, 6), 'lit');
    des.region(selection.area(46, 6, 48, 6), 'lit');
    des.region(selection.area(19, 13, 21, 13), 'lit');
    des.region(selection.area(46, 13, 48, 13), 'lit');
    /* A welcoming committee */
    des.region({ region: [3, 10, 7, 13], lit: 1, type: 'zoo', filled: 1,
                 irregular: 1 });
    /* arrival chamber; needs to be a real room to control migrating
       monsters, and `unfilled' is a kludge to force an ordinary room to
       remain a room */
    des.region({ region: [6, 15, 9, 16], lit: 0, type: 'ordinary',
                 arrival_room: true });

    /* Force left and top walls of the arrival chamber to be unlit in order
       to hide a candle-light quirk (see dat/knox.lua for the full note). */
    des.region(selection.area(5, 14, 5, 17), 'unlit');
    des.region(selection.area(5, 14, 9, 14), 'unlit');

    /* Barracks */
    des.region({ region: [62, 3, 71, 4], lit: 1, type: 'barracks',
                 filled: 1, irregular: 1 });
    /* Doors */
    des.door('closed', 6, 14);
    des.door('closed', 9, 3);
    des.door('open', 63, 5);
    des.door('open', 66, 5);
    des.door('open', 68, 8);
    des.door('locked', 8, 11);
    des.door('open', 68, 11);
    des.door('closed', 63, 14);
    des.door('closed', 66, 14);
    des.door('closed', 4, 3);
    des.door('closed', 4, 9);
    /* Soldiers guarding the fort */
    des.monster('soldier', 12, 14);
    des.monster('soldier', 12, 13);
    des.monster('soldier', 11, 10);
    des.monster('soldier', 13, 2);
    des.monster('soldier', 14, 3);
    des.monster('soldier', 20, 2);
    des.monster('soldier', 30, 2);
    des.monster('soldier', 40, 2);
    des.monster('soldier', 30, 16);
    des.monster('soldier', 32, 16);
    des.monster('soldier', 40, 16);
    des.monster('soldier', 54, 16);
    des.monster('soldier', 54, 14);
    des.monster('soldier', 54, 13);
    des.monster('soldier', 57, 10);
    des.monster('soldier', 57, 9);
    des.monster('lieutenant', 15, 8);
    /* Possible source of a boulder */
    des.monster('stone giant', 3, 1);
    /* Four dragons guarding each side */
    des.monster('D', 18, 9);
    des.monster('D', 49, 10);
    des.monster('D', 33, 5);
    des.monster('D', 33, 14);
    /* Eels in the moat */
    des.monster('giant eel', 17, 8);
    des.monster('giant eel', 17, 11);
    des.monster('giant eel', 48, 8);
    des.monster('giant eel', 48, 11);
    /* The corner rooms treasures */
    des.object('diamond', 19, 6);
    des.object('diamond', 20, 6);
    des.object('diamond', 21, 6);
    des.object('emerald', 19, 13);
    des.object('emerald', 20, 13);
    des.object('emerald', 21, 13);
    des.object('ruby', 46, 6);
    des.object('ruby', 47, 6);
    des.object('ruby', 48, 6);
    des.object('amethyst', 46, 13);
    des.object('amethyst', 47, 13);
    des.object('amethyst', 48, 13);
}
