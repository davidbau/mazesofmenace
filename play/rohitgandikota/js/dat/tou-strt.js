// dat/tou-strt.js — the Tourist quest start level.
// C ref: dat/Tou-strt.lua
//
// Ankh-Morpork under siege: Twoflower's suite east of the shop strip, a
// morgue, spider and centaur raiders, eleven guides, watchmen on the
// river path, and kraken/piranha in the river.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_region_full, lspo_stair, lspo_levregion, lspo_door,
         lspo_object, lspo_trap, lspo_monster,
         lspo_non_diggable } from '../sp_lev.js';

const TOU_STRT_MAP = `.......}}....---------..-------------------------------------------------...
........}}...|.......|..|.-------------------------------------------...|...
.........}}..|.......|..|.|......|......|.............|......|......|...|...
..........}}.|.......|..|.|......+......+.............+......+..\\...|...|...
...........}}}..........|.|......|......|.............|......|......|...|...
.............}}.........|.|----S-|--S---|S----------S-|---S--|------|...|...
..............}}}.......|...............................................|...
................}}}.....----S------++--S----------S----------S-----------...
..................}}...........    ..    ...................................
......-------......}}}}........}}}}..}}}}..}}}}..}}}}.......................
......|.....|.......}}}}}}..}}}}   ..   }}}}..}}}}..}}}.....................
......|.....+...........}}}}}}........................}}}..}}}}..}}}..}}}...
......|.....|...........................................}}}}..}}}..}}}}.}}}}
......-------...............................................................
............................................................................
...-------......-------.....................................................
...|.....|......|.....|.....................................................
...|.....+......+.....|.....................................................
...|.....|......|.....|.....................................................
...-------......-------.....................................................`;

export async function toustrt_level() {
    const des = {
        level_init: lspo_level_init,
        level_flags: lspo_level_flags,
        map: lspo_map_full,
        region: (sel, lit) => lspo_region_full(
            Array.isArray(sel) ? { area: sel, lit: lit === 'lit' } : sel),
        stair: (d, x, y) => lspo_stair(d, x, y),
        levregion: lspo_levregion,
        door: (state, x, y) => lspo_door({ state, x, y }),
        monster: (a, x, y, o) => lspo_monster(a, x, y, o),
        object: (a, x, y, o) => lspo_object(a, x, y, o),
        non_diggable: (s) => lspo_non_diggable(s[0], s[1], s[2], s[3]),
        trap: (t, x, y) => lspo_trap(t, x, y),
    };
    const selection = { area: (x1, y1, x2, y2) => [x1, y1, x2, y2] };

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'noteleport', 'hardfloor');
    des.map(TOU_STRT_MAP);
    /* Dungeon Description */
    des.region(selection.area(0, 0, 75, 19), 'lit');
    des.region({ region: [14, 1, 20, 3], lit: 0, type: 'morgue',
                 filled: 1 });
    des.region(selection.area(7, 10, 11, 12), 'unlit');
    des.region(selection.area(4, 16, 8, 18), 'unlit');
    des.region(selection.area(17, 16, 21, 18), 'unlit');
    des.region(selection.area(27, 2, 32, 4), 'unlit');
    des.region(selection.area(34, 2, 39, 4), 'unlit');
    des.region(selection.area(41, 2, 53, 4), 'unlit');
    des.region(selection.area(55, 2, 60, 4), 'unlit');
    des.region(selection.area(62, 2, 67, 4), 'lit');
    /* Stairs */
    des.stair('down', 66, 3);
    /* Portal arrival point */
    des.levregion({ region: [68, 14, 68, 14], type: 'branch' });
    /* Non diggable walls */
    des.non_diggable(selection.area(0, 0, 75, 19));
    /* Doors */
    des.door('locked', 31, 5);
    des.door('locked', 36, 5);
    des.door('locked', 41, 5);
    des.door('locked', 52, 5);
    des.door('locked', 58, 5);
    des.door('locked', 28, 7);
    des.door('locked', 39, 7);
    des.door('locked', 50, 7);
    des.door('locked', 61, 7);
    des.door('closed', 33, 3);
    des.door('closed', 40, 3);
    des.door('closed', 54, 3);
    des.door('closed', 61, 3);
    des.door('open', 12, 11);
    des.door('open', 9, 17);
    des.door('open', 16, 17);
    des.door('locked', 35, 7);
    des.door('locked', 36, 7);
    /* Monsters on siege duty. */
    des.monster('giant spider');
    des.monster('giant spider');
    des.monster('giant spider');
    des.monster('giant spider');
    des.monster('giant spider');
    des.monster('giant spider');
    des.monster('giant spider');
    des.monster('giant spider');
    des.monster('giant spider');
    des.monster('giant spider');
    des.monster('giant spider');
    des.monster('giant spider');
    des.monster('s');
    des.monster('s');
    des.monster('forest centaur');
    des.monster('forest centaur');
    des.monster('forest centaur');
    des.monster('forest centaur');
    des.monster('forest centaur');
    des.monster('forest centaur');
    des.monster('forest centaur');
    des.monster('forest centaur');
    des.monster('C');
    /* Twoflower */
    des.monster({ id: 'Twoflower', coord: [64, 3], inventory: () => {
        des.object({ id: 'walking shoes', spe: 3 });
        des.object({ id: 'hawaiian shirt', spe: 3 });
    } });
    /* The treasure of Twoflower */
    des.object('chest', 64, 3);
    /* guides for the audience chamber */
    des.monster('guide', 29, 3);
    des.monster('guide', 32, 4);
    des.monster('guide', 35, 2);
    des.monster('guide', 38, 3);
    des.monster('guide', 45, 3);
    des.monster('guide', 48, 2);
    des.monster('guide', 49, 4);
    des.monster('guide', 51, 3);
    des.monster('guide', 57, 3);
    des.monster('guide', 62, 4);
    des.monster('guide', 66, 4);
    /* path guards */
    des.monster('watchman', 35, 8);
    des.monster('watchman', 36, 8);
    /* river monsters */
    des.monster('giant eel', 62, 12);
    des.monster('piranha', 47, 10);
    des.monster('piranha', 29, 11);
    des.monster('kraken', 34, 9);
    des.monster('kraken', 37, 9);
    /* Random traps */
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
}
