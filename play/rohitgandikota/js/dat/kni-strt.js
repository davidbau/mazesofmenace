// dat/kni-strt.js — the Knight quest start level.
// C ref: dat/Kni-strt.lua
//
// Camelot under siege: King Arthur's throne hall on a lit field, four
// peaceful knights in the watchrooms (mk_mplayer monsters), six pages, a
// quasit picket line, and two to four peaceful warhorses that each have a
// 50% saddle.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_region_full, lspo_stair, lspo_levregion, lspo_door,
         lspo_object, lspo_trap, lspo_monster,
         lspo_non_diggable } from '../sp_lev.js';
import { rn2 } from '../rng.js';

/* dat/nhlib.lua:10 percent(n) — rn2(100) < n */
const percent = (n) => rn2(100) < n;

const KNI_STRT_MAP = `..................................................
.-----......................................-----.
.|...|......................................|...|.
.--|+-------------------++-------------------+|--.
...|...................+..+...................|...
...|.|-----------------|++|-----------------|.|...
...|.|.................|..|.........|.......|.|...
...|.|...\\.............+..+.........|.......|.|...
...|.|.................+..+.........+.......|.|...
...|.|.................|..|.........|.......|.|...
...|.|--------------------------------------|.|...
...|..........................................|...
.--|+----------------------------------------+|--.
.|...|......................................|...|.
.-----......................................-----.
..................................................`;

export async function knistrt_level() {
    const des = {
        level_init: lspo_level_init,
        level_flags: lspo_level_flags,
        map: lspo_map_full,
        region: (sel, lit) => lspo_region_full(
            Array.isArray(sel) ? { area: sel, lit: lit === 'lit' } : sel),
        levregion: lspo_levregion,
        stair: (d, x, y) => lspo_stair(d, x, y),
        door: (state, x, y) => lspo_door({ state, x, y }),
        monster: (a, x, y, o) => lspo_monster(a, x, y, o),
        object: (a, x, y, o) => lspo_object(a, x, y, o),
        non_diggable: (s) => lspo_non_diggable(s[0], s[1], s[2], s[3]),
        trap: (t, x, y) => lspo_trap(t, x, y),
    };
    const selection = { area: (x1, y1, x2, y2) => [x1, y1, x2, y2] };

    des.level_init({ style: 'solidfill', fg: '.' });

    des.level_flags('mazelevel', 'noteleport', 'hardfloor');
    /* This is a kludge to init the level as a lit field. */
    des.level_init({ style: 'mines', fg: '.', bg: '.', smoothed: false,
                     joined: false, lit: 1, walled: false });

    des.map(KNI_STRT_MAP);
    /* Dungeon Description */
    des.region(selection.area(0, 0, 49, 15), 'lit');
    des.region(selection.area(4, 4, 45, 11), 'unlit');
    des.region({ region: [6, 6, 22, 9], lit: 1, type: 'throne',
                 filled: 2 });
    des.region(selection.area(27, 6, 43, 9), 'lit');
    /* Portal arrival point */
    des.levregion({ region: [20, 14, 20, 14], type: 'branch' });
    /* Stairs */
    des.stair('down', 40, 7);
    /* Doors */
    /* Outside Doors */
    des.door('locked', 24, 3);
    des.door('locked', 25, 3);
    /* Inside Doors */
    des.door('closed', 23, 4);
    des.door('closed', 26, 4);
    des.door('locked', 24, 5);
    des.door('locked', 25, 5);
    des.door('closed', 23, 7);
    des.door('closed', 26, 7);
    des.door('closed', 23, 8);
    des.door('closed', 26, 8);
    des.door('closed', 36, 8);
    /* Watchroom Doors */
    des.door('closed', 4, 3);
    des.door('closed', 45, 3);
    des.door('closed', 4, 12);
    des.door('closed', 45, 12);
    /* King Arthur */
    des.monster({ id: 'King Arthur', coord: [9, 7], inventory: () => {
        des.object({ id: 'long sword', spe: 4, buc: 'blessed',
                     name: 'Excalibur' });
        des.object({ id: 'plate mail', spe: 4 });
    } });
    /* The treasure of King Arthur */
    des.object('chest', 9, 7);
    /* knight guards for the watchrooms */
    des.monster({ id: 'knight', x: 4, y: 2, peaceful: 1 });
    des.monster({ id: 'knight', x: 4, y: 13, peaceful: 1 });
    des.monster({ id: 'knight', x: 45, y: 2, peaceful: 1 });
    des.monster({ id: 'knight', x: 45, y: 13, peaceful: 1 });
    /* page guards for the audience chamber */
    des.monster('page', 16, 6);
    des.monster('page', 18, 6);
    des.monster('page', 20, 6);
    des.monster('page', 16, 9);
    des.monster('page', 18, 9);
    des.monster('page', 20, 9);
    /* Non diggable walls */
    des.non_diggable(selection.area(0, 0, 49, 15));
    /* Random traps */
    des.trap('sleep gas', 24, 4);
    des.trap('sleep gas', 25, 4);
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    /* Monsters on siege duty. */
    des.monster({ id: 'quasit', x: 14, y: 0, peaceful: 0 });
    des.monster({ id: 'quasit', x: 16, y: 0, peaceful: 0 });
    des.monster({ id: 'quasit', x: 18, y: 0, peaceful: 0 });
    des.monster({ id: 'quasit', x: 20, y: 0, peaceful: 0 });
    des.monster({ id: 'quasit', x: 22, y: 0, peaceful: 0 });
    des.monster({ id: 'quasit', x: 24, y: 0, peaceful: 0 });
    des.monster({ id: 'quasit', x: 26, y: 0, peaceful: 0 });
    des.monster({ id: 'quasit', x: 28, y: 0, peaceful: 0 });
    des.monster({ id: 'quasit', x: 30, y: 0, peaceful: 0 });
    des.monster({ id: 'quasit', x: 32, y: 0, peaceful: 0 });
    des.monster({ id: 'quasit', x: 34, y: 0, peaceful: 0 });
    des.monster({ id: 'quasit', x: 36, y: 0, peaceful: 0 });

    /* Some warhorses */
    for (let i = 1, n = 2 + rn2(3); i <= n; i++)
        des.monster({ id: 'warhorse', peaceful: 1, inventory: () => {
            if (percent(50))
                des.object('saddle');
        } });
}
