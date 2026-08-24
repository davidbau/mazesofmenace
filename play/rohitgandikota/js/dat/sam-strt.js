// dat/sam-strt.js — the Samurai quest start level.
// C ref: dat/Sam-strt.lua
//
// Lord Sato's castle: a throne-typed audience chamber with no actual
// throne (atmospheric messages only), eight roshi guards, erodeproof
// splint mail and katana on the Lord, and a ninja/wolf siege line by the
// eastern water.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_region_full, lspo_stair, lspo_levregion, lspo_door,
         lspo_object, lspo_trap, lspo_monster,
         lspo_non_diggable } from '../sp_lev.js';

const SAM_STRT_MAP = `..............................................................PP............
...............................................................PP...........
..........---------------------------------------------------...PPP.........
..........|......|.........|...|..............|...|.........|....PPPPP......
......... |......|.........S...|..............|...S.........|.....PPPP......
..........|......|.........|---|..............|---|.........|.....PPP.......
..........+......|.........+...-------++-------...+.........|......PP.......
..........+......|.........|......................|.........|......PP.......
......... |......---------------------++--------------------|........PP.....
..........|.................................................|.........PP....
..........|.................................................|...........PP..
..........----------------------------------------...-------|............PP.
..........................................|.................|.............PP
.............. ................. .........|.................|..............P
............. } ............... } ........|.................|...............
.............. ........PP....... .........|.................|...............
.....................PPP..................|.................|...............
......................PP..................-------------------...............
............................................................................
............................................................................`;

export async function samstrt_level() {
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

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'noteleport', 'hardfloor');

    des.map(SAM_STRT_MAP);
    /* Dungeon Description */
    des.region(selection.area(0, 0, 75, 19), 'lit');
    des.region({ region: [18, 3, 26, 7], lit: 1, type: 'throne',
                 filled: 2 });
    /* Portal arrival zone */
    des.levregion({ region: [62, 12, 70, 17], type: 'branch' });
    /* Stairs */
    des.stair('down', 29, 4);
    /* Doors */
    des.door('locked', 10, 6);
    des.door('locked', 10, 7);
    des.door('closed', 27, 4);
    des.door('closed', 27, 6);
    des.door('closed', 38, 6);
    des.door('locked', 38, 8);
    des.door('closed', 39, 6);
    des.door('locked', 39, 8);
    des.door('closed', 50, 4);
    des.door('closed', 50, 6);
    /* Lord Sato */
    des.monster({ id: 'Lord Sato', coord: [20, 4], inventory: () => {
        des.object({ id: 'splint mail', spe: 5, eroded: -1,
                     buc: 'not-cursed' });
        des.object({ id: 'katana', spe: 4, eroded: -1, buc: 'not-cursed' });
    } });
    /* The treasure of Lord Sato */
    des.object('chest', 20, 4);
    /* roshi guards for the audience chamber */
    des.monster('roshi', 18, 4);
    des.monster('roshi', 18, 5);
    des.monster('roshi', 18, 6);
    des.monster('roshi', 18, 7);
    des.monster('roshi', 26, 4);
    des.monster('roshi', 26, 5);
    des.monster('roshi', 26, 6);
    des.monster('roshi', 26, 7);
    /* Non diggable walls */
    des.non_diggable(selection.area(0, 0, 75, 19));
    /* Random traps */
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    /* Monsters on siege duty. */
    des.monster({ id: 'ninja', x: 64, y: 0, peaceful: 0 });
    des.monster('wolf', 65, 1);
    des.monster({ id: 'ninja', x: 67, y: 2, peaceful: 0 });
    des.monster({ id: 'ninja', x: 69, y: 5, peaceful: 0 });
    des.monster({ id: 'ninja', x: 69, y: 6, peaceful: 0 });
    des.monster('wolf', 69, 7);
    des.monster({ id: 'ninja', x: 70, y: 6, peaceful: 0 });
    des.monster({ id: 'ninja', x: 70, y: 7, peaceful: 0 });
    des.monster({ id: 'ninja', x: 72, y: 1, peaceful: 0 });
    des.monster('wolf', 75, 9);
    des.monster({ id: 'ninja', x: 73, y: 5, peaceful: 0 });
    des.monster({ id: 'ninja', x: 68, y: 2, peaceful: 0 });
    des.monster('stalker');
}
